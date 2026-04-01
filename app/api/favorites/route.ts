import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "../../../lib/prisma";

export async function POST(req: NextRequest) {
  let body: {
    imageResultId?: string;
    revisionId?: string;
    isFavorite?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "无法解析收藏请求" }, { status: 400 });
  }

  const imageResultId = body.imageResultId?.trim();
  const revisionId = body.revisionId?.trim();

  if ((!imageResultId && !revisionId) || (imageResultId && revisionId)) {
    return NextResponse.json(
      { ok: false, error: "请指定单条原始 prompt 或单条修订版本" },
      { status: 400 }
    );
  }

  if (typeof body.isFavorite !== "boolean") {
    return NextResponse.json({ ok: false, error: "缺少收藏状态" }, { status: 400 });
  }

  const favoritedAt = body.isFavorite ? new Date() : null;

  try {
    if (imageResultId) {
      const updated = await prisma.generatedImageResult.update({
        where: { id: imageResultId },
        data: {
          isFavorite: body.isFavorite,
          favoritedAt,
        },
      });

      revalidatePath("/history");
      revalidatePath("/favorites");

      return NextResponse.json({
        ok: true,
        isFavorite: updated.isFavorite,
      });
    }

    const updated = await prisma.promptRevision.update({
      where: { id: revisionId! },
      data: {
        isFavorite: body.isFavorite,
        favoritedAt,
      },
    });

    revalidatePath("/history");
    revalidatePath("/favorites");

    return NextResponse.json({
      ok: true,
      isFavorite: updated.isFavorite,
    });
  } catch (error) {
    console.error("[toggleFavorite]", error);
    return NextResponse.json({ ok: false, error: "收藏状态更新失败，请稍后重试" }, { status: 500 });
  }
}
