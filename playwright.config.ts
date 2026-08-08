import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // A dedicated port, distinct from the default 3000 — several unrelated
    // local projects on this machine run dev servers on 3000, and
    // reuseExistingServer would otherwise silently attach to whichever one
    // got there first instead of this app's own build.
    command: "npm run build && npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Opts this webServer instance into the unauthenticated test-fixture
    // preview route (src/app/__test-fixtures__) used by the layout/print
    // regression tests. Never set in Vercel's production environment.
    env: { ALLOW_TEST_FIXTURES: "true" },
  },
});
