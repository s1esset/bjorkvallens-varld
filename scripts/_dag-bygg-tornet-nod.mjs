// BYGG-TORNET i Node (F1, dag 2026-10-02 D9 B3) — matter utan webbläsare, spelets egna tal.
//
//   node scripts/_dag-bygg-tornet-nod.mjs [frön=6] [--bara arm|siktning|upplägg] [--tal]
//
// Samma kloss-, mark- och vilotal som src/games/bygg-tornet/index.js, och SAMMA stöd (`stod.js`, den
// modul spelet importerar). Klossar läggs ÖTÅLIGT: nästa släpps så fort spelet tillåter (0,22 s efter att
// den förra satt sig) — alltså medan tornet fortfarande gungar. Tre sätt att sikta:
//   jamn    siktar mot tornets topp/mitten med ±90 px felsikt (ett barn som siktar på rutan)
//   ensidig alltid +55 åt höger om toppen (värsta lutningen: tornet byggs snett, högst till +130)
//   slarv   ±140 runt toppen (släpp ofta utanför → många avvisade)
//   vippa   växelvis 90 px vänster/höger om mitten — varje landning stöter tornet åt andra hållet (resonansförsöket)
// Två upplägg per siktning:
//   spel   tre torn à 7 klossar (spelets tak) med riv emellan = 21 lagda, släpp från kranen (y 104)
//   hog    ETT torn på 20 klossar, kranen höjd så att klossen alltid faller samma sträcka (stresstest,
//          spelet når aldrig så högt)
// Armar:
//   fjader  det nya stödet (leder + sockel + vridfjäder)            ← ska ge svaj > 0° och inga fall
//   stel    kontrollarm = dagens kod: klossen låses STATISK         ← ska ge exakt 0° svaj
// Skriver per arm × siktning × upplägg: högsta sockelvinkel (= tornets lutning), högsta klosslutning,
// högsta vinkel mellan två klossar, största stiftglapp, svaj (största förflyttning efter att klossen lagts),
// lagda/avvisade, om någon kloss lämnat tornet, samt toppens stillhet efter sista klossen.
import { PhysicsWorld, Body, mat } from '../src/lib/physics.js'
import { Tornstod, KAT_MARK, STOD } from '../src/games/bygg-tornet/stod.js'

const FRON = Number(process.argv.find((a) => /^\d+$/.test(a)) || 6)
const BARA = process.argv.includes('--bara') ? process.argv[process.argv.indexOf('--bara') + 1] : null
const TAL = process.argv.includes('--tal')
for (const k of ['marginal', 'zeta', 'vinkelTak', 'kMin', 'massa', 'styvhetLed']) if (process.env['S_' + k]) STOD[k] = Number(process.env['S_' + k]) // trimning från skalet

// ---- spelets tal (src/games/bygg-tornet/index.js) --------------------------------------------
const BASE_X = 640, GROUND_TOP_Y = 604, BH = 64, READY_Y = 104
const DESIGN_W = 1280
const BW = 190
const DROP_MIN_X = BW / 2 + 24, DROP_MAX_X = DESIGN_W - BW / 2 - 24
const BLOCK_OPTS = mat('tra', { density: 0.0018, restitution: 0.03, friction: 0.85, frictionStatic: 1.6, frictionAir: 0.02, label: 'block' })
const REST_SPEED = 1.4, ANG_REST = 0.05, REST_HOLD = 0.35, MAX_FALL = 3.0
const ACCEPT_DX = 120, ACCEPT_DY = 58, ACCEPT_ANGLE = Number(process.env.ACC || 0.5)
const SPECS = [{ kind: 'kloss', w: 190 }, { kind: 'kloss', w: 190 }, { kind: 'planka', w: 250 }, { kind: 'smal', w: 140 }, { kind: 'tunna', w: 170 }]
const SPAWN_VANTA = 0.22 // s mellan lagd kloss och nästa väntande
const MAX_DRIFT = 150
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const slotY = (i) => GROUND_TOP_Y - BH / 2 - i * BH
const FRAME = 1000 / 60

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pinGlapp(led) {
  const c = led.constraint
  const mv = (b, p, a0) => {
    if (!b) return { x: p.x, y: p.y }
    const da = b.angle - a0
    const cs = Math.cos(da), sn = Math.sin(da)
    return { x: b.position.x + p.x * cs - p.y * sn, y: b.position.y + p.x * sn + p.y * cs }
  }
  const A = mv(c.bodyA, c.pointA, c.angleA)
  const B = mv(c.bodyB, c.pointB, c.angleB)
  return Math.hypot(A.x - B.x, A.y - B.y)
}

