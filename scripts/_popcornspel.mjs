// POPCORNKALASET — spela kärnloopen med RIKTIGA musdrag (harnessens auto-drag drar mellan
// generiska punkter och träffar aldrig påsen, reglaget eller en skål — CLAUDE.md).
//
//   node scripts/_popcornspel.mjs [--omgangar 2] [--otalig]      (kräver dev-servern på :5173)
//
// Per skål: bär påsen över grytan (drag) → vippa påsen (greppa sidan, dra nedåt) → tryck + tills
// plattan är varm → vänta ut poppen → bär grytan i bygeln till skålen → vippa grytan → sänk
// värmen. Tre skålar = en omgång; spelet ska då köra finishen och börja om av sig självt.
// `--otalig` trycker så fort spelet tillåter (barnets väg — där bor rivningskapplöpningarna).
// Mäter: korn i grytan, popcorn per skål, hela skålar, konsolfel. Skärmdumpar i .test-shots/.
import { chromium } from 'playwright'

const arg = process.argv.slice(2)
const OMG = Number(arg.includes('--omgangar') ? arg[arg.indexOf('--omgangar') + 1] : 1)
const OTALIG = arg.includes('--otalig')
const vanta = (ms) => new Promise((r) => setTimeout(r, OTALIG ? ms * 0.35 : ms))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let fel = 0
const ok = (namn, v, d = '') => { console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`); if (!v) fel++ }
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 240)))
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'popcornkalaset' }))
  await page.waitForFunction(() => !!window.__popcorn, null, { timeout: 15000 })
  await page.waitForTimeout(1500)

  // Designkoordinater → skärm (stagen är letterboxad; vid 1280×720 är det 1:1, men läs det).
  const skarm = async (x, y) => page.evaluate(({ x, y }) => {
    const p = window.__barnspel.game._root.toGlobal({ x, y })
    const c = window.__barnspel.ctx.services.app.canvas.getBoundingClientRect()
    const r = window.__barnspel.ctx.services.app.renderer
    return { x: c.left + (p.x / r.width) * c.width * r.resolution, y: c.top + (p.y / r.height) * c.height * r.resolution }
  }, { x, y })
  const lokal = (namn, lx, ly) => page.evaluate(({ namn, lx, ly }) => window.__barnspel.game[namn].varld(lx, ly), { namn, lx, ly })
  const lage = () => page.evaluate(() => window.__popcorn.lage())
  const SPAR = arg.includes('--spar')
  const spar = async (namn) => { if (!SPAR) return; const l = await lage(); console.log(`    [${namn}] gryta ${l.gryta.lage}/${l.gryta.zon} (${Math.round(l.gryta.x)},${Math.round(l.gryta.y)}) ${(l.gryta.vinkel*57.3).toFixed(0)}° · påse ${l.pase.lage} (${Math.round(l.pase.x)},${Math.round(l.pase.y)}) · steg ${l.steg}`); await page.screenshot({ path: `.test-shots/_popcornspel_${namn}.png` }) }
  const drag = async (fran, till, steg = 30, hall = 0) => {
    const a = await skarm(fran.x, fran.y)
    const b = await skarm(till.x, till.y)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    for (let i = 1; i <= steg; i++) {
      await page.mouse.move(a.x + ((b.x - a.x) * i) / steg, a.y + ((b.y - a.y) * i) / steg)
      await page.waitForTimeout(16)
    }
    if (hall) await vanta(hall)
    await page.mouse.up()
  }
  const klick = async (x, y) => { const p = await skarm(x, y); await page.mouse.click(p.x, p.y) }
  const M = await page.evaluate(async () => {
    const m = await import('/src/games/popcornkalaset/matt.js')
    return { SKAL: m.SKAL, GRYTA: m.GRYTA, PASE: m.PASE, REGLAGE: m.REGLAGE }
  })

  for (let o = 0; o < OMG; o++) {
    console.log(`\nOMGÅNG ${o + 1}`)
    for (let s = 0; s < 3; s++) {
      // 1. Påsen till grytan (bärs upprätt var man än tar i den).
      // Vänta tills påsen har korn (den fylls på hemma när den är tom) — som ett barn gör.
      let fylld = false
      for (let t = 0; t < 40; t++) { if (await page.evaluate(() => window.__barnspel.game._kornIPasen()) >= 20) { fylld = true; break } await page.waitForTimeout(250) }
      if (!fylld) console.log('    ⚠ påsen fylldes inte:', JSON.stringify(await page.evaluate(() => { const g = window.__barnspel.game, p = g._pase; return { lage: p.lage, overGryta: !!g._gryta._pasePark, x: Math.round(p.body.position.x), vinkel: +p.vinkel.toFixed(2), iPasen: g._kornIPasen(), korn: g._korn.length, tom: g._paseTom, paVagHem: g._pasePaVagHem, framme: p.framme(2), hand: p._hand && { x: Math.round(p._hand.x), y: Math.round(p._hand.y) }, mal: { x: Math.round(p._mal.x), y: Math.round(p._mal.y) } } })))
      if (!((await lage()).pase.lage === 'park' && (await lage()).pase.overGryta)) {
        const paseMitt = await lokal('_pase', 0, M.PASE.djup * 0.5)
        const grytMynning = await lokal('_gryta', 0, 0)
        await drag(paseMitt, { x: grytMynning.x - 20, y: grytMynning.y - 150 }, 30)
        await vanta(1400)
      }
      await spar('1-pase-over')
      // 2. Vippa påsen: greppa höger sida och dra nedåt.
      const paseSida = await lokal('_pase', M.PASE.bredd / 2 + M.PASE.vagg, 20)
      await drag(paseSida, { x: paseSida.x, y: paseSida.y + 220 }, 40, 2500)
      await vanta(1200)
      await spar('2-pase-vippad')
      let l = await lage()
      const kornIGrytan = await page.evaluate(() => { const g = window.__barnspel.game; return g._korn.filter((k) => g._gryta.inuti(k.body.position.x, k.body.position.y, 10)).length })
      console.log(`  skål ${s}: korn i grytan ${kornIGrytan} (påsen: ${l.pase.lage})`)
      // 3. Värmen upp: tryck + tio gånger.
      for (let i = 0; i < 10; i++) { await klick(M.REGLAGE.plusX, M.REGLAGE.y); await page.waitForTimeout(OTALIG ? 30 : 90) }
      await spar('3-varme')
      // 4. Vänta ut poppen (tills inget korn popper mer på 1,5 s).
      let senast = -1
      for (let t = 0; t < 30; t++) {
        await page.waitForTimeout(700)
        l = await lage()
        if (l.popcorn === senast && l.mjuka === 0 && t > 4) break
        senast = l.popcorn
      }
      console.log(`    poppat: ${l.popcorn} popcorn totalt, ${l.korn} korn kvar i världen`)
      if (s === 0 && o === 0) await page.screenshot({ path: '.test-shots/_popcornspel_poppat.png' })
      // 5. Sänk värmen (inget bränt i sonden) och bär grytan i bygeln till skålen.
      for (let i = 0; i < 10; i++) { await klick(M.REGLAGE.minusX, M.REGLAGE.y); await page.waitForTimeout(OTALIG ? 30 : 60) }
      const bygel = await lokal('_gryta', 0, -M.GRYTA.bygel)
      const sk = M.SKAL[s]
      await drag(bygel, { x: sk.x, y: bygel.y - 60 }, 36)
      await vanta(1600)
      // 6. Vippa grytan: greppa höger sida, dra nedåt, håll.
      const sida = await lokal('_gryta', M.GRYTA.bredd / 2 + M.GRYTA.vagg, 20)
      await drag(sida, { x: sida.x, y: sida.y + 240 }, 50, 2600)
      await vanta(1500)
      if (s === 0 && o === 0) await page.screenshot({ path: '.test-shots/_popcornspel_hallt.png' })
      l = await lage()
      console.log(`    efter hällning: i skålarna ${JSON.stringify(l.skal)} · hela ${JSON.stringify(l.full)} · grytan ${l.gryta.lage}`)
      // 7. Grytan hem igen (tryck på den, tryck på spisen) — tap-reserven.
      const grytMitt = await lokal('_gryta', 0, M.GRYTA.djup * 0.5)
      await klick(grytMitt.x, grytMitt.y)
      await vanta(300)
      await klick(330, 478)
      await vanta(2200)
    }
    const l = await lage()
    ok(`omgång ${o + 1}: tre hela skålar → filmkväll`, l.omgangar > o, `klara omgångar ${l.omgangar} · full ${JSON.stringify(l.full)} · skålar ${JSON.stringify(l.skal)}`)
    await page.waitForTimeout(3500)
    await page.screenshot({ path: `.test-shots/_popcornspel_finish${o + 1}.png` })
    await page.waitForTimeout(7000)
  }
  ok('0 konsolfel', errors.length === 0, errors.slice(0, 6).join(' | '))
} finally {
  await browser.close()
}
process.exit(fel ? 1 : 0)
