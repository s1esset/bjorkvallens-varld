// Vaknar byn? (docs/games/blixt-och-dunder.md §4 Juice — "Byn vaknar")
//
// Punkten är osynlig för `npm run test`: skärmdumpen tas i VILA, innan någon lampa
// tänts, så den kan bara visa den sovande byn. Att tändningen faktiskt gör något med
// HUSET syns först när man tänder — och röken finns bara medan den stiger.
//
//   1. SOVER byn vid start (mörka rutor, ingen rök)?
//   2. VÄCKER lampa i exakt hus i — och lämnar grannen sovande?
//   3. STIGER röken ur skorstenen (och rör sig den, inte bara finns)?
//   4. sover byn igen när nästa nivå byggs (annars ärver nivå 2 nivå 1:s ljus)?
//   5. lämnar en exit mitt i ett vaknande något igång?
//
//   node scripts/_byprobe.mjs          (kräver `npm run dev` på :5173)
//   node scripts/_byprobe.mjs --bild   (+ .test-shots/_by-sover.png / _by-vaken.png)
//
// ⚠️ Bilden är inte en extra artighet. Talen nedan säger att TILLSTÅNDET ändras; bara
// skärmdumpen säger om en sovande by ser mysig eller övergiven ut.
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const BILD = process.argv.includes('--bild')

