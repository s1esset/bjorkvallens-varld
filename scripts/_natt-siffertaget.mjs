// Nattkörningen 2026-09-30: `siffertaget` — lyser INGEN vagn från start, kommer glöden efter
// ~4 s tvekan (räknat från att frågan tystnat) och direkt efter ett fel val, går det att koppla
// hela tåget med riktiga drag (också platser bortom x 950), fungerar luck-läget, och överlever
// fyra rundor otåligt spelade + exit mitt i färden?
//   node scripts/_natt-siffertaget.mjs
import { chromium } from 'playwright'

const ID = 'siffertaget'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })

// Skärmpunkter för vagnen med siffran n (eller null = rätt vagn) och dess mål
const PUNKTER = (n) => `(() => {
  const b = window.__barnspel, g = b.game
  const want = ${n === null ? 'g._malNummer()' : n}
  const car = g._cars.find((c) => !c.destroyed && !c._placed && c._n === want)
  if (!car) return null
  const idx = g._mode === 'lucka' ? g._gapIdx : g._placedCount
  const slot = g._slots.find((s) => s._index === idx)
  if (!slot) return null
  const c = b.app.canvas.getBoundingClientRect(), s = c.width / b.app.renderer.width
  const p = car.getGlobalPosition(), q = slot.getGlobalPosition()
  return { fx: c.left + p.x * s, fy: c.top + p.y * s, tx: c.left + q.x * s, ty: c.top + q.y * s,
           cx: Math.round(p.x), sx: Math.round(q.x), n: want }
})()`

async function dra(page, p) {
  await page.mouse.move(p.fx, p.fy)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(p.fx + ((p.tx - p.fx) * i) / 8, p.fy + ((p.ty - p.fy) * i) / 8)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
  await page.waitForTimeout(400)
}
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
  const stat = () => page.evaluate(() => {
    const g = window.__barnspel.game, v = window.__barnspel.voice
    return { lvl: g._level, mode: g._mode, N: g._N, pc: g._placedCount, res: g._resolving,
             glod: g._glodPa, talar: !!(v?.talar), tvek: +(g._tvekan ?? 0).toFixed(2) }
  })
  const vantaRunda = async () => {
    const t0 = Date.now()
    while (Date.now() - t0 < 15000) {
      const s = await stat()
      if (!s.res && (await page.evaluate(PUNKTER(null)))) return s
      await page.waitForTimeout(100)
    }
    return stat()
  }

  // Runda 1 — det TÅLMODIGA barnet: rör ingenting, läs glöden över tid
  await page.waitForTimeout(1400)
  const s0 = await stat()
  ok('ingen glod fran start', !s0.glod, `mode ${s0.mode} N ${s0.N}, glod ${s0.glod}`)
  // vänta tills rösten tystnat (intro + fråga), mät sedan
  let t0 = Date.now()
  while ((await stat()).talar && Date.now() - t0 < 15000) await page.waitForTimeout(100)
  const tyst = Date.now()
  await page.waitForTimeout(2500)
  const s1 = await stat()
  ok('ingen glod 2,5 s efter tystnad', !s1.glod, `glod ${s1.glod} tvekan ${s1.tvek} s`)
  t0 = Date.now()
  while (!(await stat()).glod && Date.now() - t0 < 8000) await page.waitForTimeout(100)
  const s2 = await stat()
  ok('glod tands efter tvekan', s2.glod, `efter ${((Date.now() - tyst) / 1000).toFixed(1)} s tystnad`)
  // koppla hela tåget
  for (let k = 0; k < 6 && !(await stat()).res; k++) {
    const p = await page.evaluate(PUNKTER(null))
    if (!p) break
    await dra(page, p)
  }
  const s3 = await stat()
  ok('runda 1 (rad) kopplas med drag', s3.res || s3.lvl > s0.lvl, `pc ${s3.pc}/${s3.N} res ${s3.res}`)

  // Runda 2..4 — det OTÅLIGA barnet: fel vagn först, sedan rätt så fort det går
  const lagen = [s0.mode]
  let felGlod = null
  for (let r = 2; r <= 4; r++) {
    const sr = await vantaRunda()
    lagen.push(`${sr.mode}${sr.N}`)
    if (felGlod === null) {
      const fel = await page.evaluate(`(() => { const g = window.__barnspel.game
        const c = g._cars.find((c) => !c.destroyed && !c._placed && c._n !== g._malNummer()); return c ? c._n : null })()`)
      if (fel !== null) {
        const p = await page.evaluate(PUNKTER(fel))
        const f0 = await stat()
        if (p) {
          await dra(page, p)
          const f1 = await stat()
          felGlod = f1.glod && f1.pc === f0.pc
          ok('fel vagn: placeras inte, glod direkt', felGlod, `vagn ${fel} mot mal ${p.n}: pc ${f0.pc}->${f1.pc}, glod ${f1.glod}`)
        }
      }
    }
    let bortom = 0
    for (let k = 0; k < 8 && !(await stat()).res; k++) {
      const p = await page.evaluate(PUNKTER(null))
      if (!p) break
      if (p.sx > 950 || p.cx > 950) bortom++
      await dra(page, p)
    }
    const se = await stat()
    ok(`runda ${r} (${sr.mode} N${sr.N}) klar`, se.res, `pc ${se.pc}/${se.N}${bortom ? `, ${bortom} drag bortom x 950` : ''}`)
  }
  ok('bade rad och lucka spelades', lagen.some((l) => String(l).startsWith('rad')) && lagen.some((l) => String(l).startsWith('lucka')), lagen.join(' '))
  // exit mitt i färden
  await page.waitForTimeout(1500)
  const felFore = errors.length
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(2500)
  ok('exit mitt i fardan: 0 nya fel', errors.length === felFore, `${errors.length - felFore} nya`)
  ok('0 konsolfel totalt', errors.length === 0, errors.slice(0, 3).join(' | ') || '0')
} finally {
  await browser.close()
}
console.log(`\n  ${ID} — nattsond\n`)
for (const r of rader) console.log(`  ${r.ok ? 'OK  ' : 'FEL '} ${r.namn.padEnd(40)} ${r.text}`)
console.log(`\n  ${rader.filter((r) => r.ok).length}/${rader.length} grona\n`)
