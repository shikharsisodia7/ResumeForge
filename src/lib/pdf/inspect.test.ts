import { describe, expect, it } from "vitest";
import { fixtureById } from "@/fixtures/synthetic-resumes";
import { DEFAULT_RESUME_STYLE } from "@/lib/schemas/resume-style";
import { renderResumePdf } from "@/lib/pdf/render";
import { inspectPdf } from "@/lib/pdf/inspect";

describe("inspectPdf — font metadata", () => {
  it("reports a fontName and a plausible fontSizePt for every text item", async () => {
    const { content } = fixtureById("01-clean-baseline");
    const buffer = await renderResumePdf(content, DEFAULT_RESUME_STYLE);
    const inspection = await inspectPdf(buffer);
    const items = inspection.pages.flatMap((p) => p.items);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.fontName.length).toBeGreaterThan(0);
      expect(item.fontSizePt).toBeGreaterThan(4);
      expect(item.fontSizePt).toBeLessThan(48);
    }
  });

  it("uses at most a handful of distinct font resources on a single page (one regular + one bold family)", async () => {
    const { content } = fixtureById("01-clean-baseline");
    const buffer = await renderResumePdf(content, DEFAULT_RESUME_STYLE);
    const inspection = await inspectPdf(buffer);
    for (const page of inspection.pages) {
      const distinctFontNames = new Set(page.items.map((i) => i.fontName));
      // Empirically calibrated ceiling. Real observed counts via pdf.js
      // internal font-resource ids (e.g. "g_d1_f1"): fixture
      // "01-clean-baseline" page 1 = 3; fixture "19-two-page-resume" page 1
      // = 3, page 2 = 2. The guessed ceiling of 4 already covers the real
      // max (3) with one item of headroom, so it is left as-is rather than
      // tightened or loosened. If this ever fails, log
      // distinctFontNames.size here against fixtures 01 and 19 and raise
      // the ceiling to the new observed number — see Task 8 Step 1 note.
      expect(distinctFontNames.size).toBeLessThanOrEqual(4);
    }
  });
});
