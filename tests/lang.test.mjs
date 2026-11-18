// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse, toScript } from '../src/lang.js';
import { KINDS, ALIASES, BLOCK_KINDS, ICON_SHAPES } from '../src/catalog.js';
import { ICONS } from '../src/icons.js';
import { TEMPLATES } from '../src/templates.js';

const guide = readFileSync(new URL('../LANGUAGE.md', import.meta.url), 'utf8');
const examples = [...guide.matchAll(/```scaleboard\n([\s\S]*?)```/g)].map(m => m[1]);

// what a diagram looks like once ids are ignored
const shape = doc => ({
  name: doc.name,
  steps: doc.steps,
  nodes: doc.nodes.map(n => [n.kind, n.label, n.x, n.y, n.tone ?? KINDS[n.kind].tone, n.icon ?? '', n.status, n.badge, n.meter, n.step, n.until]).sort(),
  edges: doc.edges.map(e => {
    const name = id => doc.nodes.find(n => n.id === id).label;
    return [name(e.from), name(e.to), e.label, e.arrows, e.style, e.flow, e.packet, e.bend, e.step, e.until];
  }).sort(),
  zones: doc.zones.map(z => [z.label, z.x, z.y, z.w, z.h, z.tone, z.step, z.until]).sort(),
});

test('the guide has examples', () => assert.ok(examples.length >= 10));

examples.forEach((src, i) => {
  test(`guide example ${i + 1} reads without errors or warnings`, () => {
    const r = parse(src);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.warnings, []);
    assert.ok(r.doc.nodes.length > 0);
  });
  test(`guide example ${i + 1} survives being written out and read back`, () => {
    const a = parse(src).doc, b = parse(toScript(a));
    assert.deepEqual(b.errors, []);
    assert.deepEqual(shape(b.doc), shape(a));
  });
  test(`guide example ${i + 1} never puts two blocks on the same square`, () => {
    const seen = new Set();
    for (const n of parse(src).doc.nodes.filter(n => n.kind !== 'note')) {
      const key = `${n.x},${n.y}`;
      assert.ok(!seen.has(key), `two blocks at ${key}`);
      seen.add(key);
    }
  });
});

test('every kind in the guide table exists, and every kind is documented', () => {
  const documented = [...guide.matchAll(/^\| `([a-z0-9_]+)` \| (?:A|An) /gm)].map(m => m[1]);
  const real = Object.keys(KINDS).filter(k => k !== 'zone' && k !== 'note');
  assert.deepEqual([...documented].sort(), [...real].sort());
});

test('aliases listed in the guide are accepted', () => {
  const rows = [...guide.matchAll(/^\| `([a-z0-9_]+)` \| (?:A|An) .*\| ([^|]*)\|$/gm)];
  for (const [, kind, also] of rows)
    for (const [, alias] of also.matchAll(/`([a-z0-9_]+)`/g)) {
      const r = parse(`${alias} x "X"`);
      assert.deepEqual(r.errors, [], alias);
      assert.equal(r.doc.nodes[0].kind, kind, alias);
    }
});

test('the catalog is consistent', () => {
  const reserved = ['diagram', 'step', 'zone', 'note'];
  const seen = new Set(BLOCK_KINDS);
  for (const k of BLOCK_KINDS) {
    const kind = KINDS[k];
    assert.match(kind.desc, /^An? /, `${k}: the description starts with A or An`);
    assert.ok(!kind.icon || ICONS[kind.icon], `${k}: icon "${kind.icon}" exists`);
    assert.ok(!kind.icon || ICON_SHAPES.has(kind.shape), `${k}: its shape can show an icon`);
    for (const a of kind.aka) {
      assert.ok(!seen.has(a), `"${a}" is used twice as a kind or alias`);
      assert.ok(!reserved.includes(a), `"${a}" is a keyword`);
      assert.match(a, /^[a-z_][a-z0-9_]*$/);
      seen.add(a);
    }
  }
  assert.equal(Object.keys(ALIASES).length, seen.size - BLOCK_KINDS.length);
});

test('every kind can be written and read back', () => {
  const src = BLOCK_KINDS.map((k, i) => `${k} b${i} "${KINDS[k].name}"`).join('\n');
  const r = parse(src);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.doc.nodes.map(n => n.kind), BLOCK_KINDS);
  assert.deepEqual(shape(parse(toScript(r.doc)).doc), shape(r.doc));
});

test('any block can carry any icon', () => {
  const r = parse('box a "Thing" icon star\nserver b "No icon" icon none\nbox c "Bad" icon unicorn');
  assert.deepEqual(r.errors.map(e => e.line), [3]);
  assert.match(r.errors[0].msg, /not an icon/);
  const ok = parse('box a "Thing" icon star color mint\nserver b "No icon" icon none');
  assert.deepEqual(ok.doc.nodes.map(n => n.icon), ['star', 'none']);
  assert.deepEqual(shape(parse(toScript(ok.doc)).doc), shape(ok.doc));
});

