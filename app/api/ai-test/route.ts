import { NextRequest, NextResponse } from "next/server";

import { chatCompletion } from "../../../lib/ai";
import { prisma } from "../../../lib/prisma";

/**
 * GET /api/ai-test?configId=xxx
 * 使用指定模型配置发送一条测试消息，验证接口连通性。
 * 不传 configId 时使用最新一条配置。
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const configId = searchParams.get("configId");

  // 查询模型配置
  const config = configId
    ? await prisma.modelConfig.findUnique({ where: { id: configId } })
    : await prisma.modelConfig.findFirst({ orderBy: { createdAt: "desc" } });

  if (!config) {
    return NextResponse.json(
      { ok: false, error: "未找到模型配置，请先在 /models 页面新增一条配置" },
      { status: 404 }
    );
  }

  const result = await chatCompletion(
    {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      modelName: config.modelName,
    },
    [
      {
        role: "user",
        content: "请用一句话介绍你自己，包括你的模型名称。",
      },
    ]
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        configUsed: { name: config.name, modelName: config.modelName, baseUrl: config.baseUrl },
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    content: result.content,
    configUsed: { name: config.name, modelName: config.modelName, baseUrl: config.baseUrl },
  });
}
