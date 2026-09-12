// SOND: ÅTGÄRDER V16 — hur mycket GraphicsContext-data blir KVAR efter spelbyten, och hur länge?
//
// `Graphics.destroy({ children: true })` river inte grafikens EGEN GraphicsContext: Pixi
// 8.19 (`Graphics.mjs:145-153`) friar den ägda kontexten bara vid `destroy()` utan argument
// eller vid `context: true`. Ett options-objekt faller mellan grenarna. Repot har 251 sådana
// anrop i 89 filer, så i praktiken lämnar varje spel kvar varje kontext det ritat.
//
// Källan säger att svaret borde vara "ett tag, sedan städas det": Pixi 8.19 har en GCSystem
// (på som standard — `App.js` stänger inte av den) som laddar ur kontexter som inte renderats
// på `gcMaxUnusedTime` (60 s) och körs var `gcFrequency` (30 s). En levande Graphics stämplar
// sin kontext vid varje rendering (`Graphics.mjs:160-161`), en föräldralös gör det aldrig.
// Det är LÄST, inte mätt — därav sonden.
//
// Tre armar, var och en i en egen webbläsare, i tur och ordning (aldrig samtidigt):
//   head    appen som den är
//   fix     `Graphics.prototype.destroy` lappad i sidan, så ett options-objekt också river
//           den ägda kontexten (samma väg som Pixis egen `destroy()` utan argument tar)
//   utanGC  BARLASTEN: head med renderarens GC avslagen — det V16 fruktade. Bevisar att
//           måttet kan röra sig, och att det är GC:n som städar i head-armen.
//
// Mått (efter tvingad JS-GC via CDP):
//   kontexter     levande poster i `renderer.graphicsContext._managedContexts` (bär GPU-data)
//   föräldralösa  av dem: ingen Graphics i scenträdet pekar på kontexten
//   geom KB       CPU-sidans geometri i de föräldralösa (vertices + uvs + indices, ×4 byte)
//   egna buff     föräldralösa som INTE batchas — de enda som äger egna GL-buffertar
//   GL            buffertar skapade − raderade sedan hakningen, och deras storlek
//
//   node scripts/_graflackprobe.mjs [--arm head,fix,utanGC] [--vila 120] [--spel a,b,c]
import { chromium } from 'playwright'

const opt = (f, d) => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : d)
const url = opt('--url', 'http://localhost:5173')
const ARMAR = opt('--arm', 'head,fix,utanGC').split(',')
const VILA = Number(opt('--vila', '120'))
const SPEL = opt(
  '--spel',
  'pizzabageriet,hamburgerbygget,golvet-ar-lava,unika-knytt,mata-munnen,natskott-pa-stan,trollblandning,flipperspel,tvatta-djuret,kulbana,bowling,spindelhjalten',
).split(',')
const I_SPEL = 3000
const I_BIB = 1500

function HAKA(arm) {
  const s = window.__barnspel
  const r = s.app.renderer
  const gl = r.gl
  const lev = new Map()
  const bunden = new Map()
  const o = {
    c: gl.createBuffer.bind(gl),
    d: gl.deleteBuffer.bind(gl),
    b: gl.bindBuffer.bind(gl),
    bd: gl.bufferData.bind(gl),
  }
  gl.createBuffer = () => {
    const b = o.c()
    lev.set(b, 0)
    return b
  }
  gl.deleteBuffer = (b) => {
    lev.delete(b)
    return o.d(b)
  }
  gl.bindBuffer = (t, b) => {
    bunden.set(t, b)
    return o.b(t, b)
  }
  gl.bufferData = (t, x, u, ...rest) => {
    const b = bunden.get(t)
    if (b && lev.has(b)) lev.set(b, typeof x === 'number' ? x : x?.byteLength ?? 0)
    return o.bd(t, x, u, ...rest)
  }
  window.__glLev = lev

  // Graphics-prototypen ur APPENS egen instans (bgLayer är stagens första barn och en
  // Graphics) — en nyimporterad pixi hade varit en annan modul som inget spel ärver från.
  const bg = s.app.stage.children[0]
  if (!bg || !('_ownedContext' in bg)) return 'bgLayer är ingen Graphics — sonden kan inte haka'
  const proto = Object.getPrototypeOf(bg)
  if (!Object.prototype.hasOwnProperty.call(proto, 'destroy')) return 'fel prototyp'

  if (arm === 'fix') {
    const orig = proto.destroy
    proto.destroy = function (options) {
      if (this._ownedContext && options && typeof options === 'object' && options.context !== true) {
        this._ownedContext.destroy()
        this._ownedContext = null
      }
      return orig.call(this, options)
    }
  }
  if (arm === 'utanGC') r.gc.enabled = false
  return `hakad (${arm}) · gc ${r.gc.enabled ? 'på' : 'AV'} · maxUnused ${r.gc.maxUnusedTime} ms · frekvens ${r.gc._frequency} ms`
}

