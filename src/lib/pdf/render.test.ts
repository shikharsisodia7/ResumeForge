import { describe, expect, it } from "vitest";
import { RESUME_FIXTURES, fixtureById } from "@/fixtures/synthetic-resumes";
import { DEFAULT_RESUME_STYLE } from "@/lib/schemas/resume-style";
import { marginPt, pageSizePt } from "@/lib/pdf/layout";
import { inspectPdf } from "@/lib/pdf/inspect";
import { renderResumePdf } from "@/lib/pdf/render";

/**
 * Right-edge safety tolerance in PDF points. A small allowance for
 * sub-pixel/font-metric rounding — NOT a license to clip content; anything
 * beyond this is a real overflow.
 */
const RIGHT_EDGE_TOLERANCE_PT = 1;

describe("renderResumePdf — page count", () => {
  it("renders the clean baseline as exactly one page", async () => {
    const { content } = fixtureById("01-clean-baseline");
    const buffer = await renderResumePdf(content, DEFAULT_RESUME_STYLE);
    const inspection = await inspectPdf(buffer);
    expect(inspection.pageCount).toBe(1);
  });

  it("renders the two-page fixture as exactly two pages", async () => {
    const { content } = fixtureById("19-two-page-resume");
    const buffer = await renderResumePdf(content, DEFAULT_RESUME_STYLE);
    const inspection = await inspectPdf(buffer);
    expect(inspection.pageCount).toBe(2);
  });

  it("agrees with each fixture's expectedPageCount", async () => {
    const mismatches: string[] = [];
    for (const fixture of RESUME_FIXTURES) {
      if (fixture.expect.expectedPageCount === undefined) continue;
      const style = { ...DEFAULT_RESUME_STYLE, ...fixture.styleOverrides };
      const buffer = await renderResumePdf(fixture.content, style);
      const inspection = await inspectPdf(buffer);
      if (inspection.pageCount !== fixture.expect.expectedPageCount) {
        mismatches.push(`fixture ${fixture.id}: expected ${fixture.expect.expectedPageCount}, got ${inspection.pageCount}`);
      }
    }
    expect(mismatches, mismatches.join("\n")).toEqual([]);
  });

  it("does not leave a blank trailing page for the one-line-too-long fixture", async () => {
    const { content } = fixtureById("21-one-line-too-long-for-one-page");
    const buffer = await renderResumePdf(content, DEFAULT_RESUME_STYLE);
    const inspection = await inspectPdf(buffer);
    const lastPage = inspection.pages[inspection.pages.length - 1];
    expect(lastPage.items.length).toBeGreaterThan(0);
  });
});

describe("renderResumePdf — right-edge safety (date-clipping regression)", () => {
  it("keeps every text item's right edge within the printable content area for every fixture", async () => {
    const violations: string[] = [];
    for (const fixture of RESUME_FIXTURES) {
      const style = { ...DEFAULT_RESUME_STYLE, ...fixture.styleOverrides };
      const size = pageSizePt(style);
      const margin = marginPt(style);
      const safeRightEdge = size.width - margin;

      const buffer = await renderResumePdf(fixture.content, style);
      const inspection = await inspectPdf(buffer);

      for (const page of inspection.pages) {
        for (const item of page.items) {
          const rightEdge = item.x + item.width;
          if (rightEdge > safeRightEdge + RIGHT_EDGE_TOLERANCE_PT) {
            violations.push(
              `fixture ${fixture.id} page ${page.pageNumber}: "${item.text}" right edge ${rightEdge.toFixed(1)}pt ` +
                `exceeds safe content width ${safeRightEdge.toFixed(1)}pt`,
            );
          }
        }
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps the full 'September 2023 – Present' date visible for the targeted repro fixture", async () => {
    const { content, styleOverrides } = fixtureById("30-date-clipping-repro");
    const style = { ...DEFAULT_RESUME_STYLE, ...styleOverrides };
    const size = pageSizePt(style);
    const margin = marginPt(style);
    const safeRightEdge = size.width - margin;

    const buffer = await renderResumePdf(content, style);
    const inspection = await inspectPdf(buffer);
    const fullText = inspection.pages.map((p) => p.text).join(" ");
    expect(fullText).toContain("Present");

    const dateItems = inspection.pages
      .flatMap((p) => p.items)
      .filter((item) => /September 2023|Present/.test(item.text));
    expect(dateItems.length).toBeGreaterThan(0);
    for (const item of dateItems) {
      expect(item.x + item.width).toBeLessThanOrEqual(safeRightEdge + RIGHT_EDGE_TOLERANCE_PT);
    }
  });
});

describe("renderResumePdf — page-count agreement across margin/page-size combinations", () => {
  it("stays a single page for the pagination-boundary fixture regardless of page size", async () => {
    const { content } = fixtureById("31-pagination-boundary-repro");
    for (const pageSize of ["letter", "a4"] as const) {
      const style = { ...DEFAULT_RESUME_STYLE, pageSize };
      const buffer = await renderResumePdf(content, style);
      const inspection = await inspectPdf(buffer);
      expect(inspection.pageCount, `pageSize ${pageSize}`).toBe(1);
    }
  });
});
