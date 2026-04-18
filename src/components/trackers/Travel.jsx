import { useState } from "react";
import { Icon, Modal } from "../shared";

const STATUS_STYLE = {
  planning:  { color: "var(--blue)",  bg: "rgba(59,130,246,0.12)",  label: "Planning"  },
  booked:    { color: "var(--grn)",   bg: "rgba(16,185,129,0.12)",  label: "Booked"    },
  ongoing:   { color: "var(--amber)", bg: "rgba(245,158,11,0.12)",  label: "Ongoing"   },
  completed: { color: "var(--t3)",    bg: "var(--bg3)",             label: "Completed" },
  cancelled: { color: "var(--red)",   bg: "rgba(239,68,68,0.12)",   label: "Cancelled" },
};

const EMPTY_TRIP = { name: "", destination: "", start: "", end: "", travelers: "", budget: "", status: "planning", notes: "" };

export default function Travel() {
  const [trips, setTrips] = useState(() => JSON.parse(localStorage.getItem("sanctum_trips") || JSON.stringify([
    {
      id: "scotland-2026", name: "Scotland Road Trip", destination: "Scotland, UK",
      start: "2026-09-07", end: "2026-09-13",
      status: "planning", budget: 2000, spent: 0,
      travelers: "Michael, Tamara, Ozzy",
      notes: "Edinburgh → Highlands → Skye. Dog-friendly accommodation needed.",
      checklist: [
        { id: "c1", text: "Book accommodation", done: false },
        { id: "c2", text: "Book ferry/route",   done: false },
        { id: "c3", text: "Dog-friendly hotels check", done: false },
        { id: "c4", text: "Travel insurance",   done: false },
        { id: "c5", text: "Ozzy travel docs",   done: false },
      ],
    },
    {
      id: "italy-2026", name: "Italy Trip", destination: "Italy",
      start: "2026-06-12", end: "2026-06-17",
      status: "booked", budget: 1500, spent: 344,
      travelers: "Michael, Tamara",
      notes: "Flights booked — €344. Accommodation TBC.",
      checklist: [
        { id: "c1", text: "Flights",          done: true  },
        { id: "c2", text: "Hotel/Airbnb",     done: false },
        { id: "c3", text: "Travel insurance", done: false },
        { id: "c4", text: "Activities plan",  done: false },
      ],
    },
  ])));

  const [showAdd,   setShowAdd]   = useState(false);
  const [editTrip,  setEditTrip]  = useState(null);   // trip object being edited
  const [newTrip,   setNewTrip]   = useState(EMPTY_TRIP);
  const [expanded,  setExpanded]  = useState({});     // { tripId: true } when checklist visible
  const [newItems,  setNewItems]  = useState({});     // { tripId: "draft text" }
  const [budgetFilter, setBudgetFilter] = useState("all");

  const saveTrips = (t) => { setTrips(t); localStorage.setItem("sanctum_trips", JSON.stringify(t)); };

  /* ── Add ── */
  const addTrip = () => {
    if (!newTrip.name || !newTrip.start) return;
    const trip = {
      ...newTrip,
      id: Date.now().toString(),
      budget: parseFloat(newTrip.budget) || 0,
      spent: 0,
      checklist: [],
    };
    saveTrips([trip, ...trips]);
    setNewTrip(EMPTY_TRIP);
    setShowAdd(false);
  };

  /* ── Edit ── */
  const saveEdit = () => {
    if (!editTrip) return;
    saveTrips(trips.map(t => t.id === editTrip.id
      ? { ...t, ...editTrip, budget: parseFloat(editTrip.budget) || 0 }
      : t
    ));
    setEditTrip(null);
  };

  /* ── Delete ── */
  const deleteTrip = (id) => saveTrips(trips.filter(t => t.id !== id));

  /* ── Checklist ── */
  const toggleCheck = (tripId, checkId) =>
    saveTrips(trips.map(t => t.id === tripId
      ? { ...t, checklist: t.checklist.map(c => c.id === checkId ? { ...c, done: !c.done } : c) }
      : t));

  const addCheckItem = (tripId) => {
    const text = (newItems[tripId] || "").trim();
    if (!text) return;
    saveTrips(trips.map(t => t.id === tripId
      ? { ...t, checklist: [...t.checklist, { id: Date.now().toString(), text, done: false }] }
      : t));
    setNewItems(n => ({ ...n, [tripId]: "" }));
  };

  const deleteCheckItem = (tripId, checkId) =>
    saveTrips(trips.map(t => t.id === tripId
      ? { ...t, checklist: t.checklist.filter(c => c.id !== checkId) }
      : t));

  /* ── Budget filter ── */
  const budgetTrips = budgetFilter === "all"
    ? trips
    : budgetFilter === "upcoming"
    ? trips.filter(t => t.status !== "completed" && t.status !== "cancelled")
    : budgetFilter === "completed"
    ? trips.filter(t => t.status === "completed")
    : trips.filter(t => t.id === budgetFilter);

  const totalBudget = budgetTrips.reduce((s, t) => s + (t.budget || 0), 0);
  const budgetLabel = budgetFilter === "all" ? "Across all trips"
    : budgetFilter === "upcoming"  ? "Upcoming trips"
    : budgetFilter === "completed" ? "Completed trips"
    : trips.find(t => t.id === budgetFilter)?.name || "";

  const daysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    return diff > 0 ? `${diff}d away` : diff === 0 ? "Today!" : "Past";
  };

  const upcoming = trips.filter(t => t.status !== "completed" && t.status !== "cancelled").sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="page-body animate-in">

      {/* ── Add trip modal ── */}
      {showAdd && (
        <Modal title="Add trip" onClose={() => setShowAdd(false)} wide>
          <TripForm data={newTrip} onChange={setNewTrip} />
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn primary" onClick={addTrip}>Add trip</button>
          </div>
        </Modal>
      )}

      {/* ── Edit trip modal ── */}
      {editTrip && (
        <Modal title="Edit trip" onClose={() => setEditTrip(null)} wide>
          <TripForm data={editTrip} onChange={setEditTrip} showChecklist
            checklist={editTrip.checklist || []}
            onToggleCheck={(id) => setEditTrip(e => ({ ...e, checklist: e.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c) }))}
            onAddCheck={(text) => setEditTrip(e => ({ ...e, checklist: [...e.checklist, { id: Date.now().toString(), text, done: false }] }))}
            onDeleteCheck={(id) => setEditTrip(e => ({ ...e, checklist: e.checklist.filter(c => c.id !== id) }))}
          />
          <div className="modal-actions">
            <button className="btn" onClick={() => setEditTrip(null)}>Cancel</button>
            <button className="btn primary" onClick={saveEdit}>Save changes</button>
          </div>
        </Modal>
      )}

      {/* ── Stats row ── */}
      <div className="grid-3 mb18">
        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)" }}>
            <Icon name="travel" size={18} color="var(--blue)" />
          </div>
          <div className="stat-label">Upcoming trips</div>
          <div className="stat-value">{upcoming.length}</div>
          <div className="stat-sub">Planned &amp; booked</div>
        </div>

        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}>
            <Icon name="calendar" size={18} color="var(--grn)" />
          </div>
          <div className="stat-label">Next trip</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{upcoming[0]?.name || "None"}</div>
          <div className="stat-sub">{upcoming[0] ? daysUntil(upcoming[0].start) : ""}</div>
        </div>

        <div className="stat">
          <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}>
            <Icon name="finance" size={18} color="var(--amber)" />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <div className="stat-label">Total budget</div>
            <select
              value={budgetFilter}
              onChange={e => setBudgetFilter(e.target.value)}
              style={{ fontSize: 11, background: "transparent", border: "none", color: "var(--t3)", cursor: "pointer", outline: "none" }}
              onClick={e => e.stopPropagation()}
            >
              <option value="all">All trips</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              {trips.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="stat-value">€{totalBudget.toLocaleString()}</div>
          <div className="stat-sub">{budgetLabel}</div>
        </div>
      </div>

      {/* ── Trip list header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>All trips</div>
        <button className="btn sm primary" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={13} /> Add trip
        </button>
      </div>

      {/* ── Trip cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {trips.map(trip => {
          const st = STATUS_STYLE[trip.status] || STATUS_STYLE.planning;
          const doneChecks = trip.checklist.filter(c => c.done).length;
          const isExpanded = !!expanded[trip.id];
          const isCancelled = trip.status === "cancelled";

          return (
            <div key={trip.id}
              style={{
                background: "var(--bg1)",
                border: "1px solid var(--b1)",
                borderRadius: 14,
                overflow: "hidden",
                transition: "all .2s",
              }}>
              {/* Card header row */}
              <div
                onClick={() => setExpanded(ex => ({ ...ex, [trip.id]: !ex[trip.id] }))}
                style={{ padding: 18, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                    <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="travel" size={18} color="var(--blue)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)", marginBottom: 4, textDecoration: isCancelled ? "line-through" : "none", opacity: isCancelled ? 0.6 : 1 }}>
                        {trip.name}
                        {trip.destination ? <span style={{ fontSize: 12, fontWeight: 400, color: "var(--t3)", marginLeft: 8 }}>{trip.destination}</span> : null}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 6 }}>
                        {trip.start} → {trip.end}{trip.travelers ? ` · ${trip.travelers}` : ""}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>
                        <span className="badge muted">€{(trip.budget || 0).toLocaleString()}</span>
                        {trip.checklist.length > 0 && <span className="badge muted">✓ {doneChecks}/{trip.checklist.length}</span>}
                        <span style={{ fontSize: 11, color: "var(--blue)", fontFamily: "var(--mono)" }}>{daysUntil(trip.start)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button className="btn xs" title="Edit trip" onClick={() => setEditTrip({ ...trip, budget: String(trip.budget || "") })}>
                      <Icon name="edit" size={12} />
                    </button>
                    <button className="btn xs danger" title="Delete trip" onClick={() => deleteTrip(trip.id)}>
                      <Icon name="trash" size={11} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded checklist */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--b1)", padding: "14px 18px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".5px" }}>
                    Checklist — {doneChecks}/{trip.checklist.length}
                  </div>
                  {trip.checklist.length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 10 }}>No items yet</div>
                  )}
                  {trip.checklist.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                      <div
                        className={`task-check${c.done ? " done" : ""}`}
                        onClick={() => toggleCheck(trip.id, c.id)}
                        style={{ cursor: "pointer", flexShrink: 0 }}
                      >
                        {c.done && <Icon name="check" size={10} color="#fff" />}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, color: "var(--t2)", textDecoration: c.done ? "line-through" : "none", opacity: c.done ? 0.6 : 1 }}>{c.text}</span>
                      <button className="btn xs" style={{ opacity: 0.5 }} onClick={() => deleteCheckItem(trip.id, c.id)}>
                        <Icon name="x" size={10} />
                      </button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <input
                      className="inp"
                      style={{ flex: 1, fontSize: 13, padding: "6px 10px" }}
                      placeholder="+ add item"
                      value={newItems[trip.id] || ""}
                      onChange={e => setNewItems(n => ({ ...n, [trip.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addCheckItem(trip.id)}
                    />
                    <button className="btn sm" onClick={() => addCheckItem(trip.id)}>Add</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {trips.length === 0 && (
          <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "32px 0" }}>No trips planned yet</div>
        )}
      </div>
    </div>
  );
}

