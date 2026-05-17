// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app

import { useState } from "react";
import { defaultValueForField, FIELD_TYPES } from "./schema-spec.js";

const CURRENCY_SYMBOLS = {
  EUR: "€", USD: "$", GBP: "£", JPY: "¥", CHF: "Fr", CAD: "CA$", AUD: "A$",
};

function buildInitial(schema, initialValues = {}) {
  const result = {};
  for (const field of schema) {
    result[field.key] = field.key in initialValues
      ? initialValues[field.key]
      : defaultValueForField(field);
  }
  return result;
}

// ─── Scale (segmented buttons or range slider) ────────────────────────────────
function ScaleField({ field, value, onChange }) {
  const { min, max, minLabel, maxLabel } = field;
  const useSlider = (max - min) > 9;

  if (useSlider) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {minLabel && <span style={{ fontSize: 11, color: "var(--t3)", whiteSpace: "nowrap" }}>{minLabel}</span>}
          <input
            type="range"
            min={min}
            max={max}
            value={value ?? min}
            onChange={e => onChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: "var(--blue)", cursor: "pointer" }}
          />
          {maxLabel && <span style={{ fontSize: 11, color: "var(--t3)", whiteSpace: "nowrap" }}>{maxLabel}</span>}
        </div>
        <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: value != null ? "var(--blue)" : "var(--t3)", marginTop: 6 }}>
          {value ?? "—"}
        </div>
      </div>
    );
  }

  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      {(minLabel || maxLabel) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "var(--t3)" }}>{minLabel ?? ""}</span>
          <span style={{ fontSize: 11, color: "var(--t3)" }}>{maxLabel ?? ""}</span>
        </div>
      )}
      <div className="tr-scale-row">
        {steps.map(n => (
          <button
            key={n}
            type="button"
            className={`tr-scale-btn${value === n ? " active" : ""}`}
            onClick={() => onChange(value === n ? null : n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Boolean toggle switch ────────────────────────────────────────────────────
function BooleanField({ value, onChange }) {
  return (
    <button
      type="button"
      className={`tr-toggle${value ? " on" : ""}`}
      onClick={() => onChange(!value)}
      aria-pressed={value}
    />
  );
}

// ─── Individual field renderer ────────────────────────────────────────────────
function FieldRenderer({ field, value, onChange, error }) {
  const sym = CURRENCY_SYMBOLS[field.currency ?? "EUR"] ?? "€";
  const errClass = error ? " tr-inp-err" : "";

  const label = (
    <label className="form-label">
      {field.label}
      {field.required && <span style={{ color: "var(--red)", marginLeft: 3 }}>*</span>}
    </label>
  );

  const errMsg = error ? <div className="tr-err-msg">{error}</div> : null;

  switch (field.type) {
    case FIELD_TYPES.text:
      return (
        <div className="form-row">
          {label}
          <input className={`inp${errClass}`} type="text" value={value} onChange={e => onChange(e.target.value)} />
          {errMsg}
        </div>
      );

    case FIELD_TYPES.textarea:
      return (
        <div className="form-row">
          {label}
          <textarea className={`inp${errClass}`} rows={field.rows ?? 3} value={value} onChange={e => onChange(e.target.value)} />
          {errMsg}
        </div>
      );

    case FIELD_TYPES.number:
      return (
        <div className="form-row">
          {label}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              className={`inp${errClass}`}
              type="number"
              value={value}
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}
              style={{ flex: 1 }}
            />
            {field.unit && (
              <span style={{ fontSize: 12, color: "var(--t3)", fontWeight: 600, whiteSpace: "nowrap", minWidth: 28 }}>
                {field.unit}
              </span>
            )}
          </div>
          {errMsg}
        </div>
      );

    case FIELD_TYPES.currency:
      return (
        <div className="form-row">
          {label}
          <div className="tr-currency-wrap">
            <span className="tr-currency-sym">{sym}</span>
            <input
              className={`inp tr-currency-inp${errClass}`}
              type="number"
              min={field.min ?? 0}
              step="0.01"
              value={value}
              onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          {errMsg}
        </div>
      );

    case FIELD_TYPES.date:
      return (
        <div className="form-row">
          {label}
          <input className={`inp${errClass}`} type="date" value={value} onChange={e => onChange(e.target.value)} />
          {errMsg}
        </div>
      );

    case FIELD_TYPES.time:
      return (
        <div className="form-row">
          {label}
          <input className={`inp${errClass}`} type="time" value={value} onChange={e => onChange(e.target.value)} />
          {errMsg}
        </div>
      );

    case FIELD_TYPES.select:
      return (
        <div className="form-row">
          {label}
          <select className={`inp${errClass}`} value={value} onChange={e => onChange(e.target.value)}>
            <option value="">Select…</option>
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errMsg}
        </div>
      );

    case FIELD_TYPES.boolean:
      return (
        <div className="form-row">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {label}
            <BooleanField value={value} onChange={onChange} />
          </div>
          {errMsg}
        </div>
      );

    case FIELD_TYPES.scale:
      return (
        <div className="form-row">
          {label}
          <ScaleField field={field} value={value} onChange={onChange} />
          {errMsg}
        </div>
      );

    default:
      return null;
  }
}

// ─── Public component ─────────────────────────────────────────────────────────
export default function TrackerRenderer({ schema, initialValues = {}, onSave, onCancel }) {
  const [values, setValues] = useState(() => buildInitial(schema, initialValues));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key, val) => {
    setValues(v => ({ ...v, [key]: val }));
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const validate = () => {
    const errs = {};
    for (const field of schema) {
      if (!field.required) continue;
      const v = values[field.key];
      if (v === "" || v === null || v === undefined) {
        errs[field.key] = "Required";
      }
    }
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try { await onSave(values); }
    finally { setSaving(false); }
  };

  return (
    <div>
      {schema.map(field => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={val => set(field.key, val)}
          error={errors[field.key] ?? null}
        />
      ))}
      <div className="modal-actions">
        <button className="btn" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="btn primary" type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
