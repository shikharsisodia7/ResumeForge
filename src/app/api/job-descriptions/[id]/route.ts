import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const job = await prisma.jobDescription.findUnique({
      where: { id },
      include: { keywords: true },
    });
    if (!job) return jsonErr("Job description not found", 404);
    return NextResponse.json(job);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to load job description", 500);
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const exists = await prisma.jobDescription.findUnique({ where: { id } });
    if (!exists) return jsonErr("Job description not found", 404);
    const body = (await request.json()) as Record<string, unknown>;
    const updated = await prisma.jobDescription.update({
      where: { id },
      data: body as Parameters<typeof prisma.jobDescription.update>[0]["data"],
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to update job description", 500);
  }
}

export async function DELETE(_request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    await prisma.jobDescription.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2025"
    ) {
      return jsonErr("Job description not found", 404);
    }
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to delete job description", 500);
  }
}
