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

const DATE_DAYS   = Array.from({ length: 31 }, (_, i) => i + 1);
const DATE_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DATE_YEARS  = [2025, 2026, 2027, 2028];

// ── Custom Tracker Detail Modal ───────────────────────────────────────────────
function CustomTrackerDetail({ tracker, onClose, user }) {
  const [entries, setEntries] = useState(() => loadCustomEntries().filter(e => e.tracker_id === tracker.id));
  const [logEntry, setLogEntry] = useState({ date: todayISO(), type: '', duration: 45, intensity: 3, notes: '' });
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [activeTab, setActiveTab] = useState('log');

  const weekStart = getWeekStart();
  const thisWeek = entries.filter(e => new Date(e.date) >= weekStart).length;
  const percent = thisWeek / (tracker.weekly_goal || 3);

  const allEntries = loadCustomEntries();

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
    const updated = [entry, ...allEntries];
    saveCustomEntries(updated);
    const newEntries = updated.filter(e => e.tracker_id === tracker.id);
    setEntries(newEntries);
    try { await sb.from('tracker_entries').insert({ ...entry, user_id: user?.id }); } catch {}
    setLogEntry({ date: todayISO(), type: '', duration: 45, intensity: 3, notes: '' });
    setSaving(false);
    setSavedOk(true);
    setTimeout(() => { setSavedOk(false); setActiveTab('history'); }, 1500);
  };

  const deleteEntry = (id) => {
    const updated = allEntries.filter(e => e.id !== id);
    saveCustomEntries(updated);
    setEntries(updated.filter(e => e.tracker_id === tracker.id));
  };

  // Stats
  const totalEntries = entries.length;
  const totalMinutes = entries.reduce((sum, e) => sum + (e.data?.duration || e.duration || 0), 0);

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

  let streak = 0;
  for (let w = 0; w < 52; w++) {
    const checkMon = new Date(weekStart);
    checkMon.setDate(weekStart.getDate() - w * 7);
    const key = checkMon.toISOString().slice(0, 10);
    if (byWeek[key]) streak++;
    else if (w > 0) break;
  }

  // Last 8 weeks bar chart data
  const last8Weeks = [];
  for (let w = 7; w >= 0; w--) {
    const mon = new Date(weekStart);
    mon.setDate(weekStart.getDate() - w * 7);
    const key = mon.toISOString().slice(0, 10);
    last8Weeks.push({ key, label: w === 0 ? 'now' : `W-${w}`, count: byWeek[key] || 0 });
  }
  const barMax = Math.max(...last8Weeks.map(w => w.count), tracker.weekly_goal || 3, 1);

  // Group history by week
  const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  const groupedHistory = [];
  sortedEntries.forEach(e => {
    const d = new Date(e.date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    const weekLabel = mon.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) + ' week';
    let group = groupedHistory.find(g => g.week === weekLabel);
    if (!group) { group = { week: weekLabel, entries: [] }; groupedHistory.push(group); }
    group.entries.push(e);
  });

  const getMotivation = () => {
    if (thisWeek >= tracker.weekly_goal) return "Goal reached this week! Keep going!";
    if (thisWeek === tracker.weekly_goal - 1) return "One more session to hit your goal!";
    if (thisWeek === 0) return "Start your first session this week";
    return `${tracker.weekly_goal - thisWeek} sessions to go`;
  };

  const setDateField = (fn) => {
    const d = new Date(logEntry.date + "T12:00:00");
    fn(d);
    setLogEntry(n => ({ ...n, date: d.toISOString().slice(0, 10) }));
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal" style={{ maxWidth: 480, width: '90%' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'0 0 16px', borderBottom:'1px solid var(--b1)' }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--b2)" strokeWidth="5"/>
              <circle cx="32" cy="32" r="28" fill="none" stroke={tracker.color} strokeWidth="5"
                strokeDasharray={2*Math.PI*28}
                strokeDashoffset={2*Math.PI*28*(1-Math.min(percent,1))}
                strokeLinecap="round" transform="rotate(-90 32 32)"/>
              <text x="32" y="36" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--t1)">{thisWeek}</text>
            </svg>
            <div style={{ position:'absolute', bottom:-4, right:-4, fontSize:10, background:'var(--bg2)', border:'1px solid var(--b2)', borderRadius:6, padding:'1px 5px', color:'var(--t3)' }}>/{tracker.weekly_goal}</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--t1)' }}>{tracker.label}</div>
            <div style={{ fontSize:13, color:'var(--t3)', marginTop:2 }}>{thisWeek} of {tracker.weekly_goal} sessions this week</div>
            {tracker.description && <div style={{ fontSize:12, color:'var(--t3)', marginTop:4 }}>{tracker.description}</div>}
            <div style={{ fontSize:12, marginTop:6, fontWeight: thisWeek >= tracker.weekly_goal ? 600 : 400,
              color: thisWeek >= tracker.weekly_goal ? 'var(--grn)' : 'var(--t3)' }}>{getMotivation()}</div>
          </div>
          <button style={{ background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:20, padding:'0 4px', alignSelf:'flex-start' }} onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, margin:'12px 0 0', borderBottom:'1px solid var(--b2)' }}>
          {['log', 'history', 'stats'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ background:'none', border:'none', padding:'6px 12px', cursor:'pointer', fontSize:13,
                fontWeight: activeTab===tab ? 700 : 400, color: activeTab===tab ? 'var(--t1)' : 'var(--t3)',
                borderBottom: activeTab===tab ? `2px solid ${tracker.color}` : '2px solid transparent', marginBottom:-1 }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Log tab */}
        {activeTab === 'log' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14, marginTop:16 }}>
            <div className="form-row">
              <label className="form-label">Date</label>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <select className="inp" style={{ width:70 }}
                  value={new Date(logEntry.date + "T12:00:00").getDate()}
                  onChange={e => setDateField(d => d.setDate(parseInt(e.target.value)))}>
                  {DATE_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="inp" style={{ flex:1 }}
                  value={new Date(logEntry.date + "T12:00:00").getMonth()}
                  onChange={e => setDateField(d => d.setMonth(parseInt(e.target.value)))}>
                  {DATE_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select className="inp" style={{ width:80 }}
                  value={new Date(logEntry.date + "T12:00:00").getFullYear()}
                  onChange={e => setDateField(d => d.setFullYear(parseInt(e.target.value)))}>
                  {DATE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Activity</label>
              <select className="inp" value={logEntry.type}
                onChange={e => setLogEntry(n => ({...n, type: e.target.value}))}>
                <option value="">Select activity...</option>
                <option>Gym — Upper body</option>
                <option>Gym — Lower body</option>
                <option>Gym — Full body</option>
                <option>Run</option>
                <option>Cycle</option>
                <option>Swim</option>
                <option>Yoga</option>
                <option>Walk</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-row">
              <label className="form-label">Duration</label>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <input type="range" min="10" max="120" step="5"
                  value={logEntry.duration}
                  onChange={e => setLogEntry(n => ({...n, duration: parseInt(e.target.value)}))}
                  style={{ flex:1 }}/>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--t1)', minWidth:50 }}>{logEntry.duration} min</span>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Intensity</label>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => setLogEntry(n => ({...n, intensity: i}))}
                    style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--b2)',
                      background: logEntry.intensity >= i ? tracker.color : 'var(--bg2)',
                      color: logEntry.intensity >= i ? '#fff' : 'var(--t3)',
                      cursor:'pointer', fontSize:12, fontWeight:600 }}>{i}</button>
                ))}
                <span style={{ fontSize:11, color:'var(--t3)', marginLeft:4 }}>
                  {['','Easy','Light','Moderate','Hard','Max'][logEntry.intensity]}
                </span>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Notes</label>
              <input className="inp" type="text" placeholder="Optional notes"
                value={logEntry.notes} onChange={e => setLogEntry(n => ({...n, notes: e.target.value}))} />
            </div>
            <button className="btn primary" style={{ marginTop:4, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
              onClick={saveEntry} disabled={saving}>
              {savedOk
                ? <><Icon name="check" size={14} color="#fff"/> Logged!</>
                : saving ? 'Saving…' : 'Log Entry'}
            </button>
          </div>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div style={{ marginTop:12 }}>
            {entries.length === 0 ? (
              <div style={{ fontSize:13, color:'var(--t3)', textAlign:'center', padding:'24px 0' }}>No entries yet. Log your first session!</div>
            ) : groupedHistory.map(({ week, entries: grpEntries }) => (
              <div key={week}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--t3)', letterSpacing:.5,
                  textTransform:'uppercase', padding:'8px 0 4px' }}>{week}</div>
                {grpEntries.map(e => (
                  <div key={e.id} className="fin-row">
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:tracker.color, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:'var(--t1)' }}>{e.data?.type || e.type || 'Session'}</div>
                        <div style={{ fontSize:11, color:'var(--t3)' }}>
                          {e.date} · {e.data?.duration || e.duration || 0} min
                          {e.data?.intensity ? ` · Intensity ${e.data.intensity}/5` : ''}
                        </div>
                      </div>
                    </div>
                    <button className="btn xs danger" onClick={() => deleteEntry(e.id)}><Icon name="trash" size={11}/></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Stats tab */}
        {activeTab === 'stats' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16, marginTop:16 }}>
            <div className="grid-2" style={{ gap:12 }}>
              <div className="stat">
                <div className="stat-label">Total sessions</div>
                <div className="stat-value">{totalEntries}</div>
              </div>
              <div className="stat">
                <div className="stat-label">This week</div>
                <div className="stat-value" style={{ color: thisWeek >= tracker.weekly_goal ? 'var(--grn)' : 'var(--t1)' }}>{thisWeek}/{tracker.weekly_goal}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Best week</div>
                <div className="stat-value">{bestWeek}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Current streak</div>
                <div className="stat-value">{streak} <span style={{ fontSize:14 }}>wks</span></div>
              </div>
              <div className="stat">
                <div className="stat-label">Total time</div>
                <div className="stat-value" style={{ fontSize:18 }}>{Math.floor(totalMinutes/60)}h {totalMinutes%60}m</div>
              </div>
              <div className="stat">
                <div className="stat-label">Avg duration</div>
                <div className="stat-value" style={{ fontSize:18 }}>{Math.round(totalMinutes/(totalEntries||1))} <span style={{ fontSize:14 }}>min</span></div>
              </div>
            </div>
            {/* Mini bar chart — last 8 weeks */}
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--t3)', letterSpacing:.5, textTransform:'uppercase', marginBottom:8 }}>Last 8 weeks</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:60 }}>
                {last8Weeks.map((w, i) => {
                  const heightPx = w.count > 0 ? Math.max(Math.round((w.count / barMax) * 56), 4) : 0;
                  return (
                    <div key={i} style={{ flex:1, height: heightPx,
                      background: w.count >= tracker.weekly_goal ? 'var(--grn)' : tracker.color,
                      borderRadius:'3px 3px 0 0', opacity:0.85, transition:'height .3s', minWidth:0 }}/>
                  );
                })}
              </div>
              <div style={{ display:'flex', gap:4, marginTop:4 }}>
                {last8Weeks.map((w, i) => (
                  <div key={i} style={{ flex:1, fontSize:7, color:'var(--t3)', textAlign:'center',
                    fontFamily:'var(--mono)', overflow:'hidden', minWidth:0 }}>{w.label}</div>
                ))}
              </div>
            </div>
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

  const [trackerEntries, setTrackerEntries] = useState([]);

  const [detailTracker, setDetailTracker] = useState(null);

  const loadCustomTrackers = async () => {
    const data = await sb.from('custom_trackers').select('*');
    console.log('Loaded custom trackers:', data);
    if (Array.isArray(data) && data.length > 0) {
      const active = data.filter(t => !t.archived);
      setCustomTrackers(active);
      localStorage.setItem('sanctum_custom_trackers', JSON.stringify(active));
    } else {
      try { setCustomTrackers(JSON.parse(localStorage.getItem('sanctum_custom_trackers') || '[]')); }
      catch { setCustomTrackers([]); }
    }
  };

  useEffect(() => {
    loadCustomTrackers();
    const loadEntries = async () => {
      const data = await sb.from('tracker_entries').select('*');
      if (Array.isArray(data) && data.length > 0) {
        setTrackerEntries(data);
      } else {
        setTrackerEntries(loadCustomEntries());
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
    const ws = getWeekStart();
    const thisWeekCount = trackerEntries.filter(e => e.tracker_id === tracker.id && new Date(e.date) >= ws).length;
    const percent = thisWeekCount / (tracker.weekly_goal || 3);

    return (
      <div key={tracker.id} className="tracker-card" onClick={() => setDetailTracker(tracker)}>
        <button
          style={{ position:'absolute', top:10, right:10, background:'none', border:'none', color:'var(--t3)', cursor:'pointer', fontSize:16, padding:'2px 4px', zIndex:2 }}
          title="Delete tracker"
          onClick={e => { e.stopPropagation(); if (confirm(`Delete "${tracker.label}" tracker?`)) deleteCustomTracker(tracker.id); }}
        >×</button>
        <div className="tc-ring"><MiniRing percent={percent} color={tracker.color} /></div>
        <div className="tc-icon">
          <div style={{ width:24, height:24, borderRadius:'50%', background: tracker.color + '33', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background: tracker.color }}/>
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
