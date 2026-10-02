// STUDSMATTA-SOND (FYSIKPLAN P1 + R2) — beror studsen på HUR HÖGT kaninen föll, och når den aldrig ur bild?
//
//   node scripts/_studsmattaprobe.mjs            (ingen webbläsare, ~2 s)
//
// Bygger SAMMA värld och SAMMA matta som spelet: matta + konstanter importeras ur
// `src/games/studsmatta/matta.js` (PhysicsWorld, gravitation 1,2, kanin r 38). HEAD-armen är dagens
// skriptade landning, kopierad ordagrant ur HEAD (`nudge(char, vx, -up)`, `up = 9 + power · 15`,
// kaninens restitution 0,9, mattan en statisk kropp som teleporteras).
//
// KONTROLLARMEN KÖRS FÖRST (en mätning som inte rör sig mellan två KÄNDA lägen mäter ingenting):
//   HEAD: studshöjden ska BERO PÅ `power` och INTE på fallhöjden. Gör den det är mätaren rätt inställd.
// Sedan mätarmen:
//   NY:   höjden ska VÄXA med fallhöjden (monotont över ett tätt svep), ha ett TAK, och spänningen ska
//         fortfarande betyda något. 300 landningar med slumpad dragning ska aldrig lämna bilden.
import Matter from 'matter-js'
import { PhysicsWorld, nudge, fallvakt, nyVaktminne } from '../src/lib/physics.js'
import { Matta, KANIN_MAX_FART, MAX_FART, CHAR_R, BED_MIN_Y, BED_MAX_Y, CEIL_Y, GRAVITY_Y, BED_H, HALF_SPAN, laddning, taket } from '../src/games/studsmatta/matta.js'

const { Body } = Matter
const FIXED = 1000 / 60
const BED_Y = 470 // mattans överkant (spelets DEFAULT_BED_Y)
const BED_X = 640
const YTA = BED_Y // kaninens vilokontakt: mittpunkt = YTA − CHAR_R

// HEAD-talen (kopierade ur HEAD:src/games/studsmatta/index.js).
const HEAD_MIN_UP = 9
const HEAD_MAX_UP = 24

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const f = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : String(v))
const stigande = (a) => a.every((v, i) => i === 0 || v > a[i - 1] + 0.5)

// ETT släpp: kaninen faller `hojd` px (ur vila) ner på mattan. Mäter stighöjden efter FÖRSTA landningen
// (kaninens mittpunkt ovanför sin vilokontakt) — inte maxet över alla, för den andra träffen kan vara hårdare.
function slapp(arm, { hojd, power = 0.5, steg = 220 }) {
  const phys = new PhysicsWorld({ gravityY: GRAVITY_Y, walls: ['floor', 'left', 'right'] })
  const head = arm === 'head'
  let matta = null
  let bed = null
  if (head) {
    bed = phys.rectangle(BED_X, BED_Y + 22, HALF_SPAN * 2, BED_H, { isStatic: true, restitution: 0, friction: 0, label: 'bed' })
  } else {
    matta = new Matta(phys, BED_X, BED_Y)
    bed = matta.body
  }
  const char = phys.circle(BED_X, YTA - CHAR_R - hojd, CHAR_R, { restitution: head ? 0.9 : 0, friction: 0.001, frictionAir: 0.002, label: 'char' })
  if (!head) phys.fartTak(char, KANIN_MAX_FART)
  let landat = false
  let landSteg = -1
  let anslag = 0
  phys.onCollision((e) => {
    for (const p of e.pairs) {
      const bed_ = (p.bodyA === char && p.bodyB === bed) || (p.bodyB === char && p.bodyA === bed)
      if (!bed_ || landat) continue
      if (head) {
        landat = true
        anslag = char.velocity.y
        const up = HEAD_MIN_UP + power * (HEAD_MAX_UP - HEAD_MIN_UP)
        nudge(char, 0, -up)
      } else {
        const r = matta.landa(char, power)
        if (r) {
          landat = true
          anslag = r.vn
        }
      }
    }
  })
  let minY = Infinity
  for (let i = 0; i < steg; i++) {
    phys.update(FIXED)
    if (landat && landSteg < 0) landSteg = i
    if (landat) minY = Math.min(minY, char.position.y)
  }
  const stig = YTA - CHAR_R - minY
  phys.destroy()
  matta?.destroy()
  return { stig, anslag, landat }
}