// Ett helt spelpass.
function kor(arm, mode, upplagg, seed) {
  const rnd = mulberry(seed * 7919 + 13)
  const phys = new PhysicsWorld({ gravityY: 1.0, walls: ['floor', 'left', 'right'], iterationer: JSON.parse(process.env.ITER || '{"position":8,"villkor":8}') })
  phys.rectangle(DESIGN_W / 2, GROUND_TOP_Y + 130, DESIGN_W + 400, 260, {
    isStatic: true, friction: 1, frictionStatic: 2, restitution: 0,
    collisionFilter: { group: 0, category: KAT_MARK, mask: 0xffffffff },
  })
  const stod = arm === 'fjader' ? new Tornstod(phys, { px: BASE_X, markY: GROUND_TOP_Y }) : null
  // spelets _onCollision: första kontakten mellan den fallande klossen och toppen/sockeln ger tornet en stöt
  let aktiv = null, stotad = false
  const avKick = stod ? phys.onCollision((e) => {
    if (!aktiv || stotad) return
    for (const p of e.pairs) {
      const a = p.bodyA, b = p.bodyB
      if (a !== aktiv && b !== aktiv) continue
      const o = a === aktiv ? b : a
      if (o === stod.sockel || stod.klossar.includes(o)) { stotad = true; m.stot = Math.max(m.stot || 0, Math.abs(stod.slag(aktiv, Math.abs(a.velocity.y - b.velocity.y)))); break }
    }
  }) : null
  const torn = upplagg === 'hog' ? [20] : [7, 7, 7]
  const m = { sockelMax: 0, kloss: 0, rel: 0, glapp: 0, sjunk: 0, lagda: 0, avvisade: 0, utanfor: 0, svaj: 0, toppFart: 0, kMax: 0, hojd: 0, steg: 0, slut: [] }
  const serie = []
  for (const antal of torn) {
    const placed = []
    const lock = new Map()
    let active = null, fallT = 0, restT = 0, vantaT = 0, fas = 'fall', steg = 0, missar = 0
    // T2: spelets centreringshjälp, per fast steg, från tredje missen (samma tal som _centreraSteg)
    const av = phys.beforeStep(() => {
      if (fas !== 'fall' || !active || missar < 2) return
      const t = placed[placed.length - 1]
      const sx = t ? clamp(t.position.x, BASE_X - MAX_DRIFT, BASE_X + MAX_DRIFT) : BASE_X
      if (active.speed < REST_SPEED && active.angularSpeed < ANG_REST) return
      Body.applyForce(active, active.position, { x: (sx - active.position.x) * 0.0006 * (missar - 1) * active.mass, y: 0 })
    })
    const toppStod = () => {
      const top = placed[placed.length - 1]
      if (!top) return { sx: BASE_X, ty: GROUND_TOP_Y }
      return { sx: clamp(top.position.x, BASE_X - MAX_DRIFT, BASE_X + MAX_DRIFT), ty: top.position.y - BH / 2 }
    }
    let vippSida = 1
    const sikta = () => {
      const top = placed[placed.length - 1]
      const tx = top ? top.position.x : BASE_X
      if (mode === 'ensidig') return clamp(Math.min(tx + 55, BASE_X + 130), DROP_MIN_X, DROP_MAX_X)
      if (mode === 'vippa') { vippSida = -vippSida; return clamp(BASE_X + vippSida * 90, DROP_MIN_X, DROP_MAX_X) }
      if (mode === 'slarv') return clamp(tx + (rnd() * 2 - 1) * 140, DROP_MIN_X, DROP_MAX_X)
      return clamp(0.5 * tx + 0.5 * BASE_X + (rnd() * 2 - 1) * 90, DROP_MIN_X, DROP_MAX_X)
    }
    const slapp = () => {
      const i = placed.length
      const spec = i === 0 ? SPECS[0] : SPECS[Math.floor(rnd() * SPECS.length)]
      const opts = { ...BLOCK_OPTS }
      if (spec.kind === 'tunna') { opts.friction = 0.5; opts.frictionStatic = 0.9 }
      const readyY = upplagg === 'hog' ? toppStod().ty - 330 : READY_Y
      active = phys.rectangle(sikta(), readyY, spec.w, BH, opts)
      aktiv = active; stotad = false
      Body.setVelocity(active, { x: 0, y: 0 })
      fallT = 0; restT = 0
    }
    slapp()
    const maxSteg = 60 * 400
    while (placed.length < antal && steg < maxSteg) {
      steg++
      m.steg++
      phys.update(FRAME)
      const dt = 1 / 60
      if (fas === 'fall' && active) {
        fallT += dt
        const top = placed[placed.length - 1] || null
        const relFart = Math.hypot(active.velocity.x - (top ? top.velocity.x : 0), active.velocity.y - (top ? top.velocity.y : 0))
        const relVink = Math.abs(active.angularVelocity - (top ? top.angularVelocity : 0))
        restT = relFart < REST_SPEED && relVink < ANG_REST ? restT + dt : 0
        if ((fallT > 0.25 && restT > REST_HOLD) || fallT > MAX_FALL) {
          const { sx, ty } = toppStod()
          const dx = Math.abs(active.position.x - sx)
          const dy = active.position.y - (ty - BH / 2)
          if (dy < ACCEPT_DY && dx < ACCEPT_DX && Math.abs(active.angle) < ACCEPT_ANGLE) {
            if (arm === 'stel') Body.setStatic(active, true)
            else stod.lagg(active)
            placed.push(active)
            lock.set(active, { x: active.position.x, y: active.position.y, a: active.angle, nytt: true })
            m.lagda++
            missar = 0
          } else {
            if (process.env.DBG) console.log('avv', { dx: Math.round(dx), dy: Math.round(dy), ang: +active.angle.toFixed(2), n: placed.length, fallT: +fallT.toFixed(1) })
            phys.removeBody(active)
            m.avvisade++
            missar++
            if (missar >= 3) {
              // auto-hjälp (spelets _autoPlace): en kloss rakt på toppen, i toppklossens ram, och leden genast
              const u = placed[placed.length - 1]
              const ang = u ? u.angle : 0
              const ax = u ? u.position.x + Math.sin(ang) * BH : BASE_X
              const ay = u ? u.position.y - Math.cos(ang) * BH : slotY(0)
              const nb = phys.rectangle(ax, ay, BW, BH, { ...BLOCK_OPTS, angle: ang })
              if (arm === 'stel') Body.setStatic(nb, true)
              else stod.lagg(nb)
              placed.push(nb)
              lock.set(nb, { x: nb.position.x, y: nb.position.y, a: nb.angle, nytt: true })
              m.lagda++
              m.hjalp = (m.hjalp || 0) + 1
              missar = 0
            }
          }
          active = null
          fas = 'vanta'; vantaT = SPAWN_VANTA
        }
      } else if (fas === 'vanta') {
        vantaT -= dt
        if (vantaT <= 0 && placed.length < antal) { fas = 'fall'; slapp() }
      }
      if (stod) {
        m.sockelMax = Math.max(m.sockelMax, Math.abs(stod.vinkel))
        m.kMax = Math.max(m.kMax, stod._k)
        for (const l of phys._leder || []) if (l.constraint?.label === 'tornled') m.glapp = Math.max(m.glapp, pinGlapp(l))
      }
      for (let i = 0; i < placed.length; i++) {
        const b = placed[i]
        m.kloss = Math.max(m.kloss, Math.abs(b.angle))
        if (i > 0) m.rel = Math.max(m.rel, Math.abs(b.angle - placed[i - 1].angle))
        if (Math.abs(b.position.x - BASE_X) > 420 || b.position.y > GROUND_TOP_Y + 20 || !Number.isFinite(b.position.x)) { if (process.env.DBG4 && !m.u1) { m.u1 = 1; console.log('UTANFOR', { seed, idx: i, n: placed.length, x: Math.round(b.position.x), y: Math.round(b.position.y), steg: m.steg, th: stod?.vinkel }) } m.utanfor++ }
        const l0 = lock.get(b)
        if (l0.nytt) { l0.nytt = false; l0.x = b.position.x; l0.y = b.position.y; l0.a = b.angle; l0.th = stod ? stod.vinkel : 0 } // läget ETT steg efter låsningen (kontaktlösaren hinner sätta sig)
        m.svaj = Math.max(m.svaj, Math.hypot(b.position.x - l0.x, b.position.y - l0.y))
        if (process.env.DBG3 && arm === 'stel' && !l0.w3 && Math.hypot(b.position.x - l0.x, b.position.y - l0.y) > 0.01) { l0.w3 = true; console.log('STELSVAJ', { seed, idx: i, n: placed.length, dx: b.position.x - l0.x, dy: b.position.y - l0.y, stat: b.isStatic, steg: m.steg }) }
        if (process.env.DBG2 && !l0.warned && Math.abs((b.angle - (stod ? stod.vinkel : 0)) - (l0.a - l0.th)) > 0.1) { l0.warned = true; console.log('VRIDEN', { seed, steg: m.steg, idx: i, n: placed.length, d: +(b.angle - l0.a).toFixed(2), sockel: +(stod?.vinkel ?? 0).toFixed(3), k: +(stod?._k ?? 0).toFixed(0), glapp: +m.glapp.toFixed(2), lock: placed.map((q) => +lock.get(q).a.toFixed(3)), nu: placed.map((q) => +q.angle.toFixed(3)), x: placed.map((q) => Math.round(q.position.x)), w: placed.map((q) => Math.round(q.bounds.max.x - q.bounds.min.x)) }) }
        m.hojd = Math.max(m.hojd, GROUND_TOP_Y - (b.position.y - BH / 2))
      }
      if (placed.length) m.sjunk = Math.max(m.sjunk, Math.abs(placed[0].position.y - slotY(0)))
      if (TAL && steg % 30 === 0 && placed.length) serie.push([m.steg, +(stod ? stod.vinkel : 0).toFixed(4), placed.length])
    }
    av()
    // Efter sista klossen: 5 s till; mät toppens stillhet över sista sekunden.
    const top = placed[placed.length - 1]
    let sistaMax = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
    for (let i = 0; i < 300; i++) {
      phys.update(FRAME)
      if (stod) m.sockelMax = Math.max(m.sockelMax, Math.abs(stod.vinkel))
      if (top && i > 240) { sistaMax = Math.max(sistaMax, top.speed); x0 = Math.min(x0, top.position.x); x1 = Math.max(x1, top.position.x); y0 = Math.min(y0, top.position.y); y1 = Math.max(y1, top.position.y) }
      if (process.env.RING && stod && i % 15 === 0 && seed === 1) console.log('ring', i, +stod.vinkel.toFixed(4), +top.speed.toFixed(3), +(top.angle - stod.vinkel).toFixed(4), 'k', stod._k.toFixed(0), 'd', stod._d.toFixed(0))
    }
    m.toppFart = Math.max(m.toppFart, sistaMax)
    aktiv = null
    if (top) m.darr = Math.max(m.darr || 0, x1 - x0, y1 - y0)
    m.slut.push(+(stod ? stod.vinkel : 0).toFixed(4))
    // riv (spelets _clearBlocks): kroppar bort, stödet glömmer
    for (const b of placed) phys.removeBody(b)
    stod?.glom()
  }
  // tomt torn: sockeln ska vara tillbaka på 0
  for (let i = 0; i < 360; i++) phys.update(FRAME)
  m.tomtSlut = stod ? stod.vinkel : 0
  m.serie = serie
  phys.destroy()
  return m
}

