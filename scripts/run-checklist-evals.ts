// scripts/run-checklist-evals.ts
// Opt-in live-AI evaluation for the checklist's AI-judged items. Never run
// automatically — see .github/workflows/ai-evals.yml. Requires a funded
// OPENAI_API_KEY and RUN_AI_EVALS=true, matching scripts/run-ai-evals.ts.
import "dotenv/config";
import { runExtraction } from "@/lib/ai/extraction";
import { runChecklistEvaluation } from "@/lib/checklist/evaluate";
import { DEFAULT_RESUME_STYLE } from "@/lib/schemas/resume-style";
import { SOURCE_TEXT_FIXTURES } from "@/fixtures/source-text-fixtures";

async function main() {
  if (process.env.RUN_AI_EVALS !== "true") {
    console.error("RUN_AI_EVALS is not 'true' — refusing to spend live API credits. Set RUN_AI_EVALS=true to proceed.");
    process.exit(1);
  }

  let failures = 0;
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
    if (evaluation.overallStatus === "failed") failures += 1;
  }

  if (failures > 0) {
    console.error(`\n${failures} fixture(s) had a failed checklist item.`);
    process.exit(1);
  }
  console.log("\nAll fixtures passed the live checklist evaluation.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
