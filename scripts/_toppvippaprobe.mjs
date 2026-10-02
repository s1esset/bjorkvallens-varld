// Node: prydnadens fjäder i bygg-en-kompis — rör sig ritad geometri vid stöt, stilla i vila, tickerlös rigg.
//   node scripts/_toppvippaprobe.mjs
const ctxNoop = new Proxy(function () {}, { get: () => ctxNoop, set: () => true, apply: () => ctxNoop })
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctxNoop }) }
const { byggVarelse, vippaTopp, TOPPAR, byggKompis } = await import('../src/games/bygg-en-kompis/varelse.js')
let fel = 0
const ok = (n, c, d = '') => { console.log(`  ${c ? '✓' : '✗'} ${n}${d ? ' · ' + d : ''}`); if (!c) fel++ }
const bb = (n) => { const b = n.getBounds(); return [b.minX, b.maxX, b.minY, b.maxY].map((v) => +v.toFixed(2)).join(',') }
for (let t = 0; t < TOPPAR.length; t++) {
  const v = byggVarelse({ kropp: 0, ogon: 0, mun: 0, topp: t, farg: 0, storlek: 1 }, { x: 0, y: 0 })
  const vip = vippaTopp(v, { ticker: null })
  const vila = bb(v.toppVipp)
  vip.stot(1)
  let maxD = 0
  for (let i = 0; i < 12; i++) { vip.steg(1000 / 60); const b = v.toppVipp.getBounds(); maxD = Math.max(maxD, Math.abs(b.maxX - +vila.split(',')[1])) }
  for (let i = 0; i < 60 * 8; i++) vip.steg(1000 / 60)
  ok(`${TOPPAR[t].id}: rör sig vid stöt (±${maxD.toFixed(1)} px) och står exakt still efter 8 s`, maxD > 0.5 && bb(v.toppVipp) === vila && vip.vila && v.toppVipp.skew.x === 0)
  vip.destroy()
}
const k = byggKompis({ kropp: 0, ogon: 0, mun: 0, topp: 2, farg: 0, storlek: 1 })
k.hoppa(1)
let rort = false
for (let i = 0; i < 60; i++) { k.tick(1000 / 60, null); if (k._v.toppVipp.skew.x !== 0) rort = true }
for (let i = 0; i < 60 * 8; i++) k.tick(1000 / 60, null)
ok('rigg: antennerna (skew.x) rör sig efter landning och är stilla i vila', rort && k._v.toppVipp.skew.x === 0 && k._vipp.vila)
k.destroy()
ok('rigg: destroy utan fel', true)
console.log(fel ? `\n${fel} fel` : '\nalla gröna')
process.exit(fel ? 1 : 0)
