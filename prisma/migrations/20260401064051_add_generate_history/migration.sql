-- CreateTable
CREATE TABLE "GenerateTask" (
    "id" TEXT NOT NULL,
    "modelConfigId" TEXT NOT NULL,
    "assistantId" TEXT,
    "modelConfigName" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "assistantName" TEXT,
    "imageCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerateTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedImageResult" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "imageIndex" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedImageResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GenerateTask_createdAt_idx" ON "GenerateTask"("createdAt");

-- CreateIndex
CREATE INDEX "GenerateTask_modelConfigId_idx" ON "GenerateTask"("modelConfigId");

-- CreateIndex
CREATE INDEX "GenerateTask_assistantId_idx" ON "GenerateTask"("assistantId");

-- CreateIndex
CREATE INDEX "GeneratedImageResult_taskId_idx" ON "GeneratedImageResult"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedImageResult_taskId_imageIndex_key" ON "GeneratedImageResult"("taskId", "imageIndex");

-- AddForeignKey
ALTER TABLE "GenerateTask" ADD CONSTRAINT "GenerateTask_modelConfigId_fkey" FOREIGN KEY ("modelConfigId") REFERENCES "ModelConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerateTask" ADD CONSTRAINT "GenerateTask_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImageResult" ADD CONSTRAINT "GeneratedImageResult_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "GenerateTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
