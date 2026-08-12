// `spindelnatet`: är nättråden ett REP eller ett streck?
//
// LYFTPLAN B3 (nattköns N5) — spelets tråd ritades som en rak `lineTo` från handen till
// spetsen. Bytet lägger `lib/rep.js` under den: båda ändar spikade varje bildruta
// (`spann`), mitten fri. Frågan sonden svarar på är alltså inte "finns ett rep?" utan
// "SYNS det, och sitter tråden kvar i samma två punkter?".
//
// ⚠️ MÄTNINGEN LÄSER DEN RITADE GEOMETRIN, inte spelets interna tillstånd. `_thread`s
// egna `moveTo/lineTo/quadraticCurveTo/stroke` hakas på instansen och spelar in varje
// bildrutas väg. Det är den enda mätning som fungerar i BÅDA armarna — på HEAD finns
// inget rep att läsa, men det finns en ritad väg (två punkter, spikrak).
//
// Rad 1–3 är KALIBRERING: de mäter det som INTE fick ändras och ska ge samma tal i båda
// armarna (annars mäter sonden fel sak, se `_korsprobe`s lärdom). Rad 4–5 är beviset.
// Rad 6–7 är vakter — gröna på HEAD också.
//
//   node scripts/_tradprobe.mjs [--bild]
import { chromium } from 'playwright'

const ID = 'spindelnatet'
const BILD = process.argv.includes('--bild')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, villkor, text) => rader.push({ namn, ok: !!villkor, text })

// --- geometri på den INSPELADE vägen ---------------------------------------
// Ops: {o:'M'|'L'|'Q', x, y, cx, cy}. En 'M' startar en ny delväg (en tråd).
function delvagar(ops) {
  const ut = []
  let cur = null
  for (const op of ops) {
    if (op.o === 'M') {
      cur = [{ x: op.x, y: op.y }]
      ut.push(cur)
    } else if (cur) {
      const p0 = cur[cur.length - 1]
      if (op.o === 'L') cur.push({ x: op.x, y: op.y })
      else {
        // Kvadratisk Bézier — samplas, annars mäts styrpunkten i stället för kurvan.
        for (let s = 1; s <= 4; s++) {
          const t = s / 4
          const u = 1 - t
          cur.push({
            x: u * u * p0.x + 2 * u * t * op.cx + t * t * op.x,
            y: u * u * p0.y + 2 * u * t * op.cy + t * t * op.y,
          })
        }
      }
    }
  }
  return ut
}

// Största vinkelräta avstånd från kordan (första → sista punkten).
function slack(pts) {
  const a = pts[0]
  const b = pts[pts.length - 1]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const L = Math.hypot(dx, dy)
  if (L < 1) return 0
  let max = 0
  for (const p of pts) max = Math.max(max, Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / L)
  return max
}

const langd = (pts) => {
  let L = 0
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return L
}
const korda = (pts) => Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y)

