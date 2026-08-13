// Ägarrapport #11: går det att HÅLLA en vätskebärare över ansiktet och hälla?
//
// Förut fanns bara en väg till vätska — `_gorLos`, alltså när bäraren blev en lös kropp.
// Man kunde tappa, aldrig hälla med flit.
//
// Varje rad har en kontrollarm, för "det finns 40 partiklar" säger ingenting utan "och 0
// när jag håller den någon annanstans".
//
//   node scripts/_hallprobe.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

mkdirSync('.test-shots', { recursive: true })
const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'

let rader = 0
let grona = 0
const fel = []
const kolla = (n, ok, t) => { rader++; if (ok) grona++; console.log(`  ${ok ? '✓' : '✗'} ${n.padEnd(36)} ${t}`) }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()) })
page.on('pageerror', (e) => fel.push(String(e)))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'mata-munnen' }))
await page.waitForTimeout(2600)

const las = () => page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
  return {
    partiklar: g._vatskaV?.count ?? g._vatskaV?.antal ?? (g._vatskaV?.parts?.length ?? 0),
    varld: !!g._vatskaV,
    lut: Math.round((g._hallRec?.restRot ?? 0) * 100) / 100,
    mat: (g._mat || []).filter((r) => !r._uppaten).map((r) => ({ key: r.data.key, x: Math.round(r.view.x), y: Math.round(r.view.y) })),
  }
})

const koord = await page.evaluate(async () => {
  const { ANS, STATIONER, KANT_Y } = await import('/src/games/mata-munnen/kok.js')
  return {
    ANS,
    KANT_Y,
    st: STATIONER.filter((x) => (x.innehall || []).some((k) => ['mjolk', 'glas_saft', 'mugg'].includes(k)))
      .map((x) => ({ id: x.id, x: Math.round(x.yta.x + x.yta.w / 2), y: Math.round(x.yta.y + x.yta.h / 2) })),
  }
})

// Stationerna spawnar ett URVAL ur sitt innehåll, så en enda öppning behöver inte ge
// bäraren. Öppna och stäng tills den dyker upp (max 8 försök).
let s = await las()
let bararen = null
const arBarare = (m) => ['mjolk', 'glas_saft'].includes(m.key)
for (let i = 0; i < 8 && !bararen; i++) {
  bararen = s.mat.find(arBarare)
  if (bararen) break
  const st = koord.st[i % Math.max(1, koord.st.length)]
  if (!st) break
  await page.mouse.click(st.x, st.y)
  await page.waitForTimeout(700)
  s = await las()
  bararen = s.mat.find(arBarare)
  if (!bararen) { await page.mouse.click(st.x, st.y); await page.waitForTimeout(500); s = await las() }
}
if (!bararen) {
  console.log(`  ✗ hittade ingen vätskebärare efter 8 försök — på brädan: ${s.mat.map((m) => m.key).join(' ')}`)
  await browser.close()
  process.exit(1)
}
console.log(`  · bärare: ${bararen.key} på (${bararen.x}, ${bararen.y})`)

const grip = async (p) => { await page.mouse.move(p.x, p.y); await page.mouse.down() }
const till = async (p, steg = 10) => {
  const f = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
    const v = g._drag?.active?.view
    return v ? { x: v.x, y: v.y } : null
  })
  const fr = f || p
  for (let i = 1; i <= steg; i++) {
    await page.mouse.move(fr.x + (p.x - fr.x) * (i / steg), fr.y + (p.y - fr.y) * (i / steg))
    await page.waitForTimeout(18)
  }
}

// ---- KONTROLLARM: håll den långt från ansiktet och diskhon ------------------
await grip(bararen)
await till({ x: 900, y: 470 })
await page.waitForTimeout(1100)
const kontroll = await las()
kolla('KONTROLL: rinner inte utanför', (kontroll.partiklar || 0) === 0 && kontroll.lut === 0,
  `${kontroll.partiklar || 0} partiklar · lutning ${kontroll.lut}`)

// ---- MÄTARM: håll den över ansiktet ----------------------------------------
await till({ x: koord.ANS.x, y: 200 })
await page.waitForTimeout(1500)
const over = await las()
kolla('#11 bäraren TIPPAR över ansiktet', over.lut > 0.5, `lutning ${over.lut} rad (mål 0,85)`)
kolla('#11 det rinner över ansiktet', (over.partiklar || 0) > 20,
  `${over.partiklar} partiklar · kontrollarmen gav ${kontroll.partiklar || 0}`)
await page.screenshot({ path: '.test-shots/_hall.png' })

// Fortsätter det rinna, och håller taket?
await page.waitForTimeout(2200)
const mer = await las()
kolla('#11 strömmen fortsätter men har ett tak', mer.partiklar >= over.partiklar && mer.partiklar <= 140,
  `${over.partiklar} → ${mer.partiklar} (tak 140)`)

// ---- Släpp: rätas bäraren upp igen? ----------------------------------------
await page.mouse.up()
await page.waitForTimeout(700)
const slappt = await las()
kolla('#11 bäraren rätas upp när man släpper', slappt.lut === 0, `lutning ${slappt.lut}`)

// ---- Exit mitt i en hällning ------------------------------------------------
const b2 = (await las()).mat.find((m) => ['mjolk', 'glas_saft'].includes(m.key))
if (b2) { await grip(b2); await till({ x: koord.ANS.x, y: 200 }); await page.waitForTimeout(700) }
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(1400)
await page.mouse.up().catch(() => {})
kolla('exit mitt i hällningen är ren', fel.length === 0, fel.length ? fel.slice(0, 2).join(' | ') : '0 konsolfel')

await browser.close()
console.log(`\n  ${grona}/${rader} gröna · bild: .test-shots/_hall.png\n`)
process.exit(grona === rader ? 0 : 1)
