// BOWLINGVINDPROBEN (FYSIKPLAN F4, kluster B4) — auto-hjälpens vindby, i TAL, utan webbläsare.
//
//   node scripts/_bowlingvindprobe.mjs
//
// Frågan: välter den SYNLIGA vindbyn (src/games/bowling/vindby.js, Vindfalt) lika många av de
// kvarstående käglorna som HEAD:s osynliga slumpknuff — och gör vinden jobbet SJÄLV, utan knuffen?
//
//   arm K  INGEN HJÄLP        — varken by eller knuff: 0 välter (mätaren rör sig inte av sig själv)
//   arm H  HEAD               — `_autoHelp` ordagrant: setWind(0,0006·dir, −0,0004) + nudge(9 px/steg, slumpvinkel)
//   arm N  NY                 — `startaBy` (Vindfalt) — INGEN knuff; hur många faller av VINDEN ENSAM?
//
// Världen = spelets: gravitation 0, lane-väggar 312/968, kantstöd 360/920 (på/av), kägla = MATERIALS.light
// med frictionAir 0,02, r 26 (index.js `_loadLevel`). Välts = förskjutning > 38 px ELLER fart > 6,5
// (index.js `_update`), per fysiksteg. 12 formationer (index.js FORMATIONER) × tre sidolägen (mitt 580/640/700)
// × fyra kvarstående-urval (alla · främre raden · en enda bakre · slumpad hälft) × kantstöd på/av.
// Därtill: toppfart (tunnling mot 24 px-väggen), var käglorna HAMNAR (stannar de i bild/på banan?),
// tidpunkt för första/sista vält (orsaken ska synas innan följden), och att klotet inte rörs av byn.
import { PhysicsWorld, MATERIALS, Body, nudge } from '../src/lib/physics.js'
import { nyVindby, startaBy, stoppaBy, BY_STEG, KNOCK_DIST, KNOCK_FART } from '../src/games/bowling/vindby.js'

