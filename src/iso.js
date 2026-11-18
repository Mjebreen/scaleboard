// Isometric projection. World space is a ground grid (x, y) plus height z, all in grid units.
// +x runs down-right on screen, +y runs down-left, +z runs straight up.

export const U = 24; // pixels per grid unit along an edge
export const CX = U * Math.cos(Math.PI / 6);
export const CY = U / 2;

export const r2 = n => Math.round(n * 100) / 100;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** World point to screen point. */
export const proj = (x, y, z = 0) => [(x - y) * CX, (x + y) * CY - z * U];

/** Screen point back to the ground plane (z = 0). Also works on deltas. */
export const unproj = (sx, sy) => {
  const a = sx / CX, b = sy / CY;
  return [(a + b) / 2, (b - a) / 2];
};

export const pts = list => list.map(p => `${r2(p[0])},${r2(p[1])}`).join(' ');

/**
 * Path through the points with rounded corners.
 * `r` is one radius or one per point. Open paths keep their end points sharp.
 */
export function roundPath(P, r, closed = true) {
  const n = P.length;
  const rad = i => (Array.isArray(r) ? r[i] : r);
  const cut = (v, to, rr) => {
    const dx = to[0] - v[0], dy = to[1] - v[1], d = Math.hypot(dx, dy) || 1, k = Math.min(rr, d / 2) / d;
    return [v[0] + dx * k, v[1] + dy * k];
  };
  const corner = (i, a, b, first) => {
    const v = P[i];
    return `${first ? 'M' : 'L'}${r2(a[0])} ${r2(a[1])}Q${r2(v[0])} ${r2(v[1])} ${r2(b[0])} ${r2(b[1])}`;
  };
  let d = '';
  if (closed) {
    for (let i = 0; i < n; i++) d += corner(i, cut(P[i], P[(i + n - 1) % n], rad(i)), cut(P[i], P[(i + 1) % n], rad(i)), i === 0);
    return d + 'Z';
  }
  d = `M${r2(P[0][0])} ${r2(P[0][1])}`;
  for (let i = 1; i < n - 1; i++) d += corner(i, cut(P[i], P[i - 1], rad(i)), cut(P[i], P[i + 1], rad(i)), false);
  return d + `L${r2(P[n - 1][0])} ${r2(P[n - 1][1])}`;
}
