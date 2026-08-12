// Vaknar regnbågen? (docs/games/enhorningen-elvira.md §4 Juice — "Regnbågen vaknar")
//
// Signalen finns bara MEDAN Elvira är i luften och nära målet. `npm run test`
// fotograferar spelet i placeringsläget — den kan aldrig se den här punkten.
//
//   1. SOVER regnbågen medan Elvira står på startplatsen?
//   2. VÄXER svaret med närheten (och är det gradvis, inte en binär omslagning)?
//   3. SYNS skillnaden i bild, eller är den bara ett tal i minnet?
//   4. SOMNAR den igen efter landning (annars betyder signalen inget nästa skott)?
//   5. lämnar en exit mitt i inflygningen något igång?
//
//   node scripts/_regnbageprobe.mjs [--bild]     (kräver `npm run dev` på :5173)
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const BILD = process.argv.includes('--bild')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) kod = 1
}

const malade = (aBuf, bBuf) => {
  const a = PNG.sync.read(aBuf)
  const b = PNG.sync.read(bBuf)
  let n = 0
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])
    if (d > 8) n++
  }
  return n
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'enhorningen-elvira' }))
  await page.waitForFunction(() => !!window.__barnspel.game?._rainbow, null, { timeout: 15000 })
  await page.waitForTimeout(1200)

  const las = () => page.evaluate(() => {
    const g = window.__barnspel.game
    const rb = g._rainbow
    return {
      near: +(g._near ?? -1).toFixed(3),
      glod: +(rb._wglow?.alpha ?? -1).toFixed(3),
      fot: +(rb._wfeet?.[0]?.scale.x ?? -1).toFixed(3),
      state: g._state,
    }
  })

  // Ställ Elvira på ett givet avstånd från målet UTAN att spela ett riktigt skott:
  // ett skott hade landat där fysiken ville, och mätningen hade blivit en fråga om
  // vilken bana slumpen gav. Kroppen flyttas, tillståndet sätts till 'flying' och
  // spelets EGEN uppdatering får köra vidare därifrån.
  // Håll Elvira på ett givet avstånd från målet i N bildrutor och läs av på den sista.
  //
  // ⚠️ Den första versionen satte läget EN gång och väntade 700 ms. Då hann tyngdkraften
  // dra iväg henne och rundan landa av sig själv (`_onSettle`), så varje avstånd mätte
  // samma sak: noll. Ett förlopp som fortsätter under mätningen mäter sin egen loop, inte
  // variabeln — läget måste pinnas varje bildruta och framskridandet frysas.
  const stallPa = (d, rutor = 42) => page.evaluate(async ({ d, rutor }) => {
    const w = window.__barnspel
    const g = w.game
    // Kroppen FÖDS vid avskjutningen — finns ingen ännu måste ett riktigt skott gå av
    // först, annars mäter sonden ett läge spelet aldrig kan vara i.
    if (!g._elviraBody) g._launch(w.ctx)
    const b = g._elviraBody
    const gp = g._goalPos
    let fotMax = 0
    for (let i = 0; i < rutor; i++) {
      g._state = 'flying'
      g._flyT = 0.1 // < 0.4 → sättnings-räknaren startar aldrig
      g._settleT = 0
      b.position.x = gp.x - d
      b.position.y = gp.y
      // ⚠️ `positionPrev` MÅSTE följa med. matter härleder farten ur (position −
      // positionPrev), så ett hopp mellan två mätpunkter blir en fart på hoppets längd:
      // 300 px sköt in henne i målet, rundan vanns, nivån byggdes om och `_near`
      // nollställdes — vilket såg ut som att effekten slocknade nära målet.
      b.positionPrev.x = b.position.x
      b.positionPrev.y = b.position.y
      b.velocity.x = 0
      b.velocity.y = 0
      await new Promise((r) => requestAnimationFrame(r))
      // Fotmolnen PULSERAR — ett enda stickprov kan landa i pulsens dalgång.
      fotMax = Math.max(fotMax, g._rainbow?._wfeet?.[0]?.scale.x ?? 0)
    }
    const rb = g._rainbow
    return {
      near: +g._near.toFixed(3),
      glod: +rb._wglow.alpha.toFixed(3),
      fot: +fotMax.toFixed(3),
      state: g._state,
    }
  }, { d, rutor })

  // Bara regnbågen ska synas i bilddiffen. Elvira och hennes spår ligger i samma yta och
  // rör sig mellan bilderna — utan det här mäter man HENNE och tror att regnbågen tänts.
  const doljElvira = (av) => page.evaluate((av) => {
    const g = window.__barnspel.game
    g._elvira.visible = !av
    if (g._trailG) g._trailG.visible = !av
  }, av)

  console.log('\nRegnbågen vaknar i `enhorningen-elvira`\n')

  // ---------- 1: sover den i vila? ----------
  const vila = await las()
  ok('regnbågen sover i placeringsläget', vila.near < 0.02 && Math.abs(vila.glod - 0.22) < 0.01,
    `närhet ${vila.near}, glöd ${vila.glod}, läge ${vila.state}`)
  ok('fotmolnen står i viloskala', Math.abs(vila.fot - 1) < 0.01, `skala ${vila.fot}`)
  if (BILD) await page.screenshot({ path: '.test-shots/_regnbage-sover.png' })

  // ---------- 2: växer svaret med närheten? ----------
  const trappa = []
  for (const d of [400, 250, 200, 150, 100]) trappa.push({ d, ...(await stallPa(d)) })
  console.log('  avstånd → närhet/glöd: ' + trappa.map((r) => `${r.d}px ${r.near}/${r.glod}`).join(' · '))
  // NEAR_R är 250, och gränsen är `d >= NEAR_R` — att BÅDA 400 och 250 ger noll är
  // alltså rätt svar, inte en platå. Tillväxten mäts därför från första punkten INNANFÖR.
  ok('utanför 250 px sover den', trappa[0].near < 0.02 && trappa[1].near < 0.02,
    `400 px → ${trappa[0].near} · 250 px → ${trappa[1].near}`)
  ok('svaret växer hela vägen in därifrån', trappa.slice(2).every((r, i) => i === 0 || r.near > trappa[i + 1].near),
    trappa.slice(2).map((r) => r.near).join(' → '))
  ok('den är GRADVIS (mellanläget är varken sovande eller fullt)', trappa[2].near > 0.1 && trappa[2].near < 0.95,
    `200 px → ${trappa[2].near}`)
  ok('fotmolnen pulserar när hon är nära', trappa[4].fot > 1.02, `skala ${trappa[4].fot}`)

  // ---------- 3: syns skillnaden i bild? ----------
  // Samma yta, samma bildruta-takt, ENDA skillnaden är hur nära hon är. Elvira och
  // spåret döljs i båda bilderna (se doljElvira).
  const yta = await page.evaluate(() => {
    const g = window.__barnspel.game
    return { x: Math.round(g._goalPos.x) - 150, y: Math.round(g._goalPos.y) - 170, width: 300, height: 200 }
  })
  await doljElvira(true)
  await stallPa(400)
  const sover = await page.screenshot({ clip: yta })
  await stallPa(100)
  const nara = await page.screenshot({ clip: yta })
  await doljElvira(false)
  const px = malade(sover, nara)
  ok('vaknandet SYNS i bild', px > 1500, `${px} målade pixlar av ${yta.width * yta.height} i ytan`)
  if (BILD) {
    await stallPa(100, 8)
    await page.screenshot({ path: '.test-shots/_regnbage-vaken.png' })
  }

  // ---------- 4: somnar den igen? ----------
  const tand = await stallPa(110)
  await page.evaluate(() => { window.__barnspel.game._state = 'placing' })
  await page.waitForTimeout(900)
  const somn = await las()
  ok('regnbågen somnar när hon inte flyger', tand.near > 0.3 && somn.near < 0.05,
    `${tand.near} → ${somn.near}`)
  ok('glöden är tillbaka i vila', Math.abs(somn.glod - 0.22) < 0.02, `glöd ${somn.glod}`)

  // ---------- 5: exit mitt i inflygningen ----------
  await stallPa(120, 6)
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(900)
  const kvar = await page.evaluate(() => !!window.__barnspel.game)
  ok('exit mitt i inflygningen', !kvar && fel.length === 0,
    `spelmodul kvar: ${kvar ? 'JA' : 'nej'} · konsolfel: ${fel.length}`)
  if (fel.length) console.log(fel.slice(0, 5).map((f) => '   ! ' + f).join('\n'))
} catch (e) {
  console.error('SOND-FEL:', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
