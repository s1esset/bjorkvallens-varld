// Båg-sond (ÅTGÄRDER V23): vilka `arc()` drar FAKTISKT ett streck, och hur stort blir det?
//
// Mekanismen, läst ur Pixi 8.19 (inte den `_bagscan.mjs` utgick från):
//   · `arc()` på en NY väg lägger inte in någon startpunkt (`ShapePath.arc` → `_ensurePoly(false)`).
//     En färsk Graphics, eller en efter `clear()`, vars första kommando är `arc()` ritar rent.
//   · Men efter VARJE `fill()`/`stroke()` sår `GraphicsContext._initNextPathLocation` nästa väg
//     med `moveTo(förra vägens sista punkt)`. Slutade den med en sluten form (circle, rect,
//     roundRect, ellipse, poly …) har `getLastPoint` inget fall för den och ger `Point.shared` =
//     (0,0) — ORIGO. En `arc()` som följer drar då ett streck dit (stroke) eller blir en solfjäder
//     därifrån (fill). Så föll kugghjulens Elvira: `circle().fill()` följt av `arc().fill()`.
//   · Slutade förra vägen med en `arc()` läser `getLastPoint` data[5]/data[6] — argumenten är
//     bara sex — och sådden blir (undefined, undefined). Loggas som `nan`.
//     Den NaN-sådden ritar ingenting (uppmätt, `_bagnanprobe.mjs`: samma pixlar som en ren båge).
//   · Den ALLMÄNNA regeln: `arc()` fortsätter en öppen polygon om det finns en, så varje båge
//     drar ett streck från pennans läge till sin egen start. Sådden ovan är ett fall; två KEDJADE
//     bågar i samma väg (`g.arc(…).arc(…)`) är ett annat — ett streck från första bågens slut
//     till andra bågens start (djurmunnen i lib/artikoner.js). `closePath()` och slutna former
//     (circle, rect, ellipse, roundRect, poly …) avslutar polygonen, och då börjar bågen rent.
// Sonden hakar på appens egen GraphicsContext och mäter varje `arc()` som har en penna:
// STRECKET (stroke: avståndet penna → bågens start) eller KILEN (fill: triangelarean
// penna–start–slut, det som skiljer fyllningen från den avsedda). Rättningen är ett `moveTo`
// till bågens start — sonden redovisar den för sig ('moveTo') med 0,0 px, och en avsiktlig
// tårtbit (moveTo till mitten) med radien. Slutraden listar båda, så rättningen är MÄTT.
//
//   node scripts/_bagprobe.mjs [id id …] [--vanta 2500] [--ut .test-logs/_bag.json]
//
// KONTROLLARM (körs alltid först, sonden avbryter om den faller): circle().fill() → arc().stroke()
// MÅSTE ge ett streck från sådden (0,0), två kedjade bågar MÅSTE ge 60 px från vägen; samma med
// moveTo före, en färsk arc() och en avsiktlig tårtbit (moveTo till mitten) får INTE ge något.
// Täcker bara det som ritas under monteringen + väntan — bågar som ritas vid tryck syns inte här.
import { chromium } from 'playwright'
import fs from 'node:fs'

const argv = process.argv.slice(2)
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const flaggaV = (n) => argv.includes(n)
const VANTA = +val('--vanta', 2500)
const UT = val('--ut', '.test-logs/_bag.json')
let ids = argv.filter((a, i) => !a.startsWith('--') && !['--vanta', '--ut'].includes(argv[i - 1]))

const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
const sidfel = []
p.on('pageerror', (e) => sidfel.push(String(e.message).slice(0, 140)))
await p.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.__barnspel)
if (!ids.length) ids = await p.evaluate(async () => (await import('/src/games/registry.js')).GAMES.map((g) => g.id))

