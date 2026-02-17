import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Docker-based E2E runs.
 * No webServer/globalSetup — compose.e2e.yml handles infrastructure lifecycle.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: true,
  retries: 2,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://frontend:3000",
    trace: "on-first-retry",
    headless: true,
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      timeout: 120_000,
    },
  ],
});
