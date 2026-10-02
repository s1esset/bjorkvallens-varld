// Mäter lib/ytvag.js i TAL — utan webbläsare (som _flytprobe).
//
//   node scripts/_ytvagprobe.mjs
//
// Två delar:
//  A. PORTEKVIVALENS — de två handbyggda fälten (pruttbad `_waveStep/_waveDent/_wavePoke/…` och
//     grodan-slurp/dammen `_vagSteg/_vagStot/_vagVid`) ligger här som KONTROLLARMAR, kopierade
//     rad för rad ur koden FÖRE porten. Samma stötar/dellar matas i båda; höjderna jämförs steg
//     för steg över 900 steg. Max avvikelse ska vara ~1e-6 (Float32-avrundning), inte mer.
//  B. MINNETS FYRA FÄLLOR som armar — och varje fälla har en KONTROLLARM med känt utslag (den
//     felaktiga modellen återskapad) så att vi ser att talet RÖR SIG innan vi litar på det.
//     ⚠️ Lång våglängd klingar av på ~6 s: väntetiderna här är 10 s, inte 4.
import { Ytvag } from '../src/lib/ytvag.js'

const klamp = (v, a, b) => Math.max(a, Math.min(b, v))
const FRAME = 1000 / 60
let fel = 0
function ok(namn, villkor, detalj = '') {
  if (villkor) console.log(`  ✓ ${namn}${detalj ? ' · ' + detalj : ''}`)
  else {
    console.log(`  ✗ ${namn}${detalj ? ' · ' + detalj : ''}`)
    fel++
  }
}
const maxDiff = (a, b) => {
  let m = 0
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]))
  return m
}

// =====================================================================================
// KONTROLLARM A — pruttbad/index.js FÖRE porten (rad för rad)
const IN_L = 194
const IN_R = 1086
const WAVE_N = 41
const WAVE_K = 0.021
const WAVE_DAMP = 0.972
const WAVE_SPREAD = 0.08
const WAVE_MAX = 20
const WAVE_REST = 0.25
const PLUG_X = 330 // värdet spelar ingen roll för jämförelsen, bara att det ligger inne i karet

class GammalPrutt {
  constructor() {
    this._wave = new Float32Array(WAVE_N)
    this._waveV = new Float32Array(WAVE_N)
    this._waveRest = new Float32Array(WAVE_N)
    this._waveRestPrev = new Float32Array(WAVE_N)
    this._waveAcc = 0
    this._waveOn = false
    this.anka = null // { x, dopp } eller null (ersätter this._duck / _duckBase / _floatY)
  }

  _updateWave(dt) {
    this._waveAcc += dt
    let n = 0
    while (this._waveAcc >= 1 && n < 4) {
      this._waveAcc -= 1
      this._waveStep()
      n++
    }
    let maxH = 0
    let maxV = 0
    for (let i = 0; i < WAVE_N; i++) {
      maxH = Math.max(maxH, Math.abs(this._wave[i] + this._waveRest[i]))
      maxV = Math.max(maxV, Math.abs(this._waveV[i]))
    }
    this._waveOn = maxH > WAVE_REST
    if (maxV > 0.02) {
      this._waveDirty = true
      return true
    }
    if (this._waveDirty) {
      this._waveDirty = false
      return true
    }
    return false
  }

  _waveDent() {
    const rest = this._waveRest
    const v = this._waveV
    for (let i = 0; i < WAVE_N; i++) this._waveRestPrev[i] = rest[i]
    rest.fill(0)
    if (this.anka) {
      const dopp = this.anka.dopp
      const djup = 2.2 + dopp * 0.075
      const t = klamp((this.anka.x - IN_L) / (IN_R - IN_L), 0, 1) * (WAVE_N - 1)
      const c = Math.round(t)
      for (let k = -2; k <= 2; k++) {
        const i = c + k
        if (i < 0 || i >= WAVE_N) continue
        rest[i] = djup * (1 - Math.abs(k) / 3)
      }
    }
    for (let i = 0; i < WAVE_N; i++) v[i] += (rest[i] - this._waveRestPrev[i]) * 0.9
  }

