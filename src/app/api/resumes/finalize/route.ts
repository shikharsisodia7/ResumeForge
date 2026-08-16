import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { extractResumeText } from "@/lib/files/extract";
import { sha256Hex } from "@/lib/files/hash";
import { validateUploadedFile } from "@/lib/files/validate";
import { apiRoute } from "@/lib/api/handler";
import { enforceGenerationRateLimit } from "@/lib/rate-limit";
import { finalizeUploadSchema } from "@/lib/schemas/requests";
import { createFormattedVersion } from "@/lib/services/resume-format";
import { deleteStorageObject, readStorageObject } from "@/lib/storage/blob";
import { isOwnUploadPathname } from "@/lib/storage/upload-pathname";

/** Looks up a resume already finalized from this exact blob object, if any. */
async function findFinalizedUpload(storageKey: string) {
  const resume = await prisma.resume.findUnique({
    where: { storageKey },
    include: { versions: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  const version = resume?.versions[0];
  if (!resume || !version) return null;
  return {
    resume: { id: resume.id, title: resume.title, createdAt: resume.createdAt },
    version: { id: version.id, name: version.name },
    duplicateOf: null,
  };
}

/**
 * Completes an upload that was PUT directly to Blob storage by the browser
 * (see /api/resumes/upload/authorize). Re-validates the file's real content
 * server-side — client uploads never carry any trust beyond "this bucket of
 * bytes belongs to this authenticated user's own prefix."
 */
export const POST = apiRoute(async (request) => {
  const user = await requireUser();
  const body = finalizeUploadSchema.parse(await request.json());

  if (!isOwnUploadPathname(body.pathname, user.id)) {
    throw new NotFoundError("Upload not found");
  }

  // Idempotent replay: a prior finalize call for this exact object already
  // succeeded (e.g. a retried request after a dropped response) — return
  // that result again rather than re-running extraction and AI formatting.
  const alreadyFinalized = await findFinalizedUpload(body.pathname);
  if (alreadyFinalized) {
    return NextResponse.json(alreadyFinalized);
  }

  // Best-effort early exit for an already-limited user, so we don't spend
  // time reading and validating the blob before rejecting. Not the sole
  // gate — createFormattedVersion below enforces the limit atomically.
  await enforceGenerationRateLimit(user.id);

  const stored = await readStorageObject(body.pathname);
  if (!stored) {
    throw new NotFoundError("Upload not found — it may have expired or already been processed");
  }

  let validated;
  try {
    validated = validateUploadedFile({
      filename: body.filename,
      declaredMimeType: stored.contentType,
      buffer: stored.buffer,
    });
  } catch (error) {
    await deleteStorageObject(body.pathname).catch(() => {});
    throw error;
  }

  const sourceText = await extractResumeText(validated.buffer, validated.kind);
  const fileHash = sha256Hex(validated.buffer);

  const duplicate = await prisma.resume.findFirst({
    where: { userId: user.id, fileHash },
    select: { id: true, title: true },
  });

  let resume;
  try {
    resume = await prisma.resume.create({
      data: {
        userId: user.id,
        title: body.title,
        originalFilename: validated.filename,
        mimeType: validated.mimeType,
        storageKey: body.pathname,
        sourceText,
        fileHash,
      },
    });
  } catch (error) {
    // Lost a race against a concurrent finalize call for the same object —
    // that call's result is the real outcome, not an error.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await findFinalizedUpload(body.pathname);
      if (winner) return NextResponse.json(winner);
    }
    throw error;
  }

  try {
    const version = await createFormattedVersion(resume, user.id);
    return NextResponse.json(
      {
        resume: { id: resume.id, title: resume.title, createdAt: resume.createdAt },
        version: { id: version.id, name: version.name },
        duplicateOf: duplicate && duplicate.id !== resume.id ? duplicate : null,
      },
      { status: 201 },
    );
  } catch (error) {
    // Never leave a half-created resume (no usable version) visible in the
    // dashboard — clean up the DB row and the uploaded blob before failing.
    await prisma.resume.delete({ where: { id: resume.id } }).catch(() => {});
    await deleteStorageObject(body.pathname).catch(() => {});
    throw error;
  }
});
