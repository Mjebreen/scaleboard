// Draws the diagram into the SVG layers and runs the packet animation.
//
// Layer order is what makes the picture read as 3D: zones on the ground, then connections,
// then packets, then blocks sorted back to front, then the floating labels.

import { S, visibleAt, nodeById } from './state.js';
import { KINDS, TONES, HOT, DOWN, FLOW, footprint } from './catalog.js';
import { nodeArt, pill } from './shapes.js';
import { proj, roundPath, r2, pts, clamp, CX, CY } from './iso.js';
import { routeEdge } from './router.js';

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
let L = null;
let shown = new Set(); // ids visible in the last draw, so new arrivals can pop in
let popArmed = false;
let raf = 0;
const edgeIndex = new Map(); // edge id -> { el, len, ghost }
const artTop = new Map(); // node id -> height of its art in px

export function initScene() {
  L = {};
  for (const k of ['zones', 'edges', 'packets', 'nodes', 'over', 'trace', 'ui', 'prev']) L[k] = $('l' + k);
  const p = $('gridp');
  p.setAttribute('width', r2(CX * 2));
  p.setAttribute('height', r2(CY * 2));
  p.firstElementChild.setAttribute('d', `M0 0L${r2(CX * 2)} ${r2(CY * 2)}M0 ${r2(CY * 2)}L${r2(CX * 2)} 0`);
  requestAnimationFrame(tick);
}

/** Let elements that appear in the next draw animate in. */
export const armPop = () => { popArmed = true; };

/** Redraw on the next frame. */
export function render() {
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); });
}

export function applyView() {
  const t = `translate(${r2(S.view.x)} ${r2(S.view.y)}) scale(${r2(S.view.k * 1000) / 1000})`;
  $('vp').setAttribute('transform', t);
  $('gridg').setAttribute('transform', t);
}

