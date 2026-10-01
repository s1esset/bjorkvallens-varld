// _natspel.mjs — spelar natskott-pa-stan som ett otåligt barn: läser uppdraget ur spelet,
// byter till den hand uppdraget vill ha (trycker på den väntande handen i hörnet), siktar på
// det uppdraget räknar (mål · insnärjning · fönstermonster · lyktstolpe), spelar ett HELT varv
// till hemkomsten och vidare in i nästa runda, och lämnar sedan MITT I den sista hemkomsten,
// går in igen, trycker snabbt och lämnar igen. Skärmdump per fas + bildrutetider per fas.
//
// Fungerar mot både HEAD (uppdragen katt/paket/ballong) och den nya koden (fler uppdrag) —
// allt läses ur spelets egna fält, inga fasta koordinater.
//
//   node scripts/_natspel.mjs [--url http://localhost:5174] [--rundor 2] [--ut .test-shots/_natspel]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : d
}
const url = opt('--url', 'http://localhost:5174')
const RUNDOR = Number(opt('--rundor', 2))
const UT = opt('--ut', '.test-shots/_natspel')
const MAXS = Number(opt('--max', 260))
mkdirSync(UT, { recursive: true })
const ID = 'natskott-pa-stan'

const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 300))
})
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 300)))

const tap = (x, y) =>
  page.evaluate(({ x, y }) => {
    const cvs = document.querySelectorAll('canvas')
    const cv = cvs[cvs.length - 1]
    const r = cv.getBoundingClientRect()
    const sx = r.width / 1280
    const sy = r.height / 720
    for (const t of ['pointerdown', 'pointerup']) {
      cv.dispatchEvent(new PointerEvent(t, {
        clientX: r.left + x * sx, clientY: r.top + y * sy,
        pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true,
      }))
    }
  }, { x, y })

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
await page.waitForFunction(() => window.__natdbg && window.__natdbg._alive, null, { timeout: 15000 })

// bildrutetider: rAF-intervall, taggade med spelets fas (drive/arrive) och kvällsläge
await page.evaluate(() => {
  window.__natRam = []
  let last = performance.now()
  const f = (t) => {
    const m = window.__natdbg
    if (m && m._alive) window.__natRam.push([t - last, m._phase, +(m._kvall ?? -1).toFixed(2)])
    last = t
    window.__natRamId = requestAnimationFrame(f)
  }
  window.__natRamId = requestAnimationFrame(f)
})

const read = () =>
  page.evaluate(() => {
    const m = window.__natdbg
    if (!m || !m._alive) return null
    let def = null
    try {
      def = m._missionKey ? m._missionDef(m._missionKey) : null
    } catch {
      def = null
    }
    const mons = []
    const fonster = []
    for (const seg of m._mid || []) {
      for (const win of seg.wins || []) {
        const x = seg.c.x + win.lx
        if (win.mc && !win.mc.destroyed && !win.mc._wxCaught) mons.push({ x: Math.round(x), y: Math.round(win.cy + 6) })
        if (win.state === 'ok' && x > 280 && x < 1100) fonster.push({ x: Math.round(x), y: Math.round(win.cy) })
      }
    }
    const lyktor = (m._props || [])
      .filter((p) => p.c && !p.c.destroyed && p.def.id === 'lyktstolpe')
      .map((p) => ({ x: Math.round(p.c.x - 26), y: Math.round(p.c.y - 188), tand: !!p.c._wxTand })) // lyktans HUVUD — där ett barn pekar
    return {
      phase: m._phase,
      mode: m._mode,
      vantar: [...(m._vantar || [])],
      hander: (m._sidoHander || []).map((c) => ({ x: Math.round(c.x), y: Math.round(c.y) })),
      mKey: m._missionKey || null,
      mAct: !!m._missionActive,
      net: def ? def.net ?? null : null,
      kinds: def ? def.kinds || [] : [],
      got: m._missionGot | 0,
      need: m._missionNeed | 0,
      done: m._missionsDone | 0,
      seat: (m._seatList || []).length,
      kvall: m._kvall ?? null,
      vader: m._vader ?? null,
      targets: (m._targets || []).map((r) => ({
        kind: r.kind, x: Math.round(r.view.x), y: Math.round(r.view.y),
        stuck: !!r.stuck, netted: !!r.netted, snarjd: !!r.snarjd, golden: !!r.golden,
      })),
      mons,
      fonster,
      lyktor,
    }
  })

const shot = async (namn) => {
  await page.screenshot({ path: `${UT}/${namn}.png` })
  console.log('  [bild]', `${UT}/${namn}.png`)
}

const seen = { uppdrag: {}, toggles: 0, taps: 0, hemkomster: 0, rundor: 0, kvallMax: 0, snarj: 0, monsterTryck: 0, lyktTryck: 0 }
const t0 = Date.now()
let lastPhase = 'drive'
let bildGata = false
let bildSkymning = false
let rundaTva = false

const valjHand = async (s, net) => {
  const slot = s.vantar.indexOf(net)
  if (slot < 0) return false
  const h = s.hander[slot]
  await tap(h.x, h.y - 120)
  seen.toggles++
  await page.waitForTimeout(160)
  return true
}

