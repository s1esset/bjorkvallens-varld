// Mäter pölarnas Ytvag i fargregn i TAL: topp, avklingning och att omritning stannar.
//   node scripts/_fargregnvagprobe.mjs
import { Ytvag } from '../src/lib/ytvag.js'
const cfg = (w) => ({ n: 15, x0: -w, x1: w, ytY: 0, sprid: 0.08, k: 0.03, damp: 0.96, max: 6, stotKlamma: true, vilaTrosk: 0.25 })
for (const w of [64, 110]) {
  for (const kraft of [1.2, 2, 3]) {
    const y = new Ytvag(cfg(w))
    y.stot(0, kraft)
    let topp = 0, ritade = 0, stilla = -1
    for (let f = 0; f < 60 * 12; f++) {
      const om = y.uppdatera(1000 / 60)
      if (om) ritade++
      topp = Math.max(topp, ...Array.from(y.h).map(Math.abs))
      if (stilla < 0 && !y.rorlig && !om) stilla = f
    }
    console.log(`w=${w} kraft=${kraft} topp=${topp.toFixed(2)} omritade=${ritade} stilla vid ruta ${stilla} (${(stilla / 60).toFixed(1)} s)`)
  }
}
// 10 stötar på rad (tak)
const y = new Ytvag(cfg(90)); let t = 0
for (let f = 0; f < 600; f++) { if (f % 20 === 0) y.stot(((f / 20) % 5 - 2) * 30, 2); y.uppdatera(1000 / 60); t = Math.max(t, ...Array.from(y.h).map(Math.abs)) }
console.log('stötregn topp', t.toFixed(2), '(tak 6)')

// Ritningen: ligger varje linjepunkt inom pölens ellips (geometrin, inte ett tal)?
const w = 64, b = w * 0.28, WAVE_MAX = 4.5
const yy = new Ytvag({ n: 15, x0: -w, x1: w, ytY: 0, sprid: 0.08, k: 0.03, damp: 0.96, max: WAVE_MAX, stotKlamma: true, vilaTrosk: 0.25 })
let ut = 0, maxY = 0
for (let f = 0; f < 240; f++) {
  if (f % 15 === 0) yy.stot(((f / 15) % 3 - 1) * 60, 2)
  yy.uppdatera(1000 / 60)
  for (const rad of [-0.14, 0, 0.14]) {
    const y0 = rad * w
    const a = w * Math.sqrt(Math.max(0, 1 - ((Math.abs(y0) + WAVE_MAX + 3) / b) ** 2)) * 0.92
    for (let x = -a; x <= a; x += 9) {
      for (const dy of [0, 3]) {
        const py = y0 + dy + yy.hojd(x)
        if ((x / w) ** 2 + (py / b) ** 2 > 1) ut++
        maxY = Math.max(maxY, Math.abs(py))
      }
    }
  }
}
console.log('punkter utanför ellipsen (minsta pöl):', ut, ' största |y|', maxY.toFixed(1), 'av', b.toFixed(1))
