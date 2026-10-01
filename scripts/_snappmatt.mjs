// T4 (FYSIKPLAN §1.3.3): stegfördelning per avfyrad bildruta i PhysicsWorld/FluidWorld.
// Pixis RIKTIGA Ticker (maxFPS 60, som App.js:24) matas med vsync-stämplar kvantiserade till 0,1 ms.
// Kontrollarm = dagens ackumulator (kopia av koden FÖRE snäppet, sist i filen); mätarm = riktiga
// klasserna. Kör: node scripts/_snappmatt.mjs
import { Ticker } from 'pixi.js'
import Matter from 'matter-js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { FluidWorld } from '../src/lib/vatska.js'

const FIXED = 1000 / 60
// Stämplar: ceil till 0,1 ms och fasen 100 ms efter start återger planens 32/34/34 % i kontrollarmen
// (fasen avgör — se svepet längst ned). Riktiga vsync-stämplar har en godtycklig fas.
const KV = (x) => Math.ceil(x * 10) / 10
const OFF = 100

function gammal(maxSteg) {
  let acc = 0
  return (d0) => {
    acc += Math.min(d0 || FIXED, 100)
    let s = 0
    while (acc >= FIXED && s < maxSteg) { acc -= FIXED; s++ }
    if (s >= maxSteg) acc = 0
    return s
  }
}

function drive(hz, n, steg, q = KV, off = OFF) {
  const tk = new Ticker()
  tk.autoStart = false
  tk.maxFPS = 60
  const hist = {}
  const rader = []
  tk.add((t) => {
    const s = steg(t.deltaMS)
    hist[s] = (hist[s] || 0) + 1
    rader.push(s)
  })
  for (let i = 1; i <= n; i++) tk.update(q(off + (i * 1000) / hz))
  return { hist, rader }
}

// Riktiga världar: räkna steg genom att haka på motorns/vätskans stegfunktion.
function fysik() {
  const w = new PhysicsWorld({ gravityY: 1 })
  let c = 0
  const orig = Matter.Engine.update
  Matter.Engine.update = function (...a) { c++; return orig.apply(this, a) }
  return { w, steg: (d) => { c = 0; w.update(d); return c }, rest: () => { Matter.Engine.update = orig } }
}
function vatska() {
  const w = new FluidWorld({ max: 8 })
  let c = 0
  const orig = w._step.bind(w)
  w._step = () => { c++; return orig() }
  return { w, steg: (d) => { c = 0; w.update(d); return c }, rest: () => {} }
}

const pct = (h, n) => [0, 1, 2, 3].map((k) => (((h[k] || 0) / n) * 100).toFixed(1).padStart(5)).join(' / ')
const N = 3000
console.log('Hz       | gammal 0/1/2/3 %          | PhysicsWorld               | FluidWorld')
let lika = true
for (const hz of [60, 59.94, 57.1, 30, 45, 90, 120, 50, 40]) {
  const g = drive(hz, N, gammal(5))
  const gv = drive(hz, N, gammal(3))
  const f = fysik(); const p = drive(hz, N, f.steg); f.rest()
  const v = vatska(); const q = drive(hz, N, v.steg)
  console.log(`${String(hz).padEnd(8)} | ${pct(g.hist, g.rader.length)} | ${pct(p.hist, p.rader.length)} | ${pct(q.hist, q.rader.length)}`)
  // Bildtakter långt från 60 Hz ska stega som förut, bildruta för bildruta.
  if (Math.abs(1000 / hz - FIXED) > 1) {
    const likaP = g.rader.length === p.rader.length && g.rader.every((s, i) => s === p.rader[i])
    const likaV = gv.rader.length === q.rader.length && gv.rader.every((s, i) => s === q.rader[i])
    console.log(`           identiskt med gammal, bildruta för bildruta: Physics ${likaP} · Fluid ${likaV}`)
    if (!likaP || !likaV) lika = false
  }
}
// Svep: samma 60,00 Hz-ström över kvantiseringar och faser — kontrollarm mot riktig PhysicsWorld.
{
  console.log('\n60,00 Hz, svep över kvantisering x fas (andel 0-steg + 2-steg, %): gammal -> ny')
  let wg = 0, wn = 0
  const bad = (h, n) => (((h[0] || 0) + (h[2] || 0)) / n) * 100
  for (const [qn, q] of Object.entries({ round: (x) => Math.round(x * 10) / 10, floor: (x) => Math.floor(x * 10) / 10, ceil: KV })) {
    for (const off of [0, 1.1, 3.3, 7.7, 11.1, 100, 100.1, 100.2, 100.3, 5000.4]) {
      const g = drive(60, N, gammal(5), q, off)
      const f = fysik(); const p = drive(60, N, f.steg, q, off); f.rest()
      const a = bad(g.hist, g.rader.length), b = bad(p.hist, p.rader.length)
      wg = Math.max(wg, a); wn = Math.max(wn, b)
      if (off === 100 || off === 0) console.log(`  ${qn.padEnd(5)} fas ${String(off).padEnd(7)} ${a.toFixed(1).padStart(5)} -> ${b.toFixed(1)}`)
    }
  }
  console.log(`  värsta fall över svepet: gammal ${wg.toFixed(1)} % -> ny ${wn.toFixed(1)} %`)
}
// Klampen kvar: ett hopp på 5 s ger max 100 ms = 6 steg -> taket 5 (3 i vätskan).
{
  const f = fysik(); const a = f.steg(5000); f.rest()
  const v = vatska(); const b = v.steg(5000)
  console.log(`hopp 5000 ms: Physics ${a} steg (tak 5) · Fluid ${b} steg (tak 3)`)
}
console.log(lika ? 'OK: andra bildtakter oförändrade' : 'FEL: andra bildtakter ändrade')
