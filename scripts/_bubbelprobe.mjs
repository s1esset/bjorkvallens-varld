// Bubbelfysiken i pruttbad, i TAL — underlaget för `docs/games/pruttbad.md` §4-punkt 5.
//
// `_bubbelbild.mjs` producerade BILDEN som gav listan (bubblor går igenom varandra, och genom
// Zacke). Den här sonden gör samma två påståenden mätbara, plus de två vakterna varje ändring
// av integratorn måste passera: framsteget får inte bli långsammare, och ingen bubbla får
// fastna.
//
// ⚠️ DETERMINISM FÖRE ALLT. Bubblans egen `phase` slumpas vid födseln, och i förra passet gav
// den BÅDA tecknen ur samma kod (47,8 mot 35,7 i en körning, 45,5 mot 64,0 i nästa). Sonden
// nollar därför fasen och lägger bubblorna på FASTA platser. Utan det mäter man vobbeln, inte
// separationen.
//
// Kör: node scripts/_bubbelprobe.mjs   (dev-servern måste vara uppe på 5173)
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('console', (m) => m.type() === 'error' && fel.push(m.text().slice(0, 160)))
page.on('pageerror', (e) => fel.push('PAGEERROR: ' + String(e.message).slice(0, 160)))
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

const rader = []
let gronna = 0
const krav = (namn, ok, text) => {
  rader.push(`  ${ok ? '✅' : '❌'} ${namn.padEnd(30)} ${text}`)
  if (ok) gronna++
}

async function gaIn() {
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'pruttbad' }))
  await page.waitForTimeout(1200)
}
async function gaUt() {
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(500)
}

// ---------------------------------------------------------------------------
// 1. KLASEN: lägger man bubblor tätt — går de igenom varandra?
//
// Sex bubblor på samma plats är det värsta fallet och det som syns i `_bubblor.png`.
// Mätvärdet är INTRÄNGNINGEN: hur många px två bubblor delar (r1 + r2 − avstånd).
// ---------------------------------------------------------------------------
await gaIn()
const klase = await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('pruttbad')
  // ⚠️ FRYS FRAMSTEGET. Sex bubblor ger ~194 skum mot ett mål på 88, så nivån klaras mitt i
  // fönstret — och firandets bubbelsvärm hamnar då i MÄTNINGEN. Det rapporterade 98,9 px
  // inträngning i ett par som omöjligt kan tränga in mer än 72. Mät fysiken, inte loopen.
  g._goalFoam = 1e9
  g._bubbles.length = 0
  // Sex bubblor i en tät klase runt (640, 520) — fasta platser, nollad fas.
  const plats = [
    [640, 520], [664, 528], [618, 530], [648, 496], [610, 500], [672, 502],
  ]
  for (const [x, y] of plats) {
    g._pushBubble(x, 36, 0, 'normal')
    const b = g._bubbles[g._bubbles.length - 1]
    b.x = x
    b.y = y
    b.phase = 0
  }
  const matt = () => {
    let varsta = 0
    let par = 0
    for (let i = 0; i < g._bubbles.length; i++) {
      for (let j = i + 1; j < g._bubbles.length; j++) {
        const a = g._bubbles[i]
        const b = g._bubbles[j]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        const in_ = a.r + b.r - d
        if (in_ > 1) {
          par++
          varsta = Math.max(varsta, in_)
        }
      }
    }
    return { varsta: +varsta.toFixed(1), par }
  }
  const start = matt()
  // Mät i 40 bildrutor och behåll det VÄRSTA — en klase som löses upp först efter en
  // sekund har ändå varit synlig i en sekund. `halv` = läget efter 40, `slut` efter 120.
  let topp = start
  const spar = []
  for (let k = 0; k < 120; k++) {
    await new Promise((r) => requestAnimationFrame(r))
    const m = matt()
    if (m.varsta > topp.varsta) topp = m
    if (k === 39) spar.push(m)
  }
  const slut = matt()
  return { start, topp, halv: spar[0], slut, kvar: g._bubbles.length }
})
// ⚠️ NOLL ÖVERLAPP ÄR FEL KRAV. Riktiga bubblor RÖR vid varandra; det som stör i bilden är
// att de tränger IN i varandra. Tröskeln är därför "osynlig inträngning", inte "ingen kontakt"
// — 4 px på en 36 px-radie är under konturens egen strecktjocklek.
krav('klase: par vid start', klase.start.par > 0, `${klase.start.par} överlappande par, värsta ${klase.start.varsta} px`)
krav('klase: efter 40 rutor', klase.halv.varsta <= 12, `värsta ${klase.halv.varsta} px i ${klase.halv.par} par`)
krav('klase: efter 120 rutor', klase.slut.varsta <= 4, `värsta ${klase.slut.varsta} px i ${klase.slut.par} par (${klase.kvar} bubblor lever)`)
krav('klase: aldrig varre an start', klase.topp.varsta <= klase.start.varsta + 0.5, `topp ${klase.topp.varsta} px mot start ${klase.start.varsta} px`)

