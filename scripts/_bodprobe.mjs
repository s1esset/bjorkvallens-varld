// unika-knytt — KNYTTBODEN (leverans 2 steg 3) i en levande webblasare.
//
// Bodluckan star pa (1160, 612), alltsa bortom harnessens nio tryck (max x 950) precis som
// spaken — `npm run test` oppnar aldrig boden. Allt bakom luckan kan bara matas har.
//
// Armar (kontrollarm forst, alltid):
//   K0 kontroll  tom samling: luckan oppnar INTE boden (fas 'bygga' kvar) — ett tomt rum
//                vore en franvaro (P0 FOMO) — och trycket ar inte tyst (0 fel, ingen krasch)
//   B0 matarm    11 poster (3 varldar, 2 skimrande): luckan oppnar boden, fas 'boden'
//   B1           flikarna = Alla + BARA de varldar som har knytt + Skimmer (5 av 6 mojliga)
//   B2           Alla visar allt (11), atta i bild (tva plan), listan ar rullbar
//   B3 matarm    pil ner rullar exakt ETT plan (y −200) och bygger tredje raden
//   B4 kontroll  ett drag pa ett bo rullar men gor INGET knytt glatt (scrolling-vakten)
//   B5 matarm    ett tryck pa ett bo gor knyttet glatt OCH sparar favoriten (fram = froet)
//   B6           varldsfliken filtrerar (bara den varldens), skimmerfliken bara t > 0
//   B7           dorren stanger: fas 'bygga', kupan ar traffbar igen
//   B8           favoriten star FORST i Alla nar boden oppnas igen
//   exit         lamna spelet med boden OPPEN → 0 konsolfel
//
//   node scripts/_bodprobe.mjs
//
// ⚠️ Kor ALDRIG bredvid en annan webblasarsond eller `npm run test:all`.
import { chromium } from 'playwright'

const ID = 'unika-knytt'
const LUCKA = { x: 1160, y: 612 }
const DORR = { x: 1160, y: 630 }
const PIL_NER = { x: 1160, y: 490 }
const FLIK_Y = 206
const FLIK_X = (i) => 150 + i * 130
const BO_X = 280
const BO_Y0 = 262 + 112 // VY.y0 + RAD_Y0

