// Mäter lib/flytkraft.js i TAL — utan webbläsare (matter + rena tal, som _slagprobe).
//
//   node scripts/_flytprobe.mjs
//
// Frågorna en vätskevolym måste svara ja på: lägger sig en flytare på RÄTT djup
// (och gör den det oavsett massa?), sjunker en sjunkare hela vägen och LIGGER
// still, gäller vattnet bara innanför kärlet, överlever jämvikten att någon ändrar
// gravitationen — och framför allt: räknar biblioteket exakt samma tal som den
// handrullade koden i `plask-i-vattnet` gjorde? Det sista är portens hela garanti.
import Matter from 'matter-js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { Flytvolym } from '../src/lib/flytkraft.js'

const { Body } = Matter
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

let fel = 0
function ok(namn, villkor, detalj = '') {
  if (villkor) console.log(`  ✓ ${namn}${detalj ? ' · ' + detalj : ''}`)
  else { console.log(`  ✗ ${namn}${detalj ? ' · ' + detalj : ''}`); fel++ }
}

// --- plask-i-vattnets tank, i tal -------------------------------------------
const SURFACE_Y = 330
const FLOOR_TOP = 672
const WALL_L = 414
const WALL_R = 866
const BODY_R = 38
const GRAV_Y = 0.9

function tank({ grav = GRAV_Y } = {}) {
  const varld = new PhysicsWorld({ gravityY: grav, walls: [] })
  const T = 60
  const cx = (WALL_L + WALL_R) / 2
  varld.rectangle(cx, FLOOR_TOP + T / 2, WALL_R - WALL_L + T * 2, T, { isStatic: true, restitution: 0.04, friction: 0.6 })
  varld.rectangle(WALL_L - T / 2, 300, T, 900, { isStatic: true, restitution: 0.04, friction: 0.3 })
  varld.rectangle(WALL_R + T / 2, 300, T, 900, { isStatic: true, restitution: 0.04, friction: 0.3 })
  return varld
}

function foremal(varld, x, y) {
  const b = varld.circle(x, y, BODY_R, { restitution: 0.06, friction: 0.3, frictionAir: 0.012, density: 0.0012 })
  Body.setVelocity(b, { x: 0, y: 1.8 })
  return b
}

// En körning: volymen stegas FÖRE motorn, precis som spelet gör.
function kor(varld, vol, steg, per) {
  let t = 0
  for (let i = 0; i < steg; i++) {
    t += 1 / 60
    vol.steg(t)
    varld.update(1000 / 60)
    per?.(i, t)
  }
  return t
}

console.log('\njämvikt: `flyt` ensamt bestämmer hur högt något flyter')
{
  for (const flyt of [1.2, 1.6, 2.5]) {
    const varld = tank()
    const vol = new Flytvolym({ varld, ytY: SURFACE_Y, botten: FLOOR_TOP, vanster: WALL_L, hoger: WALL_R })
    const b = foremal(varld, 640, 470)
    vol.lagg(b, { flyt, hemX: 640, fas: 0, liv: false })
    kor(varld, vol, 600)
    const f = vol.nedsankning(b)
    ok(`flyt ${flyt} → nedsänkning ≈ ${(1 / flyt).toFixed(3)}`, Math.abs(f - 1 / flyt) < 0.02, `uppmätt ${f.toFixed(3)} · y ${b.position.y.toFixed(1)}`)
  }
}

console.log('\nmassoberoende: tre tätheter, samma djup')
{
  const djup = []
  for (const density of [0.0004, 0.0012, 0.0060]) {
    const varld = tank()
    const vol = new Flytvolym({ varld, ytY: SURFACE_Y, botten: FLOOR_TOP, vanster: WALL_L, hoger: WALL_R })
    const b = varld.circle(640, 470, BODY_R, { restitution: 0.06, friction: 0.3, frictionAir: 0.012, density })
    vol.lagg(b, { flyt: 1.6, hemX: 640, fas: 0, liv: false })
    kor(varld, vol, 600)
    djup.push(vol.nedsankning(b))
  }
  const spann = Math.max(...djup) - Math.min(...djup)
  ok('samma nedsänkning oavsett massa', spann < 0.01, djup.map((d) => d.toFixed(3)).join(' · '))
}