while (Date.now() - t0 < MAXS * 1000) {
  const s = await read()
  if (!s) break
  if (s.kvall != null) seen.kvallMax = Math.max(seen.kvallMax, s.kvall)
  if (!bildGata && Date.now() - t0 > 2500) {
    bildGata = true
    await shot('gata')
  }
  if (!bildSkymning && s.kvall != null && s.kvall > 0.5 && s.phase === 'drive') {
    bildSkymning = true
    await shot('skymning')
  }

  if (s.phase === 'arrive' && lastPhase !== 'arrive') {
    seen.hemkomster++
    lastPhase = 'arrive'
    const nr = seen.hemkomster
    await page.waitForTimeout(2400)
    await shot(`hemkomst${nr}-a`)
    if (nr >= RUNDOR) {
      // lämna MITT i finalen, gå in igen, tryck otåligt, lämna igen
      await page.waitForTimeout(600)
      await page.evaluate(() => window.__barnspel.nav.go('library'))
      await page.waitForTimeout(700)
      await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
      await page.waitForTimeout(1300)
      for (let i = 0; i < 8; i++) {
        await tap(300 + i * 90, 300 + (i % 3) * 80)
        await page.waitForTimeout(90)
      }
      await page.waitForTimeout(400)
      await page.evaluate(() => window.__barnspel.nav.go('menu'))
      await page.waitForTimeout(900)
      break
    }
    await page.waitForTimeout(2600)
    await shot(`hemkomst${nr}-b`)
    continue
  }
  if (s.phase === 'drive' && lastPhase === 'arrive') {
    lastPhase = 'drive'
    seen.rundor++
    if (!rundaTva) {
      rundaTva = true
      await page.waitForTimeout(1200)
      await shot('runda2-start')
    }
    continue
  }

  if (s.mAct && s.mKey) {
    if (!seen.uppdrag[s.mKey]) {
      seen.uppdrag[s.mKey] = 1
      await page.waitForTimeout(500)
      await shot(`uppdrag-${s.mKey}`)
    }
    const key = s.mKey
    const net = s.net
    // fönstermonster och lyktor tar vilket nät som helst; insnärjning vill ha bollen
    if (net && s.mode !== net) {
      if (await valjHand(s, net)) continue
    }
    if (key === 'fonster') {
      const m = s.mons.find((q) => q.x > 200 && q.x < 1150)
      if (m) {
        if (s.mode === 'boll' && (await valjHand(s, 'drag'))) continue
        await tap(m.x, m.y)
        seen.monsterTryck++
        seen.taps++
        await page.waitForTimeout(260)
        continue
      }
      await page.waitForTimeout(250)
      continue
    }
    if (key === 'lykta') {
      const l = s.lyktor.find((q) => !q.tand && q.x > 120 && q.x < 1150)
      if (l) {
        await tap(l.x, l.y)
        seen.lyktTryck++
        seen.taps++
        await page.waitForTimeout(260)
        continue
      }
      await page.waitForTimeout(250)
      continue
    }
    if (key === 'snarj') {
      const t = s.targets.find((q) => !q.snarjd && !q.netted && q.x > 560 && q.x < 1100 && q.y > 380 && q.y < 600)
      if (t) {
        // bollen faller på vägen: sikta en bit ovanför målet
        await tap(t.x, t.y - 30)
        seen.snarj++
        seen.taps++
        await page.waitForTimeout(420)
        continue
      }
      await page.waitForTimeout(250)
      continue
    }
    const match = s.targets.find((t) =>
      s.kinds.includes(t.golden && t.kind === 'paket' ? 'guldpaket' : t.kind) &&
      !t.netted && !(net === 'klibb' && t.stuck) &&
      t.x > 260 && t.x < 1170 && t.y > 70 && t.y < 600)
    if (match) {
      await tap(match.x, match.y)
      seen.taps++
      await page.waitForTimeout(300)
      continue
    }
    await page.waitForTimeout(250)
    continue
  }

  // fri lek: tryck på något som rör sig, otåligt
  const any = s.targets.find((t) => !t.netted && !t.stuck && t.x > 300 && t.x < 1100 && t.y > 80 && t.y < 600)
  if (any && Math.random() < 0.6) {
    await tap(any.x, any.y)
    seen.taps++
  }
  await page.waitForTimeout(350)
}

// bildrutetider per fas (kvällsband för den nya koden)
const ram = await page.evaluate(() => (window.__natRam || []).slice())
const band = {}
for (const [dt, ph, k] of ram) {
  const nyckel = k < 0 ? ph : `${ph}/k${k < 0.34 ? 'dag' : k < 0.67 ? 'skym' : 'kvall'}`
  ;(band[nyckel] ||= []).push(dt)
}
const sammanfatta = (a) => {
  const s = [...a].sort((x, y) => x - y)
  const medel = a.reduce((x, y) => x + y, 0) / (a.length || 1)
  return { n: a.length, medelMs: +medel.toFixed(2), p95: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(1), max: +(s[s.length - 1] || 0).toFixed(1) }
}
const ramSum = Object.fromEntries(Object.entries(band).map(([k, v]) => [k, sammanfatta(v)]))

console.log(JSON.stringify({ seen, ram: ramSum, alla: sammanfatta(ram.map((r) => r[0])), errors, errorCount: errors.length, sekunder: Math.round((Date.now() - t0) / 1000) }, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
