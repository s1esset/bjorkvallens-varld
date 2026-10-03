// RULLA-BOLLEN-HEM · GRINDEN (F1, dag 2026-10-02 D16 B3) — svänger den, knuffar den mjukt, och stänger den aldrig vägen?
//
//   node scripts/_dag-rulla-grind.mjs [antal=200] [--tal]            (Node, ingen webbläsare)
//
// SAMMA värld som spelet (gravityY 0, fyra statiska väggar vid planens kanter, bollen r 56 · täthet 0,0012 · frictionAir 0,028 ·
// restitution 0,55 · tröghet ∞, hemma-sensorn) och SAMMA grind (`Grind` + `grindForLevel` ur src/games/rulla-bollen-hem/grind.js).
// Banans layout (hem, start, hinder) kopieras ordagrant ur src/games/rulla-bollen-hem/index.js (`_layoutFor`/`_obstaclesForLevel`)
// och zonerna kommer ur `zonerForLevel` (zoner.js).
//
// KONTROLLARMAR (en mätning som inte rör sig mellan två kända lägen mäter ingenting):
//   HEAD  = ingen grind alls (dagens spel): ska ge 0 grindrörelse och är träffandelens baslinje
//   DÖD   = grinden med motorn bortkopplad: ska FÖRLORA luckan (väntetiden blir oändlig) — visar att luckmåttet är levande
// Mätarmen (NY):
//   A  PLACERING   per bana 0–15 × N layouter: hur ofta får banan en grind, aldrig över hinder/zoner/mål/start, aldrig en trång bana
//   B  SVÄNGNING   φ når 0…1,15 rad, period ≈ 3,4 s, öppen ≈ 40 %, längsta väntan till en lucka ≤ 2 s — med och utan vind
//   C  MJUK        en stilla boll i svepytan: bollens topfart efter grinden ≤ 11 px/steg, den hamnar utanför grinden inom 6 s och lämnar aldrig planen
//   D  HÅRT SKOTT  fart 26 mot grinden från 24 håll: vinkeln håller hårda gränserna, ingen boll över planen, bollen får aldrig MER fart än den kom med
//   E  KÖRFIL      grinden hållen STÄNGD (φ = 0): en boll i full fart genom körfilen kommer förbi — grinden kan inte täppa till planen
//   F  TAJMING     N skott mot målet: träffandel med grind mot HEAD utan (en grind kostar skott men får aldrig göra banan olösbar)
//   G  LED         gångjärnsglapp ≤ 0,5 px och ingen NaN genom hela körningen
import { PhysicsWorld, Body } from '../src/lib/physics.js'
import { Grind, GRIND, grindForLevel, phiAt, punktPaGrind } from '../src/games/rulla-bollen-hem/grind.js'
import { zonerForLevel } from '../src/games/rulla-bollen-hem/zoner.js'

const FRAME = 1000 / 60
const N = Number(process.argv.find((a) => /^\d+$/.test(a)) || 200)
const TAL = process.argv.includes('--tal')
const WALL = { l: 60, r: 1220, t: 120, b: 680 }
const BALL_R = 56
const BALL_START = { x: 200, y: 400 }
const STEP2 = (1000 / 60) ** 2
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

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

// ---- Banans layout (ordagrant ur index.js, med en egen slump) ------------------------------------------
function layoutFor(level, r) {
  const start = { ...BALL_START }
  let home
  if (level <= 1) home = { x: 1060, y: 400, r: 110 }
  else if (level <= 3) home = { x: 1090, y: level % 2 ? 260 : 540, r: 100 }
  else if (level <= 5) home = { x: 1130, y: level % 2 ? 232 : 568, r: 95 }
  else {
    const yBase = level % 2 ? 232 : 560
    const jitter = r() * 70 - 35
    home = { x: clamp(1080 + (level - 6) * 8, 1000, 1150), y: clamp(yBase + jitter, 210, 590), r: 88 }
    start.y = clamp(400 + (r() * 120 - 60), 280, 520)
  }
  return { home, start }
}
function obstaclesFor(level, home, start, r) {
  const out = []
  if (level >= 2 && level <= 3) out.push({ type: 'bumper', x: 660, y: level % 2 ? 300 : 500, r: 56 })
  else if (level >= 4 && level <= 5) {
    out.push({ type: 'block', x: 600, y: level % 2 ? 330 : 400, w: 64, h: 220 })
    out.push({ type: 'bumper', x: 830, y: level % 2 ? 520 : 280, r: 50 })
  } else if (level >= 6) {
    const n = Math.min(4, 2 + Math.floor((level - 6) / 2))
    const step = 300 / Math.max(1, n)
    for (let i = 0; i < n; i++) {
      const x = 470 + i * step + (r() * 50 - 25)
      const y = clamp(210 + r() * 360, 200, 600)
      if (r() < 0.5) out.push({ type: 'block', x, y, w: 56, h: 150 + r() * 90 })
      else out.push({ type: 'bumper', x, y, r: 46 })
    }
  }
  return out.filter((o) => {
    const half = o.type === 'block' ? Math.max(o.w, o.h) / 2 : o.r
    return Math.hypot(o.x - home.x, o.y - home.y) > home.r + half + 70 && Math.hypot(o.x - start.x, o.y - start.y) > 150 + half && o.x < home.x - 70
  })
}

