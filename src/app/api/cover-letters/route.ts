import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export async function GET() {
  try {
    const letters = await prisma.coverLetter.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json(letters);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to list cover letters", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<{
      title: string;
      content: string;
      template?: string;
      company?: string | null;
      role?: string | null;
      jobDescriptionId?: string | null;
      resumeVersionId?: string | null;
      fields?: string | null;
    }>;

    if (!body.title?.trim()) return jsonErr("title is required", 400);
    if (!body.content?.trim()) return jsonErr("content is required", 400);

    const letter = await prisma.coverLetter.create({
      data: {
        title: body.title.trim(),
        content: body.content.trim(),
        template: body.template ?? "internship",
        company: body.company ?? undefined,
        role: body.role ?? undefined,
        jobDescriptionId: body.jobDescriptionId ?? undefined,
        resumeVersionId: body.resumeVersionId ?? undefined,
        fields: body.fields ?? undefined,
      },
    });
    return NextResponse.json(letter, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to create cover letter", 500);
  }
}
