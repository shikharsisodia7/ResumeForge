import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SAMPLE_RUN = {
  run: {
    id: "run-1",
    versionId: "fixture-version",
    overallStatus: "warning",
    createdAt: new Date().toISOString(),
    resultsJson: [
      { id: "TYPO-002", category: "typos", label: "Duplicate words", status: "passed", detail: "No repeated words found." },
      { id: "DATE-001", category: "dates", label: "Consistent date format", status: "warning", detail: "Mixed date formats found: numeric, full-word" },
      { id: "MARG-002", category: "margins", label: "No clipped text", status: "failed", detail: "1 text item exceeds the safe content width." },
    ],
  },
};

test.describe("checklist panel", () => {
  test("running the check reveals categories with real result statuses", async ({ page }) => {
    await page.route("**/api/versions/fixture-version/checklist", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: { run: null } });
      }
      return route.fulfill({ json: SAMPLE_RUN });
    });

    await page.goto("/dev-checklist-fixture");
    await page.getByRole("button", { name: "Run resume check" }).click();

    // Scoped to the visible Badge span, not the sr-only role="status" live
    // region that duplicates the same text — page.getByText alone matches
    // both and trips Playwright's strict-mode check.
    await expect(page.locator("span").filter({ hasText: /Resume check complete/ })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Typos")).toBeVisible();
    await expect(page.getByText("Dates")).toBeVisible();
    await expect(page.getByText("Margins")).toBeVisible();
  });

  test("category rows expand and collapse via keyboard", async ({ page }) => {
    await page.route("**/api/versions/fixture-version/checklist", (route) =>
      route.fulfill({ json: route.request().method() === "GET" ? { run: null } : SAMPLE_RUN }),
    );
    await page.goto("/dev-checklist-fixture");
    await page.getByRole("button", { name: "Run resume check" }).click();
    await expect(page.locator("span").filter({ hasText: /Resume check complete/ })).toBeVisible({ timeout: 5000 });

    const summary = page.locator("summary", { hasText: "Margins" });
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("1 text item exceeds the safe content width.")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByText("1 text item exceeds the safe content width.")).toBeHidden();
  });

  test("has zero automated accessibility violations", async ({ page }) => {
    await page.route("**/api/versions/fixture-version/checklist", (route) =>
      route.fulfill({ json: route.request().method() === "GET" ? { run: null } : SAMPLE_RUN }),
    );
    await page.goto("/dev-checklist-fixture");
    await page.getByRole("button", { name: "Run resume check" }).click();
    await expect(page.locator("span").filter({ hasText: /Resume check complete/ })).toBeVisible({ timeout: 5000 });

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
