// LYFTPLAN C4 — läser om glöd-kandidatlistan mot BÅDA villkoren, i tal.
//
// C4 namngav sju spel som kandidater för `blendMode: 'add'` på ett enda villkor:
// "här finns ljus". Två av dem har sedan mätts bort från motsatta håll (LYFTPLAN §9):
//
//   `lagerelden`      — källan startar på NÄRA VITT och ligger 5–10 lager djupt.
//                       Summan är vit oavsett botten → elden blev en vit klump.
//   `trollblandning`  — brygdfärgen är MÖRK (0x2a2342). En mörk källa adderar
//                       nästan ingenting → bubblorna blev nästan osynliga.
//
// Villkoren är alltså:
//   1. en MÖRK BOTTEN att lysa upp        (annars klipper resultatet till vitt)
//   2. en källa med TAKHÖJD KVAR          (annars finns inget kvar att addera)
//
// Sonden ställer den FAKTISKA idiomen — `glod()` ur lib/glod.js — på den FAKTISKA
// bottnen i varje kandidatspel, växelvis additiv och normal, och läser pixlarna.
// Ett enarmat prov bevisar ingenting: en vanlig ljus fläck höjer också värdena.
// Kontrollraderna (`lagerelden`, `trollblandning`) har KÄNT utfall och kalibrerar
// trösklarna — reproducerar sonden inte de två kända fallen är trösklarna påhittade.
//
//   node scripts/_glodkandidat.mjs            (kräver `npm run dev` på :5173)
//   node scripts/_glodkandidat.mjs --spara    (skriver .test-shots/_glod-<id>-{add,normal}.png)
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { writeFileSync } from 'node:fs'

const SPARA = process.argv.includes('--spara')

// Varje rad: var effekten FAKTISKT bor i spelet, och vilken färg dess ljus har.
// `djup` = hur många lager av samma ljus som ligger ovanpå varandra i spelet
// (lågtungor 5–10, en enstaka blixt 2). Additiv blandning SUMMERAR dem.
const RADER = [
  // ---- kontroller med känt utfall (kalibrerar trösklarna) ----
  {
    id: 'lagerelden', namn: 'lågtungor (KONTROLL: känd vit klump)', kant: 'kontroll-vit',
    x: 640, y: 470, farg: 0xfff3b0, alpha: 0.55, djup: 8, storlek: 150,
  },
  {
    id: 'trollblandning', namn: 'brygdbubblor (KONTROLL: känd osynlig)', kant: 'kontroll-polaritet',
    x: 640, y: 330, farg: 0x2a2342, alpha: 0.7, djup: 2, storlek: 120,
  },
  // ---- C4:s fem oprövade namn, var och en på den plats en formgivare
  //      FAKTISKT skulle lägga glöden, i den färg ljuset faktiskt har ----
  {
    id: 'enhorning-glitterbajs', namn: 'glitterpellets över godishimlen', tag: ':himmel',
    x: 560, y: 380, farg: 0xffd35c, alpha: 0.6, djup: 3, storlek: 150,
  },
  {
    id: 'glittergrottan', namn: 'gnistor (nära vit källa) i mörkret', tag: ':gnista',
    x: 320, y: 400, farg: 0xfff3b0, alpha: 0.6, djup: 3, storlek: 150,
  },
  {
    id: 'glittergrottan', namn: 'halo i kristallens EGEN färg mot mörkret', tag: ':kristall',
    x: 900, y: 430, farg: 0x4aa3df, alpha: 0.6, djup: 3, storlek: 150,
  },
  {
    id: 'blixt-och-dunder', namn: 'blixten mot solnedgången', tag: ':himmel',
    x: 640, y: 300, farg: 0xbfe3ff, alpha: 0.5, djup: 2, storlek: 150,
  },
  {
    id: 'golvet-ar-lava', namn: 'hetta UPPÅT ur floden (mot himlen)', tag: ':over',
    x: 640, y: 380, farg: 0xff7a2e, alpha: 0.6, djup: 3, storlek: 150,
  },
  {
    // OBS: (120, 560) ligger MITT I den gröna Gå-knappen — den mätte botten
    // 122,165,108 och var ett rent mätfel, inte klippan.
    id: 'golvet-ar-lava', namn: 'lavaskenet mot den MÖRKA klippan', tag: ':klippa',
    x: 190, y: 480, farg: 0xff7a2e, alpha: 0.6, djup: 3, storlek: 150,
  },
  {
    id: 'natskott-pa-stan', namn: 'fönsterljus på fasaden i dagsljus', tag: ':fasad',
    x: 960, y: 300, farg: 0xffd35c, alpha: 0.6, djup: 2, storlek: 150,
  },
]

