// TVÄTTA DJURET — går det gömda fyndet att HITTA, syns det, och hinner man se det?
//
//   node scripts/_fyndprobe.mjs [--cpu 4] [--bild]     (kräver dev-servern på :5173)
//
// Fem frågor, var för sig — de går sönder oberoende av varandra:
//
//   1. GÖMMAN FINNS, och exakt EN per djur. Aldrig två (en sällsynthet som kan komma i par
//      är ingen sällsynthet — samma regel som guldfrukten i `fanga-frukten`).
//   2. GÖMMAN LIGGER RÄTT: under TORR lera (kladd kräver duschen först — då vore fyndet
//      låst bakom ett hinder) och aldrig innanför den lerfria ansiktsrutan.
//   3. FYNDET SYNS. Målade pixlar i fyndlagret — isolerat HELA vägen till roten. En
//      isolering som stannar i spelets root mäter skalets egen bakknapp och är grön även
//      när effekten saknas (uppmätt i `_tunnprobe`: 16 320 px i båda armarna).
//   4. FYNDET HINNER SES. Livslängd från födsel till borttagning ≥ 1,5 s. Ett sällsynt
//      ögonblick som far förbi är ingen belöning, det är en miss barnet inte kunde påverka.
//   5. TELLEN. Gömstället ska glimma till med jämna mellanrum, annars är fyndet en slump
//      och inte en upptäckt. Mäts i BÅDA ändar: att drivningen nollställs (räknaren) OCH
//      att något faktiskt målas i fx-lagret (`sparkle` går via ParticleContainer, så
//      `fxLayer.children` säger ingenting — CLAUDE.md).
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import fs from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const CPU = Number(opt('--cpu', 4))
const BILD = args.includes('--bild')

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const n1 = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(1) : String(v))
const malade = (buf, ruta = null) => {
  const p = PNG.sync.read(buf)
  const bg = [p.data[0], p.data[1], p.data[2]]
  let n = 0
  for (let y = 0; y < p.height; y++) {
    if (ruta && (y < ruta.y0 || y > ruta.y1)) continue
    for (let x = 0; x < p.width; x++) {
      if (ruta && (x < ruta.x0 || x > ruta.x1)) continue
      const i = (y * p.width + x) * 4
      if (Math.abs(p.data[i] - bg[0]) + Math.abs(p.data[i + 1] - bg[1]) + Math.abs(p.data[i + 2] - bg[2]) > 24) n++
    }
  }
  return n
}
// Designkoordinat → skärmpixel (1280x720-vy, Math.min-letterbox utan marginal här).
const ruta = (x, y, r) => ({ x0: Math.max(0, x - r), x1: x + r, y0: Math.max(0, y - r), y1: y + r })

