// Mäter lib/magnet.js i TAL — utan webbläsare (matter + rena tal).
//
//   node scripts/_faltprobe.mjs
//
// Ett kraftfält är den lättaste koden i appen att skriva FEL utan att märka det: talen
// ser rimliga ut, spelet startar, inget konsolfel skrivs — och så suger magneten in hela
// dammen på en sekund (det HÄNDE, se `speedToAccel` i physics.js). Frågorna fältet måste
// svara ja på: ger `styrka` den fart den lovar, halveras farten vid dubbla avståndet,
// är fältet dött utanför sin radie och när det är avstängt, knuffar `knuff()` verkligen
// BORT — och räknar biblioteket samma tal som magnet-fiskes egen kod gjorde?
import Matter from 'matter-js'
import { PhysicsWorld, speedToAccel, STEG2 } from '../src/lib/physics.js'
import { Magnetfalt } from '../src/lib/magnet.js'

const { Body } = Matter

let fel = 0
function ok(namn, villkor, detalj = '') {
  if (villkor) console.log(`  ✓ ${namn}${detalj ? ' · ' + detalj : ''}`)
  else { console.log(`  ✗ ${namn}${detalj ? ' · ' + detalj : ''}`); fel++ }
}

// magnet-fiskes egna tal.
const FRICTION_AIR = 0.06
const R_FIELD = 300
const R_MIN = 28
const PULL = 480
const PULL_MAX = 14
const DUCK_PUSH_R = 80
const DUCK_PUSH = 4

const damm = () => new PhysicsWorld({ gravityY: 0, walls: [] })
const sak = (varld, x, y) => varld.circle(x, y, 38, { restitution: 0.2, friction: 0.1, frictionAir: FRICTION_AIR, density: 0.0012 })

// Kör n steg med fältet fastspikat i (fx, fy) och returnera slutfarten (px/steg).
function kor(varld, falt, b, n, verka = (f, kropp) => f.dra(kropp)) {
  for (let i = 0; i < n; i++) {
    verka(falt, b)
    varld.update(1000 / 60)
  }
  return Math.hypot(b.velocity.x, b.velocity.y)
}

console.log('\nkalibrering: styrkan är px/steg, inte matters kraftenhet')
{
  // v∞ = a · 277,78 / frictionAir. Går omräkningen rätt ska en kropp som hålls på
  // ett fast avstånd landa på exakt den fart profilen lovar.
  for (const [d, vantad] of [[300, PULL / 300], [150, PULL / 150], [60, PULL / 60]]) {
    const varld = damm()
    const falt = new Magnetfalt({ x: 640, y: 360, radie: R_FIELD, styrka: PULL, minAvstand: R_MIN, maxFart: PULL_MAX })
    const b = sak(varld, 640 - d, 360)
    // Håll avståndet konstant: nolla läget varje steg, mät bara farten fältet bygger upp.
    let v = 0
    for (let i = 0; i < 400; i++) {
      falt.dra(b)
      varld.update(1000 / 60)
      v = Math.hypot(b.velocity.x, b.velocity.y)
      Body.setPosition(b, { x: 640 - d, y: 360 })
    }
    ok(`avstånd ${d} px → ${vantad.toFixed(2)} px/steg`, Math.abs(v - vantad) / vantad < 0.02, `uppmätt ${v.toFixed(2)}`)
  }
  ok('speedToAccel utan luftmotstånd = fart efter ETT steg', Math.abs(speedToAccel(5, 0) * STEG2 - 5) < 1e-9)
}

console.log('\n1/r: dubbelt avstånd = halva farten')
{
  const falt = new Magnetfalt({ x: 0, y: 0, radie: R_FIELD, styrka: PULL, minAvstand: R_MIN, maxFart: PULL_MAX })
  const varld = damm()
  const nara = sak(varld, 100, 0)
  const langt = sak(varld, 200, 0)
  const fn = falt.dra(nara)
  const fl = falt.dra(langt)
  ok('halva farten vid dubbla avståndet', Math.abs(fn / fl - 2) < 0.001, `${fn.toFixed(2)} vs ${fl.toFixed(2)} px/steg`)
}

