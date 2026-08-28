// scripts/run-checklist-evals.ts
// Opt-in live-AI evaluation for the checklist's AI-judged items. Never run
// automatically — see .github/workflows/ai-evals.yml. Requires a funded
// OPENAI_API_KEY and RUN_AI_EVALS=true, matching scripts/run-ai-evals.ts.
import { config as loadEnv } from "dotenv";

// Next's dev/build/start commands load .env then .env.local automatically;
// a standalone tsx script does not, so OPENAI_API_KEY etc. would otherwise
// silently be undefined here even though the app itself is fully configured.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { runExtraction } from "@/lib/ai/extraction";
import { runChecklistEvaluation } from "@/lib/checklist/evaluate";
import { DEFAULT_RESUME_STYLE } from "@/lib/schemas/resume-style";
import { SOURCE_TEXT_FIXTURES } from "@/fixtures/source-text-fixtures";

async function main() {
  if (process.env.RUN_AI_EVALS !== "true") {
    console.log("RUN_AI_EVALS is not 'true' — refusing to spend live API credits. Set RUN_AI_EVALS=true to proceed.");
    process.exit(0);
  }

  let failures = 0;
  let aiDegradedCount = 0;
  for (const fixture of SOURCE_TEXT_FIXTURES) {
    console.log(`\n=== ${fixture.id}: ${fixture.description} ===`);
    const content = await runExtraction(fixture.sourceText);
    const evaluation = await runChecklistEvaluation({
      content,
      style: DEFAULT_RESUME_STYLE,
      sourceText: fixture.sourceText,
      resume: { mimeType: "text/plain" },
    });
    console.log(`Overall: ${evaluation.overallStatus}`);
    for (const item of evaluation.items) {
      if (item.status !== "passed") console.log(`  ${item.status.toUpperCase()} ${item.id}: ${item.detail}`);
    }
    // A total AI outage (bad key, no credits, rate limit) degrades all seven
    // AI-judged items to warnings, so overallStatus becomes "warning" — never
    // "failed". Without this check the whole point of a *live* eval run (that
    // the model actually answered) would silently go unverified, and the
    // script would print "All fixtures passed" having never reached the model.
    if (evaluation.aiDegraded) {
      console.error(`  AI DEGRADED — the live model call failed for ${fixture.id}; all AI-judged items fell back to warnings.`);
      aiDegradedCount += 1;
    }
    if (evaluation.overallStatus === "failed" || evaluation.aiDegraded) failures += 1;
  }

  if (failures > 0) {
    console.error(`\n${failures} fixture(s) had a failed checklist item or a degraded AI call (${aiDegradedCount} AI-degraded).`);
    process.exit(1);
  }
  console.log("\nAll fixtures passed the live checklist evaluation.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
