// Hittar barnet reaktionerna — och tänds rutan i bandet?
//
// `elementlekplatsen` kan vara helt grön i testet och ändå tom: en cellautomat som
// aldrig reagerar ser precis likadan ut i en skärmdump som en som gör det (två högar
// bredvid varandra). Sonden mäter därför två saker som inte syns i bilden:
//
//   1. AUTOMATEN (utan webbläsare) — måla två material mot varandra och läs
//      `handelser` + `antal[]`. Kör i TVÅ armar: en KONTROLLARM med två material som
//      INTE reagerar (jord + sten) och en mätarm per reaktion. Ett tal som inte kan
//      skilja de två lägena åt säger ingenting om det okända.
//   2. SPELET (headless Chrome) — montera modulen, måla med spelets EGNA metoder på
//      spelets EGNA koordinater, och läs `_funna` (upptäcktsbandet) samt att lådan
//      lever: lämna mitt i en reaktion och räkna konsolfel.
//
// Spelet är avsiktligt INTE registrerat när den här sonden skrivs, så browser-armen
// bygger sin egen ctx i stället för att gå via nav.go('game').
//
//   node scripts/_elementprobe.mjs              # båda armarna
//   node scripts/_elementprobe.mjs --bara-node  # bara automaten (ingen webbläsare)
//   node scripts/_elementprobe.mjs --cpu 6      # CPU-strypning för kostnadsmätningen
import { Sandlada, TOM, JORD, VATTEN, IS, ELD, ANGA, LERA, GLOD, STEN } from '../src/games/elementlekplatsen/automat.js'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? Number(args[i + 1]) : d }
const CPU = opt('--cpu', 6)
const baraNode = args.includes('--bara-node')

const NAMN = { [TOM]: 'tom', [JORD]: 'jord', [VATTEN]: 'vatten', [IS]: 'is', [ELD]: 'eld', [ANGA]: 'anga', [LERA]: 'lera', [GLOD]: 'glod', [STEN]: 'sten' }

// --- ARM 1: automaten -------------------------------------------------------
//
// Uppställningen är densamma i alla armar: två block av 8×6 celler bredvid varandra
// mitt i rutan, med golv under. Bara MATERIALEN skiljer. Då är varje skillnad i
// utfallet reaktionen, inte uppställningen.
function block(namn, a, b, steg = 60) {
  const A = new Sandlada({ cols: 40, rows: 22, seed: 20260814 })
  A.fyll(0, 20, 39, 21, STEN) // golv — annars rinner allt ur bilden innan det hinner mötas
  A.fyll(12, 13, 19, 19, a)
  A.fyll(20, 13, 27, 19, b)
  A.taHandelser()
  const h0 = { anga: 0, smalt: 0, lera: 0, glod: 0, is: 0 }
  for (let i = 0; i < steg; i++) {
    A.steg()
    const h = A.taHandelser()
    for (const k of Object.keys(h0)) h0[k] += h[k]
  }
  return { namn, h: h0, antal: A.antal }
}

const rader = [
  block('KONTROLL jord+sten', JORD, STEN),
  block('KONTROLL is+sten', IS, STEN),
  block('eld+vatten', ELD, VATTEN),
  block('eld+is', ELD, IS),
  block('vatten+jord', VATTEN, JORD),
  block('eld+jord', ELD, JORD),
  block('is+vatten', IS, VATTEN),
]

console.log('\n  ARM 1 — automaten (utan webblasare), 60 steg = 2,0 s speltid\n')
console.log('  uppstallning            anga  smalt   lera   glod     is   | nya celler')
console.log('  ' + '-'.repeat(78))
for (const r of rader) {
  const nya = [ANGA, LERA, GLOD, STEN, IS, VATTEN]
    .map((m) => [NAMN[m], r.antal[m]])
    .filter(([, n]) => n > 0)
    .map(([n, v]) => `${n} ${v}`)
    .join(' · ')
  console.log(
    `  ${r.namn.padEnd(22)} ${String(r.h.anga).padStart(5)} ${String(r.h.smalt).padStart(6)} ${String(r.h.lera).padStart(6)} ` +
    `${String(r.h.glod).padStart(6)} ${String(r.h.is).padStart(6)}   | ${nya}`,
  )
}

