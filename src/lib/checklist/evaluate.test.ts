import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureById } from "@/fixtures/synthetic-resumes";
import { DEFAULT_RESUME_STYLE } from "@/lib/schemas/resume-style";
import { CHECKLIST_ITEMS } from "@/lib/checklist/definitions";

const callStructured = vi.fn();
vi.mock("@/lib/ai/structured-call", () => ({ callStructured: (...args: unknown[]) => callStructured(...args) }));

const { runChecklistEvaluation } = await import("@/lib/checklist/evaluate");

beforeEach(() => {
  callStructured.mockReset();
  callStructured.mockResolvedValue({
    items: CHECKLIST_ITEMS.filter((i) => i.kind === "ai").map((i) => ({ id: i.id, status: "passed", detail: "OK" })),
  });
});

describe("runChecklistEvaluation", () => {
  it("returns exactly one result per checklist definition, each carrying its category/label", async () => {
    const { content } = fixtureById("01-clean-baseline");
    const result = await runChecklistEvaluation({
      content,
      style: DEFAULT_RESUME_STYLE,
      sourceText: "Jordan Alvarez, Contoso Analytics, University of Texas at Austin, 40%",
      resume: { mimeType: "application/pdf" },
    });
    expect(result.items).toHaveLength(CHECKLIST_ITEMS.length);
    for (const item of result.items) {
      expect(item.category).toBeTruthy();
      expect(item.label).toBeTruthy();
    }
  });

  it("sets overallStatus to failed if any item failed, else warning if any warned, else passed", async () => {
    const { content } = fixtureById("29-prompt-injection-in-bullets");
    const result = await runChecklistEvaluation({
      content,
      style: DEFAULT_RESUME_STYLE,
      sourceText: "irrelevant",
      resume: { mimeType: "application/pdf" },
    });
    const anyFailed = result.items.some((i) => i.status === "failed");
    const anyWarning = result.items.some((i) => i.status === "warning");
    expect(result.overallStatus).toBe(anyFailed ? "failed" : anyWarning ? "warning" : "passed");
  });
});
