// Chilin (ägarrapport #12): rodnar ansiktet, och kommer röken ur ÖRONEN?
//
// Två saker som inte går att bedöma i tal och därför tas som bild också: var öronen sitter
// (fotot är friskuret runt håret, så punkten härleds ur manifestet) och om rodnaden läser
// som het hud eller som en röd plastfilm.
//
//   node scripts/_hettaprobe.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

mkdirSync('.test-shots', { recursive: true })
const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'

let rader = 0
let grona = 0
const fel = []
const kolla = (n, ok, t) => { rader++; if (ok) grona++; console.log(`  ${ok ? '✓' : '✗'} ${n.padEnd(34)} ${t}`) }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()) })
page.on('pageerror', (e) => fel.push(String(e)))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'mata-munnen' }))
await page.waitForTimeout(2600)

const spel = () => page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
  const a = g._ans
  return {
    tint: a?._lager?.map((s) => s.tint) ?? [],
    lager: a?._lager?.length ?? 0,
    oron: a?.oron?.() ?? null,
    bredd: a?.bredd ?? 0,
    hojd: a?.hojd ?? 0,
    ansXY: { x: Math.round(a?.view?.x ?? 0), y: Math.round(a?.view?.y ?? 0) },
  }
})

const vila = await spel()
kolla('vila: alla lager är otintade', vila.lager > 0 && vila.tint.every((t) => t === 0xffffff),
  `${vila.lager} lager, alla 0xffffff`)

// Öronen ska ligga PÅ huvudet: innanför bredden, och över köksöns skärlinje.
const [v, h] = vila.oron || [{}, {}]
const halva = vila.bredd / 2
// ⚠️ Symmetrin mäts kring HUVUDETS mitt, inte kring fotorutans. Basen ligger 3 px höger i
// rutan, så ett krav på |vänster| === |höger| fäller en korrekt uträkning (sonden gjorde
// just det i sin första version: ±140 mot 146).
const mitt = (v.x + h.x) / 2
kolla('öronen sitter symmetriskt på huvudet', !!vila.oron && Math.abs(v.x - mitt) < halva && Math.abs((mitt - v.x) - (h.x - mitt)) < 0.5 && Math.abs(v.y - h.y) < 0.5,
  vila.oron ? `${(mitt - v.x).toFixed(0)} px ut åt vardera hållet från huvudets mitt (halva bredden ${halva.toFixed(0)})` : 'saknas')
kolla('öronen ligger ovanför köksöns kant', !!vila.oron && vila.ansXY.y + v.y < 395,
  vila.oron ? `öra y=${(vila.ansXY.y + v.y).toFixed(0)} · kanten y=395` : '—')

// Kör hettan via spelets EGEN väg.
await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
  g._hetta({ later: (t, f) => setTimeout(f, t * 1000), fxLayer: g._root.parent }, 1.2)
})
await page.waitForTimeout(420)
const het = await spel()
const r = (t) => (t >> 16) & 255
const gr = (t) => (t >> 8) & 255
kolla('ansiktet rodnar (rött kvar, blått bort)', het.tint.every((t) => r(t) === 255 && gr(t) < 230),
  `tint ${'#' + (het.tint[0] >>> 0).toString(16).padStart(6, '0')} — kontroll i vila #ffffff`)
kolla('rodnaden gäller ALLA lager, minerna med', new Set(het.tint).size === 1,
  `${het.lager} lager, ${new Set(het.tint).size} unik ton`)

await page.screenshot({ path: '.test-shots/_hetta.png' })

// Svalnar den? (Annars står pappa röd resten av rundan.)
await page.waitForTimeout(3600)
const sval = await spel()
kolla('ansiktet svalnar av sig självt', sval.tint.every((t) => t === 0xffffff),
  `tint ${'#' + (sval.tint[0] >>> 0).toString(16).padStart(6, '0')}`)

// Exit mitt i en chili — hettans tween skriver till riggen varje bildruta.
await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
  g._hetta({ later: (t, f) => setTimeout(f, t * 1000), fxLayer: g._root.parent }, 1.2)
})
await page.waitForTimeout(140)
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(1400)
kolla('exit mitt i hettan är ren', fel.length === 0, fel.length ? fel.slice(0, 2).join(' | ') : '0 konsolfel')

await browser.close()
console.log(`\n  ${grona}/${rader} gröna · bild: .test-shots/_hetta.png\n`)
process.exit(grona === rader ? 0 : 1)
