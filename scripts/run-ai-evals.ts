/**
 * Live-model evaluation harness for the resume-extraction pipeline.
 *
 * Runs SOURCE_TEXT_FIXTURES through the *real* production extraction prompt
 * (a live OpenAI call, via the same runExtraction() the /upload route uses)
 * and scores the result against each fixture's expectations. This is
 * intentionally separate from `npm run test`: it costs real API tokens and
 * must never run in CI, on every commit, or during a normal build.
 *
 * Gated behind RUN_AI_EVALS=true — running `tsx scripts/run-ai-evals.ts`
 * (or `npm run test:ai-evals`) without that env var exits immediately with
 * no API calls made, so it's safe to invoke by accident.
 *
 * Never logs full resume content or secrets — only fixture ids, pass/fail,
 * and short violation summaries.
 */
import { SOURCE_TEXT_FIXTURES } from "../src/fixtures/source-text-fixtures";
import { runExtraction } from "../src/lib/ai/extraction";
import { DEFAULT_RESUME_STYLE } from "../src/lib/schemas/resume-style";
import { marginPt, pageSizePt } from "../src/lib/pdf/layout";
import { inspectPdf } from "../src/lib/pdf/inspect";
import { renderResumePdf } from "../src/lib/pdf/render";
import type { ResumeContent } from "../src/lib/schemas/resume-content";

const RIGHT_EDGE_TOLERANCE_PT = 1;

function flattenText(content: ResumeContent): string {
  const parts: string[] = [content.basics.fullName, content.summary ?? ""];
  for (const e of content.experience) parts.push(e.title, e.organization, ...e.bullets);
  for (const e of content.education) parts.push(e.institution, e.degree ?? "", e.fieldOfStudy ?? "", ...e.highlights);
  for (const p of content.projects) parts.push(p.name, ...p.bullets);
  for (const c of content.certifications) parts.push(c.name);
  for (const a of content.awards) parts.push(a.title, a.description ?? "");
  for (const s of content.skills) parts.push(...s.items);
  for (const s of content.additional) parts.push(s.title, ...s.items);
  return parts.join(" \n ");
}

interface FixtureResult {
  id: string;
  schemaValid: boolean;
  missingFacts: string[];
  hallucinations: string[];
  clippingViolations: string[];
  modelError: string | null;
}

async function evaluateFixture(fixture: (typeof SOURCE_TEXT_FIXTURES)[number]): Promise<FixtureResult> {
  const result: FixtureResult = {
    id: fixture.id,
    schemaValid: false,
    missingFacts: [],
    hallucinations: [],
    clippingViolations: [],
    modelError: null,
  };

  let content: ResumeContent;
  try {
    content = await runExtraction(fixture.sourceText);
    result.schemaValid = true;
  } catch (error) {
    result.modelError = error instanceof Error ? error.message : String(error);
    return result;
  }

  const text = flattenText(content).toLowerCase();
  for (const fact of fixture.requiredFacts) {
    if (!text.includes(fact.toLowerCase())) result.missingFacts.push(fact);
  }
  for (const forbidden of fixture.forbiddenFacts) {
    if (text.includes(forbidden.toLowerCase())) result.hallucinations.push(forbidden);
  }

  try {
    const buffer = await renderResumePdf(content, DEFAULT_RESUME_STYLE);
    const inspection = await inspectPdf(buffer);
    const size = pageSizePt(DEFAULT_RESUME_STYLE);
    const margin = marginPt(DEFAULT_RESUME_STYLE);
    const safeRightEdge = size.width - margin;
    for (const page of inspection.pages) {
      for (const item of page.items) {
        if (item.x + item.width > safeRightEdge + RIGHT_EDGE_TOLERANCE_PT) {
          result.clippingViolations.push(`"${item.text}" on page ${page.pageNumber}`);
        }
      }
    }
  } catch (error) {
    result.clippingViolations.push(`PDF render failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

async function main() {
  if (process.env.RUN_AI_EVALS !== "true") {
    console.log(
      "[ai-evals] Skipped — set RUN_AI_EVALS=true to run this suite. It makes real OpenAI API calls " +
        "and is never run automatically by `npm test`, CI, or `npm run build`.",
    );
    process.exit(0);
  }

  console.log(`[ai-evals] Running ${SOURCE_TEXT_FIXTURES.length} fixtures against the live extraction prompt...\n`);

  const results: FixtureResult[] = [];
  for (const fixture of SOURCE_TEXT_FIXTURES) {
    process.stdout.write(`  ${fixture.id} ... `);
    const result = await evaluateFixture(fixture);
    results.push(result);
    const ok = result.schemaValid && result.missingFacts.length === 0 && result.hallucinations.length === 0 && result.clippingViolations.length === 0;
    console.log(ok ? "PASS" : "FAIL");
    if (!ok) {
      if (result.modelError) console.log(`      model error: ${result.modelError}`);
      if (result.missingFacts.length) console.log(`      missing facts: ${result.missingFacts.join(", ")}`);
      if (result.hallucinations.length) console.log(`      hallucinations: ${result.hallucinations.join(", ")}`);
      if (result.clippingViolations.length) console.log(`      clipping: ${result.clippingViolations.join(", ")}`);
    }
  }

  const total = results.length;
  const schemaValidCount = results.filter((r) => r.schemaValid).length;
  const factPreservedCount = results.filter((r) => r.missingFacts.length === 0).length;
  const hallucinationCount = results.reduce((sum, r) => sum + r.hallucinations.length, 0);
  const clippingCount = results.reduce((sum, r) => sum + r.clippingViolations.length, 0);
  const modelErrorCount = results.filter((r) => r.modelError).length;

  console.log("\n[ai-evals] Summary");
  console.log(`  schema-valid rate:      ${schemaValidCount}/${total}`);
  console.log(`  fact-preservation rate: ${factPreservedCount}/${total}`);
  console.log(`  hallucination count:    ${hallucinationCount}`);
  console.log(`  clipping violations:    ${clippingCount}`);
  console.log(`  model errors:           ${modelErrorCount}`);

  // Explicit pass/fail thresholds — not a subjective "looks good" read.
  const passed = schemaValidCount === total && factPreservedCount === total && hallucinationCount === 0 && clippingCount === 0;
  console.log(`\n[ai-evals] ${passed ? "PASSED" : "FAILED"}`);
  process.exit(passed ? 0 : 1);
}

main().catch((error) => {
  console.error("[ai-evals] harness crashed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
