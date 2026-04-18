import { useState, useEffect, useCallback, useRef } from "react";
import { sb } from "../lib/supabase";
import { Icon, Modal } from "./shared";

const MONTHS       = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_S       = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const HOURS        = Array.from({ length: 15 }, (_, i) => i + 8); // 08–22

const VIEWS = [
  { id: "month", label: "Month", key: "1" },
  { id: "week",  label: "Week",  key: "2" },
  { id: "3day",  label: "3 Days",key: "3" },
  { id: "year",  label: "Year",  key: "4" },
];

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
  { id: "none",    label: "Does not repeat"          },
  { id: "daily",   label: "Daily"                    },
  { id: "weekday", label: "Every weekday (Mon–Fri)"  },
  { id: "weekly",  label: "Weekly"                   },
  { id: "monthly", label: "Monthly"                  },
  { id: "yearly",  label: "Yearly"                   },
  { id: "custom",  label: "Custom"                   },
];

const REMINDERS = [
  { id: "none",   label: "No reminder"         },
  { id: "10min",  label: "10 minutes before"   },
  { id: "30min",  label: "30 minutes before"   },
  { id: "1hour",  label: "1 hour before"       },
  { id: "1day",   label: "1 day before"        },
];

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const label = h === 0 ? `12:${mm} AM`
      : h < 12  ? `${h}:${mm} AM`
      : h === 12 ? `12:${mm} PM`
      : `${h - 12}:${mm} PM`;
    TIME_OPTIONS.push({ value: `${hh}:${mm}`, label });
  }
}

const TIME_PRESETS = [
  { label: "Morning",   time: "09:00" },
  { label: "Lunch",     time: "12:00" },
  { label: "Afternoon", time: "14:00" },
  { label: "Evening",   time: "18:00" },
  { label: "Night",     time: "20:00" },
];

const addOneHour = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const getRepeatOptions = (dateStr) => {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : null;
  const dayName  = d ? d.toLocaleDateString("en-IE", { weekday: "long" }) : "day";
  const dateNum  = d ? d.getDate() : "date";
  const monthDay = d ? d.toLocaleDateString("en-IE", { month: "long", day: "numeric" }) : "date";
  return [
    { id: "none",    label: "Does not repeat"                },
    { id: "daily",   label: "Daily"                         },
    { id: "weekday", label: "Every weekday (Mon–Fri)"       },
    { id: "weekly",  label: `Weekly on ${dayName}`          },
    { id: "monthly", label: `Monthly on the ${dateNum}`     },
    { id: "yearly",  label: `Yearly on ${monthDay}`         },
    { id: "custom",  label: "Custom…"                       },
  ];
};

const buildRepeatSummary = (fd) => {
  if (!fd.repeat || fd.repeat === "none") return "";
  const d = fd.date ? new Date(fd.date + "T00:00:00") : null;
  let base = "";
  if (fd.repeat === "daily")   base = "Repeats daily";
  else if (fd.repeat === "weekday") base = "Repeats every weekday (Mon–Fri)";
  else if (fd.repeat === "weekly")  base = `Repeats weekly on ${d ? d.toLocaleDateString("en-IE",{weekday:"long"}) : "..."}`;
  else if (fd.repeat === "monthly") base = `Repeats monthly on the ${d ? d.getDate() : "..."}`;
  else if (fd.repeat === "yearly")  base = `Repeats yearly on ${d ? d.toLocaleDateString("en-IE",{month:"long",day:"numeric"}) : "..."}`;
  else if (fd.repeat === "custom") {
    const u = fd.repeatCustomUnit || "week";
    const n = fd.repeatCustomInterval || 2;
    base = `Repeats every ${n} ${u}${n > 1 ? "s" : ""}`;
  }
  if (fd.repeatEnd === "until" && fd.repeatEndDate)       base += `, until ${fd.repeatEndDate}`;
  else if (fd.repeatEnd === "count" && fd.repeatEndCount) base += `, ${fd.repeatEndCount} time${fd.repeatEndCount != 1 ? "s" : ""}`;
  return base;
};

