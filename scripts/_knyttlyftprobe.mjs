// unika-knytt — POLERINGSRUNDAN 2026-09-10 (ägarens sex steg), i tal.
//
// Familjerna fylls på steg för steg. Varje familj bär sin KONTROLLARM först, och varje ny
// familj körs mot koden FÖRE sin ändring innan den får räknas som bevis (CLAUDE.md: en sond
// som inte kan skilja två kända lägen åt mäter ingenting).
//
//   I   node  identiteten: `dnaFromSeed` ger byte-identiska individer mot utgångsläget
//             (BAS nedan) för varje recept utan generation — regel 1 i dna.js, "ordningen på
//             dragen är identitet". Kontrollarmen visar att jämförelsen KAN se en skillnad.
//   B9  bodens träffytor håller P0-avståndet (24 px) med ÅTTA skyltar — Alla + sex världar
//             + Skimmer. Före steg 1: pil ▼ och dörren 20 px isär, åttonde skylten 16 px
//             ovanför pil ▲ (uppmätt i koden, inte i en sond — därför den här familjen).
//   K   kupans blobb lovar knyttets färg: kupans nyans mot knyttets över 40 frön per recept.
//             Före steg 1 räknade kupan `h + vinkelDiff·0,2` medan dna.js klampar ±8°, och
//             gul i vattenvärlden blev ~76° i kupan men ~54° på knyttet.
//   R   Ljudtratten (steg 2). Node: R0 en åttafältspost läses EXAKT som förut (generation 0,
//             plats 5 ignoreras — den bar `_fro % 5` i leverans 1) · R4 kronan: aldrig i
//             generation 0 (kontroll), ~8 % i generation 1. Webbläsare: R5 harnessens tryck
//             (800,600) når tratten · R1 fem tryck = fem OLIKA melodier, var och en exakt det
//             motiv knyttet får · R3 noterna når kupan · R6 en gammal post migreras till nio
//             fält · R2 knyttet som föds sjunger barnets melodi och posten bär r + generation.
//   S   Skrället (steg 3). Besöken tvingas med spelets EGEN timer (`_skrallT = 0`) — vägen dit
//             är en genväg, men besöket självt är spelets. S8 nådtiden 12 s vid montering ·
//             S0 KONTROLL: inget att sno → ingen kommer · S1 en sak i kupan → den snor den, och
//             världsvalet står kvar · S2 petad → saken tillbaka + beröm · S3 nästa besök tar den
//             ANDRA axeln · S4 ignorerad 7 s → lämnar tillbaka själv · S6 KONTROLL: under
//             ceremonin kommer ingen · S5 spaken medan den håller → sugs in, knyttet får tofs
//             (dna, rigg och flagga bit 4) · S7 exit mitt i ett besök (felen räknas i exit-armen).
//   O   ögonen efter födseln — fyndet i steg 3:s bildgranskning: det nyfödda knyttet stod på
//             bänken med två VITA ögon utan pupill, och `_blick` var NaN. Ceremonin studsar in
//             knyttets hållare med `bounceIn`, som sätter scale 0, och `toLocal` genom en förälder
//             med skala 0 ger NaN — som `naerma()` sedan bär vidare för alltid. O0 KONTROLL: ett
//             hyllknytt (aldrig genom bounceIn) · O1 ett nyfött knytt med fingret över skärmen.
//
//   node scripts/_knyttlyftprobe.mjs [--bara I,B9,K,R,S,O]
//
// ⚠️ Kör ALDRIG bredvid en annan webbläsarsond eller `npm run test:all`.
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import * as NY from '../src/games/unika-knytt/dna.js'

const ID = 'unika-knytt'
// Utgångsläget för hela rundan — commiten före steg 1. Identiteten mäts mot DEN, inte mot
// HEAD, så att en glidning i steg 2 inte kan gömma sig bakom att steg 1 redan committats.
const BAS = '0da98f6'
const arg = process.argv.slice(2)
const BARA = arg.includes('--bara') ? new Set(arg[arg.indexOf('--bara') + 1].split(',')) : null
const kor = (fam) => !BARA || BARA.has(fam)
const rader = []
const arm = (namn, varde, ok) => rader.push([namn, String(varde), !!ok])

