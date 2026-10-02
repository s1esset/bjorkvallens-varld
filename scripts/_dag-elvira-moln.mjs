// ELVIRA-MOLN-SOND (FYSIKPLAN P1) — beror molnstudsen på HUR HÖGT Elvira föll, och lämnar hon aldrig bild?
//
//   node scripts/_dag-elvira-moln.mjs            (ingen webbläsare, några sekunder)
//
// Bygger SAMMA värld som spelet (PhysicsWorld, väggar left/right/ceiling, golvet på y 600, Elvira r 46 med
// restitution 0,4 · friction 0,05 · täthet/luftmotstånd per vikt) och SAMMA moln (`Moln` + `molnTraff` ur
// `src/games/enhorningen-elvira/moln.js` — samma kod som spelet kör vid varje träff).
//
// HEAD-armen är dagens skriptade molnstuds, kopierad ordagrant ur HEAD (`_onCollision` + `_update`):
// molnet en statisk kropp (`restitution: 0.6`, som aldrig gjorde något), `_cloudBoost = 6,5 · (1 − (n−1)/5)`
// satt i collisionStart och skriven som `Body.setVelocity(-up)` i bildrutan EFTER steget (om hon rör sig
// långsammare uppåt än så), efter 5 studsar dämpas hon 0,45 vid träffen. HEAD kör `_update` en gång per steg här.
//
// KONTROLLARMEN KÖRS FÖRST (en mätning som inte rör sig mellan två KÄNDA lägen mäter ingenting):
//   HEAD: stighöjden ska vara (nästan) OBEROENDE av fallhöjden — golvet i `_cloudBoost` bestämmer.
// Sedan mätarmen:
//   NY:   höjden ska VÄXA med fallhöjden och ha ett TAK, kedjan ska dö ut (ingen evighetsloop), och 300 slumpade
//         kast ska aldrig lämna bilden — och aldrig nudda taket EFTER en molnstuds.
import Matter from 'matter-js'
import { PhysicsWorld, fallvakt, nyVaktminne, STEG2 } from '../src/lib/physics.js'
import { Moln, molnTraff, taket, laddning, MAX_BOUNCES, MAX_LADD, ELVIRA_R as R, CLOUD_BODY_W, CLOUD_BODY_H } from '../src/games/enhorningen-elvira/moln.js'

const { Body } = Matter
const FIXED = 1000 / 60
const DESIGN_W = 1280
const GROUND_TOP = 600
const MAXV = 22
const START = { x: 185, y: 165 }
const BOUNCE_UP_BASE = 6.5 // HEAD-talet (kopierat)
const SETTLE_SPEED = 1.1
const SETTLE_HOLD = 0.6
const MAX_FLIGHT = 7

const LATT = { gravity: 0.8, density: 0.0006, frictionAir: 0.02, namn: 'lätt' }
const TUNG = { gravity: 1.45, density: 0.003, frictionAir: 0.012, namn: 'tung' }

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const f = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : String(v))
const stigande = (a, m = 4) => a.every((v, i) => i === 0 || v > a[i - 1] + m)

