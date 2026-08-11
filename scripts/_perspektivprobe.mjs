// Är pruttbads badkar läsbart som en SIDOVY? Ägaren kunde inte avgöra om han såg badet
// uppifrån eller från sidan, och det är en mätbar fråga så fort man skriver ner VAD i
// bilden som bär vilken läsning. Sonden mäter de tre toppvy-signalerna som fanns och de
// sidovy-signaler som ersatte dem — i bild där bilden är sanningen, i spelets levande
// tillstånd där beteendet är det.
//
//   ytlinjen        vattenytan ligger kvar på y=330 (skum, mållinje och mätare är byggda
//                   kring den — flyttas den går hela rundan sönder)
//   golv-under-kar  syns rummets golv UNDER karet? (karet gick förut till y 680, alltså
//                   NER GENOM golvlinjen 622 — inget sa att det stod i ett rum)
//   fötter          syns fötterna mot golvet? (de ritades FÖRE en kropp som täckte dem)
//   ankan-vilar     ankans viloläge ligger I ytan, inte 100 px under den
//   ankan-taket     hur djupt går hon att trycka? (spannet var HELA vattenfältet)
//   ankan-flyter-upp  släpp henne nertryckt → lyftkraften bär upp henne igen
//   vatten-i-karet  vattnet följer den lutande innerväggen (en rundad rektangel sticker
//                   ut genom porslinet så fort väggen lutar)
//   bubbelbotten    bubblorna föds innanför karets insida, inte nere i porslinet
//   mållinjen       måldottarna ligger under rullkanten på ALLA nivåer (låg förut på 248 =
//                   mitt i kantens stroke, alltså osynliga från nivå 2 och uppåt)
//   exit            lämna spelet mitt i ett nertryck → 0 konsolfel
//
//   node scripts/_perspektivprobe.mjs [--shot ut.png]
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : d
}
const shot = opt('--shot', '')

const SURFACE_Y = 330
const DUCK_FLOAT_Y = SURFACE_Y - 16
const ROOM_FLOOR = 640

