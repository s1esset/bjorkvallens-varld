// FALLSKÄRM-LANDA-SOND (FYSIKPLAN P1, kund 3) — beror studsen på HUR HÖGT/FORT hoppararen kom ner, och på tyngden?
//
//   node scripts/_dag-fallskarm-landa.mjs            (ingen webbläsare, ~1 s)
//
// KONTROLLARMEN KÖRS FÖRST: HEAD:s landning är en gsap-tidslinje (kopierad ORDAGRANT ur HEAD:
// `index.js:_celebrate`, `.to(chute, {y: GROUND_Y-72 …}).to(… bounce.out).to(… -38 …).to(… bounce.out)`) och
// ska ge EXAKT samma studs för alla fallhöjder och båda tyngderna — det är felet. Kör den på en vanlig
// objekt-nod med gsap (paused, läst med tl.time()), så mäts HEADs riktiga kurva, inte en kopia av dess tal.
//
// MÄTARMEN är spelets EGEN landning: `Gras` + konstanterna ur `src/games/fallskarmen/gras.js` (samma fil
// som spelet importerar), matad med den fart som SPELETS luft (Motstandsvolym, GRAV/V_LATT/MASSA_TUNG ur
// samma fil) ger vid markträffen. Falltiden/farten räknas alltså inte här — den kommer ur fysiken.
//
// ⚠️ FALLHÖJDEN MÄTS ÄRLIGT: luften har en gränsfart (~30 px lätt / ~60 px tung räcker för att nå den),
// så en studs kan bara växa med fallhöjden TILLS gränsfarten är nådd; därefter är det TYNGDEN som skiljer.
// Sonden visar därför både korta fall (där höjden spelar roll) och hela spelfallet (410 px).
import { gsap } from 'gsap'
import { Motstandsvolym } from '../src/lib/luftmotstand.js'
import { Takt } from '../src/lib/takt.js'
import { Gras, GRAS, GRAV, V_LATT, MASSA_TUNG, GROUND_Y, START_Y, HOJD_MAX, UTFART_MAX, forstaLast, passivLast, X_ENHET } from '../src/games/fallskarmen/gras.js'

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const f = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : String(v))
const stigande = (a, m = 0.5) => a.every((v, i) => i === 0 || v > a[i - 1] + m)

// ── Fallet: spelets egen luft ────────────────────────────────────────────────────────────────────────────
// Returnerar nedslagsfarten (px/s) för ett fall på `hojd` px. `vy0` = andel av gränsfarten vid start
// (spelet startar på 0,72; 0 = "skärmen precis fälld"). `bytAtPx`: byt tyngd när så många px återstår
// (spelets `_toggleWeight` mitt i fallet: fart behålls, ny gränsfart).
function fall({ tung, hojd, vy0 = 0, bytAtPx = null }) {
  const luft = new Motstandsvolym({ grav: GRAV })
  const nod = { x: 0, y: GROUND_Y - hojd }
  const last = (massa, vy) => luft.lagg(nod, { massa, gransfart: V_LATT * Math.sqrt(massa), vy })
  let massa = tung ? MASSA_TUNG : 1
  let rec = last(massa, V_LATT * Math.sqrt(massa) * vy0)
  let bytt = false
  let steg = 0
  while (nod.y < GROUND_Y && steg < 20000) {
    if (bytAtPx !== null && !bytt && GROUND_Y - nod.y <= bytAtPx) {
      bytt = true
      massa = tung ? 1 : MASSA_TUNG
      const vy = rec.vy
      luft.ta(rec)
      rec = last(massa, vy)
    }
    luft.steg(1)
    steg++
  }
  return { vIn: rec.vy * 60, steg }
}