// ---- Världen (spelets) ---------------------------------------------------------------------------------
function varld({ spec = null, dod = false, vind = 0, hem = null, boll = true, fas = 0 } = {}) {
  const phys = new PhysicsWorld({ gravityY: 0, walls: [] })
  const T = 220, W = 1280, H = 720
  const opt = { isStatic: true, restitution: 0.55, friction: 0.04, label: 'wall' }
  phys.rectangle(WALL.l - T / 2, H / 2, T, H + 600, opt)
  phys.rectangle(WALL.r + T / 2, H / 2, T, H + 600, opt)
  phys.rectangle(W / 2, WALL.t - T / 2, W + 600, T, opt)
  phys.rectangle(W / 2, WALL.b + T / 2, W + 600, T, opt)
  const Wd = { phys, grind: null, ball: null, steg: 0, maxGlapp: 0, nan: 0, maxPhi: -9, minPhi: 9, utanfor: 0, home: false, hemSteg: -1 }
  if (hem) {
    phys.circle(hem.x, hem.y, Math.max(24, hem.r * 0.5), { isStatic: true, isSensor: true, label: 'home' })
    phys.onCollision((e) => {
      for (const p of e.pairs) {
        if ((p.bodyA.label === 'home' && p.bodyB === Wd.ball) || (p.bodyB.label === 'home' && p.bodyA === Wd.ball)) {
          if (!Wd.home) { Wd.home = true; Wd.hemSteg = Wd.steg }
        }
      }
    })
  }
  if (boll) {
    Wd.ball = phys.circle(BALL_START.x, BALL_START.y, BALL_R, { restitution: 0.55, friction: 0.04, frictionAir: 0.028, density: 0.0012, label: 'ball' })
    Body.setInertia(Wd.ball, Infinity)
  }
  if (spec) {
    Wd.grind = new Grind(phys, spec, { fas })
    if (dod) Wd.grind.led.motor(null) // KONTROLL: motorn bortkopplad
  }
  if (vind) phys.setWind(vind / STEP2, 0)
  return Wd
}
function steg(Wd, n = 1) {
  for (let i = 0; i < n; i++) {
    Wd.phys.update(FRAME)
    Wd.steg++
    const g = Wd.grind
    if (g && g.body) {
      const phi = g.phi
      if (!Number.isFinite(phi) || !Number.isFinite(g.body.position.x)) Wd.nan++
      Wd.maxPhi = Math.max(Wd.maxPhi, phi)
      Wd.minPhi = Math.min(Wd.minPhi, phi)
      const c = g.led.constraint
      const da = g.body.angle - (c.angleB || 0)
      const cs = Math.cos(da), sn = Math.sin(da)
      const px = g.body.position.x + c.pointB.x * cs - c.pointB.y * sn
      const py = g.body.position.y + c.pointB.x * sn + c.pointB.y * cs
      Wd.maxGlapp = Math.max(Wd.maxGlapp, Math.hypot(px - c.pointA.x, py - c.pointA.y))
    }
    const b = Wd.ball
    if (b && (b.position.x < WALL.l - 10 || b.position.x > WALL.r + 10 || b.position.y < WALL.t - 10 || b.position.y > WALL.b + 10 || !Number.isFinite(b.position.x))) Wd.utanfor++
  }
}
const SPEC_TOP = { vagg: 'top', x: 960, y: WALL.t, langd: GRIND.langd }
const SPEC_BOT = { vagg: 'bottom', x: 960, y: WALL.b, langd: GRIND.langd }

