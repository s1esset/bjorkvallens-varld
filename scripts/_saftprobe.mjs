// Saftbaren-sond: mäter ägarens två rapporterade fel.
//
//   A) LJUD EFTER FÄRGBYTE — två glas fylls med VAR SIN blandfärg (grön resp. orange).
//      Ingen input alls i 5 s. Sonden räknar varje audio.sfx / audio.tone / voice.say.
//      Ett spel i vila ska vara TYST.
//   B) STULEN VÄTSKA — glas 2 fylls, glas 0 dras i höjd med disken förbi det, och
//      sonden mäter hur många partiklar som ligger i vilket glas före/under/efter draget.
//
//   node scripts/_saftprobe.mjs
import { chromium } from 'playwright'

const ID = 'saftbaren'
const GLASS_X = [390, 570, 750, 930]

const hookAudio = (page) =>
  page.evaluate(() => {
    const s = window.__barnspel
    window.__cnt = { sfx: {}, tone: 0, say: {} }
    if (!s._probeWrapped) {
      s._probeWrapped = true
      const osfx = s.audio.sfx.bind(s.audio)
      s.audio.sfx = (n, ...r) => {
        window.__cnt.sfx[n] = (window.__cnt.sfx[n] || 0) + 1
        return osfx(n, ...r)
      }
      const oton = s.audio.tone.bind(s.audio)
      s.audio.tone = (...r) => {
        window.__cnt.tone++
        return oton(...r)
      }
      const osay = s.voice.say.bind(s.voice)
      s.voice.say = (t, ...r) => {
        window.__cnt.say[t] = (window.__cnt.say[t] || 0) + 1
        return osay(t, ...r)
      }
    }
  })

const resetCnt = (page) => page.evaluate(() => (window.__cnt = { sfx: {}, tone: 0, say: {} }))
const readCnt = (page) => page.evaluate(() => window.__cnt)

const glassStats = (page) =>
  page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    return {
      total: g._world.count,
      busy: !!g._busy,
      glas: g._glasses.map((x) => ({ x: Math.round(x.x), y: Math.round(x.y), a: Number(x.angle.toFixed(2)), held: !!x.held, ...g._stats(x) })),
    }
  }, ID)

// Fyll ett glas med partiklar som bär en GIVEN blandning (kanalvärden r/gul/blå).
const fyll = (page, gi, ch, rows) =>
  page.evaluate(
    async ({ gid, gi, ch, rows }) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      const gl = g._glasses[gi]
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 8; c++) {
          g._world.spawn(gl.x - 49 + c * 14 + (Math.random() - 0.5) * 4, gl.y - 36 - r * 15, { pal: 0, ch })
        }
      }
    },
    { gid: ID, gi, ch, rows },
  )

