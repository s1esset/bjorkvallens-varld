// NYBÖRJARGREPP i `leksakslada` (D9, G1) — spelar INTE byggarens väg.
//
//   node scripts/_dag-leksakslada.mjs        (kräver dev-servern på :5173)
//
// Tio grepp som en treåring gör dem: tryck mitt på och släpp direkt, tryck i kanten,
// dra snett, dra för långsamt, håll still, rycka, släppa utanför duken … Per grepp:
// följde leksaken med (avstånd finger→leksak vid släppet), hur långt flyttades den,
// och landade den i korgen. Kör mot HEAD som kontrollarm (byt filen tillfälligt) —
// talen betyder inget utan sitt före-värde.
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const fel = []
p.on('console', m => { if (m.type() === 'error') fel.push(m.text().slice(0, 140)) })
p.on('pageerror', e => fel.push('PAGEERROR ' + String(e).slice(0, 140)))
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
await p.evaluate(() => window.__barnspel.nav.go('game', { id: 'leksakslada' }))
await p.waitForTimeout(5200)

// Översta leksaken (lägst y) — den ett barn tar först.
const topp = () => p.evaluate(() => {
  const g = window.__barnspel.game
  const cv = document.querySelector('canvas'), r = cv.getBoundingClientRect()
  const sx = r.width / 1280
  const kv = (g._leksaker || []).filter(l => l.body && !l.flyger && l.spec.key !== 'studsboll' && l.body.position.y < 700)
  kv.sort((a, b) => a.body.position.y - b.body.position.y)
  const l = kv[0]; if (!l) return null
  window.__dagLek = l
  const bd = l.body, hw = (bd.bounds.max.x - bd.bounds.min.x) / 2
  const korg = g._korg.getGlobalPosition()
  return { id: g._leksaker.indexOf(l), key: l.spec.key, x: bd.position.x, y: bd.position.y, hw,
    sx, left: r.left, top: r.top, antal: kv.length, klara: g._klara,
    korg: { x: korg.x, y: korg.y } }
})
const lage = (id) => p.evaluate((id) => {
  const l = window.__dagLek, g = window.__barnspel.game
  return l && l.body && !l.flyger && g._leksaker.includes(l) ? { x: l.body.position.x, y: l.body.position.y, borta: false } : { borta: true }
}, id)

// Ett pekspår i DESIGN-koordinater. steg = [[x,y,ms] …]; upp = var släppet sker.
const spela = (t, spar, upp) => p.evaluate(async ({ t, spar, upp }) => {
  const cv = document.querySelector('canvas')
  const ev = (typ, x, y) => cv.dispatchEvent(new PointerEvent(typ, { clientX: t.left + x * t.sx, clientY: t.top + y * t.sx,
    pointerId: 1, pointerType: 'touch', button: 0, buttons: typ === 'pointerup' ? 0 : 1, bubbles: true, isPrimary: true }))
  const w = (ms) => new Promise(r => setTimeout(r, ms))
  ev('pointerdown', spar[0][0], spar[0][1])
  for (const [x, y, ms] of spar.slice(1)) { await w(ms); ev('pointermove', x, y) }
  const l = window.__dagLek
  const vid = l && l.body ? { x: l.body.position.x, y: l.body.position.y } : null
  const s = upp || spar[spar.length - 1]
  if (upp) ev('pointermove', upp[0], upp[1])
  window.dispatchEvent(new PointerEvent('pointerup', { clientX: t.left + s[0] * t.sx, clientY: t.top + s[1] * t.sx, pointerId: 1, pointerType: 'touch', bubbles: true, isPrimary: true }))
  cv.dispatchEvent(new PointerEvent('pointerup', { clientX: t.left + s[0] * t.sx, clientY: t.top + s[1] * t.sx, pointerId: 1, pointerType: 'touch', bubbles: true, isPrimary: true }))
  return { vid, finger: spar[spar.length - 1] }
}, { t, spar, upp })

// Upp ur lådan först (lådväggen står i vägen för en rak linje — i båda armarna), sedan till korgen.
const viaUpp = (a, t, n, ms) => [...linje(a, [a[0], 170], Math.ceil(n / 2), ms), ...linje([a[0], 170], [t.korg.x, t.korg.y - 40], Math.ceil(n / 2), ms)]
const linje = (a, z, n, ms) => Array.from({ length: n }, (_, i) => [a[0] + (z[0] - a[0]) * (i + 1) / n, a[1] + (z[1] - a[1]) * (i + 1) / n, ms])

const GESTER = [
  ['tryck mitt, släpp direkt', t => [[[t.x, t.y]], null]],
  ['mitt → korgen', t => [[[t.x, t.y], ...viaUpp([t.x, t.y], t, 26, 18)], null]],
  ['kanten (80 %) → korgen', t => { const a = [t.x + t.hw * 0.8, t.y]; return [[a, ...viaUpp(a, t, 26, 18)], null] }],
  ['snett upp-höger, snabbt', t => [[[t.x, t.y], ...linje([t.x, t.y], [t.x + 260, t.y - 220], 8, 16)], null]],
  ['långsamt → korgen', t => [[[t.x, t.y], ...viaUpp([t.x, t.y], t, 60, 30)], null]],
  ['mitt → upp → golvet (miss)', t => [[[t.x, t.y], ...linje([t.x, t.y], [t.x, 170], 13, 18), ...linje([t.x, 170], [1150, 620], 13, 18)], null]],
  ['kanten uppe-vänster, snett ut', t => { const a = [t.x - t.hw * 0.7, t.y - t.hw * 0.4]; return [[a, ...linje(a, [820, 560], 20, 20)], null] }],
  ['håll still 1 s', t => [[[t.x, t.y], [t.x + 1, t.y, 500], [t.x, t.y, 500]], null]],
  ['ryck 40 px', t => [[[t.x, t.y], ...linje([t.x, t.y], [t.x + 40, t.y - 10], 3, 16)], null]],
  ['mot korgen, släpp utanför duken', t => [[[t.x, t.y], ...viaUpp([t.x, t.y], t, 20, 18), ...linje([t.korg.x, t.korg.y - 40], [1300, 300], 6, 18)], null]],
]

const ut = []
for (const [namn, f] of GESTER) {
  const t = await topp(); if (!t) { ut.push(`${namn}: ingen leksak kvar`); continue }
  const [spar, upp] = f(t)
  const r = await spela(t, spar, upp)
  await p.waitForTimeout(1400)
  const e = await lage(t.id)
  const efter = await p.evaluate(() => ({ klara: window.__barnspel.game._klara, antal: (window.__barnspel.game._leksaker || []).filter(l => l.body && !l.flyger).length }))
  const fing = r.finger, vid = r.vid
  const folj = vid ? Math.hypot(vid.x - fing[0], vid.y - fing[1]) : NaN
  const flytt = e.borta ? NaN : Math.hypot(e.x - t.x, e.y - t.y)
  ut.push(`${namn.padEnd(32)} ${t.key.padEnd(10)} finger→lek vid släpp ${isNaN(folj) ? '  –' : folj.toFixed(0).padStart(4)} px · flyttad ${e.borta ? 'I KORGEN' : flytt.toFixed(0) + ' px'} · leksaker ${t.antal}→${efter.antal}`)
  await p.waitForTimeout(600)
}
console.log('\n  leksakslada — tio nybörjargrepp\n')
for (const r of ut) console.log('  ' + r)
console.log(`\n  konsolfel: ${fel.length}`); for (const f of fel.slice(0, 6)) console.log('   ' + f)
await b.close()
