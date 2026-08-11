// FLIPPERSPELETS STUDSYTOR — vilka `restitution`-tal gör något, och vad händer om de väcks?
//
//   node scripts/_flipperprobe.mjs [--cpu 1]        (del 2 kräver dev-servern på :5173)
//
// V10b byggde `{ isStatic: true, studs }` men lämnade valet av första kund till ägaren.
// Ägaren pekade ut `flipperspel` (2026-08-11). Två frågor måste besvaras med tal INNAN en
// rad ändras, för båda kan göra bytet meningslöst:
//
//   1. PARETS REGEL ÄR max(A, B) (mätt i `_studsprobe`), och KULAN bär 0,62. Varje statiskt
//      tal ≤ 0,62 är alltså DUBBELT dött — det spelar ingen roll att `setStatic` nollade
//      det, för kulans eget tal hade vunnit ändå.
//   2. Flera ytor lägger REDAN en egen impuls (`_kickOff` på dynan, `_fireFin` på fenan,
//      `_spinHit` på snurran). Där vore en väckt studs en DUBBLERING, inte en fix.
//
// ⚠️ MÄT INTE EN ENSKILD YTAS STUDS INNE I DET LEVANDE SPELET. Den vägen provades och gav
// fem raka sondfel, alla tysta: (1) `b.position.y = …` flyttar inte kroppens hörn, så kulan
// gick RAKT IGENOM stolpen; (2) `_phys.update` har en ackumulator — en bildruta körde fyra
// fysiksteg och kulan landade 21 px inne i stolpen, som då separerades i SIDLED; (3) en
// avläsning per bildruta missar en studs som varar tre steg; (4) apexhöjd mätt från
// släpppunkten mättade på samma tal i båda armarna; (5) en liten rund stolpe (r=17) mot en
// stor kula (r=28) SPRIDER — utfarten hoppade mellan 0 och 3,37 i samma arm.
// Studskoefficienten hör hemma i en NAKEN fysikvärld, precis som i `_studsprobe.mjs`.
// Del 1 nedan gör det. Del 2 använder webbläsaren bara till det den är bra på: att läsa
// spelets EGNA tal och att kontrollera exit-säkerheten.
import { PhysicsWorld } from '../src/lib/physics.js'
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const CPU = Number(opt('--cpu', 1))

// Spelets egna tal (src/games/flipperspel/index.js)
const GY = 0.85
const BALL_R = 28
const BALL_MAT = { restitution: 0.62, friction: 0.02, frictionAir: 0.01, density: 0.001 }
const PEG_R = 17
const PEG_REST = 0.7
const BUMPER_R = 46
const BUMPER_REST = 0.75 // stjärn-dynan; de andra är 0,68 och 0,82

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const n1 = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(1) : String(v))

// --- DEL 1: naken fysik, spelets geometri --------------------------------------
// Ett rakt fall ner på en statisk cirkel. `studs` = V10b:s opt-in. Mätstorheten är
// APEX efter träffen, samma som `_studsprobe` — px, inte px/steg, för px är det man ser.
function slapp({ r, statiskR, studs, fall = 300 }) {
  const v = new PhysicsWorld({ gravityY: GY, walls: [] })
  const CX = 640
  const CY = 480
  v.circle(CX, CY, r, {
    isStatic: true, restitution: statiskR, friction: 0.02, label: 'yta',
    ...(studs != null ? { studs } : {}),
  })
  const startY = CY - r - BALL_R - fall
  const kula = v.circle(CX, startY, BALL_R, { ...BALL_MAT, label: 'ball' })
  let traffad = false
  let parStuds = null
  let topp = Infinity
  v.onCollision((e) => {
    for (const p of e.pairs) {
      if (p.bodyA.label === 'yta' || p.bodyB.label === 'yta') {
        if (!traffad) parStuds = p.restitution
        traffad = true
      }
    }
  })
  for (let i = 0; i < 400; i++) {
    v.update(1000 / 60)
    if (traffad) topp = Math.min(topp, kula.position.y)
  }
  const kontaktY = CY - r - BALL_R
  v.destroy()
  return { hopp: traffad ? Math.max(0, kontaktY - topp) : 0, parStuds, traffad }
}

console.log('\nFLIPPERSPELET — studsytorna\n')
console.log('  DEL 1: naken fysik med spelets egna tal (kulan bär ' + BALL_MAT.restitution + ')\n')

// Regressionsvakt: nollar setStatic fortfarande talet, och är parets regel max?
const kontroll = slapp({ r: BUMPER_R, statiskR: 0.95 })
ok('setStatic nollar fortfarande det statiska talet', kontroll.parStuds === BALL_MAT.restitution,
  `parets studs blev ${kontroll.parStuds} (= kulans egna, inte 0,95)`)

