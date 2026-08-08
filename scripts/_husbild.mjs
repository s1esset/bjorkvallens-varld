// Ritar de nya butiksfasaderna med RIKTIG PixiJS i RIKTIG Chrome, mitt i det
// riktiga natskott-pa-stan (så trottoaren, himlen och _drawWindow är äkta), och
// tar skärmdumpar. Skärmdumpen är beviset — inte att koden kör utan fel.
//
//   node scripts/_husbild.mjs            → .test-shots/natskott-hustyper*.png
//   node scripts/_husbild.mjs --fil <sökväg till hustyper.js>
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d)
const url = arg('--url', 'http://localhost:5173')
const KALLA = resolve(
  arg('--fil', 'C:/Users/Admin/AppData/Local/Temp/claude/C--repos-pwagames/e008ee63-a3fa-438e-b721-28622dc469f8/scratchpad/hustyper.js')
)
const ID = 'natskott-pa-stan'
const MOD = resolve('scripts/_husprobe-mod.js')

mkdirSync('.test-shots', { recursive: true })

// Bygg en körbar modul av exakt den levererade källkoden: bara importer +
// de delade hjälparna som index.js redan har, sedan källan ordagrant.
const kall = readFileSync(KALLA, 'utf-8')
const wrapper = `import { Container, Graphics, Text } from 'pixi.js'
import { FONT, COLORS, shade, tint } from '../src/lib/theme.js'
const SIDEWALK_TOP = 555
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rnd = (a, b) => a + Math.random() * (b - a)
const slumpFarg = (list) => list[(Math.random() * list.length) | 0]
${kall}
export { HUSTYPER, ritaHus, BUT_WIN_MAXY, Container, Graphics, Text }
`
writeFileSync(MOD, wrapper, 'utf-8')

const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 240)))
page.on('console', (m) => m.text().includes('[vite]') && console.log('   vite:', m.text().slice(0, 120)))
page.on('load', () => console.log('   >>> SIDAN LADDADES OM (window nollställt)'))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 240)))

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
await page.waitForTimeout(1400)

// Frys spelet och töm kulissen. OBS: spelmodulen är en SINGLETON — stubbar
// överlever exit och nytt mount, så originalen måste sparas och läggas tillbaka
// innan live-körningen (första försöket rullade aldrig gatan av precis det).
await page.evaluate(() => {
  const m = window.__natdbg
  window.__husOrig = {}
  for (const k of ['_scrollLayers', '_spawnTick', '_behave', '_shiftBodies', '_healWindows', '_mkMidSeg']) {
    window.__husOrig[k] = m[k]
  }
  m._scrollLayers = () => {}
  m._spawnTick = () => {}
  m._behave = () => {}
  m._shiftBodies = () => {}
  m._healWindows = () => {}
  m._gustTimer = 9999
  m._skataTimer = 9999
  m._heistTimer = 9999
  m._spawnTimer = 9999
  for (const r of [...m._targets]) m._removeTarget(r)
  for (const s of m._mid) s.c.destroy({ children: true })
  m._mid.length = 0
  for (const s of m._far) s.c.destroy({ children: true })
  m._far.length = 0
})

const IDS = ['bageri', 'pizzeria', 'glasskiosk', 'leksaksaffar', 'blomsteraffar', 'cykelaffar']

