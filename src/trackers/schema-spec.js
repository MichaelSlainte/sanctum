// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app

/**
 * Sanctum v2 — Tracker Schema Specification
 *
 * This file is the single source of truth for the JSONB schema format shared
 * between the AI prompt-builder (api/chat.js) and the generic TrackerRenderer.
 *
 * A tracker_instance.schema value is an array of FieldDef objects (see below).
 * A tracker_entry.data value is a plain { [key]: value } object whose keys and
 * value shapes must conform to the FieldDef with the matching key.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Top-level tracker_instance.schema shape
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * schema: FieldDef[]
 *
 * Example:
 * [
 *   { key: "mood", label: "Mood", type: "scale", required: true, min: 1, max: 10 },
 *   { key: "notes", label: "Notes", type: "textarea", required: false },
 * ]
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FieldDef — base shape (all types)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * {
 *   key:      string   — snake_case identifier; must be unique within a schema;
 *                        used as the key in tracker_entry.data
 *   label:    string   — human-readable display label shown in forms & renderer
 *   type:     FieldType (see FIELD_TYPES below)
 *   required: boolean  — if true, the renderer blocks submission when value is empty
 *   ...type-specific config fields (documented per-type below)
 * }
 */

// ─────────────────────────────────────────────────────────────────────────────
// Field type registry
// ─────────────────────────────────────────────────────────────────────────────

export const FIELD_TYPES = {
  // ── TEXT ──────────────────────────────────────────────────────────────────
  // Single-line free text input.
  // Entry value: string
  // Config: none
  // Example: { key: "activity", label: "Activity", type: "text", required: true }
  text: "text",

  // ── TEXTAREA ──────────────────────────────────────────────────────────────
  // Multi-line free text input. Renders as <textarea>.
  // Entry value: string
  // Config:
  //   rows?: number  — hint for visible row count (default 3)
  // Example: { key: "notes", label: "Notes", type: "textarea", required: false, rows: 4 }
  textarea: "textarea",

  // ── NUMBER ────────────────────────────────────────────────────────────────
  // Numeric input (integer or decimal).
  // Entry value: number
  // Config:
  //   min?:  number  — minimum allowed value
  //   max?:  number  — maximum allowed value
  //   step?: number  — increment step (default 1; use 0.1 for decimals)
  //   unit?: string  — display suffix, e.g. "km", "kg", "reps"
  // Example: { key: "distance", label: "Distance", type: "number", required: true, min: 0, step: 0.1, unit: "km" }
  number: "number",

  // ── CURRENCY ──────────────────────────────────────────────────────────────
  // Monetary amount. Renders as a number input styled with a currency symbol.
  // Entry value: number (stored as plain numeric — no currency conversion)
  // Config:
  //   currency?: string  — ISO 4217 code, e.g. "EUR", "USD", "GBP" (default "EUR")
  //   min?:      number  — minimum value (default 0)
  // Example: { key: "amount", label: "Amount", type: "currency", required: true, currency: "EUR" }
  currency: "currency",

  // ── DATE ──────────────────────────────────────────────────────────────────
  // Calendar date without time. Renders as <input type="date">.
  // Entry value: string in ISO 8601 format "YYYY-MM-DD"
  // Config: none
  // Example: { key: "event_date", label: "Date", type: "date", required: true }
  date: "date",

  // ── TIME ──────────────────────────────────────────────────────────────────
  // Wall-clock time without date. Renders as <input type="time">.
  // Entry value: string in "HH:MM" (24-hour) format
  // Config: none
  // Example: { key: "wake_time", label: "Wake time", type: "time", required: false }
  time: "time",

  // ── SELECT ────────────────────────────────────────────────────────────────
  // Single-choice dropdown from a fixed option list.
  // Entry value: string matching one of the option values
  // Config:
  //   options: Array<{ value: string, label: string }>  — REQUIRED; at least 2 items
  // Example:
  //   {
  //     key: "category", label: "Category", type: "select", required: true,
  //     options: [
  //       { value: "cardio",    label: "Cardio" },
  //       { value: "strength",  label: "Strength" },
  //       { value: "mobility",  label: "Mobility" },
  //     ]
  //   }
  select: "select",

  // ── BOOLEAN ───────────────────────────────────────────────────────────────
  // True/false toggle. Renders as a styled checkbox or toggle switch.
  // Entry value: boolean
  // Config: none
  // Example: { key: "completed", label: "Completed?", type: "boolean", required: false }
  boolean: "boolean",

  // ── SCALE ─────────────────────────────────────────────────────────────────
  // Integer rating on a bounded scale. Renders as segmented buttons or a slider.
  // Entry value: number (integer within [min, max])
  // Config:
  //   min:        number  — REQUIRED; lower bound (typically 1)
  //   max:        number  — REQUIRED; upper bound (typically 10)
  //   minLabel?:  string  — label shown at the low end, e.g. "Terrible"
  //   maxLabel?:  string  — label shown at the high end, e.g. "Excellent"
  // Example:
  //   {
  //     key: "energy", label: "Energy level", type: "scale", required: true,
  //     min: 1, max: 10, minLabel: "Drained", maxLabel: "Energised"
  //   }
  scale: "scale",
};

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns an array of validation error strings for a FieldDef.
 * Empty array means the definition is valid.
 */
