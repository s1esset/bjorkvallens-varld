// FLIPPERSPEL F1 — snurran som gångjärn (D16 B2). Ren Node, ingen webbläsare.
//
//   node scripts/_dag-flipperspel.mjs
//
// Frågor (kontrollarm = dagens statiska skiva med samma _spinHit-impuls på kulan):
//   A. Studsar kulan av den hängda skivan som av den statiska? (utfart, apex) — tung skiva ⇒ ja
//   B. Dubblas kulans impuls? Kulans utfart med gångjärn mot statisk, samma tangentriktning
//   C. Gångjärnets drift (navet) under 30 träffar ≤ 0,5 px
//   D. En stöt → rörelse → vila: ω går från 0,34 till 0 inom N steg, vinkel växer (ritad geometri)
//   E. Kontrollarm: SAKNAS gångjärnet (fri dynamisk skiva) → navet faller (mätningen duger)
//   F. Livscykel: phys.destroy tar leden
import { PhysicsWorld, Body } from '../src/lib/physics.js'

const GY = 0.85
const BALL_R = 28
const BALL_MAT = { restitution: 0.62, friction: 0.02, frictionAir: 0.01, density: 0.001 }
const SPIN = { x: 640, y: 550, r: 32 }
const SPIN_PUSH = 2.0
const SPIN_KNUFF = 0.34
const SPIN_MAX = 0.62
const SPIN_TATHET = 0.06
const SPIN_LUFT = 0.028
const SPIN_VILA = 0.0008
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