async function ritaSida(lista, filnamn, { krossa = false } = {}) {
  const rapport = await page.evaluate(
    async ({ ids, modUrl, krossa }) => {
      const m = window.__natdbg
      const mod = await import(modUrl)
      // Rensa förra sidan
      for (const s of m._mid) s.c.destroy({ children: true })
      m._mid.length = 0
      const PixiContainer = mod.Container
      const Graphics = mod.Graphics
      const ut = []
      ids.forEach((id, i) => {
        const c = new PixiContainer()
        c.eventMode = 'none'
        const g = new Graphics()
        const gap = 60
        // alternera speglingen så BÅDA frontlägena hamnar i bilden
        const hus = mod.ritaHus(g, gap, id, { c, spegel: i % 2 === 1 })
        g.eventMode = 'none'
        c.addChildAt(g, 0)
        c.x = 20 + i * 470
        const seg = { c, w: gap + hus.bw + 20, wins: [] }
        for (const f of hus.fonster) seg.wins.push(m._mkWindow(c, f.lx, f.cy, f.w, f.h, f.frame))
        if (krossa) {
          for (const w of seg.wins) {
            w.state = 'broken'
            m._drawWindow(w)
          }
        }
        m._mid.push(seg)
        m._midLayer.addChild(c)
        // Mät faktiska pixelgränser för det som ritades (avslöjar saker utanför lådan)
        const b = g.getLocalBounds()
        ut.push({
          id: hus.id,
          bw: hus.bw,
          topY: hus.topY,
          skylt: hus.skylt,
          x: c.x,
          gap,
          fonster: hus.fonster.map((f) => ({ lx: f.lx, cy: f.cy, w: f.w, h: f.h })),
          kastade: hus.fonsterKastade.length,
          rita: { x0: Math.round(b.x), x1: Math.round(b.x + b.width), y0: Math.round(b.y), y1: Math.round(b.y + b.height) },
        })
      })
      return ut
    },
    { ids: lista, modUrl: '/scripts/_husprobe-mod.js?t=' + Date.now(), krossa }
  )
  await page.waitForTimeout(500)
  await page.screenshot({ path: `.test-shots/${filnamn}` })
  return rapport
}

const r1 = await ritaSida(IDS.slice(0, 2), 'natskott-hustyper.png')
const r2 = await ritaSida(IDS.slice(2, 4), 'natskott-hustyper2.png')
const r3 = await ritaSida(IDS.slice(4), 'natskott-hustyper3.png')
const r4 = await ritaSida([IDS[2], IDS[4]], 'natskott-hustyper-krossad.png', { krossa: true })

// ---- Kontraktskontroll -----------------------------------------------------
let fel = 0
const GRANS = 420
for (const h of [...r1, ...r2, ...r3, ...r4]) {
  const rader = []
  if (h.topY < 180 || h.topY > 400) rader.push(`topY ${h.topY} utanför 180–400`)
  if (h.bw < 190 || h.bw > 290) rader.push(`bw ${h.bw} utanför 190–290`)
  if (!h.fonster.length) rader.push('INGA krossbara fönster')
  if (h.kastade) rader.push(`${h.kastade} fönsterspec föll på kontraktsvakten`)
  for (const f of h.fonster) {
    if (f.cy > GRANS) rader.push(`fönster cy ${f.cy} > ${GRANS}`)
    if (f.cy - f.h / 2 < h.topY) rader.push(`fönster ovanför taket (cy ${f.cy}, topY ${h.topY})`)
    if (f.lx - f.w / 2 < h.gap) rader.push(`fönster utanför vänsterkant (lx ${f.lx})`)
    if (f.lx + f.w / 2 > h.gap + h.bw) rader.push(`fönster utanför högerkant (lx ${f.lx})`)
  }
  // 555 + halva konturbredden (3 px) = 557 är väggens egen stroke, inte ett fel
  if (h.rita.y1 > 558) rader.push(`ritar ner till y=${h.rita.y1} (under trottoarkanten 555)`)
  if (h.rita.x0 < -10) rader.push(`ritar till x=${h.rita.x0} (utanför segmentet)`)
  const status = rader.length ? '✗' : '✓'
  if (rader.length) fel += rader.length
  console.log(
    `${status} ${h.id.padEnd(14)} bw=${String(h.bw).padStart(3)} topY=${String(h.topY).padStart(3)} ` +
      `rutor=${h.fonster.length} (cy ${h.fonster.map((f) => f.cy).join(',')}) ` +
      `ritad ${h.rita.x0}..${h.rita.x1} × ${h.rita.y0}..${h.rita.y1}` +
      (rader.length ? '\n    ' + rader.join('\n    ') : '')
  )
}

// ---------------------------------------------------------------------------
// LIVE: kör spelet på riktigt med butiksgrenen inkopplad i _mkMidSeg (exakt
// den integration jag rekommenderar), så återvinning, krukor i fönsterbleck,
// fönstermonster och Text-skapandet varje ~2 s prövas i drift.
// ---------------------------------------------------------------------------
console.log('\n--- live-körning med butiksgrenen inkopplad ---')
await page.evaluate(() => {
  const m = window.__natdbg
  for (const [k, v] of Object.entries(window.__husOrig)) m[k] = v
})
await page.evaluate((gid) => window.__barnspel.nav.go('library'), ID)
await page.waitForTimeout(700)
await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
await page.waitForTimeout(1200)

