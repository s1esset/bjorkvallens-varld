// Guldfrukten (docs/games/fanga-frukten.md §4 Variation — "Specialfrukt")
//
// Ett sällsynt wow-ögonblick är per definition osynligt för `npm run test`: harnessen
// spelar några sekunder och fotograferar. Den kan varken bevisa att guldfrukten dyker
// upp, att den är sällsynt, eller att den räknas dubbelt.
//
//   1. Är den SÄLLSYNT (och dyker den alls upp)?
//   2. Kommer den aldrig som nivåns första frukt, och aldrig två samtidigt?
//   3. FALLER den långsammare än en vanlig frukt av samma storlek?
//   4. RÄKNAS den dubbelt — både i talet och i mätaren?
//   5. GLITTRAR den på vägen ner (så barnet ser att den är särskild INNAN den fångas)?
//   6. lämnar en exit medan en guldfrukt faller något igång?
//
//   node scripts/_guldprobe.mjs [--bild]     (kräver `npm run dev` på :5173)
import { chromium } from 'playwright'

const BILD = process.argv.includes('--bild')
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
  await page.evaluate(() => window.__barnspel.nav.go('game', { id: 'fanga-frukten' }))
  await page.waitForFunction(() => !!window.__barnspel.game?._fruit, null, { timeout: 15000 })
  await page.waitForTimeout(1200)

  console.log('\nGuldfrukten i `fanga-frukten`\n')

  // ---------- 1 + 2: sällsynthet och de två spärrarna ----------
  // Varje släpp mäts med tom luft: annars slår "aldrig två samtidigt" i taket och
  // frekvensen blir en funktion av städningen i stället för av slumpen.
  const stat = await page.evaluate((N) => {
    const w = window.__barnspel
    const g = w.game
    const rensa = () => {
      for (const f of [...g._fruit]) {
        if (f.body) g._phys.removeBody(f.body)
        if (f.view && !f.view.destroyed) f.view.destroy()
      }
      g._fruit.length = 0
    }
    // (a) Med `_caught === 0` får ingen guldfrukt födas — nivåns första frukt ska vara
    //     en vanlig, annars betyder den ovanliga ingenting.
    g._caught = 0
    let forsta = 0
    for (let i = 0; i < 200; i++) {
      rensa()
      g._spawn(w.ctx)
      if (g._fruit.some((f) => f.kind === 'guld')) forsta++
    }
    // (b) Frekvensen när spärren släppt.
    g._caught = 3
    let guld = 0
    for (let i = 0; i < N; i++) {
      rensa()
      g._spawn(w.ctx)
      if (g._fruit.some((f) => f.kind === 'guld')) guld++
    }
    // (c) Två samtidigt: fyll luften utan att rensa och räkna guldfrukterna.
    rensa()
    let max = 0
    for (let i = 0; i < 400; i++) {
      if (g._fruit.length >= 6) rensa()
      g._spawn(w.ctx)
      max = Math.max(max, g._fruit.filter((f) => f.kind === 'guld').length)
    }
    rensa()
    return { forsta, guld, N, max }
  }, 900)
  const andel = stat.guld / stat.N
  ok('guldfrukten dyker upp', stat.guld > 0, `${stat.guld} av ${stat.N} släpp`)
  ok('den är SÄLLSYNT (~1 på 9)', andel > 0.06 && andel < 0.17, `${(andel * 100).toFixed(1)} %`)
  ok('aldrig nivåns första frukt', stat.forsta === 0, `${stat.forsta} av 200 släpp före första fångsten`)
  ok('aldrig två i luften samtidigt', stat.max <= 1, `mest ${stat.max} samtidigt`)

  // ---------- 3: faller den långsammare? ----------
  // Samma storlek, samma starthöjd, samma antal bildrutor — enda skillnaden är sorten.
  const fart = await page.evaluate(async () => {
    const w = window.__barnspel
    const g = w.game
    const matt = async (guld) => {
      for (const f of [...g._fruit]) {
        if (f.body) g._phys.removeBody(f.body)
        if (f.view && !f.view.destroyed) f.view.destroy()
      }
      g._fruit.length = 0
      const orig = Math.random
      // Tvinga sorten: 0.05 < 0.11 ger guld, 0.9 ger en vanlig frukt. Samma tal styr
      // också storleken, så båda armarna får SAMMA storlek — annars mäter man massan.
      Math.random = () => (guld ? 0.05 : 0.9)
      g._caught = 3
      g._spawn(w.ctx)
      Math.random = orig
      const f = g._fruit[g._fruit.length - 1]
      const y0 = f.body.position.y
      for (let i = 0; i < 70; i++) await new Promise((r) => requestAnimationFrame(r))
      return { kind: f.kind, fall: +(f.body.position.y - y0).toFixed(1), v: +f.body.velocity.y.toFixed(2) }
    }
    const a = await matt(true)
    const b = await matt(false)
    return { guld: a, vanlig: b }
  })
  ok('guldfrukten faller LÅNGSAMMARE än en vanlig av samma storlek',
    fart.guld.kind === 'guld' && fart.vanlig.kind !== 'guld' && fart.guld.fall < fart.vanlig.fall * 0.95,
    `guld ${fart.guld.fall} px (v ${fart.guld.v}) mot vanlig ${fart.vanlig.fall} px (v ${fart.vanlig.v})`)

  // ---------- 5: glittrar den på vägen ner? ----------
  // ⚠️ Räkna INTE barn i `fxLayer`. `sparkle()` går genom partikelvägen
  // (`lib/partiklar.js` → `ParticleContainer`), alltså ETT återanvänt fält vars innehåll
  // ligger i `particleChildren`. Första mätningen såg "1 ny fx-nod" och läste som att
  // glittret inte fungerade — den räknade fältet, inte gnistorna.
  //
  // Två mått, båda behövs: hur många GÅNGER spelet gnistrade (dess egen tidsstämpel
  // flyttas per emission) och hur många partiklar som faktiskt LEVDE i fältet.
  const glitter = await page.evaluate(async () => {
    const w = window.__barnspel
    const g = w.game
    const partiklar = () => {
      let n = 0
      const gaIgenom = (o) => {
        if (Array.isArray(o.particleChildren)) n += o.particleChildren.length
        for (const c of o.children || []) gaIgenom(c)
      }
      gaIgenom(w.ctx.fxLayer)
      return n
    }
    const rakna = async (guld) => {
      for (const f of [...g._fruit]) {
        if (f.body) g._phys.removeBody(f.body)
        if (f.view && !f.view.destroyed) f.view.destroy()
      }
      g._fruit.length = 0
      const orig = Math.random
      Math.random = () => (guld ? 0.05 : 0.9)
      g._caught = 3
      g._spawn(w.ctx)
      Math.random = orig
      const f = g._fruit[g._fruit.length - 1]
      let emissioner = 0
      let sist = f.gnistT || 0
      let topp = 0
      for (let i = 0; i < 70; i++) {
        await new Promise((r) => requestAnimationFrame(r))
        if ((f.gnistT || 0) !== sist) { emissioner++; sist = f.gnistT }
        topp = Math.max(topp, partiklar())
      }
      return { emissioner, topp }
    }
    return { guld: await rakna(true), vanlig: await rakna(false) }
  })
  ok('guldfrukten gnistrar flera gånger på vägen ner',
    glitter.guld.emissioner >= 3 && glitter.vanlig.emissioner === 0,
    `${glitter.guld.emissioner} emissioner mot ${glitter.vanlig.emissioner} för en vanlig frukt`)
  ok('gnistorna hamnar på riktigt i partikelfältet', glitter.guld.topp > glitter.vanlig.topp,
    `${glitter.guld.topp} partiklar mot ${glitter.vanlig.topp}`)

  if (BILD) {
    await page.evaluate(() => {
      const w = window.__barnspel
      const g = w.game
      const orig = Math.random
      Math.random = () => 0.05
      g._caught = 3
      g._spawn(w.ctx)
      Math.random = orig
      const f = g._fruit[g._fruit.length - 1]
      f.body.position.y = 300
      f.body.positionPrev.y = 300
      f.body.position.x = 640
      f.body.positionPrev.x = 640
    })
    await page.waitForTimeout(400)
    await page.screenshot({ path: '.test-shots/_guldfrukt.png' })
  }

  // ---------- 4: räknas den dubbelt? ----------
  const dubbel = await page.evaluate(() => {
    const w = window.__barnspel
    const g = w.game
    // ⚠️ Luften MÅSTE tömmas först. Steget före lämnade en guldfrukt kvar, och spelets
    // egen spärr ("aldrig två samtidigt") gjorde då att den tvingade guldfrukten aldrig
    // föddes — mätningen rapporterade "+1" och läste som att dubbelräkningen var trasig.
    for (const f of [...g._fruit]) {
      if (f.body) g._phys.removeBody(f.body)
      if (f.view && !f.view.destroyed) f.view.destroy()
    }
    g._fruit.length = 0
    const fanga = (guld) => {
      const orig = Math.random
      Math.random = () => (guld ? 0.05 : 0.9)
      g._spawn(w.ctx)
      Math.random = orig
      const f = g._fruit[g._fruit.length - 1]
      const fore = { n: g._caught, m: g._caughtEmojis.length }
      g._catchFruit(w.ctx, f)
      return { kind: f.kind, dN: g._caught - fore.n, dM: g._caughtEmojis.length - fore.m }
    }
    g._caught = 1
    g._caughtEmojis = ['apple']
    g._goal = 99 // rundan får inte ta slut mitt i mätningen
    return { guld: fanga(true), vanlig: fanga(false), sista: g._caughtEmojis.slice(-3) }
  })
  ok('en guldfrukt räknas som TVÅ', dubbel.guld.kind === 'guld' && dubbel.guld.dN === 2,
    `+${dubbel.guld.dN} mot en vanlig frukts +${dubbel.vanlig.dN}`)
  ok('och fyller två platser i mätaren', dubbel.guld.dM === 2 && dubbel.vanlig.dM === 1,
    `mätaren slutar på ${dubbel.sista.join(' · ')}`)

  // ---------- 6: exit medan en guldfrukt faller ----------
  await page.evaluate(() => {
    const w = window.__barnspel
    const g = w.game
    const orig = Math.random
    Math.random = () => 0.05
    g._caught = 3
    g._spawn(w.ctx)
    Math.random = orig
    w.nav.go('menu')
  })
  await page.waitForTimeout(900)
  const kvar = await page.evaluate(() => !!window.__barnspel.game)
  ok('exit medan en guldfrukt faller', !kvar && fel.length === 0,
    `spelmodul kvar: ${kvar ? 'JA' : 'nej'} · konsolfel: ${fel.length}`)
  if (fel.length) console.log(fel.slice(0, 5).map((f) => '   ! ' + f).join('\n'))
} catch (e) {
  console.error('SOND-FEL:', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
