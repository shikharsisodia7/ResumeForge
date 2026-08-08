import { expect, test } from "@playwright/test";
import { RESUME_FIXTURES } from "@/fixtures/synthetic-resumes";

/**
 * Real-Chromium layout regression tests for the browser preview, run
 * against the unauthenticated test-fixture route (src/app/__test-fixtures__)
 * — never reachable in production, only under Playwright's own webServer
 * (see playwright.config.ts ALLOW_TEST_FIXTURES).
 *
 * These complement src/lib/pdf/render.test.ts, which checks the same class
 * of bug (right-edge overflow) in the actual downloaded PDF. Together they
 * cover both places a resume is ever actually rendered.
 */

const RIGHT_EDGE_TOLERANCE_PX = 1;

test.describe("document preview — right-edge safety (date-clipping regression)", () => {
  for (const fixture of RESUME_FIXTURES) {
    test(`fixture ${fixture.id}: no entry-header text overflows the page`, async ({ page }) => {
      await page.goto(`/dev-preview-fixture/${fixture.id}`);
      const paper = page.locator(".paper");
      await expect(paper).toBeVisible();
      const paperBox = await paper.boundingBox();
      expect(paperBox).not.toBeNull();
      if (!paperBox) return;
      const safeRightEdge = paperBox.x + paperBox.width;

      // Every date/right-aligned metadata span in an entry header row.
      const dateSpans = paper.locator(".shrink-0.whitespace-nowrap");
      const count = await dateSpans.count();
      for (let i = 0; i < count; i++) {
        const box = await dateSpans.nth(i).boundingBox();
        if (!box) continue;
        expect(
          box.x + box.width,
          `fixture ${fixture.id} date span "${await dateSpans.nth(i).innerText()}" overflows the page`,
        ).toBeLessThanOrEqual(safeRightEdge + RIGHT_EDGE_TOLERANCE_PX);
      }

      // No element anywhere in the paper should force it to scroll horizontally.
      const scrollWidth = await paper.evaluate((el) => el.scrollWidth);
      const clientWidth = await paper.evaluate((el) => el.clientWidth);
      expect(scrollWidth, `fixture ${fixture.id} paper has horizontal overflow`).toBeLessThanOrEqual(
        clientWidth + RIGHT_EDGE_TOLERANCE_PX,
      );
    });
  }
});

test.describe("document preview — print isolation", () => {
  test("print media hides app chrome and isolates .paper", async ({ page }) => {
    await page.goto(`/dev-preview-fixture/01-clean-baseline`);
    await page.emulateMedia({ media: "print" });

    const paper = page.locator(".paper");
    await expect(paper).toBeVisible();
    const boxShadow = await paper.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(boxShadow).toBe("none");

    const wrapper = page.locator(".paper").locator("xpath=..");
    const wrapperVisibility = await wrapper.evaluate((el) => getComputedStyle(el).visibility);
    // The wrapper is an ancestor, not .paper itself — it should be hidden by
    // the `body * { visibility: hidden }` print rule while .paper stays visible.
    expect(wrapperVisibility).toBe("hidden");
  });

  test("print stylesheet actually engages (position/offset only exist under @media print)", async ({ page }) => {
    await page.goto(`/dev-preview-fixture/01-clean-baseline`);

    // Before emulating print, the inline-styled .paper is a normal static-flow block.
    const screenPosition = await page.locator(".paper").evaluate((el) => getComputedStyle(el).position);
    expect(screenPosition).toBe("static");

    await page.emulateMedia({ media: "print" });
    const printPosition = await page.locator(".paper").evaluate((el) => getComputedStyle(el).position);
    expect(printPosition).toBe("absolute");
    const printTop = await page.locator(".paper").evaluate((el) => getComputedStyle(el).top);
    expect(printTop).toBe("0px");
  });

  test("A4 fixtures set the correct data-page-size for the print stylesheet", async ({ page }) => {
    await page.goto(`/dev-preview-fixture/01-clean-baseline`);
    const dataPageSize = await page.locator(".paper").getAttribute("data-page-size");
    expect(dataPageSize).toBe("letter");
  });
});
