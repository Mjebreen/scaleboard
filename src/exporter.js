// Getting a diagram out of the editor: pictures (PNG, SVG), a PDF with one page per step,
// a standalone animated web page, and the editable files (JSON, diagram code).

import fontUrl from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url';
import { S } from './state.js';
import { draw, packetsMarkup } from './render.js';
import { SCENE_CSS } from './scene-css.js';
import { CX, CY, r2 } from './iso.js';
import { viewerPage } from './viewer.js';

export const fileName = ext => (S.doc.name.trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').toLowerCase() || 'diagram') + '.' + ext;

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export const downloadText = (text, name, type = 'text/plain') => download(new Blob([text], { type }), name);

// The font is embedded so the result looks the same on a machine that does not have it.
let fontFace = null;
async function embeddedFont() {
  if (fontFace != null) return fontFace;
  try {
    const bytes = new Uint8Array(await (await fetch(fontUrl)).arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    fontFace = `@font-face{font-family:'JetBrains Mono Variable';font-weight:100 800;src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2')}`;
  } catch (e) {
    fontFace = '';
  }
  return fontFace;
}
const sceneCss = async () => (await embeddedFont()) + SCENE_CSS;

// --- capturing the drawing ------------------------------------------------
const LAYERS = ['lzones', 'ledges', 'lnodes', 'lover'];
const html = id => document.getElementById(id).innerHTML.replace(/&nbsp;/g, '&#160;');

/**
 * Draw the given steps one after another and keep the result of each.
 * All frames share one box, so a block stays in the same place from step to step.
 */
function capture(steps) {
  const sel = S.sel, cur = S.cur;
  S.sel = new Set(); // no selection marks in the output
  try {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const frames = steps.map(i => {
      S.cur = i;
      draw(true);
      for (const id of LAYERS) {
        const b = document.getElementById(id).getBBox();
        if (!b.width && !b.height) continue;
        x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
        x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
      }
      return { i, zones: html('lzones'), edges: html('ledges'), nodes: html('lnodes'), over: html('lover'), packets: packetsMarkup() };
    });
    if (x0 === Infinity) [x0, y0, x1, y1] = [-200, -150, 200, 150];
    const pad = 60;
    const box = { x: Math.floor(x0 - pad), y: Math.floor(y0 - pad), w: Math.max(240, Math.ceil(x1 - x0 + pad * 2)), h: Math.max(180, Math.ceil(y1 - y0 + pad * 2)) };
    return { box, frames };
  } finally {
    S.sel = sel;
    S.cur = cur;
    draw();
  }
}

const frameMarkup = (f, animated) =>
  `<g>${f.zones}</g><g>${f.edges}</g><g class="sb-pk">${animated ? '' : f.packets}</g><g>${f.nodes}</g><g class="sb-over">${f.over}</g>`;

/** A complete <svg> around some content. `px` scales the pixel size without changing the picture. */
function svgDoc({ box, css, body, theme = S.theme, id = '', px = 1, sized = true }) {
  const { x, y, w, h } = box, at = `x="${x}" y="${y}" width="${w}" height="${h}"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="scene"${id ? ` id="${id}"` : ''} data-theme="${theme}" viewBox="${x} ${y} ${w} ${h}"` +
    `${sized ? ` width="${r2(w * px)}" height="${r2(h * px)}"` : ''}>` +
    (css ? `<style>${css}</style>` : '') +
    `<defs><pattern id="gridp" patternUnits="userSpaceOnUse" width="${r2(CX * 2)}" height="${r2(CY * 2)}">` +
    `<path class="gridl" d="M0 0L${r2(CX * 2)} ${r2(CY * 2)}M0 ${r2(CY * 2)}L${r2(CX * 2)} 0"/></pattern>` +
    `<radialGradient id="fadeg"><stop offset=".3" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<mask id="fade" maskUnits="userSpaceOnUse" ${at}><rect ${at} fill="url(#fadeg)"/></mask>` +
    `<filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter></defs>` +
    `<rect class="bg" ${at}/><g mask="url(#fade)"><rect ${at} fill="url(#gridp)"/></g>${body}</svg>`
  );
}

async function toImage(svgText) {
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise((ok, fail) => { img.onload = ok; img.onerror = () => fail(new Error('the picture could not be drawn')); img.src = url; });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
const toBlob = (canvas, type, quality) =>
  new Promise((ok, fail) => canvas.toBlob(b => (b ? ok(b) : fail(new Error('the picture is too large for this browser'))), type, quality));

// --- pictures of the current step -----------------------------------------
export async function exportSvg() {
  const css = await sceneCss(), { box, frames } = capture([S.cur]);
  downloadText(svgDoc({ box, css, body: frameMarkup(frames[0]) }), fileName('svg'), 'image/svg+xml');
}

export async function exportPng(scale = 2) {
  const css = await sceneCss(), { box, frames } = capture([S.cur]);
  const img = await toImage(svgDoc({ box, css, body: frameMarkup(frames[0]), px: scale }));
  const cv = document.createElement('canvas');
  cv.width = box.w * scale;
  cv.height = box.h * scale;
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  download(await toBlob(cv, 'image/png'), fileName('png'));
}

// --- PDF: one landscape A4 page per step ----------------------------------
function wrapText(g, text, width) {
  const lines = [];
  for (const para of String(text || '').split('\n')) {
    let row = '';
    for (const word of para.split(/\s+/)) {
      const next = row ? `${row} ${word}` : word;
      if (row && g.measureText(next).width > width) { lines.push(row); row = word; }
      else row = next;
    }
    lines.push(row);
  }
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines;
}

/** A PDF whose pages are each one full-page JPEG. Small enough to write by hand, so no library. */
function buildPdf(pages, W, H, title) {
  const enc = new TextEncoder(), parts = [], offsets = [];
  let size = 0;
  const put = d => { const b = typeof d === 'string' ? enc.encode(d) : d; parts.push(b); size += b.length; };
  const obj = (n, dict, stream) => {
    offsets[n] = size;
    put(`${n} 0 obj\n${dict}\n`);
    if (stream) { put('stream\n'); put(stream); put('\nendstream\n'); }
    put('endobj\n');
  };
  const safe = String(title).replace(/[^\x20-\x7e]/g, '?').replace(/[\\()]/g, '\\$&');
  const count = 4 + pages.length * 3;
  put('%PDF-1.4\n%âãÏÓ\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${4 + i * 3} 0 R`).join(' ')}] >>`);
  obj(3, `<< /Title (${safe}) /Creator (Scaleboard) >>`);
  pages.forEach((p, i) => {
    const n = 4 + i * 3, content = enc.encode(`q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`);
    obj(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`);
    obj(n + 1, `<< /Length ${content.length} >>`, content);
    obj(n + 2, `<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>`, p.jpeg);
  });
  const xref = size;
  put(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) put(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  put(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}

export async function exportPdf() {
  const css = await sceneCss(), { doc } = S, N = doc.steps.length;
  const { box, frames } = capture(doc.steps.map((_, i) => i));
  // A4 landscape in points. Always the light theme: it is the one that prints.
  const W = 842, H = 595, M = 36, K = 2.5;
  const PAPER = '#f4ede2', INK = '#221f1b', MUTE = '#7d7468', FONT = `'JetBrains Mono Variable', ui-monospace, monospace`;
  const pages = [];
  for (const f of frames) {
    const s = doc.steps[f.i], captioned = N > 1 || !!s.text;
    const cv = document.createElement('canvas');
    cv.width = W * K;
    cv.height = H * K;
    const g = cv.getContext('2d');
    g.scale(K, K);
    g.fillStyle = PAPER;
    g.fillRect(0, 0, W, H);

    g.font = `500 10.5px ${FONT}`;
    const lines = captioned ? wrapText(g, s.text, Math.min(W - M * 2, 640)).slice(0, 9) : [];
    const capH = captioned ? 30 + lines.length * 16 : 0;

    const top = M + 26, aw = W - M * 2, ah = H - M - capH - top;
    const sc = Math.min(aw / box.w, ah / box.h, 1.5);
    const img = await toImage(svgDoc({ box, css, body: frameMarkup(f), theme: 'light', px: sc * K }));
    g.drawImage(img, M + (aw - box.w * sc) / 2, top + (ah - box.h * sc) / 2, box.w * sc, box.h * sc);

    g.fillStyle = INK;
    g.font = `800 15px ${FONT}`;
    g.fillText(doc.name, M, M + 10, aw - 110);
    if (N > 1) {
      g.fillStyle = MUTE;
      g.font = `700 9.5px ${FONT}`;
      g.textAlign = 'right';
      g.fillText(`STEP ${f.i + 1} / ${N}`, W - M, M + 10);
      g.textAlign = 'left';
    }
    if (captioned) {
      let y = H - M - capH + 22;
      g.fillStyle = INK;
      g.font = `800 14px ${FONT}`;
      g.fillText(s.title || `Step ${f.i + 1}`, M, y, aw);
      g.fillStyle = MUTE;
      g.font = `500 10.5px ${FONT}`;
      for (const l of lines) g.fillText(l, M, (y += 16));
    }
    const jpeg = new Uint8Array(await (await toBlob(cv, 'image/jpeg', 0.93)).arrayBuffer());
    pages.push({ jpeg, w: cv.width, h: cv.height });
  }
  download(buildPdf(pages, W, H, doc.name), fileName('pdf'));
}

// --- animated web page ----------------------------------------------------
export async function exportHtml() {
  const css = await sceneCss(), { doc } = S;
  const { box, frames } = capture(doc.steps.map((_, i) => i));
  const body = frames.map((f, j) => `<g class="frame"${j ? ' style="display:none"' : ''}>${frameMarkup(f, true)}</g>`).join('');
  const scene = svgDoc({ box, body, id: 'sb-scene', sized: false });
  downloadText(viewerPage({ name: doc.name, steps: doc.steps, theme: S.theme, css, scene }), fileName('html'), 'text/html');
}

// --- editable files -------------------------------------------------------
export const saveJson = () => downloadText(JSON.stringify(S.doc, null, 2), fileName('json'), 'application/json');
