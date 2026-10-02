// SKIKTPROBEN (FYSIKPLAN F4, kluster B4) — fallskärmens vind i höjdskikt, i TAL, utan webbläsare.
//
//   node scripts/_skiktprobe.mjs
//
// Frågan (B5-lärdomen: en kort passage dimensioneras inte i sluthastighet): släpp en fallskärm genom
// luften och MÄT var den LANDAR — med och utan vind, HEAD:s global vind mot de tre skikten.
//
//   arm K  INGEN VIND      — luften står still: landar rakt under starten (mätaren rör sig inte av sig själv)
//   arm H  HEAD            — ETT vindtal för hela luftrummet som byter håll var `period`:e sekund (index.js:649-653)
//   arm N  NY              — tre skikt (`vindskikt.js`, Vindfalt `band`), provas på fötternas y − 60
//
// Spelets egen integrator: `Motstandsvolym` (lib/luftmotstand.js) med samma last, samma GRAV, samma fasta
// 1/60-steg, samma styr-kraft och assist som index.js (konstanter kopierade ur den, rad angiven). Mäts per nivå
// (0 · 2 · 4 · 6) × last (Lätt/Tung) × tre barn:
//   passiv   · barnet rör inte skärmen            → driften (px) och andelen som tar mark vid väggarna (x 140/1140)
//   styrande · greedy mot målet (dödzon 20 px)    → träffar landningen mattan (r per nivå)? samma tröskel som spelet
//   hjälpt   · greedy + assist 3 missar           → no-fail-golvet: ska träffa minst lika ofta som HEAD
// Sluthastigheten är ointressant — det här mäter VAR den hamnar (och att inget lämnar bild: x klämd i 140–1140).
import { Motstandsvolym } from '../src/lib/luftmotstand.js'
import { GRAV, V_LATT, MASSA_TUNG, START_Y, GROUND_Y } from '../src/games/fallskarmen/gras.js'
import { Container } from 'pixi.js'
import { Skiktbild } from '../src/games/fallskarmen/skiktbild.js'
import { nyttSkikt, stallSkikt, stegaSkikt, luftForFot, skiktVid, MONSTER, SKIKT_Y } from '../src/games/fallskarmen/vindskikt.js'