function MATA() {
  const s = window.__barnspel
  const r = s.app.renderer
  const items = r.graphicsContext._managedContexts.items
  const iBruk = new Set()
  const ga = (n) => {
    if (n._context) iBruk.add(n._context)
    if (n.children) for (const c of n.children) ga(c)
  }
  ga(s.app.stage)
  let n = 0
  let orf = 0
  let geom = 0
  let egna = 0
  for (const k in items) {
    const c = items[k]
    if (!c) continue
    n++
    if (iBruk.has(c)) continue
    orf++
    const g = c._gpuData?.[r.uid]
    const gd = g?.geometryData
    if (gd) geom += ((gd.vertices?.length || 0) + (gd.uvs?.length || 0) + (gd.indices?.length || 0)) * 4
    if (g && g.isBatchable === false) egna++
  }
  let glN = 0
  let glB = 0
  for (const v of window.__glLev.values()) {
    glN++
    glB += v
  }
  return {
    n,
    orf,
    geomKB: Math.round(geom / 1024),
    egna,
    glN,
    glKB: Math.round(glB / 1024),
    heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
  }
}

const pad = (v, w) => String(v).padStart(w)
const resultat = {}

for (const arm of ARMAR) {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--enable-precise-memory-info'],
  })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    const fel = []
    page.on('pageerror', (e) => fel.push(String(e.message).slice(0, 140)))
    page.on('console', (m) => {
      if (m.type() === 'error') fel.push(m.text().slice(0, 140))
    })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel?.nav, null, { timeout: 20000 })
    const cdp = await page.context().newCDPSession(page)
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(2500)
    console.log(`\n  [${arm}] ${await page.evaluate(HAKA, arm)}`)

    const t0 = Date.now()
    const rader = []
    const prov = async (etikett) => {
      await cdp.send('HeapProfiler.collectGarbage')
      const m = await page.evaluate(MATA)
      rader.push({ etikett, s: Math.round((Date.now() - t0) / 1000), ...m })
      return m
    }
    await prov('meny (baslinje)')
    const perByte = []
    for (const id of SPEL) {
      await page.evaluate((i) => window.__barnspel.nav.go('game', { id: i }), id)
      await page.waitForTimeout(I_SPEL)
      await page.evaluate(() => window.__barnspel.nav.go('library'))
      await page.waitForTimeout(I_BIB)
      perByte.push({ id, ...(await page.evaluate(MATA)) })
    }
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(1500)
    await prov(`efter ${SPEL.length} spel`)
    for (let t = 40; t <= VILA; t += 40) {
      await page.waitForTimeout(40000)
      await prov(`+${t} s vila`)
    }

    console.log('    per spelbyte (i biblioteket, utan tvingad GC): föräldralösa kontexter')
    console.log('      ' + perByte.map((p) => `${p.id.slice(0, 10)} ${p.orf}`).join(' · '))
    console.log(`    ${'läge'.padEnd(18)} ${pad('t s', 5)} ${pad('kontexter', 10)} ${pad('föräldralösa', 13)} ${pad('geom KB', 8)} ${pad('egna buff', 10)} ${pad('GL n', 6)} ${pad('GL KB', 7)} ${pad('heap MB', 8)}`)
    for (const r of rader) {
      console.log(`    ${r.etikett.padEnd(18)} ${pad(r.s, 5)} ${pad(r.n, 10)} ${pad(r.orf, 13)} ${pad(r.geomKB, 8)} ${pad(r.egna, 10)} ${pad(r.glN, 6)} ${pad(r.glKB, 7)} ${pad(r.heapMB, 8)}`)
    }
    console.log(`    konsolfel: ${fel.length}${fel.length ? ' — ' + [...new Set(fel)].slice(0, 3).join(' | ') : ''}`)
    resultat[arm] = { rader, fel: fel.length }
  } finally {
    await browser.close()
  }
}

// Domslut — bara för armar som faktiskt kördes.
const forst = (arm, i) => resultat[arm]?.rader[i]
const sist = (arm) => resultat[arm]?.rader.at(-1)
console.log('')
if (resultat.head) {
  const efter = forst('head', 1)
  const slut = sist('head')
  console.log(`  ${efter.orf > 0 ? '✓' : '✗'} head: mekanismen finns — ${efter.orf} föräldralösa kontexter direkt efter ${SPEL.length} spel`)
  console.log(`  ${slut.orf <= Math.max(5, efter.orf * 0.05) ? '✓' : '✗'} head: GC:n städar — ${efter.orf} → ${slut.orf} efter ${VILA} s vila`)
}
if (resultat.utanGC) {
  const efter = forst('utanGC', 1)
  const slut = sist('utanGC')
  console.log(`  ${slut.orf >= efter.orf * 0.9 && efter.orf > 0 ? '✓' : '✗'} barlast (utan GC): måttet står kvar — ${efter.orf} → ${slut.orf}`)
}
if (resultat.fix && resultat.head) {
  console.log(`  · fix mot head direkt efter spelen: ${forst('fix', 1).orf} mot ${forst('head', 1).orf} föräldralösa`)
}
