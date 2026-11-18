// Mouse, touch and keyboard on the canvas.

import { S, commit, emit, find, nodeById, undo, redo } from './state.js';
import { unproj, proj, r2, clamp } from './iso.js';
import { render, applyView, fit, runTrace, stopTrace } from './render.js';
import * as ops from './ops.js';

let svg, prev;
let drag = null;
let spaceDown = false;
let traceFrom = null;

export const toContent = ev => {
  const r = svg.getBoundingClientRect();
  return [(ev.clientX - r.left - S.view.x) / S.view.k, (ev.clientY - r.top - S.view.y) / S.view.k];
};
export const toWorld = ev => unproj(...toContent(ev));

export function zoomAt(mx, my, f) {
  const k = clamp(S.view.k * f, 0.25, 2.6);
  f = k / S.view.k;
  S.view = { k, x: mx - (mx - S.view.x) * f, y: my - (my - S.view.y) * f };
  applyView();
}
export function zoomCentre(f) {
  const r = svg.getBoundingClientRect();
  zoomAt(r.width / 2, r.height / 2, f);
}

export function setTool(tool) {
  S.tool = tool;
  traceFrom = null;
  svg.dataset.tool = tool;
  emit('tool');
  emit('hud', tool === 'trace' ? 'Click the block that sends the packet' : tool === 'connect' ? 'Drag from one block to another' : '');
  render();
}

const nodeUnder = ev => {
  const id = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.node[data-id]')?.dataset.id;
  return id ? nodeById(id) : null;
};

function pickTrace(id) {
  if (!traceFrom || traceFrom === id) {
    traceFrom = id;
    ops.select([id]);
    return emit('hud', `From ${nodeById(id).label || 'this block'}. Now click where the packet should go`);
  }
  const from = nodeById(traceFrom), to = nodeById(id), hops = ops.findRoute(traceFrom, id);
  traceFrom = null;
  ops.select([]);
  emit('hud', 'Click the block that sends the packet');
  if (!hops) return emit('toast', `No route from ${from.label || 'the sender'} to ${to.label || 'there'}. Connect them first.`);
  runTrace(hops);
  const names = [from.label, ...hops.map(h => nodeById(h.to).label)].map(s => s || '?');
  emit('toast', `${names.join(' → ')}  ·  ${hops.length} hop${hops.length > 1 ? 's' : ''}, then the reply comes back`);
}

function startPan(ev) {
  drag = { kind: 'pan', sx: ev.clientX, sy: ev.clientY, vx: S.view.x, vy: S.view.y };
  svg.classList.add('panning');
}
function startMove(ev) {
  const items = [], seen = new Set();
  const add = o => { if (!seen.has(o.id)) { seen.add(o.id); items.push({ o, x: o.x, y: o.y }); } };
  for (const id of S.sel) {
    const o = find(id);
    if (!o || id[0] === 'e') continue;
    add(o);
    // a zone carries the blocks standing on it
    if (id[0] === 'z') S.doc.nodes.filter(n => n.x >= o.x && n.x <= o.x + o.w && n.y >= o.y && n.y <= o.y + o.h).forEach(add);
  }
  drag = { kind: 'move', sx: ev.clientX, sy: ev.clientY, items, moved: false };
}
function startLink(ev, from) {
  drag = { kind: 'link', from, target: null };
}
function clearTarget() {
  svg.querySelectorAll('.tgt').forEach(el => el.classList.remove('tgt'));
}

function onDown(ev) {
  if (ev.button === 1 || (ev.button === 0 && spaceDown) || S.presenting) {
    if (ev.button > 1) return;
    startPan(ev);
  } else if (ev.button !== 0) return;
  else {
    const handle = ev.target.closest('[data-handle]');
    const id = ev.target.closest('[data-id]')?.dataset.id;
    const isBlock = id && id[0] === 'n' && find(id)?.kind !== 'note';
    if (handle?.dataset.handle === 'link') startLink(ev, handle.dataset.for);
    else if (handle?.dataset.handle === 'size') drag = { kind: 'size', z: find(handle.dataset.for), moved: false };
    else if (isBlock && S.tool === 'connect') startLink(ev, id);
    else if (isBlock && S.tool === 'trace') return pickTrace(id);
    else if (id) {
      if (ev.shiftKey) {
        const next = new Set(S.sel);
        next.has(id) ? next.delete(id) : next.add(id);
        ops.select(next);
      } else if (!S.sel.has(id)) ops.select([id]);
      if (id[0] !== 'e') startMove(ev);
    } else if (ev.shiftKey) {
      drag = { kind: 'marquee', a: toContent(ev), b: toContent(ev), keep: new Set(S.sel) };
    } else {
      if (S.sel.size) ops.select([]);
      startPan(ev);
    }
  }
  if (drag) {
    svg.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    document.activeElement?.blur?.();
  }
}

