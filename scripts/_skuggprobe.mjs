// SKUGGVÄRLDEN (FYSIKPLAN G3a) — ljuger pricklinjen längre, och vad kostar den?
//
//   node scripts/_skuggprobe.mjs            (ingen webbläsare, några sekunder)
//
// Frågan: `AimLauncher`s förhandsbana har varit en punktmassa (`predict`) som bara känner golv och
// väggar. G3a ger launchern en liten matter-motor med spelets egna statiska kroppar och en provkula
// med den riktiga kulans tal (`Skuggvarld`). Är banan SANNARE — mätt i px mot den verkliga banan —
// och håller den budgeten (≤ 0,5 ms per omritning à 64 steg i Node)?
//
// Mätetalet är det ENDA som avgör: kulans läge efter varje fast 1/60-steg i spelets riktiga
// PhysicsWorld (verklig bana) mot förhandsbanans läge efter samma steg. Per skott: STÖRSTA avvikelsen
// över alla 64 steg och avvikelsen vid sista pricken ("landningen"). Bowling mäts dessutom som
// _studsprobe §7: x vid käglornas rader.
//
// ARMAR
//   HEAD  = launchern utan nyckel: `predict()` med spelets egna bounds/damp (exakt vad spelet skickar)
//   (a)   = `Skuggvarld` — statiska kroppar OCH kulans tal läses ur spelets värld
// KONTROLLER (körs först, annars mäter jämförelsen något annat)
//   · ett rakt skott som aldrig rör en vägg stämmer i BÅDA armarna
//   · HEAD:s kända fel reproduceras (bowling §7: 9,1 px "vänster flack" vid rad 210)
//   · mätaren rör sig: räckets gamla deklaration (`restitution: 0.75`, nollad av setStatic) gör HEAD
//     > 30 px fel, och (a) följer med utan att någon rör en rad
//   · skuggsteg ändrar inte spelets bana (bit-identiskt med och utan skuggsteg emellan)
//
// Spelens tal är KOPIERADE ur koden (rad angiven) — ändras ett spel måste raden här följa med.
import { PhysicsWorld, MATERIALS, Body } from '../src/lib/physics.js'
import { predict, Skuggvarld } from '../src/lib/launcher.js'

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const f1 = (x) => x.toFixed(1)
const STEG = 64 // launcherns förhandsbana
const DT = 1000 / 60
const STEG2 = DT * DT

// --- spelens världar --------------------------------------------------------------------------

// bowling/index.js:136-148, 561-564, 781-784 — toppvy, gravitation 0, klotet = MATERIALS.heavy.
const BOWLING_BALL_R = 46
const BOWLING_FA = 0.012
function bowlingVarld({ rack }) {
  const v = new PhysicsWorld({ gravityY: 0, gravityX: 0, walls: [] })
  v.rectangle(312, 400, 24, 580, { isStatic: true, restitution: 0.2, friction: 0.2, label: 'wall' })
  v.rectangle(968, 400, 24, 580, { isStatic: true, restitution: 0.2, friction: 0.2, label: 'wall' })
  if (rack === 'nyckel') {
    v.rectangle(360, 400, 16, 540, { isStatic: true, studs: 0.75, friktion: 0.1, label: 'bumper' })
    v.rectangle(920, 400, 16, 540, { isStatic: true, studs: 0.75, friktion: 0.1, label: 'bumper' })
  } else if (rack === 'head') {
    // spelets deklaration FÖRE V10b: restitution 0,75 som setStatic nollade
    v.rectangle(360, 400, 16, 540, { isStatic: true, restitution: 0.75, friction: 0.1, label: 'bumper' })
    v.rectangle(920, 400, 16, 540, { isStatic: true, restitution: 0.75, friction: 0.1, label: 'bumper' })
  }
  const b = v.circle(640, 600, BOWLING_BALL_R, { ...MATERIALS.heavy, frictionAir: BOWLING_FA, label: 'ball' })
  Body.setInertia(b, Infinity)
  return { v, b, start: { x: 640, y: 600 }, gy: 0, wx: 0 }
}
// bowling/index.js:569-573 — _previewBounds()
const bowlingBounds = (bumper) => bumper
  ? { leftX: 368 + BOWLING_BALL_R, rightX: 912 - BOWLING_BALL_R, restitution: 0.75 }
  : { leftX: 324 + BOWLING_BALL_R, rightX: 956 - BOWLING_BALL_R, restitution: 0.2 }

