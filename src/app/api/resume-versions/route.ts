import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export async function GET(req: NextRequest) {
  try {
    const resumeId = new URL(req.url).searchParams.get("resumeId");
    const rows = resumeId
      ? await prisma.resumeVersion.findMany({
          where: { resumeId },
          orderBy: { updatedAt: "desc" },
        })
      : await prisma.resumeVersion.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to list resume versions", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<{
      resumeId: string;
      versionName: string;
      parentVersionId?: string | null;
      jobDescriptionId?: string | null;
      selectedBullets?: string | null;
      selectedSkills?: string | null;
      selectedProjects?: string | null;
      selectedExperiences?: string | null;
      selectedEducation?: string | null;
      selectedAwards?: string | null;
      targetCompany?: string | null;
      targetRole?: string | null;
      targetIndustry?: string | null;
      notes?: string | null;
    }>;

    if (!body.resumeId) return jsonErr("resumeId is required", 400);
    const resumeExists = await prisma.resume.findUnique({ where: { id: body.resumeId } });
    if (!resumeExists) return jsonErr("Resume not found", 404);

    const versionName = body.versionName?.trim() || "Untitled version";
    const version = await prisma.resumeVersion.create({
      data: {
        resumeId: body.resumeId,
        versionName,
        parentVersionId: body.parentVersionId ?? undefined,
        jobDescriptionId: body.jobDescriptionId ?? undefined,
        selectedBullets: body.selectedBullets,
        selectedSkills: body.selectedSkills,
        selectedProjects: body.selectedProjects,
        selectedExperiences: body.selectedExperiences,
        selectedEducation: body.selectedEducation,
        selectedAwards: body.selectedAwards,
        targetCompany: body.targetCompany,
        targetRole: body.targetRole,
        targetIndustry: body.targetIndustry,
        notes: body.notes,
      },
    });
    return NextResponse.json(version, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to create resume version", 500);
  }
}