// Jämför bara de nycklar utgångsläget HADE: nya fält (generation, tofs …) får tillkomma,
// men inget gammalt fält får byta värde.
function likadan(gammal, ny) {
  if (gammal === null || typeof gammal !== 'object') return Object.is(gammal, ny)
  if (ny === null || typeof ny !== 'object') return false
  for (const k of Object.keys(gammal)) if (!likadan(gammal[k], ny[k])) return false
  return true
}

const src = execSync(`git show ${BAS}:src/games/unika-knytt/dna.js`, { encoding: 'utf8' })
const GAMMAL = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'))

// =================================================================== I: identiteten
if (kor('I')) {
  const RECEPT = [
    {}, { f: 2, v: 1 }, { f: 7, z: 3, m: 5, v: 5, g: 3 }, { f: 0, z: 0, m: 0, v: 3, g: 0 },
    { f: 9, z: 2, m: 4, v: 4, g: 2, t: 3 }, { f: 5, v: 2, m: 2, r: 4 },
  ]
  const rnd = NY.mulberry32(0x5eed)
  let olika = 0
  let granne = 0
  let n = 0
  for (let i = 0; i < 2000; i++) {
    const fro = NY.slumpFro(rnd)
    for (const r of RECEPT) {
      n++
      if (!likadan(GAMMAL.dnaFromSeed(fro, r), NY.dnaFromSeed(fro, r))) olika++
      if (!likadan(GAMMAL.dnaFromSeed(fro, r), NY.dnaFromSeed((fro ^ 1) >>> 0, r))) granne++
    }
  }
  arm('I0 kontroll  grannfröet ger en ANNAN individ', `${granne} av ${n} olika`, granne === n)
  arm(`I1 matarm    utan generation: identisk mot ${BAS}`, `${olika} olika av ${n}`, olika === 0)
}

// =================================================================== R (node-delen)
if (kor('R')) {
  const har = typeof NY.dnaFranPost === 'function' && typeof NY.GEN_NU === 'number'
  // R0 KONTROLL: en post skriven FÖRE steg 2 (åtta fält, ingen generation) ska ge exakt den
  // individ den alltid gett. Plats 5 bär här `_fro % 5` — det leverans 1 skrev (docens §9 B5)
  // och som genetiken aldrig läste. Läser generation 0 plats 5 byter gamla knytt melodi.
  let r0 = 'dnaFranPost saknas'
  let r0ok = false
  if (har) {
    let olika = 0
    const rnd = NY.mulberry32(77)
    for (let i = 0; i < 3000; i++) {
      const fro = NY.slumpFro(rnd)
      const post = [fro, i % 10, i % 4, i % 6, i % 6, fro % 5, i % 4, i % 4]
      const gammal = GAMMAL.dnaFromSeed(fro, { f: post[1], z: post[2], m: post[3], v: post[4], g: post[6], t: post[7] })
      if (!likadan(gammal, NY.dnaFranPost(post))) olika++
    }
    r0 = `${olika} olika av 3000`
    r0ok = olika === 0
  }
  arm('R0 kontroll  en åttafältspost läses som förut', r0, r0ok)

  // R4: kronan. Generation 0 får den ALDRIG (§5: 20 000 frön gav [12367, 4834, 2799, 0]) —
  // det är kontrollarmen, och den ska hålla i båda armarna. Generation 1 ska ge ~8 %.
  const hornFord = (gen) => {
    const c = [0, 0, 0, 0]
    const rnd = NY.mulberry32(99)
    for (let i = 0; i < 20000; i++) c[NY.dnaFromSeed(NY.slumpFro(rnd), { gen }).horn]++
    return c
  }
  const h0 = hornFord(0)
  const h1 = hornFord(1)
  arm('R4 kontroll  generation 0: kronan aldrig', h0.join(' / '), h0[3] === 0)
  arm('R4b matarm   generation 1: kronan finns (~8 %)', `${h1.join(' / ')} → krona ${((100 * h1[3]) / 20000).toFixed(1)} %`, h1[3] > 1200 && h1[3] < 2000)
}

