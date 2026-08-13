// ANSIKTE — offline-klippet för fotoriggen (`assets-src/ansikte/<person>/` → `public/ansikte/`).
//
// Samma mönster som `npm run voice` och `npm run sfx`: allt tungt görs EN gång här, och
// spelet läser bara färdiga filer + ett manifest. Inget av det här körs i webbläsaren.
//
// ⚠️ UPPRIKTNINGEN ÄR HELA POÄNGEN. Fotoshooten är tagen i en session men huvudet driver:
// uppmätt över de 129 bilderna ligger hjässan mellan y 159 och 319 och huvudhöjden mellan
// 705 och 865 px, och flera bilder LUTAR. En korsblekning mellan två helbildsfoton hade
// alltså fått ansiktet att hoppa och lurva — det är skillnaden mellan "en min till" och
// "ett annat foto". Varje roll riktas därför in mot referensen (neutralbilden) genom en
// sökning över SKALA · ROTATION · LÄGE, i två steg (grovt, sedan fint).
//
// Tre saker som mätningen tvingade fram:
//   1. **Rotation måste vara med.** Utan den kunde `sur`, `lycksalig` och `skratt` bara
//      passas in genom att skalas fel — de lutar 3–10°.
//   2. **Måttet måste läsa POSE, inte utseende.** Först mättes likhet i ögonbandet (först
//      intensitet, sedan gradient). Båda blandar ihop "fel läge" med "annan min" — brynen
//      RÖR sig mellan miner, så inriktningen jagade något minen själv flyttade, och 5 av 11
//      bilder blev dubbelexponerade i överlagringen. Måttet är nu SILHUETTENS överlappning
//      (IoU): huvudets kontur är samma kontur oavsett min.
//   3. **En roll får inte vara en enda bild.** Fem bilder gick helt enkelt inte att rätta —
//      personen hade lutat sig fram eller vridit huvudet, och det är en 3D-rotation som
//      ingen 2D-transform når. Med 129 bilder finns nästan alltid ett syskon med samma min
//      i rätt pose, så varje roll listar kandidater och skriptet väljer på POSE.
//      ⚠️ Urvalet får INTE göras på utseendelikhet — då vinner den blekaste minen varje gång.
//
// KALIBRERING: referensen mot sig själv måste ge skala 1,000 · vinkel 0,0 · flytt 0 px ·
// rest 0,000. Står inte den raden rätt mäter sonden inte det den påstår.
//
//   node scripts/ansikte.mjs [--person pappa] [--kontroll]
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const PERSON = opt('--person', 'pappa')
const KONTROLL = args.includes('--kontroll')

const SRC = path.join('assets-src', 'ansikte', PERSON)
const TMP = path.join('.tmp-ansikte')

// Ansiktsrutan tas som en andel av silhuettens ram i REFERENSbilden: hjässan och nedåt,
// utan axlar (tröjan byts mitt i serien — 13–42, 49–57, 81, 121–122 bär ett tryck — och
// en korsblekning över ett plaggbyte syns direkt).
// ⚠️ Rutan måste rymma HAKAN med marginal. Första försöket (h 0.62) skar av hakan vid
// nederkanten — och käken ÄR det som ska röra sig nedåt, så den halvan hade klippts mitt
// i sin egen rörelse.
const RUTA = { x: 0.13, y: 0.0, w: 0.74, h: 0.80 }
const HOJD = 800 // px i utdata — bildbudgeten i IDEER.md säger max ~800 per lager

const GROV = { bredd: 96, marginal: 10, skalor: [0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15], vinklar: [-8, -4, 0, 4, 8] }
const FIN = { bredd: 288, marginal: 4, skalor: [0.98, 0.99, 1.0, 1.01, 1.02], vinklar: [-2, -1, 0, 1, 2] }
const KANT_VARNING = 'slog i sokintervallets kant'

const magick = (a, bin = false) => execFileSync('magick', a, { maxBuffer: 1 << 28, encoding: bin ? 'buffer' : 'utf8' })
const ram = (f) => {
  const m = /^(\d+)x(\d+)\+(-?\d+)\+(-?\d+)$/.exec(magick([f, '-format', '%@', 'info:']).trim())
  return { w: +m[1], h: +m[2], x: +m[3], y: +m[4] }
}

