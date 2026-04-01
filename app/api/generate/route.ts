import { NextRequest, NextResponse } from "next/server";

import { analyzeImageWithResponses } from "../../../lib/ai";
import { prisma } from "../../../lib/prisma";
import { buildSystemPrompt } from "../../../lib/prompt-template";

/**
 * POST /api/generate
 * Body: FormData
 *   - image: File（单张图片）
 *   - configId: string（模型配置 ID）
 *   - assistantId?: string（助手设计师 ID，可选）
 *
 * 返回：
 *   { ok: true, prompt: string }
 *   { ok: false, error: string }
 */
export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "无法解析请求数据" }, { status: 400 });
  }

  const imageFile = formData.get("image") as File | null;
  const configId = formData.get("configId") as string | null;
  const assistantId = formData.get("assistantId") as string | null;

  // 校验必填字段
  if (!imageFile || typeof imageFile === "string") {
    return NextResponse.json({ ok: false, error: "请上传图片" }, { status: 400 });
  }
  if (!configId) {
    return NextResponse.json({ ok: false, error: "请选择模型配置" }, { status: 400 });
  }

  // 查询模型配置
  const config = await prisma.modelConfig.findUnique({ where: { id: configId } });
  if (!config) {
    return NextResponse.json({ ok: false, error: "模型配置不存在，请重新选择" }, { status: 404 });
  }

  // 查询助手设计师（可选）
  const assistant = assistantId
    ? await prisma.assistant.findUnique({ where: { id: assistantId } })
    : null;

  // 将图片转为二进制数据，交给 AI SDK 作为 image part 处理
  const arrayBuffer = await imageFile.arrayBuffer();
  const imageBytes = new Uint8Array(arrayBuffer);
  const mimeType = imageFile.type || "image/jpeg";

  // 组装 system prompt 并通过 AI SDK provider 调用多模态能力
  const systemPrompt = buildSystemPrompt(assistant);

  const result = await analyzeImageWithResponses(
    {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      modelName: config.modelName,
    },
    {
      systemPrompt,
      imageBytes,
      mediaType: mimeType,
    }
  );

  if (!result.ok) {
    const isImageCapabilityError =
      result.error.includes("不支持图片输入") || result.error.includes("不支持此图片消息格式");

    return NextResponse.json(
      { ok: false, error: result.error },
      { status: isImageCapabilityError ? 400 : 502 }
    );
  }

  return NextResponse.json({ ok: true, prompt: result.content });
}
