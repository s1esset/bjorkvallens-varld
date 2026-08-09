// Ägarbytet i zackes-biltvatt: riggen byggs och rivs om och om igen, en gång per bil.
//
// Harnessens standardcykel tvättar aldrig en bil färdigt, så `_makeOwner` körs EN gång
// och bytet testas aldrig. Det är just där riggen kan läcka: `removeChildren().destroy()`
// river displayträdet men inte gsap-tweensen, och en andning som skriver `view.scale`
// på en riven Container kastar varje bildruta.
//
// Sonden kallar `_makeOwner` direkt via window.__barnspel.game (DEV), växlar mellan
// Bobo-bilar (n%3===0) och djur-bilar, lämnar sedan spelet och läser gamelogs egen
// `tween-lacka`-dom plus konsolfelen.
//
//   node scripts/_agarprobe.mjs [antal-byten]
import { chromium } from 'playwright'

const BYTEN = Number(process.argv[2] || 12)
const ID = 'zackes-biltvatt'
const url = 'http://localhost:5173'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
  await page.waitForTimeout(1500)

  const har = await page.evaluate(() => typeof window.__barnspel?.game?._makeOwner === 'function')
  if (!har) throw new Error('window.__barnspel.game._makeOwner saknas — kör dev-servern (npm run dev)')

  // Levande GSAP-tweens, läst ur gamelogs `render/prov`. Det är MÄTPUNKTEN: en rigg
  // som rivs utan `destroy()` lämnar en oändlig andnings-tween och en delayedCall som
  // bokar om sig själv, alltså ett antal som VÄXER per Bobo-bil. gamelogs egen
  // `tween-lacka` ser dem INTE — den dömer bara tweens vars mål har `.destroyed`,
  // och andningens mål är `view.scale` (en ObservablePoint utan den flaggan).
  const tweenAntal = async () => {
    const t = await page.evaluate(() => (window.__gamelog ? window.__gamelog.snapshot().timeline : []))
    const prov = t.filter((r) => r.cat === 'render' && r.event === 'prov')
    return prov.length ? prov[prov.length - 1].d.tweens : -1
  }

  const fore = await tweenAntal()

  // Byt ägare gång på gång och låt varje rigg hinna starta sina tweens (andning,
  // blink) innan nästa byte river den.
  for (let i = 0; i < BYTEN; i++) {
    await page.evaluate((n) => window.__barnspel.game._makeOwner(n), i)
    await page.waitForTimeout(260)
  }
  await page.waitForTimeout(900) // låt minst ett prov till hinna skrivas
  const efter = await tweenAntal()
  const efterByten = fel.length
  const boboByten = Array.from({ length: BYTEN }, (_, i) => i).filter((n) => n % 3 === 0).length
  console.log(`  ${BYTEN} agarbyten (varav ${boboByten} Bobo): ${efterByten} konsolfel`)
  console.log(`  levande gsap-tweens:       ${fore} -> ${efter}  (${efter - fore >= 0 ? '+' : ''}${efter - fore})`)

  // Lämna mitt i den sist byggda riggens vilo-animation.
  await page.evaluate((n) => window.__barnspel.game._makeOwner(n), 0)
  await page.waitForTimeout(120)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1200)

  const logg = await page.evaluate(() => (window.__gamelog ? window.__gamelog.snapshot() : null))
  const fynd = (logg?.fynd || []).filter((f) => f.niva === 'fel')
  const leak = (logg?.fynd || []).filter((f) => f.typ === 'tween-lacka')

  console.log(`  exit mitt i riggens vila:  ${fel.length - efterByten} nya konsolfel`)
  console.log(`  gamelog fel-niva:          ${fynd.length}`)
  console.log(`  tween-lacka:               ${leak.length}${leak.length ? ' — ' + JSON.stringify(leak[0]).slice(0, 260) : ''}`)
  for (const f of fel.slice(0, 6)) console.log(`    ! ${f}`)

  // Domen ligger på TILLVÄXTEN, inte på noll. Läckan är 2 tweens per Bobo-rigg
  // (andningen + den självbokande blinkningen), så tröskeln skalar med antalet
  // Bobo-byten. Uppmätt: utan `_kar.destroy()` 10 → 18 (+8 på 4 Bobo-bilar),
  // med den 10 → 8. Övriga spelanimationer rör sig på ±2 i samma fönster.
  const vaxer = efter - fore >= boboByten
  const ok = fel.length === 0 && leak.length === 0 && !vaxer
  if (vaxer) console.log(`  ✗ tweenantalet VAXER (+${efter - fore} pa ${boboByten} Bobo-bilar) — riggen rivs inte vid agarbyte`)
  console.log(ok ? '\n  ✓ ren' : '\n  ✗ fynd')
  process.exitCode = ok ? 0 : 1
} finally {
  await browser.close()
}
