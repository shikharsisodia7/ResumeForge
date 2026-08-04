import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { requireOwnedVersion } from "@/lib/auth/ownership";
import { apiRoute } from "@/lib/api/handler";
import { sanitizeFilename } from "@/lib/files/validate";
import { renderResumePdf } from "@/lib/pdf/render";
import { resumeContentSchema } from "@/lib/schemas/resume-content";
import { resumeStyleSchema } from "@/lib/schemas/resume-style";
import { uploadGeneratedPdf } from "@/lib/storage/blob";

export const GET = apiRoute(async (_request, ctx) => {
  const { versionId } = await ctx.params;
  // Ownership is verified before any resume data is read or returned.
  const user = await requireUser();
  const version = await requireOwnedVersion(versionId, user.id);

  const content = resumeContentSchema.parse(version.contentJson);
  const style = resumeStyleSchema.parse(version.styleJson);

  const pdfBuffer = await renderResumePdf(content, style);
  const filename = `${sanitizeFilename(version.resume.title)}-${sanitizeFilename(version.name)}.pdf`;

  await uploadGeneratedPdf({
    userId: user.id,
    versionId: version.id,
    revision: version.revision,
    filename,
    buffer: pdfBuffer,
  }).catch((error) => {
    console.error("[pdf] failed to persist generated pdf to storage", {
      versionId: version.id,
      message: error instanceof Error ? error.message : String(error),
    });
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
