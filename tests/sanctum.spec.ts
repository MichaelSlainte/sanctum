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
let testerId = "";

test.beforeAll(async () => {
  const s = await (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })).json();
  expect(s.access_token, "test account login").toBeTruthy();
  expect(OWNER_IDS, "smoke tests must NOT run on an owner account").not.toContain(s.user.id);
  testerId = s.user.id;
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

// ── Per-user browser storage (src/lib/userStorage.js, uiPrefs.js) ──────────
// localStorage is shared by every account on a browser. Logout and a user
// switch must leave only device prefs, the salt read-cache and unsynced Ozzy
// data; per-user layout lives in profiles.ui_prefs (migration 013).
const DEVICE = {
  sanctum_theme: "dark", sanctum_font: "default", sanctum_sidebar_col: "220", sanctum_list_col: "280",
  sanctum_notes_fs: "false", sanctum_ai_btn_pos: '{"right":24,"bottom":96}', sanctum_cal_view: "month",
};
const LEFTOVER = "e2e-leftover"; // marker in every seeded per-user value
const SEEDED = Object.fromEntries([
  "sanctum_notebooks_v2", "sanctum_study_subjects", "sanctum_tracker_entries",
  "sanctum_ozzy_vets", "sanctum_ozzy_profile", "sanctum_ozzy_docs_meta", "sanctum_ozzy_diet", "sanctum_ozzy_custom_fields",
  "sanctum_pmbok_topics", "sanctum_pmp_date", "sanctum_pmp_target", "sanctum_study_goal",
  "sanctum_archived_trackers", "sanctum_nav_order", "sanctum_note_order", "sanctum_active_note", "sanctum_display_name_x",
].map(k => [k, JSON.stringify([LEFTOVER])]));
const isAllowedAfterClear = (k: string) =>
  k in DEVICE || k === "sanctum_last_uid" || k.startsWith("sanctum_enc_salt_") ||
  k === "sanctum_ozzy_weight" || k === "sanctum_ozzy_custom_docs";
const sanctumStorage = (page: Page) => page.evaluate(() =>
  Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith("sanctum_")).map(k => [k, localStorage.getItem(k) ?? ""])));

test.describe("Per-user browser storage", () => {
  test("logout clears per-user keys; device prefs survive", async ({ page }) => {
    await login(page);
    await page.evaluate(kv => { for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v); }, { ...DEVICE, ...SEEDED });
    await page.locator(".sidebar .nav-item:has-text('Sign out')").first().click();
    await expect(page.locator(".login-logo")).toBeVisible({ timeout: 15000 });

    const after = await sanctumStorage(page);
    for (const [k, v] of Object.entries(DEVICE)) expect(after[k], `device pref ${k} kept`).toBe(v);
    for (const k of Object.keys(after)) expect(isAllowedAfterClear(k), `${k} must be cleared on logout`).toBe(true);
    for (const k of ["sanctum_token", "sanctum_user", "sanctum_refresh", "sanctum_expiry"]) expect(after[k], k).toBeUndefined();
  });

  test("login after a different user clears that user's leftovers", async ({ page }) => {
    await page.addInitScript(({ seeded }) => {
      if (sessionStorage.getItem("e2e_seeded")) return; // seed once, not on every navigation
      sessionStorage.setItem("e2e_seeded", "1");
      localStorage.setItem("sanctum_last_uid", "00000000-0000-4000-8000-000000000000");
      for (const [k, v] of Object.entries(seeded)) localStorage.setItem(k, v);
    }, { seeded: SEEDED });
    await login(page);
    const after = await sanctumStorage(page);
    expect(after.sanctum_last_uid, "last uid updated").toBe(testerId);
    for (const [k, v] of Object.entries(after)) expect(v.includes(LEFTOVER), `${k} still holds the previous user's value`).toBe(false);
  });

  test("layout prefs come from the server (profiles.ui_prefs), not this browser", async ({ page }) => {
    await login(page);
    const toggle = page.locator(".sidebar .nav-item", { hasText: "Trackers" }).first().locator("span", { hasText: /^[▶▼]$/ });
    const before = (await toggle.textContent())?.trim();
    const flipped = before === "▶" ? "▼" : "▶";
    const saved = () => page.waitForResponse(r => r.url().includes("/rest/v1/profiles") && r.request().method() === "POST" && r.ok());

    let save = saved();
    await toggle.click();
    await save;
    await expect(toggle).toHaveText(flipped);
    expect(await page.evaluate(() => localStorage.getItem("sanctum_trackers_expanded")), "not in localStorage").toBeNull();

    await page.reload(); // cold start: prefs re-read from the server
    await expect(toggle).toHaveText(flipped, { timeout: 15000 });

    save = saved(); // restore the test account's original state
    await toggle.click();
    await save;
    await expect(toggle).toHaveText(before ?? "▶");
  });
});