// rulla-bollen-hem/index.js:44-47, 66-70, 448-457 — toppvy, gravitation 0, fyra väggar.
const RULLA_WALL = { l: 60, r: 1220, t: 120, b: 680 }
const RULLA_BALL_R = 56
const WALL_REST = 0.55
const WIND_CUTOFF = 4
const RULLA_BOLLAR = { normal: { rest: 0.55, dragAdd: 0 }, bouncy: { rest: 0.82, dragAdd: -0.005 }, heavy: { rest: 0.4, dragAdd: 0.012 } }
const RULLA_YTOR = { gras: 0.028, is: 0.014, sand: 0.044 }
const RULLA_PREVIEW = { floorY: RULLA_WALL.b - RULLA_BALL_R, leftX: RULLA_WALL.l + RULLA_BALL_R, rightX: RULLA_WALL.r - RULLA_BALL_R }
function rullaVarld({ yta, boll, hinder = false }) {
  const bk = RULLA_BOLLAR[boll]
  const fa = Math.max(0.008, Math.min(0.09, RULLA_YTOR[yta] + bk.dragAdd))
  const v = new PhysicsWorld({ gravityY: 0, walls: [] })
  const T = 220, W = 1280, H = 720
  const opt = { isStatic: true, restitution: WALL_REST, friction: 0.04, label: 'wall' }
  v.rectangle(RULLA_WALL.l - T / 2, H / 2, T, H + 600, opt)
  v.rectangle(RULLA_WALL.r + T / 2, H / 2, T, H + 600, opt)
  v.rectangle(W / 2, RULLA_WALL.t - T / 2, W + 600, T, opt)
  v.rectangle(W / 2, RULLA_WALL.b + T / 2, W + 600, T, opt)
  if (hinder) {
    v.rectangle(600, 330, 64, 220, { isStatic: true, restitution: 0.32, friction: 0.1, label: 'block' })
    v.circle(830, 520, 50, { isStatic: true, restitution: 0.92, friction: 0, label: 'bumper' })
  }
  v.circle(1060, 400, 55, { isStatic: true, isSensor: true, label: 'home' }) // målsensorn: ska aldrig vara med
  const b = v.circle(200, 400, RULLA_BALL_R, { restitution: bk.rest, friction: 0.04, frictionAir: fa, density: 0.0012, label: 'ball' })
  Body.setInertia(b, Infinity)
  return {
    v, b, start: { x: 200, y: 400 }, gy: 0, wx: 0, fa,
    headBounds: { ...RULLA_PREVIEW, restitution: Math.max(bk.rest, WALL_REST) }, // _applyMaterials
  }
}

// --- mätning ----------------------------------------------------------------------------------

// Den VERKLIGA banan: ett fast steg i taget i spelets egen PhysicsWorld, läge efter varje steg.
// `vind` (px/steg²) slås på vid skottet och av när farten sjunker under WIND_CUTOFF (spelets egen regel).
// `skugga` = anropa skuggvärlden emellan varje steg (prövar att den inte stör spelets bana).
function verklig(w, vx, vy, { vind = 0, skugga = null } = {}) {
  Body.setPosition(w.b, { x: w.start.x, y: w.start.y })
  Body.setVelocity(w.b, { x: vx, y: vy })
  Body.setAngularVelocity(w.b, 0)
  let vindPa = false
  if (vind !== 0) {
    w.v.setWind(vind / STEG2, 0)
    vindPa = true
  }
  const bana = []
  for (let i = 0; i < STEG; i++) {
    if (skugga) skugga(i)
    w.v.update(DT)
    bana.push({ x: w.b.position.x, y: w.b.position.y })
    if (vindPa && Math.hypot(w.b.velocity.x, w.b.velocity.y) < WIND_CUTOFF) {
      w.v.setWind(0, 0)
      vindPa = false
    }
  }
  w.v.setWind(0, 0)
  return bana
}

// Avvikelse mellan två banor stegvis: störst över hela banan, och vid förhandsbanans sista punkt.
function avvik(prick, real) {
  const n = Math.min(prick.length, real.length)
  let max = 0
  for (let i = 0; i < n; i++) max = Math.max(max, Math.hypot(prick[i].x - real[i].x, prick[i].y - real[i].y))
  const slut = n ? Math.hypot(prick[n - 1].x - real[n - 1].x, prick[n - 1].y - real[n - 1].y) : NaN
  return { max, slut, n }
}

// x vid en given y-rad (linjär interpolation mellan två steg) — _studsprobe §7:s korsning().
function korsning(punkter, startX, startY, y) {
  let prev = { x: startX, y: startY }
  for (const p of punkter) {
    if (p.y <= y) return prev.x + (p.x - prev.x) * ((prev.y - y) / (prev.y - p.y))
    prev = p
  }
  return null
}

// HEAD-banan: exakt vad `AimLauncher._drawTrail` ritar utan nyckeln (predict, men varje steg så den kan jämföras).
const headBana = (w, vx, vy, bounds, damp, wind = 0) => predict(w.start.x, w.start.y, vx, vy, 0, wind, bounds, damp, 1)

// (a): launchern skapar skuggvärlden ur `varld` + `kula`; mäts här med varje steg som en punkt.
const nySkugg = (w, extra = {}) => new Skuggvarld({ varld: w.v, kula: w.b, hoppa: 1, ...extra })
const skuggBana = (sv, w, vx, vy, wind = 0) => sv.bana(w.start.x, w.start.y, vx, vy, { gy: w.gy, wx: wind })

