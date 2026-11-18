// Draws each kind of component as SVG, centred on the middle of its footprint on the ground.
// Colours come from --t / --l / --r (top, left, right face) set on the parent group.

import { U, CX, CY, proj as P, roundPath, pts, r2, clamp } from './iso.js';
import { KINDS, TONES } from './catalog.js';
import { ICONS } from './icons.js';

let uid = 0;
const xy = p => `${r2(p[0])} ${r2(p[1])}`;
const line = (a, b) => `M${xy(a)}L${xy(b)}`;
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function shadow(ax, ay) {
  const k = 1.06;
  const c = [P(-ax * k, ay * k), P(-ax * k, -ay * k), P(ax * k, -ay * k), P(ax * k, ay * k)].map(p => [p[0], p[1] + 7]);
  return `<path class="sh" filter="url(#soft)" d="${roundPath(c, 10)}"/>`;
}

/** A rounded box: three visible faces clipped to a rounded silhouette. */
function box(ax, ay, h, rad = 9, inner = '') {
  const Wb = P(-ax, ay), Sb = P(ax, ay), Eb = P(ax, -ay);
  const Wt = P(-ax, ay, h), St = P(ax, ay, h), Et = P(ax, -ay, h), Nt = P(-ax, -ay, h);
  const id = 'k' + ++uid;
  const sil = roundPath([Wt, Nt, Et, Eb, Sb, Wb], rad);
  const svg =
    shadow(ax, ay) +
    `<clipPath id="${id}"><path d="${sil}"/></clipPath><g clip-path="url(#${id})">` +
    `<polygon class="fr" points="${pts([St, Et, Eb, Sb])}"/><polygon class="fl" points="${pts([Wt, St, Sb, Wb])}"/>` +
    `<polygon class="ft" points="${pts([Wt, Nt, Et, St])}"/>${inner}` +
    `<path class="seam" d="${line(St, Wt)}${line(St, Et)}${line(St, Sb)}"/></g><path class="ol" d="${sil}"/>`;
  return { svg, top: -Nt[1], bot: Sb[1], halfW: Eb[0] };
}

/** An upright cylinder. A circle on the ground projects to an ellipse. */
function drum(R, h, rings) {
  const rx = r2(Math.SQRT2 * R * CX), ry = r2(Math.SQRT2 * R * CY), H = r2(h * U), id = 'k' + ++uid;
  const arc = y => `M${-rx} ${r2(y)}A${rx} ${ry} 0 0 0 ${rx} ${r2(y)}`;
  const sil = `M${-rx} ${-H}L${-rx} 0A${rx} ${ry} 0 0 0 ${rx} 0L${rx} ${-H}A${rx} ${ry} 0 0 0 ${-rx} ${-H}Z`;
  let seams = arc(-H);
  for (let i = 1; i <= rings; i++) seams += arc(-H + (H * i) / (rings + 1));
  const svg =
    `<ellipse class="sh" filter="url(#soft)" cx="0" cy="7" rx="${r2(rx * 1.05)}" ry="${r2(ry * 1.05)}"/>` +
    `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" class="gl"/><stop offset=".45" class="gl"/><stop offset="1" class="gr"/></linearGradient>` +
    `<path d="${sil}" fill="url(#${id})"/><ellipse class="ft" cx="0" cy="${-H}" rx="${rx}" ry="${ry}"/>` +
    `<path class="seam" d="${seams}"/><path class="ol" d="${sil}"/>`;
  return { svg, top: H + ry, bot: ry, halfW: rx };
}

function bricks(ax, ay, h) {
  const ch = 0.48;
  let d = '';
  for (let k = 1; k * ch < h; k++) d += line(P(-ax, ay, k * ch), P(ax, ay, k * ch)) + line(P(ax, ay, k * ch), P(ax, -ay, k * ch));
  for (let k = 0; k * ch < h; k++)
    for (let x = -ax + (k % 2 ? 0.45 : 0.9); x < ax - 0.1; x += 0.9) d += line(P(x, ay, k * ch), P(x, ay, Math.min(h, (k + 1) * ch)));
  return `<path class="brick" d="${d}"/>`;
}