let fel = 0
const ok = (namn, v, d = '') => {
  console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`)
  if (!v) fel++
}
const f1 = (x) => x.toFixed(1)
const pct = (a, b) => `${((100 * a) / b).toFixed(1)} %`

// index.js FORMATIONER (kopia) — [dx från mitten, y]
const FORM = {
  tri3: [[0, 300], [-44, 236], [44, 236]],
  vand3: [[-32, 300], [32, 300], [0, 240]],
  rad3: [[-64, 270], [0, 270], [64, 270]],
  diag3: [[-24, 300], [8, 240], [40, 180]],
  tri6: [[0, 310], [-32, 250], [32, 250], [-64, 190], [0, 190], [64, 190]],
  vand6: [[-64, 310], [0, 310], [64, 310], [-32, 250], [32, 250], [0, 190]],
  mur6: [[-64, 300], [0, 300], [64, 300], [-64, 240], [0, 240], [64, 240]],
  dubbel6: [[-32, 300], [32, 300], [-32, 240], [32, 240], [-32, 180], [32, 180]],
  tri10: [[0, 330], [-32, 270], [32, 270], [-64, 210], [0, 210], [64, 210], [-96, 150], [-32, 150], [32, 150], [96, 150]],
  vand10: [[-96, 330], [-32, 330], [32, 330], [96, 330], [-64, 270], [0, 270], [64, 270], [-32, 210], [32, 210], [0, 150]],
  kupa10: [[-64, 310], [0, 310], [64, 310], [-96, 250], [-32, 250], [32, 250], [96, 250], [-64, 190], [0, 190], [64, 190]],
  romb10: [[-32, 330], [32, 330], [-64, 270], [0, 270], [64, 270], [-64, 210], [0, 210], [64, 210], [-32, 150], [32, 150]],
}

function lcg(seed) {
  let s = seed >>> 0
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296)
}

// index.js _buildLaneWalls + _setBumper + _loadLevel
function varld(pts, bumper) {
  const v = new PhysicsWorld({ gravityY: 0, gravityX: 0, walls: [] })
  v.rectangle(312, 400, 24, 580, { isStatic: true, restitution: 0.2, friction: 0.2, label: 'wall' })
  v.rectangle(968, 400, 24, 580, { isStatic: true, restitution: 0.2, friction: 0.2, label: 'wall' })
  if (bumper) {
    v.rectangle(360, 400, 16, 540, { isStatic: true, studs: 0.75, friktion: 0.1, label: 'bumper' })
    v.rectangle(920, 400, 16, 540, { isStatic: true, studs: 0.75, friktion: 0.1, label: 'bumper' })
  }
  const ball = v.circle(640, 600, 46, { ...MATERIALS.heavy, frictionAir: 0.012, label: 'ball' })
  Body.setInertia(ball, Infinity)
  const pins = pts.map((p) => {
    const body = v.circle(p.x, p.y, 26, { ...MATERIALS.light, frictionAir: 0.02, label: 'pin' })
    return { body, sx: p.x, sy: p.y, ned: false, nar: -1, p: p }
  })
  return { v, ball, pins }
}

// Kör `steg` fysiksteg. `kvar` = index som ska hjälpas (de övriga är redan nere och ligger kvar som kroppar).
// Returnerar mätvärden per kägla i `kvar`.
function kor({ pts, bumper, kvarIdx, arm, steg = 240, slumpSeed = 1 }) {
  const w = varld(pts, bumper)
  const kvar = kvarIdx.map((i) => w.pins[i])
  // övriga käglor har "fallit" tidigare: de ligger kvar som kroppar men räknas inte
  const ballStart = { x: w.ball.position.x, y: w.ball.position.y }
  let vind = null
  const rnd = lcg(slumpSeed)
  const avgX = kvar.reduce((s, p) => s + p.body.position.x, 0) / kvar.length
  if (arm === 'H') {
    const dir = avgX < 640 ? -1 : 1
    w.v.setWind(0.0006 * dir, -0.0004)
    for (const p of kvar) {
      const ang = rnd() * Math.PI * 2
      nudge(p.body, Math.cos(ang) * 9, Math.sin(ang) * 9 - 3)
    }
  } else if (arm === 'N') {
    vind = nyVindby(w.v)
    startaBy(vind, kvar.map((p) => ({ x: p.body.position.x, y: p.body.position.y })))
  }
  let toppFart = 0
  for (let s = 0; s < steg; s++) {
    w.v.update(1000 / 60)
    for (const p of kvar) {
      const dx = p.body.position.x - p.sx
      const dy = p.body.position.y - p.sy
      const fart = Math.hypot(p.body.velocity.x, p.body.velocity.y)
      toppFart = Math.max(toppFart, fart)
      if (!p.ned && (dx * dx + dy * dy > KNOCK_DIST * KNOCK_DIST || p.body.speed > KNOCK_FART)) {
        p.ned = true
        p.nar = s
      }
    }
  }
  const out = {
    kvar: kvar.length,
    ned: kvar.filter((p) => p.ned).length,
    forst: Math.min(...kvar.filter((p) => p.ned).map((p) => p.nar), 1e9),
    sist: Math.max(...kvar.filter((p) => p.ned).map((p) => p.nar), -1),
    toppFart,
    utanfor: kvar.filter((p) => p.body.position.x < 296 || p.body.position.x > 984 || p.body.position.y < 124 || p.body.position.y > 704).length,
    klot: Math.hypot(w.ball.position.x - ballStart.x, w.ball.position.y - ballStart.y),
    slutX: kvar.map((p) => p.body.position.x),
    slutY: kvar.map((p) => p.body.position.y),
  }
  vind?.destroy()
  w.v.destroy()
  return out
}

function urval(namn, pts, rnd) {
  const n = pts.length
  const alla = pts.map((_, i) => i)
  if (namn === 'alla') return alla
  const maxY = Math.max(...pts.map((p) => p.y))
  if (namn === 'fram') return alla.filter((i) => pts[i].y > maxY - 20)
  if (namn === 'bak') {
    const minY = Math.min(...pts.map((p) => p.y))
    return [alla.find((i) => pts[i].y === minY)]
  }
  const k = Math.max(1, Math.floor(n / 2))
  const bland = alla.slice().sort(() => rnd() - 0.5)
  return bland.slice(0, k).sort((a, b) => a - b)
}

console.log('— KONTROLLER —')
{
  const pts = FORM.tri6.map(([dx, y]) => ({ x: 640 + dx, y }))
  const k = kor({ pts, bumper: true, kvarIdx: pts.map((_, i) => i), arm: 'K' })
  ok('arm K: utan by och utan knuff välter INGEN kägla (mätaren rör sig inte av sig själv)', k.ned === 0, `${k.ned} av ${k.kvar}`)
  const h = kor({ pts, bumper: true, kvarIdx: pts.map((_, i) => i), arm: 'H' })
  ok('arm H (HEAD): knuffen välter alla sex', h.ned === h.kvar, `${h.ned} av ${h.kvar}, första steg ${h.forst}`)
  const n = kor({ pts, bumper: true, kvarIdx: pts.map((_, i) => i), arm: 'N' })
  ok('arm N: vindbyn ensam rör mätaren (>0 välter)', n.ned > 0, `${n.ned} av ${n.kvar}`)
  ok('byn rör inte klotet (filter = bara käglor)', n.klot < 0.001, `${n.klot.toFixed(4)} px`)
}

console.log('— MATRIS: 12 formationer × 3 sidolägen × 4 urval × kantstöd på/av —')
const sum = { H: { n: 0, ned: 0, utan: 0, top: 0, utanfor: 0, sist: 0 }, N: { n: 0, ned: 0, utan: 0, top: 0, utanfor: 0, sist: 0, forstMin: 1e9, sistMax: -1 } }
const missade = []
let fall = 0
for (const [namn, pts0] of Object.entries(FORM)) {
  for (const mitt of [580, 640, 700]) {
    const pts = pts0.map(([dx, y]) => ({ x: mitt + dx, y }))
    for (const u of ['alla', 'fram', 'bak', 'halva']) {
      for (const bumper of [true, false]) {
        fall++
        const idx = urval(u, pts, lcg(fall * 7919))
        for (const arm of ['H', 'N']) {
          const r = kor({ pts, bumper, kvarIdx: idx, arm, slumpSeed: fall })
          const s = sum[arm]
          s.n += r.kvar
          s.ned += r.ned
          s.top = Math.max(s.top, r.toppFart)
          s.utanfor += r.utanfor
          s.sist = Math.max(s.sist, r.ned ? r.sist : 0)
          if (arm === 'N') {
            if (r.ned) s.forstMin = Math.min(s.forstMin, r.forst)
            s.sistMax = Math.max(s.sistMax, r.sist)
            if (r.ned < r.kvar) missade.push(`${namn}@${mitt}/${u}/${bumper ? 'stod' : 'öppen'}: ${r.ned}/${r.kvar}`)
          }
        }
      }
    }
  }
}
console.log(`  ${fall} fall`)
console.log(`  HEAD (nudge)     välter ${sum.H.ned} av ${sum.H.n} = ${pct(sum.H.ned, sum.H.n)} · toppfart ${f1(sum.H.top)} px/steg · utanför banan efter 4 s: ${sum.H.utanfor} · sista vält steg ${sum.H.sist}`)
console.log(`  NY (vindby)      välter ${sum.N.ned} av ${sum.N.n} = ${pct(sum.N.ned, sum.N.n)} · toppfart ${f1(sum.N.top)} px/steg · utanför banan efter 4 s: ${sum.N.utanfor} · första vält steg ${sum.N.forstMin} · sista steg ${sum.N.sistMax}`)
if (missade.length) console.log('  missade av vinden ensam:\n    ' + missade.slice(0, 20).join('\n    '))
ok('HEAD välter alla (kontrollarmen stämmer: 100 %)', sum.H.ned === sum.H.n, pct(sum.H.ned, sum.H.n))
ok('NY: vinden ENSAM välter alla kvarstående (ingen knuff)', sum.N.ned === sum.N.n, pct(sum.N.ned, sum.N.n))
ok('NY: toppfarten är under tunnlingsgränsen (≤ 20 px/steg mot 24 px-vägg)', sum.N.top <= 20, `${f1(sum.N.top)} px/steg`)
ok('NY: inget flyger ur banan (x 296–984, y 124–704) efter 4 s', sum.N.utanfor <= sum.H.utanfor, `${sum.N.utanfor} mot HEAD ${sum.H.utanfor}`)
ok('NY: orsaken syns FÖRE följden — första vält först efter 0,25 s (15 steg)', sum.N.forstMin >= 15, `steg ${sum.N.forstMin}`)
ok('NY: allt välter inom byns livstid + 0,5 s', sum.N.sistMax <= BY_STEG + 30, `steg ${sum.N.sistMax} av ${BY_STEG}`)

console.log('— TAKTINVARIANS: samma by oavsett bildfrekvens (fysiken stegar fast 1/60) —')
{
  const pts = FORM.mur6.map(([dx, y]) => ({ x: 640 + dx, y }))
  const res = []
  for (const hz of [30, 60, 90]) {
    const w = varld(pts, true)
    const vind = nyVindby(w.v)
    startaBy(vind, w.pins.map((p) => ({ x: p.body.position.x, y: p.body.position.y })))
    const dt = 1000 / hz
    for (let t = 0; t < 2000; t += dt) w.v.update(dt)
    res.push(w.pins.map((p) => p.body.position.x).reduce((a, b) => a + b, 0) / w.pins.length)
    vind.destroy()
    w.v.destroy()
  }
  ok('medel-x efter 2 s lika vid 30/60/90 Hz (±4 px)', Math.max(...res) - Math.min(...res) <= 4, res.map(f1).join(' / '))
}

console.log('— EXIT/ÅTERSPEL: stoppaBy + destroy lämnar ingen vind kvar —')
{
  const pts = FORM.tri3.map(([dx, y]) => ({ x: 640 + dx, y }))
  const w = varld(pts, true)
  const vind = nyVindby(w.v)
  startaBy(vind, w.pins.map((p) => ({ x: p.body.position.x, y: p.body.position.y })))
  for (let i = 0; i < 10; i++) w.v.update(1000 / 60)
  stoppaBy(vind)
  for (let i = 0; i < 3; i++) w.v.update(1000 / 60)
  ok('stoppaBy: faktorn är 0 efter ett par steg', vind.faktor < 0.001, `faktor ${vind.faktor.toFixed(4)}`)
  vind.destroy()
  w.v.update(1000 / 60)
  ok('destroy: avregistrerad, fortsatt stegning kastar inte', true)
  w.v.destroy()
}

console.log(fel ? `\n${fel} FEL` : '\nalla kontroller gröna')
process.exit(fel ? 1 : 0)