// ---- Världen (spelets) -------------------------------------------------------------------------------------
function varld(arm, vikt, { wind = 0 } = {}) {
  const phys = new PhysicsWorld({ gravityY: vikt.gravity, walls: ['left', 'right', 'ceiling'] })
  phys.rectangle(DESIGN_W / 2, GROUND_TOP + 70, DESIGN_W + 600, 140, { isStatic: true, restitution: 0.32, friction: 0.7, label: 'ground' })
  phys.setWind(wind, 0)
  const W = {
    phys, arm, vikt, clouds: [], el: null, bounces: 0, boost: 0, steg: 0,
    landningar: [], // { vn, ladd, steg } — träffar OVANIFRÅN (NY: bara de där molnet tog emot)
    topp: 0, // alla träffar ovanifrån (även ett moln som redan är mitt i utkastet)
    traffar: [], // { steg } — alla molnträffar
    vaktFlaggor: 0, vakt: nyVaktminne(),
  }
  phys.onCollision((e) => {
    const body = W.el
    if (!body) return
    for (const pair of e.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB
      if (a !== body && b !== body) continue
      const other = a === body ? b : a
      if (other.label !== 'cloud') continue
      const vnFore = body.velocity.y
      W.traffar.push({ steg: W.steg })
      if (arm === 'head') {
        // ── ORDAGRANT ur HEAD:src/games/enhorningen-elvira/index.js `_onCollision` ──
        W.bounces++
        if (W.bounces <= MAX_BOUNCES) {
          const frac = 1 - (W.bounces - 1) / MAX_BOUNCES
          W.boost = Math.max(0, BOUNCE_UP_BASE * frac)
        } else {
          W.boost = 0
          Body.setVelocity(body, { x: body.velocity.x * 0.45, y: body.velocity.y * 0.45 })
        }
        // (mätning: träffar ovanifrån = Elviras mittpunkt över molnets överkant)
        if (body.position.y < other.position.y - CLOUD_BODY_H / 2) {
          W.topp++
          W.landningar.push({ vn: vnFore, steg: W.steg })
        }
      } else {
        // ── samma som spelets `_onCollision` ──
        const cloud = W.clouds.find((c) => c.body === other)
        const { topp, r } = molnTraff(cloud, body, pair, W.bounces + 1, vikt.gravity)
        if (!topp || r) {
          W.bounces++
          if (!topp && W.bounces > MAX_BOUNCES) Body.setVelocity(body, { x: body.velocity.x * 0.45, y: body.velocity.y * 0.45 })
        }
        if (topp) W.topp++
        if (topp && r) W.landningar.push({ vn: r.vn, ladd: r.ladd, steg: W.steg })
      }
    }
  })
  return W
}

function moln(W, x, y) {
  if (W.arm === 'head') {
    const b = W.phys.rectangle(x, y, CLOUD_BODY_W, CLOUD_BODY_H, { isStatic: true, restitution: 0.6, friction: 0.1, label: 'cloud' })
    W.clouds.push({ body: b })
    return b
  }
  const m = new Moln(W.phys, x, y)
  W.clouds.push(m)
  return m.body
}

function elvira(W, x, y, vx = 0, vy = 0) {
  const v = W.vikt
  const body = W.phys.circle(x, y, R, { restitution: 0.4, friction: 0.05, frictionAir: v.frictionAir, density: v.density, label: 'elvira' })
  Body.setInertia(body, Infinity)
  if (W.arm !== 'head') W.phys.fartTak(body, MAXV) // spelets egen rad
  Body.setVelocity(body, { x: vx, y: vy })
  W.el = body
  return body
}

// EN bildruta (= ett steg här) av spelets `_update` (flygläge). HEAD: ordagrant ur HEAD.
function bildruta(W) {
  W.phys.update(FIXED)
  W.steg++
  const b = W.el
  let sp = Math.hypot(b.velocity.x, b.velocity.y)
  if (sp > MAXV) Body.setVelocity(b, { x: (b.velocity.x / sp) * MAXV, y: (b.velocity.y / sp) * MAXV })
  if (W.arm === 'head' && W.boost > 0) {
    const up = W.boost
    W.boost = 0
    if (b.velocity.y > -up) Body.setVelocity(b, { x: b.velocity.x, y: -up })
  }
  if (W.steg % 30 === 0) for (const c of W.clouds) if (c.body && fallvakt(c.body, W.vakt)) W.vaktFlaggor++
}

const stäng = (W) => {
  for (const c of W.clouds) c.destroy?.()
  W.phys.destroy()
}

// ETT släpp: Elvira faller `hojd` px rakt ner på ett moln (överkant `molnY − 19`). Mäter stighöjden efter FÖRSTA
// landningen — högsta punkten (lägsta y) innan nästa molnträff — och utfarten precis efter landningen.
const MOLN_Y = 556 // överkant 537 → Elviras vilokontakt y = 537 − 46 = 491
function slapp(arm, vikt, { hojd, molnY = MOLN_Y, steg = 260, vy0 = 0 }) {
  const W = varld(arm, vikt)
  moln(W, 640, molnY)
  const restY = molnY - CLOUD_BODY_H / 2 - R
  const el = elvira(W, 640, restY - hojd, 0, vy0)
  let landSteg = -1
  let minY = Infinity
  let utfart = 0
  let steg_ = false // steg: har hon stigit och vänt? (då är första apex mätt)
  let steget = 0
  for (let i = 0; i < steg; i++) {
    bildruta(W)
    if (landSteg < 0 && W.traffar.length) landSteg = i
    if (landSteg >= 0 && !steg_) {
      // Kontakten kan återkomma medan molnet dyker (flera collisionStart) — apex är det som räknas: lägsta y tills hon vänt nedåt.
      minY = Math.min(minY, el.position.y)
      if (i - landSteg === 12) utfart = -el.velocity.y // farten en stund efter träffen (luften räknad)
      if (el.velocity.y < -1) steget = 1
      if (steget && el.velocity.y > 0.3) steg_ = true
    }
  }
  const vn = W.landningar[0]?.vn ?? 0
  const ladd = W.landningar[0]?.ladd
  const klar = { stig: restY - minY, vn, ladd, utfart, landat: landSteg >= 0 }
  stäng(W)
  return klar
}

