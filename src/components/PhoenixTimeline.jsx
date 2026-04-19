import { useState, useCallback } from "react";

const START_DATE = new Date("2026-04-01");
const END_DATE   = new Date("2027-12-01");
const TOTAL_DAYS = (END_DATE - START_DATE) / 86400000;

const INITIAL_TRACKS = [
  {
    id: "epso",
    label: "EU Commission",
    color: "#3b82f6",
    milestones: [
      { id: "e1", date: "2026-04-18", label: "Applied",     done: true  },
      { id: "e2", date: "2026-06-01", label: "CBT Test",    done: false },
      { id: "e3", date: "2026-09-01", label: "Assessment",  done: false },
      { id: "e4", date: "2026-12-01", label: "Reserve List",done: false },
    ],
  },
  {
    id: "pmp",
    label: "PMP Certification",
    color: "#f59e0b",
    milestones: [
      { id: "p1", date: "2026-04-18", label: "Studying",  done: true  },
      { id: "p2", date: "2026-05-15", label: "75h logged", done: false },
      { id: "p3", date: "2026-06-15", label: "150h logged",done: false },
      { id: "p4", date: "2026-07-07", label: "Exam Day",  done: false },
      { id: "p5", date: "2026-07-14", label: "Results",   done: false },
    ],
  },
  {
    id: "msc",
    label: "MSc Cybersecurity",
    color: "#8b5cf6",
    milestones: [
      { id: "m1", date: "2026-04-18", label: "Enrolled",     done: true  },
      { id: "m2", date: "2026-08-01", label: "Prep reading", done: false },
      { id: "m3", date: "2026-09-14", label: "Semester 1",   done: false },
      { id: "m4", date: "2027-01-15", label: "Semester 2",   done: false },
      { id: "m5", date: "2027-06-01", label: "Dissertation", done: false },
      { id: "m6", date: "2027-09-01", label: "Graduation",   done: false },
    ],
  },
  {
    id: "sanctum",
    label: "Sanctum",
    color: "#10b981",
    milestones: [
      { id: "s1", date: "2026-04-18", label: "v1 Live",     done: true  },
      { id: "s2", date: "2026-05-01", label: "Tamara beta", done: false },
      { id: "s3", date: "2026-06-01", label: "PWA launch",  done: false },
      { id: "s4", date: "2026-09-01", label: "First users", done: false },
      { id: "s5", date: "2026-12-01", label: "v2 launch",   done: false },
    ],
  },
];

const STORAGE_KEY = "sanctum_phoenix_timeline";

function load() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return null;
}

function save(tracks) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks)); } catch {}
}

function getX(dateStr) {
  const d = new Date(dateStr);
  const days = (d - START_DATE) / 86400000;
  return Math.max(0, Math.min(100, (days / TOTAL_DAYS) * 100));
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
}

