// SOND: hur många RUNDOR krävs för att appen ska hämta en ny version?
//
// Ägarrapport 2026-08-21: "jag har behövt uppdatera appen från huvudmenyn genom att alltid
// göra det 2 gånger i rad för att den ska uppdateras."
//
// Det går INTE att mäta på dev-servern — där finns ingen service worker alls. Sonden kör
// därför mot ett RIKTIGT bygge på `http://localhost:4173` (localhost räknas som säker
// kontext, så servicearbetaren registreras precis som på Pages), bygger om appen med en NY
// version medan sidan står uppe, och gör sedan ritualen om och om igen tills sidan laddar om.
//
// ⚠️ Sonden styr genom GRÄNSSNITTET, inte via `window.__barnspel` — den finns bara i
// dev-bygget. Det är egentligen en fördel: mätningen blir ägarens faktiska handling.
// Ritualen skiljer sig mellan armarna, och det är själva poängen:
//   HEAD  tryck på versionspillen → HÅLL grinden 2,5 s → tryck "Uppdatera" i dialogen
//   FIX   tryck på versionspillen (ett tryck, ingen grind, ingen dialog)
// Måttet är detsamma i båda: **hur många rundor innan sidan laddar om?**
//
// Före sonden (aldrig parallellt med annan webbläsartrafik):
//   npm run build && npx vite preview --port 4173
//
//   node scripts/_uppdatprobe.mjs [--arm head|fix] [--rundor 3] [--port 4173]
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const opt = (f, d) => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : d)
const PORT = opt('--port', '4173')
const ARM = opt('--arm', 'fix')
const RUNDOR = Number(opt('--rundor', '3'))
const url = `http://localhost:${PORT}/`
const PKG = 'package.json'

const las = () => JSON.parse(fs.readFileSync(PKG, 'utf8'))
const originalVersion = las().version
const skrivVersion = (v) => {
  const j = las()
  j.version = v
  fs.writeFileSync(PKG, JSON.stringify(j, null, 2) + '\n')
}

// Designrymden är 1280×720 och viewporten likaså, alltså 1:1.
const PILL = [1280 - 24 - 62, 720 - 24 - 30]
const GRIND_KNAPP = [640, 400] // ParentalGate på HEAD: btnY = cy + 40
const JA_KNAPP = [780, 430] // confirmDialog: yesBtn på (cx + 140, cy + 70)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const fel = new Map()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => { const k = (e.message || '').slice(0, 90); fel.set(k, (fel.get(k) || 0) + 1) })

  // VILKET bygge kör sidan? Vite hashar entry-chunkens filnamn, så namnet ÄR versionen.
  // Utan det här måttet mäter sonden bara att sidan laddade om — en omladdning som serverar
  // samma cachade bygge hade sett exakt likadan ut.
  const bygge = () => page.evaluate(() => {
    const n = performance.getEntriesByType('resource').map((r) => r.name).find((x) => x.includes('/assets/index-') && x.endsWith('.js'))
    return n ? n.split('/').pop() : '(okänt)'
  })

  const swLage = () => page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration()
    return r ? `aktiv=${!!r.active} väntar=${!!r.waiting} installerar=${!!r.installing} styr=${!!navigator.serviceWorker.controller}` : 'ingen registrering'
  })

  const tillMenyn = async () => {
    await page.waitForTimeout(2500)
    await page.mouse.click(640, 360) // splash: ett tryck någonstans
    await page.waitForTimeout(1800)
  }

  // En RUNDA av armens egen ritual. Returnerar true om sidan laddade om.
  const runda = async (nr) => {
    const laddade = page.waitForEvent('load', { timeout: 60000 }).then(() => true).catch(() => false)
    await page.mouse.click(...PILL)
    if (ARM === 'head') {
      await page.waitForTimeout(700)
      await page.mouse.move(...GRIND_KNAPP)
      await page.mouse.down()
      await page.waitForTimeout(2900)
      await page.mouse.up()
      await page.waitForTimeout(800)
      await page.mouse.click(...JA_KNAPP)
    }
    const ut = await Promise.race([laddade, page.waitForTimeout(45000).then(() => false)])
    console.log(`    runda ${nr}: ${ut ? 'SIDAN LADDADE OM ✓' : 'ingenting hände'} · sw: ${await swLage()}`)
    if (ut) await tillMenyn()
    return ut
  }

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await tillMenyn()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 90000 })
  console.log(`  ARM=${ARM} · bygge uppe · sw: ${await swLage()}`)

  // ── KONTROLLARM: ingen ny version byggd. En runda får INTE ladda om — annars mäter
  //    sonden bara att knappen laddar om jämt, och skulle rapportera "1 runda" även när
  //    ingenting hämtades.
  console.log('  KONTROLL (inget nytt byggt):')
  const k = await runda(1)
  console.log(`  → kontroll: ${k ? 'LADDADE OM UTAN NY VERSION ⚠️' : 'ingen omladdning ✓'}`)

  // ── MÄTARM: bygg en NY version medan sidan står uppe.
  const [maj, min] = originalVersion.split('.')
  const ny = `${maj}.${Number(min) + 1}.0-prov`
  console.log(`  bygger ${ny} …`)
  skrivVersion(ny)
  execSync('npm run build', { stdio: 'ignore' })
  const byggeFore = await bygge()
  console.log(`  MÄTARM (${ny} finns på servern) · kör nu ${byggeFore}:`)
  let rundor = 0
  for (let i = 1; i <= RUNDOR; i++) {
    rundor = i
    if (await runda(i)) break
    rundor = 0
  }
  const byggeEfter = await bygge()
  console.log(`  → RUNDOR TILLS UPPDATERING: ${rundor || `>${RUNDOR} (aldrig)`}`)
  console.log(`  → BYGGE: ${byggeFore} → ${byggeEfter} · ${byggeFore !== byggeEfter ? 'NYTT bygge körs ✓' : 'SAMMA bygge — omladdningen gav ingen ny version ⚠️'}`)

  console.log('\n  KONSOLFEL:')
  for (const [m, n] of fel) console.log(`  ×${n} ${m}`)
  if (!fel.size) console.log('  (inga)')
} finally {
  await browser.close()
  skrivVersion(originalVersion)
  console.log(`\n  package.json återställd till ${originalVersion} — bygg om innan du använder dist/`)
}
