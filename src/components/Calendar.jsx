import { useState, useEffect, useRef } from "react";
import { sb } from "../lib/supabase";
import { Icon, Modal, EVENT_COLORS } from "./shared";

export default function Calendar({ initialDate }) {
  const now = new Date();
  const [year,       setYear]       = useState(initialDate ? initialDate.getFullYear() : now.getFullYear());
  const [month,      setMonth]      = useState(initialDate ? initialDate.getMonth()    : now.getMonth());
  const [events,     setEvents]     = useState([]);
  const [showAdd,    setShowAdd]    = useState(false);
  const [selectedDay,setSelectedDay]= useState(initialDate ? initialDate.getDate() : null);
  const [newEvent,   setNewEvent]   = useState({ title: "", category: "personal", time: "", notes: "" });
  const [viewMode,   setViewMode]   = useState("month");
  const [activeEvent,setActiveEvent]= useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS_S  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const CATS = [
    { id: "personal", label: "Personal", color: "#3b82f6", bg: "rgba(59,130,246,0.22)"  },
    { id: "career",   label: "Career",   color: "#f59e0b", bg: "rgba(245,158,11,0.22)"  },
    { id: "travel",   label: "Travel",   color: "#10b981", bg: "rgba(16,185,129,0.22)"  },
    { id: "study",    label: "Study",    color: "#8b5cf6", bg: "rgba(139,92,246,0.22)"  },
    { id: "family",   label: "Family",   color: "#ec4899", bg: "rgba(236,72,153,0.22)"  },
  ];
  const catOf = (ev) => CATS.find(c => c.id === ev.category) || CATS[0];

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const data = await sb.from("events").select("*");
      if (Array.isArray(data) && data.length) setEvents(data);
      else throw new Error();
    } catch {
      setEvents([
        { id: "e1", title: "PMP Application due",  date: "2026-04-15", category: "study",    color: "#8b5cf6" },
        { id: "e2", title: "Italy trip begins",     date: "2026-06-12", category: "travel",   color: "#10b981" },
        { id: "e3", title: "Scotland trip",         date: "2026-09-07", category: "travel",   color: "#10b981" },
        { id: "e4", title: "MSc starts — SETU",    date: "2026-09-14", category: "study",    color: "#8b5cf6" },
        { id: "e5", title: "Metallica Dublin",      date: "2026-06-20", category: "personal", color: "#3b82f6" },
      ]);
    }
  };

  const addEvent = async () => {
    if (!newEvent.title.trim() || !selectedDay) return;
    const ds  = `${year}-${String(month+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`;
    const cat = catOf({ category: newEvent.category });
    const ev  = { title: newEvent.title, date: ds, category: newEvent.category, color: cat.color, time: newEvent.time, notes: newEvent.notes };
    try {
      const res     = await sb.from("events").insert(ev);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...ev, id: Date.now().toString() };
      setEvents(prev => [...prev, created]);
    } catch { setEvents(prev => [...prev, { ...ev, id: Date.now().toString() }]); }
    setNewEvent({ title: "", category: "personal", time: "", notes: "" });
    setShowAdd(false);
  };

  const deleteEvent = async (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setActiveEvent(null);
    try { await sb.from("events").delete({ id }); } catch {}
  };

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
  const eventsOnDay = (day) => day.current ? events.filter(e => e.date === fmtDs(day.day)) : [];
  const isTodayCell = (day) => day.current && year === now.getFullYear() && month === now.getMonth() && day.day === now.getDate();

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
  const weekDays      = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; });
  const evOnWeekDay   = (date) => {
    const ds = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    return events.filter(e => e.date === ds).sort((a,b) => (a.time||"").localeCompare(b.time||""));
  };
  const isWToday      = (date) => date.toDateString() === now.toDateString();

  const monthEvents = events
    .filter(e => { const [ey,em] = e.date.split("-").map(Number); return ey===year && em===month+1; })
    .sort((a,b) => a.date.localeCompare(b.date));

  const badgeCls = (cat) =>
    cat==="travel" ? "green" : cat==="career" ? "amber" : cat==="study" ? "purple" : cat==="family" ? "pink" : "blue";

  return (
    <div className="page-body page-enter">

      {/* Add event modal */}
      {showAdd && (
        <Modal title={`Add event — ${selectedDay} ${MONTHS[month]} ${year}`} onClose={() => setShowAdd(false)} wide>
          <div className="form-row">
            <label className="form-label">Title</label>
            <input className="inp" value={newEvent.title}
              onChange={e => setNewEvent(n => ({ ...n, title: e.target.value }))}
              placeholder="Event title" autoFocus onKeyDown={e => e.key === "Enter" && addEvent()} />
          </div>
          <div className="form-row">
            <label className="form-label">Category</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CATS.map(c => (
                <button key={c.id}
                  onClick={() => setNewEvent(n => ({ ...n, category: c.id }))}
                  style={{
                    padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: newEvent.category === c.id ? c.bg : "transparent",
                    border: `1px solid ${newEvent.category === c.id ? c.color : "rgba(255,255,255,0.1)"}`,
                    color: newEvent.category === c.id ? c.color : "var(--t3)",
                    cursor: "pointer", transition: "all .15s",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">Time (optional)</label>
            <input className="inp" type="time" value={newEvent.time} onChange={e => setNewEvent(n => ({ ...n, time: e.target.value }))} />
          </div>
          <div className="form-row">
            <label className="form-label">Notes (optional)</label>
            <textarea className="inp" value={newEvent.notes}
              onChange={e => setNewEvent(n => ({ ...n, notes: e.target.value }))}
              placeholder="Add details..." style={{ minHeight: 60 }} />
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn primary" onClick={addEvent}>Add event</button>
          </div>
        </Modal>
      )}

      {/* Event detail modal */}
      {activeEvent && (() => {
        const cat = catOf(activeEvent);
        return (
          <Modal title={activeEvent.title} onClose={() => setActiveEvent(null)}>
            {/* Category colour bar */}
            <div style={{ height: 3, borderRadius: 2, background: cat.color, marginBottom: 20, opacity: .8 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
              <span className={`badge ${badgeCls(activeEvent.category)}`}>{activeEvent.category}</span>
              <span style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)" }}>
                <Icon name="calendar" size={11} color="var(--t3)" style={{ marginRight: 4 }} />
                {activeEvent.date}{activeEvent.time ? ` · ${activeEvent.time}` : ""}
              </span>
            </div>
            {activeEvent.notes && (
              <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.65, marginBottom: 18, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                {activeEvent.notes}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn" onClick={() => setActiveEvent(null)}>Close</button>
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

      {/* Legend */}
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
                  onClick={() => { if (cell.current) { setSelectedDay(cell.day); setShowAdd(true); } }}>
                  <div className="cal-day-num">{cell.day}</div>
                  <div className="cal-events">
                    {dayEvs.slice(0,3).map(ev => {
                      const c = catOf(ev);
                      return (
                        <div key={ev.id} className="cal-event"
                          style={{ background: c.bg, color: c.color }}
                          onClick={e => { e.stopPropagation(); setActiveEvent(ev); }}>
                          {ev.time ? `${ev.time} ` : ""}{ev.title}
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

      {/* ── Week view ── */}
      {viewMode === "week" && (
        <div className="card mb18" style={{ padding: 14 }}>
          <div className="week-view">
            {weekDays.map((date, i) => {
              const dayEvs = evOnWeekDay(date);
              return (
                <div key={i} className={`week-col${isWToday(date)?" today":""}`}>
                  <div className="week-col-header">
                    <div className="week-col-day">{DAYS_S[i]}</div>
                    <div className="week-col-num">{date.getDate()}</div>
                  </div>
                  <div className="week-col-events">
                    {dayEvs.map(ev => {
                      const c = catOf(ev);
                      return (
                        <div key={ev.id} className="week-event" style={{ background: c.bg, color: c.color }}
                          onClick={() => setActiveEvent(ev)}>
                          {ev.time && <div style={{ fontSize: 8, opacity: .75, marginBottom: 1 }}>{ev.time}</div>}
                          {ev.title}
                        </div>
                      );
                    })}
                    <div className="week-add-btn" onClick={() => {
                      setYear(date.getFullYear()); setMonth(date.getMonth());
                      setSelectedDay(date.getDate()); setShowAdd(true);
                    }}><Icon name="plus" size={14} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Events list for current month */}
      {viewMode === "month" && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Events — {MONTHS[month]} {year}</div>
              <div className="card-sub">{monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""} this month</div>
            </div>
            <button className="btn sm primary" onClick={() => { setSelectedDay(now.getMonth()===month&&now.getFullYear()===year?now.getDate():1); setShowAdd(true); }}>
              <Icon name="plus" size={12} /> Add
            </button>
          </div>
          {monthEvents.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
              No events this month — click any day to add one
            </div>
          ) : (
            monthEvents.map(ev => {
              const c = catOf(ev);
              return (
                <div key={ev.id} className="fin-row" style={{ cursor: "pointer", borderLeft: `3px solid ${c.color}`, paddingLeft: 14, marginLeft: -1 }} onClick={() => setActiveEvent(ev)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)", marginTop: 2 }}>{ev.date}{ev.time ? ` · ${ev.time}` : ""}</div>
                    </div>
                  </div>
                  <span className={`badge ${badgeCls(ev.category)}`}>{ev.category}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