function ports() {
  let s = '';
  for (let i = 0; i < 6; i++) {
    const x = -1.47 + i * 0.5;
    s += `<polygon class="port" points="${pts([P(x, 1.2, 0.2), P(x + 0.34, 1.2, 0.2), P(x + 0.34, 1.2, 0.52), P(x, 1.2, 0.52)])}"/>`;
  }
  for (const y of [0.75, 0.35]) s += `<polygon class="led" points="${pts([P(1.8, y, 0.28), P(1.8, y - 0.2, 0.28), P(1.8, y - 0.2, 0.46), P(1.8, y, 0.46)])}"/>`;
  return s;
}

// A plane that leans back: x across, t from 0 (bottom) to 1 (top).
const leaning = (y0, y1, z0, z1) => (xa, xb, ta, tb) => {
  const at = t => [y0 + (y1 - y0) * t, z0 + (z1 - z0) * t];
  const [ya, za] = at(ta), [yb, zb] = at(tb);
  return [P(xa, ya, za), P(xb, ya, za), P(xb, yb, zb), P(xa, yb, zb)];
};

function laptop(z0) {
  const zb = z0 + 0.1;
  const base = [P(-1.1, -0.8, zb), P(1.1, -0.8, zb), P(1.1, 0.8, zb), P(-1.1, 0.8, zb)];
  const under = base.map(p => [p[0], p[1] + 3.5]);
  const keys = [P(-0.86, -0.55, zb), P(0.86, -0.55, zb), P(0.86, 0.2, zb), P(-0.86, 0.2, zb)];
  const pad = [P(-0.3, 0.36, zb), P(0.3, 0.36, zb), P(0.3, 0.63, zb), P(-0.3, 0.63, zb)];
  const q = leaning(-0.8, -1.14, zb, zb + 1.55);
  return {
    svg:
      `<path class="dv-under" d="${roundPath(under, 4)}"/><path class="dv-base" d="${roundPath(base, 4)}"/>` +
      `<polygon class="dv-keys" points="${pts(keys)}"/><polygon class="dv-keys" points="${pts(pad)}"/>` +
      `<path class="dv-frame" d="${roundPath(q(-1.1, 1.1, 0, 1), 4)}"/><polygon class="dv-glass" points="${pts(q(-0.95, 0.95, 0.09, 0.91))}"/>` +
      `<polygon class="dv-a" points="${pts(q(-0.8, 0.8, 0.64, 0.8))}"/><polygon class="dv-b" points="${pts(q(-0.8, 0.3, 0.43, 0.52))}"/>` +
      `<polygon class="dv-b" points="${pts(q(-0.8, -0.1, 0.24, 0.33))}"/>`,
    top: -P(-1.1, -1.14, zb + 1.55)[1],
  };
}

function crowd(z0) {
  const spots = [[-1.05, -0.95], [0, -1.1], [1.05, -0.8], [-0.55, -0.1], [0.6, 0], [-1.1, 0.85], [0, 0.95], [1.05, 0.9]];
  const tones = ['lilac', 'sky', 'peach', 'mint', 'butter', 'rose', 'sky', 'mint'];
  const svg = spots
    .map((s, i) => ({ s, c: TONES[tones[i]][1] }))
    .sort((a, b) => a.s[0] + a.s[1] - b.s[0] - b.s[1])
    .map(({ s, c }) => {
      const [x, y] = P(s[0], s[1], z0);
      return `<rect class="pawn" x="${r2(x - 5.5)}" y="${r2(y - 19)}" width="11" height="19" rx="5.5" fill="${c}"/><circle class="pawnh" cx="${r2(x)}" cy="${r2(y - 23.5)}" r="5.2"/>`;
    })
    .join('');
  return { svg, top: 29 - P(0, -1.1, z0)[1] };
}

function phone(z0) {
  const q = leaning(0.15, -0.25, z0, z0 + 2);
  return {
    svg:
      `<path class="dv-frame" d="${roundPath(q(-0.58, 0.58, 0, 1), 6)}"/><polygon class="dv-glass" points="${pts(q(-0.44, 0.44, 0.07, 0.93))}"/>` +
      `<polygon class="dv-a" points="${pts(q(-0.32, 0.32, 0.66, 0.82))}"/><polygon class="dv-b" points="${pts(q(-0.32, 0.12, 0.48, 0.56))}"/>` +
      `<polygon class="dv-b" points="${pts(q(-0.32, -0.05, 0.32, 0.4))}"/>`,
    top: -P(-0.58, -0.25, z0 + 2)[1],
  };
}

