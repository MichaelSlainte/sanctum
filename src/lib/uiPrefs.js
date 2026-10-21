// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
//
// Per-user UI state (layout, ordering, collapsed sections, archived v1
// trackers), stored in profiles.ui_prefs (migration 013) instead of
// browser-wide localStorage, which leaked between accounts on a shared browser.
//
// `uiPrefs.getItem / setItem` mirror localStorage for the keys in PREF_KEYS,
// with the same string values the components already use, so call sites only
// swap `localStorage` for `uiPrefs`. Values are stored as real JSON in jsonb.
//
// Lifecycle (App.jsx via userStorage.js): loadUiPrefs(uid) BEFORE the signed-in
// UI renders, flushUiPrefs() before sign-out, resetUiPrefs() after.
// If the load fails, prefs are session-only (writable = false): an empty object
// must never be saved over the user's real prefs (the notebooks lesson, #27).
import { sb } from './supabase.js';

// localStorage key → ui_prefs field.
export const PREF_KEYS = {
  sanctum_archived_trackers:  'archived_trackers',
  sanctum_tracker_order:      'tracker_order',
  sanctum_trackers_expanded:  'trackers_expanded',
  sanctum_dashboard_rings:    'dashboard_rings',
  sanctum_home_widget_order:  'home_widget_order',
  sanctum_ring_order:         'ring_order',
  sanctum_nav_order:          'nav_order',
  sanctum_hide_roadmap:       'hide_roadmap',
  sanctum_roadmap_collapsed:  'roadmap_collapsed',
  sanctum_study_collapsed:    'study_collapsed',
  sanctum_study_ring_source:  'study_ring_source',
  sanctum_note_order:         'note_order',
  sanctum_expanded_nbs:       'expanded_nbs',
};

const SAVE_DELAY_MS = 400;

let state = { userId: null, prefs: {}, writable: false };
let timer = null;
let pending = null; // promise of the in-flight save

const field = (key) => {
  const f = PREF_KEYS[key];
  if (!f) throw new Error(`uiPrefs: unknown key ${key}`);
  return f;
};

// Stored as JSON where the string is JSON ("[...]", "{...}", "true"), else as
// the plain string ("pmp"). getItem turns it back into the same string.
export const toStored = (str) => { try { return JSON.parse(str); } catch { return str; } };
const toString = (v) => (v == null ? null : typeof v === 'string' ? v : JSON.stringify(v));

export const uiPrefs = {
  getItem: (key) => toString(state.prefs[field(key)]),
  setItem: (key, str) => {
    state.prefs = { ...state.prefs, [field(key)]: toStored(str) };
    scheduleSave();
  },
};

async function save() {
  timer = null;
  if (!state.writable || !state.userId) return;
  const { userId, prefs } = state;
  const res = await sb.from('profiles').upsert({ id: userId, ui_prefs: prefs }, 'id').catch(() => null);
  if (!Array.isArray(res)) console.error('[uiPrefs] save failed');
}

function scheduleSave() {
  if (!state.writable) return;
  clearTimeout(timer);
  timer = setTimeout(() => { pending = save(); }, SAVE_DELAY_MS);
}

// Returns true when prefs were read from the server (and are writable).
export async function loadUiPrefs(userId) {
  clearTimeout(timer); timer = null;
  try {
    const rows = await sb.from('profiles').select('ui_prefs', `&id=eq.${userId}`, '', { strict: true });
    const p = rows[0]?.ui_prefs;
    state = { userId, prefs: p && typeof p === 'object' && !Array.isArray(p) ? p : {}, writable: true };
    return true;
  } catch (err) {
    console.error('[uiPrefs] load failed; prefs are session-only:', err);
    state = { userId, prefs: {}, writable: false };
    return false;
  }
}

export const uiPrefsWritable = () => state.writable;
export const uiPrefsEmpty = () => Object.keys(state.prefs).length === 0;

// Replace several fields at once and save now (the one-time owner migration).
// Resolves true only when the server confirmed the write.
export async function mergeUiPrefs(fields) {
  if (!state.writable) return false;
  clearTimeout(timer); timer = null;
  state.prefs = { ...state.prefs, ...fields };
  const res = await sb.from('profiles').upsert({ id: state.userId, ui_prefs: state.prefs }, 'id').catch(() => null);
  return Array.isArray(res) && res.length > 0;
}

// Save any debounced change now (call before sign-out, while the token works).
export async function flushUiPrefs() {
  if (timer) { clearTimeout(timer); pending = save(); }
  await pending;
}

export function resetUiPrefs() {
  clearTimeout(timer); timer = null; pending = null;
  state = { userId: null, prefs: {}, writable: false };
}