console.log('═ STUDSMATTA-SOND ═══════════════════════════════════════════════════════════════')

// ── 1. KONTROLLARM: HEAD ────────────────────────────────────────────────────────────────────────
console.log('\n§1 HEAD (skriptad nudge) — studshöjden ska bero på power, inte på fallhöjden')
const HOJDER = [60, 200, 400]
const headRad = HOJDER.map((h) => slapp('head', { hojd: h, power: 0.5 }))
console.log(`  power 0,5: fallhöjd ${HOJDER.join(' / ')} px → stighöjd ${headRad.map((r) => f(r.stig, 0)).join(' / ')} px (anslagsfart ${headRad.map((r) => f(r.anslag)).join(' / ')} px/steg)`)
const headSpann = Math.max(...headRad.map((r) => r.stig)) - Math.min(...headRad.map((r) => r.stig))
ok('HEAD landar alla tre släpp', headRad.every((r) => r.landat))
const headRel = headSpann / (headRad.reduce((a, r) => a + r.stig, 0) / headRad.length)
ok('HEAD: stighöjden är nästan OBEROENDE av fallhöjden (spann < 12 % av medel, fall 60 → 400)', headRel < 0.12, `spann ${f(headSpann)} px = ${f(headRel * 100)} %`)
const headP = [0, 0.5, 1].map((p) => slapp('head', { hojd: 200, power: p }))
console.log(`  fallhöjd 200: power 0 / 0,5 / 1 → stighöjd ${headP.map((r) => f(r.stig, 0)).join(' / ')} px`)
ok('HEAD: stighöjden BEROR på power (power 1 > 4 × power 0)', headP[2].stig > headP[0].stig * 4, `${f(headP[0].stig, 0)} → ${f(headP[2].stig, 0)} px`)

// ── 2. MÄTARM: NY ───────────────────────────────────────────────────────────────────────────────
console.log('\n§2 NY (Fjaderbrada + kinematisk) — höjden växer med fallhöjden och har ett tak')
const nyRad = HOJDER.map((h) => slapp('ny', { hojd: h, power: 0.5 }))
console.log(`  power 0,5: fallhöjd ${HOJDER.join(' / ')} px → stighöjd ${nyRad.map((r) => f(r.stig, 0)).join(' / ')} px (anslagsfart ${nyRad.map((r) => f(r.anslag)).join(' / ')} px/steg)`)
ok('NY landar alla tre släpp', nyRad.every((r) => r.landat))
ok('NY: stighöjden växer med fallhöjden (60 < 200 < 400)', stigande(nyRad.map((r) => r.stig)), nyRad.map((r) => f(r.stig, 0)).join(' < '))
const nyP = [0, 0.5, 1].map((p) => slapp('ny', { hojd: 200, power: p }))
console.log(`  fallhöjd 200: power 0 / 0,5 / 1 → stighöjd ${nyP.map((r) => f(r.stig, 0)).join(' / ')} px`)
ok('NY: spänningen betyder fortfarande något (power 1 > 1,5 × power 0)', nyP[2].stig > nyP[0].stig * 1.5, `${f(nyP[0].stig, 0)} → ${f(nyP[2].stig, 0)} px`)
// Generös för en 3-åring: även den mjukaste landningen från låg höjd ger en synlig studs.
const mjuk = slapp('ny', { hojd: 30, power: 0 })
ok('NY: lägsta spänning + lågt fall ger ändå en generös studs (>= 80 px)', mjuk.stig >= 80, `${f(mjuk.stig, 0)} px (HEAD ${f(slapp('head', { hojd: 30, power: 0 }).stig, 0)})`)

