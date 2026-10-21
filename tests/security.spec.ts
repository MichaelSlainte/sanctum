// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
//
// Security regression tests for the 2026-10-20 RLS / storage incident
// (docs/security/2026-10-20-rls-storage-incident.md, migration 011_security_fixes.sql).
// API-level only. Uses anon + the NON-owner, NON-partner test account
// (TEST_EMAIL_2); never logs in as a real user. "Owner still works" is proven
// with the test account's own rows/files, so no real account is needed.
// Never writes to another user's data: cross-user write probes either target
// a path that doesn't exist or are no-ops (field set to its current value).
import { test, expect } from "@playwright/test";

const URL = "https://hqlgwisfkkosgekotojz.supabase.co";
const KEY = "sb_publishable_Eky9AvrbiYjejxogwxwJ6Q_x7eoySQ4";
const OWNER = "d86cb548-3254-46d4-9322-fc5a45043037"; // owner whose data must stay private
const OWNERS = [OWNER, "8e2d598c-94b2-497c-a44a-a773e7d8ff6a"];
const OWNER_PHOTO = `${OWNER}/ozzy.jpg`; // predictable path (Ozzy.jsx)
const EMAIL = process.env.TEST_EMAIL_2 ?? "";
const PASSWORD = process.env.TEST_PASSWORD_2 ?? "";

test.skip(!EMAIL || !PASSWORD, "TEST_EMAIL_2 / TEST_PASSWORD_2 not set");
test.describe.configure({ mode: "serial" });

let tester: { access_token: string; user: { id: string } };
const anonH = { apikey: KEY };
const userH = () => ({ apikey: KEY, Authorization: `Bearer ${tester.access_token}` });
const rows = async (path: string, headers: Record<string, string>) => {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers });
  const body = await r.json().catch(() => null);
  return Array.isArray(body) ? body : [];
};

test.beforeAll(async () => {
  tester = await (await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { ...anonH, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })).json();
  expect(tester.access_token, "test account login").toBeTruthy();
  expect(OWNERS, "must run as a NON-owner").not.toContain(tester.user.id);
  const partners = await rows("partners?select=id", userH());
  expect(partners, "test account must have no partner").toEqual([]);
});

// ── Finding 1: shared events ─────────────────────────────────────────────
test("events: shared events are not readable by anon or a non-partner", async () => {
  expect(await rows("events?select=id&shared=eq.true", anonH)).toEqual([]);
  expect(await rows("events?select=id&shared=eq.true", userH())).toEqual([]);
  expect(await rows(`events?select=id&user_id=in.(${OWNERS.join(",")})`, userH())).toEqual([]);
});

// ── Finding 2: ozzy_docs ─────────────────────────────────────────────────
test("ozzy_docs: no cross-user read/write; own rows work", async () => {
  expect(await rows("ozzy_docs?select=id", anonH)).toEqual([]);
  expect(await rows(`ozzy_docs?select=id&user_id=eq.${OWNER}`, userH())).toEqual([]);

  // No-op PATCH on the owner's rows (user_id set to its current value) → must touch 0 rows.
  const patch = await fetch(`${URL}/rest/v1/ozzy_docs?user_id=eq.${OWNER}`, {
    method: "PATCH", headers: { ...userH(), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ user_id: OWNER }),
  });
  expect(await patch.json().catch(() => [])).toEqual([]);

  // Inserting a row AS someone else is rejected; anon can't insert at all.
  for (const [who, headers] of [["tester-as-owner", userH()], ["anon", anonH]] as const) {
    const r = await fetch(`${URL}/rest/v1/ozzy_docs`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ user_id: OWNER, name: "[E2E] forged", filename: "x", path: `${OWNER}/x` }),
    });
    expect([401, 403], `${who} insert must be rejected (got ${r.status})`).toContain(r.status);
  }

  // Own row: insert → read → delete (owner path still works).
  const ins = await fetch(`${URL}/rest/v1/ozzy_docs`, {
    method: "POST", headers: { ...userH(), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ user_id: tester.user.id, name: "[E2E] own doc", filename: "own.txt", path: `${tester.user.id}/own.txt` }),
  });
  expect(ins.status, "own insert").toBe(201);
  const [own] = await ins.json();
  expect((await rows(`ozzy_docs?select=id&id=eq.${own.id}`, userH())).length).toBe(1);
  const del = await fetch(`${URL}/rest/v1/ozzy_docs?id=eq.${own.id}`, { method: "DELETE", headers: { ...userH(), Prefer: "return=representation" } });
  expect((await del.json()).length, "own delete").toBe(1);
});

