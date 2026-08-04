import type { CustomPrompt, Resume, ResumeVersion } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

/**
 * Ownership lookups always return `NotFoundError` for both "doesn't exist"
 * and "exists but belongs to someone else" — never a distinguishing 403 —
 * so callers cannot probe for other users' resource ids.
 */

export async function requireOwnedResume(resumeId: string, userId: string): Promise<Resume> {
  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
  if (!resume) throw new NotFoundError("Resume not found");
  return resume;
}

export async function requireOwnedVersion(
  versionId: string,
  userId: string,
): Promise<ResumeVersion & { resume: Resume }> {
  const version = await prisma.resumeVersion.findFirst({
    where: { id: versionId, resume: { userId } },
    include: { resume: true },
  });
  if (!version) throw new NotFoundError("Resume version not found");
  return version;
}

export async function requireOwnedPrompt(promptId: string, userId: string): Promise<CustomPrompt> {
  const prompt = await prisma.customPrompt.findFirst({ where: { id: promptId, creatorId: userId } });
  if (!prompt) throw new NotFoundError("Prompt not found");
  return prompt;
}
