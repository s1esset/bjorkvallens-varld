// FJÄDERBRÄDE-SOND — kastar bräddan iväg kulan på riktigt, och lagom mycket?
//
//   node scripts/_fjaderprobe.mjs            (ingen webbläsare, ~1 s)
//
// Sonden släpper kulan från fem höjder rakt ner på plankan och mäter tre saker som
// inte går att resonera fram: hur djupt bräddan pressas, hur högt kulan far, och att
// det finns ett TAK. Referensarmen är den STYVA plattan (`restitution: 0.95`) som
// spelet hade före fjädern — annars är "det känns studsigare" bara en åsikt.
//
// Enheterna är matters: fart i px/STEG (inte px/s), och accelerationen ur
// gravitationen är g · 0,001 · 277,78 ≈ 0,306 px/steg² vid gravityY 1,1.
import Matter from 'matter-js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { Fjaderbrada } from '../src/lib/fjader.js'

const { Body } = Matter

// Samma tal som kulbana använder — sonden ska mäta spelets bräda, inte en egen.
const PLANK = { x: 640, y: 400, w: 140, h: 32 }
const BALL = { r: 26, restitution: 0.42, friction: 0.03, frictionAir: 0.006, density: 0.0013 }
const GRAV = 1.1
const HOJDER = [20, 60, 140, 260, 400]

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const stigande = (a) => a.every((v, i) => i === 0 || v > a[i - 1])

// Ett släpp. `fjader: null` = den styva referensplattan.
function slapp({ hojd, vinkel = 0, fjader = null, rest = 0.95, steg = 300 }) {
  const v = new PhysicsWorld({ gravityY: GRAV, walls: [] })
  const plank = v.rectangle(PLANK.x, PLANK.y, PLANK.w, PLANK.h, { isStatic: true, restitution: rest, friction: 0.04, label: 'bounce' })
  Body.setAngle(plank, vinkel)
  const startY = PLANK.y - PLANK.h / 2 - BALL.r - hojd
  const kula = v.circle(PLANK.x, startY, BALL.r, { ...BALL, label: 'ball' })

  // ANSLAGET MÄTS PÅ FÖRSTA KONTAKTEN, inte som max över alla. Sonden tog först
  // maxvärdet och fick en icke-monoton kurva (fall 60 px gav 9,8 px/steg, fall 140 px
  // bara 8,7) — helt sant, och helt oanvändbart: en bräda som kastar upp kulan får den
  // tillbaka och den ANDRA träffen kan vara hårdare än den första.
  const m = { anslag: 0, djup: 0, utfart: 0, topp: Infinity, driftX: 0, kontakter: 0, last: 0 }
  v.onCollision((e) => {
    for (const p of e.pairs) {
      const par = p.bodyA === kula || p.bodyB === kula
      if (!par) continue
      const annan = p.bodyA === kula ? p.bodyB : p.bodyA
      if (annan !== plank) continue
      m.kontakter++
      if (!fjader) {
        if (m.kontakter === 1) m.anslag = Math.hypot(kula.velocity.x, kula.velocity.y)
        continue
      }
      const vn = fjader.anslagsfart(kula, vinkel)
      const last = fjader.taEmot(kula, vinkel)
      if (m.kontakter === 1) {
        m.anslag = vn
        m.last = last
      }
    }
  })
  if (fjader) v.beforeStep(() => fjader.steg() && fjader.driv(plank, PLANK.x, PLANK.y, vinkel))

  // FÖRSTA KASTET mäts, inte det högsta under hela körningen: bräddan tar emot kulan
  // igen när den kommer ner, och tre studsar i rad trappar upp mot taket (se 2c) —
  // mätt över hela körningen rapporterade den här sektionen platån (275 px) för varje
  // fallhöjd, alltså samma tal fem gånger med olika etiketter. Kastet slutar vid
  // VÄNDPUNKTEN (farten byter tecken); "första kontakten" duger inte som gräns,
  // eftersom det är den ANDRA kontakten — mattan på väg upp — som är själva utkastet.
  let stiger = false
  let klar = false
  for (let i = 0; i < steg && !klar; i++) {
    v.update(1000 / 60)
    if (fjader && !stiger) m.djup = Math.max(m.djup, fjader.komp)
    if (m.kontakter === 0) continue
    const vy = kula.velocity.y
    if (vy < -0.05) {
      stiger = true
      m.utfart = Math.max(m.utfart, -vy)
      if (kula.position.y < m.topp) {
        m.topp = kula.position.y
        m.driftX = kula.position.x - PLANK.x // sidodriften läses I TOPPEN av kastet
      }
    } else if (stiger) {
      klar = true
    }
  }
  m.lyft = m.topp === Infinity ? 0 : PLANK.y - PLANK.h / 2 - BALL.r - m.topp // px över plankans yta
  v.destroy()
  return m
}

