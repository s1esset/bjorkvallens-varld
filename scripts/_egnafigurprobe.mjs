// _egnafigurprobe.mjs — barnets EGNA figurer i andra spel (LYFTPLAN §10, Spår F).
//
// Mot dev-servern (:5173). Kör ENSAM — aldrig bredvid en annan webbläsarsond eller test:all.
//
//   node scripts/_egnafigurprobe.mjs            alla armar
//   node scripts/_egnafigurprobe.mjs --bild     + skärmdumpar i .test-shots/egna-<id>.png
//
// Armarna:
//   K0  KONTROLLARM: en profil UTAN samlingar → valjEgna ger tomt varje gång (reserven), och
//       varje spel visar sin egen figur. Faller den mäter resten ingenting.
//   L1  lasEgna läser exakt de seedade 3 knytten + 2 kompisarna, trasiga poster bortsanerade.
//   U1  takten utan nya: egen, tom, egen, tom … per spel, oberoende mellan spel.
//   U2  en NY figur (minns) kommer först i nästa omgång av VARJE spel, även på en "tom" omgång,
//       och bara en gång per spel.
//   U3  profilnyckeln: en annan profil ser varken samlingen eller sessionens nya.
//   U4  antal 3 → tre olika id:n.
//   F1  fasaden: alla 5 figurerna byggs i Karaktar-rummet (r 50 → höjd 160), svarar på alla
//       händelser, och destroy() släpper tickern (ticker.count tillbaka) — även när spelet
//       river vyn UTAN att fråga (självstädningen i tick).
//   G*  de sex spelen: barnets figur står där på första omgången (sessionen nollad), INTE på
//       nästa (takten), 0 konsolfel genom två besök vardera och en exit mitt i.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BILD = process.argv.includes('--bild')
const URL = 'http://localhost:5173'

const KNYTT = [
  [12345, 2, 1, 3, 0, 1, 0, 0, 0],
  [987654, 5, 2, 1, 2, 2, 1, 1, 16],
  [55555, 7, 3, 4, 1, 0, 2, 0, 1],
  ['trasig'], // saneras bort
]
const KOMPISAR = [
  { kropp: 0, ogon: 1, mun: 0, topp: 4, farg: 2, storlek: 1 },
  { kropp: 2, ogon: 3, mun: 2, topp: 1, farg: 6, storlek: 2 },
]

