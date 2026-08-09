// EN BILD PER NIVÅ — `npm run test` visar alltid nivå 0, och det är ett hål.
//
// Många spel byter stämning, tid på dygnet, bana eller svårighet med nivån
// (`lagerelden` går från `sunset` till `night` vid nivå 2, `golvet-ar-lava` breddar
// floden, `blixt-och-dunder` får fler lampor). Allt det är osynligt för testsviten,
// som startar varje spel på ett tomt spardata. En regression som bara finns på
// nivå 3 kan alltså leva hur länge som helst bakom en grön bock.
//
// Sonden skriver `highestLevel` rakt in i spardatat INNAN spelet monteras och tar
// en bild per nivå, så nivåerna går att jämföra sida vid sida.
//
//   node scripts/_nivabild.mjs lagerelden --nivaer 0,2 [--vanta 2500]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const id = args[0] && !args[0].startsWith('--') ? args[0] : null
if (!id) {
  console.error('användning: node scripts/_nivabild.mjs <id> [--nivaer 0,2,4] [--vanta 2500]')
  process.exit(2)
}
const nivaer = opt('--nivaer', '0,2').split(',').map((n) => parseInt(n, 10))
const vanta = parseInt(opt('--vanta', '2500'), 10)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  console.log(`\n  Nivåbilder — ${id}\n`)
  for (const niva of nivaer) {
    // Skriv nivån genom APPENS EGEN SaveService och ladda om: GameHost läser
    // progressen när spelet MONTERAS, så en ändring efter monteringen får ingen effekt.
    //
    // Att peta i localStorage direkt fungerar INTE, och det var första försöket:
    // i en färsk webbläsarkontext finns ingen sparfil ännu när sonden hinner fram —
    // profilen ligger i minnet med en debouncad skrivning framför sig. Sonden skrev
    // då till ett tomt dokument, laddade om, och spelet startade på nivå 0 utan ett
    // enda felmeddelande. `profiles` är dessutom en ARRAY, inte en uppslagstabell.
    const skrev = await page.evaluate(({ gid, n }) => {
      const save = window.__barnspel.save
      let ok = false
      save.update((d) => {
        const prof = d.profiles.find((p) => p.id === d.activeProfileId) || d.profiles[0]
        if (!prof) return
        prof.games = prof.games || {}
        prof.games[gid] = { ...(prof.games[gid] || { unlocked: true, stars: 0, custom: {} }), unlocked: true, highestLevel: n }
        ok = true
      })
      save.flush()
      return ok
    }, { gid: id, n: niva })
    if (!skrev) console.log(`  ⚠ ingen profil att skriva nivå ${niva} i`)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
    await page.waitForTimeout(vanta)

    const fil = `.test-shots/_niva-${id}-${niva}.png`
    await page.screenshot({ path: fil })
    const verklig = await page.evaluate(() => {
      const g = window.__barnspel.game
      return g?._level ?? g?.level ?? null
    })
    console.log(`  nivå ${niva}${verklig != null && verklig !== niva ? ` (spelet rapporterar ${verklig})` : ''} → ${fil}`)
  }

  if (errors.length) {
    console.log('\n  konsolfel:\n  ' + errors.slice(0, 6).join('\n  '))
    kod = 1
  } else {
    console.log('\n  0 konsolfel')
  }
  console.log('')
} catch (e) {
  console.error(e)
  kod = 2
} finally {
  await browser.close()
}
process.exit(kod)
