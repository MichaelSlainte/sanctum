// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
//
// Getting the notes encryption key: salt lookup, key derivation and unlock.
// The key lives ONLY in memory (CryptoContext state): never in localStorage,
// sessionStorage or IndexedDB, because any XSS could read those. The cost is
// a password prompt after every reload / relaunch.
import { sb, auth } from './supabase.js';
import { deriveKey, decrypt, generateSalt } from './crypto.js';

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

// Does this account use note encryption (has a salt)? Fails closed: if the
// profile can't be read, assume yes, so nothing is written in plaintext.
export async function encryptionEnabled(userId) {
  if (localStorage.getItem(saltStorageName(userId))) return true;
  try { return !!(await readProfileSalt(userId)); }
  catch { return true; }
}

// Salt for re-deriving an EXISTING key. Never generates one: a new salt
// could not decrypt anything already stored. A failed read throws.
export async function loadSalt(userId) {
  const salt = await readProfileSalt(userId) || localStorage.getItem(saltStorageName(userId));
  if (!salt) throw new Error('No encryption salt found for this account.');
  return salt;
}

// Pre-#26-follow-up builds cached the raw key in sessionStorage. Remove any
// leftover copy so it doesn't outlive this change.
export function purgeLegacyKeyCache() {
  try {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith('sanctum_session_key_')) sessionStorage.removeItem(k);
  } catch { /* storage unavailable — nothing to purge */ }
}

// ── Unlock ────────────────────────────────────────────────────────────────
// An unlock = a method that produces a key + a proof that it's the RIGHT key.
// A wrong key must never be used: notes saved with it would be unreadable with
// the right password. To add another method later (e.g. WebAuthn PRF), write a
// `getKey` for it and call unlockWith(getKey, proveByCiphertext(ct)).

// Proof: the key decrypts an existing encrypted note.
export const proveByCiphertext = (ciphertext) => async (key) => {
  try { await decrypt(ciphertext, key); return true; } catch { return false; }
};

export async function unlockWith(getKey, prove, failMessage = "Couldn't unlock your notes.") {
  const key = await getKey();
  if (!(await prove(key))) throw new Error(failMessage);
  return key;
}

// Password method. Proof is the user's newest encrypted note if they have one;
// otherwise (nothing encrypted yet) the auth server must accept the password.
export async function unlockWithPassword({ userId, email, password, ciphertext }) {
  const getKey = async () => deriveKey(password, await loadSalt(userId));
  const prove = ciphertext
    ? proveByCiphertext(ciphertext)
    : async () => !!(await auth.signIn(email, password))?.access_token;
  return unlockWith(getKey, prove, 'Incorrect password.');
}
