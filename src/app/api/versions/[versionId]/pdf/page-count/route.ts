import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { requireOwnedVersion } from "@/lib/auth/ownership";
import { apiRoute } from "@/lib/api/handler";
import { countPdfPages } from "@/lib/pdf/page-count";
import { renderResumePdf } from "@/lib/pdf/render";
import { resumeContentSchema } from "@/lib/schemas/resume-content";
import { resumeStyleSchema } from "@/lib/schemas/resume-style";

/**
 * Reports the page count of the *actual* server-rendered PDF for this
 * version's current content/style — the same renderer "Download PDF" uses.
 * The editor preview displays this number so it can never silently disagree
 * with the real downloaded PDF.
 */
export const GET = apiRoute(async (_request, ctx) => {
  const { versionId } = await ctx.params;
  const user = await requireUser();
  const version = await requireOwnedVersion(versionId, user.id);

  const content = resumeContentSchema.parse(version.contentJson);
  const style = resumeStyleSchema.parse(version.styleJson);

  const pdfBuffer = await renderResumePdf(content, style);
  const pageCount = await countPdfPages(pdfBuffer);

  return NextResponse.json({ pageCount });
});
