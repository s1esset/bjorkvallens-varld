// FLIPPERSLAGET i Node (R2, dag 2026-10-02 D7) — samma fråga som _dag-flipperslag.mjs men utan
// webbläsare: PhysicsWorld + spelets paddelgeometri, kul-material, kick och fartspärr.
//
//   node scripts/_dag-flipperslag-node.mjs [reps] [maxVinkel]
//
// Armar:  head = statisk kropp, setPosition/setAngle utan fart (dagens kod före R2)
//         kin  = phys.kinematisk(body).till(x, y, vinkel) (R2)
// Per slag: kulan stilla på slagsidan av vänster paddel, avstånd d från mittlinjen vid andel t,
// paddeln trycks (170 ms), 45 bildrutor. igenom / ut / fart / uppåt som i webbläsarsonden.
// Kontrollarm: head ska ge ~1/18 igenom och uppåt median ~−22 (orkestrerarens mätning).
import { PhysicsWorld, MATERIALS, Body } from '../src/lib/physics.js'

const reps = Number(process.argv[2] || 20)
const MAXV = Number(process.argv[3] || 0.25)
const PAD_LEN = 150, PAD_T = 30, PIVOT_Y = 596, REST_A = 0.5, UP_A = -0.55, TIP_GAP = 100
const BALL_R = 28
const MID = 640
const PIVOT_DX = PAD_LEN * Math.cos(REST_A)
const PIVOT_LX = MID - TIP_GAP / 2 - PIVOT_DX
const BALL_MAT = { restitution: 0.62, friction: 0.02, frictionAir: 0.01, density: 0.001 }
const KICK_MIN = 15, KICK_MAX = 25, SPEED = 27
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rand = (a, b) => a + Math.random() * (b - a)
const FRAME = 1000 / 60

function closestOnSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const l2 = dx * dx + dy * dy || 1
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1)
  return { x: ax + t * dx, y: ay + t * dy, t }
}

function kor(arm) {
  const phys = new PhysicsWorld({ gravityY: 0.85, walls: [] })
  const hog = process.env.SIDE === 'right'
  const def = hog ? { px: MID + TIP_GAP / 2 + PIVOT_DX, py: PIVOT_Y, rest: Math.PI - REST_A, up: Math.PI - UP_A, ks: 1 } : { px: PIVOT_LX, py: PIVOT_Y, rest: REST_A, up: UP_A, ks: -1 }
  const cx0 = def.px + (PAD_LEN / 2) * Math.cos(def.rest)
  const cy0 = def.py + (PAD_LEN / 2) * Math.sin(def.rest)
  const body = phys.rectangle(cx0, cy0, PAD_LEN, PAD_T, { angle: def.rest, isStatic: true, friction: 0.02, restitution: 0.3, label: 'flipper' })
  const p = { body, pivotX: def.px, pivotY: def.py, ks: def.ks, rest: def.rest, up: def.up, ang: def.rest, mal: def.rest, kicked: false }
  const wallOpt = { isStatic: true, restitution: 0.3, friction: 0.05, label: 'wall' }
  phys.rectangle(250, 410, 40, 596, wallOpt)
  phys.rectangle(1030, 410, 40, 596, wallOpt)
  phys.rectangle(MID, 132, 780, 40, wallOpt)
  const kin = arm === 'kin' ? phys.kinematisk(body, { maxFart: 24, maxVinkel: MAXV }) : null
  const ball = phys.circle(MID, 200, BALL_R, { ...MATERIALS.bouncy, ...BALL_MAT, label: 'ball' })
  let press = 0
  const tryKick = () => {
    const b = ball
    const bx = p.pivotX + PAD_LEN * Math.cos(p.ang), by = p.pivotY + PAD_LEN * Math.sin(p.ang)
    const c = closestOnSeg(b.position.x, b.position.y, p.pivotX, p.pivotY, bx, by)
    const dist = Math.hypot(b.position.x - c.x, b.position.y - c.y)
    if (dist > BALL_R + PAD_T / 2 + 16) return
    p.kicked = true
    const a = p.ang + rand(-0.1, 0.1)
    const nx = p.ks * -Math.sin(a), ny = p.ks * Math.cos(a)
    const power = KICK_MIN + (KICK_MAX - KICK_MIN) * clamp(c.t, 0.2, 1)
    Body.setPosition(b, { x: c.x + nx * (BALL_R + PAD_T / 2 + 2), y: c.y + ny * (BALL_R + PAD_T / 2 + 2) })
    Body.setVelocity(b, { x: nx * power + b.velocity.x * 0.15, y: ny * power })
  }
  const frame = () => {
    press = Math.max(0, press - FRAME)
    const pressed = press > 0
    if (!pressed) p.kicked = false
    const target = pressed ? p.up : p.rest
    const k = pressed ? 0.45 : 0.2
    if (arm === 'head') {
      p.ang += (target - p.ang) * k
      Body.setPosition(body, { x: p.pivotX + (PAD_LEN / 2) * Math.cos(p.ang), y: p.pivotY + (PAD_LEN / 2) * Math.sin(p.ang) })
      Body.setAngle(body, p.ang)
    } else {
      p.mal += (target - p.mal) * k
      const a = body.angle + clamp(p.mal - body.angle, -MAXV, MAXV)
      kin.till(p.pivotX + (PAD_LEN / 2) * Math.cos(a), p.pivotY + (PAD_LEN / 2) * Math.sin(a), a)
    }
    if (pressed && !p.kicked && !process.env.NOKICK) tryKick()
    phys.update(FRAME)
    if (arm === 'kin') p.ang = body.angle
    const sp = Math.hypot(ball.velocity.x, ball.velocity.y)
    if (sp > SPEED) Body.setVelocity(ball, { x: (ball.velocity.x * SPEED) / sp, y: (ball.velocity.y * SPEED) / sp })
  }
  return { phys, p, ball, frame, flip: () => { press = 170; p.kicked = false }, vila: () => { press = 0 } }
}

