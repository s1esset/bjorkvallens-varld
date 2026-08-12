// Känns klappen? (docs/games/klappa-mullvaden.md §4 Juice — "Stigande klapp-pling i rad
// + hål-mikroskak")
//
// Båda finns bara MEDAN barnet klappar: stegen hörs över flera klappar i följd, och
// skaket varar 0,24 s. `npm run test` fotograferar en äng i vila och hör ingenting —
// ett grönt test säger alltså noll om den här punkten.
//
//   1. STIGER plingen när klapparna kommer i rad — och håller den på översta steget?
//   2. BÖRJAR den om efter en paus (så en lugn spelare inte hamnar i taket för alltid)?
//   3. SKAKAR hålet vid klapp — och står det stilla igen efteråt (ingen vandring)?
//   4. lämnar ett skak mitt i en exit något efter sig?
//
//   node scripts/_klappprobe.mjs          (kräver `npm run dev` på :5173)
import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) kod = 1
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'klappa-mullvaden' }))
  await page.waitForFunction(() => window.__barnspel.game?._holes?.length > 0, null, { timeout: 15000 })
  await page.waitForTimeout(1200)

  // Lyssna på allt spelet tonar. Artens eget pip och stegens pling går båda genom
  // `tone`, så de måste gå att skilja åt: pipet glider (slideTo), plingen är en ren
  // klocka utan glid. Det är den enda skillnaden som finns i anropet — bra att veta
  // innan man tror att en serie frekvenser är stegen.
  await page.evaluate(() => {
    const a = window.__barnspel.ctx.services.audio
    if (!a.__origTone) a.__origTone = a.tone.bind(a)
    window.__toner = []
    a.tone = (o) => { window.__toner.push({ freq: Math.round(o.freq), glid: !!o.slideTo, vol: o.vol }); return a.__origTone(o) }
  })

  // Låt rundan aldrig ta slut under mätningen. Nivå 1 har mål 5, och klapp 6–8 blev
  // därför tysta no-ops (`_whack` returnerar direkt när `_roundDone`) — vilket såg ut
  // som att stegen slutade stiga. `_p` byggs om vid varje ny runda, så ändringen här
  // lever bara i den här rundan.
  const langRunda = () => page.evaluate(() => { window.__barnspel.game._p.goal = 99 })
  await langRunda()

  // En klapp: res ett djur ur ett hål, vänta tills det står uppe, klappa det.
  // (Att trycka med musen hade gjort mätningen till en fråga om VAR djuret råkade
  // dyka upp; här styr sonden vilket hål som används.)
  const klapp = async (i) => {
    await page.evaluate((i) => {
      const g = window.__barnspel.game
      const h = g._holes[i % g._holes.length]
      if (h._state !== 'down') return
      g._raise(h)
    }, i)
    await page.waitForTimeout(650)
    return page.evaluate((i) => {
      const w = window.__barnspel
      const g = w.game
      const h = g._holes[i % g._holes.length]
      if (h._state !== 'up') return null
      const fore = { x: h.x, y: h.y }
      g._whack(w.ctx, h)
      return { fore, radd: g._radd }
    }, i)
  }

  const nyaToner = async () => page.evaluate(() => {
    const t = window.__toner
    window.__toner = []
    return t
  })

  console.log('\nKlappens juice i `klappa-mullvaden`\n')

  // ---------- 1: stiger stegen? ----------
  await nyaToner()
  const stege = []
  for (let i = 0; i < 8; i++) {
    const r = await klapp(i)
    const toner = await nyaToner()
    const pling = toner.filter((t) => !t.glid) // stegen glider inte; artens pip gör det
    stege.push(pling.length ? pling[pling.length - 1].freq : 0)
  }
  console.log(`  klapp 1..8 -> pling: ${stege.map((f) => (f ? f + 'Hz' : '—')).join(' ')}`)
  ok('första klappen är ren (inget pling ovanpå artens läte)', stege[0] === 0)
  const trappa = stege.slice(1, 7)
  ok('stegen stiger klapp för klapp', trappa.every((f, i) => i === 0 || f > trappa[i - 1]),
    trappa.join(' < '))
  ok('stegen har ett TAK (blir inte gällare i all oändlighet)', stege[7] > 0 && stege[7] === stege[6],
    `klapp 7 = ${stege[6]}Hz, klapp 8 = ${stege[7]}Hz`)

  // ---------- 2: börjar den om efter en paus? ----------
  await page.waitForTimeout(2600) // > PLING_PAUS
  await nyaToner()
  await klapp(0)
  const efterPaus = (await nyaToner()).filter((t) => !t.glid)
  ok('en paus nollställer stegen (första klappen ren igen)', efterPaus.length === 0,
    efterPaus.map((t) => t.freq + 'Hz').join(' ') || 'inga pling')
  await klapp(1)
  const andra = (await nyaToner()).filter((t) => !t.glid)
  ok('nästa klapp börjar om på nedersta steget', andra.length > 0 && andra[0].freq === stege[1],
    `${andra[0]?.freq}Hz mot ${stege[1]}Hz`)

  // ---------- 3: skakar hålet, och står det stilla igen? ----------
  const skak = await page.evaluate(async () => {
    const w = window.__barnspel
    const g = w.game
    const h = g._holes.find((x) => x._state === 'down') || g._holes[0]
    const vila = { x: h.x, y: h.y }
    g._raise(h)
    await new Promise((r) => setTimeout(r, 650))
    if (h._state !== 'up') return null
    g._whack(w.ctx, h)
    // Största avvikelsen från viloläget under skaket.
    let max = 0
    for (let i = 0; i < 14; i++) {
      await new Promise((r) => requestAnimationFrame(r))
      max = Math.max(max, Math.hypot(h.x - vila.x, h.y - vila.y))
    }
    await new Promise((r) => setTimeout(r, 500))
    return { max: +max.toFixed(2), kvar: +Math.hypot(h.x - vila.x, h.y - vila.y).toFixed(3) }
  })
  ok('hålet skakar vid klapp', skak && skak.max > 0.8, skak ? `största utslag ${skak.max} px` : 'inget mätt')
  // Ett skak som inte landar exakt där det startade får hålet att VANDRA över en
  // spelomgång — feedback.js håller viloläget i `_fxRestPos` just därför.
  ok('hålet står stilla igen efteråt', skak && skak.kvar < 0.05, skak ? `${skak.kvar} px kvar` : '')

  // ---------- 4: exit mitt i ett skak ----------
  await page.evaluate(() => {
    const w = window.__barnspel
    const g = w.game
    const h = g._holes.find((x) => x._state === 'up')
    if (h) g._whack(w.ctx, h)
    w.nav.go('menu')
  })
  await page.waitForTimeout(900)
  const kvar = await page.evaluate(() => !!window.__barnspel.game)
  ok('exit mitt i ett skak', !kvar && fel.length === 0, `spelmodul kvar: ${kvar ? 'JA' : 'nej'} · konsolfel: ${fel.length}`)
  if (fel.length) console.log(fel.slice(0, 5).map((f) => '   ! ' + f).join('\n'))
} catch (e) {
  console.error('SOND-FEL:', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
