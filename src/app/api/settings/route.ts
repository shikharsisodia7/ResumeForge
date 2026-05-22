import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonErr } from "@/lib/api/http";
import { DEFAULT_DICTIONARIES, STRONG_VERBS, WEAK_VERBS } from "@/lib/dictionaries/default-keywords";
import { toJson } from "@/lib/utils";

async function seedDictionariesIfEmpty() {
  let keywordDicts = await prisma.keywordDictionary.findMany();
  if (!keywordDicts.length) {
    for (const [category, terms] of Object.entries(DEFAULT_DICTIONARIES)) {
      await prisma.keywordDictionary.create({
        data: { category, terms: toJson(terms) },
      });
    }
    keywordDicts = await prisma.keywordDictionary.findMany();
  }

  let verbDicts = await prisma.actionVerbDictionary.findMany();
  if (!verbDicts.length) {
    await prisma.actionVerbDictionary.create({ data: { type: "strong", verbs: toJson(STRONG_VERBS) } });
    await prisma.actionVerbDictionary.create({ data: { type: "weak", verbs: toJson(WEAK_VERBS) } });
    verbDicts = await prisma.actionVerbDictionary.findMany();
  }

  return { keywordDicts, verbDicts };
}

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: "default" } });
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: "default" },
      });
    }
    const { keywordDicts, verbDicts } = await seedDictionariesIfEmpty();
    return NextResponse.json({ settings, keywordDicts, verbDicts });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to load settings bundle", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const patch: Prisma.SettingsUncheckedUpdateInput & Prisma.SettingsUncheckedCreateInput = {};

    if (typeof body.theme === "string") patch.theme = body.theme;
    if (typeof body.defaultTemplate === "string") patch.defaultTemplate = body.defaultTemplate;

    if ("scoringRules" in body) {
      if (body.scoringRules === null) patch.scoringRules = null;
      else if (typeof body.scoringRules === "string") patch.scoringRules = body.scoringRules;
      else patch.scoringRules = toJson(body.scoringRules);
    }

    if ("weakWords" in body) {
      if (body.weakWords === null) patch.weakWords = null;
      else if (typeof body.weakWords === "string") patch.weakWords = body.weakWords;
      else patch.weakWords = toJson(body.weakWords);
    }

    const updated = await prisma.settings.upsert({
      where: { id: "default" },
      create: { id: "default", ...(patch as Prisma.SettingsUncheckedCreateInput) },
      update: patch as Prisma.SettingsUncheckedUpdateInput,
    });

    const { keywordDicts, verbDicts } = await seedDictionariesIfEmpty();
    return NextResponse.json({ settings: updated, keywordDicts, verbDicts });
  } catch (e) {
    console.error(e);
    return jsonErr(e instanceof Error ? e.message : "Failed to update settings", 500);
  }
}
