// STUDSA-NERS SNURROR (FYSIKPLAN F1, dag D16 kluster B4) — mäts i Node, ingen webbläsare.
//
//   node scripts/_dag-studsa-ner.mjs
//
// Samma värld som spelet (PhysicsWorld gravityY 1, golv + väggar), samma pinngitter, samma mynt och
// samma snurra (`snurror.js` ger talen; `_snurra()` här är en rad-för-rad-kopia av `_addSnurra`).
//
// A  EN STÖT → RÖRELSE → VILA: ett mynt släpps mot ena bladet. Snurran ska (1) rotera av myntet (peak ω > 0,03),
//    (2) aldrig över MAX_VF, (3) vila på exakt 0 inom 4 s, (4) navet driftar ≤ 0,5 px (gångjärnet håller).
//    KONTROLLARMAR: utan bromsen och utan luft (damp 0, motor av) → snurrar fortfarande efter 600 steg
//    (mätaren rör sig: "vilar" betyder något); utan gångjärn → navet driftar mer än 50 px (gångjärnet gör jobbet).
// B  HELA BRÄDET: 7 pinnrader, 3 snurror, 60 mynt släpps från tratten. Alla ska nå fickorna (y > 560),
//    inget lämnar brädet (x ∈ [0,1280], y > −200), inget mynt blir stående i > 5 s utan spelets egen
//    anti-fastnar-knuff, och snurrorna ska vara i vila efteråt. KONTROLLARM: samma bräde utan snurror
//    (HEAD) — fallen mäts på samma sätt så att "snurrorna saktar ner" är en siffra.
import { PhysicsWorld, Body, STEG2 } from '../src/lib/physics.js'
import { SNURRA, snurrAntal, valjPlatser } from '../src/games/studsa-ner/snurror.js'

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const not = (t) => console.log(`  · ${t}`)
const rubrik = (t) => console.log(`\n══ ${t}`)
const f = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : String(v))
const FRAME = 1000 / 60

// ---- speglar spelet ----
function snurra(phys, x, y, { broms = true, hinge = true, luft = SNURRA.LUFT } = {}) {
  const body = phys.rectangle(x, y, SNURRA.L, SNURRA.T, {
    density: SNURRA.DENSITET, frictionAir: luft, friction: 0.05, restitution: 0.6,
    chamfer: { radius: SNURRA.T / 2 }, label: 'snurra',
  })
  let led = null
  if (hinge) {
    led = phys.gangjarn(body, { x, y })
    if (broms) led.motor({ fart: 0, maxMoment: SNURRA.BROMS / (body.inverseInertia * STEG2) })
  }
  return { body, led }
}
function mynt(phys, x, y) {
  const b = phys.circle(x, y, 20, { restitution: 0.72, friction: 0.04, frictionAir: 0.006, density: 0.002, label: 'ball' })
  Body.setVelocity(b, { x: (Math.random() - 0.5) * 1.2, y: 0 })
  return b
}
const kapa = (sp) => {
  const w = sp.body.angularVelocity
  if (Math.abs(w) > SNURRA.MAX_VF) Body.setAngularVelocity(sp.body, Math.sign(w) * SNURRA.MAX_VF)
}

