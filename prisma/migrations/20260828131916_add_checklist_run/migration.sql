-- AlterEnum
ALTER TYPE "GenerationOperation" ADD VALUE 'CHECKLIST';

-- CreateTable
CREATE TABLE "ChecklistRun" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "resultsJson" JSONB NOT NULL,
    "overallStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistRun_versionId_createdAt_idx" ON "ChecklistRun"("versionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChecklistRun" ADD CONSTRAINT "ChecklistRun_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ResumeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