// Taken (P0 MOTGÅNG): kan elden svälla utan gräns?
{
  const A = new Sandlada({ cols: 58, rows: 26, seed: 7 })
  A.fyll(0, 24, 57, 25, STEN)
  for (let k = 0; k < 400; k++) A.mala(5 + (k % 50), 4 + (k % 18), 3, ELD)
  const eldTopp = A.antal[ELD]
  for (let k = 0; k < 400; k++) A.mala(5 + (k % 50), 4 + (k % 18), 3, GLOD)
  console.log(`\n  tak: eld ${eldTopp}/300 · glod ${A.antal[GLOD]}/260 (malat 400 klickar av varje)`)
}

// Vinden: knuffar den LOST men lamnar den FAST?
{
  const A = new Sandlada({ cols: 40, rows: 22, seed: 3 })
  A.fyll(0, 20, 39, 21, STEN)
  A.fyll(8, 14, 14, 19, JORD)
  A.fyll(24, 14, 30, 19, IS)
  const forJ = kolumnMitt(A, JORD)
  const forI = kolumnMitt(A, IS)
  for (let i = 0; i < 40; i++) {
    A.blas(11, 17, 8, 1)
    A.blas(27, 17, 8, 1)
    A.steg()
  }
  console.log(`  vind: jord (lost) flyttade ${(kolumnMitt(A, JORD) - forJ).toFixed(2)} celler · is (fast) ${(kolumnMitt(A, IS) - forI).toFixed(2)} celler`)
}

function kolumnMitt(A, m) {
  let s = 0
  let n = 0
  for (let r = 0; r < A.rows; r++) {
    for (let c = 0; c < A.cols; c++) {
      if (A.mat[r * A.cols + c] === m) { s += c; n++ }
    }
  }
  return n ? s / n : 0
}

if (baraNode) process.exit(0)

