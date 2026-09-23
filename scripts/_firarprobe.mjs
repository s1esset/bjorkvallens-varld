// Dubbelfirande-sond: vad händer när ett spel firar SJÄLVT i samma ögonblick som det
// anropar `progress.complete()` — som ju redan firar (GameHost: vinstljud + beröm + regn)?
//
//   node scripts/_firarprobe.mjs [--url http://localhost:5173] [--spel stor-liten]
//
// Sonden driver värdens RIKTIGA complete() (window.__barnspel.ctx) i ett spel som inte
// själv firar vid complete, och räknar tre saker per arm:
//   vinstljud   anrop till AudioService._celebrate (efter 30 ms-golvet i sfx())
//   regn        nya konfettibitar i fxLayer (partikelfältens particleChildren)
//   röst        vem som talar efteråt, och om repliken som redan talade blev kapad
//
// Armar (spelet görs i sidan, komplett() anropas som spelet skulle):
//   K  kontroll    bara complete()                         → 1 ljud · 1 regn · berömmet talas
//   T  talar-före  spelets replik talar redan (klippet går) → repliken ska INTE kapas
//   S  samma tick  sfx('celebrate') + bigCelebration + complete() i samma tick
//   F  före 0,4 s  samma firande 400 ms före complete()   → 30 ms-golvet räddar inte här
//   E  efter       complete() och SEDAN spelets eget regn i samma tick
//
// KONTROLLARMEN FÖRST: K måste visa 1/1/beröm och T:s förutsättning (klippet spelar
// faktiskt före complete) måste vara sann, annars mäter T ingenting.
import { chromium } from 'playwright'

const arg = (namn, fallback) => {
  const i = process.argv.indexOf(namn)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const URL = arg('--url', 'http://localhost:5173')
const SPEL = arg('--spel', 'stor-liten')

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const konsolfel = []
page.on('pageerror', (e) => konsolfel.push(String(e.message || e).slice(0, 160)))
page.on('console', (m) => { if (m.type() === 'error') konsolfel.push(m.text().slice(0, 160)) })
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
// Appens EGEN feedback.js — efter en sparning bär appens import en ?t=-stämpel, och en
// ostämplad import är en ANNAN modulinstans med ett eget regnfönster (mätte +360 i alla armar).
async function fbUrl() {
  await page.evaluate(() => {
    const e = performance.getEntriesByType('resource').map((r) => r.name).filter((n) => /\/src\/lib\/feedback\.js/.test(n))
    window.__fbUrl = e[e.length - 1] || '/src/lib/feedback.js'
  })
}

// Montera spelet på nytt per arm så värden (och dess complete) är färsk.
async function montera() {
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(400)
  await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), SPEL)
  await page.waitForFunction(() => !!window.__barnspel.ctx?.progress, null, { timeout: 15000 })
  // Låt introt tala klart och ev. firande från monteringen dö ut.
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    const s = window.__barnspel.ctx.services
    s.voice.cancel()
    const a = s.audio
    if (!a.__firarRaknad) {
      const orig = a._celebrate.bind(a)
      a._celebrate = (...x) => { window.__firar.ljud++; return orig(...x) }
      const say = s.voice.say.bind(s.voice)
      s.voice.say = (text, force) => {
        window.__firar.sagt.push(text)
        // Talade något redan när repliken kom? Då kapade den det (say() kallar cancel()).
        window.__firar.kapade.push(s.voice.talar && s.voice.kvar > 0.15)
        return say(text, force)
      }
      a.__firarRaknad = true
    }
    window.__firar = { ljud: 0, sagt: [], kapade: [] }
  })
  await page.waitForTimeout(3200) // regn från tidigare armar hinner falla ur
  await fbUrl()
}

const regn = () =>
  page.evaluate(() => {
    let n = 0
    const walk = (c) => {
      if (Array.isArray(c.particleChildren)) n += c.particleChildren.length
      for (const k of c.children || []) walk(k)
    }
    walk(window.__barnspel.ctx.fxLayer)
    return n
  })

const lasRost = () =>
  page.evaluate(() => {
    const v = window.__barnspel.ctx.services.voice
    return { last: v.last, talar: v.talar, kvar: +v.kvar.toFixed(2) }
  })

// En replik som har ett klipp och är lång nog att fortfarande spela efter 600 ms.
const REPLIK = await page.evaluate(async () => {
  const m = await (await fetch('/audio/voice/manifest.json')).json()
  return Object.keys(m).find((t) => t.length > 40) || Object.keys(m)[0]
})

const rapport = []
async function arm(namn, fore, efter, vantaMs = 0, foreArg = null) {
  await montera()
  const r0 = await regn()
  await page.evaluate(fore, foreArg)
  if (vantaMs) await page.waitForTimeout(vantaMs)
  const rostFore = await lasRost()
  await page.evaluate(efter)
  await page.waitForTimeout(250)
  const r1 = await regn()
  const rostEfter = await lasRost()
  const f = await page.evaluate(() => window.__firar)
  rapport.push({ namn, ljud: f.ljud, regn: r1 - r0, sagt: f.sagt.map((t) => t.slice(0, 28)), rostFore, rostEfter })
  console.log(`${namn.padEnd(12)} ljud=${f.ljud}  regn=+${r1 - r0}  sagt=${JSON.stringify(f.sagt.map((t) => t.slice(0, 22)))}`)
  console.log(`${''.padEnd(12)} röst före: talar=${rostFore.talar} kvar=${rostFore.kvar}  ·  efter: "${String(rostEfter.last).slice(0, 30)}" talar=${rostEfter.talar} kvar=${rostEfter.kvar}`)
  return { f, r: r1 - r0, rostFore, rostEfter }
}

