import { expect, test } from "@playwright/test";

/**
 * These cover what's genuinely testable without live Auth0/Postgres/OpenAI
 * credentials: that the landing page renders for signed-out visitors, and
 * that every protected route actually enforces authentication. A full
 * upload → format → customize → PDF happy path requires real provider
 * credentials — see README for running that manually against a configured
 * environment.
 */

test("landing page shows sign-up and log-in calls to action when signed out", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /turn any resume into/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign up/i })).toBeVisible();
});

test("visiting the dashboard while signed out redirects to Auth0 login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/login/);
});

test("visiting the editor while signed out redirects to Auth0 login", async ({ page }) => {
  await page.goto("/editor/some-version-id");
  await expect(page).toHaveURL(/\/auth\/login/);
});

test("the public prompt gallery API rejects unauthenticated requests", async ({ request }) => {
  const res = await request.get("/api/gallery/prompts");
  expect(res.status()).toBe(401);
});