const R = (c) => (c >> 16) & 255
const G = (c) => (c >> 8) & 255
const B = (c) => c & 255
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
const kroma = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255

function statistik(buf) {
  const png = PNG.sync.read(buf)
  const n = png.width * png.height
  let r = 0, g = 0, b = 0, vit = 0
  for (let i = 0; i < png.data.length; i += 4) {
    r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2]
    if (png.data[i] >= 250 && png.data[i + 1] >= 250 && png.data[i + 2] >= 250) vit++
  }
  return { medel: [r / n, g / n, b / n].map((v) => Math.round(v)), vit: (100 * vit) / n }
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let kod = 0
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const fel = []
  page.on('console', (m) => { if (m.type() === 'error') fel.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => fel.push('PAGEERROR: ' + (e.message || String(e)).slice(0, 160)))

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__barnspel, null, { timeout: 20000 })

  const utfall = []

  for (const rad of RADER) {
    // ALLTID via menyn. Att gå 'game' → samma 'game' gav en skärmövergång vars
    // cremeblänk låg kvar i rutan: `glittergrottan` mättes då till botten 253,246,227
    // (nära VITT) mitt i en kolsvart grotta. Övergången måste hinna klart.
    await page.evaluate(() => window.__barnspel.nav.go('menu'))
    await page.waitForTimeout(700)
    await page.evaluate((gid) => window.__barnspel.nav.go('game', { id: gid }), rad.id)
    await page.waitForTimeout(2000)

    // Rutan mäts på glödens KÄRNA — halva storleken, där skillnaden är som störst.
    const halv = Math.round(rad.storlek * 0.35)
    const klipp = { x: rad.x - halv, y: rad.y - halv, width: halv * 2, height: halv * 2 }

    const skott = async () => page.screenshot({ clip: klipp })
    const botten = statistik(await skott())

    // Lägg `djup` glöder ovanpå varandra — precis som spelet gör. Additiv summerar
    // dem, normal gör det inte, och just det är hela skillnaden mellan lägen.
    await page.evaluate(async ({ x, y, farg, alpha, djup, storlek }) => {
      const { glod } = await import('/src/lib/glod.js')
      const lager = window.__barnspel.fxLayer
      window.__sondGlod = []
      for (let i = 0; i < djup; i++) {
        const g = glod({ color: farg, size: storlek, alpha })
        g.label = '_sond_glod'
        g.position.set(x, y)
        lager.addChild(g)
        window.__sondGlod.push(g)
      }
    }, rad)
    await page.waitForTimeout(200)
    const add = statistik(await skott())
    if (SPARA) writeFileSync(`.test-shots/_glod-${rad.id}-add.png`, await skott())

    await page.evaluate(() => { for (const g of window.__sondGlod) g.blendMode = 'normal' })
    await page.waitForTimeout(200)
    const normal = statistik(await skott())
    if (SPARA) writeFileSync(`.test-shots/_glod-${rad.id}-normal.png`, await skott())

    await page.evaluate(() => {
      const lager = window.__barnspel.fxLayer
      for (const g of window.__sondGlod) { lager.removeChild(g); g.destroy() }
      window.__sondGlod = []
    })

    const kallLum = lum([R(rad.farg), G(rad.farg), B(rad.farg)])
    utfall.push({
      rad,
      bottenLum: lum(botten.medel),
      kallLum,
      kallTakhojd: 255 - Math.max(R(rad.farg), G(rad.farg), B(rad.farg)),
      lumAdd: lum(add.medel),
      lumNormal: lum(normal.medel),
      lyft: lum(add.medel) - lum(botten.medel),
      vitAdd: add.vit,
      vitNormal: normal.vit,
      kromaAdd: kroma(add.medel),
      kromaKalla: kroma([R(rad.farg), G(rad.farg), B(rad.farg)]),
      botten, add, normal,
    })
  }

  await page.evaluate(() => window.__barnspel.nav.go('menu'))
  await page.waitForTimeout(300)

  // ---------- utskrift ----------
  console.log('\nLYFTPLAN C4 — glödkandidater mot BÅDA villkoren')
  console.log('  villkor 1: mörk botten att lysa upp   villkor 2: källa med takhöjd kvar\n')
  const pad = (s, n) => String(s).padEnd(n)
  const num = (v, n = 6, d = 1) => String(v.toFixed(d)).padStart(n)
  console.log(
    pad('spel', 28) + pad('botten', 8) + pad('källa', 8) + pad('vinst', 8) +
    pad('vit%add', 9) + pad('kroma', 8) + pad('polvänd', 9) + 'utfall'
  )
  console.log('-'.repeat(104))

  const domar = []
  for (const u of utfall) {
    // VILLKOR 1 är inte "mörk botten" utan **takhöjd i de kanaler källan lyser i**.
    // En mättad orange lava är ljus i R men nästan tom i G och B — en orange glöd
    // har alltså gott om plats där, medan en gråblå fasad i dagsljus är halvljus i
    // ALLA tre och klipper direkt. Klippningen mäter det för oss.
    const klipper = u.vitAdd > 25 && u.vitAdd > u.vitNormal + 8
    // POLARITET är en UPPLYSNING, inte en dom. Ritas effekten normalt MÖRKARE än sin
    // botten men additivt LJUSARE, så vänder additiv blandning föremålets tecken. Är
    // effekten menad som ett FÖREMÅL (trollblandnings bubblor) är det diskvalificerande;
    // är den menad som LJUS (lavans hetta) är det precis vad man vill ha. Sonden kan
    // mäta teckenbytet men inte AVSIKTEN — den frågan lämnas åt den som läser tabellen,
    // i stället för att låtsas att en tröskel avgör den.
    const polaritetVander = u.lumNormal < u.bottenLum && u.lumAdd > u.bottenLum
    // Ger idiomet något ALLS? Är add ≈ normal finns ingen anledning att byta.
    const vinst = u.lumAdd - u.lumNormal
    const utanVinst = vinst < 10
    // VILLKOR 2, ljusa änden: en nära vit källa har ingen takhöjd — den kommer fram
    // som ett grått/vitt dis i stället för som färgat ljus.
    const tappadFarg = u.kromaKalla > 0.15 && u.kromaAdd < u.kromaKalla * 0.35

    let dom
    if (klipper) dom = 'NEJ — klipper till vitt'
    else if (utanVinst) dom = 'NEJ — add ≈ normal'
    else if (tappadFarg) dom = 'NEJ — källan saknar takhöjd, blir dis'
    else dom = 'JA'
    domar.push({ u, dom })

    if (u.rad.kant === 'kontroll-vit' && !klipper) { console.log('  ⚠ kontrollen `lagerelden` klippte INTE — trösklarna är fel kalibrerade'); kod = 1 }
    if (u.rad.kant === 'kontroll-polaritet' && !polaritetVander) { console.log('  ⚠ kontrollen `trollblandning` vände INTE polaritet — trösklarna är fel kalibrerade'); kod = 1 }

    console.log(
      pad(u.rad.id + (u.rad.tag || ''), 28) + num(u.bottenLum, 6, 0) + '  ' + num(u.kallLum, 6, 0) + '  ' +
      num(vinst, 6, 1) + '  ' + num(u.vitAdd, 7, 1) + '  ' + num(u.kromaAdd, 6, 2) + '  ' +
      pad(polaritetVander ? '  ja' : '  nej', 9) + dom
    )
  }

  console.log('\nrå medelfärger (kärnrutan):')
  for (const u of utfall) {
    console.log(
      '  ' + pad(u.rad.id, 24) +
      'botten ' + pad(u.botten.medel.join(','), 14) +
      'add ' + pad(u.add.medel.join(','), 14) +
      'normal ' + u.normal.medel.join(',')
    )
  }
  console.log('\n  ' + RADER.map((r) => r.namn).length + ' rader · konsolfel: ' + fel.length)
  if (fel.length) { console.log(fel.slice(0, 5).map((f) => '   ! ' + f).join('\n')); kod = 1 }
} catch (e) {
  console.error('SOND-FEL:', e.message)
  kod = 1
} finally {
  await browser.close()
}
process.exit(kod)
