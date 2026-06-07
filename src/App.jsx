// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { useState, useEffect, useRef } from "react";
import "./styles/base.css";
import { auth, sb } from "./lib/supabase";
import { callAI, parseAction, fetchTrackerContext, isTrackerQuery } from "./lib/chat";
import { useCrypto } from "./lib/CryptoContext.jsx";
import { deriveKey, generateSalt, exportKey, importKey } from "./lib/crypto.js";
import { Icon } from "./components/shared";
import Home from "./components/Home";
import Notes from "./components/Notes";
import Calendar from "./components/Calendar";
import Settings from "./components/Settings";
import Study from "./components/trackers/Study";
import Ozzy from "./components/trackers/Ozzy";
import Travel from "./components/trackers/Travel";
import Career from "./components/trackers/Career";
import Finance from "./components/trackers/Finance";
import TrackerHub, { TrackerBackBar, OWNER_IDS } from "./components/trackers/TrackerHub";

// ─── LOGIN ───────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");

  const attempts = useRef(0);
  const lockUntil = useRef(0);

  const SUPABASE_URL = "https://hqlgwisfkkosgekotojz.supabase.co";
  // Supabase publishable/anon key — safe to expose in frontend. Security enforced by RLS policies.
  const SUPABASE_KEY = "sb_publishable_Eky9AvrbiYjejxogwxwJ6Q_x7eoySQ4";

  const handle = async () => {
    if (Date.now() < lockUntil.current) {
      const secs = Math.ceil((lockUntil.current - Date.now()) / 1000);
      return setError(`Too many attempts. Try again in ${secs}s.`);
    }
    if (!email || !password) return setError("Please enter your email and password.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    // Beta allowlist — only these emails can access Sanctum
    const BETA_EMAILS = [
      'eng.michaelmarques@outlook.com',
      'eng.michaelmarques@gmail.com',
      'tamaralechner4@gmail.com',
    ];
    if (!BETA_EMAILS.includes(email.trim().toLowerCase())) {
      setError('Sanctum is currently in private beta. Request access at hello@trysanctum.app');
      setLoading(false);
      return;
    }
    setLoading(true); setError("");
    try {
      const data = mode === "login" ? await auth.signIn(email, password) : await auth.signUp(email, password);
      if (data.access_token) {
        attempts.current = 0;
        auth.saveSession(data);
        onLogin(data.user, password);
      } else if (data.id && mode === "signup") {
        setError("Account created. Check your email to confirm, then sign in.");
        setMode("login");
      } else {
        attempts.current += 1;
        if (attempts.current >= 5) {
          lockUntil.current = Date.now() + 30000;
          attempts.current = 0;
          setError("Too many failed attempts. Locked for 30 seconds.");
        } else {
          setError(data.error_description || data.message || "Invalid email or password.");
        }
      }
    } catch { setError("Connection error. Try again."); }
    setLoading(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-box animate-in">
        <div className="login-logo">
          <img src="/icon.svg?v=3" alt="Sanctum" style={{ width: 64, height: 64, borderRadius: '50%' }} />
          <div className="login-name">Sanctum</div>
        </div>
        <div className="login-title">{mode === "login" ? "Welcome back" : "Create account"}</div>
        <div className="login-sub">{mode === "login" ? "Sign in to your private space" : "Set up your Sanctum"}</div>
        {error && <div className="login-error">{error}</div>}
        <div className="form-row">
          <label className="form-label">Email</label>
          <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com" onKeyDown={e => e.key === "Enter" && handle()} autoFocus />
        </div>
        <div className="form-row">
          <label className="form-label">Password</label>
          <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handle()} />
        </div>
        <button className="btn primary" style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: 8 }}
          onClick={handle} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "var(--t3)" }}>
          {mode === "login" && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button className="btn ghost" style={{ fontSize: 12, color: "var(--t3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                onClick={async () => {
                  if (!email) return setError("Enter your email address first, then click forgot password.");
                  setLoading(true); setError("");
                  try {
                    const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
                      method: "POST",
                      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
                      body: JSON.stringify({ email })
                    });
                    if (res.ok) setError("✓ Password reset email sent. Check your inbox.");
                    else setError("Could not send reset email. Check the address and try again.");
                  } catch { setError("Connection error. Try again."); }
                  setLoading(false);
                }}>
                Forgot password?
              </button>
            </div>
          )}
          <span style={{ color: "var(--blue)", cursor: "pointer", fontWeight: 600 }}
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
            {mode === "login" ? "Create one" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "home",     label: "Home",     icon: "home" },
  { id: "notes",    label: "Notes",    icon: "notes" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "trackers", label: "Trackers", icon: "trackers" },
  { id: "settings", label: "Settings", icon: "settings" },
];
const TITLES = {
  home: "Home", notes: "Notes", calendar: "Calendar", settings: "Settings",
  trackers: "Trackers", study: "Study", pet: "Ozzy", travel: "Travel", career: "Career", finance: "Finance",
};
const TRACKER_PAGES = ["study", "pet", "travel", "career", "finance"];
const TRACKER_ITEMS = [
  { id: "study",   label: "Study",   icon: "study"   },
  { id: "career",  label: "Career",  icon: "career"  },
  { id: "finance", label: "Finance", icon: "finance" },
  { id: "travel",  label: "Travel",  icon: "travel"  },
  { id: "pet",     label: "Ozzy",    icon: "pet"     },
];


// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { setKey: setCryptoKey, setKeyLoading } = useCrypto();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [calDate, setCalDate] = useState(null);
  const [globalAIInput, setGlobalAIInput] = useState('');
  const [globalAILoading, setGlobalAILoading] = useState(false);
  const [globalAIResponse, setGlobalAIResponse] = useState(null);
  const globalAIRef = useRef(null);
  const [mobileAIOpen, setMobileAIOpen] = useState(false);
  const panelSwipe = useRef({ startY: 0 });
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [globalAIHistory, setGlobalAIHistory] = useState([]);
  const [customTrackers, setCustomTrackers] = useState([]);
  const [openCustomSignal, setOpenCustomSignal] = useState(null);
  const [closeCustomSignal, setCloseCustomSignal] = useState(0);

  // Load custom trackers on startup so sidebar is populated immediately on login
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const data = await sb.from('custom_trackers').select('*');
        if (Array.isArray(data)) {
          setCustomTrackers(data.filter(t => t.archived !== true && t.user_id === user.id));
        }
      } catch {}
    };
    load();
  }, [user]);

  // Draggable AI FAB position (right-based)
  const [fabPos, setFabPos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sanctum_ai_btn_pos"));
      // Migrate old left-based saves to right-based
      if (saved && saved.left != null && saved.right == null) {
        return { bottom: 80, right: 16 };
      }
      return saved || { bottom: 80, right: 16 };
    }
    catch { return { bottom: 80, right: 16 }; }
  });
  const fabDrag = useRef({ active: false, startTouchX: 0, startTouchY: 0, startRight: 16, startBottom: 80 });

  const [theme, setTheme] = useState(() => localStorage.getItem("sanctum_theme") || "dark");
  const [font, setFont] = useState(() => localStorage.getItem("sanctum_font") || "default");

  const FONT_MAP = {
    default: "'Inter', system-ui, sans-serif",
    sans: "system-ui, -apple-system, sans-serif",
    mono: "'Courier New', Courier, monospace",
    dyslexic: "Arial, Verdana, sans-serif",
  };

  const applyTheme = (t) => {
    localStorage.setItem("sanctum_theme", t);
    document.documentElement.setAttribute("data-theme", t);
    setTheme(t);
  };

  const applyFont = (f) => {
    const family = FONT_MAP[f] || FONT_MAP.default;
    localStorage.setItem("sanctum_font", f);
    document.body.style.fontFamily = family;
    document.documentElement.style.setProperty("--sans", family);
    setFont(f);
  };

  const sendGlobalAI = async () => {
    if (!globalAIInput.trim() || globalAILoading) return;
    const userMsg = globalAIInput.trim();
    setGlobalAIInput('');
    setGlobalAILoading(true);
    setGlobalAIResponse({ text: 'Thinking...', type: 'loading' });
    try {
      const todayISO = new Date().toISOString().slice(0, 10);
      const sixtyISO = new Date(Date.now() + 60*86400000).toISOString().slice(0, 10);
      // Calendar-aware FAB: give the model the user's upcoming events so it can
      // resolve a natural-language reference to a real event_id. We merge two
      // fetches because a recurring series' master row keeps its ORIGINAL (often
      // past) creation date, so a date>=today window alone would miss every
      // long-standing recurring event — the common case, not an edge case.
      //   1. one-off / near-term events in the today → +60d window (max 25)
      //   2. ALL recurring series regardless of their (past) master date
      // Then dedupe by id and drop series that have already fully ended before today.
      // Skipped on Trackers (that bar is for tracker creation).
      let upcomingList = '(no upcoming events in the next 60 days)';
      if (page !== 'trackers') {
        const cols = 'id,title,date,start_time,repeat,repeat_end,repeat_end_date,repeat_deleted_from';
        const [windowed, recurring] = await Promise.all([
          sb.from('events').select(cols, `&date=gte.${todayISO}&date=lte.${sixtyISO}&limit=25`, 'date.asc'),
          sb.from('events').select(cols, `&repeat=neq.none&limit=50`, 'date.asc'),
        ]);
        const byId = new Map();
        for (const e of [...(Array.isArray(windowed) ? windowed : []), ...(Array.isArray(recurring) ? recurring : [])]) {
          byId.set(e.id, e);
        }
        const isRecurring = e => e.repeat && e.repeat !== 'none';
        const endedBeforeToday = e =>
          isRecurring(e) && (
            (e.repeat_end === 'until' && e.repeat_end_date && e.repeat_end_date < todayISO) ||
            (e.repeat_deleted_from && e.repeat_deleted_from < todayISO)
          );
        const merged = [...byId.values()]
          .filter(e => !endedBeforeToday(e))
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
          .slice(0, 30);
        if (merged.length) {
          upcomingList = merged.map(e =>
            `- id=${e.id} | "${e.title}" | ${e.date}${e.start_time ? ' ' + e.start_time : ''}${isRecurring(e) ? ` | repeats ${e.repeat}` : ''}`
          ).join('\n');
        }
      }
      // Load tracker context on-demand — only when the query is tracker-related.
      // This keeps non-tracker queries fast and avoids sending unnecessary data.
      let trackerContext = "";
      if (isTrackerQuery(userMsg)) {
        trackerContext = await fetchTrackerContext(user?.id);
      }

      const sys = `You are Sanctum AI, a personal assistant embedded in a private life organiser app.
Today is ${todayISO}. User: Michael, Dublin, Ireland.
When user mentions dates, always convert to ISO format YYYY-MM-DD in your JSON response.
Examples: "tomorrow" = ${new Date(Date.now()+86400000).toISOString().slice(0,10)}, "next week" = ${new Date(Date.now()+7*86400000).toISOString().slice(0,10)}.
For "next Monday", "this Friday" etc., compute the actual upcoming date.
The user's upcoming events (use the EXACT id when updating or deleting one):
${upcomingList}
${trackerContext ? `\n${trackerContext}\n` : ""}
RESPONSE RULES — choose one format only:
- Navigate → reply ONLY with valid JSON, no markdown: {"action":"navigate","page":"home|notes|calendar|settings"}
- Log study session → reply ONLY with valid JSON, no markdown: {"action":"log_study","hours":2,"topic":"Integration Management","notes":"optional"}
- Add calendar event → reply ONLY with valid JSON, no markdown: {"action":"add_event","title":"Event title","date":"${todayISO}","start_time":"09:00","end_time":"10:00","category":"personal","notes":"optional notes"}
  To schedule multiple events, reply with a JSON array of add_event objects.
  category must be one of: personal, career, travel, study, family
  Recurrence (OMIT all of these for a normal one-off event): add "repeat":"daily|weekly|monthly|yearly|custom". Map "every day"→daily, "every Monday"/"weekly"→weekly, "every month"→monthly, "every year"→yearly. For an interval like "every 2 weeks" or "every 3 days" use "repeat":"custom" with "repeat_custom_interval":2 and "repeat_custom_unit":"day|week|month|year" (singular). To bound a series add "repeat_end":"until" with "repeat_end_date":"YYYY-MM-DD", or "repeat_end":"count" with "repeat_end_count":N; if open-ended use "repeat_end":"forever".
- Update calendar event → reply ONLY with valid JSON, no markdown: {"action":"update_event","event_id":"<id from the list above>","scope":"this|this_and_future|all","occurrence_date":"YYYY-MM-DD","title":"New title","date":"YYYY-MM-DD","start_time":"HH:mm","end_time":"HH:mm","all_day":false,"location":"...","category":"personal"}
  Include ONLY the fields being changed (always with event_id and scope). "date" is the NEW date; "occurrence_date" is which instance you are targeting.
- Delete calendar event → reply ONLY with valid JSON, no markdown: {"action":"delete_event","event_id":"<id from the list above>","scope":"this|this_and_future|all","occurrence_date":"YYYY-MM-DD"}
RECURRENCE SCOPE: "this" = only that one date, "this_and_future" = that date onward, "all" = the whole series. scope and occurrence_date only matter when the target event repeats. If the user asks to change or delete a RECURRING event and has NOT made clear whether they mean just that occurrence, this and future, or the entire series, DO NOT guess and DO NOT output tool JSON — reply in plain text asking which they mean. Never default to "all".
- Tracker queries → answer in plain conversational text using the TRACKER DATA above. You may also offer to add a calendar event if relevant (e.g. "Want me to schedule a workout for tomorrow?"). If the user says yes, output the add_event JSON.
- All other queries → plain conversational text, warm but concise, max 2 sentences. No JSON.`;
      const newHistory = [...globalAIHistory, { role: 'user', content: userMsg }];
      const reply = await callAI({ system: sys, messages: newHistory });
      try {
        const cleaned = reply.replace(/```(?:json)?|```/g, '').trim();
        // Support an array of actions (e.g. the AI schedules several events at once).
        // Non-event actions use the first; add_event loops over every entry below.
        const rawAction = parseAction(reply);
        const actions = Array.isArray(rawAction) ? rawAction : (rawAction ? [rawAction] : null);
        if (!actions || actions.length === 0) throw new Error('non-json');
        const action = actions[0];
        if (!action || !action.action) throw new Error('non-json');
        const parseDate = (dateStr) => {
          if (!dateStr) return todayISO;
          const d = new Date(dateStr);
          if (!isNaN(d)) return d.toISOString().slice(0, 10);
          return todayISO;
        };
        if (action.action === 'navigate') {
          setGlobalAIHistory([]);
          setGlobalAIResponse({ text: `Opening ${action.page}...`, type: 'success' });
          setTimeout(() => navigate(action.page), 400);
        } else if (action.action === 'log_study') {
          setGlobalAIHistory([]);
          await sb.from('study_sessions').insert({
            hours: parseFloat(action.hours),
            topic: action.topic,
            notes: action.notes || '',
            date: todayISO,
            type: 'pmp',
            user_id: user?.id,
          });
          await sb.from('events').insert({
            title: `PMP Study — ${action.topic}`,
            date: todayISO,
            start_time: null,
            end_time: null,
            category: 'study',
            color: '#8b5cf6',
            notes: `${action.hours}h logged`,
            user_id: user?.id,
          });
          setCalendarRefreshKey(k => k + 1);
          setGlobalAIResponse({ text: `Logged ${action.hours}h — ${action.topic} ✓\nAdded to calendar`, type: 'success' });
        } else if (action.action === 'add_event') {
          setGlobalAIHistory([]);
          // Insert every add_event in the array (the AI may schedule several at once).
          const events = actions.filter(a => a && a.action === 'add_event');
          for (const ev of events) {
            const repeat = ev.repeat || 'none';
            const recurring = repeat !== 'none';
            await sb.from('events').insert({
              title: ev.title,
              date: parseDate(ev.date) || todayISO,
              start_time: ev.start_time || null,
              end_time: ev.end_time || null,
              category: ev.category || 'personal',
              color: '#388bfd',
              notes: ev.notes || '',
              repeat,
              repeat_end:             recurring ? (ev.repeat_end || 'forever') : null,
              repeat_end_date:        recurring && ev.repeat_end === 'until' ? (ev.repeat_end_date || null) : null,
              repeat_end_count:       recurring && ev.repeat_end === 'count' ? (ev.repeat_end_count || 10) : null,
              repeat_custom_interval: repeat === 'custom' ? (ev.repeat_custom_interval || 2) : null,
              repeat_custom_unit:     repeat === 'custom' ? (ev.repeat_custom_unit || 'week') : null,
              user_id: user?.id,
            });
          }
          setCalendarRefreshKey(k => k + 1);
          setGlobalAIResponse({
            text: events.length === 1
              ? `Added to calendar: "${events[0].title}" on ${parseDate(events[0].date)}`
              : `Added ${events.length} events to your calendar ✓`,
            type: 'success',
          });
        } else if (action.action === 'delete_event') {
          setGlobalAIHistory([]);
          const rows = await sb.from('events').select('*', `&id=eq.${action.event_id}`, '');
          const ev = Array.isArray(rows) ? rows[0] : null;
          if (!ev) {
            setGlobalAIResponse({ text: "I couldn't find that event.", type: 'error' });
          } else {
            const recurring = ev.repeat && ev.repeat !== 'none';
            const scope = action.scope || 'all';
            if (!recurring || scope === 'all') {
              await sb.from('events').delete({ id: ev.id });
              setGlobalAIResponse({ text: `Deleted "${ev.title}".`, type: 'success' });
            } else if (scope === 'this') {
              const occ = action.occurrence_date ? parseDate(action.occurrence_date) : ev.date;
              const exceptions = [...(Array.isArray(ev.exceptions) ? ev.exceptions : []), occ];
              await sb.from('events').update({ exceptions }, { id: ev.id });
              setGlobalAIResponse({ text: `Deleted the ${occ} occurrence of "${ev.title}".`, type: 'success' });
            } else {
              const occ = action.occurrence_date ? parseDate(action.occurrence_date) : ev.date;
              await sb.from('events').update({ repeat_deleted_from: occ }, { id: ev.id });
              setGlobalAIResponse({ text: `Deleted "${ev.title}" from ${occ} onward.`, type: 'success' });
            }
            setCalendarRefreshKey(k => k + 1);
          }
        } else if (action.action === 'update_event') {
          setGlobalAIHistory([]);
          const rows = await sb.from('events').select('*', `&id=eq.${action.event_id}`, '');
          const ev = Array.isArray(rows) ? rows[0] : null;
          if (!ev) {
            setGlobalAIResponse({ text: "I couldn't find that event.", type: 'error' });
          } else {
            const recurring = ev.repeat && ev.repeat !== 'none';
            const scope = action.scope || 'all';
            const edits = {};
            if (action.title != null)            edits.title = action.title;
            if (action.date != null)             edits.date = parseDate(action.date);
            if (action.start_time !== undefined) edits.start_time = action.start_time || null;
            if (action.end_time !== undefined)   edits.end_time = action.end_time || null;
            if (action.all_day !== undefined)    edits.all_day = !!action.all_day;
            if (action.location !== undefined)   edits.location = action.location || null;
            if (action.category != null)         edits.category = action.category;
            // Fields copied onto any new standalone/split row so it stays intact
            const carry = {
              title: ev.title, category: ev.category, color: ev.color,
              start_time: ev.start_time, end_time: ev.end_time, timezone: ev.timezone,
              location: ev.location, notes: ev.notes, all_day: ev.all_day,
            };
            if (!recurring || scope === 'all') {
              await sb.from('events').update(edits, { id: ev.id });
              setGlobalAIResponse({ text: `Updated "${edits.title || ev.title}".`, type: 'success' });
            } else if (scope === 'this') {
              const occ = action.occurrence_date ? parseDate(action.occurrence_date) : ev.date;
              const exceptions = [...(Array.isArray(ev.exceptions) ? ev.exceptions : []), occ];
              await sb.from('events').update({ exceptions }, { id: ev.id });
              await sb.from('events').insert({ ...carry, ...edits, date: edits.date || occ, repeat: 'none', user_id: user?.id });
              setGlobalAIResponse({ text: `Updated the ${occ} occurrence of "${ev.title}".`, type: 'success' });
            } else {
              const occ = action.occurrence_date ? parseDate(action.occurrence_date) : ev.date;
              // End the original series the day BEFORE the split so the new series'
              // start date (occ) isn't shown twice (expander includes <= repeat_end_date).
              const dayBefore = new Date(new Date(occ + 'T00:00:00').getTime() - 86400000).toISOString().slice(0, 10);
              await sb.from('events').update({ repeat_end: 'until', repeat_end_date: dayBefore }, { id: ev.id });
              await sb.from('events').insert({
                ...carry, ...edits, date: edits.date || occ,
                repeat: ev.repeat,
                repeat_end: ev.repeat_end || 'forever',
                repeat_end_date: ev.repeat_end_date || null,
                repeat_end_count: ev.repeat_end_count || null,
                repeat_custom_interval: ev.repeat_custom_interval || null,
                repeat_custom_unit: ev.repeat_custom_unit || null,
                user_id: user?.id,
              });
              setGlobalAIResponse({ text: `Updated "${ev.title}" from ${occ} onward.`, type: 'success' });
            }
            setCalendarRefreshKey(k => k + 1);
          }
        } else {
          setGlobalAIHistory([...newHistory, { role: 'assistant', content: reply }]);
          setGlobalAIResponse({ text: cleaned, type: 'text' });
        }
      } catch {
        setGlobalAIHistory([...newHistory, { role: 'assistant', content: reply }]);
        setGlobalAIResponse({ text: reply || 'Got it.', type: 'text' });
      }
    } catch {
      setGlobalAIResponse({ text: 'Connection error. Check your network.', type: 'error' });
    }
    setGlobalAILoading(false);
  };

  // Page state — map legacy page names on restore
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem("sanctum_page");
    if (!saved || ["dashboard", "ai"].includes(saved)) return "home";
    if (["home","notes","calendar","settings","trackers","study","pet","travel","career","finance"].includes(saved)) return saved;
    return "home";
  });

  // Sidebar nav ordering
  const NAV_IDS = NAV.map(n => n.id);
  const [navOrder, setNavOrder] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("sanctum_nav_order"));
      if (Array.isArray(s)) {
        const filtered = s.filter(id => NAV_IDS.includes(id));
        const withMissing = [...filtered, ...NAV_IDS.filter(id => !filtered.includes(id))];
        if (withMissing.length === NAV_IDS.length) {
          localStorage.setItem("sanctum_nav_order", JSON.stringify(withMissing));
          return withMissing;
        }
      }
    } catch {}
    return NAV_IDS;
  });
  const [navDragOver, setNavDragOver] = useState(null);
  const [navDragging, setNavDragging] = useState(null);
  const navDragId = useRef(null);

  const [trackersExpanded, setTrackersExpanded] = useState(() =>
    localStorage.getItem("sanctum_trackers_expanded") === "true"
  );
  const toggleTrackersExpanded = () => {
    setTrackersExpanded(v => {
      const next = !v;
      localStorage.setItem("sanctum_trackers_expanded", String(next));
      return next;
    });
  };

  const [archivedTrackers, setArchivedTrackers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sanctum_archived_trackers")) || []; }
    catch { return []; }
  });
  const archiveTracker = (id) => setArchivedTrackers(prev => {
    const next = [...new Set([...prev, id])];
    localStorage.setItem("sanctum_archived_trackers", JSON.stringify(next));
    return next;
  });
  const unarchiveTracker = (id) => setArchivedTrackers(prev => {
    const next = prev.filter(x => x !== id);
    localStorage.setItem("sanctum_archived_trackers", JSON.stringify(next));
    return next;
  });

  const onNavDragStart = (e, id) => {
    navDragId.current = id; setNavDragging(id); e.dataTransfer.effectAllowed = "move";
  };
  const onNavDragOver = (e, id) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
    if (id !== navDragId.current) setNavDragOver(id);
  };
  const onNavDragLeave = (e, id) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setNavDragOver(prev => prev === id ? null : prev);
  };
  const onNavDrop = (e, id) => {
    e.preventDefault();
    if (!navDragId.current || navDragId.current === id) { setNavDragOver(null); return; }
    setNavOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(navDragId.current), to = next.indexOf(id);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1); next.splice(to, 0, navDragId.current);
      localStorage.setItem("sanctum_nav_order", JSON.stringify(next));
      return next;
    });
    setNavDragOver(null); setNavDragging(null); navDragId.current = null;
  };
  const onNavDragEnd = () => { setNavDragOver(null); setNavDragging(null); navDragId.current = null; };

  const navigate = (p) => {
    setPage(p);
    localStorage.setItem("sanctum_page", p);
  };

  const goToCalendarDay = (date) => {
    setCalDate(date);
    navigate("calendar");
  };

  useEffect(() => {
    // Apply saved font immediately on mount
    const savedFont = localStorage.getItem("sanctum_font") || "default";
    const savedFamily = FONT_MAP[savedFont] || FONT_MAP.default;
    document.body.style.fontFamily = savedFamily;
    document.documentElement.style.setProperty("--sans", savedFamily);

    const init = async () => {
      let session = auth.getSession();
      if (!session) {
        const refreshed = await auth.refreshSession();
        if (refreshed) session = auth.getSession();
      }
      if (session) {
        setUser(session.user);
        // Restore encryption key from sessionStorage (set at login, survives page reloads)
        const SESSION_KEY = `sanctum_session_key_${session.user.id}`;
        const exportedKey = sessionStorage.getItem(SESSION_KEY);
        if (exportedKey) {
          try {
            const key = await importKey(exportedKey);
            setCryptoKey(key);
          } catch (e) {
            console.error('[init] key restore failed:', e);
          }
        }
        // Fetch display_name from profiles table — takes priority over user_metadata
        try {
          const profile = await sb.from("profiles").select("display_name,timezone", `&id=eq.${session.user.id}`, "");
          if (Array.isArray(profile) && profile[0]?.display_name) {
            const key = `sanctum_display_name_${session.user.id}`;
            localStorage.setItem(key, profile[0].display_name);
            setProfileName(profile[0].display_name);
          }
        } catch {}
      }
      setChecking(false);
    };
    init();
    // Auto-refresh every 45 minutes
    const interval = setInterval(async () => {
      const session = auth.getSession();
      const expiry = parseInt(localStorage.getItem("sanctum_expiry") || "0");
      if (session && Date.now() > expiry - 300000) await auth.refreshSession();
    }, 45 * 60 * 1000);

    // Proactive refresh when user returns to the tab after an absence
    const handleVisibility = async () => {
      if (document.visibilityState === "visible") {
        const expiry = parseInt(localStorage.getItem("sanctum_expiry") || "0");
        if (localStorage.getItem("sanctum_token") && Date.now() > expiry - 300000) {
          await auth.refreshSession();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (!checking && !user) localStorage.removeItem("sanctum_page");
  }, [user, checking]);

  const handleLogin = async (u, password) => {
    setUser(u);

    // Step 1: fetch profile (best-effort — never blocks key derivation)
    let profileSalt = null;
    try {
      const profile = await sb.from("profiles").select("display_name,timezone,encryption_salt", `&id=eq.${u.id}`, "");
      if (Array.isArray(profile) && profile[0]?.display_name) {
        localStorage.setItem(`sanctum_display_name_${u.id}`, profile[0].display_name);
        setProfileName(profile[0].display_name);
      } else {
        // No display_name in profiles — derive from email and persist
        const derived = u.email?.split('@')[0] || '';
        if (derived) {
          localStorage.setItem(`sanctum_display_name_${u.id}`, derived);
          setProfileName(derived);
          sb.from("profiles").upsert({ id: u.id, display_name: derived }, "id").catch(() => {});
        }
      }
      if (Array.isArray(profile) && profile[0]?.encryption_salt) {
        profileSalt = profile[0].encryption_salt;
      }
    } catch (err) {
      console.error('[handleLogin] profile fetch error:', err);
    }

    // Step 2: derive encryption key — always runs, independent of profile fetch
    if (password) {
      setKeyLoading(true);
      const SALT_LS_KEY = `sanctum_enc_salt_${u.id}`;
      const SESSION_KEY = `sanctum_session_key_${u.id}`;
      // Priority: Supabase profile → localStorage → generate new
      let salt = profileSalt || localStorage.getItem(SALT_LS_KEY);
      if (!salt) {
        salt = await generateSalt();
        // Try profiles table (needs encryption_salt column — see SQL note in commit)
        sb.from("profiles").update({ encryption_salt: salt }, { id: u.id }).catch(() => {});
      }
      // Always persist salt locally so the same key is derived on every login in this browser
      localStorage.setItem(SALT_LS_KEY, salt);
      try {
        const key = await deriveKey(password, salt);
        // Persist key in sessionStorage so page reloads don't lose it
        const exported = await exportKey(key);
        sessionStorage.setItem(SESSION_KEY, exported);
        setCryptoKey(key);
      } catch (keyErr) {
        console.error('[handleLogin] key derivation failed:', keyErr);
      } finally {
        setKeyLoading(false);
      }
    }
  };
  const handleLogout = async () => { await auth.signOut(); setUser(null); setProfileName(""); setPage("home"); localStorage.removeItem("sanctum_page"); };

  const onFabTouchStart = (e) => {
    const t = e.touches[0];
    fabDrag.current = { active: true, startTouchX: t.clientX, startTouchY: t.clientY, startRight: fabPos.right, startBottom: fabPos.bottom };
  };
  const onFabTouchMove = (e) => {
    if (!fabDrag.current.active) return;
    e.preventDefault();
    const t = e.touches[0];
    const right = Math.max(0, Math.min(window.innerWidth - 52, fabDrag.current.startRight - (t.clientX - fabDrag.current.startTouchX)));
    const bottom = Math.max(80, Math.min(window.innerHeight - 52, fabDrag.current.startBottom - (t.clientY - fabDrag.current.startTouchY)));
    setFabPos({ right, bottom });
  };
  const onFabTouchEnd = () => {
    fabDrag.current.active = false;
    setFabPos(pos => { localStorage.setItem("sanctum_ai_btn_pos", JSON.stringify(pos)); return pos; });
  };

  if (checking) return null;
  if (!user) return <Login onLogin={handleLogin} />;

  const email = user?.email || "";
  const username = email.split("@")[0];
  const isOwner = OWNER_IDS.includes(user?.id);

  const renderPage = () => {
    if (!user) return null;
    if (page === "home") return <Home user={user} onNavigate={navigate} onGoToCalendarDay={goToCalendarDay} displayName={displayName} />;
    if (page === "notes") return <Notes user={user} />;
    if (page === "calendar") return <Calendar user={user} initialDate={calDate} refreshKey={calendarRefreshKey} />;
    if (page === "settings") return <Settings user={user} onLogout={handleLogout} theme={theme} onThemeChange={applyTheme} font={font} onFontChange={applyFont} sb={sb} />;
    // Non-owners never reach the v1 tracker pages; they land back on the hub.
    if (page === "trackers" || (!isOwner && TRACKER_PAGES.includes(page)))
      return <TrackerHub user={user} archivedTrackers={archivedTrackers} onArchive={archiveTracker} onUnarchive={unarchiveTracker} onNavigate={navigate} onCustomTrackersLoad={setCustomTrackers} openCustomSignal={openCustomSignal} closeCustomSignal={closeCustomSignal} />;
    if (page === "study"   && isOwner) return <><TrackerBackBar name="Study"   onBack={() => navigate("trackers")} /><Study   user={user} /></>;
    if (page === "pet"     && isOwner) return <><TrackerBackBar name="Ozzy"    onBack={() => navigate("trackers")} /><Ozzy    user={user} /></>;
    if (page === "travel"  && isOwner) return <><TrackerBackBar name="Travel"  onBack={() => navigate("trackers")} /><Travel  user={user} /></>;
    if (page === "career"  && isOwner) return <><TrackerBackBar name="Career"  onBack={() => navigate("trackers")} /><Career  user={user} /></>;
    if (page === "finance" && isOwner) return <><TrackerBackBar name="Finance" onBack={() => navigate("trackers")} /><Finance user={user} /></>;
  };

  const today = new Date().toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const pageTitle = TITLES[page];

  const BOTTOM_NAV = [
    { id: "home",     label: "Home",     icon: "home" },
    { id: "notes",    label: "Notes",    icon: "notes" },
    { id: "calendar", label: "Calendar", icon: "calendar" },
    { id: "trackers", label: "Trackers", icon: "trackers" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  const userDisplayKey = user?.id ? `sanctum_display_name_${user.id}` : "sanctum_display_name";
  const _metaName = user?.user_metadata?.display_name;
  const _emailName = user?.email?.split('@')[0] || '';
  // Prefer profiles table name → localStorage cache → email username → metadata (may be stale/short) → fallback
  const toFirstName = (str) => str ? str.split(/[\s._@-]/)[0].replace(/\d+$/, '') || str : str;
  const _rawName = profileName
    || localStorage.getItem(userDisplayKey)
    || (_emailName.length > 1 ? _emailName : null)
    || (_metaName && _metaName.length > 1 ? _metaName : null)
    || _emailName
    || 'You';
  const displayName = toFirstName(_rawName);
  const initials = _rawName.split(' ').length > 1
    ? _rawName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : _rawName.split(/[\s._@-]/)[0].replace(/\d+$/, '').slice(0, 2).toUpperCase();

  return (
    <>
      <div className="shell">

        {/* ── Sidebar (desktop) ── */}
        <aside className="sidebar">
          <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--b1)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 44" style={{ height: 36, width: 'auto' }}>
              <g transform="translate(22 22)">
                <ellipse cx="0" cy="-17" rx="5" ry="13" fill="#534AB7" opacity="0.95" transform="rotate(0 0 0)"/>
                <ellipse cx="0" cy="-17" rx="5" ry="13" fill="#534AB7" opacity="0.95" transform="rotate(60 0 0)"/>
                <ellipse cx="0" cy="-17" rx="5" ry="13" fill="#534AB7" opacity="0.95" transform="rotate(120 0 0)"/>
                <ellipse cx="0" cy="-17" rx="5" ry="13" fill="#534AB7" opacity="0.95" transform="rotate(180 0 0)"/>
                <ellipse cx="0" cy="-17" rx="5" ry="13" fill="#534AB7" opacity="0.95" transform="rotate(240 0 0)"/>
                <ellipse cx="0" cy="-17" rx="5" ry="13" fill="#534AB7" opacity="0.95" transform="rotate(300 0 0)"/>
                <circle cx="0" cy="0" r="8" style={{ fill: 'var(--bg1)' }}/>
                <circle cx="0" cy="0" r="5.5" fill="#534AB7" opacity="0.4"/>
                <circle cx="0" cy="0" r="3" fill="#534AB7"/>
                <circle cx="0" cy="0" r="1.2" style={{ fill: 'var(--t1)' }}/>
              </g>
              <text x="50" y="16" fontFamily="Georgia, serif" fontSize="14" style={{ fill: 'var(--t1)' }} letterSpacing="4">SANCTUM</text>
              <text x="51" y="30" fontFamily="system-ui, sans-serif" fontSize="7" style={{ fill: 'var(--t3)' }} letterSpacing="2.5">PRIVATE · PERSONAL · YOURS</text>
            </svg>
          </div>

          <div className="nav-section">
            {navOrder.map(id => {
              const n = NAV.find(x => x.id === id);
              if (!n) return null;
              const isActive = n.id === page || (n.id === "trackers" && TRACKER_PAGES.includes(page));
              const cls = [
                "nav-item",
                isActive           ? "active"       : "",
                navDragging === id ? "is-dragging"   : "",
                navDragOver === id ? "nav-drag-over" : "",
              ].filter(Boolean).join(" ");

              if (n.id === "trackers") return (
                <div key="trackers">
                  <div
                    className={cls}
                    draggable
                    onDragStart={e => onNavDragStart(e, n.id)}
                    onDragOver={e  => onNavDragOver(e, n.id)}
                    onDragLeave={e => onNavDragLeave(e, n.id)}
                    onDrop={e      => onNavDrop(e, n.id)}
                    onDragEnd={onNavDragEnd}
                    onClick={() => { navigate("trackers"); setOpenCustomSignal(null); setCloseCustomSignal(Date.now()); }}
                  >
                    <div className="nav-icon"><Icon name={n.icon} size={16} /></div>
                    <span style={{ flex: 1 }}>{n.label}</span>
                    <span
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); toggleTrackersExpanded(); }}
                      style={{ cursor: "pointer", color: "var(--t3)", fontSize: 9, padding: "2px 6px", lineHeight: 1, flexShrink: 0 }}
                    >
                      {trackersExpanded ? "▼" : "▶"}
                    </span>
                    <div className="drag-handle" style={{ marginLeft: 0 }}><Icon name="grab" size={12} /></div>
                  </div>
                  {isOwner && trackersExpanded && TRACKER_ITEMS.map(t => (
                    <div
                      key={t.id}
                      className={`nav-item${page === t.id ? " active" : ""}`}
                      onClick={() => navigate(t.id)}
                      style={{ paddingLeft: 30, fontSize: 12 }}
                    >
                      <div className="nav-icon"><Icon name={t.icon} size={13} /></div>
                      {t.label}
                    </div>
                  ))}
                  {trackersExpanded && customTrackers.map(t => (
                    <div
                      key={t.id}
                      className={`nav-item${openCustomSignal?.id === t.id && page === "trackers" ? " active" : ""}`}
                      onClick={() => { navigate("trackers"); setOpenCustomSignal({ id: t.id, ts: Date.now() }); }}
                      style={{ paddingLeft: 30, fontSize: 12 }}
                    >
                      <div className="nav-icon">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>
                      </div>
                      {t.label}
                    </div>
                  ))}
                </div>
              );

              return (
                <div
                  key={n.id}
                  className={cls}
                  draggable
                  onDragStart={e => onNavDragStart(e, n.id)}
                  onDragOver={e  => onNavDragOver(e, n.id)}
                  onDragLeave={e => onNavDragLeave(e, n.id)}
                  onDrop={e      => onNavDrop(e, n.id)}
                  onDragEnd={onNavDragEnd}
                  onClick={() => navigate(n.id)}
                >
                  <div className="nav-icon"><Icon name={n.icon} size={16} /></div>
                  {n.label}
                  <div className="drag-handle" style={{ marginLeft:"auto" }}><Icon name="grab" size={12} /></div>
                </div>
              );
            })}
          </div>

          <div className="sidebar-footer">
            <div className="nav-item" style={{ cursor: "default" }}>
              <div className="nav-icon"><Icon name="lock" size={14} color="var(--grn)" /></div>
              <span style={{ color: "var(--grn)", fontSize: 12 }}>End-to-end encrypted</span>
            </div>
            <div className="nav-item" onClick={handleLogout}>
              <div className="nav-icon"><Icon name="logout" size={14} /></div>
              <span style={{ fontSize: 12 }}>Sign out</span>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="main main-bg">
          <div className="topbar">
            <div className="topbar-left">
              <div className="topbar-title" style={{visibility: page === 'home' ? 'hidden' : 'visible'}}>{pageTitle}</div>
            </div>
            <div className="topbar-right">
              <span className="topbar-sub">{today}</span>
              <div className="user-avatar" title={email} onClick={() => navigate('settings')}>{initials}</div>
            </div>
          </div>
          {['calendar','settings','trackers'].includes(page) && (
            <div className="global-ai-bar-wrap" style={{padding:'12px 24px 0'}}>
              <div className="ai-bar">
                <div style={{width:32,height:32,borderRadius:'50%',background:'#080808',border:'1px solid #333',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}><img src="/icon.svg" alt="Sanctum" style={{width:28,height:28}}/></div>
                <input
                  ref={globalAIRef}
                  className="ai-bar-input"
                  value={globalAIInput}
                  onChange={e => setGlobalAIInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendGlobalAI()}
                  placeholder={page === 'trackers' ? 'Ask anything or create a tracker…' : `Ask anything on ${pageTitle}…`}
                  disabled={globalAILoading}
                />
                <button className="ai-bar-btn" onClick={sendGlobalAI} disabled={globalAILoading || !globalAIInput.trim()} title="Send (Enter)">
                  {globalAILoading
                    ? <><span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/></>
                    : <Icon name="chevR" size={16} color="#fff"/>}
                </button>
              </div>
              {globalAIResponse && (
                <div className={`ai-response${globalAIResponse.type==='error'?' ai-response-err':globalAIResponse.type==='success'?' ai-response-ok':''}`}>
                  <div className="ai-response-body">
                    <div className="ai-response-icon">
                      {globalAIResponse.type==='success' && <Icon name="check" size={14} color="var(--grn)"/>}
                      {globalAIResponse.type==='error'   && <Icon name="x"     size={14} color="var(--red)"/>}
                      {globalAIResponse.type==='loading' && <span style={{display:'flex',gap:3}}><span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/></span>}
                      {globalAIResponse.type==='text'    && <Icon name="ai"    size={14} color="var(--blue)"/>}
                    </div>
                    <span>{globalAIResponse.text}</span>
                  </div>
                  {globalAIResponse.type !== 'loading' && (
                    <button style={{background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:16,lineHeight:1,padding:'0 2px',flexShrink:0}} onClick={() => setGlobalAIResponse(null)}>×</button>
                  )}
                </div>
              )}
            </div>
          )}
          {renderPage()}
        </div>

      </div>

      {/* ── Bottom nav (mobile) ── */}
      {/* ── Mobile AI FAB ── */}
      <button
        className={`mobile-ai-fab${!['home','calendar','settings','trackers'].includes(page)?' hide-fab':''}`}
        style={{ bottom: fabPos.bottom + 'px', right: fabPos.right + 'px' }}
        onTouchStart={onFabTouchStart}
        onTouchMove={onFabTouchMove}
        onTouchEnd={onFabTouchEnd}
        onClick={() => setMobileAIOpen(v => !v)}
        title="AI Assistant"
      >
        <Icon name="ai" size={20} color="#fff"/>
      </button>
      {mobileAIOpen && <div className="mobile-ai-backdrop" onClick={() => setMobileAIOpen(false)}/>}
      <div
        className={`mobile-ai-panel${mobileAIOpen?' open':''}`}
        onClick={e => e.stopPropagation()}
        onTouchStart={e => { panelSwipe.current.startY = e.touches[0].clientY; }}
        onTouchEnd={e => { if (e.changedTouches[0].clientY - panelSwipe.current.startY > 80) setMobileAIOpen(false); }}
      >
        <div className="mobile-ai-panel-header">
          <div className="mobile-ai-panel-handle"/>
          <button className="mobile-ai-close-btn" onClick={() => setMobileAIOpen(false)} aria-label="Close">×</button>
        </div>
        <div className="ai-bar">
          <div style={{width:32,height:32,borderRadius:'50%',background:'#080808',border:'1px solid #333',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}><img src="/icon.svg" alt="Sanctum" style={{width:28,height:28}}/></div>
          <input
            className="ai-bar-input"
            value={globalAIInput}
            onChange={e => setGlobalAIInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) sendGlobalAI(); }}
            placeholder="Ask anything…"
            disabled={globalAILoading}
            autoFocus={mobileAIOpen}
          />
          <button className="ai-bar-btn" onClick={sendGlobalAI} disabled={globalAILoading || !globalAIInput.trim()}>
            {globalAILoading
              ? <><span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/></>
              : <Icon name="chevR" size={16} color="#fff"/>}
          </button>
        </div>
        {globalAIResponse && (
          <div className={`ai-response${globalAIResponse.type==='error'?' ai-response-err':globalAIResponse.type==='success'?' ai-response-ok':''}`} style={{marginTop:10}}>
            <div className="ai-response-body">
              <div className="ai-response-icon">
                {globalAIResponse.type==='success' && <Icon name="check" size={14} color="var(--grn)"/>}
                {globalAIResponse.type==='error'   && <Icon name="x"     size={14} color="var(--red)"/>}
                {globalAIResponse.type==='loading' && <span style={{display:'flex',gap:3}}><span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/></span>}
                {globalAIResponse.type==='text'    && <Icon name="ai"    size={14} color="var(--blue)"/>}
              </div>
              <span>{globalAIResponse.text}</span>
            </div>
            {globalAIResponse.type !== 'loading' && (
              <button style={{background:'none',border:'none',color:'var(--t3)',cursor:'pointer',fontSize:16,lineHeight:1,padding:'0 2px',flexShrink:0}} onClick={() => setGlobalAIResponse(null)}>×</button>
            )}
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        {trackersExpanded && (
          <div style={{ display: "flex", flexWrap: "wrap", borderBottom: "1px solid var(--b1)" }}>
            {TRACKER_ITEMS.map(t => (
              <div
                key={t.id}
                className={`bottom-nav-item${page === t.id ? " active" : ""}`}
                style={{ flex: 1 }}
                onClick={() => navigate(t.id)}
              >
                <Icon name={t.icon} size={19} />
                <span style={{ fontSize: 9 }}>{t.label}</span>
              </div>
            ))}
            {customTrackers.map(t => (
              <div
                key={t.id}
                className={`bottom-nav-item${openCustomSignal?.id === t.id && page === "trackers" ? " active" : ""}`}
                style={{ flex: 1 }}
                onClick={() => { navigate("trackers"); setOpenCustomSignal({ id: t.id, ts: Date.now() }); }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                <span style={{ fontSize: 9 }}>{t.label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="bottom-nav-inner">
          {BOTTOM_NAV.map(n => {
            if (n.id === "trackers") {
              const isActive = page === "trackers" || TRACKER_PAGES.includes(page);
              return (
                <div
                  key="trackers"
                  className={`bottom-nav-item${isActive ? " active" : ""}`}
                  onClick={() => navigate("trackers")}
                >
                  <Icon name={n.icon} size={22} />
                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {n.label}
                    <span
                      onClick={e => { e.stopPropagation(); toggleTrackersExpanded(); }}
                      style={{ fontSize: 8, lineHeight: 1, cursor: "pointer", opacity: 0.7 }}
                    >
                      {trackersExpanded ? "▼" : "▶"}
                    </span>
                  </span>
                </div>
              );
            }
            return (
              <div
                key={n.id}
                className={`bottom-nav-item${n.id === page ? " active" : ""}`}
                onClick={() => navigate(n.id)}
              >
                <Icon name={n.icon} size={22} />
                <span>{n.label}</span>
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
}
