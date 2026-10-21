// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { test, expect, type Page } from "@playwright/test";

// Runs on the dedicated NON-OWNER test account so no CI run touches a real
// user's data (a password login now also runs the plaintext-note migration).
const EMAIL = process.env.TEST_EMAIL_2 ?? "";
const PASSWORD = process.env.TEST_PASSWORD_2 ?? "";
const SUPABASE_URL = "https://hqlgwisfkkosgekotojz.supabase.co";
const SUPABASE_KEY = "sb_publishable_Eky9AvrbiYjejxogwxwJ6Q_x7eoySQ4";
const OWNER_IDS = ["d86cb548-3254-46d4-9322-fc5a45043037", "8e2d598c-94b2-497c-a44a-a773e7d8ff6a"];
const V1_TRACKERS = ["Study", "Career", "Finance", "Travel", "Ozzy"];

test.skip(!EMAIL || !PASSWORD, "TEST_EMAIL_2 / TEST_PASSWORD_2 not set");

test.beforeAll(async () => {
  const s = await (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })).json();
  expect(s.access_token, "test account login").toBeTruthy();
  expect(OWNER_IDS, "smoke tests must NOT run on an owner account").not.toContain(s.user.id);
  // Skip the new-user onboarding overlay for the test account.
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${s.user.id}`, {
    method: "PATCH", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ onboarding_completed: true }),
  });
});

async function login(page: Page) {
  await page.goto("/");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button.btn.primary');
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
      await expect(sidebar.locator(`.nav-item:has-text("${label}")`).first()).toBeVisible();
    }
  });

  test("navigate to Notes — page loads without errors", async ({ page }) => {
    await login(page);
    const errors: string[] = [];
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    await page.locator(".sidebar .nav-item:has-text('Notes')").first().click();
    await expect(page.locator(".main-content, [class*='notes'], [class*='notebook']").first()).toBeVisible({ timeout: 15000 });
    expect(errors.filter(e => !e.includes("favicon"))).toHaveLength(0);
  });

  test("navigate to Calendar — page loads without errors", async ({ page }) => {
    await login(page);
    await page.locator(".sidebar .nav-item:has-text('Calendar')").first().click();
    await expect(page.locator("[class*='calendar'], [class*='month'], [class*='week']").first()).toBeVisible({ timeout: 15000 });
  });

  test("navigate to Trackers — hub loads", async ({ page }) => {
    await login(page);
    await page.locator(".sidebar .nav-item:has-text('Trackers')").first().click();
    await expect(page.getByText("Your Trackers")).toBeVisible({ timeout: 15000 });
  });

  // Regression test for the cross-tenant v1 tracker leak (GHSA-p4h3-9mvv-q7pm).
  // Bug: the Archived section in TrackerHub.jsx rendered v1 trackers with no
  // isOwner check, and the list comes from the browser-wide localStorage key
  // "sanctum_archived_trackers", not a per-user one. So on a shared browser a
  // non-owner saw the owner's archived v1 trackers (+ Restore).
  // The test seeds that key to reproduce an owner having archived them earlier.
  test("non-owner sees NO v1 trackers in the active grid or Archived", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("sanctum_archived_trackers", JSON.stringify(["study", "career", "finance", "travel", "pet"])));
    await login(page);
    await page.locator(".sidebar .nav-item:has-text('Trackers')").first().click();
    await expect(page.getByText("Your Trackers")).toBeVisible({ timeout: 15000 });
    const toggle = page.locator(".archived-section > button");
    if ((await toggle.textContent())?.includes("▶")) await toggle.click(); // make sure Archived is expanded
    for (const name of V1_TRACKERS) {
      await expect(page.locator(".tracker-hub").getByText(name, { exact: true }), `${name} in active grid`).toHaveCount(0);
      await expect(page.locator(".archived-section").getByText(name, { exact: true }), `${name} in Archived`).toHaveCount(0);
    }
  });

  test("navigate to Settings — page loads without errors", async ({ page }) => {
    await login(page);
    await page.locator(".sidebar .nav-item:has-text('Settings')").first().click();
    await expect(page.getByText("Appearance")).toBeVisible({ timeout: 15000 });
  });

  test("sign out returns to login screen", async ({ page }) => {
    await login(page);
    await page.locator(".sidebar .nav-item:has-text('Sign out')").first().click();
    await expect(page.locator(".login-logo")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".login-name")).toHaveText("Sanctum");
  });
});
