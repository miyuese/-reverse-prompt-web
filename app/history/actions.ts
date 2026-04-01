import { revalidatePath } from "next/cache";

import { prisma } from "../../lib/prisma";

export type SaveGenerateTaskInput = {
  modelConfigId: string;
  modelConfigName: string;
  modelName: string;
  assistantId?: string;
  assistantName?: string;
  imageResults: Array<{
    imageIndex: number;
    originalName: string;
    mimeType: string;
    prompt: string;
  }>;
};

export async function saveGenerateTask(input: SaveGenerateTaskInput) {
  const task = await prisma.generateTask.create({
    data: {
      modelConfigId: input.modelConfigId,
      assistantId: input.assistantId ?? null,
      modelConfigName: input.modelConfigName,
      modelName: input.modelName,
      assistantName: input.assistantName ?? null,
      imageCount: input.imageResults.length,
      imageResults: {
        create: input.imageResults.map((item) => ({
          imageIndex: item.imageIndex,
          originalName: item.originalName,
          mimeType: item.mimeType,
          prompt: item.prompt,
        })),
      },
    },
  });

  revalidatePath("/history");
  return task.id;
}

export async function getGenerateTasks() {
  return prisma.generateTask.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      imageResults: {
        orderBy: { imageIndex: "asc" },
        include: {
          revisions: {
            orderBy: { version: "asc" },
          },
        },
      },
    },
  });
}

export async function getGenerateTaskById(id: string) {
  return prisma.generateTask.findUnique({
    where: { id },
    include: {
      imageResults: {
        orderBy: { imageIndex: "asc" },
        include: {
          revisions: {
            orderBy: { version: "asc" },
          },
        },
      },
    },
  });
}

export async function getFavoritePrompts() {
  const [imageResults, revisions] = await Promise.all([
    prisma.generatedImageResult.findMany({
      where: { isFavorite: true },
      orderBy: [{ favoritedAt: "desc" }, { createdAt: "desc" }],
      include: {
        task: true,
      },
    }),
    prisma.promptRevision.findMany({
      where: { isFavorite: true },
      orderBy: [{ favoritedAt: "desc" }, { createdAt: "desc" }],
      include: {
        imageResult: {
          include: {
            task: true,
          },
        },
      },
    }),
  ]);

  const originalPromptItems = imageResults.map((item) => ({
    id: item.id,
    type: "original" as const,
    prompt: item.prompt,
    isFavorite: item.isFavorite,
    favoritedAt: item.favoritedAt,
    createdAt: item.createdAt,
    imageResultId: item.id,
    revisionId: null,
    versionLabel: "原始版",
    imageIndex: item.imageIndex,
    originalName: item.originalName,
    taskId: item.taskId,
    modelConfigName: item.task.modelConfigName,
    modelName: item.task.modelName,
    assistantName: item.task.assistantName,
  }));

  const revisionItems = revisions.map((revision) => ({
    id: revision.id,
    type: "revision" as const,
    prompt: revision.prompt,
    isFavorite: revision.isFavorite,
    favoritedAt: revision.favoritedAt,
    createdAt: revision.createdAt,
    imageResultId: revision.imageResultId,
    revisionId: revision.id,
    versionLabel: `V${revision.version}`,
    imageIndex: revision.imageResult.imageIndex,
    originalName: revision.imageResult.originalName,
    taskId: revision.imageResult.taskId,
    modelConfigName: revision.imageResult.task.modelConfigName,
    modelName: revision.imageResult.task.modelName,
    assistantName: revision.imageResult.task.assistantName,
  }));

  return [...originalPromptItems, ...revisionItems].sort((a, b) => {
    const timeA = a.favoritedAt?.getTime() ?? a.createdAt.getTime();
    const timeB = b.favoritedAt?.getTime() ?? b.createdAt.getTime();
    return timeB - timeA;
  });
}
