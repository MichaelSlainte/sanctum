// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { useState, useEffect } from "react";

// ─── ICONS ───────────────────────────────────────────────────────────────────
export const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const s = { width: size, height: size, stroke: color, fill: "none", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", flexShrink: 0 };
  const p = {
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    notes: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    career: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></>,
    finance: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>,
    study: <><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></>,
    travel: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></>,
    pet: <><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></>,
    check: <><polyline points="20 6 9 17 4 12" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    chevL: <><polyline points="15 18 9 12 15 6" /></>,
    chevR: <><polyline points="9 18 15 12 9 6" /></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    ai: <><path d="M12 2a10 10 0 110 20A10 10 0 0112 2z" /><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="1" /><path d="M16.24 7.76l-1.42 1.42M7.76 7.76l1.42 1.42M7.76 16.24l1.42-1.42M16.24 16.24l-1.42-1.42" /></>,
    trackers: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    grab: <><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="17" x2="16" y2="17"/></>,
    eye:  <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    code: <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
    list: <><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><line x1="4" y1="6" x2="4.01" y2="6" strokeWidth="3" strokeLinecap="round"/><line x1="4" y1="12" x2="4.01" y2="12" strokeWidth="3" strokeLinecap="round"/><line x1="4" y1="18" x2="4.01" y2="18" strokeWidth="3" strokeLinecap="round"/></>,
    folder: <><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    mic: <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>,
    card: <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
    bank: <><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    phone: <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round"/></>,
    link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>,
    maximize: <><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></>,
    table: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" strokeLinecap="round"/></>,
    doc: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
    fire: <><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-7 7 7 7 0 01-7-7c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{p[name]}</svg>;
};

// ─── MODAL ───────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 560 } : {}}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div className="modal-title">{title}</div>
          <button className="btn sm ghost" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── NOTEBOOKS CONFIG ────────────────────────────────────────────────────────
export const DEFAULT_NOTEBOOKS = [
  {
    id: "finance", label: "Finance", icon: "finance", color: "#10b981", bg: "rgba(16,185,129,0.15)",
    sections: [
      { id: "mortgage", label: "Mortgage & House" },
      { id: "expenses", label: "Monthly Expenses" },
      { id: "goals", label: "Financial Goals" },
      { id: "investments", label: "Investments" },
    ]
  },
  {
    id: "travel", label: "Travel", icon: "travel", color: "#3b82f6", bg: "rgba(59,130,246,0.15)",
    sections: [
      { id: "scotland", label: "Scotland Sep 2026" },
      { id: "italy", label: "Italy Jun 2026" },
      { id: "wishlist", label: "Wish List" },
      { id: "packing", label: "Packing Lists" },
    ]
  },
  {
    id: "career", label: "Career", icon: "career", color: "#f59e0b", bg: "rgba(245,158,11,0.15)",
    sections: [
      { id: "applications", label: "Applications" },
      { id: "pmp", label: "PMP Study" },
      { id: "networking", label: "Networking" },
      { id: "interview", label: "Interview Prep" },
    ]
  },
  {
    id: "personal", label: "Personal", icon: "home", color: "#ec4899", bg: "rgba(236,72,153,0.15)",
    sections: [
      { id: "health", label: "Health & Fitness" },
      { id: "reading", label: "Reading List" },
      { id: "home", label: "Home & House" },
      { id: "ozzy", label: "Ozzy" },
    ]
  },
  {
    id: "ideas", label: "Ideas", icon: "ai", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)",
    sections: [
      { id: "sanctum", label: "Sanctum App" },
      { id: "projects", label: "Projects" },
      { id: "random", label: "Random" },
    ]
  },
];

