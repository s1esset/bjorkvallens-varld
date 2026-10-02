// Lägger en rad sist i §4 (före "## 5.") i docs/games/<id>.md. node scripts/_natt-doc4.mjs <id> "<rad>"
import fs from 'node:fs'
const [id, rad] = process.argv.slice(2)
const p = `docs/games/${id}.md`
let s = fs.readFileSync(p, 'utf8')
const eol = s.includes('\r\n') ? '\r\n' : '\n'
const i = s.search(/^## 5\./m)
if (i < 0) { console.error('ingen ## 5.'); process.exit(1) }
let fore = s.slice(0, i).replace(/\s+$/, '')
s = fore + eol + rad + eol + eol + s.slice(i)
fs.writeFileSync(p, s)
console.log('ok', id)
