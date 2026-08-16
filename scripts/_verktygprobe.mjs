// VERKTYGSSONDEN — spelar `flugan-pa-nasan` med riktiga muspekningar och läser SPELETS
// EGET TILLSTÅND (`window.__barnspel.game`), inte bilden.
//
// Frågan sonden svarar på är den ägaren ställde: "träffar verktyget flugan, blir hon platt,
// glider hon ner, reser hon sig och flyger ut?" — plus "reagerar rummets saker olika på
// olika verktyg?". Ingen skärmdump kan svara på något av det.
//
// ⚠️ KONTROLLARMEN FÖRST, ALLTID. Arm 1 trycker LÅNGT från varje fluga med samma verktyg.
//    Blir en fluga platt ändå mäter sonden inte träffen utan något annat, och varje tal
//    efter det är värdelöst. (CLAUDE.md: "En mätning som inte kan skilja två KÄNDA lägen
//    åt säger ingenting om det okända.")
//
// Kör ENSAM. Två headless-Chrome mot samma dev-server svälter varandras ticker.
import { chromium } from 'playwright'

const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const ID = 'flugan-pa-nasan'
const VS = 1
const tillSkarm = (x, y) => [x * VS, y * VS]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 200)) })
page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
// ⚠️ Sidan får INTE laddas om mitt i mätningen — då byts `window.__barnspel` ut och varje
// tal efter det är taget på ett annat spel. Räknas här så det syns i stället för att se
// ut som en bugg i spelet.
let laddningar = 0
page.on('load', () => { laddningar += 1 })

const peka = async (x, y) => {
  const [sx, sy] = tillSkarm(x, y)
  await page.evaluate(({ x, y }) => {
    const cv = document.querySelector('canvas')
    const r = cv.getBoundingClientRect()
    for (const t of ['pointerdown', 'pointerup']) {
      cv.dispatchEvent(new PointerEvent(t, {
        clientX: r.left + x, clientY: r.top + y,
        pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true,
      }))
    }
  }, { x: sx, y: sy })
}

const las = () => page.evaluate(() => {
  const g = window.__barnspel?.game
  if (!g) return { tomt: true, harHook: !!window.__barnspel, skarm: window.__barnspel?.nav?.current?.name || '?' }
  return {
    valt: g._verktygKnappar?.[g._valdIx]?.spec?.key ?? null,
    kyl: +(g._kylT || 0).toFixed(2),
    runda: g._runda,
    fart: g._fart,
    maxSamtidigt: g._maxSamtidigt,
    malUte: g._malUte,
    ute: g._ute,
    pol: !!g._rum?.kaffePol,
    lyser: !!g._rum?.lampaLyser,
    flugor: (g._flugor || []).map((f) => ({
      x: Math.round(f.vy.view.x), y: Math.round(f.vy.view.y),
      lage: f.lage, brattom: !!f.brattom, kladdig: !!f.kladdig, klibb: +(f.klibbT || 0).toFixed(1),
    })),
  }
})

const vanta = (ms) => page.waitForTimeout(ms)
// Verktygsknapparnas mittpunkter — samma tal som spelet räknar fram (172 px isär, mitten 660).
const VERKTYG_X = [316, 488, 660, 832, 1004]
const VERKTYG_Y = 654

const rader = []
const skriv = (namn, varde, kommentar = '') => {
  rader.push([namn, String(varde), kommentar])
}

