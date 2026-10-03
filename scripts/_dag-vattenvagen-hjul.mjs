// Dag D16 B1 · vattenvagen — vattenhjulet vid kranen (FYSIKPLAN F6a, kund 2). Node, ingen webbläsare.
//
//   node scripts/_dag-vattenvagen-hjul.mjs
//
// Kör spelets EGEN hjulfysik (`src/games/vattenvagen/hjul.js`: matter-kropp + `phys.gangjarn` +
// `fluid.foljKroppar` + momentet ur strömmen) mot vätskeparametrarna ur `init` och samma matning som
// `_flow` (en droppe var 70 ms / öppen, källrörets mynning suger via `drain`). Varje mätning har en
// KONTROLLRAD. Webbläsarsonden `_dag-vattenvagen.mjs` (ventilen, 30 rader) rörs inte.
// Spelets egna ritfunktioner (cylinderFill m.fl.) bygger gradienter på en canvas — i Node finns ingen.
// En attrapp räcker: sonden läser geometri, inte pixlar.
globalThis.document ??= {
  createElement: () => ({ width: 1, height: 1, getContext: () => new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}) }) }),
}
const { FluidWorld, FLUIDS } = await import('../src/lib/vatska.js')
const { Container } = await import('pixi.js')
const { Vattenhjul, ritaHjul, HJUL_SKOVLAR, HJUL_R } = await import('../src/games/vattenvagen/hjul.js')
const { default: spel } = await import('../src/games/vattenvagen/index.js')

