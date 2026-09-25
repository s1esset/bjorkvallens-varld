// _popcorngaster.mjs — förhandsbild av popcornkalasets gäster (src/games/popcornkalaset/gaster.js).
//
//   node scripts/_popcorngaster.mjs [--url http://localhost:5173]
//
// Kräver dev-servern. Ritar på en EGEN Pixi-duk ovanpå appen (vite skriver om 'pixi.js' via
// `_grodbild-pixi.js`, så gästerna och duken delar en Pixi-instans) — spelet behöver alltså
// inte vara registrerat. Bilder i .test-shots/_popcorngaster_*.png:
//   rad        alla sex typer på en lång soffa, hungriga, tittar mot grytan t.v.
//   jubel      alla sex mitt i jublet
//   mums       popcornet i luften på väg till munnen · mums2 = tuggan
//   knaprigt   ett BRÄNT popcorn, mitt i reaktionen
//   drag3      en omgång dragGaster(n=3) på spelets riktiga PLATSER · drag5 = alla fem platser
// Sist: spam (tätt anropade metoder), destroy() på alla, ALLA metoder en gång till, och en
// räkning av gsap-tweens som fortfarande riktar sig mot gästernas noder (måste vara 0).
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const url = opt('--url', 'http://localhost:5173')
mkdirSync('.test-shots', { recursive: true })

