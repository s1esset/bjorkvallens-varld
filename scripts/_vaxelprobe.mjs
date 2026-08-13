// VÄXLARNA i mata-munnen (polera-omgången v1.198): ger stationerna VARIATION på riktigt?
//
//   1. Fönstret ska rotera fågel → fjäril → regnbåge (en rotation, inte en lottning).
//   2. Kastrullen ska koka över efter ~9 s med spisen på — och ALDRIG med spisen av.
//   3. En tugga ska visa en SKYMT av matens färg mellan tänderna, som försvinner igen.
//   4. Geggan ska TRAPPA: femte fläcken ger 'skratt', inte platsvalets vanliga min.
//
// Allt läses ur TILLSTÅND (visible/alpha/räknare/aktiv min), inte pixlar — och varje rad
// har sin kontrollarm FÖRST: stängd spis ackumulerar inte, ingen skymt före tugget, andra
// fläcken ger 'forvanad' innan femte ger 'skratt'.
//
//   node scripts/_vaxelprobe.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

mkdirSync('.test-shots', { recursive: true })
const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'

let rader = 0
let grona = 0
const fel = []
const kolla = (n, ok, t) => { rader++; if (ok) grona++; console.log(`  ${ok ? '✓' : '✗'} ${n.padEnd(40)} ${t}`) }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()) })
page.on('pageerror', (e) => fel.push(String(e)))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'mata-munnen' }))
await page.waitForTimeout(2600)

const koord = await page.evaluate(async () => {
  const { STATIONER, ANS } = await import('/src/games/mata-munnen/kok.js')
  const c = (id) => {
    const s = STATIONER.find((x) => x.id === id)
    return { x: Math.round(s.yta.x + s.yta.w / 2), y: Math.round(s.yta.y + s.yta.h / 2) }
  }
  const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
  return { fonster: c('fonster'), spis: c('spis'), ANS, munY: Math.round(g._munY) }
})

const las = () => page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
  const n = g._noder || {}
  const munY = g._munY
  const skymt = (g._matL?.children || []).filter((c) =>
    c !== g._mun && c.visible && Math.abs(c.x - 620) < 2 && Math.abs(c.y - (munY + 6)) < 2)
  const aktiv = g._ans?._aktivMin
  const minNamn = aktiv ? (Object.entries(g._ans._miner || {}).find(([, s]) => s === aktiv)?.[0] ?? null) : null
  return {
    fagel: !!n.fagel?.visible,
    fjaril: !!n.fjaril?.visible,
    vinge: n.fjaril?.vingar?.[0] ? Math.round(n.fjaril.vingar[0].rotation * 100) / 100 : null,
    regnbage: !!n.regnbage?.visible,
    regnAlpha: Math.round((n.regnbage?.alpha ?? 0) * 100) / 100,
    kokT: Math.round(g._kokOverT || 0),
    spisPa: !!g._spisPa,
    skymt: skymt.length,
    minNamn,
    geggor: (g._geggor || []).length,
    mat: (g._mat || []).filter((r) => !r._uppaten && r.data.atbar !== false)
      .map((r) => ({ key: r.data.key, min: r.data.min, x: Math.round(r.view.x), y: Math.round(r.view.y) })),
  }
})

const grip = async (p) => { await page.mouse.move(p.x, p.y); await page.mouse.down() }
const till = async (p, steg = 10) => {
  for (let i = 1; i <= steg; i++) {
    await page.mouse.move(p.x, p.y, { steps: 1 })
    await page.waitForTimeout(16)
  }
}
const dra = async (fran, tillP) => {
  await grip(fran)
  const steg = 12
  for (let i = 1; i <= steg; i++) {
    await page.mouse.move(fran.x + (tillP.x - fran.x) * (i / steg), fran.y + (tillP.y - fran.y) * (i / steg))
    await page.waitForTimeout(18)
  }
  await page.mouse.up()
}

// ---- 1. FÖNSTRETS ROTATION --------------------------------------------------
const start = await las()
kolla('KONTROLL: allt släckt före tryck', !start.fagel && !start.fjaril && !start.regnbage,
  `fågel ${start.fagel} · fjäril ${start.fjaril} · regnbåge ${start.regnbage}`)

await page.mouse.click(koord.fonster.x, koord.fonster.y)
await page.waitForTimeout(600)
const v1 = await las()
kolla('tryck 1 → FÅGELN', v1.fagel && !v1.fjaril && !v1.regnbage, `fågel ${v1.fagel}`)
await page.waitForTimeout(3400)

await page.mouse.click(koord.fonster.x, koord.fonster.y)
await page.waitForTimeout(700)
const v2 = await las()
const vingeA = v2.vinge
await page.waitForTimeout(160)
const v2b = await las()
kolla('tryck 2 → FJÄRILEN', v2.fjaril && !v2.regnbage, `fjäril ${v2.fjaril}`)
kolla('fjärilens vingar SLÅR', vingeA != null && v2b.vinge != null && vingeA !== v2b.vinge,
  `${vingeA} → ${v2b.vinge} rad`)