console.log('\nSKUGGVÄRLDEN (G3a) — förhandsbana mot verklig bana, px · HEAD mot (a)\n')

// =============================================================================================
// KONTROLLER
// =============================================================================================
console.log('  KONTROLLER')
{
  const bnd = bowlingBounds(true)
  const damp = 1 - BOWLING_FA

  // 1. Rakt skott (rör aldrig ett räcke): båda armarna stämmer.
  const rakt = { vx: -2, vy: -26 }
  const w = bowlingVarld({ rack: 'nyckel' })
  const sk1 = nySkugg(w)
  const a1 = skuggBana(sk1, w, rakt.vx, rakt.vy)
  sk1.destroy()
  const real = verklig(w, rakt.vx, rakt.vy)
  w.v.destroy()
  const eH = avvik(headBana(w, rakt.vx, rakt.vy, bnd, damp), real)
  const eS = avvik(a1, real)
  ok('kontroll: rakt skott stämmer i HEAD', eH.max < 1, `${f1(eH.max)} px över ${eH.n} steg`)
  ok('kontroll: rakt skott stämmer i (a)', eS.max < 1, `${f1(eS.max)} px över ${eS.n} steg`)

  // 2. HEAD:s kända fel (§7): vänster flack, rad 210 → 9,1 px.
  const flack = { vx: -22, vy: -12 }
  const w2 = bowlingVarld({ rack: 'nyckel' })
  const rf = verklig(w2, flack.vx, flack.vy)
  w2.v.destroy()
  const hy = korsning(headBana(w, flack.vx, flack.vy, bnd, damp), 640, 600, 210)
  const ry = korsning(rf, 640, 600, 210)
  const fe = Math.abs(hy - ry)
  ok('kontroll: HEAD reproducerar _studsprobe §7 ("vänster flack", rad 210 = 9,1 px)', Math.abs(fe - 9.1) < 0.6, `${f1(fe)} px`)
}
{
  // 3. Mätaren rör sig: med räckets GAMLA deklaration (restitution 0,75 nollad av setStatic) ljuger HEAD stort —
  //    och (a) följer med utan att någon rad ändrats, eftersom den läser kroppens verkliga tal.
  const w = bowlingVarld({ rack: 'head' })
  const sv = nySkugg(w)
  const bnd = bowlingBounds(true)
  const damp = 1 - BOWLING_FA
  const s = { vx: -22, vy: -12 }
  const a3 = skuggBana(sv, w, s.vx, s.vy)
  const real = verklig(w, s.vx, s.vy)
  const eH = avvik(headBana(w, s.vx, s.vy, bnd, damp), real)
  const eS = avvik(a3, real)
  ok('kontroll: mätaren rör sig — gammal räckdeklaration ger HEAD > 30 px fel', eH.max > 30, `HEAD ${f1(eH.max)} px · (a) ${f1(eS.max)} px`)
  ok('...och (a) följer kroppens verkliga tal (< 3 px) utan att något tal rörts', eS.max < 3)
  sv.destroy()
  w.v.destroy()
}
{
  // 4. Skuggsteg stör inte spelets värld: bit-identisk bana med och utan skuggbanor emellan stegen.
  const a = bowlingVarld({ rack: 'nyckel' })
  const b = bowlingVarld({ rack: 'nyckel' })
  const sv = nySkugg(b)
  const s = { vx: -22, vy: -12 }
  const utan = verklig(a, s.vx, s.vy)
  const med = verklig(b, s.vx, s.vy, { skugga: (i) => { if (i % 4 === 0) sv.bana(640, 600, s.vx * 0.9, s.vy * 1.1, { hoppa: 1 }) } })
  let diff = 0
  for (let i = 0; i < utan.length; i++) diff = Math.max(diff, Math.hypot(utan[i].x - med[i].x, utan[i].y - med[i].y))
  ok('skuggbanor emellan spelets steg ändrar spelets bana 0,000 px (delade statiska kroppar är orörda)', diff === 0, `${diff} px över ${utan.length} steg`)
  const statiska = b.v.world.bodies.filter((x) => x.isStatic)
  ok('de delade kropparna ligger kvar i spelets värld, orörda av skuggmotorn',
    statiska.length === 4 && statiska.every((x) => Math.abs(x.velocity.x) + Math.abs(x.velocity.y) < 1e-9), `${statiska.length} statiska`)
  sv.destroy()
  a.v.destroy()
  b.v.destroy()
}

