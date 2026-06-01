// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { useState, useEffect } from "react";
import { sb } from "../../lib/supabase";
import { Icon, Modal, CAT_ICONS } from "../shared";

export default function Finance({ user }) {
  const currentMonth = new Date().toLocaleString("en-IE", { month: "long", year: "numeric" });
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({ label: "", amount: "", category: "expense", month: currentMonth });
  const CATS = ["expense", "income", "mortgage", "insurance", "subscription", "savings"];

  useEffect(() => { loadFinance(); }, []);

  const loadFinance = async () => {
    setLoading(true);
    try {
      const data = await sb.from("finance").select("*");
      if (Array.isArray(data) && data.length > 0) setEntries(data);
      else setEntries([]);
    } catch { setEntries([]); }
    setLoading(false);
  };

  const addEntry = async () => {
    if (!newEntry.label || !newEntry.amount) return;
    const entry = { ...newEntry, amount: parseFloat(newEntry.amount), user_id: user?.id };
    try {
      const res = await sb.from("finance").insert(entry);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...entry, id: Date.now().toString() };
      setEntries(prev => [...prev, created]);
    } catch { setEntries(prev => [...prev, { ...entry, id: Date.now().toString() }]); }
    setNewEntry({ label: "", amount: "", category: "expense", month: currentMonth }); setShowAdd(false);
  };

  const deleteEntry = async (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    try { await sb.from("finance").delete({ id }); } catch { }
  };

  const income = entries.filter(e => e.category === "income").reduce((s, e) => s + Number(e.amount), 0);
  const expenses = entries.filter(e => e.category !== "income").reduce((s, e) => s + Number(e.amount), 0);
  const balance = income - expenses;

  const grouped = CATS.filter(c => c !== "income").map(cat => ({
    cat, total: entries.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
  })).filter(g => g.total > 0);

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Add entry" onClose={() => setShowAdd(false)}>
          <div className="form-row"><label className="form-label">Label</label><input className="inp" value={newEntry.label} onChange={e => setNewEntry(n => ({ ...n, label: e.target.value }))} autoFocus /></div>
          <div className="form-row"><label className="form-label">Amount (€)</label><input className="inp" type="number" value={newEntry.amount} onChange={e => setNewEntry(n => ({ ...n, amount: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">Category</label>
            <select className="inp" value={newEntry.category} onChange={e => setNewEntry(n => ({ ...n, category: e.target.value }))}>
              {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select></div>
          <div className="form-row"><label className="form-label">Month</label><input className="inp" value={newEntry.month} onChange={e => setNewEntry(n => ({ ...n, month: e.target.value }))} /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addEntry}>Add</button></div>
        </Modal>
      )}

      <div className="grid-3 mb18">
        <div className="stat"><div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}><Icon name="finance" size={18} color="var(--grn)" /></div><div className="stat-label">Income</div><div className="stat-value" style={{ color: "var(--grn)" }}>€{income.toLocaleString()}</div><div className="stat-sub">{currentMonth}</div></div>
        <div className="stat"><div className="stat-icon" style={{ background: "rgba(239,68,68,0.15)" }}><Icon name="card" size={18} color="var(--red)" /></div><div className="stat-label">Expenses</div><div className="stat-value" style={{ color: "var(--red)" }}>€{expenses.toLocaleString()}</div><div className="stat-sub">All outgoings</div></div>
        <div className="stat">
          <div className="stat-icon" style={{ background: balance >= 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)" }}><Icon name="bank" size={18} color={balance >= 0 ? "var(--grn)" : "var(--red)"} /></div>
          <div className="stat-label">Balance</div>
          <div className="stat-value" style={{ color: balance >= 0 ? "var(--grn)" : "var(--red)" }}>€{balance.toLocaleString()}</div>
          <div className="stat-sub">After all expenses</div>
          <div className="stat-bar"><div className={`stat-fill ${balance >= 0 ? "grn" : "red"}`} style={{ width: `${Math.min(Math.abs(balance / income) * 100, 100)}%` }} /></div>
        </div>
      </div>

      {grouped.length > 0 && (
        <div className="mb18">
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 14 }}>By category</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {grouped.map(g => {
              const info = CAT_ICONS[g.cat] || { icon: "card", color: "var(--blue)", bg: "var(--bluem)" };
              return (
                <div key={g.cat} className="fin-category-card">
                  <div className="fin-cat-icon" style={{ background: info.bg }}><Icon name={info.icon} size={16} color={info.color} /></div>
                  <div className="fin-cat-name">{g.cat.charAt(0).toUpperCase() + g.cat.slice(1)}</div>
                  <div className="fin-cat-amount" style={{ color: info.color }}>€{g.total.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div><div className="card-title">{currentMonth}</div><div className="card-sub">All transactions</div></div>
          <button className="btn sm primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Add</button>
        </div>
        {loading ? <div className="loading">Loading...</div> : entries.map(e => {
          const info = CAT_ICONS[e.category] || { icon: "card", color: "var(--t1)", bg: "var(--bg3)" };
          return (
            <div key={e.id} className="fin-row">
              <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div className="fin-icon" style={{ background: info.bg }}><Icon name={info.icon} size={14} color={info.color} /></div>
                <div>
                  <div className="fin-label">{e.label}</div>
                  <div className="fin-cat-tag">{e.category}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="fin-amount" style={{ color: e.category === "income" ? "var(--grn)" : "var(--t1)" }}>
                  {e.category === "income" ? "+" : "-"}€{Number(e.amount).toLocaleString()}
                </div>
                <button className="btn xs danger" onClick={() => deleteEntry(e.id)}><Icon name="trash" size={11} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
