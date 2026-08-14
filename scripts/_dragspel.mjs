// SPELAR ett dragspel på riktigt: drar varje föremål från sitt FAKTISKA läge till
// varje mål tills DragControllern loggar ett `drag/ratt`. Finns för att harnessens
// auto-drag drar mellan GENERISKA punkter och kan missa varje spelobjekt — då är
// testet grönt och kärnloopen helt oprövad (CLAUDE.md, "Harnessen drar inte i spelet").
//
//   node scripts/_dragspel.mjs <id> [--forsok 3] [--url http://localhost:5173] [--huvud]
//
// KONTROLLARM först, alltid: `node scripts/_dragspel.mjs sortera-skrap` är ett spel
// vars kärnloop bevisligen fungerar. Rapporterar sonden 0 rätt DÄR är sonden trasig,
// inte spelet — mät aldrig ett okänt spel med en mätare som inte klarat ett känt.
//
// Så hittas föremålen: `GameHost` lägger DEN monterade modulen på
// `window.__barnspel.game` (DEV). Sonden skannar dess egna fält efter något med både
// `items` och `targets` (en DragController), oavsett vad spelet råkar kalla fältet.
// Två vägar som INTE fungerar, båda uppmätta: en prototyp-wrap av `addItem` gav 0
// föremål på ett spel med fyra, och `await import('/src/games/registry.js')` i sidan
// gav `_drag` undefined i en körning och fyra föremål i nästa — Vite kan servera
// modulen under en HMR-stämplad URL, och då är det en ANNAN singleton som svarar.
//
// Träffprövningen läser spelets EGEN logg (`drag/ratt` ur `window.__gamelog`), alltså
// exakt den väg spelet självt tar, inte en gissning om vad som borde ha hänt.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const id = argv.find((a, i) => !a.startsWith('--') && !['--forsok', '--url'].includes(argv[i - 1]))
if (!id) { console.error('ange ett spel-id: node scripts/_dragspel.mjs <id>'); process.exit(2) }
const URL = arg('--url', 'http://localhost:5173')
const MAX_ITEMS = Number(arg('--forsok', 3))

const browser = await chromium.launch({ channel: 'chrome', headless: !argv.includes('--huvud') })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const konsolfel = []
page.on('console', (m) => { if (m.type() === 'error') konsolfel.push(m.text().slice(0, 160)) })
page.on('pageerror', (e) => konsolfel.push('PAGEERROR ' + String(e).slice(0, 160)))

await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
await page.waitForTimeout(1500)

// --- hjälpare i sidan --------------------------------------------------------
// Räknarna läses ur `snapshot().timeline` — INTE ur `summary`. `summary.vanligast`
// är en topp-18-lista: ett enstaka `drag/ratt` kan trilla ur den i ett långt pass,
// och `summary.counts` finns inte alls (den gissningen gav 0 rätt på ett spel som
// bevisligen la föremålet i tunnan — sonden var det trasiga, inte spelet).
const raknare = () => page.evaluate(() => {
  const rader = window.__gamelog?.snapshot?.()?.timeline || []
  const ut = { ratt: 0, felMal: 0, miss: 0 }
  for (const e of rader) {
    const k = `${e.kategori ?? e.cat ?? e.k ?? ''}/${e.handelse ?? e.event ?? e.e ?? ''}`
    const namn = k.includes('drag/') ? k : JSON.stringify(e)
    if (namn.includes('drag/ratt')) ut.ratt++
    else if (namn.includes('drag/fel-mal')) ut.felMal++
    else if (namn.includes('drag/miss')) ut.miss++
  }
  return ut
})