const catOf    = (ev) => CATS.find(c => c.id === ev.category) || CATS[0];
const badgeCls = (cat) =>
  cat==="travel" ? "green" : cat==="career" ? "amber" : cat==="study" ? "purple" : cat==="family" ? "pink" : "blue";

const BLANK_FORM = {
  title: "", category: "personal",
  date: "", start_time: "", end_time: "",
  timezone: () => localStorage.getItem("sanctum_timezone") || "Europe/Dublin",
  location: "", notes: "",
  repeat: "none", reminder: "none",
  repeatEnd: "forever", repeatEndDate: "", repeatEndCount: 10,
  repeatCustomInterval: 2, repeatCustomUnit: "week",
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

    if (ev.repeatEnd === "until" && ev.repeatEndDate) {
      if (target > new Date(ev.repeatEndDate + "T00:00:00")) continue;
    }

    let matches = false;
    if      (ev.repeat === "daily")   matches = true;
    else if (ev.repeat === "weekday") { const d = target.getDay(); matches = d >= 1 && d <= 5; }
    else if (ev.repeat === "weekly")  matches = base.getDay() === target.getDay();
    else if (ev.repeat === "monthly") matches = base.getDate() === target.getDate();
    else if (ev.repeat === "yearly")  matches = base.getMonth() === target.getMonth() && base.getDate() === target.getDate();
    else if (ev.repeat === "custom") {
      const interval = ev.repeatCustomInterval || 2;
      const unit     = ev.repeatCustomUnit     || "week";
      const diffDays = Math.round((target - base) / 86400000);
      if      (unit === "day")   matches = diffDays % interval === 0;
      else if (unit === "week")  matches = diffDays % (interval * 7) === 0;
      else if (unit === "month") {
        const md = (target.getFullYear() - base.getFullYear()) * 12 + (target.getMonth() - base.getMonth());
        matches = md % interval === 0 && target.getDate() === base.getDate();
      }
      else if (unit === "year") {
        const yd = target.getFullYear() - base.getFullYear();
        matches = yd % interval === 0 && target.getMonth() === base.getMonth() && target.getDate() === base.getDate();
      }
    }
    if (matches) results.push({ ...ev, date: dateStr, _virtual: true, id: `${ev.id}_v_${dateStr}` });
  }
  return results;
};

