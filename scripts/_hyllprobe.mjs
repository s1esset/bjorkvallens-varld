// TROLLBLANDNINGENS HYLLA — hamnar en nyupptäckt ikon över en annan?
//
//   node scripts/_hyllprobe.mjs [--cpu 4] [--bild]      (kräver dev-servern på :5173)
//
// Ägarrapport 2026-08-11 (ÅTGÄRDER #5): "ikonen / drag and drop-containern för leran som
// lades till hamnade över en annan ikon (fel position)".
//
// Det finns TVÅ helt olika mekanismer som båda ger den bilden, och de kräver olika fixar.
// Sonden mäter dem var för sig, för annars går det inte att veta vilken man lagat:
//
//   A. KAPPLÖPNINGEN. `_pourFran`s hemtween startar 0,82 s och varar 0,30 s, medan `_react`
//      föder det nya hyllelementet vid 1,04 s — mitt i hemresan. `_layoutShelf` hoppar över
//      en droppe med `rec.pouring === true`, och gsap har redan låst målvärdet. Droppen flyger
//      då hem till sin GAMLA plats. Mått: |view.x − home.x| när allt lugnat sig.
//
//   B. PACKNINGEN. `spacing = min(116, 700/(n−1))` slutar vara cappad vid n = 8 och krymper
//      sedan monotont. Ikonens ritade kropp är en cirkel med radie 50, alltså 100 px bred.
//      Vid n = 10 är avståndet 77,8 px och ikonerna överlappar med 22 px — helt utan
//      kapplöpning. Mått: minsta avstånd mellan två grannar mot ikonens bredd.
//
// ⚠️ Läs BÅDA talen innan något ändras. Är A grön och B röd är en tween-fix verkningslös.
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const CPU = Number(opt('--cpu', 4))
const BILD = args.includes('--bild')

const IKON_BREDD = 100 // ritad kropp: circle(0,0,50)
const HEM_TOL = 2 // px — vad som räknas som "står på sin hemmaplats"

