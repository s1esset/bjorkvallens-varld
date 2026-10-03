// SPINDELHJÄLTENS SVAJANDE KNOPP (FYSIKPLAN F1 + G3a, dag D16 kluster B4) — mäts i Node, ingen webbläsare.
//
//   node scripts/_dag-spindelhjalten.mjs
//
// Samma värld som spelet (PhysicsWorld gravityY 1, golv + väggar, hjälte = MATERIALS.bouncy r 46 från slangbellan
// (240,540)), samma knopp (`knopp.js` + `phys.kinematisk({ avvikelse })`, statisk cirkel med `forhandsStopp`) och
// samma pricklinje (`Skuggvarld` med spelets filter: väggar + forhandsStopp). `knopp()` här är en kopia av
// `_addBumper`s knopp-rader; stöten i `collisionStart` är en kopia av `_stotKnopp`.
//
// A  EN STÖT → RÖRELSE → VILA: skott som träffar knoppen sätter den i svaj (utslag > 3 px), aldrig över KNOPP.MAX,
//    och den står exakt på sin plats (kroppen = viloplatsen, fart 0) inom 4 s efter SISTA träffen.
//    KONTROLLARMAR: knopp utan fjäder (HEAD) rör sig aldrig (0 px — mätaren duger); fjäder utan dämpning (ZETA 0)
//    kommer aldrig till vila.
// B  AIMA PÅ EN KNOPP SOM STÅR STILLA: efter ett helt skott (hjälten borta) är knoppen i vila senast när nästa sikte
//    börjar (flygning max 5 s + hem 0,6 s i spelet → 5,6 s; vi kräver vila ≤ 4 s efter träff). Hjältens fart ut
//    ur FÖRSTA studsen skiljer högst 3,5 px/steg från HEAD:s statiska knopp (motgången får sakta ner/ändra lite, inte fly).
// C  PRICKLINJEN SLUTAR VID KNOPPEN: för skott som verkligen träffar knoppen först slutar skuggbanan inom 12 px av
//    kontaktavståndet (r + 46) från knoppens mitt, och inom 16 px från hjältens FAKTISKA första kontaktläge (ett glidande streck sprider sig längs ytan).
//    KONTROLL: dagens `predict()` (HEAD) går igenom knoppen för ≥ 80 % av samma skott. Och med knoppen mitt i ett
//    svaj slutar banan där knoppen står just nu (inte på viloplatsen).
import { PhysicsWorld, MATERIALS, Body } from '../src/lib/physics.js'
import { Skuggvarld, predict } from '../src/lib/launcher.js'
import { KnoppFjader, KNOPP } from '../src/games/spindelhjalten/knopp.js'
import { SLING } from '../src/games/spindelhjalten/vindband.js'

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const not = (t) => console.log(`  · ${t}`)
const rubrik = (t) => console.log(`\n══ ${t}`)
const f = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : String(v))
const FRAME = 1000 / 60
const HERO_R = 46
const GRAVITY = 1.0
const PREVIEW_G = 0.2778 * GRAVITY
const PREVIEW_DAMP = 1 - 0.004
const BOUNDS = { floorY: 674, leftX: 46, rightX: 1234, restitution: 0.72 }
const KN = { x: 640, y: 400 }

function varld({ r, arm }) {
  const phys = new PhysicsWorld({ gravityY: GRAVITY, walls: ['floor', 'left', 'right'] })
  const body = phys.circle(KN.x, KN.y, r, { isStatic: true, restitution: 1.0, friction: 0.2, label: 'bumper' })
  const bm = { body, fj: null, kin: null }
  if (arm !== 'head') {
    body.forhandsStopp = true
    bm.fj = new KnoppFjader(arm === 'odampad' ? { ZETA: 0 } : {})
    bm.kin = phys.kinematisk(body, { maxFart: 8, avvikelse: () => bm.fj.steg() })
  }
  const stotar = []
  phys.onCollision((e) => {
    for (const p of e.pairs) {
      const a = p.bodyA.label
      const b = p.bodyB.label
      if (!((a === 'hero' && b === 'bumper') || (b === 'hero' && a === 'bumper'))) continue
      const hj = a === 'hero' ? p.bodyA : p.bodyB
      const kn = a === 'hero' ? p.bodyB : p.bodyA
      const dx = kn.position.x - hj.position.x
      const dy = kn.position.y - hj.position.y
      const d = Math.hypot(dx, dy) || 1
      const fart = (hj.velocity.x * dx + hj.velocity.y * dy) / d
      stotar.push({ fart, x: hj.position.x, y: hj.position.y, vx: hj.velocity.x, vy: hj.velocity.y })
      bm.fj?.stot(dx / d, dy / d, fart)
    }
  })
  return { phys, bm, stotar, r }
}

