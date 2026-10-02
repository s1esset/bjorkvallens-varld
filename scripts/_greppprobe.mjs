// GREPPSONDEN (FYSIKPLAN G1 + G2) — prövar src/lib/grepp.js och src/lib/pekspar.js i Node.
//
//   node scripts/_greppprobe.mjs [--bara G2,S1,S2,S3,S4,S5]
//
// Ingen webbläsare och inget Pixi: `Grepp` pratar med pekhändelser via `pekGrepp` (lib/pekare.js),
// som bara rör `on/off/toLocal`, så en EventEmitter3-yta räcker. Fysiken är den RIKTIGA
// `PhysicsWorld` (samma fasta steg som spelen). `performance.now` ersätts med en virtuell klocka
// så att spårmätningen (90/130 ms) går att prova utan att vänta.
//
// KONTROLLARMARNA FÖRST — varje arm här har en motsvarighet som MÅSTE ge det kända svaret, annars
// mäter mätarmen ingenting och skriptet avslutar 1:
//   G2   en kopia av DAGENS `_slappFart` (före flytten) ger samma tal som `Pekspar` på slumpspår
//   S1   ett matter-`Constraint` som grepp SKA skena vid r²·m/I = 3,0 (grytan: 166 000°)
//   S2   utan krafttak SKA greppet trycka igenom/skjuta iväg (kontroll: ~56 px/steg på grytan)
//   S3   en teleport (`setPosition`) SKA ge ett hopp lika långt som avståndet — bärningen får inte
//   S4   (rivning) en kontroll utan `destroy()` SKA lämna lyssnare kvar
//   S5   utan kast-läge får en snärt INTE bli ett kast
import EventEmitter from 'eventemitter3'
import Matter from 'matter-js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { Grepp, drivPunkt, GREPP_K } from '../src/lib/grepp.js'
import { Pekspar, kastSteg, PX_MS_TILL_STEG } from '../src/lib/pekspar.js'

const { Body, Bodies, Composite, Constraint } = Matter
const arg = process.argv.slice(2)
const BARA = arg.includes('--bara') ? new Set(arg[arg.indexOf('--bara') + 1].toUpperCase().split(',')) : null
const vill = (id) => !BARA || BARA.has(id)

