// unika-knytt: ÖGONLOCKET i bild (ÅTGÄRDER U6).
//
// Blinkningen varar ~0,2 s och infaller var ~3,5 s, så den går inte att fånga med en
// skärmdump på måfå — `_knyttbild` råkade göra det EN gång och det var så U6 hittades.
// Här tvingas locken i stället till ett känt läge och sex `ogonform` ställs sida vid sida.
//
// Rutnätet är 6 kolumner (en per ogonform, SAMMA frö så bara ögat skiljer) × 3 rader:
//   rad 1  lock UPPE  (0,00) — KONTROLLARMEN. Utan den går det inte att se om bandet är
//                              lockets fel eller något ansiktet alltid haft.
//   rad 2  lock HALVT (0,55) — mitt i en blinkning, det läge ögat faktiskt passerar
//   rad 3  lock NERE  (1,00) — 'somnig'/'sover' står kvar i det här läget hela tiden
//
// Frågan bilden ska svara på: läser locket som ett ÖGONLOCK, eller som ett platt band
// tvärs över ansiktet? Utbredningen är redan mätt och är INTE problemet — locket ligger
// 6,7–21,2 px innanför kroppens kant på sex frön (`_knyttbild`). Det här är en TON- och
// KANT-fråga.
//
//   node scripts/_lockbild.mjs [--lock 0,0.55,1] [--fro 1234567]
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const arg = process.argv.slice(2)
const flagga = (namn, fallback) => (arg.includes(namn) ? arg[arg.indexOf(namn) + 1] : fallback)
const LAGEN = String(flagga('--lock', '0,0.55,1')).split(',').map(Number)
const FRO = Number(flagga('--fro', 1234567))
// `somnig` star pa lock 0,7 i 12-20 s at gangen — halvlaget ar alltsa inte overgaende, och
// det gar inte att bedoma i en 213 px bred cell. `--bara` + `--r` gor rutorna stora nog.
const R = Number(flagga('--r', 78))
const BARA = arg.includes('--bara') ? String(flagga('--bara', '')).split(',').map((x) => x.trim()) : null
const shot = '.test-shots/knytt-lock.png'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 200)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 15000 })
  await page.evaluate(() => window.__barnspel.nav.go('library'))
  await page.waitForTimeout(900)

  const former = await page.evaluate(async ({ lagen, fro, r, bara }) => {
    // Bara PROJEKTETS egna sökvägar går att importera här — en bar specifier ('pixi.js')
    // resolvas av Vite i modulgrafen, inte i webbläsarens import(). Därför ingen `Text`;
    // kolumnordningen skrivs i konsolen i stället.
    const kn = await import('/src/games/unika-knytt/knytt.js')
    const dn = await import('/src/games/unika-knytt/dna.js')
    const { createScene } = await import('/src/lib/scene.js')
    const layer = window.__barnspel.gateLayer
    for (const c of [...layer.children]) if (c.__galleri) c.removeFromParent()

    const duk = createScene('meadow', { width: 1280, height: 720 })
    duk.__galleri = true
    layer.addChild(duk)

    // Samma frö i alla sex kolumner: då är ÖGONFORMEN enda variabeln. `byggKnytt` läser
    // `d.ogonform` som ett index, så den går att skriva över efter att fröet dragits.
    const bas = dn.dnaFromSeed(fro, { f: 2, z: 1, m: 1, v: 0, g: 1 })
    // Formindex maste folja med filtreringen — `byggKnytt` slar upp `d.ogonform` i sin egen
    // tabell, sa ett omnumrerat index hade ritat fel oga under ratt rubrik.
    const valda = dn.OGONFORMER.map((namn, i) => ({ namn, i })).filter((q) => !bara || bara.includes(q.namn))
    const kolumn = 1280 / valda.length
    const rad = 700 / lagen.length
    window.__lockknytt = []
    window.__lockprov = []
    valda.forEach(({ namn, i }, kol) => {
      lagen.forEach((v, j) => {
        const k = kn.byggKnytt({ ...bas, ogonform: i }, { r })
        k.view.position.set(kol * kolumn + kolumn / 2, j * rad + rad * 0.92)
        // Locken sätts DIREKT: knyttet tickas aldrig här, så inget skriver över dem.
        // ⚠️ SPELETS EGEN REGEL måste speglas: vid `lid > 0.78` tänder `_ritaAnsikte` ⌣-bågen
        // ovanpå locket (`knytt.js:1213-1216`). En sond som bara sätter `scale.y` visar ett
        // läge spelet aldrig ritar — och då bedöms fel bild.
        for (const o of k._ogon) {
          o.lock.scale.y = v
          o.sov.visible = v > 0.78
          o.glad.visible = false
        }
        k.view.__galleri = true
        layer.addChild(k.view)
        window.__lockknytt.push(k)
        if (j === 0 || j === lagen.length - 1) window.__lockprov.push({ namn, rad: j === 0 ? 'oppet' : 'stangt', k })
      })
    })
    return valda.map((q) => q.namn)
  }, { lagen: LAGEN, fro: FRO, r: R, bara: BARA })

  await page.waitForTimeout(500)
  await page.screenshot({ path: shot })

  // ⚠️ Provpunkterna gar INTE att ta i byggloopen: `getGlobalPosition()` lases da fore forsta
  // renderingen, foraldratransformen ar oskriven, och alla sex kolumnerna gav SAMMA pixel
  // (237,222,89 mot 54,51,22 sex ganger — sex olika ogonformer kan omojligt ge identiska tal).
  // De hamtas darfor EFTER skarmdumpen, ur den geometri som faktiskt ritades.
  const prov = await page.evaluate(() =>
    window.__lockprov.map(({ namn, rad, k }) => {
      const o = k._ogon[0]
      const g = o.nod.getGlobalPosition()
      const g2 = k._ogon[1] ? k._ogon[1].nod.getGlobalPosition() : null
      // Riktningen BORT fran grannogat. Provet at det andra hallet landar i grannens lock.
      const ut = g2 && g2.x > g.x ? -1 : 1
      return { namn, rad, x: Math.round(g.x), y: Math.round(g.y), e: o.e, ut, isar: g2 ? Math.abs(g2.x - g.x) : 0 }
    }))

  // --- TONPROVET ---------------------------------------------------------------------
  // U6 är en TON- och KANT-fråga (utbredningen är redan mätt och är innanför kroppen), och
  // ögat kan inte avgöra om ett block är ljusare eller mörkare än sin omgivning — det ser
  // bara att det SYNS.
  //
  // ⚠️ Referenspunkten far INTE tas AT SIDAN: locket ar 1,5e brett och ogonen star ~2,5e isar,
  // sa 2,2e at sidan landar i GRANNOGATS lock och jamfor locket med sig sjalvt. Pannan strax
  // ovanfor lockets overkant ar ren kropp och ar darfor referensen.
  if (arg.includes('--rapunkter')) { console.log(JSON.stringify(prov, null, 1)); }
  const png = PNG.sync.read(readFileSync(shot))
  const px = (x, y) => {
    const i = (png.width * y + x) << 2
    return [png.data[i], png.data[i + 1], png.data[i + 2]]
  }
  const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
  // ⚠️ LUMINANS AR BLIND HAR. Locket och ansiktet skiljer -8,5 lum men -37 i BLA: pa en gul
  // kropp bar bla-kanalen hela mattnadsskillnaden, och ogat ser mattnad. Ett kantmatt i
  // luminans gav 1,1-1,3 och sade "ingen kant" om en kant som syns tydligt i bilden.
  const kanal = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
  // ⚠️ PROVPUNKTEN AVGOR VAD "TONEN" BETYDER, och den har varit fel TVA ganger.
  // ⓵ Forst last MITT OVER OGAT: rapporterade att en toning gjorde saken VARRE (-37 → -38
  //   bla). Fel fraga — dar nere SKA ett lock vara morkare, det ar skuggan det kastar.
  // ⓶ Sedan last mot PANNAN 2,4e ovanfor: gav -1,1 lum medan bilden visade tva ljusa lador.
  //   Pannan ligger i `sphereFill`ens ljusa zon, sa ett lock som matchar den ar LJUSARE an
  //   ansiktet dar locket faktiskt sitter.
  // ⓷ Ett prov 1,5e RAKT OVER ogat gav 0/0 — det foll utanfor locket: lockets overkant star
  //   pa 1,58e och avstandet var 1,2 px. Fonstret uppat ar bara 0,24e brett (mellan lockets
  //   kant och ogats), alltsa 3 px.
  // Provet gar darfor i SIDLED vid ogats hojd, dar locket ar bredast (1,53e) och ogat slut
  // (som mest 1,34e) — och AT DET HALL DAR INGET GRANNOGA STAR, for grannens lock nar in till
  // 1,40e pa den andra sidan.
  //
  // Fragan ar "smalter locket in i det ansikte det TACKER?", och referensen ar darfor samma
  // punkt pa den OPPNA raden — samma hojd, samma kolumn, samma kropp, utan lock.
  const oppnaRad = prov.filter((q) => q.rad === 'oppet')
  const toner = prov.filter((q) => q.rad === 'stangt').map(({ namn, x, y, e, ut }, i) => {
    const o = oppnaRad[i]
    const dx = Math.round(e * 1.45) * ut
    const mitt = px(x + dx, y)
    const skugga = px(x, y)
    const panna = px(o.x + dx, o.y)
    // Locket och pannan ligger nara varandra i LJUSHET men langt isar i MATTNAD — bla-kanalen
    // bar hela signalen pa en gul kropp, och ett matt som bara laser luminans missar den.
    return {
      namn,
      mitt,
      panna,
      dLum: +(lum(mitt) - lum(panna)).toFixed(1),
      dBla: mitt[2] - panna[2],
      skugga: +(lum(skugga) - lum(panna)).toFixed(1),
    }
  })

  // KANTEN — den andra halvan av U6. En rak lodrat kant ger ett stort hopp mellan tva
  // grannpixlar; en mjuk eller rundad kant ger ett litet.
  //
  // ⚠️ FONSTRET AR HELA MATNINGEN. Ett svep over hela ogat (±2,6e) matte 124,3 lum i ALLA sex
  // kolumnerna — men vid olika dx, och det talet ar ⌣-BAGENS morka streck (`p.pupill`), inte
  // lockets kant. Langre ut an 2,4e ligger kroppens egen konturkopia, ett annu storre hopp.
  // Fonstret ar darfor smalt och lagt runt lockets VANSTRA kant (den star pa -1,5e): utanfor
  // bagen (som slutar pa -1,0e) och innanfor siluetten.
  const kanter = prov.filter((q) => q.rad === 'stangt').map(({ namn, x, y, e }) => {
    let varst = 0
    let vid = 0
    for (let dx = -Math.round(e * 1.95); dx < -Math.round(e * 1.1); dx++) {
      const d = kanal(px(x + dx + 1, y), px(x + dx, y))
      if (d > varst) { varst = d; vid = +(dx / e).toFixed(2) }
    }
    return { namn, hopp: +varst.toFixed(1), vid }
  })

  // KONTROLLARMEN pa MATAREN. Forsta forsoket jamforde de sex OPPNA ogonen med varandra och
  // fallde matningen — fel: mitt i ett oppet oga sitter PUPILLEN, och den ar samma faerg i
  // fem av sex former. Att sex kolumner ger samma pixel ar dessutom VANTAT pa den stangda
  // raden: ett PLATT lock ar samma faerg oavsett vilket oga som ligger under det.
  //
  // Kontrollen som faktiskt svarar: samma kolumn, oppet mot stangt. De MASTE skilja sig —
  // gor de inte det ligger provpunkten inte pa ogat alls.
  const stangda = prov.filter((q) => q.rad === 'stangt')
  const parvis = prov.filter((q) => q.rad === 'oppet').map((o, i) => ({
    namn: o.namn, oppet: px(o.x, o.y), stangt: px(stangda[i].x, stangda[i].y),
  }))
  const unika = parvis.filter((q) => q.oppet.join(',') !== q.stangt.join(',')).length

  // Exit-säkerhet i samma körning — samma krav som varje annan bildsond.
  await page.evaluate(async () => {
    const fb = await import('/src/lib/feedback.js')
    for (const k of window.__lockknytt || []) { fb.stadFx(k.view); k.destroy() }
    window.__lockknytt = []
  })
  await page.waitForTimeout(500)

  console.log('')
  console.log(`  unika-knytt — ögonlocket (frö ${FRO}, r ${R})`)
  console.log('')
  console.log(`  kolumner (vänster→höger): ${former.join(' · ')}`)
  console.log(`  rader (uppifrån):         lock ${LAGEN.join(' · ')}${LAGEN[0] === 0 ? '   (rad 1 = KONTROLL)' : ''}`)
  console.log('')
  console.log(`  ⓵ TONEN — locket 1,45e ut i sidled mot SAMMA PUNKT utan lock (lock ${LAGEN[LAGEN.length - 1]}):`)
  for (const t of toner) {
    console.log(`     ${t.namn.padEnd(8)} lock ${String(t.mitt.join(',')).padEnd(12)} · utan ${String(t.panna.join(',')).padEnd(12)} → ${t.dLum > 0 ? '+' : ''}${t.dLum} lum · ${t.dBla > 0 ? '+' : ''}${t.dBla} bla · skuggan over ogat ${t.skugga} lum`)
  }
  const vLum = toner.reduce((a, b) => (Math.abs(b.dLum) > Math.abs(a.dLum) ? b : a), toner[0])
  const vBla = toner.reduce((a, b) => (Math.abs(b.dBla) > Math.abs(a.dBla) ? b : a), toner[0])
  console.log(`     storst: ${vLum.dLum} lum · ${vBla.dBla} bla — 0/0 = locket smalter in i ansiktet`)
  console.log('')
  console.log('  ⓶ KANTEN — storsta kanalhopp mellan tva grannpixlar vid lockets vanstra kant:')
  for (const k of kanter) console.log(`     ${k.namn.padEnd(8)} ${String(k.hopp).padStart(5)} kanal vid ${k.vid}e`)
  // ⓷ OVERKANTEN — den axel ATGARDER faktiskt beskriver ("rak overkant", "ETT band tvars
  // over ansiktet"). Sidokanten matte 2-5 och sade darfor nastan ingenting; locket bottnar
  // 1,6e OVANFOR ogat och dess overkant ar en rak vagrat linje. Svepet gar lodratt genom den.
  const toppar = prov.filter((q) => q.rad === 'stangt').map(({ namn, x, y, e, isar }) => {
    let varst = 0
    let vid = 0
    for (let dy = -Math.round(e * 2.4); dy < -Math.round(e * 0.8); dy++) {
      const d = kanal(px(x, y + dy + 1), px(x, y + dy))
      if (d > varst) { varst = d; vid = +(dy / e).toFixed(2) }
    }
    // Locken moter varandra nar ogonen star narmare an tva HALVBREDDER VID BRYNET. Den
    // halvbredden ar `1.5 * 0.87 = 1.305e` (`knytt.js:_byggOga`) — luckan ar bredast rakt
    // over ogat, inte upptill, och ett tal raknat pa den bredaste punkten hade sagt "band"
    // om ett lock som slutar langt fran grannen.
    const BRYN = 1.305
    return { namn, hopp: varst, vid, isar: +(isar / e).toFixed(2), band: isar < e * BRYN * 2 }
  })

  const vKant = kanter.reduce((a, b) => (b.hopp > a.hopp ? b : a), kanter[0])
  console.log(`     storst: ${vKant.hopp} kanal (${vKant.namn}) — lagre = mjukare kant`)
  console.log('')
  console.log('  ⓷ OVERKANTEN — storsta kanalhopp lodratt genom lockets raka overkant:')
  for (const t of toppar) console.log(`     ${t.namn.padEnd(8)} ${String(t.hopp).padStart(5)} kanal vid ${t.vid}e · ogonen ${t.isar}e isar → ${t.band ? 'LOCKEN MOTS (ett band)' : 'aatskilda'}`)
  const vTopp = toppar.reduce((a, b) => (b.hopp > a.hopp ? b : a), toppar[0])
  console.log(`     storst: ${vTopp.hopp} kanal (${vTopp.namn}) — lagre = mjukare overkant`)
  console.log('')
  console.log(`  kontrollarm: ${unika} av ${parvis.length} kolumner skiljer OPPET fran STANGT ${unika === parvis.length ? '✓ matpunkterna ligger pa ogat' : '✗ MATAREN AR TRASIG — punkten missar ogat'}`)
  for (const q of parvis) console.log(`     ${q.namn.padEnd(8)} oppet ${String(q.oppet.join(',')).padEnd(12)} · stangt ${q.stangt.join(',')}`)
  console.log('')
  if (R * 2.6 > 700 / LAGEN.length) {
    console.log(`  ⚠ r ${R} ar for stort for ${LAGEN.length} rader — knytten overlappar varandra i hojdled.`)
    console.log('    Kor farre --lock-varden (t.ex. "0,0.7") nar du hojer --r.')
    console.log('')
  }
  console.log(`  bild: ${shot}`)
  console.log(errors.length ? `  ✗ ${errors.length} konsolfel:\n     ${errors.slice(0, 5).join('\n     ')}` : '  ✓ 0 konsolfel (inkl. destroy)')
} finally {
  await browser.close()
}
process.exit(errors.length ? 1 : 0)
