// Huvudlöst test av ett spel via Playwright + systemets Chrome (channel 'chrome',
// ingen nedladdning). Oberoende av MCP/extension. Navigerar till spelet, trycker
// brett över ytan, kör en exit-cykel (spel->bibliotek->spel->meny) och rapporterar
// konsolfel + sparar en skärmdump.
//
// Hämtar också diagnostikloggen (window.__gamelog, DEV-only) och skriver den till
// .test-logs/<id>.json — där finns input/utdata/fysik/rendering-tidslinjen och de
// härledda fynden (död träffyta, saknad ikon, tween-läcka, kropp som rymde ...).
//
//   node scripts/test-game.mjs <id> [--shot out.png] [--taps "x,y;x,y"] [--url http://localhost:5173]
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { granska } from './bildkoll.mjs'

const args = process.argv.slice(2)
const id = args[0]
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : def
}
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const url = opt('--url', 'http://localhost:5173')
const shot = opt('--shot', `test-${id}.png`)
// --viewport WxH: kör i en annan skärmform än 16:9 (t.ex. 952x428 = Pixel 10 Pro
// landskap) för att se full bleed-buggar. Tryck/drag anges ALLTID i designkoordinater
// (1280×720) och mappas genom samma contain-letterbox som Scaler använder, så samma
// --taps träffar samma spelobjekt oavsett viewport.
const [vpW, vpH] = opt('--viewport', '1280x720').toLowerCase().split('x').map(Number)
if (!(vpW > 0) || !(vpH > 0)) {
  console.error('--viewport måste vara BREDDxHÖJD, t.ex. 952x428')
  process.exit(2)
}
const VS = Math.min(vpW / 1280, vpH / 720)
const VOX = Math.round((vpW - 1280 * VS) / 2)
const VOY = Math.round((vpH - 720 * VS) / 2)
const tillSkarm = (x, y) => [VOX + x * VS, VOY + y * VS]
const logPath = opt('--log', join(ROOT, '.test-logs', `${id}.json`))
// Självtest av tom-bild-diagnosen, se omtagningsslingan längre ned.
const tvingaTom = Number(opt('--tvinga-tom', 0))
const noLog = args.includes('--no-log')
const tapsArg = opt('--taps', '')
// Dragspel: --drag "fx,fy>tx,ty;fx,fy>tx,ty" gör riktiga musdrag (peka-ner,
// flytta i steg, släpp). Om --drag anges hoppas standardtrycken över.
const dragArg = opt('--drag', '')
const drags = dragArg
  ? dragArg.split(';').map((seg) => seg.split('>').map((p) => p.split(',').map(Number)))
  : []
const defaultTaps = [
  [300, 250], [640, 250], [950, 250],
  [300, 450], [640, 450], [950, 450],
  [480, 600], [800, 600], [640, 360],
]
const taps = tapsArg
  ? tapsArg.split(';').map((p) => p.split(',').map(Number))
  : drags.length
    ? []
    : defaultTaps

if (!id) {
  console.error('usage: node scripts/test-game.mjs <id> [--shot out.png] [--taps "x,y;x,y"]')
  process.exit(2)
}

// Diagnostikloggen finns bara i dev-bygget; saknas den kör vi vidare utan.
const grabLog = async (page) => {
  try {
    return await page.evaluate(() => (window.__gamelog ? window.__gamelog.snapshot() : null))
  } catch {
    return null
  }
}

const mergeFynd = (...listor) => {
  const m = new Map()
  for (const lista of listor) {
    for (const f of lista || []) {
      const prev = m.get(f.kod)
      if (prev) prev.n += f.n
      else m.set(f.kod, { ...f })
    }
  }
  return [...m.values()].sort((a, b) => (a.niva === b.niva ? b.n - a.n : a.niva === 'fel' ? -1 : 1))
}

