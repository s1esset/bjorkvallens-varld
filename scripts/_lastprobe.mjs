// Mäter grävmaskinens BALANS genom att faktiskt spela den: sond som gräver med
// riktiga musdrag i högen, kör den fyllda skopan över flaket och släpper — cykel
// efter cykel — och rapporterar hur många lass en nivå kräver, hur mycket ett
// grävtag ger, och om lasten VISUELLT når fyllnadslinjen när nivån klaras.
//
// Gröna harness-tester svarar bara "0 konsolfel". De säger ingenting om en nivå tar
// 2 eller 12 lass, eller om den gula linjen ljuger.
//
//   node scripts/_lastprobe.mjs [antal-nivåer] [--shot ut.png]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const levels = Number(args[0] || 3)
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : d
}
const shot = opt('--shot', '.test-shots/_lastprobe.png')

const ID = 'gravmaskinen'
const state = (page) =>
  page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('gravmaskinen')
    const f = g._countFill()
    return {
      level: g._level,
      cargo: g._cargo?.id,
      target: g._target,
      total: f.total,
      aboveLine: f.aboveLine,
      lineCells: g._lineCells,
      fillY: g._fillY,
      bucket: Math.round(g._bucketCount),
      resolving: g._resolving,
      leftX: g._cfg.leftX,
      rightX: g._cfg.rightX,
    }
  })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1400)

  // Skopan stannar där den släpptes — precis som för ett barn måste sonden greppa
  // den DÄR den står, inte där den en gång startade.
  const bucketPos = () =>
    page.evaluate(async () => {
      const g = (await import('/src/games/registry.js')).getGame('gravmaskinen')
      return { x: Math.round(g._bucket.x), y: Math.round(g._bucket.y) }
    })

  // Ett grävtag: greppa skopan, ner i högen, svep genom materialet. Sedan över flaket
  // och släpp.
  const cykel = async (bedX) => {
    const p0 = await bucketPos()
    await page.mouse.move(p0.x, p0.y)
    await page.mouse.down()
    // ner i högen och svep djupt (samma rörelse ett barn gör med fingret)
    const path = [
      [250, 500],
      [190, 530],
      [240, 545],
      [300, 535],
      [340, 515],
    ]
    for (const [x, y] of path) {
      await page.mouse.move(x, y)
      await page.waitForTimeout(45)
    }
    const efterGrav = await state(page)
    // lyft och för över till flaket, släpp lugnt (tät stråle)
    for (const [x, y] of [
      [420, 380],
      [600, 300],
      [bedX, 280],
      [bedX, 275],
    ]) {
      await page.mouse.move(x, y)
      await page.waitForTimeout(40)
    }
    await page.mouse.up()
    await page.waitForTimeout(900)
    return efterGrav.bucket
  }

  const rader = []
  let s = await state(page)
  console.log(`start: nivå ${s.level} · last ${s.cargo} · mål ${s.target} · linje y=${s.fillY}`)

  for (let lvl = 0; lvl < levels; lvl++) {
    const startNiva = s.level
    const cargo = s.cargo
    const target = s.target
    let lass = 0
    let taget = 0
    const bedMitt = Math.round((s.leftX + s.rightX) / 2)
    while (s.level === startNiva && lass < 20) {
      const b = await cykel(bedMitt + ((lass % 3) - 1) * 40)
      taget += b
      lass++
      s = await state(page)
      if (s.resolving) {
        // nivån klarades — fånga bilden INNAN dumpern kör iväg. En bild per LAST:
        // kornform, palett och rasvinkel syns bara här, aldrig i ett grönt test.
        await page.screenshot({ path: shot.replace(/\.png$/, `-${cargo}.png`) })
        if (lvl === 0) await page.screenshot({ path: shot })
        // Leveransen: kör iväg + backa in. Fånga mitt i, så vi ser att HELA ekipaget
        // (flak + last + mätare) följer med och att inget kör genom grävmaskinen.
        if (lvl === 0) {
          await page.waitForTimeout(2100)
          await page.screenshot({ path: shot.replace(/\.png$/, '-leverans.png') })
          await page.waitForTimeout(3100)
        } else {
          await page.waitForTimeout(5200)
        }
        s = await state(page)
        break
      }
    }
    rader.push({ niva: startNiva, cargo, target, lass, snittTag: Math.round(taget / Math.max(1, lass)) })
    console.log(
      `nivå ${startNiva} · ${cargo} · mål ${target} → ${lass} lass (snitt ${Math.round(taget / Math.max(1, lass))} korn/skopa)`,
    )
  }

  console.log('\nkonsolfel:', errors.length ? errors : 'inga')
  console.log('skärmdump (fullt flak, nivå 0):', shot)
} finally {
  await browser.close()
}
