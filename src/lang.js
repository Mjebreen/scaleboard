// The Scaleboard diagram language: a small text format that people and AI models can write.
// `parse` turns text into a diagram, `toScript` turns a diagram back into text.
// The full description lives in LANGUAGE.md. This file has no browser dependencies.

import { KINDS, TONES, PACKETS, ALIASES, BLOCK_KINDS, footprint } from './catalog.js';
import { ICONS } from './icons.js';

export { ALIASES };

const RESERVED = new Set(['diagram', 'step', 'zone', 'note']);
const STATES = { ok: 'ok', normal: 'ok', hot: 'hot', overloaded: 'hot', down: 'down', offline: 'down', faded: 'faded' };
const SPEEDS = { slow: 'slow', normal: 'normal', fast: 'fast', still: 'none', off: 'none', none: 'none' };
const OPS = {
  '->': ['end', false], '-->': ['end', false], '=>': ['end', false],
  '<-': ['end', true], '<--': ['end', true],
  '<->': ['both', false], '<-->': ['both', false], '<=>': ['both', false],
  '--': ['none', false],
  '→': ['end', false], '⇒': ['end', false], '←': ['end', true], '↔': ['both', false],
};
const GAP_X = 6, GAP_Y = 8; // auto layout: distance between neighbours in a row, and between rows

const has = (o, k) => Object.hasOwn(o, k);
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function suggest(word, options) {
  let best = null, score = Math.min(3, Math.floor(word.length / 2) + 1);
  for (const o of options) {
    const s = distance(word, o);
    if (s < score) { score = s; best = o; }
  }
  return best ? ` Did you mean "${best}"?` : '';
}

// --- tokens ---------------------------------------------------------------
const isQuote = c => c === '"' || c === '“' || c === '”';

/** Read a quoted string starting at s[i]. Curly quotes from word processors work as well. */
function readString(s, i) {
  const straight = s[i] === '"';
  const closes = c => c === '"' || (!straight && c === '”');
  let j = i + 1, v = '';
  while (j < s.length && !closes(s[j])) {
    if (s[j] === '\\' && j + 1 < s.length) { v += s[j + 1] === 'n' ? '\n' : s[j + 1]; j += 2; }
    else v += s[j++];
  }
  if (j >= s.length) throw new Error('a quote is opened but never closed');
  return { v, end: j + 1 };
}

function tokenize(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i], rest = line.slice(i);
    let m;
    if (/[\s()%;]/.test(c)) i++;
    else if (isQuote(c)) { const r = readString(line, i); out.push({ t: 'str', v: r.v }); i = r.end; }
    else if (c === ',' || c === ':') { out.push({ t: c }); i++; }
    else if ((m = /^(<-->|<->|<=>|-->|<--|->|=>|<-|--|→|⇒|↔|←)/.exec(rest))) { out.push({ t: 'op', v: m[1] }); i += m[1].length; }
    else if ((m = /^(\d+)\s*[x×]\s*(\d+)/.exec(rest))) { out.push({ t: 'size', w: +m[1], h: +m[2] }); i += m[0].length; }
    else if ((m = /^-?\d+(?:\.\d+)?/.exec(rest))) { out.push({ t: 'num', v: +m[0] }); i += m[0].length; }
    else if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) { out.push({ t: 'word', v: m[0] }); i += m[0].length; }
    else throw new Error(`did not expect "${c}" here. Text with spaces or symbols goes in "double quotes"`);
  }
  return out;
}
const show = t => (t.t === 'str' ? `"${t.v}"` : t.t === 'num' ? String(t.v) : t.t === 'word' ? `"${t.v}"` : t.t === 'op' ? t.v : t.t);