  _waveStep() {
    const h = this._wave
    const v = this._waveV
    this._waveDent()
    for (let i = 0; i < WAVE_N; i++) v[i] -= WAVE_K * h[i]
    for (let i = 0; i < WAVE_N; i++) {
      const l = h[i > 0 ? i - 1 : 0]
      const r = h[i < WAVE_N - 1 ? i + 1 : WAVE_N - 1]
      v[i] += WAVE_SPREAD * (l + r - 2 * h[i])
    }
    for (let i = 0; i < WAVE_N; i++) {
      v[i] *= WAVE_DAMP
      h[i] = klamp(h[i] + v[i], -WAVE_MAX, WAVE_MAX)
    }
  }

  _wavePoke(x, kraft) {
    const t = (x - IN_L) / (IN_R - IN_L)
    const i = klamp(Math.round(t * (WAVE_N - 1)), 0, WAVE_N - 1)
    this._waveV[i] += kraft
    if (i > 0) this._waveV[i - 1] += kraft * 0.55
    if (i < WAVE_N - 1) this._waveV[i + 1] += kraft * 0.55
    this._waveOn = true
  }

  _waveAt(x) {
    if (!this._waveOn) return 0
    const t = klamp((x - IN_L) / (IN_R - IN_L), 0, 1) * (WAVE_N - 1)
    const i = Math.floor(t)
    const j = Math.min(WAVE_N - 1, i + 1)
    const f = t - i
    const a = this._wave[i] + this._waveRest[i]
    const b = this._wave[j] + this._waveRest[j]
    return a + (b - a) * f
  }

  _waveOnlyAt(x) {
    if (!this._waveOn) return 0
    const t = klamp((x - IN_L) / (IN_R - IN_L), 0, 1) * (WAVE_N - 1)
    const i = Math.floor(t)
    const j = Math.min(WAVE_N - 1, i + 1)
    const f = t - i
    return this._wave[i] + (this._wave[j] - this._wave[i]) * f
  }
}

// Så här bygger pruttbad sin Ytvag efter porten (samma tal som i spelet).
const nyPrutt = () =>
  new Ytvag({ n: WAVE_N, x0: IN_L, x1: IN_R, sprid: WAVE_SPREAD, k: WAVE_K, damp: WAVE_DAMP, max: WAVE_MAX, stotProfil: [1, 0.55], stotKlamma: true, vilaTrosk: WAVE_REST })
// pruttbads `_waveDent` efter porten: en deklaration per bildruta
const deklarera = (y, anka) => {
  if (!anka) return
  y.vila(anka.x, 2.2 + anka.dopp * 0.075, 3 * y.dx)
}

// =====================================================================================
// KONTROLLARM B — grodan-slurp/dammen.js FÖRE porten (rad för rad)
const VAG_X0 = -240
const VAG_DX = 20
const VAG_K = 0.01
const VAG_SPRID = 0.14
const VAG_DAMP = 0.975
const VAG_MAX = 22

class GammalDamm {
  constructor(VW = 1280, BLEED = 240) {
    this._vagN = Math.round((VW + 2 * BLEED) / VAG_DX) + 1
    this._vag = new Float32Array(this._vagN)
    this._vagV = new Float32Array(this._vagN)
    this._vagA = new Float32Array(this._vagN)
    this._vagAcc = 0
  }

  _vagSteg(dt) {
    this._vagAcc += dt * 60
    const h = this._vag
    const v = this._vagV
    const a = this._vagA
    let n = 0
    while (this._vagAcc >= 1 && n < 4) {
      this._vagAcc -= 1
      n++
      const N = this._vagN
      for (let i = 0; i < N; i++) {
        const l = h[i > 0 ? i - 1 : 0]
        const r = h[i < N - 1 ? i + 1 : N - 1]
        a[i] = VAG_SPRID * (l + r - 2 * h[i]) - VAG_K * h[i]
      }
      for (let i = 0; i < N; i++) {
        v[i] = (v[i] + a[i]) * VAG_DAMP
        h[i] = klamp(h[i] + v[i], -VAG_MAX, VAG_MAX)
      }
    }
    if (n >= 4) this._vagAcc = 0
  }

  _vagStot(x, kraft) {
    const i = Math.round((x - VAG_X0) / VAG_DX)
    const v = this._vagV
    const add = (j, k) => {
      if (j >= 0 && j < this._vagN) v[j] += k
    }
    add(i, kraft)
    add(i - 1, kraft * 0.6)
    add(i + 1, kraft * 0.6)
    add(i - 2, kraft * 0.25)
    add(i + 2, kraft * 0.25)
  }

