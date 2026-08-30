// unika-knytt: bilder ur FÖDELSEN — det enda stället där knyttets storlek och skuggor
// går att bedöma. Testharnessen når aldrig hit (dess nio tryck rör aldrig spaken), så
// ceremonins slutbild har ingen annan mätare än den här.
//
// Spelar ett helt varv med egna tryck och sparar tre rutor i `.test-shots/`:
//   knytt-fodelse.png   knyttet reser sig ur skalet (två skuggor? fel storlek?)
//   knytt-varld.png     världen står kvar, knyttet på väg mot bänken
//   knytt-bank.png      knyttet på bänken — ligger det en övergiven skugga kvar på gräset?
//
// Rapporterar också knyttets UPPMÄTTA höjd ur `getBounds()` mot vad `dna.storlek` lovar:
// riggen skalar själv med `storlek`, så en storleksfaktor i ceremonin räknar den två gånger.
//
//   node scripts/_knyttbild.mjs [--storlek 0|1|2|3]
import { chromium } from 'playwright'

const ID = 'unika-knytt'
const SPAK_X = 1160
const SPAK_Y = 350
const AGG_X = 640
const AGG_Y = 470
const T_STORLEK = { x: 300, y: 450 }

const arg = process.argv.slice(2)
const vill = arg.includes('--storlek') ? Number(arg[arg.indexOf('--storlek') + 1]) : 3

const browser = await chromium.launch({ channel: 'chrome', headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1600)

  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const s = Math.min(r.width / 1280, r.height / 720)
    return { x0: r.left + (r.width - 1280 * s) / 2, y0: r.top + (r.height - 720 * s) / 2, s }
  })
  const klick = (x, y) => page.mouse.click(geo.x0 + x * geo.s, geo.y0 + y * geo.s)
  const fas = () => page.evaluate(() => window.__barnspel.game?._fas || '?')

  // Ställ storleksbälgen på önskat steg (den stegar ett steg per tryck).
  for (let i = 0; i < vill; i++) { await klick(T_STORLEK.x, T_STORLEK.y); await page.waitForTimeout(220) }

  await klick(SPAK_X, SPAK_Y)
  for (let i = 0; i < 40 && (await fas()) === 'ceremoni'; i++) {
    await klick(200, 200)
    await page.waitForTimeout(140)
  }
  for (let i = 0; i < 12 && (await fas()) === 'klacka'; i++) {
    await klick(AGG_X, AGG_Y)
    await page.waitForTimeout(260)
  }

  // Födelsen: knyttet reser sig ur skalet strax efter kläckningen.
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '.test-shots/knytt-fodelse.png' })

  await page.waitForTimeout(1400)
  await page.screenshot({ path: '.test-shots/knytt-varld.png' })
  // Efter _tillBanken står knyttet på bänken och ceremonins hållare är tom.
  await page.waitForTimeout(2600)
  await page.screenshot({ path: '.test-shots/knytt-bank.png' })

  // Mät knyttets ritade höjd mot det `dna.storlek` lovar. `_knytt` sätts först i `_fardigt`
  // ('klar'), så mätningen måste ligga EFTER födelsen — inte vid den.
  const matt = await page.evaluate(() => {
    const g = window.__barnspel.game
    const v = g?._knytt?.view
    if (!v || v.destroyed) return null
    const b = v.getBounds()
    return { h: Math.round(b.height), b: Math.round(b.width), storlek: g?._dna?.storlek ?? null }
  })

  // --- ISOLERAD skalmätning -------------------------------------------------------
  // Höjden i en LEVANDE omgång går inte att jämföra mellan körningar: varje varv har ett
  // nytt frö, och öron/horn/vingar ändrar höjden mer än storleken gör. Bygg därför fyra
  // knytt ur SAMMA dna där bara `storlek` skiljer — då är storleken den enda variabeln.
  const skala = await page.evaluate(async () => {
    const kn = await import('/src/games/unika-knytt/knytt.js')
    const dn = await import('/src/games/unika-knytt/dna.js')
    const bas = dn.dnaFromSeed(1234567, { f: 2, z: 0, m: 1, v: 0, g: 1 })
    const ut = []
    for (const s of dn.STORLEKAR) {
      const k = kn.byggKnytt({ ...bas, storlek: s }, { r: 92 })
      const b = k.view.getBounds()
      ut.push({ s, h: Math.round(b.height) })
      kn.stadKnytt(k.view)
      k.destroy()
    }
    return ut
  })

  console.log('')
  console.log('  unika-knytt — födelsebilder')
  console.log('')
  if (matt) {
    console.log(`  levande varv:      dna.storlek ${matt.storlek} · ritad ${matt.h}×${matt.b} px`)
    console.log('  (höjden mellan körningar är INTE jämförbar — nytt frö = andra öron/horn)')
  } else {
    console.log('  ⚠ hittade inget knytt att mäta i det levande varvet')
  }
  console.log('')
  console.log('  isolerat (samma dna, bara storlek varierad, r = 92):')
  console.log('    storlek   höjd    höjd/storlek   höjd/storlek²')
  for (const r of skala) {
    console.log(`    ${r.s.toFixed(2)}      ${String(r.h).padStart(4)}    ${(r.h / r.s).toFixed(1).padStart(8)}   ${(r.h / (r.s * r.s)).toFixed(1).padStart(10)}`)
  }
  const kv = skala.map((r) => r.h / r.s)
  const spr = (Math.max(...kv) - Math.min(...kv)) / (kv.reduce((a, b) => a + b, 0) / kv.length)
  console.log('')
  console.log(`  höjd/storlek varierar ${(spr * 100).toFixed(1)} % — nära 0 betyder att storleken räknas EN gång`)
  console.log(`  spann största/minsta: ${(skala[3].h / skala[0].h).toFixed(2)}x  (kupans blobb lovar 1.62x)`)
  console.log('')
  console.log('  bilder: .test-shots/knytt-fodelse.png · knytt-varld.png · knytt-bank.png')
  if (errors.length) console.log(`  konsolfel: ${errors.length}\n   ${errors.slice(0, 4).join('\n   ')}`)
  else console.log('  konsolfel: inga')
  console.log('')
} finally {
  await browser.close()
}