export default function Calendar({ initialDate, refreshKey }) {
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(initialDate || now);
  const scrollRef = useRef(null);
  const [calView,     setCalView]     = useState(() => localStorage.getItem("sanctum_cal_view") || "month");
  const [events,      setEvents]      = useState([]);
  const [showAdd,     setShowAdd]     = useState(false);
  const [editingEvent,setEditingEvent]= useState(null);
  const [formData,    setFormData]    = useState(makeBlank);
  const [activeEvent, setActiveEvent] = useState(null);

  // Derived
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => { loadEvents(); }, [refreshKey]);

  useEffect(() => {
    if (calView === "week" || calView === "3day") {
      const h = new Date().getHours();
      const top = Math.max(0, (h - 8) * 48 - 100);
      scrollRef.current?.scrollTo({ top, behavior: "smooth" });
    }
  }, [calView]);

  const loadEvents = async () => {
    try {
      const data = await sb.from("events").select("*");
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    }
  };

  const changeView = (v) => {
    localStorage.setItem("sanctum_cal_view", v);
    setCalView(v);
  };

  const goToPrev = useCallback(() => {
    setCurrentDate(d => {
      const nd = new Date(d);
      if (calView === "month") nd.setMonth(nd.getMonth() - 1);
      else if (calView === "week") nd.setDate(nd.getDate() - 7);
      else if (calView === "3day") nd.setDate(nd.getDate() - 3);
      else if (calView === "year") nd.setFullYear(nd.getFullYear() - 1);
      return nd;
    });
  }, [calView]);

  const goToNext = useCallback(() => {
    setCurrentDate(d => {
      const nd = new Date(d);
      if (calView === "month") nd.setMonth(nd.getMonth() + 1);
      else if (calView === "week") nd.setDate(nd.getDate() + 7);
      else if (calView === "3day") nd.setDate(nd.getDate() + 3);
      else if (calView === "year") nd.setFullYear(nd.getFullYear() + 1);
      return nd;
    });
  }, [calView]);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.contentEditable === "true") return;
      if (e.key === "1") changeView("month");
      else if (e.key === "2") changeView("week");
      else if (e.key === "3") changeView("3day");
      else if (e.key === "4") changeView("year");
      else if (e.key === "ArrowLeft")              goToPrev();
      else if (e.key === "ArrowRight")             goToNext();
      else if (e.key === "t" || e.key === "T")     goToToday();
      else if (e.key === "n" || e.key === "N")     setShowAdd(true);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goToPrev, goToNext, goToToday]);

  const openAdd = (dateStr, presetTime = "") => {
    setEditingEvent(null);
    setFormData({ ...makeBlank(), date: dateStr, start_time: presetTime, end_time: presetTime ? addOneHour(presetTime) : "" });
    setShowAdd(true);
  };

  const openEdit = (ev) => {
    setActiveEvent(null);
    setEditingEvent(ev);
    setFormData({
      title:               ev.title               || "",
      category:            ev.category            || "personal",
      date:                ev.date                || "",
      start_time:          ev.start_time          || ev.time || "",
      end_time:            ev.end_time            || "",
      timezone:            ev.timezone            || localStorage.getItem("sanctum_timezone") || "Europe/Dublin",
      location:            ev.location            || "",
      notes:               ev.notes               || "",
      repeat:              ev.repeat              || "none",
      reminder:            ev.reminder            || "none",
      repeatEnd:           ev.repeatEnd           || "forever",
      repeatEndDate:       ev.repeatEndDate       || "",
      repeatEndCount:      ev.repeatEndCount      || 10,
      repeatCustomInterval: ev.repeatCustomInterval || 2,
      repeatCustomUnit:    ev.repeatCustomUnit    || "week",
      shared:              ev.shared              || false,
    });
    setShowAdd(true);
  };

  const closeModal = () => { setShowAdd(false); setEditingEvent(null); };

  const saveEvent = async () => {
    if (!formData.title.trim() || !formData.date) return;
    const cat = catOf({ category: formData.category });
    const payload = {
      title:     formData.title.trim(),
      date:      formData.date,
      category:  formData.category,
      color:     cat.color,
      start_time: formData.start_time || null,
      end_time:  formData.end_time   || null,
      timezone:  formData.timezone   || "Europe/Dublin",
      location:  formData.location   || null,
      notes:     formData.notes      || null,
      repeat:    formData.repeat     || "none",
      reminder:  formData.reminder   || "none",
      shared:    formData.shared     || false,
      all_day:   false,
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
      await loadEvents();
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

  const setStartTime = (val) => {
    setFormData(f => ({ ...f, start_time: val, end_time: val ? addOneHour(val) : f.end_time }));
  };

  const applyTimePreset = (t) => {
    setFormData(f => ({ ...f, start_time: t, end_time: addOneHour(t) }));
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
  const eventsOnDay = (cell) => cell.current ? getEventsForDate(events, fmtDs(cell.day)) : [];
  const isTodayCell = (cell) => cell.current && year === now.getFullYear() && month === now.getMonth() && cell.day === now.getDate();

  // ── Week view ──
  const weekStart = (() => {
    const d = new Date(currentDate);
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - dow);
    d.setHours(0,0,0,0);
    return d;
  })();
  const weekDays  = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; });
  const isWToday  = (date) => date.toDateString() === now.toDateString();
  const evOnDay   = (date) => getEventsForDate(events, fmtDateStr(date)).sort((a,b) => (a.start_time||"").localeCompare(b.start_time||""));

  // ── 3-day view ──
  const threeDays = [-1, 0, 1].map(offset => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + offset);
    d.setHours(0,0,0,0);
    return d;
  });

  const fmtEvDate = (dateStr) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short" });

  const fmtTime12h = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    const suffix = h < 12 ? "AM" : "PM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  // ── Visible events for current view ──
  const visibleEvents = (() => {
    if (calView === "month") {
      const seen = new Set(); const result = [];
      for (let d = 1; d <= daysInMonth; d++) {
        for (const ev of getEventsForDate(events, fmtDs(d))) {
          if (!seen.has(ev.id)) { seen.add(ev.id); result.push(ev); }
        }
      }
      return result.sort((a, b) => a.date.localeCompare(b.date));
    }
    if (calView === "week") {
      const seen = new Set(); const result = [];
      weekDays.forEach(d => {
        for (const ev of getEventsForDate(events, fmtDateStr(d))) {
          if (!seen.has(ev.id)) { seen.add(ev.id); result.push(ev); }
        }
      });
      return result.sort((a, b) => a.date.localeCompare(b.date));
    }
    if (calView === "3day") {
      const seen = new Set(); const result = [];
      threeDays.forEach(d => {
        for (const ev of getEventsForDate(events, fmtDateStr(d))) {
          if (!seen.has(ev.id)) { seen.add(ev.id); result.push(ev); }
        }
      });
      return result.sort((a, b) => a.date.localeCompare(b.date));
    }
    if (calView === "year") {
      return events
        .filter(ev => ev.date && ev.date.startsWith(`${year}-`))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    return [];
  })();

  const eventListTitle = (() => {
    const n = visibleEvents.length;
    const s = n !== 1 ? "s" : "";
    if (calView === "month") return { heading: `Events — ${MONTHS[month]} ${year}`, sub: `${n} event${s}` };
    if (calView === "week")  return { heading: "This week", sub: `${n} event${s}` };
    if (calView === "3day")  return { heading: "Next 3 days", sub: `${n} event${s}` };
    if (calView === "year")  return { heading: `Events — ${year}`, sub: `${n} event${s}` };
    return { heading: "", sub: "" };
  })();

  const repeatOpts    = getRepeatOptions(formData.date);
  const repeatSummary = buildRepeatSummary(formData);
  const hasRepeat     = formData.repeat !== "none";

  const _today = new Date();
  const todayISO    = _today.toISOString().slice(0, 10);
  const _tomorrow   = new Date(_today); _tomorrow.setDate(_today.getDate() + 1);
  const tomorrowISO = _tomorrow.toISOString().slice(0, 10);
  const _nextMon    = new Date(_today); _nextMon.setDate(_today.getDate() + ((8 - _today.getDay()) % 7 || 7));
  const nextMonISO  = _nextMon.toISOString().slice(0, 10);
  const _nextSat    = new Date(_today); _nextSat.setDate(_today.getDate() + ((6 - _today.getDay() + 7) % 7 || 7));
  const nextSatISO  = _nextSat.toISOString().slice(0, 10);
  const QUICK_DATES = [
    { label: "Today",    date: todayISO    },
    { label: "Tomorrow", date: tomorrowISO },
    { label: "Next Mon", date: nextMonISO  },
    { label: "Next Sat", date: nextSatISO  },
  ];
  const DATE_DAYS   = Array.from({ length: 31 }, (_, i) => i + 1);
  const DATE_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DATE_YEARS  = [2025, 2026, 2027, 2028];

  // ── Header title by view ──
  const headerTitle = (() => {
    if (calView === "month") return `${MONTHS[month]} ${year}`;
    if (calView === "week")  return `${weekDays[0].toLocaleDateString("en-IE",{day:"numeric",month:"short"})} – ${weekDays[6].toLocaleDateString("en-IE",{day:"numeric",month:"short",year:"numeric"})}`;
    if (calView === "3day")  return `${threeDays[0].toLocaleDateString("en-IE",{day:"numeric",month:"short"})} – ${threeDays[2].toLocaleDateString("en-IE",{day:"numeric",month:"short",year:"numeric"})}`;
    if (calView === "year")  return `${year}`;
    return "";
  })();

  // ── Render ──
  return (
    <div className="page-body page-enter">

      {/* Add / Edit modal */}
      {showAdd && (
        <Modal title={editingEvent ? "Edit event" : "Add event"} onClose={closeModal} wide>
          <div className="form-row">
            <input className="inp" value={formData.title}
              onChange={e => setF("title", e.target.value)}
              placeholder="Event title" autoFocus style={{ fontSize: 16, fontWeight: 600 }}
              onKeyDown={e => e.key === "Enter" && saveEvent()} />
          </div>

          <div className="form-row">
            <label className="form-label">Date</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {QUICK_DATES.map(({ label, date }) => (
                <button key={label}
                  className="time-quick-btn"
                  style={{
                    background: formData.date === date ? "var(--acc)" : "var(--bg2)",
                    color: formData.date === date ? "#fff" : "var(--t2)",
                    border: "1px solid var(--b2)",
                    borderRadius: 6, padding: "4px 10px",
                    fontSize: 11, cursor: "pointer"
                  }}
                  onClick={() => setF("date", date)}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select className="inp" style={{ width: 70 }}
                value={new Date(formData.date + "T12:00:00").getDate()}
                onChange={e => {
                  const d = new Date(formData.date + "T12:00:00");
                  d.setDate(parseInt(e.target.value));
                  setF("date", d.toISOString().slice(0, 10));
                }}>
                {DATE_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="inp" style={{ flex: 1 }}
                value={new Date(formData.date + "T12:00:00").getMonth()}
                onChange={e => {
                  const d = new Date(formData.date + "T12:00:00");
                  d.setMonth(parseInt(e.target.value));
                  setF("date", d.toISOString().slice(0, 10));
                }}>
                {DATE_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select className="inp" style={{ width: 80 }}
                value={new Date(formData.date + "T12:00:00").getFullYear()}
                onChange={e => {
                  const d = new Date(formData.date + "T12:00:00");
                  d.setFullYear(parseInt(e.target.value));
                  setF("date", d.toISOString().slice(0, 10));
                }}>
                {DATE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Time</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {TIME_PRESETS.map(p => (
                <button key={p.label} className="time-quick-btn"
                  style={{ padding: "4px 10px", borderRadius: 6, background: "var(--bg2)", border: "1px solid var(--b2)", fontSize: 11, color: "var(--t2)", cursor: "pointer" }}
                  onMouseOver={e => e.currentTarget.style.background = "var(--b2)"}
                  onMouseOut={e  => e.currentTarget.style.background = "var(--bg2)"}
                  onClick={() => applyTimePreset(p.time)}>
                  {p.label} {p.time.replace(/^0/, "").replace(":00","").replace(":","h")}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label className="form-label" style={{ fontSize: 10 }}>Start</label>
                <select className="inp" value={formData.start_time} onChange={e => setStartTime(e.target.value)}>
                  <option value="">No time</option>
                  {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 10 }}>End</label>
                <select className="inp" value={formData.end_time} onChange={e => setF("end_time", e.target.value)}>
                  <option value="">No end time</option>
                  {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

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

          <div className="form-row">
            <label className="form-label">Location</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, pointerEvents: "none" }}>📍</span>
              <input className="inp" value={formData.location}
                onChange={e => setF("location", e.target.value)}
                placeholder="Add location or address" style={{ paddingLeft: 30 }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
              Enter address, place name, or Eircode
            </div>
          </div>

          <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="form-label">Repeat</label>
              <select className="inp" value={formData.repeat} onChange={e => setF("repeat", e.target.value)}>
                {repeatOpts.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Reminder</label>
              <select className="inp" value={formData.reminder} onChange={e => setF("reminder", e.target.value)}>
                {REMINDERS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {formData.repeat === "custom" && (
            <div className="form-row">
              <label className="form-label">Custom interval</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--t2)" }}>Every</span>
                <input className="inp" type="number" min={1} max={99}
                  value={formData.repeatCustomInterval}
                  onChange={e => setF("repeatCustomInterval", Math.max(1, parseInt(e.target.value)||1))}
                  style={{ width: 64, textAlign: "center" }} />
                <select className="inp" value={formData.repeatCustomUnit}
                  onChange={e => setF("repeatCustomUnit", e.target.value)}
                  style={{ flex: 1 }}>
                  <option value="day">Day(s)</option>
                  <option value="week">Week(s)</option>
                  <option value="month">Month(s)</option>
                  <option value="year">Year(s)</option>
                </select>
              </div>
            </div>
          )}

          {hasRepeat && (
            <div className="form-row">
              <label className="form-label">Ends</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { id: "forever", label: "Forever" },
                  { id: "until",   label: "Until date" },
                  { id: "count",   label: "After" },
                ].map(opt => (
                  <label key={opt.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--t2)", cursor: "pointer" }}>
                    <input type="radio" name="repeatEnd" value={opt.id}
                      checked={formData.repeatEnd === opt.id}
                      onChange={() => setF("repeatEnd", opt.id)}
                      style={{ accentColor: "var(--blue)" }} />
                    <span>{opt.label}</span>
                    {opt.id === "until" && formData.repeatEnd === "until" && (
                      <input className="inp" type="date" value={formData.repeatEndDate}
                        onChange={e => setF("repeatEndDate", e.target.value)}
                        style={{ flex: 1, marginLeft: 4 }} />
                    )}
                    {opt.id === "count" && formData.repeatEnd === "count" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
                        <input className="inp" type="number" min={1} max={999}
                          value={formData.repeatEndCount}
                          onChange={e => setF("repeatEndCount", Math.max(1, parseInt(e.target.value)||1))}
                          style={{ width: 70, textAlign: "center" }} />
                        <span style={{ fontSize: 13, color: "var(--t3)" }}>occurrences</span>
                      </div>
                    )}
                  </label>
                ))}
              </div>
              {repeatSummary && (
                <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 8, fontStyle: "italic" }}>
                  {repeatSummary}
                </div>
              )}
            </div>
          )}

          <div className="form-row">
            <label className="form-label">Notes</label>
            <textarea className="inp" value={formData.notes}
              onChange={e => setF("notes", e.target.value)}
              placeholder="Add details..." style={{ minHeight: 72, resize: "vertical" }} />
          </div>

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
          <button className="btn sm" onClick={goToPrev}><Icon name="chevL" size={14} /></button>
          <div className="cal-month-title" style={{ minWidth: calView === "week" || calView === "3day" ? 220 : undefined }}>
            {headerTitle}
          </div>
          <button className="btn sm" onClick={goToNext}><Icon name="chevR" size={14} /></button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn sm" onClick={goToToday}>Today</button>
            <div style={{ display: "flex", background: "var(--bg2)", padding: 4, borderRadius: 10, gap: 2 }}>
              {VIEWS.map(v => (
                <button key={v.id}
                  onClick={() => changeView(v.id)}
                  style={{
                    padding: "5px 12px", borderRadius: 7, border: "none",
                    background: calView === v.id ? "var(--bg1)" : "transparent",
                    color: calView === v.id ? "var(--t1)" : "var(--t3)",
                    fontWeight: calView === v.id ? 600 : 400,
                    fontSize: 13, cursor: "pointer",
                    boxShadow: calView === v.id ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                    transition: "all .15s"
                  }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 10, color: "var(--t3)" }}>
            1 Month · 2 Week · 3 Days · 4 Year · ← → Navigate · T Today · N New
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
      {calView === "month" && (
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

      {/* ── Week view ── */}
      {calView === "week" && (
        <div className="card mb18" style={{ padding: 0, overflow: "hidden" }}>
          <div className="week-time-grid-header">
            <div className="time-col-spacer" />
            {weekDays.map((d, i) => (
              <div key={i} className={`week-time-grid-day-head${isWToday(d)?" today":""}`}>
                <div className="week-col-day">{DAYS_S[i]}</div>
                <div className={`week-col-num${isWToday(d)?" today-num":""}`}>{d.getDate()}</div>
              </div>
            ))}
          </div>
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
          <div className="week-time-grid-scroll" ref={scrollRef}>
            <div className="week-time-grid-body">
              <div className="week-time-col">
                {HOURS.map(h => (
                  <div key={h} className="week-hour-label">
                    {String(h).padStart(2,"0")}:00
                  </div>
                ))}
              </div>
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

      {/* ── 3-day view ── */}
      {calView === "3day" && (
        <div className="card mb18" style={{ padding: 0, overflow: "hidden" }}>
          <div className="week-time-grid-header">
            <div className="time-col-spacer" />
            {threeDays.map((d, i) => (
              <div key={i} className={`week-time-grid-day-head${isWToday(d)?" today":""}`}>
                <div className="week-col-day">{d.toLocaleDateString("en-IE",{weekday:"short"})}</div>
                <div className={`week-col-num${isWToday(d)?" today-num":""}`}>{d.getDate()}</div>
              </div>
            ))}
          </div>
          <div className="week-allday-row">
            <div className="week-allday-label">all day</div>
            {threeDays.map((d, i) => {
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
          <div className="week-time-grid-scroll" ref={scrollRef}>
            <div className="week-time-grid-body">
              <div className="week-time-col">
                {HOURS.map(h => (
                  <div key={h} className="week-hour-label">
                    {String(h).padStart(2,"0")}:00
                  </div>
                ))}
              </div>
              {threeDays.map((d, i) => {
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

      {/* ── Year view ── */}
      {calView === "year" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 18,
        }}
          className="year-grid">
          {Array.from({ length: 12 }, (_, i) => {
            const mDate      = new Date(year, i, 1);
            const mDaysIn    = new Date(year, i+1, 0).getDate();
            const mFirstDay  = mDate.getDay();
            const mOffset    = mFirstDay === 0 ? 6 : mFirstDay - 1;
            const mCells     = [];
            for (let x = 0; x < mOffset; x++) mCells.push(null);
            for (let d = 1; d <= mDaysIn; d++) mCells.push(d);
            while (mCells.length % 7 !== 0) mCells.push(null);
            const mEvDates   = new Set(
              events.filter(ev => ev.date && ev.date.startsWith(`${year}-${String(i+1).padStart(2,"0")}`)).map(ev => parseInt(ev.date.slice(8,10)))
            );
            const isThisMonth = i === now.getMonth() && year === now.getFullYear();
            return (
              <div key={i}
                onClick={() => { setCurrentDate(new Date(year, i, 1)); changeView("month"); }}
                style={{
                  background: "var(--bg1)",
                  border: `1px solid ${isThisMonth ? "var(--acc)" : "var(--b1)"}`,
                  borderRadius: 10,
                  padding: 12,
                  cursor: "pointer",
                  transition: "border-color .15s",
                }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: isThisMonth ? "var(--acc)" : "var(--t2)", marginBottom: 8 }}>
                  {MONTHS_SHORT[i]}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
                  {["M","T","W","T","F","S","S"].map((d, di) => (
                    <div key={di} style={{ fontSize: 7, color: "var(--t3)", textAlign: "center", marginBottom: 2 }}>{d}</div>
                  ))}
                  {mCells.map((d, ci) => {
                    const isToday = d && d === now.getDate() && isThisMonth;
                    const hasEv   = d && mEvDates.has(d);
                    return (
                      <div key={ci} style={{ textAlign: "center", position: "relative" }}>
                        <span style={{
                          fontSize: 8,
                          color: isToday ? "#fff" : d ? "var(--t2)" : "transparent",
                          background: isToday ? "var(--acc)" : "transparent",
                          borderRadius: "50%",
                          width: 14, height: 14,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                        }}>
                          {d || ""}
                        </span>
                        {hasEv && !isToday && (
                          <span style={{
                            position: "absolute",
                            bottom: 0,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 3, height: 3,
                            borderRadius: "50%",
                            background: "var(--acc)",
                            display: "block",
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Events list — updates to match current view */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{eventListTitle.heading}</div>
            <div className="card-sub">{eventListTitle.sub}</div>
          </div>
          <button className="btn sm primary" onClick={() => openAdd(fmtDateStr(new Date()))}>
            <Icon name="plus" size={12} /> Add
          </button>
        </div>
        {visibleEvents.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
            No events — click any day to add one
          </div>
        ) : (
          visibleEvents.map(ev => {
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
                      {fmtEvDate(ev.date)}{startT ? ` · ${fmtTime12h(startT)}` : ""}
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

      <style>{`
        @media (max-width: 768px) {
          .year-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
