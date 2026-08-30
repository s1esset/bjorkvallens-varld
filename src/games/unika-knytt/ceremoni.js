// CEREMONIN — spelets bästa tjugo sekunder.
//
// F0 Spaken → F1 Suget → F2 Degen (BARNET KNÅDAR) → F3 Härdning + ljusstorm →
// F4 Poppen → F5 Fallet → fyra knackningar → skalet klyvs → VÄRLDEN STRÖMMAR UT →
// knyttet reser sig ur skalhalvan och står på världens egen mark.
//
// Den största risken i hela spelet är att det här blir en film man tittar på. Därför är
// F2 inte juice utan KRAVET: `knada(x, y)` deformerar en riktig `Mjukkropp` under fingret,
// och knådningen köper SPEKTAKEL (ljus, glitter, ljusstormens styrka) — aldrig framsteg.
// Degen härdas på sin egen klocka oavsett, så ingen kan misslyckas med att knåda för lite.
//
// `view` ska stå på (0, 0): allt härinne ritas i designkoordinater 1280×720.
// Rummet bakom släcks aldrig — ceremonin ADDERAR ljus, den släcker aldrig något.
//
// ⚠️ INGA gradientfyllningar på geometri som ritas om varje bildruta. `sphereFill`/
// `topLightFill` cachas PER FÄRG, och degens färg lerpas kontinuerligt under F3 — en
// gradient per bildruta hade bakat en ny textur 60 gånger i sekunden. Degen får därför
// sin volym av tre platta lager (mörk baksida · kropp · ljusfläck), och gradienter
// används bara på ytor som ritas EN gång: fonden, marken och det frysta ägget.

import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { Mjukkropp } from '../../lib/mjukkropp.js'
import { verticalFill, groundFill, topLightFill } from '../../lib/form.js'
import { lerpColor } from '../../lib/scene.js'
import { shade, tint } from '../../lib/theme.js'
import { bounceIn, burst, landa, liv, pop, puff, ripple, sparkle, squash } from '../../lib/feedback.js'
import { Emitter } from '../../lib/partiklar.js'
import { byggKnytt, stadKnytt } from './knytt.js'
import { REKVISITA } from './kupan.js'

// ---- geometri (designkoordinater) ------------------------------------------
const KNAD = { x: 640, y: 384 } // degens plats — mitt på skärmen, bekväm för ett finger
const AGG = { x: 640, y: 452 } // äggets vilo-läge i boet
const LYFT_Y = 300 // äggets läge under ljusstormen
const BO_Y = 505
const MARK_Y = 528 // världens markyta
const KNYTT_Y = 582 // knyttets fotpunkt — 110 px NEDANFÖR fondens underkant
const FOND = { y0: 126, y1: 472, halvB: 302 }

// Degens nominella mått. Målformen byggs med EXAKT samma mått och punktantal —
// hela äggformen bor i `form`-funktionen, inget annat får skilja dem åt.
const DEG_W = 150
const DEG_H = 140
const PUNKTER = 14
const AGG_SKALA = 1.35 // display-nodens slutskala (ALDRIG Mjukkropp.skala())

// Fasgränser i sekunder. Klockan är spelets, inte gsap:s, för `skynda()` måste kunna
// korta ÅTERSTÅENDE tidslinje — det går inte att göra på en timeline utan att bilden
// hoppar.
const FAS = [
  { namn: 'F0', t: 0.0 },
  { namn: 'F1', t: 0.35 },
  { namn: 'F2', t: 1.55 },
  { namn: 'F3', t: 3.6 },
  { namn: 'F4', t: 5.3 },
  { namn: 'F5', t: 5.75 },
]
const SLUT = 6.5
const SKYND_TAK = 1.2 // hur mycket barnets petande får korta hela ceremonin
const SKYND_STEG = 0.12
const KNACK_SPARR = 0.18 // sekunder mellan räknade knackningar
const KNACK_TONER = [440, 466, 494]

// Världstoner. Fyra världar, indexerade som `dna.varld`. `nyckel` slår upp rekvisitan.
const VARLDSTON = [
  { nyckel: 'skog', him: [0xbfe6ff, 0xeaf7dc], mark: 0x6ea63f, luft: 0xcfe98a, stoft: [0x9ede5a, 0xffe27a, 0xd9f2a3] },
  { nyckel: 'vatten', him: [0xb6ecff, 0xe2f7ff], mark: 0x3f97c4, luft: 0x8fdcf5, stoft: [0x7fd8f2, 0xcaf2ff, 0xffffff] },
  { nyckel: 'sno', him: [0xd9ecff, 0xf6fbff], mark: 0xc4dbe9, luft: 0xeaf6ff, stoft: [0xffffff, 0xdcefff, 0xbfe0f5] },
  { nyckel: 'natt', him: [0x39306c, 0x7161ad], mark: 0x4a4080, luft: 0x9b8ede, stoft: [0xffe9a8, 0xc9bcff, 0xffffff] },
]

// Rekvisitans platser. VAR ett föremål hör hemma står i dess EGEN data, inte här:
// `luft` 0 = står på marken · 0,5 = svävar i midjehöjd · 1 = hänger i skyn. Och de två
// slagen ritas med olika origo — ett marktföremål ritas UPPÅT från y = 0 (trädets stam
// går från −0,92·s till 0), ett himlaföremål centrerat kring origo (solen är en cirkel
// i 0,0). Att behandla dem lika lät solen sitta i gräset och trädet sväva 44 px ovanför
// marken; båda syntes bara i skärmdumpen.
//
// Talen är dessutom mätta mot GRANNARNAS TRÄFFYTOR, inte mot deras konst — det är två
// olika budgetar. Verkstan har ytor som lever kvar medan världen står framme:
//   spaken   Rect(-100,-120,200,240) @ (1160,350) → x 1060–1260 · y 230–470
//   hyllbon  Rect(-48,-48,96,96) @ (90|210|330, 620) → x 42–378 · y 572–668
// Den fjärde rekvisitan låg först på x 1096 och stack då 98 px in i spakens träffyta.
const MARK_PLATS = [{ x: 186, s: 96 }, { x: 430, s: 76 }, { x: 900, s: 88 }]
const MELLAN_PLATS = { x: 862, y: 356, s: 72 }
const HIMMEL_PLATS = { x: 400, y: 220, s: 86 }
const PROP_TONER = [392, 466, 523, 659] // en stämd trappa, ett steg per föremål som landar

const DEG_BAS = 0xe8d3a8 // rå degfärg innan världen färgar den
const HALM = 0xc9a15a

const klam = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t

// Äggprofilen som en radiefaktor per vinkel. Vinkeln kommer ur `Mjukkropp`s egen
// utläggning: −π/2 är toppen, +π/2 botten, 0 höger sida.
//   topp 0,79 · botten 1,21 · sidor 0,70  →  smal topp, tung botten, och bredaste
// punkten en bit NEDANFÖR mitten. Det är skillnaden mellan ett ägg och en oval.
//
// Talen är MÄTTA, inte valda. Den morfade kroppen landar på topp 62,8 / botten 77,0 /
// sidor 56,4 px — kvoten topp/botten 0,82 och höjd/bredd 1,25 — och det ligger inom
// 0,09 px från en kropp byggd DIREKT på den här formen. Första ansatsen (0,13 · 0,22)
// gav kvoten 0,88 och 1,14, och läste i bild som en oval snarare än ett ägg.
function aggForm(a) {
  const c = Math.cos(a)
  return 1 - 0.3 * c * c + 0.21 * Math.sin(a)
}

// Sluten mjuk kurva genom en punktring — samma kvadratiska mellansteg som
// `Mjukkropp.path()`, men på en LISTA i stället för på en levande kropp. Behövs för
// det frysta ägget och skalhalvorna, som lever vidare efter att kroppen är riven.
function mjukKurva(g, pts) {
  const n = pts.length
  if (n < 3) return g
  const mitt = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const m = mitt(pts[n - 1], pts[0])
  g.moveTo(m.x, m.y)
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const nasta = mitt(a, pts[(i + 1) % n])
    g.quadraticCurveTo(a.x, a.y, nasta.x, nasta.y)
  }
  g.closePath()
  return g
}

function halvBredd(pts) {
  let m = 1
  for (const p of pts) m = Math.max(m, Math.abs(p.x))
  return m
}

function halvHojd(pts) {
  let m = 1
  for (const p of pts) m = Math.max(m, Math.abs(p.y))
  return m
}

// Närmaste punkt på en sluten polygon, plus vilken kant den ligger på. Används för att
// projicera sprickans ändpunkter ut på skalets kontur, så de två halvorna delar exakt
// samma tandade söm och passar ihop som två bitar av samma ägg.
function narmastPa(poly, p) {
  let bast = { x: poly[0].x, y: poly[0].y, i: 0, d: Infinity }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const ex = b.x - a.x
    const ey = b.y - a.y
    const l2 = ex * ex + ey * ey || 1e-6
    const t = klam(((p.x - a.x) * ex + (p.y - a.y) * ey) / l2, 0, 1)
    const qx = a.x + ex * t
    const qy = a.y + ey * t
    const d = (qx - p.x) ** 2 + (qy - p.y) ** 2
    if (d < bast.d) bast = { x: qx, y: qy, i, d }
  }
  return bast
}

