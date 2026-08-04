import { Prisma } from "@prisma/client";
import type { Resume, ResumeVersion } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ConflictError } from "@/lib/errors";

type OwnedVersion = ResumeVersion & { resume: Resume };

/** Restores the single most recent pre-change snapshot (one level of undo). */
export async function undoVersion(version: OwnedVersion, userId: string): Promise<ResumeVersion> {
  if (
    version.previousContentJson === null ||
    version.previousStyleJson === null ||
    version.previousRevision === null
  ) {
    throw new ConflictError("There's nothing to undo for this version");
  }

  const claimed = await prisma.resumeVersion.updateMany({
    where: { id: version.id, isProcessing: false },
    data: { isProcessing: true },
  });
  if (claimed.count === 0) {
    throw new ConflictError("This version is already being updated");
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.resumeVersion.update({
        where: { id: version.id },
        data: {
          contentJson: version.previousContentJson as object,
          styleJson: version.previousStyleJson as object,
          revision: version.previousRevision as number,
          previousContentJson: Prisma.JsonNull,
          previousStyleJson: Prisma.JsonNull,
          previousRevision: null,
          isProcessing: false,
        },
      });
      await tx.generationRun.create({
        data: {
          userId,
          resumeId: version.resumeId,
          versionId: version.id,
          operation: "UNDO",
          modelId: "n/a",
          status: "SUCCESS",
        },
      });
      return saved;
    });
    return updated;
  } catch (error) {
    await prisma.resumeVersion.update({ where: { id: version.id }, data: { isProcessing: false } });
    throw error;
  }
}
