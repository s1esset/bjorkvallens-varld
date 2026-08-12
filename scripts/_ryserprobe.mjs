// `kla-efter-vadret`: KÄNNER Elvira vädret — och slutar hon när hon är lagom klädd?
//
// Punkten kom ur `_stillaprobe`: 84 noder, **3** i rörelse, största utslag
// **4,1–4,2 px i tre svep av tre** — och de tre var de fallande regn-/snöflingorna.
// Elvira själv, spelets enda karaktär och hela dess anledning, stod blick stilla.
// §4 [Quick]: "Elvira reagerar på fel: huttrar till vid för lite kläder, viftar bort
// för varmt — per-plagg-reaktion gör vinken levande i stället för bara wiggle + TTS."
//
// "Hon rör sig" räcker inte som krav — en slumpvis vibration hade klarat det. Sonden
// mäter att skalvet är dagens VÄDER mot hur mycket hon har på sig:
//   1. Hon rör sig alls i vilofönstret (mot HEADs blick stilla figur).
//   2. Skalvet AVTAR när ett riktigt plagg sätts på — orsak och verkan.
//   3. Ett OPASSANDE plagg ger en extra huttring (§4:s "reagerar på fel").
//   4. Vädret hörs i kroppen: köldskalvet är snabbare än värmevaggningen.
//   5. Hoppet vid rätt plagg lever kvar — tickern och gsap slåss inte om figuren.
//   6. Exit mitt i ett skalv lämnar ingenting som tickar.
//
// ⚠️ Raderna 5 och 6 är VAKTER, inte bevis — de är gröna på HEAD också. Bevisen
// är 1–4. Svängningen läses som (max − min) över ett fönster, aldrig som nivån.
//
//   node scripts/_ryserprobe.mjs
import { chromium } from 'playwright'

const ID = 'kla-efter-vadret'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })

// Svängningen i `_figureInner.x` över ms millisekunder: (max − min), plus hur
// många gånger den vänder (= takten, oberoende av utslagets storlek).
const SVANG = (ms) => `(async () => {
  const g = window.__barnspel.game
  const inn = g._figureInner
  if (!inn) return { fel: 'ingen _figureInner' }
  let mn = Infinity, mx = -Infinity, vand = 0, forra = null, riktning = 0, n = 0
  const t0 = performance.now()
  while (performance.now() - t0 < ${ms}) {
    const v = inn.x
    if (v < mn) mn = v
    if (v > mx) mx = v
    if (forra !== null) {
      const d = v - forra
      if (Math.abs(d) > 0.002) {
        const r = d > 0 ? 1 : -1
        if (riktning && r !== riktning) vand++
        riktning = r
      }
    }
    forra = v; n++
    await new Promise((r) => requestAnimationFrame(r))
  }
  const sek = (performance.now() - t0) / 1000
  return { svang: +(mx - mn).toFixed(2), vandPerSek: +(vand / sek).toFixed(1), prov: n }
})()`

// Design -> skärmkoordinat för ett dragbart plagg och en kroppszon.
const PUNKTER = (fits) => `(() => {
  const g = window.__barnspel.game
  const rec = g._drag.items.find((r) => !r.placed && r.data.fits === ${fits})
  if (!rec) return { fel: 'hittar inget plagg med fits=${fits}' }
  const slot = rec.data.fits ? rec.data.slot : g._reqZones[0]
  const z = g._zones[slot]
  const c = window.__barnspel.app.canvas.getBoundingClientRect()
  const sx = c.width / window.__barnspel.app.renderer.width
  const sy = c.height / window.__barnspel.app.renderer.height
  const p = rec.view.getGlobalPosition(), q = z.getGlobalPosition()
  return { fx: Math.round(c.left + p.x * sx), fy: Math.round(c.top + p.y * sy),
           tx: Math.round(c.left + q.x * sx), ty: Math.round(c.top + q.y * sy) }
})()`

