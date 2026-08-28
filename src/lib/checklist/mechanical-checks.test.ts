import { describe, expect, it } from "vitest";
import { RESUME_FIXTURES, fixtureById } from "@/fixtures/synthetic-resumes";
import { DEFAULT_RESUME_STYLE } from "@/lib/schemas/resume-style";
import { renderResumePdf } from "@/lib/pdf/render";
import { inspectPdf, type PdfInspection } from "@/lib/pdf/inspect";
import { evaluateMechanicalChecklist, type ChecklistItemResult } from "@/lib/checklist/mechanical-checks";
import { MECHANICAL_ITEM_IDS } from "@/lib/checklist/definitions";
import type { ResumeContent } from "@/lib/schemas/resume-content";

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

describe("evaluateMechanicalChecklist — SAFE-003 mojibake", () => {
  // Every character below is written as an escape on purpose: these strings
  // are literally look-alike glyphs, so a literal here would be invisible to
  // review and one careless re-encode of this file would silently neuter the
  // test. The values are what real UTF-8 bytes look like once they have been
  // re-decoded as CP1252 - the exact corruption SAFE-003 exists to catch.

  // U+2019 (right single quote) is UTF-8 E2 80 99; read back as CP1252 that
  // is U+00E2 U+20AC U+2122. This is the single most common mojibake in real
  // resume text, and the pre-fix regex did not match it.
  const MOJIBAKE_SMART_QUOTE = "Owned the platform team\u00E2\u20AC\u2122s billing migration.";
  // U+00E9 is UTF-8 C3 A9; read back as CP1252 that is U+00C3 U+00A9.
  const MOJIBAKE_ACCENT = "Partnered with Jos\u00C3\u00A9 Ramirez on quarterly forecasting.";
  // The same two sentences, correctly encoded, plus a real en dash.
  const CLEAN_UNICODE = "Partnered with Jos\u00E9 Ram\u00EDrez on the team\u2019s 2024\u20132025 roadmap.";

  async function safe003ForSummary(summary: string): Promise<string> {
    const { content, styleOverrides } = fixtureById("01-clean-baseline");
    const style = { ...DEFAULT_RESUME_STYLE, ...styleOverrides };
    const mutated: ResumeContent = { ...content, summary };
    const pdfBuffer = await renderResumePdf(mutated, style);
    const inspection = await inspectPdf(pdfBuffer);
    const results = await evaluateMechanicalChecklist({
      content: mutated,
      style,
      sourceText: "irrelevant for these assertions",
      resume: { mimeType: "application/pdf" },
      pdfBuffer,
      inspection,
    });
    return statusOf(results, "SAFE-003");
  }

  it("SAFE-003: fails on CP1252-mangled smart-quote mojibake", async () => {
    expect(await safe003ForSummary(MOJIBAKE_SMART_QUOTE)).toBe("failed");
  });

  it("SAFE-003: fails on a CP1252-mangled accented character", async () => {
    expect(await safe003ForSummary(MOJIBAKE_ACCENT)).toBe("failed");
  });

  it("SAFE-003: still passes clean, correctly-encoded accents, smart quotes and dashes", async () => {
    expect(await safe003ForSummary(CLEAN_UNICODE)).toBe("passed");
  });
});
