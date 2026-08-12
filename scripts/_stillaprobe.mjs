// STÅR SPELET STILLA när barnet inte gör något? Ett urvalssåll för N10.
//
// Bakgrund: `_livprobe` räknar noder som bär en `feedback.liv()`-tween och rapporterade
// **0** på sex spel i rad. Det lästes först som "sex döda spel" — men fem av dem har egen
// vilorörelse i sin egen ticker (`Math.sin`, `breathe()`). `_livprobe` mäter alltså
// MEKANISMEN, inte FENOMENET. Den här sonden mäter fenomenet: den läser varje nods
// VÄRLDSLÄGE varje bildruta och räknar hur många som faktiskt rör sig.
//
//   noder      hur många noder scenen har (spelets egen `ctx.stage`, inte skalet)
//   intro      hur många som rör sig i ett TIDIGT fönster (1,6–3,0 s) — mest inflygning
//   vila       hur många som rör sig i ett SENT fönster (4,5–5,9 s) = svaret
//   max        största utslaget hos en enskild nod i vilofönstret
//
// TRE saker gör den ärlig:
//   * Den läser `ctx.stage`, alltså SPELETS egen rot — skalets bakknapp och det DELADE
//     `fxLayer` (badets bubblor, parkerade partiklar) räknas inte med.
//   * Två fönster. Ett tidigt fönster mäter mest spelets INFLYGNING: `vart-tog-det-vagen`
//     såg ut att vara scenens livligaste spel (62 %, 480 px) — det var blandningen av
//     kopparna, inte vilorörelse. Bara det sena fönstret svarar på frågan.
//   * Det sena fönstret slutar före 6 s, så spelets egen idle-hjälp aldrig hinner måla
//     något som skulle läsas som "liv".
//
// ⚠️ BEGRÄNSNING — läs den innan du tror på en enskild rad. Vilofönstret är ETT STICKPROV
// på 1,4 s. Spel med EPISODISK vilorörelse (en nick var tredje sekund) läses helt olika
// beroende på fas: `tarta-i-ansiktet` mätte **1,0 px** i ett svep och **34,4 px** i nästa,
// `kittla-figuren` 4,3 → 36,3 px. Bara ett tal som är **0 i flera svep** är ett fynd.
// Kolumnen `VILA` (hur många noder) är dessutom det ointressanta talet — `storsta utslag`
// är det som avgör om något SYNS. 40 % av noderna som rör sig 1 px är ett tableau.
//
//   node scripts/_stillaprobe.mjs [id ...]        # utan argument: hela registret
import { chromium } from 'playwright'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TROSKEL = 0.5 // px i världen — under det är det avrundningsbrus
const TIDIGT = [1600, 3000] // inflygningsfönster (ms efter mount)
const SENT = [4500, 5900] // vilofönster — måste sluta före idle-hjälpens 6 s

