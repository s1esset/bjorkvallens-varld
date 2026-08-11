// Fångar `natskott-pa-stan`s nätlina MED LINA I BILD — harnessens vanliga skärmdump
// tas i ett ögonblick utan aktivt skott, så den kan inte svara på portkravets fråga.
//
//   node scripts/_linabild.mjs [--ut .test-shots/_linabild.png]
//
// Skjuter ett nät, tar bilder under flykten och medan kroppen vinschas hem, och läser
// samtidigt linans tal ur den levande solvern (sag · längd · ändarnas fäste).
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const iUt = args.indexOf('--ut')
const ut = iUt >= 0 ? args[iUt + 1] : '.test-shots/_linabild.png'
const ID = 'natskott-pa-stan'

// Linans tal ur den LEVANDE solvern (samma mått som _natlinaprobe).
const linor = (page) =>
  page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('natskott-pa-stan')
    const matt = (pts) => {
      const a = pts[0]
      const b = pts[pts.length - 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const L = Math.hypot(dx, dy) || 1
      let s = 0
      let len = 0
      for (const p of pts) {
        const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (L * L)
        s = Math.max(s, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)))
      }
      for (let i = 0; i < pts.length - 1; i++) len += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
      return { sag: +s.toFixed(1), langd: +len.toFixed(1), korda: +L.toFixed(1), n: pts.length }
    }
    const ut = []
    for (const s of g._shots || []) if (s.rope?.pts?.length) ut.push({ typ: s.phase, ...matt(s.rope.pts) })
    for (const r of g._targets || []) if (r.netted && r.rope?.pts?.length) ut.push({ typ: 'vinsch', ...matt(r.rope.pts) })
    return ut
  })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k) })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1400)

  // Skjut mot flera mål i tur och ordning och fånga bilder medan linan lever.
  const rutor = []
  const MAL = [[980, 300], [300, 260], [1120, 430], [520, 200], [860, 180], [200, 380]]
  let tal = []
  for (const [x, y] of MAL) {
    await page.mouse.click(x, y)
    for (const vanta of [40, 90, 170]) {
      await page.waitForTimeout(vanta)
      const l = await linor(page)
      if (l.length) {
        tal = tal.concat(l)
        if (rutor.length < 6) rutor.push(await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 720 } }))
      }
    }
  }

  console.log(`\nlinor uppmatta i det LEVANDE spelet (${tal.length} avlasningar)`)
  for (const t of tal.slice(0, 14)) {
    console.log(`  ${t.typ.padEnd(6)} · korda ${String(t.korda).padStart(6)} px · lina ${String(t.langd).padStart(6)} px (${(t.langd / (t.korda || 1)).toFixed(2)}x) · sag ${String(t.sag).padStart(5)} px · ${t.n} punkter`)
  }
  const varst = tal.reduce((a, t) => Math.max(a, t.langd / (t.korda || 1)), 0)
  console.log(`\n  storsta lina/korda: ${varst.toFixed(2)}x  ${varst < 3 ? '(halller ihop)' : '(SPRANGD)'}`)
  console.log(`  konsolfel: ${errors.length ? errors.slice(0, 3).join(' | ') : 'inga'}`)

  if (!rutor.length) {
    console.log('\n  INGEN lina fangades — skottet hann resolvas mellan bilderna.')
  } else {
    // Rutnät: bilderna under varandra, halv skala (linan syns anda, den ar ljus).
    const bilder = rutor.map((b) => PNG.sync.read(b))
    const W = 640
    const H = 360
    const out = new PNG({ width: W, height: H * bilder.length })
    bilder.forEach((b, k) => {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * 2 * b.width + x * 2) * 4
          const o = ((y + k * H) * W + x) * 4
          out.data[o] = b.data[i]
          out.data[o + 1] = b.data[i + 1]
          out.data[o + 2] = b.data[i + 2]
          out.data[o + 3] = 255
        }
      }
    })
    writeFileSync(ut, PNG.sync.write(out))
    console.log(`\n  bild: ${ut} (${bilder.length} rutor med lina i bild)`)
  }
} finally {
  await browser.close()
}