// =============================================================================================
// BOWLING — sex skott, kantstöd PÅ (spelets grundläge) och AV
// =============================================================================================
const SKOTT_B = [
  { namn: 'rakt', vx: -2, vy: -26 },
  { namn: 'vänster brant', vx: -18, vy: -16 },
  { namn: 'vänster flack', vx: -22, vy: -12 },
  { namn: 'höger', vx: 20, vy: -14 },
  { namn: 'höger flack', vx: 24, vy: -9 },
  { namn: 'svagt vänster', vx: -9, vy: -22 },
]
const RADER = [330, 210]
const bowlingRes = { head: [], skugg: [], rHead: [], rSkugg: [] }
for (const bumper of [true, false]) {
  console.log(`\n  BOWLING · kantstöd ${bumper ? 'PÅ' : 'AV'} — px fel (störst över 64 steg / vid sista pricken) · rader = x vid käglornas rader`)
  const bnd = bowlingBounds(bumper)
  const damp = 1 - BOWLING_FA
  for (const s of SKOTT_B) {
    const w = bowlingVarld({ rack: bumper ? 'nyckel' : 'ingen' }) // färsk värld per skott: inga kvarliggande kontaktpar
    const sv = nySkugg(w)
    const a = skuggBana(sv, w, s.vx, s.vy)
    const real = verklig(w, s.vx, s.vy)
    const h = headBana(w, s.vx, s.vy, bnd, damp)
    sv.destroy()
    w.v.destroy()
    const eH = avvik(h, real)
    const eS = avvik(a, real)
    const rad = RADER.map((y) => {
      const r = korsning(real, 640, 600, y)
      const xh = korsning(h, 640, 600, y)
      const xs = korsning(a, 640, 600, y)
      if (r == null || xh == null || xs == null) return `y${y}: –`
      bowlingRes.rHead.push(Math.abs(xh - r))
      bowlingRes.rSkugg.push(Math.abs(xs - r))
      return `y${y} ${f1(Math.abs(xh - r))}/${f1(Math.abs(xs - r))}`
    })
    bowlingRes.head.push(eH)
    bowlingRes.skugg.push(eS)
    console.log(`    ${s.namn.padEnd(14)} HEAD ${f1(eH.max).padStart(6)} / ${f1(eH.slut).padStart(6)}   (a) ${f1(eS.max).padStart(6)} / ${f1(eS.slut).padStart(6)}   rader HEAD/(a): ${rad.join('  ')}`)
  }
}
const maxav = (xs, k) => Math.max(...xs.map((x) => x[k]))
{
  const hMax = maxav(bowlingRes.head, 'max')
  const sMax = maxav(bowlingRes.skugg, 'max')
  const hRad = Math.max(...bowlingRes.rHead)
  const sRad = Math.max(...bowlingRes.rSkugg)
  console.log(`\n    bowling sammanlagt: störst fel över banan HEAD ${f1(hMax)} px → (a) ${f1(sMax)} px · vid käglornas rader HEAD ${f1(hRad)} px → (a) ${f1(sRad)} px`)
  ok('bowling: (a) är inte sämre än HEAD vid käglornas rader (HEAD stod på 9 px)', sRad <= hRad + 0.5, `${f1(sRad)} mot ${f1(hRad)} px`)
  ok('bowling: (a) är inte sämre än HEAD över hela banan', sMax <= hMax + 0.5, `${f1(sMax)} mot ${f1(hMax)} px`)
  ok('bowling: (a) ligger under 3 px över hela banan', sMax < 3, `${f1(sMax)} px`)
}

