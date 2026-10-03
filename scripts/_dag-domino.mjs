// DOMINO F1 — klockan som pendel (D16 B2). Ren Node, ingen webbläsare.
//
//   node scripts/_dag-domino.mjs
//
// Siffrorna är KOPIOR av spelets (src/games/domino/index.js, BELL_*) — ändras de där, ändra här.
//   A. i vila: ingen rörelse, vinkeln exakt 0 (en klocka som hänger snett/darrar vore ett fel)
//   B. slag → rörelse → vila: amplitud ≥ 0,3 rad, vila inom 12 s, antal svep begränsat
//   C. dämpad: varje topp lägre än den förra (gungar UT, aldrig upp igen)
//   D. gångjärnet håller: ögleavståndet driver ≤ 0,5 px genom hela svängen
//   E. spelet utanför delen oförändrat: en dominorad faller BIT FÖR BIT lika med och utan klockkropp
//   F. kontrollarm: UTAN vridfjäder/dämpning (damp 0, fa 0) vilar den ALDRIG (mätningen ser skillnaden)
//   G. livscykel: destroy() tar leden
//   H. slagets spann: 0,85–1,15 × → olika amplitud (variation), alla vilar
import { PhysicsWorld, Matter, mat } from '../src/lib/physics.js'

const { Body } = Matter
const GY = 1.5
const BELL_X = 1168
const BELL_Y = 432
const PIVOT = { x: BELL_X - 44, y: BELL_Y - 2 }
const L = 56
const R = 44
const DENS = 0.0004
const FA = 0.004
const K = 0.5
const DAMP = 0.9
const STOT = 0.085
const TILE_W = 26
const TILE_H = 96
const FLOOR_Y = 680
const TILE_Y = FLOOR_Y - TILE_H / 2

