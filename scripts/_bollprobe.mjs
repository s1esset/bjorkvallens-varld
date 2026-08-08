// Sond för den nya styrningen i natskott-pa-stan:
//   1. HANDBYTE — trycker på de väntande händerna i hörnen och verifierar att den
//      tryckta handen kliver fram och den aktiva lägger sig i dess slot.
//   2. NÄTBOLLAR — byter till bollhanden, skjuter, och mäter att bollen faktiskt
//      FLYGER och STUDSAR (inte bara försvinner), samt att taket på antal håller.
//   3. INSNÄRJNING — verifierar att ett träffat mål läggs ner, får en nätboll runt
//      sig och fortfarande går att dra hem med dragnätet.
//
//   node scripts/_bollprobe.mjs [--url http://localhost:5173]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const url = args.indexOf('--url') >= 0 ? args[args.indexOf('--url') + 1] : 'http://localhost:5173'
const ID = 'natskott-pa-stan'
const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 250)))
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 250)))

const tap = (x, y) =>
  page.evaluate(
    ({ x, y }) => {
      const cvs = document.querySelectorAll('canvas')
      const cv = cvs[cvs.length - 1]
      const r = cv.getBoundingClientRect()
      for (const t of ['pointerdown', 'pointerup']) {
        cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x, clientY: r.top + y, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, isPrimary: true }))
      }
    },
    { x, y },
  )

const state = () =>
  page.evaluate(() => {
    const m = window.__natdbg
    return {
      mode: m._mode,
      vantar: [...(m._vantar || [])],
      bollar: (m._balls || []).map((b) => ({ x: Math.round(b.body.position.x), y: Math.round(b.body.position.y), vy: +b.body.velocity.y.toFixed(1), studs: b.studs | 0, t: +b.t.toFixed(2) })),
      mal: (m._targets || []).map((r) => ({ kind: r.kind, x: Math.round(r.view.x), y: Math.round(r.view.y), r: r.r, snarjd: !!r.snarjd, netted: !!r.netted, rot: +(r.lieNu || 0).toFixed(2), innerRot: +(r.inner ? r.inner.rotation : 0).toFixed(2) })),
      seat: (m._seatList || []).length,
    }
  })

const out = []
const say = (s) => {
  out.push(s)
  console.log(s)
}

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
await page.waitForTimeout(1500)

// koordinaterna för de väntande händerna läses ur spelet, inte gissas
const sido = await page.evaluate(() => (window.__natdbg._sidoHander || []).map((c) => ({ x: Math.round(c.x), y: Math.round(c.y) })))
say(`väntande händer i bild vid: ${sido.map((p) => `(${p.x},${p.y})`).join(' · ')}`)
// P0 TRÄFFYTA i SKÄRMPIXLAR — hitArean skalas av containern, så lokala tal ljuger
const ytor = await page.evaluate(() =>
  (window.__natdbg._sidoHander || []).map((c) => ({
    b: Math.round(c.hitArea.width * c.scale.x),
    h: Math.round(c.hitArea.height * c.scale.y),
  })))
const minsta = Math.min(...ytor.flatMap((y) => [y.b, y.h]))
say(`   träffytor: ${ytor.map((y) => `${y.b}×${y.h} px`).join(' · ')} — minsta mått ${minsta} px ${minsta >= 96 ? '✓' : '✗ under P0:s 96 px'}`)

// =============================================================== 1. handbyte
say('1. HANDBYTE')
let s0 = await state()
say(`   start: aktiv ${s0.mode} · väntar ${s0.vantar.join(' + ')}`)
for (const slot of [0, 1, 0]) {
  const fore = await state()
  const vill = fore.vantar[slot]
  await tap(sido[slot].x, sido[slot].y - 120) // en bit upp på handen, inte på armen
  await page.waitForTimeout(320)
  const efter = await state()
  const ok = efter.mode === vill && efter.vantar[slot] === fore.mode
  say(`   tryck slot ${slot} (${vill}) → aktiv ${efter.mode} · väntar ${efter.vantar.join(' + ')} ${ok ? '✓' : '✗'}`)
}