try {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await vanta(2600)

  let s = await las()
  if (s.tomt) throw new Error(`spelet exponerar inget tillstånd (hook=${s.harHook}, skärm=${s.skarm})`)
  skriv('runda', s.runda)
  skriv('fart px/s', s.fart)
  skriv('max samtidigt', s.maxSamtidigt, `mål ut: ${s.malUte}`)
  skriv('lampan lyser', s.lyser ? 'ja' : 'NEJ')

  // Vänta in att minst en fluga är i luften.
  for (let i = 0; i < 20 && !(await las()).flugor.some((f) => f.lage === 'flyger'); i++) await vanta(400)
  s = await las()
  skriv('flugor i luften', s.flugor.filter((f) => f.lage === 'flyger').length)

  // ---- ARM 1: KONTROLLARM ------------------------------------------------
  // Flugsmällan är redan vald. Tryck i ett hörn långt från varje fluga. INGEN får plattas.
  const langtBort = () => {
    const f = s.flugor[0]
    // Motsatt hörn av rutan, minst 400 px från varje fluga.
    const kandidater = [[120, 300], [1200, 260], [120, 120], [1200, 120]]
    return kandidater.find((k) => s.flugor.every((fl) => Math.hypot(fl.x - k[0], fl.y - k[1]) > 400)) || [1200, 120]
  }
  const [kx, ky] = langtBort()
  await peka(kx, ky)
  await vanta(900)
  let e = await las()
  const kontrollPlatta = e.flugor.filter((f) => f.lage === 'platt' || f.lage === 'vilar').length
  skriv('KONTROLL platta', kontrollPlatta, `tryck på (${kx}, ${ky}), ska vara 0`)

  // ---- ARM 2: MÄTARM — smällan RAKT på flugan ----------------------------
  // Vänta in att någon FLYGER igen — sitter båda på pappa just nu blir mätarmen "omätt",
  // och en omätt arm är inte ett grönt svar (den mäter ingenting alls).
  await vanta(700)
  for (let i = 0; i < 16; i++) {
    s = await las()
    if (s.tomt) throw new Error(`tillståndet försvann efter kontrollarmen (hook=${s.harHook}, skärm=${s.skarm})`)
    if (s.flugor.some((f) => f.lage === 'flyger')) break
    await vanta(400)
  }
  let mal = s.flugor.find((f) => f.lage === 'flyger')
  let platt = 0
  let vilar = 0
  let reste = 0
  if (mal) {
    // Trycket måste komma på flugans FAKTISKA läge i samma ögonblick — hon rör sig
    // 300–540 px/s, så ett läge läst en halv sekund tidigare är ren gissning.
    const f2 = (await las()).flugor.find((f) => f.lage === 'flyger') || mal
    await peka(f2.x, f2.y)
    await vanta(400)
    e = await las()
    platt = e.flugor.filter((f) => f.lage === 'platt').length
    skriv('MÄT platt direkt', platt, `tryck på (${f2.x}, ${f2.y})`)
    // Glidet tar 0,18 + 0,75 s, sedan 1–3 s liggande.
    await vanta(1400)
    e = await las()
    vilar = e.flugor.filter((f) => f.lage === 'vilar').length
    const paBordet = e.flugor.filter((f) => f.lage === 'vilar' && f.y > 500).length
    skriv('MÄT vilar på bordet', `${vilar} (varav y>500: ${paBordet})`)
    await vanta(3400)
    e = await las()
    reste = e.flugor.filter((f) => f.brattom).length + e.ute
    skriv('MÄT reste sig / ute', reste, 'brattom = flyr rakt mot fönstret')
  } else {
    skriv('MÄT platt direkt', 'ingen fluga i luften — omätt')
  }

  // ---- ARM 3: RUMMET reagerar på TYP -------------------------------------
  // Sprayen (vind+vat) mot kaffekoppen ska INTE välta den; smällan (slag) ska.
  await page.evaluate(() => { window.__barnspel.game._kylT = 0 })
  await peka(VERKTYG_X[1], VERKTYG_Y)   // sprayflaskan
  await vanta(400)
  skriv('valt verktyg', (await las()).valt, 'ska vara spray')
  await page.evaluate(() => { window.__barnspel.game._kylT = 0 })
  await peka(1086, 516)                 // kaffekoppen
  await vanta(900)
  skriv('spray → kaffepöl', (await las()).pol ? 'JA (fel)' : 'nej', 'vind/vat ska inte välta')

  await peka(VERKTYG_X[0], VERKTYG_Y)   // flugsmällan
  await vanta(400)
  await page.evaluate(() => { window.__barnspel.game._kylT = 0 })
  await peka(1086, 516)
  await vanta(1100)
  skriv('smälla → kaffepöl', (await las()).pol ? 'ja' : 'NEJ (fel)', 'slag ska välta koppen')

  // Slemhanden på lampan ska slå om ljuset — varje gång.
  const foreLampa = (await las()).lyser
  await peka(VERKTYG_X[4], VERKTYG_Y)   // slemhanden
  await vanta(400)
  await page.evaluate(() => { window.__barnspel.game._kylT = 0 })
  await peka(200, 460)                  // lampskärmen
  await vanta(900)
  const efterLampa = (await las()).lyser
  skriv('slemhand → lampan', `${foreLampa ? 'tänd' : 'släckt'} → ${efterLampa ? 'tänd' : 'släckt'}`,
    foreLampa !== efterLampa ? 'slog om' : 'SLOG INTE OM (fel)')

  // ---- ARM 4: RUNDAN eskalerar (ägarens "max 6 flugor samtidigt") --------
  // Nivån sätts direkt i tillståndet i stället för att spela sju rundor. Det mäter det som
  // faktiskt frågas: att `_sattRunda()` + `_slappStart()` FAKTISKT når taket.
  await page.evaluate(() => {
    const g = window.__barnspel.game
    for (const f of [...g._flugor]) g._rivFluga(f)
    g._runda = 8
    g._sattRunda()
    g._slappStart(window.__barnspel.ctx)
  })
  await vanta(8200)
  const hog = await las()
  skriv('runda 8: fart', hog.fart, 'tak 540')
  skriv('runda 8: max/mål', `${hog.maxSamtidigt} / ${hog.malUte}`, 'tak 6 / 6')
  skriv('runda 8: i luften', hog.flugor.length, 'ska nå taket')

  // ---- ARM 5: EXIT mitt i ett verktygssvep -------------------------------
  await page.evaluate(() => { window.__barnspel.game._kylT = 0 })
  await peka(640, 300)
  await vanta(60)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await vanta(1400)
  skriv('exit mitt i svep', fel.length === 0 ? 'rent' : `${fel.length} konsolfel`)
} catch (err) {
  skriv('SOND KRASCHADE', err.message)
} finally {
  await browser.close()
}

const b = Math.max(...rader.map((r) => r[0].length))
console.log('')
for (const [n, v, k] of rader) console.log(`  ${n.padEnd(b)}  ${String(v).padEnd(22)} ${k}`)
console.log(`\n  sidladdningar: ${laddningar} ${laddningar > 1 ? '⚠ SIDAN LADDADES OM MITT I — talen ovan gäller inte' : '(ingen omladdning mitt i)'}`)
console.log(`  konsolfel: ${fel.length}`)
for (const f of fel.slice(0, 6)) console.log(`    ✗ ${f}`)
console.log('')