console.log('\nsjunkare: hela vägen ner, och sedan STILLA')
{
  const varld = tank()
  const vol = new Flytvolym({ varld, ytY: SURFACE_Y, botten: FLOOR_TOP, vanster: WALL_L, hoger: WALL_R })
  const b = foremal(varld, 640, 470)
  vol.lagg(b, { flyt: 0.4, hemX: 640, fas: 0 })
  let maxFart = 0
  kor(varld, vol, 600, () => { maxFart = Math.max(maxFart, Math.hypot(b.velocity.x, b.velocity.y)) })
  const vila = Math.hypot(b.velocity.x, b.velocity.y)
  ok('når botten', b.position.y > FLOOR_TOP - BODY_R - 6, `y ${b.position.y.toFixed(1)} (golv ${FLOOR_TOP - BODY_R})`)
  ok('ligger still', vila < 0.35, `slutfart ${vila.toFixed(3)} px/steg`)
  ok('fartspärren höll', maxFart <= 10.001, `toppfart ${maxFart.toFixed(2)} px/steg (tak 10)`)
}

console.log('\nvolymen är en REKTANGEL, inte en oändlig ytlinje')
{
  const varld = new PhysicsWorld({ gravityY: GRAV_Y, walls: [] })
  const vol = new Flytvolym({ varld, ytY: SURFACE_Y, vanster: WALL_L, hoger: WALL_R })
  const inne = varld.circle(640, 470, BODY_R, { frictionAir: 0.012, density: 0.0012 })
  const ute = varld.circle(200, 470, BODY_R, { frictionAir: 0.012, density: 0.0012 })
  vol.lagg(inne, { flyt: 1.6, fas: 0, liv: false })
  vol.lagg(ute, { flyt: 1.6, fas: 0, liv: false })
  kor(varld, vol, 240)
  ok('kroppen i vattnet stiger till ytan', inne.position.y < SURFACE_Y + BODY_R, `y ${inne.position.y.toFixed(1)}`)
  ok('kroppen utanför faller fritt', ute.position.y > 470 + 200, `y ${ute.position.y.toFixed(1)}`)
  ok('utanför volymen är nedsänkningen 0', vol.nedsankning(ute) === 0)
}

console.log('\nbasen läses ur världen varje steg (gravitationsbyte behåller jämvikten)')
{
  const varld = tank()
  const vol = new Flytvolym({ varld, ytY: SURFACE_Y, botten: FLOOR_TOP, vanster: WALL_L, hoger: WALL_R })
  const b = foremal(varld, 640, 470)
  vol.lagg(b, { flyt: 1.6, hemX: 640, fas: 0, liv: false })
  kor(varld, vol, 400)
  const f1 = vol.nedsankning(b)
  varld.setGravity(2.2)
  kor(varld, vol, 400)
  const f2 = vol.nedsankning(b)
  ok('samma jämvikt efter dubblad gravitation', Math.abs(f2 - f1) < 0.02, `${f1.toFixed(3)} → ${f2.toFixed(3)}`)
}

