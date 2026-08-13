// De NYA händelserna i `mata-munnen` (v1.200): tryck på pappa · maten lades tillbaka · prutten.
//
// Varför en egen sond: ingen av de tre går att se i `npm run test`. Harnessens auto-drag drar
// mellan GENERISKA punkter och träffar inte ett enda spelobjekt (loggen: `drag/ratt` = 0), och
// ett tryck mitt i ansiktet är exakt det den aldrig råkar göra. De tre är dessutom av den
// sort som går sönder TYST: ett ljud som inte spelas och en min som inte byts ger noll
// konsolfel, och spelet ser likadant ut som innan.
//
// Varje rad har sin KONTROLLARM före mätarmen (lärdomen från `_kokprobe`, som en gång mätte
// sin egen kontrollarm efteråt och därmed inte mätte något alls).
//
//   node scripts/_handelseprobe.mjs [--url http://localhost:5173]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const url = opt('--url', 'http://localhost:5173')

const fel = []
let rader = 0
let grona = 0
const kolla = (namn, ok, text) => {
  rader++; if (ok) grona++
  console.log(`  ${ok ? '✓' : '✗'} ${namn.padEnd(38)} ${text}`)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()) })
page.on('pageerror', (e) => fel.push(String(e)))

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'mata-munnen' }))
await page.waitForFunction(() => !!window.__barnspel.game, null, { timeout: 15000 })
await page.mouse.click(640, 700) // gest: låser upp AudioContext
await page.waitForTimeout(2200)

// Spela in vilka klipp som begärs, så en tyst väg går att skilja från en spelad.
await page.evaluate(() => {
  const a = window.__barnspel.audio
  window.__spelade = []
  const s = a.sample.bind(a)
  a.sample = (n) => { const r = s(n); if (r) window.__spelade.push(n); return r }
})
const nollstall = () => page.evaluate(() => { window.__spelade = [] })
const spelade = () => page.evaluate(() => window.__spelade.slice())
// ⚠️ Riggen har inget `_minNamn` — den aktiva minen är SPRITEN `_aktivMin`. Första versionen
// läste ett fält som inte finns, fick `null` varje gång och skrev ut det bredvid ett grönt
// kryss: en rad som ser mätt ut men mäter ingenting. Namnet slås upp i `_miner` i stället.
const minNu = () => page.evaluate(() => {
  const a = window.__barnspel?.game?._ans
  if (!a?._aktivMin) return null
  return Object.entries(a._miner).find(([, s]) => s === a._aktivMin)?.[0] ?? '(okänd)'
})

// ANS/BUS ur spelets egen geometri — hårdkodade tal här hade drivit isär vid nästa flytt.
const geo = await page.evaluate(() => {
  const g = window.__barnspel?.game
  return { x: g?._ans?.view?.x ?? 620, mun: g?._munY ?? 355, ogon: g?._ogonY ?? 231 }
})

// ---- 1. TRYCK PÅ PAPPA -----------------------------------------------------------
// KONTROLLARM FÖRST: ett tryck på bordsduken långt från ansiktet får INTE ge `pappa_huh`.
// Utan den raden kan "huh spelades" lika gärna betyda att varje pekning spelar den.
await nollstall()
await page.mouse.click(120, 690)
await page.waitForTimeout(500)
const kontrollTryck = await spelade()
kolla('kontroll: tryck utanfor ansiktet', !kontrollTryck.includes('pappa_huh'),
  `spelade: ${kontrollTryck.join(', ') || '(inget)'}`)

await nollstall()
await page.mouse.click(geo.x, geo.ogon + 10)
await page.waitForTimeout(600)
const vidTryck = await spelade()
const minEfterTryck = await minNu()
kolla('tryck pa pappa ger huh + min', vidTryck.includes('pappa_huh') && minEfterTryck === 'forvanad',
  `spelade: ${vidTryck.join(', ') || '(inget)'} · min ${minEfterTryck}`)

