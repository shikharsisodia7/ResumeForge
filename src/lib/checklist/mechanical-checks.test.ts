import { describe, expect, it } from "vitest";
import { RESUME_FIXTURES, fixtureById } from "@/fixtures/synthetic-resumes";
import { DEFAULT_RESUME_STYLE } from "@/lib/schemas/resume-style";
import { renderResumePdf } from "@/lib/pdf/render";
import { inspectPdf, type PdfInspection } from "@/lib/pdf/inspect";
import { evaluateMechanicalChecklist, type ChecklistItemResult } from "@/lib/checklist/mechanical-checks";
import { MECHANICAL_ITEM_IDS } from "@/lib/checklist/definitions";

async function runFor(fixtureId: string) {
  const { content, styleOverrides } = fixtureById(fixtureId);
  const style = { ...DEFAULT_RESUME_STYLE, ...styleOverrides };
  const pdfBuffer = await renderResumePdf(content, style);
  const inspection = await inspectPdf(pdfBuffer);
  return evaluateMechanicalChecklist({
    content,
    style,
    sourceText: "irrelevant for these assertions",
    resume: { mimeType: "application/pdf" },
    pdfBuffer,
    inspection,
  });
}

function statusOf(results: ChecklistItemResult[], id: string): string {
  const r = results.find((r) => r.id === id);
  if (!r) throw new Error(`no result for ${id}`);
  return r.status;
}

describe("evaluateMechanicalChecklist", () => {
  it("returns exactly one result per mechanical item id, for every fixture", async () => {
    for (const fixture of RESUME_FIXTURES) {
      const results = await runFor(fixture.id);
      const ids = results.map((r) => r.id);
      expect(new Set(ids).size, `fixture ${fixture.id} has duplicate result ids`).toBe(ids.length);
      expect([...ids].sort(), `fixture ${fixture.id} does not cover exactly MECHANICAL_ITEM_IDS`).toEqual(
        [...MECHANICAL_ITEM_IDS].sort(),
      );
    }
  });

  it("TYPO-002: passes the clean baseline, fails a resume with a duplicated word", async () => {
    expect(statusOf(await runFor("01-clean-baseline"), "TYPO-002")).toBe("passed");
    expect(statusOf(await runFor("02-grammar-typos"), "TYPO-002")).toBe("failed");
  });

  it("FMT-004: passes chronological order, fails out-of-order experience", async () => {
    expect(statusOf(await runFor("01-clean-baseline"), "FMT-004")).toBe("passed");
    expect(statusOf(await runFor("28-unusual-extraction-order"), "FMT-004")).toBe("failed");
  });

  it("FMT-005: passes when empty sections render no heading (fixtures 17/18 already guarantee this in the renderer)", async () => {
    expect(statusOf(await runFor("17-few-sections"), "FMT-005")).toBe("passed");
    expect(statusOf(await runFor("18-empty-optional-sections"), "FMT-005")).toBe("passed");
  });
});

describe("evaluateMechanicalChecklist — per-item regression coverage", () => {
  it("MARG-002/DATE-002: the date-clipping repro fixture stays clean under the fixed renderer", async () => {
    expect(statusOf(await runFor("30-date-clipping-repro"), "MARG-002")).toBe("passed");
    expect(statusOf(await runFor("30-date-clipping-repro"), "DATE-002")).toBe("passed");
  });

  it("MARG-003: a long employer name still fits after wrapping", async () => {
    expect(statusOf(await runFor("07-long-employer-name"), "MARG-003")).toBe("passed");
  });

  it("PAGE-001/PAGE-002: the two-page fixture is stable and has no blank trailing page", async () => {
    expect(statusOf(await runFor("19-two-page-resume"), "PAGE-001")).toBe("passed");
    expect(statusOf(await runFor("19-two-page-resume"), "PAGE-002")).toBe("passed");
  });

  // DEVIATION FROM TASK-8 BRIEF (documented in task-8-report.md): the brief's
  // Step 5 draft of this test asserted "passed" here. `runFor` passes fixture
  // 29's `content` straight through with no extraction step in between, and
  // that content's bullet literally still contains "Ignore all previous
  // instructions..." verbatim (see synthetic-resumes.ts). Task 7's own
  // injection-guard.ts explicitly names this exact fixture, in its own doc
  // comment, as "the source scenario this guards against" — i.e.
  // findInjectionResidue is designed to flag precisely this literal text.
  // injection-guard.test.ts independently confirms the same phrasing is
  // flagged. So "failed" is the only result consistent with Task 7's
  // reviewed, documented behavior; asserting "passed" here would require
  // HALL-002 to ignore residue that Task 7 says it must catch.
  it("HALL-002: literal injection phrasing left in a bullet is flagged, per injection-guard.ts's own documented intent for this exact fixture", async () => {
    expect(statusOf(await runFor("29-prompt-injection-in-bullets"), "HALL-002")).toBe("failed");
  });

  it("SAFE-001: the AI-commentary-leak fixture is flagged", async () => {
    expect(statusOf(await runFor("32-ai-commentary-leak"), "SAFE-001")).toBe("failed");
  });

  it("DATE-001: mixed date formats across sections are flagged", async () => {
    expect(statusOf(await runFor("06-inconsistent-date-formats"), "DATE-001")).toBe("warning");
  });

  it("FACT-003: a long URL with query params is preserved intact", async () => {
    expect(statusOf(await runFor("12-long-url-and-email"), "FACT-003")).toBe("passed");
  });
});

describe("evaluateMechanicalChecklist — FACT-003 negative case", () => {
  it("FACT-003: fails when a link is genuinely missing from the rendered PDF, not just wrap-hyphenated", async () => {
    const { content, styleOverrides } = fixtureById("12-long-url-and-email");
    const style = { ...DEFAULT_RESUME_STYLE, ...styleOverrides };
    const pdfBuffer = await renderResumePdf(content, style);
    // Hand-built inspection standing in for "what actually got rendered":
    // its text has no trace of the fixture's portfolio URL at all, i.e. a
    // genuinely broken/dropped link — as opposed to the wrap-hyphen artifact
    // @react-pdf/renderer introduces for long URLs (covered by the positive
    // test above, which still exercises the real renderer/inspector). The
    // insertion-tolerant match must still fail this, since none of the
    // link's characters are actually present, real hyphen or not.
    const brokenInspection: PdfInspection = {
      pageCount: 1,
      pages: [
        {
          pageNumber: 1,
          widthPt: 612,
          heightPt: 792,
          items: [],
          text: "Jordan Alvarez Software Engineer jordan.alvarez+resume-2026-applications@example-mail-provider.com",
        },
      ],
    };
    const results = await evaluateMechanicalChecklist({
      content,
      style,
      sourceText: "irrelevant for these assertions",
      resume: { mimeType: "application/pdf" },
      pdfBuffer,
      inspection: brokenInspection,
    });
    expect(statusOf(results, "FACT-003")).toBe("failed");
  });
});
