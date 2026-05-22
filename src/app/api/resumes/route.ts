import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export async function GET() {
  try {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);
    const resumes = await prisma.resume.findMany({
      where: { profileId: profile.id },
      include: { versions: { orderBy: { updatedAt: "desc" } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(resumes);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to list resumes", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);
    const body = (await request.json()) as Partial<Record<string, unknown>>;
    const name = body.name as string | undefined;
    if (!name?.trim()) return jsonErr("name is required", 400);

    const resume = await prisma.resume.create({
      data: {
        profileId: profile.id,
        name: name.trim(),
        targetRole: (body.targetRole as string) ?? undefined,
        targetCompany: (body.targetCompany as string) ?? undefined,
        targetIndustry: (body.targetIndustry as string) ?? undefined,
        targetJobLevel: (body.targetJobLevel as string) ?? undefined,
        template: typeof body.template === "string" ? body.template : "classic",
        font: typeof body.font === "string" ? body.font : "inter",
        spacing: typeof body.spacing === "string" ? body.spacing : "normal",
        margins: typeof body.margins === "string" ? body.margins : "normal",
        onePageMode: typeof body.onePageMode === "boolean" ? body.onePageMode : true,
        sectionOrder: typeof body.sectionOrder === "string" ? body.sectionOrder : undefined,
        sectionHeaders: typeof body.sectionHeaders === "string" ? body.sectionHeaders : undefined,
        hiddenSections: typeof body.hiddenSections === "string" ? body.hiddenSections : undefined,
        notes: typeof body.notes === "string" ? body.notes : undefined,
      },
    });

    await prisma.resumeVersion.create({
      data: {
        resumeId: resume.id,
        versionName: "Baseline",
      },
    });

    const withVersions = await prisma.resume.findUnique({
      where: { id: resume.id },
      include: { versions: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json(withVersions, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to create resume", 500);
  }
}
