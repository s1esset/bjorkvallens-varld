// FOTOKANTEN — syns fotorutans RAKA UNDERKANT under pappas haka i något gömställe?
//
// Frågan går inte att svara på med ögonmått i en 460×520-bild: bandet är 10–20 px högt och
// ligger under ett skäggigt hakparti. Sonden mäter i stället TALEN som avgör saken, direkt
// ur spelet, och tar en tight beskärning av just hakbandet så svaret går att kontrollera i
// bild också.
//
//     fotoBotten = uppY + 150·s      (riggens ruta är 300 px hög vid skala 1)
//     tackTopp   = översta kanten på det som ligger i FRAM-lagret EFTER `oppna()`
//
// Är `tackTopp <= fotoBotten` är kanten dold. Det som rör sig i `oppna()` räknas INTE som
// täckning — hela poängen är att det flyttat sig.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const UT = '.test-shots/fotokant'
mkdirSync(UT, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
let laddningar = 0
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))
page.on('load', () => { laddningar += 1 })
const vanta = (ms) => page.waitForTimeout(ms)

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'titt-ut-pappa' }))
await vanta(2400)

const { MOBLER } = await import('../src/games/titt-ut-pappa/layout.js')
const alla = Object.keys(MOBLER)
const sedda = new Set()
const rader = []

for (let varv = 0; varv < 14 && sedda.size < alla.length; varv++) {
  const kvar = await page.evaluate((r) => window.__barnspel.game._platser.map((p) => p.key).filter((k) => !r.includes(k)), [...sedda])
  for (const key of kvar) {
    const m = await page.evaluate((k) => {
      const g = window.__barnspel.game
      const plats = g._platser.find((p) => p.key === k)
      if (!plats) return null
      g.__org = g.__org || { nyRunda: g._nyRunda, byt: g._bytPlatser, final: g._final }
      g._nyRunda = g.__org.nyRunda; g._bytPlatser = g.__org.byt; g._final = g.__org.final
      const gammal = g._valjGomma
      g._valjGomma = () => plats
      g._nyRunda(window.__barnspel.ctx)
      g._valjGomma = gammal
      g._hittaPappa(window.__barnspel.ctx, plats)
      g._fynd = 0; g._busy = false
      g._nyRunda = () => {}; g._bytPlatser = () => false; g._final = () => {}
      return { s: plats.s, kant: g._kantVarld(plats), uppY: g._uppY, x: plats.ankare.x }
    }, key)
    if (!m) continue
    await vanta(1000)
    // Täckningen läses EFTER `oppna()` — och bara ur de fram-barn som INTE flyttat sig.
    // ⚠️ LÄS RIGGENS EGNA BOUNDS, räkna inte fram dem. Första versionen tog `uppY + 150·s`
    //    som fotorutans underkant och rapporterade "dold" för alla elva — medan den tighta
    //    beskärningen visade en naken fotoruta under hakan i kuddhögen. Talet var 22 px fel,
    //    och ett mått som inte kan skilja ett känt fel från ett känt rätt säger ingenting.
    const matt = await page.evaluate((k) => {
      const g = window.__barnspel.game
      const plats = g._platser.find((p) => p.key === k)
      if (!plats?.g?.fram || !g._ans) return null
      const ab = g._ans.view.getBounds()
      const delar = []
      for (const barn of plats.g.fram.children) {
        if (!barn || barn.destroyed) continue
        const b = barn.getBounds()
        if (b.height <= 0 || b.width <= 0) continue
        delar.push({ b: Math.round(b.y), h: Math.round(b.height), w: Math.round(b.width) })
      }
      return { fotoBotten: ab.y + ab.height, fotoTopp: ab.y, fotoBredd: ab.width, delar }
    }, key)
    const fotoBotten = matt ? matt.fotoBotten : m.uppY + 150 * m.s
    // Täckningen: översta kanten på den BREDASTE fram-delen (den smala rör sig oftast).
    const breda = (matt?.delar || []).filter((d) => d.w >= 158 * m.s)
    const tack = breda.length ? Math.min(...breda.map((d) => d.b)) : null
    const dolt = tack != null && tack <= Math.round(m.uppY + 134 * m.s)
    rader.push({ key, foto: Math.round(fotoBotten), haka: Math.round(m.uppY + 134 * m.s), tack: tack == null ? null : Math.round(tack), dolt, delar: matt?.delar || [] })
    await page.screenshot({
      path: join(UT, `${key}.png`),
      clip: {
        x: Math.max(0, Math.min(1280 - 300, m.x - 150)),
        y: Math.max(0, Math.min(720 - 150, fotoBotten - 100)),
        width: 300,
        height: 150,
      },
    })
    await vanta(1400)
    sedda.add(key)
  }
  await page.evaluate(() => {
    const g = window.__barnspel.game
    g.__org = g.__org || { nyRunda: g._nyRunda, byt: g._bytPlatser, final: g._final }
    g._nyRunda = g.__org.nyRunda; g._bytPlatser = g.__org.byt; g._final = g.__org.final
    g._rivPlatser(); g._byggPlatser(window.__barnspel.ctx)
  })
  await vanta(900)
}
await browser.close()

console.log('\n  möbel          fotorutans botten   täckande överkant   dold?')
for (const r of rader.sort((a, b) => Number(a.dolt) - Number(b.dolt))) {
  console.log(`  ${r.key.padEnd(14)} ${String(r.foto).padStart(10)} ${String(r.tack ?? '—').padStart(20)}   ${r.dolt ? 'ja' : '✗ NEJ'}`)
}
console.log(`\n  ${rader.filter((r) => !r.dolt).length} av ${rader.length} visar fotorutans raka kant · beskärningar i ${UT}/`)
console.log(`  sidladdningar: ${laddningar}${laddningar > 1 ? ' ⚠ OMLADDNING MITT I' : ''} · konsolfel: ${fel.length}`)
for (const f of fel.slice(0, 4)) console.log(`    ✗ ${f}`)
console.log('')
