// LEVANDE TWEENS EFTER RIVNING — mäter det `npm run test` är blint för.
//
// `unika-knytt`s tre städ-loopar (`stadTrad` · `stadNod` · `stadKnytt`) slogs ihop till
// `lib/feedback.js:stadFx`. Den refaktorn kan misslyckas HELT TYST: gsap skriver vidare på
// en nollad transform och Pixi v8 kastar ingenting, så noll konsolfel bevisar ingenting
// (uppmätt i bygg-en-kompis: 2 levande tweens efter rivning, 0 fel i BÅDA armarna).
//
//   node scripts/_stadprobe.mjs [--spel unika-knytt] [--spela 3]
//   BARLAST=1 node scripts/_stadprobe.mjs        ← barlastarm, ska ge LÄCKA
//
// Barlasten kräver EN rad i lib/feedback.js, först i `stadFx`, och den ska tas bort igen:
//   if (globalThis.__BARLAST_STADFX) return
// Uppmätt 2026-09-01 med den raden inne: barlast 9 → 7 levande (läcka), riktig kod 9 → 0.
//
// TVÅ inbyggda armar, båda nödvändiga:
//  ⓵ talet FÖRE rivningen måste vara > 0, annars har sonden inte mätt någonting alls.
//  ⓶ `BARLAST=1` slår ut `stadFx` — ger den samma svar som den riktiga koden mäter sonden
//     inte det den påstår. Sondens första version föll på precis det: den navigerade bort
//     och väntade 1,4 s, och då hade de korta tweenarna tagit slut av sig själva ändå.
//     Därför rivs spelet nu i SAMMA evaluate som mätningen, utan en enda bildruta emellan.
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const url = opt('--url', 'http://localhost:5173')
const spelId = opt('--spel', 'unika-knytt')
const spela = Number(opt('--spela', '3'))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  if (process.env.BARLAST) await page.evaluate(() => { globalThis.__BARLAST_STADFX = true })
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), spelId)
  await page.waitForFunction(() => !!window.__barnspel.game, null, { timeout: 20000 })
  await page.waitForTimeout(1200)

  // Spaken ligger på design (1160, 350) — utanför harnessens nio standardtryck (§1b), så
  // ceremonin nås aldrig av den vanliga körningen och måste tryckas för hand.
  await page.mouse.click(1160, 350)
  await page.waitForTimeout(1800)
  for (let i = 0; i < 6; i++) { await page.mouse.click(600 + i * 18, 330); await page.waitForTimeout(220) }
  for (let i = 0; i < 5; i++) { await page.mouse.click(640, 330); await page.waitForTimeout(500) }
  await page.waitForTimeout(spela * 1000)

  const res = await page.evaluate(async () => {
    const s = window.__barnspel
    const rot = s.ctx?.stage || s.app.stage
    const alla = []
    ;(function ga(n, d) {
      if (!n || n.destroyed || d > 30) return
      alla.push(n)
      for (const c of n.children || []) ga(c, d + 1)
    })(rot, 0)

    // SPELETS gsap-instans. En nyimporterad kopia har en EGEN global tidslinje och
    // rapporterar 0 levande tweens oavsett vad som pågår.
    const gurl = performance.getEntriesByType('resource').map((r) => r.name).find((n) => /gsap/.test(n))
    const { gsap } = await import(gurl)
    // Handtagen ar HELA poangen: feedback.js hjalpare (liv/pop/squash/hop/wiggle/shake)
    // tweenar PROXY-objekt, som gsap.isTweening(noden) aldrig kan se. Matte man bara noden
    // hittade man 2 av 16 levande tweens — och barlastarmen gav da samma svar som riktig kod.
    // Livsmattet ar tw.parent: sant for LOPANDE och vantande, falskt for bade fardiga och
    // dodade (isActive() kan inte skilja dodad fran fardig — se _tweenprobe.mjs).
    const HANDTAG = ['_fxLiv', '_fxPopTl', '_fxSquashTl', '_fxWiggleTl', '_fxHopTl', '_fxShakeTw', '_wPuls']
    const lever = (n) => gsap.isTweening(n) || (n.scale && gsap.isTweening(n.scale)) || (n.position && gsap.isTweening(n.position)) || HANDTAG.some((h) => n[h] && n[h].parent)

    const fore = alla.filter(lever).length
    s.game.destroy(s.ctx)                      // ← rivningen, i samma tick som mätningen
    const kvar = alla.filter(lever)
    return { noder: alla.length, fore, efter: kvar.length, exempel: kvar.slice(0, 8).map((n) => n.constructor?.name || '?') }
  })

  const arm = process.env.BARLAST ? 'BARLAST (stadFx verkningslös)' : 'RIKTIG kod'
  console.log(`\n  arm                ${arm}`)
  console.log(`  noder i trädet     ${res.noder}`)
  console.log(`  levande FÖRE riv   ${res.fore}   ${res.fore === 0 ? '← KONTROLLARMEN FÖLL: sonden mätte ingenting' : '(kontrollarm OK)'}`)
  console.log(`  levande EFTER riv  ${res.efter}   ${res.efter === 0 ? '✓ städat' : '✗ läcka: ' + res.exempel.join(', ')}`)
  console.log(`  konsolfel          ${fel.length}`)
  for (const f of fel.slice(0, 8)) console.log('     ' + f)
  if (res.fore === 0) console.log('\n  ⚠ MÄTNINGEN MISSLYCKADES — "0 efter" betyder ingenting utan ett tal före.')
  else console.log(`\n  ${res.fore} → ${res.efter}`)
} finally {
  await browser.close()
}
