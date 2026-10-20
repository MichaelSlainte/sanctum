// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { useState, useEffect, useRef, useCallback } from "react";
import { sb, auth } from "../lib/supabase";
import { Icon, Modal, DEFAULT_NOTEBOOKS } from "./shared";
import { OWNER_IDS } from "./trackers/TrackerHub";
import { useCrypto } from "../lib/CryptoContext.jsx";
import { encrypt, decrypt, isEncrypted, isEncryptedWithoutKey } from "../lib/crypto.js";
import { unlockWithPassword, encryptionEnabled, encryptPlaintextNotes } from "../lib/encryptionKey.js";

const sanitizeHtml = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('script').forEach(s => s.remove());
  div.querySelectorAll('iframe,object,embed,form').forEach(el => el.remove());
  div.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      if (attr.name.startsWith('on') || attr.name === 'href' && attr.value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return div.innerHTML;
};

const mdToHtmlWysiwyg = (text) => {
  if (!text) return '';
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inlineFmt = s => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*|_)_([^_]+)_(?!\*|_)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
  const lines = text.split('\n');
  let html = '', inCode = false, codeBuf = [];
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) { html += `<div class="we-codeblock"><pre><code>${esc(codeBuf.join('\n'))}</code></pre></div>`; codeBuf = []; inCode = false; }
      else { inCode = true; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }
    const hm = line.match(/^(#{1,3}) (.*)/);
    if (hm) { html += `<div class="we-h we-h${hm[1].length}">${inlineFmt(hm[2] || '')}</div>`; continue; }
    if (line.trim() === '---') { html += `<div class="we-hr"><hr></div>`; continue; }
    // Checklist item. The trailing space after "]" is OPTIONAL so that an EMPTY
    // checklist item survives the round-trip: htmlToMd emits "- [ ] " but the final
    // .trim() strips the trailing space to "- [ ]", which previously fell through to
    // the bullet branch below and rendered as a plain list item with literal "[ ]".
    if (/^[-*] \[[x ]\]/i.test(line)) {
      const checked = /^[-*] \[x\]/i.test(line);
      const content = line.replace(/^[-*] \[[x ]\] ?/i, '');
      html += `<div class="we-check"><span class="we-checkbox${checked?' checked':''}" contenteditable="false">${checked?'☑':'☐'}</span>${inlineFmt(content)}</div>`;
      continue;
    }
    if (/^[-*] /.test(line)) { html += `<div class="we-ul"><span class="we-bullet" contenteditable="false">•</span>${inlineFmt(line.slice(2))}</div>`; continue; }
    if (/^\d+\. /.test(line)) { const m = line.match(/^\d+\. (.*)/); html += `<div class="we-ol">${inlineFmt(m?m[1]:line)}</div>`; continue; }
    if (line.trim() === '') { html += `<div class="we-line"><br></div>`; continue; }
    html += `<div class="we-line">${inlineFmt(line)}</div>`;
  }
  if (inCode) html += `<div class="we-codeblock"><pre><code>${esc(codeBuf.join('\n'))}</code></pre></div>`;
  return html || `<div class="we-line"><br></div>`;
};


