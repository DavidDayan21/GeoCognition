import { defineConfig } from "@playwright/test";

/**
 * E2E tests live in `tests/e2e`. They drive the Vite dev server build of the
 * app UI; Tauri-driven E2E wiring lands with the test specs in later phases.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:1420",
  },
  webServer: {
    command: "pnpm dev",
    port: 1420,
    reuseExistingServer: true,
  },
});
