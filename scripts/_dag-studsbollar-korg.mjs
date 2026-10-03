// STUDSBOLLAR-KORG-SOND (F1, dag 2026-10-02 D16 B3) — gungar korgen på riktigt, och fångar den ändå?
//
//   node scripts/_dag-studsbollar-korg.mjs [antal=300] [--tal]        (ingen webbläsare)
//
// Bygger SAMMA värld som spelet (PhysicsWorld gravityY 1,25, väggar left/right, golvkroppen på FLOOR_Y,
// bollarna ur MATERIALS.bouncy/heavy med spelets radier) och SAMMA korg (`Gungkorg` ur
// src/games/studsbollar/korg.js — den modul spelet importerar).
//
// KONTROLLARMEN KÖRS FÖRST: HEAD:s tre statiska korgkroppar (`headKorg`). Den ska ge 0,00 px rörelse på
// ALLA mått — en mätning som inte rör sig mellan två kända lägen mäter ingenting.
//
// Mätarmen (NY) ska ge:
//   A  stöt → rörelse → vila: en knuff vaggar korgen (kanten rör sig > 3 px), ≥ 2 nolltagningar, period ≈ 0,95 s,
//      stilla (|vinkel| och |fart| < 1e-4) inom ~3,5 s, och kanten når aldrig mer än taket (~18 px)
//   B  en tung boll i full fart mot kanten, och bollen studsar vidare lika högt som mot HEAD:s kant (±)
//   C  resonansförsöket: knuff vid varje fartmaximum 24 gånger — korgen når aldrig över hårda taket
//   D  300 sikta-och-skjut-skott (båda bolltyperna, två skalor): andelen som gör mål ≈ HEAD:s (±6 procentenheter),
//      aldrig en boll utanför bild, korgens största utslag, och att varje mål är ETT mål (ingen dubbelräkning)
//   E  gångjärnsglapp ≤ 0,5 px över hela körningen och ingen NaN
import { PhysicsWorld, MATERIALS, Body, Matter } from '../src/lib/physics.js'
import { Gungkorg, KORG } from '../src/games/studsbollar/korg.js'

const FRAME = 1000 / 60
const FLOOR_Y = 648
const LAUNCH = { x: 205, y: 512 }
const N = Number(process.argv.find((a) => /^\d+$/.test(a)) || 300)
const TAL = process.argv.includes('--tal')
for (const k of Object.keys(KORG)) if (process.env['K_' + k]) KORG[k] = Number(process.env['K_' + k]) // trimning från skalet

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const f = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : String(v))

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())

// KONTROLLARMEN: HEAD:s korg ordagrant ur HEAD:src/games/studsbollar/index.js (_setBasket) — tre STATISKA kroppar.
// restitution 0,55 på en statisk kropp nollas av setStatic, precis som i spelet.
function headKorg(phys, x, oppningY, s) {
  const delar = [
    phys.rectangle(x, oppningY + 38 * s, 110 * s, 44 * s, { isStatic: true, isSensor: true, label: 'basket' }),
    phys.circle(x - 70 * s, oppningY, 12 * s, { isStatic: true, restitution: 0.55, label: 'rim' }),
    phys.circle(x + 70 * s, oppningY, 12 * s, { isStatic: true, restitution: 0.55, label: 'rim' }),
  ]
  return { body: null, vinkel: 0, fart: 0, knuff() {}, kantAvvikelse: () => 0, destroy() { for (const d of delar) phys.removeBody(d) } }
}

// ---- Världen (spelets) -------------------------------------------------------------------------
function varld(arm, { x = 950, scale = 1 } = {}) {
  const phys = new PhysicsWorld({ gravityY: 1.25, walls: ['left', 'right'] })
  phys.rectangle(640, FLOOR_Y + 60, 1760, 120, { isStatic: true, restitution: 0.45, friction: 0.6, label: 'floor' })
  const oppningY = FLOOR_Y - 150 * scale
  const korg = arm === 'head' ? headKorg(phys, x, oppningY, scale) : new Gungkorg(phys, { x, golvY: FLOOR_Y, oppningY, scale })
  const W = { phys, korg, arm, x, scale, oppningY, steg: 0, mal: [], rymt: 0, maxVinkel: 0, maxKant: 0, maxGlapp: 0, nan: 0, bollar: new Set() }
  phys.onCollision((e) => {
    for (const p of e.pairs) {
      const a = p.bodyA, b = p.bodyB
      const sens = a.label === 'basket' ? a : b.label === 'basket' ? b : null
      if (!sens) continue
      const boll = sens === a ? b : a
      if (boll.label !== 'ball' || boll._scored) continue
      boll._scored = true
      W.mal.push({ steg: W.steg, vx: boll.velocity.x, fart: Math.hypot(boll.velocity.x, boll.velocity.y), id: boll._id })
      phys.removeBody(boll)
      W.bollar.delete(boll)
      // SPELETS reaktion: korgen vaggar åt bollens håll, hårdare ju snabbare den kom.
      korg.knuff(Math.sign(boll.velocity.x || 1), Math.min(1, Math.hypot(boll.velocity.x, boll.velocity.y) / 20))
    }
  })
  return W
}

