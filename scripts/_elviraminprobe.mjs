// Kugghjulens Elvira (ÅTGÄRDER V22): byter hon faktiskt uttryck?
//
// `_setElvira('😮')` satte `.text` på en ritad Graphics — ett fält som inte finns, alltså en
// tyst no-op. Sonden fryser allt annat (väntar ut pop-studsen), fotograferar en ruta runt
// Elvira, byter uttryck via spelets EGEN metod och fotograferar igen. Talet är antalet
// pixlar som skiljer sig mellan bilderna — på HEAD ska det vara 0 för varje uttryck
// (kontrollarm: den gamla koden gör ingenting), efter rättningen > 0.
//
//   node scripts/_elviraminprobe.mjs
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
p.on('pageerror', (e) => fel.push(String(e.message).slice(0, 140)))
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.__barnspel)
await p.evaluate(() => window.__barnspel.nav.go('game', { id: 'kugghjulen' }))
await p.waitForFunction(() => !!window.__barnspel.game?._elvira, null, { timeout: 15000 })
await p.waitForTimeout(1500)

const ruta = await p.evaluate(() => {
  const e = window.__barnspel.game._elvira
  const bb = e.getBounds()
  return { x: Math.max(0, Math.floor(bb.x - 30)), y: Math.max(0, Math.floor(bb.y - 40)), width: Math.ceil(bb.width + 60), height: Math.ceil(bb.height + 60) }
})
const bild = async () => PNG.sync.read(await p.screenshot({ clip: ruta }))
const skillnad = (a, c) => {
  let n = 0
  for (let i = 0; i < a.data.length; i += 4) {
    if (Math.abs(a.data[i] - c.data[i]) + Math.abs(a.data[i + 1] - c.data[i + 1]) + Math.abs(a.data[i + 2] - c.data[i + 2]) > 30) n++
  }
  return n
}

// Anropsnamnen: HEAD tar en emoji, rättningen ett uttrycksnamn — pröva båda formerna.
const UTTRYCK = [['😮', 'oj'], ['😊', 'glad'], ['🙌', 'jubel'], ['🥳', 'fest']]
const bas = await bild()
let fel0 = 0
for (const [emoji, namn] of UTTRYCK) {
  await p.evaluate(([emoji, namn]) => {
    const g = window.__barnspel.game
    g._setElvira(g._ritaElvira ? namn : emoji)
  }, [emoji, namn])
  await p.waitForTimeout(900) // pop-studsen hinner klinga ut
  const efter = await bild()
  const n = skillnad(bas, efter)
  console.log(`${namn.padEnd(6)} ${emoji}  ${n} px ändrade`)
  if (n === 0) fel0++
  await p.evaluate(() => { const g = window.__barnspel.game; g._setElvira(g._ritaElvira ? 'lugn' : '👧') })
  await p.waitForTimeout(900)
}
console.log(`\n${UTTRYCK.length - fel0} av ${UTTRYCK.length} uttryck syns i bild · ruta ${ruta.width}×${ruta.height} · sidfel ${fel.length}`)
await b.close()