let fel = 0
const ok = (namn, v, d = '') => { console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`); if (!v) fel++ }

function klocka({ k = K, damp = DAMP, fa = FA, med = true } = {}) {
  const v = new PhysicsWorld({ gravityY: GY, walls: ['floor', 'left', 'right'] })
  const b = v.circle(PIVOT.x, PIVOT.y + L, R, { density: DENS, frictionAir: fa, label: 'klocka', collisionFilter: { category: 0x0002, mask: 0 } })
  const led = v.gangjarn(b, PIVOT, { label: 'klock-ogla' })
  if (k || damp) led.vridfjader({ vila: 0, k, damp })
  // exakt spelets _stepBell (vila-snäpp)
  const stegBell = () => {
    if (Math.abs(b.angle) < 0.003 && Math.abs(b.angularVelocity) < 0.0006 && b.angle !== 0) {
      Body.setAngle(b, 0)
      Body.setPosition(b, { x: PIVOT.x, y: PIVOT.y + L })
      Body.setVelocity(b, { x: 0, y: 0 })
      Body.setAngularVelocity(b, 0)
    }
  }
  return { v, b, led, stegBell }
}

function svang(w0, opt) {
  const s = klocka(opt)
  const rad = { ang: [], dist: 0, vila: null }
  for (let i = 0; i < 20; i++) { s.v.update(1000 / 60); s.stegBell() }
  Body.setAngularVelocity(s.b, w0)
  for (let i = 0; i < 60 * 14; i++) {
    s.v.update(1000 / 60)
    s.stegBell()
    rad.ang.push(s.b.angle)
    rad.dist = Math.max(rad.dist, Math.abs(Math.hypot(s.b.position.x - PIVOT.x, s.b.position.y - PIVOT.y) - L))
    if (rad.vila == null && i > 30 && s.b.angle === 0 && s.b.angularVelocity === 0) rad.vila = i
  }
  s.v.destroy()
  return rad
}

function toppar(ang) {
  const t = []
  for (let i = 1; i < ang.length - 1; i++) if (Math.abs(ang[i]) > Math.abs(ang[i - 1]) && Math.abs(ang[i]) >= Math.abs(ang[i + 1]) && Math.abs(ang[i]) > 1e-4) t.push(Math.abs(ang[i]))
  return t
}

console.log('\nDOMINO F1 — klockan som pendel\n')

// A
{
  const s = klocka()
  let maxA = 0
  let maxD = 0
  for (let i = 0; i < 600; i++) {
    s.v.update(1000 / 60)
    maxA = Math.max(maxA, Math.abs(s.b.angle))
    maxD = Math.max(maxD, Math.hypot(s.b.position.x - PIVOT.x, s.b.position.y - PIVOT.y - L))
  }
  ok('A. hänger stilla på 10 s utan slag (vinkel 0, ingen drift)', maxA < 1e-6 && maxD < 0.01, `max vinkel ${maxA.toExponential(1)}, drift ${maxD.toFixed(4)} px`)
  s.v.destroy()
}

// B + C + D
{
  const r = svang(-STOT)
  const maxA = Math.max(...r.ang.map(Math.abs))
  const t = toppar(r.ang)
  const nSvep = t.length
  ok('B1. slaget ger rörelse (amplitud ≥ 0,3 rad)', maxA >= 0.3, `max ${maxA.toFixed(3)} rad`)
  ok('B2. första utslaget går ÅT HÖGER (bort från raden, negativ vinkel)', r.ang.slice(0, 40).some((a) => a < -0.2) && r.ang.slice(0, 20).every((a) => a < 0.02))
  ok('B3. den kommer till vila av sig själv inom 12 s (vinkel exakt 0, ω 0)', r.vila != null && r.vila < 60 * 12, r.vila != null ? `${(r.vila / 60).toFixed(1)} s` : 'aldrig')
  ok('B4. begränsat antal svep (≤ 14 toppar) — gungar ut, ingen evighetsmaskin', nSvep <= 14, `${nSvep} toppar`)
  const efter = r.vila != null ? r.ang.slice(r.vila + 1).every((a) => a === 0) : false
  ok('B5. och står sedan exakt stilla', efter)
  let mono = true
  for (let i = 1; i < t.length; i++) if (t[i] > t[i - 1] + 1e-9) mono = false
  ok('C. varje topp lägre än förra (dämpad)', mono, t.slice(0, 8).map((x) => x.toFixed(2)).join(' › '))
  ok('D. gångjärnet håller: öglans avstånd driver ≤ 0,5 px', r.dist <= 0.5, `${r.dist.toFixed(3)} px`)
  ok('D2. 2 s efter slaget är utslaget fortfarande synligt (> 0,07 rad) men < hälften av första', Math.max(...r.ang.slice(110, 130).map(Math.abs)) > 0.07 && Math.max(...r.ang.slice(110, 130).map(Math.abs)) < maxA / 1.4, `${Math.max(...r.ang.slice(110, 130).map(Math.abs)).toFixed(3)} rad`)
}

// H
{
  const amp = []
  let allaVilar = true
  for (const f of [0.85, 1, 1.15]) {
    const r = svang(-STOT * f)
    amp.push(Math.max(...r.ang.map(Math.abs)))
    if (r.vila == null) allaVilar = false
  }
  ok('H. slagets 0,85–1,15 × ger olika amplitud (variation) och alla vilar', allaVilar && amp[2] - amp[0] > 0.05, amp.map((a) => a.toFixed(3)).join(' · '))
}

// F
{
  const r = svang(-STOT, { k: 0, damp: 0, fa: 0 })
  const sist = Math.max(...r.ang.slice(-120).map(Math.abs))
  const forst = Math.max(...r.ang.slice(0, 120).map(Math.abs))
  ok('F. kontrollarm: utan vridfjäder/dämpning vilar den ALDRIG (efter 14 s svänger den fortfarande > 0,15 rad)', r.vila == null && sist > 0.15, `första 2 s ${forst.toFixed(2)} rad, sista 2 s ${sist.toFixed(2)} rad`)
}

// E — brickraden faller bit för bit lika med och utan klockkroppen
{
  const bygg = (medKlocka) => {
    const v = new PhysicsWorld({ gravityY: GY, walls: ['floor', 'left', 'right'] })
    v.rectangle(640, FLOOR_Y + 130, 1880, 260, { isStatic: true, friction: 0.9, restitution: 0 })
    const tiles = []
    const n = 9
    for (let i = 0; i < n; i++) {
      tiles.push(v.rectangle(1040 - (n - 1 - i) * 80, TILE_Y, TILE_W, TILE_H, mat('tra', { friction: 0.4, restitution: 0.04, frictionAir: 0.003 })))
    }
    let klockan = null
    if (medKlocka) {
      klockan = v.circle(PIVOT.x, PIVOT.y + L, R, { density: DENS, frictionAir: FA, label: 'klocka', collisionFilter: { category: 0x0002, mask: 0 } })
      v.gangjarn(klockan, PIVOT).vridfjader({ vila: 0, k: K, damp: DAMP })
    }
    Body.setAngularVelocity(tiles[0], 0.12)
    const ang = []
    for (let i = 0; i < 400; i++) {
      v.update(1000 / 60)
      // spelets knuff-garanti i stället för att vänta på naturlig kedja: samma i båda armarna
      if (i % 27 === 26) {
        const nasta = tiles.find((t) => Math.abs(t.angle) < 0.3)
        if (nasta) Body.setAngularVelocity(nasta, 0.12)
      }
      if (klockan && i === 150) Body.setAngularVelocity(klockan, -STOT)
    }
    for (const t of tiles) ang.push(t.angle, t.position.x, t.position.y)
    v.destroy()
    return ang
  }
  const a = bygg(false)
  const b = bygg(true)
  const diff = Math.max(...a.map((x, i) => Math.abs(x - b[i])))
  ok('E. dominoraden faller BIT FÖR BIT lika med och utan klockans kropp (max Δ 0)', diff === 0, `max Δ ${diff}`)
}

// G
{
  const s = klocka()
  const led = s.led
  s.v.destroy()
  ok('G. destroy() tar leden', !s.v._leder || s.v._leder.size === 0)
  void led
}

console.log(fel ? `\n${fel} FEL\n` : '\nalla gröna\n')
process.exit(fel ? 1 : 0)