function monthMarkers() {
  const markers = [];
  const cursor = new Date(START_DATE);
  cursor.setDate(1);
  while (cursor <= END_DATE) {
    const x = getX(cursor.toISOString().slice(0, 10));
    const label = cursor.toLocaleDateString("en-IE", {
      month: "short",
      year: cursor.getMonth() === 0 ? "numeric" : undefined,
    });
    markers.push({ x, label });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return markers;
}

const TRACK_H = 68;
const LABEL_W = 130;
const PADDING = 16;
const AXIS_H  = 28;
const DOT_R   = 6;

export default function PhoenixTimeline() {
  const [tracks, setTracks] = useState(() => load() || INITIAL_TRACKS);
  const [tooltip, setTooltip] = useState(null); // { mouseX, mouseY, label, date, color }
  const [editing, setEditing] = useState(null);  // { type:"milestone"|"track", trackId, milestoneId, value }
  const [adding, setAdding] = useState(null);     // { trackId, date, label }

  const persist = useCallback((next) => { setTracks(next); save(next); }, []);

  const toggleDone = (trackId, milestoneId) => {
    persist(tracks.map(t =>
      t.id !== trackId ? t :
      { ...t, milestones: t.milestones.map(m =>
          m.id === milestoneId ? { ...m, done: !m.done } : m
        )}
    ));
  };

  const startEdit = (type, trackId, milestoneId, field, value) =>
    setEditing({ type, trackId, milestoneId, field, value });

  const commitEdit = (updatedLabel, updatedDate) => {
    if (!editing) return;
    const { type, trackId, milestoneId } = editing;
    if (!updatedLabel.trim()) { setEditing(null); return; }
    if (type === "track") {
      persist(tracks.map(t => t.id === trackId ? { ...t, label: updatedLabel } : t));
    } else {
      persist(tracks.map(t =>
        t.id !== trackId ? t :
        { ...t, milestones: t.milestones.map(m =>
            m.id === milestoneId ? { ...m, label: updatedLabel, ...(updatedDate ? { date: updatedDate } : {}) } : m
          ).sort((a, b) => a.date.localeCompare(b.date)) }
      ));
    }
    setEditing(null);
  };

  const deleteMilestone = (trackId, milestoneId) => {
    persist(tracks.map(t =>
      t.id !== trackId ? t :
      { ...t, milestones: t.milestones.filter(m => m.id !== milestoneId) }
    ));
  };

  const commitAdd = () => {
    if (!adding || !adding.label.trim() || !adding.date) { setAdding(null); return; }
    const newM = { id: `${adding.trackId}_${Date.now()}`, date: adding.date, label: adding.label, done: false };
    persist(tracks.map(t =>
      t.id !== adding.trackId ? t :
      { ...t, milestones: [...t.milestones, newM].sort((a, b) => a.date.localeCompare(b.date)) }
    ));
    setAdding(null);
  };

  const todayStr  = new Date().toISOString().slice(0, 10);
  const todayX    = getX(todayStr);
  const months    = monthMarkers();
  const svgH      = AXIS_H + tracks.length * TRACK_H + PADDING;
  const totalH    = svgH;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        background: "var(--bg1)", border: "1px solid var(--b2)", borderRadius: 16,
        padding: "18px 20px", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", letterSpacing: ".3px" }}>
              Project Phoenix
            </div>
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
              Career &amp; life roadmap · Apr 2026 – Dec 2027
            </div>
          </div>
          <button
            title="Reset to defaults"
            onClick={() => { if (confirm("Reset timeline to defaults?")) persist(INITIAL_TRACKS); }}
            style={{ background: "none", border: "1px solid var(--b2)", borderRadius: 8, padding: "4px 10px",
              fontSize: 11, color: "var(--t3)", cursor: "pointer" }}>
            Reset
          </button>
        </div>

        {/* Scrollable SVG area */}
        <div style={{ overflowX: "auto", overflowY: "visible" }}>
          <div style={{ minWidth: 700, position: "relative" }}>
            <svg
              width="100%"
              viewBox={`0 0 1000 ${totalH}`}
              preserveAspectRatio="none"
              style={{ display: "block", overflow: "visible" }}
            >
              {/* Month grid lines + labels */}
              {months.map((m, i) => (
                <g key={i}>
                  <line
                    x1={LABEL_W + (m.x / 100) * (1000 - LABEL_W)}
                    y1={AXIS_H - 6}
                    x2={LABEL_W + (m.x / 100) * (1000 - LABEL_W)}
                    y2={totalH}
                    stroke="var(--b2)" strokeWidth="0.5"
                  />
                  <text
                    x={LABEL_W + (m.x / 100) * (1000 - LABEL_W)}
                    y={AXIS_H - 10}
                    textAnchor="middle"
                    fontSize="9"
                    fill="var(--t3)"
                    style={{ userSelect: "none" }}
                  >{m.label}</text>
                </g>
              ))}

              {/* Today line */}
              <g>
                <line
                  x1={LABEL_W + (todayX / 100) * (1000 - LABEL_W)}
                  y1={AXIS_H - 4}
                  x2={LABEL_W + (todayX / 100) * (1000 - LABEL_W)}
                  y2={totalH}
                  stroke="var(--t2)" strokeWidth="1.5" strokeDasharray="4 4"
                />
                <text
                  x={LABEL_W + (todayX / 100) * (1000 - LABEL_W)}
                  y={AXIS_H - 14}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill="var(--t2)"
                  style={{ userSelect: "none" }}
                >Today</text>
              </g>

              {/* Tracks */}
              {tracks.map((track, ti) => {
                const cy = AXIS_H + ti * TRACK_H + TRACK_H / 2;
                const lineY = cy;

                // Find next upcoming milestone
                const nextIdx = track.milestones.findIndex(m => !m.done && m.date >= todayStr);

                return (
                  <g key={track.id}>
                    {/* Track separator line (subtle) */}
                    {ti > 0 && (
                      <line x1={0} y1={AXIS_H + ti * TRACK_H} x2={1000} y2={AXIS_H + ti * TRACK_H}
                        stroke="var(--b1)" strokeWidth="0.5" />
                    )}

                    {/* Track label — click to rename */}
                    <text
                      x={LABEL_W - 8}
                      y={lineY + 4}
                      textAnchor="end"
                      fontSize="11"
                      fontWeight="600"
                      fill={track.color}
                      style={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => startEdit("track", track.id, null, "label", track.label)}
                    >{track.label}</text>

                    {/* Horizontal track line */}
                    <line
                      x1={LABEL_W}
                      y1={lineY}
                      x2={1000 - PADDING}
                      y2={lineY}
                      stroke={track.color}
                      strokeWidth="1.5"
                      strokeOpacity="0.35"
                    />

                    {/* Milestones */}
                    {track.milestones.map((m, mi) => {
                      const cx = LABEL_W + (getX(m.date) / 100) * (1000 - LABEL_W - PADDING);
                      const isNext = mi === nextIdx;
                      const labelUp = mi % 2 === 0;
                      const ly = labelUp ? lineY - 14 : lineY + 22;

                      return (
                        <g key={m.id}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={e => setTooltip({ mouseX: e.clientX, mouseY: e.clientY, label: m.label, date: m.date, color: track.color })}
                          onMouseMove={e => setTooltip(t => t ? { ...t, mouseX: e.clientX, mouseY: e.clientY } : null)}
                          onMouseLeave={() => setTooltip(null)}
                          onClick={() => startEdit("milestone", track.id, m.id, "label", m.label)}
                        >
                          {/* Pulsing ring for next milestone */}
                          {isNext && (
                            <circle cx={cx} cy={lineY} r={DOT_R + 5} fill="none"
                              stroke={track.color} strokeWidth="1.5" strokeOpacity="0.5"
                              style={{ animation: "phoenix-pulse 2s ease-in-out infinite" }}
                            />
                          )}

                          {/* Dot */}
                          {m.done ? (
                            <circle cx={cx} cy={lineY} r={DOT_R} fill={track.color} />
                          ) : (
                            <circle cx={cx} cy={lineY} r={DOT_R} fill="var(--bg1)"
                              stroke={track.color} strokeWidth="2" />
                          )}

                          {/* Checkmark for done */}
                          {m.done && (
                            <text x={cx} y={lineY + 4} textAnchor="middle" fontSize="7" fill="var(--bg)" style={{ userSelect: "none" }}>✓</text>
                          )}

                          {/* Label */}
                          <text
                            x={cx}
                            y={ly}
                            textAnchor="middle"
                            fontSize="9"
                            fill={m.done ? "var(--t3)" : "var(--t2)"}
                            fontWeight={isNext ? "700" : "400"}
                            style={{ userSelect: "none" }}
                          >{m.label}</text>
                        </g>
                      );
                    })}

                    {/* "+" add milestone button */}
                    <text
                      x={1000 - PADDING + 2}
                      y={lineY + 4}
                      fontSize="13"
                      fill="var(--t3)"
                      style={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => setAdding({ trackId: track.id, date: todayStr, label: "" })}
                    >+</text>
                  </g>
                );
              })}

              {/* CSS animation injected via foreignObject trick — use style tag instead */}
            </svg>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 20px", marginTop: 12 }}>
          {tracks.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--t2)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color }} />
              {t.label}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--t3)", marginLeft: "auto" }}>
            <span>Click label to rename · Click dot to edit · + to add</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            pointerEvents: "none",
            zIndex: 9999,
            left: tooltip.mouseX + 14,
            top: tooltip.mouseY - 40,
            background: "var(--bg2)", border: `1px solid ${tooltip.color}`,
            borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "var(--t1)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)", minWidth: 130,
          }}
        >
          <div style={{ fontWeight: 600, color: tooltip.color }}>{tooltip.label}</div>
          <div style={{ color: "var(--t3)", fontSize: 11, marginTop: 1 }}>{formatDate(tooltip.date)}</div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditModal
          editing={editing}
          tracks={tracks}
          onCommit={commitEdit}
          onDelete={editing.type === "milestone" ? () => {
            deleteMilestone(editing.trackId, editing.milestoneId);
            setEditing(null);
          } : null}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Add milestone modal */}
      {adding && (
        <AddModal
          adding={adding}
          tracks={tracks}
          onChange={delta => setAdding(a => ({ ...a, ...delta }))}
          onCommit={commitAdd}
          onClose={() => setAdding(null)}
        />
      )}

      <style>{`
        @keyframes phoenix-pulse {
          0%, 100% { stroke-opacity: 0.5; r: 11; }
          50%       { stroke-opacity: 1;   r: 14; }
        }
      `}</style>
    </div>
  );
}

