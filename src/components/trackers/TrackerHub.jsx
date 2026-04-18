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

export default function TrackerHub({ archivedTrackers = [], onArchive, onUnarchive, onNavigate }) {
  const [ringData, setRingData] = useState({
    studyHours: 0, studyTarget: 150,
    activeApps: 0,
    financeRatio: 0,
    travelRatio: 0,
    ozzyRing: 0, ozzyColor: "var(--grn)",
  });

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

        // Travel: completed / total trips
        let travelRatio = 0;
        try {
          const trips = JSON.parse(localStorage.getItem("sanctum_trips") || "[]");
          const total = trips.length;
          const completed = trips.filter(t => t.status === "completed").length;
          travelRatio = total > 0 ? Math.min(completed / total, 1) : 0;
        } catch {}

        // Ozzy: days since last vet visit
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

  return (
    <div className="page-body page-enter">
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t1)", marginBottom: 6, letterSpacing: "-.4px" }}>Your Trackers</div>
        <div style={{ fontSize: 13, color: "var(--t3)" }}>Select a tracker to view · drag to reorder</div>
      </div>

      <div className="tracker-hub">
        {activeOrder.map(id => renderCard(id))}
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
    </div>
  );
}
