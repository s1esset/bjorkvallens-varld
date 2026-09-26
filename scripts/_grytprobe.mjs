// GRYTSOND — kan ett finger hälla popcorn i en skål, och avgör GREPPET vad som händer?
// (popcornkalaset B1). Rena tal + matter, ingen webbläsare, samma `Karl` som spelet kör.
//
//   node scripts/_grytprobe.mjs            sammanfattning + klart-villkoren
//   node scripts/_grytprobe.mjs --svep     alla greppunkter längs väggen, en rad var
//
// Mätarmar (kontrollarmen FÖRST — skiljer mätaren inte greppen åt säger den ingenting):
//   K  grytan parkerad över skålen, greppas i BYGELN och hålls still 3 s   → ~0 % ut
//   A  samma, greppas på SIDAN och dras NEDÅT (grytan vippar runt bygeln)   → ≥ 70 % i skålen
//   K2 samma drag nedåt men i BYGELN — sedan 2026-09-26 (en gest) HÄLLER den → ≥ 60 % i skålen
//   B  bärs i bygeln från spisen till skålen (tre farter) och släpps        → ≥ 90 % kvar i grytan
//   C  (info) greppas på sidan PÅ SPISEN och dras raka vägen till skålen    → spill längs vägen
import Matter from 'matter-js'
import { PhysicsWorld } from '../src/lib/physics.js'
import { Karl } from '../src/games/popcornkalaset/karl.js'
import { GRYTA, SKAL, SPIS, POPCORN, SKAL_LUFT, BANK, PASE, KORN, BORD, GOLV } from '../src/games/popcornkalaset/matt.js'
import { byggSkal as byggSkalKropp, iSkal as iSkalPunkt, grytHylla, paseHylla } from '../src/games/popcornkalaset/fysik.js'

const { Body, Composite } = Matter
const SVEP = process.argv.includes('--svep')

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const pct = (v) => `${Math.round(v * 100)} %`

// En värld: spisen, skålen på bordet, grytan på plattan med N popcorn i.
function varld({ n = 20, karl = {} } = {}) {
  // Spelets HELA rum (2026-09-26): bord, alla tre skålar, golv på GOLV. Med bara skål 0 räknades
  // det som gick förbi den som golv, fast det i spelet landar i nästa skål och fyller den.
  const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'], bounds: { left: 0, top: -400, right: 1280, bottom: GOLV } })
  // Hela bänken (spisen sitter i den) — grytans hörn doppar mot bänkens kant när den vippas.
  phys.rectangle((BANK.x0 + BANK.x1) / 2, BANK.yta + 20, BANK.x1 - BANK.x0, 40, { isStatic: true, label: 'spis' })
  phys.rectangle((BORD.x0 + BORD.x1) / 2, BORD.yta + BORD.tjock / 2, BORD.x1 - BORD.x0, BORD.tjock, { isStatic: true, label: 'bord' })
  const skal = byggSkal(phys, SKAL[0])
  byggSkal(phys, SKAL[1])
  byggSkal(phys, SKAL[2])
  const gryta = new Karl(phys, { x: SPIS.x, y: SPIS.yta - GRYTA.golv - GRYTA.djup, ...GRYTA, ...(process.env.FORE ? { vippaFore: Number(process.env.FORE) } : {}), ...karl })
  // Spelets hyllor (en gest, 2026-09-26): utan hylla bärs kärlet fritt och häller aldrig.
  gryta.hylla = (x) => grytHylla(gryta, x)
  const pop = []
  const cols = 7
  for (let i = 0; i < n; i++) {
    const c = i % cols
    const r = Math.floor(i / cols)
    const x = SPIS.x - GRYTA.bredd / 2 + 16 + c * ((GRYTA.bredd - 32) / (cols - 1))
    const y = SPIS.yta - GRYTA.golv - POPCORN.r - 2 - r * (POPCORN.r * 2 + 1)
    pop.push(phys.polygon(x, y, 7, POPCORN.r, { ...POPCORN.kropp, label: 'popcorn' }))
  }
  gryta.innehall = pop
  phys.beforeStep(() => gryta.steg())
  for (let i = 0; i < 90; i++) phys.update(1000 / 60)
  return { phys, gryta, skal, pop }
}

function byggSkal(phys, s) {
  byggSkalKropp(phys, s)
  return s
}

