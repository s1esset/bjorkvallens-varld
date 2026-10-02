// Node-mätning av `lib/inspelning.js` (FYSIKPLAN F8) — ingen webbläsare.
//   node scripts/_inspelningprobe.mjs
//
// KONTROLLARMAR FÖRST (en mätning som inte rör sig mellan två KÄNDA lägen mäter ingenting):
//   K1  en OBEROENDE referens (egen beforeStep som skriver en vanlig array) == inspelarens poster: 0,0 px.
//   K2  samma bana lagrad i Float32 avviker > 0 — mätaren KAN alltså se en avvikelse (annars är 0,0 värdelöst).
//   K3  ett tak för lågt (max 100) ger en bana som INTE matchar de senaste 900 — mätaren ser ett tappat fönster.
// MÄTARMAR
//   M1  uppspelning vid HELA steg == inspelad bana, 0,0 px (fart 0,4, 60 fps-takt, hela bufferten).
//   M2  mellansteg ligger på sträckan mellan två poster (≤ 1e-9 från polylinjen), även med ojämna bildrutor.
//   M3  ringbuffertens tak: 2 000 steg in i max 900 → langd 900, minnesbyte oförändrat, fönstret = referensens sista 900.
//   M4  hoppa(): onKlar EN gång, view på sista läget exakt, spåret rivet; ta(): ingen onKlar, spåret rivet.
//   M5  rec.ta() mitt i en repris: inga fler skrivningar, ticker-avlyssningen borta; vy dör mitt i: tick() kastar inte.
import { Container } from 'pixi.js'
import { PhysicsWorld, nudge } from '../src/lib/physics.js'
import { spelaIn } from '../src/lib/inspelning.js'

const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })

// En kula som rullar ner för två ramper (bana med studs, så inte allt är en parabel).
function bygg() {
  const phys = new PhysicsWorld({ gravityY: 1.1, walls: ['left', 'right', 'floor'], wallThickness: 120 })
  phys.rectangle(300, 400, 420, 24, { isStatic: true, angle: 0.35, friction: 0.05 })
  phys.rectangle(800, 520, 420, 24, { isStatic: true, angle: -0.3, friction: 0.05 })
  const kula = phys.circle(240, 168, 26, { restitution: 0.42, friction: 0.03, frictionAir: 0.006, density: 0.0013 })
  return { phys, kula }
}
const STEG = 1000 / 60
const avst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

// En kula som studsar för evigt i en låda (ingen gravitation, ingen luft): rör sig ALLTID, så ett fönster
// på fel plats i bufferten kan aldrig råka matcha. Rullbanan ovan lägger sig till ro efter ~500 steg.
function byggLada() {
  const phys = new PhysicsWorld({ gravityY: 0, walls: ['left', 'right', 'floor', 'ceiling'], wallThickness: 120 })
  const kula = phys.circle(300, 200, 26, { restitution: 1, friction: 0, frictionAir: 0, density: 0.0013 })
  nudge(kula, 7.3, 5.1)
  return { phys, kula }
}

