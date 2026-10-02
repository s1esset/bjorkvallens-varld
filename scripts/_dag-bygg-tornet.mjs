// BYGG-TORNET i riktig webbläsare — gungar tornet, och RASAR det aldrig? (F1, dag 2026-10-02 D9 B3)
//
//   node scripts/_dag-bygg-tornet.mjs [--url http://localhost:5173] [--antal 20] [--rundor 2]
//                                     [--sikte jamn|ensidig] [--niva 3] [--kontroll] [--frö 1]
//
// Spelar spelets HUVUDKONTROLL med riktiga muspekningar: tryck var som helst på skärmen släpper kranens kloss
// DÄR (x = trycket, y spelar ingen roll — `_catcher` täcker hela 1280×720). Klossarna läggs ÖTÅLIGT: så fort
// spelet tillåter en ny väntande kloss (`g._phase === 'carry'`) trycks det direkt, och mellan klossarna
// hamras det på skärmen (tryck under fall/firande ger bara en puff, som hos ett otåligt barn).
//
// En RUNDA = `--antal` (20) lagda klossar i följd av torn (spelets tak är 7 klossar per torn → 7+7+6),
// med kransens släpp mellan. `--rundor 2` spelar två rundor; mellan dem lämnas spelet och startas om
// (återspelssäkerhet: samma modulinstans, nytt `init`). Sist avslutas mitt i ett gung (exit-säkerhet).
//
// Mäter per bildruta, i sidan (rAF): sockelns vinkel (= tornets lutning), varje lagd klossens läge mot var den
// låstes (vridet med sockeln), högsta tornhöjd, och om NÅGON kloss lämnat tornet:
//   lutning    högsta |sockelvinkel| i grader                      ← kravet: svajar (>0°) men rasar aldrig
//   toppSvaj   största förflyttning i px hos någon lagd kloss efter att den låsts
//   hojd       högsta tornhöjd i px (klossar × 64) och i klossar
//   lamnat     antal klossar som lämnat tornet (> 30 px från sin stela plats, under marken, eller utanför ±420)
//   vikt       antal klossar vars vinkel mot tornet ändrats > 0,1 rad sedan låsningen (en led som gett vika)
//   avvisade   fallna klossar som inte blev lagda (puffades bort) — ungefärligt: kranens egen hjälp-kloss räknas som lagd, inte fallen
//   svajTid    andel av bildrutorna efter första klossen då |lutning| > 0,5° (tornet ser ut att gunga)
//
// KONTROLLARM `--kontroll`: klossen låses STATISK som dagens HEAD (`stod.lagg` ersätts med Body.setStatic, ingen
// stöt) ← ska ge lutning 0,00° och toppSvaj ~0 (≤ 2 px). Utan flaggan (nya stödet) ska lutning vara > 0,5° och
// lamnat 0, vikt 0.
//
// Släppkontrollen: hela skärmen (0–1280 × 0–720), kranklossens x = trycket klampat till 119–1161.
// ⚠️ Kör aldrig två webbläsarsonder samtidigt. Kräver dev-servern på :5173.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i < 0 ? d : argv[i + 1] }
const har = (n) => argv.includes('--' + n)
const URL_ = opt('url', 'http://localhost:5173')
const ANTAL = +opt('antal', 20)
const RUNDOR = +opt('rundor', 2)
const SIKTE = opt('sikte', 'jamn')
const NIVA = +opt('niva', 3) // 3 → 7 klossar per torn (spelets tak)
const KONTROLL = har('kontroll')
const FRO = +opt('frö', 1)

