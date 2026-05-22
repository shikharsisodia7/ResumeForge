import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";
import { analyzeJobDescription } from "@/lib/engines/text-analysis";

export async function GET() {
  try {
    const jobs = await prisma.jobDescription.findMany({
      include: { keywords: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(jobs);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to list job descriptions", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<{
      title: string;
      company: string;
      location?: string | null;
      descriptionText: string;
      sourceUrl?: string | null;
      deadline?: string | null;
      notes?: string | null;
      category?: string | null;
    }>;

    if (!body.descriptionText?.trim()) return jsonErr("descriptionText is required", 400);
    const title = body.title?.trim() ?? "Untitled role";
    const company = body.company?.trim() ?? "Unknown company";
    const category = body.category ?? "software-engineering";

    const analysis = analyzeJobDescription(body.descriptionText.trim(), title, category);
    const row = analysis.rankedKeywords.slice(0, 60);

    const job = await prisma.jobDescription.create({
      data: {
        title,
        company,
        location: body.location ?? undefined,
        descriptionText: body.descriptionText.trim(),
        sourceUrl: body.sourceUrl ?? undefined,
        deadline: body.deadline ?? undefined,
        notes: body.notes ?? undefined,
        category,
        extractedKeywords: JSON.stringify(analysis),
        keywords: {
          create: row.map((k) => ({
            term: k.term,
            category: k.category,
            importance: Math.min(100, k.importance),
            frequency: k.frequency,
            isRequired: k.isRequired,
          })),
        },
      },
      include: { keywords: true },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to create job description", 500);
  }
}
