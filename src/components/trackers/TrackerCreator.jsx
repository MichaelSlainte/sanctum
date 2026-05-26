// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { useState, useRef, useEffect } from "react";
import { Icon, Modal } from "../shared";
import { sb, auth, ensureValidToken } from "../../lib/supabase";

const PALETTE = [
  '#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444',
  '#ec4899','#06b6d4','#f97316','#6366f1','#14b8a6',
];

const FIELD_TYPES = ['date','number','text','select','boolean'];

const TYPE_LABEL = { date:'Date', number:'Number', text:'Text', select:'Options', boolean:'Yes / No' };

const SYSTEM_PROMPT = `You are a tracker definition generator for Sanctum, a personal life organiser app.
The user describes what they want to track in one sentence.
Respond with ONLY valid JSON — no markdown, no explanation, nothing else.

Output this exact structure:
{
  "name": "Tracker Name",
  "icon": "single emoji",
  "color": "#hexcolor",
  "description": "One concise sentence describing what this tracker captures.",
  "weekly_goal": 5,
  "fields": [
    { "key": "date", "label": "Date", "type": "date" },
    { "key": "count", "label": "Count", "type": "number" },
    { "key": "type", "label": "Type", "type": "select", "options": ["Option1","Option2","Option3"] }
  ]
}

Rules:
- Always include "date" as the first field with type "date"
- Generate 3–6 fields total
- "select" fields must include an "options" array with 3–5 choices
- "number" fields: just count, reps, hours, km, etc.
- "text" for free-form notes (at most one text field)
- "boolean" for simple yes/no flags
- weekly_goal: realistic integer (how many times per week they'd log this)
- Pick one relevant emoji for the icon
- Color guide: fitness/workout=#ef4444, sleep/rest=#6366f1, reading/learning=#8b5cf6,
  meditation/mindfulness=#10b981, running/cardio=#f97316, food/drink=#06b6d4,
  habit/general=#3b82f6, social/relationships=#ec4899, coffee/caffeine=#7c3aed, money/finance=#f59e0b`;

