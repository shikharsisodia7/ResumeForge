import { buildResumeContentFromVersion } from "@/lib/services/resume-content";
import { bad, ok } from "@/lib/api-json";

export async function POST(req: Request) {
  const body = (await req.json()) as { leftVersionId: string; rightVersionId: string };

  const [left, right] = await Promise.all([
    buildResumeContentFromVersion(body.leftVersionId),
    buildResumeContentFromVersion(body.rightVersionId),
  ]);
  if (!left || !right) return bad("Both versions required", 404);

  const l = normalize(left.plainText);
  const r = normalize(right.plainText);
  const lLines = new Set(l.split("\n"));
  const rLines = new Set(r.split("\n"));

  const onlyLeft = [...lLines].filter((line) => !rLines.has(line) && line.length > 2);
  const onlyRight = [...rLines].filter((line) => !lLines.has(line) && line.length > 2);

  const tokenOverlap = overlapTokens(l, r);

  return ok({
    leftSummary: summarize(left.profile.fullName, left),
    rightSummary: summarize(right.profile.fullName, right),
    overlapScore: Math.round(tokenOverlap * 100),
    onlyLeft: onlyLeft.slice(0, 40),
    onlyRight: onlyRight.slice(0, 40),
  });
}

function normalize(t: string) {
  return t.toLowerCase().replace(/\s+/g, "\n").trim();
}

function summarize(name: string, content: NonNullable<Awaited<ReturnType<typeof buildResumeContentFromVersion>>>) {
  return {
    name,
    bullets: content.bulletTexts.length,
    skills: content.skillNames.length,
    sections: content.sections.length,
  };
}

function overlapTokens(a: string, b: string) {
  const ta = new Set(a.split(/[^a-z0-9+.#]+/).filter((w) => w.length > 2));
  const tb = new Set(b.split(/[^a-z0-9+.#]+/).filter((w) => w.length > 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((w) => {
    if (tb.has(w)) inter++;
  });
  return inter / Math.min(ta.size, tb.size);
}