// =============================================================================================
// RULLA-BOLLEN-HEM — väggar (bara 'wall' i skuggvärlden: hindren är medvetet inte med i pricklinjen)
// =============================================================================================
const SKOTT_R = [
  { namn: 'rakt hem', vx: 22, vy: 0 },
  { namn: 'upp-höger', vx: 20, vy: -15 },
  { namn: 'ner-höger', vx: 24, vy: 17 },
  { namn: 'bakåt-upp', vx: -14, vy: -20 },
  { namn: 'brant ner', vx: 6, vy: 25 },
  { namn: 'flackt bank', vx: 26, vy: -7 },
]
const VARIANTER = [
  { yta: 'gras', boll: 'normal', vind: 0 },
  { yta: 'is', boll: 'bouncy', vind: 0 },
  { yta: 'sand', boll: 'heavy', vind: 0 },
  { yta: 'gras', boll: 'heavy', vind: 0 },
  { yta: 'is', boll: 'normal', vind: 0.057 }, // vind som bana 5 (windForLevel)
  { yta: 'gras', boll: 'bouncy', vind: -0.081 },
]
const rullaRes = { head: [], skugg: [], perVariant: [] }
console.log('\n  RULLA-BOLLEN-HEM — px fel (störst över 64 steg / vid sista pricken), HEAD mot (a)')
for (const V of VARIANTER) {
  const hv = []
  const sk = []
  const bitar = []
  for (const s of SKOTT_R) {
    const w = rullaVarld(V)
    const damp = 1 - w.fa
    const sv = nySkugg(w, { filter: (b) => b.label === 'wall', vindMinFart: WIND_CUTOFF })
    const a = skuggBana(sv, w, s.vx, s.vy, V.vind)
    const real = verklig(w, s.vx, s.vy, { vind: V.vind })
    const eH = avvik(headBana(w, s.vx, s.vy, w.headBounds, damp, V.vind), real)
    const eS = avvik(a, real)
    sv.destroy()
    w.v.destroy()
    hv.push(eH)
    sk.push(eS)
    rullaRes.head.push(eH)
    rullaRes.skugg.push(eS)
    bitar.push(`${s.namn} ${f1(eH.max)}/${f1(eS.max)}`)
  }
  rullaRes.perVariant.push({ V, h: maxav(hv, 'max'), s: maxav(sk, 'max'), hs: maxav(hv, 'slut'), ss: maxav(sk, 'slut') })
  console.log(`    ${V.yta}/${V.boll}${V.vind ? '/vind ' + V.vind : ''}`.padEnd(30) + `största HEAD ${f1(maxav(hv, 'max')).padStart(6)} / ${f1(maxav(hv, 'slut')).padStart(6)}   (a) ${f1(maxav(sk, 'max')).padStart(6)} / ${f1(maxav(sk, 'slut')).padStart(6)}`)
  console.log(`      per skott (max HEAD/(a)): ${bitar.join(' · ')}`)
}
{
  const hMax = maxav(rullaRes.head, 'max')
  const sMax = maxav(rullaRes.skugg, 'max')
  const hSlut = maxav(rullaRes.head, 'slut')
  const sSlut = maxav(rullaRes.skugg, 'slut')
  console.log(`\n    rulla sammanlagt: störst fel över banan HEAD ${f1(hMax)} px → (a) ${f1(sMax)} px · vid sista pricken HEAD ${f1(hSlut)} px → (a) ${f1(sSlut)} px`)
  ok('rulla-bollen-hem: (a) är inte sämre än HEAD i någon variant (störst fel)',
    rullaRes.perVariant.every((p) => p.s <= p.h + 0.5), rullaRes.perVariant.map((p) => `${f1(p.h)}→${f1(p.s)}`).join(' '))
  ok('rulla-bollen-hem: (a) är inte sämre än HEAD vid sista pricken',
    rullaRes.perVariant.every((p) => p.ss <= p.hs + 0.5), rullaRes.perVariant.map((p) => `${f1(p.hs)}→${f1(p.ss)}`).join(' '))
  ok('rulla-bollen-hem: (a) ligger under 3 px över hela banan', sMax < 3, `${f1(sMax)} px`)
}

// NEGATIV KONTROLL för (a)-armen: den ger 0,0 px överallt, så den måste visas kunna ge något annat.
// Fel provkula (studs 0,1 mot spelets 0,55), och hinder som finns i verkligheten men inte i skuggvärlden.
{
  const w = rullaVarld({ yta: 'gras', boll: 'normal' })
  const fel = new Skuggvarld({ varld: w.v, kula: { r: RULLA_BALL_R, restitution: 0.1, friction: 0.04, frictionAir: w.fa, density: 0.0012, ineria: Infinity }, hoppa: 1 })
  const a = skuggBana(fel, w, 20, -15)
  const real = verklig(w, 20, -15)
  fel.destroy()
  w.v.destroy()
  const e = avvik(a, real)
  ok('negativ kontroll: (a) med FEL kula (studs 0,1 i stället för 0,55) avviker > 20 px — armen kan ge ett annat tal än 0,0', e.max > 20, `${f1(e.max)} px`)
  const w2 = rullaVarld({ yta: 'gras', boll: 'normal', hinder: true })
  const bara = new Skuggvarld({ varld: w2.v, kula: w2.b, filter: (b) => b.label === 'wall', hoppa: 1 })
  const a2 = skuggBana(bara, w2, 22, 0)
  const r2 = verklig(w2, 22, 0)
  bara.destroy()
  w2.v.destroy()
  const e2 = avvik(a2, r2)
  console.log(`    walls-only (spelets val) i en värld MED hinder: ${f1(e2.max)} px — hindren är medvetet inte med i pricklinjen`)
  ok('negativ kontroll: walls-only i en värld med hinder avviker (filtret verkar)', e2.max > 20, `${f1(e2.max)} px`)
}

