// SOND: hämtar appen en ny version SJÄLV — utan att någon trycker på versionspillret?
//
// Ägaren 2026-09-30: "när man öppnar spelet så letar den automatiskt efter den nyaste
// versionen (när man backar ut till startsidan med)". Tre påståenden att mäta, alla mot ett
// RIKTIGT bygge (servicearbetaren finns inte på dev-servern — se _uppdatprobe.mjs):
//
//   KONTROLL  meny → bibliotek → meny utan ny version på servern: INGEN omladdning.
//   A         ny version byggs medan barnet står i BIBLIOTEKET. Appen väcks ur bakgrunden
//             (visibilitychange) → den nya arbetaren laddas ner och väntar, men sidan laddas
//             INTE om i biblioteket. Hemknappen → menyn → omladdning till det nya bygget.
//             Efteråt: menyn säger "Uppdaterad till …".
//   B         ny version byggs medan föräldern står på MENYN. Ingen knapp trycks: appen väcks
//             ur bakgrunden → sidan laddar om av sig själv när nedladdningen är klar.
//
// Ingen arm trycker på versionspillret. Måttet är VILKET BYGGE sidan kör (entry-chunkens
// hashade filnamn), inte bara att den laddade om.
//
// Före sonden (aldrig parallellt med annan webbläsartrafik):
//   npm run build && npx vite preview --port 4173
//
//   node scripts/_autouppdatprobe.mjs [--port 4173] [--bara a]
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const opt = (f, d) => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : d)
const PORT = opt('--port', '4173')
const BARA = opt('--bara', '')
const url = `http://localhost:${PORT}/`
const PKG = 'package.json'

const las = () => JSON.parse(fs.readFileSync(PKG, 'utf8'))
const originalVersion = las().version
const skrivVersion = (v) => {
  const j = las()
  j.version = v
  fs.writeFileSync(PKG, JSON.stringify(j, null, 2) + '\n')
}
const [MAJ, MIN] = originalVersion.split('.').map(Number)

const SPELA = [640, 520]
const HEM = [24 + 52, 24 + 52]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const fel = new Map()
const resultat = []
const rapport = (namn, ok, info) => {
  resultat.push({ namn, ok })
  console.log(`  ${ok ? '✓' : '✗'} ${namn}${info ? ` · ${info}` : ''}`)
}
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => { const k = (e.message || '').slice(0, 90); fel.set(k, (fel.get(k) || 0) + 1) })
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const k = m.text().slice(0, 90)
    fel.set(k, (fel.get(k) || 0) + 1)
  })

  const bygge = () => page.evaluate(() => {
    const n = performance.getEntriesByType('resource').map((r) => r.name).find((x) => x.includes('/assets/index-') && x.endsWith('.js'))
    return n ? n.split('/').pop() : '(okänt)'
  })
  const swLage = () => page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration()
    return r ? { vantar: !!r.waiting, installerar: !!r.installing, styr: !!navigator.serviceWorker.controller } : null
  })
  const minne = () => page.evaluate(() => localStorage.getItem('pwagames.nyheter'))
  const vakna = () => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))

  let laddningar = 0
  page.on('load', () => laddningar++)

  const tillMenyn = async () => {
    await page.waitForTimeout(2500)
    await page.mouse.click(640, 360) // splash: ett tryck någonstans
    await page.waitForTimeout(1800)
  }
  const nyttBygge = (v) => {
    const t0 = Date.now()
    skrivVersion(v)
    execSync('npm run build', { stdio: 'ignore' })
    console.log(`  (byggde ${v} på ${((Date.now() - t0) / 1000).toFixed(0)} s)`)
  }
  // Vänta tills den nya arbetaren är nedladdad och väntar — utan att sidan får ladda om.
  const vantaPaVantande = async (maxMs) => {
    const t0 = Date.now()
    while (Date.now() - t0 < maxMs) {
      const s = await swLage().catch(() => null)
      if (s?.vantar) return Date.now() - t0
      await page.waitForTimeout(500)
    }
    return -1
  }

  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await tillMenyn()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 90000 })
  const start = await bygge()
  console.log(`  uppe · ${start} · sw ${JSON.stringify(await swLage())}`)

  // ── KONTROLL: meny → bibliotek → meny, inget nytt på servern.
  {
    const l0 = laddningar
    await page.mouse.click(...SPELA)
    await page.waitForTimeout(1500)
    await page.mouse.click(...HEM)
    await page.waitForTimeout(8000)
    rapport('KONTROLL: ingen omladdning utan ny version', laddningar === l0, `laddningar +${laddningar - l0}`)
  }

  if (!BARA || BARA === 'a') {
    // ── A: ny version medan barnet är i biblioteket.
    await page.mouse.click(...SPELA)
    await page.waitForTimeout(1500)
    nyttBygge(`${MAJ}.${MIN + 1}.0-prov`)
    await page.waitForTimeout(31000 - 0) // kollspärren i pwa.js (30 s) — byggtiden räknas redan in
    const l0 = laddningar
    await vakna()
    const ms = await vantaPaVantande(120000)
    await page.waitForTimeout(4000)
    rapport('A1: ny version hittad och nedladdad i biblioteket', ms >= 0, ms >= 0 ? `väntar efter ${(ms / 1000).toFixed(1)} s` : 'väntar aldrig')
    rapport('A2: ingen omladdning i biblioteket', laddningar === l0, `laddningar +${laddningar - l0}`)
    const fore = await bygge()
    const laddade = page.waitForEvent('load', { timeout: 20000 }).then(() => true).catch(() => false)
    await page.mouse.click(...HEM)
    const ok = await laddade
    await tillMenyn()
    const efter = await bygge()
    rapport('A3: hemknappen → menyn → omladdning', ok)
    rapport('A4: sidan kör det NYA bygget', efter !== fore, `${fore} → ${efter}`)
    rapport('A5: menyn minns versionsbytet', /1\.\d+/.test(await minne() || ''), await minne())
    await page.screenshot({ path: '.test-shots/_autouppdat-A.png' })
  }

  if (!BARA || BARA === 'b') {
    // ── B: ny version medan föräldern står på menyn. Ingen knapp.
    nyttBygge(`${MAJ}.${MIN + 2}.0-prov`)
    await page.waitForTimeout(31000)
    const fore = await bygge()
    const laddade = page.waitForEvent('load', { timeout: 150000 }).then(() => true).catch(() => false)
    await vakna()
    const ok = await laddade
    await tillMenyn()
    const efter = await bygge()
    rapport('B1: omladdning av sig själv på menyn', ok)
    rapport('B2: sidan kör det NYA bygget', efter !== fore, `${fore} → ${efter}`)
    await page.screenshot({ path: '.test-shots/_autouppdat-B.png' })
  }

  console.log('\n  KONSOLFEL:')
  for (const [m, n] of fel) console.log(`  ×${n} ${m}`)
  if (!fel.size) console.log('  (inga)')
  const trasiga = resultat.filter((r) => !r.ok).length
  console.log(`\n  ${trasiga ? '✗' : '✓'} ${resultat.length - trasiga}/${resultat.length}`)
} finally {
  await browser.close()
  skrivVersion(originalVersion)
  console.log(`\n  package.json återställd till ${originalVersion} — bygg om innan du använder dist/`)
}