function steg(W, n = 1) {
  for (let i = 0; i < n; i++) {
    W.phys.update(FRAME)
    W.steg++
    const k = W.korg
    if (k.body) {
      const a = k.vinkel
      if (!Number.isFinite(a) || !Number.isFinite(k.body.position.x)) W.nan++
      W.maxVinkel = Math.max(W.maxVinkel, Math.abs(a))
      W.maxKant = Math.max(W.maxKant, k.kantAvvikelse())
      // gångjärnsglapp: var ligger gångjärnspunkten på kroppen jämfört med världspunkten?
      const c = k.led.constraint
      const da = k.body.angle - (c.angleB || 0)
      const cs = Math.cos(da), sn = Math.sin(da)
      const px = k.body.position.x + c.pointB.x * cs - c.pointB.y * sn
      const py = k.body.position.y + c.pointB.x * sn + c.pointB.y * cs
      W.maxGlapp = Math.max(W.maxGlapp, Math.hypot(px - c.pointA.x, py - c.pointA.y))
    }
    for (const b of W.bollar) {
      if (b.position.x < -60 || b.position.x > 1340 || b.position.y < -400 || !Number.isFinite(b.position.x)) {
        if (!b._rymt) { b._rymt = true; W.rymt++ }
      }
    }
  }
}

const BOLL = {
  bouncy: { r: 28, mat: MATERIALS.bouncy },
  heavy: { r: 34, mat: MATERIALS.heavy },
}
let nid = 1
function skjut(W, typ, x, y, vx, vy) {
  const t = BOLL[typ]
  const b = W.phys.circle(x, y, t.r, { ...t.mat, label: 'ball' })
  b._id = nid++
  Body.setVelocity(b, { x: vx, y: vy })
  W.bollar.add(b)
  return b
}

// Banan matter ger en fritt flygande boll (px/steg): luftmotstånd, sedan tyngd 0,2778·gravityY.
const GSTEG = 0.2778 * 1.25
function vinkelMot(mal, fart, fa) {
  let bast = null
  for (let g = 8; g <= 86; g += 0.5) {
    const a = (-g * Math.PI) / 180
    let x = LAUNCH.x, y = LAUNCH.y, vx = Math.cos(a) * fart, vy = Math.sin(a) * fart, nere = false
    let d = Infinity
    for (let i = 0; i < 400; i++) {
      vx *= 1 - fa; vy = vy * (1 - fa) + GSTEG
      x += vx; y += vy
      if (vy > 0 && y >= mal.y) { d = Math.abs(x - mal.x); break }
      if (y > 900 || x > 1300) break
    }
    if (d < (bast ? bast.d : Infinity)) bast = { a, d }
  }
  return bast
}

console.log(`STUDSBOLLAR-KORG · ${N} skott per arm`)

