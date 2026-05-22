import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export async function GET(req: NextRequest) {
  try {
    const applicationId = new URL(req.url).searchParams.get("applicationId") ?? undefined;
    const stars = await prisma.starStory.findMany({
      where: applicationId ? { applicationId } : {},
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(stars);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to list STAR stories", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<{
      situation: string;
      task: string;
      action: string;
      result: string;
      skillsShown?: string | null;
      category?: string;
      tags?: string | null;
      relatedExperienceId?: string | null;
      relatedProjectId?: string | null;
      applicationId?: string | null;
      strengthScore?: number;
    }>;

    const { situation, task, action, result } = body;
    if (!situation?.trim()) return jsonErr("situation is required", 400);
    if (!task?.trim()) return jsonErr("task is required", 400);
    if (!action?.trim()) return jsonErr("action is required", 400);
    if (!result?.trim()) return jsonErr("result is required", 400);

    const star = await prisma.starStory.create({
      data: {
        situation: situation.trim(),
        task: task.trim(),
        action: action.trim(),
        result: result.trim(),
        skillsShown: body.skillsShown ?? undefined,
        category: body.category ?? "leadership",
        tags: body.tags ?? undefined,
        relatedExperienceId: body.relatedExperienceId ?? undefined,
        relatedProjectId: body.relatedProjectId ?? undefined,
        applicationId: body.applicationId ?? undefined,
        strengthScore: typeof body.strengthScore === "number" ? body.strengthScore : 0,
      },
    });
    return NextResponse.json(star, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to create STAR story", 500);
  }
}
