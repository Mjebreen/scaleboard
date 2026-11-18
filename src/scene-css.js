// Styles for everything drawn on the canvas. Kept as a string so the same rules ship inside
// exported SVG and PNG files and the export looks exactly like the screen.

export const SCENE_CSS = `
.scene{--paper:#f4ede2;--ink:#221f1b;--bink:#2b2723;--pillbg:#fffaf1;--grid:#dccfb9;--mute:#8b8174;--acc:#2f6fde;
  font-family:'JetBrains Mono Variable','JetBrains Mono',ui-monospace,'Cascadia Mono',Consolas,monospace}
.scene[data-theme="dark"]{--paper:#171512;--ink:#f1e9dc;--pillbg:#2b2722;--grid:#3a352d;--mute:#a59c8e;--acc:#7fb0ff}
.bg{fill:var(--paper)}
.gridl{fill:none;stroke:var(--grid);stroke-width:1}
.sh{fill:#2a1c08;opacity:.2}
.scene[data-theme="dark"] .sh{fill:#000;opacity:.45}
.ft{fill:var(--t)}.fl{fill:var(--l)}.fr{fill:var(--r)}
.gl{stop-color:var(--l)}.gr{stop-color:var(--r)}
.seam{fill:none;stroke:#fff;stroke-opacity:.62;stroke-width:1.5;stroke-linecap:round}
.ol{fill:none;stroke:var(--bink);stroke-width:2.2;stroke-linejoin:round}
.ic{fill:none;stroke:var(--bink);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.lbl{font-weight:700;fill:var(--bink);text-anchor:middle}
.brick{fill:none;stroke:var(--bink);stroke-opacity:.34;stroke-width:1.3;stroke-linecap:round}
.port{fill:var(--bink);fill-opacity:.72}
.led{fill:#7cc47f;stroke:var(--bink);stroke-width:.8}
.dv-under{fill:#b9b1a4;stroke:var(--bink);stroke-width:1.8;stroke-linejoin:round}
.dv-base{fill:#ece6dc;stroke:var(--bink);stroke-width:1.8;stroke-linejoin:round}
.dv-keys{fill:#fbf8f2;stroke:var(--bink);stroke-opacity:.45;stroke-width:1}
.dv-frame{fill:#57514a;stroke:var(--bink);stroke-width:1.8;stroke-linejoin:round}
.dv-glass{fill:#fdfbf7}
.dv-a{fill:#cdbcee}.dv-b{fill:#d9d2c6}
.pawn,.pawnh{stroke:var(--bink);stroke-width:1.6}
.pawn.big{fill:var(--l);stroke-width:2}
.pawn.big+.pawnh{stroke-width:2}
.cl-o *{fill:var(--bink);stroke:var(--bink);stroke-width:4.4;stroke-linejoin:round}
.cl-l *{fill:var(--l)}
.cl-t *{fill:var(--t)}
.tw{fill:var(--l);stroke:var(--bink);stroke-width:2;stroke-linejoin:round}
.tw-x{fill:none;stroke:var(--bink);stroke-width:1.3;stroke-opacity:.55;stroke-linecap:round}
.tw-d{fill:var(--t);stroke:var(--bink);stroke-width:2}
.marquee{fill:var(--acc);fill-opacity:.1;stroke:var(--acc);stroke-width:1.5;stroke-dasharray:5 4}
.pawnh{fill:#fffaf1}
.node{cursor:grab}
.node:hover .ol{stroke-width:2.9}
.node:hover .cl-o *{stroke-width:5.6}
.st-faded{opacity:.42}
.st-down .ol{stroke-dasharray:6 5}
.ghost{opacity:.2}
.pill .ps{fill:var(--ink)}
.pill .pb{fill:var(--pillbg);stroke:var(--ink);stroke-width:1.6}
.pill text{font-size:11.5px;font-weight:600;fill:var(--ink)}
.pill .mt{fill:var(--mute);fill-opacity:.3}
.pill.hot .pb{fill:#fde3e0;stroke:#b8403a}
.pill.hot .ps{fill:#b8403a}
.pill.hot text{fill:#a2302b}
#lover{pointer-events:none}
#lover .grab{pointer-events:auto;cursor:grab}
#lpackets,#ltrace,#lprev{pointer-events:none}
.sel .pill .pb{stroke:var(--acc)}
.sel .pill .ps{fill:var(--acc)}
.edge .ln{fill:none;stroke:var(--ink);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.edge.dashed .ln{stroke-dasharray:7 6}
.edge .hd{fill:var(--ink);stroke:var(--ink);stroke-width:1.5;stroke-linejoin:round}
.edge .hit{fill:none;stroke:transparent;stroke-width:16;pointer-events:stroke;cursor:pointer}
.edge.sel .ln{stroke:var(--acc);stroke-width:2.6}
.edge.sel .hd{fill:var(--acc);stroke:var(--acc)}
.pk{stroke:var(--ink);stroke-width:1.4}
.zone .zf{fill:var(--t);fill-opacity:.34;stroke:var(--r);stroke-width:1.8;stroke-dasharray:8 6;stroke-linejoin:round;pointer-events:none}
.zone .zh{fill:none;stroke:transparent;stroke-width:16;pointer-events:stroke;cursor:grab}
.zone.sel .zf{stroke:var(--acc)}
.selring{fill:none;stroke:var(--acc);stroke-width:2;stroke-dasharray:6 5;stroke-linejoin:round}
.hlink{cursor:crosshair}
.hlink circle{fill:var(--acc);stroke:var(--paper);stroke-width:2}
.hlink path{fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.hsize{fill:var(--paper);stroke:var(--acc);stroke-width:2.5;cursor:nwse-resize}
.linkprev{fill:none;stroke:var(--acc);stroke-width:2.2;stroke-dasharray:7 6;stroke-linecap:round}
.tgt .ol{stroke:var(--acc);stroke-width:3.4}
.scene[data-tool="connect"] .node{cursor:crosshair}
.scene[data-tool="trace"] .node{cursor:pointer}
.trdot{fill:#f2924d;stroke:var(--ink);stroke-width:2}
.trdot.back{fill:#7cc47f}
.trhalo{fill:none;stroke:#f2924d;stroke-width:2;opacity:.5}
.trpulse{fill:none;stroke:var(--acc);stroke-width:3;transform-box:fill-box;transform-origin:center;animation:trp .7s ease-out both}
@keyframes trp{from{transform:scale(.4);opacity:.9}to{transform:scale(3.4);opacity:0}}
.pop{animation:pop .5s cubic-bezier(.2,1.5,.4,1) both}
@keyframes pop{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.pop,.trpulse{animation:none}}
.thumb .sh{display:none}
`;