// ---- scen A: 400 steg, max 900 ----------------------------------------------------------------
{
  const { phys, kula } = bygg()
  const ref = [] // oberoende referens
  phys.beforeStep(() => ref.push({ x: kula.position.x, y: kula.position.y, vinkel: kula.angle }))
  const rec = spelaIn(phys, kula, { max: 900 })
  const f32 = [] // K2: samma sak lagrad som Float32
  phys.beforeStep(() => { if (rec.spelar) f32.push({ x: Math.fround(kula.position.x), y: Math.fround(kula.position.y) }) })
  // Före start(): ingenting skrivs (skriver inte i onödan).
  for (let i = 0; i < 30; i++) phys.update(STEG)
  ok('inget skrivs före start()', rec.langd === 0, `langd ${rec.langd}`)
  ref.length = 0
  rec.start()
  for (let i = 0; i < 400; i++) phys.update(STEG)
  rec.stopp()
  // refs ref[0..399] = lägena vid beforeStep under de 400 stegen (start() kom precis före första)
  let k1 = 0
  for (let i = 0; i < 400; i++) k1 = Math.max(k1, avst(rec.steg(i), ref[i]), Math.abs(rec.steg(i).vinkel - ref[i].vinkel))
  ok('K1 kontroll: inspelaren == oberoende referens (0,0 px)', rec.langd === 400 && k1 === 0, `langd ${rec.langd} · max avvikelse ${k1}`)
  let k2 = 0
  for (let i = 0; i < 400; i++) k2 = Math.max(k2, avst(rec.steg(i), f32[i]))
  ok('K2 kontroll: Float32 AVVIKER (mätaren kan se en avvikelse)', k2 > 1e-7, `max avvikelse Float32 ${k2.toExponential(2)} px`)
  const farhet = Math.max(...ref.slice(1, 400).map((p, i) => avst(p, ref[i])))
  ok('banan rör sig (kulan rullar, inte en stillbild)', farhet > 3 && avst(ref[0], ref[399]) > 300, `max steg ${farhet.toFixed(1)} px · start→slut ${avst(ref[0], ref[399]).toFixed(0)} px`)

  // M1: uppspelning fart 0,4 med jämna 60 fps-bildrutor. f = bildruta · 0,4 → helt steg var 5:e bildruta.
  const vy = new Container()
  const rep = rec.spelaUpp(vy, { fart: 0.4 })
  let m1 = 0, kollade = 0
  for (let fr = 1; fr < 4000 && !rep.klar; fr++) {
    rep.tick(STEG)
    if (rep.klar) break
    if (fr % 5 === 0) { // f = fr·0,4 = heltal
      const i = Math.round(rep.index)
      if (Math.abs(rep.index - i) < 1e-9) { m1 = Math.max(m1, avst(vy, ref[i]), Math.abs(vy.rotation - ref[i].vinkel)); kollade++ }
    }
  }
  ok('M1 uppspelning vid HELA steg == inspelad bana (0,0 px)', kollade > 150 && m1 === 0, `${kollade} helsteg jämförda · max avvikelse ${m1} px`)
  ok('M1 uppspelningen tar 400/0,4 bildrutor ± 1 (1000 bildrutor = 16,7 s i 0,4×)', rep.klar && Math.abs(rep.tid / STEG - 399 / 0.4) < 2, `tid ${(rep.tid / 1000).toFixed(2)} s`)
  ok('M1 slutläget == sista inspelade läget exakt', avst(vy, ref[399]) === 0, `${avst(vy, ref[399])} px`)

  // M2: ojämna bildrutor (11–34 ms) — varje utritat läge ligger på en sträcka i bufferten.
  const vy2 = new Container()
  const rep2 = rec.spelaUpp(vy2, { fart: 0.4 })
  let m2 = 0, mellan = 0, sd = 12345
  const slump = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  while (!rep2.klar) {
    rep2.tick(11 + slump() * 23)
    if (rep2.klar) break
    const fi = rep2.index, i0 = Math.floor(fi), t = fi - i0
    const a = ref[i0], b = ref[Math.min(399, i0 + 1)]
    const lx = a.x + (b.x - a.x) * t, ly = a.y + (b.y - a.y) * t
    m2 = Math.max(m2, Math.hypot(vy2.x - lx, vy2.y - ly))
    if (t > 0.05) mellan++
  }
  ok('M2 mellansteg ligger på polylinjen (≤ 1e-9 px) även med ojämna bildrutor', mellan > 100 && m2 < 1e-9, `${mellan} mellanlägen · max avvikelse ${m2.toExponential(2)} px`)

  // `sista`: bara de N sista stegen, och de är RÄTT N sista.
  const vy3 = new Container()
  const rep3 = rec.spelaUpp(vy3, { fart: 1, sista: 60 })
  ok('sista: 60 → fönstret är referensens steg 340–399', rep3.langd === 60 && avst(rep3.las(0), ref[340]) === 0 && avst(rep3.las(59), ref[399]) === 0, `langd ${rep3.langd}`)
  rep3.ta()
  rec.ta()
}

// ---- scen B: ringbuffertens tak ----------------------------------------------------------------
{
  const { phys, kula } = byggLada()
  const ref = []
  phys.beforeStep(() => ref.push({ x: kula.position.x, y: kula.position.y, vinkel: kula.angle }))
  const rec = spelaIn(phys, kula, { max: 900 })
  const lilla = spelaIn(phys, kula, { max: 100 })
  const byte0 = rec.minnesbyte
  rec.start(); lilla.start()
  for (let i = 0; i < 2000; i++) phys.update(STEG)
  let skilj = 0
  for (let i = 0; i < 900; i++) skilj = Math.max(skilj, avst(rec.steg(i), ref[1100 + i]))
  const rorelse = Math.min(avst(ref[1100], ref[1500]), avst(ref[1900], ref[1100]))
  ok('kontroll: kulan rör sig hela 2 000 steg (fönstret kan inte matcha av en slump)', rorelse > 50, `min avstånd mellan steg 1100/1500/1900: ${rorelse.toFixed(0)} px`)
  ok('M3 taket: 2 000 steg in i max 900 → langd 900, minnet orört', rec.langd === 900 && rec.minnesbyte === byte0 && byte0 === 900 * 3 * 8, `langd ${rec.langd} · ${byte0} byte`)
  ok('M3 fönstret == referensens sista 900 steg (0,0 px)', skilj === 0, `max avvikelse ${skilj} px`)
  // K3: den lilla (max 100) hålls INTE som de 900 — den har bara de sista 100 (mätaren ser ett tappat fönster)
  ok('K3 kontroll: max 100 har 100 poster och tappade resten', lilla.langd === 100 && avst(lilla.steg(0), ref[1900]) === 0 && avst(lilla.steg(0), ref[1100]) > 1, `langd ${lilla.langd}`)
  rec.ta(); lilla.ta()
}

