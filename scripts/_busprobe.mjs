// Ägarrapport #8–#10 + #13: vad händer med saker som spottas ut, fastnar i ansiktet
// eller ploppar av det?
//
// Varje rad har en KONTROLLARM, för de tre felen såg likadana ut utifrån ("saken är
// konstig") men hade tre olika mekanismer:
//   #8a  munnen accepterar allt, så `_resolveDrop` låser även en utspottad gaffel
//        (`placed` + `eventMode: 'none'`) och inget öppnar låset igen
//   #8b  `_ploppa` skickade geggans MINIATYR (0,62) till bänken via en syntetisk `rec`
//        som aldrig fanns i dragets register — permanent oplockbar, och fel storlek
//   #9   `Mjukkropp.knuff` flyttar `p.x/p.y` men inte `p.px/p.py`, och i verlet ÄR det
//        en fart — klicken gled 57 px ner från sin matbit och blev "en flytande skugga"
//   #13  bus-ellipsen nådde y = 518, alltså ut på skärbrädan där maten ligger
//
//   node scripts/_busprobe.mjs
import { chromium } from 'playwright'

const url = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://localhost:5173'
const ID = 'mata-munnen'

let rader = 0
let grona = 0
const fel = []
const kolla = (namn, ok, text) => {
  rader++; if (ok) grona++
  console.log(`  ${ok ? '✓' : '✗'} ${namn.padEnd(38)} ${text}`)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text()) })
page.on('pageerror', (e) => fel.push(String(e)))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })

// ---- #9 KLETENS DRIFT, med kontrollarm i samma körning ----------------------
// Ren fysik, inget spel: samma kropp och samma knuff, en gång utan `form` och en med.
// Utan kontrollarmen vore "3 px" bara ett tal — det är de 57 bredvid som gör det till
// en mätning.
const drift = await page.evaluate(async () => {
  const { makeMjukkropp } = await import('/src/lib/mjukkropp.js')
  const kor = (form) => {
    const k = makeMjukkropp({ x: 300, y: 200, w: 84, h: 44, punkter: 12, grav: 0, damp: 0.93, iter: 4, tryck: 1.04, styvhet: 0.16 })
    // ⚠️ Nollpunkten är kroppens EGEN tyngdpunkt, inte det (x, y) den bad om. Punkterna
    // läggs ut runt en ellips och medelvärdet hamnar 15 px därifrån — mäter man mot 200
    // mäter man den skillnaden, inte en drift. (Sonden hade det felet i första versionen
    // och rapporterade −15,4 px på en fix som i själva verket ger 0,0.)
    const mitt = () => k.tyngdpunkt.y
    const y0 = mitt()
    const ank = k.tyngdpunkt
    k.knuff(300, 200 - 26, 14, 90, { form })
    // Samma väg som spelet kör: steg + förankring, precis som `_mjukTick`.
    for (let i = 0; i < 120; i++) { k.steg(1); if (form) k.flyttaTill(ank.x, ank.y) }
    const ut = mitt() - y0
    // Höjden efteråt säger om VOBBELN överlevde eller om vi bara dödade effekten.
    let min = 1e9; let max = -1e9
    for (const p of k.pts) { if (p.y < min) min = p.y; if (p.y > max) max = p.y }
    k.destroy()
    return { drift: ut, h: max - min }
  }
  return { utan: kor(false), med: kor(true) }
})
kolla('#9 klet driver INTE (form: true)', Math.abs(drift.med.drift) < 3,
  `${drift.med.drift.toFixed(1)} px  ·  KONTROLL utan form: ${drift.utan.drift.toFixed(1)} px`)
kolla('#9 klicken har kvar sin form', drift.med.h > 30,
  `höjd ${drift.med.h.toFixed(0)} px (viloform 44) — kontroll ${drift.utan.h.toFixed(0)} px`)

// ---- #13 BUS-ZONEN når inte skärbrädan --------------------------------------
const zon = await page.evaluate(async () => {
  const { ANS, KANT_Y, PLATSER, BRADA } = await import('/src/games/mata-munnen/kok.js')
  return { ANS, KANT_Y, matY: PLATSER[0][1], bradaY: BRADA?.y ?? null }
})
const nerKant = zon.KANT_Y
kolla('#13 bus-zonen slutar vid ansiktets kant', nerKant <= zon.matY - 40,
  `zonens botten y=${nerKant} · maten ligger på y=${zon.matY} (förut nådde zonen 518)`)

// ---- Spelet: spotta ut och plocka upp igen ----------------------------------
await page.evaluate((id) => window.__barnspel.nav.go('game', { id }), ID)
await page.waitForTimeout(2600)

