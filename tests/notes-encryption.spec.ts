// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
//
// Notes encryption guards. Runs against the real Supabase project with the
// dedicated NON-OWNER test account (TEST_EMAIL_2 / TEST_PASSWORD_2) — never a
// real user's account. Every note it creates is titled "[E2E]…" and deleted in
// afterAll. Skipped when the TEST_*_2 variables are not set.
import { test, expect, type Page, type Request } from "@playwright/test";
import { webcrypto as wc } from "node:crypto";

const SUPABASE_URL = "https://hqlgwisfkkosgekotojz.supabase.co";
const SUPABASE_KEY = "sb_publishable_Eky9AvrbiYjejxogwxwJ6Q_x7eoySQ4";
const OWNER_IDS = ["d86cb548-3254-46d4-9322-fc5a45043037", "8e2d598c-94b2-497c-a44a-a773e7d8ff6a"];
const EMAIL = process.env.TEST_EMAIL_2 ?? "";
const PASSWORD = process.env.TEST_PASSWORD_2 ?? "";
const SECRET = "E2E original secret";
const EDIT = " edited-by-e2e";

test.skip(!EMAIL || !PASSWORD, "TEST_EMAIL_2 / TEST_PASSWORD_2 not set");
test.describe.configure({ mode: "serial" });

type Session = { access_token: string; refresh_token: string; expires_in: number; user: { id: string } };
let session: Session;
let aesKey: CryptoKey;
let lockedNoteId = "";

// ── REST + crypto helpers (same scheme as src/lib/crypto.js) ─────────────
const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) },
  });
async function deriveKey(password: string, saltB64: string) {
  const material = await wc.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return wc.subtle.deriveKey({ name: "PBKDF2", salt: Buffer.from(saltB64, "base64"), iterations: 100000, hash: "SHA-256" },
    material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encrypt(text: string) {
  const iv = wc.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await wc.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, new TextEncoder().encode(text)));
  return "ENC:v1:" + Buffer.concat([iv, ct]).toString("base64");
}
async function decrypt(stored: string) {
  const raw = Buffer.from(stored.slice("ENC:v1:".length), "base64");
  return new TextDecoder().decode(await wc.subtle.decrypt({ name: "AES-GCM", iv: raw.subarray(0, 12) }, aesKey, raw.subarray(12)));
}
const allRows = async (): Promise<{ id: string; title: string; body: string }[]> =>
  (await rest("notes?select=id,title,body")).json();
const row = async (id: string) => (await (await rest(`notes?select=id,title,body&id=eq.${id}`)).json())[0];
async function seedNote(title: string, body: string) {
  const [r] = await (await rest("notes", { method: "POST", body: JSON.stringify({
    user_id: session.user.id, notebook: "e2e", section: "e2e", title, tags: "", body, updated_at: new Date().toISOString(),
  }) })).json();
  return r.id as string;
}

// ── Browser helpers ──────────────────────────────────────────────────────
// Logged-in tab with NO notes key — what every reload / new tab looks like now.
async function openKeylessTab(page: Page, activeNoteId?: string) {
  await page.addInitScript(([s, id]) => {
    if (sessionStorage.getItem("__e2e_seeded")) return; // seed once; reloads keep app state
    sessionStorage.setItem("__e2e_seeded", "1");
    localStorage.setItem("sanctum_token", s.access_token);
    localStorage.setItem("sanctum_user", JSON.stringify(s.user));
    localStorage.setItem("sanctum_refresh", s.refresh_token);
    localStorage.setItem("sanctum_expiry", String(Date.now() + s.expires_in * 1000));
    localStorage.setItem("sanctum_page", "notes");
    if (id) localStorage.setItem("sanctum_active_note", String(id)); else localStorage.removeItem("sanctum_active_note");
  }, [session, activeNoteId ?? ""] as const);
  await page.goto("/");
}
async function loginViaUi(page: Page) {
  await page.goto("/");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click("button.btn.primary");
  await expect(page.locator(".sidebar")).toBeVisible({ timeout: 15000 });
}
function recordNoteWrites(page: Page) {
  const writes: Request[] = [];
  page.on("request", r => { if (r.url().includes("/rest/v1/notes") && r.method() !== "GET") writes.push(r); });
  return writes;
}
const fmt = (ws: Request[]) => ws.map(w => `${w.method()} ${w.url().replace(SUPABASE_URL, "")}`);
const storageKeys = (page: Page) => page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);

