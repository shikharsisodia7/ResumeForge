// Dev/test-only utility (see e2e/global-setup.ts) — never imported by app code.
const EXPECTED_TITLE = "ResumeForge — AI Resume Formatting";

export class WrongServerError extends Error {}

/**
 * Confirms `baseURL` is actually serving this app before the e2e suite runs
 * against it. Playwright's `reuseExistingServer` option treats "something is
 * listening on this port" as "the app is ready" — on a machine that runs many
 * local dev servers in parallel, an unrelated process can already own the
 * configured port, and the whole suite then silently tests the wrong app,
 * producing dozens of confusing unrelated failures instead of one clear one.
 */
export async function assertExpectedServer(
  baseURL: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl(baseURL);
  const html = await response.text();
  if (!html.includes(EXPECTED_TITLE)) {
    throw new WrongServerError(
      `Playwright's webServer at ${baseURL} is not serving ResumeForge — a different ` +
        `application already has this port. Stop that process (or change the port in ` +
        `playwright.config.ts) before running the e2e suite.`,
    );
  }
}
