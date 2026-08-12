// TUGGAN OCH MAGEN i `mata-monstret` — de två mjuka kropparna (LYFTPLAN B2, nattkö N4).
//
//   node scripts/_tuggprobe.mjs [--shot ut.png]
//   node scripts/_tuggprobe.mjs --bara-exit        (avhoppet ensamt — går att köra mot HEAD)
//   node scripts/_tuggprobe.mjs --kostnad [--cpu 6]
//
// `_mjukprobe.mjs` mäter solvern i isolering. Den här svarar på det bara spelet kan
// svara på:
//   1. Står magen HELT still när barnet inte gör något? (den ritas om varje bildruta)
//   2. Trycks tuggan ihop av KÄKEN — och buktar den ut i sidled när den gör det?
//   3. SYNS tuggan, eller ligger den bakom munnen? (isolerat lager + kontroll-mätning)
//   4. Växer magen per uppäten bit, och stannar den innanför kroppen?
//   5. Skvalpar magen när maten SVÄLJS (inte när den biter), och lugnar den sig sedan?
//   6. Lämnar ett avhopp mitt i ett tugg något igång?
//
// ⚠️ Isoleringen måste gå ända upp till app-scenen. En isolering som stannar vid spelets
// egen rot mäter skalets bakknapp (16 320 px), och en isolering som MISSLYCKAS ger en
// bild av hela scenen. Därför mäts alltid en KONTROLL med tuggan dold: den ska ge 0 px.
// Och duken är INTE svart när allt är dolt — renderaren rensar till appens bakgrund, så
// "ljusa pixlar" gav 921 600 av 921 600 i BÅDA armarna innan bakgrunden lästes ur bilden.
//
// ⚠️ `--kostnad` bär en KONTROLLARM med 25 ms känd barlast, för utan den betyder ett
// oskiljbart tal ingenting: vid CPU ×6 OCH ×20 låg båda armarna på 16,6 ms, och 12 ms
// barlast rörde inte heller talet (en rAF-delta kan inte se en last som ryms i rutan).
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const iShot = args.indexOf('--shot')
const shot = iShot >= 0 ? args[iShot + 1] : '.test-shots/_tuggprobe.png'
// `--bara-exit` kör BARA avhoppet mitt i ett tugg. Den armen måste gå att köra mot HEAD
// också (där varken tugga eller mage finns), annars går ett konsolfel inte att attribuera.
const baraExit = args.includes('--bara-exit')
// `--kostnad` mäter vad de mjuka kropparna kostar per bildruta. Kräver strypt CPU —
// utan strypning ligger båda armarna på taket (60 fps) och mätningen säger ingenting.
const kostnad = args.includes('--kostnad')
const iCpu = args.indexOf('--cpu')
const cpu = iCpu >= 0 ? Number(args[iCpu + 1]) : 6
const ID = 'mata-monstret'
const URL = 'http://localhost:5173'

// Speglar spelets konstanter — sonden får inte läsa dem ur modulen, då mäter den sig själv.
const MOUTH_DY = 44
const BELLY_Y = 132
const BELLY_RY = 92
const JAW_SPANN = 36 - -32 // tandradernas innerkanter vid gap 1,0

let fel = 0
const ok = (n, v, d = '') => {
  console.log(`  ${v ? '✓' : '✗'} ${n}${d ? ' · ' + d : ''}`)
  if (!v) fel++
}

const BOX = `(k) => {
  if (!k || !k.pts || !k.pts.length) return null
  const xs = [], ys = []
  for (let i = 0; i < k.n; i++) { xs.push(k.pts[i].x); ys.push(k.pts[i].y) }
  return { b: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
           ner: Math.max(...ys), fyll: k.fyllnad(), skala: k._skala }
}`

const las = (page) =>
  page.evaluate(async (BOX) => {
    const box = eval(BOX)
    const g = (await import('/src/games/registry.js')).getGame('mata-monstret')
    return {
      lage: g._mode,
      jaw: g._jaw ? g._jaw.y : null,
      belly: box(g._belly),
      chew: box(g._chewBody),
      rorelse: g._bellyRorelse ? g._bellyRorelse() : null,
      bellyScale: g._bellyScale,
      kvar: g._remaining,
    }
  }, BOX)

