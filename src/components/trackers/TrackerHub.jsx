import { useState, useRef, useEffect } from "react";
import { Icon } from "../shared";
import { sb } from "../../lib/supabase";
import TrackerCreator from "./TrackerCreator";

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
const yesterdayISO = () => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const loadCustomEntries = () => {
  try { return JSON.parse(localStorage.getItem('sanctum_tracker_entries') || '[]'); }
  catch { return []; }
};
const saveCustomEntries = (entries) => {
  localStorage.setItem('sanctum_tracker_entries', JSON.stringify(entries));
};

const DATE_DAYS   = Array.from({ length: 31 }, (_, i) => i + 1);
const DATE_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DATE_YEARS  = [2025, 2026, 2027, 2028];

const PALETTE = [
  '#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444',
  '#ec4899','#06b6d4','#f97316','#6366f1','#14b8a6',
];

const getActivityPresets = (label) => {
  const l = (label || '').toLowerCase();
  if (/workout|gym|fitness|exercise|lift|strength/.test(l))
    return ['Gym — Upper body','Gym — Lower body','Gym — Full body','Cardio — Run','Cardio — Cycle','Cardio — Swim','Yoga / Stretch','Walk','Other'];
  if (/run|jog|cardio/.test(l))
    return ['Easy run','Tempo run','Long run','Intervals','Trail run','Cycle','Walk','Cross-train','Other'];
  if (/read|book/.test(l))
    return ['Fiction','Non-fiction','Technical','Self-help','Biography','Research','Other'];
  if (/meditat|mindful|yoga|breath/.test(l))
    return ['Guided meditation','Breathing','Body scan','Yoga flow','Stretching','Journaling','Other'];
  if (/learn|study|course|code|program/.test(l))
    return ['Video course','Reading','Practice','Project','Review notes','Tutorial','Other'];
  if (/diet|food|nutrition|eat/.test(l))
    return ['Healthy meal','Meal prep','No sugar','Water goal','Supplement','Other'];
  if (/sleep|rest|recover/.test(l))
    return ['Full sleep','Nap','Early night','No screen','Other'];
  return ['Session','Practice','Review','Completed','Other'];
};

