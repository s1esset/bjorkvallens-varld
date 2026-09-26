// HANDTAGSSOND — popcornkalasets gryta med SIDOHANDTAG (ägarens design 2026-09-26): ta i grytan
// = den bärs stadigt; ta i ett handtag = den hänger där och tippar lugnt; inga osynliga spärrar
// — släpps den landar den där den är (t.ex. på en skål), och man tar nytt tag i ett handtag
// för att hälla, skaka och portionera. Rena tal + matter, samma Karl och rum som spelet.
//
//   node scripts/_popcornhandtag.mjs [--fall H2] [--spar] [--golv]
//
// Kontrollarmar FÖRST: bära stadigt spiller inte · att trycka grytan mot bordet får aldrig
// skjuta iväg den eller trycka den igenom (ägarens "flyger iväg utanför skärmen").
import { PhysicsWorld } from '../src/lib/physics.js'
import { Karl } from '../src/games/popcornkalaset/karl.js'
import { GRYTA, SKAL, SPIS, BANK, BORD, GOLV, POPCORN } from '../src/games/popcornkalaset/matt.js'
import { byggSkal, iSkal } from '../src/games/popcornkalaset/fysik.js'

const arg = process.argv.slice(2)
const FALL = arg.includes('--fall') ? arg[arg.indexOf('--fall') + 1].split(',') : null
const SPAR = arg.includes('--spar')
let fel = 0
const ok = (namn, v, d = '') => { console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`); if (!v) fel++ }
const pct = (v) => `${Math.round(v * 100)} %`
const N = 24

function rum() {
  const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'], bounds: { left: 0, top: -400, right: 1280, bottom: GOLV } })
  phys.rectangle((BANK.x0 + BANK.x1) / 2, BANK.yta + 20, BANK.x1 - BANK.x0, 40, { isStatic: true })
  phys.rectangle((BORD.x0 + BORD.x1) / 2, BORD.yta + BORD.tjock / 2, BORD.x1 - BORD.x0, BORD.tjock, { isStatic: true })
  for (const s of SKAL) byggSkal(phys, s)
  // TIPP=mal,max i miljön prövar en annan tippning (svep).
  const tipp = process.env.TIPP ? process.env.TIPP.split(',').map(Number) : null
  const g = new Karl(phys, { x: SPIS.x, y: SPIS.yta - GRYTA.golv - GRYTA.djup, ...GRYTA, label: 'gryta', grupp: -7, ...(tipp ? { tippMal: tipp[0], tippMax: tipp[1] } : {}) })
  g.rum = { x0: 0, x1: 1280 }
  const pop = []
  for (let i = 0; i < N; i++) {
    const p = g.varld(((i % 6) - 2.5) * 26, GRYTA.djup - 15 - Math.floor(i / 6) * 27)
    pop.push(phys.polygon(p.x, p.y, 7, POPCORN.r, { ...POPCORN.kropp }))
  }
  g.innehall = pop
  phys.beforeStep(() => g.steg())
  const w = { phys, g, pop, t: 0, maxFart: 0, ut: null, minY: 1e9 }
  stega(w, 90)
  return w
}
function stega(w, n, varje) {
  for (let i = 0; i < n; i++) {
    varje?.(i)
    w.phys.update(1000 / 60)
    w.t++
    const b = w.g.body
    w.maxFart = Math.max(w.maxFart, Math.hypot(b.velocity.x, b.velocity.y))
    if (!w.ut && (b.position.x < -20 || b.position.x > 1300 || b.position.y < -80 || b.position.y > GOLV + 20)) w.ut = { t: w.t, x: Math.round(b.position.x), y: Math.round(b.position.y) }
    if (SPAR && w.t % 10 === 0) console.log(`    ${w.t} ${w.g.lage} ${Math.round(b.position.x)},${Math.round(b.position.y)} ${Math.round(b.angle * 57.3)}° v ${Math.hypot(b.velocity.x, b.velocity.y).toFixed(1)} · ute ${w.pop.filter((q) => !w.g.inuti(q.position.x, q.position.y, 24)).length}`)
  }
}
// Fingret från a till b med `fart` px/steg, sedan `kvar` steg stilla.
function drag(w, a, b, fart = 9, kvar = 0) {
  const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / fart))
  stega(w, n, (i) => w.g.dra(a.x + ((b.x - a.x) * (i + 1)) / n, a.y + ((b.y - a.y) * (i + 1)) / n))
  if (kvar) stega(w, kvar, () => w.g.dra(b.x, b.y))
  return b
}
function rakna(w, s) {
  const r = { mal: 0, kvar: 0, annan: 0, spill: 0 }
  for (const b of w.pop) {
    const { x, y } = b.position
    if (w.g.inuti(x, y, 24)) r.kvar++
    else if (s != null && iSkal(SKAL[s], x, y)) r.mal++
    else if (SKAL.some((k) => iSkal(k, x, y))) r.annan++
    else {
      r.spill++
      if (arg.includes('--golv')) console.log(`      spill ${Math.round(x)},${Math.round(y)}`)
    }
  }
  return { mal: r.mal / N, kvar: r.kvar / N, annan: r.annan / N, spill: r.spill / N }
}
const rad = (r) => `mål ${pct(r.mal).padStart(5)} · kvar ${pct(r.kvar).padStart(5)} · annan skål ${pct(r.annan).padStart(4)} · spill ${pct(r.spill).padStart(4)}`
const sakert = (w) => !w.ut && w.maxFart <= 26
const sak = (w) => `toppfart ${w.maxFart.toFixed(1)}${w.ut ? ` · UTANFÖR BILD (${w.ut.x},${w.ut.y})` : ''}`

// Ställ grytan på skål s: ta den mitt på, bär den dit och släpp strax ovanför.
function stallPaSkal(w, s) {
  const a = w.g.varld(0, 50)
  w.g.greppa(a.x, a.y)
  drag(w, a, { x: SKAL[s].x, y: SKAL[s].kant - 150 + 50 }, 9, 40)
  w.g.lagNer()
  stega(w, 120)
}
const HX = GRYTA.handtag.x
const HY = GRYTA.handtag.y

const FALLEN = {
  // ---- kontrollarmar ----
  K1() {
    for (const fart of [8, 17, 30]) {
      const w = rum()
      const a = w.g.varld(0, 50)
      w.g.greppa(a.x, a.y)
      drag(w, a, { x: SKAL[1].x, y: 300 }, fart, 30)
      const r = rakna(w, 1)
      console.log(`K1 bär stadigt ${fart * 60} px/s:    ${rad(r)} · max ${Math.round(Math.abs(w.g.vinkel) * 57.3)}° · ${sak(w)}`)
      ok(`K1 att bära grytan stadigt (${fart * 60} px/s) spiller ≤ 10 %`, r.kvar >= 0.9 && sakert(w), `kvar ${pct(r.kvar)}`)
    }
  },
  K2() {
    // Tryck grytan rakt ned i bordet/skålarna med fingret långt under — och dra den sedan i
    // sidled längs bordet och upp över gästerna.
    const w = rum()
    const a = w.g.varld(0, 50)
    w.g.greppa(a.x, a.y)
    const b = drag(w, a, { x: SKAL[1].x, y: 700 }, 10, 60)
    const c = drag(w, b, { x: 1240, y: 700 }, 10, 30)
    drag(w, c, { x: 700, y: 330 }, 12, 30)
    const topp = w.g.body.position.y
    console.log(`K2 tryck ned i bordet, dra längs det: ${sak(w)} · grytans mitt y ${Math.round(topp)}`)
    ok('K2 grytan skjuts aldrig iväg och trycks aldrig genom bordet', sakert(w), sak(w))
  },
  K3() {
    // Ägarens väg: mot och över gästerna, i handtaget och i kroppen.
    const VAGAR = [
      ['kropp', [0, 50], [[930, 420], [1200, 380], [1200, 380]]],
      ['kropp', [0, 50], [[1100, 300], [1250, 460], [700, 460]]],
      ['handtag', [HX, HY], [[930, 480], [1150, 400]]],
      ['kropp', [0, GRYTA.djup + 8], [[930, 560], [1230, 560], [620, 520]]],
      ['handtag', [-HX, HY], [[930, 330], [930, 470], [930, 330], [1240, 330]]],
    ]
    for (const [namn, gp, bana] of VAGAR) {
      const w = rum()
      let f = w.g.varld(...gp)
      w.g.greppa(f.x, f.y)
      for (const [x, y] of bana) f = drag(w, f, { x, y }, 9, 30)
      w.g.lagNer()
      stega(w, 120)
      console.log(`K3 mot/över gästerna i ${namn.padEnd(7)}: ${sak(w)} · slut ${w.g.lage} ${Math.round(w.g.vinkel * 57.3)}°`)
      ok(`K3 ${namn}: grytan stannar i bild och flyger inte`, sakert(w), sak(w))
    }
  },
  // ---- hällning ----
  H1() {
    const w = rum()
    stallPaSkal(w, 1)
    const r = rakna(w, 1)
    const m = w.g.varld(0, 0)
    console.log(`H1 ställd på skål 1:              ${rad(r)} · står ${Math.round(w.g.vinkel * 57.3)}° med mynningen i y ${Math.round(m.y)} · ${sak(w)}`)
    ok('H1 grytan går att ställa på en skål (står, spiller ≤ 10 %)', r.kvar >= 0.9 && Math.abs(w.g.vinkel) < 0.3 && sakert(w), `kvar ${pct(r.kvar)}`)
  },
  H2() {
    // ÄGARENS FLÖDE: ställ grytan på skålen, ta nytt tag i ett handtag och håll kvar. Den lyfts,
    // tippar lugnt och tömmer sig — det mesta i den skålen, resten i grannskålen (fyller den),
    // nästan inget på golvet. Mätt över alla tre skålarna och båda handtagen.
    const res = []
    for (const skal of [0, 1, 2]) {
      for (const s of [1, -1]) {
        const w = rum()
        stallPaSkal(w, skal)
        const p = w.g.varld(s * HX, HY)
        w.g.greppa(p.x, p.y)
        stega(w, 240, () => w.g.dra(p.x, p.y))
        const v = Math.round(w.g.vinkel * 57.3)
        w.g.lagNer()
        stega(w, 120)
        const r = rakna(w, skal)
        res.push(r)
        console.log(`H2 på skål ${skal}, ${s > 0 ? 'höger ' : 'vänster'} handtag, håll: ${rad(r)} · vinkel ${v}° · ${sak(w)}`)
        ok(`H2 skål ${skal} ${s > 0 ? 'höger' : 'vänster'}: tömmer sig i skålarna, ≤ 15 % på golvet, flyger inte`, r.kvar <= 0.25 && r.spill <= 0.15 && sakert(w), `kvar ${pct(r.kvar)}, spill ${pct(r.spill)}`)
      }
    }
    const medel = res.reduce((a, r) => a + r.mal, 0) / res.length
    ok('H2 i medel hamnar det mesta i DEN skål grytan står på', medel >= 0.5, `medel ${pct(medel)} i målskålen`)
  },
  H3() {
    for (const [s, lyft] of [[1, 80], [1, 160], [-1, 160]]) {
      const w = rum()
      stallPaSkal(w, 1)
      const p = w.g.varld(s * HX, HY)
      w.g.greppa(p.x, p.y)
      drag(w, p, { x: p.x, y: p.y - lyft }, 4, 150)
      const v = Math.round(w.g.vinkel * 57.3)
      w.g.lagNer()
      stega(w, 120)
      const r = rakna(w, 1)
      console.log(`H3 på skålen, ${s > 0 ? 'höger' : 'vänster'} handtag, lyft ${lyft}: ${rad(r)} · vinkel ${v}° · ${sak(w)}`)
    }
  },
  H4() {
    // Bär grytan i handtaget från spisen och håll den så att den hänger över skål 1.
    for (const s of [1, -1]) {
      const w = rum()
      const p = w.g.varld(s * HX, HY)
      w.g.greppa(p.x, p.y)
      const hall = { x: SKAL[1].x - s * 70, y: 230 }
      drag(w, p, hall, 9, 200)
      const v = Math.round(w.g.vinkel * 57.3)
      const r = rakna(w, 1)
      console.log(`H4 i ${s > 0 ? 'höger' : 'vänster'} handtag över skål 1:  ${rad(r)} · vinkel ${v}° · ${sak(w)}`)
    }
  },
  H6() {
    // Takten: lyft grytan fri i ett handtag, håll handtaget STILLA rakt över skål 1 — hur mycket
    // har runnit ut efter 1, 2, 3 och 5 s? (Regeln för barnet: det faller under handtaget.)
    for (const s of [1, -1]) {
      const w = rum()
      const p = w.g.varld(s * HX, HY)
      w.g.greppa(p.x, p.y)
      const b = drag(w, p, { x: p.x, y: p.y - 170 }, 6, 10)
      const hall = { x: SKAL[1].x, y: 250 }
      drag(w, b, hall, 8)
      const ut = []
      for (const sek of [1, 1, 1, 2]) { stega(w, sek * 60, () => w.g.dra(hall.x, hall.y)); ut.push(Math.round((1 - rakna(w, 1).kvar) * 100)) }
      const r = rakna(w, 1)
      console.log(`H6 ${s > 0 ? 'höger ' : 'vänster'} handtag stilla över skål 1: ute efter 1/2/3/5 s: ${ut.join(' / ')} % · ${rad(r)} · ${Math.round(w.g.vinkel * 57.3)}° · ${sak(w)}`)
    }
  },
  H7() {
    // (info) Premissen "det faller under handtaget" FÖLL: i höger handtag svänger kroppen ned åt
    // vänster och det rinner ut på den BORTRE sidan, 100–250 px bort (`_popcornhandtagbild`).
    // Att flytta handtaget över skålens mitt häller alltså i grannskålen — det är väntat.
    for (const [skal, s] of [[1, 1], [1, -1], [0, 1], [2, -1]]) {
      const w = rum()
      stallPaSkal(w, skal)
      const p = w.g.varld(s * HX, HY)
      w.g.greppa(p.x, p.y)
      drag(w, p, { x: SKAL[skal].x, y: p.y - 40 }, 4, 200)
      const v = Math.round(w.g.vinkel * 57.3)
      const r = rakna(w, skal)
      console.log(`H7 på skål ${skal}, ${s > 0 ? 'höger ' : 'vänster'} handtag → över skålen: ${rad(r)} · vinkel ${v}° · ${sak(w)}`)
    }
  },
  H5() {
    // Skaka: hängande i handtaget över skål 1, fingret fram och tillbaka ±35 px.
    const w = rum()
    const p = w.g.varld(HX, HY)
    w.g.greppa(p.x, p.y)
    const hall = { x: SKAL[1].x - 70, y: 230 }
    drag(w, p, hall, 9, 20)
    stega(w, 180, (i) => w.g.dra(hall.x + Math.sin(i * 0.25) * 35, hall.y))
    const r = rakna(w, 1)
    console.log(`H5 skaka i handtaget över skål 1:  ${rad(r)} · ${sak(w)}`)
  },
}

console.log(`\nHANDTAGSSOND — popcornkalaset, sidohandtag (${N} popcorn)\n`)
for (const [namn, fn] of Object.entries(FALLEN)) {
  if (FALL && !FALL.includes(namn)) continue
  fn()
}
console.log(fel ? `\n✗ ${fel} villkor föll\n` : '\n✓ alla villkor håller\n')
process.exit(fel ? 1 : 0)
