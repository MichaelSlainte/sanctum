// Copyright (c) 2026 Sanctum — Michael & Tamara. All rights reserved.
import { useState, useEffect } from "react";
import { sb } from "../../lib/supabase";
import { Icon, Modal } from "../shared";

function PMPRoadmapTimeline() {
  const [milestones, setMilestones] = useState([]);
  const [trackColor, setTrackColor] = useState("#f59e0b");

  useEffect(() => {
    (async () => {
      try {
        const projs = await sb.from("roadmap_projects").select("*");
        if (!Array.isArray(projs) || projs.length === 0) return;
        const proj = projs.find(p => p.name === "Project Phoenix") || projs[projs.length - 1];
        if (!proj) return;
        const tracks = await sb.from("roadmap_tracks").select("*", `&project_id=eq.${proj.id}`);
        if (!Array.isArray(tracks)) return;
        const pmpTrack = tracks.find(t => t.label === "PMP Certification");
        if (!pmpTrack) return;
        setTrackColor(pmpTrack.color || "#f59e0b");
        const ms = await sb.from("roadmap_milestones").select("*", `&track_id=eq.${pmpTrack.id}`);
        if (Array.isArray(ms)) setMilestones(ms.sort((a, b) => a.date.localeCompare(b.date)));
      } catch {}
    })();
  }, []);

  if (milestones.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const startD = new Date(milestones[0].date + "T00:00:00");
  const endD   = new Date(milestones[milestones.length - 1].date + "T00:00:00");
  const span   = endD - startD || 1;
  const toPct  = (ds) => ((new Date(ds + "T00:00:00") - startD) / span) * 100;
  const todayPct = toPct(today);

  return (
    <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 14, padding: "14px 18px", marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 12 }}>
        PMP Certification · Exam Timeline
      </div>
      <div style={{ position: "relative", height: 52, overflowX: "auto" }}>
        <div style={{ minWidth: 320, position: "relative", height: 52 }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: `${trackColor}30`, transform: "translateY(-50%)" }} />
          {todayPct >= 0 && todayPct <= 100 && (
            <div style={{ position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0, width: 1, background: "#ef4444", opacity: 0.5 }} />
          )}
          {milestones.map((ms, idx) => {
            const x = toPct(ms.date);
            if (x < 0 || x > 101) return null;
            const above = idx % 2 === 0;
            return (
              <div key={ms.id} style={{ position: "absolute", left: `${x}%`, top: 0, bottom: 0, zIndex: 2 }}>
                <div style={{
                  position: "absolute", left: "50%",
                  ...(above ? { top: 2 } : { bottom: 2 }),
                  transform: "translateX(-50%)",
                  fontSize: 9, color: ms.completed ? trackColor : "var(--t3)",
                  whiteSpace: "nowrap", fontFamily: "var(--mono)",
                  fontWeight: ms.completed ? 700 : 400,
                  textShadow: "0 0 4px var(--bg)",
                }}>{ms.label}</div>
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  width: 11, height: 11, borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  background: ms.completed ? trackColor : "var(--bg)",
                  border: `2px solid ${trackColor}`,
                  boxSizing: "border-box",
                }} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "var(--t3)", fontFamily: "var(--mono)" }}>
        <span>{milestones[0]?.date?.slice(0, 7)}</span>
        <span style={{ color: "#ef4444" }}>today</span>
        <span>{milestones[milestones.length - 1]?.date?.slice(0, 7)}</span>
      </div>
    </div>
  );
}

