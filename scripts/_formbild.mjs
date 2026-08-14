// ENGÅNGSSOND (raderas efter användning): ritar alla sju formvänner, deras hål och musen
// i ett rutnät — och med `--spel` hela spelbrädet — och tar en skärmdump UTAN att gå via
// registret, eftersom spelet ännu inte är registrerat. Geometrin i former.js är räknad för
// hand (halvmånens bågar, stjärnans hörnradier, ansiktets läge per form) och ett tal som är
// fel syns bara i bild.
//
//   node src/games/passa-formerna/_formbild.mjs            formark: 7 former + hål + mus
//   node src/games/passa-formerna/_formbild.mjs --spel     hela brädet
//   ... --spel --drag    drar formvän 0 från sitt FAKTISKA läge till sitt hål (klara ska bli 1)
//   ... --spel --mus     musen uppe i ett hål
//   ... --spel --final   hela finalen (skratt → lock upp → kör)
//   ... --spel --exit    lämnar mitt i finalen (0 konsolfel krävs)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const spelLage = process.argv.includes('--spel')
const shot = spelLage ? '.test-shots/_passa-formerna-brade.png' : '.test-shots/_passa-formerna-former.png'
mkdirSync('.test-shots', { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(600)

  if (spelLage) {
    await page.evaluate(async () => {
      const spel = (await import('/src/games/passa-formerna/index.js')).default
      const { drawIcon } = await import('/src/lib/artikoner.js')
      const blank = () => drawIcon('__ingen__', 1).clear()
      const s = window.__barnspel
      const layer = s.gateLayer
      for (const c of [...layer.children]) if (c.__sond) c.removeFromParent()
      // Stagen måste vara en RIKTIG Container: `drawIcon(...)` sätter eventMode 'none',
      // och en sådan stage gör hela spelet omöjligt att peka på (draget såg trasigt ut,
      // felet satt i sonden). Container-klassen lånas av ett befintligt lager.
      const stage = new (layer.constructor)()
      stage.__sond = true
      layer.addChild(stage)
      const ctx = {
        stage,
        ticker: s.app.ticker,
        width: 1280,
        height: 720,
        view: s.scaler.view,
        services: s,
        fxLayer: s.fxLayer,
        exitToLibrary() {},
        later: (sek, fn) => setTimeout(fn, sek * 1000),
        progress: {
          get: () => ({ unlocked: true, highestLevel: 3, stars: 0, custom: { rundor: 2 } }),
          update() {}, setLevel() {}, addStars() {}, setCustom() {}, complete() {},
        },
      }
      window.__sond = { spel, ctx }
      await spel.init(ctx)
      await spel.mount(ctx)
    })
    await page.waitForTimeout(1600)

    // DRAGET: dra formvän 0 från sitt FAKTISKA läge till sitt eget hål och läs av att
    // spelet räknade den som hemma. (Harnessens auto-drag drar mellan generiska punkter
    // och kan missa varje spelobjekt — då är kärnloopen grön och helt oprövad.)
    if (process.argv.includes('--drag')) {
      const p = await page.evaluate(() => {
        const { spel } = window.__sond
        const f = spel._formar[0]
        return { fx: f.fig.view.x, fy: f.fig.view.y, mx: f.mal.x, my: f.mal.y, key: f.key }
      })
      await page.mouse.move(p.fx, p.fy)
      await page.mouse.down()
      for (let i = 1; i <= 14; i++) {
        await page.mouse.move(p.fx + ((p.mx - p.fx) * i) / 14, p.fy + ((p.my - p.fy) * i) / 14)
        await page.waitForTimeout(16)
      }
      await page.mouse.up()
      await page.waitForTimeout(700)
      const klara = await page.evaluate(() => window.__sond.spel._klara)
      console.log(`drag ${p.key}: (${Math.round(p.fx)},${Math.round(p.fy)}) → (${p.mx.toFixed(0)},${p.my.toFixed(0)}) · klara = ${klara} (ska vara 1)`)
    }

    // EXIT MITT I FINALEN: spelaren kan lämna när som helst.
    if (process.argv.includes('--exit')) {
      await page.evaluate(() => {
        const { spel, ctx } = window.__sond
        spel._formar.forEach((f, i) => setTimeout(() => spel._onCorrect(ctx, f), 80 * i))
      })
      await page.waitForTimeout(1300)
      await page.evaluate(() => window.__sond.spel.destroy(window.__sond.ctx))
      await page.waitForTimeout(2500)
      console.log('exit mitt i finalen gjord')
    }

    if (process.argv.includes('--mus')) {
      await page.evaluate(() => {
        const { spel, ctx } = window.__sond
        spel._musUpp(ctx, spel._formar[1])
      })
      await page.waitForTimeout(500)
    }

    if (process.argv.includes('--final')) {
      // Kör hem alla formerna och låt finalen (skratt → lock upp → kör) spela klart.
      await page.evaluate(() => {
        const { spel, ctx } = window.__sond
        spel._formar.forEach((f, i) => setTimeout(() => spel._onCorrect(ctx, f), 120 * i))
      })
      await page.waitForTimeout(1000 + 3400)
    }
    await page.screenshot({ path: shot })
    await page.evaluate(() => window.__sond.spel.destroy(window.__sond.ctx))
    await page.waitForTimeout(500)
  } else {
    await page.evaluate(async () => {
      const { FORM_KEYS, makeFormvan, makeHal, makeMus } = await import('/src/games/passa-formerna/former.js')
      const { drawIcon } = await import('/src/lib/artikoner.js')
      const blank = () => drawIcon('__ingen__', 1).clear()
      const layer = window.__barnspel.gateLayer
      for (const c of [...layer.children]) if (c.__sond) c.removeFromParent()

      const bg = blank().rect(0, 0, 1280, 720).fill(0xead7b8)
      bg.__sond = true
      layer.addChild(bg)

      const farger = [0xff8a3d, 0x5bbf6a, 0x4aa3df, 0xffd35c, 0xa78bfa, 0xff6b6b, 0x57c8c3]
      FORM_KEYS.forEach((key, i) => {
        const x = 90 + (i % 4) * 300
        const y = 150 + Math.floor(i / 4) * 300
        const hal = makeHal(key, 62, 0xc98f52, farger[i])
        hal.position.set(x, y)
        hal.__sond = true
        layer.addChild(hal)
        const f = makeFormvan(key, 62, farger[i], { gyllene: i === 3 })
        f.view.position.set(x + 150, y)
        f.view.__sond = true
        layer.addChild(f.view)
      })
      const mus = makeMus(58)
      mus.position.set(1130, 450)
      mus.__sond = true
      layer.addChild(mus)
    })
    await page.waitForTimeout(400)
    await page.screenshot({ path: shot })
  }

  console.log(fel.length ? `FEL (${fel.length}):\n${fel.join('\n')}` : 'inga konsolfel')
  console.log('bild:', shot)
} finally {
  await browser.close()
}