const iSkal = (s, b) => iSkalPunkt(s, b.position.x, b.position.y)
const stega = (w, n, varje) => { for (let i = 0; i < n; i++) { varje?.(i); w.phys.update(1000 / 60) } }

function rakna(w) {
  let skal = 0, gryta = 0, golv = 0, annan = 0
  for (const b of w.pop) {
    if (w.gryta.inuti(b.position.x, b.position.y, 30)) gryta++
    else if (iSkal(w.skal, b)) skal++
    else if (iSkal(SKAL[1], b) || iSkal(SKAL[2], b)) annan++
    else {
      golv++
      if (process.argv.includes('--golv')) console.log(`      golv: ${Math.round(b.position.x)},${Math.round(b.position.y)}`)
    }
  }
  const n = w.pop.length
  return { skal: skal / n, gryta: gryta / n, golv: golv / n, annan: annan / n }
}

// Parkera grytan över skålen (tap-reservens slutläge) och vänta tills den hänger still.
function parkeraOverSkal(w, luft = SKAL_LUFT) {
  w.gryta.parkera(w.skal.x, luft === SKAL_LUFT ? grytHylla(w.gryta, w.skal.x).y : w.gryta.parkHojd(w.skal.kant - luft))
  stega(w, 240)
}
// SKAL_LUFT ur matt.js

// Greppa en punkt i grytans LOKALA rum och håll fingret still (lätt lyft) i `sek` sekunder.
function greppaOchHall(w, lx, ly, sek = 3, lyft = 16) {
  const p = w.gryta.varld(lx, ly)
  const zon = w.gryta.greppa(p.x, p.y)
  stega(w, Math.round(sek * 60), (i) => w.gryta.dra(p.x, p.y - Math.min(lyft, i)))
  return zon
}

// Greppa och DRA fingret (dx, dy) på `sek` sekunder, håll sedan kvar `hall` sekunder.
// `skak` lägger ett slarvigt darr (px) på draget — ett barn drar aldrig rakt.
function greppaOchDra(w, lx, ly, dx, dy, sek = 0.8, hall = 2, skak = 0) {
  const p = w.gryta.varld(lx, ly)
  const zon = w.gryta.greppa(p.x, p.y)
  const n = Math.round(sek * 60)
  stega(w, n, (i) => {
    const t = (i + 1) / n
    const j = skak ? Math.sin(i * 0.9) * skak : 0
    w.gryta.dra(p.x + dx * t + j, p.y + dy * t + j * 0.6)
  })
  stega(w, Math.round(hall * 60))
  return zon
}

// Bär från A till B med konstant fart (px/s), släpp → handen parkerar över skålen.
function bar(w, lx, ly, fart) {
  const p0 = w.gryta.varld(lx, ly)
  w.gryta.greppa(p0.x, p0.y)
  const mal = { x: w.skal.x + (p0.x - w.gryta.varld(0, 0).x), y: p0.y - 140 }
  const dist = Math.hypot(mal.x - p0.x, mal.y - p0.y)
  const steg = Math.max(1, Math.round((dist / fart) * 60))
  stega(w, steg, (i) => { const t = (i + 1) / steg; w.gryta.dra(p0.x + (mal.x - p0.x) * t, p0.y + (mal.y - p0.y) * t) })
  stega(w, 20) // fingret står still ett ögonblick ovanför skålen
}

console.log('\nGRYTSOND — popcornkalaset B1\n')
const G = GRYTA
const ytter = G.bredd / 2 + G.vagg

// K — kontrollarmen
{
  const w = varld()
  parkeraOverSkal(w)
  const fore = rakna(w)
  const zon = greppaOchHall(w, 0, -G.bygel)
  stega(w, 60)
  const r = rakna(w)
  console.log(`K  bygel, parkerad över skålen: zon=${zon} · före ${pct(fore.gryta)} i grytan → efter i skålen ${pct(r.skal)}, kvar ${pct(r.gryta)}, golv ${pct(r.golv)}`)
  ok('K  bygelgrepp häller inte', r.skal <= 0.1 && r.gryta >= 0.85, `i skålen ${pct(r.skal)}`)
  ok('K  parkeringen spiller inte', fore.gryta >= 0.9, `${pct(fore.gryta)} kvar efter parkering`)
}

