import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureById } from "@/fixtures/synthetic-resumes";
import { AI_JUDGED_ITEM_IDS } from "@/lib/checklist/definitions";

const callStructured = vi.fn();
vi.mock("@/lib/ai/structured-call", () => ({ callStructured: (...args: unknown[]) => callStructured(...args) }));

const { evaluateAiJudgedChecklist } = await import("@/lib/checklist/evaluate-ai");

beforeEach(() => {
  callStructured.mockReset();
});

const EXPECTED_IDS = [...AI_JUDGED_ITEM_IDS].sort();

describe("evaluateAiJudgedChecklist", () => {
  it("returns one result per AI-judged item id on a well-formed response", async () => {
    callStructured.mockResolvedValue({
      items: AI_JUDGED_ITEM_IDS.map((id) => ({ id, status: "passed", detail: "Looks good." })),
    });
    const { content } = fixtureById("01-clean-baseline");
    const { items, degraded } = await evaluateAiJudgedChecklist(content, "some source text");
    // Exact id-set equality, not just a length check: a length check alone
    // can't tell "one verdict per item" apart from "a duplicated id standing
    // in for a missing one" — the bug the third test below covers.
    expect(items.map((r) => r.id).sort()).toEqual(EXPECTED_IDS);
    expect(items.every((r) => r.status === "passed")).toBe(true);
    expect(degraded).toBe(false);
  });

  it("degrades every item to a warning, without throwing, if the AI call fails", async () => {
    callStructured.mockRejectedValue(new Error("boom"));
    const { content } = fixtureById("01-clean-baseline");
    const { items, degraded } = await evaluateAiJudgedChecklist(content, "some source text");
    expect(items.map((r) => r.id).sort()).toEqual(EXPECTED_IDS);
    expect(items.every((r) => r.status === "warning")).toBe(true);
    expect(degraded).toBe(true);
  });

  it("still returns one result per id when the model duplicates an id and omits another", async () => {
    // checklistAiVerdictSchema only enforces "7 items, each id in the enum" —
    // this response satisfies it while never mentioning FACT-001.
    const duplicated = AI_JUDGED_ITEM_IDS.map((id) => ({
      id: id === "FACT-001" ? "GRAM-001" : id,
      status: "passed",
      detail: "Looks good.",
    }));
    callStructured.mockResolvedValue({ items: duplicated });
    const { content } = fixtureById("01-clean-baseline");

    const { items, degraded } = await evaluateAiJudgedChecklist(content, "some source text");

    expect(items).toHaveLength(AI_JUDGED_ITEM_IDS.length);
    expect(items.map((r) => r.id).sort()).toEqual(EXPECTED_IDS);
    const factItem = items.find((r) => r.id === "FACT-001");
    expect(factItem?.status).toBe("warning");
    // A malformed-but-schema-valid verdict is not an outage: the model did
    // answer, so this must not be reported as a degraded run.
    expect(degraded).toBe(false);
  });
});
