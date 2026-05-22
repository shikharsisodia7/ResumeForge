import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export async function GET() {
  try {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);
    const experiences = await prisma.experience.findMany({
      where: { profileId: profile.id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(experiences);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to list experiences", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);
    const body = (await request.json()) as Partial<{
      title: string;
      organization: string;
      location?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      type?: string;
      description?: string | null;
      metrics?: string | null;
      proofLinks?: string | null;
      notes?: string | null;
      skills?: string | null;
      order?: number;
    }>;

    const { title, organization } = body;
    if (!title?.trim()) return jsonErr("title is required", 400);
    if (!organization?.trim()) return jsonErr("organization is required", 400);

    const exp = await prisma.experience.create({
      data: {
        profileId: profile.id,
        title: title.trim(),
        organization: organization.trim(),
        location: body.location ?? undefined,
        startDate: body.startDate ?? undefined,
        endDate: body.endDate ?? undefined,
        type: body.type ?? "job",
        description: body.description ?? undefined,
        metrics: body.metrics ?? undefined,
        proofLinks: body.proofLinks ?? undefined,
        notes: body.notes ?? undefined,
        skills: body.skills ?? undefined,
        order: body.order ?? 0,
      },
    });
    return NextResponse.json(exp, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to create experience", 500);
  }
}