// ── HEAD-armen: landningstweenen, ordagrant ──────────────────────────────────────────────────────────────
function headStuds() {
  const o = { y: GROUND_Y }
  const tl = gsap
    .timeline({ paused: true })
    .to(o, { y: GROUND_Y - 72, duration: 0.28, ease: 'power2.out' })
    .to(o, { y: GROUND_Y, duration: 0.26, ease: 'bounce.out' })
    .to(o, { y: GROUND_Y - 38, duration: 0.2, ease: 'power2.out' })
    .to(o, { y: GROUND_Y, duration: 0.22, ease: 'bounce.out' })
  let topp1 = 0
  let topp = 0
  let minY = Infinity
  for (let t = 0; t <= tl.duration() + 1e-9; t += 1 / 60) {
    tl.time(Math.min(t, tl.duration()))
    topp = Math.max(topp, GROUND_Y - o.y)
    if (t <= 0.28 + 1e-9) topp1 = Math.max(topp1, GROUND_Y - o.y)
    minY = Math.min(minY, o.y)
  }
  const dur = tl.duration()
  tl.kill()
  return { topp1, topp, djup: Math.max(0, minY === Infinity ? 0 : o.y - GROUND_Y), dur }
}

// ── NY-armen: Gras, stegad med fast 1/60 s ──────────────────────────────────────────────────────────────
function nyStuds(vIn, { fps = 60, o } = {}) {
  const g = new Gras(o)
  g.landa(vIn)
  const takt = new Takt({ steg: 1000 / 60, max: 4, snapp: 0.5 })
  const dMS = 1000 / fps
  let maxN = 0
  let minDy = 0
  let n = 0
  while (!g.klar && n < 4000) {
    takt.kor(dMS, () => g.steg(1 / 60))
    n++
    minDy = Math.min(minDy, g.dy)
    maxN = Math.max(maxN, g.slagN)
  }
  const res = { topp1: g.topp1, topp: g.topp, djup: g.djupast, t: g.t, slag: g.slagN, flyg: g.flygN, minDy, dyEnd: g.dy, klar: g.klar, k0: forstaLast(vIn) }
  g.destroy()
  return res
}

console.log('═ FALLSKÄRM-LANDA-SOND ═════════════════════════════════════════════════════════════')
console.log(`Gras: ω ${GRAS.W} · ζ ${GRAS.ZETA} · DJUP ${GRAS.DJUP} px · KMIN ${GRAS.KMIN} · VREF ${GRAS.VREF} px/s · G ${GRAS.G} px/s² · X_ENHET ${X_ENHET}`)
console.log(`taket: utfart ${f(UTFART_MAX)} px/s → högsta studs ${f(HOJD_MAX)} px (marken ${GROUND_Y} → lägsta y ${f(GROUND_Y - HOJD_MAX)}, fallskärmens start ${START_Y})`)

// ── §1 KONTROLLARM: HEAD ──────────────────────────────────────────────────────────────────────────────────
console.log('\n§1 HEAD (gsap-tween) — studsen ska vara OBEROENDE av fallhöjd och tyngd')
const HOJDER = [6, 14, 30] // korta fall (innan gränsfarten) — där fallhöjden faktiskt spelar roll
const spelHojd = GROUND_Y - START_Y // 410: spelets riktiga fall
const hh = headStuds()
console.log(`  HEAD-tweenen: första toppen ${f(hh.topp1, 1)} px · högsta ${f(hh.topp, 1)} px · djupast under marken ${f(hh.djup, 1)} px · ${f(hh.dur, 2)} s`)
const fallRader = []
for (const tung of [false, true]) {
  for (const h of [...HOJDER, spelHojd]) {
    const r = fall({ tung, hojd: h })
    fallRader.push({ tung, h, ...r, head: headStuds().topp1 })
  }
}
console.log('  fallhöjd → nedslagsfart (px/s) och HEAD:s första topp (px):')
for (const r of fallRader) console.log(`    ${r.tung ? 'Tung' : 'Lätt'} ${String(r.h).padStart(3)} px → vIn ${f(r.vIn, 1).padStart(6)} px/s · HEAD-topp ${f(r.head, 1)} px`)
const headSpann = Math.max(...fallRader.map((r) => r.head)) - Math.min(...fallRader.map((r) => r.head))
ok('HEAD: första toppen är EXAKT densamma för alla fallhöjder och båda tyngderna (spann < 0,5 px)', headSpann < 0.5, `spann ${f(headSpann, 2)} px (alltid ${f(hh.topp1, 0)})`)
ok('HEAD: ingen inpressning alls — mattan sjunker aldrig (djup 0)', hh.djup < 0.5, `${f(hh.djup, 1)} px`)
// kontrollarmens egen rörlighet: mätaren ska kunna se skillnad när det finns en
const ctl = [20, 40, 60].map((v) => nyStuds(v + 100).topp1)
ok('kontroll: mätaren SER skillnad mellan två känt olika fall (Gras 120/140/160 px/s ger olika toppar)', new Set(ctl.map((v) => f(v, 1))).size === 3, ctl.map((v) => f(v, 1)).join(' / '))

