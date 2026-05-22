import { prisma } from "@/lib/db";
import { analyzeJobDescription } from "@/lib/engines/text-analysis";
import { parseJson, toJson } from "@/lib/utils";
import type { JobTextAnalysis } from "@/lib/types";
import { bad, ok } from "@/lib/api-json";

/** Generate or overwrite interview prep scaffold from linked job JD keywords */
export async function POST(req: Request) {
  const body = (await req.json()) as { applicationId: string };
  if (!body.applicationId) return bad("applicationId required");

  const application = await prisma.application.findUnique({
    where: { id: body.applicationId },
    include: { jobDescription: true },
  });
  if (!application) return bad("Application not found", 404);
  const jd = application.jobDescription;
  const analysis =
    jd?.descriptionText && jd.descriptionText.trim().length
      ? jd.extractedKeywords
        ? (parseJson<JobTextAnalysis | null>(jd.extractedKeywords, null) ??
          analyzeJobDescription(jd.descriptionText, jd.title, jd.category))
        : analyzeJobDescription(jd.descriptionText, jd.title, jd.category)
      : null;

  const keywords = analysis?.rankedKeywords?.slice(0, 35).map((k) => k.term).join(", ") ?? "";

  const likelyTopics =
    analysis?.themes?.slice(0, 8).join("; ") ??
    analysis?.hardSkills.slice(0, 8).join(", ") ??
    "Align stories to role responsibilities listed in JD";

  const row = await prisma.interviewPrep.upsert({
    where: { applicationId: application.id },
    create: {
      applicationId: application.id,
      keywords,
      likelyTopics,
      weakAreas:
        keywords.length === 0
          ? "No job description keywords — paste JD on the application record."
          : "Practice explaining tradeoffs behind your strongest projects.",
      questionsToAsk: "Team structure? Success metrics first 90 days? Tech stack roadmap?",
      projectsToDiscuss: "Pick 2 flagship projects aligned to tools mentioned in JD.",
      experiencesToDiscuss: "Prepare 90-second stories per role emphasizing outcomes.",
      skillsToHighlight: analysis?.hardSkills.slice(0, 12).join(", ") ?? "",
      prepData: analysis ? jd?.extractedKeywords ?? toJson(analysis) : "{}",
    },
    update: {
      keywords,
      likelyTopics,
      skillsToHighlight: analysis?.hardSkills.slice(0, 12).join(", ") ?? "",
      prepData: analysis ? jd?.extractedKeywords ?? toJson(analysis) : "{}",
    },
  });

  return ok(row);
}