const rader = []
let fel = 0
const ok = (namn, villkor, info = '') => {
  rader.push(`${villkor ? '✓' : '✗'} ${namn}${info ? '  ' + info : ''}`)
  if (!villkor) fel++
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const konsol = []
  page.on('console', (m) => { if (m.type() === 'error') konsol.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => konsol.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  const vanta = (ms) => page.waitForTimeout(ms)
  const ga = async (id) => {
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
    await vanta(1400)
  }
  const hem = async () => {
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await vanta(500)
  }

  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel?.profiles?.activeId?.(), null, { timeout: 20000 })

  // Appens EGEN modulinstans — en nyimporterad kopia har ett eget sessionsminne.
  const modUrl = async () => page.evaluate(() => {
    const e = performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('/src/lib/egnafigurer.js'))
    return e || '/src/lib/egnafigurer.js'
  })
  // Gå in i ett spel en gång så modulen garanterat är laddad, och läs dess url.
  await ga('vippbradan')
  const MOD = await modUrl()
  await hem()

  // ---- K0: tom profil ------------------------------------------------------------------
  const k0 = await page.evaluate(async (mod) => {
    const m = await import(mod)
    m.glomSessionen()
    const s = window.__barnspel
    const ut = []
    for (let i = 0; i < 4; i++) ut.push(m.valjEgna(s, 'k0-spel').length)
    return { las: m.lasEgna(s), ut }
  }, MOD)
  ok('K0 tom profil: lasEgna tom', k0.las.knytt.length === 0 && k0.las.kompisar.length === 0)
  ok('K0 tom profil: valjEgna ger alltid tomt (reserven)', k0.ut.every((n) => n === 0), JSON.stringify(k0.ut))

  // ---- M: MÖTTA knytt (F5.4) — fortfarande tom samling -----------------------------------
  const dnaUrl = await page.evaluate(() => {
    const e = performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('/src/games/unika-knytt/dna.js'))
    return e || '/src/games/unika-knytt/dna.js'
  })
  const mArm = await page.evaluate(async ({ mod, dnaMod }) => {
    const m = await import(mod)
    const d = await import(dnaMod)
    const s = window.__barnspel
    m.glomSessionen()
    const r = {}
    // M1: ett mött knytt i en profil UTAN egna → valjEgna ger det på en egen omgång.
    const post = [424242, 3, 2, 1, 4, 0, 2, 0, 0]
    m.minnsMott(s, 'knytt', post)
    const a = m.valjEgna(s, 'm-spel')
    r.m1 = a.map((b) => `${b.id}:${b.kalla}:${b.ny}`)
    r.m1tom = m.valjEgna(s, 'm-spel').length // takten: nästa är spelets egen
    // M2: popcornkalaset ber om motta: false → ingenting
    r.m2 = m.valjEgna(s, 'm-spel2', { motta: false }).length
    // M3: soffans sparpost ger EXAKT samma individ som dnaFromSeed(seed, val), 300 slumpade.
    let lika = 0
    for (let i = 0; i < 300; i++) {
      const seed = Math.floor(Math.random() * 4294967296) >>> 0
      const val = { f: Math.floor(Math.random() * 10), z: Math.floor(Math.random() * 4), m: Math.floor(Math.random() * 6), v: Math.floor(Math.random() * 6), g: Math.floor(Math.random() * 4) }
      const p = [seed, val.f, val.z, val.m, val.v, 0, val.g, 0, 0]
      if (JSON.stringify(d.dnaFromSeed(seed, val)) === JSON.stringify(d.dnaFranPost(p))) lika++
    }
    r.m3 = lika
    // M4: presentera tiger för ett mött knytt, även om det vore "nytt".
    let koat = 0
    const falskCtx = { ...s.ctx, narTyst: () => { koat++ } }
    const fig = m.byggEgenFigur(s.ctx, { ...a[0], ny: true }, { r: 40 })
    m.presentera(falskCtx, fig, { knytt: 'x', kompis: 'y' })
    r.m4 = { koat, mott: fig.mott }
    fig.destroy()
    return r
  }, { mod: MOD, dnaMod: dnaUrl })
  ok('M1 ett mött knytt dyker upp i en profil utan egna, som mött och inte nytt', mArm.m1.length === 1 && mArm.m1[0] === 'k424242:mott:false', JSON.stringify(mArm.m1))
  ok('M1 … och takten gäller (nästa är spelets egen)', mArm.m1tom === 0)
  ok('M2 motta: false (soffan) ser inga mötta', mArm.m2 === 0)
  ok('M3 soffans sparpost = samma individ (300/300)', mArm.m3 === 300, `${mArm.m3}/300`)
  ok('M4 presentera kallar aldrig ett mött knytt "ditt"', mArm.m4.koat === 0 && mArm.m4.mott === true, JSON.stringify(mArm.m4))

  // M5: popcornkalaset minns sina slumpade knytt. En knyttgäst dras inte varje gång — gå in
  // tills en sitter i soffan (högst 8 försök), och se att ETT ANNAT spel då får just den.
  let m5 = null
  for (let i = 0; i < 8 && !m5; i++) {
    await page.evaluate(async (mod) => (await import(mod)).glomSessionen(), MOD)
    await ga('popcornkalaset')
    m5 = await page.evaluate(async (mod) => {
      const m = await import(mod)
      const g = window.__barnspel.game
      const knytt = (g._gaster || []).find((x) => x.post)
      if (!knytt) return null
      const val = m.valjEgna(window.__barnspel, 'm5-spel')
      return { vantat: m.figurId('knytt', knytt.post), fick: val.map((b) => `${b.id}:${b.kalla}`) }
    }, MOD)
    await hem()
  }
  ok('M5 soffans slumpade knytt dyker upp i ett annat spel', !!m5 && m5.fick[0] === `${m5.vantat}:mott`, JSON.stringify(m5))
  await page.evaluate(async (mod) => (await import(mod)).glomSessionen(), MOD)
  for (const id of ['vippbradan', 'glasstornet', 'studsbollar']) {
    await ga(id)
    const egen = await page.evaluate(async ({ mod, id }) => {
      const m = await import(mod)
      const g = window.__barnspel.game
      const f = id === 'studsbollar' ? g._egenFang : g._kar
      return { egen: !!f && m.arEgen(f), finns: !!f }
    }, { mod: MOD, id })
    ok(`K0 ${id}: spelets egen figur står kvar`, !egen.egen && (id === 'studsbollar' || egen.finns))
    await hem()
  }

  // ---- seeda samlingarna (via källspelens egen progress) --------------------------------
  await ga('unika-knytt')
  await page.evaluate((lista) => {
    window.__barnspel.ctx.progress.setCustom('knytt', { v: 2, lista, n: lista.length, firad: 3, dag: 0, torka: 0 })
  }, KNYTT)
  await hem()
  await ga('bygg-en-kompis')
  await page.evaluate((g) => window.__barnspel.ctx.progress.setCustom('galleri', g), KOMPISAR)
  await hem()

  // ---- L1 + U1–U4 ------------------------------------------------------------------------
  const u = await page.evaluate(async ({ mod, knytt0 }) => {
    const m = await import(mod)
    const s = window.__barnspel
    m.glomSessionen()
    const r = {}
    const las = m.lasEgna(s)
    r.las = { knytt: las.knytt.length, kompisar: las.kompisar.length }
    // U1: takten, två spel som inte stör varandra
    r.u1a = []
    r.u1b = []
    for (let i = 0; i < 6; i++) {
      r.u1a.push(m.valjEgna(s, 'spel-a').length)
      if (i % 2 === 0) r.u1b.push(m.valjEgna(s, 'spel-b').length)
    }
    // U2: en ny figur. spel-a står nu på "tom" i takten (6 anrop: e,t,e,t,e,t → nästa e) —
    // ta ett anrop till så nästa är tom, och se att den nya ändå kommer.
    m.valjEgna(s, 'spel-a') // egen
    m.minns(s, 'knytt', knytt0)
    const ny1 = m.valjEgna(s, 'spel-a') // skulle varit tom → men en ny finns
    const ny2 = m.valjEgna(s, 'spel-a') // nu tom (takten)
    const ny3 = m.valjEgna(s, 'spel-c') // ett ANNAT spel: den nya först
    r.u2 = {
      ny1: ny1.map((b) => `${b.id}:${b.ny}`),
      ny2: ny2.length,
      ny3: ny3.map((b) => `${b.id}:${b.ny}`),
      id0: m.figurId('knytt', knytt0),
    }
    // U4
    const tre = m.valjEgna(s, 'spel-d', { antal: 3 })
    r.u4 = tre.map((b) => b.id)
    // U3: en annan profil
    const forra = s.profiles.activeId()
    const ny = s.profiles.create('Sond', s.profiles.active()?.avatar)
    s.profiles.setActive(ny.id)
    r.u3 = { las: m.lasEgna(s), val: m.valjEgna(s, 'spel-a').length + m.valjEgna(s, 'spel-c').length }
    s.profiles.setActive(forra)
    s.profiles.remove(ny.id)
    r.tillbaka = s.profiles.activeId() === forra
    return r
  }, { mod: MOD, knytt0: KNYTT[0] })
  ok('L1 lasEgna: 3 knytt + 2 kompisar, trasig post bortsanerad', u.las.knytt === 3 && u.las.kompisar === 2, JSON.stringify(u.las))
  ok('U1 takten spel-a: egen/tom omväxlande', JSON.stringify(u.u1a) === JSON.stringify([1, 0, 1, 0, 1, 0]), JSON.stringify(u.u1a))
  ok('U1 takten spel-b oberoende av spel-a', JSON.stringify(u.u1b) === JSON.stringify([1, 0, 1]), JSON.stringify(u.u1b))
  ok('U2 en ny figur kommer först, även på en tom omgång', u.u2.ny1.length === 1 && u.u2.ny1[0] === `${u.u2.id0}:true`, JSON.stringify(u.u2))
  ok('U2 … och bara en gång per spel (nästa är tom)', u.u2.ny2 === 0)
  ok('U2 … och först i ett ANNAT spel också', u.u2.ny3[0] === `${u.u2.id0}:true`)
  ok('U4 antal 3 → tre olika', u.u4.length === 3 && new Set(u.u4).size === 3, JSON.stringify(u.u4))
  ok('U3 en annan profil ser ingenting', u.u3.las.knytt.length === 0 && u.u3.las.kompisar.length === 0 && u.u3.val === 0)
  ok('U3 profilen återställd', u.tillbaka)

  // ---- F1: fasaden ------------------------------------------------------------------------
  await ga('vippbradan')
  const f1 = await page.evaluate(async (mod) => {
    const m = await import(mod)
    const s = window.__barnspel
    const ctx = s.ctx
    const ticker = ctx.ticker
    const las = m.lasEgna(s)
    const beskr = [
      ...las.knytt.map((d) => ({ typ: 'knytt', data: d, id: m.figurId('knytt', d) })),
      ...las.kompisar.map((d) => ({ typ: 'kompis', data: d, id: m.figurId('kompis', d) })),
    ]
    const ut = []
    const fore = ticker.count
    for (const b of beskr) {
      const f = m.byggEgenFigur(ctx, b, { r: 50 })
      ctx.stage.addChild(f.view)
      f.view.position.set(640, 300)
      const medFig = ticker.count
      for (const h of ['jubel', 'heja', 'hej', 'nam', 'hoppsan', 'nyfiken']) f.react(h)
      f.look(900, 200)
      f.setMood('hungrig')
      await new Promise((r) => setTimeout(r, 120))
      const bnd = f.view.getLocalBounds()
      ut.push({ typ: b.typ, hojd: Math.round(f.matt.hojd), fot: Math.round(f.matt.fot.y), topp: Math.round(bnd.minY), namn: f.namn, okTick: medFig === fore + 1 })
      f.destroy()
    }
    const efter = ticker.count
    // Självstädningen: spelet river vyn UTAN att kalla destroy().
    const f = m.byggEgenFigur(ctx, beskr[0], { r: 50 })
    ctx.stage.addChild(f.view)
    const med = ticker.count
    f.view.destroy({ children: true })
    await new Promise((r) => setTimeout(r, 100))
    return { ut, fore, efter, med, sjalv: ticker.count }
  }, MOD)
  for (const x of f1.ut) {
    ok(`F1 ${x.typ}: höjd 160 i Karaktar-rummet, fötterna på 108`, Math.abs(x.hojd - 160) <= 1 && x.fot === 108, JSON.stringify(x))
  }
  ok('F1 knyttet har ett namn', f1.ut.filter((x) => x.typ === 'knytt').every((x) => typeof x.namn === 'string' && x.namn.length > 1))
  ok('F1 varje figur tickar exakt en lyssnare', f1.ut.every((x) => x.okTick))
  ok('F1 destroy() släpper tickern', f1.efter === f1.fore, `${f1.fore} → ${f1.efter}`)
  ok('F1 riven vy utan destroy() städar själv', f1.sjalv === f1.med - 1, `${f1.med} → ${f1.sjalv}`)
  await hem()

  // ---- G*: spelen ---------------------------------------------------------------------------
  const kolla = {
    vippbradan: (g, m) => m.arEgen(g._kar),
    glasstornet: (g, m) => m.arEgen(g._kar),
    studsbollar: (g) => !!g._egenFang,
    ballonglyft: (g, m, ctx) => { g._openPackage(ctx); return !!g._egenFig },
    'titt-ut-pappa': (g) => (g._platser || []).some((p) => p.kompis?.egen),
    popcornkalaset: (g) => (g._gaster || []).some((x) => !!x.egen),
  }
  if (BILD) mkdirSync('.test-shots', { recursive: true })
  for (const id of Object.keys(kolla)) {
    await page.evaluate(async (mod) => (await import(mod)).glomSessionen(), MOD)
    const fore = konsol.length
    await ga(id)
    const forsta = await page.evaluate(async ({ mod, id, src }) => {
      const m = await import(mod)
      const g = window.__barnspel.game
      // eslint-disable-next-line no-new-func
      const f = new Function('g', 'm', 'ctx', `return (${src})(g, m, ctx)`)
      return f(g, m, window.__barnspel.ctx)
    }, { mod: MOD, id, src: kolla[id].toString() })
    if (id === 'titt-ut-pappa') {
      // Hitta barnets figur: öppna dess gömställe.
      await page.evaluate(() => {
        const g = window.__barnspel.game
        const p = g._platser.find((x) => x.kompis?.egen)
        if (p) g._hittaKompis(window.__barnspel.ctx, p)
      })
    }
    await vanta(2200)
    if (BILD) await page.screenshot({ path: `.test-shots/egna-${id}.png` })
    ok(`G ${id}: barnets figur står där på första omgången`, forsta === true)
    await hem()
    await ga(id)
    const andra = await page.evaluate(async ({ mod, src }) => {
      const m = await import(mod)
      const g = window.__barnspel.game
      const f = new Function('g', 'm', 'ctx', `return (${src})(g, m, ctx)`)
      return f(g, m, window.__barnspel.ctx)
    }, { mod: MOD, src: kolla[id].toString() })
    ok(`G ${id}: INTE på nästa (takten: spelets egen)`, andra === false)
    // Tredje besöket: barnets igen — och lämna MITT i (ingen väntan) för exit-säkerheten.
    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await vanta(150)
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
    await vanta(350)
    await hem()
    await vanta(800)
    const nya = konsol.slice(fore)
    ok(`G ${id}: 0 konsolfel över tre besök`, nya.length === 0, nya.slice(0, 3).join(' | '))
  }
} finally {
  await browser.close()
}

console.log(rader.join('\n'))
console.log(fel ? `\n✗ ${fel} armar föll` : '\n✓ alla armar gröna')
process.exit(fel ? 1 : 0)
