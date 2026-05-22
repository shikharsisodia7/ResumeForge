import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const exists = await prisma.project.findUnique({ where: { id } });
    if (!exists) return jsonErr("Project not found", 404);
    const body = (await request.json()) as Record<string, unknown>;
    const updated = await prisma.project.update({
      where: { id },
      data: body as Parameters<typeof prisma.project.update>[0]["data"],
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to update project", 500);
  }
}

export async function DELETE(_request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    await prisma.project.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2025"
    ) {
      return jsonErr("Project not found", 404);
    }
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to delete project", 500);
  }
}
