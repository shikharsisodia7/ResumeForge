import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireUser } from "@/lib/auth/current-user";
import { apiRoute } from "@/lib/api/handler";
import { ValidationError } from "@/lib/errors";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/files/constants";
import { enforceGenerationRateLimit } from "@/lib/rate-limit";
import { isOwnUploadPathname } from "@/lib/storage/upload-pathname";

const ALLOWED_CONTENT_TYPES = Object.values(ALLOWED_MIME_TYPES).flat();
const TOKEN_VALID_MS = 10 * 60 * 1000;

/**
 * Issues a short-lived, size/type-constrained client token so the browser
 * can PUT the file straight to Blob storage instead of through this Vercel
 * Function — Vercel Functions cap request bodies at 4.5 MB regardless of
 * plan, well under the app's advertised 10 MB limit. The file is still
 * fully re-validated (magic bytes, not just declared type) server-side in
 * `/api/resumes/finalize` before it's ever parsed or trusted.
 */
export const POST = apiRoute(async (request) => {
  const user = await requireUser();
  // Gates blob-write attempts, not just the eventual AI call — a client
  // that's already rate-limited shouldn't be handed a fresh upload token.
  await enforceGenerationRateLimit(user.id);

  const body = (await request.json()) as HandleUploadBody;

  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => {
      // The client chooses the pathname, so it must not be trusted for
      // authorization — pin it to the session's own server-derived user id,
      // never the client's claim about who it is.
      if (!isOwnUploadPathname(pathname, user.id)) {
        throw new ValidationError("Invalid upload destination");
      }
      return {
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
        addRandomSuffix: true,
        allowOverwrite: false,
        validUntil: Date.now() + TOKEN_VALID_MS,
      };
    },
  });

  return NextResponse.json(jsonResponse);
});
