import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export async function GET() {
  try {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);
    const projects = await prisma.project.findMany({
      where: { profileId: profile.id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(projects);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to list projects", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);
    const body = (await request.json()) as Record<string, unknown>;
    const name = body.name as string | undefined;
    if (!name?.trim()) return jsonErr("name is required", 400);

    const project = await prisma.project.create({
      data: {
        profileId: profile.id,
        name: name.trim(),
        shortDescription: (body.shortDescription as string) ?? undefined,
        longDescription: (body.longDescription as string) ?? undefined,
        problemSolved: (body.problemSolved as string) ?? undefined,
        targetUsers: (body.targetUsers as string) ?? undefined,
        techStack: (body.techStack as string) ?? undefined,
        githubLink: (body.githubLink as string) ?? undefined,
        demoLink: (body.demoLink as string) ?? undefined,
        architectureNotes: (body.architectureNotes as string) ?? undefined,
        databaseNotes: (body.databaseNotes as string) ?? undefined,
        featuresCompleted: (body.featuresCompleted as string) ?? undefined,
        featuresPlanned: (body.featuresPlanned as string) ?? undefined,
        challenges: (body.challenges as string) ?? undefined,
        personalContribution: (body.personalContribution as string) ?? undefined,
        skillsProven: (body.skillsProven as string) ?? undefined,
        metrics: (body.metrics as string) ?? undefined,
        awards: (body.awards as string) ?? undefined,
        hackathonName: (body.hackathonName as string) ?? undefined,
        readinessScore: typeof body.readinessScore === "number" ? body.readinessScore : undefined,
        order: typeof body.order === "number" ? body.order : 0,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to create project", 500);
  }
}
