// _biomrokprobe.mjs — röktest av grodan-slurps biomer (L6/L7): bygg varje värld, låt den gå,
// och se att grodan står på något, att inget kastar, och att hindren går att starta.
//
//   node scripts/_biomrokprobe.mjs [--biom trask,oken,…] [--bilder] [--hinder]
//
// Per biom: tvinga biomen (spelets _tvingaBiom), bygg om världen, vänta 2 s — grodans läge
// (sitter den? ligger den på startpunkten?), antal kroppar, konstens reserver. --hinder startar
// VARJE hinder i biomens pool i tur och ordning (3 s var) och räknar konsolfel. --bilder tar en
// skärmdump från start (.test-shots/_biomrok-<biom>.png). Kräver dev-servern.
import { chromium } from 'playwright'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const BIOMER = val('--biom', 'trask,oken,strand,kok,vardagsrum,badrum').split(',')
const BILDER = argv.includes('--bilder')
const HINDER = argv.includes('--hinder')

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
const varn = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 200) + ' @ ' + String(e.stack || '').split(/\n/).slice(1, 4).join(' | ').slice(0, 400)))
page.on('console', (m) => {
  if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 300))
  if (m.type() === 'warning' && /grodan-slurp/.test(m.text())) varn.push(m.text().slice(0, 200))
})
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(800)

for (const biom of BIOMER) {
  const fel0 = fel.length
  await page.evaluate((biom) => {
    const g = window.__barnspel.game
    g._tvingaBiom = biom
    g._rivVarld()
    g._byggVarld(g._ctx)
  }, biom)
  await page.waitForTimeout(2200)
  const r = await page.evaluate(() => {
    const g = window.__barnspel.game
    const gr = g._groda
    const d = g._dammen
    const sp = d.startPunkt
    return {
      biom: g._biomNamn,
      lage: gr.lage,
      paMark: gr.paMark,
      under: gr.underlag?.label ?? null,
      avstandStart: Math.round(Math.hypot(gr.pos.x - sp.x, gr.pos.y - sp.y)),
      kroppar: g._phys.engine.world.bodies.length,
      foremal: d.foremal.length,
      mobler: d.mobler.map((m) => m.typ).join(','),
      vatten: [Math.round(d._vx0), Math.round(d._vx1)],
      kor: Math.round(d.grodungar.plats.x),
      hinderPool: g._biom.hinder,
    }
  })
  if (BILDER) await page.screenshot({ path: `.test-shots/_biomrok-${biom}.png` })
  if (HINDER) {
    r.hinder = {}
    for (const typ of [...new Set(r.hinderPool)]) {
      const f0 = fel.length
      const s = await page.evaluate((typ) => {
        const g = window.__barnspel.game
        g._hinder.avsluta()
        const h = g._hinder.starta(typ, g._groda.pos.x)
        return h ? h.typ : null
      }, typ)
      await page.waitForTimeout(3000)
      const kvar = await page.evaluate(() => window.__barnspel.game._hinder.aktiv?.typ ?? null)
      r.hinder[typ] = { start: s, efter3s: kvar, fel: fel.length - f0 }
    }
    await page.evaluate(() => window.__barnspel.game._hinder.avsluta())
  }
  r.nyaFel = fel.length - fel0
  console.log(JSON.stringify(r))
}
console.log('konsolfel:', fel.length, fel.slice(0, 8))
console.log('konstvarningar:', varn.length, varn.slice(0, 6))
await b.close()