// =============================== A · stöt → rörelse → vila ======================================
function provA(arm) {
  const W = varld(arm)
  if (arm === 'head') {
    // HEAD har inget knuff()/led: kantens rörelse är exakt det statiska läget, hela tiden.
    steg(W, 300)
    return { arm, kant: 0, noll: 0, period: NaN, vilaS: 0, vinkel: 0 }
  }
  steg(W, 30)
  W.korg.knuff(1, 1)
  let maxKant = 0, noll = 0, forra = 0, tidNoll = [], vilaS = null
  for (let i = 0; i < 60 * 8; i++) {
    steg(W)
    const a = W.korg.vinkel
    maxKant = Math.max(maxKant, W.korg.kantAvvikelse())
    if (Math.abs(a) > 2e-3) {
      if (forra !== 0 && Math.sign(a) !== Math.sign(forra)) { noll++; tidNoll.push(i) }
      forra = a
    }
    if (vilaS == null && Math.abs(a) < 1e-4 && Math.abs(W.korg.fart) < 1e-4 && i > 20) vilaS = i / 60
  }
  const halvper = tidNoll.length > 1 ? (tidNoll[tidNoll.length - 1] - tidNoll[0]) / (tidNoll.length - 1) / 60 : NaN
  return { arm, kant: maxKant, noll, period: halvper * 2, vilaS, vinkel: W.korg.vinkel, fart: W.korg.fart }
}
console.log('\nA · stöt → rörelse → vila (knuff +1 mot en stilla korg, 8 s)')
const aHead = provA('head')
ok('KONTROLL (HEAD) · statisk korg: kantens rörelse', aHead.kant === 0, `${f(aHead.kant, 2)} px, ${aHead.noll} nolltagningar`)
const aNy = provA('ny')
ok('NY · kanten rör sig av knuffen', aNy.kant > 3, `${f(aNy.kant)} px (mjuka gränsen ${f(150 * Math.sin(KORG.maxVinkel))} px)`)
ok('NY · vaggar åt båda hållen (≥ 2 nolltagningar)', aNy.noll >= 2, `${aNy.noll} st`)
ok('NY · perioden ≈ 0,9 s', Math.abs(aNy.period - KORG.period) < 0.3, `${f(aNy.period, 2)} s (mål ${KORG.period})`)
ok('NY · stilla (vinkel 0, fart 0 exakt) inom 3,5 s', aNy.vilaS != null && aNy.vilaS < 3.5, `vila efter ${aNy.vilaS == null ? 'aldrig' : f(aNy.vilaS, 2) + ' s'}`)
ok('NY · slutläget upprätt (|vinkel| < 1e-4 rad, |fart| < 1e-4)', Math.abs(aNy.vinkel) < 1e-4 && Math.abs(aNy.fart) < 1e-4, `${aNy.vinkel}, ${aNy.fart}`)
ok('NY · kanten stannar under taket', aNy.kant <= 18, `${f(aNy.kant)} px`)

// =============================== B · tung boll i full fart mot kanten ===========================
function provB(arm, typ) {
  const W = varld(arm)
  const L = W.x - 70 // vänster kant
  // rakt mot vänsterkantens mitt, fart 25 (AimLauncherns tak), litet uppåt
  const b = skjut(W, typ, L - 220, W.oppningY - 20, 24.5, 0)
  let maxVx = -99, utY = 0
  for (let i = 0; i < 120; i++) {
    steg(W)
    if (!W.bollar.has(b)) break
    maxVx = Math.max(maxVx, b.velocity.x)
    if (b.position.x < L - 40 && i > 5) utY = Math.max(utY, Math.abs(b.velocity.x))
  }
  const slut = b.position ? { x: b.position.x, v: b.velocity.x } : null
  return { W, b, slut, utX: utY }
}
console.log('\nB · en boll i full fart (24,5 px/steg) rakt mot vänsterkanten')
for (const typ of ['bouncy', 'heavy']) {
  const h = provB('head', typ)
  const n = provB('ny', typ)
  const rik = (r) => (r.W.mal.length ? 'mål' : 'stod kvar på sidan')
  console.log(`   ${typ}: HEAD → ${rik(h)}, studsfart tillbaka ${f(h.utX)} · NY → ${rik(n)}, studsfart ${f(n.utX)}, korgens utslag ${f(n.W.maxKant)} px`)
  ok(`${typ} · kontroll: HEAD-kanten rör sig inte`, h.W.maxKant === 0)
  ok(`${typ} · NY: kanten ger efter men aldrig över taket`, n.W.maxKant > 0.5 && n.W.maxKant <= 18, `${f(n.W.maxKant)} px`)
  ok(`${typ} · NY: bollen studsar fortfarande tillbaka (≥ 50 % av HEAD)`, n.utX >= h.utX * 0.5 - 0.5, `${f(n.utX)} mot ${f(h.utX)}`)
  ok(`${typ} · ingen boll utanför bild`, n.W.rymt === 0)
}

// =============================== C · resonansförsöket ===========================================
console.log('\nC · knuff vid varje fartmaximum, 24 gånger (resonans)')
{
  const W = varld('ny')
  steg(W, 20)
  W.korg.knuff(1, 1)
  let senast = 0
  for (let i = 0; i < 60 * 30; i++) {
    steg(W)
    const w = W.korg.fart
    // knuffa åt farten, men högst en gång per halv period (när farten passerar sitt maximum)
    if (i - senast > 25 && Math.abs(w) > 0.004) { W.korg.knuff(Math.sign(w), 1); senast = i }
  }
  ok('NY · hårda taket håller vid resonans', W.maxKant <= 18, `största vinkel ${f(W.maxVinkel, 3)} rad = ${f(W.maxKant)} px (hård gräns ${KORG.hardVinkel})`)
  ok('NY · gångjärnet släpper inte (≤ 0,5 px)', W.maxGlapp <= 0.5, `${f(W.maxGlapp, 3)} px`)
  steg(W, 60 * 8)
  ok('NY · stilla igen 8 s efter resonansen', Math.abs(W.korg.vinkel) < 1e-4 && Math.abs(W.korg.fart) < 1e-4, `vinkel ${W.korg.vinkel}`)
}