const before = errors.length
await page.evaluate(async ({ modUrl, andel }) => {
  const m = window.__natdbg
  const mod = await import(modUrl)
  const { Container, Graphics } = mod
  const rnd = (a, b) => a + Math.random() * (b - a)
  window.__husRakning = {}
  m._mkMidSeg = function (ctx, bt, seeded = false) {
    const c = new Container()
    c.eventMode = 'none'
    const g = new Graphics()
    const gap = rnd(36, 110)
    const wins = []
    let bw
    if (Math.random() < andel) {
      const hus = mod.ritaHus(g, gap, null, { c })
      bw = hus.bw
      for (const f of hus.fonster) wins.push(this._mkWindow(c, f.lx, f.cy, f.w, f.h, f.frame))
      window.__husRakning[hus.id] = (window.__husRakning[hus.id] || 0) + 1
      if (hus.fonsterKastade.length) window.__husRakning.KASTADE = (window.__husRakning.KASTADE || 0) + hus.fonsterKastade.length
    } else {
      bw = rnd(190, 250)
      const bh = rnd(285, 370)
      const topY = 555 - bh
      g.rect(gap, topY, bw, bh).fill(0x9aa3b5)
      wins.push(this._mkWindow(c, gap + bw / 2, topY + 56, 46, 56, 0x6b727e))
    }
    g.eventMode = 'none'
    c.addChildAt(g, 0)
    const w = gap + bw + rnd(10, 30)
    const seg = { c, w, wins }
    if (!seeded && ctx && this._targets.length < 7 && wins.length && Math.random() < 0.4 && this._phase === 'drive') {
      seg._wxPotAt = wins[(Math.random() * wins.length) | 0]
    }
    return seg
  }
}, { modUrl: '/scripts/_husprobe-mod.js?t=' + Date.now(), andel: 1 })

// kör gaspedalen: tryck i mitten några gånger och låt gatan rulla
const canvasar = await page.locator('canvas').all()
const yta = canvasar[canvasar.length - 1]
for (let i = 0; i < 14; i++) {
  await yta.click({ position: { x: 300 + ((i * 61) % 600), y: 260 + ((i * 37) % 200) }, force: true })
  await page.waitForTimeout(900)
}
await page.screenshot({ path: '.test-shots/natskott-hustyper-live.png' })
const rakning = await page.evaluate(() => window.__husRakning)
const status = await page.evaluate(() => {
  const m = window.__natdbg
  if (!m) return { fel: 'window.__natdbg saknas — sidan laddades om under körningen' }
  return {
    mid: m._mid.length,
    rutor: m._mid.reduce((n, s) => n + s.wins.length, 0),
    mal: m._targets.length,
    resa: Math.round(m._journey),
  }
})
console.log('hus byggda under körningen:', JSON.stringify(rakning))
console.log('läge efter körning:', JSON.stringify(status))

// exit-cykel mitt i rullningen: ut och in två gånger
for (let i = 0; i < 2; i++) {
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(500)
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(900)
}
await page.waitForTimeout(600)
const efter = errors.length - before
console.log(efter ? `✗ ${efter} konsolfel i live-körningen: ${errors[errors.length - 1]}` : '✓ live-körning + exit-cykel: 0 konsolfel')
if (rakning.KASTADE) {
  console.log(`✗ ${rakning.KASTADE} fönsterspec föll på kontraktsvakten under körningen`)
  fel += rakning.KASTADE
}
if (status.fel) {
  console.log('✗ ' + status.fel)
  fel++
}
if (!status.fel && !status.rutor) {
  console.log('✗ inga krossbara rutor kvar i kulissen efter körningen')
  fel++
}

console.log(errors.length ? `\n✗ ${errors.length} konsolfel totalt: ${errors[0]}` : '\n✓ 0 konsolfel')
console.log(fel ? `✗ ${fel} kontraktsbrott` : '✓ kontraktet håller')
await browser.close()
try {
  unlinkSync(MOD)
} catch {}
process.exit(errors.length || fel ? 1 : 0)