console.log('═ ELVIRA-MOLN-SOND ═══════════════════════════════════════════════════════════════')

const HOJDER = [60, 200, 400]
const stigRad = (arm, vikt, hojder = HOJDER, molnY = MOLN_Y) => hojder.map((h) => slapp(arm, vikt, { hojd: h, molnY }))

// ── 1. KONTROLLARM: HEAD ────────────────────────────────────────────────────────────────────────────────────
console.log('\n§1 HEAD (skriptad _cloudBoost) — studshöjden ska vara oberoende av fallhöjden')
for (const vikt of [LATT, TUNG]) {
  const rad = stigRad('head', vikt)
  const spann = Math.max(...rad.map((r) => r.stig)) - Math.min(...rad.map((r) => r.stig))
  const rel = spann / (rad.reduce((a, r) => a + r.stig, 0) / rad.length)
  console.log(`  ${vikt.namn}: fallhöjd ${HOJDER.join(' / ')} px → stighöjd ${rad.map((r) => f(r.stig, 0)).join(' / ')} px (anslagsfart ${rad.map((r) => f(r.vn)).join(' / ')} px/steg)`)
  ok(`HEAD ${vikt.namn}: alla tre släpp landar`, rad.every((r) => r.landat))
  ok(`HEAD ${vikt.namn}: stighöjden är nästan OBEROENDE av fallhöjden (spann < 12 % av medel, fall 60 → 400)`, rel < 0.12, `spann ${f(spann)} px = ${f(rel * 100)} %`)
}
{
  // Var HEAD:s golv slutar gälla: 0,4 · vn > 6,5 → vn > 16,25 px/steg — ovanför Elviras terminalfart i luften.
  const rad = stigRad('head', TUNG, [400, 480], MOLN_Y)
  console.log(`  (tung, fallhöjd 400/480: anslagsfart ${rad.map((r) => f(r.vn)).join(' / ')} px/steg — HEAD:s golv gäller till ~16 px/steg)`)
}

// ── 2. MÄTARM: NY ───────────────────────────────────────────────────────────────────────────────────────────
console.log('\n§2 NY (Moln = Fjaderbrada + kinematisk) — höjden växer med fallhöjden och har ett tak')
for (const vikt of [LATT, TUNG]) {
  const rad = stigRad('ny', vikt)
  console.log(`  ${vikt.namn}: fallhöjd ${HOJDER.join(' / ')} px → stighöjd ${rad.map((r) => f(r.stig, 0)).join(' / ')} px (anslag ${rad.map((r) => f(r.vn)).join(' / ')} · laddning ${rad.map((r) => f(r.ladd)).join(' / ')} · utfart ${rad.map((r) => f(r.utfart)).join(' / ')} px/steg)`)
  ok(`NY ${vikt.namn}: alla tre släpp landar`, rad.every((r) => r.landat))
  ok(`NY ${vikt.namn}: stighöjden VÄXER med fallhöjden (60 < 200 < 400)`, stigande(rad.map((r) => r.stig), 6), rad.map((r) => f(r.stig, 0)).join(' < '))
}
// Samma anslag, tre bounce-nummer: lyftdelen avtar (garantin finns kvar men dör ut).
{
  const rad = [1, 3, 5, 6].map((n) => f(laddning(8, n, LATT.gravity, MOLN_Y - 19)))
  console.log(`  laddning vid anslag 8 px/steg, molnstuds nr 1/3/5/6: ${rad.join(' / ')} px/steg`)
  ok('lyftdelen avtar för varje molnstuds (nr 1 > nr 3 > nr 5 > nr 6) och finns inte efter taket', laddning(8, 1, 0.8, 537) > laddning(8, 3, 0.8, 537) && laddning(8, 3, 0.8, 537) > laddning(8, 5, 0.8, 537) && laddning(8, 5, 0.8, 537) > laddning(8, 6, 0.8, 537))
}