// Hinder: med skuggvärlden är det en rad (`filter`) att ta med dem — mät att de då också stämmer.
{
  console.log('\n  RULLA med hinder (klossen + studsdynan) — om `filter` släpper in dem (INTE spelets val, bara att det går):')
  const tre = [{ vx: 22, vy: 0 }, { vx: 20, vy: -6 }, { vx: 21, vy: 7 }, { vx: 17, vy: 12 }]
  const kor = (s) => {
    const w = rullaVarld({ yta: 'gras', boll: 'normal', hinder: true })
    const sv = nySkugg(w, { filter: (b) => b.label !== 'home' })
    const a = skuggBana(sv, w, s.vx, s.vy)
    const real = verklig(w, s.vx, s.vy)
    const h = headBana(w, s.vx, s.vy, w.headBounds, 1 - w.fa)
    sv.destroy()
    w.v.destroy()
    return { a: avvik(a, real), h: avvik(h, real) }
  }
  const res = tre.map(kor)
  const e = res.map((r) => r.a)
  const med = res.map((r) => r.h)
  console.log(`    störst fel (a) med hinder ${f1(Math.max(...e.map((x) => x.max)))} px · HEAD (ser inga hinder) ${f1(Math.max(...med.map((x) => x.max)))} px`)
  ok('hinder med: (a) följer en bana som träffar klossen/dynan (< 3 px), HEAD gör det inte', Math.max(...e.map((x) => x.max)) < 3 && Math.max(...med.map((x) => x.max)) > 20)
}

// =============================================================================================
// forhandsStopp — banan slutar vid en kropp med egna impulser
// =============================================================================================
console.log('\n  forhandsStopp')
{
  const v = new PhysicsWorld({ gravityY: 0, walls: [] })
  v.rectangle(640, 100, 400, 20, { isStatic: true, label: 'vagg' }) // ligger vid sidan om banan
  v.rectangle(300, 300, 40, 300, { isStatic: true, isSensor: true, forhandsStopp: true, label: 'moln' }) // skjuter kulan uppåt i spelet
  v.circle(900, 300, 40, { isStatic: true, isSensor: true, label: 'mal' }) // vanlig sensor: ska aldrig stoppa
  const b = v.circle(100, 300, 20, { restitution: 0.5, frictionAir: 0.01, label: 'kula' })
  const sv = new Skuggvarld({ varld: v, kula: b, hoppa: 1 })
  const p = sv.bana(100, 300, 12, 0)
  const sista = p[p.length - 1]
  ok('en kropp med forhandsStopp avslutar banan vid kontakten', sista.x > 250 && sista.x < 300 && p.length < 64, `slutar x ${Math.round(sista.x)} efter ${p.length} steg (molnets kant ≈ 280−20)`)
  const fri = new Skuggvarld({ varld: v, kula: b, hoppa: 1, filter: (x) => x.label !== 'moln' })
  const q = fri.bana(100, 300, 12, 0)
  ok('utan stoppet (filtrerat bort) fortsätter banan förbi', q[q.length - 1].x > sista.x + 100, `x ${Math.round(q[q.length - 1].x)}`)
  const h = fri.bana(500, 300, 12, 0) // rakt mot den vanliga sensorn 'mal' vid x 900 → ska passera obehindrat
  ok('en vanlig sensor tas aldrig med (påverkar inte kulan)', h.length > 20 && h[h.length - 1].x > 600, `x ${Math.round(h[h.length - 1].x)}`)
  sv.destroy()
  fri.destroy()
  v.destroy()
}

// =============================================================================================
// Gravitation: skuggvärlden läser världens egen (samma tal) — och utan värld, previewGravity
// =============================================================================================
console.log('\n  gravitation')
{
  const v = new PhysicsWorld({ gravityY: 1.1, walls: [] })
  const b = v.circle(100, 100, 20, { restitution: 0.3, frictionAir: 0.006, label: 'kula' })
  const sv = new Skuggvarld({ varld: v, kula: b, hoppa: 1 })
  const pts = sv.bana(100, 100, 8, -10)
  Body.setPosition(b, { x: 100, y: 100 })
  Body.setVelocity(b, { x: 8, y: -10 })
  const real = []
  for (let i = 0; i < pts.length; i++) {
    v.update(DT)
    real.push({ x: b.position.x, y: b.position.y })
  }
  const e = avvik(pts, real)
  ok('läser världens gravityY (1,1) live: fritt kast stämmer < 0,5 px', e.max < 0.5, `${f1(e.max)} px över ${e.n} steg`)
  const lyg = predict(100, 100, 8, -10, 0.5, 0, {}, 1 - 0.006, 1) // den gamla 0,5-"lögnen"
  ok('kontroll: en gammal handtrimmad previewGravity 0,5 skulle ljuga mot gravityY 1,1', avvik(lyg, real).max > 20, `${f1(avvik(lyg, real).max)} px`)
  v.setGravity(0.3) // världens gravitation byts mitt i spelet
  const pts2 = sv.bana(100, 100, 8, -10)
  ok('en gravitation som byts i världen följer med utan ny konfiguration', pts2[20].y < pts[20].y - 5, `steg 20: y ${Math.round(pts[20].y)} → ${Math.round(pts2[20].y)}`)
  const frivarld = new Skuggvarld({ kroppar: () => [], kula: { r: 20, restitution: 0.3, frictionAir: 0.006 }, hoppa: 1 })
  const p3 = frivarld.bana(100, 100, 8, -10, { gy: 1.1 * 0.2778 })
  v.setGravity(1.1)
  ok('utan värld: previewGravity (px/steg²) ger samma flykt som motorns gravityY', avvik(p3, real).max < 0.8, `${f1(avvik(p3, real).max)} px`)
  sv.destroy()
  frivarld.destroy()
  v.destroy()
}