async function oppna(page) {
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForFunction((gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage, ID, { timeout: 20000 })
}

// Haka på trådens ritning. `stroke()` avslutar bildrutan — där läses också om
// tråden är i indrags-skedet, för flaggan är aktuell just då.
const HOOK = () => {
  const g = window.__barnspel.game
  const th = g._thread
  const bildrutor = []
  let buf = []
  th.moveTo = function (x, y) {
    buf.push({ o: 'M', x, y })
    return Object.getPrototypeOf(this).moveTo.call(this, x, y)
  }
  th.lineTo = function (x, y) {
    buf.push({ o: 'L', x, y })
    return Object.getPrototypeOf(this).lineTo.call(this, x, y)
  }
  th.quadraticCurveTo = function (cx, cy, x, y) {
    buf.push({ o: 'Q', cx, cy, x, y })
    return Object.getPrototypeOf(this).quadraticCurveTo.call(this, cx, cy, x, y)
  }
  th.clear = function () {
    buf = []
    return Object.getPrototypeOf(this).clear.call(this)
  }
  th.stroke = function (s) {
    // Handens läge läses i SAMMA bildruta — skjut-armen flaxar 0,55 rad under skottet,
    // så ett läge avläst efteråt ligger upp till 29 px fel och mäter flaxen, inte tråden.
    const h = g._handPos()
    if (buf.length) bildrutor.push({ ops: buf, drar: !!g._strands[0]?.reeling, hx: h.x, hy: h.y })
    buf = []
    return Object.getPrototypeOf(this).stroke.call(this, s)
  }
  window.__trad = bildrutor
}

// Välj ett fritt föremål i luften, långt från spindeln och bred-knappen.
const VALJ = () => {
  const g = window.__barnspel.game
  for (const it of g._items) {
    const v = it.view
    if (!v || v.destroyed || it._caught) continue
    if (v.y < 120 || v.y > 470) continue
    if (Math.abs(v.x - g._baseX) < 90 || v.x > 1020 || v.x < 160) continue
    return { x: v.x, y: v.y }
  }
  return null
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))
  await oppna(page)

  // --- Rad 1. Fångar ett tryck nära ett föremål? (KALIBRERING) --------------
  let tryck = 0
  let fangst = 0
  let bildrutor = []
  for (let f = 0; f < 6 && fangst < 3; f++) {
    let mal = null
    for (let v = 0; v < 60 && !mal; v++) {
      mal = await page.evaluate(VALJ)
      if (!mal) await page.waitForTimeout(100)
    }
    if (!mal) continue
    const fore = await page.evaluate(() => window.__barnspel.game._addedTotal)
    if (f === 0) await page.evaluate(HOOK)
    await page.mouse.click(mal.x, mal.y)
    tryck++
    await page.waitForTimeout(900)
    const efter = await page.evaluate(() => window.__barnspel.game._addedTotal)
    if (efter > fore) fangst++
    if (f === 0) bildrutor = await page.evaluate(() => window.__trad.splice(0))
  }
  ok('1. KAL tryck nara ett foremal fangar det', fangst >= 2 && tryck >= 2, `${fangst}/${tryck} tryck gav en fangst`)

  // --- Rad 2–6. Den inspelade vägen ----------------------------------------
  const enkla = bildrutor.map((b) => ({ ...b, v: delvagar(b.ops) })).filter((b) => b.v.length === 1).map((b) => ({ ...b, pts: b.v[0] }))
  const ut = enkla.filter((b) => !b.drar)
  const drag = enkla.filter((b) => b.drar)

  // Ändpunkten: handen. Spelet skickar in den varje bildruta, så den får inte ha
  // flyttat sig av bytet — det är hela poängen med att `spann()` spikar BÅDA ändar.
  const startAvvik = enkla.length ? Math.max(...enkla.map((b) => Math.hypot(b.pts[0].x - b.hx, b.pts[0].y - b.hy))) : 999
  ok('2. KAL traden borjar i handen', startAvvik < 1, `max ${startAvvik.toFixed(2)} px fran handen i SAMMA bildruta`)

  ok('3. KAL tradens livslangd', enkla.length >= 18 && enkla.length <= 46, `${enkla.length} bildrutor ritad trad (skott 0,15 s + indrag 0,3 s)`)

  // ⚠️ BÅGEN MÄTS RELATIVT KORDAN. Ett skott mot ett föremål 200 px bort och ett mot ett
  // 500 px bort ger helt olika px-tal för samma tråd — mätt 41,6 / 45,0 / 71,1 px över tre
  // körningar av samma kod. Kvoten är dimensionslös och jämförbar mellan körningar; den
  // kräver att kordan är en riktig linje (samma skäl som rad 6).
  const bage = (rutor) => {
    const l = rutor.filter((b) => korda(b.pts) >= 100)
    return l.length ? Math.max(...l.map((b) => slack(b.pts) / korda(b.pts))) : 0
  }
  const bageUt = bage(ut)
  const bageDrag = bage(drag)
  const pxUt = ut.length ? Math.max(...ut.map((b) => slack(b.pts))) : 0
  ok('4. BEVIS traden slapar efter spetsen', bageUt > 0.05, `bage ${(bageUt * 100).toFixed(1)} % av kordan pa vag ut (${pxUt.toFixed(0)} px, ${ut.length} rutor) — HEAD: 0,0 %`)
  ok('5. BEVIS den ar stramare nar den DRAR', drag.length > 0 && bageDrag < bageUt * 0.6, `indrag ${(bageDrag * 100).toFixed(1)} % mot utskjutningens ${(bageUt * 100).toFixed(1)} % (${drag.length} rutor)`)

  // ⚠️ NÄMNAREN FLYTTAR SIG. I skottets första bildrutor är kordan ~0 px (spetsen står
  // kvar i handen) medan tråden ligger hopbuntad där — kvoten blir då 2,46 utan att en
  // enda pixel är fel. Vakten gäller därför bara bildrutor där kordan är en riktig linje.
  const langa = enkla.filter((b) => korda(b.pts) >= 100)
  const kvot = langa.length ? Math.max(...langa.map((b) => langd(b.pts) / korda(b.pts))) : 0
  ok('6. VAKT ingen sprangning', kvot > 0 && kvot < 1.35, `ritad langd hogst ${kvot.toFixed(2)}x kordan (${langa.length} rutor med korda >= 100 px)`)

  if (BILD) {
    // Bild mitt i ett skott: pinna spetsen genom att frysa skjut-tweenen halvvägs.
    let mal = null
    for (let v = 0; v < 60 && !mal; v++) {
      mal = await page.evaluate(VALJ)
      if (!mal) await page.waitForTimeout(100)
    }
    if (mal) {
      await page.mouse.click(mal.x, mal.y)
      await page.waitForTimeout(110)
      await page.screenshot({ path: '.test-shots/_trad.png' })
      const lage = await page.evaluate(() => {
        const g = window.__barnspel.game
        const s = g._strands[0]
        if (!s) return null
        const h = g._handPos()
        const v = s.obj?.view
        return {
          drar: !!s.reeling,
          t: +s.t.toFixed(2),
          hand: [Math.round(h.x), Math.round(h.y)],
          mal: [Math.round(s.targetX), Math.round(s.targetY)],
          byte: v && !v.destroyed ? [Math.round(v.x), Math.round(v.y)] : null,
          firar: !!g._resolving,
        }
      })
      console.log('  bild: .test-shots/_trad.png  ·  ' + JSON.stringify(lage))
    }
  }

  // --- Rad 7. Exit mitt i ett skott ----------------------------------------
  const fore = errors.length
  let mal2 = null
  for (let v = 0; v < 60 && !mal2; v++) {
    mal2 = await page.evaluate(VALJ)
    if (!mal2) await page.waitForTimeout(100)
  }
  if (mal2) {
    await page.mouse.click(mal2.x, mal2.y)
    await page.waitForTimeout(90)
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(700)
  }
  ok('7. VAKT exit mitt i ett skott', errors.length === fore, `${errors.length - fore} nya konsolfel${errors.slice(fore, fore + 1).map((e) => ' — ' + e).join('')}`)

  const gronna = rader.filter((r) => r.ok).length
  console.log('')
  for (const r of rader) console.log(`  ${r.ok ? '✓' : '✗'} ${r.namn}  ·  ${r.text}`)
  console.log(`\n  ${gronna}/${rader.length} gröna\n`)
  process.exitCode = gronna === rader.length ? 0 : 1
} finally {
  await browser.close()
}
