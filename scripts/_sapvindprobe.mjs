// SÅPBUBBLORNAS VINDPROBE (FYSIKPLAN F4, kluster B3) — drivs en bubbla av puff-FÄLTET som av de gamla puffarna?
//
//   node scripts/_sapvindprobe.mjs
//
// Kör i Node, ingen webbläsare. Bubblan simuleras med spelets egen rörelseloop (`_update` i
// sapbubblor/index.js: luftmotstånd 0,93/bildruta, tak 470/330 px/s, stigning `_vy`), en gång med
// HEAD:s puff (rund fläck, kraft 2500·(1−d/r)·liv/massa — kopia nedan) och en gång med
// `sapvind.js`, SAMMA modul som spelet kör.
//
// Mätningarna (per blås från vänster fläkt, tre sikten, 4 bubbelstorlekar, rutnät 40 px):
//   0  KONTROLL     ingen puff → ingen vindförflyttning (mätningen ser bara vinden)
//   1  KONTROLL     gamla puffen: lätt bubbla flyttas längre än jätten; bubbla utanför flyttas inte
//   2  REACH        antal rutnätspunkter där bubblan flyttas ≥ 30 px av vinden: gammal mot ny
//   3  STYRKA       medianen av ny/gammal förflyttning där gamla flyttar ≥ 30 px
//   4  FORM         korrelation gammal–ny över hela rutnätet
//   5  P0           inget blåses NEDÅT, ingen fart över taken, ingen NaN; puffens fält är tomt när den är slut
//   6  TAKT         30 mot 60 mot 20 fps ger samma förflyttning (±12 %)
//   7  EXIT         `destroy()` → fältet är ett no-op
import { nyPuffalt, stallPuffalt, puffAcc } from '../src/games/sapbubblor/sapvind.js'

// ── spelets tal (index.js) ──────────────────────────────────────────────────────────────────────
const GUST_SPEED = 620, GUST_FORCE = 2500, GUST_R0 = 84, GUST_GROW = 120, GUST_LIFE = 0.9
const VX_DRAG = 0.93, VX_MAX = 470, WY_MAX = 330
const FAN = { x: 96, y: 720 - 108 }