// =============================================================== 2. nätbollar
say('2. NÄTBOLLAR')
// se till att bollhanden är framme
for (let i = 0; i < 3; i++) {
  const st = await state()
  if (st.mode === 'boll') break
  const slot = st.vantar.indexOf('boll')
  if (slot < 0) break
  await tap(sido[slot].x, sido[slot].y - 120)
  await page.waitForTimeout(300)
}
say(`   aktiv hand: ${(await state()).mode}`)
// Bollen är ute ur bild innan node hinner polla (varje state() kostar ~100 ms),
// så inspelningen måste ske I SIDAN, en rad per bildruta.
await page.evaluate(() => {
  window.__bspar = []
  const loop = () => {
    const m = window.__natdbg
    if (!m || !m._alive) return
    for (const b of m._balls || []) {
      window.__bspar.push({ x: Math.round(b.body.position.x), y: Math.round(b.body.position.y), vy: +b.body.velocity.y.toFixed(1), studs: b.studs | 0 })
      break
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
})
// Töm gatan först: i full trafik snärjer bollen in nästa mål efter ~20 bildrutor
// och hinner aldrig studsa. Studsen mäts på tom gata, insnärjningen i sektion 3.
await page.evaluate(() => {
  const m = window.__natdbg
  for (const r of [...m._targets]) m._removeTarget(r)
  m._spawnTimer = 999
})
await tap(880, 470)
await page.waitForTimeout(2600)
const spar = await page.evaluate(() => window.__bspar)
if (!spar.length) say('   ✗ ingen boll fanns någonsin i luften')
else {
  const xs = spar.map((b) => b.x)
  const ys = spar.map((b) => b.y)
  const vandningar = spar.filter((b, i) => i > 0 && spar[i - 1].vy > 1 && b.vy < -1).length
  say(`   bollen flög ${Math.max(...xs) - Math.min(...xs)} px i x och ${Math.max(...ys) - Math.min(...ys)} px i y under ${spar.length} bildrutor`)
  say(`   riktningsvändningar i y (= studsar): ${vandningar} · räknade studsar i spelet: ${Math.max(...spar.map((b) => b.studs))}`)
}
// taket
for (let i = 0; i < 6; i++) {
  await tap(700 + i * 60, 260)
  await page.waitForTimeout(60)
}
await page.waitForTimeout(120)
const maxB = (await state()).bollar.length
say(`   sex snabba skott → ${maxB} bollar i luften (taket är 3) ${maxB <= 3 ? '✓' : '✗'}`)

// =============================================================== 3. insnärjning
say('3. INSNÄRJNING')
let snarjd = null
for (let i = 0; i < 22 && !snarjd; i++) {
  const st = await state()
  const mal = st.mal.find((t) => !t.snarjd && !t.netted && t.x > 560 && t.x < 1160 && t.y > 400)
  if (!mal) {
    await page.evaluate(() => (window.__natdbg._spawnTimer = 0.02))
    await page.waitForTimeout(500)
    continue
  }
  await tap(mal.x, mal.y)
  await page.waitForTimeout(360)
  const st2 = await state()
  snarjd = st2.mal.find((t) => t.snarjd) || null
}
if (!snarjd) say('   ✗ fick inte in någon boll på ett mål på 22 försök')
else {
  say(`   ${snarjd.kind} insnärjd · ligger ner (lutning ${snarjd.innerRot} rad ${Math.abs(snarjd.innerRot) > 1 ? '✓' : '✗ står upp'})`)
  const harBoll = await page.evaluate(() => {
    const r = (window.__natdbg._targets || []).find((x) => x.snarjd)
    return !!(r && r.snarjG && !r.snarjG.destroyed)
  })
  say(`   nätbollen ritad runt kroppen: ${harBoll ? 'ja ✓' : 'NEJ ✗'}`)
  // går den att dra hem?
  for (let i = 0; i < 3; i++) {
    const st = await state()
    if (st.mode === 'drag') break
    const slot = st.vantar.indexOf('drag')
    if (slot < 0) break
    await tap(sido[slot].x, sido[slot].y - 120)
    await page.waitForTimeout(300)
  }
  const st3 = await state()
  const m2 = st3.mal.find((t) => t.snarjd)
  const seatFore = st3.seat
  if (m2) {
    await tap(m2.x, m2.y)
    let seatEfter = seatFore
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(70)
      seatEfter = (await state()).seat
      if (seatEfter > seatFore) break
    }
    say(`   insnärjd sak drogs hem med dragnätet: baksätet ${seatFore} → ${seatEfter} ${seatEfter > seatFore ? '✓' : '✗'}`)
  }
}

// ============================================================ exit-säkerhet
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(700)
await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
await page.waitForTimeout(1200)
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(600)

say('')
say(errors.length ? `✗ ${errors.length} konsolfel:` : '✓ 0 konsolfel')
for (const e of errors.slice(0, 6)) say('   ' + e)
await browser.close()
process.exit(errors.length ? 1 : 0)
