// V5: bajs-och-kiss faller BARA i full test:all. Felet är last-/timingberoende —
// loggen visar `lang-ruta 100 ms` + `fysik/svalt` precis före
// `Cannot read properties of null (reading 'y')` kastat inifrån GSAP.
//
// I stället för att köra 71 spel för att framkalla lasten struparen sonden CPU:n via
// CDP (Emulation.setCPUThrottlingRate) och lämnar spelet vid en rad olika tidpunkter,
// så teardown-kapplöpningen förlorar på samma sätt som under full parallell körning.
//
//   node scripts/_bajsprobe.mjs [strypfaktor]      default 6
import { chromium } from 'playwright'

const ID = 'bajs-och-kiss'
const RATE = Number(process.argv[2] || 6)
const EXIT_VID = process.argv[3] ? process.argv[3].split(',').map(Number) : [700, 1200, 1800, 2400, 3000, 3800, 4600, 5600]
const RONDER = Number(process.argv[4] || 1) // felet är slumpberoende — kör flera varv

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  let totalt = 0
  let traffar = 0
  let korningar = 0
  const stackar = new Set()
  for (let rond = 1; rond <= RONDER; rond++)
  for (const vid of EXIT_VID) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    const fel = []
    page.on('console', (m) => {
      if (m.type() === 'error') fel.push(m.text().slice(0, 150))
    })
    page.on('pageerror', (e) => {
      // Stacken är det som pekar ut ANROPSSTÄLLET — utan den vet man bara att GSAP tickade.
      const ram = String(e.stack || '')
        .split('\n')
        .slice(1, 5)
        .map((r) => r.trim().replace('http://localhost:5173', ''))
        .join(' | ')
      fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 90) + (ram ? '\n        ' + ram : ''))
    })

    const cdp = await page.context().newCDPSession(page)
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    // Stämpla VARJE tween med sitt anropsställe. Felet slår till när en FÖRDRÖJD tween
    // initieras (GSAP läser då startvärdet ur ett redan rivet mål), så det räcker inte
    // att kolla målet när tweenen skapas — vi måste kunna slå upp stacken efteråt.
    await page.evaluate(async () => {
      const { gsap } = await import('/node_modules/gsap/index.js')
      window.__tw = []
      for (const m of ['to', 'from', 'fromTo']) {
        const orig = gsap[m].bind(gsap)
        gsap[m] = (...args) => {
          const tw = orig(...args)
          try {
            tw._skapad = String(new Error().stack || '')
              .split('\n')
              .filter((r) => r.includes('/src/'))
              .slice(0, 3)
              .map((r) => r.trim().replace('http://localhost:5173', ''))
              .join(' | ')
            window.__tw.push(tw)
          } catch {
            /* noop */
          }
          return tw
        }
      }
    })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1000)

    // Strypningen slås på FÖRST när spelet är igång — annars orkar det inte starta.
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE })

    // Kasta: dra från bajset i handen och släpp mot pottan.
    const p = await page.evaluate(async (gid) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      const h = g._held
      return h && !h.destroyed ? { x: h.x, y: h.y } : null
    }, ID)
    if (p) {
      await page.mouse.move(p.x, p.y)
      await page.mouse.down()
      await page.mouse.move(p.x - 120, p.y + 70, { steps: 6 })
      await page.mouse.up()
    }

    await page.waitForTimeout(vid)
    // Lämna spelet mitt i vad som än pågår.
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    // Skanna DIREKT: 1,8 s senare har den skyldiga tweenen ofta hunnit bli klar.
    await page.waitForTimeout(120)
    const levande = await page.evaluate(() => {
      const ut = []
      for (const tw of window.__tw || []) {
        if (!tw.isActive?.()) continue
        const mal = tw.targets?.() || []
        const dott = mal.some((t) => {
          if (!t || typeof t !== 'object') return false
          if (t.destroyed === true) return true
          try {
            void t.y
            return false
          } catch {
            return true
          }
        })
        ut.push((dott ? 'RIVET ' : 'ok    ') + (mal[0]?.constructor?.name || '?') + ' ← ' + (tw._skapad || '?'))
      }
      return ut
    })
    await page.waitForTimeout(1700)

    // Vilka tweens lever fortfarande OCH pekar på ett rivet mål? Skriv ut var de skapades.
    const kvar = await page.evaluate(() => {
      const dott = (t) => {
        if (!t || typeof t !== 'object') return false
        if (t.destroyed === true) return true
        try {
          void t.x
          void t.y
          return false
        } catch {
          return true
        }
      }
      const ut = []
      for (const tw of window.__tw || []) {
        if (!tw.isActive?.() && !(tw.progress?.() < 1 && tw.paused?.() === false)) continue
        const mal = tw.targets?.() || []
        if (mal.some(dott)) ut.push(tw._skapad || '(okänt ställe)')
      }
      return [...new Set(ut)]
    })

    totalt += fel.length
    korningar++
    if (fel.length) traffar++
    for (const f of fel) stackar.add(f)
    const unika = [...new Set(fel)]
    if (fel.length)
    console.log(
      `  r${rond} exit efter ${String(vid).padStart(4)} ms (cpu ×${RATE}): ${String(fel.length).padStart(3)} fel` +
        (levande.length ? '\n      AKTIVA VID AVHOPP:\n        ' + levande.join('\n        ') : '') +
        (kvar.length ? '\n      LEVER 1,8 s EFTER AVHOPP:\n        ' + kvar.join('\n        ') : '') +
        (unika.length ? `\n      ${unika.slice(0, 2).join('\n      ')}` : ''),
    )
    await page.close()
  }
  console.log(`\n  ► ${traffar} av ${korningar} avhopp gav fel (${totalt} konsolfel totalt)`)
  for (const s of [...stackar].slice(0, 3)) console.log('    ' + s)
  console.log('')
} finally {
  await browser.close()
}
