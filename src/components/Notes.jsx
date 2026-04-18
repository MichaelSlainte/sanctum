import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { sb } from "../lib/supabase";
import { Icon, Modal, DEFAULT_NOTEBOOKS } from "./shared";

const mdToHtmlWysiwyg = (text) => {
  if (!text) return '';
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inlineFmt = s => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*|_)_([^_]+)_(?!\*|_)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
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

// ─── MARKDOWN → HTML PREVIEW ─────────────────────────────────────────────────
const mdToHtmlPreview = (text) => {
  if (!text) return '';
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inline = s => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/<u>(.*?)<\/u>/g, '<span style="text-decoration:underline">$1</span>');
  const lines = text.split('\n');
  let html = '', inCode = false, codeBuf = [], tableBuf = [];
  const flushTable = () => {
    if (!tableBuf.length) return;
    const rows = tableBuf.filter(r => !/^\|[\s|:-]+\|$/.test(r.trim()));
    const parseRow = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    let thtml = '<table style="border-collapse:collapse;width:100%;margin:8px 0"><thead><tr>';
    parseRow(rows[0]).forEach(c => { thtml += `<th style="border:1px solid var(--b2);padding:6px 10px;font-size:13px;font-weight:600;color:var(--t1)">${inline(c)}</th>`; });
    thtml += '</tr></thead><tbody>';
    rows.slice(1).forEach(r => {
      thtml += '<tr>';
      parseRow(r).forEach(c => { thtml += `<td style="border:1px solid var(--b2);padding:6px 10px;font-size:13px;color:var(--t2)">${inline(c)}</td>`; });
      thtml += '</tr>';
    });
    thtml += '</tbody></table>';
    html += thtml;
    tableBuf = [];
  };
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      flushTable();
      if (inCode) { html += `<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`; codeBuf = []; inCode = false; }
      else { inCode = true; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }
    if (/^\|.+\|/.test(line)) { tableBuf.push(line); continue; }
    flushTable();
    const hm = line.match(/^(#{1,3}) (.*)/);
    if (hm) { html += `<h${hm[1].length}>${inline(hm[2]||'')}</h${hm[1].length}>`; continue; }
    if (line.trim() === '---') { html += '<hr>'; continue; }
    if (/^[-*] \[[x ]\] /i.test(line)) {
      const checked = /^[-*] \[x\] /i.test(line);
      const content = line.replace(/^[-*] \[[x ]\] /i, '');
      html += `<label style="display:block;padding:2px 0;font-size:inherit;color:var(--t2)"><input type="checkbox" disabled${checked?' checked':''}/> ${inline(content)}</label>`;
      continue;
    }
    if (/^[-*] /.test(line)) { html += `<ul><li>${inline(line.slice(2))}</li></ul>`; continue; }
    if (line.trim() === '') { html += '<br>'; continue; }
    html += `<p>${inline(line)}</p>`;
  }
  flushTable();
  if (inCode) html += `<pre><code>${esc(codeBuf.join('\n'))}</code></pre>`;
  return html;
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
    if (tag === 'A') { const href = node.getAttribute('href')||''; let t=''; node.childNodes.forEach(c=>{if(c.nodeType===3)t+=c.textContent;}); md += `[${t||node.textContent}](${href})`; return; }
    if (tag === 'HR') { md += '---\n'; return; }
    if (tag === 'PRE') { const code = node.querySelector('code'); md += '```\n' + (code?code.textContent:node.textContent) + '\n```\n'; return; }
    if (tag === 'SPAN') {
      if (cls.includes('we-bullet') || cls.includes('we-checkbox')) return;
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

const saveCursorOffset = (el) => {
  try {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return null;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    return pre.toString().length;
  } catch { return null; }
};

const restoreCursorOffset = (el, offset) => {
  if (offset === null || offset === undefined || !el) return;
  try {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let remaining = offset, lastNode = null;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      lastNode = node;
      if (remaining <= node.length) {
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        return;
      }
      remaining -= node.length;
    }
    if (lastNode) {
      const range = document.createRange();
      range.setStart(lastNode, lastNode.length);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  } catch {}
};

function SplitEditor({ value, onChange, placeholder, textareaRef, editorMode, setMode, onCursorMove }) {
  const innerRef = useRef(null);
  const ref = textareaRef || innerRef;
  const preview = useMemo(() => mdToHtmlPreview(value), [value]);

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      const ta = ref.current; if (!ta) return;
      const s = ta.selectionStart, en = ta.selectionEnd;
      const sel = value.slice(s, en) || 'bold';
      const ins = `**${sel}**`;
      const nv = value.slice(0, s) + ins + value.slice(en);
      onChange(nv);
      setTimeout(() => ta.setSelectionRange(s + ins.length, s + ins.length), 0);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      const ta = ref.current; if (!ta) return;
      const s = ta.selectionStart, en = ta.selectionEnd;
      const sel = value.slice(s, en) || 'italic';
      const ins = `_${sel}_`;
      const nv = value.slice(0, s) + ins + value.slice(en);
      onChange(nv);
      setTimeout(() => ta.setSelectionRange(s + ins.length, s + ins.length), 0);
    }
  }, [value, onChange, ref]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="split-editor-shell">
      <div className="split-editor-modebar">
        <span>View:</span>
        <button className={`note-tool-btn${editorMode==='write'?' on':''}`} onClick={() => setMode('write')}>Write</button>
        <button className={`note-tool-btn${editorMode==='split'?' on':''}`} onClick={() => setMode('split')}>Split</button>
        <button className={`note-tool-btn${editorMode==='preview'?' on':''}`} onClick={() => setMode('preview')}>Preview</button>
      </div>
      <div className={`split-editor-body split-mode-${editorMode}`}>
        <textarea
          ref={ref}
          className="note-body-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'Start writing in Markdown...\n\n# Heading 1\n## Heading 2\n\n**bold**  _italic_  `code`\n- bullet\n```\ncode block\n```\n--- (divider)'}
          spellCheck={true}
          onKeyDown={handleKeyDown}
          onKeyUp={onCursorMove}
          onClick={onCursorMove}
        />
        <div
          className="note-body-preview"
          dangerouslySetInnerHTML={{ __html: preview || '<p style="color:var(--t3);opacity:.4;font-size:13px">Start writing to see preview...</p>' }}
        />
      </div>
    </div>
  );
}

