// FÖLJKROPPAR-SOND (FYSIKPLAN F6a) — följer vätskans kolliderare matter-kropparna, och bär kärlet sin vätska?
//
//   node scripts/_foljprobe.mjs          (Node, ingen webbläsare, ingen dev-server)
//
// Fyra delar, varje med en KONTROLLRAD som måste hålla innan mätraden skrivs:
//   A  PORT   en kropp faller genom ett vätskeskikt. Fyra vätskor delar EN kropp och EN fysikvärld:
//             F0 inga hinder (kontroll) · FA hinder flyttade FÖR HAND (plask-i-vattnets gamla kod) ·
//             FB `foljKroppar` (samma radie och samma "är i skiktet"-villkor) · FC `foljKroppar` med FEL radie (kontroll).
//             FB ska vara BIT-IDENTISK med FA (max avvikelse 0,000 px över alla partiklar och steg);
//             F0 och FC SKA avvika (annars mäter jämförelsen ingenting).
//   B  BÄR    ett glas (botten + två sidor, tre lådor) fyllt med vatten förs 400 px i sidled och vrids.
//             Kontroll: utan `bar` blir vattnet kvar (≤ 25 % i glaset). Mät: med `bar` följer ≥ 90 % med.
//   C  ÄGARE  två kärlrutor som överlappar, bara det ena rör sig (inga kolliderare, inget fysiksteg — ren synk).
//             Kontroll: ensam bärare flyttar ALLA partiklar i sin ruta. Mät: i överlappet flyttas exakt de partiklar
//             som ligger djupast i den rörliga rutan; resten ligger EXAKT kvar (EN ägare per partikel).
//   D  LIVSCYKEL  nar() av/på lägger/tar hinder · ta() · stoppa() · förstörd fysikvärld stoppar följaren · clearColliders().
import Matter from 'matter-js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { Flytvolym } from '../src/lib/flytkraft.js'
import { FluidWorld, FLUIDS } from '../src/lib/vatska.js'

