// Mäter badets Ytvag i tvatta-djuret i TAL (ingen webbläsare) — samma tal som spelets VAG.
//   node scripts/_tvattavagprobe.mjs
import { Ytvag } from '../src/lib/ytvag.js'
const mk = () => new Ytvag({ n: 41, x0: 372, x1: 908, ytY: 495, sprid: 0.2, k: 0.021, damp: 0.985, max: 6, stotKlamma: true, vilaTrosk: 0.2 })
const topp = (y) => Math.max(...Array.from(y.h).map(Math.abs))
const G = 3.5 // badsakGain
let fel = 0
const ok = (n, v, d = '') => { console.log(`  ${v ? '✓' : '✗'} ${n}${d ? ' · ' + d : ''}`); if (!v) fel++ }

console.log('A. duschen: 2 droppar/bildruta × stotPerDropp 0,1 i 3 s vid x=640 (konstant kraft), sedan släpp')
const y = mk(); let t = 0, bobb = 0, lut = 0
for (let f = 0; f < 180; f++) {
  y.stot(640, 0.1 * 2); y.uppdatera(1000 / 60)
  t = Math.max(t, topp(y)); bobb = Math.max(bobb, Math.abs(y.avvikelse(400)) * G)
  lut = Math.max(lut, Math.abs((y.avvikelse(415) - y.avvikelse(385)) / 30) * G * 1.5)
}
ok('toppen ryms i taket 6', t <= 6, `topp ${t.toFixed(2)}`)
ok('toppen syns (> 2 px)', t > 2)
ok('badsaken guppar synligt men ryms i vattenranden', bobb > 1 && bobb < 13, `${bobb.toFixed(2)} px · lutning ${lut.toFixed(3)} rad`)
let ritade = 0, stilla = -1
for (let f = 0; f < 60 * 15; f++) { const om = y.uppdatera(1000 / 60); if (om) ritade++; if (stilla < 0 && !y.rorlig && !om) stilla = f }
ok('ytan stannar efter släpp (< 8 s)', stilla > 0 && stilla / 60 < 8, `${(stilla / 60).toFixed(1)} s`)
ok('badsaken är exakt tillbaka i vila', y.avvikelse(400) === 0 && y.hojd(640) === 0)
let extra = 0
for (let f = 0; f < 300; f++) if (y.uppdatera(1000 / 60)) extra++
ok('INGEN omritning i vila (300 bildrutor)', extra === 0, `${extra}`)

console.log('B. avslutet: 4 i mitten + 2 × 2 vid sidorna')
const z = mk(); z.stot(640, 4); z.stot(520, 2); z.stot(760, 2)
let zt = 0, zb = 0
for (let f = 0; f < 300; f++) { z.uppdatera(1000 / 60); zt = Math.max(zt, topp(z)); zb = Math.max(zb, Math.abs(z.avvikelse(400)) * G) }
ok('toppen ryms i taket', zt <= 6, `${zt.toFixed(2)}`)
ok('badsaken guppar (> 1 px)', zb > 1, `${zb.toFixed(2)} px`)

console.log('C. takt: bildrutetakt ändrar inte jämvikten (30 vs 60 fps)')
const r = (dt) => { const q = mk(); let m = 0; for (let ms = 0; ms < 3000; ms += dt) { q.stot(640, 0.2 * dt / (1000 / 60)); q.uppdatera(dt); m = Math.max(m, topp(q)) } return m }
const a60 = r(1000 / 60), a30 = r(1000 / 30)
ok('topp 30 fps ≈ 60 fps (±25 %)', Math.abs(a30 - a60) / a60 < 0.25, `${a60.toFixed(2)} vs ${a30.toFixed(2)}`)
console.log(fel ? `\n${fel} röda` : '\nalla gröna')
process.exit(fel ? 1 : 0)
