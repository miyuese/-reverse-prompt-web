"use server";

import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const modelConfigSchema = z.object({
  name: z.string().trim().min(1, "请输入配置名称"),
  apiKey: z.string().trim().min(1, "请输入 API Key"),
  baseUrl: z
    .string()
    .trim()
    .min(1, "请输入 Base URL")
    .url("请输入合法的 Base URL"),
  modelName: z.string().trim().min(1, "请输入 Model 名称"),
});

export type ModelConfigFormValues = z.infer<typeof modelConfigSchema>;

export type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createModelConfig(
  values: ModelConfigFormValues
): Promise<ActionResult> {
  const parsed = modelConfigSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  try {
    const record = await prisma.modelConfig.create({
      data: {
        name: parsed.data.name,
        apiKey: parsed.data.apiKey,
        baseUrl: parsed.data.baseUrl,
        modelName: parsed.data.modelName,
      },
    });
    revalidatePath("/models");
    return { success: true, id: record.id };
  } catch (e) {
    console.error("[createModelConfig]", e);
    return { success: false, error: "保存失败，请稍后重试" };
  }
}

export async function deleteModelConfig(
  id: string
): Promise<ActionResult> {
  try {
    await prisma.modelConfig.delete({ where: { id } });
    revalidatePath("/models");
    return { success: true, id };
  } catch (e) {
    console.error("[deleteModelConfig]", e);
    return { success: false, error: "删除失败，请稍后重试" };
  }
}

export async function updateModelConfig(
  id: string,
  values: ModelConfigFormValues
): Promise<ActionResult> {
  const parsed = modelConfigSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  try {
    await prisma.modelConfig.update({
      where: { id },
      data: {
        name: parsed.data.name,
        apiKey: parsed.data.apiKey,
        baseUrl: parsed.data.baseUrl,
        modelName: parsed.data.modelName,
      },
    });
    revalidatePath("/models");
    return { success: true, id };
  } catch (e) {
    console.error("[updateModelConfig]", e);
    return { success: false, error: "更新失败，请稍后重试" };
  }
}

export async function getModelConfigs() {
  return prisma.modelConfig.findMany({
    orderBy: { createdAt: "desc" },
  });
}