const lagen = (gid) => page.evaluate((gid) => {
  const g = window.__barnspel?.game
  if (!g) return { fel: 'inget spel monterat (window.__barnspel.game saknas)' }
  if (g.id !== gid) return { fel: `fel spel monterat: ${g.id}` }
  const par = Object.keys(g).map((k) => [k, g[k]]).find(([, v]) => v && Array.isArray(v.items) && Array.isArray(v.targets))
  if (!par) return { fel: 'ingen DragController hittad på spelobjektet', alive: !!g._alive }
  const dc = par[1]
  const cv = document.querySelector('canvas')
  const r = cv.getBoundingClientRect()
  const res = window.__barnspel?.app?.renderer?.resolution || 1
  const sx = r.width / (cv.width / res)
  const sy = r.height / (cv.height / res)
  const punkt = (view) => {
    if (!view || !view.parent || !view.visible) return null
    const p = view.getGlobalPosition()
    return { x: r.left + p.x * sx, y: r.top + p.y * sy }
  }
  return {
    falt: par[0],
    items: dc.items.map((rec, i) => ({ i, placed: !!rec.placed, p: punkt(rec.view), data: String(rec.data?.key ?? rec.data?.category ?? '') })),
    targets: dc.targets.map((rec, i) => ({ i, p: punkt(rec.view) })),
  }
}, gid)

const drag = async (fran, till) => {
  await page.evaluate(async ({ fran, till }) => {
    const cv = document.querySelector('canvas')
    const send = (typ, x, y) => cv.dispatchEvent(new PointerEvent(typ, {
      clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0,
      buttons: typ === 'pointerup' ? 0 : 1, bubbles: true, isPrimary: true,
    }))
    send('pointerdown', fran.x, fran.y)
    const STEG = 14
    for (let s = 1; s <= STEG; s++) {
      const t = s / STEG
      send('pointermove', fran.x + (till.x - fran.x) * t, fran.y + (till.y - fran.y) * t)
      await new Promise((r) => setTimeout(r, 16))
    }
    send('pointerup', till.x, till.y)
  }, { fran, till })
  await page.waitForTimeout(420)
}

// --- kör ---------------------------------------------------------------------
const start = await raknare()
const forsta = await lagen(id)
if (forsta.fel) {
  console.log(`\n  _dragspel: ${id}\n  ✗ ${forsta.fel}\n`)
  await browser.close()
  process.exit(1)
}

const rader = []
let rattTotalt = 0
for (let i = 0; i < Math.min(MAX_ITEMS, forsta.items.length); i++) {
  const nuLage = await lagen(id)
  const item = nuLage.items[i]
  if (!item || item.placed || !item.p) { rader.push({ item: i, resultat: 'hoppad (borta/placerad)' }); continue }
  let traff = null
  for (const t of nuLage.targets) {
    if (!t.p) continue
    const fore = await raknare()
    const om = await lagen(id)
    const p = om.items[i]?.p
    if (!p) break
    await drag(p, t.p)
    const efter = await raknare()
    if (efter.ratt > fore.ratt) { traff = t.i; rattTotalt++; break }
  }
  rader.push({ item: i, data: item.data, resultat: traff === null ? 'INGET MÅL GAV drag/ratt' : `rätt mål = ${traff}` })
}
const slut = await raknare()

// exit mitt i allt — en sond som spelar ska också pröva utgången
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(700)

console.log(`\n  _dragspel: ${id}  (controller: ${forsta.falt})`)
console.log(`  föremål: ${forsta.items.length} · mål: ${forsta.targets.length}`)
for (const r of rader) console.log(`   · föremål ${r.item}${r.data ? ` (${r.data})` : ''}: ${r.resultat}`)
console.log(`  drag/ratt: ${slut.ratt - start.ratt} · drag/fel-mal: ${slut.felMal - start.felMal} · drag/miss: ${slut.miss - start.miss}`)
console.log(`  konsolfel: ${konsolfel.length}${konsolfel.length ? '\n   ! ' + konsolfel.slice(0, 5).join('\n   ! ') : ''}`)
console.log(`  ${rattTotalt > 0 ? '✓ kärnloopen är SPELAD' : '✗ inget föremål nådde ett rätt mål'}\n`)

await browser.close()
process.exit(rattTotalt > 0 && konsolfel.length === 0 ? 0 : 1)