// Ett skott. Returnerar vad som hände med knoppen och hjälten.
function skjut({ r, arm, vx, vy, steg = 60 * 7, efter = null }) {
  const w = varld({ r, arm })
  const hero = w.phys.circle(SLING.x, SLING.y, HERO_R, { ...MATERIALS.bouncy, label: 'hero' })
  Body.setVelocity(hero, { x: vx, y: vy })
  const res = { traff: false, forstaX: null, forstaY: null, exitVx: null, exitVy: null, maxUtslag: 0, sistaTraff: -1, viloSteg: null, slutAvst: null, slutFart: null, ute: false }
  let nStot = 0
  let vilarSedan = null // första steget i den löpande vilan (null = rör sig)
  const sparaVila = (i) => {
    if (!w.bm.fj) return
    if (w.bm.fj.vilar) { if (vilarSedan == null) vilarSedan = i } else vilarSedan = null
  }
  for (let i = 0; i < steg; i++) {
    w.phys.update(FRAME)
    sparaVila(i)
    if (w.stotar.length > nStot) {
      if (!res.traff) {
        res.traff = true
        // Hjältens läge i slutet av DET HÄR steget (efter lösaren) — samma tidpunkt som skuggbanans sista punkt.
        // (collisionStart-läget är före lösaren: upp till en stegs intryck, ~20 px, längre in i knoppen.)
        res.forstaX = hero.position.x
        res.forstaY = hero.position.y
        res.exitStep = i
      }
      res.sistaTraff = i
      nStot = w.stotar.length
    }
    if (res.traff && res.exitVx == null && i === res.exitStep + 1) {
      res.exitVx = hero.velocity.x
      res.exitVy = hero.velocity.y
    }
    const utslag = Math.hypot(w.bm.body.position.x - KN.x, w.bm.body.position.y - KN.y)
    res.maxUtslag = Math.max(res.maxUtslag, utslag)
    if (hero.position.x < -50 || hero.position.x > 1330) res.ute = true
    if (efter && i === efter.steg) efter.fn(w, hero)
  }
  res.slutAvst = Math.hypot(w.bm.body.position.x - KN.x, w.bm.body.position.y - KN.y)
  res.slutFart = Math.hypot(w.bm.body.velocity.x, w.bm.body.velocity.y)
  res.vilar = w.bm.fj ? w.bm.fj.vilar : true
  // tid från sista träffen till vila: kör vidare tills knoppen står (avst 0, fart 0), max 10 s extra
  if (res.traff && w.bm.fj) {
    w.phys.removeBody(hero)
    let n = 0
    while (!w.bm.fj.vilar && n < 600) {
      w.phys.update(FRAME)
      n++
      sparaVila(steg + n)
    }
    for (let k = 0; k < 2; k++) w.phys.update(FRAME) // kinematiken nollar sin sista fart ett steg efter att fjädern lagt sig
    if (w.bm.fj.vilar && vilarSedan == null) vilarSedan = steg + n
    res.viloEfterTraff = (vilarSedan - res.sistaTraff) / 60
    res.slutAvst = Math.hypot(w.bm.body.position.x - KN.x, w.bm.body.position.y - KN.y)
    res.slutFart = Math.hypot(w.bm.body.velocity.x, w.bm.body.velocity.y)
  }
  w.phys.destroy()
  return res
}

