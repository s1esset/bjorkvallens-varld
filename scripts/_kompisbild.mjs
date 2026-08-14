// Bild på `bygg-en-kompis` UTAN att spelet finns i registret. Monterar modulen med en
// stub-ctx i gateLayer, cyklar en del i taget och tar en skärmdump per läge — plus en
// bild mitt i fotograferingen och en exit-koll (destroy mitt i finishen).
//
//   node scripts/_kompisbild.mjs --url http://localhost:5173
//   node scripts/_kompisbild.mjs --del ogon        (cykla en annan del)
//
// Kräver dev-servern. Varje ruta är HELA skärmen, för det är layouten (träffytor,
// krockar med skalets hem-/högtalarknapp) som inte går att bedöma i tal.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const url = opt('--url', 'http://localhost:5173')
const del = opt('--del', 'kropp')
const varv = Number(opt('--varv', '6'))
const galleri = Number(opt('--galleri', '0')) // så många sparade kompisar på väggen
const exitVid = Number(opt('--exitvid', '0')) // exit N sekunder in i finishen
const vila = Number(opt('--vila', '0')) // stå still i N sekunder (om-cue + fjäril)
mkdirSync('.test-shots', { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 220)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 220)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(600)

  await page.evaluate(async (antal) => {
    const s = window.__barnspel
    const r = (n) => (Math.random() * n) | 0
    window.__galleri = Array.from({ length: antal }, () => ({
      kropp: r(6), ogon: r(6), mun: r(6), topp: r(6), farg: r(10), storlek: r(3),
    }))
    const mod = await import('/src/games/bygg-en-kompis/index.js')
    const spel = mod.default
    // Dölj bibliotekets egen bild, annars ligger den under.
    // Dölj bibliotekets skärm (world.children[0] = screenHolder) — INTE hela world,
    // som också bär gateLayer där spelet monteras.
    const skarmar = s.world.children[0]
    if (skarmar) skarmar.visible = false
    const timers = new Set()
    const ctx = {
      stage: s.gateLayer,
      ticker: s.app.ticker,
      width: 1280,
      height: 720,
      view: s.scaler.view,
      services: s,
      fxLayer: s.fxLayer,
      exitToLibrary() {},
      later(d, fn) {
        const id = setTimeout(() => { timers.delete(id); fn() }, d * 1000)
        timers.add(id)
        return { kill: () => clearTimeout(id) }
      },
      progress: {
        get: () => ({ unlocked: true, highestLevel: 12, stars: 0, custom: { galleri: window.__galleri || [] } }),
        update() {}, setLevel() {}, addStars() {}, setCustom() {}, complete() {},
      },
    }
    window.__kompis = { spel, ctx, timers }
    await spel.init(ctx)
    await spel.mount(ctx)
  }, galleri)

  await page.waitForTimeout(900)
  await page.screenshot({ path: `.test-shots/kompis-0.png` })

  if (vila > 0) {
    // Stilla-läget: om-cue vid 7 s, andra cuen vid 14 s, bus-fjärilen vid 22 s. Inget
    // av det får spela mot en riven nod eller lämna en knapp uppblåst.
    await page.waitForTimeout(vila * 1000)
    await page.screenshot({ path: '.test-shots/kompis-vila.png' })
    const skalor = await page.evaluate(() => {
      const s = window.__kompis.spel
      return {
        knappskalor: s._knappar.filter((k) => k.scale).map((k) => Number(k.scale.x.toFixed(3))),
        fjaril: !!s._fjaril,
        idle: Number(s._idle.toFixed(1)),
      }
    })
    console.log('vila:', JSON.stringify(skalor))
  }

  for (let i = 1; i < varv; i++) {
    await page.evaluate((d) => {
      const { spel, ctx } = window.__kompis
      spel._byt(ctx, d, 1)
    }, del)
    await page.waitForTimeout(520)
    await page.screenshot({ path: `.test-shots/kompis-${i}.png` })
  }

  if (args.includes('--fjaril')) {
    // Bus-fjärilen: flyger in, sätter sig på huvudet, och ETT tryck räcker.
    await page.evaluate(() => window.__kompis.spel._slappFjaril(window.__kompis.ctx))
    await page.waitForTimeout(1600)
    await page.screenshot({ path: '.test-shots/kompis-fjaril.png' })
    await page.evaluate(() => window.__kompis.spel._fjarilBort(window.__kompis.ctx, true))
    await page.waitForTimeout(400)
    await page.screenshot({ path: '.test-shots/kompis-fjaril-bort.png' })
    await page.waitForTimeout(600)
  }

  // Finishen: kompisen blir levande → blixt → ramen upp på väggen.
  await page.evaluate(() => window.__kompis.spel._fotografera(window.__kompis.ctx))
  if (exitVid > 0) {
    // Exit vid en VALD tidpunkt i finishen (blixten, flykten, spikningen) — det är
    // olika tweens som lever i varje skede.
    await page.waitForTimeout(exitVid * 1000)
  } else {
    await page.waitForTimeout(700)
    await page.screenshot({ path: '.test-shots/kompis-finish1.png' })
    await page.waitForTimeout(1400)
    await page.screenshot({ path: '.test-shots/kompis-finish2.png' })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: '.test-shots/kompis-finish3.png' })
  }

  // Exit MITT i finishen — den farligaste stunden.
  await page.evaluate(() => {
    const { spel, ctx, timers } = window.__kompis
    for (const t of timers) clearTimeout(t)
    timers.clear()
    spel.destroy(ctx)
  })
  await page.waitForTimeout(900)

  console.log(fel.length ? `✗ ${fel.length} konsolfel:` : '✓ 0 konsolfel')
  for (const f of fel.slice(0, 12)) console.log('   ' + f)
  console.log('bilder: .test-shots/kompis-*.png')
} finally {
  await browser.close()
}