function desktop(z0) {
  const zs = z0 + 0.7, q = leaning(-0.2, -0.42, zs, zs + 1.5);
  const foot = [P(-0.5, -0.5, z0 + 0.05), P(0.5, -0.5, z0 + 0.05), P(0.5, 0.05, z0 + 0.05), P(-0.5, 0.05, z0 + 0.05)];
  const stand = [P(-0.13, -0.22, z0 + 0.05), P(0.13, -0.22, z0 + 0.05), P(0.13, -0.24, zs + 0.1), P(-0.13, -0.24, zs + 0.1)];
  const board = [P(-0.85, 0.55, z0 + 0.06), P(0.85, 0.55, z0 + 0.06), P(0.85, 1.1, z0 + 0.06), P(-0.85, 1.1, z0 + 0.06)];
  return {
    svg:
      `<path class="dv-base" d="${roundPath(foot, 4)}"/><polygon class="dv-frame" points="${pts(stand)}"/>` +
      `<path class="dv-under" d="${roundPath(board.map(p => [p[0], p[1] + 2.5]), 3)}"/><path class="dv-base" d="${roundPath(board, 3)}"/>` +
      `<path class="dv-frame" d="${roundPath(q(-1.25, 1.25, 0, 1), 4)}"/><polygon class="dv-glass" points="${pts(q(-1.1, 1.1, 0.09, 0.91))}"/>` +
      `<polygon class="dv-a" points="${pts(q(-0.92, 0.92, 0.66, 0.8))}"/><polygon class="dv-b" points="${pts(q(-0.92, 0.3, 0.45, 0.54))}"/>` +
      `<polygon class="dv-b" points="${pts(q(-0.92, -0.15, 0.25, 0.34))}"/>`,
    top: -P(-1.25, -0.42, zs + 1.5)[1],
  };
}

function person(z0) {
  const [x, y] = P(0, 0, z0);
  return {
    svg:
      `<rect class="pawn big" x="${r2(x - 10.5)}" y="${r2(y - 37)}" width="21" height="37" rx="10.5"/>` +
      `<circle class="pawnh" cx="${r2(x)}" cy="${r2(y - 46)}" r="9.5"/>`,
    top: 56 - y,
  };
}

function rackUnits(ax, ay, h) {
  let lines = '', leds = '';
  for (let z = 0.5; z < h - 0.2; z += 0.52) {
    lines += line(P(-ax + 0.18, ay, z), P(ax - 0.18, ay, z));
    leds += `<polygon class="led" points="${pts([P(ax, ay - 0.3, z + 0.14), P(ax, ay - 0.52, z + 0.14), P(ax, ay - 0.52, z + 0.32), P(ax, ay - 0.3, z + 0.32)])}"/>`;
  }
  return `<path class="brick" d="${lines}"/>${leds}`;
}

/** A cloud that floats just above the ground: overlapping puffs with a shaded underside. */
function cloud() {
  const id = 'k' + ++uid;
  const puffs = '<rect x="-50" y="-41" width="100" height="29" rx="14.5"/><circle cx="-23" cy="-45" r="18"/><circle cx="6" cy="-54" r="24"/><circle cx="31" cy="-43" r="15"/>';
  return {
    svg:
      `<ellipse class="sh" filter="url(#soft)" cx="0" cy="5" rx="46" ry="15"/>` +
      `<g class="cl-o">${puffs}</g><g class="cl-l">${puffs}</g>` +
      `<clipPath id="${id}">${puffs}</clipPath><g clip-path="url(#${id})"><g class="cl-t" transform="translate(0 -7)">${puffs}</g></g>`,
    top: 79, bot: 20, halfW: 52,
  };
}