let fel = 0
const ok = (namn, v, d = '') => { console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`); if (!v) fel++ }
const kontroll = (namn, v, d = '') => {
  console.log(`  ${v ? '✓' : '✗'} KONTROLL ${namn}${d ? ' · ' + d : ''}`)
  if (!v) { console.log('  Kontrollarmen rörde sig inte — mätarmen efter den är ogiltig.'); process.exit(1) }
}
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : String(v))
const f3 = (v) => (Number.isFinite(v) ? v.toFixed(3) : String(v))

// ── virtuell klocka ──────────────────────────────────────────────────────────────────────────
let KLOCKA = 1000
Object.defineProperty(globalThis, 'performance', { value: { now: () => KLOCKA }, configurable: true, writable: true })
const STEG_MS = 1000 / 60

// ── falsk yta (som _pekareprobe) ─────────────────────────────────────────────────────────────
function yta() {
  const y = new EventEmitter()
  y.eventMode = 'passive'
  y.destroyed = false
  y.toLocal = (g) => ({ x: g.x, y: g.y })
  return y
}
const ev = (type, id, x, y) => ({ type, pointerId: id, global: { x, y } })
const skicka = (y, type, x, yy, id = 1) => y.emit(type, ev(type, id, x, yy))
const lyssnare = (y) => y.eventNames().reduce((n, k) => n + y.listenerCount(k), 0)
const beforeUpdateN = (phys) => (phys.engine.events.beforeUpdate || []).length

// ── värld ────────────────────────────────────────────────────────────────────────────────────
function varld({ g = 0 } = {}) {
  const phys = new PhysicsWorld({ gravityY: g, walls: [] })
  return phys
}
const stega = (phys, n = 1) => { for (let i = 0; i < n; i++) { phys.update(STEG_MS); KLOCKA += STEG_MS } }

// ═════════════════════════════════════════════════════════════════════════════════════════════
// G2 · Pekspar — flytten ur DragController får inte ändra ett tal
// ═════════════════════════════════════════════════════════════════════════════════════════════
// DAGENS `_slappFart`, ordagrant kopierad ur DragController före G2 (array-ringbuffert).
function gammalSlappFart(s, nu) {
  if (!s || s.length < 2) return null
  const sist = s[s.length - 1]
  if (nu - sist.t > 130) return null
  let i = s.length - 2
  while (i > 0 && sist.t - s[i].t < 90) i--
  if (i < s.length - 2 && sist.t - s[i].t > 2 * 90) i++
  const dt = sist.t - s[i].t
  if (!(dt > 0)) return null
  const vx = (sist.x - s[i].x) / dt
  const vy = (sist.y - s[i].y) / dt
  return { vx, vy, fart: Math.hypot(vx, vy), x: sist.x, y: sist.y }
}
const lika = (a, b) => (a === null && b === null) || (a && b && a.vx === b.vx && a.vy === b.vy && a.fart === b.fart && a.x === b.x && a.y === b.y)

if (vill('G2')) {
  console.log('\nG2 · Pekspar (spårmätningen flyttad ur DragController)')
  // Syntetiska spår — kända svar.
  const bygg = (prov) => { const p = new Pekspar(); for (const [t, x, y] of prov) p.lagg(t, x, y); return p }
  // 1. snärt efter långsamt drag: 10 px/16 ms länge, sedan 30 px/16 ms på slutet
  let sp = bygg([[0, 0, 0], [16, 10, 0], [32, 20, 0], [48, 30, 0], [64, 40, 0], [80, 70, 0], [96, 100, 0], [112, 130, 0]])
  const sn = sp.fart(115)
  ok('snärt efter långsamt drag → fart (≥ 2× långsamma fasen 0,625 px/ms)', sn && sn.fart > 1.25, `${sn ? f3(sn.fart) : null} px/ms`)
  ok('px/ms × 16,67 = px/steg, klämt till max', Math.abs(kastSteg(sn, 18).fart - Math.min(18, sn.fart * PX_MS_TILL_STEG)) < 1e-9, `${f1(kastSteg(sn, 18).fart)} px/steg (max 18)`)
  // 2. stilla en halv sekund före släpp → null
  ok('stilla en halv sekund före släpp → null', sp.fart(112 + 500) === null)
  // 3. paus (220 ms) mitt i draget, sedan snärt: får inte spädas ut mot noll
  sp = bygg([[0, 0, 0], [220, 40, 0], [236, 70, 0], [252, 100, 0]])
  const paus = sp.fart(255)
  ok('snärt efter 220 ms paus späds inte ut (> 1 px/ms)', paus && paus.fart > 1, `${paus ? f3(paus.fart) : null} px/ms (utspätt vore ~0,3)`)
  ok('för få prov → null', new Pekspar().fart(0) === null && bygg([[0, 1, 1]]).fart(5) === null)
  // 4. identitet mot dagens kod på 20 000 slumpspår
  let n = 0
  let skild = 0
  let rors = 0
  let seed = 12345
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  for (let k = 0; k < 20000; k++) {
    const len = 2 + Math.floor(rnd() * 9)
    const arr = []
    const p = new Pekspar()
    let t = 0
    let x = rnd() * 1000
    let y = rnd() * 700
    for (let i = 0; i < len; i++) {
      t += rnd() < 0.2 ? 90 + rnd() * 300 : 5 + rnd() * 30 // ibland en paus
      x += (rnd() - 0.5) * 80
      y += (rnd() - 0.5) * 80
      arr.push({ t, x, y })
      p.lagg(t, x, y)
      if (arr.length > 6) arr.shift() // KAST_PROV
    }
    const nu = t + (rnd() < 0.25 ? 100 + rnd() * 600 : rnd() * 40)
    const a = gammalSlappFart(arr, nu)
    const b = p.fart(nu)
    n++
    if (!lika(a, b)) skild++
    if (a) rors++
  }
  ok('Pekspar ≡ dagens _slappFart på 20 000 slumpspår', skild === 0 && rors > 5000, `${n} spår, ${skild} skilda, ${rors} gav ett kast (kontroll: talet ska inte vara 0)`)
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// S1 · r²·m/I ∈ {0,5; 1; 3} — Grepp mot matter-Constraint
// ═════════════════════════════════════════════════════════════════════════════════════════════
// En tät KÄRNA (40×40, tung) med en lätt ARM genom mitten (600×6): massan och tröghetsradien
// ρ = √(I/m) ≈ 33 px bestäms av kärnan, och greppunkten sitter på armen på avstånd r = ρ·√kvot
// (matters egen tröghet — den är 4× större än den skolboksformeln, så en tunn planka når bara 0,75).
// Så får man EXAKT r²·m/I = 0,5 / 1 / 3 med greppunkten på själva kroppen, som `Karl`s bygel.
const KVOTER = [0.5, 1, 3]
function byggKropp(phys) {
  const karna = Bodies.rectangle(500, 360, 40, 40, { density: 0.01 })
  const arm = Bodies.rectangle(500, 360, 600, 6, { density: 0.000001 })
  return phys.sammansatt([karna, arm], { frictionAir: 0.01 })
}
const kvot = (b, r) => (r * r) * b.mass / b.inertia

// Fingrets väg. 'ryck': ett enda ryck (40, −30) på 5 steg, sedan STILLA — här finns ingen
// energikälla alls, så ett grepp som ändå får kroppen att snurra upp sig är instabilt (Constraint
// vid r²m/I 3,0: grytans 166 000°). 'vick': 5 sekunder av en vickande hand — mäter att greppet
// FÖLJER fingret, inte stabilitet.
function fingerVag(t, x0, y0, lage = 'ryck') {
  if (lage === 'ryck') {
    const k = Math.min(1, t / 5)
    return { x: x0 + 40 * k, y: y0 - 30 * k }
  }
  if (t < 30) return { x: x0 + 250 * (t / 30), y: y0 - 100 * (t / 30) }
  if (t < 150) return { x: x0 + 250 + 60 * Math.sin((t - 30) * 0.5), y: y0 - 100 + 40 * Math.sin((t - 30) * 0.37) }
  return { x: x0 + 250, y: y0 - 100 }
}
const STEG_S1 = 300

function s1Grepp(kv, opt = {}, lage = 'ryck') {
  const phys = varld({ g: 0 })
  const b = byggKropp(phys)
  const r = Math.sqrt(kv * b.inertia / b.mass)
  const y = yta()
  const gr = new Grepp({ phys, yta: y, kroppar: () => [b], halo: 0, punkt: 'fingret', ...opt })
  const gx = b.position.x + r
  const gy = b.position.y
  skicka(y, 'pointerdown', gx, gy)
  let maxW = 0
  let slutW = 0
  let maxV = 0
  let nan = false
  for (let t = 0; t < STEG_S1; t++) {
    const p = fingerVag(t, gx, gy, lage)
    skicka(y, 'globalpointermove', p.x, p.y)
    stega(phys)
    maxW = Math.max(maxW, Math.abs(b.angularVelocity))
    if (t >= STEG_S1 - 50) slutW = Math.max(slutW, Math.abs(b.angularVelocity))
    maxV = Math.max(maxV, Math.hypot(b.velocity.x, b.velocity.y))
    if (!Number.isFinite(b.position.x) || !Number.isFinite(b.angle)) nan = true
  }
  // Var är greppunkten jämfört med fingret?
  const fp = fingerVag(STEG_S1 - 1, gx, gy, lage)
  const rl = gr._h ? gr._h.rLok : { x: 0, y: 0 }
  const rw = { x: rl.x * Math.cos(b.angle) - rl.y * Math.sin(b.angle), y: rl.x * Math.sin(b.angle) + rl.y * Math.cos(b.angle) }
  const fel = Math.hypot(b.position.x + rw.x - fp.x, b.position.y + rw.y - fp.y)
  const q = kvot(b, r)
  gr.destroy()
  phys.destroy()
  return { maxW, slutW, maxV, nan, fel, q, grader: b.angle * 180 / Math.PI }
}

// stiffness 1 = matters förval för ett nollängdsvillkor (och det grytan hade). Effektiv massa saknar
// r²-termen, så korrektionen per varv är ~stiffness·(1 + r²m/I): över 2 skjuter den ÖVER.
function s1Constraint(kv, stiffness = 1, damping = 0, lage = 'ryck') {
  const phys = varld({ g: 0 })
  const b = byggKropp(phys)
  const r = Math.sqrt(kv * b.inertia / b.mass)
  const gx = b.position.x + r
  const gy = b.position.y
  const c = Constraint.create({ pointA: { x: gx, y: gy }, bodyB: b, pointB: { x: r, y: 0 }, stiffness, damping, length: 0 })
  Composite.add(phys.world, c)
  let maxW = 0
  let slutW = 0
  let nan = false
  for (let t = 0; t < STEG_S1; t++) {
    const p = fingerVag(t, gx, gy, lage)
    c.pointA.x = p.x
    c.pointA.y = p.y
    stega(phys)
    maxW = Math.max(maxW, Math.abs(b.angularVelocity))
    if (t >= STEG_S1 - 50) slutW = Math.max(slutW, Math.abs(b.angularVelocity))
    if (!Number.isFinite(b.position.x) || !Number.isFinite(b.angle)) nan = true
  }
  const q = kvot(b, r)
  phys.destroy()
  return { maxW, slutW, nan, q, grader: b.angle * 180 / Math.PI }
}

if (vill('S1')) {
  console.log('\nS1 · r²·m/I ∈ {0,5; 1; 3} — Grepp mot matter-Constraint (stiffness 1 = matters förval för nollängd)')
  console.log("  ryck = ett enda ryck på fingret, sedan stilla (ingen energikälla): max|ω| över 300 steg · max|ω| de sista 50")
  const rader = []
  for (const mal of KVOTER) {
    const c = s1Constraint(mal)
    const g = s1Grepp(mal)
    rader.push({ mal, c, g })
    console.log(`  r²m/I ${f1(c.q)}: Constraint ${c.nan ? 'NaN' : f3(c.maxW)} / ${c.nan ? 'NaN' : f3(c.slutW)} (${c.nan ? 'NaN' : Math.round(c.grader)}°)  ·  Grepp ${g.nan ? 'NaN' : f3(g.maxW)} / ${g.nan ? 'NaN' : f3(g.slutW)} (${Math.round(g.grader)}°, toppfart ${f1(g.maxV)}, ${f1(g.fel)} px från fingret)`)
  }
  const c3 = rader[2].c
  const c05 = rader[0].c
  kontroll('matter-Constraint SKENAR vid r²m/I = 3,0 (NaN, eller slut-ω ≥ 5× större än vid 0,5, eller ≥ 0,1)', c3.nan || c3.slutW >= 5 * Math.max(c05.slutW, 1e-4) || c3.slutW >= 0.1, `slut-ω ${c3.nan ? 'NaN' : f3(c3.slutW)} mot ${f3(c05.slutW)} vid 0,5`)
  for (const { mal, g, c } of rader) {
    ok(`Grepp r²m/I ${mal}: stabilt (inga NaN, slut-ω < 0,01 rad/steg)`, !g.nan && g.slutW < 0.01, `max|ω| ${f3(g.maxW)} · slut ${f3(g.slutW)}`)
    ok(`Grepp r²m/I ${mal}: greppunkten hamnar på fingret (≤ 2 px)`, g.fel <= 2, `${f1(g.fel)} px`)
  }
  ok('Grepp r²m/I 3,0: slut-ω ≥ 10× lugnare än Constraint', c3.nan || rader[2].g.slutW * 10 <= c3.slutW, `${f3(rader[2].g.slutW)} mot ${c3.nan ? 'NaN' : f3(c3.slutW)}`)
  // en vickande hand: greppet FÖLJER, och spinner aldrig upp sig bortom vad handen ger
  for (const mal of KVOTER) {
    const g = s1Grepp(mal, {}, 'vick')
    ok(`Grepp r²m/I ${mal}, vickande hand: följer (≤ 12 px) och |ω| ≤ 0,5`, !g.nan && g.fel <= 12 && g.maxW <= 0.5, `${f1(g.fel)} px · max|ω| ${f3(g.maxW)} · toppfart ${f1(g.maxV)}`)
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// S2 · grepp mot ett statiskt golv, med och utan krafttak
// ═════════════════════════════════════════════════════════════════════════════════════════════
function s2(opt, { tryckTill = 700, steg = 240 } = {}) {
  const phys = varld({ g: 1 })
  const golvY = 500
  phys.rectangle(640, golvY + 30, 1200, 60, { isStatic: true }) // ovansida y 500, undersida 560
  const b = phys.rectangle(640, golvY - 40 - 0.5, 160, 80, { density: 0.002 })
  stega(phys, 60) // låt den lägga sig
  const y = yta()
  const gr = new Grepp({ phys, yta: y, kroppar: () => [b], halo: 0, punkt: 'fingret', ...opt })
  const gx = b.position.x
  const gy = b.position.y
  skicka(y, 'pointerdown', gx, gy)
  let maxDjup = 0
  let maxV = 0
  let ut = false
  for (let t = 0; t < steg; t++) {
    // fingret rycker ned genom golvet på 10 steg och hålls kvar där
    const k = Math.min(1, t / 10)
    // ... och dras sedan 500 px längs golvet (som `_popcornhandtag` K2: tryck ned i bordet, dra längs det)
    const sido = t < 60 ? 0 : Math.min(1, (t - 60) / 60) * 500
    skicka(y, 'globalpointermove', gx + sido, gy + (tryckTill - gy) * k)
    stega(phys)
    const botten = b.bounds.max.y
    maxDjup = Math.max(maxDjup, botten - golvY)
    maxV = Math.max(maxV, Math.hypot(b.velocity.x, b.velocity.y))
    if (b.position.y > golvY + 60 || !Number.isFinite(b.position.y)) ut = true
  }
  const slutX = b.position.x
  gr.destroy()
  phys.destroy()
  return { maxDjup, maxV, ut, slutX }
}

if (vill('S2')) {
  console.log('\nS2 · grepp mot ett statiskt golv (80 px hög låda: finger rycker 200 px under golvet, och dras sedan 500 px längs det)')
  const utan = s2({ tak: null })
  const med = s2({}) // TAK_FORVAL
  const lugn = s2({ tak: { dv: 1.5, v: 10 } })
  console.log(`  utan tak:        genomträngning max ${f1(utan.maxDjup)} px · toppfart ${f1(utan.maxV)} px/steg · genom golvet ${utan.ut}`)
  console.log(`  TAK_FORVAL 3/22: genomträngning max ${f1(med.maxDjup)} px · toppfart ${f1(med.maxV)} px/steg · genom golvet ${med.ut}`)
  console.log(`  tak 1,5/10:      genomträngning max ${f1(lugn.maxDjup)} px · toppfart ${f1(lugn.maxV)} px/steg · genom golvet ${lugn.ut}`)
  kontroll('utan tak: skjuter iväg/trycker igenom (toppfart ≥ 40 px/steg eller genom golvet)', utan.maxV >= 40 || utan.ut, `${f1(utan.maxV)} px/steg, genom ${utan.ut}`)
  ok('med TAK_FORVAL: toppfart ≤ 22 + 5 px/steg (tunnlingsgränsen är ~40)', med.maxV <= 27, `${f1(med.maxV)}`)
  ok('med TAK_FORVAL: stannar ovanför golvets undersida (inte genom)', !med.ut, `djup ${f1(med.maxDjup)} px av 60`)
  ok('med TAK_FORVAL: ≥ 3× mindre toppfart än utan tak', med.maxV * 3 <= utan.maxV, `${f1(med.maxV)} mot ${f1(utan.maxV)}`)
  ok('lugnare tak ger lugnare grepp', lugn.maxV <= med.maxV + 0.5, `${f1(lugn.maxV)} ≤ ${f1(med.maxV)}`)
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// S3 · tap-tap: markera → mål → handen bär dit
// ═════════════════════════════════════════════════════════════════════════════════════════════
function tapp(y, x, yy) { // ett tryck: ned + upp utan rörelse
  skicka(y, 'pointerdown', x, yy)
  skicka(y, 'pointerup', x, yy)
}

if (vill('S3')) {
  console.log('\nS3 · tap-tap (lådan på ett golv, mål 450 px bort och 200 px upp)')
  // KONTROLLARM: en teleport ger ett hopp lika långt som avståndet.
  {
    const phys = varld({ g: 1 })
    const b = phys.rectangle(300, 400, 100, 100, { density: 0.002 })
    const fran = { x: b.position.x, y: b.position.y }
    Body.setPosition(b, { x: 750, y: 200 })
    const hopp = Math.hypot(b.position.x - fran.x, b.position.y - fran.y)
    kontroll('en teleport hoppar hela avståndet i ETT steg', hopp > 400, `${f1(hopp)} px`)
    phys.destroy()
  }
  const phys = varld({ g: 1 })
  phys.rectangle(640, 700, 1280, 40, { isStatic: true }) // golv, ovansida y 680
  const b = phys.rectangle(300, 630, 100, 100, { density: 0.002 })
  const y = yta()
  const logg = []
  const gr = new Grepp({
    phys, yta: y, kroppar: () => [b], halo: 24, tapTap: true, hitArea: { contains: () => true },
    onLyft: (k) => logg.push('lyft'),
    onMarkera: () => logg.push('markera'),
    onAvmarkera: () => logg.push('avmarkera'),
    onSlapp: (k, i) => logg.push(i.tapTap ? (i.framme ? 'framme' : 'stannade') : 'slapp'),
  })
  stega(phys, 60)
  ok('trycker på ingenting utan markering gör ingenting', (tapp(y, 900, 300), gr.markerad === null && gr.bar === null && logg.length === 0))
  tapp(y, b.position.x, b.position.y)
  ok('första trycket: onLyft vid nedtrycket, sedan markerad', gr.markerad === b && logg[0] === 'lyft' && logg.includes('markera'), logg.join(','))
  tapp(y, b.position.x, b.position.y)
  ok('tryck på den markerade igen avmarkerar', gr.markerad === null && logg.includes('avmarkera'), logg.join(','))
  tapp(y, b.position.x, b.position.y)
  const mal = { x: 750, y: 430 }
  const start = { x: b.position.x, y: b.position.y }
  tapp(y, mal.x, mal.y)
  ok('andra trycket sätter ett mål: handen bär kroppen', gr.bar === b && gr.markerad === null)
  let maxV = 0
  let maxHopp = 0
  let prev = { x: b.position.x, y: b.position.y }
  let framme = -1
  let hand = 0
  for (let t = 0; t < 900; t++) {
    stega(phys)
    const v = Math.hypot(b.velocity.x, b.velocity.y)
    maxV = Math.max(maxV, v)
    maxHopp = Math.max(maxHopp, Math.hypot(b.position.x - prev.x, b.position.y - prev.y))
    prev = { x: b.position.x, y: b.position.y }
    if (gr.bar) hand = t
    if (framme < 0 && logg.includes('framme')) { framme = t; break }
  }
  const slutAvst = Math.hypot(b.position.x - mal.x, b.position.y - mal.y)
  const dist = Math.hypot(mal.x - start.x, mal.y - start.y)
  ok('kroppen når målet inom 6 px och handen släpper', framme >= 0 && slutAvst <= 6, `${framme} steg · ${f1(slutAvst)} px kvar av ${f1(dist)}`)
  ok('farten överskrider aldrig taket (tak.v 22, bärfart 9 → ≤ 11)', maxV <= 11, `toppfart ${f1(maxV)} px/steg`)
  ok('aldrig en teleport: största steget ≪ avståndet', maxHopp <= 12 && maxHopp < dist / 20, `största steg ${f1(maxHopp)} px mot avstånd ${f1(dist)}`)
  ok('onSlapp kom med framme:true exakt en gång', logg.filter((x) => x === 'framme').length === 1, logg.join(','))
  // mål nekat av onMal
  {
    const ph2 = varld({ g: 1 })
    ph2.rectangle(640, 700, 1280, 40, { isStatic: true })
    const b2 = ph2.rectangle(300, 630, 100, 100, { density: 0.002 })
    const y2 = yta()
    const g2 = new Grepp({ phys: ph2, yta: y2, kroppar: () => [b2], tapTap: true, hitArea: { contains: () => true }, onMal: (k, p) => (p.x > 600 ? false : { x: p.x, y: 630 }) })
    stega(ph2, 60)
    tapp(y2, 300, 630)
    tapp(y2, 900, 300)
    ok('onMal → false nekar målet (kroppen förblir markerad, ingen bärning)', g2.markerad === b2 && g2.bar === null)
    tapp(y2, 450, 300)
    ok('onMal kan snäppa målet (tryck på y 300 → målet y 630)', g2.bar === b2 && g2._bar.mal.y === 630 && g2._bar.mal.x === 450, JSON.stringify(g2._bar?.mal))
    g2.destroy()
    ph2.destroy()
  }
  // fastnat: en vägg i vägen → släpper efter barStall utan framsteg, aldrig genom väggen
  {
    const ph3 = varld({ g: 1 })
    ph3.rectangle(640, 700, 1280, 40, { isStatic: true })
    ph3.rectangle(500, 450, 40, 500, { isStatic: true }) // vägg x 480–520, y 200–700
    const b3 = ph3.rectangle(300, 630, 100, 100, { density: 0.002 })
    const y3 = yta()
    const l3 = []
    const g3 = new Grepp({ phys: ph3, yta: y3, kroppar: () => [b3], tapTap: true, barStall: 60, hitArea: { contains: () => true }, onSlapp: (k, i) => i.tapTap && l3.push(i.framme ? 'framme' : 'stannade') })
    stega(ph3, 60)
    tapp(y3, 300, 630)
    tapp(y3, 800, 630)
    let maxX = 0
    let maxV3 = 0
    for (let t = 0; t < 600 && !l3.length; t++) { stega(ph3); maxX = Math.max(maxX, b3.position.x); maxV3 = Math.max(maxV3, Math.hypot(b3.velocity.x, b3.velocity.y)) }
    ok('blockerad bärning släpps efter barStall utan framsteg, tunnlar inte genom väggen', l3[0] === 'stannade' && maxX < 480, `${l3.join(',')} · x max ${f1(maxX)} (vägg vid 480) · toppfart ${f1(maxV3)}`)
    g3.destroy()
    ph3.destroy()
  }
  gr.destroy()
  phys.destroy()
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// S4 · rivning mitt i greppet
// ═════════════════════════════════════════════════════════════════════════════════════════════
if (vill('S4')) {
  console.log('\nS4 · destroy() mitt i ett grepp (och mitt i en bärning)')
  const kor = (rivMed) => {
    const phys = varld({ g: 1 })
    phys.rectangle(640, 700, 1280, 40, { isStatic: true })
    const b = phys.rectangle(300, 630, 100, 100, { density: 0.002, collisionFilter: { group: 0, category: 1, mask: 0xffffffff } })
    const y = yta()
    const fore = { l: lyssnare(y), s: beforeUpdateN(phys) }
    const logg = []
    const gr = new Grepp({ phys, yta: y, kroppar: () => [b], tapTap: true, grupp: -9, hitArea: { contains: () => true }, onLyft: () => logg.push('lyft'), onSlapp: () => logg.push('slapp') })
    const under = { l: lyssnare(y), s: beforeUpdateN(phys), grupp: null }
    skicka(y, 'pointerdown', 300, 630)
    skicka(y, 'globalpointermove', 400, 500)
    stega(phys, 5)
    under.grupp = b.collisionFilter.group
    rivMed(gr)
    const efter = { l: lyssnare(y), s: beforeUpdateN(phys), grupp: b.collisionFilter.group }
    const anrop = logg.length
    // fortsatt aktivitet efter riven: inget kastar, inga callbacks, kroppen drivs inte
    let kastade = false
    try {
      skicka(y, 'globalpointermove', 700, 100)
      skicka(y, 'pointerup', 700, 100)
      skicka(y, 'pointerdown', b.position.x, b.position.y)
      stega(phys, 30)
    } catch (e) { kastade = e.message }
    return { fore, under, efter, nya: logg.length - anrop, kastade, grupp: b.collisionFilter.group, y: b.position.y }
  }
  const utanRiv = kor(() => {})
  kontroll('utan destroy() ligger lyssnare/krok kvar', utanRiv.efter.l > utanRiv.fore.l && utanRiv.efter.s > utanRiv.fore.s, `lyssnare ${utanRiv.fore.l}→${utanRiv.efter.l}, beforeUpdate ${utanRiv.fore.s}→${utanRiv.efter.s}`)
  const riv = kor((gr) => gr.destroy())
  console.log(`  före ${riv.fore.l} lyssnare/${riv.fore.s} krokar · under ${riv.under.l}/${riv.under.s} · efter destroy ${riv.efter.l}/${riv.efter.s}`)
  ok('destroy: alla lyssnare borta', riv.efter.l === riv.fore.l, `${riv.efter.l}`)
  ok('destroy: beforeStep-kroken borta', riv.efter.s === riv.fore.s, `${riv.efter.s}`)
  ok('destroy: collisionFilter.group återställd (var -9 under greppet)', riv.under.grupp === -9 && riv.grupp === 0, `${riv.under.grupp} → ${riv.grupp}`)
  ok('destroy: inga callbacks och inga kast efteråt', riv.nya === 0 && !riv.kastade, `${riv.nya} anrop, ${riv.kastade || 'inga fel'}`)
  // bärning
  {
    const phys = varld({ g: 1 })
    phys.rectangle(640, 700, 1280, 40, { isStatic: true })
    const b = phys.rectangle(300, 630, 100, 100, { density: 0.002 })
    const y = yta()
    const fore = { l: lyssnare(y), s: beforeUpdateN(phys) }
    const gr = new Grepp({ phys, yta: y, kroppar: () => [b], tapTap: true, hitArea: { contains: () => true } })
    tapp(y, 300, 630)
    tapp(y, 800, 300)
    stega(phys, 20)
    const bar = !!gr.bar
    gr.destroy()
    const v0 = { x: b.velocity.x, y: b.velocity.y }
    stega(phys, 1)
    ok('destroy mitt i en bärning: kroken borta och handen släpper', bar && lyssnare(y) === fore.l && beforeUpdateN(phys) === fore.s && gr.bar === null, `bar ${bar}`)
    // riven FYSIK före riven Grepp
    const phys2 = varld({ g: 1 })
    const b2 = phys2.rectangle(300, 300, 50, 50)
    const y2 = yta()
    const gr2 = new Grepp({ phys: phys2, yta: y2, kroppar: () => [b2] })
    skicka(y2, 'pointerdown', 300, 300)
    phys2.destroy()
    let k2 = false
    try { gr2.destroy(); skicka(y2, 'pointerup', 300, 300) } catch (e) { k2 = e.message }
    ok('destroy efter riven fysik kastar inte', !k2, k2 || '')
    phys.destroy()
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// S5 · kast ur draget (G2 genom Grepp), halo, ett finger
// ═════════════════════════════════════════════════════════════════════════════════════════════
if (vill('S5')) {
  console.log('\nS5 · kast, halo och pekar-id')
  const drag = (opt, { fart = 25, stilla = 0, steg = 6 } = {}) => {
    const phys = varld({ g: 0 })
    const b = phys.circle(300, 360, 50, { density: 0.001, frictionAir: 0 })
    const y = yta()
    const logg = []
    const gr = new Grepp({ phys, yta: y, kroppar: () => [b], onSlapp: (k, i) => logg.push(i), ...opt })
    skicka(y, 'pointerdown', 300, 360)
    let x = 300
    // långsamt drag först
    for (let t = 0; t < 20; t++) { x += 3; skicka(y, 'globalpointermove', x, 360); stega(phys) }
    // snärt
    for (let t = 0; t < steg; t++) { x += fart; skicka(y, 'globalpointermove', x, 360 - 0.4 * fart * t); stega(phys) }
    if (stilla) stega(phys, Math.round(stilla / STEG_MS)) // fingret står still före släppet
    skicka(y, 'pointerup', x, 360)
    const v = { x: b.velocity.x, y: b.velocity.y, fart: Math.hypot(b.velocity.x, b.velocity.y) }
    gr.destroy()
    phys.destroy()
    return { v, info: logg[0] }
  }
  const utanKast = drag({})
  kontroll('utan kast-läge blir en snärt INTE ett kast', utanKast.info && utanKast.info.kast === null, `kast ${JSON.stringify(utanKast.info?.kast)} · släppfart ${f1(utanKast.v.fart)} px/steg (tak.v 22)`)
  const medKast = drag({ kast: { max: 18 } })
  ok('snärt med kast: släppfart = fingrets fart klämd till max (18 px/steg)', medKast.info?.kast && Math.abs(medKast.v.fart - 18) < 0.01, `${f1(medKast.v.fart)} px/steg`)
  ok('kastet pekar åt fingrets håll (höger, uppåt)', medKast.v.x > 10 && medKast.v.y < 0, `(${f1(medKast.v.x)}, ${f1(medKast.v.y)})`)
  const lugnKast = drag({ kast: { max: 18 } }, { fart: 2, steg: 6 })
  ok('långsamt drag med kast-läge blir inget kast (under min 6 px/steg)', lugnKast.info && lugnKast.info.kast === null, `kast ${JSON.stringify(lugnKast.info?.kast)}`)
  const stillaKast = drag({ kast: { max: 18 } }, { stilla: 500 })
  ok('snärt + 500 ms stilla före släpp blir inget kast (spåret förfaller)', stillaKast.info && stillaKast.info.kast === null, `kast ${JSON.stringify(stillaKast.info?.kast)}`)

  // halo
  {
    const phys = varld({ g: 0 })
    const b = phys.rectangle(500, 360, 100, 100)
    const y = yta()
    const gr = new Grepp({ phys, yta: y, kroppar: () => [b], halo: 24 })
    skicka(y, 'pointerdown', 500 + 50 + 20, 360)
    const inne = gr.aktiv
    skicka(y, 'pointerup', 570, 360)
    skicka(y, 'pointerdown', 500 + 50 + 30, 360)
    const ute = gr.aktiv
    skicka(y, 'pointerup', 580, 360)
    ok('halo 24: 20 px utanför greppar, 30 px utanför gör det inte', inne && !ute, `${inne}/${ute}`)
    // greppunkten i halon ligger på ytan, inte i fingret → ingen hävarm längre än kroppen
    skicka(y, 'pointerdown', 570, 360)
    const rl = gr._h.rLok
    ok("'fingret' i halon tar närmaste ytpunkt (r = 50, inte 70)", Math.abs(Math.hypot(rl.x, rl.y) - 50) < 0.5, `r ${f1(Math.hypot(rl.x, rl.y))}`)
    // ett andra finger påverkar inte
    skicka(y, 'globalpointermove', 700, 100, 2)
    stega(phys, 5)
    ok('ett andra finger (id 2) drar inte kroppen', Math.hypot(b.position.x - 500, b.position.y - 360) < 5, `${f1(b.position.x)},${f1(b.position.y)}`)
    skicka(y, 'pointerup', 570, 360)
    gr.destroy()
    phys.destroy()
  }
  // punkt: 'mitten' har r = 0
  {
    const phys = varld({ g: 0 })
    const b = phys.rectangle(500, 360, 100, 100)
    const y = yta()
    const gr = new Grepp({ phys, yta: y, kroppar: () => [b], punkt: 'mitten' })
    skicka(y, 'pointerdown', 530, 380)
    const rl = gr._h.rLok
    for (let t = 0; t < 60; t++) { skicka(y, 'globalpointermove', 530 + t * 4, 380); stega(phys) }
    ok("punkt 'mitten': r = 0, ingen vridning av en kropp som dras rakt", Math.hypot(rl.x, rl.y) < 1e-9 && Math.abs(b.angle) < 1e-6, `r ${f3(Math.hypot(rl.x, rl.y))}, vinkel ${f3(b.angle)}`)
    ok("punkt 'mitten': kroppen följer fingret med sin relativa förskjutning", Math.abs(b.position.x - (500 + 59 * 4)) < 15, `x ${f1(b.position.x)}`)
    gr.destroy()
    phys.destroy()
  }
  // fartTak per kropp
  {
    const farter = [4, 22].map((tak) => {
      const phys = varld({ g: 0 })
      const b = phys.circle(300, 360, 40, { density: 0.001, frictionAir: 0 })
      const y = yta()
      const gr = new Grepp({ phys, yta: y, kroppar: () => [b], fartTak: () => tak })
      skicka(y, 'pointerdown', 300, 360)
      let mx = 0
      for (let t = 0; t < 60; t++) { skicka(y, 'globalpointermove', 300 + t * 20, 360); stega(phys); mx = Math.max(mx, Math.hypot(b.velocity.x, b.velocity.y)) }
      gr.destroy()
      phys.destroy()
      return mx
    })
    ok('fartTak(b) begränsar draghastigheten per kropp (tung 4 mot lätt 22)', farter[0] <= 4.5 && farter[1] > 10, `${f1(farter[0])} / ${f1(farter[1])} px/steg`)
  }
}

console.log(fel ? `\n${fel} FEL` : '\nALLT GRÖNT')
process.exit(fel ? 1 : 0)