// En avbildning: skala `s` och vrid `a` grader kring källpunkten (cx, cy), och lägg den
// punkten på (tx, ty) i utrutan. `-distort SRT` med viewport gör hela steget i ETT anrop
// och behöver ingen mellanliggande duk att komponera mot.
const srt = (fil, { cx, cy, s, a, tx, ty }, W, H, extra) =>
  [fil, '-virtual-pixel', 'none', '-background', 'none', '-filter', 'Lanczos',
    '-define', `distort:viewport=${W}x${H}+0+0`,
    '-distort', 'SRT', `${cx},${cy} ${s} ${a} ${tx},${ty}`, ...extra]

const rendera = (fil, t, W, H, ut) => magick(srt(fil, t, W, H, [ut]))
// Silhuetten som binär mask — det är POSEN, och den är oberoende av vilken min bilden bär.
const mask = (fil, t, W, H) => {
  const buf = magick(srt(fil, t, W, H, ['-alpha', 'extract', '-colorspace', 'Gray', '-depth', '8', 'gray:-']), true)
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.length)
}

// 1 − IoU över ett band. 0 = silhuetterna täcker varandra exakt.
function rest(a, aw, ax, ay, b, bw, bx, by, w, h) {
  let snitt = 0
  let union = 0
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const p = a[(ay + j) * aw + ax + i] > 127
      const q = b[(by + j) * bw + bx + i] > 127
      if (p && q) snitt++
      if (p || q) union++
    }
  }
  return union > 0 ? 1 - snitt / union : 1
}

const cfg = JSON.parse(fs.readFileSync(path.join(SRC, 'roller.json'), 'utf8'))
// En roll får peka på en ANNAN fotoserie än referensens (`kallor: { roll: "mönster" }`).
// Blickserien finns bara i ägarens andra shoot, och att blanda in en bild därifrån är
// inget som får ske i tysthet: inriktningens `rest` och en tonjämförelse i samma
// koordinatsystem är det som avgör om lappen går att lägga på den befintliga riggen.
const monster = (roll) => (roll && cfg.kallor?.[roll]) || cfg.kalla
const fil = (n, roll) => path.join(SRC, monster(roll).replace('#####', String(n).padStart(5, '0')))
fs.mkdirSync(TMP, { recursive: true })

const refFil = fil(cfg.referens)
const refRam = ram(refFil)
const RX = Math.round(refRam.x + RUTA.x * refRam.w)
const RY = Math.round(refRam.y + RUTA.y * refRam.h)
const RW = Math.round(RUTA.w * refRam.w)
const RH = Math.round(RUTA.h * refRam.h)
const skalaUt = HOJD / RH
const UTW = Math.round(RW * skalaUt)
const UTH = HOJD

// Referensens egen avbildning i en given arbetsbredd: oskalad, ovriden, ansiktsrutans
// hörn i origo.
const refT = (sk) => ({ cx: RX, cy: RY, s: sk, a: 0, tx: 0, ty: 0 })

function uppstallning(bredd) {
  const AW = bredd
  const AH = Math.round((RH / RW) * bredd)
  const sk = AW / RW
  return {
    AW, AH, sk, ref: mask(refFil, refT(sk), AW, AH),
    // Hela huvudet utom hakpartiet: en gapande mun skjuter fram hakan och den delen av
    // silhuetten ÄR minen. Resten (hjässa, hår, öron, kinder) är pose.
    BX: 0, BW: AW,
    BY: 0, BH: Math.round(AH * 0.72),
  }
}

function sok(f, u, marginal, skalor, vinklar, kring) {
  let bast = null
  const kw = u.AW + 2 * marginal
  const kh = u.AH + 2 * marginal
  for (const ds of skalor) {
    for (const dv of vinklar) {
      const s = kring.s * ds
      const a = kring.a + dv
      // Kandidaten läggs på +marginal i den vadderade rutan, så en träff vid ox betyder
      // att den ska flyttas −(ox − marginal). Tecknet är kalibrerat: referensen mot sig
      // själv måste ge flytt 0.
      const t = { cx: kring.cx, cy: kring.cy, s: s * u.sk, a, tx: kring.tx * u.sk + marginal, ty: kring.ty * u.sk + marginal }
      const g = mask(f, t, kw, kh)
      for (let oy = 0; oy <= 2 * marginal; oy++) {
        for (let ox = 0; ox <= 2 * marginal; ox++) {
          const d = rest(u.ref, u.AW, u.BX, u.BY, g, kw, u.BX + ox, u.BY + oy, u.BW, u.BH)
          if (!bast || d < bast.d) {
            // Ligger bästa träffen i kanten av det sökta spannet vill sökningen längre —
            // svaret är då inte "hittat", utan "spannet tog slut". Det flaggas.
            const kant = ds === skalor[0] || ds === skalor[skalor.length - 1] ||
              dv === vinklar[0] || dv === vinklar[vinklar.length - 1] ||
              ox === 0 || ox === 2 * marginal || oy === 0 || oy === 2 * marginal
            bast = { d, s, a, kant, cx: kring.cx, cy: kring.cy, tx: kring.tx - (ox - marginal) / u.sk, ty: kring.ty - (oy - marginal) / u.sk }
          }
        }
      }
    }
  }
  return bast
}

