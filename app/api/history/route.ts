import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "../../../lib/prisma";

type SaveImageResult = {
  imageIndex: number;
  originalName: string;
  mimeType: string;
  prompt: string;
};

export async function POST(req: NextRequest) {
  let body: {
    modelConfigId?: string;
    assistantId?: string;
    imageResults?: SaveImageResult[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "无法解析历史保存请求" }, { status: 400 });
  }

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
    return NextResponse.json({ ok: false, error: "模型配置不存在，无法保存历史" }, { status: 404 });
  }

  if (assistantId && !assistant) {
    return NextResponse.json({ ok: false, error: "助手设计师不存在，无法保存历史" }, { status: 404 });
  }

  try {
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

    return NextResponse.json({
      ok: true,
      taskId: task.id,
      imageResults: task.imageResults.map((item) => ({
        id: item.id,
        imageIndex: item.imageIndex,
      })),
    });
  } catch (error) {
    console.error("[saveGenerateTask]", error);
    return NextResponse.json({ ok: false, error: "保存历史失败，请稍后重试" }, { status: 500 });
  }
}
