import { NextRequest, NextResponse } from "next/server";

import { analyzeImageWithResponses } from "../../../lib/ai";
import { prisma } from "../../../lib/prisma";
import { buildSystemPrompt } from "../../../lib/prompt-template";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const configId = formData.get("configId") as string | null;
    const assistantId = formData.get("assistantId") as string | null;

    if (!imageFile || typeof imageFile === "string") {
      return NextResponse.json({ ok: false, error: "请上传图片" }, { status: 400 });
    }
    if (!configId) {
      return NextResponse.json({ ok: false, error: "请选择模型配置" }, { status: 400 });
    }

    const config = await prisma.modelConfig.findUnique({ where: { id: configId } });
    if (!config) {
      return NextResponse.json({ ok: false, error: "模型配置不存在，请重新选择" }, { status: 404 });
    }

    const assistant = assistantId
      ? await prisma.assistant.findUnique({ where: { id: assistantId } })
      : null;

    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBytes = new Uint8Array(arrayBuffer);
    const mimeType = imageFile.type || "image/jpeg";
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
  } catch (error) {
    console.error("[generateRoute]", error);
    return NextResponse.json({ ok: false, error: "生成接口异常，请稍后重试" }, { status: 500 });
  }
}