let fel = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) fel++
}
const n1 = (v) => (typeof v === 'number' && isFinite(v) ? v.toFixed(1) : String(v))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('pageerror', (e) => errors.push((e.message || String(e)).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'trollblandning' }))
  await page.waitForFunction(() => (window.__barnspel.game?._dropRecs || []).length > 0, null, { timeout: 20000 })
  await page.waitForTimeout(1400) // splash ut + baserna på plats

  console.log(`\nTROLLBLANDNINGEN — hyllans ikonplacering (CPU x${CPU})\n`)

  const kor = (kropp) => page.evaluate(new Function(`return (async () => {
    const app = window.__barnspel
    const g = app.game
    const ctx = app.ctx
    const sov = (ms) => new Promise((r) => setTimeout(r, ms))
    const las = () => (g._dropRecs || []).map((r) => ({
      elem: r.data.elem,
      x: Math.round(r.view.x * 10) / 10,
      hx: Math.round(r.home.x * 10) / 10,
      // Den RITADE bredden, inte behållarens: hyllan krymper föremålet när den blir
      // trång, så ett fast tal skulle döma en lagad hylla som trasig.
      s: Math.round((r.view._krop ? r.view._krop.scale.x : 1) * 1000) / 1000,
      pouring: !!r.pouring,
      placed: !!r.placed,
    }))
    ${kropp}
  })()`))

  // --- Väx hyllan till 7 element utan att röra kapplöpningen -----------------
  const foreUpptackt = await kor(`
    for (const id of ['anga', 'lava', 'moln']) {
      g._shelfElems.add(id)
      g._spawnResultDrop(ctx, id)
    }
    await sov(900)
    return { n: g._dropRecs.length, recs: las() }
  `)
  ok('hyllan växt till 7 element', foreUpptackt.n === 7, `n = ${foreUpptackt.n}`)
  const foreFel = Math.max(...foreUpptackt.recs.map((r) => Math.abs(r.x - r.hx)))
  ok('alla 7 står på sin hemmaplats', foreFel <= HEM_TOL, `största avvikelse ${n1(foreFel)} px`)

  // --- Den riktiga upptäckten: jord + vatten → lera, via spelets EGEN väg ----
  // `_addOchHall` är exakt vägen barnets drag tar (samma `_pourFran`, samma
  // `_addToCauldron`), bara utan fingret. Andra ingrediensen är den som hälls
  // medan `_react` hinner föda det åttonde elementet.
  const efter = await kor(`
    g._addOchHall(ctx, 'jord')
    await sov(120)
    g._addOchHall(ctx, 'vatten')
    await sov(3000)
    return { n: g._dropRecs.length, recs: las(), harLera: g._shelfElems.has('lera') }
  `)
  ok('lera upptäcktes och hamnade på hyllan', efter.harLera && efter.n === 8, `n = ${efter.n}`)

  // A. Kapplöpningen — står varje droppe på sin egen hemmaplats?
  const avvik = efter.recs.map((r) => ({ elem: r.elem, d: Math.abs(r.x - r.hx) }))
  const varst = avvik.reduce((a, b) => (b.d > a.d ? b : a), { elem: '-', d: 0 })
  console.log('\n  A. hemmaplats (view.x mot home.x)')
  for (const r of efter.recs) {
    const d = Math.abs(r.x - r.hx)
    console.log(`     ${r.elem.padEnd(9)} x ${String(r.x).padStart(6)}  hem ${String(r.hx).padStart(6)}  ${d > HEM_TOL ? '← ' + n1(d) + ' px FEL' : ''}`)
  }
  ok('A: ingen droppe står kvar på en gammal plats', varst.d <= HEM_TOL, `värst: ${varst.elem} ${n1(varst.d)} px`)

  // B. Packningen — ligger två grannars RITADE kroppar ovanpå varandra?
  const packning = (recs) => {
    const xs = recs.map((r) => r.hx).sort((a, b) => a - b)
    let minGap = Infinity
    for (let i = 1; i < xs.length; i++) minGap = Math.min(minGap, xs[i] - xs[i - 1])
    const bredd = IKON_BREDD * Math.max(...recs.map((r) => r.s))
    return { minGap, bredd, overlapp: Math.max(0, bredd - minGap) }
  }
  const p1 = packning(efter.recs)
  console.log(`\n  B. packning: ${efter.n} element, avstånd ${n1(p1.minGap)} px, ritad bredd ${n1(p1.bredd)} px`)
  ok('B: grannar överlappar inte i vila', p1.overlapp <= 0.5, `överlapp ${n1(p1.overlapp)} px`)

  // B2. Hyllans MAXFALL. Ett barn kan upptäcka 9 resultat utöver de 4 baserna
  // (anga · lera · lava · sol · sten · kruka · regnbage · enhorning · moln), alltså
  // 13 föremål även på nivå 1. Det är det tal hyllan måste klara — inte 8.
  const fullt = await kor(`
    for (const id of ['sol', 'sten', 'kruka', 'regnbage', 'enhorning']) {
      if (g._shelfElems.has(id)) continue
      g._shelfElems.add(id)
      g._spawnResultDrop(ctx, id)
    }
    await sov(1100)
    return { n: g._dropRecs.length, recs: las() }
  `)
  const p2 = packning(fullt.recs)
  console.log(`  B2. ${fullt.n} element → avstånd ${n1(p2.minGap)} px, ritad bredd ${n1(p2.bredd)} px (skala ${fullt.recs[0].s})`)
  ok('B2: hyllan klarar sitt maxantal utan överlapp', p2.overlapp <= 0.5, `överlapp ${n1(p2.overlapp)} px`)
  const hogerkant = Math.max(...fullt.recs.map((r) => r.hx)) + p2.bredd / 2
  ok('B2: sista föremålet ryms innanför skärmen', hogerkant <= 1280, `högerkant ${n1(hogerkant)} px`)

  if (BILD) {
    await page.screenshot({ path: '.test-shots/_hyllprobe.png' })
    console.log('  · bild: .test-shots/_hyllprobe.png')
  }

  // C. Exit mitt i en hällning — inga fel efter rivning.
  await kor(`g._addOchHall(ctx, 'eld'); await sov(250)`)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)
  ok('C: exit mitt i en hällning ger inga konsolfel', errors.length === 0, errors[0] || 'inga')

  console.log(`\n${fel === 0 ? 'ALLA GRÖNA' : fel + ' FEL'}\n`)
} finally {
  await browser.close()
}
process.exit(fel === 0 ? 0 : 1)
