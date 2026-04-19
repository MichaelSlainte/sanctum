import { useState, useEffect, useRef } from "react";
import "./styles/base.css";
import { auth, sb } from "./lib/supabase";
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
import TrackerHub, { TrackerBackBar } from "./components/trackers/TrackerHub";

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
          <SanctumLogo size={56} theme="dark" />
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

// ─── SANCTUM LOGO ────────────────────────────────────────────────────────────
const SanctumLogo = ({ size = 36, theme = "dark" }) => {
  const isTamara = theme === "tamara";
  const treePrimary = isTamara ? "#fbc4d4" : "#e0e0e0";
  const treeSec     = isTamara ? "#f5a8be" : "#d8d8d8";
  const treeMid     = isTamara ? "#f099b0" : "#d0d0d0";
  const treeFaint   = isTamara ? "#e880a0" : "#c8c8c8";
  const treeDim     = isTamara ? "#d06080" : "#c0c0c0";
  const treeLight   = isTamara ? "#c05070" : "#b8b8b8";
  const treeTiny    = isTamara ? "#a04060" : "#a0a0a0";
  const treeGhost   = isTamara ? "#804050" : "#888";
  const circleBorder = isTamara ? "#fbc4d4" : "#222";
  return (
    <svg width={size} height={size} viewBox="0 0 220 220">
      <circle cx="110" cy="110" r="105" fill="#080808" stroke={circleBorder} strokeWidth="1.5"/>
      <circle cx="110" cy="110" r="96" fill="none" stroke="#1a1a1a" strokeWidth="0.5"/>
      <ellipse cx="110" cy="172" rx="48" ry="5" fill="#111" stroke="#333" strokeWidth="0.5"/>
      <path d="M110 172 Q106 158 102 145 Q98 132 100 118 Q102 105 108 95 Q114 85 118 72 Q122 58 118 45 Q114 32 110 22" fill="none" stroke={treePrimary} strokeWidth="6" strokeLinecap="round"/>
      <path d="M107 172 Q103 155 100 140 Q97 125 99 112 Q101 98 107 88" fill="none" stroke={treeMid} strokeWidth="3" strokeLinecap="round"/>
      <path d="M102 135 Q88 122 72 110 Q60 100 48 88" fill="none" stroke={treeSec} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M101 120 Q86 110 70 98 Q58 88 46 76" fill="none" stroke={treeMid} strokeWidth="2" strokeLinecap="round"/>
      <path d="M104 105 Q90 95 76 84 Q65 74 55 62" fill="none" stroke={treeFaint} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M72 110 Q62 98 52 86" fill="none" stroke={treeDim} strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M72 110 Q66 95 62 82" fill="none" stroke={treeDim} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M48 88 Q40 78 35 66" fill="none" stroke={treeTiny} strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M76 84 Q68 72 62 60" fill="none" stroke={treeLight} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M55 62 Q48 52 44 40" fill="none" stroke={treeTiny} strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M46 76 Q38 66 34 54" fill="none" stroke={treeGhost} strokeWidth="0.6" strokeLinecap="round"/>
      <path d="M114 88 Q128 76 144 64 Q156 54 168 42" fill="none" stroke={treeSec} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M116 75 Q130 64 146 53 Q158 44 170 32" fill="none" stroke={treeMid} strokeWidth="2" strokeLinecap="round"/>
      <path d="M114 62 Q126 52 140 42 Q152 33 162 22" fill="none" stroke={treeFaint} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M144 64 Q154 52 162 40" fill="none" stroke={treeDim} strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M144 64 Q150 50 154 37" fill="none" stroke={treeDim} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M168 42 Q175 30 178 18" fill="none" stroke={treeTiny} strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M140 42 Q148 30 154 18" fill="none" stroke={treeLight} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M162 22 Q168 10 172 2" fill="none" stroke={treeTiny} strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M110 40 Q100 26 94 12" fill="none" stroke={treeFaint} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M110 40 Q120 26 126 12" fill="none" stroke={treeFaint} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M94 12 Q88 4 84 0" fill="none" stroke={treeTiny} strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M126 12 Q132 4 136 0" fill="none" stroke={treeTiny} strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M107 172 Q94 180 80 190 Q68 198 56 204" fill="none" stroke={treeFaint} strokeWidth="2" strokeLinecap="round"/>
      <path d="M107 172 Q96 182 86 192 Q76 200 68 208" fill="none" stroke={treeDim} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M110 172 Q110 184 110 196" fill="none" stroke={treeDim} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M113 172 Q126 180 140 190 Q152 198 164 204" fill="none" stroke={treeFaint} strokeWidth="2" strokeLinecap="round"/>
      <path d="M113 172 Q124 182 134 192 Q144 200 152 208" fill="none" stroke={treeDim} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M80 190 Q70 196 62 204" fill="none" stroke={treeTiny} strokeWidth="1" strokeLinecap="round"/>
      <path d="M140 190 Q150 196 158 204" fill="none" stroke={treeTiny} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
};

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

  // Draggable AI FAB position
  const [fabPos, setFabPos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sanctum_ai_btn_pos")) || { bottom: 72, left: 16 }; }
    catch { return { bottom: 72, left: 16 }; }
  });
  const fabDrag = useRef({ active: false, startTouchX: 0, startTouchY: 0, startLeft: 0, startBottom: 0 });

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
      const sys = `You are Sanctum AI, a personal assistant embedded in a private life organiser app.
Today is ${todayISO}. User: Michael, Dublin, Ireland.
When user mentions dates, always convert to ISO format YYYY-MM-DD in your JSON response.
Examples: "tomorrow" = ${new Date(Date.now()+86400000).toISOString().slice(0,10)}, "next week" = ${new Date(Date.now()+7*86400000).toISOString().slice(0,10)}.
For "next Monday", "this Friday" etc., compute the actual upcoming date.
RESPONSE RULES — choose one format only:
- Navigate → reply ONLY with valid JSON, no markdown: {"action":"navigate","page":"home|notes|calendar|settings"}
- Log study session → reply ONLY with valid JSON, no markdown: {"action":"log_study","hours":2,"topic":"Integration Management","notes":"optional"}
- Add calendar event → reply ONLY with valid JSON, no markdown: {"action":"add_event","title":"Event title","date":"${todayISO}","start_time":"09:00","end_time":"10:00","category":"personal","notes":"optional notes"}
  category must be one of: personal, career, travel, study, family
- All other queries → plain conversational text, warm but concise, max 2 sentences. No JSON.`;
      const newHistory = [...globalAIHistory, { role: 'user', content: userMsg }];
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: sys, messages: newHistory }) });
      const data = await res.json();
      const reply = (data.content?.[0]?.text || '').trim();
      try {
        const cleaned = reply.replace(/```(?:json)?|```/g, '').trim();
        const action = JSON.parse(cleaned);
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
          await sb.from('events').insert({
            title: action.title,
            date: parseDate(action.date) || todayISO,
            start_time: action.start_time || null,
            end_time: action.end_time || null,
            category: action.category || 'personal',
            color: '#388bfd',
            notes: action.notes || '',
            user_id: user?.id,
          });
          setCalendarRefreshKey(k => k + 1);
          setGlobalAIResponse({ text: `Added to calendar: "${action.title}" on ${parseDate(action.date)}`, type: 'success' });
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
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!checking && !user) localStorage.removeItem("sanctum_page");
  }, [user, checking]);

  const handleLogin = async (u, password) => {
    setUser(u);
    try {
      const profile = await sb.from("profiles").select("display_name,timezone,encryption_salt", `&id=eq.${u.id}`, "");
      if (Array.isArray(profile) && profile[0]?.display_name) {
        localStorage.setItem(`sanctum_display_name_${u.id}`, profile[0].display_name);
        setProfileName(profile[0].display_name);
      }
      if (password) {
        setKeyLoading(true);
        const SALT_LS_KEY = `sanctum_enc_salt_${u.id}`;
        const SESSION_KEY = `sanctum_session_key_${u.id}`;
        // Priority: Supabase profile → localStorage → generate new
        let salt = (Array.isArray(profile) && profile[0]?.encryption_salt) || localStorage.getItem(SALT_LS_KEY);
        if (!salt) {
          salt = await generateSalt();
          // Try profiles table (needs encryption_salt column — see SQL note in commit)
          sb.from("profiles").update({ encryption_salt: salt }, { id: u.id }).catch(() => {});
        }
        // Always persist salt locally so the same key is derived on every login
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
    } catch (err) {
      console.error('[handleLogin] profile fetch error:', err);
    }
  };
  const handleLogout = () => { auth.signOut(); setUser(null); setProfileName(""); setPage("home"); localStorage.removeItem("sanctum_page"); };

  const onFabTouchStart = (e) => {
    const t = e.touches[0];
    fabDrag.current = { active: true, startTouchX: t.clientX, startTouchY: t.clientY, startLeft: fabPos.left, startBottom: fabPos.bottom };
  };
  const onFabTouchMove = (e) => {
    if (!fabDrag.current.active) return;
    e.preventDefault();
    const t = e.touches[0];
    const left = Math.max(0, Math.min(window.innerWidth - 52, fabDrag.current.startLeft + (t.clientX - fabDrag.current.startTouchX)));
    const bottom = Math.max(72, Math.min(window.innerHeight - 52, fabDrag.current.startBottom - (t.clientY - fabDrag.current.startTouchY)));
    setFabPos({ left, bottom });
  };
  const onFabTouchEnd = () => {
    fabDrag.current.active = false;
    setFabPos(pos => { localStorage.setItem("sanctum_ai_btn_pos", JSON.stringify(pos)); return pos; });
  };

  if (checking) return null;
  if (!user) return <Login onLogin={handleLogin} />;

  const email = user?.email || "";
  const username = email.split("@")[0];

  const addTaskFromAI = async (text, tag) => {
    const task = { text, tag, done: false, user_id: user?.id };
    try {
      const res = await sb.from("tasks").insert(task);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...task, id: Date.now().toString() };
      // This won't update Dashboard state since AI is on a different page
      // Task will appear on next Dashboard visit — this is expected
    } catch { }
  };

  const renderPage = () => {
    if (!user) return null;
    if (page === "home") return <Home user={user} onNavigate={navigate} onGoToCalendarDay={goToCalendarDay} />;
    if (page === "notes") return <Notes user={user} />;
    if (page === "calendar") return <Calendar user={user} initialDate={calDate} refreshKey={calendarRefreshKey} />;
    if (page === "settings") return <Settings user={user} onLogout={handleLogout} theme={theme} onThemeChange={applyTheme} font={font} onFontChange={applyFont} sb={sb} />;
    if (page === "trackers") return <TrackerHub user={user} archivedTrackers={archivedTrackers} onArchive={archiveTracker} onUnarchive={unarchiveTracker} onNavigate={navigate} />;
    if (page === "study")   return <><TrackerBackBar name="Study"   onBack={() => navigate("trackers")} /><Study   user={user} /></>;
    if (page === "pet")     return <><TrackerBackBar name="Ozzy"    onBack={() => navigate("trackers")} /><Ozzy    user={user} /></>;
    if (page === "travel")  return <><TrackerBackBar name="Travel"  onBack={() => navigate("trackers")} /><Travel  user={user} /></>;
    if (page === "career")  return <><TrackerBackBar name="Career"  onBack={() => navigate("trackers")} /><Career  user={user} /></>;
    if (page === "finance") return <><TrackerBackBar name="Finance" onBack={() => navigate("trackers")} /><Finance user={user} /></>;
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
  const displayName = profileName || localStorage.getItem(userDisplayKey) || user?.email?.split('@')[0]?.split('.')[0] || 'You';
  const initials = displayName.split(' ').length > 1
    ? displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <div className="shell">

        {/* ── Sidebar (desktop) ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <SanctumLogo size={36} theme={theme} />
            <div>
              <div className="logo-name">Sanctum</div>
              <div className="logo-sub">{displayName} · Dublin</div>
            </div>
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
          {['calendar','settings'].includes(page) && (
            <div className="global-ai-bar-wrap" style={{padding:'12px 24px 0'}}>
              <div className="ai-bar">
                <div style={{width:32,height:32,borderRadius:'50%',background:'#080808',border:'1px solid #333',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}><SanctumLogo size={28}/></div>
                <input
                  ref={globalAIRef}
                  className="ai-bar-input"
                  value={globalAIInput}
                  onChange={e => setGlobalAIInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendGlobalAI()}
                  placeholder={`Ask anything on ${pageTitle}…`}
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
        className={`mobile-ai-fab${!['home','calendar','settings'].includes(page)?' hide-fab':''}`}
        style={{ bottom: fabPos.bottom + 'px', left: fabPos.left + 'px' }}
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
          <div style={{width:32,height:32,borderRadius:'50%',background:'#080808',border:'1px solid #333',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}><SanctumLogo size={28}/></div>
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
        <div className="bottom-nav-inner">
          {BOTTOM_NAV.map(n => (
            <div
              key={n.id}
              className={`bottom-nav-item${n.id === page ? " active" : ""}`}
              onClick={() => navigate(n.id)}
            >
              <Icon name={n.icon} size={22} />
              <span>{n.label}</span>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
