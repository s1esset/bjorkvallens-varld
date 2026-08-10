// KUGGHJULENS DRIVREM — bär den verkligen kraften över gapet?
//
//   node scripts/_remprobe.mjs        (kräver dev-servern på :5173)
//
// Remmen är spelets första del som kopplar två hjul som INTE rör varandra. Frågorna
// den måste svara ja på, mätta i spelet och inte i huvudet:
//
//   1. Är gapet ÄKTA? Utan remmen får kuggarna omöjligt greppa över det.
//   2. Är kedjan bruten när ALLA hjul sitter men remmen saknas?
//   3. Sluter remmen kedjan när båda hjulen sitter?
//   4. Snurrar hjulen på var sin sida om remmen åt SAMMA håll? (kuggar vänder)
//   5. Stämmer utväxlingen (ω_b / ω_a = r_a / r_b)?
//   6. Hänger den slak när ett hjul saknas och spänns när det kommer?
//   7. Löper remmen med hjulens YTFART, så ribborna inte glider?
//   8. Väger den något? (bygget ska kännas i handen, som resten av maskinen)
//   9. Går remnivån att veva klar, och lägger auto-hjälpen remmen åt ett barn som fastnar?
//  10. Tickar något efter `destroy()`?
import { chromium } from 'playwright'

const ID = 'kugghjulen'
let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const n2 = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(2) : String(v))

