// Mäter vad en MONTERING kostar, spel för spel — underlaget till ÅTGÄRDER V14.
//
// V14:s hypotes är att `tom-scen` i sviten inte är en trasig scen utan en kapplöpning:
// `page.screenshot()` hinner före spelets första riktigt målade bildruta när monteringen
// är dyr och fyra webbläsare delar på maskinen. Hypotesen förutsäger något MÄTBART —
// att det drabbade spelet ska ha en monteringskostnad som sticker ut mot svitens median.
// Den här sonden mäter den kostnaden i stället för att resonera om den.
//
// Två tal per spel, båda mätta över 1,6 s av bildrutor efter navigeringen:
//   varsta   längsta gapet mellan två `requestAnimationFrame` — monteringens
//            BLOCKERANDE ruta. `nav.go()` återvänder direkt (övergången är asynkron),
//            så en synkron mätning av anropet självt visar ~0 och säger ingenting.
//   lugn     ms tills bildrutorna är tillbaka under 25 ms, alltså när spelet är igång
//
//   node scripts/_montageprobe.mjs [--cpu 4] [--varv 1] [id ...]
//
// `--cpu N` stryper processorn via CDP och efterliknar därmed lasten i `test:all`
// (fyra parallella webbläsare) utan att behöva köra hela sviten.
import { chromium } from 'playwright'
import { readFileSync } from 'fs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const cpu = Number(opt('--cpu', 0))
const varv = Number(opt('--varv', 1))
const only = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--cpu', '--varv', '--topp'].includes(args[i - 1])))

// Id:n ur registret (mappnamnen är id:n i det här repot).
const reg = readFileSync(new URL('../src/games/registry.js', import.meta.url), 'utf8')
const alla = [...reg.matchAll(/from '\.\/([a-z0-9-]+)\/index\.js'/g)].map((m) => m[1])
const ids = only.length ? only : alla
if (!ids.length) { console.error('hittade inga spel i registry.js'); process.exit(2) }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  if (cpu > 1) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  }
  const fel = []
  page.on('pageerror', (e) => fel.push((e.message || String(e)).slice(0, 120)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

  for (const id of ids) {
    const matt = []
    for (let v = 0; v < varv; v++) {
      const m = await page.evaluate(async (gid) => {
        const tider = []
        let stop = false
        const t0 = performance.now()
        const tick = (t) => { tider.push(t); if (!stop) requestAnimationFrame(tick) }
        requestAnimationFrame(tick)
        window.__barnspel.nav.go('game', { id: gid })
        await new Promise((r) => setTimeout(r, 1600))
        stop = true
        let varsta = 0
        let lugn = 0
        for (let i = 1; i < tider.length; i++) {
          const gap = tider[i] - tider[i - 1]
          if (gap > varsta) { varsta = gap; lugn = tider[i] - t0 }
        }
        // Tiden tills tre rutor i följd är under 25 ms — spelet ritar då normalt.
        let rena = 0
        let stabil = 0
        for (let i = 1; i < tider.length; i++) {
          rena = tider[i] - tider[i - 1] < 25 ? rena + 1 : 0
          if (rena >= 3) { stabil = tider[i] - t0; break }
        }
        return { varsta, lugn: stabil || lugn }
      }, id)
      matt.push(m)
      await page.evaluate(() => window.__barnspel.nav.go('library'))
      await page.waitForTimeout(400)
    }
    const med = (f) => {
      const s = matt.map(f).sort((a, b) => a - b)
      return s[(s.length - 1) >> 1]
    }
    rader.push({ id, varsta: med((m) => m.varsta), lugn: med((m) => m.lugn) })
  }

  // Rangordna på den blockerande rutan — det är den som skjuter spelets första
  // riktiga bild framåt, alltså den kapplöpningen skulle handla om.
  rader.sort((a, b) => b.varsta - a.varsta)
  const alla2 = rader.map((r) => r.varsta).sort((a, b) => a - b)
  const median = alla2[(alla2.length - 1) >> 1]

  console.log(`\n  Monteringskostnad, ${rader.length} spel${cpu > 1 ? ` (CPU ${cpu}× strypt)` : ''}\n`)
  console.log('  ' + 'spel'.padEnd(26) + 'varsta ruta'.padStart(13) + 'lugn efter'.padStart(12) + 'x median'.padStart(11))
  const topp = Number(opt('--topp', 15))
  for (const r of rader.slice(0, topp)) {
    console.log('  ' + r.id.padEnd(26) + r.varsta.toFixed(1).padStart(13) + r.lugn.toFixed(0).padStart(12) + (r.varsta / median).toFixed(1).padStart(10) + '×')
  }
  if (rader.length > topp) console.log(`  … ${rader.length - topp} till`)
  console.log(`\n  median ${median.toFixed(1)} ms · varsta ${rader[0].id} ${rader[0].varsta.toFixed(1)} ms (${(rader[0].varsta / median).toFixed(1)}×)`)
  if (fel.length) console.log(`\n  ⚠ ${fel.length} pageerror: ${fel[0]}`)
  console.log('')
} finally {
  await browser.close()
}
