// SPINDELNÄTET, två rundor otåligt (D9, G1): bytet halas in som KROPP i stället för en tween.
//
//   node scripts/_dag-spindelnatet.mjs       (kräver dev-servern på :5173)
//
// Trycker på närmaste fallande byte var 140:e ms och på bredknappen var 8:e tryck, tills
// två rundor är fångade. Mäter: tid tryck → fångst räknad (taket i spelet är 1,5 s),
// högsta antal trådar som halas samtidigt, kroppar i världen efter rundbytet mot före
// (en kvarglömd halad kropp syns där), `_strands` efter rundbytet, konsolfel.
// Kontrollarm: på HEAD finns inget `_strands` och kroppen tas ur världen vid fångsten.
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
p.on('console', m => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
p.on('pageerror', e => fel.push('PAGEERROR ' + String(e).slice(0, 160)))
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await p.evaluate(() => window.__barnspel.nav.go('game', { id: 'spindelnatet' }))
await p.waitForTimeout(2500)

const res = await p.evaluate(async () => {
  const w = (ms) => new Promise(r => setTimeout(r, ms))
  const g = window.__barnspel.game
  const cv = document.querySelector('canvas'), r = cv.getBoundingClientRect(), sx = r.width / 1280
  const tap = (x, y) => {
    const o = { clientX: r.left + x * sx, clientY: r.top + y * sx, pointerId: 1, pointerType: 'touch', button: 0, bubbles: true, isPrimary: true }
    cv.dispatchEvent(new PointerEvent('pointerdown', { ...o, buttons: 1 }))
    cv.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 }))
  }
  const ut = { fangster: [], maxStrands: 0, rundor: [], tryck: 0 }
  let rundor = 0, forra = g._caughtCount, vantar = [], t0 = performance.now()
  let byggd = g._buildRound.bind(g)
  const orig = g._buildRound
  g._buildRound = function (...a) {
    const fore = this._phys?.world?.bodies?.length
    const ret = orig.apply(this, a)
    rundor++
    ut.rundor.push({ kropparFore: fore, kropparEfter: this._phys?.world?.bodies?.length, strands: this._strands ? this._strands.length : 'saknas', items: this._items.length })
    return ret
  }
  while (rundor < 2 && performance.now() - t0 < 90000) {
    await w(140)
    ut.maxStrands = Math.max(ut.maxStrands, (g._strands || []).length)
    if (g._caughtCount > forra) {
      const n = g._caughtCount - forra
      for (let i = 0; i < n && vantar.length; i++) ut.fangster.push(Math.round(performance.now() - vantar.shift()))
    }
    if (g._caughtCount < forra) vantar = []
    forra = g._caughtCount
    ut.tryck++
    if (ut.tryck % 8 === 0) { tap(1150, 600); continue }
    const fria = g._items.filter(it => !it._caught && it.view && it.view.y < 640)
    if (!fria.length) continue
    const it = fria[0]
    tap(it.view.x, it.view.y)
    if (vantar.length < 8) vantar.push(performance.now())
  }
  ut.tid = Math.round(performance.now() - t0)
  return ut
})
await p.waitForTimeout(1500)
// exit mitt i ett indrag
await p.evaluate(() => window.__barnspel.nav.go('menu'))
await p.waitForTimeout(1500)
const f = res.fangster.sort((a, b) => a - b)
console.log('\n  spindelnätet — två rundor otåligt\n')
console.log(`  rundbyten: ${res.rundor.length} · tryck ${res.tryck} · tid ${res.tid} ms`)
console.log(`  tryck→fångst (ms, ${f.length} st): min ${f[0]} · median ${f[f.length >> 1]} · max ${f[f.length - 1]}`)
console.log(`  högsta antal trådar samtidigt: ${res.maxStrands}`)
for (const r of res.rundor) console.log(`  rundbyte: kroppar ${r.kropparFore} → ${r.kropparEfter} · _strands ${r.strands} · byten ${r.items}`)
console.log(`  konsolfel: ${fel.length}`); for (const x of fel.slice(0, 6)) console.log('   ' + x)
await b.close()