const { Body } = Matter
let fel = 0
const ok = (namn, v, d = '') => {
  console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`)
  if (!v) fel++
}
const f3 = (x) => x.toFixed(3)
const FIXED = 1000 / 60

// ---------------------------------------------------------------- A · PORT
{
  console.log('\nA · PORT — foljKroppar ger samma tal som handflyttade hinder\n')
  const SURFACE_Y = 330, FLUID_BOTTOM = 400, WALL_L = 414, WALL_R = 866, R = 34
  const varld = new PhysicsWorld({ gravityY: 0.9, walls: [] })
  varld.rectangle(640, 702, 560, 60, { isStatic: true })
  varld.rectangle(384, 300, 60, 900, { isStatic: true })
  varld.rectangle(896, 300, 60, 900, { isStatic: true })
  const vol = new Flytvolym({ varld, ytY: SURFACE_Y, botten: 672, vanster: WALL_L, hoger: WALL_R })
  const kropp = varld.circle(620, 250, 38, { restitution: 0.06, friction: 0.3, frictionAir: 0.012, density: 0.0012 })
  Body.setVelocity(kropp, { x: 0.4, y: 3.5 })
  vol.lagg(kropp, { flyt: 0.4, r: 38, hemX: 700, liv: false })
  const iSkiktet = (b) => b.position.y > SURFACE_Y - 26 && b.position.y < FLUID_BOTTOM + 20

  const nyVatska = () => {
    const w = new FluidWorld({
      max: 480,
      radius: 24,
      gravityY: 0.5,
      rho0: FLUIDS.vatten.rho0,
      sigma: FLUIDS.vatten.sigma,
      beta: FLUIDS.vatten.beta,
      restitution: 0.02,
      wallFriction: 0.2,
      walls: { left: true, right: true, bottom: true, top: true },
      bounds: { left: WALL_L, right: WALL_R, top: 258, bottom: FLUID_BOTTOM },
    })
    const steg = Math.sqrt(73)
    let n = 0
    for (let y = FLUID_BOTTOM - 4; y > SURFACE_Y; y -= steg) {
      for (let x = WALL_L + 5; x < WALL_R - 4; x += steg) w.spawn(x + (((n++ * 7919) % 100) / 100 - 0.5) * 2, y, {})
    }
    return w
  }
  const F0 = nyVatska()
  const FA = nyVatska()
  const FB = nyVatska()
  const FC = nyVatska()
  const fb = FB.foljKroppar(varld, [{ body: kropp, form: { type: 'circle', r: R }, nar: iSkiktet }])
  const fc = FC.foljKroppar(varld, [{ body: kropp, form: { type: 'circle', r: 24 }, nar: iSkiktet }])
  let collA = null
  const diff = (P, Q) => {
    let m = 0
    for (let i = 0; i < P.count; i++) m = Math.max(m, Math.abs(P.x[i] - Q.x[i]), Math.abs(P.y[i] - Q.y[i]))
    return m
  }
  let dAB = 0
  let dA0 = 0
  let dAC = 0
  let stegMedHinder = 0
  for (let s = 0; s < 420; s++) {
    varld.update(FIXED)
    // FA: den gamla handsynken (plask-i-vattnet `_fluidColliders`)
    if (iSkiktet(kropp)) {
      if (!collA) collA = FA.addCircle(kropp.position.x, kropp.position.y, R)
      collA.x = kropp.position.x
      collA.y = kropp.position.y
    } else if (collA) {
      FA.removeCollider(collA)
      collA = null
    }
    for (const w of [F0, FA, FB, FC]) w.update(FIXED)
    if (FB.colliders.length) stegMedHinder++
    dAB = Math.max(dAB, diff(FA, FB))
    dA0 = Math.max(dA0, diff(FA, F0))
    dAC = Math.max(dAC, diff(FA, FC))
  }
  console.log(`  ${stegMedHinder} av 420 steg hade ett hinder i skiktet · max avvikelse FA↔FB ${f3(dAB)} px · FA↔F0 (inga hinder) ${f3(dA0)} px · FA↔FC (fel radie) ${f3(dAC)} px`)
  ok('KONTROLL: hindret gör något — FA avviker från F0 (> 3 px)', dA0 > 3, `${f3(dA0)} px`)
  ok('KONTROLL: mätningen ser fel radie — FA avviker från FC (> 0,5 px)', dAC > 0.5, `${f3(dAC)} px`)
  ok('kroppen var i skiktet en del av tiden och utanför resten (hinder lades OCH togs)', stegMedHinder > 10 && stegMedHinder < 400, `${stegMedHinder} steg`)
  if (fel === 0) ok('MÄT: foljKroppar är bit-identisk med handsynken (max 0,000 px)', dAB === 0, `${f3(dAB)} px`)
  fb.stoppa()
  fc.stoppa()
  for (const w of [F0, FA, FB, FC]) w.destroy()
  vol.destroy()
  varld.destroy()
}

// ---------------------------------------------------------------- B · BÄR
if (!fel) {
  console.log('\nB · BÄR — ett glas bär sitt vatten\n')
  const kor = (medBar) => {
    const varld = new PhysicsWorld({ gravityY: 0, walls: [] })
    const glas = varld.rectangle(300, 500, 120, 120, { isStatic: true, label: 'glas', isSensor: true })
    const w = new FluidWorld({
      max: 200,
      radius: 24,
      gravityY: 0.5,
      bounds: { left: 0, right: 1280, top: -200, bottom: 720 },
      walls: { left: true, right: true, bottom: true, top: false },
    })
    const GL = 120
    const GH = 120
    const T = 12
    const form = [
      { type: 'box', w: GL, h: T, dx: 0, dy: GH / 2 - T / 2 },
      { type: 'box', w: T, h: GH, dx: -GL / 2 + T / 2, dy: 0 },
      { type: 'box', w: T, h: GH, dx: GL / 2 - T / 2, dy: 0 },
    ]
    const bar = medBar ? { w: GL - 2 * T, h: GH - T, dx: 0, dy: -T / 2, upp: 30 } : null
    const fk = w.foljKroppar(varld, [{ body: glas, form, bar }])
    // fyll innerrutan (96 × 108) med ~54 partiklar
    for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) w.spawn(300 - 44 + c * 11, 500 + 40 - r * 14, {})
    const start = w.count
    for (let s = 0; s < 120; s++) {
      varld.update(FIXED)
      w.update(FIXED)
    } // sätt sig i glaset
    const nedan = () => {
      const p = glas.position
      const a = glas.angle
      const ca = Math.cos(-a)
      const sa = Math.sin(-a)
      let n = 0
      for (let i = 0; i < w.count; i++) {
        const rx = w.x[i] - p.x
        const ry = w.y[i] - p.y
        const lx = rx * ca - ry * sa
        const ly = rx * sa + ry * ca
        if (Math.abs(lx) < GL / 2 && ly > -GH / 2 - 30 && ly < GH / 2) n++
      }
      return n
    }
    const innan = nedan()
    // ENDAST glaset rör sig, SNABBT (barnet drar ett glas): 400 px i sidled + 0,5 rad över 30 steg (13 px/steg)
    for (let s = 1; s <= 30; s++) {
      Body.setPosition(glas, { x: 300 + (400 * s) / 30, y: 500 })
      Body.setAngle(glas, (0.5 * s) / 30)
      varld.update(FIXED)
      w.update(FIXED)
    }
    for (let s = 0; s < 60; s++) {
      varld.update(FIXED)
      w.update(FIXED)
    }
    const efter = nedan()
    const res = { start, slut: w.count, innan, efter }
    fk.stoppa()
    w.destroy()
    varld.destroy()
    return res
  }
  const utan = kor(false)
  const med = kor(true)
  console.log(`  partiklar ${med.start} · i glaset före flytten: ${utan.innan} (utan bar) / ${med.innan} (med bar)`)
  console.log(`  efter 400 px + 0,5 rad på 30 steg: ${utan.efter} kvar utan bar · ${med.efter} kvar med bar`)
  ok('KONTROLL: utan bar blir vattnet kvar (≤ 25 % av det som låg i glaset)', utan.innan > 30 && utan.efter <= utan.innan * 0.25, `${utan.efter}/${utan.innan}`)
  ok('MÄT: med bar följer ≥ 90 % med', med.efter >= med.innan * 0.9, `${med.efter}/${med.innan}`)
  ok('volymen konstant (inget skapas, inget förstörs)', med.slut === med.start && utan.slut === utan.start)
}

// ---------------------------------------------------------------- C · ÄGARE
if (!fel) {
  console.log('\nC · ÄGARE — en ägare per partikel\n')
  const mk = () => {
    const w = new FluidWorld({ max: 600, bounds: { left: -2000, right: 2000, top: -2000, bottom: 2000 }, walls: { left: false, right: false, bottom: false, top: false } })
    const pos = []
    for (let x = 210; x < 500; x += 10) {
      for (let y = 210; y < 400; y += 10) {
        w.spawn(x, y, {})
        pos.push([x, y])
      }
    }
    return { w, pos }
  }
  // A: ruta 200..400 × 200..400 (mitt 300,300)  ·  B: ruta 300..500 × 200..400 (mitt 400,300). Överlapp x 300..400.
  const A = { x: 300, y: 300, angle: 0 }
  const B = { x: 400, y: 300, angle: 0 }
  const kropp = (o) => ({ position: { x: o.x, y: o.y }, angle: o.angle })
  const inne = (cx, x, y) => {
    const dS = 100 - Math.abs(x - cx)
    const dT = y - 200
    const dB = 400 - y
    return dS > 0 && dT > 0 && dB > 0 ? Math.min(dS, dT, dB) : 0
  }
  const bar = { w: 200, h: 200 }
  const korOverlapp = (medB) => {
    const { w, pos } = mk()
    const a = kropp(A)
    const b = kropp(B)
    const fk = w.foljKroppar(null, [{ body: a, bar }])
    if (medB) fk.lagg({ body: b, bar })
    fk.sync() // första synken: ingen förflyttning än, bara "var står de"
    a.position.x += 50 // ENDAST A rör sig
    fk.sync()
    let flyttade = 0
    let kvar = 0
    let fel0 = 0
    let fel1 = 0
    for (let i = 0; i < w.count; i++) {
      const [x0, y0] = pos[i]
      const dA = inne(A.x, x0, y0)
      const dB = medB ? inne(B.x, x0, y0) : 0
      const flyttad = Math.abs(w.x[i] - x0) > 1e-6 || Math.abs(w.y[i] - y0) > 1e-6
      const fortjanatFlytt = dA > 0 && dA >= dB // A äger (djupast, eller ensam)
      if (flyttad) flyttade++
      else kvar++
      if (flyttad !== fortjanatFlytt) {
        if (flyttad) fel0++
        else fel1++
      }
      if (flyttad && Math.abs(w.x[i] - (x0 + 50)) > 1e-6) fel0++
    }
    fk.stoppa()
    w.destroy()
    return { flyttade, kvar, fel0, fel1, n: pos.length }
  }
  const ensam = korOverlapp(false)
  const dubbel = korOverlapp(true)
  const iA = (() => {
    let n = 0
    const { pos } = mk()
    for (const [x, y] of pos) if (inne(A.x, x, y) > 0) n++
    return n
  })()
  console.log(`  ensam bärare: ${ensam.flyttade} av ${ensam.n} flyttade (förväntat ${iA} i rutan) · med granne: ${dubbel.flyttade} flyttade, ${dubbel.kvar} kvar`)
  ok('KONTROLL: en ensam bärare flyttar exakt partiklarna i sin ruta', ensam.flyttade === iA && ensam.fel0 === 0 && ensam.fel1 === 0, `${ensam.flyttade}/${iA}`)
  ok('KONTROLL: grannen ändrar utfallet (färre flyttas när B äger överlappet)', dubbel.flyttade < ensam.flyttade, `${dubbel.flyttade} < ${ensam.flyttade}`)
  ok('MÄT: i överlappet flyttas exakt de som ligger djupast i A — resten ligger EXAKT kvar', dubbel.fel0 === 0 && dubbel.fel1 === 0, `${dubbel.fel0 + dubbel.fel1} fel`)
}

// ---------------------------------------------------------------- D · LIVSCYKEL
if (!fel) {
  console.log('\nD · LIVSCYKEL\n')
  const varld = new PhysicsWorld({ gravityY: 0, walls: [] })
  const b = varld.circle(100, 100, 20, {})
  const w = new FluidWorld({ max: 10, bounds: { left: 0, right: 1280, top: -200, bottom: 720 } })
  let aktiv = true
  const fk = w.foljKroppar(varld, [{ body: b, form: { type: 'circle', r: 30 }, nar: () => aktiv }])
  w.spawn(600, 300, {})
  w.update(FIXED)
  ok('aktiv kropp → ett hinder på kroppens plats', w.colliders.length === 1 && w.colliders[0].x === 100 && w.colliders[0].y === 100)
  Body.setPosition(b, { x: 200, y: 150 })
  w.update(FIXED)
  ok('hindret FÖLJER kroppen', w.colliders[0].x === 200 && w.colliders[0].y === 150)
  ok('rec.coll är hindret medan kroppen är aktiv', fk._recs[0].coll === w.colliders[0])
  aktiv = false
  w.update(FIXED)
  ok('nar() falsk → hindret tas bort (inget spöke)', w.colliders.length === 0 && fk._recs[0].coll === null)
  aktiv = true
  w.update(FIXED)
  ok('nar() sann igen → hindret läggs tillbaka', w.colliders.length === 1)
  fk.ta(b)
  ok('ta(kropp) → hindret borta, posten borta', w.colliders.length === 0 && fk.antal === 0)
  const fk2 = w.foljKroppar(varld, [{ body: b, form: { type: 'box', w: 40, h: 20, angle: 0.3 } }])
  w.update(FIXED)
  ok('lådform: vinkel = kroppens + formens', w.colliders.length === 1 && Math.abs(w.colliders[0].angle - 0.3) < 1e-9)
  w.clearColliders()
  w.update(FIXED)
  ok('clearColliders() följs av en ny synk utan krasch (hindret läggs om)', w.colliders.length === 1)
  varld.destroy()
  w.update(FIXED)
  ok('förstörd fysikvärld → följaren stoppar sig själv och tar sina hinder', w.colliders.length === 0 && fk2._alive === false)
  w.destroy()
  ok('FluidWorld.destroy() släpper följarna', w._foljare === null)
}

console.log(fel ? `\n${fel} fel.` : '\nAlla delar gröna.')
process.exit(fel ? 1 : 0)