// A — sidogrepp på den parkerade grytan: dra sidan NEDÅT (rakt, snett, slarvigt)
const sidRes = []
const DRAG = [
  ['rakt ned', 0, 170, 0],
  ['snett ned-ut', 60, 150, 0],
  ['snett ned-in', -60, 150, 0],
  ['slarvigt', 20, 160, 14],
  ['kort (90 px)', 0, 90, 0],
  ['långt rakt', 0, 250, 0, 14],
  ['långt slarvigt', 30, 240, 14, 14],
]
// De LÅNGA dragen häller en skålfull (14), inte hela grytan (20): skålen rymmer ~15 och resten
// ska i nästa skål — med 20 räknade armen skålens bräddning som ett hällfel (65 %).
for (const sida of [-1, 1]) {
  for (const [namn, dx, dy, skak, n = 20] of DRAG) {
    const w = varld({ n })
    parkeraOverSkal(w)
    const zon = greppaOchDra(w, sida * ytter, G.djup * 0.2, sida * dx, dy, 0.8, 2, skak)
    const vinkel = Math.round((w.gryta.vinkel * 180) / Math.PI)
    w.gryta.slappVippa()
    stega(w, 120)
    const r = rakna(w)
    sidRes.push({ sida, namn, ...r })
    console.log(`A  ${sida < 0 ? 'vänster' : 'höger '} ${namn.padEnd(13)} zon=${zon} · skål ${pct(r.skal)} · kvar ${pct(r.gryta)} · nästa skål ${pct(r.annan)} · golv ${pct(r.golv)} · vinkel ${vinkel}° → ${Math.round((w.gryta.vinkel * 180) / Math.PI)}° efter släpp`)
  }
}
{
  // Träffsäkerhet: av det som lämnade grytan, hur mycket landade i skålen?
  const ute = sidRes.filter((r) => r.skal + r.golv > 0.05)
  const trff = ute.reduce((s, r) => s + r.skal, 0) / ute.reduce((s, r) => s + r.skal + r.golv, 0)
  const trffMin = Math.min(...ute.map((r) => r.skal / (r.skal + r.golv)))
  ok('A  det som hälls landar i skålen', trff >= 0.8, `${pct(trff)} av det hällda, sämst ${pct(trffMin)}`)
  // Tömning: ett LÅNGT drag (~240 px) häller det mesta i skålen.
  const langa = sidRes.filter((r) => r.namn.startsWith('långt'))
  const medel = langa.reduce((s, r) => s + r.skal, 0) / langa.length
  const minst = Math.min(...langa.map((r) => r.skal))
  ok('A  ett långt drag tömmer grytan i skålen', medel >= 0.7, `medel ${pct(medel)}, sämst ${pct(minst)}`)
  const kort = sidRes.filter((r) => r.namn.startsWith('kort'))
  const kMedel = kort.reduce((s, r) => s + r.skal, 0) / kort.length
  ok('A  ett kort drag häller MINDRE (lutningen är barnets)', kMedel < medel - 0.3, `kort ${pct(kMedel)} mot långt ${pct(medel)}`)
}

// K2 — kontrollarm: bygelgreppet på den parkerade grytan, SAMMA drag nedåt
{
  const w = varld()
  parkeraOverSkal(w)
  const zon = greppaOchDra(w, 0, -G.bygel, 0, 240, 0.8, 2)
  w.gryta.slappVippa()
  stega(w, 120)
  const r = rakna(w)
  console.log(`K2 bygel, parkerad, dras 240 px ned: zon=${zon} · skål ${pct(r.skal)} · kvar ${pct(r.gryta)} · vinkel ${Math.round((w.gryta.vinkel * 180) / Math.PI)}°`)
  // En gest (2026-09-26): var man än tar i grytan betyder "nedåt över skålen" att hälla. Förut
  // var bygelgreppet dövt för det — och pressade grytan ned i skålen (`_popcornnaiv` G3).
  ok('K2 bygelgrepp + drag nedåt häller också (en gest)', r.skal >= 0.6, `i skålen ${pct(r.skal)}`)
}

// B — bära i bygeln
for (const fart of [500, 1000, 1800]) {
  const w = varld()
  bar(w, 0, -G.bygel, fart)
  w.gryta.parkera(w.skal.x, w.gryta.parkHojd(w.skal.kant - SKAL_LUFT))
  stega(w, 180)
  const r = rakna(w)
  console.log(`B  bär i bygeln ${fart} px/s: kvar ${pct(r.gryta)} · skål ${pct(r.skal)} · golv ${pct(r.golv)}`)
  ok(`B  bygelbärning ${fart} px/s spiller ≤ 10 %`, r.gryta >= 0.9, `kvar ${pct(r.gryta)}`)
}