// ---- scen C: hoppa / ta / rec.ta / död vy ------------------------------------------------------
{
  const { phys, kula } = bygg()
  const rec = spelaIn(phys, kula, { max: 900 })
  rec.start()
  for (let i = 0; i < 200; i++) phys.update(STEG)
  rec.fanga()
  rec.stopp()
  const sista = { x: kula.position.x, y: kula.position.y }
  ok('fanga() skriver NU-läget som sista post', avst(rec.steg(rec.langd - 1), sista) === 0, `langd ${rec.langd}`)

  const scen = new Container()
  const vy = new Container()
  scen.addChild(vy)
  const bar = scen.children.length
  let klar = 0
  const rep = rec.spelaUpp(vy, { fart: 0.4, spar: true, onKlar: () => klar++ })
  for (let i = 0; i < 40; i++) rep.tick(STEG)
  ok('spåret ritas som ett syskon strax BAKOM vy medan repriset går', scen.children.length === bar + 1 && scen.children[0] !== vy && scen.children[1] === vy, `${scen.children.length} barn · vy på plats ${scen.children.indexOf(vy)}`)
  rep.hoppa(); rep.hoppa()
  ok('M4 hoppa(): onKlar EXAKT en gång, vy på sista läget, spåret rivet', klar === 1 && rep.klar && avst(vy, sista) === 0 && scen.children.length === bar, `onKlar ${klar} · barn ${scen.children.length}`)
  ok('M4 tick efter slut gör ingenting', rep.tick(STEG) === false && avst(vy, sista) === 0, '')

  const vyb = new Container(); scen.addChild(vyb)
  let klar2 = 0
  const repb = rec.spelaUpp(vyb, { fart: 0.4, spar: true, onKlar: () => klar2++ })
  for (let i = 0; i < 10; i++) repb.tick(STEG)
  const mitt = scen.children.length
  repb.ta(); repb.ta()
  ok('M4 ta(): ingen onKlar, spåret rivet', klar2 === 0 && scen.children.length === mitt - 1, `onKlar ${klar2} · barn ${mitt} → ${scen.children.length}`)

  // M5: ticker-hakning + rec.ta() mitt i
  let lyss = 0
  const tick = { add: (f) => { tick.f = f; lyss++ }, remove: (f) => { if (tick.f === f) { tick.f = null; lyss-- } } }
  const vyc = new Container(); scen.addChild(vyc)
  let klar3 = 0
  const repc = rec.spelaUpp(vyc, { fart: 0.4, spar: true, ticker: tick, onKlar: () => klar3++ })
  for (let i = 0; i < 20; i++) tick.f({ deltaMS: STEG })
  const innan = scen.children.length
  rec.ta()
  ok('M5 rec.ta() mitt i repriset: ticker-lyssnaren borta, spåret rivet, ingen onKlar', lyss === 0 && repc.klar && klar3 === 0 && scen.children.length === innan - 1, `lyssnare ${lyss} · onKlar ${klar3}`)
  const n0 = rec.langd
  rec.start()
  for (let i = 0; i < 20; i++) phys.update(STEG)
  ok('M5 efter rec.ta() skriver kroken inget mer', rec.langd === n0 && rec.langd === 0, `langd ${rec.langd}`)

  // död vy mitt i: ny inspelning på en ny värld
  const b2 = bygg()
  const r2 = spelaIn(b2.phys, b2.kula)
  r2.start(); for (let i = 0; i < 100; i++) b2.phys.update(STEG)
  const vyd = new Container(); scen.addChild(vyd)
  let klar4 = 0
  const repd = r2.spelaUpp(vyd, { fart: 0.4, spar: true, onKlar: () => klar4++ })
  for (let i = 0; i < 5; i++) repd.tick(STEG)
  let kast = null
  vyd.destroy()
  try { repd.tick(STEG); repd.tick(STEG) } catch (e) { kast = e }
  ok('M5 vy dör mitt i (exit): tick() kastar inte, ingen onKlar, uppspelningen avslutad', !kast && repd.klar && klar4 === 0, kast ? String(kast) : 'ok')
  r2.ta()
}

for (const r of rader) console.log(`${r.ok ? '✓' : '✗'} ${r.namn}  — ${r.text}`)
process.exit(rader.every((r) => r.ok) ? 0 : 1)