console.log(`RULLA-BOLLEN-HEM · GRINDEN · N=${N}`)

// ============================== A · placering ======================================================================
console.log('\nA · placering per bana (layouter ur spelets egna funktioner)')
let rader = []
let trangt = 0
const perBana = []
for (let level = 0; level <= 15; level++) {
  const r = mulberry(1000 + level)
  let med = 0, topp = 0, plan = 0
  for (let i = 0; i < N; i++) {
    const lay = layoutFor(level, r)
    const hinder = obstaclesFor(level, lay.home, lay.start, r)
    const zoner = zonerForLevel(level, { home: lay.home, start: lay.start, hinder, plan: WALL }, r)
    const spec = grindForLevel(level, { home: lay.home, start: lay.start, hinder, zoner, plan: WALL }, r)
    if (!spec) continue
    med++
    if (spec.vagg === 'top') topp++
    // Körfilen: fritt djup även helt stängd?
    const fri = spec.vagg === 'top' ? WALL.b - (spec.y + spec.langd) : spec.y - spec.langd - WALL.t
    if (fri < BALL_R * 2 + 120) trangt++
    plan++
  }
  perBana.push({ level, andel: med / N })
  rader.push(`bana ${level + 1}: ${f((100 * med) / N, 0)} % (${topp} uppe / ${med - topp} nere)`)
}
console.log('   ' + rader.join('\n   '))
const medGrind = perBana.filter((p) => p.andel > 0)
ok('grinden finns på några banor men inte alla', medGrind.length >= 5 && medGrind.length < 16, `${medGrind.length} av 16 banor kan ha en`)
ok('ingen bana 1–3 har en grind (där lär man sig sikta + kraft)', perBana.slice(0, 3).every((p) => p.andel === 0), perBana.slice(0, 3).map((p) => f(p.andel * 100, 0) + ' %').join(' · '))
ok('banorna 4, 8, 9, 11, 12, 14 … får en grind i ≥ 95 % av layouterna där den fått plats; var tredje bana från bana 7 är utan', perBana.filter((p) => p.level >= 6 && p.level % 3 === 0).every((p) => p.andel === 0) && perBana[3].andel >= 0.95 && perBana.filter((p) => p.level >= 6 && p.level % 3 !== 0).every((p) => p.andel >= 0.9), perBana.map((p) => f(p.andel * 100, 0)).join(' '))
ok('aldrig en trång bana (fritt ≥ 2 bollar + 120 px stängd)', trangt === 0, `${trangt} trånga`)
ok('längd mot planens höjd: körfilen ≥ 340 px', WALL.b - WALL.t - GRIND.langd >= 340, `${WALL.b - WALL.t - GRIND.langd} px`)