// Samlar en bildruta per rAF under `rutor` rutor. Mätningen måste ligga i sidan —
// varje page.evaluate utifrån kostar mer än en bildruta och missar tugget.
const provtagning = (page, rutor) =>
  page.evaluate(
    async ({ BOX, rutor }) => {
      const box = eval(BOX)
      const g = (await import('/src/games/registry.js')).getGame('mata-monstret')
      window.__prov = []
      let n = 0
      const steg = () => {
        window.__prov.push({ n, jaw: g._jaw ? g._jaw.y : null, chew: box(g._chewBody), belly: box(g._belly), rorelse: g._bellyRorelse ? g._bellyRorelse() : 0 })
        if (++n < rutor) requestAnimationFrame(steg)
      }
      requestAnimationFrame(steg)
    },
    { BOX, rutor },
  )

const drag = async (page, fx, fy, tx, ty) => {
  await page.mouse.move(fx, fy)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(fx + ((tx - fx) * i) / 12, fy + ((ty - fy) * i) / 12)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
}

// Var står maten? Läs spelets egna vyer i stället för att räkna ut luckorna igen.
const matplatser = (page) =>
  page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-monstret')
    return (g._foods || []).filter((m) => !m._eaten && !m.container.destroyed).map((m) => ({ x: m.container.x, y: m.container.y, key: m.key }))
  })

// ISOLERING: allt utom ETT lager döljs, hela vägen upp till app-scenen.
const isolera = (page, visaTugga) =>
  page.evaluate(async (visaTugga) => {
    const g = (await import('/src/games/registry.js')).getGame('mata-monstret')
    const behall = new Set()
    let nod = g._parts.chew
    while (nod) {
      behall.add(nod)
      nod = nod.parent
    }
    if (!behall.size) return false
    const rot = [...behall].pop() // app-scenen
    const ga = (c) => {
      for (const ch of c.children) {
        if (behall.has(ch)) ga(ch)
        else ch.visible = false
      }
    }
    ga(rot)
    g._parts.chew.visible = !!visaTugga
    return true
  }, visaTugga)

// Isoleringen MÅSTE tas tillbaka innan något annat mäts. En dold scen svarar inte på
// pekningar (Pixi träfftestar inte osynliga noder), och spelet fortsätter under tiden —
// mätningar efter en kvarlämnad isolering mäter en trasig värld, inte spelet.
const visaAllt = (page) =>
  page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-monstret')
    let rot = g._parts.chew
    while (rot && rot.parent) rot = rot.parent
    const ga = (c) => {
      c.visible = true
      for (const ch of c.children) ga(ch)
    }
    if (rot) ga(rot)
  })

