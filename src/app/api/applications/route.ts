import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export async function GET() {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(applications);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to list applications", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<{
      company: string;
      role: string;
      location?: string | null;
      jobUrl?: string | null;
      dateApplied?: string | null;
      deadline?: string | null;
      resumeVersionId?: string | null;
      coverLetterId?: string | null;
      jobDescriptionId?: string | null;
      recruiterName?: string | null;
      recruiterEmail?: string | null;
      status?: string;
      followUpDate?: string | null;
      interviewDates?: string | null;
      outcome?: string | null;
      matchScoreAtApply?: number | null;
      notes?: string | null;
    }>;

    const { company, role } = body;
    if (!company?.trim()) return jsonErr("company is required", 400);
    if (!role?.trim()) return jsonErr("role is required", 400);

    const app = await prisma.application.create({
      data: {
        company: company.trim(),
        role: role.trim(),
        location: body.location ?? undefined,
        jobUrl: body.jobUrl ?? undefined,
        dateApplied: body.dateApplied ?? undefined,
        deadline: body.deadline ?? undefined,
        resumeVersionId: body.resumeVersionId ?? undefined,
        coverLetterId: body.coverLetterId ?? undefined,
        jobDescriptionId: body.jobDescriptionId ?? undefined,
        recruiterName: body.recruiterName ?? undefined,
        recruiterEmail: body.recruiterEmail ?? undefined,
        status: body.status ?? "saved",
        followUpDate: body.followUpDate ?? undefined,
        interviewDates: body.interviewDates ?? undefined,
        outcome: body.outcome ?? undefined,
        matchScoreAtApply: body.matchScoreAtApply ?? undefined,
        notes: body.notes ?? undefined,
      },
    });
    return NextResponse.json(app, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to create application", 500);
  }
}
