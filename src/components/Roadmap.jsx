import { useState, useEffect } from "react";
import { sb, auth } from "../lib/supabase";
import { Icon, Modal } from "./shared";

const COLORS = [
  "#388bfd","#f59e0b","#8b5cf6","#10b981",
  "#ef4444","#ec4899","#06b6d4","#f97316","#84cc16","#a78bfa",
];

const SEED = {
  name: "Project Phoenix", start_date: "2026-01-01", end_date: "2027-12-31",
  tracks: [
    { label: "EU Commission", color: "#388bfd", position: 0, milestones: [
      { label: "Applied",      date: "2026-04-01", completed: true  },
      { label: "CBT Test",     date: "2026-05-01", completed: false },
      { label: "Assessment",   date: "2026-09-01", completed: false },
      { label: "Reserve List", date: "2026-12-01", completed: false },
    ]},
    { label: "PMP Certification", color: "#f59e0b", position: 1, milestones: [
      { label: "Studying",    date: "2026-04-01", completed: true  },
      { label: "75h logged",  date: "2026-05-01", completed: false },
      { label: "150h logged", date: "2026-07-01", completed: false },
      { label: "Exam Day",    date: "2026-07-07", completed: false },
      { label: "Results",     date: "2026-09-01", completed: false },
    ]},
    { label: "MSc Cybersecurity", color: "#8b5cf6", position: 2, milestones: [
      { label: "Enrolled",     date: "2026-04-01", completed: true  },
      { label: "Prep reading", date: "2026-06-01", completed: false },
      { label: "Semester 1",   date: "2026-09-14", completed: false },
      { label: "Semester 2",   date: "2027-01-15", completed: false },
      { label: "Dissertation", date: "2027-04-01", completed: false },
      { label: "Graduation",   date: "2027-11-01", completed: false },
    ]},
    { label: "Sanctum", color: "#10b981", position: 3, milestones: [
      { label: "v1 Live",     date: "2026-04-01", completed: true  },
      { label: "Tamara beta", date: "2026-05-01", completed: false },
      { label: "PWA launch",  date: "2026-06-01", completed: false },
      { label: "First users", date: "2026-08-01", completed: false },
      { label: "v2 launch",   date: "2026-12-01", completed: false },
    ]},
  ],
};

async function seedPhoenix(userId) {
  const proj = await sb.from("roadmap_projects").insert({ name: SEED.name, start_date: SEED.start_date, end_date: SEED.end_date, user_id: userId });
  if (!Array.isArray(proj) || !proj[0]) return null;
  const projId = proj[0].id;

  for (const t of SEED.tracks) {
    const tr = await sb.from("roadmap_tracks").insert({ project_id: projId, label: t.label, color: t.color, position: t.position, user_id: userId });
    if (!Array.isArray(tr) || !tr[0]) continue;
    const trackId = tr[0].id;
    for (const ms of t.milestones) {
      await sb.from("roadmap_milestones").insert({ track_id: trackId, label: ms.label, date: ms.date, completed: ms.completed, user_id: userId });
    }
  }
  return projId;
}