// ── 3. TÄTT SVEP + TAK ──────────────────────────────────────────────────────────────────────────────────────
console.log('\n§3 tätt svep 20…480 px — monotont och kapat (båda vikter, två molnhöjder)')
for (const vikt of [LATT, TUNG]) {
  for (const molnY of [556, 300]) {
    const hojder = []
    // (start ≥ y 60: ett släpp som börjar i taket är en mätartefakt, inte ett spelläge)
    for (let h = 20; h <= (molnY === 556 ? 420 : 200); h += 20) hojder.push(h)
    const svep = hojder.map((h) => slapp('ny', vikt, { hojd: h, molnY }))
    const st = svep.map((r) => r.stig)
    const brott = st.filter((v, i) => i > 0 && v < st[i - 1] - 8).length
    const toppy = molnY - CLOUD_BODY_H / 2
    const cap = Math.min(MAX_LADD, Math.max(3.5, taket(toppy, vikt.gravity)))
    const g = vikt.gravity * 0.001 * STEG2
    const tak = (cap * cap) / (2 * g) // stighöjd vid takets utfart (utan luft)
    const kvot = svep.filter((r) => r.landat && r.ladd).map((r) => r.utfart / r.ladd)
    console.log(`  ${vikt.namn}, moln y ${molnY}: ${st.map((v) => f(v, 0)).join(' ')} · tak ${f(tak, 0)} px (utfart/laddning ${f(Math.min(...kvot), 2)}…${f(Math.max(...kvot), 2)})`)
    ok(`${vikt.namn}, moln y ${molnY}: nedgångar > 8 px = 0, alla landar, topp ≤ takets stighöjd`, brott === 0 && svep.every((r) => r.landat) && Math.max(...st) <= tak + 4, `brott ${brott} · topp ${f(Math.max(...st), 0)}`)
    ok(`${vikt.namn}, moln y ${molnY}: mittpunkten når aldrig över y ${R + 10} av molnstudsen ensam`, st.every((v) => (molnY - CLOUD_BODY_H / 2 - R) - v >= R + 10 - 4), `högsta y ${f(molnY - CLOUD_BODY_H / 2 - R - Math.max(...st), 0)}`)
  }
}
{
  // TAKET BITER (fallhöjden når inte takets fart i luften — Elvira har terminalfart): ge henne ingångsfart nedåt 0…22 px/steg
  // (MAXV = det snabbaste ett skott kan ha) mot ett moln på y 300. Monotont och aldrig över takets stighöjd.
  for (const vikt of [LATT, TUNG]) {
    const vys = [0, 4, 8, 12, 16, 20, 22]
    const rad = vys.map((vy0) => slapp('ny', vikt, { hojd: 40, molnY: 300, vy0 }))
    const toppy = 300 - CLOUD_BODY_H / 2
    const cap = Math.min(MAX_LADD, Math.max(3.5, taket(toppy, vikt.gravity)))
    const g = vikt.gravity * 0.001 * STEG2
    const tak = (cap * cap) / (2 * g)
    const st = rad.map((r) => r.stig)
    console.log(`  ${vikt.namn}, moln y 300, ingångsfart ${vys.join('/')} px/steg → stighöjd ${st.map((v) => f(v, 0)).join(' / ')} px · tak ${f(tak, 0)} px (laddning ${rad.map((r) => f(r.ladd)).join(' / ')}, takets laddning ${f(cap)})`)
    ok(`${vikt.namn}: taket biter (störst laddning = takets) och höjden planar ut`, Math.abs(rad[rad.length - 1].ladd - cap) < 0.01 && Math.max(...st) <= tak + 4 && st.every((v, i) => i === 0 || v >= st[i - 1] - 6), `laddning ${f(rad[rad.length - 1].ladd)} av tak ${f(cap)}`)
  }
}
{
  // Det värsta fallet: högsta tillåtna moln (y 190), tung hoppare, 1 500 px fall är omöjligt (taket) — men ett FALL från taket
  const r = slapp('ny', TUNG, { hojd: 80, molnY: 190 })
  const restY = 190 - CLOUD_BODY_H / 2 - R
  console.log(`  högsta moln (y 190), tung: stig ${f(r.stig, 0)} px → högsta mittpunkt y ${f(restY - r.stig, 0)} (taket ligger på ${R})`)
  ok('högsta molnet + tung Elvira: studsen når aldrig taket (högsta y ≥ ELVIRA_R + 4)', restY - r.stig >= R + 4, `y ${f(restY - r.stig, 0)}`)
}