// ── Setup / teardown ─────────────────────────────────────────────────────
test.beforeAll(async () => {
  session = await (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })).json();
  expect(session.access_token, "test account login").toBeTruthy();
  expect(OWNER_IDS, "notes tests must NOT run on an owner account").not.toContain(session.user.id);

  // Test account's own profile: make sure it has a salt and skips onboarding.
  let [profile] = await (await rest(`profiles?select=encryption_salt&id=eq.${session.user.id}`)).json();
  if (!profile?.encryption_salt) {
    const salt = Buffer.from(wc.getRandomValues(new Uint8Array(16))).toString("base64");
    await rest("profiles?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ id: session.user.id, user_id: session.user.id, encryption_salt: salt }) });
    [profile] = await (await rest(`profiles?select=encryption_salt&id=eq.${session.user.id}`)).json();
  }
  await rest(`profiles?id=eq.${session.user.id}`, { method: "PATCH", body: JSON.stringify({ onboarding_completed: true }) });
  aesKey = await deriveKey(PASSWORD, profile.encryption_salt);
  lockedNoteId = await seedNote("[E2E] crypto guard", await encrypt(`<div class="we-line">${SECRET}</div>`));
});

test.afterAll(async () => {
  if (!session?.access_token) return;
  for (const r of await allRows()) if (r.title?.startsWith("[E2E]") || r.title === "") await rest(`notes?id=eq.${r.id}`, { method: "DELETE" });
});