function mat(arm) {
  const res = []
  for (let rep = 0; rep < reps; rep++) {
    for (const d of [62, 75, 95]) {
      for (const t of [0.5, 0.8, 1.0]) {
        const w = kor(arm)
        const { p, ball } = w
        for (let i = 0; i < 30; i++) { Body.setPosition(ball, { x: MID, y: 300 }); Body.setVelocity(ball, { x: 0, y: 0 }); w.frame() }
        const a = p.ang
        const ux = Math.cos(a), uy = Math.sin(a)
        const nx = p.ks * -Math.sin(a), ny = p.ks * Math.cos(a)
        const L = 150
        Body.setPosition(ball, { x: p.pivotX + ux * L * t + nx * d, y: p.pivotY + uy * L * t + ny * d })
        Body.setVelocity(ball, { x: 0, y: 0 })
        w.flip()
        let igenom = false, fart = 0, ute = false, uppat = 0, fore = null
        for (let i = 0; i < 45; i++) {
          w.frame()
          const pa = p.ang
          const qx = ball.position.x - p.pivotX, qy = ball.position.y - p.pivotY
          const along = qx * Math.cos(pa) + qy * Math.sin(pa)
          const perp = -qx * Math.sin(pa) * p.ks + qy * Math.cos(pa) * p.ks
          if (along >= 0 && along <= L) {
            const sg = Math.sign(perp)
            if (fore !== null && sg !== fore && Math.abs(perp) < 60) igenom = true
            fore = sg
          }
          fart = Math.max(fart, Math.hypot(ball.velocity.x, ball.velocity.y))
          uppat = Math.min(uppat, ball.velocity.y)
          if (ball.position.x < 0 || ball.position.x > 1280 || ball.position.y < -60) ute = true
        }
        res.push({ d, t, igenom, ute, fart, uppat })
        w.phys.destroy()
      }
    }
  }
  const n = res.length
  const med = (k) => res.map((r) => r[k]).sort((x, y) => x - y)[n >> 1]
  return {
    arm, slag: n, igenom: res.filter((r) => r.igenom).length, ut: res.filter((r) => r.ute).length,
    fartMedian: +med('fart').toFixed(1), uppatMedian: +med('uppat').toFixed(1), uppatMin: +Math.min(...res.map((r) => r.uppat)).toFixed(1),
    traffadeUppat: res.filter((r) => r.uppat < -5).length,
  }
}

console.log(JSON.stringify(mat('head')))
console.log(JSON.stringify(mat('kin')))
