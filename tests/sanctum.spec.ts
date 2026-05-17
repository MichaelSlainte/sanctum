// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_EMAIL ?? "";
const PASSWORD = process.env.TEST_PASSWORD ?? "";

async function login(page: Page) {
  await page.goto("/");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button.btn.primary');
  // Wait for sidebar to confirm successful login
  await expect(page.locator(".sidebar")).toBeVisible({ timeout: 15000 });
}

test.describe("Sanctum smoke tests", () => {
  test("app loads and shows Sanctum logo and login screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".login-logo")).toBeVisible();
    await expect(page.locator(".login-name")).toHaveText("Sanctum");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("user can log in with test credentials", async ({ page }) => {
    await login(page);
    await expect(page.locator(".sidebar")).toBeVisible();
  });

  test("sidebar shows all main nav items after login", async ({ page }) => {
    await login(page);
    const sidebar = page.locator(".sidebar");
    await expect(sidebar).toBeVisible();
    for (const label of ["Home", "Notes", "Calendar", "Trackers", "Settings"]) {
      await expect(sidebar.locator(`span:text-is("${label}")`)).toBeVisible();
    }
  });

  test("navigate to Notes — page loads without errors", async ({ page }) => {
    await login(page);
    await page.locator(".sidebar span:text-is('Notes')").click();
    await expect(page.locator(".main-content, [class*='notes'], [class*='notebook']")).toBeVisible({ timeout: 10000 });
    const errors: string[] = [];
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    expect(errors.filter(e => !e.includes("favicon"))).toHaveLength(0);
  });

  test("navigate to Calendar — page loads without errors", async ({ page }) => {
    await login(page);
    await page.locator(".sidebar span:text-is('Calendar')").click();
    // Calendar renders a grid or month view header
    await expect(page.locator("[class*='calendar'], [class*='month'], [class*='week']").first()).toBeVisible({ timeout: 10000 });
  });

  test("navigate to Trackers — hub loads, Career tracker is visible", async ({ page }) => {
    await login(page);
    await page.locator(".sidebar span:text-is('Trackers')").click();
    await expect(page.locator("text=Career").first()).toBeVisible({ timeout: 10000 });
  });

  test("navigate to Career tracker — Applications table is visible", async ({ page }) => {
    await login(page);
    await page.locator(".sidebar span:text-is('Trackers')").click();
    await expect(page.locator("text=Career").first()).toBeVisible({ timeout: 10000 });
    await page.locator("text=Career").first().click();
    await expect(page.locator("table.app-table").first()).toBeVisible({ timeout: 10000 });
  });

  test("navigate to Settings — page loads without errors", async ({ page }) => {
    await login(page);
    await page.locator(".sidebar span:text-is('Settings')").click();
    await expect(page.locator("[class*='settings'], [class*='setting']").first()).toBeVisible({ timeout: 10000 });
  });

  test("sign out returns to login screen", async ({ page }) => {
    await login(page);
    await page.locator(".sidebar span:text-is('Sign out')").click();
    await expect(page.locator(".login-logo")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".login-name")).toHaveText("Sanctum");
  });
});