function onMove(ev) {
  if (!drag) return;
  const k = S.view.k;
  if (drag.kind === 'pan') {
    S.view.x = drag.vx + ev.clientX - drag.sx;
    S.view.y = drag.vy + ev.clientY - drag.sy;
    applyView();
  } else if (drag.kind === 'move') {
    const [dx, dy] = unproj((ev.clientX - drag.sx) / k, (ev.clientY - drag.sy) / k);
    const rx = Math.round(dx), ry = Math.round(dy);
    for (const it of drag.items) { it.o.x = it.x + rx; it.o.y = it.y + ry; }
    if (rx || ry) drag.moved = true;
    render();
  } else if (drag.kind === 'size') {
    const [wx, wy] = toWorld(ev), z = drag.z;
    z.w = Math.max(2, Math.round(wx - z.x));
    z.h = Math.max(2, Math.round(wy - z.y));
    drag.moved = true;
    render();
  } else if (drag.kind === 'marquee') {
    drag.b = toContent(ev);
    const [x0, y0] = drag.a, [x1, y1] = drag.b;
    prev.innerHTML = `<rect class="marquee" x="${r2(Math.min(x0, x1))}" y="${r2(Math.min(y0, y1))}" width="${r2(Math.abs(x1 - x0))}" height="${r2(Math.abs(y1 - y0))}" rx="4"/>`;
  } else if (drag.kind === 'link') {
    const a = nodeById(drag.from), [px, py] = toContent(ev), [ax, ay] = proj(a.x, a.y);
    const t = nodeUnder(ev);
    clearTarget();
    drag.target = t && t.id !== drag.from ? t : null;
    if (drag.target) svg.querySelector(`.node[data-id="${drag.target.id}"]`)?.classList.add('tgt');
    prev.innerHTML = `<path class="linkprev" d="M${r2(ax)} ${r2(ay - 18)}L${r2(px)} ${r2(py)}"/>`;
  }
}

function onUp() {
  if (!drag) return;
  const d = drag;
  drag = null;
  svg.classList.remove('panning');
  if (d.kind === 'move' || d.kind === 'size') {
    if (d.moved) { commit(); emit('doc'); }
  } else if (d.kind === 'marquee') {
    prev.innerHTML = '';
    const x0 = Math.min(d.a[0], d.b[0]), x1 = Math.max(d.a[0], d.b[0]), y0 = Math.min(d.a[1], d.b[1]), y1 = Math.max(d.a[1], d.b[1]);
    const inside = (wx, wy, lift = 0) => { const [x, y] = proj(wx, wy); return x >= x0 && x <= x1 && y - lift >= y0 && y - lift <= y1; };
    const drawn = id => !!svg.querySelector(`[data-id="${id}"]`);
    const picked = [
      ...S.doc.nodes.filter(n => drawn(n.id) && inside(n.x, n.y, n.kind === 'note' ? 0 : 18)),
      ...S.doc.zones.filter(z => drawn(z.id) && inside(z.x + z.w / 2, z.y + z.h / 2)),
    ].map(o => o.id);
    ops.select([...d.keep, ...picked]);
  } else if (d.kind === 'link') {
    prev.innerHTML = '';
    clearTarget();
    if (d.target && !ops.addEdge(d.from, d.target.id)) emit('toast', 'Those two are already connected.');
  }
}

function onWheel(ev) {
  ev.preventDefault();
  const r = svg.getBoundingClientRect();
  zoomAt(ev.clientX - r.left, ev.clientY - r.top, Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.01 : 0.0016)));
}

function onKey(ev) {
  const tag = document.activeElement?.tagName;
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  const mod = ev.ctrlKey || ev.metaKey, key = ev.key.toLowerCase();

  if (S.presenting) {
    if (key === 'arrowright' || key === ' ' || key === 'enter') { ev.preventDefault(); ops.gotoStep(S.cur + 1); }
    else if (key === 'arrowleft') { ev.preventDefault(); ops.gotoStep(S.cur - 1); }
    else if (key === 'escape' && !S.readonly) emit('present', false);
    else if (key === 'f' || key === '0') fit();
    return;
  }
  if (key === 'escape') {
    if (typing) return document.activeElement.blur();
    stopTrace();
    if (S.tool !== 'select') setTool('select');
    else ops.select([]);
    return;
  }
  if (typing) return;

  if (mod && key === 'z') { ev.preventDefault(); ev.shiftKey ? redo() : undo(); }
  else if (mod && key === 'y') { ev.preventDefault(); redo(); }
  else if (mod && key === 'd') { ev.preventDefault(); ops.duplicateSelected(); }
  else if (mod && key === 'c') { if (ops.copySelected()) emit('toast', 'Copied. Ctrl+V to paste.'); }
  else if (mod && key === 'v') { ops.paste(); }
  else if (mod && key === 'a') { ev.preventDefault(); ops.selectAll(); }
  else if (mod) return;
  else if (key === 'delete' || key === 'backspace') { ev.preventDefault(); ops.removeSelected(); }
  else if (key === 'v') setTool('select');
  else if (key === 'c') setTool('connect');
  else if (key === 'p') setTool('trace');
  else if (key === 'f' || key === '0') fit();
  else if (key === '=' || key === '+') zoomCentre(1.2);
  else if (key === '-') zoomCentre(1 / 1.2);
  else if (key === ' ') { ev.preventDefault(); if (!ev.repeat) spaceDown = true; svg.classList.add('canpan'); }
  else if (key === 'arrowright') { ev.preventDefault(); ops.nudge(1, 0); }
  else if (key === 'arrowleft') { ev.preventDefault(); ops.nudge(-1, 0); }
  else if (key === 'arrowup') { ev.preventDefault(); ops.nudge(0, -1); }
  else if (key === 'arrowdown') { ev.preventDefault(); ops.nudge(0, 1); }
  else if (key === '[' || key === ',') ops.gotoStep(S.cur - 1);
  else if (key === ']' || key === '.') ops.gotoStep(S.cur + 1);
}

export function initInteract() {
  svg = document.getElementById('scene');
  prev = document.getElementById('lprev');
  svg.dataset.tool = S.tool;
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('dblclick', ev => {
    if (ev.target.closest('[data-id]')) emit('focus-label');
  });
  svg.addEventListener('dragover', ev => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; });
  svg.addEventListener('drop', ev => {
    ev.preventDefault();
    const kind = ev.dataTransfer.getData('text/plain');
    if (!kind) return;
    const [x, y] = toWorld(ev);
    emit('add', { kind, x, y });
  });
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', ev => {
    if (ev.key === ' ') { spaceDown = false; svg.classList.remove('canpan'); }
  });
}
