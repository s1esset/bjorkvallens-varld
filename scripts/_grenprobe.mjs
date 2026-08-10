// KUGGHJULENS DUBBELHJUL — driver ETT hjul verkligen TVÅ vägar?
//
//   node scripts/_grenprobe.mjs [--bild]        (kräver dev-servern på :5173)
//
// Remmen (`_remprobe`) bröt raden i SIDLED: den kopplade två hjul som inte rör
// varandra. Dubbelhjulet bryter den i GRAD: ett hjul som redan driver kedjan vidare
// driver samtidigt en andra gren (fläkten). Mesh-grafen skulle klara det utan en
// enda kodrad — den länkar rent geometriskt och BFS:en bär riktning och utväxling
// på LÄNKEN. Sonden finns för att bevisa att den verkligen gör det, och att grenen
// är en BONUS som inte kan förstöra no-fail-garantin.
//
//   1. Bygger nivå 8 en gren, och ligger grenpinnen på EXAKT mesh-avstånd?
//   2. Greppar grenhjulet av MISSTAG något annat hjul? (då är det ingen gren)
//   3. P0 TRÄFFYTA: har grenpinnen luft (≥24 px) till närmaste andra pinne?
//   4. Är grenen frivillig? Kedjan ska bli komplett med grenpinnen TOM.
//   5. Blir grenhjulet drivet när det läggs — med rätt utväxling och MOTSATT håll?
//   6. Driver bashjulet TVÅ vägar SAMTIDIGT (kedjan vidare OCH grenen)?
//   7. Snurrar fläktbladen, åt motsatt håll mot bashjulet och snabbare än veven?
//   8. Går nivån att veva klar UTAN grenen? (vinstvillkoret måste vara orört)
//   9. Är fläkten dold på en nivå utan gren, och tickar något efter `destroy()`?
import { chromium } from 'playwright'

const ID = 'kugghjulen'
const MESH_TOL = 14 // samma tal som spelet
let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const n2 = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(2) : String(v))

