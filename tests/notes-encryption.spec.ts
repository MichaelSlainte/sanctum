// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
//
// Notes encryption guards (#6, #7, #2). Runs against the real Supabase project
// with the TEST_EMAIL account, so it only ever writes ONE throwaway "[E2E]"
// note (created in beforeAll, deleted in afterAll). Writes to any other note
// are aborted at the network layer so the app's background migration can't
// touch real data while the test holds a key.
import { test, expect, type Page, type Request } from "@playwright/test";
import { webcrypto as wc } from "node:crypto";

const SUPABASE_URL = "https://hqlgwisfkkosgekotojz.supabase.co";
const SUPABASE_KEY = "sb_publishable_Eky9AvrbiYjejxogwxwJ6Q_x7eoySQ4";
const EMAIL = process.env.TEST_EMAIL ?? "";
const PASSWORD = process.env.TEST_PASSWORD ?? "";
const SECRET = "E2E original secret";
const EDIT = " edited-by-e2e";

let session: { access_token: string; refresh_token: string; expires_in: number; user: { id: string } };
let noteId = "";
let aesKey: CryptoKey;

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) },
  });

// Same scheme as src/lib/crypto.js: PBKDF2-SHA256 100k → AES-GCM-256, "ENC:v1:" + b64(iv‖ct)
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
const readRow = async () => (await (await rest(`notes?select=body,title&id=eq.${noteId}`)).json())[0];

// Logged-in tab with NO notes key (what a new tab / PWA relaunch looks like).
async function openKeylessTab(page: Page) {
  await page.addInitScript(([s, id]) => {
    if (sessionStorage.getItem("__e2e_seeded")) return; // only seed once; reloads keep app state
    sessionStorage.setItem("__e2e_seeded", "1");
    localStorage.setItem("sanctum_token", s.access_token);
    localStorage.setItem("sanctum_user", JSON.stringify(s.user));
    localStorage.setItem("sanctum_refresh", s.refresh_token);
    localStorage.setItem("sanctum_expiry", String(Date.now() + s.expires_in * 1000));
    localStorage.setItem("sanctum_page", "notes");
    localStorage.setItem("sanctum_active_note", String(id));
  }, [session, noteId] as const);
}

// Record every write to notes; abort writes to any note other than ours.
function guardNoteWrites(page: Page) {
  const writes: Request[] = [];
  page.on("request", r => { if (r.url().includes("/rest/v1/notes") && r.method() !== "GET") writes.push(r); });
  page.route("**/rest/v1/notes**", route => {
    const r = route.request();
    if (r.method() !== "GET" && !r.url().includes(`id=eq.${noteId}`)) return route.abort();
    return route.continue();
  });
  return writes;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  session = await res.json();
  const [profile] = await (await rest(`profiles?select=encryption_salt&id=eq.${session.user.id}`)).json();
  expect(profile?.encryption_salt, "test account must already have a salt").toBeTruthy();
  aesKey = await deriveKey(PASSWORD, profile.encryption_salt);
  const [row] = await (await rest("notes", { method: "POST", body: JSON.stringify({
    user_id: session.user.id, notebook: "e2e", section: "e2e", title: "[E2E] crypto guard", tags: "",
    body: await encrypt(`<div class="we-line">${SECRET}</div>`), updated_at: new Date().toISOString(),
  }) })).json();
  noteId = row.id;
});

test.afterAll(async () => {
  if (noteId) await rest(`notes?id=eq.${noteId}`, { method: "DELETE" });
});