test('every icon is listed in the guide, and every listed icon exists', () => {
  const m = /<!-- icons:start -->([\s\S]*?)<!-- icons:end -->/.exec(guide);
  assert.ok(m, 'the guide has an icon list');
  const listed = [...m[1].matchAll(/`([a-z_]+)`/g)].map(x => x[1]);
  assert.deepEqual([...listed].sort(), Object.keys(ICONS).sort());
});

test('the built-in examples load and never stack two blocks', () => {
  assert.ok(TEMPLATES.length >= 6);
  for (const t of TEMPLATES) {
    const doc = t.build();
    assert.ok(doc.nodes.length > 2, t.name);
    const seen = new Set();
    for (const n of doc.nodes.filter(n => n.kind !== 'note')) {
      assert.ok(KINDS[n.kind], `${t.name}: ${n.kind}`);
      const key = `${n.x},${n.y}`;
      assert.ok(!seen.has(key), `${t.name}: two blocks at ${key}`);
      seen.add(key);
    }
    const ids = new Set(doc.nodes.map(n => n.id));
    for (const e of doc.edges) assert.ok(ids.has(e.from) && ids.has(e.to), `${t.name}: a connection points nowhere`);
  }
});

test('steps: things appear in the step they are written under', () => {
  const { doc } = parse(`step "One" : first\nserver a "A"\na -> b until 1\nstep "Two" : second\nserver b "B"\nb -> a`);
  assert.equal(doc.steps.length, 2);
  assert.deepEqual(doc.nodes.map(n => n.step), [1, 2]);
  assert.deepEqual(doc.edges.map(e => [e.step, e.until]), [[1, 1], [2, 0]]);
});

test('arrows, lists and chains', () => {
  const { doc, errors } = parse(`server a\nserver b\nserver c\nserver d\na -> b, c\nb <- d\nc <-> d\na -- d -- b`);
  assert.deepEqual(errors, []);
  const name = id => id.slice(2);
  assert.deepEqual(doc.edges.map(e => `${name(e.from)} ${e.arrows} ${name(e.to)}`), ['a end b', 'a end c', 'd end b', 'c both d', 'a none d', 'd none b']);
});

test('mistakes are reported with a line number and a hint', () => {
  const r = parse(`serverr x "X"\nserver y "Y"\ny -> z\nserver y "again"\nserver q "Q" color pink`);
  assert.deepEqual(r.errors.map(e => e.line), [1, 3, 4, 5]);
  assert.match(r.errors[0].msg, /Did you mean "server"/);
  assert.match(r.errors[1].msg, /no block called "z"/);
  assert.match(r.errors[2].msg, /used twice/);
  assert.match(r.errors[3].msg, /not a colour/);
});

test('one mistake gives one message, not a cascade', () => {
  const r = parse(['server web "Web"', 'databse db "DB"', 'web -> db', 'web -> cache'].join('\n'));
  assert.deepEqual(r.errors.map(e => e.line), [2, 4]);
  assert.match(r.errors[0].msg, /Did you mean "database"/);
  assert.doesNotMatch(r.errors[1].msg, /Did you mean/);
});

test('an unquoted label is a warning, not an error', () => {
  const r = parse(`server a\nserver b\na -> b : HTTPS`);
  assert.deepEqual(r.errors, []);
  assert.equal(r.warnings.length, 1);
  assert.equal(r.doc.edges.length, 1);
});

test('a whole AI reply can be read: only the code block counts', () => {
  const reply = ['Sure! Here is your diagram:', '', '```scaleboard', 'server a "A"', 'database d "D"', 'a -> d data', '```', '', 'Let me know if you want changes -> happy to help.'].join('\n');
  const r = parse(reply);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.stats, { blocks: 2, connections: 1, zones: 0, steps: 1 });
  // an unlabelled block works too, and the labelled one wins when there are several
  assert.equal(parse('Text\n```\nserver a "A"\n```\nmore text').doc.nodes.length, 1);
  assert.equal(parse('```bash\nnpm run dev\n```\n```scaleboard\nserver a "A"\nserver b "B"\n```').doc.nodes.length, 2);
});

test('errors inside a pasted reply point at the line in the reply', () => {
  const r = parse('Here:\n\n```scaleboard\nserver a "A"\na -> nowhere\n```');
  assert.deepEqual(r.errors.map(e => e.line), [5]);
});

test('text with odd characters survives a round trip', () => {
  const src = [
    String.raw`diagram "A \"quoted\" name"`,
    String.raw`step "Uno" : "line one\nline two"`,
    'server a "Größe #1" tag "50% → 80%"',
    'server b “Smart quotes”',
    'a → b "x: y, z"',
  ].join('\n');
  const a = parse(src);
  assert.deepEqual(a.errors, []);
  assert.equal(a.doc.name, 'A "quoted" name');
  assert.equal(a.doc.steps[0].text, 'line one\nline two');
  assert.equal(a.doc.nodes[0].badge, '50% → 80%');
  assert.equal(a.doc.nodes[1].label, 'Smart quotes');
  assert.equal(a.doc.edges.length, 1);
  assert.deepEqual(shape(parse(toScript(a.doc)).doc), shape(a.doc));
});