console.log('\nFJÄDERBRÄDA — kastar den iväg kulan, och med tak?\n')

// 0. VARFÖR BRÄDDAN ÖVER HUVUD TAGET BEHÖVS. `restitution` på en STATISK kropp är en
//    nullhandling i hela repot: `PhysicsWorld._make` skapar kroppen dynamisk och sätter
//    den statisk efteråt (för att undvika NaN-buggen), och matters `Body.setStatic`
//    NOLLAR då restitution och sätter friction till 1 (originalen läggs i `_original`).
//    Studsplattans `restitution: 0.95` har alltså aldrig gjort något — plattan studsade
//    exakt som en ramp, och det är den kulans EGNA 0,42 som avgjort allt.
//    Håll kvar mätningen här: fixas `_make` någon gång ändras 23 spel samtidigt, och då
//    ska det synas som ett brutet mått och inte som en gåta.
console.log('0. Statisk restitution (varför fjädern behövs)')
{
  const v = new PhysicsWorld({ gravityY: GRAV, walls: [] })
  const plank = v.rectangle(PLANK.x, PLANK.y, PLANK.w, PLANK.h, { isStatic: true, restitution: 0.95, friction: 0.04 })
  ok('matter nollar plankans restitution', plank.restitution === 0, `satt 0.95 → ${plank.restitution} (original ${plank._original?.restitution})`)
  v.destroy()
  const par = [0.02, 0.95].map((r) => slapp({ hojd: 260, rest: r, fjader: null }))
  ok('studsen är kulans egen, inte plattans', Math.abs(par[0].lyft - par[1].lyft) < 1, `restitution 0,02 → ${par[0].lyft.toFixed(0)} px · 0,95 → ${par[1].lyft.toFixed(0)} px`)
}

// 1. Djupet följer anslaget, och bottnar (taket).
console.log('1. Inpressning per anslag')
const rader = []
for (const h of HOJDER) {
  const f = new Fjaderbrada({ bredd: PLANK.w, hojd: PLANK.h })
  const m = slapp({ hojd: h, fjader: f })
  rader.push({ h, ...m, maxKomp: f.maxKomp })
  console.log(`   fall ${String(h).padStart(3)} px → anslag ${m.anslag.toFixed(1)} px/steg · djup ${m.djup.toFixed(1)} px · last ${m.last.toFixed(2)}`)
  f.destroy()
}
// Monotont ÖVER SPANNET, platt vid taket: att kräva strikt växande hela vägen vore att
// kräva att taket inte finns (och det var precis vad sondens första version gjorde).
const under = rader.filter((r) => r.last < 0.999)
ok('djupare inpressning för hårdare anslag (under taket)', under.length >= 3 && stigande(under.map((r) => Math.round(r.djup * 10) / 10)), `${under[0].djup.toFixed(1)} → ${under.at(-1).djup.toFixed(1)} px på ${under.length} nivåer`)
ok('inpressningen bottnar (tak)', rader.at(-1).djup <= rader[0].maxKomp + 0.01 && rader.at(-1).djup > rader[0].maxKomp * 0.8, `${rader.at(-1).djup.toFixed(1)} av max ${rader[0].maxKomp} px`)
ok('mjuk träff pressar bara en bit', rader[0].djup < rader[0].maxKomp * 0.55, `${rader[0].djup.toFixed(1)} px vid ${rader[0].anslag.toFixed(1)} px/steg`)

// 2. Utkastet: stiger med anslaget, har ett tak, och slår den styva plattan.
console.log('\n2. Utkast mot den STYVA plattan (referens = spelet före fjädern)')
const styva = HOJDER.map((h) => slapp({ hojd: h }))
for (let i = 0; i < HOJDER.length; i++) {
  const s = styva[i]
  const f = rader[i]
  const kvot = s.lyft > 0.5 ? f.lyft / s.lyft : Infinity
  console.log(`   fall ${String(HOJDER[i]).padStart(3)} px → styv ${s.lyft.toFixed(0).padStart(3)} px · fjäder ${f.lyft.toFixed(0).padStart(3)} px · ${kvot === Infinity ? '—' : kvot.toFixed(2) + '×'}`)
}
ok('högre utkast för hårdare anslag (under taket)', stigande(under.map((r) => Math.round(r.lyft))), `${under[0].lyft.toFixed(0)} → ${under.at(-1).lyft.toFixed(0)} px`)
ok('utkastet planar ut vid taket', Math.abs(rader.at(-1).lyft - rader.at(-2).lyft) < 20, `${rader.at(-2).lyft.toFixed(0)} → ${rader.at(-1).lyft.toFixed(0)} px`)
ok('fjädern kastar högre än den styva plattan', rader.every((r, i) => r.lyft > styva[i].lyft * 1.15), `median ${(rader[2].lyft / styva[2].lyft).toFixed(2)}×`)
ok('utkastet har ett tak (P0: kulan får inte fly ur banan)', rader.at(-1).utfart < 16, `max utfart ${rader.at(-1).utfart.toFixed(1)} px/steg vid fall 400 px`)

