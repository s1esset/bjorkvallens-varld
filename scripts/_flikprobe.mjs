// Sond: åldersbanden i skalet. Svarar på tre frågor, var och en med en kontrollarm:
//   FLIK   Syns fliken Utmaning bara när det finns ett storbarnsspel, och hamnar storbarnsspelet
//          BARA där (inte i sin kategoriflik)? Kontroll: småbarnsspelet i samma kategori ligger
//          kvar i sin flik.
//   BAND   Får spelet rätt `ctx.band` ur sitt ageRange? Kontroll: ett småbarnsspel → 'sma'.
//   BERÖM  Väljer complete() beröm ur rätt lista? Kontroll: småbarnsspelet → PRAISE.
//
//   node scripts/_flikprobe.mjs [--stor <id>] [--sma <id>] [--url http://localhost:5173]
// Utan storbarnsspel i registret ska FLIK rapportera att Utmaning är dold — det är rätt svar.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const url = opt('--url', 'http://localhost:5173')
const storId = opt('--stor', 'klambubblor-stor')
const smaId = opt('--sma', 'klambubblor')

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push(String(e.message || e)))
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()) })
await page.goto(url)
await page.waitForFunction(() => window.__barnspel?.nav, null, { timeout: 20000 })

// Alla texter i scenen — flikarnas etiketter och de byggda brickornas titlar.
const texter = () => page.evaluate(() => {
  const ut = []
  const walk = (n) => {
    if (n.constructor?.name === 'Text' || typeof n.text === 'string') ut.push(n.text)
    for (const c of n.children || []) walk(c)
  }
  walk(window.__barnspel.app.stage)
  return ut
})

await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(1400)
const t0 = await texter()
const flikar = t0.filter((t) => /Roligt|Fysik|Pussel|Lära|Utmaning/.test(t))
const utmaningSyns = flikar.some((t) => t.includes('Utmaning'))
console.log('FLIK   flikar:', flikar.join(' | '))

// Klicka på varje flik och läs brickorna. Fliken sitter på sin räknade mitt (samma formel
// som LibraryScreen): fem flikar om Utmaning syns, annars fyra.
const n = flikar.length
const tabW = (1280 - 24 * 2 - 12 * (n - 1)) / n
const perFlik = {}
for (let i = 0; i < n; i++) {
  await page.mouse.click(24 + i * (tabW + 12) + tabW / 2, 172 + 46)
  await page.waitForTimeout(700)
  const t = await texter()
  perFlik[flikar[i].replace(/^\S+\s+/, '')] = t
  if (flikar[i].includes('Utmaning')) {
    mkdirSync('.test-shots', { recursive: true })
    await page.screenshot({ path: '.test-shots/_flik-utmaning.png' })
  }
}
const hittaTitel = (id) => page.evaluate(async (id) => {
  const reg = await import('/src/games/registry.js')
  return reg.GAMES.find((g) => g.id === id)?.titleSv ?? null
}, id)
const storNamn = await hittaTitel(storId)
const smaNamn = await hittaTitel(smaId)
for (const [flik, t] of Object.entries(perFlik)) {
  const harStor = storNamn ? t.includes(storNamn) : false
  const harSma = smaNamn ? t.includes(smaNamn) : false
  console.log(`FLIK   ${flik.padEnd(9)} storbarnsspelet: ${harStor ? 'JA' : 'nej'} · småbarnsspelet: ${harSma ? 'JA' : 'nej'}`)
}
if (!storNamn) console.log(`FLIK   inget spel "${storId}" i registret — Utmaning ${utmaningSyns ? 'SYNS (fel: tom flik)' : 'dold (rätt)'}`)

// BAND + BERÖM: starta spelet, läs ctx.band, fånga det complete() säger.
const provaSpel = async (id) => {
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), id)
  await page.waitForTimeout(1500)
  return page.evaluate(async () => {
    const s = window.__barnspel
    const sagt = []
    const orig = s.voice.say.bind(s.voice)
    s.voice.say = (t, ...r) => { sagt.push(t); return orig(t, ...r) }
    s.voice.cancel()
    await new Promise((r) => setTimeout(r, 200))
    const beromLista = []
    for (let i = 0; i < 12; i++) {
      s.voice.cancel()
      await new Promise((r) => setTimeout(r, 60))
      s.ctx.progress.complete()
      beromLista.push(sagt.at(-1))
    }
    s.voice.say = orig
    return { band: s.ctx.band, berom: [...new Set(beromLista)] }
  })
}
if (storNamn) {
  const r = await provaSpel(storId)
  console.log(`BAND   ${storId}: ${r.band}   BERÖM: ${r.berom.join(', ')}`)
}
const k = await provaSpel(smaId)
console.log(`BAND   ${smaId} (kontroll): ${k.band}   BERÖM: ${k.berom.join(', ')}`)

console.log(`FEL    ${fel.length}${fel.length ? ' — ' + fel.slice(0, 3).join(' / ') : ''}`)
await browser.close()