// En sökning vars bästa träff ligger i KANTEN av spannet har inte hittat ett minimum —
// den har tagit slut. Då flyttas spannet dit och sökningen görs om. Uppmätt: utan det
// slog 8 av 11 roller i kanten, för utgångsgissningen (silhuettens ramhöjd) är dålig när
// personen lutat sig fram — ramen bär axlar, inte huvud.
function sokTills(f, u, marginal, skalor, vinklar, start, rundor = 5) {
  let b = sok(f, u, marginal, skalor, vinklar, start)
  for (let i = 1; i < rundor && b.kant; i++) b = sok(f, u, marginal, skalor, vinklar, b)
  return b
}

const uGrov = uppstallning(GROV.bredd)
const uFin = uppstallning(FIN.bredd)

console.log(`\n  Ansikte: ${PERSON} · referens #${cfg.referens} · ruta ${RW}x${RH} → ${UTW}x${UTH}\n`)
console.log('  roll         foto  skala  vinkel   tx    ty   rest   flytt')

const lager = {}
const rester = []
const tagna = new Set()
for (const [roll, kandidater] of Object.entries(cfg.roller)) {
  // Steg 1: grovsök VARJE kandidat och välj den vars POSE ligger närmast referensen.
  const forsok = []
  for (const n of kandidater) {
    // ⚠️ NYCKELN MÅSTE BÄRA KÄLLAN, inte bara numret. Med en roll som pekar på en annan
    // fotoserie finns #97 i BÅDA — och shoot 1:s `blund` lade beslag på numret så att
    // shoot 2:s blickbild försvann ur listan (kraschade som `vald` = undefined).
    if (tagna.has(`${monster(roll)}#${n}`)) continue // ett foto bär EN roll
    const f = fil(n, roll)
    const r = ram(f)
    // Utgångsläge: silhuettens mitt läggs där referensens silhuettmitt ligger i rutan,
    // och skalan gissas ur ramhöjden. Sökningen får rätta båda.
    const s0 = refRam.h / r.h
    const start = {
      cx: r.x + r.w / 2, cy: r.y + r.h / 2, s: s0, a: 0,
      tx: (refRam.x + refRam.w / 2) - RX, ty: (refRam.y + refRam.h / 2) - RY,
    }
    forsok.push({ n, f, start, grov: sokTills(f, uGrov, GROV.marginal, GROV.skalor, GROV.vinklar, start) })
  }
  forsok.sort((a, b) => a.grov.d - b.grov.d)
  const vald = forsok[0]
  if (!vald) throw new Error(`rollen "${roll}" har inga kandidater kvar — alla är redan tagna av en annan roll`)
  tagna.add(`${monster(roll)}#${vald.n}`)

  // Steg 2: finsök bara den valda.
  const b = sokTills(vald.f, uFin, FIN.marginal, FIN.skalor, FIN.vinklar, vald.grov)
  rendera(vald.f, { cx: b.cx, cy: b.cy, s: b.s * skalaUt, a: b.a, tx: b.tx * skalaUt, ty: b.ty * skalaUt }, UTW, UTH, path.join(TMP, `${roll}.png`))

  lager[roll] = { kalla: vald.n, skala: +b.s.toFixed(4), vinkel: b.a, tx: +b.tx.toFixed(1), ty: +b.ty.toFixed(1), rest: +b.d.toFixed(4) }
  rester.push(b.d)
  const bortvalda = forsok.slice(1).map((v) => `#${v.n} ${v.grov.d.toFixed(3)}`).join(' ')
  console.log(`  ${roll.padEnd(11)} #${String(vald.n).padStart(3)}  ${b.s.toFixed(3)}  ${String(b.a).padStart(5)}°  ${String(Math.round(b.tx)).padStart(4)}  ${String(Math.round(b.ty)).padStart(4)}  ${b.d.toFixed(3)}` +
    (b.kant ? `  ⚠ ${KANT_VARNING}` : '') + (bortvalda ? `   (valde bort ${bortvalda})` : ''))
}

