// Routes a connection along the grid axes, on the ground.
//
// Lines run under the blocks, so a block hides whatever passes behind it. An arrow that arrives
// from behind would lose its tip, so those ends stop where the block's outline begins instead.

import { footprint } from './catalog.js';

const FOREVER = 1e9;
const span = o => [o.step || 1, o.until || FOREVER];
const overlaps = (a, b) => Math.max(span(a)[0], span(b)[0]) <= Math.min(span(a)[1], span(b)[1]);
const dist = (p, q) => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]);
const unit = (p, q) => [Math.sign(q[0] - p[0]), Math.sign(q[1] - p[1])];

function candidates(a, b) {
  const A = [a.x, a.y], B = [b.x, b.y];
  if (a.x === b.x || a.y === b.y) return [[A, B]];
  const mx = Math.round((a.x + b.x) / 2), my = Math.round((a.y + b.y) / 2);
  return [
    [A, [b.x, a.y], B], // along x, then y
    [A, [a.x, b.y], B], // along y, then x
    [A, [a.x, my], [b.x, my], B], // y, x, y
    [A, [mx, a.y], [mx, b.y], B], // x, y, x
  ];
}

function crosses(p, q, o, f) {
  const pad = 0.3;
  return (
    Math.min(p[0], q[0]) < o.x + f.ax + pad && Math.max(p[0], q[0]) > o.x - f.ax - pad &&
    Math.min(p[1], q[1]) < o.y + f.ay + pad && Math.max(p[1], q[1]) > o.y - f.ay - pad
  );
}

function score(c, fa, fb, others, heads) {
  const n = c.length;
  const first = unit(c[0], c[1]), last = unit(c[n - 2], c[n - 1]);
  let s = (n - 2) * 1.2;
  if (heads.end && (last[0] > 0 || last[1] > 0)) s += 4; // arrives behind the target
  if (heads.start && (first[0] < 0 || first[1] < 0)) s += 4;
  if (n > 2) {
    if (dist(c[0], c[1]) < (first[0] ? fa.ax : fa.ay) + 0.8) s += 6; // bend would sit inside the block
    if (dist(c[n - 2], c[n - 1]) < (last[0] ? fb.ax : fb.ay) + 0.8) s += 6;
  }
  for (const o of others) {
    const f = footprint(o);
    for (let i = 0; i < n - 1; i++) {
      if (crosses(c[i], c[i + 1], o, f)) { s += 10; break; }
    }
  }
  return s;
}

function trim(path, fa, fb, heads) {
  const P = path.map(p => [p[0], p[1]]), n = P.length;
  const L0 = dist(P[0], P[1]), L1 = dist(P[n - 2], P[n - 1]);
  if (L0 < 0.2 && n === 2) return P;
  const d0 = unit(P[0], P[1]), d1 = unit(P[n - 1], P[n - 2]); // both point away from their block
  const need = (d, f, head) => {
    const hidden = d[0] < 0 || d[1] < 0; // this end sits behind its block
    return { base: (d[0] ? f.ax : f.ay) + (head ? 0.3 : 0.02), extra: hidden ? f.h + (head ? 0.05 : -0.1) : 0 };
  };
  const a0 = need(d0, fa, heads.start), a1 = need(d1, fb, heads.end);
  let t0, t1;
  if (n === 2) {
    const room = Math.max(0, L0 - a0.base - a1.base - 0.5), want = a0.extra + a1.extra;
    const k = want > 0 ? Math.min(1, room / want) : 0;
    t0 = a0.base + a0.extra * k;
    t1 = a1.base + a1.extra * k;
    if (t0 + t1 > L0 - 0.1) {
      const m = Math.max(0, L0 - 0.1) / (t0 + t1);
      t0 *= m; t1 *= m;
    }
  } else {
    t0 = Math.min(a0.base + a0.extra, Math.max(L0 - 0.45, Math.min(a0.base, L0)));
    t1 = Math.min(a1.base + a1.extra, Math.max(L1 - 0.45, Math.min(a1.base, L1)));
  }
  P[0] = [P[0][0] + d0[0] * t0, P[0][1] + d0[1] * t0];
  P[n - 1] = [P[n - 1][0] + d1[0] * t1, P[n - 1][1] + d1[1] * t1];
  return P;
}

/** How many different routes exist between two blocks. */
export const routeCount = (a, b) => candidates(a, b).length;

/** World points for a connection, trimmed to the edges of both blocks. */
export function routeEdge(e, a, b, nodes, heads) {
  const fa = footprint(a), fb = footprint(b), cands = candidates(a, b);
  let path = e.bend ? cands[e.bend - 1] : null;
  if (!path) {
    const others = nodes.filter(o => o !== a && o !== b && o.kind !== 'note' && overlaps(o, e));
    let best = Infinity;
    for (const c of cands) {
      const s = score(c, fa, fb, others, heads);
      if (s < best) { best = s; path = c; }
    }
  }
  return trim(path, fa, fb, heads);
}
