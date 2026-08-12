// BUBBLAN SOM LIGGER AN MOT YTAN i `pruttbad` (LYFTPLAN B2 / nattkö N4).
//
//   node scripts/_pressprobe.mjs [antal-tryck]
//   node scripts/_pressprobe.mjs --takt        (bara loopens tempo — går att köra mot HEAD)
//
// Radens motiv var *"bubblor som pressas ihop mot ytan innan de poppar"*, och kön sa att
// såpbubblornas STORLEKSINVÄNDNING skulle prövas här först. Den prövningen gjordes i tal
// (se rutan vid `PRESS_TID` i spelet): `path()` ritar kvadratiska mellansteg, inte en
// polygon, och avviker 0,01–0,12 px från en perfekt cirkel över hela spannet — invändningen
// gällde en tiohörning och träffar inte den här kurvan.
//
// Kvar att mäta är det spelet självt måste svara på:
//   1. FINNS skedet nu? (före ändringen poppade bubblan i samma ruta som toppen bröt ytan)
//   2. Plattas hinnan faktiskt till — och är det YTAN som gör det, inte en tween?
//   3. Hur många mjuka kroppar lever samtidigt?
//   4. Är loopens TEMPO orört? En hoptryckning får fördröja en enskild bubbla, inte sänka
//      takten barnet fyller badet i. Mäts VÄXELVIS mot HEAD med `--takt`.
//   5. Lämnar ett avhopp mitt i ett press något igång?
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const baraTakt = args.includes('--takt')
const tryck = Number(args.find((a) => /^\d+$/.test(a)) || 8)
const ID = 'pruttbad'
const URL = 'http://localhost:5173'
const ZACKE = { x: 430, y: 372 } // ZACKE_X, ZACKE_Y + magen (hitArea-mitt)

let fel = 0
const ok = (n, v, d = '') => {
  console.log(`  ${v ? '✓' : '✗'} ${n}${d ? ' · ' + d : ''}`)
  if (!v) fel++
}

// Följer varje bubbla bildruta för bildruta. Allt i sidan — en page.evaluate per ruta
// hade missat just det skede som ska mätas.
const SAMLA = `async () => {
  const g = (await import('/src/games/registry.js')).getGame('pruttbad')
  const sedd = new Map()
  window.__res = { dog: [], samtidigt: 0, mjukaSamtidigt: 0, rutor: 0 }
  const steg = () => {
    const R = window.__res
    R.rutor++
    const nu = new Set()
    let mjuka = 0
    for (const b of g._bubbles || []) {
      nu.add(b)
      if (!sedd.has(b)) sedd.set(b, { r: b.r, rutor: 0, press: 0, platt: 1, glapp: 1e9, sitter: 0 })
      const s = sedd.get(b)
      s.rutor++
      const m = b.press
      if (m && m.pts && m.pts.length) {
        mjuka++
        s.press++
        const xs = [], ys = []
        for (let i = 0; i < m.n; i++) { xs.push(m.pts[i].x); ys.push(m.pts[i].y) }
        const h = Math.max(...ys) - Math.min(...ys)
        const w = Math.max(...xs) - Math.min(...xs)
        s.platt = Math.min(s.platt, h / w)
        // Ligger hinnans topp PÅ den levande ytan, eller svävar den?
        const topp = Math.min(...ys)
        const iTopp = ys.indexOf(topp)
        const yta = g._surf + g._waveAt(xs[iTopp])
        s.glapp = Math.min(s.glapp, Math.abs(topp - yta))
        if (Math.abs(topp - yta) < 1.5) s.sitter++
      }
    }
    R.mjukaSamtidigt = Math.max(R.mjukaSamtidigt, mjuka)
    R.samtidigt = Math.max(R.samtidigt, nu.size)
    for (const [b, s] of sedd) {
      if (nu.has(b)) continue
      R.dog.push(s)
      sedd.delete(b)
    }
    requestAnimationFrame(steg)
  }
  requestAnimationFrame(steg)
}`

