import { useState, useEffect } from "react";
import { sb } from "../lib/supabase";
import { Icon, Modal } from "./shared";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_S  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const HOURS   = Array.from({ length: 15 }, (_, i) => i + 8); // 08–22

const CATS = [
  { id: "personal", label: "Personal", color: "#3b82f6", bg: "rgba(59,130,246,0.22)"  },
  { id: "career",   label: "Career",   color: "#f59e0b", bg: "rgba(245,158,11,0.22)"  },
  { id: "travel",   label: "Travel",   color: "#10b981", bg: "rgba(16,185,129,0.22)"  },
  { id: "study",    label: "Study",    color: "#8b5cf6", bg: "rgba(139,92,246,0.22)"  },
  { id: "family",   label: "Family",   color: "#ec4899", bg: "rgba(236,72,153,0.22)"  },
];

const TIMEZONES = [
  { id: "Europe/Dublin",       label: "Dublin (IST/GMT)" },
  { id: "Europe/London",       label: "London (BST/GMT)" },
  { id: "Europe/Lisbon",       label: "Lisbon (WEST/WET)" },
  { id: "America/New_York",    label: "New York (EST/EDT)" },
  { id: "America/Sao_Paulo",   label: "São Paulo (BRT)" },
];

const REPEATS = [
  { id: "none",    label: "Does not repeat" },
  { id: "daily",   label: "Daily"           },
  { id: "weekly",  label: "Weekly"          },
  { id: "monthly", label: "Monthly"         },
  { id: "yearly",  label: "Yearly"          },
];

const REMINDERS = [
  { id: "none",   label: "No reminder"         },
  { id: "10min",  label: "10 minutes before"   },
  { id: "30min",  label: "30 minutes before"   },
  { id: "1hour",  label: "1 hour before"       },
  { id: "1day",   label: "1 day before"        },
];

const catOf    = (ev) => CATS.find(c => c.id === ev.category) || CATS[0];
const badgeCls = (cat) =>
  cat==="travel" ? "green" : cat==="career" ? "amber" : cat==="study" ? "purple" : cat==="family" ? "pink" : "blue";

const BLANK_FORM = {
  title: "", category: "personal",
  date: "", start_time: "", end_time: "",
  timezone: () => localStorage.getItem("sanctum_timezone") || "Europe/Dublin",
  location: "", notes: "",
  repeat: "none", reminder: "none",
  shared: false,
};

const makeBlank = () => ({
  ...BLANK_FORM,
  timezone: localStorage.getItem("sanctum_timezone") || "Europe/Dublin",
});

