// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import https from 'https';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Simple in-memory rate limiter — 20 requests per IP per 10 minutes
const rateLimits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    rateLimits.set(ip, { count: 1, start: now });
    return false;
  }
  if (entry.count >= MAX_REQUESTS) return true;
  entry.count++;
  rateLimits.set(ip, entry);
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://sanctum-beige.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again in a few minutes.' });
  }

  // JWT validation
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
