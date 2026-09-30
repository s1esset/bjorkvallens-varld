// Nattkörningen 2026-09-30/10-01: `harma-melodin` — spelar härmningen med riktiga muspekningar
// på varelsernas FAKTISKA lägen i fyra rundor (temabyte efter varannan), trycker otåligt under
// firande/temabyte, ett fel tryck, och exit mitt i nästa temabyte. Räknar konsolfel och levande
// tweens på de rivna varelsernas innernoder (spelets gsap, inte en kopia).
//   node scripts/_natt-harma.mjs
import { chromium } from 'playwright'

const ID = 'harma-melodin'
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

  const punkt = (i) => page.evaluate((i) => {
    const b = window.__barnspel, p = b.game._pads[i]
    if (!p || p.destroyed) return null
    const c = b.app.canvas.getBoundingClientRect()
    const s = c.width / b.app.renderer.width
    const g = p.toGlobal({ x: 0, y: 0 })
    return { x: c.left + g.x * s, y: c.top + g.y * s }
  }, i)
  const stat = () => page.evaluate(() => {
    const g = window.__barnspel.game
    return { st: g._state, step: g._step, seq: (g._sequence || []).slice(), tema: String(g._tema?.id ?? g._tema?.namn ?? g._tema), n: g._pads.length }
  })
  const vantaLyssna = async (ms = 20000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) { if ((await stat()).st === 'listening') return true; await page.waitForTimeout(100) }
    return false
  }

  const teman = []
  const rundor = []
  for (let r = 0; r < 4; r++) {
    const lyss = await vantaLyssna()
    const s = await stat()
    teman.push(s.tema)
    if (!lyss) { rundor.push(`r${r}: aldrig listening (${s.st})`); break }
    for (const i of s.seq) { const p = await punkt(i); await page.mouse.click(p.x, p.y); await page.waitForTimeout(90) }
    await page.waitForTimeout(150)
    const e = await stat()
    rundor.push(`r${r}: len ${s.seq.length} -> ${e.st}`)
    // Otåligt: tryck varelser under firandet/temabytet
    for (let k = 0; k < 8; k++) { const p = await punkt(k % 4); if (p) await page.mouse.click(p.x, p.y); await page.waitForTimeout(120) }
  }
  ok('fyra rundor spelade till firande', rundor.length === 4 && rundor.every((x) => x.includes('showing')), rundor.join(' · '))
  ok('temat byts efter varannan runda', new Set(teman).size >= 2, teman.join(' -> '))
  const n = await stat()
  ok('fyra varelser efter temabyten', n.n === 4, `${n.n} pads`)

  // Fel tryck: väntar på listening och trycker en varelse som INTE är nästa
  await vantaLyssna()
  const s5 = await stat()
  const fel = [0, 1, 2, 3].find((i) => i !== s5.seq[0])
  const pf = await punkt(fel)
  await page.mouse.click(pf.x, pf.y)
  await page.waitForTimeout(400)
  ok('fel tryck avslutar inget', (await stat()).n === 4, `state ${(await stat()).st}`)

  // Exit mitt i ett temabyte: spela rundan klart och gå hem 1,0 s senare (bytet sker 0,9 s)
  await vantaLyssna()
  const s6 = await stat()
  // Samla innernoderna före exit för tween-räkning
  for (const i of s6.seq) { const p = await punkt(i); await page.mouse.click(p.x, p.y); await page.waitForTimeout(90) }
  await page.waitForTimeout(950)
  await page.evaluate(() => {
    const g = window.__barnspel.game
    const alla = []
    const samla = (n) => { if (!n) return; alla.push(n); n.children?.forEach(samla) }
    g._pads.forEach(samla); samla(g._dirigent)
    window.__nattNoder = alla
  })
  const felFore = errors.length
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(2500)
  const tw = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((r) => r.name).find((u) => /gsap/.test(u) && /\.js/.test(u))
    const mod = await import(url)
    const gsap = mod.gsap || mod.default
    return window.__nattNoder.filter((n) => gsap.isTweening(n)).length + ' av ' + window.__nattNoder.length
  })
  ok('inga tweens lever pa rivna noder', tw.startsWith('0 '), tw)
  ok('0 konsolfel efter exit', errors.length === felFore, errors.slice(felFore).join(' | '))
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}
for (const r of rader) console.log(`${r.ok ? '✓' : '✗'} ${r.namn}  — ${r.text}`)
process.exit(rader.every((r) => r.ok) ? 0 : 1)
