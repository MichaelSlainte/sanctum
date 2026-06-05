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
export function parseAction(text) {
  const cleaned = (text || "").replace(/```(?:json)?|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
