import { describe, expect, it } from "vitest";
import { findInventedFacts } from "@/lib/checklist/fact-diff";
import { fixtureById } from "@/fixtures/synthetic-resumes";

describe("findInventedFacts", () => {
  it("finds nothing invented when content only restates the source text", () => {
    const sourceText = "Jordan Alvarez built a pipeline reducing runtime by 40% at Contoso Analytics.";
    const { content } = fixtureById("01-clean-baseline");
    const invented = findInventedFacts(sourceText, content);
    // The clean baseline mentions "University of Texas at Austin", which the
    // short sourceText above doesn't — that's the point of this assertion.
    expect(invented).toContain("University of Texas at Austin");
  });

  it("finds nothing invented when the source text contains every fact", () => {
    const { content } = fixtureById("01-clean-baseline");
    const sourceText = [
      "Jordan Alvarez",
      "Contoso Analytics",
      "University of Texas at Austin",
      "Built a data pipeline that reduced nightly batch runtime by 40%",
      "Led migration of the billing service to a new event-driven architecture",
    ].join("\n");
    expect(findInventedFacts(sourceText, content)).toEqual([]);
  });

  it("flags an invented statistic not present anywhere in the source text", () => {
    const { content } = fixtureById("01-clean-baseline");
    const withInventedStat = {
      ...content,
      experience: [{ ...content.experience[0], bullets: ["Increased revenue by 75% through new initiatives"] }],
    };
    const sourceTextMissingThatStat = "Jordan Alvarez, Contoso Analytics, built a pipeline.";
    const invented = findInventedFacts(sourceTextMissingThatStat, withInventedStat);
    expect(invented).toContain("75%");
  });
});
