// Kul-svans + rull-damm (docs/games/kulbana.md §4 Juice)
//
// Båda finns bara MEDAN kulan far. `npm run test` fotograferar banan i vila, före
// släppet — den kan inte se någondera.
//
//   1. SYNS svansen när kulan far (målade pixlar, inte "finns en Graphics")?
//   2. Är den BORTA när kulan står still (annars är den en del av kulan, inte fart)?
//   3. VÄXER den med farten?
//   4. RYKER det där kulan slår i — och tyst vid en nätt beröring?
//   5. städas svansen när kulan går tillbaka, och överlever inget en exit?
//
//   node scripts/_svansprobe.mjs [--bild]     (kräver `npm run dev` på :5173)
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const BILD = process.argv.includes('--bild')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) kod = 1
}

// Två mått ur samma jämförelse, och de svarar på OLIKA frågor:
//   px      hur STOR yta som ändrades  → "syns den?"
//   energi  hur MYCKET den ändrades     → "är den starkare?"
// Att bara räkna pixlar över en tröskel gör en knappt synlig strimma och en kraftig
// nästan lika stora, eftersom båda täcker samma bana. Styrkan ligger i alfan.
const jamfor = (aBuf, bBuf) => {
  const a = PNG.sync.read(aBuf)
  const b = PNG.sync.read(bBuf)
  let px = 0
  let energi = 0
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])
    if (d > 8) px++
    energi += d
  }
  return { px, energi }
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'kulbana' }))
  await page.waitForFunction(() => !!window.__barnspel.game?._ballBody, null, { timeout: 15000 })
  await page.waitForTimeout(1200)

  console.log('\nFartsvans + rull-damm i `kulbana`\n')

  // Håll kulan i fritt fall med en GIVEN fart i N bildrutor och läs av på den sista.
  // ⚠️ Läget pinnas per bildruta och `positionPrev` med — matter härleder farten ur
  // skillnaden mellan dem, så ett hopp blir annars en fart på hoppets längd.
  // Kör kulan i jämn fart en stund och FRYS den sedan med farten kvar: svansens punkter
  // ligger still, men `_updateTail` räknar fortfarande styrkan ur hastigheten. Då kan
  // bilden tas två gånger med allt annat identiskt.
  const far = (v, rutor = 30) => page.evaluate(async ({ v, rutor }) => {
    const w = window.__barnspel
    const g = w.game
    const b = g._ballBody
    g._falling = true
    g._resolving = false
    g._gliding = false
    g._tail.length = 0
    const x = 300
    let y = 200
    for (let i = 0; i < rutor; i++) {
      y = Math.min(560, y + v)
      b.position.x = x
      b.position.y = y
      b.positionPrev.x = x
      b.positionPrev.y = y - v
      b.velocity.x = 0
      b.velocity.y = v
      g._restT = 0
      await new Promise((r) => requestAnimationFrame(r))
    }
    // Frysning: läget står stilla, farten ligger kvar. Håll den vid liv i en egen
    // slinga så inte fysiken tar över mellan skärmdumparna.
    g.__frys = setInterval(() => {
      b.position.x = x
      b.position.y = y
      b.positionPrev.x = x
      b.positionPrev.y = y - v
      b.velocity.x = 0
      b.velocity.y = v
      g._falling = true
      g._restT = 0
    }, 8)
    return { punkter: g._tail.length, fart: v, y }
  }, { v, rutor })

  // Isolera svansen: DÖLJ hela scenen utom svanslagret, ta bilden, dölj svansen också,
  // ta bilden igen. Skillnaden kan då bara vara svansen.
  //
  // ⚠️ Två svagare varianter mättes först och BÅDA ljög:
  //   · jämför mot en referensbild → man mäter KULAN, som står på olika plats i varje
  //     arm och dränker svansen (1 523k mot 1 715k i energi, alltså ingen skillnad alls);
  //   · växla bara svansens `visible` → bilderna tas 60 ms isär och allt annat i scenen
  //     hinner röra sig (1 132 px "från svanslagret" när bufferten var bevisat tom).
  const isolera = async () => {
    await page.evaluate(() => {
      const w = window.__barnspel
      const g = w.game
      g.__sparad = g._root.children.map((c) => c.visible)
      g.__sparadFx = w.ctx.fxLayer.visible
      for (const c of g._root.children) c.visible = c === g._tailG
      w.ctx.fxLayer.visible = false
      g._tailG.visible = true
    })
    await page.waitForTimeout(70)
    const med = await page.screenshot({ clip: yta })
    await page.evaluate(() => { window.__barnspel.game._tailG.visible = false })
    await page.waitForTimeout(70)
    const utan = await page.screenshot({ clip: yta })
    await page.evaluate(() => {
      const w = window.__barnspel
      const g = w.game
      g._root.children.forEach((c, i) => { c.visible = g.__sparad[i] })
      w.ctx.fxLayer.visible = g.__sparadFx
      g._tailG.visible = true
    })
    return jamfor(med, utan)
  }
  const slappFrys = () => page.evaluate(() => {
    const g = window.__barnspel.game
    if (g.__frys) { clearInterval(g.__frys); g.__frys = null }
  })

  // Ytan svansen kan ligga i (kulan går 200→560 på x≈300).
  const yta = { x: 210, y: 170, width: 180, height: 420 }

  // ---------- 2 (först): står kulan still ska ytan vara ren ----------
  await page.evaluate(() => {
    const w = window.__barnspel
    const g = w.game
    g._falling = false
    g._tail.length = 0
    g._tailG.clear()
    g._ballBody.position.x = 300
    g._ballBody.position.y = 200
    g._ballBody.positionPrev.x = 300
    g._ballBody.positionPrev.y = 200
    g._ballBody.velocity.x = 0
    g._ballBody.velocity.y = 0
  })
  await page.waitForTimeout(300)
  const stilla = await page.screenshot({ clip: yta })
  const stillaPunkter = await page.evaluate(() => window.__barnspel.game._tail.length)
  ok('ingen svans när kulan står still', stillaPunkter === 0, `${stillaPunkter} punkter i bufferten`)

  // ---------- 1 + 3: syns den, och växer den med farten? ----------
  await far(4)
  const dLangsam = await isolera()
  await slappFrys()
  const snabb = await far(10)
  const dSnabb = await isolera()
  if (BILD) await page.screenshot({ path: '.test-shots/_kulsvans.png' })
  await slappFrys()

  ok('svansen SYNS när kulan far', dSnabb.px > 900, `${dSnabb.px} målade pixlar av ${yta.width * yta.height} i ytan`)
  // Bandet täcker ungefär samma bana i båda armarna — det är STYRKAN som skiljer, och
  // den syns bara i energin. Pixelantalet växer knappt (6 643 → 7 596) och sa därför
  // nästan ingenting om skillnaden mellan en kula som rullar och en som far.
  ok('den växer med farten', dSnabb.energi > dLangsam.energi * 1.5,
    `energi fart 4 → ${Math.round(dLangsam.energi / 1000)}k · fart 10 → ${Math.round(dSnabb.energi / 1000)}k ` +
    `(målade pixlar ${dLangsam.px} → ${dSnabb.px})`)
  ok('bufferten fylls medan den far', snabb.punkter >= 5, `${snabb.punkter} punkter`)

  // ---------- 5a: städas svansen när kulan slutar fara? ----------
  // ⚠️ Kulan MÅSTE tillbaka till referensbildens läge först. Utan det innehåller
  // "ren igen"-jämförelsen kulan på två olika platser (6 006 px) och läser som att
  // svansen ligger kvar — fast bufferten redan är tom.
  // ⚠️ Scenen måste FRYSAS även här. `isolera()` tar sina två bilder 60 ms isär, och en
  // kula i fritt fall hinner flytta sig mellan dem — 183 px som såg ut att komma från
  // svanslagret var kulan själv.
  const efter = await page.evaluate(async () => {
    const w = window.__barnspel
    const g = w.game
    const b = g._ballBody
    const pinna = () => {
      g._falling = false
      b.position.x = 300
      b.position.y = 200
      b.positionPrev.x = 300
      b.positionPrev.y = 200
      b.velocity.x = 0
      b.velocity.y = 0
    }
    for (let i = 0; i < 4; i++) {
      pinna()
      await new Promise((r) => requestAnimationFrame(r))
    }
    g.__frys = setInterval(pinna, 8)
    return g._tail.length
  })
  await page.waitForTimeout(120)
  // Samma isolering som ovan: ritar lagret fortfarande något? Att jämföra mot den
  // stillastående referensbilden gav 209 px kvar — men det var kulans EGEN rotation
  // (highlighten snurrar med kroppen), inte svansen. Med lagret växlat är svaret rent.
  const rest = await isolera()
  await slappFrys()
  ok('svansen städas när kulan inte far längre', efter === 0, `${efter} punkter kvar`)
  ok('och lagret ritar ingenting kvar', rest.px === 0, `${rest.px} px från svanslagret`)

  // ---------- 4: ryker det där kulan slår i? ----------
  // Dammet föds via `puff()` → partikelfältet. Mät fältets innehåll före/efter ett
  // anslag med kraft, och jämför mot en NÄTT beröring som ska vara dammfri.
  const damm = await page.evaluate(async () => {
    const w = window.__barnspel
    const g = w.game
    const partiklar = () => {
      let n = 0
      const gaIgenom = (o) => {
        if (Array.isArray(o.particleChildren)) n += o.particleChildren.length
        for (const c of o.children || []) gaIgenom(c)
      }
      gaIgenom(w.ctx.fxLayer)
      return n
    }
    const ramp = g._parts?.find((p) => p && p._body && p._body.label === 'ramp')
    const slag = async (v) => {
      g._lastBounceAt = -99
      g._lastWoodAt = -99
      const b = g._ballBody
      b.velocity.x = 0
      b.velocity.y = v
      const fore = partiklar()
      // Spelets EGEN kollisionsväg — inte en genväg förbi den.
      g._onCollision(w.ctx, { pairs: [{ bodyA: b, bodyB: ramp ? ramp._body : { label: 'ramp' }, collision: { supports: [{ x: b.position.x, y: b.position.y + 26 }] } }] })
      let topp = 0
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => requestAnimationFrame(r))
        topp = Math.max(topp, partiklar() - fore)
      }
      return topp
    }
    const hart = await slag(12)
    await new Promise((r) => setTimeout(r, 700))
    const natt = await slag(2.6)
    return { hart, natt, hittadeRamp: !!ramp }
  })
  ok('ett hårt anslag ryker', damm.hart > 0, `${damm.hart} nya partiklar`)
  ok('en nätt beröring ryker INTE', damm.natt === 0, `${damm.natt} partiklar vid fart 2,6`)

  // ---------- 5b: exit mitt i ett fall ----------
  await far(9, 6)
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(900)
  const kvar = await page.evaluate(() => !!window.__barnspel.game)
  ok('exit mitt i ett fall', !kvar && fel.length === 0,
    `spelmodul kvar: ${kvar ? 'JA' : 'nej'} · konsolfel: ${fel.length}`)
  if (fel.length) console.log(fel.slice(0, 5).map((f) => '   ! ' + f).join('\n'))
} catch (e) {
  console.error('SOND-FEL:', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
