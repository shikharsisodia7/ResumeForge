import { del, put, get } from "@vercel/blob";
import { sanitizeFilename } from "@/lib/files/validate";

/**
 * All resume source files and rendered PDFs are stored as `access: 'private'`
 * blobs. Private blobs cannot be fetched by URL without the store's
 * read/write token, so every read goes through our own authenticated API
 * routes — there is no public link a client could hand out.
 */

export async function uploadResumeSource(params: {
  userId: string;
  resumeId: string;
  filename: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  const pathname = `resumes/${params.userId}/${params.resumeId}/${sanitizeFilename(params.filename)}`;
  const result = await put(pathname, params.buffer, {
    access: "private",
    contentType: params.mimeType,
    allowOverwrite: true,
  });
  return result.pathname;
}

export async function readStorageObject(
  storageKey: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const result = await get(storageKey, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  const arrayBuffer = await new Response(result.stream).arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType: result.blob.contentType };
}

export async function deleteStorageObject(storageKey: string): Promise<void> {
  await del(storageKey);
}

export async function uploadGeneratedPdf(params: {
  userId: string;
  versionId: string;
  revision: number;
  filename: string;
  buffer: Buffer;
}): Promise<string> {
  const pathname = `pdfs/${params.userId}/${params.versionId}/rev-${params.revision}-${sanitizeFilename(params.filename)}`;
  const result = await put(pathname, params.buffer, {
    access: "private",
    contentType: "application/pdf",
    allowOverwrite: true,
  });
  return result.pathname;
}