// ── 4. KEDJAN DÖR UT ────────────────────────────────────────────────────────────────────────────────────────
// Ett släpp 200 px ovanför molnet, vilket som helst; spelets egen avslutsregel (nästan stilla en stund, eller 7 s).
console.log('\n§4 kedjan dör ut — studsar tills hon vilar (ingen evighetsloop), HEAD som jämförelse')
function kedja(arm, vikt, hojd) {
  const W = varld(arm, vikt)
  moln(W, 640, MOLN_Y)
  const restY = MOLN_Y - CLOUD_BODY_H / 2 - R
  const el = elvira(W, 640, restY - hojd, 0, 0) // rakt ner: stannar på molnet och studsar tills hon vilar
  let still = 0
  let slut = -1
  for (let i = 0; i < MAX_FLIGHT * 60; i++) {
    bildruta(W)
    const sp = Math.hypot(el.velocity.x, el.velocity.y)
    if (i > 24 && sp < SETTLE_SPEED) still += 1 / 60
    else still = 0
    if (still >= SETTLE_HOLD) {
      slut = i
      break
    }
  }
  const res = { slut, studsar: W.landningar.length, traffar: W.traffar.length }
  stäng(W)
  return res
}
for (const vikt of [LATT, TUNG]) {
  for (const hojd of [60, 200, 400]) {
    const h = kedja('head', vikt, hojd)
    const n = kedja('ny', vikt, hojd)
    console.log(`  ${vikt.namn} ${hojd} px: HEAD vilar efter ${h.slut} steg (${h.studsar} landningar) · NY vilar efter ${n.slut} steg (${n.studsar} landningar, ${n.traffar} träffar)`)
    ok(`NY ${vikt.namn} ${hojd} px: kedjan tar slut inom spelets 7 s (säkerhetsnätet behövs inte)`, n.slut >= 0, `${n.slut} steg`)
  }
}

// ── 5. STILLA MOLN (R2): ingen gammal fart ──────────────────────────────────────────────────────────────────
console.log('\n§5 ett moln i vila har fart 0 och noll nedtryckning')
{
  const W = varld('ny', LATT)
  const body = moln(W, 640, MOLN_Y)
  const m = W.clouds[0]
  elvira(W, 640, MOLN_Y - 19 - R - 150)
  for (let i = 0; i < 300; i++) bildruta(W)
  const v = Math.hypot(body.velocity.x, body.velocity.y)
  ok('NY: molnet har fart 0 och komp 0 efter att kedjan ringt ut', v === 0 && Math.abs(m.komp) < 0.001, `v ${f(v, 3)} · komp ${f(m.komp, 3)} · studsar ${W.landningar.length}`)
  stäng(W)
}

