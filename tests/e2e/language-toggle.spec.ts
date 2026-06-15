import { expect, test } from "@playwright/test";

/**
 * Smoke test for the language switcher on the Home page. The Vite dev build
 * runs without the Tauri backend, so settings persistence is unavailable, but
 * the UI language still switches instantly (i18next) and is cached in
 * localStorage — which is what survives a reload.
 */
test.describe("language toggle", () => {
  // Each test runs in a fresh browser context, so the language cache starts
  // empty and the default language is English.
  test("switches UI to French and persists across reload", async ({ page }) => {
    await page.goto("/");

    // Default English CTA.
    const cta = page.getByRole("button", { name: "Start practicing" });
    await expect(cta).toBeVisible();

    // Open the language menu and pick French.
    await page.getByRole("button", { name: /Language:/ }).click();
    await page.getByRole("option", { name: "Français" }).click();

    // The CTA is now French.
    await expect(page.getByRole("button", { name: "Commencer" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start practicing" }),
    ).toHaveCount(0);

    // The choice survives a reload (restored from the localStorage cache).
    await page.reload();
    await expect(page.getByRole("button", { name: "Commencer" })).toBeVisible();
  });
});
