// The script inside an exported "animated web page". It is copied into that file as text,
// so it must stand alone: no imports, nothing from the editor. It can show, not change.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var data = JSON.parse($('sb-data').textContent);
  var root = document.documentElement, svg = $('sb-scene');
  var frames = Array.prototype.slice.call(svg.querySelectorAll('.frame'));
  var NS = 'http://www.w3.org/2000/svg';
  var FLOW = { slow: [45, 150], normal: [85, 105], fast: [150, 70] }; // speed px/s, gap px
  var COLORS = { request: '#f2924d', response: '#7cc47f', data: '#6ea8ee', event: '#b08ae6', error: '#e5645f' };
  var cur = 0, clock = 0, last = 0, tracks = [];
  var playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- packets ---
  function buildTracks() {
    tracks = [];
    var frame = frames[cur], layer = frame.querySelector('.sb-pk');
    layer.textContent = '';
    Array.prototype.forEach.call(frame.querySelectorAll('.edge'), function (g) {
      var cfg = FLOW[g.getAttribute('data-flow')], path = g.querySelector('.ln');
      if (!cfg || !path) return;
      var len = path.getTotalLength();
      if (len < 34) return;
      var kind = g.getAttribute('data-packet'), two = g.getAttribute('data-two') === '1';
      var n = Math.max(1, Math.round(len / cfg[1])), els = [];
      for (var i = 0; i < (two ? n * 2 : n); i++) {
        var r = document.createElementNS(NS, 'rect');
        r.setAttribute('class', 'pk');
        r.setAttribute('width', 9);
        r.setAttribute('height', 9);
        r.setAttribute('rx', 2.6);
        layer.appendChild(r);
        els.push(r);
      }
      var main = COLORS[kind] || COLORS.request;
      tracks.push({ path: path, len: len, speed: cfg[0], n: n, two: two, els: els, main: main, reply: kind === 'request' ? COLORS.response : main });
    });
  }
  function put(el, t, pos, color) {
    var p = t.path.getPointAtLength(pos);
    el.setAttribute('x', p.x - 4.5);
    el.setAttribute('y', p.y - 4.5);
    el.setAttribute('fill', color);
    el.setAttribute('opacity', Math.max(0, Math.min(1, Math.min(pos, t.len - pos) / 14)));
  }
  function tick(now) {
    var dt = Math.min(0.06, (now - last) / 1000 || 0);
    last = now;
    if (playing) clock += dt;
    tracks.forEach(function (t) {
      var lead = (clock * t.speed) % t.len;
      for (var i = 0; i < t.n; i++) {
        put(t.els[i], t, (lead + (i * t.len) / t.n) % t.len, t.main);
        if (t.two) put(t.els[t.n + i], t, t.len - ((lead + ((i + 0.5) * t.len) / t.n) % t.len), t.reply);
      }
    });
    requestAnimationFrame(tick);
  }

  // --- steps ---
  function idsIn(frame) {
    var seen = {};
    Array.prototype.forEach.call(frame.querySelectorAll('[data-id]'), function (el) { seen[el.getAttribute('data-id')] = 1; });
    return seen;
  }
  function caption() {
    var s = data.steps[cur], n = data.steps.length;
    $('sb-count').textContent = 'Step ' + (cur + 1) + ' / ' + n;
    $('sb-title').textContent = s.title || 'Step ' + (cur + 1);
    $('sb-text').textContent = s.text || '';
    $('sb-back').disabled = cur === 0;
    $('sb-next').disabled = cur === n - 1;
    Array.prototype.forEach.call($('sb-dots').children, function (b, i) {
      b.className = i === cur ? 'on' : i < cur ? 'done' : '';
    });
  }
  function show(i) {
    i = Math.max(0, Math.min(frames.length - 1, i));
    var before = i > cur ? idsIn(frames[cur]) : null;
    frames.forEach(function (f, j) { f.style.display = j === i ? '' : 'none'; });
    Array.prototype.forEach.call(frames[i].querySelectorAll('.pop'), function (el) { el.classList.remove('pop'); });
    if (before) {
      // whatever is new in this step drops in
      Array.prototype.forEach.call(frames[i].querySelectorAll('[data-id],[data-of]'), function (el) {
        var id = el.getAttribute('data-id') || el.getAttribute('data-of'), inner = el.firstElementChild;
        if (!before[id] && inner && inner.tagName.toLowerCase() === 'g') inner.classList.add('pop');
      });
    }
    cur = i;
    buildTracks();
    caption();
  }

  // --- pan and zoom, by moving the viewBox ---
  var vb = svg.viewBox.baseVal, home = { x: vb.x, y: vb.y, w: vb.width, h: vb.height }, grab = null;
  function toUser(ev) {
    var p = svg.createSVGPoint();
    p.x = ev.clientX;
    p.y = ev.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  svg.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    var p = toUser(ev), w = Math.max(home.w / 6, Math.min(home.w * 2, vb.width * Math.exp(ev.deltaY * 0.0015))), f = w / vb.width;
    vb.x = p.x - (p.x - vb.x) * f;
    vb.y = p.y - (p.y - vb.y) * f;
    vb.width = w;
    vb.height *= f;
  }, { passive: false });
  svg.addEventListener('pointerdown', function (ev) {
    grab = toUser(ev);
    svg.setPointerCapture(ev.pointerId);
    svg.style.cursor = 'grabbing';
  });
  svg.addEventListener('pointermove', function (ev) {
    if (!grab) return;
    var p = toUser(ev);
    vb.x -= p.x - grab.x;
    vb.y -= p.y - grab.y;
  });
  function release() { grab = null; svg.style.cursor = ''; }
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
  svg.addEventListener('dblclick', function () { vb.x = home.x; vb.y = home.y; vb.width = home.w; vb.height = home.h; });

  // --- controls ---
  data.steps.forEach(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = i + 1;
    b.title = s.title || 'Step ' + (i + 1);
    b.onclick = function () { show(i); };
    $('sb-dots').appendChild(b);
  });
  $('sb-back').onclick = function () { show(cur - 1); };
  $('sb-next').onclick = function () { show(cur + 1); };
  $('sb-play').onclick = function () { playing = !playing; this.textContent = playing ? 'Pause' : 'Play'; };
  $('sb-play').textContent = playing ? 'Pause' : 'Play';
  $('sb-theme').onclick = function () {
    var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', t);
    svg.setAttribute('data-theme', t);
  };
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowRight' || ev.key === ' ' || ev.key === 'PageDown') { ev.preventDefault(); show(cur + 1); }
    else if (ev.key === 'ArrowLeft' || ev.key === 'PageUp') { ev.preventDefault(); show(cur - 1); }
    else if (ev.key === 'Home') show(0);
    else if (ev.key === 'End') show(frames.length - 1);
  });

  show(0);
  requestAnimationFrame(tick);
})();
