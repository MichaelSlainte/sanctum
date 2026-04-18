import { useState } from "react";
import { Icon, Modal } from "../shared";

export default function Travel() {
  const [showAdd, setShowAdd] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [trips, setTrips] = useState(() => JSON.parse(localStorage.getItem("sanctum_trips") || JSON.stringify([
    {
      id: "scotland-2026", name: "Scotland Road Trip",
      start: "2026-09-07", end: "2026-09-13",
      status: "planning", budget: 2000, spent: 0,
      travelers: "Michael, Tamara, Ozzy",
      notes: "Edinburgh → Highlands → Skye. Dog-friendly accommodation needed.",
      checklist: [
        { id: "c1", text: "Book accommodation", done: false },
        { id: "c2", text: "Book ferry/route", done: false },
        { id: "c3", text: "Dog-friendly hotels check", done: false },
        { id: "c4", text: "Travel insurance", done: false },
        { id: "c5", text: "Ozzy travel docs", done: false },
      ]
    },
    {
      id: "italy-2026", name: "Italy Trip",
      start: "2026-06-12", end: "2026-06-17",
      status: "booked", budget: 1500, spent: 344,
      travelers: "Michael, Tamara",
      notes: "Flights booked — €344. Accommodation TBC.",
      checklist: [
        { id: "c1", text: "Flights", done: true },
        { id: "c2", text: "Hotel/Airbnb", done: false },
        { id: "c3", text: "Travel insurance", done: false },
        { id: "c4", text: "Activities plan", done: false },
      ]
    },
  ])));

  const [newTrip, setNewTrip] = useState({ name: "", start: "", end: "", budget: "", travelers: "", notes: "" });

  const saveTrips = (t) => { setTrips(t); localStorage.setItem("sanctum_trips", JSON.stringify(t)); };

  const addTrip = () => {
    if (!newTrip.name || !newTrip.start) return;
    const trip = { ...newTrip, id: Date.now().toString(), status: "planning", spent: 0, budget: parseFloat(newTrip.budget) || 0, checklist: [] };
    saveTrips([trip, ...trips]);
    setNewTrip({ name: "", start: "", end: "", budget: "", travelers: "", notes: "" });
    setShowAdd(false);
  };

  const toggleCheck = (tripId, checkId) => {
    saveTrips(trips.map(t => t.id === tripId ? {
      ...t, checklist: t.checklist.map(c => c.id === checkId ? { ...c, done: !c.done } : c)
    } : t));
  };

  const deleteTrip = (id) => { saveTrips(trips.filter(t => t.id !== id)); if (activeTrip?.id === id) setActiveTrip(null); };

  const STATUS_STYLE = {
    planning: { color: "var(--amber)", bg: "rgba(245,158,11,0.12)", label: "Planning" },
    booked: { color: "var(--blue)", bg: "rgba(59,130,246,0.12)", label: "Booked" },
    ongoing: { color: "var(--grn)", bg: "rgba(16,185,129,0.12)", label: "Ongoing" },
    completed: { color: "var(--t3)", bg: "var(--bg3)", label: "Completed" },
  };

  const daysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff}d away` : diff === 0 ? "Today!" : "Past";
  };

  const selected = activeTrip ? trips.find(t => t.id === activeTrip) : null;

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Add trip" onClose={() => setShowAdd(false)} wide>
          <div className="form-row"><label className="form-label">Trip name</label><input className="inp" value={newTrip.name} onChange={e => setNewTrip(n => ({ ...n, name: e.target.value }))} placeholder="Scotland Road Trip" autoFocus /></div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row"><label className="form-label">Start date</label><input className="inp" type="date" value={newTrip.start} onChange={e => setNewTrip(n => ({ ...n, start: e.target.value }))} /></div>
            <div className="form-row"><label className="form-label">End date</label><input className="inp" type="date" value={newTrip.end} onChange={e => setNewTrip(n => ({ ...n, end: e.target.value }))} /></div>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row"><label className="form-label">Budget (€)</label><input className="inp" type="number" value={newTrip.budget} onChange={e => setNewTrip(n => ({ ...n, budget: e.target.value }))} placeholder="2000" /></div>
            <div className="form-row"><label className="form-label">Travellers</label><input className="inp" value={newTrip.travelers} onChange={e => setNewTrip(n => ({ ...n, travelers: e.target.value }))} placeholder="Michael, Tamara..." /></div>
          </div>
          <div className="form-row"><label className="form-label">Notes</label><textarea className="inp" value={newTrip.notes} onChange={e => setNewTrip(n => ({ ...n, notes: e.target.value }))} placeholder="Route ideas, accommodation notes..." style={{ minHeight: 70 }} /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addTrip}>Add trip</button></div>
        </Modal>
      )}

      {/* Header stats */}
      <div className="grid-3 mb18">
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)" }}><Icon name="travel" size={18} color="var(--blue)" /></div>
          <div className="stat-label">Upcoming trips</div>
          <div className="stat-value">{trips.filter(t => t.status !== "completed").length}</div>
          <div className="stat-sub">Planned & booked</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}><Icon name="calendar" size={18} color="var(--grn)" /></div>
          <div className="stat-label">Next trip</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{trips.filter(t => t.status !== "completed").sort((a, b) => a.start.localeCompare(b.start))[0]?.name || "None"}</div>
          <div className="stat-sub">{trips.filter(t => t.status !== "completed").sort((a, b) => a.start.localeCompare(b.start))[0] ? daysUntil(trips.filter(t => t.status !== "completed").sort((a, b) => a.start.localeCompare(b.start))[0].start) : ""}</div>
        </div>
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}><Icon name="finance" size={18} color="var(--amber)" /></div>
          <div className="stat-label">Total budget</div>
          <div className="stat-value">€{trips.reduce((s, t) => s + (t.budget || 0), 0).toLocaleString()}</div>
          <div className="stat-sub">Across all trips</div>
        </div>
      </div>

      <div className={selected ? "grid-2" : ""} style={{ gap: 18 }}>
        {/* Trip list */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>All trips</div>
            <button className="btn sm primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Add trip</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {trips.map(trip => {
              const st = STATUS_STYLE[trip.status] || STATUS_STYLE.planning;
              const isActive = activeTrip === trip.id;
              const doneChecks = trip.checklist.filter(c => c.done).length;
              return (
                <div key={trip.id}
                  onClick={() => setActiveTrip(isActive ? null : trip.id)}
                  style={{
                    background: isActive ? "rgba(59,130,246,0.08)" : "var(--bg1)",
                    border: `1px solid ${isActive ? "var(--blueb)" : "var(--b1)"}`,
                    borderRadius: 14, padding: 18, cursor: "pointer",
                    transition: "all .2s",
                  }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
                      <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="travel" size={18} color="var(--blue)" /></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>{trip.name}</div>
                        <div style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 6 }}>
                          {trip.start} → {trip.end} · {trip.travelers}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>
                          <span className="badge muted">€{(trip.budget || 0).toLocaleString()}</span>
                          {trip.checklist.length > 0 && <span className="badge muted">✓ {doneChecks}/{trip.checklist.length}</span>}
                          <span style={{ fontSize: 11, color: "var(--blue)", fontFamily: "var(--mono)" }}>{daysUntil(trip.start)}</span>
                        </div>
                      </div>
                    </div>
                    <button className="btn xs danger" onClick={e => { e.stopPropagation(); deleteTrip(trip.id); }}><Icon name="trash" size={11} /></button>
                  </div>
                </div>
              );
            })}
            {trips.length === 0 && (
              <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "32px 0" }}>No trips planned yet</div>
            )}
          </div>
        </div>

        {/* Trip detail */}
        {selected && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 14 }}>{selected.name}</div>
            <div className="card mb18">
              <div className="card-header"><div className="card-title">Checklist</div>
                <span className="badge green">{selected.checklist.filter(c => c.done).length}/{selected.checklist.length}</span>
              </div>
              {selected.checklist.map(c => (
                <div key={c.id} className="task-item" onClick={() => toggleCheck(selected.id, c.id)} style={{ cursor: "pointer" }}>
                  <div className={`task-check${c.done ? " done" : ""}`}>
                    {c.done && <Icon name="check" size={10} color="#fff" />}
                  </div>
                  <span className={`task-text${c.done ? " done" : ""}`}>{c.text}</span>
                </div>
              ))}
            </div>

            <div className="card mb18">
              <div className="card-header"><div className="card-title">Budget</div></div>
              <div className="fin-row">
                <span style={{ fontSize: 13, color: "var(--t2)" }}>Total budget</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--t1)" }}>€{(selected.budget || 0).toLocaleString()}</span>
              </div>
              <div className="fin-row">
                <span style={{ fontSize: 13, color: "var(--t2)" }}>Spent so far</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--red)" }}>€{(selected.spent || 0).toLocaleString()}</span>
              </div>
              <div className="fin-row">
                <span style={{ fontSize: 13, color: "var(--t2)" }}>Remaining</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--grn)" }}>€{((selected.budget || 0) - (selected.spent || 0)).toLocaleString()}</span>
              </div>
              <div className="stat-bar" style={{ marginTop: 12 }}>
                <div className="stat-fill red" style={{ width: `${Math.min(((selected.spent || 0) / (selected.budget || 1)) * 100, 100)}%` }} />
              </div>
            </div>

            {selected.notes && (
              <div className="card" style={{ background: "rgba(59,130,246,0.05)", borderColor: "rgba(59,130,246,0.15)" }}>
                <div className="card-title" style={{ marginBottom: 10 }}>Notes</div>
                <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{selected.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