let fel = 0
const ok = (namn, v, d = '') => {
  console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`)
  if (!v) fel++
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const median = (a) => {
  const s = [...a].sort((x, y) => x - y)
  return s.length ? s[s.length >> 1] : NaN
}

// Ett blås från fläkten mot (ax, ay) — samma siktregler som `_blow`: aldrig rakt ner.
function blas(ax, ay) {
  let dx = ax - FAN.x
  let dy = ay - FAN.y
  if (dy > -40) dy = -40
  const a = Math.atan2(dy, dx)
  const ux = Math.cos(a), uy = Math.sin(a)
  return { x: FAN.x + ux * 92, y: FAN.y + uy * 92, dx: ux, dy: uy, r: GUST_R0, life: GUST_LIFE }
}

// Simulera EN bubbla. `arm`: 'ingen' | 'gammal' | 'ny'. Returnerar slutläge, högsta fart och minsta wy.
function sim(arm, aim, b0, { dt = 1 / 60, T = 2 } = {}) {
  const mass = (b0.r * b0.r) / (48 * 48)
  const gu = aim && arm !== 'ingen' ? blas(...aim) : null
  const falt = gu && arm === 'ny' ? nyPuffalt(gu) : null
  const b = { x: b0.x, y: b0.y, vx: 0, wy: 0, vy: b0.vy ?? 30 }
  const dtF = dt * 60
  let maxVx = 0, maxWy = -1e9, minWy = 1e9, nan = false
  for (let t = 0; t < T - 1e-9; t += dt) {
    if (gu && gu.life > 0) {
      gu.life -= dt
      gu.x += gu.dx * GUST_SPEED * dt
      gu.y += gu.dy * GUST_SPEED * dt
      gu.r = GUST_R0 + GUST_GROW * (GUST_LIFE - gu.life)
      if (falt) stallPuffalt(falt, gu, gu.life / GUST_LIFE)
    }
    if (gu && gu.life > 0) {
      if (arm === 'gammal') {
        const d = Math.hypot(b.x - gu.x, b.y - gu.y)
        if (d <= gu.r) {
          const f = (GUST_FORCE * (1 - d / gu.r) * (Math.max(0, gu.life) / GUST_LIFE)) / mass
          b.vx += gu.dx * f * dt
          b.wy += gu.dy * f * dt
        }
      } else if (arm === 'ny') {
        const a = puffAcc(falt, b.x, b.y, b.vx, b.wy, mass, dt)
        if (a) {
          b.vx += a.ax * dt
          b.wy += a.ay * dt
        }
      }
    }
    b.vx = clamp(b.vx * Math.pow(VX_DRAG, dtF), -VX_MAX, VX_MAX)
    b.wy = clamp(b.wy * Math.pow(VX_DRAG, dtF), -WY_MAX, WY_MAX)
    b.y += (b.wy - b.vy) * dt
    b.x += b.vx * dt
    if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) nan = true
    maxVx = Math.max(maxVx, Math.abs(b.vx))
    maxWy = Math.max(maxWy, b.wy)
    minWy = Math.min(minWy, b.wy)
  }
  falt?.destroy()
  return { x: b.x, y: b.y, maxVx, maxWy, minWy, nan }
}

const SIKTEN = [[640, 300], [400, 200], [900, 150]]
const RADIER = [24, 40, 60, 88] // barnbubbla · vanlig · stor · jätte
const GRID = []
for (let x = 40; x <= 1240; x += 40) for (let y = 40; y <= 680; y += 40) GRID.push({ x, y })

// Vindens förflyttning = slutläge minus kontrollarmens (ingen puff) slutläge.
const forflytt = (arm, aim, p, r, opt) => {
  const k = sim('ingen', null, { ...p, r }, opt)
  const m = sim(arm, aim, { ...p, r }, opt)
  return { dx: m.x - k.x, dy: m.y - k.y, d: Math.hypot(m.x - k.x, m.y - k.y), res: m }
}

console.log('SÅPBUBBLOR — puff-fältet (sapvind.js) mot HEAD:s runda puff, spelets egen rörelseloop\n')

// 0 + 1: kontroller
{
  console.log('══ kontrollarmar')
  const a = forflytt('ingen', SIKTEN[0], { x: 400, y: 400 }, 40)
  ok('0  utan puff: ingen vindförflyttning', a.d < 1e-9, `${a.d.toFixed(6)} px`)
  // en bubbla en bit framför fläkten, rakt i siktlinjen
  const aim = SIKTEN[0]
  const u = Math.atan2(aim[1] - FAN.y, aim[0] - FAN.x)
  const pos = { x: FAN.x + Math.cos(u) * 330, y: FAN.y + Math.sin(u) * 330 }
  const dLat = forflytt('gammal', aim, pos, 24).d
  const dJat = forflytt('gammal', aim, pos, 88).d
  ok('1a gamla puffen: barnbubblan flyttas längre än jätten', dLat > 2 * dJat && dJat > 5, `${dLat.toFixed(0)} px mot ${dJat.toFixed(0)} px`)
  const dBort = forflytt('gammal', aim, { x: 1200, y: 60 }, 24).d
  ok('1b gamla puffen: en bubbla långt utanför flyttas inte', dBort < 1, `${dBort.toFixed(2)} px`)
  const nLat = forflytt('ny', aim, pos, 24).d
  const nJat = forflytt('ny', aim, pos, 88).d
  ok('1c NYA fältet: barnbubblan flyttas längre än jätten (lätt följer med, tung släpar)', nLat > 2 * nJat && nJat > 5, `${nLat.toFixed(0)} px mot ${nJat.toFixed(0)} px`)
  const nBort = forflytt('ny', aim, { x: 1200, y: 60 }, 24).d
  ok('1d NYA fältet: en bubbla långt utanför flyttas inte', nBort < 1, `${nBort.toFixed(2)} px`)
}

// 2–5: rutnätet
console.log('\n══ rutnät 40 px × 3 sikten × 4 storlekar — vindens förflyttning, gammal mot ny')
const alla = { g: [], n: [] }
let nedat = 0
let hogstVx = 0
let hogstWy = 0
let nanN = 0
for (const r of RADIER) {
  let reachG = 0, reachN = 0, tot = 0
  const kvot = []
  const gg = [], nn = []
  for (const aim of SIKTEN) {
    for (const p of GRID) {
      const g = forflytt('gammal', aim, p, r)
      const n = forflytt('ny', aim, p, r)
      tot++
      if (g.d >= 30) reachG++
      if (n.d >= 30) reachN++
      if (g.d >= 30) kvot.push(n.d / g.d)
      gg.push(g.d)
      nn.push(n.d)
      if (n.dy > 1.5) nedat++ // vinden lade bubblan LÄGRE än kontrollarmen
      hogstVx = Math.max(hogstVx, n.res.maxVx)
      hogstWy = Math.max(hogstWy, n.res.maxWy)
      if (n.res.nan) nanN++
    }
  }
  alla.g.push(...gg)
  alla.n.push(...nn)
  const m = median(kvot)
  console.log(`  r ${String(r).padStart(2)} (massa ${((r * r) / 2304).toFixed(2)}): bubblor som flyttas ≥ 30 px — gammal ${reachG}/${tot} · ny ${reachN}/${tot}  (${((reachN / Math.max(1, reachG)) * 100).toFixed(0)} %) · median ny/gammal ${m.toFixed(2)}`)
  ok(`2  r ${r}: REACH ny ≥ 80 % och ≤ 125 % av gammal`, reachN >= 0.8 * reachG && reachN <= 1.25 * reachG, `${reachN} mot ${reachG}`)
  if (reachG === 0) {
    // jätten: ingen bubbla flyttas ≥ 30 px av gamla puffen — jämför då största förflyttningen (knappt alls i båda)
    const maxG = Math.max(...gg), maxN = Math.max(...nn)
    ok(`3  r ${r}: JÄTTEN flyttas knappt av någon av dem (största förflyttning ≤ 30 px)`, maxG < 30 && maxN < 30, `gammal ${maxG.toFixed(1)} px · ny ${maxN.toFixed(1)} px`)
  } else {
    ok(`3  r ${r}: STYRKA median ny/gammal 0,75–1,25`, m >= 0.75 && m <= 1.25, m.toFixed(2))
  }
}
{
  // Pearson
  const n = alla.g.length
  const mg = alla.g.reduce((a, b) => a + b, 0) / n
  const mn = alla.n.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) {
    sxy += (alla.g[i] - mg) * (alla.n[i] - mn)
    sxx += (alla.g[i] - mg) ** 2
    syy += (alla.n[i] - mn) ** 2
  }
  const rho = sxy / Math.sqrt(sxx * syy)
  ok('4  FORM: korrelationen gammal–ny över hela rutnätet ≥ 0,9', rho >= 0.9, `r = ${rho.toFixed(3)} över ${n} prov`)
}
ok('5a P0: vinden blåser aldrig en bubbla NEDÅT (lägre än utan vind)', nedat === 0, `${nedat} fall`)
ok('5b fartaken håller (sidled ≤ 470, lodrätt ≤ 330) och inget NaN', hogstVx <= VX_MAX + 1e-6 && hogstWy <= WY_MAX + 1e-6 && nanN === 0, `max ${hogstVx.toFixed(1)} / ${hogstWy.toFixed(1)} · NaN ${nanN}`)

// 5c: längsta vindförflyttning (P0 "inget blåses ur bild" — hur långt kan ETT blås flytta en bubbla?)
{
  let max = { d: 0 }
  for (const r of RADIER) for (const aim of SIKTEN) for (const p of GRID) {
    const n = forflytt('ny', aim, p, r)
    if (n.d > max.d) max = { d: n.d, r, aim, p }
  }
  const g = { d: 0 }
  for (const r of RADIER) for (const aim of SIKTEN) for (const p of GRID) {
    const x = forflytt('gammal', aim, p, r)
    if (x.d > g.d) g.d = x.d
  }
  console.log(`  längsta förflyttning av ETT blås på 2 s: ny ${max.d.toFixed(0)} px (r ${max.r}, sikte ${max.aim}) · gammal ${g.d.toFixed(0)} px`)
  ok('5c ett blås flyttar aldrig en bubbla längre än gamla puffen + 25 %', max.d <= g.d * 1.25, `${max.d.toFixed(0)} ≤ ${(g.d * 1.25).toFixed(0)}`)
}

// 5d: fältet är tomt när puffen är slut / efter destroy
{
  const gu = blas(...SIKTEN[0])
  const falt = nyPuffalt(gu)
  const mitt = { x: gu.x + gu.dx * 20, y: gu.y + gu.dy * 20 }
  const levande = puffAcc(falt, mitt.x, mitt.y, 0, 0, 1, 1 / 60)
  stallPuffalt(falt, gu, 0)
  const slut = puffAcc(falt, mitt.x, mitt.y, 0, 0, 1, 1 / 60)
  stallPuffalt(falt, gu, 1)
  falt.destroy()
  const dod = puffAcc(falt, mitt.x, mitt.y, 0, 0, 1, 1 / 60)
  ok('5d fältet: levande puff ger acceleration, slut puff (liv 0) och destroy() ger ingen', !!levande && !slut && !dod, `levande ax ${levande?.ax.toFixed(0)} ay ${levande?.ay.toFixed(0)}`)
  ok('7  EXIT: puffAcc på ett förstört fält är ett no-op (null, inget kast)', dod === null)
}

// 6: takt
{
  console.log('\n══ takt — samma blås vid 20 / 30 / 60 fps')
  const aim = SIKTEN[0]
  const u = Math.atan2(aim[1] - FAN.y, aim[0] - FAN.x)
  for (const r of [24, 40, 88]) {
    const pos = { x: FAN.x + Math.cos(u) * 300, y: FAN.y + Math.sin(u) * 300 }
    const d = (arm, dt) => forflytt(arm, aim, pos, r, { dt }).d
    const g60 = d('gammal', 1 / 60), g30 = d('gammal', 1 / 30), n60 = d('ny', 1 / 60), n30 = d('ny', 1 / 30), n20 = d('ny', 1 / 20)
    console.log(`  r ${r}: ny 60 fps ${n60.toFixed(1)} px · 30 fps ${n30.toFixed(1)} · 20 fps ${n20.toFixed(1)}   (gammal 60 fps ${g60.toFixed(1)} · 30 fps ${g30.toFixed(1)})`)
    ok(`6  r ${r}: ny 30 fps inom 12 % (eller 5 px) av ny 60 fps`, Math.abs(n30 - n60) <= Math.max(0.12 * n60, 5), `${n30.toFixed(1)} mot ${n60.toFixed(1)}`)
  }
}

console.log(fel ? `\n${fel} FEL` : '\nalla mått gröna')
process.exit(fel ? 1 : 0)
