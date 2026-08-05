// Bockar av ett spel i poleringsrundan: sätter polerad-kolumnen i
// docs/games/README.md och status i docs/POLERINGSRUNDA.md till ✅.
// Kör: node scripts/_polerad.mjs <id> [kvalitet]
//   kvalitet: valfri ny kvalitet-emoji (✅ eller 🔧). Utelämnad = oförändrad.
import { readFileSync, writeFileSync } from 'node:fs';

const [id, kvalitet] = process.argv.slice(2);
if (!id) {
  console.error('användning: node scripts/_polerad.mjs <id> [✅|🔧]');
  process.exit(1);
}

let touched = 0;

// 1) indexet: | # | Titel | `id` | input | kvalitet | polerad |
{
  const p = 'docs/games/README.md';
  const lines = readFileSync(p, 'utf8').split('\n');
  const out = lines.map((line) => {
    if (!line.includes(`\`${id}\``)) return line;
    const m = line.match(/^(\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*)(⬜|📝|🔧|✅)(\s*\|\s*)(⬜|📝|🔧|✅)(\s*\|\s*)$/u);
    if (!m) return line;
    touched++;
    return `${m[1]}${kvalitet || m[2]}${m[3]}✅${m[5]}`;
  });
  writeFileSync(p, out.join('\n'));
}

// 2) poleringsrundans kö: | # | `id` | skuld | status |
{
  const p = 'docs/POLERINGSRUNDA.md';
  const lines = readFileSync(p, 'utf8').split('\n');
  const out = lines.map((line) => {
    if (!line.includes(`\`${id}\``)) return line;
    const m = line.match(/^(\|[^|]*\|[^|]*\|[^|]*\|\s*)(⬜|📝|🔧|✅)(\s*\|\s*)$/u);
    if (!m) return line;
    touched++;
    return `${m[1]}✅${m[3]}`;
  });
  writeFileSync(p, out.join('\n'));
}

console.log(touched === 2 ? `✓ ${id} bockad av (index + kö)` : `⚠ ${id}: ${touched}/2 rader hittade`);
