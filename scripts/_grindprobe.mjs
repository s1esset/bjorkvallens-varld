// SOND + BILD: föräldra-grindens utvägar, och menyns uppdateringsknapp.
//
// Ägarrapport 2026-08-21: "avbryt-knappen på föräldra-låset är för liten och svår att se /
// träffa, barnet blir fast på den skärmen" + "man ska inte behöva hålla in en knapp för att
// uppdatera". Båda halvorna går att mäta, och grinden går INTE att bedöma i tal — den måste
// ses, så sonden sparar också en bild.
//
// Mäter:
//   ⓵ avbryt-knappens träffyta ur den RITADE geometrin (`getBounds()`), mot P0:s ≥96 px
//   ⓶ att ett riktigt mustryck PÅ knappen stänger grinden (resolve = false)
//   ⓷ att ett tryck UTANFÖR kortet stänger den
//   ⓸ KONTROLLARM: ett tryck MITT PÅ kortet får INTE stänga den (annars mäter ⓷ bara att
//      allt stänger allt, och kortet vore lika oanvändbart som förut)
//   ⓹ att håll-knappen fortfarande KRÄVER 2,5 s (grinden får inte ha blivit svagare)
//   ⓺ menyns versionspill: öppnar den en grind, eller kör den rakt på?
//
//   node scripts/_grindprobe.mjs [--bild ut.png]
import { chromium } from 'playwright'

const opt = (f, d) => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : d)
const url = opt('--url', 'http://localhost:5173')
const BILD = opt('--bild', '.test-shots/_grind.png')

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const fel = new Map()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => { const k = (e.message || '').slice(0, 90); fel.set(k, (fel.get(k) || 0) + 1) })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(1200)

  // Grinden öppnas direkt via tjänsten — då mäter sonden GRINDEN, inte vägen dit.
  const oppna = async () => {
    await page.evaluate(() => {
      window.__svar = 'oppen'
      window.__barnspel.gate.open({ title: 'Endast för vuxna' }).then((v) => { window.__svar = v })
    })
    await page.waitForTimeout(500)
  }
  const svar = () => page.evaluate(() => window.__svar)

  await oppna()
  await page.screenshot({ path: BILD })
  console.log(`  bild: ${BILD}`)

  // ⓵ Avbryt-knappens FAKTISKA yta, läst ur scenen (inte ur ett tal i sonden).
  const geo = await page.evaluate(() => {
    const hitta = (n, ut = []) => {
            // Matchar BÅDA armarna: HEADs bara Text ('✖  Avbryt') och den nya knappens etikett.
      if (n.children?.some?.((c) => typeof c.text === 'string' && c.text.includes('Avbryt'))) ut.push(n)
      if (typeof n.text === 'string' && n.text.includes('Avbryt') && n.eventMode === 'static') ut.push(n)
      for (const c of n.children || []) hitta(c, ut)
      return ut
    }
    const rot = window.__barnspel.gateLayer || window.__barnspel.app.stage
    // MINSTA träffen, inte den första. Sökningen går uppifrån och ned, så roten (som har
    // avbryt-texten någonstans under sig) matchade först och rapporterade backdropens
    // 3680×3120 px som "avbryt-ytan" — ett tal som ser praktfullt ut och mäter fel sak.
    const k = hitta(rot).sort((x, y) => {
      const bx = x.getBounds()
      const by = y.getBounds()
      return bx.width * bx.height - by.width * by.height
    })[0]
    if (!k) return null
    const b = k.getBounds()
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
  })
  console.log(`  ⓵ avbryt-yta: ${geo ? `${geo.w}×${geo.h} px vid (${geo.x}, ${geo.y}) — P0 ≥96: ${Math.min(geo.w, geo.h) >= 96 ? 'JA' : 'NEJ ⚠️'}` : 'hittades inte ⚠️'}`)

  // ⓸ KONTROLLARM FÖRST: mitt på kortet ska INTE stänga.
  await page.mouse.click(640, 300)
  await page.waitForTimeout(500)
  console.log(`  ⓸ kontroll · tryck MITT PÅ kortet: ${(await svar()) === 'oppen' ? 'grinden står kvar ✓' : 'STÄNGDE ⚠️'}`)

  // ⓷ Utanför kortet.
  await page.mouse.click(90, 90)
  await page.waitForTimeout(600)
  console.log(`  ⓷ tryck UTANFÖR kortet: ${(await svar()) === false ? 'stänger (svar=false) ✓' : 'stängde INTE ⚠️ (' + (await svar()) + ')'}`)

  // ⓶ Riktigt tryck på avbryt-knappen.
  await oppna()
  if (geo) {
    await page.mouse.click(geo.x + geo.w / 2, geo.y + geo.h / 2)
    await page.waitForTimeout(600)
    console.log(`  ⓶ tryck PÅ avbryt: ${(await svar()) === false ? 'stänger (svar=false) ✓' : 'stängde INTE ⚠️ (' + (await svar()) + ')'}`)
  }

  // ⓹ Håll-kravet ska vara oförändrat: ett kort tryck får inte släppa igenom.
  await oppna()
  await page.mouse.move(640, 350)
  await page.mouse.down()
  await page.waitForTimeout(600)
  await page.mouse.up()
  await page.waitForTimeout(400)
  const kort = await svar()
  await page.mouse.move(640, 350)
  await page.mouse.down()
  await page.waitForTimeout(2900)
  await page.mouse.up()
  await page.waitForTimeout(500)
  console.log(`  ⓹ håll 0,6 s: ${kort === 'oppen' ? 'stänger inte ✓' : 'SLÄPPTE IGENOM ⚠️'} · håll 2,9 s: ${(await svar()) === true ? 'öppnar (svar=true) ✓' : 'öppnade INTE ⚠️ (' + (await svar()) + ')'}`)

  // ⚠️ STÄDA FÖRST. En grind som INTE stängdes i en tidigare arm ligger kvar med sin
  // heltäckande backdrop, och nästa arm klickar då på den i stället för på knappen den
  // tror att den träffar. Precis det hände i kontrollarmen: HEAD rapporterade "0 anrop,
  // 0 grindar" för en knapp som fungerar — sonden nådde den aldrig.
  await page.evaluate(() => { window.__barnspel.gateLayer.removeChildren() })
  await page.waitForTimeout(300)

  // ⓺ Versionspillen i menyn: ETT tryck, ingen grind.
  await page.evaluate(() => {
    window.__uppd = 0
    const s = window.__barnspel
    const o = s.forceUpdate
    s.forceUpdate = (...a) => { window.__uppd++; return Promise.resolve('aktuell') }
    window.__gate = 0
    const g = window.__barnspel.gate
    const oo = g.open.bind(g)
    g.open = (...a) => { window.__gate++; return oo(...a) }
  })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(700)
  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(1200)
  await page.mouse.click(1280 - 62 - 24, 720 - 30 - 24)
  await page.waitForTimeout(1200)
  const r = await page.evaluate(() => ({ uppd: window.__uppd, gate: window.__gate }))
  console.log(`  ⓺ versionspillen: forceUpdate kallad ${r.uppd} gång(er) · grind öppnad ${r.gate} gång(er) ${r.uppd === 1 && r.gate === 0 ? '✓' : '⚠️'}`)

  console.log('\n  KONSOLFEL:')
  for (const [m, n] of fel) console.log(`  ×${n} ${m}`)
  if (!fel.size) console.log('  (inga)')
} finally {
  await browser.close()
}
