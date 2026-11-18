// Rewrites the generated parts of LANGUAGE.md from the catalog, so the guide can never list a
// component or icon that does not exist. Run with: npm run docs
import { readFileSync, writeFileSync } from 'node:fs';
import { KINDS, GROUPS, BLOCK_KINDS } from '../src/catalog.js';
import { ICON_NAMES } from '../src/icons.js';

const file = new URL('../LANGUAGE.md', import.meta.url);
let md = readFileSync(file, 'utf8');

const kinds = GROUPS.filter(g => g !== 'Annotate')
  .map(g => {
    const rows = BLOCK_KINDS.filter(k => KINDS[k].group === g).map(k => {
      const { desc, tone, aka } = KINDS[k];
      return `| \`${k}\` | ${desc} | ${tone} | ${aka.map(a => `\`${a}\``).join(', ')} |`;
    });
    return `**${g}**\n\n| Kind | Draws | Default colour | Also accepted |\n| --- | --- | --- | --- |\n${rows.join('\n')}`;
  })
  .join('\n\n');

const put = (name, body) => {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(md)) throw new Error(`LANGUAGE.md has no ${name} markers`);
  md = md.replace(re, (_, a, b) => `${a}\n${body}\n${b}`);
};
put('kinds', kinds);
put('icons', ICON_NAMES.map(n => `\`${n}\``).join(', '));
put('count', `There are ${BLOCK_KINDS.length} kinds of block, in ${GROUPS.length - 1} groups.`);

writeFileSync(file, md);
console.log(`LANGUAGE.md updated: ${BLOCK_KINDS.length} kinds, ${ICON_NAMES.length} icons.`);
