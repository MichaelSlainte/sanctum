// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
//
// Getting the notes encryption key: salt lookup, key derivation and the
// per-tab key cache. The key never leaves the browser.
import { sb } from './supabase.js';
import { deriveKey, exportKey, decrypt, generateSalt } from './crypto.js';

export const sessionKeyName = (userId) => `sanctum_session_key_${userId}`;
export const saltStorageName = (userId) => `sanctum_enc_salt_${userId}`;

const readProfileSalt = async (userId) => {
  const rows = await sb.from('profiles').select('encryption_salt', `&id=eq.${userId}`, '', { strict: true });
  return rows[0]?.encryption_salt || null;
};

// Salt for the login path. Returns the salt stored on the profile, creating
// one only when the read succeeded and found none. The new salt is written,
// then read back; if it isn't confirmed saved this throws, so no key is ever
// derived from a salt that another device couldn't reproduce.
export async function ensurePersistedSalt(userId) {
  let salt = await readProfileSalt(userId); // throws on a failed read — never treat that as "no salt"
  if (!salt) {
    // Prefer a browser-local salt: notes may already be encrypted with it (the
    // old login wrote the salt fire-and-forget, so the server copy can be missing).
    const candidate = localStorage.getItem(saltStorageName(userId)) || await generateSalt();
    await sb.from('profiles').upsert({ id: userId, encryption_salt: candidate }, 'id');
    salt = await readProfileSalt(userId);
    if (salt !== candidate) throw new Error("Couldn't save your encryption settings, so notes stay locked. Please sign in again.");
  }
  localStorage.setItem(saltStorageName(userId), salt);
  return salt;
}

// Salt for re-deriving an EXISTING key. Never generates one: a new salt
// could not decrypt anything already stored.
export async function loadSalt(userId) {
  const rows = await sb.from('profiles').select('encryption_salt', `&id=eq.${userId}`, '');
  const salt = rows[0]?.encryption_salt || localStorage.getItem(saltStorageName(userId));
  if (!salt) throw new Error('No encryption salt found for this account.');
  return salt;
}

// Cache the key for this tab so a reload doesn't ask for the password again.
export async function cacheSessionKey(userId, key) {
  try { sessionStorage.setItem(sessionKeyName(userId), await exportKey(key)); }
  catch { /* storage unavailable — key stays in memory for this page only */ }
}

// Derive the key from the password and prove it opens `ciphertext` before
// handing it back. A wrong key must never be used: notes saved with it would
// be unreadable with the right password.
export async function unlockWithPassword(userId, password, ciphertext) {
  const key = await deriveKey(password, await loadSalt(userId));
  if (ciphertext) {
    try { await decrypt(ciphertext, key); }
    catch { throw new Error('Incorrect password.'); }
  }
  await cacheSessionKey(userId, key);
  return key;
}