// =============================================================================================
// AimLauncher — integration (Pixi-noder utan renderare): opt-in, throttling, destroy
// =============================================================================================
console.log('\n  AimLauncher')
try {
  const { Container } = await import('pixi.js')
  const { AimLauncher } = await import('../src/lib/launcher.js')
  const mk = (extra) => {
    const root = new Container()
    const target = new Container()
    target.position.set(640, 600)
    root.addChild(target)
    const w = bowlingVarld({ rack: 'nyckel' })
    const l = new AimLauncher({ target, root, slingshot: true, maxPower: 30, minPower: 9, previewGravity: 0, previewDamp: 1 - BOWLING_FA, bounds: bowlingBounds(true), getOrigin: () => ({ x: 640, y: 600 }), ...(extra ? extra(w) : {}) })
    return { root, target, w, l }
  }
  const drag = (l, steps) => {
    l._pointerDown({ global: { x: 640, y: 600 }, pointerId: 1 })
    for (const [x, y] of steps) l._pointerMove({ global: { x, y }, pointerId: 1 })
  }
  // Utan nyckeln: ingen skuggvärld alls.
  const A = mk()
  ok('utan `skuggvarld` skapas ingen motor (dagens beteende)', A.l.skuggvarld === null)
  drag(A.l, [[700, 700]])
  const gammal = A.l._trail.visible
  ok('utan nyckeln ritas pricklinjen av predict()', gammal === true)
  A.l.destroy()
  A.w.v.destroy()
  // Med nyckeln.
  const B = mk((w) => ({ skuggvarld: { varld: w.v, kula: w.b } }))
  ok('med `skuggvarld` skapas en Skuggvarld', B.l.skuggvarld instanceof Skuggvarld)
  let anrop = 0
  const orig = B.l.skuggvarld.bana.bind(B.l.skuggvarld)
  B.l.skuggvarld.bana = (...a) => { anrop++; return orig(...a) }
  drag(B.l, [[700, 700], [701, 701], [702, 702], [703, 703], [704, 704]]) // fem rörelser på < 1 ms = EN bildruta
  ok('fem rörelser i samma bildruta räknar skuggbanan EN gång (högst en per bildruta)', anrop === 1, `${anrop} omräkning(ar)`)
  await new Promise((r) => setTimeout(r, 40))
  ok('...och den köade sista rörelsen ritas av nästa bildruta (inget fingerläge tappas)', anrop === 2, `${anrop} omräkningar efter 40 ms`)
  ok('pricklinjen syns', B.l._trail.visible === true)
  // Köad rörelse + släpp/destroy: inget får ritas på en död launcher.
  drag(B.l, [[720, 720], [721, 721]])
  const tid = B.l._skuggTimer
  ok('en köad omritning finns', tid != null)
  const sv = B.l.skuggvarld
  B.l.destroy()
  ok('destroy() river skuggvärlden (motorn tömd, ingen referens kvar)', B.l.skuggvarld === null && sv._alive === false && sv.engine.world.bodies.length === 0)
  ok('destroy() stoppar den köade omritningen', B.l._skuggTimer == null)
  const före = anrop
  await new Promise((r) => setTimeout(r, 40))
  ok('...så ingenting räknas efter destroy', anrop === före, `${anrop - före} anrop efter`)
  ok('bana() på en riven skuggvärld ger null i stället för att kasta', sv.bana(0, 0, 1, 1) === null)
  ok('spelets värld har kvar alla sina kroppar efter att skuggvärlden rivits', B.w.v.world.bodies.length >= 5, `${B.w.v.world.bodies.length} kroppar`)
  B.w.v.destroy()
} catch (e) {
  ok('AimLauncher-integrationen kunde köras i Node', false, e.message)
}

