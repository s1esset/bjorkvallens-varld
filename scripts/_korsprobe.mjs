// KUGGHJULENS KORSADE REM — vänder den riktningen, och SYNS det?
//
//   node scripts/_korsprobe.mjs        (kräver dev-servern på :5173)
//
// En rem som läggs rak behåller rotationsriktningen; läggs den korsad vänder den.
// Det är mekaniskt sant, men bara två av frågorna nedan handlar om mekaniken —
// resten om huruvida ett barn kan SE och GÖRA det. Frågorna, i tur och ordning:
//
//   1. Vänder tecknet på målets faktor när remmen korsas? (och bara tecknet)
//   2. Behåller den STORLEKEN? Utväxlingen får inte ändras av en vändning.
//   3. Korsar spannen varandra på riktigt — finns ett X i geometrin?
//   4. Ligger de raka spannens skärning UTANFÖR bandet? (rak rem = inget X)
//   5. Lindar den korsade remmen MER av båda hjulen? (2π−2ψ mot 2π totalt)
//   6. Går riktningen att vända med ett riktigt TRYCK (pointerdown, inte ett anrop)?
//   7. Snurrar målhjulet faktiskt åt andra hållet efter trycket? (mätt i bild)
//   8. P0: är träffytan ≥96 px och har den ≥24 px luft till närmaste hjul?
//   9. Är ytan DÖD innan remmen greppar? (ingen tyst bortare — `dod-traffyta`)
//  10. Rörs vinstvillkoret? Flaggan måste hissas lika mycket åt båda hållen.
//  11. Piskar repet när remmen vänds, eller läggs det om? (`_seedRem`)
//  12. Tickar något efter `destroy()`?
import { chromium } from 'playwright'

const ID = 'kugghjulen'
let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const n2 = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(2) : String(v))