  _vagVid(x) {
    const t = klamp((x - VAG_X0) / VAG_DX, 0, this._vagN - 1)
    const i = Math.floor(t)
    const j = Math.min(this._vagN - 1, i + 1)
    const f = t - i
    return this._vag[i] * (1 - f) + this._vag[j] * f
  }
}

// Så här bygger dammen sin Ytvag efter porten.
const nyDamm = (VW = 1280, BLEED = 240) => {
  const n = Math.round((VW + 2 * BLEED) / VAG_DX) + 1
  return new Ytvag({ n, x0: VAG_X0, x1: VAG_X0 + (n - 1) * VAG_DX, sprid: VAG_SPRID, k: VAG_K, damp: VAG_DAMP, max: VAG_MAX })
}

// =====================================================================================
console.log('\nA1. kontrollarmen först: det gamla pruttbad-fältet RÖR SIG (annars mäter jämförelsen ingenting)')
{
  const g = new GammalPrutt()
  g._wavePoke(640, 2.2)
  let topp = 0
  for (let i = 0; i < 300; i++) {
    g._updateWave(1)
    topp = Math.max(topp, ...g._wave.map(Math.abs))
  }
  ok('en stöt ger en våg i gamla fältet', topp > 1, `topp ${topp.toFixed(2)} px`)
}

console.log('\nA2. portekvivalens pruttbad · 900 steg · stötar + dragen anka (samma insatser i båda)')
{
  const g = new GammalPrutt()
  const y = nyPrutt()
  let dH = 0
  let dV = 0
  let dR = 0
  let dHojd = 0
  let dAvv = 0
  let dRita = 0
  let ritaOmGammal = 0
  let ritaOmNy = 0
  let pa = 0
  let toppH = 0
  for (let f = 0; f < 900; f++) {
    // skriptade händelser — varje ändring görs i BÅDA armarna
    const stot = (x, k) => {
      g._wavePoke(x, k)
      y.stot(x, k)
    }
    if (f < 150) stot(1010, 0.12) // kranen (per bildruta)
    if (f >= 60 && f < 200) stot(PLUG_X, 0.06) // avloppet
    if (f === 220) stot(500, -1.2) // en bubbla poppar
    if (f === 330) stot(IN_L - 40, 2.2) // plask utanför kanten (klamp-fallet)
    if (f === 331) stot(IN_R + 55, 2.2)
    if (f === 520) stot(640, -0.9 - 60 * 0.035)
    // ankan: stilla vid 700 → dras vänster 100–170 → tryckt ner 300–340 → släpps → borta 600+
    let anka = null
    if (f < 600) {
      const x = f < 100 ? 700 : f < 170 ? 700 - (f - 100) * 6 : 280
      const dopp = f >= 300 && f < 340 ? Math.min(30, (f - 300) * 3) : f >= 340 && f < 360 ? Math.max(0, 30 - (f - 340) * 3) : 0
      anka = { x, dopp }
    }
    g.anka = anka
    deklarera(y, anka)
    ritaOmGammal += g._updateWave(1) ? 1 : 0
    ritaOmNy += y.uppdatera(FRAME) ? 1 : 0
    dH = Math.max(dH, maxDiff(g._wave, y.h))
    dV = Math.max(dV, maxDiff(g._waveV, y.v))
    dR = Math.max(dR, maxDiff(g._waveRest, y.rest))
    if (g._waveOn !== y.pa) pa++
    for (let x = 150; x <= 1130; x += 37) {
      dHojd = Math.max(dHojd, Math.abs(g._waveAt(x) - y.hojd(x)))
      dAvv = Math.max(dAvv, Math.abs(g._waveOnlyAt(x) - y.avvikelse(x)))
    }
    toppH = Math.max(toppH, ...y.h.map(Math.abs))
    dRita = Math.max(dRita, Math.abs(ritaOmGammal - ritaOmNy))
  }
  ok('avvikelsen h lika steg för steg', dH < 1e-4, `max Δ ${dH.toExponential(2)} px (toppen var ${toppH.toFixed(2)})`)
  ok('farten v lika', dV < 1e-4, `max Δ ${dV.toExponential(2)}`)
  ok('viloläget (ankans dell) lika', dR < 1e-5, `max Δ ${dR.toExponential(2)}`)
  ok('hojd(x) == _waveAt(x) över hela karet', dHojd < 1e-4, `max Δ ${dHojd.toExponential(2)} px`)
  ok('avvikelse(x) == _waveOnlyAt(x) (ankan läser fortfarande bara vågen)', dAvv < 1e-4, `max Δ ${dAvv.toExponential(2)} px`)
  ok('vilogrinden (_waveOn) lika varje bildruta', pa === 0, `${pa} bildrutor skiljer`)
  ok('omritningsgrinden lika', dRita <= 1, `omritningar gammal ${ritaOmGammal} · ny ${ritaOmNy} · största glapp ${dRita}`)
}
console.log('\nA3. portekvivalens dammen · 900 steg · stötar (inkl. utanför kanterna) + storVag-svall')
{
  const g = new GammalDamm()
  const y = nyDamm()
  ok('samma antal stödpunkter', g._vagN === y.n, `${g._vagN}`)
  let dH = 0
  let dVid = 0
  let toppH = 0
  for (let f = 0; f < 900; f++) {
    const stot = (x, k) => {
      g._vagStot(x, k)
      y.stot(x, k)
    }
    if (f === 10) stot(640, 2 + 7 * 0.8) // ett plask
    if (f === 90) stot(-250, 3) // utanför vänster kant
    if (f === 91) stot(1530, 3) // utanför höger kant
    if (f === 200) for (let i = 0; i < 9; i++) stot(1400 - (60 + i * 120), -3.5) // storVag
    if (f >= 300 && f < 420) stot(300 + (f - 300) * 4, -0.35) // en simmande groda: stöt per bildruta
    if (f === 500) {
      stot(500 - 0.45 * 90, 1 + 2.5 * 0.7)
      stot(500 + 0.45 * 90, 1 + 2.5 * 0.7)
    }
    g._vagSteg(1 / 60)
    y.uppdatera(FRAME)
    dH = Math.max(dH, maxDiff(g._vag, y.h))
    for (let x = -300; x <= 1560; x += 23) dVid = Math.max(dVid, Math.abs(g._vagVid(x) - y.hojd(x)))
    toppH = Math.max(toppH, ...y.h.map(Math.abs))
  }
  ok('höjdfältet h lika steg för steg', dH < 1e-4, `max Δ ${dH.toExponential(2)} px (toppen var ${toppH.toFixed(2)})`)
  ok('hojd(x) == _vagVid(x), även bortom kanterna (klampas)', dVid < 1e-4, `max Δ ${dVid.toExponential(2)} px`)
}

