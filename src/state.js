// The diagram, the editor state around it, undo history and autosave.

import { KINDS, TONES, PACKETS, FLOW } from './catalog.js';
import { ICONS } from './icons.js';
import { clamp } from './iso.js';

const KEY = 'scaleboard:doc';

export function blankDoc() {
  return { app: 'scaleboard', v: 1, name: 'Untitled diagram', nodes: [], edges: [], zones: [], steps: [{ title: 'Overview', text: '' }] };
}

export const S = {
  doc: blankDoc(),
  sel: new Set(), // ids of selected blocks, connections and zones
  tool: 'select', // select | connect | trace
  view: { x: 0, y: 0, k: 1 },
  cur: 0, // index of the step on screen
  playing: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  presenting: false,
  readonly: false, // opened from a share link: look, do not touch
  theme: 'light',
};

// --- tiny event bus -------------------------------------------------------
const subs = new Set();
export const on = fn => subs.add(fn);
export const emit = (what, data) => subs.forEach(fn => fn(what, data));

// --- lookups --------------------------------------------------------------
let seq = 0;
/** Ids start with n (block), e (connection) or z (zone). */
export const newId = p => p + Date.now().toString(36).slice(-4) + (seq++).toString(36) + Math.random().toString(36).slice(2, 4);
export const find = id =>
  id[0] === 'n' ? S.doc.nodes.find(o => o.id === id) : id[0] === 'e' ? S.doc.edges.find(o => o.id === id) : S.doc.zones.find(o => o.id === id);
export const nodeById = id => S.doc.nodes.find(o => o.id === id);

/** Is this element on screen at step index i? */
export const visibleAt = (o, i = S.cur) => (o.step || 1) <= i + 1 && (!o.until || i + 1 <= o.until);

// --- loading --------------------------------------------------------------
const str = (v, max = 120) => String(v ?? '').slice(0, max);
const pick = (v, table, fallback) => (Object.hasOwn(table, v) ? v : fallback);

/** Turn anything JSON-shaped into a valid diagram, dropping what it cannot understand. */
export function normalize(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.nodes)) throw new Error('this is not a Scaleboard diagram');
  const doc = blankDoc();
  doc.name = str(d.name || 'Untitled diagram', 80);
  if (Array.isArray(d.steps) && d.steps.length) doc.steps = d.steps.slice(0, 60).map(s => ({ title: str(s?.title, 60), text: str(s?.text, 1200) }));
  const N = doc.steps.length;
  const when = o => {
    const step = clamp(parseInt(o.step) || 1, 1, N), until = parseInt(o.until) || 0;
    return { step, until: until ? clamp(until, step, N) : 0 };
  };
  const ids = new Set();
  const fresh = (id, p) => {
    id = String(id || '');
    if (!id.startsWith(p) || ids.has(id)) id = newId(p);
    ids.add(id);
    return id;
  };
  const remap = new Map();

  for (const n of d.nodes) {
    if (!n || !KINDS[n.kind] || n.kind === 'zone') continue;
    const id = fresh(n.id, 'n');
    remap.set(String(n.id), id);
    doc.nodes.push({
      id, kind: n.kind, x: Math.round(+n.x || 0), y: Math.round(+n.y || 0), label: str(n.label, 60),
      tone: pick(n.tone, TONES, undefined),
      icon: n.icon === 'none' ? 'none' : pick(n.icon, ICONS, undefined),
      status: ['ok', 'hot', 'down', 'faded'].includes(n.status) ? n.status : 'ok',
      badge: str(n.badge, 40),
      meter: n.meter == null || n.meter === '' ? null : clamp(Math.round(+n.meter) || 0, 0, 100),
      ...when(n),
    });
  }
  for (const e of d.edges || []) {
    const from = remap.get(String(e?.from)), to = remap.get(String(e?.to));
    if (!from || !to || from === to) continue;
    doc.edges.push({
      id: fresh(e.id, 'e'), from, to, label: str(e.label, 40),
      arrows: ['end', 'both', 'none'].includes(e.arrows) ? e.arrows : 'end',
      style: e.style === 'dashed' ? 'dashed' : 'solid',
      flow: e.flow === 'none' ? 'none' : pick(e.flow, FLOW, 'normal'),
      packet: pick(e.packet, PACKETS, 'request'),
      bend: clamp(parseInt(e.bend) || 0, 0, 4),
      ...when(e),
    });
  }
  for (const z of d.zones || []) {
    if (!z) continue;
    doc.zones.push({
      id: fresh(z.id, 'z'), x: Math.round(+z.x || 0), y: Math.round(+z.y || 0),
      w: clamp(Math.round(+z.w || 8), 2, 80), h: clamp(Math.round(+z.h || 6), 2, 80),
      label: str(z.label, 40), tone: pick(z.tone, TONES, 'sky'), ...when(z),
    });
  }
  return doc;
}

// --- history --------------------------------------------------------------
let last = JSON.stringify(S.doc), undoStack = [], redoStack = [];

function persist() {
  if (S.readonly) return; // a shared diagram must not replace the viewer's own work
  try { localStorage.setItem(KEY, last); } catch (e) { /* storage full or blocked: keep working in memory */ }
}

/** Record the current diagram as an undo step (no-op when nothing changed). */
export function commit() {
  const now = JSON.stringify(S.doc);
  if (now === last) return;
  undoStack.push(last);
  if (undoStack.length > 200) undoStack.shift();
  redoStack = [];
  last = now;
  persist();
  emit('history');
}

function restore(json) {
  last = json;
  S.doc = JSON.parse(json);
  for (const id of [...S.sel]) if (!find(id)) S.sel.delete(id);
  S.cur = clamp(S.cur, 0, S.doc.steps.length - 1);
  persist();
  emit('load');
}
export const canUndo = () => undoStack.length > 0;
export const canRedo = () => redoStack.length > 0;
export function undo() {
  if (!undoStack.length) return;
  redoStack.push(last);
  restore(undoStack.pop());
}
export function redo() {
  if (!redoStack.length) return;
  undoStack.push(last);
  restore(redoStack.pop());
}

/** Replace the whole diagram. Undo brings the previous one back. */
export function loadDoc(d, { fresh = false } = {}) {
  S.doc = normalize(d);
  S.sel.clear();
  S.cur = 0;
  if (fresh) {
    last = JSON.stringify(S.doc);
    undoStack = [];
    redoStack = [];
    persist();
  } else commit();
  emit('load');
}

export function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    loadDoc(JSON.parse(raw), { fresh: true });
    return true;
  } catch (e) {
    return false;
  }
}
