// Nattkörningen 2026-09-30: `djurorkester` — nås alla sex djur (också nr 6 bortom harnessens
// x 950), kommer firandet efter 8 tryck, byts djuren till konsert 2, och överlever spelet
// otåliga tryck under ridåbytet + exit mitt i nästa ridå? Riktiga muspekningar.
//   node scripts/_natt-djurorkester.mjs
import { chromium } from 'playwright'

const ID = 'djurorkester'
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
  await page.waitForTimeout(1500)

  // Skärmpunkt för djur i (huvudets höjd ~80 px över fötterna, i djurets egen skala)
  const punkt = (i) => page.evaluate((i) => {
    const b = window.__barnspel, d = b.game._djur[i]
    if (!d) return null
    const c = b.app.canvas.getBoundingClientRect()
    const s = c.width / b.app.renderer.width
    const p = d.toGlobal({ x: 0, y: -80 })
    return { x: c.left + p.x * s, y: c.top + p.y * s, dx: Math.round(d.x) }
  }, i)
  const stat = () => page.evaluate(() => {
    const g = window.__barnspel.game
    return { k: g._konsert, t: g._konsertTaps, n: g._djur.length, ids: g._djur.map((d) => d._ork?.data?.id ?? '?').join(',') }
  })
  const tryck = async (p) => { await page.mouse.click(p.x, p.y); await page.waitForTimeout(140) }

  // Dirigenten först: ett tryck på Bobo får inte räknas som ett djur
  const f0 = await stat()
  await page.mouse.click(640, 660); await page.waitForTimeout(200)
  const f1 = await stat()
  ok('Bobo ar inte ett djurs traffyta', f1.t === f0.t, `taps ${f0.t} -> ${f1.t}`)

  // Konsert 1: alla sex djur, ett tryck var
  const traffar = []
  for (let i = 0; i < 6; i++) {
    const fore = (await stat()).t
    const p = await punkt(i)
    await tryck(p)
    traffar.push(((await stat()).t > fore ? 'ja' : 'NEJ') + '@' + p.dx)
  }
  ok('alla sex djur nas med tryck', traffar.every((t) => t.startsWith('ja')), traffar.join(' '))
  const k1 = await stat()
  await tryck(await punkt(5)); await tryck(await punkt(0)) // 7 och 8
  await page.waitForTimeout(300)
  // Otåliga tryck genom hela firandet och ridåbytet
  let sprangt = 0
  const t0 = Date.now()
  while (Date.now() - t0 < 12000) {
    const s = await stat()
    if (s.k >= 2 && s.t > 0) break
    const p = await punkt(sprangt++ % 6)
    if (p) await tryck(p); else await page.waitForTimeout(140)
  }
  const k2 = await stat()
  ok('konsert 2 startar och tar emot tryck', k2.k === 2 && k2.t > 0, `konsert ${k2.k}, taps ${k2.t}, ${Math.round((Date.now() - t0) / 100) / 10} s`)
  ok('nya djur i konsert 2', k2.ids !== k1.ids, `${k1.ids} -> ${k2.ids}`)
  ok('sex djur, inga kvarlamnade', k2.n === 6, `${k2.n} djur`)
  const noder = await page.evaluate(() => window.__barnspel.game._djurLager.children.length)
  ok('djurlagret bar bara sina sex', noder === 6, `${noder} barn i _djurLager`)

  // Konsert 2 till slut, exit mitt i ridån
  while ((await stat()).t < 8 && (await stat()).k === 2) await tryck(await punkt(Math.floor(Math.random() * 6)))
  await page.waitForTimeout(4500)
  const felFore = errors.length
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(2500)
  ok('exit mitt i ridan: 0 nya fel', errors.length === felFore, `${errors.length - felFore} nya`)
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 3).join(' | ') || '0')
} finally {
  await browser.close()
}
console.log(`\n  ${ID} — nattsond\n`)
for (const r of rader) console.log(`  ${r.ok ? 'OK  ' : 'FEL '} ${r.namn.padEnd(40)} ${r.text}`)
console.log(`\n  ${rader.filter((r) => r.ok).length}/${rader.length} grona\n`)
