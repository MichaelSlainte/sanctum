// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { auth } from "./supabase";

// Shared transport for the AI proxy (api/chat). Every /api/chat call site routes
// through here so auth headers, error handling, and response shape stay in one
// place instead of drifting per call site.
//
// callAI({ system, messages, retryOn401 }) -> string
//   - Always sends the Authorization bearer from localStorage.
//   - retryOn401: on a 401, refresh the session once and retry the request.
//   - Throws on a non-ok response (the thrown Error carries `.status` so callers
//     can branch on it). Returns the assistant text, trimmed.
export async function callAI({ system, messages, retryOn401 = false }) {
  const doFetch = () => fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("sanctum_token") || ""}`,
    },
    body: JSON.stringify({ system, messages }),
  });
  let res = await doFetch();
  if (retryOn401 && res.status === 401) {
    const refreshed = await auth.refreshSession();
    if (refreshed) res = await doFetch();
  }
  if (!res.ok) {
    const err = new Error(`callAI: /api/chat responded ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return (data.content?.[0]?.text || "").trim();
}

// parseAction(text) -> object | null
//   Strips markdown code fences and attempts JSON.parse. Returns null (never
//   throws) when the reply is not JSON — callers decide what null means
//   (conversational text for the bars, hard error for TrackerCreator).
//
//   Tolerant of JSON mixed with prose: the model sometimes returns an action
//   object followed (or preceded) by a sentence like "I've added that". The
//   fast path parses the whole cleaned string; if that fails we extract the
//   first balanced {...} object and parse only that.
//
//   Handled cases:
//     '{"action":"navigate","page":"home"}'              -> { action:'navigate', ... }
//     '```json\n{"action":"navigate"}\n```'              -> { action:'navigate' }
//     '{"action":"add_event","title":"x"} I added it.'   -> { action:'add_event', ... }
//     'Sure! {"action":"add_task","text":"buy milk"}'    -> { action:'add_task', ... }
//     'just a chat reply, no json'                       -> null
export function parseAction(text) {
  const cleaned = (text || "").replace(/```(?:json)?|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Clean JSON-array reply (e.g. several add_event objects batched). The
    // object-only brace scanner below would return just the first {...}, so try
    // parsing the whole string as an array first when it clearly starts as one.
    if (cleaned.startsWith("[")) {
      try { return JSON.parse(cleaned); } catch { /* fall through to brace scan */ }
    }
    // Fast path failed (e.g. trailing/leading prose). Find the first balanced
    // top-level {...} by scanning, respecting strings and escapes so braces
    // inside string values don't throw off the depth count.
    const start = cleaned.indexOf("{");
    if (start === -1) return null;
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
      } else if (ch === '"') {
        inStr = true;
      } else if (ch === "{") {
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(cleaned.slice(start, i + 1));
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }
}

// Re-export tracker helpers so callers only need one import from this module.
export { fetchTrackerContext, isTrackerQuery } from "./trackerContext";