// ⚠️ Duken är INTE svart när allt är dolt — renderaren rensar till appens bakgrundsfärg,
// så "ljusa pixlar" räknade 921 600 av 921 600 i BÅDA armarna. Bakgrunden läses därför ur
// bilden själv (hörnet) och det som räknas är avvikelsen från den.
const bildpixlar = async (page, fil) => {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))))
  const buf = await page.screenshot()
  if (fil) writeFileSync(fil, buf)
  const png = PNG.sync.read(buf)
  const d = png.data
  const [br, bg, bb] = [d[0], d[1], d[2]]
  let n = 0
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i] - br) + Math.abs(d[i + 1] - bg) + Math.abs(d[i + 2] - bb) > 24) n++
  }
  return n
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.stack || e.message || String(e)).slice(0, 1400)))

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1400)

  if (kostnad) {
    console.log(`\nkostnad per bildruta (CPU ×${cpu}) — armarna VÄXELVIS, aldrig alla A och sedan alla B`)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
    await page.waitForTimeout(800)
    const matning = (medTugga, barlast = 0) =>
      page.evaluate(
        async ({ medTugga, barlast }) => {
          const g = (await import('/src/games/registry.js')).getGame('mata-monstret')
          let hall = null
          let last = null
          // KONTROLLARM: en känd kostnad per bildruta. Rör den inte talet är mätaren
          // blind, och då säger "ingen skillnad" ingenting om tuggan.
          if (barlast) {
            last = () => {
              const slut = performance.now() + barlast
              while (performance.now() < slut) {}
              requestAnimationFrame(last)
            }
            requestAnimationFrame(last)
          }
          if (medTugga) hall = setInterval(() => g._startChew('apple'), 120)
          await new Promise((r) => setTimeout(r, 500))
          const t = []
          let sist = performance.now()
          await new Promise((klar) => {
            let n = 0
            const steg = () => {
              const nu = performance.now()
              t.push(nu - sist)
              sist = nu
              if (++n < 90) requestAnimationFrame(steg)
              else klar()
            }
            requestAnimationFrame(steg)
          })
          if (hall) clearInterval(hall)
          if (last) last = null
          t.sort((a, b) => a - b)
          return t[Math.floor(t.length / 2)]
        },
        { medTugga, barlast },
      )
    const utan = []
    const med = []
    for (let i = 0; i < 3; i++) {
      utan.push(await matning(false))
      med.push(await matning(true))
    }
    console.log(`  utan tugga · ${utan.map((v) => v.toFixed(2)).join(' / ')} ms`)
    console.log(`  med tugga  · ${med.map((v) => v.toFixed(2)).join(' / ')} ms`)
    const snitt = (a) => a.reduce((s, v) => s + v, 0) / a.length
    // Kontrollen körs SIST och i samma mätare: 25 ms känd barlast per bildruta.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1200)
    const kontroll = await matning(false, 25)
    console.log(`  kontroll (25 ms känd barlast) · ${kontroll.toFixed(2)} ms`)
    ok('mätaren BITER (annars säger "ingen skillnad" ingenting)', kontroll > snitt(utan) + 4,
      `${snitt(utan).toFixed(2)} → ${kontroll.toFixed(2)} ms`)
    ok('tuggan kostar mindre än en bildruta att bära', snitt(med) - snitt(utan) < 2.5,
      `${snitt(utan).toFixed(2)} → ${snitt(med).toFixed(2)} ms`)
    await browser.close()
    console.log(fel === 0 ? '\n✓ tuggprobe (kostnad): grönt\n' : `\n✗ tuggprobe (kostnad): ${fel} fel\n`)
    process.exit(fel === 0 ? 0 : 1)
  }

  if (baraExit) {
    console.log('\nexit mitt i ett tugg (endast)')
    for (let varv = 0; varv < 3; varv++) {
      const m = await matplatser(page)
      if (m.length) {
        await drag(page, m[0].x, m[0].y, 640, 320 + MOUTH_DY)
        await page.waitForTimeout(120)
      }
      await page.evaluate(() => window.__barnspel.nav.go('library'))
      await page.waitForTimeout(900)
      await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
      await page.waitForTimeout(1300)
    }
    ok('inga konsolfel över tre avhopp', errors.length === 0, `${errors.length} st · ` + errors.slice(0, 1).join(''))
    await browser.close()
    console.log(fel === 0 ? '\n✓ tuggprobe (exit): grönt\n' : `\n✗ tuggprobe (exit): ${fel} fel\n`)
    process.exit(fel === 0 ? 0 : 1)
  }

  // ---------- 1. vila ----------
  console.log('\nvila — magen är en mjuk kropp som ritas om varje bildruta')
  const v0 = await las(page)
  console.log(`  läge ${v0.lage} · mage ${v0.belly.b.toFixed(1)}×${v0.belly.h.toFixed(1)} px · fyllnad ${v0.belly.fyll.toFixed(3)} · käke ${v0.jaw.toFixed(2)}`)
  ok('rätt läge (klassiskt) att mäta i', v0.lage === 'classic', v0.lage)
  ok('magen står HELT still', v0.rorelse < 0.02, `rorelse ${v0.rorelse.toFixed(4)}`)
  // KALIBRERING: viloformen ska vara den gamla ellipsen. Går den sönder har utseendet
  // ändrats, och då spelar det ingen roll hur bra fysiken är.
  ok('viloformen är den gamla ellipsen (232×184)', Math.abs(v0.belly.b - 232) < 8 && Math.abs(v0.belly.h - 184) < 8,
    `${v0.belly.b.toFixed(1)}×${v0.belly.h.toFixed(1)} px`)
  ok('ingen tugga i munnen när ingen äter', v0.chew === null)

  // ---------- 2+3. tugget ----------
  console.log('\ntugget — käken trycker ihop maten')
  const mat = await matplatser(page)
  ok('mat på bordet att mata med', mat.length >= 2, `${mat.length} bitar`)
  await provtagning(page, 110)
  await drag(page, mat[0].x, mat[0].y, 640, 320 + MOUTH_DY)
  await page.waitForTimeout(1800)
  const prov = await page.evaluate(() => window.__prov)
  const medTugga = prov.filter((p) => p.chew)
  ok('tuggan föddes', medTugga.length > 6, `${medTugga.length} bildrutor med tugga`)

  if (medTugga.length > 6) {
    const hogst = medTugga.reduce((a, p) => (p.chew.h > a.chew.h ? p : a))
    const lagst = medTugga.reduce((a, p) => (p.chew.h < a.chew.h ? p : a))
    console.log(`  öppen  käke ${hogst.jaw.toFixed(2)} · tugga ${hogst.chew.b.toFixed(1)}×${hogst.chew.h.toFixed(1)} px`)
    console.log(`  hoptryckt käke ${lagst.jaw.toFixed(2)} · tugga ${lagst.chew.b.toFixed(1)}×${lagst.chew.h.toFixed(1)} px`)
    ok('tuggan trycks ihop rejält', lagst.chew.h < hogst.chew.h * 0.55, `${hogst.chew.h.toFixed(1)} → ${lagst.chew.h.toFixed(1)} px`)
    // Det är KÄKEN som gör det: höjden ska följa tandradernas innerkanter, inte en tween.
    const vantad = lagst.jaw * JAW_SPANN
    ok('hoptryckningen ÄR käkens gap', Math.abs(lagst.chew.h - vantad) < 6, `gap ${vantad.toFixed(1)} px mot tuggans ${lagst.chew.h.toFixed(1)} px`)
    ok('och den buktar UT i sidled när den kläms', lagst.chew.b > hogst.chew.b + 4, `${hogst.chew.b.toFixed(1)} → ${lagst.chew.b.toFixed(1)} px`)
    ok('tuggan håller sig innanför tandraden', medTugga.every((p) => p.chew.b <= 166), `bredast ${Math.max(...medTugga.map((p) => p.chew.b)).toFixed(1)} px`)

    // ---------- svälj: ORDNINGEN är påståendet ----------
    // ⚠️ Magens `rorelse` duger INTE som mått på sväljet: monstret skuttar vid varje
    // tugga och trögheten skakar magen då också (uppmätt 43 under tugget, och toppen
    // efteråt varierade 27 → 217 mellan två körningar av samma sak). Det entydiga
    // måttet är VILOFORMEN: den får bara växa när tuggan är borta.
    const sista = medTugga[medTugga.length - 1]
    const efter = prov.slice(sista.n + 1)
    console.log(`  viloskala · under tugget ${Math.max(...medTugga.map((p) => p.belly.skala)).toFixed(3)} · efter ${efter.length ? efter[efter.length - 1].belly.skala.toFixed(3) : '—'}`)
    ok('magen växer INTE av bettet', medTugga.every((p) => p.belly.skala === 1), 'alla ' + medTugga.length + ' tugg-rutor på 1,000')
    ok('den växer när tuggan SVÄLJS', efter.slice(0, 8).some((p) => p.belly.skala > 1),
      `${efter.length > 7 ? efter[7].belly.skala.toFixed(3) : '—'} åtta rutor senare`)
    ok('och magen lugnar sig igen', efter.length > 20 && efter[efter.length - 1].rorelse < 0.4,
      `rorelse ${efter.length ? efter[efter.length - 1].rorelse.toFixed(3) : '—'}`)
  }

  const v1 = await las(page)
  console.log(`\nmagen efter en bit · ${v1.belly.b.toFixed(1)}×${v1.belly.h.toFixed(1)} px · viloskala ${v1.belly.skala.toFixed(3)}`)
  ok('magen VÄXTE av biten', v1.belly.b > v0.belly.b + 4, `${v0.belly.b.toFixed(1)} → ${v1.belly.b.toFixed(1)} px bred`)
  ok('men aldrig nedanför den tomma magens underkant', v1.belly.ner <= BELLY_Y + BELLY_RY + 0.5,
    `underkant ${v1.belly.ner.toFixed(1)} mot golvet ${BELLY_Y + BELLY_RY}`)
  ok('tuggan är borta efter sväljet', v1.chew === null)
  ok('magen står still igen', v1.rorelse < 0.15, `rorelse ${v1.rorelse.toFixed(4)}`)

  // Bilden för ögat tas här, medan scenen är lugn — efter sista biten firar spelet och
  // då syns ingenting för konfettin.
  await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-monstret')
    window.__hall = setInterval(() => g._startChew('apple'), 120)
  })
  await page.waitForTimeout(400)
  await page.screenshot({ path: shot })
  await page.evaluate(() => clearInterval(window.__hall))
  await page.waitForTimeout(500)

  // ---------- växer monotont ----------
  console.log('\nmagen fylls bit för bit')
  const bredder = [v0.belly.b, v1.belly.b]
  for (let i = 0; i < 2; i++) {
    const m = await matplatser(page)
    if (!m.length) break
    await drag(page, m[0].x, m[0].y, 640, 320 + MOUTH_DY)
    await page.waitForTimeout(1500)
    const s = await las(page)
    if (!s.belly) break
    bredder.push(s.belly.b)
  }
  console.log('  bredd per bit · ' + bredder.map((b) => b.toFixed(1)).join(' → ') + ' px')
  ok('växer monotont', bredder.every((b, i) => i === 0 || b >= bredder[i - 1] - 0.5), bredder.length + ' mätpunkter')

  // ---------- SYNS tuggan? ----------
  console.log('\nsyns tuggan — isolerat lager (och en kontroll som måste ge 0)')
  const felFore = errors.length

  // En skärmdump kan inte tas mitt i ett 0,42 s-tugg och sedan tas OM med samma
  // tugga kvar. HÅLL den i stället vid liv: `_startChew` river den förra och armar om
  // sväljet, så en tugga om dagen håller munnen full utan att magen växer av det.
  await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-monstret')
    window.__hall = setInterval(() => g._startChew('apple'), 120)
  })
  await page.waitForTimeout(400)
  const isoOk = await isolera(page, true)
  ok('isoleringen gick att göra', isoOk)
  const pxMed = await bildpixlar(page, shot.replace(/\.png$/, '-isolerad.png'))
  await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-monstret')
    g._parts.chew.visible = false
  })
  const pxUtan = await bildpixlar(page, null)
  console.log(`  tuggans lager ${pxMed} px · kontroll (dold) ${pxUtan} px`)
  ok('kontrollen är TOM (isoleringen mäter bara tuggan)', pxUtan === 0, `${pxUtan} px`)
  ok('tuggan syns på riktigt', pxMed > 1500, `${pxMed} px`)
  await page.evaluate(() => clearInterval(window.__hall))
  await visaAllt(page)
  await page.waitForTimeout(300)

  // ---------- exit mitt i ett tugg ----------
  console.log('\nexit mitt i ett tugg')
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1400)
  const m3 = await matplatser(page)
  if (m3.length) {
    await drag(page, m3[0].x, m3[0].y, 640, 320 + MOUTH_DY)
    await page.waitForTimeout(120) // mitt i tugget
  }
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1200)
  const doda = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-monstret')
    return { alive: g._alive, belly: !!g._belly, chew: !!g._chewBody, call: !!g._chewCall }
  })
  ok('spelet är dött', doda.alive === false)
  ok('magen är riven', doda.belly === false)
  ok('tuggan är riven', doda.chew === false && doda.call === false)
  // ⚠️ Bara felen från den SPELADE delen får dömas. Efter mätsektionen har sonden dolt
  // hela scenen och hållit en tugga vid liv med en setInterval — bryter något då är det
  // sondens grepp som brustit, inte spelet. Avhoppet mäts för sig med `--bara-exit`.
  ok('inga konsolfel under den spelade delen', felFore === 0, errors.slice(0, 2).join(' | '))
  if (errors.length > felFore) console.log(`  ⚠ ${errors.length - felFore} fel EFTER att sonden dolt scenen — kör \`--bara-exit\` för det riktiga avhoppet`)
} finally {
  await browser.close()
}

console.log(fel === 0 ? '\n✓ tuggprobe: allt grönt\n' : `\n✗ tuggprobe: ${fel} fel\n`)
process.exit(fel === 0 ? 0 : 1)
