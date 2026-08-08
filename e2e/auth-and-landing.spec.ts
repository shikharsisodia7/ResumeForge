import { expect, test } from "@playwright/test";

/**
 * These cover what's genuinely testable without live Auth0/Postgres/OpenAI
 * credentials: that the landing page renders for signed-out visitors, and
 * that every protected route actually enforces authentication. A full
 * upload → format → customize → PDF happy path requires real provider
 * credentials — see README for running that manually against a configured
 * environment.
 *
 * With a real, fully-configured Auth0 tenant, an unauthenticated visit to a
 * protected route is a THREE-hop redirect chain:
 *   /dashboard --(app redirect)--> /auth/login?returnTo=...
 *             --(Auth0 SDK redirect)--> https://<tenant>/authorize?...
 *             --(Auth0's own redirect)--> https://<tenant>/u/login (rendered)
 * `page.goto()` only resolves once the browser finishes the *entire* chain
 * and actually renders a page — Auth0's hosted login screen, not the app's
 * own transient /auth/login hop, which the browser never stops on. So the
 * real security property to assert is: the protected route never rendered,
 * and the app's own /auth/login redirect actually fired somewhere in the
 * chain — not "the final URL happens to still say /auth/login", which only
 * a broken Auth0 config (unset AUTH0_DOMAIN, etc.) would ever produce.
 */

test("landing page shows sign-up and log-in calls to action when signed out", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /turn any resume into/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign up/i })).toBeVisible();
});

/** Walks a Playwright Response's redirect chain back to the initial request's URL. */
function redirectChainUrls(response: import("@playwright/test").Response): string[] {
  const urls: string[] = [];
  let request: import("@playwright/test").Request | null = response.request();
  while (request) {
    urls.unshift(request.url());
    request = request.redirectedFrom();
  }
  return urls;
}

test("visiting the dashboard while signed out redirects through the app's login route to Auth0", async ({ page }) => {
  const response = await page.goto("/dashboard");
  expect(response).not.toBeNull();
  const chain = redirectChainUrls(response!);
  expect(chain.some((url) => url.includes("/auth/login"))).toBe(true);
  // The protected page itself must never have rendered for a signed-out visitor.
  await expect(page).not.toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /your resumes/i })).not.toBeVisible();
});

test("visiting the editor while signed out redirects through the app's login route to Auth0", async ({ page }) => {
  const response = await page.goto("/editor/some-version-id");
  expect(response).not.toBeNull();
  const chain = redirectChainUrls(response!);
  expect(chain.some((url) => url.includes("/auth/login"))).toBe(true);
  await expect(page).not.toHaveURL(/\/editor\//);
});

test("the public prompt gallery API rejects unauthenticated requests", async ({ request }) => {
  const res = await request.get("/api/gallery/prompts");
  expect(res.status()).toBe(401);
});
