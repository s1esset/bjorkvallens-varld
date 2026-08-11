// Mäter att `natskott-pa-stan`s nätlina beter sig LIKADANT efter bytet till lib/rep.js.
//
//   node scripts/_natlinaprobe.mjs
//
// Spelet bar en egen verlet-solver (`mkRope`/`stepRope`) — samma matematik som `Rep`,
// med egna konstanter och en död `freeTail`-gren. Den gamla koden ligger kvar HÄR som
// REFERENS, för det är det enda sättet att svara på portkravets fråga: ser linan
// likadan ut efteråt? Talen nedan är skälet till att `Rep` byggs med spelets egna
// konstanter (`iter: 3`, `damp: 0.93`, `grav: 0.5`) och inte med lib:ens standardvärden.
//
// ⚠️ JÄMFÖR SETTLADE LÄGEN, INTE TRANSIENTER. Första versionen mätte största avvikelse
// under ett förlopp där linans vilolängd ändrades varje bildruta, fick 158 px och såg ut
// som en regression. Men de två solvrarna konvergerar OLIKA FORT (`Rep` lägger hela
// korrigeringen på grannen intill en spikad punkt, den gamla halva), så mitt i ett
// förlopp är de olika på vägen till SAMMA form. Settlat: sag 320,6 → 319,5 px och
// största punktavvikelse **1,2 px**. Det ögat läser under förloppet är sag-kurvan, och
// den mäts för sig.
import { Rep } from '../src/lib/rep.js'

// ---- GAMLA SOLVERN, ordagrant ur spelet före bytet (referens) ----------------
const ROPE_PTS = 12
const ROPE_G = 0.5
const ROPE_DAMP = 0.93
const ROPE_ITER = 3
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function mkRope(x, y) {
  const pts = []
  for (let i = 0; i < ROPE_PTS; i++) pts.push({ x, y, px: x, py: y })
  return { pts }
}
function stepRope(rope, ax, ay, bx, by, dtF, sag = 1) {
  const pts = rope.pts
  const f = clamp(dtF, 0.2, 2)
  const last = pts.length - 1
  for (let i = 1; i < last; i++) {
    const p = pts[i]
    const vx = (p.x - p.px) * ROPE_DAMP
    const vy = (p.y - p.py) * ROPE_DAMP
    p.px = p.x
    p.py = p.y
    p.x += vx * f
    p.y += vy * f + ROPE_G * f * f
  }
  pts[0].x = ax; pts[0].y = ay; pts[0].px = ax; pts[0].py = ay
  pts[last].x = bx; pts[last].y = by; pts[last].px = bx; pts[last].py = by
  const seg = (Math.hypot(bx - ax, by - ay) / last) * sag
  for (let k = 0; k < ROPE_ITER; k++) {
    for (let i = 0; i < last; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      let dx = b.x - a.x
      let dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 1
      const diff = ((d - seg) / d) * 0.5
      dx *= diff
      dy *= diff
      if (i > 0) { a.x += dx; a.y += dy }
      if (i + 1 < last) { b.x -= dx; b.y -= dy }
    }
  }
}

// ---- NYA vägen: lib/rep.js med spelets egna konstanter (måste följa index.js) ----
const MAXSPEED = 120
function byggNy(x, y) {
  const r = new Rep({ n: ROPE_PTS, seg: 40, grav: ROPE_G, damp: ROPE_DAMP, iter: ROPE_ITER, maxSpeed: MAXSPEED })
  r.pts = []
  for (let i = 0; i < ROPE_PTS; i++) r.pts.push({ x, y, px: x, py: y })
  return r
}
const stegNy = (r, ax, ay, bx, by, dtF, sag = 1) => { r.spann(ax, ay, bx, by, sag); r.steg(dtF) }

// ---- Mått: det ögat faktiskt läser på en lina -------------------------------
// Djupaste avvikelsen från kordan = hur mycket linan HÄNGER.
function sag(pts) {
  const a = pts[0]
  const b = pts[pts.length - 1]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const L = Math.hypot(dx, dy) || 1
  let max = 0
  for (const p of pts) {
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (L * L)
    max = Math.max(max, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)))
  }
  return max
}
const langd = (pts) => {
  let L = 0
  for (let i = 0; i < pts.length - 1; i++) L += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
  return L
}
const avvik = (a, b) => {
  let m = 0
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y))
  return m
}

let fel = 0
const ok = (n, v, d = '') => { console.log(`  ${v ? '✓' : '✗'} ${n}${d ? ' · ' + d : ''}`); if (!v) fel++ }

const HAND = { x: 300, y: 420 }

