// Kalibrera hällningen mot det tal som faktiskt betyder något: hur mycket saft som
// hamnar I MÅLGLASET. Sveper lutning × sidoförskjutning med ett riktigt målglas på plats
// och kör spelets egen hällsekvens-geometri (glaset ställs OFFS px vid sidan om målet).
//
//   node scripts/_pourtune.mjs
import { chromium } from 'playwright'

const ID = 'saftbaren'
const TILTAR = process.argv[2] ? process.argv[2].split(',').map(Number) : [1.5, 1.7, 1.9, 2.1]
const OFFSAR = process.argv[3] ? process.argv[3].split(',').map(Number) : [175, 205, 235]
const MAL_X = 750 // glas 2 hemma
const HALL_MS = 3200 // hur länge lutningen hålls
const KALLA_Y = Number(process.argv[4] || 388) // källglasets fot-y (spelet: homeY - 232 = 388)

const kor = (page, tilt, offs, kallaY) =>
  page.evaluate(
    async ({ gid, tilt, offs, malX, hallMs, kallaY }) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      const w = g._world
      w.clear()
      g._busy = true // ingen beställning/drickande mitt i mätningen
      const kalla = g._glasses[1]
      const mal = g._glasses[2]
      mal.x = mal.homeX
      mal.y = mal.homeY
      mal.angle = 0
      mal.wantAngle = 0
      kalla.x = malX - offs
      kalla.y = kallaY
      kalla.angle = 0
      kalla.wantAngle = 0
      for (let r = 0; r < 13; r++)
        for (let c = 0; c < 8; c++) w.spawn(kalla.x - 49 + c * 14, kalla.y - 36 - r * 15, { pal: 1, ch: [0, 1, 0] })
      await new Promise((res) => setTimeout(res, 900))
      const fore = g._stats(kalla).n

      kalla.wantAngle = tilt
      await new Promise((res) => setTimeout(res, hallMs))
      kalla.wantAngle = 0
      await new Promise((res) => setTimeout(res, 1400)) // räta upp + låt allt landa

      const iMal = g._stats(mal).n
      const iKalla = g._stats(kalla).n
      const kvarIVarlden = w.count
      g._busy = false
      return { fore, iMal, iKalla, spill: fore - iMal - iKalla, kvarIVarlden, vinkel: Number(kalla.angle.toFixed(2)) }
    },
    { gid: ID, tilt, offs, malX: MAL_X, hallMs: HALL_MS, kallaY },
  )

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1200)

  console.log(`\n  Hällkalibrering — ${ID}   (i dag: TILT 1.05 · OFFS 205)\n`)
  console.log(`  lutning  OFFS   källY   i målet   kvar i källan   spill`)
  console.log(`  ${'-'.repeat(58)}`)
  let bast = null
  for (const t of TILTAR) {
    for (const o of OFFSAR) {
      const r = await kor(page, t, o, KALLA_Y)
      if (!bast || r.iMal > bast.r.iMal) bast = { t, o, r }
      console.log(
        `  ${String(t).padEnd(8)} ${String(o).padEnd(6)} ${String(KALLA_Y).padEnd(6)} ${String(r.iMal).padStart(6)}/${r.fore}` +
          `   ${String(r.iKalla).padStart(11)}   ${String(r.spill).padStart(5)}`,
      )
    }
  }
  console.log(`\n  ► bäst: TILT ${bast.t} · OFFS ${bast.o} → ${bast.r.iMal} av ${bast.r.fore} i målglaset`)
  console.log(`  ${errors.length ? '✗ ' + errors.join(' | ') : '✓ 0 konsolfel'}\n`)
} finally {
  await browser.close()
}