// Tätt svep: ingen icke-monotoni (första försöket gav 12 → 12,9 men 13–14,5 → 4,3 px/steg).
console.log('\n§3 tätt svep 20…700 px — monotont och kapat, vid tre spänningar')
for (const p of [0, 0.5, 1]) {
  const svep = []
  for (let h = 20; h <= 700; h += 20) svep.push(slapp('ny', { hojd: h, power: p }))
  const st = svep.map((r) => r.stig)
  const brott = st.filter((v, i) => i > 0 && v < st[i - 1] - 8).length
  const tak = (taket(BED_Y) ** 2) / (2 * (GRAVITY_Y * 0.001 * (1000 / 60) ** 2)) // stighöjd vid takets utfart
  console.log(`  power ${p}: ${st.map((v) => f(v, 0)).join(' ')}`)
  ok(`power ${p}: nedgångar > 8 px i svepet = 0, alla landar, topp ≤ takets stighöjd ${f(tak, 0)} px`, brott === 0 && svep.every((r) => r.landat) && Math.max(...st) <= tak + 3, `brott ${brott} · topp ${f(Math.max(...st), 0)}`)
}
const rym = slapp('ny', { hojd: 1500, power: 1 })
const bound = CHAR_R + CEIL_Y + 40
ok('NY: ett fall från 1 500 px med full spänning når ändå aldrig över taket', YTA - CHAR_R - rym.stig >= CEIL_Y + 40 - 6, `högsta mittpunkt y ${f(YTA - CHAR_R - rym.stig, 0)} (gräns ${CEIL_Y + 40}) · anslag ${f(rym.anslag)} px/steg`)

// ── 3. FLYTTA / FÖLJA FINGRET (R2) ──────────────────────────────────────────────────────────────
console.log('\n§4 mattan följer fingret utan kastkraft')
{
  const phys = new PhysicsWorld({ gravityY: GRAVITY_Y, walls: ['floor', 'left', 'right'] })
  const m = new Matta(phys, BED_X, BED_Y)
  const char = phys.circle(BED_X, BED_Y - CHAR_R - 2, CHAR_R, { restitution: 0, friction: 0.001, frictionAir: 0.002, label: 'char' })
  for (let i = 0; i < 60; i++) phys.update(FIXED) // kaninen sätter sig
  const y0 = char.position.y
  // Ett ryck: fingret hoppar 200 px åt höger (en teleport i målet) — basen hinner efter med MAX_FART.
  m.till(BED_X + 200, BED_Y)
  let topp = 0
  let steg = 0
  while (!m.k.vilar && steg < 100) {
    phys.update(FIXED)
    steg++
    topp = Math.max(topp, Math.hypot(char.velocity.x, char.velocity.y))
  }
  console.log(`  200 px åt höger på ${steg} steg (MAX_FART ${MAX_FART}) · kaninens toppfart ${f(topp, 2)} px/steg`)
  ok(`NY: mattan hinner efter fingret (minst 200/${MAX_FART} steg, inte en teleport)`, steg >= 200 / MAX_FART && m.k.vilar, `${steg} steg`)
  phys.update(FIXED) // farten nollas vid nästa steg efter ankomsten, aldrig senare
  ok('NY: vilande matta har fart 0 (ingen gammal fart blir kvar)', Math.hypot(m.body.velocity.x, m.body.velocity.y) === 0 && m.body.angularVelocity === 0, `v ${f(m.body.velocity.x, 3)},${f(m.body.velocity.y, 3)}`)
  // flytta: bär dit utan kastkraft — kaninen som vilar får ingen fart uppåt.
  m.flytta(BED_X, BED_Y)
  phys.update(FIXED)
  ok('NY: flytta() ger matten fart 0 och ingen kastkraft på kaninen', Math.hypot(m.body.velocity.x, m.body.velocity.y) === 0 && char.velocity.y > -3, `kaninens vy ${f(char.velocity.y, 2)}`)
  ok('NY: kaninen låg kvar på mattan efter 60 steg (y inom 3 px av vilan)', Math.abs(char.position.y - y0) < 3, `Δy ${f(char.position.y - y0, 2)}`)
  m.destroy()
  phys.destroy()
}

