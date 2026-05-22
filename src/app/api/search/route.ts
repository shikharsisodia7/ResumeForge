import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export async function GET(req: NextRequest) {
  try {
    const q = new URL(req.url).searchParams.get("q")?.trim();
    if (!q) return jsonErr("q query parameter is required", 400);

    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);

    const contains = { contains: q };

    const [bullets, skills, projects, experiences, jobs, resumes, applications] = await Promise.all([
      prisma.bullet.findMany({
        where: { profileId: profile.id, text: contains },
        take: 20,
      }),
      prisma.skill.findMany({
        where: { profileId: profile.id, name: contains },
        take: 20,
      }),
      prisma.project.findMany({
        where: {
          profileId: profile.id,
          OR: [{ name: contains }, { shortDescription: contains }, { longDescription: contains }],
        },
        take: 15,
      }),
      prisma.experience.findMany({
        where: {
          profileId: profile.id,
          OR: [
            { title: contains },
            { organization: contains },
            { description: contains },
          ],
        },
        take: 15,
      }),
      prisma.jobDescription.findMany({
        where: {
          OR: [
            { title: contains },
            { company: contains },
            { descriptionText: contains },
          ],
        },
        take: 15,
      }),
      prisma.resume.findMany({
        where: { profileId: profile.id, name: contains },
        take: 10,
      }),
      prisma.application.findMany({
        where: {
          OR: [{ company: contains }, { role: contains }, { notes: contains }],
        },
        take: 15,
      }),
    ]);

    return NextResponse.json({
      bullets,
      skills,
      projects,
      experiences,
      jobDescriptions: jobs,
      resumes,
      applications,
    });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Search failed", 500);
  }
}
