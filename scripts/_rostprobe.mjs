// Rost-sond: mäter lagereldens värme i det SPELET, inte i biblioteket.
//
//   node scripts/_rostprobe.mjs
//
// `_varmeprobe.mjs` bevisar att gradningen räknas som förut. Den säger ingenting om
// det som faktiskt ändrades i spelet: mjukheten följer nu TEMPERATUREN, så sockret
// ska sjunka ihop när det ligger i lågan och **stelna igen när barnet lyfter upp det**
// — utan att en enda gyllene procent går förlorad (P0: inget som nollställer).
//
// Sonden håller marshmallowen i den heta zonen, lyfter den, och läser per prov:
// gradningen, temperaturen och den mjuka kroppens verkliga STYVHET (inte dess
// bounding box — se noten längre ner om vridningen runt pinnen).
import { chromium } from 'playwright'

const ID = 'lagerelden'
let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}

const snap = (page) =>
  page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    if (!g?._marsh) return null
    const pts = g._soft ? g._soft.pts.slice(0, g._soft.n) : []
    const ys = pts.map((p) => p.y)
    const xs = pts.map((p) => p.x)
    return {
      toast: g._toast,
      temp: g._varme ? g._varme.temp('mat') : -1,
      narhet: g._varme ? g._varme.narhet('mat') : -1,
      hojd: ys.length ? Math.max(...ys) - Math.min(...ys) : -1,
      bredd: xs.length ? Math.max(...xs) - Math.min(...xs) : -1,
      styv: g._soft ? g._soft.styvhet : -1,
      fyll: g._soft ? g._soft.fyllnad() : -1,
      mx: g._marsh.x,
      my: g._marsh.y,
      hotX: g._hotX,
      hotY: g._flameTopY + 20,
      hotR: g._hotR,
    }
  }, ID)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(900)

  console.log(`\n  Rost-sond — ${ID}\n`)
  const s0 = await snap(page)
  if (!s0) throw new Error('spelet exponerar ingen marshmallow')
  console.log(`  vilo-höjd ${s0.hojd.toFixed(1)} px · marsh (${Math.round(s0.mx)}, ${Math.round(s0.my)}) · het zon (${Math.round(s0.hotX)}, ${Math.round(s0.hotY)}) r${s0.hotR}`)

  // Designkoordinater → skärm (1280×720 ⇒ 1:1, men gå ändå via letterboxen).
  const till = async (dx, dy, typ) => {
    await page.evaluate(
      ({ dx, dy, typ }) => {
        const c = document.querySelector('canvas')
        const r = c.getBoundingClientRect()
        const s = Math.min(r.width / 1280, r.height / 720)
        const x = r.left + r.width / 2 + (dx - 640) * s
        const y = r.top + r.height / 2 + (dy - 360) * s
        c.dispatchEvent(new PointerEvent(typ, { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: typ === 'pointerup' ? 0 : 1, bubbles: true, isPrimary: true }))
      },
      { dx, dy, typ },
    )
  }

  // 1) Greppa marshmallowen och håll den i lågan tills den är HALVGYLLENE — inte
  //    längre. Rostar man den klar flyger den till fatet och en NY vit bit hamnar på
  //    pinnen; sondens första version mätte den och rapporterade "gradningen försvann".
  await till(s0.mx, s0.my, 'pointerdown')
  const prov = []
  for (let i = 0; i < 25; i++) {
    const s = await snap(page)
    if (s.toast > 0.55) break
    await till(s.hotX, s.hotY, 'pointermove')
    await page.waitForTimeout(200)
    prov.push(await snap(page))
  }
  const het = prov[prov.length - 1]
  console.log(`\n  I LÅGAN: grad ${het.toast.toFixed(3)} · temp ${het.temp.toFixed(3)} · styvhet ${het.styv.toFixed(3)} · h/b ${het.hojd.toFixed(1)}/${het.bredd.toFixed(1)} px`)
  ok('temperaturen når full värme i lågan', het.temp > 0.9, het.temp.toFixed(3))
  ok('sockret MJUKNAR (styvheten faller)', het.styv < 0.25, `1.000 → ${het.styv.toFixed(3)}`)

  // 2) Lyft upp den ur elden och håll den där i 3 s.
  const uppe = { x: het.hotX, y: Math.max(90, het.hotY - 260) }
  const gradVidLyft = het.toast
  const svalna = []
  for (let i = 0; i < 15; i++) {
    await till(uppe.x, uppe.y, 'pointermove')
    await page.waitForTimeout(200)
    svalna.push(await snap(page))
  }
  const kall = svalna[svalna.length - 1]
  console.log(`  UR ELDEN 3 s: grad ${kall.toast.toFixed(3)} · temp ${kall.temp.toFixed(3)} · styvhet ${kall.styv.toFixed(3)} · h/b ${kall.hojd.toFixed(1)}/${kall.bredd.toFixed(1)} px`)
  ok('temperaturen faller ur elden', kall.temp < het.temp * 0.25, `${het.temp.toFixed(3)} → ${kall.temp.toFixed(3)}`)
  ok('sockret STELNAR igen', kall.styv > 0.9, `${het.styv.toFixed(3)} → ${kall.styv.toFixed(3)} (före bytet frös den på ~0,21 för alltid)`)
  ok('P0: gradningen tappar ingenting', kall.toast >= gradVidLyft - 1e-9, `${gradVidLyft.toFixed(3)} → ${kall.toast.toFixed(3)}`)
  // MÄT INTE FORMEN MED EN BOUNDING BOX HÄR. Marshmallowen sitter på en pinne genom
  // mitten och roterar långsamt runt den medan man drar (uppmätt på HEAD också, alltså
  // inte något det här bytet införde): höjden faller och bredden växer lika mycket
  // medan `fyllnad()` står kvar på 1,00 — det är en vridning, inte en hoptryckning.
  // Sondens första version läste den vridningen som "stelnar inte" och blev röd på
  // en kod som gjorde precis rätt.
  console.log(`    (fyllnad ${het.fyll.toFixed(3)} → ${kall.fyll.toFixed(3)}: ingen area går förlorad — h/b-svängningen är en vridning runt pinnen, mätt likadant på HEAD.)`)

  await till(uppe.x, uppe.y, 'pointerup')
  await page.waitForTimeout(400)

  // 3) Exit mitt i allt — inga tickande tweens efter spelbyte.
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(600)
  ok('0 konsolfel', errors.length === 0, errors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}
console.log(fel === 0 ? '\n  ALLT GRÖNT\n' : `\n  ${fel} FEL\n`)
process.exit(fel ? 1 : 0)