const complete = () => window.__barnspel.ctx.progress.complete()
const eget = async () => {
  const fb = await import(window.__fbUrl)
  const c = window.__barnspel.ctx
  c.services.audio.sfx('celebrate')
  fb.bigCelebration(c.fxLayer, { width: 1280, height: 720 })
}

console.log(`spel: ${SPEL} · replik: "${REPLIK.slice(0, 50)}"\n`)
const K = await arm('K kontroll', () => {}, complete)
const T = await arm('T talar-före', (t) => window.__barnspel.ctx.services.voice.say(t), complete, 600, REPLIK)
const S = await arm('S samma-tick', () => {}, async () => {
  const fb = await import(window.__fbUrl)
  const c = window.__barnspel.ctx
  c.services.audio.sfx('celebrate')
  fb.bigCelebration(c.fxLayer, { width: 1280, height: 720 })
  c.progress.complete()
})
const F = await arm('F före-0,4s', eget, complete, 400)
const E = await arm('E efter', () => {}, async () => {
  const fb = await import(window.__fbUrl)
  const c = window.__barnspel.ctx
  c.progress.complete()
  fb.bigCelebration(c.fxLayer, { width: 1280, height: 720 })
})

// ctx.narTyst: en replik EFTER complete() ska vänta in berömmet, inte kapa det.
// L är kontrollarmen (fast fördröjning, som spelen gjorde) — den MÅSTE kapa, annars mäter N inget.
async function efterArm(namn, kod, vantaMs) {
  await montera()
  await page.evaluate(kod, REPLIK)
  await page.waitForTimeout(vantaMs)
  const f = await page.evaluate(() => window.__firar)
  console.log(`${namn.padEnd(12)} sagt=${JSON.stringify(f.sagt.map((t) => t.slice(0, 18)))} kapade=${JSON.stringify(f.kapade)}`)
  return f
}
const L = await efterArm('L fast 0,5s', (t) => {
  const c = window.__barnspel.ctx
  c.progress.complete()
  c.later(0.5, () => c.services.voice.say(t))
}, 1500)
const N = await efterArm('N narTyst', (t) => {
  const c = window.__barnspel.ctx
  c.progress.complete()
  c.later(0.5, () => c.narTyst(() => c.services.voice.say(t)))
}, 12000) // spelets egen tomgångsrad (upp till 8,4 s) kan hinna före — då väntar narTyst in den med
// X: lämna spelet medan berömmet talar — den köade repliken får aldrig komma.
await montera()
await page.evaluate((t) => {
  const c = window.__barnspel.ctx
  c.progress.complete()
  c.narTyst(() => c.services.voice.say(t))
}, REPLIK)
await page.waitForTimeout(200)
await page.evaluate(() => window.__barnspel.nav.go('library'))
await page.waitForTimeout(3500)
const X = await page.evaluate(() => window.__firar)
console.log(`X exit       sagt=${JSON.stringify(X.sagt.map((t) => t.slice(0, 18)))}`)

let fel = 0
const ok = (namn, v, d = '') => { console.log(`  ${v ? '✓' : '✗'} ${namn}${d ? ' · ' + d : ''}`); if (!v) fel++ }
console.log('\nförutsättningar (kontrollarm):')
const ETT = K.r
ok('K: ett regn föds', ETT > 0, `+${ETT}`)
ok('K: ett vinstljud', K.f.ljud === 1)
ok('K: berömmet talas', K.f.sagt.length === 1 && K.rostEfter.talar)
ok('T: repliken SPELAR före complete (annars mäter T inget)', T.rostFore.talar && T.rostFore.kvar > 0.3, `kvar=${T.rostFore.kvar}`)
console.log('\nmätning:')
ok('T: spelets replik kapas inte', T.rostEfter.last === REPLIK && T.rostEfter.talar, `efter="${String(T.rostEfter.last).slice(0, 24)}"`)
ok('S: ett vinstljud', S.f.ljud === 1, `${S.f.ljud}`)
ok('S: ett regn', S.r <= ETT * 1.1, `+${S.r} (ett = ${ETT})`)
ok('F: ett vinstljud', F.f.ljud === 1, `${F.f.ljud}`)
ok('F: ett regn', F.r <= ETT * 1.1, `+${F.r}`)
ok('E: ett regn även när spelet regnar EFTER complete', E.r <= ETT * 1.1, `+${E.r}`)
ok('E: ett vinstljud', E.f.ljud === 1, `${E.f.ljud}`)
ok('L: kontroll — fast fördröjning KAPAR berömmet (annars mäter N inget)', L.kapade[1] === true)
// (spelet självt kan tala under väntan — då väntar narTyst in den raden också)
const iN = N.sagt.indexOf(REPLIK)
ok('N: narTyst väntar in berömmet', iN > 0 && N.kapade[iN] === false, `index ${iN} · ${JSON.stringify(N.kapade)}`)
ok('X: köad replik dör med omgången', !X.sagt.includes(REPLIK), JSON.stringify(X.sagt.map((t) => t.slice(0, 14))))
ok('inga konsolfel', konsolfel.length === 0, konsolfel.slice(0, 3).join(' | '))
console.log(fel ? `\n${fel} RÖDA` : '\nalla gröna')
process.exit(fel ? 1 : 0)
