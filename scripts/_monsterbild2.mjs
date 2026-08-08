// Ställer upp ALLA TOLV monsterarter (de sex befintliga + sex nya kandidater)
// i riktig PixiJS i riktig Chrome och tar en skärmdump.
//
// De sex befintliga hämtas ur det RIKTIGA spelet (spawnas och flyttas över till
// ett eget rutnät), de sex nya evalueras in från scratchpad-filen med samma
// hjälpare som index.js ger dem. Varje ruta har en delad bakgrund — mörk natt-stad
// till vänster, ljus pastellförort till höger — och en tunn referenscirkel r=42
// (fysikkroppen) så att silhuett-lådan går att MÄTA i bilden, inte gissa.
//
//   node scripts/_monsterbild2.mjs [--nya <fil>]  →  .test-shots/natskott-monster12.png
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d)
const url = arg('--url', 'http://localhost:5173')
const nyaFil = arg(
  '--nya',
  'C:/Users/Admin/AppData/Local/Temp/claude/C--repos-pwagames/e008ee63-a3fa-438e-b721-28622dc469f8/scratchpad/monster2.js',
)
const SKALA = Number(arg('--skala', '1.9'))
const TINT_IX = Number(arg('--tint', '-1')) // -1 = en färg per art (index = plats)
const UT = arg('--ut', '.test-shots/natskott-monster12.png')
const ID = 'natskott-pa-stan'
const GAMLA = ['ludd', 'goblin', 'tenta', 'taggis', 'flaxis', 'sten']

const nyaSrc = readFileSync(nyaFil, 'utf8')

const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
await page.waitForTimeout(1400)

// _spawnTick anropas av _update MED ctx — byt ut den för att komma åt ctx.
await page.evaluate((arter) => {
  const m = window.__natdbg
  window.__spawnade = []
  for (const r of [...m._targets]) m._removeTarget(r)
  m._gustTimer = 999
  m._skataTimer = 999
  m._heistTimer = 999
  m._spawnTimer = 999
  m._kvar = [...arter]
  m._spawnTick = function (ctx) {
    window.__ctx = ctx
    const art = m._kvar.shift()
    if (!art) return
    const rec = this._spawnTarget(ctx, 'monster', 300 + window.__spawnade.length * 60, { art, force: true })
    if (!rec) return
    rec.walkV = 0
    rec.body.isStatic = true
    window.__spawnade.push({ art, rec })
  }
  m._shiftBodies = () => {}
  m._behave = () => {}
}, GAMLA)

for (let i = 0; i < GAMLA.length; i++) {
  await page.evaluate(() => (window.__natdbg._spawnTimer = 0.01))
  await page.waitForTimeout(140)
}
await page.evaluate(() => (window.__natdbg._spawnTimer = 999))

