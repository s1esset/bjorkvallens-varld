// Mäter lib/mjukkropp.js i tal — utan webbläsare (kroppen är rena tal).
//
//   node scripts/_mjukprobe.mjs
//
// Frågorna en mjuk kropp måste svara ja på: håller den formen när den är hård,
// SJUNKER den när den mjuknar, kollapsar den ALDRIG till ett streck, tar den
// tillbaka sin form efter en knuff, och sitter fästpunkten still?
import { Mjukkropp } from '../src/lib/mjukkropp.js'

let fel = 0
function ok(namn, villkor, detalj = '') {
  if (villkor) console.log(`  ✓ ${namn}${detalj ? ' · ' + detalj : ''}`)
  else { console.log(`  ✗ ${namn}${detalj ? ' · ' + detalj : ''}`); fel++ }
}
const kor = (m, n, per) => { for (let i = 0; i < n; i++) { per?.(i); m.steg(1) } }
const mat = (m) => {
  const xs = m.pts.slice(0, m.n).map((p) => p.x)
  const ys = m.pts.slice(0, m.n).map((p) => p.y)
  return { b: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}

console.log('\nhård kropp håller sin form')
{
  const m = new Mjukkropp({ x: 0, y: 0, w: 40, h: 52, grav: 0.35 })
  const f0 = mat(m)
  m.fast(m.topp, 0, -26)
  kor(m, 200)
  const f1 = mat(m)
  ok('bredden nästan oförändrad', Math.abs(f1.b - f0.b) / f0.b < 0.16, `${f0.b.toFixed(1)} → ${f1.b.toFixed(1)} px`)
  ok('höjden nästan oförändrad', Math.abs(f1.h - f0.h) / f0.h < 0.16, `${f0.h.toFixed(1)} → ${f1.h.toFixed(1)} px`)
  ok('fyllnaden nära 1', m.fyllnad() > 0.82, m.fyllnad().toFixed(2))
}

console.log('\nvarm kropp DROPPAR runt pinnen (marshmallow-fallet)')
{
  // Pinnen går IGENOM marshmallowen → mittpunkten är fast. Ett hängande mjukt
  // föremål som bara är spikat i TOPPEN töjs i stället ut, vilket också är rätt
  // fysik — men det är inte den här bilden. Testet mätte först fel fall och
  // rapporterade "blir högre" som ett fel; kroppen gjorde precis rätt saker.
  const botten = (m) => Math.max(...m.pts.slice(0, m.n).map((p) => p.y))
  const topp = (m) => Math.min(...m.pts.slice(0, m.n).map((p) => p.y))

  const hard = new Mjukkropp({ x: 0, y: 0, w: 40, h: 52, grav: 0.35 })
  hard.fast(hard.mitt, 0, 0)
  kor(hard, 240)

  const mjuk = new Mjukkropp({ x: 0, y: 0, w: 40, h: 52, grav: 0.35 })
  mjuk.fast(mjuk.mitt, 0, 0)
  mjuk.mjukhet(1)
  kor(mjuk, 240)

  console.log(`    hård  topp ${topp(hard).toFixed(1)} botten ${botten(hard).toFixed(1)} · bredd ${mat(hard).b.toFixed(1)} · fyllnad ${hard.fyllnad().toFixed(2)}`)
  console.log(`    mjuk  topp ${topp(mjuk).toFixed(1)} botten ${botten(mjuk).toFixed(1)} · bredd ${mat(mjuk).b.toFixed(1)} · fyllnad ${mjuk.fyllnad().toFixed(2)}`)
  ok('ovansidan plattas till', topp(mjuk) > topp(hard) + 3, `${topp(hard).toFixed(1)} → ${topp(mjuk).toFixed(1)} px`)
  ok('den breder ut sig i sidled', mat(mjuk).b > mat(hard).b + 3, `${mat(hard).b.toFixed(1)} → ${mat(mjuk).b.toFixed(1)} px`)

  // Att mäta underkantens ABSOLUTA läge blandar ihop två effekter: kroppen sjunker
  // ihop (drar UPP underkanten) och tyngden drar ner den. Nettot säger ingenting om
  // huruvida gravitationen ens verkar — sonden rapporterade först "droppar inte"
  // om en kropp som droppade alldeles utmärkt. Jämför samma mjuka kropp med och
  // utan tyngd, så mäts droppet ensamt.
  const utanTyngd = new Mjukkropp({ x: 0, y: 0, w: 40, h: 52, grav: 0 })
  utanTyngd.fast(utanTyngd.mitt, 0, 0)
  utanTyngd.mjukhet(1)
  kor(utanTyngd, 240)
  // Underkantens läge duger inte ens i den jämförelsen: tyngden drar hela massan
  // ned MOT pinnen, så materialet som lämnar ovansidan kommer inte ut i underkanten
  // — silhuettens botten sätts av trycket, inte av tyngden. Det entydiga måttet är
  // var MASSAN ligger i förhållande till pinnen.
  const tyngdpunkt = (m) => m.pts.slice(0, m.n).reduce((s, p) => s + p.y, 0) / m.n
  ok('tyngden lägger massan UNDER pinnen', tyngdpunkt(mjuk) > tyngdpunkt(utanTyngd) + 0.5,
    `utan tyngd ${tyngdpunkt(utanTyngd).toFixed(2)} → med ${tyngdpunkt(mjuk).toFixed(2)} px`)
  ok('volymen bevaras (den smälter inte bort)', mjuk.fyllnad() > 0.8, mjuk.fyllnad().toFixed(2))
  ok('kollapsar ALDRIG till ett streck', mat(mjuk).b > 8 && mat(mjuk).h > 8)
  ok('inga NaN', mjuk.pts.every((p) => isFinite(p.x) && isFinite(p.y)))
}

console.log('\nen knuff syns direkt och studsar tillbaka')
{
  const m = new Mjukkropp({ x: 0, y: 0, w: 44, h: 44, grav: 0 })
  const f0 = mat(m)
  m.knuff(0, 26, 16, 34) // finger mot underkanten, kort räckvidd → verklig intryckning
  const direkt = mat(m)
  kor(m, 240)
  const ater = mat(m)
  console.log(`    vila ${f0.h.toFixed(1)} px · knuffad ${direkt.h.toFixed(1)} px · efter ${ater.h.toFixed(1)} px`)
  ok('knuffen syns på bildrutan den sker', Math.abs(direkt.h - f0.h) > 1.5, `${f0.h.toFixed(1)} → ${direkt.h.toFixed(1)} px`)
  ok('formen kommer tillbaka', Math.abs(ater.h - f0.h) / f0.h < 0.14, `${f0.h.toFixed(1)} → ${ater.h.toFixed(1)} px`)
}

console.log('\nfästpunkten står still')
{
  const m = new Mjukkropp({ x: 100, y: 100, w: 40, h: 40, grav: 0.6 })
  let varst = 0
  kor(m, 300, () => {
    m.fast(m.topp, 100, 80)
    varst = Math.max(varst, Math.hypot(m.pts[m.topp].x - 100, m.pts[m.topp].y - 80))
  })
  ok('pinnen håller', varst < 0.001, `max ${varst.toFixed(5)} px`)
}

console.log('\nflytta: kroppen följer med utan att tappa formen')
{
  const m = new Mjukkropp({ x: 0, y: 0, w: 40, h: 40, grav: 0 })
  const f0 = mat(m)
  for (let i = 0; i < 60; i++) { m.flytta(4, 1); m.steg(1) }
  const f1 = mat(m)
  ok('formen intakt efter 240 px förflyttning', Math.abs(f1.h - f0.h) / f0.h < 0.12 && Math.abs(f1.b - f0.b) / f0.b < 0.12,
    `${f0.b.toFixed(1)}×${f0.h.toFixed(1)} → ${f1.b.toFixed(1)}×${f1.h.toFixed(1)}`)
  ok('mitten har flyttat sig med', m.centrum.x > 200, `x ${m.centrum.x.toFixed(0)}`)
}

console.log('\nexit')
{
  const m = new Mjukkropp({ w: 20, h: 20 })
  m.destroy()
  m.steg(1)
  ok('steg() efter destroy() är ofarligt', m.pts.length === 0)
}

console.log(fel === 0 ? '\n✓ mjukprobe: allt grönt\n' : `\n✗ mjukprobe: ${fel} fel\n`)
process.exit(fel === 0 ? 0 : 1)
