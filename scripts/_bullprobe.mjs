// Mäter hamburgerbyggets BRÖD som mjuka kroppar — utan webbläsare (formen är rena tal).
//
//   node scripts/_bullprobe.mjs
//
// Frågorna bullen måste svara ja på:
//   1. Ser en TOM burgare likadan ut som förut? (den ritade kurvan mot den gamla
//      roundRect:en — inte ringen, för `path()` ritar kvadratik genom mittpunkter)
//   2. Sjunker den under tyngd, och gör den det MONOTONT med antalet lager?
//   3. Breder den ut sig i sidled när den plattas (volym trängs undan)?
//   4. Sjunker den ALDRIG genom fatet, och kollapsar den aldrig till ett streck?
//   5. Vobblar den när ett lager landar — och lugnar den sig igen?
//   6. Går den tillbaka till exakt viloform när burgaren nollställs?
//   7. Ligger sesamfröna kvar PÅ bullen när den deformeras?
import {
  makeBullkropp, stegBulle, sattVikt, aterstall, ritaBulle, froFasten, froLage, matt, rorelse,
} from '../src/games/hamburgerbygget/bulle.js'

let fel = 0
function ok(namn, villkor, detalj = '') {
  if (villkor) console.log(`  ✓ ${namn}${detalj ? ' · ' + detalj : ''}`)
  else { console.log(`  ✗ ${namn}${detalj ? ' · ' + detalj : ''}`); fel++ }
}

// --- Falsk Graphics som SAMPLAR den ritade kurvan (det är den ögat ser) --------
function makeRec() {
  const pts = []
  let cur = { x: 0, y: 0 }
  return {
    pts,
    moveTo(x, y) { cur = { x, y }; pts.push({ x, y }); return this },
    lineTo(x, y) { cur = { x, y }; pts.push({ x, y }); return this },
    quadraticCurveTo(cx, cy, x, y) {
      const a = cur
      for (let s = 1; s <= 12; s++) {
        const t = s / 12
        const u = 1 - t
        pts.push({ x: u * u * a.x + 2 * u * t * cx + t * t * x, y: u * u * a.y + 2 * u * t * cy + t * t * y })
      }
      cur = { x, y }
      return this
    },
    closePath() { return this },
    ellipse() { return this },
    fill() { return this },
    stroke() { return this },
    clear() { pts.length = 0; return this },
  }
}
const bbox = (pts) => ({
  b: Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)),
  h: Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y)),
})

// Kroppens egen path, utan band (band ligger innanför och stör inte bbox:en).
function kroppBbox(m) {
  const g = makeRec()
  m.path(g)
  return bbox(g.pts)
}

const kor = (m, n, per) => { for (let i = 0; i < n; i++) { per?.(i); stegBulle(m, 1) } }
const bygg = (w, h, r) => makeBullkropp({ w, h, r, punkter: 20, styvhet: 1 })

// Spelets tal (måste följa index.js).
const UNDER = { w: 224, h: 50, r: 16 }
const OVER = { w: 232, h: 62, r: 30 }

console.log('\n1. den TOMMA burgaren ser ut som forut (ritad kurva mot gamla roundRect)')
{
  for (const [namn, s] of [['underbullen', UNDER], ['overbullen', OVER]]) {
    const m = bygg(s.w, s.h, s.r)
    const d = kroppBbox(m)
    ok(`${namn} bredd`, Math.abs(d.b - s.w) <= 3, `${s.w} → ${d.b.toFixed(1)} px`)
    ok(`${namn} hojd`, Math.abs(d.h - s.h) <= 3, `${s.h} → ${d.h.toFixed(1)} px`)
  }
}

console.log('\n2. tyngden syns: ovansidan sjunker MONOTONT med lagren')
{
  const rader = []
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    const m = bygg(UNDER.w, UNDER.h, UNDER.r)
    sattVikt(m, v)
    kor(m, 260)
    rader.push({ v, ...matt(m), fyll: m.fyllnad() })
  }
  for (const r of rader) {
    console.log(`    vikt ${r.v.toFixed(2)} · topp ${r.topp.toFixed(1)} · hojd ${r.hojd.toFixed(1)} · bredd ${r.bredd.toFixed(1)} · fyllnad ${r.fyll.toFixed(2)}`)
  }
  const sjunker = rader.every((r, i) => i === 0 || r.topp > rader[i - 1].topp + 0.3)
  ok('ovansidan sjunker vid VARJE steg', sjunker)
  const d = rader[4].topp - rader[0].topp
  ok('och tillrackligt for att SYNAS', d >= 5, `${d.toFixed(1)} px vid full stapel`)
  const br = rader[4].bredd - rader[0].bredd
  ok('bullen breder ut sig i sidled', br >= 4, `${rader[0].bredd.toFixed(1)} → ${rader[4].bredd.toFixed(1)} px`)
  ok('men kollapsar aldrig', rader.every((r) => r.fyll > 0.55 && r.hojd > UNDER.h * 0.5), `minsta fyllnad ${Math.min(...rader.map((r) => r.fyll)).toFixed(2)}`)
}

console.log('\n3. bullen sjunker aldrig genom fatet')
{
  const m = bygg(UNDER.w, UNDER.h, UNDER.r)
  const golv = m._bullGolv
  let varst = -Infinity
  sattVikt(m, 1)
  kor(m, 400, (i) => { if (i % 40 === 0) m.skjut(0, 9) })
  for (let i = 0; i < m.n; i++) varst = Math.max(varst, m.pts[i].y)
  ok('ingen punkt under fatet', varst <= golv + 0.01, `golv ${golv.toFixed(1)} · lagsta ${varst.toFixed(1)}`)
}

