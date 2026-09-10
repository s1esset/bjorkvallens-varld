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
//
//   node scripts/_knyttlyftprobe.mjs [--bara I,B9,K]
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

// =================================================================== I: identiteten
if (kor('I')) {
  const src = execSync(`git show ${BAS}:src/games/unika-knytt/dna.js`, { encoding: 'utf8' })
  const GAMMAL = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'))
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

// =================================================================== webbläsarfamiljerna
if (kor('B9') || kor('K')) {
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
