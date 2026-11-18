// Everything around the canvas: library, properties panel, steps, top bar, presenting.

import { S, on, emit, commit, find, nodeById, undo, redo, canUndo, canRedo, loadDoc, blankDoc } from './state.js';
import { KINDS, GROUPS, TONES, PACKETS, STATUSES, ICON_SHAPES } from './catalog.js';
import { ICONS, ICON_NAMES } from './icons.js';
import { thumb, esc } from './shapes.js';
import { render, draw, fit, armPop } from './render.js';
import { routeCount } from './router.js';
import { setTool, zoomCentre, toWorld } from './interact.js';
import * as ops from './ops.js';
import { exportPng, exportSvg, exportPdf, exportHtml, saveJson, downloadText, fileName } from './exporter.js';
import { TEMPLATES } from './templates.js';
import { parse, toScript } from './lang.js';
import { shareUrl, isLocalOnly } from './share.js';
import GUIDE from '../LANGUAGE.md?raw';

const $ = id => document.getElementById(id);

// --- toast and hint -------------------------------------------------------
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3600);
}
function hud(msg) {
  $('hud').textContent = msg || '';
  $('hud').hidden = !msg;
}

// --- library --------------------------------------------------------------
function buildLibrary() {
  const el = $('lib'), all = Object.entries(KINDS);
  el.innerHTML =
    `<div class="ph"><span class="k">Library</span><span class="dim">drag or click</span></div>` +
    `<div class="libsearch"><input type="search" id="libSearch" placeholder="Search ${all.length} components" aria-label="Search components" autocomplete="off" spellcheck="false"></div>` +
    `<div id="libList">` +
    GROUPS.map(g => {
      const kinds = all.filter(([, k]) => k.group === g);
      const tiles = kinds
        .map(([id, k]) => {
          const find = [id, k.name, g, ...(k.aka || [])].join(' ').toLowerCase().replace(/_/g, ' ');
          return `<button type="button" class="tile" draggable="true" data-kind="${id}" data-find="${esc(find)}" title="Add ${esc(k.name)}">${thumb(id)}<span>${esc(k.name)}</span></button>`;
        })
        .join('');
      return `<details class="grp" open><summary><span>${esc(g)}</span><i>${kinds.length}</i></summary><div class="tiles">${tiles}</div></details>`;
    }).join('') +
    `</div><p class="dim pad" id="libNone" hidden>Nothing by that name. Try the plain <b>Box</b> under Flowchart &amp; generic: give it a name and pick an icon.</p>`;

  el.addEventListener('dragstart', ev => {
    const t = ev.target.closest?.('.tile');
    if (!t) return;
    ev.dataTransfer.setData('text/plain', t.dataset.kind);
    ev.dataTransfer.effectAllowed = 'copy';
  });
  el.addEventListener('click', ev => {
    const t = ev.target.closest('.tile');
    if (!t) return;
    const r = $('scene').getBoundingClientRect();
    const [x, y] = toWorld({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
    ops.addNode(t.dataset.kind, x, y);
  });

  const search = $('libSearch');
  search.addEventListener('input', () => {
    const words = search.value.toLowerCase().replace(/_/g, ' ').split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const grp of el.querySelectorAll('.grp')) {
      let any = false;
      for (const t of grp.querySelectorAll('.tile')) {
        const hit = words.every(w => t.dataset.find.includes(w));
        t.hidden = !hit;
        if (hit) { any = true; shown++; }
      }
      grp.hidden = !any;
      if (words.length) grp.open = true; // a search looks inside folded groups too
    }
    $('libNone').hidden = shown > 0;
  });
  search.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') el.querySelector('.tile:not([hidden])')?.click(); // Enter adds the first match
    if (ev.key === 'Escape') { search.value = ''; search.dispatchEvent(new Event('input')); }
  });
}

