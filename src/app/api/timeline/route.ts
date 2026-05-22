import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? "200") || 200, 500);
    const events = await prisma.timelineEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(events);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to load timeline", 500);
  }
}
