import { renderToBuffer } from "@react-pdf/renderer";
import { ResumeDocument } from "@/lib/pdf/ResumeDocument";
import type { ResumeContent } from "@/lib/schemas/resume-content";
import type { ResumeStyle } from "@/lib/schemas/resume-style";

/**
 * Renders the same structured content + style the editor previews into a
 * PDF with real, selectable text (not a screenshot). Deterministic: the
 * same content/style input always produces the same output.
 */
export async function renderResumePdf(content: ResumeContent, style: ResumeStyle): Promise<Buffer> {
  return renderToBuffer(ResumeDocument({ content, style }));
}