// ============================== B · svängning ======================================================================
function klocka(vind, dod) {
  const Wd = varld({ spec: SPEC_TOP, dod, vind, boll: false })
  const phi = []
  steg(Wd, 30)
  for (let i = 0; i < 60 * 24; i++) {
    steg(Wd)
    phi.push(Wd.grind.phi)
  }
  return { Wd, phi }
}
function lucka(phi) {
  // längsta sammanhängande tid (s) utan öppet läge, och öppen andel
  const oppen = (p) => Math.cos(p) <= GRIND.oppenAndel
  let langsta = 0, nu = 0, antalOppen = 0
  for (const p of phi) {
    if (oppen(p)) { antalOppen++; nu = 0 } else { nu++; langsta = Math.max(langsta, nu) }
  }
  return { langsta: langsta / 60, andel: antalOppen / phi.length }
}
function period(phi) {
  const t = []
  for (let i = 1; i < phi.length; i++) if (phi[i - 1] < GRIND.phiMax / 2 && phi[i] >= GRIND.phiMax / 2) t.push(i)
  return t.length > 1 ? ((t[t.length - 1] - t[0]) / (t.length - 1)) / 60 : NaN
}
console.log('\nB · svängning (24 s i en tom värld)')
{
  const dod = klocka(0, true)
  const dL = lucka(dod.phi)
  ok('KONTROLL (död motor) · grinden rör sig inte', Math.max(...dod.phi) - Math.min(...dod.phi) < 0.05, `φ-spann ${f(Math.max(...dod.phi) - Math.min(...dod.phi), 3)} rad`)
  ok('KONTROLL (död motor) · luckan FÖRSVINNER (väntan > 2 s)', dL.langsta > 2 || dL.andel === 0 || dL.andel === 1, `längsta väntan ${f(dL.langsta, 1)} s, öppen ${f(100 * dL.andel, 0)} %`)
  for (const [namn, vind] of [['utan vind', 0], ['med vind 0,11', 0.11]]) {
    const { Wd, phi } = klocka(vind, false)
    const L = lucka(phi)
    const per = period(phi)
    ok(`${namn} · φ når hela spannet`, Math.min(...phi) < 0.08 && Math.max(...phi) > GRIND.phiMax - 0.05, `${f(Math.min(...phi), 2)}…${f(Math.max(...phi), 2)} rad`)
    ok(`${namn} · perioden ≈ ${GRIND.period} s`, Math.abs(per - GRIND.period) < 0.15, `${f(per, 2)} s`)
    ok(`${namn} · öppen (spetsen ≤ 70 % ut) 50–70 % av tiden`, L.andel > 0.5 && L.andel < 0.7, `${f(100 * L.andel, 0)} %`)
    ok(`${namn} · längsta väntan till en lucka ≤ 2 s`, L.langsta <= 2.0, `${f(L.langsta, 2)} s`)
    ok(`${namn} · gångjärnsglapp ≤ 0,5 px, ingen NaN`, Wd.maxGlapp <= 0.5 && Wd.nan === 0, `${f(Wd.maxGlapp, 3)} px, NaN ${Wd.nan}`)
    // tyngdpunkten står kvar i gångjärnet
    ok(`${namn} · kroppen driftar inte (≤ 1 px från gångjärnet)`, Math.hypot(Wd.grind.body.position.x - SPEC_TOP.x, Wd.grind.body.position.y - SPEC_TOP.y) <= 1, `${f(Math.hypot(Wd.grind.body.position.x - SPEC_TOP.x, Wd.grind.body.position.y - SPEC_TOP.y), 3)} px`)
  }
}

// ============================== C · mjuk: en stilla boll i svepytan ================================================
console.log('\nC · en stilla boll i svepytan — knuffas den mjukt?')
function provC(spec, bx, by) {
  const Wd = varld({ spec })
  Body.setPosition(Wd.ball, { x: bx, y: by })
  Body.setVelocity(Wd.ball, { x: 0, y: 0 })
  let topfart = 0, utanforSteg = -1
  for (let i = 0; i < 60 * 10; i++) {
    steg(Wd)
    const v = Math.hypot(Wd.ball.velocity.x, Wd.ball.velocity.y)
    topfart = Math.max(topfart, v)
    if (utanforSteg < 0 && i > 30) {
      // utanför grindens svepyta = avståndet till gångjärnet > längden + bollens radie + marginal, eller bortom nollstället
      const p = Wd.grind.spets()
      let nar = 1e9
      for (let s = 0; s <= GRIND.langd; s += 10) {
        const q = punktPaGrind(spec, Wd.grind.phi, s)
        nar = Math.min(nar, Math.hypot(q.x - Wd.ball.position.x, q.y - Wd.ball.position.y))
      }
      if (nar > BALL_R + GRIND.tjocklek / 2 + 8 && Math.hypot(Wd.ball.position.x - spec.x, Wd.ball.position.y - spec.y) > 40) utanforSteg = i
      void p
    }
  }
  return { topfart, Wd, fri: utanforSteg >= 0 }
}
{
  let maxFart = 0, allaFria = true, utanfor = 0, glapp = 0
  const platser = []
  for (const spec of [SPEC_TOP, SPEC_BOT]) {
    const sy = spec.vagg === 'top' ? 1 : -1
    for (const [dx, dd] of [[-40, 90], [-110, 120], [-170, 160], [-60, 150], [-140, 70]]) {
      platser.push([spec, spec.x + dx, spec.y + sy * dd])
    }
  }
  for (const [spec, x, y] of platser) {
    for (const fas of [0, 1.5, 3, 4.5]) {
      const Wd = varld({ spec: { ...spec }, fas })
      // en boll som LÄGGS inuti grinden är ett testfel, inte ett spelfall (grinden SVEPER in, den teleporterar inte): hoppa över
      const phi0 = Wd.grind.phi
      let narStart = 1e9
      for (let s0 = 0; s0 <= GRIND.langd; s0 += 5) {
        const q0 = punktPaGrind(spec, phi0, s0)
        narStart = Math.min(narStart, Math.hypot(q0.x - x, q0.y - y))
      }
      if (narStart < BALL_R + GRIND.tjocklek / 2 + 4) continue
      Body.setPosition(Wd.ball, { x, y })
      let top = 0, fri = false
      for (let i = 0; i < 60 * 10; i++) {
        steg(Wd)
        top = Math.max(top, Math.hypot(Wd.ball.velocity.x, Wd.ball.velocity.y))
        if (i > 60) {
          let nar = 1e9
          for (let s = 0; s <= GRIND.langd; s += 10) {
            const q = punktPaGrind(spec, Wd.grind.phi, s)
            nar = Math.min(nar, Math.hypot(q.x - Wd.ball.position.x, q.y - Wd.ball.position.y))
          }
          if (nar > BALL_R + GRIND.tjocklek / 2 + 4) fri = true
        }
      }
      maxFart = Math.max(maxFart, top)
      if (!fri) allaFria = false
      utanfor += Wd.utanfor
      glapp = Math.max(glapp, Wd.maxGlapp)
    }
  }
  ok('bollens topfart efter grindens knuff ≤ 11 px/steg (studsdynan ger 26)', maxFart <= 11, `${f(maxFart)} px/steg över ${platser.length * 4} lägen`)
  ok('bollen ligger fri från grinden efter 10 s i varje läge', allaFria)
  ok('bollen lämnar aldrig planen', utanfor === 0, `${utanfor} steg utanför`)
}