/** The box around what is drawn. While presenting it covers every step, so the view never has to move. */
function bounds() {
  const keep = S.cur, steps = S.presenting ? S.doc.steps.map((_, i) => i) : [S.cur];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of steps) {
    S.cur = i;
    draw();
    for (const k of ['zones', 'edges', 'nodes', 'over']) {
      let b;
      try { b = L[k].getBBox(); } catch (e) { continue; } // not laid out yet
      if (!b.width && !b.height) continue;
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
    }
  }
  S.cur = keep;
  if (steps.length > 1) draw();
  return x0 === Infinity ? null : { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** Centre the diagram in the stage. */
export function fit(pad = 64) {
  const r = $('scene').getBoundingClientRect(), bb = bounds();
  if (!bb || !bb.width || !r.width) S.view = { x: r.width / 2, y: r.height / 2, k: 1 };
  else {
    const k = clamp(Math.min((r.width - pad * 2) / bb.width, (r.height - pad * 2) / bb.height), 0.3, 1.3);
    S.view = { k, x: r.width / 2 - (bb.x + bb.width / 2) * k, y: r.height / 2 - (bb.y + bb.height / 2) * k };
  }
  applyView();
}

function toneVars(n) {
  const t = n.status === 'hot' ? HOT : n.status === 'down' ? DOWN : TONES[n.tone] || TONES[KINDS[n.kind].tone];
  return `--t:${t[0]};--l:${t[1]};--r:${t[2]}`;
}

function edgeGeometry(e, a, b, nodes) {
  const heads = { end: e.arrows !== 'none', start: e.arrows === 'both' };
  const sp = routeEdge(e, a, b, nodes, heads).map(p => proj(p[0], p[1]));
  const n = sp.length;
  let hs = '';
  const head = (i, j) => {
    const [x, y] = sp[i], dx = x - sp[j][0], dy = y - sp[j][1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const bx = x - ux * 11, by = y - uy * 11;
    hs += `<polygon class="hd" points="${pts([[x, y], [bx - uy * 5, by + ux * 5], [bx + uy * 5, by - ux * 5]])}"/>`;
    const s = Math.max(0, Math.min(7, d - 1));
    sp[i] = [x - ux * s, y - uy * s]; // stop the line short so it does not poke through the tip
  };
  if (heads.end) head(n - 1, n - 2);
  if (heads.start) head(0, 1);
  let total = 0;
  const seg = [];
  for (let i = 0; i < n - 1; i++) { seg.push(Math.hypot(sp[i + 1][0] - sp[i][0], sp[i + 1][1] - sp[i][1])); total += seg[i]; }
  let half = total / 2, mid = sp[0];
  for (let i = 0; i < n - 1; i++) {
    if (half <= seg[i] || i === n - 2) {
      const t = seg[i] ? Math.min(1, half / seg[i]) : 0;
      mid = [sp[i][0] + (sp[i + 1][0] - sp[i][0]) * t, sp[i][1] + (sp[i + 1][1] - sp[i][1]) * t];
      break;
    }
    half -= seg[i];
  }
  return { d: roundPath(sp, 13, false), heads: hs, mid };
}

/** Draw everything now. `hideGhosts` leaves out what the current step does not show. */
export function draw(hideGhosts = S.presenting) {
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  const { doc, sel } = S;
  const one = sel.size === 1 ? [...sel][0] : null;
  const now = new Set();
  const byId = new Map(doc.nodes.map(n => [n.id, n]));
  const over = o => o.until && S.cur + 1 > o.until; // already gone by this step: not worth a ghost
  const pop = (id, vis) => (vis && popArmed && !shown.has(id) ? ' class="pop"' : '');
  let zs = '', es = '', ns = '', ov = '', ui = '';

  for (const z of doc.zones) {
    const vis = visibleAt(z);
    if (!vis && (hideGhosts || over(z))) continue;
    if (vis) now.add(z.id);
    const t = TONES[z.tone] || TONES.sky;
    const c = [proj(z.x, z.y), proj(z.x + z.w, z.y), proj(z.x + z.w, z.y + z.h), proj(z.x, z.y + z.h)];
    const d = roundPath(c, 12), cl = `${vis ? '' : ' ghost'}${sel.has(z.id) ? ' sel' : ''}`;
    zs += `<g class="zone${cl}" data-id="${z.id}" style="--t:${t[1]};--r:${t[2]}"><g${pop(z.id, vis)}><path class="zf" d="${d}"/><path class="zh" d="${d}"/></g></g>`;
    if (z.label) ov += `<g class="grab${cl}" data-id="${z.id}">${pill(c[2][0], c[2][1] + 24, z.label)}</g>`;
    if (one === z.id) ui += `<circle class="hsize" data-handle="size" data-for="${z.id}" cx="${r2(c[2][0])}" cy="${r2(c[2][1])}" r="7"/>`;
  }

  for (const e of doc.edges) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b) continue;
    const vis = visibleAt(e) && visibleAt(a) && visibleAt(b);
    if (!vis && (hideGhosts || over(e) || over(a) || over(b))) continue;
    if (vis) now.add(e.id);
    const g = edgeGeometry(e, a, b, doc.nodes);
    const cl = `edge${e.style === 'dashed' ? ' dashed' : ''}${vis ? '' : ' ghost'}${sel.has(e.id) ? ' sel' : ''}`;
    es += `<g class="${cl}" data-id="${e.id}" data-flow="${e.flow}" data-packet="${e.packet}"${e.arrows !== 'end' ? ' data-two="1"' : ''}${vis ? '' : ' data-ghost="1"'}><path class="hit" d="${g.d}"/><path class="ln" d="${g.d}"/>${g.heads}</g>`;
    if (e.label) ov += `<g${vis ? '' : ' class="ghost"'}>${pill(g.mid[0], g.mid[1], e.label)}</g>`;
  }

  artTop.clear();
  const sorted = [...doc.nodes].sort((p, q) => p.x + p.y - (q.x + q.y) || p.x - q.x);
  for (const n of sorted) {
    const vis = visibleAt(n);
    if (!vis && (hideGhosts || over(n))) continue;
    if (vis) now.add(n.id);
    const [sx, sy] = proj(n.x, n.y), tr = `translate(${r2(sx)} ${r2(sy)})`;
    const cl = `${vis ? '' : ' ghost'}${sel.has(n.id) ? ' sel' : ''}`, pp = pop(n.id, vis);
    if (n.kind === 'note') {
      ov += `<g class="grab${cl}" data-id="${n.id}" transform="${tr}"><g${pp}>${pill(0, 0, n.label || 'Note')}</g></g>`;
      continue;
    }
    const art = nodeArt(n.kind, n.label, n.icon), f = footprint(n);
    artTop.set(n.id, art.top);
    let ring = '';
    if (sel.has(n.id)) {
      const m = 0.4;
      ring = `<path class="selring ui" d="${roundPath([proj(-f.ax - m, f.ay + m), proj(-f.ax - m, -f.ay - m), proj(f.ax + m, -f.ay - m), proj(f.ax + m, f.ay + m)], 8)}"/>`;
    }
    ns += `<g class="node st-${n.status || 'ok'}${cl}" data-id="${n.id}" transform="${tr}" style="${toneVars(n)}"><g${pp}>${ring}${art.svg}</g></g>`;

    let o = '', y = -art.top - 17;
    const alarm = n.status === 'hot' || n.status === 'down';
    if (n.meter != null) { o += pill(0, y, n.meter + '%', { meter: n.meter }); y -= 27; }
    const badge = n.badge || (n.status === 'down' ? 'offline' : '');
    if (badge) o += pill(0, y, badge, { cls: alarm ? 'hot' : '' });
    if (art.mode === 'pill' && n.label) o += pill(0, art.bot + 17, n.label);
    if (o) ov += `<g class="st-${n.status || 'ok'}${vis ? '' : ' ghost'}" data-of="${n.id}" transform="${tr}"><g${pp}>${o}</g></g>`;
    if (one === n.id && S.tool === 'select')
      ui += `<g class="hlink" data-handle="link" data-for="${n.id}" transform="translate(${r2(sx + art.halfW + 20)} ${r2(sy - art.top / 2 + 8)})"><title>Drag to another block to connect</title><circle r="11"/><path d="M-5 0h9M0 -4.500l4.500 4.500-4.500 4.500"/></g>`;
  }

  L.zones.innerHTML = zs;
  L.edges.innerHTML = es;
  L.nodes.innerHTML = ns;
  L.over.innerHTML = ov;
  L.ui.innerHTML = S.presenting ? '' : ui;
  shown = now;
  popArmed = false;

  edgeIndex.clear();
  for (const g of L.edges.children) {
    const el = g.querySelector('.ln');
    edgeIndex.set(g.dataset.id, { el, len: el.getTotalLength(), ghost: g.hasAttribute('data-ghost') });
  }
}