// ─── NOTES ───────────────────────────────────────────────────────────────────
export default function Notes() {
  // ── Notebooks (localStorage backed) ──────────────────────────────────
  const [notebooks, setNotebooks] = useState(() => {
    try { const s = localStorage.getItem('sanctum_notebooks_v2'); if (s) return JSON.parse(s); } catch {}
    return DEFAULT_NOTEBOOKS;
  });
  const saveNotebooks = useCallback((nbs) => {
    setNotebooks(nbs);
    localStorage.setItem('sanctum_notebooks_v2', JSON.stringify(nbs));
  }, []);
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
  const saveTimer   = useRef(null);
  const dirtyRef    = useRef(false);
  const pendingSave = useRef({ id: null, title: '', body: '', tags: '' });
  const editorRef      = useRef(null);
  const titleInputRef  = useRef(null);
  const [editorMode, setEditorMode] = useState(() => localStorage.getItem('sanctum_editor_mode') || 'write');
  const setMode = (m) => { setEditorMode(m); localStorage.setItem('sanctum_editor_mode', m); };
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
        // Restore last viewed state — case-insensitive so legacy label-stored values still match
        const storedNB  = (localStorage.getItem('sanctum_active_nb')  || DEFAULT_NOTEBOOKS[0]?.id || '').toLowerCase().trim();
        const storedSec = (localStorage.getItem('sanctum_active_sec') || '').toLowerCase().trim();
        // Also match stored value as a label (e.g. localStorage had "mortgage & house" → id "mortgage")
        const resolveNBId  = (v) => DEFAULT_NOTEBOOKS.find(nb => nb.id.toLowerCase()===v||nb.label.toLowerCase()===v)?.id || v;
        const resolveSecId = (nbId, v) => DEFAULT_NOTEBOOKS.find(nb=>nb.id===nbId)?.sections.find(s=>s.id.toLowerCase()===v||s.label.toLowerCase()===v)?.id || v;
        const resolvedNB  = resolveNBId(storedNB);
        const resolvedSec = resolveSecId(resolvedNB, storedSec);
        let first;
        if (resolvedSec) first = normalized.find(n => n.section.toLowerCase() === resolvedSec.toLowerCase());
        if (!first && resolvedNB) first = normalized.find(n => n.notebook.toLowerCase() === resolvedNB.toLowerCase());
        if (!first && normalized.length > 0) first = normalized[0];
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

  // ── Auto-save (700ms debounce) ────────────────────────────────────────
  const flushSave = useCallback(async () => {
    if (!dirtyRef.current) return;
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const { id, title, body, tags } = pendingSave.current;
    if (!id) return;
    setSaveStatus('saving');
    const updated = new Date().toISOString();
    setAllNotes(prev => prev.map(n => n.id === id ? { ...n, title, body, tags, updated_at: updated } : n));
    try { await sb.from("notes").update({ title, body, tags, updated_at: updated }, { id }); } catch {}
    dirtyRef.current = false;
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2000);
  }, []);

  const autoSave = useCallback((id, title, body, tags) => {
    dirtyRef.current = true;
    pendingSave.current = { id, title, body, tags };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      const updated = new Date().toISOString();
      setAllNotes(prev => prev.map(n => n.id === id ? { ...n, title, body, tags, updated_at: updated } : n));
      try { await sb.from("notes").update({ title, body, tags, updated_at: updated }, { id }); } catch {}
      dirtyRef.current = false;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2000);
    }, 700);
  }, []);

  const openNote = async (n, navigate = true) => {
    if (dirtyRef.current) await flushSave();
    setActiveNote(n.id); setEditTitle(n.title || ''); setEditBody(n.body || ''); setEditTags(n.tags || '');
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

  const onTitleChange = (v) => { setEditTitle(v); if (activeNote) autoSave(activeNote, v, editBody, editTags); };
  const onBodyChange  = (v) => {
    setEditBody(v);
    if (activeNote) autoSave(activeNote, editTitle, v, editTags);
  };
  const onTagsChange  = (v) => { setEditTags(v);  if (activeNote) autoSave(activeNote, editTitle, editBody, v); };

  // ── CRUD ──────────────────────────────────────────────────────────────
  const newNote = async () => {
    const nb = notebooks.find(n => n.id === activeNB);
    const sectionId = activeSection || nb?.sections[0]?.id || '';
    const sec = nb?.sections.find(s => s.id === sectionId);
    // Save capitalised label so DB is consistent with config (normalization on load handles legacy lowercase ids)
    const note = { notebook: nb?.label || activeNB, section: sec?.label || sectionId, title: '', body: '', tags: '', updated_at: new Date().toISOString().slice(0, 10) };
    try {
      const res = await sb.from("notes").insert(note);
      const created = Array.isArray(res) && res[0] ? res[0] : { ...note, id: Date.now().toString() };
      setAllNotes(prev => [created, ...prev]); openNote(created);
      setTimeout(() => titleInputRef.current?.focus(), 80);
    } catch { const n = { ...note, id: Date.now().toString() }; setAllNotes(prev => [n, ...prev]); openNote(n); setTimeout(() => titleInputRef.current?.focus(), 80); }
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
      if (next) openNote(next); else { setActiveNote(null); setEditTitle(''); setEditBody(''); setEditTags(''); }
    }
    try { await sb.from("notes").delete({ id: nid }); } catch {}
    setNoteMenu(null);
  };

  const duplicateNote = async (id) => {
    const note = allNotes.find(n => n.id === id); if (!note) return;
    const { id: _id, ...rest } = note;
    const dup = { ...rest, title: (note.title || 'Untitled') + ' copy', updated_at: new Date().toISOString().slice(0, 10) };
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

  // ── Formatting (WYSIWYG) ──────────────────────────────────────────────
  const detectLineFormat = useCallback(() => {
    const ta = editorRef.current; if (!ta) return 'body';
    const text = ta.value;
    const start = ta.selectionStart ?? 0;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = (() => { const i = text.indexOf('\n', start); return i === -1 ? text.length : i; })();
    const line = text.slice(lineStart, lineEnd);
    if (line.startsWith('### ')) return 'h3';
    if (line.startsWith('## '))  return 'h2';
    if (line.startsWith('# '))   return 'h1';
    if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) return 'check';
    if (line.startsWith('- ') || line.startsWith('* ')) return 'ul';
    if (/^\d+\. /.test(line)) return 'ol';
    return 'body';
  }, []);

  const updateLineFormat = useCallback(() => setLineFormat(detectLineFormat()), [detectLineFormat]);

  const applyFormat = (fmt) => {
    const ta = editorRef.current; if (!ta) return;
    if (editorMode !== 'write' && editorMode !== 'split') setMode('write');
    ta.focus();
    const text = editBody;
    const start = ta.selectionStart ?? text.length;
    const end   = ta.selectionEnd   ?? text.length;
    const selText = text.slice(start, end);

    if (fmt === 'body') {
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const lineEnd   = (() => { const i = text.indexOf('\n', start); return i === -1 ? text.length : i; })();
      const line = text.slice(lineStart, lineEnd);
      const stripped = line.replace(/^#{1,3} |^[-*] \[[ x]\] |^[-*] |^\d+\. /, '');
      const newText = text.slice(0, lineStart) + stripped + text.slice(lineEnd);
      onBodyChange(newText);
      const diff = stripped.length - line.length;
      setTimeout(() => ta.setSelectionRange(Math.max(lineStart, start + diff), Math.max(lineStart, start + diff)), 0);
      return;
    }

    if (['h1','h2','h3','ul','ol','check','hr'].includes(fmt)) {
      const pm = { h1:'# ', h2:'## ', h3:'### ', ul:'- ', ol:'1. ', check:'- [ ] ', hr:'---' };
      const px = pm[fmt];
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const lineEnd   = (() => { const i = text.indexOf('\n', start); return i === -1 ? text.length : i; })();
      const line = text.slice(lineStart, lineEnd);
      let newText, newCursor;
      if (fmt === 'hr') {
        const ins = '\n---\n';
        newText = text.slice(0, lineEnd) + ins + text.slice(lineEnd);
        newCursor = lineEnd + ins.length;
      } else {
        const existing = Object.entries(pm).find(([,p]) => p !== '---' && line.startsWith(p));
        const stripped = line.replace(/^#{1,3} |^[-*] \[[ x]\] |^[-*] |^\d+\. /,'');
        const newLine  = (existing && existing[0] === fmt) ? stripped : px + stripped;
        newText = text.slice(0, lineStart) + newLine + text.slice(lineEnd);
        const diff = newLine.length - line.length;
        newCursor = Math.max(lineStart, start + diff);
      }
      onBodyChange(newText);
      setTimeout(() => ta.setSelectionRange(newCursor, newCursor), 0);
      return;
    }

    // Inline formats
    const map = { bold:`**${selText||'bold'}**`, italic:`_${selText||'italic'}_`, code:`\`${selText||'code'}\``, codeblock:`\`\`\`\n${selText||'code'}\n\`\`\``, link:`[${selText||'text'}](url)`, underline:`<u>${selText||'text'}</u>`, table:`| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell     | Cell     | Cell     |` };
    const insert = map[fmt]; if (!insert) return;
    const newText = text.slice(0, start) + insert + text.slice(end);
    onBodyChange(newText);
    const nc = start + insert.length;
    setTimeout(() => ta.setSelectionRange(nc, nc), 0);
  };

  // ── Markdown renderer with collapsible headings ───────────────────────
  // ── Notebook CRUD ─────────────────────────────────────────────────────
  const addNotebook = () => {
    if (!newNBValue.trim()) { setShowNewNB(false); return; }
    const id='nb-'+Date.now(), secId='sec-'+Date.now();
    const nb={id, label:newNBValue.trim(), emoji:'📓', color:'#8b5cf6', bg:'rgba(139,92,246,0.15)', sections:[{id:secId,label:'General'}]};
    saveNotebooks([...notebooks, nb]); toggleExpand(id);
    setNewNBValue(''); setShowNewNB(false);
  };
  const deleteNotebook = (id) => {
    const rem = notebooks.filter(n => n.id!==id); saveNotebooks(rem);
    if (activeNB===id && rem[0]) selectSection(rem[0].sections[0]?.id, rem[0].id);
    setNbMenu(null);
  };
  const addSection = async (nbId) => {
    const id='sec-'+Date.now(), label='New Section';
    saveNotebooks(notebooks.map(nb => nb.id!==nbId ? nb : {...nb, sections:[...nb.sections,{id,label}]}));
    setNbMenu(null);
    try {
      const res = await sb.from("notes").insert({ notebook: nbId, section: id, title: label, body: '', tags: '' });
      const created = Array.isArray(res) && res[0] ? res[0] : { notebook: nbId, section: id, title: label, body: '', tags: '', id: Date.now().toString() };
      setAllNotes(prev => [...prev, created]);
    } catch {}
    setTimeout(() => setRenameTarget({type:'section',id,parentId:nbId,value:label}), 50);
  };
  const deleteSection = async (secId, parentId) => {
    const nb=notebooks.find(n=>n.id===parentId); if(!nb||nb.sections.length<=1) return;
    saveNotebooks(notebooks.map(n=>n.id!==parentId?n:{...n,sections:n.sections.filter(s=>s.id!==secId)}));
    if (activeSection===secId) { const rem=nb.sections.filter(s=>s.id!==secId); if(rem[0]) selectSection(rem[0].id,parentId); }
    setAllNotes(prev => prev.filter(n => n.section !== secId));
    try { await sb.from("notes").delete({ section: secId, notebook: parentId }); } catch {}
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

      {/* ── Notebooks sidebar ── */}
      <div className={`notes-sidebar${sidebarCollapsed?' collapsed':''}`} onClick={e => e.stopPropagation()}>
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
                <div className="notebook-icon" style={{background:nb.bg}}>{nb.emoji}</div>
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

              {isExpanded && nb.sections.filter(sec => sec.label !== 'New Section').map(sec => (
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

        {/* New notebook button */}
        <div style={{padding:'10px',marginTop:'auto',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          {showNewNB ? (
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <input className="nb-new-input" autoFocus placeholder="Notebook name" value={newNBValue}
                onChange={e=>setNewNBValue(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter')addNotebook();if(e.key==='Escape'){setShowNewNB(false);setNewNBValue('');}}}
                onBlur={()=>{if(!newNBValue.trim())setShowNewNB(false);}}/>
              <button className="btn xs primary" onClick={addNotebook}>Add</button>
            </div>
          ) : (
            <button style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'1px dashed rgba(255,255,255,0.12)',borderRadius:7,color:'var(--t3)',cursor:'pointer',padding:'6px 10px',width:'100%',fontSize:11,fontFamily:'var(--sans)',transition:'all .15s',boxSizing:'border-box'}}
              onMouseEnter={e=>{e.currentTarget.style.color='var(--t2)';e.currentTarget.style.borderColor='rgba(255,255,255,0.22)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='var(--t3)';e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';}}
              onClick={()=>setShowNewNB(true)}>
              <Icon name="plus" size={11}/> New notebook
            </button>
          )}
        </div>
      </div>

      {/* ── Notes list ── */}
      <div className={`notes-list${listCollapsed?' collapsed':''}`}>
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
            onDragStart={e=>onNoteDragStart(e,n.id)} onDragOver={e=>onNoteDragOver(e,n.id)}
            onDragLeave={()=>setDragOverId(null)} onDrop={e=>onNoteDrop(e,n.id)}
            onDragEnd={()=>{setDragNoteId(null);setDragOverId(null);}}
            onClick={()=>openNote(n)}
            onContextMenu={e=>{e.preventDefault();setNoteMenu({id:n.id,x:e.clientX,y:e.clientY});}}
          >
            <div className="nli-row">
              <div className="nli-title">{n.title||'Untitled'}</div>
              <button className="nb-dot-btn" onClick={e=>{e.stopPropagation();setNoteMenu(m=>m?.id===n.id?null:{id:n.id,x:e.clientX,y:e.clientY});}}>···</button>
            </div>
            <div className="nli-preview">{(n.body||'').replace(/[#*_`\[\]]/g,'').replace(/\n/g,' ').slice(0,72)||'No content'}</div>
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
              {saveStatus==='saving' && <span key="saving" className="save-ind saving">saving...</span>}
              {saveStatus==='saved'  && <span key="saved"  className="save-ind saved">saved ✓</span>}
              <div style={{flex:1}}/>
              <select
                className="note-format-select"
                value={lineFormat}
                onChange={e => { applyFormat(e.target.value); updateLineFormat(); }}
              >
                <option value="body">Body</option>
                <option value="h1">Title</option>
                <option value="h2">Heading</option>
                <option value="h3">Subheading</option>
                <option value="ul">Bullet</option>
                <option value="ol">Numbered</option>
                <option value="check">Checklist</option>
              </select>
              <div className="note-toolbar-sep"/>
              <button className="note-tool-btn" title="Bold ⌘B"      onMouseDown={e=>{e.preventDefault();applyFormat('bold');}}><strong>B</strong></button>
              <button className="note-tool-btn" title="Italic ⌘I"    onMouseDown={e=>{e.preventDefault();applyFormat('italic');}}><em>I</em></button>
              <button className="note-tool-btn" title="Underline"    onMouseDown={e=>{e.preventDefault();applyFormat('underline');}} style={{textDecoration:'underline'}}>U</button>
              <div className="note-toolbar-sep"/>
              <button className="note-tool-btn" title="Checkbox"     onMouseDown={e=>{e.preventDefault();applyFormat('check');}}>☐</button>
              <button className="note-tool-btn" title="Insert table" onMouseDown={e=>{e.preventDefault();applyFormat('table');}}>⊞</button>
              <button className="note-tool-btn" title="Link"          onMouseDown={e=>{e.preventDefault();applyFormat('link');}}>🔗</button>
              <div className="note-toolbar-sep"/>
              <span style={{fontSize:10,color:'var(--t3)',fontFamily:'var(--mono)',padding:'0 3px',flexShrink:0}}>
                {editBody.split(/\s+/).filter(Boolean).length}w
              </span>
            </div>

            {/* Fullscreen expand/exit button — top-right corner of editor */}
            {fullscreen ? (
              <button className="fs-exit-btn" onClick={toggleFullscreen} title="Exit fullscreen">✕</button>
            ) : (
              <button className="fs-expand-btn" onClick={toggleFullscreen} title="Fullscreen">⊞</button>
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
              placeholder="Untitled note"/>

            {/* Meta */}
            <div className="note-meta">
              <span className="note-meta-item"><Icon name="calendar" size={10} color="var(--t3)"/> {currentNote.updated_at ? new Date(currentNote.updated_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }) : ''}</span>
              <span className="note-meta-item"><Icon name="folder" size={10} color="var(--t3)"/> {currentNB?.label}{currentSection?.label ? ` / ${currentSection.label}` : ''}</span>
            </div>

            {/* Split editor: textarea + live preview */}
            <SplitEditor
              textareaRef={editorRef}
              value={editBody}
              onChange={onBodyChange}
              placeholder="Start writing..."
              editorMode={editorMode}
              setMode={setMode}
              onCursorMove={updateLineFormat}
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
            </div>
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
                  <div className="move-modal-nb">{nb.emoji} {nb.label}</div>
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
