// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app

import { sb } from "./supabase";

// Fetches all tracker data for the current user and returns a formatted string
// to inject into the AI system prompt. Called on-demand only when the user's
// message is tracker-related (checked by isTrackerQuery in chat.js).
// Covers both custom trackers (JSONB system) and v1 hardcoded trackers.
// Returns a plain-text summary — never raw JSON in the prompt.

const THIRTY_DAYS_AGO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

export async function fetchTrackerContext(userId) {
  if (!userId) return "";
  const since = THIRTY_DAYS_AGO();

  try {
    const results = await Promise.allSettled([
      // Custom trackers
      sb.from("custom_trackers").select("*", `&user_id=eq.${userId}&archived=eq.false`),
      // tracker_entries has no reliable user_id column (see Calendar.jsx) and stores
      // its date under `logged_at`, so we fetch all entries and scope them
      // client-side by custom_tracker_id — the parent trackers are already
      // user-scoped, which keeps the data private to this user.
      sb.from("tracker_entries").select("*"),
      // v1 trackers
      sb.from("study_sessions").select("*", `&user_id=eq.${userId}&date=gte.${since}`),
      sb.from("applications").select("*", `&user_id=eq.${userId}`),
      sb.from("finance").select("*", `&user_id=eq.${userId}`),
      sb.from("trips").select("*", `&user_id=eq.${userId}`),
      sb.from("vet_visits").select("*", `&user_id=eq.${userId}`),
    ]);

    const [
      customTrackers,
      trackerEntries,
      studySessions,
      applications,
      finance,
      trips,
      vetVisits,
    ] = results.map(r => (r.status === "fulfilled" ? r.value || [] : []));

    const lines = [];
    lines.push(`TRACKER DATA (last 30 days where applicable, today = ${new Date().toISOString().slice(0, 10)}):`);

    // ── Custom trackers ──────────────────────────────────────────────
    // tracker_entries store their field values inside a `data` JSONB blob with
    // schema-specific keys, so there is no single numeric column to sum across
    // arbitrary trackers. We summarise by entry COUNT (matching TrackerHub's own
    // stats) and surface the most recent entry's data verbatim.
    if (customTrackers.length > 0) {
      lines.push("\n[Custom Trackers]");
      const entryDate = e => new Date(e.logged_at || e.date || e.created_at || 0);
      const sinceWeekMs = Date.now() - 7 * 86400000;
      const since30Ms = Date.now() - 30 * 86400000;
      for (const tracker of customTrackers) {
        const entries = trackerEntries.filter(e => e.custom_tracker_id === tracker.id);
        const thisWeek = entries.filter(e => entryDate(e).getTime() >= sinceWeekMs).length;
        const last30 = entries.filter(e => entryDate(e).getTime() >= since30Ms).length;
        const weeklyGoal = tracker.weekly_goal || null;
        lines.push(
          `- ${tracker.label}: ${thisWeek} entries this week` +
          (weeklyGoal ? ` (goal: ${weeklyGoal}/week)` : "") +
          `, ${last30} in last 30 days` +
          `, ${entries.length} total`
        );
        if (entries.length > 0) {
          const last = [...entries].sort((a, b) => entryDate(b) - entryDate(a))[0];
          const when = (last.logged_at || last.date || last.created_at || "").slice(0, 10);
          const detail = last.data && typeof last.data === "object"
            ? Object.entries(last.data).map(([k, v]) => `${k}: ${v}`).join(", ")
            : "";
          lines.push(`  Last logged: ${when}${detail ? ` — ${detail}` : ""}`);
        }
      }
    }

    // ── Study / PMP ──────────────────────────────────────────────────
    if (studySessions.length > 0) {
      const totalHours = studySessions.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
      const weekSessions = studySessions.filter(e => {
        const d = new Date(e.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
      });
      const weekHours = weekSessions.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
      lines.push(`\n[Study / PMP]\n- ${weekHours.toFixed(1)}h this week, ${totalHours.toFixed(1)}h in last 30 days across ${studySessions.length} sessions`);
    }

    // ── Career / Job Applications ────────────────────────────────────
    if (applications.length > 0) {
      const byStatus = applications.reduce((acc, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
      }, {});
      const summary = Object.entries(byStatus).map(([k, v]) => `${v} ${k}`).join(", ");
      lines.push(`\n[Career]\n- ${applications.length} applications total: ${summary}`);
    }

    // ── Finance ──────────────────────────────────────────────────────
    // The finance table has no `type` column — income/expense direction is
    // derived from `category` (income vs everything else), matching Finance.jsx.
    if (finance.length > 0) {
      const income = finance.filter(e => e.category === "income").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
      const expenses = finance.filter(e => e.category !== "income").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
      lines.push(`\n[Finance]\n- ${finance.length} entries: €${income.toFixed(2)} income, €${expenses.toFixed(2)} expenses`);
    }

    // ── Travel ───────────────────────────────────────────────────────
    if (trips.length > 0) {
      const upcoming = trips.filter(t => t.start_date && t.start_date >= new Date().toISOString().slice(0, 10));
      lines.push(`\n[Travel]\n- ${trips.length} trips total, ${upcoming.length} upcoming`);
      for (const t of upcoming.slice(0, 3)) {
        lines.push(`  • ${t.name || t.destination || "Trip"}: ${t.start_date}${t.end_date ? ` → ${t.end_date}` : ""}`);
      }
    }

    // ── Ozzy ─────────────────────────────────────────────────────────
    if (vetVisits.length > 0) {
      const last = vetVisits.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      lines.push(`\n[Ozzy — Golden Retriever]\n- ${vetVisits.length} vet visits on record, last: ${last.date?.slice(0, 10) || "unknown"} (${last.type || last.reason || "check-up"})`);
    }

    return lines.join("\n");
  } catch (err) {
    console.warn("[trackerContext] fetch failed", err);
    return "";
  }
}

// Returns true if the message is likely tracker-related.
// Keeps the detection simple and broad — false positives are fine
// (we just send a bit more context); false negatives mean the AI
// can't answer a question it should be able to.
export function isTrackerQuery(text) {
  const t = (text || "").toLowerCase();
  return /tracker|workout|exercise|study|pmp|hours|session|log|logged|career|job|appli|finance|budget|spend|trip|travel|ozzy|vet|goal|progress|streak|this week|last week|how many|how much|schedule.*based|suggest.*event|add.*event.*tracker|block.*time/.test(t);
}
