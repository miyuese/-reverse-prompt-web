"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "../../lib/prisma";

const assistantSchema = z.object({
  name: z.string().trim().min(1, "请输入助手名称"),
  systemPrompt: z.string().trim().min(1, "请输入系统提示词"),
  outputTemplate: z.string().trim().min(1, "请输入输出格式模板"),
});

export type AssistantFormValues = z.infer<typeof assistantSchema>;

export type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createAssistant(values: AssistantFormValues): Promise<ActionResult> {
  const parsed = assistantSchema.safeParse(values);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }

  try {
    const record = await prisma.assistant.create({
      data: {
        name: parsed.data.name,
        systemPrompt: parsed.data.systemPrompt,
        outputTemplate: parsed.data.outputTemplate,
      },
    });

    revalidatePath("/assistants");
    return { success: true, id: record.id };
  } catch (error) {
    console.error("[createAssistant]", error);
    return { success: false, error: "保存失败，请稍后重试" };
  }
}

export async function updateAssistant(
  id: string,
  values: AssistantFormValues
): Promise<ActionResult> {
  const parsed = assistantSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  try {
    await prisma.assistant.update({
      where: { id },
      data: {
        name: parsed.data.name,
        systemPrompt: parsed.data.systemPrompt,
        outputTemplate: parsed.data.outputTemplate,
      },
    });
    revalidatePath("/assistants");
    return { success: true, id };
  } catch (e) {
    console.error("[updateAssistant]", e);
    return { success: false, error: "更新失败，请稍后重试" };
  }
}

export async function deleteAssistant(id: string): Promise<ActionResult> {
  try {
    await prisma.assistant.delete({ where: { id } });
    revalidatePath("/assistants");
    return { success: true, id };
  } catch (e) {
    console.error("[deleteAssistant]", e);
    return { success: false, error: "删除失败，请稍后重试" };
  }
}

export async function getAssistants() {
  return prisma.assistant.findMany({
    orderBy: { createdAt: "desc" },
  });
}