let fel = 0
const ok = (namn, v, d = '') => { console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`); if (!v) fel++ }
const f1 = (v) => v.toFixed(2)

// läge: 'statisk' (HEAD: statisk skiva, ingen rotor) | 'rotor' (NYTT: statisk yta + rotor utan kollision
// på ett gångjärn) | 'dyn' (kontrollarm: den PROVADE-OCH-FÖRKASTADE varianten — en kolliderande dynamisk
// skiva i gångjärn) | 'fri' (kontrollarm utan led)
function rotorOpt() {
  return { density: SPIN_TATHET, frictionAir: SPIN_LUFT, label: 'spinner-rotor', collisionFilter: { category: 0x0002, mask: 0 } }
}
function bygg(lage, { dx = 0, tang = 1, fall = 160 } = {}) {
  const v = new PhysicsWorld({ gravityY: GY, walls: [] })
  let skiva = null // kroppen som får fart (rotorn / den dynamiska skivan)
  let led = null
  if (lage === 'dyn' || lage === 'fri') {
    skiva = v.circle(SPIN.x, SPIN.y, SPIN.r, { restitution: 0.55, friction: 0.02, density: SPIN_TATHET, frictionAir: SPIN_LUFT, label: 'spinner' })
    if (lage === 'dyn') led = v.gangjarn(skiva, { x: SPIN.x, y: SPIN.y })
  } else {
    v.circle(SPIN.x, SPIN.y, SPIN.r, { isStatic: true, restitution: 0.55, friction: 0.02, label: 'spinner' })
    if (lage === 'rotor') {
      skiva = v.circle(SPIN.x, SPIN.y, SPIN.r, rotorOpt())
      led = v.gangjarn(skiva, { x: SPIN.x, y: SPIN.y }, { label: 'spinner-nav' })
    }
  }
  if (skiva && lage !== 'fri') {
    v.beforeStep(() => { const w = Math.abs(skiva.angularVelocity); if (w > 0 && w < SPIN_VILA) Body.setAngularVelocity(skiva, 0) })
  }
  const kula = v.circle(SPIN.x + dx, SPIN.y - SPIN.r - BALL_R - fall, BALL_R, { restitution: 0.62, ...BALL_MAT, label: 'ball' })
  const res = { traff: 0 }
  v.onCollision((e) => {
    for (const p of e.pairs) {
      const a = p.bodyA.label, b = p.bodyB.label
      if (!((a === 'spinner' && b === 'ball') || (b === 'spinner' && a === 'ball'))) continue
      // exakt _spinHit (kulans impuls) — tangentriktningen är en parameter, inte en slump
      const ddx = kula.position.x - SPIN.x, ddy = kula.position.y - SPIN.y
      const d = Math.hypot(ddx, ddy) || 1
      Body.setVelocity(kula, {
        x: kula.velocity.x + (ddx / d) * SPIN_PUSH + (-ddy / d) * tang * 4.2,
        y: kula.velocity.y + (ddy / d) * SPIN_PUSH + (ddx / d) * tang * 4.2,
      })
      if (skiva) Body.setAngularVelocity(skiva, clamp(skiva.angularVelocity + tang * SPIN_KNUFF, -SPIN_MAX, SPIN_MAX))
      res.traff++
    }
  })
  return { v, skiva, kula, led, res }
}

console.log('\nFLIPPERSPEL F1 — snurran som gångjärn\n')

// ---- A + B: kulans väg ----
console.log('  A/B. Kulans väg efter träff: HEAD (statisk) mot rotor-gångjärn, och mot den förkastade dynamiska skivan\n')
const maxAvv = { rotor: 0, dyn: 0 }
const maxApex = { rotor: 0, dyn: 0 }
const maxPos = { rotor: 0, dyn: 0 }
for (const dx of [-20, -8, 0, 8, 20]) {
  for (const tang of [1, -1]) {
    const r = {}
    for (const lage of ['statisk', 'rotor', 'dyn']) {
      const s = bygg(lage, { dx, tang })
      let fart = null
      let topp = Infinity
      for (let i = 0; i < 140; i++) {
        s.v.update(1000 / 60)
        if (s.res.traff && fart === null) fart = { x: s.kula.velocity.x, y: s.kula.velocity.y }
        if (s.res.traff) topp = Math.min(topp, s.kula.position.y)
      }
      r[lage] = { fart, x: s.kula.position.x, y: s.kula.position.y, topp }
      s.v.destroy()
    }
    const rad = []
    for (const lage of ['rotor', 'dyn']) {
      const d = Math.hypot(r.statisk.fart.x - r[lage].fart.x, r.statisk.fart.y - r[lage].fart.y)
      maxAvv[lage] = Math.max(maxAvv[lage], d)
      maxApex[lage] = Math.max(maxApex[lage], Math.abs(r.statisk.topp - r[lage].topp))
      maxPos[lage] = Math.max(maxPos[lage], Math.hypot(r.statisk.x - r[lage].x, r.statisk.y - r[lage].y))
      rad.push(`${lage} Δfart ${f1(d)}`)
    }
    console.log(`     dx ${String(dx).padStart(3)} tang ${tang > 0 ? '+' : '-'}  utfart HEAD (${f1(r.statisk.fart.x)},${f1(r.statisk.fart.y)})  ${rad.join(' · ')} px/steg`)
  }
}
ok('A. ROTOR: kulans utfart är BIT FÖR BIT HEAD:s (max Δ < 1e-6 px/steg)', maxAvv.rotor < 1e-6, `max Δ ${maxAvv.rotor.toExponential(1)}`)
ok('B. ROTOR: kulans läge efter 140 steg identiskt med HEAD (Δ < 1e-6 px)', maxPos.rotor < 1e-6, `max Δ ${maxPos.rotor.toExponential(1)} px`)
ok('A2. kontrollarm: den kolliderande dynamiska skivan ÄNDRAR kulans väg (Δ ≥ 1 px/steg)', maxAvv.dyn >= 1, `max Δ ${f1(maxAvv.dyn)} px/steg, läge Δ ${f1(maxPos.dyn)} px`)

// ---- C: drift ----
{
  const s = bygg('rotor')
  s.kula.isSleeping = false
  let maxDrift = 0
  // 30 träffar: släpp en kula, lägg tillbaka den ovanför varje gång den fallit förbi
  let tr = 0
  for (let i = 0; i < 3000 && tr < 30; i++) {
    s.v.update(1000 / 60)
    maxDrift = Math.max(maxDrift, Math.hypot(s.skiva.position.x - SPIN.x, s.skiva.position.y - SPIN.y))
    if (s.kula.position.y > SPIN.y + 120 || s.kula.position.y < SPIN.y - 250) {
      Body.setPosition(s.kula, { x: SPIN.x + ((tr * 7) % 30) - 15, y: SPIN.y - SPIN.r - BALL_R - 120 })
      Body.setVelocity(s.kula, { x: 0, y: 0 })
      tr++
    }
  }
  ok('C. navet driver ≤ 0,5 px under 30 kulträffar OCH full fart (rotorn)', maxDrift <= 0.5, `max ${maxDrift.toFixed(3)} px, träffar ${s.res.traff}`)
  s.v.destroy()
}

// ---- D: stöt → rörelse → vila ----
{
  const v = new PhysicsWorld({ gravityY: GY, walls: [] })
  const skiva = v.circle(SPIN.x, SPIN.y, SPIN.r, { restitution: 0.55, friction: 0.02, density: SPIN_TATHET, frictionAir: SPIN_LUFT, label: 'spinner' })
  v.gangjarn(skiva, { x: SPIN.x, y: SPIN.y })
  v.beforeStep(() => { const w = Math.abs(skiva.angularVelocity); if (w > 0 && w < SPIN_VILA) Body.setAngularVelocity(skiva, 0) })
  for (let i = 0; i < 5; i++) v.update(1000 / 60)
  const a0 = skiva.angle
  ok('D0. i vila före stöten', Math.abs(skiva.angularVelocity) < 1e-9)
  Body.setAngularVelocity(skiva, SPIN_KNUFF)
  let steg = 0
  let maxW = 0
  let varv = 0
  while (steg < 2000 && !(steg > 2 && skiva.angularVelocity === 0)) { v.update(1000 / 60); maxW = Math.max(maxW, Math.abs(skiva.angularVelocity)); steg++ }
  varv = (skiva.angle - a0) / (Math.PI * 2)
  ok('D1. stöten ger rörelse (ω ≥ 0,3 rad/steg, vinkeln växer)', maxW >= 0.3 && skiva.angle - a0 > 3, `ω max ${f1(maxW)}, Δvinkel ${(skiva.angle - a0).toFixed(1)} rad = ${varv.toFixed(1)} varv`)
  ok('D2. den kommer till vila av sig själv inom 6 s', skiva.angularVelocity === 0 && steg < 360, `${steg} steg = ${(steg / 60).toFixed(1)} s`)
  const aVila = skiva.angle
  for (let i = 0; i < 120; i++) v.update(1000 / 60)
  ok('D3. och står sedan stilla (inget krypande)', skiva.angle === aVila, `Δ ${(skiva.angle - aVila).toExponential(1)}`)
  // gamla tweenen: 0,34 → klingade med 0,972/steg; mät samma avklingning
  const v2 = new PhysicsWorld({ gravityY: GY, walls: [] })
  const s2 = v2.circle(SPIN.x, SPIN.y, SPIN.r, { density: SPIN_TATHET, frictionAir: SPIN_LUFT, label: 'spinner' })
  v2.gangjarn(s2, { x: SPIN.x, y: SPIN.y })
  v2.update(1000 / 60)
  Body.setAngularVelocity(s2, 0.3)
  for (let i = 0; i < 20; i++) v2.update(1000 / 60)
  const kvot = s2.angularVelocity / 0.3
  ok('D4. avklingning ≈ gamla 0,972/steg (efter 20 steg 0,57)', Math.abs(kvot - Math.pow(0.972, 20)) < 0.03, `${kvot.toFixed(3)} mot ${Math.pow(0.972, 20).toFixed(3)}`)
  // celebrate: SPIN_MAX
  Body.setAngularVelocity(s2, SPIN_MAX)
  v2.update(1000 / 60)
  ok('D5. festfarten 0,62 rad/steg klarar `snurr`-vakten (< 1,5)', Math.abs(s2.angularVelocity) < 1.5)
  v.destroy(); v2.destroy()
}

// ---- E: kontrollarm — utan gångjärn faller skivan ----
{
  const s = bygg('fri')
  const y0 = s.skiva.position.y
  for (let i = 0; i < 60; i++) s.v.update(1000 / 60)
  const fall = s.skiva.position.y - y0
  ok('E. kontrollarm: UTAN gångjärn faller skivan (mätningen ser skillnaden)', fall > 200, `${fall.toFixed(0)} px`)
  s.v.destroy()
}

// ---- F: livscykel ----
{
  const s = bygg('rotor')
  const led = s.led
  s.v.destroy()
  ok('F. destroy() tar leden (ingen levande led kvar, inget kast)', !s.v._leder || s.v._leder.size === 0)
  void led
}

console.log(fel ? `\n${fel} FEL\n` : '\nalla gröna\n')
process.exit(fel ? 1 : 0)
