-- AlterTable
ALTER TABLE "GeneratedImageResult"
ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "favoritedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PromptRevision"
ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "favoritedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "GeneratedImageResult_isFavorite_favoritedAt_idx" ON "GeneratedImageResult"("isFavorite", "favoritedAt");

-- CreateIndex
CREATE INDEX "PromptRevision_isFavorite_favoritedAt_idx" ON "PromptRevision"("isFavorite", "favoritedAt");