// ── Tests ────────────────────────────────────────────────────────────────
test("keyless tab: encrypted note is read-only and nothing is written", async ({ page }) => {
  const writes = recordNoteWrites(page);
  await openKeylessTab(page, lockedNoteId);
  const before = await row(lockedNoteId);
  const lock = page.locator(".note-enc-lock");
  await expect(lock).toContainText("Enter password to unlock", { timeout: 15000 });
  const editor = page.locator(".note-body-wysiwyg");
  await expect(editor).toHaveAttribute("contenteditable", "false");
  await expect(editor).toBeHidden();
  await page.locator(".note-title-input").click();
  await page.keyboard.type("HACKED");
  await page.evaluate(() => {
    const dt = new DataTransfer(); dt.setData("text/html", "<p>pasted</p>");
    document.querySelector(".note-body-wysiwyg")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(1500); // > 700ms autosave debounce
  expect(fmt(writes), "no writes to notes").toEqual([]);
  expect(await row(lockedNoteId)).toEqual(before);
});

test("keyless tab: NEW note stays in memory (zero writes, no row) → unlock → encrypted insert", async ({ page }) => {
  const writes = recordNoteWrites(page);
  const rowsBefore = (await allRows()).length;
  await openKeylessTab(page);
  await page.getByTitle("New note").click();
  await expect(page.locator(".note-title-input")).toBeFocused(); // newNote focuses the title after 80ms — wait like a user would
  await page.locator(".note-title-input").fill("[E2E] new draft");
  await page.locator(".note-body-wysiwyg").click();
  await page.keyboard.type("draft typed with no key");
  await expect(page.locator(".note-unlock-bar")).toContainText("Not saved yet", { timeout: 5000 });
  await page.waitForTimeout(1500);

  expect(fmt(writes), "no writes to notes while keyless").toEqual([]);
  const rowsNow = await allRows();
  expect(rowsNow.length, "no new row").toBe(rowsBefore);
  expect(rowsNow.some(r => (r.body || "").includes("draft typed")), "no plaintext row").toBe(false);

  // Unsaved draft → closing the tab warns.
  const hasBeforeUnload = await page.evaluate(() => {
    const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented;
  });
  expect(hasBeforeUnload, "beforeunload warning while a draft is unsaved").toBe(true);

  const bar = page.locator(".note-unlock-bar");
  await bar.locator('input[type="password"]').fill(PASSWORD);
  const inserted = page.waitForResponse(r => r.url().includes("/rest/v1/notes") && r.request().method() === "POST");
  await bar.getByRole("button", { name: "Unlock" }).click();
  const created = (await (await inserted).json())[0];
  const stored = await row(created.id);
  console.log(`new note stored body (first 60 chars): ${stored.body.slice(0, 60)}`);
  expect(stored.body.startsWith("ENC:v1:")).toBe(true);
  expect(await decrypt(stored.body)).toContain("draft typed with no key");
  expect(stored.title).toBe("[E2E] new draft");
  expect(writes.every(w => w.postData()?.includes("ENC:v1:") || !w.postData()?.includes('"body"')), "every body write is ciphertext").toBe(true);
});

test("unlock → edit → save; reload asks for the password again; key never in storage", async ({ page }) => {
  const writes = recordNoteWrites(page);
  await openKeylessTab(page, lockedNoteId);
  const lock = page.locator(".note-enc-lock");
  await lock.locator('input[type="password"]').fill("definitely-wrong");
  await lock.getByRole("button", { name: "Unlock" }).click();
  await expect(lock).toContainText("Incorrect password");
  await lock.locator('input[type="password"]').fill(PASSWORD);
  await lock.getByRole("button", { name: "Unlock" }).click();

  const editor = page.locator(".note-body-wysiwyg");
  await expect(editor).toContainText(SECRET, { timeout: 15000 });
  await editor.click(); await page.keyboard.press("End"); await page.keyboard.type(EDIT);
  await expect(page.locator(".save-ind.saved")).toBeVisible({ timeout: 5000 });
  expect(writes.some(w => w.method() === "PATCH" && w.url().includes(`id=eq.${lockedNoteId}`))).toBe(true);
  expect((await storageKeys(page)).filter(k => /key/i.test(k) && k.startsWith("sanctum")), "no key in web storage").toEqual([]);

  await page.reload(); // memory-only key → locked again
  await expect(page.locator(".note-enc-lock")).toContainText("Enter password to unlock", { timeout: 15000 });
  await page.locator(".note-enc-lock input[type=password]").fill(PASSWORD);
  await page.locator(".note-enc-lock").getByRole("button", { name: "Unlock" }).click();
  await expect(page.locator(".note-body-wysiwyg")).toContainText(SECRET + EDIT.trimEnd(), { timeout: 15000 });

  const stored = await row(lockedNoteId);
  console.log(`edited note stored body (first 60 chars): ${stored.body.slice(0, 60)}`);
  expect(stored.body.startsWith("ENC:v1:")).toBe(true);
  expect(await decrypt(stored.body)).toContain(SECRET + EDIT.trimEnd());
});

test("expired session that can't refresh → logged out (key dropped)", async ({ page }) => {
  await openKeylessTab(page, lockedNoteId);
  await page.locator(".note-enc-lock input[type=password]").fill(PASSWORD);
  await page.locator(".note-enc-lock").getByRole("button", { name: "Unlock" }).click();
  await expect(page.locator(".note-body-wysiwyg")).toContainText(SECRET, { timeout: 15000 });
  await page.route("**/auth/v1/token?grant_type=refresh_token", r => r.fulfill({ status: 400, contentType: "application/json", body: '{"error":"invalid_grant"}' }));
  await page.evaluate(() => {
    localStorage.setItem("sanctum_expiry", String(Date.now() - 1000));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".login-logo")).toBeVisible({ timeout: 10000 });
});

test("migration: a plaintext row is encrypted on the next keyed login", async ({ page }) => {
  const plainId = await seedNote("[E2E] legacy plaintext", '<div class="we-line">legacy plaintext body</div>');
  expect((await row(plainId)).body.startsWith("ENC:v1:")).toBe(false);
  await loginViaUi(page);
  await expect.poll(async () => (await row(plainId)).body.slice(0, 7), { timeout: 15000 }).toBe("ENC:v1:");
  expect(await decrypt((await row(plainId)).body)).toBe('<div class="we-line">legacy plaintext body</div>');
});

test("failed notebooks read: error shown, nothing seeded or overwritten", async ({ page }) => {
  const nbWrites: string[] = [];
  page.on("request", r => { if (r.url().includes("/rest/v1/notebooks") && r.method() !== "GET") nbWrites.push(r.method()); });
  await page.route("**/rest/v1/notebooks**", r => r.request().method() === "GET" ? r.fulfill({ status: 500, body: "{}" }) : r.continue());
  await openKeylessTab(page);
  await expect(page.locator(".notes-load-error")).toContainText("Couldn't load your notebooks", { timeout: 15000 });
  await page.waitForTimeout(1000);
  expect(nbWrites).toEqual([]);
});

// #2 — profile reads/writes are mocked; nothing reaches the real profile.
test("salt read fails at login: no new salt written, no key, error shown", async ({ page }) => {
  const saltWrites: string[] = [];
  await page.route("**/rest/v1/profiles**", route => {
    const r = route.request();
    if (r.method() === "GET" && r.url().includes("select=encryption_salt")) return route.fulfill({ status: 500, body: "{}" });
    if (r.method() !== "GET" && (r.postData() || "").includes("encryption_salt")) { saltWrites.push(r.postData()!); return route.abort(); }
    return route.continue();
  });
  await page.addInitScript(id => localStorage.setItem("sanctum_active_note", String(id)), lockedNoteId);
  await loginViaUi(page);
  await page.locator(".sidebar .nav-item:has-text('Notes')").first().click();
  await expect(page.locator(".note-enc-lock")).toContainText("select profiles failed", { timeout: 15000 });
  expect(saltWrites).toEqual([]);
});

test("salt write not confirmed at login: abort with error, no key", async ({ page }) => {
  await page.route("**/rest/v1/profiles**", route => {
    const r = route.request();
    if (r.method() === "GET" && r.url().includes("select=encryption_salt")) return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    if (r.method() !== "GET" && (r.postData() || "").includes("encryption_salt")) return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    return route.continue();
  });
  await page.addInitScript(id => localStorage.setItem("sanctum_active_note", String(id)), lockedNoteId);
  await loginViaUi(page);
  await page.locator(".sidebar .nav-item:has-text('Notes')").first().click();
  await expect(page.locator(".note-enc-lock")).toContainText("Couldn't save your encryption settings", { timeout: 15000 });
});