const fel = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 240)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 240)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.waitForTimeout(500)

  await page.evaluate(async () => {
    const PIXI = await import('/scripts/_grodbild-pixi.js')
    const G = await import('/src/games/popcornkalaset/gaster.js')
    const M = await import('/src/games/popcornkalaset/matt.js')
    // SPELETS gsap-instans (en nyimporterad kopia har en egen tidslinje och ser ingenting).
    const gsapUrl = performance.getEntriesByType('resource').map((r) => r.name).find((n) => /deps\/gsap\.js/.test(n))
    const gsapMod = gsapUrl ? await import(gsapUrl) : null
    const gsap = gsapMod?.gsap || gsapMod?.default || null

    const app = new PIXI.Application()
    await app.init({ width: 1280, height: 720, background: 0xf3e3c8, antialias: true })
    app.canvas.style.cssText = 'position:fixed;left:0;top:0;z-index:99999'
    document.body.appendChild(app.canvas)

    const timers = new Set()
    const later = (d, fn) => {
      const id = setTimeout(() => { timers.delete(id); fn() }, d * 1000)
      timers.add(id)
      return { kill: () => clearTimeout(id) }
    }
    let ljud = []
    const audio = {
      sample: (k) => { ljud.push(k); return true },
      sfx: (k) => { ljud.push('sfx:' + k) },
      tone: () => {},
    }

    const bak = new PIXI.Container()
    const gastLager = new PIXI.Container()
    const fram = new PIXI.Container()
    const golvLager = new PIXI.Container()
    app.stage.addChild(bak, gastLager, fram, golvLager)

    // En enkel soffa i spelets mått (bak = rygg, fram = sitsens framkant + bord + skålar).
    const ritaRum = (x0, x1, medBord) => {
      bak.removeChildren().forEach((c) => c.destroy())
      fram.removeChildren().forEach((c) => c.destroy())
      const b = new PIXI.Graphics()
      b.rect(0, 0, 1280, 650).fill(0xf3e3c8)
      b.rect(0, 650, 1280, 70).fill(0xb98a5e)
      b.roundRect(x0, M.SOFFA.rygg, x1 - x0, M.SOFFA.sits - M.SOFFA.rygg + 20, 26).fill(0x7d5ba6)
      bak.addChild(b)
      const f = new PIXI.Graphics()
      f.roundRect(x0 - 10, M.SOFFA.sits, x1 - x0 + 20, 22, 10).fill(0x9373bd) // sitsdynans ovansida
      f.rect(x0, M.SOFFA.sits + 18, x1 - x0, 80).fill(0x6a4b93) // sitsens front
      if (medBord) {
        f.rect(M.BORD.x0, M.BORD.yta, M.BORD.x1 - M.BORD.x0, M.BORD.tjock).fill(0x8a5a35)
        for (const s of M.SKAL) {
          f.moveTo(s.x - s.kantB / 2, s.kant).lineTo(s.x + s.kantB / 2, s.kant)
            .lineTo(s.x + s.bottenB / 2, s.botten).lineTo(s.x - s.bottenB / 2, s.botten).closePath().fill(0xd8e8f5)
          f.ellipse(s.x, s.kant, s.kantB / 2, 10).fill(0xfff4d6)
        }
        // grytan t.v. — det gästerna tittar på
        f.roundRect(270, 390, 200, 90, 16).fill(0x9aa3ad)
      }
      fram.addChild(f)
    }

    const alla = []
    const radPlatser = G.POOL.map((typ, i) => ({ typ, plats: { id: 'rad' + i, x: 110 + i * 212, y: M.SOFFA.sits, skal: i % 3 } }))
    ritaRum(0, 1280, false)
    for (const { typ, plats } of radPlatser) {
      const g = G.skapaGast(typ, plats, { later, audio, rng: Math.random })
      gastLager.addChild(g.view)
      g.hungrig()
      g.titta(360, 420)
      alla.push(g)
    }
    app.ticker.add((t) => { for (const g of alla) g.tick(t.deltaMS) })

    window.__pg = { G, M, app, gsap, later, audio, alla, gastLager, golvLager, ritaRum, timers, ljudLogg: () => ljud, nollaLjud: () => { ljud = [] } }
  })

  const shot = async (namn, vanta = 0) => {
    if (vanta) await page.waitForTimeout(vanta)
    const p = `.test-shots/_popcorngaster_${namn}.png`
    await page.screenshot({ path: p })
    console.log('  bild:', p)
  }

  await shot('rad', 1400)

  await page.evaluate(() => { window.__pg.ljudJubel = window.__pg.alla.map((g) => ({ typ: g.typ, ljud: g.jubla() })) })
  await shot('jubel', 240)
  console.log('  jubla() ->', JSON.stringify(await page.evaluate(() => window.__pg.ljudJubel)))
  await page.waitForTimeout(1900)

  await page.evaluate(() => { for (const g of window.__pg.alla) { g.hungrig(); g.mumsa() } })
  await shot('mums', 200)
  await shot('mums2', 330)
  await page.waitForTimeout(1300)

  await page.evaluate(() => { window.__pg.nollaLjud(); for (const g of window.__pg.alla) g.knaprigt() })
  await shot('knaprigt', 520)
  await page.waitForTimeout(1400)
  console.log('  ljud vid knaprigt:', JSON.stringify(await page.evaluate(() => window.__pg.ljudLogg())))

  // SPAM: tätt, som ett otåligt spel — inget får stapla eller kasta.
  await page.evaluate(async () => {
    const { alla } = window.__pg
    for (let i = 0; i < 30; i++) {
      for (const g of alla) {
        g.titta(Math.random() * 1280, Math.random() * 720)
        if (i % 3 === 0) g.mumsa()
        if (i % 7 === 0) g.knaprigt()
        if (i % 11 === 0) g.jubla()
        if (i % 5 === 0) g.hungrig()
      }
      await new Promise((r) => setTimeout(r, 16))
    }
  })
  await page.waitForTimeout(2200)
  const tweenAntal = await page.evaluate(() => window.__pg.gsap ? window.__pg.gsap.globalTimeline.getChildren(true, true, false).length : -1)
  console.log('  gsap-tweens efter spam + vila:', tweenAntal)

  // Spelets riktiga platser: en omgång med n=3 och en med alla fem.
  for (const n of [3, 5]) {
    const rad = await page.evaluate((n) => {
      const pg = window.__pg
      for (const g of pg.alla) g.destroy()
      pg.alla.length = 0
      pg.ritaRum(pg.M.SOFFA.x0, pg.M.SOFFA.x1, true)
      const drag = pg.G.dragGaster(Math.random, n)
      for (const { typ, plats } of drag) {
        const g = pg.G.skapaGast(typ, plats, { later: pg.later, audio: pg.audio, rng: Math.random })
        // Golvkudden står framför bordet — i spelet avgör index.js lagret.
        ;(plats.id === 'kudde' ? pg.golvLager : pg.gastLager).addChild(g.view)
        g.hungrig()
        g.titta(370, 420)
        pg.alla.push(g)
      }
      return drag.map((d) => `${d.typ}@${d.plats.id}(skål ${d.plats.skal})`)
    }, n)
    console.log(`  dragGaster(n=${n}):`, rad.join(' · '))
    await shot('drag' + n, 1200)
  }

  // Regeln: varje skål har en ägare, över många dragningar.
  const regel = await page.evaluate(() => {
    const { G } = window.__pg
    let brott = 0
    const typer = {}
    const platser = {}
    for (let i = 0; i < 2000; i++) {
      const d = G.dragGaster(Math.random, 3)
      const skalar = new Set(d.map((x) => x.plats.skal))
      if (skalar.size !== 3 || new Set(d.map((x) => x.typ)).size !== 3 || new Set(d.map((x) => x.plats.id)).size !== 3) brott++
      for (const x of d) { typer[x.typ] = (typer[x.typ] || 0) + 1; platser[x.plats.id] = (platser[x.plats.id] || 0) + 1 }
    }
    return { brott, typer, platser }
  })
  console.log('  2000 dragningar:', JSON.stringify(regel))

  // EXIT: samla alla noder FÖRE destroy, riv, anropa allt igen, räkna tweens mot noderna.
  const exit = await page.evaluate(async () => {
    const pg = window.__pg
    // Mitt i allt: jubel + popcorn i luften när rivningen kommer.
    for (const g of pg.alla) { g.jubla(); g.knaprigt(); g.mumsa() }
    await new Promise((r) => setTimeout(r, 120))
    const noder = new Set()
    const samla = (n) => {
      if (!n) return
      noder.add(n)
      if (n.scale) noder.add(n.scale)
      if (n.position) noder.add(n.position)
      if (n.pivot) noder.add(n.pivot)
      for (const c of n.children || []) samla(c)
    }
    for (const g of pg.alla) samla(g.view)
    for (const g of pg.alla) g.destroy()
    for (const g of pg.alla) g.destroy() // två gånger
    for (const g of pg.alla) {
      g.hungrig(); g.titta(10, 10); g.jubla(); g.mumsa(); g.knaprigt(); g.tick(16)
    }
    await new Promise((r) => setTimeout(r, 2500)) // låt varje later() hinna brinna av
    let levande = 0
    if (pg.gsap) {
      for (const t of pg.gsap.globalTimeline.getChildren(true, true, false)) {
        const mal = t.targets?.() || []
        if (mal.some((m) => noder.has(m))) levande++
      }
    }
    return { noder: noder.size, levande, gsap: !!pg.gsap }
  })
  console.log('  exit:', JSON.stringify(exit))
  await shot('exit', 300)

  console.log(fel.length ? `  ✗ ${fel.length} konsolfel:\n     ${fel.slice(0, 8).join('\n     ')}` : '  ✓ 0 konsolfel (inkl. spam, destroy ×2 och anrop efter destroy)')
} finally {
  await browser.close()
}