// --- packets --------------------------------------------------------------
const pools = new Map(); // edge id -> { els, kind }
let clock = 0, lastT = 0;

function makePool(n, kind) {
  const els = [];
  for (let i = 0; i < n; i++) {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('class', 'pk');
    r.setAttribute('width', 9);
    r.setAttribute('height', 9);
    r.setAttribute('rx', 2.6);
    L.packets.appendChild(r);
    els.push(r);
  }
  return { els, kind };
}
function place(el, info, pos, color) {
  const p = info.el.getPointAtLength(pos);
  el.setAttribute('x', r2(p.x - 4.5));
  el.setAttribute('y', r2(p.y - 4.5));
  el.setAttribute('fill', color);
  el.setAttribute('opacity', r2(clamp(Math.min(pos, info.len - pos) / 14, 0, 1)));
}
function dropPool(id) {
  pools.get(id).els.forEach(el => el.remove());
  pools.delete(id);
}

const COLORS = { request: '#f2924d', response: '#7cc47f', data: '#6ea8ee', event: '#b08ae6', error: '#e5645f' };

/** Where the packets on one connection are at time t: [{ pos, color }], or null if it carries none. */
function packetSpots(e, info, t) {
  const cfg = FLOW[e.flow];
  if (!info || info.ghost || !cfg || info.len < 34) return null;
  const two = e.arrows !== 'end'; // links without a direction carry traffic both ways
  const n = Math.max(1, Math.round(info.len / cfg.gap)), lead = (t * cfg.speed) % info.len, out = [];
  const main = COLORS[e.packet] || COLORS.request, reply = e.packet === 'request' ? COLORS.response : main;
  for (let i = 0; i < n; i++) out.push({ pos: (lead + (i * info.len) / n) % info.len, color: main });
  if (two) for (let i = 0; i < n; i++) out.push({ pos: info.len - ((lead + ((i + 0.5) * info.len) / n) % info.len), color: reply });
  return out;
}