// Hörnen framåt från a till b (inklusive båda), runt ringen.
function varvet(poly, a, b) {
  const n = poly.length
  const ut = []
  let i = ((a % n) + n) % n
  for (let k = 0; k < n; k++) {
    ut.push(poly[i])
    if (i === b) break
    i = (i + 1) % n
  }
  return ut
}

function tyngd(poly) {
  let x = 0
  let y = 0
  for (const p of poly) {
    x += p.x
    y += p.y
  }
  return { x: x / poly.length, y: y / poly.length }
}

/**
 * Klyv skalet längs sprickvägen. `bana` är sprickans punkter i skalets egen rymd;
 * ändpunkterna projiceras ut på konturen och sömmen blir gemensam för båda halvorna.
 * Returnerar två slutna polygoner som tillsammans täcker hela ägget.
 */
function klyvSkal(poly, bana) {
  const p0 = narmastPa(poly, bana[0])
  const p1 = narmastPa(poly, bana[bana.length - 1])
  const som = [{ x: p0.x, y: p0.y }, ...bana, { x: p1.x, y: p1.y }]
  const bak = som.slice().reverse()
  const a = som.concat(varvet(poly, (p1.i + 1) % poly.length, p0.i))
  const b = bak.concat(varvet(poly, (p0.i + 1) % poly.length, p1.i))
  return [a, b]
}

/**
 * Städhjälparen. `gsap.killTweensOf(rot)` når BARA roten — skalflisor, rekvisita, ögon
 * och svansar är barnbarn och överlever `destroy({children:true})` med LEVANDE tweens,
 * helt tyst. Den här går igenom varje nod OCH dess `.scale` (gsap ser dem som två mål)
 * OCH feedback-hjälparnas egna handtag, som tweenar proxy-objekt och därför aldrig nås
 * av `killTweensOf(noden)`.
 */
function stadTrad(nod) {
  if (!nod || nod.destroyed) return
  nod._fxLiv?.kill()
  nod._fxShakeTw?.kill()
  nod._fxPopTl?.kill()
  nod._fxSquashTl?.kill()
  nod._fxHopTl?.kill()
  nod._fxWiggleTl?.kill()
  nod._wPuls?.kill()
  gsap.killTweensOf(nod)
  if (nod.scale) gsap.killTweensOf(nod.scale)
  // Flaggorna nollas också. En dödad effekt hinner aldrig köra sin `onComplete`, så
  // `_fxScaleBusy` hade stått kvar som `true` — och nästa `pop`/`squash` läser då ett
  // GAMMALT viloläge som ny bas i stället för nodens verkliga skala.
  nod._fxScaleBusy = false
  nod._fxWiggleBusy = false
  nod._fxHopBusy = false
  nod._fxShakeBusy = false
  const barn = nod.children
  if (barn) for (let i = barn.length - 1; i >= 0; i--) stadTrad(barn[i])
}