console.log('\nPORTEN: biblioteket räknar samma tal som plask-i-vattnets egen kod')
{
  // Den handrullade koden, ordagrant ur src/games/plask-i-vattnet/index.js före bytet.
  const BUOY_BASE = GRAV_Y * 0.001
  const DRAG = 0.93
  const BOB_AMP = 0.0007, BOB_W = 1.8
  const SWAY_AMP = 0.00025, SWAY_W = 1.4
  const SPRING_K = 0.00003, MAXF_A = 0.0008
  const MAX_V = 10, ANG_DAMP = 0.9

  const gammal = (objects, t) => {
    for (const o of objects) {
      const b = o.body
      const pos = b.position
      const frac = clamp((pos.y + o.r - SURFACE_Y) / (2 * o.r), 0, 1)
      if (frac > 0) {
        const buoyA = BUOY_BASE * frac * o.floatFactor
        let vAcc = -buoyA
        let swayA = SPRING_K * (o.homeX - pos.x)
        if (o.floats) {
          vAcc += BOB_AMP * Math.sin(t * BOB_W + o.phase)
          swayA += SWAY_AMP * Math.sin(t * SWAY_W + o.phase * 1.3)
        }
        swayA = clamp(swayA, -MAXF_A, MAXF_A)
        Body.applyForce(b, pos, { x: b.mass * swayA, y: b.mass * vAcc })
        Body.setVelocity(b, { x: b.velocity.x * DRAG, y: b.velocity.y * DRAG })
      }
      if (!o.floats && pos.y > FLOOR_TOP - o.r - 8) {
        Body.setVelocity(b, { x: b.velocity.x * 0.7, y: b.velocity.y * 0.7 })
      }
      if (b.angularVelocity) Body.setAngularVelocity(b, b.angularVelocity * ANG_DAMP)
      const sp = Math.hypot(b.velocity.x, b.velocity.y)
      if (sp > MAX_V) Body.setVelocity(b, { x: (b.velocity.x / sp) * MAX_V, y: (b.velocity.y / sp) * MAX_V })
    }
  }

  // Två identiska tankar: en med den gamla koden, en med volymen.
  const A = tank()
  const B = tank()
  const uppsattning = [
    { x: 560, y: 460, floats: true, floatFactor: 1.6, homeX: 496, phase: 0.7 },
    { x: 700, y: 480, floats: false, floatFactor: 0.4, homeX: 704, phase: 2.1 },
    { x: 640, y: 430, floats: true, floatFactor: 1.6, homeX: 680, phase: 4.4 },
  ]
  const gamlaObj = []
  const volB = new Flytvolym({ varld: B, ytY: SURFACE_Y, botten: FLOOR_TOP, vanster: WALL_L, hoger: WALL_R })
  const nyaKroppar = []
  for (const s of uppsattning) {
    const a = foremal(A, s.x, s.y)
    Body.setAngularVelocity(a, 0.12)
    gamlaObj.push({ body: a, r: BODY_R, floats: s.floats, floatFactor: s.floatFactor, homeX: s.homeX, phase: s.phase })
    const b = foremal(B, s.x, s.y)
    Body.setAngularVelocity(b, 0.12)
    volB.lagg(b, { flyt: s.floatFactor, hemX: s.homeX, fas: s.phase, liv: s.floats })
    nyaKroppar.push(b)
  }

  let maxDiff = 0
  let t = 0
  for (let i = 0; i < 900; i++) {
    t += 1 / 60
    gammal(gamlaObj, t)
    A.update(1000 / 60)
    volB.steg(t)
    B.update(1000 / 60)
    for (let k = 0; k < nyaKroppar.length; k++) {
      const d = Math.hypot(gamlaObj[k].body.position.x - nyaKroppar[k].position.x, gamlaObj[k].body.position.y - nyaKroppar[k].position.y)
      if (d > maxDiff) maxDiff = d
    }
  }
  ok('identiska banor över 900 steg', maxDiff === 0, `största avvikelse ${maxDiff} px`)
  console.log(`    slutlägen: ${nyaKroppar.map((b) => `(${b.position.x.toFixed(1)}, ${b.position.y.toFixed(1)})`).join(' · ')}`)
}

console.log('\nexit-säkerhet')
{
  const varld = tank()
  const vol = new Flytvolym({ varld, ytY: SURFACE_Y, botten: FLOOR_TOP, vanster: WALL_L, hoger: WALL_R })
  const b = foremal(varld, 640, 470)
  vol.lagg(b, { flyt: 1.6, fas: 0 })
  kor(varld, vol, 120)
  vol.destroy()
  const fore = { x: b.position.x, y: b.position.y }
  Body.setVelocity(b, { x: 0, y: 0 })
  Body.setPosition(b, fore)
  vol.steg(9)
  ok('steg() efter destroy() rör ingen kropp', b.position.x === fore.x && b.position.y === fore.y)
  ok('inga kroppar kvar i volymen', vol.count === 0)
  vol.destroy() // dubbel-destroy ska inte kasta
  ok('dubbel destroy är ofarlig', true)
}

console.log(fel === 0 ? '\nALLT GRÖNT\n' : `\n${fel} FEL\n`)
process.exit(fel ? 1 : 0)