// =====================================================================================
console.log('\nB0. Takt: fast steg oavsett bildfrekvens (kontroll: antalet steg per bildruta)')
{
  const rakna = (frames) => {
    const y = nyDamm()
    let steg = 0
    const orig = y._steg.bind(y)
    y._steg = () => {
      steg++
      orig()
    }
    const per = []
    for (const d of frames) {
      const fore = steg
      y.uppdatera(d)
      per.push(steg - fore)
    }
    return { steg, per }
  }
  const sextio = rakna(Array.from({ length: 600 }, (_, i) => FRAME + (i % 2 ? 0.1 : -0.1)))
  ok('60 fps med vsync-jitter ±0,1 ms: exakt ett steg varje bildruta', sextio.per.every((n) => n === 1), `${sextio.steg} steg på 600 bildrutor`)
  const trettio = rakna(Array.from({ length: 300 }, () => 2 * FRAME))
  ok('30 fps: två steg per bildruta (samma tid → samma antal steg)', trettio.steg === 600, `${trettio.steg} steg på 300 bildrutor (10 s)`)
  const hopp = rakna([FRAME, 500, FRAME])
  ok('ett 500 ms-hopp (flikbyte) klampas — högst 4 steg, ingen spiral', Math.max(...hopp.per) <= 4, `steg per bildruta ${hopp.per}`)
}

