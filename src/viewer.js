// Builds the standalone "animated web page": one .html file with the diagram, its steps and a
// small player. It has no editor in it, so whoever opens it can watch but not change anything.

import runtime from './viewer-runtime.js?raw';
import { esc } from './shapes.js';

const PAGE_CSS = `
:root{--paper:#f4ede2;--panel:#fbf7f0;--ink:#221f1b;--mute:#7d7468;--line:#e0d5c3;--hi:#f6d776;
  --font:'JetBrains Mono Variable','JetBrains Mono',ui-monospace,'Cascadia Mono',Consolas,monospace}
:root[data-theme="dark"]{--paper:#171512;--panel:#211e1a;--ink:#f1e9dc;--mute:#a2998b;--line:#3a352d;color-scheme:dark}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{display:grid;grid-template-rows:auto minmax(0,1fr);background:var(--paper);color:var(--ink);font:500 13px/1.45 var(--font)}
header{display:flex;align-items:center;gap:10px;padding:10px 14px;flex-wrap:wrap}
header h1{margin:0;font-size:16px;font-weight:800;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
button{font:inherit;color:inherit;cursor:pointer}
.btn{height:32px;padding:0 13px;background:var(--panel);border:1.5px solid var(--ink);border-radius:9px;box-shadow:0 2px 0 var(--ink);font-weight:600}
.btn:active{transform:translateY(2px);box-shadow:none}
.btn:disabled{opacity:.38;cursor:default;transform:none;box-shadow:0 2px 0 var(--ink)}
.btn.primary{background:var(--hi);color:#221f1b;border-color:#221f1b}
:focus-visible{outline:2px solid #2f6fde;outline-offset:2px}
main{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:12px;padding:0 14px 14px;min-height:0}
.solo main{grid-template-columns:minmax(0,1fr)}
.solo aside{display:none}
.stage,aside{background:var(--panel);border:1.5px solid var(--line);border-radius:16px;min-height:0}
.stage{background:var(--paper);overflow:hidden}
#sb-scene{width:100%;height:100%;display:block;touch-action:none;user-select:none;cursor:grab}
#sb-scene .node,#sb-scene .grab,#sb-scene .hit,#sb-scene .zh{cursor:inherit}
.sb-over,.sb-pk{pointer-events:none}
aside{display:flex;flex-direction:column;gap:12px;padding:16px 18px 14px;overflow-y:auto}
.k{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}
aside h2{margin:6px 0 0;font-size:21px;font-weight:800;line-height:1.25;text-wrap:balance}
aside p{margin:0;color:var(--mute);line-height:1.6;white-space:pre-wrap}
#sb-dots{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto;padding-top:12px}
#sb-dots button{width:26px;height:26px;padding:0;border-radius:50%;border:1.5px solid var(--line);background:var(--panel);color:var(--mute);font-size:11px;font-weight:700}
#sb-dots button.done{border-color:var(--mute)}
#sb-dots button.on{background:var(--hi);color:#221f1b;border-color:#221f1b;box-shadow:0 2px 0 #221f1b}
.nav{display:flex;gap:8px}
.nav .btn{flex:1}
.keys{font-size:11.5px;text-align:center}
@media (max-width:760px){
  html,body{height:auto}
  main{grid-template-columns:minmax(0,1fr)}
  .stage{height:58vh}
}
`;

/**
 * @param {object} o
 * @param {string} o.name      diagram name
 * @param {{title:string,text:string}[]} o.steps
 * @param {string} o.theme     'light' or 'dark'
 * @param {string} o.css       canvas styles, with the font embedded
 * @param {string} o.scene     the <svg> element holding one .frame group per step
 */
export function viewerPage({ name, steps, theme, css, scene }) {
  const solo = steps.length === 1 && !steps[0].text;
  const data = JSON.stringify({ name, steps }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)}</title>
<style>${css}${PAGE_CSS}</style>
</head>
<body${solo ? ' class="solo"' : ''}>
<header>
  <h1>${esc(name)}</h1>
  <button type="button" class="btn" id="sb-play">Pause</button>
  <button type="button" class="btn" id="sb-theme">Light / dark</button>
</header>
<main>
  <div class="stage">${scene}</div>
  <aside>
    <span class="k" id="sb-count"></span>
    <h2 id="sb-title"></h2>
    <p id="sb-text"></p>
    <div id="sb-dots"></div>
    <div class="nav">
      <button type="button" class="btn" id="sb-back">← Back</button>
      <button type="button" class="btn primary" id="sb-next">Next →</button>
    </div>
    <p class="keys">← → to step · drag to move · scroll to zoom</p>
  </aside>
</main>
<script type="application/json" id="sb-data">${data}</script>
<script>${runtime.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`;
}
