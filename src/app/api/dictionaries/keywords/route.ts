import { prisma } from "@/lib/db";
import { toJson } from "@/lib/utils";
import { bad, ok } from "@/lib/api-json";

export async function PATCH(req: Request) {
  const body = (await req.json()) as {
    category: string;
    terms: string[];
  };
  if (!body.category?.trim() || !Array.isArray(body.terms)) return bad("category and terms[] required");

  const row = await prisma.keywordDictionary.upsert({
    where: { category: body.category.trim() },
    create: { category: body.category.trim(), terms: toJson(body.terms) },
    update: { terms: toJson(body.terms) },
  });
  return ok(row);
}