console.log('\nB1. fälla 1 — en stöt per bildruta är en konstant kraft (kontrollarm: samma stöt som SKARP engångsstöt)')
{
  // pruttbads kran: 0,12 per bildruta i 120 bildrutor. Jämviktsutslaget ska vara några px (inte taket 20).
  const y = nyPrutt()
  let toppKran = 0
  for (let f = 0; f < 120; f++) {
    y.stot(1010, 0.12)
    y.uppdatera(FRAME)
    toppKran = Math.max(toppKran, ...y.h.map(Math.abs))
  }
  // Kontrollarm med KÄNT utslag: ovanstående insats ×36 (en naiv "ett halvt sekunds drag" med full styrka).
  const k = nyPrutt()
  let toppNaiv = 0
  for (let f = 0; f < 120; f++) {
    k.stot(1010, 0.12 * 36)
    k.uppdatera(FRAME)
    toppNaiv = Math.max(toppNaiv, ...k.h.map(Math.abs))
  }
  ok('kontrollarm: 36× insats når taket (talet RÖR SIG)', toppNaiv >= 19.5, `topp ${toppNaiv.toFixed(2)} px (tak ${WAVE_MAX})`)
  ok('spelets insats (0,12/bildruta) når inte taket', toppKran < 0.5 * WAVE_MAX, `topp ${toppKran.toFixed(2)} px`)
}

console.log('\nB2. fälla 2 — en dell är ett VILOLÄGE: ett halvt sekunds drag når inte taket, och allt blir stilla')
{
  const kor = (y, dellFn, frames) => {
    let topp = 0
    for (let f = 0; f < frames; f++) {
      dellFn(f)
      y.uppdatera(FRAME)
      topp = Math.max(topp, ...y.h.map(Math.abs))
    }
    return topp
  }
  // Ytvag: ankan har stått 2 s (dellen sitter), dras sedan 0,5 s (30 bildrutor × 2 px), hålls stilla.
  const y = nyPrutt()
  let x = 700
  kor(y, () => y.vila(x, 2.2, 3 * y.dx), 120)
  const topp = kor(
    y,
    (f) => {
      if (f < 30) x -= 2
      y.vila(x, 2.2, 3 * y.dx)
    },
    30,
  )
  ok('0,5 s drag (2 px/bildruta) når inte taket', topp < 0.25 * WAVE_MAX, `topp ${topp.toFixed(2)} px (tak ${WAVE_MAX})`)
  // Kontrollarm med känt utslag: samma drag modellerat som EN STÖT PER BILDRUTA (felaktig modell 1).
  const kraft = nyPrutt()
  const toppKraft = kor(kraft, () => kraft.stot(700, 2.2), 30)
  ok('kontrollarm: en stöt (2,2) per bildruta i 0,5 s pumpar mycket högre', toppKraft > 2 * topp, `stötmodell ${toppKraft.toFixed(2)} px mot dellmodell ${topp.toFixed(2)} px`)
  // INFO (ingen gräns): en dell som dras med VÅGENS EGEN FART (~6,2 px/steg) resonerar. Fanns redan
  // i det handbyggda fältet (portekvivalensen A2 bevisar att talen är desamma) — porten ärver det.
  const res = []
  for (const sp of [2, 6, 14]) {
    const r = nyPrutt()
    let rx = 700
    kor(r, () => r.vila(rx, 2.2, 3 * r.dx), 120)
    res.push(`${sp} px/steg → ${kor(r, (f) => { if (f < 30) rx -= sp; r.vila(rx, 2.2, 3 * r.dx) }, 30).toFixed(1)} px`)
  }
  console.log(`  · info: dragfart mot toppen (dell 2,2 px): ${res.join(' · ')}`)
  // ...och 10 s senare ligger ytan still med dellen kvar (viloläge ≠ rörelse).
  kor(y, () => y.vila(x, 2.2 + 25 * 0.075, 3 * y.dx), 600)
  const resthast = Math.max(...y.v.map(Math.abs))
  const restH = Math.max(...y.h.map(Math.abs))
  ok('resthastighet efter 10 s stillhet < 0,02 (gränsen för omritning)', resthast < 0.02, `max|v| ${resthast.toFixed(4)}`)
  ok('avvikelsen h har gått till (nästan) noll medan dellen ligger kvar', restH < 0.05 && Math.max(...y.rest) > 2, `max|h| ${restH.toFixed(4)} · dell ${Math.max(...y.rest).toFixed(2)} px`)
  ok('avvikelse() läser bara vågen — ankan sjunker inte i sin egen grop', Math.abs(y.avvikelse(x)) < 0.05 && Math.abs(y.hojd(x)) > 2, `avvikelse ${y.avvikelse(x).toFixed(3)} · hojd ${y.hojd(x).toFixed(2)}`)

  // KONTROLLARM med känt utslag: den gamla felaktiga modellen — dra h mot ett måldjup varje steg.
  const bad = new Ytvag({ n: WAVE_N, x0: IN_L, x1: IN_R, sprid: WAVE_SPREAD, k: WAVE_K, damp: WAVE_DAMP, max: WAVE_MAX })
  const c = Math.round(((x - IN_L) / (IN_R - IN_L)) * (WAVE_N - 1))
  for (let f = 0; f < 700; f++) {
    for (let q = -2; q <= 2; q++) bad.h[c + q] += (4 * (1 - Math.abs(q) / 3) - bad.h[c + q]) * 0.05
    bad.uppdatera(FRAME)
  }
  const badV = Math.max(...bad.v.map(Math.abs))
  ok('kontrollarm: måldjup-modellen (energikälla) rör sig fortfarande efter 10 s', badV > 0.1, `max|v| ${badV.toFixed(3)} (minnets 0,367)`)
}

