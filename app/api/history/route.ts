import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

type SaveImageResult = {
  imageIndex: number;
  originalName: string;
  mimeType: string;
  prompt: string;
};

export async function POST(req: NextRequest) {
  try {
    const body: {
      modelConfigId?: string;
      assistantId?: string;
      imageResults?: SaveImageResult[];
    } = await req.json();

    const modelConfigId = body.modelConfigId?.trim();
    const assistantId = body.assistantId?.trim() || undefined;
    const imageResults = (body.imageResults ?? []).filter(
      (item) =>
        typeof item?.imageIndex === "number" &&
        typeof item?.originalName === "string" &&
        typeof item?.mimeType === "string" &&
        typeof item?.prompt === "string" &&
        item.prompt.trim().length > 0
    );

    console.log("[historyRoute] start", {
      modelConfigId: modelConfigId ?? null,
      assistantId: assistantId ?? null,
      imageResultsCount: imageResults.length,
    });

    if (!modelConfigId) {
      return NextResponse.json({ ok: false, error: "缺少模型配置 ID" }, { status: 400 });
    }

    if (imageResults.length === 0) {
      return NextResponse.json({ ok: false, error: "没有可保存的成功结果" }, { status: 400 });
    }

    const [modelConfig, assistant] = await Promise.all([
      prisma.modelConfig.findUnique({ where: { id: modelConfigId } }),
      assistantId ? prisma.assistant.findUnique({ where: { id: assistantId } }) : Promise.resolve(null),
    ]);

    if (!modelConfig) {
      console.warn("[historyRoute] missing model config", { modelConfigId });
      return NextResponse.json({ ok: false, error: "模型配置不存在，无法保存历史" }, { status: 404 });
    }

    if (assistantId && !assistant) {
      console.warn("[historyRoute] missing assistant", { assistantId, modelConfigId });
      return NextResponse.json({ ok: false, error: "助手设计师不存在，无法保存历史" }, { status: 404 });
    }

    const task = await prisma.generateTask.create({
      include: {
        imageResults: {
          orderBy: { imageIndex: "asc" },
        },
      },
      data: {
        modelConfigId: modelConfig.id,
        assistantId: assistant?.id ?? null,
        modelConfigName: modelConfig.name,
        modelName: modelConfig.modelName,
        assistantName: assistant?.name ?? null,
        imageCount: imageResults.length,
        imageResults: {
          create: imageResults.map((item) => ({
            imageIndex: item.imageIndex,
            originalName: item.originalName,
            mimeType: item.mimeType,
            prompt: item.prompt.trim(),
          })),
        },
      },
    });

    revalidatePath("/history");
    revalidatePath(`/history/${task.id}`);

    console.log("[historyRoute] success", {
      taskId: task.id,
      modelConfigId: modelConfig.id,
      assistantId: assistant?.id ?? null,
      imageCount: task.imageCount,
    });

    return NextResponse.json({
      ok: true,
      taskId: task.id,
      imageResults: task.imageResults.map((item: { id: string; imageIndex: number }) => ({
        id: item.id,
        imageIndex: item.imageIndex,
      })),
    });
  } catch (error) {
    console.error("[historyRoute]", error);
    return NextResponse.json({ ok: false, error: "保存历史接口异常，请稍后重试" }, { status: 500 });
  }
}
