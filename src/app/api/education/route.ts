import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export async function GET() {
  try {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);
    const educations = await prisma.education.findMany({
      where: { profileId: profile.id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(educations);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to list education", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { profileId?: string } & Record<string, unknown>;
    let profileId = body.profileId;
    if (!profileId) {
      const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
      profileId = profile?.id;
    }
    if (!profileId) return jsonErr("No profile found — create profile first", 404);

    const {
      school,
      degree,
      major,
      minor,
      gpa,
      graduationDate,
      coursework,
      honors,
      notes,
      order,
    } = body as {
      school: string;
      degree?: string;
      major?: string;
      minor?: string;
      gpa?: string;
      graduationDate?: string;
      coursework?: string;
      honors?: string;
      notes?: string;
      order?: number;
    };

    if (!school) return jsonErr("school is required", 400);

    const edu = await prisma.education.create({
      data: {
        profileId,
        school,
        degree,
        major,
        minor,
        gpa,
        graduationDate,
        coursework,
        honors,
        notes,
        order: order ?? 0,
      },
    });
    return NextResponse.json(edu, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to create education", 500);
  }
}
