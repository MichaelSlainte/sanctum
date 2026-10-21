// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
//
// What per-user state may stay in this browser. localStorage is shared by every
// account that signs in here, so on logout and on a user switch every sanctum_*
// key goes, except:
//   - DEVICE_KEYS: device preferences (theme, font, column widths, ...);
//   - sanctum_enc_salt_<uid>: a READ CACHE of the DB salt (encryptionKey.js).
//     Never a source: no salt is ever written to the DB from it;
//   - PENDING_DATA_KEYS: Ozzy data with no server copy yet. Removed only after
//     migrateLegacyLocal() has confirmed the upload, so it can't be lost;
//   - with keepAuth (user switch mid-login): the session keys + sanctum_last_uid.
import { sb } from './supabase.js';
import { PREF_KEYS, toStored, uiPrefsWritable, uiPrefsEmpty, mergeUiPrefs, loadUiPrefs } from './uiPrefs.js';

export const DEVICE_KEYS = [
  'sanctum_theme', 'sanctum_font', 'sanctum_sidebar_col', 'sanctum_list_col',
  'sanctum_notes_fs', 'sanctum_ai_btn_pos', 'sanctum_cal_view',
];
export const AUTH_KEYS = ['sanctum_token', 'sanctum_user', 'sanctum_refresh', 'sanctum_expiry'];
export const LAST_UID_KEY = 'sanctum_last_uid';
export const SALT_CACHE_PREFIX = 'sanctum_enc_salt_';
export const PENDING_DATA_KEYS = ['sanctum_ozzy_weight', 'sanctum_ozzy_custom_docs'];

const isKept = (key, keepAuth) =>
  DEVICE_KEYS.includes(key) ||
  key.startsWith(SALT_CACHE_PREFIX) ||
  PENDING_DATA_KEYS.includes(key) ||
  key === LAST_UID_KEY ||
  (keepAuth && AUTH_KEYS.includes(key));

export function clearUserStorage({ keepAuth = false } = {}) {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sanctum_') && !isKept(key, keepAuth)) localStorage.removeItem(key);
    }
  } catch { /* storage unavailable — nothing to clear */ }
}

const readJson = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };

// Upload a legacy localStorage list into its table, one row per entry, keyed on
// (user_id, client_id) so a second device or a retry never duplicates. True only
// if every entry was confirmed saved; otherwise the key is kept for next time.
async function uploadList(key, table, toRow) {
  const list = readJson(key);
  if (!Array.isArray(list)) { localStorage.removeItem(key); return true; } // missing or unreadable
  let ok = true;
  for (const entry of list) {
    const res = await sb.from(table).upsert({ client_id: String(entry.id), ...toRow(entry) }, 'user_id,client_id').catch(() => null);
    if (!Array.isArray(res) || res.length === 0) ok = false;
  }
  if (ok) localStorage.removeItem(key);
  else console.error(`[userStorage] ${key}: some entries not saved to ${table}; kept locally for next load`);
  return ok;
}

// One-time move of an owner's browser-only state to the server. Runs on every
// load and does nothing once the keys are gone.
export async function migrateLegacyLocal() {
  // 1. Layout → profiles.ui_prefs. If the server already has prefs (another
  //    device migrated first), the server wins.
  const legacy = {};
  for (const [key, f] of Object.entries(PREF_KEYS)) {
    const v = localStorage.getItem(key);
    if (v != null) legacy[f] = toStored(v);
  }
  if (Object.keys(legacy).length && uiPrefsWritable()) {
    const ok = uiPrefsEmpty() ? await mergeUiPrefs(legacy) : true;
    if (ok) Object.keys(PREF_KEYS).forEach(k => localStorage.removeItem(k));
    else console.error('[userStorage] layout prefs not saved; kept locally for next load');
  }
  // 2. Ozzy data with no server copy.
  if (localStorage.getItem('sanctum_ozzy_weight') != null)
    await uploadList('sanctum_ozzy_weight', 'ozzy_weights', e => ({ date: e.date, kg: Number(e.kg) }));
  if (localStorage.getItem('sanctum_ozzy_custom_docs') != null)
    await uploadList('sanctum_ozzy_custom_docs', 'ozzy_custom_docs', e => ({ name: e.name }));
}

// Call once per sign-in (cold start with a saved session, or login), BEFORE the
// signed-in UI renders: components read ui_prefs synchronously on mount.
export async function prepareUserStorage(userId, isOwner) {
  const prev = localStorage.getItem(LAST_UID_KEY);
  const same = prev === userId;
  // Someone else used this browser last: their per-user state goes.
  if (prev && !same) clearUserStorage({ keepAuth: true });
  const loaded = await loadUiPrefs(userId);
  if (isOwner && (same || !prev)) {
    // Owner's own leftovers (or the first load after this shipped): move them.
    if (loaded) await migrateLegacyLocal();
  } else if (!prev) {
    // First load after this shipped, non-owner: leftovers can't be proven theirs.
    clearUserStorage({ keepAuth: true });
  }
  try { localStorage.setItem(LAST_UID_KEY, userId); } catch { /* ignore */ }
}
