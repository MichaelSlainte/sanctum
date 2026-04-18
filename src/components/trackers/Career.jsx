import { useState, useEffect } from "react";
import { sb } from "../../lib/supabase";
import { Icon, Modal, STATUS_COLORS } from "../shared";

export default function Career() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newApp, setNewApp] = useState({ company: "", role: "", status: "submitted", applied_date: "", notes: "" });
  const STATUSES = ["submitted", "interview", "offer", "rejected", "withdrawn"];

  useEffect(() => { loadApps(); }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      const data = await sb.from("applications").select("*");
      if (Array.isArray(data) && data.length > 0) setApps(data);
      else setApps([]);
    } catch { setApps([]); }
    setLoading(false);
  };

  const addApp = async () => {
    if (!newApp.company || !newApp.role) return;
    try {
      const res = await sb.from("applications").insert(newApp);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...newApp, id: Date.now().toString() };
      setApps(prev => [...prev, created]);
    } catch { setApps(prev => [...prev, { ...newApp, id: Date.now().toString() }]); }
    setNewApp({ company: "", role: "", status: "submitted", applied_date: "", notes: "" }); setShowAdd(false);
  };

  const updateStatus = async (id, status) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    try { await sb.from("applications").update({ status }, { id }); } catch { }
  };

  const deleteApp = async (id) => {
    setApps(prev => prev.filter(a => a.id !== id));
    try { await sb.from("applications").delete({ id }); } catch { }
  };

  const activeApps = apps.filter(a => !["rejected", "withdrawn"].includes(a.status));
  const archivedApps = apps.filter(a => ["rejected", "withdrawn"].includes(a.status));
  const active = activeApps.length;
  const interviews = apps.filter(a => a.status === "interview").length;

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Add application" onClose={() => setShowAdd(false)} wide>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row"><label className="form-label">Company</label><input className="inp" value={newApp.company} onChange={e => setNewApp(n => ({ ...n, company: e.target.value }))} autoFocus /></div>
            <div className="form-row"><label className="form-label">Role</label><input className="inp" value={newApp.role} onChange={e => setNewApp(n => ({ ...n, role: e.target.value }))} /></div>
          </div>
          <div className="form-row"><label className="form-label">Applied date</label><input className="inp" type="date" value={newApp.applied_date} onChange={e => setNewApp(n => ({ ...n, applied_date: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">Notes</label><textarea className="inp" value={newApp.notes} onChange={e => setNewApp(n => ({ ...n, notes: e.target.value }))} placeholder="Key notes, contacts, tailoring..." /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addApp}>Add application</button></div>
        </Modal>
      )}

      <div className="grid-3 mb18">
        <div className="stat"><div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)" }}><Icon name="mail" size={18} color="var(--blue)" /></div><div className="stat-label">Active</div><div className="stat-value">{active}</div><div className="stat-sub">In progress</div><div className="stat-bar"><div className="stat-fill" style={{ width: `${(active / Math.max(apps.length, 1)) * 100}%` }} /></div></div>
        <div className="stat"><div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)" }}><Icon name="mic" size={18} color="var(--amber)" /></div><div className="stat-label">Interviews</div><div className="stat-value">{interviews}</div><div className="stat-sub">Scheduled or completed</div></div>
        <div className="stat"><div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)" }}><Icon name="chart" size={18} color="var(--grn)" /></div><div className="stat-label">Total applied</div><div className="stat-value">{apps.length}</div><div className="stat-sub">All time</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Applications</div><div className="card-sub">Track every opportunity</div></div>
          <button className="btn sm primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Add</button>
        </div>
        {loading ? <div className="loading">Loading...</div> : (
          <>
            <table className="app-table">
              <thead><tr>
                <th>Company</th><th>Role</th><th>Status</th><th>Applied</th><th>Notes</th><th></th>
              </tr></thead>
              <tbody>
                {activeApps.map(a => (
                  <tr key={a.id}>
                    <td><div className="company-name">{a.company}</div></td>
                    <td><div style={{ fontSize: 13, color: "var(--t2)" }}>{a.role}</div></td>
                    <td>
                      <select className="inp" style={{ padding: "4px 10px", fontSize: 12, width: "auto" }}
                        value={a.status} onChange={e => updateStatus(a.id, e.target.value)}>
                        {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </td>
                    <td><span style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)" }}>{a.applied_date}</span></td>
                    <td><span style={{ fontSize: 12, color: "var(--t2)", maxWidth: 200, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.notes}</span></td>
                    <td><button className="btn xs danger" onClick={() => deleteApp(a.id)}><Icon name="trash" size={11} /></button></td>
                  </tr>
                ))}
                {activeApps.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--t3)", padding: "24px 0", fontSize: 13 }}>No active applications</td></tr>
                )}
              </tbody>
            </table>

            {archivedApps.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button className="btn sm ghost" style={{ width: "100%", justifyContent: "center", color: "var(--t3)", fontSize: 11 }}
                  onClick={() => setShowArchived(s => !s)}>
                  {showArchived ? "▲ Hide" : "▼ Show"} {archivedApps.length} archived (rejected / withdrawn)
                </button>
                {showArchived && (
                  <table className="app-table" style={{ marginTop: 8, opacity: .5 }}>
                    <tbody>
                      {archivedApps.map(a => (
                        <tr key={a.id}>
                          <td><div className="company-name" style={{ textDecoration: "line-through" }}>{a.company}</div></td>
                          <td><div style={{ fontSize: 13, color: "var(--t3)" }}>{a.role}</div></td>
                          <td><span className={`badge ${STATUS_COLORS[a.status] || "muted"}`}>{a.status}</span></td>
                          <td><span style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)" }}>{a.applied_date}</span></td>
                          <td></td>
                          <td><button className="btn xs danger" onClick={() => deleteApp(a.id)}><Icon name="trash" size={11} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
