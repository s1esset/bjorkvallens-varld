// _grendiag.mjs — engångsdiagnos (grodan-slurp L4): vad rör grodan vid när tungan sitter i
// toppgrenen men grodan inte lyfter? Klättrar som _klatterprobe och dumpar kontaktparen.
import { chromium } from 'playwright'

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'grodan-slurp' }))
await page.waitForFunction(() => !!window.__barnspel?.game?._groda, null, { timeout: 15000 })
await page.waitForTimeout(900)
const ut = await page.evaluate(async () => {
  const g = window.__barnspel.game
  g._nastaHinder = 9999
  const d = g._dammen
  const t = d._plan.trad[0]
  const sgn = t.bank === 1 ? d._sgn : -d._sgn
  const stamX = d._xb(t.bank, t.stamU)
  const grenar = d.foremal.filter((f) => f.body.label === 'gren' && (f.body.position.x - stamX) * sgn > 0 && Math.abs(f.body.position.x - stamX) < 360)
    .map((f) => f.body).sort((a, c) => c.position.y - a.position.y)
  const vanta = (ms) => new Promise((r) => setTimeout(r, ms))
  g._tunga.nollstall()
  g._groda.teleportera(grenar[0].position.x + sgn * 90, 552, -sgn)
  g._kam.moveTo(grenar[0].position.x, 360)
  await vanta(600)
  const logg = []
  for (let i = 0; i < 3; i++) {
    const q = grenar[i]
    g._tunga.skjut(q.position.x + sgn * 30, q.position.y)
    await vanta(2500)
    const gr = g._groda
    const kontakter = []
    for (const pr of g._phys.engine.pairs.list) {
      if (!pr.isActive) continue
      const A = pr.bodyA.parent || pr.bodyA
      const B = pr.bodyB.parent || pr.bodyB
      const aG = gr.delar.includes(A)
      const bG = gr.delar.includes(B)
      if (aG === bG) continue
      const annan = aG ? B : A
      const del = (aG ? A : B).plugin?.grodDel
      kontakter.push(`${del}→${annan.label}@${Math.round(annan.position.y)} mask=${annan.collisionFilter.mask === 0xffffffff ? 'ALLT' : annan.collisionFilter.mask}`)
    }
    const k = gr.b.kropp.position
    logg.push({
      gren: i, grenY: Math.round(q.position.y), tunga: g._tunga.lage, fastY: g._tunga.body ? Math.round(g._tunga.body.position.y) : null,
      L: Math.round(g._tunga._L), langd: Math.round(g._tunga.langd), kropp: { x: Math.round(k.x), y: Math.round(k.y) },
      delarY: gr.delar.map((p) => `${p.plugin?.grodDel}:${Math.round(p.position.y)}`).join(' '),
      masker: grenar.map((b) => `${Math.round(b.position.y)}:${b.collisionFilter.mask === 0xffffffff ? 'fast' : 'igenom'}`).join(' '),
      kontakter,
    })
  }
  return logg
})
console.log(JSON.stringify(ut, null, 1))
await b.close()