// ── §2 MÄTARM: NY ─────────────────────────────────────────────────────────────────────────────────────────
console.log('\n§2 NY (Gras) — studsen växer med fallhöjden (tills gränsfarten) och med tyngden, och har ett tak')
const nyLatt = HOJDER.map((h) => ({ h, ...fall({ tung: false, hojd: h }) })).map((r) => ({ ...r, ...nyStuds(r.vIn) }))
const nyTung = HOJDER.map((h) => ({ h, ...fall({ tung: true, hojd: h }) })).map((r) => ({ ...r, ...nyStuds(r.vIn) }))
const spelL = (() => { const r = fall({ tung: false, hojd: spelHojd, vy0: 0.72 }); return { h: spelHojd, ...r, ...nyStuds(r.vIn) } })()
const spelT = (() => { const r = fall({ tung: true, hojd: spelHojd, vy0: 0.72 }); return { h: spelHojd, ...r, ...nyStuds(r.vIn) } })()
const rad = (namn, r) => console.log(`  ${namn.padEnd(18)} vIn ${f(r.vIn, 0).padStart(4)} px/s → k0 ${f(r.k0, 2)} · inpressning ${f(r.djup, 1).padStart(4)} px · första studs ${f(r.topp1, 1).padStart(5)} px · slag ${r.slag} · ${f(r.t, 2)} s`)
for (const r of nyLatt) rad(`Lätt, fall ${r.h} px`, r)
for (const r of nyTung) rad(`Tung, fall ${r.h} px`, r)
rad('Lätt, spelet (410)', spelL)
rad('Tung, spelet (410)', spelT)
ok('NY Lätt: första studsen växer med fallhöjden (6 < 14 < 30 px)', stigande(nyLatt.map((r) => r.topp1), 0.4), nyLatt.map((r) => f(r.topp1, 1)).join(' < '))
ok('NY Tung: första studsen växer med fallhöjden (6 < 14 < 30 px)', stigande(nyTung.map((r) => r.topp1), 0.4), nyTung.map((r) => f(r.topp1, 1)).join(' < '))
ok('NY: inpressningen växer med fallhöjden (Lätt och Tung)', stigande(nyLatt.map((r) => r.djup), 0.2) && stigande(nyTung.map((r) => r.djup), 0.2), `${nyLatt.map((r) => f(r.djup, 1)).join('<')} · ${nyTung.map((r) => f(r.djup, 1)).join('<')}`)
for (let i = 0; i < HOJDER.length; i++) ok(`NY: Tung studsar högre OCH sjunker djupare än Lätt vid fallhöjd ${HOJDER[i]} px`, nyTung[i].topp1 > nyLatt[i].topp1 + 0.4 && nyTung[i].djup > nyLatt[i].djup + 0.2, `${f(nyLatt[i].topp1, 1)}→${f(nyTung[i].topp1, 1)} px · ${f(nyLatt[i].djup, 1)}→${f(nyTung[i].djup, 1)} px`)
ok('NY spelfallet (410 px): Tung studsar högre och sjunker djupare än Lätt — tyngd-valet syns', spelT.topp1 > spelL.topp1 * 1.3 && spelT.djup > spelL.djup + 1, `${f(spelL.topp1, 1)}→${f(spelT.topp1, 1)} px · ${f(spelL.djup, 1)}→${f(spelT.djup, 1)} px`)
ok('NY: en synlig, generös studs även för Lätt (>= 25 px) och en tydlig för Tung (>= 50 px)', spelL.topp1 >= 25 && spelT.topp1 >= 50, `${f(spelL.topp1, 1)} / ${f(spelT.topp1, 1)} px (HEAD ${f(hh.topp1, 0)} för båda)`)
// Tyngdbyte precis före marken ger ett MELLANVÄRDE (spelets `_toggleWeight` behåller farten): höjden följer farten.
const bytt = [0, 8, 20, 60].map((px) => ({ px, ...fall({ tung: false, hojd: spelHojd, vy0: 0.72, bytAtPx: px || null }) }))
const bytS = bytt.map((r) => ({ ...r, ...nyStuds(r.vIn) }))
console.log(`  Lätt→Tung ${bytS.map((r) => (r.px ? 'på ' + r.px + ' px kvar' : 'aldrig')).join(' | ')}: vIn ${bytS.map((r) => f(r.vIn, 0)).join(' / ')} px/s → studs ${bytS.map((r) => f(r.topp1, 1)).join(' / ')} px`)
ok('NY: att byta till Tung SENARE i fallet ger lägre studs (monotont — farten styr, inte flaggan)', bytS.every((r, i, a) => i === 0 || r.topp1 >= a[i - 1].topp1 - 0.4), bytS.map((r) => f(r.topp1, 1)).join(' ≤ '))

