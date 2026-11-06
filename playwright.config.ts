import { defineConfig, devices } from "@playwright/test"

const PORT = 3100
// A throwaway database under .next so it's ignored by git and wiped with the build.
const env = {
  DATABASE_URL: "file:./.next/e2e/matrix.db",
  STEAM_API_KEY: "e2e-not-used",
  CRON_SECRET: "e2e-not-used",
}

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    // Local runs can point at an already-installed Chromium instead of downloading one.
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Requires `pnpm build` first; prepares the DB, then serves the production build.
    command: `mkdir -p .next/e2e && rm -f .next/e2e/matrix.db* && tsx e2e/prepare-db.ts && next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    env,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
})