export function validateFieldDef(field) {
  const errors = [];

  if (!field.key || !/^[a-z][a-z0-9_]*$/.test(field.key)) {
    errors.push(`key must be snake_case and start with a letter (got "${field.key}")`);
  }
  if (!field.label || typeof field.label !== "string") {
    errors.push("label is required and must be a string");
  }
  if (!FIELD_TYPES[field.type]) {
    errors.push(`type "${field.type}" is not in FIELD_TYPES`);
  }
  if (typeof field.required !== "boolean") {
    errors.push("required must be a boolean");
  }

  if (field.type === "select") {
    if (!Array.isArray(field.options) || field.options.length < 2) {
      errors.push("select fields must have an options array with at least 2 items");
    } else {
      field.options.forEach((opt, i) => {
        if (!opt.value || !opt.label) {
          errors.push(`select options[${i}] must have value and label`);
        }
      });
    }
  }

  if (field.type === "scale") {
    if (typeof field.min !== "number" || typeof field.max !== "number") {
      errors.push("scale fields require numeric min and max");
    } else if (field.min >= field.max) {
      errors.push("scale min must be less than max");
    }
  }

  return errors;
}

/**
 * Returns an array of validation error strings for a complete schema array.
 * Also checks for duplicate keys.
 */
export function validateSchema(schema) {
  if (!Array.isArray(schema) || schema.length === 0) {
    return ["schema must be a non-empty array of FieldDef objects"];
  }

  const errors = [];
  const seenKeys = new Set();

  schema.forEach((field, i) => {
    if (seenKeys.has(field.key)) {
      errors.push(`duplicate key "${field.key}" at index ${i}`);
    } else {
      seenKeys.add(field.key);
    }
    validateFieldDef(field).forEach((e) => errors.push(`field[${i}] (${field.key}): ${e}`));
  });

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default value helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the appropriate empty/default value for a field type.
 * Used to initialise blank entry forms in TrackerRenderer.
 */
export function defaultValueForField(field) {
  switch (field.type) {
    case FIELD_TYPES.text:
    case FIELD_TYPES.textarea:
    case FIELD_TYPES.date:
    case FIELD_TYPES.time:
      return "";
    case FIELD_TYPES.number:
    case FIELD_TYPES.currency:
      return "";
    case FIELD_TYPES.select:
      return "";
    case FIELD_TYPES.boolean:
      return false;
    case FIELD_TYPES.scale:
      return null;
    default:
      return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reference example schemas (used in AI prompt context and unit tests)
// ─────────────────────────────────────────────────────────────────────────────

export const EXAMPLE_SCHEMAS = {
  // Demonstrates every field type in one schema
  kitchen_sink: [
    { key: "title",       label: "Title",         type: "text",     required: true },
    { key: "notes",       label: "Notes",          type: "textarea", required: false, rows: 3 },
    { key: "count",       label: "Count",          type: "number",   required: true, min: 0, step: 1, unit: "reps" },
    { key: "cost",        label: "Cost",           type: "currency", required: false, currency: "EUR" },
    { key: "date",        label: "Date",           type: "date",     required: true },
    { key: "start_time",  label: "Start time",     type: "time",     required: false },
    {
      key: "category", label: "Category", type: "select", required: true,
      options: [
        { value: "a", label: "Option A" },
        { value: "b", label: "Option B" },
        { value: "c", label: "Option C" },
      ],
    },
    { key: "done",        label: "Done?",          type: "boolean",  required: false },
    {
      key: "rating", label: "Rating", type: "scale", required: true,
      min: 1, max: 10, minLabel: "Poor", maxLabel: "Excellent",
    },
  ],

  // Realistic: workout tracker
  workout: [
    { key: "exercise",  label: "Exercise",      type: "text",     required: true },
    {
      key: "type", label: "Type", type: "select", required: true,
      options: [
        { value: "cardio",   label: "Cardio" },
        { value: "strength", label: "Strength" },
        { value: "mobility", label: "Mobility" },
      ],
    },
    { key: "duration",  label: "Duration",      type: "number",   required: true, min: 1, unit: "min" },
    { key: "date",      label: "Date",          type: "date",     required: true },
    { key: "energy",    label: "Energy level",  type: "scale",    required: true, min: 1, max: 10 },
    { key: "notes",     label: "Notes",         type: "textarea", required: false },
  ],

  // Realistic: expense tracker
  expense: [
    { key: "label",     label: "Description",   type: "text",     required: true },
    { key: "amount",    label: "Amount",         type: "currency", required: true, currency: "EUR" },
    {
      key: "category", label: "Category", type: "select", required: true,
      options: [
        { value: "food",        label: "Food & drink" },
        { value: "transport",   label: "Transport" },
        { value: "shopping",    label: "Shopping" },
        { value: "other",       label: "Other" },
      ],
    },
    { key: "date",      label: "Date",           type: "date",     required: true },
    { key: "notes",     label: "Notes",          type: "textarea", required: false },
  ],
};
