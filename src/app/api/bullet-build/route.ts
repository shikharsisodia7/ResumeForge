import { generateBulletsFromFields } from "@/lib/engines/bullet-builder";
import { ok } from "@/lib/api-json";

export async function POST(req: Request) {
  const body = (await req.json()) as import("@/lib/engines/bullet-builder").BulletBuilderFields & { role?: string };
  const drafts = generateBulletsFromFields(body);
  return ok({ drafts });
}
