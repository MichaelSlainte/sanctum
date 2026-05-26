// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { useState, useEffect, useRef } from "react";
import { sb, storage } from "../../lib/supabase";
import { Icon, Modal } from "../shared";

const DEFAULT_PROFILE = {
  Breed: "Golden Retriever",
  Born: "November 2025",
  Location: "Dublin, Ireland",
  "Chip number": "Check vet records",
  Vet: "Local Dublin vet",
  Insurance: "€25/month",
  "Daily calories": "600 kcal max",
  Diet: "Dry kibble",
};

const DEFAULT_DOCS = [
  "Vaccination certificate",
  "Microchip registration",
  "Pet insurance",
  "Vet registration",
  "Passport (if travelling)",
];

const DEFAULT_DIET = [
  { id: "morning", meal: "Morning", food: "Dry kibble", amount: "200g", time: "7:00am" },
  { id: "evening", meal: "Evening", food: "Dry kibble", amount: "200g", time: "6:00pm" },
  { id: "treats", meal: "Treats", food: "Low calorie treats", amount: "Max 50g", time: "During training" },
];

const AVOID_FOODS = ["Chocolate", "Grapes & raisins", "Onions & garlic", "Macadamia nuts", "Xylitol (sugar-free products)", "Alcohol", "Cooked bones", "Avocado"];
const VET_TYPES = ["Annual checkup", "Vaccination", "Grooming", "Dental", "Emergency", "Medication", "Other"];

const parseOzzyBorn = (bornStr) => {
  if (!bornStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(bornStr)) return new Date(bornStr + "T00:00:00");
  const d = new Date(bornStr.replace(",", " ").replace(/\s+/g, " ").trim());
  return isNaN(d) ? null : d;
};

const calcOzzyAge = (bornDate) => {
  if (!bornDate) return null;
  const now = new Date();
  let years = now.getFullYear() - bornDate.getFullYear();
  let months = now.getMonth() - bornDate.getMonth();
  if (now.getDate() < bornDate.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years === 0) return `${months}mo`;
  if (months === 0) return `${years}yr`;
  return `${years}yr ${months}mo`;
};

