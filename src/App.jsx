import { useState, useEffect, useRef } from "react";
import "./styles/base.css";
import { auth, sb } from "./lib/supabase";
import { Icon } from "./components/shared";
import Home from "./components/Home";
import Notes from "./components/Notes";
import Calendar from "./components/Calendar";
import Settings from "./components/Settings";
import TrackerHub, { TrackerBackBar } from "./components/trackers/TrackerHub";
import Study from "./components/trackers/Study";
import Career from "./components/trackers/Career";
import Finance from "./components/trackers/Finance";
import Travel from "./components/trackers/Travel";
import Ozzy from "./components/trackers/Ozzy";

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
        onLogin(data.user);
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
          <div className="login-mark">S</div>
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
const TRACKER_PAGES = ["career", "study", "finance", "travel", "pet"];
const TITLES = {
  home: "Home", notes: "Notes", calendar: "Calendar", trackers: "Trackers",
  career: "Career", study: "Study & PMP", finance: "Finance", travel: "Travel", pet: "Ozzy",
  settings: "Settings"
};

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [calDate, setCalDate] = useState(null);
  const [globalAIInput, setGlobalAIInput] = useState('');
  const [globalAILoading, setGlobalAILoading] = useState(false);
  const [globalAIResponse, setGlobalAIResponse] = useState(null);
  const globalAIRef = useRef(null);
  const [mobileAIOpen, setMobileAIOpen] = useState(false);

  // Draggable AI FAB position
  const [fabPos, setFabPos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sanctum_ai_btn_pos")) || { bottom: 72, left: 16 }; }
    catch { return { bottom: 72, left: 16 }; }
  });
  const fabDrag = useRef({ active: false, startTouchX: 0, startTouchY: 0, startLeft: 0, startBottom: 0 });

  const [theme, setTheme] = useState(() => localStorage.getItem("sanctum_theme") || "dark");
  const [font, setFont] = useState(() => localStorage.getItem("sanctum_font") || "default");

  const FONT_MAP = {
    default: "",
    sans: "system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
    dyslexic: "'OpenDyslexic', Arial, sans-serif",
  };

  const applyTheme = (t) => {
    localStorage.setItem("sanctum_theme", t);
    document.documentElement.setAttribute("data-theme", t);
    setTheme(t);
  };

  const applyFont = (f) => {
    localStorage.setItem("sanctum_font", f);
    document.body.style.fontFamily = FONT_MAP[f] ?? "";
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
RESPONSE RULES — choose one format only:
- Navigate → reply ONLY with valid JSON, no markdown: {"action":"navigate","page":"home|notes|calendar|trackers|career|study|finance|travel|pet|settings"}
- Log study session → reply ONLY with valid JSON, no markdown: {"action":"log_study","hours":2,"topic":"Integration Management","notes":"optional"}
- All other queries → plain conversational text, warm but concise, max 2 sentences. No JSON.`;
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: sys, messages: [{ role: 'user', content: userMsg }] }) });
      const data = await res.json();
      const reply = (data.content?.[0]?.text || '').trim();
      try {
        const cleaned = reply.replace(/```(?:json)?|```/g, '').trim();
        const action = JSON.parse(cleaned);
        if (action.action === 'navigate') {
          setGlobalAIResponse({ text: `Opening ${action.page}...`, type: 'success' });
          setTimeout(() => navigate(action.page), 400);
        } else if (action.action === 'log_study') {
          const { error } = await sb.from('study_sessions').insert({
            hours: parseFloat(action.hours),
            topic: action.topic,
            notes: action.notes || '',
            date: todayISO,
            type: 'pmp',
          });
          if (error) throw error;
          setGlobalAIResponse({ text: `Logged ${action.hours}h — ${action.topic} ✓`, type: 'success' });
        } else {
          setGlobalAIResponse({ text: cleaned, type: 'text' });
        }
      } catch {
        setGlobalAIResponse({ text: reply || 'Got it.', type: 'text' });
      }
    } catch {
      setGlobalAIResponse({ text: 'Connection error. Check your network.', type: 'error' });
    }
    setGlobalAILoading(false);
  };

  // Page & tracker state — map legacy page names on restore
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem("sanctum_page");
    if (!saved || ["dashboard", "ai"].includes(saved)) return "home";
    if (TRACKER_PAGES.includes(saved)) return "trackers";
    if (["home","notes","calendar","trackers","settings"].includes(saved)) return saved;
    return "home";
  });
  const [trackerPage, setTrackerPage] = useState(() => {
    const saved = localStorage.getItem("sanctum_page");
    return TRACKER_PAGES.includes(saved) ? saved : null;
  });

  // Sidebar nav ordering
  const NAV_IDS = NAV.map(n => n.id);
  const [navOrder, setNavOrder] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("sanctum_nav_order"));
      if (Array.isArray(s) && s.length === NAV_IDS.length && NAV_IDS.every(id => s.includes(id))) return s;
    } catch {}
    return NAV_IDS;
  });
  const [navDragOver, setNavDragOver] = useState(null);
  const [navDragging, setNavDragging] = useState(null);
  const navDragId = useRef(null);

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
    if (TRACKER_PAGES.includes(p)) {
      setPage("trackers");
      setTrackerPage(p);
      localStorage.setItem("sanctum_page", p);
    } else {
      setPage(p);
      setTrackerPage(null);
      localStorage.setItem("sanctum_page", p);
    }
  };

  const goToCalendarDay = (date) => {
    setCalDate(date);
    navigate("calendar");
  };

  useEffect(() => {
    // Apply saved font immediately on mount
    const savedFont = localStorage.getItem("sanctum_font") || "default";
    document.body.style.fontFamily = FONT_MAP[savedFont] ?? "";

    const init = async () => {
      let session = auth.getSession();
      if (!session) {
        const refreshed = await auth.refreshSession();
        if (refreshed) session = auth.getSession();
      }
      if (session) setUser(session.user);
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

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => { auth.signOut(); setUser(null); setPage("home"); setTrackerPage(null); localStorage.removeItem("sanctum_page"); };

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
  const initials = username.slice(0, 2).toUpperCase();

  const addTaskFromAI = async (text, tag) => {
    const task = { text, tag, done: false };
    try {
      const res = await sb.from("tasks").insert(task);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...task, id: Date.now().toString() };
      // This won't update Dashboard state since AI is on a different page
      // Task will appear on next Dashboard visit — this is expected
    } catch { }
  };

  const renderPage = () => {
    if (page === "home") return <Home user={user} onNavigate={navigate} onGoToCalendarDay={goToCalendarDay} />;
    if (page === "notes") return <Notes />;
    if (page === "calendar") return <Calendar initialDate={calDate} />;
    if (page === "trackers") {
      if (trackerPage === "career")  return <><TrackerBackBar name="Career" onBack={() => { setTrackerPage(null); localStorage.setItem("sanctum_page","trackers"); }} /><Career /></>;
      if (trackerPage === "study")   return <><TrackerBackBar name="Study & PMP" onBack={() => { setTrackerPage(null); localStorage.setItem("sanctum_page","trackers"); }} /><Study /></>;
      if (trackerPage === "finance") return <><TrackerBackBar name="Finance" onBack={() => { setTrackerPage(null); localStorage.setItem("sanctum_page","trackers"); }} /><Finance /></>;
      if (trackerPage === "travel")  return <><TrackerBackBar name="Travel" onBack={() => { setTrackerPage(null); localStorage.setItem("sanctum_page","trackers"); }} /><Travel /></>;
      if (trackerPage === "pet")     return <><TrackerBackBar name="Ozzy" onBack={() => { setTrackerPage(null); localStorage.setItem("sanctum_page","trackers"); }} /><Ozzy /></>;
      return <TrackerHub onNavigate={navigate} />;
    }
    if (page === "settings") return <Settings user={user} onLogout={handleLogout} theme={theme} onThemeChange={applyTheme} font={font} onFontChange={applyFont} />;
  };

  const today = new Date().toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const pageTitle = page === "trackers" && trackerPage ? TITLES[trackerPage] : TITLES[page];

  const BOTTOM_NAV = [
    { id: "home",     label: "Home",     icon: "home" },
    { id: "notes",    label: "Notes",    icon: "notes" },
    { id: "calendar", label: "Calendar", icon: "calendar" },
    { id: "trackers", label: "Trackers", icon: "trackers" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  const userDisplayKey = user?.id ? `sanctum_display_name_${user.id}` : "sanctum_display_name";
  const displayName = localStorage.getItem(userDisplayKey) || "Michael";

  return (
    <>
      <div className="shell">

        {/* ── Sidebar (desktop) ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">S</div>
            <div>
              <div className="logo-name">Sanctum</div>
              <div className="logo-sub">{displayName} · Dublin</div>
            </div>
          </div>

          <div className="nav-section">
            {navOrder.map(id => {
              const n = NAV.find(x => x.id === id);
              if (!n) return null;
              const cls = [
                "nav-item",
                n.id === page      ? "active"       : "",
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
              <div className="topbar-title">{pageTitle}</div>
            </div>
            <div className="topbar-right">
              <span className="topbar-sub">{today}</span>
              <div className="user-avatar" title={email}>{initials}</div>
            </div>
          </div>
          {['calendar','trackers','settings'].includes(page) && (
            <div className="global-ai-bar-wrap" style={{padding:'12px 24px 0'}}>
              <div className="ai-bar">
                <div className="ai-avatar"><Icon name="ai" size={15} color="#fff"/></div>
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
        className={`mobile-ai-fab${!['home','calendar','trackers','settings'].includes(page)?' hide-fab':''}`}
        style={{ bottom: fabPos.bottom + 'px', left: fabPos.left + 'px' }}
        onTouchStart={onFabTouchStart}
        onTouchMove={onFabTouchMove}
        onTouchEnd={onFabTouchEnd}
        onClick={() => setMobileAIOpen(v => !v)}
        title="AI Assistant"
      >
        <Icon name="ai" size={20} color="#fff"/>
      </button>
      <div className={`mobile-ai-panel${mobileAIOpen?' open':''}`} onClick={e => e.stopPropagation()}>
        <div className="mobile-ai-panel-handle"/>
        <div className="ai-bar">
          <div className="ai-avatar"><Icon name="ai" size={15} color="#fff"/></div>
          <input
            className="ai-bar-input"
            value={globalAIInput}
            onChange={e => setGlobalAIInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { sendGlobalAI(); setMobileAIOpen(false); } }}
            placeholder="Ask anything…"
            disabled={globalAILoading}
            autoFocus={mobileAIOpen}
          />
          <button className="ai-bar-btn" onClick={() => { sendGlobalAI(); setMobileAIOpen(false); }} disabled={globalAILoading || !globalAIInput.trim()}>
            {globalAILoading
              ? <><span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/></>
              : <Icon name="chevR" size={16} color="#fff"/>}
          </button>
        </div>
      </div>
      {mobileAIOpen && <div style={{position:'fixed',inset:0,zIndex:199}} onClick={() => setMobileAIOpen(false)}/>}

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