// ── Findings 3 + 4: pets bucket ──────────────────────────────────────────
const objUrl = (route: string, path: string) => `${URL}/storage/v1/object/${route}/pets/${path}`;
const sign = (path: string, headers: Record<string, string>) =>
  fetch(`${URL}/storage/v1/object/sign/pets/${path}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 60 }) });
const list = async (prefix: string, headers: Record<string, string>) => {
  const r = await fetch(`${URL}/storage/v1/object/list/pets`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ prefix, limit: 100 }) });
  const body = await r.json().catch(() => null);
  return Array.isArray(body) ? body : [];
};

test("pets: another user's file can't be fetched, signed or listed", async () => {
  // Public route, cache-busted so a stale CDN copy can't mask the origin's answer.
  expect((await fetch(`${objUrl("public", OWNER_PHOTO)}?cb=${Date.now()}`)).status, "public route").not.toBe(200);
  expect((await fetch(objUrl("authenticated", OWNER_PHOTO), { headers: anonH })).status, "anon download").not.toBe(200);
  expect((await fetch(objUrl("authenticated", OWNER_PHOTO), { headers: userH() })).status, "non-partner download").not.toBe(200);
  expect((await sign(OWNER_PHOTO, anonH)).status, "anon sign").not.toBe(200);
  expect((await sign(OWNER_PHOTO, userH())).status, "non-partner sign").not.toBe(200);
  expect(await list("", anonH), "anon list root").toEqual([]);
  expect(await list(OWNER, userH()), "non-partner list owner folder").toEqual([]);
});

test("pets: can't upload into another user's folder; anon can't upload", async () => {
  const probe = `${OWNER}/e2e-forbidden-${Date.now()}.txt`; // new path — never overwrites real files
  for (const [who, headers] of [["non-partner", userH()], ["anon", anonH]] as const) {
    const r = await fetch(`${URL}/storage/v1/object/pets/${probe}`, {
      method: "POST", headers: { ...headers, "Content-Type": "text/plain" }, body: "forbidden",
    });
    expect(r.status, `${who} upload into owner folder must fail`).not.toBe(200);
  }
});

test("pets: own folder works end-to-end (upload → download → signed URL → delete)", async () => {
  const path = `${tester.user.id}/e2e-${Date.now()}.txt`;
  const up = await fetch(`${URL}/storage/v1/object/pets/${path}`, { method: "POST", headers: { ...userH(), "Content-Type": "text/plain" }, body: "hello" });
  expect(up.status, "own upload").toBe(200);
  try {
    expect(await (await fetch(objUrl("authenticated", path), { headers: userH() })).text()).toBe("hello");
    const s = await sign(path, userH());
    expect(s.status, "own sign").toBe(200);
    const { signedURL } = await s.json();
    expect(await (await fetch(`${URL}/storage/v1${signedURL}`)).text(), "signed URL works without auth").toBe("hello");
    expect((await fetch(`${objUrl("public", path)}?cb=${Date.now()}`)).status, "but the public route does not").not.toBe(200);
  } finally {
    const del = await fetch(`${URL}/storage/v1/object/pets`, {
      method: "DELETE", headers: { ...userH(), "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [path] }),
    });
    expect(del.status, "own delete").toBe(200);
  }
});

// ── Exact policy set (catches leftover / dashboard-created policies) ───
// The incident happened because an extra permissive policy sat next to the
// right one, so assert the WHOLE set per table: any extra or missing policy
// fails. roles: null = not pinned (none at present).
type Policy = { schema_name: string; table_name: string; policy_name: string; command: string; roles: string[] };
const EXPECTED_POLICIES: Record<string, [name: string, cmd: string, roles: string[] | null][]> = {
  "public.events": [
    ["events_own", "ALL", ["public"]], // dashboard-created; pinned from the 2026-10-21 inventory
    ["events_shared_read", "SELECT", ["public"]], // migration 010
  ],
  "public.ozzy_docs": [
    ["ozzy_docs_delete", "DELETE", ["authenticated"]],
    ["ozzy_docs_insert", "INSERT", ["authenticated"]],
    ["ozzy_docs_read", "SELECT", ["authenticated"]],
    ["ozzy_docs_update", "UPDATE", ["authenticated"]],
  ],
  "public.partners": [
    ["partners_self_read", "SELECT", ["public"]], // migration 010; no write policies by design
  ],
  "storage.objects": [ // ALL storage policies, not just pets: a new bucket policy must be added here deliberately
    ["pets_delete_own", "DELETE", ["authenticated"]],
    ["pets_insert_own", "INSERT", ["authenticated"]],
    ["pets_read_own_or_partner", "SELECT", ["authenticated"]],
    ["pets_update_own", "UPDATE", ["authenticated"]],
  ],
};

// Service role only (migration 012). The key comes from the GitHub secret
// SUPABASE_SERVICE_ROLE_KEY, set ONLY on the CI step that runs this check (no dev
// server is running in that step). Locally the check is skipped unless the
// variable is set; in that CI step REQUIRE_POLICY_INVENTORY=1 makes a missing
// key a failure instead of a skip.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const inventory = (headers: Record<string, string>) =>
  fetch(`${URL}/rest/v1/rpc/security_policy_inventory`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "{}" });

test("policies: inventory is service-role only", async () => {
  expect((await inventory(anonH)).status, "anon must not execute it").not.toBe(200);
  expect((await inventory(userH())).status, "a logged-in app user must not execute it").not.toBe(200);
});

test("policies: exact set per table, no extras (security_policy_inventory)", async () => {
  if (!SERVICE_KEY) {
    expect(process.env.REQUIRE_POLICY_INVENTORY, "SUPABASE_SERVICE_ROLE_KEY missing in the CI policy step").toBeFalsy();
    test.skip(true, "SUPABASE_SERVICE_ROLE_KEY not set (runs in CI only)");
  }
  const r = await inventory({ apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` });
  expect(r.status, "inventory RPC (migration 012)").toBe(200);
  const actual: Policy[] = await r.json();
  const byTable: Record<string, Policy[]> = {};
  for (const p of actual) (byTable[`${p.schema_name}.${p.table_name}`] ??= []).push(p);

  expect(Object.keys(byTable).sort(), "tables covered").toEqual(Object.keys(EXPECTED_POLICIES).sort());
  for (const [table, expected] of Object.entries(EXPECTED_POLICIES)) {
    const got = (byTable[table] ?? []).sort((a, b) => a.policy_name.localeCompare(b.policy_name));
    expect(got.map(p => `${p.policy_name} ${p.command}`), `${table} policy set`).toEqual(expected.map(([n, c]) => `${n} ${c}`).sort());
    for (const [name, , roles] of expected) {
      if (roles) expect(got.find(p => p.policy_name === name)?.roles, `${table}.${name} roles`).toEqual(roles);
    }
  }
});
