import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  // Verifies the webServer at baseURL is actually this app before any test
  // runs — see e2e/global-setup.ts and src/lib/dev/assert-expected-server.ts.
  // Without this, reuseExistingServer (below) treats any process already
  // bound to the port as "ready," and an unrelated local project can cause
  // the whole suite to fail against the wrong app with no useful diagnostic.
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // A dedicated port, distinct from the default 3000 — several unrelated
    // local projects on this machine run dev servers on 3000. This alone
    // isn't a guarantee (any port can collide); globalSetup above is the
    // real safety net.
    command: "npm run build && npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Opts this webServer instance into the unauthenticated test-fixture
    // preview route (src/app/dev-preview-fixture) used by the layout/print
    // regression tests. Never set in Vercel's production environment.
    env: { ALLOW_TEST_FIXTURES: "true" },
  },
});
