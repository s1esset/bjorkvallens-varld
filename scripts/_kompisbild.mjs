// Bild på `bygg-en-kompis` UTAN att spelet finns i registret. Monterar modulen med en
// stub-ctx i gateLayer, cyklar en del i taget och tar en skärmdump per läge — plus en
// bild mitt i fotograferingen och en exit-koll (destroy mitt i finishen).
//
//   node scripts/_kompisbild.mjs --url http://localhost:5173
//   node scripts/_kompisbild.mjs --del ogon        (cykla en annan del)
//
// Kräver dev-servern. Varje ruta är HELA skärmen, för det är layouten (träffytor,
// krockar med skalets hem-/högtalarknapp) som inte går att bedöma i tal.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const url = opt('--url', 'http://localhost:5173')
const del = opt('--del', 'kropp')
const varv = Number(opt('--varv', '6'))
const galleri = Number(opt('--galleri', '0')) // så många sparade kompisar på väggen
const exitVid = Number(opt('--exitvid', '0')) // exit N sekunder in i finishen
const vila = Number(opt('--vila', '0')) // stå still i N sekunder (om-cue + fjäril)
mkdirSync('.test-shots', { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 220)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 220)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(600)

  await page.evaluate(async (antal) => {
    const s = window.__barnspel
    const r = (n) => (Math.random() * n) | 0
    window.__galleri = Array.from({ length: antal }, () => ({
      kropp: r(6), ogon: r(6), mun: r(6), topp: r(6), farg: r(10), storlek: r(3),
    }))
    const mod = await import('/src/games/bygg-en-kompis/index.js')
    const spel = mod.default
    // Dölj bibliotekets egen bild, annars ligger den under.
    // Dölj bibliotekets skärm (world.children[0] = screenHolder) — INTE hela world,
    // som också bär gateLayer där spelet monteras.
    const skarmar = s.world.children[0]
    if (skarmar) skarmar.visible = false
    const timers = new Set()
    const ctx = {
      stage: s.gateLayer,
      ticker: s.app.ticker,
      width: 1280,
      height: 720,
      view: s.scaler.view,
      services: s,
      fxLayer: s.fxLayer,
      exitToLibrary() {},
      later(d, fn) {
        const id = setTimeout(() => { timers.delete(id); fn() }, d * 1000)
        timers.add(id)
        return { kill: () => clearTimeout(id) }
      },
      progress: {
        get: () => ({ unlocked: true, highestLevel: 12, stars: 0, custom: { galleri: window.__galleri || [] } }),
        update() {}, setLevel() {}, addStars() {}, setCustom() {}, complete() {},
      },
    }
    window.__kompis = { spel, ctx, timers }
    await spel.init(ctx)
    await spel.mount(ctx)
  }, galleri)

  await page.waitForTimeout(900)
  await page.screenshot({ path: `.test-shots/kompis-0.png` })

  if (vila > 0) {
    // Stilla-läget: om-cue vid 7 s, andra cuen vid 14 s, bus-fjärilen vid 22 s. Inget
    // av det får spela mot en riven nod eller lämna en knapp uppblåst.
    await page.waitForTimeout(vila * 1000)
    await page.screenshot({ path: '.test-shots/kompis-vila.png' })
    const skalor = await page.evaluate(() => {
      const s = window.__kompis.spel
      return {
        knappskalor: s._knappar.filter((k) => k.scale).map((k) => Number(k.scale.x.toFixed(3))),
        fjaril: !!s._fjaril,
        idle: Number(s._idle.toFixed(1)),
      }
    })
    console.log('vila:', JSON.stringify(skalor))
  }

  for (let i = 1; i < varv; i++) {
    await page.evaluate((d) => {
      const { spel, ctx } = window.__kompis
      spel._byt(ctx, d, 1)
    }, del)
    await page.waitForTimeout(520)
    await page.screenshot({ path: `.test-shots/kompis-${i}.png` })
  }

  if (args.includes('--kittel')) {
    // KITTLINGEN + TRÄFFORDNINGEN. Tre armar, kontrollarmen först — ett "det skrattade"
    // säger ingenting om ytan inte också kan låta bli att svara där den inte ska.
    //
    // Riktiga muspekningar, inte metodanrop: hela poängen är vad Pixis träfftest gör
    // med tre överlappande ytor (bottenytan · kittelytan · fjärilen).
    const skala = await page.evaluate(() => {
      const v = window.__barnspel.scaler
      return { s: v.scale, x: v.world.x, y: v.world.y }
    })
    const tryck = async (dx, dy) => {
      await page.mouse.click(skala.x + dx * skala.s, skala.y + dy * skala.s)
      await page.waitForTimeout(220)
    }
    const las = () => page.evaluate(() => {
      const s = window.__kompis.spel
      return {
        skrattar: !!s._skrattar,
        blick: { x: Number(s._blick.x.toFixed(2)), y: Number(s._blick.y.toFixed(2)) },
        ogonY: Number((s._varelse?.ogonNod?.scale.y ?? 1).toFixed(2)),
        fjaril: !!s._fjaril,
      }
    })

    // ⓵ KONTROLLARM: tomt golv långt från kompisen (x 900 ligger mellan kameran och
    // högerkolumnen). Svarar ytan här är den för stor, och talet nedan betyder inget.
    await tryck(900, 690)
    console.log('kittel/kontroll-tomt :', JSON.stringify(await las()))

    // ⓶ MÄTARM: mitt på kompisens kropp.
    await page.evaluate(() => { window.__kompis.spel._blick.x = 0; window.__kompis.spel._blick.y = 0 })
    await tryck(540, 460)
    console.log('kittel/pa-kompisen   :', JSON.stringify(await las()))
    await page.screenshot({ path: '.test-shots/kompis-kittel.png' })
    await page.waitForTimeout(1400)

    // ⓷ TRÄFFORDNING: fjärilen sitter på huvudet och ska vinna över kittelytan under
    // sig. Landningspunkten läses ur spelet i stället för att gissas.
    await page.evaluate(() => window.__kompis.spel._slappFjaril(window.__kompis.ctx))
    await page.waitForTimeout(1800)
    const fp = await page.evaluate(() => {
      const s = window.__kompis.spel
      const g = s._fjaril.toGlobal({ x: 0, y: -6 })
      const l = s._root.toLocal(g)
      return { x: Math.round(l.x), y: Math.round(l.y) }
    })
    await page.evaluate(() => { window.__kompis.spel._skrattar = false })
    await tryck(fp.x, fp.y)
    console.log(`kittel/pa-fjarilen   : (${fp.x},${fp.y}) ` + JSON.stringify(await las()))
    // ⓸ VINGSPETSEN. Kittelytan skalas med kompisen, så samma tal ger olika många
    // designpixlar i varje storlek — och P0-avståndet till kameran (x 704) och till
    // vänsterkolumnens halo (x 348) är taket. Här mäts BÅDA: att spetsen svarar där
    // den ryms, och att ytans designkanter håller 24 px till grannarna i alla tre
    // storlekarna. Ett "vingen svarar" utan kantmätningen är halva svaret.
    for (const st of [0, 1, 2]) {
      const geo = await page.evaluate((i) => {
        const { spel, ctx } = window.__kompis
        spel._cfg.topp = 5 // vingar
        spel._cfg.kropp = 0
        spel._cfg.storlek = i
        spel._ritaVarelse(ctx, null)
        spel._skrattar = false
        const h = spel._kittelYta.hitArea
        const s = spel._vSkala.scale.x
        // Vingspetsen läses ur den RITADE geometrin (prydnadsnodens bbox), inte ur ett
        // tal i sonden. Första versionen hårdkodade 150 och rapporterade därför exakt
        // samma spets efter att vingen hade krympts — en mätning som inte kunde se
        // ändringen den skulle mäta.
        const bb = spel._varelse.toppNod.getBounds()
        const l = spel._root.toLocal({ x: bb.x + bb.width - 5, y: bb.y + bb.height * 0.4 })
        return {
          storlek: s,
          vanster: Math.round(540 + h.x * s),
          hoger: Math.round(540 + (h.x + h.width) * s),
          vinge: { x: Math.round(l.x), y: Math.round(l.y) },
        }
      }, st)
      await page.waitForTimeout(420)
      await page.evaluate(() => { window.__kompis.spel._skrattar = false })
      await tryck(geo.vinge.x, geo.vinge.y)
      const r = await las()
      const tillKam = 704 - geo.hoger
      const tillKol = geo.vanster - 348
      console.log(
        `kittel/vinge ${geo.storlek.toFixed(2)}x : yta x ${geo.vanster}–${geo.hoger}` +
        ` (till kamera ${tillKam}, till kolumn ${tillKol}; P0 kräver ≥24)` +
        ` · spets (${geo.vinge.x},${geo.vinge.y}) → skrattar:${r.skrattar}`
      )
    }
    await page.waitForTimeout(900)
  }

  if (args.includes('--fjaril')) {
    // Bus-fjärilen: flyger in, sätter sig på huvudet, och ETT tryck räcker.
    await page.evaluate(() => window.__kompis.spel._slappFjaril(window.__kompis.ctx))
    await page.waitForTimeout(1600)
    await page.screenshot({ path: '.test-shots/kompis-fjaril.png' })
    await page.evaluate(() => window.__kompis.spel._fjarilBort(window.__kompis.ctx, true))
    await page.waitForTimeout(400)
    await page.screenshot({ path: '.test-shots/kompis-fjaril-bort.png' })
    await page.waitForTimeout(600)
  }

  // Finishen: kompisen blir levande → blixt → ramen upp på väggen.
  await page.evaluate(() => window.__kompis.spel._fotografera(window.__kompis.ctx))
  if (exitVid > 0) {
    // Exit vid en VALD tidpunkt i finishen (blixten, flykten, spikningen) — det är
    // olika tweens som lever i varje skede.
    await page.waitForTimeout(exitVid * 1000)
  } else {
    await page.waitForTimeout(700)
    await page.screenshot({ path: '.test-shots/kompis-finish1.png' })
    await page.waitForTimeout(1400)
    await page.screenshot({ path: '.test-shots/kompis-finish2.png' })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: '.test-shots/kompis-finish3.png' })
  }

  // Exit MITT i finishen — den farligaste stunden.
  //
  // Konsolen är TYST när gsap tweenar en riven Pixi-nod (den skriver bara på en nollad
  // transform), så "0 konsolfel" bevisar ingenting om städningen. Armarna, ögonen och
  // munnen är BARNBARN till figuren och överlever `killTweensOf(figuren)` — de plockas
  // undan före rivningen och räknas efteråt.
  const kvar = await page.evaluate(async () => {
    const { spel, ctx, timers } = window.__kompis
    const v = spel._varelse
    const noder = [...(v?.armar || []), v?.ogonNod, v?.munNod, v?.toppNod].filter(Boolean)
    // Det måste vara SPELETS gsap-instans: en nyimporterad kopia har en egen global
    // tidslinje och hade rapporterat 0 levande tweens oavsett vad som pågår. Vite
    // skriver om `gsap` till en url med hash — den hämtas ur laddade resurser.
    const url = performance.getEntriesByType('resource').map((r) => r.name).find((n) => /gsap/.test(n))
    const { gsap } = await import(url)
    const fore = noder.filter((n) => gsap.isTweening(n) || gsap.isTweening(n.scale)).length
    for (const t of timers) clearTimeout(t)
    timers.clear()
    spel.destroy(ctx)
    return { noder: noder.length, fore, efter: noder.filter((n) => gsap.isTweening(n) || gsap.isTweening(n.scale)).length }
  })
  console.log(`inre-tweens: ${kvar.fore} levande av ${kvar.noder} före exit → ${kvar.efter} EFTER exit (ska vara 0)`)
  await page.waitForTimeout(900)

  console.log(fel.length ? `✗ ${fel.length} konsolfel:` : '✓ 0 konsolfel')
  for (const f of fel.slice(0, 12)) console.log('   ' + f)
  console.log('bilder: .test-shots/kompis-*.png')
} finally {
  await browser.close()
}