// C — sidogrepp från spisen, dras raka vägen (info)
for (const fart of [600, 1400]) {
  const w = varld()
  bar(w, -ytter, G.djup * 0.3, fart)
  stega(w, 120)
  const r = rakna(w)
  console.log(`C  (info) vänster sida från spisen ${fart} px/s: skål ${pct(r.skal)} · kvar ${pct(r.gryta)} · golv ${pct(r.golv)}`)
}

if (process.argv.includes('--matris')) {
  console.log('\nMATRIS — höger sida, drag rakt ned 170 / 250 px: andel i skålen (vinkel)')
  for (const luft of [60, 90, 120, 150]) {
    for (const vrid of [0, 20, 40]) {
      const rad = []
      for (const dy of [170, 250]) {
        const w = varld({ karl: { vippaVrid: vrid } })
        parkeraOverSkal(w, luft)
        greppaOchDra(w, ytter, G.djup * 0.2, 0, dy, 0.8, 2)
        const v = Math.round((w.gryta.vinkel * 180) / Math.PI)
        w.gryta.slappVippa(); stega(w, 120)
        const r = rakna(w)
        rad.push(`${pct(r.skal).padStart(5)} (${v}°) golv ${pct(r.golv)}`)
      }
      console.log(`  luft ${luft}  vrid ${String(vrid).padStart(2)} │ ${rad.join(' │ ')}`)
    }
  }
}

if (SVEP) {
  console.log('\nSVEP — höger vägg, greppunkt uppifrån och ned, dras 170 px ned (parkerad över skålen)')
  for (let ly = -4; ly <= G.djup + G.golv; ly += 12) {
    const w = varld()
    parkeraOverSkal(w)
    greppaOchDra(w, ytter, ly, 0, 170, 0.8, 2)
    const r = rakna(w)
    console.log(`  y=${String(ly).padStart(4)}  skål ${pct(r.skal).padStart(5)} · kvar ${pct(r.gryta).padStart(5)} · golv ${pct(r.golv).padStart(5)} · vinkel ${Math.round((w.gryta.vinkel * 180) / Math.PI)}°`)
  }
}

// P — påsen över grytan: greppa påsens sida, dra nedåt, håll. Hamnar kornen i grytan?
// Samma påse som spelet (PASE i matt.js bär alla dess tal), parkerad där spelet parkerar den.
function paseVarld() {
  const phys = new PhysicsWorld({ gravityY: 1, walls: ['floor', 'left', 'right'] })
  phys.rectangle((BANK.x0 + BANK.x1) / 2, BANK.yta + 20, BANK.x1 - BANK.x0, 40, { isStatic: true, label: 'spis' })
  const gryta = new Karl(phys, { x: SPIS.x, y: SPIS.yta - GRYTA.golv - GRYTA.djup, ...GRYTA, grupp: -7 })
  const pase = new Karl(phys, { x: PASE.x, y: BANK.yta - PASE.golv - PASE.djup, ...PASE, grupp: -7 })
  gryta.hylla = (x) => grytHylla(gryta, x)
  pase.hylla = (x) => paseHylla(pase, gryta, x)
  const korn = []
  for (let i = 0; i < 32; i++) {
    const ly = PASE.djup - 8 - (i % 6) * 9
    const lx = (((i * 37) % 11) / 10 - 0.5) * (pase.innerHalv(ly) * 2 - 14)
    const w = pase.varld(lx, ly)
    korn.push(phys.circle(w.x, w.y, KORN.r, { ...KORN.kropp, label: 'korn' }))
  }
  pase.innehall = korn
  phys.beforeStep(() => { gryta.steg(); pase.steg() })
  for (let i = 0; i < 60; i++) phys.update(1000 / 60)
  const gm = gryta.varld(0, 0)
  const ph = paseHylla(pase, gryta, gm.x - 30)
  pase.parkera(ph.mal.x, ph.y)
  for (let i = 0; i < 200; i++) phys.update(1000 / 60)
  return { phys, gryta, pase, korn }
}
const PASE_BILD = process.argv.includes('--pase')
for (const [namn, dy] of [['kort (80 px)', 80], ['långt (220 px)', 220]]) {
  const w = paseVarld()
  const iPase0 = w.korn.filter((b) => w.pase.inuti(b.position.x, b.position.y, 10)).length
  const p = w.pase.varld(PASE.bredd / 2 + PASE.vagg, 20)
  const zon = w.pase.greppa(p.x, p.y)
  const bilder = []
  for (let i = 0; i < 40; i++) { w.pase.dra(p.x, p.y + (dy * (i + 1)) / 40); w.phys.update(1000 / 60) }
  if (PASE_BILD) bilder.push(w.phys)
  for (let i = 0; i < 150; i++) w.phys.update(1000 / 60)
  const vinkel = Math.round((w.pase.vinkel * 180) / Math.PI)
  w.pase.slappVippa()
  for (let i = 0; i < 120; i++) w.phys.update(1000 / 60)
  const iGryta = w.korn.filter((b) => w.gryta.inuti(b.position.x, b.position.y, 10)).length
  const kvar = w.korn.filter((b) => w.pase.inuti(b.position.x, b.position.y, 10)).length
  console.log(`P  påsen ${namn}: zon=${zon} · i påsen före ${iPase0} → i grytan ${iGryta}, kvar i påsen ${kvar}, bredvid ${32 - iGryta - kvar} · vinkel ${vinkel}°`)
  if (namn.startsWith('långt')) {
    ok('P  påsens häll: ≥ 80 % av kornen i grytan', iGryta >= 0.8 * 32, `${iGryta} av 32`)
    ok('P  påsen spiller ≤ 10 % bredvid', 32 - iGryta - kvar <= 3, `${32 - iGryta - kvar} bredvid`)
  }
}

