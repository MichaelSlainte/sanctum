import { useState, useEffect } from "react";
import { sb } from "../../lib/supabase";
import { Icon, Modal } from "../shared";

export default function Study({ user }) {
  const today = new Date();
  const [tab, setTab] = useState("pmp");

  // ── PMP ──
  const [pmpGoals, setPmpGoals] = useState({
    examDate: localStorage.getItem("sanctum_pmp_date") || "2026-07-07",
    weeklyGoal: localStorage.getItem("sanctum_study_goal") || "10",
    targetHours: localStorage.getItem("sanctum_pmp_target") || "150",
  });

  const savePmpGoal = (key, val) => {
    const keys = { examDate: "sanctum_pmp_date", weeklyGoal: "sanctum_study_goal", targetHours: "sanctum_pmp_target" };
    localStorage.setItem(keys[key], val);
    setPmpGoals(g => ({ ...g, [key]: val }));
  };

  const EXAM_DATE = new Date(pmpGoals.examDate + "T13:30");
  const daysLeft = Math.ceil((EXAM_DATE - today) / (1000 * 60 * 60 * 24));
  const weeklyGoal = parseFloat(pmpGoals.weeklyGoal) || 10;
  const targetHours = parseFloat(pmpGoals.targetHours) || 150;

  const [pmpSessions, setPmpSessions] = useState([]);
  const [showAddPmp, setShowAddPmp] = useState(false);
  const [newPmp, setNewPmp] = useState({ topic: "", hours: "", notes: "", date: today.toISOString().slice(0, 10) });

  const [barPeriod, setBarPeriod] = useState("week");
  const [barFilter, setBarFilter] = useState("pmp");
  const [barWeeks, setBarWeeks] = useState(6);

  const DEFAULT_TOPICS = [
    { id: "integration",    label: "Integration Management",    icon: "link" },
    { id: "scope",          label: "Scope Management",          icon: "target" },
    { id: "schedule",       label: "Schedule Management",       icon: "calendar" },
    { id: "cost",           label: "Cost Management",           icon: "finance" },
    { id: "quality",        label: "Quality Management",        icon: "check" },
    { id: "resource",       label: "Resource Management",       icon: "users" },
    { id: "communications", label: "Communications Management", icon: "mail" },
    { id: "risk",           label: "Risk Management",           icon: "alert" },
    { id: "procurement",    label: "Procurement Management",    icon: "card" },
    { id: "stakeholder",    label: "Stakeholder Management",    icon: "users" },
    { id: "agile",          label: "Agile & Hybrid",            icon: "trackers" },
    { id: "ethics",         label: "Ethics & Professional",     icon: "shield" },
  ];
  const [topics, setTopics] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("sanctum_pmbok_topics")); if (Array.isArray(s) && s.length > 0) return s; } catch {}
    return DEFAULT_TOPICS;
  });
  const [editTopicId,   setEditTopicId]   = useState(null);
  const [editTopicText, setEditTopicText] = useState("");

  const saveTopics = (t) => { localStorage.setItem("sanctum_pmbok_topics", JSON.stringify(t)); setTopics(t); };
  const moveTopicUp   = (i) => { if (i === 0) return; const t = [...topics]; [t[i-1], t[i]] = [t[i], t[i-1]]; saveTopics(t); };
  const moveTopicDown = (i) => { if (i === topics.length-1) return; const t = [...topics]; [t[i+1], t[i]] = [t[i], t[i+1]]; saveTopics(t); };
  const deleteTopic   = (id) => saveTopics(topics.filter(t => t.id !== id));
  const addTopic      = () => {
    const id = `topic_${Date.now()}`;
    const t = [...topics, { id, label: "New Topic", icon: "notes" }];
    saveTopics(t); setEditTopicId(id); setEditTopicText("New Topic");
  };
  const saveTopicName = (id) => {
    if (editTopicText.trim()) saveTopics(topics.map(t => t.id === id ? { ...t, label: editTopicText.trim() } : t));
    setEditTopicId(null);
  };

  // ── TryHackMe ──
  const [thmSessions, setThmSessions] = useState([]);
  const [showAddThm, setShowAddThm] = useState(false);
  const [newThm, setNewThm] = useState({ room_name: "", category: "", completed: true, date: today.toISOString().slice(0, 10), notes: "" });

  const DEFAULT_THM_CATS = ["Network", "Web", "Crypto", "Linux", "Windows", "OSINT", "Forensics", "Malware", "Reverse Engineering", "Misc"];
  const [thmCats, setThmCats] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("sanctum_thm_cats")); if (Array.isArray(s) && s.length > 0) return s; } catch {}
    return DEFAULT_THM_CATS;
  });
  const [editCatIdx,  setEditCatIdx]  = useState(null);
  const [editCatText, setEditCatText] = useState("");

  const saveThmCats = (c) => { localStorage.setItem("sanctum_thm_cats", JSON.stringify(c)); setThmCats(c); };
  const addThmCat   = () => { const c = [...thmCats, "New Category"]; saveThmCats(c); setEditCatIdx(c.length-1); setEditCatText("New Category"); };
  const saveCatName = (idx) => {
    if (editCatText.trim()) { const c = [...thmCats]; c[idx] = editCatText.trim(); saveThmCats(c); }
    setEditCatIdx(null);
  };

  // ── Load ──
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const data = await sb.from("study_sessions").select("*");
    if (Array.isArray(data)) {
      setPmpSessions(data.filter(s => s.type === "pmp"));
      setThmSessions(data.filter(s => s.type === "thm"));
    }
  };

  // ── PMP ops ──
  const addPmpSession = async () => {
    if (!newPmp.topic || !newPmp.hours) return;
    await sb.from("study_sessions").insert({ type: "pmp", ...newPmp, hours: parseFloat(newPmp.hours), user_id: user?.id });
    await loadAll();
    setNewPmp({ topic: "", hours: "", notes: "", date: today.toISOString().slice(0, 10) });
    setShowAddPmp(false);
  };
  const deletePmpSession = async (id) => {
    await sb.from("study_sessions").delete({ id });
    setPmpSessions(s => s.filter(x => x.id !== id));
  };

  // ── THM ops ──
  const addThmSession = async () => {
    if (!newThm.room_name) return;
    await sb.from("study_sessions").insert({ type: "thm", ...newThm, user_id: user?.id });
    await loadAll();
    setNewThm({ room_name: "", category: "", completed: true, date: today.toISOString().slice(0, 10), notes: "" });
    setShowAddThm(false);
  };
  const deleteThmSession = async (id) => {
    await sb.from("study_sessions").delete({ id });
    setThmSessions(s => s.filter(x => x.id !== id));
  };

  // ── PMP derived ──
  const totalHours = pmpSessions.reduce((s, x) => s + (x.hours || 0), 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
  weekStart.setHours(0, 0, 0, 0);
  const thisWeekHours = pmpSessions
    .filter(s => new Date(s.date) >= weekStart)
    .reduce((s, x) => s + (x.hours || 0), 0);
  const weeksLeft = Math.ceil(daysLeft / 7);
  const topicHours = topics.map(t => ({
    ...t,
    hours: pmpSessions.filter(s => s.topic === t.id).reduce((s, x) => s + (x.hours || 0), 0)
  }));

  // ── THM derived ──
  const thmCompleted = thmSessions.filter(s => s.completed).length;
  const thmStreak = (() => {
    const dates = [...new Set(thmSessions.map(s => s.date))].sort().reverse();
    if (!dates.length) return 0;
    let streak = 0;
    let check = new Date(today); check.setHours(0, 0, 0, 0);
    for (const d of dates) {
      const sd = new Date(d); sd.setHours(0, 0, 0, 0);
      const diff = Math.round((check - sd) / 86400000);
      if (diff <= 1) { streak++; check = sd; } else break;
    }
    return streak;
  })();
  const thmByCategory = thmCats.map(cat => ({
    cat,
    count: thmSessions.filter(s => s.category === cat).length
  })).filter(x => x.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div className="page-body animate-in">

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ id: "pmp", label: "PMP Study" }, { id: "thm", label: "TryHackMe" }].map(t => (
          <button key={t.id} className={`btn${tab === t.id ? " primary" : ""}`}
            style={{ fontWeight: tab === t.id ? 700 : 500 }}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── PMP tab ── */}
      {tab === "pmp" && (
        <>
          {showAddPmp && (
            <Modal title="Log PMP study session" onClose={() => setShowAddPmp(false)} wide>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-row">
                  <label className="form-label">Topic</label>
                  <select className="inp" value={newPmp.topic} onChange={e => setNewPmp(n => ({ ...n, topic: e.target.value }))}>
                    <option value="">Select topic...</option>
                    {TOPICS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">Hours studied</label>
                  <input className="inp" type="number" step="0.5" min="0.5" max="12"
                    value={newPmp.hours} onChange={e => setNewPmp(n => ({ ...n, hours: e.target.value }))}
                    placeholder="e.g. 1.5" />
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Date</label>
                <input className="inp" type="date" value={newPmp.date} onChange={e => setNewPmp(n => ({ ...n, date: e.target.value }))} />
              </div>
              <div className="form-row">
                <label className="form-label">Notes (optional)</label>
                <textarea className="inp" value={newPmp.notes} onChange={e => setNewPmp(n => ({ ...n, notes: e.target.value }))}
                  placeholder="What did you cover? Key takeaways..." style={{ minHeight: 70 }} />
              </div>
              <div className="modal-actions">
                <button className="btn" onClick={() => setShowAddPmp(false)}>Cancel</button>
                <button className="btn primary" onClick={addPmpSession}>Log session</button>
              </div>
            </Modal>
          )}

          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 600, whiteSpace: "nowrap" }}>Exam date</span>
              <input type="date" className="inp" style={{ padding: "4px 8px", fontSize: 12, width: 140 }}
                value={pmpGoals.examDate} onChange={e => savePmpGoal("examDate", e.target.value)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 600, whiteSpace: "nowrap" }}>Weekly goal (h)</span>
              <input type="number" className="inp" style={{ padding: "4px 8px", fontSize: 12, width: 70 }}
                min="1" max="40" value={pmpGoals.weeklyGoal} onChange={e => savePmpGoal("weeklyGoal", e.target.value)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 600, whiteSpace: "nowrap" }}>Target total (h)</span>
              <input type="number" className="inp" style={{ padding: "4px 8px", fontSize: 12, width: 80 }}
                min="1" max="999" value={pmpGoals.targetHours} onChange={e => savePmpGoal("targetHours", e.target.value)} />
            </div>
          </div>

          <div className="grid-4 mb18">
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(239,68,68,0.15)" }}><Icon name="clock" size={18} color="var(--red)" /></div>
              <div className="stat-label">Days to exam</div>
              <div className="stat-value" style={{ color: daysLeft < 60 ? "var(--red)" : daysLeft < 120 ? "var(--amber)" : "var(--t1)" }}>{daysLeft}</div>
              <div className="stat-sub">{weeksLeft} weeks · Jul 7 2026</div>
              <div className="stat-bar"><div className="stat-fill red" style={{ width: `${Math.max(0, 100 - (daysLeft / 365) * 100)}%` }} /></div>
            </div>
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(139,92,246,0.15)" }}><Icon name="study" size={18} color="var(--purple)" /></div>
              <div className="stat-label">Total hours</div>
              <div className="stat-value">{totalHours.toFixed(1)}h</div>
              <div className="stat-sub">Target: {targetHours}h</div>
              <div className="stat-bar"><div className="stat-fill" style={{ width: `${Math.min((totalHours / targetHours) * 100, 100)}%` }} /></div>
            </div>
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}><Icon name="calendar" size={18} color="var(--grn)" /></div>
              <div className="stat-label">This week</div>
              <div className="stat-value" style={{ color: thisWeekHours >= weeklyGoal ? "var(--grn)" : "var(--t1)" }}>{thisWeekHours.toFixed(1)}h</div>
              <div className="stat-sub">Goal: {weeklyGoal}h/week</div>
              <div className="stat-bar"><div className="stat-fill grn" style={{ width: `${Math.min((thisWeekHours / weeklyGoal) * 100, 100)}%` }} /></div>
            </div>
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}><Icon name="target" size={18} color="var(--amber)" /></div>
              <div className="stat-label">Sessions logged</div>
              <div className="stat-value">{pmpSessions.length}</div>
              <div className="stat-sub">Keep the momentum</div>
            </div>
          </div>

          {/* Weekly completion ring */}
          {(() => {
            const r = 52, circ = 2 * Math.PI * r;
            const pct = Math.min(thisWeekHours / weeklyGoal, 1);
            const offset = circ - circ * pct;
            const ringColor = pct >= 1 ? "var(--grn)" : pct >= 0.5 ? "var(--amber)" : "var(--red)";
            return (
              <div className="weekly-ring-wrap">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={r} fill="none" style={{ stroke: "var(--b2)" }} strokeWidth="8" />
                  <circle cx="60" cy="60" r={r} fill="none" style={{ stroke: ringColor }}
                    strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset}
                    strokeLinecap="round" transform="rotate(-90 60 60)" />
                  <text x="60" y="54" textAnchor="middle" fontSize="22" fontWeight="700"
                    style={{ fill: "var(--t1)", fontFamily: "var(--mono)" }}>{thisWeekHours.toFixed(1)}h</text>
                  <text x="60" y="71" textAnchor="middle" fontSize="12" style={{ fill: "var(--t3)" }}>/ {weeklyGoal}h goal</text>
                  <text x="60" y="87" textAnchor="middle" fontSize="10" style={{ fill: ringColor }}>
                    {pct >= 1 ? "Goal met!" : pct >= 0.5 ? "Halfway there" : "Keep pushing"}
                  </text>
                </svg>
                <div className="weekly-ring-label">This week's progress</div>
              </div>
            );
          })()}

          {(() => {
            const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const allSessions = [...pmpSessions, ...thmSessions];
            const filtered = barFilter === "all" ? allSessions : barFilter === "pmp" ? pmpSessions : thmSessions;
            const barData = (() => {
              if (barPeriod === "day") {
                return Array.from({ length: 14 }, (_, i) => {
                  const d = new Date(today); d.setDate(today.getDate() - 13 + i);
                  const dateStr = d.toISOString().slice(0, 10);
                  const hours = filtered.filter(s => s.date === dateStr).reduce((s, x) => s + (x.hours || 0), 0);
                  return { label: `${d.getDate()}/${d.getMonth()+1}`, hours };
                });
              }
              if (barPeriod === "week") {
                return Array.from({ length: barWeeks }, (_, i) => {
                  const wS = new Date(weekStart); wS.setDate(weekStart.getDate() - (barWeeks - 1 - i) * 7);
                  const wE = new Date(wS); wE.setDate(wS.getDate() + 6);
                  const hours = filtered.filter(s => {
                    const d = new Date(s.date + "T00:00:00"); return d >= wS && d <= wE;
                  }).reduce((s, x) => s + (x.hours || 0), 0);
                  return { label: `${wS.getDate()}/${wS.getMonth()+1}`, hours, metGoal: hours >= weeklyGoal && hours > 0 };
                });
              }
              if (barPeriod === "month") {
                return Array.from({ length: 12 }, (_, i) => {
                  const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
                  const y = d.getFullYear(), m = d.getMonth();
                  const hours = filtered.filter(s => {
                    const sd = new Date(s.date + "T00:00:00"); return sd.getFullYear() === y && sd.getMonth() === m;
                  }).reduce((s, x) => s + (x.hours || 0), 0);
                  return { label: MO[m], hours };
                });
              }
              if (barPeriod === "year") {
                return Array.from({ length: 3 }, (_, i) => {
                  const y = today.getFullYear() - 2 + i;
                  const hours = filtered.filter(s => new Date(s.date + "T00:00:00").getFullYear() === y)
                    .reduce((s, x) => s + (x.hours || 0), 0);
                  return { label: String(y), hours };
                });
              }
              return [];
            })();
            const barMax = Math.max(...barData.map(b => b.hours), weeklyGoal, 1);
            return (
              <div className="card mb18">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", background: "var(--bg2)", borderRadius: 8, padding: 2, gap: 1 }}>
                    {["day","week","month","year"].map(p => (
                      <button key={p} onClick={() => setBarPeriod(p)}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 11, cursor: "pointer",
                                 background: barPeriod === p ? "var(--bg1)" : "transparent",
                                 color: barPeriod === p ? "var(--t1)" : "var(--t3)",
                                 fontWeight: barPeriod === p ? 600 : 400 }}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[{id:"pmp",label:"PMP"},{id:"thm",label:"TryHackMe"},{id:"all",label:"All"}].map(f => (
                      <button key={f.id} className={`btn xs${barFilter === f.id ? " primary" : ""}`}
                        onClick={() => setBarFilter(f.id)}>{f.label}</button>
                    ))}
                  </div>
                  {barPeriod === "week" && (
                    <select className="inp" style={{ width: 90, padding: "4px 8px", fontSize: 12 }}
                      value={barWeeks} onChange={e => setBarWeeks(parseInt(e.target.value))}>
                      {[4,6,8,12].map(n => <option key={n} value={n}>{n} weeks</option>)}
                    </select>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                    <span style={{ fontSize: 11, color: "var(--t3)" }}>Goal</span>
                    <input type="number" className="inp" style={{ width: 56, padding: "4px 8px", fontSize: 12, textAlign: "center" }}
                      min="1" max="40" value={pmpGoals.weeklyGoal}
                      onChange={e => savePmpGoal("weeklyGoal", e.target.value)} />
                    <span style={{ fontSize: 11, color: "var(--t3)" }}>h/wk</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: barData.length > 8 ? 2 : 4, height: 100 }}>
                  {barData.map((bar, i) => {
                    const heightPx = Math.round((bar.hours / barMax) * 96);
                    const barColor = (bar.metGoal && barPeriod === "week") ? "var(--grn)" : "var(--blue)";
                    return (
                      <div key={i} title={`${bar.label}: ${bar.hours.toFixed(1)}h`}
                        style={{ flex: 1, height: bar.hours > 0 ? Math.max(heightPx, 3) : 0,
                                 background: barColor, borderRadius: "3px 3px 0 0",
                                 opacity: 0.85, transition: "height .3s", minWidth: 0 }} />
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: barData.length > 8 ? 2 : 4, marginTop: 4 }}>
                  {barData.map((bar, i) => (
                    <div key={i} style={{ flex: 1, fontSize: 7, color: "var(--t3)", textAlign: "center",
                                         fontFamily: "var(--mono)", overflow: "hidden", minWidth: 0 }}>
                      {bar.label}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="grid-2 mb18">
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">PMBOK Topics</div><div className="card-sub">Click name to rename · ▲▼ to reorder</div></div>
              </div>
              {topicHours.map((t, idx) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--b1)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <button className="btn xs ghost" style={{ padding: "0 5px", fontSize: 9, lineHeight: 1.4 }}
                      onClick={() => moveTopicUp(idx)} disabled={idx === 0}>▲</button>
                    <button className="btn xs ghost" style={{ padding: "0 5px", fontSize: 9, lineHeight: 1.4 }}
                      onClick={() => moveTopicDown(idx)} disabled={idx === topics.length - 1}>▼</button>
                  </div>
                  <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}><Icon name={t.icon || "notes"} size={14} color="var(--t3)" /></span>
                  {editTopicId === t.id ? (
                    <input className="inp" style={{ flex: 1, padding: "3px 8px", fontSize: 12 }}
                      value={editTopicText} autoFocus
                      onChange={e => setEditTopicText(e.target.value)}
                      onBlur={() => saveTopicName(t.id)}
                      onKeyDown={e => { if (e.key === "Enter") saveTopicName(t.id); if (e.key === "Escape") setEditTopicId(null); }} />
                  ) : (
                    <div onClick={() => { setEditTopicId(t.id); setEditTopicText(t.label); }}
                      style={{ flex: 1, fontSize: 12, color: "var(--t2)", cursor: "text" }}>{t.label}</div>
                  )}
                  <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: t.hours > 0 ? "var(--blue)" : "var(--t3)", minWidth: 36, textAlign: "right" }}>
                    {t.hours.toFixed(1)}h
                  </span>
                  {t.hours === 0 && (
                    <button className="btn xs danger" style={{ padding: "2px 6px", fontSize: 11 }}
                      onClick={() => deleteTopic(t.id)}>×</button>
                  )}
                </div>
              ))}
              <button className="btn sm" style={{ marginTop: 8, width: "100%", justifyContent: "center" }} onClick={addTopic}>
                + Add topic
              </button>
            </div>

            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Study log</div><div className="card-sub">Recent sessions</div></div>
                <button className="btn sm primary" onClick={() => setShowAddPmp(true)}><Icon name="plus" size={13} /> Log</button>
              </div>
              {pmpSessions.length === 0 && (
                <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                  No sessions yet.<br />
                  <button className="btn sm primary" style={{ marginTop: 12 }} onClick={() => setShowAddPmp(true)}>Log your first session</button>
                </div>
              )}
              {pmpSessions.slice(0, 10).map(s => {
                const topic = topics.find(t => t.id === s.topic);
                return (
                  <div key={s.id} className="fin-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}><Icon name={topic?.icon || "notes"} size={20} color="var(--t3)" /></div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{topic?.label || s.topic}</div>
                        <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>{s.date}{s.notes ? ` · ${s.notes.slice(0, 40)}` : ""}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--blue)" }}>{s.hours}h</span>
                      <button className="btn xs danger" onClick={() => deletePmpSession(s.id)}><Icon name="trash" size={11} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ background: "rgba(139,92,246,0.08)", borderColor: "rgba(139,92,246,0.2)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ flexShrink: 0 }}><Icon name="ai" size={24} color="var(--purple)" /></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>Study plan to hit July 7</div>
                <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>
                  You need <strong style={{ color: "var(--purple)" }}>{Math.max(0, targetHours - totalHours).toFixed(0)}h</strong> more to reach the {targetHours}h target.
                  With {daysLeft} days left, that's <strong style={{ color: "var(--purple)" }}>{((targetHours - totalHours) / Math.max(daysLeft / 7, 0.1)).toFixed(1)}h/week</strong> —
                  {((targetHours - totalHours) / Math.max(daysLeft / 7, 0.1)) <= weeklyGoal ? " within your weekly goal. You're on track." : " above your current goal. Consider increasing weekly hours."}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TryHackMe tab ── */}
      {tab === "thm" && (
        <>
          {showAddThm && (
            <Modal title="Log TryHackMe session" onClose={() => setShowAddThm(false)} wide>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-row">
                  <label className="form-label">Room name</label>
                  <input className="inp" value={newThm.room_name} onChange={e => setNewThm(n => ({ ...n, room_name: e.target.value }))} placeholder="e.g. Nmap" />
                </div>
                <div className="form-row">
                  <label className="form-label">Category</label>
                  <select className="inp" value={newThm.category} onChange={e => setNewThm(n => ({ ...n, category: e.target.value }))}>
                    <option value="">Select category...</option>
                    {thmCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-row">
                  <label className="form-label">Date</label>
                  <input className="inp" type="date" value={newThm.date} onChange={e => setNewThm(n => ({ ...n, date: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">Completed?</label>
                  <div style={{ display: "flex", gap: 10, paddingTop: 6 }}>
                    {[true, false].map(v => (
                      <label key={String(v)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "var(--t2)" }}>
                        <input type="radio" checked={newThm.completed === v} onChange={() => setNewThm(n => ({ ...n, completed: v }))} />
                        {v ? "Yes" : "No"}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Notes (optional)</label>
                <textarea className="inp" value={newThm.notes} onChange={e => setNewThm(n => ({ ...n, notes: e.target.value }))}
                  placeholder="What did you learn? Key commands, techniques..." style={{ minHeight: 70 }} />
              </div>
              <div className="modal-actions">
                <button className="btn" onClick={() => setShowAddThm(false)}>Cancel</button>
                <button className="btn primary" onClick={addThmSession}>Log session</button>
              </div>
            </Modal>
          )}

          <div className="grid-4 mb18">
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}><Icon name="fire" size={18} color="var(--grn)" /></div>
              <div className="stat-label">Current streak</div>
              <div className="stat-value" style={{ color: thmStreak >= 7 ? "var(--grn)" : thmStreak >= 3 ? "var(--amber)" : "var(--t1)" }}>{thmStreak}</div>
              <div className="stat-sub">{thmStreak === 1 ? "day" : "days"} in a row</div>
              <div className="stat-bar"><div className="stat-fill grn" style={{ width: `${Math.min((thmStreak / 30) * 100, 100)}%` }} /></div>
            </div>
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(123,142,200,0.15)" }}><Icon name="flag" size={18} color="#7b8ec8" /></div>
              <div className="stat-label">Rooms completed</div>
              <div className="stat-value">{thmCompleted}</div>
              <div className="stat-sub">of {thmSessions.length} logged</div>
              <div className="stat-bar"><div className="stat-fill" style={{ width: `${thmSessions.length ? (thmCompleted / thmSessions.length) * 100 : 0}%` }} /></div>
            </div>
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}><Icon name="chart" size={18} color="var(--amber)" /></div>
              <div className="stat-label">This week</div>
              <div className="stat-value">{thmSessions.filter(s => new Date(s.date) >= weekStart).length}</div>
              <div className="stat-sub">sessions this week</div>
            </div>
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(236,72,153,0.15)" }}><Icon name="folder" size={18} color="var(--pink)" /></div>
              <div className="stat-label">Categories</div>
              <div className="stat-value">{new Set(thmSessions.map(s => s.category).filter(Boolean)).size}</div>
              <div className="stat-sub">areas covered</div>
            </div>
          </div>

          <div className="grid-2 mb18">
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">By category</div><div className="card-sub">Rooms per topic area</div></div>
              </div>
              {thmByCategory.length === 0 && (
                <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No sessions yet</div>
              )}
              {thmByCategory.map(({ cat, count }) => (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--t2)" }}>{cat}</span>
                    <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--grn)" }}>{count}</span>
                  </div>
                  <div className="stat-bar" style={{ margin: 0 }}>
                    <div className="stat-fill grn" style={{ width: `${(count / Math.max(thmCompleted, 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Session log</div><div className="card-sub">Recent rooms</div></div>
                <button className="btn sm primary" onClick={() => setShowAddThm(true)}><Icon name="plus" size={13} /> Log</button>
              </div>
              {thmSessions.length === 0 && (
                <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                  No sessions yet.<br />
                  <button className="btn sm primary" style={{ marginTop: 12 }} onClick={() => setShowAddThm(true)}>Log your first room</button>
                </div>
              )}
              {thmSessions.slice(0, 12).map(s => (
                <div key={s.id} className="fin-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <div style={{ flexShrink: 0 }}><Icon name={s.completed ? "check" : "clock"} size={16} color={s.completed ? "var(--grn)" : "var(--t3)"} /></div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{s.room_name}</div>
                      <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>
                        {s.date}{s.category ? ` · ${s.category}` : ""}{s.notes ? ` · ${s.notes.slice(0, 35)}` : ""}
                      </div>
                    </div>
                  </div>
                  <button className="btn xs danger" onClick={() => deleteThmSession(s.id)}><Icon name="trash" size={11} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Editable categories */}
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Categories</div><div className="card-sub">Click to rename · × removes if unused</div></div>
              <button className="btn sm primary" onClick={addThmCat}><Icon name="plus" size={13} /> Add</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {thmCats.map((cat, idx) => {
                const used = thmSessions.filter(s => s.category === cat).length > 0;
                return editCatIdx === idx ? (
                  <input key={idx} className="inp" style={{ width: 160, padding: "4px 10px", fontSize: 12 }}
                    value={editCatText} autoFocus
                    onChange={e => setEditCatText(e.target.value)}
                    onBlur={() => saveCatName(idx)}
                    onKeyDown={e => { if (e.key === "Enter") saveCatName(idx); if (e.key === "Escape") setEditCatIdx(null); }} />
                ) : (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--bg2)", border: "1px solid var(--b2)", borderRadius: 8, padding: "4px 10px" }}>
                    <span style={{ fontSize: 12, color: "var(--t2)", cursor: "text" }}
                      onClick={() => { setEditCatIdx(idx); setEditCatText(cat); }}>{cat}</span>
                    {!used && (
                      <button style={{ fontSize: 13, color: "var(--t3)", background: "none", border: "none", cursor: "pointer", padding: "0 2px", lineHeight: 1 }}
                        onClick={() => saveThmCats(thmCats.filter((_, i) => i !== idx))}>×</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