const las = () => page.evaluate(async () => {
  const g = (await import('/src/games/registry.js')).getGame('mata-munnen')
  const d = g._drag
  const post = (v) => {
    const r = d?.items?.find((it) => it.view === v)
    return r ? { placed: !!r.placed, iItems: true } : { placed: null, iItems: false }
  }
  return {
    losa: (g._losa || []).map((r) => ({
      key: r.data?.key ?? '(?)',
      s: Math.round((r.view?.scale?.x ?? 0) * 100) / 100,
      em: r.view?.eventMode,
      ...post(r.view),
    })),
    geggor: (g._geggor || []).length,
    mat: (g._mat || []).filter((r) => !r._uppaten).map((r) => ({ key: r.data.key, atbar: r.data.atbar !== false, x: Math.round(r.view.x), y: Math.round(r.view.y) })),
    mun: { x: Math.round(g._mun?.x ?? 0), y: Math.round(g._mun?.y ?? 0) },
  }
})

const drag = async (fran, till) => {
  await page.mouse.move(fran.x, fran.y)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(fran.x + (till.x - fran.x) * (i / 12), fran.y + (till.y - fran.y) * (i / 12))
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
}

// Öppna besticklådan så en OÄTLIG sak finns att mata pappa.
const lada = await page.evaluate(async () => {
  const { STATIONER } = await import('/src/games/mata-munnen/kok.js')
  const s = STATIONER.find((x) => (x.innehall || []).some((k) => ['gaffel', 'sked', 'kniv', 'slev', 'visp'].includes(k)))
  if (!s) return null
  return { x: Math.round(s.yta.x + s.yta.w / 2), y: Math.round(s.yta.y + s.yta.h / 2), id: s.id }
})
if (lada) { await page.mouse.click(lada.x, lada.y); await page.waitForTimeout(900) }

let s = await las()
const pryl = s.mat.find((m) => !m.atbar) // vad som helst oätligt — pappa spottar ut det
if (!pryl) {
  kolla('#8 hittade en oätlig pryl att mata', false, `mat på brädan: ${s.mat.map((m) => m.key).join(' ')}`)
} else {
  await drag(pryl, s.mun)
  await page.waitForTimeout(2200)
  s = await las()
  const ut = s.losa.find((l) => l.key === pryl.key)
  kolla('#8a utspottad sak går att greppa igen', !!ut && ut.placed === false && ut.em === 'static',
    ut ? `${ut.key}: placed=${ut.placed} em=${ut.em} iItems=${ut.iItems}` : 'hittades inte i _losa')
  kolla('#8a utspottad sak har rätt storlek', !!ut && Math.abs(ut.s - 1) < 0.02,
    ut ? `skala ${ut.s}` : '—')
}

// ---- #8b: kasta mat i ansiktet tills TAKET ploppar av den äldsta ------------
// Går genom spelets EGNA väg (`_miss` → `_gegga` → `GEGGA_MAX` → `_ploppa`) i stället för
// att anropa `_ploppa` med en påhittad ctx. Ett anrop förbi kodvägen mäter inte kodvägen.
const pannan = { x: zon.ANS.x, y: zon.ANS.y - 90 }
for (let i = 0; i < 8; i++) {
  s = await las()
  const bit = s.mat.find((m) => m.atbar)
  if (!bit) break
  await drag(bit, pannan)
  await page.waitForTimeout(420)
  if ((await las()).losa.some((l) => l.key !== undefined && l.s !== undefined && l.em === 'static')) { /* fortsätt */ }
}
await page.waitForTimeout(900)
s = await las()
const plopp = { hoppa: s.losa.length === 0 }

if (plopp.hoppa) {
  console.log(`  · #8b hoppades över — inget ploppade (geggor: ${s.geggor})`)
  rader++
} else {
  const sma = s.losa.filter((l) => Math.abs(l.s - 0.62) < 0.05)
  const doda = s.losa.filter((l) => !l.iItems || l.em !== 'static')
  kolla('#8b ploppad gegga har SAKENS storlek', sma.length === 0,
    `${s.losa.length} lösa, ingen i 0,62 · skalor: ${[...new Set(s.losa.map((l) => l.s))].join(' ')}`)
  kolla('#8b ploppad gegga går att greppa', doda.length === 0,
    doda.length ? `oplockbara: ${doda.map((l) => `${l.key}(em=${l.em},iItems=${l.iItems})`).join(' ')}` : `alla ${s.losa.length} är dragbara`)
}

kolla('inga konsolfel', fel.length === 0, fel.length ? fel.slice(0, 2).join(' | ') : '0')
await browser.close()
console.log(`\n  ${grona}/${rader} gröna\n`)
process.exit(grona === rader ? 0 : 1)
