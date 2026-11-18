// Edits to the diagram: add, connect, delete, duplicate, copy, steps.

import { S, commit, emit, find, newId, nodeById, visibleAt } from './state.js';
import { KINDS, footprint } from './catalog.js';
import { arrange } from './lang.js';
import { render, armPop } from './render.js';

const changed = () => { commit(); emit('doc'); render(); };
export function select(ids) {
  S.sel = new Set(ids);
  emit('sel');
  render();
}

function nameFor(kind) {
  const base = KINDS[kind].name, used = new Set(S.doc.nodes.filter(n => n.kind === kind).map(n => n.label));
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base} ${i}`)) return `${base} ${i}`;
}

export function addNode(kind, x, y) {
  x = Math.round(x);
  y = Math.round(y);
  if (kind === 'zone') {
    const z = { id: newId('z'), x: x - 4, y: y - 3, w: 9, h: 7, label: 'Zone', tone: 'sky', step: S.cur + 1, until: 0 };
    S.doc.zones.push(z);
    select([z.id]);
    return changed();
  }
  while (S.doc.nodes.some(n => n.x === x && n.y === y)) { x += 2; y += 2; } // never stack two blocks exactly
  const n = { id: newId('n'), kind, x, y, label: kind === 'note' ? 'Note' : nameFor(kind), status: 'ok', badge: '', meter: null, step: S.cur + 1, until: 0 };
  S.doc.nodes.push(n);
  select([n.id]);
  changed();
}

export function addEdge(from, to) {
  if (from === to) return null;
  const a = nodeById(from), b = nodeById(to);
  if (!a || !b || a.kind === 'note' || b.kind === 'note') return null;
  if (S.doc.edges.some(e => visibleAt(e) && ((e.from === from && e.to === to) || (e.from === to && e.to === from)))) return null;
  const e = {
    id: newId('e'), from, to, label: '', arrows: 'end', style: 'solid', flow: 'normal', packet: 'request', bend: 0,
    step: Math.max(S.cur + 1, a.step || 1, b.step || 1), until: 0,
  };
  S.doc.edges.push(e);
  select([e.id]);
  changed();
  return e;
}

export function removeSelected() {
  if (!S.sel.size) return;
  const gone = S.sel, d = S.doc;
  d.nodes = d.nodes.filter(n => !gone.has(n.id));
  const alive = new Set(d.nodes.map(n => n.id));
  d.edges = d.edges.filter(e => !gone.has(e.id) && alive.has(e.from) && alive.has(e.to));
  d.zones = d.zones.filter(z => !gone.has(z.id));
  select([]);
  changed();
}

/** Clone the given items (and the connections between cloned blocks), shifted on the grid. */
function cloneItems(items, dx, dy) {
  const map = new Map(), out = [];
  for (const o of items.nodes) {
    const c = { ...o, id: newId('n'), x: o.x + dx, y: o.y + dy };
    map.set(o.id, c.id);
    S.doc.nodes.push(c);
    out.push(c.id);
  }
  for (const o of items.zones) {
    const c = { ...o, id: newId('z'), x: o.x + dx, y: o.y + dy };
    S.doc.zones.push(c);
    out.push(c.id);
  }
  for (const o of items.edges) {
    if (!map.has(o.from) || !map.has(o.to)) continue;
    S.doc.edges.push({ ...o, id: newId('e'), from: map.get(o.from), to: map.get(o.to) });
  }
  return out;
}
function selectedItems() {
  const ids = S.sel, d = S.doc;
  const nodes = d.nodes.filter(n => ids.has(n.id)), set = new Set(nodes.map(n => n.id));
  return {
    nodes: structuredClone(nodes),
    zones: structuredClone(d.zones.filter(z => ids.has(z.id))),
    edges: structuredClone(d.edges.filter(e => set.has(e.from) && set.has(e.to))),
  };
}

export function duplicateSelected() {
  const items = selectedItems();
  if (!items.nodes.length && !items.zones.length) return;
  select(cloneItems(items, 3, 3));
  changed();
}

let clipboard = null, pastes = 0;
export function copySelected() {
  const items = selectedItems();
  if (!items.nodes.length && !items.zones.length) return false;
  clipboard = items;
  pastes = 0;
  return true;
}
export function paste() {
  if (!clipboard) return false;
  pastes++;
  select(cloneItems(structuredClone(clipboard), 3 * pastes, 3 * pastes));
  changed();
  return true;
}

export function nudge(dx, dy) {
  let any = false;
  for (const id of S.sel) {
    const o = find(id);
    if (!o || id[0] === 'e') continue;
    o.x += dx;
    o.y += dy;
    any = true;
  }
  if (any) changed();
}

export function selectAll() {
  select([...S.doc.nodes, ...S.doc.zones, ...S.doc.edges].map(o => o.id));
}

/**
 * Arrange every block in rows that follow the connections, the same way diagram code is laid out.
 * Zones are refitted around the blocks they held, and notes stay beside the block they were next to.
 */
export function tidy() {
  const d = S.doc, real = d.nodes.filter(n => n.kind !== 'note');
  if (real.length < 2) return false;
  const centre = list => [list.reduce((s, n) => s + n.x, 0) / list.length, list.reduce((s, n) => s + n.y, 0) / list.length];
  const [cx, cy] = centre(real);
  const members = d.zones.map(z => real.filter(n => n.x >= z.x && n.x <= z.x + z.w && n.y >= z.y && n.y <= z.y + z.h));
  const notes = d.nodes.filter(n => n.kind === 'note').map(note => {
    const host = real.reduce((a, b) => (Math.abs(b.x - note.x) + Math.abs(b.y - note.y) < Math.abs(a.x - note.x) + Math.abs(a.y - note.y) ? b : a));
    return { note, host, dx: note.x - host.x, dy: note.y - host.y };
  });

  const spots = arrange(real, d.edges);
  for (const n of real) [n.x, n.y] = spots.get(n.id);
  const [nx, ny] = centre(real), sx = Math.round(cx - nx), sy = Math.round(cy - ny); // stay where the diagram was
  for (const n of real) { n.x += sx; n.y += sy; }
  for (const { note, host, dx, dy } of notes) { note.x = host.x + dx; note.y = host.y + dy; }
  d.zones.forEach((z, i) => {
    if (!members[i].length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of members[i]) {
      const f = footprint(n);
      x0 = Math.min(x0, n.x - f.ax); x1 = Math.max(x1, n.x + f.ax);
      y0 = Math.min(y0, n.y - f.ay); y1 = Math.max(y1, n.y + f.ay);
    }
    z.x = Math.floor(x0 - 1); z.y = Math.floor(y0 - 1);
    z.w = Math.ceil(x1 + 1) - z.x; z.h = Math.ceil(y1 + 1) - z.y;
  });
  for (const e of d.edges) e.bend = 0; // forced routes made sense for the old positions only
  changed();
  return true;
}

// --- steps ----------------------------------------------------------------
const everything = () => [...S.doc.nodes, ...S.doc.edges, ...S.doc.zones];

export function gotoStep(i) {
  i = Math.max(0, Math.min(S.doc.steps.length - 1, i));
  if (i === S.cur) return;
  S.cur = i;
  armPop();
  emit('step');
  render();
}

/** Add a step after the current one. It starts out looking the same as the current step. */
export function addStep() {
  const c = S.cur + 1; // number of the current step
  for (const o of everything()) {
    if ((o.step || 1) > c) o.step++;
    if (o.until && o.until >= c) o.until++;
  }
  S.doc.steps.splice(c, 0, { title: `Step ${c + 1}`, text: '' });
  S.cur = c;
  commit();
  emit('step');
  render();
}

export function deleteStep() {
  const N = S.doc.steps.length;
  if (N < 2) return;
  const c = S.cur + 1;
  S.doc.steps.splice(S.cur, 1);
  for (const o of everything()) {
    if ((o.step || 1) > c) o.step--;
    if (o.until && o.until >= c) o.until--;
    o.step = Math.min(o.step || 1, N - 1);
    if (o.until && o.until < o.step) o.until = o.step;
  }
  S.cur = Math.min(S.cur, N - 2);
  commit();
  emit('step');
  render();
}

// --- routes for "send packet" --------------------------------------------
/** Shortest path between two blocks. Follows arrow directions first, then ignores them. */
export function findRoute(fromId, toId) {
  const live = S.doc.edges.filter(e => {
    const a = nodeById(e.from), b = nodeById(e.to);
    return a && b && visibleAt(e) && visibleAt(a) && visibleAt(b);
  });
  const search = directed => {
    const prev = new Map([[fromId, null]]), q = [fromId];
    while (q.length) {
      const at = q.shift();
      if (at === toId) break;
      for (const e of live) {
        const fwd = e.from === at, bwd = e.to === at && (!directed || e.arrows !== 'end');
        if (!fwd && !bwd) continue;
        const next = fwd ? e.to : e.from;
        if (prev.has(next)) continue;
        prev.set(next, { edge: e.id, rev: !fwd, from: at, to: next });
        q.push(next);
      }
    }
    if (!prev.has(toId)) return null;
    const hops = [];
    for (let h = prev.get(toId); h; h = prev.get(h.from)) hops.unshift(h);
    return hops;
  };
  return search(true) || search(false);
}
