import { useState, useEffect, useRef } from "react";
import { sb } from "../lib/supabase";
import { Icon, Modal, EVENT_COLORS, SanctumLogo } from "./shared";
import Roadmap from "./Roadmap";

function Dashboard({ onNavigate, onGoToCalendarDay }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [newTask, setNewTask] = useState({ text: "", tag: "" });
  const [events, setEvents] = useState([]);
  const [showArchived, setShowArchived] = useState(false);

  const today = new Date();
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const weekDates = DAYS.map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - todayDow + i);
    return d;
  });

  useEffect(() => { loadTasks(); loadEvents(); }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await sb.from("tasks").select("*");
      if (Array.isArray(data) && data.length > 0) setTasks(data);
      else setTasks([]);
    } catch { setTasks([]); }
    setLoading(false);
  };

  const loadEvents = async () => {
    try {
      const data = await sb.from("events").select("*");
      if (Array.isArray(data)) setEvents(data);
    } catch { }
  };

  const toggleTask = async (t) => {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done } : x));
    try { await sb.from("tasks").update({ done: !t.done }, { id: t.id }); } catch { }
  };

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try { await sb.from("tasks").delete({ id }); } catch { }
  };

  const startEdit = (t) => { setEditingId(t.id); setEditText(t.text); };

  const saveEdit = async (id) => {
    if (!editText.trim()) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text: editText } : t));
    setEditingId(null);
    try { await sb.from("tasks").update({ text: editText }, { id }); } catch { }
  };

  const addTask = async () => {
    if (!newTask.text.trim()) return;
    const task = { text: newTask.text, tag: newTask.tag, done: false };
    try {
      const res = await sb.from("tasks").insert(task);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...task, id: Date.now().toString() };
      setTasks(t => [...t, created]);
    } catch { setTasks(t => [...t, { ...task, id: Date.now().toString() }]); }
    setNewTask({ text: "", tag: "" }); setShowAdd(false);
  };

  const eventsOnDate = (date) => {
    const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return events.filter(e => e.date === ds);
  };

  const done = tasks.filter(t => t.done).length;
  const activeTasks = tasks.filter(t => !t.done);
  const archivedTasks = tasks.filter(t => t.done);

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Add task" onClose={() => setShowAdd(false)}>
          <div className="form-row"><label className="form-label">Task</label>
            <input className="inp" value={newTask.text} onChange={e => setNewTask(n => ({ ...n, text: e.target.value }))}
              placeholder="What needs doing?" onKeyDown={e => e.key === "Enter" && addTask()} autoFocus /></div>
          <div className="form-row"><label className="form-label">Tag</label>
            <input className="inp" value={newTask.tag} onChange={e => setNewTask(n => ({ ...n, tag: e.target.value }))}
              placeholder="Career, PMP, Travel..." /></div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn primary" onClick={addTask}>Add task</button>
          </div>
        </Modal>
      )}

      {/* Week strip */}
      <div className="card mb18">
        <div className="card-header">
          <div>
            <div className="card-title">This week</div>
            <div className="card-sub">{today.toLocaleDateString("en-IE", { month: "long", year: "numeric" })}</div>
          </div>
          <span className="badge green">{done}/{tasks.length} done</span>
        </div>
        <div className="week-strip">
          {weekDates.map((date, i) => {
            const dayEvents = eventsOnDate(date);
            const isToday = i === todayDow;
            return (
              <div key={i} className={`day-cell${isToday ? " today" : ""}${dayEvents.length > 0 ? " has-event" : ""}`}
                onClick={() => onGoToCalendarDay(date)}>
                <div className="day-name">{DAYS[i]}</div>
                <div className="day-num">{date.getDate()}</div>
                <div className="day-dots">
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <div key={j} className="day-dot" style={{ background: EVENT_COLORS[ev.category]?.color || "var(--blue)" }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stat widgets */}
      <div className="grid-4 mb18">
        <div className="dash-widget" onClick={() => onNavigate("career")}>
          <div className="dw-arrow"><Icon name="chevR" size={16} /></div>
          <div className="dw-icon" style={{ background: "rgba(245,158,11,0.15)", color: "var(--amber)" }}><Icon name="career" size={20} color="var(--amber)" /></div>
          <div className="dw-label">Applications</div>
          <div className="dw-value">3</div>
          <div className="dw-sub">Anthropic, Google ×2</div>
        </div>
        <div className="dash-widget" onClick={() => onNavigate("study")}>
          <div className="dw-arrow"><Icon name="chevR" size={16} /></div>
          <div className="dw-icon" style={{ background: "rgba(139,92,246,0.15)", color: "var(--purple)" }}><Icon name="study" size={20} color="var(--purple)" /></div>
          <div className="dw-label">PMP Exam</div>
          <div className="dw-value">Jul 7</div>
          <div className="dw-sub">2026 target</div>
        </div>
        <div className="dash-widget" onClick={() => onNavigate("finance")}>
          <div className="dw-arrow"><Icon name="chevR" size={16} /></div>
          <div className="dw-icon" style={{ background: "rgba(16,185,129,0.15)", color: "var(--grn)" }}><Icon name="finance" size={20} color="var(--grn)" /></div>
          <div className="dw-label">Monthly spend</div>
          <div className="dw-value">€685</div>
          <div className="dw-sub">Apr 2026</div>
        </div>
        <div className="dash-widget" onClick={() => onNavigate("travel")}>
          <div className="dw-arrow"><Icon name="chevR" size={16} /></div>
          <div className="dw-icon" style={{ background: "rgba(59,130,246,0.15)", color: "var(--blue)" }}><Icon name="travel" size={20} color="var(--blue)" /></div>
          <div className="dw-label">Next trip</div>
          <div className="dw-value">152d</div>
          <div className="dw-sub">Scotland — Sep 7</div>
        </div>
      </div>

      {/* Tasks + Notes preview */}
      <div className="grid-2 mb18">
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Tasks</div><div className="card-sub">{activeTasks.length} active · {archivedTasks.length} done</div></div>
            <button className="btn sm primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Add</button>
          </div>
          {loading ? <div className="loading">Loading...</div> : (
            <div>
              {activeTasks.length === 0 && (
                <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No active tasks 🎉</div>
              )}
              {activeTasks.map(t => (
                <div key={t.id} className="task-item">
                  <div className="task-check" onClick={() => toggleTask(t)} />
                  <div className="task-content">
                    {editingId === t.id ? (
                      <input className="task-edit-input" value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onBlur={() => saveEdit(t.id)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(t.id); if (e.key === "Escape") setEditingId(null); }}
                        autoFocus />
                    ) : (
                      <div className="task-text">{t.text}</div>
                    )}
                    {t.tag && <div className="task-meta"><span className="task-tag">{t.tag}</span></div>}
                  </div>
                  <div className="task-actions">
                    <button className="btn xs ghost" onClick={() => startEdit(t)}><Icon name="edit" size={12} /></button>
                    <button className="btn xs danger" onClick={() => deleteTask(t.id)}><Icon name="trash" size={12} /></button>
                  </div>
                </div>
              ))}

              {archivedTasks.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn sm ghost" style={{ width: "100%", justifyContent: "center", color: "var(--t3)", fontSize: 11 }}
                    onClick={() => setShowArchived(s => !s)}>
                    {showArchived ? "▲ Hide" : "▼ Show"} {archivedTasks.length} completed
                  </button>
                  {showArchived && archivedTasks.map(t => (
                    <div key={t.id} className="task-item" style={{ opacity: .5 }}>
                      <div className="task-check done" onClick={() => toggleTask(t)}>
                        <Icon name="check" size={10} color="#fff" />
                      </div>
                      <div className="task-content">
                        <div className="task-text done">{t.text}</div>
                        {t.tag && <div className="task-meta"><span className="task-tag">{t.tag}</span></div>}
                      </div>
                      <div className="task-actions">
                        <button className="btn xs danger" onClick={() => deleteTask(t.id)}><Icon name="trash" size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Quick access</div></div>
          </div>
          <div className="grid-2" style={{ gap: 10 }}>
            {[
              { label: "Notes", emoji: "📝", page: "notes", sub: "Notebooks & sections" },
              { label: "Calendar", emoji: "📅", page: "calendar", sub: "Events & plans" },
              { label: "Finance", emoji: "💰", page: "finance", sub: "Apr balance: €3,344" },
              { label: "Ozzy", emoji: "🐾", page: "pet", sub: "Golden Retriever" },
            ].map(item => (
              <div key={item.page} onClick={() => onNavigate(item.page)}
                style={{ background: "var(--bg2)", border: "1px solid var(--b1)", borderRadius: 12, padding: 16, cursor: "pointer", transition: "all .2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--b3)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--b1)"}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{item.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "var(--t3)" }}>{item.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14 }}>
            <span className="enc-badge"><Icon name="lock" size={10} color="var(--grn)" /> End-to-end encrypted</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="grid-3">
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(139,92,246,0.15)" }}><Icon name="study" size={18} color="var(--purple)" /></div>
          <div className="stat-label">PMP Study</div>
          <div className="stat-value">2h</div>
          <div className="stat-sub">Target: Jul 7 2026</div>
          <div className="stat-bar"><div className="stat-fill" style={{ width: "0.1%" }} /></div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}><Icon name="notes" size={18} color="var(--grn)" /></div>
          <div className="stat-label">MSc Cybersecurity</div>
          <div className="stat-value">159d</div>
          <div className="stat-sub">SETU — Sep 14 2026</div>
          <div className="stat-bar"><div className="stat-fill grn" style={{ width: "62%" }} /></div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)" }}><Icon name="travel" size={18} color="var(--blue)" /></div>
          <div className="stat-label">Scotland trip</div>
          <div className="stat-value">152d</div>
          <div className="stat-sub">Sep 7–13 · Tamara + Ozzy</div>
          <div className="stat-bar"><div className="stat-fill amber" style={{ width: "59%" }} /></div>
        </div>
      </div>
    </div>
  );
}

function AIAssistant({ onAddTask, onDeleteTask, onNavigate }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi Michael! I'm your Sanctum AI. Try: \"add a task: call the vet\", \"delete task: book flights\", or \"log 2 hours of PMP study on risk management\"." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const systemPrompt = `You are Sanctum AI, a personal life assistant embedded in a private life organiser app called Sanctum.
The user is Michael Rodrigues Marques, based in Dublin, Ireland. He has a wife named Tamara and a Golden Retriever named Ozzy (born Nov 2025).
He is pursuing PMP certification (July 7 2026 target) and starting an MSc in Cybersecurity at SETU in September 2026.
Active job applications: Anthropic (Copyright Ops PM), Google (Sr Analyst Trust & Safety), Google (TPM Analytics EU).
Upcoming trips: Italy Jun 12-17 2026, Scotland Sep 7-13 2026 (with Tamara and Ozzy).

When the user asks to add a task, delete a task, log study hours, or navigate, respond ONLY with valid JSON (no markdown):
- Add task: {"action":"add_task","text":"task text","tag":"optional tag"}
- Delete task: {"action":"delete_task","text":"partial task name to match"}
- Log study: {"action":"log_study","topic":"topic_id","hours":1.5,"notes":"optional"}
- Navigate: {"action":"navigate","page":"home|notes|calendar|settings"}
Topic IDs: integration, scope, schedule, cost, quality, resource, communications, risk, procurement, stakeholder, agile, ethics
For everything else respond naturally in plain text. Be warm, concise, and personal. You know Michael well.`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.text })),
            { role: "user", content: userMsg }
          ]
        })
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that.";

      // Clean up: extract JSON if wrapped in markdown code fences
      const jsonMatch = reply.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const cleanReply = jsonMatch ? jsonMatch[1] : reply;

      try {
        const action = JSON.parse(cleanReply);
        if (action.action === "add_task") {
          await onAddTask(action.text, action.tag || "");
          setMessages(prev => [...prev, { role: "assistant", text: `✓ Task added: "${action.text}"${action.tag ? ` [${action.tag}]` : ""}` }]);
        } else if (action.action === "delete_task") {
          const result = await onDeleteTask(action.text);
          setMessages(prev => [...prev, { role: "assistant", text: result }]);
        } else if (action.action === "log_study") {
          const todayISO = new Date().toISOString().slice(0, 10);
          await sb.from("study_sessions").insert({ type: "pmp", topic: action.topic, hours: parseFloat(action.hours), notes: action.notes || "", date: todayISO });
          setMessages(prev => [...prev, { role: "assistant", text: `✓ Logged ${action.hours}h of ${action.topic} study.` }]);
        } else if (action.action === "navigate") {
          onNavigate(action.page);
          setMessages(prev => [...prev, { role: "assistant", text: `Opening ${action.page}...` }]);
        } else {
          setMessages(prev => [...prev, { role: "assistant", text: cleanReply }]);
        }
      } catch {
        setMessages(prev => [...prev, { role: "assistant", text: cleanReply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Connection error. Try again." }]);
    }
    setLoading(false);
  };

  const SUGGESTIONS = [
    "Add a task: book Scotland accommodation",
    "Log 1.5h PMP study on risk management",
    "What should I focus on this week?",
    "What trips are coming up?",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 16 }}>
            {m.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--blue), var(--purple))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, marginRight: 10, flexShrink: 0, marginTop: 2 }}>✦</div>
            )}
            <div style={{
              maxWidth: "70%", padding: "12px 16px",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.role === "user" ? "var(--blue)" : "var(--bg1)",
              border: m.role === "user" ? "none" : "1px solid var(--b1)",
              color: m.role === "user" ? "#fff" : "var(--t1)",
              fontSize: 14, lineHeight: 1.6,
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--blue), var(--purple))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✦</div>
            <div style={{ padding: "12px 16px", background: "var(--bg1)", border: "1px solid var(--b1)", borderRadius: "16px 16px 16px 4px", color: "var(--t3)", fontSize: 13 }}>Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div style={{ padding: "0 28px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SUGGESTIONS.map(s => (
            <button key={s} className="btn sm" style={{ fontSize: 11 }} onClick={() => setInput(s)}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ padding: "16px 28px", borderTop: "1px solid var(--b1)", background: "var(--bg1)", display: "flex", gap: 10 }}>
        <input className="inp" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Tell me what to do, or ask me anything..."
          style={{ flex: 1 }} autoFocus />
        <button className="btn primary" onClick={send} disabled={loading || !input.trim()} style={{ padding: "8px 18px", flexShrink: 0 }}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default function Home({ user, archivedTrackers = [], onNavigate, onGoToCalendarDay, refreshKey }) {
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ text: "", tag: "" });
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [events, setEvents] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const aiInputRef = useRef(null);
  const [pmpSessions, setPmpSessions] = useState([]);
  const [showRingCustomise, setShowRingCustomise] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(() =>
    localStorage.getItem("sanctum_hide_roadmap") !== "true"
  );

  const DEFAULT_RINGS = { pmp: true, scotland: true, msc: true, tasks: true, weekly_study: true, italy: false, thm: false };
  const [dashboardRings, setDashboardRings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sanctum_dashboard_rings"));
      if (saved && typeof saved === "object") return { ...DEFAULT_RINGS, ...saved };
    } catch {}
    return DEFAULT_RINGS;
  });
  const [studyRingSource, setStudyRingSource] = useState(() =>
    localStorage.getItem("sanctum_study_ring_source") || "pmp"
  );

  const toggleRing = (key) => {
    setDashboardRings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("sanctum_dashboard_rings", JSON.stringify(next));
      return next;
    });
  };
  const setStudySource = (src) => {
    setStudyRingSource(src);
    localStorage.setItem("sanctum_study_ring_source", src);
  };

  // Drag-and-drop card ordering
  const RING_IDS = ["pmp", "scotland", "msc", "tasks", "weekly_study"];
  const [cardOrder, setCardOrder] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("sanctum_ring_order"));
      if (Array.isArray(s) && s.length === RING_IDS.length && RING_IDS.every(id => s.includes(id))) return s;
    } catch {}
    return RING_IDS;
  });
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);
  const dragId = useRef(null);

  const onCardDragStart = (e, id) => {
    dragId.current = id;
    setDragging(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onCardDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragId.current) setDragOver(id);
  };
  const onCardDragLeave = (e, id) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(prev => prev === id ? null : prev);
  };
  const onCardDrop = (e, id) => {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) { setDragOver(null); return; }
    setCardOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(dragId.current);
      const to   = next.indexOf(id);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, dragId.current);
      localStorage.setItem("sanctum_ring_order", JSON.stringify(next));
      return next;
    });
    setDragOver(null);
    setDragging(null);
    dragId.current = null;
  };
  const onCardDragEnd = () => { setDragOver(null); setDragging(null); dragId.current = null; };

  // Touch drag for stat cards (mobile)
  const touchDragCardId = useRef(null);
  const onCardTouchStart = (e, id) => {
    touchDragCardId.current = id;
    setDragging(id);
  };
  const onCardTouchMove = (e) => {
    e.preventDefault();
    if (!touchDragCardId.current) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = el?.closest('[data-card-id]');
    const tid = card?.dataset.cardId;
    if (tid && tid !== touchDragCardId.current) setDragOver(tid);
    else setDragOver(null);
  };
  const onCardTouchEnd = (e) => {
    if (!touchDragCardId.current) return;
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = el?.closest('[data-card-id]');
    const tid = card?.dataset.cardId;
    if (tid && tid !== touchDragCardId.current) {
      setCardOrder(prev => {
        const next = [...prev];
        const from = next.indexOf(touchDragCardId.current);
        const to = next.indexOf(tid);
        if (from !== -1 && to !== -1) { next.splice(from, 1); next.splice(to, 0, touchDragCardId.current); localStorage.setItem("sanctum_ring_order", JSON.stringify(next)); }
        return next;
      });
    }
    touchDragCardId.current = null;
    setDragging(null);
    setDragOver(null);
  };

  // Widget (card) ordering
  const WIDGET_IDS = ["tasks", "week"];
  const [widgetOrder, setWidgetOrder] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("sanctum_home_widget_order"));
      if (Array.isArray(s) && s.length === 2 && WIDGET_IDS.every(id => s.includes(id))) return s;
    } catch {}
    return WIDGET_IDS;
  });
  const [wDragOver, setWDragOver] = useState(null);
  const [wDragging, setWDragging] = useState(null);
  const wDragId = useRef(null);

  const onWidgetDragStart = (e, id) => {
    wDragId.current = id; setWDragging(id); e.dataTransfer.effectAllowed = "move";
  };
  const onWidgetDragOver = (e, id) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
    if (id !== wDragId.current) setWDragOver(id);
  };
  const onWidgetDragLeave = (e, id) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setWDragOver(prev => prev === id ? null : prev);
  };
  const onWidgetDrop = (e, id) => {
    e.preventDefault();
    if (!wDragId.current || wDragId.current === id) { setWDragOver(null); return; }
    setWidgetOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(wDragId.current), to = next.indexOf(id);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1); next.splice(to, 0, wDragId.current);
      localStorage.setItem("sanctum_home_widget_order", JSON.stringify(next));
      return next;
    });
    setWDragOver(null); setWDragging(null); wDragId.current = null;
  };
  const onWidgetDragEnd = () => { setWDragOver(null); setWDragging(null); wDragId.current = null; };

  // Touch drag for widget cards (mobile)
  const touchDragWidgetId = useRef(null);
  const onWidgetTouchStart = (e, id) => { touchDragWidgetId.current = id; setWDragging(id); };
  const onWidgetTouchMove = (e) => {
    e.preventDefault();
    if (!touchDragWidgetId.current) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const widget = el?.closest('[data-widget-id]');
    const tid = widget?.dataset.widgetId;
    if (tid && tid !== touchDragWidgetId.current) setWDragOver(tid); else setWDragOver(null);
  };
  const onWidgetTouchEnd = (e) => {
    if (!touchDragWidgetId.current) return;
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const widget = el?.closest('[data-widget-id]');
    const tid = widget?.dataset.widgetId;
    if (tid && tid !== touchDragWidgetId.current) {
      setWidgetOrder(prev => {
        const next = [...prev];
        const from = next.indexOf(touchDragWidgetId.current), to = next.indexOf(tid);
        if (from !== -1 && to !== -1) { next.splice(from, 1); next.splice(to, 0, touchDragWidgetId.current); localStorage.setItem("sanctum_home_widget_order", JSON.stringify(next)); }
        return next;
      });
    }
    touchDragWidgetId.current = null; setWDragging(null); setWDragOver(null);
  };

  const wDrag = (id) => ({
    'data-widget-id': id,
    draggable: true,
    onDragStart:    e => onWidgetDragStart(e, id),
    onDragOver:     e => onWidgetDragOver(e, id),
    onDragLeave:    e => onWidgetDragLeave(e, id),
    onDrop:         e => onWidgetDrop(e, id),
    onDragEnd:      onWidgetDragEnd,
    onTouchStart:   e => onWidgetTouchStart(e, id),
    onTouchMove:    onWidgetTouchMove,
    onTouchEnd:     onWidgetTouchEnd,
  });

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const homeUserKey = user?.id ? `sanctum_display_name_${user.id}` : "sanctum_display_name";
  const displayName = user?.user_metadata?.display_name || localStorage.getItem(homeUserKey) || localStorage.getItem("sanctum_display_name") || (user?.email?.split("@")[0] || "");
  const dateStr = now.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const EXAM_DATE = new Date("2026-07-07T13:30");
  const SCOTLAND_DATE = new Date("2026-09-07");
  const MSC_DATE = new Date("2026-09-14");
  const daysTo = (d) => Math.ceil((d - now) / 864e5);

  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const todayDow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const weekDates = DAYS.map((_, i) => { const d = new Date(now); d.setDate(now.getDate() - todayDow + i); return d; });

  useEffect(() => { loadTasks(); loadEvents(); loadStudy(); }, []);

  const loadTasks = async () => {
    setTasksLoading(true);
    try { const d = await sb.from("tasks").select("*"); setTasks(Array.isArray(d) ? d : []); }
    catch { setTasks([]); }
    setTasksLoading(false);
  };

  const loadEvents = async () => {
    try { const d = await sb.from("events").select("*"); if (Array.isArray(d)) setEvents(d); }
    catch {}
  };

  const loadStudy = async () => {
    try {
      const d = await sb.from("study_sessions").select("*");
      if (Array.isArray(d)) setPmpSessions(d.filter(s => s.type === "pmp"));
    } catch {}
  };

  const toggleTask = async (t) => {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done } : x));
    try { await sb.from("tasks").update({ done: !t.done }, { id: t.id }); } catch {}
  };

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try { await sb.from("tasks").delete({ id }); } catch {}
  };

  const startEdit = (t) => { setEditingId(t.id); setEditText(t.text); };

  const saveEdit = async (id) => {
    if (!editText.trim()) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text: editText } : t));
    setEditingId(null);
    try { await sb.from("tasks").update({ text: editText }, { id }); } catch {}
  };

  const addTask = async (textOverride, tagOverride) => {
    const text = textOverride ?? newTask.text;
    const tag  = tagOverride  ?? newTask.tag;
    if (!text.trim()) return;
    const task = { text, tag, done: false, user_id: user?.id };
    try {
      const res = await sb.from("tasks").insert(task);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...task, id: Date.now().toString() };
      setTasks(t => [created, ...t]);
    } catch { setTasks(t => [{ ...task, id: Date.now().toString() }, ...t]); }
    if (textOverride === undefined) { setNewTask({ text: "", tag: "" }); setShowAddTask(false); }
  };

  const eventsOnDate = (date) => {
    const ds = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    return events.filter(e => e.date === ds);
  };

  const activeTasks   = tasks.filter(t => !t.done);
  const archivedTasks = tasks.filter(t =>  t.done);

  // ── AI bar ──
  const sendAI = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiInput("");
    setAiLoading(true);
    setAiResponse({ text: "Thinking...", type: "loading" });

    try {
      const todayISO = now.toISOString().slice(0, 10);
      const sys = `You are Sanctum AI, a personal assistant embedded in a private life organiser app.
Today is ${todayISO}. User: ${displayName}, Dublin, Ireland.
Personal: Wife Tamara. Dog Ozzy (Golden Retriever, born Nov 2025).
Career: Applications open at Anthropic (Copyright Ops PM), Google (Sr Analyst T&S), Google (TPM Analytics EU).
Study: PMP exam target July 7 2026. MSc Cybersecurity at SETU starts Sep 14 2026.
Travel: Italy Jun 12-17 2026. Scotland Sep 7-13 2026 (with Tamara + Ozzy).
Active tasks: ${activeTasks.length} open, ${archivedTasks.length} completed.
Notes are private — you cannot read note content.
When user mentions dates, always convert to ISO format YYYY-MM-DD in your JSON response.
Examples: "tomorrow" = ${new Date(Date.now()+86400000).toISOString().slice(0,10)}, "next week" = ${new Date(Date.now()+7*86400000).toISOString().slice(0,10)}.
For "next Monday", "this Friday" etc., compute the actual upcoming date.
When the user asks to add a task, delete a task, log study hours, add a calendar event, or navigate, respond ONLY with valid JSON (no markdown):
- Add task: {"action":"add_task","text":"task text","tag":"optional tag"}
- Delete task: {"action":"delete_task","text":"partial task name to match"}
- Log study: {"action":"log_study","hours":2,"topic":"integration","notes":"optional"}
- Navigate: {"action":"navigate","page":"home|notes|calendar|settings"}
- Add calendar event: {"action":"add_event","title":"Event title","date":"${todayISO}","start_time":"09:00","end_time":"10:00","category":"personal","notes":"optional notes"}
  category must be one of: personal, career, travel, study, family
Topic IDs for study: integration, scope, schedule, cost, quality, resource, communications, risk, procurement, stakeholder, agile, ethics
For all other queries respond in plain conversational text, warm but concise, max 2 sentences.`;

      const res  = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: sys, messages: [{ role: "user", content: userMsg }] }) });
      const data = await res.json();
      const reply = (data.content?.[0]?.text || "").trim();

      try {
        const action = JSON.parse(reply.replace(/```(?:json)?|```/g, "").trim());
        const parseDate = (dateStr) => {
          if (!dateStr) return todayISO;
          const d = new Date(dateStr);
          if (!isNaN(d)) return d.toISOString().slice(0, 10);
          return todayISO;
        };
        if (action.action === "add_task") {
          await addTask(action.text, action.tag || "");
          setAiResponse({ text: `Added: "${action.text}"${action.tag ? ` [${action.tag}]` : ""}`, type: "success" });
        } else if (action.action === "delete_task") {
          const match = tasks.find(t => t.text.toLowerCase().includes(action.text.toLowerCase()));
          if (match) {
            await deleteTask(match.id);
            setAiResponse({ text: `Deleted: "${match.text}"`, type: "success" });
          } else {
            setAiResponse({ text: `No task found matching "${action.text}"`, type: "error" });
          }
        } else if (action.action === "log_study") {
          await sb.from("study_sessions").insert({ type: "pmp", topic: action.topic, hours: parseFloat(action.hours), notes: action.notes || "", date: todayISO, user_id: user?.id });
          await sb.from("events").insert({
            title: `PMP Study — ${action.topic}`,
            date: todayISO,
            start_time: null,
            end_time: null,
            category: "study",
            color: "#8b5cf6",
            notes: `${action.hours}h logged`,
            user_id: user?.id,
          });
          await loadEvents();
          setAiResponse({ text: `Logged ${action.hours}h — ${action.topic} ✓\nAdded to calendar`, type: "success" });
        } else if (action.action === "add_event") {
          await sb.from("events").insert({
            title: action.title,
            date: parseDate(action.date) || todayISO,
            start_time: action.start_time || null,
            end_time: action.end_time || null,
            category: action.category || "personal",
            color: "#388bfd",
            notes: action.notes || "",
            user_id: user?.id,
          });
          await loadEvents();
          setAiResponse({ text: `Added to calendar: "${action.title}" on ${parseDate(action.date)}`, type: "success" });
        } else if (action.action === "navigate") {
          setAiResponse({ text: `Opening ${action.page}...`, type: "success" });
          setTimeout(() => onNavigate(action.page), 400);
        } else {
          setAiResponse({ text: reply, type: "text" });
        }
      } catch {
        setAiResponse({ text: reply || "Got it.", type: "text" });
      }
    } catch {
      setAiResponse({ text: "Connection error. Check your network.", type: "error" });
    }
    setAiLoading(false);
  };

  const AI_SUGGESTIONS = [
    "How many days until the PMP exam?",
    "Add task: book Scotland accommodation",
    "Add a calendar event for next Monday",
    "What should I focus on today?",
  ];

  const daysToExam     = daysTo(EXAM_DATE);
  const daysToScotland = daysTo(SCOTLAND_DATE);
  const daysToMSc      = daysTo(MSC_DATE);

  const weeklyGoalHours = parseFloat(localStorage.getItem("sanctum_study_goal")) || 10;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - todayDow);
  thisMonday.setHours(0, 0, 0, 0);
  const weeklyStudyData = Array.from({ length: 6 }, (_, i) => {
    const wStart = new Date(thisMonday.getTime() - (5 - i) * 7 * 86400000);
    const wEnd   = new Date(wStart.getTime() + 7 * 86400000);
    const hours  = pmpSessions
      .filter(s => { const d = new Date(s.date); return d >= wStart && d < wEnd; })
      .reduce((sum, s) => sum + (s.hours || 0), 0);
    return { hours, label: `${wStart.getDate()}/${wStart.getMonth() + 1}` };
  });
  const maxWkHours = Math.max(...weeklyStudyData.map(w => w.hours), weeklyGoalHours * 0.3, 1);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const thisWeekHours = pmpSessions
    .filter(s => new Date(s.date) >= weekStart)
    .reduce((sum, s) => sum + (s.hours || 0), 0);
  const weekPercent = Math.min(thisWeekHours / weeklyGoalHours, 1);
  const weekRingColor = weekPercent >= 1 ? "var(--grn)" : weekPercent >= 0.5 ? "var(--amber)" : "#ef4444";

  const RingCard = ({ label, value, sub, percent, color }) => {
    const r = 34, circ = 2 * Math.PI * r;
    const offset = circ - circ * Math.min(Math.max(percent, 0), 1);
    return (
      <>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" style={{ stroke: "var(--b2)" }} strokeWidth="5" />
          <circle cx="40" cy="40" r={r} fill="none" style={{ stroke: color }}
            strokeWidth="5" strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 40 40)" />
          <text x="40" y="36" textAnchor="middle" fontSize="14" fontWeight="700"
            style={{ fill: "var(--t1)", fontFamily: "var(--mono)" }}>{value}</text>
          <text x="40" y="50" textAnchor="middle" fontSize="9" style={{ fill: "var(--t3)" }}>{sub}</text>
        </svg>
        <div className="ring-label">{label}</div>
      </>
    );
  };

  return (
    <div className="page-body page-enter">
      {showAddTask && (
        <Modal title="Add task" onClose={() => setShowAddTask(false)}>
          <div className="form-row">
            <label className="form-label">Task</label>
            <input className="inp" value={newTask.text}
              onChange={e => setNewTask(n => ({ ...n, text: e.target.value }))}
              placeholder="What needs doing?" onKeyDown={e => e.key === "Enter" && addTask()} autoFocus />
          </div>
          <div className="form-row">
            <label className="form-label">Tag (optional)</label>
            <input className="inp" value={newTask.tag}
              onChange={e => setNewTask(n => ({ ...n, tag: e.target.value }))}
              placeholder="Career, PMP, Travel..." />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowAddTask(false)}>Cancel</button>
            <button className="btn primary" onClick={() => addTask()}>Add task</button>
          </div>
        </Modal>
      )}

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <div className="home-greeting-name">{greeting}, {displayName}</div>
        <div className="home-greeting-date">{dateStr}</div>
      </div>

      {/* AI assistant bar */}
      <div className="home-ai-bar" style={{ marginBottom: 28 }}>
        <div className="ai-bar">
          <div style={{width:32,height:32,borderRadius:'50%',background:'#080808',border:'1px solid #333',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}><SanctumLogo size={28}/></div>
          <input
            ref={aiInputRef}
            className="ai-bar-input"
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAI()}
            placeholder="Ask anything, add a task, or navigate…"
            disabled={aiLoading}
          />
          <button
            className="ai-bar-btn"
            onClick={sendAI}
            disabled={aiLoading || !aiInput.trim()}
            title="Send (Enter)"
          >
            {aiLoading
              ? <><span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/></>
              : <Icon name="chevR" size={16} color="#fff" />
            }
          </button>
        </div>

        {aiResponse ? (
          <div className={`ai-response${aiResponse.type === "error" ? " ai-response-err" : aiResponse.type === "success" ? " ai-response-ok" : ""}`}>
            <div className="ai-response-body">
              <div className="ai-response-icon">
                {aiResponse.type === "success" && <Icon name="check" size={14} color="var(--grn)" />}
                {aiResponse.type === "error"   && <Icon name="x"     size={14} color="var(--red)" />}
                {aiResponse.type === "loading" && <span style={{ display:"flex", gap:3 }}><span className="ai-dot"/><span className="ai-dot"/><span className="ai-dot"/></span>}
                {aiResponse.type === "text"    && <Icon name="ai"    size={14} color="var(--blue)" />}
              </div>
              <span>{aiResponse.text}</span>
            </div>
            {aiResponse.type !== "loading" && (
              <button className="ai-response-close" onClick={() => setAiResponse(null)} title="Dismiss">
                <Icon name="x" size={13} />
              </button>
            )}
          </div>
        ) : (
          <div className="ai-suggestions">
            {AI_SUGGESTIONS.map(s => (
              <button
                key={s}
                className="ai-suggestion-chip"
                onClick={() => { setAiInput(s); aiInputRef.current?.focus(); }}
              >{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats — ring cards, draggable */}
      <div style={{ position: "relative", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".5px" }}>Dashboard</div>
          <button
            className="btn xs"
            onClick={() => setShowRingCustomise(v => !v)}
          >
            Customise
          </button>
        </div>

        {showRingCustomise && (
          <div className="ring-customise-panel">
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)", marginBottom: 12 }}>Choose what to show on your dashboard</div>
            <div className="ring-customise-list">
              {[
                { key: "pmp",          label: "PMP Exam countdown" },
                { key: "scotland",     label: "Scotland Trip countdown" },
                { key: "msc",          label: "MSc SETU countdown" },
                { key: "tasks",        label: "Active Tasks" },
                { key: "weekly_study", label: "Weekly Study hours" },
                { key: "italy",        label: "Italy Trip countdown" },
                { key: "thm",          label: "TryHackMe streak" },
              ].map(({ key, label }) => (
                <label key={key} className="ring-customise-item">
                  <span style={{ fontSize: 13, color: "var(--t2)", flex: 1 }}>{label}</span>
                  <div
                    className={`toggle-switch${dashboardRings[key] ? " on" : ""}`}
                    onClick={() => toggleRing(key)}
                  />
                </label>
              ))}
            </div>
            <div style={{ marginTop: 16, borderTop: "1px solid var(--b1)", paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)", marginBottom: 8 }}>Weekly study ring source</div>
              <div style={{ display: "flex", gap: 16 }}>
                {[["pmp", "PMP Study"], ["thm", "TryHackMe"], ["both", "Both"]].map(([val, lbl]) => (
                  <label key={val} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--t2)", cursor: "pointer" }}>
                    <input type="radio" name="study_source" value={val} checked={studyRingSource === val} onChange={() => setStudySource(val)} style={{ accentColor: "var(--blue)" }} />
                    {lbl}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="ring-cards-row">
          {cardOrder.filter(id => dashboardRings[id]).map(id => {
            const cls = `ring-card${dragging === id ? " is-dragging" : ""}${dragOver === id ? " drag-over" : ""}`;
            const drag = {
              'data-card-id': id,
              draggable: true,
              onDragStart:  e => onCardDragStart(e, id),
              onDragOver:   e => onCardDragOver(e, id),
              onDragLeave:  e => onCardDragLeave(e, id),
              onDrop:       e => onCardDrop(e, id),
              onDragEnd:    onCardDragEnd,
              onTouchStart: e => onCardTouchStart(e, id),
              onTouchMove:  onCardTouchMove,
              onTouchEnd:   onCardTouchEnd,
            };
            if (id === "pmp") return (
              <div key="pmp" className={cls} {...drag} style={{ cursor: "pointer" }} onClick={() => onNavigate("study")}>
                <div className="drag-handle" style={{ position:"absolute", top:8, right:8 }}><Icon name="grab" size={12} /></div>
                <RingCard label="PMP EXAM" value={`${daysToExam}d`} sub={`${daysToExam}d · ${Math.ceil(daysToExam / 7)}w`}
                  percent={Math.max(0, (420 - daysToExam) / 420)}
                  color={daysToExam < 60 ? "var(--red)" : daysToExam < 120 ? "var(--amber)" : "var(--purple)"} />
              </div>
            );
            if (id === "scotland") return (
              <div key="scotland" className={cls} {...drag} style={{ cursor: "pointer" }} onClick={() => onNavigate("travel")}>
                <div className="drag-handle" style={{ position:"absolute", top:8, right:8 }}><Icon name="grab" size={12} /></div>
                <RingCard label="SCOTLAND" value={`${daysToScotland}d`} sub="Sep 7"
                  percent={Math.max(0, (420 - daysToScotland) / 420)}
                  color="var(--blue)" />
              </div>
            );
            if (id === "msc") return (
              <div key="msc" className={cls} {...drag} style={{ cursor: "pointer" }} onClick={() => onNavigate("study")}>
                <div className="drag-handle" style={{ position:"absolute", top:8, right:8 }}><Icon name="grab" size={12} /></div>
                <RingCard label="MSC SETU" value={`${daysToMSc}d`} sub="Sep 14"
                  percent={Math.max(0, (420 - daysToMSc) / 420)}
                  color="var(--grn)" />
              </div>
            );
            if (id === "tasks") return (
              <div key="tasks" className={cls} {...drag} onClick={() => setShowAddTask(true)}>
                <div className="drag-handle" style={{ position:"absolute", top:8, right:8 }}><Icon name="grab" size={12} /></div>
                <RingCard label="TASKS" value={activeTasks.length}
                  sub={`${archivedTasks.length} done`}
                  percent={tasks.length ? archivedTasks.length / tasks.length : 0}
                  color="var(--amber)" />
              </div>
            );
            if (id === "weekly_study") return (
              <div key="weekly_study" className={cls} {...drag} style={{ cursor: "pointer" }} onClick={() => onNavigate("study")}>
                <div className="drag-handle" style={{ position:"absolute", top:8, right:8 }}><Icon name="grab" size={12} /></div>
                <RingCard label="THIS WEEK · STUDY"
                  value={`${thisWeekHours.toFixed(thisWeekHours % 1 === 0 ? 0 : 1)}h`}
                  sub={`${weeklyGoalHours}h goal`}
                  percent={weekPercent}
                  color={weekRingColor} />
              </div>
            );
            return null;
          })}
        </div>
      </div>


      {/* Weekly PMP study chart */}
      <div className="study-chart-wrap" style={{ marginBottom: 18, padding: "16px 20px", background: "var(--bg1)", border: "1px solid var(--b2)", borderRadius: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "1px" }}>PMP study · last 6 weeks</div>
          <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>Goal: {weeklyGoalHours}h/wk</div>
        </div>
        <div className="study-week-chart">
          {weeklyStudyData.map((w, i) => {
            const pct = Math.min(w.hours / maxWkHours, 1);
            const cls2 = w.hours >= weeklyGoalHours ? "met" : w.hours >= weeklyGoalHours * 0.5 ? "partial" : "unmet";
            return (
              <div key={i} className="swc-bar-wrap" title={`${w.hours.toFixed(1)}h`}>
                <div className={`swc-bar ${cls2}`} style={{ height: `${Math.max(pct * 100, 6)}%` }} />
                <div className="swc-label">{w.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {showRoadmap ? (
        <div style={{ position: "relative" }}>
          <button
            className="btn xs ghost"
            onClick={() => { setShowRoadmap(false); localStorage.setItem("sanctum_hide_roadmap", "true"); }}
            style={{ position: "absolute", top: 10, right: 0, zIndex: 10, fontSize: 11, color: "var(--t3)" }}
          >Hide</button>
          <Roadmap />
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, padding: "10px 14px", background: "var(--bg1)", border: "1px solid var(--b2)", borderRadius: 12 }}>
          <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>Roadmap</span>
          <button className="btn xs" onClick={() => { setShowRoadmap(true); localStorage.setItem("sanctum_hide_roadmap", "false"); }}>Show</button>
        </div>
      )}

      {/* Tasks + Week (drag to reorder) */}
      {(() => {
        const tasksCls  = `card${wDragging==="tasks" ? " is-dragging" : ""}${wDragOver==="tasks" ? " drag-over" : ""}`;
        const weekCls   = `card${wDragging==="week"  ? " is-dragging" : ""}${wDragOver==="week"  ? " drag-over" : ""}`;

        const tasksCard = (
          <div key="tasks" className={tasksCls} {...wDrag("tasks")}>
            <div className="card-header">
              <div>
                <div className="card-title">Tasks</div>
                <div className="card-sub">{activeTasks.length} active · {archivedTasks.length} done</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div className="drag-handle"><Icon name="grab" size={14} /></div>
                <button className="btn sm primary" onMouseDown={e=>e.stopPropagation()} onClick={() => setShowAddTask(true)}><Icon name="plus" size={13} /> Add</button>
              </div>
            </div>
            {tasksLoading ? <div className="loading">Loading...</div> : (
              <div>
                {activeTasks.length === 0 && (
                  <div style={{ color:"var(--t3)", fontSize:13, textAlign:"center", padding:"20px 0" }}>No active tasks yet</div>
                )}
                {activeTasks.map(t => (
                  <div key={t.id} className="task-item">
                    <div className="task-check" onClick={() => toggleTask(t)} />
                    <div className="task-content">
                      {editingId === t.id ? (
                        <input className="task-edit-input" value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onBlur={() => saveEdit(t.id)}
                          onMouseDown={e => e.stopPropagation()}
                          onKeyDown={e => { if (e.key==="Enter") saveEdit(t.id); if (e.key==="Escape") setEditingId(null); }}
                          autoFocus />
                      ) : (
                        <div className="task-text">{t.text}</div>
                      )}
                      {t.tag && <div className="task-meta"><span className="task-tag">{t.tag}</span></div>}
                    </div>
                    <div className="task-actions">
                      <button className="btn xs ghost" onMouseDown={e=>e.stopPropagation()} onClick={() => startEdit(t)}><Icon name="edit" size={12} /></button>
                      <button className="btn xs danger" onMouseDown={e=>e.stopPropagation()} onClick={() => deleteTask(t.id)}><Icon name="trash" size={12} /></button>
                    </div>
                  </div>
                ))}
                {archivedTasks.length > 0 && (
                  <div style={{ marginTop:12 }}>
                    <button className="btn sm ghost" style={{ width:"100%", justifyContent:"center", color:"var(--t3)", fontSize:11 }}
                      onMouseDown={e=>e.stopPropagation()} onClick={() => setShowArchived(s => !s)}>
                      {showArchived ? "▲ Hide" : "▼ Show"} {archivedTasks.length} completed
                    </button>
                    {showArchived && archivedTasks.map(t => (
                      <div key={t.id} className="task-item" style={{ opacity:.5 }}>
                        <div className="task-check done" onClick={() => toggleTask(t)}><Icon name="check" size={10} color="#fff" /></div>
                        <div className="task-content">
                          <div className="task-text done">{t.text}</div>
                          {t.tag && <div className="task-meta"><span className="task-tag">{t.tag}</span></div>}
                        </div>
                        <div className="task-actions">
                          <button className="btn xs danger" onMouseDown={e=>e.stopPropagation()} onClick={() => deleteTask(t.id)}><Icon name="trash" size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

        const weekCard = (
          <div key="week" className={weekCls} {...wDrag("week")}>
            <div className="card-header">
              <div>
                <div className="card-title">This week</div>
                <div className="card-sub">{now.toLocaleDateString("en-IE", { month:"long", year:"numeric" })}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div className="drag-handle"><Icon name="grab" size={14} /></div>
                <button className="btn sm" onMouseDown={e=>e.stopPropagation()} onClick={() => onNavigate("calendar")}>Full calendar</button>
              </div>
            </div>
            <div className="week-strip">
              {weekDates.map((date, i) => {
                const dayEvents = eventsOnDate(date);
                const isToday = i === todayDow;
                return (
                  <div key={i} className={`day-cell${isToday ? " today" : ""}${dayEvents.length > 0 ? " has-event" : ""}`}
                    onMouseDown={e=>e.stopPropagation()} onClick={() => onGoToCalendarDay(date)}>
                    <div className="day-name">{DAYS[i]}</div>
                    <div className="day-num">{date.getDate()}</div>
                    <div className="day-dots">
                      {dayEvents.slice(0,3).map((ev,j) => (
                        <div key={j} className="day-dot" style={{ background: EVENT_COLORS[ev.category]?.color || "var(--blue)" }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

        const widgetMap = { tasks: tasksCard, week: weekCard };
        return (
          <div className="grid-2">
            {widgetMap[widgetOrder[0]]}
            {widgetMap[widgetOrder[1]]}
          </div>
        );
      })()}
    </div>
  );
}
