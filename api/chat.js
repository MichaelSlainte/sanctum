// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import https from 'https';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// ── Rate limiting ────────────────────────────────────────────────────────────
// Two tiers:
//  1. A cheap in-memory per-IP flood brake (pre-auth). Best-effort and per-instance
//     — its only job is to blunt anonymous bursts before we spend a Supabase auth
//     round-trip on them.
//  2. The real cost control: a per-USER limit on the Anthropic proxy (post-auth),
//     keyed on the validated user id so it can't be dodged by rotating IPs (the old
//     limiter was IP-keyed and per-instance, so it both collided across users behind
//     one NAT and reset on every cold start). Backed by Upstash Redis REST when
//     configured — durable across serverless instances — and falling back to the
//     in-memory counter when it isn't. No SDK: plain fetch, matching the codebase.
const WINDOW_MS = 10 * 60 * 1000;
const WINDOW_S = 10 * 60;
const MAX_PER_USER = 20; // requests per user per window — the cost limit
const MAX_PER_IP = 60;   // coarse anti-flood for unauthenticated bursts

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const memory = new Map();
function memoryLimited(key, max) {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    memory.set(key, { count: 1, start: now });
    return false;
  }
  if (entry.count >= max) return true;
  entry.count++;
  return false;
}

// Durable per-key limit via Upstash REST (INCR, then EXPIRE on the first hit so the
// counter self-clears at the end of the window). Falls back to the in-memory counter
// if Upstash isn't configured or the call fails, so a store outage degrades to
// best-effort limiting rather than taking the AI proxy down.
async function limited(key, max) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return memoryLimited(key, max);
  try {
    const headers = { Authorization: `Bearer ${UPSTASH_TOKEN}` };
    const incrRes = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, { headers });
    const { result } = await incrRes.json();
    if (result === 1) {
      await fetch(`${UPSTASH_URL}/expire/${encodeURIComponent(key)}/${WINDOW_S}`, { headers });
    }
    return result > max;
  } catch (err) {
    console.error('[api/chat] rate-limit store error — falling back to memory', err);
    return memoryLimited(key, max);
  }
}

export default async function handler(req, res) {
  // Allow the primary domain and the Vercel fallback. Access-Control-Allow-Origin
  // can only carry one value, so echo the request origin when it's allowlisted.
  const ALLOWED_ORIGINS = ['https://trysanctum.app', 'https://sanctum-beige.vercel.app'];
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Tier 1 — coarse per-IP flood brake (in-memory, pre-auth, best-effort).
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (memoryLimited(`ip:${ip}`, MAX_PER_IP)) {
    return res.status(429).json({ error: 'Too many requests. Try again in a few minutes.' });
  }

  // JWT validation — must run before the per-user limit so we can key on the user id.
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
    console.error('[api/chat] JWT validation failed', authResponse.status, authData);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Tier 2 — per-user cost control on the Anthropic proxy (durable via Upstash when
  // configured). Keyed on the validated user id, so rotating IPs doesn't help.
  if (await limited(`chat:user:${authData.id}`, MAX_PER_USER)) {
    return res.status(429).json({ error: 'Too many requests. Try again in a few minutes.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No API key' });

  if (!req.headers['content-type']?.includes('application/json')) {
    return res.status(400).json({ error: 'Invalid content type' });
  }

  const { messages, system } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });
  if (messages.length > 20) return res.status(400).json({ error: 'Too many messages' });

  // Cap raised from 5000: the calendar/tracker-aware prompts assemble a large
  // system string (header + up to 30 upcoming events + on-demand tracker context
  // + response rules) that can reach ~7k chars. 5000 silently truncated the
  // RESPONSE RULES tail. 12000 leaves comfortable headroom; ~3k tokens of system
  // prompt is negligible for Haiku.
  const safeSystem = (system || 'You are a helpful personal assistant.').slice(0, 12000);
  const safeMessages = messages
    .filter(m => m.role && m.content)
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content).slice(0, 2000),
    }))
    .slice(-10);

  if (safeMessages.length === 0) return res.status(400).json({ error: 'No valid messages' });

  const payload = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: safeSystem,
    messages: safeMessages,
  });

  return new Promise((resolve) => {
    const req2 = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (r) => {
      let data = '';
      r.on('data', c => { data += c; });
      r.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (r.statusCode === 401 || r.statusCode === 403) {
            console.error('[api/chat] Anthropic auth error', r.statusCode, parsed);
            res.status(502).json({ error: 'AI service unavailable' });
          } else {
            res.status(r.statusCode).json(parsed);
          }
        } catch { res.status(500).json({ error: 'Bad response' }); }
        resolve();
      });
    });
    req2.on('error', e => { res.status(500).json({ error: e.message }); resolve(); });
    req2.write(payload);
    req2.end();
  });
}