let ids = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (!ids.length) {
  const reg = readFileSync(join(ROOT, 'src/games/registry.js'), 'utf8')
  ids = [...reg.matchAll(/from\s+'\.\/([^/]+)\/index\.js'/g)].map((m) => m[1])
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', () => {})
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('pwagames')) localStorage.removeItem(k)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  for (const id of ids) {
    let rad = { id, noder: 0, rorliga: 0, max: 0, fel: null }
    try {
      await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), id)
      // VÄNTA PÅ ATT SPELET FAKTISKT ÄR MONTERAT. En fast paus räckte inte: från och med
      // spel nummer två låg `__barnspel.ctx` kvar från den FÖRRA omgången med en riven
      // `stage`, och sonden rapporterade "ingen ctx.stage" på 7 av 8 spel. En sond som
      // mäter fel scen är tyst fel — den ser bara ut som ett resultat.
      await page.waitForFunction(
        (gid) => window.__barnspel.game?.id === gid && window.__barnspel.ctx?.stage && !window.__barnspel.ctx.stage.destroyed,
        id, { timeout: 20000 })
      rad = { id, ...(await page.evaluate(async ({ troskel, tidigt, sent }) => {
        const stage = window.__barnspel.ctx?.stage
        if (!stage || stage.destroyed) return { noder: 0, rorliga: 0, max: 0, fel: 'ingen ctx.stage' }
        const noder = []
        const gata = (n) => {
          if (!n || n.destroyed) return
          noder.push(n)
          for (const c of n.children || []) gata(c)
        }
        gata(stage)
        // Världsläge per nod: position + en punkt förskjuten i lokal x/y, så att en ren
        // ROTATION eller SKALNING också syns (en snurrande stjärna flyttar inte sin origo).
        const las = (n) => {
          const wt = n.worldTransform
          return [wt.tx, wt.ty, wt.tx + wt.a * 40 + wt.c * 40, wt.ty + wt.b * 40 + wt.d * 40]
        }
        const T0 = performance.now()
        const matFonster = async ([fran, till]) => {
          while (performance.now() - T0 < fran) await new Promise((r) => requestAnimationFrame(r))
          const min = noder.map(() => [Infinity, Infinity, Infinity, Infinity])
          const max = noder.map(() => [-Infinity, -Infinity, -Infinity, -Infinity])
          while (performance.now() - T0 < till) {
            for (let i = 0; i < noder.length; i++) {
              if (noder[i].destroyed) continue
              const v = las(noder[i])
              for (let k = 0; k < 4; k++) {
                if (v[k] < min[i][k]) min[i][k] = v[k]
                if (v[k] > max[i][k]) max[i][k] = v[k]
              }
            }
            await new Promise((r) => requestAnimationFrame(r))
          }
          let rorliga = 0
          let storst = 0
          for (let i = 0; i < noder.length; i++) {
            let d = 0
            for (let k = 0; k < 4; k++) {
              const s = max[i][k] - min[i][k]
              if (Number.isFinite(s) && s > d) d = s
            }
            if (d > troskel) rorliga++
            if (d > storst) storst = d
          }
          return { rorliga, max: +storst.toFixed(1) }
        }
        const a = await matFonster(tidigt)
        const b = await matFonster(sent)
        return { noder: noder.length, intro: a.rorliga, vila: b.rorliga, max: b.max, fel: null }
      }, { troskel: TROSKEL, tidigt: TIDIGT, sent: SENT })) }
    } catch (e) {
      rad.fel = String(e.message || e).slice(0, 60)
    }
    rader.push(rad)
    await page.evaluate(() => window.__barnspel.nav.go('library')).catch(() => {})
    await page.waitForTimeout(700) // skärmövergången är animerad
  }

  rader.sort((a, b) => (a.vila / Math.max(1, a.noder)) - (b.vila / Math.max(1, b.noder)))
  console.log(`\n  Star spelet stilla? Vilofonster ${SENT[0]}–${SENT[1]} ms, troskel ${TROSKEL} px i varlden\n`)
  console.log('  spel                          noder   intro    VILA   andel  storsta utslag')
  for (const r of rader) {
    if (r.fel) { console.log(`  ${r.id.padEnd(28)}  — ${r.fel}`); continue }
    const andel = r.noder ? (r.vila / r.noder) : 0
    const flagga = r.vila === 0 ? '  ← TABLEAU' : (andel < 0.06 ? '  ← nastan stilla' : '')
    console.log(`  ${r.id.padEnd(28)}${String(r.noder).padStart(6)}${String(r.intro).padStart(8)}${String(r.vila).padStart(8)}${(andel * 100).toFixed(0).padStart(7)}%${String(r.max).padStart(9)} px${flagga}`)
  }
  const doda = rader.filter((r) => !r.fel && r.vila === 0)
  console.log(`\n  ${doda.length} av ${rader.filter((r) => !r.fel).length} spel ror INTE en enda nod nar de lamnas ifred.\n`)
} finally {
  await browser.close()
}
