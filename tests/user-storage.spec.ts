// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
//
// The owners' one-time move of browser-only state to the server
// (src/lib/userStorage.js prepareUserStorage / migrateLegacyLocal).
// Needs no account and touches NO real data: every Supabase request is mocked
// (unmatched ones are aborted), and the "owner" is a fake uid with isOwner=true.
// What matters most: Ozzy's weight log (localStorage-only before migration 013)
// must never be removed from the browser until the server has confirmed it.
import { test, expect, type Page, type Request } from "@playwright/test";

const UID = "11111111-1111-4111-8111-111111111111"; // fake, not a real account
type Mock = { prefs: Record<string, unknown> | null; failWeights?: boolean };
let mock: Mock;
let posts: { table: string; query: string; body: Record<string, unknown> }[];

const LEGACY = {
  sanctum_archived_trackers: '["study"]',
  sanctum_trackers_expanded: "true",
  sanctum_study_ring_source: "pmp",
  sanctum_note_order: '{"sec":["2","1"]}',
  sanctum_ozzy_weight: JSON.stringify([{ id: "1714000000000", date: "2026-05-01", kg: "18.5" }, { id: "1715000000000", date: "2026-06-01", kg: "21" }]),
  sanctum_ozzy_custom_docs: JSON.stringify([{ id: "1716000000000", name: "Microchip" }]),
  sanctum_theme: "dark",
};

async function setup(page: Page) {
  posts = [];
  await page.route("**/*.supabase.co/**", async route => {
    const req: Request = route.request();
    const url = new URL(req.url());
    const table = url.pathname.replace("/rest/v1/", "");
    if (req.method() === "GET" && table === "profiles") {
      if (mock.prefs === null) return route.fulfill({ status: 400, body: '{"message":"column ui_prefs does not exist"}' });
      return route.fulfill({ json: [{ ui_prefs: mock.prefs }] });
    }
    if (req.method() === "POST") {
      const body = req.postDataJSON();
      posts.push({ table, query: decodeURIComponent(url.search), body });
      if (table === "ozzy_weights" && mock.failWeights) return route.fulfill({ status: 500, json: { message: "boom" } });
      return route.fulfill({ status: 201, json: [{ id: `srv-${posts.length}`, ...body }] });
    }
    return route.abort(); // nothing else may reach the network
  });
  await page.goto("/");
}

// Seed this browser, run prepareUserStorage, return the sanctum_* keys left.
const run = (page: Page, seed: Record<string, string>, isOwner: boolean) =>
  page.evaluate(async ({ seed, isOwner, uid }) => {
    localStorage.clear();
    localStorage.setItem("sanctum_token", "fake");
    localStorage.setItem("sanctum_user", JSON.stringify({ id: uid }));
    localStorage.setItem("sanctum_expiry", String(Date.now() + 3600_000));
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
    const { prepareUserStorage } = await import("/src/lib/userStorage.js");
    await prepareUserStorage(uid, isOwner);
    return Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith("sanctum_")).map(k => [k, localStorage.getItem(k)]));
  }, { seed, isOwner, uid: UID });

test("owner, first load: layout → ui_prefs, Ozzy data → tables, then local copies removed", async ({ page }) => {
  mock = { prefs: {} };
  await setup(page);
  const left = await run(page, LEGACY, true);

  const prefs = posts.find(p => p.table.startsWith("profiles"))?.body;
  expect(prefs?.ui_prefs, "layout saved as real JSON").toEqual({
    archived_trackers: ["study"], trackers_expanded: true, study_ring_source: "pmp", note_order: { sec: ["2", "1"] },
  });
  const weights = posts.filter(p => p.table.startsWith("ozzy_weights")).map(p => p.body);
  expect(weights).toEqual([
    { client_id: "1714000000000", date: "2026-05-01", kg: 18.5, user_id: UID },
    { client_id: "1715000000000", date: "2026-06-01", kg: 21, user_id: UID },
  ]);
  expect(posts.filter(p => p.table.startsWith("ozzy_custom_docs")).map(p => p.body)).toEqual([{ client_id: "1716000000000", name: "Microchip", user_id: UID }]);
  expect(posts.every(p => !p.table.startsWith("ozzy") || p.query.includes("on_conflict=user_id,client_id")), "idempotent upserts").toBe(true);

  for (const k of ["sanctum_archived_trackers", "sanctum_trackers_expanded", "sanctum_study_ring_source", "sanctum_note_order", "sanctum_ozzy_weight", "sanctum_ozzy_custom_docs"])
    expect(left[k], `${k} removed after confirmed upload`).toBeUndefined();
  expect(left.sanctum_theme, "device pref kept").toBe("dark");
  expect(left.sanctum_last_uid).toBe(UID);
});

test("owner, server already has prefs: server wins, no prefs write", async ({ page }) => {
  mock = { prefs: { nav_order: ["notes", "home"] } };
  await setup(page);
  const left = await run(page, LEGACY, true);
  expect(posts.filter(p => p.table.startsWith("profiles")), "no overwrite of server prefs").toEqual([]);
  expect(left.sanctum_archived_trackers).toBeUndefined();
});

test("weight upload fails: the local weight log is KEPT, also through logout", async ({ page }) => {
  mock = { prefs: {}, failWeights: true };
  await setup(page);
  const left = await run(page, LEGACY, true);
  expect(left.sanctum_ozzy_weight, "kept for the next load").toBe(LEGACY.sanctum_ozzy_weight);
  expect(left.sanctum_ozzy_custom_docs, "docs succeeded → removed").toBeUndefined();

  const afterLogout = await page.evaluate(async () => {
    const { clearUserStorage } = await import("/src/lib/userStorage.js");
    clearUserStorage();
    return localStorage.getItem("sanctum_ozzy_weight");
  });
  expect(afterLogout, "logout never drops unsynced Ozzy data").toBe(LEGACY.sanctum_ozzy_weight);
});

test("prefs can't be read (migration missing): nothing migrated, nothing removed, nothing written", async ({ page }) => {
  mock = { prefs: null };
  await setup(page);
  const left = await run(page, LEGACY, true);
  expect(posts, "no writes at all").toEqual([]);
  expect(left.sanctum_archived_trackers, "layout kept for a later load").toBe(LEGACY.sanctum_archived_trackers);
  expect(left.sanctum_ozzy_weight).toBe(LEGACY.sanctum_ozzy_weight);
});

test("non-owner, first load: leftovers cleared, never uploaded as theirs", async ({ page }) => {
  mock = { prefs: {} };
  await setup(page);
  const left = await run(page, LEGACY, false);
  expect(posts, "nothing uploaded under the non-owner").toEqual([]);
  expect(left.sanctum_archived_trackers).toBeUndefined();
  expect(left.sanctum_theme).toBe("dark");
});