const DEFAULT_PMP_TOPICS = [
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

const SUBJECT_COLORS = ["#f59e0b", "#10b981", "#6366f1", "#ec4899", "#8b5cf6", "#06b6d4", "#f97316", "#ef4444"];

function buildDefaultSubjects() {
  let pmpTopics = DEFAULT_PMP_TOPICS;
  try {
    const old = JSON.parse(localStorage.getItem("sanctum_pmbok_topics"));
    if (Array.isArray(old) && old.length > 0) pmpTopics = old;
  } catch {}
  return [
    { id: "pmp", label: "PMP", color: "#f59e0b", topics: pmpTopics },
    { id: "thm", label: "TryHackMe", color: "#10b981", topics: [] },
  ];
}

export default function Study({ user }) {
  const today = new Date();

  // PMP goals
  const [pmpGoals, setPmpGoals] = useState({
    examDate:    localStorage.getItem("sanctum_pmp_date")    || "2026-07-07",
    weeklyGoal:  localStorage.getItem("sanctum_study_goal")  || "10",
    targetHours: localStorage.getItem("sanctum_pmp_target")  || "150",
  });
  const savePmpGoal = (key, val) => {
    const lsKeys = { examDate: "sanctum_pmp_date", weeklyGoal: "sanctum_study_goal", targetHours: "sanctum_pmp_target" };
    localStorage.setItem(lsKeys[key], val);
    const updated = { ...pmpGoals, [key]: val };
    setPmpGoals(updated);
    sb.from('ozzy_profile').upsert({
      key: 'study_config_' + user?.id,
      value: JSON.stringify({ weeklyGoal: updated.weeklyGoal, targetTotal: updated.targetHours, examDate: updated.examDate }),
      user_id: user?.id,
    }, 'key,user_id').catch(() => {});
  };
  const EXAM_DATE  = new Date(pmpGoals.examDate + "T13:30");
  const daysLeft   = Math.ceil((EXAM_DATE - today) / (1000 * 60 * 60 * 24));
  const weeklyGoal = parseFloat(pmpGoals.weeklyGoal) || 10;
  const targetHours = parseFloat(pmpGoals.targetHours) || 150;

  // Subjects (localStorage — each subject has its own topics array)
  const [subjects, setSubjects] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("sanctum_study_subjects"));
      if (Array.isArray(s) && s.length > 0) return s;
    } catch {}
    return buildDefaultSubjects();
  });
  const saveSubjects = (s) => {
    localStorage.setItem("sanctum_study_subjects", JSON.stringify(s));
    setSubjects(s);
  };
  const loadSubjectsAndTopics = async () => {
    try {
      const [dbSubjects, dbTopics] = await Promise.all([
        sb.from("study_subjects").select("*", "", "position.asc"),
        sb.from("study_topics").select("*", "", "position.asc"),
      ]);
      if (!Array.isArray(dbSubjects)) return;
      const built = dbSubjects.map(s => ({
        id: s.id,
        label: s.label,
        color: s.color,
        topics: Array.isArray(dbTopics)
          ? dbTopics.filter(t => t.subject_id === s.id).map(t => ({ id: t.id, label: t.label, icon: t.icon || "notes" }))
          : [],
      }));
      setSubjects(built);
      localStorage.setItem("sanctum_study_subjects", JSON.stringify(built));
    } catch {}
  };

  // Collapsed subject IDs
  const [collapsedSubjects, setCollapsedSubjects] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("sanctum_study_collapsed")) || []); } catch { return new Set(); }
  });
  const toggleCollapse = (id) => {
    setCollapsedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("sanctum_study_collapsed", JSON.stringify([...next]));
      return next;
    });
  };

  // Subject edit state
  const [editSubjectId,   setEditSubjectId]   = useState(null);
  const [editSubjectText, setEditSubjectText] = useState("");

  // Topic edit state (key = "subjId:topicId")
  const [editTopicKey,       setEditTopicKey]       = useState(null);
  const [editTopicText,      setEditTopicText]      = useState("");
  const [addTopicSubjectId,  setAddTopicSubjectId]  = useState(null);
  const [addTopicDraft,      setAddTopicDraft]      = useState("");

  // Sessions (Supabase)
  const [allSessions, setAllSessions] = useState([]);
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSession, setNewSession] = useState({
    subject: subjects[0]?.id || "pmp",
    topic: "",
    hours: "",
    notes: "",
    date: today.toISOString().slice(0, 10),
  });

  const openSessionModal = () => {
    setShowAddSession(true);
    setTimeout(() => {
      document.querySelector('.page-body')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  // Chart
  const [barPeriod, setBarPeriod] = useState("week");
  const [barFilter, setBarFilter] = useState("all");
  const [barWeeks,  setBarWeeks]  = useState(6);

  useEffect(() => {
    loadAll();
    loadSubjectsAndTopics();
    sb.from('ozzy_profile').select('*', `&key=eq.study_config_${user?.id}`, '').then(rows => {
      if (Array.isArray(rows) && rows[0]?.value) {
        try {
          const cfg = JSON.parse(rows[0].value);
          setPmpGoals(g => ({
            weeklyGoal:  cfg.weeklyGoal  || g.weeklyGoal,
            targetHours: cfg.targetTotal || g.targetHours,
            examDate:    cfg.examDate    || g.examDate,
          }));
        } catch {}
      }
    });
  }, []);
  const loadAll = async () => {
    const data = await sb.from("study_sessions").select("*");
    if (Array.isArray(data)) setAllSessions(data);
  };

  // Session ops
  const addSession = async () => {
    if (!newSession.topic || !newSession.hours) return;
    await sb.from("study_sessions").insert({
      type: newSession.subject,
      topic: newSession.topic,
      hours: parseFloat(newSession.hours),
      notes: newSession.notes,
      date: newSession.date,
      user_id: user?.id,
    });
    await loadAll();
    setNewSession(n => ({ ...n, topic: "", hours: "", notes: "" }));
    setShowAddSession(false);
  };
  const deleteSession = async (id) => {
    await sb.from("study_sessions").delete({ id });
    setAllSessions(s => s.filter(x => x.id !== id));
  };

  // Subject ops
  const addSubject = async () => {
    const color = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];
    const position = subjects.length;
    let subjId = `subj_${Date.now()}`;
    try {
      const res = await sb.from("study_subjects").insert({ user_id: user?.id, label: "New Subject", color, position });
      if (Array.isArray(res) && res[0]?.id) subjId = res[0].id;
    } catch {}
    const updated = [...subjects, { id: subjId, label: "New Subject", color, topics: [] }];
    saveSubjects(updated);
    setEditSubjectId(subjId);
    setEditSubjectText("New Subject");
  };
  const saveSubjectName = (id, text) => {
    const trimmed = text.trim();
    if (trimmed) {
      saveSubjects(subjects.map(s => s.id === id ? { ...s, label: trimmed } : s));
      sb.from("study_subjects").update({ label: trimmed }, { id }).catch(() => {});
    }
    setEditSubjectId(null);
  };
  const deleteSubject = (id) => {
    const hasSessions = allSessions.some(s => s.type === id);
    if (hasSessions && !window.confirm("This subject has sessions logged. Delete anyway?")) return;
    saveSubjects(subjects.filter(s => s.id !== id));
    sb.from("study_topics").delete({ subject_id: id }).catch(() => {});
    sb.from("study_subjects").delete({ id }).catch(() => {});
  };
  const cycleSubjectColor = (id) => {
    const subj = subjects.find(s => s.id === id);
    const idx = SUBJECT_COLORS.indexOf(subj?.color);
    const nextColor = SUBJECT_COLORS[(idx + 1) % SUBJECT_COLORS.length];
    saveSubjects(subjects.map(s => s.id === id ? { ...s, color: nextColor } : s));
    sb.from("study_subjects").update({ color: nextColor }, { id }).catch(() => {});
  };

  // Topic ops
  const moveTopicUp = (subjId, i) => {
    const updated = subjects.map(s => {
      if (s.id !== subjId || i === 0) return s;
      const t = [...s.topics]; [t[i - 1], t[i]] = [t[i], t[i - 1]];
      return { ...s, topics: t };
    });
    saveSubjects(updated);
    const subj = updated.find(s => s.id === subjId);
    if (subj && i > 0) {
      sb.from("study_topics").update({ position: i - 1 }, { id: subj.topics[i - 1].id }).catch(() => {});
      sb.from("study_topics").update({ position: i },     { id: subj.topics[i].id     }).catch(() => {});
    }
  };
  const moveTopicDown = (subjId, i) => {
    const updated = subjects.map(s => {
      if (s.id !== subjId || i === s.topics.length - 1) return s;
      const t = [...s.topics]; [t[i + 1], t[i]] = [t[i], t[i + 1]];
      return { ...s, topics: t };
    });
    saveSubjects(updated);
    const subj = updated.find(s => s.id === subjId);
    if (subj && i < subj.topics.length - 1) {
      sb.from("study_topics").update({ position: i },     { id: subj.topics[i].id     }).catch(() => {});
      sb.from("study_topics").update({ position: i + 1 }, { id: subj.topics[i + 1].id }).catch(() => {});
    }
  };
  const saveTopicName = (subjId, topicId, text) => {
    const trimmed = text.trim();
    if (trimmed) {
      saveSubjects(subjects.map(s => s.id !== subjId ? s : {
        ...s, topics: s.topics.map(t => t.id === topicId ? { ...t, label: trimmed } : t),
      }));
      sb.from("study_topics").update({ label: trimmed }, { id: topicId }).catch(() => {});
    }
    setEditTopicKey(null);
    setEditTopicText("");
  };
  const deleteTopic = (subjId, topicId) => {
    saveSubjects(subjects.map(s => s.id !== subjId ? s : {
      ...s, topics: s.topics.filter(t => t.id !== topicId),
    }));
    sb.from("study_topics").delete({ id: topicId }).catch(() => {});
  };
  const addTopic = async (subjId) => {
    const name = addTopicDraft.trim();
    if (!name) { setAddTopicSubjectId(null); setAddTopicDraft(""); return; }
    const subj = subjects.find(s => s.id === subjId);
    const position = subj ? subj.topics.length : 0;
    setAddTopicDraft("");
    setAddTopicSubjectId(null);
    let topicId = `topic_${Date.now()}`;
    try {
      const res = await sb.from("study_topics").insert({ subject_id: subjId, user_id: user?.id, label: name, icon: "notes", position });
      if (Array.isArray(res) && res[0]?.id) topicId = res[0].id;
    } catch {}
    saveSubjects(subjects.map(s => s.id !== subjId ? s : {
      ...s, topics: [...s.topics, { id: topicId, label: name, icon: "notes" }],
    }));
  };

  // Derived stats
  const pmpSessions = allSessions;
  const totalPmpHours = pmpSessions.reduce((s, x) => s + (x.hours || 0), 0);
  const totalLoggedHours = allSessions.reduce((s, x) => s + (x.hours || 0), 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
  weekStart.setHours(0, 0, 0, 0);
  const thisWeekPmpHours = pmpSessions.filter(s => new Date(s.date) >= weekStart).reduce((s, x) => s + (x.hours || 0), 0);
  const weeksLeft = Math.ceil(daysLeft / 7);

  const selectedSubject = subjects.find(s => s.id === newSession.subject);

  return (
    <div className="page-body animate-in">

      {/* Log session modal */}
      {showAddSession && (
        <Modal title="Log study session" onClose={() => setShowAddSession(false)} wide>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row">
              <label className="form-label">Subject</label>
              <select className="inp" value={newSession.subject}
                onChange={e => setNewSession(n => ({ ...n, subject: e.target.value, topic: "" }))}>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label className="form-label">{selectedSubject?.topics?.length > 0 ? "Topic" : "Room / Topic"}</label>
              {selectedSubject?.topics?.length > 0 ? (
                <select className="inp" value={newSession.topic} onChange={e => setNewSession(n => ({ ...n, topic: e.target.value }))}>
                  <option value="">Select topic...</option>
                  {selectedSubject.topics.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              ) : (
                <input className="inp" value={newSession.topic}
                  onChange={e => setNewSession(n => ({ ...n, topic: e.target.value }))}
                  placeholder="e.g. Nmap, Network Security..." />
              )}
            </div>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row">
              <label className="form-label">Hours studied</label>
              <input className="inp" type="number" step="0.5" min="0.5" max="12"
                value={newSession.hours} onChange={e => setNewSession(n => ({ ...n, hours: e.target.value }))}
                placeholder="e.g. 1.5" />
            </div>
            <div className="form-row">
              <label className="form-label">Date</label>
              <input className="inp" type="date" value={newSession.date} onChange={e => setNewSession(n => ({ ...n, date: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">Notes (optional)</label>
            <textarea className="inp" value={newSession.notes} onChange={e => setNewSession(n => ({ ...n, notes: e.target.value }))}
              placeholder="What did you cover? Key takeaways..." style={{ minHeight: 70 }} />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowAddSession(false)}>Cancel</button>
            <button className="btn primary" onClick={addSession}>Log session</button>
          </div>
        </Modal>
      )}

      {/* PMP goals bar */}
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
        <button className="btn sm primary" style={{ marginLeft: "auto" }} onClick={openSessionModal}>
          <Icon name="plus" size={13} /> Log session
        </button>
      </div>

      <PMPRoadmapTimeline />

      {/* PMP stats */}
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
          <div className="stat-label">PMP hours</div>
          <div className="stat-value">{totalPmpHours.toFixed(1)}h</div>
          <div className="stat-sub">Target: {targetHours}h</div>
          <div className="stat-bar"><div className="stat-fill" style={{ width: `${Math.min((totalPmpHours / targetHours) * 100, 100)}%` }} /></div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}><Icon name="calendar" size={18} color="var(--grn)" /></div>
          <div className="stat-label">This week</div>
          <div className="stat-value" style={{ color: thisWeekPmpHours >= weeklyGoal ? "var(--grn)" : "var(--t1)" }}>{thisWeekPmpHours.toFixed(1)}h</div>
          <div className="stat-sub">Goal: {weeklyGoal}h/week</div>
          <div className="stat-bar"><div className="stat-fill grn" style={{ width: `${Math.min((thisWeekPmpHours / weeklyGoal) * 100, 100)}%` }} /></div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}><Icon name="target" size={18} color="var(--amber)" /></div>
          <div className="stat-label">Total sessions</div>
          <div className="stat-value">{allSessions.length}</div>
          <div className="stat-sub">All subjects</div>
        </div>
      </div>

      {/* Weekly ring */}
      {(() => {
        const r = 52, circ = 2 * Math.PI * r;
        const pct = Math.min(thisWeekPmpHours / weeklyGoal, 1);
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
                style={{ fill: "var(--t1)", fontFamily: "var(--mono)" }}>{thisWeekPmpHours.toFixed(1)}h</text>
              <text x="60" y="71" textAnchor="middle" fontSize="12" style={{ fill: "var(--t3)" }}>/ {weeklyGoal}h goal</text>
              <text x="60" y="87" textAnchor="middle" fontSize="10" style={{ fill: ringColor }}>
                {pct >= 1 ? "Goal met!" : pct >= 0.5 ? "Halfway there" : "Keep pushing"}
              </text>
            </svg>
            <div className="weekly-ring-label">This week's PMP</div>
          </div>
        );
      })()}

      {/* Bar chart */}
      {(() => {
        const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const filtered = barFilter === "all" ? allSessions : allSessions.filter(s => s.type === barFilter);
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
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button className={`btn xs${barFilter === "all" ? " primary" : ""}`} onClick={() => setBarFilter("all")}>All</button>
                {subjects.map(s => (
                  <button key={s.id} className={`btn xs${barFilter === s.id ? " primary" : ""}`}
                    onClick={() => setBarFilter(s.id)}>{s.label}</button>
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
                  min="1" max="40" value={pmpGoals.weeklyGoal} onChange={e => savePmpGoal("weeklyGoal", e.target.value)} />
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

      {/* Subjects & Topics */}
      <div className="card mb18">
        <div className="card-header">
          <div>
            <div className="card-title">Subjects & Topics</div>
            <div className="card-sub">Click name to rename · ▲▼ to reorder topics · click dot to change colour</div>
          </div>
          <button className="btn sm primary" onClick={addSubject}><Icon name="plus" size={13} /> Add subject</button>
        </div>

        {subjects.map((subj) => {
          const subjSessions = allSessions.filter(s => s.type === subj.id);
          const subjHours = subjSessions.reduce((s, x) => s + (x.hours || 0), 0);
          const isCollapsed = collapsedSubjects.has(subj.id);
          return (
            <div key={subj.id} style={{ marginBottom: 18, borderLeft: `3px solid ${subj.color}`, paddingLeft: 14 }}>
              {/* Subject header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isCollapsed ? 0 : 10 }}>
                <button onClick={() => toggleCollapse(subj.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", fontSize: 11, padding: "0 2px", lineHeight: 1 }}>
                  {isCollapsed ? "▶" : "▼"}
                </button>
                <div
                  title="Click to cycle colour"
                  onClick={() => cycleSubjectColor(subj.id)}
                  style={{ width: 13, height: 13, borderRadius: "50%", background: subj.color, cursor: "pointer", flexShrink: 0 }}
                />
                {editSubjectId === subj.id ? (
                  <input className="inp" style={{ flex: 1, padding: "3px 8px", fontSize: 13, fontWeight: 600 }}
                    value={editSubjectText} autoFocus
                    onChange={e => setEditSubjectText(e.target.value)}
                    onBlur={e => saveSubjectName(subj.id, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") { e.preventDefault(); saveSubjectName(subj.id, editSubjectText); }
                      if (e.key === "Escape") setEditSubjectId(null);
                    }} />
                ) : (
                  <div onClick={() => { setEditSubjectId(subj.id); setEditSubjectText(subj.label); }}
                    title="Click to rename"
                    style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--t1)", cursor: "text" }}>
                    {subj.label}
                  </div>
                )}
                <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--t3)", whiteSpace: "nowrap" }}>
                  {subjHours.toFixed(1)}h · {subjSessions.length} sessions
                </span>
                {subjects.length > 1 && (
                  <button className="btn xs danger" style={{ padding: "2px 6px", fontSize: 11 }}
                    onClick={() => deleteSubject(subj.id)}>×</button>
                )}
              </div>

              {/* Topics list */}
              {!isCollapsed && (
                <>
                  {subj.topics.map((t, idx) => {
                    const topicHours = allSessions.filter(s => s.type === subj.id && s.topic === t.id)
                      .reduce((s, x) => s + (x.hours || 0), 0);
                    const editKey = `${subj.id}:${t.id}`;
                    return (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid var(--b1)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <button type="button" className="btn xs ghost" style={{ padding: "0 5px", fontSize: 9, lineHeight: 1.4 }}
                            onClick={() => moveTopicUp(subj.id, idx)} disabled={idx === 0}>▲</button>
                          <button type="button" className="btn xs ghost" style={{ padding: "0 5px", fontSize: 9, lineHeight: 1.4 }}
                            onClick={() => moveTopicDown(subj.id, idx)} disabled={idx === subj.topics.length - 1}>▼</button>
                        </div>
                        <span style={{ flexShrink: 0 }}><Icon name={t.icon || "notes"} size={14} color="var(--t3)" /></span>
                        {editTopicKey === editKey ? (
                          <input className="inp" style={{ flex: 1, padding: "3px 8px", fontSize: 12 }}
                            value={editTopicText} autoFocus
                            onChange={e => setEditTopicText(e.target.value)}
                            onBlur={e => saveTopicName(subj.id, t.id, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") { e.preventDefault(); saveTopicName(subj.id, t.id, editTopicText); }
                              if (e.key === "Escape") { setEditTopicKey(null); setEditTopicText(""); }
                            }} />
                        ) : (
                          <div onClick={() => { setEditTopicKey(editKey); setEditTopicText(t.label); }}
                            title="Click to rename"
                            style={{ flex: 1, fontSize: 12, color: "var(--t2)", cursor: "text", padding: "2px 0" }}>
                            {t.label}
                          </div>
                        )}
                        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: topicHours > 0 ? "var(--blue)" : "var(--t3)", minWidth: 36, textAlign: "right" }}>
                          {topicHours.toFixed(1)}h
                        </span>
                        <button type="button" className="btn xs danger" style={{ padding: "2px 6px", fontSize: 11 }}
                          onClick={() => {
                            if (topicHours > 0 && !window.confirm(`"${t.label}" has ${topicHours.toFixed(1)}h logged. Delete anyway?`)) return;
                            deleteTopic(subj.id, t.id);
                          }}>×</button>
                      </div>
                    );
                  })}
                  {subj.topics.length === 0 && addTopicSubjectId !== subj.id && (
                    <div style={{ fontSize: 12, color: "var(--t3)", padding: "4px 0 8px", fontStyle: "italic" }}>
                      No topics yet — sessions use free-text topic names.
                    </div>
                  )}
                  {addTopicSubjectId === subj.id ? (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <input className="inp" style={{ flex: 1, padding: "5px 10px", fontSize: 12 }}
                        value={addTopicDraft} autoFocus placeholder="Topic name…"
                        onChange={e => setAddTopicDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") addTopic(subj.id);
                          if (e.key === "Escape") { setAddTopicSubjectId(null); setAddTopicDraft(""); }
                        }} />
                      <button type="button" className="btn sm primary" onClick={() => addTopic(subj.id)}>Add</button>
                      <button type="button" className="btn sm" onClick={() => { setAddTopicSubjectId(null); setAddTopicDraft(""); }}>Cancel</button>
                    </div>
                  ) : (
                    <button type="button" className="btn xs ghost" style={{ marginTop: 4, fontSize: 11 }}
                      onClick={() => { setAddTopicSubjectId(subj.id); setAddTopicDraft(""); }}>
                      <Icon name="plus" size={11} /> Add topic
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Unified study log */}
      <div className="card mb18">
        <div className="card-header">
          <div><div className="card-title">Study log</div><div className="card-sub">All recent sessions</div></div>
          <button className="btn sm primary" onClick={openSessionModal}><Icon name="plus" size={13} /> Log</button>
        </div>
        {allSessions.length === 0 && (
          <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
            No sessions yet.<br />
            <button className="btn sm primary" style={{ marginTop: 12 }} onClick={openSessionModal}>Log your first session</button>
          </div>
        )}
        {allSessions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15).map(s => {
          const subj = subjects.find(x => x.id === s.type);
          const topic = subj?.topics?.find(t => t.id === s.topic);
          const topicLabel = topic?.label || s.topic || s.room_name || "—";
          return (
            <div key={s.id} className="fin-row">
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: subj?.color || "var(--blue)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{topicLabel}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>
                    {subj?.label || s.type} · {s.date}{s.notes ? ` · ${s.notes.slice(0, 40)}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {(s.hours > 0) && <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--blue)" }}>{s.hours}h</span>}
                <button className="btn xs danger" onClick={() => deleteSession(s.id)}><Icon name="trash" size={11} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Study plan hint */}
      <div className="card" style={{ background: "rgba(139,92,246,0.08)", borderColor: "rgba(139,92,246,0.2)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ flexShrink: 0 }}><Icon name="ai" size={24} color="var(--purple)" /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>Study plan to hit July 7</div>
            <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>
              You need <strong style={{ color: "var(--purple)" }}>{Math.max(0, targetHours - totalLoggedHours).toFixed(0)}h</strong> more to reach the {targetHours}h PMP target.
              With {daysLeft} days left, that's <strong style={{ color: "var(--purple)" }}>{((targetHours - totalLoggedHours) / Math.max(daysLeft / 7, 0.1)).toFixed(1)}h/week</strong> —
              {((targetHours - totalLoggedHours) / Math.max(daysLeft / 7, 0.1)) <= weeklyGoal
                ? " within your weekly goal. You're on track."
                : " above your current goal. Consider increasing weekly hours."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