console.log(fel ? `\n✗ ${fel} villkor föll\n` : '\n✓ alla villkor håller\n')

// ---- BILD: en arm i sex rutor (node-simulering → SVG → skärmdump) ----------------------
//   node scripts/_grytprobe.mjs --bild [höger|vänster] [dy]   → .test-shots/_grytprobe.png
if (process.argv.includes('--bild')) {
  const arg = process.argv.slice(process.argv.indexOf('--bild') + 1)
  const sida = arg[0] === 'vänster' ? -1 : 1
  const dy = Number(arg[1]) || 170
  const w = varld()
  parkeraOverSkal(w)
  const rutor = []
  const bild = (rubrik) => {
    const kroppar = Matter.Composite.allBodies(w.phys.world)
    let svg = ''
    for (const b of kroppar) {
      const delar = b.parts.length > 1 ? b.parts.slice(1) : [b]
      for (const d of delar) {
        const pts = d.vertices.map((v) => `${v.x.toFixed(0)},${v.y.toFixed(0)}`).join(' ')
        const farg = b.label === 'popcorn' ? '#f6e27a' : b.label === 'karl' ? '#6a7f9a' : b.isStatic ? '#8a6a4a' : '#999'
        svg += `<polygon points="${pts}" fill="${farg}" stroke="#222" stroke-width="1"/>`
      }
    }
    const h = w.gryta._hand
    if (h) svg += `<circle cx="${h.x}" cy="${h.y}" r="7" fill="red"/>`
    rutor.push(`<div><b>${rubrik}</b><svg viewBox="250 80 700 560" width="620" height="496" style="background:#eef">${svg}</svg></div>`)
  }
  bild('parkerad')
  const p = w.gryta.varld(sida * ytter, G.djup * 0.2)
  w.gryta.greppa(p.x, p.y)
  const n = 48
  for (let i = 0; i < n; i++) { w.gryta.dra(p.x, p.y + (dy * (i + 1)) / n); w.phys.update(1000 / 60); if (i === 23) bild(`vippar (steg ${i + 1})`) }
  bild('draget klart')
  stega(w, 45); bild('+0,75 s')
  stega(w, 75); bild('+2 s')
  w.gryta.slappVippa(); stega(w, 120); bild('släppt, +2 s')
  const r = rakna(w)
  const { chromium } = await import('playwright')
  const { mkdirSync } = await import('node:fs')
  mkdirSync('.test-shots', { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1900, height: 1080 } })
  await page.setContent(`<body style="margin:0;font:16px sans-serif"><div style="display:grid;grid-template-columns:repeat(3,630px)">${rutor.join('')}</div><p>skål ${pct(r.skal)} · kvar ${pct(r.gryta)} · golv ${pct(r.golv)}</p></body>`)
  await page.screenshot({ path: '.test-shots/_grytprobe.png' })
  await browser.close()
  console.log('→ .test-shots/_grytprobe.png')
}

process.exit(fel ? 1 : 0)
