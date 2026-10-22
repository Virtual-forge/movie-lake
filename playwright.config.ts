import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  /**
   * Single worker: the e2e suite shares one dev server and one Postgres, and
   * parallel page loads under `next dev` stretch requests to seconds, which
   * makes client/server-state assertions race (favorites arrived after a
   * profile page render, sign-out still in flight). Sequential is slower but
   * deterministic.
   */
  workers: 1,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    timeout: 120_000,
    reuseExistingServer: true,
  },
});
