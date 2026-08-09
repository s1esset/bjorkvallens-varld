// Mäter att spindel-zacke-svingar FAKTISKT fick en värld bredare än rutan, och att
// kameran (lib/kamera.js, dess första kund) beter sig — LYFTPLAN A4.4.
//
// Varför en sond och inte en skärmdump: parallax går per definition inte att bedöma i
// EN stillbild. Två lager som står still ser exakt likadana ut som två lager som rör sig
// olika fort. Det enda som skiljer dem är hur mycket de flyttar sig MELLAN två
// kameralägen, och det är ett tal.
//
// Sonden svarar på åtta saker:
//   1. Är världen bredare än vyn, och växer den med nivån (i stället för att klämmas)?
//   2. Flyttar sig kameran när Zacke svingar åt höger?
//   3. Rör sig fjärranbandet LÅNGSAMMARE än spelplanet, och HUD:en inte alls?
//   4. Lämnar Zacke aldrig bilden (kamerans hårda ruta)?
//   5. Byter stämningen med nivån — utan att `byteScen()` läcker parallaxlager?
//   6. Plockas sakerna i flykten faktiskt upp med riktiga släpp?
//   7. Slutar godsakernas vilorörelse TICKA efter exit (repeat:-1 dör aldrig själv)?
//   8. Är en exit mitt i flykten ren?
//
//   node scripts/_varldprobe.mjs [--niva 8]
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const NIVA = parseInt(opt('--niva', '8'), 10)
const ID = 'spindel-zacke-svingar'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rader = []
const ok = (namn, pass, detalj) => rader.push({ namn, pass, detalj })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  const sattNiva = async (n) => {
    await page.evaluate(({ gid, niva }) => {
      const save = window.__barnspel.save
      save.update((d) => {
        const prof = d.profiles.find((p) => p.id === d.activeProfileId) || d.profiles[0]
        if (!prof) return
        prof.games = prof.games || {}
        prof.games[gid] = { ...(prof.games[gid] || { unlocked: true, stars: 0, custom: {} }), unlocked: true, highestLevel: niva }
      })
      save.flush()
    }, { gid: ID, niva: n })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), ID)
    await page.waitForTimeout(1400)
  }

  // Läser spelets OCH kamerans tillstånd. Lagrens `position.x` är det som faktiskt
  // hamnar på skärmen — det är den siffran parallax handlar om, inte faktorn i koden.
  const las = () => page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('spindel-zacke-svingar')
    if (!g || !g._kam) return null
    return {
      niva: g._level,
      faste: g._anchors?.length ?? 0,
      malX: g._anchors?.[g._anchors.length - 1]?.x ?? null,
      varldW: g._worldW,
      kamW: g._kam.world.w,
      kamX: Math.round(g._kam.x),
      state: g._state,
      zx: Math.round(g._zacke?.x ?? -1),
      // Skärm-x för Zacke: världslagrets läge + hans världsposition.
      zSkarm: Math.round((g._varld?.position.x ?? 0) + (g._zacke?.x ?? 0)),
      lager: {
        fjarran: Math.round(g._farLayer?.position.x ?? 0),
        varld: Math.round(g._varld?.position.x ?? 0),
        hud: Math.round(g._hud?.position.x ?? 0),
      },
    }
  })

  // ---------- 1. världen växer med nivån i stället för att klämmas ----------
  await sattNiva(0)
  const l0 = await las()
  await sattNiva(NIVA)
  const lN = await las()

  ok('1. banan kläms inte längre',
    lN.varldW > 1280 && lN.faste > l0.faste,
    `nivå ${l0.niva}: ${l0.faste} fästen / värld ${l0.varldW} px · nivå ${lN.niva}: ${lN.faste} fästen / värld ${lN.varldW} px`)
  ok('1b. gapet krymper INTE med nivån',
    Math.abs((lN.malX - 200) / (lN.faste - 1) - (l0.malX - 200) / (l0.faste - 1)) < 2,
    `gap nivå ${l0.niva} = ${Math.round((l0.malX - 200) / (l0.faste - 1))} px · nivå ${lN.niva} = ${Math.round((lN.malX - 200) / (lN.faste - 1))} px`)
  ok('1c. målet syns INTE från start',
    lN.malX > 1280,
    `sista fästet på x ${lN.malX}, vyn är 1280 bred`)

  // ---------- 2–4. spela framåt och mät kameran i rörelse ----------
  const toScreen = (x, y) => page.evaluate(([dx, dy]) => {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720)
    return { x: (window.innerWidth - 1280 * s) / 2 + dx * s, y: (window.innerHeight - 720 * s) / 2 + dy * s }
  }, [x, y])

  // Släpp i den goda framåt-stunden, precis som _svingprobe gör.
  const slappBra = async () => {
    for (let i = 0; i < 260; i++) {
      const s = await page.evaluate(async () => {
        const g = (await import('/src/games/registry.js')).getGame('spindel-zacke-svingar')
        return { state: g?._state, theta: g?._theta ?? 0, omega: g?._omega ?? 0 }
      })
      if (s.state === 'swing' && s.omega > 0 && s.theta >= 0.55 && s.theta <= 0.95) {
        const p = await toScreen(640, 300)
        await page.mouse.click(p.x, p.y)
        return true
      }
      await page.waitForTimeout(16)
    }
    return false
  }

  const prover = []
  let zUtanfor = 0
  const start = await las()
  for (let hopp = 0; hopp < 5; hopp++) {
    if (!(await slappBra())) break
    // Mät TÄTT under flykten — det är då kameran arbetar.
    for (let k = 0; k < 26; k++) {
      const s = await las()
      if (!s) break
      prover.push(s)
      if (s.zSkarm < -40 || s.zSkarm > 1320) zUtanfor++
      // En bild MITT I FLYKTEN — posen och fart-strecken finns bara här, och
      // testsvitens skärmdump fångar dem aldrig.
      if (hopp === 1 && k === 5 && s.state === 'flight') {
        await page.screenshot({ path: opt('--shot-flykt', `.test-shots/_flykt-${ID}.png`) })
      }
      await page.waitForTimeout(28)
    }
  }
  const slut = prover[prover.length - 1] || start
  // En bild MITT i resan — den enda som visar hur staden ser ut när kameran har
  // panorerat en bit in i världen. Testsvitens bild är alltid tagen vid start.
  const shot = opt('--shot', `.test-shots/_varld-${ID}.png`)
  await page.screenshot({ path: shot })

  ok('2. kameran följer med åt höger',
    slut.kamX > start.kamX + 150,
    `kamera x ${start.kamX} → ${slut.kamX} (Zacke ${start.zx} → ${slut.zx})`)

  // Parallax mäts som FÖRHÅLLANDET mellan lagrens förflyttning. Fjärranbandet har
  // faktor 0.18, så det ska röra sig knappt en femtedel så långt som spelplanet.
  const dVarld = Math.abs(slut.lager.varld - start.lager.varld)
  const dFjarran = Math.abs(slut.lager.fjarran - start.lager.fjarran)
  const dHud = Math.abs(slut.lager.hud - start.lager.hud)
  const kvot = dVarld > 0 ? dFjarran / dVarld : 0
  ok('3. fjärranbandet rör sig långsammare än spelplanet',
    dVarld > 100 && kvot > 0.05 && kvot < 0.45,
    `spelplan ${dVarld} px · fjärran ${dFjarran} px · kvot ${kvot.toFixed(2)} (faktor 0.18)`)
  ok('3b. HUD:en står helt stilla',
    dHud === 0,
    `${dHud} px`)

  ok('4. Zacke lämnar aldrig bilden',
    zUtanfor === 0 && prover.length > 10,
    `${zUtanfor} av ${prover.length} prover utanför [-40, 1320]`)

  // ---------- 5. stämningen byter med nivån, utan att läcka lager ----------
  //
  // `Camera.byteScen()` river scenens parallaxband och adopterar nya. Missar den att ta
  // bort de gamla ur `_layers` fortsätter kameran flytta osynliga containrar varje
  // bildruta, och listan växer för varje räddad kattunge. Det syns inte i en bild.
  const stamningar = await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('spindel-zacke-svingar')
    const ut = []
    for (let n = 0; n <= 5; n++) {
      g._buildLevel(n)
      ut.push({
        niva: n,
        tema: g._stamning.tema,
        tid: g._stamning.tid,
        lager: g._kam._layers.length,
        barn: g._kam.root.children.length,
        // Bevisar att tinten faktiskt nådde fram, och att fönstren går ÅT ANDRA HÅLLET
        // än husen när det mörknar.
        hus: g._roofs.kropp.tint,
        fonster: g._roofs.fonster.tint,
      })
    }
    return ut
  })
  const unika = new Set(stamningar.map((s) => `${s.tema}|${s.tid}`))
  const lagerSet = new Set(stamningar.map((s) => s.lager))
  const barnSet = new Set(stamningar.map((s) => s.barn))
  const natt = stamningar.find((s) => s.tema === 'night')
  const dag = stamningar.find((s) => s.tid === 'dag' && s.tema === 'sky')

  ok('5. stämningen byter med nivån',
    unika.size >= 4,
    stamningar.slice(0, 6).map((s) => `${s.niva}:${s.tema}/${s.tid}`).join(' · '))
  ok('5b. byteScen läcker inga lager',
    lagerSet.size === 1 && barnSet.size === 1,
    `lager ${[...lagerSet].join('/')} · rot-barn ${[...barnSet].join('/')} över 6 nivåbyten`)
  ok('5c. husen mörknar men fönstren tänds',
    !!natt && !!dag && natt.hus < dag.hus && natt.fonster !== dag.fonster,
    natt && dag
      ? `dag hus 0x${dag.hus.toString(16)} / fönster 0x${dag.fonster.toString(16)} → natt hus 0x${natt.hus.toString(16)} / fönster 0x${natt.fonster.toString(16)}`
      : 'hittade inte båda stämningarna')

  // ---------- 6. skörden i flykten ----------
  //
  // Kör om en bana och räkna vad som FAKTISKT plockas med riktiga släpp. En sak som
  // hänger fel (för högt, i fel lucka) syns inte i en bild — den bara plockas aldrig.
  await sattNiva(NIVA)
  let skordade = 0
  let utlagda = 0
  let totalt = 0
  for (let hopp = 0; hopp < 4; hopp++) {
    if (!(await slappBra())) break
    await page.waitForTimeout(760)
    const s = await page.evaluate(async () => {
      const g = (await import('/src/games/registry.js')).getGame('spindel-zacke-svingar')
      // PASSERADE, inte utlagda: sonden hinner bara igenom de första luckorna, och
      // "2 av 5" hade läst som tre missade när de tre andra aldrig var i närheten.
      const zx = g._zacke?.x ?? 0
      return {
        skord: g._skord ?? 0,
        passerade: (g._treats || []).filter((t) => t.x <= zx + 30).length,
        totalt: g._treats?.length ?? 0,
      }
    })
    skordade = s.skord
    utlagda = s.passerade
    totalt = s.totalt
  }
  ok('6. saker att nudda plockas i flykten',
    utlagda > 0 && skordade >= utlagda,
    `${skordade} av ${utlagda} passerade plockade (${totalt} utlagda i hela banan)`)

  // ---------- 7. vilorörelsen dör vid exit ----------
  //
  // `liv()` är repeat:-1 och slutar aldrig av sig själv. `isActive()` LJUGER om en tween
  // som dödat sig själv inifrån sin onUpdate (den fryser totalTime men rapporterar aktiv),
  // så det som mäts är att den slutar TICKA — inte vad den påstår om sig själv.
  await page.evaluate(async () => {
    const g = (await import('/src/games/registry.js')).getGame('spindel-zacke-svingar')
    window.__livTweens = (g._treats || []).map((t) => t.view?._fxLiv).filter(Boolean)
  })
  const livFore = await page.evaluate(() => window.__livTweens.length)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(700)
  const t1 = await page.evaluate(() => window.__livTweens.map((t) => t.totalTime()))
  await page.waitForTimeout(600)
  const t2 = await page.evaluate(() => window.__livTweens.map((t) => t.totalTime()))
  const tickar = t1.filter((v, i) => Math.abs(t2[i] - v) > 1e-6).length
  ok('7. vilorörelsen tickar inte vidare efter exit',
    livFore > 0 && tickar === 0,
    `${tickar} av ${livFore} liv-tweens rörde sig fortfarande 0,6 s efter exit`)

  // ---------- 8. exit mitt i flykten ----------
  await sattNiva(NIVA)
  const felFore = errors.length
  await slappBra()
  await page.waitForTimeout(120)
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(1400)
  ok('8. exit mitt i flykten ger 0 nya konsolfel', errors.length === felFore, errors.slice(felFore, felFore + 3).join(' | ') || 'inga')

  console.log(`\n  Världs- och kamerasond — ${ID}\n`)
  for (const r of rader) console.log(`  ${r.pass ? '✓' : '✗'} ${r.namn}  —  ${r.detalj}`)
  console.log(`\n  konsolfel totalt: ${errors.length}`)
  if (errors.length) console.log('  ' + errors.slice(0, 4).join('\n  '))
  const gront = rader.every((r) => r.pass) && errors.length === 0
  console.log(`\n  ${rader.filter((r) => r.pass).length}/${rader.length} gröna\n`)
  process.exitCode = gront ? 0 : 1
} catch (e) {
  console.error(e)
  process.exitCode = 2
} finally {
  await browser.close()
}