const kontroll = await p.evaluate(async () => {
  const url = performance.getEntriesByType('resource').map((r) => r.name).filter((n) => /pixi__js\.js/.test(n)).pop()
  if (!url) return { fel: 'hittade inte appens pixi-modul' }
  const PIXI = await import(url)
  const GC = PIXI.GraphicsContext.prototype
  const traffar = (window.__bagTraffar = new Map())
  const origInit = GC._initNextPathLocation
  GC._initNextPathLocation = function () {
    origInit.call(this)
    this.__sadd = this._activePath.instructions[0]
  }
  const plats = () => {
    const rader = String(new Error().stack).split('\n')
    // Hoppa över bage() i lib/form.js — platsen är den som ANROPADE hjälparen.
    const r = rader.find((l) => /\/src\//.test(l) && !/pixi/.test(l) && !/\/src\/lib\/form\.js/.test(l)) || ''
    const m = r.match(/\/(src\/[^?:]+)(?:\?[^:]*)?:(\d+):\d+/)
    return m ? `${m[1]}:${m[2]}` : '(okänd)'
  }
  // Pennans läge som `ShapePath` kommer att se det: en ÖPPEN polygon (moveTo/lineTo/kurvor/arc)
  // har en sista punkt, och `arc()` lägger sina punkter i den — alltså ett streck därifrån.
  // `closePath()` och slutna former (circle, rect, ellipse, roundRect, poly …) avslutar
  // polygonen via `endPoly`, och då börjar bågen rent. Två källor: sådden efter fill/stroke
  // ('sadd') och vägens egen föregående del, t.ex. två kedjade bågar ('vag').
  const OPPNA = { moveTo: [0, 1], lineTo: [0, 1], quadraticCurveTo: [2, 3], bezierCurveTo: [4, 5] }
  const penna = (ins) => {
    let pos = null
    let kalla = null
    for (const i of ins) {
      const d = i.data
      if (OPPNA[i.action]) { pos = [d[OPPNA[i.action][0]], d[OPPNA[i.action][1]]]; kalla = i }
      else if (i.action === 'arc') { pos = [d[0] + d[2] * Math.cos(d[4]), d[1] + d[2] * Math.sin(d[4])]; kalla = i }
      else { pos = null; kalla = null }
    }
    return pos ? { pos, kalla } : null
  }
  // Ett UTTRYCKLIGT moveTo är ett val, inte en fälla: `moveTo(mitten).arc(mitten …)` är en tårtbit
  // (sapbubblornas fläktblad, knyttkupans kvadrantplåt). Märk dem — `GraphicsContext.moveTo`
  // skriver över en ensam sådd PÅ PLATS (samma objekt), så objektidentiteten räcker inte.
  const uttryckliga = new WeakSet()
  const origMoveTo = GC.moveTo
  GC.moveTo = function (x, y) {
    const r = origMoveTo.call(this, x, y)
    const ins = this._activePath.instructions
    uttryckliga.add(ins[ins.length - 1])
    if (ins[ins.length - 1] === this.__sadd) this.__sadd = null
    return r
  }
  const origArc = GC.arc
  GC.arc = function (x, y, r, a0, a1, ccw) {
    const pn = penna(this._activePath.instructions)
    // En uttrycklig penna mäts också, men redovisas för sig ('moveTo'): efter V23 står varje
    // bage()-plats här med 0,0 px — det är MÄTNINGEN av rättningen, inte ett undantag från den.
    if (pn) {
      const t = this._transform
      const cx = t.a * x + t.c * y + t.tx
      const cy = t.b * x + t.d * y + t.ty
      const s = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)]
      const e = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)]
      const lista = (this.__vantar ||= [])
      lista.push({ plats: plats(), sadd: pn.pos, kalla: uttryckliga.has(pn.kalla) ? 'moveTo' : pn.kalla === this.__sadd ? 'sadd' : 'vag', s, e, r })
    }
    return origArc.call(this, x, y, r, a0, a1, ccw)
  }
  const avsluta = (ctx, sort, style) => {
    const lista = ctx.__vantar
    if (!lista) return
    ctx.__vantar = null
    for (const v of lista) matOch(v, sort, style)
  }
  const matOch = (v, sort, style) => {
    const [sx, sy] = v.sadd
    const nan = !Number.isFinite(sx) || !Number.isFinite(sy)
    const streck = nan ? NaN : Math.hypot(v.s[0] - sx, v.s[1] - sy)
    const kil = nan ? NaN : Math.abs((v.s[0] - sx) * (v.e[1] - sy) - (v.s[1] - sy) * (v.e[0] - sx)) / 2
    const matt = sort === 'fill' ? kil : streck
    const k = `${v.plats} ${sort} ${v.kalla}`
    const f = traffar.get(k) || { plats: v.plats, sort, kalla: v.kalla, n: 0, max: 0, nan: 0, sadd: v.sadd, bredd: style?.width }
    f.n++
    if (nan) f.nan++
    else if (matt > f.max) { f.max = matt; f.sadd = v.sadd }
    traffar.set(k, f)
  }
  const origFill = GC.fill
  GC.fill = function (style, a) { avsluta(this, 'fill', style); return origFill.call(this, style, a) }
  const origStroke = GC.stroke
  GC.stroke = function (style) { avsluta(this, 'stroke', style); return origStroke.call(this, style) }

  // Kontrollarm: fyra kända lägen. Ett streck under 0,5 px räknas inte (moveTo till bågens
  // egen start ger 0,0 — det ÄR rättningen, och sonden ser den som en penna på rätt ställe).
  const G = PIXI.Graphics
  const matt = () => { const v = [...traffar.values()].filter((f) => f.max > 0.5 && f.kalla !== 'moveTo'); traffar.clear(); return v }
  traffar.clear()
  new G().circle(0, 0, 5).fill(0xff0000).arc(50, 50, 10, 0, 1).stroke({ width: 2 })
  const a = matt()
  new G().arc(0, 0, 10, 0, Math.PI).arc(40, 0, 10, 0, Math.PI).stroke({ width: 2 })
  const k = matt()
  new G().circle(0, 0, 5).fill(0xff0000).moveTo(60, 50).arc(50, 50, 10, 0, 1).stroke({ width: 2 })
  new G().arc(50, 50, 10, 0, 1).stroke({ width: 2 })
  new G().circle(0, 0, 5).fill(0xff0000).moveTo(50, 50).arc(50, 50, 10, 0, 1).fill(0xff0000) // tårtbit
  const falska = matt().length
  return {
    sadd: a.length === 1 && a[0].kalla === 'sadd' ? a[0].sadd : null,
    sadd_streck: +(a[0]?.max || 0).toFixed(1),
    kedja: k.length === 1 && k[0].kalla === 'vag' ? +k[0].max.toFixed(1) : null,
    falska,
  }
})
console.log('kontrollarm:', JSON.stringify(kontroll))
if (kontroll.fel || kontroll.sadd?.[0] !== 0 || kontroll.sadd?.[1] !== 0 || kontroll.kedja !== 60 || kontroll.falska !== 0) {
  console.log('KONTROLLARMEN FÖLL — sonden mäter inte det den ska. Avbryter.')
  await b.close()
  process.exit(1)
}