console.log('\nB3. fälla 3 — dämpningen SIST (Nyquist-moden varannan stödpunkt upp/ner)')
{
  const nyq = (steg) => {
    const y = nyPrutt()
    for (let i = 0; i < y.n; i++) y.h[i] = i % 2 ? 1 : -1
    for (let s = 0; s < steg; s++) y.uppdatera(FRAME)
    return Math.max(...y.h.map(Math.abs))
  }
  // Kontrollarm: dämpningen FÖRE spridningen, två pass à 0,11 (minnets första version).
  const gammal = (steg) => {
    const N = WAVE_N
    const h = new Float32Array(N)
    const v = new Float32Array(N)
    for (let i = 0; i < N; i++) h[i] = i % 2 ? 1 : -1
    for (let s = 0; s < steg; s++) {
      for (let i = 0; i < N; i++) v[i] = (v[i] - WAVE_K * h[i]) * WAVE_DAMP
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < N; i++) {
          const l = h[i > 0 ? i - 1 : 0]
          const r = h[i < N - 1 ? i + 1 : N - 1]
          v[i] += 0.11 * (l + r - 2 * h[i])
        }
      }
      for (let i = 0; i < N; i++) h[i] += v[i]
    }
    return Math.max(...h.map(Math.abs))
  }
  // Rent Nyquist-mått: GRUNHETEN (största skillnaden mellan grannar) och farten, efter 8 s.
  const mattaNy = (opt, steg) => {
    const y = new Ytvag({ n: WAVE_N, x0: IN_L, x1: IN_R, sprid: WAVE_SPREAD, k: WAVE_K, damp: WAVE_DAMP, max: WAVE_MAX, ...opt })
    for (let i = 0; i < y.n; i++) y.h[i] = i % 2 ? 1 : -1
    for (let s = 0; s < steg; s++) y.uppdatera(FRAME)
    let grov = 0
    for (let i = 0; i < y.n - 1; i++) grov = Math.max(grov, Math.abs(y.h[i] - y.h[i + 1]))
    return { grov, v: Math.max(...Array.from(y.v, Math.abs)) }
  }
  const ny = mattaNy({}, 480)
  const odampad = mattaNy({ damp: 1 }, 480)
  ok('kontrollarm (annan känd fel): helt odämpat fält sitter kvar efter 8 s', odampad.grov > 0.5, `grovhet ${odampad.grov.toFixed(3)}`)
  ok('Nyquist-moden är död efter 8 s (grovhet < 0,01, fart < 0,005)', ny.grov < 0.01 && ny.v < 0.005, `grovhet ${ny.grov.toFixed(4)} · max|v| ${ny.v.toFixed(4)}`)
  const ga = gammal(240)
  console.log(`  · info: minnets damp-FÖRST × 2 pass återskapad = max|h| ${ga.toFixed(4)} efter 4 s mot ${nyq(240).toFixed(4)} här — återskapningen SKILJER INTE (alla varianter ligger på ~0,05–0,09 av det långa lägets rest); armen skyddar mot oförändrad dämpning, inte mot den historiska ordningen`)
}



