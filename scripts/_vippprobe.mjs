// Känns brädan? (docs/games/vippbradan.md §4 Juice — "Brädan känns")
//
// Punkten lovar tre saker när vikten slår i plankan: en dammpuff, ett anslagsljud
// som SKALAR med vikten, och att plankan studsar en aning extra när vikten är stor.
// Inget av det syns i `npm run test`: anslaget varar ~0,3 s och skärmdumpen tas i
// vila. Sonden mäter därför per viktklass (fjäder · äpple · städ):
//
//   1. plankans utslag — toppvinkel, studs (riktningsbyten) och om `_tame` klampar
//   2. dammet vid anslaget — målade pixlar i fxLayer (spelets rot dold)
//   3. anslagsljudet — vilka toner/klipp som faktiskt spelas, och om de skiljer sig
//   4. kalibreringen — landar grodan fortfarande i korgen? (bågen får INTE flytta sig)
//   5. exit mitt i ett anslag lämnar ingenting
//
//   node scripts/_vippprobe.mjs            (kräver `npm run dev` på :5173)
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { writeFileSync } from 'node:fs'

const VIKTER = [
  { idx: 0, namn: 'fjäder (Lätt) ' },
  { idx: 1, namn: 'äpple (Mellan)' },
  { idx: 2, namn: 'städ (Tung)   ' },
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  // Färsk bana: ut till menyn och in igen. Navigeringen kan komma medan spelet firar,
  // så den får ett par försök i stället för att fälla hela sonden på en timing.
  const oppna = async () => {
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.__barnspel.nav.go('menu'))
      await page.waitForTimeout(500)
      if (await page.evaluate(() => !window.__barnspel.game)) break
    }
    await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'vippbradan' }))
    await page.waitForFunction(() => !!window.__barnspel.game?._plankBody, null, { timeout: 15000 })
    await page.waitForTimeout(900)
  }
  await oppna()

  // Provtagare i sidan: plankans vinkel varje bildruta + allt spelet försöker låta.
  const rigga = () => page.evaluate(() => {
    const w = window.__barnspel
    if (window.__prov?.stop) window.__prov.stop()
    const a = w.ctx.services.audio
    if (!a.__orig) a.__orig = { tone: a.tone.bind(a), sfx: a.sfx.bind(a), sample: a.sample.bind(a) }
    const prov = { vinklar: [], fart: [], toner: [], klipp: [], klamp: 0, vinkeltak: 0, t0: performance.now() }
    a.tone = (o) => { prov.toner.push({ freq: Math.round(o.freq || 0), vol: +(o.vol || 0).toFixed(3), t: Math.round(performance.now() - prov.t0) }); return a.__orig.tone(o) }
    a.sfx = (n, o) => { prov.klipp.push({ n, t: Math.round(performance.now() - prov.t0) }); return a.__orig.sfx(n, o) }
    let id = 0
    const steg = () => {
      const g = w.game
      const b = g?._plankBody
      // Bara FÖNSTRET kring anslaget (1,5 s). Längre serier drar in nivå-återställ-
      // ningen efter landningen, och då mäter "lugnar den sig" spelets reset i stället
      // för plankans egen rörelse.
      if (b && performance.now() - prov.t0 < 1500) {
        prov.vinklar.push(+b.angle.toFixed(5))
        prov.fart.push(+b.angularVelocity.toFixed(5))
        // `_tame` klampar vinkelfarten vid 0,12 och vinkeln vid 0,5 rad — nådde vi taket?
        if (Math.abs(b.angularVelocity) >= 0.1199) prov.klamp++
        if (Math.abs(b.angle) >= 0.4999) prov.vinkeltak++
      }
      id = requestAnimationFrame(steg)
    }
    id = requestAnimationFrame(steg)
    prov.stop = () => { cancelAnimationFrame(id); a.tone = a.__orig.tone; a.sfx = a.__orig.sfx }
    window.__prov = prov
  })

  const bild = async () => PNG.sync.read(await page.screenshot())
  const skiljer = (a, b) => {
    let n = 0
    for (let i = 0; i < a.data.length; i += 4) {
      if (Math.abs(a.data[i] - b.data[i]) > 6 || Math.abs(a.data[i + 1] - b.data[i + 1]) > 6 ||
          Math.abs(a.data[i + 2] - b.data[i + 2]) > 6) n++
    }
    return n
  }

  // Damm mäts med spelets rot DOLD: då är fxLayer det enda som kan måla, och
  // skillnaden mot samma bild utan fxLayer ÄR partiklarnas pixlar. (Att bara växla
  // fxLayer med scenen synlig hade tagit med molnens drift — samma fälla som
  // _gungprobe gick i.)
  const fxPixlar = async (spara = null) => {
    await page.evaluate(() => { window.__barnspel.game._root.visible = false })
    const rutan = await page.screenshot()
    if (spara) writeFileSync(spara, rutan)
    const med = PNG.sync.read(rutan)
    await page.evaluate(() => { window.__barnspel.ctx.fxLayer.visible = false })
    const utan = await bild()
    await page.evaluate(() => {
      window.__barnspel.ctx.fxLayer.visible = true
      window.__barnspel.game._root.visible = true
    })
    return skiljer(med, utan)
  }

  // Ett släpp: nollställ spelet, släpp vald vikt mitt på skenan, mät.
  const slapp = async (idx) => {
    await page.evaluate((i) => {
      const g = window.__barnspel.game
      g._misses = 0
      g._assistNext = false
      g._sizeIdx = i
      // Håll kvar grodan. Utskjutningen sker 0,16 s efter anslaget och lägger sparkle
      // + "Wheee!" i SAMMA fxLayer som dammet — mätt blev alla tre vikterna då lika
      // stora (791/771/755 px), för det var utskjutningens text som vägde, inte dammet.
      //
      // ⚠ Spelmodulen är ETT objekt som återanvänds vid varje montering. En patch här
      // överlever alltså `nav.go` och följde med in i kalibreringsrundan, som då
      // rapporterade "bågen har flyttat sig" — sonden hade själv stängt av skottet.
      if (!g.__origLaunch) g.__origLaunch = g._launchFrog
      g._launchFrog = () => {}
    }, idx)
    await rigga()
    await page.evaluate(() => {
      const w = window.__barnspel
      w.game._dropWeight(w.ctx, (700 + 855) / 2) // mitt på skenan
    })
    // Fånga dammet MEDAN det lever — men vänta in det verkliga anslaget i stället för
    // att gissa en tid. Fjädern bromsas av luften (frictionAir 0.05) och landar långt
    // efter städet; en fast paus på 260 ms fotograferade luften ovanför plankan och
    // rapporterade "0 px damm" för en effekt som sedan visade sig fungera.
    await page.waitForFunction(() => window.__prov?.toner.length > 0, null, { timeout: 4000 }).catch(() => {})
    // ...men inte i FÖDELSEÖGONBLICKET. Partiklarna startar i samma punkt, så en bild
    // tagen direkt vid anslaget visar en enda klump (verifierat i _vipp-damm-2.png:
    // ETT grått klot) — 3 och 10 partiklar mätte då lika mycket. 250 ms in har de
    // spridit sig och mängden går att se. Livslängden är 0,65 s, så de lever än.
    await page.waitForTimeout(250)
    const damm = await fxPixlar(`.test-shots/_vipp-damm-${idx}.png`)
    await page.waitForTimeout(2600) // låt grodan flyga färdigt
    const ut = await page.evaluate(() => {
      const p = window.__prov
      p.stop()
      const g = window.__barnspel.game
      return {
        vinklar: p.vinklar, fart: p.fart, toner: p.toner, klipp: p.klipp,
        klamp: p.klamp, vinkeltak: p.vinkeltak, niva: g?._level ?? -1,
      }
    })
    return { ...ut, damm }
  }

  // Plankans rörelse i tal: toppvinkel, hur mycket den fjädrar tillbaka (studs) och
  // om den lugnar sig inom fönstret.
  const analys = (v, f) => {
    let topp = 0
    for (const a of v) if (Math.abs(a) > Math.abs(topp)) topp = a
    const iTopp = v.indexOf(topp)
    const toppfart = f.length ? Math.max(...f.map(Math.abs)) : 0
    // Studs = hur långt tillbaka plankan fjädrar EFTER toppen (och sedan igen).
    let retur = 0
    let vand = 0
    let riktning = 0
    for (let i = iTopp + 1; i < v.length; i++) {
      retur = Math.max(retur, Math.abs(topp) - Math.abs(v[i]))
      const d = Math.abs(v[i]) - Math.abs(v[i - 1])
      const r = d > 1e-4 ? 1 : d < -1e-4 ? -1 : 0
      if (r && riktning && r !== riktning) vand++
      if (r) riktning = r
    }
    const svans = v.slice(-15)
    const oro = svans.length ? Math.max(...svans) - Math.min(...svans) : 0
    return { topp, iTopp, toppfart, retur, vand, oro }
  }

  console.log('\nAnslaget i `vippbradan` — vikt mot planka  (fönster 1,5 s)\n')
  console.log('  vikt             toppvinkel  studs   vänd  vid taket  damm(px)  toner')
  const rader = []
  for (const v of VIKTER) {
    const r = await slapp(v.idx)
    const a = analys(r.vinklar, r.fart)
    rader.push({ v, r, a })
    // Bara ANSLAGETS ton. Senare toner i fönstret är grodans landning och vikten som
    // slår i golvet — de lät likadant för alla tre vikter och dolde skillnaden helt
    // när jämförelsen tog max över hela serien (0,26 för både fjäder och städ).
    r.anslag = r.toner.filter((t) => t.t <= 700)
    const toner = r.anslag.length ? r.anslag.map((t) => `${t.freq}Hz/${t.vol}@${t.t}ms`).join(' ') : '—'
    console.log(
      `  ${v.namn}   ${(a.topp * 57.3).toFixed(2).padStart(6)}°  ${(a.retur * 57.3).toFixed(2).padStart(5)}°` +
      `  ${String(a.vand).padStart(4)}  ${String(r.vinkeltak).padStart(6)} br  ${String(r.damm).padStart(7)}  ${toner}`
    )
    console.log(`                    klipp: ${r.klipp.map((k) => k.n).join(' ') || '—'}`)
    await oppna() // färsk bana till nästa släpp
  }

  // ---- Kraven ----
  const [latt, mellan, tung] = rader
  const stigande = Math.abs(latt.a.topp) < Math.abs(mellan.a.topp) && Math.abs(mellan.a.topp) < Math.abs(tung.a.topp)
  console.log(`\n  plankan svarar på VILKEN vikt: ${stigande ? 'ja' : 'NEJ — samma utslag oavsett vikt'}`)
  if (!stigande) kod = 1

  // Ett utslag som ligger på `_tame`s tak är inte plankans svar — det är klampen.
  const taket = rader.filter((x) => x.r.vinkeltak > 0)
  console.log(`  utslag som klipps av taket (0,5 rad): ${taket.length ? taket.map((x) => x.v.namn.trim()).join(', ') : 'inga'}`)
  if (taket.length) kod = 1

  // Dammet ska SYNAS för alla tre och växa med vikten (en tröskel som fjädern aldrig
  // passerar är inte dosering — då är effekten bara borta för en av tre vikter).
  // Dammet ska synas för alla tre OCH växa med vikten. (Kravet gick att ställa först
  // när bilden togs 250 ms in — vid anslaget låg partiklarna i en klump och 3 mot 10
  // partiklar mätte lika mycket.)
  const dammOk = rader.every((x) => x.r.damm > 150) && latt.r.damm < mellan.r.damm && mellan.r.damm < tung.r.damm
  console.log(`  damm vid anslaget: ${rader.map((x) => x.r.damm).join(' / ')} px ${dammOk ? '(växer med vikten)' : '⚠ saknas eller ur ordning'}`)
  if (!dammOk) kod = 1

  // Anslagen ska vara HÖRBART OLIKA. Kravet är inte "tyngre = starkare": städet är
  // stort (r 52) och möter plankan efter ett kortare fall än äpplet, så det slår i
  // LÅNGSAMMARE och därmed svagare (styrka 0,20 mot 0,28 — uppmätt). Dess tyngd bärs
  // av rösten (metall 705 Hz, dubbelt så lång ton) och av hur djupt plankan går.
  const rost = rader.map((x) => (x.r.anslag[0]?.freq ?? 0))
  const olika = new Set(rost.map((f) => Math.round(f / 50))).size >= 2 && rost.every((f) => f > 0)
  const metall = rost[2] > 500 && rost[0] < 400 && rost[1] < 400
  console.log(`  anslagen låter olika: ${olika ? 'ja' : 'NEJ'} (${rost.join(' / ')} Hz) · bara städet klingar i metall: ${metall ? 'ja' : 'NEJ'}`)
  if (!olika || !metall) kod = 1

  const studsar = tung.a.retur > latt.a.retur && tung.a.vand >= 1
  console.log(`  tung vikt studsar plankan extra: ${studsar ? 'ja' : 'NEJ'} (retur ${rader.map((x) => (x.a.retur * 57.3).toFixed(1)).join(' / ')}° · vändningar ${rader.map((x) => x.a.vand).join(' / ')})`)
  if (!studsar) kod = 1

  // Studsen får inte bli en svängning som fortsätter. Mäts som utslaget i fönstrets
  // SLUT (~1,5 s efter släppet): brädan ska då röra sig i småsteg, inte slå fram och
  // tillbaka. (Ett hårdare krav vore fel — vid 1,5 s har grodan ofta landat och vikten
  // lyfts bort, så plankan är på väg tillbaka mot vågrätt av helt rätt skäl.)
  const lugn = rader.every((x) => x.a.oro < 0.09)
  console.log(`  plankan lugnar sig igen: ${lugn ? 'ja' : 'NEJ'} (utslag i slutet ${rader.map((x) => (x.a.oro * 57.3).toFixed(2)).join(' / ')}°)`)
  if (!lugn) kod = 1

  // ---- Kalibreringen: landar mitten-valet fortfarande i korgen? ----
  await oppna()
  await page.evaluate(() => {
    const g = window.__barnspel.game
    if (g.__origLaunch) { g._launchFrog = g.__origLaunch; delete g.__origLaunch } // ge tillbaka skottet
    g._misses = 0; g._assistNext = false; g._sizeIdx = 1
    window.__landat = 0
    const orig = g._land.bind(g)
    g._land = (c) => { window.__landat++; return orig(c) }
    window.__barnspel.game._dropWeight(window.__barnspel.ctx, (700 + 855) / 2)
  })
  await page.waitForTimeout(5200)
  const landat = await page.evaluate(() => window.__landat)
  console.log(`\n  kalibrering (äpple, mitt på skenan): ${landat ? 'landade i korgen' : 'MISSADE — bågen har flyttat sig'}`)
  if (!landat) kod = 1
  writeFileSync('.test-shots/_vipp-anslag.png', await page.screenshot())

  // ---- Exit mitt i anslaget ----
  await oppna()
  await page.evaluate(() => {
    const w = window.__barnspel
    w.game._sizeIdx = 2
    w.game._dropWeight(w.ctx, 855)
  })
  await page.waitForTimeout(220)
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(800)
  const kvar = await page.evaluate(() => !!window.__barnspel.game)
  console.log(`\n  exit mitt i anslaget: spelmodul kvar: ${kvar ? 'JA (fel)' : 'nej'} · konsolfel: ${fel.length}`)
  if (kvar || fel.length) { console.log(fel.slice(0, 5).map((f) => '   ! ' + f).join('\n')); kod = 1 }
} catch (e) {
  console.error('SOND-FEL:', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