// =============================== D · sikta-och-skjut mot HEAD ===================================
function provD(arm, frö) {
  const r = mulberry(frö)
  const resultat = []
  const tot = { skott: 0, mal: 0, dubbel: 0, rymt: 0, maxKant: 0, maxGlapp: 0, nan: 0 }
  for (let i = 0; i < N; i++) {
    const typ = r() < 0.5 ? 'bouncy' : 'heavy'
    const scale = r() < 0.5 ? 1 : 0.66
    const x = scale === 1 ? 850 + r() * 200 : 950 + r() * 160
    const W = varld(arm, { x, scale })
    const fart = [13, 16, 20, 24][Math.floor(r() * 4)]
    const m = BOLL[typ].mat
    // siktfel som ett barn: ±45 px sidled runt öppningen
    const mal = { x: x + gauss(r) * 45, y: W.oppningY }
    const v = vinkelMot(mal, fart, m.frictionAir)
    const b = skjut(W, typ, LAUNCH.x, LAUNCH.y, Math.cos(v.a) * fart, Math.sin(v.a) * fart)
    // 1–3 mål-bollar i fältet som i spelet (vilande, 520/650/780) — påverkar kanten på samma sätt i båda armar
    for (const sx of [520, 650, 780]) {
      if (r() < 0.5) continue
      const sb = W.phys.circle(sx, FLOOR_Y - 30, 28, { ...MATERIALS.bouncy, label: 'ball' })
      sb._id = nid++
      W.bollar.add(sb)
    }
    for (let s = 0; s < 60 * 7; s++) {
      steg(W)
      if (b.position.y > 880) break
    }
    const mal1 = W.mal.filter((q) => q.id === b._id).length
    tot.skott++
    if (mal1 >= 1) tot.mal++
    const ids = W.mal.map((q) => q.id)
    tot.dubbel += ids.length - new Set(ids).size
    tot.rymt += W.rymt
    tot.maxKant = Math.max(tot.maxKant, W.maxKant)
    tot.maxGlapp = Math.max(tot.maxGlapp, W.maxGlapp)
    tot.nan += W.nan
    resultat.push(mal1 >= 1)
    W.phys.destroy()
  }
  return { ...tot, resultat }
}
console.log(`\nD · ${N} siktade skott, båda bolltyper, skala 1 och 0,66, ±45 px siktfel (samma frön i båda armar)`)
const dH = provD('head', 11)
const dN = provD('ny', 11)
const pH = (100 * dH.mal) / dH.skott, pN = (100 * dN.mal) / dN.skott
let olika = 0
for (let i = 0; i < dH.resultat.length; i++) if (dH.resultat[i] !== dN.resultat[i]) olika++
console.log(`   HEAD: ${dH.mal}/${dH.skott} mål (${f(pH)} %) · NY: ${dN.mal}/${dN.skott} mål (${f(pN)} %) · skott med olika utfall: ${olika}`)
ok('KONTROLL (HEAD) · statisk korg: 0 px utslag', dH.maxKant === 0, `${f(dH.maxKant, 2)} px`)
ok('NY · träffandelen ≈ HEAD (±6 pe)', Math.abs(pN - pH) <= 6, `${f(pN)} % mot ${f(pH)} %`)
ok('NY · korgen rör sig i spel men håller taket', dN.maxKant > 1 && dN.maxKant <= 18, `största utslag ${f(dN.maxKant)} px`)
ok('NY · ingen boll utanför bild', dN.rymt === 0 && dH.rymt === 0, `NY ${dN.rymt}, HEAD ${dH.rymt}`)
ok('NY · aldrig ett dubbelmål', dN.dubbel === 0)
ok('E · gångjärnsglapp ≤ 0,5 px, ingen NaN', dN.maxGlapp <= 0.5 && dN.nan === 0, `${f(dN.maxGlapp, 3)} px, NaN ${dN.nan}`)

console.log(`\n${fel === 0 ? 'ALLT GRÖNT' : fel + ' MÅTT RÖDA'}`)
if (TAL) console.log(JSON.stringify({ aNy, dH: { ...dH, resultat: undefined }, dN: { ...dN, resultat: undefined } }))
process.exit(fel ? 1 : 0)