function Timeline({ project, tracks, milestones, onToggle, onAddMs }) {
  const startD = new Date(project.start_date + "T00:00:00");
  const endD   = new Date(project.end_date   + "T00:00:00");
  const span   = endD - startD;
  const today  = new Date();

  const toPct = (ds) => ((new Date(ds + "T00:00:00") - startD) / span) * 100;
  const todayPct = toPct(today.toISOString().slice(0, 10));

  const months = [];
  const cur = new Date(startD);
  cur.setDate(1);
  while (cur <= endD) {
    const p = toPct(cur.toISOString().slice(0, 10));
    if (p >= 0 && p <= 100) months.push({ d: new Date(cur), p });
    cur.setMonth(cur.getMonth() + 1);
  }

  const sortedTracks = [...tracks].sort((a, b) => a.position - b.position);
  const LW = 128;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 580, userSelect: "none" }}>
        {/* Month header */}
        <div style={{ display: "flex" }}>
          <div style={{ width: LW, flexShrink: 0 }} />
          <div style={{ flex: 1, position: "relative", height: 30, borderBottom: "1px solid var(--b1)" }}>
            {months.map(({ d, p }, i) => (
              <span key={i}>
                <div style={{ position: "absolute", left: `${p}%`, top: 0, bottom: 0, width: 1, background: "var(--b1)", opacity: 0.5 }} />
                <div style={{ position: "absolute", left: `${p}%`, bottom: 4, fontSize: 9, color: "var(--t3)", transform: "translateX(-50%)", whiteSpace: "nowrap", fontFamily: "var(--mono)", textAlign: "center", lineHeight: 1.2, pointerEvents: "none" }}>
                  {d.toLocaleDateString("en-IE", { month: "short" })}
                  {d.getMonth() === 0 && <><br /><span style={{ fontSize: 8, opacity: 0.7 }}>{d.getFullYear()}</span></>}
                </div>
              </span>
            ))}
            {/* Today marker in header */}
            {todayPct >= 0 && todayPct <= 100 && (
              <div style={{ position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0, width: 1,
                backgroundImage: "repeating-linear-gradient(to bottom,#ef4444 0,#ef4444 4px,transparent 4px,transparent 8px)",
                opacity: 0.6, zIndex: 2 }} />
            )}
          </div>
        </div>

        {/* Track rows */}
        {sortedTracks.map(track => {
          const tms = milestones
            .filter(m => m.track_id === track.id)
            .sort((a, b) => a.date.localeCompare(b.date));

          return (
            <div key={track.id} style={{ display: "flex", borderBottom: "1px solid var(--b1)" }}>
              {/* Label column */}
              <div style={{ width: LW, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 10px 0 4px", height: 56 }}>
                <span style={{ fontSize: 11, color: track.color, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {track.label}
                </span>
              </div>

              {/* Timeline area */}
              <div style={{ flex: 1, position: "relative", height: 56, overflow: "visible" }}>
                {/* Grid lines */}
                {months.map(({ p }, i) => (
                  <div key={i} style={{ position: "absolute", left: `${p}%`, top: 0, bottom: 0, width: 1, background: "var(--b1)", opacity: 0.2 }} />
                ))}

                {/* Track bar */}
                <div style={{ position: "absolute", top: "calc(50% - 1px)", left: 0, right: 0, height: 2, background: `${track.color}30` }} />

                {/* Today dashed line */}
                {todayPct >= 0 && todayPct <= 100 && (
                  <div style={{ position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0, width: 1,
                    backgroundImage: "repeating-linear-gradient(to bottom,#ef4444 0,#ef4444 4px,transparent 4px,transparent 8px)",
                    opacity: 0.6, zIndex: 1 }} />
                )}

                {/* Milestones */}
                {tms.map((ms, idx) => {
                  const x = toPct(ms.date);
                  if (x < 0 || x > 101) return null;
                  const above = idx % 2 === 0;
                  return (
                    <div key={ms.id} style={{ position: "absolute", left: `${x}%`, top: 0, bottom: 0, zIndex: 5 }}>
                      <div style={{
                        position: "absolute",
                        left: "50%",
                        ...(above ? { top: 3 } : { bottom: 3 }),
                        transform: "translateX(-50%)",
                        fontSize: 9,
                        color: ms.completed ? track.color : "var(--t3)",
                        whiteSpace: "nowrap",
                        fontFamily: "var(--mono)",
                        fontWeight: ms.completed ? 600 : 400,
                        pointerEvents: "none",
                        lineHeight: 1,
                        textShadow: "0 0 4px var(--bg)",
                      }} title={`${ms.label} · ${ms.date}`}>{ms.label}</div>

                      <div
                        title={`${ms.label} · ${ms.date}${ms.completed ? " ✓" : ""}\nClick to toggle`}
                        onClick={() => onToggle(ms)}
                        style={{
                          position: "absolute",
                          top: "50%", left: "50%",
                          width: 11, height: 11,
                          borderRadius: "50%",
                          transform: "translate(-50%, -50%)",
                          background: ms.completed ? track.color : "var(--bg)",
                          border: `2px solid ${track.color}`,
                          cursor: "pointer",
                          zIndex: 6,
                          transition: "transform 0.12s",
                          boxSizing: "border-box",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.5)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)"; }}
                      />
                    </div>
                  );
                })}

                {/* Add milestone button */}
                <button
                  className="btn xs ghost"
                  title="Add milestone to this track"
                  onClick={() => onAddMs(track.id)}
                  style={{ position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)", padding: "2px 5px", opacity: 0.35, fontSize: 10, zIndex: 7 }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "0.35"; }}
                >
                  <Icon name="plus" size={10} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Today label */}
        {todayPct >= 0 && todayPct <= 100 && (
          <div style={{ display: "flex" }}>
            <div style={{ width: LW, flexShrink: 0 }} />
            <div style={{ flex: 1, position: "relative", height: 16 }}>
              <div style={{ position: "absolute", left: `${todayPct}%`, transform: "translateX(-50%)", fontSize: 9, color: "#ef4444", fontFamily: "var(--mono)", top: 2 }}>today</div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{ display: "flex", width: "100%", flexWrap: "wrap", gap: "6px 16px", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--b1)" }}>
          {sortedTracks.map(track => (
            <div key={track.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: track.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "var(--t2)", fontFamily: "var(--mono)" }}>{track.label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 1, flexShrink: 0, background: "repeating-linear-gradient(to right,#ef4444 0,#ef4444 3px,transparent 3px,transparent 6px)" }} />
            <span style={{ fontSize: 10, color: "var(--t3)", fontFamily: "var(--mono)" }}>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Roadmap() {
  const [projects,   setProjects]   = useState([]);
  const [tracks,     setTracks]     = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [activeId,   setActiveId]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [seeding,    setSeeding]    = useState(false);
  const [user]                      = useState(() => auth.getSession()?.user || null);

  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sanctum_roadmap_collapsed") || "{}"); }
    catch { return {}; }
  });

  const [showNewProject,   setShowNewProject]   = useState(false);
  const [showNewTrack,     setShowNewTrack]     = useState(false);
  const [newMsTrackId,     setNewMsTrackId]     = useState(null);

  const [newProjForm,  setNewProjForm]  = useState({ name: "", start_date: "", end_date: "" });
  const [newTrackForm, setNewTrackForm] = useState({ label: "", color: COLORS[0] });
  const [newMsForm,    setNewMsForm]    = useState({ label: "", date: "" });

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    try {
      const data = await sb.from("roadmap_projects").select("*");
      let projs = Array.isArray(data) ? data : [];

      // Auto-clean stale test/empty projects
      const stale = projs.filter(p => !p.name || ["MM", "asca"].includes(p.name) || p.name.trim() === "");
      for (const p of stale) {
        const tData = await sb.from("roadmap_tracks").select("*", `&project_id=eq.${p.id}`, "");
        const ts = Array.isArray(tData) ? tData : [];
        for (const t of ts) await sb.from("roadmap_milestones").delete({ track_id: t.id });
        await sb.from("roadmap_tracks").delete({ project_id: p.id });
        await sb.from("roadmap_projects").delete({ id: p.id });
      }
      projs = projs.filter(p => p.name && !["MM", "asca"].includes(p.name) && p.name.trim() !== "");

      // Check if tracks exist — project row alone doesn't mean data is complete
      let needsSeed = projs.length === 0;
      if (!needsSeed && projs.length > 0) {
        const projId = projs[projs.length - 1].id;
        const tCheck = await sb.from("roadmap_tracks").select("*", `&project_id=eq.${projId}`, "");
        if (!Array.isArray(tCheck) || tCheck.length === 0) needsSeed = true;
      }

      if (needsSeed) {
        // If a Project Phoenix project exists but has no tracks, delete it first to avoid duplicate
        const existing = projs.find(p => p.name === SEED.name);
        if (existing) {
          await sb.from("roadmap_projects").delete({ id: existing.id });
        }
        setSeeding(true);
        await seedPhoenix(auth.getSession()?.user?.id);
        setSeeding(false);
        const fresh = await sb.from("roadmap_projects").select("*");
        const freshProjs = Array.isArray(fresh) ? fresh : [];
        setProjects(freshProjs);
        const firstId = freshProjs.length > 0 ? freshProjs[freshProjs.length - 1].id : null;
        setActiveId(firstId);
        if (firstId) await loadProjectData(firstId);
      } else {
        setProjects(projs);
        const firstId = projs[projs.length - 1].id;
        setActiveId(firstId);
        await loadProjectData(firstId);
      }
    } catch (err) {
      console.error("[Roadmap] init error:", err);
    }
    setLoading(false);
  };

  const loadProjectData = async (projId) => {
    try {
      const tData = await sb.from("roadmap_tracks").select("*", `&project_id=eq.${projId}`, "position.asc");
      let ts = Array.isArray(tData) ? tData : [];

      // Silently delete test or empty-label tracks
      const badTracks = ts.filter(t => !t.label || t.label.trim() === "" || t.label.toLowerCase() === "test");
      for (const t of badTracks) {
        await sb.from("roadmap_milestones").delete({ track_id: t.id });
        await sb.from("roadmap_tracks").delete({ id: t.id });
      }
      ts = ts.filter(t => t.label && t.label.trim() !== "" && t.label.toLowerCase() !== "test");

      setTracks(ts);
      if (ts.length === 0) { setMilestones([]); return; }
      const ids = ts.map(t => t.id).join(",");
      const mData = await sb.from("roadmap_milestones").select("*", `&track_id=in.(${ids})`, "date.asc");
      setMilestones(Array.isArray(mData) ? mData : []);
    } catch { setTracks([]); setMilestones([]); }
  };

  const switchProject = async (id) => {
    setActiveId(id);
    setTracks([]);
    setMilestones([]);
    await loadProjectData(id);
  };

  const toggleCollapsed = (id) => {
    setCollapsed(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("sanctum_roadmap_collapsed", JSON.stringify(next));
      return next;
    });
  };

  const toggleMilestone = async (ms) => {
    const updated = { ...ms, completed: !ms.completed };
    setMilestones(prev => prev.map(m => m.id === ms.id ? updated : m));
    try { await sb.from("roadmap_milestones").update({ completed: updated.completed }, { id: ms.id }); }
    catch { setMilestones(prev => prev.map(m => m.id === ms.id ? ms : m)); }
  };

  const deleteProject = async (projId, projName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${projName}"? This will permanently remove all its tracks and milestones.`)) return;
    try {
      const tData = await sb.from("roadmap_tracks").select("*", `&project_id=eq.${projId}`, "");
      const ts = Array.isArray(tData) ? tData : [];
      for (const t of ts) {
        await sb.from("roadmap_milestones").delete({ track_id: t.id });
      }
      await sb.from("roadmap_tracks").delete({ project_id: projId });
      await sb.from("roadmap_projects").delete({ id: projId });
      setProjects(prev => {
        const updated = prev.filter(p => p.id !== projId);
        if (activeId === projId) {
          const next = updated.length > 0 ? updated[updated.length - 1] : null;
          if (next) {
            setActiveId(next.id);
            loadProjectData(next.id);
          } else {
            setActiveId(null);
            setTracks([]);
            setMilestones([]);
          }
        }
        return updated;
      });
    } catch (err) {
      console.error("[deleteProject] Error:", err);
    }
  };

  const addProject = async () => {
    const { name, start_date, end_date } = newProjForm;
    if (!name.trim() || !start_date || !end_date) return;
    try {
      const res = await sb.from("roadmap_projects").insert({ name: name.trim(), start_date, end_date });
      const created = Array.isArray(res) && res[0] ? res[0] : null;
      if (created) {
        setProjects(prev => [created, ...prev]);
        setShowNewProject(false);
        setNewProjForm({ name: "", start_date: "", end_date: "" });
        await switchProject(created.id);
      }
    } catch { }
  };

  const addTrack = async () => {
    if (!newTrackForm.label.trim() || !activeId) return;
    const position = tracks.length;
    try {
      const res = await sb.from("roadmap_tracks").insert({
        project_id: activeId, label: newTrackForm.label.trim(),
        color: newTrackForm.color, position,
      });
      const created = Array.isArray(res) && res[0] ? res[0] : null;
      if (created) {
        setTracks(prev => [...prev, created]);
        setShowNewTrack(false);
        setNewTrackForm({ label: "", color: COLORS[0] });
      }
    } catch { }
  };

  const addMilestone = async () => {
    if (!newMsForm.label.trim() || !newMsForm.date || !newMsTrackId) return;
    try {
      const res = await sb.from("roadmap_milestones").insert({
        track_id: newMsTrackId, label: newMsForm.label.trim(),
        date: newMsForm.date, completed: false,
      });
      const created = Array.isArray(res) && res[0] ? res[0] : null;
      if (created) {
        setMilestones(prev => [...prev, created]);
        setNewMsTrackId(null);
        setNewMsForm({ label: "", date: "" });
      }
    } catch { }
  };

  const activeProject = projects.find(p => p.id === activeId);
  const isCollapsed = activeId ? !!collapsed[activeId] : false;

  if (loading || seeding) {
    return (
      <div style={{ marginBottom: 18, padding: "16px 20px", background: "var(--bg1)", border: "1px solid var(--b2)", borderRadius: 16 }}>
        <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>
          {seeding ? "Setting up Project Phoenix…" : "Loading roadmap…"}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* New Project modal */}
      {showNewProject && (
        <Modal title="New project" onClose={() => setShowNewProject(false)}>
          <div className="form-row">
            <label className="form-label">Project name</label>
            <input className="inp" value={newProjForm.name} autoFocus
              onChange={e => setNewProjForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Personal Branding" />
          </div>
          <div className="form-row">
            <label className="form-label">Start date</label>
            <input className="inp" type="date" value={newProjForm.start_date}
              onChange={e => setNewProjForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div className="form-row">
            <label className="form-label">End date</label>
            <input className="inp" type="date" value={newProjForm.end_date}
              onChange={e => setNewProjForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowNewProject(false)}>Cancel</button>
            <button className="btn primary" onClick={addProject}>Create project</button>
          </div>
        </Modal>
      )}

      {/* New Track modal */}
      {showNewTrack && (
        <Modal title="New track" onClose={() => setShowNewTrack(false)}>
          <div className="form-row">
            <label className="form-label">Track label</label>
            <input className="inp" value={newTrackForm.label} autoFocus
              onChange={e => setNewTrackForm(f => ({ ...f, label: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addTrack()}
              placeholder="e.g. Personal Brand" />
          </div>
          <div className="form-row">
            <label className="form-label">Colour</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {COLORS.map(c => (
                <div key={c}
                  onClick={() => setNewTrackForm(f => ({ ...f, color: c }))}
                  style={{ width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer",
                    border: newTrackForm.color === c ? "3px solid var(--t1)" : "2px solid transparent",
                    transition: "border 0.1s", boxSizing: "border-box" }} />
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowNewTrack(false)}>Cancel</button>
            <button className="btn primary" onClick={addTrack}>Add track</button>
          </div>
        </Modal>
      )}

      {/* New Milestone modal */}
      {newMsTrackId && (
        <Modal title="New milestone" onClose={() => setNewMsTrackId(null)}>
          <div className="form-row">
            <label className="form-label">Label</label>
            <input className="inp" value={newMsForm.label} autoFocus
              onChange={e => setNewMsForm(f => ({ ...f, label: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addMilestone()}
              placeholder="e.g. Beta launch" />
          </div>
          <div className="form-row">
            <label className="form-label">Date</label>
            <input className="inp" type="date" value={newMsForm.date}
              onChange={e => setNewMsForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setNewMsTrackId(null)}>Cancel</button>
            <button className="btn primary" onClick={addMilestone}>Add milestone</button>
          </div>
        </Modal>
      )}

      <div style={{ marginBottom: 18 }}>
        {/* Section header with project tabs */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".5px", marginRight: 4 }}>Roadmap</div>
            {/* Project tabs */}
            {[...projects].reverse().map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <button
                  className="btn xs"
                  onClick={() => switchProject(p.id)}
                  style={{
                    background: p.id === activeId ? "var(--blue)" : "var(--bg2)",
                    color: p.id === activeId ? "#fff" : "var(--t2)",
                    border: p.id === activeId ? "none" : "1px solid var(--b2)",
                    fontSize: 11,
                    borderRadius: "6px 0 0 6px",
                  }}
                >{p.name}</button>
                <button
                  title={`Delete "${p.name}"`}
                  onClick={(e) => deleteProject(p.id, p.name, e)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 20, height: 20, padding: 0, cursor: "pointer",
                    background: p.id === activeId ? "var(--blue)" : "var(--bg2)",
                    color: p.id === activeId ? "rgba(255,255,255,0.6)" : "var(--t3)",
                    border: p.id === activeId ? "none" : "1px solid var(--b2)",
                    borderLeft: "none",
                    borderRadius: "0 6px 6px 0",
                    fontSize: 12, lineHeight: 1,
                    transition: "color 0.1s, background 0.1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = p.id === activeId ? "rgba(255,255,255,0.6)" : "var(--t3)"; }}
                >×</button>
              </div>
            ))}
          </div>
          <button className="btn xs" onClick={() => setShowNewProject(true)} style={{ flexShrink: 0 }}>
            <Icon name="plus" size={11} /> New project
          </button>
        </div>

        {/* Project card */}
        {activeProject && (
          <div style={{ background: "var(--bg1)", border: "1px solid var(--b2)", borderRadius: 16, overflow: "hidden" }}>
            {/* Collapsible header */}
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", cursor: "pointer", borderBottom: isCollapsed ? "none" : "1px solid var(--b2)" }}
              onClick={() => toggleCollapsed(activeId)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="chart" size={15} color="var(--blue)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{activeProject.name}</span>
                <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>
                  {activeProject.start_date.slice(0, 7)} → {activeProject.end_date.slice(0, 7)}
                </span>
                <span style={{ fontSize: 11, color: "var(--t3)" }}>
                  {tracks.length} track{tracks.length !== 1 ? "s" : ""} · {milestones.length} milestone{milestones.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ color: "var(--t3)", transition: "transform 0.2s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
                <Icon name="chevR" size={15} />
              </div>
            </div>

            {/* Timeline */}
            {!isCollapsed && (
              <div style={{ padding: "14px 18px 8px" }}>
                {tracks.length === 0 ? (
                  <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                    No tracks yet — add your first track below
                  </div>
                ) : (
                  <Timeline
                    project={activeProject}
                    tracks={tracks}
                    milestones={milestones}
                    onToggle={toggleMilestone}
                    onAddMs={(trackId) => { setNewMsTrackId(trackId); setNewMsForm({ label: "", date: "" }); }}
                  />
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--b1)" }}>
                  <button className="btn xs ghost" onClick={() => { setShowNewTrack(true); setNewTrackForm({ label: "", color: COLORS[tracks.length % COLORS.length] }); }}>
                    <Icon name="plus" size={11} /> Add track
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!activeProject && !loading && (
          <div style={{ background: "var(--bg1)", border: "1px solid var(--b2)", borderRadius: 16, padding: "32px 20px", textAlign: "center" }}>
            <div style={{ color: "var(--t3)", fontSize: 13, marginBottom: 12 }}>No projects yet</div>
            <button className="btn primary sm" onClick={() => setShowNewProject(true)}>
              <Icon name="plus" size={13} /> Create your first project
            </button>
          </div>
        )}
      </div>
    </>
  );
}