// ============================== D · hårda skott mot grinden ========================================================
console.log('\nD · hårda skott (fart 26) mot grinden från 24 håll, 4 faser')
{
  let maxExtra = 0, maxPhi = -9, minPhi = 9, utanfor = 0, glapp = 0, nan = 0, n = 0, aterstall = 0, aterN = 0
  for (const spec of [SPEC_TOP, SPEC_BOT]) {
    const sy = spec.vagg === 'top' ? 1 : -1
    for (let h = 0; h < 12; h++) {
      for (const fas of [0, 1.6, 3.2, 4.8]) {
        const Wd = varld({ spec: { ...spec }, fas })
        const ax = spec.x - 330 + (h - 6) * 40
        const ay = spec.y + sy * (60 + (h % 6) * 40)
        // mot en punkt mitt på grinden
        const m = punktPaGrind(spec, GRIND.phiMax / 2, GRIND.langd * (0.35 + (h % 4) * 0.2))
        const dx = m.x - ax, dy = m.y - ay, d = Math.hypot(dx, dy)
        Body.setPosition(Wd.ball, { x: ax, y: ay })
        Body.setVelocity(Wd.ball, { x: (dx / d) * 26, y: (dy / d) * 26 })
        let top = 0
        for (let i = 0; i < 60 * 3; i++) {
          steg(Wd)
          top = Math.max(top, Math.hypot(Wd.ball.velocity.x, Wd.ball.velocity.y))
        }
        maxExtra = Math.max(maxExtra, top - 26)
        maxPhi = Math.max(maxPhi, Wd.maxPhi)
        minPhi = Math.min(minPhi, Wd.minPhi)
        utanfor += Wd.utanfor
        glapp = Math.max(glapp, Wd.maxGlapp)
        nan += Wd.nan
        n++
        // tillbaka på klockan efter smällen? (efter 3 s + 2 s till)
        Body.setPosition(Wd.ball, { x: 120, y: 400 }) // ur vägen
        Body.setVelocity(Wd.ball, { x: 0, y: 0 })
        steg(Wd, 60 * 2)
        const mal = phiAt(Wd.grind.steg / 60, fas)
        aterstall = Math.max(aterstall, Math.abs(Wd.grind.phi - mal))
        aterN++
      }
    }
  }
  ok('bollen får aldrig mer fart än den kom med', maxExtra <= 0.5, `+${f(maxExtra, 2)} px/steg över ${n} skott`)
  ok('vinkeln stannar inom de hårda gränserna', minPhi >= GRIND.phiMin - 0.06 && maxPhi <= GRIND.phiMax + GRIND.phiHard + 0.06, `φ ${f(minPhi, 3)}…${f(maxPhi, 3)} (gräns ${GRIND.phiMin}…${GRIND.phiMax + GRIND.phiHard})`)
  ok('ingen boll utanför planen', utanfor === 0, `${utanfor} steg`)
  ok('grinden är tillbaka på klockan inom 2 s efter smällen (≤ 0,1 rad)', aterstall <= 0.1, `största avvikelse ${f(aterstall, 3)} rad`)
  ok('gångjärnsglapp ≤ 0,5 px, ingen NaN', glapp <= 0.5 && nan === 0, `${f(glapp, 3)} px, NaN ${nan}`)
}

