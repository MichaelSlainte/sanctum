import { useState, useEffect } from "react";
import { sb } from "../../lib/supabase";
import { Icon, Modal } from "../shared";

export default function Study() {
  const today = new Date();
  const [tab, setTab] = useState("pmp");

  // ── PMP ──
  const EXAM_DATE = new Date("2026-07-07T13:30");
  const daysLeft = Math.ceil((EXAM_DATE - today) / (1000 * 60 * 60 * 24));
  const weeklyGoal = 10;
  const targetHours = 150;

  const [pmpSessions, setPmpSessions] = useState([]);
  const [showAddPmp, setShowAddPmp] = useState(false);
  const [newPmp, setNewPmp] = useState({ topic: "", hours: "", notes: "", date: today.toISOString().slice(0, 10) });

  const TOPICS = [
    { id: "integration",    label: "Integration Management",    icon: "🔗" },
    { id: "scope",          label: "Scope Management",          icon: "📐" },
    { id: "schedule",       label: "Schedule Management",       icon: "📅" },
    { id: "cost",           label: "Cost Management",           icon: "💰" },
    { id: "quality",        label: "Quality Management",        icon: "⭐" },
    { id: "resource",       label: "Resource Management",       icon: "👥" },
    { id: "communications", label: "Communications Management", icon: "📢" },
    { id: "risk",           label: "Risk Management",           icon: "⚠️" },
    { id: "procurement",    label: "Procurement Management",    icon: "📦" },
    { id: "stakeholder",    label: "Stakeholder Management",    icon: "🤝" },
    { id: "agile",          label: "Agile & Hybrid",            icon: "🔄" },
    { id: "ethics",         label: "Ethics & Professional",     icon: "🎯" },
  ];

  // ── TryHackMe ──
  const [thmSessions, setThmSessions] = useState([]);
  const [showAddThm, setShowAddThm] = useState(false);
  const [newThm, setNewThm] = useState({ room_name: "", category: "", completed: true, date: today.toISOString().slice(0, 10), notes: "" });

  const THM_CATS = ["Network", "Web", "Crypto", "Linux", "Windows", "OSINT", "Forensics", "Malware", "Reverse Engineering", "Misc"];

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
    await sb.from("study_sessions").insert({ type: "pmp", ...newPmp, hours: parseFloat(newPmp.hours) });
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
    await sb.from("study_sessions").insert({ type: "thm", ...newThm });
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
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const thisWeekHours = pmpSessions
    .filter(s => new Date(s.date) >= weekStart)
    .reduce((s, x) => s + (x.hours || 0), 0);
  const topicHours = TOPICS.map(t => ({
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
  const thmByCategory = THM_CATS.map(cat => ({
    cat,
    count: thmSessions.filter(s => s.category === cat).length
  })).filter(x => x.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div className="page-body animate-in">

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[{ id: "pmp", label: "📚 PMP Study" }, { id: "thm", label: "🛡️ TryHackMe" }].map(t => (
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
                    {TOPICS.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
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

          <div className="grid-4 mb18">
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(239,68,68,0.15)" }}>⏰</div>
              <div className="stat-label">Days to exam</div>
              <div className="stat-value" style={{ color: daysLeft < 60 ? "var(--red)" : daysLeft < 120 ? "var(--amber)" : "var(--t1)" }}>{daysLeft}</div>
              <div className="stat-sub">PMP — Jul 7 2026</div>
              <div className="stat-bar"><div className="stat-fill red" style={{ width: `${Math.max(0, 100 - (daysLeft / 365) * 100)}%` }} /></div>
            </div>
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(139,92,246,0.15)" }}>📚</div>
              <div className="stat-label">Total hours</div>
              <div className="stat-value">{totalHours.toFixed(1)}h</div>
              <div className="stat-sub">Target: {targetHours}h</div>
              <div className="stat-bar"><div className="stat-fill" style={{ width: `${Math.min((totalHours / targetHours) * 100, 100)}%` }} /></div>
            </div>
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}>📅</div>
              <div className="stat-label">This week</div>
              <div className="stat-value" style={{ color: thisWeekHours >= weeklyGoal ? "var(--grn)" : "var(--t1)" }}>{thisWeekHours.toFixed(1)}h</div>
              <div className="stat-sub">Goal: {weeklyGoal}h/week</div>
              <div className="stat-bar"><div className="stat-fill grn" style={{ width: `${Math.min((thisWeekHours / weeklyGoal) * 100, 100)}%` }} /></div>
            </div>
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}>🎯</div>
              <div className="stat-label">Sessions logged</div>
              <div className="stat-value">{pmpSessions.length}</div>
              <div className="stat-sub">Keep the momentum</div>
            </div>
          </div>

          <div className="grid-2 mb18">
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">PMBOK Topics</div><div className="card-sub">Hours per knowledge area</div></div>
              </div>
              {topicHours.map(t => (
                <div key={t.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--t2)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{t.icon}</span>{t.label}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: t.hours > 0 ? "var(--blue)" : "var(--t3)" }}>{t.hours.toFixed(1)}h</span>
                  </div>
                  <div className="stat-bar" style={{ margin: 0 }}>
                    <div className="stat-fill" style={{ width: `${Math.min((t.hours / Math.max(totalHours, 1)) * 100 * TOPICS.length / 2, 100)}%`, background: t.hours > 0 ? "var(--blue)" : "var(--b3)" }} />
                  </div>
                </div>
              ))}
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
                const topic = TOPICS.find(t => t.id === s.topic);
                return (
                  <div key={s.id} className="fin-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                      <div style={{ fontSize: 20 }}>{topic?.icon || "📖"}</div>
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
              <div style={{ fontSize: 24, flexShrink: 0 }}>💡</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>Study plan to hit July 7</div>
                <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>
                  You need <strong style={{ color: "var(--purple)" }}>{Math.max(0, targetHours - totalHours).toFixed(0)}h</strong> more to reach the {targetHours}h target.
                  With {daysLeft} days left, that's <strong style={{ color: "var(--purple)" }}>{((targetHours - totalHours) / Math.max(daysLeft / 7, 0.1)).toFixed(1)}h/week</strong> —
                  {((targetHours - totalHours) / Math.max(daysLeft / 7, 0.1)) <= weeklyGoal ? " within your weekly goal. You're on track. 🎉" : " above your current goal. Consider increasing weekly hours."}
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
                    {THM_CATS.map(c => <option key={c} value={c}>{c}</option>)}
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
              <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}>🔥</div>
              <div className="stat-label">Current streak</div>
              <div className="stat-value" style={{ color: thmStreak >= 7 ? "var(--grn)" : thmStreak >= 3 ? "var(--amber)" : "var(--t1)" }}>{thmStreak}</div>
              <div className="stat-sub">{thmStreak === 1 ? "day" : "days"} in a row</div>
              <div className="stat-bar"><div className="stat-fill grn" style={{ width: `${Math.min((thmStreak / 30) * 100, 100)}%` }} /></div>
            </div>
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(123,142,200,0.15)" }}>🏁</div>
              <div className="stat-label">Rooms completed</div>
              <div className="stat-value">{thmCompleted}</div>
              <div className="stat-sub">of {thmSessions.length} logged</div>
              <div className="stat-bar"><div className="stat-fill" style={{ width: `${thmSessions.length ? (thmCompleted / thmSessions.length) * 100 : 0}%` }} /></div>
            </div>
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}>📊</div>
              <div className="stat-label">This week</div>
              <div className="stat-value">{thmSessions.filter(s => new Date(s.date) >= weekStart).length}</div>
              <div className="stat-sub">sessions this week</div>
            </div>
            <div className="stat">
              <div className="stat-icon" style={{ background: "rgba(236,72,153,0.15)" }}>🗂️</div>
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
                    <div style={{ fontSize: 18, flexShrink: 0 }}>{s.completed ? "✅" : "🔄"}</div>
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
        </>
      )}
    </div>
  );
}
