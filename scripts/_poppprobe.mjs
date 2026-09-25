// Mäter om en Mjukkropp kan POPPA — växa från korn till popcorn (×4) på en bråkdel av en
// sekund — utan att vända sig ut och in. Premissprov inför `popcornkalaset` (docs/IDEER.md
// post 6), rena tal, utan webbläsare (som _mjukprobe).
//
//   node scripts/_poppprobe.mjs
//
// Uppmätt 2026-09-25: en popp över ≤ 8 fasta steg vänder ringen ut och in FÖR GOTT
// (fyllnad 0,03–0,08 även 90 steg senare, noll NaN, alltså noll konsolfel i ett spel),
// 9 steg är på gränsen (0,87), 10 steg håller — men BARA för 12 punkter och överskjut 1,15.
// Över hela spannet (10–16 punkter × överskjut 1–1,3) håller två recept: 18 steg (0,3 s)
// från korn ×0,25, eller 10–12 steg om mjukkroppen startar på ×0,35 (kornet är en egen stel
// bild som försvinner i smällen). Fler lösarvarv hjälper INTE (iter 6/10/14 → 0,08/0,06/0,08).
// Simuleringen kostar ~3,5 µs per kropp och bildruta; det som kostar i spelet är
// omritningen, och den mäts bara i en webbläsare.
//
// Kontrollarmarna först: en kropp som inte växer ska vara hel, och detektorn ska SE den
// kända trasiga poppen — annars mäter sonden ingenting.
import { Mjukkropp } from '../src/lib/mjukkropp.js'

let fel = 0
function ok(namn, villkor, detalj = '') {
  if (villkor) console.log(`  ✓ ${namn}${detalj ? ' · ' + detalj : ''}`)
  else { console.log(`  ✗ ${namn}${detalj ? ' · ' + detalj : ''}`); fel++ }
}

function sjalvskar(pts, n) {
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue
      const a = pts[i], b = pts[(i + 1) % n], c = pts[j], d = pts[(j + 1) % n]
      if (o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0) return true
    }
  }
  return false
}

// Byggd i FULL storlek (`skala()` räknar alltid från byggmåtten), sätter sig som korn på
// skala(0.25), växer med ease-out till överskjutet och landar på 1 över 30 steg.
function poppa({ steg, overskjut = 1.15, punkter = 12, iter = 6, vaxer = true, start = 0.25 }) {
  const m = new Mjukkropp({ x: 0, y: 0, w: 40, h: 36, punkter, grav: 0, iter })
  if (vaxer) m.skala(start)
  for (let i = 0; i < 30; i++) m.steg(1)
  let trasigaSteg = 0, nan = false
  for (let f = 0; f < steg + 30; f++) {
    if (vaxer) {
      const k = f < steg
        ? start + (overskjut - start) * (1 - (1 - (f + 1) / steg) ** 3)
        : overskjut + (1 - overskjut) * Math.min(1, (f - steg) / 30)
      m.skala(k)
    }
    m.steg(1)
    if (m.pts.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) nan = true
    if (sjalvskar(m.pts, m.n)) trasigaSteg++
  }
  for (let i = 0; i < 90; i++) m.steg(1) // får den tillbaka sin form av sig själv?
  return { fyllnad: m.fyllnad(), trasigaSteg, nan }
}
const visa = (r) => `fyllnad ${r.fyllnad.toFixed(3)} · ${r.trasigaSteg} steg självskurna${r.nan ? ' · NaN' : ''}`

console.log('\nkontrollarmar')
{
  const hel = poppa({ steg: 12, vaxer: false })
  ok('en kropp som inte växer är hel', hel.fyllnad > 0.99 && hel.trasigaSteg === 0, visa(hel))
  const trasig = poppa({ steg: 6 })
  ok('detektorn SER den kända trasiga poppen (6 steg)', trasig.fyllnad < 0.5 && trasig.trasigaSteg > 0, visa(trasig))
}

console.log('\ngränsen: hur fort får en popp gå? (12 punkter, överskjut 1,15)')
for (const steg of [6, 7, 8, 9, 10, 11, 12, 18]) {
  const r = poppa({ steg })
  console.log(`  ${String(steg).padStart(2)} steg (${(steg / 60).toFixed(2)} s): ${visa(r)}`)
}

console.log('\nfler lösarvarv räddar INTE en för snabb popp (6 steg)')
for (const iter of [6, 10, 14]) console.log(`  iter ${String(iter).padStart(2)}: ${visa(poppa({ steg: 6, iter }))}`)

console.log('\nrecepten: hela över punkter (10–16) × överskjut (1–1,3)?')
// Ett recept som bara prövats på 12 punkter och 1,15 ljuger: 12 steg från korn ×0,25 höll där
// men föll på 14/1,3 · 16/1,15 · 16/1,3. Det som avgör är tillväxten per steg och KANT —
// fler punkter (kortare kanter) och större överskjut faller först, en större start räddar.
for (const [namn, opt, ska] of [
  ['12 steg från ×0,25 (känt otillräckligt)', { steg: 12, start: 0.25 }, false],
  ['18 steg (0,3 s) från ×0,25', { steg: 18, start: 0.25 }, true],
  ['10 steg från ×0,35', { steg: 10, start: 0.35 }, true],
  ['12 steg från ×0,35', { steg: 12, start: 0.35 }, true],
]) {
  let samst = 1, trasiga = 0
  for (const punkter of [10, 12, 14, 16]) {
    for (const overskjut of [1, 1.15, 1.3]) {
      const r = poppa({ ...opt, punkter, overskjut })
      samst = Math.min(samst, r.fyllnad)
      trasiga += r.trasigaSteg + (r.nan ? 1 : 0)
    }
  }
  const hel = samst > 0.95 && trasiga === 0
  ok(`${namn}: ${ska ? 'hela' : 'faller (kontroll)'}`, hel === ska, `sämsta fyllnad ${samst.toFixed(3)} · ${trasiga} självskurna steg`)
}

console.log('\nkostnad: steg() + skala() per kropp och bildruta (utan ritning)')
{
  const matt = (N) => {
    const ks = Array.from({ length: N }, (_, i) => new Mjukkropp({ x: i * 50, y: 0, w: 40, h: 36, punkter: 12, grav: 0.3 }))
    for (let f = 0; f < 120; f++) for (const k of ks) k.steg(1)
    const t0 = process.hrtime.bigint()
    for (let f = 0; f < 600; f++) for (const k of ks) { k.skala(1 + 0.1 * Math.sin(f * 0.2)); k.steg(1) }
    return Number(process.hrtime.bigint() - t0) / 1000 / 600
  }
  const tom = matt(0)
  ok('kontroll: noll kroppar kostar ~0', tom < 1, `${tom.toFixed(2)} µs`)
  const us40 = matt(40)
  for (const N of [1, 10, 40, 80]) console.log(`  N=${String(N).padStart(2)}: ${(N === 40 ? us40 : matt(N)).toFixed(1)} µs/bildruta`)
  ok('40 kroppar under 1 ms', us40 < 1000, `${(us40 / 40).toFixed(1)} µs per kropp`)
}

console.log(fel === 0 ? '\n✓ poppprobe: allt grönt\n' : `\n✗ poppprobe: ${fel} fel\n`)
process.exit(fel === 0 ? 0 : 1)
