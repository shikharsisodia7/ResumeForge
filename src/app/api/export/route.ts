import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";
import {
  resumeToHTML,
  resumeToJSON,
  resumeToMarkdown,
  resumeToPlainText,
} from "@/lib/engines/resume-export";
import { buildResumeContentFromVersion } from "@/lib/services/resume-content";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      resumeVersionId?: string;
      format?: "pdf" | "text" | "md" | "html" | "json";
    };

    const { resumeVersionId, format } = body;
    if (!resumeVersionId) return jsonErr("resumeVersionId is required", 400);
    if (!format) return jsonErr("format is required", 400);

    const content = await buildResumeContentFromVersion(resumeVersionId);
    const version = await prisma.resumeVersion.findUnique({
      where: { id: resumeVersionId },
      include: { resume: true },
    });
    if (!content || !version) return jsonErr("Resume version not found", 404);

    const template = version.resume.template ?? "classic";

    if (format === "text") {
      const text = resumeToPlainText(content);
      return NextResponse.json({ format, text });
    }
    if (format === "md") {
      return NextResponse.json({ format, markdown: resumeToMarkdown(content) });
    }
    if (format === "html") {
      return NextResponse.json({ format, html: resumeToHTML(content, template) });
    }
    if (format === "json") {
      return NextResponse.json({ format, document: JSON.parse(resumeToJSON(content)) });
    }
    if (format === "pdf") {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const lines = doc.splitTextToSize(resumeToPlainText(content), 500);
      let y = 48;
      const lineHeight = 12;
      for (const line of lines) {
        if (y > 750) {
          doc.addPage();
          y = 48;
        }
        doc.text(line, 48, y);
        y += lineHeight;
      }
      const buf = doc.output("arraybuffer");
      await prisma.exportHistory.create({
        data: {
          resumeVersionId,
          format: "pdf",
          targetRole: version.targetRole ?? version.resume.targetRole ?? undefined,
          targetCompany: version.targetCompany ?? version.resume.targetCompany ?? undefined,
        },
      });
      return new NextResponse(Buffer.from(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="resume-${resumeVersionId}.pdf"`,
        },
      });
    }

    return jsonErr("Unsupported format", 400);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Export failed", 500);
  }
}