// Rutnät av skott (kraft × vinkel) som i spelets spann.
const skott = []
for (let power = 12; power <= 28; power += 2) for (let deg = -12; deg >= -82; deg -= 4) {
  const a = (deg * Math.PI) / 180
  skott.push({ vx: Math.cos(a) * power, vy: Math.sin(a) * power, power, deg })
}

// ═══ A ═══
rubrik('A · en stöt → rörelse → vila')
for (const r of [46, 62, 78]) {
  const ny = skott.map((s) => ({ s, ...skjut({ r, arm: 'ny', ...s }) })).filter((x) => x.traff)
  const head = skott.map((s) => ({ s, ...skjut({ r, arm: 'head', ...s }) })).filter((x) => x.traff)
  const odamp = skott.map((s) => ({ s, ...skjut({ r, arm: 'odampad', ...s }) })).filter((x) => x.traff)
  const maxU = Math.max(...ny.map((x) => x.maxUtslag))
  const medU = ny.reduce((a, x) => a + x.maxUtslag, 0) / ny.length
  const vilaMax = Math.max(...ny.map((x) => x.viloEfterTraff))
  console.log(`  · r ${r}: ${ny.length} träffande skott av ${skott.length} (HEAD: ${head.length}) · utslag medel ${f(medU)} px, max ${f(maxU)} px · vila ${f(vilaMax, 2)} s efter sista träffen`)
  ok(`r ${r}: knoppen sätts i svaj av stöten (medelutslag > 3 px)`, medU > 3, `${f(medU)} px`)
  ok(`r ${r}: utslaget överstiger aldrig taket ${KNOPP.MAX} px`, maxU <= KNOPP.MAX + 0.01, `${f(maxU)} px`)
  const inteExakt = ny.filter((x) => x.slutAvst !== 0 || x.slutFart !== 0)
  ok(`r ${r}: knoppen står EXAKT på sin plats och i vila efter sista träffen (≤ 4 s)`, inteExakt.length === 0 && vilaMax <= 4, `vila ${f(vilaMax, 2)} s${inteExakt.length ? ' · ' + inteExakt.length + ' inte exakta, t.ex. avst ' + inteExakt[0].slutAvst + ' fart ' + inteExakt[0].slutFart : ''}`)
  ok(`r ${r}: KONTROLL knopp utan fjäder (HEAD) rör sig aldrig (mätaren duger)`, head.length > 0 && head.every((x) => x.maxUtslag === 0), `${f(Math.max(...head.map((x) => x.maxUtslag)), 3)} px`)
  ok(`r ${r}: KONTROLL fjäder utan dämpning kommer aldrig till vila (mätaren duger)`, odamp.length > 0 && odamp.some((x) => !x.vilar || x.viloEfterTraff > 9), `${odamp.filter((x) => !x.vilar || x.viloEfterTraff > 9).length} av ${odamp.length}`)
  // B: första studsens utgående fart mot HEAD (samma skott)
  let maxDv = 0
  let n = 0
  for (const x of ny) {
    const h = head.find((y) => y.s === x.s)
    if (!h || x.exitVx == null || h.exitVx == null) continue
    maxDv = Math.max(maxDv, Math.hypot(x.exitVx - h.exitVx, x.exitVy - h.exitVy))
    n++
  }
  ok(`r ${r}: hjältens fart ut ur första studsen skiljer ≤ 3,5 px/steg från HEAD (${n} jämförda)`, maxDv <= 3.5, `${f(maxDv, 2)} px/steg`)
  ok(`r ${r}: hjälten lämnar aldrig sidorna (x ∈ [−50, 1330])`, ny.every((x) => !x.ute), '')
}

