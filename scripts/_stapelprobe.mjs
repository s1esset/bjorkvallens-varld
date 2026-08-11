// Mäter hamburgerbygget genom att FAKTISKT BYGGA en burgare: tappar in lager ur hyllan,
// ett i taget, och läser av vad stapelns tyngd gör med underbullen.
//
//   node scripts/_stapelprobe.mjs [antal-lager] [--shot ut.png]
//
// `_bullprobe.mjs` mäter kroppen i isolering. Den här svarar på de tre frågor bara
// spelet kan svara på:
//   1. Trycks bullen faktiskt ihop när barnet staplar — eller når vikten aldrig fram?
//   2. GLAPPAR det mellan bullens ovansida och understa lagret när den sjunker?
//   3. Tickar något efter exit mitt i en vobbel?
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const lager = Number(args[0] || 8)
const iShot = args.indexOf('--shot')
const shot = iShot >= 0 ? args[iShot + 1] : '.test-shots/_stapelprobe.png'
const ID = 'hamburgerbygget'

const las = (page) =>
  page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('hamburgerbygget')
    const s = g._bottomBun?._soft
    const xs = s ? s.pts.slice(0, s.n).map((p) => p.x) : []
    const tot = g._stack.reduce((a, v) => a + (v._th || v._ing?.th || 40), 0)
    // Glappet: bullens ovansida mot understa lagrets underkant, båda i burgar-rymden.
    const under = g._stack[0]
    const glapp = under ? (under.y + (under._th || 40) / 2) - g._bunTopY() : 0
    return {
      lager: g._stack.length,
      tot,
      bunTop: g._bunTopY(),
      krona: s ? s.pts[0].y : null,
      bredd: xs.length ? Math.max(...xs) - Math.min(...xs) : null,
      rorelse: s ? s.pts.slice(0, s.n).reduce((a, p) => a + Math.abs(p.x - p.px) + Math.abs(p.y - p.py), 0) : null,
      glapp,
      stackTopY: g._stackTopY,
      topBunY: g._topBun?.y,
    }
  })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let fel = 0
const ok = (n, v, d = '') => { console.log(`  ${v ? '✓' : '✗'} ${n}${d ? ' · ' + d : ''}`); if (!v) fel++ }
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k) })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1200)

  const vila = await las(page)
  console.log(`\nvila · krona ${vila.krona.toFixed(1)} · bredd ${vila.bredd.toFixed(1)} · rorelse ${vila.rorelse.toFixed(3)}`)
  ok('tom burgare star HELT still', vila.rorelse < 0.01, `rorelse ${vila.rorelse.toFixed(3)}`)

  console.log('\nstaplar lager for lager (tap i hyllan = tap-fallback)')
  const spar = [vila]
  for (let i = 0; i < lager; i++) {
    // Hyllans fack: SHELF_Y 672, x 150 + n*120. Ett rent tryck staplar direkt.
    await page.mouse.click(150 + (i % 9) * 120, 672)
    await page.waitForTimeout(340)
    const s = await las(page)
    spar.push(s)
    console.log(`  ${String(s.lager).padStart(2)} lager (${String(s.tot).padStart(3)} px) · krona ${s.krona.toFixed(1)} · sank ${(s.krona - vila.krona).toFixed(1)} · bredd +${(s.bredd - vila.bredd).toFixed(1)} · glapp ${s.glapp.toFixed(2)}`)
  }
  // Hur länge KRYPER den efter sista lagret? Bröd som sätter sig långsamt är rätt,
  // men en burgare som glider i fem sekunder är en bugg.
  console.log('\n  sattning efter sista lagret:')
  let slut = null
  for (const ms of [500, 500, 500, 500, 1000, 1000]) {
    await page.waitForTimeout(ms)
    slut = await las(page)
    console.log(`    +${((spar.length && 0) || 0) + ms} ms · krona ${slut.krona.toFixed(2)} · rorelse ${slut.rorelse.toFixed(3)}`)
  }

  console.log('')
  ok('lagren staplades', slut.lager >= Math.min(lager, 6), `${slut.lager} lager`)
  const sank = slut.krona - vila.krona
  ok('bullen trycks ihop av stapeln', sank >= 4, `${sank.toFixed(1)} px`)
  const monoton = spar.every((s, i) => i === 0 || s.krona >= spar[i - 1].krona - 0.35)
  ok('och sjunker MONOTONT, lager for lager', monoton, spar.map((s) => (s.krona - vila.krona).toFixed(1)).join(' '))
  // ⚠️ INGET KRAV PÅ SIDOBUKTEN HÄR. Den är en förgrening, inte en jämn kurva: bredden
  // ligger inom ±1 px upp till ~0,8 i vikt och skjuter sedan ut ~11 px. Hyllan slumpas
  // varje start, så stapelns totala tjocklek (och därmed vikten) varierar mellan
  // körningar — ett krav på bukten hade flakat på slumpen, inte på koden. Den mäts i
  // `_bullprobe` där vikten är exakt 1,0. Här räcker det att den inte KRYMPER.
  ok('och blir aldrig smalare an i vila', slut.bredd >= vila.bredd - 1, `${vila.bredd.toFixed(1)} → ${slut.bredd.toFixed(1)} px`)
  const varstGlapp = Math.max(...spar.map((s) => Math.abs(s.glapp)))
  ok('INGET glapp mellan bulle och understa lagret', varstGlapp < 0.5, `storsta ${varstGlapp.toFixed(2)} px`)
  ok('bullen lugnar sig igen', slut.rorelse < 0.01, `rorelse ${slut.rorelse.toFixed(3)}`)

  await page.screenshot({ path: shot })
  console.log(`\n  bild: ${shot}`)

  // Exit MITT I en vobbel — bullen får inte tick a vidare efter att spelet lämnats.
  await page.mouse.click(150, 672)
  await page.waitForTimeout(60)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(700)
  const kvar = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('hamburgerbygget')
    return { alive: !!g._alive, soft: !!g._bottomBun?._soft }
  })
  ok('exit mitt i vobbeln stanger av bullen', !kvar.alive && !kvar.soft, `alive ${kvar.alive} · soft ${kvar.soft}`)
  ok('inga konsolfel', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}
console.log(fel === 0 ? '\nALLT GRONT\n' : `\n${fel} FEL\n`)
process.exit(fel ? 1 : 0)
