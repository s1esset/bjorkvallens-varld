// Syns farten i `gungan`? (docs/games/gungan.md §4 Juice)
//
// Två påståenden, båda omöjliga att se i en vanlig testskärmdump — den tas när gungan
// står nästan still, och då SKA ingetdera synas:
//
//   1. fartstrecken finns bara när det går fort (tröskel), och växer med farten
//   2. håret släpar efter ÅT MOTSATT HÅLL mot färdriktningen
//
// Mäts på två sätt, för de svarar på olika frågor: A ställer `_omega` för hand och
// läser MÅLADE PIXLAR (att en ritinstruktion finns bevisar inte att något syns), B
// pumpar gungan genom spelets EGEN väg och kontrollerar att farten över huvud taget
// når upp till tröskeln i verkligt spel — en effekt som bara kan visas av en sond
// finns inte för barnet.
//
//   node scripts/_gungprobe.mjs
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { writeFileSync } from 'node:fs'

const OMEGA_CAP = 3.2
const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'gungan' }))
  await page.waitForFunction(() => !!window.__barnspel.game, null, { timeout: 15000 })
  await page.waitForTimeout(1200)

  // Rutan täcker sitsens bana kring lodlinjen, ovanför marken.
  const RUTA = { x: 380, y: 260, width: 520, height: 300 }

  // Mät SKILLNAD mot samma ruta utan streck, inte absolut ljushet. Första versionen
  // räknade "pixlar ljusare än 236/240/240" och fick 0 vid varje fart: ett vitt streck
  // med alfa 0,5 mot den ljusblå himlen landar på ~223,242,250 — G och B klarade
  // tröskeln, R gjorde det aldrig. Tröskeln var alltså sondens fel, inte spelets.
  const bild = async () => PNG.sync.read(await page.screenshot({ clip: RUTA }))
  const skiljer = (a, b) => {
    let n = 0
    for (let i = 0; i < a.data.length; i += 4) {
      if (Math.abs(a.data[i] - b.data[i]) > 6 || Math.abs(a.data[i + 1] - b.data[i + 1]) > 6 ||
          Math.abs(a.data[i + 2] - b.data[i + 2]) > 6) n++
    }
    return n
  }

  // FRYS pendeln. `_update` integrerar vidare varje bildruta, så ett handsatt `_omega`
  // var överskrivet innan skärmdumpen togs — första körningen mätte därför gungan i
  // vila vid samtliga sex farter (hår-rotationen vid omega 0 kom ut som 0,053 och
  // avslöjade det). Tickern tas bort under arm A och sätts tillbaka efteråt.
  await page.evaluate(async () => {
    const b = window.__barnspel
    b.ctx.ticker.remove(b.game._tick)
    // Molnen driver och Lova andas via GSAP. Utan att pausa dem mätte sonden en
    // brusnivå på ~942 px i rutan vid noll fart — mer än hälften av den skillnad
    // strecken skulle bevisa.
    const { gsap } = await import('/node_modules/.vite/deps/gsap.js').catch(() => ({ gsap: null }))
    if (gsap) gsap.globalTimeline.pause()
    else window.__gsapPausePending = true
  })

  console.log('\nA. fartstreck mot `_omega` (ritfunktionen direkt, målade pixlar)\n')
  console.log('  omega    andel av taket   ljusa px   hår-rotation')
  console.log('  ' + '-'.repeat(52))
  const stall = async (o) => {
    await page.evaluate((o) => {
      const g = window.__barnspel.game
      g._theta = 0.28
      g._omega = o
      g._swing.rotation = g._theta
      g._drawSpeedLines()
      if (g._lovaBack) g._lovaBack.rotation = -Math.tanh(o / (3.2 * 0.5)) * 0.34
    }, o)
    await page.waitForTimeout(90)
  }
  // Strecken isoleras genom att dölja ALLT ANNAT i scenen och ta två bilder: en med
  // strecken och en utan. Då renderas ingenting som kan röra sig emellan, och
  // skillnaden ÄR strecken.
  //
  // Två enklare varianter mättes bort först: (1) att jämföra mot en baslinje vid noll
  // fart tog med hårets lutning, som ju också följer farten; (2) att bara växla
  // `_speedG.visible` lämnade molnen och GSAP-andningen kvar — brus på ~590 px, alltså
  // lika mycket som halva effekten. (Att pausa GSAP inifrån sidan gick inte: modulen
  // går inte att nå via en URL-import.)
  const strecketsPixlar = async () => {
    const satt = (v) => page.evaluate((v) => {
      const g = window.__barnspel.game
      for (const c of g._root.children) if (c !== g._speedG) c.visible = v
    }, v)
    await satt(false)
    const med = await bild()
    await page.evaluate(() => { window.__barnspel.game._speedG.visible = false })
    const utan = await bild()
    await page.evaluate(() => { window.__barnspel.game._speedG.visible = true })
    await satt(true)
    return skiljer(med, utan)
  }

  const rader = []
  for (const om of [0, 0.8, 1.1, 1.6, 2.4, 3.2]) {
    await stall(om)
    const px = await strecketsPixlar()
    const rot = await page.evaluate(() => window.__barnspel.game._lovaBack?.rotation ?? null)
    rader.push({ om, px, rot })
    console.log(
      '  ' + String(om.toFixed(1)).padStart(4) + String((om / OMEGA_CAP).toFixed(2)).padStart(15) +
      String(px).padStart(11) + String(rot === null ? '—' : rot.toFixed(3)).padStart(15)
    )
  }

  // Bevis för ögat: full fart, hela bilden.
  await stall(3.2)
  writeFileSync('.test-shots/_gungan-fart.png', await page.screenshot())
  console.log('\n  .test-shots/_gungan-fart.png (full fart)')

  const bas = 0
  const under = rader.filter((r) => r.om / OMEGA_CAP < 0.34)
  const over = rader.filter((r) => r.om / OMEGA_CAP >= 0.45)
  const tyst = under.every((r) => r.px <= 40)
  const syns = over.every((r) => r.px > 300)
  const vaxer = over.every((r, i) => i === 0 || r.px >= over[i - 1].px * 0.85)
  console.log(`\n  under tröskeln tyst: ${tyst ? 'ja' : 'NEJ'} · över tröskeln synligt: ${syns ? 'ja' : 'NEJ'} · växer med farten: ${vaxer ? 'ja' : 'NEJ'}`)
  if (!tyst || !syns) kod = 1

  // Håret ska luta ÅT MOTSATT HÅLL mot farten, och mätta av (inte slå runt).
  const rotTecken = rader.filter((r) => r.om > 0).every((r) => r.rot < 0)
  const rotTak = Math.max(...rader.map((r) => Math.abs(r.rot ?? 0)))
  console.log(`  hårets släp motsatt farten: ${rotTecken ? 'ja' : 'NEJ'} · största utslag ${rotTak.toFixed(3)} rad (${(rotTak * 57.3).toFixed(1)}°)`)
  if (!rotTecken || rotTak > 0.5) kod = 1

  // ...men en rotation är ett TAL. Håret ligger till största delen BAKOM huvudet — bara
  // tofsarna och en kant sticker ut — så frågan är om utslaget flyttar pixlar som
  // faktiskt syns. Mäts i den riktiga bilden: hur många av hårets synliga pixlar byter
  // plats när farten går från noll till tak.
  const HUVUD = { x: 555, y: 285, width: 130, height: 115 }
  const harBild = async () => PNG.sync.read(await page.screenshot({ clip: HUVUD }))
  const harSyns = async () => {
    const med = await harBild()
    await page.evaluate(() => { window.__barnspel.game._lovaBack.visible = false })
    const utan = await harBild()
    await page.evaluate(() => { window.__barnspel.game._lovaBack.visible = true })
    return { px: skiljer(med, utan), bild: med }
  }
  await stall(0)
  const harStilla = await harSyns()
  await stall(3.2)
  const harFart = await harSyns()
  const flyttade = skiljer(harStilla.bild, harFart.bild)
  console.log(`  hårets synliga pixlar: ${harStilla.px} i vila · ${harFart.px} i full fart · ${flyttade} px byter plats`)
  if (harFart.px < 200) { console.log('  ⚠ håret syns knappt alls — rotationen rör ett tal, inte en bild'); kod = 1 }
  if (flyttade < 150) { console.log('  ⚠ utslaget flyttar för få synliga pixlar för att läsas som fart'); kod = 1 }

  // ---------- B. når spelet dit i verkligt spel? ----------
  console.log('\nB. spelets egen väg: pumpa och mät toppfart\n')
  // Tickern kommer tillbaka med en färsk montering på nästa rad.
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(400)
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'gungan' }))
  await page.waitForFunction(() => !!window.__barnspel.game, null, { timeout: 15000 })
  await page.waitForTimeout(800)

  const topp = await page.evaluate(async () => {
    const g = window.__barnspel.game
    let max = 0
    let strecksrutor = 0
    const t0 = performance.now()
    while (performance.now() - t0 < 6000) {
      // Spelets EGEN energi-injektion (`_pump_`) — samma funktion som ett barns tryck
      // landar i, med samma fas- och styrkeregler. Att sätta `_omega` för hand här hade
      // mätt sonden, inte spelet.
      g._pump_(window.__barnspel.ctx, 1)
      await new Promise((r) => setTimeout(r, 120))
      max = Math.max(max, Math.abs(g._omega))
      if (g._speedG && !g._speedG.destroyed && g._speedG.context.instructions.length > 0) strecksrutor++
    }
    return { max, strecksrutor }
  })
  console.log(`  toppfart i spel: ${topp.max.toFixed(2)} av ${OMEGA_CAP} (${(100 * topp.max / OMEGA_CAP).toFixed(0)} % av taket)`)
  console.log(`  bildrutor med streck ritade: ${topp.strecksrutor}`)
  if (topp.max / OMEGA_CAP < 0.34) {
    console.log('  ⚠ spelet når ALDRIG upp till tröskeln — effekten finns bara för sonden')
    kod = 1
  }

  // ---------- exit ----------
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(700)
  const efter = await page.evaluate(() => ({
    game: !!window.__barnspel.game,
    fel: 0,
  }))
  console.log(`\n  efter exit: spelmodul kvar: ${efter.game ? 'JA (fel)' : 'nej'} · konsolfel: ${fel.length}`)
  if (efter.game || fel.length) { console.log(fel.slice(0, 5).map((f) => '   ! ' + f).join('\n')); kod = 1 }
} catch (e) {
  console.error('SOND-FEL:', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