const fmtDateStr = (date) =>
  `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

const evTop = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return (h - 8) * 48 + (m / 60) * 48;
};

const evHeight = (start, end) => {
  if (!start || !end) return 48;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(24, (mins / 60) * 48);
};

const getEventsForDate = (events, dateStr) => {
  const results = [];
  for (const ev of events) {
    if (ev.date === dateStr) { results.push(ev); continue; }
    if (!ev.repeat || ev.repeat === "none") continue;
    const base   = new Date(ev.date + "T00:00:00");
    const target = new Date(dateStr + "T00:00:00");
    if (target <= base) continue;
    let matches = false;
    if      (ev.repeat === "daily")   matches = true;
    else if (ev.repeat === "weekly")  matches = base.getDay() === target.getDay();
    else if (ev.repeat === "monthly") matches = base.getDate() === target.getDate();
    else if (ev.repeat === "yearly")  matches = base.getMonth() === target.getMonth() && base.getDate() === target.getDate();
    if (matches) results.push({ ...ev, date: dateStr, _virtual: true, id: `${ev.id}_v_${dateStr}` });
  }
  return results;
};

export default function Calendar({ initialDate }) {
  const now = new Date();
  const [year,         setYear]        = useState(initialDate ? initialDate.getFullYear() : now.getFullYear());
  const [month,        setMonth]       = useState(initialDate ? initialDate.getMonth()    : now.getMonth());
  const [events,       setEvents]      = useState([]);
  const [showAdd,      setShowAdd]     = useState(false);
  const [editingEvent, setEditingEvent]= useState(null);
  const [formData,     setFormData]    = useState(makeBlank);
  const [viewMode,     setViewMode]    = useState("month");
  const [activeEvent,  setActiveEvent] = useState(null);
  const [weekOffset,   setWeekOffset]  = useState(0);

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const data = await sb.from("events").select("*");
      if (Array.isArray(data) && data.length) setEvents(data);
      else throw new Error();
    } catch {
      setEvents([
        { id: "e1", title: "PMP Application due", date: "2026-04-15", category: "study",    color: "#8b5cf6", repeat: "none", shared: false },
        { id: "e2", title: "Italy trip begins",    date: "2026-06-12", category: "travel",   color: "#10b981", repeat: "none", shared: false },
        { id: "e3", title: "Scotland trip",        date: "2026-09-07", category: "travel",   color: "#10b981", repeat: "none", shared: false },
        { id: "e4", title: "MSc starts — SETU",   date: "2026-09-14", category: "study",    color: "#8b5cf6", repeat: "none", shared: false },
        { id: "e5", title: "Metallica Dublin",     date: "2026-06-20", category: "personal", color: "#3b82f6", repeat: "none", shared: false },
      ]);
    }
  };

  const openAdd = (dateStr, presetTime = "") => {
    setEditingEvent(null);
    setFormData({ ...makeBlank(), date: dateStr, start_time: presetTime });
    setShowAdd(true);
  };

  const openEdit = (ev) => {
    setActiveEvent(null);
    setEditingEvent(ev);
    setFormData({
      title:      ev.title      || "",
      category:   ev.category   || "personal",
      date:       ev.date       || "",
      start_time: ev.start_time || ev.time || "",
      end_time:   ev.end_time   || "",
      timezone:   ev.timezone   || localStorage.getItem("sanctum_timezone") || "Europe/Dublin",
      location:   ev.location   || "",
      notes:      ev.notes      || "",
      repeat:     ev.repeat     || "none",
      reminder:   ev.reminder   || "none",
      shared:     ev.shared     || false,
    });
    setShowAdd(true);
  };

  const closeModal = () => { setShowAdd(false); setEditingEvent(null); };

  const saveEvent = async () => {
    if (!formData.title.trim() || !formData.date) return;
    const cat = catOf({ category: formData.category });
    const payload = {
      title:      formData.title.trim(),
      date:       formData.date,
      category:   formData.category,
      color:      cat.color,
      start_time: formData.start_time || null,
      end_time:   formData.end_time   || null,
      timezone:   formData.timezone,
      location:   formData.location   || null,
      notes:      formData.notes      || null,
      repeat:     formData.repeat,
      reminder:   formData.reminder,
      shared:     formData.shared,
      shared_with: formData.shared ? ["Tamara"] : [],
    };
    if (editingEvent) {
      try { await sb.from("events").update(payload, { id: editingEvent.id }); } catch {}
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...payload, id: editingEvent.id } : e));
    } else {
      try {
        const res     = await sb.from("events").insert(payload);
        const created = Array.isArray(res) && res[0] ? res[0] : { ...payload, id: Date.now().toString() };
        setEvents(prev => [...prev, created]);
      } catch {
        setEvents(prev => [...prev, { ...payload, id: Date.now().toString() }]);
      }
    }
    closeModal();
  };

  const deleteEvent = async (id) => {
    const realId = id.includes("_v_") ? id.split("_v_")[0] : id;
    setEvents(prev => prev.filter(e => e.id !== realId));
    setActiveEvent(null);
    try { await sb.from("events").delete({ id: realId }); } catch {}
  };

  const setF = (k, v) => setFormData(f => ({ ...f, [k]: v }));

  // ── Monthly grid ──
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrev  = new Date(year, month,   0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, current: false });
  for (let i = 1; i <= daysInMonth; i++)      cells.push({ day: i, current: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - startOffset + 1, current: false });

  const fmtDs       = (d) => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const eventsOnDay = (cell) => cell.current ? getEventsForDate(events, fmtDs(cell.day)) : [];
  const isTodayCell = (cell) => cell.current && year === now.getFullYear() && month === now.getMonth() && cell.day === now.getDate();

  const prev = () => month === 0  ? (setMonth(11), setYear(y => y-1)) : setMonth(m => m-1);
  const next = () => month === 11 ? (setMonth(0),  setYear(y => y+1)) : setMonth(m => m+1);

  // ── Week view ──
  const weekStart = (() => {
    const d = new Date(now);
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - dow + weekOffset * 7);
    d.setHours(0,0,0,0);
    return d;
  })();
  const weekDays    = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; });
  const isWToday    = (date) => date.toDateString() === now.toDateString();
  const evOnDay     = (date) => getEventsForDate(events, fmtDateStr(date)).sort((a,b) => (a.start_time||"").localeCompare(b.start_time||""));

  const monthEvents = (() => {
    const seen = new Set();
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      for (const ev of getEventsForDate(events, fmtDs(d))) {
        if (!seen.has(ev.id)) { seen.add(ev.id); result.push(ev); }
      }
    }
    return result.sort((a, b) => a.date.localeCompare(b.date));
  })();

  // ── Render ──
  return (
    <div className="page-body page-enter">

      {/* Add / Edit modal */}
      {showAdd && (
        <Modal title={editingEvent ? "Edit event" : "Add event"} onClose={closeModal} wide>
          {/* Title */}
          <div className="form-row">
            <input className="inp" value={formData.title}
              onChange={e => setF("title", e.target.value)}
              placeholder="Event title" autoFocus style={{ fontSize: 16, fontWeight: 600 }}
              onKeyDown={e => e.key === "Enter" && saveEvent()} />
          </div>

          {/* Date | Start | End */}
          <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label className="form-label">Date</label>
              <input className="inp" type="date" value={formData.date} onChange={e => setF("date", e.target.value)} />
            </div>
            <div>
              <label className="form-label">Start time</label>
              <input className="inp" type="time" value={formData.start_time} onChange={e => setF("start_time", e.target.value)} />
            </div>
            <div>
              <label className="form-label">End time</label>
              <input className="inp" type="time" value={formData.end_time} onChange={e => setF("end_time", e.target.value)} />
            </div>
          </div>

          {/* Category | Timezone */}
          <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="form-label">Category</label>
              <select className="inp" value={formData.category} onChange={e => setF("category", e.target.value)}>
                {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Timezone</label>
              <select className="inp" value={formData.timezone} onChange={e => setF("timezone", e.target.value)}>
                {TIMEZONES.map(tz => <option key={tz.id} value={tz.id}>{tz.label}</option>)}
              </select>
            </div>
          </div>

          {/* Location */}
          <div className="form-row">
            <label className="form-label">Location</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, pointerEvents: "none" }}>📍</span>
              <input className="inp" value={formData.location}
                onChange={e => setF("location", e.target.value)}
                placeholder="Add location or address" style={{ paddingLeft: 30 }} />
            </div>
          </div>

          {/* Repeat | Reminder */}
          <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="form-label">Repeat</label>
              <select className="inp" value={formData.repeat} onChange={e => setF("repeat", e.target.value)}>
                {REPEATS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Reminder</label>
              <select className="inp" value={formData.reminder} onChange={e => setF("reminder", e.target.value)}>
                {REMINDERS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="form-row">
            <label className="form-label">Notes</label>
            <textarea className="inp" value={formData.notes}
              onChange={e => setF("notes", e.target.value)}
              placeholder="Add details..." style={{ minHeight: 72, resize: "vertical" }} />
          </div>

          {/* Share toggle */}
          <div className="form-row">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px", border: "1px solid var(--b1)" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>Share with Tamara</div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                  Visible to: {formData.shared ? "Tamara too" : "Just me"}
                </div>
              </div>
              <button onClick={() => setF("shared", !formData.shared)}
                style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", transition: "background .2s", background: formData.shared ? "var(--blue)" : "rgba(255,255,255,0.12)", position: "relative", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: formData.shared ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn" onClick={closeModal}>Cancel</button>
            <button className="btn primary" onClick={saveEvent}>
              {editingEvent ? "Save changes" : "Add event"}
            </button>
          </div>
        </Modal>
      )}

      {/* Event detail modal */}
      {activeEvent && (() => {
        const cat      = catOf(activeEvent);
        const repLabel = REPEATS.find(r => r.id   === (activeEvent.repeat   || "none"))?.label || "";
        const remLabel = REMINDERS.find(r => r.id === (activeEvent.reminder || "none"))?.label || "";
        const startT   = activeEvent.start_time || activeEvent.time || "";
        return (
          <Modal title={activeEvent.title} onClose={() => setActiveEvent(null)}>
            <div style={{ height: 3, borderRadius: 2, background: cat.color, marginBottom: 18, opacity: .8 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <span className={`badge ${badgeCls(activeEvent.category)}`}>{activeEvent.category}</span>
              {activeEvent.repeat && activeEvent.repeat !== "none" && (
                <span className="badge blue">↻ {repLabel}</span>
              )}
              {activeEvent.shared && <span className="badge pink">Shared</span>}
            </div>
            <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <Icon name="calendar" size={13} color="var(--t3)" />
                <span style={{ fontFamily: "var(--mono)" }}>{activeEvent.date}</span>
                {startT && (
                  <span style={{ fontFamily: "var(--mono)", color: "var(--t3)" }}>
                    {startT}{activeEvent.end_time ? ` → ${activeEvent.end_time}` : ""}
                  </span>
                )}
              </div>
              {activeEvent.location && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span>📍</span>
                  <span>{activeEvent.location}</span>
                </div>
              )}
              {remLabel && activeEvent.reminder !== "none" && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <Icon name="clock" size={13} color="var(--t3)" />
                  <span style={{ color: "var(--t3)" }}>{remLabel}</span>
                </div>
              )}
            </div>
            {activeEvent.notes && (
              <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.65, marginBottom: 18, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                {activeEvent.notes}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn" onClick={() => setActiveEvent(null)}>Close</button>
              {!activeEvent._virtual && (
                <button className="btn" onClick={() => openEdit(activeEvent)}>
                  <Icon name="edit" size={13} /> Edit
                </button>
              )}
              <button className="btn danger" onClick={() => deleteEvent(activeEvent.id)}>
                <Icon name="trash" size={13} /> Delete
              </button>
            </div>
          </Modal>
        );
      })()}

      {/* Header */}
      <div className="cal-header">
        <div className="cal-month-nav">
          {viewMode === "month" ? (
            <>
              <button className="btn sm" onClick={prev}><Icon name="chevL" size={14} /></button>
              <div className="cal-month-title">{MONTHS[month]} {year}</div>
              <button className="btn sm" onClick={next}><Icon name="chevR" size={14} /></button>
            </>
          ) : (
            <>
              <button className="btn sm" onClick={() => setWeekOffset(w => w-1)}><Icon name="chevL" size={14} /></button>
              <div className="cal-month-title" style={{ minWidth: 280 }}>
                {weekDays[0].toLocaleDateString("en-IE",{day:"numeric",month:"short"})} – {weekDays[6].toLocaleDateString("en-IE",{day:"numeric",month:"short",year:"numeric"})}
              </div>
              <button className="btn sm" onClick={() => setWeekOffset(w => w+1)}><Icon name="chevR" size={14} /></button>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn sm" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setWeekOffset(0); }}>Today</button>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: 2, gap: 2 }}>
            <button className={`btn xs${viewMode==="month"?" primary":""}`} style={{ borderRadius: 7 }} onClick={() => setViewMode("month")}>Month</button>
            <button className={`btn xs${viewMode==="week" ?" primary":""}`} style={{ borderRadius: 7 }} onClick={() => setViewMode("week")}>Week</button>
          </div>
        </div>
      </div>

      {/* Category legend */}
      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        {CATS.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--t3)", fontWeight: 500 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />{c.label}
          </div>
        ))}
      </div>

      {/* ── Month view ── */}
      {viewMode === "month" && (
        <div className="card mb18">
          <div className="cal-grid-header">
            {DAYS_S.map(d => <div key={d} className="cal-day-header">{d}</div>)}
          </div>
          <div className="cal-grid">
            {cells.map((cell, i) => {
              const dayEvs = eventsOnDay(cell);
              return (
                <div key={i}
                  className={`cal-cell${!cell.current?" other-month":""}${isTodayCell(cell)?" today":""}`}
                  onClick={() => { if (cell.current) openAdd(fmtDs(cell.day)); }}>
                  <div className="cal-day-num">{cell.day}</div>
                  <div className="cal-events">
                    {dayEvs.slice(0,3).map(ev => {
                      const c = catOf(ev);
                      const startT = ev.start_time || ev.time || "";
                      return (
                        <div key={ev.id} className="event-chip"
                          style={{ background: c.bg, color: c.color }}
                          onClick={e => { e.stopPropagation(); setActiveEvent(ev); }}>
                          {startT && <span className="event-time">{startT}</span>}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>{ev.title}</span>
                          {ev.repeat && ev.repeat !== "none" && <span style={{ fontSize: 9, opacity: .65, flexShrink: 0 }}>↻</span>}
                          {ev.shared && <span className="event-badge-s">S</span>}
                        </div>
                      );
                    })}
                    {dayEvs.length > 3 && <div className="cal-event-more">+{dayEvs.length-3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Week view — time grid ── */}
      {viewMode === "week" && (
        <div className="card mb18" style={{ padding: 0, overflow: "hidden" }}>
          {/* Day headers */}
          <div className="week-time-grid-header">
            <div className="time-col-spacer" />
            {weekDays.map((d, i) => (
              <div key={i} className={`week-time-grid-day-head${isWToday(d)?" today":""}`}>
                <div className="week-col-day">{DAYS_S[i]}</div>
                <div className="week-col-num">{d.getDate()}</div>
              </div>
            ))}
          </div>

          {/* All-day events row */}
          <div className="week-allday-row">
            <div className="week-allday-label">all day</div>
            {weekDays.map((d, i) => {
              const alldayEvs = evOnDay(d).filter(ev => !ev.start_time && !ev.time);
              return (
                <div key={i} className="week-allday-col">
                  {alldayEvs.map(ev => {
                    const c = catOf(ev);
                    return (
                      <div key={ev.id} className="event-chip"
                        style={{ background: c.bg, color: c.color, width: "100%", maxWidth: "100%" }}
                        onClick={() => setActiveEvent(ev)}>
                        {ev.shared && <span className="event-badge-s">S</span>}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>{ev.title}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Scrollable time grid */}
          <div className="week-time-grid-scroll">
            <div className="week-time-grid-body">
              {/* Hour labels */}
              <div className="week-time-col">
                {HOURS.map(h => (
                  <div key={h} className="week-hour-label">
                    {String(h).padStart(2,"0")}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((d, i) => {
                const timedEvs = evOnDay(d).filter(ev => ev.start_time || ev.time);
                return (
                  <div key={i} className={`week-time-day-col${isWToday(d)?" today":""}`}>
                    {HOURS.map(h => (
                      <div key={h} className="time-slot"
                        onClick={() => openAdd(fmtDateStr(d), `${String(h).padStart(2,"0")}:00`)} />
                    ))}
                    {timedEvs.map(ev => {
                      const c   = catOf(ev);
                      const st  = ev.start_time || ev.time || "";
                      const top = evTop(st);
                      if (top >= HOURS.length * 48 || top < -48) return null;
                      const clampedTop = Math.max(0, top);
                      const height = evHeight(st, ev.end_time);
                      return (
                        <div key={ev.id} className="week-grid-event"
                          style={{ top: clampedTop, height, background: c.bg, color: c.color, border: `1px solid ${c.color}50` }}
                          onClick={() => setActiveEvent(ev)}>
                          <div style={{ fontSize: 9, opacity: .75, fontFamily: "var(--mono)", whiteSpace: "nowrap" }}>
                            {st}{ev.end_time ? ` – ${ev.end_time}` : ""}
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Month events list */}
      {viewMode === "month" && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Events — {MONTHS[month]} {year}</div>
              <div className="card-sub">{monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""} this month</div>
            </div>
            <button className="btn sm primary"
              onClick={() => openAdd(fmtDs(now.getMonth()===month && now.getFullYear()===year ? now.getDate() : 1))}>
              <Icon name="plus" size={12} /> Add
            </button>
          </div>
          {monthEvents.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
              No events this month — click any day to add one
            </div>
          ) : (
            monthEvents.map(ev => {
              const c      = catOf(ev);
              const startT = ev.start_time || ev.time || "";
              return (
                <div key={ev.id} className="fin-row"
                  style={{ cursor: "pointer", borderLeft: `3px solid ${c.color}`, paddingLeft: 14, marginLeft: -1 }}
                  onClick={() => setActiveEvent(ev)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)", marginTop: 2 }}>
                        {ev.date}{startT ? ` · ${startT}` : ""}
                        {ev.location ? ` · 📍 ${ev.location}` : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    {ev.repeat && ev.repeat !== "none" && <span style={{ fontSize: 12, color: "var(--t3)" }}>↻</span>}
                    {ev.shared && <span className="event-badge-s">S</span>}
                    <span className={`badge ${badgeCls(ev.category)}`}>{ev.category}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
