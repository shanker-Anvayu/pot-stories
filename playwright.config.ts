import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a running app connected to a real Supabase project.
 * Requires .env.local with Supabase keys. Test users are created (and removed)
 * by e2e/global-setup.ts with the service-role key — never point this at
 * production data you care about.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `npx next dev -p ${PORT}`, url: `http://localhost:${PORT}`, reuseExistingServer: true, timeout: 180_000 },
});
