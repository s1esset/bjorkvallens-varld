// Hjälpare under poleringsomgången: läser `npm run check --game <id>`-utdata och
// lägger de saknade replikerna i scripts/voice-phrases.json (hela strängen hämtas
// ur spelets källkod, eftersom check-utdata trunkerar vid 48 tecken).
//   node scripts/_addphrases.mjs <id>
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const id = process.argv[2]
if (!id) {
  console.error('usage: node scripts/_addphrases.mjs <id>')
  process.exit(2)
}

let out = ''
try {
  out = execSync(`node scripts/check.mjs --game ${id}`, { encoding: 'utf8' })
} catch (e) {
  out = (e.stdout || '') + (e.stderr || '')
}

const frags = [...out.matchAll(/repliken "(.*?)…" saknas/g)].map((m) => m[1])
if (!frags.length) {
  console.log('inga saknade repliker')
  process.exit(0)
}

const src = readFileSync(`src/games/${id}/index.js`, 'utf8')
// Alla enkel-/dubbelciterade strängliteraler i källan.
const lits = []
for (const re of [/'((?:[^'\\\n]|\\.)*)'/g, /"((?:[^"\\\n]|\\.)*)"/g]) {
  for (const m of src.matchAll(re)) lits.push(m[1].replace(/\\(['"\\])/g, '$1'))
}

const path = 'scripts/voice-phrases.json'
const data = JSON.parse(readFileSync(path, 'utf8'))
let added = 0
const missing = []
for (const f of frags) {
  const full = lits.find((l) => l.startsWith(f))
  if (!full) {
    missing.push(f)
    continue
  }
  if (!data.includes(full)) {
    data.push(full)
    added++
  }
}
writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
console.log(`+${added} repliker` + (missing.length ? ` · hittades ej i källan: ${JSON.stringify(missing)}` : ''))