// Hjälpare som injiceras i sidan: vänta N bildrutor, och mät en rep-längd.
const HJALP = `
  const vanta = (n = 1) => new Promise((r) => {
    let i = 0
    const steg = () => (++i >= n ? r() : requestAnimationFrame(steg))
    requestAnimationFrame(steg)
  })
  const langd = (rep) => {
    let L = 0
    for (let i = 0; i < rep.pts.length - 1; i++) L += Math.hypot(rep.pts[i + 1].x - rep.pts[i].x, rep.pts[i + 1].y - rep.pts[i].y)
    return L
  }
`

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction(() => !!window.__barnspel.game?._crank, null, { timeout: 15000 })
  await page.waitForTimeout(600)

  const kor = (kropp, arg) => page.evaluate(new Function('arg', `return (async () => {
    const app = window.__barnspel
    const g = app.game
    const ctx = app.ctx
    ${HJALP}
    ${kropp}
  })()`), arg)

  console.log('\nKUGGHJULEN — drivremmen över gapet\n')

  // Bygg remnivån (5) direkt genom spelets egen nivåuppbyggnad.
  const geo = await kor(`
    g._buildLevel(ctx, 5)
    await vanta(3)
    const rem = g._rem
    if (!rem) return { rem: false }
    const A = g._remNod(rem.aRef)
    const B = g._remNod(rem.bRef)
    const SIZ = { S: 50, M: 66, L: 84 }
    const ra = rem.aRef.kind === 'gear' ? SIZ[g._solutionPegs[rem.aRef.index].size] : A.r
    const rb = rem.bRef.kind === 'gear' ? SIZ[g._solutionPegs[rem.bRef.index].size] : B.r
    const d = Math.hypot(B.x - A.x, B.y - A.y)
    // P0: remspårets träffyta mot de närmaste pinnarnas (båda ska ha luft emellan).
    let narmast = Infinity
    for (const v of g._pegViews) narmast = Math.min(narmast, Math.hypot(v.x - rem.slot.x, v.y - rem.slot.y))
    return { rem: true, d, ra, rb, mesh: Math.abs(d - (ra + rb)), narmast, glapp: narmast - 50 - 70 }
  `)

  ok('nivå 5 har ett remspann', geo.rem)
  if (!geo.rem) {
    console.log('\n  ⚠ ingen rem byggdes — resten hoppas över\n')
    process.exit(1)
  }
  // 1.
  ok('gapet går inte att greppa över', geo.mesh > 100,
    `mittavstånd ${Math.round(geo.d)} px, kuggarna möts vid ${geo.ra + geo.rb} → ${Math.round(geo.mesh)} px för långt`)
  ok('P0: remspårets träffyta har luft till pinnarna', geo.glapp >= 24,
    `${Math.round(geo.narmast)} px till närmaste pinne → ${Math.round(geo.glapp)} px glapp (krav ≥24)`)

  // 2. Alla hjul på plats, ingen rem → kedjan MÅSTE vara bruten.
  const utan = await kor(`
    for (const s of g._solutionPegs) g._spawnGear(ctx, s.peg, s.size, {})
    g._rebuildMesh(ctx)
    await vanta(3)
    return { komplett: g._chainComplete, griper: !!g._rem.gripping, hjul: g._gears.length, drivna: g._gears.filter(x => x.driven).length }
  `)
  ok('kedjan är BRUTEN utan remmen', !utan.komplett && !utan.griper,
    `${utan.drivna} av ${utan.hjul} hjul drivs, chainComplete=${utan.komplett}`)

  // 6. Slak utan hjul → spänd med hjul. Remmen läggs medan hjulet är borta.
  const slak = await kor(`
    const rem = g._rem
    const peg = g._solutionPegs[rem.bRef.index].peg
    const sparat = peg.gear
    g._gears = g._gears.filter((x) => x !== sparat)
    peg.gear = null
    if (sparat?.view && !sparat.view.destroyed) sparat.view.visible = false
    g._rebuildMesh(ctx)
    g._placeRem(ctx)
    await vanta(30)
    // ⚠️ MÄT SAGET MOT REPETS EGNA ÄNDAR, inte mot navavstånden: remmen fäster på
    // FÄLGEN, så navavståndet är systematiskt för långt och gör ett hängande rep
    // till "spänt". Repets ändar är den enda ärliga referensen.
    const h = rem.repA.pts
    const rakt = Math.hypot(h[h.length - 1].x - h[0].x, h[h.length - 1].y - h[0].y)
    const hangande = langd(rem.repA)
    const hangKomplett = g._chainComplete
    peg.gear = sparat
    g._gears.push(sparat)
    if (sparat?.view && !sparat.view.destroyed) sparat.view.visible = true
    g._rebuildMesh(ctx)
    await vanta(30)
    const t = rem.repA.pts
    const spantRakt = Math.hypot(t[t.length - 1].x - t[0].x, t[t.length - 1].y - t[0].y)
    return {
      hangande, rakt, hangKvot: hangande / rakt, hangKomplett,
      spantKvot: langd(rem.repA) / spantRakt,
      griper: !!rem.gripping, komplett: g._chainComplete,
      drivna: g._gears.filter(x => x.driven).length, hjul: g._gears.length,
    }
  `)
  ok('remmen HÄNGER när hjulet saknas', slak.hangKvot > 1.1,
    `${Math.round(slak.hangande)} px rem över ${Math.round(slak.rakt)} px gap = ${n2(slak.hangKvot)}×`)
  ok('...och kedjan är fortfarande bruten då', !slak.hangKomplett)
  ok('...och SPÄNNS när hjulet kommer', slak.spantKvot < 1.03, `${n2(slak.spantKvot)}× över tangentspannet`)
  // 3.
  ok('remmen sluter kedjan', slak.komplett && slak.griper,
    `griper=${slak.griper}, ${slak.drivna} av ${slak.hjul} hjul drivs`)

  // 4 + 5.
  const kraft = await kor(`
    const rem = g._rem
    const fa = rem.aRef.kind === 'gear' ? g._solutionPegs[rem.aRef.index].peg.gear : null
    const fb = rem.bRef.kind === 'gear' ? g._solutionPegs[rem.bRef.index].peg.gear : null
    const A = g._remNod(rem.aRef)
    const B = g._remNod(rem.bRef)
    return {
      fa: fa ? fa.factor : null, fb: fb ? fb.factor : null,
      vantadKvot: A.r / B.r,
      alla: g._gears.filter(x => x.driven).sort((a,b)=>a.depth-b.depth).map(x => ({ f: +x.factor.toFixed(3), r: x.r, d: x.depth })),
      mal: g._targetFactor,
    }
  `)
  const sammaHall = kraft.fa != null && kraft.fb != null && Math.sign(kraft.fa) === Math.sign(kraft.fb)
  ok('hjulen kring remmen snurrar åt SAMMA håll', sammaHall, `${n2(kraft.fa)} och ${n2(kraft.fb)}`)
  ok('utväxlingen är r_a / r_b', Math.abs(kraft.fb / kraft.fa - kraft.vantadKvot) < 0.02,
    `ω_b/ω_a = ${n2(kraft.fb / kraft.fa)}, r_a/r_b = ${n2(kraft.vantadKvot)}`)
  const vander = kraft.alla.some((x, i) => i > 0 && Math.sign(x.f) !== Math.sign(kraft.alla[i - 1].f))
  ok('kuggparen vänder fortfarande riktningen', vander, kraft.alla.map((x) => n2(x.f)).join(' · '))

  // 7. ⚠️ FÖRSTA VERSIONEN AV DET HÄR MÅTTET VAR FALSKT GRÖNT: den mätte över TVÅ
  // bildrutor och jämförde mot EN, alltså 2× fel — och en slapp tolerans (±120 %)
  // släppte igenom det ändå. Nu mäts snittet per bildruta mot ω·r med ±20 %.
  const fart = await kor(`
    const rem = g._rem
    const RUTOR = 12
    g._cranking = false
    const A = g._remNod(rem.aRef)
    const f0 = rem.phase
    for (let i = 0; i < RUTOR; i++) {
      g._crankVel = 0.12
      await vanta(1)
    }
    const w = 0.12 * (g._solutionPegs[rem.aRef.index].peg.gear.factor)
    return { per: (rem.phase - f0) / RUTOR, vantad: w * A.r, w, r: A.r, rutor: RUTOR }
  `)
  ok('remmen löper med hjulets ytfart', Math.abs(fart.per) > 0.5 && Math.abs(fart.per / fart.vantad - 1) < 0.2,
    `${n2(fart.per)} px/bildruta mot ω·r = ${n2(fart.vantad)} (ω=${n2(fart.w)}, r=${fart.r}, ${fart.rutor} rutor)`)

  // 8.
  const trog = await kor(`
    const med = g._troghet()
    g._rem.gripping = false
    const utan = g._troghet()
    g._rem.gripping = true
    return { med, utan }
  `)
  ok('remmen väger något', trog.med - trog.utan > 0.3, `tröghet ${n2(trog.med)} med rem, ${n2(trog.utan)} utan`)

  // 9a.
  const klart = await kor(`
    g._crankVel = 0.3
    let rutor = 0
    while (!g._resolving && rutor < 900) {
      g._crankVel = 0.3
      await vanta(1)
      rutor++
    }
    return { klar: g._resolving, rutor }
  `)
  ok('remnivån går att veva klar', klart.klar, `${klart.rutor} bildrutor`)

  // 9b. Auto-hjälpen ger remmen till ett barn som fastnar.
  const hjalp = await kor(`
    g._buildLevel(ctx, 5)
    await vanta(3)
    const rem = g._rem
    for (let i = 0; i < rem.link; i++) g._spawnGear(ctx, g._solutionPegs[i].peg, g._solutionPegs[i].size, {})
    g._rebuildMesh(ctx)
    const fore = rem.placed
    g._autoHelp(ctx)
    await new Promise((r) => setTimeout(r, 1200))
    return { fore, efter: !!g._rem.placed, hint: !!g._dispensers.REM.view.visible }
  `)
  ok('auto-hjälpen lägger remmen', !hjalp.fore && hjalp.efter, `placerad=${hjalp.efter}`)

  // --- Bild: remmen slak och remmen i drift (`--bild`) ----------------------
  //
  // ⚠️ FÖRSTA BILDEN VAR VÄRDELÖS och det syntes bara på bilden: mätarmarna ovan
  // hade redan vunnit nivån, så en `gsap.delayedCall` från `_onComplete` låg och
  // väntade — den byggde om nivån mitt under exponeringen och skärmen blev en
  // annan nivå i konfetti. Bilden måste tas på en NYLADDAD sida.
  if (process.argv.includes('--bild')) {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForFunction(() => !!window.__barnspel.game?._crank, null, { timeout: 15000 })
    await page.waitForTimeout(500)
    await kor(`
      g._buildLevel(ctx, 5)
      await vanta(3)
      const rem = g._rem
      for (let i = 0; i < g._solutionPegs.length; i++) {
        if (i === rem.bRef.index) continue // låt remmens ena hjul saknas
        g._spawnGear(ctx, g._solutionPegs[i].peg, g._solutionPegs[i].size, {})
      }
      g._rebuildMesh(ctx)
      g._placeRem(ctx)
      await vanta(40)
      return true
    `)
    await page.screenshot({ path: '.test-shots/kugghjulen-rem-slak.png' })
    await kor(`
      const rem = g._rem
      const s = g._solutionPegs[rem.bRef.index]
      g._spawnGear(ctx, s.peg, s.size, {})
      g._rebuildMesh(ctx)
      for (let i = 0; i < 45; i++) { g._crankVel = 0.16; await vanta(1) }
      return true
    `)
    await page.screenshot({ path: '.test-shots/kugghjulen-rem.png' })
    console.log('  → .test-shots/kugghjulen-rem-slak.png + kugghjulen-rem.png')
  }

  // 10. Exit mitt i en levande rem.
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(500)
  const efterExit = errors.length
  await page.waitForTimeout(900)
  ok('inget tickar efter exit', errors.length === efterExit, `${errors.length} konsolfel totalt`)
  ok('inga konsolfel alls', errors.length === 0, errors.slice(0, 3).join(' | ') || '—')

  console.log(`\n${fel === 0 ? '✓ alla mått gröna' : `✗ ${fel} mått röda`}\n`)
} finally {
  await browser.close()
}
process.exit(fel === 0 ? 0 : 1)
