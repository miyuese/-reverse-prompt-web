import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { generateTextWithResponses } from "../../../lib/ai";
import { buildSystemPrompt } from "../../../lib/prompt-template";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body: {
      imageResultId?: string;
      revisionId?: string;
      basePrompt?: string;
      instruction?: string;
    } = await req.json();

    const imageResultId = body.imageResultId?.trim();
    const revisionId = body.revisionId?.trim();
    const basePrompt = body.basePrompt?.trim();
    const instruction = body.instruction?.trim();

    if (!imageResultId) {
      return NextResponse.json({ ok: false, error: "缺少图片结果 ID" }, { status: 400 });
    }

    if (!instruction) {
      return NextResponse.json({ ok: false, error: "请输入补充修改要求" }, { status: 400 });
    }

    const imageResult = await prisma.generatedImageResult.findUnique({
      where: { id: imageResultId },
      include: {
        task: {
          include: {
            modelConfig: true,
            assistant: true,
          },
        },
        revisions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!imageResult) {
      return NextResponse.json({ ok: false, error: "原始图片结果不存在" }, { status: 404 });
    }

    let latestPrompt = imageResult.revisions[0]?.prompt ?? imageResult.prompt;

    if (revisionId) {
      const baseRevision = await prisma.promptRevision.findFirst({
        where: {
          id: revisionId,
          imageResultId: imageResult.id,
        },
      });

      if (!baseRevision) {
        return NextResponse.json({ ok: false, error: "指定的修订版本不存在" }, { status: 404 });
      }

      latestPrompt = baseRevision.prompt;
    } else if (basePrompt) {
      latestPrompt = basePrompt;
    }

    const nextVersion = (imageResult.revisions[0]?.version ?? 0) + 1;
    const assistant = imageResult.task.assistant;
    const systemPrompt = buildSystemPrompt(assistant);

    const reviseResult = await generateTextWithResponses(imageResult.task.modelConfig, {
      systemPrompt,
      userPrompt: [
        "以下是当前图片的原始反推 prompt，请基于它继续修改。",
        latestPrompt,
        `用户补充修改要求：${instruction}`,
        "请输出新的完整 prompt，不要解释修改过程，不要返回分析说明。",
      ].join("\n\n"),
    });

    if (!reviseResult.ok) {
      return NextResponse.json({ ok: false, error: reviseResult.error }, { status: 502 });
    }

    const revision = await prisma.promptRevision.create({
      data: {
        imageResultId: imageResult.id,
        version: nextVersion,
        instruction,
        prompt: reviseResult.content.trim(),
      },
    });

    revalidatePath("/history");
    revalidatePath(`/history?taskId=${imageResult.taskId}`);

    return NextResponse.json({
      ok: true,
      revision: {
        id: revision.id,
        version: revision.version,
        instruction: revision.instruction,
        prompt: revision.prompt,
        createdAt: revision.createdAt,
        isFavorite: revision.isFavorite,
      },
    });
  } catch (error) {
    console.error("[revisionsRoute]", error);
    return NextResponse.json({ ok: false, error: "修订接口异常，请稍后重试" }, { status: 500 });
  }
}