// ============================== E · körfilen: grinden hållen stängd ================================================
console.log('\nE · grinden HÅLLEN STÄNGD — kommer en boll i full fart förbi?')
{
  let forbi = 0, tot = 0
  for (const spec of [SPEC_TOP, SPEC_BOT]) {
    const sy = spec.vagg === 'top' ? 1 : -1
    // körfilens mitt: från spetsens ände till motsatta väggen
    const y0 = spec.vagg === 'top' ? spec.y + spec.langd + BALL_R + 14 : WALL.t + BALL_R + 14
    const y1 = spec.vagg === 'top' ? WALL.b - BALL_R - 14 : spec.y - spec.langd - BALL_R - 14
    for (let k = 0; k < 8; k++) {
      const y = y0 + ((y1 - y0) * k) / 7
      for (const fart of [18, 26]) {
        const Wd = varld({ spec: { ...spec } })
        Wd.grind.led.motor({ fart: () => 0, maxMoment: Wd.grind.tak * 4 }) // hållen: motorn står på noll fart
        Body.setAngle(Wd.grind.body, Wd.grind.bas) // stängd (φ = 0)
        Body.setAngularVelocity(Wd.grind.body, 0)
        Body.setPosition(Wd.ball, { x: spec.x - 360, y })
        Body.setVelocity(Wd.ball, { x: fart, y: 0 })
        let maxX = 0
        for (let i = 0; i < 60 * 2.5; i++) {
          steg(Wd)
          maxX = Math.max(maxX, Wd.ball.position.x)
        }
        tot++
        if (maxX > spec.x + 90) forbi++
        void sy
      }
    }
  }
  ok('bollen kommer förbi den STÄNGDA grinden i varje körfilsläge (fart 18 och 26)', forbi === tot, `${forbi} av ${tot}`)
}

// ============================== F · tajming: träffandel med/utan grind =============================================
console.log(`\nF · ${N} skott mot målet, bana 6 (hem uppe) — med grind mot HEAD utan`)
function provF(medGrind) {
  const r = mulberry(77)
  let mal = 0, n = 0, rymt = 0
  const hem = { x: 1090, y: 260, r: 100 }
  const spec = { vagg: 'top', x: hem.x - hem.r - 40, y: WALL.t, langd: GRIND.langd }
  for (let i = 0; i < N; i++) {
    const Wd = varld({ spec: medGrind ? { ...spec } : null, hem, fas: r() * 2 * Math.PI })
    // ett barn siktar rakt mot målet med ±12° fel och lagom fart, släpper vid slumpad tid
    const ang = Math.atan2(hem.y - BALL_START.y, hem.x - BALL_START.x) + ((r() - 0.5) * 24 * Math.PI) / 180
    const D = Math.hypot(hem.x - BALL_START.x, hem.y - BALL_START.y)
    const fa = 0.028
    const v0 = clamp((D * 1.1 * fa) / (1 - fa), 12, 26)
    steg(Wd, Math.floor(r() * 200))
    Body.setVelocity(Wd.ball, { x: Math.cos(ang) * v0, y: Math.sin(ang) * v0 })
    for (let s = 0; s < 60 * 6 && !Wd.home; s++) steg(Wd)
    if (Wd.home) mal++
    rymt += Wd.utanfor
    n++
  }
  return { mal, n, rymt }
}
{
  const head = provF(false)
  const ny = provF(true)
  console.log(`   HEAD (ingen grind): ${head.mal}/${head.n} mål (${f((100 * head.mal) / head.n)} %) · NY: ${ny.mal}/${ny.n} (${f((100 * ny.mal) / ny.n)} %)`)
  ok('KONTROLL (HEAD) · utan grind rör sig ingenting', head.rymt === 0)
  ok('en grind kostar skott men gör banan inte olösbar (NY ≥ 35 % av HEAD)', ny.mal >= head.mal * 0.35, `${f((100 * ny.mal) / Math.max(1, head.mal), 0)} % av HEAD`)
  ok('ingen boll utanför planen', ny.rymt === 0, `${ny.rymt}`)
}

console.log(`\n${fel === 0 ? 'ALLT GRÖNT' : fel + ' MÅTT RÖDA'}`)
if (TAL) console.log(JSON.stringify({ perBana }))
process.exit(fel ? 1 : 0)