// Isolering som SPELET självt inte kan lura: dölj varje syskon hela vägen upp till roten.
const ISOLERA = `(valj) => {
  const g = window.__barnspel.game
  const nod0 = valj === 'fynd' ? g._findLayer : window.__barnspel.ctx.fxLayer
  if (!nod0 || nod0.destroyed) return false
  g._sparIso = []
  let nod = nod0
  while (nod.parent) {
    for (const syskon of nod.parent.children) {
      if (syskon === nod) continue
      g._sparIso.push([syskon, syskon.visible])
      syskon.visible = false
    }
    nod = nod.parent
  }
  return true
}`
const ATERSTALL = `() => {
  const g = window.__barnspel.game
  for (const [c, v] of g?._sparIso || []) if (!c.destroyed) c.visible = v
  if (g) g._sparIso = null
}`

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'tvatta-djuret' }))
  await page.waitForFunction(() => (window.__barnspel.game?._flakes || []).length > 0, null, { timeout: 20000 })
  await page.waitForTimeout(1200)

  console.log(`\nTVÄTTA DJURET — det gömda fyndet (CPU x${CPU})\n`)

  // --- 1+2: gömman över flera djur (nivåerna 0–5, alltså med och utan kladd) --------
  const gommor = await page.evaluate(async () => {
    const app = window.__barnspel
    const g = app.game
    const sov = (ms) => new Promise((r) => setTimeout(r, ms))
    const rader = []
    for (let lvl = 0; lvl < 6; lvl++) {
      g._level = lvl
      g._buildAnimal(app.ctx)
      await sov(260)
      const f = g._findFlake
      rader.push({
        lvl,
        klumpar: g._flakes.length,
        harGomma: !!f,
        antalGommor: g._flakes.filter((x) => x === g._findFlake).length,
        sort: f ? f.kind : '-',
        ansiktsAvst: f ? Math.round(Math.hypot(f.x - 470, f.y - 330)) : -1,
        nyckel: g._findKey || '-',
      })
    }
    return rader
  })
  for (const r of gommor) {
    console.log(`  nivå ${r.lvl}: ${String(r.klumpar).padStart(3)} klumpar · gömma ${r.harGomma ? 'JA' : 'nej'} · ${r.sort} · ${r.ansiktsAvst} px från ansiktet · ${r.nyckel}`)
  }
  ok('1. en gömma per djur', gommor.every((r) => r.harGomma), `${gommor.filter((r) => r.harGomma).length} av ${gommor.length} djur`)
  ok('1b. aldrig två', gommor.every((r) => r.antalGommor <= 1), 'högst 1 klump bär fyndet')
  ok('2. gömman är TORR lera', gommor.every((r) => r.sort === 'torr'), 'aldrig under kladd (som kräver duschen först)')
  ok('2b. aldrig på ansiktet', gommor.every((r) => r.ansiktsAvst >= 82), `närmast ${Math.min(...gommor.map((r) => r.ansiktsAvst))} px (lerfri ruta = 82)`)

  // --- 5: tellen — drivningen nollställs, och något MÅLAS ---------------------------
  // ⚠️ Idle-vinken och auto-hjälpen målar OCKSÅ i fx-lagret (ripple/puff) efter 6 respektive
  // 9 s stillhet. Med dem igång var pixeltalet nedan grönt på HEAD, där tellen inte fanns —
  // det mätte spelets egen hjälp. Bada räknarna nollställs därför genom hela mätningen, så
  // det enda som kan måla i fx-lagret är glimten.
  const drivning = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const sov = (ms) => new Promise((r) => setTimeout(r, ms))
    let nollor = 0
    let forra = g._findGlim
    for (let i = 0; i < 55; i++) {
      await sov(100)
      g._idle = 0
      g._noProgress = 0
      if (g._findGlim < forra - 200) nollor++
      forra = g._findGlim
    }
    return nollor
  })
  ok('5. tellen drivs', drivning >= 2, `${drivning} glimtar på 5,5 s`)

  // ⚠️ Misslyckas isoleringen är bilden HELA scenen — då blir varje pixeltal grönt av sig
  // självt. Räknas som 0, aldrig som en mätning.
  // ⚠️ Och NIVÅN duger inte heller. Fx-lagret är DELAT: badets stigande tvålbubblor lägger
  // egna puffar där varje bildruta (`index.js:1039`), och lagret bär dessutom ett återanvänt
  // `ParticleContainer` med parkerade partiklar — 1 988 px målades på HEAD helt utan tell,
  // och svängningen över hela lagret var 3 118 px av bara bubblor. Mätningen sker därför i
  // en RUTA runt gömstället, och svängningen (max − min) är det enda som räknas.
  const gomma = await page.evaluate(() => {
    const f = window.__barnspel.game?._findFlake
    return f ? { x: Math.round(f.x), y: Math.round(f.y) } : null
  })
  const fxIso = gomma ? await page.evaluate(new Function(`return ${ISOLERA}`)(), 'fx') : false
  const fxProv = []
  if (fxIso) {
    const r = ruta(gomma.x, gomma.y, 90)
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(110)
      await page.evaluate(() => { const g = window.__barnspel.game; if (g) { g._idle = 0; g._noProgress = 0 } })
      fxProv.push(malade(await page.screenshot(), r))
    }
  }
  await page.evaluate(new Function(`return ${ATERSTALL}`)())
  const fxSving = fxProv.length ? Math.max(...fxProv) - Math.min(...fxProv) : 0
  ok(
    '5b. tellen målar vid gömstället',
    fxIso && fxSving > 200,
    gomma ? `svängning ${fxSving} px i rutan runt ${gomma.x},${gomma.y} (${Math.min(...fxProv)} → ${Math.max(...fxProv)})` : 'ingen gömma att mäta vid',
  )

  // --- 3+4: avslöjandet ------------------------------------------------------------
  const start = await page.evaluate(() => {
    const app = window.__barnspel
    const g = app.game
    const f = g._findFlake
    if (!f) return null
    g._removeFlake(app.ctx, f)
    return { x: Math.round(f.x), y: Math.round(f.y), t: performance.now() }
  })
  ok('3a. avslöjandet startar', !!start, start ? `klump vid ${start.x},${start.y}` : 'ingen gömma att avslöja')

  await page.waitForTimeout(900) // fyndet uppe i full skala
  const fyndIso = await page.evaluate(new Function(`return ${ISOLERA}`)(), 'fynd')
  await page.waitForTimeout(140)
  const fyndBild = fyndIso ? await page.screenshot() : null
  await page.evaluate(new Function(`return ${ATERSTALL}`)())
  if (BILD && fyndBild) fs.writeFileSync('.test-shots/_fyndprobe-fynd.png', fyndBild)
  const fyndPx = fyndBild ? malade(fyndBild) : 0
  ok('3. fyndet syns', fyndPx > 1500, fyndIso ? `${fyndPx} målade pixlar (allt annat dolt till roten)` : 'inget fyndlager att isolera')

  if (BILD) fs.writeFileSync('.test-shots/_fyndprobe-scen.png', await page.screenshot())

  const liv = await page.evaluate(async (t0) => {
    const g = window.__barnspel.game
    const sov = (ms) => new Promise((r) => setTimeout(r, ms))
    for (let i = 0; i < 60; i++) {
      if (!g._findView) break
      await sov(100)
    }
    return { ms: Math.round(performance.now() - t0), kvar: g._findLayer ? g._findLayer.children.length : -1 }
  }, start?.t || 0)
  // Utan `start` mäter `liv.ms` tiden sedan sidladdningen — ett stort tal som ser grönt ut
  // fast ingenting föddes. Kravet är BÅDE att avslöjandet startade och att det tog rimlig tid.
  ok('4. fyndet hinner ses', !!start && liv.ms >= 1500 && liv.ms < 8000, start ? `${liv.ms} ms från lerklumpen till borta` : 'inget avslöjande att mäta')
  ok('4b. fyndlagret städas', liv.kvar === 0, `${liv.kvar} barn kvar`)

  // --- exit mitt i avslöjandet -----------------------------------------------------
  await page.evaluate(() => {
    const app = window.__barnspel
    const g = app.game
    g._level = 3
    g._buildAnimal(app.ctx)
    if (g._findFlake) g._removeFlake(app.ctx, g._findFlake)
  })
  await page.waitForTimeout(280) // mitt i uppfarten
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1100)
  ok('exit mitt i avslöjandet', errors.length === 0, errors.length ? errors.slice(0, 3).join(' | ') : 'inga konsolfel')

  console.log(`\n${fel === 0 ? '✅ ALLA GRÖNA' : `❌ ${fel} röda`}\n`)
  process.exitCode = fel ? 1 : 0
} finally {
  await browser.close()
}
void n1
