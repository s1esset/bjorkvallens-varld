// Engångsskript (nattkörningen): lägger in nya repliker i voice-phrases.json utan dubbletter.
// node scripts/_natt-fraser.mjs "fras 1" "fras 2" …
import fs from 'node:fs'
const p = new URL('./voice-phrases.json', import.meta.url)
const raw = fs.readFileSync(p, 'utf8')
const arr = JSON.parse(raw)
let n = 0
for (const f of process.argv.slice(2)) if (!arr.includes(f)) { arr.push(f); n++ }
fs.writeFileSync(p, JSON.stringify(arr, null, 2) + (raw.endsWith('\n') ? '\n' : ''))
console.log(`+${n} repliker (${arr.length} totalt)`)