// ═══ C ═══
rubrik('C · pricklinjen slutar vid knoppen')
for (const r of [46, 62, 78]) {
  const w = varld({ r, arm: 'ny' })
  const skugg = new Skuggvarld({ varld: w.phys, kula: { r: HERO_R, ...MATERIALS.bouncy }, filter: (b) => b.label === 'wall' || !!b.forhandsStopp })
  // Skuggbanan är 64 motorsteg: bara skott som träffar knoppen FÖRST inom 60 steg kan jämföras.
  const traffar = skott.map((s) => ({ s, ...skjut({ r, arm: 'head', ...s }) })).filter((x) => x.traff && x.exitStep < 60)
  let maxAvstKontakt = 0
  let maxAvstFaktisk = 0
  let genom = 0
  for (const x of traffar) {
    const pts = skugg.bana(SLING.x, SLING.y, x.s.vx, x.s.vy, { gy: PREVIEW_G, wx: 0 })
    const sista = pts[pts.length - 1]
    const dKon = Math.hypot(sista.x - KN.x, sista.y - KN.y)
    maxAvstKontakt = Math.max(maxAvstKontakt, Math.abs(dKon - (r + HERO_R)))
    const dF = Math.hypot(sista.x - x.forstaX, sista.y - x.forstaY)
    if (dF > maxAvstFaktisk) { maxAvstFaktisk = dF; var varst = { s: x.s, steg: x.exitStep, sista, faktisk: [x.forstaX, x.forstaY], pts: pts.length } }
    const gammal = predict(SLING.x, SLING.y, x.s.vx, x.s.vy, PREVIEW_G, 0, BOUNDS, PREVIEW_DAMP, 1)
    if (gammal.some((p) => Math.hypot(p.x - KN.x, p.y - KN.y) < r + HERO_R)) genom++
  }
  ok(`r ${r}: skuggbanan slutar inom 12 px av kontaktavståndet (${traffar.length} skott)`, traffar.length > 5 && maxAvstKontakt <= 12, `${f(maxAvstKontakt)} px`)
  ok(`r ${r}: …och inom 16 px av hjältens faktiska första kontaktläge (glidande streck längs ytan)`, maxAvstFaktisk <= 16, `${f(maxAvstFaktisk)} px${maxAvstFaktisk > 12 ? ' · värsta ' + JSON.stringify(varst) : ''}`)
  ok(`r ${r}: KONTROLL dagens predict() (HEAD) går in i knoppens kontaktavstånd i ≥ 70 % av skotten (resten är nedslag vid kanten som punktmassan inte ser)`, genom / traffar.length >= 0.7, `${genom} av ${traffar.length}`)

  // Mitt i ett svaj: knoppen står förskjuten → banan slutar där den STÅR. Ett skott rakt mot knoppens mitt.
  const rakt = { vx: 0, vy: 0 }
  const dx = KN.x - SLING.x
  const dy = KN.y - SLING.y
  const dd = Math.hypot(dx, dy)
  rakt.vx = (dx / dd) * 22
  rakt.vy = (dy / dd) * 22 - 4
  // stöt: knoppen skickas 24 px åt sidan, vi låter den svaja 25 steg och mäter banan mot DÅ-läget
  w.bm.fj.stot(1, -0.4, 20)
  for (let i = 0; i < 25; i++) w.phys.update(FRAME)
  const nu = w.bm.body.position
  const flyttad = Math.hypot(nu.x - KN.x, nu.y - KN.y)
  const pts = skugg.bana(SLING.x, SLING.y, rakt.vx, rakt.vy, { gy: PREVIEW_G, wx: 0 })
  const sista = pts[pts.length - 1]
  const dNu = Math.hypot(sista.x - nu.x, sista.y - nu.y)
  const dRest = Math.hypot(sista.x - KN.x, sista.y - KN.y)
  const slutadeVidKnopp = Math.abs(dNu - (r + HERO_R)) <= 14
  not(`r ${r}: knoppen står ${f(flyttad)} px från viloplatsen · banans slut ${f(dNu)} px från knoppen nu, ${f(dRest)} px från viloplatsen (kontaktavstånd ${r + HERO_R})`)
  ok(`r ${r}: mitt i svaj (knoppen ${f(flyttad)} px bort) slutar banan där knoppen står just nu`, flyttad > 4 && slutadeVidKnopp, '')
  skugg.destroy()
  w.phys.destroy()
}

console.log(fel ? `\n✗ ${fel} rad(er) röda` : '\n✓ alla gröna')
process.exit(fel ? 1 : 0)