export default function TrackerCreator({ onCreated, user }) {
  const [open, setOpen]           = useState(false);
  const [step, setStep]           = useState('input'); // 'input' | 'generating' | 'preview'
  const [description, setDescription] = useState('');
  const [preview, setPreview]     = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft]         = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const inputRef = useRef(null);

  const reset = () => {
    setStep('input'); setDescription(''); setPreview(null);
    setIsEditing(false); setDraft(null); setError('');
  };

  const close = () => { setOpen(false); setTimeout(reset, 220); };

  useEffect(() => {
    if (open && step === 'input') setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, step]);

  const generate = async () => {
    if (!description.trim() || step !== 'input') return;
    setStep('generating');
    setError('');
    try {
      await ensureValidToken();
      const getToken = () => localStorage.getItem("sanctum_token") || "";
      if (!getToken()) {
        setError("Please sign out and sign back in to use AI features.");
        setStep("input");
        return;
      }
      const doFetch = () => fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: description.trim() }],
        }),
      });
      let res = await doFetch();
      if (res.status === 401) {
        const refreshed = await auth.refreshSession();
        if (refreshed) res = await doFetch();
      }
      if (!res.ok) {
        setError(res.status === 401 ? 'Session expired — please sign out and sign back in.' : 'Something went wrong — try again.');
        setStep('input');
        return;
      }
      const data = await res.json();
      const text = (data.content?.[0]?.text || '').trim();
      const parsed = JSON.parse(text.replace(/```(?:json)?|```/g, '').trim());
      if (!parsed.name || !Array.isArray(parsed.fields)) throw new Error('invalid');
      setPreview(parsed);
      setStep('preview');
    } catch {
      setError('Something went wrong — try rephrasing your description.');
      setStep('input');
    }
  };

  const startEdit  = () => { setDraft(JSON.parse(JSON.stringify(preview))); setIsEditing(true); };
  const cancelEdit = () => { setDraft(null); setIsEditing(false); };
  const applyEdit  = () => { setPreview(draft); setIsEditing(false); setDraft(null); };

  const updateField = (idx, key, val) =>
    setDraft(p => { const f = [...p.fields]; f[idx] = { ...f[idx], [key]: val }; return { ...p, fields: f }; });

  const removeField = (idx) =>
    setDraft(p => ({ ...p, fields: p.fields.filter((_, i) => i !== idx) }));

  const addField = () =>
    setDraft(p => ({
      ...p,
      fields: [...p.fields, { key: `field_${Date.now()}`, label: 'New field', type: 'text' }],
    }));

  const save = async () => {
    if (!preview || saving) return;
    setSaving(true);
    try {
      const result = await sb.from('custom_trackers').insert({
        label: preview.name,
        icon: preview.icon,
        description: preview.description,
        weekly_goal: preview.weekly_goal || 3,
        color: preview.color || '#3b82f6',
        fields: preview.fields || [],
        user_id: user?.id,
      });
      const inserted = Array.isArray(result) ? result[0] : result;
      setSaving(false);
      if (inserted?.id) {
        onCreated?.(inserted);
        close();
      } else {
        setError('Failed to save tracker — try again.');
      }
    } catch {
      setSaving(false);
      setError('Failed to save tracker — try again.');
    }
  };

  const TypeChip = ({ type }) => (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 10,
      background: 'var(--bg2)', color: 'var(--t3)',
      border: '1px solid var(--b2)',
      textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600,
      flexShrink: 0,
    }}>
      {TYPE_LABEL[type] || type}
    </span>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 16px', borderRadius: 12,
          background: 'var(--blue)', color: '#fff',
          border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          boxShadow: '0 2px 8px rgba(56,139,253,0.3)',
          transition: 'opacity .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <Icon name="plus" size={14} color="#fff" />
        New Tracker
      </button>

      {open && (
        <Modal title="Create a tracker" onClose={close} wide>

          {/* ── INPUT ── */}
          {step === 'input' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.65 }}>
                Describe what you want to track and AI will generate the fields, icon, and colour for you.
              </div>
              <textarea
                ref={inputRef}
                className="inp"
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }}
                placeholder="e.g. I want to track my daily coffee intake and mood"
                style={{ resize: 'none', lineHeight: 1.65 }}
              />
              {error && (
                <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>
              )}
              <button
                className="btn primary"
                onClick={generate}
                disabled={!description.trim()}
                style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 7 }}
              >
                <Icon name="ai" size={14} color="#fff" />
                Generate with AI
              </button>
            </div>
          )}

          {/* ── GENERATING ── */}
          {step === 'generating' && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 14, padding: '44px 0',
            }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <span className="ai-dot" />
                <span className="ai-dot" />
                <span className="ai-dot" />
              </div>
              <div style={{ fontSize: 13, color: 'var(--t2)' }}>Designing your tracker…</div>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === 'preview' && preview && !isEditing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                border: `2px solid ${preview.color || 'var(--blue)'}`,
                borderRadius: 16, overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{
                  background: (preview.color || '#3b82f6') + '1a',
                  padding: '16px 18px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  borderBottom: '1px solid var(--b2)',
                }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: 14, flexShrink: 0,
                    background: (preview.color || '#3b82f6') + '28',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                  }}>
                    {preview.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)', marginBottom: 3 }}>
                      {preview.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.45 }}>
                      {preview.description}
                    </div>
                  </div>
                  {preview.weekly_goal > 0 && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 26, fontWeight: 700, color: preview.color, lineHeight: 1 }}>
                        {preview.weekly_goal}×
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--t3)' }}>per week</div>
                    </div>
                  )}
                </div>

                {/* Fields */}
                <div style={{ padding: '12px 18px' }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '.6px',
                    textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10,
                  }}>
                    Fields
                  </div>
                  {preview.fields.map((f, i) => (
                    <div key={f.key || i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 0',
                      borderBottom: i < preview.fields.length - 1 ? '1px solid var(--b2)' : 'none',
                    }}>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>
                        {f.label}
                      </div>
                      <TypeChip type={f.type} />
                      {f.type === 'select' && f.options?.length > 0 && (
                        <div style={{
                          fontSize: 11, color: 'var(--t3)',
                          maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {f.options.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={reset} style={{ flex: 1 }}>
                  Start over
                </button>
                <button className="btn" onClick={startEdit} style={{ flex: 1 }}>
                  Edit
                </button>
                <button
                  className="btn primary"
                  onClick={save}
                  disabled={saving}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                >
                  {saving ? 'Saving…' : <><Icon name="check" size={14} color="#fff" /> Save tracker</>}
                </button>
              </div>
            </div>
          )}

          {/* ── EDIT ── */}
          {step === 'preview' && isEditing && draft && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Name / icon / goal row */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="inp"
                  value={draft.icon}
                  onChange={e => setDraft(p => ({ ...p, icon: e.target.value }))}
                  maxLength={2}
                  style={{ width: 52, textAlign: 'center', fontSize: 22, padding: '6px 4px', flexShrink: 0 }}
                />
                <input
                  className="inp"
                  value={draft.name}
                  onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
                  placeholder="Tracker name"
                  style={{ flex: 1 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <input
                    className="inp"
                    type="number"
                    min={1} max={30}
                    value={draft.weekly_goal || 3}
                    onChange={e => setDraft(p => ({ ...p, weekly_goal: Math.max(1, parseInt(e.target.value) || 1) }))}
                    style={{ width: 52, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap' }}>/ week</span>
                </div>
              </div>

              {/* Colour */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                  Colour
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PALETTE.map(c => (
                    <button
                      key={c}
                      onClick={() => setDraft(p => ({ ...p, color: c }))}
                      style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: c, border: 'none', cursor: 'pointer',
                        outline: draft.color === c ? `3px solid ${c}` : '2px solid transparent',
                        outlineOffset: 2, transition: 'outline .1s',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Fields */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                  Fields
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {draft.fields.map((f, idx) => (
                    <div key={f.key || idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        className="inp"
                        value={f.label}
                        onChange={e => updateField(idx, 'label', e.target.value)}
                        placeholder="Field label"
                        style={{ flex: 1, fontSize: 13 }}
                      />
                      <select
                        className="inp"
                        value={f.type}
                        onChange={e => updateField(idx, 'type', e.target.value)}
                        style={{ width: 104, fontSize: 12 }}
                      >
                        {FIELD_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                      </select>
                      <button
                        onClick={() => removeField(idx)}
                        style={{
                          background: 'var(--bg2)', border: '1px solid var(--b2)',
                          borderRadius: 6, padding: '0 10px', height: 36,
                          cursor: 'pointer', color: 'var(--t3)', flexShrink: 0,
                          fontSize: 16, lineHeight: 1,
                        }}
                      >×</button>
                    </div>
                  ))}
                  {draft.fields.length < 8 && (
                    <button
                      className="btn"
                      onClick={addField}
                      style={{ alignSelf: 'flex-start', fontSize: 12, padding: '6px 12px', marginTop: 2 }}
                    >
                      + Add field
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={cancelEdit} style={{ flex: 1 }}>Cancel</button>
                <button
                  className="btn primary"
                  onClick={applyEdit}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                >
                  <Icon name="check" size={14} color="#fff" /> Apply changes
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