// ── §3 TAK + AVTAGANDE + TID ──────────────────────────────────────────────────────────────────────────────
console.log('\n§3 tak: aldrig ur bild, avtagande studsar, slut inom tidsramen')
const svep = []
for (let v = 0; v <= 1500; v += 10) svep.push({ v, ...nyStuds(v) })
const maxTopp = Math.max(...svep.map((r) => r.topp))
const maxDjup = Math.max(...svep.map((r) => r.djup))
console.log(`  svep vIn 0…1500 px/s (steg 10): högsta studs ${f(maxTopp, 1)} px (tak ${f(HOJD_MAX, 1)}) · djupaste inpressning ${f(maxDjup, 1)} px · längsta tid ${f(Math.max(...svep.map((r) => r.t)), 2)} s`)
ok('NY: alla svep slutar (klar) och återvänder exakt till marken (dy 0)', svep.every((r) => r.klar && r.dyEnd === 0))
ok(`NY: högsta studs ≤ taket ${f(HOJD_MAX, 0)} px (+ 3 px diskretisering), även vid 1 500 px/s`, maxTopp <= HOJD_MAX + 3, `${f(maxTopp, 1)} px`)
ok('NY: hoppararens lägsta läge över hela svepet ligger kvar i bild (y ≥ START_Y)', GROUND_Y - maxTopp >= START_Y, `lägsta y ${f(GROUND_Y - maxTopp, 0)}`)
ok(`NY: inpressningen går aldrig djupare än ${f(GRAS.DJUP * 1.2, 0)} px (fjäderns eget tak)`, maxDjup <= GRAS.DJUP * 1.2 + 0.01, `${f(maxDjup, 1)} px`)
ok(`NY: högst ${GRAS.MAX_FLYG + 1} nedslag per landning (ingen evighetsstuds)`, svep.every((r) => r.slag <= GRAS.MAX_FLYG + 1), `max ${Math.max(...svep.map((r) => r.slag))}`)
// Avtagande: varje utkast lägre än förra (tydligt) — kollas på spelfallet Tung (värsta fallet).
{
  const g = new Gras()
  g.landa(spelT.vIn)
  const toppar = []
  let cur = 0
  let fasForr = g.fas
  for (let i = 0; i < 600 && !g.klar; i++) {
    g.steg(1 / 60)
    if (g.fas === 'luft') cur = Math.max(cur, g.hojd)
    if (fasForr === 'luft' && g.fas !== 'luft') { toppar.push(cur); cur = 0 }
    fasForr = g.fas
  }
  console.log(`  Tung (spelfallet): utkastens toppar ${toppar.map((v) => f(v, 1)).join(' → ')} px`)
  ok('NY: studsarna AVTAR (varje utkast < 75 % av förra)', toppar.length >= 2 && toppar.every((v, i) => i === 0 || v < toppar[i - 1] * 0.75), toppar.map((v) => f(v, 1)).join(' → '))
}
const tid = Math.max(spelL.t, spelT.t)
ok('NY: både Lätt och Tung färdigstuds inom 1,6 s (spelets nästa-runda-timer)', spelL.t <= 1.6 && spelT.t <= 1.6, `Lätt ${f(spelL.t, 2)} s · Tung ${f(spelT.t, 2)} s (HEAD ${f(hh.dur, 2)} s)`)