console.log('\n4. ett lager LANDAR: vobbel som lugnar sig')
{
  // ⚠️ Kravet "star still" ar 0,00 exakt, inte "litet". Med en ren golvklamma i stallet
  // for en pinnad botten lag `rorelse` kvar pa 9,9 for alltid — en granscykel dar trycket
  // putar botten ner genom fatet och klamman lyfter tillbaka den, varje bildruta. Ett
  // slappt tak (<0,6) hade slappt igenom precis den buggen.
  for (const vikt of [0, 0.5, 1]) {
    const m = bygg(UNDER.w, UNDER.h, UNDER.r)
    sattVikt(m, vikt)
    kor(m, 300)
    ok(`vikt ${vikt}: bullen star HELT still i vila`, rorelse(m) < 0.01, `rorelse ${rorelse(m).toFixed(3)}`)
    const vila = matt(m).topp
    m.skjut(0, 5)
    let djupast = vila
    let lugn = -1
    for (let i = 1; i <= 400; i++) {
      stegBulle(m, 1)
      djupast = Math.max(djupast, matt(m).topp)
      if (lugn < 0 && i > 5 && rorelse(m) < 0.01) lugn = i
    }
    ok(`vikt ${vikt}: utslaget syns`, djupast - vila >= 2, `${(djupast - vila).toFixed(1)} px`)
    ok(`vikt ${vikt}: den lugnar sig igen`, lugn > 0 && Math.abs(matt(m).topp - vila) < 1, `efter ${lugn < 0 ? '>400' : lugn} bildrutor · avvik ${(matt(m).topp - vila).toFixed(2)} px`)
  }
}

console.log('\n4b. TAPPADE BILDRUTOR far inte vika ihop bullen')
{
  // Faltet integreras som falt·f², villkorsvarven gor det inte — utan delsteg gav
  // dtF 2 en bulle som veks ihop 34,9 px av 50 och aldrig reste sig igen.
  const ref = bygg(UNDER.w, UNDER.h, UNDER.r)
  sattVikt(ref, 1)
  kor(ref, 400)
  const sankRef = matt(ref).topp + UNDER.h / 2
  for (const dtF of [1.5, 2, 3]) {
    const m = bygg(UNDER.w, UNDER.h, UNDER.r)
    sattVikt(m, 1)
    for (let i = 0; i < 300; i++) stegBulle(m, dtF)
    for (let k = 0; k < 4; k++) { m.skjut(0, 6); for (let i = 0; i < 100; i++) stegBulle(m, dtF) }
    for (let i = 0; i < 300; i++) stegBulle(m, 1)
    const sank = matt(m).topp + UNDER.h / 2
    ok(`dtF ${dtF} ger samma bulle som dtF 1`, Math.abs(sank - sankRef) < 2.5, `${sankRef.toFixed(1)} → ${sank.toFixed(1)} px`)
  }
}

console.log('\n5. ny burgare: aterstall ger EXAKT viloformen')
{
  const m = bygg(UNDER.w, UNDER.h, UNDER.r)
  const f0 = kroppBbox(m)
  sattVikt(m, 1)
  kor(m, 300, (i) => { if (i % 30 === 0) m.skjut(0, 10) })
  aterstall(m)
  const f1 = kroppBbox(m)
  ok('bredden tillbaka', Math.abs(f1.b - f0.b) < 0.01, `${f0.b.toFixed(2)} → ${f1.b.toFixed(2)}`)
  ok('hojden tillbaka', Math.abs(f1.h - f0.h) < 0.01, `${f0.h.toFixed(2)} → ${f1.h.toFixed(2)}`)
  ok('och den star still', rorelse(m) < 0.001, rorelse(m).toFixed(4))
}

console.log('\n6. sesamfronen rider med pa den deformerade bullen')
{
  const m = bygg(OVER.w, OVER.h, OVER.r)
  const fron = []
  for (let i = -78; i <= 78; i += 26) fron.push({ x: i, y: -OVER.h / 2 + 18, rx: 5, ry: 8 })
  const fasten = froFasten(m, fron)
  const inuti = (p) => {
    // Punkt i polygon (ringen) — fröet ska ligga PA bullen, inte bredvid den.
    let inne = false
    for (let i = 0, j = m.n - 1; i < m.n; j = i++) {
      const a = m.pts[i]
      const b = m.pts[j]
      if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inne = !inne
    }
    return inne
  }
  ok('alla fron pa plats i vila', froLage(m, fasten).every(inuti), `${fron.length} fron`)
  sattVikt(m, 1)
  kor(m, 300, (i) => { if (i % 30 === 0) m.skjut(0, 10) })
  const kvar = froLage(m, fasten).filter(inuti).length
  ok('alla fron kvar efter deformation', kvar === fron.length, `${kvar}/${fron.length}`)
}

console.log('\n7. ritningen ar hel (band + fron ritas utan NaN)')
{
  const m = bygg(OVER.w, OVER.h, OVER.r)
  const fron = froFasten(m, [{ x: 0, y: -12, rx: 5, ry: 8 }])
  sattVikt(m, 0.8)
  kor(m, 120, (i) => { if (i % 20 === 0) m.skjut(0, 7) })
  const g = makeRec()
  ritaBulle(g, m, {
    fyll: 0xe8b06a,
    topp: { tj: 22, farg: 0xf3c98a, alpha: 0.6 },
    fron, fronFarg: 0xfbe9c0,
  })
  ok('inga NaN i den ritade kurvan', g.pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), `${g.pts.length} punkter`)
}

console.log(fel === 0 ? '\nALLT GRONT\n' : `\n${fel} FEL\n`)
process.exit(fel ? 1 : 0)
