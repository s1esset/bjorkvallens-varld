// Fläkt-sond: styr fläkten i studsa-ner myntet på riktigt — och lagom mycket?
//
//   node scripts/_flaktprobe.mjs [antal-släpp per sida]     (default 6)
//
// Kraften går inte att räkna fram i huvudet: myntet är i strömmen ~0,3 s, tar med sig
// farten resten av fallet, och pinnarna sprider allt däremellan. Sonden släpper därför
// mynt från EXAKT samma punkt med fläkten åt höger respektive åt vänster och mäter var
// de landar. Skillnaden mellan de två högarna ÄR fläktens verkan, mätt i px och fickor.
//
// Två fel den ska fånga: en fläkt som inte gör något (då är kontrollen en lögn) och en
// som blåser myntet tvärs över brädet (då är barnets sikte meningslöst).
import { chromium } from 'playwright'

const ID = 'studsa-ner'
const N = Number(process.argv[2] ?? 6)
const SLAPP_X = 640 // mitten: lika långt till båda sidor

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const medel = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(2600) // låt demo-myntet landa (fläkten pausar tills dess)

  const peka = (dx, dy, typ) =>
    page.evaluate(
      ({ dx, dy, typ }) => {
        const c = document.querySelector('canvas')
        const r = c.getBoundingClientRect()
        const s = Math.min(r.width / 1280, r.height / 720)
        c.dispatchEvent(new PointerEvent(typ, {
          clientX: r.left + r.width / 2 + (dx - 640) * s,
          clientY: r.top + r.height / 2 + (dy - 360) * s,
          pointerId: 1, pointerType: 'mouse', button: 0,
          buttons: typ === 'pointerup' ? 0 : 1, bubbles: true, isPrimary: true,
        }))
      },
      { dx, dy, typ },
    )

  const stallFlakt = (sida, y) =>
    page.evaluate(
      async ({ gid, sida, y }) => {
        const g = (await import('/src/games/registry.js')).getGame(gid)
        g._fanSide = sida
        g._fanY = y
        g._placeFan()
        g._balls.forEach((b) => (b.settled = true)) // rensa brädet mellan mätningarna
        return { blaser: g._fanBlaser(), binW: g._binW }
      },
      { gid: ID, sida, y },
    )

  // VÄNTA TILLS FLÄKTEN FAKTISKT BLÅSER. Den pausar medan ett hjälp-släpp faller, och
  // sondens första version missade det: den släppte mynt medan demomyntet ännu var i
  // luften och mätte alltså en AVSTÄNGD fläkt. Två mätningar i rad sa "8 px" och "10 px",
  // och båda var sanna — om en fläkt som inte blåste.
  const vantaPaBlast = async () => {
    for (let i = 0; i < 40; i++) {
      const b = await page.evaluate(async (gid) => {
        const g = (await import('/src/games/registry.js')).getGame(gid)
        return g._fanBlaser()
      }, ID)
      if (b) return true
      await page.waitForTimeout(200)
    }
    return false
  }

  // Ett släpp: peka i toppbandet vid x och lyft → myntet faller från exakt den punkten.
  const slapp = async (x) => {
    await vantaPaBlast()
    await peka(x, 60, 'pointerdown')
    await peka(x, 60, 'pointerup')
    await page.waitForTimeout(2400)
    return page.evaluate(async (gid) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      const sista = g._balls[g._balls.length - 1]
      return sista ? { x: sista.body.position.x, y: sista.body.position.y } : null
    }, ID)
  }

  console.log(`\n  Fläkt-sond — ${ID}, ${N} släpp per sida från x=${SLAPP_X}\n`)

  const resultat = {}
  for (const sida of [0, 1]) {
    const info = await stallFlakt(sida, 380)
    const landningar = []
    for (let i = 0; i < N; i++) {
      const r = await slapp(SLAPP_X)
      if (r) landningar.push(r.x)
      if (i === 0 && sida === 0) {
        await page.screenshot({ path: '.test-shots/_flakt.png' }) // strömmen syns
      }
    }
    resultat[sida] = landningar
    console.log(`     fläkt ${sida === 0 ? 'VÄNSTER (blåser höger)' : 'HÖGER (blåser vänster)'} · blåser=${info.blaser} · landningar ${landningar.map((v) => Math.round(v)).join(' · ')}`)
    resultat.binW = info.binW
  }

  const mV = medel(resultat[0])
  const mH = medel(resultat[1])
  const skillnad = mV - mH
  const fickor = skillnad / resultat.binW
  console.log(`\n     medel: vänsterfläkt ${mV.toFixed(0)} px · högerfläkt ${mH.toFixed(0)} px`)
  console.log(`     skillnad ${skillnad.toFixed(0)} px = ${fickor.toFixed(2)} fickor (fickbredd ${resultat.binW})`)

  // Pinnarna sprider ±150 px per släpp. Med färre än 4 mynt per sida är medelvärdet
  // ren slump, och ett rött utfall skulle betyda ingenting — säg det rakt ut i stället
  // för att låta sonden ljuga åt endera hållet.
  if (N < 4) {
    console.log(`\n  ⚠ ${N} släpp per sida är för få för att döma styrkan (pinnarna sprider ±150 px). Kör med minst 6.`)
  } else {
    ok('fläkten flyttar myntet åt sitt håll', skillnad > 60, `${skillnad.toFixed(0)} px mellan högarna`)
  }
  ok('men blåser inte tvärs över brädet', Math.abs(fickor) < 2.5, `${fickor.toFixed(2)} fickor`)
  const alla = [...resultat[0], ...resultat[1]]
  ok('inget mynt hamnar utanför brädet', alla.every((x) => x > 20 && x < 1260), `spann ${Math.min(...alla).toFixed(0)}–${Math.max(...alla).toFixed(0)} px`)

  // Hjälp-släppet får INTE blåsas ur kurs — då vore spelets egen garanti en slump.
  const demo = await page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    g._balls.forEach((b) => (b.settled = true))
    g._demoTimer = null
    return { blaserFore: g._fanBlaser() }
  }, ID)
  ok('fläkten blåser mellan släppen', demo.blaserFore === true)

  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(600)
  ok('0 konsolfel', errors.length === 0, errors.slice(0, 2).join(' | '))
} finally {
  await browser.close()
}
console.log(fel === 0 ? '\n  ALLT GRÖNT\n' : `\n  ${fel} FEL\n`)
process.exit(fel ? 1 : 0)