test("#7/#6 keyless tab: encrypted note is read-only and nothing is written", async ({ page }) => {
  const writes = guardNoteWrites(page);
  await openKeylessTab(page);
  await page.goto("/");
  const before = await readRow();

  const lock = page.locator(".note-enc-lock");
  await expect(lock).toBeVisible({ timeout: 15000 });
  await expect(lock).toContainText("Enter password to unlock");
  const editor = page.locator(".note-body-wysiwyg");
  await expect(editor).toHaveAttribute("contenteditable", "false");
  await expect(editor).toBeHidden();
  await expect(page.locator(".note-title-input")).toHaveAttribute("readonly", "");

  // Try to edit every way a user could: title, tags, raw keystrokes, and a forced paste.
  await page.locator(".note-title-input").click();
  await page.keyboard.type("HACKED");
  await page.locator(".note-tags-input").click({ force: true });
  await page.keyboard.type("hacked");
  await page.evaluate(() => {
    const ed = document.querySelector(".note-body-wysiwyg")!;
    const dt = new DataTransfer(); dt.setData("text/html", "<p>pasted</p>"); dt.setData("text/plain", "pasted");
    ed.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(1500); // > 700ms autosave debounce

  await expect(page.locator(".note-title-input")).toHaveValue("[E2E] crypto guard");
  await expect(editor).not.toContainText("pasted");
  expect(writes.map(w => `${w.method()} ${w.url()}`), "no writes to notes").toEqual([]);
  const after = await readRow();
  expect(after.body).toBe(before.body);
  expect(after.title).toBe(before.title);
});

test("#7 unlock → edit → save → reload decrypts; stored row stays ciphertext", async ({ page }) => {
  const writes = guardNoteWrites(page);
  await openKeylessTab(page);
  await page.goto("/");
  const lock = page.locator(".note-enc-lock");
  await expect(lock).toBeVisible({ timeout: 15000 });

  // Wrong password is rejected and never becomes the key.
  await lock.locator('input[type="password"]').fill("definitely-wrong");
  await lock.getByRole("button", { name: "Unlock" }).click();
  await expect(lock).toContainText("Incorrect password");

  await lock.locator('input[type="password"]').fill(PASSWORD);
  await lock.getByRole("button", { name: "Unlock" }).click();
  const editor = page.locator(".note-body-wysiwyg");
  await expect(editor).toBeVisible({ timeout: 15000 });
  await expect(editor).toHaveAttribute("contenteditable", "true");
  await expect(editor).toContainText(SECRET);

  await editor.click();
  await page.keyboard.press("End");
  await page.keyboard.type(EDIT);
  await expect(page.locator(".save-ind.saved")).toBeVisible({ timeout: 5000 });
  expect(writes.filter(w => w.method() === "PATCH" && w.url().includes(`id=eq.${noteId}`)).length).toBeGreaterThan(0);

  await page.reload(); // key comes back from this tab's sessionStorage
  await expect(page.locator(".note-body-wysiwyg")).toContainText(SECRET + EDIT.trimEnd(), { timeout: 15000 });

  const row = await readRow();
  console.log(`stored body (first 60 chars): ${row.body.slice(0, 60)}`);
  expect(row.body.startsWith("ENC:v1:")).toBe(true);
  expect(row.body).not.toContain(SECRET);
  expect(await decrypt(row.body)).toContain(SECRET + EDIT.trimEnd());
});

// #2 — profile reads/writes are mocked here, so nothing reaches the real profile.
async function loginViaUi(page: Page) {
  await page.goto("/");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click("button.btn.primary");
  await expect(page.locator(".sidebar")).toBeVisible({ timeout: 15000 });
}

test("#2 failed salt read: no new salt is written, no key, error shown", async ({ page }) => {
  guardNoteWrites(page);
  const saltWrites: string[] = [];
  await page.route("**/rest/v1/profiles**", route => {
    const r = route.request();
    if (r.method() === "GET" && r.url().includes("select=encryption_salt")) return route.fulfill({ status: 500, body: "{}" });
    if (r.method() !== "GET" && (r.postData() || "").includes("encryption_salt")) { saltWrites.push(r.postData()!); return route.abort(); }
    return route.continue();
  });
  await page.addInitScript(id => localStorage.setItem("sanctum_active_note", String(id)), noteId);
  await loginViaUi(page);
  await page.locator(".sidebar .nav-item:has-text('Notes')").first().click();
  const lock = page.locator(".note-enc-lock");
  await expect(lock).toBeVisible({ timeout: 15000 });
  await expect(lock).toContainText("select profiles failed");
  expect(saltWrites).toEqual([]);
});

test("#2 salt write not confirmed: abort with error, no key", async ({ page }) => {
  guardNoteWrites(page);
  await page.route("**/rest/v1/profiles**", route => {
    const r = route.request();
    // Profile has no salt, and the write silently doesn't stick.
    if (r.method() === "GET" && r.url().includes("select=encryption_salt")) return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    if (r.method() !== "GET" && (r.postData() || "").includes("encryption_salt")) return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
    return route.continue();
  });
  await page.addInitScript(id => localStorage.setItem("sanctum_active_note", String(id)), noteId);
  await loginViaUi(page);
  await page.locator(".sidebar .nav-item:has-text('Notes')").first().click();
  const lock = page.locator(".note-enc-lock");
  await expect(lock).toBeVisible({ timeout: 15000 });
  await expect(lock).toContainText("Couldn't save your encryption settings");
  expect(await page.evaluate(() => Object.keys(sessionStorage).some(k => k.startsWith("sanctum_session_key_")))).toBe(false);
});
