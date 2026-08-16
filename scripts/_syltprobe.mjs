// `flugan-pa-nasan`: SYLTBURKEN och FLÄKTEN — de två saker ägaren rapporterade som trasiga.
//
// KONTROLLARM FÖRST (annars mäter man ingenting):
//   ⓵ ett drag som INTE rör burken (tomt golv) → `active` ska vara null hela vägen.
//   ⓶ fläktens kon mäts mot HEAD:s egen träffandel innan någon ändring tros på.
//
// Mäter i tal:
//   grepp      hittar en pekning på burkens SYNLIGA kropp draget alls? (nio punkter i ett
//              rutnät över burken — vilka av dem tas av något ANNAT än burken?)
//   drag       kommer burken fram till fönsterbrädan? slutläge + `_syltPunkt`
//   ater       går den att ta upp igen efteråt? (`placed`/`eventMode` efter `aterstall`)
//   flakt      hur många av N flugor i pappas område ligger INOM fläktens kon?
//              (spelets egen villkorsrad, körd mot flugornas FAKTISKA lägen)
//
//   node scripts/_syltprobe.mjs
import { chromium } from 'playwright'

const ID = 'flugan-pa-nasan'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const R = (n) => Math.round(n)

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
  await page.waitForTimeout(1800)

  const G = (src) => page.evaluate(
    async ([gid, s]) => {
      const g = (await import('/src/games/registry.js')).getGame(gid)
      return eval(s)
    }, [ID, src],
  )

  // design -> skärm
  const skarm = await page.evaluate(() => {
    const c = window.__barnspel.app.canvas.getBoundingClientRect()
    return { l: c.left, t: c.top, sx: c.width / window.__barnspel.app.renderer.width, sy: c.height / window.__barnspel.app.renderer.height }
  })
  const S = (x, y) => ({ x: Math.round(skarm.l + x * skarm.sx), y: Math.round(skarm.t + y * skarm.sy) })

  // ---------------------------------------------------------------- kontrollarm ⓵ ---
  // Tomt golv långt från burken: ingenting får greppas.
  {
    const p = S(180, 700)
    await page.mouse.move(p.x, p.y)
    await page.mouse.down()
    await page.mouse.move(p.x + 90, p.y - 60)
    const aktiv = await G('!!(g._drag && g._drag.active)')
    await page.mouse.up()
    console.log(`KONTROLL tomt golv: active=${aktiv}  (ska vara false)`)
  }

  // ---------------------------------------------------------------- grepp ---
  // Nio punkter över burkens SYNLIGA kropp: vem tar pekningen?
  const burk = await G('(() => { const v = g._sylt.view; return { x: v.x, y: v.y } })()')
  const rutor = []
  for (const dy of [-44, 0, 40]) {
    for (const dx of [-28, 0, 28]) rutor.push({ dx, dy })
  }
  const grepp = []
  for (const r of rutor) {
    const p = S(burk.x + r.dx, burk.y + r.dy)
    await page.mouse.move(p.x, p.y)
    await page.mouse.down()
    const tog = await G('!!(g._drag && g._drag.active)')
    await page.mouse.up()
    await page.waitForTimeout(40)
    // släpp ev. tap-tap-markering
    await G('g._drag && g._drag._deselect && g._drag._deselect()')
    grepp.push({ dx: r.dx, dy: r.dy, tog })
  }
  const missar = grepp.filter((r) => !r.tog)
  console.log(`GREPP  ${grepp.length - missar.length}/${grepp.length} punkter greppade burken`)
  for (const m of missar) console.log(`       MISS vid (${m.dx >= 0 ? '+' : ''}${m.dx}, ${m.dy >= 0 ? '+' : ''}${m.dy}) rel. burkens ankare`)

  // ---------------------------------------------------------------- drag till fönstret ---
  const mal = await G('(() => { const t = g._drag.targets.find(t => t.view._wNamn === "fonster"); return t ? { x: t.view.x, y: t.view.y } : null })()')
  {
    const a = S(burk.x, burk.y - 30)
    const b = S(mal.x, mal.y)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(a.x + (b.x - a.x) * i / 12, a.y + (b.y - a.y) * i / 12)
      await page.waitForTimeout(18)
    }
    const under = await G(`(() => { const r = g._drag.items[0]; return { tx: Math.round(r.tx), ty: Math.round(r.ty), vx: Math.round(r.view.x), vy: Math.round(r.view.y) } })()`)
    await page.mouse.up()
    await page.waitForTimeout(900)
    const efter = await G(`(() => { const r = g._drag.items[0]; return {
      vx: Math.round(r.view.x), vy: Math.round(r.view.y),
      placed: r.placed, em: r.view.eventMode,
      punkt: g._syltPunkt ? { x: Math.round(g._syltPunkt.x), y: Math.round(g._syltPunkt.y) } : null,
    } })()`)
    console.log(`DRAG   mål (${R(mal.x)},${R(mal.y)}) · fingret nådde (${under.tx},${under.ty}) · bilden var (${under.vx},${under.vy})`)
    console.log(`       efter släpp: burken (${efter.vx},${efter.vy}) placed=${efter.placed} em=${efter.em} lockpunkt=${efter.punkt ? `(${efter.punkt.x},${efter.punkt.y})` : 'ingen'}`)
    const dy = Math.abs(efter.vy - mal.y)
    console.log(`       AVVIKELSE i y: ${R(dy)} px  ${dy > 20 ? '← burken kom ALDRIG upp på brädan' : 'ok'}`)
  }

  // ---------------------------------------------------------------- upp igen ---
  {
    await page.waitForTimeout(400)
    const v = await G('(() => { const r = g._drag.items[0]; return { x: r.view.x, y: r.view.y, placed: r.placed, em: r.view.eventMode } })()')
    const p = S(v.x, v.y - 20)
    await page.mouse.move(p.x, p.y)
    await page.mouse.down()
    await page.mouse.move(p.x - 60, p.y + 20)
    const aktiv = await G('!!(g._drag && g._drag.active)')
    await page.mouse.up()
    console.log(`ÅTER   placed=${v.placed} em=${v.em} · nytt grepp lyckades=${aktiv}`)
  }

  // ---------------------------------------------------------------- fläkten ---
  // Spelets EGNA villkorsrad, körd mot flugornas faktiska lägen just nu, plus samma rad
  // räknad från fläktens HUVUD i stället för foten (kontroll: vad skulle skilja?).
  await page.waitForTimeout(1500)
  const flakt = await G(`(async () => {
    const M = await import('/src/games/flugan-pa-nasan/rummet.js')
    const P = M.PLATS
    const prov = []
    // 200 syntetiska flugpositioner ur SPELETS eget område (så talet gäller spelet, inte en gissning)
    for (let i = 0; i < 200; i++) {
      prov.push({
        x: P.ansikte.x + 60 + (Math.random() - 0.5) * g._omrW,
        y: (P.ansikte.y - 30) + (Math.random() - 0.5) * g._omrH,
      })
    }
    // Den GAMLA villkorsraden, ordagrant, som kontrollarm bredvid den nya.
    const gammalRikt = P.flakt.x < P.ansikte.x ? 1 : -1
    const gammal = prov.filter((f) => {
      const dy = Math.abs(f.y - P.flakt.y)
      const framfor = (f.x - P.flakt.x) * gammalRikt
      return !(framfor < 0 || framfor > 620 || dy > 180 + framfor * 0.35)
    }).length
    const ny = prov.filter((f) => g._vindStyrka(f.x, f.y) > 0).length
    return {
      rikt: g._flaktRikt, huvud: g._flaktHuvud,
      gammal, gammalRikt, ny,
      levandeFlugor: g._flugor.map((f) => ({ x: Math.round(f.vy.view.x), y: Math.round(f.vy.view.y), lage: f.lage })),
    }
  })()`)
  console.log(`FLÄKT  riktning=${flakt.rikt} (${flakt.rikt < 0 ? 'åt vänster, mot pappa' : 'åt höger, mot fönstret'}) · huvud (${flakt.huvud.x},${flakt.huvud.y})`)
  console.log(`       KONTROLLARM gamla konen (rikt ${flakt.gammalRikt}, mätt från foten): ${flakt.gammal}/200 flugor`)
  console.log(`       NYA vindfältet (mätt från huvudet)                                : ${flakt.ny}/200 flugor`)
  console.log(`       levande flugor: ${JSON.stringify(flakt.levandeFlugor)}`)

  // Tryck på fläkten. Mät hur långt flugorna FÖRFLYTTAS åt fönstrets håll under pusten,
  // mot en kontrollarm som är samma tid utan pust.
  // ⚠️ FLUGAN FÅR INTE STYRA SJÄLV under mätningen — annars mäter man hennes egen
  //    slumpvandring och inte pusten (första försöket gav en tom lista: flugorna hade
  //    hunnit flyga ut genom fönstret mitt i fönstret). `_accel = 0` fryser styrningen;
  //    vinden ligger utanför den och påverkas inte.
  const matDrift = async (blas) => {
    await G(`(() => {
      const f = g._flugor[0]
      if (!f) return
      f.bana.x = 380; f.bana.y = 250            // mitt över pappa, alltså BAKOM fläkten
      f.bana.vx = 0; f.bana.vy = 0
      f.bana.gvx = 0; f.bana.gvy = 0
      f.bana._accel = 0                          // ingen egen styrning
      f.landPaus = 99; f.brattom = false
      g._flaktT = 0
    })()`)
    if (blas) await page.mouse.click(S(660, 408).x, S(660, 408).y)
    await page.waitForTimeout(1200)
    return G('g._flugor[0] ? { x: Math.round(g._flugor[0].bana.x), y: Math.round(g._flugor[0].bana.y) } : null')
  }
  const utanPust = await matDrift(false)
  const medPust = await matDrift(true)
  console.log(`       fluga låst på (380,250), 1,2 s:`)
  console.log(`       KONTROLL utan pust → ${JSON.stringify(utanPust)}  (ska stå still)`)
  console.log(`       MED pust           → ${JSON.stringify(medPust)}   (+x = mot fläkt/fönster)`)

  // Bild mitt i en pust — ett vindfält går inte att bedöma i tal.
  await G('g._flaktT = 0')
  await page.mouse.click(S(660, 408).x, S(660, 408).y)
  await page.waitForTimeout(280)
  await page.screenshot({ path: '.test-shots/_flakt-pust.png' })
  console.log('       bild: .test-shots/_flakt-pust.png')

  console.log(`\nkonsolfel: ${errors.length}`)
  for (const e of errors.slice(0, 5)) console.log('  ' + e)
} finally {
  await browser.close()
}