/* ── Shared form used by Add & Edit modals ── */
function TripForm({ data, onChange, showChecklist, checklist = [], onToggleCheck, onAddCheck, onDeleteCheck }) {
  const [newCheckText, setNewCheckText] = useState("");

  const f = (key) => (e) => onChange(d => ({ ...d, [key]: e.target.value }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div className="form-row">
        <label className="form-label">Trip name</label>
        <input className="inp" value={data.name} onChange={f("name")} placeholder="Scotland Road Trip" autoFocus />
      </div>
      <div className="form-row">
        <label className="form-label">Destination</label>
        <input className="inp" value={data.destination || ""} onChange={f("destination")} placeholder="Edinburgh, Scotland" />
      </div>
      <div className="grid-2" style={{ gap: 12 }}>
        <div className="form-row">
          <label className="form-label">Start date</label>
          <input className="inp" type="date" value={data.start} onChange={f("start")} />
        </div>
        <div className="form-row">
          <label className="form-label">End date</label>
          <input className="inp" type="date" value={data.end} onChange={f("end")} />
        </div>
      </div>
      <div className="grid-2" style={{ gap: 12 }}>
        <div className="form-row">
          <label className="form-label">Budget (€)</label>
          <input className="inp" type="number" value={data.budget} onChange={f("budget")} placeholder="2000" />
        </div>
        <div className="form-row">
          <label className="form-label">Travellers</label>
          <input className="inp" value={data.travelers || ""} onChange={f("travelers")} placeholder="Michael, Tamara..." />
        </div>
      </div>
      <div className="form-row">
        <label className="form-label">Status</label>
        <select className="inp" value={data.status || "planning"} onChange={f("status")}>
          <option value="planning">Planning</option>
          <option value="booked">Booked</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="form-row">
        <label className="form-label">Notes</label>
        <textarea className="inp" value={data.notes || ""} onChange={f("notes")} placeholder="Route ideas, accommodation notes..." style={{ minHeight: 70 }} />
      </div>

      {showChecklist && (
        <div className="form-row">
          <label className="form-label">Checklist</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {checklist.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={() => onToggleCheck(c.id)}
                  style={{ width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ flex: 1, fontSize: 13, color: "var(--t2)", textDecoration: c.done ? "line-through" : "none", opacity: c.done ? 0.6 : 1 }}>{c.text}</span>
                <button className="btn xs" style={{ opacity: 0.5 }} onClick={() => onDeleteCheck(c.id)}>
                  <Icon name="x" size={10} />
                </button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <input
                className="inp"
                style={{ flex: 1, fontSize: 13, padding: "6px 10px" }}
                placeholder="+ add item"
                value={newCheckText}
                onChange={e => setNewCheckText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && newCheckText.trim()) { onAddCheck(newCheckText.trim()); setNewCheckText(""); } }}
              />
              <button className="btn sm" onClick={() => { if (newCheckText.trim()) { onAddCheck(newCheckText.trim()); setNewCheckText(""); } }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
