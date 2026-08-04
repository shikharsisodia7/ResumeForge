import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { extractResumeText } from "@/lib/files/extract";
import { sha256Hex } from "@/lib/files/hash";
import { validateUploadedFile } from "@/lib/files/validate";
import { apiRoute } from "@/lib/api/handler";
import { enforceGenerationRateLimit } from "@/lib/rate-limit";
import { uploadResumeSchema } from "@/lib/schemas/requests";
import { createFormattedVersion } from "@/lib/services/resume-format";
import { deleteStorageObject, uploadResumeSource } from "@/lib/storage/blob";

export const POST = apiRoute(async (request) => {
  const user = await requireUser();
  await enforceGenerationRateLimit(user.id);

  const form = await request.formData();
  const file = form.get("file");
  const title = form.get("title");

  if (!(file instanceof File)) {
    throw new ValidationError("A resume file is required");
  }
  const { title: validatedTitle } = uploadResumeSchema.parse({ title: typeof title === "string" ? title : "" });

  const buffer = Buffer.from(await file.arrayBuffer());
  const validated = validateUploadedFile({
    filename: file.name,
    declaredMimeType: file.type,
    buffer,
  });

  const sourceText = await extractResumeText(validated.buffer, validated.kind);
  const fileHash = sha256Hex(validated.buffer);

  const duplicate = await prisma.resume.findFirst({
    where: { userId: user.id, fileHash },
    select: { id: true, title: true },
  });

  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      title: validatedTitle,
      originalFilename: validated.filename,
      mimeType: validated.mimeType,
      storageKey: "",
      sourceText,
      fileHash,
    },
  });

  let storageKey: string;
  try {
    storageKey = await uploadResumeSource({
      userId: user.id,
      resumeId: resume.id,
      filename: validated.filename,
      buffer: validated.buffer,
      mimeType: validated.mimeType,
    });
    await prisma.resume.update({ where: { id: resume.id }, data: { storageKey } });

    const version = await createFormattedVersion({ ...resume, storageKey }, user.id);

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
    // dashboard — clean up the DB row and any uploaded blob before failing.
    await prisma.resume.delete({ where: { id: resume.id } }).catch(() => {});
    if (storageKey!) {
      await deleteStorageObject(storageKey).catch(() => {});
    }
    throw error;
  }
});
