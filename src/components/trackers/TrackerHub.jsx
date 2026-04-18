import { useState, useRef, useEffect } from "react";
import { Icon } from "../shared";
import { sb } from "../../lib/supabase";

const MiniRing = ({ percent, color }) => {
  const r = 16, circ = 2 * Math.PI * r;
  const offset = circ - circ * Math.min(Math.max(percent, 0), 1);
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r={r} fill="none" style={{ stroke: "var(--b2)" }} strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" style={{ stroke: color }}
        strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 20 20)" />
    </svg>
  );
};

const BigRing = ({ percent, color, size = 80 }) => {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const offset = circ - circ * Math.min(Math.max(percent, 0), 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" style={{ stroke: "var(--b2)" }} strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" style={{ stroke: color }}
        strokeWidth="6" strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
};

export function PlaceholderPage({ label }) {
  return (
    <div className="page-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 16 }}>
      <Icon name="trackers" size={48} color="var(--b2)" />
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)" }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--t3)" }}>Coming in the next build</div>
    </div>
  );
}

export function TrackerBackBar({ name, onBack }) {
  return (
    <div className="tracker-back-bar">
      <button className="tracker-back-btn" onClick={onBack}>
        <Icon name="chevL" size={13} /> Trackers
      </button>
      <span style={{ color: "var(--b3)", fontSize: 12 }}>/</span>
      <span className="tracker-section-label">{name}</span>
    </div>
  );
}

const DEFAULT_IDS = ["study", "career", "finance", "travel", "pet"];

const TRACKERS = [
  { id: "study",   icon: "study",   name: "Study",   sub: "PMP tracker — PMBOK knowledge areas, hours logged, progress toward July 7 exam" },
  { id: "career",  icon: "career",  name: "Career",  sub: "Job applications — track every opportunity, status, interviews, and notes" },
  { id: "finance", icon: "finance", name: "Finance", sub: "Income, expenses, balance — full picture of your monthly finances" },
  { id: "travel",  icon: "travel",  name: "Travel",  sub: "Trips, checklists, budgets — Scotland, Italy, and beyond" },
  { id: "pet",     icon: "pet",     name: "Ozzy",    sub: "Golden Retriever — vet visits, weight, diet, documents" },
];

function getRingProps(id, ringData) {
  switch (id) {
    case "study":   return { percent: ringData.studyHours / ringData.studyTarget, color: "var(--purple)" };
    case "career":  return { percent: ringData.activeApps / 10, color: "var(--amber)" };
    case "finance": return { percent: ringData.financeRatio, color: "var(--grn)" };
    case "travel":  return { percent: ringData.travelRatio, color: "var(--blue)" };
    case "pet":     return { percent: ringData.ozzyRing, color: ringData.ozzyColor };
    default:        return { percent: 0, color: "var(--blue)" };
  }
}

const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const loadCustomEntries = () => {
  try { return JSON.parse(localStorage.getItem('sanctum_tracker_entries') || '[]'); }
  catch { return []; }
};

const saveCustomEntries = (entries) => {
  localStorage.setItem('sanctum_tracker_entries', JSON.stringify(entries));
};