// --- automatic layout -----------------------------------------------------
// Blocks go in rows. Each connection pushes its target one row further "up" the board,
// so traffic flows towards the top right and every arrow lands on a face you can see.
export function arrange(blocks, edges) {
  const ids = blocks.map(b => b.id), idx = new Map(ids.map((id, i) => [id, i]));
  const adj = new Map(ids.map(id => [id, []])), indeg = new Map(ids.map(id => [id, 0]));
  for (const e of edges) if (adj.has(e.from) && adj.has(e.to) && e.from !== e.to) { adj.get(e.from).push(e.to); indeg.set(e.to, indeg.get(e.to) + 1); }

  // keep only edges that do not close a loop
  const mark = new Map(), fwd = new Map(ids.map(id => [id, []])), back = new Map(ids.map(id => [id, []]));
  const visit = id => {
    mark.set(id, 1);
    for (const t of adj.get(id)) {
      if (mark.get(t) === 1) continue;
      fwd.get(id).push(t);
      back.get(t).push(id);
      if (!mark.has(t)) visit(t);
    }
    mark.set(id, 2);
  };
  for (const id of ids) if (!indeg.get(id) && !mark.has(id)) visit(id);
  for (const id of ids) if (!mark.has(id)) visit(id);

  // row = longest path from a starting block
  const row = new Map(ids.map(id => [id, 0])), left = new Map(ids.map(id => [id, back.get(id).length]));
  const queue = ids.filter(id => !left.get(id)), order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const t of fwd.get(id)) {
      row.set(t, Math.max(row.get(t), row.get(id) + 1));
      left.set(t, left.get(t) - 1);
      if (!left.get(t)) queue.push(t);
    }
  }
  // A block that feeds something further on moves up next to it, so a side branch
  // (a config store, an ingest job) sits beside the thing it serves instead of back at the start.
  for (const id of order.reverse()) {
    const next = fwd.get(id);
    if (next.length) row.set(id, Math.max(row.get(id), Math.min(...next.map(t => row.get(t))) - 1));
  }
  const rows = [];
  for (const id of ids) (rows[row.get(id)] ||= []).push(id);
  for (let i = 0; i < rows.length; i++) rows[i] ||= [];

  // order each row to keep connections from crossing
  const place = new Map();
  const index = () => rows.forEach(r => r.forEach((id, i) => place.set(id, i)));
  const mean = (list, at) => (list.length ? list.reduce((s, x) => s + at.get(x), 0) / list.length : null);
  index();
  for (let pass = 0; pass < 4; pass++) {
    const down = pass % 2 === 0;
    for (let r = down ? 1 : rows.length - 2; r >= 0 && r < rows.length; r += down ? 1 : -1) {
      const key = new Map(rows[r].map(id => [id, mean((down ? back : fwd).get(id), place) ?? place.get(id)]));
      rows[r].sort((a, b) => key.get(a) - key.get(b) || idx.get(a) - idx.get(b));
      index();
    }
  }

  // spread each row along x, pulling every block towards the blocks that feed it
  const x = new Map();
  rows.forEach((r, ri) => {
    const want = r.map((id, i) => mean(back.get(id).filter(p => x.has(p)), x) ?? (ri ? null : 0));
    const fallback = want.filter(v => v != null);
    const base = fallback.length ? fallback.reduce((s, v) => s + v, 0) / fallback.length : 0;
    const target = want.map(v => v ?? base);
    const pos = [];
    r.forEach((id, i) => pos.push(i ? Math.max(target[i], pos[i - 1] + GAP_X) : target[i]));
    const shift = target.reduce((s, v, i) => s + v - pos[i], 0) / r.length;
    r.forEach((id, i) => x.set(id, pos[i] + shift));
  });
  const out = new Map();
  rows.forEach((r, ri) => {
    let prev = -Infinity;
    for (const id of r) {
      const px = Math.max(Math.round(x.get(id)), prev + GAP_X) + 0; // + 0 turns -0 into 0
      out.set(id, [px, 0 - ri * GAP_Y]);
      prev = px;
    }
  });
  return out;
}

/**
 * An AI reply usually wraps the diagram in a ``` fence with sentences around it.
 * Returns the range of lines to read: the block labelled scaleboard, else the first block,
 * else everything.
 */
