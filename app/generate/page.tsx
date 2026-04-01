import { prisma } from "../../lib/prisma";
import { GenerateClient } from "./generate-client";

export const dynamic = "force-dynamic";

export default async function GeneratePage() {
  const [modelConfigs, assistants] = await Promise.all([
    prisma.modelConfig.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.assistant.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <GenerateClient
      modelConfigs={modelConfigs.map((c) => ({
        id: c.id,
        name: c.name,
        modelName: c.modelName,
        baseUrl: c.baseUrl,
      }))}
      assistants={assistants.map((a) => ({
        id: a.id,
        name: a.name,
      }))}
    />
  );
}
