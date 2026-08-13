// Ritar ansiktsriggen i alla sina lägen och tar en skärmdump.
//
// Ett ansikte går inte att bedöma i tal. Klipp-pipelinen (`npm run ansikte`) mäter att
// lagren är RÄTT INRIKTADE (silhuett-IoU), men om käkens tak är för högt, om skarven
// syns, eller om en min läser som "arg" i stället för "sur" — det ser bara ögat.
//
// Rutnätet: vila · tre gap-lägen · blink · alla nio miner.
//
//   node scripts/_ansiktebild.mjs [--shot .test-shots/ansikte.png] [--person pappa]
//
// Kräver dev-servern (window.__barnspel är DEV-only).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const shot = opt('--shot', '.test-shots/ansikte.png')
const person = opt('--person', 'pappa')
const url = opt('--url', 'http://localhost:5173')
// Ett urval av lägen, kommaseparerat med samma namn som rutorna får: --bara "vila,wink h"
const bara = (opt('--bara', '') || '').split(',').map((s) => s.trim()).filter(Boolean)
mkdirSync(dirname(shot), { recursive: true })

const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(700)

  const fakta = await page.evaluate(async ({ person, bara }) => {
    // Bara PROJEKTETS egna sökvägar går att importera här — en bar specifier
    // ('pixi.js') resolvas av Vite i modulgrafen, inte i webbläsarens import().
    const { laddaAnsikte, Ansikte } = await import('/src/lib/ansikte.js')
    const { createScene } = await import('/src/lib/scene.js')
    const layer = window.__barnspel.gateLayer
    for (const c of [...layer.children]) if (c.__galleri) c.removeFromParent()

    const duk = createScene('meadow', { width: 1280, height: 720 })
    duk.__galleri = true
    layer.addChild(duk)

    const data = await laddaAnsikte(person)
    // Gesterna är RÖRELSER, och en stillbild kan bara visa dem i sitt ytterläge. Därför
    // sätts `_g`-fälten för hand här i stället för att köra tweenen: rutan visar hur
    // långt gesten går, vilket är det enda ögat behöver döma (går huvudet av leden?).
    const gest = (falt, v) => (a) => { a._g[falt] = v; a._tillampa() }
    const lagen = [
      ['vila', (a) => {}],
      ['gap 0,35', (a) => a.gap(0.35)],
      ['gap 0,7', (a) => a.gap(0.7)],
      ['gap 1,0', (a) => a.gap(1)],
      ['blink', (a) => { a._ogon.alpha = 1 }],
      ['wink v', (a) => { if (a._ogonV) a._ogonV.alpha = 1 }],
      ['wink h', (a) => { if (a._ogonH) a._ogonH.alpha = 1 }],
      ['hetta 1,0', (a) => a.hetta(1)],
      ['kyla 1,0', (a) => a.kyla(1)],
      ['nick (botten)', gest('nickY', 11)],
      ['tveka (ytterläge)', gest('ryckR', 0.05)],
      ['luta mot höger', (a) => a.lutaMot(1)],
      ...Object.keys(data.manifest.miner).map((m) => [m, (a) => { a._miner[m].visible = true; a._miner[m].alpha = 1 }]),
    ]
    // 25 lägen i en 1280×720-ruta ger 132 px höga ansikten, och en wink går inte att döma
    // i den storleken. `--bara "vila,wink h"` renderar ett urval — färre rutor, större
    // ansikten. Rutnätet följer med: 2 kolumner upp till fyra lägen, sedan 3, sedan 5.
    if (bara.length) {
      const valda = lagen.filter((l) => bara.includes(l[0]))
      lagen.length = 0
      lagen.push(...valda)
    }
    const cols = lagen.length <= 4 ? 2 : lagen.length <= 9 ? 3 : 5
    const rader = Math.ceil(lagen.length / cols)
    const cellW = 1280 / cols
    const cellH = 720 / rader
    window.__ansikten = []
    lagen.forEach(([namn, satt], i) => {
      const a = new Ansikte(data, { hojd: cellH * 0.92 })
      a.view.position.set((i % cols) * cellW + cellW / 2, Math.floor(i / cols) * cellH + cellH * 0.5)
      satt(a)
      a.view.__galleri = true
      layer.addChild(a.view)
      window.__ansikten.push(a)
    })
    return { lagen: lagen.map((l) => l[0]), ruta: data.manifest.ruta, lager: Object.keys(data.manifest.lager).length, miner: Object.keys(data.manifest.miner).length }
  }, { person, bara })

  await page.waitForTimeout(600)
  await page.screenshot({ path: shot })

  // ANDAS ANSIKTET FORTFARANDE EFTER 40 GESTER?
  //
  // `_track` höll 24 tweens och kastade den ÄLDSTA när listan blev full — och den äldsta
  // är `liv()`s eviga andetag. Med gester i spelet fylls listan på en halv minut, så det
  // här är inte en teoretisk risk. Mätt som FENOMEN (svänger skalan?), inte som mekanism
  // (finns tweenen kvar?): en tween som lever men inte rör något är inget svar.
  // Kontrollarmen är samma mätning FÖRE gesterna — utan den vet man inte om nollan efteråt
  // betyder "andningen dog" eller "mätfönstret missade andetaget".
  const anda = await page.evaluate(async () => {
    const a = window.__ansikten[0]
    const amp = async (ms) => {
      let min = Infinity
      let max = -Infinity
      const t0 = performance.now()
      while (performance.now() - t0 < ms) {
        const v = a._inre.scale.y
        if (v < min) min = v
        if (v > max) max = v
        await new Promise((r) => requestAnimationFrame(r))
      }
      return +((max - min) * 1000).toFixed(2) // promille av skalan — annars försvinner talet i avrundning
    }
    a.liv(true, { takt: 0.5 }) // kort takt så ett helt andetag ryms i mätfönstret
    const fore = await amp(1100)
    for (let i = 0; i < 40; i++) { a.nick(); a.blink(); a.tveka() }
    const efter = await amp(1100)
    return { fore, efter, spar: a._tw.length }
  })

  // Exit-säkerhet: riv alla riggar och se att ingenting fortsätter ticka.
  const kvar = await page.evaluate(() => {
    const n = window.__ansikten.length
    for (const a of window.__ansikten) a.destroy()
    window.__ansikten = []
    return n
  })
  await page.waitForTimeout(500)

  console.log(`\n  ruta ${fakta.ruta.w}x${fakta.ruta.h} · ${fakta.lager} lager + ${fakta.miner} miner`)
  console.log(`  lägen: ${fakta.lagen.join(' · ')}`)
  const andasKvar = anda.efter > anda.fore * 0.5
  console.log(`  andning: ${anda.fore} ‰ före 40 gester · ${anda.efter} ‰ efter · ${anda.spar} spårade tweens` +
    `  ${anda.fore > 0.5 ? (andasKvar ? '✓' : '✗ ANDNINGEN DOG') : '✗ mätfönstret fångade inget andetag'}`)
  console.log(`  rev ${kvar} riggar efter bilden`)
  console.log(`  ${errors.length === 0 ? '✓ 0 konsolfel' : '✗ ' + errors.length + ' konsolfel: ' + errors.slice(0, 3).join(' | ')}`)
  console.log(`  bild: ${shot}\n`)
  process.exitCode = errors.length ? 1 : 0
} finally {
  await browser.close()
}
