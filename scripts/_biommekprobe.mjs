// _biommekprobe.mjs — mäter att L6/L7-biomernas FYSIK faktiskt gör något (docs §4i–4j), var och en
// mot en kontrollarm i en biom utan egenskapen. En spelsond (_bajsloopprobe) rör sig hela tiden och
// utlöser aldrig t.ex. den heta sanden — här ställs läget upp med flit.
//
//   node scripts/_biommekprobe.mjs
//
//   het sand   öknen: grodan sitter still på sanden 7 s → antal tripp (`hetSand` i loggen).
//              Kontroll: skogen (samma mark, ingen het sand) → 0.
//   vågor      stranden: drivvedsstocken i havet — hur långt fram och tillbaka den rör sig på 9 s.
//              Kontroll: samma mätning med vågorna avstängda (biom.vagor = null) i samma värld.
//   halt kakel badrummet: grodan läggs på den hala remsan och på vanligt kakel med samma fart i
//              sidled — glidsträckan på 1,5 s.
//   tjockt     träsket mot dammen: grodan i vattnet får samma simtag — sträcka på 1 s.
// Kräver dev-servern.
import { chromium } from 'playwright'

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
page.on('pageerror', (e) => fel.push('PAGEERROR ' + String(e.message).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') fel.push('CONSOLE ' + m.text().slice(0, 200)) })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(800)

const bygg = (biom) => page.evaluate((biom) => {
  const g = window.__barnspel.game
  g._tvingaBiom = biom
  g._rivVarld()
  g._byggVarld(g._ctx)
  g._hinder.avsluta()
  g._hinderKlocka = -9999 // inga hinder under mätningen
}, biom)
const loggAntal = (ev) => page.evaluate((ev) => (window.__gamelog?.snapshot()?.timeline || []).filter((h) => h.cat === 'grodan' && h.event === ev).length, ev)
const ut = {}

// ── het sand ────────────────────────────────────────────────────────────────────────────
for (const biom of ['oken', 'skog']) {
  await bygg(biom)
  await page.waitForTimeout(1500)
  const f0 = await loggAntal('hetSand')
  const under = await page.evaluate(() => window.__barnspel.game._groda.underlag?.label)
  await page.waitForTimeout(7000)
  ut['hetSand-' + biom] = { under, tripp: (await loggAntal('hetSand')) - f0 }
}

// ── vågor ───────────────────────────────────────────────────────────────────────────────
for (const arm of ['vagor', 'kontroll']) {
  await bygg('strand')
  await page.waitForTimeout(800)
  const r = await page.evaluate(async (arm) => {
    const g = window.__barnspel.game
    const d = g._dammen
    if (arm === 'kontroll') d.biom = { ...d.biom, vagor: null }
    d.flytvolym.stromX = 0
    const s = d._stockar[0]
    if (!s) return { fel: 'ingen stock' }
    const xs = []
    const t0 = performance.now()
    while (performance.now() - t0 < 9000) {
      xs.push(s.body.position.x)
      await new Promise((r) => setTimeout(r, 100))
    }
    return { min: Math.round(Math.min(...xs)), max: Math.round(Math.max(...xs)), sving: Math.round(Math.max(...xs) - Math.min(...xs)), netto: Math.round(xs[xs.length - 1] - xs[0]), landDir: d._plan.landDir }
  }, arm)
  ut['vagor-' + arm] = r
}

// ── halt kakel ──────────────────────────────────────────────────────────────────────────
await bygg('badrum')
await page.waitForTimeout(800)
for (const arm of ['halt', 'kakel']) {
  const r = await page.evaluate(async (arm) => {
    const g = window.__barnspel.game
    const d = g._dammen
    const G = d._plan.gol
    const h = d._halt?.[0]
    if (!h) return { fel: 'ingen hal remsa' }
    // Glid bort från badkaret: den hala remsan ligger mot gölen.
    const ut = h.x0 >= G.x1 - 40 ? 1 : -1
    const x0 = arm === 'halt' ? (ut > 0 ? h.x0 + 40 : h.x1 - 40) : ut > 0 ? h.x1 + 250 : h.x0 - 250
    const gr = g._groda
    gr.teleportera(x0, 488, ut)
    await new Promise((r) => setTimeout(r, 900))
    const a = gr.pos.x
    gr.knuffa(ut * 7, -0.5, 1)
    await new Promise((r) => setTimeout(r, 1500))
    return { under: gr.underlag?.label, friktion: gr.underlag?.friction, glid: Math.round(Math.abs(gr.pos.x - a)) }
  }, arm)
  ut['halt-' + arm] = r
}

// ── tjockt vatten ───────────────────────────────────────────────────────────────────────
for (const biom of ['trask', 'damm']) {
  await bygg(biom)
  await page.waitForTimeout(800)
  const r = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const gr = g._groda
    const d = g._dammen
    // En fri vattenyta: långt från blad, stenar och tuvor.
    let x = 1280
    for (let f = 0; f < 200; f++) {
      const k = 400 + Math.random() * 1760
      if (d.foremal.every((o) => Math.abs(o.body.position.x - k) > 200)) {
        x = k
        break
      }
    }
    gr.teleportera(x, 575, 1)
    await new Promise((r) => setTimeout(r, 1500))
    const a = gr.pos.x
    gr.knuffa(4.4, -0.8, 0.7)
    gr.simtag(1)
    await new Promise((r) => setTimeout(r, 1000))
    return { lage: gr.lage, simSträcka: Math.round(gr.pos.x - a), motstand: d.flytvolym.motstand }
  })
  ut['tjockt-' + biom] = r
}

console.log(JSON.stringify(ut, null, 1))
console.log('konsolfel:', fel.length, fel.slice(0, 5))
await b.close()