const sorted = rester.slice().sort((a, b) => a - b)
console.log(`\n  rest: median ${sorted[rester.length >> 1].toFixed(3)} · värst ${Math.max(...rester).toFixed(3)}`)
const kal = lager[Object.keys(cfg.roller).find((k) => cfg.roller[k].length === 1 && cfg.roller[k][0] === cfg.referens)]
console.log(`  KALIBRERING (referensen mot sig själv): skala ${kal.skala} · vinkel ${kal.vinkel}° · rest ${kal.rest}` +
  (kal.skala === 1 && kal.vinkel === 0 && kal.rest === 0 ? '  ✓' : '  ✗ MÄTAREN ÄR FEL'))

if (KONTROLL) {
  const roller = Object.keys(cfg.roller)
  magick(['montage', '-background', '#4a4a4a', '-fill', 'white', '-pointsize', '22',
    ...roller.flatMap((r) => ['-label', r, path.join(TMP, `${r}.png`)]),
    '-tile', '6x2', '-geometry', '300x+2+2', path.join(TMP, '_kontroll.png')])
  // Ögonlinjen som RAND: samma rad ur varje inriktat ansikte, staplade. Står de still
  // ligger ögonen i en rak kolumn — det är kontrollen ingen siffra ersätter.
  magick(['montage', ...roller.map((r) => path.join(TMP, `${r}.png`)),
    '-crop', `${UTW}x120+0+${Math.round(UTH * 0.30)}`, '-tile', '1x', '-geometry', '+0+1',
    path.join(TMP, '_ogonlinje.png')])
  console.log(`  kontroll: ${path.join(TMP, '_kontroll.png')} · ${path.join(TMP, '_ogonlinje.png')}`)
}

fs.writeFileSync(path.join(TMP, 'lager.json'), JSON.stringify({ ruta: { w: UTW, h: UTH }, lager }, null, 2))
console.log('')

// ---------------------------------------------------------------------------
// KLIPPET — från inriktade helbilder till riggens lager.
//
// Geometrin är avläst i utrutan (733x800) ur `_rutnat.png`, inte gissad:
// ögonlinjen y 341, nostippen 460, överläppen 512, hakan ~640, tröjan börjar ~650.
//
// Tre beslut som geometrin tvingade fram:
//   1. **Minerna klipps som OVALA lappar**, inte helbilder. Då kan varken hårfäste eller
//      tröja skvallra i en korsblekning — och tröjan BYTS mitt i fotoserien.
//   2. **Nederkanten tonas ut** före tröjan. Ett flytande huvud är ärligare än en halv
//      tröja som byter tryck mellan minerna.
//   3. **Varje lager trimmas till sitt eget innehåll** och bär sitt läge i manifestet.
//      Fjorton lager i full rutstorlek hade legat på ~33 MB i GPU-minne.
const G = {
  klipp: 508, // överläppens ovankant — här delas ansiktet i två halvor
  mjuk: 3, // mjuk kant i klippet, annars läses skarven som ett streck
  hakaTon: [636, 700], // alfan tonas 1 → 0 mellan dessa y (döljer tröjan)
  mun: { x: 283, y: 470, w: 170, h: 138 }, // mun-inre ur `gap`
  ogon: { x: 243, y: 286, w: 280, h: 108 }, // ögonlappen ur `blund`
  // ETT öga i taget: samma blund-bild, men maskad till en mjuk oval kring vardera ögat.
  // Lägena är AVLÄSTA i `ogon.webp` (ögonen ligger på y 346 i rutan, mitt 369, ±76), inte
  // gissade ur lappens ram — lappen är 14 px högerförskjuten mot ansiktets mittlinje.
  // Ovalen är 66 px bred: 10 px luft kvar till mittlinjen, så en blinkning med ETT öga
  // aldrig kan råka tona in en flik av det andra.
  oga: { cy: 346, mitt: 369, avst: 76, rx: 66, ry: 46, mjuk: 12 },
  min: { cx: 373, cy: 452, rx: 168, ry: 226, mjuk: 34 }, // minernas ovala lapp
}