function codeRange(lines) {
  const blocks = [];
  let open = -1, label = '';
  lines.forEach((l, i) => {
    const m = /^\s*```+\s*([\w-]*)\s*$/.exec(l);
    if (!m) return;
    if (open < 0) { open = i; label = m[1].toLowerCase(); }
    else { blocks.push({ from: open + 1, to: i, label }); open = -1; }
  });
  if (open >= 0) blocks.push({ from: open + 1, to: lines.length, label }); // a fence that was never closed
  const pick = blocks.find(b => b.label === 'scaleboard' || b.label === 'sb') || blocks[0];
  return pick ? [pick.from, pick.to] : [0, lines.length];
}

// --- parser ---------------------------------------------------------------
/**
 * Read diagram text. Returns { doc, errors, warnings, stats }.
 * `doc` is ready for the editor when `errors` is empty. Messages carry the line they came from.
 */
export function parse(text) {
  const errors = [], warnings = [];
  const doc = { name: 'Untitled diagram', nodes: [], edges: [], zones: [], steps: [] };
  const blocks = new Map(); // id -> declaration (blocks and notes)
  const broken = new Set(); // ids from lines that could not be read
  const links = [], zones = [];
  let ctx = 1, line = 0;
  const warn = msg => warnings.push({ line, msg });

  const num = (toks, what) => {
    const t = toks.shift();
    if (!t || t.t !== 'num') throw new Error(`"${what}" needs a number after it`);
    return t.v;
  };
  const pair = (toks, what) => {
    const a = num(toks, what);
    if (toks[0]?.t === ',') toks.shift();
    return [Math.round(a), Math.round(num(toks, what))];
  };
  const value = (toks, what) => {
    const t = toks.shift();
    if (!t || (t.t !== 'word' && t.t !== 'str' && t.t !== 'num')) throw new Error(`"${what}" needs a value after it`);
    return String(t.v);
  };
  const tone = (toks, what) => {
    const v = value(toks, what).toLowerCase();
    if (!has(TONES, v)) throw new Error(`"${v}" is not a colour. Use one of: ${Object.keys(TONES).join(', ')}.${suggest(v, Object.keys(TONES))}`);
    return v;
  };
  const idList = toks => {
    const ids = [];
    for (;;) {
      const t = toks.shift();
      if (!t || t.t !== 'word') throw new Error(`expected the id of a block${t ? `, not ${show(t)}` : ''}`);
      ids.push(t.v);
      if (toks[0]?.t === ',') { toks.shift(); continue; }
      return ids;
    }
  };
  const optionalId = (toks, stops) => (toks[0]?.t === 'word' && !stops.includes(toks[0].v.toLowerCase()) ? toks.shift().v : null);
  const claim = (id, what) => {
    if (RESERVED.has(id.toLowerCase())) throw new Error(`"${id}" is a keyword, so it cannot be an id. Pick another name`);
    if (blocks.has(id) || zones.some(z => z.id === id)) throw new Error(`the id "${id}" is used twice. Every ${what} needs its own id`);
    return id;
  };
  /** Properties shared by blocks, notes and zones. Returns true when it used the word. */
  const shared = (w, toks, o) => {
    if (w === 'step') o.step = Math.round(num(toks, 'step'));
    else if (w === 'until') o.until = Math.round(num(toks, 'until'));
    else return false;
    return true;
  };

  function stepStmt(rest) {
    if (/^\d+$/.test(rest)) {
      if (+rest < 1 || +rest > doc.steps.length) throw new Error(`there is no step ${rest} yet. Declare it first: step "Title"`);
      ctx = +rest;
      return;
    }
    let title, body = '';
    if (isQuote(rest[0])) {
      const r = readString(rest, 0);
      title = r.v;
      body = rest.slice(r.end).trim().replace(/^:\s*/, '');
    } else {
      const i = rest.indexOf(':');
      title = (i < 0 ? rest : rest.slice(0, i)).trim();
      body = i < 0 ? '' : rest.slice(i + 1).trim();
    }
    if (isQuote(body[0])) body = readString(body, 0).v;
    if (!title) throw new Error('a step needs a title, for example: step "Add a cache" : Why it helps.');
    doc.steps.push({ title, text: body });
    ctx = doc.steps.length;
  }

  function blockStmt(kind, word, toks) {
    const d = { kind, x: null, y: null, label: null, tone: undefined, icon: undefined, status: 'ok', badge: '', meter: null, step: ctx, until: 0, line };
    if (toks[0]?.t === 'word') d.id = toks.shift().v;
    while (toks.length) {
      const t = toks.shift();
      if (t.t === ',' || t.t === ':') continue;
      if (t.t === 'str') {
        if (d.label == null) d.label = t.v;
        else warn(`ignored the extra text "${t.v}". A block has one name; use tag "…" for a second label`);
        continue;
      }
      if (t.t !== 'word') throw new Error(`did not expect ${show(t)} here`);
      const w = t.v.toLowerCase();
      if (shared(w, toks, d)) continue;
      if (w === 'at') [d.x, d.y] = pair(toks, 'at');
      else if (w === 'color' || w === 'colour') d.tone = tone(toks, w);
      else if (w === 'icon') {
        const v = value(toks, w).toLowerCase();
        if (v !== 'none' && !has(ICONS, v)) throw new Error(`"${v}" is not an icon.${suggest(v, Object.keys(ICONS))} The guide lists every icon name`);
        d.icon = v;
      } else if (w === 'state' || w === 'status') {
        const v = value(toks, w).toLowerCase();
        if (!has(STATES, v)) throw new Error(`"${v}" is not a state. Use ok, hot, down or faded`);
        d.status = STATES[v];
      } else if (w === 'tag' || w === 'badge') d.badge = value(toks, w);
      else if (w === 'meter' || w === 'load') d.meter = Math.max(0, Math.min(100, Math.round(num(toks, w))));
      else if (w === 'label' || w === 'name') d.label = value(toks, w);
      else if (has(TONES, w)) d.tone = w;
      else if (has(STATES, w)) d.status = STATES[w];
      else warn(`ignored "${t.v}": not something a block understands`);
    }
    if (!d.id) {
      d.id = slug(d.label);
      if (!d.id) throw new Error(`give the block an id and a name, for example: ${word} web1 "Web server"`);
      warn(`this block has no id, so it is called "${d.id}". Write: ${word} ${d.id} "${d.label}"`);
    }
    if (d.label == null) d.label = d.id.replace(/_/g, ' ');
    blocks.set(claim(d.id, 'block'), d);
  }

  function noteStmt(toks) {
    const d = { kind: 'note', x: null, y: null, label: null, near: null, status: 'ok', badge: '', meter: null, step: ctx, until: 0, line };
    d.id = optionalId(toks, ['at', 'near', 'step', 'until']);
    while (toks.length) {
      const t = toks.shift();
      if (t.t === ',' || t.t === ':') continue;
      if (t.t === 'str') { d.label = d.label == null ? t.v : `${d.label} ${t.v}`; continue; }
      if (t.t !== 'word') throw new Error(`did not expect ${show(t)} here`);
      const w = t.v.toLowerCase();
      if (shared(w, toks, d)) continue;
      if (w === 'at') [d.x, d.y] = pair(toks, 'at');
      else if (w === 'near') d.near = value(toks, 'near');
      else warn(`ignored "${t.v}": not something a note understands`);
    }
    if (d.label == null) throw new Error('a note needs its text in quotes, for example: note "Reads only" near db');
    if (d.x == null && !d.near) throw new Error('a note needs a place: add  at X,Y  or  near some_block');
    d.id ||= `note_${blocks.size + 1}`;
    blocks.set(claim(d.id, 'note'), d);
  }

  function zoneStmt(toks) {
    const z = { x: null, y: null, w: null, h: null, around: null, pad: 1, label: '', tone: 'sky', step: ctx, until: 0, line };
    z.id = optionalId(toks, ['at', 'around', 'size', 'color', 'colour', 'pad', 'step', 'until']) || `zone_${zones.length + 1}`;
    while (toks.length) {
      const t = toks.shift();
      if (t.t === ',' || t.t === ':') continue;
      if (t.t === 'str') { z.label = t.v; continue; }
      if (t.t === 'size') { z.w = t.w; z.h = t.h; continue; }
      if (t.t !== 'word') throw new Error(`did not expect ${show(t)} here`);
      const w = t.v.toLowerCase();
      if (shared(w, toks, z)) continue;
      if (w === 'at') [z.x, z.y] = pair(toks, 'at');
      else if (w === 'around') z.around = idList(toks);
      else if (w === 'size') { if (toks[0]?.t === 'size') { const s = toks.shift(); z.w = s.w; z.h = s.h; } else [z.w, z.h] = pair(toks, 'size'); }
      else if (w === 'pad') z.pad = Math.max(0, Math.round(num(toks, 'pad')));
      else if (w === 'color' || w === 'colour') z.tone = tone(toks, w);
      else if (has(TONES, w)) z.tone = w;
      else warn(`ignored "${t.v}": not something a zone understands`);
    }
    if (!z.around && (z.x == null || z.w == null)) throw new Error('a zone needs a place: add  around block_a, block_b  or  at X,Y size WxH');
    claim(z.id, 'zone');
    zones.push(z);
  }

  function linkStmt(toks) {
    const groups = [idList(toks)], ops = [];
    while (toks[0]?.t === 'op') { ops.push(toks.shift().v); groups.push(idList(toks)); }
    const p = { label: '', packet: 'request', flow: 'normal', style: 'solid', bend: 0, step: ctx, until: 0 };
    while (toks.length) {
      const t = toks.shift();
      if (t.t === ',' || t.t === ':') continue;
      if (t.t === 'str') { p.label = t.v; continue; }
      if (t.t !== 'word') throw new Error(`did not expect ${show(t)} after the connection`);
      const w = t.v.toLowerCase();
      if (shared(w, toks, p)) continue;
      if (has(PACKETS, w)) p.packet = w;
      else if (has(SPEEDS, w)) p.flow = SPEEDS[w];
      else if (w === 'dashed' || w === 'dotted') p.style = 'dashed';
      else if (w === 'solid') p.style = 'solid';
      else if (w === 'label') p.label = value(toks, w);
      else if (w === 'packet') {
        const v = value(toks, w).toLowerCase();
        if (!has(PACKETS, v)) throw new Error(`"${v}" is not a packet type. Use one of: ${Object.keys(PACKETS).join(', ')}`);
        p.packet = v;
      } else if (w === 'speed' || w === 'flow') {
        const v = value(toks, w).toLowerCase();
        if (!has(SPEEDS, v)) throw new Error(`"${v}" is not a speed. Use slow, normal, fast or still`);
        p.flow = SPEEDS[v];
      } else if (w === 'route') p.bend = Math.max(0, Math.min(4, Math.round(num(toks, w))));
      else warn(`ignored "${t.v}": not something a connection understands`);
    }
    ops.forEach((op, g) => {
      const [arrows, flip] = OPS[op];
      for (const a of groups[g]) for (const b of groups[g + 1]) links.push({ ...p, from: flip ? b : a, to: flip ? a : b, arrows, line });
    });
  }

  function statement(text) {
    let m;
    if ((m = /^diagram\b\s*:?\s*(.*)$/i.exec(text))) {
      const v = m[1].trim();
      doc.name = (isQuote(v[0]) ? readString(v, 0).v : v) || doc.name;
      return;
    }
    if (/^step\b/i.test(text) && !/^step\s*[<\-=→←↔⇒]/i.test(text)) return stepStmt(text.slice(4).trim());
    const toks = tokenize(text);
    if (!toks.length) return;
    if (toks.some(t => t.t === 'op')) return linkStmt(toks);
    const head = toks.shift();
    if (head.t !== 'word') throw new Error('a line starts with a kind of block (server, database, …), a keyword, or the id of a block');
    const w = head.v.toLowerCase();
    if (w === 'zone') return zoneStmt(toks);
    if (w === 'note') return noteStmt(toks);
    const kind = BLOCK_KINDS.includes(w) ? w : has(ALIASES, w) ? ALIASES[w] : null;
    if (!kind) throw new Error(`"${head.v}" is not a kind of block.${suggest(w, [...BLOCK_KINDS, ...Object.keys(ALIASES)])} A connection needs an arrow, like  a -> b`);
    blockStmt(kind, w, toks);
  }

  const lines = String(text ?? '').replace(/^\ufeff/, '').replace(/\r/g, '').split('\n');
  const [first, end] = codeRange(lines);
  for (let i = first; i < end; i++) {
    line = i + 1; // line numbers always refer to the text as it was given
    const t = lines[i].trim();
    if (!t || t.startsWith('#') || t.startsWith('//') || t.startsWith('```')) continue;
    try { statement(t); } catch (e) {
      errors.push({ line, msg: e.message });
      const m = /^[A-Za-z_]\w*\s+([A-Za-z_]\w*)/.exec(t);
      if (m) broken.add(m[1]); // probably a block whose line has a mistake; its id is still "taken"
    }
  }

  // --- put it together ---
  if (!doc.steps.length) doc.steps.push({ title: 'Overview', text: '' });
  const N = doc.steps.length;
  const when = o => {
    line = o.line;
    let step = o.step || 1, until = o.until || 0;
    if (step < 1 || step > N) { warn(`there is no step ${step}; this shows from step ${Math.max(1, Math.min(N, step))} instead`); step = Math.max(1, Math.min(N, step)); }
    if (until && until < step) { warn(`"until ${until}" is before the step it appears in (${step}); ignored`); until = 0; }
    if (until >= N) until = 0;
    return { step, until };
  };

  const real = [...blocks.values()].filter(b => b.kind !== 'note');
  const known = id => blocks.get(id)?.kind !== 'note' && blocks.has(id);
  const good = [];
  for (const l of links) {
    line = l.line;
    const missing = [l.from, l.to].find(id => !known(id));
    if (missing && broken.has(missing)) continue; // already reported on the line that declares it
    if (missing) errors.push({ line, msg: `there is no block called "${missing}".${suggest(missing, real.map(b => b.id))} Declare it first, for example: server ${missing} "Name"` });
    else if (l.from === l.to) errors.push({ line, msg: `"${l.from}" is connected to itself` });
    else good.push(l);
  }

  const spots = arrange(real, good);
  for (const b of real) if (b.x == null) [b.x, b.y] = spots.get(b.id);
  for (const b of blocks.values()) {
    if (b.kind !== 'note' || b.x != null) continue;
    const host = blocks.get(b.near);
    line = b.line;
    if (!host || host.kind === 'note') { errors.push({ line, msg: `the note is "near ${b.near}", but there is no block called "${b.near}".${suggest(b.near, real.map(r => r.id))}` }); continue; }
    b.x = host.x + 3;
    b.y = host.y + 3;
  }

  for (const b of blocks.values()) {
    if (b.x == null) continue;
    doc.nodes.push({ id: 'n_' + b.id, kind: b.kind, x: b.x, y: b.y, label: b.label, tone: b.tone, icon: b.icon, status: b.status, badge: b.badge, meter: b.meter, ...when(b) });
  }
  good.forEach((l, i) => {
    doc.edges.push({ id: 'e_' + i, from: 'n_' + l.from, to: 'n_' + l.to, label: l.label, arrows: l.arrows, style: l.style, flow: l.flow, packet: l.packet, bend: l.bend, ...when(l) });
  });
  for (const z of zones) {
    line = z.line;
    if (z.around) {
      const bad = z.around.find(id => !known(id));
      if (bad) { errors.push({ line, msg: `the zone goes around "${bad}", but there is no block called "${bad}".${suggest(bad, real.map(r => r.id))}` }); continue; }
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const id of z.around) {
        const b = blocks.get(id), f = footprint(b);
        x0 = Math.min(x0, b.x - f.ax); x1 = Math.max(x1, b.x + f.ax);
        y0 = Math.min(y0, b.y - f.ay); y1 = Math.max(y1, b.y + f.ay);
      }
      z.x = Math.floor(x0 - z.pad); z.y = Math.floor(y0 - z.pad);
      z.w = Math.ceil(x1 + z.pad) - z.x; z.h = Math.ceil(y1 + z.pad) - z.y;
    }
    doc.zones.push({ id: 'z_' + z.id, x: z.x, y: z.y, w: Math.max(2, z.w), h: Math.max(2, z.h), label: z.label, tone: z.tone, ...when(z) });
  }
  if (!errors.length && !doc.nodes.length) errors.push({ line: 1, msg: 'there are no blocks yet. Add one, for example: server web "Web server"' });

  errors.sort((a, b) => a.line - b.line);
  return { doc, errors, warnings, stats: { blocks: real.length, connections: doc.edges.length, zones: doc.zones.length, steps: N } };
}