const tom = (page) =>
  page.evaluate(async (gid) => {
    const g = (await import('/src/games/registry.js')).getGame(gid)
    g._world.clear()
  }, ID)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1200)
  await hookAudio(page)

  console.log(`\n  Saftsond — ${ID}\n`)

  // ---- A) ljud efter färgbyte ---------------------------------------------
  await tom(page)
  await fyll(page, 1, [0, 0.5, 0.5], 7) // grön blandning
  await fyll(page, 2, [0.5, 0.5, 0], 7) // orange blandning
  await page.waitForTimeout(1200) // låt vätskan lägga sig + färgen klassas
  const before = await glassStats(page)
  console.log(`  A) LJUD — glas 1 = ${before.glas[1].n} partiklar (dom ${before.glas[1].dom}), glas 2 = ${before.glas[2].n} (dom ${before.glas[2].dom})`)
  await resetCnt(page)
  await page.waitForTimeout(5000) // INGEN input
  const c = await readCnt(page)
  const sfxTot = Object.values(c.sfx).reduce((a, b) => a + b, 0)
  const sayTot = Object.values(c.say).reduce((a, b) => a + b, 0)
  console.log(`     5 s helt utan input:`)
  console.log(`     sfx   ${sfxTot}  ${JSON.stringify(c.sfx)}`)
  console.log(`     tone  ${c.tone}`)
  console.log(`     röst  ${sayTot}  ${JSON.stringify(c.say)}`)
  // Rätt beteende: varje glas utropar sin blandfärg EN gång. Felet var upprepningen.
  const maxSamma = Math.max(0, ...Object.values(c.say))
  console.log(`     ► mest upprepade replik: ${maxSamma} ggr (ska vara ≤1), reveal ${c.sfx.reveal || 0} (ska vara ≤2): ${maxSamma <= 1 && (c.sfx.reveal || 0) <= 2 ? 'OK' : 'FEL'}\n`)

  // ---- B) stulen vätska ----------------------------------------------------
  await tom(page)
  await page.waitForTimeout(400)
  await fyll(page, 2, [0, 0, 1], 7) // blått i glas 2
  await page.waitForTimeout(1200)
  const b0 = await glassStats(page)
  console.log(`  B) VÄTSKA — före drag: ${b0.glas.map((g, i) => `glas${i}=${g.n}`).join(' ')}  (totalt ${b0.total})`)

  // Dra glas 0 åt höger, förbi glas 2, i höjd med disken (så som ett barn drar).
  await page.mouse.move(GLASS_X[0], 500)
  await page.mouse.down()
  const spar = []
  for (let k = 1; k <= 24; k++) {
    const x = GLASS_X[0] + ((GLASS_X[3] - GLASS_X[0]) * k) / 24
    await page.mouse.move(x, 500)
    await page.waitForTimeout(40)
    if (k % 6 === 0) {
      const s = await glassStats(page)
      spar.push(`     under drag x=${Math.round(x)}: ${s.glas.map((g, i) => `glas${i}=${g.n}`).join(' ')}`)
    }
  }
  await page.mouse.up()
  for (const r of spar) console.log(r)
  await page.waitForTimeout(1500) // glaset åker hem
  const b1 = await glassStats(page)
  console.log(`     efter drag:  ${b1.glas.map((g, i) => `glas${i}=${g.n}`).join(' ')}  (totalt ${b1.total})`)
  const kvar = b1.glas[2].n
  const stulet = b0.glas[2].n - kvar
  console.log(`     ► glas 2 hade ${b0.glas[2].n}, har ${kvar} — ${stulet} partiklar flyttade med det dragna glaset\n`)

  // ---- C) hällningen ------------------------------------------------------
  // Regressionsvakt för lyftet i _onGlassDown och för hällkalibreringen (ATGARDER V4,
  // fixad 2026-08-07: TILT 1,05 → 2,2 och OFFS 205 → 100). Djupare hällmätningar —
  // glas→glas, glas→hink och hela beställningen — ligger i scripts/_pourprobe.mjs.
  await tom(page)
  await page.waitForTimeout(400)
  // Fyll med en färg Bobo INTE har beställt — annars serveras glaset till honom
  // (helt korrekt beteende) och man mäter drickandet i stället för hällningen.
  const order = await page.evaluate(async (gid) => (await import('/src/games/registry.js')).getGame(gid)._order?.pal ?? 0, ID)
  await fyll(page, 1, order === 1 ? [0, 0, 1] : [0, 1, 0], 13) // nästan fullt (FULLT = 118)
  await page.waitForTimeout(1200)
  const c0 = await glassStats(page)
  // Spelets EGEN hällväg: tryck på glas 1, tryck sedan på glas 2 (_autoPour).
  await page.mouse.click(GLASS_X[1], 500)
  await page.waitForTimeout(250)
  await page.mouse.click(GLASS_X[2], 500)
  console.log(`  C) HÄLLNING (tryck-tryck) — glas 1 fyllt (${c0.glas[1].n}), hälls i glas 2`)
  for (let k = 1; k <= 14; k++) {
    await page.waitForTimeout(400)
    const s = await glassStats(page)
    const g1 = s.glas[1]
    console.log(`     t=${String(k * 400).padStart(4)} busy=${s.busy ? 1 : 0} glas1(x${g1.x} y${g1.y} v${g1.a}) ${s.glas.map((g, i) => `g${i}=${g.n}`).join(' ')} tot=${s.total}`)
  }
  const c1 = await glassStats(page)
  console.log(`     ► hamnade det saft i glas 2? ${c1.glas[2].n > 10 ? 'JA (' + c1.glas[2].n + ')' : 'NEJ — hällningen är trasig'}\n`)

  console.log(`  ${errors.length ? '✗ ' + errors.join(' | ') : '✓ 0 konsolfel'}\n`)
} finally {
  await browser.close()
}
