// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app

// Deletes the caller's Supabase auth user. The client wipes its own data rows
// first (Settings.deleteAllData), then calls this endpoint while still
// authenticated so we can validate the JWT and remove the matching auth record.
// The admin delete requires the service role key, which must stay server-side.

export default async function handler(req, res) {
  // Allow the primary domain and the Vercel fallback. Access-Control-Allow-Origin
  // can only carry one value, so echo the request origin when it's allowlisted.
  const ALLOWED_ORIGINS = ['https://trysanctum.app', 'https://sanctum-beige.vercel.app'];
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  // JWT validation — same pattern as api/chat.js. Identifies the caller so we
  // only ever delete the auth user that owns the supplied token.
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const authResponse = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  const authData = await authResponse.json();
  if (!authResponse.ok || !authData?.id) {
    console.error('[api/delete-account] JWT validation failed', authResponse.status, authData);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = authData.id;

  // Admin delete — requires the service role key (not the anon key).
  const deleteResponse = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });

  if (!deleteResponse.ok) {
    const body = await deleteResponse.text().catch(() => '');
    console.error('[api/delete-account] admin delete failed', deleteResponse.status, body);
    return res.status(500).json({ error: 'Failed to delete auth user' });
  }

  return res.status(200).json({ ok: true });
}