// --- ARM 2: spelet i webblasaren -------------------------------------------
const { chromium } = await import('playwright')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 180)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 180)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  const cdp = await page.context().newCDPSession(page)

  // Montera modulen med en egen ctx — spelet ar inte registrerat annu.
  await page.evaluate(async () => {
    const s = window.__barnspel
    const mod = (await import('/src/games/elementlekplatsen/index.js')).default
    const Container = s.fxLayer.constructor
    const stage = new Container()
    s.world.addChild(stage)
    const timers = new Set()
    const ctx = {
      stage,
      ticker: s.app.ticker,
      width: 1280,
      height: 720,
      view: s.scaler.view,
      services: s,
      fxLayer: s.fxLayer,
      exitToLibrary() {},
      later: (d, fn) => { const c = window.__gsapSond.delayedCall(d, fn); timers.add(c); return c },
      progress: {
        _c: {},
        get() { return { unlocked: true, highestLevel: 0, stars: 0, custom: this._c } },
        update() {}, setLevel() {}, addStars() {},
        setCustom(k, v) { this._c[k] = v },
        complete() { window.__sondKlar = (window.__sondKlar || 0) + 1 },
      },
    }
    window.__gsapSond = (await import('/node_modules/.vite/deps/gsap.js')).gsap
    ctx.later = (d, fn) => { const c = window.__gsapSond.delayedCall(d, fn); timers.add(c); return c }
    window.__sond = { mod, ctx, stage, timers }
    await mod.init(ctx)
    await mod.mount(ctx)
  })
  await page.waitForTimeout(600)

  // Mala tva element mot varandra PA SPELETS EGNA koordinater.
  //
  // ORDNINGEN AR EN MATNING, INTE EN DETALJ: forsta draget laggs LAGT (rad 21, dar det
  // landar pa stengolvet) och andra HOGT (rad 16, dar det faller ner pa det forsta).
  // Forsta forsoket la bada pa rad 14/16 i en tom lada — vattnet foll da rakt forbi isen
  // och `is+vatten` gav noll, trots att automat-armen visade 5 handelser pa samma par.
  // TOPPVARDEN, inte slutvarden: angan STIGER och ar borta efter 1,6 s, sa en avlasning
  // pa slutet visar 0 for den mest sedda reaktionen i spelet.
  const spela = (a, b, ms) =>
    page.evaluate(async ([a, b, ms]) => {
      const { mod, ctx } = window.__sond
      const CELL = 16
      const GX = 156
      const GY = 120
      const valj = (key) => { const v = mod._verktyg.find((x) => x.key === key); mod._valdIx = mod._verktyg.indexOf(v); mod._sattVald(v) }
      const strok = (key, c0, r0, c1, r1) => {
        valj(key)
        mod._pekar = true
        mod._pek = { x: GX + c0 * CELL, y: GY + r0 * CELL }
        mod._pekPrev = { ...mod._pek }
        mod._mala(ctx, true)
        for (let k = 1; k <= 12; k++) {
          mod._pek = { x: GX + (c0 + ((c1 - c0) * k) / 12) * CELL, y: GY + (r0 + ((r1 - r0) * k) / 12) * CELL }
          mod._mala(ctx)
        }
        mod._pekar = false
        mod._pek = null
      }
      // Andra draget maste NA det forsta. Rad 16 var 5 rader for hogt: elden brann ut i
      // luften och `vatten+eld` gav 9 angaceller UTAN en enda upptackt — de 9 var eldens
      // egen rok (P.ELD_ROK), inte en reaktion. Ett topptal kan alltsa vara gront och
      // mata nagot helt annat an fragan. Rad 18 lagger draget kant i kant med det forsta.
      strok(a, 18, 21, 32, 21)
      await new Promise((r) => setTimeout(r, 260)) // lat forsta draget lagga sig
      strok(b, 18, 18, 32, 18)
      const topp = { anga: 0, lera: 0, glod: 0, is: 0, vatten: 0 }
      const t0 = performance.now()
      while (performance.now() - t0 < ms) {
        await new Promise((r) => setTimeout(r, 60))
        topp.anga = Math.max(topp.anga, mod._aut.antal[5])
        topp.lera = Math.max(topp.lera, mod._aut.antal[6])
        topp.glod = Math.max(topp.glod, mod._aut.antal[7])
        topp.is = Math.max(topp.is, mod._aut.antal[3])
        topp.vatten = Math.max(topp.vatten, mod._aut.antal[2])
      }
      return { funna: [...mod._funna], ...topp }
    }, [a, b, ms])

  const nollstall = () =>
    page.evaluate(() => {
      const { mod } = window.__sond
      mod._aut.rensa()
      mod._aut.fyll(0, 24, 57, 25, 8)
      mod._funna.clear()
      for (const b of mod._band) { b.tom.visible = true; b.ikon.visible = false }
      mod._klar = false
      mod._parad = null
    })

  console.log('\n  ARM 2 — spelet i headless Chrome (malar med spelets egna metoder)\n')
  console.log('  drag (undre+ovre)    funna rutor                topp: anga  lera  glod    is')
  console.log('  ' + '-'.repeat(78))
  for (const [a, b, etikett] of [
    ['jord', 'jord', 'KONTROLL jord+jord'],
    ['is', 'jord', 'KONTROLL is+jord'],
    ['vatten', 'eld', 'vatten+eld'],
    ['is', 'eld', 'is+eld'],
    ['jord', 'vatten', 'jord+vatten'],
    ['jord', 'eld', 'jord+eld'],
    ['is', 'vatten', 'is+vatten'],
    ['jord', 'vind', 'jord+vind'],
  ]) {
    await nollstall()
    const r = await spela(a, b, 1800)
    console.log(
      `  ${etikett.padEnd(20)} ${(r.funna.join(',') || '(inga)').padEnd(26)} ` +
      `${String(r.anga).padStart(10)} ${String(r.lera).padStart(5)} ${String(r.glod).padStart(5)} ${String(r.is).padStart(5)}`,
    )
  }

  // Kostnad: full ruta + eld overallt, med CPU-strypning. UTAN strypning mater man inget.
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
  const kostnad = await page.evaluate(async (sek) => {
    const { mod, ctx } = window.__sond
    const A = mod._aut
    A.rensa()
    // Varsta rimliga fall: halva ratan fylld med jord, en sjo, och eld pa toppen.
    A.fyll(0, 13, 57, 25, 1)
    A.fyll(10, 8, 30, 12, 2)
    for (let c = 2; c < 56; c += 3) A.mala(c, 5, 3, 4)
    let rutor = 0
    const rakna = () => { rutor++ }
    ctx.ticker.add(rakna)
    const t0 = performance.now()
    await new Promise((r) => setTimeout(r, sek * 1000))
    const dt = (performance.now() - t0) / 1000
    ctx.ticker.remove(rakna)
    return { fps: Number((rutor / dt).toFixed(1)), celler: A.cols * A.rows, eld: A.antal[4] }
  }, 4)
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  console.log(`\n  kostnad: ${kostnad.fps} FPS med ${kostnad.celler} celler fyllda + eld, CPU ${CPU}x strypt`)

  // Tom ruta som referens — sager om det ar automaten eller nagot annat som kostar.
  const tomFps = await page.evaluate(async (sek) => {
    const { mod, ctx } = window.__sond
    mod._aut.rensa()
    let rutor = 0
    const rakna = () => { rutor++ }
    ctx.ticker.add(rakna)
    const t0 = performance.now()
    await new Promise((r) => setTimeout(r, sek * 1000))
    const dt = (performance.now() - t0) / 1000
    ctx.ticker.remove(rakna)
    return Number((rutor / dt).toFixed(1))
  }, 3)
  console.log(`  kostnad: ${tomFps} FPS med TOM ruta (referens — samma scen, ingen automat att stega)`)

  // En LEVANDE bild: eld malad rakt ner i sjon, fotad medan angan stiger. Ett spel som
  // bara fotas i vila visar aldrig det som ar hela poangen.
  await page.evaluate(() => {
    const { mod } = window.__sond
    mod._aut.rensa()
    mod._byggVarld('sjo')
    for (let c = 16; c < 33; c += 3) mod._aut.mala(c, 19, 3, 4)
    mod._aut.mala(46, 17, 3, 2)
    mod._ritaGrid()
  })
  await page.waitForTimeout(420)
  await page.screenshot({ path: '.test-shots/_element.png' })
  console.log('\n  bild (eld i sjon, 0,4 s in): .test-shots/_element.png')

  // En bild per startvarld — och en kontroll pa att INGEN av dem reagerar med sig
  // sjalv. En startvarld som gor lera av sig sjalv tander en ruta utan att barnet gjort
  // nagot (`scripts/_idleprobe.mjs` ska ge 0).
  console.log('')
  for (const v of ['sjo', 'kulle', 'brasa', 'istappar']) {
    const r = await page.evaluate(async (namn) => {
      const { mod } = window.__sond
      mod._aut.rensa()
      mod._funna.clear()
      for (const b of mod._band) { b.tom.visible = true; b.ikon.visible = false }
      mod._byggVarld(namn)
      mod._ritaGrid()
      await new Promise((r) => setTimeout(r, 4000)) // 120 automatsteg helt utan input
      return { funna: [...mod._funna], celler: mod._aut.cols * mod._aut.rows - mod._aut.antal[0] }
    }, v)
    await page.screenshot({ path: `.test-shots/_element-${v}.png` })
    console.log(`  startvarld ${v.padEnd(9)} 4 s utan input → funna rutor: ${r.funna.join(',') || '(inga)'} · ${r.celler} fyllda celler`)
  }

  // RIKTIGA PEKHANDELSER. Armarna ovan anropar `_mala()` direkt och hoppar darmed over
  // hela pekvagen (`pointerdown` → `toLocal` → `globalpointermove`). En trasig hitArea
  // eller en felraknad koordinat hade varit helt osynlig i dem.
  await nollstall()
  await page.evaluate(() => {
    const { mod } = window.__sond
    const v = mod._verktyg.find((x) => x.key === 'jord')
    mod._valdIx = mod._verktyg.indexOf(v)
    mod._sattVald(v)
  })
  const fore = await page.evaluate(() => window.__sond.mod._aut.antal[1])
  await page.mouse.move(320, 260)
  await page.mouse.down()
  for (let k = 1; k <= 14; k++) {
    await page.mouse.move(320 + k * 40, 260 + Math.sin(k / 2) * 40)
    await page.waitForTimeout(30)
  }
  await page.mouse.up()
  await page.waitForTimeout(700)
  const efter = await page.evaluate(() => ({ jord: window.__sond.mod._aut.antal[1], pekar: window.__sond.mod._pekar }))
  console.log(`\n  riktig musdrag over ladan: ${fore} → ${efter.jord} jordceller · pekar-flaggan slappt: ${!efter.pekar}`)

  // Ett tryck UTANFOR ladan (pa bakgrunden) far inte mala nagot.
  const foreUt = await page.evaluate(() => window.__sond.mod._aut.antal[1])
  await page.mouse.move(70, 640)
  await page.mouse.down()
  await page.mouse.move(120, 660)
  await page.mouse.up()
  await page.waitForTimeout(300)
  const efterUt = await page.evaluate(() => window.__sond.mod._aut.antal[1])
  console.log(`  KONTROLL tryck utanfor ladan: ${foreUt} → ${efterUt} jordceller (ska vara oforandrat)`)

  // FINALEN: tand alla sex rutorna och se att regnbagen och elementparaden faktiskt
  // kommer. Finalen ar det enda i spelet som ingen vanlig testkorning nar fram till.
  await page.evaluate(() => {
    const { mod, ctx } = window.__sond
    mod._aut.rensa()
    mod._byggVarld('kulle')
    window.__fore = mod._aut.cols * mod._aut.rows - mod._aut.antal[0]
    for (const k of ['anga', 'smalt', 'lera', 'glod', 'is', 'vind']) mod._upptack(ctx, k)
  })
  await page.waitForTimeout(2100) // mitt i paraden — dar bilden faktiskt sager nagot
  const flygande = await page.evaluate(() => window.__sond.mod._paradFigurer.filter((f) => !f.destroyed).length)
  await page.screenshot({ path: '.test-shots/_element-final.png' })
  await page.waitForTimeout(2600)
  const final = await page.evaluate(() => {
    const { mod } = window.__sond
    return {
      klar: !!mod._klar,
      bagar: mod._bagar.length,
      kvar: mod._paradFigurer.filter((f) => !f.destroyed).length,
      complete: window.__sondKlar || 0,
      fore: window.__fore,
      efter: mod._aut.cols * mod._aut.rows - mod._aut.antal[0],
    }
  })
  final.flygande = flygande
  console.log(
    `\n  final: klar=${final.klar} · ${final.bagar} regnbagsbagar · ${final.flygande} element i luften mitt i paraden ` +
    `(${final.kvar} kvar efterat) · progress.complete() ${final.complete}x`,
  )
  console.log(`  finalen ror INTE barnets sandlada: ${final.fore} celler fore → ${final.efter} efter`)

  // EXIT MITT I EN REAKTION: riv spelet medan eld, anga och partiklar lever.
  const felFore = fel.length
  await page.evaluate(async () => {
    const { mod, ctx } = window.__sond
    for (let c = 10; c < 50; c += 2) mod._aut.mala(c, 8, 3, 4)
    await new Promise((r) => setTimeout(r, 260))
    for (const t of window.__sond.timers) t.kill()
    mod.destroy(ctx)
    ctx.stage.destroy({ children: true })
  })
  await page.waitForTimeout(1400)
  console.log(`  exit mitt i en reaktion: ${fel.length - felFore} konsolfel efter destroy`)
  console.log(`\n  fel totalt: ${fel.length}${fel.length ? ' — ' + fel[0] : ''}\n`)
} finally {
  await browser.close()
}
