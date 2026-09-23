// Vad gör en NaN-sådd i BILD? (ÅTGÄRDER V23, följdfråga till `_bagprobe.mjs`.)
//
// När en väg slutar med `arc()` läser Pixi 8.19:s `getLastPoint` data[5]/data[6] ur bågens sex
// argument, och nästa väg sås med moveTo(undefined, undefined). Sonden ritar samma båge på fyra
// sätt i appens egen renderare och räknar målade pixlar i bågens färg:
//   ren     — moveTo till bågens start först (facit)
//   farsk   — bågen först i en färsk Graphics (ingen sådd alls — ska vara lika med ren)
//   nan     — en båge före (sådden blir NaN) — det som ska mätas
//   origo   — en cirkel före (sådden blir (0,0)) — KONTROLLARM: måste skilja sig från ren
//
//   node scripts/_bagnanprobe.mjs
import { chromium } from 'playwright'

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.__barnspel?.app?.renderer)
const res = await p.evaluate(async () => {
  const url = performance.getEntriesByType('resource').map((r) => r.name).filter((n) => /pixi__js\.js/.test(n)).pop()
  const PIXI = await import(url)
  const r = window.__barnspel.app.renderer
  const BLA = 0x2060ff
  const arc = (g) => g.arc(150, 150, 60, Math.PI, 0)
  const lagen = {
    ren: (g) => arc(g.moveTo(90, 150)).stroke({ width: 8, color: BLA }),
    farsk: (g) => arc(g).stroke({ width: 8, color: BLA }),
    nan: (g) => arc(g.arc(150, 150, 100, Math.PI, 0).stroke({ width: 4, color: 0xff0000 })).stroke({ width: 8, color: BLA }),
    origo: (g) => arc(g.circle(20, 20, 6).fill(0xff0000)).stroke({ width: 8, color: BLA }),
  }
  const ut = {}
  for (const [namn, rita] of Object.entries(lagen)) {
    const c = new PIXI.Container()
    const bg = new PIXI.Graphics().rect(0, 0, 300, 300).fill(0xffffff)
    const g = new PIXI.Graphics()
    rita(g)
    c.addChild(bg, g)
    const { pixels, width, height } = r.extract.pixels({ target: c, frame: new PIXI.Rectangle(0, 0, 300, 300) })
    let bla = 0
    let ovreHalva = 0
    for (let i = 0; i < width * height; i++) {
      const R = pixels[i * 4], G = pixels[i * 4 + 1], B = pixels[i * 4 + 2]
      if (B > 200 && R < 90 && G < 140) {
        bla++
        if (Math.floor(i / width) < 150) ovreHalva++
      }
    }
    ut[namn] = { bla, ovreHalva, bredd: width, hojd: height }
    c.destroy({ children: true })
  }
  return ut
})
console.log(JSON.stringify(res, null, 1))
const { ren, farsk, nan, origo } = res
console.log(`\nkontrollarm (origo ≠ ren): ${origo.bla !== ren.bla ? 'OK' : 'FÖLL'} · färsk = ren: ${farsk.bla === ren.bla ? 'ja' : 'NEJ'}`)
console.log(`NaN-sådd mot ren: ${nan.bla} mot ${ren.bla} blå pixlar (${(((nan.bla - ren.bla) / ren.bla) * 100).toFixed(1)} %)`)
await b.close()
