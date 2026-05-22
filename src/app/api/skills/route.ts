import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export async function GET() {
  try {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);
    const skills = await prisma.skill.findMany({
      where: { profileId: profile.id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(skills);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to list skills", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);
    const body = (await request.json()) as Partial<{
      name: string;
      category: string;
      proficiency: string;
      relatedExperience: string;
      relatedProjects: string;
      relatedBullets: string;
      relatedCourses: string;
      lastUsed: string;
      evidenceStrength: number;
      order: number;
    }>;

    if (!body.name?.trim()) return jsonErr("name is required", 400);

    const skill = await prisma.skill.create({
      data: {
        profileId: profile.id,
        name: body.name.trim(),
        category: body.category ?? "programming",
        proficiency: body.proficiency ?? "intermediate",
        relatedExperience: body.relatedExperience,
        relatedProjects: body.relatedProjects,
        relatedBullets: body.relatedBullets,
        relatedCourses: body.relatedCourses,
        lastUsed: body.lastUsed,
        evidenceStrength: body.evidenceStrength ?? 0,
        order: body.order ?? 0,
      },
    });
    return NextResponse.json(skill, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to create skill", 500);
  }
}