const htmlToMd = (el) => {
  if (!el) return '';
  let md = '';
  function walkNode(node) {
    if (node.nodeType === 3) { md += node.textContent; return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName;
    const cls = node.className || '';
    const kids = () => { for (const c of node.childNodes) walkNode(c); };
    if (tag === 'BR') { md += '\n'; return; }
    if (tag === 'STRONG' || tag === 'B') { md += '**'; kids(); md += '**'; return; }
    if (tag === 'EM' || tag === 'I') { md += '_'; kids(); md += '_'; return; }
    if (tag === 'CODE' && node.parentElement?.tagName !== 'PRE') { md += '`'; kids(); md += '`'; return; }
    if (tag === 'U') { md += '<u>'; kids(); md += '</u>'; return; }
    if (tag === 'A') { const href = node.getAttribute('href')||''; let t=''; node.childNodes.forEach(c=>{if(c.nodeType===3)t+=c.textContent;}); md += `[${t||node.textContent}](${href})`; return; }
    if (tag === 'HR') { md += '---\n'; return; }
    if (tag === 'PRE') { const code = node.querySelector('code'); md += '```\n' + (code?code.textContent:node.textContent) + '\n```\n'; return; }
    if (tag === 'SPAN') {
      if (cls.includes('we-bullet') || cls.includes('we-checkbox') || cls.includes('we-collapse-btn')) return;
      kids(); return;
    }
    if (tag === 'DIV' || tag === 'P') {
      const before = md.length;
      if (cls.includes('we-h1')) { md += '# '; kids(); if (!md.endsWith('\n')) md += '\n'; return; }
      if (cls.includes('we-h2')) { md += '## '; kids(); if (!md.endsWith('\n')) md += '\n'; return; }
      if (cls.includes('we-h3')) { md += '### '; kids(); if (!md.endsWith('\n')) md += '\n'; return; }
      if (cls.includes('we-hr')) { md += '---\n'; return; }
      if (cls.includes('we-codeblock')) { const pre = node.querySelector('pre'); const code = node.querySelector('code'); md += '```\n' + (code?code.textContent:(pre?pre.textContent:node.textContent)) + '\n```\n'; return; }
      if (cls.includes('we-ul')) { md += '- '; kids(); if (!md.endsWith('\n')) md += '\n'; return; }
      if (cls.includes('we-check')) {
        const chk = node.querySelector('.we-checkbox'); const checked = chk?.classList.contains('checked');
        md += checked ? '- [x] ' : '- [ ] '; kids(); if (!md.endsWith('\n')) md += '\n'; return;
      }
      if (cls.includes('we-ol')) { md += '1. '; kids(); if (!md.endsWith('\n')) md += '\n'; return; }
      // plain div / we-line — if this is the root el, just walk children
      if (node === el) { kids(); return; }
      if (md.length > 0 && !md.endsWith('\n')) md += '\n';
      kids();
      if (md.length > before && !md.endsWith('\n')) md += '\n';
      return;
    }
    kids();
  }
  walkNode(el);
  return md.replace(/\n{3,}/g, '\n\n').trim();
};

// Normalise the editor's top-level structure so every visual line is a single, flat
// block element. contentEditable leaves bare text nodes and unclassed <div>s, and the
// old "treat the body as markdown unless it starts with <" reload path could wrap a
// whole multi-line HTML body into ONE block with the other lines nested inside it.
// Both broke block formatting: applying Checklist/Bullet to such content collapsed
// every line into a single item. This flattens nested block <div>s up to the top level
// and wraps stray text/inline nodes in a we-line div. Idempotent; safe on every load.
const BLOCK_SELECTOR = '.we-line,.we-h,.we-ul,.we-ol,.we-check,.we-hr,.we-codeblock';
const normalizeBlocks = (ed) => {
  if (!ed) return;
  // Pass 1 — split any plain/we-line block that has nested block <div>s into separate
  // top-level blocks (leading inline content becomes its own line). Headings, checks,
  // code blocks and tables are left untouched.
  for (let again = true, guard = 0; again && guard < 200; guard++) {
    again = false;
    for (const child of [...ed.children]) {
      if (child.tagName !== 'DIV') continue;
      const cls = child.className || '';
      if (!(cls === '' || cls.includes('we-line'))) continue;
      if (child.querySelector('table,pre')) continue;
      if (!child.querySelector(':scope > div')) continue;
      const frag = document.createDocumentFragment();
      const lead = document.createElement('div'); lead.className = 'we-line';
      while (child.firstChild && !(child.firstChild.nodeType === 1 && child.firstChild.tagName === 'DIV')) {
        lead.appendChild(child.firstChild);
      }
      if (lead.childNodes.length) { if (!lead.innerHTML.trim()) lead.innerHTML = '<br>'; frag.appendChild(lead); }
      while (child.firstChild) frag.appendChild(child.firstChild); // hoist the nested divs
      child.replaceWith(frag);
      again = true; break;
    }
  }
  // Pass 2 — wrap stray top-level text/inline nodes and tag unclassed <div>s as we-line.
  for (const node of [...ed.childNodes]) {
    if (node.nodeType === 3) {
      if (!node.textContent.trim()) { node.remove(); continue; }
      const w = document.createElement('div'); w.className = 'we-line';
      node.replaceWith(w); w.appendChild(node);
    } else if (node.nodeType === 1 && node.tagName === 'DIV' && !node.className.trim()) {
      node.className = 'we-line';
      if (!node.innerHTML.trim()) node.innerHTML = '<br>';
    } else if (node.nodeType === 1 && node.tagName !== 'DIV' && node.tagName !== 'TABLE' && !node.matches(BLOCK_SELECTOR)) {
      const w = document.createElement('div'); w.className = 'we-line';
      node.replaceWith(w); w.appendChild(node);
    }
  }
};

// Convert arbitrary/pasted rich HTML into FLAT Sanctum block markup (we-h/we-ol/
// we-ul/we-line), preserving inline bold/italic/code/links and stripping foreign
// classes & styles. This is what stops external rich content (e.g. a Claude reply or
// a web page) from being embedded verbatim — headings/paragraphs/ordered-lists nested
// inside one block — which is exactly how notes got collapse-corrupted before.
const _RICH_KEEP_ATTR = { A: ['href', 'target', 'rel'] };
const _RICH_HEADING = { H1: 'we-h we-h1', H2: 'we-h we-h2', H3: 'we-h we-h3', H4: 'we-h we-h3', H5: 'we-h we-h3', H6: 'we-h we-h3' };
const cleanInlineHtml = (el) => {
  const tmp = el.cloneNode(true);
  tmp.querySelectorAll('*').forEach((n) => {
    const keep = _RICH_KEEP_ATTR[n.tagName] || [];
    [...n.attributes].forEach((a) => { if (!keep.includes(a.name)) n.removeAttribute(a.name); });
  });
  return tmp.innerHTML.replace(/\s+/g, ' ').trim();
};
const richHtmlToBlocks = (sourceHtml) => {
  const root = document.createElement('div');
  root.innerHTML = sourceHtml;
  const out = [];
  const push = (cls, inner) => { if (inner && inner.trim()) out.push(`<div class="${cls}">${inner}</div>`); };
  const walk = (container) => {
    for (const node of [...container.childNodes]) {
      if (node.nodeType === 3) { const t = node.textContent.replace(/\s+/g, ' ').trim(); if (t) push('we-line', t); continue; }
      if (node.nodeType !== 1) continue;
      const tag = node.tagName;
      if (tag === 'SPAN' && node.classList.contains('we-checkbox')) continue; // drop stray checkbox glyphs
      if (_RICH_HEADING[tag]) push(_RICH_HEADING[tag], cleanInlineHtml(node));
      else if (tag === 'OL') { for (const li of node.children) if (li.tagName === 'LI') push('we-ol', cleanInlineHtml(li)); }
      else if (tag === 'UL') { for (const li of node.children) if (li.tagName === 'LI') push('we-ul', `<span class="we-bullet" contenteditable="false">•</span>${cleanInlineHtml(li)}`); }
      else if (tag === 'P' || tag === 'DIV') {
        if (node.querySelector('h1,h2,h3,h4,h5,h6,p,ol,ul')) walk(node);
        else push(node.classList && node.classList.contains('we-check') ? 'we-check' : 'we-line', cleanInlineHtml(node));
      } else if (tag === 'BR') { /* skip standalone breaks between blocks */ }
      else push('we-line', cleanInlineHtml(node));
    }
  };
  walk(root);
  return out.join('');
};

// Insert block HTML at the caret as TOP-LEVEL siblings of the current block (never
// nested), so a paste can't recreate the collapse. Falls back to appending.
const insertBlocksAtCaret = (ed, blockHtml) => {
  if (!ed || !blockHtml) return;
  const frag = document.createRange().createContextualFragment(blockHtml);
  const lastNew = frag.lastElementChild;
  const sel = window.getSelection();
  let block = sel && sel.rangeCount ? sel.getRangeAt(0).startContainer : null;
  while (block && block.parentElement && block.parentElement !== ed) block = block.parentElement;
  if (block && block.parentElement === ed) block.after(frag);
  else ed.appendChild(frag);
  if (lastNew) { const r = document.createRange(); r.selectNodeContents(lastNew); r.collapse(false); sel.removeAllRanges(); sel.addRange(r); }
};

// Persists across Notes unmount/remount within the same browser session
const _sessionUnlockedNotes = new Set();

// New notes created with no key get a temporary id and no DB row until unlock.
const isDraftId = (id) => typeof id === 'string' && id.startsWith('draft-');

// ─── NOTES ───────────────────────────────────────────────────────────────────
export default function Notes({ user }) {
  const { key: cryptoKey, setKey: setCryptoKey, keyLoading, keyError, setKeyError } = useCrypto();
  const cryptoKeyRef = useRef(cryptoKey);
  useEffect(() => { cryptoKeyRef.current = cryptoKey; }, [cryptoKey]);
  // ── Notebooks (Supabase + localStorage backed) ───────────────────────
  // Default notebooks (Finance/Travel/Career/Personal/Ideas) are only for the app
  // owners; everyone else starts with an empty notebook list.
  const isOwner = OWNER_IDS.includes(user?.id);
  const [notebooks, setNotebooks] = useState(() => {
    try { const s = localStorage.getItem('sanctum_notebooks_v2'); if (s) return JSON.parse(s); } catch {}
    return isOwner ? DEFAULT_NOTEBOOKS : [];
  });
  // Strict read: a failed request must never look like "no notebooks", or the
  // owner branch below would seed DEFAULT_NOTEBOOKS over the real tree.
  const loadNotebooks = useCallback(() => {
    if (!user?.id) return;
    const singletonId = `singleton_${user.id}`;
    sb.from('notebooks').select('*', '', '', { strict: true }).then((rows) => {
      const singleton = rows.find(r => r.id === singletonId);
      if (singleton && Array.isArray(singleton.data) && singleton.data.length > 0) {
        // One-time self-heal: non-owner accounts that were seeded with the default
        // notebooks before the owner gate shipped. If a non-owner's row is exactly the
        // default seed (matched by labels), clear it — they have no real data to protect.
        // Owners are NEVER touched. A non-owner who created/renamed their own notebooks
        // (different labels) is left completely alone.
        const isDefaultSeed =
          singleton.data.map(n => n.label).join('|') ===
          DEFAULT_NOTEBOOKS.map(n => n.label).join('|');
        if (!isOwner && isDefaultSeed) {
          setNotebooks([]);
          localStorage.setItem('sanctum_notebooks_v2', JSON.stringify([]));
          sb.from('notebooks').upsert({ id: singletonId, user_id: user.id, data: [], updated_at: new Date().toISOString() }, 'id').catch(() => {});
        } else {
          // Valid data in Supabase — use it
          setNotebooks(singleton.data);
          localStorage.setItem('sanctum_notebooks_v2', JSON.stringify(singleton.data));
        }
      } else if (isOwner) {
        // No singleton or empty data (owner new user / first Tamara login) — seed with defaults
        sb.from('notebooks').upsert({ id: singletonId, user_id: user.id, data: DEFAULT_NOTEBOOKS, updated_at: new Date().toISOString() }, 'id').catch(() => {});
      } else {
        // New non-owner user with no notebooks yet — show a genuine EMPTY state rather
        // than seeding hardcoded starter notebooks. Their first notebook is created on
        // demand when they add a note or notebook. (Existing users with real notebooks
        // hit the branch above and are never touched.)
        setNotebooks([]);
        localStorage.setItem('sanctum_notebooks_v2', JSON.stringify([]));
      }
    }).catch((err) => { // request failed — keep current state, write nothing
      console.error('[loadNotebooks] Error:', err);
      setLoadError("Couldn't load your notebooks.");
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadNotebooks(); }, [loadNotebooks]);
  const saveNotebooks = useCallback(async (nbs) => {
    setNotebooks(nbs);
    localStorage.setItem('sanctum_notebooks_v2', JSON.stringify(nbs));
    try {
      await sb.from('notebooks').upsert({ id: `singleton_${user?.id || 'default'}`, user_id: user?.id, data: nbs, updated_at: new Date().toISOString() }, 'id');
    } catch (err) {
      console.error('[saveNotebooks] Supabase upsert FAILED:', err);
    }
  }, [user]);
  const [expandedNBs, setExpandedNBs] = useState(() => {
    try { const s = localStorage.getItem('sanctum_expanded_nbs'); if (s) return new Set(JSON.parse(s)); } catch {}
    return new Set([DEFAULT_NOTEBOOKS[0]?.id]);
  });
  const toggleExpand = (id) => {
    setExpandedNBs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('sanctum_expanded_nbs', JSON.stringify([...next]));
      return next;
    });
  };

  // ── Active selection (localStorage backed) ───────────────────────────
  const [activeNB,      setActiveNB]      = useState(() => localStorage.getItem('sanctum_active_nb') || DEFAULT_NOTEBOOKS[0]?.id || '');
  const [activeSection, setActiveSection] = useState(() => localStorage.getItem('sanctum_active_sec') || null);

  // ── Notes (Supabase) ─────────────────────────────────────────────────
  const [allNotes,   setAllNotes]   = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [editTitle,  setEditTitle]  = useState('');
  const [editBody,   setEditBody]   = useState('');
  const [editTags,   setEditTags]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [loadError,  setLoadError]  = useState(null); // failed notes/notebooks read — never shown as "empty"
  const [saveStatus, setSaveStatus] = useState('idle');
  const [migrating,  setMigrating]  = useState(false);
  const saveTimer   = useRef(null);
  const dirtyRef    = useRef(false);
  const pendingSave = useRef({ id: null, title: '', body: '', tags: '' });
  const editorRef      = useRef(null);
  const activeNoteRef  = useRef(null);
  const titleInputRef  = useRef(null);
  const savedRangeRef  = useRef(null);
  const touchNoteRef   = useRef(null);
  const longPressTimer = useRef(null);
  const didTouchDrag   = useRef(false);

  // ── Ciphertext write guard ────────────────────────────────────────────
  // allNotesRef mirrors state so the memoised save callbacks see current bodies.
  const allNotesRef = useRef(allNotes);
  allNotesRef.current = allNotes;
  const decryptFailedRef = useRef(null); // id of the active note whose decrypt failed
  const [decryptFailedId, setDecryptFailedId] = useState(null);
  const [unlockRequested, setUnlockRequested] = useState(false);
  const [encPwd,    setEncPwd]    = useState('');
  const [encError,  setEncError]  = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const encPwdRef = useRef(null);

  // ── No-key drafts ─────────────────────────────────────────────────────
  // While encryption is on and no key is loaded, note edits (and new notes)
  // live ONLY here, in memory: id → { title, body, tags, isNew }. They are
  // encrypted and written when the key arrives (flushDrafts). New notes get a
  // temporary "draft-…" id and no DB row until then.
  const draftsRef = useRef(new Map());
  const [draftIds, setDraftIds] = useState(() => new Set());
  const syncDraftIds = () => setDraftIds(new Set(draftsRef.current.keys()));
  // Fail closed: until the profile says otherwise, assume encryption is on.
  const encryptionOnRef = useRef(true);
  const [encryptionOn, setEncryptionOn] = useState(true);
  useEffect(() => {
    if (!user?.id) return;
    encryptionEnabled(user.id).then(on => { encryptionOnRef.current = on; setEncryptionOn(on); });
  }, [user?.id]);
  const needsKey = useCallback(() => encryptionOnRef.current !== false && !cryptoKeyRef.current, []);
  // True when saving this note would overwrite ciphertext we can't read (no key
  // loaded, or decryption failed). Every title/body/tags write goes through
  // autoSave/flushSave, which check this first and ask for the password instead.
  // Focus the password field only for the full lock panel. Never while the user
  // is typing in an editable note (the unlock bar), or keystrokes get stolen.
  const bodyLockRef = useRef(null);
  useEffect(() => { if (unlockRequested && bodyLockRef.current === 'nokey') encPwdRef.current?.focus(); }, [unlockRequested]);
  const isBodyWriteBlocked = useCallback((id) => {
    const n = allNotesRef.current.find(x => x.id === id);
    if (n && isEncryptedWithoutKey(n.body, cryptoKeyRef.current)) return true;
    return decryptFailedRef.current != null && decryptFailedRef.current === id;
  }, []);
  // Collapsible panels
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sanctum_sidebar_col') === 'true');
  const [nbSearch, setNbSearch] = useState('');
  const [listCollapsed, setListCollapsed] = useState(() => localStorage.getItem('sanctum_list_col') === 'true');
  // Mobile single-panel nav
  const [mobilePanel, setMobilePanel] = useState('notebooks');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 769);

  // ── Note ordering ─────────────────────────────────────────────────────
  const [noteOrder, setNoteOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sanctum_note_order') || '{}'); } catch { return {}; }
  });
  const saveNoteOrder = (order) => { setNoteOrder(order); localStorage.setItem('sanctum_note_order', JSON.stringify(order)); };
  const getOrderedNotes = useCallback((sectionId, src) => {
    const sid = sectionId?.toLowerCase().trim() || '';
    const notes = (src || allNotes).filter(n => (n.section?.toLowerCase().trim() || '') === sid);
    const order = noteOrder[sectionId];
    if (!order) return notes;
    return [...notes].sort((a, b) => {
      const ai = order.indexOf(String(a.id)), bi = order.indexOf(String(b.id));
      if (ai === -1 && bi === -1) return 0; if (ai === -1) return 1; if (bi === -1) return -1; return ai - bi;
    });
  }, [allNotes, noteOrder]);

  // ── UI state ──────────────────────────────────────────────────────────
  const [nbMenu,       setNbMenu]       = useState(null);
  const [noteMenu,     setNoteMenu]     = useState(null);
  const [formatDrop,   setFormatDrop]   = useState(false);
  const [lineFormat,   setLineFormat]   = useState('body');
  const [dragNBId,     setDragNBId]     = useState(null);
  const [dragSecId,    setDragSecId]    = useState(null);
  const [dragNoteId,   setDragNoteId]   = useState(null);
  const [dragOverId,   setDragOverId]   = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [newNBValue,   setNewNBValue]   = useState('');
  const [showNewNB,    setShowNewNB]    = useState(false);
  const [moveModal,    setMoveModal]    = useState(null);
  const [fullscreen,   setFullscreen]   = useState(() => localStorage.getItem('sanctum_notes_fs') === 'true');

  // ── PIN lock state ────────────────────────────────────────────────────
  const [pinModal,       setPinModal]       = useState(null); // 'set' | 'remove' | null
  const [pinInput,       setPinInput]       = useState('');
  const [pinConfirm,     setPinConfirm]     = useState('');
  const [unlockPin,      setUnlockPin]      = useState('');
  const [noteUnlocked,   setNoteUnlocked]   = useState(false);
  const [pinError,       setPinError]       = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showPinRecovery, setShowPinRecovery] = useState(false);
  const [recoveryPwd,     setRecoveryPwd]     = useState('');
  const [recoveryError,   setRecoveryError]   = useState('');

  // ── Close menus on outside click ──────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (!e.target.closest('.nb-dropdown') && !e.target.closest('.nb-dot-btn')) setNbMenu(null);
      if (!e.target.closest('.note-ctx-menu') && !e.target.closest('.nb-dot-btn')) setNoteMenu(null);
      if (!e.target.closest('.format-dropdown') && !e.target.closest('.format-drop-trigger')) setFormatDrop(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Fullscreen body class ─────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle('notes-fullscreen', fullscreen);
    return () => document.body.classList.remove('notes-fullscreen');
  }, [fullscreen]);
  const toggleFullscreen = () => {
    const v = !fullscreen; setFullscreen(v); localStorage.setItem('sanctum_notes_fs', String(v));
  };

  // ── Mobile resize ─────────────────────────────────────────────────────
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 769);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ── Load note body into editor when active note or key changes ──────────
  useEffect(() => {
    if (!activeNote || !editorRef.current) return;
    const note = allNotes.find(n => n.id === activeNote);
    if (!note) return;
    async function loadBody() {
      const draft = draftsRef.current.get(note.id); // unsaved in-memory edits win
      let body = draft ? draft.body : (note.body || '');
      let failed = false;
      if (isEncrypted(body)) {
        if (cryptoKey) {
          try { body = await decrypt(body, cryptoKey); } catch {
            failed = true;
            body = '<div class="we-line" style="color:var(--t3);font-style:italic">⚠️ Decryption failed — this note may have been encrypted with a different password or key.</div>';
          }
        } else if (keyLoading) {
          body = '<div class="we-line" style="color:var(--t3);font-style:italic">Decrypting...</div>';
        } else {
          body = '<div class="we-line" style="color:var(--t3);font-style:italic">🔒 This note is encrypted. Log in with your password to decrypt.</div>';
        }
      }
      // A note we failed to decrypt must never be saved over (see isBodyWriteBlocked).
      decryptFailedRef.current = failed ? note.id : null;
      setDecryptFailedId(failed ? note.id : null);
      if (!editorRef.current) return;
      // Detect HTML by the presence of a block tag ANYWHERE, not just a leading "<".
      // The old startsWith('<') check misfired when the saved HTML began with a bare
      // text node (e.g. "Buy milk<div>…</div>"): it was treated as markdown and the
      // whole thing collapsed into one line. A markdown body has no block tags.
      const looksLikeHtml = /<(?:div|br|p|h[1-6]|hr|pre|table|ul|ol|img|blockquote)\b/i.test(body);
      editorRef.current.innerHTML = looksLikeHtml ? body : mdToHtmlWysiwyg(body);
      normalizeBlocks(editorRef.current);
      addCollapseButtons();
      setEditBody(htmlToMd(editorRef.current));
    }
    loadBody();
  }, [activeNote, cryptoKey, keyLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset PIN state on note switch ────────────────────────────────────
  useEffect(() => {
    // Restore unlock state from session cache so user doesn't re-enter PIN on navigation
    setNoteUnlocked(_sessionUnlockedNotes.has(String(activeNote)));
    setUnlockPin('');
    setPinError(false);
    setFailedAttempts(0);
    setShowPinRecovery(false);
    setRecoveryPwd('');
    setRecoveryError('');
    setUnlockRequested(false);
    setEncPwd(''); setEncError('');
  }, [activeNote]);

  // ── Load ──────────────────────────────────────────────────────────────
  useEffect(() => { if (user?.id) loadNotes(); }, [user?.id]);
  const loadNotes = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await sb.from("notes").select("*", undefined, undefined, { strict: true });
      if (Array.isArray(data)) {
        // Normalize notebook/section: match by id OR label (case-insensitive) → canonical id
        const normalized = data.map(n => {
          let nbVal  = n.notebook?.trim() || '';
          let secVal = n.section?.trim()  || '';
          const nbMatch = DEFAULT_NOTEBOOKS.find(nb =>
            nb.id.toLowerCase() === nbVal.toLowerCase() ||
            nb.label.toLowerCase() === nbVal.toLowerCase()
          );
          if (nbMatch) {
            nbVal = nbMatch.id;
            const secMatch = nbMatch.sections.find(s =>
              s.id.toLowerCase() === secVal.toLowerCase() ||
              s.label.toLowerCase() === secVal.toLowerCase()
            );
            if (secMatch) secVal = secMatch.id;
          }
          return { ...n, notebook: nbVal, section: secVal };
        });
        // Keep new notes that only exist as in-memory drafts.
        const draftNotes = allNotesRef.current.filter(n => isDraftId(n.id) && draftsRef.current.has(n.id));
        setAllNotes([...draftNotes, ...normalized]);
        // Restore last-viewed note by ID first; fall back to notebook/section, then first note
        const storedNoteId = localStorage.getItem('sanctum_active_note');
        let first = storedNoteId ? normalized.find(n => String(n.id) === storedNoteId) : null;
        if (!first) {
          const storedNB  = (localStorage.getItem('sanctum_active_nb')  || DEFAULT_NOTEBOOKS[0]?.id || '').toLowerCase().trim();
          const storedSec = (localStorage.getItem('sanctum_active_sec') || '').toLowerCase().trim();
          const resolveNBId  = (v) => DEFAULT_NOTEBOOKS.find(nb => nb.id.toLowerCase()===v||nb.label.toLowerCase()===v)?.id || v;
          const resolveSecId = (nbId, v) => DEFAULT_NOTEBOOKS.find(nb=>nb.id===nbId)?.sections.find(s=>s.id.toLowerCase()===v||s.label.toLowerCase()===v)?.id || v;
          const resolvedNB  = resolveNBId(storedNB);
          const resolvedSec = resolveSecId(resolvedNB, storedSec);
          if (resolvedSec) first = normalized.find(n => n.section.toLowerCase() === resolvedSec.toLowerCase());
          if (!first && resolvedNB) first = normalized.find(n => n.notebook.toLowerCase() === resolvedNB.toLowerCase());
          if (!first && normalized.length > 0) first = normalized[0];
        }
        // Don't yank the user off a note they opened (e.g. a new draft) while this load was in flight.
        const userPicked = activeNoteRef.current && [...draftNotes, ...normalized].some(n => n.id === activeNoteRef.current);
        if (first && !userPicked) {
          const nbId  = first.notebook || DEFAULT_NOTEBOOKS[0]?.id || '';
          const secId = first.section  || '';
          setActiveNB(nbId);   localStorage.setItem('sanctum_active_nb', nbId);
          if (secId) { setActiveSection(secId); localStorage.setItem('sanctum_active_sec', secId); }
          else       { setActiveSection(null);  localStorage.setItem('sanctum_active_sec', ''); }
          openNote(first, false);
        }
      }
    } catch (err) {
      // Keep whatever is on screen; an empty list here would be a lie.
      console.error('[loadNotes] Error:', err);
      setLoadError("Couldn't load your notes.");
    }
    setLoading(false);
  };

  // ── Saving ────────────────────────────────────────────────────────────
  // Keep a draft in memory (never written to the DB as-is).
  const holdDraft = useCallback((id, fields) => {
    const prev = draftsRef.current.get(id);
    draftsRef.current.set(id, { isNew: prev?.isNew ?? isDraftId(id), ...fields }); // new object: flushDrafts compares identity
    syncDraftIds();
    setAllNotes(p => p.map(n => n.id === id ? { ...n, title: fields.title, tags: fields.tags } : n));
  }, []);

  // Encrypt + write every draft. Runs when the key arrives, and again if
  // drafts change while a flush is in flight.
  const flushingRef = useRef(false);
  const flushAgainRef = useRef(false);
  const flushDrafts = useCallback(async () => {
    if (flushingRef.current) { flushAgainRef.current = true; return; }
    flushingRef.current = true;
    try {
      do {
        flushAgainRef.current = false;
        for (const [id, d] of [...draftsRef.current]) {
          const key = cryptoKeyRef.current;
          if (!key) return; // key gone (logout) — keep drafts in memory
          const note = allNotesRef.current.find(n => n.id === id);
          if (!note) { draftsRef.current.delete(id); continue; } // note was deleted meanwhile
          try {
            const body = await encrypt(d.body, key);
            const updated = new Date().toISOString();
            let realId = id;
            if (d.isNew) {
              const res = await sb.from("notes").insert({ notebook: note.notebook, section: note.section, title: d.title, body, tags: d.tags, updated_at: updated, user_id: user?.id });
              const row = Array.isArray(res) ? res[0] : null;
              if (!row?.id) throw new Error('insert failed');
              realId = row.id;
              setAllNotes(p => p.map(n => n.id === id ? row : n));
              allNotesRef.current = allNotesRef.current.map(n => n.id === id ? row : n);
              if (activeNoteRef.current === id) {
                activeNoteRef.current = row.id; setActiveNote(row.id);
                localStorage.setItem('sanctum_active_note', String(row.id));
              }
            } else {
              const res = await sb.from("notes").update({ title: d.title, body, tags: d.tags, updated_at: updated }, { id });
              if (!Array.isArray(res) || res.length !== 1) throw new Error('update failed');
              setAllNotes(p => p.map(n => n.id === id ? { ...n, title: d.title, body, tags: d.tags, updated_at: updated } : n));
            }
            // Edited again while we were writing? Keep the newer draft (under the real id).
            const latest = draftsRef.current.get(id);
            draftsRef.current.delete(id);
            if (latest && latest !== d) { draftsRef.current.set(realId, { ...latest, isNew: false }); flushAgainRef.current = true; }
          } catch (err) {
            console.error('[flushDrafts] Error:', err);
            setSaveStatus('error'); // draft stays in memory; retried on the next flush
          }
        }
      } while (flushAgainRef.current);
    } finally {
      flushingRef.current = false;
      syncDraftIds();
    }
  }, [user?.id]);
  useEffect(() => { if (cryptoKey && draftsRef.current.size) flushDrafts(); }, [cryptoKey, flushDrafts]);

  // THE gate for note-body writes. Returns true when the write was handled here
  // and the caller must NOT send it:
  //  - body is ciphertext we can't read → refuse (isBodyWriteBlocked)
  //  - no key while encryption is on    → keep in memory, ask for the password
  //  - a draft is pending for this note → update the draft, let flushDrafts write it
  const divertBodyWrite = useCallback((id, fields) => {
    if (isBodyWriteBlocked(id)) { setUnlockRequested(true); return true; }
    const keyless = needsKey();
    if (keyless || draftsRef.current.has(id) || isDraftId(id)) {
      holdDraft(id, fields);
      if (keyless) setUnlockRequested(true); else flushDrafts();
      return true;
    }
    return false;
  }, [isBodyWriteBlocked, needsKey, holdDraft, flushDrafts]);

  // The single DB write for title/body/tags edits (autosave + flush on blur/switch).
  const writeNote = useCallback(async (id, title, body, tags, where) => {
    dirtyRef.current = false;
    if (divertBodyWrite(id, { title, body, tags })) return;
    let bodyToSave = body; // plaintext only reachable when the account has no encryption salt
    if (cryptoKeyRef.current) {
      try { bodyToSave = await encrypt(body, cryptoKeyRef.current); }
      catch (e) {
        console.error(`[${where}] Encrypt error:`, e);
        holdDraft(id, { title, body, tags }); setSaveStatus('error'); // never fall back to plaintext
        return;
      }
    }
    setSaveStatus('saving');
    const updated = new Date().toISOString();
    setAllNotes(prev => prev.map(n => n.id === id ? { ...n, title, body: bodyToSave, tags, updated_at: updated } : n));
    let saveOk = true;
    try {
      const res = await sb.from("notes").update({ title, body: bodyToSave, tags, updated_at: updated }, { id });
      if (!Array.isArray(res)) saveOk = false;
    } catch(e) { console.error(`[${where}] Error:`, e); saveOk = false; }
    setSaveStatus(saveOk ? 'saved' : 'error');
    setTimeout(() => setSaveStatus(s => (s === 'saved' || s === 'error') ? 'idle' : s), 1500);
  }, [divertBodyWrite, holdDraft]);

  const flushSave = useCallback(async () => {
    if (!dirtyRef.current) return;
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const { id, title, body, tags } = pendingSave.current;
    if (!id) return;
    await writeNote(id, title, body, tags, 'flushSave');
  }, [writeNote]);

  // body is read from editorRef at call time so new notes always save current HTML
  const autoSave = useCallback((id, title, tags) => {
    const body = sanitizeHtml(editorRef.current?.innerHTML || '');
    // No debounce for diverted writes: a draft must exist before the tab can close.
    if (divertBodyWrite(id, { title, body, tags })) return;
    dirtyRef.current = true;
    pendingSave.current = { id, title, body, tags };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const p = pendingSave.current;
      writeNote(p.id, p.title, p.body, p.tags, 'autoSave'); // re-checks the gate at fire time
    }, 700);
  }, [divertBodyWrite, writeNote]);

  // Unsaved drafts → warn before the tab closes or reloads.
  useEffect(() => {
    if (draftIds.size === 0) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draftIds]);

  const addCollapseButtons = () => {
    const ed = editorRef.current; if (!ed) return;
    ed.querySelectorAll('.we-h1, .we-h2').forEach(el => {
      if (!el.querySelector('.we-collapse-btn')) {
        const btn = document.createElement('span');
        btn.className = 'we-collapse-btn';
        btn.contentEditable = 'false';
        btn.textContent = '▼';
        el.insertBefore(btn, el.firstChild);
      }
    });
  };

  const openNote = async (n, navigate = true) => {
    if (dirtyRef.current) await flushSave();
    setRenameTarget(null);
    activeNoteRef.current = n.id;
    setActiveNote(n.id); setEditTitle(n.title || ''); setEditTags(n.tags || '');
    localStorage.setItem('sanctum_active_note', String(n.id));
    if (navigate && window.innerWidth < 769) setMobilePanel('editor');
  };
  const selectSection = (sid, nbid) => {
    setActiveNB(nbid); localStorage.setItem('sanctum_active_nb', nbid);
    setActiveSection(sid); localStorage.setItem('sanctum_active_sec', sid || '');
    setNbMenu(null);
    if (window.innerWidth < 769) { setMobilePanel('list'); return; }
    const sidL = sid?.toLowerCase().trim() || '';
    const first = allNotes.find(n => (n.section?.toLowerCase().trim() || '') === sidL);
    if (first) openNote(first); else { setActiveNote(null); setEditTitle(''); setEditBody(''); setEditTags(''); }
  };
  const selectNotebook = (nbid) => {
    setActiveNB(nbid); localStorage.setItem('sanctum_active_nb', nbid);
    setActiveSection(null); localStorage.setItem('sanctum_active_sec', '');
    setNbMenu(null);
    if (window.innerWidth < 769) { setMobilePanel('list'); return; }
    const nbidL = nbid?.toLowerCase().trim() || '';
    const first = allNotes.find(n => (n.notebook?.toLowerCase().trim() || '') === nbidL);
    if (first) openNote(first); else { setActiveNote(null); setEditTitle(''); setEditBody(''); setEditTags(''); }
  };

  const onTitleChange = (v) => { setEditTitle(v); if (activeNoteRef.current) autoSave(activeNoteRef.current, v, editTags); };
  const onTagsChange  = (v) => { setEditTags(v);  if (activeNoteRef.current) autoSave(activeNoteRef.current, editTitle, v); };

  // ── CRUD ──────────────────────────────────────────────────────────────
  const newNote = async () => {
    let nb = notebooks.find(n => n.id === activeNB) || notebooks[0];
    let sectionId = activeSection || nb?.sections?.[0]?.id || '';
    // New user with no notebooks yet — create their first notebook on demand so the
    // note has a home. This is user-initiated (they clicked "New note"), not an
    // auto-seed of hardcoded content on load.
    if (!nb) {
      const nbId = 'nb-' + Date.now(), secId = 'sec-' + Date.now();
      nb = { id: nbId, label: 'Notes', icon: 'notes', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', sections: [{ id: secId, label: 'General' }] };
      saveNotebooks([nb]);
      setActiveNB(nbId); localStorage.setItem('sanctum_active_nb', nbId);
      setActiveSection(secId); localStorage.setItem('sanctum_active_sec', secId);
      sectionId = secId;
    }
    const note = { notebook: nb.id, section: sectionId, title: '', body: '', tags: '', updated_at: new Date().toISOString().slice(0, 10), user_id: user?.id };
    if (needsKey()) {
      // No key: no DB row yet. The note lives in memory until unlock (flushDrafts inserts it).
      const draftNote = { ...note, id: `draft-${Date.now()}` };
      draftsRef.current.set(draftNote.id, { isNew: true, title: '', body: '', tags: '' });
      syncDraftIds();
      setAllNotes(prev => [draftNote, ...prev]);
      openNote(draftNote);
      setTimeout(() => titleInputRef.current?.focus(), 80);
      return;
    }
    try {
      const res = await sb.from("notes").insert(note);
      if (!Array.isArray(res) || !res[0]?.id) {
        console.error('[newNote] Insert failed:', res);
        alert('Could not create note. Please try again.');
        return;
      }
      setAllNotes(prev => [res[0], ...prev]);
      openNote(res[0]);
      setTimeout(() => titleInputRef.current?.focus(), 80);
    } catch (err) {
      console.error('[newNote] error:', err);
      alert('Could not create note. Please try again.');
    }
  };

  const deleteNote = async (id) => {
    const nid = id || activeNote; if (!nid) return;
    const target = allNotes.find(n => n.id === nid);
    if (target?.locked && !_sessionUnlockedNotes.has(String(nid))) { setNoteMenu(null); return; }
    if (isDraftId(nid)) { // never reached the DB
      draftsRef.current.delete(nid); syncDraftIds();
      setAllNotes(prev => prev.filter(n => n.id !== nid));
      if (nid === activeNote) { setActiveNote(null); setEditTitle(''); setEditBody(''); setEditTags(''); localStorage.removeItem('sanctum_active_note'); }
      setNoteMenu(null);
      return;
    }
    try {
      const ok = await sb.from("notes").delete({ id: nid });
      if (!ok) {
        console.error('[deleteNote] Server delete failed for', nid);
        alert('Could not delete note. Please try again.');
        setNoteMenu(null);
        return;
      }
      const remaining = allNotes.filter(n => n.id !== nid);
      setAllNotes(remaining);
      if (nid === activeNote) {
        setActiveNote(null);
        setEditTitle('');
        setEditBody('');
        setEditTags('');
        localStorage.removeItem('sanctum_active_note');
      }
    } catch (err) {
      console.error('[deleteNote] error:', err);
      alert('Could not delete note. Please try again.');
    }
    setNoteMenu(null);
  };

  const duplicateNote = async (id) => {
    const note = allNotes.find(n => n.id === id); if (!note) return;
    const plainSource = note.body && !isEncrypted(note.body);
    // Drafts, or a plaintext source with no key: unlock first (the copy would be plaintext).
    if (isDraftId(id) || draftsRef.current.has(id) || (plainSource && needsKey())) { setUnlockRequested(true); setNoteMenu(null); return; }
    const { id: _id, ...rest } = note;
    const dup = { ...rest, title: (note.title || 'Untitled') + ' copy', updated_at: new Date().toISOString().slice(0, 10), user_id: user?.id };
    if (plainSource && cryptoKeyRef.current) {
      try { dup.body = await encrypt(note.body, cryptoKeyRef.current); }
      catch (err) { console.error('[duplicateNote] Encrypt error:', err); setNoteMenu(null); return; }
    }
    try {
      const res = await sb.from("notes").insert(dup);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...dup, id: Date.now().toString() };
      setAllNotes(prev => [created, ...prev]); openNote(created);
    } catch (err) { console.error('[duplicateNote] Error:', err); const n = { ...dup, id: Date.now().toString() }; setAllNotes(prev => [n, ...prev]); openNote(n); }
    setNoteMenu(null);
  };

  const moveNote = async (noteId, toNBId, toSecId) => {
    const nbConf  = notebooks.find(n => n.id === toNBId);
    const secConf = nbConf?.sections.find(s => s.id === toSecId);
    // Normalize internally to id; save label to DB for consistency
    const nbId  = nbConf?.id  || toNBId;
    const secId = secConf?.id || toSecId;
    const nbLabel  = nbConf?.label  || toNBId;
    const secLabel = secConf?.label || toSecId;
    setAllNotes(prev => prev.map(n => n.id === noteId ? { ...n, notebook: nbId, section: secId } : n));
    if (!isDraftId(noteId)) { try { await sb.from("notes").update({ notebook: nbLabel, section: secLabel }, { id: noteId }); } catch {} }
    setMoveModal(null); setNoteMenu(null);
  };

  // ── PIN lock helpers ──────────────────────────────────────────────────
  const hashPin = async (pin) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'sanctum_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const toggleNoteLock = () => {
    if (!currentNote) return;
    if (isDraftId(currentNote.id)) { setUnlockRequested(true); return; } // save (unlock) first
    if (currentNote.locked) { setPinModal('remove'); setPinInput(''); setPinError(false); }
    else                    { setPinModal('set');    setPinInput(''); setPinConfirm(''); setPinError(false); }
  };

  const lockNote = async () => {
    if (pinInput.length < 4 || pinInput !== pinConfirm) return;
    const hash = await hashPin(pinInput);
    await sb.from('notes').update({ locked: true, pin_hash: hash }, { id: activeNote });
    setAllNotes(prev => prev.map(n => n.id === activeNote ? { ...n, locked: true, pin_hash: hash } : n));
    _sessionUnlockedNotes.delete(String(activeNote));
    setNoteUnlocked(false);
    setPinModal(null); setPinInput(''); setPinConfirm('');
  };

  const verifyPin = async () => {
    if (typeof pinError === 'string') return;
    const hash = await hashPin(unlockPin);
    if (hash === currentNote?.pin_hash) {
      _sessionUnlockedNotes.add(String(activeNote));
      setNoteUnlocked(true); setUnlockPin(''); setPinError(false); setFailedAttempts(0);
    } else {
      const next = failedAttempts + 1;
      setFailedAttempts(next);
      setUnlockPin('');
      if (next >= 3) {
        setPinError('Too many attempts. Wait 30 seconds.');
        setTimeout(() => { setFailedAttempts(0); setPinError(false); }, 30000);
      } else {
        setPinError(true);
      }
    }
  };

  const recoverWithPassword = async () => {
    if (!recoveryPwd.trim()) return;
    setRecoveryError('');
    try {
      const res = await auth.signIn(user.email, recoveryPwd);
      if (res.access_token) {
        await sb.from('notes').update({ locked: false, pin_hash: null }, { id: activeNote });
        setAllNotes(prev => prev.map(n => n.id === activeNote ? { ...n, locked: false, pin_hash: null } : n));
        _sessionUnlockedNotes.add(String(activeNote));
        setNoteUnlocked(true);
        setShowPinRecovery(false);
        setRecoveryPwd('');
      } else {
        setRecoveryError(res.error_description || 'Incorrect password');
      }
    } catch {
      setRecoveryError('Could not verify. Please try again.');
    }
  };

  const removeLock = async () => {
    const hash = await hashPin(pinInput);
    if (hash !== currentNote?.pin_hash) { setPinError(true); return; }
    await sb.from('notes').update({ locked: false, pin_hash: null }, { id: activeNote });
    setAllNotes(prev => prev.map(n => n.id === activeNote ? { ...n, locked: false, pin_hash: null } : n));
    _sessionUnlockedNotes.delete(String(activeNote));
    setNoteUnlocked(false); setPinModal(null); setPinInput(''); setPinError(false);
  };

  // ── Formatting (WYSIWYG contentEditable) ─────────────────────────────
  const detectLineFormat = useCallback(() => {
    const ed = editorRef.current; if (!ed) return 'body';
    const sel = window.getSelection();
    if (!sel?.rangeCount) return 'body';
    let node = sel.getRangeAt(0).startContainer;
    while (node && node.parentElement && node.parentElement !== ed) node = node.parentElement;
    if (!node || node === ed || node.parentElement !== ed) return 'body';
    const cls = (node.className || '');
    if (cls.includes('we-h1')) return 'h1';
    if (cls.includes('we-h2')) return 'h2';
    if (cls.includes('we-h3')) return 'h3';
    if (cls.includes('we-ul')) return 'ul';
    if (cls.includes('we-ol')) return 'ol';
    if (cls.includes('we-check')) return 'check';
    return 'body';
  }, []);

  const updateLineFormat = useCallback(() => setLineFormat(detectLineFormat()), [detectLineFormat]);

  const syncBody = useCallback(() => {
    const ed = editorRef.current; if (!ed) return;
    const md = htmlToMd(ed);
    setEditBody(md);
    if (activeNoteRef.current) autoSave(activeNoteRef.current, editTitle, editTags);
  }, [editTitle, editTags, autoSave]);

  // Intercept paste of BLOCK-structured rich HTML (headings/paragraphs/lists — e.g.
  // copied from a web page or a Claude reply). Left unhandled, the browser embeds that
  // markup verbatim inside the current block, which is how notes got collapse-corrupted
  // (a whole document nested inside one we-check line). We convert it to flat Sanctum
  // blocks and insert them as top-level siblings. Plain-text / inline-only pastes fall
  // through to the browser default (fast path, no formatting loss).
  const onEditorPaste = useCallback((e) => {
    if (activeNoteRef.current && isBodyWriteBlocked(activeNoteRef.current)) {
      e.preventDefault(); setUnlockRequested(true); return;
    }
    const cd = e.clipboardData;
    if (!cd) return;
    const html = cd.getData('text/html');
    const isBlockRich = html && /<(?:h[1-6]|p|ol|ul|li|table|blockquote|pre)\b/i.test(html);
    if (!isBlockRich) return; // plain/inline paste → default browser behaviour
    e.preventDefault();
    const blocks = richHtmlToBlocks(html);
    if (blocks) insertBlocksAtCaret(editorRef.current, blocks);
    else document.execCommand('insertText', false, cd.getData('text/plain'));
    normalizeBlocks(editorRef.current); // defensively flatten any nesting the insert created
    addCollapseButtons();
    syncBody();
  }, [syncBody, isBodyWriteBlocked]);

  // Intercept Enter inside list/checklist items to keep DOM structure clean
  const onEditorKeyDown = useCallback((e) => {
    if (e.key !== 'Enter') return;
    const ed = editorRef.current; if (!ed) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    let block = sel.getRangeAt(0).startContainer;
    while (block && block.parentElement && block.parentElement !== ed) block = block.parentElement;
    if (!block || block === ed || block.parentElement !== ed) return;
    const cls = block.className || '';
    if (!cls.includes('we-check') && !cls.includes('we-ul') && !cls.includes('we-ol')) return;
    e.preventDefault();
    const range = sel.getRangeAt(0);
    range.deleteContents();
    // Extract content from cursor to end of block
    const tailRange = document.createRange();
    tailRange.setStart(range.startContainer, range.startOffset);
    tailRange.setEnd(block, block.childNodes.length);
    const tail = tailRange.extractContents();
    // Strip structural spans (checkbox/bullet) from the extracted tail
    const tmp = document.createElement('div');
    tmp.appendChild(tail);
    tmp.querySelectorAll('.we-checkbox, .we-bullet').forEach(s => s.remove());
    const tailHtml = tmp.innerHTML || '<br>';
    // Build the new list item with correct structure
    const newEl = document.createElement('div');
    if (cls.includes('we-check')) {
      newEl.className = 'we-check';
      newEl.innerHTML = `<span class="we-checkbox" contenteditable="false">☐</span>${tailHtml}`;
    } else if (cls.includes('we-ul')) {
      newEl.className = 'we-ul';
      newEl.innerHTML = `<span class="we-bullet" contenteditable="false">•</span>${tailHtml}`;
    } else {
      newEl.className = 'we-ol';
      newEl.innerHTML = tailHtml;
    }
    block.after(newEl);
    // Position cursor: first text node in new item, or after the structural span
    const tw = document.createTreeWalker(newEl, NodeFilter.SHOW_TEXT, null);
    const firstText = tw.nextNode();
    const r = document.createRange();
    if (firstText) {
      r.setStart(firstText, 0);
    } else {
      const structSpan = newEl.querySelector('.we-checkbox, .we-bullet');
      const offset = structSpan ? Array.from(newEl.childNodes).indexOf(structSpan) + 1 : 0;
      r.setStart(newEl, offset);
    }
    r.collapse(true);
    editorRef.current.focus();
    sel.removeAllRanges(); sel.addRange(r);
    syncBody();
  }, [syncBody]);

  const applyFormat = (fmt) => {
    const ed = editorRef.current; if (!ed) return;
    ed.focus();
    // Restore saved selection if focus was lost (e.g. after using the format dropdown)
    const selCheck = window.getSelection();
    if (!selCheck?.rangeCount && savedRangeRef.current) {
      try { selCheck.removeAllRanges(); selCheck.addRange(savedRangeRef.current); } catch {}
    }

    const blockFmts = ['h1','h2','h3','ul','ol','check','body','hr'];
    if (blockFmts.includes(fmt)) {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      // Resolve the top-level block containing a node. A stray bare text node directly
      // under the editor (contentEditable leaves these) is wrapped in a we-line first,
      // so block formatting never operates on a text node.
      const blockOf = (n) => {
        let node = n;
        while (node && node.parentElement && node.parentElement !== ed) node = node.parentElement;
        if (!node || node === ed || node.parentElement !== ed) return null;
        if (node.nodeType === 3) {
          const w = document.createElement('div'); w.className = 'we-line';
          node.replaceWith(w); w.appendChild(node); return w;
        }
        return node;
      };

      if (fmt === 'hr') {
        const block = blockOf(range.startContainer) || ed.lastElementChild;
        const hrDiv = document.createElement('div'); hrDiv.className = 'we-hr'; hrDiv.innerHTML = '<hr>';
        const next  = document.createElement('div'); next.className  = 'we-line'; next.innerHTML = '<br>';
        if (block) { block.after(hrDiv); hrDiv.after(next); } else { ed.appendChild(hrDiv); ed.appendChild(next); }
        const r = document.createRange(); r.setStart(next, 0); r.collapse(true); sel.removeAllRanges(); sel.addRange(r);
      } else {
        // Convert EVERY block the selection touches — not just the first — so applying a
        // format to a multi-line selection formats all of those lines instead of merging
        // them. A collapsed caret resolves to exactly one block (original behaviour).
        let startBlock = blockOf(range.startContainer) || ed.firstElementChild;
        let endBlock   = blockOf(range.endContainer)   || startBlock;
        if (startBlock && endBlock && startBlock !== endBlock &&
            (startBlock.compareDocumentPosition(endBlock) & Node.DOCUMENT_POSITION_PRECEDING)) {
          [startBlock, endBlock] = [endBlock, startBlock];
        }
        const blocks = [];
        for (let b = startBlock; b; b = b.nextElementSibling) { blocks.push(b); if (b === endBlock) break; }
        if (!blocks.length) blocks.push(null);
        const convertOne = (block) => {
          const copy = block ? block.cloneNode(true) : null;
          copy?.querySelectorAll('.we-bullet,.we-checkbox,.we-collapse-btn').forEach(s => s.remove());
          const inner = copy ? (copy.innerHTML.replace(/^<br>$/i,'') || '') : '';
          const newEl = document.createElement('div');
          if (fmt === 'ul') {
            newEl.className = 'we-ul';
            newEl.innerHTML = `<span class="we-bullet" contenteditable="false">•</span>${inner || '<br>'}`;
          } else if (fmt === 'check') {
            newEl.className = 'we-check';
            newEl.innerHTML = `<span class="we-checkbox" contenteditable="false">☐</span>${inner || '<br>'}`;
          } else {
            const classMap = { body:'we-line', h1:'we-h we-h1', h2:'we-h we-h2', h3:'we-h we-h3', ol:'we-ol' };
            newEl.className = classMap[fmt] || 'we-line';
            newEl.innerHTML = inner || '<br>';
          }
          if (block) block.replaceWith(newEl); else ed.appendChild(newEl);
          return newEl;
        };
        let lastNew = null;
        for (const blk of blocks) lastNew = convertOne(blk);
        const target = lastNew || ed.lastElementChild;
        let last = null;
        if (target) { const tw = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, null); while (tw.nextNode()) last = tw.currentNode; }
        const r = document.createRange();
        if (last) { r.setStart(last, last.length); r.collapse(true); }
        else if (target) { r.selectNodeContents(target); r.collapse(false); }
        sel.removeAllRanges(); if (target) sel.addRange(r);
      }
      const md = htmlToMd(ed); setEditBody(md);
      if (activeNoteRef.current) autoSave(activeNoteRef.current, editTitle, editTags);
      setFormatDrop(false);
      if (['h1','h2'].includes(fmt)) setTimeout(addCollapseButtons, 0);
      setTimeout(() => setLineFormat(detectLineFormat()), 0);
      return;
    }

    // Inline formats
    if (fmt === 'bold')      { document.execCommand('bold'); }
    else if (fmt === 'italic')    { document.execCommand('italic'); }
    else if (fmt === 'underline') { document.execCommand('underline'); }
    else if (fmt === 'link') {
      const url = window.prompt('Enter URL:'); if (!url) return;
      document.execCommand('createLink', false, url);
    } else if (fmt === 'code') {
      const selText = window.getSelection()?.toString() || 'code';
      document.execCommand('insertHTML', false, `<code>${selText}</code>`);
    } else if (fmt === 'codeblock') {
      const selText = window.getSelection()?.toString() || 'code';
      document.execCommand('insertHTML', false, `<div class="we-codeblock"><pre><code>${selText}</code></pre></div>`);
    } else if (fmt === 'table') {
      document.execCommand('insertHTML', false, `<table style="border-collapse:collapse;width:100%;margin:8px 0"><thead><tr><th style="border:1px solid var(--b2);padding:6px 10px;font-weight:600">Column 1</th><th style="border:1px solid var(--b2);padding:6px 10px;font-weight:600">Column 2</th><th style="border:1px solid var(--b2);padding:6px 10px;font-weight:600">Column 3</th></tr></thead><tbody><tr><td style="border:1px solid var(--b2);padding:6px 10px">Cell</td><td style="border:1px solid var(--b2);padding:6px 10px">Cell</td><td style="border:1px solid var(--b2);padding:6px 10px">Cell</td></tr></tbody></table>`);
    }
    const md = htmlToMd(ed); setEditBody(md);
    if (activeNoteRef.current) autoSave(activeNoteRef.current, editTitle, editTags);
  };

  // ── Markdown renderer with collapsible headings ───────────────────────
  // ── Notebook CRUD ─────────────────────────────────────────────────────
  const addNotebook = () => {
    if (!newNBValue.trim()) { setShowNewNB(false); return; }
    const id='nb-'+Date.now(), secId='sec-'+Date.now();
    const nb={id, label:newNBValue.trim(), icon:'notes', color:'#8b5cf6', bg:'rgba(139,92,246,0.15)', sections:[{id:secId,label:'General'}]};
    saveNotebooks([...notebooks, nb]); toggleExpand(id);
    setNewNBValue(''); setShowNewNB(false);
  };
  const deleteNotebook = (id) => {
    const rem = notebooks.filter(n => n.id!==id); saveNotebooks(rem);
    if (activeNB===id && rem[0]) selectSection(rem[0].sections[0]?.id, rem[0].id);
    setNbMenu(null);
  };
  const addSection = (nbId) => {
    const id='sec-'+Date.now(), label='New Section';
    saveNotebooks(notebooks.map(nb => nb.id!==nbId ? nb : {...nb, sections:[...nb.sections,{id,label}]}));
    setNbMenu(null);
    setTimeout(() => setRenameTarget({type:'section',id,parentId:nbId,value:label}), 50);
  };
  const deleteSection = async (secId, parentId) => {
    const nb=notebooks.find(n=>n.id===parentId); if(!nb||nb.sections.length<=1) return;
    const noteIdsToDelete = allNotes.filter(n => n.section === secId).map(n => n.id);
    const updatedNBs = notebooks.map(n=>n.id!==parentId?n:{...n,sections:n.sections.filter(s=>s.id!==secId)});
    saveNotebooks(updatedNBs);
    if (activeSection===secId) { const rem=nb.sections.filter(s=>s.id!==secId); if(rem[0]) selectSection(rem[0].id,parentId); }
    setAllNotes(prev => prev.filter(n => n.section !== secId));
    noteIdsToDelete.filter(isDraftId).forEach(id => draftsRef.current.delete(id)); syncDraftIds();
    try { await Promise.all(noteIdsToDelete.filter(id => !isDraftId(id)).map(id => sb.from("notes").delete({ id }))); } catch {}
    setNbMenu(null);
  };
  const commitRename = async () => {
    if (!renameTarget || !renameTarget.value?.trim()) { setRenameTarget(null); return; }
    const {type, id, parentId, value} = renameTarget;
    if (type==='notebook') saveNotebooks(notebooks.map(nb=>nb.id!==id?nb:{...nb,label:value.trim()}));
    else if (type==='section') {
      const newLabel = value.trim();
      saveNotebooks(notebooks.map(nb=>nb.id!==parentId?nb:{...nb,sections:nb.sections.map(s=>s.id!==id?s:{...s,id:newLabel,label:newLabel})}));
      setAllNotes(prev => prev.map(n => n.section===id ? {...n,section:newLabel} : n));
      if (activeSection===id) { setActiveSection(newLabel); localStorage.setItem('sanctum_active_sec', newLabel); }
      try { await sb.from("notes").update({section:newLabel},{section:id,notebook:parentId}); } catch {}
    }
    else if (type==='note') onTitleChange(value.trim());
    setRenameTarget(null);
  };

  // ── Note counts ───────────────────────────────────────────────────────
  const noteCountFor = (sid, nbId) => allNotes.filter(n =>
    (n.section?.toLowerCase().trim() || '') === (sid?.toLowerCase().trim() || '') &&
    (!nbId || (n.notebook?.toLowerCase().trim() || '') === (nbId?.toLowerCase().trim() || ''))
  ).length;
  const nbNoteCount  = (nb) => allNotes.filter(n => (n.notebook?.toLowerCase().trim() || '') === (nb.id?.toLowerCase().trim() || '')).length;

  // ── Notebook drag ─────────────────────────────────────────────────────
  const onNBDragStart = (e,id) => { setDragNBId(id); e.dataTransfer.effectAllowed='move'; };
  const onNBDragOver  = (e,id) => { e.preventDefault(); setDragOverId('nb-'+id); };
  const onNBDrop      = (e,tid) => {
    e.preventDefault();
    if (!dragNBId||dragNBId===tid){setDragNBId(null);setDragOverId(null);return;}
    const arr=[...notebooks], fi=arr.findIndex(n=>n.id===dragNBId), ti=arr.findIndex(n=>n.id===tid);
    const [m]=arr.splice(fi,1); arr.splice(ti,0,m); saveNotebooks(arr); setDragNBId(null); setDragOverId(null);
  };

  // ── Section drag ──────────────────────────────────────────────────────
  const onSecDragStart = (e,sid,nbId) => { e.stopPropagation(); setDragSecId({id:sid,nbId}); e.dataTransfer.effectAllowed='move'; };
  const onSecDragOver  = (e,sid) => { e.preventDefault(); e.stopPropagation(); setDragOverId('sec-'+sid); };
  const onSecDrop      = (e,tsid,nbId) => {
    e.preventDefault(); e.stopPropagation();
    if (!dragSecId||dragSecId.id===tsid||dragSecId.nbId!==nbId){setDragSecId(null);setDragOverId(null);return;}
    const nbs=notebooks.map(nb=>{
      if(nb.id!==nbId) return nb;
      const secs=[...nb.sections], fi=secs.findIndex(s=>s.id===dragSecId.id), ti=secs.findIndex(s=>s.id===tsid);
      const [m]=secs.splice(fi,1); secs.splice(ti,0,m); return {...nb,sections:secs};
    });
    saveNotebooks(nbs); setDragSecId(null); setDragOverId(null);
  };

  // ── Note drag ─────────────────────────────────────────────────────────
  const onNoteDragStart = (e,id) => { setDragNoteId(id); e.dataTransfer.effectAllowed='move'; };
  const onNoteDragOver  = (e,id) => { e.preventDefault(); setDragOverId('note-'+id); };
  const onNoteDrop      = (e,tid) => {
    e.preventDefault();
    if (!dragNoteId||dragNoteId===tid){setDragNoteId(null);setDragOverId(null);return;}
    if (!activeSection){setDragNoteId(null);setDragOverId(null);return;}
    const ordered=getOrderedNotes(activeSection), ids=ordered.map(n=>String(n.id));
    const fi=ids.indexOf(String(dragNoteId)), ti=ids.indexOf(String(tid));
    if(fi===-1||ti===-1){setDragNoteId(null);setDragOverId(null);return;}
    const [m]=ids.splice(fi,1); ids.splice(ti,0,m);
    saveNoteOrder({...noteOrder,[activeSection]:ids}); setDragNoteId(null); setDragOverId(null);
  };

  // ── Note touch drag ──────────────────────────────────────────────────
  const onNoteTouchStart = (e, n) => {
    didTouchDrag.current = false;
    const touch = e.touches[0];
    touchNoteRef.current = { id: n.id, startX: touch.clientX, startY: touch.clientY, dragging: false };
  };
  const onNoteTouchMove = (e) => {
    if (!touchNoteRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchNoteRef.current.startX;
    const dy = touch.clientY - touchNoteRef.current.startY;
    if (!touchNoteRef.current.dragging && Math.abs(dx) + Math.abs(dy) > 8) {
      clearTimeout(longPressTimer.current);
      touchNoteRef.current.dragging = true;
      setDragNoteId(touchNoteRef.current.id);
    }
    if (touchNoteRef.current.dragging) {
      e.preventDefault();
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const card = el?.closest('[data-note-id]');
      const nid = card?.dataset.noteId;
      if (nid && nid !== touchNoteRef.current.id) setDragOverId('note-' + nid);
      else setDragOverId(null);
    }
  };
  const onNoteTouchEnd = (e) => {
    clearTimeout(longPressTimer.current);
    if (!touchNoteRef.current) return;
    if (touchNoteRef.current.dragging) {
      didTouchDrag.current = true;
      const touch = e.changedTouches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const card = el?.closest('[data-note-id]');
      const tid = card?.dataset.noteId;
      const fromId = touchNoteRef.current.id;
      if (tid && tid !== fromId && activeSection) {
        const ordered = getOrderedNotes(activeSection);
        const ids = ordered.map(n => String(n.id));
        const fi = ids.indexOf(String(fromId)), to = ids.indexOf(String(tid));
        if (fi !== -1 && to !== -1) { const [m] = ids.splice(fi, 1); ids.splice(to, 0, m); saveNoteOrder({ ...noteOrder, [activeSection]: ids }); }
      }
      setDragNoteId(null); setDragOverId(null);
    }
    touchNoteRef.current = null;
  };

  const currentNote    = allNotes.find(n => n.id === activeNote);
  // Encrypted body we can't show: 'nokey' (unlock with password), 'loading'
  // (key being derived) or 'failed' (wrong key). The editor is read-only then.
  const bodyLock = !currentNote ? null
    : decryptFailedId === currentNote.id ? 'failed'
    : isEncryptedWithoutKey(currentNote.body, cryptoKey) ? (keyLoading ? 'loading' : 'nokey')
    : null;
  bodyLockRef.current = bodyLock;
  // Plaintext / new note, no key yet: editable, but held in memory until unlock.
  const showUnlockBar = encryptionOn !== false && !cryptoKey && !keyLoading && !bodyLock && !!currentNote
    && (unlockRequested || draftIds.has(currentNote.id));
  const renderUnlockForm = (autoFocus) => (
    <>
      <input
        ref={encPwdRef}
        type="password"
        placeholder="Account password"
        autoComplete="current-password"
        value={encPwd}
        onChange={e => { setEncPwd(e.target.value); setEncError(''); }}
        onKeyDown={e => e.key === 'Enter' && unlockNote()}
        disabled={unlocking}
        style={{textAlign:'center',fontSize:16,background:'var(--bg2)',border:'1px solid var(--b2)',borderRadius:10,padding:'10px 16px',color:'var(--t1)',width:240}}
        autoFocus={autoFocus}
      />
      {encError && <div style={{fontSize:12,color:'var(--red)'}}>{encError}</div>}
      <button className="btn primary" onClick={() => unlockNote()} disabled={!encPwd || unlocking}>{unlocking ? 'Unlocking…' : 'Unlock'}</button>
    </>
  );
  const unlockNote = async () => {
    if (!encPwd || unlocking) return;
    setUnlocking(true); setEncError('');
    const proof = isEncrypted(currentNote?.body) ? currentNote.body
      : allNotes.filter(n => isEncrypted(n.body)).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0]?.body;
    try {
      const key = await unlockWithPassword({ userId: user.id, email: user.email, password: encPwd, ciphertext: proof });
      setEncPwd(''); setUnlockRequested(false);
      setKeyError(null);
      setCryptoKey(key);
      // Encrypt notes still stored as plaintext; reflect the new bodies locally.
      setMigrating(true);
      encryptPlaintextNotes(key)
        .then(({ migrated, failed }) => {
          const byId = new Map(migrated.map(m => [m.id, m.body]));
          if (byId.size) setAllNotes(prev => prev.map(n => byId.has(n.id) && !draftsRef.current.has(n.id) ? { ...n, body: byId.get(n.id) } : n));
          if (failed) console.error(`[unlockNote] note migration: ${failed} note(s) left for next unlock`);
        })
        .catch(err => console.error('[unlockNote] note migration failed:', err))
        .finally(() => setMigrating(false));
    } catch (err) {
      setEncError(err?.message || 'Could not unlock.');
    } finally {
      setUnlocking(false);
    }
  };
  const currentNB      = notebooks.find(n => n.id === activeNB);
  const currentSection = currentNB?.sections.find(s => s.id === activeSection);
  const _nbLower       = activeNB?.toLowerCase().trim() || '';
  const _rawNotes = activeSection
    ? getOrderedNotes(activeSection)
    : allNotes.filter(n => (n.notebook?.toLowerCase().trim() || '') === _nbLower);
  const displayedNotes = nbSearch.trim()
    ? allNotes.filter(n => {
        const q = nbSearch.toLowerCase();
        return (n.title||'').toLowerCase().includes(q)
          || (n.body||'').toLowerCase().includes(q)
          || (Array.isArray(n.tags) ? n.tags.join(' ') : (n.tags||'')).toLowerCase().includes(q);
      })
    : _rawNotes;

  return (
    <div className="notes-shell" data-mobile-panel={mobilePanel} onClick={() => { setNbMenu(null); setNoteMenu(null); }}>

      {isMobile && mobilePanel !== 'editor' && (
        <button className="mobile-notes-fab" onClick={newNote} title="New note">+</button>
      )}

      {migrating && (
        <div style={{position:'fixed',bottom:80,left:'50%',transform:'translateX(-50%)',background:'var(--bg2)',border:'1px solid var(--b2)',borderRadius:8,padding:'8px 16px',fontSize:12,color:'var(--t2)',zIndex:999,display:'flex',alignItems:'center',gap:6}}>
          🔒 Securing your notes...
        </div>
      )}

      {/* ── Notebooks sidebar ── */}
      <div className={`notes-sidebar${sidebarCollapsed && !isMobile?' collapsed':''}`} onClick={e => e.stopPropagation()}>
        <div className="notes-sidebar-header">
          {!sidebarCollapsed && <span style={{fontSize:11,fontWeight:700,color:'var(--t1)',letterSpacing:-.2,flex:1}}>Notes</span>}
          {!sidebarCollapsed && <span className="enc-badge"><Icon name="lock" size={8} color="var(--grn)"/> enc</span>}
          <button className="panel-collapse-btn" title={sidebarCollapsed?'Expand sidebar':'Collapse sidebar'}
            onClick={()=>{const v=!sidebarCollapsed;setSidebarCollapsed(v);localStorage.setItem('sanctum_sidebar_col',String(v));}}
          >{sidebarCollapsed?'›':'‹'}</button>
          {!sidebarCollapsed && (
            <input
              className="nb-search-input"
              type="text"
              placeholder="Search notes…"
              value={nbSearch}
              onChange={e => setNbSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>

        <div className="notes-sidebar-scroll">
        {notebooks.length === 0 && (
          <div style={{padding:'24px 16px',textAlign:'center',color:'var(--t3)',display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
            <Icon name="notes" size={26} color="var(--t3)" style={{opacity:.35}}/>
            <div style={{fontSize:12,fontWeight:600,color:'var(--t2)'}}>No notebooks yet</div>
            <div style={{fontSize:11,lineHeight:1.5}}>Create your first notebook below to start writing.</div>
          </div>
        )}
        {notebooks.map(nb => {
          const isExpanded = expandedNBs.has(nb.id);
          return (
            <div key={nb.id}>
              <div
                className={`notebook-item${activeNB===nb.id?' nb-active':''}${dragOverId==='nb-'+nb.id?' nb-drag-over':''}`}
                draggable
                onDragStart={e=>onNBDragStart(e,nb.id)} onDragOver={e=>onNBDragOver(e,nb.id)}
                onDragLeave={()=>setDragOverId(null)} onDrop={e=>onNBDrop(e,nb.id)}
                onDragEnd={()=>{setDragNBId(null);setDragOverId(null);}}
                onClick={() => { toggleExpand(nb.id); if (!isMobile) selectNotebook(nb.id); }}
              >
                <span className="nb-chev" style={{transform:isExpanded?'rotate(0)':'rotate(-90deg)',display:'inline-block',transition:'transform .15s'}}>▼</span>
                <div className="notebook-icon" style={{background:nb.bg}}><Icon name={nb.icon || "notes"} size={13} color={nb.color} /></div>
                {renameTarget?.type==='notebook'&&renameTarget?.id===nb.id ? (
                  <input className="nb-rename-input" autoFocus value={renameTarget.value}
                    onChange={e=>setRenameTarget(r=>({...r,value:e.target.value}))}
                    onBlur={commitRename} onClick={e=>e.stopPropagation()}
                    onKeyDown={e=>{if(e.key==='Enter')commitRename();if(e.key==='Escape')setRenameTarget(null);}}/>
                ) : (
                  <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nb.label}</span>
                )}
                {!(renameTarget?.type==='notebook'&&renameTarget?.id===nb.id) && <>
                  <span className="nb-count">{nbNoteCount(nb)}</span>
                  <button className="nb-dot-btn" onClick={e=>{e.stopPropagation();setNbMenu(m=>m?.id===nb.id&&m?.type==='notebook'?null:{type:'notebook',id:nb.id});}}>···</button>
                  {nbMenu?.type==='notebook'&&nbMenu?.id===nb.id&&(
                    <div className="nb-dropdown" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>{setRenameTarget({type:'notebook',id:nb.id,value:nb.label});setNbMenu(null);}}>Rename</button>
                      <button onClick={()=>addSection(nb.id)}>Add section</button>
                      <div className="dd-sep"/>
                      <button className="danger" onClick={()=>deleteNotebook(nb.id)}>Delete notebook</button>
                    </div>
                  )}
                </>}
              </div>

              {isExpanded && nb.sections.map(sec => (
                <div key={sec.id}
                  className={`section-item${activeSection===sec.id?' active':''}${dragOverId==='sec-'+sec.id?' sec-drag-over':''}`}
                  draggable
                  onDragStart={e=>onSecDragStart(e,sec.id,nb.id)} onDragOver={e=>onSecDragOver(e,sec.id)}
                  onDragLeave={()=>setDragOverId(null)} onDrop={e=>onSecDrop(e,sec.id,nb.id)}
                  onDragEnd={()=>{setDragSecId(null);setDragOverId(null);}}
                  onClick={()=>selectSection(sec.id,nb.id)}
                >
                  <span className="section-dot"/>
                  {renameTarget?.type==='section'&&renameTarget?.id===sec.id ? (
                    <input className="nb-rename-input" autoFocus value={renameTarget.value} style={{marginRight:4}}
                      onChange={e=>setRenameTarget(r=>({...r,value:e.target.value}))}
                      onBlur={commitRename} onClick={e=>e.stopPropagation()}
                      onKeyDown={e=>{if(e.key==='Enter')commitRename();if(e.key==='Escape')setRenameTarget(null);}}/>
                  ) : (
                    <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sec.label}</span>
                  )}
                  {!(renameTarget?.type==='section'&&renameTarget?.id===sec.id) && <>
                    <span className="sec-count">{noteCountFor(sec.id, nb.id)}</span>
                    <button className="nb-dot-btn" onClick={e=>{e.stopPropagation();setNbMenu(m=>m?.id===sec.id&&m?.type==='section'?null:{type:'section',id:sec.id,parentId:nb.id});}}>···</button>
                    {nbMenu?.type==='section'&&nbMenu?.id===sec.id&&(
                      <div className="nb-dropdown" onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>{setRenameTarget({type:'section',id:sec.id,parentId:nb.id,value:sec.label});setNbMenu(null);}}>Rename</button>
                        <div className="dd-sep"/>
                        <button className="danger" onClick={()=>deleteSection(sec.id,nb.id)}>Delete section</button>
                      </div>
                    )}
                  </>}
                </div>
              ))}
            </div>
          );
        })}
        </div>

        {/* New notebook button */}
        <div className="nb-footer" style={{padding:'10px',marginTop:'auto',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0,minHeight:'44px',position:'relative',zIndex:10}}>
          {showNewNB ? (
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <input className="nb-new-input" autoFocus placeholder="Notebook name" value={newNBValue}
                onChange={e=>setNewNBValue(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter')addNotebook();if(e.key==='Escape'){setShowNewNB(false);setNewNBValue('');}}}
                onBlur={()=>{if(!newNBValue.trim())setShowNewNB(false);}}/>
              <button className="btn xs primary" onClick={addNotebook}>Add</button>
            </div>
          ) : (
            <button style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'1px dashed rgba(255,255,255,0.12)',borderRadius:7,color:'var(--t3)',cursor:'pointer',padding:'6px 10px',width:'100%',fontSize:11,fontFamily:'var(--sans)',transition:'all .15s',boxSizing:'border-box',minHeight:'44px'}}
              onMouseEnter={e=>{e.currentTarget.style.color='var(--t2)';e.currentTarget.style.borderColor='rgba(255,255,255,0.22)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='var(--t3)';e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';}}
              onClick={()=>setShowNewNB(true)}>
              <Icon name="plus" size={11}/> New notebook
            </button>
          )}
        </div>
      </div>

      {/* ── Notes list ── */}
      <div className={`notes-list${listCollapsed && !isMobile?' collapsed':''}`}>
        {/* Mobile back button — list header */}
        <div className="notes-list-header-mobile">
          <button className="mobile-back-btn" onClick={()=>setMobilePanel('notebooks')}>
            ‹ <span>Notebooks</span>
          </button>
          <span style={{fontSize:12,fontWeight:700,color:'var(--t1)',flex:1,textAlign:'center'}}>{currentSection?.label||'Notes'}</span>
          <button className="btn xs primary" onClick={newNote} style={{flexShrink:0}}><Icon name="plus" size={11}/></button>
        </div>
        <div className="notes-list-header">
          {!listCollapsed && <span className="notes-list-header-title">{currentSection?.label || 'Notes'}</span>}
          {!listCollapsed && <button className="btn xs primary" onClick={newNote} title="New note" style={{flexShrink:0}}>
            <Icon name="plus" size={11}/> New
          </button>}
          <button className="panel-collapse-btn" title={listCollapsed?'Expand panel':'Collapse panel'}
            onClick={()=>{const v=!listCollapsed;setListCollapsed(v);localStorage.setItem('sanctum_list_col',String(v));}}
          >{listCollapsed?'›':'‹'}</button>
        </div>

        {loading && <div className="loading" style={{padding:20,textAlign:'center',fontSize:12,color:'var(--t3)'}}>Loading...</div>}
        {loadError && (
          <div className="notes-load-error" style={{padding:16,textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
            <div style={{fontSize:12,color:'var(--red)'}}>{loadError}</div>
            <button className="btn xs" onClick={() => { loadNotebooks(); loadNotes(); }}>Retry</button>
          </div>
        )}
        {!loading && !loadError && displayedNotes.length===0 && (
          <div style={{padding:28,textAlign:'center',color:'var(--t3)',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <Icon name="notes" size={32} color="var(--t3)" style={{opacity:.3}}/>
            <div style={{fontSize:12}}>{notebooks.length === 0 ? "You don't have any notes yet" : 'No notes in this section'}</div>
            <button className="btn xs primary" onClick={newNote}><Icon name="plus" size={11}/> {notebooks.length === 0 ? 'Create your first note' : 'New note'}</button>
          </div>
        )}

        {displayedNotes.map(n => (
          <div key={n.id}
            className={`note-list-item${activeNote===n.id?' active':''}${dragOverId==='note-'+n.id?' note-drag-over':''}${dragNoteId===n.id?' note-dragging':''}`}
            draggable
            data-note-id={n.id}
            onDragStart={e=>onNoteDragStart(e,n.id)} onDragOver={e=>onNoteDragOver(e,n.id)}
            onDragLeave={()=>setDragOverId(null)} onDrop={e=>onNoteDrop(e,n.id)}
            onDragEnd={()=>{setDragNoteId(null);setDragOverId(null);}}
            onTouchStart={e=>onNoteTouchStart(e,n)} onTouchMove={onNoteTouchMove} onTouchEnd={onNoteTouchEnd}
            onClick={()=>{ if (didTouchDrag.current) { didTouchDrag.current = false; return; } openNote(n); }}
            onContextMenu={e=>{e.preventDefault();setNoteMenu({id:n.id,x:e.clientX,y:e.clientY});}}
          >
            <div className="nli-row">
              <div className="nli-title" style={{display:'flex',alignItems:'center',gap:4}}>
                {n.locked && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2.5" style={{flexShrink:0}}>
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                )}
                {n.title||'Untitled'}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:2,flexShrink:0}}>
                {(()=>{const isLocked=n.locked&&!_sessionUnlockedNotes.has(String(n.id));return(
                <button className="nli-delete-btn" title={isLocked?'Unlock note first':'Delete note'} disabled={isLocked} onClick={e=>{e.stopPropagation();if(!isLocked&&window.confirm('Delete this note?'))deleteNote(n.id);}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                </button>);})()}
                <button className="nb-dot-btn" onClick={e=>{e.stopPropagation();setNoteMenu(m=>m?.id===n.id?null:{id:n.id,x:e.clientX,y:e.clientY});}}>···</button>
              </div>
            </div>
            <div className="nli-preview" style={n.locked?{color:'var(--t3)',letterSpacing:2}:undefined}>{n.locked ? '••••••' : (n.body||'').startsWith('ENC:v1:') ? '🔒 Encrypted' : (() => { const d = document.createElement('div'); d.innerHTML = n.body || ''; return (d.textContent || d.innerText || '').replace(/\s+/g,' ').trim().slice(0,60) || 'No content'; })()}</div>
            {n.tags&&<div className="nli-tags">{n.tags.split(',').filter(Boolean).slice(0,3).map(t=><span key={t} className="nli-tag">{t.trim()}</span>)}</div>}
            <div className="nli-date">{n.updated_at ? new Date(n.updated_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }) : ''}</div>
          </div>
        ))}
      </div>

      {/* Note context menu */}
      {noteMenu && (
        <div className="note-ctx-menu" style={{top:noteMenu.y,left:noteMenu.x}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>{const n=allNotes.find(x=>x.id===noteMenu.id);if(n){if(n.id!==activeNote)openNote(n);setRenameTarget({type:'note',id:n.id,value:n.title||''});}setNoteMenu(null);}}>Rename</button>
          <button onClick={()=>duplicateNote(noteMenu.id)}>Duplicate</button>
          <button onClick={()=>{setMoveModal({noteId:noteMenu.id});setNoteMenu(null);}}>Move to section</button>
          <div className="ctx-sep"/>
          {(()=>{const mn=allNotes.find(x=>x.id===noteMenu.id);const isLocked=mn?.locked&&!_sessionUnlockedNotes.has(String(noteMenu.id));return(<button className="danger" disabled={isLocked} title={isLocked?'Unlock note first':undefined} onClick={()=>deleteNote(noteMenu.id)}>Delete</button>);})()}
        </div>
      )}

      {/* ── Note editor ── */}
      <div className="note-editor">
        {currentNote ? (
          <>
            {/* Toolbar */}
            <div className="note-toolbar">
              {/* Mobile back button */}
              <button className="mobile-back-btn" style={{marginRight:6}} onClick={()=>setMobilePanel('list')}>‹ Notes</button>
              <span className="enc-badge" style={{flexShrink:0}}><Icon name="lock" size={8} color="var(--grn)"/> enc</span>
              <button
                className="note-tool-btn"
                title={currentNote?.locked ? 'Unlock note' : 'Lock note'}
                onClick={toggleNoteLock}
                style={{color: currentNote?.locked ? 'var(--amber)' : 'var(--t3)', flexShrink:0}}>
                {currentNote?.locked ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                  </svg>
                )}
              </button>
              <div style={{flex:1}}/>
              {!bodyLock && (<>
              <select
                className="note-format-select"
                value={lineFormat}
                onChange={e => { applyFormat(e.target.value); updateLineFormat(); }}
              >
                <option value="body">Body</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="ul">Bullet</option>
                <option value="ol">Numbered</option>
                <option value="check">Checklist</option>
              </select>
              <div className="note-toolbar-sep"/>
              <button className="note-tool-btn" title="Bold ⌘B"      onMouseDown={e=>{e.preventDefault();applyFormat('bold');}}><strong>B</strong></button>
              <button className="note-tool-btn" title="Italic ⌘I"    onMouseDown={e=>{e.preventDefault();applyFormat('italic');}}><em>I</em></button>
              <button className="note-tool-btn" title="Underline"    onMouseDown={e=>{e.preventDefault();applyFormat('underline');}} style={{textDecoration:'underline'}}>U</button>
              <div className="note-toolbar-sep"/>
              <button className="note-tool-btn" title="Checkbox"     onMouseDown={e=>{e.preventDefault();applyFormat('check');}}><Icon name="check" size={13} /></button>
              <button className="note-tool-btn" title="Insert table" onMouseDown={e=>{e.preventDefault();applyFormat('table');}}><Icon name="table" size={13} /></button>
              <button className="note-tool-btn" title="Link"          onMouseDown={e=>{e.preventDefault();applyFormat('link');}}><Icon name="link" size={13} /></button>
              <div className="note-toolbar-sep"/>
              </>)}
              <span style={{fontSize:10,color:'var(--t3)',fontFamily:'var(--mono)',padding:'0 3px',flexShrink:0}}>
                {editBody.split(/\s+/).filter(Boolean).length}w
              </span>
            </div>

            {/* Fullscreen expand/exit button — top-right corner of editor */}
            {fullscreen ? (
              <button className="fs-exit-btn" onClick={toggleFullscreen} title="Exit fullscreen">✕</button>
            ) : (
              <button className="fs-expand-btn" onClick={toggleFullscreen} title="Fullscreen"><Icon name="maximize" size={14} /></button>
            )}

            {currentNote.locked && !noteUnlocked ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:16,padding:40}}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <div style={{fontSize:15,fontWeight:600,color:'var(--t1)'}}>This note is locked</div>
                <div style={{fontSize:13,color:'var(--t3)'}}>Enter your PIN to read it</div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="PIN"
                  value={unlockPin}
                  onChange={e => setUnlockPin(e.target.value.replace(/\D/g,''))}
                  onKeyDown={e => e.key === 'Enter' && verifyPin()}
                  disabled={typeof pinError === 'string'}
                  style={{textAlign:'center',fontSize:24,letterSpacing:8,background:'var(--bg2)',border:'1px solid var(--b2)',borderRadius:10,padding:'12px 20px',color:'var(--t1)',width:160,fontFamily:'var(--mono)'}}
                  autoFocus
                />
                {pinError && (
                  <div style={{fontSize:12,color:'var(--red)'}}>
                    {typeof pinError === 'string' ? pinError : 'Incorrect PIN'}
                  </div>
                )}
                <button className="btn primary" onClick={verifyPin} disabled={typeof pinError === 'string' || unlockPin.length < 4}>Unlock</button>
                {showPinRecovery ? (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,width:'100%',maxWidth:300,marginTop:4}}>
                    <div style={{fontSize:13,color:'var(--t2)',textAlign:'center'}}>Enter your account password to bypass the PIN and clear it</div>
                    <input
                      type="password"
                      placeholder="Account password"
                      value={recoveryPwd}
                      onChange={e=>setRecoveryPwd(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter')recoverWithPassword();if(e.key==='Escape'){setShowPinRecovery(false);setRecoveryPwd('');setRecoveryError('');}}}
                      style={{textAlign:'center',fontSize:16,background:'var(--bg2)',border:'1px solid var(--b2)',borderRadius:10,padding:'10px 16px',color:'var(--t1)',width:220}}
                      autoFocus
                    />
                    {recoveryError&&<div style={{fontSize:12,color:'var(--red)'}}>{recoveryError}</div>}
                    <button className="btn primary" onClick={recoverWithPassword} disabled={!recoveryPwd.trim()}>Verify &amp; Unlock</button>
                    <button className="btn ghost" style={{fontSize:12}} onClick={()=>{setShowPinRecovery(false);setRecoveryPwd('');setRecoveryError('');}}>Cancel</button>
                  </div>
                ) : (
                  <button className="btn" style={{fontSize:11,color:'var(--t3)',marginTop:4}} onClick={()=>setShowPinRecovery(true)}>Forgot PIN?</button>
                )}
                <div style={{fontSize:11,color:'var(--t3)',marginTop:4}}>Locked notes are private and only visible to you</div>
              </div>
            ) : (
              <>
                {showUnlockBar && (
                  <div className="note-unlock-bar" style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:10,padding:'10px 12px',margin:'4px 0 8px',border:'1px solid var(--b2)',borderRadius:10,background:'var(--bg2)'}}>
                    <div style={{fontSize:13,color:'var(--amber)',flexBasis:'100%',textAlign:'center'}}>
                      Not saved yet. Enter your password to encrypt and save{draftIds.size > 1 ? ` (${draftIds.size} notes waiting)` : ''}.
                    </div>
                    {renderUnlockForm(false)}
                  </div>
                )}
                {keyError && !cryptoKey && !bodyLock && !showUnlockBar && (
                  <div style={{fontSize:12,color:'var(--red)',padding:'8px 0'}}>Encryption isn't set up: {keyError}</div>
                )}
                {/* Title */}
                <input className="note-title-input"
                  ref={titleInputRef}
                  value={renameTarget?.type==='note' ? renameTarget.value : editTitle}
                  onChange={e=>{
                    if(renameTarget?.type==='note') setRenameTarget(r=>({...r,value:e.target.value}));
                    else onTitleChange(e.target.value);
                  }}
                  onBlur={()=>{if(renameTarget?.type==='note') commitRename();}}
                  onKeyDown={e=>{if(renameTarget?.type==='note'&&e.key==='Enter'){commitRename();e.target.blur();}}}
                  readOnly={!!bodyLock}
                  placeholder="Untitled note"/>

                {/* Meta */}
                <div className="note-meta">
                  <span className="note-meta-item"><Icon name="calendar" size={10} color="var(--t3)"/> {currentNote.updated_at ? new Date(currentNote.updated_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }) : ''}</span>
                  <span className="note-meta-item"><Icon name="folder" size={10} color="var(--t3)"/> {currentNB?.label}{currentSection?.label ? ` / ${currentSection.label}` : ''}</span>
                </div>

                {/* Encrypted note with no usable key: read-only, ask for the password */}
                {bodyLock && (
                  <div className="note-enc-lock" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1,gap:14,padding:40}}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <div style={{fontSize:15,fontWeight:600,color:'var(--t1)'}}>
                      {bodyLock === 'failed' ? "This note can't be decrypted" : bodyLock === 'loading' ? 'Decrypting…' : 'This note is encrypted'}
                    </div>
                    {bodyLock === 'failed' && (
                      <div style={{fontSize:13,color:'var(--t3)',textAlign:'center',maxWidth:320}}>It may have been encrypted with a different password. It stays read-only so it can't be overwritten.</div>
                    )}
                    {bodyLock === 'nokey' && (<>
                      <div style={{fontSize:13,color:'var(--t3)'}}>Enter password to unlock</div>
                      {unlockRequested && <div style={{fontSize:12,color:'var(--amber)'}}>Unlock to make changes — nothing was saved.</div>}
                      {keyError && <div style={{fontSize:12,color:'var(--red)',textAlign:'center',maxWidth:320}}>{keyError}</div>}
                      {renderUnlockForm(true)}
                    </>)}
                  </div>
                )}

                {/* WYSIWYG contentEditable editor — kept mounted (loadBody needs the ref)
                    but not editable and hidden while the body is locked */}
                <div
                  ref={editorRef}
                  className="note-body-wysiwyg"
                  contentEditable={!bodyLock}
                  hidden={!!bodyLock}
                  aria-hidden={!!bodyLock}
                  suppressContentEditableWarning
                  data-placeholder="Start writing..."
                  spellCheck
                  onInput={syncBody}
                  onPaste={onEditorPaste}
                  onKeyDown={onEditorKeyDown}
                  onKeyUp={updateLineFormat}
                  onBlur={() => { const s = window.getSelection(); if (s?.rangeCount) savedRangeRef.current = s.getRangeAt(0).cloneRange(); }}
                  onClick={(e) => {
                    if (e.target.classList.contains('we-collapse-btn')) {
                      const heading = e.target.parentElement;
                      const isCollapsed = heading.classList.toggle('we-collapsed');
                      e.target.textContent = isCollapsed ? '▶' : '▼';
                      const level = heading.classList.contains('we-h1') ? 1 : 2;
                      let sib = heading.nextElementSibling;
                      while (sib) {
                        if (sib.classList.contains('we-h1') || (level === 2 && sib.classList.contains('we-h2'))) break;
                        sib.style.display = isCollapsed ? 'none' : '';
                        sib = sib.nextElementSibling;
                      }
                      return;
                    }
                    if (e.target.classList.contains('we-checkbox')) {
                      e.target.classList.toggle('checked');
                      e.target.textContent = e.target.classList.contains('checked') ? '☑' : '☐';
                      syncBody();
                    }
                    updateLineFormat();
                  }}
                />

                {/* Mobile bottom formatting toolbar */}
                {!bodyLock && <div className="mobile-editor-toolbar">
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('bold');}}><strong>B</strong></button>
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('italic');}}><em>I</em></button>
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('h1');}}>H1</button>
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('h2');}}>H2</button>
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('ul');}}>•—</button>
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('check');}}>☐</button>
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('code');}}><Icon name="code" size={12}/></button>
                </div>}

                {/* Tags */}
                <div className="note-tags-bar">
                  <Icon name="tag" size={11} color="var(--t3)"/>
                  {editTags.split(',').filter(t=>t.trim()).map(t=><span key={t} className="nli-tag">{t.trim()}</span>)}
                  <input className="note-tags-input" placeholder="Add tags: work, idea, ..." value={editTags} readOnly={!!bodyLock} onChange={e=>onTagsChange(e.target.value)}/>
                  {cryptoKey && <span style={{marginLeft:'auto',flexShrink:0,fontSize:10,color:'var(--grn)',opacity:.7}}>🔒 encrypted</span>}
                  {saveStatus==='saving' && <span key="saving" className="save-ind saving" style={{flexShrink:0}}>saving...</span>}
                  {saveStatus==='saved'  && <span key="saved"  className="save-ind saved"  style={{flexShrink:0}}>saved ✓</span>}
                  {saveStatus==='error'  && <span key="error"  className="save-ind error"  style={{flexShrink:0,color:'var(--red)'}}>Save failed</span>}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="note-empty">
            <div className="note-empty-icon"><Icon name="notes" size={52} color="var(--t3)"/></div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--t2)'}}>Select a note</div>
            <div style={{fontSize:12,color:'var(--t3)',textAlign:'center',lineHeight:1.6}}>
              or create a new one in<br/>
              <span style={{color:'var(--t2)'}}>{currentSection?.label || 'this section'}</span>
            </div>
            <button className="btn primary" onClick={newNote} style={{marginTop:6}}><Icon name="plus" size={14}/> New note</button>
          </div>
        )}
      </div>

      {/* ── Set PIN modal ── */}
      {pinModal === 'set' && (
        <div className="modal-overlay" onClick={()=>{setPinModal(null);setPinInput('');setPinConfirm('');}}>
          <div className="modal pin-modal-sheet" onClick={e=>e.stopPropagation()} style={{maxWidth:340}}>
            <div style={{fontSize:15,fontWeight:600,color:'var(--t1)',marginBottom:8}}>Lock this note</div>
            <div style={{fontSize:13,color:'var(--t3)',marginBottom:16}}>Set a 4–6 digit PIN. You'll need it to read this note.</div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter PIN"
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g,''))}
              style={{width:'100%',textAlign:'center',fontSize:24,letterSpacing:8,background:'var(--bg2)',border:'1px solid var(--b2)',borderRadius:10,padding:'12px',color:'var(--t1)',marginBottom:8,boxSizing:'border-box',fontFamily:'var(--mono)'}}
              autoFocus
            />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Confirm PIN"
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value.replace(/\D/g,''))}
              onKeyDown={e => e.key === 'Enter' && lockNote()}
              style={{width:'100%',textAlign:'center',fontSize:24,letterSpacing:8,background:'var(--bg2)',border:'1px solid var(--b2)',borderRadius:10,padding:'12px',color:'var(--t1)',marginBottom:16,boxSizing:'border-box',fontFamily:'var(--mono)'}}
            />
            <div className="modal-actions">
              <button className="btn" onClick={()=>{setPinModal(null);setPinInput('');setPinConfirm('');}}>Cancel</button>
              <button className="btn primary" onClick={lockNote} disabled={pinInput.length < 4 || pinInput !== pinConfirm}>Lock note</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove PIN modal ── */}
      {pinModal === 'remove' && (
        <div className="modal-overlay" onClick={()=>{setPinModal(null);setPinInput('');setPinError(false);}}>
          <div className="modal pin-modal-sheet" onClick={e=>e.stopPropagation()} style={{maxWidth:340}}>
            <div style={{fontSize:15,fontWeight:600,color:'var(--t1)',marginBottom:8}}>Remove lock</div>
            <div style={{fontSize:13,color:'var(--t3)',marginBottom:16}}>Enter your current PIN to remove the lock from this note.</div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Current PIN"
              value={pinInput}
              onChange={e => { setPinInput(e.target.value.replace(/\D/g,'')); setPinError(false); }}
              onKeyDown={e => e.key === 'Enter' && removeLock()}
              style={{width:'100%',textAlign:'center',fontSize:24,letterSpacing:8,background:'var(--bg2)',border:`1px solid ${pinError?'var(--red)':'var(--b2)'}`,borderRadius:10,padding:'12px',color:'var(--t1)',marginBottom:8,boxSizing:'border-box',fontFamily:'var(--mono)'}}
              autoFocus
            />
            {pinError && <div style={{fontSize:12,color:'var(--red)',marginBottom:8}}>Incorrect PIN</div>}
            <div className="modal-actions">
              <button className="btn" onClick={()=>{setPinModal(null);setPinInput('');setPinError(false);}}>Cancel</button>
              <button className="btn primary" onClick={removeLock} disabled={pinInput.length < 4}>Remove lock</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Move to section modal ── */}
      {moveModal && (
        <div className="modal-overlay" onClick={()=>setMoveModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div className="modal-title">Move to section</div>
              <button className="btn sm ghost" onClick={()=>setMoveModal(null)}><Icon name="x" size={14}/></button>
            </div>
            <div className="move-modal-sections">
              {notebooks.map(nb=>(
                <div key={nb.id}>
                  <div className="move-modal-nb" style={{display:"flex",alignItems:"center",gap:6}}><Icon name={nb.icon || "notes"} size={12} color={nb.color} /> {nb.label}</div>
                  {nb.sections.map(sec=>(
                    <div key={sec.id} className="move-modal-sec" onClick={()=>moveNote(moveModal.noteId,nb.id,sec.id)}>
                      <span className="section-dot" style={{background:sec.id===activeSection?'var(--blue)':'var(--b3)'}}/>
                      {sec.label}
                      <span style={{marginLeft:'auto',fontSize:10,color:'var(--t3)',fontFamily:'var(--mono)'}}>{noteCountFor(sec.id, nb.id)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
