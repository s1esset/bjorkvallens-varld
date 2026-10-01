// Node-mätning av Emitterns luftmotstånd (`luft`) och `vind` i lib/partiklar.js.
// Ingen webbläsare: en låtsas-document ger frames() ett tomt ark, och ett låtsas-lager
// bär fältet, så den RIKTIGA Emitter.steg() körs mot riktiga Pixi-Particles.
//
//   node scripts/_partikelvind.mjs        (exit 1 om något fallerar)
//
// Ordningen är kontrollarm först (måste ge det KÄNDA svaret) och mätarm sedan:
//   K1  utan optioner = dagens bana, 0,000 px
//   K2  luft → 0 (1e-9) med kraftig vind = dagens bana (< 0,001 px)
//   K3  luftbana() mot en oberoende steg-för-steg-integrering (ska vara ~överens)
//   M1  sluthastigheten närmar sig  (w + 0)  i x  och  g/k  i y
//   M2  serien och sluten form möts vid a = 1e-3 (inget hopp)
import { gsap } from 'gsap'

const ctxNoop = new Proxy(function () {}, { get: () => ctxNoop, set: () => true, apply: () => ctxNoop })
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctxNoop }) }

const { Emitter, luftbana } = await import('../src/lib/partiklar.js')

let fel = 0
const ok = (namn, cond, info = '') => {
  console.log(`${cond ? 'OK  ' : 'FEL '} ${namn}${info ? '  — ' + info : ''}`)
  if (!cond) fel++
}

// Låtsas-lager med ett färdigt fält, så faltFor() inte behöver bygga något.
function lager() {
  const l = { children: [], addChild(c) { this.children.push(c); c.parent = this }, setChildIndex() {} }
  const f = { destroyed: false, parent: l, particleChildren: [], addParticle(p) { this.particleChildren.push(p) }, update() {}, destroy() { this.destroyed = true } }
  l.children.push(f)
  l._fxField = f
  return l
}

// En emitter som föder partiklar (DENSITY st, identiska) med känd start och lever längre än mätningen.
function enPartikel(extra) {
  const em = new Emitter(lager(), {
    x: 100, y: 200, rate: 0, pa: false, max: 4, life: 30, lifeVar: 0,
    speed: 300, speedVar: 0, angle: -0.7, spread: 0, gravity: 0, fadeIn: 0.1, ...extra,
  })
  gsap.ticker.remove(em._tick) // vi stegar för hand
  em.puff(1)
  return em
}
const stegaTill = (em, sek, dt = 1 / 60) => { for (let i = 0; i < Math.round(sek / dt); i++) em.steg(dt) }

// Rör sig ingenting går det inte att skilja kända lägen åt: partikeln måste finnas.
const t0 = enPartikel({})
ok('emittern föder en partikel i Node', t0._parts.length >= 1, `${t0._parts.length} st`)

// ---- K1: utan optioner = dagens bana ----------------------------------------
{
  const g = 420
  const em = enPartikel({ gravity: g })
  let max = 0
  for (let i = 0; i < 300; i++) {
    em.steg(1 / 60)
    const r = em._parts[0]
    const age = em._nu - r.fodd
    const gx = r.x0 + r.vx * age
    const gy = r.y0 + r.vy * age + 0.5 * g * age * age
    max = Math.max(max, Math.abs(r.p.x - gx), Math.abs(r.p.y - gy))
  }
  ok('K1 utan optioner = gamla formeln', max === 0, `max avvikelse ${max.toFixed(6)} px över 300 steg`)
}

// ---- K2: luft → 0 med vind = dagens bana ------------------------------------
{
  const g = 420
  const em = enPartikel({ gravity: g, luft: 1e-9, vind: 250 })
  let max = 0
  for (let i = 0; i < 300; i++) {
    em.steg(1 / 60)
    const r = em._parts[0]
    const age = em._nu - r.fodd
    const gx = r.x0 + r.vx * age
    const gy = r.y0 + r.vy * age + 0.5 * g * age * age
    max = Math.max(max, Math.abs(r.p.x - gx), Math.abs(r.p.y - gy))
  }
  ok('K2 luft→0 (1e-9) + vind 250 ≈ gamla banan', max < 1e-3, `max avvikelse ${max.toFixed(6)} px`)
  const r = em._parts[0]
  ok('K2 luftgrenen kördes (k > 0 på partikeln)', r.k > 0 && r.w === 250, `k=${r.k} w=${r.w}`)
}

// ---- K3: sluten form mot oberoende integrering ------------------------------
{
  // semi-implicit Euler med 0,2 ms steg, per axel
  const kor = (x0, v0, w, k, g, T) => {
    let x = x0, v = v0
    const h = 0.0002
    for (let t = 0; t < T - 1e-12; t += h) { v += (-k * (v - w) + g) * h; x += v * h }
    return x
  }
  let max = 0
  for (const [x0, v0, w, k, g] of [[0, 300, 0, 2, 0], [10, -250, 120, 1.5, 0], [50, 80, 0, 0.8, 420], [0, 0, -90, 4, 300]]) {
    for (const T of [0.3, 1, 3, 8]) max = Math.max(max, Math.abs(luftbana(x0, v0, w, k, g, T) - kor(x0, v0, w, k, g, T)))
  }
  ok('K3 sluten form = steg-för-steg-integrering', max < 0.15, `max ${max.toFixed(3)} px (0,2 ms Euler har själv ~½·h·v·T fel)`)
}

// ---- M1: sluthastigheten ----------------------------------------------------
{
  const k = 2, g = 300, w = 100
  const em = enPartikel({ luft: k, vind: w, gravity: g })
  stegaTill(em, 10) // e^(−20) ≈ 0
  const r = em._parts[0]
  const x1 = r.p.x, y1 = r.p.y
  em.steg(1 / 60)
  const vx = (r.p.x - x1) * 60, vy = (r.p.y - y1) * 60
  ok('M1 vx → w', Math.abs(vx - w) < 0.5, `vx = ${vx.toFixed(2)} (förväntat ${w})`)
  ok('M1 vy → g/k', Math.abs(vy - g / k) < 0.5, `vy = ${vy.toFixed(2)} (förväntat ${g / k})`)
  // och att mätaren RÖR sig: utan luft är farten efter 10 s helt annan
  const em0 = enPartikel({ gravity: g })
  stegaTill(em0, 10)
  const r0 = em0._parts[0]
  const y0 = r0.p.y
  em0.steg(1 / 60)
  const vy0 = (r0.p.y - y0) * 60
  ok('M1 kontrollen: utan luft växer vy utan tak', vy0 > 5 * g / k, `vy utan luft = ${vy0.toFixed(0)} mot ${g / k} med luft`)
}

// ---- M2: serien möter sluten form -------------------------------------------
{
  const k = 2
  const tLiten = 0.0009999 / k, tStor = 0.0010001 / k
  const g = 420, v0 = 300, w = 100
  const hopp = (T) => [luftbana(0, v0, w, k, g, T), luftbana(0, 0, 0, k, g, T)]
  const [ax, ay] = hopp(tLiten), [bx, by] = hopp(tStor)
  const dt = tStor - tLiten
  const fartX = Math.abs(v0), fartY = g * tStor
  const hX = Math.abs(bx - ax) - fartX * dt, hY = Math.abs(by - ay) - fartY * dt
  ok('M2 inget hopp vid seriens gräns', Math.abs(hX) < 1e-6 && Math.abs(hY) < 1e-6, `rest ${hX.toExponential(1)} / ${hY.toExponential(1)} px`)
}

process.exit(fel ? 1 : 0)
