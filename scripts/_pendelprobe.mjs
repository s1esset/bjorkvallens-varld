// `spindel-zacke-svingar`: HAR spelet ett rep att byta ut?
//
// LYFTPLAN B3 (nattköns N5) listade spelet som en kandidat för `lib/rep.js` — "handrullad
// pendel". Sonden prövar PREMISSEN innan något byggs. Ett verlet-rep löser två saker: en
// tråd som är LÄNGRE än avståndet mellan sina ändar (slack att fördela) och en tråd som
// får svänga fritt. Frågan är alltså om spelets nät någonsin är slakt, och vad som skulle
// gå sönder om längden slutade vara ett tal.
//
//   1. Är nätet SPÄNT varje bildruta? (|Zacke − fäste| mot `_L`) — ett spänt rep har
//      ingenting att lösa: den räta linjen ÄR den korrekta formen för en otöjbar tråd.
//   2. Ritas nätet någonsin utanför svinget? (i flykt finns ingen tråd alls)
//   3. Håller no-fail-garantin? `_ensureAmplitude` sätter ett GOLV på framåt-amplituden i
//      sluten form ur `G/L` — den finns inte att räkna om längden blir en kedja punkter.
//   4. Betyder nät-längd-knappen det den lovar? Perioden ska följa 2π√(L/G), alltså
//      √(260/170) = 1,24× längre för "Lång".
//
//   node scripts/_pendelprobe.mjs
import { chromium } from 'playwright'

const ID = 'spindel-zacke-svingar'
const G = 0.35
const SHORT = 170
const LONG = 260
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })

// Följ pendeln i `ms` och returnera bildrutornas rådata.
const FOLJ = (ms) => {
  const g = window.__barnspel.game
  const spar = []
  const t0 = performance.now()
  return new Promise((klar) => {
    const steg = () => {
      const z = g._zacke
      if (z && !z.destroyed) {
        const a = g._anchor
        spar.push({
          l: g._state,
          th: g._theta,
          L: g._L,
          rl: g._ropeLen,
          d: a ? Math.hypot(z.x - a.x, z.y - a.y) : null,
          rit: g._web?.context?.instructions?.length ?? 0,
          t: performance.now(),
        })
      }
      if (performance.now() - t0 < ms) requestAnimationFrame(steg)
      else klar(spar)
    }
    requestAnimationFrame(steg)
  })
}

// Perioden ur theta:s teckenbyten (halva perioder), i sekunder.
function period(spar) {
  const s = spar.filter((r) => r.l === 'swing')
  const korsn = []
  for (let i = 1; i < s.length; i++) if (s[i - 1].th <= 0 && s[i].th > 0) korsn.push(s[i].t)
  if (korsn.length < 2) return null
  return (korsn[korsn.length - 1] - korsn[0]) / (korsn.length - 1) / 1000
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage, ID, { timeout: 20000 })
  await page.waitForTimeout(600)

  // --- 1 + 2 + 3. Kort nät -------------------------------------------------
  // ⚠️ TVÅ FÖNSTER, av två skäl som drar åt olika håll. Perioden måste mätas i ett
  // OSTÖRT svep (ett släpp mitt i lämnar färre än två nollgenomgångar och kvoten blir
  // `undefined`), men rad 2 kräver att ett släpp UTLÖSTS — annars står spelet kvar i
  // 'swing' hela fönstret (auto-släppet kommer först efter 11 s) och raden blir grön
  // på en TOM mängd. "0 av 0 rutor" är inget tal.
  const kort = await page.evaluate(FOLJ, 7200) // minst tva nollgenomgangar: perioden ar ~2,5 s
  const flygP = page.evaluate(FOLJ, 2600)
  await page.waitForTimeout(200)
  await page.mouse.click(640, 300)
  const flyg = await flygP
  const sving = kort.filter((r) => r.l === 'swing' && r.d != null)
  const spann = sving.length ? Math.max(...sving.map((r) => Math.abs(r.d - r.L))) : 999
  ok('1. natet ar SPANT varje bildruta', sving.length > 60 && spann < 0.01,
    `max ${spann.toFixed(4)} px slack over ${sving.length} sving-rutor — ett rep har ingenting att losa`)

  const ejSving = flyg.filter((r) => r.l !== 'swing')
  const utanfor = ejSving.filter((r) => r.rit > 0)
  ok('2. ingen trad utanfor svinget', ejSving.length >= 20 && utanfor.length === 0,
    `${utanfor.length} rutor med ritad trad av ${ejSving.length} i flykt/moln`)

  const amp = sving.length ? Math.max(...sving.map((r) => r.th)) : 0
  ok('3. no-fail-garantin haller (framat-amplitud)', amp >= 1.0,
    `max theta ${amp.toFixed(2)} rad — golvet AMP 1,10 raknas i sluten form ur G/L`)

  const pKort = period(kort)

  // --- 4. Lång nät ---------------------------------------------------------
  await page.evaluate(() => window.__barnspel.game._lenBtn.emit('pointertap', { global: { x: 130, y: 650 } }))
  await page.waitForTimeout(1200)
  const lang = await page.evaluate(FOLJ, 6200)
  const pLang = period(lang)
  const bytt = lang.some((r) => r.rl === LONG)
  const kvot = pKort && pLang ? pLang / pKort : 0
  const vantat = Math.sqrt(LONG / SHORT)
  ok('4. lang net = langsammare pendel (2pi*sqrt(L/G))', bytt && kvot > vantat * 0.85 && kvot < vantat * 1.15,
    `period ${pKort?.toFixed(2)} s -> ${pLang?.toFixed(2)} s = ${kvot.toFixed(2)}x mot analytiska ${vantat.toFixed(2)}x (G=${G})`)

  ok('5. inga konsolfel under matningen', errors.length === 0, `${errors.length} fel`)

  const gronna = rader.filter((r) => r.ok).length
  console.log('')
  for (const r of rader) console.log(`  ${r.ok ? '✓' : '✗'} ${r.namn}  ·  ${r.text}`)
  console.log(`\n  ${gronna}/${rader.length} gröna\n`)
  process.exitCode = gronna === rader.length ? 0 : 1
} finally {
  await browser.close()
}