const results = []
const ok = (namn, pass, detalj) => results.push({ namn, pass, detalj })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

  const setLevel = (n) =>
    page.evaluate((lvl) => {
      const doc = window.__barnspel?.save?.data
      if (!doc) return false
      for (const p of doc.profiles || []) {
        p.games = p.games || {}
        p.games['pruttbad'] = { unlocked: true, highestLevel: lvl, stars: 0, lastPlayedAt: null, custom: {} }
      }
      window.__barnspel.save._requestPersist?.()
      return true
    }, n)
  const open = async () => {
    await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'pruttbad' }))
    await page.waitForTimeout(1200)
  }
  const leave = async () => {
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(500)
  }
  // Designkoordinat → sidkoordinat (duken är letterboxad).
  const toPage = (p) =>
    page.evaluate((q) => {
      const c = window.__barnspel.app.canvas.getBoundingClientRect()
      return {
        x: Math.round(c.left + q.x * (c.width / window.__barnspel.app.renderer.width)),
        y: Math.round(c.top + q.y * (c.height / window.__barnspel.app.renderer.height)),
      }
    }, p)

  await open()

  // ---- Bilden -------------------------------------------------------------
  const buf = await page.screenshot()
  if (shot) writeFileSync(shot, buf)
  const png = PNG.sync.read(buf)
  const px = (x, y) => {
    const i = (png.width * y + x) << 2
    return [png.data[i], png.data[i + 1], png.data[i + 2]]
  }
  const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
  // "Blått vatten" = märkbart mer blått än rött. Porslinet och kakelväggen är nästan
  // neutrala, badvattnet är det inte — det är den enda skillnaden som håller för alla
  // fem badsorter utom de varma, så mätningen görs alltid på nivå 0 (bubbelbad).
  const isWater = (p) => p[2] - p[0] > 26

  // 1. Ytlinjen. Kolumnen ligger till höger om Zacke och till vänster om ankan.
  let yta = -1
  for (let y = 262; y < 430; y++) {
    if (isWater(px(650, y)) && isWater(px(650, y + 4))) {
      yta = y
      break
    }
  }
  ok('ytlinjen', Math.abs(yta - SURFACE_Y) <= 6, `vattnet börjar y=${yta} (väntat ${SURFACE_Y})`)

  // 2. Syns golvet UNDER karet? Referens: golvet långt ut till vänster, utanför karet.
  //    Mätpunkten ligger OVANFÖR karets kontaktskugga — annars mäter man skuggan.
  const golvRef = px(60, ROOM_FLOOR + 14)
  const underKar = px(640, ROOM_FLOOR + 14)
  ok(
    'golv-under-kar',
    dist(golvRef, underKar) < 30 && !isWater(underKar),
    `golv(60)=${golvRef} under karet(640)=${underKar} · avstånd ${dist(golvRef, underKar)}`
  )

  // 3. Fötterna. ⚠️ MÄT FOTEN MOT GOLVET BREDVID PÅ SAMMA RAD, inte mot en enda
  //    referenspixel: golvet har både en skarvlinje och en lodrät toning, och första
  //    versionen fällde kontrollkolumnen på dem — sondens mätfel, inte spelets fel.
  //    Referenskolumnen ligger dessutom i karets kontaktskugga (640), så det som räknas är
  //    FOTEN och inte skuggan den står i.
  const band = (x, ref) => {
    let n = 0
    for (let y = ROOM_FLOOR + 12; y < 682; y++) if (dist(px(x, y), px(ref, y)) > 22) n++
    return n
  }
  const fot = band(258, 640) // foten mot skuggan bredvid
  const rent = band(140, 60) // golv mot golv = metodens nollpunkt
  ok('fötter', fot >= 25 && rent <= 2, `fot-kolumn ${fot} px mot golvet bredvid · nollpunkt (golv mot golv) ${rent} px`)

  // 4. Vattnet följer den lutande innerväggen. Vid y=560 ligger insidan på ~1060; hade
  //    vattnet varit en rundad rektangel (200..1080) hade x=1070 varit blått.
  const utanfor = px(1070, 560)
  const innanfor = px(1000, 560)
  ok('vatten-i-karet', !isWater(utanfor) && isWater(innanfor), `x=1070 ${utanfor} (ska vara porslin) · x=1000 ${innanfor} (ska vara vatten)`)

  // ---- Levande tillstånd --------------------------------------------------
  const g0 = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('pruttbad')
    return { duckY: g._duckBase.y, duckX: g._duckBase.x }
  })
  ok('ankan-vilar', Math.abs(g0.duckY - DUCK_FLOAT_Y) <= 2, `ankans vilo-y = ${Math.round(g0.duckY)} (ytan ${SURFACE_Y}, flytlinjen ${DUCK_FLOAT_Y})`)

  // 5. Hur djupt går hon? Dra henne rakt ner mot karbottnen.
  const start = await toPage({ x: g0.duckX, y: g0.duckY })
  const djupt = await toPage({ x: g0.duckX, y: 580 })
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(djupt.x, djupt.y, { steps: 12 })
  await page.waitForTimeout(120)
  const nere = await page.evaluate(async () => (await import('/src/games/registry.js')).getGame('pruttbad')._duckBase.y)
  ok('ankan-taket', nere <= DUCK_FLOAT_Y + 80 && nere > DUCK_FLOAT_Y + 40, `nertryckt till y=${Math.round(nere)} (taket ${DUCK_FLOAT_Y + 76}, gamla fältet gick till 584)`)

  // 6. Släpp → lyftkraften bär upp henne.
  await page.mouse.up()
  await page.waitForTimeout(900)
  const uppe = await page.evaluate(async () => (await import('/src/games/registry.js')).getGame('pruttbad')._duckBase.y)
  ok('ankan-flyter-upp', Math.abs(uppe - DUCK_FLOAT_Y) <= 3, `efter släpp y=${Math.round(uppe)} (flytlinjen ${DUCK_FLOAT_Y})`)

  // 7. Bubblorna föds innanför karets insida.
  const mage = await toPage({ x: 430, y: 340 })
  await page.mouse.move(mage.x, mage.y)
  await page.mouse.down()
  await page.waitForTimeout(80)
  await page.mouse.up()
  await page.waitForTimeout(120)
  const bub = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('pruttbad')
    const b = g._bubbles[0]
    return b ? { x: b.x, y: b.y, r: b.r } : null
  })
  // Insidans kontur (samma tal som spelet): IN_TOP 250, TUB_BOT 610, IN_L/R 194/1086, TAPER 30.
  const tubT = (y) => Math.max(0, Math.min(1, (y - 250) / (610 - 250)))
  const innerL = (y) => 194 + 30 * tubT(y)
  const innerR = (y) => 1086 - 30 * tubT(y)
  ok(
    'bubbelbotten',
    !!bub && bub.y < 606 && bub.y > SURFACE_Y && bub.x - bub.r > innerL(bub.y) && bub.x + bub.r < innerR(bub.y),
    bub ? `bubbla föds (${Math.round(bub.x)}, ${Math.round(bub.y)}) r=${Math.round(bub.r)} · insidan ${Math.round(innerL(bub.y))}–${Math.round(innerR(bub.y))}, botten 606` : 'ingen bubbla'
  )

  // 7b. BUBBELRESAN — den enda balanssiffra geometrin faktiskt rör. Karets innerbotten
  //     flyttade upp, alltså blev vattenpelaren kortare och varje bubbla poppar tidigare.
  //     Skummet per popp är ORÖRT (samma r, samma FOAM_K), så det här är en fråga om takt,
  //     inte om svårighet — men den ska mätas, inte antas.
  // ⚠️ SPÄNN LOSS ANKAN UR MÄTNINGEN. Första mätpunkten låg på x=700 och gav 1 729 ms mot
  //    HEADs 1 747 — men på HEAD låg ankan på (780, 430), alltså MITT I den bubblans väg,
  //    och en anka som sparkar upp bubblan (`vy -= 3`) mäter något helt annat än en fri
  //    stigning. x=350 är fri från ankan i BÅDA lägena.
  const resa = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('pruttbad')
    const en = () =>
      new Promise((res) => {
        g._bubbles.forEach((b) => b.view && !b.view.destroyed && b.view.destroy())
        g._bubbles.length = 0
        g._pushBubble(350, 34, 0, 'normal')
        const t0 = performance.now()
        const start = g._bubbles[0]?.y ?? null
        const iv = setInterval(() => {
          if (!g._bubbles.length || performance.now() - t0 > 8000) {
            clearInterval(iv)
            res({ ms: Math.round(performance.now() - t0), start: Math.round(start) })
          }
        }, 16)
      })
    const varv = []
    for (let i = 0; i < 3; i++) varv.push(await en())
    varv.sort((a, b) => a.ms - b.ms)
    return { ms: varv[1].ms, start: varv[1].start, alla: varv.map((v) => v.ms) }
  })
  ok('bubbelresan', resa.ms > 300 && resa.ms < 4000, `föds y=${resa.start} → popp på ${resa.ms} ms (median av ${resa.alla.join('/')}, r=34)`)

  // ---- Propp och kran: kontroll över nivån i BÅDA riktningar --------------
  const niva = () =>
    page.evaluate(async () => {
      const g = (await import('/src/games/registry.js')).getGame('pruttbad')
      return {
        surf: Math.round(g._surf),
        plug: !!g._plugOut,
        foam: Math.round(g._foam.level),
        goalFoam: g._goalFoam,
        goalY: Math.round(g._goalY),
        duckY: Math.round(g._duckBase.y),
        tvalTop: Math.round(g._tval?.bounds.top ?? -1),
        hit: Math.round(g._waterArea?.hitArea?.y ?? -1),
        skattY: Math.round(g._treasureLayer?.y ?? -999),
      }
    })

  // ⚠️ STARTA OM SPELET FÖRST. Kontrollerna ovan poppar bubblor, och bubblor ger skum:
  // första versionen av det här blocket ärvde 415 skum mot ett mål på 70, alltså hade
  // rundan redan KLARATS när proppen skulle testas — och `_togglePlug` avvisar (med kvitto)
  // medan firandet pågår. Fyra röda som alla var sondens eget fel.
  await leave()
  await setLevel(0)
  await open()
  await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('pruttbad')
    g._foam.level = 30 // en bit på väg mot målet (70), utan att gå via _addFoam och klara rundan
    g._drawFoam()
  })
  const fore = await niva()

  // Dra ut proppen.
  const plugPt = await toPage({ x: 900, y: 574 })
  await page.mouse.click(plugPt.x, plugPt.y)
  // Kostnaden för en levande nivå: vatten, toning, skum och mållinje ritas om varje bildruta
  // medan det rinner. Mät den MEDAN det rinner — efteråt är allt statiskt igen och siffran
  // säger ingenting.
  const fps = await page.evaluate(
    () =>
      new Promise((res) => {
        let n = 0
        const t0 = performance.now()
        const steg = () => {
          n++
          if (performance.now() - t0 < 1500) requestAnimationFrame(steg)
          else res(Math.round((n * 1000) / (performance.now() - t0)))
        }
        requestAnimationFrame(steg)
      })
  )
  ok('fps-medan-det-rinner', fps >= 50, `${fps} fps medan vatten+toning+skum+mållinje ritas om varje bildruta`)
  await page.waitForTimeout(1300)
  const tomt = await niva()
  if (shot) writeFileSync(shot.replace(/\.png$/, '') + '-tomt.png', await page.screenshot())
  ok('proppen-tommer', tomt.plug && tomt.surf > fore.surf + 60, `ytan ${fore.surf} → ${tomt.surf} (propp ute: ${tomt.plug})`)
  ok(
    'tomning-kostar-inget',
    tomt.foam === fore.foam && tomt.goalFoam === fore.goalFoam,
    `skum ${fore.foam} → ${tomt.foam} · mål ${fore.goalFoam} → ${tomt.goalFoam} (P0: en tömning får aldrig nollställa framsteg)`
  )
  ok(
    'allt-foljer-nivan',
    tomt.duckY > fore.duckY + 60 && tomt.goalY > fore.goalY + 60 && tomt.tvalTop > fore.tvalTop + 60 && tomt.hit > fore.hit + 60 && tomt.skattY > 60,
    `anka ${fore.duckY}→${tomt.duckY} · mållinje ${fore.goalY}→${tomt.goalY} · tvålband ${fore.tvalTop}→${tomt.tvalTop} · träffyta ${fore.hit}→${tomt.hit} · fyndlager ${tomt.skattY}`
  )

  // Tömningen har ett TAK — den får aldrig tömma karet helt.
  await page.waitForTimeout(3000)
  const botten = await niva()
  ok('tomningens-tak', botten.surf <= 470 && botten.surf >= 460, `ytan bottnar på ${botten.surf} (taket 468)`)

  // Kranen fyller på igen OCH sätter tillbaka proppen (de får aldrig slåss).
  const kranPt = await toPage({ x: 920, y: 180 })
  await page.mouse.click(kranPt.x, kranPt.y)
  await page.waitForTimeout(400)
  const fyller = await niva()
  ok('kranen-satter-proppen', !fyller.plug, `propp ute efter kran-tryck: ${fyller.plug} (ska vara false)`)
  for (let i = 0; i < 6; i++) {
    await page.mouse.click(kranPt.x, kranPt.y)
    await page.waitForTimeout(360)
  }
  await page.waitForTimeout(600)
  const fullt = await niva()
  ok('kranen-fyller', fullt.surf <= 332, `ytan ${botten.surf} → ${fullt.surf} (fullt = 330)`)
  ok('skummet-overlevde', fullt.foam === fore.foam, `skum ${fore.foam} → ${fullt.foam} genom hela tömningen och påfyllningen`)

  // ---- Schampoflaskorna: tre sorters bubblor, tre riktiga knappar ---------
  const flaskor = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('pruttbad')
    const ytor = g._soapViews.map((v) => ({ x: v.c.x, ha: { x: v.c.hitArea.x, w: v.c.hitArea.width, h: v.c.hitArea.height } }))
    const las = () => {
      const r = []
      for (let i = 0; i < 3; i++) {
        g._soap = i
        r.push({ min: Math.round(g._rMin()), max: Math.round(g._rMax()), antal: g._soapNow().antal })
      }
      g._soap = 1
      return r
    }
    const boost0 = g._levelBoost
    const spann = las()
    g._levelBoost = 20 // högsta nivåbonusen
    const spannHog = las()
    g._levelBoost = boost0
    return { ytor, spann, spannHog }
  })
  const minYta = Math.min(...flaskor.ytor.map((f) => Math.min(f.ha.w, f.ha.h)))
  const luckor = []
  for (let i = 1; i < 3; i++) {
    const a = flaskor.ytor[i - 1]
    const b = flaskor.ytor[i]
    luckor.push(b.x + b.ha.x - (a.x + a.ha.x + a.ha.w))
  }
  ok('flaskor-P0', minYta >= 96 && Math.min(...luckor) >= 24, `minsta träffyta ${minYta} px (krav 96) · luckor ${luckor.join('/')} px (krav 24)`)
  // ⚠️ KRÄV INTE HELT SKILDA SPANN. Första versionen gjorde det och blev röd på att den lilla
  // flaskans HÅLL-max (32) ligger över mellanflaskans TAP-start (28). Det är inget fel: att
  // hålla är belöningen, och banden får tangera i kanterna. Det som måste hålla är att ett
  // vanligt TRYCK ger tre tydligt olika storlekar, och att nivåbonusen inte äter skillnaden.
  const kollaSpann = (sp) => sp[0].min + 8 < sp[1].min && sp[1].min + 8 < sp[2].min && sp[0].max + 20 < sp[1].max && sp[1].max + 5 < sp[2].max
  const sp = flaskor.spann
  const spH = flaskor.spannHog
  ok(
    'flaskor-storlek',
    kollaSpann(sp) && kollaSpann(spH) && sp[0].antal === 3,
    `nivå 0: ${sp.map((q) => q.min + '–' + q.max).join(' · ')} — högsta bonus: ${spH.map((q) => q.min + '–' + q.max).join(' · ')} (liten ×${sp[0].antal})`
  )

  // Tryck på den lilla flaskan och kontrollera att bubblorna FAKTISKT blir små och många.
  const litenPt = await toPage({ x: 548, y: 110 })
  await page.mouse.click(litenPt.x, litenPt.y)
  await page.waitForTimeout(200)
  const bubbel = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('pruttbad')
    g._bubbles.forEach((b) => b.view && !b.view.destroyed && b.view.destroy())
    g._bubbles.length = 0
    g._level = 8
    g._applyLevel() // högsta nivåbonus — den får inte äta upp skillnaden mellan flaskorna
    g._zackePointerDown(g._ctx, { global: { x: 430, y: 340 } })
    g._releaseBubble(g._ctx)
    return { vald: g._soap, n: g._bubbles.length, r: g._bubbles.map((b) => Math.round(b.r)) }
  })
  ok(
    'liten-flaska-verkar',
    bubbel.vald === 0 && bubbel.n >= 3 && Math.max(...bubbel.r) <= 34,
    `vald flaska ${bubbel.vald} · ${bubbel.n} bubblor med radie ${bubbel.r.join('/')} (mellanflaskans egen start är 28)`
  )

  // 8. Mållinjen under rullkanten på alla nivåer.
  const RIM_BOT = 253 // rullkantens underkant inkl. stroke
  const goals = []
  for (const lvl of [0, 1, 2, 4, 8]) {
    await leave()
    await setLevel(lvl)
    await open()
    const gy = await page.evaluate(async () => (await import('/src/games/registry.js')).getGame('pruttbad')._goalY)
    goals.push({ lvl, gy })
  }
  const doldaNivaer = goals.filter((q) => q.gy - 7 <= RIM_BOT)
  ok('mållinjen', doldaNivaer.length === 0, goals.map((q) => `n${q.lvl}:${q.gy}`).join(' · ') + ` (rullkantens underkant ${RIM_BOT})`)

  // 9. Måldottarna syns FAKTISKT i bilden på en hög nivå.
  const gy = goals[goals.length - 1].gy
  const buf2 = await page.screenshot()
  const png2 = PNG.sync.read(buf2)
  const px2 = (x, y) => {
    const i = (png2.width * y + x) << 2
    return [png2.data[i], png2.data[i + 1], png2.data[i + 2]]
  }
  let dots = 0
  for (let x = 232; x <= 1010; x++) if (dist(px2(x, gy), [0x57, 0xc8, 0xc3]) < 90) dots++
  ok('måldottar-i-bild', dots >= 120, `${dots} px mållinje-teal längs y=${gy} på nivå 8`)

  // 10. Exit mitt i ett nertryck (lyftkraft-tweenen skriver via _setDuckPos).
  errors.length = 0
  const d2 = await page.evaluate(async () => (await import('/src/games/registry.js')).getGame('pruttbad')._duckBase.x)
  const s2 = await toPage({ x: d2, y: DUCK_FLOAT_Y })
  const e2 = await toPage({ x: d2 + 60, y: 560 })
  await page.mouse.move(s2.x, s2.y)
  await page.mouse.down()
  await page.mouse.move(e2.x, e2.y, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(60) // mitt i lyftkraftens tween
  await leave()
  await page.waitForTimeout(700)
  ok('exit', errors.length === 0, errors.length ? errors.slice(0, 3).join(' | ') : '0 konsolfel')
} finally {
  await browser.close()
}

let fel = 0
for (const r of results) {
  if (!r.pass) fel++
  console.log(`${r.pass ? '  ✓' : '  ✗'} ${r.namn.padEnd(18)} ${r.detalj}`)
}
console.log(`\n  ${results.length - fel}/${results.length} gröna`)
process.exit(fel ? 1 : 0)