export const STATUS_COLORS = { submitted: "blue", interview: "amber", offer: "green", rejected: "red", withdrawn: "muted" };
export const CAT_ICONS = {
  expense: { icon: "card", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  income: { icon: "finance", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  mortgage: { icon: "home", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  insurance: { icon: "shield", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  subscription: { icon: "phone", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
  savings: { icon: "bank", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
};
export const SanctumLogo = ({ size = 36, theme = "dark" }) => {
  const isTamara = theme === "tamara";
  const treePrimary = isTamara ? "#fbc4d4" : "#e0e0e0";
  const treeSec     = isTamara ? "#f5a8be" : "#d8d8d8";
  const treeMid     = isTamara ? "#f099b0" : "#d0d0d0";
  const treeFaint   = isTamara ? "#e880a0" : "#c8c8c8";
  const treeDim     = isTamara ? "#d06080" : "#c0c0c0";
  const treeLight   = isTamara ? "#c05070" : "#b8b8b8";
  const treeTiny    = isTamara ? "#a04060" : "#a0a0a0";
  const treeGhost   = isTamara ? "#804050" : "#888";
  const circleBorder = isTamara ? "#fbc4d4" : "#222";
  return (
    <svg width={size} height={size} viewBox="0 0 220 220">
      <circle cx="110" cy="110" r="105" fill="#080808" stroke={circleBorder} strokeWidth="1.5"/>
      <circle cx="110" cy="110" r="96" fill="none" stroke="#1a1a1a" strokeWidth="0.5"/>
      <ellipse cx="110" cy="172" rx="48" ry="5" fill="#111" stroke="#333" strokeWidth="0.5"/>
      <path d="M110 172 Q106 158 102 145 Q98 132 100 118 Q102 105 108 95 Q114 85 118 72 Q122 58 118 45 Q114 32 110 22" fill="none" stroke={treePrimary} strokeWidth="6" strokeLinecap="round"/>
      <path d="M107 172 Q103 155 100 140 Q97 125 99 112 Q101 98 107 88" fill="none" stroke={treeMid} strokeWidth="3" strokeLinecap="round"/>
      <path d="M102 135 Q88 122 72 110 Q60 100 48 88" fill="none" stroke={treeSec} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M101 120 Q86 110 70 98 Q58 88 46 76" fill="none" stroke={treeMid} strokeWidth="2" strokeLinecap="round"/>
      <path d="M104 105 Q90 95 76 84 Q65 74 55 62" fill="none" stroke={treeFaint} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M72 110 Q62 98 52 86" fill="none" stroke={treeDim} strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M72 110 Q66 95 62 82" fill="none" stroke={treeDim} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M48 88 Q40 78 35 66" fill="none" stroke={treeTiny} strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M76 84 Q68 72 62 60" fill="none" stroke={treeLight} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M55 62 Q48 52 44 40" fill="none" stroke={treeTiny} strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M46 76 Q38 66 34 54" fill="none" stroke={treeGhost} strokeWidth="0.6" strokeLinecap="round"/>
      <path d="M114 88 Q128 76 144 64 Q156 54 168 42" fill="none" stroke={treeSec} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M116 75 Q130 64 146 53 Q158 44 170 32" fill="none" stroke={treeMid} strokeWidth="2" strokeLinecap="round"/>
      <path d="M114 62 Q126 52 140 42 Q152 33 162 22" fill="none" stroke={treeFaint} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M144 64 Q154 52 162 40" fill="none" stroke={treeDim} strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M144 64 Q150 50 154 37" fill="none" stroke={treeDim} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M168 42 Q175 30 178 18" fill="none" stroke={treeTiny} strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M140 42 Q148 30 154 18" fill="none" stroke={treeLight} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M162 22 Q168 10 172 2" fill="none" stroke={treeTiny} strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M110 40 Q100 26 94 12" fill="none" stroke={treeFaint} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M110 40 Q120 26 126 12" fill="none" stroke={treeFaint} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M94 12 Q88 4 84 0" fill="none" stroke={treeTiny} strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M126 12 Q132 4 136 0" fill="none" stroke={treeTiny} strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M107 172 Q94 180 80 190 Q68 198 56 204" fill="none" stroke={treeFaint} strokeWidth="2" strokeLinecap="round"/>
      <path d="M107 172 Q96 182 86 192 Q76 200 68 208" fill="none" stroke={treeDim} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M110 172 Q110 184 110 196" fill="none" stroke={treeDim} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M113 172 Q126 180 140 190 Q152 198 164 204" fill="none" stroke={treeFaint} strokeWidth="2" strokeLinecap="round"/>
      <path d="M113 172 Q124 182 134 192 Q144 200 152 208" fill="none" stroke={treeDim} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M80 190 Q70 196 62 204" fill="none" stroke={treeTiny} strokeWidth="1" strokeLinecap="round"/>
      <path d="M140 190 Q150 196 158 204" fill="none" stroke={treeTiny} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
};

export const EVENT_COLORS = {
  personal: { color: "#3b82f6", bg: "rgba(59,130,246,0.2)" },
  career: { color: "#f59e0b", bg: "rgba(245,158,11,0.2)" },
  travel: { color: "#10b981", bg: "rgba(16,185,129,0.2)" },
  study: { color: "#8b5cf6", bg: "rgba(139,92,246,0.2)" },
  family: { color: "#ec4899", bg: "rgba(236,72,153,0.2)" },
};
