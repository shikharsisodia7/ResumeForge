-- CreateEnum
CREATE TYPE "GenerationOperation" AS ENUM ('FORMAT', 'CUSTOMIZE', 'TAILOR', 'RESET', 'UNDO');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "auth0Sub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "isProcessing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetCompany" TEXT,
    "targetRole" TEXT,
    "jobDescription" TEXT,
    "parentVersionId" TEXT,
    "contentJson" JSONB NOT NULL,
    "styleJson" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "baseContentJson" JSONB NOT NULL,
    "baseStyleJson" JSONB NOT NULL,
    "previousContentJson" JSONB,
    "previousStyleJson" JSONB,
    "previousRevision" INTEGER,
    "isProcessing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomPrompt" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "description" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "copiedFromId" TEXT,

    CONSTRAINT "CustomPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionPrompt" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VersionPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "versionId" TEXT,
    "operation" "GenerationOperation" NOT NULL,
    "modelId" TEXT NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "promptHash" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_auth0Sub_key" ON "User"("auth0Sub");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Resume_userId_idx" ON "Resume"("userId");

-- CreateIndex
CREATE INDEX "Resume_userId_fileHash_idx" ON "Resume"("userId", "fileHash");

-- CreateIndex
CREATE INDEX "ResumeVersion_resumeId_idx" ON "ResumeVersion"("resumeId");

-- CreateIndex
CREATE INDEX "CustomPrompt_creatorId_idx" ON "CustomPrompt"("creatorId");

-- CreateIndex
CREATE INDEX "CustomPrompt_isShared_createdAt_idx" ON "CustomPrompt"("isShared", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomPrompt_creatorId_copiedFromId_key" ON "CustomPrompt"("creatorId", "copiedFromId");

-- CreateIndex
CREATE INDEX "VersionPrompt_versionId_order_idx" ON "VersionPrompt"("versionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "VersionPrompt_versionId_promptId_key" ON "VersionPrompt"("versionId", "promptId");

-- CreateIndex
CREATE INDEX "GenerationRun_userId_createdAt_idx" ON "GenerationRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationRun_resumeId_idx" ON "GenerationRun"("resumeId");

-- CreateIndex
CREATE INDEX "GenerationRun_versionId_idx" ON "GenerationRun"("versionId");

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomPrompt" ADD CONSTRAINT "CustomPrompt_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomPrompt" ADD CONSTRAINT "CustomPrompt_copiedFromId_fkey" FOREIGN KEY ("copiedFromId") REFERENCES "CustomPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionPrompt" ADD CONSTRAINT "VersionPrompt_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ResumeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionPrompt" ADD CONSTRAINT "VersionPrompt_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "CustomPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
