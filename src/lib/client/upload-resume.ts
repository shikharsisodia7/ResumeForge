import { upload } from "@vercel/blob/client";
import { sanitizeFilename } from "@/lib/files/validate";
import { ApiError } from "@/lib/client/api";

/**
 * Uploads a resume file straight to Blob storage from the browser (never
 * through this app's own server, which — like every Vercel Function —
 * caps request bodies at 4.5 MB regardless of plan), then asks the server
 * to validate and process the now-stored object. `userId` scopes the
 * storage path to the caller's own prefix; the server independently
 * re-derives the authenticated user from the session and rejects any
 * pathname outside it, so a forged `userId` here gains nothing.
 */
export async function uploadAndFinalizeResume(params: {
  file: File;
  title: string;
  userId: string;
  onProgress: (percent: number) => void;
}): Promise<{ resume: { id: string; title: string }; version: { id: string; name: string } }> {
  const { file, title, userId, onProgress } = params;
  const pathname = `resumes/${userId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;

  let blob;
  try {
    blob = await upload(pathname, file, {
      access: "private",
      handleUploadUrl: "/api/resumes/upload/authorize",
      contentType: file.type || "application/octet-stream",
      onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
    });
  } catch (err) {
    throw new ApiError(err instanceof Error ? err.message : "Upload failed", 0);
  }

  const res = await fetch("/api/resumes/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pathname: blob.pathname, filename: file.name, title }),
  });
  const responseBody = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(responseBody?.error ?? "Upload failed", res.status);
  }
  return responseBody;
}