// ── 6. 300 SLUMPADE KAST (P0: aldrig ur bild) ───────────────────────────────────────────────────────────────
// Slumpade moln (1–3, överallt barnet kan lägga dem: x 100…1180, y 190…556), slumpad vikt och vind, slumpat skott
// (fart 7…20 i alla riktningar, som AimLauncher tillåter) från START. Spelets egen flygregel: 7 s, MAXV, stillhet.
console.log('\n§6 300 slumpade kast — högsta/lägsta läge över hela passet')
function trehundra(arm, seed) {
  let s = seed >>> 0
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  const res = { kast: 0, landningar: 0, topp: 0, minY: Infinity, maxY: -Infinity, minX: Infinity, maxX: -Infinity, maxFart: 0, taketEfterMoln: 0, taketTotalt: 0, vaktFlaggor: 0, maxLadd: 0 }
  for (let k = 0; k < 300; k++) {
    const vikt = rnd() < 0.5 ? LATT : TUNG
    const wind = [0, 0.0005, -0.0005][Math.floor(rnd() * 3)]
    const W = varld(arm, vikt, { wind })
    const n = 1 + Math.floor(rnd() * 3)
    for (let i = 0; i < n; i++) moln(W, 100 + rnd() * 1080, 190 + rnd() * 366)
    const ang = (rnd() * 2 - 1) * Math.PI // alla riktningar
    const fart = 7 + rnd() * 13
    const el = elvira(W, START.x, START.y, Math.cos(ang) * fart, Math.sin(ang) * fart)
    let still = 0
    let flog = 0
    let efterMoln = false
    for (let i = 0; i < MAX_FLIGHT * 60; i++) {
      bildruta(W)
      if (W.traffar.length) efterMoln = true
      const { x, y } = el.position
      res.minY = Math.min(res.minY, y)
      res.maxY = Math.max(res.maxY, y)
      res.minX = Math.min(res.minX, x)
      res.maxX = Math.max(res.maxX, x)
      res.maxFart = Math.max(res.maxFart, Math.hypot(el.velocity.x, el.velocity.y))
      if (y < R + 3) {
        res.taketTotalt++
        // efter en TOPP-landning (ett moln som kastat) — inte efter en träff från sidan/underifrån
        if (W.landningar.length) res.taketEfterMoln++
      }
      const sp = Math.hypot(el.velocity.x, el.velocity.y)
      if (flog > 24 && sp < SETTLE_SPEED) still += 1 / 60
      else still = 0
      flog++
      if (still >= SETTLE_HOLD) break
    }
    res.landningar += W.landningar.length
    res.topp += W.topp
    res.vaktFlaggor += W.vaktFlaggor
    for (const l of W.landningar) if (l.ladd) res.maxLadd = Math.max(res.maxLadd, l.ladd)
    res.kast++
    stäng(W)
  }
  return res
}
const hu = {}
for (const arm of ['head', 'ny']) {
  hu[arm] = []
  for (const seed of [1, 7, 42]) {
    const r = trehundra(arm, seed)
    hu[arm].push(r)
    console.log(`  ${arm.toUpperCase()} frö ${seed}: ${r.kast} kast · ${r.topp} träffar ovanifrån (${r.landningar} tagna av molnets fjäder) · y ${f(r.minY, 0)}…${f(r.maxY, 0)} · x ${f(r.minX, 0)}…${f(r.maxX, 0)} · toppfart ${f(r.maxFart)} px/steg · bildrutor vid taket ${r.taketTotalt} (efter en landning: ${r.taketEfterMoln})${arm === 'ny' ? ` · störst laddning ${f(r.maxLadd)}` : ''}`)
    if (arm === 'ny') {
      ok(`NY frö ${seed}: aldrig ur bild (mittpunkten y ≥ ${R - 8}, y ≤ ${GROUND_TOP}, x inom ${R - 10}…${DESIGN_W - R + 10} — väggen släpper ett par px i en hård smäll)`, r.minY >= R - 8 && r.maxY <= GROUND_TOP + 5 && r.minX >= R - 10 && r.maxX <= DESIGN_W - R + 10, `y ${f(r.minY, 0)}…${f(r.maxY, 0)} · x ${f(r.minX, 0)}…${f(r.maxX, 0)}`)
      ok(`NY frö ${seed}: toppfart ≤ ${MAXV + 0.5} px/steg`, r.maxFart <= MAXV + 0.5, f(r.maxFart))
      ok(`NY frö ${seed}: ett moln kastar henne aldrig upp i taket (0 bildrutor vid taket efter en molnlandning)`, r.taketEfterMoln === 0, `${r.taketEfterMoln}`)
      ok(`NY frö ${seed}: fallvakten (statisk-fart) flaggar inte molnen`, r.vaktFlaggor === 0, `${r.vaktFlaggor}`)
      ok(`NY frö ${seed}: molnlandningar förekom (testet spelar molnen)`, r.landningar >= 40, `${r.landningar}`)
    }
  }
}
{
  const head = hu.head.reduce((a, r) => a + r.taketEfterMoln, 0)
  const ny = hu.ny.reduce((a, r) => a + r.taketEfterMoln, 0)
  console.log(`  jämförelse: bildrutor vid taket efter en landning — HEAD ${head} · NY ${ny}`)
}

console.log(`\n${fel ? '✗ ' + fel + ' kontrollrad(er) föll' : '✓ allt höll'}`)
process.exit(fel ? 1 : 0)