const spela = async (page, n) => {
  for (let i = 0; i < n; i++) {
    await page.mouse.move(ZACKE.x, ZACKE.y)
    await page.mouse.down()
    await page.waitForTimeout(i % 3 === 0 ? 550 : 120) // både korta tap och håll
    await page.mouse.up()
    await page.waitForTimeout(420)
  }
  await page.waitForTimeout(2500)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))

  const boot = async () => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1500)
  }

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await boot()

  if (baraTakt) {
    // TEMPOT. Skum per sekund är det tal barnet känner — poppar per sekund sätts av hur
    // fort barnet trycker, alltså av sonden, och skulle vara samma i vilken arm som helst.
    // ⚠️ SKUMNIVÅN DUGER INTE SOM MÅTT. Nås målet töms badet och nivån är tillbaka på 0 —
    // uppmätt 3,37 / 0,00 / 0,00 skum/s över tre varv av exakt samma spelning. Det som
    // svarar på frågan är GENOMSTRÖMNINGEN (poppar per sekund, samma spelmanus i båda
    // armarna) och LATENSEN (bubblans livslängd): presset får kosta latens, inte takt.
    console.log('\nloopens tempo — kör samma kommando på HEAD och jämför')
    await page.evaluate(SAMLA + '\n;(' + SAMLA + ')()')
    await spela(page, tryck)
    const Rt = await page.evaluate(() => window.__res)
    const liv = Rt.dog.map((d) => d.rutor)
    const snittT = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
    console.log(`  ${Rt.dog.length} poppar över ${Rt.rutor} bildrutor`)
    console.log(`  genomströmning · ${(Rt.dog.length / (Rt.rutor / 60)).toFixed(3)} poppar/s`)
    console.log(`  latens · ${snittT(liv).toFixed(1)} bildrutor per bubbla (${(snittT(liv) / 60).toFixed(2)} s)`)
    ok('inga konsolfel', errors.length === 0, errors.slice(0, 2).join(' | '))
    await browser.close()
    console.log(fel === 0 ? '\n✓ pressprobe (takt): grönt\n' : `\n✗ pressprobe (takt): ${fel} fel\n`)
    process.exit(fel === 0 ? 0 : 1)
  }

  await page.evaluate(SAMLA + '\n;(' + SAMLA + ')()')
  await spela(page, tryck)

  const R = await page.evaluate(() => window.__res)
  const pressade = R.dog.filter((d) => d.press > 0)
  const snitt = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)

  console.log(`\n${R.dog.length} bubblor följda över ${R.rutor} bildrutor (${tryck} tryck)`)
  console.log(`  radier · ${Math.min(...R.dog.map((d) => d.r)).toFixed(0)}–${Math.max(...R.dog.map((d) => d.r)).toFixed(0)} px`)
  console.log(`  samtidigt i badet ${R.samtidigt} · varav MJUKA samtidigt ${R.mjukaSamtidigt}`)
  console.log(`  bildrutor liggande an · snitt ${snitt(pressade.map((d) => d.press)).toFixed(1)} av ${R.dog.length} bubblor (${pressade.length} pressade)`)
  console.log(`  plattast h/b · ${snitt(pressade.map((d) => d.platt)).toFixed(3)} (1,00 = cirkel)`)
  console.log(`  hinnans topp mot LEVANDE ytan · glapp ${snitt(pressade.map((d) => d.glapp)).toFixed(2)} px · ${snitt(pressade.map((d) => d.sitter)).toFixed(1)} rutor i kontakt`)

  ok('skedet FINNS (före ändringen: noll bildrutor)', snitt(pressade.map((d) => d.press)) > 8,
    `${snitt(pressade.map((d) => d.press)).toFixed(1)} rutor ≈ ${(snitt(pressade.map((d) => d.press)) / 60).toFixed(2)} s`)
  ok('nästan varje bubbla går den vägen', pressade.length >= R.dog.length - 2, `${pressade.length}/${R.dog.length}`)
  ok('hinnan plattas till', snitt(pressade.map((d) => d.platt)) < 0.8, `h/b ${snitt(pressade.map((d) => d.platt)).toFixed(3)}`)
  // Det är YTAN som plattar den — inte en tween. Toppen ska ligga PÅ höjdfältet.
  ok('och det är YTAN som gör det', snitt(pressade.map((d) => d.glapp)) < 1.5 && snitt(pressade.map((d) => d.sitter)) > 4,
    `glapp ${snitt(pressade.map((d) => d.glapp)).toFixed(2)} px`)
  ok('högst ett par mjuka kroppar samtidigt', R.mjukaSamtidigt <= 4, `${R.mjukaSamtidigt} st`)

  // Bilden för ögat. En press varar 0,21 s och går inte att träffa med en skärmdump —
  // håll den i stället vid liv genom att nollställa dess klocka varje bildruta, precis
  // som tuggan hålls kvar i `_tuggprobe`. Då sätter sig hinnan i sin jämvikt mot ytan.
  await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('pruttbad')
    const halt = () => {
      for (const b of g._bubbles || []) if (b.press) b.pressT = 0
      window.__hall = requestAnimationFrame(halt)
    }
    halt()
  })
  await spela(page, 2)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))))
  await page.screenshot({ path: '.test-shots/_pressprobe.png' })
  await page.evaluate(() => cancelAnimationFrame(window.__hall))
  await page.waitForTimeout(600)

  // ---------- exit mitt i ett press ----------
  console.log('\nexit mitt i ett press')
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1200)
  const doda = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('pruttbad')
    return { alive: g._alive, kvar: (g._bubbles || []).filter((b) => b.press).length }
  })
  ok('spelet är dött', doda.alive === false)
  ok('ingen mjuk kropp lever vidare', doda.kvar === 0, `${doda.kvar} kvar`)
  ok('inga konsolfel', errors.length === 0, errors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}

console.log(fel === 0 ? '\n✓ pressprobe: allt grönt\n' : `\n✗ pressprobe: ${fel} fel\n`)
process.exit(fel === 0 ? 0 : 1)