// --- properties panel -----------------------------------------------------
const field = (label, html, cls = '') => `<div class="f ${cls}"><span class="fl">${label}</span>${html}</div>`;
const textIn = (k, v, ph = '') => `<input type="text" data-k="${k}" value="${esc(v ?? '')}" placeholder="${esc(ph)}" spellcheck="false">`;
const seg = (k, v, opts) =>
  `<div class="seg sm" data-seg="${k}">${opts.map(([val, lab]) => `<button type="button" data-v="${val}" class="${val === v ? 'on' : ''}">${lab}</button>`).join('')}</div>`;
const swatches = (k, v, colors) =>
  `<div class="sw" data-seg="${k}">${Object.entries(colors)
    .map(([id, c]) => `<button type="button" data-v="${id}" class="${id === v ? 'on' : ''}" style="--c:${c}" title="${id}" aria-label="${id}"></button>`)
    .join('')}</div>`;

function whenField(o) {
  const N = S.doc.steps.length;
  if (N < 2) return '';
  const opt = (n, sel, text) => `<option value="${n}"${sel ? ' selected' : ''}>${text}</option>`;
  let from = '', to = opt(0, !o.until, 'the end');
  for (let i = 1; i <= N; i++) {
    from += opt(i, (o.step || 1) === i, `step ${i}`);
    if (i >= (o.step || 1)) to += opt(i, o.until === i, `step ${i}`);
  }
  return field('Shown', `<div class="when"><span>from</span><select data-k="step">${from}</select><span>to</span><select data-k="until">${to}</select></div>`);
}

const iconButton = (name, on) => `<button type="button" data-v="${name}" class="${on ? 'on' : ''}" title="${name.replace(/_/g, ' ')}" aria-label="${name.replace(/_/g, ' ')}"><svg viewBox="0 0 24 24">${ICONS[name]}</svg></button>`;
function iconPicker(o, k) {
  const cur = o.icon || '';
  return (
    `<div class="icons" data-seg="icon">` +
    `<button type="button" data-v="" class="${cur === '' ? 'on' : ''}" title="The usual picture for this component">auto</button>` +
    `<button type="button" data-v="none" class="${cur === 'none' ? 'on' : ''}" title="No picture">off</button>` +
    ICON_NAMES.map(n => iconButton(n, cur === n || (cur === '' && k.icon === n && false))).join('') +
    `</div>`
  );
}

const actions = (dup = true) =>
  `<div class="acts">${dup ? '<button type="button" class="btn sm" data-act="dup">Duplicate</button>' : ''}<button type="button" class="btn sm danger" data-act="del">Delete</button></div>`;

function stepCard() {
  const i = S.cur, s = S.doc.steps[i];
  return (
    `<div class="ph"><span class="k">Step ${i + 1} / ${S.doc.steps.length}</span></div>` +
    field('Title', `<input type="text" data-s="title" value="${esc(s.title)}" placeholder="What this step shows" maxlength="60">`) +
    field('Notes', `<textarea data-s="text" rows="6" placeholder="What should someone notice here? This is the text shown when you present.">${esc(s.text)}</textarea>`) +
    `<div class="tips"><h3>How it works</h3>
      <p>Drag blocks in from the library. Select one and pull its blue handle onto another to connect them.</p>
      <p>Whatever you add appears from the step you are on. Change that under <b>Shown</b>.</p>
      <dl>
        <dt>V</dt><dd>select and move</dd><dt>C</dt><dd>connect</dd><dt>P</dt><dd>send a packet</dd>
        <dt>Del</dt><dd>delete</dd><dt>Ctrl D</dt><dd>duplicate</dd><dt>Ctrl Z</dt><dd>undo</dd>
        <dt>Shift drag</dt><dd>select an area</dd>
        <dt>Arrows</dt><dd>nudge along the grid</dd><dt>[ ]</dt><dd>previous or next step</dd>
        <dt>Wheel</dt><dd>zoom</dd><dt>F</dt><dd>fit to screen</dd>
      </dl></div>`
  );
}

