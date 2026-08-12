// Finns det NÅGON text som ändras varje bildruta? (LYFTPLAN C10 / nattkö N8)
//
// C10 säger "`BitmapText` för allt som ändras varje bildruta (räknare)". En `Text`
// rasteras via canvas varje gång dess sträng ändras, så en räknare som skrivs om 60
// ggr/s laddar upp 60 texturer i sekunden — det är den kostnaden BitmapText tar bort.
// Men bytet är bara värt något om en sådan text FINNS: `BitmapText` bär en egen
// glyfatlas och en annan typsnittsväg, och att byta ut 75 lugna etiketter mot den
// vore en kostnad utan intäkt.
//
// Sonden hakar på `Text`-prototypens `text`-sättare och räknar SKRIVNINGAR per
// bildruta, per spel — det går inte att läsa ur koden, eftersom en skrivning i en
// gsap-onUpdate eller en ticker-callback ser likadan ut som en i en knapp-handler.
//
//   node scripts/_textprobe.mjs [--sek 6]
import { chromium } from 'playwright'
import { readdirSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? Number(args[i + 1]) : d }
const SEK = opt('--sek', 6)

const SPEL = readdirSync('src/games', { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  const varsta = []
  for (const id of SPEL) {
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(300)
    await page.evaluate((g) => window.__barnspel.nav.go('game', { id: g }), id)
    await page.waitForTimeout(1200)

    const res = await page.evaluate(async (sek) => {
      // Prototypens sättare hakas EN gång; `Text` hämtas ur appens egen Pixi via ett
      // levande objekt i scenen, inte via en import (annan modulinstans-fällan).
      if (!window.__textHakad) {
        let T = null
        const leta = (n) => {
          if (T || !n) return
          if (typeof n.text === 'string' && n.constructor?.name === 'Text') { T = n.constructor; return }
          if (n.children) for (const k of n.children) leta(k)
        }
        leta(window.__barnspel.app.stage)
        if (!T) return { hittad: false }
        // `text` är INTE en egen egenskap på `Text.prototype` — sättaren sitter på
        // basklassen (`AbstractText`). Uppmätt: getOwnPropertyDescriptor på Text.prototype
        // gav `undefined`, och sonden rapporterade "ingen Text i scenen" för alla 72
        // spelen fast tre Text-noder låg framför den. Leta uppåt i kedjan.
        let proto = T.prototype
        let desc = null
        while (proto && !desc) {
          desc = Object.getOwnPropertyDescriptor(proto, 'text')
          if (!desc?.set) { desc = null; proto = Object.getPrototypeOf(proto) }
        }
        if (!desc) return { hittad: false }
        window.__textRakn = 0
        Object.defineProperty(proto, 'text', {
          ...desc,
          set(v) { window.__textRakn++; desc.set.call(this, v) },
        })
        window.__textHakad = true
      }
      const app = window.__barnspel.app
      window.__textRakn = 0
      let rutor = 0
      const rakna = () => { rutor++ }
      app.ticker.add(rakna)
      await new Promise((r) => setTimeout(r, sek * 1000))
      app.ticker.remove(rakna)
      return { hittad: true, skrivningar: window.__textRakn, rutor }
    }, SEK)

    if (!res.hittad) { console.log(`  ${id}: ingen Text i scenen`); continue }
    const perRuta = res.rutor ? res.skrivningar / res.rutor : 0
    varsta.push({ id, perRuta, skrivningar: res.skrivningar, rutor: res.rutor })
  }

  varsta.sort((a, b) => b.perRuta - a.perRuta)
  console.log(`\nTextskrivningar per bildruta (${SEK}s per spel, ${SPEL.length} spel)\n`)
  console.log('  spel'.padEnd(28) + 'skrivn/ruta'.padStart(12) + 'totalt'.padStart(10))
  console.log('  ' + '-'.repeat(48))
  for (const v of varsta.slice(0, 10)) {
    console.log('  ' + v.id.padEnd(26) + v.perRuta.toFixed(3).padStart(12) + String(v.skrivningar).padStart(10))
  }
  const heta = varsta.filter((v) => v.perRuta >= 0.5)
  console.log(`\n  spel med ≥0,5 skrivningar/ruta (kandidater för BitmapText): ${heta.length}`)
  if (heta.length) console.log('   ' + heta.map((h) => `${h.id} (${h.perRuta.toFixed(2)})`).join(' · '))
  console.log(`  konsolfel: ${fel.length}`)
  if (fel.length) { console.log(fel.slice(0, 5).map((f) => '   ! ' + f).join('\n')); kod = 1 }
} catch (e) {
  console.error('SOND-FEL:', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
