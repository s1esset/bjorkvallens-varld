// Mäter OMSPELNING: öppnar ett spel n gånger med en FÄRSK sida varje gång (egen webbläsarkontext =
// ny Math.random OCH nollställd spardata, alltså samma nivå varje gång) och läser av ett uttryck
// på spelinstansen. Ger "olika: k av n" — k = 1 betyder att spelet bygger samma sak varje gång.
//
//   node scripts/_variationprobe.mjs <id> --expr "<js-uttryck på g>" [--n 6] [--url http://localhost:5173]
//                                    [--klick x,y]… [--vanta ms] [--tid ms]
//
//   g   = window.__barnspel.game (den KÖRANDE modulinstansen)     ctx = window.__barnspel.ctx
//   --expr   uttrycket, t.ex. "g._target"  ·  "[g._basket.x, g._basket.y]"  ·  "g._vader?.id"
//   --klick  tryck i designkoordinater (1280x720) INNAN avläsningen — för spel vars layout byggs
//            först när rundan startar. Kan upprepas: --klick 640,360 --klick 300,250
//   --vanta  ms att vänta efter montering/klick innan avläsning (standard 1200, som harnessen)
//   --tid    ms att vänta på att uttrycket ger ett värde (!== undefined) (standard 5000)
//
// Kod 0 alltid när mätningen gick att göra (siffran är resultatet, inte ett pass/fail);
// kod 1 om sidan gav konsolfel/uttrycket kastade, 2 vid fel användning.
//
// ⚠️ Kontrollarmen först: kör mot ett uttryck som är känt FAST (olika: 1 av n) OCH ett som är känt
// slumpat (olika > 1) innan du läser ett nytt spels tal — se rapporten för U1.
// ⚠️ Kör aldrig två webbläsarsonder samtidigt, och rör inte src/ medan den kör (HMR laddar om).
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const id = args[0]
const opt = (namn, def) => {
  const i = args.indexOf(namn)
  return i >= 0 ? args[i + 1] : def
}
const flera = (namn) => args.flatMap((a, i) => (a === namn ? [args[i + 1]] : []))
const expr = opt('--expr', null)
const n = Math.max(1, Number(opt('--n', 6)))
const url = opt('--url', 'http://localhost:5173')
const vanta = Number(opt('--vanta', 1200))
const tid = Number(opt('--tid', 5000))
const klick = flera('--klick').map((s) => s.split(',').map(Number))

if (!id || id.startsWith('--') || !expr || klick.some((k) => k.length !== 2 || k.some((v) => !Number.isFinite(v)))) {
  console.error('usage: node scripts/_variationprobe.mjs <id> --expr "<js-uttryck på g>" [--n 6] [--url …] [--klick x,y]… [--vanta ms] [--tid ms]')
  process.exit(2)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const varden = []
const fel = []
try {
  for (let i = 0; i < n; i++) {
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    try {
      const page = await ctxB.newPage()
      page.on('console', (m) => {
        if (m.type() === 'error') fel.push(`#${i + 1} ${m.text().slice(0, 200)}`)
      })
      page.on('pageerror', (e) => fel.push(`#${i + 1} PAGEERROR ${(e.message || String(e)).slice(0, 200)}`))

      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
      await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
      await page.waitForFunction(
        (gid) => window.__barnspel.game?.id === gid && !!window.__barnspel.ctx?.stage,
        id,
        { timeout: 20000 },
      )
      await page.waitForTimeout(vanta)

      for (const [x, y] of klick) {
        await page.evaluate(({ x, y }) => {
          const cv = document.querySelector('canvas')
          const r = cv.getBoundingClientRect()
          const sk = Math.min(r.width / 1280, r.height / 720)
          const ox = r.left + (r.width - 1280 * sk) / 2
          const oy = r.top + (r.height - 720 * sk) / 2
          for (const t of ['pointerdown', 'pointerup']) {
            cv.dispatchEvent(new PointerEvent(t, {
              clientX: ox + x * sk, clientY: oy + y * sk,
              pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true,
            }))
          }
        }, { x, y })
        await page.waitForTimeout(260)
      }
      if (klick.length) await page.waitForTimeout(vanta)

      // Läs av; ger uttrycket undefined (spelet inte klart) provar vi om till --tid gått.
      const svar = await page.evaluate(async ({ uttryck, gransMs }) => {
        const t0 = performance.now()
        let senast
        for (;;) {
          try {
            const g = window.__barnspel.game
            const ctx = window.__barnspel.ctx
            senast = new Function('g', 'ctx', `return (${uttryck})`)(g, ctx)
            if (senast !== undefined) return { ok: true, v: JSON.stringify(senast) }
          } catch (e) {
            if (performance.now() - t0 > gransMs) return { ok: false, fel: String(e?.message || e) }
          }
          if (performance.now() - t0 > gransMs) return { ok: true, v: 'undefined' }
          await new Promise((r) => setTimeout(r, 150))
        }
      }, { uttryck: expr, gransMs: tid })
      if (svar.ok) varden.push(svar.v)
      else {
        varden.push('FEL: ' + svar.fel)
        fel.push(`#${i + 1} uttrycket kastade: ${svar.fel}`)
      }
    } finally {
      await ctxB.close()
    }
  }
} finally {
  await browser.close()
}

varden.forEach((v, i) => console.log(`#${i + 1}  ${v}`))
const unika = new Set(varden)
console.log(`olika: ${unika.size} av ${varden.length}`)
if (unika.size === 1 && varden[0] === 'undefined') console.log('⚠️ uttrycket gav undefined varje gång — fel fält eller spelet monterades aldrig (mäter ingenting)')
if (fel.length) {
  console.log(`konsolfel/kast: ${fel.length}`)
  fel.slice(0, 8).forEach((f) => console.log('  ' + f))
}
process.exit(fel.length ? 1 : 0)