async function dra(page, p) {
  await page.mouse.move(p.fx, p.fy)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(p.fx + ((p.tx - p.fx) * i) / 10, p.fy + ((p.ty - p.fy) * i) / 10)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage,
    ID, { timeout: 20000 })

  const finns = await page.evaluate(() => !!window.__barnspel.game._figureInner)
  if (!finns) {
    ok('1. Elvira ror sig alls', false, 'spelet har ingen _figureInner (HEAD)')
  } else {
    // Nivå 4 => tre obligatoriska zoner, så ETT plagg inte avslutar rundan mitt i
    // mätningen. Vädret tvingas genom spelets EGEN väg (`_pickWeather` + `_newRound`),
    // inte genom att skriva `_weather` för hand — annars mater vi mekanismen frikopplad.
    const stall = async (vader) => {
      await page.evaluate((v) => {
        const g = window.__barnspel.game
        g._level = 4
        g._pickWeather = () => v
        g._newRound(window.__barnspel.ctx, { silent: true })
      }, vader)
      await page.waitForTimeout(500)
    }

    // --- 1, 4. Köldskalv i snö ------------------------------------------
    await stall('sno')
    const sno = await page.evaluate(SVANG(2200))
    ok('1. Elvira ror sig alls', sno.svang > 2,
      `svang ${sno.svang} px i sno, oklaadd (HEAD: figuren helt stilla, 0 noder)`)

    // --- 2. Skalvet avtar nar ett RIKTIGT plagg satts pa ------------------
    const p = await page.evaluate(PUNKTER(true))
    if (p.fel) ok('2. skalvet avtar per plagg', false, p.fel)
    else {
      const fore = sno.svang
      await dra(page, p)
      await page.waitForTimeout(900) // last huttringen fran draget klinga ut
      const efter = await page.evaluate(SVANG(2200))
      const st = await page.evaluate(() => ({ placed: window.__barnspel.game._placed, needed: window.__barnspel.game._needed }))
      ok('2. skalvet avtar per plagg', st.placed > 0 && efter.svang < fore * 0.85,
        `svang ${fore} -> ${efter.svang} px efter ${st.placed}/${st.needed} plagg (riktigt drag)`)
    }

    // --- 3. Opassande plagg ger en extra huttring ------------------------
    const lugn = await page.evaluate(SVANG(1200))
    const w = await page.evaluate(PUNKTER(false))
    if (w.fel) ok('3. opassande plagg ger extra huttring', false, w.fel)
    else {
      await dra(page, w)
      const spik = await page.evaluate(SVANG(600)) // RYS_MS ar 750
      ok('3. opassande plagg ger extra huttring', spik.svang > lugn.svang * 1.3,
        `svang ${lugn.svang} -> ${spik.svang} px direkt efter ett opassande plagg`)
    }

    // --- 4. Vadret hors i kroppen: snotakt mot soltakt --------------------
    await stall('sol')
    const sol = await page.evaluate(SVANG(2600))
    ok('4. vadret hors i kroppen', sno.vandPerSek > sol.vandPerSek * 1.8,
      `koldskalv ${sno.vandPerSek} vandningar/s mot varmevaggning ${sol.vandPerSek}/s`)

    // --- 4b. Syns skalvet i ALLA tre vaderslagen? -------------------------
    // `_stillaprobe` kallar 4,2 px "nastan stilla" — sa varje vaderslag maste ge
    // ett storre svangningsrum an sa, annars ar tableauet bara halvt last. Solens
    // forsta varde gav 4,6 px och foll pa precis den granskningen.
    const perVader = {}
    for (const v of ['sno', 'regn', 'sol']) {
      await stall(v)
      perVader[v] = (await page.evaluate(SVANG(2600))).svang
    }
    const samst = Math.min(...Object.values(perVader))
    ok('4b. syns i alla tre vaderslagen', samst > 6,
      `svangningsrum sno ${perVader.sno} · regn ${perVader.regn} · sol ${perVader.sol} px (flingorna ligger pa 4,2)`)

    // --- 5. Hoppet lever kvar (gsap pa _figure vs tickern pa _figureInner) --
    await stall('sno')
    const p2 = await page.evaluate(PUNKTER(true))
    if (p2.fel) ok('5. hoppet lever kvar', false, p2.fel)
    else {
      await dra(page, p2)
      const hopp = await page.evaluate(`(async () => {
        const g = window.__barnspel.game
        let mn = 0
        const t0 = performance.now()
        while (performance.now() - t0 < 500) {
          mn = Math.min(mn, g._figure.y)
          await new Promise((r) => requestAnimationFrame(r))
        }
        return +mn.toFixed(1)
      })()`)
      ok('5. hoppet lever kvar', hopp < -4, `_figure.y naadde ${hopp} px (vakt: gron aven pa HEAD)`)
    }
  }

  // --- 6. Exit mitt i ett skalv -------------------------------------------
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  ok('6. exit mitt i skalvet ar tyst', errors.length === 0, errors.length ? errors[0] : 'inga konsolfel')
} finally {
  await browser.close()
}

console.log('\n  kla-efter-vadret — kanner Elvira vadret?\n')
let gronast = 0
for (const r of rader) {
  if (r.ok) gronast++
  console.log(`  ${r.ok ? 'OK  ' : 'FEL '} ${r.namn.padEnd(38)} ${r.text}`)
}
console.log(`\n  ${gronast}/${rader.length} grona\n`)
process.exit(gronast === rader.length ? 0 : 1)