// ---------------------------------------------------------------------------
// 2. ZACKE: en bubbla som stiger rakt genom hans ben — märker den honom?
//
// Zacke sitter på (430, 330) med benen ner till y≈580. En bubbla släpps under hans
// vänstra ben och får stiga. Mätvärdet är hur långt IN i benet den kommer.
// ---------------------------------------------------------------------------
const zacke = await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('pruttbad')
  g._goalFoam = 1e9 // frys framsteget — se rutan i steg 1
  g._bubbles.length = 0
  g._bubbleLayer.removeChildren()
  // Zackes ben i lokala koordinater: (±22,40) → (±62,140) → (±46,250), stroke 46 (radie 23).
  // Prickas här som en rad cirklar längs vägen, samma sätt som ögat läser silhuetten.
  const ben = []
  for (const s of [-1, 1]) {
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const u = 1 - t
      const x = u * u * (s * 22) + 2 * u * t * (s * 62) + t * t * (s * 46)
      const y = u * u * 40 + 2 * u * t * 140 + t * t * 250
      ben.push({ x: 430 + x, y: 330 + y, r: 23 })
    }
  }
  const torso = { x: 430, y: 330 + 40, r: 62 } // magens nedre del, den enda som ligger i vattnet
  const kroppen = ben.concat([torso])
  const djup = (b) => {
    let d = 0
    for (const k of kroppen) d = Math.max(d, k.r + b.r - Math.hypot(b.x - k.x, b.y - k.y))
    return d
  }
  // ⚠️ SKRIV INTE ÖVER `b.x` EFTER `_pushBubble`. Födelsepunkten är numera en del av fysiken
  // (`_freeSpawnX` flyttar den ut ur kroppen), så en sond som tvingar tillbaka koordinaten
  // mäter ett läge spelet inte längre kan hamna i — och rapporterar en fix som utebliven.
  // Tryckpunkterna nedan ligger på hans mage, ben och mitt emellan fötterna.
  const press = [386, 430, 474, 408]
  for (const x of press) {
    g._pushBubble(x, 34, 0, 'normal')
    g._bubbles[g._bubbles.length - 1].phase = 0
  }
  const foddaX = g._bubbles.map((b) => Math.round(b.x))
  const fodelse = +Math.max(...g._bubbles.map(djup)).toFixed(1)
  let varsta = 0
  let rutor = 0
  for (let k = 0; k < 260; k++) {
    await new Promise((r) => requestAnimationFrame(r))
    for (const b of g._bubbles) {
      const d = djup(b)
      if (d > 2) rutor++
      varsta = Math.max(varsta, d)
    }
    if (!g._bubbles.length) break
  }
  return { foddaX, fodelse: +fodelse.toFixed(1), varsta: +varsta.toFixed(1), rutor, kvar: g._bubbles.length }
})
krav('zacke: fodd utanfor kroppen', zacke.fodelse <= 0, `varsta ${zacke.fodelse} px vid fodseln · tryck ${[386, 430, 474, 408].join(',')} → x ${zacke.foddaX.join(',')}`)
krav('zacke: intrangning', zacke.varsta <= 6, `varsta ${zacke.varsta} px in i kroppen (${zacke.rutor} bubbel-rutor inuti honom)`)
krav('zacke: alla nadde ytan', zacke.kvar === 0, `${zacke.kvar} bubblor kvar efter 260 rutor`)

// ---------------------------------------------------------------------------
// 2b. KLYKAN ÄR EN ÅTERVÄNDSGRÄND — vakten måste täcka den ändå.
//
// Låren står 44–50 px isär hela vägen upp och möts vid höften; en bubbla som ändå hamnar
// däremellan kan inte ta sig ut. `_freeSpawnX` gör att spelet aldrig lägger en där, men
// tvingar man in en ska anti-stuck-vakten lösa den — annars vore hindret utan tak (P0).
// ---------------------------------------------------------------------------
const klyka = await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('pruttbad')
  g._bubbles.length = 0
  g._bubbleLayer.removeChildren()
  g._sinceFoam = 0
  g._pushBubble(430, 34, 0, 'normal')
  const b = g._bubbles[g._bubbles.length - 1]
  b.x = 430 // med våld, rakt in i klykan
  b.y = 500
  b.phase = 0
  const t0 = performance.now()
  while (performance.now() - t0 < 7000 && g._bubbles.length) await new Promise((r) => requestAnimationFrame(r))
  return { kvar: g._bubbles.length, sekunder: +((performance.now() - t0) / 1000).toFixed(1) }
})
krav('klykan: vakten loser den', klyka.kvar === 0, `${klyka.kvar} kvar efter ${klyka.sekunder} s`)