/** The packets as they are right now, as SVG, for pictures that cannot animate. */
export function packetsMarkup() {
  let s = '';
  for (const e of S.doc.edges) {
    const info = edgeIndex.get(e.id);
    for (const sp of packetSpots(e, info, clock) || []) {
      if (Math.min(sp.pos, info.len - sp.pos) < 12) continue; // skip ones that are fading in or out
      const p = info.el.getPointAtLength(sp.pos);
      s += `<rect class="pk" x="${r2(p.x - 4.5)}" y="${r2(p.y - 4.5)}" width="9" height="9" rx="2.6" fill="${sp.color}"/>`;
    }
  }
  return s;
}

function tick(t) {
  const dt = Math.min(0.06, (t - lastT) / 1000 || 0);
  lastT = t;
  if (S.playing) clock += dt;
  for (const e of S.doc.edges) {
    const info = edgeIndex.get(e.id), spots = packetSpots(e, info, clock);
    if (!spots) { if (pools.has(e.id)) dropPool(e.id); continue; }
    let pool = pools.get(e.id);
    if (!pool || pool.els.length !== spots.length) { if (pool) dropPool(e.id); pool = makePool(spots.length, e.packet); pools.set(e.id, pool); }
    spots.forEach((sp, i) => place(pool.els[i], info, sp.pos, sp.color));
  }
  for (const id of [...pools.keys()]) if (!edgeIndex.has(id)) dropPool(id);
  traceTick(dt);
  requestAnimationFrame(tick);
}

// --- send a packet --------------------------------------------------------
let trace = null;

function nodeAnchor(id) {
  const n = nodeById(id);
  if (!n) return null;
  const [x, y] = proj(n.x, n.y);
  return [x, y - (artTop.get(id) || 40) / 2];
}
function pulse(id) {
  const p = nodeAnchor(id);
  if (!p) return;
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('class', 'trpulse');
  c.setAttribute('cx', r2(p[0]));
  c.setAttribute('cy', r2(p[1]));
  c.setAttribute('r', 12);
  L.trace.appendChild(c);
  setTimeout(() => c.remove(), 750);
}

export function stopTrace() {
  if (!trace) return;
  trace.dot.remove();
  trace = null;
}

/** Walk a packet along the hops, then walk the reply back. hops: [{ edge, rev, to, from }] */
export function runTrace(hops) {
  stopTrace();
  const dot = document.createElementNS(NS, 'circle');
  dot.setAttribute('class', 'trdot');
  dot.setAttribute('r', 7.5);
  L.trace.appendChild(dot);
  const back = [...hops].reverse().map(h => ({ edge: h.edge, rev: !h.rev, to: h.from, from: h.to }));
  trace = { legs: [hops, back], leg: 0, i: 0, pos: 0, wait: 0, dot };
  pulse(hops[0].from);
}

function traceTick(dt) {
  const T = trace;
  if (!T) return;
  if (T.wait > 0) { T.wait -= dt; return; }
  const hop = T.legs[T.leg][T.i], info = edgeIndex.get(hop.edge);
  if (!info) return stopTrace();
  T.pos += dt * 300;
  if (T.pos >= info.len) {
    pulse(hop.to);
    T.pos = 0;
    T.i++;
    T.wait = 0.12;
    if (T.i >= T.legs[T.leg].length) {
      T.leg++;
      T.i = 0;
      T.wait = 0.45;
      if (T.leg > 1) return stopTrace();
      T.dot.setAttribute('class', 'trdot back');
    }
    return;
  }
  const p = info.el.getPointAtLength(hop.rev ? info.len - T.pos : T.pos);
  T.dot.setAttribute('cx', r2(p.x));
  T.dot.setAttribute('cy', r2(p.y));
}