/** A flat card facing the viewer: the flowchart "process" box. Its name is written on the top. */
function card() {
  const W = 60, D = 27, T = 12, r = 9;
  const rr = (y, h) => `M${-W + r} ${y}H${W - r}Q${W} ${y} ${W} ${y + r}V${y + h - r}Q${W} ${y + h} ${W - r} ${y + h}H${-W + r}Q${-W} ${y + h} ${-W} ${y + h - r}V${y + r}Q${-W} ${y} ${-W + r} ${y}Z`;
  return {
    svg:
      `<rect class="sh" filter="url(#soft)" x="${-W + 4}" y="${-D + 8}" width="${W * 2 - 8}" height="${D * 2}" rx="${r}"/>` +
      `<path class="fl" d="${rr(-D - T, D * 2 + T)}"/><path class="ft" d="${rr(-D - T, D * 2)}"/>` +
      `<path class="seam" d="M${-W + r} ${D - T}H${W - r}"/><path class="ol" d="${rr(-D - T, D * 2 + T)}"/>`,
    top: D + T, bot: D, halfW: W,
  };
}

function tower() {
  const base = drum(0.9, 0.3, 0), H = 92;
  return {
    svg:
      base.svg +
      `<path class="tw" d="M-11 -7L0 ${-H}L11 -7Z"/>` +
      `<path class="tw-x" d="M-8.300 -28H8.300M-5.400 -52H5.400M-2.800 -72H2.800M-10.500 -9L8.300 -28M10.500 -9L-8.300 -28M-8.300 -28L5.400 -52M8.300 -28L-5.400 -52M-5.400 -52L2.800 -72M5.400 -52L-2.800 -72"/>` +
      `<path class="ic" d="M-9 ${-H}a12 12 0 0 1 0-16M9 ${-H}a12 12 0 0 0 0-16M-16 ${-H + 5}a21 21 0 0 1 0-26M16 ${-H + 5}a21 21 0 0 0 0-26"/>` +
      `<circle class="tw-d" cx="0" cy="${-H - 8}" r="3.6"/>`,
    top: H + 24, bot: base.bot, halfW: 32,
  };
}

/** Geometry for one kind. `mode` says where the name goes: on the front, or in a pill underneath. */
export function shape(kind) {
  const k = KINDS[kind];
  switch (k.shape) {
    case 'tile': {
      const b = box(1.5, 1.5, 0.55, 8);
      return { ...b, mode: 'pill', iconY: -0.55 * U };
    }
    case 'rack': {
      const b = box(1.25, 1.25, 3.7, 6, rackUnits(1.25, 1.25, 3.7));
      return { ...b, mode: 'pill', iconY: -3.7 * U };
    }
    case 'cloud':
      return { ...cloud(), mode: 'pill', iconY: -45 };
    case 'card':
      return { ...card(), mode: 'front', labelY: -12, labelW: 104, withIcon: { iconY: -23, labelY: 0 } };
    case 'tower':
      return { ...tower(), mode: 'pill' };
    case 'block': {
      const b = box(1.5, 1.5, 2.3);
      return { ...b, mode: 'front', iconY: -2.3 * U, labelY: -3, labelW: 106 };
    }
    case 'drum': {
      const d = drum(1.7, 2.3, 2);
      return { ...d, mode: 'front', iconY: -2.3 * U, labelY: -1, labelW: 92 };
    }
    case 'disc': {
      const d = drum(k.R, k.h, 0);
      return { ...d, mode: 'pill', iconY: -k.h * U };
    }
    case 'switch': {
      const b = box(1.8, 1.2, 0.75, 7, ports());
      return { ...b, mode: 'pill', iconY: -0.75 * U };
    }
    case 'wall': {
      const b = box(1.7, 0.5, 2.4, 5, bricks(1.7, 0.5, 2.4));
      return { ...b, mode: 'pill' };
    }
    default: {
      const slab = box(1.9, 1.9, 0.4, 13);
      const make = { laptop, crowd, phone, desktop, person }[k.shape] || laptop;
      const thing = make(0.4);
      // a person takes the block's colour; the slab under them stays neutral
      const base = k.shape === 'person' ? `<g style="--t:${TONES.sand[0]};--l:${TONES.sand[1]};--r:${TONES.sand[2]}">${slab.svg}</g>` : slab.svg;
      return { ...slab, svg: base + thing.svg, top: Math.max(slab.top, thing.top), mode: 'pill' };
    }
  }
}