// ---------------------------------------------------------------------------
// 3. VAKT — FRAMSTEGET. En separation som håller bubblor kvar under ytan gör spelet
// långsammare, och det vore en motgång utan tak. Samma skript, samma bubblor: hur mycket
// skum har badet fått efter tre sekunder?
// ---------------------------------------------------------------------------
// ⚠️ FÄRSK MONTERING, inte `_foam.level = 0`. Stegen ovan poppar ett tiotal bubblor, vilket
// räcker för att KLARA nivån — firandet nollade sedan skummet mitt i mätfönstret och sonden
// rapporterade "0 skum" på ett spel som mådde utmärkt. (Röd sond = ett påstående.)
await gaUt()
await gaIn()
const framsteg = await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('pruttbad')
  g._bubbles.length = 0
  g._bubbleLayer.removeChildren()
  g._sinceFoam = 0
  g._idle = 0
  for (let i = 0; i < 12; i++) {
    const x = 300 + ((i * 137) % 700)
    g._pushBubble(x, 30 + (i % 5) * 8, 0, 'normal')
    const b = g._bubbles[g._bubbles.length - 1]
    b.phase = 0
  }
  const t0 = performance.now()
  // Stanna om nivån klaras — annars nollar firandet skummet och mätvärdet blir 0.
  while (performance.now() - t0 < 3000 && !g._resolving) await new Promise((r) => requestAnimationFrame(r))
  return { skum: +g._foam.level.toFixed(1), mal: +g._goalFoam.toFixed(1), kvar: g._bubbles.length, klart: !!g._resolving }
})
krav('framsteg: skum pa 3 s', framsteg.skum > 0, `${framsteg.skum} av ${framsteg.mal} skum${framsteg.klart ? ' (nivan klarad)' : ''}, ${framsteg.kvar} bubblor kvar`)

// ---------------------------------------------------------------------------
// 4. VAKT — INGEN FASTNAR. En bubbla instängd mellan Zacke och kar-väggen är den
// uppenbara nya risken. Släpp en rad bubblor i de trånga spalterna och mät hur många
// som fortfarande lever efter sex sekunder.
// ---------------------------------------------------------------------------
await gaUt()
await gaIn()
const fast = await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('pruttbad')
  g._goalFoam = 1e9 // frys framsteget — se rutan i steg 1
  g._bubbles.length = 0
  g._bubbleLayer.removeChildren()
  g._sinceFoam = 0
  // Spalterna: mellan vänster vägg och Zackes ben, mellan benen, och mellan ben och anka.
  for (const x of [255, 300, 340, 430, 520, 560]) {
    g._pushBubble(x, 40, 0, 'normal')
    const b = g._bubbles[g._bubbles.length - 1]
    b.x = x
    b.y = 560
    b.phase = 0
  }
  const start = g._bubbles.length
  const t0 = performance.now()
  while (performance.now() - t0 < 6000) await new Promise((r) => requestAnimationFrame(r))
  const aldrar = g._bubbles.map((b) => Math.round(b.age))
  return { start, kvar: g._bubbles.length, aldrar }
})
krav('ingen fastnar', fast.kvar === 0, `${fast.kvar}/${fast.start} kvar efter 6 s${fast.aldrar.length ? ' (aldrar ' + fast.aldrar.join(',') + ')' : ''}`)