// Bygg rutnätet: 6 kolumner × 2 rader, tolv arter, delad bakgrund per ruta.
const rapport = await page.evaluate(
  ({ src, skala, tintIx }) => {
    window.__tintIx = tintIx
    const m = window.__natdbg
    const ctx = window.__ctx
    const Container = m._root.constructor
    // hitta Graphics-klassen i det levande trädet (namn kan vara manglade)
    let Graphics = null
    const walk = (n, d) => {
      if (!n || Graphics || d > 8) return
      if (typeof n.circle === 'function' && typeof n.fill === 'function') Graphics = n.constructor
      for (const ch of n.children || []) walk(ch, d + 1)
    }
    walk(m._root, 0)
    if (!Graphics) return { fel: 'hittade ingen Graphics i trädet' }

    // Samma hjälpare som index.js ger ritfunktionerna (kopierade ordagrant).
    const shade = (hex, amt) => {
      const r = (hex >> 16) & 0xff
      const g = (hex >> 8) & 0xff
      const b = hex & 0xff
      const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
      return (d(r) << 16) | (d(g) << 8) | d(b)
    }
    const tint = (hex, t) => {
      const cr = 0xff
      const cg = 0xfd
      const cb = 0xf7
      const r = (hex >> 16) & 0xff
      const g = (hex >> 8) & 0xff
      const b = hex & 0xff
      const mix = (v, c) => Math.round(v + (c - v) * t)
      return (mix(r, cr) << 16) | (mix(g, cg) << 8) | mix(b, cb)
    }
    const MONSTER_OGA = 0x4a3f6b
    const MONSTER_MUN = 0x33291f
    const MONSTER_CREAM = 0xfff3d6
    const MONSTER_ROSA = 0xf6c2d3
    const slumpFarg = (list) => list[(Math.random() * list.length) | 0]
    const monsterOga = (g, x, y, r, blick = 0) => {
      g.circle(x, y, r).fill(0xffffff)
      g.circle(x + blick, y + r * 0.14, r * 0.52).fill(MONSTER_OGA)
      g.circle(x + blick + r * 0.22, y - r * 0.3, Math.max(1.4, r * 0.22)).fill(0xffffff)
    }

    let nya
    try {
      // eslint-disable-next-line no-new-func
      const f = new Function(
        'Container', 'Graphics', 'shade', 'tint', 'monsterOga', 'slumpFarg',
        'MONSTER_OGA', 'MONSTER_MUN', 'MONSTER_CREAM', 'MONSTER_ROSA',
        src + '\n;return NYA_MONSTER_ARTER',
      )
      nya = f(Container, Graphics, shade, tint, monsterOga, slumpFarg, MONSTER_OGA, MONSTER_MUN, MONSTER_CREAM, MONSTER_ROSA)
    } catch (e) {
      return { fel: 'kunde inte evaluera nya arter: ' + (e.message || String(e)) }
    }

    const overlay = new Container()
    overlay.eventMode = 'none'
    ctx.stage.addChild(overlay)
    for (const ch of ctx.stage.children) if (ch !== overlay) ch.visible = false

    const CW = 1280 / 6
    const CH = 360
    const platser = []
    const namn = []

    const cell = (i) => ({ col: i % 6, row: (i / 6) | 0 })
    for (let i = 0; i < 12; i++) {
      const { col, row } = cell(i)
      const cx = col * CW + CW / 2
      const cy = row * CH + CH / 2 + 14
      const bg = new Graphics()
      bg.rect(col * CW, row * CH, CW / 2, CH).fill(0x2f3d54) // natt-stad
      bg.rect(col * CW + CW / 2, row * CH, CW / 2, CH).fill(0xe6eef7) // pastellförort
      bg.rect(col * CW, row * CH, 1.5, CH).fill({ color: 0x000000, alpha: 0.25 })
      bg.eventMode = 'none'
      overlay.addChild(bg)
      const ring = new Graphics()
      ring.circle(cx, cy, 42 * skala).stroke({ width: 1.5, color: 0xff4fa3, alpha: 0.85 })
      ring.moveTo(cx - 48 * skala, cy + 38 * skala).lineTo(cx + 48 * skala, cy + 38 * skala)
        .stroke({ width: 1.2, color: 0x35ffb0, alpha: 0.9 })
      ring.eventMode = 'none'
      overlay.addChild(ring)
      platser.push({ cx, cy })
    }

    const matt = []
    const placera = (i, node, id) => {
      const { cx, cy } = platser[i]
      const holder = new Container()
      holder.position.set(cx, cy)
      holder.scale.set(skala)
      holder.eventMode = 'none'
      holder.addChild(node)
      node.position.set(0, 0)
      node.scale.set(1)
      overlay.addChild(holder)
      const b = node.getLocalBounds()
      matt.push({ i, id, x0: +b.minX.toFixed(1), x1: +b.maxX.toFixed(1), y0: +b.minY.toFixed(1), y1: +b.maxY.toFixed(1) })
      namn.push(id)
    }

    // 0–5: de befintliga, hämtade ur spelet
    window.__spawnade.forEach((s, k) => {
      const node = s.rec.inner.children[0]
      if (node) placera(k, node, s.art)
    })
    // 6–11: de nya
    nya.forEach((spec, k) => {
      const p = spec.tints[(window.__tintIx < 0 ? k : window.__tintIx) % spec.tints.length]
      const node = spec.draw(p)
      node.eventMode = 'none'
      node.interactiveChildren = false
      placera(6 + k, node, spec.id)
    })

    // etiketter som DOM ovanpå canvasen (Text-klassen behöver inte letas fram)
    const cvs = [...document.querySelectorAll('canvas')].pop()
    const r = cvs.getBoundingClientRect()
    const sx = r.width / 1280
    const sy = r.height / 720
    for (let i = 0; i < namn.length; i++) {
      const { col, row } = cell(i)
      const d = document.createElement('div')
      d.textContent = `${i + 1}. ${namn[i]}`
      d.style.cssText = `position:fixed;left:${r.left + (col * CW + 6) * sx}px;top:${r.top + (row * CH + 6) * sy}px;` +
        'font:bold 15px sans-serif;color:#fff;background:rgba(0,0,0,.55);padding:2px 7px;border-radius:6px;z-index:99999;pointer-events:none'
      document.body.appendChild(d)
    }
    return { matt, antal: namn.length }
  },
  { src: nyaSrc, skala: SKALA, tintIx: TINT_IX },
)

await page.waitForTimeout(500)
await page.screenshot({ path: UT })

if (rapport.fel) console.log('✗ ' + rapport.fel)
else {
  console.log(`arter i bild: ${rapport.antal}`)
  console.log('silhuett-lådor (lokala designkoordinater, mål: x ±40, topp -42, botten 38):')
  for (const b of rapport.matt) {
    const flagg = []
    if (b.x0 < -43 || b.x1 > 43) flagg.push('BRED')
    if (b.y0 < -46) flagg.push('HÖG')
    if (b.y1 > 41 || b.y1 < 33) flagg.push('BOTTEN')
    console.log(
      `  ${String(b.i + 1).padStart(2)} ${b.id.padEnd(8)} x ${String(b.x0).padStart(7)}..${String(b.x1).padStart(6)}` +
        `   y ${String(b.y0).padStart(7)}..${String(b.y1).padStart(6)}  ${flagg.join(' ')}`,
    )
  }
}
console.log(errors.length ? `✗ ${errors.length} konsolfel: ${errors[0]}` : '✓ 0 konsolfel')
await browser.close()
process.exit(errors.length || rapport.fel ? 1 : 0)