export default function Ozzy({ user }) {
  const [activeTab, setActiveTab] = useState("overview");

  const [ozzyPhoto, setOzzyPhoto] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);

  const [profile, setProfile] = useState(() => {
    try { return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem("sanctum_ozzy_profile") || "{}") }; }
    catch { return { ...DEFAULT_PROFILE }; }
  });
  const [customFields, setCustomFields] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sanctum_ozzy_custom_fields") || "[]"); }
    catch { return []; }
  });
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editCustomKey, setEditCustomKey] = useState("");

  const [docs, setDocs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sanctum_ozzy_docs_meta") || "{}"); }
    catch { return {}; }
  });
  const [customDocs, setCustomDocs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sanctum_ozzy_custom_docs") || "[]"); }
    catch { return []; }
  });
  const [addingDoc, setAddingDoc] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const docInputRefs = useRef({});

  const [vets, setVets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sanctum_ozzy_vets") || "[]"); }
    catch { return []; }
  });
  const [newVet, setNewVet] = useState({ date: "", type: "", notes: "", next_due: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [editingVet, setEditingVet] = useState(null);

  const [weight, setWeight] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sanctum_ozzy_weight") || "[]"); }
    catch { return []; }
  });
  const [newWeight, setNewWeight] = useState({ date: new Date().toISOString().slice(0, 10), kg: "" });
  const [showAddWeight, setShowAddWeight] = useState(false);

  const [diet, setDiet] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sanctum_ozzy_diet") || JSON.stringify(DEFAULT_DIET)); }
    catch { return [...DEFAULT_DIET]; }
  });
  const [editingDiet, setEditingDiet] = useState(null);

  useEffect(() => {
    sb.from("vet_visits").select("*").then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setVets(data);
        localStorage.setItem("sanctum_ozzy_vets", JSON.stringify(data));
      }
    }).catch(() => {});

    sb.from("ozzy_profile").select("*", "", "").then(data => {
      if (!Array.isArray(data) || data.length === 0) return;
      const merged = { ...DEFAULT_PROFILE };
      const custom = [];
      data.forEach(row => {
        if (row.key.startsWith('study_config')) return; // study tracker keys — not custom fields
        if (row.key === "photo_url" && row.value) {
          setOzzyPhoto(storage.getPublicUrl("pets", row.value));
        } else if (row.key === "diet") {
          try { setDiet(JSON.parse(row.value)); } catch {}
        } else if (row.key in DEFAULT_PROFILE) {
          merged[row.key] = row.value;
        } else {
          custom.push({ key: row.key, value: row.value, id: row.id });
        }
      });
      setProfile(merged);
      if (custom.length > 0) setCustomFields(custom);
    }).catch(() => {});

    sb.from("ozzy_docs").select("*").then(data => {
      if (!Array.isArray(data) || data.length === 0) return;
      setDocs(prev => {
        const meta = { ...prev };
        data.forEach(row => { meta[row.name] = { filename: row.filename, uploaded_at: row.uploaded_at, url: row.url }; });
        return meta;
      });
    }).catch(() => {});
  }, []);

  const saveProfileField = async (key, value) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    localStorage.setItem("sanctum_ozzy_profile", JSON.stringify(updated));
    try { await sb.from("ozzy_profile").upsert({ key, value, user_id: user?.id }, "key,user_id"); } catch {}
  };

  const saveCustomFields = (fields) => {
    setCustomFields(fields);
    localStorage.setItem("sanctum_ozzy_custom_fields", JSON.stringify(fields));
  };

  const saveVets = (v) => { setVets(v); localStorage.setItem("sanctum_ozzy_vets", JSON.stringify(v)); };
  const saveWeight = (w) => { setWeight(w); localStorage.setItem("sanctum_ozzy_weight", JSON.stringify(w)); };
  const saveDiet = (d) => {
    setDiet(d);
    localStorage.setItem("sanctum_ozzy_diet", JSON.stringify(d));
    sb.from("ozzy_profile").upsert({ key: "diet", value: JSON.stringify(d), user_id: user?.id }, "key,user_id").catch(() => {});
  };

  const addVet = async () => {
    if (!newVet.date || !newVet.type) return;
    try {
      const res = await sb.from("vet_visits").insert({ ...newVet, user_id: user?.id });
      const created = Array.isArray(res) && res[0] ? res[0] : { ...newVet, id: Date.now().toString() };
      saveVets([created, ...vets]);
    } catch {
      saveVets([{ ...newVet, id: Date.now().toString() }, ...vets]);
    }
    setNewVet({ date: "", type: "", notes: "", next_due: "" });
    setShowAdd(false);
  };

  const deleteVet = async (id) => {
    try { await sb.from("vet_visits").delete({ id }); } catch {}
    saveVets(vets.filter(x => x.id !== id));
  };

  const addWeight = () => {
    if (!newWeight.kg) return;
    saveWeight([{ ...newWeight, id: Date.now().toString() }, ...weight]);
    setNewWeight({ date: new Date().toISOString().slice(0, 10), kg: "" });
    setShowAddWeight(false);
  };

  const handleDocUpload = async (docName, file) => {
    if (!file) return;
    try {
      const path = `${user?.id || 'shared'}/${docName.replace(/\s+/g, '_')}_${Date.now()}`;
      await storage.upload('pets', path, file);
      const url = storage.getPublicUrl('pets', path);
      const meta = { filename: file.name, uploaded_at: new Date().toISOString(), url };
      setDocs(prev => {
        const updated = { ...prev, [docName]: meta };
        localStorage.setItem("sanctum_ozzy_docs_meta", JSON.stringify(updated));
        return updated;
      });
      await sb.from("ozzy_docs").insert({ name: docName, filename: file.name, uploaded_at: meta.uploaded_at, url, user_id: user?.id });
    } catch {}
  };

  const downloadDoc = (docName) => {
    const meta = docs[docName];
    if (!meta?.url) return;
    const link = document.createElement("a");
    link.href = meta.url;
    link.download = meta.filename || docName;
    link.target = '_blank';
    link.click();
  };

  const startEditField = (key, value) => { setEditingField(key); setEditValue(value); };

  const commitField = (key) => {
    saveProfileField(key, editValue);
    setEditingField(null);
  };

  const commitCustomField = (idx) => {
    const updated = [...customFields];
    updated[idx] = { ...updated[idx], key: editCustomKey || updated[idx].key, value: editValue };
    saveCustomFields(updated);
    setEditingField(null);
    try { sb.from("ozzy_profile").upsert({ key: updated[idx].key, value: updated[idx].value, user_id: user?.id }, "key,user_id"); } catch {}
  };

  const deleteCustomField = async (field) => {
    const updated = customFields.filter(f => f.id !== field.id);
    saveCustomFields(updated);
    try { await sb.from('ozzy_profile').delete({ key: field.key, user_id: user?.id }); } catch {}
  };

  const addCustomField = () => {
    const newField = { key: "New field", value: "", id: Date.now().toString() };
    const updated = [...customFields, newField];
    saveCustomFields(updated);
    const idx = updated.length - 1;
    setEditingField(`custom_${idx}`);
    setEditValue("");
    setEditCustomKey("New field");
  };

  const addCustomDoc = () => {
    if (!newDocName.trim()) return;
    const updated = [...customDocs, { name: newDocName.trim(), id: Date.now().toString() }];
    setCustomDocs(updated);
    localStorage.setItem("sanctum_ozzy_custom_docs", JSON.stringify(updated));
    setNewDocName("");
    setAddingDoc(false);
  };

  const allDocs = [...DEFAULT_DOCS, ...customDocs.map(d => d.name)];
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

      {/* Profile card */}
      <div className="card mb18" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(16,185,129,0.08))", borderColor: "rgba(245,158,11,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
            <div
              onClick={() => photoInputRef.current?.click()}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "var(--bg2)",
                border: ozzyPhoto ? "2px solid var(--blue)" : "2px dashed var(--b2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", overflow: "hidden",
              }}>
              {photoUploading
                ? <div style={{ fontSize: 10, color: "var(--t3)" }}>…</div>
                : ozzyPhoto
                  ? <img src={ozzyPhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Ozzy" />
                  : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
              }
            </div>
            <div
              onClick={() => photoInputRef.current?.click()}
              style={{
                position: "absolute", bottom: 0, right: 0,
                width: 22, height: 22, borderRadius: "50%",
                background: "var(--blue)", border: "2px solid var(--bg1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={async e => {
                const file = e.target.files[0];
                if (!file) return;
                setPhotoUploading(true);
                try {
                  const path = `${user?.id || "shared"}/ozzy.jpg`;
                  const uploadRes = await storage.upload("pets", path, file);
                  if (uploadRes?.error) throw new Error(uploadRes.error.message || "Upload failed");
                  await sb.from("ozzy_profile").upsert({ key: "photo_url", value: path, user_id: user?.id }, "key,user_id");
                  setOzzyPhoto(storage.getPublicUrl("pets", path) + `?t=${Date.now()}`);
                } catch (err) {
                  console.error("[Ozzy] photo upload failed:", err);
                } finally {
                  setPhotoUploading(false);
                }
                e.target.value = "";
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>Ozzy</div>
            <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 12 }}>{profile["Breed"] || "Golden Retriever"} · Born {profile["Born"] || "November 2025"} · {profile["Location"] || "Dublin, Ireland"}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge amber">Belarmine</span>
              <span className="badge green">Vaccinated</span>
              <span className="badge blue">Microchipped</span>
              {profile["Daily calories"] && <span className="badge muted">{profile["Daily calories"]}</span>}
              {profile["Insurance"] && <span className="badge purple">Insurance: {profile["Insurance"]}</span>}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)", marginBottom: 4 }}>Age</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--amber)" }}>
              {calcOzzyAge(parseOzzyBorn(profile["Born"])) || "?"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {tabs.map(t => (
          <button key={t.id} className={`btn${activeTab === t.id ? " primary" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Key info</div></div>
            </div>
            {Object.entries(profile).map(([key, value]) => (
              <div key={key} className="fin-row" style={{ alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--t3)", fontWeight: 600 }}>{key}</span>
                {editingField === key ? (
                  <input
                    className="inp"
                    style={{ fontSize: 13, padding: "2px 8px", textAlign: "right", maxWidth: 180 }}
                    value={editValue}
                    autoFocus
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => commitField(key)}
                    onKeyDown={e => { if (e.key === "Enter") commitField(key); if (e.key === "Escape") setEditingField(null); }}
                  />
                ) : (
                  <span
                    style={{ fontSize: 13, color: "var(--t1)", fontWeight: 500, cursor: "pointer", padding: "2px 6px", borderRadius: 6 }}
                    onClick={() => startEditField(key, value)}
                    title="Click to edit"
                  >
                    {value || <span style={{ color: "var(--t3)" }}>—</span>}
                  </span>
                )}
              </div>
            ))}
            {customFields.map((field, idx) => (
              <div key={field.id} className="fin-row" style={{ alignItems: "center" }}>
                {editingField === `custom_${idx}` ? (
                  <input
                    className="inp"
                    style={{ fontSize: 12, padding: "2px 6px", width: 100 }}
                    value={editCustomKey}
                    onChange={e => setEditCustomKey(e.target.value)}
                  />
                ) : (
                  <span style={{ fontSize: 12, color: "var(--t3)", fontWeight: 600 }}>{field.key}</span>
                )}
                {editingField === `custom_${idx}` ? (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input
                      className="inp"
                      style={{ fontSize: 13, padding: "2px 8px", textAlign: "right", maxWidth: 140 }}
                      value={editValue}
                      autoFocus
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") commitCustomField(idx); if (e.key === "Escape") setEditingField(null); }}
                    />
                    <button className="btn xs primary" onClick={() => commitCustomField(idx)}><Icon name="check" size={11} /></button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span
                      style={{ fontSize: 13, color: "var(--t1)", fontWeight: 500, cursor: "pointer", padding: "2px 6px", borderRadius: 6 }}
                      onClick={() => { setEditingField(`custom_${idx}`); setEditValue(field.value); setEditCustomKey(field.key); }}
                      title="Click to edit"
                    >
                      {field.value || <span style={{ color: "var(--t3)" }}>—</span>}
                    </span>
                    <button className="btn xs danger" title="Delete field" onClick={() => deleteCustomField(field)}>
                      <Icon name="trash" size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button className="btn sm" style={{ marginTop: 10, width: "100%" }} onClick={addCustomField}>
              <Icon name="plus" size={13} /> Add field
            </button>
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--amber)" }}>{w.kg} kg</span>
                  <button className="btn xs danger" onClick={() => saveWeight(weight.filter(x => x.id !== w.id))}><Icon name="trash" size={11} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HEALTH */}
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
              {editingVet === v.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="grid-2" style={{ gap: 8 }}>
                    <input className="inp" type="date" value={v.date} onChange={e => saveVets(vets.map(x => x.id === v.id ? { ...x, date: e.target.value } : x))} />
                    <select className="inp" value={v.type} onChange={e => saveVets(vets.map(x => x.id === v.id ? { ...x, type: e.target.value } : x))}>
                      {VET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <input className="inp" type="date" value={v.next_due || ""} placeholder="Next due date" onChange={e => saveVets(vets.map(x => x.id === v.id ? { ...x, next_due: e.target.value } : x))} />
                  <textarea className="inp" value={v.notes || ""} placeholder="Notes..." style={{ minHeight: 60 }} onChange={e => saveVets(vets.map(x => x.id === v.id ? { ...x, notes: e.target.value } : x))} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn sm primary" onClick={() => setEditingVet(null)}>Done</button>
                    <button className="btn sm danger" onClick={() => deleteVet(v.id)}>Delete</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", marginBottom: 4 }}>{v.type}</div>
                    {v.notes && <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 4 }}>{v.notes}</div>}
                    {v.next_due && <div style={{ fontSize: 11, color: "var(--amber)", fontFamily: "var(--mono)" }}>Next due: {v.next_due}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--mono)" }}>{v.date}</span>
                    <button className="btn xs" onClick={() => setEditingVet(v.id)}><Icon name="edit" size={11} /></button>
                    <button className="btn xs danger" onClick={() => deleteVet(v.id)}><Icon name="trash" size={11} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DIET */}
      {activeTab === "diet" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><div className="card-title">Daily diet plan</div></div>
            {diet.map((m, idx) => (
              <div key={m.id} className="fin-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  {editingDiet === m.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <input className="inp" style={{ fontSize: 13, padding: "2px 8px" }} value={m.meal}
                        onChange={e => saveDiet(diet.map((d, i) => i === idx ? { ...d, meal: e.target.value } : d))} placeholder="Meal name" />
                      <div style={{ display: "flex", gap: 4 }}>
                        <input className="inp" style={{ fontSize: 11, padding: "2px 6px", flex: 1 }} value={m.food}
                          onChange={e => saveDiet(diet.map((d, i) => i === idx ? { ...d, food: e.target.value } : d))} placeholder="Food" />
                        <input className="inp" style={{ fontSize: 11, padding: "2px 6px", width: 70 }} value={m.time}
                          onChange={e => saveDiet(diet.map((d, i) => i === idx ? { ...d, time: e.target.value } : d))} placeholder="Time" />
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => setEditingDiet(m.id)} style={{ cursor: "pointer" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{m.meal}</div>
                      <div style={{ fontSize: 11, color: "var(--t3)" }}>{m.food} · {m.time}</div>
                    </div>
                  )}
                </div>
                {editingDiet === m.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <input className="inp" style={{ fontSize: 13, padding: "2px 8px", width: 70, textAlign: "right" }} value={m.amount}
                      onChange={e => saveDiet(diet.map((d, i) => i === idx ? { ...d, amount: e.target.value } : d))} placeholder="Amount" />
                    <button className="btn xs primary" onClick={() => setEditingDiet(null)}><Icon name="check" size={11} /></button>
                  </div>
                ) : (
                  <span onClick={() => setEditingDiet(m.id)} style={{ fontSize: 13, fontWeight: 600, color: "var(--amber)", fontFamily: "var(--mono)", cursor: "pointer", flexShrink: 0 }}>{m.amount}</span>
                )}
              </div>
            ))}
            <div style={{ marginTop: 14, padding: 12, background: "rgba(245,158,11,0.08)", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--amber)", fontWeight: 600, marginBottom: 4 }}><Icon name="alert" size={12} color="var(--amber)" /> Daily limit</div>
              <div style={{ fontSize: 13, color: "var(--t2)" }}>Maximum {profile["Daily calories"] || "600 kcal max"} per day. No human food. Fresh water always available.</div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Foods to avoid</div></div>
            {AVOID_FOODS.map(food => (
              <div key={food} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--b1)" }}>
                <span style={{ color: "var(--red)" }}>✕</span>
                <span style={{ fontSize: 13, color: "var(--t2)" }}>{food}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DOCUMENTS */}
      {activeTab === "documents" && (
        <div className="card">
          <div className="card-header"><div className="card-title">Documents & records</div></div>
          {allDocs.map(docName => {
            const uploaded = docs[docName];
            return (
              <div key={docName} className="fin-row">
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--t1)", fontWeight: 500 }}>
                  <Icon name="doc" size={13} color="var(--t3)" /> {docName}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {uploaded ? (
                    <button
                      className="btn xs"
                      style={{ color: "var(--grn)", borderColor: "rgba(16,185,129,0.4)", fontSize: 11 }}
                      onClick={() => downloadDoc(docName)}
                      title={`Download ${uploaded.filename}`}
                    >
                      <Icon name="check" size={11} color="var(--grn)" /> Uploaded
                    </button>
                  ) : (
                    <button className="btn xs" onClick={() => docInputRefs.current[docName]?.click()}>
                      <Icon name="plus" size={11} /> Upload
                    </button>
                  )}
                  <input
                    type="file"
                    accept="*/*"
                    style={{ display: "none" }}
                    ref={el => { docInputRefs.current[docName] = el; }}
                    onChange={e => handleDocUpload(docName, e.target.files[0])}
                  />
                </div>
              </div>
            );
          })}
          {addingDoc ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
              <input
                className="inp"
                style={{ flex: 1 }}
                value={newDocName}
                autoFocus
                onChange={e => setNewDocName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addCustomDoc(); if (e.key === "Escape") { setAddingDoc(false); setNewDocName(""); } }}
                placeholder="Document name..."
              />
              <button className="btn sm primary" onClick={addCustomDoc}>Add</button>
              <button className="btn sm" onClick={() => { setAddingDoc(false); setNewDocName(""); }}>Cancel</button>
            </div>
          ) : (
            <button className="btn sm" style={{ marginTop: 10, width: "100%" }} onClick={() => setAddingDoc(true)}>
              <Icon name="plus" size={13} /> Add document
            </button>
          )}
        </div>
      )}
    </div>
  );
}