// --- writer ---------------------------------------------------------------
const q = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';

/** Write a diagram as text. Reading the result back gives the same diagram. */
export function toScript(doc) {
  const used = new Set(), idOf = new Map();
  const name = (base, fallback) => {
    let s = slug(base) || fallback;
    if (/^\d/.test(s)) s = `${fallback}_${s}`;
    if (RESERVED.has(s)) s += '_1';
    let c = s;
    for (let i = 2; used.has(c); i++) c = `${s}_${i}`;
    used.add(c);
    return c;
  };
  for (const n of doc.nodes) idOf.set(n.id, name(n.label, n.kind));
  const zoneIds = doc.zones.map(z => name(z.label, 'zone'));

  const tail = o => (o.until ? ` until ${o.until}` : '');
  const block = n => {
    if (n.kind === 'note') return `note ${idOf.get(n.id)} ${q(n.label)} at ${n.x},${n.y}${tail(n)}`;
    let s = `${n.kind} ${idOf.get(n.id)} ${q(n.label)} at ${n.x},${n.y}`;
    if (n.tone && n.tone !== KINDS[n.kind].tone) s += ` color ${n.tone}`;
    if (n.icon) s += ` icon ${n.icon}`;
    if (n.status && n.status !== 'ok') s += ` state ${n.status}`;
    if (n.badge) s += ` tag ${q(n.badge)}`;
    if (n.meter != null) s += ` meter ${n.meter}`;
    return s + tail(n);
  };
  const zone = (z, i) => `zone ${zoneIds[i]} ${q(z.label)} at ${z.x},${z.y} size ${z.w}x${z.h} color ${z.tone}${tail(z)}`;
  const arrow = e => (e.arrows === 'both' ? '<->' : e.arrows === 'none' ? '--' : '->');
  const props = e => {
    let s = '';
    if (e.label) s += ` ${q(e.label)}`;
    if (e.packet && e.packet !== 'request') s += ` ${e.packet}`;
    if (e.flow && e.flow !== 'normal') s += ` ${e.flow === 'none' ? 'still' : e.flow}`;
    if (e.style === 'dashed') s += ' dashed';
    if (e.bend) s += ` route ${e.bend}`;
    return s + tail(e);
  };

  const out = [`diagram ${q(doc.name)}`];
  const first = doc.steps[0] || { title: 'Overview', text: '' };
  const stepped = doc.steps.length > 1 || first.text || (first.title && first.title !== 'Overview');
  const at = (list, i) => list.map((o, j) => [o, j]).filter(([o]) => (o.step || 1) === i + 1);
  (stepped ? doc.steps : [first]).forEach((s, i) => {
    out.push('');
    if (stepped) out.push(`step ${q(s.title || `Step ${i + 1}`)}${s.text ? ` : ${/^"|\n/.test(s.text) ? q(s.text) : s.text}` : ''}`);
    const nodes = at(doc.nodes, i), zs = at(doc.zones, i), es = at(doc.edges, i).filter(([e]) => idOf.has(e.from) && idOf.has(e.to));
    for (const [n] of nodes) out.push(block(n));
    for (const [z, j] of zs) out.push(zone(z, j));
    if (es.length && (nodes.length || zs.length)) out.push('');
    // connections that share an end and the same settings are written on one line:  lb -> a, b, c
    const items = es.map(([e]) => ({ a: idOf.get(e.from), b: idOf.get(e.to), op: arrow(e), rest: props(e), done: false }));
    for (const it of items) {
      if (it.done) continue;
      const same = o => !o.done && o.op === it.op && o.rest === it.rest;
      const out2 = items.filter(o => same(o) && o.a === it.a);
      const group = out2.length > 1 ? out2 : items.filter(o => same(o) && o.b === it.b);
      group.forEach(o => (o.done = true));
      out.push(out2.length > 1 ? `${it.a} ${it.op} ${group.map(o => o.b).join(', ')}${it.rest}` : `${group.map(o => o.a).join(', ')} ${it.op} ${it.b}${it.rest}`);
    }
  });
  return out.join('\n') + '\n';
}