// =================================================================== webbläsarfamiljerna
if (kor('B9') || kor('K') || kor('R') || kor('S') || kor('O')) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    const errors = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
    page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(900)

    /** In i spelet med en påhittad sparpost (SaveService flushar vid pagehide — rensa via ctx). */
    const besok = async (lista) => {
      await page.evaluate((l) => {
        const dag = Math.floor(Date.now() / 86400000)
        window.__barnspel.ctx.progress.setCustom('knytt', { v: 2, lista: l, n: l.length, firad: 99, dag, torka: 0, fram: 0 })
      }, lista)
      await page.evaluate(() => window.__barnspel.nav.go('library'))
      await page.waitForTimeout(400)
      await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
      await page.waitForTimeout(1500)
    }
    const geo = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      const r = c.getBoundingClientRect()
      const s = Math.min(r.width / 1280, r.height / 720)
      return { x0: r.left + (r.width - 1280 * s) / 2, y0: r.top + (r.height - 720 * s) / 2, s }
    })
    const X = (x) => geo.x0 + x * geo.s
    const Y = (y) => geo.y0 + y * geo.s
    const klick = (x, y) => page.mouse.click(X(x), Y(y))

    // ================================================================= B9 bodens avstånd
    if (kor('B9')) {
      // 13 poster: alla sex världar + två skimrande → åtta skyltar, fyra plan (rullbar, så
      // pilarna syns). Posterna är [fro, f, z, m, v, r, g, t].
      const POSTER = []
      for (let i = 0; i < 13; i++) POSTER.push([7000 + i, i % 8, i % 3, i % 4, i % 6, 0, 0, i === 3 || i === 9 ? 2 : 0])
      await besok(POSTER)
      await klick(1160, 612)
      await page.waitForTimeout(800)
      const b9 = await page.evaluate(() => {
        const g = window.__barnspel.game
        const rot = g._rot
        const b = g._boden
        const synlig = (n) => { for (let p = n; p; p = p.parent) if (!p.visible) return false; return true }
        const ytor = []
        const gå = (n) => {
          for (const c of n.children || []) {
            const h = c.hitArea
            if (h && c.eventMode === 'static' && synlig(c) && Number.isFinite(h.width)) {
              const a = rot.toLocal(c.toGlobal({ x: h.x, y: h.y }))
              const z = rot.toLocal(c.toGlobal({ x: h.x + h.width, y: h.y + h.height }))
              const r = { x0: Math.min(a.x, z.x), y0: Math.min(a.y, z.y), x1: Math.max(a.x, z.x), y1: Math.max(a.y, z.y) }
              const cy = (r.y0 + r.y1) / 2
              // Bon i plan som ligger under rullytans kant är maskade bort — bara det som syns.
              if (cy < 720) ytor.push({ ...r, namn: `${Math.round((r.x0 + r.x1) / 2)},${Math.round(cy)}` })
            }
            gå(c)
          }
        }
        gå(b.view)
        let min = Infinity
        let par = ''
        for (let i = 0; i < ytor.length; i++) {
          for (let j = i + 1; j < ytor.length; j++) {
            const p = ytor[i]
            const q = ytor[j]
            const dx = Math.max(p.x0, q.x0) - Math.min(p.x1, q.x1)
            const dy = Math.max(p.y0, q.y0) - Math.min(p.y1, q.y1)
            // En lucka på EN axel är en lucka (§1b) — avståndet är den STÖRRE av de två.
            const d = Math.max(dx, dy)
            if (d < min) { min = d; par = `${p.namn} ↔ ${q.namn}` }
          }
        }
        return { flikar: b.flikar.length, rullbar: b.rullbar, ytor: ytor.length, min: Math.round(min), par }
      })
      rader.push(['B9 kontroll  åtta skyltar och pilarna syns', `flikar ${b9.flikar} · rullbar ${b9.rullbar} · ${b9.ytor} träffytor`, b9.flikar === 8 && b9.rullbar === true])
      rader.push(['B9b matarm   minsta avstånd mellan träffytor ≥ 24', `${b9.min} px (${b9.par})`, b9.min >= 24])
      await page.mouse.move(X(40), Y(400))
      await page.screenshot({ path: '.test-shots/knytt-bod-atta.png' })
      await klick(1160, 630) // dörren
      await page.waitForTimeout(400)
    }

    // ================================================================= K kupans färglöfte
    if (kor('K')) {
      await besok([])
      const k = await page.evaluate(async () => {
        const g = window.__barnspel.game
        const dna = await import('/src/games/unika-knytt/dna.js')
        const hue = (c) => {
          const r = ((c >> 16) & 255) / 255
          const gg = ((c >> 8) & 255) / 255
          const b = (c & 255) / 255
          const mx = Math.max(r, gg, b)
          const mn = Math.min(r, gg, b)
          if (mx === mn) return 0
          const d = mx - mn
          let h = mx === r ? ((gg - b) / d) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4
          return (h * 60 + 360) % 360
        }
        const dh = (a, b) => Math.abs(((b - a + 540) % 360) - 180)
        const rnd = dna.mulberry32(0xc0ffee)
        const ut = []
        for (const [namn, f, v] of [['gron/skog', 4, 0], ['gul/vatten', 2, 1], ['rod/natt', 0, 3], ['lila/oken', 7, 4], ['turkos/sno', 5, 2], ['orange/grotta', 1, 5]]) {
          g._kupa.setVal({ ...g._val, f, v })
          const kp = g._kupa.palett
          const hk = hue(kp.bas)
          let max = 0
          for (let i = 0; i < 40; i++) {
            const d = dna.dnaFromSeed(dna.slumpFro(rnd), { f, v, z: 1, m: 0, g: 0 })
            max = Math.max(max, dh(hk, hue(d.palett.bas)))
          }
          ut.push({ namn, hk: Math.round(hk), max: +max.toFixed(1) })
        }
        g._kupa.setVal(g._val) // tillbaka till spelets eget recept
        return ut
      })
      const kontroll = k.find((x) => x.namn === 'gron/skog')
      const matt = k.filter((x) => x.namn !== 'gron/skog')
      const varst = matt.reduce((a, b) => (b.max > a.max ? b : a), matt[0])
      // Kontrollen: grönt i skogen ligger nära världens egen nyans — där är den gamla och den
      // nya formeln ense (±5°). Faller den här mäter K1 något annat än formeln.
      rader.push(['K0 kontroll  grön i skogen: formlerna ense', `kupa ${kontroll.hk}° · största avvikelse ${kontroll.max}°`, kontroll.max <= 5])
      rader.push(['K1 matarm    kupans nyans = knyttets (≤ 3,5°)', `${matt.map((x) => `${x.namn} ${x.max}°`).join(' · ')} — värst ${varst.namn}`, matt.every((x) => x.max <= 3.5)])
    }

    // ================================================================= R Ljudtratten
    if (kor('R')) {
      // R6 först: en post skriven FÖRE steg 2 har åtta fält. Den ska läsas in som nio, med
      // generation 0 — annars kastar `_rensaPost` den (längdkontrollen) och barnet förlorar ett knytt.
      await besok([[4242, 1, 1, 1, 1, 3, 0, 0]])
      const r6 = await page.evaluate(() => {
        const p = window.__barnspel.game._alla?.[0]
        return p ? { langd: p.length, flagga: p[8] } : null
      })
      rader.push(['R6 matarm    en åttafältspost migreras till nio', r6 ? `längd ${r6.langd} · flagga ${r6.flagga}` : 'posten kastades', !!r6 && r6.langd === 9 && r6.flagga === 0])

      await page.evaluate(() => {
        const a = window.__barnspel.audio
        if (!a.__lyft) {
          const t = a.tone.bind(a)
          a.tone = (o) => { window.__toner?.push(o?.freq | 0); return t(o) }
          a.__lyft = true
        }
        window.__toner = []
      })
      /** Finns melodin `m` som en DELSEKVENS i tonerna (i ordning, andra toner får ligga emellan)? */
      const innehaller = (toner, m) => {
        if (!Array.isArray(m) || !m.length) return false
        let j = 0
        for (const f of toner) if (Math.abs(f - m[j]) <= 1 && ++j === m.length) return true
        return false
      }
      const tryck = async (x, y) => {
        await page.evaluate(() => { window.__toner.length = 0 })
        const fore = await page.evaluate(() => window.__barnspel.game._val.r)
        await klick(x, y)
        await page.waitForTimeout(1300)
        return page.evaluate(async (fore) => {
          const g = window.__barnspel.game
          const dna = await import('/src/games/unika-knytt/dna.js')
          const vantat = typeof dna.GEN_NU === 'number' ? dna.dnaFromSeed(g._fro, { ...g._val, gen: dna.GEN_NU }).motiv : null
          return { fore, r: g._val.r, vantat, toner: window.__toner.slice(), noter: g._kupa?.noter ?? -1 }
        }, fore)
      }

      // R5: harnessens eget tryck (800,600) — det som `npm run test` gör — ska nå tratten.
      const r5 = await tryck(800, 600)
      rader.push(['R5 matarm    harnessens (800,600) når tratten', `r ${r5.fore} → ${r5.r}`, Number.isFinite(r5.r) && r5.r === ((r5.fore ?? -9) + 1) % 5])

      // R1: fyra tryck till — alla fem melodier, var och en EXAKT det motiv knyttet får.
      const res = [r5]
      for (let i = 0; i < 4; i++) res.push(await tryck(800, 630))
      const hittade = res.filter((x) => innehaller(x.toner, x.vantat)).length
      const unika = new Set(res.map((x) => (x.vantat || []).join('-'))).size
      rader.push(['R1 matarm    fem tryck = fem olika melodier', `${unika} unika · ${hittade}/5 spelade exakt knyttets motiv · r ${res.map((x) => x.r).join('→')}`, unika === 5 && hittade === 5])
      const noter = res[res.length - 1].noter
      rader.push(['R3 matarm    noterna når kupan', `${noter} noter framme (fem melodier × 4)`, noter >= 20])

      // R2: en hel runda. Barnets val ställs så det SKILJER sig från det fröet hade gett, annars
      // kan en slump (1 på 5) göra armen grön utan att valet betytt något.
      const mal = await page.evaluate(async () => {
        const g = window.__barnspel.game
        const dna = await import('/src/games/unika-knytt/dna.js')
        return (dna.dnaFromSeed(g._fro, {}).val.r + 2) % 5
      })
      for (let i = 0; i < 5; i++) {
        const nu = await page.evaluate(() => window.__barnspel.game._val.r)
        if (nu === mal) break
        await klick(800, 630)
        await page.waitForTimeout(250)
      }
      const fore2 = await page.evaluate(async () => {
        const g = window.__barnspel.game
        const dna = await import('/src/games/unika-knytt/dna.js')
        return {
          r: g._val.r,
          vald: typeof dna.GEN_NU === 'number' ? dna.dnaFromSeed(g._fro, { ...g._val, gen: dna.GEN_NU }).motiv.join('-') : '',
          frosMotiv: dna.dnaFromSeed(g._fro, { ...g._val }).motiv.join('-'),
        }
      })
      await klick(1160, 350)
      await page.waitForFunction(() => window.__barnspel.game._fas === 'klacka', null, { timeout: 20000 })
      for (let i = 0; i < 4; i++) { await klick(640, 470); await page.waitForTimeout(260) }
      await page.waitForFunction(() => window.__barnspel.game._klar === true, null, { timeout: 20000 })
      const fodd = await page.evaluate(() => window.__barnspel.game._dna?.motiv?.join('-') || '')
      await page.waitForFunction(() => !!window.__barnspel.game._knyttYta, null, { timeout: 20000 })
      await klick(1160, 350)
      await page.waitForFunction(() => window.__barnspel.game._fas === 'bygga', null, { timeout: 20000 })
      await page.waitForTimeout(300)
      const post = await page.evaluate(() => {
        const l = window.__barnspel.ctx.progress.get()?.custom?.knytt?.lista || []
        return l[l.length - 1] || []
      })
      rader.push([
        'R2 matarm    knyttet sjunger barnets melodi',
        `valt r ${fore2.r} · fött ${fodd} · valt ${fore2.vald} · fröets ${fore2.frosMotiv} · post[5] ${post[5]} · flagga ${post[8]}`,
        fodd === fore2.vald && fodd !== fore2.frosMotiv && post[5] === fore2.r && ((post[8] ?? 0) & 15) === 1,
      ])
    }

    // ================================================================= S Skrället
    if (kor('S')) {
      await besok([])
      await page.evaluate(() => {
        const v = window.__barnspel.voice
        if (!v.__lyftSagt) {
          const s = v.say.bind(v)
          v.say = (t, o) => { window.__sagt?.push(String(t)); return s(t, o) }
          v.__lyftSagt = true
        }
        window.__sagt = []
      })
      const lasS = () => page.evaluate(() => {
        const g = window.__barnspel.game
        return {
          lage: g._skrall?.lage ?? '(inget skrälle)', sak: g._skrall?.sak ?? null, t: g._skrallT,
          props: g._kupa?.antalProps?.() ?? -1, gn: g._val.g, v: g._val.v, fas: g._fas, sagt: window.__sagt.slice(),
        }
      })
      const tvinga = () => page.evaluate(() => { window.__barnspel.game._skrallT = 0 })
      const haller = () => page.waitForFunction(() => window.__barnspel.game._skrall?.haller === true, null, { timeout: 8000 }).catch(() => {})
      const borta = () => page.waitForFunction(() => window.__barnspel.game._skrall?.lage === 'borta', null, { timeout: 6000 }).catch(() => {})

      const s8 = await lasS()
      rader.push(['S8 bokföring nådtiden vid montering (12 s)', `skrallT ${Number.isFinite(s8.t) ? s8.t.toFixed(1) : s8.t}`, Number.isFinite(s8.t) && s8.t > 9 && s8.t <= 12])

      // S0 KONTROLL: tom kupa, inga gnistor — ingenting att sno, så ingen får komma.
      await tvinga()
      await page.waitForTimeout(1200)
      const s0 = await lasS()
      rader.push(['S0 kontroll  inget att sno → ingen kommer', `läge ${s0.lage} · props ${s0.props} · g ${s0.gn}`, s0.lage === 'borta'])

      // S1: väderveven lägger in ett föremål; sedan > 1,5 s stilla innan besöket tvingas.
      await klick(480, 630)
      await page.waitForTimeout(2200)
      const fore1 = await lasS()
      await page.evaluate(() => { window.__sagt.length = 0 })
      await tvinga()
      await haller()
      const s1 = await lasS()
      rader.push(['S1 matarm    en sak i kupan → Skrället snor den', `läge ${s1.lage} · sak ${s1.sak} · props ${fore1.props} → ${s1.props} · värld ${fore1.v} → ${s1.v}`, s1.lage === 'sitter' && s1.sak === 'prop' && s1.props === fore1.props - 1 && s1.v === fore1.v])
      rader.push(['S1b          narratorn säger vad som hänt', s1.sagt.join(' | ').slice(0, 70) || '(tyst)', s1.sagt.includes('Oj, Skrället tog en sak! Peta på den.')])

      // S2: ETT tryck på Skrället.
      await page.evaluate(() => { window.__sagt.length = 0 })
      await klick(620, 210)
      await page.waitForTimeout(1800)
      const s2 = await lasS()
      // Kräver att stölden FAKTISKT skedde (S1): kontrollkörningen mot koden utan Skrället gav
      // annars grönt på "props −1 = −1" — en arm som är grön för att den inte mätte.
      rader.push(['S2 matarm    petad → saken tillbaka, den går', `läge ${s2.lage} · props ${s2.props} (före stölden ${fore1.props})`, s1.sak === 'prop' && s2.props === fore1.props && s2.props >= 1 && s2.lage !== 'sitter'])
      rader.push(['S2b          beröm för att den lämnade tillbaka', s2.sagt.join(' | ').slice(0, 70) || '(tyst)', s2.sagt.includes('Bra jobbat, Skrället lämnade tillbaka den.')])

      // S3: nu finns både ett föremål och en gnista — förra besöket tog ett föremål.
      await borta()
      await klick(950, 250)
      await page.waitForTimeout(2200)
      const fore3 = await lasS()
      await tvinga()
      await haller()
      const s3 = await lasS()
      rader.push(['S3 matarm    nästa besök tar den ANDRA axeln', `sak ${s3.sak} (förra: prop) · g ${fore3.gn} → ${s3.gn} · props ${fore3.props} → ${s3.props}`, s3.sak === 'gnista' && s3.gn === fore3.gn - 1 && s3.props === fore3.props])

      // S4: ingen rör den — efter 7 s lämnar den tillbaka själv.
      await page.waitForTimeout(8000)
      const s4 = await lasS()
      // Samma vakt som S2: utan en verklig stöld i S3 var "g 1 = 1" grönt mot kod utan Skrället.
      rader.push(['S4 matarm    ignorerad 7 s → lämnar tillbaka själv', `läge ${s4.lage} · g ${s4.gn} (före stölden ${fore3.gn})`, s3.sak === 'gnista' && s3.gn === fore3.gn - 1 && s4.gn === fore3.gn && s4.lage !== 'sitter'])

      // S5: spaken medan den håller något.
      await borta()
      await tvinga()
      await haller()
      const fore5 = await lasS()
      await klick(1160, 350)
      await page.waitForTimeout(300)
      const s5a = await lasS()
      // S6 KONTROLL: under ceremonin får ingen komma, hur timern än står.
      await tvinga()
      await page.waitForFunction(() => window.__barnspel.game._fas === 'klacka', null, { timeout: 20000 }).catch(() => {})
      const s6 = await lasS()
      rader.push(['S6 kontroll  under ceremonin kommer ingen', `läge ${s6.lage} · fas ${s6.fas}`, s6.lage === 'borta' && s6.fas === 'klacka'])
      for (let i = 0; i < 4; i++) { await klick(640, 470); await page.waitForTimeout(260) }
      await page.waitForFunction(() => window.__barnspel.game._klar === true, null, { timeout: 20000 }).catch(() => {})
      const tofs = await page.evaluate(() => ({ dna: window.__barnspel.game._dna?.tofs, rigg: window.__barnspel.game._knytt?.tofs }))
      await page.waitForFunction(() => !!window.__barnspel.game._knyttYta, null, { timeout: 20000 }).catch(() => {})
      await page.mouse.move(X(200), Y(120))
      await page.waitForTimeout(200)
      await page.screenshot({ path: '.test-shots/knytt-tofs.png' })
      await klick(1160, 350)
      await page.waitForFunction(() => window.__barnspel.game._fas === 'bygga', null, { timeout: 20000 }).catch(() => {})
      const post = await page.evaluate(() => { const l = window.__barnspel.ctx.progress.get()?.custom?.knytt?.lista || []; return l[l.length - 1] || [] })
      rader.push([
        'S5 matarm    spaken medan den håller → sugs in, tofs',
        `läge ${fore5.lage} → ${s5a.lage} · dna.tofs ${tofs.dna} · riggen ${tofs.rigg} · flagga ${post[8]}`,
        fore5.lage === 'sitter' && s5a.lage === 'sugs' && tofs.dna === 1 && tofs.rigg === true && ((post[8] ?? 0) & 16) === 16,
      ])

      // S7: exit MITT i ett besök. Felen räknas i den gemensamma exit-armen nedan.
      await klick(480, 630)
      await page.waitForTimeout(2200)
      await tvinga()
      await page.waitForTimeout(700)
      const s7 = await lasS()
      rader.push(['S7           exit mitt i ett besök (läge vid exit)', s7.lage, s7.lage === 'kommer' || s7.lage === 'sitter'])
    }

    // ================================================================= O ögonen efter födseln
    if (kor('O')) {
      await besok([[4243, 2, 1, 1, 0, 0, 0, 0, 1]])
      const blickAv = (vag) => page.evaluate((vag) => {
        const g = window.__barnspel.game
        const k = vag === 'hylla' ? g._bon.find((b) => b.knytt)?.knytt : g._knytt
        const o = k?._ogon?.[0]
        // NaN blir null i JSON — och `Number.isFinite(null)` är falskt, precis som för NaN.
        return k ? { x: k._blick.x, y: k._blick.y, px: o?.pup.position.x, py: o?.pup.position.y } : null
      }, vag)
      const ok = (o) => !!o && [o.x, o.y, o.px, o.py].every(Number.isFinite)
      const txt = (o) => (o ? `blick ${o.x} , ${o.y} · pupill ${o.px} , ${o.py}` : 'inget knytt')

      // O0 KONTROLL: hyllans knytt byggs av `_ritaHylla` och passerar aldrig ceremonins bounceIn.
      const o0 = await blickAv('hylla')
      rader.push(['O0 kontroll  hyllans knytt: blicken ändlig', txt(o0), ok(o0)])

      // O1: en födsel med fingret ÖVER skärmen och i rörelse, som ett barns — det är just då
      // ceremonin räknar om pekaren genom hållaren medan bounceIn står på skala 0.
      await page.mouse.move(X(900), Y(300))
      await klick(1160, 350)
      await page.waitForFunction(() => window.__barnspel.game._fas === 'klacka', null, { timeout: 20000 })
      for (let i = 0; i < 4; i++) { await klick(640, 470); await page.waitForTimeout(260) }
      for (let i = 0; i < 14; i++) { await page.mouse.move(X(900 + (i % 2) * 24), Y(300)); await page.waitForTimeout(100) }
      await page.waitForFunction(() => !!window.__barnspel.game._knyttYta, null, { timeout: 20000 })
      await page.waitForTimeout(1400)
      const o1 = await blickAv('fodd')
      rader.push(['O1 matarm    nyfött knytt: blicken ändlig, pupillen syns', txt(o1), ok(o1)])
      await page.screenshot({ path: '.test-shots/knytt-ogon-bank.png', clip: { x: X(700), y: Y(300), width: 200 * geo.s, height: 200 * geo.s } })
      await klick(1160, 350)
      await page.waitForFunction(() => window.__barnspel.game._fas === 'bygga', null, { timeout: 20000 })
    }

    await page.evaluate(() => window.__barnspel.nav.go('library'))
    await page.waitForTimeout(600)
    rader.push(['exit         inga konsolfel', `${errors.length} fel`, errors.length === 0])
    if (errors.length) for (const e of errors.slice(0, 4)) rader.push([`   ${e}`, '', false])
  } finally {
    await browser.close()
  }
}

let fel = 0
console.log('\n  unika-knytt — poleringsrundan 2026-09-10\n')
for (const [namn, varde, ok] of rader) {
  if (!ok) fel++
  console.log(`  ${ok ? '✓' : '✗'} ${namn.padEnd(48)} ${varde}`)
}
console.log(`\n  ${fel === 0 ? '✓ alla armar som väntat' : `✗ ${fel} arm(ar) fel`}\n`)
process.exit(fel === 0 ? 0 : 1)
