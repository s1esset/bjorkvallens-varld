// SPELAR `skattjakt-i-morkret`: flyttar ficklampan till varje gömt föremål, trycker på
// det och läser spelets EGET tillstånd (`_funna`, `sak._tagen`, `sak.eventMode`).
//
//   node scripts/_skattprobe.mjs [--rundor 12] [--url http://localhost:5173] [--huvud]
//
// `--rundor N` laddar om sidan N gånger och räknar hur många rundor som startar med ett
// föremål som REDAN är upptäckt (tryckbart) innan spelaren rört ficklampan. Det är inget
// man ser i en skärmdump och inget ett grönt test fångar: ljuset startade mitt i rummet
// och 2 av 12 rundor var delvis lösta åt barnet. Ett enda stickprov hade missat det —
// felet syns bara över en serie.
//
// Finns för att spelet inte använder `DragController` — `.test-logs` har alltså inga
// `drag/*`-poster, och `scripts/_dragspel.mjs` biter inte. Utan den här sonden är hela
// kärnloopen (lys → se → tryck → i kistan) grön och helt oprövad.
//
// KONTROLLARM inbyggd: föremålet trycks FÖRST utan att lampan lyser på det. Blir det
// taget ändå är mörkret bara dekor (allt vore tryckbart från start) och sonden mäter
// inget. Ett fynd i mätarmen betyder något bara om kontrollarmen är tyst.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const URL = arg('--url', 'http://localhost:5173')

const browser = await chromium.launch({ channel: 'chrome', headless: !argv.includes('--huvud') })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const konsolfel = []
page.on('console', (m) => { if (m.type() === 'error') konsolfel.push(m.text().slice(0, 160)) })
page.on('pageerror', (e) => konsolfel.push('PAGEERROR ' + String(e).slice(0, 160)))

await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'skattjakt-i-morkret' }))
await page.waitForTimeout(1600)

const las = () => page.evaluate(() => {
  const g = window.__barnspel?.game
  if (!g || g.id !== 'skattjakt-i-morkret') return { fel: 'spelet är inte monterat' }
  const cv = document.querySelector('canvas')
  const r = cv.getBoundingClientRect()
  const res = window.__barnspel.app.renderer.resolution || 1
  const sx = r.width / (cv.width / res)
  return {
    funna: g._funna ?? null,
    mal: (g._mal || []).map((s, i) => {
      const p = s.getGlobalPosition()
      return { i, tagen: !!s._tagen, sedd: !!s._sedd, aktiv: s.eventMode !== 'none', x: r.left + p.x * sx, y: r.top + p.y * sx }
    }),
  }
})

const peka = (x, y, typer) => page.evaluate(({ x, y, typer }) => {
  const cv = document.querySelector('canvas')
  for (const t of typer) {
    cv.dispatchEvent(new PointerEvent(t, {
      clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0,
      buttons: t === 'pointerup' ? 0 : 1, bubbles: true, isPrimary: true,
    }))
  }
}, { x, y, typer })

// flytta lampan dit (drag) och vänta ut ljusets "upptäckt"
const lysPa = async (x, y) => {
  await peka(x, y, ['pointerdown'])
  for (let s = 0; s < 6; s++) { await peka(x, y, ['pointermove']); await page.waitForTimeout(30) }
  await peka(x, y, ['pointerup'])
  await page.waitForTimeout(500)
}

// --- FÖRSTUDIE: startar rundan redan avslöjad? -------------------------------
const RUNDOR = Number(arg('--rundor', 0))
let prelysta = 0
for (let n = 0; n < RUNDOR; n++) {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'skattjakt-i-morkret' }))
  await page.waitForTimeout(1400)
  const l = await las()
  if (!l.fel && l.mal.some((m) => m.aktiv || m.sedd)) prelysta++
}
if (RUNDOR) {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'skattjakt-i-morkret' }))
  await page.waitForTimeout(1500)
}

const start = await las()
if (start.fel) { console.log('\n  _skattprobe: ✗ ' + start.fel + '\n'); await browser.close(); process.exit(1) }

// --- KONTROLLARM: tryck på ett omörkt föremål utan att lysa på det ------------
const forsta = start.mal.find((m) => !m.tagen)
await peka(forsta.x, forsta.y, ['pointerdown', 'pointerup'])
await page.waitForTimeout(400)
const efterKontroll = await las()
const kontrollTogs = efterKontroll.mal[forsta.i].tagen

// --- MÄTARM: lys på varje föremål och tryck ----------------------------------
const rader = []
for (let varv = 0; varv < 3; varv++) {
  const nu = await las()
  const sak = nu.mal.find((m) => !m.tagen)
  if (!sak) break
  await lysPa(sak.x, sak.y)
  const sedd = (await las()).mal[sak.i]
  await peka(sak.x, sak.y, ['pointerdown', 'pointerup'])
  await page.waitForTimeout(700)
  const efter = await las()
  rader.push({ i: sak.i, aktivEfterLjus: sedd.aktiv, sedd: sedd.sedd, tagen: efter.mal[sak.i].tagen, funna: efter.funna })
}

// exit mitt i allt
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(700)

console.log('\n  _skattprobe: skattjakt-i-morkret')
console.log(`  gömda föremål: ${start.mal.length} · aktiva från start: ${start.mal.filter((m) => m.aktiv).length}`)
if (RUNDOR) console.log(`  rundor som startade REDAN avslöjade: ${prelysta}/${RUNDOR} (ska vara 0)`)
console.log(`  KONTROLLARM (tryck utan ljus): ${kontrollTogs ? '✗ togs ändå — mörkret spärrar inget' : '✓ hände inget'}`)
for (const r of rader) {
  console.log(`   · föremål ${r.i}: sedd=${r.sedd} · tryckbar efter ljus=${r.aktivEfterLjus} · hamnade i kistan=${r.tagen} · funna=${r.funna}`)
}
console.log(`  konsolfel: ${konsolfel.length}${konsolfel.length ? '\n   ! ' + konsolfel.slice(0, 5).join('\n   ! ') : ''}`)
const ok = !kontrollTogs && prelysta === 0 && rader.some((r) => r.tagen) && konsolfel.length === 0
console.log(`  ${ok ? '✓ kärnloopen är SPELAD' : '✗ kärnloopen gick inte att spela'}\n`)

await browser.close()
process.exit(ok ? 0 : 1)
