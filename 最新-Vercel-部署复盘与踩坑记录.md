## Vercel 部署复盘与踩坑记录

本文档整合本次 Vercel 部署过程中遇到的两类核心问题：

1. Prisma Client 在 Vercel 构建阶段未正确生成，导致 `PrismaClient` 导入报错。
2. 线上页面虽然可以打开，但图片生成与二次修订初期无法使用，最终定位到前端错误信息不够明确，以及图片请求体超过 Vercel 限制导致的 `HTTP 413`。

目标是把这次排障过程、判断依据、最终修复方案和后续建议记录下来，避免同类问题再次重复出现。

## 一、问题 1：Vercel 构建时报 PrismaClient 导入错误

### 1. 现象

Vercel 在执行 `npm run build` 时，Next.js 编译通过，但类型检查失败，报错如下：

```text
./lib/prisma.ts:2:10
Type error: Module '"@prisma/client"' has no exported member 'PrismaClient'.
```

对应代码：

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
```

### 2. 根因

根因不是 Prisma 用法错误，而是：

**构建链路没有显式保证在安装或构建阶段执行 `prisma generate`。**

这导致：

1. 本地由于之前跑过生成流程，所以表面上没有问题。
2. Vercel 每次都是全新安装环境，不继承本地 `.prisma` 生成状态。
3. 在 Prisma 7 环境下，不能再默认依赖安装步骤帮你隐式生成 client。

### 3. 核查依据

1. `lib/prisma.ts` 的用法本身是标准 Prisma 写法。
2. `prisma/schema.prisma` 已声明标准 Prisma Client 生成器。
3. 当时项目的 `package.json` 没有显式声明 Prisma 生成步骤。
4. 本地可以成功构建，但本地环境已经存在生成产物，不代表 Vercel 干净环境也能成功。
5. `@prisma/client` 实际上只是转发到生成目录，是否能导出 `PrismaClient` 取决于生成产物是否存在。

### 4. 最终修复

最终采用双保险方案，把 Prisma 生成流程固化到项目本身。

当前 `package.json` 中的相关脚本为：

```json
"scripts": {
  "dev": "next dev",
  "build": "prisma generate && next build",
  "start": "next start",
  "lint": "next lint",
  "postinstall": "prisma generate"
}
```

### 5. 经验

1. Prisma 是代码生成型依赖，不能依赖“本地之前生成过”的偶然状态。
2. CI 和 Vercel 这类干净环境里，必须显式保证 `prisma generate` 会执行。
3. 对已经多次踩过 Prisma 构建坑的项目，`postinstall + build 前 generate` 更稳。

## 二、问题 2：线上页面可打开，但生成与修订失败

### 1. 初始现象

在 Prisma 构建问题修复后，Vercel 线上页面已经可以访问，但业务功能仍然异常：

1. 上传图片后点击“生成提示词”失败。
2. 对已有 prompt 进行“二次修改”也失败。
3. 页面统一提示：

```text
生成失败：网络请求失败，请稍后重试
```

### 2. 初始判断

根据前端代码，这条提示并不一定代表真正的网络断开，更可能意味着：

1. `/api/generate` 或 `/api/revisions` 返回了非 JSON 响应。
2. API 被平台访问保护拦截，返回了 HTML 页面。
3. API 路由内部发生未捕获异常，Vercel 返回了 HTML 500 错误页。
4. 前端调用 `response.json()` 时解析失败，被笼统归类成了“网络请求失败”。

当时优先怀疑过这些方向：

1. Vercel 访问保护拦截 `/api/*`
2. API 在服务端 500 崩溃
3. 环境变量或 Prisma 运行异常

这些判断并不是错误，而是基于现象最合理的首轮分析。

## 三、线上排障时采取的代码改进

### 1. 前端增加非 JSON 响应识别

在 `app/generate/generate-client.tsx` 和 `app/prompt-revise-panel.tsx` 中加入了统一响应解析逻辑：

```ts
async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  throw new Error(`接口返回了非 JSON 响应（HTTP ${response.status}）。`);
}
```

这样做之后，页面不会再把所有错误都笼统显示成“网络请求失败”，而是能明确告诉我们返回的不是 JSON，以及状态码是多少。

### 2. API 路由补充统一兜底错误处理

对以下路由补上了最外层 `try/catch`：

1. `app/api/generate/route.ts`
2. `app/api/revisions/route.ts`
3. `app/api/history/route.ts`

同时显式指定：

```ts
export const runtime = "nodejs";
export const maxDuration = 60;
```

这样做的目的有两个：

1. 即使服务端内部异常，也尽量稳定返回 JSON，而不是回落到平台默认 HTML 错误页。
2. 给外部 AI 调用更充足的函数执行时间，避免过短超时。

## 四、最终定位到的真实问题：HTTP 413

在完成上述改造并重新部署后，线上页面终于返回了更具体的错误信息：

```text
生成失败：接口返回了非 JSON 响应（HTTP 413）。 响应片段：Request Entity Too Large FUNCTION_PAYLOAD_TOO_LARGE
```

这一步意味着问题已经从“黑盒失败”被定位成了明确的 Vercel 平台限制问题。

### 1. 413 的实际含义

`HTTP 413 Request Entity Too Large` 表示：

**浏览器提交给 `/api/generate` 的请求体太大，超过了 Vercel Function 可接受的请求大小限制。**

这不是 Prisma、数据库、AI Key 或访问保护问题，而是上传图片本身太大。

### 2. 为什么它会表现成非 JSON 错误

这是平台在请求进入业务逻辑之前就直接拦截了，请求根本还没完整进入 `POST /api/generate` 处理流程，所以返回的是平台默认响应，而不是业务路由返回的 JSON。

## 五、413 的最终解决方案

最终采用的是最小且有效的方案：

**在浏览器端上传前先压缩图片，再把压缩后的文件提交给 `/api/generate`。**

### 1. 当前实现

`app/generate/generate-client.tsx` 中加入了 `compressImageFile(file)`：

1. 只处理图片文件。
2. 如果图片本身已经较小，则直接使用原文件。
3. 如果图片过大，则：
   - 限制最大边到 `1600`
   - 转为 `image/jpeg`
   - 第一轮质量压缩为 `0.82`
   - 如果压缩后仍然大于 `1_800_000` 字节，则再做一次更低质量压缩 `0.68`

相关常量如下：

```ts
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const MAX_UPLOAD_BYTES = 1_800_000;
```

在真正发送请求前，代码改为：

```ts
const uploadFile = await compressImageFile(item.file);
fd.append("image", uploadFile);
```

### 2. 为什么采用前端压缩

因为当前架构是：

1. 浏览器直接把图片上传到 Next.js API。
2. Next.js API 再把图片内容发给第三方模型。

在这个架构下，最先撞上的限制就是 Vercel Function 的请求体大小限制。

前端压缩的优点是：

1. 改动最小，不需要重构上传链路。
2. 不需要额外引入对象存储、中转 URL 或分片上传。
3. 对当前 MVP 阶段最合适。

### 3. 额外补充的用户提示

为了让后续类似问题更易理解，还增加了更明确的错误映射：

```ts
if (error.includes("HTTP 413") || error.includes("FUNCTION_PAYLOAD_TOO_LARGE")) {
  return "上传图片体积过大，已超出 Vercel 请求限制。请改用更小的图片，或等待系统自动压缩后再试。";
}
```

## 六、本次实际操作流程回顾

本次排障过程中的关键操作如下：

1. 分析 Vercel 构建日志，确认 Prisma 报错不是语法问题，而是生成链路缺失。
2. 为 Prisma 增加项目级生成机制：`postinstall` 加 `build` 前 `prisma generate`。
3. 本地验证 `npm run build` 成功。
4. 重新部署到 Vercel。
5. 发现线上页面可打开，但生成与修订失败。
6. 先从“前端只显示网络失败”的问题入手，补足非 JSON 响应识别和 API 兜底返回。
7. 重新部署后，最终在页面上得到真实平台错误：`HTTP 413 / FUNCTION_PAYLOAD_TOO_LARGE`。
8. 在浏览器端增加图片压缩逻辑。
9. 再次本地构建验证通过。
10. 推送到 GitHub，等待 Vercel 自动部署。
11. 线上再次验收，生成链路恢复正常。

## 七、本次问题的最终结论

本次 Vercel 部署遇到的核心坑，一共是两类：

### 坑 1：Prisma 生成流程没有显式固化到项目里

结论：

**干净环境必须显式执行 `prisma generate`，不能只依赖本地已有生成产物。**

当前修复：

1. `postinstall: prisma generate`
2. `build: prisma generate && next build`

### 坑 2：前端上传原始大图，触发 Vercel 413

结论：

**在当前“浏览器直传 Next.js API”的架构下，必须控制上传体积，否则容易直接被 Vercel Function 拦截。**

当前修复：

1. 浏览器端自动压缩图片。
2. 前端增加对 413 的明确提示。
3. 前端增加对非 JSON 平台错误响应的识别。

## 八、后续建议

1. 保留当前 Prisma 双保险脚本，不要轻易删除。
2. 保留前端非 JSON 响应识别逻辑，它对线上排障很有价值。
3. 如果后续需要支持更大图片，可考虑升级为对象存储中转，而不是浏览器直接把大图发到函数。
4. 在阶段 14 中补充日志，例如生成接口、修订接口、图片压缩前后体积、第三方模型请求耗时等。

## 九、一句话总结

这次部署问题最终不是单一故障，而是两层问题叠加：

1. **Prisma Client 没有在 Vercel 干净环境中被显式生成，导致构建失败。**
2. **线上生成接口在修好构建后，又因为上传图片过大触发 Vercel 413，需要在浏览器端先压缩图片。**

最终通过“Prisma 生成双保险 + API 错误可诊断化 + 浏览器端图片压缩”三步，线上功能恢复正常并完成验收。