const filUt = path.join('public', 'ansikte', PERSON)
fs.mkdirSync(filUt, { recursive: true })
// ⚠️ EN NY MIN MÅSTE VARA DISTINKT MOT DE NIO FÖRSTA, och det avgörs i BILD — inte av att
// rollen har ett eget namn. Tre kandidater prövades mot `min-*.webp` i montage och föll
// innan de kostade något: `blas` (#115) bär samma pluta som `sur`, `gapskratt` (#101) är
// samma vidöppna mun med slutna ögon som `het`, och `mums` (#98) är ett leende med slutna
// ögon precis som `nojd` och `lycksalig`. Var min kostar ~1,04 MB GPU-minne okomprimerat,
// och en min som läser som en annan gör dessutom reaktionen otydligare för barnet.
// De fyra som blev kvar täcker var sitt hål: öppen mun med ÖPPNA ögon (gäspning), vidöppna
// ögon OCH mun (chock), hopknipna ögon (skeptisk), tunga ut med öppna ögon (retas).
const MINER = ['sur', 'acklad', 'het', 'lycksalig', 'fundersam', 'forvanad', 'aj', 'nojd', 'skratt',
  'gasp', 'chock', 'skeptisk', 'retas']

// ⚠️ MASKEN MÅSTE SKÄRA I BEFINTLIG ALFA, INTE ERSÄTTA DEN. `-compose CopyOpacity`
// SÄTTER alfan från masken — då blev friläggningens genomskinliga bakgrund opak igen och
// både `ovre` och `undre` kom ut som 733x697 i full rutstorlek, alltså identiska.
// `Dst_In` behåller destinationen där källan är opak, och alfarna skär i varandra.
// Masken byggs därför på `xc:none` (genomskinlig) och ritas med vitt.
const skar = (mask) => ['(', '-size', `${UTW}x${UTH}`, 'xc:none', '-fill', 'white', ...mask, ')', '-compose', 'Dst_In', '-composite']

// Nederkanten tonas ut före tröjan: vit rektangel ner till hakan + oskärpa = mjuk ton.
const hakaMask = () => skar(['-draw', `rectangle 0,0 ${UTW},${G.hakaTon[0]}`, '-blur', `0x${Math.round((G.hakaTon[1] - G.hakaTon[0]) / 3)}`])

const bbox = (f) => {
  const m = /^(\d+)x(\d+)\+(-?\d+)\+(-?\d+)$/.exec(magick([f, '-format', '%@', 'info:']).trim())
  return { w: +m[1], h: +m[2], x: +m[3], y: +m[4] }
}
// Trimma till innehållet, skriv webp, och returnera lagrets läge i rutan.
function skriv(tmpPng, namn) {
  const b = bbox(tmpPng)
  const ut = path.join(filUt, `${namn}.webp`)
  magick([tmpPng, '-crop', `${b.w}x${b.h}+${b.x}+${b.y}`, '+repage', '-quality', '86', '-define', 'webp:method=6', ut])
  return { fil: `${namn}.webp`, x: b.x, y: b.y, w: b.w, h: b.h, kb: Math.round(fs.statSync(ut).size / 1024) }
}

const N = path.join(TMP, 'neutral.png')
const halvor = {}
// ⚠️ BAS-LAGRET LÖSER GLIPAN. När käken sjunker öppnar sig ett band mellan halvorna, och
// utan något bakom syns BAKGRUNDEN tvärs över kinderna — uppmätt som ett ljust streck i
// hela ansiktets bredd redan vid 25 px gap. Hela det inriktade neutralansiktet ligger
// därför underst: i mitten täcks det av mun-inre, och vid sidorna (där en riktig käke
// knappt rör sig) visar det rätt hud. I vila täcks basen helt av halvorna.
magick([N, ...hakaMask(), path.join(TMP, '_bas.png')])
halvor.bas = skriv(path.join(TMP, '_bas.png'), 'bas')
for (const [namn, uppat] of [['ovre', true], ['undre', false]]) {
  const p = path.join(TMP, `_${namn}.png`)
  const y0 = uppat ? -10 : G.klipp
  const y1 = uppat ? G.klipp : UTH + 10
  magick([N, ...skar(['-draw', `rectangle 0,${y0} ${UTW},${y1}`, '-blur', `0x${G.mjuk}`]), ...hakaMask(), p])
  halvor[namn] = skriv(p, namn)
}

// Mun-inre ur gap-bilden: en lapp bakom halvorna, mjuk i kanterna.
const munP = path.join(TMP, '_mun.png')
magick([path.join(TMP, 'gap.png'), '-crop', `${G.mun.w}x${G.mun.h}+${G.mun.x}+${G.mun.y}`, '+repage',
  '(', '-size', `${G.mun.w}x${G.mun.h}`, 'xc:none', '-fill', 'white',
  '-draw', `roundrectangle 8,6 ${G.mun.w - 8},${G.mun.h - 6} 26,26`, '-blur', '0x7', ')',
  '-compose', 'Dst_In', '-composite', munP])