// 11 poster: [fro, f, z, m, v, r, g, t]. Varldar 0 (skog) · 1 (vatten) · 3 (natt) — ingen sno.
const POSTER = []
for (let i = 0; i < 11; i++) POSTER.push([5000 + i, i % 8, i % 3, i % 4, [0, 1, 3][i % 3], 0, 0, i === 4 ? 3 : i === 8 ? 1 : 0])

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
let fel = 0

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(900)

  /** In i spelet med en pahittad sparpost (SaveService flushar vid pagehide — rensa via ctx). */
  const besok = async (lista, fram = 0) => {
    await page.evaluate(([l, f]) => {
      const dag = Math.floor(Date.now() / 86400000)
      window.__barnspel.ctx.progress.setCustom('knytt', { v: 2, lista: l, n: l.length, firad: 99, dag, torka: 0, fram: f })
    }, [lista, fram])
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(400)
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1500)
  }

  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    const s = Math.min(r.width / 1280, r.height / 720)
    return { x0: r.left + (r.width - 1280 * s) / 2, y0: r.top + (r.height - 720 * s) / 2, s }
  })
  const X = (x) => geo.x0 + x * geo.s
  const Y = (y) => geo.y0 + y * geo.s
  const klick = (x, y) => page.mouse.click(X(x), Y(y))
  const las = () => page.evaluate(() => {
    const g = window.__barnspel.game
    const b = g._boden
    return {
      fas: g._fas, oppen: b?.oppen, flikar: b?.flikar, flik: b?.flik, antal: b?.antal, synliga: b?.synliga,
      rullbar: b?.rullbar, y: b?.y, forst: b?.forst, lagen: b?.lagen, fram: g._fram,
      kupa: g._kupa?.view?.eventMode,
      sparatFram: window.__barnspel.ctx.progress.get()?.custom?.knytt?.fram,
    }
  })

  // ================================================================ K0 tom samling
  await besok([])
  const felFore = errors.length
  await klick(LUCKA.x, LUCKA.y)
  await page.waitForTimeout(500)
  const k0 = await las()
  rader.push(['K0 kontroll  tom samling → boden oppnas INTE', `fas ${k0.fas} · oppen ${k0.oppen} · ${errors.length - felFore} fel`, k0.fas === 'bygga' && k0.oppen === false && errors.length === felFore])

  // ================================================================ B0–B2 oppna
  await besok(POSTER)
  await klick(LUCKA.x, LUCKA.y)
  await page.waitForTimeout(700)
  const b0 = await las()
  await page.mouse.move(X(40), Y(400))
  await page.screenshot({ path: '.test-shots/knytt-bod-alla.png' })
  rader.push(['B0 matarm    luckan oppnar boden', `fas ${b0.fas} · oppen ${b0.oppen} · kupa ${b0.kupa}`, b0.fas === 'boden' && b0.oppen === true && b0.kupa === 'none'])
  rader.push(['B1           flikar = Alla + varldar MED knytt + Skimmer', (b0.flikar || []).join(' · '), JSON.stringify(b0.flikar) === JSON.stringify(['alla', 'skog', 'vatten', 'natt', 'skimmer'])])
  rader.push(['B2           Alla visar allt, atta i bild, rullbar', `antal ${b0.antal} · synliga ${b0.synliga} · rullbar ${b0.rullbar} · y ${b0.y}`, b0.antal === 11 && b0.synliga === 8 && b0.rullbar === true && b0.y === 0])

  // ================================================================ B3 pilen
  await klick(PIL_NER.x, PIL_NER.y)
  await page.waitForTimeout(600)
  const b3 = await las()
  rader.push(['B3 matarm    pil ner rullar ETT plan och bygger raden', `y ${b3.y} · synliga ${b3.synliga}`, b3.y === -200 && b3.synliga === 11])

  // ================================================================ B4 draget (kontroll)
  // Ett drag som borjar och slutar pa SAMMA bo: Pixi fyrar `pointertap` anda, och det ar
  // precis det fallet `scrolling()`-vakten finns for. Inget knytt far bli glatt.
  const boY = BO_Y0 - 200 + 200 // rad 1 (index 1) star nu dar rad 0 stod: 262+112 = 374
  await page.mouse.move(X(BO_X), Y(boY + 30))
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(X(BO_X), Y(boY + 30 - i * 9))
    await page.waitForTimeout(30)
  }
  await page.mouse.up()
  await page.waitForTimeout(500)
  const b4 = await las()
  const gladaEfterDrag = (b4.lagen || []).filter((l) => l === 'glad').length
  rader.push(['B4 kontroll  drag pa ett bo → rullar, INGET blir glatt', `glada ${gladaEfterDrag} · y ${b4.y}`, gladaEfterDrag === 0])

  // ================================================================ B5 trycket
  // Tillbaka till toppen (pil upp), sedan ett rent tryck pa forsta boet.
  await page.evaluate(() => window.__barnspel.game._boden.stega(-1))
  await page.waitForTimeout(500)
  const forstSeed = (await las()).forst
  await klick(BO_X, BO_Y0)
  await page.waitForTimeout(350)
  const b5 = await las()
  const glada = (b5.lagen || []).filter((l) => l === 'glad').length
  rader.push(['B5 matarm    tryck pa ett bo → glatt + favorit sparad', `glada ${glada} · fram ${b5.fram} · sparat ${b5.sparatFram} · forst ${forstSeed}`, glada === 1 && b5.fram === forstSeed && b5.sparatFram === forstSeed && forstSeed === 5010])

  // ================================================================ B6 flikarna
  await klick(FLIK_X(2), FLIK_Y) // vatten
  await page.waitForTimeout(400)
  const b6a = await las()
  await klick(FLIK_X(4), FLIK_Y) // skimmer
  await page.waitForTimeout(400)
  const b6b = await las()
  await page.mouse.move(X(40), Y(400))
  await page.screenshot({ path: '.test-shots/knytt-bod-skimmer.png' })
  const vatten = POSTER.filter((p) => p[4] === 1).length
  const skimmer = POSTER.filter((p) => p[7] > 0).length
  rader.push(['B6           varldsflik + skimmerflik filtrerar', `vatten ${b6a.flik}/${b6a.antal} (${vatten}) · skimmer ${b6b.flik}/${b6b.antal} (${skimmer})`, b6a.flik === 'vatten' && b6a.antal === vatten && b6b.flik === 'skimmer' && b6b.antal === skimmer])

  // ================================================================ B7 dorren
  await klick(DORR.x, DORR.y)
  await page.waitForTimeout(500)
  const b7 = await las()
  rader.push(['B7           dorren stanger: verkstan tillbaka', `fas ${b7.fas} · oppen ${b7.oppen} · kupa ${b7.kupa}`, b7.fas === 'bygga' && b7.oppen === false && b7.kupa === 'static'])

  // ================================================================ B8 favoriten forst
  await klick(LUCKA.x, LUCKA.y)
  await page.waitForTimeout(700)
  const b8 = await las()
  rader.push(['B8           favoriten star forst i Alla', `forst ${b8.forst} · fram ${b8.fram}`, b8.oppen === true && b8.forst === b8.fram && b8.fram === 5010])

  // ================================================================ exit med boden oppen
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(700)
  rader.push(['exit         lamna med boden oppen → inga konsolfel', `${errors.length} fel`, errors.length === 0])
  if (errors.length) for (const e of errors.slice(0, 4)) rader.push([`   ${e}`, '', false])
} finally {
  await browser.close()
}

console.log('\n  unika-knytt — Knyttboden\n')
for (const [namn, varde, ok] of rader) {
  if (!ok) fel++
  console.log(`  ${ok ? '✓' : '✗'} ${namn.padEnd(52)} ${varde}`)
}
console.log(`\n  ${fel === 0 ? '✓ alla armar som vantat' : `✗ ${fel} arm(ar) fel`}\n`)
process.exit(fel === 0 ? 0 : 1)