console.log('\nB4. fälla 4 — omritningen styrs av RÖRELSE, inte utslag')
{
  const y = nyPrutt()
  let x = 700
  let sista5 = 0
  let amplitudgrind = 0
  for (let f = 0; f < 1500; f++) {
    if (f < 30) x -= 14
    y.vila(x, 2.2 + 25 * 0.075, 3 * y.dx)
    const rita = y.uppdatera(FRAME)
    const maxH = Math.max(...Array.from(y.h, (h, i) => Math.abs(h + y.rest[i])))
    if (f >= 1200) {
      sista5 += rita ? 1 : 0
      amplitudgrind += maxH > WAVE_REST ? 1 : 0
    }
  }
  ok('kontrollarm: en AMPLITUDgrind ritar om varje bildruta för en stilla dell', amplitudgrind === 300, `${amplitudgrind} av 300 bildrutor över ${WAVE_REST} px`)
  ok('rörelsegrinden ritar INTE om en stilla dell (sista 5 s)', sista5 === 0, `${sista5} av 300 omritningar`)
  // en sista omritning efter att farten dött
  const z = nyPrutt()
  z.stot(640, 2)
  let seq = ''
  for (let f = 0; f < 1500; f++) seq += z.uppdatera(FRAME) ? '1' : '0'
  const sistaEtt = seq.lastIndexOf('1')
  const forstaNoll = seq.indexOf('0')
  ok('rör sig → true; en sista true efter att farten dött, därefter false', forstaNoll >= 0 && sistaEtt >= forstaNoll - 1 && sistaEtt > 100, `sista true vid steg ${sistaEtt} (${(sistaEtt / 60).toFixed(1)} s)`)
}

console.log('\nC. API-kanter')
{
  const y = new Ytvag({ n: 5, x0: 0, x1: 400, ytY: 100, sprid: 0, k: 0, damp: 1, max: 50, stotProfil: [1] })
  y.h.set([0, 10, 20, 30, 40])
  ok('hojd i en stödpunkt', y.hojd(100) === 10 && y.hojd(300) === 30)
  ok('hojd mellan stödpunkter interpolerar', Math.abs(y.hojd(150) - 15) < 1e-5, `${y.hojd(150)}`)
  ok('hojd bortom kanten klampas', y.hojd(-500) === 0 && y.hojd(9999) === 40)
  ok('yta(x) = ytY + hojd', Math.abs(y.yta(200) - 120) < 1e-5)
  const anrop = []
  const g = { moveTo: (...a) => anrop.push(['m', ...a]), lineTo: (...a) => anrop.push(['l', ...a]) }
  const r = y.path(g, { steg: 100 })
  ok('path lägger moveTo + lineTo och returnerar g', r === g && anrop[0][0] === 'm' && anrop.length === 5 && anrop[4][1] === 400, `${anrop.length} punkter, sista ${JSON.stringify(anrop.at(-1))}`)
  y.stot(NaN, 1)
  y.stot(100, NaN)
  y.vila(NaN, 1, 10)
  ok('NaN/Infinity i stot/vila ignoreras tyst', y.v.every((v) => v === 0))
  y.stot(1e9, 1)
  ok('stotKlamma:false tappar en stöt långt utanför', y.v.every((v) => v === 0))
  const z = new Ytvag({ n: 5, x0: 0, x1: 400, stotProfil: [1, 0.5], stotKlamma: true })
  z.stot(1e9, 1)
  ok('stotKlamma:true lägger den på kantpunkten', z.v[4] === 1 && z.v[3] === 0.5)
  const d = new Ytvag({ n: 5, x0: 0, x1: 400 })
  d.stot(200, 4)
  ok('förvalets stötprofil 1 · 0,6 · 0,25 (dammens)', Math.abs(d.v[2] - 4) < 1e-6 && Math.abs(d.v[1] - 2.4) < 1e-6 && Math.abs(d.v[0] - 1) < 1e-6)
  d.h.fill(3)
  d.v.fill(1)
  d.nollstall()
  ok('nollstall tömmer på plats (delade arrayer lever kvar)', d.h.every((v) => v === 0) && d.v.every((v) => v === 0) && !d.pa)
  // vila(): två anrop samma bildruta summeras; en bildruta utan anrop = ingen dell
  const w = new Ytvag({ n: 41, x0: 0, x1: 400, k: 0.021, damp: 0.972 })
  w.vila(200, 2, 30)
  w.vila(200, 2, 30)
  w.uppdatera(FRAME)
  const mitt = w.rest[20]
  w.uppdatera(FRAME)
  ok('två vila() samma bildruta summeras', Math.abs(mitt - 4) < 1e-5, `mitt ${mitt}`)
  ok('en bildruta utan vila() tar bort dellen', w.rest[20] === 0)
}

console.log(fel ? `\n${fel} FEL` : '\nalla grönt')
process.exit(fel ? 1 : 0)