console.log('\ntak och golv: ingen singularitet, ingen tunnling')
{
  const falt = new Magnetfalt({ x: 0, y: 0, radie: R_FIELD, styrka: PULL, minAvstand: R_MIN, maxFart: PULL_MAX })
  const varld = damm()
  let max = 0
  for (const d of [1, 5, 14, 28, 46]) {
    const b = sak(varld, d, 0)
    max = Math.max(max, falt.dra(b))
  }
  ok('farten aldrig över taket', max <= PULL_MAX + 1e-9, `toppfart ${max.toFixed(2)} px/steg (tak ${PULL_MAX}, väggarna 40 px tjocka)`)
}

console.log('\nfältet slutar: radie, avstängning, statiska kroppar')
{
  const varld = damm()
  const falt = new Magnetfalt({ x: 0, y: 0, radie: R_FIELD, styrka: PULL, minAvstand: R_MIN, maxFart: PULL_MAX })
  const ute = sak(varld, R_FIELD + 1, 0)
  ok('utanför radien: ingen kraft', falt.dra(ute) === 0)
  const inne = sak(varld, 120, 0)
  falt.aktiv = false
  ok('avstängt fält: ingen kraft', falt.dra(inne) === 0, 'en magnet i luften fiskar inte')
  falt.aktiv = true
  const vagg = varld.rectangle(60, 0, 40, 200, { isStatic: true })
  ok('statiska kroppar rörs aldrig', falt.dra(vagg) === 0)
}

console.log('\nknuff: BORT, och lika hårt i hela radien')
{
  const varld = damm()
  const falt = new Magnetfalt({ x: 0, y: 0 })
  const b = sak(varld, 40, 0)
  const f1 = falt.knuff(b, { radie: DUCK_PUSH_R, styrka: DUCK_PUSH, profil: 'jamn' })
  const b2 = sak(varld, 75, 0)
  const f2 = falt.knuff(b2, { radie: DUCK_PUSH_R, styrka: DUCK_PUSH, profil: 'jamn' })
  ok('jämn profil: samma fart nära och långt bort', Math.abs(f1 - f2) < 1e-9, `${f1.toFixed(2)} px/steg`)
  const x0 = b.position.x
  kor(varld, falt, b, 120, (f, kropp) => f.knuff(kropp, { radie: DUCK_PUSH_R, styrka: DUCK_PUSH, profil: 'jamn' }))
  ok('kroppen rör sig BORT från fältet', b.position.x > x0 + 5, `x ${x0.toFixed(1)} → ${b.position.x.toFixed(1)}`)
  const ute = sak(varld, DUCK_PUSH_R + 1, 0)
  ok('utanför knuff-radien: inget fniss-läge', falt.knuff(ute, { radie: DUCK_PUSH_R, styrka: DUCK_PUSH, profil: 'jamn' }) === 0)
}

