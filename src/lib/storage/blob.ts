import { del, put, get, list } from "@vercel/blob";
import { sanitizeFilename } from "@/lib/files/validate";

/**
 * All resume source files and rendered PDFs are stored as `access: 'private'`
 * blobs. Private blobs cannot be fetched by URL without the store's
 * read/write token, so every read goes through our own authenticated API
 * routes — there is no public link a client could hand out.
 */

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

export interface StoredResumeSource {
  pathname: string;
  uploadedAt: Date;
}

/** Every object under the resume-uploads prefix, across all users, paginated. */
export async function listResumeSourceObjects(): Promise<StoredResumeSource[]> {
  const objects: StoredResumeSource[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "resumes/", cursor, limit: 1000 });
    for (const blob of page.blobs) {
      objects.push({ pathname: blob.pathname, uploadedAt: blob.uploadedAt });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return objects;
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