function renderInspector() {
  const el = $('insp');
  const ids = [...S.sel].filter(id => find(id));
  if (!ids.length) return (el.innerHTML = stepCard());
  if (ids.length > 1) {
    return (el.innerHTML =
      `<div class="ph"><span class="k">${ids.length} selected</span></div><p class="dim pad">Drag to move them together. Blocks keep the connections between them when duplicated.</p>${actions()}`);
  }
  const id = ids[0], o = find(id);
  let h = '';
  if (id[0] === 'n' && o.kind === 'note') {
    h = `<div class="ph"><span class="k">Note</span></div>` + field('Text', textIn('label', o.label)) + whenField(o) + actions();
  } else if (id[0] === 'n') {
    const k = KINDS[o.kind];
    h =
      `<div class="ph"><span class="k">${esc(k.name)}</span></div>` +
      field('Name', textIn('label', o.label, k.name)) +
      field('Colour', swatches('tone', o.tone || k.tone, Object.fromEntries(Object.entries(TONES).map(([n, t]) => [n, t[1]])))) +
      (ICON_SHAPES.has(k.shape) ? field('Icon', iconPicker(o, k)) : '') +
      field('State', `<select data-k="status">${STATUSES.map(([v, l]) => `<option value="${v}"${o.status === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`) +
      field('Tag', textIn('badge', o.badge, 'e.g. 4 active')) +
      field(
        'Load meter',
        `<div class="meter"><input type="checkbox" data-k="meterOn" ${o.meter != null ? 'checked' : ''} aria-label="Show load meter"><input type="range" data-k="meter" min="0" max="100" value="${o.meter ?? 50}" ${o.meter == null ? 'disabled' : ''}><output>${o.meter != null ? o.meter + '%' : 'off'}</output></div>`,
      ) +
      whenField(o) +
      actions();
  } else if (id[0] === 'e') {
    const a = nodeById(o.from), b = nodeById(o.to), routes = a && b ? routeCount(a, b) : 1;
    h =
      `<div class="ph"><span class="k">Connection</span></div>` +
      `<p class="pad route"><b>${esc(a?.label || '?')}</b> → <b>${esc(b?.label || '?')}</b></p>` +
      field('Label', textIn('label', o.label, 'e.g. HTTPS')) +
      field('Arrow', seg('arrows', o.arrows, [['end', 'one way'], ['both', 'both'], ['none', 'none']])) +
      field('Line', seg('style', o.style, [['solid', 'solid'], ['dashed', 'dashed']])) +
      field('Packets', seg('flow', o.flow, [['none', 'off'], ['slow', 'slow'], ['normal', 'normal'], ['fast', 'fast']])) +
      field('Packet type', swatches('packet', o.packet, PACKETS)) +
      `<div class="acts"><button type="button" class="btn sm" data-act="reverse">Reverse</button>` +
      (routes > 1 ? `<button type="button" class="btn sm" data-act="bend">${o.bend ? `Route ${o.bend} of ${routes}` : 'Route: auto'}</button>` : '') +
      `</div>` +
      whenField(o) +
      actions(false);
  } else {
    h =
      `<div class="ph"><span class="k">Zone</span></div>` +
      field('Label', textIn('label', o.label, 'e.g. Private subnet')) +
      field('Colour', swatches('tone', o.tone, Object.fromEntries(Object.entries(TONES).map(([n, t]) => [n, t[1]])))) +
      field('Size', `<div class="when"><input type="number" data-k="w" min="2" max="80" value="${o.w}" aria-label="Width"><span>by</span><input type="number" data-k="h" min="2" max="80" value="${o.h}" aria-label="Depth"></div>`) +
      `<p class="dim pad">Drag the dashed border to move the zone and everything standing on it. Drag the round handle to resize.</p>` +
      whenField(o) +
      actions();
  }
  el.innerHTML = h;
}

function wireInspector() {
  const el = $('insp');
  const target = () => (S.sel.size === 1 ? find([...S.sel][0]) : null);

  el.addEventListener('input', ev => {
    const t = ev.target;
    if (t.dataset.s) {
      S.doc.steps[S.cur][t.dataset.s] = t.value;
      if (t.dataset.s === 'title') renderSteps();
      return;
    }
    const o = target(), k = t.dataset.k;
    if (!o || !k) return;
    if (k === 'meterOn') {
      o.meter = t.checked ? 50 : null;
      commit();
      renderInspector();
    } else if (k === 'meter') {
      o.meter = +t.value;
      t.nextElementSibling.textContent = o.meter + '%';
    } else if (k === 'w' || k === 'h') o[k] = Math.max(2, Math.min(80, Math.round(+t.value) || 2));
    else if (k === 'step') {
      o.step = +t.value;
      if (o.until && o.until < o.step) o.until = o.step;
    } else if (k === 'until') o.until = +t.value;
    else o[k] = t.value;
    render();
  });
  el.addEventListener('change', ev => {
    commit();
    if (ev.target.dataset.k === 'step' || ev.target.dataset.k === 'until' || ev.target.dataset.k === 'status') renderInspector();
    updateLegend();
  });
  el.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    const o = target(), group = b.closest('[data-seg]');
    if (group && o) {
      if (group.dataset.seg === 'icon' && !b.dataset.v) delete o.icon; // "auto" goes back to the component's own picture
      else o[group.dataset.seg] = b.dataset.v;
      commit();
      render();
      renderInspector();
      return updateLegend();
    }
    const act = b.dataset.act;
    if (act === 'del') ops.removeSelected();
    else if (act === 'dup') ops.duplicateSelected();
    else if (act === 'reverse' && o) {
      [o.from, o.to] = [o.to, o.from];
      o.bend = 0;
      commit();
      render();
      renderInspector();
    } else if (act === 'bend' && o) {
      o.bend = (o.bend + 1) % (routeCount(nodeById(o.from), nodeById(o.to)) + 1);
      commit();
      render();
      renderInspector();
    }
  });
}

// --- steps ----------------------------------------------------------------
function renderSteps() {
  const { steps } = S.doc;
  $('steps').innerHTML =
    `<span class="k">Steps</span><div class="chips">` +
    steps
      .map((s, i) => `<button type="button" class="chip${i === S.cur ? ' on' : ''}${i < S.cur ? ' done' : ''}" data-i="${i}"><b>${i + 1}</b><span>${esc(s.title || 'Step ' + (i + 1))}</span></button>`)
      .join('<i></i>') +
    `</div><button type="button" class="btn sm" data-act="add" title="Add a step after this one">+ Step</button>` +
    (steps.length > 1 ? `<button type="button" class="btn sm" data-act="del" title="Delete the current step">Remove</button>` : '');
}

function renderPresent() {
  const i = S.cur, N = S.doc.steps.length, s = S.doc.steps[i];
  $('pcount').textContent = `Step ${i + 1} / ${N}`;
  $('ptitle').textContent = s.title || `Step ${i + 1}`;
  $('ptext').textContent = s.text;
  $('ptext').hidden = !s.text;
  $('pback').disabled = i === 0;
  $('pnext').disabled = i === N - 1;
  $('pdots').innerHTML = S.doc.steps.map((_, j) => `<button type="button" data-i="${j}" class="${j === i ? 'on' : j < i ? 'done' : ''}" aria-label="Step ${j + 1}">${j + 1}</button>`).join('');
}

function setPresenting(yes) {
  if (yes === S.presenting || (S.readonly && !yes)) return;
  S.presenting = yes;
  document.body.classList.toggle('presenting', yes);
  document.body.classList.toggle('solo', S.doc.steps.length === 1 && !S.doc.steps[0].text);
  $('present').textContent = yes ? 'Stop presenting' : 'Present';
  if (yes) {
    S.sel.clear();
    setTool('select');
    S.cur = 0;
    armPop();
    renderPresent();
  } else {
    renderSteps();
    renderInspector();
  }
  hud('');
  // the stage changes size when the side panels go away, so fit after layout settles
  requestAnimationFrame(() => fit());
}

// --- legend, top bar ------------------------------------------------------
function updateLegend() {
  const kinds = new Set(S.doc.edges.filter(e => e.flow !== 'none').flatMap(e => (e.arrows !== 'end' && e.packet === 'request' ? ['request', 'response'] : [e.packet])));
  $('legend').innerHTML = Object.keys(PACKETS)
    .filter(k => kinds.has(k))
    .map(k => `<span><i style="background:${PACKETS[k]}"></i>${k}</span>`)
    .join('');
  $('legend').hidden = !kinds.size;
}

function syncBar() {
  document.querySelectorAll('#tools button').forEach(b => b.classList.toggle('on', b.dataset.tool === S.tool));
  $('undo').disabled = !canUndo();
  $('redo').disabled = !canRedo();
  $('flow').textContent = S.playing ? 'Pause' : 'Play';
  if (document.activeElement !== $('docName')) $('docName').value = S.doc.name;
  $('docTitle').textContent = S.doc.name;
  document.title = `${S.doc.name} · Scaleboard`;
}

export function setTheme(theme) {
  S.theme = theme;
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('.scene').forEach(el => (el.dataset.theme = theme));
  try { localStorage.setItem('scaleboard:theme', theme); } catch (e) { /* ignore */ }
}

const closeMenus = () => document.querySelectorAll('details.menu[open]').forEach(d => (d.open = false));

async function guarded(label, fn) {
  try {
    await fn();
    toast(label);
  } catch (e) {
    toast(`That did not work: ${e.message}`);
  }
}

/** Replace the board with a diagram and show its last step, where everything is visible. */
function openDoc(d) {
  loadDoc(d);
  S.cur = S.doc.steps.length - 1;
  emit('step');
  fit();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // older browsers, or a page that is not allowed to use the clipboard
    const t = document.createElement('textarea');
    t.value = text;
    (document.querySelector('dialog[open]') || document.body).appendChild(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { /* nothing more to try */ }
    t.remove();
    return ok;
  }
}
/** Buttons inside a dialog confirm on themselves, because a toast would sit behind the dialog. */
function flash(btn, text) {
  const was = btn.dataset.label || btn.textContent;
  btn.dataset.label = was;
  btn.textContent = text;
  clearTimeout(btn._t);
  btn._t = setTimeout(() => (btn.textContent = was), 1600);
}

// --- diagram code ---------------------------------------------------------
function checkCode(note = '') {
  const text = $('codeText').value, box = $('codeMsg');
  $('codeErrCopy').hidden = true;
  if (!text.trim()) {
    box.innerHTML = '<p class="dim">Paste or type a diagram to begin.</p>';
    $('codeApply').disabled = true;
    return null;
  }
  const r = parse(text), row = (cls, m) => `<li class="${cls}">Line ${m.line}: ${esc(m.msg)}</li>`;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (r.errors.length) {
    box.innerHTML = (note ? `<p class="err">${esc(note)}</p>` : '') + `<ul>${r.errors.map(m => row('err', m)).join('')}</ul>`;
    $('codeErrCopy').hidden = false;
  } else
    box.innerHTML =
      `<p class="ok">Ready: ${plural(r.stats.blocks, 'block')}, ${plural(r.stats.connections, 'connection')}${r.stats.steps > 1 ? `, ${r.stats.steps} steps` : ''}.</p>` +
      (r.warnings.length ? `<ul>${r.warnings.map(m => row('warn', m)).join('')}</ul>` : '');
  $('codeApply').disabled = r.errors.length > 0;
  return r;
}

function wireDialogs() {
  document.querySelectorAll('dialog').forEach(d => {
    d.addEventListener('click', ev => {
      if (ev.target === d || ev.target.closest('[data-close]')) d.close(); // the backdrop counts as the dialog itself
    });
  });

  let timer;
  $('codeText').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(checkCode, 250); });
  $('openCode').onclick = () => {
    closeMenus();
    $('codeText').value = toScript(S.doc);
    checkCode();
    $('codeDlg').showModal();
  };
  $('codeApply').onclick = () => {
    const r = checkCode();
    if (!r || r.errors.length) return;
    openDoc(r.doc);
    $('codeDlg').close();
    toast('Diagram applied. Ctrl+Z brings the previous one back.');
  };
  $('codeCopy').onclick = async ev => { const b = ev.currentTarget; flash(b, (await copyText($('codeText').value)) ? 'Copied' : 'Select and copy by hand'); };
  $('codeSave').onclick = () => downloadText($('codeText').value, fileName('sb'));
  $('codeOpen').onclick = () => $('codeFile').click();
  $('codeFile').addEventListener('change', async ev => {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    $('codeText').value = await f.text();
    checkCode();
  });
  $('codeErrCopy').onclick = async ev => {
    const b = ev.currentTarget, r = parse($('codeText').value);
    const list = r.errors.map(m => `Line ${m.line}: ${m.msg}`).join('\n');
    flash(b, (await copyText(`This Scaleboard diagram has problems. Please fix them and send the whole diagram again.\n\n${list}`)) ? 'Copied' : 'Could not copy');
  };
  $('guideCopy').onclick = async ev => { const b = ev.currentTarget; flash(b, (await copyText(GUIDE)) ? 'Copied' : 'Could not copy'); };
  $('guideSave').onclick = () => downloadText(GUIDE, 'LANGUAGE.md', 'text/markdown');

  $('shareLink').onclick = async () => {
    closeMenus();
    try {
      $('shareUrl').value = await shareUrl(S.doc);
      $('shareLocal').hidden = !isLocalOnly();
      $('shareDlg').showModal();
      $('shareUrl').select();
    } catch (e) {
      toast(`Could not make a link: ${e.message}`);
    }
  };
  $('shareCopy').onclick = async ev => { const b = ev.currentTarget; flash(b, (await copyText($('shareUrl').value)) ? 'Copied' : 'Select and copy by hand'); };
}

/**
 * Bring a file onto the board: diagram code (.sb, .txt, or a saved AI reply) or a saved .json.
 * If the code has mistakes, it opens in the code box with each one listed, instead of failing silently.
 */
async function importFile(f) {
  if (!f) return;
  let text;
  try {
    text = await f.text();
  } catch (e) {
    return toast(`Could not read ${f.name}.`);
  }
  if (/\.json$/i.test(f.name) || text.trimStart().startsWith('{')) {
    try {
      openDoc(JSON.parse(text));
      toast(`Opened ${f.name}.`);
    } catch (e) {
      toast(`Could not open ${f.name}: ${e.message}.`);
    }
    return;
  }
  const r = parse(text), plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (r.errors.length) {
    $('codeText').value = text;
    checkCode(`${f.name} has ${plural(r.errors.length, 'problem')}. Fix the lines below, or send them back to whoever wrote it.`);
    $('codeDlg').showModal();
    return;
  }
  openDoc(r.doc);
  toast(`Imported ${f.name}: ${plural(r.stats.blocks, 'block')}, ${plural(r.stats.connections, 'connection')}${r.stats.steps > 1 ? `, ${r.stats.steps} steps` : ''}. Ctrl+Z brings the previous diagram back.`);
}

/** Opened from a share link: show the diagram and nothing that could change it. */
export function enterViewOnly() {
  S.readonly = true;
  document.body.classList.add('viewonly');
  document.querySelector('.pcard .keys').textContent = '← → to step · drag to move · scroll to zoom';
  setPresenting(true);
}

function wireBar() {
  $('tools').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (b) setTool(b.dataset.tool);
  });
  $('undo').onclick = undo;
  $('redo').onclick = redo;
  $('flow').onclick = () => { S.playing = !S.playing; syncBar(); };
  $('theme').onclick = () => setTheme(S.theme === 'dark' ? 'light' : 'dark');
  $('present').onclick = () => setPresenting(!S.presenting);
  $('pexit').onclick = () => setPresenting(false);
  $('pback').onclick = () => ops.gotoStep(S.cur - 1);
  $('pnext').onclick = () => ops.gotoStep(S.cur + 1);
  $('pdots').addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) ops.gotoStep(+b.dataset.i); });
  $('zin').onclick = () => zoomCentre(1.25);
  $('zout').onclick = () => zoomCentre(1 / 1.25);
  $('zfit').onclick = () => fit();

  const name = $('docName');
  name.addEventListener('input', () => { S.doc.name = name.value || 'Untitled diagram'; document.title = `${S.doc.name} · Scaleboard`; });
  name.addEventListener('change', () => commit());

  $('exList').innerHTML = TEMPLATES.map(t => `<button type="button" data-t="${t.id}">${esc(t.name)}<small>${esc(t.hint)}</small></button>`).join('');
  $('exList').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    closeMenus();
    openDoc(TEMPLATES.find(t => t.id === b.dataset.t).build());
    toast('Example loaded. Ctrl+Z brings your diagram back.');
  });

  $('tidy').onclick = () => {
    closeMenus();
    if (!ops.tidy()) return toast('There is nothing to arrange yet.');
    fit();
    toast('Layout tidied. Ctrl+Z puts everything back.');
  };
  $('newDoc').onclick = () => { closeMenus(); loadDoc(blankDoc()); fit(); toast('New diagram. Ctrl+Z brings the last one back.'); };
  $('saveJson').onclick = () => { closeMenus(); guarded('Saved. Open that file later to keep editing.', saveJson); };
  $('exportPng').onclick = () => { closeMenus(); guarded('PNG saved.', exportPng); };
  $('exportSvg').onclick = () => { closeMenus(); guarded('SVG saved.', exportSvg); };
  $('exportPdf').onclick = () => { closeMenus(); guarded('PDF saved: one page per step.', exportPdf); };
  $('exportHtml').onclick = () => { closeMenus(); guarded('Web page saved. It opens in any browser and has no editing tools.', exportHtml); };
  $('openJson').onclick = () => { closeMenus(); $('file').click(); };
  $('file').addEventListener('change', async ev => {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    importFile(f);
  });

  // dropping a file anywhere on the page imports it (and stops the browser from navigating to it)
  const hasFile = ev => [...(ev.dataTransfer?.types || [])].includes('Files');
  let dropTimer;
  addEventListener('dragover', ev => {
    if (!hasFile(ev)) return;
    ev.preventDefault();
    const allowed = !S.readonly && !document.querySelector('dialog[open]');
    ev.dataTransfer.dropEffect = allowed ? 'copy' : 'none';
    document.body.classList.toggle('dropping', allowed);
    clearTimeout(dropTimer);
    dropTimer = setTimeout(() => document.body.classList.remove('dropping'), 180);
  });
  addEventListener('drop', ev => {
    if (!hasFile(ev)) return;
    ev.preventDefault();
    document.body.classList.remove('dropping');
    if (!S.readonly && !document.querySelector('dialog[open]')) importFile(ev.dataTransfer.files[0]);
  });

  document.addEventListener('click', ev => {
    document.querySelectorAll('details.menu[open]').forEach(d => { if (!d.contains(ev.target)) d.open = false; });
  });

  $('steps').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.i != null) ops.gotoStep(+b.dataset.i);
    else if (b.dataset.act === 'add') ops.addStep();
    else if (b.dataset.act === 'del') ops.deleteStep();
  });
}

export function initUI() {
  buildLibrary();
  wireInspector();
  wireBar();
  wireDialogs();
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

  on((what, data) => {
    if (what === 'toast') return toast(data);
    if (what === 'hud') return hud(data);
    if (what === 'present') return setPresenting(data);
    if (what === 'add') return ops.addNode(data.kind, data.x, data.y);
    if (what === 'focus-label') {
      const input = $('insp').querySelector('[data-k="label"]');
      if (input) { input.focus(); input.select(); }
      return;
    }
    if (what === 'sel') renderInspector();
    if (what === 'step' || what === 'load') {
      renderSteps();
      if (S.presenting) renderPresent();
      if (!S.sel.size || what === 'load') renderInspector();
      else renderInspector();
    }
    if (what === 'load') draw();
    // a drag on the canvas can change what the panel shows (a zone's size), so refresh it unless someone is typing there
    if (what === 'doc' && !$('insp').contains(document.activeElement)) renderInspector();
    if (what === 'load' || what === 'doc') updateLegend();
    syncBar();
  });

  renderSteps();
  renderInspector();
  updateLegend();
  syncBar();
}