function EditModal({ editing, tracks, onCommit, onDelete, onClose }) {
  const track = tracks.find(t => t.id === editing.trackId);
  const milestone = editing.type === "milestone"
    ? track?.milestones.find(m => m.id === editing.milestoneId)
    : null;

  const [label, setLabel] = useState(editing.value);
  const [date, setDate] = useState(milestone?.date || "");

  const handleCommit = () => onCommit(label, date);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)", marginBottom: 14 }}>
          {editing.type === "track" ? "Rename track" : "Edit milestone"}
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Label</label>
          <input
            className="inp"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCommit(); if (e.key === "Escape") onClose(); }}
            autoFocus
            style={inputStyle}
          />
        </div>
        {editing.type === "milestone" && milestone && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Date</label>
            <input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {onDelete && (
            <button className="btn sm danger" onClick={onDelete} style={{ marginRight: "auto" }}>Delete</button>
          )}
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button className="btn sm primary" onClick={handleCommit}>Save</button>
        </div>
      </div>
    </div>
  );
}

function AddModal({ adding, tracks, onChange, onCommit, onClose }) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)", marginBottom: 14 }}>
          Add milestone
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Label</label>
          <input
            className="inp"
            value={adding.label}
            onChange={e => onChange({ label: e.target.value })}
            onKeyDown={e => { if (e.key === "Enter") onCommit(); if (e.key === "Escape") onClose(); }}
            placeholder="Milestone name"
            autoFocus
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Date</label>
          <input
            className="inp"
            type="date"
            value={adding.date}
            onChange={e => onChange({ date: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button className="btn sm primary" onClick={onCommit}>Add</button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000,
};
const modalStyle = {
  background: "var(--bg2)", border: "1px solid var(--b2)", borderRadius: 14,
  padding: "20px 22px", minWidth: 280, maxWidth: 380, width: "90%",
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
};
const labelStyle = { display: "block", fontSize: 11, color: "var(--t3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.6px" };
const inputStyle = { width: "100%", boxSizing: "border-box" };