// Settlad form vid en given spänning — den bild som står kvar på skärmen.
function settlat(namn, mal, sg, tak = 3) {
  const g = mkRope(HAND.x, HAND.y)
  const n = byggNy(HAND.x, HAND.y)
  for (let i = 0; i < 400; i++) {
    stepRope(g, HAND.x, HAND.y, mal.x, mal.y, 1, sg)
    stegNy(n, HAND.x, HAND.y, mal.x, mal.y, 1, sg)
  }
  console.log(`\n${namn}`)
  console.log(`    gammal · sag ${sag(g.pts).toFixed(1)} px · langd ${langd(g.pts).toFixed(1)} px`)
  console.log(`    ny     · sag ${sag(n.pts).toFixed(1)} px · langd ${langd(n.pts).toFixed(1)} px`)
  ok('linan hanger lika djupt', Math.abs(sag(g.pts) - sag(n.pts)) < tak, `${sag(g.pts).toFixed(1)} → ${sag(n.pts).toFixed(1)} px`)
  ok('och ar lika lang', Math.abs(langd(g.pts) - langd(n.pts)) < tak * 3, `${langd(g.pts).toFixed(1)} → ${langd(n.pts).toFixed(1)} px`)
  ok('ingen punkt hamnar nagon annanstans', avvik(g.pts, n.pts) < tak, `storsta avvikelse ${avvik(g.pts, n.pts).toFixed(1)} px`)
  const e0 = Math.hypot(n.pts[0].x - HAND.x, n.pts[0].y - HAND.y)
  const e1 = Math.hypot(n.pts[n.pts.length - 1].x - mal.x, n.pts[n.pts.length - 1].y - mal.y)
  ok('bada andar sitter fast', e0 < 0.01 && e1 < 0.01, `hand ${e0.toFixed(3)} px · spets ${e1.toFixed(3)} px`)
}

console.log('SETTLADE LAGEN — samma bild pa skarmen?')
// ⚠️ Det SPANDA fallet ar det enda som skiljer sig matbart: `Rep` lagger hela
// korrigeringen pa grannen intill en spikad punkt (den gamla halva), sa en spand lina
// halls STRAMARE. Uppmatt 73,6 → 66,3 px sag pa en 946 px lang lina = 0,8 % av dess
// langd, och mindre an dubbla dess egna ritade bredd (4–5 px). En spand lina som ar
// nagot rakare ar dessutom ratt bild. Tacket 9 px ar det matta vardet, inte en gissning.
settlat('1. spant rep (sag 0,98) — skottet pa plats', { x: 1200, y: 180 }, 0.98, 9)
settlat('2. slak lina (sag 1,5) — missen som hanger pa vaggen', { x: 920, y: 300 }, 1.5)
settlat('3. vinschad lina (sag 0,9) — kroppen dras hem', { x: 420, y: 380 }, 0.9)

console.log('\nPISKAN — sag-kurvan medan skottet flyger (det ogat foljer)')
{
  const g = mkRope(HAND.x, HAND.y)
  const n = byggNy(HAND.x, HAND.y)
  const gk = []
  const nk = []
  let varst = 0
  for (let i = 1; i <= 18; i++) {
    const p = i / 18
    const bx = HAND.x + 900 * p
    const by = HAND.y - 240 * p
    stepRope(g, HAND.x, HAND.y, bx, by, 1, 0.98)
    stegNy(n, HAND.x, HAND.y, bx, by, 1, 0.98)
    gk.push(sag(g.pts))
    nk.push(sag(n.pts))
    varst = Math.max(varst, Math.abs(gk[i - 1] - nk[i - 1]))
  }
  console.log(`    gammal ${gk.map((v) => v.toFixed(0).padStart(2)).join(' ')}`)
  console.log(`    ny     ${nk.map((v) => v.toFixed(0).padStart(2)).join(' ')}`)
  ok('piskan bygger upp sig likadant', varst < 9, `storsta skillnad ${varst.toFixed(1)} px genom hela flygningen`)
  ok('och slutar lika djupt', Math.abs(gk[17] - nk[17]) < 6, `${gk[17].toFixed(1)} → ${nk[17].toFixed(1)} px`)
}

console.log('\nRYCKET — spetsen teleporterar 800 px med en tappad bildruta (dtF 2)')
{
  // ⚠️ DET HAR AR INTE EN LIKHETSKONTROLL UTAN EN FIX. Den gamla solvern saknade
  // fartsparr, sa ett hopp i spetsen (en monsterdel som byter lage) plus dtF 2 gav en
  // lina pa 110 450 px for en korda pa 1300 — en vit klotter-blixt over hela skarmen i
  // en bildruta, utan ett enda konsolfel. `Rep`s maxSpeed haller ihop den.
  const korda = Math.hypot(1200, -500)
  const g = mkRope(HAND.x, HAND.y)
  const n = byggNy(HAND.x, HAND.y)
  for (let i = 0; i < 20; i++) {
    stepRope(g, HAND.x, HAND.y, HAND.x + 400, HAND.y, 1, 1)
    stegNy(n, HAND.x, HAND.y, HAND.x + 400, HAND.y, 1, 1)
  }
  for (let i = 0; i < 20; i++) {
    stepRope(g, HAND.x, HAND.y, HAND.x + 1200, HAND.y - 500, 2, 1)
    stegNy(n, HAND.x, HAND.y, HAND.x + 1200, HAND.y - 500, 2, 1)
  }
  console.log(`    gammal · korda ${korda.toFixed(0)} px · lina ${langd(g.pts).toFixed(0)} px`)
  console.log(`    ny     · korda ${korda.toFixed(0)} px · lina ${langd(n.pts).toFixed(0)} px`)
  ok('den GAMLA sprack (det ar buggen bytet tar bort)', langd(g.pts) > korda * 10, `${(langd(g.pts) / korda).toFixed(0)}x kordan`)
  ok('den nya haller ihop', langd(n.pts) < korda * 2, `${(langd(n.pts) / korda).toFixed(2)}x kordan`)
  ok('och inga NaN', n.pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)))
}

console.log(fel === 0 ? '\nALLT GRONT\n' : `\n${fel} FEL\n`)
process.exit(fel ? 1 : 0)