// Räkna pixlar som RÖKEN målar: samma yta med och utan lagret, och skillnaden.
// (Ett färgavstånd mot "rökens ton" hade räknat molnen på himlen bakom — samma fälla
// som badets skum i `pruttbad`, se nattkörningens regel 7.)
const malade = (aBuf, bBuf) => {
  const a = PNG.sync.read(aBuf)
  const b = PNG.sync.read(bBuf)
  let n = 0
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])
    if (d > 8) n++ // 8 = under ögats tröskel; allt däröver är något man SER
  }
  return n
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
const ok = (namn, villkor, detalj = '') => {
  console.log(`  ${villkor ? '✓' : '✗'} ${namn}${detalj ? ' · ' + detalj : ''}`)
  if (!villkor) kod = 1
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'blixt-och-dunder' }))
  await page.waitForFunction(() => window.__barnspel.game?._houses?.length > 0, null, { timeout: 15000 })
  await page.waitForTimeout(1200)

  // Husens läge läses ur SCENGRAFEN, inte ur en flagga spelet självt satt: `_awake`
  // hade svarat ja även om ingenting ritats om. Rutans fyllning kommer ur Graphics
  // egen instruktionslista, glöden ur dess alfa.
  const byn = () => page.evaluate(() => {
    const g = window.__barnspel.game
    return (g._houses || []).map((h) => {
      const inst = h._win?.context?.instructions || []
      const fyll = inst.find((i) => i.action === 'fill')
      return {
        ruta: fyll?.data?.style?.color ?? null,
        glod: +(h._glow?.alpha ?? -1).toFixed(2),
        vagg: h._kropp?.tint ?? null,
        rok: !!h._smoke?.visible,
        y: (h._smoke?.children || []).map((p) => +p.y.toFixed(1)),
      }
    })
  })

  // Tänd lampa i genom spelets EGEN väg (samma anrop blixten gör), inte genom att
  // sätta flaggan: annars mäter sonden en genväg som spelet aldrig tar.
  const tand = (i) => page.evaluate((i) => {
    const w = window.__barnspel
    const g = w.game
    g._lightLamp(w.ctx, g._lamps[i])
  }, i)

  console.log('\nByn vaknar i `blixt-och-dunder`\n')

  // ---------- 1: sover byn vid start? ----------
  const start = await byn()
  console.log(`  ${start.length} hus vid start: ` + start.map((h) => '0x' + (h.ruta ?? 0).toString(16)).join(' '))
  ok('alla rutor är släckta vid start', start.every((h) => h.ruta === 0x53627a))
  ok('ingen glöd på väggen vid start', start.every((h) => h.glod === 0))
  ok('ingen rök ur någon skorsten vid start', start.every((h) => !h.rok))
  ok('husen ligger i kvällstonen', start.every((h) => h.vagg === 0xd6cfe4))

  if (BILD) await page.screenshot({ path: '.test-shots/_by-sover.png' })

  // ---------- 2: väcker lampa i hus i — och BARA hus i? ----------
  await tand(0)
  await page.waitForTimeout(700)
  const efter0 = await byn()
  ok('lampa 1 tänder hus 1:s ruta', efter0[0].ruta === 0xffd93d || efter0[0].ruta !== 0x53627a,
    '0x' + (efter0[0].ruta ?? 0).toString(16))
  ok('hus 1 lyser på väggen', efter0[0].glod > 0.9, `glöd ${efter0[0].glod}`)
  ok('hus 1 har lämnat kvällstonen', efter0[0].vagg === 0xffffff, '0x' + (efter0[0].vagg ?? 0).toString(16))
  ok('grannhuset sover kvar', efter0[1] && efter0[1].ruta === 0x53627a && efter0[1].glod === 0 && !efter0[1].rok)

  await tand(1)
  await page.waitForTimeout(700)
  const efter1 = await byn()
  ok('lampa 2 väcker hus 2 också', efter1[1].ruta !== 0x53627a && efter1[1].glod > 0.9)
  ok('hus 1 står kvar vaket', efter1[0].ruta !== 0x53627a && efter1[0].glod > 0.9)

  // ---------- 3: stiger röken? ----------
  ok('röken syns ur de vakna skorstenarna', efter1.every((h) => h.rok))
  const rok = await page.evaluate(async () => {
    const g = window.__barnspel.game
    const sm = g._houses[0]._smoke
    const las = () => sm.children.map((p) => ({ y: p.y, a: p.alpha, s: p.scale.x }))
    const a = las()
    await new Promise((r) => setTimeout(r, 500))
    const b = las()
    // Puffarna går i cykel; en som just vänt vid mynningen ska INTE räknas som
    // "sjunkande" — mät bara dem som ännu inte hunnit varva.
    const steg = a.map((p, i) => (b[i].y < p.y ? p.y - b[i].y : null)).filter((v) => v !== null)
    return { steg, topp: Math.min(...b.map((p) => p.y)), alfa: Math.max(...b.map((p) => p.a)), skala: b.map((p) => +p.s.toFixed(2)) }
  })
  ok('puffarna stiger (rör sig uppåt mellan två avläsningar)', rok.steg.length > 0 && rok.steg.every((d) => d > 2),
    rok.steg.map((d) => d.toFixed(1) + ' px').join(' · '))
  ok('röken tunnas ut på vägen upp (skalan växer)', Math.max(...rok.skala) > Math.min(...rok.skala),
    `skala ${Math.min(...rok.skala)} → ${Math.max(...rok.skala)}`)
  ok('röken har alfa kvar när den stiger', rok.alfa > 0.1, `största alfa ${rok.alfa.toFixed(2)}`)

  // ---------- 3b: SYNS röken? (målade pixlar, inte "finns lagret") ----------
  // En vit puff med låg alfa mot en ljus kvällshimmel kan passera varje tal ovan och
  // ändå vara osynlig — precis det `gungan`s fartstreck gjorde (0 målade pixlar upp
  // till halva farten). Måttet nedan är det enda som svarar på frågan barnet ställer.
  const yta = await page.evaluate(() => {
    const sm = window.__barnspel.game._houses[0]._smoke
    const p = sm.getGlobalPosition()
    const s = window.__barnspel.app.stage.worldTransform.a || 1
    return { x: Math.round(p.x * s) - 40, y: Math.round(p.y * s) - 80, width: 80, height: 90 }
  })
  const medRok = await page.screenshot({ clip: yta })
  await page.evaluate(() => { window.__barnspel.game._houses[0]._smoke.visible = false })
  await page.waitForTimeout(60)
  const utanRok = await page.screenshot({ clip: yta })
  await page.evaluate(() => { window.__barnspel.game._houses[0]._smoke.visible = true })
  const rokPx = malade(medRok, utanRok)
  ok('röken SYNS över skorstenen', rokPx > 600, `${rokPx} målade pixlar av ${yta.width * yta.height} i ytan`)

  if (BILD) {
    // Vänta in röken en bit upp — en bild tagen i födelseögonblicket visar tre
    // puffar i klump vid mynningen och säger ingenting om strömmen.
    await page.waitForTimeout(900)
    await page.screenshot({ path: '.test-shots/_by-vaken.png' })
  }

  // ---------- 4: sover byn igen på nästa nivå? ----------
  await page.evaluate(() => {
    const w = window.__barnspel
    w.game._buildVillage(w.ctx, 2)
  })
  await page.waitForTimeout(600)
  const nyNiva = await byn()
  ok('en nybyggd by sover igen', nyNiva.length > 0 && nyNiva.every((h) => h.ruta === 0x53627a && h.glod === 0 && !h.rok),
    `${nyNiva.length} hus`)

  // ---------- 5: exit mitt i ett vaknande ----------
  await page.evaluate(() => {
    const w = window.__barnspel
    w.game._lightLamp(w.ctx, w.game._lamps[0]) // tändningen pågår ...
    w.nav.go('menu') // ... och barnet lämnar mitt i den
  })
  await page.waitForTimeout(900)
  const kvar = await page.evaluate(() => !!window.__barnspel.game)
  ok('exit mitt i ett vaknande', !kvar && fel.length === 0,
    `spelmodul kvar: ${kvar ? 'JA' : 'nej'} · konsolfel: ${fel.length}`)
  if (fel.length) console.log(fel.slice(0, 5).map((f) => '   ! ' + f).join('\n'))
} catch (e) {
  console.error('SOND-FEL:', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