// 2b. En kula som RULLAR över bräddan ska rulla vidare, inte skjutas i taket.
//     `taEmot` tar bara normalkomposanten — tangenten (rullningen) måste vara kvar,
//     annars stannar kulan dött på plattan och banan bryts.
console.log('\n2b. Kula som rullar in snett (fart mest i sidled)')
{
  const f = new Fjaderbrada({ bredd: PLANK.w, hojd: PLANK.h })
  const v = new PhysicsWorld({ gravityY: GRAV, walls: [] })
  const plank = v.rectangle(PLANK.x, PLANK.y, PLANK.w, PLANK.h, { isStatic: true, friction: 0.04, label: 'bounce' })
  const kula = v.circle(PLANK.x - 120, PLANK.y - PLANK.h / 2 - BALL.r - 6, BALL.r, { ...BALL, label: 'ball' })
  Body.setVelocity(kula, { x: 7, y: 0 })
  v.onCollision((e) => {
    for (const p of e.pairs) if (p.bodyA === plank || p.bodyB === plank) f.taEmot(kula, 0)
  })
  v.beforeStep(() => f.steg() && f.driv(plank, PLANK.x, PLANK.y, 0))
  let topp = Infinity
  let vx = 0
  for (let i = 0; i < 90; i++) {
    v.update(1000 / 60)
    topp = Math.min(topp, kula.position.y)
    if (kula.position.x > PLANK.x) vx = Math.max(vx, kula.velocity.x)
  }
  const lyft = PLANK.y - PLANK.h / 2 - BALL.r - topp
  ok('rullningen är kvar över bräddan', vx > 4, `${vx.toFixed(1)} px/steg i sidled (in med 7)`)
  ok('en rullande kula kastas inte i taket', lyft < 60, `lyft ${lyft.toFixed(0)} px`)
  f.destroy()
  v.destroy()
}

// 2c. UPPREPADE studsar får inte pumpa. Grinden släpper in ett nytt anslag så snart
//     plankan inte är på väg upp — bra för känslan (bräddan tar emot kulan den nyss
//     kastade), men det är också den väg energi skulle kunna trappas uppåt varv efter
//     varv. Kulan studsar här fritt på bräddan om och om igen.
console.log('\n2c. Tio studsar i rad på samma bräda')
{
  const f = new Fjaderbrada({ bredd: PLANK.w, hojd: PLANK.h })
  const v = new PhysicsWorld({ gravityY: GRAV, walls: [] })
  const plank = v.rectangle(PLANK.x, PLANK.y, PLANK.w, PLANK.h, { isStatic: true, friction: 0.04, label: 'bounce' })
  const kula = v.circle(PLANK.x, PLANK.y - PLANK.h / 2 - BALL.r - 140, BALL.r, { ...BALL, label: 'ball' })
  v.onCollision((e) => {
    for (const p of e.pairs) if (p.bodyA === plank || p.bodyB === plank) f.taEmot(kula, 0)
  })
  v.beforeStep(() => f.steg() && f.driv(plank, PLANK.x, PLANK.y, 0))
  const ytan = PLANK.y - PLANK.h / 2 - BALL.r
  const toppar = []
  let steg = 0
  let uppe = false
  let topp = Infinity
  while (steg < 2400 && toppar.length < 10) {
    v.update(1000 / 60)
    steg++
    const h = ytan - kula.position.y
    if (h > 20) {
      uppe = true
      topp = Math.min(topp, kula.position.y)
    } else if (uppe) {
      toppar.push(ytan - topp)
      uppe = false
      topp = Infinity
    }
  }
  console.log(`   toppar: ${toppar.map((t) => t.toFixed(0)).join(' · ')} px`)
  // Bräddan TAR SIG uppåt de första studsarna (som en studsmatta med en unge på) och
  // låser sig sedan vid samma tak som ett enstaka anslag ger. Det ska mätas som just
  // det — konvergens mot taket — och inte som "ingen ökning alls", vilket vore att
  // kräva att bräddan inte är en fjäder.
  const sista3 = toppar.slice(-3)
  const spridning = Math.max(...sista3) - Math.min(...sista3)
  ok('tio studsar hinns med', toppar.length >= 6, `${toppar.length} kast på ${(steg / 60).toFixed(1)} s`)
  ok('trappar upp och LÅSER sig vid taket', spridning < 12 && Math.max(...toppar) <= rader.at(-1).lyft + 12, `platå ${sista3.at(-1).toFixed(0)} px (spridning ${spridning.toFixed(0)}) mot enstaka anslags tak ${rader.at(-1).lyft.toFixed(0)} px`)
  ok('kulan stannar inte död på bräddan', Math.min(...toppar) > 25, `lägsta kast ${Math.min(...toppar).toFixed(0)} px`)
  f.destroy()
  v.destroy()
}

