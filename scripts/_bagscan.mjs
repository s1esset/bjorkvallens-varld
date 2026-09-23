// Statisk sökning (V23): `Graphics.arc()` som INLEDER en väg drar ett streck från origo till
// bågens start — Pixi v8 lägger in (0,0) som första punkt när ingen moveTo finns. Hittat i
// kugghjulens Elvira (håret blev en gul kil över ansiktet, munnen ett streck ner i klänningen).
// Listar varje `x.arc(` som börjar ett nytt uttryck utan en moveTo/lineTo framför sig i samma
// kedja. Kandidater, inte fynd — en arc direkt efter en lineTo på raden ovan är ofarlig.
// ⚠️ Mekanismen ovan är FEL i detaljen (rättat 2026-09-23): en färsk Graphics ritar rent; det
// är pennan efter fill()/stroke() och kedjade bågar som drar strecket. Av 88 kandidater var 32
// äkta, och två äkta (tårtbitar med uttryckligt moveTo) ska INTE rättas. Mät med
// `_bagprobe.mjs` (körtid) — det här är bara en läslista för det sonden inte når.
//   node scripts/_bagscan.mjs
import fs from 'node:fs'
import path from 'node:path'

const traffar = []
const vandra = (d) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) vandra(p)
    else if (p.endsWith('.js')) skanna(p)
  }
}
const skanna = (p) => {
  const L = fs.readFileSync(p, 'utf8').split(/\r?\n/)
  L.forEach((l, i) => {
    const t = l.trim()
    if (t.startsWith('//')) return
    if (!/(^|[\s;(,])[A-Za-z_$][\w$.]*\.arc\(/.test(l)) return
    if (/(moveTo|lineTo)\([^)]*\)\s*\.arc\(/.test(l)) return
    const fore = (L[i - 1] || '').trim()
    // Föregående sats slutade med en öppen väg (lineTo/moveTo utan fill/stroke) → ofarlig.
    const oppen = /\.(moveTo|lineTo|quadraticCurveTo|bezierCurveTo|arc)\([^)]*\)\s*$/.test(fore)
    traffar.push({ fil: p.split(path.sep).join('/').replace(/.*src\//, 'src/'), rad: i + 1, oppen, kod: t.slice(0, 100) })
  })
}
vandra('src')
const riktiga = traffar.filter((t) => !t.oppen)
for (const t of riktiga) console.log(`${t.fil}:${t.rad}  ${t.kod}`)
console.log(`\n${riktiga.length} kandidater i ${new Set(riktiga.map((t) => t.fil)).size} filer (${traffar.length - riktiga.length} till efter en öppen väg, troligen ofarliga)`)