// ── 4. 300 LANDNINGAR (P0: aldrig ur bild) ──────────────────────────────────────────────────────
// Slumpad dragning av mattan (som ett barn som drar hit och dit, ryckigt), slumpade tryck-boostar, och
// spelets egen vingel-dämpning + golvräddning (kopierade ur `_update`). INGET mjukt tak: det är nätet,
// och taket som mäts här är mattans egna.
console.log('\n§5 300 landningar med slumpad dragning — högsta läge över hela passet')
function trehundra(seed, { tapp = true, drag = true, takt = [60, 340], natet = true } = {}) {
  let s = seed >>> 0
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  const phys = new PhysicsWorld({ gravityY: GRAVITY_Y, walls: ['floor', 'left', 'right'] })
  const m = new Matta(phys, 640, 470)
  const char = phys.circle(640, 470 - 130, CHAR_R, { restitution: 0, friction: 0.001, frictionAir: 0.002, label: 'char' })
  phys.fartTak(char, KANIN_MAX_FART)
  let bedX = 640
  let bedY = 470
  let tapBoost = false
  let landningar = 0
  let minY = Infinity
  let maxFart = 0
  let tapFlaggor = 0
  let raddning = 0
  let sistRaddning = -1e9
  let nastaDrag = 30
  let natAktiv = 0
  const vakt = nyVaktminne()
  let vaktFlaggor = 0
  let underTaket = 0 // bildrutor med mittpunkten över mattans EGET tak (utan nätet)
  const power = () => Math.max(0, Math.min(1, (bedY - BED_MIN_Y) / (BED_MAX_Y - BED_MIN_Y)))
  phys.onCollision((e) => {
    for (const p of e.pairs) {
      if (!((p.bodyA === char && p.bodyB === m.body) || (p.bodyB === char && p.bodyA === m.body))) continue
      const r = m.landa(char, tapBoost ? 1 : power())
      if (!r) continue
      tapBoost = false
      landningar++
      // spelets landningsvx (kopia): behåll hälften + mittdragning
      const vx = Math.max(-7, Math.min(7, char.velocity.x * 0.5 + (bedX - char.position.x) * 0.018))
      Body.setVelocity(char, { x: vx, y: char.velocity.y })
    }
  })
  let steg = 0
  while (landningar < 300 && steg < 120000) {
    steg++
    if (drag && steg >= nastaDrag) {
      nastaDrag = steg + takt[0] + Math.floor(rnd() * (takt[1] - takt[0]))
      bedX = 330 + rnd() * 620
      bedY = BED_MIN_Y + rnd() * (BED_MAX_Y - BED_MIN_Y)
      m.till(bedX, bedY) // en TELEPORT i målet — basen hinner efter med MAX_FART
    }
    if (tapp && rnd() < 0.004) {
      tapBoost = true
      tapFlaggor++
      m.tryck()
    }
    phys.update(FIXED)
    if (steg % 30 === 0 && fallvakt(m.body, vakt)) vaktFlaggor++ // DEV-diagnosens egen vakt, var 30:e bildruta som i spelet
    minY = Math.min(minY, char.position.y)
    maxFart = Math.max(maxFart, Math.hypot(char.velocity.x, char.velocity.y))
    if (char.position.y < CEIL_Y + 40 - 8) underTaket++
    // --- resten kopierad ur spelets `_update` (efter fysiken, per bildruta) ---
    // mjukt tak: kommer kaninen ändå för högt, studsa lugnt tillbaka ned (NÄTET)
    if (natet && char.position.y < CEIL_Y && char.velocity.y < 0) {
      natAktiv++
      Body.setVelocity(char, { x: char.velocity.x, y: Math.abs(char.velocity.y) * 0.35 + 1 })
    }
    const dx = bedX - char.position.x
    if (Math.abs(dx) > 20) Body.setVelocity(char, { x: Math.max(-8, Math.min(8, char.velocity.x + dx * 0.008)), y: char.velocity.y })
    // golvräddning: föll kaninen bredvid mattan
    if (char.position.y > 624 && steg - sistRaddning > 7) {
      sistRaddning = steg
      raddning++
      Body.setVelocity(char, { x: (bedX - char.position.x) * 0.06, y: -(9 + 2) })
    }
  }
  const res = { landningar, minY, maxFart, tapFlaggor, raddning, steg, natAktiv, underTaket, vaktFlaggor }
  m.destroy()
  phys.destroy()
  return res
}
for (const [namn, opt] of [
  ['lugn dragning (60–340 steg mellan ryck)', {}],
  ['hetsig dragning (20–160 steg mellan ryck)', { takt: [20, 160] }],
]) {
  console.log(`  ${namn}`)
  for (const seed of [1, 7, 42]) {
    const r = trehundra(seed, opt)
    console.log(`    frö ${seed}: ${r.landningar} landningar på ${r.steg} steg · högsta läge y ${f(r.minY, 0)} · toppfart ${f(r.maxFart)} px/steg · tryck ${r.tapFlaggor} · golvräddningar ${r.raddning} · nätet grep in ${r.natAktiv} bildrutor · bildrutor med mittpunkten över CEIL_Y+32 ${r.underTaket}`)
    ok(`${namn.split(' ')[0]} frö ${seed}: 300 landningar nåddes`, r.landningar >= 300)
    ok(`${namn.split(' ')[0]} frö ${seed}: kaninen lämnar aldrig bild (högsta y ≥ ${CHAR_R + 20} med nätet; kaninens topp syns)`, r.minY >= CHAR_R + 20, `min y ${f(r.minY, 0)}`)
    ok(`${namn.split(' ')[0]} frö ${seed}: fallvakten (statisk-fart) flaggar inte den dragna mattan`, r.vaktFlaggor === 0, `${r.vaktFlaggor} flaggor`)
    ok(`${namn.split(' ')[0]} frö ${seed}: toppfart ≤ ${KANIN_MAX_FART + 0.5} px/steg (fartTak) — ingen tunnling`, r.maxFart <= KANIN_MAX_FART + 0.5, `${f(r.maxFart)}`)
  }
}
{
  // Mattans EGET tak (utan nät och utan uppåtdragning): bara utkast, mattan står still.
  const r = trehundra(3, { drag: false, natet: false, tapp: true })
  console.log(`  utan dragning och utan nät: ${r.landningar} landningar · högsta läge y ${f(r.minY, 0)} (gräns ${CEIL_Y + 40}) · bildrutor över taket ${r.underTaket}`)
  ok('mattans eget tak håller utan nät när den står still (högsta y ≥ CEIL_Y + 40 − 8)', r.minY >= CEIL_Y + 40 - 8 && r.underTaket === 0, `min y ${f(r.minY, 0)}`)
}

// ── 5. LADDNINGENS RENA TAL ─────────────────────────────────────────────────────────────────────
console.log('\n§6 laddningens ordning (rena tal)')
{
  const rad = [0, 5, 10, 15, 25].map((vn) => f(laddning(vn, 0.5, BED_Y)))
  console.log(`  power 0,5, bedY ${BED_Y}: vn 0/5/10/15/25 → laddning ${rad.join(' / ')} px/steg · tak ${f(taket(BED_Y))} (bedY 350: ${f(taket(350))} · 560: ${f(taket(560))})`)
  ok('laddningen är monoton i anslagsfarten och i spänningen', [0, 5, 10, 15, 25].every((vn, i, a) => i === 0 || laddning(vn, 0.5, BED_Y) >= laddning(a[i - 1], 0.5, BED_Y)) && laddning(8, 1, BED_Y) >= laddning(8, 0, BED_Y))
  ok('laddningen är aldrig över taket, vid någon mattahöjd', [BED_MIN_Y, 470, BED_MAX_Y].every((y) => laddning(99, 1, y) <= taket(y) + 1e-9))
}

console.log(`\n${fel ? '✗ ' + fel + ' kontrollrad(er) föll' : '✓ allt höll'}`)
process.exit(fel ? 1 : 0)
