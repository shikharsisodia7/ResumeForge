import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";
import { bulletScoresFromText } from "@/lib/services/bullet-score-persist";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const exists = await prisma.bullet.findUnique({ where: { id } });
    if (!exists) return jsonErr("Bullet not found", 404);

    const body = (await request.json()) as Record<string, unknown>;
    const data: Prisma.BulletUpdateInput = {};

    if ("category" in body && typeof body.category === "string") data.category = body.category;
    if ("actionVerb" in body) data.actionVerb = strOrNull(body.actionVerb);
    if ("impact" in body) data.impact = strOrNull(body.impact);
    if ("metric" in body) data.metric = strOrNull(body.metric);
    if ("status" in body && typeof body.status === "string") data.status = body.status;
    if ("notes" in body) data.notes = strOrNull(body.notes);
    if ("relatedRole" in body) data.relatedRole = strOrNull(body.relatedRole);
    if ("skillTags" in body) data.skillTags = strOrNull(body.skillTags);
    if ("experienceId" in body) {
      const expId = slugOrNull(body.experienceId);
      data.experience =
        expId === null ? { disconnect: true } : { connect: { id: expId } };
    }
    if ("projectId" in body) {
      const projId = slugOrNull(body.projectId);
      data.project = projId === null ? { disconnect: true } : { connect: { id: projId } };
    }
    if ("version" in body && typeof body.version === "number") data.version = body.version;

    if ("text" in body && typeof body.text === "string") {
      const t = body.text.trim();
      data.text = t;
      Object.assign(data, bulletScoresFromText(t));
    }

    const updated = await prisma.bullet.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to update bullet", 500);
  }
}

export async function DELETE(_request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    await prisma.bullet.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2025"
    ) {
      return jsonErr("Bullet not found", 404);
    }
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to delete bullet", 500);
  }
}

function strOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  return String(v);
}

function slugOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  return String(v);
}