const res = {}
for (const id of ids) {
  await p.evaluate(() => { window.__bagTraffar.clear(); window.__barnspel.nav.go('library') })
  await p.waitForTimeout(300)
  await p.evaluate(() => window.__bagTraffar.clear())
  await p.evaluate((id) => window.__barnspel.nav.go('game', { id }), id)
  try {
    await p.waitForFunction(() => !!window.__barnspel.ctx?.progress, null, { timeout: 15000 })
  } catch { res[id] = { fel: 'monterade inte' }; continue }
  await p.waitForTimeout(VANTA)
  const alla = await p.evaluate(() => [...window.__bagTraffar.values()])
  res[id] = alla
  // Bara det som RITAR något: NaN-sådd ger samma pixlar som en ren båge (_bagnanprobe.mjs),
  // och 0,0 px är en penna som redan står på bågens start.
  const t = alla.filter((f) => f.max > 0.5 && f.kalla !== 'moveTo')
  if (t.length) {
    console.log(`${id}`)
    for (const f of t) {
      const matt = f.nan === f.n ? 'sådd NaN' : f.sort === 'fill' ? `kil ${f.max.toFixed(0)} px²` : `streck ${f.max.toFixed(1)} px`
      console.log(`   ${f.plats.padEnd(44)} ${f.sort.padEnd(6)} ${f.kalla.padEnd(4)} ×${String(f.n).padEnd(4)} ${matt}  sådd (${f.sadd.map((v) => (Number.isFinite(v) ? +v.toFixed(1) : v)).join(',')})${f.nan && f.nan < f.n ? ` · ${f.nan} NaN` : ''}`)
    }
  }
}
await p.evaluate(() => window.__barnspel.nav.go('library'))
await b.close()
const alla = Object.values(res).filter(Array.isArray).flat()
const platser = new Map()
for (const f of alla) if (f.max > 0.5 && f.kalla !== 'moveTo') platser.set(f.plats, f)
console.log(`\n${platser.size} båg-platser ritar ett streck eller en kil (${ids.length} spel)`)
console.log([...platser.keys()].sort().join('\n'))
// Uttryckliga pennor: bage()-platserna ska stå på 0,0 px, tårtbitarna på sin radie.
const penn = new Map()
for (const f of alla) {
  if (f.kalla !== 'moveTo') continue
  const g = penn.get(f.plats) || { n: 0, max: 0, nan: 0 }
  g.n += f.n
  g.nan += f.nan
  g.max = Math.max(g.max, f.max)
  penn.set(f.plats, g)
}
const noll = [...penn].filter(([, g]) => g.max <= 0.5)
const storre = [...penn].filter(([, g]) => g.max > 0.5)
console.log(`\nuttryckligt moveTo före bågen: ${penn.size} platser — ${noll.length} på bågens egen start (0,0 px), ${storre.length} med en annan penna (tårtbit/avsikt):`)
for (const [pl, g] of storre.sort()) console.log(`   ${pl.padEnd(44)} max ${g.max.toFixed(1)}`)
if (flaggaV('--noll')) for (const [pl] of noll.sort()) console.log(`   0,0  ${pl}`)
if (sidfel.length) console.log('sidfel:', sidfel.slice(0, 5))
fs.writeFileSync(UT, JSON.stringify({ tid: new Date().toISOString(), res }, null, 1))
