import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pages",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4174/immigration-tracking-application/",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "github-pages-mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command:
      "npm run build && node scripts/serve-pages-subpath.mjs",
    url: "http://127.0.0.1:4174/immigration-tracking-application/",
    reuseExistingServer: false,
  },
});
