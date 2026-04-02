# Reverse Prompt Web

一个面向单人使用的图片反推 Web 工具。

用户可以上传一张或多张图片，调用自己配置的 `OpenAI` 或 `OpenAI 兼容 API`，为每张图片生成对应的反推提示词，并支持基于单张图片继续修订 prompt、保存历史、收藏单条 prompt 和一键复制。

## 功能概览

当前已完成的核心能力包括：

1. 单图和多图上传
2. 逐图生成结构化反推 prompt
3. 模型配置管理
4. 助手设计师管理
5. 历史任务保存与查看
6. 单图继续修改与版本化保存
7. 原始版和修订版 prompt 复制
8. 单条 prompt 收藏与收藏页查看
9. Vercel 线上部署
10. 基础服务端日志

## 技术栈

1. Next.js 15
2. React 19
3. TypeScript
4. Tailwind CSS
5. Prisma
6. Postgres
7. AI SDK + `@ai-sdk/openai-compatible`
8. React Hook Form + Zod
9. Vercel

## 项目特点

1. 不做站内账号体系，默认定位为单人私有工具
2. 不长期保存原始图片，图片只在请求处理链路中临时使用
3. 支持多模型配置和可复用助手模板
4. 多图输入时坚持逐图独立输出，不做混合 prompt
5. 对同一张图片支持连续修订，保留完整版本链路

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env`，至少需要：

```env
DATABASE_URL="你的 Postgres 连接串"
```

说明：

1. 模型平台的 `API Key`、`Base URL`、`Model 名称` 不是通过 `.env` 固定写死，而是通过页面中的模型配置功能保存到数据库。
2. 因此本地最核心的环境变量是数据库连接。

### 3. 生成 Prisma Client

```bash
npx prisma generate
```

项目当前也已在 `postinstall` 和 `build` 中显式执行 `prisma generate`，但首次排查环境问题时，手动执行一次仍然更直观。

### 4. 启动开发环境

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

### 5. 构建验证

```bash
npm run build
```

### 6. 生产模式启动

```bash
npm run start
```

## 数据库与 Prisma

本项目使用 Prisma 管理 Postgres 数据。

常用命令：

```bash
npx prisma generate
npx prisma migrate dev
```

当前项目已显式加入以下脚本，避免 Vercel 干净环境中 Prisma Client 未生成的问题：

```json
"postinstall": "prisma generate",
"build": "prisma generate && next build"
```

## Vercel 部署说明

项目已针对 Vercel 做过两类关键兼容处理：

1. Prisma Client 生成流程显式固化到 `postinstall` 和 `build`
2. 浏览器端上传前自动压缩图片，避免大图触发 `HTTP 413 / FUNCTION_PAYLOAD_TOO_LARGE`

如果部署到 Vercel，至少需要配置：

```env
DATABASE_URL
```

部署完成后，模型配置仍需要在页面中手动录入并保存到数据库。

## 日志与排障

当前以下关键链路已补充基础服务端日志：

1. `/api/generate`
2. `/api/revisions`
3. `/api/history`
4. `/api/favorites`

可结合本地终端或 Vercel Runtime Logs 排查：

1. 生成请求开始与结束
2. 修订请求开始与结束
3. 历史保存是否成功
4. 收藏状态更新是否成功
5. 第三方调用失败原因

## 相关文档

1. 项目阶段文档：`反推.md`
2. 部署复盘文档：`最新-Vercel-部署复盘与踩坑记录.md`
3. MVP 后续迭代清单：`阶段14-MVP之后的迭代清单.md`

## 当前边界

1. 不做多人协作
2. 不做站内账号体系
3. 不长期保存原始图片
4. 暂不提供对象存储上传链路
5. 更大图片场景目前依赖浏览器端压缩

## 后续方向

优先级较高的后续迭代方向包括：

1. 历史记录搜索
2. 收藏标签体系
3. Prompt 导出能力
4. 移动端体验优化
5. 多模型对比生成

更完整的候选列表见：`阶段14-MVP之后的迭代清单.md`