await page.screenshot({ path: '.test-shots/_vaxelprobe-fjaril.png' })
await page.waitForTimeout(3400)

await page.mouse.click(koord.fonster.x, koord.fonster.y)
await page.waitForTimeout(800)
const v3 = await las()
kolla('tryck 3 → REGNBÅGEN', v3.regnbage && v3.regnAlpha > 0.5, `synlig ${v3.regnbage} · alpha ${v3.regnAlpha}`)
await page.screenshot({ path: '.test-shots/_vaxelprobe-regnbage.png' })
await page.waitForTimeout(3400)
const v3b = await las()
kolla('regnbågen släcks av sig själv', !v3b.regnbage, `synlig ${v3b.regnbage}`)

// ---- 2. KOKAR ÖVER ----------------------------------------------------------
// Kontrollarm FÖRST: med spisen AV ska räknaren stå still på 0.
await page.waitForTimeout(1500)
const kallt = await las()
kolla('KONTROLL: spis av → räknaren 0', !kallt.spisPa && kallt.kokT === 0, `på ${kallt.spisPa} · T ${kallt.kokT}`)

await page.mouse.click(koord.spis.x, koord.spis.y)
await page.waitForTimeout(8300)
const varmt = await las()
kolla('spis på 8,3 s → räknaren laddar', varmt.spisPa && varmt.kokT > 6800, `T ${varmt.kokT} (mål >6800)`)
await page.waitForTimeout(1600)
const over = await las()
kolla('vid ~9 s KOKAR DET ÖVER (räknaren nollas)', over.kokT < 2200, `T ${varmt.kokT} → ${over.kokT}`)
await page.mouse.click(koord.spis.x, koord.spis.y) // stäng av igen

// ---- 3. SKYMTEN I TUGGET ----------------------------------------------------
const fore = await las()
kolla('KONTROLL: ingen skymt före tugget', fore.skymt === 0, `${fore.skymt} noder vid munnen`)
const bit = fore.mat.find((m) => m.y > 440) // en bit på brädan
if (bit) {
  await dra(bit, { x: 620, y: koord.munY })
  await page.waitForTimeout(600)
  const tugg = await las()
  kolla('skymt av maten mellan tänderna', tugg.skymt >= 1, `${tugg.skymt} nod (bit: ${bit.key})`)
  await page.waitForTimeout(1700)
  const efter = await las()
  kolla('skymten sväljs och städas', efter.skymt === 0, `${efter.skymt} noder kvar`)
} else {
  kolla('skymt: hittade en bit på brädan', false, `brädan: ${fore.mat.map((m) => m.key).join(' ')}`)
}

// ---- 4. GEGGAN TRAPPAR ------------------------------------------------------
// Kinden (760, 310): >130 px från munnen, under ögonlinjen, innanför bus-ellipsen.
// Platsvalet ger där 'forvanad' — utom för saker med egen stark min, som filtreras bort.
const KIND = { x: 760, y: 310 }
// Läs minen DIREKT efter varje LYCKAD fläck (geggor steg), inte på ett fast varvindex —
// ett misslyckat grepp emellan (påfyllningen flyttar brädan) gav annars en läsning efter
// att minen redan släppts (hall 1,3 s): `min null` utan att något var fel i spelet.
let kontrollMin = null
let femteMin = null
let forra = (await las()).geggor
for (let i = 0; i < 8 && femteMin == null; i++) {
  const s = await las()
  const m = s.mat.find((r) => r.y > 440 && r.min !== 'aj' && r.min !== 'acklad')
  if (!m) break
  await dra(m, KIND)
  await page.waitForTimeout(450)
  const efter = await las()
  if (efter.geggor > forra) {
    if (efter.geggor >= 5) femteMin = efter.minNamn
    else if (!kontrollMin && efter.minNamn) kontrollMin = efter.minNamn
  }
  forra = efter.geggor
  await page.waitForTimeout(650)
}
kolla('KONTROLL: tidig fläck ger platsvalets min', kontrollMin === 'forvanad', `min ${kontrollMin}`)
kolla('femte fläcken TRAPPAR till skratt', femteMin === 'skratt', `min ${femteMin}`)

// ---- exit mitt i alltihop ---------------------------------------------------
await page.mouse.click(koord.spis.x, koord.spis.y)
await page.mouse.click(koord.fonster.x, koord.fonster.y)
await page.waitForTimeout(300)
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(1400)
kolla('exit mitt i växlarna är ren', fel.length === 0, fel.length ? fel.slice(0, 2).join(' | ') : '0 konsolfel')

await browser.close()
console.log(`\n  ${grona}/${rader} gröna · bilder: .test-shots/_vaxelprobe-fjaril.png · -regnbage.png\n`)
process.exit(grona === rader ? 0 : 1)
