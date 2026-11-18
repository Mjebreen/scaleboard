import '@fontsource-variable/jetbrains-mono/wght.css';
import './style.css';
import { SCENE_CSS } from './scene-css.js';
import { S, loadSaved, loadDoc, emit } from './state.js';
import { initScene, applyView, fit } from './render.js';
import { initInteract } from './interact.js';
import { initUI, enterViewOnly } from './ui.js';
import { readShare } from './share.js';
import { TEMPLATES } from './templates.js';

document.getElementById('sceneCss').textContent = SCENE_CSS;

initScene();
initInteract();
// A share link carries a diagram after the #. It opens view-only and leaves the visitor's own work alone.
let shared = false, damaged = false;
try {
  const doc = await readShare();
  if (doc) {
    S.readonly = true;
    loadDoc(doc, { fresh: true });
    shared = true;
  }
} catch (e) {
  S.readonly = false;
  damaged = true;
}
if (!shared) {
  if (!loadSaved()) loadDoc(TEMPLATES[0].build(), { fresh: true });
  S.cur = S.doc.steps.length - 1; // open on the finished picture, not the first step
}
initUI();
if (shared) enterViewOnly();
if (damaged) emit('toast', 'That share link is damaged or incomplete, so it could not be opened.');
addEventListener('hashchange', () => location.reload());

// Text widths depend on the font, so fit once it has arrived (or straight away if it is slow).
const first = () => fit();
first();
document.fonts?.ready.then(first);

let lastW = 0;
new ResizeObserver(([entry]) => {
  const w = Math.round(entry.contentRect.width);
  if (lastW && Math.abs(w - lastW) > 40) fit();
  else applyView();
  lastW = w;
}).observe(document.getElementById('stage'));