const FIXED = 1000 / 60
let fel = 0
const ok = (namn, v, d = '') => {
  console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`)
  if (!v) fel++
}
const f2 = (x) => x.toFixed(2)
const f3 = (x) => x.toFixed(3)
const varv = (w) => (-w * 60) / (2 * Math.PI) // rad/steg → varv/s, moturs = +

const GRIDY0 = 200
const SOURCE_X = 640
const TAP_Y = GRIDY0 - 112
const HUB = { x: SOURCE_X + 38, y: GRIDY0 - 92 } // spelets HJUL_DX / HJUL_Y

function varld() {
  return new FluidWorld({
    max: 480, radius: 22, gravityY: 0.5, rho0: FLUIDS.vatten.rho0, sigma: FLUIDS.vatten.sigma, beta: FLUIDS.vatten.beta,
    restitution: 0.06, wallFriction: 0.3,
    walls: { left: false, right: false, bottom: false, top: false },
    bounds: { left: -160, right: 1440, top: -160, bottom: 860 },
  })
}

function kor({ medHjul = true, oppen = 1, ms = 6000, onFrame = null } = {}) {
  const f = varld()
  const h = medHjul ? new Vattenhjul({ x: HUB.x, y: HUB.y, vatska: f }) : null
  let acc = 0
  let drained = 0
  for (let t = 0; t < ms; t += FIXED) {
    if (oppen > 0) {
      acc += FIXED * oppen
      while (acc >= 70) { acc -= 70; f.spawn(SOURCE_X + (Math.random() - 0.5) * 6, TAP_Y, { vy: 1.6 }) }
    }
    drained += f.drain(SOURCE_X, GRIDY0 - 32, 66, 56)
    h?.steg(FIXED)
    f.update(FIXED)
    onFrame?.(t, h, f)
  }
  return { f, h, drained }
}

console.log('\nA · SNURRAR AV STRÅLEN\n')
{
  const medel = []
  for (let i = 0; i < 5; i++) {
    const ws = []
    kor({ ms: 10000, onFrame: (t, h) => { if (t > 4000) ws.push(h.fart) } })
    medel.push(varv(ws.reduce((a, b) => a + b, 0) / ws.length))
  }
  console.log('     medelvarvtal sekund 4–10, fem körningar (varv/s, moturs = +):', medel.map(f2).join(' · '))
  ok('hjulet går runt åt rätt håll: moturs (strålen träffar vänstra skovlarna nedåt), alla 5 körningar', medel.every((m) => m > 0))
  ok('lagom fart: 0,2–1,0 varv/s i varje körning', medel.every((m) => m >= 0.2 && m <= 1.0), `${f2(Math.min(...medel))}–${f2(Math.max(...medel))}`)
  const k0 = kor({ oppen: 0, ms: 4000 })
  ok('KONTROLL ingen stråle: hjulet står (|ω| < 0,001)', Math.abs(k0.h.fart) < 0.001, `ω ${f3(k0.h.fart)}`)
  // strålen men kopplingen bortkopplad: skovlarna finns, vattnet läses aldrig
  const f1 = varld()
  const h1 = new Vattenhjul({ x: HUB.x, y: HUB.y, vatska: f1 })
  h1._koppla = () => {}
  let acc = 0
  for (let t = 0; t < 6000; t += FIXED) {
    acc += FIXED
    while (acc >= 70) { acc -= 70; f1.spawn(SOURCE_X + (Math.random() - 0.5) * 6, TAP_Y, { vy: 1.6 }) }
    f1.drain(SOURCE_X, GRIDY0 - 32, 66, 56)
    h1.steg(FIXED)
    f1.update(FIXED)
  }
  ok('KONTROLL strålen men ingen koppling: hjulet står (det är vattnet som driver det)', Math.abs(h1.fart) < 0.001, `ω ${f3(h1.fart)}`)
  // kolliderarna gör något: vattnet sprids längre i sidled med hjul än utan
  const sidled = (medHjul) => {
    let max = 0
    kor({ ms: 3000, medHjul, onFrame: (t, h, f) => { for (let i = 0; i < f.count; i++) if (f.y[i] > 90 && f.y[i] < 135) max = Math.max(max, Math.abs(f.x[i] - SOURCE_X)) } })
    return max
  }
  const mh = sidled(true)
  const mu = sidled(false)
  ok('KONTROLL kolliderarna gör något: vattnet sprids längre i sidled med hjul än utan', mh > mu + 3, `${f2(mh)} px mot ${f2(mu)} px`)
}

console.log('\nB · STÖT → RÖRELSE → VILA\n')
{
  const r = kor({ oppen: 0, ms: 200 })
  const h = r.h
  const a0 = h.vinkel
  h.stota(1, 0.07)
  const v1 = h.fart
  let maxA = 0
  let vila = null
  for (let t = 0; t < 600; t++) {
    h.steg(FIXED)
    r.f.update(FIXED)
    maxA = Math.max(maxA, Math.abs(h.vinkel - a0))
    if (vila === null && Math.abs(h.fart) < 0.0005) vila = t
  }
  ok('ett tryck snurrar hjulet minst ett halvt varv', maxA > Math.PI, `${f2(maxA / (2 * Math.PI))} varv`)
  ok('… och det snurrar ut inom 5 s', vila !== null && vila * FIXED < 5000, vila === null ? 'aldrig' : `${f2((vila * FIXED) / 1000)} s`)
  const a1 = h.vinkel
  for (let t = 0; t < 120; t++) { h.steg(FIXED); r.f.update(FIXED) }
  ok('i vila rör sig inget (< 0,001 rad på 2 s)', Math.abs(h.vinkel - a1) < 0.001, `${(h.vinkel - a1).toExponential(1)}`)
  // KONTROLL: ett tryck åt andra hållet snurrar åt andra hållet
  const r3 = kor({ oppen: 0, ms: 100 })
  r3.h.stota(-1, 0.07)
  for (let t = 0; t < 30; t++) { r3.h.steg(FIXED); r3.f.update(FIXED) }
  ok('KONTROLL: knuff +1 går medurs (ω > 0), knuff −1 moturs (ω < 0)', v1 > 0 && r3.h.fart < 0, `${f3(v1)} / ${f3(r3.h.fart)}`)
  // strålen stängs: utsnurrning
  const r2 = kor({ ms: 5000 })
  const h2 = r2.h
  const w0 = h2.fart
  let t2 = null
  r2.f.clear()
  for (let t = 0; t < 900; t++) {
    h2.steg(FIXED)
    r2.f.update(FIXED)
    if (t2 === null && Math.abs(h2.fart) < 0.002) t2 = t
  }
  ok('strålen stängs: hjulet snurrar ut inom 6 s', t2 !== null && t2 * FIXED < 6000, t2 === null ? 'aldrig' : `${f2((t2 * FIXED) / 1000)} s (från ω ${f3(w0)})`)
}

console.log('\nC · VATTNET KOMMER FORTFARANDE FRAM\n')
{
  const med = []
  const utan = []
  for (let i = 0; i < 4; i++) { med.push(kor({ ms: 10000 }).drained); utan.push(kor({ medHjul: false, ms: 10000 }).drained) }
  const mm = med.reduce((a, b) => a + b) / med.length
  const mu = utan.reduce((a, b) => a + b) / utan.length
  ok('≥ 90 % av dropparna når källrörets mynning med hjulet', mm >= 0.9 * mu, `${mm.toFixed(0)} mot ${mu.toFixed(0)} utan (${((100 * mm) / mu).toFixed(0)} %)`)
  // hur långt kan en skovel kasta vatten? (tak: inget lämnar bilden)
  let max = 0
  kor({ ms: 8000, onFrame: (t, h, f) => { for (let i = 0; i < f.count; i++) if (f.y[i] < 160) max = Math.max(max, Math.abs(f.x[i] - SOURCE_X)) } })
  ok('inget stänk längre än 90 px från strålen ovanför rutnätet', max < 90, `${f2(max)} px`)
}

console.log('\nD · LIVSCYKEL\n')
{
  const f = varld()
  const h = new Vattenhjul({ x: HUB.x, y: HUB.y, vatska: f })
  f.update(FIXED)
  const n = f.colliders.length
  ok('skovlarna finns som kolliderare i vätskan (nav + skovlar)', n === 1 + HJUL_SKOVLAR, `${n}`)
  // ritad geometri: kolliderarnas mittpunkter ligger på skovelringen, inom spetsradien
  const maxR = Math.max(...f.colliders.filter((c) => c.type === 'box').map((c) => Math.hypot(c.x - HUB.x, c.y - HUB.y)))
  ok('skovlarnas centrum ligger på 23 px från navet (rita ≙ kolliderare)', Math.abs(maxR - 23) < 0.01, `${f2(maxR)} px`)
  ok('spetsarna når HJUL_R = 31 (+2 px över)', HJUL_R === 31)
  f.clearColliders() // spelet gör så vid banbyte
  f.update(FIXED)
  h.steg(FIXED)
  ok('efter clearColliders() läggs de tillbaka vid nästa steg', f.colliders.length === n, `${f.colliders.length}`)
  h.destroy()
  ok('destroy: kolliderarna borta, följaren avregistrerad', f.colliders.length === 0 && (f._foljare?.length ?? 0) === 0, `${f.colliders.length} / ${f._foljare?.length}`)
  h.steg(FIXED)
  h.stota(1)
  f.update(FIXED)
  ok('steg/stota efter destroy kastar inte', true)
  const h2 = new Vattenhjul({ x: HUB.x, y: HUB.y, vatska: f })
  f.update(FIXED)
  ok('ett nytt hjul på samma värld (nästa bana) fungerar', f.colliders.length === 1 + HJUL_SKOVLAR)
  h2.destroy()
}

console.log('\nE · SPELETS EGNA VYER (_byggHjul/_stegHjul/_stotaHjul/_rivHjul, Pixi utan renderare)\n')
{
  const S = Object.create(spel)
  S._alive = true
  S._clock = 0
  S._livs = []
  S._sourceX = SOURCE_X
  S._fluid = varld()
  S._propLayer = new Container()
  const toner = []
  const ctx = { services: { audio: { tone: (o) => toner.push(o), sfx() {} } } }
  S._byggHjul(ctx)
  const h = S._hjul
  ok('hjulet byggs 38 px till höger om strålen, y 108', h.x === SOURCE_X + 38 && h.y === 108 && h.view.parent === S._propLayer, `${h.x},${h.y}`)
  const b = h.rot.getLocalBounds()
  const maxR = Math.max(Math.abs(b.minX), Math.abs(b.maxX), Math.abs(b.minY), Math.abs(b.maxY))
  ok('ritat hjul ryms i skovelspetsarnas radie + 3 px och är centrerat på navet', maxR <= HJUL_R + 3.5 && Math.abs((b.minX + b.maxX) / 2) < 3 && Math.abs((b.minY + b.maxY) / 2) < 3, `±${f2(maxR)} px, mitt ${f2((b.minX + b.maxX) / 2)},${f2((b.minY + b.maxY) / 2)}`)
  ok('hjulet håller sig mellan ventilens rör (y 56) och brunnarna (y 142)', h.y - HJUL_R - 2 > 56 && h.y + HJUL_R + 2 < 142, `${h.y - HJUL_R - 2} … ${h.y + HJUL_R + 2}`)
  let acc = 0
  for (let t = 0; t < 4000; t += FIXED) {
    acc += FIXED
    while (acc >= 70) { acc -= 70; S._fluid.spawn(SOURCE_X + (Math.random() - 0.5) * 6, TAP_Y, { vy: 1.6 }) }
    S._fluid.drain(SOURCE_X, GRIDY0 - 32, 66, 56)
    S._clock += FIXED
    S._stegHjul(FIXED)
    S._fluid.update(FIXED)
  }
  ok('bilden följer fysiken: rot.rotation = kroppens vinkel, och hjulet har snurrat', h.rot.rotation === h.fys.vinkel && Math.abs(h.fys.vinkel) > Math.PI, `${f2(h.fys.vinkel)} rad`)
  ok('hjulklapp hörs medan det snurrar, mjukt (vol ≤ 0,1)', toner.length > 3 && toner.every((o) => o.vol <= 0.1), `${toner.length} klapp på 4 s`)
  const w0 = h.fys.fart
  const t0 = toner.length
  S._stotaHjul(ctx, { x: h.x + 300, y: h.y })
  ok('ett tryck långt från hjulet gör inget med det', h.fys.fart === w0 && toner.length === t0)
  S._fluid.clear()
  for (let t = 0; t < 900; t++) { S._stegHjul(FIXED); S._fluid.update(FIXED) }
  S._stotaHjul(ctx, { x: h.x - 20, y: h.y })
  ok('tryck vänster om navet knuffar moturs (ω < 0) och ger ljud direkt', h.fys.fart < 0 && toner.length > t0, `${f3(h.fys.fart)}`)
  S._rivHjul()
  ok('rivning: kolliderarna ur vätskan, följaren borta, hjulet nollat', S._fluid.colliders.length === 0 && (S._fluid._foljare?.length ?? 0) === 0 && S._hjul === null)
  S._rivHjul()
  S._stegHjul(FIXED)
  ok('rivning två gånger och steg efter rivning kastar inte', true)
}

console.log(`\n  ${fel ? '✗ ' + fel + ' mätningar röda' : '✓ alla mätningar gröna'}\n`)
process.exit(fel ? 1 : 0)