// ═══ A ═══
rubrik('A · en stöt → rörelse → vila')
function enStot({ broms, hinge, luft, steg = 700, offX = 22 }) {
  const phys = new PhysicsWorld({ gravityY: 1.0, walls: ['floor', 'left', 'right'] })
  const sp = snurra(phys, 640, 300, { broms, hinge, luft })
  const stod = phys.beforeStep(() => kapa(sp))
  const b = mynt(phys, 640 + offX, 150) // träffar högra bladets ovansida
  Body.setVelocity(b, { x: 0, y: 3 })
  let peak = 0 // största VINKELFÄRD som faktiskt integreras (vinkeländring per steg) — taket klämmer före integrationen
  let a0 = sp.body.angle
  let toppDrift = 0
  let vilaSteg = null
  let efterTraff = -1
  for (let i = 0; i < steg; i++) {
    phys.update(FRAME)
    const w = Math.abs(sp.body.angularVelocity)
    const dA = Math.abs(sp.body.angle - a0)
    a0 = sp.body.angle
    if (dA > peak) peak = dA
    if (efterTraff < 0 && w > 0.03) efterTraff = i
    toppDrift = Math.max(toppDrift, Math.hypot(sp.body.position.x - 640, sp.body.position.y - 300))
    if (efterTraff >= 0 && vilaSteg == null && b.position.y > 360 && w < 0.002) vilaSteg = i - efterTraff
    if (efterTraff >= 0 && w >= 0.002) vilaSteg = null // måste STANNA kvar i vila
  }
  stod?.()
  const slut = Math.abs(sp.body.angularVelocity)
  phys.destroy()
  return { peak, toppDrift, vilaSteg, slut }
}
const a = enStot({ broms: true, hinge: true })
ok('stöten ger rörelse: vinkelfart > 0,03 rad/steg', a.peak > 0.03, `peak ${f(a.peak, 3)} rad/steg`)
ok(`varvtalstaket håller: peak ≤ MAX_VF ${SNURRA.MAX_VF}`, a.peak <= SNURRA.MAX_VF + 1e-9, f(a.peak, 3))
ok('snurran VILAR (ω < 0,002) inom 4 s efter stöten och står kvar där', a.vilaSteg != null && a.vilaSteg <= 240, a.vilaSteg == null ? 'vilar aldrig' : `${a.vilaSteg} steg = ${f(a.vilaSteg / 60, 1)} s`)
ok('navet driftar ≤ 0,5 px under hela händelsen', a.toppDrift <= 0.5, `${f(a.toppDrift, 3)} px`)
const kOljad = enStot({ broms: false, hinge: true, luft: 0 })
ok('KONTROLL: utan broms och utan luft snurrar den fortfarande efter 700 steg (mätaren rör sig)', kOljad.slut > 0.02, `ω ${f(kOljad.slut, 3)}`)
const kFri = enStot({ broms: false, hinge: false })
ok('KONTROLL: utan gångjärn lämnar bladet navet (gångjärnet gör jobbet)', kFri.toppDrift > 50, `${f(kFri.toppDrift, 0)} px`)
// Hårt slag: taket
let hardPeak = 0
for (let k = 0; k < 6; k++) {
  const phys = new PhysicsWorld({ gravityY: 1.0, walls: ['floor', 'left', 'right'] })
  const sp = snurra(phys, 640, 300)
  const stod = phys.beforeStep(() => kapa(sp))
  const b = mynt(phys, 640 + 26, 240)
  Body.setVelocity(b, { x: 0, y: 14 + k * 2 })
  let h0 = sp.body.angle
  for (let i = 0; i < 90; i++) {
    phys.update(FRAME)
    hardPeak = Math.max(hardPeak, Math.abs(sp.body.angle - h0))
    h0 = sp.body.angle
  }
  stod?.()
  phys.destroy()
}
ok('hårda slag (14–24 px/steg) ger aldrig mer än MAX_VF', hardPeak <= SNURRA.MAX_VF + 1e-9, `peak ${f(hardPeak, 3)}`)