console.log('\nPORTEN: biblioteket räknar samma tal som magnet-fiskes egen kod')
{
  // Den handrullade koden, ordagrant ur src/games/magnet-fiske/index.js före bytet.
  const SPEED_TO_A = FRICTION_AIR / 277.78
  const gammalDrag = (b, tip) => {
    const p = b.position
    const dx = tip.x - p.x
    const dy = tip.y - p.y
    const dist = Math.hypot(dx, dy) || 0.0001
    if (dist < R_FIELD) {
      const a = Math.min(PULL / Math.max(dist, R_MIN), PULL_MAX) * SPEED_TO_A
      Body.applyForce(b, p, { x: b.mass * a * (dx / dist), y: b.mass * a * (dy / dist) })
    }
  }
  const gammalKnuff = (b, tip) => {
    const p = b.position
    const dx = tip.x - p.x
    const dy = tip.y - p.y
    const dist = Math.hypot(dx, dy) || 0.0001
    if (dist < DUCK_PUSH_R) {
      const da = DUCK_PUSH * SPEED_TO_A
      Body.applyForce(b, p, { x: b.mass * da * (-dx / dist), y: b.mass * da * (-dy / dist) })
    }
  }

  // MÄT RÄTT SAK. Fältet är inte bit-identiskt med spelets gamla kod, och ska inte
  // vara det: spelet bar `277.78` som avrundad literal där dt² är 277,7778 (biblioteket
  // räknar exakt), och multiplikationsordningen skiljer sig. Skillnaden är 8·10⁻⁵
  // relativt — men matter + kollisioner är ett kaotiskt system, så EN sådan ulp driver
  // isär banorna över hundratals steg. Uppmätt nedan, så ingen tror att det är en bugg.
  // Det som avgör om spelet känns likadant är i stället FÅNGSTTIDEN: hur många steg
  // det tar innan en sak snäpper fast från ett givet avstånd.
  {
    const STICK_R = 46
    const tider = []
    for (const d of [80, 150, 220, 290]) {
      const g = (() => {
        const w = damm()
        const b = sak(w, 640 - d, 360)
        for (let i = 1; i <= 2000; i++) {
          gammalDrag(b, { x: 640, y: 360 })
          w.update(1000 / 60)
          if (Math.hypot(640 - b.position.x, 360 - b.position.y) < STICK_R) return i
        }
        return -1
      })()
      const n = (() => {
        const w = damm()
        const b = sak(w, 640 - d, 360)
        const f = new Magnetfalt({ x: 640, y: 360, radie: R_FIELD, styrka: PULL, minAvstand: R_MIN, maxFart: PULL_MAX })
        for (let i = 1; i <= 2000; i++) {
          f.dra(b)
          w.update(1000 / 60)
          if (Math.hypot(640 - b.position.x, 360 - b.position.y) < STICK_R) return i
        }
        return -1
      })()
      tider.push(`${d}px: ${g}=${n}`)
      if (g !== n) fel++
    }
    ok('fångsttiden är identisk STEG FÖR STEG från fyra avstånd', !tider.some((t) => t.includes('-1')), tider.join(' · '))
  }

  // Kort horisont (2 s lek) med magneten i rörelse: banorna är i praktiken samma kurva.
  {
    const A = damm()
    const B = damm()
    const falt = new Magnetfalt({ radie: R_FIELD, styrka: PULL, minAvstand: R_MIN, maxFart: PULL_MAX })
    const g = sak(A, 400, 300)
    const n = sak(B, 400, 300)
    const anka = sak(A, 620, 340)
    const ankaNy = sak(B, 620, 340)
    let kort = 0
    let lang = 0
    for (let i = 0; i < 900; i++) {
      const tip = { x: 640 + Math.cos(i / 60) * 220, y: 380 + Math.sin(i / 45) * 120 }
      falt.flytta(tip.x, tip.y)
      gammalDrag(g, tip)
      gammalKnuff(anka, tip)
      A.update(1000 / 60)
      falt.dra(n)
      falt.knuff(ankaNy, { radie: DUCK_PUSH_R, styrka: DUCK_PUSH, profil: 'jamn' })
      B.update(1000 / 60)
      const d = Math.max(
        Math.hypot(g.position.x - n.position.x, g.position.y - n.position.y),
        Math.hypot(anka.position.x - ankaNy.position.x, anka.position.y - ankaNy.position.y)
      )
      if (i < 120) kort = Math.max(kort, d)
      lang = Math.max(lang, d)
    }
    ok('120 steg (2 s): banorna sammanfaller', kort < 0.01, `största avvikelse ${kort.toExponential(1)} px`)
    console.log(`    (900 steg: ${lang.toFixed(1)} px — den avrundade konstanten 277.78 mot exakta dt², förstärkt av kollisionskaos. Inte en regression, se kommentaren i sonden.)`)
  }

  // Gränsen är INKLUSIV (d ≤ radie) där spelet hade `dist < R_FIELD`. Det är avsiktligt:
  // en sak som råkar ligga exakt på fältkanten ska dras in, inte stå kvar för evigt.
  {
    const w = damm()
    const f = new Magnetfalt({ x: 640, y: 360, radie: R_FIELD, styrka: PULL, minAvstand: R_MIN, maxFart: PULL_MAX })
    const b = sak(w, 640 - R_FIELD, 360)
    ok('exakt på fältkanten: dras in (spelets `<` lämnade den kvar)', f.dra(b) > 0)
  }
}

console.log('\nexit-säkerhet')
{
  const varld = damm()
  const falt = new Magnetfalt({ x: 0, y: 0, radie: R_FIELD, styrka: PULL })
  const b = sak(varld, 120, 0)
  kor(varld, falt, b, 60)
  falt.destroy()
  Body.setVelocity(b, { x: 0, y: 0 })
  const fore = { x: b.position.x, y: b.position.y }
  ok('dra() efter destroy() ger 0', falt.dra(b) === 0)
  varld.update(1000 / 60)
  ok('kroppen rör sig inte', Math.abs(b.position.x - fore.x) < 1e-9 && Math.abs(b.position.y - fore.y) < 1e-9)
}

console.log(fel === 0 ? '\nALLT GRÖNT\n' : `\n${fel} FEL\n`)
process.exit(fel ? 1 : 0)
