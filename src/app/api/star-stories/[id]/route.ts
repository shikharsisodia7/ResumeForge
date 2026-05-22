import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    await prisma.starStory.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2025"
    ) {
      return jsonErr("STAR story not found", 404);
    }
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to delete STAR story", 500);
  }
}