const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: vpW, height: vpH } })
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 300)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

  // Vakt för WebGL-kontexten. En förlorad kontext ger en HELT tom duk utan ett enda
  // konsolfel — alltså exakt samma bild som en tom scen — och under parallell last är
  // det en av de få mekanismer som kan tömma en duk som redan varit målad. Vakten
  // sätts före spelet monteras så inget missas.
  await page.evaluate(() => {
    window.__glHandelser = []
    const cv = document.querySelector('canvas')
    if (!cv) return
    cv.addEventListener('webglcontextlost', () => window.__glHandelser.push('forlorad'))
    cv.addEventListener('webglcontextrestored', () => window.__glHandelser.push('ateruppratad'))
  })

  // gå in i spelet
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
  await page.waitForTimeout(1200)

  // tryck brett över ytan (träffar de flesta interaktiva element)
  for (const [dx, dy] of taps) {
    const [x, y] = tillSkarm(dx, dy)
    await page.evaluate(({ x, y }) => {
      const cv = document.querySelector('canvas')
      const r = cv.getBoundingClientRect()
      for (const t of ['pointerdown', 'pointerup']) {
        cv.dispatchEvent(new PointerEvent(t, {
          clientX: r.left + x, clientY: r.top + y,
          pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true,
        }))
      }
    }, { x, y })
    await page.waitForTimeout(260)
  }

  // riktiga musdrag (för dragspel)
  for (const [df, dt] of drags) {
    const [fx, fy] = tillSkarm(df[0], df[1])
    const [tx, ty] = tillSkarm(dt[0], dt[1])
    await page.mouse.move(fx, fy)
    await page.mouse.down()
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(fx + ((tx - fx) * i) / 12, fy + ((ty - fy) * i) / 12)
      await page.waitForTimeout(22)
    }
    await page.mouse.up()
    await page.waitForTimeout(550)
  }

  // ⚠️ SKÄRMDUMPEN MÅSTE TAS EFTER EN MÅLAD BILDRUTA, INTE EFTER EN TIMER. Med enbart
  // `waitForTimeout` kapplöper `page.screenshot()` med WebGL-rutan, och under parallell
  // last (fyra webbläsare) vinner den ibland: bilden blir HELT tom och `bildkoll` fäller
  // ett `tom-scen` på fel nivå i ett spel som mår utmärkt. Uppmätt över tre fulla svep:
  // fyndet dök upp i `tvatta-djuret` två gånger och sedan i `flipperspel` och
  // `folj-sparet` — alltså olika spel varje gång, medan vart och ett var grönt när det
  // kördes ensamt (6 av 6 för `tvatta-djuret`). Det är harnessen som mäter fel, inte
  // spelen. Två rAF garanterar att minst en ruta är målad innan bilden tas.
  await page.waitForTimeout(900)
  const maladRuta = () =>
    page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))))
  await maladRuta()
  await page.screenshot({ path: shot })

  // Och om bilden ÄNDÅ blev tom: ta om den, upp till tre gånger. En scen som verkligen är
  // tom är tom varje gång, så omtagningarna kan aldrig dölja ett riktigt fel — de skiljer
  // bara kapplöpningen från saken.
  //
  // ⚠️ SAMLA BEVIS I SAMMA ÖGONBLICK. En tyst omtagning gjorde `tom-scen` till ett fynd
  // utan orsak: ÅTGÄRDER V14 stod i tre svep på hypotesen att `golvet-ar-lava` har svitens
  // tyngsta montering, och `scripts/_montageprobe.mjs` MÄTTE sedan att den hypotesen är
  // falsk (16,8 ms blockerande ruta = svitens median; bara `pizzabageriet` 3× och
  // `hamburgerbygget` 2× sticker ut, och ingen av dem är spelet som faller). Nästa gång
  // ska bilden komma med sin egen diagnos i stället för att lämna efter sig en gissning.
  //
  // `--tvinga-tom N` låtsas att de N första bilderna var tomma. Vägen går annars bara att
  // se när flaket råkar slå till, och en diagnos ingen har kört är en gissning till.
  let tomScen = null
  for (let forsok = 1; forsok <= 3 && (forsok <= tvingaTom || granska(shot).some((f) => f.kod === 'tom-scen')); forsok++) {
    const diagnos = await page.evaluate(() => {
      const cv = document.querySelector('canvas')
      let glForlorad = null
      try {
        const gl = cv && (cv.getContext('webgl2') || cv.getContext('webgl'))
        glForlorad = gl ? gl.isContextLost() : null
      } catch { glForlorad = null }
      const s = window.__barnspel
      return {
        glForlorad,
        glHandelser: (window.__glHandelser || []).join(','),
        stageBarn: s?.app?.stage?.children?.length ?? null,
        varldBarn: s?.world?.children?.length ?? null,
        duk: cv ? `${cv.width}x${cv.height}` : null,
        synlighet: document.visibilityState,
      }
    })
    tomScen = { forsok, ...diagnos }
    await page.waitForTimeout(400)
    await maladRuta()
    await page.screenshot({ path: shot })
  }
  // Löste omtagningen det? Då var bilden fel, inte scenen — men det får inte tigas ihjäl:
  // en varning bär diagnosen vidare till loggen och till svitens utskrift.
  const tomScenFynd = tomScen && !granska(shot).some((f) => f.kod === 'tom-scen')
    ? [{
        kod: 'tom-bild-omtagen',
        niva: 'varning',
        n: tomScen.forsok,
        msg: `skarmdumpen var tom, omtagning ${tomScen.forsok} gav innehall — `
          + `gl-kontext ${tomScen.glForlorad === true ? 'FORLORAD' : tomScen.glForlorad === false ? 'levande' : 'okand'}`
          + `${tomScen.glHandelser ? ` (${tomScen.glHandelser})` : ''}, stage ${tomScen.stageBarn} barn, `
          + `varld ${tomScen.varldBarn} barn, duk ${tomScen.duk}, sida ${tomScen.synlighet}`,
      }]
    : []

  // exit-säkerhetscykel: spel -> bibliotek -> spel -> meny (mitt i ev. animationer)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  // Loggens efterkontroll (tweens som lever vidare efter destroy) landar ~400 ms
  // efter utgången — vänta ut den innan vi läser av, annars missar vi läckorna.
  await page.waitForTimeout(700)
  const snapshot = await grabLog(page)
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
  await page.waitForTimeout(700)
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(700)
  const cykel = await grabLog(page)

  // Bildkoll på skärmdumpen. Tre av fyra fel i gravmaskinens polering hittades i en
  // BILD, inget av dem av ett grönt test — därför är den här kollen inte valfri.
  // Baslinje-diffen är opt-in (--baslinje) eftersom spardatan inte nollställs och
  // spelen är fulla av Math.random(); en rak diff hade tjutit varje körning.
  const bildFynd = granska(shot, opt('--baslinje', null))

  // Slå ihop fynden från huvudpasset, återinträdes-cykeln och bilden.
  const fynd = mergeFynd(snapshot?.summary?.fynd, cykel?.summary?.fynd, bildFynd, tomScenFynd)
  if (snapshot && !noLog) {
    mkdirSync(dirname(logPath), { recursive: true })
    writeFileSync(logPath, JSON.stringify({ id, korning: snapshot, aterintrade: cykel, fynd, tomScen }, null, 2))
  }

  console.log(JSON.stringify({
    id,
    errors,
    shot,
    errorCount: errors.length,
    logg: snapshot && !noLog ? logPath : null,
    tomScen,
    fynd,
    fyndFel: fynd.filter((f) => f.niva === 'fel').length,
    matt: snapshot?.summary
      ? {
          rutor: snapshot.summary.rutor,
          snittRutaMs: snapshot.summary.snittRutaMs,
          langaRutor: snapshot.summary.langaRutor,
          handelser: snapshot.summary.handelser,
          fysik: snapshot.summary.fysik,
        }
      : null,
  }, null, 2))
} finally {
  await browser.close()
}
process.exit(errors.length ? 1 : 0)
