import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";
import { bulletScoresFromText } from "@/lib/services/bullet-score-persist";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("search");

    const where: Prisma.BulletWhereInput = { profileId: profile.id };
    if (category) where.category = category;
    if (status) where.status = status;
    if (search?.trim())
      where.text = {
        contains: search.trim(),
      };

    const bullets = await prisma.bullet.findMany({ where, orderBy: { updatedAt: "desc" } });
    return NextResponse.json(bullets);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to list bullets", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);
    const body = (await request.json()) as {
      text?: string;
      category?: string;
      actionVerb?: string;
      impact?: string;
      metric?: string;
      status?: string;
      experienceId?: string | null;
      projectId?: string | null;
      notes?: string;
      skillTags?: string;
      relatedRole?: string;
    };

    const { text } = body;
    if (!text?.trim()) return jsonErr("text is required", 400);

    const scores = bulletScoresFromText(text);
    const bullet = await prisma.bullet.create({
      data: {
        profileId: profile.id,
        text: text.trim(),
        category: body.category ?? undefined,
        actionVerb: body.actionVerb,
        impact: body.impact,
        metric: body.metric,
        status: body.status ?? undefined,
        experienceId: body.experienceId ?? undefined,
        projectId: body.projectId ?? undefined,
        notes: body.notes,
        skillTags: body.skillTags,
        relatedRole: body.relatedRole,
        ...scores,
      },
    });
    return NextResponse.json(bullet, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to create bullet", 500);
  }
}

/** DELETE `/api/bullets?id=` */
export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return jsonErr("id query parameter is required", 400);
    await prisma.bullet.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Record to delete does not exist")) {
      return jsonErr("Bullet not found", 404);
    }
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to delete bullet", 500);
  }
}