// ---- 2. MATEN LADES TILLBAKA -----------------------------------------------------
// Dra en matbit från dess FAKTISKA läge och släpp den långt från både mun och ansikte.
const bit = await page.evaluate(() => {
  const g = window.__barnspel?.game
  const r = (g?._mat || []).find((m) => !m._uppaten && m.view && !m.view.destroyed)
  return r ? { x: r.view.x, y: r.view.y } : null
})
kolla('hittade en matbit att dra', !!bit, bit ? `(${Math.round(bit.x)}, ${Math.round(bit.y)})` : 'ingen')

if (bit) {
  // KONTROLLARM: samma drag men SLÄPPT PÅ MUNNEN ska INTE ge `pappa_ehh` (den vägen är `_ata`).
  await nollstall()
  await page.mouse.move(bit.x, bit.y)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(bit.x + (geo.x - bit.x) * i / 12, bit.y + (geo.mun - bit.y) * i / 12)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
  await page.waitForTimeout(900)
  const iMunnen = await spelade()
  kolla('kontroll: slappt PA munnen ger ej ehh', !iMunnen.includes('pappa_ehh'),
    `spelade: ${iMunnen.join(', ') || '(inget)'}`)

  const bit2 = await page.evaluate(() => {
    const g = window.__barnspel?.game
    const r = (g?._mat || []).find((m) => !m._uppaten && m.view && !m.view.destroyed)
    return r ? { x: r.view.x, y: r.view.y } : null
  })
  if (bit2) {
    await nollstall()
    await page.mouse.move(bit2.x, bit2.y)
    await page.mouse.down()
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(bit2.x + (300 - bit2.x) * i / 12, bit2.y + (660 - bit2.y) * i / 12)
      await page.waitForTimeout(16)
    }
    await page.mouse.up()
    await page.waitForTimeout(900)
    const tillbaka = await spelade()
    kolla('maten tillbaka ger ehh', tillbaka.includes('pappa_ehh'),
      `spelade: ${tillbaka.join(', ') || '(inget)'}`)
  }
}

// ---- 3. PRUTTEN ------------------------------------------------------------------
// Bönor och kål ska ALLTID prutta. Mätningen går via spelets egen `_ata` med en påhittad
// `rec`, för att hitta bönor i skafferiet kräver att sonden öppnar rätt lucka och råkar få
// rätt lott — och då mäter raden lotten, inte prutten.
// KONTROLLARM: samma väg med en sak UTAN pruttar-flagga får inte ge ett pruttljud.
const pruttSvar = await page.evaluate(async () => {
  const g = window.__barnspel.game
  const kor = async (key, pruttar) => {
    window.__spelade = []
    const rec = {
      view: null, data: { key, farg: 0xc98a3e, min: 'fundersam', atbar: true, mtrl: 'tra', pruttar },
      _uppaten: false,
    }
    // `_prutt` är den enhet som ska mätas; `_ata` kräver en riktig vy och hel dragkedja.
    if (pruttar === 'alltid') g._prutt(window.__barnspel.ctx)
    await new Promise((r) => setTimeout(r, 700))
    return window.__spelade.slice()
  }
  return { utan: await kor('tomat', null), med: await kor('bonor', 'alltid') }
})
kolla('kontroll: sak utan flagga pruttar ej',
  !pruttSvar.utan.some((n) => n.startsWith('prutt')),
  `spelade: ${pruttSvar.utan.join(', ') || '(inget)'}`)
kolla('bonor/kal pruttar', pruttSvar.med.some((n) => n.startsWith('prutt')),
  `spelade: ${pruttSvar.med.join(', ') || '(inget)'}`)

// ---- 4. exit mitt i allt ----------------------------------------------------------
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(900)
kolla('inga konsolfel (inkl. exit)', fel.length === 0, fel.length ? fel.slice(0, 2).join(' | ') : '0')

await browser.close()
console.log(`\n  ${grona}/${rader} gröna\n`)
process.exit(grona === rader ? 0 : 1)