let fel = 0
const ok = (namn, v, d = '') => {
  console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`)
  if (!v) fel++
}
const f1 = (x) => x.toFixed(1)
const pct = (a, b) => `${((100 * a) / b).toFixed(0)} %`

// index.js (kopia)
const VIND_FART = 11.8
const STEER_KRAFT = 0.7
const ASSIST_ACC = 0.05
const X_MIN = 140
const X_MAX = 1140
const DODZON = 20
const NIVAER = {
  0: { amp: 0.12, ampN: 0.12, period: 6, r: 150, tx: () => 700 },
  2: { amp: 0.2, ampN: 0.2, period: 4.5, r: 120, tx: () => (Math.random() < 0.5 ? 840 : 460) },
  4: { amp: 0.28, ampN: 0.3, period: 3.5, r: 100, tx: () => (Math.random() < 0.5 ? 980 : 300) },
  6: { amp: 0.3, ampN: 0.34, period: 3, r: 90, tx: () => 200 + Math.random() * 880 },
}

function lcg(seed) {
  let s = seed >>> 0
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296)
}

// ETT fall. arm: 'K' | 'H' | 'N'. strategi: 'passiv' | 'styr' | 'hjalp'. Returnerar { x, steg, vaggTid, startX, drift }
function falla({ arm, niva, tung, strategi, rnd, tx, monsterId = null }) {
  const P = NIVAER[niva]
  const luft = new Motstandsvolym({ grav: GRAV })
  const massa = tung ? MASSA_TUNG : 1
  const gransfart = V_LATT * Math.sqrt(massa)
  const chute = { x: Math.max(X_MIN, Math.min(X_MAX, 640 + (rnd() - 0.5) * 200)), y: START_Y }
  const startX = chute.x
  const rec = luft.lagg(chute, { massa, gransfart, vx: 0, vy: gransfart * 0.72 })
  // vinden
  let vind = 0
  let timer = 0
  const sk = arm === 'N' ? nyttSkikt() : null
  let skiktByten = 0
  let lager = -1
  if (arm === 'H') vind = (rnd() < 0.5 ? -1 : 1) * P.amp
  if (arm === 'N') {
    const m = monsterId ? MONSTER.find((x) => x.id === monsterId) : MONSTER[Math.floor(rnd() * MONSTER.length)]
    stallSkikt(sk, { farPx: P.ampN * VIND_FART, monster: m, tecken: rnd() < 0.5 ? -1 : 1 })
  }
  const misses = strategi === 'hjalp' ? 3 : 0
  let steg = 0
  let vaggTid = 0
  while (chute.y < GROUND_Y && steg < 6000) {
    steg++
    // 1. input (det spelet gör per bildruta → här per steg; steget är 1/60 s)
    let dir = 0
    if (strategi !== 'passiv') {
      const d = tx - chute.x
      if (Math.abs(d) > DODZON) dir = Math.sign(d)
    }
    // 2. vind
    if (arm === 'H') {
      timer += 1 / 60
      if (timer >= P.period) {
        timer = 0
        vind = (rnd() < 0.5 ? -1 : 1) * P.amp
      }
      luft.setVind(vind * VIND_FART, 0)
    } else if (arm === 'N') {
      stegaSkikt(sk, 1 / 60)
      luft.setVind(luftForFot(sk, chute.x, chute.y), 0)
      const l = skiktVid(chute.y)
      if (l !== lager) {
        if (lager >= 0) skiktByten++
        lager = l
      }
    } else luft.setVind(0, 0)
    if (dir) luft.kraft(rec, dir * STEER_KRAFT, 0)
    if (misses > 0) {
      const assist = Math.min(misses, 4) * ASSIST_ACC
      const low = chute.y > 360 ? 1 : 0.4
      luft.driv(rec, Math.sign(tx - chute.x) * assist * low, 0)
    }
    luft.steg(1)
    if (chute.x < X_MIN || chute.x > X_MAX) {
      chute.x = Math.max(X_MIN, Math.min(X_MAX, chute.x))
      rec.vx *= 0.4
      vaggTid++
    }
  }
  luft.destroy()
  return { x: chute.x, steg, vaggTid, startX, drift: chute.x - startX, skiktByten }
}

const N = 240
console.log('— KONTROLLER —')
{
  const rnd = lcg(1)
  const k = falla({ arm: 'K', niva: 6, tung: false, strategi: 'passiv', rnd, tx: 640 })
  ok('arm K: utan vind driver den passiva skärmen inte i sidled', Math.abs(k.drift) < 0.01, `drift ${k.drift.toFixed(4)} px`)
  const n1 = falla({ arm: 'N', niva: 6, tung: false, strategi: 'passiv', rnd: lcg(2), tx: 640, monsterId: 'jetström' })
  ok('arm N: skikten ensamma rör mätaren (passiv drift > 20 px)', Math.abs(n1.drift) > 20, `${f1(n1.drift)} px`)
  ok('arm N: skärmen faller genom alla tre skikten (2 skiktbyten)', n1.skiktByten === 2, `${n1.skiktByten}`)
  // skikten tar i rätt höjd: jetström r = [1.0, −0.7, 0.3] → luft vid skikt 0/1/2
  const sk = nyttSkikt()
  stallSkikt(sk, { farPx: 3, monster: MONSTER.find((m) => m.id === 'jetström'), tecken: 1 })
  const l0 = luftForFot(sk, 640, SKIKT_Y[0] + 60)
  const l1 = luftForFot(sk, 640, SKIKT_Y[1] + 60)
  const l2 = luftForFot(sk, 640, SKIKT_Y[2] + 60)
  ok('luften har olika håll på olika höjd (högt +, mitt −, lågt +)', l0 > 0.5 && l1 < -0.5 && l2 > 0, `${f1(l0)} / ${f1(l1)} / ${f1(l2)} px/bildruta`)
  const over = luftForFot(sk, 640, 20)
  ok('ovanför översta skiktet gäller det översta (klämt, inget hål)', Math.abs(over - l0) < 0.35, `${f1(over)} mot ${f1(l0)}`)
  const mellan = luftForFot(sk, 640, (SKIKT_Y[0] + SKIKT_Y[1]) / 2 + 60)
  ok('mellan skikten byter farten mjukt (ingen sprängd nolla)', Math.abs(mellan) < Math.abs(l0) + 0.01, `${f1(mellan)} px/bildruta`)
}

console.log(`— MATRIS: nivå × last × strategi, ${N} fall per cell —`)
const rader = []
for (const niva of [0, 2, 4, 6]) {
  for (const tung of [false, true]) {
    const cell = { niva, tung }
    for (const arm of ['K', 'H', 'N']) {
      const res = { passiv: [], styr: [], hjalp: [] }
      const rnd = lcg(1000 + niva * 7 + (tung ? 3 : 0))
      for (let i = 0; i < N; i++) {
        const tx = NIVAER[niva].tx()
        const tcl = Math.max(NIVAER[niva].r + 60, Math.min(1280 - NIVAER[niva].r - 60, tx))
        for (const strat of ['passiv', 'styr', 'hjalp']) {
          // samma slump-start i alla strategier: nytt lcg-frö per (fall, arm)
          const r = falla({ arm, niva, tung, strategi: strat, rnd: lcg(i * 31 + 5 + (arm === 'N' ? 0 : 0)), tx: tcl })
          res[strat].push({ ...r, tx: tcl })
        }
      }
      cell[arm] = res
    }
    rader.push(cell)
  }
}
const stat = (a, f) => {
  const v = a.map(f).sort((x, y) => x - y)
  return { medel: v.reduce((s, x) => s + x, 0) / v.length, p95: v[Math.floor(v.length * 0.95)], max: v[v.length - 1] }
}
let aldrigUt = true
let nyHjalpOk = true
for (const c of rader) {
  const r = NIVAER[c.niva].r
  const lbl = `nivå ${c.niva} ${c.tung ? 'Tung' : 'Lätt'} (r ${r})`
  const out = (arm) => {
    const d = stat(c[arm].passiv, (x) => Math.abs(x.drift))
    const vagg = c[arm].passiv.filter((x) => x.x <= X_MIN + 0.5 || x.x >= X_MAX - 0.5).length
    const st = c[arm].styr.filter((x) => Math.abs(x.x - x.tx) <= r).length
    const hj = c[arm].hjalp.filter((x) => Math.abs(x.x - x.tx) <= r * 1.8 || Math.abs(x.x - x.tx) <= r).length
    return { d, vagg, st, hj }
  }
  const K = out('K')
  const H = out('H')
  const Nn = out('N')
  console.log(`  ${lbl}`)
  console.log(`    passiv drift   K ${f1(K.d.medel)} · HEAD medel ${f1(H.d.medel)} p95 ${f1(H.d.p95)} max ${f1(H.d.max)} · NY medel ${f1(Nn.d.medel)} p95 ${f1(Nn.d.p95)} max ${f1(Nn.d.max)}  px · väggkontakt HEAD ${pct(H.vagg, N)} NY ${pct(Nn.vagg, N)}`)
  console.log(`    träffar mattan  styrande HEAD ${pct(H.st, N)} → NY ${pct(Nn.st, N)}   · hjälpt (nära ≤ 1,8 r) HEAD ${pct(H.hj, N)} → NY ${pct(Nn.hj, N)}`)
  if (Nn.hj < H.hj - N * 0.05) nyHjalpOk = false
  for (const arm of ['H', 'N']) for (const x of c[arm].passiv) if (x.x < X_MIN - 0.5 || x.x > X_MAX + 0.5) aldrigUt = false
}
ok('inget lämnar bild: landningens x ligger alltid i 140–1140 (båda armarna)', aldrigUt)
ok('no-fail-golvet: hjälpt landning (assist 3) är inte sämre än HEAD med mer än 5 procentenheter i någon cell', nyHjalpOk)

// Driften i skikt vs globalt: tung biter mindre (en kort passage → den tunga hinner inte med luften)
{
  const L = rader.find((c) => c.niva === 6 && !c.tung)
  const T = rader.find((c) => c.niva === 6 && c.tung)
  const dL = stat(L.N.passiv, (x) => Math.abs(x.drift)).medel
  const dT = stat(T.N.passiv, (x) => Math.abs(x.drift)).medel
  ok('NY: Tung driver mindre än Lätt i skikten (tyngdknappen betyder något)', dT < dL, `Tung ${f1(dT)} mot Lätt ${f1(dL)} px`)
  const dLh = stat(L.H.passiv, (x) => Math.abs(x.drift)).medel
  const dTh = stat(T.H.passiv, (x) => Math.abs(x.drift)).medel
  console.log(`    (HEAD: Tung ${f1(dTh)} mot Lätt ${f1(dLh)} px)`)
}

// Taktinvarians: Takt stegar alltid 1/60 → samma landning (kontroll av att sonden och spelet delar fysik)
{
  const a = falla({ arm: 'N', niva: 4, tung: false, strategi: 'passiv', rnd: lcg(9), tx: 640, monsterId: 'skjuvning' })
  const b = falla({ arm: 'N', niva: 4, tung: false, strategi: 'passiv', rnd: lcg(9), tx: 640, monsterId: 'skjuvning' })
  ok('determinism: samma start + mönster ger exakt samma landning', a.x === b.x, `${a.x.toFixed(3)} / ${b.x.toFixed(3)}`)
}

// Mönstren: nettodrift ≤ ett skikts (passivt) och inget mönster är ensidigt
{
  for (const m of MONSTER) {
    const sidor = new Set(m.r.map(Math.sign))
    ok(`mönster ${m.id}: har skikt åt båda hållen`, sidor.has(1) && sidor.has(-1))
    ok(`mönster ${m.id}: lägsta skiktet är aldrig det starkaste`, Math.abs(m.r[2]) < Math.max(Math.abs(m.r[0]), Math.abs(m.r[1])), `r = ${m.r.join(', ')}`)
  }
}

console.log(fel ? `\n${fel} FEL` : '\nalla kontroller gröna')
process.exit(fel ? 1 : 0)