// ── §4 BILDFREKVENS ───────────────────────────────────────────────────────────────────────────────────────
console.log('\n§4 samma studs vid 30, 57 och 90 fps (Takt, fast steg)')
for (const [namn, v] of [['Lätt', spelL.vIn], ['Tung', spelT.vIn]]) {
  const a = [30, 57, 60, 90].map((fps) => nyStuds(v, { fps }).topp1)
  console.log(`  ${namn}: topp vid 30/57/60/90 fps = ${a.map((x) => f(x, 2)).join(' / ')} px`)
  ok(`NY ${namn}: första studsen inom 1,5 px mellan 30 och 90 fps`, Math.max(...a) - Math.min(...a) <= 1.5, `spann ${f(Math.max(...a) - Math.min(...a), 2)} px`)
}

// ── §5 300 LANDNINGAR (P0: aldrig ur bild, aldrig stopp) ────────────────────────────────────────────────
console.log('\n§5 300 slumpade landningar — slumpad höjd, tyngd, starthastighet och tyngdbyte i luften')
{
  let s = 12345
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  let hogsta = 0
  let djupast = 0
  let langst = 0
  let ejKlar = 0
  let maxSlag = 0
  for (let i = 0; i < 300; i++) {
    const r = fall({ tung: rnd() < 0.5, hojd: 2 + rnd() * 408, vy0: rnd() < 0.5 ? 0.72 : 0, bytAtPx: rnd() < 0.4 ? rnd() * 80 : null })
    const n = nyStuds(r.vIn)
    hogsta = Math.max(hogsta, n.topp)
    djupast = Math.max(djupast, n.djup)
    langst = Math.max(langst, n.t)
    maxSlag = Math.max(maxSlag, n.slag)
    if (!n.klar) ejKlar++
  }
  console.log(`  högsta läge över 300 landningar: ${f(hogsta, 1)} px över marken (y ${f(GROUND_Y - hogsta, 0)}) · djupast ${f(djupast, 1)} px · längsta ${f(langst, 2)} s · max ${maxSlag} nedslag`)
  ok('300 landningar: aldrig ur bild (högsta y ≥ START_Y) och alla slutar', GROUND_Y - hogsta >= START_Y && ejKlar === 0, `y ${f(GROUND_Y - hogsta, 0)}`)
  ok('300 landningar: längsta studsandet ≤ 2 s', langst <= 2.0, `${f(langst, 2)} s`)
}

// ── §6 RENA TAL ───────────────────────────────────────────────────────────────────────────────────────────
console.log('\n§6 laddningens rena tal')
{
  const a = [0, 40, 85, 142, 200, 999].map((v) => forstaLast(v))
  console.log(`  forstaLast(vIn 0/40/85/142/200/999) = ${a.map((x) => f(x, 2)).join(' / ')}`)
  ok('forstaLast är monoton, ≥ KMIN, ≤ 1', a.every((x, i) => (i === 0 || x >= a[i - 1]) && x >= GRAS.KMIN - 1e-9 && x <= 1))
  ok('passivLast är monoton och ≤ 1', [0, 100, 300, 700, 5000].every((v, i, arr) => passivLast(v) <= 1 && (i === 0 || passivLast(v) >= passivLast(arr[i - 1]))))
}

console.log(`\n${fel ? '✗ ' + fel + ' kontrollrad(er) föll' : '✓ allt höll'}`)
process.exit(fel ? 1 : 0)