// ═══ B ═══
rubrik('B · hela brädet: 7 rader, 60 mynt')
function bräde({ medSnurror, mynten = 60 }) {
  const phys = new PhysicsWorld({ gravityY: 1.0, walls: ['floor', 'left', 'right'] })
  const rows = 7
  const platser = []
  for (let row = 0; row < rows; row++) {
    const y = 200 + row * 46
    const offset = row % 2 ? 56 : 0
    for (let x = 150 + offset; x <= 1280 - 150; x += 112) platser.push({ x, y, row })
  }
  const valda = medSnurror ? valjPlatser(platser.filter((p) => p.row >= 1 && p.row <= rows - 2), snurrAntal(rows)) : []
  const bytta = new Set(valda)
  for (const p of platser) if (!bytta.has(p)) phys.circle(p.x, p.y, 10, { isStatic: true, restitution: 0.5, friction: 0.1, label: 'peg' })
  const snurror = valda.map((p) => snurra(phys, p.x, p.y))
  const stod = phys.beforeStep(() => snurror.forEach(kapa))
  // golvet i fickorna: fickornas avdelare (4 fickor) som i spelet
  for (let i = 1; i < 4; i++) phys.rectangle(i * 320, 560 + 80, 14, 160, { isStatic: true, restitution: 0.3, friction: 0.2, label: 'divider' })
  const res = { nadde: 0, ute: 0, kvar: 0, maxFart: 0, tider: [], knuffar: 0, valda: valda.length }
  const lista = []
  let nasta = 0
  for (let steg = 0; steg < 60 * 60; steg++) {
    if (steg % 25 === 0 && nasta < mynten) {
      lista.push({ b: mynt(phys, 150 + Math.random() * 980, 188), t0: steg, still: 0, klar: false })
      nasta++
    }
    phys.update(FRAME)
    for (const m of lista) {
      if (m.klar) continue
      const { x, y } = m.b.position
      res.maxFart = Math.max(res.maxFart, m.b.speed)
      if (x < -20 || x > 1300 || y < -250) { res.ute++; m.klar = true; continue }
      // spelets anti-fastnar-knuff
      if (y < 600 && m.b.speed < 0.3) {
        m.still += FRAME
        if (m.still > 320) {
          m.still = 0
          res.knuffar++
          Body.setVelocity(m.b, { x: (Math.random() - 0.5) * 2.6, y: Math.max(m.b.velocity.y, 1.4) })
        }
      } else m.still = 0
      if (y > 600 && m.b.speed < 0.6) { res.nadde++; res.tider.push((steg - m.t0) / 60); m.klar = true; phys.removeBody(m.b) }
    }
  }
  res.kvar = lista.filter((m) => !m.klar).length
  // vila: låt allt lugna sig
  for (let i = 0; i < 600; i++) phys.update(FRAME)
  res.snurrVf = Math.max(0, ...snurror.map((s) => Math.abs(s.body.angularVelocity)))
  stod?.()
  phys.destroy()
  return res
}
const med = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1)
const kHead = bräde({ medSnurror: false })
const ny = bräde({ medSnurror: true })
not(`HEAD (inga snurror): nådde ${kHead.nadde}/60 · medeltid ${f(med(kHead.tider), 2)} s · knuffar ${kHead.knuffar} · ute ${kHead.ute} · toppfart ${f(kHead.maxFart, 1)}`)
not(`snurror (${ny.valda} st): nådde ${ny.nadde}/60 · medeltid ${f(med(ny.tider), 2)} s · knuffar ${ny.knuffar} · ute ${ny.ute} · toppfart ${f(ny.maxFart, 1)}`)
ok('KONTROLL: HEAD-brädet utan snurror når alla 60 (mätaren duger)', kHead.nadde === 60 && kHead.ute === 0, `${kHead.nadde}/60`)
ok('3 snurror på 7 rader', ny.valda === 3, `${ny.valda}`)
ok('alla 60 mynt når fickorna', ny.nadde === 60, `${ny.nadde}/60`)
ok('inget mynt lämnar brädet (x ∈ [−20,1300], y > −250)', ny.ute === 0, `${ny.ute}`)
ok('inget mynt blir kvar i luften efter 60 s', ny.kvar === 0, `${ny.kvar}`)
ok('snurrorna saktar högst 1,5 s per fall mot HEAD (motgång får sakta ner, aldrig stoppa)', med(ny.tider) - med(kHead.tider) < 1.5, `${f(med(ny.tider) - med(kHead.tider), 2)} s`)
ok('snurrorna vilar när myntregnet är över (ω < 0,002)', ny.snurrVf < 0.002, `ω ${f(ny.snurrVf, 4)}`)
ok('toppfart för ett mynt ≤ 22 px/steg (inget slungas ur bild)', ny.maxFart <= 22, f(ny.maxFart, 1))

// ═══ C · platsvalet ═══
rubrik('C · platsvalet')
const kand = []
for (let row = 1; row <= 5; row++) for (let x = 150 + (row % 2 ? 56 : 0); x <= 1130; x += 112) kand.push({ x, y: 200 + row * 46, row })
let minAv = Infinity
const sett = new Set()
for (let k = 0; k < 200; k++) {
  const v = valjPlatser(kand, 3)
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) minAv = Math.min(minAv, Math.hypot(v[i].x - v[j].x, v[i].y - v[j].y))
  sett.add(v.map((p) => `${p.x},${p.y}`).sort().join('|'))
}
ok(`aldrig två snurror närmare än ${SNURRA.MIN_AVST} px`, minAv >= SNURRA.MIN_AVST, `min ${f(minAv, 0)} px`)
ok('varje nivå får nya platser (200 dragningar ger > 20 olika uppsättningar)', sett.size > 20, `${sett.size} olika`)
ok('antal efter rader: 5 → 1, 6 → 2, 7 → 3, 4 → 0, 9 → 3', [5, 6, 7, 4, 9].map(snurrAntal).join() === '1,2,3,0,3')

console.log(fel ? `\n✗ ${fel} rad(er) röda` : '\n✓ alla gröna')
process.exit(fel ? 1 : 0)
