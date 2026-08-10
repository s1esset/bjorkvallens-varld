// Nätskott på stan — förstapersons-fysikspel (2–5 år). Barnet sitter i bilen och ser
// Spindel-Zackes egen arm nere i bild. Staden rullar förbi i tre parallaxdjup
// (hus-siluetter · gata med hus · vägkant) och skiftar gradvis stad→förort. Tryck
// VAR SOM HELST → ett nät skjuts från handen dit (thwip + rekyl <100 ms).
//
// TRE NÄTHÄNDER, ingen knapp: den aktiva handen är armen mitt i bild och de två
// andra ligger och väntar nere i vardera hörnet. Tryck på en väntande hand → den
// kliver fram, den aktiva lägger sig i dess plats. Alla tre har samma pose; det är
// DRÄKTEN som är språket (se NAT_TYPER):
//   • DRAGNÄT  (röd dräkt, svart väv) — drar hem det som träffas till BAKSÄTET,
//     där de insamlade sitter som små jublande huvuden (mottagaren). Elastisk
//     vinsch, se REEL_*.
//   • FÄSTNÄT  (vit dräkt, lila + svart väv) — det som träffas fastnar där det är
//     (statisk kropp, scrollar med).
//   • NÄTBOLL  (svart dräkt, röd + vit väv) — skjuter en boll som FLYGER och
//     STUDSAR. Det den träffar snärjs in: faller, lägger sig ner och får en vit
//     nätboll runt kroppen så bara huvud och fötter sticker ut (_snarjIn).
//
// GATAN SVARAR. Elva gatusaker (GATUSAKER) står längs trottoaren — brandpost,
// brevlåda, dörr, äppelträd, gatulock, blommor, lyktstolpe, trafikljus, parkerad
// bil, korvstånd, cykel — var och en med eget liv i vila och TRE olika reaktioner,
// en per nättyp. Husen är sex butiksfasader (HUSTYPER) utöver hyreshus och villa.
//
// NÄTET ÄR ETT REP, inte ett streck: en verlet-tråd (ROPE_PTS punkter med tyngd,
// avståndsvillkor i ROPE_ITER varv) som piskar efter skottet, hänger i kedjekurva
// och slaknar när kroppen kommer ikapp. Dragnätet vinschar ELASTISKT — vilolängden
// kortas i VEVTAG medan en fjäder (REEL_K) drar i proportion till sträckningen, så
// hemfärden blir ryck-släpp-ryck i stället för en rak transportsträcka.
//
// Mål som passerar (matter.js-kroppar, städas utanför bild): katt, hund, fågel,
// paket, blomkruka i fönsterbleck, ballong (flyter uppåt), monster. INGA människor.
// Monstren är en FAMILJ med tolv arter (se MONSTER_ARTER) — bl.a. goblinen i grönt
// med lila mössa. Fönster kan träffas → krossas i tecknat glitter-splitter, självlagas
// med skimmer efter ~5 s, och ofta lutar sig ett monster ut ur hålet. Det monstret är
// ETT RIKTIGT MÅL: klibbnätet fångar det i rutan, dragnätet lyfter ut det och tar hem
// det till baksätet. TAK: max 2 krossade rutor — därutöver studsar nätet av.
//
// Uppdragsrundor som roterar och KRÄVER båda näten ("fånga katten med dragnätet" ·
// "fäst paketen" · "hämta 3 ballonger"); fri lek däremellan räknas också. Motgång
// MED TAK och ALDRIG mer än en i taget: vindby som blåser loss fästa paket (max 2
// lösa), en skata som knycker ett paket, eller ett monster som smyger fram, lyfter ett
// paket över huvudet och kutar iväg — nätas monstret tappar det bytet direkt. Redan
// given uppdragskredit kan aldrig försvinna, så motgången kan bara sakta ner.
// Sällsynt wow ~1 på 8: guldpaket som regnar stjärnor. Rund-final efter 3 uppdrag:
// HEMKOMSTEN — parallaxen saktar in, ett hus glider fram, bilen stannar och alla
// insamlade hoppar ur och firar.
//
// Fysikskala: matter-kraft = a·277,78 px/steg — här styrs allt i px/steg via
// setVelocity (kalibrerat, aldrig gissade krafter). Kroppar följer scrollen genom att
// Body.setPosition translaterar dem varje bildruta (positionPrev följer med → farten
// bevaras). Exit-säkert: _alive-flagga, ctx.later för ALLT fördröjt, proxy-tweens med
// destroyed-vakter, feedback.js för transienta partiklar.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { pop, wiggle, sparkle, puff, burst, floatText, ripple, bounceIn, breathe } from '../../lib/feedback.js'
import { lerpColor } from '../../lib/scene.js'
import { FONT, COLORS, shade, tint } from '../../lib/theme.js'
import { topLightFill, verticalFill } from '../../lib/form.js'
import { shuffle } from '../../lib/swedish.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

// ---- Layout (designkoordinater 1280×720) -----------------------------------
const FAR_BASE = 470 // avlägsna siluetter står här
const STREET_TOP = 430 // bakomliggande gatuband (statiskt)
const SIDEWALK_TOP = 555
const SIDEWALK_BOT = 612
const NEAR_BOT = 664
const GROUND = 591 // fötternas vilonivå (fysikgolvets ovansida)
const CAR_TOP = 650 // dörrkantens överkant
const SEAT = { x: 1148, y: 618 } // baksätets mitt (huvudena)
const ARM_PIVOT = { x: 505, y: 790 }
const HAND_LEN = 242

const MAX_TARGETS = 7 // tak på aktiva fysik-kroppar (perf + lagom täthet)
const MAX_BROKEN = 2 // tak: max 2 krossade rutor samtidigt
const HEAL_AFTER = 5.2 // s tills en ruta självlagas
const IDLE_DELAY = 6 // s utan tryck innan mjuk om-cue
const SHOT_MS = 85 // nätets flygtid hand → träffpunkt

// Repfysik (verlet) — punkter i linan, tyngd per steg, dämpning, lösningsvarv.
const ROPE_PTS = 12
const ROPE_G = 0.5
const ROPE_DAMP = 0.93
const ROPE_ITER = 3
// Elastisk indragning: vinschen kortar repet, fjädern drar kroppen mot handen.
// Alla värden i px/steg (60 Hz-steg), kalibrerade med scripts/_repprobe.mjs.
// Vinschen VEVAR i tag (~1,8 ggr/s) i stället för att dra jämnt: under vevtaget
// kortas vilolängden snabbare än kroppen hinner flyga, så repet spänns och rycker
// till; mellan tagen hinner kroppen ikapp, repet slaknar och tyngdkraften får en
// stund.
// MÄTT med scripts/_repprobe.mjs, inte gissat: jämn indragning gav 0 ryck på varje
// hemdragning. Vevad ger 1 ryck (25–40 % av bildrutorna med slakt rep) på drag över
// ~300 px, och 0 på mål som redan hänger nära handen — där finns knappt någon resa
// att rycka i. Lova inte mer än så i nästa omgång utan att mäta om.
const REEL_HZ = 11 // vevens vinkelhastighet (rad/s) ≈ 1,8 tag/s → varv 0,57 s
const REEL_TRO = 0.25 // vevtaget biter först över det här sinusvärdet → äkta paus
const REEL_FAS = Math.asin(REEL_TRO) // varje fångst börjar PRECIS när ett tag tar
const STROKE_F = 0.42 * (2 * Math.PI / REEL_HZ) * 60 // ett vevtags längd i bildrutor
const DUTY_MEAN = 0.271 // vevfunktionens medelvärde över ett varv (uträknat, inte gissat)
const REEL_FRAMES = 40 // hemfärden ska ta ~0,67 s OAVSETT avstånd → vevtakten
// normaliseras per fångst. Utan normaliseringen blev nära mål hemma på 0,3 s
// (hann inte med ett enda vevtag = 0 ryck) och långa tog 1,5 s.
const REEL_K = 0.075 // acceleration per px sträckning
const REEL_AMAX = 3.4 // tak på fjäderaccelerationen
const REEL_VMAX = 15 // tak på farten längs repet — MÅSTE ligga under vevtagets topp,
// annars hinner kroppen aldrig ikapp och repet blir spänt hela vägen hem (mätt: 0 ryck)
const REEL_DAMP = 0.995 // spänt rep: nästan ingen förlust
const SLACK_DAMP = 0.94 // slakt rep: kroppen bromsar in och sjunker
const CATCH_R = 112 // så nära handen räknas kroppen som hemma
const SIDO_X = [132, 1178] // de väntande händernas mitt (vänster · höger hörn)
const SIDO_Y = 742 // strax under bildkanten: handen syns, armen är utanför
const SIDO_SKALA = 0.5
// Nätbollen: en riktig kropp som flyger, STUDSAR och snärjer in det den träffar.
const BALL_R = 21
const BALL_V = 15 // utgångsfart, px/steg — 24 var för snabbt att följa med ögat
const BALL_MAX = 3 // tak: så många bollar i luften samtidigt
const BALL_LIFE = 4.5 // s innan en boll pyser bort av sig själv
// Gatusakernas fothöjd per fästtyp: mot husväggen · på trottoaren · i gatan.
const PROP_Y = { vagg: 556, trottoar: 602, mark: 650 }
const PROP_MAX = 5 // tak på gatusaker i bild samtidigt
const PROP_LUFT = 250 // minsta avstånd mellan två gatusaker
// Reaktionstaggen från _wxReagera → ljud, ton och partikelfärg. Tonerna ligger i
// spelets pentatonik; inga generiska UI-blipp.
const PROP_SVAR = {
  vatten: { sfx: 'whoosh', ton: 523.25, farg: 0x9adcf0 },
  vatten_stral: { sfx: 'soft', ton: 659.25, farg: 0x9adcf0 },
  pys: { sfx: 'soft', ton: 392, farg: 0xd8d3c8 },
  brev: { sfx: 'flip', ton: 587.33, farg: 0xfffdf7 },
  skak: { sfx: 'soft', ton: 440, farg: 0xffd35c },
  plat: { prov: 'boing', ton: 329.63, farg: 0xffd35c },
  monster_tittar: { prov: 'boing', ton: 659.25, farg: 0x9bd06b },
  katt_tittar: { prov: 'djur_katt', ton: 523.25, farg: 0xffb15c },
  knack: { sfx: 'soft', ton: 293.66, farg: 0xd8d3c8 },
  applen: { prov: 'plopp', ton: 587.33, farg: 0xe8534a },
  applen_haenger: { sfx: 'soft', ton: 493.88, farg: 0x5bbf6a },
  lov: { sfx: 'soft', ton: 440, farg: 0x5bbf6a },
  anga: { sfx: 'whoosh', ton: 349.23, farg: 0xf2f6f8 },
  lock_last: { sfx: 'pling', ton: 392, farg: 0x817b71 },
  klang: { prov: 'boing', ton: 261.63, farg: 0x817b71 },
  pollen: { sfx: 'pling', ton: 783.99, farg: 0xffe9b0 },
  blommor_bugar: { sfx: 'soft', ton: 659.25, farg: 0xff9ec4 },
  studs_blomma: { sfx: 'boing', ton: 880, farg: 0xff9ec4 },
  ljus: { sfx: 'reveal', ton: 1046.5, farg: 0xffe9b0 },
  blink: { sfx: 'pling', ton: 783.99, farg: 0xffe9b0 },
  sving: { sfx: 'soft', ton: 349.23, farg: 0xffe9b0 },
  byt_farg: { sfx: 'pling', ton: 659.25, farg: 0x5bbf6a },
  gront: { sfx: 'reveal', ton: 783.99, farg: 0x5bbf6a },
  alla_lyser: { sfx: 'magi', ton: 1046.5, farg: 0xffd35c },
  ballong: { sfx: 'pop', ton: 880, farg: 0xff6b6b },
  bil_fast: { sfx: 'soft', ton: 392, farg: 0x4aa3df },
  bil_studs: { prov: 'boing', ton: 329.63, farg: 0x4aa3df },
  korv: { prov: 'plopp', ton: 698.46, farg: 0xc9714d },
  markis: { sfx: 'flip', ton: 440, farg: 0xd9534a },
  grill: { sfx: 'soft', ton: 523.25, farg: 0xc9714d },
  ringklocka: { sfx: 'pling', ton: 1046.5, farg: 0xd8d3c8 },
  korg: { sfx: 'soft', ton: 493.88, farg: 0xd9b98a },
  sadelstuds: { sfx: 'boing', ton: 392, farg: 0x4aa3df },
}

// Kulissfärger (stad → förort)
const CITY_WALLS = [0x9aa3b5, 0xb08a75, 0x8f9aa8, 0xa88f9b, 0x93a89a]
const SUBURB_WALLS = [0xf2c94c, 0xe98fb0, 0x8fd0c8, 0xffb27a, 0xb5d98a]
const KATT_TINTS = [0xffb15c, 0x9aa2b0, 0xc9a06a]
const BALLONG_TINTS = [0xff6b6b, 0xffd35c, 0x4aa3df, 0xa78bfa, 0x5bbf6a, 0xff9ec4]
const MONSTER_TINTS = [0x9bd06b, 0xa78bfa, 0x57c8c3, 0xff9ec4]

// Pentatonisk skala för hemkomst-skutten + samla-plingar (stämda, aldrig blipp)
const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]

// ---- Ritade spelobjekt (P0 ASSETS: egen silhuett, aldrig emoji-i-ruta) -----

function drawKatt(tintC) {
  const c = new Container()
  const p = tintC ?? KATT_TINTS[(Math.random() * KATT_TINTS.length) | 0]
  const g = new Graphics()
  // svans (bakom kroppen, viftar uppåt)
  g.moveTo(30, 16).quadraticCurveTo(56, 4, 50, -22).stroke({ width: 9, color: shade(p, 0.14), cap: 'round' })
  // ben
  g.roundRect(-16, 24, 10, 16, 4).fill(shade(p, 0.1))
  g.roundRect(2, 24, 10, 16, 4).fill(shade(p, 0.1))
  g.roundRect(16, 24, 10, 16, 4).fill(shade(p, 0.1))
  // kropp
  g.ellipse(4, 14, 32, 20).fill(p)
  // huvud med öron
  g.moveTo(-40, -18).lineTo(-32, -38).lineTo(-22, -20).closePath().fill(p)
  g.moveTo(-18, -20).lineTo(-10, -38).lineTo(-2, -18).closePath().fill(p)
  g.moveTo(-36, -20).lineTo(-31, -32).lineTo(-26, -21).closePath().fill(0xf6c2d3)
  g.circle(-21, -6, 19).fill(tint(p, 0.08))
  // ansikte (vänd åt vänster — han går ditåt)
  g.circle(-29, -10, 3.4).fill(0x33291f)
  g.circle(-14, -10, 3.4).fill(0x33291f)
  g.moveTo(-24, -2).lineTo(-18, -2).lineTo(-21, 2).closePath().fill(0xe79ab0)
  g.moveTo(-21, 2).quadraticCurveTo(-27, 7, -31, 4).stroke({ width: 2.4, color: 0x6e5335, cap: 'round' })
  g.moveTo(-21, 2).quadraticCurveTo(-15, 7, -11, 4).stroke({ width: 2.4, color: 0x6e5335, cap: 'round' })
  g.moveTo(-38, -4).lineTo(-48, -6).moveTo(-38, 0).lineTo(-48, 2).stroke({ width: 1.6, color: 0x6e5335 })
  g.circle(-34, -1, 3.6).fill({ color: 0xff9ec4, alpha: 0.6 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function drawHund() {
  const c = new Container()
  const p = 0xa8744f
  const g = new Graphics()
  g.moveTo(34, 8).quadraticCurveTo(54, -2, 50, -20).stroke({ width: 10, color: shade(p, 0.12), cap: 'round' })
  g.roundRect(-20, 26, 12, 18, 5).fill(shade(p, 0.1))
  g.roundRect(0, 26, 12, 18, 5).fill(shade(p, 0.1))
  g.roundRect(18, 26, 12, 18, 5).fill(shade(p, 0.1))
  g.ellipse(6, 14, 36, 22).fill(p)
  g.ellipse(16, 8, 14, 10).fill(0xd9b28a) // fläck
  g.circle(-24, -10, 21).fill(p)
  // hängande öron
  g.ellipse(-42, -8, 8, 15).fill(shade(p, 0.2))
  g.ellipse(-7, -8, 8, 15).fill(shade(p, 0.2))
  g.circle(-31, -14, 3.6).fill(0x33291f)
  g.circle(-16, -14, 3.6).fill(0x33291f)
  g.ellipse(-25, -3, 6.5, 5).fill(0x4a3526) // nos
  g.moveTo(-25, 2).quadraticCurveTo(-25, 8, -18, 8).stroke({ width: 2.6, color: 0x4a3526, cap: 'round' })
  g.ellipse(-18, 12, 5, 7).fill(0xff8aa0) // tunga
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function drawFagel() {
  const c = new Container()
  const g = new Graphics()
  g.moveTo(18, 2).lineTo(34, -4).lineTo(32, 8).closePath().fill(0x3f78ad) // stjärt
  g.ellipse(0, 0, 19, 15).fill(0x5db1e8)
  g.ellipse(-2, 6, 11, 8).fill(0xfff3d6) // mage
  g.circle(-14, -6, 10).fill(0x5db1e8)
  g.moveTo(-23, -6).lineTo(-32, -3).lineTo(-23, -1).closePath().fill(0xffa63d) // näbb
  g.circle(-16, -8, 2.8).fill(0x33291f)
  g.eventMode = 'none'
  c.addChild(g)
  const wing = new Graphics()
  wing.ellipse(0, -7, 13, 8).fill(0x3f78ad)
  wing.position.set(3, -2)
  wing.pivot.set(0, 1)
  wing.eventMode = 'none'
  c.addChild(wing)
  c._wxWing = wing
  return c
}

// ---- Monsterfamiljen: 6 arter ----------------------------------------------
// TOLV arter (1–6 byggda 2026-08-08, 7–12 samma kväll). Alla ritas i SAMMA
// silhuett-låda som fysikkroppen (cirkel r=42): bredd ≈ ±40, topp ≈ -42,
// fötterna vilar på y ≈ 38 — ingen art är större eller mindre än en annan.
//
// Varje form får sitt EGET .fill() direkt efter formen (en Graphics smittar
// annars alla former med den första fyllningens färg). Allt ritat är
// eventMode='none' — trycken hanteras av spelet, inte av objekten.
//
// Rörliga delar läggs på c._wxWing (samma fältnamn som fågeln/krukan) så att
// _afterPhysics animerar dem gratis: goblins mösstopp, tentas tentakler och
// flaxis vingar, snigelns ögonstjälkar, svampens hatt, spökets armar och
// robotens antenn. Ludd, taggis, sten, maskis och grodis har ingen rörlig del och
// sätter inget fält — de lever på kroppsguppet i _afterPhysics.

const MONSTER_OGA = 0x4a3f6b // mjuk indigo pupill — aldrig rött
const MONSTER_MUN = 0x33291f
const MONSTER_CREAM = 0xfff3d6
const MONSTER_ROSA = 0xf6c2d3 // innerörat (samma som kattens)
const GOBLIN_GRON = 0x7cc257 // fast: goblinen är alltid grön
const GOBLIN_LILA = [0x8b5cf6, 0xa78bfa, 0x7c4bd0, 0xc084fc] // mössan varierar
const TENTA_TINTS = [0x57c8c3, 0xff9ec4, 0xa78bfa, 0x8fb6f2]
const TAGGIS_TINTS = [0xffb27a, 0x57c8c3, 0x9bd06b, 0xa78bfa]
const FLAXIS_TINTS = [0xa78bfa, 0xff9ec4, 0x8fb6f2, 0xc7a7f0]
const STEN_TINTS = [0x9a978f, 0xa8998a, 0x8f9aa8, 0xb0a595]

const slumpFarg = (list) => list[(Math.random() * list.length) | 0]

// Ett glatt öga: vit boll, mjuk pupill, blänk. blick = pupillens sidoförskjutning.
function monsterOga(g, x, y, r, blick = 0) {
  g.circle(x, y, r).fill(0xffffff)
  g.circle(x + blick, y + r * 0.14, r * 0.52).fill(MONSTER_OGA)
  g.circle(x + blick + r * 0.22, y - r * 0.3, Math.max(1.4, r * 0.22)).fill(0xffffff)
}

// 1. LUDD — familjens original: taggpäls, två horn, ETT stort öga.
function ritaLudd(p) {
  const c = new Container()
  const g = new Graphics()
  // luddig rund kropp: taggig päls runt en boll
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.moveTo(Math.cos(a) * 30, Math.sin(a) * 30 + 2)
      .lineTo(Math.cos(a + 0.26) * 39, Math.sin(a + 0.26) * 39 + 2)
      .lineTo(Math.cos(a + 0.52) * 30, Math.sin(a + 0.52) * 30 + 2)
      .closePath().fill(shade(p, 0.12))
  }
  g.circle(0, 2, 31).fill(p)
  // små horn
  g.moveTo(-14, -26).lineTo(-10, -40).lineTo(-4, -27).closePath().fill(MONSTER_CREAM)
  g.moveTo(14, -26).lineTo(10, -40).lineTo(4, -27).closePath().fill(MONSTER_CREAM)
  // ett stort glatt öga + mun med en tand
  g.circle(0, -6, 12).fill(0xffffff)
  g.circle(2, -5, 6).fill(MONSTER_OGA)
  g.circle(4, -7, 2).fill(0xffffff)
  g.moveTo(-12, 12).quadraticCurveTo(0, 22, 12, 12).stroke({ width: 3, color: MONSTER_MUN, cap: 'round' })
  g.moveTo(-3, 15).lineTo(3, 15).lineTo(0, 21).closePath().fill(0xffffff)
  // fötter
  g.ellipse(-12, 38, 9, 5).fill(shade(p, 0.2))
  g.ellipse(12, 38, 9, 5).fill(shade(p, 0.2))
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

// 2. GOBLIN — grön kropp, lila toppmössa, stora spetsiga öron, brett flin.
function ritaGoblin(p) {
  const c = new Container()
  const lila = slumpFarg(GOBLIN_LILA)
  const g = new Graphics()
  // stora spetsiga öron (bakom huvudet)
  g.moveTo(-15, -16).lineTo(-40, -28).lineTo(-13, -1).closePath().fill(shade(p, 0.1))
  g.moveTo(15, -16).lineTo(40, -28).lineTo(13, -1).closePath().fill(shade(p, 0.1))
  g.moveTo(-17, -15).lineTo(-33, -24).lineTo(-16, -6).closePath().fill(MONSTER_ROSA)
  g.moveTo(17, -15).lineTo(33, -24).lineTo(16, -6).closePath().fill(MONSTER_ROSA)
  // spretiga armar med små händer (mörkare än kroppen — annars försvinner de i den)
  g.moveTo(-18, 10).quadraticCurveTo(-30, 17, -28, 27).stroke({ width: 9, color: shade(p, 0.18), cap: 'round' })
  g.moveTo(18, 10).quadraticCurveTo(30, 17, 28, 27).stroke({ width: 9, color: shade(p, 0.18), cap: 'round' })
  g.circle(-28, 28, 6).fill(shade(p, 0.26))
  g.circle(28, 28, 6).fill(shade(p, 0.26))
  // ben + fötter
  g.roundRect(-14, 28, 9, 12, 4.5).fill(shade(p, 0.14))
  g.roundRect(5, 28, 9, 12, 4.5).fill(shade(p, 0.14))
  g.ellipse(-10, 38, 10, 5).fill(shade(p, 0.24))
  g.ellipse(10, 38, 10, 5).fill(shade(p, 0.24))
  // smal kropp (smalare än ludd)
  g.ellipse(0, 16, 21, 18).fill(p)
  g.ellipse(0, 20, 13, 12).fill(tint(p, 0.26))
  // huvud
  g.circle(0, -8, 19).fill(tint(p, 0.06))
  monsterOga(g, -7, -11, 6.5, 0.8)
  monsterOga(g, 7, -11, 6.5, 0.8)
  g.ellipse(0, -4, 4.5, 3.2).fill(shade(p, 0.2))
  // brett flin med två små hörntänder
  g.moveTo(-12, 0).quadraticCurveTo(0, 12, 12, 0).stroke({ width: 3, color: MONSTER_MUN, cap: 'round' })
  g.moveTo(-12, -0.5).lineTo(-7, 1.2).lineTo(-10, -5.5).closePath().fill(0xffffff)
  g.moveTo(12, -0.5).lineTo(7, 1.2).lineTo(10, -5.5).closePath().fill(0xffffff)
  g.circle(-15, -1, 4).fill({ color: 0xff9ec4, alpha: 0.45 })
  g.circle(15, -1, 4).fill({ color: 0xff9ec4, alpha: 0.45 })
  g.eventMode = 'none'
  c.addChild(g)
  // lila toppmössa i eget lager — brätte + lutande spets + tofs, nickar via _wxWing
  const hat = new Graphics()
  hat.moveTo(-19, -2).quadraticCurveTo(-12, -16, 19, -14).quadraticCurveTo(13, -6, 17, -2)
    .closePath().fill(lila)
  hat.moveTo(-9, -5).quadraticCurveTo(-2, -13, 13, -13)
    .stroke({ width: 2.6, color: tint(lila, 0.4), alpha: 0.7, cap: 'round' })
  hat.roundRect(-22, -4.5, 44, 9, 4.5).fill(shade(lila, 0.22))
  hat.circle(20, -14, 6).fill(tint(lila, 0.42))
  hat.circle(18, -16, 2.2).fill({ color: 0xffffff, alpha: 0.55 })
  hat.position.set(0, -23)
  hat.eventMode = 'none'
  c.addChild(hat)
  c._wxWing = hat
  return c
}

// 3. TENTA — bläckfisk: kupolkropp med krön, tre ögon i rad, fem tentakler.
function ritaTenta(p) {
  const c = new Container()
  // tentakler i eget lager BAKOM kupolen — svajar via _wxWing
  const arms = new Container()
  const ag = new Graphics()
  const tent = [
    [-24, 4, -35, 20, -33, 36],
    [-12, 6, -19, 24, -10, 38],
    [0, 6, 5, 22, -1, 39],
    [12, 6, 18, 24, 11, 38],
    [24, 4, 35, 20, 33, 36],
  ]
  for (const t of tent) {
    ag.moveTo(t[0], t[1]).quadraticCurveTo(t[2], t[3], t[4], t[5])
      .stroke({ width: 9, color: shade(p, 0.14), cap: 'round' })
  }
  for (const t of tent) ag.circle(t[4], t[5], 3.4).fill(tint(p, 0.35))
  ag.eventMode = 'none'
  arms.addChild(ag)
  arms.pivot.set(0, -10)
  arms.position.set(0, -10)
  arms.eventMode = 'none'
  c.addChild(arms)
  const g = new Graphics()
  // krön ovanpå kupolen (breda bulor — smala slivers syns inte)
  g.moveTo(-14, -33).quadraticCurveTo(-11, -48, -4, -35).closePath().fill(shade(p, 0.2))
  g.moveTo(-6, -36).quadraticCurveTo(0, -52, 6, -36).closePath().fill(shade(p, 0.2))
  g.moveTo(4, -35).quadraticCurveTo(11, -48, 14, -33).closePath().fill(shade(p, 0.2))
  // rundad kupolkropp
  g.moveTo(-32, 8).quadraticCurveTo(-36, -38, 0, -38).quadraticCurveTo(36, -38, 32, 8)
    .closePath().fill(p)
  g.ellipse(0, 7, 32, 9).fill(shade(p, 0.08))
  g.circle(-17, -20, 5).fill(tint(p, 0.3))
  g.circle(10, -26, 4).fill(tint(p, 0.3))
  g.circle(21, -12, 3).fill(tint(p, 0.3))
  // tre små ögon i rad
  monsterOga(g, -14, -8, 6.5)
  monsterOga(g, 0, -11, 7.5)
  monsterOga(g, 14, -8, 6.5)
  g.moveTo(-7, 3).quadraticCurveTo(0, 10, 7, 3).stroke({ width: 2.8, color: MONSTER_MUN, cap: 'round' })
  g.circle(-23, -1, 4).fill({ color: 0xff9ec4, alpha: 0.4 })
  g.circle(23, -1, 4).fill({ color: 0xff9ec4, alpha: 0.4 })
  g.eventMode = 'none'
  c.addChild(g)
  c._wxWing = arms
  return c
}

// 4. TAGGIS — låg och bred, taggrad längs ryggen, stora ögonbryn, korta ben.
function ritaTaggis(p) {
  const c = new Container()
  const g = new Graphics()
  // ryggtaggar (bakom kroppen — baserna göms av magen)
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (1.2 + (i / 6) * 0.6)
    const nx = Math.cos(a)
    const ny = Math.sin(a)
    const bx = nx * 32
    const by = 8 + ny * 21
    const h = 24 - Math.abs(i - 3) * 3
    g.moveTo(bx + ny * 6, by - nx * 6)
      .lineTo(bx + nx * h, by + ny * h)
      .lineTo(bx - ny * 6, by + nx * 6)
      .closePath().fill(shade(p, 0.26))
  }
  // bakben
  g.ellipse(-16, 36, 10, 5).fill(shade(p, 0.34))
  g.ellipse(18, 36, 10, 5).fill(shade(p, 0.34))
  // låg bred kropp
  g.ellipse(0, 10, 38, 25).fill(p)
  g.ellipse(0, 17, 24, 15).fill(tint(p, 0.3))
  // korta framben + tassar
  g.roundRect(-30, 26, 13, 12, 6).fill(shade(p, 0.15))
  g.roundRect(17, 26, 13, 12, 6).fill(shade(p, 0.15))
  g.ellipse(-24, 38, 12, 5.5).fill(shade(p, 0.26))
  g.ellipse(23, 38, 12, 5.5).fill(shade(p, 0.26))
  // stora ögon under tunga bryn
  monsterOga(g, -13, -4, 9)
  monsterOga(g, 13, -4, 9)
  // bågade bryn — raka streck läser argt, bågen gör grimasen komisk i stället
  g.moveTo(-25, -14).quadraticCurveTo(-16, -20, -6, -12).stroke({ width: 5.5, color: shade(p, 0.4), cap: 'round' })
  g.moveTo(25, -14).quadraticCurveTo(16, -20, 6, -12).stroke({ width: 5.5, color: shade(p, 0.4), cap: 'round' })
  // sur-glad grimas: brett flin med en tand
  g.moveTo(-17, 8).quadraticCurveTo(0, 22, 17, 8).stroke({ width: 3.4, color: MONSTER_MUN, cap: 'round' })
  g.moveTo(-5, 12).lineTo(5, 12).lineTo(0, 19).closePath().fill(0xffffff)
  g.circle(-27, 4, 4.5).fill({ color: 0xff9ec4, alpha: 0.4 })
  g.circle(27, 4, 4.5).fill({ color: 0xff9ec4, alpha: 0.4 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

// 5. FLAXIS — liten rund kropp, stora runda öron, fladdermusvingar som viftar.
function ritaFlaxis(p) {
  const c = new Container()
  const membran = tint(p, 0.28)
  // vingpar i eget lager bakom kroppen — viftar via _wxWing
  const wings = new Container()
  const wg = new Graphics()
  wg.moveTo(-8, -10)
    .quadraticCurveTo(-28, -24, -41, -13)
    .quadraticCurveTo(-30, -10, -28, 1)
    .quadraticCurveTo(-22, -6, -17, 3)
    .quadraticCurveTo(-12, -4, -7, 2)
    .closePath().fill(membran).stroke({ width: 2.6, color: shade(p, 0.3), alpha: 0.9, join: 'round' })
  wg.moveTo(8, -10)
    .quadraticCurveTo(28, -24, 41, -13)
    .quadraticCurveTo(30, -10, 28, 1)
    .quadraticCurveTo(22, -6, 17, 3)
    .quadraticCurveTo(12, -4, 7, 2)
    .closePath().fill(membran).stroke({ width: 2.6, color: shade(p, 0.3), alpha: 0.9, join: 'round' })
  wg.moveTo(-9, -8).lineTo(-31, -10).moveTo(-9, -8).lineTo(-23, 0).moveTo(-9, -8).lineTo(-14, 2)
    .stroke({ width: 2, color: shade(p, 0.22), alpha: 0.8, cap: 'round' })
  wg.moveTo(9, -8).lineTo(31, -10).moveTo(9, -8).lineTo(23, 0).moveTo(9, -8).lineTo(14, 2)
    .stroke({ width: 2, color: shade(p, 0.22), alpha: 0.8, cap: 'round' })
  wg.eventMode = 'none'
  wings.addChild(wg)
  wings.pivot.set(0, -6)
  wings.position.set(0, -6)
  wings.scale.set(1.24, 1.08) // bredare än öronen (mätt i skärmdumpen: stack bara ut 13 px)
  wings.eventMode = 'none'
  c.addChild(wings)
  const g = new Graphics()
  // tofs
  g.moveTo(0, -16).quadraticCurveTo(-7, -30, 3, -36).stroke({ width: 5, color: shade(p, 0.14), cap: 'round' })
  // stora runda öron
  g.circle(-15, -16, 13).fill(p)
  g.circle(15, -16, 13).fill(p)
  g.circle(-15, -16, 7.5).fill(MONSTER_ROSA)
  g.circle(15, -16, 7.5).fill(MONSTER_ROSA)
  // ben + små tassar
  g.roundRect(-12, 30, 7, 9, 3.5).fill(shade(p, 0.18))
  g.roundRect(5, 30, 7, 9, 3.5).fill(shade(p, 0.18))
  g.ellipse(-9, 37, 7, 4.5).fill(shade(p, 0.24))
  g.ellipse(9, 37, 7, 4.5).fill(shade(p, 0.24))
  // rund kropp (kropp och huvud i ett)
  g.circle(0, 8, 23).fill(p)
  g.ellipse(0, 15, 14, 12).fill(tint(p, 0.3))
  monsterOga(g, -8, 2, 7)
  monsterOga(g, 8, 2, 7)
  g.ellipse(0, 10, 7, 5).fill(tint(p, 0.38))
  g.ellipse(0, 8, 3.6, 2.6).fill(shade(p, 0.4))
  g.moveTo(-6, 13).quadraticCurveTo(0, 18, 6, 13).stroke({ width: 2.6, color: MONSTER_MUN, cap: 'round' })
  g.circle(-2.6, 14.6, 1.8).fill(0xffffff)
  g.circle(2.6, 14.6, 1.8).fill(0xffffff)
  g.circle(-16, 8, 4).fill({ color: 0xff9ec4, alpha: 0.45 })
  g.circle(16, 8, 4).fill({ color: 0xff9ec4, alpha: 0.45 })
  g.eventMode = 'none'
  c.addChild(g)
  c._wxWing = wings
  return c
}

// 6. STEN — kantig klumpvarelse: fasetter i två nyanser, tunga lock, mossa.
function ritaSten(p) {
  const c = new Container()
  const ljus = tint(p, 0.22)
  const mork = shade(p, 0.22)
  const g = new Graphics()
  // kantiga fötter
  g.moveTo(-30, 26).lineTo(-8, 26).lineTo(-6, 39).lineTo(-32, 39).closePath().fill(mork)
  g.moveTo(8, 26).lineTo(30, 26).lineTo(32, 39).lineTo(6, 39).closePath().fill(mork)
  // polygonkropp med ljus kantlinje så den lyfter mot den gråblå stan
  g.moveTo(-36, 6).lineTo(-30, -20).lineTo(-12, -33).lineTo(12, -35).lineTo(30, -22)
    .lineTo(36, 2).lineTo(30, 26).lineTo(-28, 28).closePath()
    .fill(p).stroke({ width: 3, color: tint(p, 0.42), alpha: 0.55 })
  // fasetter
  g.moveTo(-30, -20).lineTo(-12, -33).lineTo(-6, -12).lineTo(-28, -6).closePath().fill(ljus)
  g.moveTo(36, 2).lineTo(30, 26).lineTo(2, 24).lineTo(8, 0).closePath().fill(mork)
  g.moveTo(-30, 2).lineTo(-22, 6).lineTo(-26, 13).stroke({ width: 2.4, color: shade(p, 0.45), alpha: 0.85, cap: 'round' })
  // ögon med tunga ögonlock
  monsterOga(g, -12, -8, 9)
  monsterOga(g, 12, -8, 9)
  g.moveTo(-21.5, -11).quadraticCurveTo(-12, -24, -2.5, -11).closePath().fill(mork)
  g.moveTo(21.5, -11).quadraticCurveTo(12, -24, 2.5, -11).closePath().fill(mork)
  g.moveTo(-21.5, -10.6).lineTo(-2.5, -10.6).stroke({ width: 2, color: shade(p, 0.4), cap: 'round' })
  g.moveTo(21.5, -10.6).lineTo(2.5, -10.6).stroke({ width: 2, color: shade(p, 0.4), cap: 'round' })
  // mossfläckar ovanpå
  g.circle(-20, -23, 7).fill(0x6fbf5a)
  g.circle(-11, -28, 6).fill(0x7fcf66)
  g.circle(-25, -16, 5).fill(0x6fbf5a)
  g.circle(24, -16, 5.5).fill(0x6fbf5a)
  g.circle(28, -10, 4).fill(0x7fcf66)
  g.moveTo(-16, -30).lineTo(-15, -37).moveTo(-9, -32).lineTo(-6, -38)
    .stroke({ width: 2.4, color: 0x4f9e42, cap: 'round' })
  // glad stenmun (egen mörk ton — shade() av grått blir för svagt)
  g.moveTo(-11, 9).quadraticCurveTo(0, 19, 11, 9).stroke({ width: 3.2, color: 0x4a4238, cap: 'round' })
  g.circle(-24, 4, 4.5).fill({ color: 0xff9ec4, alpha: 0.25 })
  g.circle(24, 6, 4.5).fill({ color: 0xff9ec4, alpha: 0.25 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

// ---- Monsterfamiljen: sex NYA arter (7–12) ---------------------------------
// Klistras in i src/games/natskott-pa-stan/index.js direkt efter ritaSten().
// Samma konventioner som arterna 1–6:
//   · silhuett-lådan är fysikkroppen (cirkel r=42): bredd ≈ ±40, topp ≈ -42,
//     fötterna vilar på y ≈ 38 — ingen art är större eller mindre än en annan
//   · varje form får sitt EGET .fill() direkt efter formen (en Graphics smittar
//     annars alla former med den första fyllningens färg)
//   · allt ritat är eventMode='none' — trycken hanteras av spelet
//   · rörliga delar läggs på c._wxWing (svajar i _afterPhysics). Snigelns
//     ögonstjälkar, svampens hatt, spökets armar och robotens antenn har en.
//     Maskis och grodis har ingen och sätter inget fält.
//
// Riktningarna är valda för att INTE upprepa de sex befintliga silhuetterna
// (rund lurvig · humanoid med mössa · kupol med tentakler · bred med taggar ·
// rund med vingar · kantig sten):
//   snigel  – vågrät kropp med spiralskal på ryggen och ögon på stjälkar
//   maskis  – lodrät båge av ledade segment (mätarlarv mitt i steget)
//   svampis – topptung paraplyhatt över en smal stjälk
//   grodis  – bred hukande groda med jättelika simhudsfötter och ögon PÅ hjässan
//   spoke   – benlös, avsmalnande, med fransig, vågig underkant
//   robo    – rätvinklig plåtkropp med antenn, skruvar och två hjul

const SNIGEL_TINTS = [0x8ad9bf, 0x9fd0f0, 0xf9c39b, 0xd7e58c]
const SNIGEL_SKAL = [0xe09a4f, 0xd8705f, 0xc98ad8, 0xefc25a] // skalet varierar fritt
const MASKIS_TINTS = [0xff9f6b, 0xffd166, 0x7fd1e8, 0x9be0a8]
const SVAMPIS_TINTS = [0xf47c6a, 0xffc94d, 0x7db8f0, 0xcf8ae0]
const GRODIS_TINTS = [0x62c98d, 0x5fb8e0, 0xe8b45a, 0xef8f77]
const SPOKE_TINTS = [0xe3edfb, 0xfde8f2, 0xe2f8ee, 0xf0eafd]
const ROBO_TINTS = [0xf2a24a, 0xe07f9d, 0x7ec8e3, 0xe8cf55]

// 7. SNIGEL — vågrät mjuk kropp, stort spiralskal på ryggen, ögon på stjälkar.
// Låda: x -40..39, y -42..38.
function ritaSnigel(p) {
  const c = new Container()
  const skal = slumpFarg(SNIGEL_SKAL)
  const g = new Graphics()
  // blankt slemspår under foten
  g.ellipse(-2, 35, 34, 3).fill({ color: 0xffffff, alpha: 0.3 })
  // fotsula
  g.ellipse(-3, 31, 37, 7).fill(shade(p, 0.24))
  // mjuk kropp: huvud åt vänster, avsmalnande svans åt höger
  g.moveTo(-38, 30)
    .quadraticCurveTo(-40, 10, -26, 5)
    .quadraticCurveTo(-6, -3, 16, 8)
    .quadraticCurveTo(33, 16, 32, 30)
    .quadraticCurveTo(0, 36, -38, 30)
    .closePath().fill(p)
  // tydlig huvudkula så ansiktet har en yta att sitta på
  g.circle(-26, 14, 14).fill(tint(p, 0.14))
  g.circle(-26, 14, 14).stroke({ width: 2, color: shade(p, 0.22), alpha: 0.4 })
  g.moveTo(20, 14).quadraticCurveTo(27, 22, 25, 30)
    .stroke({ width: 2.4, color: shade(p, 0.2), alpha: 0.7, cap: 'round' })
  // skalet: förskjutna ringar läser som en spiral
  g.circle(10, -8, 28).fill(skal).stroke({ width: 3, color: shade(skal, 0.3) })
  g.circle(7, -4, 21).fill(tint(skal, 0.22))
  g.circle(4, -1, 14).fill(skal)
  g.circle(2, 1, 7.5).fill(tint(skal, 0.34))
  g.circle(1, 2, 2.8).fill(shade(skal, 0.2))
  g.moveTo(10, -36).quadraticCurveTo(32, -20, 26, 4)
    .stroke({ width: 2.6, color: shade(skal, 0.26), alpha: 0.5, cap: 'round' })
  // ansikte på huvudet (ögonen sitter på stjälkarna)
  g.moveTo(-35, 15).quadraticCurveTo(-27, 27, -18, 18)
    .stroke({ width: 4, color: MONSTER_MUN, cap: 'round' })
  g.circle(-29, 21.5, 2.6).fill({ color: 0xffffff, alpha: 0.85 })
  g.circle(-36, 11, 4.4).fill({ color: 0xff9ec4, alpha: 0.5 })
  g.circle(-17, 13, 4).fill({ color: 0xff9ec4, alpha: 0.4 })
  g.eventMode = 'none'
  c.addChild(g)
  // ögonstjälkar i eget lager — vaggar via _wxWing.
  // Mörkare än kroppen: samma färg försvann helt i huvudkulan (mätt i bilden).
  const stalks = new Container()
  const sg = new Graphics()
  const stjelk = shade(p, 0.3)
  sg.moveTo(-3, 6).quadraticCurveTo(-12, -18, -7, -34).stroke({ width: 7, color: stjelk, cap: 'round' })
  sg.moveTo(5, 4).quadraticCurveTo(13, -20, 8, -36).stroke({ width: 7, color: stjelk, cap: 'round' })
  monsterOga(sg, -7, -35, 8, 0.7)
  monsterOga(sg, 8, -37, 8, 0.7)
  sg.eventMode = 'none'
  stalks.addChild(sg)
  stalks.position.set(-25, 6)
  stalks.eventMode = 'none'
  c.addChild(stalks)
  c._wxWing = stalks
  return c
}

// 8. MASKIS — mätarlarv: en SAMMANHÄNGANDE kropp i en båge, med ledbulor.
// Första versionen ritade lösa cirklar med ljust hål i mitten och läste som en
// hög guldmynt i skärmdumpen — kroppen är därför en enda tjock stroke längs
// ryggraden, och bulorna ligger OVANPÅ den.
// Låda: x -40..38, y -34..38.
function ritaMaskis(p) {
  const c = new Container()
  const g = new Graphics()
  // ryggrad: huvudänden nere till vänster, svansänden nere till höger
  const spine = [
    [-24, 20],
    [-19, -1],
    [-6, -20],
    [11, -21],
    [23, -2],
    [26, 21],
  ]
  // fotdynor först (bakom kroppen)
  g.ellipse(-24, 34, 13, 4).fill(shade(p, 0.34))
  g.ellipse(26, 34, 11, 4).fill(shade(p, 0.34))
  // sammanhängande kroppsslang
  g.moveTo(spine[0][0], spine[0][1])
  for (let i = 1; i < spine.length; i++) g.lineTo(spine[i][0], spine[i][1])
  g.stroke({ width: 24, color: p, cap: 'round', join: 'round' })
  // ljus undersida: samma väg, förskjuten in mot bågens insida
  g.moveTo(spine[0][0] * 0.72 + 1, spine[0][1] * 0.72 + 6)
  for (let i = 1; i < spine.length; i++) g.lineTo(spine[i][0] * 0.72 + 1, spine[i][1] * 0.72 + 6)
  g.stroke({ width: 8, color: tint(p, 0.3), alpha: 0.75, cap: 'round', join: 'round' })
  // ledbulor ovanpå slangen — varannan mörkare, med tunn ledlinje
  const bula = [
    [-19, -1, 12.5],
    [-6, -20, 12.5],
    [11, -21, 12],
    [23, -2, 11.5],
    [26, 21, 11],
  ]
  for (let i = 0; i < bula.length; i++) {
    const [sx, sy, sr] = bula[i]
    g.circle(sx, sy, sr).fill(i % 2 ? shade(p, 0.13) : p)
    g.circle(sx, sy, sr).stroke({ width: 1.8, color: shade(p, 0.3), alpha: 0.4 })
  }
  // små prolegs under de två markbulorna
  g.ellipse(20, 30, 6, 3.5).fill(shade(p, 0.3))
  g.ellipse(-14, 30, 6, 3.5).fill(shade(p, 0.3))
  // antenner (går fritt upp åt vänster, utanför bågen)
  g.moveTo(-30, 10).quadraticCurveTo(-37, 4, -36, -3)
    .stroke({ width: 3.4, color: shade(p, 0.34), cap: 'round' })
  g.circle(-36, -4, 3.8).fill(tint(p, 0.45)).stroke({ width: 1.6, color: shade(p, 0.34) })
  g.moveTo(-26, 7).quadraticCurveTo(-32, 0, -31, -8)
    .stroke({ width: 3.4, color: shade(p, 0.34), cap: 'round' })
  g.circle(-31, -9, 3.8).fill(tint(p, 0.45)).stroke({ width: 1.6, color: shade(p, 0.34) })
  // huvud sist, störst av alla leder
  g.circle(-24, 20, 16).fill(tint(p, 0.1))
  g.circle(-24, 20, 16).stroke({ width: 1.8, color: shade(p, 0.26), alpha: 0.5 })
  monsterOga(g, -30, 16, 7.5, 0.7)
  monsterOga(g, -14, 15, 7.5, 0.7)
  g.moveTo(-30, 28).quadraticCurveTo(-22, 35, -14, 26)
    .stroke({ width: 3.2, color: MONSTER_MUN, cap: 'round' })
  g.circle(-35, 24, 4.2).fill({ color: 0xff9ec4, alpha: 0.45 })
  g.circle(-11, 22, 4.2).fill({ color: 0xff9ec4, alpha: 0.45 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

// 9. SVAMPIS — bred prickig hatt över en smal ljus stjälk med små fötter.
// Låda: x -40..40, y -42..38.
function ritaSvampis(p) {
  const c = new Container()
  // Stjälken var först nästan vit (tint 0.6) — ansiktet försvann i den i bilden.
  const stjalk = tint(p, 0.44)
  const g = new Graphics()
  // stjälk (kroppen)
  g.roundRect(-19, -14, 38, 44, 16).fill(stjalk)
  g.roundRect(-19, -14, 38, 44, 16).stroke({ width: 2.4, color: shade(p, 0.14), alpha: 0.45 })
  g.ellipse(0, 30, 22, 6).fill(shade(stjalk, 0.12)) // utsvängd fot
  g.ellipse(-11, 34, 10, 4).fill(shade(stjalk, 0.26))
  g.ellipse(11, 34, 10, 4).fill(shade(stjalk, 0.26))
  // korta armar (tonade mot HATTFÄRGEN — stjälkens egen ton syntes inte)
  g.moveTo(-16, 8).quadraticCurveTo(-27, 13, -29, 23)
    .stroke({ width: 8.5, color: shade(p, 0.18), cap: 'round' })
  g.moveTo(16, 8).quadraticCurveTo(27, 13, 29, 23)
    .stroke({ width: 8.5, color: shade(p, 0.18), cap: 'round' })
  g.circle(-29, 24, 5.6).fill(shade(p, 0.28))
  g.circle(29, 24, 5.6).fill(shade(p, 0.28))
  // krage där hatten sitter fast
  g.ellipse(0, -1, 23, 6).fill(tint(p, 0.3))
  // ansikte på stjälken — stort nog att bära arten (hatten är stor)
  monsterOga(g, -9, 10, 9)
  monsterOga(g, 9, 10, 9)
  g.moveTo(-9, 23).quadraticCurveTo(0, 31, 9, 23)
    .stroke({ width: 3.2, color: MONSTER_MUN, cap: 'round' })
  g.circle(-17, 18, 4.4).fill({ color: 0xff9ec4, alpha: 0.5 })
  g.circle(17, 18, 4.4).fill({ color: 0xff9ec4, alpha: 0.5 })
  g.eventMode = 'none'
  c.addChild(g)
  // hatten i eget lager — tippar via _wxWing (pivot i hattens fot)
  const hat = new Container()
  const hg = new Graphics()
  hg.moveTo(-40, 2).quadraticCurveTo(-40, -36, 0, -36).quadraticCurveTo(40, -36, 40, 2)
    .closePath().fill(p)
  hg.ellipse(0, 1, 39, 6).fill(shade(p, 0.28)) // hattens undersida
  hg.circle(-21, -13, 7).fill(MONSTER_CREAM)
  hg.circle(3, -22, 8.5).fill(MONSTER_CREAM)
  hg.circle(24, -10, 6).fill(MONSTER_CREAM)
  hg.circle(-7, -6, 4.5).fill(MONSTER_CREAM)
  hg.circle(16, -26, 4).fill(MONSTER_CREAM)
  hg.circle(-32, -5, 4.2).fill(MONSTER_CREAM)
  hg.moveTo(-25, -17).quadraticCurveTo(-15, -31, 1, -32)
    .stroke({ width: 3, color: tint(p, 0.4), alpha: 0.6, cap: 'round' })
  hg.eventMode = 'none'
  hat.addChild(hg)
  hat.position.set(0, -6)
  hat.eventMode = 'none'
  c.addChild(hat)
  c._wxWing = hat
  return c
}

// 10. GRODIS — bred hukande groda: ögon på hjässan, jättelika simhudsfötter.
// Låda: x -40..40, y -35..38.
function ritaGrodis(p) {
  const c = new Container()
  const buk = tint(p, 0.42)
  const g = new Graphics()
  // Simhudsfötterna var bara 16 % mörkare i första versionen och smälte ihop
  // med kroppen i bilden — nu 32 % med tydliga tåstreck.
  const fot = shade(p, 0.32)
  g.moveTo(-4, 38).lineTo(-4, 28)
    .quadraticCurveTo(-13, 21, -17, 29)
    .quadraticCurveTo(-25, 21, -29, 29)
    .quadraticCurveTo(-36, 22, -39, 30)
    .quadraticCurveTo(-41, 38, -32, 38)
    .closePath().fill(fot)
  g.moveTo(4, 38).lineTo(4, 28)
    .quadraticCurveTo(13, 21, 17, 29)
    .quadraticCurveTo(25, 21, 29, 29)
    .quadraticCurveTo(36, 22, 39, 30)
    .quadraticCurveTo(41, 38, 32, 38)
    .closePath().fill(fot)
  g.moveTo(-7, 36).lineTo(-16, 27).moveTo(-7, 36).lineTo(-27, 27).moveTo(-7, 36).lineTo(-36, 29)
    .stroke({ width: 2.2, color: shade(p, 0.52), alpha: 0.75, cap: 'round' })
  g.moveTo(7, 36).lineTo(16, 27).moveTo(7, 36).lineTo(27, 27).moveTo(7, 36).lineTo(36, 29)
    .stroke({ width: 2.2, color: shade(p, 0.52), alpha: 0.75, cap: 'round' })
  // bred låg kropp (huvud och bål i ett, som en riktig groda)
  g.moveTo(-31, 30).quadraticCurveTo(-36, -12, 0, -14).quadraticCurveTo(36, -12, 31, 30)
    .quadraticCurveTo(0, 40, -31, 30).closePath().fill(p)
  g.ellipse(-21, 2, 7, 5).fill(shade(p, 0.16))
  g.ellipse(22, 5, 6, 4.5).fill(shade(p, 0.16))
  g.ellipse(0, 20, 23, 14).fill(buk)
  g.ellipse(0, 8, 26, 12).fill(tint(p, 0.2)) // ljus nos/käkparti bakom leendet
  // framarmar
  g.moveTo(-27, 4).quadraticCurveTo(-35, 15, -32, 26)
    .stroke({ width: 8, color: shade(p, 0.12), cap: 'round' })
  g.moveTo(27, 4).quadraticCurveTo(35, 15, 32, 26)
    .stroke({ width: 8, color: shade(p, 0.12), cap: 'round' })
  g.circle(-31, 27, 5.5).fill(shade(p, 0.24))
  g.circle(31, 27, 5.5).fill(shade(p, 0.24))
  // ögonkupoler PÅ hjässan, med en pannbrygga emellan så de sitter FAST
  g.moveTo(-24, -14).quadraticCurveTo(0, -28, 24, -14).quadraticCurveTo(0, -4, -24, -14)
    .closePath().fill(p)
  g.circle(-17, -20, 15).fill(p)
  g.circle(17, -20, 15).fill(p)
  monsterOga(g, -17, -18, 10)
  monsterOga(g, 17, -18, 10)
  g.moveTo(-31, -22).quadraticCurveTo(-17, -38, -3, -22).closePath().fill(shade(p, 0.14))
  g.moveTo(31, -22).quadraticCurveTo(17, -38, 3, -22).closePath().fill(shade(p, 0.14))
  // näsborrar + jättebrett grodleende
  g.circle(-6, -5, 2.2).fill(shade(p, 0.4))
  g.circle(6, -5, 2.2).fill(shade(p, 0.4))
  g.moveTo(-25, 3).quadraticCurveTo(0, 21, 25, 3)
    .stroke({ width: 3.6, color: MONSTER_MUN, cap: 'round' })
  g.circle(-26, 14, 5).fill({ color: 0xff9ec4, alpha: 0.45 })
  g.circle(26, 14, 5).fill({ color: 0xff9ec4, alpha: 0.45 })
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

// 11. SPOKE — benlös, mjukt avsmalnande, med fransig, vågig underkant.
// Bleka färger + kraftig kontur så den syns mot BÅDE natt-stan och pastellförorten.
// Låda: x -40..40, y -42..38.
function ritaSpoke(p) {
  const c = new Container()
  const kant = shade(p, 0.4)
  // armar i eget lager BAKOM kroppen — vaggar via _wxWing
  // Armarna satt först i öronhöjd (y ≈ -18) och lästes som ÖRON i bilden —
  // de sitter nu i midjehöjd och pekar utåt, som armar.
  const arms = new Container()
  const ag = new Graphics()
  ag.moveTo(-20, 8).quadraticCurveTo(-30, 8, -33, 0).stroke({ width: 12, color: kant, cap: 'round' })
  ag.moveTo(20, 8).quadraticCurveTo(30, 8, 33, 0).stroke({ width: 12, color: kant, cap: 'round' })
  ag.moveTo(-20, 8).quadraticCurveTo(-30, 8, -33, 0).stroke({ width: 8.4, color: p, cap: 'round' })
  ag.moveTo(20, 8).quadraticCurveTo(30, 8, 33, 0).stroke({ width: 8.4, color: p, cap: 'round' })
  ag.circle(-33, -1, 5).fill(p).stroke({ width: 2.4, color: kant })
  ag.circle(33, -1, 5).fill(p).stroke({ width: 2.4, color: kant })
  ag.eventMode = 'none'
  arms.addChild(ag)
  arms.eventMode = 'none'
  c.addChild(arms)
  const g = new Graphics()
  // kropp: hög rundad hjässa som smalnar av till fem fransar
  g.moveTo(-34, 24)
    .quadraticCurveTo(-39, -40, 0, -40)
    .quadraticCurveTo(39, -40, 34, 24)
    .quadraticCurveTo(27.2, 50, 20.4, 24)
    .quadraticCurveTo(13.6, 50, 6.8, 24)
    .quadraticCurveTo(0, 50, -6.8, 24)
    .quadraticCurveTo(-13.6, 50, -20.4, 24)
    .quadraticCurveTo(-27.2, 50, -34, 24)
    .closePath().fill(p).stroke({ width: 3, color: kant, join: 'round' })
  g.ellipse(0, -10, 25, 23).fill({ color: 0xffffff, alpha: 0.45 })
  g.moveTo(-18, 14).quadraticCurveTo(0, 21, 18, 14)
    .stroke({ width: 2.2, color: kant, alpha: 0.3, cap: 'round' })
  // ansikte — bleka kroppen kräver en tunn ring runt ögonvitan
  monsterOga(g, -12, -16, 9)
  monsterOga(g, 12, -16, 9)
  g.circle(-12, -16, 9).stroke({ width: 2, color: kant, alpha: 0.5 })
  g.circle(12, -16, 9).stroke({ width: 2, color: kant, alpha: 0.5 })
  g.ellipse(0, 4, 7, 8.5).fill(MONSTER_MUN)
  g.ellipse(0, 9, 4.2, 3).fill(0xff8aa0)
  g.circle(-23, -3, 5).fill({ color: 0xff9ec4, alpha: 0.5 })
  g.circle(23, -3, 5).fill({ color: 0xff9ec4, alpha: 0.5 })
  g.eventMode = 'none'
  c.addChild(g)
  c._wxWing = arms
  return c
}

// 12. ROBO — rätvinklig plåtkropp, mörkt visir, skruvar, fjäderarmar, två hjul.
// Låda: x -40..40, y -42..38.
function ritaRobo(p) {
  const c = new Container()
  const metall = 0xc3cdda
  const mork = 0x38415a
  const g = new Graphics()
  // hjul
  g.circle(-17, 27, 11).fill(mork)
  g.circle(17, 27, 11).fill(mork)
  g.circle(-17, 27, 5).fill(metall)
  g.circle(17, 27, 5).fill(metall)
  g.circle(-17, 27, 2).fill(shade(metall, 0.4))
  g.circle(17, 27, 2).fill(shade(metall, 0.4))
  g.roundRect(-18, 19, 36, 7, 3.5).fill(shade(metall, 0.28))
  // fjäderarmar med runda händer (inga vapen, inga klor). Tunna ljusmetall-armar
  // försvann mot kroppen i bilden — nu mörk metall + ljus glansfog + axelkulor.
  g.moveTo(-24, 2).lineTo(-27, -4).lineTo(-30, 4).lineTo(-33, -2).lineTo(-33, 6)
    .stroke({ width: 6.4, color: 0x6f7c94, cap: 'round', join: 'round' })
  g.moveTo(24, 2).lineTo(27, -4).lineTo(30, 4).lineTo(33, -2).lineTo(33, 6)
    .stroke({ width: 6.4, color: 0x6f7c94, cap: 'round', join: 'round' })
  g.moveTo(-24, 2).lineTo(-27, -4).lineTo(-30, 4).lineTo(-33, -2).lineTo(-33, 6)
    .stroke({ width: 2.6, color: metall, cap: 'round', join: 'round' })
  g.moveTo(24, 2).lineTo(27, -4).lineTo(30, 4).lineTo(33, -2).lineTo(33, 6)
    .stroke({ width: 2.6, color: metall, cap: 'round', join: 'round' })
  g.circle(-33, 11, 6.4).fill(0x8b97ab).stroke({ width: 2, color: metall })
  g.circle(33, 11, 6.4).fill(0x8b97ab).stroke({ width: 2, color: metall })
  g.circle(-25, 2, 5).fill(0x6f7c94)
  g.circle(25, 2, 5).fill(0x6f7c94)
  // kropp
  g.roundRect(-26, -6, 52, 30, 11).fill(p)
  g.roundRect(-17, 0, 34, 17, 7).fill(tint(p, 0.46))
  g.circle(-9, 8, 3.6).fill(0x7fe0a0)
  g.circle(0, 8, 3.6).fill(0xffd35c)
  g.circle(9, 8, 3.6).fill(0x8fd4f5)
  // skruvar i hörnen
  const skruv = [[-21, -1], [21, -1], [-21, 19], [21, 19]]
  for (const s of skruv) {
    g.circle(s[0], s[1], 3).fill(metall)
    g.moveTo(s[0] - 2, s[1]).lineTo(s[0] + 2, s[1]).stroke({ width: 1.4, color: shade(metall, 0.45) })
  }
  // hals
  g.roundRect(-7, -12, 14, 8, 3).fill(shade(metall, 0.14))
  // huvud + visir
  g.roundRect(-19, -30, 38, 24, 10).fill(tint(p, 0.16))
  g.circle(-21, -18, 4).fill(metall)
  g.circle(21, -18, 4).fill(metall)
  g.roundRect(-15, -27, 30, 15, 7).fill(mork)
  monsterOga(g, -7, -20, 5.5, 0.4)
  monsterOga(g, 7, -20, 5.5, 0.4)
  g.moveTo(-6, -11).quadraticCurveTo(0, -7, 6, -11)
    .stroke({ width: 2.4, color: MONSTER_CREAM, cap: 'round' })
  g.circle(-14, -9, 3.4).fill({ color: 0xff9ec4, alpha: 0.5 })
  g.circle(14, -9, 3.4).fill({ color: 0xff9ec4, alpha: 0.5 })
  g.eventMode = 'none'
  c.addChild(g)
  // antenn i eget lager — vickar via _wxWing
  const ant = new Container()
  const antg = new Graphics()
  antg.moveTo(0, 0).quadraticCurveTo(-3, -5, -2, -8).stroke({ width: 3.2, color: metall, cap: 'round' })
  antg.circle(-2, -8, 4).fill(0xffd35c).stroke({ width: 1.8, color: shade(0xffd35c, 0.32) })
  antg.circle(-3.4, -9.4, 1.5).fill(0xffffff)
  antg.eventMode = 'none'
  ant.addChild(antg)
  ant.position.set(0, -30)
  ant.eventMode = 'none'
  c.addChild(ant)
  c._wxWing = ant
  return c
}

// Arttabellen. fastFarg = arten har en låst kroppsfärg (goblinen är alltid grön).
const MONSTER_ARTER = [
  { id: 'ludd', tints: MONSTER_TINTS, draw: ritaLudd },
  { id: 'goblin', tints: [GOBLIN_GRON], fastFarg: GOBLIN_GRON, draw: ritaGoblin },
  { id: 'tenta', tints: TENTA_TINTS, draw: ritaTenta },
  { id: 'taggis', tints: TAGGIS_TINTS, draw: ritaTaggis },
  { id: 'flaxis', tints: FLAXIS_TINTS, draw: ritaFlaxis },
  { id: 'sten', tints: STEN_TINTS, draw: ritaSten },
  // arterna 7–12: nya silhuett-riktningar, inga upprepningar av 1–6. Ordningen
  // spelar roll — _soundFor mappar index → NOTES (sex steg), så de sex första
  // behåller sin tonhöjd och de nya delar den par-vis med sin motsvarighet.
  { id: 'snigel', tints: SNIGEL_TINTS, draw: ritaSnigel },
  { id: 'maskis', tints: MASKIS_TINTS, draw: ritaMaskis },
  { id: 'svampis', tints: SVAMPIS_TINTS, draw: ritaSvampis },
  { id: 'grodis', tints: GRODIS_TINTS, draw: ritaGrodis },
  { id: 'spoke', tints: SPOKE_TINTS, draw: ritaSpoke },
  { id: 'robo', tints: ROBO_TINTS, draw: ritaRobo },
]

let _sisteMonsterArt = null

// Slumpa art — drar om en gång så att samma varelse sällan kommer två i rad.
function slumpaMonsterArt() {
  let art = MONSTER_ARTER[(Math.random() * MONSTER_ARTER.length) | 0].id
  if (art === _sisteMonsterArt) art = MONSTER_ARTER[(Math.random() * MONSTER_ARTER.length) | 0].id
  _sisteMonsterArt = art
  return art
}

// drawMonster() utan argument = slumpad art + slumpad tint (KIND_DRAW.monster).
function drawMonster(art, tintC) {
  const id = art || slumpaMonsterArt()
  const spec = MONSTER_ARTER.find((a) => a.id === id) || MONSTER_ARTER[0]
  const p = spec.fastFarg ?? tintC ?? spec.tints[(Math.random() * spec.tints.length) | 0]
  const c = spec.draw(p)
  c._wxArt = spec.id
  c._wxTint = p
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

function drawPaket(golden) {
  const c = new Container()
  const g = new Graphics()
  const w = 72
  const h = 60
  const box = golden ? 0xffd35c : 0xc98d5a
  const band = golden ? 0xff6b6b : 0x8a5a3b
  if (golden) g.circle(0, 0, 52).stroke({ width: 5, color: 0xfff3b0, alpha: 0.5 }) // glöd-ring
  g.roundRect(-w / 2, -h / 2, w, h, 7).fill(box).stroke({ width: 3, color: shade(box, 0.25) })
  g.rect(-w / 2, -h / 2 + 12, w, 5).fill({ color: 0xffffff, alpha: 0.25 }) // locklinje
  g.rect(-6, -h / 2, 12, h).fill(band)
  g.rect(-w / 2, -7, w, 12).fill(band)
  // rosett
  g.ellipse(-9, -h / 2 - 5, 8, 6).fill(band)
  g.ellipse(9, -h / 2 - 5, 8, 6).fill(band)
  g.circle(0, -h / 2 - 4, 4.5).fill(shade(band, 0.2))
  if (golden) {
    g.star?.(-20, 8, 5, 8, 3.6)
    if (g.star) g.fill(0xfff3b0)
    g.star?.(22, -12, 5, 6, 2.6)
    if (g.star) g.fill(0xfff3b0)
  } else {
    g.circle(-20, 10, 2.5).fill({ color: 0xffffff, alpha: 0.4 })
  }
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function drawKruka() {
  const c = new Container()
  const g = new Graphics()
  // blomma
  g.moveTo(0, -6).lineTo(0, -26).stroke({ width: 4, color: 0x49a657, cap: 'round' })
  g.ellipse(-7, -14, 7, 4).fill(0x5bbf6a)
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2
    g.circle(Math.cos(a) * 9, -32 + Math.sin(a) * 9, 6.5).fill(0xff9ec4)
  }
  g.circle(0, -32, 5).fill(0xffd35c)
  // kruka
  g.roundRect(-26, -8, 52, 12, 4).fill(0xd4785a)
  g.moveTo(-22, 4).lineTo(22, 4).lineTo(16, 27).lineTo(-16, 27).closePath().fill(0xc4684a)
  g.ellipse(-8, 12, 5, 8).fill({ color: 0xffffff, alpha: 0.18 })
  g.eventMode = 'none'
  c.addChild(g)
  c._wxWing = g // hela krukan svajar lite (blomman följer)
  return c
}

function drawBallong(tintC) {
  const c = new Container()
  const p = tintC ?? BALLONG_TINTS[(Math.random() * BALLONG_TINTS.length) | 0]
  const g = new Graphics()
  g.moveTo(0, 28).quadraticCurveTo(10, 46, 2, 64).stroke({ width: 2.4, color: 0x8a8578 }) // snöre
  g.ellipse(0, -4, 26, 31).fill(p).stroke({ width: 2.5, color: shade(p, 0.18) })
  g.ellipse(-9, -14, 8, 12).fill({ color: 0xffffff, alpha: 0.45 })
  g.moveTo(-6, 24).lineTo(6, 24).lineTo(0, 32).closePath().fill(shade(p, 0.15)) // knut
  g.eventMode = 'none'
  c.addChild(g)
  return c
}

function drawSkata() {
  const c = new Container()
  const g = new Graphics()
  g.moveTo(20, -2).lineTo(54, 6).lineTo(48, 14).lineTo(18, 8).closePath().fill(0x394252) // lång stjärt
  g.ellipse(0, 0, 26, 16).fill(0x2b2f38)
  g.ellipse(4, 7, 13, 8).fill(0xf2f4f7) // vit mage
  g.ellipse(10, -6, 9, 5).fill(0xdfe6ee) // vit axelfläck
  g.circle(-20, -9, 12).fill(0x2b2f38)
  g.moveTo(-30, -9).lineTo(-41, -6).lineTo(-30, -3).closePath().fill(0x555d68) // näbb
  g.circle(-23, -11, 3).fill(0xffffff)
  g.circle(-22, -11, 1.8).fill(0x111318)
  g.moveTo(-4, 14).lineTo(-6, 24).moveTo(6, 14).lineTo(6, 24).stroke({ width: 3, color: 0x555d68, cap: 'round' }) // klor
  g.eventMode = 'none'
  c.addChild(g)
  const wing = new Graphics()
  wing.ellipse(4, -8, 18, 9).fill(0x394252)
  wing.ellipse(12, -8, 8, 5).fill(0x5b8fb5)
  wing.position.set(-2, -3)
  wing.eventMode = 'none'
  c.addChild(wing)
  c._wxWing = wing
  return c
}

const KIND_DRAW = {
  katt: () => drawKatt(),
  hund: () => drawHund(),
  fagel: () => drawFagel(),
  monster: () => drawMonster(),
  paket: () => drawPaket(false),
  guldpaket: () => drawPaket(true),
  kruka: () => drawKruka(),
  ballong: () => drawBallong(),
  skata: () => drawSkata(),
}

// Ritat spindelnät (används av skott, klibb-överdrag och växelknappens ikoner).
function drawWebNet(g, r, { color = 0xf6f6f2, alpha = 0.95, width = 3 } = {}) {
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    g.moveTo(0, 0).lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  g.stroke({ width, color, alpha })
  for (let ring = 1; ring <= 3; ring++) {
    const rr = (r * ring) / 3.2
    for (let k = 0; k < 8; k++) {
      const a1 = (k / 8) * Math.PI * 2
      const a2 = ((k + 1) / 8) * Math.PI * 2
      const am = (a1 + a2) / 2
      g.moveTo(Math.cos(a1) * rr, Math.sin(a1) * rr)
        .quadraticCurveTo(Math.cos(am) * rr * 0.82, Math.sin(am) * rr * 0.82, Math.cos(a2) * rr, Math.sin(a2) * rr)
    }
  }
  g.stroke({ width: Math.max(1.6, width * 0.7), color, alpha: alpha * 0.8 })
}

// Växelknappens ikoner: klibbnät (droppe + glans) / dragnät (pil hem).
function makeNetIcon(mode, netColor = 0xffffff) {
  const c = new Container()
  const g = new Graphics()
  drawWebNet(g, 26, { color: netColor, alpha: 0.95, width: 3 })
  if (mode === 'klibb') {
    g.moveTo(14, 8).quadraticCurveTo(20, 16, 14, 22).quadraticCurveTo(8, 16, 14, 8).closePath().fill(0x9adcf0)
    g.circle(12, 14, 2).fill({ color: 0xffffff, alpha: 0.8 })
    g.moveTo(-16, -14).quadraticCurveTo(-8, -20, 0, -18).stroke({ width: 3, color: 0xd6f4ff, alpha: 0.8, cap: 'round' })
  } else {
    g.moveTo(20, -4).lineTo(20, 16).stroke({ width: 6, color: 0xffd35c, cap: 'round' })
    g.moveTo(12, 12).lineTo(28, 12).lineTo(20, 26).closePath().fill(0xffd35c)
  }
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rnd = (a, b) => a + Math.random() * (b - a)

// ---- Repet (verlet-tråd) ----------------------------------------------------
// Nätlinan är inte en ritad kurva utan en kedja av punkter med tyngd. Den piskar
// efter handen när skottet går, hänger i en riktig kedjekurva när den sitter fast
// och SLAKNAR när dragnätets kropp kommer ikapp vinschen. Ändarna spänns fast
// (hand · träffpunkt), mellanpunkterna faller fritt och dras ihop av avstånds-
// villkoret några iterationer per bildruta — Position Based Dynamics i miniatyr.
function mkRope(x, y) {
  const pts = []
  for (let i = 0; i < ROPE_PTS; i++) pts.push({ x, y, px: x, py: y })
  return { pts, whip: 0 }
}

// sag < 1 = spänt rep (kortare segment än avståndet) · > 1 = slakt, hänger ner
function stepRope(rope, ax, ay, bx, by, dtF, sag = 1, freeTail = false) {
  const pts = rope.pts
  const f = clamp(dtF, 0.2, 2)
  const last = pts.length - 1
  for (let i = 1; i <= last; i++) {
    if (i === last && !freeTail) break
    const p = pts[i]
    const vx = (p.x - p.px) * ROPE_DAMP
    const vy = (p.y - p.py) * ROPE_DAMP
    p.px = p.x
    p.py = p.y
    p.x += vx * f
    p.y += vy * f + ROPE_G * f * f
  }
  pts[0].x = ax
  pts[0].y = ay
  pts[0].px = ax
  pts[0].py = ay
  if (!freeTail) {
    pts[last].x = bx
    pts[last].y = by
    pts[last].px = bx
    pts[last].py = by
  }
  const span = freeTail ? rope.rest || 120 : Math.hypot(bx - ax, by - ay)
  const seg = (span / last) * sag
  for (let k = 0; k < ROPE_ITER; k++) {
    for (let i = 0; i < last; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      let dx = b.x - a.x
      let dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 1
      const diff = ((d - seg) / d) * 0.5
      dx *= diff
      dy *= diff
      if (i > 0) {
        a.x += dx
        a.y += dy
      }
      if (i + 1 < last || freeTail) {
        b.x -= dx
        b.y -= dy
      }
    }
  }
}

// Ritar repet som en spunnen tråd: en bärande lina + en tunnare medlöpare som
// viker av åt sidan, så ögat ser att den är gjord av spindeltråd och inte av en
// linjal. width tunnas av mot änden.
function strokeRope(g, rope, { color = 0xf6f6f2, alpha = 0.9, width = 5 } = {}) {
  const pts = rope.pts
  g.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y)
  g.stroke({ width, color, alpha, cap: 'round', join: 'round' })
  g.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[i - 1]
    const nx = -(p.y - q.y)
    const ny = p.x - q.x
    const n = Math.hypot(nx, ny) || 1
    const w = Math.sin((i / (pts.length - 1)) * Math.PI * 3) * (width * 0.5)
    g.lineTo(p.x + (nx / n) * w, p.y + (ny / n) * w)
  }
  g.stroke({ width: Math.max(1.4, width * 0.4), color, alpha: alpha * 0.6, cap: 'round' })
}


// ---- De tre näthänderna -----------------------------------------------------
// Spelet styrs av VILKEN HAND som är framme, inte av en knapp med en etikett.
// Alla tre har SAMMA pose (klassisk webbskjutare: pekfinger och lillfinger upp i
// ett V, lång- och ringfinger nedvikta med tummen tvärs över) — bara dräktens färg
// och vävens trådar skiljer dem åt, så barnet lär sig handen och inte ett ord.
const NAT_TYPER = [
  { id: 'drag', namn: 'Dragnät', hud: 0xd94f4f, vav: 0x33291f, vav2: null, mudd: 0x4aa3df, lina: 0xf6f6f2 },
  { id: 'klibb', namn: 'Fästnät', hud: 0xf4f2ef, vav: 0x8b5cf6, vav2: 0x33291f, mudd: 0x8b5cf6, lina: 0xd9c8ff },
  { id: 'boll', namn: 'Nätboll', hud: 0x33303a, vav: 0xe0473f, vav2: 0xffffff, mudd: 0xe0473f, lina: 0xffffff },
]
const natTyp = (id) => NAT_TYPER.find((n) => n.id === id) || NAT_TYPER[0]

// Ritar en näthand i given dräkt. kort=true ger den korta versionen som ligger och
// väntar nere i hörnen; full version är armen som sticker upp mitt i bild.
//
// PROPORTIONER ÄR HELA POÄNGEN HÄR. Första bygget hade en liten handknopp på en
// bred ärm — i skärmdumpen läste det som en KANIN (litet huvud, två öron). Nu är
// underarmen smal och till största delen gömd bakom bildörren, medan handen är
// stor, har tydliga knogar, en utstickande tumme och väven ligger på handryggen
// där den syns. Det är tummen och knogarna som gör att det inte kan läsas som ett
// djur, och väven som skiljer de tre händerna åt.
// Två alternativa kameravinklar på samma hand. En hand rakt framifrån har en
// lodrät spegelaxel, och allt med en spegelaxel + två utstickande delar läses som
// ett ansikte — det är därför framifrån-varianten envisas med att bli en kanin.
// Profil och bakifrån har ingen sådan axel.
function ritaHandSida(typ, kort) {
  const c = new Container()
  const hud = typ.hud
  const kant = shade(hud, 0.3)
  const mork = shade(hud, 0.2)
  const armBot = kort ? -40 : 40
  const arm = new Graphics()
  arm.moveTo(6, armBot).quadraticCurveTo(-14, -50, -30, -120).lineTo(38, -132)
    .quadraticCurveTo(58, -54, 78, armBot).closePath().fill(hud)
  arm.moveTo(6, armBot).quadraticCurveTo(-14, -50, -30, -120)
    .moveTo(78, armBot).quadraticCurveTo(58, -54, 38, -132).stroke({ width: 5, color: kant })
  arm.eventMode = 'none'
  c.addChild(arm)
  const mudd = new Graphics()
  mudd.roundRect(-40, -16, 80, 28, 9).fill(typ.mudd).stroke({ width: 3, color: shade(typ.mudd, 0.3) })
  mudd.circle(0, -2, 10).fill(0xd7dbe2).stroke({ width: 2.6, color: 0x8d96a3 })
  mudd.circle(0, -2, 4).fill(typ.vav)
  mudd.position.set(4, -138)
  mudd.rotation = -0.24
  mudd.eventMode = 'none'
  c.addChild(mudd)
  const hand = new Container()
  const g = new Graphics()
  // handen i PROFIL: smal lov, tummen tvärs över mot betraktaren
  g.moveTo(-24, -34).quadraticCurveTo(-34, 10, -20, 46).lineTo(26, 50)
    .quadraticCurveTo(38, 8, 30, -36).quadraticCurveTo(4, -50, -24, -34)
    .closePath().fill(hud).stroke({ width: 4, color: kant })
  // pekfingret upp, lillfingret bakom (kortare, mörkare = djup)
  g.moveTo(16, -40).quadraticCurveTo(30, -84, 34, -128).stroke({ width: 25, color: hud, cap: 'round' })
  g.moveTo(-8, -38).quadraticCurveTo(-2, -70, 2, -96).stroke({ width: 20, color: mork, cap: 'round' })
  g.ellipse(34, -118, 6.5, 9).fill({ color: 0xffffff, alpha: 0.45 })
  // vikta fingrar syns som knogar i profil
  g.roundRect(-22, -30, 46, 24, 11).fill(mork).stroke({ width: 3, color: kant })
  g.circle(-8, -18, 5).fill({ color: 0xffffff, alpha: 0.14 })
  g.circle(8, -18, 5).fill({ color: 0xffffff, alpha: 0.14 })
  // TUMMEN framför, mot betraktaren
  g.moveTo(-14, 12).quadraticCurveTo(-40, 6, -62, -14).stroke({ width: 26, color: tint(hud, 0.12), cap: 'round' })
  g.moveTo(-38, 4).quadraticCurveTo(-44, -1, -50, -6).stroke({ width: 23, color: mork, alpha: 0.4 })
  g.moveTo(18, -52).quadraticCurveTo(26, -74, 30, -96).stroke({ width: 2.2, color: typ.vav, alpha: 0.8 })
  g.moveTo(-18, 30).quadraticCurveTo(4, 38, 26, 30).stroke({ width: 2.2, color: typ.vav2 || typ.vav, alpha: 0.8 })
  g.eventMode = 'none'
  hand.addChild(g)
  hand.position.set(8, -206)
  hand.rotation = -0.16
  hand.eventMode = 'none'
  c.addChild(hand)
  c.eventMode = 'none'
  return c
}

function ritaHandBak(typ, kort) {
  const c = new Container()
  const hud = typ.hud
  const kant = shade(hud, 0.3)
  const mork = shade(hud, 0.2)
  const armBot = kort ? -40 : 40
  const arm = new Graphics()
  arm.moveTo(-66, armBot).quadraticCurveTo(-56, -50, -48, -118).lineTo(52, -126)
    .quadraticCurveTo(62, -50, 74, armBot).closePath().fill(hud)
  arm.moveTo(-66, armBot).quadraticCurveTo(-56, -50, -48, -118)
    .moveTo(74, armBot).quadraticCurveTo(62, -50, 52, -126).stroke({ width: 5, color: kant })
  arm.eventMode = 'none'
  c.addChild(arm)
  const mudd = new Graphics()
  mudd.roundRect(-54, -16, 108, 30, 10).fill(typ.mudd).stroke({ width: 3, color: shade(typ.mudd, 0.3) })
  mudd.circle(0, -1, 11).fill(0xd7dbe2).stroke({ width: 2.6, color: 0x8d96a3 })
  mudd.circle(0, -1, 4.2).fill(typ.vav)
  mudd.position.set(2, -132)
  mudd.rotation = -0.06
  mudd.eventMode = 'none'
  c.addChild(mudd)
  const hand = new Container()
  const g = new Graphics()
  // BAKIFRÅN/UNDERIFRÅN: fingrarna pekar bort från betraktaren → kraftigt
  // förkortade. Handloven blir en bred, låg platta och knogarna en rad kullar.
  g.moveTo(-62, 30).quadraticCurveTo(-70, -18, -46, -34).lineTo(46, -38)
    .quadraticCurveTo(70, -20, 62, 30).quadraticCurveTo(0, 46, -62, 30)
    .closePath().fill(hud).stroke({ width: 4, color: kant })
  // förkortade fingrar: korta stumpar med runda toppar ovanför knograden
  g.moveTo(-40, -30).lineTo(-48, -74).stroke({ width: 27, color: hud, cap: 'round' })
  g.circle(-48, -76, 13).fill(tint(hud, 0.14)).stroke({ width: 3, color: kant })
  g.moveTo(42, -32).lineTo(50, -66).stroke({ width: 22, color: hud, cap: 'round' })
  g.circle(50, -68, 11).fill(tint(hud, 0.14)).stroke({ width: 3, color: kant })
  // knograden: de vikta fingrarna sedda uppifrån
  for (let k = 0; k < 3; k++) {
    g.circle(-16 + k * 17, -30, 11).fill(mork).stroke({ width: 2.6, color: kant })
  }
  // tummen ut åt sidan, också förkortad
  g.moveTo(-52, 6).quadraticCurveTo(-78, 0, -94, -14).stroke({ width: 25, color: hud, cap: 'round' })
  g.circle(-94, -15, 12).fill(tint(hud, 0.12)).stroke({ width: 3, color: kant })
  // väven som ett rutnät på den breda handloven — här stör den ingen symmetriaxel
  for (let k = -2; k <= 2; k++) {
    g.moveTo(-30 + k * 18, 26).lineTo(-6 + k * 18, -4)
    g.moveTo(30 - k * 18, 26).lineTo(6 - k * 18, -4)
  }
  g.stroke({ width: 2.3, color: typ.vav, alpha: 0.85 })
  if (typ.vav2) g.moveTo(-46, 14).quadraticCurveTo(0, 24, 46, 14).stroke({ width: 2.2, color: typ.vav2, alpha: 0.85 })
  g.eventMode = 'none'
  hand.addChild(g)
  hand.position.set(2, -196)
  hand.rotation = -0.1
  hand.eventMode = 'none'
  c.addChild(hand)
  c.eventMode = 'none'
  return c
}

// Vilken kameravinkel händerna ritas i. PROFIL valdes efter att framifrån-varianten
// läste som en kanin fyra försök i rad — se .test-shots/natskott-handval.png där alla
// tre står sida vid sida. Byt konstanten för att växla; alla tre varianterna behålls.
const HAND_VINKEL = 'profil' // 'profil' | 'framifran' | 'bakifran'

function ritaNathand(typ, { kort = false } = {}) {
  if (HAND_VINKEL === 'profil') return ritaHandSida(typ, kort)
  if (HAND_VINKEL === 'bakifran') return ritaHandBak(typ, kort)
  return ritaHandFram(typ, { kort })
}

function ritaHandFram(typ, { kort = false } = {}) {
  const c = new Container()
  const hud = typ.hud
  const kant = shade(hud, 0.3)
  const mork = shade(hud, 0.2)
  const armBot = kort ? -40 : 40

  // --- underarmen: ASYMMETRISK och smal, mest gömd bakom bildörren ------------
  // Symmetri var hela problemet: en rak, spegelvänd arm med en rundad hand överst
  // läser som en varelse med två öron oavsett hur fingrarna ritas. Armen kommer
  // nu in snett underifrån och handen är vinklad — då finns ingen mittaxel att
  // spegla kring, och silhuetten blir en arm.
  const arm = new Graphics()
  arm.moveTo(-58, armBot).quadraticCurveTo(-50, -50, -40, -124)
    .lineTo(50, -136).quadraticCurveTo(64, -54, 78, armBot).closePath().fill(hud)
  arm.moveTo(-58, armBot).quadraticCurveTo(-50, -50, -40, -124)
    .moveTo(78, armBot).quadraticCurveTo(64, -54, 50, -136).stroke({ width: 5, color: kant })
  arm.eventMode = 'none'
  c.addChild(arm)

  // muddband, följer armens lutning
  const mudd = new Graphics()
  mudd.roundRect(-48, -18, 96, 30, 9).fill(typ.mudd).stroke({ width: 3, color: shade(typ.mudd, 0.3) })
  mudd.rect(-45, -13, 90, 6).fill({ color: 0xffffff, alpha: 0.25 })
  mudd.circle(0, -2, 11).fill(0xd7dbe2).stroke({ width: 2.6, color: 0x8d96a3 }) // nätskjutardosan
  mudd.circle(0, -2, 4.2).fill(typ.vav)
  mudd.position.set(6, -142)
  mudd.rotation = -0.12
  mudd.eventMode = 'none'
  c.addChild(mudd)

  // --- handen i eget lager så den kan VINKLAS som en enhet --------------------
  const hand = new Container()
  const g = new Graphics()
  // pekfinger + lillfinger upp (ritas först → rötterna göms av handflatan)
  g.moveTo(-28, -40).quadraticCurveTo(-42, -92, -50, -142).stroke({ width: 28, color: hud, cap: 'round' })
  g.moveTo(34, -36).quadraticCurveTo(52, -76, 60, -112).stroke({ width: 23, color: hud, cap: 'round' })
  g.moveTo(-36, -70).quadraticCurveTo(-40, -80, -43, -88).stroke({ width: 24, color: mork, alpha: 0.5 })
  g.moveTo(44, -62).quadraticCurveTo(47, -70, 50, -78).stroke({ width: 20, color: mork, alpha: 0.5 })
  g.ellipse(-48, -130, 7, 10).fill({ color: 0xffffff, alpha: 0.45 })
  g.ellipse(57, -102, 6, 8.5).fill({ color: 0xffffff, alpha: 0.45 })
  // TUMMEN rakt ut åt sidan — det ett djur aldrig har
  g.moveTo(-44, 6).quadraticCurveTo(-74, -6, -98, -24).stroke({ width: 27, color: hud, cap: 'round' })
  g.moveTo(-70, -4).quadraticCurveTo(-76, -10, -82, -14).stroke({ width: 24, color: mork, alpha: 0.45 })
  // handflatan — bredare uppe vid fingrarna än nere vid handleden
  g.moveTo(-56, -46).quadraticCurveTo(-62, 20, -44, 50).lineTo(44, 54)
    .quadraticCurveTo(62, 16, 54, -44).quadraticCurveTo(0, -62, -56, -46)
    .closePath().fill(hud).stroke({ width: 4, color: kant })
  // lång- och ringfinger nedvikta över handflatans ÖVRE del
  g.roundRect(-30, -46, 60, 30, 14).fill(mork).stroke({ width: 3.5, color: kant })
  g.roundRect(-26, -20, 52, 26, 12).fill(shade(hud, 0.32)).stroke({ width: 3.5, color: kant })
  g.moveTo(0, -42).lineTo(0, -22).moveTo(0, -16).lineTo(0, 2).stroke({ width: 2.6, color: kant, alpha: 0.8 })
  g.circle(-15, -44, 6).fill({ color: 0xffffff, alpha: 0.15 })
  g.circle(14, -44, 6).fill({ color: 0xffffff, alpha: 0.15 })
  // Väven ligger på FINGRARNA och armen, aldrig som ett mönster mitt i handflatan:
  // två symmetriska bågar plus en rund dosa i handloven blev ett ansikte med ögon
  // och nos i skärmdumpen, tre försök i rad. Handflatan lämnas ren.
  g.moveTo(-34, -58).quadraticCurveTo(-40, -74, -44, -92)
    .moveTo(-24, -50).quadraticCurveTo(-32, -78, -38, -108)
    .stroke({ width: 2.2, color: typ.vav, alpha: 0.8 })
  g.moveTo(40, -50).quadraticCurveTo(47, -66, 52, -84)
    .moveTo(30, -44).quadraticCurveTo(40, -70, 47, -96)
    .stroke({ width: 2.2, color: typ.vav2 || typ.vav, alpha: 0.8 })
  g.moveTo(-58, 4).quadraticCurveTo(-70, -2, -84, -12).stroke({ width: 2.2, color: typ.vav, alpha: 0.75 })
  g.eventMode = 'none'
  hand.addChild(g)
  hand.position.set(4, -216)
  hand.rotation = -0.2
  hand.eventMode = 'none'
  c.addChild(hand)

  c.eventMode = 'none'
  return c
}

// ---- BUTIKER OCH RESTAURANGER i mellanlagret --------------------------------
// Sex fasadtyper utöver hyreshus och villa: bageri, pizzeria, glasskiosk,
// leksaksaffär, blomsteraffär och cykelaffär. Varje butik har bottenvåning med
// skyltfönster fullt av RITADE varor, randig markis, dörr och skyltbräda med
// ritad symbol + text (P0: paneler och skyltar får bära text), plus krossbara
// rutor i övervåningen som fönstermonstren kan lutar sig ut ur.
// ritaHus() returnerar { id, bw, topY, fonster, skyltfonster, skylt, rok } där
// fonster är specar som _mkWindow tar rakt av — kontraktsvakten i ritaHus har
// redan kastat rutor som ligger utanför fasaden eller under spelets y-filter.

// ---- Fast bandindelning i butikernas bottenvåning (absolut y) --------------
const BUT_SKYLT_TOP = 376 // skyltbrädans överkant — krossbara rutor måste hålla sig ovanför
const BUT_MARKIS_Y = 414 // markisens fästlist
const BUT_GLAS_Y = 452 // skyltfönsterbandets överkant
const BUT_GLAS_H = 94
const BUT_SOCKEL_Y = 546 // sockelns överkant
const BUT_WIN_MAXY = 420 // hårt tak för en krossbar rutas CENTRUM (spelet hoppar över lägre)

// ---- Paletter (håller sig i samma dämpade familj som CITY_/SUBURB_WALLS) ---
const BUT_PALETT = {
  bageri: [
    { vagg: 0xf0dfc2, front: 0xe2cca8, markis: [0xd2554f, 0xf6ece0], skylt: 0x8a5a3b, ram: 0xa9784f },
    { vagg: 0xe7d2b3, front: 0xd6bf9c, markis: [0xc98a3f, 0xf6ece0], skylt: 0x7a5233, ram: 0x9c6d46 },
  ],
  pizzeria: [
    { vagg: 0xcf9d80, front: 0xbb866a, markis: [0x4f8f5e, 0xf3ece0, 0xc4544e], skylt: 0x3f7a52, ram: 0x8d6247 },
    { vagg: 0xc08a72, front: 0xac765e, markis: [0xc4544e, 0xf3ece0], skylt: 0x8f3a35, ram: 0x7d5540 },
  ],
  glasskiosk: [
    { vagg: 0x8fd0c8, front: 0x79bcb4, markis: [0xff9ec4, 0xfffdf7], skylt: 0x4f9f97, ram: 0xf7f2e6 },
    { vagg: 0xf3bacd, front: 0xe3a4ba, markis: [0x57c8c3, 0xfffdf7], skylt: 0xc86f8c, ram: 0xf7f2e6 },
  ],
  leksaksaffar: [
    { vagg: 0x8fbde4, front: 0x76a8d3, markis: [0xffd35c, 0xff6b6b, 0x4aa3df], skylt: 0xf5731e, ram: 0xf7f2e6 },
    { vagg: 0xb3a4de, front: 0x9c8ccb, markis: [0x5bbf6a, 0xffd35c, 0xff9ec4], skylt: 0x6d51c2, ram: 0xf7f2e6 },
  ],
  blomsteraffar: [
    { vagg: 0xe9e2cd, front: 0xd9d0b6, markis: [0x5f9e6a, 0xf3ece0], skylt: 0x477a52, ram: 0xf7f2e6 },
    { vagg: 0xdde6da, front: 0xcad6c6, markis: [0x8fbe8f, 0xf7f2e6], skylt: 0x5d8a5f, ram: 0xf7f2e6 },
  ],
  cykelaffar: [
    { vagg: 0x9ab0bd, front: 0x849daa, markis: [0x3f6f9c, 0xf1ece0], skylt: 0x2f5b83, ram: 0xf1ece0 },
    { vagg: 0xb8a898, front: 0xa39181, markis: [0xd2554f, 0xf1ece0], skylt: 0x8a5a3b, ram: 0xf1ece0 },
  ],
}

// ===========================================================================
// Små ritverktyg (delade av butikerna)
// ===========================================================================

// Randig markis med bågig framkant. y = fästlistens överkant, h = tygdjup.
function ritaMarkis(g, x, y, w, h, farger) {
  const n = Math.max(4, Math.round(w / 28))
  const sw = w / n
  const bage = 9
  for (let i = 0; i < n; i++) {
    const sx = x + i * sw
    g.moveTo(sx, y + 6)
      .lineTo(sx + sw, y + 6)
      .lineTo(sx + sw, y + h)
      .quadraticCurveTo(sx + sw / 2, y + h + bage, sx, y + h)
      .closePath()
      .fill(farger[i % farger.length])
  }
  g.rect(x - 5, y, w + 10, 8).fill(shade(farger[0], 0.32)) // fästlist
  g.rect(x - 5, y, w + 10, 3).fill({ color: 0xffffff, alpha: 0.22 })
  g.rect(x, y + h - 6, w, 6).fill({ color: 0x000000, alpha: 0.09 }) // veckskugga
  // stag ut i väggen
  g.moveTo(x + 2, y + 8).lineTo(x + 2, y + h - 2).stroke({ width: 2, color: shade(farger[0], 0.4), alpha: 0.5 })
  g.moveTo(x + w - 2, y + 8).lineTo(x + w - 2, y + h - 2).stroke({ width: 2, color: shade(farger[0], 0.4), alpha: 0.5 })
}

// Skyltbräda (panel — får bära text enligt P0).
function ritaSkyltbraeda(g, cx, cy, w, h, col) {
  g.roundRect(cx - w / 2 - 3, cy - h / 2 - 3, w + 6, h + 6, 8).fill(shade(col, 0.35))
  g.roundRect(cx - w / 2, cy - h / 2, w, h, 6).fill(col)
  g.roundRect(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, h * 0.4, 5).fill({ color: 0xffffff, alpha: 0.13 })
  g.circle(cx - w / 2 + 7, cy + h / 2 - 6, 2.2).fill({ color: 0xffffff, alpha: 0.35 }) // skruv
  g.circle(cx + w / 2 - 7, cy + h / 2 - 6, 2.2).fill({ color: 0xffffff, alpha: 0.35 })
}

// Stort skyltfönster: ram + glas + reflex. Varorna ritas SEDAN, ovanpå glaset.
function ritaSkyltfonsterRam(g, x, y, w, h, ram, glas) {
  g.roundRect(x - 6, y - 6, w + 12, h + 12, 7).fill(ram)
  g.roundRect(x - 6, y - 6, w + 12, h + 12, 7).stroke({ width: 2, color: shade(ram, 0.28) })
  g.rect(x, y, w, h).fill(glas)
  g.rect(x, y, w, Math.round(h * 0.3)).fill({ color: 0xffffff, alpha: 0.16 })
}

// Reflexerna läggs SIST så de ligger över varorna (som en riktig ruta).
function ritaGlasreflex(g, x, y, w, h) {
  g.moveTo(x + w * 0.06, y + h)
    .lineTo(x + w * 0.3, y)
    .lineTo(x + w * 0.42, y)
    .lineTo(x + w * 0.18, y + h)
    .closePath()
    .fill({ color: 0xffffff, alpha: 0.17 })
  g.moveTo(x + w * 0.48, y + h).lineTo(x + w * 0.62, y).lineTo(x + w * 0.67, y).lineTo(x + w * 0.53, y + h).closePath().fill({ color: 0xffffff, alpha: 0.11 })
  g.roundRect(x - 1, y - 1, w + 2, h + 2, 3).stroke({ width: 2, color: 0xffffff, alpha: 0.3 })
}

// Butiksdörr med glasruta, handtag och trappsteg ner till trottoaren.
function ritaButiksdorr(g, x, y, w, col) {
  const h = SIDEWALK_TOP - y
  g.roundRect(x - 4, y - 4, w + 8, h + 4, 5).fill(shade(col, 0.42))
  g.roundRect(x, y, w, h, 4).fill(shade(col, 0.24))
  g.roundRect(x + 6, y + 7, w - 12, h * 0.46, 3).fill(0xcfe7ef)
  g.moveTo(x + 9, y + 7 + h * 0.42).lineTo(x + w * 0.62, y + 11).stroke({ width: 4, color: 0xffffff, alpha: 0.4 })
  g.roundRect(x + 6, y + h * 0.58, w - 12, h * 0.3, 3).fill(shade(col, 0.34))
  g.roundRect(x + w - 12, y + h * 0.5, 5, 15, 2.5).fill(0xffd35c)
  g.rect(x - 8, SIDEWALK_TOP - 6, w + 16, 6).fill(shade(col, 0.14))
}

// Taklist / gesims.
function ritaTaklist(g, x, topY, w, col) {
  g.rect(x - 8, topY - 14, w + 16, 16).fill(shade(col, 0.26))
  g.rect(x - 8, topY - 14, w + 16, 4).fill(shade(col, 0.06))
  g.rect(x - 8, topY + 1, w + 16, 3).fill({ color: 0x000000, alpha: 0.12 })
}

// Vimplar i en slak lina.
function ritaVimplar(g, x1, x2, y, sag, farger) {
  const n = Math.max(4, Math.round((x2 - x1) / 26))
  const sw = (x2 - x1) / n
  g.moveTo(x1, y).quadraticCurveTo((x1 + x2) / 2, y + sag * 2, x2, y).stroke({ width: 2.5, color: 0x8a7a66 })
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const fx = x1 + t * (x2 - x1)
    const fy = y + Math.sin(Math.PI * t) * sag
    g.moveTo(fx - sw * 0.4, fy).lineTo(fx + sw * 0.4, fy).lineTo(fx, fy + 16).closePath().fill(farger[i % farger.length])
  }
}

// Rök ur en skorsten (statiska, tecknade puffar — inga tweens att städa).
function ritaRok(g, cx, y) {
  g.circle(cx + 1, y - 8, 7).fill({ color: 0xf4f1ea, alpha: 0.82 })
  g.circle(cx + 8, y - 21, 9.5).fill({ color: 0xf4f1ea, alpha: 0.62 })
  g.circle(cx + 1, y - 37, 12).fill({ color: 0xf4f1ea, alpha: 0.42 })
}

// ---- Ritade varor och föremål ---------------------------------------------

function ritaBulle(g, cx, cy, r) {
  g.ellipse(cx, cy + r * 0.16, r * 1.02, r * 0.9).fill(0xc08839)
  g.ellipse(cx, cy, r, r * 0.84).fill(0xe0a94f)
  g.moveTo(cx - r * 0.58, cy + r * 0.06)
    .quadraticCurveTo(cx - r * 0.1, cy - r * 0.7, cx + r * 0.5, cy - r * 0.1)
    .quadraticCurveTo(cx + r * 0.16, cy + r * 0.46, cx - r * 0.12, cy + r * 0.04)
    .stroke({ width: r * 0.22, color: 0x9c6427, cap: 'round' })
  g.circle(cx - r * 0.3, cy - r * 0.32, r * 0.11).fill(0xfffdf7)
  g.circle(cx + r * 0.32, cy + r * 0.24, r * 0.1).fill(0xfffdf7)
}

function ritaTarta(g, cx, cy, w, h) {
  g.roundRect(cx - w / 2, cy - h * 0.06, w, h * 0.6, 4).fill(0xefdcba)
  g.rect(cx - w / 2, cy + h * 0.16, w, h * 0.13).fill(0xffb7cf)
  g.roundRect(cx - w / 2 - 3, cy - h * 0.34, w + 6, h * 0.32, 7).fill(0xfff3f6)
  for (let i = 0; i < 4; i++) g.circle(cx - w / 2 + 6 + (i * (w - 12)) / 3, cy - h * 0.33, 3.6).fill(0xff9ec4)
  g.circle(cx, cy - h * 0.5, 4.6).fill(0xd2554f)
  g.moveTo(cx, cy - h * 0.56).quadraticCurveTo(cx + 3, cy - h * 0.74, cx + 8, cy - h * 0.72).stroke({ width: 2, color: 0x5f9e6a, cap: 'round' })
}

function ritaGlasstrut(g, cx, basY, h) {
  const rw = h * 0.29
  // strut med rutmönster
  g.moveTo(cx - rw, basY - h * 0.5).lineTo(cx + rw, basY - h * 0.5).lineTo(cx, basY).closePath().fill(0xd9a441)
  for (let i = -2; i <= 2; i++) {
    g.moveTo(cx + i * rw * 0.45, basY - h * 0.5).lineTo(cx + i * rw * 0.16, basY - h * 0.06).stroke({ width: 1.8, color: 0xa9702f, alpha: 0.75 })
  }
  for (let i = 1; i <= 3; i++) {
    const t = i / 4
    const hw = rw * (1 - t)
    g.moveTo(cx - hw, basY - h * 0.5 + t * h * 0.5).lineTo(cx + hw, basY - h * 0.5 + t * h * 0.5).stroke({ width: 1.6, color: 0xa9702f, alpha: 0.6 })
  }
  // kulor
  g.circle(cx + rw * 0.1, basY - h * 0.62, rw * 0.96).fill(0xff9ec4)
  g.circle(cx - rw * 0.42, basY - h * 0.82, rw * 0.82).fill(0xfff0d8)
  g.circle(cx + rw * 0.44, basY - h * 0.9, rw * 0.72).fill(0xa8d6b0)
  g.circle(cx - rw * 0.6, basY - h * 0.95, rw * 0.24).fill({ color: 0xffffff, alpha: 0.55 })
  // körsbär
  g.circle(cx + rw * 0.1, basY - h * 1.12, rw * 0.3).fill(0xd2554f)
  g.moveTo(cx + rw * 0.1, basY - h * 1.2).quadraticCurveTo(cx + rw * 0.5, basY - h * 1.34, cx + rw * 0.8, basY - h * 1.28).stroke({ width: 2, color: 0x5f9e6a, cap: 'round' })
}

function ritaKlubba(g, cx, basY, h) {
  const r = h * 0.33
  g.roundRect(cx - 5, basY - h * 0.66, 10, h * 0.66, 5).fill(0xfffdf7)
  g.roundRect(cx - 5, basY - h * 0.66, 10, h * 0.66, 5).stroke({ width: 2, color: 0xcfc9bb })
  const ky = basY - h * 0.66
  g.circle(cx, ky, r).fill(0xff9ec4)
  g.moveTo(cx, ky)
  for (let i = 1; i <= 72; i++) {
    const t = i / 72
    const a = t * Math.PI * 5.6
    const rr = t * r * 0.84
    g.lineTo(cx + Math.cos(a) * rr, ky + Math.sin(a) * rr)
  }
  g.stroke({ width: r * 0.2, color: 0xfffdf7, cap: 'round', join: 'round' })
  g.circle(cx, ky, r).stroke({ width: 3, color: shade(0xff9ec4, 0.22) })
  g.ellipse(cx - r * 0.36, ky - r * 0.42, r * 0.24, r * 0.14).fill({ color: 0xffffff, alpha: 0.5 })
}

// Kringla: två tydliga öglor högt upp + en bred båge under, som en riktig
// bagarskylt. Tjocklek och avstånd är avvägda så formen läses i 24 px.
function ritaKringla(g, cx, cy, r, col) {
  const w = r * 0.3
  const oR = r * 0.46
  const oy = cy - r * 0.34
  g.moveTo(cx - r * 0.9, cy + r * 0.1)
    .quadraticCurveTo(cx, cy + r * 1.15, cx + r * 0.9, cy + r * 0.1)
    .stroke({ width: w, color: col, cap: 'round' })
  g.circle(cx - r * 0.5, oy, oR).stroke({ width: w, color: col })
  g.circle(cx + r * 0.5, oy, oR).stroke({ width: w, color: col })
  // korsningen i mitten binder ihop öglorna med bågen
  g.moveTo(cx - r * 0.34, oy + oR * 0.5).lineTo(cx + r * 0.42, cy + r * 0.5).stroke({ width: w, color: col, cap: 'round' })
  g.moveTo(cx + r * 0.34, oy + oR * 0.5).lineTo(cx - r * 0.42, cy + r * 0.5).stroke({ width: w, color: col, cap: 'round' })
  g.circle(cx - r * 0.62, oy - oR * 0.7, r * 0.09).fill(0xfffdf7)
  g.circle(cx + r * 0.66, oy - oR * 0.5, r * 0.09).fill(0xfffdf7)
  g.circle(cx, cy + r * 0.72, r * 0.09).fill(0xfffdf7)
}

function ritaPizzabit(g, cx, cy, s) {
  g.moveTo(cx, cy - s).lineTo(cx - s * 0.62, cy + s * 0.62).lineTo(cx + s * 0.62, cy + s * 0.62).closePath().fill(0xf2c96b)
  g.moveTo(cx - s * 0.62, cy + s * 0.62)
    .quadraticCurveTo(cx, cy + s * 0.98, cx + s * 0.62, cy + s * 0.62)
    .lineTo(cx + s * 0.5, cy + s * 0.44)
    .lineTo(cx - s * 0.5, cy + s * 0.44)
    .closePath()
    .fill(0xd9a441)
  g.circle(cx - s * 0.16, cy + s * 0.06, s * 0.15).fill(0xc4544e)
  g.circle(cx + s * 0.22, cy + s * 0.3, s * 0.13).fill(0xc4544e)
  g.circle(cx + s * 0.02, cy - s * 0.36, s * 0.12).fill(0xc4544e)
  g.circle(cx - s * 0.3, cy + s * 0.36, s * 0.09).fill(0x6fae74)
}

function ritaBoll(g, cx, cy, r) {
  const f = [0xd2554f, 0xfffdf7, 0x4aa3df, 0xfffdf7, 0xffd35c, 0xfffdf7]
  for (let i = 0; i < 6; i++) {
    g.moveTo(cx, cy)
    for (let k = 0; k <= 6; k++) {
      const a = ((i + k / 6) / 6) * Math.PI * 2 - Math.PI / 2
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    }
    g.closePath().fill(f[i])
  }
  g.circle(cx, cy, r).stroke({ width: 2, color: 0xbfb8a8 })
  g.ellipse(cx - r * 0.34, cy - r * 0.4, r * 0.26, r * 0.15).fill({ color: 0xffffff, alpha: 0.6 })
}

function ritaKlossar(g, x, basY, s) {
  const kl = [0x4aa3df, 0xd2554f, 0xffd35c]
  for (let i = 0; i < 3; i++) {
    const w = s * (1 - i * 0.13)
    const cx = x + (i % 2 ? s * 0.11 : -s * 0.05)
    const y = basY - (i + 1) * s * 0.8
    g.roundRect(cx - w / 2, y - s * 0.13, w * 0.4, s * 0.16, 3).fill(shade(kl[i], 0.16)) // knopp
    g.roundRect(cx - w / 2, y, w, s * 0.78, 4).fill(kl[i])
    g.roundRect(cx - w / 2 + 2, y + 2, w - 4, s * 0.2, 3).fill({ color: 0xffffff, alpha: 0.2 })
  }
}

function ritaNalle(g, cx, cy, s, p) {
  g.circle(cx - s * 0.6, cy - s * 0.76, s * 0.28).fill(shade(p, 0.14))
  g.circle(cx + s * 0.6, cy - s * 0.76, s * 0.28).fill(shade(p, 0.14))
  g.ellipse(cx - s * 0.9, cy + s * 0.34, s * 0.26, s * 0.4).fill(shade(p, 0.1))
  g.ellipse(cx + s * 0.9, cy + s * 0.34, s * 0.26, s * 0.4).fill(shade(p, 0.1))
  g.ellipse(cx - s * 0.4, cy + s * 1.16, s * 0.3, s * 0.24).fill(shade(p, 0.1))
  g.ellipse(cx + s * 0.4, cy + s * 1.16, s * 0.3, s * 0.24).fill(shade(p, 0.1))
  g.ellipse(cx, cy + s * 0.54, s * 0.78, s * 0.7).fill(p)
  g.ellipse(cx, cy + s * 0.66, s * 0.46, s * 0.42).fill(tint(p, 0.38))
  g.circle(cx, cy - s * 0.32, s * 0.6).fill(p)
  g.ellipse(cx, cy - s * 0.14, s * 0.3, s * 0.23).fill(tint(p, 0.42))
  g.circle(cx - s * 0.22, cy - s * 0.46, s * 0.09).fill(0x33291f)
  g.circle(cx + s * 0.22, cy - s * 0.46, s * 0.09).fill(0x33291f)
  g.ellipse(cx, cy - s * 0.22, s * 0.11, s * 0.08).fill(0x33291f)
  g.moveTo(cx - s * 0.12, cy - s * 0.06).quadraticCurveTo(cx, cy + s * 0.02, cx + s * 0.12, cy - s * 0.06).stroke({ width: 1.8, color: 0x6e5335, cap: 'round' })
}

function ritaBlomma(g, cx, cy, r, kron, mitt) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    g.circle(cx + Math.cos(a) * r * 0.74, cy + Math.sin(a) * r * 0.74, r * 0.5).fill(kron)
  }
  g.circle(cx, cy, r * 0.4).fill(mitt ?? 0xffd35c)
}

function ritaTulpan(g, x, botY, h, kron) {
  g.moveTo(x, botY).quadraticCurveTo(x + h * 0.13, botY - h * 0.5, x, botY - h).stroke({ width: 3, color: 0x5f9e6a, cap: 'round' })
  g.ellipse(x - h * 0.15, botY - h * 0.4, h * 0.15, h * 0.08).fill(0x6fae74)
  const ty = botY - h
  g.moveTo(x - h * 0.17, ty)
    .quadraticCurveTo(x - h * 0.19, ty - h * 0.3, x, ty - h * 0.3)
    .quadraticCurveTo(x + h * 0.19, ty - h * 0.3, x + h * 0.17, ty)
    .closePath()
    .fill(kron)
  g.moveTo(x - h * 0.06, ty - h * 0.03).lineTo(x - h * 0.06, ty - h * 0.26).stroke({ width: 1.6, color: shade(kron, 0.2) })
  g.moveTo(x + h * 0.06, ty - h * 0.03).lineTo(x + h * 0.06, ty - h * 0.26).stroke({ width: 1.6, color: shade(kron, 0.2) })
}

// Blomlåda på trottoaren (botY ≤ SIDEWALK_TOP!).
function ritaBlomlada(g, x, botY, w, h, tra) {
  g.roundRect(x, botY - h, w, h, 3).fill(tra)
  g.rect(x, botY - h, w, 5).fill(shade(tra, 0.24))
  for (let i = 1; i < 4; i++) g.rect(x + (i * w) / 4 - 1.5, botY - h + 5, 3, h - 5).fill({ color: 0x000000, alpha: 0.09 })
  const kr = [0xff6b6b, 0xffd35c, 0xff9ec4, 0xa78bfa]
  const n = Math.max(2, Math.round(w / 22))
  for (let i = 0; i < n; i++) {
    const bx = x + ((i + 0.5) * w) / n
    g.moveTo(bx, botY - h).lineTo(bx + (i % 2 ? 3 : -3), botY - h - 13).stroke({ width: 2.4, color: 0x5f9e6a, cap: 'round' })
    ritaBlomma(g, bx + (i % 2 ? 3 : -3), botY - h - 16, 6.5, kr[i % kr.length])
  }
  g.ellipse(x + w / 2, botY, w * 0.52, 4).fill({ color: 0x000000, alpha: 0.13 })
}

function ritaKruka(g, cx, botY, r, blomFarg) {
  g.moveTo(cx - r, botY - r * 1.1).lineTo(cx + r, botY - r * 1.1).lineTo(cx + r * 0.72, botY).lineTo(cx - r * 0.72, botY).closePath().fill(0xc27a58)
  g.rect(cx - r * 1.08, botY - r * 1.28, r * 2.16, r * 0.3).fill(0xd08a68)
  g.moveTo(cx, botY - r * 1.28).lineTo(cx, botY - r * 2).stroke({ width: 2.6, color: 0x5f9e6a, cap: 'round' })
  ritaBlomma(g, cx, botY - r * 2.2, r * 0.62, blomFarg)
  g.ellipse(cx, botY, r * 0.9, 3.5).fill({ color: 0x000000, alpha: 0.13 })
}

function ritaCykel(g, cx, cy, s, ramCol) {
  const wx = [cx - s * 1.12, cx + s * 1.12]
  for (const w of wx) {
    for (let a = 0; a < Math.PI; a += Math.PI / 4) {
      g.moveTo(w - Math.cos(a) * s * 0.84, cy - Math.sin(a) * s * 0.84)
        .lineTo(w + Math.cos(a) * s * 0.84, cy + Math.sin(a) * s * 0.84)
        .stroke({ width: 1.3, color: 0xd3d7dc })
    }
    g.circle(w, cy, s).stroke({ width: s * 0.17, color: 0x3b3b3b })
    g.circle(w, cy, s * 0.16).fill(0x9aa1a8)
  }
  g.moveTo(cx - s * 1.12, cy).lineTo(cx - s * 0.16, cy).lineTo(cx - s * 0.66, cy - s * 0.88).closePath().stroke({ width: s * 0.19, color: ramCol, join: 'round' })
  g.moveTo(cx - s * 0.16, cy).lineTo(cx + s * 1.12, cy).stroke({ width: s * 0.19, color: ramCol })
  g.moveTo(cx - s * 0.16, cy).lineTo(cx + s * 0.46, cy - s * 0.98).stroke({ width: s * 0.19, color: ramCol })
  g.moveTo(cx + s * 1.12, cy).lineTo(cx + s * 0.46, cy - s * 0.98).stroke({ width: s * 0.19, color: ramCol })
  g.moveTo(cx - s * 0.66, cy - s * 0.88).lineTo(cx + s * 0.46, cy - s * 0.98).stroke({ width: s * 0.17, color: ramCol })
  g.roundRect(cx - s * 0.94, cy - s * 1.06, s * 0.6, s * 0.2, s * 0.09).fill(0x40382f)
  g.moveTo(cx + s * 0.46, cy - s * 0.98).lineTo(cx + s * 0.46, cy - s * 1.24).lineTo(cx + s * 0.94, cy - s * 1.24).stroke({ width: s * 0.15, color: 0x40382f, cap: 'round' })
  g.circle(cx - s * 0.16, cy, s * 0.2).fill(0x40382f)
  g.ellipse(cx, cy + s, s * 1.5, 4).fill({ color: 0x000000, alpha: 0.12 })
}

function ritaVindsnurra(g, cx, basY, h) {
  g.rect(cx - 2, basY - h, 4, h).fill(0xbfae96)
  const r = h * 0.36
  const f = [0xd2554f, 0xffd35c, 0x4aa3df, 0x5bbf6a]
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.5
    g.moveTo(cx, basY - h)
      .lineTo(cx + Math.cos(a) * r, basY - h + Math.sin(a) * r)
      .lineTo(cx + Math.cos(a + 0.85) * r * 0.7, basY - h + Math.sin(a + 0.85) * r * 0.7)
      .closePath()
      .fill(f[i])
  }
  g.circle(cx, basY - h, r * 0.17).fill(0xfffdf7)
}

// Bord + två stolar sedda genom restaurangens ruta.
function ritaBordOchStolar(g, cx, golv, s) {
  for (const d of [-1, 1]) {
    const sx = cx + d * s * 1.02
    g.roundRect(sx - (d > 0 ? -s * 0.06 : s * 0.26), golv - s * 0.96, s * 0.1, s * 0.52, 4).fill(0x6b4630)
    g.roundRect(sx - s * 0.24, golv - s * 0.5, s * 0.48, s * 0.11, 3).fill(0x7d543a)
    g.rect(sx - s * 0.2, golv - s * 0.4, s * 0.07, s * 0.4).fill(0x5a3a28)
    g.rect(sx + s * 0.12, golv - s * 0.4, s * 0.07, s * 0.4).fill(0x5a3a28)
  }
  g.rect(cx - s * 0.07, golv - s * 0.62, s * 0.14, s * 0.62).fill(0x6b4630)
  g.roundRect(cx - s * 0.3, golv - s * 0.06, s * 0.6, s * 0.08, 4).fill(0x6b4630)
  g.roundRect(cx - s * 0.62, golv - s * 0.72, s * 1.24, s * 0.13, 5).fill(0xfffdf7)
  for (let i = 0; i < 6; i++) {
    g.rect(cx - s * 0.6 + i * s * 0.2, golv - s * 0.59, s * 0.1, s * 0.18).fill(i % 2 ? 0xfffdf7 : 0xd88b85)
  }
  ritaPizzabit(g, cx - s * 0.2, golv - s * 0.86, s * 0.19)
  g.moveTo(cx + s * 0.24, golv - s * 0.72).lineTo(cx + s * 0.24, golv - s * 0.94).stroke({ width: s * 0.06, color: 0xdfe6ea })
  g.circle(cx + s * 0.24, golv - s * 1.0, s * 0.09).fill(0xdfe6ea)
}

// Taklampa som hänger i fönstret.
function ritaTaklampa(g, cx, takY, langd) {
  g.moveTo(cx, takY).lineTo(cx, takY + langd).stroke({ width: 2, color: 0x6b6257 })
  g.moveTo(cx - 12, takY + langd + 9).lineTo(cx + 12, takY + langd + 9).lineTo(cx + 5, takY + langd).lineTo(cx - 5, takY + langd).closePath().fill(0x3f7a52)
  g.circle(cx, takY + langd + 11, 4.5).fill(0xffe9b0)
  g.circle(cx, takY + langd + 13, 11).fill({ color: 0xffe9b0, alpha: 0.22 })
}

// ---- Krossbara rutor i övervåningen ---------------------------------------
// Håller sig ovanför skyltbrädan OCH under BUT_WIN_MAXY, så spelets
// `wy > SIDEWALK_TOP - 130`-filter aldrig kastar dem.
function butiksfonster(gap, bw, topY, frame, o) {
  const w = o?.w ?? 46
  const h = o?.h ?? 56
  const cols = o?.cols ?? (bw >= 245 ? 3 : 2)
  const tak = o?.tak ?? BUT_SKYLT_TOP
  const forsta = topY + 46 + h / 2
  const sista = Math.min(BUT_WIN_MAXY, tak - 14 - h / 2)
  const rader = sista - forsta >= 66 ? 2 : 1
  const ut = []
  for (let r = 0; r < rader; r++) {
    const cy = Math.round(rader === 1 ? Math.min(forsta, sista) : forsta + r * (sista - forsta))
    for (let i = 0; i < cols; i++) {
      ut.push({ lx: Math.round(gap + (bw * (i + 1)) / (cols + 1)), cy, w, h, frame })
    }
  }
  return ut
}

// Fönsterluckor på ömse sidor om en ruta (dekor bakom själva rutan).
function ritaLuckor(g, f, col) {
  const x0 = f.lx - f.w / 2 - 7
  const x1 = f.lx + f.w / 2 + 7
  for (const [x, d] of [[x0, -1], [x1, 1]]) {
    g.roundRect(x + (d < 0 ? -13 : 0), f.cy - f.h / 2 - 5, 13, f.h + 10, 3).fill(col)
    for (let i = 0; i < 4; i++) {
      g.rect(x + (d < 0 ? -11 : 2), f.cy - f.h / 2 - 1 + i * ((f.h + 2) / 4), 9, 3).fill({ color: 0x000000, alpha: 0.14 })
    }
  }
}

// Text på skyltbrädan. Utan container ritas bara symbolen — texten är dekor.
function butikText(c, txt, x, y, size, col, maxW) {
  if (!c) return null
  const t = new Text({
    text: txt,
    style: { fontFamily: FONT.display, fontSize: size, fontWeight: '700', fill: col, letterSpacing: 1.5 },
  })
  t.anchor.set(0.5)
  if (maxW && t.width > maxW) t.scale.set(maxW / t.width)
  t.position.set(x, y)
  t.eventMode = 'none'
  c.addChild(t)
  return t
}

// Gemensamt butiksskal: kropp, taklist, markis, sockel, skyltbräda.
// Returnerar mått som de enskilda typerna bygger vidare på.
function butiksskal(g, gap, bw, bh, pal, o) {
  const topY = SIDEWALK_TOP - bh
  g.rect(gap, topY, bw, bh).fill(pal.vagg).stroke({ width: 3, color: shade(pal.vagg, 0.24) })
  ritaTaklist(g, gap, topY, bw, pal.vagg)
  // bottenvåningen i en egen ton
  g.rect(gap, BUT_MARKIS_Y - 4, bw, SIDEWALK_TOP - BUT_MARKIS_Y + 4).fill(pal.front)
  g.rect(gap, BUT_MARKIS_Y - 4, bw, 4).fill({ color: 0x000000, alpha: 0.1 })
  // sockel
  g.rect(gap, BUT_SOCKEL_Y, bw, SIDEWALK_TOP - BUT_SOCKEL_Y).fill(shade(pal.front, 0.3))
  // markis — djupet varierar så en rad butiker inte blir stämplad
  if (o?.markis !== false) ritaMarkis(g, gap + 6, BUT_MARKIS_Y, bw - 12, rnd(26, 34), pal.markis)
  // skyltbräda
  const sw = Math.round(Math.min(bw - 26, rnd(150, 190)))
  const scx = gap + bw / 2
  ritaSkyltbraeda(g, scx, 394, sw, 32, pal.skylt)
  return { topY, scx, sw, scy: 394 }
}

// Delar upp bottenvåningen i skyltfönster · tomrum · dörr. Ungefär varannan
// butik speglas (dörren till vänster) — utan det blir en hel gata stämplad.
//   andel   [min, max] av bw som skyltfönstret får ta
//   minTom  minsta tomrum mellan ruta och dörr (där skyltar/korgar står)
function butiksfront(gap, bw, o, andel, minTom) {
  const dorrW = Math.round(rnd(54, 62))
  const dispW = Math.min(Math.round(bw * rnd(andel[0], andel[1])), bw - 28 - dorrW - minTom)
  const spegel = o?.spegel ?? Math.random() < 0.45
  const dispX = spegel ? gap + bw - 14 - dispW : gap + 14
  const dorrX = spegel ? gap + 14 : gap + bw - 14 - dorrW
  const t0 = spegel ? dorrX + dorrW : dispX + dispW
  const t1 = spegel ? dispX : dorrX
  return { spegel, dispX, dispW, dorrX, dorrW, mellan: Math.round((t0 + t1) / 2), ut: spegel ? -1 : 1 }
}

// ===========================================================================
// 1. BAGERI — skyltfönster med bullar och tårta, randig markis, kringelskylt
// ===========================================================================
function ritaBageri(g, gap, o) {
  const pal = BUT_PALETT.bageri[(o?.variant ?? (Math.random() * 2) | 0) % 2]
  const bw = Math.round(rnd(226, 256))
  const bh = Math.round(rnd(300, 348))
  const sk = butiksskal(g, gap, bw, bh, pal, o)
  const topY = sk.topY

  // --- skyltfönster med hyllor -------------------------------------------
  const fr = butiksfront(gap, bw, o, [0.48, 0.54], 36)
  const { dispX, dispW, dorrX, dorrW } = fr
  ritaSkyltfonsterRam(g, dispX, BUT_GLAS_Y, dispW, BUT_GLAS_H, pal.ram, 0xfdf3e0)
  const hy1 = BUT_GLAS_Y + 40 // övre hyllans ovansida
  const hy2 = BUT_GLAS_Y + 78
  g.rect(dispX + 3, hy1, dispW - 6, 5).fill(0xb98a5e)
  g.rect(dispX + 3, hy2, dispW - 6, 5).fill(0xb98a5e)
  // övre hyllan: tårta + bulle
  ritaTarta(g, dispX + dispW * 0.3, hy1 - 15, 34, 30)
  ritaBulle(g, dispX + dispW * 0.72, hy1 - 12, 11)
  // nedre hyllan: tre bullar
  for (let i = 0; i < 3; i++) ritaBulle(g, dispX + dispW * (0.2 + i * 0.3), hy2 - 11, 10)
  ritaGlasreflex(g, dispX, BUT_GLAS_Y, dispW, BUT_GLAS_H)

  // --- dörr ---------------------------------------------------------------
  ritaButiksdorr(g, dorrX, 460, dorrW, pal.front)
  // brödkorg i tomrummet mellan ruta och dörr (ovanför trottoaren)
  const kX = fr.mellan
  g.moveTo(kX - 14, SIDEWALK_TOP - 4).lineTo(kX + 14, SIDEWALK_TOP - 4).lineTo(kX + 10, SIDEWALK_TOP - 24).lineTo(kX - 10, SIDEWALK_TOP - 24).closePath().fill(0xc08839)
  g.rect(kX - 13, SIDEWALK_TOP - 27, 26, 5).fill(0xa9702f)
  g.ellipse(kX - 7, SIDEWALK_TOP - 30, 8, 5).fill(0xdda861)
  g.ellipse(kX + 5, SIDEWALK_TOP - 31, 8, 5).fill(0xe8b95c)

  // --- skylt: ritad kringla + text ---------------------------------------
  ritaKringla(g, sk.scx - sk.sw / 2 + 24, sk.scy, 12, 0xe8b95c)
  butikText(o?.c, 'BAGERI', sk.scx + 13, sk.scy + 1, 19, 0xfff3e0, sk.sw - 56)

  // --- liten kringla som utskylt över dörren ------------------------------
  g.moveTo(dorrX + dorrW / 2, 452).lineTo(dorrX + dorrW / 2, 444).stroke({ width: 2.5, color: 0x6b6257 })
  ritaKringla(g, dorrX + dorrW / 2, 462, 9, 0xd9a441)

  const fonster = butiksfonster(gap, bw, topY, pal.ram)
  for (const f of fonster) {
    // markiser i miniatyr över varje ruta
    g.moveTo(f.lx - f.w / 2 - 8, f.cy - f.h / 2 - 9)
      .lineTo(f.lx + f.w / 2 + 8, f.cy - f.h / 2 - 9)
      .lineTo(f.lx + f.w / 2 + 4, f.cy - f.h / 2 - 16)
      .lineTo(f.lx - f.w / 2 - 4, f.cy - f.h / 2 - 16)
      .closePath()
      .fill(shade(pal.vagg, 0.3))
  }
  return {
    bw,
    topY,
    fonster,
    skyltfonster: [{ lx: dispX + dispW / 2, cy: BUT_GLAS_Y + BUT_GLAS_H / 2, w: dispW, h: BUT_GLAS_H, frame: pal.ram }],
    skylt: 'BAGERI',
  }
}

// ===========================================================================
// 2. PIZZERIA — bord och stolar innanför rutan, meny-tavla, rykande skorsten
// ===========================================================================
function ritaPizzeria(g, gap, o) {
  const pal = BUT_PALETT.pizzeria[(o?.variant ?? (Math.random() * 2) | 0) % 2]
  const bw = Math.round(rnd(242, 282))
  const bh = Math.round(rnd(302, 352))
  const sk = butiksskal(g, gap, bw, bh, pal, o)
  const topY = sk.topY

  // --- skorsten som ryker (bakom taklisten går bra, ritas efter) ----------
  const skoX = gap + bw * 0.74
  g.rect(skoX, topY - 26, 20, 30).fill(0x8a5a3b)
  g.rect(skoX - 3, topY - 30, 26, 7).fill(0x74492f)
  ritaRok(g, skoX + 10, topY - 30)

  // --- stort fönster med restaurangen innanför ----------------------------
  const fr = butiksfront(gap, bw, o, [0.4, 0.45], 54)
  const { dispX, dispW, dorrX, dorrW } = fr
  ritaSkyltfonsterRam(g, dispX, BUT_GLAS_Y, dispW, BUT_GLAS_H, pal.ram, 0xffeecb)
  ritaTaklampa(g, dispX + dispW * 0.5, BUT_GLAS_Y + 2, 16)
  ritaBordOchStolar(g, dispX + dispW * 0.5, BUT_GLAS_Y + BUT_GLAS_H - 8, 30)
  // gardinkappa högst upp (bågarna hålls innanför glaset)
  for (let i = 0; i * 16 <= dispW - 16; i++) {
    g.circle(dispX + 8 + i * 16, BUT_GLAS_Y + 3, 9).fill(0xc4544e)
  }
  g.rect(dispX, BUT_GLAS_Y, dispW, 5).fill(0xa83f3a)
  ritaGlasreflex(g, dispX, BUT_GLAS_Y, dispW, BUT_GLAS_H)

  // --- dörr + meny-tavla på väggen bredvid --------------------------------
  ritaButiksdorr(g, dorrX, 460, dorrW, pal.front)
  const mtX = fr.mellan - 20
  g.roundRect(mtX - 3, 465, 46, 70, 5).fill(0x6b4630)
  g.roundRect(mtX, 468, 40, 64, 3).fill(0x3a3a34)
  ritaPizzabit(g, mtX + 20, 481, 9)
  for (let i = 0; i < 4; i++) {
    g.rect(mtX + 6, 494 + i * 9, 28 - (i % 2) * 9, 3).fill({ color: 0xf6f6f2, alpha: 0.75 })
  }

  // --- skylt: ritad pizzabit + text ---------------------------------------
  ritaPizzabit(g, sk.scx - sk.sw / 2 + 23, sk.scy, 13)
  butikText(o?.c, 'PIZZERIA', sk.scx + 13, sk.scy + 1, 19, 0xfdf3e0, sk.sw - 56)

  const fonster = butiksfonster(gap, bw, topY, pal.ram)
  for (const f of fonster) ritaLuckor(g, f, shade(pal.markis[0], 0.12))
  return {
    bw,
    topY,
    fonster,
    skyltfonster: [{ lx: dispX + dispW / 2, cy: BUT_GLAS_Y + BUT_GLAS_H / 2, w: dispW, h: BUT_GLAS_H, frame: pal.ram }],
    skylt: 'PIZZERIA',
    rok: { x: skoX + 10, y: topY - 32 },
  }
}

// ===========================================================================
// 3. GLASSKIOSK — låg byggnad med lucka, randig markis, jättetrut på taket
// ===========================================================================
function ritaGlasskiosk(g, gap, o) {
  const pal = BUT_PALETT.glasskiosk[(o?.variant ?? (Math.random() * 2) | 0) % 2]
  const bw = Math.round(rnd(198, 236))
  const bh = Math.round(rnd(220, 244))
  const topY = SIDEWALK_TOP - bh

  // kropp
  g.roundRect(gap, topY, bw, bh, 6).fill(pal.vagg).stroke({ width: 3, color: shade(pal.vagg, 0.24) })
  g.rect(gap, 460, bw, SIDEWALK_TOP - 460).fill(pal.front)
  g.rect(gap, BUT_SOCKEL_Y, bw, SIDEWALK_TOP - BUT_SOCKEL_Y).fill(shade(pal.front, 0.3))
  // takskiva med rundad framkant
  g.roundRect(gap - 11, topY - 17, bw + 22, 20, 7).fill(shade(pal.vagg, 0.3))
  g.roundRect(gap - 11, topY - 17, bw + 22, 7, 4).fill(shade(pal.vagg, 0.08))

  // --- takskylt: glasstrut ELLER klubba (variation mellan omgångar) -------
  const skyltKlubba = (o?.takskylt ?? (Math.random() < 0.5 ? 'klubba' : 'strut')) === 'klubba'
  const basY = topY - 15
  const scx = gap + bw * 0.5
  // fäste
  g.roundRect(scx - 13, basY - 8, 26, 12, 4).fill(shade(pal.vagg, 0.36))
  if (skyltKlubba) ritaKlubba(g, scx, basY - 4, 104)
  else ritaGlasstrut(g, scx, basY - 4, 92)

  // --- lucka (krossbar ruta) + markis + disk ------------------------------
  // OBS: _drawWindow ritar karm (±h/2+5) OCH fönsterbleck (+h/2+4..+h/2+12)
  // ovanpå oss — allt inom scx ± (luckaW/2+9) och y 373–450 blir dolt. Varorna
  // ställs därför UTANFÖR den lådan, på diskens yttre ändar.
  const luckaW = 88
  const luckaH = 60
  const luckaCy = 408
  ritaMarkis(g, scx - luckaW / 2 - 16, 346, luckaW + 32, 24, pal.markis)
  // disk som skjuter ut under luckan
  const diskW = luckaW + 60
  g.roundRect(scx - diskW / 2, 452, diskW, 14, 4).fill(shade(pal.front, 0.12))
  g.rect(scx - diskW / 2 + 3, 466, diskW - 6, 5).fill({ color: 0x000000, alpha: 0.12 })
  // varor på diskens ändar (klart utanför luckans karm)
  ritaGlasstrut(g, scx - luckaW / 2 - 20, 452, 27)
  g.moveTo(scx + luckaW / 2 + 10, 432).lineTo(scx + luckaW / 2 + 30, 432).lineTo(scx + luckaW / 2 + 26, 452).lineTo(scx + luckaW / 2 + 14, 452).closePath().fill(0xeaf3f6)
  g.circle(scx + luckaW / 2 + 16, 430, 6).fill(0xff9ec4)
  g.circle(scx + luckaW / 2 + 24, 429, 5.5).fill(0xfff0d8)
  g.circle(scx + luckaW / 2 + 20, 424, 5).fill(0xa8d6b0)
  g.circle(scx + luckaW / 2 + 21, 419, 3).fill(0xd2554f)

  // --- skylt under disken -------------------------------------------------
  const sw = Math.min(bw - 34, 152)
  ritaSkyltbraeda(g, scx, 494, sw, 32, pal.skylt)
  ritaGlasstrut(g, scx - sw / 2 + 22, 508, 30)
  butikText(o?.c, 'GLASS', scx + 12, 495, 19, 0xfff6ea, sw - 52)

  // --- rad med klubbor längst ner -----------------------------------------
  for (let i = 0; i < 4; i++) {
    const kx = gap + 20 + i * ((bw - 40) / 3)
    ritaKlubba(g, kx, 544, 28)
  }

  // --- krossbara rutor ----------------------------------------------------
  const fonster = [{ lx: Math.round(scx), cy: luckaCy, w: luckaW, h: luckaH, frame: pal.ram }]
  if (bw >= 224) {
    fonster.push({ lx: Math.round(gap + bw - 34), cy: 396, w: 36, h: 40, frame: pal.ram })
    fonster.push({ lx: Math.round(gap + 34), cy: 396, w: 36, h: 40, frame: pal.ram })
  }
  return { bw, topY, fonster, skyltfonster: [], skylt: skyltKlubba ? 'GODIS' : 'GLASS' }
}

// ===========================================================================
// 4. LEKSAKSAFFÄR — boll, klossar och nalle i rutan, färgglad fasad, vimplar
// ===========================================================================
function ritaLeksaksaffar(g, gap, o) {
  const pal = BUT_PALETT.leksaksaffar[(o?.variant ?? (Math.random() * 2) | 0) % 2]
  const bw = Math.round(rnd(228, 262))
  const bh = Math.round(rnd(300, 342))
  const sk = butiksskal(g, gap, bw, bh, pal, o)
  const topY = sk.topY

  // sicksack-gesims + vindsnurra
  for (let i = 0; gap + i * 18 < gap + bw; i++) {
    const zx = gap + i * 18
    g.moveTo(zx, topY + 2).lineTo(Math.min(zx + 9, gap + bw), topY + 11).lineTo(Math.min(zx + 18, gap + bw), topY + 2).closePath().fill(shade(pal.vagg, 0.14))
  }
  ritaVindsnurra(g, gap + bw * 0.82, topY - 13, 34)
  // vimplar hänger under takfoten (ovanför rutorna) — inte över markisen,
  // där de bara skulle dölja randningen
  ritaVimplar(g, gap + 8, gap + bw - 8, topY + 15, 9, [0xd2554f, 0xffd35c, 0x4aa3df, 0x5bbf6a, 0xff9ec4])

  // --- skyltfönster med leksaker ------------------------------------------
  const fr = butiksfront(gap, bw, o, [0.48, 0.54], 30)
  const { dispX, dispW, dorrX, dorrW } = fr
  ritaSkyltfonsterRam(g, dispX, BUT_GLAS_Y, dispW, BUT_GLAS_H, pal.ram, 0xeef6fb)
  const golv = BUT_GLAS_Y + BUT_GLAS_H - 6
  // övre hylla med en trälastbil och två småbollar
  const hyY = BUT_GLAS_Y + 34
  g.rect(dispX + 3, hyY, dispW - 6, 5).fill(0xb98a5e)
  const bilX = dispX + dispW * 0.3
  g.roundRect(bilX - 15, hyY - 13, 30, 10, 3).fill(0x4aa3df)
  g.roundRect(bilX - 15, hyY - 19, 14, 8, 3).fill(0x76a8d3)
  g.circle(bilX - 8, hyY - 2, 4).fill(0x40382f)
  g.circle(bilX + 8, hyY - 2, 4).fill(0x40382f)
  ritaBoll(g, dispX + dispW * 0.64, hyY - 8, 8)
  ritaBoll(g, dispX + dispW * 0.85, hyY - 7, 7)
  // nedre golvet: nalle, klossar, stor boll
  g.rect(dispX + 2, golv, dispW - 4, 6).fill(0xd6cbb4)
  ritaNalle(g, dispX + dispW * 0.22, golv - 30, 15, 0xb98a5e)
  ritaKlossar(g, dispX + dispW * 0.55, golv, 20)
  ritaBoll(g, dispX + dispW * 0.83, golv - 14, 14)
  ritaGlasreflex(g, dispX, BUT_GLAS_Y, dispW, BUT_GLAS_H)

  // --- dörr ---------------------------------------------------------------
  ritaButiksdorr(g, dorrX, 460, dorrW, pal.front)
  // studsboll i tomrummet vid dörren (tomrummet är ~30 px — bara bollen ryms)
  ritaBoll(g, fr.mellan, SIDEWALK_TOP - 12, 11)

  // --- skylt: ritad stjärna/kloss + text ----------------------------------
  const symX = sk.scx - sk.sw / 2 + 24
  g.roundRect(symX - 11, sk.scy - 10, 20, 20, 4).fill(0xffd35c)
  g.roundRect(symX - 11, sk.scy - 10, 20, 6, 3).fill({ color: 0xffffff, alpha: 0.3 })
  g.roundRect(symX - 5, sk.scy - 14, 9, 5, 2).fill(0xe8bb43)
  g.circle(symX + 8, sk.scy + 7, 7).fill(0xd2554f)
  butikText(o?.c, 'LEKSAKER', sk.scx + 14, sk.scy + 1, 18, 0xfff6ea, sk.sw - 56)

  // Rutorna får färgade karmar av sig själva (pal.ram) — ingen extra dekor här:
  // vimplarna hänger redan i bandet direkt ovanför dem.
  const fonster = butiksfonster(gap, bw, topY, pal.ram)
  return {
    bw,
    topY,
    fonster,
    skyltfonster: [{ lx: dispX + dispW / 2, cy: BUT_GLAS_Y + BUT_GLAS_H / 2, w: dispW, h: BUT_GLAS_H, frame: pal.ram }],
    skylt: 'LEKSAKER',
  }
}

// ===========================================================================
// 5. BLOMSTERAFFÄR — blomlådor och krukor utanför, grön markis, blommor i rutan
// ===========================================================================
function ritaBlomsteraffar(g, gap, o) {
  const pal = BUT_PALETT.blomsteraffar[(o?.variant ?? (Math.random() * 2) | 0) % 2]
  const bw = Math.round(rnd(218, 252))
  const bh = Math.round(rnd(298, 344))
  const sk = butiksskal(g, gap, bw, bh, pal, o)
  const topY = sk.topY

  // klängväxt uppför väggen
  let vy = topY + 22
  let vx = gap + bw - 10
  while (vy < BUT_SKYLT_TOP - 8) {
    g.moveTo(vx, vy).quadraticCurveTo(vx - 12, vy + 12, vx, vy + 24).stroke({ width: 3, color: 0x5f9e6a, cap: 'round' })
    g.ellipse(vx - 11, vy + 12, 7, 4.5).fill(0x7fae84)
    g.ellipse(vx + 3, vy + 22, 6, 4).fill(0x8fbe8f)
    vy += 24
  }

  // --- skyltfönster med blommor i vaser -----------------------------------
  const fr = butiksfront(gap, bw, o, [0.48, 0.54], 30)
  const { dispX, dispW, dorrX, dorrW } = fr
  ritaSkyltfonsterRam(g, dispX, BUT_GLAS_Y, dispW, BUT_GLAS_H, pal.ram, 0xeff6ea)
  const golv = BUT_GLAS_Y + 62
  g.rect(dispX + 2, golv, dispW - 4, 5).fill(0xb98a5e)
  // vas med tre blommor
  const vasX = dispX + dispW * 0.3
  g.moveTo(vasX - 11, golv - 22).lineTo(vasX + 11, golv - 22).lineTo(vasX + 7, golv).lineTo(vasX - 7, golv).closePath().fill(0xa8cfe0)
  for (let i = 0; i < 3; i++) {
    const bx = vasX + (i - 1) * 9
    g.moveTo(bx, golv - 22).lineTo(bx + (i - 1) * 5, golv - 42).stroke({ width: 2.4, color: 0x5f9e6a, cap: 'round' })
    ritaBlomma(g, bx + (i - 1) * 5, golv - 46, 8, [0xff6b6b, 0xffd35c, 0xa78bfa][i])
  }
  // hink med tulpaner
  const hinkX = dispX + dispW * 0.74
  g.moveTo(hinkX - 12, golv - 20).lineTo(hinkX + 12, golv - 20).lineTo(hinkX + 9, golv).lineTo(hinkX - 9, golv).closePath().fill(0x8aa9b5)
  g.rect(hinkX - 13, golv - 23, 26, 4).fill(0x9dbcc7)
  for (let i = 0; i < 3; i++) ritaTulpan(g, hinkX + (i - 1) * 8, golv - 20, 26 + i * 3, [0xff9ec4, 0xffd35c, 0xd2554f][i])
  ritaGlasreflex(g, dispX, BUT_GLAS_Y, dispW, BUT_GLAS_H)

  // --- dörr ---------------------------------------------------------------
  ritaButiksdorr(g, dorrX, 460, dorrW, pal.front)

  // --- hängande ampel i markisen ------------------------------------------
  for (const hx of [gap + 26, gap + bw - 26]) {
    g.moveTo(hx, 444).lineTo(hx, 456).stroke({ width: 2, color: 0x6b6257 })
    g.moveTo(hx - 12, 456).quadraticCurveTo(hx, 474, hx + 12, 456).closePath().fill(0xa9784f)
    g.ellipse(hx - 9, 462, 7, 5).fill(0x7fae84)
    g.ellipse(hx + 9, 464, 7, 5).fill(0x8fbe8f)
    ritaBlomma(g, hx, 458, 6.5, 0xff9ec4)
  }

  // --- blomlådor och krukor UTANFÖR (fötterna ovanför trottoaren) ---------
  ritaBlomlada(g, dispX + 4, SIDEWALK_TOP - 2, Math.round(dispW * 0.6), 26, 0xa9784f)
  ritaKruka(g, dispX + dispW * 0.82, SIDEWALK_TOP - 2, 13, 0xffd35c)
  ritaKruka(g, gap - 17, SIDEWALK_TOP - 3, 12, 0xa78bfa)
  // hink med tulpaner i gluggen till vänster
  g.moveTo(gap - 42, SIDEWALK_TOP - 24).lineTo(gap - 22, SIDEWALK_TOP - 24).lineTo(gap - 25, SIDEWALK_TOP - 2).lineTo(gap - 39, SIDEWALK_TOP - 2).closePath().fill(0x8aa9b5)
  for (let i = 0; i < 3; i++) ritaTulpan(g, gap - 38 + i * 7, SIDEWALK_TOP - 24, 24 + i * 3, [0xd2554f, 0xffd35c, 0xff9ec4][i])

  // --- skylt: ritad blomma + text -----------------------------------------
  ritaBlomma(g, sk.scx - sk.sw / 2 + 23, sk.scy, 12, 0xff9ec4)
  butikText(o?.c, 'BLOMMOR', sk.scx + 13, sk.scy + 1, 18, 0xfff6ea, sk.sw - 54)

  const fonster = butiksfonster(gap, bw, topY, pal.ram)
  for (const f of fonster) {
    // blomlåda under fönsterblecket (blecket ritas av _drawWindow på +h/2+4..+12)
    const lb = f.cy + f.h / 2 + 12
    g.roundRect(f.lx - f.w / 2 - 6, lb, f.w + 12, 13, 3).fill(0xa9784f)
    g.rect(f.lx - f.w / 2 - 6, lb, f.w + 12, 4).fill(shade(0xa9784f, 0.22))
    for (let i = 0; i < 3; i++) ritaBlomma(g, f.lx + (i - 1) * 15, lb + 2, 6, [0xff6b6b, 0xffd35c, 0xff9ec4][i])
  }
  return {
    bw,
    topY,
    fonster,
    skyltfonster: [{ lx: dispX + dispW / 2, cy: BUT_GLAS_Y + BUT_GLAS_H / 2, w: dispW, h: BUT_GLAS_H, frame: pal.ram }],
    skylt: 'BLOMMOR',
  }
}

// ===========================================================================
// 6. CYKELAFFÄR — cykel i rutan, en lutad cykel utanför, gavelspets
// ===========================================================================
function ritaCykelaffar(g, gap, o) {
  const pal = BUT_PALETT.cykelaffar[(o?.variant ?? (Math.random() * 2) | 0) % 2]
  const bw = Math.round(rnd(234, 268))
  const bh = Math.round(rnd(302, 350))
  const sk = butiksskal(g, gap, bw, bh, pal, o)
  const topY = sk.topY

  // gavelspets på taket
  g.moveTo(gap + bw * 0.5 - 46, topY - 13).lineTo(gap + bw * 0.5, topY - 46).lineTo(gap + bw * 0.5 + 46, topY - 13).closePath().fill(shade(pal.vagg, 0.3))
  g.circle(gap + bw * 0.5, topY - 25, 9).stroke({ width: 3, color: 0xf1ece0 })
  g.circle(gap + bw * 0.5, topY - 25, 2.5).fill(0xf1ece0)

  // --- skyltfönster med cykel ---------------------------------------------
  const fr = butiksfront(gap, bw, o, [0.5, 0.56], 26)
  const { dispX, dispW, dorrX, dorrW } = fr
  ritaSkyltfonsterRam(g, dispX, BUT_GLAS_Y, dispW, BUT_GLAS_H, pal.ram, 0xecf3f7)
  const golv = BUT_GLAS_Y + BUT_GLAS_H - 10
  g.rect(dispX + 2, golv + 4, dispW - 4, 6).fill(0xc9c2b2)
  ritaCykel(g, dispX + dispW * 0.5, golv - 17, 17, 0xd2554f)
  // hylla högst upp: två hjul + en hjälm (osymmetriskt, annars läser rutan
  // som ett ansikte med två ögon)
  g.rect(dispX + 3, BUT_GLAS_Y + 34, dispW - 6, 4).fill(0xc9c2b2)
  g.circle(dispX + dispW * 0.16, BUT_GLAS_Y + 22, 11).stroke({ width: 3.5, color: 0x5e6670 })
  g.circle(dispX + dispW * 0.4, BUT_GLAS_Y + 24, 9).stroke({ width: 3, color: 0x7c848e })
  const hjX = dispX + dispW * 0.78
  g.moveTo(hjX - 13, BUT_GLAS_Y + 30)
    .quadraticCurveTo(hjX - 13, BUT_GLAS_Y + 11, hjX, BUT_GLAS_Y + 11)
    .quadraticCurveTo(hjX + 13, BUT_GLAS_Y + 11, hjX + 13, BUT_GLAS_Y + 30)
    .closePath()
    .fill(0xd2554f)
  g.roundRect(hjX - 15, BUT_GLAS_Y + 28, 30, 6, 2).fill(0xa83f3a)
  g.moveTo(hjX - 6, BUT_GLAS_Y + 16).lineTo(hjX - 4, BUT_GLAS_Y + 26).stroke({ width: 3, color: 0x8f2f2c, cap: 'round' })
  g.moveTo(hjX + 4, BUT_GLAS_Y + 16).lineTo(hjX + 6, BUT_GLAS_Y + 26).stroke({ width: 3, color: 0x8f2f2c, cap: 'round' })
  ritaGlasreflex(g, dispX, BUT_GLAS_Y, dispW, BUT_GLAS_H)

  // --- dörr ---------------------------------------------------------------
  ritaButiksdorr(g, dorrX, 460, dorrW, pal.front)

  // --- cykel lutad mot husgaveln (i gluggen, som förortshusets buske) -----
  ritaCykel(g, gap - 15, SIDEWALK_TOP - 13, 11, 0x4aa3df)
  // luftpump i tomrummet vid dörren
  g.rect(fr.mellan - 2, SIDEWALK_TOP - 30, 5, 28).fill(0x5e6670)
  g.rect(fr.mellan - 6, SIDEWALK_TOP - 34, 13, 5).fill(0x40382f)
  g.circle(fr.mellan + 1, SIDEWALK_TOP - 3, 5).fill(0x40382f)

  // --- skylt: ritat hjul + text -------------------------------------------
  const hx = sk.scx - sk.sw / 2 + 23
  g.circle(hx, sk.scy, 12).stroke({ width: 3.2, color: 0xf1ece0 })
  for (let a = 0; a < Math.PI; a += Math.PI / 3) {
    g.moveTo(hx - Math.cos(a) * 10, sk.scy - Math.sin(a) * 10).lineTo(hx + Math.cos(a) * 10, sk.scy + Math.sin(a) * 10).stroke({ width: 1.6, color: 0xf1ece0, alpha: 0.8 })
  }
  g.circle(hx, sk.scy, 3).fill(0xffd35c)
  butikText(o?.c, 'CYKLAR', sk.scx + 13, sk.scy + 1, 19, 0xf6f1e4, sk.sw - 54)

  const fonster = butiksfonster(gap, bw, topY, pal.ram)
  return {
    bw,
    topY,
    fonster,
    skyltfonster: [{ lx: dispX + dispW / 2, cy: BUT_GLAS_Y + BUT_GLAS_H / 2, w: dispW, h: BUT_GLAS_H, frame: pal.ram }],
    skylt: 'CYKLAR',
  }
}

// ===========================================================================
// Tabell + dispatch
// ===========================================================================
const HUSTYPER = [
  { id: 'bageri', vikt: 1.1, rita: ritaBageri },
  { id: 'pizzeria', vikt: 1.0, rita: ritaPizzeria },
  { id: 'glasskiosk', vikt: 1.0, rita: ritaGlasskiosk },
  { id: 'leksaksaffar', vikt: 1.0, rita: ritaLeksaksaffar },
  { id: 'blomsteraffar', vikt: 0.9, rita: ritaBlomsteraffar },
  { id: 'cykelaffar', vikt: 0.8, rita: ritaCykelaffar },
]

// Samma butik två gånger i rad känns som en bugg — vi drar om en gång.
let sisteHustyp = null

function valjHustyp() {
  const pool = HUSTYPER.filter((h) => h.id !== sisteHustyp)
  const lista = pool.length ? pool : HUSTYPER
  let sum = 0
  for (const h of lista) sum += h.vikt
  let r = Math.random() * sum
  for (const h of lista) {
    r -= h.vikt
    if (r <= 0) return h
  }
  return lista[lista.length - 1]
}

// Ritar en butiksfasad i `g` (koordinater absoluta i segmentets lokala rum,
// x börjar på `gap`, foten ligger på SIDEWALK_TOP).
//   id   — 'bageri' | 'pizzeria' | ... ; null/okänt => viktad slump
//   o    — alla fält valfria, slumpas annars:
//          c        Container som Text-skylten läggs i (utan den: bara symbolen)
//          variant  0|1 — vilken av typens två paletter
//          spegel   true = dörren till vänster, skyltfönstret till höger
//          takskylt 'strut'|'klubba' (glasskiosken)
//          markis   false = ingen markis
function ritaHus(g, gap, id, o) {
  const def = (id && HUSTYPER.find((h) => h.id === id)) || valjHustyp()
  sisteHustyp = def.id
  const r = def.rita(g, gap, o)
  // Kontraktsvakt: en krossbar ruta MÅSTE ligga innanför fasaden och över
  // BUT_WIN_MAXY, annars hoppar spelet över den (eller ritar den i luften).
  const bra = []
  const dalig = []
  for (const f of r.fonster) {
    const ok =
      f.cy <= BUT_WIN_MAXY &&
      f.cy - f.h / 2 >= r.topY + 6 &&
      f.lx - f.w / 2 >= gap + 3 &&
      f.lx + f.w / 2 <= gap + r.bw - 3
    ;(ok ? bra : dalig).push(f)
  }
  return {
    id: def.id,
    bw: r.bw,
    topY: r.topY,
    fonster: bra,
    fonsterKastade: dalig,
    skyltfonster: r.skyltfonster ?? [],
    skylt: r.skylt,
    rok: r.rok ?? null,
  }
}

// ---- Elva gatusaker att röra vid --------------------------------------------
// Fristående föremål längs trottoaren (P0 ASSETS: egen silhuett, aldrig en emoji
// i en ruta). Varje sak ritas med FOTEN i origo — y = 0 är där den står, all
// geometri ligger på minussidan.
//
// Kontraktet (se GATUSAKER längst ner):
//   rita()             -> Container med foten i origo
//   c._wxTick(t, dt)   eget liv i vila + framspelning av reaktionen. Rör BARA
//                      sina egna barn. dt klampas så att den funkar oavsett om
//                      anroparen skickar sekunder eller bildrutor.
//   c._wxReagera(nat)  'drag' | 'klibb' | 'boll' -> sätter internt tillstånd och
//                      returnerar en tagg ('vatten', 'brev', 'applen', …) så att
//                      spelet kan lägga rätt ljud och partiklar på den.
//
// Ingen gsap, inga ljud, inga partiklar här inne — allt animeras av _wxTick.
// Ingenting går sönder permanent: allt återställer sig av sig självt.

const GATU_TRAD = 0xf6f6f2 // samma trådvita som skottets nät
const GATU_VATTEN = 0x9adcf0
const GATU_SKUGGA = 0x2b2f38

// Ett draperat nät över en sak: samma ekrar + ringar som skottets nät, men
// tillplattat till föremålets låda så att det ser ut att ligga ÖVER den.
function natDrape(g, w, h) {
  const rx = w / 2
  const ry = h / 2
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    g.moveTo(0, 0).lineTo(Math.cos(a) * rx, Math.sin(a) * ry)
  }
  g.stroke({ width: 2.6, color: GATU_TRAD, alpha: 0.9, cap: 'round' })
  for (let ring = 1; ring <= 3; ring++) {
    const f = ring / 3
    for (let i = 0; i < 10; i++) {
      const a1 = (i / 10) * Math.PI * 2
      const a2 = ((i + 1) / 10) * Math.PI * 2
      const am = (a1 + a2) / 2
      g.moveTo(Math.cos(a1) * rx * f, Math.sin(a1) * ry * f)
        .quadraticCurveTo(Math.cos(am) * rx * f * 0.84, Math.sin(am) * ry * f * 0.84,
          Math.cos(a2) * rx * f, Math.sin(a2) * ry * f)
    }
  }
  g.stroke({ width: 1.8, color: GATU_TRAD, alpha: 0.72, cap: 'round' })
  g.circle(rx * 0.46, ry * 0.7, 3.2).fill({ color: GATU_VATTEN, alpha: 0.75 })
  g.circle(-rx * 0.6, ry * 0.42, 2.4).fill({ color: GATU_VATTEN, alpha: 0.65 })
}

// Bågsegment som punkter (undviker API-nycker kring arc + stroke).
function bage(g, cx, cy, r, a0, a1, steg = 12) {
  for (let i = 0; i <= steg; i++) {
    const a = a0 + (a1 - a0) * (i / steg)
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    if (i === 0) g.moveTo(x, y)
    else g.lineTo(x, y)
  }
}

// Mjuk ånga/rök: cirklar som stiger, växer och tunnas ut. fas driver hela pusten.
function ritaAnga(g, x0, y0, fas, styrka, spridning = 16, hojd = 54) {
  if (styrka <= 0.02) return
  for (let i = 0; i < 6; i++) {
    const u = (fas * 0.9 + i / 6) % 1
    const r = (5 + u * 15) * styrka
    const a = (1 - u) * 0.5 * styrka
    if (a <= 0.02 || r <= 0.6) continue
    const wob = Math.sin(u * 6.2 + i * 2.1) * spridning * u
    g.circle(x0 + wob, y0 - u * hojd, r).fill({ color: 0xf2f6f8, alpha: a })
  }
}

// Gemensam stomme: kropp-container (allt ritat) + klibbnät-överdrag + tidsfält.
function nyGatusak(natW, natH, natY) {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  c._wxT = Math.random() * 7 // egen tid — fasförskjuten så inte allt guppar i takt
  c._wxNat = null // senaste nätet som träffade
  c._wxR = 0 // sekunder kvar av reaktionen
  c._wxRT = 0 // sekunder sedan reaktionen började
  const k = new Container()
  k.eventMode = 'none'
  c.addChild(k)
  c._wxKropp = k
  const n = new Graphics()
  natDrape(n, natW, natH)
  n.position.set(0, natY)
  n.alpha = 0
  n.visible = false
  n.eventMode = 'none'
  c.addChild(n)
  c._wxNatG = n
  return c
}

// Tickens förspel: klampar dt, drar ner reaktionsklockan och tonar klibbnätet.
function tickBas(c, dt) {
  const d = clamp(dt || 0.016, 0.001, 0.05)
  c._wxT += d
  if (c._wxR > 0) {
    c._wxR = Math.max(0, c._wxR - d)
    c._wxRT += d
  }
  const n = c._wxNatG
  if (n && !n.destroyed) {
    const mal = c._wxNat === 'klibb' && c._wxR > 0 ? 1 : 0
    n.alpha += (mal - n.alpha) * Math.min(1, d * 7)
    n.visible = n.alpha > 0.02
    n.scale.set(0.84 + n.alpha * 0.16)
  }
  return d
}

function sattNat(c, nat, langd) {
  c._wxNat = nat
  c._wxR = langd
  c._wxRT = 0
}

const aktiv = (c, nat) => c._wxR > 0 && c._wxNat === nat
const avta = (p, tau) => Math.exp(-p / tau)
// 0 -> 1 -> 0, en mjuk puckel (används för studsar och blixtar)
const puckel = (p) => Math.sin(clamp(p, 0, 1) * Math.PI)

// ---- 1. BRANDPOST -----------------------------------------------------------
// drag  -> sprutar en vattenbåge · klibb -> stråle piper ut genom nätet
// boll  -> gungar och pyser vid foten
function ritaBrandpost() {
  const c = nyGatusak(70, 96, -46)
  const k = c._wxKropp
  const rod = 0xd9534a
  const g = new Graphics()
  g.ellipse(0, -3, 28, 7).fill({ color: GATU_SKUGGA, alpha: 0.16 })
  g.roundRect(-23, -13, 46, 12, 4).fill(shade(rod, 0.34)) // fotplatta
  g.roundRect(-19, -20, 38, 8, 3).fill(shade(rod, 0.2)) // krage
  g.circle(-20, -44, 10).fill(shade(rod, 0.16)) // sidonipplar
  g.circle(20, -44, 10).fill(shade(rod, 0.16))
  g.circle(-25, -44, 6).fill(0xd8d3c8)
  g.circle(25, -44, 6).fill(0xd8d3c8)
  g.roundRect(-16, -64, 32, 48, 9).fill(rod) // kropp
  g.roundRect(-11, -60, 6, 26, 3).fill({ color: 0xffffff, alpha: 0.24 }) // glans
  g.roundRect(-13, -72, 26, 10, 4).fill(shade(rod, 0.12)) // hals
  g.ellipse(0, -73, 17, 6).fill(shade(rod, 0.22)) // fläns
  g.moveTo(-14, -74).quadraticCurveTo(0, -94, 14, -74).closePath().fill(rod) // kupol
  g.moveTo(-9, -78).quadraticCurveTo(-4, -88, 1, -90)
    .stroke({ width: 3, color: tint(rod, 0.4), alpha: 0.5, cap: 'round' })
  g.circle(0, -91, 4.2).fill(0xd8d3c8) // bult
  g.circle(-1.4, -92.4, 1.6).fill({ color: 0xffffff, alpha: 0.6 })
  g.eventMode = 'none'
  k.addChild(g)

  const vatten = new Graphics()
  vatten.eventMode = 'none'
  c.addChild(vatten)

  c._wxTick = (t, dt) => {
    if (c.destroyed) return
    const d = tickBas(c, dt)
    const p = c._wxRT
    let rot = Math.sin(c._wxT * 1.3) * 0.008
    let sy = 1 + Math.sin(c._wxT * 1.7) * 0.008
    if (aktiv(c, 'boll')) {
      rot += Math.sin(p * 11) * 0.19 * avta(p, 0.9)
      sy += Math.sin(p * 14) * 0.07 * avta(p, 0.8)
    }
    if (aktiv(c, 'drag')) rot += Math.sin(p * 11) * 0.05 * avta(p, 0.5)
    if (aktiv(c, 'klibb')) rot += Math.sin(p * 26) * 0.02 * avta(p, 1.2)
    k.rotation = rot
    k.scale.set(1 - (sy - 1) * 0.6, sy)

    if (vatten.destroyed) return
    vatten.clear()
    if (aktiv(c, 'drag')) {
      const s = Math.min(1, p / 0.16) * (1 - clamp((p - 0.95) / 0.5, 0, 1))
      if (s > 0.03) {
        // Kastbana räknad, inte gissad: y = -45 - 194u + 235u² landar exakt på
        // marken (u=1 -> -4) med toppen 40 px över munstycket vid u=0,41. En
        // plattare kurva läste som en rad pärlor i skärmdumpen, inte som vatten.
        const bx = (u) => -25 - u * 110 * s
        const by = (u) => -45 - u * 194 * s + u * u * 235 * s
        for (let i = 0; i <= 18; i++) {
          const u = i / 18
          if (i === 0) vatten.moveTo(bx(u), by(u))
          else vatten.lineTo(bx(u), by(u))
        }
        vatten.stroke({ width: 10 * s, color: GATU_VATTEN, alpha: 0.5 * s, cap: 'round', join: 'round' })
        for (let i = 0; i <= 10; i++) {
          const u = i / 10
          const x = bx(u) + Math.sin(p * 12 + u * 7) * 3
          const y = by(u)
          vatten.circle(x, y, (6.6 - u * 3) * s).fill({ color: GATU_VATTEN, alpha: (0.9 - u * 0.28) * s })
          if (i % 3 === 0) vatten.circle(x - 1.6, y - 1.6, (2.3 - u) * s).fill({ color: 0xffffff, alpha: 0.55 * s })
        }
        if (s > 0.85) {
          vatten.ellipse(bx(1), -4, 26 * s, 6 * s).fill({ color: GATU_VATTEN, alpha: 0.45 * s })
          vatten.ellipse(bx(1), -6, 14 * s, 4 * s).fill({ color: 0xffffff, alpha: 0.35 * s })
        }
      }
    } else if (aktiv(c, 'klibb')) {
      const s = Math.min(1, p / 0.22) * (1 - clamp((p - 1.9) / 0.7, 0, 1))
      for (let i = 0; i <= 11; i++) {
        const u = i / 11
        const x = Math.sin(u * 6 + p * 9) * 8 * u
        const y = -90 - u * 44 * s
        const r = (4.8 - u * 2.8) * s
        if (r < 0.5) continue
        vatten.circle(x, y, r).fill({ color: GATU_VATTEN, alpha: (0.8 - u * 0.4) * s })
      }
    } else if (aktiv(c, 'boll')) {
      const s = Math.max(0, 1 - p / 1.1) * 0.85
      ritaAnga(vatten, -27, -20, p * 1.4, s, 9, 34)
      ritaAnga(vatten, 27, -20, p * 1.4 + 0.4, s, 9, 34)
    }
  }

  c._wxReagera = (nat) => {
    if (nat === 'drag') { sattNat(c, nat, 1.5); return 'vatten' }
    if (nat === 'klibb') { sattNat(c, nat, 2.6); return 'vatten_stral' }
    sattNat(c, 'boll', 1.2)
    return 'pys'
  }
  return c
}

// ---- 2. BREVLÅDA ------------------------------------------------------------
// drag -> luckan flyger upp och breven far ut · klibb -> luckan hålls stängd och
// lådan skakar · boll -> studsar med plåtiga ringar
function ritaBrev() {
  const g = new Graphics()
  g.roundRect(-11, -8, 22, 16, 2.5).fill(0xfffdf7).stroke({ width: 1.8, color: 0xc9c2b4 })
  g.moveTo(-11, -8).lineTo(0, 0.5).lineTo(11, -8).stroke({ width: 1.8, color: 0xc9b9a0 })
  g.roundRect(4, -6, 6, 5, 1).fill(0xff9ec4)
  g.eventMode = 'none'
  return g
}

function ritaBrevlada() {
  const c = nyGatusak(72, 78, -76)
  const k = c._wxKropp
  const gul = 0xffd35c
  const bla = 0x2f5fa8
  const g = new Graphics()
  g.ellipse(0, -3, 21, 6).fill({ color: GATU_SKUGGA, alpha: 0.16 })
  g.roundRect(-14, -12, 28, 10, 4).fill(0x6f7783) // fotplatta
  g.roundRect(-9, -64, 18, 58, 5).fill(0x8b93a0) // stolpe
  g.roundRect(-5, -60, 4, 48, 2).fill({ color: 0xffffff, alpha: 0.2 })
  g.roundRect(-28, -104, 56, 46, 10).fill(gul).stroke({ width: 3, color: shade(gul, 0.3) })
  g.roundRect(-31, -108, 62, 12, 6).fill(shade(gul, 0.2)) // lock/takkant
  g.roundRect(-27, -105, 54, 5, 2.5).fill({ color: 0xffffff, alpha: 0.3 })
  g.roundRect(-15, -96, 30, 6, 3).fill(shade(gul, 0.55)) // brevinkast
  // kuvert-emblem: en tvååring läser ett kuvert direkt, ett posthorn blir en klick
  g.roundRect(-14, -87, 28, 19, 3).fill(0xfffdf7).stroke({ width: 2.2, color: bla })
  g.moveTo(-14, -87).lineTo(0, -76).lineTo(14, -87).stroke({ width: 2.2, color: bla, cap: 'round' })
  g.moveTo(-14, -68).lineTo(-5, -78).moveTo(14, -68).lineTo(5, -78)
    .stroke({ width: 1.8, color: tint(bla, 0.4), cap: 'round' })
  g.eventMode = 'none'
  k.addChild(g)

  // luckan: gångjärn i överkanten, geometrin hänger nedanför origo
  const lucka = new Container()
  const lg = new Graphics()
  lg.roundRect(-23, 0, 46, 14, 4).fill(shade(gul, 0.14)).stroke({ width: 2.2, color: shade(gul, 0.34) })
  lg.roundRect(-14, 4, 28, 4, 2).fill(shade(gul, 0.42))
  lg.circle(0, 11, 2.6).fill(shade(gul, 0.5))
  lg.eventMode = 'none'
  lucka.addChild(lg)
  lucka.position.set(0, -70)
  lucka.eventMode = 'none'
  k.addChild(lucka)

  const ring = new Graphics()
  ring.eventMode = 'none'
  c.addChild(ring)

  const brev = []
  for (let i = 0; i < 3; i++) {
    const b = ritaBrev()
    b.visible = false
    c.addChild(b)
    brev.push({ g: b, x: 0, y: -80, vx: 0, vy: 0, rot: 0, vr: 0, liv: 0, start: 0 })
  }

  let oppen = 0

  c._wxTick = (t, dt) => {
    if (c.destroyed) return
    const d = tickBas(c, dt)
    const p = c._wxRT
    let mal = 0
    let kx = 0
    let ky = 0
    let rot = Math.sin(c._wxT * 1.1) * 0.01
    if (aktiv(c, 'drag')) {
      mal = 1
      rot += Math.sin(p * 13) * 0.05 * avta(p, 0.5)
    } else if (aktiv(c, 'klibb')) {
      kx = Math.sin(p * 34) * 4.2 * avta(p, 0.7)
      mal = Math.max(0, Math.sin(p * 21)) * 0.14 * avta(p, 0.6) // luckan bultar men hålls
    } else if (aktiv(c, 'boll')) {
      ky = -Math.abs(Math.sin(p * 7.5)) * 13 * avta(p, 0.9)
      rot += Math.sin(p * 10 + 1) * 0.11 * avta(p, 0.8)
    }
    oppen += (mal - oppen) * Math.min(1, d * 12)
    lucka.rotation = -oppen * 1.42
    k.position.set(kx, ky)
    k.rotation = rot

    if (!ring.destroyed) {
      ring.clear()
      if (aktiv(c, 'boll')) {
        for (let i = 0; i < 3; i++) {
          const u = (p * 1.2 - i * 0.2)
          if (u < 0 || u > 1) continue
          bage(ring, kx, -80 + ky, 32 + u * 28, -Math.PI * 0.85, -Math.PI * 0.15, 10)
          ring.stroke({ width: 4 * (1 - u), color: 0xfff3d6, alpha: (1 - u) * 0.85, cap: 'round' })
          bage(ring, kx, -80 + ky, 32 + u * 28, Math.PI * 0.15, Math.PI * 0.85, 10)
          ring.stroke({ width: 4 * (1 - u), color: 0xfff3d6, alpha: (1 - u) * 0.85, cap: 'round' })
        }
      }
    }

    for (let i = 0; i < brev.length; i++) {
      const b = brev[i]
      if (b.liv <= 0) { b.g.visible = false; continue }
      b.liv -= d
      b.start -= d
      if (b.start > 0) { b.g.visible = false; continue }
      b.g.visible = true
      b.vy += 620 * d
      b.x += b.vx * d
      b.y += b.vy * d
      b.rot += b.vr * d
      if (b.y > -7) { b.y = -7; b.vy *= -0.32; b.vx *= 0.7; b.vr *= 0.4 }
      b.g.position.set(b.x, b.y)
      b.g.rotation = b.rot
      b.g.alpha = clamp(b.liv / 0.5, 0, 1)
    }
  }

  c._wxReagera = (nat) => {
    if (nat === 'drag') {
      sattNat(c, nat, 2.4)
      for (let i = 0; i < brev.length; i++) {
        const b = brev[i]
        b.x = rnd(-6, 6)
        b.y = -76
        b.vx = rnd(-155, -45)
        b.vy = rnd(-320, -215)
        b.rot = rnd(-0.5, 0.5)
        b.vr = rnd(-5, 5)
        b.liv = 2.2
        b.start = i * 0.09
        b.g.alpha = 1
        b.g.scale.set(1)
      }
      return 'brev'
    }
    if (nat === 'klibb') { sattNat(c, nat, 2.2); return 'skak' }
    sattNat(c, 'boll', 1.4)
    return 'plat'
  }
  return c
}

// ---- 3. DÖRR (sitter på husväggen) ------------------------------------------
// drag -> dörren slås upp och ett litet monster lutar sig ut och vinkar
// klibb -> dörren öppnas på glänt och en katt kikar ut genom nätet
// boll -> dörren skallrar, lampan flimrar och två ögon blinkar i rutan
function kikMonster() {
  const c = new Container()
  const p = 0x7cc257
  const g = new Graphics()
  g.moveTo(-13, -6).lineTo(-30, -18).lineTo(-12, 3).closePath().fill(shade(p, 0.12)) // öron
  g.moveTo(13, -6).lineTo(30, -18).lineTo(12, 3).closePath().fill(shade(p, 0.12))
  g.moveTo(-14, -6).lineTo(-25, -14).lineTo(-13, -1).closePath().fill(0xf6c2d3)
  g.moveTo(14, -6).lineTo(25, -14).lineTo(13, -1).closePath().fill(0xf6c2d3)
  g.circle(0, 0, 18).fill(p)
  g.circle(-6, -3, 6).fill(0xffffff)
  g.circle(6, -3, 6).fill(0xffffff)
  g.circle(-5, -2, 3).fill(0x4a3f6b)
  g.circle(7, -2, 3).fill(0x4a3f6b)
  g.circle(-3.6, -3.8, 1.5).fill(0xffffff)
  g.circle(8.4, -3.8, 1.5).fill(0xffffff)
  g.moveTo(-9, 6).quadraticCurveTo(0, 15, 9, 6).stroke({ width: 2.8, color: 0x33291f, cap: 'round' })
  g.moveTo(-4, 9).lineTo(3, 9).lineTo(-0.5, 14).closePath().fill(0xffffff)
  g.circle(-13, 5, 3.6).fill({ color: 0xff9ec4, alpha: 0.45 })
  g.circle(13, 5, 3.6).fill({ color: 0xff9ec4, alpha: 0.45 })
  g.eventMode = 'none'
  c.addChild(g)
  const arm = new Container()
  const ag = new Graphics()
  ag.moveTo(0, 0).quadraticCurveTo(8, -10, 6, -22).stroke({ width: 7, color: shade(p, 0.16), cap: 'round' })
  ag.circle(6, -24, 6).fill(shade(p, 0.24))
  ag.eventMode = 'none'
  arm.addChild(ag)
  arm.position.set(15, 14)
  arm.eventMode = 'none'
  c.addChild(arm)
  c.eventMode = 'none'
  return { c, arm }
}

function kikKatt() {
  const c = new Container()
  const p = 0xffb15c
  const g = new Graphics()
  g.moveTo(-17, -6).lineTo(-13, -25).lineTo(-3, -9).closePath().fill(p)
  g.moveTo(3, -9).lineTo(13, -25).lineTo(17, -6).closePath().fill(p)
  g.moveTo(-13, -8).lineTo(-11, -19).lineTo(-6, -9).closePath().fill(0xf6c2d3)
  g.moveTo(6, -9).lineTo(11, -19).lineTo(13, -8).closePath().fill(0xf6c2d3)
  g.circle(0, 0, 15).fill(tint(p, 0.08))
  g.circle(-5.5, -2, 3).fill(0x33291f)
  g.circle(5.5, -2, 3).fill(0x33291f)
  g.moveTo(-3, 4).lineTo(3, 4).lineTo(0, 7.5).closePath().fill(0xe79ab0)
  g.moveTo(0, 7.5).quadraticCurveTo(-5, 11, -8, 8).stroke({ width: 2, color: 0x6e5335, cap: 'round' })
  g.moveTo(0, 7.5).quadraticCurveTo(5, 11, 8, 8).stroke({ width: 2, color: 0x6e5335, cap: 'round' })
  g.moveTo(-11, 2).lineTo(-21, 0).moveTo(-11, 5).lineTo(-21, 7)
    .stroke({ width: 1.4, color: 0x6e5335 })
  g.moveTo(11, 2).lineTo(21, 0).moveTo(11, 5).lineTo(21, 7)
    .stroke({ width: 1.4, color: 0x6e5335 })
  g.circle(-9, 4, 3).fill({ color: 0xff9ec4, alpha: 0.5 })
  g.circle(9, 4, 3).fill({ color: 0xff9ec4, alpha: 0.5 })
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}

function ritaDorr() {
  const c = nyGatusak(84, 118, -58)
  const k = c._wxKropp
  const DORR_TINTS = [0xb1543f, 0x4f7fa8, 0x5aa06e, 0x8a5a3b, 0xc07a3f]
  const dc = DORR_TINTS[(Math.random() * DORR_TINTS.length) | 0]
  const bak = new Graphics()
  bak.roundRect(-39, -114, 78, 114, 5).fill(0xd8d3c8) // karm
  bak.roundRect(-35, -110, 70, 110, 3).fill(shade(0xd8d3c8, 0.2))
  bak.rect(-30, -106, 60, 106).fill(0x352c25) // mörk hall bakom
  bak.rect(-30, -16, 60, 16).fill(0x241f1a)
  bak.eventMode = 'none'
  k.addChild(bak)

  const monster = kikMonster()
  monster.c.position.set(2, -52)
  monster.c.visible = false
  k.addChild(monster.c)
  const katt = kikKatt()
  katt.position.set(13, -48)
  katt.visible = false
  k.addChild(katt)

  const dorr = new Container()
  const dg = new Graphics()
  dg.rect(0, -106, 60, 106).fill(dc)
  dg.rect(0, -106, 5, 106).fill(shade(dc, 0.24)) // gångjärnssida
  dg.roundRect(6, -100, 48, 40, 4).fill(shade(dc, 0.16))
  dg.roundRect(10, -96, 40, 32, 3).fill(0xbfe4f2) // ruta
  dg.moveTo(30, -96).lineTo(30, -64).stroke({ width: 3, color: shade(dc, 0.3) })
  dg.moveTo(10, -80).lineTo(50, -80).stroke({ width: 3, color: shade(dc, 0.3) })
  dg.moveTo(13, -69).lineTo(26, -93).stroke({ width: 4, color: 0xffffff, alpha: 0.38, cap: 'round' })
  dg.roundRect(7, -56, 46, 46, 4).fill(shade(dc, 0.1))
  dg.roundRect(12, -51, 36, 36, 3).fill(tint(dc, 0.12))
  dg.roundRect(15, -36, 30, 7, 3.5).fill(shade(dc, 0.38)) // brevinkast
  dg.circle(52, -52, 5.5).fill(0xffd35c)
  dg.circle(50.6, -53.6, 1.9).fill(0xfff3d6)
  dg.eventMode = 'none'
  dorr.addChild(dg)
  // två ögon som kan blinka i rutan (barn av dörren så de följer med)
  const ogon = new Graphics()
  ogon.circle(21, -82, 6).fill(0xfffdf7)
  ogon.circle(39, -82, 6).fill(0xfffdf7)
  ogon.circle(22.5, -81, 3).fill(0x4a3f6b)
  ogon.circle(40.5, -81, 3).fill(0x4a3f6b)
  ogon.circle(24, -83, 1.4).fill(0xffffff)
  ogon.circle(42, -83, 1.4).fill(0xffffff)
  ogon.alpha = 0
  ogon.eventMode = 'none'
  dorr.addChild(ogon)
  dorr.position.set(-30, 0)
  dorr.eventMode = 'none'
  k.addChild(dorr)

  const fram = new Graphics()
  fram.roundRect(-46, -9, 92, 9, 3).fill(0xc9c2b4) // trappsteg
  fram.roundRect(-42, -14, 84, 6, 3).fill(0xd8d3c8)
  fram.eventMode = 'none'
  k.addChild(fram)

  // vägglampa ovanför karmen
  const lampa = new Graphics()
  lampa.moveTo(-13, 0).lineTo(13, 0).lineTo(9, -14).lineTo(-9, -14).closePath().fill(0x4a5560)
  lampa.roundRect(-11, -18, 22, 5, 2.5).fill(0x3f4650)
  lampa.ellipse(0, 0, 12, 4).fill(0xfff3d6)
  lampa.position.set(0, -116)
  lampa.eventMode = 'none'
  k.addChild(lampa)
  const sken = new Graphics()
  sken.circle(0, 0, 19).fill({ color: 0xffe9b0, alpha: 0.5 })
  sken.circle(0, 0, 11).fill({ color: 0xfff8dc, alpha: 0.6 })
  sken.position.set(0, -114)
  sken.alpha = 0.28
  sken.eventMode = 'none'
  k.addChildAt(sken, k.getChildIndex(lampa))

  let oppen = 0
  let kik = 0

  c._wxTick = (t, dt) => {
    if (c.destroyed) return
    const d = tickBas(c, dt)
    const p = c._wxRT
    let malO = 0
    let malK = 0
    let skallra = 0
    let skenMal = 0.26 + Math.sin(c._wxT * 0.9) * 0.03
    if (aktiv(c, 'drag')) { malO = 1; malK = 1 }
    // klibb: dörren måste öppnas så mycket att katten hamnar i GLUGGEN, inte bakom
    // dörrbladet (mätt i skärmdumpen — vid 0,34 var hon helt osynlig)
    else if (aktiv(c, 'klibb')) { malO = 0.54; malK = 1 }
    else if (aktiv(c, 'boll')) {
      skallra = Math.sin(p * 26) * 0.055 * avta(p, 0.7)
      skenMal = 0.28 + Math.abs(Math.sin(p * 11)) * 0.5 * avta(p, 0.9)
    }
    oppen += (malO - oppen) * Math.min(1, d * 8)
    kik += (malK - kik) * Math.min(1, d * 6)
    dorr.scale.set(1 - oppen * 0.82 + skallra, 1)
    if (!sken.destroyed) sken.alpha += (skenMal - sken.alpha) * Math.min(1, d * 10)

    const visaM = c._wxNat === 'drag' && kik > 0.03
    const visaK = c._wxNat === 'klibb' && kik > 0.03
    monster.c.visible = visaM
    katt.visible = visaK
    if (visaM) {
      monster.c.alpha = clamp(kik * 1.4, 0, 1)
      monster.c.position.set(2 + kik * 12, -52 + Math.sin(c._wxT * 4.4) * 2.4)
      monster.c.rotation = Math.sin(c._wxT * 3.1) * 0.06
      monster.arm.rotation = Math.sin(c._wxT * 11) * 0.65 * kik
    }
    if (visaK) {
      katt.alpha = clamp(kik * 1.4, 0, 1)
      katt.position.set(11 + kik * 5, -48 + Math.sin(c._wxT * 2.6) * 2)
      katt.rotation = Math.sin(c._wxT * 1.9) * 0.08
    }
    if (!ogon.destroyed) {
      const mal = aktiv(c, 'boll') && p > 0.3 ? (Math.sin(p * 4.5) > -0.45 ? 1 : 0.12) : 0
      ogon.alpha += (mal - ogon.alpha) * Math.min(1, d * 12)
    }
  }

  c._wxReagera = (nat) => {
    if (nat === 'drag') { sattNat(c, nat, 3.0); return 'monster_tittar' }
    if (nat === 'klibb') { sattNat(c, nat, 2.8); return 'katt_tittar' }
    sattNat(c, 'boll', 1.6)
    return 'knack'
  }
  return c
}

// ---- 4. ÄPPELTRÄD -----------------------------------------------------------
// drag -> kronan böjs och tre äpplen ramlar (och hoppar upp igen efteråt)
// klibb -> nät i kronan, äpplena hänger kvar och skakar · boll -> lövregn
function ritaApple() {
  const g = new Graphics()
  g.circle(0, 0, 9).fill(0xe8534a)
  g.circle(-3.2, -3.2, 3).fill({ color: 0xffffff, alpha: 0.38 })
  g.moveTo(0, -8).quadraticCurveTo(2, -14, 6, -16).stroke({ width: 2, color: 0x6b4a2f, cap: 'round' })
  g.ellipse(10, -16, 5, 3).fill(0x5bbf6a)
  g.eventMode = 'none'
  return g
}

function ritaLov() {
  const g = new Graphics()
  g.moveTo(-8, 0).quadraticCurveTo(0, -6, 8, 0).quadraticCurveTo(0, 6, -8, 0).closePath().fill(0x5bbf6a)
  g.moveTo(-8, 0).lineTo(8, 0).stroke({ width: 1.3, color: 0x3f8a36 })
  g.eventMode = 'none'
  return g
}

function ritaAppeltrad() {
  const c = nyGatusak(150, 108, -164)
  const k = c._wxKropp
  const bark = 0x8a5a3b
  const g = new Graphics()
  g.ellipse(0, -4, 42, 9).fill({ color: GATU_SKUGGA, alpha: 0.16 })
  g.moveTo(-16, 0).quadraticCurveTo(-10, -60, -8, -120).lineTo(8, -120)
    .quadraticCurveTo(10, -60, 16, 0).closePath().fill(bark)
  g.moveTo(-16, 0).quadraticCurveTo(-25, -7, -30, -2).lineTo(-13, -2).closePath().fill(shade(bark, 0.18))
  g.moveTo(16, 0).quadraticCurveTo(25, -7, 30, -2).lineTo(13, -2).closePath().fill(shade(bark, 0.18))
  g.moveTo(-6, -98).quadraticCurveTo(-24, -114, -42, -130).stroke({ width: 9, color: bark, cap: 'round' })
  g.moveTo(6, -102).quadraticCurveTo(24, -118, 44, -132).stroke({ width: 9, color: bark, cap: 'round' })
  g.moveTo(-8, -56).quadraticCurveTo(-3, -78, -6, -98).stroke({ width: 3, color: shade(bark, 0.3), cap: 'round' })
  g.moveTo(9, -40).quadraticCurveTo(5, -60, 7, -80).stroke({ width: 2.4, color: shade(bark, 0.24), cap: 'round' })
  g.eventMode = 'none'
  k.addChild(g)

  const krona = new Container()
  const cg = new Graphics()
  const lov1 = 0x4f9e42
  const lov2 = 0x5bbf6a
  const lov3 = 0x7fd07a
  cg.circle(-46, 8, 33).fill(lov1)
  cg.circle(46, 6, 31).fill(lov1)
  cg.circle(0, -12, 45).fill(lov2)
  cg.circle(-52, -14, 23).fill(lov2)
  cg.circle(52, -16, 21).fill(lov2)
  cg.circle(-26, -42, 27).fill(lov3)
  cg.circle(24, -40, 25).fill(lov3)
  cg.circle(-18, -48, 12).fill({ color: 0xa8e08a, alpha: 0.55 })
  cg.circle(31, -30, 9).fill({ color: 0xa8e08a, alpha: 0.5 })
  cg.circle(-44, 2, 8).fill({ color: 0x3f8a36, alpha: 0.4 })
  cg.circle(40, 14, 7).fill({ color: 0x3f8a36, alpha: 0.35 })
  cg.eventMode = 'none'
  krona.addChild(cg)
  krona.position.set(0, -152)
  krona.eventMode = 'none'
  k.addChild(krona)

  const BAS = [
    { x: -44, y: 22 }, { x: -16, y: 32 }, { x: 14, y: 30 }, { x: 42, y: 22 }, { x: -2, y: 6 },
  ]
  const applen = []
  for (let i = 0; i < BAS.length; i++) {
    const a = ritaApple()
    c.addChild(a)
    applen.push({ g: a, bx: BAS[i].x, by: BAS[i].y, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, faller: false, liv: 0, pop: 0 })
  }

  const lov = []
  for (let i = 0; i < 4; i++) {
    const l = ritaLov()
    l.visible = false
    c.addChild(l)
    lov.push({ g: l, x: 0, y: 0, vy: 0, fas: 0, liv: 0 })
  }

  c._wxTick = (t, dt) => {
    if (c.destroyed) return
    const d = tickBas(c, dt)
    const p = c._wxRT
    let rot = Math.sin(c._wxT * 0.85) * 0.022 + Math.sin(c._wxT * 1.9) * 0.008
    let sx = 1
    if (aktiv(c, 'drag')) rot += -0.22 * Math.cos(p * 6.5) * avta(p, 0.9) - 0.02
    if (aktiv(c, 'klibb')) rot += Math.sin(p * 5) * 0.03 * avta(p, 1.4)
    if (aktiv(c, 'boll')) {
      rot += Math.sin(p * 15) * 0.09 * avta(p, 0.85)
      sx = 1 + Math.sin(p * 13) * 0.05 * avta(p, 0.75)
    }
    krona.rotation = rot
    krona.scale.set(sx, 2 - sx)

    const cs = Math.cos(rot)
    const sn = Math.sin(rot)
    for (const a of applen) {
      if (a.faller) {
        a.liv -= d
        a.vy += 900 * d
        a.x += a.vx * d
        a.y += a.vy * d
        a.rot += a.vr * d
        if (a.y > -9) { a.y = -9; a.vy *= -0.34; a.vx *= 0.72; a.vr *= 0.5 }
        if (a.liv <= 0) { a.faller = false; a.pop = 1 }
        a.g.position.set(a.x, a.y)
        a.g.rotation = a.rot
        a.g.alpha = clamp(a.liv / 0.45, 0, 1)
      } else {
        const jig = aktiv(c, 'klibb') ? Math.sin(c._wxT * 13 + a.bx) * 2.4 * avta(p, 1.6) : 0
        const bx = a.bx * sx
        const by = a.by * (2 - sx)
        a.x = krona.x + bx * cs - by * sn
        a.y = krona.y + bx * sn + by * cs + jig
        a.g.position.set(a.x, a.y)
        a.g.rotation = rot * 0.5
        if (a.pop > 0) {
          a.pop = Math.max(0, a.pop - d * 3)
          const s = 1 + Math.sin(a.pop * Math.PI) * 0.45
          a.g.scale.set(s)
          a.g.alpha = 1 - a.pop * 0.15
        } else {
          a.g.scale.set(1)
          a.g.alpha = 1
        }
      }
    }

    for (const l of lov) {
      if (l.liv <= 0) { l.g.visible = false; continue }
      l.liv -= d
      l.vy = Math.min(l.vy + 120 * d, 62)
      l.y += l.vy * d
      l.fas += d * 3.2
      l.g.visible = true
      l.g.position.set(l.x + Math.sin(l.fas) * 22, l.y)
      l.g.rotation = Math.sin(l.fas) * 1.1
      l.g.alpha = clamp(l.liv / 0.6, 0, 1)
      l.g.scale.set(0.8 + Math.cos(l.fas) * 0.2, 1)
    }
  }

  c._wxReagera = (nat) => {
    if (nat === 'drag') {
      sattNat(c, nat, 2.0)
      let n = 0
      for (const a of applen) {
        if (a.faller || n >= 3) continue
        n++
        a.faller = true
        a.liv = rnd(2.6, 3.4)
        a.x = krona.x + a.bx
        a.y = krona.y + a.by
        a.vx = rnd(-55, 55)
        a.vy = rnd(-30, 20)
        a.vr = rnd(-6, 6)
        a.g.alpha = 1
        a.g.scale.set(1)
      }
      return 'applen'
    }
    if (nat === 'klibb') { sattNat(c, nat, 2.6); return 'applen_haenger' }
    sattNat(c, 'boll', 1.5)
    let n = 0
    for (const l of lov) {
      if (l.liv > 0 || n >= 3) continue
      n++
      l.x = rnd(-50, 50)
      l.y = -170 + rnd(-16, 16)
      l.vy = rnd(4, 20)
      l.fas = rnd(0, 6)
      l.liv = rnd(2.2, 2.8)
      l.g.alpha = 1
    }
    return 'lov'
  }
  return c
}

// ---- 5. GATULOCK (ligger i gatan) -------------------------------------------
// drag -> glider åt sidan, ånga ur hålet · klibb -> nätas fast och skallrar
// boll -> studsar högt och snurrar
function ritaGatulock() {
  const c = nyGatusak(84, 34, -8)
  const k = c._wxKropp
  const hal = new Graphics()
  hal.ellipse(0, -6, 37, 14).fill(0x241f1a)
  hal.ellipse(0, -8, 33, 11).fill(0x3a332b)
  hal.eventMode = 'none'
  k.addChild(hal)

  const anga = new Graphics()
  anga.eventMode = 'none'
  k.addChild(anga)

  const lock = new Container()
  const lg = new Graphics()
  const jarn = 0x817b71 // ljusare än asfalten (0x565d66) — annars försvinner locket
  lg.ellipse(0, 3, 38, 14).fill(shade(jarn, 0.45)) // kant/tjocklek
  lg.ellipse(0, 0, 38, 14).fill(jarn)
  lg.ellipse(0, 0, 33, 11.5).fill(shade(jarn, 0.12))
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    lg.moveTo(Math.cos(a) * 9, Math.sin(a) * 3.2)
      .lineTo(Math.cos(a) * 29, Math.sin(a) * 10)
  }
  lg.stroke({ width: 2, color: shade(jarn, 0.34), alpha: 0.9 })
  lg.ellipse(0, 0, 19, 6.6).fill(shade(jarn, 0.05))
  lg.ellipse(0, 0, 9, 3.2).fill(shade(jarn, 0.3))
  lg.ellipse(-15, -1, 4, 1.8).fill(shade(jarn, 0.6)) // lyfthål
  lg.ellipse(15, -1, 4, 1.8).fill(shade(jarn, 0.6))
  lg.moveTo(-24, -6).quadraticCurveTo(0, -11, 24, -6)
    .stroke({ width: 2.4, color: tint(jarn, 0.34), alpha: 0.45, cap: 'round' })
  lg.eventMode = 'none'
  lock.addChild(lg)
  lock.position.set(0, -8)
  lock.eventMode = 'none'
  k.addChild(lock)

  c._wxTick = (t, dt) => {
    if (c.destroyed) return
    const d = tickBas(c, dt)
    const p = c._wxRT
    let lx = 0
    let ly = 0
    let spin = 1
    let angaStyrka = 0.1 + Math.sin(c._wxT * 0.7) * 0.05
    if (aktiv(c, 'drag')) {
      const u = clamp(p / 0.3, 0, 1) * (1 - clamp((p - 1.5) / 0.5, 0, 1))
      lx = u * 40
      ly = -u * 3
      angaStyrka = 0.35 + u * 0.75
    } else if (aktiv(c, 'klibb')) {
      lx = Math.sin(p * 44) * 2.4 * avta(p, 0.9)
      ly = Math.abs(Math.sin(p * 44)) * -1.6 * avta(p, 0.9)
      angaStyrka = 0.16
    } else if (aktiv(c, 'boll')) {
      const h = Math.abs(Math.sin(p * 3.6)) * avta(p, 1.3)
      ly = -h * 64
      // platt skiva som snurrar om sin lodräta axel = scale.x pendlar
      spin = 0.3 + Math.abs(Math.cos(p * 7)) * 0.7
      angaStyrka = 0.34 * h + 0.12
    }
    lock.position.set(lx, -8 + ly)
    lock.scale.set(spin, 1)

    if (!anga.destroyed) {
      anga.clear()
      ritaAnga(anga, 0, -10, c._wxT * 0.55, clamp(angaStyrka, 0, 1.1), 14, 62)
    }
  }

  c._wxReagera = (nat) => {
    if (nat === 'drag') { sattNat(c, nat, 2.2); return 'anga' }
    if (nat === 'klibb') { sattNat(c, nat, 2.0); return 'lock_last' }
    sattNat(c, 'boll', 1.8)
    return 'klang'
  }
  return c
}

// ---- 6. BLOMMOR -------------------------------------------------------------
// drag -> stjälkarna böjs djupt och fjädrar tillbaka i ett pollenmoln
// klibb -> nätet lägger sig som en spetsduk, blommorna bugar · boll -> studsmatta
function ritaBlommor() {
  const c = nyGatusak(86, 70, -34)
  const k = c._wxKropp
  const g = new Graphics()
  g.ellipse(0, -3, 32, 8).fill({ color: GATU_SKUGGA, alpha: 0.14 })
  g.ellipse(0, -5, 30, 9).fill(0x6b5a44) // jordkulle
  g.ellipse(-8, -7, 12, 4).fill(0x7d6a50)
  for (let i = 0; i < 9; i++) {
    const x = -28 + i * 7 + rnd(-1.5, 1.5)
    const h = rnd(14, 26)
    const lut = rnd(-9, 9)
    g.moveTo(x, -4).quadraticCurveTo(x + lut * 0.4, -4 - h * 0.6, x + lut, -4 - h)
      .stroke({ width: 3.4, color: i % 2 ? 0x5bbf6a : 0x4f9e42, cap: 'round' })
  }
  g.eventMode = 'none'
  k.addChild(g)

  const KRON = [0xff9ec4, 0xffd35c, 0xa78bfa, 0xff8a3d, 0x57c8c3]
  const stjalkar = []
  const spec = [
    { x: -22, h: 40, f: 0 }, { x: 2, h: 56, f: 1.7 }, { x: 22, h: 46, f: 3.4 },
  ]
  for (let i = 0; i < spec.length; i++) {
    const s = spec[i]
    const kron = KRON[(Math.random() * KRON.length) | 0]
    const st = new Container()
    const sg = new Graphics()
    sg.moveTo(0, 0).quadraticCurveTo(rnd(-4, 4), -s.h * 0.55, 0, -s.h)
      .stroke({ width: 4, color: 0x4f9e42, cap: 'round' })
    sg.ellipse(-8, -s.h * 0.45, 8, 4.2).fill(0x5bbf6a)
    sg.ellipse(8, -s.h * 0.66, 7, 3.8).fill(0x5bbf6a)
    sg.eventMode = 'none'
    st.addChild(sg)
    const huvud = new Container()
    const hg = new Graphics()
    for (let q = 0; q < 6; q++) {
      const a = -Math.PI / 2 + (q / 6) * Math.PI * 2
      hg.ellipse(Math.cos(a) * 11, Math.sin(a) * 11, 6.8, 5.6).fill(kron)
    }
    hg.circle(0, 0, 5.8).fill(0xffd35c)
    hg.circle(0, 0, 3).fill(0xffb15c)
    hg.circle(-1.6, -1.6, 1.4).fill({ color: 0xffffff, alpha: 0.6 })
    hg.eventMode = 'none'
    huvud.addChild(hg)
    huvud.position.set(0, -s.h)
    huvud.eventMode = 'none'
    st.addChild(huvud)
    st.position.set(s.x, -4)
    st.eventMode = 'none'
    k.addChild(st)
    stjalkar.push({ c: st, huvud, fas: s.f, h: s.h, i, kron })
  }

  const pollen = new Graphics()
  pollen.eventMode = 'none'
  c.addChild(pollen)

  c._wxTick = (t, dt) => {
    if (c.destroyed) return
    const d = tickBas(c, dt)
    const p = c._wxRT
    for (const s of stjalkar) {
      let rot = Math.sin(c._wxT * 1.5 + s.fas) * 0.075 + Math.sin(c._wxT * 2.7 + s.fas) * 0.03
      let sy = 1
      if (aktiv(c, 'drag')) {
        rot += -0.6 * Math.cos(p * 5.2 - s.i * 0.35) * avta(p, 0.95)
      } else if (aktiv(c, 'klibb')) {
        rot += 0.2 * (1 - avta(p, 0.35)) * avta(p, 2.2)
        rot += Math.sin(c._wxT * 9 + s.fas) * 0.035 * avta(p, 1.6)
      } else if (aktiv(c, 'boll')) {
        const fas = p * 6 - s.i * 0.6
        if (fas > 0) sy = 1 - Math.sin(Math.min(fas, Math.PI * 2)) * 0.34 * avta(p, 0.95)
        rot += Math.sin(fas * 1.5) * 0.13 * avta(p, 0.95)
      }
      s.c.rotation = rot
      s.c.scale.set(1, sy)
      s.huvud.rotation = -rot * 0.5
      s.huvud.scale.set(1 / Math.max(0.5, sy) * 0.98 + 0.02, 1)
    }

    if (!pollen.destroyed) {
      pollen.clear()
      const dragP = aktiv(c, 'drag') ? clamp(1 - p / 0.9, 0, 1) : 0
      const bollP = aktiv(c, 'boll') ? clamp(1 - p / 0.9, 0, 1) : 0
      const styrka = Math.max(dragP, bollP)
      if (styrka > 0.03) {
        // FÄRGADE kronblad blandat med gula pollenkorn — rena krämvita korn i
        // 2 px blev osynliga mot trottoaren (mätt i närbilden)
        for (let i = 0; i < 12; i++) {
          const s = stjalkar[i % stjalkar.length]
          const u = ((p * 1.1 + i * 0.15) % 1)
          const ang = (i / 12) * Math.PI * 2
          const x = s.c.x + Math.cos(ang) * (11 + u * 32)
          const y = -4 - s.h + Math.sin(ang) * (9 + u * 24) - u * 16
          const r = (5.4 - u * 3.4) * styrka
          if (r < 0.5) continue
          pollen.circle(x, y, r).fill({ color: i % 2 ? s.kron : 0xffe9b0, alpha: (1 - u * 0.7) * 0.95 * styrka })
        }
      }
    }
  }

  c._wxReagera = (nat) => {
    if (nat === 'drag') { sattNat(c, nat, 1.8); return 'pollen' }
    if (nat === 'klibb') { sattNat(c, nat, 2.4); return 'blommor_bugar' }
    sattNat(c, 'boll', 1.6)
    return 'studs_blomma'
  }
  return c
}

// ---- 7. LYKTSTOLPE ----------------------------------------------------------
// drag -> tänds varmt och två nattfjärilar dansar runt lampan
// klibb -> nät över lyktan, ljuset blinkar långsamt · boll -> lyktan gungar
function ritaLyktstolpe() {
  const c = nyGatusak(70, 62, -190)
  const k = c._wxKropp
  const jarn = 0x556070
  const g = new Graphics()
  g.ellipse(0, -3, 22, 6).fill({ color: GATU_SKUGGA, alpha: 0.16 })
  g.moveTo(-16, 0).lineTo(-11, -16).lineTo(11, -16).lineTo(16, 0).closePath().fill(shade(jarn, 0.3))
  g.roundRect(-11, -22, 22, 8, 3).fill(shade(jarn, 0.15))
  g.roundRect(-5, -174, 10, 154, 4).fill(jarn)
  g.roundRect(-3, -170, 3, 140, 1.5).fill({ color: 0xffffff, alpha: 0.16 })
  g.roundRect(-8, -128, 16, 8, 3).fill(shade(jarn, 0.15)) // dekorring
  g.moveTo(0, -174).quadraticCurveTo(0, -196, -26, -196)
    .stroke({ width: 9, color: jarn, cap: 'round' })
  g.circle(-4, -190, 4).fill(shade(jarn, 0.2))
  g.eventMode = 'none'
  k.addChild(g)

  // mjuk halo i tre skal — en enda tät cirkel läser som en klistrad skiva
  const sken = new Graphics()
  sken.circle(0, 10, 36).fill({ color: 0xffe9b0, alpha: 0.13 })
  sken.circle(0, 10, 25).fill({ color: 0xffe9b0, alpha: 0.16 })
  sken.circle(0, 10, 15).fill({ color: 0xfff8dc, alpha: 0.26 })
  sken.position.set(-26, -196)
  sken.alpha = 0.16
  sken.eventMode = 'none'
  k.addChild(sken)

  const lampa = new Container()
  const lg = new Graphics()
  lg.moveTo(-15, 0).lineTo(15, 0).lineTo(9, -13).lineTo(-9, -13).closePath().fill(shade(jarn, 0.2))
  lg.ellipse(0, -13, 11, 4).fill(shade(jarn, 0.35))
  lg.circle(0, -18, 3.4).fill(shade(jarn, 0.4))
  lg.moveTo(-14, 1).lineTo(14, 1).lineTo(9, 19).lineTo(-9, 19).closePath().fill(0xfff3d6)
  lg.moveTo(-14, 1).lineTo(14, 1).lineTo(9, 19).lineTo(-9, 19).closePath()
    .stroke({ width: 2.6, color: shade(jarn, 0.1) })
  lg.moveTo(0, 1).lineTo(0, 19).stroke({ width: 1.8, color: shade(jarn, 0.05), alpha: 0.6 })
  lg.roundRect(-10, 19, 20, 5, 2.5).fill(shade(jarn, 0.25))
  lg.circle(0, 26, 3).fill(shade(jarn, 0.35))
  lg.eventMode = 'none'
  lampa.addChild(lg)
  lampa.position.set(-26, -196)
  lampa.eventMode = 'none'
  k.addChild(lampa)

  const glod = new Graphics()
  glod.moveTo(-11, 3).lineTo(11, 3).lineTo(7, 17).lineTo(-7, 17).closePath().fill(0xffe9b0)
  glod.alpha = 0
  glod.eventMode = 'none'
  lampa.addChild(glod)

  const malar = new Graphics()
  malar.eventMode = 'none'
  c.addChild(malar)

  c._wxTick = (t, dt) => {
    if (c.destroyed) return
    const d = tickBas(c, dt)
    const p = c._wxRT
    let ljusMal = 0.12 + Math.sin(c._wxT * 0.6) * 0.03
    let sving = Math.sin(c._wxT * 1.1) * 0.012
    if (aktiv(c, 'drag')) {
      ljusMal = 0.5 + puckel(clamp(p / 0.4, 0, 1)) * 0.5
      if (p > 0.4) ljusMal = 0.72 + Math.sin(p * 3) * 0.06
      sving += Math.sin(p * 8) * 0.04 * avta(p, 0.6)
    } else if (aktiv(c, 'klibb')) {
      ljusMal = 0.2 + Math.abs(Math.sin(p * 3.4)) * 0.62
    } else if (aktiv(c, 'boll')) {
      sving += Math.sin(p * 5.2) * 0.4 * avta(p, 1.1)
      ljusMal = 0.2 + Math.abs(Math.sin(p * 5.2)) * 0.24
    }
    lampa.rotation = sving
    if (!glod.destroyed) glod.alpha += (ljusMal - glod.alpha) * Math.min(1, d * 9)
    if (!sken.destroyed) {
      sken.alpha += (clamp(ljusMal, 0.14, 1) - sken.alpha) * Math.min(1, d * 9)
      // halon följer glaset när lyktan gungar (glaspunkten (0,10) roterad)
      sken.position.set(-26 - Math.sin(sving) * 10, -196 + (Math.cos(sving) - 1) * 10)
    }

    if (!malar.destroyed) {
      malar.clear()
      if (aktiv(c, 'drag')) {
        const s = clamp(p / 0.4, 0, 1) * clamp((2.4 - p) / 0.6, 0, 1)
        for (let i = 0; i < 2; i++) {
          const a = c._wxT * 2.7 + i * Math.PI
          const x = -26 + Math.cos(a) * 36
          const y = -184 + Math.sin(a * 1.3) * 18
          const flap = Math.sin(c._wxT * 22 + i) * 0.5 + 0.6
          malar.ellipse(x - 6, y - 1, 7 * flap, 5).fill({ color: 0xf7ecd0, alpha: 0.95 * s })
          malar.ellipse(x + 6, y - 1, 7 * flap, 5).fill({ color: 0xf7ecd0, alpha: 0.95 * s })
          malar.ellipse(x, y + 1, 4.2, 3).fill({ color: 0x9a8560, alpha: 0.95 * s })
          malar.circle(x - 1.4, y - 1.6, 1.1).fill({ color: 0x33291f, alpha: 0.8 * s })
          malar.circle(x + 1.4, y - 1.6, 1.1).fill({ color: 0x33291f, alpha: 0.8 * s })
        }
      }
    }
  }

  c._wxReagera = (nat) => {
    if (nat === 'drag') { sattNat(c, nat, 3.0); return 'ljus' }
    if (nat === 'klibb') { sattNat(c, nat, 3.0); return 'blink' }
    sattNat(c, 'boll', 2.4)
    return 'sving'
  }
  return c
}

// ---- 8. TRAFIKLJUS ----------------------------------------------------------
// drag -> växlar färg · klibb -> fryser på grönt och pulsar · boll -> alla tre
// lyser samtidigt. Visar ALDRIG "fel" — bara färger.
function ritaTrafikljus() {
  const c = nyGatusak(64, 128, -156)
  const k = c._wxKropp
  const jarn = 0x4a5560
  const g = new Graphics()
  g.ellipse(0, -3, 20, 6).fill({ color: GATU_SKUGGA, alpha: 0.16 })
  g.moveTo(-15, 0).lineTo(-10, -14).lineTo(10, -14).lineTo(15, 0).closePath().fill(shade(jarn, 0.3))
  g.roundRect(-5, -116, 10, 106, 4).fill(jarn)
  g.roundRect(-3, -112, 3, 96, 1.5).fill({ color: 0xffffff, alpha: 0.14 })
  g.roundRect(-24, -212, 48, 100, 11).fill(shade(jarn, 0.25)) // lyktbox
  g.roundRect(-20, -208, 40, 92, 8).fill(shade(jarn, 0.5))
  g.roundRect(-26, -218, 52, 10, 5).fill(shade(jarn, 0.15)) // tak
  g.eventMode = 'none'
  k.addChild(g)

  const FARGER = [0xff6b6b, 0xffd35c, 0x5bbf6a]
  // 30 px mellan lamporna: vid 26 åt visiret och skenet in i grannlampan så att
  // den gula försvann helt (hittat i närbilden, aldrig i ett grönt test)
  const YS = [-190, -160, -130]
  const dim = new Graphics()
  for (let i = 0; i < 3; i++) {
    dim.circle(0, YS[i], 12).fill(shade(FARGER[i], 0.6))
    dim.circle(-3.2, YS[i] - 3.2, 3.6).fill({ color: 0xffffff, alpha: 0.1 })
  }
  dim.eventMode = 'none'
  k.addChild(dim)

  const lampor = []
  for (let i = 0; i < 3; i++) {
    const lg = new Graphics()
    lg.circle(0, 0, 17).fill({ color: FARGER[i], alpha: 0.28 })
    lg.circle(0, 0, 12).fill(FARGER[i])
    lg.circle(-3.4, -3.4, 4).fill({ color: 0xffffff, alpha: 0.45 })
    lg.position.set(0, YS[i])
    lg.alpha = 0
    lg.eventMode = 'none'
    k.addChild(lg)
    lampor.push(lg)
  }
  // visir: ligger tätt ovanpå sin EGEN lampa, sticker upp 7 px
  const visir = new Graphics()
  for (let i = 0; i < 3; i++) {
    visir.moveTo(-15, YS[i] - 11).quadraticCurveTo(0, YS[i] - 22, 15, YS[i] - 11)
      .closePath().fill(shade(jarn, 0.42))
  }
  visir.eventMode = 'none'
  k.addChild(visir)

  const niva = [0, 0, 1]
  let farg = 2
  let skifte = rnd(3.5, 6.5)

  c._wxTick = (t, dt) => {
    if (c.destroyed) return
    const d = tickBas(c, dt)
    const p = c._wxRT
    const frys = aktiv(c, 'klibb')
    const alla = aktiv(c, 'boll')
    if (!frys && !alla) {
      skifte -= d
      if (skifte <= 0) {
        farg = (farg + 2) % 3 // grön -> gul -> röd -> grön
        skifte = rnd(3.5, 6.5)
      }
    }
    if (frys) farg = 2
    for (let i = 0; i < 3; i++) {
      let mal = i === farg ? 1 : 0
      if (alla) mal = 0.65 + Math.abs(Math.sin(p * 7 + i)) * 0.35
      if (frys && i === 2) mal = 0.7 + Math.abs(Math.sin(p * 4.2)) * 0.3
      if (aktiv(c, 'drag') && i === farg) mal = Math.min(1, 0.8 + puckel(clamp(p / 0.3, 0, 1)) * 0.4)
      niva[i] += (mal - niva[i]) * Math.min(1, d * (alla ? 14 : 9))
      lampor[i].alpha = niva[i]
      const s = 1 + niva[i] * 0.08
      lampor[i].scale.set(s)
    }
    let rot = Math.sin(c._wxT * 0.9) * 0.006
    if (aktiv(c, 'boll')) rot += Math.sin(p * 15) * 0.05 * avta(p, 0.5)
    if (aktiv(c, 'drag')) rot += Math.sin(p * 12) * 0.02 * avta(p, 0.4)
    k.rotation = rot
  }

  c._wxReagera = (nat) => {
    if (nat === 'drag') {
      farg = (farg + 2) % 3
      skifte = rnd(4, 7)
      sattNat(c, nat, 1.2)
      return 'byt_farg'
    }
    if (nat === 'klibb') { sattNat(c, nat, 3.0); return 'gront' }
    sattNat(c, 'boll', 2.0)
    return 'alla_lyser'
  }
  return c
}

// ---- 9. PARKERAD BIL --------------------------------------------------------
// drag -> takboxens lock flyger upp och en ballong seglar ut
// klibb -> nät över hela bilen, den sjunker på fjädringen och vindrutetorkaren
// vinkar · boll -> studsar på taket, bilen vaggar och lyktorna blinkar
function ritaBil() {
  const c = nyGatusak(244, 132, -66)
  const k = c._wxKropp
  const LACK = [0x4aa3df, 0xff6b6b, 0x5bbf6a, 0xffd35c, 0xa78bfa, 0xff8a3d, 0x57c8c3]
  const lack = LACK[(Math.random() * LACK.length) | 0]
  const skugga = new Graphics()
  skugga.ellipse(0, -6, 108, 11).fill({ color: GATU_SKUGGA, alpha: 0.18 })
  skugga.eventMode = 'none'
  k.addChild(skugga)

  const hjul = []
  for (const hx of [-68, 68]) {
    const hg = new Graphics()
    hg.circle(0, 0, 23).fill(0x2f353d)
    hg.circle(0, 0, 14).fill(0xc9ced6)
    hg.circle(0, 0, 5).fill(0x8b93a0)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      hg.moveTo(Math.cos(a) * 5, Math.sin(a) * 5).lineTo(Math.cos(a) * 13, Math.sin(a) * 13)
    }
    hg.stroke({ width: 2.6, color: 0x8b93a0 })
    hg.position.set(hx, -23)
    hg.eventMode = 'none'
    k.addChild(hg)
    hjul.push(hg)
  }

  const kaross = new Container()
  const bg = new Graphics()
  bg.moveTo(-58, -64).lineTo(-40, -102).lineTo(42, -102).lineTo(60, -64).closePath().fill(lack) // kupé
  bg.roundRect(-106, -66, 212, 46, 14).fill(lack) // kaross
  bg.roundRect(-108, -34, 216, 12, 6).fill(shade(lack, 0.34)) // stötfångare/tröskel
  bg.moveTo(-50, -68).lineTo(-34, -96).lineTo(-5, -96).lineTo(-5, -68).closePath().fill(0xbfe4f2)
  bg.moveTo(3, -68).lineTo(3, -96).lineTo(37, -96).lineTo(52, -68).closePath().fill(0xbfe4f2)
  bg.moveTo(-46, -72).lineTo(-32, -92).stroke({ width: 4, color: 0xffffff, alpha: 0.4, cap: 'round' })
  bg.moveTo(-1, -68).lineTo(-1, -30).stroke({ width: 2.6, color: shade(lack, 0.28) }) // dörrfog
  bg.roundRect(-30, -56, 16, 6, 3).fill(shade(lack, 0.3)) // handtag
  bg.roundRect(8, -56, 16, 6, 3).fill(shade(lack, 0.3))
  bg.ellipse(104, -46, 6, 9).fill(0xfff3d6) // strålkastare
  bg.ellipse(-104, -46, 6, 9).fill(0xff8a3d) // baklykta
  bg.roundRect(-100, -60, 190, 5, 2.5).fill({ color: 0xffffff, alpha: 0.16 }) // sidoglans
  bg.moveTo(56, -70).lineTo(70, -70).lineTo(66, -62).lineTo(56, -62).closePath().fill(shade(lack, 0.2)) // spegel
  bg.eventMode = 'none'
  kaross.addChild(bg)

  // vindrutetorkare (vinkar vid klibb)
  const torkare = new Container()
  const tg = new Graphics()
  tg.moveTo(0, 0).lineTo(2, -22).stroke({ width: 3, color: 0x3f4650, cap: 'round' })
  tg.moveTo(-3, -20).lineTo(6, -24).stroke({ width: 2.2, color: 0x3f4650, cap: 'round' })
  tg.eventMode = 'none'
  torkare.addChild(tg)
  torkare.position.set(40, -68)
  torkare.eventMode = 'none'
  kaross.addChild(torkare)

  // takbox med lock
  const boxG = new Graphics()
  boxG.roundRect(-34, -122, 74, 22, 9).fill(shade(lack, 0.18))
  boxG.roundRect(-30, -118, 66, 8, 4).fill({ color: 0xffffff, alpha: 0.14 })
  boxG.roundRect(-38, -104, 82, 6, 3).fill(0x3f4650) // takräcke
  boxG.eventMode = 'none'
  kaross.addChild(boxG)

  const ballong = new Graphics()
  const bfarg = [0xff6b6b, 0xffd35c, 0x4aa3df, 0xa78bfa, 0x5bbf6a][(Math.random() * 5) | 0]
  ballong.moveTo(0, 20).quadraticCurveTo(7, 32, 1, 44).stroke({ width: 2, color: 0x8a8578 })
  ballong.ellipse(0, 0, 18, 22).fill(bfarg).stroke({ width: 2.4, color: shade(bfarg, 0.2) })
  ballong.ellipse(-6, -9, 5.5, 8).fill({ color: 0xffffff, alpha: 0.45 })
  ballong.moveTo(-4, 17).lineTo(4, 17).lineTo(0, 23).closePath().fill(shade(bfarg, 0.16))
  ballong.visible = false
  ballong.eventMode = 'none'
  kaross.addChild(ballong)

  // lyktglans som blinkar (egen Graphics så karossen aldrig tonas)
  const lyktor = new Graphics()
  lyktor.circle(104, -46, 13).fill({ color: 0xfff8dc, alpha: 0.45 })
  lyktor.ellipse(104, -46, 7, 10).fill(0xfffdf7)
  lyktor.circle(-104, -46, 12).fill({ color: 0xffb27a, alpha: 0.4 })
  lyktor.ellipse(-104, -46, 6.5, 9.5).fill(0xffb27a)
  lyktor.alpha = 0
  lyktor.eventMode = 'none'
  kaross.addChild(lyktor)

  const lock = new Container()
  const lockG = new Graphics()
  lockG.roundRect(0, -12, 74, 14, 7).fill(shade(lack, 0.05))
  lockG.roundRect(4, -10, 66, 5, 2.5).fill({ color: 0xffffff, alpha: 0.2 })
  lockG.eventMode = 'none'
  lock.addChild(lockG)
  lock.position.set(-34, -110)
  lock.eventMode = 'none'
  kaross.addChild(lock)

  kaross.eventMode = 'none'
  k.addChild(kaross)

  let bal = { x: 0, y: 0, vy: 0, vx: 0, liv: 0 }
  let lockOppen = 0

  c._wxTick = (t, dt) => {
    if (c.destroyed) return
    const d = tickBas(c, dt)
    const p = c._wxRT
    let ky = Math.sin(c._wxT * 1.4) * 0.5
    let rot = Math.sin(c._wxT * 0.8) * 0.004
    let malLock = 0
    let hjulRot = Math.sin(c._wxT * 1.1) * 0.02
    if (aktiv(c, 'drag')) {
      malLock = 1
      ky += -Math.abs(Math.sin(p * 7)) * 7 * avta(p, 0.9)
      rot += Math.sin(p * 7) * 0.03 * avta(p, 0.9)
    } else if (aktiv(c, 'klibb')) {
      ky += 6 * (1 - avta(p, 0.25)) * avta(p, 2.6) // sjunker på fjädringen
      hjulRot += Math.sin(p * 16) * 0.22 * avta(p, 0.8)
    } else if (aktiv(c, 'boll')) {
      ky += -Math.abs(Math.sin(p * 6)) * 11 * avta(p, 0.95)
      rot += Math.sin(p * 8) * 0.06 * avta(p, 0.9)
    }
    kaross.position.set(0, ky)
    k.rotation = rot
    hjul[0].rotation = hjulRot
    hjul[1].rotation = -hjulRot

    lockOppen += (malLock - lockOppen) * Math.min(1, d * 8)
    // 1,05 rad — vid 1,5 stod locket rakt upp och läste som en mast (sett i bilden)
    lock.rotation = -lockOppen * 1.05

    // vindrutetorkaren vinkar bara när nätet sitter
    torkare.rotation = aktiv(c, 'klibb') ? Math.sin(p * 9) * 0.75 : Math.sin(c._wxT * 0.5) * 0.02 - 0.1

    if (!lyktor.destroyed) {
      const mal = aktiv(c, 'boll') ? (Math.sin(p * 9) > 0 ? 1 : 0.05) : 0
      lyktor.alpha += (mal - lyktor.alpha) * Math.min(1, d * 16)
    }
    if (!ballong.destroyed) {
      if (bal.liv > 0) {
        bal.liv -= d
        bal.vy = Math.max(bal.vy - 60 * d, -78)
        bal.vx += Math.sin(c._wxT * 2.2) * 26 * d
        bal.x += bal.vx * d
        bal.y += bal.vy * d
        ballong.visible = true
        ballong.position.set(bal.x, bal.y)
        ballong.rotation = Math.sin(c._wxT * 2.6) * 0.16
        ballong.alpha = clamp(bal.liv / 0.7, 0, 1)
        ballong.scale.set(clamp(1.15 - bal.liv * 0.06, 0.6, 1))
      } else {
        ballong.visible = false
      }
    }
  }

  c._wxReagera = (nat) => {
    if (nat === 'drag') {
      sattNat(c, nat, 2.8)
      bal = { x: 3, y: -112, vy: -40, vx: rnd(-8, 8), liv: 2.6 }
      ballong.alpha = 1
      ballong.scale.set(1)
      return 'ballong'
    }
    if (nat === 'klibb') { sattNat(c, nat, 2.8); return 'bil_fast' }
    sattNat(c, 'boll', 1.6)
    return 'bil_studs'
  }
  return c
}

// ---- 10. KORVSTÅND ----------------------------------------------------------
// drag -> en korv far upp i luften och landar tillbaka på grillen
// klibb -> markisen rullas ner (och upp igen) · boll -> korvarna hoppar på grillen
function ritaKorvstand() {
  const c = nyGatusak(196, 120, -76)
  const k = c._wxKropp
  const rod = 0xd9534a
  const gradd = 0xfffdf7
  const g = new Graphics()
  g.ellipse(0, -5, 84, 10).fill({ color: GATU_SKUGGA, alpha: 0.16 })
  g.eventMode = 'none'
  k.addChild(g)

  const hjul = []
  for (const hx of [-56, 56]) {
    const hg = new Graphics()
    hg.circle(0, 0, 14).fill(0x3f4650)
    hg.circle(0, 0, 7).fill(0xc9ced6)
    hg.moveTo(-6, 0).lineTo(6, 0).moveTo(0, -6).lineTo(0, 6).stroke({ width: 2, color: 0x8b93a0 })
    hg.position.set(hx, -14)
    hg.eventMode = 'none'
    k.addChild(hg)
    hjul.push(hg)
  }

  const vagn = new Container()
  const vg = new Graphics()
  vg.roundRect(-74, -86, 148, 66, 10).fill(gradd).stroke({ width: 3, color: 0xd8d3c8 })
  for (let i = 0; i < 4; i++) {
    vg.roundRect(-64 + i * 36, -80, 16, 54, 6).fill({ color: rod, alpha: 0.85 })
  }
  vg.roundRect(-74, -50, 148, 8, 4).fill(shade(rod, 0.1))
  vg.roundRect(-82, -96, 164, 12, 5).fill(0xd8d3c8) // disk
  vg.roundRect(-82, -96, 164, 4, 2).fill({ color: 0xffffff, alpha: 0.4 })
  vg.roundRect(-78, -18, 156, 6, 3).fill(0x8b93a0) // underrede
  // grill
  vg.roundRect(-46, -108, 76, 13, 5).fill(0x4a5560)
  vg.roundRect(-42, -106, 68, 6, 3).fill(0x2f353d)
  for (let i = 0; i < 6; i++) {
    vg.moveTo(-40 + i * 13, -105).lineTo(-40 + i * 13, -99)
  }
  vg.stroke({ width: 2, color: 0x8b93a0, alpha: 0.7 })
  // senapsflaska + ketchup på disken
  vg.roundRect(44, -116, 12, 21, 5).fill(0xffd35c)
  vg.moveTo(50, -118).lineTo(50, -124).stroke({ width: 3, color: 0xffd35c, cap: 'round' })
  vg.roundRect(60, -114, 12, 19, 5).fill(0xff6b6b)
  vg.moveTo(66, -116).lineTo(66, -121).stroke({ width: 3, color: 0xff6b6b, cap: 'round' })
  // stolpar upp till markisen (markisen sitter så högt att grillen syns under den)
  vg.roundRect(-80, -158, 6, 64, 3).fill(0x8b93a0)
  vg.roundRect(74, -158, 6, 64, 3).fill(0x8b93a0)
  vg.eventMode = 'none'
  vagn.addChild(vg)
  vagn.eventMode = 'none'
  k.addChild(vagn)

  const anga = new Graphics()
  anga.eventMode = 'none'
  vagn.addChild(anga)

  const ritaKorv = () => {
    const kg = new Graphics()
    kg.roundRect(-13, -5, 26, 10, 5).fill(0xc9714d)
    kg.roundRect(-9, -3.5, 14, 3, 1.5).fill({ color: 0xe89a72, alpha: 0.8 })
    kg.moveTo(-9, 1.5).quadraticCurveTo(-2, 4.5, 6, 1.5)
      .stroke({ width: 1.8, color: shade(0xc9714d, 0.3), alpha: 0.8, cap: 'round' })
    kg.eventMode = 'none'
    return kg
  }
  const korvar = []
  for (let i = 0; i < 3; i++) {
    const kg = ritaKorv()
    kg.position.set(-26 + i * 26, -113)
    vagn.addChild(kg)
    korvar.push({ g: kg, bx: -26 + i * 26, by: -113 })
  }

  const markis = new Container()
  const mg = new Graphics()
  for (let i = 0; i < 7; i++) {
    const x0 = -91 + i * 26
    mg.moveTo(x0, 0).lineTo(x0 + 26, 0).lineTo(x0 + 23, 24).lineTo(x0 + 3, 24)
      .closePath().fill(i % 2 ? gradd : rod)
  }
  for (let i = 0; i < 7; i++) {
    const cx = -78 + i * 26
    mg.ellipse(cx, 24, 12, 5.5).fill(i % 2 ? gradd : rod)
  }
  mg.roundRect(-94, -6, 188, 8, 4).fill(shade(rod, 0.25))
  mg.eventMode = 'none'
  markis.addChild(mg)
  markis.position.set(0, -158)
  markis.eventMode = 'none'
  k.addChild(markis)

  // skylt med en RITAD korv i bröd (aldrig en emoji)
  const skylt = new Graphics()
  skylt.roundRect(-34, -30, 68, 30, 8).fill(0xffd35c).stroke({ width: 3, color: shade(0xffd35c, 0.3) })
  skylt.moveTo(-6, -34).lineTo(6, -34).lineTo(0, -40).closePath().fill(shade(0xffd35c, 0.15))
  skylt.roundRect(-22, -20, 44, 12, 6).fill(0xe0b070) // bröd
  skylt.roundRect(-24, -18, 48, 7, 3.5).fill(0xd4a05e)
  skylt.roundRect(-20, -22, 40, 9, 4.5).fill(0xc9714d) // korv
  skylt.moveTo(-16, -20).quadraticCurveTo(-8, -14, 0, -20).quadraticCurveTo(8, -14, 16, -20)
    .stroke({ width: 2.6, color: 0xfff3d6, cap: 'round' }) // senapszickzack
  skylt.position.set(0, -158)
  skylt.eventMode = 'none'
  k.addChild(skylt)

  // korven som far upp i luften ligger ÖVERST — annars flyger den bakom markisen
  const flyg = ritaKorv()
  flyg.visible = false
  k.addChild(flyg)
  const fk = { i: -1, liv: 0, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0 }

  let markisNed = 0

  c._wxTick = (t, dt) => {
    if (c.destroyed) return
    const d = tickBas(c, dt)
    const p = c._wxRT
    let vy = Math.sin(c._wxT * 1.3) * 0.6
    let rot = Math.sin(c._wxT * 0.7) * 0.005
    let malMarkis = 0
    let angaStyrka = 0.42 + Math.sin(c._wxT * 1.1) * 0.1
    if (aktiv(c, 'drag')) {
      vy += -Math.abs(Math.sin(p * 8)) * 3.4 * avta(p, 0.7)
      angaStyrka = 0.8
    } else if (aktiv(c, 'klibb')) {
      malMarkis = p > 2.2 ? 0 : 1
      angaStyrka = 0.25
    } else if (aktiv(c, 'boll')) {
      vy += -Math.abs(Math.sin(p * 6.5)) * 7 * avta(p, 0.85)
      rot += Math.sin(p * 9) * 0.04 * avta(p, 0.9)
      angaStyrka = 0.9
    }
    vagn.position.set(0, vy)
    k.rotation = rot
    // vagnen rullar en aning när den skakar — hjulen är inte klistrade
    const hr = aktiv(c, 'boll') ? Math.sin(p * 9) * 0.3 * avta(p, 0.9)
      : aktiv(c, 'drag') ? Math.sin(p * 7) * 0.12 * avta(p, 0.8) : 0
    hjul[0].rotation = hr
    hjul[1].rotation = hr
    markisNed += (malMarkis - markisNed) * Math.min(1, d * 5)
    markis.scale.set(1, 1 + markisNed * 2.3)

    for (let i = 0; i < korvar.length; i++) {
      const kv = korvar[i]
      if (fk.i === i && fk.liv > 0) { kv.g.visible = false; continue }
      kv.g.visible = true
      let hopp = 0
      if (aktiv(c, 'boll')) hopp = -Math.abs(Math.sin(p * 7 - i * 0.7)) * 15 * avta(p, 0.95)
      else if (!aktiv(c, 'klibb')) hopp = Math.sin(c._wxT * 2.4 + i) * 0.7
      kv.g.position.set(kv.bx, kv.by + hopp)
      kv.g.rotation = Math.sin(c._wxT * 1.6 + i) * 0.05
    }

    if (!flyg.destroyed) {
      if (fk.liv > 0) {
        fk.liv -= d
        fk.vy += 900 * d
        fk.x += fk.vx * d
        fk.y += fk.vy * d
        fk.rot += fk.vr * d
        const golv = korvar[Math.max(0, fk.i)].by
        if (fk.y > golv && fk.vy > 0) { fk.y = golv; fk.vy *= -0.26; fk.vx *= 0.55; fk.vr *= 0.4 }
        flyg.visible = true
        flyg.position.set(fk.x, fk.y + vy)
        flyg.rotation = fk.rot
      } else {
        flyg.visible = false
      }
    }

    if (!anga.destroyed) {
      anga.clear()
      ritaAnga(anga, -8, -114, c._wxT * 0.6, clamp(angaStyrka, 0, 1), 15, 46)
    }
  }

  c._wxReagera = (nat) => {
    if (nat === 'drag') {
      sattNat(c, nat, 2.0)
      const i = (Math.random() * korvar.length) | 0
      fk.i = i
      fk.liv = 1.7
      fk.x = korvar[i].bx
      fk.y = korvar[i].by
      fk.vx = rnd(-26, 26)
      // 420 px/s -> ~95 px topphöjd = precis över skylten, syns i 0,9 s
      fk.vy = rnd(-440, -390)
      fk.rot = 0
      fk.vr = rnd(-9, 9)
      return 'korv'
    }
    if (nat === 'klibb') { sattNat(c, nat, 3.4); return 'markis' }
    sattNat(c, 'boll', 1.8)
    return 'grill'
  }
  return c
}

// ---- 11. CYKEL (min egen elfte — hör hemma på varje svensk gata) ------------
// drag -> ringklockan ringer och framhjulet snurrar
// klibb -> nätet landar i korgen, cykeln lutar och vaggar
// boll -> studsar på sadeln, båda hjulen snurrar och cykeln hoppar
function gatu_ritaCykel() {
  const c = nyGatusak(150, 100, -50)
  const k = c._wxKropp
  const RAM = [0x4aa3df, 0xff6b6b, 0x5bbf6a, 0xa78bfa, 0xff8a3d]
  const ram = RAM[(Math.random() * RAM.length) | 0]
  const g = new Graphics()
  g.ellipse(0, -4, 58, 8).fill({ color: GATU_SKUGGA, alpha: 0.15 })
  g.moveTo(-16, -28).lineTo(-26, -3).stroke({ width: 4, color: 0x8b93a0, cap: 'round' }) // stöd
  g.eventMode = 'none'
  k.addChild(g)

  const hjul = []
  for (const hx of [-46, 46]) {
    const hg = new Graphics()
    hg.circle(0, 0, 27).stroke({ width: 5, color: 0x3a3f47 })
    hg.circle(0, 0, 22).stroke({ width: 2.4, color: 0xc9ced6 })
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI
      hg.moveTo(Math.cos(a) * 22, Math.sin(a) * 22).lineTo(-Math.cos(a) * 22, -Math.sin(a) * 22)
    }
    hg.stroke({ width: 1.6, color: 0xc9ced6, alpha: 0.9 })
    hg.circle(0, 0, 4.5).fill(0x8b93a0)
    hg.position.set(hx, -29)
    hg.eventMode = 'none'
    k.addChild(hg)
    hjul.push(hg)
  }

  const cykel = new Container()
  const cg = new Graphics()
  cg.moveTo(-46, -29).lineTo(-8, -29).stroke({ width: 6, color: ram, cap: 'round' })
  cg.moveTo(-8, -29).lineTo(-17, -64).stroke({ width: 6, color: ram, cap: 'round' })
  cg.moveTo(-17, -64).lineTo(-46, -29).stroke({ width: 5, color: ram, cap: 'round' })
  cg.moveTo(-17, -64).lineTo(26, -60).stroke({ width: 6, color: ram, cap: 'round' })
  cg.moveTo(26, -60).lineTo(-8, -29).stroke({ width: 6, color: ram, cap: 'round' })
  cg.moveTo(26, -60).lineTo(46, -29).stroke({ width: 5, color: shade(ram, 0.18), cap: 'round' })
  cg.moveTo(26, -60).lineTo(29, -78).stroke({ width: 5, color: shade(ram, 0.18), cap: 'round' })
  cg.moveTo(17, -80).quadraticCurveTo(29, -84, 41, -76)
    .stroke({ width: 5, color: 0x3a3f47, cap: 'round' }) // styre
  cg.circle(17, -80, 4).fill(0x2f353d)
  cg.circle(41, -76, 4).fill(0x2f353d)
  cg.ellipse(-19, -68, 15, 5).fill(0x3a3f47) // sadel
  cg.moveTo(-6, -70).lineTo(-19, -73).lineTo(-19, -63).closePath().fill(0x3a3f47)
  cg.circle(-8, -29, 8).fill(0x8b93a0) // vev
  cg.moveTo(-8, -29).lineTo(0, -20).stroke({ width: 3.4, color: 0x6f7783, cap: 'round' })
  cg.roundRect(-2, -22, 10, 4, 2).fill(0x3a3f47) // pedal
  // korg fram
  cg.moveTo(33, -80).lineTo(63, -80).lineTo(58, -54).lineTo(38, -54).closePath().fill(0xd9b98a)
  cg.moveTo(33, -80).lineTo(63, -80).lineTo(58, -54).lineTo(38, -54).closePath()
    .stroke({ width: 2.4, color: 0xb99a6a })
  cg.moveTo(35, -72).lineTo(61, -72).moveTo(36, -64).lineTo(60, -64)
    .stroke({ width: 2, color: 0xb99a6a, alpha: 0.9 })
  cg.moveTo(43, -80).lineTo(43, -54).moveTo(53, -80).lineTo(53, -54)
    .stroke({ width: 1.8, color: 0xb99a6a, alpha: 0.7 })
  // två blommor som sticker upp ur korgen
  cg.moveTo(44, -80).quadraticCurveTo(42, -90, 40, -96).stroke({ width: 2.6, color: 0x4f9e42, cap: 'round' })
  cg.moveTo(54, -80).quadraticCurveTo(57, -88, 58, -93).stroke({ width: 2.6, color: 0x4f9e42, cap: 'round' })
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    cg.circle(40 + Math.cos(a) * 5.5, -99 + Math.sin(a) * 5.5, 4.2).fill(0xff9ec4)
    cg.circle(58 + Math.cos(a) * 5, -96 + Math.sin(a) * 5, 3.8).fill(0xffd35c)
  }
  cg.circle(40, -99, 3).fill(0xffd35c)
  cg.circle(58, -96, 2.8).fill(0xff8a3d)
  cg.eventMode = 'none'
  cykel.addChild(cg)

  const klocka = new Container()
  const klg = new Graphics()
  klg.circle(0, 0, 7).fill(0xd8d3c8)
  klg.circle(-2, -2, 2.6).fill({ color: 0xffffff, alpha: 0.7 })
  klg.roundRect(-8, 3, 16, 4, 2).fill(0x8b93a0)
  klg.eventMode = 'none'
  klocka.addChild(klg)
  klocka.position.set(24, -83)
  klocka.eventMode = 'none'
  cykel.addChild(klocka)

  cykel.pivot.set(0, 0)
  cykel.eventMode = 'none'
  k.addChild(cykel)

  const ring = new Graphics()
  ring.eventMode = 'none'
  c.addChild(ring)

  let snurrF = 0
  let snurrB = 0

  c._wxTick = (t, dt) => {
    if (c.destroyed) return
    const d = tickBas(c, dt)
    const p = c._wxRT
    let rot = Math.sin(c._wxT * 1.2) * 0.008
    let ky = 0
    let malF = 0
    let malB = 0
    if (aktiv(c, 'drag')) {
      malF = 13 * avta(p, 0.8)
      rot += Math.sin(p * 16) * 0.02 * avta(p, 0.5)
      klocka.rotation = Math.sin(p * 34) * 0.5 * avta(p, 0.4)
      klocka.scale.set(1 + Math.sin(p * 30) * 0.12 * avta(p, 0.4))
    } else {
      klocka.rotation += (0 - klocka.rotation) * Math.min(1, d * 8)
      klocka.scale.set(1)
    }
    if (aktiv(c, 'klibb')) {
      rot += 0.11 * (1 - avta(p, 0.3)) * avta(p, 2.4)
      rot += Math.sin(p * 7) * 0.03 * avta(p, 1.5)
    }
    if (aktiv(c, 'boll')) {
      ky = -Math.abs(Math.sin(p * 6)) * 12 * avta(p, 0.95)
      rot += Math.sin(p * 9) * 0.065 * avta(p, 0.9)
      malF = 11 * avta(p, 0.9)
      malB = 9 * avta(p, 0.9)
    }
    snurrF += (malF - snurrF) * Math.min(1, d * 6)
    snurrB += (malB - snurrB) * Math.min(1, d * 6)
    hjul[1].rotation += snurrF * d
    hjul[0].rotation += snurrB * d
    k.position.set(0, ky)
    k.rotation = rot

    if (!ring.destroyed) {
      ring.clear()
      if (aktiv(c, 'drag')) {
        for (let i = 0; i < 3; i++) {
          const u = p * 1.15 - i * 0.2
          if (u < 0 || u > 1) continue
          bage(ring, 24, -83 + ky, 14 + u * 32, -Math.PI * 0.95, -Math.PI * 0.05, 12)
          ring.stroke({ width: 4.4 * (1 - u), color: 0xffffff, alpha: (1 - u) * 0.95, cap: 'round' })
        }
      }
    }
  }

  c._wxReagera = (nat) => {
    if (nat === 'drag') { sattNat(c, nat, 2.0); return 'ringklocka' }
    if (nat === 'klibb') { sattNat(c, nat, 2.6); return 'korg' }
    sattNat(c, 'boll', 1.8)
    return 'sadelstuds'
  }
  return c
}

// ---- Tabellen ---------------------------------------------------------------
// fot: 'trottoar' står på SIDEWALK_TOP..SIDEWALK_BOT · 'vagg' sitter på husväggen
//      (dörrens fot är husets sockel, dvs SIDEWALK_TOP) · 'mark' ligger i gatan.
// traffR är ALLTID >= 48 (P0: 96 px träffdiameter) även för visuellt smala saker
// (lyktstolpen och trafikljuset är 10 px breda pinnar men har traffR 62).
// bredd/hojd är MÄTTA med scripts/_gatubild.mjs (getLocalBounds i vila), inte gissade.
const GATUSAKER = [
  { id: 'brandpost', fot: 'trottoar', bredd: 64, hojd: 100, traffR: 60, rita: () => ritaBrandpost() },
  { id: 'brevlada', fot: 'trottoar', bredd: 64, hojd: 112, traffR: 60, rita: () => ritaBrevlada() },
  { id: 'dorr', fot: 'vagg', bredd: 92, hojd: 136, traffR: 66, rita: () => ritaDorr() },
  { id: 'appeltrad', fot: 'trottoar', bredd: 158, hojd: 232, traffR: 80, rita: () => ritaAppeltrad() },
  { id: 'gatulock', fot: 'mark', bredd: 78, hojd: 32, traffR: 54, rita: () => ritaGatulock() },
  { id: 'blommor', fot: 'trottoar', bredd: 80, hojd: 84, traffR: 54, rita: () => ritaBlommor() },
  // lyktstolpen hänger 56 px åt VÄNSTER om foten (armen) — bredden är asymmetrisk
  { id: 'lyktstolpe', fot: 'trottoar', bredd: 84, hojd: 226, traffR: 62, rita: () => ritaLyktstolpe() },
  { id: 'trafikljus', fot: 'trottoar', bredd: 54, hojd: 224, traffR: 62, rita: () => ritaTrafikljus() },
  // bilen står vid kantstenen — den ser bäst ut med foten nära SIDEWALK_BOT
  { id: 'bil', fot: 'trottoar', bredd: 236, hojd: 130, traffR: 80, rita: () => ritaBil() },
  { id: 'korvstand', fot: 'trottoar', bredd: 190, hojd: 204, traffR: 78, rita: () => ritaKorvstand() },
  { id: 'cykel', fot: 'trottoar', bredd: 152, hojd: 112, traffR: 62, rita: () => gatu_ritaCykel() },
]

export default {
  id: 'natskott-pa-stan',
  titleSv: 'Nätskott på stan',
  icon: '🚙',
  category: 'fysik',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'natskott-pa-stan',
  voiceIntro: 'Tryck där du vill skjuta nätet!',

  // ------------------------------------------------------------------ livscykel
  init(ctx) {
    if (import.meta.env?.DEV) {
      window.__natdbg = this // sond-handtag (bara dev-bygget)
      // handvarianterna exponeras så scripts/_handval.mjs kan ställa dem sida vid sida
      window.__nathander = { front: ritaHandFram, sida: ritaHandSida, bak: ritaHandBak, typer: NAT_TYPER }
    }
    this._alive = true
    this._t = 0
    this._idle = 0
    this._phase = 'drive' // 'drive' | 'arrive'
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._scrollBase = 2.1 + Math.min(1.0, this._level * 0.12)
    this._scroll = this._scrollBase
    this._journey = 0
    this._biomeFlip = this._level % 2 === 1
    this._mode = 'drag' // 'klibb' | 'drag'
    this._everToggled = false
    this._targets = []
    this._shots = []
    this._balls = []
    this._props = []
    this._far = []
    this._mid = []
    this._brokenCount = 0
    this._seatList = [] // insamlade vänner ({kind, art}) — huvuden i baksätet
    this._seatHeads = []
    this._outFriends = []
    this._skata = null
    this._thief = null
    this._tws = [] // proxy-tweens som dödas i destroy
    this._spawnTimer = 1.0
    this._gustTimer = 11
    this._skataTimer = 16
    this._heistTimer = 14
    this._propTimer = 2.2
    this._lastTjuvSaid = -99
    this._paketSinceGold = 0
    this._lastRutaSaid = -99
    this._lastBytSaid = -99
    this._missionActive = false
    this._missionsDone = 0
    this._missionOrder = shuffle(['katt', 'paket', 'ballong'])
    this._armAim = 0
    this._recoil = 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._buildSky(ctx)
    this._buildStreetBase()

    this._farLayer = new Container()
    this._farLayer.eventMode = 'none'
    this._farLayer.interactiveChildren = false
    this._root.addChild(this._farLayer)

    this._midLayer = new Container()
    this._midLayer.eventMode = 'none'
    this._midLayer.interactiveChildren = false
    this._root.addChild(this._midLayer)

    // Statisk trottoar + dynamiska skarvar/vägkant (ritas om varje bildruta).
    this._buildGround()

    // Gatusakerna ligger mellan husen och målen: de scrollar i gatans fart
    // (inte parallaxens) och ska skymmas av djur som går framför dem.
    this._propLayer = new Container()
    this._propLayer.eventMode = 'none'
    this._propLayer.interactiveChildren = false
    this._root.addChild(this._propLayer)

    this._targetLayer = new Container()
    this._targetLayer.eventMode = 'none'
    this._targetLayer.interactiveChildren = false
    this._root.addChild(this._targetLayer)

    this._skataLayer = new Container()
    this._skataLayer.eventMode = 'none'
    this._skataLayer.interactiveChildren = false
    this._root.addChild(this._skataLayer)

    // Nät-grafik (skott + rep) ovanpå målen.
    this._netG = new Graphics()
    this._netG.eventMode = 'none'
    this._root.addChild(this._netG)

    this._buildCar(ctx)
    this._buildArm()
    this._buildHands(ctx)
    this._buildMissionPanel()

    // Tryckyta över allt spelbart (UI-knapparna ligger ovanpå och vinner).
    this._surface = new Graphics().rect(-BLEED_X, -BLEED_Y, ctx.width + 2 * BLEED_X, ctx.height + 2 * BLEED_Y).fill({ color: 0xffffff, alpha: 0.001 })
    this._surface.eventMode = 'static'
    this._surface.hitArea = new Rectangle(0, 0, ctx.width, ctx.height)
    this._onTapH = (e) => this._onTap(ctx, e)
    this._surface.on('pointertap', this._onTapH)
    this._root.addChildAt(this._surface, this._root.getChildIndex(this._sidoHander[0]))

    // Fysik: sidovy med gravitation + eget mark-golv (trottoaren). Inga standardväggar.
    this._phys = new PhysicsWorld({ gravityY: 1.15, walls: [] })
    this._phys.rectangle(640, GROUND + 46, 4400, 92, { isStatic: true, friction: 0.9, restitution: 0.18, label: 'mark' })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // Sådd: kuliss över hela bredden + några mål direkt (scenen ska leva från ruta 1).
    this._seedLayers(ctx)
    for (const x of [420, 760, 1120]) this._spawnProp(ctx, x)
    this._spawnTarget(ctx, 'katt', 840)
    this._spawnTarget(ctx, 'paket', 1080)
    this._spawnTarget(ctx, 'ballong', 1190)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
    if (this._arm && !this._arm.destroyed) pop(this._arm, { scale: 1.05 })
    // Första uppdraget efter en stunds fri lek.
    ctx.later(4.6, () => this._announce(ctx))
  },

  // ------------------------------------------------------------------ kuliss
  _buildSky(ctx) {
    const g = new Graphics()
    const top = 0x8ecdf0
    const bot = 0xdff2fb
    // Full bleed: banden breddas ±BLEED_X och en toppremsa täcker ovanför y=0 på
    // höga skärmar (4:3-platta). 16:9-bilden är pixelidentisk.
    g.rect(-BLEED_X, -BLEED_Y, ctx.width + 2 * BLEED_X, BLEED_Y).fill(top)
    // Himlen ritades tidigare som ATTA handrullade band a 60 px. Varje band var da
    // 1280x62 ≈ 79 000 px i EN exakt ton, och det gjorde himlen till spelets storsta
    // platta falt (71 095 px, `_plattprobe --medbakgrund`) trots att den REDAN var tankt
    // som en toning — 8 steg ar bara for grovt. En cachad `verticalFill` ger samma
    // fargresa mjukt, i en ritinstruktion i stallet for atta.
    g.rect(-BLEED_X, 0, ctx.width + 2 * BLEED_X, 482).fill(verticalFill(top, bot))
    // sol med strålar
    g.circle(985, 108, 42).fill(0xffe28a)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      g.moveTo(985 + Math.cos(a) * 52, 108 + Math.sin(a) * 52)
        .lineTo(985 + Math.cos(a) * 66, 108 + Math.sin(a) * 66)
    }
    g.stroke({ width: 5, color: 0xffe28a, alpha: 0.7 })
    g.eventMode = 'none'
    this._root.addChild(g)
    // två drivande moln (ritas, driver långsamt i tick)
    this._clouds = []
    for (const [cx, cy, s] of [[300, 90, 1], [760, 150, 0.7]]) {
      const m = new Graphics()
      m.circle(-34, 4, 24).fill(0xffffff)
      m.circle(0, -8, 30).fill(0xffffff)
      m.circle(34, 4, 25).fill(0xffffff)
      m.roundRect(-52, 0, 104, 26, 13).fill(0xffffff)
      m.alpha = 0.85
      m.scale.set(s)
      m.position.set(cx, cy)
      m.eventMode = 'none'
      this._root.addChild(m)
      this._clouds.push(m)
    }
    // varm förorts-ton som tonas in med resan
    this._biomeTint = new Graphics().rect(-BLEED_X, -BLEED_Y, ctx.width + 2 * BLEED_X, SIDEWALK_BOT + BLEED_Y).fill(0xffd9a0)
    this._biomeTint.alpha = 0
    this._biomeTint.eventMode = 'none'
  },

  _buildStreetBase() {
    // Avlägset gatuband bakom mellanlagret (syns i gluggarna mellan husen).
    const g = new Graphics()
    g.rect(-BLEED_X, STREET_TOP, 1280 + 2 * BLEED_X, SIDEWALK_TOP - STREET_TOP).fill(0xa8bcc2)
    g.rect(-BLEED_X, STREET_TOP, 1280 + 2 * BLEED_X, 10).fill({ color: 0x8ba3aa, alpha: 0.7 })
    for (let x = 30 - 2 * 160; x < 1280 + BLEED_X; x += 160) {
      g.ellipse(x, STREET_TOP + 46, 34, 16).fill({ color: 0x7fae84, alpha: 0.45 }) // häckar (samma 160-rutnät, bara fler)
    }
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  _buildGround() {
    const g = new Graphics()
    g.rect(-BLEED_X, SIDEWALK_TOP, 1280 + 2 * BLEED_X, SIDEWALK_BOT - SIDEWALK_TOP).fill(0xd8d3c8) // trottoar
    g.rect(-BLEED_X, SIDEWALK_TOP, 1280 + 2 * BLEED_X, 5).fill({ color: 0xffffff, alpha: 0.35 })
    g.rect(-BLEED_X, SIDEWALK_BOT, 1280 + 2 * BLEED_X, NEAR_BOT - SIDEWALK_BOT + BLEED_Y).fill(0x565d66) // vägkant/asfalt (+bleed nedåt)
    g.rect(-BLEED_X, SIDEWALK_BOT, 1280 + 2 * BLEED_X, 7).fill(0x9aa1a8) // kantsten
    g.eventMode = 'none'
    this._root.addChild(g)
    this._root.addChild(this._biomeTint)
    // dynamiska skarvar + fartstreck (ritas om i tick)
    this._groundG = new Graphics()
    this._groundG.eventMode = 'none'
    this._root.addChild(this._groundG)
  },

  _biomeT() {
    const t = clamp(this._journey / 6200, 0, 1)
    return this._biomeFlip ? 1 - t : t
  },

  _seedLayers(ctx) {
    // Sådd och återfyllnad täcker bleed-zonen (±BLEED_X): på en bred telefon syns
    // designkoordinater ner till ca −163, så ett lager som börjar på −60 lämnar
    // en glugg i vänsterkanten tills scrollen hunnit dit.
    let x = -60 - BLEED_X
    while (x < 1500 + BLEED_X) {
      const s = this._mkFarSeg(this._biomeT())
      s.c.x = x
      this._farLayer.addChild(s.c)
      this._far.push(s)
      x += s.w
    }
    x = -80 - BLEED_X
    while (x < 1560 + BLEED_X) {
      const s = this._mkMidSeg(ctx, this._biomeT(), x < 1200)
      s.c.x = x
      this._midLayer.addChild(s.c)
      this._mid.push(s)
      if (s._wxPotAt) this._spawnPotAt(ctx, s)
      x += s.w
    }
  },

  _mkFarSeg(bt) {
    const c = new Container()
    c.eventMode = 'none'
    const g = new Graphics()
    const w = rnd(240, 340)
    const col = lerpColor(0x7d8aa5, 0x8fbe8f, clamp(bt + rnd(-0.12, 0.12), 0, 1))
    if (Math.random() > bt) {
      // stadssiluett: kantiga hus i olika höjd + antenn
      let bx = 0
      while (bx < w - 60) {
        const bw = rnd(60, 110)
        const bh = rnd(150, 270)
        g.rect(bx, FAR_BASE - bh, bw, bh).fill(col)
        if (Math.random() < 0.4) g.rect(bx + bw * 0.3, FAR_BASE - bh - 18, 4, 18).fill(col)
        for (let wy = FAR_BASE - bh + 22; wy < FAR_BASE - 30; wy += 34) {
          g.rect(bx + 12, wy, 10, 12).fill({ color: 0xfff3d6, alpha: 0.35 })
          if (bw > 80) g.rect(bx + bw - 24, wy, 10, 12).fill({ color: 0xfff3d6, alpha: 0.35 })
        }
        bx += bw + rnd(4, 18)
      }
    } else {
      // förort: kulle + träd + liten stuga
      g.ellipse(w * 0.5, FAR_BASE + 24, w * 0.62, 64).fill(col)
      for (let i = 0; i < 3; i++) {
        const tx = rnd(30, w - 30)
        g.rect(tx - 3, FAR_BASE - 46, 6, 26).fill(shade(col, 0.3))
        g.circle(tx, FAR_BASE - 56, 20).fill(tint(col, 0.1))
      }
      const hx = rnd(40, w - 80)
      g.rect(hx, FAR_BASE - 52, 54, 34).fill(shade(col, 0.12))
      g.moveTo(hx - 6, FAR_BASE - 52).lineTo(hx + 27, FAR_BASE - 76).lineTo(hx + 60, FAR_BASE - 52).closePath().fill(shade(col, 0.24))
    }
    g.eventMode = 'none'
    c.addChild(g)
    return { c, w }
  },

  // Mellanlagrets hus (med krossbara fönster). Returnerar segment-rec.
  _mkMidSeg(ctx, bt, seeded = false) {
    const c = new Container()
    c.eventMode = 'none'
    const g = new Graphics()
    const gap = rnd(36, 110)
    const wins = []
    let bw
    let seg_butik = null
    // ~1 av 3 hus är en BUTIK (oberoende av biom-mixen: affärsgatan hör hemma
    // både i stan och i förorten, och den bryter monotonin i den långa mitten)
    if (Math.random() < 0.34) {
      const hus = ritaHus(g, gap, null, { c })
      bw = hus.bw
      for (const f of hus.fonster) wins.push(this._mkWindow(c, f.lx, f.cy, f.w, f.h, f.frame))
      seg_butik = hus.id
    } else if (Math.random() > bt) {
      bw = rnd(190, 250)
      const bh = rnd(285, 370)
      const wall = CITY_WALLS[(Math.random() * CITY_WALLS.length) | 0]
      const topY = SIDEWALK_TOP - bh
      // Hyreshusen delade EN platt ton per vaggfarg: `CITY_WALLS[0]` ensam lag pa 105 360
      // px (`_plattprobe --medbakgrund`), storsta faltet i spelet. En fasad ar ett foremal
      // belyst uppifran, sa `topLightFill` — och den cachar per farg, sa ALLA hus med samma
      // vaggton kostar en gradient, inte en per hus.
      g.rect(gap, topY, bw, bh).fill(topLightFill(wall, { highlight: 0.12, dark: 0.2 })).stroke({ width: 3, color: shade(wall, 0.25) })
      g.rect(gap - 6, topY - 12, bw + 12, 14).fill(shade(wall, 0.2)) // taklist
      g.rect(gap, SIDEWALK_TOP - 26, bw, 26).fill(shade(wall, 0.14)) // sockel
      // dörr
      g.roundRect(gap + bw / 2 - 26, SIDEWALK_TOP - 88, 52, 88, 6).fill(shade(wall, 0.35))
      g.circle(gap + bw / 2 + 14, SIDEWALK_TOP - 44, 4).fill(0xffd35c)
      // fönster-rutnät
      const cols = bw > 220 ? 3 : 2
      const rows = 3
      for (let cx = 0; cx < cols; cx++) {
        for (let ry = 0; ry < rows; ry++) {
          const wx = gap + bw * ((cx + 1) / (cols + 1))
          const wy = topY + 56 + ry * 78
          if (wy > SIDEWALK_TOP - 130) continue
          wins.push(this._mkWindow(c, wx, wy, 46, 56, shade(wall, 0.3)))
        }
      }
    } else {
      bw = rnd(210, 270)
      const bh = rnd(175, 235)
      const wall = SUBURB_WALLS[(Math.random() * SUBURB_WALLS.length) | 0]
      const topY = SIDEWALK_TOP - bh
      g.rect(gap, topY, bw, bh).fill(topLightFill(wall, { highlight: 0.12, dark: 0.2 })).stroke({ width: 3, color: shade(wall, 0.22) })
      // sadeltak med överhäng
      g.moveTo(gap - 16, topY).lineTo(gap + bw / 2, topY - 62).lineTo(gap + bw + 16, topY).closePath().fill(0xc0574f)
      g.rect(gap + bw * 0.68, topY - 44, 18, 40).fill(0x8a5a3b) // skorsten
      // dörr + trappsteg
      g.roundRect(gap + bw * 0.62, SIDEWALK_TOP - 82, 48, 82, 6).fill(0x8a5a3b)
      g.circle(gap + bw * 0.62 + 38, SIDEWALK_TOP - 42, 4).fill(0xffd35c)
      g.rect(gap + bw * 0.62 - 6, SIDEWALK_TOP - 8, 60, 8).fill(shade(wall, 0.3))
      // buske + staket-bit
      g.circle(gap + bw + 14, SIDEWALK_TOP - 14, 16).fill(0x7fae84)
      g.circle(gap - 18, SIDEWALK_TOP - 12, 13).fill(0x8fbe8f)
      wins.push(this._mkWindow(c, gap + bw * 0.24, topY + 66, 52, 56, 0xfffdf7))
      if (bw > 240) wins.push(this._mkWindow(c, gap + bw * 0.45, topY + 66, 52, 56, 0xfffdf7))
    }
    g.eventMode = 'none'
    c.addChildAt(g, 0)
    const w = gap + bw + rnd(10, 30)
    const seg = { c, w, wins, butik: seg_butik }
    // Ibland en blomkruka i ett fönsterbleck (riktig fysik-målkropp som följer huset).
    if (!seeded && ctx && this._targets.length < MAX_TARGETS && wins.length && Math.random() < 0.4 && this._phase === 'drive') {
      const win = wins[(Math.random() * wins.length) | 0]
      seg._wxPotAt = win // kopplas när segmentet fått sin slut-x (se _recycle)
    }
    return seg
  },

  // Ett fönster = egen liten Graphics (kan ritas om till kross/helt). cy är absolut.
  _mkWindow(parent, lx, cy, w, h, frame) {
    const g = new Graphics()
    g.position.set(lx, cy)
    g.eventMode = 'none'
    parent.addChild(g)
    const win = { g, lx, cy, w, h, frame, state: 'ok', brokenAt: 0, mc: null, seed: Math.random() * 9 }
    this._drawWindow(win)
    return win
  },

  _drawWindow(win) {
    const { g, w, h, frame } = win
    if (!g || g.destroyed) return
    g.clear()
    g.roundRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 4).fill(frame)
    if (win.state === 'ok') {
      g.roundRect(-w / 2, -h / 2, w, h, 3).fill(0xbfe4f2)
      g.moveTo(0, -h / 2).lineTo(0, h / 2).moveTo(-w / 2, 0).lineTo(w / 2, 0).stroke({ width: 3, color: frame })
      g.moveTo(-w * 0.34, h * 0.3).lineTo(w * 0.1, -h * 0.42).stroke({ width: 5, color: 0xffffff, alpha: 0.4 })
    } else {
      // krossad: mörkt hål + tecknade skärvor längs kanten
      g.roundRect(-w / 2, -h / 2, w, h, 3).fill(0x2e2632)
      const sh = [[-w / 2, -h / 2, 0.4], [w / 2, -h / 2, -0.4], [-w / 2, h / 2, 0.3], [w / 2, h / 2, -0.3], [0, -h / 2, 0.1], [0, h / 2, -0.1]]
      for (const [sx, sy, d] of sh) {
        g.moveTo(sx, sy).lineTo(sx * 0.55 + d * 14, sy * 0.5).lineTo(sx * 0.72, sy * 0.78).closePath().fill(0xd8f0fa)
      }
      g.circle(-w * 0.2, h * 0.18, 2).fill(0xfff3b0)
      g.circle(w * 0.16, -h * 0.14, 2).fill(0xfff3b0)
    }
    // fönsterbleck
    g.roundRect(-w / 2 - 9, h / 2 + 4, w + 18, 8, 3).fill(shade(frame, 0.18))
  },

  // ------------------------------------------------------------------ bil + arm
  _buildCar(ctx) {
    // BAKSÄTET först, DÖRRKANTEN sist. Ritordningen är hela skillnaden: ligger
    // sätet ovanpå bilen ser det ut som en soffa parkerad på trottoaren (mätt i
    // skärmdumpen). Bakom dörrkanten läser samma former som en bilinteriör.
    const back = new Graphics()
    back.roundRect(1000, 546, 300, 190, 24).fill(0x6d4238) // innerpanel
    back.roundRect(1000, 546, 300, 24, 12).fill({ color: 0x8a5a4c, alpha: 0.9 })
    back.roundRect(1012, 574, 276, 8, 4).fill({ color: 0x4d2e27, alpha: 0.55 })
    // två nackstöd
    back.roundRect(1040, 554, 80, 44, 20).fill(0x8a5548).stroke({ width: 3, color: 0x5e382e })
    back.roundRect(1168, 554, 80, 44, 20).fill(0x8a5548).stroke({ width: 3, color: 0x5e382e })
    back.roundRect(1054, 563, 52, 12, 6).fill({ color: 0xa3695a, alpha: 0.75 })
    back.roundRect(1182, 563, 52, 12, 6).fill({ color: 0xa3695a, alpha: 0.75 })
    // ryggstöd med lodräta sömmar
    back.roundRect(1014, 586, 268, 118, 22).fill(0x7a4a3d).stroke({ width: 3, color: 0x5e382e })
    back.moveTo(1104, 598).lineTo(1104, 698).moveTo(1194, 598).lineTo(1194, 698)
      .stroke({ width: 4, color: 0x5e382e, alpha: 0.7 })
    // bälten
    back.moveTo(1044, 592).lineTo(1086, 700).stroke({ width: 10, color: 0x3d3a45 })
    back.moveTo(1252, 592).lineTo(1212, 700).stroke({ width: 10, color: 0x3d3a45 })
    back.roundRect(1078, 664, 22, 30, 6).fill(0x9aa3b5).stroke({ width: 2.4, color: 0x6d7688 })
    back.roundRect(1198, 664, 22, 30, 6).fill(0x9aa3b5).stroke({ width: 2.4, color: 0x6d7688 })
    back.eventMode = 'none'
    this._root.addChild(back)
    this._friendLayer = new Container()
    this._friendLayer.eventMode = 'none'
    this._friendLayer.interactiveChildren = false
    this._root.addChild(this._friendLayer)
    // sittdyna + dörrkort (underdelen göms strax av dörrkanten)
    const front = new Graphics()
    front.roundRect(994, 686, 300, 60, 26).fill(0x8a5548).stroke({ width: 3, color: 0x5e382e })
    front.roundRect(994, 686, 300, 16, 8).fill({ color: 0xa3695a, alpha: 0.9 })
    front.roundRect(1270, 570, 44, 150, 16).fill(0x8f2f2c) // dörrkort
    front.roundRect(1258, 632, 62, 22, 11).fill(0xb04a44) // armstöd
    front.circle(1292, 598, 7).fill(0xd7dbe2) // låsknapp
    front.eventMode = 'none'
    this._root.addChild(front)

    // Antydd dörrkant/fönsterkarm nertill (P0-beslut 6: smal ram, gatan får ytan).
    const g = new Graphics()
    g.rect(0, CAR_TOP - 10, ctx.width, 10).fill({ color: 0x33291f, alpha: 0.55 }) // gummilist
    g.roundRect(-20, CAR_TOP, ctx.width + 40, 90, 18).fill(0xd2554f)
    g.rect(0, CAR_TOP + 6, ctx.width, 8).fill({ color: 0xffffff, alpha: 0.28 }) // glansremsa
    g.rect(0, CAR_TOP + 46, ctx.width, 5).fill({ color: 0x8f2f2c, alpha: 0.8 }) // karosslinje
    g.eventMode = 'none'
    this._root.addChild(g)
  },

  // Aktiv hand: armen mitt i bild. Ritas om när barnet byter hand.
  _buildArm() {
    const c = new Container()
    c.eventMode = 'none'
    c.position.set(ARM_PIVOT.x, ARM_PIVOT.y)
    this._arm = c
    this._root.addChild(c)
    this._ritaArm()
  },

  _ritaArm() {
    const c = this._arm
    if (!c || c.destroyed) return
    c.removeChildren().forEach((o) => o.destroy({ children: true }))
    c.addChild(ritaNathand(natTyp(this._mode)))
  },

  _handPos() {
    const a = this._arm.rotation
    return { x: this._arm.x + Math.sin(a) * HAND_LEN, y: this._arm.y - Math.cos(a) * HAND_LEN }
  },

  // ------------------------------------------------------------------ växelknapp
  // ------------------------------------------------------- de tre händerna
  // Ingen knapp med en etikett: de två händer som INTE är framme ligger och
  // väntar nere i vardera hörnet. Trycker barnet på en av dem byter den plats
  // med handen i mitten. Tre händer, en aktiv, två väntande — och eftersom alla
  // tre har samma pose är det FÄRGEN som är språket.
  _buildHands(ctx) {
    this._vantar = NAT_TYPER.filter((n) => n.id !== this._mode).map((n) => n.id)
    this._sidoHander = []
    this._sidoTaps = []
    for (let slot = 0; slot < 2; slot++) {
      const c = new Container()
      c.position.set(slot === 0 ? SIDO_X[0] : SIDO_X[1], SIDO_Y)
      c.scale.set(SIDO_SKALA)
      // P0 TRÄFFYTA räknas i SKÄRMPIXLAR, inte i lokala tal: containern har redan
      // scale = SIDO_SKALA, så rutan krymps med den. 236×320 lokalt blev 118×160
      // på skärmen — godkänt men bara 22 px marginal, och kommentaren påstod
      // "långt över". Nu 260×360 lokalt = 130×180 skärmpixlar.
      c.hitArea = new Rectangle(-130, -340, 260, 360)
      // mjuk platta bakom handen: höger hörn ligger mot baksätets täta textur och
      // behöver egen kontrast (vänster har ren gata bakom sig)
      const platta = new Graphics()
      platta.ellipse(0, -132, 104, 150).fill({ color: 0x1d2430, alpha: 0.16 })
      platta.ellipse(0, -132, 82, 126).fill({ color: 0x1d2430, alpha: 0.12 })
      platta.eventMode = 'none'
      c.addChild(platta)
      c.eventMode = 'static'
      c.cursor = 'pointer'
      const ned = () => gsap.to(c.scale, { x: SIDO_SKALA * 0.9, y: SIDO_SKALA * 0.9, duration: 0.08, ease: 'power2.out' })
      const upp = () => gsap.to(c.scale, { x: SIDO_SKALA, y: SIDO_SKALA, duration: 0.28, ease: 'back.out(3)' })
      const tap = () => this._bytHand(ctx, slot)
      c.on('pointerdown', ned)
      c.on('pointerup', upp)
      c.on('pointerupoutside', upp)
      c.on('pointertap', tap)
      this._sidoTaps.push({ c, ned, upp, tap })
      this._sidoHander.push(c)
      this._root.addChild(c)
    }
    this._ritaVantande()
  },

  _ritaVantande() {
    for (let slot = 0; slot < 2; slot++) {
      const c = this._sidoHander[slot]
      if (!c || c.destroyed) continue
      c.removeChildren().forEach((o) => o.destroy({ children: true }))
      const platta = new Graphics()
      platta.ellipse(0, -132, 104, 150).fill({ color: 0x1d2430, alpha: 0.16 })
      platta.ellipse(0, -132, 82, 126).fill({ color: 0x1d2430, alpha: 0.12 })
      platta.eventMode = 'none'
      c.addChild(platta)
      const hand = ritaNathand(natTyp(this._vantar[slot]), { kort: true })
      hand.eventMode = 'none'
      c.addChild(hand)
    }
  },

  // Byt hand: den väntande handen i slot kliver fram, den aktiva lägger sig där.
  _bytHand(ctx, slot) {
    if (!this._alive || this._phase !== 'drive') return
    this._idle = 0
    this._everToggled = true
    this._stopHandPulse()
    const gammal = this._mode
    this._mode = this._vantar[slot]
    this._vantar[slot] = gammal
    ctx.services.audio.sfx('flip')
    ctx.services.audio.tone({ freq: NOTES[NAT_TYPER.findIndex((n) => n.id === this._mode)], dur: 0.14, type: 'triangle', vol: 0.18 })
    this._ritaArm()
    this._ritaVantande()
    // handen som klev fram gör ett litet skutt, den som lade sig sjunker undan
    pop(this._arm, { scale: 1.06 })
    const sido = this._sidoHander[slot]
    if (sido && !sido.destroyed) pop(sido, { scale: 1.12 })
    sparkle(ctx.fxLayer, ARM_PIVOT.x, ARM_PIVOT.y - 250, { count: 6 })
  },

  // Mjuk hjälp: låt den hand uppdraget behöver andas (aldrig en tillsägelse).
  _pulseHands(ctx, vill) {
    this._stopHandPulse()
    const slot = this._vantar.indexOf(vill)
    const mal = slot >= 0 ? this._sidoHander[slot] : null
    if (!mal || mal.destroyed) return
    this._handPulse = breathe(mal, { scale: SIDO_SKALA * 1.12, duration: 0.5 })
    ctx.later(3.6, () => this._stopHandPulse())
  },

  _stopHandPulse() {
    if (this._handPulse) {
      this._handPulse.kill()
      this._handPulse = null
      for (const c of this._sidoHander || []) {
        if (c && !c.destroyed) c.scale.set(SIDO_SKALA)
      }
    }
  },

  // ------------------------------------------------------------------ uppdrag
  _needFor(key) {
    if (key === 'katt') return this._level >= 4 ? 2 : 1
    if (key === 'paket') return this._level >= 2 ? 3 : 2
    return 3
  },

  _missionDef(key) {
    if (key === 'katt') return { net: 'drag', kinds: ['katt'] }
    if (key === 'paket') return { net: 'klibb', kinds: ['paket', 'guldpaket'] }
    return { net: 'drag', kinds: ['ballong'] }
  },

  _buildMissionPanel() {
    const c = new Container()
    c.eventMode = 'none'
    c.interactiveChildren = false
    this._panelBg = new Graphics()
    c.addChild(this._panelBg)
    this._panelContent = new Container()
    this._panelContent.eventMode = 'none'
    c.addChild(this._panelContent)
    c.position.set(640, 92)
    c.alpha = 0
    this._panel = c
    this._root.addChild(c)
  },

  _announce(ctx) {
    if (!this._alive || this._phase !== 'drive' || this._missionActive) return
    const key = this._missionOrder[this._missionsDone % 3]
    this._missionKey = key
    this._missionNeed = this._needFor(key)
    this._missionGot = 0
    this._missionActive = true
    this._missionT = 0
    this._wrongNet = 0
    this._hintedNet = false
    // Ikon-först-panel: ritad symbol + nätikon + pluppar (panelen får bära UI, aldrig spelobjekt).
    this._drawPanel()
    if (this._panel && !this._panel.destroyed) {
      gsap.killTweensOf(this._panel)
      this._panel.alpha = 1
      bounceIn(this._panel)
    }
    ctx.services.audio.sfx('reveal')
    // Literala repliker (aldrig ternärer i say — check.mjs ser bara literaler).
    if (key === 'katt') {
      ctx.services.voice.say('Fånga katten med dragnätet!')
    } else if (key === 'paket') {
      ctx.services.voice.say('Fäst paketen så de inte blåser iväg!')
    } else {
      ctx.services.voice.say('Hämta hem tre ballonger!')
    }
    // Aldrig bytt nät efter 2 uppdrag → visa vägen till växelknappen.
    if (this._missionsDone >= 2 && !this._everToggled) {
      ctx.later(2.8, () => this._sayByt(ctx))
    }
  },

  _drawPanel() {
    if (!this._panel || this._panel.destroyed) return
    const def = this._missionDef(this._missionKey)
    const need = this._missionNeed
    const w = 190 + need * 34
    const bg = this._panelBg
    bg.clear()
    bg.roundRect(-w / 2, -46, w, 92, 26).fill({ color: 0xfffdf7, alpha: 0.94 }).stroke({ width: 4, color: shade(def.net === 'klibb' ? COLORS.green : COLORS.blue, 0.1) })
    for (const ch of this._panelContent.removeChildren()) ch.destroy({ children: true })
    // ritad mål-symbol
    const icon = KIND_DRAW[this._missionKey === 'paket' ? 'paket' : this._missionKey]()
    icon.scale.set(0.62)
    icon.position.set(-w / 2 + 52, 8)
    icon.eventMode = 'none'
    this._panelContent.addChild(icon)
    // nätläges-ikon (vilket nät uppdraget vill ha)
    const net = makeNetIcon(def.net, 0x7a6657)
    net.scale.set(0.72)
    net.position.set(-w / 2 + 118, 0)
    this._panelContent.addChild(net)
    const ring = new Graphics().circle(-w / 2 + 118, 0, 27).stroke({ width: 3, color: def.net === 'klibb' ? COLORS.green : COLORS.blue, alpha: 0.8 })
    ring.eventMode = 'none'
    this._panelContent.addChild(ring)
    // pluppar (fylls i takt med framsteg)
    this._panelPips = new Graphics()
    this._panelPips.eventMode = 'none'
    this._panelContent.addChild(this._panelPips)
    this._drawPips()
  },

  _drawPips() {
    const g = this._panelPips
    if (!g || g.destroyed) return
    const def = this._missionDef(this._missionKey)
    const col = def.net === 'klibb' ? COLORS.green : COLORS.blue
    const need = this._missionNeed
    const w = 190 + need * 34
    g.clear()
    for (let i = 0; i < need; i++) {
      const x = -w / 2 + 168 + i * 34
      const done = i < this._missionGot
      g.circle(x, 0, 13).fill({ color: done ? col : 0xffffff, alpha: done ? 1 : 0.5 }).stroke({ width: 3, color: shade(col, 0.15) })
      if (done) g.circle(x, 0, 5).fill(0xfffdf7)
    }
  },

  // Rätt nät på rätt mål under aktivt uppdrag → framsteg (räknas KUMULATIVT,
  // vindbyn kan aldrig sänka en siffra — P0: poäng sjunker aldrig).
  _credit(ctx, net, kind) {
    if (!this._alive || !this._missionActive || this._phase !== 'drive') return
    const def = this._missionDef(this._missionKey)
    if (def.net !== net || !def.kinds.includes(kind)) {
      // fel nät på uppdrags-målet? Roligt ändå — men efter 2 ggr: visa växelknappen.
      if (def.kinds.includes(kind)) {
        this._wrongNet++
        if (this._wrongNet >= 2 && !this._hintedNet) {
          this._hintedNet = true
          this._sayByt(ctx)
        }
      }
      return
    }
    this._missionGot++
    this._missionT = 0
    this._drawPips()
    if (this._panel && !this._panel.destroyed) pop(this._panel)
    ctx.services.audio.tone({ freq: NOTES[Math.min(this._missionGot, NOTES.length - 1)], dur: 0.16, type: 'triangle', vol: 0.2 })
    if (this._missionGot >= this._missionNeed) this._missionDone(ctx)
  },

  _sayByt(ctx) {
    if (!this._alive || this._t - this._lastBytSaid < 18) return
    this._lastBytSaid = this._t
    ctx.services.voice.say('Byt hand nere i hörnet!')
    this._pulseHands(ctx, this._missionDef(this._missionKey).net)
  },

  _missionDone(ctx) {
    this._missionActive = false
    this._missionsDone++
    ctx.services.audio.sfx('match')
    if (this._panel && !this._panel.destroyed) {
      burst(ctx.fxLayer, this._panel.x, this._panel.y, { count: 14 })
      pop(this._panel, { scale: 1.3 })
    }
    if (this._missionsDone >= 3) {
      ctx.later(1.1, () => this._homecoming(ctx))
    } else {
      ctx.later(0.7, () => {
        if (this._alive) ctx.services.voice.say('Titta, baksätet blir fullt med vänner!')
      })
      ctx.later(2.4, () => {
        if (this._panel && !this._panel.destroyed) {
          gsap.killTweensOf(this._panel)
          this._panelFade = gsap.to(this._panel, { alpha: 0, duration: 0.5 })
        }
      })
      ctx.later(6.0, () => this._announce(ctx))
    }
  },

  // ------------------------------------------------------------------ mål (spawn)
  _spawnTarget(ctx, kind, atX = null, opts = {}) {
    // force: spelaren har själv skapat målet (fångat fönstermonster) — taket får
    // aldrig äta upp ett svar på ett tryck.
    if (!this._alive || (this._targets.length >= MAX_TARGETS && !opts.force)) return null
    // Default-spawn utanför SYNLIG högerkant (ctx.view, läst nu): 1380 stod fullt
    // synligt på en bred telefon (view.right ≈ 1443).
    if (atX == null) atX = ctx.view.right + 100
    let golden = false
    if (kind === 'paket') {
      this._paketSinceGold++
      if (Math.random() < 0.125 || this._paketSinceGold >= 9) {
        golden = true
        this._paketSinceGold = 0
      }
    }
    const view = new Container()
    view.eventMode = 'none'
    view.interactiveChildren = false
    const inner = new Container()
    inner.eventMode = 'none'
    const art = kind === 'monster' && opts.art ? drawMonster(opts.art, opts.tint) : KIND_DRAW[golden ? 'guldpaket' : kind]()
    inner.addChild(art)
    let r = 40
    let body
    const rec = { kind, golden, view, inner, r: 40, stuck: false, netted: false, loosened: false, credited: false, snarjd: false, snarjG: null, lieNu: 0, lieMal: 0, seed: Math.random() * 9, walkV: 0, netG: null, rope: null, reel: 0, slack: false }
    if (kind === 'katt' || kind === 'hund' || kind === 'monster') {
      r = kind === 'hund' ? 44 : kind === 'monster' ? 42 : 40
      body = this._phys.circle(atX, GROUND - r, r, { friction: 0.6, frictionAir: 0.02, restitution: 0.1, density: 0.0016, label: kind, collisionFilter: { group: -1 } })
      Body.setInertia(body, Infinity)
      rec.walkV = rnd(0.2, 0.7) * (Math.random() < 0.7 ? 1 : -1)
      const sh = new Graphics().ellipse(0, r - 3, r * 0.9, 9).fill({ color: 0x000000, alpha: 0.15 })
      sh.eventMode = 'none'
      view.addChild(sh)
    } else if (kind === 'paket') {
      r = 44
      body = this._phys.rectangle(atX, GROUND - 30, 72, 60, { friction: 0.7, frictionAir: 0.015, restitution: 0.25, density: 0.0018, label: 'paket', collisionFilter: { group: -1 } })
      const sh = new Graphics().ellipse(0, 32, 40, 8).fill({ color: 0x000000, alpha: 0.15 })
      sh.eventMode = 'none'
      view.addChild(sh)
    } else if (kind === 'kruka') {
      r = 40
      body = this._phys.rectangle(atX, GROUND - 27, 56, 54, { isStatic: true, friction: 0.7, restitution: 0.2, density: 0.002, label: 'kruka', collisionFilter: { group: -1 } })
      rec.sill = true
    } else if (kind === 'fagel') {
      r = 30
      body = this._phys.circle(atX, rnd(230, 360), 26, { isSensor: true, frictionAir: 0.02, density: 0.0008, label: 'fagel', collisionFilter: { group: -1 } })
      Body.setInertia(body, Infinity)
    } else {
      // ballong — flyter uppåt
      r = 40
      body = this._phys.circle(atX, rnd(560, 640), 34, { isSensor: true, frictionAir: 0.02, density: 0.0006, label: 'ballong', collisionFilter: { group: -1 } })
      Body.setInertia(body, Infinity)
    }
    rec.r = r
    rec.body = body
    view.addChild(inner)
    view.position.set(body.position.x, body.position.y)
    this._targetLayer.addChild(view)
    this._phys.link(body, view)
    this._targets.push(rec)
    return rec
  },

  // Blomkruka på ett fönsterbleck i ett nyskapat hus-segment.
  _spawnPotAt(ctx, seg) {
    const win = seg._wxPotAt
    seg._wxPotAt = null
    if (!win || !this._alive || this._targets.length >= MAX_TARGETS) return
    const x = seg.c.x + win.lx
    const y = win.cy + win.h / 2 + 8 - 27
    const rec = this._spawnTarget(ctx, 'kruka', 1380)
    if (rec) Body.setPosition(rec.body, { x, y })
  },

  _spawnTick(ctx) {
    // uppdrags-mål prioriteras så barnet aldrig blir stående utan
    let kind = null
    if (this._missionActive) {
      const def = this._missionDef(this._missionKey)
      const alive = this._targets.filter((r) => def.kinds.includes(r.kind) && !r.stuck && !r.netted).length
      if (alive < 2 && Math.random() < 0.7) kind = this._missionKey === 'paket' ? 'paket' : this._missionKey
    }
    if (!kind) {
      const pool = ['katt', 'hund', 'paket', 'paket', 'ballong', 'fagel', 'monster', 'monster']
      kind = pool[(Math.random() * pool.length) | 0]
    }
    this._spawnTarget(ctx, kind)
  },

  // ------------------------------------------------------------------ tryck → nät
  _onTap(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    const hand = this._handPos()
    // <100 ms: ljud + rekyl + ring direkt vid pekningen
    if (!ctx.services.audio.sample('thwip')) ctx.services.audio.sfx('whoosh')
    ripple(ctx.fxLayer, p.x, p.y, { maxR: 54, duration: 0.35, color: 0xffffff })
    this._armAim = clamp(Math.atan2(p.x - ARM_PIVOT.x, ARM_PIVOT.y - p.y) * 0.5, -0.3, 0.34)
    this._recoil = 1

    // NÄTBOLLS-HANDEN skjuter en projektil i stället för en lina — den flyger,
    // studsar och krockar, och det den träffar snärjs in.
    if (this._mode === 'boll') {
      this._shootBall(ctx, p)
      return
    }

    // träff-prioritet: skata → mål (närmast) → fönster → husvägg (miss)
    const shot = { x0: hand.x, y0: hand.y, ex: p.x, ey: p.y, p: 0, phase: 'fly', life: 1, rec: null, win: null, seg: null, skata: false, mons: null, prop: null, mode: this._mode, rope: mkRope(hand.x, hand.y) }
    if (this._skata && this._skata.phase !== 'flee' && Math.hypot(p.x - this._skata.c.x, p.y - this._skata.c.y) < 90) {
      shot.skata = true
    } else {
      let best = null
      let bd = 1e9
      for (const rec of this._targets) {
        if (rec.netted) continue
        const d = Math.hypot(p.x - rec.view.x, p.y - rec.view.y)
        if (d < rec.r + 42 && d < bd) {
          bd = d
          best = rec
        }
      }
      if (best) {
        shot.rec = best
      } else {
        // gatusak (brandpost, brevlåda, äppelträd …) före fönstren
        const gs = this._propAt(p.x, p.y)
        if (gs) {
          shot.prop = gs
        } else {
        // monstret som tittar ut ur en krossad ruta är ett riktigt mål
        const m = this._windowMonsterAt(p.x, p.y)
        if (m) {
          shot.mons = m
        } else {
          const w = this._windowAt(p.x, p.y)
          if (w) {
            shot.win = w.win
            shot.seg = w.seg
          }
        }
        }
      }
    }
    this._shots.push(shot)
  },

  _windowAt(px, py) {
    for (const seg of this._mid) {
      for (const win of seg.wins) {
        const wx = seg.c.x + win.lx
        if (Math.abs(px - wx) < win.w / 2 + 26 && Math.abs(py - win.cy) < win.h / 2 + 26) {
          return { seg, win }
        }
      }
    }
    return null
  },

  // Monstret som lutar sig ut ur en krossad ruta — träffbart som vilket mål som helst.
  _windowMonsterAt(px, py) {
    for (const seg of this._mid) {
      for (const win of seg.wins) {
        const mc = win.mc
        if (!mc || mc.destroyed || mc._wxCaught) continue
        const mx = seg.c.x + win.lx
        const my = win.cy + 6
        if (Math.hypot(px - mx, py - my) < 64) return { seg, win }
      }
    }
    return null
  },

  // Skottet framme → tillämpa nätets effekt.
  _resolveShot(ctx, s) {
    if (s.skata) {
      this._netSkata(ctx)
      return
    }
    if (s.prop) {
      this._hitProp(ctx, s.prop)
      return
    }
    if (s.mons) {
      this._catchWindowMonster(ctx, s.mons.seg, s.mons.win)
      return
    }
    if (s.rec) {
      this._hitTarget(ctx, s.rec)
      return
    }
    if (s.win) {
      this._hitWindow(ctx, s.seg, s.win)
      return
    }
    // tomt tryck: nätet fäster kort på husväggen och tonar bort — mjukt, aldrig straff
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, s.ex, s.ey, { count: 4, color: 0xd8d3c8 })
    s.phase = 'wall'
    s.life = 1
  },

  _hitTarget(ctx, rec) {
    if (!this._alive || !this._targets.includes(rec)) return
    // nätade du tjuven? Då tappar den paketet på fläcken — motgången är återtagbar
    if (this._thief && this._thief.mons === rec) this._dropLoot(ctx)
    this._soundFor(ctx, rec.kind, rec.inner?.children[0]?._wxArt)
    if (rec.inner && !rec.inner.destroyed) pop(rec.inner, { scale: 1.25 })
    sparkle(ctx.fxLayer, rec.view.x, rec.view.y, { count: 5 })
    if (this._mode === 'klibb') {
      const first = !rec.stuck
      if (first) {
        const nyttMal = !rec.credited // uppdragskredit ges EN gång per föremål
        rec.credited = true
        Body.setVelocity(rec.body, { x: 0, y: 0 })
        Body.setStatic(rec.body, true)
        rec.stuck = true
        rec.loosened = false
        const net = new Graphics()
        drawWebNet(net, rec.r * 1.25)
        net.eventMode = 'none'
        rec.inner.addChild(net)
        rec.netG = net
        bounceIn(net)
        if (nyttMal) this._credit(ctx, 'klibb', rec.kind === 'paket' && rec.golden ? 'guldpaket' : rec.kind)
        // fågeln är för pigg för nätet: sprattlar loss efter en stund och flyger vidare
        if (rec.kind === 'fagel') {
          ctx.later(2.3, () => {
            if (!this._alive || !this._targets.includes(rec) || !rec.stuck) return
            rec.stuck = false
            Body.setStatic(rec.body, false)
            Body.setVelocity(rec.body, { x: 2, y: -4 })
            if (rec.netG && !rec.netG.destroyed) rec.netG.destroy()
            rec.netG = null
            puff(ctx.fxLayer, rec.view.x, rec.view.y, { count: 6, color: 0x5db1e8 })
            if (!ctx.services.audio.sample('djur_uggla')) ctx.services.audio.sfx('pling')
          })
        }
      } else if (rec.inner && !rec.inner.destroyed) {
        wiggle(rec.inner) // redan fast: extra nät = bara busigt
      }
    } else {
      // dragnät: repet fäster och vinschen börjar dra — vilolängden startar strax
      // kortare än avståndet så det FÖRSTA rycket känns direkt.
      this._startReel(rec, rec.view.x, rec.view.y)
      if (rec.stuck || rec.sill) Body.setStatic(rec.body, false)
      rec.stuck = false
      rec.body.isSensor = true
      if (rec.kind === 'ballong') {
        ctx.services.audio.tone({ freq: 523.25, dur: 0.14, type: 'triangle', vol: 0.2 })
        ctx.services.audio.tone({ freq: 659.25, dur: 0.2, type: 'triangle', vol: 0.2, delay: 0.12 })
      }
      // fel-näts-räknaren (klibb-uppdrag men barnet drar) hanteras i _credit vid hemkomsten
    }
  },

  // ------------------------------------------------------------ gatusaker
  // Elva föremål längs gatan som SVARAR på nät (GATUSAKER-tabellen): brandpost,
  // brevlåda, dörr, äppelträd, gatulock, blommor, lyktstolpe, trafikljus,
  // parkerad bil, korvstånd, cykel. Varje sak har eget liv i vila (_wxTick) och
  // tre olika reaktioner (_wxReagera per nät) — ingen kan gå sönder permanent.
  _spawnProp(ctx, atX = 1420) {
    if (!this._alive || this._props.length >= PROP_MAX) return null
    // aldrig två saker på varandra
    for (const q of this._props) if (Math.abs(q.c.x - atX) < PROP_LUFT) return null
    const def = GATUSAKER[(Math.random() * GATUSAKER.length) | 0]
    const c = def.rita()
    c.position.set(atX, PROP_Y[def.fot] ?? PROP_Y.trottoar)
    this._propLayer.addChild(c)
    const prop = { c, def, r: Math.max(48, def.traffR | 0) }
    this._props.push(prop)
    return prop
  },

  _updateProps(ctx, dt, sc) {
    for (let i = this._props.length - 1; i >= 0; i--) {
      const p = this._props[i]
      if (!p.c || p.c.destroyed) {
        this._props.splice(i, 1)
        continue
      }
      p.c.x -= sc
      if (p.c.x < -260) {
        p.c.destroy({ children: true })
        this._props.splice(i, 1)
        continue
      }
      // ticka bara det som är i eller nära bild (vilo-animationen är billig men
      // reaktionerna ritar om per bildruta)
      if (p.c.x > -220 && p.c.x < 1520 && typeof p.c._wxTick === 'function') p.c._wxTick(this._t, dt)
    }
    if (this._phase !== 'drive') return
    this._propTimer -= dt
    if (this._propTimer <= 0) {
      this._propTimer = rnd(1.6, 3.0)
      this._spawnProp(ctx)
    }
  },

  _propAt(px, py) {
    let best = null
    let bd = 1e9
    for (const p of this._props) {
      if (!p.c || p.c.destroyed) continue
      // träffytan mäts mot sakens mitthöjd, inte foten
      const cy = p.c.y - (p.def.hojd || 90) * 0.45
      const d = Math.hypot(px - p.c.x, py - cy)
      if (d < p.r && d < bd) {
        bd = d
        best = p
      }
    }
    return best
  },

  _hitProp(ctx, p) {
    if (!this._alive || !p.c || p.c.destroyed || typeof p.c._wxReagera !== 'function') return
    const tagg = p.c._wxReagera(this._mode)
    const svar = PROP_SVAR[tagg] || { sfx: 'soft', ton: 440, farg: 0xd8d3c8 }
    const a = ctx.services.audio
    if (svar.prov && a.sample(svar.prov)) {
      // riktigt klipp spelades
    } else if (svar.sfx) {
      a.sfx(svar.sfx)
    }
    if (svar.ton) a.tone({ freq: svar.ton, dur: 0.16, type: 'triangle', vol: 0.19, delay: 0.04 })
    const cy = p.c.y - (p.def.hojd || 90) * 0.45
    sparkle(ctx.fxLayer, p.c.x, cy, { count: 6 })
    puff(ctx.fxLayer, p.c.x, cy, { count: 5, color: svar.farg })
    this._idle = 0
  },

  // ------------------------------------------------------------- nätbollar
  // Tredje handen skjuter en vit nätboll: riktig matter-kropp med hög studs som
  // far iväg, träffar marken och far vidare. Träffar den ett mål SNÄRJS målet in
  // (se _snarjIn). Bollen ligger i grupp -1 precis som målen, så matter låter dem
  // passera varandra — målträffarna görs i stället med en egen avståndskoll, för
  // fåglar och ballonger är sensorer och skulle aldrig ge en matter-kollision.
  _shootBall(ctx, p) {
    if (!this._alive) return
    while (this._balls.length >= BALL_MAX) this._killBall(ctx, this._balls.shift(), false)
    const hand = this._handPos()
    const dx = p.x - hand.x
    const dy = p.y - hand.y
    const d = Math.hypot(dx, dy) || 1
    const body = this._phys.circle(hand.x, hand.y, BALL_R, {
      restitution: 0.78,
      friction: 0.22,
      frictionAir: 0.006,
      density: 0.0012,
      label: 'natboll',
      collisionFilter: { group: -1 },
    })
    Body.setVelocity(body, { x: (dx / d) * BALL_V, y: (dy / d) * BALL_V })
    const view = new Container()
    view.eventMode = 'none'
    const g = new Graphics()
    g.circle(0, 0, BALL_R).fill({ color: 0xffffff, alpha: 0.95 }).stroke({ width: 3, color: 0xe3e0d8 })
    drawWebNet(g, BALL_R - 3, { color: 0xa9a49a, alpha: 0.9, width: 2 })
    g.eventMode = 'none'
    view.addChild(g)
    view.position.set(hand.x, hand.y)
    this._targetLayer.addChild(view)
    this._phys.link(body, view)
    this._balls.push({ body, view, g, t: 0, studs: 0 })
    this._recoil = 1
    ctx.services.audio.tone({ freq: 392, dur: 0.08, type: 'square', vol: 0.14 })
  },

  _updateBalls(ctx, dt, sc) {
    for (let i = this._balls.length - 1; i >= 0; i--) {
      const b = this._balls[i]
      if (!b.view || b.view.destroyed) {
        this._balls.splice(i, 1)
        continue
      }
      b.t += dt
      b.view.rotation += 0.16 // bollen rullar synligt i luften
      const pos = b.body.position
      if (b.t > BALL_LIFE || pos.x < -120 || pos.x > 1480 || pos.y > 860) {
        this._killBall(ctx, b, true)
        this._balls.splice(i, 1)
        continue
      }
      // studs mot marken hörs (strypt så en studsande boll inte blir ett maskingevär)
      if (pos.y > GROUND - BALL_R - 6 && b.body.velocity.y < -1 && this._t - (b.lastStuds || 0) > 0.18) {
        b.lastStuds = this._t
        b.studs++
        ctx.services.audio.tone({ freq: 330 + b.studs * 60, dur: 0.07, type: 'square', vol: 0.11 })
        puff(ctx.fxLayer, pos.x, GROUND, { count: 3, color: 0xd8d3c8 })
      }
      // nätbollen krockar även med gatusakerna (de svarar med 'boll'-varianten)
      const traffP = this._propAt(pos.x, pos.y)
      if (traffP && b.t > 0.07) {
        const spara = this._mode
        this._mode = 'boll'
        this._hitProp(ctx, traffP)
        this._mode = spara
        this._killBall(ctx, b, true)
        this._balls.splice(i, 1)
        continue
      }
      // Egen träffkoll mot målen — men FÖRST när bollen lämnat handen. Utan den
      // spärren snärjde bollen in det som råkade gå förbi framför bilen i samma
      // ögonblick som skottet gick, inte det barnet siktade på (mätt: sonden fick
      // aldrig se en boll i luften, för den åts upp på bildruta 1).
      const hand0 = this._handPos()
      if (b.t < 0.07 || Math.hypot(pos.x - hand0.x, pos.y - hand0.y) < 78) continue
      for (const rec of this._targets) {
        if (rec.snarjd || rec.netted) continue
        const dd = Math.hypot(rec.view.x - pos.x, rec.view.y - pos.y)
        if (dd < rec.r + BALL_R) {
          this._snarjIn(ctx, rec)
          this._killBall(ctx, b, true)
          this._balls.splice(i, 1)
          break
        }
      }
    }
  },

  _killBall(ctx, b, effekt) {
    if (!b) return
    if (effekt && b.view && !b.view.destroyed) puff(ctx.fxLayer, b.view.x, b.view.y, { count: 5, color: 0xffffff })
    if (b.body) this._phys.removeBody(b.body)
    if (b.view && !b.view.destroyed) {
      gsap.killTweensOf(b.view)
      b.view.destroy({ children: true })
    }
  },

  // Insnärjd: målet faller ner och blir LIGGANDE i en vit nätboll — huvudet och
  // fötterna sticker ut ur bollen. Det är inget straff: en insnärjd sak går
  // fortfarande att dra hem eller klibba fast, och den ligger still och väntar.
  _snarjIn(ctx, rec) {
    if (!this._alive || rec.snarjd) return
    rec.snarjd = true
    rec.walkV = 0
    rec.stuck = false
    if (rec.netG && !rec.netG.destroyed) rec.netG.destroy()
    rec.netG = null
    if (rec.sill) {
      rec.sill = false
      Body.setStatic(rec.body, false)
    } else if (rec.body.isStatic) {
      Body.setStatic(rec.body, false)
    }
    rec.body.isSensor = false
    Body.setVelocity(rec.body, { x: rnd(-1.4, 1.4), y: 2.2 })
    const r = rec.r * 0.78 // mindre än kroppen → huvud och fötter blir kvar utanför
    const boll = new Graphics()
    boll.circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.93 }).stroke({ width: 3, color: 0xe3e0d8 })
    drawWebNet(boll, r - 3, { color: 0xa9a49a, alpha: 0.95, width: 2.2 })
    boll.eventMode = 'none'
    rec.inner.addChild(boll)
    rec.snarjG = boll
    bounceIn(boll)
    // Lägger sig ner på sidan. Rotationen MÅSTE ligga på inner, inte på view:
    // PhysicsWorld.link skriver view.rotation = body.angle varje bildruta, så en
    // tween på view.rotation nollas tyst (sonden mätte rotation 0 rad).
    rec.lieMal = (Math.random() < 0.5 ? -1 : 1) * rnd(1.3, 1.7)
    rec.lieNu = 0
    const tw = gsap.to(rec, { lieNu: rec.lieMal, duration: 0.45, ease: 'back.out(1.6)' })
    this._tws.push(tw)
    this._soundFor(ctx, rec.kind, rec.inner?.children[0]?._wxArt)
    burst(ctx.fxLayer, rec.view.x, rec.view.y, { count: 10, colors: [0xffffff, 0xe8e6e0, 0xd8f0fa] })
    ctx.services.audio.tone({ freq: 587.33, dur: 0.14, type: 'triangle', vol: 0.18, delay: 0.06 })
    this._idle = 0
  },

  // Gemensam start för allt som vinschas hem (träffat mål · fångat fönstermonster):
  // repets vilolängd + vevtakten normaliserad mot avståndet, så hemfärden tar lika
  // lång tid oavsett var målet satt och alltid hinner med 1–2 vevtag.
  _startReel(rec, x, y) {
    const hand = this._handPos()
    rec.netted = true
    rec.slack = false
    const dist = Math.hypot(hand.x - x, hand.y - y)
    rec.reel = Math.max(60, dist - 70)
    // Farttaket måste följa avståndet, annars sprintar kroppen hela sträckan inuti
    // ETT vevtag och är hemma innan pausen hinner slakna repet (mätt: nära mål kom
    // hem på 0,38 s med 0 ryck medan långa fick 2). Kroppen rör sig bara under
    // vevtagen — därav delningen med vevtagets andel av varvet (0,42).
    // Ett vevtag får aldrig räcka hela vägen hem — då hinner pausen (och därmed
    // rycket) aldrig inträffa. Mätt: nära mål kom hem på 20 rutor medan taget är
    // 14, alltså 0 ryck varje gång. Taket sätts så att första taget tar ~55 % av
    // sträckan; resten kommer efter en synlig paus.
    rec.vmax = clamp(((dist - CATCH_R) * 0.42) / STROKE_F, 3.5, 20)
    // …och vevtakten får inte överstiga vad kroppen KAN följa, annars ligger repet
    // spänt hela vägen på långa drag (mätt: 550 px gav 0 ryck innan taket sattes).
    rec.reelRate = Math.min(rec.reel / REEL_FRAMES, rec.vmax * 1.6 * DUTY_MEAN)
    rec.reelT = 0
    rec.rope = mkRope(x, y)
    if (rec.snarjd) {
      gsap.killTweensOf(rec)
      this._tws.push(gsap.to(rec, { lieNu: 0, duration: 0.25, ease: 'power2.out' })) // reser sig ur nätbollen
    }
    this._recoil = Math.max(this._recoil, 0.55)
  },

  _soundFor(ctx, kind, art) {
    const a = ctx.services.audio
    if (kind === 'katt' && a.sample('djur_katt')) return
    if (kind === 'hund' && a.sample('djur_hund')) return
    if (kind === 'fagel' && a.sample('djur_uggla')) return
    if (kind === 'monster') {
      // varje art får sin EGEN tonhöjd ovanpå boinget — ludd ska inte låta som sten
      const i = Math.max(0, MONSTER_ARTER.findIndex((m) => m.id === art))
      a.tone({ freq: NOTES[i % NOTES.length], dur: 0.16, type: 'triangle', vol: 0.19, delay: 0.05 })
      if (a.sample('boing')) return
    }
    if ((kind === 'paket' || kind === 'kruka') && a.sample('plopp')) return
    if (kind === 'ballong') {
      a.sfx('pop')
      return
    }
    a.sfx('pop')
  },

  _hitWindow(ctx, seg, win) {
    if (!this._alive || win.state !== 'ok' || win.g.destroyed) return
    const wx = seg.c.x + win.lx
    if (this._brokenCount >= MAX_BROKEN) {
      // TAK: nätet studsar av med en gnista — rutan klarar sig
      ctx.services.audio.sfx('pling')
      sparkle(ctx.fxLayer, wx, win.cy, { count: 6 })
      return
    }
    win.state = 'broken'
    win.brokenAt = this._t
    this._brokenCount++
    this._drawWindow(win)
    // tecknat glitter-splitter + glatt ljud (stämda höga toner, inget surr)
    burst(ctx.fxLayer, wx, win.cy, { count: 12, colors: [0xd8f0fa, 0xffffff, 0xbfe4f2, 0xfff3b0] })
    if (!ctx.services.audio.sample('plopp')) ctx.services.audio.sfx('pop')
    ctx.services.audio.tone({ freq: 1046.5, dur: 0.12, type: 'sine', vol: 0.16 })
    ctx.services.audio.tone({ freq: 1318.5, dur: 0.16, type: 'sine', vol: 0.14, delay: 0.07 })
    if (this._t - this._lastRutaSaid > 14 && Math.random() < 0.5) {
      this._lastRutaSaid = this._t
      ctx.services.voice.say('Hoppsan! Där rök en ruta!')
    }
    // Ofta lutar sig ett monster ut ur hålet och vinkar — och det går att FÅNGA
    // (se _catchWindowMonster). Det är en riktig art ur familjen, inte en klick,
    // så det man drar hem ser likadant ut i baksätet.
    if (Math.random() < 0.55) {
      const art = slumpaMonsterArt()
      const kropp = drawMonster(art)
      kropp.scale.set(0.6)
      const tintC = kropp._wxTint ?? MONSTER_TINTS[0]
      const mc = new Container()
      mc.eventMode = 'none'
      mc.addChild(kropp)
      const arm = new Graphics()
      arm.moveTo(0, 0).lineTo(13, -15).stroke({ width: 6, color: tintC, cap: 'round' })
      arm.circle(13, -15, 5).fill(tintC)
      arm.position.set(15, 4)
      arm.eventMode = 'none'
      mc.addChild(arm)
      mc._wxArm = arm
      mc._wxArt = art
      mc._wxTint = tintC
      mc.position.set(win.lx, win.cy + 6)
      seg.c.addChild(mc)
      win.mc = mc
      bounceIn(mc)
      ctx.services.audio.sfx('boing')
    }
  },

  // Monstret i hålet är fångbart med BÅDA näten och gör olika saker:
  //   klibbnät = det fastnar i rutan, sprattlar och kryper skrattande in igen
  //   dragnät  = det lyfts UT ur fönstret och vinschas hem till baksätet som en vän
  // Ingen variant är ett felval (P0 AGENS), och rutan lagar sig som vanligt efteråt.
  _catchWindowMonster(ctx, seg, win) {
    const mc = win.mc
    if (!this._alive || !mc || mc.destroyed || mc._wxCaught) return
    const wx = seg.c.x + win.lx
    const wy = win.cy + 6
    if (!ctx.services.audio.sample('boing')) ctx.services.audio.sfx('boing')
    sparkle(ctx.fxLayer, wx, wy, { count: 7 })
    this._idle = 0
    // ge fångst-ögonblicket luft: rutan får inte självlaga mitt i det
    win.brokenAt = Math.max(win.brokenAt, this._t - HEAL_AFTER + 3.2)

    if (this._mode === 'klibb') {
      mc._wxCaught = 'klibb'
      const net = new Graphics()
      drawWebNet(net, 32)
      net.eventMode = 'none'
      mc.addChild(net)
      mc._wxNet = net // destroy() måste kunna döda bounceIn-tweenen på nätet
      bounceIn(net)
      wiggle(mc)
      ctx.services.audio.tone({ freq: 659.25, dur: 0.14, type: 'triangle', vol: 0.2 })
      ctx.services.audio.tone({ freq: 880, dur: 0.16, type: 'triangle', vol: 0.18, delay: 0.12 })
      ctx.later(2.5, () => {
        if (!this._alive || mc.destroyed) return
        puff(ctx.fxLayer, seg.c.x + win.lx, win.cy + 6, { count: 6, color: 0xd8d3c8 })
        mc.destroy({ children: true })
        win.mc = null
      })
      return
    }

    // dragnät: monstret blir en riktig kropp och åker hem i repet
    mc._wxCaught = 'drag'
    const art = mc._wxArt
    const tint = mc._wxTint
    mc.destroy({ children: true })
    win.mc = null
    const rec = this._spawnTarget(ctx, 'monster', wx, { art, tint, force: true })
    if (!rec) {
      puff(ctx.fxLayer, wx, wy, { count: 6 })
      ctx.services.audio.sfx('pling')
      return
    }
    Body.setPosition(rec.body, { x: wx, y: wy })
    Body.setVelocity(rec.body, { x: 0, y: 0 })
    rec.walkV = 0
    rec.body.isSensor = true
    this._startReel(rec, wx, wy)
    burst(ctx.fxLayer, wx, wy, { count: 10, colors: [0xd8f0fa, 0xffffff, 0xfff3b0] })
  },

  _healWindows(ctx) {
    for (const seg of this._mid) {
      for (const win of seg.wins) {
        if (win.state !== 'broken') continue
        if (this._t - win.brokenAt > HEAL_AFTER) {
          win.state = 'ok'
          this._brokenCount = Math.max(0, this._brokenCount - 1)
          this._drawWindow(win)
          if (win.mc && !win.mc.destroyed) win.mc.destroy({ children: true })
          win.mc = null
          const wx = seg.c.x + win.lx
          if (wx > ctx.view.left - 60 && wx < ctx.view.right + 60) {
            sparkle(ctx.fxLayer, wx, win.cy, { count: 6 })
            ctx.services.audio.sfx('reveal')
          }
        } else if (win.mc && !win.mc.destroyed && win.mc._wxArm && !win.mc._wxArm.destroyed) {
          win.mc._wxArm.rotation = Math.sin(this._t * 7 + win.seed) * 0.5 // monstret vinkar
        }
      }
    }
  },

  // ------------------------------------------------------------------ dragning hem
  _collect(ctx, rec) {
    const idx = this._targets.indexOf(rec)
    if (idx < 0) return
    this._targets.splice(idx, 1)
    this._phys.removeBody(rec.body)
    const kind = rec.kind === 'paket' && rec.golden ? 'guldpaket' : rec.kind
    this._credit(ctx, 'drag', kind)
    this._soundFor(ctx, rec.kind, rec.inner?.children[0]?._wxArt)
    puff(ctx.fxLayer, rec.view.x, rec.view.y, { count: 6 })
    // vy:n seglar i en båge ner i baksätet (exit-säker proxy)
    const view = rec.view
    const sx = view.x
    const sy = view.y
    const tx = SEAT.x + rnd(-60, 50)
    const ty = SEAT.y + rnd(-6, 10)
    const st = { p: 0 }
    const tw = gsap.to(st, {
      p: 1,
      duration: 0.5,
      ease: 'power1.in',
      onUpdate: () => {
        if (view.destroyed) {
          tw.kill()
          return
        }
        view.x = sx + (tx - sx) * st.p
        view.y = sy + (ty - sy) * st.p - Math.sin(st.p * Math.PI) * 120
        view.scale.set(1 - st.p * 0.45)
      },
      onComplete: () => {
        if (!view.destroyed) view.destroy({ children: true })
        if (!this._alive) return
        // arten följer med hem: fångade du en goblin ska en GOBLIN sitta i sätet
        this._landFriend(ctx, rec.kind, rec.golden, rec.inner?.children[0]?._wxArt)
      },
    })
    this._tws.push(tw)
  },

  // Landning i baksätet: huvud dyker upp, alla jublar (mottagaren!).
  _landFriend(ctx, kind, golden, art) {
    this._seatList.push({ kind, golden, art })
    ctx.progress.setCustom('vanner', (ctx.progress.get().custom?.vanner || 0) + 1)
    if (!ctx.services.audio.sample('plopp')) ctx.services.audio.sfx('pop')
    ctx.services.audio.tone({ freq: NOTES[this._seatList.length % NOTES.length], dur: 0.18, type: 'triangle', vol: 0.2 })
    const head = kind === 'monster' && art ? drawMonster(art) : KIND_DRAW[golden ? 'guldpaket' : kind]()
    head.scale.set(0.5)
    const n = this._seatHeads.length
    const hx = 1044 + (n % 5) * 52 + rnd(-6, 6)
    const hy = SEAT.y + (n >= 5 ? -28 : 0) + rnd(-4, 4)
    head.position.set(hx, hy)
    head.eventMode = 'none'
    this._friendLayer.addChild(head)
    this._seatHeads.push({ c: head, seed: Math.random() * 9, by: hy })
    bounceIn(head)
    // alla i sätet gör en glad liten hoppvåg
    for (const h of this._seatHeads) {
      if (h.c && !h.c.destroyed) pop(h.c, { scale: 1.15 })
    }
    if (this._seatHeads.length > 9) {
      const old = this._seatHeads.shift()
      if (old.c && !old.c.destroyed) old.c.destroy({ children: true })
    }
    if (golden) {
      // WOW: guldpaketet regnar stjärnor
      ctx.services.audio.sfx('magi')
      ctx.services.audio.tone({ freq: 523.25, dur: 0.14, type: 'triangle', vol: 0.22 })
      ctx.services.audio.tone({ freq: 659.25, dur: 0.14, type: 'triangle', vol: 0.22, delay: 0.11 })
      ctx.services.audio.tone({ freq: 783.99, dur: 0.14, type: 'triangle', vol: 0.22, delay: 0.22 })
      ctx.services.audio.tone({ freq: 1046.5, dur: 0.24, type: 'triangle', vol: 0.24, delay: 0.33 })
      burst(ctx.fxLayer, hx, hy - 40, { count: 18, colors: [0xffd35c, 0xfff3b0, 0xffe28a] })
      for (let i = 0; i < 5; i++) {
        floatText(ctx.fxLayer, hx + rnd(-70, 70), hy - rnd(10, 60), '⭐', { fontSize: 34 + rnd(0, 20), rise: 110, duration: 1.1 })
      }
    }
  },

  // ------------------------------------------------------------------ skata + vindby
  _spawnSkata(ctx) {
    if (this._skata || this._thief || this._phase !== 'drive') return
    const prey = this._targets.find((r) => (r.kind === 'paket') && !r.netted) // knycker paket (helst fästa)
    if (!prey) return
    const c = drawSkata()
    c.position.set(1360, 140)
    this._skataLayer.addChild(c)
    this._skata = { c, phase: 'in', prey, vx: 0, vy: 0, holdT: 0 }
    ctx.services.audio.tone({ freq: 740, dur: 0.1, type: 'sawtooth', vol: 0.12 })
    ctx.services.audio.tone({ freq: 620, dur: 0.12, type: 'sawtooth', vol: 0.12, delay: 0.12 })
  },

  _updateSkata(ctx, dtF) {
    const s = this._skata
    if (!s) return
    const c = s.c
    if (!c || c.destroyed) {
      this._skata = null
      return
    }
    if (c._wxWing && !c._wxWing.destroyed) c._wxWing.rotation = Math.sin(this._t * 16) * 0.55
    if (s.phase === 'in') {
      const preyOk = s.prey && this._targets.includes(s.prey) && !s.prey.netted
      if (!preyOk) {
        s.phase = 'flee'
      } else {
        const tx = s.prey.view.x
        const ty = s.prey.view.y - 46
        const d = Math.hypot(tx - c.x, ty - c.y)
        c.x += ((tx - c.x) / (d || 1)) * 4.6 * dtF
        c.y += ((ty - c.y) / (d || 1)) * 4.6 * dtF
        if (d < 18) {
          s.phase = 'carry'
          // paketet lyfts: statiskt och bärs av skatan
          Body.setStatic(s.prey.body, true)
          s.prey.stuck = false
          if (s.prey.netG && !s.prey.netG.destroyed) s.prey.netG.destroy()
          s.prey.netG = null
          if (!ctx.services.audio.sample('djur_uggla')) ctx.services.audio.sfx('flip')
          if (s.prey.inner && !s.prey.inner.destroyed) wiggle(s.prey.inner)
        }
      }
    } else if (s.phase === 'carry') {
      const preyOk = s.prey && this._targets.includes(s.prey)
      c.x += 1.1 * dtF
      c.y -= 0.85 * dtF
      if (preyOk) Body.setPosition(s.prey.body, { x: c.x + 2, y: c.y + 58 })
      if (c.y < -120 || c.x > 1420) {
        // kom undan med paketet (nya paket kommer — aldrig ett straff)
        if (preyOk) this._removeTarget(s.prey)
        if (!c.destroyed) c.destroy({ children: true })
        this._skata = null
      }
    } else {
      // flee: släpper allt och flaxar iväg
      c.x += 7 * dtF
      c.y -= 5 * dtF
      if (c.y < -120 || c.x > 1420) {
        if (!c.destroyed) c.destroy({ children: true })
        this._skata = null
      }
    }
  },

  _netSkata(ctx) {
    const s = this._skata
    if (!s || !s.c || s.c.destroyed) return
    ctx.services.audio.sfx('boing')
    puff(ctx.fxLayer, s.c.x, s.c.y, { count: 8, color: 0x394252 })
    sparkle(ctx.fxLayer, s.c.x, s.c.y, { count: 6 })
    if (s.phase === 'carry' && s.prey && this._targets.includes(s.prey)) {
      // paketet släpps och studsar ner på trottoaren igen
      Body.setStatic(s.prey.body, false)
      Body.setVelocity(s.prey.body, { x: rnd(-1, 1), y: 2 })
      s.prey.loosened = true
    }
    s.phase = 'flee'
    this._idle = 0
  },

  // ------------------------------------------------------------------ pakettjuven
  // MOTGÅNG med hårt tak: EN tjuv åt gången, aldrig samtidigt som skatan, och
  // aldrig medan en vindby håller på. Ett monster på trottoaren smyger fram till
  // ett paket, lyfter det över huvudet och kutar iväg. Nätar man monstret (vilket
  // nät som helst) tappar det paketet direkt. Redan given uppdragskredit kan aldrig
  // försvinna, så tjuven kan bara SAKTA NER, aldrig nollställa.
  _monsterHeist(ctx) {
    if (this._thief || this._skata || this._phase !== 'drive') return
    const mons = this._targets.find(
      (r) => r.kind === 'monster' && !r.netted && !r.stuck && r.view.x > 60 && r.view.x < 1180,
    )
    if (!mons) return
    const paket = this._targets.find(
      (r) => r.kind === 'paket' && !r.netted && Math.abs(r.view.x - mons.view.x) < 640,
    )
    if (!paket) return
    this._thief = { mons, paket, phase: 'smyg' }
    mons.walkV = 0
    ctx.services.audio.tone({ freq: 233, dur: 0.12, type: 'sawtooth', vol: 0.09 })
    ctx.services.audio.tone({ freq: 196, dur: 0.14, type: 'sawtooth', vol: 0.09, delay: 0.13 })
  },

  _updateThief(ctx) {
    const th = this._thief
    if (!th) return
    const { mons, paket } = th
    if (!this._targets.includes(mons) || mons.netted || mons.stuck) {
      this._dropLoot(ctx)
      return
    }
    const paketOk = this._targets.includes(paket) && !paket.netted
    if (!paketOk) {
      this._thief = null
      mons.walkV = rnd(0.2, 0.7) * (Math.random() < 0.7 ? 1 : -1)
      return
    }
    if (th.phase === 'smyg') {
      const dx = paket.view.x - mons.view.x
      Body.setVelocity(mons.body, { x: clamp(dx * 0.02, -2.7, 2.7), y: mons.body.velocity.y })
      if (Math.abs(dx) < 46) {
        th.phase = 'bar'
        Body.setStatic(paket.body, true)
        paket.stuck = false
        if (paket.netG && !paket.netG.destroyed) paket.netG.destroy()
        paket.netG = null
        if (!ctx.services.audio.sample('boing')) ctx.services.audio.sfx('flip')
        if (mons.inner && !mons.inner.destroyed) wiggle(mons.inner)
        if (paket.inner && !paket.inner.destroyed) pop(paket.inner, { scale: 1.2 })
        floatText(ctx.fxLayer, mons.view.x, mons.view.y - 86, '❗', { fontSize: 46 })
        if (this._t - this._lastTjuvSaid > 15) {
          this._lastTjuvSaid = this._t
          ctx.services.voice.say('Monstret tog ett paket!')
        }
      }
    } else {
      // bär: kutar iväg med paketet över huvudet
      Body.setVelocity(mons.body, { x: 3.1, y: mons.body.velocity.y })
      Body.setPosition(paket.body, { x: mons.body.position.x, y: mons.body.position.y - 68 })
      if (paket.inner && !paket.inner.destroyed) paket.inner.rotation = Math.sin(this._t * 9) * 0.16
      if (mons.view.x > 1400) {
        this._removeTarget(paket) // kom undan — nya paket kommer, aldrig ett straff
        this._thief = null
      }
    }
  },

  // Tjuven tappar bytet: paketet faller ner på trottoaren och går att fånga igen.
  _dropLoot(ctx) {
    const th = this._thief
    if (!th) return
    this._thief = null
    const p = th.paket
    if (p && this._targets.includes(p)) {
      Body.setStatic(p.body, false)
      Body.setVelocity(p.body, { x: rnd(-1.5, 1.5), y: 1.6 })
      p.loosened = true
      p.stuck = false
      if (p.inner && !p.inner.destroyed) {
        p.inner.rotation = 0
        pop(p.inner, { scale: 1.2 })
      }
      if (p.view && !p.view.destroyed) sparkle(ctx.fxLayer, p.view.x, p.view.y, { count: 6 })
      ctx.services.audio.tone({ freq: 659.25, dur: 0.14, type: 'triangle', vol: 0.2 })
    }
    if (th.mons && this._targets.includes(th.mons) && !th.mons.netted) {
      th.mons.walkV = rnd(0.2, 0.7) * (Math.random() < 0.7 ? 1 : -1)
    }
  },

  _gust(ctx) {
    if (this._thief) return // tak: en motgång i taget
    // vindby: blåser loss fästa paket — MEN max 2 lösa samtidigt (tak)
    const loose = this._targets.filter((r) => (r.kind === 'paket') && r.loosened && !r.stuck && !r.netted).length
    if (loose >= 2) return
    const stuck = this._targets.filter((r) => r.kind === 'paket' && r.stuck && r.view.x > 80 && r.view.x < 1240)
    if (!stuck.length) return
    ctx.services.audio.sfx('whoosh')
    const n = Math.min(stuck.length, 2 - loose)
    const picked = stuck.slice(0, n)
    // synliga vind-streck som sveper förbi (exit-säkra proxy-tweens) — de första
    // förankras i höjd med paketen som blåser loss, så orsaken går att SE
    for (let i = 0; i < 3; i++) {
      const anchor = picked[i]?.view && !picked[i].view.destroyed ? picked[i].view.y - 6 : null
      const y = anchor ?? rnd(240, 520)
      const g = new Graphics()
      g.moveTo(0, 0).quadraticCurveTo(60, -14, 130, 0).stroke({ width: 5, color: 0xffffff, alpha: 0.55, cap: 'round' })
      g.position.set(1320, y)
      g.eventMode = 'none'
      ctx.fxLayer.addChild(g)
      const st = { x: 1320 }
      const tw = gsap.to(st, {
        x: -220,
        duration: rnd(0.7, 1.0),
        delay: i * 0.1,
        ease: 'power1.in',
        onUpdate: () => {
          if (g.destroyed) {
            tw.kill()
            return
          }
          g.x = st.x
          g.alpha = 0.7 - Math.abs(640 - st.x) / 1400
        },
        onComplete: () => {
          if (!g.destroyed) g.destroy()
        },
      })
      this._tws.push(tw)
    }
    // Lossningen sker NÄR strecket hunnit fram till paketet (~0,35 s) — inte i
    // samma frame som det dyker upp vid kanten. Orsak före verkan.
    ctx.later(0.35, () => {
      for (const rec of picked) {
        if (!rec.view || rec.view.destroyed || !rec.stuck) continue
        rec.stuck = false
        rec.loosened = true
        Body.setStatic(rec.body, false)
        Body.setVelocity(rec.body, { x: rnd(-4, -2), y: rnd(-7, -4) })
        Body.setAngularVelocity(rec.body, rnd(-0.12, 0.12))
        if (rec.netG && !rec.netG.destroyed) rec.netG.destroy()
        rec.netG = null
        if (rec.inner && !rec.inner.destroyed) wiggle(rec.inner)
      }
    })
  },

  // ------------------------------------------------------------------ hemkomsten
  _homecoming(ctx) {
    if (!this._alive || this._phase !== 'drive') return
    this._phase = 'arrive'
    this._missionActive = false
    this._stopHandPulse()
    for (const b of [...this._balls]) this._killBall(ctx, b, false)
    this._balls = []
    if (this._skata) this._skata.phase = 'flee'
    this._thief = null // gatan töms strax — ingen tjuv kvar att jaga
    if (this._panel && !this._panel.destroyed) {
      gsap.killTweensOf(this._panel)
      this._panelFade = gsap.to(this._panel, { alpha: 0, duration: 0.4 })
    }
    // Gatan töms när bilen bromsar (alla "går hem") — kvarglömda strövare ska inte
    // stå bredvid paradfigurerna och konkurrera om finalögonblicket. Pågående
    // hemdrag (netted) får löpa klart och landa i sätet.
    for (const rec of [...this._targets]) {
      if (rec.netted) {
        rec.walkV = 0
        continue
      }
      if (rec.view && !rec.view.destroyed) puff(ctx.fxLayer, rec.view.x, rec.view.y, { count: 4 })
      this._removeTarget(rec)
    }
    // parallaxen saktar in (proxy-tween på scrollvärdet)
    const st = { v: this._scroll }
    const tw = gsap.to(st, {
      v: 0,
      duration: 1.9,
      ease: 'power2.out',
      onUpdate: () => {
        if (!this._alive) {
          tw.kill()
          return
        }
        this._scroll = st.v
      },
    })
    this._tws.push(tw)
    // hemmet glider fram och stannar mitt i bild
    const house = this._mkHomeHouse()
    house.x = 1560
    this._midLayer.addChild(house)
    this._homeHouse = house
    const hs = { x: 1560 }
    const tw2 = gsap.to(hs, {
      x: 700,
      duration: 1.9,
      ease: 'power2.out',
      onUpdate: () => {
        if (house.destroyed) {
          tw2.kill()
          return
        }
        house.x = hs.x
      },
    })
    this._tws.push(tw2)
    ctx.later(2.1, () => {
      if (!this._alive) return
      ctx.services.voice.say('Nu är vi hemma — vilket äventyr!')
      ctx.services.audio.sfx('reveal')
      this._hopOut(ctx)
    })
    // complete säger PRAISE och avbryter tal — spelets replik måste hinna klart
    ctx.later(3.9, () => {
      if (!this._alive) return
      this._level += 1
      ctx.progress.setLevel(this._level)
      ctx.progress.complete()
    })
    ctx.later(6.8, () => this._startRound(ctx))
  },

  _mkHomeHouse() {
    const c = new Container()
    c.eventMode = 'none'
    const g = new Graphics()
    const bw = 330
    const bh = 215
    const topY = SIDEWALK_TOP - bh
    g.rect(0, topY, bw, bh).fill(0xffe3a9).stroke({ width: 4, color: 0xd9a021 })
    g.moveTo(-20, topY).lineTo(bw / 2, topY - 78).lineTo(bw + 20, topY).closePath().fill(0xc0574f)
    g.rect(bw * 0.72, topY - 52, 20, 46).fill(0x8a5a3b)
    // dörr med runt fönster + trappa
    g.roundRect(bw / 2 - 34, SIDEWALK_TOP - 104, 68, 104, 8).fill(0x8a5a3b)
    g.circle(bw / 2, SIDEWALK_TOP - 76, 12).fill(0xffe9b0)
    g.circle(bw / 2 + 22, SIDEWALK_TOP - 52, 4.5).fill(0xffd35c)
    g.rect(bw / 2 - 44, SIDEWALK_TOP - 10, 88, 10).fill(0xd9c9a8)
    // varma fönster med blomlådor
    for (const wx of [bw * 0.2, bw * 0.8]) {
      g.roundRect(wx - 28, topY + 62, 56, 60, 4).fill(0xffe9b0).stroke({ width: 4, color: 0xfffdf7 })
      g.moveTo(wx, topY + 62).lineTo(wx, topY + 122).moveTo(wx - 28, topY + 92).lineTo(wx + 28, topY + 92).stroke({ width: 3, color: 0xfffdf7 })
      g.roundRect(wx - 32, topY + 122, 64, 10, 4).fill(0x8a5a3b)
      for (let i = 0; i < 3; i++) g.circle(wx - 18 + i * 18, topY + 120, 6).fill([0xff9ec4, 0xff6b6b, 0xffd35c][i])
    }
    // buskar + lykta
    g.circle(-24, SIDEWALK_TOP - 16, 18).fill(0x7fae84)
    g.circle(bw + 26, SIDEWALK_TOP - 14, 15).fill(0x8fbe8f)
    g.eventMode = 'none'
    c.addChild(g)
    return c
  },

  _hopOut(ctx) {
    // alla insamlade hoppar ur och firar framför huset — spelets EGEN finalscen
    const list = this._seatList.slice(-8)
    // huvudena i sätet försvinner (de "hoppar ur")
    for (const h of this._seatHeads) {
      if (h.c && !h.c.destroyed) h.c.destroy({ children: true })
    }
    this._seatHeads = []
    list.forEach((v, i) => {
      ctx.later(0.18 * i, () => {
        if (!this._alive) return
        const fig = v.kind === 'monster' && v.art ? drawMonster(v.art) : KIND_DRAW[v.golden ? 'guldpaket' : v.kind]()
        fig.scale.set(0.7)
        fig.position.set(SEAT.x - 40, SEAT.y)
        fig.eventMode = 'none'
        this._targetLayer.addChild(fig)
        const tx = 660 + i * 56 + rnd(-10, 10)
        const ty = GROUND - 6
        const sx = fig.x
        const sy = fig.y
        const st = { p: 0 }
        const tw = gsap.to(st, {
          p: 1,
          duration: 0.6,
          ease: 'power1.inOut',
          onUpdate: () => {
            if (fig.destroyed) {
              tw.kill()
              return
            }
            fig.x = sx + (tx - sx) * st.p
            fig.y = sy + (ty - sy) * st.p - Math.sin(st.p * Math.PI) * 150
          },
          onComplete: () => {
            if (fig.destroyed) return
            puff(ctx.fxLayer, fig.x, fig.y + 16, { count: 5 })
            if (this._alive) ctx.services.audio.tone({ freq: NOTES[i % NOTES.length], dur: 0.16, type: 'triangle', vol: 0.2 })
          },
        })
        this._tws.push(tw)
        this._outFriends.push({ c: fig, seed: Math.random() * 9, by: ty })
      })
    })
    if (list.length === 0) {
      // inget insamlat (ovanligt men möjligt): huset firar ändå
      sparkle(ctx.fxLayer, 860, 420, { count: 10 })
    }
  },

  _startRound(ctx) {
    if (!this._alive) return
    this._phase = 'drive'
    this._missionsDone = 0
    this._missionActive = false
    this._missionOrder = shuffle(['katt', 'paket', 'ballong'])
    this._journey = 0
    this._biomeFlip = !this._biomeFlip
    this._scrollBase = 2.1 + Math.min(1.0, this._level * 0.12)
    this._seatList = []
    this._thief = null
    this._heistTimer = rnd(15, 22)
    for (const b of [...this._balls]) this._killBall(ctx, b, false)
    this._balls = []
    // gatan töms mjukt (de som blev kvar går hem — puff och borta)
    for (const rec of [...this._targets]) {
      if (rec.view && !rec.view.destroyed) puff(ctx.fxLayer, rec.view.x, rec.view.y, { count: 4 })
      this._removeTarget(rec)
    }
    for (const f of this._outFriends) {
      if (f.c && !f.c.destroyed) {
        puff(ctx.fxLayer, f.c.x, f.c.y, { count: 4 })
        f.c.destroy({ children: true })
      }
    }
    this._outFriends = []
    // hemmets hus lämnas kvar som segment och scrollar av skärmen naturligt
    if (this._homeHouse && !this._homeHouse.destroyed) {
      this._mid.push({ c: this._homeHouse, w: 380, wins: [] })
    }
    this._homeHouse = null
    // farten tillbaka upp
    const st = { v: 0 }
    const tw = gsap.to(st, {
      v: this._scrollBase,
      duration: 1.6,
      ease: 'power1.in',
      onUpdate: () => {
        if (!this._alive) {
          tw.kill()
          return
        }
        this._scroll = st.v
      },
    })
    this._tws.push(tw)
    this._spawnTimer = 1.4
    this._gustTimer = 12
    this._skataTimer = 18
    ctx.later(3.4, () => this._announce(ctx))
  },

  // ------------------------------------------------------------------ tick
  _update(ctx, tk) {
    if (!this._alive) return
    const dtF = Math.min(tk.deltaTime, 2)
    const dtMS = Math.min(tk.deltaMS, 40)
    const dt = dtMS / 1000
    this._t += dt
    const sc = this._scroll * dtF
    this._journey += sc

    this._scrollLayers(ctx, sc)
    this._drawGroundStrips()
    this._shiftBodies(sc)
    this._behave(ctx, dtF)
    this._phys.update(dtMS)
    this._afterPhysics(ctx, dtF)
    this._advanceShots(ctx, dtMS, sc)
    this._drawNets()
    this._healWindows(ctx)
    this._updateSkata(ctx, dtF)
    this._updateProps(ctx, dt, sc)
    this._updateBalls(ctx, dt, sc)
    this._updateThief(ctx)
    this._updateArm(dt, dtF)

    // sätes-vännerna guppar lugnt
    for (const h of this._seatHeads) {
      if (h.c && !h.c.destroyed) h.c.y = h.by + Math.sin(this._t * 3 + h.seed) * 3
    }
    // utsläppta vänner studsar av glädje under hemkomsten
    for (const f of this._outFriends) {
      if (f.c && !f.c.destroyed && Math.abs(f.c.y - f.by) < 30) f.c.y = f.by - Math.abs(Math.sin(this._t * 4 + f.seed)) * 10
    }
    // moln driver
    for (const m of this._clouds) {
      if (m.destroyed) continue
      m.x -= 0.16 * dtF
      if (m.x < -140) m.x = 1420
    }
    if (this._biomeTint && !this._biomeTint.destroyed) this._biomeTint.alpha = this._biomeT() * 0.1

    if (this._phase === 'drive') {
      this._spawnTimer -= dt
      if (this._spawnTimer <= 0) {
        this._spawnTimer = rnd(2.2, 3.4)
        this._spawnTick(ctx)
      }
      this._gustTimer -= dt
      if (this._gustTimer <= 0) {
        this._gustTimer = rnd(12, 17)
        this._gust(ctx)
      }
      this._skataTimer -= dt
      if (this._skataTimer <= 0) {
        this._skataTimer = rnd(19, 26)
        this._spawnSkata(ctx)
      }
      this._heistTimer -= dt
      if (this._heistTimer <= 0) {
        this._heistTimer = rnd(15, 22)
        this._monsterHeist(ctx)
      }
      if (this._missionActive) {
        this._missionT += dt
        if (this._missionT > 24) {
          this._missionT = 0
          // mjuk hjälp, sent och synligt: peka ut ett uppdrags-mål + repetera repliken
          const def = this._missionDef(this._missionKey)
          const m = this._targets.find((r) => def.kinds.includes(r.kind) && !r.netted && r.view.x > 100 && r.view.x < 1200)
          if (m) {
            sparkle(ctx.fxLayer, m.view.x, m.view.y - 30, { count: 8 })
            floatText(ctx.fxLayer, m.view.x, m.view.y - 70, '👆', { fontSize: 56 })
          } else {
            this._spawnTarget(ctx, this._missionKey === 'paket' ? 'paket' : this._missionKey)
          }
          ctx.services.voice.replayLast()
        }
      }
      this._idle += dt
      if (this._idle >= IDLE_DELAY) {
        this._idle = 0
        ctx.services.voice.replayLast()
        const m = this._targets.find((r) => !r.netted && r.view.x > 200 && r.view.x < 1100)
        if (m) {
          sparkle(ctx.fxLayer, m.view.x, m.view.y - 20, { count: 6 })
          floatText(ctx.fxLayer, m.view.x, m.view.y - 66, '👆', { fontSize: 56 })
        }
      }
    }
  },

  _scrollLayers(ctx, sc) {
    // fjärran siluetter
    for (const s of this._far) s.c.x -= sc * 0.35
    while (this._far.length && this._far[0].c.x + this._far[0].w < -80 - BLEED_X) {
      const s = this._far.shift()
      s.c.destroy({ children: true })
    }
    let farEdge = this._far.length ? this._far[this._far.length - 1].c.x + this._far[this._far.length - 1].w : 1400
    while (farEdge < 1500 + BLEED_X) {
      const s = this._mkFarSeg(this._biomeT())
      s.c.x = farEdge
      this._farLayer.addChild(s.c)
      this._far.push(s)
      farEdge += s.w
    }
    // gatuplanets hus
    for (const s of this._mid) s.c.x -= sc
    while (this._mid.length && this._mid[0].c.x + this._mid[0].w < -120 - BLEED_X) {
      const s = this._mid.shift()
      for (const win of s.wins) {
        if (win.state === 'broken') this._brokenCount = Math.max(0, this._brokenCount - 1)
      }
      s.c.destroy({ children: true })
    }
    let midEdge = this._mid.length ? this._mid[this._mid.length - 1].c.x + this._mid[this._mid.length - 1].w : 1400
    while (midEdge < 1560 + BLEED_X) {
      const s = this._mkMidSeg(ctx, this._biomeT())
      s.c.x = midEdge
      this._midLayer.addChild(s.c)
      this._mid.push(s)
      if (s._wxPotAt) this._spawnPotAt(ctx, s)
      midEdge += s.w
    }
  },

  _drawGroundStrips() {
    const g = this._groundG
    if (!g || g.destroyed) return
    g.clear()
    // trottoar-skarvar (gatuplanets fart)
    const off1 = this._journey % 96
    for (let x = -off1 - 4 * 96; x < 1300 + BLEED_X; x += 96) {
      g.moveTo(x, SIDEWALK_TOP + 6).lineTo(x - 6, SIDEWALK_BOT - 2).stroke({ width: 3, color: 0xb9b3a6, alpha: 0.7 })
    }
    // vägkantens streck (närmast → snabbast)
    const off2 = (this._journey * 1.7) % 140
    for (let x = -off2 - 2 * 140; x < 1320 + BLEED_X; x += 140) {
      g.roundRect(x, SIDEWALK_BOT + 26, 58, 9, 4).fill({ color: 0xd8d3c8, alpha: 0.6 })
    }
    // små fartstreck vid kantstenen
    const off3 = (this._journey * 1.7) % 64
    for (let x = -off3 - 4 * 64; x < 1300 + BLEED_X; x += 64) {
      g.moveTo(x, SIDEWALK_BOT + 3).lineTo(x + 20, SIDEWALK_BOT + 3).stroke({ width: 3, color: 0xffffff, alpha: 0.2 })
    }
  },

  // Kameran åker framåt = världen (alla kroppar) flyttas bakåt. setPosition
  // translaterar positionPrev med → farten bevaras (matter 0.20).
  _shiftBodies(sc) {
    if (sc === 0) return
    for (const rec of this._targets) {
      const p = rec.body.position
      Body.setPosition(rec.body, { x: p.x - sc, y: p.y })
    }
    for (const b of this._balls) {
      const p = b.body.position
      Body.setPosition(b.body, { x: p.x - sc, y: p.y })
    }
  },

  _behave(ctx, dtF) {
    for (const rec of this._targets) {
      const b = rec.body
      if (rec.netted) {
        // DRAGNÄTET ÄR ETT GUMMIBAND, inte en linjär hemfärd: vinschen kortar
        // repets vilolängd (rec.reel) och en fjäder drar kroppen mot handen med
        // kraft i proportion till hur mycket repet är STRÄCKT. Hinner kroppen
        // ikapp vinschen blir repet slakt, fjädern släpper helt och tyngdkraften
        // får sista ordet en kort stund — sedan tar nästa ryck. Det är rycken
        // som gör att det känns elastiskt.
        const hand = this._handPos()
        const dx = hand.x - b.position.x
        const dy = hand.y - b.position.y
        const d = Math.hypot(dx, dy) || 1
        if (d < CATCH_R) {
          this._collect(ctx, rec)
          continue
        }
        // Veven har EGEN klocka per fångst och startar mitt i ett tag. Med spelets
        // globala tid + slumpat frö avgjorde slumpen om en paus alls hann inträffa
        // under hemfärden — samma avstånd gav 0 eller 2 ryck olika gånger.
        rec.reelT = (rec.reelT || 0) + dtF / 60
        const sin = Math.sin(rec.reelT * REEL_HZ + REEL_FAS)
        const vev = sin > REEL_TRO ? (sin - REEL_TRO) / (1 - REEL_TRO) : 0
        rec.reel = Math.max(0, rec.reel - ((rec.reelRate || 6) / DUTY_MEAN) * vev * dtF)
        const stretch = d - rec.reel
        let vx = b.velocity.x
        let vy = b.velocity.y
        if (stretch > 0) {
          const a = Math.min(stretch * REEL_K, REEL_AMAX) * dtF
          vx += (dx / d) * a
          vy += (dy / d) * a
          const vmax = rec.vmax || REEL_VMAX
          const along = (vx * dx + vy * dy) / d
          if (along > vmax) {
            vx -= (dx / d) * (along - vmax)
            vy -= (dy / d) * (along - vmax)
          }
          vx *= REEL_DAMP
          vy *= REEL_DAMP
          // nytt vevtag som spänner ett slakt rep → armen får mothåll
          if (rec.slack && stretch > 6) this._recoil = Math.max(this._recoil, 0.3)
          rec.slack = false
        } else {
          // slakt rep: kroppen har hunnit ikapp vinschen — den bromsar in och
          // sjunker tills nästa vevtag hinner spänna repet igen
          rec.slack = true
          vx *= SLACK_DAMP
          vy *= SLACK_DAMP
        }
        Body.setVelocity(b, { x: vx, y: vy })
        continue
      }
      if (rec.stuck) continue
      if (rec.kind === 'fagel') {
        Body.setVelocity(b, { x: -0.5, y: Math.sin(this._t * 2.4 + rec.seed) * 0.9 })
      } else if (rec.kind === 'ballong') {
        Body.setVelocity(b, { x: Math.sin(this._t * 1.6 + rec.seed) * 0.4, y: -0.75 })
      } else if (rec.walkV !== 0 && this._phase === 'drive') {
        // promenad på trottoaren (bara när kroppen står nästan stilla vertikalt)
        if (Math.abs(b.velocity.y) < 1.2) Body.setVelocity(b, { x: rec.walkV, y: b.velocity.y })
      }
    }
  },

  _afterPhysics(ctx, dtF) {
    for (let i = this._targets.length - 1; i >= 0; i--) {
      const rec = this._targets[i]
      const { x, y } = rec.body.position
      // städning utanför bild
      if (x < -180 || x > 1560 || y < -170 || y > 880) {
        this._removeTarget(rec)
        continue
      }
      // eget liv: gupp, vingslag, guld-glitter
      if (rec.inner && !rec.inner.destroyed) {
        if (rec.snarjd) {
          rec.inner.rotation = (rec.lieNu || 0) + Math.sin(this._t * 5.5 + rec.seed) * 0.05 // ligger ner och sprattlar
        } else if (rec.stuck) {
          rec.inner.rotation = Math.sin(this._t * 2.2 + rec.seed) * 0.05
        } else if (rec.kind !== 'paket' && rec.kind !== 'kruka') {
          rec.inner.y = Math.sin(this._t * 3.2 + rec.seed) * 2.5
        }
        const wing = rec.inner.children[0]?._wxWing
        if (wing && !wing.destroyed) {
          if (rec.kind === 'fagel') wing.rotation = Math.sin(this._t * 15 + rec.seed) * 0.6
          else if (rec.inner.children[0]._wxArt === 'flaxis') wing.rotation = Math.sin(this._t * 9 + rec.seed) * 0.3
          else wing.rotation = Math.sin(this._t * 1.8 + rec.seed) * 0.05 // krukans blomma svajar
        }
      }
      if (rec.golden && this._t - (rec.sparkAt || 0) > 1.1) {
        rec.sparkAt = this._t
        if (rec.view.x > -20 && rec.view.x < 1300) sparkle(ctx.fxLayer, rec.view.x + rnd(-20, 20), rec.view.y - rnd(0, 30), { count: 2 })
      }
    }
  },

  _removeTarget(rec) {
    const i = this._targets.indexOf(rec)
    if (i >= 0) this._targets.splice(i, 1)
    this._phys.removeBody(rec.body)
    if (rec.view && !rec.view.destroyed) {
      gsap.killTweensOf(rec.view)
      rec.view.destroy({ children: true })
    }
  },

  // ------------------------------------------------------------------ skott-animering
  _advanceShots(ctx, dtMS, sc) {
    const dtF = dtMS / 16.667
    const hand = this._handPos()
    for (let i = this._shots.length - 1; i >= 0; i--) {
      const s = this._shots[i]
      if (s.phase === 'fly') {
        // följ målet under flykten (nätet "jagar" träffpunkten)
        if (s.rec && this._targets.includes(s.rec)) {
          s.ex = s.rec.view.x
          s.ey = s.rec.view.y
        } else if (s.win) {
          s.ex = s.seg.c.x + s.win.lx
          s.ey = s.win.cy
        } else if (s.skata && this._skata && !this._skata.c.destroyed) {
          s.ex = this._skata.c.x
          s.ey = this._skata.c.y
        } else if (s.prop && s.prop.c && !s.prop.c.destroyed) {
          s.ex = s.prop.c.x
          s.ey = s.prop.c.y - (s.prop.def.hojd || 90) * 0.45
        } else if (s.mons && s.mons.win.mc && !s.mons.win.mc.destroyed) {
          s.ex = s.mons.seg.c.x + s.mons.win.lx
          s.ey = s.mons.win.cy + 6
        }
        s.p += dtMS / SHOT_MS
        // repet piskar efter spetsen: spänt (sag < 1) medan linan skjuts ut
        const tipX = hand.x + (s.ex - hand.x) * s.p
        const tipY = hand.y + (s.ey - hand.y) * s.p
        if (s.rope) stepRope(s.rope, hand.x, hand.y, tipX, tipY, dtF, 0.98)
        if (s.p >= 1) {
          s.p = 1
          this._resolveShot(ctx, s)
          if (s.phase === 'fly') this._shots.splice(i, 1) // träff hanterad → skottet klart
        }
      } else if (s.phase === 'wall') {
        s.ex -= sc // missnätet sitter på husväggen och åker med
        s.life -= dtMS / 900
        // linan tappar spänsten och hänger allt slakare innan den tonar bort
        if (s.rope) stepRope(s.rope, hand.x, hand.y, s.ex, s.ey, dtF, 1 + (1 - s.life) * 0.5)
        if (s.life <= 0) this._shots.splice(i, 1)
      }
    }
    // repen till kropparna som vinschas hem: sag = vilolängd / verkligt avstånd
    for (const rec of this._targets) {
      if (!rec.netted || !rec.rope) continue
      const d = Math.hypot(hand.x - rec.view.x, hand.y - rec.view.y) || 1
      stepRope(rec.rope, hand.x, hand.y, rec.view.x, rec.view.y, dtF, clamp((rec.reel ?? d) / d, 0.9, 1.6))
    }
  },

  _drawNets() {
    const g = this._netG
    if (!g || g.destroyed) return
    g.clear()
    const hand = this._handPos()
    for (const s of this._shots) {
      if (s.phase === 'fly') {
        const x = hand.x + (s.ex - hand.x) * s.p
        const y = hand.y + (s.ey - hand.y) * s.p
        if (s.rope) strokeRope(g, s.rope, { width: 5 })
        else g.moveTo(hand.x, hand.y).lineTo(x, y).stroke({ width: 5, color: 0xf6f6f2, alpha: 0.9 })
        g.circle(x, y, 7 + s.p * 5).fill({ color: 0xffffff, alpha: 0.9 })
      } else {
        // kort fastnat nät på väggen som tonar bort — med slak lina kvar till handen
        const a = Math.max(0, s.life)
        if (s.rope) strokeRope(g, s.rope, { width: 4, alpha: 0.75 * a })
        g.moveTo(0, 0) // säkra att inget implicit streck dras från origo
        const r = 34
        for (let k = 0; k < 8; k++) {
          const ang = (k / 8) * Math.PI * 2
          g.moveTo(s.ex, s.ey).lineTo(s.ex + Math.cos(ang) * r, s.ey + Math.sin(ang) * r)
        }
        g.stroke({ width: 3, color: 0xf6f6f2, alpha: 0.8 * a })
        g.circle(s.ex, s.ey, r * 0.55).stroke({ width: 2, color: 0xf6f6f2, alpha: 0.6 * a })
      }
    }
    // dragnätets rep: hand → varje kropp på väg hem. Slakt rep hänger i en båge,
    // spänt rep blir nästan rakt — man SER vinschen jobba.
    for (const rec of this._targets) {
      if (!rec.netted || !rec.rope) continue
      strokeRope(g, rec.rope, { width: 4.5, alpha: rec.slack ? 0.7 : 0.92 })
    }
  },

  _updateArm(dt, dtF) {
    const a = this._arm
    if (!a || a.destroyed) return
    this._armAim *= Math.max(0, 1 - 2.2 * dt)
    a.rotation += (this._armAim - a.rotation) * Math.min(1, 0.3 * dtF)
    this._recoil = Math.max(0, this._recoil - 5.5 * dt)
    const bob = Math.sin(this._t * 1.7) * 5 // vilo-guppning
    a.y = ARM_PIVOT.y + bob + this._recoil * 26
  },

  // ------------------------------------------------------------------ kollisioner
  _onCollision(ctx, e) {
    if (!this._alive) return
    for (const pair of e.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB
      const mark = a.label === 'mark' ? a : b.label === 'mark' ? b : null
      if (!mark) continue
      const other = mark === a ? b : a
      const spd = Math.hypot(other.velocity.x, other.velocity.y)
      if (spd > 3.5 && this._t - (this._lastBoing || 0) > 0.25) {
        this._lastBoing = this._t
        if (!ctx.services.audio.sample('boing')) ctx.services.audio.sfx('pop')
        const rec = this._targets.find((r) => r.body === other)
        if (rec && rec.view && !rec.view.destroyed) {
          puff(ctx.fxLayer, rec.view.x, rec.view.y + rec.r * 0.6, { count: 4, color: 0xd8d3c8 })
          if (rec.inner && !rec.inner.destroyed) wiggle(rec.inner)
        }
      }
    }
  },

  // ------------------------------------------------------------------ städning
  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbind?.()
    for (const tw of this._tws) tw?.kill()
    this._tws = []
    this._stopHandPulse()
    this._panelFade?.kill()
    if (this._surface && !this._surface.destroyed) this._surface.off('pointertap', this._onTapH)
    for (const h of this._sidoTaps || []) {
      if (h.c && !h.c.destroyed) {
        h.c.off('pointerdown', h.ned)
        h.c.off('pointerup', h.upp)
        h.c.off('pointerupoutside', h.upp)
        h.c.off('pointertap', h.tap)
        gsap.killTweensOf(h.c)
        gsap.killTweensOf(h.c.scale)
      }
    }
    this._sidoTaps = []
    this._sidoHander = []
    if (this._panel && !this._panel.destroyed) {
      gsap.killTweensOf(this._panel)
      gsap.killTweensOf(this._panel.scale)
    }
    if (this._arm && !this._arm.destroyed) {
      gsap.killTweensOf(this._arm)
      gsap.killTweensOf(this._arm.scale)
    }
    for (const rec of this._targets) {
      if (rec.view) {
        gsap.killTweensOf(rec.view)
        if (rec.view.scale) gsap.killTweensOf(rec.view.scale)
      }
      if (rec.inner) {
        gsap.killTweensOf(rec.inner)
        if (rec.inner.scale) gsap.killTweensOf(rec.inner.scale)
      }
      if (rec.netG && rec.netG.scale) gsap.killTweensOf(rec.netG.scale)
      if (rec.snarjG && rec.snarjG.scale) gsap.killTweensOf(rec.snarjG.scale)
      gsap.killTweensOf(rec) // liggande-tweenen skriver på rec.lieNu
    }
    for (const seg of this._mid) {
      for (const win of seg.wins || []) {
        if (win.mc && win.mc.scale) gsap.killTweensOf(win.mc.scale)
        if (win.mc && win.mc._wxNet && win.mc._wxNet.scale) gsap.killTweensOf(win.mc._wxNet.scale)
      }
    }
    for (const h of this._seatHeads) {
      if (h.c) {
        gsap.killTweensOf(h.c)
        if (h.c.scale) gsap.killTweensOf(h.c.scale)
      }
    }
    for (const f of this._outFriends) {
      if (f.c) {
        gsap.killTweensOf(f.c)
        if (f.c.scale) gsap.killTweensOf(f.c.scale)
      }
    }
    if (this._skata?.c?.scale) gsap.killTweensOf(this._skata.c.scale)
    this._targets = []
    this._shots = []
    this._far = []
    this._mid = []
    this._seatHeads = []
    this._outFriends = []
    for (const b of this._balls || []) {
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view)
        if (b.view.scale) gsap.killTweensOf(b.view.scale)
      }
    }
    for (const p of this._props || []) {
      if (p.c && !p.c.destroyed) {
        gsap.killTweensOf(p.c)
        if (p.c.scale) gsap.killTweensOf(p.c.scale)
      }
    }
    this._props = []
    this._balls = []
    this._skata = null
    this._thief = null
    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