// =============================================================================================
// KOSTNAD per omritning (64 steg) i Node — budget ≤ 0,5 ms
// =============================================================================================
console.log('\n  KOSTNAD per omritning (64 motorsteg, Node, ms)')
function kostnad(namn, w, sv, skott, { vind = 0 } = {}) {
  for (let i = 0; i < 300; i++) skuggBana(sv, w, skott[i % skott.length].vx, skott[i % skott.length].vy, vind) // värm upp JIT
  const N = 3000
  const t = []
  for (let i = 0; i < N; i++) {
    const s = skott[i % skott.length]
    const t0 = performance.now()
    sv.bana(w.start.x, w.start.y, s.vx, s.vy, { gy: 0, wx: vind })
    t.push(performance.now() - t0)
  }
  t.sort((a, b) => a - b)
  const medel = t.reduce((a, b) => a + b, 0) / N
  const p95 = t[Math.floor(N * 0.95)]
  console.log(`    ${namn.padEnd(34)} medel ${medel.toFixed(3)} · median ${t[N >> 1].toFixed(3)} · p95 ${p95.toFixed(3)} · max ${t[N - 1].toFixed(3)}`)
  return { medel, p95 }
}
{
  // Launcherns riktiga läge: hoppa = 3 (22 prickar), inga extra krav.
  const w1 = bowlingVarld({ rack: 'nyckel' })
  const sv1 = new Skuggvarld({ varld: w1.v, kula: w1.b })
  const k1 = kostnad('bowling (4 statiska)', w1, sv1, SKOTT_B)
  const w2 = rullaVarld({ yta: 'gras', boll: 'normal' })
  const sv2 = new Skuggvarld({ varld: w2.v, kula: w2.b, filter: (b) => b.label === 'wall' })
  const k2 = kostnad('rulla-bollen-hem (4 väggar)', w2, sv2, SKOTT_R)
  const sv2v = new Skuggvarld({ varld: w2.v, kula: w2.b, filter: (b) => b.label === 'wall', vindMinFart: 4 })
  const k2v = kostnad('rulla-bollen-hem + vind', w2, sv2v, SKOTT_R, { vind: 0.057 })
  // Tyngre värld för referens: 24 statiska kroppar utspridda.
  const w3 = rullaVarld({ yta: 'gras', boll: 'normal' })
  for (let i = 0; i < 20; i++) w3.v.rectangle(300 + (i % 5) * 160, 200 + Math.floor(i / 5) * 110, 60, 20, { isStatic: true, label: 'plank' })
  const sv3 = new Skuggvarld({ varld: w3.v, kula: w3.b })
  const k3 = kostnad('referens: 24 statiska kroppar', w3, sv3, SKOTT_R)
  ok('kostnad per omritning ≤ 0,5 ms (bowling, medel)', k1.medel <= 0.5, `${k1.medel.toFixed(3)} ms · p95 ${k1.p95.toFixed(3)}`)
  ok('kostnad per omritning ≤ 0,5 ms (rulla-bollen-hem, medel)', k2.medel <= 0.5, `${k2.medel.toFixed(3)} ms · p95 ${k2.p95.toFixed(3)}`)
  ok('kostnad per omritning ≤ 0,5 ms (rulla + vind, medel)', k2v.medel <= 0.5, `${k2v.medel.toFixed(3)} ms`)
  console.log(`    (referens, ingen budget: 24 statiska ${k3.medel.toFixed(3)} ms)`)
  // HEAD:s kostnad för jämförelse.
  const t0 = performance.now()
  for (let i = 0; i < 20000; i++) headBana(w1, -22, -12, bowlingBounds(true), 0.988)
  console.log(`    HEAD predict() för jämförelse: ${((performance.now() - t0) / 20000).toFixed(4)} ms`)
  for (const s of [sv1, sv2, sv2v, sv3]) s.destroy()
  for (const w of [w1, w2, w3]) w.v.destroy()
}

// --- ÅTERANROP (orkestreraren D11) ----------------------------------------------------------
// Varje skott ovan fick en FÄRSK Skuggvarld — men i spelet räknas banan om vid varje fingerrörelse
// med SAMMA motor. Matter.Engine.clear tömde detektorns kroppslista, och den fylls bara igen när
// världen är ändrad: bara första banan kolliderade (i spelet 407 px fel, här osynligt). Kontroll:
// första anropet studsar mot räcket; mätning: anrop 2 och 3 (efter ett annat skott) ger samma bana.
{
  console.log('\n  Återanrop — samma skuggvärld, banan räknas om (som under ett drag):')
  const w = bowlingVarld({ rack: 'nyckel' })
  const sv = new Skuggvarld({ varld: w.v, kula: w.b })
  const a = sv.bana(640, 600, 11, -14, {})
  ok('kontroll: första anropet studsar mot räcket (x vänder)', a.some((p, i) => i > 0 && p.x < a[i - 1].x))
  sv.bana(640, 600, -3, -17, {})
  const b2 = sv.bana(640, 600, 11, -14, {})
  const c2 = sv.bana(640, 600, 11, -14, {})
  let max = 0
  for (const q of [b2, c2]) for (let i = 0; i < a.length; i++) max = Math.max(max, Math.hypot(a[i].x - q[i].x, a[i].y - q[i].y))
  ok('anrop 2 och 3 ger samma bana som det första (< 0,01 px)', max < 0.01, `största skillnad ${max.toFixed(2)} px`)
  sv.destroy()
  w.v.destroy()
}

console.log(`\n${fel === 0 ? '✓ alla mått gröna' : `✗ ${fel} mått röda`}\n`)
process.exit(fel === 0 ? 0 : 1)