const HJALP = `
  // Mät spannen på spelets EGNA repändar. Räkna inte om tangenterna här — en kopia
  // av formeln hade mätt kopian; det som ska bevisas är att BANDEN spelet ritar
  // korsar varandra. rem.repA/repB är precis de spann _ritaRemBana spänner.
  const spannPunkter = (rep) => {
    const p = rep.pts
    return { ax: p[0].x, ay: p[0].y, bx: p[p.length - 1].x, by: p[p.length - 1].y }
  }
  // Omslaget på ett hjul: tangentpunkterna delar cirkeln i två bågar och remmen tar
  // den som INTE vetter mot det andra hjulet.
  const omslag = (cx, cy, p1, p2, bortAt) => {
    const t1 = Math.atan2(p1.y - cy, p1.x - cx)
    const t2 = Math.atan2(p2.y - cy, p2.x - cx)
    const mod = (v) => ((v % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    const L = mod(t2 - t1)
    return mod(bortAt - t1) < L ? L : Math.PI * 2 - L
  }
  const matGeometri = () => {
    const rem = g._rem
    const sA = spannPunkter(rem.repA)
    const sB = spannPunkter(rem.repB)
    const A = g._remNod(rem.aRef)
    const B = g._remNod(rem.bRef)
    const beta = Math.atan2(B.y - A.y, B.x - A.x)
    const k = kryss(sA, sB)
    return {
      korsar: !!k?.inuti,
      t: k ? k.t : null,
      bagA: omslag(A.x, A.y, { x: sA.ax, y: sA.ay }, { x: sB.ax, y: sB.ay }, beta + Math.PI),
      bagB: omslag(B.x, B.y, { x: sA.bx, y: sA.by }, { x: sB.bx, y: sB.by }, beta),
    }
  }
  const vanta = (n = 1) => new Promise((r) => {
    let i = 0
    const steg = () => (++i >= n ? r() : requestAnimationFrame(steg))
    requestAnimationFrame(steg)
  })
  // Segment-segment-skärning: finns punkten där båda parametrarna ligger i (0,1)?
  const kryss = (p, q) => {
    const r = { x: p.bx - p.ax, y: p.by - p.ay }
    const s = { x: q.bx - q.ax, y: q.by - q.ay }
    const den = r.x * s.y - r.y * s.x
    if (Math.abs(den) < 1e-9) return null
    const t = ((q.ax - p.ax) * s.y - (q.ay - p.ay) * s.x) / den
    const u = ((q.ax - p.ax) * r.y - (q.ay - p.ay) * r.x) / den
    return { t, u, inuti: t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98 }
  }
  // Bygg remnivån och lägg ALLA hjul + remmen, så maskinen går.
  const byggRem = async () => {
    g._buildLevel(ctx, 5)
    await vanta(3)
    for (const s of g._solutionPegs) g._spawnGear(ctx, s.peg, s.size, {})
    g._placeRem(ctx)
    g._rebuildMesh(ctx)
    await vanta(6)
    return g._rem
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

  console.log('\nKUGGHJULEN — den korsade remmen\n')

  // --- Kalibrering: den RAKA remmen, mätt likadant i båda armarna -----------
  // Raderna nedan mäter beteende som fanns före ändringen. De körs FÖRE bailen så
  // att HEAD skriver ut samma två tal — då vet man att mätaren (kryss + omslag)
  // säger samma sak i båda armarna, och att den raka remmen är orörd.
  const rak = await kor(`
    const rem = await byggRem()
    if (!rem) return { rem: false }
    return { rem: true, geo: matGeometri(), f: g._targetFactor, kompl: g._chainComplete, harKorsning: rem.korsad !== undefined }
  `)

  if (!rak.rem) {
    console.log('\n  ⚠ ingen rem byggdes — resten hoppas över\n')
    process.exit(1)
  }
  const rakTot = rak.geo.bagA + rak.geo.bagB
  // 4.
  ok('KALIBRERING: de raka spannen skär INTE varandra', !rak.geo.korsar, 'rak rem = parallella band, inget X')
  ok('KALIBRERING: rak rem lindar exakt ett varv totalt', Math.abs(rakTot - 2 * Math.PI) < 1e-6,
    `${(rakTot * 57.3).toFixed(1)}° (mätaren stämmer)`)
  ok('KALIBRERING: rak rem sluter kedjan', rak.kompl && rak.f !== 0, `målfaktor ${n2(rak.f)}`)

  if (!rak.harKorsning) {
    console.log('\n  ⚠ HEAD: rem.korsad finns inte — vändningen är inte byggd, resten kan inte mätas\n')
    process.exit(1)
  }

  // --- 1, 2: mekaniken ------------------------------------------------------
  const mek = await kor(`
    const rem = g._rem
    g._vandRem(ctx)
    await vanta(3)
    const kors = { f: g._targetFactor, kompl: g._chainComplete, korsad: rem.korsad }
    g._vandRem(ctx)
    await vanta(3)
    return { rak: { f: ${JSON.stringify(rak.f)} }, kors, ater: g._targetFactor }
  `)

  // 1.
  ok('vändningen byter TECKEN på målets faktor', Math.sign(mek.rak.f) === -Math.sign(mek.kors.f) && mek.kors.f !== 0,
    `rak ${n2(mek.rak.f)} → korsad ${n2(mek.kors.f)}`)
  // 2.
  ok('utväxlingen är OFÖRÄNDRAD (bara riktningen vänds)', Math.abs(Math.abs(mek.rak.f) - Math.abs(mek.kors.f)) < 1e-9,
    `|rak| ${n2(Math.abs(mek.rak.f))} mot |korsad| ${n2(Math.abs(mek.kors.f))}`)
  ok('kedjan är fortfarande sluten när remmen är korsad', mek.kors.kompl === true)
  ok('en andra vändning går tillbaka till rakt', Math.abs(mek.ater - mek.rak.f) < 1e-9,
    `${n2(mek.ater)} mot ${n2(mek.rak.f)}`)

  // --- 3, 5: geometrin i KORSAT läge, mätt likadant som kalibreringen -------
  const geo = await kor(`
    g._vandRem(ctx)
    await vanta(4)
    const kors = matGeometri()
    g._vandRem(ctx)
    await vanta(4)
    return { kors }
  `)

  // 3.
  ok('de korsade spannen SKÄR varandra (ett X finns)', geo.kors.korsar,
    geo.kors.t == null ? 'ingen skärning alls' : `skärning ${(geo.kors.t * 100).toFixed(0)} % längs spannet`)
  // 5.
  const korsTot = geo.kors.bagA + geo.kors.bagB
  ok('korsad rem lindar MER av hjulen', korsTot > rakTot + 0.5,
    `omslag rak ${(rakTot * 57.3).toFixed(0)}° mot korsad ${(korsTot * 57.3).toFixed(0)}°`)
  ok('...och lindar båda hjulen lika mycket', Math.abs(geo.kors.bagA - geo.kors.bagB) < 1e-6,
    `${(geo.kors.bagA * 57.3).toFixed(0)}° mot ${(geo.kors.bagB * 57.3).toFixed(0)}°`)

  // --- 6, 7: går den att TRYCKA på, och syns det? ---------------------------
  const zon = await kor(`
    const rem = g._rem
    const v = rem.vandZon
    const p = v.getGlobalPosition ? v.getGlobalPosition() : { x: v.x, y: v.y }
    return { x: p.x, y: p.y, radie: v.hitArea?.radius ?? 0, aktiv: v.eventMode === 'static', korsad: rem.korsad, f: g._targetFactor }
  `)
  const foreRot = await kor(`return { rot: g._targetWheel.rotation, vinkel: g._crankAngle }`)

  await page.mouse.click(zon.x, zon.y)
  await page.waitForTimeout(200)
  const efter = await kor(`
    const rem = g._rem
    return { korsad: rem.korsad, f: g._targetFactor, vandad: rem.vandad }
  `)
  // 6.
  ok('ett riktigt TRYCK vänder remmen', efter.korsad === true && Math.sign(efter.f) === -Math.sign(zon.f),
    `korsad ${zon.korsad} → ${efter.korsad}, faktor ${n2(zon.f)} → ${n2(efter.f)}`)

  // 7. Veva ett bestämt varv och läs målhjulets FAKTISKA rotationsriktning i båda lägen.
  const snurr = await kor(`
    const mata = async () => {
      const f0 = g._targetWheel.rotation
      // Driv veven direkt (farten är 0, så maskinen lägger inget eget till) och
      // läs vad målhjulet gjorde. Förloppet är alltså FRYST och styrt av sonden.
      for (let i = 0; i < 20; i++) { g._crankAngle += 0.05; await vanta(1) }
      // ⚠️ VÄNTA UT TICKERN. requestAnimationFrame och Pixis ticker är två köer, och
      // under full svit-last hann sonden läsa före den sista bildrutans _stegMaskin:
      // 0,95 rad i stället för 1,00, alltså 19 av 20 steg. Farten är 0, så inget mer
      // händer av sig självt — de extra rutorna kan bara låta det sista steget landa.
      await vanta(4)
      return g._targetWheel.rotation - f0
    }
    const korsatSteg = await mata()
    g._vandRem(ctx)
    await vanta(3)
    const raktSteg = await mata()
    return { korsatSteg, raktSteg }
  `)
  ok('målhjulet snurrar åt MOTSATT håll i de två lägena',
    Math.sign(snurr.korsatSteg) === -Math.sign(snurr.raktSteg) && Math.abs(snurr.korsatSteg) > 0.05,
    `korsad ${n2(snurr.korsatSteg)} rad mot rak ${n2(snurr.raktSteg)} rad på samma vevning`)
  ok('och lika SNABBT åt båda hållen', Math.abs(Math.abs(snurr.korsatSteg) - Math.abs(snurr.raktSteg)) < 0.02,
    `|${n2(snurr.korsatSteg)}| mot |${n2(snurr.raktSteg)}|`)

  // --- 8, 9: P0 -------------------------------------------------------------
  const p0 = await kor(`
    const rem = g._rem
    const v = rem.vandZon
    const R = v.hitArea?.radius ?? 0
    // Närmaste HJUL-träffyta (hjulen bär Circle(0,0,70)).
    let narmast = Infinity
    for (const gg of g._gears) {
      if (!gg.view || gg.view.destroyed) continue
      narmast = Math.min(narmast, Math.hypot(gg.peg.x - rem.slot.x, gg.peg.y - rem.slot.y))
    }
    return { R, narmast, glapp: narmast - R - 70 }
  `)
  // 8.
  ok('P0: träffytan är ≥96 px', p0.R * 2 >= 96, `${(p0.R * 2).toFixed(0)} px diameter`)
  ok('P0: ≥24 px luft till närmaste hjul-träffyta', p0.glapp >= 24,
    `${Math.round(p0.narmast)} px till navet → ${Math.round(p0.glapp)} px glapp`)

  // 9. Ny nivå, remmen ännu inte lagd → ytan måste vara DÖD (eventMode none),
  //    inte en yta som tar emot trycket och tiger.
  const dod = await kor(`
    g._buildLevel(ctx, 5)
    await vanta(3)
    const rem = g._rem
    const fore = rem.vandZon.eventMode
    // Lägg remmen men INTE hjulen → placerad men greppar inte.
    g._placeRem(ctx)
    g._rebuildMesh(ctx)
    await vanta(3)
    const slak = { mode: rem.vandZon.eventMode, griper: rem.gripping }
    return { fore, slak }
  `)
  ok('ytan är död innan remmen är lagd', dod.fore === 'none', `eventMode ${dod.fore}`)
  ok('ytan är död medan remmen hänger SLAK', dod.slak.mode === 'none' && !dod.slak.griper,
    `eventMode ${dod.slak.mode}, griper ${dod.slak.griper}`)

  // --- 10: vinstvillkoret ---------------------------------------------------
  const flagga = await kor(`
    const rem = await byggRem()
    await vanta(2)
    const start = g._flagProgress
    for (let i = 0; i < 20; i++) { g._crankAngle += 0.05; await vanta(1) }
    await vanta(4) // samma kapplöpning som i 'snurr' — vänta ut tickern
    const rakt = g._flagProgress - start
    g._vandRem(ctx)
    await vanta(3)
    const s2 = g._flagProgress
    for (let i = 0; i < 20; i++) { g._crankAngle += 0.05; await vanta(1) }
    await vanta(4)
    return { rakt, korsat: g._flagProgress - s2 }
  `)
  ok('flaggan hissas LIKA MYCKET åt båda hållen (no-fail)',
    flagga.rakt > 0.05 && Math.abs(flagga.rakt - flagga.korsat) < 0.02,
    `rakt ${n2(flagga.rakt)} mot korsat ${n2(flagga.korsat)}`)

  // --- 11: piskar repet vid vändningen? -------------------------------------
  const pisk = await kor(`
    const rem = g._rem
    const langd = (rep) => {
      let L = 0
      for (let i = 0; i < rep.pts.length - 1; i++) L += Math.hypot(rep.pts[i + 1].x - rep.pts[i].x, rep.pts[i + 1].y - rep.pts[i].y)
      return L
    }
    const fore = langd(rem.repA) + langd(rem.repB)
    g._vandRem(ctx)
    let varst = 0
    for (let i = 0; i < 12; i++) {
      await vanta(1)
      varst = Math.max(varst, langd(rem.repA) + langd(rem.repB))
    }
    const stilla = langd(rem.repA) + langd(rem.repB)
    return { fore, varst, stilla }
  `)
  ok('repet PISKAR inte när remmen vänds', pisk.varst < pisk.stilla * 1.35,
    `värsta bildrutan ${Math.round(pisk.varst)} px mot vilo ${Math.round(pisk.stilla)} px (rak ${Math.round(pisk.fore)} px)`)

  // --- 12: exit -------------------------------------------------------------
  const exitFel = []
  page.on('pageerror', (e) => exitFel.push(e.message))
  await kor(`
    g._vandRem(ctx)
    await vanta(1)
    app.nav.go('library')
  `)
  await page.waitForTimeout(900)
  ok('inga fel efter att man lämnar mitt i en vändning', exitFel.length === 0, exitFel.join(' | ') || 'tyst')
  ok('inga konsolfel under hela körningen', errors.length === 0, errors.slice(0, 2).join(' | ') || 'tyst')

  console.log(`\n  ${fel === 0 ? '✅ ALLA GRÖNA' : `❌ ${fel} röda`}\n`)
  process.exit(fel === 0 ? 0 : 1)
} finally {
  await browser.close()
}
