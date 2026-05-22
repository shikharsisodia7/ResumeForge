import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";

export async function GET() {
  try {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);
    return NextResponse.json(profile);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to load profile", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const profile = await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    if (!profile) return jsonErr("No profile found", 404);
    const body = (await request.json()) as Record<string, unknown>;
    const data: Prisma.UserProfileUpdateInput = {};
    if ("fullName" in body && typeof body.fullName === "string") data.fullName = body.fullName;
    if ("email" in body) data.email = body.email === null ? null : String(body.email);
    if ("phone" in body) data.phone = body.phone === null ? null : String(body.phone);
    if ("location" in body) data.location = body.location === null ? null : String(body.location);
    if ("linkedIn" in body) data.linkedIn = body.linkedIn === null ? null : String(body.linkedIn);
    if ("github" in body) data.github = body.github === null ? null : String(body.github);
    if ("portfolio" in body) data.portfolio = body.portfolio === null ? null : String(body.portfolio);
    if ("website" in body) data.website = body.website === null ? null : String(body.website);
    if ("customLinks" in body) data.customLinks = body.customLinks === null ? null : String(body.customLinks);
    if ("summary" in body) data.summary = body.summary === null ? null : String(body.summary);

    const updated = await prisma.userProfile.update({
      where: { id: profile.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to update profile", 500);
  }
}
