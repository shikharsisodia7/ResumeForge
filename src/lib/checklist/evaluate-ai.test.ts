import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureById } from "@/fixtures/synthetic-resumes";
import { AI_JUDGED_ITEM_IDS } from "@/lib/checklist/definitions";

const callStructured = vi.fn();
vi.mock("@/lib/ai/structured-call", () => ({ callStructured: (...args: unknown[]) => callStructured(...args) }));

const { evaluateAiJudgedChecklist } = await import("@/lib/checklist/evaluate-ai");

beforeEach(() => {
  callStructured.mockReset();
});

describe("evaluateAiJudgedChecklist", () => {
  it("returns one result per AI-judged item id on a well-formed response", async () => {
    callStructured.mockResolvedValue({
      items: AI_JUDGED_ITEM_IDS.map((id) => ({ id, status: "passed", detail: "Looks good." })),
    });
    const { content } = fixtureById("01-clean-baseline");
    const results = await evaluateAiJudgedChecklist(content, "some source text");
    expect(results).toHaveLength(AI_JUDGED_ITEM_IDS.length);
    expect(results.every((r) => r.status === "passed")).toBe(true);
  });

  it("degrades every item to a warning, without throwing, if the AI call fails", async () => {
    callStructured.mockRejectedValue(new Error("boom"));
    const { content } = fixtureById("01-clean-baseline");
    const results = await evaluateAiJudgedChecklist(content, "some source text");
    expect(results).toHaveLength(AI_JUDGED_ITEM_IDS.length);
    expect(results.every((r) => r.status === "warning")).toBe(true);
  });
});
