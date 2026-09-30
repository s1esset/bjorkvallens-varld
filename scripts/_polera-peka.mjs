// Polering 2026-09-30: `peka-pa-kroppen` — svarar rätt (riktiga muspekningar på målzonens
// skärmläge) genom tre rundor så att "Vad är det här?"-vändningen (från runda 3) och danserna
// per skepnad nås, trycker ibland fel, väntar ut pekhjälpen en gång, och går ut mitt i en dans.
//   node scripts/_polera-peka.mjs
import { chromium } from 'playwright'

const ID = 'peka-pa-kroppen'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage,
    ID, { timeout: 20000 })
  await page.waitForTimeout(2500)

  const lage = () => page.evaluate(() => {
    const g = window.__barnspel.game
    const z = (g._targetZones || []).find((q) => !q.destroyed)
    const p = z ? z.toGlobal({ x: 0, y: 0 }) : null
    const annan = (g._zones || []).find((q) => !q.destroyed && q.key !== g._target)
    const pa = annan ? annan.toGlobal({ x: 0, y: 0 }) : null
    return { rundor: g._rounds, steg: g._step, mal: g._target, vad: !!g._vad, egen: !!g._ownBody, skepnad: g._charKey,
      resolving: !!g._resolving, p: p && { x: p.x, y: p.y }, fel: pa && { x: pa.x, y: pa.y } }
  })

  // Pekhjälpen: vänta ut den en gång (ingen tryckning) och se att inget går sönder
  await page.waitForTimeout(7500)
  await page.screenshot({ path: '.test-shots/_polera-peka-pek.png' })

  const start = await lage()
  const t0 = Date.now()
  let vadSedd = 0
  let felTryck = 0
  const skepnader = new Set()
  while (Date.now() - t0 < 150000) {
    const s = await lage()
    skepnader.add(s.skepnad)
    if (s.rundor >= start.rundor + 3) break
    if (s.resolving || !s.p) { await page.waitForTimeout(150); continue }
    if (s.vad && vadSedd === 0) { vadSedd++; await page.screenshot({ path: '.test-shots/_polera-peka-vad.png' }) }
    if (!s.vad && !s.egen && s.fel && felTryck < 3 && Math.random() < 0.2) { await page.mouse.click(s.fel.x, s.fel.y); felTryck++; await page.waitForTimeout(250); continue }
    await page.mouse.click(s.p.x, s.p.y)
    await page.waitForTimeout(350)
  }
  const slut = await lage()
  ok('tre rundor spelade', slut.rundor >= start.rundor + 3, `rundor ${start.rundor} → ${slut.rundor} på ${Math.round((Date.now() - t0) / 1000)} s`)
  ok('"Vad är det här?" nådd', vadSedd > 0, `${vadSedd}`)
  ok('skepnader', skepnader.size >= 1, [...skepnader].join(','))

  // Spela till nästa rundslut och gå ut mitt i dansen
  const r0 = (await lage()).rundor
  const t1 = Date.now()
  while (Date.now() - t1 < 60000) {
    const s = await lage()
    if (s.rundor > r0) break
    if (!s.resolving && s.p) await page.mouse.click(s.p.x, s.p.y)
    await page.waitForTimeout(300)
  }
  await page.waitForTimeout(400)
  await page.screenshot({ path: '.test-shots/_polera-peka-dans.png' })
  const felFore = errors.length
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(2500)
  ok('exit mitt i dansen: 0 nya konsolfel', errors.length === felFore, `${errors.length - felFore} nya`)
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 4).join(' | ') || '—')
} finally {
  await browser.close()
}
for (const r of rader) console.log(`${r.ok ? '✓' : '✗'} ${r.namn} · ${r.text}`)
console.log(rader.every((r) => r.ok) ? '\nALLT GRÖNT' : '\nNÅGOT ÄR RÖTT')
