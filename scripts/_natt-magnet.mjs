// Nattkörningen 2026-09-30/10-01: `magnet-fiske` — harnessen drar aldrig magneten
// (drag/ratt 0), så den här sonden gör det med riktiga muspekningar: från magnetens FAKTISKA
// läge till varje fångbar sak, väntar tills den fastnat, och upp till hinken (x 1150, bortom
// autotrycken). Två nivåer otåligt i rad, att sakerna ligger inom den ritade dammen, och exit
// mitt i övergången. Valfritt `--sallsynt`: tvingar fram en bonusfångst i nivå 2.
//   node scripts/_natt-magnet.mjs [--sallsynt]
import { chromium } from 'playwright'

const ID = 'magnet-fiske'
const SALLSYNT = process.argv.includes('--sallsynt')
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

  const skarm = (x, y) => page.evaluate(([x, y]) => {
    const b = window.__barnspel
    const c = b.app.canvas.getBoundingClientRect()
    const s = c.width / b.app.renderer.width
    return { x: c.left + x * s, y: c.top + y * s }
  }, [x, y])
  const stat = () => page.evaluate(() => {
    const g = window.__barnspel.game
    return {
      lvl: g._level, caught: g._caught, needed: g._needed, stuck: g._stuck.length,
      mx: Math.round(g._magnet.x), my: Math.round(g._magnet.y),
      kvar: g._items.filter((i) => (i.metal || i.bonus) && !i.delivered && !i.stuck && i.body)
        .map((i) => ({ x: Math.round(i.body.position.x), y: Math.round(i.body.position.y), bonus: !!i.bonus })),
      alla: g._items.filter((i) => i.body).map((i) => ({ x: Math.round(i.body.position.x), y: Math.round(i.body.position.y) })),
      bonus: g._items.filter((i) => i.bonus).length,
    }
  })
  const dra = async (fx, fy, tx, ty, steg = 14) => {
    for (let k = 1; k <= steg; k++) {
      const p = await skarm(fx + (tx - fx) * k / steg, fy + (ty - fy) * k / steg)
      await page.mouse.move(p.x, p.y)
      await page.waitForTimeout(25)
    }
  }

  // Alla saker ska ligga i den logiska dammen (x 120–960, y 200–610)
  const s0 = await stat()
  const utanfor = s0.alla.filter((p) => p.x < 120 || p.x > 960 || p.y < 200 || p.y > 610)
  ok('alla saker ligger i dammen vid start', utanfor.length === 0, `${s0.alla.length} saker, ${utanfor.length} utanför`)

  const spelaNiva = async (maxMs = 45000) => {
    const start = await stat()
    const t0 = Date.now()
    let turer = 0
    while (Date.now() - t0 < maxMs) {
      const s = await stat()
      if (s.lvl !== start.lvl) return { klar: true, turer, lvl: start.lvl, ms: Date.now() - t0 }
      if (s.caught >= s.needed && s.needed > 0) { await page.waitForTimeout(200); continue }
      const mal = s.kvar.find((i) => !i.bonus) || s.kvar[0]
      if (!mal) { await page.waitForTimeout(200); continue }
      turer++
      const p0 = await skarm(s.mx, s.my)
      await page.mouse.move(p0.x, p0.y)
      await page.mouse.down()
      await dra(s.mx, s.my, mal.x, mal.y)
      // vänta tills den fastnat (max 1,5 s), följ efter om den glider
      const t1 = Date.now()
      while (Date.now() - t1 < 1500) {
        const q = await stat()
        if (q.stuck > 0) break
        const n = q.kvar.find((i) => Math.abs(i.x - mal.x) < 120 && Math.abs(i.y - mal.y) < 120)
        if (n) { const pp = await skarm(n.x, n.y); await page.mouse.move(pp.x, pp.y) }
        await page.waitForTimeout(80)
      }
      const q = await stat()
      await dra(q.mx, q.my, 1150, 500)
      await page.waitForTimeout(350)
      await page.mouse.up()
      await page.waitForTimeout(250)
    }
    return { klar: false, turer, lvl: start.lvl, ms: Date.now() - t0 }
  }

  if (SALLSYNT) {
    // Bonus i nivå 2 (ingen pol-nivå): stäng spärren och slumpa lågt medan nivå 2 byggs
    await page.evaluate(() => { const g = window.__barnspel.game; g._rarForra = false; window.__nattRand = Math.random; Math.random = () => 0.01 })
  }
  const n1 = await spelaNiva()
  ok('niva 1 klaras med riktiga drag', n1.klar, `lvl ${n1.lvl}, ${n1.turer} drag, ${Math.round(n1.ms / 100) / 10} s`)
  // Otåligt: greppa magneten direkt under övergången
  const s1 = await stat()
  if (SALLSYNT) await page.evaluate(() => { Math.random = window.__nattRand })
  const pm = await skarm(s1.mx, s1.my)
  await page.mouse.click(pm.x, pm.y)
  await page.waitForTimeout(1500)
  const s2 = await stat()
  const ut2 = s2.alla.filter((p) => p.x < 120 || p.x > 960 || p.y < 200 || p.y > 610)
  ok('niva 2: saker i dammen', ut2.length === 0, `${s2.alla.length} saker, ${ut2.length} utanför`)
  if (SALLSYNT) ok('bonus fanns i nivå 2', s2.bonus > 0, `${s2.bonus} bonus`)
  const n2 = await spelaNiva()
  ok('niva 2 klaras med riktiga drag', n2.klar, `lvl ${n2.lvl}, ${n2.turer} drag, ${Math.round(n2.ms / 100) / 10} s`)
  const s3 = await stat()
  const dammar = await page.evaluate(() => window.__barnspel.game._dammar?.length ?? 'saknas')
  await page.waitForTimeout(1200)
  const dammar2 = await page.evaluate(() => window.__barnspel.game._dammar?.length ?? 'saknas')
  ok('bara en dammbild efter övergången', dammar2 === 1, `${dammar} -> ${dammar2}`)

  const felFore = errors.length
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(2500)
  ok('0 konsolfel efter exit', errors.length === felFore, errors.slice(felFore).join(' | '))
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
}
for (const r of rader) console.log(`${r.ok ? '✓' : '✗'} ${r.namn}  — ${r.text}`)
process.exit(rader.every((r) => r.ok) ? 0 : 1)