const g = (r) => ((r * 180) / Math.PI).toFixed(2) + '°'
let fel = 0
for (const upplagg of ['spel', 'hog']) {
  for (const arm of ['stel', 'fjader']) {
    for (const mode of ['jamn', 'ensidig', 'slarv', 'vippa']) {
      if (BARA && ![arm, mode, upplagg].includes(BARA)) continue
      const rader = []
      for (let s = 1; s <= FRON; s++) rader.push(kor(arm, mode, upplagg, s))
      const mx = (f) => Math.max(...rader.map(f))
      const ut = rader.reduce((a, r) => a + r.utanfor, 0)
      console.log(
        `${upplagg.padEnd(4)} ${arm.padEnd(7)} ${mode.padEnd(8)} lutning ${g(mx((r) => r.sockelMax)).padStart(6)}  kloss ${g(mx((r) => r.kloss)).padStart(7)}  led-rel ${g(mx((r) => r.rel)).padStart(6)}  ` +
        `svaj ${mx((r) => r.svaj).toFixed(1).padStart(5)}px  glapp ${mx((r) => r.glapp).toFixed(2).padStart(5)}px  sjunk ${mx((r) => r.sjunk).toFixed(1).padStart(4)}px  hojd ${mx((r) => r.hojd).toFixed(0)}  ` +
        `lagda ${rader.map((r) => r.lagda).join('/')} hjalp ${rader.reduce((a, r) => a + (r.hjalp || 0), 0)} avv ${rader.reduce((a, r) => a + r.avvisade, 0)}  utanfor ${ut}  slutfart ${mx((r) => r.toppFart).toFixed(3)} darr ${mx((r) => r.darr || 0).toFixed(2)}px  tomt ${g(mx((r) => Math.abs(r.tomtSlut)))}`
      )
      if (TAL) for (const r of rader.slice(0, 1)) console.log(JSON.stringify(r.serie))
      if (arm === 'fjader' && (ut > 0 || mx((r) => r.sockelMax) > 0.1)) fel++
      if (arm === 'fjader' && mx((r) => r.svaj) < 3) fel++
      if (arm === 'stel' && (mx((r) => r.sockelMax) !== 0 || mx((r) => r.svaj) > 2)) fel++
    }
  }
}
console.log(fel ? `\nFEL: ${fel} rad(er) bryter kravet` : '\nOK')
process.exit(fel ? 1 : 0)