// ── Custom Tracker Detail — full page ────────────────────────────────────────
export function CustomTrackerDetail({ tracker: initialTracker, onClose, user, onUpdate }) {
  const [tracker, setTracker] = useState(initialTracker);
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);

  // Editable header state
  const [editName, setEditName]   = useState(false);
  const [nameVal,  setNameVal]    = useState(initialTracker.label);
  const [editDesc, setEditDesc]   = useState(false);
  const [descVal,  setDescVal]    = useState(initialTracker.description || '');

  // Log state
  const [logEntry, setLogEntry] = useState({ date: todayISO(), type: '', duration: 45, intensity: 3, notes: '' });
  const [saving,  setSaving]  = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [activeTab, setActiveTab] = useState('log');

  // Load entries from Supabase
  useEffect(() => {
    const load = async () => {
      setLoadingEntries(true);
      try {
        const data = await sb.from('tracker_entries').select('*');
        const mine = (Array.isArray(data) ? data : [])
          .filter(e => e.tracker_id === tracker.id)
          .map(e => ({
            ...e,
            data: typeof e.data === 'string' ? JSON.parse(e.data || '{}') : (e.data || {}),
          }));
        if (mine.length > 0) {
          setEntries(mine);
        } else {
          setEntries(loadCustomEntries().filter(e => e.tracker_id === tracker.id));
        }
      } catch {
        setEntries(loadCustomEntries().filter(e => e.tracker_id === tracker.id));
      }
      setLoadingEntries(false);
    };
    load();
  }, [tracker.id]);

  const updateTracker = async (fields) => {
    const updated = { ...tracker, ...fields };
    setTracker(updated);
    const all = JSON.parse(localStorage.getItem('sanctum_custom_trackers') || '[]');
    localStorage.setItem('sanctum_custom_trackers', JSON.stringify(all.map(t => t.id === tracker.id ? { ...t, ...fields } : t)));
    try { await sb.from('custom_trackers').update(fields, { id: tracker.id }); } catch {}
    onUpdate?.(updated);
  };

  // Stats derived
  const weekStart = getWeekStart();
  const thisWeek  = entries.filter(e => new Date(e.date) >= weekStart).length;
  const percent   = thisWeek / (tracker.weekly_goal || 3);

  const totalEntries  = entries.length;
  const totalMinutes  = entries.reduce((s, e) => s + (e.data?.duration ?? e.duration ?? 0), 0);
  const avgDuration   = Math.round(totalMinutes / (totalEntries || 1));

  const byWeek = {};
  entries.forEach(e => {
    const d = new Date(e.date);
    const day = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    const key = mon.toISOString().slice(0, 10);
    byWeek[key] = (byWeek[key] || 0) + 1;
  });
  const weekCounts = Object.values(byWeek);
  const bestWeek   = weekCounts.length > 0 ? Math.max(...weekCounts) : 0;

  let streak = 0;
  for (let w = 0; w < 52; w++) {
    const m = new Date(weekStart);
    m.setDate(weekStart.getDate() - w * 7);
    if (byWeek[m.toISOString().slice(0, 10)]) streak++;
    else if (w > 0) break;
  }

  const last8Weeks = [];
  for (let w = 7; w >= 0; w--) {
    const m = new Date(weekStart);
    m.setDate(weekStart.getDate() - w * 7);
    const key = m.toISOString().slice(0, 10);
    last8Weeks.push({ key, label: w === 0 ? 'now' : `W-${w}`, count: byWeek[key] || 0 });
  }
  const barMax = Math.max(...last8Weeks.map(w => w.count), tracker.weekly_goal || 3, 1);

  // Activity breakdown
  const activityBreakdown = {};
  entries.forEach(e => {
    const t = e.data?.type || e.type || 'Session';
    activityBreakdown[t] = (activityBreakdown[t] || 0) + 1;
  });
  const activityList = Object.entries(activityBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // History grouped by week
  const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  const groupedHistory = [];
  sortedEntries.forEach(e => {
    const d = new Date(e.date);
    const day = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    const weekLabel = mon.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) + ' week';
    let group = groupedHistory.find(g => g.week === weekLabel);
    if (!group) { group = { week: weekLabel, entries: [] }; groupedHistory.push(group); }
    group.entries.push(e);
  });

  const saveEntry = async () => {
    if (!logEntry.date) return;
    setSaving(true);
    const entry = {
      id: 'entry_' + Date.now(),
      tracker_id: tracker.id,
      date: logEntry.date,
      type: logEntry.type,
      duration: parseInt(logEntry.duration) || 45,
      data: {
        type: logEntry.type,
        duration: parseInt(logEntry.duration) || 45,
        intensity: logEntry.intensity,
        notes: logEntry.notes,
      },
      notes: logEntry.notes,
      created_at: new Date().toISOString(),
    };
    const localAll = loadCustomEntries();
    saveCustomEntries([entry, ...localAll]);
    setEntries(prev => [entry, ...prev]);
    try {
      await sb.from('tracker_entries').insert({
        tracker_id: tracker.id,
        type: logEntry.type,
        duration: parseInt(logEntry.duration) || 45,
        data: JSON.stringify({ type: logEntry.type, duration: logEntry.duration, intensity: logEntry.intensity, notes: logEntry.notes }),
        date: logEntry.date,
        user_id: user?.id,
      });
    } catch {}
    setLogEntry({ date: todayISO(), type: '', duration: 45, intensity: 3, notes: '' });
    setSaving(false);
    setSavedOk(true);
    setTimeout(() => { setSavedOk(false); setActiveTab('history'); }, 1500);
  };

  const deleteEntry = (id) => {
    const updated = loadCustomEntries().filter(e => e.id !== id);
    saveCustomEntries(updated);
    setEntries(prev => prev.filter(e => e.id !== id));
    try { sb.from('tracker_entries').delete({ id }); } catch {}
  };

  const setDateField = (fn) => {
    const d = new Date(logEntry.date + 'T12:00:00');
    fn(d);
    setLogEntry(n => ({ ...n, date: d.toISOString().slice(0, 10) }));
  };

  const activityPresets = getActivityPresets(tracker.label);
  const ringColor = percent >= 1 ? 'var(--grn)' : percent >= 0.5 ? 'var(--amber)' : tracker.color;
  const r = 52, circ = 2 * Math.PI * r;

  return (
    <div className="page-body animate-in">
      {/* Breadcrumb */}
      <div className="tracker-back-bar" style={{ marginBottom: 16 }}>
        <button className="tracker-back-btn" onClick={onClose}>
          <Icon name="chevL" size={13} /> Trackers
        </button>
        <span style={{ color: 'var(--b3)', fontSize: 12 }}>/</span>
        <span className="tracker-section-label">{tracker.label}</span>
      </div>

      {/* Editable header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Weekly ring */}
          <div style={{ flexShrink: 0 }}>
            <svg width="110" height="110" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={r} fill="none" style={{ stroke: 'var(--b2)' }} strokeWidth="8" />
              <circle cx="60" cy="60" r={r} fill="none" style={{ stroke: ringColor }}
                strokeWidth="8" strokeDasharray={circ} strokeDashoffset={circ - circ * Math.min(percent, 1)}
                strokeLinecap="round" transform="rotate(-90 60 60)" />
              <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="700" style={{ fill: 'var(--t1)', fontFamily: 'var(--mono)' }}>{thisWeek}</text>
              <text x="60" y="72" textAnchor="middle" fontSize="12" style={{ fill: 'var(--t3)' }}>/ {tracker.weekly_goal}</text>
              <text x="60" y="87" textAnchor="middle" fontSize="10" style={{ fill: ringColor }}>
                {percent >= 1 ? 'Goal met!' : `${tracker.weekly_goal - thisWeek} to go`}
              </text>
            </svg>
          </div>

          {/* Name / desc / controls */}
          <div style={{ flex: 1, minWidth: 200 }}>
            {/* Name */}
            {editName ? (
              <input className="inp" autoFocus style={{ fontSize: 20, fontWeight: 700, padding: '4px 8px', marginBottom: 6, width: '100%' }}
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onBlur={() => { setEditName(false); if (nameVal.trim()) updateTracker({ label: nameVal.trim() }); }}
                onKeyDown={e => { if (e.key === 'Enter') { setEditName(false); if (nameVal.trim()) updateTracker({ label: nameVal.trim() }); } if (e.key === 'Escape') { setEditName(false); setNameVal(tracker.label); } }}
              />
            ) : (
              <div onClick={() => setEditName(true)} title="Click to edit name"
                style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', cursor: 'text', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                {tracker.label}
                <span style={{ fontSize: 11, color: 'var(--t3)', opacity: 0.6 }}>✎</span>
              </div>
            )}

            {/* Description */}
            {editDesc ? (
              <input className="inp" autoFocus style={{ fontSize: 13, padding: '3px 8px', marginBottom: 10, width: '100%' }}
                value={descVal}
                onChange={e => setDescVal(e.target.value)}
                onBlur={() => { setEditDesc(false); updateTracker({ description: descVal }); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { setEditDesc(false); updateTracker({ description: descVal }); } }}
              />
            ) : (
              <div onClick={() => setEditDesc(true)} title="Click to edit description"
                style={{ fontSize: 13, color: 'var(--t3)', cursor: 'text', marginBottom: 10, minHeight: 20 }}>
                {tracker.description || <span style={{ opacity: 0.45 }}>Add description…</span>}
              </div>
            )}

            {/* Weekly goal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>Weekly goal</span>
              <input type="number" className="inp" min="1" max="99"
                style={{ width: 60, padding: '3px 8px', fontSize: 13, textAlign: 'center' }}
                value={tracker.weekly_goal || 3}
                onChange={e => setTracker(t => ({ ...t, weekly_goal: parseInt(e.target.value) || 1 }))}
                onBlur={e => updateTracker({ weekly_goal: parseInt(e.target.value) || 1 })}
              />
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>{tracker.unit || 'sessions'}/week</span>
            </div>

            {/* Color picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600 }}>Color</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PALETTE.map(c => (
                  <button key={c} onClick={() => updateTracker({ color: c })}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: c === tracker.color ? '2px solid var(--t1)' : '2px solid transparent',
                      cursor: 'pointer', outline: c === tracker.color ? `2px solid ${c}` : 'none', outlineOffset: 1 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-4 mb18">
        <div className="stat">
          <div className="stat-label">This week</div>
          <div className="stat-value" style={{ color: thisWeek >= (tracker.weekly_goal || 3) ? 'var(--grn)' : 'var(--t1)' }}>
            {thisWeek}<span style={{ fontSize: 14, color: 'var(--t3)', fontWeight: 400 }}>/{tracker.weekly_goal || 3}</span>
          </div>
          <div className="stat-sub">{tracker.unit || 'sessions'}</div>
          <div className="stat-bar">
            <div className="stat-fill" style={{ width: `${Math.min(percent * 100, 100)}%`, background: ringColor }} />
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Total sessions</div>
          <div className="stat-value">{totalEntries}</div>
          <div className="stat-sub">all time</div>
        </div>
        <div className="stat">
          <div className="stat-label">Best week</div>
          <div className="stat-value">{bestWeek}</div>
          <div className="stat-sub">{tracker.unit || 'sessions'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total time</div>
          <div className="stat-value" style={{ fontSize: 20 }}>
            {Math.floor(totalMinutes / 60)}h<span style={{ fontSize: 13 }}> {totalMinutes % 60}m</span>
          </div>
          <div className="stat-sub">avg {avgDuration} min/session</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--b2)' }}>
        {['log', 'history', 'stats'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ background: 'none', border: 'none', padding: '6px 16px', cursor: 'pointer', fontSize: 13,
              fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? 'var(--t1)' : 'var(--t3)',
              borderBottom: activeTab === tab ? `2px solid ${tracker.color}` : '2px solid transparent', marginBottom: -1 }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Log tab ── */}
      {activeTab === 'log' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-row">
            <label className="form-label">Date</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[['Today', todayISO()], ['Yesterday', yesterdayISO()]].map(([lbl, val]) => (
                <button key={lbl} onClick={() => setLogEntry(n => ({ ...n, date: val }))}
                  style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid var(--b2)', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    background: logEntry.date === val ? tracker.color : 'var(--bg2)',
                    color: logEntry.date === val ? '#fff' : 'var(--t2)' }}>
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className="inp" style={{ width: 70 }}
                value={new Date(logEntry.date + 'T12:00:00').getDate()}
                onChange={e => setDateField(d => d.setDate(parseInt(e.target.value)))}>
                {DATE_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="inp" style={{ flex: 1 }}
                value={new Date(logEntry.date + 'T12:00:00').getMonth()}
                onChange={e => setDateField(d => d.setMonth(parseInt(e.target.value)))}>
                {DATE_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select className="inp" style={{ width: 80 }}
                value={new Date(logEntry.date + 'T12:00:00').getFullYear()}
                onChange={e => setDateField(d => d.setFullYear(parseInt(e.target.value)))}>
                {DATE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Activity</label>
            <select className="inp" value={logEntry.type}
              onChange={e => setLogEntry(n => ({ ...n, type: e.target.value }))}>
              <option value="">Select activity…</option>
              {activityPresets.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>

          <div className="form-row">
            <label className="form-label">Duration</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '4px 0' }}>
              <input type="range" min="10" max="120" step="5"
                value={logEntry.duration}
                onChange={e => setLogEntry(n => ({ ...n, duration: parseInt(e.target.value) }))}
                style={{ flex: 1, accentColor: tracker.color }} />
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', minWidth: 60, textAlign: 'right' }}>
                {logEntry.duration}<span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 400 }}> min</span>
              </span>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Intensity</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['Easy', 'Light', 'Medium', 'Hard', 'Max'].map((lvl, i) => (
                <button key={i} onClick={() => setLogEntry(n => ({ ...n, intensity: i + 1 }))}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid var(--b2)',
                    background: logEntry.intensity === i + 1 ? tracker.color : 'var(--bg2)',
                    color: logEntry.intensity === i + 1 ? '#fff' : 'var(--t3)',
                    fontSize: 11, cursor: 'pointer', fontWeight: logEntry.intensity === i + 1 ? 600 : 400 }}>
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Notes</label>
            <textarea className="inp" placeholder="Optional notes…" style={{ minHeight: 60, resize: 'vertical' }}
              value={logEntry.notes} onChange={e => setLogEntry(n => ({ ...n, notes: e.target.value }))} />
          </div>

          <button
            style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 600,
              background: savedOk ? 'var(--grn)' : tracker.color,
              border: 'none', borderRadius: 12, marginTop: 4, color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: saving ? 0.7 : 1 }}
            onClick={saveEntry} disabled={saving || savedOk}>
            {savedOk ? <><Icon name="check" size={14} color="#fff" /> Session logged!</>
              : saving ? 'Saving…' : 'Log Session'}
          </button>
        </div>
      )}

      {/* ── History tab ── */}
      {activeTab === 'history' && (
        <div>
          {loadingEntries && <div style={{ fontSize: 13, color: 'var(--t3)', padding: '16px 0' }}>Loading…</div>}
          {!loadingEntries && entries.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--t3)', textAlign: 'center', padding: '32px 0' }}>
              No entries yet. Log your first session!
            </div>
          )}
          {groupedHistory.map(({ week, entries: grp }) => (
            <div key={week}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', letterSpacing: 0.5,
                textTransform: 'uppercase', padding: '10px 0 4px' }}>{week}</div>
              {grp.map(e => (
                <div key={e.id} className="fin-row">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: tracker.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>{e.data?.type || e.type || 'Session'}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                        {e.date} · {e.data?.duration ?? e.duration ?? 0} min
                        {e.data?.intensity ? ` · ${['Easy','Light','Medium','Hard','Max'][e.data.intensity - 1] || `Intensity ${e.data.intensity}`}` : ''}
                        {e.data?.notes || e.notes ? ` · ${(e.data?.notes || e.notes).slice(0, 40)}` : ''}
                      </div>
                    </div>
                  </div>
                  <button className="btn xs danger" onClick={() => deleteEntry(e.id)}><Icon name="trash" size={11} /></button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Stats tab ── */}
      {activeTab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Last 8 weeks bar chart */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Last 8 weeks
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
              {last8Weeks.map((w, i) => {
                const h = w.count > 0 ? Math.max(Math.round((w.count / barMax) * 76), 4) : 0;
                return (
                  <div key={i} title={`${w.label}: ${w.count} sessions`}
                    style={{ flex: 1, height: h,
                      background: w.count >= (tracker.weekly_goal || 3) ? 'var(--grn)' : tracker.color,
                      borderRadius: '3px 3px 0 0', opacity: 0.85, transition: 'height .3s', minWidth: 0 }} />
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              {last8Weeks.map((w, i) => (
                <div key={i} style={{ flex: 1, fontSize: 7, color: 'var(--t3)', textAlign: 'center',
                  fontFamily: 'var(--mono)', overflow: 'hidden', minWidth: 0 }}>{w.label}</div>
              ))}
            </div>
          </div>

          {/* Activity breakdown */}
          {activityList.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
                Activity breakdown
              </div>
              {activityList.map(([type, count]) => (
                <div key={type} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>{type}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: tracker.color }}>{count}</span>
                  </div>
                  <div className="stat-bar" style={{ margin: 0 }}>
                    <div style={{ height: '100%', width: `${(count / (activityList[0][1] || 1)) * 100}%`,
                      background: tracker.color, borderRadius: 'inherit', opacity: 0.8 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary stats */}
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="stat">
              <div className="stat-label">Streak</div>
              <div className="stat-value">{streak} <span style={{ fontSize: 14 }}>wks</span></div>
              <div className="stat-sub">consecutive weeks</div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg duration</div>
              <div className="stat-value">{avgDuration} <span style={{ fontSize: 14 }}>min</span></div>
              <div className="stat-sub">per session</div>
            </div>
            <div className="stat">
              <div className="stat-label">Total time</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</div>
            </div>
            <div className="stat">
              <div className="stat-label">Best week</div>
              <div className="stat-value">{bestWeek}</div>
              <div className="stat-sub">{tracker.unit || 'sessions'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackerHub({ archivedTrackers = [], onArchive, onUnarchive, onNavigate, user, refreshKey = 0 }) {
  const [selectedCustom, setSelectedCustom] = useState(null);

  const [ringData, setRingData] = useState({
    studyHours: 0, studyTarget: 150,
    activeApps: 0,
    financeRatio: 0,
    travelRatio: 0,
    ozzyRing: 0, ozzyColor: "var(--grn)",
  });

  const [customTrackers, setCustomTrackers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sanctum_custom_trackers') || '[]').filter(t => !t.archived); }
    catch { return []; }
  });

  const [archivedCustomTrackers, setArchivedCustomTrackers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sanctum_custom_trackers') || '[]').filter(t => t.archived); }
    catch { return []; }
  });

  const [trackerEntries, setTrackerEntries] = useState([]);

  const loadCustomTrackers = async () => {
    try {
      const data = await sb.from('custom_trackers').select('*');
      if (Array.isArray(data) && data.length > 0) {
        const active   = data.filter(t => !t.archived);
        const archived = data.filter(t =>  t.archived);
        setCustomTrackers(active);
        setArchivedCustomTrackers(archived);
        localStorage.setItem('sanctum_custom_trackers', JSON.stringify(data));
        return;
      }
    } catch {}
    try {
      const local = JSON.parse(localStorage.getItem('sanctum_custom_trackers') || '[]');
      setCustomTrackers(local.filter(t => !t.archived));
      setArchivedCustomTrackers(local.filter(t => t.archived));
    } catch {
      setCustomTrackers([]);
      setArchivedCustomTrackers([]);
    }
  };

  useEffect(() => {
    loadCustomTrackers();
    const loadEntries = async () => {
      const data = await sb.from('tracker_entries').select('*');
      if (Array.isArray(data) && data.length > 0) {
        setTrackerEntries(data);
      } else {
        const local = loadCustomEntries();
        console.log('localStorage entries:', local);
        setTrackerEntries(local);
      }
    };
    loadEntries();
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
          travelRatio = trips.length > 0 ? Math.min(trips.filter(t => t.status === "completed").length / trips.length, 1) : 0;
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

  const [archivedOpen, setArchivedOpen] = useState(archivedTrackers.length > 0 || archivedCustomTrackers.length > 0);
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);
  const dragId = useRef(null);

  const onDragStart = (e, id) => { dragId.current = id; setDragging(id); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver  = (e, id) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (id !== dragId.current) setDragOver(id); };
  const onDragLeave = (e, id) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(prev => prev === id ? null : prev); };
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

  const activeOrder  = order.filter(id => !archivedTrackers.includes(id));
  const archivedList = order.filter(id => archivedTrackers.includes(id));

  const archiveCustomTracker = async (id) => {
    const target = customTrackers.find(t => t.id === id);
    setCustomTrackers(prev => prev.filter(t => t.id !== id));
    if (target) setArchivedCustomTrackers(prev => [...prev, { ...target, archived: true }]);
    const all = JSON.parse(localStorage.getItem('sanctum_custom_trackers') || '[]');
    localStorage.setItem('sanctum_custom_trackers', JSON.stringify(all.map(t => t.id === id ? { ...t, archived: true } : t)));
    try { await sb.from('custom_trackers').update({ archived: true }, { id }); } catch {}
  };

  const deleteCustomTracker = async (id, label) => {
    if (!window.confirm(`Delete ${label} tracker? This cannot be undone.`)) return;
    setCustomTrackers(prev => prev.filter(t => t.id !== id));
    const all = JSON.parse(localStorage.getItem('sanctum_custom_trackers') || '[]');
    localStorage.setItem('sanctum_custom_trackers', JSON.stringify(all.filter(t => t.id !== id)));
    try { await sb.from('custom_trackers').delete({ id }); } catch {}
  };

  const unarchiveCustomTracker = async (id) => {
    const target = archivedCustomTrackers.find(t => t.id === id);
    setArchivedCustomTrackers(prev => prev.filter(t => t.id !== id));
    if (target) setCustomTrackers(prev => [...prev, { ...target, archived: false }]);
    const all = JSON.parse(localStorage.getItem('sanctum_custom_trackers') || '[]');
    localStorage.setItem('sanctum_custom_trackers', JSON.stringify(all.map(t => t.id === id ? { ...t, archived: false } : t)));
    try { await sb.from('custom_trackers').update({ archived: false }, { id }); } catch {}
  };

  const renderCard = (id) => {
    const t = TRACKERS.find(x => x.id === id);
    if (!t) return null;
    const ring = getRingProps(t.id, ringData);
    const cls = ["tracker-card", dragging === id ? "is-dragging" : "", dragOver === id ? "drag-over" : ""].filter(Boolean).join(" ");
    return (
      <div key={t.id} className={cls} draggable
        onDragStart={e => onDragStart(e, t.id)} onDragOver={e => onDragOver(e, t.id)}
        onDragLeave={e => onDragLeave(e, t.id)} onDrop={e => onDrop(e, t.id)}
        onDragEnd={onDragEnd} onClick={() => onNavigate(t.id)}>
        <div className="drag-handle" style={{ position: "absolute", top: 12, left: 14 }}>
          <Icon name="grab" size={12} />
        </div>
        {!DEFAULT_IDS.includes(t.id) && (
          <button className="tracker-archive-btn" title="Archive tracker"
            onClick={e => { e.stopPropagation(); onArchive(t.id); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="21 8 21 21 3 21 3 8"/>
              <rect x="1" y="3" width="22" height="5"/>
              <line x1="10" y1="12" x2="14" y2="12"/>
            </svg>
          </button>
        )}
        <div className="tc-ring"><MiniRing percent={ring.percent} color={ring.color} /></div>
        <div className="tc-icon"><Icon name={t.icon} size={22} color="var(--t2)" /></div>
        <div className="tc-name">{t.name}</div>
        <div className="tc-sub">{t.sub}</div>
      </div>
    );
  };

  const renderCustomCard = (t) => {
    const ws = getWeekStart();
    const weekCount = (trackerEntries || []).filter(e => e.tracker_id === t.id && new Date(e.date) >= ws).length;
    const color = t.color || '#10b981';
    const circ = 2 * Math.PI * 18;
    const offset = circ * (1 - Math.min(weekCount / (t.weekly_goal || 3), 1));
    return (
      <div
        key={t.id}
        onClick={() => setSelectedCustom(t)}
        style={{
          background: 'var(--bg1)',
          border: '1px solid var(--b2)',
          borderTop: `3px solid ${color}`,
          borderRadius: 16,
          padding: 20,
          cursor: 'pointer',
          position: 'relative',
          minHeight: 160,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          transition: 'border-color .15s, transform .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >
        {/* Ring top right */}
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--b2)" strokeWidth="4" />
            <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="4"
              strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 22 22)" />
          </svg>
        </div>
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: color + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 36,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke={color} strokeWidth="2" strokeLinecap="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        {/* Text + delete row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>{t.label}</div>
            {t.description && <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>{t.description}</div>}
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>
              {weekCount} / {t.weekly_goal || 3} this week
            </div>
          </div>
          <button
            title="Delete tracker"
            onClick={e => { e.stopPropagation(); deleteCustomTracker(t.id, t.label); }}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--b2)',
              borderRadius: 6, padding: '5px 7px', cursor: 'pointer',
              color: 'var(--red, #ef4444)', display: 'flex', alignItems: 'center',
              flexShrink: 0,
            }}>
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>
    );
  };

  if (selectedCustom) {
    return (
      <CustomTrackerDetail
        tracker={selectedCustom}
        onClose={() => setSelectedCustom(null)}
        user={user}
        onUpdate={(updated) => {
          setCustomTrackers(prev => prev.map(t => t.id === updated.id ? updated : t));
          setSelectedCustom(updated);
        }}
      />
    );
  }

  return (
    <div className="page-body page-enter">
      <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t1)", marginBottom: 6, letterSpacing: "-.4px" }}>Your Trackers</div>
          <div style={{ fontSize: 13, color: "var(--t3)" }}>Select a tracker to view · drag to reorder</div>
        </div>
        <TrackerCreator user={user} onCreated={(tracker) => {
          setCustomTrackers(prev => {
            const exists = prev.find(t => t.id === tracker.id);
            return exists ? prev : [...prev, tracker];
          });
          setSelectedCustom(tracker);
        }} />
      </div>

      <div className="tracker-hub">
        {activeOrder.map(id => renderCard(id))}
        {customTrackers.map(t => renderCustomCard(t))}
      </div>

      <div className="archived-section">
        <button className="btn ghost"
          style={{ fontSize: 13, color: "var(--t3)", padding: "6px 0", gap: 6, display: "flex", alignItems: "center" }}
          onClick={() => setArchivedOpen(o => !o)}>
          {archivedOpen ? "▲" : "▶"} Archived ({archivedList.length + archivedCustomTrackers.length})
        </button>
        {archivedOpen && (
          <div className="archived-grid">
            {archivedList.length === 0 && archivedCustomTrackers.length === 0
              ? <div style={{ fontSize: 13, color: "var(--t3)" }}>No archived trackers</div>
              : <>
                  {archivedList.map(id => {
                    const t = TRACKERS.find(x => x.id === id);
                    if (!t) return null;
                    return (
                      <div key={t.id} className="archived-card">
                        <span>{t.name}</span>
                        <button className="btn sm" onClick={() => onUnarchive(t.id)}>Restore</button>
                      </div>
                    );
                  })}
                  {archivedCustomTrackers.map(t => (
                    <div key={t.id} className="archived-card">
                      <span>{t.label}</span>
                      <button className="btn sm" onClick={() => unarchiveCustomTracker(t.id)}>Restore</button>
                    </div>
                  ))}
                </>
            }
          </div>
        )}
      </div>
    </div>
  );
}
