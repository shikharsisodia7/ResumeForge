import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { RESUME_FIXTURES } from "@/fixtures/synthetic-resumes";

/**
 * Automated WCAG 2.x A/AA checks (axe-core) against every page reachable
 * without a real, live-configured Auth0 session — the landing page, and the
 * document-preview component via the dev-only fixture route (see
 * playwright.config.ts / ALLOW_TEST_FIXTURES). The rest of the app
 * (dashboard, upload, editor, gallery, prompts) sits behind real
 * authentication and was reviewed statically instead — see
 * docs/resume-formatting-audit.md ISSUE-16.
 */

test("landing page has no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("document preview has no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto(`/dev-preview-fixture/${RESUME_FIXTURES[0].id}`);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