// ── Custom Tracker Detail Modal ───────────────────────────────────────────────
function CustomTrackerDetail({ tracker, onClose, user }) {
  const [entries, setEntries] = useState(() => loadCustomEntries().filter(e => e.tracker_id === tracker.id));
  const [form, setForm] = useState({ date: todayISO(), type: '', duration: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('log');

  const weekStart = getWeekStart();
  const thisWeekEntries = entries.filter(e => new Date(e.date) >= weekStart);
  const percent = thisWeekEntries.length / (tracker.weekly_goal || 3);

  const allEntries = loadCustomEntries();

  const saveEntry = async () => {
    if (!form.date) return;
    setSaving(true);
    const entry = {
      id: 'entry_' + Date.now(),
      tracker_id: tracker.id,
      date: form.date,
      type: form.type,
      duration: form.duration ? parseInt(form.duration) : null,
      notes: form.notes,
      created_at: new Date().toISOString(),
    };
    const updated = [entry, ...allEntries];
    saveCustomEntries(updated);
    setEntries(updated.filter(e => e.tracker_id === tracker.id));
    try { await sb.from('tracker_entries').insert({ ...entry, user_id: user?.id }); } catch {}
    setForm({ date: todayISO(), type: '', duration: '', notes: '' });
    setSaving(false);
  };

  const deleteEntry = (id) => {
    const updated = allEntries.filter(e => e.id !== id);
    saveCustomEntries(updated);
    setEntries(updated.filter(e => e.tracker_id === tracker.id));
  };

  // Stats
  const totalEntries = entries.length;
  const byWeek = {};
  entries.forEach(e => {
    const d = new Date(e.date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    const key = mon.toISOString().slice(0, 10);
    byWeek[key] = (byWeek[key] || 0) + 1;
  });
  const weekCounts = Object.values(byWeek);
  const bestWeek = weekCounts.length > 0 ? Math.max(...weekCounts) : 0;

  // Streak (consecutive weeks with at least 1 entry)
  let streak = 0;
  const now = new Date();
  for (let w = 0; w < 52; w++) {
    const checkMon = new Date(weekStart);
    checkMon.setDate(weekStart.getDate() - w * 7);
    const key = checkMon.toISOString().slice(0, 10);
    if (byWeek[key]) streak++;
    else if (w > 0) break;
  }

  const recentEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal" style={{ maxWidth: 480, width: '90%' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: tracker.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BigRing percent={percent} color={tracker.color} size={52} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)' }}>{tracker.label}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
              {thisWeekEntries.length} of {tracker.weekly_goal} {tracker.unit} this week
            </div>
            {tracker.description && <div style={{ fontSize: 12, color: 'var(--t3)' }}>{tracker.description}</div>}
          </div>
          <button style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 20, padding: '0 4px' }} onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--b2)', paddingBottom: 0 }}>
          {['log', 'history', 'stats'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ background: 'none', border: 'none', padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? 'var(--t1)' : 'var(--t3)', borderBottom: activeTab === tab ? `2px solid ${tracker.color}` : '2px solid transparent', marginBottom: -1 }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Log tab */}
        {activeTab === 'log' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-row">
              <label className="form-label">Date</label>
              <input className="inp" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-row">
              <label className="form-label">Type / Activity</label>
              <input className="inp" type="text" placeholder="e.g. Running, Chest day…" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
            </div>
            <div className="form-row">
              <label className="form-label">Duration (minutes)</label>
              <input className="inp" type="number" placeholder="e.g. 45" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
            </div>
            <div className="form-row">
              <label className="form-label">Notes</label>
              <input className="inp" type="text" placeholder="Optional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button className="btn primary" style={{ marginTop: 4 }} onClick={saveEntry} disabled={saving || !form.date}>
              {saving ? 'Saving…' : 'Log Entry'}
            </button>
          </div>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div>
            {entries.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--t3)', textAlign: 'center', padding: '24px 0' }}>No entries yet. Log your first session!</div>
            ) : [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--b2)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: tracker.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500 }}>
                    {e.type || tracker.unit}
                    {e.duration ? ` · ${e.duration} min` : ''}
                  </div>
                  {e.notes && <div style={{ fontSize: 12, color: 'var(--t3)' }}>{e.notes}</div>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{e.date}</div>
                <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Stats tab */}
        {activeTab === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Total', value: totalEntries, unit: tracker.unit },
              { label: 'Best Week', value: bestWeek, unit: tracker.unit },
              { label: 'Streak', value: streak, unit: 'weeks' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg1)', borderRadius: 12, padding: '16px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: tracker.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{s.unit}</div>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackerHub({ archivedTrackers = [], onArchive, onUnarchive, onNavigate, user, refreshKey = 0 }) {
  const [ringData, setRingData] = useState({
    studyHours: 0, studyTarget: 150,
    activeApps: 0,
    financeRatio: 0,
    travelRatio: 0,
    ozzyRing: 0, ozzyColor: "var(--grn)",
  });

  const [customTrackers, setCustomTrackers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sanctum_custom_trackers') || '[]'); }
    catch { return []; }
  });

  const [detailTracker, setDetailTracker] = useState(null);

  // Reload custom trackers when refreshKey changes
  useEffect(() => {
    try { setCustomTrackers(JSON.parse(localStorage.getItem('sanctum_custom_trackers') || '[]')); }
    catch {}
  }, [refreshKey]);

  useEffect(() => {
    const load = async () => {
      try {
        const [sessions, apps, finance] = await Promise.all([
          sb.from("study_sessions").select("*"),
          sb.from("applications").select("*"),
          sb.from("finance").select("*"),
        ]);

        const studyHours = Array.isArray(sessions)
          ? sessions.reduce((sum, s) => sum + (s.hours || 0), 0) : 0;

        const activeApps = Array.isArray(apps)
          ? apps.filter(a => !["rejected","withdrawn","closed"].includes((a.status || "").toLowerCase())).length : 0;

        const now = new Date();
        const month = now.toLocaleDateString("en-IE", { month: "long", year: "numeric" });
        const mf = Array.isArray(finance) ? finance.filter(f => f.month === month) : [];
        const income   = mf.filter(f => f.category === "income").reduce((s, f) => s + Number(f.amount || 0), 0);
        const expenses = mf.filter(f => f.category !== "income").reduce((s, f) => s + Number(f.amount || 0), 0);
        const financeRatio = income > 0 ? Math.min(expenses / income, 1) : 0;

        let travelRatio = 0;
        try {
          const trips = JSON.parse(localStorage.getItem("sanctum_trips") || "[]");
          const total = trips.length;
          const completed = trips.filter(t => t.status === "completed").length;
          travelRatio = total > 0 ? Math.min(completed / total, 1) : 0;
        } catch {}

        let ozzyRing = 0, ozzyColor = "var(--grn)";
        try {
          const vets = JSON.parse(localStorage.getItem("sanctum_ozzy_vets") || "[]");
          const dates = vets.map(v => v.date).filter(Boolean).sort().reverse();
          if (dates.length > 0) {
            const daysSince = Math.floor((now - new Date(dates[0])) / 86400000);
            ozzyRing = Math.max(0, 1 - daysSince / 180);
            ozzyColor = daysSince < 90 ? "var(--grn)" : daysSince < 180 ? "var(--amber)" : "var(--red, #ef4444)";
          }
        } catch {}

        setRingData({
          studyHours, studyTarget: parseFloat(localStorage.getItem("sanctum_pmp_target")) || 150,
          activeApps, financeRatio, travelRatio, ozzyRing, ozzyColor,
        });
      } catch {}
    };
    load();
  }, []);

  const [order, setOrder] = useState(() => {
    const known = TRACKERS.map(t => t.id);
    try {
      const saved = JSON.parse(localStorage.getItem("sanctum_tracker_order"));
      if (Array.isArray(saved)) {
        const valid  = saved.filter(id => known.includes(id));
        const newOnes = known.filter(id => !valid.includes(id));
        return [...valid, ...newOnes];
      }
    } catch {}
    return known;
  });

  const [archivedOpen, setArchivedOpen] = useState(false);

  const [dragOver, setDragOver]   = useState(null);
  const [dragging, setDragging]   = useState(null);
  const dragId = useRef(null);

  const onDragStart = (e, id) => {
    dragId.current = id; setDragging(id); e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e, id) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
    if (id !== dragId.current) setDragOver(id);
  };
  const onDragLeave = (e, id) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(prev => prev === id ? null : prev);
  };
  const onDrop = (e, id) => {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) { setDragOver(null); return; }
    setOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(dragId.current), to = next.indexOf(id);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1); next.splice(to, 0, dragId.current);
      localStorage.setItem("sanctum_tracker_order", JSON.stringify(next));
      return next;
    });
    setDragOver(null); setDragging(null); dragId.current = null;
  };
  const onDragEnd = () => { setDragOver(null); setDragging(null); dragId.current = null; };

  const activeOrder = order.filter(id => !archivedTrackers.includes(id));
  const archivedList = order.filter(id => archivedTrackers.includes(id));

  const deleteCustomTracker = (id) => {
    const updated = customTrackers.filter(t => t.id !== id);
    setCustomTrackers(updated);
    localStorage.setItem('sanctum_custom_trackers', JSON.stringify(updated));
  };

  const renderCard = (id) => {
    const t = TRACKERS.find(x => x.id === id);
    if (!t) return null;
    const ring = getRingProps(t.id, ringData);

    const cls = [
      "tracker-card",
      dragging === id ? "is-dragging" : "",
      dragOver === id ? "drag-over" : "",
    ].filter(Boolean).join(" ");

    return (
      <div
        key={t.id}
        className={cls}
        draggable
        onDragStart={e => onDragStart(e, t.id)}
        onDragOver={e  => onDragOver(e, t.id)}
        onDragLeave={e => onDragLeave(e, t.id)}
        onDrop={e      => onDrop(e, t.id)}
        onDragEnd={onDragEnd}
        onClick={() => onNavigate(t.id)}
      >
        <div className="drag-handle" style={{ position: "absolute", top: 12, left: 14 }}>
          <Icon name="grab" size={12} />
        </div>

        <button
          className="tracker-archive-btn"
          title="Archive tracker"
          onClick={e => { e.stopPropagation(); onArchive(t.id); }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="21 8 21 21 3 21 3 8"/>
            <rect x="1" y="3" width="22" height="5"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
        </button>

        <div className="tc-ring"><MiniRing percent={ring.percent} color={ring.color} /></div>
        <div className="tc-icon"><Icon name={t.icon} size={22} color="var(--t2)" /></div>
        <div className="tc-name">{t.name}</div>
        <div className="tc-sub">{t.sub}</div>
      </div>
    );
  };

  const renderCustomCard = (tracker) => {
    const allEntries = loadCustomEntries();
    const weekStart = getWeekStart();
    const thisWeekCount = allEntries.filter(e => e.tracker_id === tracker.id && new Date(e.date) >= weekStart).length;
    const percent = thisWeekCount / (tracker.weekly_goal || 3);

    return (
      <div
        key={tracker.id}
        className="tracker-card"
        style={{ position: 'relative' }}
        onClick={() => setDetailTracker(tracker)}
      >
        <button
          style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 16, padding: '2px 4px', zIndex: 2 }}
          title="Delete tracker"
          onClick={e => { e.stopPropagation(); if (confirm(`Delete "${tracker.label}" tracker?`)) deleteCustomTracker(tracker.id); }}
        >×</button>

        <div className="tc-ring"><MiniRing percent={percent} color={tracker.color} /></div>
        <div className="tc-icon">
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: tracker.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: tracker.color }} />
          </div>
        </div>
        <div className="tc-name">{tracker.label}</div>
        <div className="tc-sub">{thisWeekCount}/{tracker.weekly_goal} {tracker.unit} this week{tracker.description ? ` · ${tracker.description}` : ''}</div>
      </div>
    );
  };

  return (
    <div className="page-body page-enter">
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t1)", marginBottom: 6, letterSpacing: "-.4px" }}>Your Trackers</div>
        <div style={{ fontSize: 13, color: "var(--t3)" }}>Select a tracker to view · drag to reorder · ask AI to create a custom tracker</div>
      </div>

      <div className="tracker-hub">
        {activeOrder.map(id => renderCard(id))}
        {customTrackers.map(t => renderCustomCard(t))}
      </div>

      <div className="archived-section">
        <button
          className="btn ghost"
          style={{ fontSize: 13, color: "var(--t3)", padding: "6px 0", gap: 6, display: "flex", alignItems: "center" }}
          onClick={() => setArchivedOpen(o => !o)}
        >
          {archivedOpen ? "▲" : "▶"} Archived ({archivedList.length})
        </button>
        {archivedOpen && (
          <div className="archived-grid">
            {archivedList.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--t3)" }}>No archived trackers</div>
            ) : archivedList.map(id => {
              const t = TRACKERS.find(x => x.id === id);
              if (!t) return null;
              return (
                <div key={t.id} className="archived-card">
                  <span>{t.name}</span>
                  <button className="btn sm" onClick={() => onUnarchive(t.id)}>Restore</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {detailTracker && (
        <CustomTrackerDetail
          tracker={detailTracker}
          onClose={() => setDetailTracker(null)}
          user={user}
        />
      )}
    </div>
  );
}
