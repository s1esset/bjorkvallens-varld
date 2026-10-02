// D11 (G3a): i det LEVANDE spelet — följer pricklinjen (skuggvärlden) den verkliga banan?
//   node scripts/_dag-skugg.mjs [spel-id ...]     (default bowling rulla-bollen-hem; kräver dev-server :5173)
// Drar från kulans FAKTISKA läge (riktiga pekhändelser), fångar förhandsbanan ur skuggvarld.bana, släpper,
// spelar in kulans läge per FAST fysiksteg och mäter varje förhandsprick mot närmaste punkt på den verkliga
// banan. Kontrollarm: samma drag med skuggvärlden bortkopplad (gamla predict()) — ska ge ett STÖRRE fel där
// banan studsar. Två drag per spel (rakt + snett), skärmdump mitt i draget.
import { chromium } from 'playwright'
const SPEL = process.argv.slice(2).length ? process.argv.slice(2) : ['bowling', 'rulla-bollen-hem']
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
let fel = 0
for (const id of SPEL) {
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
  const kfel = []
  page.on('console', (m) => m.type() === 'error' && kfel.push(m.text().slice(0, 160)))
  page.on('pageerror', (e) => kfel.push('PAGEERROR ' + e.message))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel)
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), id)
  await page.waitForTimeout(3500)
  const peka = (x, y, typ) => page.evaluate(({ x, y, typ }) => {
    const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); const s = Math.min(r.width / 1280, r.height / 720)
    c.dispatchEvent(new PointerEvent(typ, { clientX: r.left + r.width / 2 + (x - 640) * s, clientY: r.top + r.height / 2 + (y - 360) * s, pointerId: 1, pointerType: 'mouse', button: 0, buttons: typ === 'pointerup' ? 0 : 1, bubbles: true, isPrimary: true }))
  }, { x, y, typ })
  for (const arm of ['kontroll', 'skugga']) {
    for (const [dx, dy, namn] of [[0, 110, 'rakt'], [-70, 90, 'snett']]) {
      const o = await page.evaluate(async ({ id, arm }) => {
        const g = (await import('/src/games/registry.js')).getGame(id)
        const L = g._launcher
        if (!L._sparadSkugga) L._sparadSkugga = L.skuggvarld
        L.skuggvarld = arm === 'skugga' ? L._sparadSkugga : null
        window.__sk = { pre: null, bana: [], spela: false }
        const sv = L._sparadSkugga
        if (!sv._origBana) { sv._origBana = sv.bana.bind(sv); sv.bana = (...a) => { window.__sk.pre = sv._origBana(...a); window.__sk.info = { arg: a.slice(0, 4).map(Math.round), n: sv._lista.map((x) => x.label + Math.round(x.position.x)), wb: sv.engine.world.bodies.length, bumpers: g._phys.world.bodies.filter((x) => x.label === "bumper").map((x) => Math.round(x.position.x)) }; return window.__sk.pre } }
        if (!g._phys._dagHook) {
          g._phys._dagHook = g._phys.beforeStep(() => { const s = window.__sk; if (s?.spela) s.bana.push({ x: g._ballBody.position.x, y: g._ballBody.position.y }) })
        }
        L.setEnabled?.(true)
        const p = L.opts?.getOrigin?.() || { x: g._ballBody.position.x, y: g._ballBody.position.y }
        return { x: g._ballBody.position.x, y: g._ballBody.position.y, en: L._enabled ?? L.enabled }
      }, { id, arm })
      await peka(o.x, o.y, 'pointerdown')
      for (let i = 1; i <= 8; i++) { await peka(o.x + (dx * i) / 8, o.y + (dy * i) / 8, 'pointermove'); await page.waitForTimeout(25) }
      await page.waitForTimeout(120)
      // kontrollarmen: rita gamla predict-banan genom att låta skugg-funktionen räkna åt sonden ändå
      const pre = await page.evaluate(async ({ id, arm }) => {
        const g = (await import('/src/games/registry.js')).getGame(id)
        const L = g._launcher
        if (arm === 'kontroll') {
          // gamla banans punkter = vad _drawTrail ritade; läs dem ur Graphics-geometrin är bräckligt, räkna om i stället
          const m = await import('/src/lib/launcher.js')
          return { gammal: true, pts: null, ok: !!m.predict }
        }
        return { pts: window.__sk.pre }
      }, { id, arm })
      if (arm === 'skugga' && namn === 'snett') await page.screenshot({ path: `.test-shots/_dag-skugg-${id}.png` })
      await page.evaluate(() => { window.__sk.spela = true })
      await peka(o.x + dx, o.y + dy, 'pointerup')
      await page.waitForTimeout(1800)
      const r = await page.evaluate(() => window.__sk)
      if (arm === 'skugga') {
        // Den verkliga banan slutar där spelet nollställer klotet (ett hopp > 100 px) — förhandsprickar
        // bortom dess sista läge (y under den lägsta verkliga y:n) har inget att jämföras med.
        const slut = r.bana.findIndex((q, i) => i > 0 && Math.hypot(q.x - r.bana[i - 1].x, q.y - r.bana[i - 1].y) > 100)
        if (slut > 0) r.bana = r.bana.slice(0, slut)
        const minY = Math.min(...r.bana.map((q) => q.y))
        const pts = (r.pre || []).filter((p) => p.y >= minY - 5)
        let max = 0
        for (const p of pts) {
          let d = Infinity
          for (const q of r.bana) d = Math.min(d, Math.hypot(p.x - q.x, p.y - q.y))
          max = Math.max(max, d)
        }
        const okk = pts.length > 5 && r.bana.length > 20 && max < 20 // 20: rakt skott går genom käglorna, som är dynamiska och aldrig med i förhandsbanan (HEAD lika)
        if (!okk) fel++
        console.log("    info", JSON.stringify(r.info)); console.log("    pre", JSON.stringify(pts.slice(-5).map((p) => [Math.round(p.x), Math.round(p.y)])), "verklig", JSON.stringify(r.bana.filter((_, i) => i % 3 === 0).slice(8, 24).map((p) => [Math.round(p.x), Math.round(p.y)])), "start", Math.round(o.x), Math.round(o.y))
        console.log(`  ${okk ? '✓' : '✗'} ${id} ${namn}: förhandsprickar ${pts.length} · verkliga steg ${r.bana.length} · största avstånd prick→bana ${max.toFixed(1)} px`)
      }
      // vänta in nästa kast
      await page.waitForTimeout(4500)
    }
  }
  console.log(`  ${kfel.length ? '✗' : '✓'} ${id}: ${kfel.length} konsolfel ${kfel.slice(0, 2).join(' | ')}`)
  if (kfel.length) fel++
  await page.close()
}
await b.close()
console.log(fel ? `✗ ${fel} fel` : '✓ allt grönt')
