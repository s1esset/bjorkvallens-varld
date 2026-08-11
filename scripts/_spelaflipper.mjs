// NERFARTEN I FLIPPERSPELET — tar sig kulan ner längs sidan, med fenan där den står?
//
//   node scripts/_spelaflipper.mjs [--slapp 8]        (kräver dev-servern på :5173)
//
// `_kilprobe.mjs` mäter GEOMETRIN (kanalbredd, fickor). Den här svarar på den andra
// halvan: märks det när kulan rullar? Ägarens ord var "kulan kan inte åka under" och
// "kulan fastnar", och båda är påståenden om en RESA, inte om ett mått.
//
// Tre fällor är hanterade med flit:
//  · BANAN FRYSES (`_lightBumper`/`_magicLight` kopplas ur) — annars byts banan mitt i
//    mätningen och man jämför två olika bord i stället för två fenlägen.
//  · ARMARNA VÄXLAR släpp för släpp på SAMMA bana. Ett skivat spelprov provades först
//    och var dominerat av var kulan råkade vara när armen växlade: medianerna sa emot
//    varandra medan svansen (3 032 ms stopp, 21 räddningar) sa allt. Ett SLÄPP från en
//    känd punkt har ingen sådan minneseffekt.
//  · PADDLARNA RÖRS INTE. Frågan är om kulan tar sig ner av sig själv; ett tryck vore
//    en räddning som döljer svaret.
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const SLAPP = Number(opt('--slapp', 8)) // släpp per arm och sida
const TIMEOUT = 5000
const MAL_Y = 640 // nere vid paddeln — kulan har klarat nerfarten
const ID = 'flipperspel'

// Startpunkter högst upp i respektive ytterbana (kulans mittpunkt).
const START = []
for (const y of [300, 360, 420]) for (const x of [300, 326, 352]) START.push({ x, y, sida: 'v' })
for (const y of [300, 360, 420]) for (const x of [980, 954, 928]) START.push({ x, y, sida: 'h' })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('pageerror', (e) => console.log('  ! sidfel:', e.message))
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
await page.waitForFunction(() => !!window.__barnspel?.game?._phys, null, { timeout: 20000 })
await page.waitForTimeout(700)

await page.evaluate(async ([malY, timeout]) => {
  const { Body } = await import('/src/lib/physics.js')
  const g = window.__barnspel.game
  g._lightBumper = () => {}
  g._magicLight = () => {}
  const bas = g._fins.map((f) => ({ x: f.x, y: f.y }))

  window.__satt = (dx, dy) => {
    for (const b of g._phys.world.bodies.filter((k) => k.label === 'sling')) {
      const i = b.plugin.fin
      const nx = bas[i].x + (i === 0 ? 1 : -1) * dx
      const ny = bas[i].y + dy
      const d = { x: nx - b.position.x, y: ny - b.position.y }
      b.vertices.forEach((v) => { v.x += d.x; v.y += d.y })
      b.position.x = nx; b.position.y = ny
      b.bounds.min.x += d.x; b.bounds.max.x += d.x
      b.bounds.min.y += d.y; b.bounds.max.y += d.y
      g._fins[i].x = nx; g._fins[i].y = ny
      if (g._fins[i].view && !g._fins[i].view.destroyed) g._fins[i].view.position.set(nx, ny)
    }
  }

  // Ett släpp: kulan sätts i banan, ingen rör paddlarna, klockan går tills den är nere.
  window.__slapp = (x, y) => new Promise((klar) => {
    const b = g._ball
    if (b.isStatic) Body.setStatic(b, false)
    Body.setPosition(b, { x, y })
    Body.setVelocity(b, { x: 0, y: 2 })
    Body.setAngularVelocity(b, 0)
    g._stuckMs = 0
    let ms = 0
    let raddning = 0
    let sagStuck = false
    const t = (tick) => {
      ms += tick.deltaMS
      if (g._stuckMs > 2400) { if (!sagStuck) { raddning++; sagStuck = true } } else sagStuck = false
      if (b.position.y > malY || ms > timeout) {
        window.__barnspel.ctx.ticker.remove(t)
        klar({ ms: Math.round(ms), nere: b.position.y > malY, raddning, x: Math.round(b.position.x), y: Math.round(b.position.y) })
      }
    }
    window.__barnspel.ctx.ticker.add(t)
  })
}, [MAL_Y, TIMEOUT])

const ARMAR = [['NY', 0, 0], ['GAMMAL', -50, 40]]
const res = { NY: [], GAMMAL: [] }

console.log(`\nNERFART · ${ID} · ${SLAPP} släpp per arm och startpunkt · paddlarna orörda · fryst bana`)
console.log('  (GAMMAL = fenan tillbaka på (452,500)/(828,500), dvs läget före fixen)\n')

for (let omg = 0; omg < SLAPP; omg++) {
  for (const [namn, dx, dy] of ARMAR) {
    await page.evaluate(([a, b]) => window.__satt(a, b), [dx, dy])
    for (const s of START) {
      const r = await page.evaluate(([x, y]) => window.__slapp(x, y), [s.x, s.y])
      res[namn].push({ ...r, ...s })
    }
  }
}

const n0 = (v) => String(Math.round(v)).padStart(5)
for (const [namn] of ARMAR) {
  const a = res[namn]
  const fast = a.filter((r) => !r.nere)
  const tider = a.filter((r) => r.nere).map((r) => r.ms).sort((x, y) => x - y)
  const median = tider.length ? tider[tider.length >> 1] : NaN
  console.log(`  ${namn.padEnd(7)} ${a.length} släpp · FASTNADE ${fast.length} (${((100 * fast.length) / a.length).toFixed(1)} %) · median nertid ${n0(median)} ms · räddningar ${a.reduce((s, r) => s + r.raddning, 0)}`)
  const per = {}
  for (const r of fast) { const k = `${r.sida} (${r.x},${r.y})`; per[k] = (per[k] || 0) + 1 }
  for (const [k, v] of Object.entries(per).sort((x, y) => y[1] - x[1]).slice(0, 4)) console.log(`            fastnade vid ${k} × ${v}`)
}
console.log('')
await browser.close()
