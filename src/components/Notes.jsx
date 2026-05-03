// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { useState, useEffect, useRef, useCallback } from "react";
import { sb } from "../lib/supabase";
import { Icon, Modal, DEFAULT_NOTEBOOKS } from "./shared";
import { useCrypto } from "../lib/CryptoContext.jsx";
import { encrypt, decrypt, isEncrypted } from "../lib/crypto.js";

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
    if (/^[-*] \[[x ]\] /i.test(line)) {
      const checked = /^[-*] \[x\] /i.test(line);
      const content = line.replace(/^[-*] \[[x ]\] /i, '');
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


// ─── NOTES ───────────────────────────────────────────────────────────────────
export default function Notes({ user }) {
  const { key: cryptoKey, keyLoading } = useCrypto();
  const cryptoKeyRef = useRef(cryptoKey);
  useEffect(() => { cryptoKeyRef.current = cryptoKey; }, [cryptoKey]);
  // ── Notebooks (Supabase + localStorage backed) ───────────────────────
  const [notebooks, setNotebooks] = useState(() => {
    try { const s = localStorage.getItem('sanctum_notebooks_v2'); if (s) return JSON.parse(s); } catch {}
    return DEFAULT_NOTEBOOKS;
  });
  useEffect(() => {
    const singletonId = `singleton_${user?.id || 'default'}`;
    sb.from('notebooks').select('*', '', '').then((res) => {
      const rows = Array.isArray(res) ? res : [];
      const singleton = rows.find(r => r.id === singletonId);
      if (singleton && Array.isArray(singleton.data) && singleton.data.length > 0) {
        // Valid data in Supabase — use it
        setNotebooks(singleton.data);
        localStorage.setItem('sanctum_notebooks_v2', JSON.stringify(singleton.data));
      } else {
        // No singleton or empty data (new user / first Tamara login) — seed with defaults
        sb.from('notebooks').upsert({ id: singletonId, user_id: user?.id, data: DEFAULT_NOTEBOOKS, updated_at: new Date().toISOString() }, 'id').catch(() => {});
      }
    }).catch(() => {}); // network error — keep current state (localStorage/defaults)
  }, []);
  const saveNotebooks = useCallback(async (nbs) => {
    setNotebooks(nbs);
    localStorage.setItem('sanctum_notebooks_v2', JSON.stringify(nbs));
    try {
      await sb.from('notebooks').upsert({ id: `singleton_${user?.id || 'default'}`, user_id: user?.id, data: nbs, updated_at: new Date().toISOString() }, 'id');
    } catch (err) {
      console.error('Failed to save notebooks to Supabase:', err);
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
  const [saveStatus, setSaveStatus] = useState('idle');
  const [migrating,  setMigrating]  = useState(false);
  const migratedRef = useRef(false);
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
      let body = note.body || '';
      if (isEncrypted(body)) {
        if (cryptoKey) {
          try { body = await decrypt(body, cryptoKey); } catch {
            body = '<div class="we-line" style="color:var(--t3);font-style:italic">⚠️ Decryption failed — this note may have been encrypted with a different password or key.</div>';
          }
        } else if (keyLoading) {
          body = '<div class="we-line" style="color:var(--t3);font-style:italic">Decrypting...</div>';
        } else {
          body = '<div class="we-line" style="color:var(--t3);font-style:italic">🔒 This note is encrypted. Log in with your password to decrypt.</div>';
        }
      }
      if (!editorRef.current) return;
      editorRef.current.innerHTML = body.trimStart().startsWith('<') ? body : mdToHtmlWysiwyg(body);
      addCollapseButtons();
      setEditBody(htmlToMd(editorRef.current));
    }
    loadBody();
  }, [activeNote, cryptoKey, keyLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset PIN state on note switch ────────────────────────────────────
  useEffect(() => {
    setNoteUnlocked(false);
    setUnlockPin('');
    setPinError(false);
    setFailedAttempts(0);
  }, [activeNote]);

  // ── Load ──────────────────────────────────────────────────────────────
  useEffect(() => { loadNotes(); }, []);
  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await sb.from("notes").select("*");
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
        setAllNotes(normalized);
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
        if (first) {
          const nbId  = first.notebook || DEFAULT_NOTEBOOKS[0]?.id || '';
          const secId = first.section  || '';
          setActiveNB(nbId);   localStorage.setItem('sanctum_active_nb', nbId);
          if (secId) { setActiveSection(secId); localStorage.setItem('sanctum_active_sec', secId); }
          else       { setActiveSection(null);  localStorage.setItem('sanctum_active_sec', ''); }
          openNote(first, false);
        }
      }
    } catch { setAllNotes([]); }
    setLoading(false);
  };

  // ── Background migration: encrypt plaintext notes on first login with key ──
  useEffect(() => {
    if (!cryptoKey || migratedRef.current || loading) return;
    const plainNotes = allNotes.filter(n => n.body && !isEncrypted(n.body));
    if (plainNotes.length === 0) { migratedRef.current = true; return; }
    migratedRef.current = true;
    const runMigration = async () => {
      setMigrating(true);
      for (const note of plainNotes) {
        try {
          const encrypted = await encrypt(note.body, cryptoKey);
          await sb.from("notes").update({ body: encrypted }, { id: note.id });
          setAllNotes(prev => prev.map(n => n.id === note.id ? { ...n, body: encrypted } : n));
        } catch {}
      }
      setMigrating(false);
    };
    runMigration();
  }, [cryptoKey, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save (700ms debounce) ────────────────────────────────────────
  const flushSave = useCallback(async () => {
    if (!dirtyRef.current) return;
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const { id, title, body, tags } = pendingSave.current;
    if (!id) return;
    setSaveStatus('saving');
    const updated = new Date().toISOString();
    let bodyToSave = body;
    if (cryptoKeyRef.current) {
      try { bodyToSave = await encrypt(body, cryptoKeyRef.current); } catch(e) { console.error('flushSave encrypt error:', e); }
    }
    setAllNotes(prev => prev.map(n => n.id === id ? { ...n, title, body: bodyToSave, tags, updated_at: updated } : n));
    try { await sb.from("notes").update({ title, body: bodyToSave, tags, updated_at: updated }, { id }); } catch(e) { console.error('flushSave error:', e); }
    dirtyRef.current = false;
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 1500);
  }, []);

  // body is read from editorRef at call time so new notes always save current HTML
  const autoSave = useCallback((id, title, tags) => {
    dirtyRef.current = true;
    const body = sanitizeHtml(editorRef.current?.innerHTML || '');
    pendingSave.current = { id, title, body, tags };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      const updated = new Date().toISOString();
      const { id: sid, title: stitle, body: sbody, tags: stags } = pendingSave.current;
      let bodyToSave = sbody;
      if (cryptoKeyRef.current) {
        try { bodyToSave = await encrypt(sbody, cryptoKeyRef.current); } catch(e) { console.error('autoSave encrypt error:', e); }
      }
      setAllNotes(prev => prev.map(n => n.id === sid ? { ...n, title: stitle, body: bodyToSave, tags: stags, updated_at: updated } : n));
      try { await sb.from("notes").update({ title: stitle, body: bodyToSave, tags: stags, updated_at: updated }, { id: sid }); } catch(e) { console.error('autoSave error:', e); }
      dirtyRef.current = false;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 1500);
    }, 700);
  }, []);

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
    const nb = notebooks.find(n => n.id === activeNB);
    const sectionId = activeSection || nb?.sections[0]?.id || '';
    const sec = nb?.sections.find(s => s.id === sectionId);
    const note = { notebook: nb?.id || activeNB, section: sectionId, title: '', body: '', tags: '', updated_at: new Date().toISOString().slice(0, 10), user_id: user?.id };
    try {
      const res = await sb.from("notes").insert(note);
      if (!Array.isArray(res) || !res[0]?.id) console.error('[newNote] Insert failed or no id:', res);
      const created = Array.isArray(res) && res[0]?.id ? res[0] : { ...note, id: `local_${Date.now()}` };
      setAllNotes(prev => [created, ...prev]); openNote(created);
      setTimeout(() => titleInputRef.current?.focus(), 80);
    } catch (err) { console.error('[newNote] error:', err); const n = { ...note, id: `local_${Date.now()}` }; setAllNotes(prev => [n, ...prev]); openNote(n); setTimeout(() => titleInputRef.current?.focus(), 80); }
  };

  const deleteNote = async (id) => {
    const nid = id || activeNote; if (!nid) return;
    const remaining = allNotes.filter(n => n.id !== nid); setAllNotes(remaining);
    if (nid === activeNote) {
      const _secL = activeSection?.toLowerCase().trim() || '';
      const _nbL  = activeNB?.toLowerCase().trim() || '';
      const next = activeSection
        ? remaining.find(n => (n.section?.toLowerCase().trim() || '') === _secL)
        : remaining.find(n => (n.notebook?.toLowerCase().trim() || '') === _nbL);
      if (next) openNote(next); else { setActiveNote(null); setEditTitle(''); setEditBody(''); setEditTags(''); localStorage.removeItem('sanctum_active_note'); }
    }
    try { await sb.from("notes").delete({ id: nid }); } catch {}
    setNoteMenu(null);
  };

  const duplicateNote = async (id) => {
    const note = allNotes.find(n => n.id === id); if (!note) return;
    const { id: _id, ...rest } = note;
    const dup = { ...rest, title: (note.title || 'Untitled') + ' copy', updated_at: new Date().toISOString().slice(0, 10), user_id: user?.id };
    try {
      const res = await sb.from("notes").insert(dup);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...dup, id: Date.now().toString() };
      setAllNotes(prev => [created, ...prev]); openNote(created);
    } catch { const n = { ...dup, id: Date.now().toString() }; setAllNotes(prev => [n, ...prev]); openNote(n); }
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
    try { await sb.from("notes").update({ notebook: nbLabel, section: secLabel }, { id: noteId }); } catch {}
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
    if (currentNote.locked) { setPinModal('remove'); setPinInput(''); setPinError(false); }
    else                    { setPinModal('set');    setPinInput(''); setPinConfirm(''); setPinError(false); }
  };

  const lockNote = async () => {
    if (pinInput.length < 4 || pinInput !== pinConfirm) return;
    const hash = await hashPin(pinInput);
    await sb.from('notes').update({ locked: true, pin_hash: hash }, { id: activeNote });
    setAllNotes(prev => prev.map(n => n.id === activeNote ? { ...n, locked: true, pin_hash: hash } : n));
    setNoteUnlocked(false);
    setPinModal(null); setPinInput(''); setPinConfirm('');
  };

  const verifyPin = async () => {
    if (typeof pinError === 'string') return;
    const hash = await hashPin(unlockPin);
    if (hash === currentNote?.pin_hash) {
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

  const removeLock = async () => {
    const hash = await hashPin(pinInput);
    if (hash !== currentNote?.pin_hash) { setPinError(true); return; }
    await sb.from('notes').update({ locked: false, pin_hash: null }, { id: activeNote });
    setAllNotes(prev => prev.map(n => n.id === activeNote ? { ...n, locked: false, pin_hash: null } : n));
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
      let node = sel.getRangeAt(0).startContainer;
      while (node && node.parentElement && node.parentElement !== ed) node = node.parentElement;
      const block = (node && node !== ed && node.parentElement === ed) ? node : ed.lastChild;

      if (fmt === 'hr') {
        const hrDiv = document.createElement('div'); hrDiv.className = 'we-hr'; hrDiv.innerHTML = '<hr>';
        const next  = document.createElement('div'); next.className  = 'we-line'; next.innerHTML = '<br>';
        if (block) { block.after(hrDiv); hrDiv.after(next); } else { ed.appendChild(hrDiv); ed.appendChild(next); }
        const r = document.createRange(); r.setStart(next, 0); r.collapse(true); sel.removeAllRanges(); sel.addRange(r);
      } else {
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
        const tw = document.createTreeWalker(newEl, NodeFilter.SHOW_TEXT, null);
        let last = null; while (tw.nextNode()) last = tw.currentNode;
        const r = document.createRange();
        if (last) { r.setStart(last, last.length); r.collapse(true); }
        else { r.selectNodeContents(newEl); r.collapse(false); }
        sel.removeAllRanges(); sel.addRange(r);
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
    // Capture IDs before state update — local state is normalised to IDs, DB may store labels
    const noteIdsToDelete = allNotes.filter(n => n.section === secId).map(n => n.id);
    saveNotebooks(notebooks.map(n=>n.id!==parentId?n:{...n,sections:n.sections.filter(s=>s.id!==secId)}));
    if (activeSection===secId) { const rem=nb.sections.filter(s=>s.id!==secId); if(rem[0]) selectSection(rem[0].id,parentId); }
    setAllNotes(prev => prev.filter(n => n.section !== secId));
    try { await Promise.all(noteIdsToDelete.map(id => sb.from("notes").delete({ id }))); } catch {}
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

  // ── Note touch drag + long-press ─────────────────────────────────────
  const onNoteTouchStart = (e, n) => {
    didTouchDrag.current = false;
    const touch = e.touches[0];
    touchNoteRef.current = { id: n.id, startX: touch.clientX, startY: touch.clientY, dragging: false };
    longPressTimer.current = setTimeout(() => {
      if (touchNoteRef.current && !touchNoteRef.current.dragging) {
        didTouchDrag.current = true;
        setNoteMenu({ id: n.id, x: touchNoteRef.current.startX, y: touchNoteRef.current.startY });
        touchNoteRef.current = null;
      }
    }, 600);
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
        {!loading && displayedNotes.length===0 && (
          <div style={{padding:28,textAlign:'center',color:'var(--t3)',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <Icon name="notes" size={32} color="var(--t3)" style={{opacity:.3}}/>
            <div style={{fontSize:12}}>No notes in this section</div>
            <button className="btn xs primary" onClick={newNote}><Icon name="plus" size={11}/> New note</button>
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
              <button className="nb-dot-btn" onClick={e=>{e.stopPropagation();setNoteMenu(m=>m?.id===n.id?null:{id:n.id,x:e.clientX,y:e.clientY});}}>···</button>
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
          <button className="danger" onClick={()=>deleteNote(noteMenu.id)}>Delete</button>
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
                <button className="btn" style={{fontSize:11,color:'var(--t3)',marginTop:4}} onClick={()=>{setPinModal('remove');setPinInput('');setPinError(false);}}>Forgot PIN? Remove lock</button>
                <div style={{fontSize:11,color:'var(--t3)',marginTop:4}}>Locked notes are private and only visible to you</div>
              </div>
            ) : (
              <>
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
                  placeholder="Untitled note"/>

                {/* Meta */}
                <div className="note-meta">
                  <span className="note-meta-item"><Icon name="calendar" size={10} color="var(--t3)"/> {currentNote.updated_at ? new Date(currentNote.updated_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }) : ''}</span>
                  <span className="note-meta-item"><Icon name="folder" size={10} color="var(--t3)"/> {currentNB?.label}{currentSection?.label ? ` / ${currentSection.label}` : ''}</span>
                </div>

                {/* WYSIWYG contentEditable editor */}
                <div
                  ref={editorRef}
                  className="note-body-wysiwyg"
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Start writing..."
                  spellCheck
                  onInput={syncBody}
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
                <div className="mobile-editor-toolbar">
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('bold');}}><strong>B</strong></button>
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('italic');}}><em>I</em></button>
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('h1');}}>H1</button>
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('h2');}}>H2</button>
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('ul');}}>•—</button>
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('check');}}>☐</button>
                  <button className="note-tool-btn" onMouseDown={e=>{e.preventDefault();applyFormat('code');}}><Icon name="code" size={12}/></button>
                </div>

                {/* Tags */}
                <div className="note-tags-bar">
                  <Icon name="tag" size={11} color="var(--t3)"/>
                  {editTags.split(',').filter(t=>t.trim()).map(t=><span key={t} className="nli-tag">{t.trim()}</span>)}
                  <input className="note-tags-input" placeholder="Add tags: work, idea, ..." value={editTags} onChange={e=>onTagsChange(e.target.value)}/>
                  {cryptoKey && <span style={{marginLeft:'auto',flexShrink:0,fontSize:10,color:'var(--grn)',opacity:.7}}>🔒 encrypted</span>}
                  {saveStatus==='saving' && <span key="saving" className="save-ind saving" style={{flexShrink:0}}>saving...</span>}
                  {saveStatus==='saved'  && <span key="saved"  className="save-ind saved"  style={{flexShrink:0}}>saved ✓</span>}
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
