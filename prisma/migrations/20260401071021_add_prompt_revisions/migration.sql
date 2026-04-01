-- CreateTable
CREATE TABLE "PromptRevision" (
    "id" TEXT NOT NULL,
    "imageResultId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromptRevision_imageResultId_idx" ON "PromptRevision"("imageResultId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptRevision_imageResultId_version_key" ON "PromptRevision"("imageResultId", "version");

-- AddForeignKey
ALTER TABLE "PromptRevision" ADD CONSTRAINT "PromptRevision_imageResultId_fkey" FOREIGN KEY ("imageResultId") REFERENCES "GeneratedImageResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