// ---------------------------------------------------------------------------
// 5. SKUMKROPPEN får inte vara en platt platta (§4-punkt 3).
//
// Mätvärdet är hur stor andel av skumbandet som ligger i EN och samma exakta ton. En solid
// rektangel ger ett stort tal; en massa av packade bubblor bryter upp den. Bilden sparas som
// `.test-shots/_skum.png` så ögat kan döma den också — ett tal säger inte om det ser ut som
// skum, bara om det är platt.
// ---------------------------------------------------------------------------
// ⚠️ `nav.go('game')` när man REDAN är i spelet monterar inte om — bilden blev skalets creme
// och `_alive` var falskt, så både skum- och textmätningen läste ett spel som inte kördes.
await gaUt()
await gaIn()
await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('pruttbad')
  // ⚠️ FRYS INTE `_goalFoam` HÄR. Skummets höjd är andelen `level / goalFoam`, så ett spärrat
  // mål ger höjden NOLL — bandet blev 35 px högt och mätningen gällde en skumkropp som knappt
  // fanns. Nivån klaras bara i `_addFoam`, alltså kan `level` sättas rakt av utan att firandet
  // startar så länge ingen bubbla poppar.
  g._foam.level = g._goalFoam * 0.98
  g._drawFoam()
  await new Promise((r) => setTimeout(r, 300))
})
const band = await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('pruttbad')
  return { top: Math.round(g._foamTop()), yta: Math.round(g._surf) }
})
writeFileSync('.test-shots/_skum.png', await page.screenshot())
{
  // ⚠️ "STÖRSTA ENSKILDA TON" DUGER INTE HÄR, och det tog en A/B för att se det: plattan ritas
  // med alfa 0,88 över vattnet, så den ger ingen enda dominerande ton ens när den ÄR platt —
  // måttet gav 10 % både före och efter, medan bilderna sida vid sida är uppenbart olika.
  // Det "platt" betyder är att ytan saknar INRE KANTER. Det är det som mäts nu.
  const png = PNG.sync.read(readFileSync('.test-shots/_skum.png'))
  const Y0 = band.top + 26 // under kronan — den har alltid kanter, även på en platt platta
  const Y1 = band.yta + 24
  const X0 = 560 // höger om Zacke och vänster om ankan: ren skumkropp, inga andra föremål
  const X1 = 740
  let kanter = 0
  let n = 0
  for (let y = Y0; y < Y1; y++) {
    for (let x = X0 + 1; x < X1; x++) {
      const i = (y * png.width + x) * 4
      const j = i - 4
      n++
      if (Math.abs(png.data[i] - png.data[j]) + Math.abs(png.data[i + 1] - png.data[j + 1]) + Math.abs(png.data[i + 2] - png.data[j + 2]) > 6) kanter++
    }
  }
  const andel = +((kanter / n) * 100).toFixed(1)
  krav('skum: inre kanter (ej platt)', andel >= 4, `${andel} % kantpixlar i skumkroppen (y ${Y0}-${Y1}) — platt platta ger ~0`)
}

// ---------------------------------------------------------------------------
// 6. FLYT-TEXTERNA får inte stapla sig (§4-punkt 4). Poppa tio bubblor i samma ögonblick,
// sex omgångar, och räkna hur många som lever samtidigt och hur nära varandra de står.
// ---------------------------------------------------------------------------
const texter = await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('pruttbad')
  g._floats = []
  let mest = 0
  let narmast = 1e9
  const lev = () => {
    const t = []
    const gar = (c) => {
      for (const k of c.children || []) {
        if (typeof k.text === 'string' && /Hihi|Pluff|Blubb|Prrt/.test(k.text)) t.push(k)
        gar(k)
      }
    }
    gar(g._ctx.fxLayer)
    return t
  }
  for (let runda = 0; runda < 6; runda++) {
    for (let i = 0; i < 10; i++) {
      g._pushBubble(260 + i * 78, 34, 0, 'normal')
      g._popBubble(g._ctx, g._bubbles[g._bubbles.length - 1], g._bubbles.length - 1)
    }
    for (let k = 0; k < 20; k++) {
      await new Promise((r) => requestAnimationFrame(r))
      const t = lev()
      if (t.length > mest) mest = t.length
      for (let i = 0; i < t.length; i++)
        for (let j = i + 1; j < t.length; j++) narmast = Math.min(narmast, Math.abs(t[i].x - t[j].x))
    }
  }
  return { mest, narmast: narmast === 1e9 ? -1 : Math.round(narmast) }
})
krav('flyttext: max samtidigt', texter.mest <= 2, `${texter.mest} i luften samtidigt`)
krav('flyttext: aldrig staplade', texter.narmast < 0 || texter.narmast >= 200, `narmaste par ${texter.narmast} px isar`)

// ---------------------------------------------------------------------------
// 7. EXIT mitt i en tät klase.
// ---------------------------------------------------------------------------
const forInnan = fel.length
await page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('pruttbad')
  for (let i = 0; i < 8; i++) g._pushBubble(600 + i * 6, 44, 0, 'normal')
})
await page.waitForTimeout(60)
await gaUt()
await page.waitForTimeout(600)
krav('exit mitt i klasen', fel.length === forInnan, fel.length === forInnan ? 'inga nya konsolfel' : fel.slice(forInnan).join(' | '))

console.log('\n  BUBBELFYSIK — pruttbad\n')
console.log(rader.join('\n'))
console.log(`\n  ${gronna}/${rader.length} grona · konsolfel: ${fel.length ? fel.join(' | ') : 0}\n`)
await browser.close()
process.exit(gronna === rader.length && fel.length === 0 ? 0 : 1)
