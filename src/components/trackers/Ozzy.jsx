import { useState } from "react";
import { Icon, Modal } from "../shared";

export default function Ozzy() {
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [vets, setVets] = useState(() => JSON.parse(localStorage.getItem("sanctum_ozzy_vets") || "[]"));
  const [newVet, setNewVet] = useState({ date: "", type: "", notes: "", next_due: "" });
  const [weight, setWeight] = useState(() => JSON.parse(localStorage.getItem("sanctum_ozzy_weight") || "[]"));
  const [newWeight, setNewWeight] = useState({ date: new Date().toISOString().slice(0, 10), kg: "" });
  const [showAddWeight, setShowAddWeight] = useState(false);

  const saveVets = (v) => { setVets(v); localStorage.setItem("sanctum_ozzy_vets", JSON.stringify(v)); };
  const saveWeight = (w) => { setWeight(w); localStorage.setItem("sanctum_ozzy_weight", JSON.stringify(w)); };

  const addVet = () => {
    if (!newVet.date || !newVet.type) return;
    saveVets([{ ...newVet, id: Date.now().toString() }, ...vets]);
    setNewVet({ date: "", type: "", notes: "", next_due: "" });
    setShowAdd(false);
  };

  const addWeight = () => {
    if (!newWeight.kg) return;
    saveWeight([{ ...newWeight, id: Date.now().toString() }, ...weight]);
    setNewWeight({ date: new Date().toISOString().slice(0, 10), kg: "" });
    setShowAddWeight(false);
  };

  const VET_TYPES = ["Annual checkup", "Vaccination", "Grooming", "Dental", "Emergency", "Medication", "Other"];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "health", label: "Health" },
    { id: "diet", label: "Diet" },
    { id: "documents", label: "Documents" },
  ];

  return (
    <div className="page-body animate-in">
      {showAdd && (
        <Modal title="Log vet visit" onClose={() => setShowAdd(false)} wide>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-row"><label className="form-label">Date</label><input className="inp" type="date" value={newVet.date} onChange={e => setNewVet(n => ({ ...n, date: e.target.value }))} autoFocus /></div>
            <div className="form-row"><label className="form-label">Type</label>
              <select className="inp" value={newVet.type} onChange={e => setNewVet(n => ({ ...n, type: e.target.value }))}>
                <option value="">Select type...</option>
                {VET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row"><label className="form-label">Next due</label><input className="inp" type="date" value={newVet.next_due} onChange={e => setNewVet(n => ({ ...n, next_due: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">Notes</label><textarea className="inp" value={newVet.notes} onChange={e => setNewVet(n => ({ ...n, notes: e.target.value }))} placeholder="What was discussed, medications prescribed..." style={{ minHeight: 70 }} /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn primary" onClick={addVet}>Save</button></div>
        </Modal>
      )}

      {showAddWeight && (
        <Modal title="Log weight" onClose={() => setShowAddWeight(false)}>
          <div className="form-row"><label className="form-label">Date</label><input className="inp" type="date" value={newWeight.date} onChange={e => setNewWeight(n => ({ ...n, date: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">Weight (kg)</label><input className="inp" type="number" step="0.1" value={newWeight.kg} onChange={e => setNewWeight(n => ({ ...n, kg: e.target.value }))} placeholder="e.g. 28.5" autoFocus /></div>
          <div className="modal-actions"><button className="btn" onClick={() => setShowAddWeight(false)}>Cancel</button><button className="btn primary" onClick={addWeight}>Save</button></div>
        </Modal>
      )}

      {/* Ozzy profile card */}
      <div className="card mb18" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(16,185,129,0.08))", borderColor: "rgba(245,158,11,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 16, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="pet" size={28} color="var(--amber)" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>Ozzy</div>
            <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 12 }}>Golden Retriever · Born November 2025 · Dublin, Ireland</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge amber">Belarmine</span>
              <span className="badge green">Vaccinated</span>
              <span className="badge blue">Microchipped</span>
              <span className="badge muted">600 kcal/day</span>
              <span className="badge purple">Insurance: €25/mo</span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 4 }}>Age</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--amber)" }}>
              {Math.floor((new Date() - new Date("2025-11-01")) / (1000 * 60 * 60 * 24 * 30))}mo
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {tabs.map(t => (
          <button key={t.id} className={`btn${activeTab === t.id ? " primary" : ""}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Key info</div></div>
            </div>
            {[
              { label: "Breed", value: "Golden Retriever" },
              { label: "Born", value: "November 2025" },
              { label: "Chip number", value: "Check vet records" },
              { label: "Vet", value: "Local Dublin vet" },
              { label: "Insurance", value: "€25/month" },
              { label: "Daily calories", value: "600 kcal max" },
              { label: "Diet", value: "Dry kibble" },
            ].map(item => (
              <div key={item.label} className="fin-row">
                <span style={{ fontSize: 12, color: "var(--t3)", fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: 13, color: "var(--t1)", fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Weight tracker</div></div>
              <button className="btn sm primary" onClick={() => setShowAddWeight(true)}><Icon name="plus" size={13} /> Log</button>
            </div>
            {weight.length === 0 && (
              <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No weight logs yet</div>
            )}
            {weight.slice(0, 8).map(w => (
              <div key={w.id} className="fin-row">
                <span style={{ fontSize: 12, color: "var(--t3)", fontFamily: "var(--mono)" }}>{w.date}</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--amber)" }}>{w.kg} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "health" && (
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Vet visits & health log</div></div>
            <button className="btn sm primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} /> Log visit</button>
          </div>
          {vets.length === 0 && (
            <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
              No vet visits logged yet.<br />
              <button className="btn sm primary" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>Log first visit</button>
            </div>
          )}
          {vets.map(v => (
            <div key={v.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--b1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>{v.type}</div>
                  {v.notes && <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 4 }}>{v.notes}</div>}
                  {v.next_due && <div style={{ fontSize: 11, color: "var(--amber)", fontFamily: "var(--mono)" }}>Next due: {v.next_due}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>{v.date}</span>
                  <button className="btn xs danger" onClick={() => saveVets(vets.filter(x => x.id !== v.id))}><Icon name="trash" size={11} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "diet" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><div className="card-title">Daily diet plan</div></div>
            {[
              { meal: "Morning", food: "Dry kibble", amount: "200g", time: "7:00am" },
              { meal: "Evening", food: "Dry kibble", amount: "200g", time: "6:00pm" },
              { meal: "Treats", food: "Low calorie treats", amount: "Max 50g", time: "During training" },
            ].map(m => (
              <div key={m.meal} className="fin-row">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{m.meal}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)" }}>{m.food} · {m.time}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--amber)", fontFamily: "var(--mono)" }}>{m.amount}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: 12, background: "rgba(245,158,11,0.08)", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--amber)", fontWeight: 600, marginBottom: 4 }}><Icon name="alert" size={12} color="var(--amber)" /> Daily limit</div>
              <div style={{ fontSize: 13, color: "var(--t2)" }}>Maximum 600 kcal per day. No human food. Fresh water always available.</div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Foods to avoid</div></div>
            {["Chocolate", "Grapes & raisins", "Onions & garlic", "Macadamia nuts", "Xylitol (sugar-free products)", "Alcohol", "Cooked bones", "Avocado"].map(food => (
              <div key={food} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--b1)" }}>
                <span style={{ color: "var(--red)" }}>✕</span>
                <span style={{ fontSize: 13, color: "var(--t2)" }}>{food}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="card">
          <div className="card-header"><div className="card-title">Documents & records</div></div>
          {[
            { label: "Vaccination certificate", status: "Up to date", color: "var(--grn)" },
            { label: "Microchip registration", status: "Registered", color: "var(--grn)" },
            { label: "Pet insurance", status: "Active — €25/mo", color: "var(--grn)" },
            { label: "Vet registration", status: "Registered", color: "var(--grn)" },
            { label: "Passport (if travelling)", status: "Check requirements", color: "var(--amber)" },
          ].map(doc => (
            <div key={doc.label} className="fin-row">
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--t1)", fontWeight: 500 }}><Icon name="doc" size={13} color="var(--t3)" /> {doc.label}</span>
              <span style={{ fontSize: 12, color: doc.color, fontWeight: 600 }}>{doc.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