const rader = [
  ['peg (stolpe)   r=17', PEG_R, PEG_REST],
  ['bumper (dyna)  r=46', BUMPER_R, BUMPER_REST],
]
const utfall = {}
for (const [namn, r, rest] of rader) {
  const idag = slapp({ r, statiskR: rest })
  const vackt = slapp({ r, statiskR: rest, studs: rest })
  const diff = vackt.hopp - idag.hopp
  utfall[namn] = { idag: idag.hopp, vackt: vackt.hopp, diff, par: [idag.parStuds, vackt.parStuds] }
  console.log(`     ${namn}  rest ${rest}:  idag ${n1(idag.hopp).padStart(6)} px (par ${idag.parStuds})  →  vackt ${n1(vackt.hopp).padStart(6)} px (par ${vackt.parStuds})  =  ${diff >= 0 ? '+' : ''}${n1(diff)} px`)
}
const pegDiff = utfall['peg (stolpe)   r=17'].diff
ok('en väckt studs på STOLPEN ändrar hoppet mätbart', pegDiff > 5, `${n1(pegDiff)} px`)
ok('stolpens par går från kulans 0,62 till stolpens 0,7',
  utfall['peg (stolpe)   r=17'].par[0] === BALL_MAT.restitution && utfall['peg (stolpe)   r=17'].par[1] === PEG_REST,
  `${utfall['peg (stolpe)   r=17'].par.join(' → ')}`)

// Ett tal UNDER kulans egna får inte ändra någonting — det är hela poängen med max-regeln,
// och det är kontrollen som gör de sex döda talen i spelet till ett mätt påstående.
const under = slapp({ r: BUMPER_R, statiskR: 0.5 })
const underVackt = slapp({ r: BUMPER_R, statiskR: 0.5, studs: 0.5 })
console.log(`\n     kontroll, tal UNDER kulans 0,62 (0,5):  idag ${n1(under.hopp)} px  →  vackt ${n1(underVackt.hopp)} px`)
ok('ett statiskt tal ≤ kulans egna är en no-op även när det VÄCKS',
  Math.abs(underVackt.hopp - under.hopp) < 0.5, `skillnad ${n1(Math.abs(underVackt.hopp - under.hopp))} px`)

// --- DEL 2: spelets egna tal + exit-säkerhet ------------------------------------
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'flipperspel' }))
  await page.waitForFunction(() => !!window.__barnspel.game?._ball, null, { timeout: 20000 })
  await page.waitForTimeout(1500)

  console.log('\n  DEL 2: spelets egna statiska tal\n')
  const tal = await page.evaluate(() => {
    const g = window.__barnspel.game
    const kroppar = g._phys.world?.bodies || g._phys.engine?.world?.bodies || []
    const ut = {}
    for (const b of kroppar) {
      if (!b.isStatic) continue
      const r = b._original ? b._original.restitution : b.restitution
      if (r == null) continue
      ;(ut[b.label] = ut[b.label] || []).push(Math.round(r * 100) / 100)
      ut[b.label].levande = (b.restitution || 0) > 0
    }
    return { ytor: ut, kula: g._ball.restitution }
  })
  let levande = 0
  let doda = 0
  for (const [label, rs] of Object.entries(tal.ytor)) {
    const unika = [...new Set(rs)].sort((a, b) => a - b)
    const over = unika.filter((r) => r > tal.kula)
    over.length ? levande++ : doda++
    console.log(`     ${label.padEnd(9)} ${unika.join(', ').padEnd(20)} ${over.length ? '← ' + over.join('/') + ' ligger OVER kulan' : '(dott aven om det vacks: <= ' + tal.kula + ')'}`)
  }
  ok('minst en yta ligger över kulans egen studs (annars är spelet fel kund)', levande > 0, `${levande} ytor över, ${doda} under`)

  // Regressionsvakt för fixen: stolpens LEVANDE restitution ska vara 0,7, inte 0. Utan den
  // här raden ser tabellen ovan likadan ut före och efter — den läser `_original`.
  const pegLevande = await page.evaluate(() => {
    const g = window.__barnspel.game
    const kroppar = g._phys.world?.bodies || g._phys.engine?.world?.bodies || []
    return kroppar.filter((b) => b.label === 'peg').map((b) => b.restitution)
  })
  ok('stolparnas studs är VÄCKT i det körande spelet', pegLevande.length > 0 && pegLevande.every((r) => r === 0.7),
    `restitution ${pegLevande.join(', ')} på ${pegLevande.length} stolpar`)

  // Har dynan en EGEN impuls? Den frågan avgör om den får väckas alls.
  const egenImpuls = await page.evaluate(() => typeof window.__barnspel.game._kickOff === 'function')
  ok('dynan har en EGEN impuls (_kickOff) — väcks inte, det vore en dubblering', egenImpuls, 'ja')

  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  ok('exit mitt i spelet ger inga konsolfel', errors.length === 0, errors[0] || 'inga')
} finally {
  await browser.close()
}

console.log(`\n${fel === 0 ? 'ALLA GRÖNA' : fel + ' FEL'}\n`)
process.exit(fel === 0 ? 0 : 1)
