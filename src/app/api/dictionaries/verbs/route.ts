import { prisma } from "@/lib/db";
import { toJson } from "@/lib/utils";
import { bad, ok } from "@/lib/api-json";

export async function PATCH(req: Request) {
  const body = (await req.json()) as { type: "strong" | "weak"; verbs: string[] };
  if (!body.type || !Array.isArray(body.verbs)) return bad("type and verbs[] required");

  const row = await prisma.actionVerbDictionary.upsert({
    where: { type: body.type },
    create: { type: body.type, verbs: toJson(body.verbs) },
    update: { verbs: toJson(body.verbs) },
  });
  return ok(row);
}