// 3. Riktningen följer barnets vridning — utkastet är ett verktyg, inte en slump.
console.log('\n3. Riktning per vridning (kulan släpps rakt ovanför mitten)')
const vinklar = [-30, 0, 30]
const drift = []
for (const grader of vinklar) {
  const f = new Fjaderbrada({ bredd: PLANK.w, hojd: PLANK.h })
  const m = slapp({ hojd: 240, vinkel: (grader * Math.PI) / 180, fjader: f })
  drift.push(m.driftX)
  console.log(`   ${String(grader).padStart(3)}° → drift ${m.driftX.toFixed(0).padStart(4)} px i sidled · lyft ${m.lyft.toFixed(0)} px`)
  f.destroy()
}
ok('vridning styr sidan', Math.sign(drift[0]) !== Math.sign(drift[2]) && Math.abs(drift[0]) > 40 && Math.abs(drift[2]) > 40, `${drift[0].toFixed(0)} vs ${drift[2].toFixed(0)} px`)
ok('rak bräda kastar rakt upp', Math.abs(drift[1]) < 40, `${drift[1].toFixed(0)} px`)

// 4. Den lugnar sig — och silhuetten håller formen.
console.log('\n4. Lugnar sig, håller formen')
{
  const f = new Fjaderbrada({ bredd: PLANK.w, hojd: PLANK.h })
  f.ladda(14)
  let steg = 0
  let djup = 0
  let skalar = 0
  while (f.steg() && steg < 900) {
    steg++
    djup = Math.max(djup, f.komp)
    if (!skalar && f.vilar) skalar = steg // fjädern klar att ta emot igen
  }
  ok('fjädern vilar igen (klar att ta emot)', f.vilar && skalar > 0, `${skalar} steg (${(skalar / 60).toFixed(2)} s) · djupast ${djup.toFixed(1)} px`)
  // Efterskalvet är det som SYNS som springigt — men det får inte gå runt för evigt.
  ok('efterskalvet dör ut', steg < 900 && f.steg() === false, `hela rörelsen ${steg} steg (${(steg / 60).toFixed(2)} s)`)
  ok('silhuetten tillbaka i viloform', Math.abs(f.fyllnad() - 1) < 0.06, `fyllnad ${f.fyllnad().toFixed(3)}`)
  f.destroy()
}

// 5. Exit-säkert: en riven bräda rör ingenting.
console.log('\n5. Exit')
{
  const f = new Fjaderbrada({ bredd: PLANK.w, hojd: PLANK.h })
  const v = new PhysicsWorld({ gravityY: GRAV, walls: [] })
  const plank = v.rectangle(PLANK.x, PLANK.y, PLANK.w, PLANK.h, { isStatic: true, label: 'bounce' })
  f.ladda(14)
  f.steg()
  f.driv(plank, PLANK.x, PLANK.y, 0)
  const flyttad = plank.position.y
  f.destroy()
  const rortEfter = f.steg() !== false || f.ladda(14) !== 0
  f.driv(plank, PLANK.x, PLANK.y, 0)
  ok('bräddan pressades in före rivningen', flyttad > PLANK.y + 0.5, `y ${flyttad.toFixed(1)} (vila ${PLANK.y})`)
  ok('riven bräda gör ingenting', !rortEfter && plank.position.y === flyttad)
  v.destroy()
}

console.log(`\n${fel === 0 ? '✓ ALLA MÅTT GODA' : `✗ ${fel} MÅTT UNDERKÄNDA`}\n`)
process.exit(fel === 0 ? 0 : 1)