/** Break a long name into two balanced lines. */
export function wrapLabel(text, max = 12) {
  const t = String(text || '').trim();
  if (t.length <= max || !t.includes(' ')) return [t];
  const w = t.split(/\s+/);
  let best = null;
  for (let i = 1; i < w.length; i++) {
    const a = w.slice(0, i).join(' '), b = w.slice(i).join(' '), m = Math.max(a.length, b.length);
    if (!best || m < best.m) best = { m, lines: [a, b] };
  }
  return best.lines;
}

/**
 * A component with its icon and, where it fits, its name on the front.
 * `icon` overrides the kind's own icon: a name from icons.js, or 'none'.
 */
export function nodeArt(kind, label, icon) {
  const k = KINDS[kind];
  let sh = shape(kind);
  const name = icon === 'none' ? null : ICONS[icon] ? icon : k.icon;
  let svg = sh.svg;
  if (name && sh.withIcon) sh = { ...sh, ...sh.withIcon }; // make room for an icon above the name
  if (name && sh.iconY != null) svg += `<g class="ic" transform="translate(-12 ${r2(sh.iconY - 12)})">${ICONS[name]}</g>`;
  if (sh.mode === 'front' && label) {
    const lines = wrapLabel(label);
    const longest = Math.max(...lines.map(l => l.length));
    const fs = r2(clamp(sh.labelW / (longest * 0.6), 8, 14));
    lines.forEach((t, i) => {
      const y = sh.labelY + (i - (lines.length - 1) / 2) * (fs + 3) + fs * 0.36;
      svg += `<text class="lbl" x="0" y="${r2(y)}" font-size="${fs}">${esc(t)}</text>`;
    });
  }
  return { ...sh, svg };
}

/** A flat pill label. `meter` adds a small bar; the monospace font makes the width predictable. */
export function pill(cx, cy, text, o = {}) {
  const fs = 11.5, cw = fs * 0.6, h = 22, px = 10;
  const pre = o.meter != null ? 37 : 0;
  const w = r2(Math.max(30, String(text).length * cw + px * 2 + pre));
  let inner = '';
  if (o.meter != null) {
    const v = clamp(o.meter, 0, 100);
    const col = v >= 85 ? '#e5645f' : v >= 60 ? '#e8b23c' : '#6dbb72';
    inner = `<rect class="mt" x="${px}" y="8" width="30" height="6" rx="3"/><rect x="${px}" y="8" width="${r2(Math.max(4, (30 * v) / 100))}" height="6" rx="3" fill="${col}"/>`;
  }
  return (
    `<g class="pill ${o.cls || ''}" transform="translate(${r2(cx - w / 2)} ${r2(cy - h / 2)})">` +
    `<rect class="ps" y="2.5" width="${w}" height="${h}" rx="${h / 2}"/><rect class="pb" width="${w}" height="${h}" rx="${h / 2}"/>` +
    `${inner}<text x="${px + pre}" y="15.3">${esc(text)}</text></g>`
  );
}

/** Small preview for the library. */
export function thumb(kind) {
  const k = KINDS[kind];
  const open = (vb, style = '') => `<svg class="scene thumb" viewBox="${vb}" style="${style}" aria-hidden="true">`;
  if (k.shape === 'zone') {
    const c = [P(-2, -2), P(2, -2), P(2, 2), P(-2, 2)];
    return `${open('-100 -62 200 124', `--t:${TONES.sky[1]};--r:${TONES.sky[2]}`)}<g class="zone"><path class="zf" d="${roundPath(c, 10)}"/></g></svg>`;
  }
  if (k.shape === 'note') return `${open('-46 -29 92 58')}${pill(0, 0, 'note')}</svg>`;
  const t = TONES[k.tone], art = nodeArt(kind, '');
  const w = Math.max(art.halfW + 10, 70), top = art.top + 8, hgt = art.top + art.bot + 18;
  return `${open(`${r2(-w)} ${r2(-top)} ${r2(w * 2)} ${r2(hgt)}`, `--t:${t[0]};--l:${t[1]};--r:${t[2]}`)}${art.svg}</svg>`;
}