const mulberry = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto(URL_, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  const gaIn = async () => {
    await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'bygg-tornet' }))
    await page.waitForFunction(() => window.__barnspel.game?._phys && window.__barnspel.game?._stod, null, { timeout: 15000 })
    await page.waitForTimeout(1200)
    // Nivå: spelets tak (7 klossar per torn) från början, så rundan inte måste börja med fyra.
    await page.evaluate((niva) => {
      const g = window.__barnspel.game
      const ctx = window.__barnspel.ctx
      if (g._level < niva) { g._level = niva; g._newTower(ctx) }
    }, NIVA)
    if (KONTROLL) {
      // HEAD-beteendet: klossen låses statisk, ingen stöt.
      await page.evaluate(async () => {
        const g = window.__barnspel.game
        const { Body } = await import('/src/lib/physics.js')
        g._stod.lagg = (body) => { Body.setStatic(body, true) } // inte i stödets lista: en statisk kropp har oändlig tröghet
        g._stod.slag = () => 0
      })
    }
  }

  // Sidans mätare: en rAF-loop som skriver till window.__bt tills den stoppas.
  const startaMatare = () => page.evaluate(() => {
    const GROUND = 604
    const BH = 64
    const bt = (window.__bt = {
      kor: true, frames: 0, svajFrames: 0, maxTh: 0, maxSvaj: 0, hojd: 0, hojdKl: 0, sedda: new WeakMap(), antalSedda: 0,
      lamnat: new Set(), vikt: new Set(), drops: new WeakSet(), antalDrops: 0, torn: 0, sistaLevel: window.__barnspel.game._level, maxTopp: 0,
    })
    const steg = () => {
      if (!bt.kor) return
      const g = window.__barnspel.game
      const stod = g?._stod
      if (g && stod && !g._phys?.destroyed) {
        const th = stod.vinkel
        bt.frames++
        if (g._active?.body && !bt.drops.has(g._active.body) && g._phase === 'fall') { bt.drops.add(g._active.body); bt.antalDrops++ }
        if (g._level !== bt.sistaLevel) { bt.torn++; bt.sistaLevel = g._level }
        const placed = g._placed || []
        if (placed.length || bt.antalSedda) {
          if (Math.abs(th) > 0.5 * Math.PI / 180) bt.svajFrames++
          bt.maxTh = Math.max(bt.maxTh, Math.abs(th))
        }
        let hojd = 0
        placed.forEach((blk, i) => {
          const b = blk.body
          let s = bt.sedda.get(b)
          if (!s) {
            s = { n: 1, x: b.position.x, y: b.position.y, a: b.angle, th, id: ++bt.antalSedda }
            bt.sedda.set(b, s)
          } else if (s.n === 1) {
            // läget ETT steg efter låsningen (kontaktlösaren har satt sig)
            s.n = 2; s.x = b.position.x; s.y = b.position.y; s.a = b.angle; s.th = th
          } else {
            const d = th - s.th
            const c = Math.cos(d), sn = Math.sin(d)
            const rx = s.x - stod.px, ry = s.y - stod.py
            const ex = stod.px + rx * c - ry * sn
            const ey = stod.py + rx * sn + ry * c
            const dev = Math.hypot(b.position.x - ex, b.position.y - ey)
            const fran = Math.hypot(b.position.x - s.x, b.position.y - s.y)
            bt.maxSvaj = Math.max(bt.maxSvaj, fran)
            if (dev > 30 || b.position.y > GROUND + 20 || Math.abs(b.position.x - 640) > 420 || !Number.isFinite(b.position.x)) bt.lamnat.add(s.id)
            if (Math.abs((b.angle - th) - (s.a - s.th)) > 0.1) bt.vikt.add(s.id)
          }
          hojd = Math.max(hojd, GROUND - (b.position.y - BH / 2))
        })
        bt.hojd = Math.max(bt.hojd, hojd)
        bt.hojdKl = Math.max(bt.hojdKl, placed.length)
      }
      requestAnimationFrame(steg)
    }
    requestAnimationFrame(steg)
  })
  const lasMatare = () => page.evaluate(() => {
    const b = window.__bt
    return {
      lagda: b.antalSedda, avvisade: b.antalDrops - b.antalSedda, torn: b.torn, bildrutor: b.frames,
      lutningGrader: +(b.maxTh * 180 / Math.PI).toFixed(2), toppSvajPx: +b.maxSvaj.toFixed(1),
      hojdPx: Math.round(b.hojd), hojdKlossar: b.hojdKl, lamnat: b.lamnat.size, vikt: b.vikt.size,
      svajTid: b.frames ? +(b.svajFrames / b.frames).toFixed(3) : 0,
    }
  })
  const stoppaMatare = () => page.evaluate(() => { if (window.__bt) window.__bt.kor = false })

  const geo = async () => page.evaluate(() => {
    const r = document.querySelector('canvas').getBoundingClientRect()
    const s = Math.min(r.width / 1280, r.height / 720)
    return { x0: r.left + (r.width - 1280 * s) / 2, y0: r.top + (r.height - 720 * s) / 2, s }
  })

  const resultat = []
  for (let runda = 1; runda <= RUNDOR; runda++) {
    const rnd = mulberry(FRO * 101 + runda * 7919)
    if (runda > 1) await page.evaluate(() => window.__barnspel.nav.go('menu')), await page.waitForTimeout(800)
    await gaIn()
    const G = await geo()
    await startaMatare()
    const t0 = Date.now()
    let klick = 0
    let sist = 0
    while (Date.now() - t0 < 300000) {
      const st = await page.evaluate(() => {
        const g = window.__barnspel.game
        return { fas: g._phase, sx: g._supportX, lagda: window.__bt.antalSedda, topX: g._placed.length ? g._placed[g._placed.length - 1].body.position.x : 640 }
      })
      if (st.lagda >= ANTAL && st.fas !== 'fall') break
      let x
      if (st.fas === 'carry') {
        // Sikte: mot toppen/mitten med felsikt (jamn) eller alltid åt höger om toppen (ensidig, tornet byggs snett).
        if (SIKTE === 'ensidig') x = Math.min(st.topX + 55, 770)
        else x = 0.5 * st.topX + 320 + (rnd() * 2 - 1) * 90
      } else {
        // Hamra: under fall/firande ger ett tryck bara en puff (spelets egen "alltid ett glatt svar").
        if (Date.now() - sist < 140) { await page.waitForTimeout(25); continue }
        x = 120 + rnd() * 1040
      }
      x = Math.max(119, Math.min(1161, x))
      await page.mouse.click(G.x0 + x * G.s, G.y0 + (80 + rnd() * 500) * G.s)
      klick++
      sist = Date.now()
      if (st.fas === 'carry') await page.waitForTimeout(30)
    }
    // Sista klossen sätter sig och tornet gungar ut: läs mätaren efter 4 s så hela svajet är med.
    await page.waitForTimeout(4000)
    const m = await lasMatare()
    resultat.push({ runda, klick, ...m })
    if (runda < RUNDOR) await stoppaMatare()
  }

  // Exit-säkerhet: lämna mitt i ett gung (släpp en kloss, och gå ut medan tornet svajar).
  await page.evaluate(async () => {
    const g = window.__barnspel.game
    const raf = () => new Promise((r) => requestAnimationFrame(r))
    for (let i = 0; i < 600 && g._phase !== 'carry'; i++) await raf()
    const ctx = window.__barnspel.ctx
    if (g._phase === 'carry') g._onTap(ctx, { global: { x: 700, y: 300 } })
    for (let i = 0; i < 70; i++) await raf()
    window.__barnspel.nav.go('menu')
  })
  await page.waitForTimeout(2000)
  await stoppaMatare().catch(() => {})

  const svajar = resultat.every((r) => r.lutningGrader > 0.5)
  const rasat = resultat.some((r) => r.lamnat > 0 || r.vikt > 0)
  console.log(JSON.stringify({
    arm: KONTROLL ? 'KONTROLL (statisk låsning = HEAD)' : 'nytt stöd (leder + sockel)',
    sikte: SIKTE, antal: ANTAL, niva: NIVA, rundor: resultat,
    maxLutningGrader: Math.max(...resultat.map((r) => r.lutningGrader)),
    lamnatTotalt: resultat.reduce((a, r) => a + r.lamnat, 0),
    viktTotalt: resultat.reduce((a, r) => a + r.vikt, 0),
    antalFel: errors.length, fel: errors.slice(0, 5),
    dom: KONTROLL
      ? (resultat.every((r) => r.lutningGrader === 0 && r.toppSvajPx <= 2) ? 'OK: kontrollen svajar inte' : 'FEL: kontrollen rör sig')
      : (svajar && !rasat && !errors.length ? 'OK: tornet svajar och rasar aldrig' : 'FEL: ' + (!svajar ? 'svajar inte >0,5° ' : '') + (rasat ? 'klossar lämnade tornet/viker sig ' : '') + (errors.length ? 'konsolfel' : '')),
  }, null, 2))
  if (!KONTROLL && (!svajar || rasat || errors.length)) kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
