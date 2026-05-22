import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const exists = await prisma.experience.findUnique({ where: { id } });
    if (!exists) return jsonErr("Experience not found", 404);
    const body = (await request.json()) as Record<string, unknown>;
    const updated = await prisma.experience.update({
      where: { id },
      data: body as Parameters<typeof prisma.experience.update>[0]["data"],
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to update experience", 500);
  }
}

export async function DELETE(_request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    await prisma.experience.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2025"
    ) {
      return jsonErr("Experience not found", 404);
    }
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to delete experience", 500);
  }
}