const HJALP = `
  const vanta = (n = 1) => new Promise((r) => {
    let i = 0
    const steg = () => (++i >= n ? r() : requestAnimationFrame(steg))
    requestAnimationFrame(steg)
  })
  const SIZ = { S: 50, M: 66, L: 84 }
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

  console.log('\nKUGGHJULEN — dubbelhjulet (ett hjul, två grenar)\n')

  // 1 + 2 + 3. Geometrin, INNAN något hjul lagts.
  const geo = await kor(`
    g._buildLevel(ctx, 8)
    await vanta(3)
    const gren = g._gren
    if (!gren) return { gren: false }
    const bas = g._solutionPegs[gren.basIndex]
    const rB = SIZ[bas.size]
    const rG = SIZ[gren.size]
    const d = Math.hypot(gren.peg.x - bas.peg.x, gren.peg.y - bas.peg.y)

    // Skulle grenhjulet greppa NÅGON annan nod? Mät minsta |avstånd − radiesumma|
    // mot alla andra pinnar, veven och målhjulet.
    const andra = []
    g._solutionPegs.forEach((s, i) => { if (i !== gren.basIndex) andra.push({ x: s.peg.x, y: s.peg.y, r: SIZ[s.size], vad: 'hjul ' + i }) })
    andra.push({ x: 230, y: 360, r: 66, vad: 'veven' })
    andra.push({ x: g._T.x, y: g._T.y, r: 66, vad: 'malhjulet' })
    let varst = { marginal: Infinity, vad: '-' }
    for (const a of andra) {
      const dd = Math.hypot(gren.peg.x - a.x, gren.peg.y - a.y)
      const m = Math.abs(dd - (a.r + rG))
      if (m < varst.marginal) varst = { marginal: m, vad: a.vad, d: dd }
    }

    // Grenpinnen mot närmaste ANDRA pinne — jämförd med hur tätt kedjans EGNA pinnar
    // ligger. Se kommentaren vid mätningen nedan för varför ett absolut krav vore fel.
    let narmast = Infinity
    for (const v of g._pegViews) {
      const dd = Math.hypot(v.x - gren.peg.x, v.y - gren.peg.y)
      if (dd > 1) narmast = Math.min(narmast, dd)
    }
    let kedjaTatast = Infinity
    for (let i = 0; i < g._solutionPegs.length; i++) {
      for (let j = i + 1; j < g._solutionPegs.length; j++) {
        const a = g._solutionPegs[i].peg
        const b = g._solutionPegs[j].peg
        kedjaTatast = Math.min(kedjaTatast, Math.hypot(a.x - b.x, a.y - b.y))
      }
    }
    const tillVeven = Math.hypot(gren.peg.x - 230, gren.peg.y - 360)
    kedjaTatast = Math.min(kedjaTatast, Math.hypot(g._solutionPegs[0].peg.x - 230, g._solutionPegs[0].peg.y - 360))
    return {
      gren: true, d, rB, rG, mesh: Math.abs(d - (rB + rG)), varst, narmast, kedjaTatast, tillVeven,
      pegX: Math.round(gren.peg.x), pegY: Math.round(gren.peg.y), storlek: gren.size,
      flaktSyns: !!g._flaktBlad?.visible,
      flaktX: Math.round(g._flaktBlad?.x ?? -1), flaktY: Math.round(g._flaktBlad?.y ?? -1),
    }
  `)

  ok('nivå 8 bygger en gren', geo.gren)
  if (!geo.gren) {
    console.log('\n  ⚠ ingen gren byggdes — resten hoppas över\n')
    process.exit(1)
  }
  ok('grenpinnen ligger på EXAKT mesh-avstånd', geo.mesh < MESH_TOL,
    `${Math.round(geo.d)} px mot radiesumman ${geo.rB + geo.rG} → ${n2(geo.mesh)} px fel (tak ${MESH_TOL})`)
  ok('grenhjulet greppar inget ANNAT hjul', geo.varst.marginal > MESH_TOL * 2,
    `närmast är ${geo.varst.vad}: ${n2(geo.varst.marginal)} px från att greppa (tak ${MESH_TOL})`)
  // ⚠️ ETT ABSOLUT TRÄFFYTE-KRAV VORE FEL STANDARD HÄR, och första versionen av den
  // här raden var röd av just det skälet (98 px mot ett krav på 2×80 + 24 = 184).
  // Kugghjul MÅSTE röra varandra, så kedjans EGNA pinnar ligger med flit 132–150 px
  // isär — hela spelet hade fallit på samma tal. Och det är ofarligt: DragController
  // väljer NÄRMASTE mål inom radien (d < hitRadius && d < bestD i `_narmastMal`), så
  // ett släpp är entydigt även när träffytorna överlappar. Det som VORE en regression
  // är en gren som ligger trängre än kedjan själv — det är vad som mäts.
  ok('grenpinnen är inte trängre än kedjans egna pinnar', geo.narmast >= geo.kedjaTatast - 1,
    `${Math.round(geo.narmast)} px till närmaste pinne, kedjan själv tätast på ${Math.round(geo.kedjaTatast)} px`)
  ok('fläkten syns på grennivån', geo.flaktSyns, `bladen på ${geo.flaktX},${geo.flaktY} · pinnen på ${geo.pegX},${geo.pegY}`)

  // 4. Grenen är FRIVILLIG: hela kedjan lagd, grenpinnen tom → ändå komplett.
  const utan = await kor(`
    for (const s of g._solutionPegs) g._spawnGear(ctx, s.peg, s.size, {})
    g._rebuildMesh(ctx)
    await vanta(3)
    return {
      komplett: g._chainComplete,
      grenTom: !g._gren.peg.gear,
      malFaktor: g._targetFactor,
      drivna: g._gears.filter(x => x.driven).length,
      hjul: g._gears.length,
    }
  `)
  ok('kedjan blir komplett med grenpinnen TOM', utan.komplett && utan.grenTom,
    `${utan.drivna} av ${utan.hjul} hjul drivs, malFaktor ${n2(utan.malFaktor)}`)

  // 5 + 6 + 7. Lägg grenhjulet och mät.
  const med = await kor(`
    const gren = g._gren
    g._spawnGear(ctx, gren.peg, gren.size, {})
    g._rebuildMesh(ctx)
    await vanta(3)
    const gg = gren.peg.gear
    const bas = g._solutionPegs[gren.basIndex].peg.gear
    // Bashjulets grannar i den FÄRDIGA grafen: hur många drivna hjul greppar det?
    const grannar = g._gears.filter((x) => {
      if (x === bas || !x.driven) return false
      const dd = Math.hypot(x.peg.x - bas.peg.x, x.peg.y - bas.peg.y)
      return Math.abs(dd - (x.r + bas.r)) < 14
    }).length
    // Målet får INTE ha bytt fart eller håll av att grenen lades.
    const malEfter = g._targetFactor
    // Rotationen: sätt en känd vevvinkel och läs av en bildruta senare.
    g._crankAngle = 1
    await vanta(2)
    return {
      drivet: !!gg?.driven,
      fGren: gg ? gg.factor : null,
      fBas: bas ? bas.factor : null,
      rGren: gg?.r, rBas: bas?.r,
      grannar, malEfter,
      bladRot: g._flaktBlad?.rotation ?? null,
      basRot: bas?.view?.rotation ?? null,
      komplett: g._chainComplete,
    }
  `)

  ok('grenhjulet blir DRIVET', med.drivet, `faktor ${n2(med.fGren)}`)
  const vantad = -(med.rBas / med.rGren)
  ok('grenen snurrar MOTSATT bashjulet, med rätt utväxling',
    med.fBas != null && Math.abs(med.fGren / med.fBas - vantad) < 0.02,
    `ω_gren/ω_bas = ${n2(med.fGren / med.fBas)}, väntat −r_bas/r_gren = ${n2(vantad)}`)
  ok('bashjulet driver TVÅ vägar samtidigt', med.grannar >= 2,
    `${med.grannar} drivna hjul greppar bashjulet (kedjan vidare + grenen)`)
  ok('grenen ändrar INTE målets fart', Math.abs(med.malEfter - utan.malFaktor) < 1e-9,
    `malFaktor ${n2(utan.malFaktor)} → ${n2(med.malEfter)}`)
  ok('fläktbladen snurrar', Math.abs(med.bladRot) > 0.01, `${n2(med.bladRot)} rad vid vevvinkel 1,0`)
  ok('...åt motsatt håll mot bashjulet', Math.sign(med.bladRot) !== Math.sign(med.basRot),
    `blad ${n2(med.bladRot)} mot bashjul ${n2(med.basRot)}`)
  ok('...och snabbare än veven', Math.abs(med.bladRot) > 1.0, `${n2(Math.abs(med.bladRot))}× vevens vinkel`)

  // 8. Vinstvillkoret orört: nivån ska gå att veva klar UTAN grenen.
  const klart = await kor(`
    g._buildLevel(ctx, 8)
    await vanta(3)
    for (const s of g._solutionPegs) g._spawnGear(ctx, s.peg, s.size, {})
    g._rebuildMesh(ctx)
    await vanta(2)
    const grenTom = !g._gren.peg.gear
    let rutor = 0
    while (!g._resolving && rutor < 900) {
      g._crankVel = 0.3
      await vanta(1)
      rutor++
    }
    return { klar: g._resolving, rutor, grenTom }
  `)
  ok('grennivån går att veva klar UTAN grenen', klart.klar && klart.grenTom, `${klart.rutor} bildrutor`)

  // 9. Fläkten ska vara DOLD på en nivå utan gren, och inget får ticka efter exit.
  const doldOchExit = await kor(`
    g._buildLevel(ctx, 3)
    await vanta(3)
    const dold = !g._flaktBlad.visible && !g._flaktStativ.visible
    const gren = g._gren
    return { dold, gren: !!gren }
  `)
  ok('fläkten är dold på en nivå utan gren', doldOchExit.dold && !doldOchExit.gren)

  const exit = await kor(`
    g._buildLevel(ctx, 8)
    await vanta(3)
    g._spawnGear(ctx, g._gren.peg, g._gren.size, {})
    g._rebuildMesh(ctx)
    await vanta(3)
    const blad = g._flaktBlad
    app.nav.go('library')
    await new Promise((r) => setTimeout(r, 900))
    const rot1 = blad.destroyed ? null : blad.rotation
    await new Promise((r) => setTimeout(r, 600))
    return { forstord: blad.destroyed, rot1, rot2: blad.destroyed ? null : blad.rotation }
  `)
  const stilla = doldOchExit.dold && (exit.forstord || Math.abs((exit.rot2 ?? 0) - (exit.rot1 ?? 0)) < 1e-9)
  ok('fläkten tickar inte efter exit', stilla,
    exit.forstord ? 'förstörd med spelet' : `rotation ${n2(exit.rot1)} → ${n2(exit.rot2)}`)

  ok('inga konsolfel', errors.length === 0, errors.slice(0, 3).join(' | '))

  if (process.argv.includes('--bild')) {
    // ⚠️ NY SIDA: mätarmarna ovan har redan vunnit nivån, och en `delayedCall` från
    // `_onComplete` bygger om nivån mitt under exponeringen (samma fälla som
    // `_remprobe` gick i).
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForFunction(() => !!window.__barnspel.game?._crank, null, { timeout: 15000 })
    // ⚠️ VÄNTA UT SPLASHEN. Första bilden var värdelös: appens startskärm ("Tryck för
    // att börja") hade inte hunnit tona ut och täckte hela mitten — maskinen syntes,
    // men grenhjulet och fläkten låg bakom maskotens ansikte.
    await page.waitForTimeout(1000)
    await kor(`
      g._buildLevel(ctx, 8)
      await vanta(3)
      for (const s of g._solutionPegs) g._spawnGear(ctx, s.peg, s.size, {})
      g._spawnGear(ctx, g._gren.peg, g._gren.size, {})
      g._rebuildMesh(ctx)
      g._crankAngle = 0.6
      await vanta(4)
    `)
    await page.screenshot({ path: '.test-shots/_grenprobe.png' })
    console.log('\n  bild: .test-shots/_grenprobe.png')
  }

  console.log(fel === 0 ? '\n  ✓ dubbelhjulet driver två grenar\n' : `\n  ✗ ${fel} fel\n`)
  process.exit(fel === 0 ? 0 : 1)
} finally {
  await browser.close()
}