const munLager = skriv(munP, 'mun')
munLager.x += G.mun.x
munLager.y += G.mun.y

// Ögonlappen ur blund-bilden — bara ögonen, mjuk oval kant, för blinkningen.
const ogonP = path.join(TMP, '_ogon.png')
magick([path.join(TMP, 'blund.png'), '-crop', `${G.ogon.w}x${G.ogon.h}+${G.ogon.x}+${G.ogon.y}`, '+repage',
  '(', '-size', `${G.ogon.w}x${G.ogon.h}`, 'xc:none', '-fill', 'white',
  '-draw', `ellipse ${G.ogon.w / 2},${G.ogon.h / 2} ${G.ogon.w / 2 - 10},${G.ogon.h / 2 - 8} 0,360`, '-blur', '0x9', ')',
  '-compose', 'Dst_In', '-composite', ogonP])
const ogonLager = skriv(ogonP, 'ogon')
ogonLager.x += G.ogon.x
ogonLager.y += G.ogon.y

// EN ÖGONLAPP PER ÖGA — winken, och den trötta halvblundningen.
// Materialet har visserligen fem foton där personen blinkar med ett öga, men de är HELA
// miner: de bär också sin egen mun, så en wink hade uteslutit alla andra munlägen (och
// kostat 1,04 MB). Samma blund-bild maskad till en oval per öga kostar 0,12 MB, går att
// kombinera med gap, tugg och vilken min som helst — och är dessutom rätt öga varje gång.
const ogonHalvor = {}
for (const [namn, sida] of [['ogon_v', -1], ['ogon_h', 1]]) {
  const p = path.join(TMP, `_${namn}.png`)
  const cx = G.oga.mitt + sida * G.oga.avst - G.ogon.x // ovalens läge INNE i den beskurna lappen
  const cy = G.oga.cy - G.ogon.y
  magick([path.join(TMP, 'blund.png'), '-crop', `${G.ogon.w}x${G.ogon.h}+${G.ogon.x}+${G.ogon.y}`, '+repage',
    '(', '-size', `${G.ogon.w}x${G.ogon.h}`, 'xc:none', '-fill', 'white',
    '-draw', `ellipse ${cx},${cy} ${G.oga.rx},${G.oga.ry} 0,360`, '-blur', `0x${G.oga.mjuk}`, ')',
    '-compose', 'Dst_In', '-composite', p])
  const l = skriv(p, namn)
  l.x += G.ogon.x
  l.y += G.ogon.y
  ogonHalvor[namn] = l
}

// Minerna: oval lapp över ansiktets insida.
const minLager = {}
for (const m of MINER) {
  const p = path.join(TMP, `_min_${m}.png`)
  magick([path.join(TMP, `${m}.png`),
    ...skar(['-draw', `ellipse ${G.min.cx},${G.min.cy} ${G.min.rx},${G.min.ry} 0,360`, '-blur', `0x${G.min.mjuk}`]), p])
  minLager[m] = skriv(p, `min-${m}`)
}

const manifest = {
  person: PERSON,
  ruta: { w: UTW, h: UTH },
  geometri: { klipp: G.klipp, ogonlinje: 341, mun: G.mun },
  lager: { ...halvor, mun: munLager, ogon: ogonLager, ...ogonHalvor },
  miner: minLager,
  kallor: Object.fromEntries(Object.entries(lager).map(([k, v]) => [k, v.kalla])),
}
fs.writeFileSync(path.join(filUt, 'manifest.json'), JSON.stringify(manifest, null, 2))
const totalKb = [...Object.values(manifest.lager), ...Object.values(minLager)].reduce((s, l) => s + l.kb, 0)
console.log(`  lager: ${Object.keys(manifest.lager).join(' · ')} + ${MINER.length} miner`)
for (const [k, v] of Object.entries({ ...manifest.lager, ...minLager })) console.log(`    ${k.padEnd(14)} ${String(v.w).padStart(4)}x${String(v.h).padStart(3)} @ ${String(v.x).padStart(3)},${String(v.y).padStart(3)}  ${v.kb} kB`)
console.log(`\n  TOTALT ${totalKb} kB (budget 3072 kB)  ${totalKb <= 3072 ? '✓' : '✗ ÖVER BUDGET'}\n`)