export function byggCeremoni(opts = {}) {
  const audio = opts.audio || null
  const pa = typeof opts.pa === 'function' ? opts.pa : () => {}
  // `opts.fxLayer` tas emot men används med flit INTE: ceremonins partiklar bor i ett
  // eget lager inuti `view`, som rivs med omgången. `ctx.fxLayer` lever hela appens
  // livstid, och ett partikelfält som cachas där behåller sina GPU-buffertar för alltid.

  let levande = true
  let rivet = false

  // ---- lager -------------------------------------------------------------
  const view = new Container()
  // Ceremonin äger INGA träffytor — index.js fångar varje tryck med sin heltäckande
  // fångare under den här roten. `eventMode = 'none'` gör bara roten själv till en
  // icke-träff; utan `interactiveChildren = false` traverseras barnen fortfarande, och
  // en enda transient nod som glömt sitt eventMode hade kunnat svälja ett tryck mitt i
  // en fas. Båda sätts, en gång.
  view.eventMode = 'none'
  view.interactiveChildren = false
  const bak = new Container() // fonden (himmel + markband + drivande partiklar)
  const markLag = new Container() // världens mark
  const propLag = new Container() // rekvisitan som strömmar ut
  const stralLag = new Container() // ljusstormens kilar
  const scen = new Container() // bo, ägg, skalhalvor
  const figurLag = new Container() // knyttet
  const fx = new Container() // partiklar, puffar, ringar — SPELETS eget fx-lager
  for (const l of [bak, markLag, propLag, stralLag, scen, figurLag, fx]) {
    l.eventMode = 'none'
    view.addChild(l)
  }

  // Ägget bärs av fem noder, EN transform per nivå — så ingen animation slåss med
  // någon annan och ingenting som bär en träffyta någonsin flyttar sig:
  //   aggRot   fast läge, rör sig aldrig
  //   aggFall  lyftet och fallet (y)
  //   aggVilo  den lugna vaggningen i boet (rotation, evig)
  //   aggVagga knackningarnas ryck (rotation)
  //   aggSkal  växten + squash/landa (scale)
  const aggRot = new Container()
  aggRot.position.set(AGG.x, AGG.y)
  const aggFall = new Container()
  const aggVilo = new Container()
  const aggVagga = new Container()
  const aggSkal = new Container()
  aggRot.addChild(aggFall)
  aggFall.addChild(aggVilo)
  aggVilo.addChild(aggVagga)
  aggVagga.addChild(aggSkal)

  const degBak = new Graphics() // mörk baksida — ger silhuetten en kontur utan streck
  const degG = new Graphics() // kroppen
  const degLjus = new Graphics() // ljusfläcken uppe till vänster
  const ljusG = new Graphics() // ljuset som läcker ut ur sprickorna
  const sprickG = new Graphics()
  aggSkal.addChild(degBak, degG, degLjus, ljusG, sprickG)

  // Boet ritas centrerat i sina egna hållare — en bar Graphics ritad i origo med en
  // stor `.position` renderas som en helskärmsstapel, och en `bounceIn` på en Graphics
  // vars geometri ligger vid (640, 505) skulle skala den mot skärmens hörn.
  const boBakH = new Container()
  const boFramH = new Container()
  boBakH.position.set(AGG.x, BO_Y)
  boFramH.position.set(AGG.x, BO_Y)
  const boBak = new Graphics()
  const boFram = new Graphics()
  boBakH.addChild(boBak)
  boFramH.addChild(boFram)
  const aggSkugga = new Graphics()
  const SCEN_FAST = [aggSkugga, boBakH, aggRot, boFramH]
  scen.addChild(...SCEN_FAST)

  // ---- tillstånd ---------------------------------------------------------
  let dnaNu = null
  let ton = VARLDSTON[0]
  let lage = 'vila' // 'vila' | 'ceremoni' | 'knack' | 'varld' | 'klar'
  let t = 0 // ceremonins klocka
  let ur = 0 // monoton klocka (knack-spärren)
  let fasIx = -1
  let skyndKvar = SKYND_TAK
  let ack = 0 // ackumulator för det fasta tidssteget
  let morf = 0
  let lyster = 0 // hur mycket barnet knådat — köper spektakel, aldrig framsteg
  let bubbel = 0
  let bubbelA = 0
  let knackAntal = 0
  let sistKnack = -9
  let deg = null
  let facit = null
  let ankare = { x: KNAD.x, y: KNAD.y } // det värde `flyttaTill()` förankras mot
  let ritmitt = { x: KNAD.x, y: KNAD.y } // ringens VERKLIGA mitt — se byggDeg()
  let kantR = null
  let ekerR = null
  let areaR = 1
  let kantA = null
  let ekerA = null
  let areaA = 1
  let aggPoly = null // frysta konturen, i aggSkal-lokala px (OSKALAD)
  let halvB = 60
  let halvH = 70
  let aggMal = 0xffd7a0 // äggets slutfärg, räknad EN gång per omgång
  let aggFarg = aggMal
  let sugKorn = []
  let halvor = []
  let stoftFlod = null
  let knytt = null
  let knyttHall = null
  // Knyttet LÄMNAS ÖVER till index.js i samma andetag som `'klar'` fyras — det är
  // spelets figur därefter, inte ceremonins. Efter det tickar och river ceremonin det
  // aldrig mer; två tickar per bildruta hade fördubblat dess andning och blink.
  let overlamnat = false
  let ko = [] // reservkö om ingen `senare` skickats in
  let tweens = []

  // Eviga och långlivade tweens samlas här och rensas på `tw.parent` — sann för både
  // löpande OCH väntande tweens, falsk för både färdiga och DÖDADE. `isActive()` kan
  // inte skilja levande från dödad på en `repeat:-1` (den ger false och totalProgress 0)
  // och släpper igenom en död för alltid. Ingenting vräks; listan komprimeras bara.
  function spara(tw) {
    if (!tw) return tw
    if (tweens.length > 48) tweens = tweens.filter((x) => x && x.parent)
    tweens.push(tw)
    return tw
  }

  function koLagg(sek, fn) {
    ko.push({ kvar: Math.max(0, sek), fn })
  }

  const senareRa = typeof opts.senare === 'function' ? opts.senare : koLagg
  // Varje fördröjt anrop bär sin egen livsvakt — spelaren kan lämna mitt i vad som helst.
  const strax = (sek, fn) => senareRa(sek, () => { if (levande) fn() })

  // ---- ljud --------------------------------------------------------------
  const sfx = (n) => audio?.sfx?.(n)
  const ton1 = (o) => audio?.tone?.(o)

  function kachunk(stor) {
    ton1({
      freq: stor ? 118 : 104,
      dur: stor ? 0.34 : 0.26,
      type: 'square',
      vol: stor ? 0.24 : 0.19,
      slideTo: stor ? 44 : 56,
    })
    sfx('flip')
  }

  // ---- degen ritas -------------------------------------------------------

  function ritaDeg(farg) {
    if (!deg || !deg.pts.length) return
    const pts = []
    for (let i = 0; i < deg.n; i++) pts.push({ x: deg.pts[i].x - ritmitt.x, y: deg.pts[i].y - ritmitt.y })
    degBak.clear()
    mjukKurva(degBak, pts).fill(shade(farg, 0.34))
    degBak.y = 5
    degG.clear()
    mjukKurva(degG, pts).fill(farg)
    // Ljusfläcken är samma silhuett krympt mot en punkt uppe till vänster — den
    // deformeras alltså MED degen i stället för att glida runt som en lös ellips.
    const c = { x: -halvBredd(pts) * 0.26, y: -halvHojd(pts) * 0.3 }
    const ljus = pts.map((p) => ({ x: c.x + (p.x - c.x) * 0.62, y: c.y + (p.y - c.y) * 0.62 }))
    degLjus.clear()
    mjukKurva(degLjus, ljus).fill({ color: tint(farg, 0.42), alpha: 0.42 + 0.24 * lyster })
  }

  // Ljusstormen: 14 kilar i EN Graphics, alla med SAMMA färg (många former i en
  // Graphics tar ändå den första fyllningens färg — här är det ett val, inte en fälla).
  // Normal alfa 0,18–0,30; additivt över appens creme vitklipper 74,3 % av pixlarna.
  // Täckningen är 14 × 6° = 23 % av skivan, alltså under taket på 30 % av duken.
  function byggStralar() {
    for (const c of stralLag.removeChildren()) c.destroy({ children: true })
    const g = new Graphics()
    const R = 540
    const h = 0.052
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      g.moveTo(0, 0)
      g.lineTo(Math.cos(a - h) * R, Math.sin(a - h) * R)
      g.lineTo(Math.cos(a + h) * R, Math.sin(a + h) * R)
      g.closePath()
    }
    g.fill(tint(ton.luft, 0.62))
    g.eventMode = 'none'
    stralLag.addChild(g)
    stralLag.position.set(AGG.x, LYFT_Y)
    stralLag.alpha = 0
    stralLag.rotation = 0
  }

  function ritaBo() {
    boBak.clear().ellipse(0, -14, 122, 40).fill(shade(HALM, 0.3))
    boFram.clear().ellipse(0, 11, 118, 40).fill(topLightFill(HALM, { highlight: 0.24, dark: 0.26 }))
    // Strån: korta bågar längs framkanten. En stroke på ÖPPNA vägar drar inga streck
    // tvärs över silhuetten, till skillnad från en kontur runt överlappande former.
    for (let i = 0; i < 18; i++) {
      const a = Math.PI * (0.06 + (i / 17) * 0.88)
      const x = -Math.cos(a) * 112
      const y = 11 + Math.sin(a) * 34
      boFram.moveTo(x - 13, y - 5)
      boFram.quadraticCurveTo(x, y + 5, x + 13, y - 4)
    }
    boFram.stroke({ width: 3, color: shade(HALM, 0.34), alpha: 0.7, cap: 'round' })
  }

  // ---- suget (F1) --------------------------------------------------------

  function byggSug() {
    for (let i = 0; i < 26; i++) {
      const g = new Graphics()
      const r = 4 + Math.random() * 7
      const f = ton.stoft[(Math.random() * ton.stoft.length) | 0]
      if (i % 4 === 0 && g.star) g.star(0, 0, 5, r, r * 0.46).fill(f)
      else g.circle(0, 0, r).fill(f)
      g.eventMode = 'none'
      fx.addChild(g)
      const a0 = Math.random() * Math.PI * 2
      const r0 = 120 + Math.random() * 150
      g.position.set(KNAD.x + Math.cos(a0) * r0, KNAD.y + Math.sin(a0) * r0 * 0.66)
      sugKorn.push({ g, a0, r0, fart: 3.2 + Math.random() * 2.6, dropp: Math.random() * 0.25 })
    }
  }

  function stegSug(p) {
    for (const k of sugKorn) {
      if (k.g.destroyed) continue
      const e = klam((p - k.dropp) / (1 - k.dropp), 0, 1)
      const mjuk = e * e // accelererar in mot mitten
      const r = k.r0 * (1 - mjuk)
      const a = k.a0 + mjuk * k.fart
      k.g.position.set(KNAD.x + Math.cos(a) * r, KNAD.y + Math.sin(a) * r * 0.66)
      k.g.scale.set(klam(1 - mjuk * 0.85, 0.1, 1))
      k.g.alpha = klam(1 - mjuk * 0.6, 0, 1)
    }
  }

  function rivSug() {
    for (const k of sugKorn) if (!k.g.destroyed) k.g.destroy()
    sugKorn = []
  }

  // ---- mjukkroppen -------------------------------------------------------

  function byggDeg() {
    // Degens viloform är lätt knölig, och knölarna kommer ur knyttets EGNA drag —
    // två knytt får alltså inte ens samma degklump.
    const amp = klam((dnaNu?.prop?.brusAmp ?? 3) / 42, 0, 0.13)
    const frek = Math.max(2, Math.round(dnaNu?.prop?.brusFrek ?? 3))
    const fas = Number.isFinite(dnaNu?.prop?.fas) ? dnaNu.prop.fas : 0
    const degForm = (a) => 1 + amp * Math.sin(a * frek + fas)

    deg = new Mjukkropp({
      x: KNAD.x, y: KNAD.y, w: DEG_W, h: DEG_H, punkter: PUNKTER,
      grav: 0, damp: 0.9, iter: 6, tryck: 1, styvhet: 1, maxSpeed: 20, form: degForm,
    })
    // Målformen är en EGEN kropp med SAMMA punktantal och SAMMA nominella mått —
    // vilolängderna läses ur den i stället för att hittas på för hand. Den stegas
    // aldrig; den är bara en talkälla, och rivs som allt annat vid exit.
    facit = new Mjukkropp({ x: 0, y: 0, w: DEG_W, h: DEG_H, punkter: PUNKTER, form: aggForm })

    kantR = deg._kant.slice()
    ekerR = deg._eker.slice()
    areaR = deg._viloArea
    kantA = facit._kant0.slice()
    ekerA = facit._eker0.slice()
    areaA = facit._viloArea0

    // Ankaret är kroppens `tyngdpunkt` läst EN gång vid födseln — inte det (x, y) som
    // skickades in. Punkterna läggs ut runt en ellips och medelvärdet hamnar inte
    // nödvändigtvis där man bad om.
    const tp = deg.tyngdpunkt
    ankare = { x: tp.x, y: tp.y }

    // ⚠️ UPPMÄTT: `tyngdpunkt` är INTE ritbar mitt. Getteren summerar alla n+1 punkter
    // (ringen PLUS mittpunkten) men delar med n, så den returnerar ringens mitt gånger
    // (n+1)/n — för en kropp på (640, 384) med 14 punkter blir det (685,7 · 411,4),
    // alltså 46 px höger och 27 px ner. `flyttaTill()` räknar likadant, så ATT
    // FÖRANKRA mot den är rätt och driftfritt (0,011 px över 300 knådade steg) — men
    // att RITA mot den hade lagt hela ägget snett i förhållande till boet och till
    // fingret. Ringens verkliga mitt läses därför separat, en gång, och står stilla
    // exakt så länge ankaret gör det.
    let sx = 0
    let sy = 0
    for (let i = 0; i < deg.n; i++) {
      sx += deg.pts[i].x
      sy += deg.pts[i].y
    }
    ritmitt = { x: sx / deg.n, y: sy / deg.n }
    deg.mjukhet(0.8)
    morf = 0
    ack = 0
  }

  /**
   * Morfa viloformen mot ägget. Det finns ingen publik väg att ändra en `Mjukkropp`s
   * viloform — `form(a)` är konstruktor-only med flit — så de tre privata fälten
   * skrivs här, på ETT ställe.
   *
   * ⚠️ `_kant` är den som bär silhuetten: kanten körs med `min(1, k*2.2)` och ekrarna
   * med `k*0.5`. En morf som bara lerpar `_eker` + `_viloArea` ger en nästan RUND kropp
   * (uppmätt topp 47,6 / botten 48,5 px — morfen syns knappt). Med `_kant` med blir det
   * 42,4 / 53,4, exakt som en kropp byggd direkt på äggformen.
   * ⚠️ `_viloArea` är KVADRATISK i skalan. Vi rör ALDRIG `Mjukkropp.skala()` (den
   * räknar om `_kant`/`_eker` ur de orörda byggmåtten och raderar lerpen varje bildruta,
   * och ett anrop med samma värde två rutor i rad är dessutom en nullhandling), så
   * skalan är 1 här — ägget växer i DISPLAY-nodens `scale`, aldrig i talen.
   */
  function satMorf(k) {
    if (!deg || !kantA) return
    const s = 1
    for (let i = 0; i < deg.n; i++) {
      deg._kant[i] = lerp(kantR[i], kantA[i], k)
      deg._eker[i] = lerp(ekerR[i], ekerA[i], k)
    }
    deg._viloArea = lerp(areaR, areaA, k) * s * s
  }

  // Fast tidssteg, alltid `steg(1)`. Ett för STORT steg viker ihop kroppen för gott
  // (7,9 px sammantryckning vid dtF 1 mot 34,9 px vid dtF 2, kvar efter 300 lugna
  // bildrutor); ett för litet ger en HELT ANNAN jämvikt. Taket på tre steg finns för
  // att en dold flik inte ska betala igen en halv minut på en bildruta.
  function stegDeg(dtF) {
    if (!deg || !deg.pts.length) return
    ack = klam(ack + (Number.isFinite(dtF) ? dtF : 1), 0, 4)
    for (let i = 0; i < 3 && ack >= 1; i++) {
      ack -= 1
      deg.steg(1)
      // Obligatoriskt efter VARJE steg: en asymmetrisk kropp driver annars +2257 px
      // på 300 steg med noll gravitation och noll krafter. Ett ägg ÄR asymmetriskt.
      deg.flyttaTill(ankare.x, ankare.y)
    }
  }

  // Degen bubblar av sig själv: en långsamt vandrande, formbevarande knuff. Ett
  // UNIFORMT kraftfält vore verkningslöst här — `flyttaTill()` drar bort exakt den
  // translation ett jämnt fält ger, så klumpen hade legat blickstilla tills barnet
  // rörde den.
  function bubbla(dt, styrka) {
    if (!deg || !deg.pts.length) return
    bubbel += dt
    if (bubbel < 0.14) return
    bubbel = 0
    bubbelA += 1.1
    deg.knuff(ritmitt.x + Math.cos(bubbelA) * 66, ritmitt.y + Math.sin(bubbelA) * 60, 1.7 * styrka, 78, { form: true })
    deg.flyttaTill(ankare.x, ankare.y)
  }

  // ---- faserna -----------------------------------------------------------

  function gaTill(ix) {
    fasIx = ix
    const f = FAS[ix]
    pa('fas', f.namn)
    if (f.namn === 'F0') kachunk(false)
    else if (f.namn === 'F1') startSug()
    else if (f.namn === 'F2') startDeg()
    else if (f.namn === 'F3') startHardning()
    else if (f.namn === 'F4') startPopp()
    else if (f.namn === 'F5') startFall()
  }

  function startSug() {
    byggSug()
    // EN brus-slinga (en slingas frekvens är låst efter start) plus en TRAPPA av korta
    // toner — det är så ett STIGANDE sug måste byggas. Trappan schemaläggs med
    // `senare`, ALDRIG med `tone({ delay })`: ett delay ligger på ljudmotorns egen
    // klocka, sparas ingenstans och skulle fortsätta spela på menyn efter exit.
    audio?.loop?.('knyttsug', { typ: 'brus', freq: 300, q: 0.8, vol: 0.1 })
    const trappa = [330, 392, 466, 554, 659]
    trappa.forEach((f, i) => strax(i * 0.2, () => ton1({ freq: f, dur: 0.16, type: 'triangle', vol: 0.15 })))
  }

  function startDeg() {
    audio?.stopLoop?.('knyttsug')
    rivSug()
    byggDeg()
    aggFall.y = KNAD.y - AGG.y
    aggSkal.scale.set(1)
    puff(fx, KNAD.x, KNAD.y, { count: 12, color: DEG_BAS })
    ton1({ freq: 196, dur: 0.22, type: 'sine', vol: 0.18, slideTo: 262 })
    pa('deg')
  }

  function startHardning() {
    // En lång svällning under hela härdningen — ett stigande ljud som ÄR fasen.
    ton1({ freq: 262, dur: 1.5, type: 'sine', vol: 0.11, slideTo: 523 })
    byggStralar()
    pa('harda')
  }

  function startPopp() {
    sakraAgg()
    frysAgg()
    pa('pop')
    sfx('pop')
    ton1({ freq: 880, dur: 0.24, type: 'triangle', vol: 0.2 })
    blomning()
    burst(fx, AGG.x, LYFT_Y, { count: Math.round(14 + 10 * lyster), colors: ton.stoft, power: 1.2 })
    sparkle(fx, AGG.x, LYFT_Y, { count: 8 })
    ripple(fx, AGG.x, LYFT_Y, { color: tint(ton.luft, 0.5), maxR: 190, duration: 0.62, width: 8, alpha: 0.5 })
    spara(gsap.to(stralLag, { alpha: 0, duration: 0.4, ease: 'power2.out' }))
    ritaBo()
    boBakH.visible = true
    boFramH.visible = true
    bounceIn(boBakH, { duration: 0.34 })
    bounceIn(boFramH, { duration: 0.36, delay: 0.03 })
  }

  function startFall() {
    ton1({ freq: 320, dur: 0.26, type: 'sine', vol: 0.16, slideTo: 118 })
    aggSkugga.clear().ellipse(AGG.x, BO_Y + 34, 104, 20).fill({ color: 0x000000, alpha: 0.15 })
    aggSkugga.alpha = 0
    spara(gsap.to(aggSkugga, { alpha: 1, duration: 0.4 }))
    spara(gsap.to(aggFall, {
      y: 0,
      duration: 0.44,
      ease: 'power2.in',
      onComplete: () => {
        if (!levande || aggSkal.destroyed) return
        landa(aggSkal, { intensity: 0.9, base: { x: AGG_SKALA, y: AGG_SKALA } })
        sfx('tap')
        ton1({ freq: 132, dur: 0.14, type: 'sine', vol: 0.16 })
        puff(fx, AGG.x, BO_Y + 6, { count: 12, color: 0xd8c39a })
        vagga(1)
      },
    }))
  }

  /**
   * Allt F3 gör, garanterat färdigt. Kallas alltid före frysningen — både när fasen
   * körts normalt och när `hoppaTillFall()` hoppat förbi den.
   *
   * Skälet till att den kör 18 extra fasta steg även i det normala fallet: `morf` når 1
   * i SAMMA bildruta som F4 börjar, och kroppen hinner då inte relaxera in i de nya
   * vilolängderna. Utan de här stegen fryses en nästan rund klump — utan ett konsolfel.
   */
  function sakraAgg() {
    if (!deg) byggDeg()
    morf = 1
    satMorf(1)
    deg.mjukhet(0)
    deg.falt(0, 0)
    for (let i = 0; i < 18; i++) {
      deg.steg(1)
      deg.flyttaTill(ankare.x, ankare.y)
    }
    aggFall.y = LYFT_Y - AGG.y
    aggSkal.scale.set(AGG_SKALA)
  }

  /**
   * FRYS ÄGGET. Efter poppen ska skalet vara en stabil form som går att spricka och
   * klyva — en levande mjukkropp går inte att dela i två halvor som passar ihop.
   * Konturen läses av EN gång, kroppen rivs, och resten av spelet ritar mot talen.
   *
   * ⚠️ Efter `destroy()` KASTAR `path()` och `fyllnad()` (`pts` töms men `n` står kvar),
   * så varje läsning härifrån och framåt går mot `aggPoly`, aldrig mot kroppen.
   */
  function frysAgg() {
    if (!deg || !deg.pts.length) return
    aggPoly = []
    for (let i = 0; i < deg.n; i++) aggPoly.push({ x: deg.pts[i].x - ritmitt.x, y: deg.pts[i].y - ritmitt.y })
    halvB = halvBredd(aggPoly)
    halvH = halvHojd(aggPoly)
    deg.destroy()
    facit?.destroy()
    deg = null
    facit = null

    aggFarg = aggMal
    // Nu ritas ägget EN gång — då är en cachad gradient både gratis och rätt: ett
    // rundat föremål belyst uppifrån.
    degBak.clear()
    mjukKurva(degBak, aggPoly).fill(shade(aggFarg, 0.32))
    degBak.y = 4
    degG.clear()
    mjukKurva(degG, aggPoly).fill(topLightFill(aggFarg, { highlight: 0.34, dark: 0.22 }))
    degG.stroke({ width: 3, color: shade(aggFarg, 0.3), alpha: 0.55 })
    degLjus.clear()
    const c = { x: -halvB * 0.3, y: -halvH * 0.34 }
    const ljus = aggPoly.map((p) => ({ x: c.x + (p.x - c.x) * 0.5, y: c.y + (p.y - c.y) * 0.5 }))
    mjukKurva(degLjus, ljus).fill({ color: 0xffffff, alpha: 0.26 })
  }

  // En vit blomning BARA på ägget — aldrig en helskärmsblixt. Ligger på `aggFall`, som
  // varken roterar eller skalas, så den syns även när skalet göms vid kläckningen.
  function blomning() {
    const g = new Graphics()
      .ellipse(0, 0, halvB * 1.12 * AGG_SKALA, halvH * 1.1 * AGG_SKALA)
      .fill({ color: 0xffffff, alpha: 1 })
    g.eventMode = 'none'
    aggFall.addChild(g)
    const st = { s: 1, a: 0.92 }
    const tw = gsap.to(st, {
      s: 1.7,
      a: 0,
      duration: 0.42,
      ease: 'power2.out',
      onUpdate: () => {
        if (g.destroyed) { tw.kill(); return }
        g.scale.set(st.s)
        g.alpha = st.a
      },
      onComplete: () => { if (!g.destroyed) g.destroy() },
    })
    spara(tw)
  }

  function vagga(styrka) {
    gsap.killTweensOf(aggVagga)
    const a = 0.05 * styrka
    spara(gsap.timeline()
      .to(aggVagga, { rotation: a, duration: 0.09, ease: 'power2.out' })
      .to(aggVagga, { rotation: -a * 0.8, duration: 0.13 })
      .to(aggVagga, { rotation: a * 0.4, duration: 0.15 })
      .to(aggVagga, { rotation: 0, duration: 0.22, ease: 'back.out(2)' }))
  }

  // ---- knådningen --------------------------------------------------------

  /**
   * Barnets finger i degen — F2:s hela existensberättigande. Alltid ett svar inom
   * 100 ms, även när det inte finns någon deg att knåda: ett tryck som returnerar tyst
   * är P0-brottet `dod-traffyta`.
   */
  function knada(x, y) {
    if (!levande) return
    const gx = Number.isFinite(x) ? x : KNAD.x
    const gy = Number.isFinite(y) ? y : KNAD.y
    puff(fx, gx, gy, { count: 5, color: ton.stoft[(Math.random() * ton.stoft.length) | 0] })
    ton1({ freq: 132 + Math.random() * 46, dur: 0.13, type: 'sine', vol: 0.15, slideTo: 74 })
    if (!deg || !deg.pts.length) return

    // Skärmens punkt → kroppens rymd. Displayen sitter på aggRot + aggFall och skalas
    // av aggSkal, så fingret måste räknas om eller landar knuffen någon annanstans än
    // där barnet tryckte.
    const s = aggSkal.scale.x || 1
    const px = ritmitt.x + (gx - aggRot.x) / s
    const py = ritmitt.y + (gy - (aggRot.y + aggFall.y)) / s
    // `{ form: true }` är inte valfritt: utan den läser verlet knuffen som en FART och
    // hela klumpen translaterar (1,2512 px drift per knuff mot 0,0782 med form:true).
    deg.knuff(px, py, 7, 70, { form: true })
    deg.flyttaTill(ankare.x, ankare.y)

    lyster = klam(lyster + 0.14, 0, 1)
    if (Math.random() < 0.4) sparkle(fx, gx, gy, { count: 4 })
  }

  // ---- knackningen -------------------------------------------------------

  function flisa(vx, vy) {
    const g = new Graphics()
    const r = 6 + Math.random() * 6
    g.moveTo(-r, r * 0.6).lineTo(0, -r).lineTo(r, r * 0.5).closePath()
    g.fill(topLightFill(aggFarg, { highlight: 0.3, dark: 0.22 }))
    g.eventMode = 'none'
    g.position.set(vx, vy)
    scen.addChild(g)
    const st = { x: vx, y: vy, r: 0, a: 1 }
    const rikt = Math.random() < 0.5 ? -1 : 1
    const tw = gsap.to(st, {
      x: vx + rikt * (40 + Math.random() * 70),
      y: vy + 60 + Math.random() * 70,
      r: rikt * (2 + Math.random() * 3),
      a: 0,
      duration: 0.8 + Math.random() * 0.3,
      ease: 'power1.in',
      onUpdate: () => {
        if (g.destroyed) { tw.kill(); return }
        g.position.set(st.x, st.y)
        g.rotation = st.r
        g.alpha = st.a
      },
      onComplete: () => { if (!g.destroyed) g.destroy() },
    })
    spara(tw)
  }

  function tillLokal(p) {
    return { x: klam(p.x, -1, 1) * halvB * 0.9, y: klam(p.y, -1, 1) * halvH * 0.9 }
  }

  // Sprickvägen ur knyttets EGET frö. Enhetsrymd (−1..1) → skalets px. Saknas fröets
  // vägar byggs en sicksack ur samma frö-tal — men `Math.random()` får ALDRIG in i
  // sprickan (då hoppar den runt vid varje omritning; det var en riktig bugg i
  // källmaterialet).
  function bana(steg) {
    const alla = Array.isArray(dnaNu?.sprickor) ? dnaNu.sprickor : []
    const s = alla[klam(steg, 0, Math.max(0, alla.length - 1))]
    const punkter = Array.isArray(s?.segment)
      ? s.segment.filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
      : []
    if (punkter.length >= 2) return punkter.map(tillLokal)
    const fro = (dnaNu?.fro ?? 1) >>> 0
    const ut = []
    const n = 3 + steg * 3
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1)
      const sid = Math.sin((fro % 97) * 0.11 + i * 1.9) * 0.32
      ut.push(tillLokal({ x: sid, y: -0.92 + u * 1.84 }))
    }
    return ut
  }

  function grenar(steg) {
    const alla = Array.isArray(dnaNu?.sprickor) ? dnaNu.sprickor : []
    const g = alla[klam(steg, 0, Math.max(0, alla.length - 1))]?.gren
    if (!Array.isArray(g) || !g.length) return []
    // `gren` kan vara EN väg ([{x,y}…]) eller flera ([[{x,y}…], …]) — båda läsningarna
    // är rimliga ur specen, så båda hanteras.
    if (Number.isFinite(g[0]?.x)) return [g.map(tillLokal)]
    return g.filter((v) => Array.isArray(v) && v.length >= 2).map((v) => v.map(tillLokal))
  }

  function ritaSprickor(steg) {
    sprickG.clear()
    ljusG.clear()
    const vagar = [bana(steg), ...grenar(steg)]
    for (const v of vagar) {
      if (v.length < 2) continue
      sprickG.moveTo(v[0].x, v[0].y)
      for (let i = 1; i < v.length; i++) sprickG.lineTo(v[i].x, v[i].y)
    }
    sprickG.stroke({ width: 5, color: shade(aggFarg, 0.5), cap: 'round', join: 'round' })
    if (steg < 2) return

    // Från tredje knackningen läcker tunna ljuslinjer i VÄRLDENS färg ut ur skalet.
    for (const v of vagar) {
      if (v.length < 2) continue
      ljusG.moveTo(v[0].x, v[0].y)
      for (let i = 1; i < v.length; i++) ljusG.lineTo(v[i].x, v[i].y)
    }
    ljusG.stroke({ width: 10, color: tint(ton.luft, 0.4), cap: 'round', join: 'round' })
    if (ljusG._wPuls) return
    const st = { a: 0.3 }
    const tw = gsap.to(st, {
      a: 0.8,
      duration: 0.62,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      onUpdate: () => {
        if (ljusG.destroyed) { tw.kill(); return }
        ljusG.alpha = st.a
      },
    })
    ljusG._wPuls = tw
    spara(tw)
  }

  /**
   * Ett av de fyra äggtrycken. Fast antal med flit: ett slumpat 3–5 gör att en kläckning
   * känns längre än en annan utan synlig orsak, och fyra låter en 2-åring bemästra det
   * till andra ägget.
   */
  function knacka(tidigt, sista) {
    if (!levande) return 'tidigt'
    if (lage !== 'knack') {
      ton1({ freq: 660, dur: 0.05, type: 'sine', vol: 0.1 })
      return 'tidigt'
    }
    // Anroparen får styra: `knacka(true)` = ett oräknat tryck, `knacka(false, true)` = den
    // fjärde. Utan argument sköter ceremonin både spärren och räknaren själv. Två
    // oberoende spärrar som mäter tiden på olika sätt hade annars kunnat säga emot
    // varandra och svälja en riktig knackning.
    const styrd = tidigt !== undefined
    if (tidigt === true || (!styrd && ur - sistKnack < KNACK_SPARR)) {
      // En spärr som RETURNERAR TYST är P0-brottet `dod-traffyta`. Ett oräknat tryck
      // får därför sin egen lilla belöning: squash, en skalflisa och ett klick.
      // Skillnaden mellan takt och en död träffyta ligger exakt här.
      squash(aggSkal, { intensity: 0.4 })
      flisa(AGG.x + (Math.random() * 2 - 1) * 50, AGG.y - 20)
      ton1({ freq: 700, dur: 0.05, type: 'sine', vol: 0.11 })
      return 'tidigt'
    }
    sistKnack = ur
    knackAntal += 1

    if (sista === true || (!styrd && knackAntal >= 4)) {
      klacka()
      return 'klack'
    }

    const n = klam(knackAntal, 1, 3)
    squash(aggSkal, { intensity: 0.55 + n * 0.15 })
    vagga(0.8 + n * 0.5)
    ton1({ freq: KNACK_TONER[n - 1], dur: 0.17, type: 'triangle', vol: 0.24 })
    sfx('tap')
    ritaSprickor(n - 1)
    for (let i = 0; i < 3; i++) flisa(AGG.x + (Math.random() * 2 - 1) * 62, AGG.y - 40 + Math.random() * 70)
    puff(fx, AGG.x, AGG.y - 10, { count: 5, color: shade(aggFarg, 0.25) })
    if (n >= 3) {
      // Ett lågt brum stiger inne i skalet. Slingan stoppas vid kläckningen OCH i
      // destroy — en slinga som ingen stoppar låter vidare på menyn, utan bild.
      audio?.loop?.('knyttbrum', { typ: 'ton', freq: 88, q: 1.6, vol: 0.055 })
      sparkle(fx, AGG.x, AGG.y, { count: 6 })
    }
    pa('knack', n)
    return 'knack'
  }

  // ---- kläckningen -------------------------------------------------------

  function klacka() {
    lage = 'varld'
    audio?.stopLoop?.('knyttbrum')
    gsap.killTweensOf(aggVilo)
    gsap.killTweensOf(aggVagga)
    aggVilo.rotation = 0
    aggVagga.rotation = 0
    ljusG._wPuls?.kill()
    ljusG._wPuls = null

    sfx('pop')
    blomning()
    burst(fx, AGG.x, AGG.y, { count: 22, colors: ton.stoft, power: 1.5 })
    sparkle(fx, AGG.x, AGG.y, { count: 10 })
    ripple(fx, AGG.x, AGG.y, { color: tint(ton.luft, 0.4), maxR: 260, duration: 0.7, width: 10, alpha: 0.55 })
    ;[523, 659, 784].forEach((f, i) => strax(i * 0.07, () => ton1({ freq: f, dur: 0.34, type: 'triangle', vol: 0.2 })))

    klyvOchKasta()
    aggVagga.visible = false
    pa('klack')

    strax(0.06, varldenUt)
    strax(1.15, foderKnytt)
  }

  function klyvOchKasta() {
    if (!aggPoly) return
    const delar = klyvSkal(aggPoly, bana(3))
      .map((h) => ({ pts: h, c: tyngd(h) }))
      .sort((a, b) => a.c.y - b.c.y)
    // Den halva vars tyngdpunkt ligger LÄGST blir skålen knyttet reser sig ur; den
    // andra far iväg. Så fungerar det oavsett hur sprickan råkar ligga.
    const flyger = delar[0]
    const skal = delar[1]

    const gorHalva = (h) => {
      const hall = new Container()
      hall.position.set(AGG.x + h.c.x * AGG_SKALA, AGG.y + h.c.y * AGG_SKALA)
      hall.eventMode = 'none'
      const g = new Graphics()
      const lokal = h.pts.map((p) => ({ x: (p.x - h.c.x) * AGG_SKALA, y: (p.y - h.c.y) * AGG_SKALA }))
      mjukKurva(g, lokal).fill(topLightFill(aggFarg, { highlight: 0.32, dark: 0.24 }))
      g.stroke({ width: 3, color: shade(aggFarg, 0.32), alpha: 0.6 })
      g.eventMode = 'none'
      hall.addChild(g)
      // Halvorna ritas i äggets FULLA storlek (390 px) medan knyttet är ~110 px brett —
      // i skärmdumpen dominerade de bilden och lästes som skräp i stället för som skal.
      // Ingen tidslinje rör `scale`, så en engångskrympning är säker här.
      hall.scale.set(0.72)
      scen.addChildAt(hall, scen.getChildIndex(boFramH))
      halvor.push(hall)
      return hall
    }

    // Speglas med rotationens TECKEN, aldrig `scale.x = -1` — en spegelvänd skala
    // vänder även rotationens synliga riktning.
    const tecken = flyger.c.x <= skal.c.x ? -1 : 1
    const a = gorHalva(flyger)
    const b = gorHalva(skal)

    // Landningsplatsen KLÄMS in i ett fritt band. Åt vänster ligger hyllans tre bon
    // (träffytor till x 378) och åt höger spaken (från x 1060) — en skalhalva som blir
    // liggande ovanpå en levande knapp gör tryck på den till grannens handling.
    const malX = klam(a.x + tecken * 210, 460, 900)
    spara(gsap.timeline()
      .to(a, { x: malX, y: a.y - 120, rotation: tecken * 1.5, duration: 0.36, ease: 'power2.out' })
      .to(a, { y: MARK_Y + 12, rotation: tecken * 2.5, duration: 0.6, ease: 'bounce.out' }))
    spara(gsap.timeline()
      .to(b, { x: b.x - tecken * 46, rotation: -tecken * 0.16, duration: 0.3, ease: 'power2.out' })
      .to(b, { y: b.y + 16, duration: 0.5, ease: 'bounce.out' }))
    sfx('whoosh')
  }

  // ---- världen strömmar ut ----------------------------------------------

  /**
   * Ägarens punkt 6, tagen bokstavligt: du buteljerade en värld, och ägget ger tillbaka
   * den. Molnet, solen, trädet och stenen ÅKER UT i en båge ur ägget och vecklar ut sig
   * till en hel miljö — mark som växer ut åt sidorna, fyra rekvisita, partiklar i
   * luften. Först DÄREFTER reser sig knyttet.
   */
  function varldenUt() {
    byggFond()
    byggMark()
    byggProps()
    stoftFlod = new Emitter(fx, {
      x: AGG.x, y: MARK_Y + 20, bredd: 900, hojd: 40, rate: 9,
      colors: ton.stoft, size: 9, sizeVar: 0.5, sizeTo: 0.4,
      speed: 26, speedVar: 0.6, angle: -Math.PI / 2, spread: 1.2,
      gravity: -5, life: 2.8, lifeVar: 0.4, alpha: 0.8,
    })
    stoftFlod.puff(16)
    strax(0.9, () => pa('varld'))
  }

  function byggFond() {
    const mittY = (FOND.y1 + FOND.y0) / 2
    const y0 = FOND.y0 - mittY
    const y1 = FOND.y1 - mittY
    const h = y1 - y0

    const hall = new Container()
    hall.position.set(AGG.x, mittY)
    hall.eventMode = 'none'

    const him = new Graphics()
      .roundRect(-FOND.halvB, y0, FOND.halvB * 2, h, 34)
      .fill(verticalFill(ton.him[0], ton.him[1]))
    him.eventMode = 'none'
    // Ett markband INNE i fonden — himmel och mark, precis som en riktig scen. Två
    // former i SAMMA Graphics hade tagit första fyllningens färg, alltså en egen nod.
    const mg = new Graphics()
      .roundRect(-FOND.halvB, y1 - h * 0.3, FOND.halvB * 2, h * 0.3, 34)
      .fill(groundFill(ton.mark, { light: 0.16, dark: 0.24 }))
    mg.eventMode = 'none'
    hall.addChild(him, mg)

    // Drivande partiklar i fonden — nio korn, var och en med sin EGEN fas, så de läser
    // som nio levande saker och inte som en pulserande yta.
    for (let i = 0; i < 9; i++) {
      const k = new Container()
      k.eventMode = 'none'
      const p = new Graphics()
        .circle(0, 0, 3 + Math.random() * 4)
        .fill({ color: ton.stoft[i % ton.stoft.length], alpha: 0.75 })
      p.eventMode = 'none'
      k.addChild(p)
      k.position.set(-FOND.halvB + 40 + Math.random() * (FOND.halvB * 2 - 80), y0 + 30 + Math.random() * (h * 0.55))
      hall.addChild(k)
      liv(k, { bob: 7 + Math.random() * 9, sway: 0, duration: 2.6 + Math.random() * 2.2, phase: Math.random() })
    }

    bak.addChild(hall)
    bak.alpha = 0
    hall.rotation = -0.06
    hall.scale.set(0.86)
    // EN tidslinje, och varje egenskap har exakt en skrivare: fonden svänger in BAKOM
    // ägget och sätter sig.
    spara(gsap.timeline()
      .to(hall, { rotation: 0, duration: 0.62, ease: 'back.out(1.6)' }, 0)
      .to(hall.scale, { x: 1, y: 1, duration: 0.62, ease: 'back.out(1.6)' }, 0)
      .to(bak, { alpha: 1, duration: 0.4, ease: 'power2.out' }, 0))
  }

  function byggMark() {
    const hall = new Container()
    hall.position.set(AGG.x, MARK_Y)
    hall.eventMode = 'none'
    const g = new Graphics().rect(-900, 0, 1800, 190).fill(groundFill(ton.mark, { light: 0.14, dark: 0.28 }))
    g.eventMode = 'none'
    // En vågig ljus överkant, så marken inte möter luften i en spikrak linje och inte
    // heller är EN kvantiserad ton över hela nedre tredjedelen.
    const kant = new Graphics()
    kant.moveTo(-900, 4)
    for (let x = -900; x <= 900; x += 60) kant.lineTo(x, 4 + Math.sin(x * 0.012) * 6)
    kant.lineTo(900, 26).lineTo(-900, 26).closePath()
    kant.fill(tint(ton.mark, 0.28))
    kant.eventMode = 'none'
    hall.addChild(g, kant)
    markLag.addChild(hall)
    hall.scale.set(0.02, 1)
    spara(gsap.to(hall.scale, { x: 1, duration: 0.52, ease: 'back.out(1.4)' }))
    sfx('whoosh')
  }

  function byggProps() {
    const lista = REKVISITA?.[ton.nyckel]
    if (!Array.isArray(lista) || !lista.length) return
    let markIx = 0
    for (let i = 0; i < 4; i++) {
      const spec = lista[i % lista.length]
      if (typeof spec?.rita !== 'function') continue
      const luft = Number.isFinite(spec.luft) ? spec.luft : 0
      // Ingen värld har fler än tre markföremål (mätt över alla fyra tabellerna), så
      // markplatserna räcker alltid; skulle en ny värld få en fjärde staplas den på den
      // sista i stället för att ritas utanför bilden.
      const plats = luft >= 0.9
        ? HIMMEL_PLATS
        : luft >= 0.4
          ? MELLAN_PLATS
          : MARK_PLATS[Math.min(markIx++, MARK_PLATS.length - 1)]
      const mal = { x: plats.x, y: plats.y ?? MARK_Y + 4 }

      // Tre nivåer, en transform per nivå: flykten (x,y) · vilorörelsen (liv äger y och
      // rotation) · studsen in (bounceIn äger scale). Ingen skriver på någon annans.
      const hall = new Container()
      const livNod = new Container()
      const bild = new Graphics()
      spec.rita(bild, plats.s)
      bild.eventMode = 'none'
      livNod.eventMode = 'none'
      hall.eventMode = 'none'
      livNod.addChild(bild)
      hall.addChild(livNod)
      hall.position.set(AGG.x, AGG.y)
      propLag.addChild(hall)

      // Bara det som STÅR på marken kastar en skugga där. En sol i skyn gör det inte.
      let skugga = null
      if (luft < 0.4) {
        skugga = new Graphics()
          .ellipse(mal.x, mal.y + 3, plats.s * 0.4, plats.s * 0.12)
          .fill({ color: 0x000000, alpha: 0.14 })
        skugga.eventMode = 'none'
        skugga.alpha = 0
        markLag.addChild(skugga)
      }

      const bagY = Math.min(AGG.y, mal.y) - 130 - i * 12
      const fran = { x: AGG.x, y: AGG.y }
      const st = { p: 0 }
      const tw = gsap.to(st, {
        p: 1,
        duration: 0.62,
        delay: 0.12 * i,
        ease: 'power2.out',
        onUpdate: () => {
          if (hall.destroyed) { tw.kill(); return }
          // Kvadratisk båge: UT ur ägget, upp och ner på sin plats.
          const p = st.p
          const inv = 1 - p
          hall.x = inv * inv * fran.x + 2 * inv * p * ((fran.x + mal.x) / 2) + p * p * mal.x
          hall.y = inv * inv * fran.y + 2 * inv * p * bagY + p * p * mal.y
        },
        onComplete: () => {
          if (!levande || hall.destroyed) return
          pop(bild, { scale: 1.12 })
          if (skugga) skugga.alpha = 1
          ton1({ freq: PROP_TONER[i], dur: 0.2, type: 'triangle', vol: 0.16 })
          if (luft < 0.4) puff(fx, mal.x, mal.y, { count: 5, color: tint(ton.mark, 0.3) })
          gorLiv(spec.rorelse, livNod, hall, mal.x)
        },
      })
      spara(tw)
      bounceIn(bild, { duration: 0.5, delay: 0.12 * i })
    }
  }

  // Vilorörelsen läses ur rekvisitans EGEN `rorelse`. En sten som guppar är en sten som
  // ljuger; ett träd ska vaja, en sol snurra, ett moln driva. Datan finns redan — att
  // ge alla fyra samma slumpade gupp hade kastat bort den.
  //
  // `livNod` bär gupp/vaggning (liv äger y + rotation) eller snurren (rotation), `hall`
  // bär driften i sidled — en transform per nivå, en skrivare per egenskap.
  function gorLiv(rorelse, livNod, hall, x0) {
    if (rorelse === 'still') return // stenen ligger blick stilla
    if (rorelse === 'snurr') {
      const st = { r: 0 }
      const tw = gsap.to(st, {
        r: Math.PI * 2,
        duration: 24,
        repeat: -1,
        ease: 'none',
        onUpdate: () => {
          if (livNod.destroyed) { tw.kill(); return }
          livNod.rotation = st.r
        },
      })
      spara(tw)
      return
    }
    const gupp = rorelse === 'gupp' ? 8 : rorelse === 'vajar' ? 2 : 5
    const vagg = rorelse === 'vajar' ? 0.055 : 0.018
    liv(livNod, { bob: gupp, sway: vagg, duration: 2.2 + Math.random() * 1.6, phase: Math.random() })

    if (rorelse !== 'driver' && rorelse !== 'simmar') return
    const vidd = rorelse === 'simmar' ? 54 : 34
    const st = { p: 0 }
    const tw = gsap.to(st, {
      p: Math.PI * 2,
      duration: rorelse === 'simmar' ? 7 : 13,
      repeat: -1,
      ease: 'none',
      onUpdate: () => {
        if (hall.destroyed) { tw.kill(); return }
        hall.x = x0 + Math.sin(st.p) * vidd
      },
    })
    spara(tw)
  }

  function foderKnytt() {
    if (!dnaNu) return
    // `Knytt` skalar SJÄLV med `dna.storlek` (knytt.js:615 `_bas` → `_skala.scale.set`), så
    // en storleksfaktor även här multiplicerade in den TVÅ gånger: ritad radie blev 92·s²
    // och spannet 2,63× medan blobben i kupan lovar 1,62× (STORLEKAR 0,74–1,20). Barnet
    // ställde in en storlek på bälgen och fick ett annat knytt än förhandsvisningen visade.
    // index.js:_ritaHylla skickade redan `r: 40` UTAN faktor — anropsställena var oense.
    const r = 92
    // Effekterna ska däremot sitta vid knyttets SYNLIGA topp, och den är 92·s.
    const synligR = r * klam(dnaNu.storlek ?? 1, 0.5, 1.6)
    knyttHall = new Container()
    knyttHall.position.set(AGG.x, KNYTT_Y)
    knyttHall.eventMode = 'none'
    figurLag.addChild(knyttHall)

    // Ingen skugga här: `Knytt` ritar sin egen i `view` (knytt.js:684), och den FÖLJER MED
    // när index.js:_tillBanken flyttar `knytt.view` till bänken. En skugga på hållaren blev
    // dubbel under födseln och lämnades sedan kvar som en mörk fläck på världens gräs.
    knytt = byggKnytt(dnaNu, { r, senare: senareRa, audio })
    if (knytt?.view) knyttHall.addChild(knytt.view)

    sfx('reveal')
    // Reser sig ur skalhalvan. bounceIn äger `scale` på HÅLLAREN; knyttets egen rigg
    // summerar sina egna skalärer på sina egna innernoder, så de kan aldrig krocka.
    bounceIn(knyttHall, { duration: 0.55 })
    sparkle(fx, AGG.x, KNYTT_Y - synligR, { count: 8 })
    burst(fx, AGG.x, KNYTT_Y - synligR * 0.6, { count: 14, colors: ton.stoft })

    strax(0.5, () => {
      knytt?.setLage?.('glad')
      knytt?.hoppa?.(3) // tre glädjeskutt, och dess EGET fyrtonsmotiv
    })
    strax(1.5, () => {
      knytt?.setLage?.('idle')
      lage = 'klar'
      overlamnat = true
      pa('klar', { knytt })
    })
  }

  // Riv knyttet BARA om det fortfarande är vårt. index.js river sitt egna först (både i
  // `_aterstall` och i `destroy`), och `Knytt.destroy()` vaktar redan på `view.destroyed` —
  // men att läsa flaggan här gör ägarskapet läsbart i stället för att vila på en vakt i
  // en annan fil.
  function slappKnytt() {
    if (knytt?.view && !knytt.view.destroyed) {
      stadKnytt(knytt.view)
      knytt.destroy?.()
    }
    knytt = null
    overlamnat = false
  }

  // ---- omgångens städning ------------------------------------------------

  // Modulen är en singleton och `start()` kan komma en andra gång utan ett `destroy()`
  // emellan. Varje nod, lista och kropp som en omgång skapade måste därför bort här,
  // annars växer en ny värld ovanpå den förra.
  function rensaVarld() {
    slappKnytt()
    knyttHall = null
    stoftFlod?.destroy()
    stoftFlod = null
    for (const l of [bak, markLag, propLag, figurLag]) {
      for (const c of l.removeChildren()) {
        stadTrad(c)
        c.destroy({ children: true })
      }
    }
    halvor = []
    // Scenen bär FYRA fasta noder; allt annat där (skalhalvor, skalflisor på väg ner)
    // är förra omgångens. Ett svep är säkrare än en lista, för en flisa som är mitt i
    // sin flykt står inte i någon lista alls.
    for (const c of scen.removeChildren()) {
      if (SCEN_FAST.includes(c)) continue
      stadTrad(c)
      c.destroy({ children: true })
    }
    scen.addChild(...SCEN_FAST)
    gsap.killTweensOf(bak)
    gsap.killTweensOf(stralLag)
    bak.alpha = 1
    rivSug()
    deg?.destroy()
    facit?.destroy()
    deg = null
    facit = null
  }

  // ---- publikt ------------------------------------------------------------

  function start(dna, val) {
    if (!levande) return
    rensaVarld()
    dnaNu = dna || null
    // `dna.varld` ÄR `val.v` enligt kontraktet; `val` läses bara som reserv om ett
    // ofullständigt dna någonsin skickas in.
    ton = VARLDSTON[klam(dna?.varld ?? val?.v ?? 0, 0, 3)] || VARLDSTON[0]
    // Skalet bär knyttets EGEN färg, bara en aning dragen mot världens ljus — ett
    // guldknytt ska glöda guld redan i F3, ärligt. För mycket världsljus gjorde varje
    // ägg beige oavsett vad barnet valde.
    const bas = dnaNu?.palett?.ljus ?? dnaNu?.palett?.bas ?? ton.luft
    aggMal = lerpColor(bas, tint(ton.luft, 0.3), 0.18)
    aggFarg = aggMal

    lage = 'ceremoni'
    t = 0
    fasIx = -1
    skyndKvar = SKYND_TAK
    morf = 0
    lyster = 0
    bubbel = 0
    bubbelA = 0
    knackAntal = 0
    sistKnack = -9
    aggPoly = null
    ack = 0
    tweens = tweens.filter((x) => x && x.parent)

    // Hela äggträdet OCH boet tvättas: en bounceIn eller en landa från förra omgången
    // skriver annars vidare på noder vi just satt tillbaka i viloläge.
    for (const n of SCEN_FAST) stadTrad(n)
    aggVagga.visible = true
    aggVagga.rotation = 0
    aggVilo.rotation = 0
    aggFall.y = KNAD.y - AGG.y
    aggSkal.scale.set(1)
    aggSkugga.clear()
    aggSkugga.alpha = 1
    sprickG.clear()
    ljusG.clear()
    ljusG._wPuls?.kill()
    ljusG._wPuls = null
    ljusG.alpha = 1
    degBak.clear()
    degG.clear()
    degLjus.clear()
    boBak.clear()
    boFram.clear()
    boBakH.visible = false
    boFramH.visible = false
    boBakH.scale.set(1)
    boFramH.scale.set(1)
    for (const c of stralLag.removeChildren()) c.destroy({ children: true })
    stralLag.alpha = 0
    view.visible = true

    gaTill(0)
  }

  /**
   * Varje tryck under ceremonin kortar återstående tidslinje 0,12 s, tak 1,2 s totalt.
   * Barnets petande blir både en leksak och ett riktigt handtag på takten — och när
   * taket är slut svarar det ÄNDÅ, med ett stoftkorn som flyger in i degen och en knuff.
   * En 5-åring som sett ceremonin tjugo gånger kan alltså skynda på den utan att något
   * går förlorat.
   */
  function skynda() {
    if (!levande || lage !== 'ceremoni') return
    if (skyndKvar > 0) {
      const d = Math.min(SKYND_STEG, skyndKvar)
      t += d
      skyndKvar -= d
    }
    const a = Math.random() * Math.PI * 2
    puff(fx, KNAD.x + Math.cos(a) * 210, KNAD.y + Math.sin(a) * 150, {
      count: 4,
      color: ton.stoft[(Math.random() * ton.stoft.length) | 0],
    })
    ton1({ freq: 494 + Math.random() * 140, dur: 0.07, type: 'sine', vol: 0.1 })
    if (deg && deg.pts.length) {
      deg.knuff(ritmitt.x + Math.cos(a) * 40, ritmitt.y + Math.sin(a) * 40, 4, 60, { form: true })
      deg.flyttaTill(ankare.x, ankare.y)
    }
  }

  /** Andra spaktrycket: maskinen i botten med ett stort KA-CHUNK, rakt till äggfallet. */
  function hoppaTillFall() {
    if (!levande || lage !== 'ceremoni') return
    kachunk(true)
    // Kvittot i BILD är ovillkorligt, av samma skäl som `skynda()` puffar även när dess tak
    // är slut: `kachunk` är rent ljud, spakens `onTap` ritar ingenting, och efter FAS[4]
    // (5,3 s) hoppar tidslinjen inte heller — trycket på skärmens största röda föremål gav
    // då ett ljud och noll bild i över en sekund (P0 ÅTERKOPPLING kräver ljud OCH bild).
    ripple(fx, AGG.x, AGG.y, { color: ton.stoft?.[0] ?? 0xffd8a0 })
    puff(fx, AGG.x, AGG.y + 30, { count: 6, color: ton.stoft?.[0] ?? 0xffe6a8 })
    if (t < FAS[4].t) t = FAS[4].t - 0.02
  }

  function tick(dtMS, pekare) {
    if (!levande) return
    const ms = Number.isFinite(dtMS) ? Math.min(80, dtMS) : 16.7
    const dt = ms / 1000
    const dtF = ms / 16.6667
    ur += dt

    // Reservkön — används bara om ingen `senare` skickats in. Den dör med objektet,
    // precis som `ctx.later` dör med spelomgången.
    if (ko.length) {
      const kvar = []
      for (const p of ko) {
        p.kvar -= dt
        if (p.kvar <= 0) p.fn()
        else kvar.push(p)
      }
      ko = kvar
    }

    if (lage === 'ceremoni') {
      t += dt
      while (fasIx + 1 < FAS.length && t >= FAS[fasIx + 1].t) gaTill(fasIx + 1)
      const namn = FAS[fasIx]?.namn

      if (namn === 'F1') {
        stegSug(klam((t - FAS[1].t) / (FAS[2].t - FAS[1].t), 0, 1))
      } else if (namn === 'F2') {
        bubbla(dt, 1)
        stegDeg(dtF)
        ritaDeg(lerpColor(DEG_BAS, aggMal, 0.3 * lyster))
      } else if (namn === 'F3') {
        const p = klam((t - FAS[3].t) / (FAS[4].t - FAS[3].t), 0, 1)
        morf = p
        satMorf(p)
        deg?.mjukhet(0.8 * (1 - p))
        bubbla(dt, 1 - p) // bubblandet dör ut medan degen härdas
        stegDeg(dtF)
        const e = p * p * (3 - 2 * p)
        aggFall.y = lerp(KNAD.y - AGG.y, LYFT_Y - AGG.y, e)
        aggSkal.scale.set(lerp(1, AGG_SKALA, e))
        ritaDeg(lerpColor(lerpColor(DEG_BAS, aggMal, 0.3 * lyster), aggMal, e))
        // Ljusstormen roterar långsamt (långt under ögats flimmergräns på ~3 Hz) och
        // toppar på 0,18–0,30 i NORMAL alfa. Knådningen köpte de sista 0,10.
        stralLag.rotation += dt * 0.42
        stralLag.alpha = (0.18 + 0.1 * lyster) * Math.sin(Math.min(1, p * 1.15) * Math.PI)
      } else if (namn === 'F5' && t >= SLUT) {
        lage = 'knack'
        // Den lugna vaggningen i boet — evig, på sin EGEN nod, så knackningarnas ryck
        // aldrig slåss med den om samma rotation.
        const st = { p: 0 }
        const tw = gsap.to(st, {
          p: Math.PI * 2,
          duration: 3.1,
          repeat: -1,
          ease: 'none',
          onUpdate: () => {
            if (aggVilo.destroyed) { tw.kill(); return }
            aggVilo.rotation = Math.sin(st.p) * 0.05
          },
        })
        spara(tw)
        pa('agg')
      }
    }

    if (!overlamnat && knytt?.tick && knyttHall && !knyttHall.destroyed) {
      const p = pekare && Number.isFinite(pekare.x)
        ? { x: pekare.x - knyttHall.x, y: pekare.y - knyttHall.y }
        : null
      knytt.tick(ms, p)
    }
  }

  function destroy() {
    if (rivet) return
    rivet = true
    levande = false
    ko = []
    audio?.stopLoop?.('knyttsug')
    audio?.stopLoop?.('knyttbrum')
    for (const tw of tweens) tw?.kill()
    tweens = []
    stoftFlod?.destroy()
    stoftFlod = null
    deg?.destroy()
    facit?.destroy()
    deg = null
    facit = null
    sugKorn = []
    halvor = []
    // Städhjälparen FÖRE rivningen, aldrig efter: `destroy({ children: true })` lämnar
    // levande tweens på barnbarn helt tyst — gsap skriver bara vidare på en nollad
    // transform och Pixi v8 kastar ingenting. Noll konsolfel i båda armarna.
    slappKnytt()
    knyttHall = null
    stadTrad(view)
    view.destroy({ children: true })
  }

  return {
    view,
    start,
    knada,
    skynda,
    hoppaTillFall,
    knacka,
    tick,
    destroy,
    get fas() { return FAS[fasIx]?.namn || 'vila' },
    get lage() { return lage },
  }
}
