// MATA PAPPA — första spelet i ansiktssektionen (`docs/IDEER.md` post 2).
//
// Spelfiguren är ett RIKTIGT foto, uppskuret i lager av `npm run ansikte` och riggat av
// `lib/ansikte.js`: käken sjunker, munnen tuggar, ögonen blinkar och en hel grimas
// korsbleks in ovanpå. Barnet drar mat från tallriken till munnen; ansiktets min ÄR
// återkopplingen (P0: ljud+bild <100 ms, noll läsning).
//
// Två saker som materialet och riggen tvingar fram, och som inte får glömmas bort:
//
// ⚠️ MUNNEN ÄR ETT MÅL SOM ALDRIG FÅR RÖRA SIG. Riggen andas (inre containerns skala) och
//    `DragController` mäter avståndet till `target.view.x/y` NÄR maten släpps. Målnoden
//    ligger därför i spelets eget lager på en fast punkt — aldrig som barn till ansiktet.
//    (Samma fälla som sänkte `sortera-skrap`s tunnor: släpp 2 px utanför radien.)
//
// ⚠️ MIN-LAGRET LIGGER ÖVERST och bär sin egen mun. Ett tugg bakom en kvarhängande grimas
//    syns inte — varje ny matbit släpper den förra minen (`slappMin`) innan käken rör sig.
//
// BUS är en feature, inte ett fel (P0 MOTGÅNG): släpps maten på kinden, pannan eller håret
// fastnar den och blir gegga. Det fyller inte mättnadsmätaren, men det bestraffas aldrig —
// pappa blir förvånad, säger aj eller fnissar, och geggan sitter kvar till rapfinalen.
import { Circle, Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { ANS, BANK_Y, BRADA, BUS_NER, FYSIK, KANT_Y, MARKEN, MARKE_MAX, MATARE, OPPNA_MAX, PLATSER, byggKok, ritaMarke } from './kok.js'
import { arAtbar, makeSak, sakFarg, sakMaterial, sakMin, sakPruttar } from './skafferi.js'
import { DragController } from '../../lib/DragController.js'
import { Body, PhysicsWorld, mat } from '../../lib/physics.js'
import { FLUIDS, FluidView, FluidWorld } from '../../lib/vatska.js'
import { makeMjukkropp } from '../../lib/mjukkropp.js'
import { FOODS, MAT_STARK, makeFood, foodColor } from '../../lib/mat.js'
import { Ansikte, laddaAnsikte } from '../../lib/ansikte.js'
import { burst, kvittera, liv, pop, puff, ripple, sparkle, shake, wiggle } from '../../lib/feedback.js'
import { spray } from '../../lib/partiklar.js'
import { PLAYFUL } from '../../lib/theme.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'

// --- geometri (designkoordinater 1280×720) ---
// ANS · PLATSER · MATARE · BRADA bor i `kok.js`: köksön räknas ur ansiktets halslinje, och
// maten ligger på skärbrädan som köket ritar. En andra uppsättning tal här hade drivit isär.
const MUN_R = 130                // snäppradie till munnen (P0: träffyta ≫96 px)
// Ansiktets träffyta — utanför den är det en ren miss.
//
// ⚠️ DEN FÖLJER FOTOTS KONTUR, INTE EN ELLIPS. Ägaren speltestade v1.204.0 och skrev
// "hitboxen för huvudet går ej längs masken (fyrkantig låda utanför ansiktet)".
// `_silprobe.mjs` mätte upp den gamla ellipsen (rx 215): **32,0 % av zonen låg på tom
// bakgrund** — kastad mat exploderade i gegga en bit vid sidan av huvudet — **samtidigt som
// 18,8 % av det synliga ansiktet låg utanför zonen**. Fel åt båda hållen på en gång är fel
// FORM, inte fel storlek, och att bara krympa ellipsen byter ut det ena felet mot det andra
// (rx 124 → 31,9 % missat ansikte). `Ansikte.traffar()` prövar mot silhuetten rad för rad,
// mätt ur basens alfa: 0,0 / 0,0.
//
// Ellipsen står kvar som RESERV för en klippning utan `geometri.silhuett` i manifestet —
// samma nedgradering som blicken och winken gör när lagren saknas.
const BUS = { rx: 215, ry: 250, ryNer: BUS_NER }
// Marginalen är den kastade sakens radie (`_gorLos` bygger en sjuhörning med radie 34), inte
// ett stämt tal: med den blir frågan "rörde biten vid honom", vilket är vad ögat ser, i
// stället för "låg bitens MITTPUNKT på honom".
const MAT_R = 34
const GRIP_R = 52

// KASTET (ägaruppdrag 2, steg 4). Talen är px/STEG där matter räknar och px/ms där
// pekskärmen gör det — de två blandas ihop en gång per fysikspel, och `perSteg` är hela
// omräkningen (ett fast steg är 16,67 ms, alltså är 1 px/ms = 16,67 px/steg).
//
// ⚠️ `lyft` är inte fusk för fuskets skull. Utan den beskriver en kastad brödbit en riktig
// kastparabel över 250 px, och att sikta en parabel är inget en 2-åring kan lära sig av
// att se den en gång. Med tyngdkraften nästan borttagen MEDAN biten flyger blir regeln
// "den flyger dit du pekar" — den går att lära sig på ett kast — och så fort den stannar
// eller träffar något faller den som allt annat på bänken.
const KAST = {
  fart: 0.85, // px/ms — under detta är ett snabbt släpp bara ett släpp
  perSteg: 16.67,
  tak: 26, // px/steg
  lyft: 0.82, // andel av tyngdkraften som tas bort under flykten
  steg: 150, // tak på hur länge en bit räknas som flygande (~2,5 s)
  stopp: 2.2, // px/steg — långsammare än så är det inte längre ett kast
  prov: 14, // px mellan punkterna i det SVEPTA testet (≪ minsta träffytan, 130 px)
}
const GEGGA_MAX = 6 // P0 MOTGÅNG: tak på hur mycket som kan gå fel samtidigt
const LOSA_MAX = 8  // samma sorts tak för högen på bänken

// ÖNSKAN — pappa får en lust till EN av bitarna på brädan.
//
// Varför den finns: målet var "N tuggor", aldrig "vilka", så varje matbit var exakt lika
// rätt och draget var ett val utan konsekvens (kvalitetsgrindens punkt 1). Nu betyder det
// något VILKEN bit man tar — men bara uppåt.
//
// ⚠️ DEN FÅR ALDRIG LÄSA SOM EN UPPGIFT (P0: aldrig stress, aldrig skam). Därför:
//   · ingen timer och ingen nedräkning — önskan väntar hur länge som helst,
//   · fel bit är inte fel: den äts precis lika glatt och mätaren stiger lika mycket,
//   · önskan kräver MINST TVÅ bitar på brädan — en önskan om den enda saken som finns är
//     ingen valmöjlighet, bara en order,
//   · repliken är GENERISK ("den där"), aldrig ett matnamn: barnet läser ringen och
//     blicken (P0 NAVIGATION, noll läsning) — och 64 saker hade krävt 64 röstklipp.
const ONSKAN = {
  efterTugga: 2.2, // s innan nästa önskan får komma (minen och repliken hinner först)
  forstaGang: 3.4, // s efter en ny tallrik — introrepliken ska höras klart
  byte: 16000,     // ms innan han provar en ANNAN bit; en ring som aldrig rör sig blir tapet
  ringR: 64,       // ≫ matens halvbredd, så ringen OMSLUTER biten i stället för att skära den
  //                  (brädplatserna ligger 146 px isär → 18 px luft mellan två ringar,
  //                  och bara en bit i taget bär ring)
}
const ONSKE_REPLIKER = [
  'Åh, den där ser god ut!',
  'Pappa vill smaka den där!',
  'Mmm, vad pappa vill ha den där!',
]

// Vilka saker som bär vätska, och vilken. Varken apelsinsaft eller mjölk finns i `FLUIDS`
// (den har rött och vitt saknas helt), så de två har egna tal. Saften är GLASETS färg —
// `FLUIDS.saft` är röd och läste som utspillt bär mitt i ett orange glas.
// EN vätskevärld bär alla fyra, färgade per partikel via `FluidView.palette` — det är
// precis vad biblioteket har den för. Alternativet (en värld per vätska) hade betytt fyra
// uppsättningar sprites och fyra filterpass för något barnet ser ett i taget.
const VATSKOR = [
  { key: 'vatten', color: 0x5ec8f0 },      // kranen
  { key: 'glas_saft', color: 0xf59a2e },   // apelsinsaft — GLASETS färg, inte FLUIDS röda
  { key: 'mjolk', color: 0xf6fbfd },
  { key: 'honung', color: FLUIDS.honung.color },
  { key: 'ketchup', color: 0xd8402c },     // kylens busflaska — hälls som allt annat
  // Senapen MÅSTE kunna hällas: den ritas i samma klämflaske-stil som ketchupen, och ett
  // barn som just lärt sig att ketchup rinner när man lutar den provar samma sak igen.
  // En flaska som ser likadan ut men inte lyder samma regel är en bruten orsak-verkan.
  { key: 'senap', color: 0xe8c22e },
]
const PALETT = VATSKOR.map((v) => v.color)
const SPILL = Object.fromEntries(VATSKOR.map((v, i) => [v.key, i]))

// Diskhons botten och sidor, som kranens vatten samlas i. Ovalen i bilden ligger på
// (322, 240) med rx 56 — kärlet ritas en aning innanför den så vattnet syns i porslinet.
const HO = { x: 322, y: 240, bottenY: 258, v: 264, h: 380 }

// Vilken min varje mat framkallar. Chilin och citronen är hela poängen med att en sur
// och en het min finns — resten fördelas så att en tallrik sällan ger samma grimas två
// gånger i rad.
const MIN_PER_MAT = {
  lemon: 'sur',
  chili: 'het',
  broccoli: 'acklad',
  carrot: 'fundersam',
  corn: 'fundersam',
  tomato: 'fundersam',
  pear: 'fundersam',
  grape: 'skratt',
  watermelon: 'skratt',
  lollipop: 'skratt',
}

// HUR NÅGOT TUGGAS. Käken gjorde tidigare exakt samma sak för allt: `tugga(3)` med
// förvald takt, plus tre triangelvågstoner på ett eget schema. Det är det ljud och den
// rörelse barnet ser och hör OFTAST i hela spelet, och den sa ingenting om vad han åt.
//
// ⚠️ Premissen prövad mot koden först: `sakMaterial(key)` finns redan — men den är fysikens
// material (metall · trä), den styr studsen på bänken, och ALL brädmat är hårdkodad till
// `tra`. Den kunde alltså inte bära det här. Tuggklassen är därför en egen tabell.
//
// `onTugg` i riggen ger ljudet vid varje sammanbitning, så knastret ligger på käkens egen
// takt även när takten byts — ett eget schema hade drivit isär i samma sekund.
export const TUGG = {
  knaprig: { n: 5, takt: 0.075, djup: 0.62, klipp: 'tugg_knaprig', ton: 690, typ: 'square', vol: 0.1 },
  seg: { n: 2, takt: 0.2, djup: 0.9, klipp: 'tugg_seg', ton: 150, typ: 'sine', vol: 0.2 },
  mjuk: { n: 3, takt: 0.11, djup: 0.75, klipp: 'tugg_mjuk', ton: 200, typ: 'triangle', vol: 0.2 },
  dryck: { n: 1, takt: 0.17, djup: 0.45, klipp: 'klunk', ton: 280, typ: 'sine', vol: 0.18 },
}
// Bara det som avviker från `mjuk` behöver stå här. Nycklarna är både `mat.js` (brädan)
// och `skafferi.js` (köket) — samma drag, samma mun, samma tabell.
const TUGG_KLASS = {}
for (const k of ['apple', 'carrot', 'corn', 'broccoli', 'cookie', 'gurka', 'is', 'pommes',
  'kringla', 'popcorn', 'pepparkaka', 'saltgurka', 'kaka', 'bacon', 'oliv', 'sallad']) TUGG_KLASS[k] = 'knaprig'
for (const k of ['banana', 'banan', 'candy', 'lollipop', 'godis', 'honung', 'sylta', 'ost',
  'korv', 'kyckling', 'choklad', 'munk', 'smor', 'paj', 'glass']) TUGG_KLASS[k] = 'seg'
for (const k of ['glas_saft', 'mjolk', 'ketchup', 'senap']) TUGG_KLASS[k] = 'dryck'
// Namngiven export enbart för sonden: den ska läsa VÄNTAT antal tuggor ur spelets egen
// tabell. En kopia i sondfilen hade drivit isär från spelet vid första ändringen, och då
// mäter sonden sin egen tabell i stället för koden.
export const tuggProfil = (key) => TUGG[TUGG_KLASS[key] || 'mjuk']

// Pappas egna uttrycksljud är INSPELADE klipp (ägaren spelar in dem själv). De finns inte
// än, så varje min bär också en stämd reserv: två toner som säger samma sak i musik.
// `harSample` frågar först — annars hade varje tugg flaggat `saknat-ljudklipp` i testloggen.
const ROST = {
  sur: { klipp: 'pappa_surt', ton: [560, 300], typ: 'sine' },
  acklad: { klipp: 'pappa_blaa', ton: [420, 190], typ: 'sawtooth' },
  het: { klipp: 'pappa_aaah', ton: [300, 820], typ: 'sine' },
  lycksalig: { klipp: 'pappa_mmm', ton: [440, 660], typ: 'sine' },
  fundersam: { klipp: 'pappa_ohh', ton: [400, 470], typ: 'sine' },
  forvanad: { klipp: 'pappa_oj', ton: [520, 780], typ: 'sine' },
  aj: { klipp: 'pappa_aj', ton: [700, 430], typ: 'triangle' },
  skratt: { klipp: 'pappa_fniss', ton: [600, 760], typ: 'triangle' },
  nojd: { klipp: 'pappa_rap', ton: [240, 105], typ: 'sawtooth' },
  // De fyra nya minerna (v1.199). Klippnamnen finns innan filerna gör det — det är hela
  // poängen med `harSample`: ägaren lägger `pappa_gasp.mp3` i `public/audio/sfx/` och
  // gäspningen har röst i samma sekund, utan en rad kod. Tills dess den stämda reserven.
  gasp: { klipp: 'pappa_gasp', ton: [300, 200], typ: 'sine' },
  chock: { klipp: 'pappa_chock', ton: [420, 900], typ: 'sine' },
  skeptisk: { klipp: 'pappa_hmm', ton: [330, 296], typ: 'sine' },
  retas: { klipp: 'pappa_retas', ton: [560, 700], typ: 'triangle' },
}

export default {
  id: 'mata-munnen',
  titleSv: 'Mata Pappa',
  icon: '😋',
  category: 'roligt',
  input: 'drag',
  ageRange: [2, 5],
  voiceIntro: 'Mata pappa med maten på tallriken!',

  async init(ctx) {
    this._alive = true
    this._busy = false
    this._idle = 0
    this._atna = 0
    this._gapNu = 0 // spelmodulen är en singleton — gapet får inte ärvas från förra omgången
    this._fonsterVaxel = 0
    this._kokOverT = 0
    this._geggor = []
    this._cueVaxel = 0
    this._oppnaSt = []
    this._stationer = []
    this._vatten = false
    this._spisPa = false
    this._flaktPa = false
    this._losa = []
    this._onskan = null
    this._onskanT = 0
    // Spelmodulen är en singleton: allt märkestillstånd måste nollas här, annars ärver
    // nästa omgång förra rundans räknare och ritar märken på en dörr som inte finns.
    this._markeL = null
    this._markeNoder = []
    this._marken = 0
    this._markeSagt = false
    this._markeReplik = null
    this._pappaTill = 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Lagerordning — den är hela lösningen på det svävande huvudet:
    //   köket bakom → ansikte → gegga (ovanpå ansiktet) → KÖKSÖN (framför ansiktet, skär
    //   halsen) → burken och annat som står på bänken → mat (överst, så en bit som dras
    //   aldrig försvinner bakom hakan eller under bänkskivan).
    const kok = byggKok(ctx)
    this._noder = kok.noder
    this._root.addChild(kok.bakgrund)

    this._ansL = new Container()
    this._ansL.eventMode = 'none'
    this._root.addChild(this._ansL)

    this._geggaL = new Container()
    this._geggaL.eventMode = 'none'
    this._geggaL.interactiveChildren = false
    this._root.addChild(this._geggaL)

    this._root.addChild(kok.framgrund)

    // Kökets träffytor. Ligger ovanför köksön (så öns luckor går att trycka på) men
    // under maten (så en matbit alltid vinner pekningen över luckan bakom den).
    this._klickL = new Container()
    this._root.addChild(this._klickL)

    this._propL = new Container()
    this._propL.eventMode = 'none'
    this._root.addChild(this._propL)

    // Vätskelagret ligger UNDER maten: en pöl är på bänken, inte ovanpå det som ligger där.
    this._vatskaL = new Container()
    this._vatskaL.eventMode = 'none'
    this._root.addChild(this._vatskaL)

    this._matL = new Container()
    this._root.addChild(this._matL)

    this._ritaMatare()

    // Ansiktet. Foton kan saknas i ett halvbyggt bygge — då ska spelet inte krascha,
    // bara sakna sin figur (medvetet: ingen ritad reservfigur, se beslut 6 i IDEER).
    try {
      const data = await laddaAnsikte('pappa')
      if (!this._alive) return
      this._ans = new Ansikte(data, { hojd: ANS.h })
      this._ans.view.position.set(ANS.x, ANS.y)
      this._ansL.addChild(this._ans.view)
      const g = data.manifest.geometri
      const k = ANS.h / data.manifest.ruta.h
      this._munY = ANS.y + (g.mun.y + g.mun.h / 2 - data.manifest.ruta.h / 2) * k
      this._ogonY = ANS.y + (g.ogonlinje - data.manifest.ruta.h / 2) * k
    } catch (e) {
      console.warn('mata-munnen: ansiktet kunde inte laddas —', e?.message || e)
      this._munY = ANS.y + 87
      this._ogonY = ANS.y - 37
    }

    // Munnen som släppmål: en egen, ORÖRLIG nod. Den ligger i SAMMA container som maten
    // (`_matL`) eftersom `DragController` jämför släppunkten i sitt `space` med målets
    // `x/y` — mål och föremål måste läsa samma koordinatsystem.
    this._mun = new Graphics().circle(0, 0, MUN_R).fill({ color: 0xffffff, alpha: 0 })
    this._mun.position.set(ANS.x, this._munY)
    this._mun.hitArea = new Circle(0, 0, MUN_R)
    this._matL.addChild(this._mun)

    this._drag = new DragController({ space: this._matL, services: ctx.services })
    this._drag.addTarget(this._mun, () => true, { hitRadius: MUN_R })

    this._startaFysik(ctx)
    this._nyTallrik(ctx)
    this._byggStationer(ctx, kok.stationer)
    this._ritaMarken(ctx)

    this._tick = (t) => this._update(ctx, t.deltaMS)
    ctx.ticker.add(this._tick)

    this._root.eventMode = 'static'
    this._root.hitArea = new Circle(ctx.width / 2, ctx.height / 2, 4000)
    this._vakna = (e) => this._tomtTryck(ctx, e)
    this._root.on('pointerdown', this._vakna)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._ans?.liv(true)
  },

  // Varje pekning ska ge ljud+bild inom 100 ms (P0 ÅTERKOPPLING) — även den som landar
  // på bordsduken. En ring och en mjuk ton, aldrig en tillsägelse. Tryck på maten eller
  // munnen har redan sin egen återkoppling och bubblar hit; dem rör vi inte.
  _tomtTryck(ctx, e) {
    this._idle = 0
    if (!this._alive) return
    // ⚠️ MUNNODEN MÅSTE RÄKNAS MED. `_mun` är släppmålet och en `static` nod med 130 px
    //    radie — den täcker mitten av pappas ansikte. Ett tryck rakt på honom hade alltså
    //    `e.target === this._mun`, inte roten, och `_tomtTryck` bailade: den mest lockande
    //    ytan i hela bilden svarade INTE på en pekning (P0-brottet `dod-traffyta`, samma
    //    familj som stationen som svalde en pekning under finalen i v1.190).
    //    Uppmätt i `_handelseprobe`: tryck mitt i ansiktet gav `spelade: (inget)`.
    //    Håller barnet redan en bit är tryckningen däremot tap-tap-matning — den vägen ägs
    //    av `DragController` och får inte kapas här.
    const egen = e?.target === this._root || (e?.target === this._mun && !this._drag?.selected)
    if (!egen) return
    const p = this._root.toLocal(e.global)

    // TRYCK PÅ PAPPA. Ansiktslagret har `eventMode: 'none'` (se `init`) — pekningen på
    // huvudet föll därför hit och fick samma generiska ring som bordsduken. Men huvudet är
    // det enda LEVANDE i bilden, och ett barn i den här åldern petar på det innan det ens
    // förstått att maten ska någonstans. Nu svarar han: "huh?", en tvekan och en blink.
    // Ingen mat, ingen mätare, ingen konsekvens — bara att han är någon som märker en.
    const dx = (p.x - ANS.x) / BUS.rx
    const dy0 = p.y - ANS.y
    const dy = dy0 / (dy0 > 0 ? BUS.ryNer : BUS.ry)
    if (dx * dx + dy * dy <= 1 && !this._busy) {
      ripple(ctx.fxLayer, p.x, p.y, { color: 0xffe3b0, maxR: 70 })
      const sek = ctx.services.audio.harSample?.('pappa_huh') && ctx.services.audio.sample('pappa_huh')
        ? (ctx.services.audio.sampleDuration?.('pappa_huh') || 0.5)
        : (ctx.services.audio.tone({ freq: 330, dur: 0.22, type: 'sine', vol: 0.2, slideTo: 430 }), 0.3)
      this._ans?.slappMin(0.1)
      this._ans?.min('forvanad', { hall: Math.max(0.9, sek + 0.1) })
      this._ans?.tveka()
      this._ans?.blink()
      return
    }

    ripple(ctx.fxLayer, p.x, p.y, { color: 0xffd9a0, maxR: 62 })
    ctx.services.audio.tone({ freq: 480, dur: 0.08, vol: 0.14 })
  },

  // ------------------------------------------------------------------ scen ---

  // Mättnadsmätaren: en burk som fylls. Den kan bara STIGA — ingen poäng som sjunker (P0).
  _ritaMatare() {
    const m = new Container()
    m.eventMode = 'none'
    const { x, y, w, h } = MATARE
    // Burken står på köksöns bänkskiva och behöver en skugga för att göra det —
    // ett glas utan skugga svävar precis som huvudet gjorde.
    const skugga = new Graphics()
      .ellipse(x, y + h / 2 - 2, w / 2 + 6, 13)
      .fill({ color: 0x6b4a2c, alpha: 0.2 })
    const glas = new Graphics()
      .roundRect(x - w / 2, y - h / 2, w, h, 30)
      .fill({ color: 0xffffff, alpha: 0.5 })
      .stroke({ width: 7, color: 0xb08a5c })
    const lock = new Graphics()
      .roundRect(x - w / 2 - 9, y - h / 2 - 24, w + 18, 32, 13)
      .fill(0xd9a05b)
      .stroke({ width: 6, color: 0x9a6535 })
      .roundRect(x - w / 2 - 4, y - h / 2 - 19, w + 8, 8, 4)
      .fill({ color: 0xffffff, alpha: 0.3 })

    // Fyllningen ritas om per nivå i sin egen Graphics — maskad av burkens rundning
    // genom att bara rita innanför den.
    this._fyll = new Graphics()
    this._fyllNiva = 0

    const dager = new Graphics()
      .roundRect(x - w / 2 + 14, y - h / 2 + 24, 16, h - 70, 8)
      .fill({ color: 0xffffff, alpha: 0.45 })

    // Hjärtat på locket tänds när magen är full — belöningen, aldrig en varning.
    this._hjarta = new Graphics()
    this._hjarta.moveTo(0, 9)
      .quadraticCurveTo(-16, -4, -8, -13)
      .quadraticCurveTo(0, -18, 0, -8)
      .quadraticCurveTo(0, -18, 8, -13)
      .quadraticCurveTo(16, -4, 0, 9)
      .fill(0xff6b8e)
      .stroke({ width: 3, color: 0xd94f72 })
    // Hjärtat sitter PÅ locket, inte ovanför det: i köksbilden fanns 34 px luft mellan
    // dem och hjärtat läste som en dekal på väggen bakom burken.
    this._hjarta.position.set(x, y - h / 2 - 22)
    this._hjarta.scale.set(1.4)
    this._hjarta.alpha = 0.28

    m.addChild(skugga, glas, this._fyll, dager, lock, this._hjarta)
    // Pivot i burkens FOT så bågningen (skalpulsen i `_fyllTill`) trycker utåt/uppåt från
    // bänken i stället för att lyfta hela burken. Burken är ren dekor (`eventMode='none'`)
    // — inget släppmål eller träffyta flyttas av att den animeras.
    m.pivot.set(x, y + h / 2)
    m.position.set(x, y + h / 2)
    this._matarC = m
    this._propL.addChild(m)
    this._ritaFyll(0)
  },

  _ritaFyll(v) {
    if (!this._fyll || this._fyll.destroyed) return
    const { x, y, w, h } = MATARE
    const innerW = w - 18
    const innerH = h - 20
    const hojd = Math.max(0, Math.min(1, v)) * innerH
    this._fyll.clear()
    if (hojd < 2) return
    const topp = y + innerH / 2 - hojd
    this._fyll
      .roundRect(x - innerW / 2, topp, innerW, hojd, Math.min(26, hojd / 2))
      .fill(0xffb14a)
    this._fyll
      .ellipse(x, topp + 4, innerW / 2 - 2, 9)
      .fill({ color: 0xffd08a, alpha: 0.9 })
  },

  // ------------------------------------------------------ klistermärkena ---

  // Kyldörren minns. Mättnadsburken nollställs varje omgång — det MÅSTE den, annars vore
  // den ingen mätare — och därför fanns det inget i rummet som sa "vi har gjort det här
  // förut". Skalets klistermärke (`progress.complete`) syns bara på bibliotekskärmen, som
  // ett barn aldrig ser mitt i en omgång.
  //
  // ⚠️ Märkena är REN DEKOR på kylens dörr-container: de ärver dörrens `eventMode = 'none'`
  // och ändrar ingen träffyta (kylens `yta` sätts av stationstabellen, inte av ritningen).
  // Att de ritas PÅ dörren och inte på stommen är samma mätning som magneterna: en stängd
  // dörr ligger överst i lagerordningen, och allt bakom den syns aldrig.
  _ritaMarken(ctx) {
    const kyl = (this._stationer || []).find((st) => st.id === 'kyl')
    if (!kyl?.dorr || kyl.dorr.destroyed) return
    this._markeL = new Container()
    this._markeL.eventMode = 'none'
    kyl.dorr.addChild(this._markeL)
    this._markeNoder = []
    this._marken = Math.max(0, Math.min(MARKE_MAX, ctx.progress.get()?.custom?.marken || 0))
    for (let i = 0; i < this._marken; i++) this._markeNod(i)
  },

  // ETT MÄRKE = EN EGEN NOD. Alla åtta låg först i samma `Graphics`, och stämpelpulsen
  // sattes genom att flytta HELA lagrets pivot till det nya märket — vilket skalar de
  // gamla runt en punkt som inte är deras egen. Kritikern mätte det: märke 1 gled
  // **10,4 px** i sidled när märke 2 poppade in, en tredjedel av sin egen diameter, tvärs
  // emot kommentaren som sa att de gamla ska stå still. Med en nod per märke rör pulsen
  // bara sitt eget.
  _markeNod(i) {
    const g = new Graphics()
    g.eventMode = 'none'
    ritaMarke(g, i, MARKEN[i][0], MARKEN[i][1])
    g.pivot.set(MARKEN[i][0], MARKEN[i][1])
    g.position.set(MARKEN[i][0], MARKEN[i][1])
    this._markeL.addChild(g)
    this._markeNoder.push(g)
    return g
  },

  // Ett nytt märke vid varje mättad mage. Taket är dörrens platser — och en full dörr
  // firar exakt lika mycket, den får bara ett glitter i stället för ett nytt märke.
  //
  // ⚠️ MÄRKET SÄGER INGENTING. Finalen bär redan tre röstklipp (rapen, ibland en till, och
  // skrattet) plus narratorn, och ett ord här hade landat mitt i skrattet — precis det fel
  // som en gång lät som "två pappor" (§5 v1.194). Ord bara vid de två tillfällen då de
  // betyder något NYTT, och då i nästa tallriks replikplats där ingen annan röst står.
  _nyttMarke(ctx) {
    if (!this._markeL || this._markeL.destroyed) return
    const audio = ctx.services.audio
    const full = this._marken >= MARKE_MAX
    if (full) {
      // Dörren är full. Ingen ny plats, men samma fest — och den här gången ett ord, för
      // "kylen är full" är en händelse och inte en upprepning.
      sparkle(ctx.fxLayer, 87, 508, { count: 18 })
      this._markeReplik = 'Hela kylen är full med klistermärken!'
    } else {
      const i = this._marken
      const nod = this._markeNod(i)
      this._marken = i + 1
      ctx.progress.setCustom('marken', this._marken)
      // Märket sätts dit med en liten stämpel — i SIN EGEN nod, med pivoten i sitt eget
      // centrum, så de gamla märkena står still (se `_markeNod`).
      gsap.fromTo(nod.scale, { x: 1.35, y: 1.35 },
        { x: 1, y: 1, duration: 0.5, ease: 'back.out(3)' })
      kvittera(ctx.fxLayer, MARKEN[i][0], MARKEN[i][1], audio, { color: 0xffe3b0, maxR: 70 })
      sparkle(ctx.fxLayer, MARKEN[i][0], MARKEN[i][1], { count: 9 })
      if (!this._markeSagt) {
        this._markeSagt = true // en gång per omgång i appen: efter det räcker plinget
        this._markeReplik = 'Titta, ett klistermärke på kylen!'
      }
    }
    // Stigande kvint — samma musikaliska språk som `correct`, aldrig ett UI-blipp.
    audio.tone({ freq: 880, dur: 0.1, vol: 0.16 })
    ctx.later(0.11, () => { if (this._alive) audio.tone({ freq: 1320, dur: 0.12, vol: 0.14 }) })
  },

  // ------------------------------------------------------------- önskan ---

  // Pappa får en lust till en av bitarna: blicken låser sig vid den, en varm ring andas
  // runt den och han säger något generiskt. Kravet på MINST TVÅ kandidater är det som gör
  // den till ett val i stället för en order.
  _valjOnskan(ctx, byte = false) {
    if (!this._alive || this._busy || !this._ans) return
    const kvar = (this._mat || []).filter((r) => this._onskbar(r))
    if (kvar.length < 2) return
    const gammal = this._onskan?.rec
    const fria = kvar.filter((r) => r !== gammal)
    const rec = randomFrom(fria.length ? fria : kvar)
    if (!rec) return
    this._slappOnskan()

    // Ringen ligger i `_propL` (bakom maten, framför bänken) och FÖLJER biten per bildruta
    // i stället för att vara barn till den. Ett barn hade följt med upp i handen när biten
    // lyfts — och en ring som svävar i luften mitt i ett drag pekar inte längre på något.
    const ring = new Graphics()
    ring.eventMode = 'none'
    ring.circle(0, 0, ONSKAN.ringR).stroke({ width: 6, color: 0xffd06a, alpha: 0.75 })
    ring.circle(0, 0, ONSKAN.ringR - 11).stroke({ width: 3, color: 0xfff0c0, alpha: 0.45 })
    for (let n = 0; n < 6; n++) {
      const a = (n / 6) * Math.PI * 2
      ring.circle(Math.cos(a) * ONSKAN.ringR, Math.sin(a) * ONSKAN.ringR, 4.5)
        .fill({ color: 0xffe9a8, alpha: 0.9 })
    }
    ring.position.set(rec.view.x, rec.view.y)
    this._propL.addChild(ring)
    gsap.to(ring, { rotation: Math.PI * 2, duration: 9, ease: 'none', repeat: -1 })
    gsap.to(ring.scale, { x: 1.09, y: 1.09, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    gsap.from(ring, { alpha: 0, duration: 0.3 })

    this._onskan = { rec, ring }
    this._onskanT = 0
    this._idle = 0
    // Han tittar dit direkt och nickar — gesten är det som gör ringen till HANS önskan och
    // inte till en markering appen ritade. RINGEN OCH NICKEN KOMMER GENAST (P0: bild inom
    // 100 ms); bara ORDEN väntar in den som talar, för de har ingen brådska och kapar
    // annars introt eller bekräftelsen.
    this._ans.nick?.()
    const text = byte ? 'Eller kanske den där?' : randomFrom(ONSKE_REPLIKER)
    this._narTyst(ctx, () => {
      // Önskan kan ha uppfyllts under väntan — då är repliken inte längre sann.
      if (this._alive && !this._busy && this._onskan?.rec === rec) ctx.services.voice.say(text)
    })
  },

  // En bit går att önska sig så länge den ligger kvar på BRÄDAN och inte redan är på väg
  // in i munnen. `_plats` nollas av `_frigor` för både uppäten och fastnad mat.
  //
  // `_plats` är också det som håller skåpens prylar utanför: de läggs i samma `_mat`-lista
  // (`_tryckStation`) men får aldrig någon brädplats, så `rec._plats != null` är falskt för
  // dem. `atbar`-villkoret är därför ett bälte till hängslet — men det står här för att
  // regeln "pappa önskar sig bara MAT" ska gå att läsa direkt: en lust till en gaffel som
  // sedan spottas ut hade varit en ceremoni utan slut.
  _onskbar(rec) {
    return !!rec && !rec._uppaten && rec._plats != null && rec.data?.atbar !== false &&
      !!rec.view && !rec.view.destroyed
  },

  // Ringen följer biten per bildruta, och den slocknar i samma sekund biten lyfts: en ring
  // kvar på en tom brädplats pekar på ingenting, och en ring runt handen är en markering
  // barnet inte bad om. Önskan dör dessutom av sig själv när biten inte längre går att
  // önska sig (uppäten, fastnad i ansiktet, eller riven av en ny tallrik).
  _onskanTick(ctx, dt) {
    const o = this._onskan
    if (!o) return
    if (!this._onskbar(o.rec) || o.ring.destroyed) {
      this._slappOnskan()
      return
    }
    o.ring.position.set(o.rec.view.x, o.rec.view.y)
    o.ring.visible = this._drag?.active !== o.rec && !this._busy
    // Han provar en annan bit om ingen tagit den. Det är variation, inte en påminnelse:
    // inget sägs om att man "borde" — han ändrar sig helt enkelt.
    this._onskanT += dt
    if (this._onskanT > ONSKAN.byte && !this._busy && this._drag?.active !== o.rec) {
      this._valjOnskan(ctx, true)
    }
  },

  _slappOnskan() {
    const o = this._onskan
    this._onskan = null
    if (!o) return
    const ring = o.ring
    if (!ring || ring.destroyed) return
    gsap.killTweensOf(ring)
    gsap.killTweensOf(ring.scale)
    gsap.to(ring, {
      alpha: 0, duration: 0.22,
      onComplete: () => { if (!ring.destroyed) ring.destroy() },
    })
  },

  // -------------------------------------------------------------- omgången ---

  _nyTallrik(ctx) {
    this._rensaMat()
    this._antal = 4 + Math.floor(Math.random() * 3) // 4–6 tuggor mättar magen
    this._atna = 0
    this._fyllNiva = 0
    this._ritaFyll(0)
    if (this._hjarta && !this._hjarta.destroyed) this._hjarta.alpha = 0.22
    this._ledig = PLATSER.map(() => true)
    for (let i = 0; i < Math.min(PLATSER.length, this._antal); i++) this._spawna(ctx, i * 0.07)
    // Första önskan väntar tills introrepliken hörts klart — två svenska röster samtidigt
    // är samma fel som `_replikEfterMin` en gång rättade.
    ctx.later(ONSKAN.forstaGang, () => { if (this._alive && !this._onskan) this._valjOnskan(ctx) })
  },

  // Vad som läggs upp härnäst. Aldrig två likadana på tallriken samtidigt, och högst en
  // stark åt gången: citronen och chilin är spelets stora skratt, men en tallrik som
  // ALLTID är sur är en tallrik barnet lär sig att undvika.
  _valjMat() {
    const pa = new Set((this._mat || []).filter((r) => !r._uppaten).map((r) => r.data.key))
    const harStark = [...pa].some((k) => k === 'lemon' || k === 'chili')
    const bank = !harStark && Math.random() < 0.3 ? MAT_STARK : FOODS
    const fria = bank.filter((f) => !pa.has(f.key))
    return randomFrom(fria.length ? fria : shuffle(bank)).key
  },

  _spawna(ctx, delay = 0) {
    const i = (this._ledig || []).findIndex(Boolean)
    if (i < 0) return null
    this._ledig[i] = false
    const rec = this._skapaMat(ctx, this._valjMat(), PLATSER[i], i, delay)
    rec._plats = i
    this._mat.push(rec)
    return rec
  },

  // En bit har lämnat tallriken (uppäten ELLER fastnad i ansiktet). Platsen blir ledig.
  _frigor(ctx, rec) {
    if (rec._plats == null) return
    this._ledig[rec._plats] = true
    rec._plats = null
    ctx.later(0.55, () => { if (this._alive && !this._busy) this._paFyllning(ctx) })
  },

  // Tallriken får ALDRIG ta slut medan magen inte är full. Utan påfyllningen kunde barnet
  // busa bort halva rundan och sedan sitta med en tom tallrik där ingenting mer hände —
  // en återvändsgränd, alltså precis det P0 förbjuder. (Mätt: 5 ätna av 6, en busad,
  // finalen kom aldrig.) Bus kostar därför tid och en fläck, aldrig omgången.
  _paFyllning(ctx) {
    const kvar = (this._mat || []).filter((r) => !r._uppaten).length
    let n = Math.min(Math.max(0, this._antal - this._atna), PLATSER.length) - kvar
    while (n-- > 0) if (!this._spawna(ctx)) break
  },

  // ETT sätt att skapa ett dragbart föremål, oavsett var det kommer ifrån. `data` bär
  // allt resten av spelet behöver veta: färgen (gegga + smulor), grimasen och om saken
  // går att äta. Utan den gemensamma formen hade brädans mat och skåpens prylar behövt
  // varsin gren genom `_ata`, `_miss` och `_gegga`.
  _skapaFor(ctx, data, [x, y], i, delay = 0) {
    const yttre = new Container() // draget äger den här — inget annat får röra den
    yttre.position.set(x, y)
    yttre.hitArea = new Circle(0, 0, GRIP_R)

    const inre = new Container() // vilorörelsen bor här, så draget aldrig slåss med den
    inre.eventMode = 'none'
    inre.addChild(data.vy())
    yttre.addChild(inre)
    this._matL.addChild(yttre)

    liv(inre, { bob: 5, sway: 0.04, phase: i * 0.17 })
    // Entrén tweenas på den INRE skalan. `addItem` läser `view.scale.x` som vilo-bas, och
    // en `gsap.from` på den yttre hade satt 0.2 i samma bildruta — draget hade då pinnat
    // 0.2 som föremålets normalstorlek för resten av omgången.
    gsap.from(inre.scale, { x: 0.2, y: 0.2, duration: 0.4, delay, ease: 'back.out(2)' })

    const rec = this._drag.addItem(yttre, data, {
      onCorrect: () => this._ata(ctx, rec),
      onMiss: () => this._miss(ctx, rec),
      onKast: (r, k) => this._kasta(ctx, r, k),
      onSelect: () => ctx.services.audio.tone({ freq: 620, dur: 0.07, vol: 0.16 }),
    })
    // Plockas en liggande sak upp måste dess kropp dö FÖRST. `onSelect` duger inte —
    // den kör bara vid tapp utan drag. Draget skriver `view.x` varje bildruta och
    // fysiken gör samma sak; två skrivare till samma fält är hackighet, inte en bugg
    // som syns i en logg.
    rec._grepp = () => this._lyftLos(rec)
    yttre.on('pointerdown', rec._grepp)
    rec._inre = inre
    return rec
  },

  // Brädans mat: alltid ätlig, alltid det som driver målet framåt.
  _skapaMat(ctx, key, plats, i, delay = 0) {
    return this._skapaFor(ctx, {
      key,
      farg: foodColor(key),
      min: MIN_PER_MAT[key] || 'lycksalig',
      atbar: true,
      mtrl: 'tra',
      vy: () => makeFood(key, 0.75),
    }, plats, i, delay)
  },

  // ----------------------------------------------------------- fysiken ---

  // Bänkskivan är ett riktigt fysikbord. Allt som lämnar spelet på annat sätt än att bli
  // uppätet — utspottade prylar, gegga som ploppar av ansiktet, mat som släpps på bänken
  // — faller ner hit, studsar med sitt eget materials röst och lägger sig i en hög.
  //
  // ⚠️ Väggarna är OPT-IN mot öns kanter, inte mot `ctx.view`. En bred telefon hade annars
  //    fått en annan spelplan än den testade, och saker hade kunnat vila i bleed-zonen.
  _startaFysik(ctx) {
    this._phys = new PhysicsWorld({
      gravityY: 1,
      walls: ['floor', 'left', 'right'],
      bounds: { left: FYSIK.v, top: -600, right: FYSIK.h, bottom: FYSIK.golv },
    })
    this._phys.impactAudio(ctx.services.audio, { standard: 'tra', vol: 0.2, minSpeed: 2.2 })
    this._losa = []
    this._phys.beforeStep(() => this._kastTick(ctx))
  },

  // Gör en vy till en fallande kropp. Vyn ägs fortfarande av draget, så saken går att
  // plocka upp igen — och DÄRFÖR måste kroppen dö i samma sekund den lyfts (`_lyftLos`).
  // Två skrivare till samma `view.x` är den klassiska varianten av "det ryckte".
  _gorLos(ctx, rec, { vx = 0, vy = 0 } = {}) {
    if (!this._phys || !this._alive) return
    const v = rec.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    rec._inre?._fxLiv?.kill()
    v.visible = true
    v.alpha = 1

    // Saken ligger på bänken igen och SKA gå att plocka upp. `_resolveDrop` låste den när
    // munnen tog emot den (`placed = true` + `eventMode = 'none'`), och inget öppnade det
    // låset — uppmätt i `_spottprobe`: en utspottad sked stod kvar med `em: "none"` och
    // andra greppet gav `active: null`. Storleken var däremot aldrig fel (1 → 1).
    this._drag?.aterstall?.(v)

    // Skräpet lägger sig UNDER maten i PEKORDNINGEN. Pixi provar översta barnet först,
    // och `_gorLos` körs alltid efter att brädans mat redan ligger i lagret — en hög som
    // landar över matraden (golvet ligger 43 px under `PLATSER`) stal annars fingret
    // från en aktiv matbit (kritikerfynd: 8 skräpsaker à 104 px träffcirkel i samma
    // x-band som maten). Det är maten barnet siktar på; skräpet nås där maten inte är.
    if (v.parent === this._matL && this._mun && !this._mun.destroyed) {
      this._matL.setChildIndex(v, this._matL.getChildIndex(this._mun) + 1)
    }

    // Saken har LÄMNAT sitt skåp. Står den kvar i stationens lista river `_plockaTillbaka`
    // vyn när luckan stängs — medan fysikkroppen fortsätter skriva till den. (Uppmätt:
    // `Cannot read properties of null (reading 'x')` i _kokprobe, första körningen.)
    if (rec._station?._saker) {
      const i = rec._station._saker.indexOf(rec)
      if (i >= 0) rec._station._saker.splice(i, 1)
    }

    // SJUHÖRNING, inte cirkel. En cirkel rullar nästan utan motstånd i matter — högen
    // kröp 8,0 px per 700 ms långt efter att sista saken landat, alltså aldrig riktigt
    // still (`_stillaprobe`s fråga, ställd mot det här spelet). Och det är inte bollar
    // som ligger på bänken: en gaffel och en kastrull ska lägga sig, inte rulla iväg.
    const namn = rec.data.mtrl || 'tra'
    const b = this._phys.polygon(v.x, v.y, 7, 34, mat(namn, { label: 'los' }))
    Body.setVelocity(b, { x: vx, y: vy })
    Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.14)
    if (SPILL[rec.data.key]) this._spill(ctx, v.x, v.y + 10, rec.data.key)
    this._phys.link(b, v)
    rec._kropp = b
    this._losa.push(rec)

    // Taket. Samma princip som geggans: den äldsta försvinner så högen aldrig äter
    // bänken (P0 MOTGÅNG — tak på hur mycket som kan ligga och skräpa samtidigt).
    while (this._losa.length > LOSA_MAX) this._stadaLos(ctx, this._losa[0])
  },

  // ------------------------------------------------------------ kastet ---
  //
  // Ägarens punkt 1: "kunna KASTA mat på ansiktet". Draget är oförändrat — kastet är en
  // BONUS (P0), och hela målet går att nå utan att kasta en enda gång.
  //
  // `DragController` ger släppfarten via kroken `onKast`, men bara när det INTE fanns
  // något mål under fingret. Släpp inne i ansiktet äger `_miss` (buset), så den vägen
  // lämnas tillbaka till biblioteket genom att returnera `false`.

  // Ett inspelat klipp om det finns, annars tyst. `harSample` först är inte artighet:
  // utan frågan flaggar varje anrop `saknat-ljudklipp` i testloggen (se ROST ovan).
  _sample(ctx, nyckel) {
    const a = ctx.services.audio
    return !!(a.harSample?.(nyckel) && a.sample(nyckel))
  },

  /**
   * Ligger punkten på ANSIKTET? Delas av `_miss` och det svepta kasttestet.
   *
   * Silhuetten ur riggen först (se `BUS` ovan för mätningen som gjorde ellipsen otillräcklig).
   * `KANT_Y` klipps här och inte i riggen: att hakan försvinner bakom en bänk är KÖKETS
   * kunskap, inte fotots. Utan den raden når konturen ner till y = 452 och därmed ut på
   * skärbrädan (`PLATSER` y = 505 ligger under, men geggan ritas BAKOM köksöns förgrund, så
   * en bit som "träffade" där hade bara sett ut att försvinna — ägarrapport #8).
   */
  _iAnsiktet(x, y) {
    if (y > KANT_Y) return false
    const s = this._ans?.traffar(x, y, MAT_R)
    if (s !== null && s !== undefined) return s
    const dy0 = y - ANS.y
    const dx = (x - ANS.x) / BUS.rx
    const dy = dy0 / (dy0 > 0 ? BUS.ryNer : BUS.ry)
    return dx * dx + dy * dy <= 1
  },

  _kasta(ctx, rec, k) {
    if (!this._alive || this._busy || !this._phys || rec._uppaten) return false
    if (k.fart < KAST.fart) return false
    if (this._iAnsiktet(k.x, k.y)) return false // det är bus, inte kast — `_miss` äger det
    this._idle = 0

    const s = Math.min(1, KAST.tak / (k.fart * KAST.perSteg))
    const vx = k.vx * KAST.perSteg * s
    const vy = k.vy * KAST.perSteg * s
    this._sample(ctx, 'kast')
    this._gorLos(ctx, rec, { vx, vy })
    if (!rec._kropp) return false // fysiken sa nej (riven värld) — låt draget snäppa hem
    rec._flyger = true
    rec._flygSteg = 0
    // Nollpunkten sätts HÄR, inte i första steget: annars sveps första steget aldrig,
    // och första steget är det längsta (farten är som störst just vid släppet).
    rec._flygFran = { x: rec._kropp.position.x, y: rec._kropp.position.y }
    return true
  },

  // Körs en gång per FAST fysiksteg (`beforeStep`), aldrig per bildruta: farten som avgör
  // både träffen och lyftet är px/STEG, och `update()` kör 1–5 steg per bildruta.
  _kastTick(ctx) {
    if (!this._alive || !this._losa?.length) return
    const flygande = this._losa.filter((r) => r._flyger)
    if (!flygande.length) return
    const g = this._phys.engine.gravity
    for (const rec of flygande) {
      const b = rec._kropp
      if (!b || rec._uppaten) { rec._flyger = false; continue }
      const fran = rec._flygFran
      const till = { x: b.position.x, y: b.position.y }
      rec._flygFran = till
      rec._flygSteg += 1
      if (this._svepTraff(ctx, rec, fran, till)) continue
      if (rec._flygSteg > KAST.steg || Math.hypot(b.velocity.x, b.velocity.y) < KAST.stopp) {
        rec._flyger = false
        continue
      }
      // Tyngdkraften dämpas medan biten flyger. Matter lägger på `mass * gravity.y *
      // gravity.scale` varje steg — motkraften måste räknas ur SAMMA tal, annars är
      // lyftet en gissning som slutar stämma i samma sekund gravitationen ändras.
      Body.applyForce(b, b.position, { x: 0, y: -b.mass * g.y * g.scale * KAST.lyft })
    }
  },

  /**
   * ⚠️ SVEPT TEST, INTE PUNKTTEST. Vid taket (26 px/steg) flyttar sig en bit 26 px per
   * steg, och en punktprövning i stegets slutläge kan hoppa rakt över en kant. Att den
   * inte gör det för en 130 px mun är tur, inte konstruktion — geggan lägger dessutom
   * fläckar ända ut i ellipsens kant där marginalen är noll. Segmentet provas därför var
   * 14:e px, och det är samma familj av tyst fel som `drain()`s hörn-mot-centrum.
   */
  _svepTraff(ctx, rec, a, b) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / KAST.prov))
    for (let i = 1; i <= n; i++) {
      const x = a.x + (b.x - a.x) * (i / n)
      const y = a.y + (b.y - a.y) * (i / n)
      const mun = Math.hypot(x - ANS.x, y - this._munY) < MUN_R
      if (!mun && !this._iAnsiktet(x, y)) continue
      rec._flyger = false
      // `_ata` och `_miss` läser SLÄPPUNKTEN ur `rec.tx/ty`. Ett kast har ingen släpp-
      // punkt vid ansiktet — träffpunkten är den, och utan raden hade geggan hamnat
      // där handen råkade släppa, alltså långt utanför ansiktet.
      rec.tx = x
      rec.ty = y
      this._lyftLos(rec)
      if (rec.view && !rec.view.destroyed) rec.view.position.set(x, y)
      this._sample(ctx, rec.data.hard === true ? 'traff_hard' : 'traff_mjuk')
      if (mun) this._ata(ctx, rec)
      else this._miss(ctx, rec)
      return true
    }
    return false
  },

  // ---------------------------------------------------------- vätskan ---

  // Ägaren bad om vätska två gånger ("vätska", "glas med vätskor"). Den ligger DÄR den
  // syns och gör något: ett glas saft eller ett mjölkpaket som pappa spottar ut TÖMS
  // över bänkskivan, och pölen rinner runt allt annat som ligger där.
  //
  // Två val som är kostnad, inte smak:
  //  · EN vätskevärld, och den skapas först när något faktiskt spills. `FluidView`
  //    allokerar en sprite per partikel och lägger två filterpass över sin `area` varje
  //    bildruta — ett kök som aldrig spiller ska inte betala för det.
  //  · `area` är bänkbandet, inte designytan. Förvalet (1520×1080) är 9× dyrare än det
  //    här bandet, och den notan betalas i tappade WebGL-kontexter i ANDRA spel när
  //    sviten kör fyra webbläsare parallellt.
  // Skapar vätskevärlden om den inte finns. Den sträcker sig från diskhon (kranen) ner
  // till bänkskivan (pölarna) — ETT fält, fyra färger.
  _sakraVatska() {
    if (this._vatskaV) return this._vatskaV
    const b = { left: FYSIK.v, right: FYSIK.h, top: 150, bottom: FYSIK.golv + 10 }
    this._vatskaV = new FluidWorld({
      // 140, inte 116: hällandet (`_hallTick`) kan lägga på vätska ovanpå en pöl som redan
      // ligger, och vid 116 tog världen slut mitt i en stråle. Taket är fortfarande ett tak
      // — det ska INTE gå att fylla köket.
      max: 140, radius: 20, gravityY: 0.5, bounds: b,
      walls: { left: true, right: true, bottom: true, top: false },
      rho0: 5.2, sigma: 0.1, beta: 0.16, restitution: 0.06, wallFriction: 0.5,
    })
    // Diskhons kärl sätts upp i `_vatskaTick`, inte här: varje bildruta börjar med
    // `clearColliders()`.
    this._vatskaVy = new FluidView(this._vatskaL, this._vatskaV, {
      // Låg blur + hög tröskel: en pöl ska ha en KANT. Med förvalen (blur 9, tröskel
      // 0,42) blev samma partiklar en glödande dimma tvärs hela bänken.
      palette: PALETT, edge: 0xe8f7ff, blur: 6, threshold: 0.52, blobScale: 1.2, resolution: 0.5,
      area: new Rectangle(b.left - 30, b.top - 20, b.right - b.left + 60, b.bottom - b.top + 60),
    })
    return this._vatskaV
  },

  // HÄLLA MEDAN MAN HÅLLER. Ägaren: "vätska ska kunna spillas ut mer samt kunna hållas
  // över ansiktet." Förut fanns bara EN väg till vätska — `_gorLos`, alltså när bäraren
  // blev en lös kropp — så man kunde aldrig hälla med flit, bara tappa.
  //
  // Regeln är den enklaste ett tvååring kan hitta själv: **håller du den lutad över något,
  // rinner det**. Ingen knapp, ingen gest. Bäraren tippar synligt så orsaken syns innan
  // verkan (P0: tydlig orsak), och strålen kommer ur dess KANT, inte ur mitten.
  //
  // Takten är en droppe-klump per ~70 ms i stället för en klick per bildruta: en bildrute-
  // takt fyllde världens 116 partiklar på under en sekund och gjorde varje hällning lika
  // lång oavsett hur länge man höll.
  _hallTick(ctx, dtMS) {
    const rec = this._drag?.active
    const pal = rec?.data?.key != null ? SPILL[rec.data.key] : null
    const v = rec?.view

    // ⚠️ LUTNINGEN SKRIVS PÅ `rec.restRot`, ALDRIG PÅ `view.rotation`. `_dragTick` sätter
    // `v.rotation = rec.restRot + släpvinkel` varje bildruta så länge man drar — en tween
    // på `rotation` hade varit två skrivare till samma tal och överskrivits direkt.
    // `restRot` är sömmen: draget lägger sin egen lutning ovanpå den.
    if (pal == null || !v || v.destroyed) {
      if (this._hallRec) this._hallRec.restRot = 0
      this._hallRec = null
      this._hallV = null
      this._hallT = 0
      return
    }

    // Över ansiktet ELLER över diskhon — båda är ställen där det är MENINGEN att hälla.
    const overAns = Math.abs(v.x - ANS.x) < BUS.rx && v.y > 40 && v.y < KANT_Y
    const overHo = Math.abs(v.x - HO.x) < HO.v / 2 && v.y < HO.bottenY
    if (!overAns && !overHo) {
      if (this._hallRec === rec) rec.restRot = (rec.restRot || 0) * 0.82 // räta upp mjukt
      if (Math.abs(rec.restRot || 0) < 0.02) { this._hallRec = null; this._hallV = null }
      this._hallT = 0
      return
    }

    if (this._hallV !== v) {
      this._hallV = v
      this._hallRec = rec
      this._hallT = 0
      ctx.services.audio.sfx('soft')
    }
    // Tippa fram till full lutning över ~0,25 s. Egen ramp i stället för en tween, för
    // `restRot` läses av draget varje bildruta och ska aldrig ha två ägare.
    rec.restRot = Math.min(0.85, (rec.restRot || 0) + dtMS / 300)
    if (rec.restRot < 0.5) return // det rinner först när den lutar på riktigt

    this._hallT = (this._hallT || 0) + dtMS
    if (this._hallT < 70) return
    this._hallT = 0
    const w = this._sakraVatska()
    // Ur kärlets kant, i lutningens riktning — inte ur mitten.
    const mx = v.x + 26
    const my = v.y + 6
    for (let i = 0; i < 5; i++) {
      w.spawn(mx + (Math.random() - 0.5) * 14, my + (Math.random() - 0.5) * 8, {
        vx: (Math.random() - 0.5) * 0.8, vy: 0.6 + Math.random() * 0.8, pal,
      })
    }
    this._torkT = 0

    // Pappa märker att det rinner på honom — men bara var 900:e ms, annars grimaserar han
    // i ett enda långt ryck så länge man håller kvar.
    if (overAns) {
      this._hallMinT = (this._hallMinT || 0) + 70
      if (this._hallMinT > 900) {
        this._hallMinT = 0
        const namn = Math.random() < 0.5 ? 'forvanad' : 'skratt'
        this._ans?.slappMin(0.1)
        const sek = this._sag(ctx, namn)
        this._ans?.min(namn, { hall: Math.max(1.1, sek + 0.1) })
      }
    }
  },

  _spill(ctx, x, y, sort) {
    const pal = SPILL[sort]
    if (pal == null || !this._alive) return
    const w = this._sakraVatska()
    // Tätt och lugnt. Första försöket sköt iväg dem med ±3,2 px/steg i sidled och 46
    // partiklar smetade då ut sig över hela bänkens 788 px — en hinna, inte en pöl.
    for (let i = 0; i < 58; i++) {
      w.spawn(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 14, {
        vx: (Math.random() - 0.5) * 1.3, vy: -0.4 - Math.random() * 1.4, pal,
      })
    }
    ctx.services.audio.sfx('soft')
    this._torkT = 0
  },

  // Pölen torkar upp av sig själv. Utan det ligger en vätskevärld och kostar för alltid
  // (`fxLayer`-fällan i CLAUDE.md, en våning upp: allt som cachas på ett långlivat lager
  // måste kunna rivas när det är tomt).
  _vatskaTick(ctx, dt) {
    // Kranen häller RIKTIGT vatten i hon. Den ritade strålen är kvar som stråle — det är
    // pölen i porslinet som är vätska. Att låta kranen bara skala en grafik medan samma
    // fil bär en fungerande vätskemotor var det som fick kranen att ljuga.
    if (this._vatten && this._alive) {
      this._kranT = (this._kranT || 0) + dt
      if (this._kranT > 90) {
        this._kranT = 0
        this._sakraVatska().spawn(HO.x - 4 + (Math.random() - 0.5) * 8, 232, {
          vx: (Math.random() - 0.5) * 0.6, vy: 2.4, pal: 0,
        })
      }
    }
    const w = this._vatskaV
    if (!w) return
    // Avloppet: hon rinner ut hela tiden, så nivån håller sig och kranen kan stå på hur
    // länge som helst utan att skölja över bänken.
    this._avloppT = (this._avloppT || 0) + dt
    if (this._avloppT > 240) {
      this._avloppT = 0
      w.drain(HO.x, HO.bottenY - 6, 120, 30, { max: 2 })
    }
    // Kollisionskropparna matas in på nytt varje bildruta: högen rör sig, och en pöl som
    // rinner genom en kastrull är inte en pöl.
    //
    // ⚠️ DISKHON MÅSTE LÄGGAS TILLBAKA HÄR. `clearColliders()` tömmer HELA listan, så
    //    kärlet som sattes upp en gång vid `_sakraVatska()` försvann i första bildrutan
    //    efteråt — kranens vatten rann rakt igenom porslinet och sögs bort av avloppet
    //    innan det hann synas (uppmätt: 0 partiklar i hon efter 2,6 s med kranen på).
    w.clearColliders()
    w.addBox(HO.x, HO.bottenY, 132, 12)
    w.addBox(HO.v, HO.y, 12, 44)
    w.addBox(HO.h, HO.y, 12, 44)
    for (const rec of this._losa) {
      if (rec._kropp && rec.view && !rec.view.destroyed) w.addCircle(rec.view.x, rec.view.y, 30)
    }
    w.update(dt)
    this._vatskaVy?.update()

    this._torkT = (this._torkT || 0) + dt
    if (this._torkT > 5000 && !this._vatten) {
      this._torkStep = (this._torkStep || 0) + dt
      if (this._torkStep > 150) {
        this._torkStep = 0
        // ⚠️ `drain(x, y, w, h)` tar ett CENTRUM, inte ett hörn. Med hörnet inskickat
        // låg avloppet på x −248..632 medan pölen samlats kring 430..830 — den torkade
        // då bara på vänstra halvan (uppmätt 57 → 29 partiklar på elva sekunder, och
        // världen levde vidare). Samma sorts tyst enhetsfel som CLAUDE.md varnar för.
        w.drain((FYSIK.v + FYSIK.h) / 2, (KANT_Y + FYSIK.golv) / 2,
          FYSIK.h - FYSIK.v + 120, FYSIK.golv - KANT_Y + 400, { max: 7 })
        if (w.count <= 0) this._rivVatska()
      }
    }
  },

  _rivVatska() {
    this._vatskaVy?.destroy()
    this._vatskaVy = null
    this._vatskaV?.destroy()
    this._vatskaV = null
    this._torkT = 0
  },

  _lyftLos(rec) {
    if (!rec) return
    rec._flyger = false // en flygande bit som plockas upp får inte fortsätta svepa
    if (!rec._kropp) return
    this._phys?.removeBody(rec._kropp)
    rec._kropp = null
    const i = this._losa.indexOf(rec)
    if (i >= 0) this._losa.splice(i, 1)
    if (rec.view && !rec.view.destroyed) rec.view.rotation = 0
  },

  _stadaLos(ctx, rec, forsening = 0) {
    if (!rec) return
    this._lyftLos(rec)
    this._drag?.removeItem?.(rec.view)
    rec._uppaten = true
    const v = rec.view
    if (!v || v.destroyed) return
    ctx.later(forsening, () => {
      if (!this._alive || v.destroyed) return
      puff(ctx.fxLayer, v.x, v.y, { count: 5, color: rec.data.farg })
      gsap.to(v, { alpha: 0, duration: 0.3,
        onComplete: () => { if (!v.destroyed) v.destroy({ children: true }) } })
      gsap.to(v.scale, { x: 0.2, y: 0.2, duration: 0.3 })
    })
  },

  // Sopa bänken ren. Körs i finalen, i takt — allt på en gång läser som en bugg.
  _sopaBanken(ctx) {
    const alla = [...(this._losa || [])]
    alla.forEach((rec, i) => this._stadaLos(ctx, rec, i * 0.07))
  },

  // ------------------------------------------------------------ köket ---

  // Varje station får en egen, osynlig träffyta i ett eget lager mellan köket och maten.
  // Den ligger UNDER `_matL`, så en matbit som råkar hamna över en lucka alltid vinner
  // pekningen — det är maten barnet siktar på.
  _byggStationer(ctx, stationer) {
    this._stationer = stationer
    this._oppnaSt = []
    for (const st of stationer) {
      const { x, y, w, h } = st.yta
      const hit = new Graphics().rect(x, y, w, h).fill({ color: 0xffffff, alpha: 0 })
      hit.eventMode = 'static'
      hit.cursor = 'pointer'
      st._tryck = () => this._tryckStation(ctx, st)
      hit.on('pointertap', st._tryck)
      st._hit = hit
      this._klickL.addChild(hit)
    }
  },

  _tryckStation(ctx, st) {
    this._idle = 0
    if (!this._alive) return
    // ⚠️ Återkopplingen kommer FÖRE upptagen-spärren. Låg `kvittera` efter den blev varje
    //    tryck på en lucka under rapfinalen (3,4 s) helt tyst — och en station svarar inte
    //    via `_tomtTryck`, för den pekningen når aldrig roten. Det är P0-brottet
    //    `dod-traffyta` (se `scripts/_tystprobe.mjs`), och sondens mönstermatchning
    //    fångade det inte: den letar efter kända handlarnamn.
    kvittera(ctx.fxLayer, st.yta.x + st.yta.w / 2, st.yta.y + st.yta.h / 2, ctx.services.audio,
      { color: 0xffe3b0, maxR: 74 })
    if (this._busy) return
    if (st.typ === 'knapp') return this._knapp(ctx, st)
    if (st.oppen) return this._stangStation(ctx, st)

    // Taket: högst OPPNA_MAX luckor öppna samtidigt. Den äldsta stängs — samma sorts
    // gräns som geggans, och av samma skäl (P0 MOTGÅNG: tak på hur mycket samtidigt).
    while (this._oppnaSt.length >= OPPNA_MAX) this._stangStation(ctx, this._oppnaSt[0])

    st.oppna()
    this._oppnaSt.push(st)
    // Ett riktigt skåp som öppnas, om klippet finns. Den stämda tonen ligger kvar som
    // reserv och som ackompanjemang: klippet är trä och gångjärn, tonen är kvitteringen.
    if (!(ctx.services.audio.harSample?.('lucka') && ctx.services.audio.sample('lucka'))) {
      ctx.services.audio.sfx('soft')
    }
    ctx.services.audio.tone({ freq: 330, dur: 0.1, vol: 0.16, slideTo: 470 })
    // Mikron säger PLING när luckan öppnas — en ren kvint uppåt (1180→1770), som en
    // riktig micro som blivit klar. Det är stationens egen röst, inte ett UI-blipp.
    if (st.id === 'micro') {
      ctx.services.audio.tone({ freq: 1180, dur: 0.14, type: 'sine', vol: 0.18, delay: 0.16 })
      ctx.services.audio.tone({ freq: 1770, dur: 0.22, type: 'sine', vol: 0.15, delay: 0.3 })
    }

    // Innehållet lottas per öppning, så samma skåp inte ger samma sak varje gång.
    st._saker = []
    const val = shuffle([...st.innehall]).slice(0, st.platser.length)
    val.forEach((key, i) => {
      const rec = this._skapaFor(ctx, {
        key,
        farg: sakFarg(key),
        min: sakMin(key),
        atbar: arAtbar(key),
        mtrl: sakMaterial(key),
        pruttar: sakPruttar(key),
        vy: () => makeSak(key),
      }, st.platser[i], i, 0.1 + i * 0.08)
      rec._station = st
      st._saker.push(rec)
      this._mat.push(rec)
    })
    if (Math.random() < 0.6) ctx.services.voice.say('Titta vad som fanns där inne!')
  },

  _stangStation(ctx, st) {
    const i = this._oppnaSt.indexOf(st)
    if (i >= 0) this._oppnaSt.splice(i, 1)
    if (!st.oppen) return
    st.stang()
    ctx.services.audio.sfx('soft')
    // Det som ligger kvar åker in i skåpet igen. Det får inte bara försvinna: en sak som
    // blinkar bort mitt framför barnet läser som att den gick sönder.
    for (const rec of st._saker || []) this._plockaTillbaka(ctx, rec)
    st._saker = []
  },

  _plockaTillbaka(ctx, rec) {
    if (!rec || rec._uppaten) return
    this._lyftLos(rec) // bältet till hängslet: ingen kropp får överleva sin vy
    rec._uppaten = true
    this._drag?.removeItem?.(rec.view)
    const v = rec.view
    if (v.destroyed) return
    rec._inre?._fxLiv?.kill()
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    gsap.to(v.scale, { x: 0.1, y: 0.1, duration: 0.24, ease: 'power2.in' })
    gsap.to(v, { alpha: 0, duration: 0.24,
      onComplete: () => { if (!v.destroyed) v.destroy({ children: true }) } })
  },

  // Stationerna som inte öppnar något utan GÖR något. Alla är växlar: tryck igen och det
  // slutar. Ingen av dem kan misslyckas, och ingen av dem påverkar målet.
  _knapp(ctx, st) {
    const n = this._noder
    const audio = ctx.services.audio
    if (st.id === 'diskho') {
      this._vatten = !this._vatten
      if (n.strale) {
        n.strale.visible = true
        gsap.killTweensOf(n.strale.scale)
        gsap.to(n.strale.scale, { y: this._vatten ? 1 : 0.02, duration: 0.22,
          onComplete: () => { if (!this._vatten && n.strale && !n.strale.destroyed) n.strale.visible = false } })
      }
      audio.tone({ freq: this._vatten ? 620 : 300, dur: 0.12, type: 'sine', vol: 0.16 })
      // …och sedan RINNER det, så länge kranen står på. Klicket kvitterar tryckningen,
      // slingan är tillståndet. Se `_slinga`.
      this._slinga(ctx, 'kran', this._vatten, { klipp: 'kran', typ: 'brus', freq: 2100, q: 0.7, vol: 0.075 })
      if (this._vatten) ctx.services.voice.say('Vattnet rinner!')
      return
    }
    if (st.id === 'spis') {
      this._spisPa = !this._spisPa
      if (n.plattor) gsap.to(n.plattor, { alpha: this._spisPa ? 1 : 0.35, duration: 0.3 })
      audio.tone({ freq: this._spisPa ? 240 : 180, dur: 0.16, type: 'triangle', vol: 0.16 })
      // Kastrullen puttrar: lågt brus, inte en ton — en kokande gryta är bubblor.
      this._slinga(ctx, 'spis', this._spisPa, { klipp: 'koka', typ: 'brus', freq: 320, q: 2.2, vol: 0.055 })
      if (this._spisPa) ctx.services.voice.say('Nu kokar det i kastrullen!')
      return
    }
    if (st.id === 'flakt') {
      this._flaktPa = !this._flaktPa
      audio.tone({ freq: this._flaktPa ? 180 : 140, dur: 0.2, type: 'sawtooth', vol: 0.1 })
      // Fläkten SNURRADE TYST. Hjulet gick runt på skärmen medan ljudet var ett enda
      // brum vid tryckningen — för en tvååring är det en trasig orsak-verkan, samma sort
      // som senapen som inte gick att hälla.
      this._slinga(ctx, 'flakt', this._flaktPa, { klipp: 'flakt', typ: 'ton', freq: 96, q: 0.9, vol: 0.05 })
      if (this._flaktPa) ctx.services.voice.say('Fläkten surrar!')
      return
    }
    if (st.id === 'fonster') {
      // Fönstret ger inte samma sak varje gång: fågeln, en fjäril och en regnbåge turas
      // om. En ROTATION, inte en lottning — ett barn som knackar tre gånger ska hinna se
      // alla tre, och det är växlingen som lär det att trycka igen.
      audio.tone({ freq: 880, dur: 0.09, vol: 0.18, slideTo: 1180 })
      audio.tone({ freq: 990, dur: 0.09, vol: 0.16, slideTo: 1320, delay: 0.14 })
      if (n.sol) pop(n.sol, { scale: 1.35 })
      const vaxel = (this._fonsterVaxel = (this._fonsterVaxel || 0) + 1)
      const fjaril = n.fjaril
      const regnb = n.regnbage
      if (vaxel % 3 === 2 && fjaril && !fjaril.destroyed && !fjaril.visible) {
        this._fjarilFlyg(fjaril)
        ctx.services.voice.say('En fjäril flög förbi!')
        return
      }
      if (vaxel % 3 === 0 && regnb && !regnb.destroyed && !regnb.visible) {
        regnb.visible = true
        gsap.killTweensOf(regnb)
        gsap.to(regnb, { alpha: 0.95, duration: 0.5 })
        gsap.to(regnb, { alpha: 0, duration: 0.7, delay: 2.6, ease: 'power1.in',
          onComplete: () => { if (!regnb.destroyed) regnb.visible = false } })
        ctx.services.voice.say('Oj, en regnbåge!')
        return
      }
      // Fågeln landar på fönsterblecket, kvittrar och flyger iväg igen.
      const f = n.fagel
      if (f && !f.destroyed && !f.visible) {
        f.visible = true
        f.alpha = 0
        gsap.killTweensOf(f)
        gsap.to(f, { alpha: 1, y: 118, duration: 0.3, ease: 'back.out(2)' })
        gsap.to(f, { alpha: 0, y: 82, duration: 0.45, delay: 2.4, ease: 'power1.in',
          onComplete: () => { if (!f.destroyed) { f.visible = false; f.y = 118 } } })
        ctx.services.voice.say('En fågel kom och tittade in!')
      }
    }
  },

  // Fjärilen fladdrar tvärs över fönsterglaset: en sinusbana med vingslags-vickning.
  // Banan skrivs via ett proxy-objekt med destroyed-vakt — fjärilen ägs av `kok.js` och
  // kan vara riven när tweenen fortfarande tickar (exit mitt i flygningen).
  _fjarilFlyg(f) {
    f.visible = true
    f.alpha = 0
    f.position.set(246, 58)
    // 1,35× — i naturlig storlek var fjärilen en prick i sitt 160 px breda fönster
    // (kritikerfynd), och repliken lovar något värt att titta på. Banan är stramad så
    // vingspetsarna (±20 px skalade) håller sig innanför glaset.
    f.scale.set(1.35)
    gsap.killTweensOf(f)
    gsap.to(f, { alpha: 1, duration: 0.25 })
    gsap.to(f, { alpha: 0, duration: 0.3, delay: 2.9 })
    const st = { t: 0 }
    gsap.to(st, {
      t: 1, duration: 3.2, ease: 'none',
      onUpdate: () => {
        if (f.destroyed) return
        f.x = 246 + 112 * st.t
        f.y = 58 + Math.sin(st.t * Math.PI * 5) * 12
        f.rotation = Math.sin(st.t * Math.PI * 11) * 0.22
        // Vingslagen: `kok.js` lämnar vingarna som två egna barn med origo i kroppen.
        if (f.vingar) {
          const slag = Math.sin(st.t * Math.PI * 34) * 0.55
          if (f.vingar[0] && !f.vingar[0].destroyed) f.vingar[0].rotation = -slag
          if (f.vingar[1] && !f.vingar[1].destroyed) f.vingar[1].rotation = slag
        }
      },
      onComplete: () => { if (!f.destroyed) f.visible = false },
    })
  },

  // Vilorörelser i köket som bara går när något är påslaget. Ligger i spelets tick, så
  // ingenting tickar vidare efter att spelet lämnats.
  _kokTick(ctx, dt) {
    const n = this._noder
    if (this._flaktPa && n.flakthjul && !n.flakthjul.destroyed) n.flakthjul.rotation += dt * 0.012

    // Molnen driver i fönstret — ±6 px sinus kring sin födelseplats, alltid innanför
    // glaset. Eget prefix `_wx` (aldrig `_cx`: det är Container-transformens interna cache).
    if (n.moln) {
      this._molnT = (this._molnT || 0) + dt
      for (let i = 0; i < n.moln.length; i++) {
        const m = n.moln[i]
        if (m && !m.destroyed) m.x = (m._wx ??= m.x) + Math.sin(this._molnT / (2400 + i * 900)) * 6
      }
    }

    // Står spisen på länge KOKAR DET ÖVER: skum väller ur kastrullen i ett par sekunder
    // och lägger sig självt. En händelse att upptäcka, aldrig ett problem att lösa —
    // ingenting behöver åtgärdas och målet påverkas inte (P0 MOTGÅNG: tydlig orsak, tak,
    // lagom takt — var nionde sekund, aldrig två i rad).
    if (this._spisPa) {
      this._kokOverT = (this._kokOverT || 0) + dt
      if (this._kokOverT > 9000) {
        this._kokOverT = 0
        this._kokaOver(ctx)
      }
    } else {
      this._kokOverT = 0
    }
    this._angT = (this._angT || 0) + dt
    if (this._angT > 620) {
      this._angT = 0
      if (this._spisPa && n.gryta) {
        puff(ctx.fxLayer, n.gryta.x + (Math.random() - 0.5) * 30, n.gryta.y - 10,
          { count: 4, color: 0xffffff })
        // TVÅ saker som möts: står fläkten också på SUGS ångan upp i kåpan. Det är den
        // billigaste "objekten interagerar med varandra" som finns i köket, och den enda
        // som syns utan att man rör något.
        if (this._flaktPa) {
          for (let i = 1; i <= 3; i++) {
            ctx.later(i * 0.11, () => {
              if (!this._alive || !this._flaktPa || !this._spisPa) return
              const t = i / 3
              puff(ctx.fxLayer, n.gryta.x + (956 - n.gryta.x) * t + (Math.random() - 0.5) * 16,
                n.gryta.y - 10 + (104 - (n.gryta.y - 10)) * t,
                { count: 3, color: 0xffffff })
            })
          }
        }
      }
      if (this._vatten && n.ho) {
        puff(ctx.fxLayer, n.ho.x + (Math.random() - 0.5) * 24, n.ho.y - 4,
          { count: 3, color: 0x8fd6f5 })
      }
    }
  },

  // Skummet: sju gräddvita puffar som väller över kastrullkanten, växelvis vänster/höger
  // och en aning längre ner för varje — det RINNER, inte exploderar. Kedjan avbryts om
  // spisen stängs av mitt i (orsaken försvann → verkan slutar).
  _kokaOver(ctx) {
    const n = this._noder
    if (!n?.gryta) return
    ctx.services.audio.tone({ freq: 170, dur: 0.5, type: 'sawtooth', vol: 0.1, slideTo: 95 })
    if (Math.random() < 0.7) ctx.services.voice.say('Oj, nu kokar det över!')
    if (n.kastrull && !n.kastrull.destroyed) shake(n.kastrull, { intensity: 3, duration: 0.8 })
    for (let i = 0; i < 7; i++) {
      ctx.later(0.12 + i * 0.16, () => {
        if (!this._alive || !this._spisPa || !n.gryta) return
        const s = i % 2 ? 1 : -1
        puff(ctx.fxLayer, n.gryta.x + s * (36 + Math.random() * 10), n.gryta.y + 6 + i * 4,
          { count: 4, color: 0xfff3e0 })
      })
    }
  },

  // ------------------------------------------------------------------ äta ---

  // Något oätligt hamnade i munnen. Pappa smakar, grimaserar och spottar ut det — och
  // saken landar tillbaka på bänken i stället för att bara upphöra.
  _spotta(ctx, rec) {
    const v = rec.view
    const a = this._ans
    ctx.services.audio.sfx('pop')
    a?.slappMin(0.1)
    a?.tugga(1)
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    rec._inre?._fxLiv?.kill()
    gsap.to(v.scale, { x: 0.4, y: 0.4, duration: 0.16, ease: 'power2.in' })
    ctx.later(0.34, () => {
      if (!this._alive) return
      const utMin = rec.data.min || 'acklad'
      a?.min(utMin, { hall: Math.max(1.4, this._sag(ctx, utMin) + 0.1) })
      if (a?.view && !a.view.destroyed) shake(a.view, { intensity: 8, duration: 0.42 })
      if (!v.destroyed) {
        // Ut ur munnen som en RIKTIG kastad kropp: gaffeln flyger, studsar på bänken och
        // blir liggande bland allt annat. Att bara tona bort den vore att säga att saken
        // upphörde att finnas — det här säger att pappa spottade ut den.
        v.scale.set(rec.view._fxRestScale?.x ?? 1, rec.view._fxRestScale?.y ?? 1)
        rec._uppaten = false
        this._gorLos(ctx, rec, {
          vx: (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 4),
          vy: -7 - Math.random() * 3,
        })
      }
      puff(ctx.fxLayer, ANS.x, this._munY + 20, { count: 8, color: rec.data.farg })
      if (Math.random() < 0.6) ctx.services.voice.say('Blää, det där gick inte att äta!')
    })
    this._frigor(ctx, rec)
  },

  _ata(ctx, rec) {
    if (!this._alive || rec._uppaten) return
    rec._uppaten = true
    this._idle = 0
    // Draget äger gapet fram hit; tuggan äger det härefter. Nedräkningen i ticken
    // ("stäng munnen igen") och tuggans tween skriver båda till `gap()`, och utan den här
    // raden är det bara TIDTABELLEN som håller isär dem — uppmätt i `_munprobe --trace`
    // hinner nedräkningen bli klar (~260 ms) strax innan tuggan börjar (240 ms efter att
    // biten släppts). Marginalen är alltså tiotals millisekunder och beror på draget:
    // överlappet är inte observerat, men det ska inte bero på det.
    this._gapNu = 0
    const key = rec.data.key
    const farg = rec.data.farg
    const v = rec.view

    // Oätligt går inte in i magen. Pappa smakar, grimaserar och spottar ut — stor
    // reaktion, noll framsteg, och aldrig ett fel. (P0: bestraffa inte, blockera inte.)
    if (rec.data.atbar === false) return this._spotta(ctx, rec)

    // VAR DET DEN HAN VILLE HA? Läses INNAN önskan släpps — och belöningen är ceremoni,
    // aldrig mätarhöjd: en bit som ger mer framsteg gör de andra bitarna till fel svar,
    // och då är önskan plötsligt en uppgift man kan misslyckas med (P0).
    //
    // ⚠️ BARA DEN ÖNSKADE BITEN SLÄPPER ÖNSKAN. Raden stod ovillkorlig och sonden fällde
    // den direkt: åt man något ANNAT försvann ringen, alltså blev "fel" bit det som
    // släckte hans lust — motsatsen till avsikten och en tyst bestraffning. Lusten står
    // kvar tills han får det han bad om (eller tröttnar och pekar på något annat).
    const onskad = this._onskan?.rec === rec
    if (onskad) this._slappOnskan()

    // Maten åker in i munnen: krymper och släcks. Draget har precis kört sin landning —
    // döda den tweenen först, annars drar två tweens i samma skala.
    gsap.killTweensOf(v.scale)
    rec._inre?._fxLiv?.kill()
    gsap.to(v.scale, {
      x: 0.12, y: 0.12, duration: 0.26, ease: 'power2.in',
      onComplete: () => { if (!v.destroyed) v.visible = false },
    })
    gsap.to(v, { y: this._munY + 10, duration: 0.26, ease: 'power2.in' })

    ctx.services.audio.sfx('pop')

    const a = this._ans
    a?.slappMin(0.1)
    const prof = tuggProfil(key)
    ctx.later(0.24, () => {
      if (!this._alive) return
      // En morot knaprar fem gånger fort och grunt, en kola tuggas två gånger djupt och
      // segt, saft klunkas en gång. Ljudet hänger på käkens egen takt via `onTugg`.
      a?.tugga(prof.n, {
        takt: prof.takt, djup: prof.djup,
        onTugg: (i) => this._tuggLjud(ctx, prof, i),
      })
      this._skymt(ctx, farg, prof)
      this._smulor(ctx, farg, prof)
      // Sväljningen: förr tog maten slut i tystnad, och `pop` (samma ljud som en utspottad
      // gaffel) var det sista man hörde. Ligger efter sista sammanbitningen.
      ctx.later(prof.n * prof.takt * 2 + 0.12, () => { if (this._alive) this._svalj(ctx) })
    })

    // Bönor och kål pruttar ALLTID, ett par andra saker ibland. Efter sväljningen och efter
    // minen, så de tre inte trängs: tugga → svälj → grimas → prutt.
    const pruttar = rec.data.pruttar
    if (pruttar === 'alltid' || (pruttar === 'ibland' && Math.random() < 0.35)) {
      ctx.later(prof.n * prof.takt * 2 + 1.5, () => this._prutt(ctx))
    }

    this._atna += 1
    this._fyllTill(this._atna / this._antal)
    this._andas(ctx)
    this._frigor(ctx, rec)

    // Sällsynt wow (~1 på 8): grimasen hålls längre, ansiktet skakar och det glittrar.
    // Den ÖNSKADE biten får samma wow garanterat — hela belöningen ligger i ceremonin,
    // eftersom framstegen medvetet är oförändrade.
    const wow = onskad || Math.random() < 0.125
    if (onskad) {
      // Firandet ligger på DEN HÄR sidan av `later(0.92)`: glädjen ska komma i samma
      // ögonblick som biten försvinner in i munnen, inte efter tuggan. Hjärtat på burkens
      // lock pulserar med — det är den enda platsen i rummet som redan betyder "bra".
      sparkle(ctx.fxLayer, ANS.x, this._munY, { count: 14 })
      if (this._hjarta && !this._hjarta.destroyed) pop(this._hjarta, { scale: 1.9 })
      ctx.services.audio.sfx('correct')
    }
    ctx.later(0.92, () => {
      if (!this._alive) return
      let namn = rec.data.min || 'lycksalig'
      // `fundersam` bar fyra brädmatbitar OCH hela reservvägen för katalogen — samma
      // rynkade panna om och om igen. Hälften av dem blir nu `skeptisk` i stället: samma
      // betydelse, ett annat ansikte. (Variation som inte kräver en ny orsak.)
      if (namn === 'fundersam' && Math.random() < 0.5) namn = 'skeptisk'
      const sek = this._sag(ctx, namn)
      // Minen sitter kvar minst så länge pappa låter: `pappa_surt` är 1,90 s och ansiktet
      // hade annars hunnit bli neutralt mitt i hans egen sura reaktion.
      a?.min(namn, { hall: Math.max(wow ? 2.4 : 1.4, sek + 0.1) })
      // Senapen är stark men INTE chilin: mildare rodnad, färre ångpuffar och en egen
      // replik. Utan skillnaden var senapen en repris av chilireaktionen (kritikerfynd)
      // — §4:s hela poäng med nya smaker är att de ska ge EGNA orsaker.
      if (namn === 'het') this._hetta(ctx, sek, key === 'senap' ? 0.55 : 1)
      // ISBITEN. Grimasen satt förr på `het` — flämtningen stämde, men ansiktet RODNADE
      // av en iskub. Nu blir han kall i stället, och huttrar: `tveka` med liten vinkel och
      // hög takt är en huttring, samma gest med stor vinkel och låg takt är en tvekan.
      if (key === 'is') {
        this._kyla(ctx, sek)
        a?.tveka({ vinkel: 0.022, varv: 6, tid: 0.08 })
      } else if (namn === 'skeptisk' || namn === 'fundersam') {
        a?.tveka()
      }
      if (wow) {
        if (a?.view && !a.view.destroyed) shake(a.view, { intensity: 7, duration: 0.5 })
        sparkle(ctx.fxLayer, ANS.x, this._ogonY, { count: 10 })
      }
      if (onskad) {
        // Bekräftelsen ersätter narratorns vanliga kommentar i stället för att läggas
        // ovanpå den — den är hela poängen med draget och ska stå ensam. Och den väntar
        // in BÅDA rösterna: klippet är 2,71 s, alltså längre än varje fast tal i finalen.
        this._narTyst(ctx, () => ctx.services.voice.say('Precis den pappa ville ha!'))
      } else if (key === 'senap') {
        const sag = () => { if (this._alive) ctx.services.voice.say('Oj, vad stark senapen var!') }
        if (Math.random() < 0.7) { if (sek <= 0.35) sag(); else ctx.later(sek + 0.15, sag) }
      } else {
        this._replikEfterMin(ctx, namn, sek)
      }
    })

    ctx.later(1.15, () => {
      if (!this._alive) return
      if (this._atna >= this._antal) this._final(ctx)
    })

    // Nästa lust. Ligger efter minen och repliken, och `_valjOnskan` avstår själv när
    // brädan inte har två bitar kvar att välja mellan.
    ctx.later(ONSKAN.efterTugga + (onskad ? 0.9 : 0), () => {
      if (this._alive && !this._busy && !this._onskan) this._valjOnskan(ctx)
    })
  },

  // Ett knaster/smask per sammanbitning. Tonhöjden varierar ±7 % — tre identiska blipp i
  // rad läses som ett fel i ljudet, medan samma ljud med liten variation läses som samma
  // mun som tuggar igen. Klippet först när ägaren spelat in det (`harSample`).
  _tuggLjud(ctx, prof, i) {
    const audio = ctx.services.audio
    if (audio.harSample?.(prof.klipp) && audio.sample(prof.klipp)) return
    const f = prof.ton * (0.93 + Math.random() * 0.14)
    audio.tone({ freq: f, dur: prof.takt * 0.7, type: prof.typ, vol: prof.vol, slideTo: f * 0.86 })
  },

  // Sväljningen. `svalj` är en HÖG av fyra klipp — pappas egen sväljning och tre foley —
  // och tjänsten slumpar. Att svälja låter alltså inte likadant varje gång, vilket är
  // skillnaden mellan en ljudeffekt och en person som äter.
  _svalj(ctx) {
    const audio = ctx.services.audio
    if (audio.harSample?.('svalj') && audio.sample('svalj')) return
    audio.tone({ freq: 260, dur: 0.16, type: 'sine', vol: 0.17, slideTo: 120 })
  },

  // PRUTTEN. Bönor och kål gör det ALLTID, ett par andra saker ibland — orsak-verkan som en
  // tvååring hittar själv: den maten ger det ljudet. Ligger efter sväljningen, aldrig under
  // tuggandet, och drar med sig ett skratt i stället för en tillsägelse (P0: motgång ska vara
  // rolig). Räknas inte som bus och kostar ingenting i mätaren — maten är redan uppäten.
  _prutt(ctx, sek = 0) {
    if (!this._alive) return
    const audio = ctx.services.audio
    // `prutt_lang` är den sällsynta långa; de fem korta ligger i en hög som slumpas.
    const lang = Math.random() < 0.15
    const nyckel = lang && audio.harSample?.('pappa_prutt_lang') ? 'pappa_prutt_lang' : 'pappa_prutt'
    if (!(audio.harSample?.(nyckel) && audio.sample(nyckel))) {
      audio.sfx('fart') // appens egen prutt-syntes — den fanns långt före klippen
    }
    const dur = audio.sampleDuration?.(nyckel) || 0.6
    this._ans?.slappMin(0.1)
    this._ans?.min('skratt', { hall: Math.max(1.2, dur + 0.2) })
    this._ans?.ryck({ styrka: 0.5 })
    puff(ctx.fxLayer, ANS.x, KANT_Y + 30, { count: 7, color: 0xcfe3b0 })
    // ⚠️ Literaler, inte `randomFrom([...])`: `check.mjs` läser bara `voice.say('…')` statiskt,
    // och en replik som byggs vid körning får aldrig ett inspelat klipp.
    const sag = () => {
      if (!this._alive) return
      if (Math.random() < 0.5) ctx.services.voice.say('Hoppsan, vad var det?')
      else ctx.services.voice.say('Oj då, det bubblade i magen!')
    }
    ctx.later(Math.max(sek, dur) + 0.15, sag)
  },

  _smulor(ctx, farg, prof = TUGG.mjuk) {
    // Smulorna följer tuggtakten — annars ryker det ur munnen i en annan rytm än käken
    // rör sig, vilket är precis det som får en animation att kännas "påklistrad".
    for (let i = 0; i < Math.max(2, prof.n); i++) {
      ctx.later(0.1 + i * prof.takt * 2, () => {
        if (!this._alive) return
        puff(ctx.fxLayer, ANS.x + (Math.random() - 0.5) * 70, this._munY + 24, { count: 5, color: farg })
      })
    }
  },

  // En SKYMT av matens färg mellan tänderna medan käken tuggar. Utan den försvinner biten
  // i ett svart hål och grimasen kommer ur ingenting — skymten knyter ihop "biten åkte in"
  // med "pappa tuggar på DEN". Klämningarna ligger på tuggens egen takt (0,22 s, samma som
  // tonerna). Allt tweenas via ett proxy-objekt med destroyed-vakt: skymten lever under en
  // sekund och spelaren kan lämna mitt i (exit-säkerhet, samma mönster som feedback.js).
  _skymt(ctx, farg, prof = TUGG.mjuk) {
    if (!this._ans || !this._matL || this._matL.destroyed) return
    const g = new Graphics()
    g.ellipse(0, 0, 25, 11).fill({ color: farg, alpha: 0.92 })
    g.ellipse(-7, -3, 8, 4).fill({ color: 0xffffff, alpha: 0.3 })
    g.eventMode = 'none'
    g.position.set(ANS.x, this._munY + 6)
    // Under maten som dras (skymten får aldrig ligga över en bit på väg mot munnen),
    // över ansiktet.
    this._matL.addChildAt(g, 0)
    const st = { s: 0, klam: 1 }
    const tl = gsap.timeline({
      onUpdate: () => { if (!g.destroyed) g.scale.set(st.s, st.s * st.klam) },
      onComplete: () => { if (!g.destroyed) g.destroy() },
    })
    tl.to(st, { s: 1, duration: 0.12, ease: 'back.out(2.2)' })
    // Klämningarna på tuggans EGNA takt (`prof.takt`) och lika många som tuggorna — en
    // fast rytm hade gjort att skymten och käken gick isär så fort takten blev materialets.
    tl.to(st, { klam: 0.3, duration: prof.takt, ease: 'sine.inOut', repeat: Math.max(1, prof.n * 2 - 1), yoyo: true })
    tl.to(st, { s: 0, duration: 0.14, ease: 'power2.in' })
  },

  // ------------------------------------------------------------------ bus ---

  // Släpp utanför munnen. Ligger släppet PÅ ansiktet fastnar maten och blir gegga; ligger
  // det utanför har `DragController` redan snäppt hem biten och inget mer behöver hända.
  _miss(ctx, rec) {
    if (!this._alive || rec._uppaten) return
    this._idle = 0
    if (!this._iAnsiktet(rec.tx, rec.ty)) {
      // MATEN LADES TILLBAKA. Släppet låg utanför både munnen och ansiktet — biten snäpper
      // hem av sig själv (`DragController._snapHome`) och det här var förr helt tyst.
      // Pappa gapade ju medan biten var på väg, så tystnaden läser som att ingenting hände;
      // ett besviket "ehh" gör det till ett SVAR. Ingen tillsägelse, ingen kostnad.
      const audio = ctx.services.audio
      if (audio.harSample?.('pappa_ehh') && audio.sample('pappa_ehh')) {
        const sek = audio.sampleDuration?.('pappa_ehh') || 0.8
        this._ans?.slappMin(0.1)
        this._ans?.min('fundersam', { hall: Math.max(0.9, sek + 0.1) })
      }
      return
    }

    gsap.killTweensOf(rec.view) // avbryt hemsnäppet — biten stannar i ansiktet
    rec._uppaten = true
    this._gegga(ctx, rec)
    this._frigor(ctx, rec)

    // Miner efter var det landade — men en spindel i pannan är inte samma sak som en
    // banan i pannan, så en sak med egen stark min (`aj`, `acklad`) behåller sin.
    // OCH GEGGAN TRAPPAR: från femte fläcken ger pappa upp och börjar fnissa i stället —
    // skakningen växer och repliken byts. Femte fläcken ska inte kännas som den första
    // (§4 Variation), och eskalering mot skratt är motsatsen till tillsägelse (P0).
    const grad = this._geggor.length
    const egen = rec.data.min === 'aj' || rec.data.min === 'acklad' ? rec.data.min : null
    // En KASTRULL i pannan är inte en banan i pannan. Hårda saker (`hard`, samma flagga
    // som avgör att de kilas fast i stället för att rinna) ger chock: vidöppna ögon OCH
    // mun. Mjuka saker under ögonlinjen får hälften `retas` — tungan ut med öppna ögon
    // är ett svar på buset, inte en tillsägelse, och `forvanad` ensam blev en repris.
    const namn = egen || (grad >= 5 ? 'skratt'
      : rec.data.hard === true ? 'chock'
        : rec.ty < this._ogonY ? (Math.random() < 0.5 ? 'aj' : 'skratt')
          : (Math.random() < 0.5 ? 'retas' : 'forvanad'))
    this._ans?.slappMin(0.1)
    const sek = this._sag(ctx, namn)
    this._ans?.min(namn, { hall: Math.max(1.3, sek + 0.1) })
    // Huvudet RYCKER av träffen. `shake` skakar hela bilden (kameran), medan `ryck` är
    // pappa själv som far bakåt och kommer tillbaka — det är skillnaden mellan att
    // skärmen darrar och att någon blev påkörd i ansiktet.
    this._ans?.ryck({ styrka: namn === 'chock' ? 1.3 : 0.85 })
    if (this._ans?.view && !this._ans.view.destroyed) {
      shake(this._ans.view, { intensity: grad >= 5 ? 8 : 5, duration: grad >= 5 ? 0.5 : 0.34 })
    }
    if (grad >= 5) {
      // Samma vänta-ut-pappa-regel som `_replikEfterMin`: två svenska röster samtidigt
      // är värre än en paus.
      const sag = () => { if (this._alive) ctx.services.voice.say('Nu är pappa alldeles kladdig!') }
      if (sek <= 0.35) sag()
      else ctx.later(sek + 0.15, sag)
    } else {
      this._replikEfterMin(ctx, namn, sek)
    }
  },

  _gegga(ctx, rec) {
    const v = rec.view
    const farg = rec.data.farg
    const x = rec.tx
    const y = rec.ty

    // Kleten under maten är en MJUK KROPP — och bara den NYASTE. Det är hela regeln för
    // mjuka kroppar i det här repot: gör bara det mjukt som deformeras just nu (CLAUDE.md,
    // `pruttbad` mätte högst 3 samtidigt). En klick som splattar ut vid nedslaget och
    // sedan lägger sig är skillnaden mot en fläck som bara dyker upp färdig.
    //
    // Den fryser efter 1,4 s: sista ritningen ligger kvar i sin `Graphics`, kroppen
    // slängs, och nästa gegga får bli den mjuka. Aldrig mer än EN i taget.
    this._frysGegga()
    const kladdig = rec.data.hard !== true
    const klet = new Graphics()
    // VILOFORMEN är redan utsplattad (bred och låg) — det är så en klick som träffat ett
    // ansikte ser ut. Första försöket byggde en rund kropp och knuffade ut den vid
    // nedslaget; mätningen mot en oknuffad kontrollarm visade att hela deformationen var
    // borta efter SEX steg (88 → 78 px på 0,1 s), alltså osynlig. Kroppen bär nu formen,
    // och det mjuka är VOBBELN när den landar: låg styvhet + hög dämpning ger en
    // svängning som lägger sig över ungefär en sekund.
    // En hård sak kladdar inte ut sig: klicken blir en liten kontaktfläck där den kilats
    // fast, inte en pöl. Samma kropp, mindre viloform.
    const kropp = makeMjukkropp({
      x, y, w: kladdig ? 84 : 46, h: kladdig ? 44 : 26, punkter: 12, grav: 0,
      damp: 0.93, iter: 4, tryck: 1.04, styvhet: 0.16,
    })
    // Nedslaget uppifrån: klicken trycks ihop och studsar — men `form: true`, annars är
    // knuffen en FART och fläcken glider 57 px ner från sin matbit (se `mjukkropp.js`).
    kropp.knuff(x, y - 26, 14, 90, { form: true })
    // RINNMÄRKEN. Det är de som säger "kladdigt" — en fläck utan dem är bara en form.
    // Modellen är `tarta-i-ansiktet`s grädde (`blob._spar`): avsmalnande strimmor nedåt.
    // De VÄXER över ~0,7 s, så kladdet rinner medan man tittar i stället för att stå
    // färdigt. Hårda saker får inga alls.
    const rinn = kladdig
      ? Array.from({ length: 2 + ((Math.random() * 3) | 0) }, () => ({
        dx: (Math.random() - 0.5) * 58,
        lang: 15 + Math.random() * 30,
        bred: 4 + Math.random() * 5,
      }))
      : []
    // Ankaret är kroppens EGNA tyngdpunkt vid födseln, inte (x, y) — se `tyngdpunkt`.
    const ank = kropp.tyngdpunkt
    this._mjuk = { kropp, g: klet, farg, t: 0, acc: 0, rinn, x: ank.x, y: ank.y }

    // SAKEN SOM FASTNAT. Den ritades förut som en ren, upprätt ikon ovanpå klicken —
    // och eftersom klicken dessutom gled neråt (se knuffen ovan) läste hela paret som
    // ett föremål som SVÄVAR över ansiktet med en skugga under sig. Ägarrapport #9+#10.
    //
    // Maten går inte att deformera på riktigt: varje rätt är 4–7 lagrade `Graphics` utan
    // en silhuett att töja i, och `generateTexture` är förbjudet (CLAUDE.md). Det som
    // FUNGERAR är en behandling av den ritning som finns — tryck ihop den mot huden och
    // luta den mer. En kladdig sak plattas till; en hård sak (gaffel, spindel) plattas
    // inte men kilas fast i en större vinkel.
    const hard = rec.data.hard === true
    const bit = new Container()
    bit.position.set(x, y)
    bit.rotation = (Math.random() - 0.5) * (hard ? 1.9 : 1.1)
    bit.scale.set(0.62 * (hard ? 1 : 1.14), 0.62 * (hard ? 1 : 0.78))
    bit.eventMode = 'none'
    bit.addChild(rec.data.vy())

    this._geggaL.addChild(klet, bit)
    // `rec` följer med: när geggan ploppar av är det SAKEN som ska falla ner på bänken,
    // inte geggans miniatyr. Se `_ploppa`.
    const g = { klet, bit, farg, kropp, rec }
    this._geggor.push(g)
    if (!v.destroyed) v.visible = false

    gsap.from(bit.scale, { x: 0.9, y: 0.9, duration: 0.28, ease: 'back.out(2.4)' })
    // Kladdig gegga GLIDER en aning innan den fastnar — ankaret (`_mjuk.y`, ett vanligt
    // objekt) och biten tweenas ihop, så klet och mat följs åt. `flyttaTill` läser ankaret
    // varje steg; hårda saker sitter fast direkt (de är fastkilade, inte klibbiga).
    if (kladdig) {
      const mj = this._mjuk
      gsap.to(mj, { y: mj.y + 9, duration: 0.55, ease: 'power2.out' })
      gsap.to(bit, { y: y + 9, rotation: bit.rotation + (Math.random() - 0.5) * 0.14,
        duration: 0.55, ease: 'power2.out' })
    }
    puff(ctx.fxLayer, x, y, { count: 6, color: farg })
    ctx.services.audio.sfx('soft')

    // Taket: den äldsta geggan ploppar av. Ansiktet blir aldrig helt övertäckt, och
    // barnet kan busa hur länge det vill utan att spelet stannar.
    if (this._geggor.length > GEGGA_MAX) {
      const gammal = this._geggor.shift()
      this._ploppa(ctx, gammal)
    }
  },

  // Geggan ploppar av ansiktet och FALLER NER PÅ BÄNKEN. Tidigare tonade den bara bort
  // på vägen ner, vilket sa att den upphörde att finnas; nu landar den bland allt annat
  // och knuffar undan det som redan ligger där. Kleten följer inte med — den är en fläck
  // på huden, inte ett föremål.
  // Frys den mjuka geggan: sluta stega, behåll bilden. Utan detta tickar en verlet-kropp
  // per fläck vidare i all evighet — och sex av dem är sex solvers ingen ser.
  _frysGegga() {
    if (!this._mjuk) return
    this._mjuk.kropp.destroy()
    this._mjuk = null
  },

  // ⚠️ FAST TIDSSTEG. `Mjukkropp` räknar dämpning och villkorsstyvhet per STEG men
  //    kraftfält per f² — ett för stort steg viker ihop kroppen för gott, ett för litet
  //    ger en helt annan jämvikt (CLAUDE.md). Ackumulatorn stegar alltid med exakt 1.
  _mjukTick(dtMS) {
    const m = this._mjuk
    if (!m) return
    if (m.g.destroyed) { this._frysGegga(); return }
    m.acc += dtMS / (1000 / 60)
    let n = 0
    // Fläcken sitter på HUD. Den får svänga, men inte vandra — förankringen efter varje
    // steg är det som gör den till en fläck i stället för en droppe som rinner iväg.
    while (m.acc >= 1 && n < 4) { m.kropp.steg(1); m.kropp.flyttaTill(m.x, m.y); m.acc -= 1; n++ }
    m.acc = Math.min(m.acc, 2)
    m.g.clear()
    m.kropp.path(m.g)
    m.g.fill({ color: m.farg, alpha: 0.55 })
    m.t += dtMS

    // Rinnmärkena hängs på klickens FAKTISKA underkant, inte på viloformens — kroppen
    // deformeras, och en droppe som startar i luften under en hoptryckt klick ser lös.
    if (m.rinn?.length) {
      let cx = 0
      let botten = -1e9
      for (const p of m.kropp.pts) { cx += p.x; if (p.y > botten) botten = p.y }
      cx /= m.kropp.pts.length
      const vaxt = Math.min(1, m.t / 700)
      for (const r of m.rinn) {
        const x0 = cx + r.dx
        const y0 = botten - 4
        const l = r.lang * vaxt
        const b = r.bred
        m.g.moveTo(x0 - b / 2, y0)
          .quadraticCurveTo(x0 - b * 0.4, y0 + l * 0.7, x0, y0 + l)
          .quadraticCurveTo(x0 + b * 0.4, y0 + l * 0.7, x0 + b / 2, y0)
          .closePath()
        m.g.circle(x0, y0 + l, b * 0.42)
      }
      m.g.fill({ color: m.farg, alpha: 0.5 })
    }
    if (m.t > 1400) this._frysGegga()
  },

  _ploppa(ctx, g) {
    if (!g) return
    const levande = g.bit && !g.bit.destroyed ? g.bit : null
    const x = levande ? levande.x : 0
    const y = levande ? levande.y : 0
    if (this._mjuk && this._mjuk.g === g.klet) this._frysGegga()
    if (g.klet && !g.klet.destroyed) {
      gsap.to(g.klet, { alpha: 0, duration: 0.35,
        onComplete: () => { if (!g.klet.destroyed) g.klet.destroy({ children: true }) } })
    }
    // Det som faller ner på bänken ska vara SAKEN i sin riktiga storlek — inte geggans
    // miniatyr. Förut skickades `bit` (skala 0,62) ner som en SYNTETISK `rec` som aldrig
    // fanns i dragets register: högen fylldes med saker i två storlekar, och de som kom
    // den här vägen gick aldrig att plocka upp (ägarrapport #8, båda halvorna).
    // Originalvyn har legat dold sedan `_gegga` och är fortfarande dragets egen.
    const rec = g.rec
    if (levande && !levande.destroyed) {
      // Glid-tweenen från `_gegga` kan fortfarande skriva `y` — döda den innan biten
      // rivs, annars skriver den till en förstörd transform.
      gsap.killTweensOf(levande)
      gsap.to(levande, { alpha: 0, duration: 0.18,
        onComplete: () => { if (!levande.destroyed) levande.destroy({ children: true }) } })
    }
    if (rec?.view && !rec.view.destroyed) {
      const v = rec.view
      // Matlagret, inte geggalagret: geggan ligger BAKOM köksön och en sak som faller ner
      // på bänken måste ritas framför den.
      v.parent?.removeChild(v)
      this._matL.addChild(v)
      v.position.set(x, y)
      v.scale.set(v._fxRestScale?.x ?? 1, v._fxRestScale?.y ?? 1)
      v.rotation = 0
      rec._uppaten = false // tillbaka i spel: den ska gå att mata pappa igen (jfr `_spotta`)
      this._gorLos(ctx, rec, { vx: (Math.random() - 0.5) * 3, vy: 1.5 })
    }
    // Ljudet av något klibbigt som SLÄPPER från huden. Geggan har suttit i ansiktet sedan
    // den landade; att den bara tonade bort i tystnad var den sista tysta händelsen i loopen.
    if (!(ctx.services.audio.harSample?.('plopp_av') && ctx.services.audio.sample('plopp_av'))) {
      ctx.services.audio.sfx('plopp')
    }
    if (x || y) puff(ctx.fxLayer, x, y, { count: 4 })
  },

  _torkaRent(ctx) {
    const geggor = this._geggor
    this._geggor = []
    geggor.forEach((g, i) => {
      ctx.later(i * 0.06, () => { if (this._alive) this._ploppa(ctx, g) })
    })
  },

  // ----------------------------------------------------------------- ljud ---

  // Pappas röst: det inspelade klippet om det finns, annars minens stämda signatur.
  // Returnerar hur LÄNGE han låter, i sekunder — den som schemalägger något efter honom
  // ska läsa längden, inte gissa den. Se `_replikEfterMin`.
  _sag(ctx, namn) {
    const r = ROST[namn]
    if (!r) return 0
    const audio = ctx.services.audio
    const klart = (sek) => {
      // När pappa slutar låta. `_narTyst` läser det så narratorn aldrig hamnar ovanpå
      // honom — förr höll varje anropare reda på det själv med sin egen `later(sek)`.
      this._pappaTill = Math.max(this._pappaTill || 0, performance.now() + sek * 1000)
      return sek
    }
    if (audio.harSample?.(r.klipp) && audio.sample(r.klipp)) {
      return klart(audio.sampleDuration?.(r.klipp) || 0)
    }
    audio.tone({ freq: r.ton[0], dur: 0.3, type: r.typ, vol: 0.22, slideTo: r.ton[1] })
    return klart(0.3)
  },

  // Kör `fn` först när BÅDA rösterna är klara: pappas eget klipp (längden är känd via
  // `_sag`) och narratorns pågående replik (`voice.kvar` — se VoiceService).
  //
  // ⚠️ MÄTT, INTE ANAT. `VoiceService.say()` kallar `cancel()`, så varje ny replik KAPAR
  // den förra. De neurala klippen här är 2,28–4,06 s långa medan schemat är fasta tal på
  // 2,2–3,4 s: introt (3,65 s) kapades av första önskan och bekräftelsen "Precis den pappa
  // ville ha!" (2,71 s) hann höras till 54 % innan nästa lust avbröt den. Det är samma
  // familj som fällde finalen i v1.194 — bara åt andra hållet: inte två röster på en
  // gång, utan en röst som aldrig får tala till punkt.
  _narTyst(ctx, fn, varv = 0) {
    if (!this._alive) return
    const kvar = Math.max(
      ((this._pappaTill || 0) - performance.now()) / 1000,
      ctx.services.voice.kvar || 0,
      ctx.services.voice.talar ? 0.25 : 0, // köad mening utan avkodad längd än
    )
    if (kvar > 0.06 && varv < 10) {
      ctx.later(kvar + 0.12, () => this._narTyst(ctx, fn, varv + 1))
      return
    }
    fn()
  },

  // CHILIN: ansiktet rodnar och ångan går ur öronen. Spelets största reaktion, och den
  // enda som får röra ansiktets FÄRG.
  //
  // Rodnaden är en `tint` på fotolagren, inte en röd platta ovanpå: `tint` multiplicerar,
  // så hudens egen struktur är kvar och bara kallt ljus dras bort. En platta hade lagt en
  // plastfilm över pappa.
  //
  // Röken kommer i TRE puffar per öra i stället för en, med `angle` uppåt och en smal
  // `spread`. En enda stor puff läser som en explosion; tre i följd läser som något som
  // ryker. Talen: ~0,22 s isär, alltså ungefär ett andetag.
  // `topp` skalar hela reaktionen: chilin går till 1,0 med tre ångpuffar per öra,
  // senapen till 0,55 med två — stark, men en EGEN sorts stark.
  _hetta(ctx, sek = 0, topp = 1) {
    const a = this._ans
    if (!a || !this._alive) return
    const st = this._hetSt || (this._hetSt = { t: 0 })
    gsap.killTweensOf(st)
    const sattHetta = () => { if (this._alive && this._ans) this._ans.hetta(st.t) }
    // Upp snabbt (det bränner direkt), ligg kvar medan pappa låter, svalna långsamt.
    const tl = gsap.timeline()
    tl.to(st, { t: topp, duration: 0.3, ease: 'power2.out', onUpdate: sattHetta })
    tl.to(st, { t: 0, duration: 1.8, delay: Math.max(1.2, sek), ease: 'sine.inOut', onUpdate: sattHetta })

    const oron = a.oron()
    for (let i = 0; i < (topp >= 1 ? 3 : 2); i++) {
      ctx.later(0.2 + i * 0.22, () => {
        if (!this._alive || !this._ans) return
        for (const o of oron) {
          spray(ctx.fxLayer, ANS.x + o.x, ANS.y + o.y, {
            count: 7, former: ['cirkel'], colors: [0xdad4cc, 0xeae6e0, 0xc8c2ba],
            size: 13, sizeVar: 0.45, sizeTo: 1.5, // röken VÄXER medan den stiger
            angle: -Math.PI / 2, spread: 0.7, dist: 86, distVar: 0.4,
            gravity: -0.25, life: 0.95, lifeVar: 0.3, alpha: 0.75, spin: 0.6,
          })
        }
      })
    }
  },

  // Ett kontinuerligt ljud som följer en stations PÅ/AV — och som spelet självt håller
  // reda på, så `destroy()` kan tysta exakt de slingor det startat. (Skalet stoppar alla
  // slingor efter varje omgång som yttersta säkring; den här listan är för att spelet ska
  // kunna göra rätt av sig självt, och för att sonden ska kunna läsa vad som låter.)
  _slinga(ctx, namn, pa, opt) {
    const audio = ctx.services.audio
    if (!audio.loop) return // äldre tjänst utan sling-API: klicket ensamt får duga
    this._slingor = this._slingor || new Set()
    if (pa) {
      audio.loop(namn, opt)
      this._slingor.add(namn)
    } else {
      audio.stopLoop(namn)
      this._slingor.delete(namn)
    }
  },

  // ANDHÄMTNINGEN SÄGER HUR FULL MAGEN ÄR. Takten var en konstant i riggen (2,4 s) och
  // därmed samma vid första tuggan som vid sista. Nu blir andetagen längre ju mättare han
  // blir — mätaren syns i burken, men det här känns utan att man tittar på den.
  _andas(ctx) {
    if (!this._alive || !this._ans) return
    const fyllt = this._antal ? Math.min(1, this._atna / this._antal) : 0
    this._ans.liv(true, { takt: 2.4 + fyllt * 1.3 })
  },

  // ISBITEN: motsatsen till chilin, och medvetet MINDRE. Kylan går upp lika snabbt (det
  // är lika direkt), men ligger kortare och svalnar fortare — en iskub smälter, en chili
  // sitter kvar. Ingen ånga ur öronen: det är chilins bild och ska förbli det.
  _kyla(ctx, sek = 0) {
    const a = this._ans
    if (!a || !this._alive) return
    const st = this._kylSt || (this._kylSt = { t: 0 })
    gsap.killTweensOf(st)
    const satt = () => { if (this._alive && this._ans) this._ans.kyla(st.t) }
    const tl = gsap.timeline()
    tl.to(st, { t: 0.85, duration: 0.22, ease: 'power2.out', onUpdate: satt })
    tl.to(st, { t: 0, duration: 1.2, delay: Math.max(0.8, sek), ease: 'sine.inOut', onUpdate: satt })
    // Frostiga glimtar vid munnen — samma roll som chilins rök, en tiondel av storleken.
    sparkle(ctx.fxLayer, ANS.x, this._munY, { count: 7, color: 0xbfe9ff })
  },

  // Narratorn kommenterar då och då — aldrig efter varje bit, det blir tjat.
  //
  // ⚠️ VÄNTAR TILLS PAPPA HAR TALAT KLART. Repliken låg tidigare i samma ögonblick som
  // `_sag`, vilket var ofarligt så länge pappas röst var en 0,3 s stämd ton — men de
  // inspelade klippen är 0,72–1,90 s, och då är det TVÅ svenska röster samtidigt. Värst
  // blev `sur`, där repliken är ovillkorlig och klippet är det längsta av alla nio.
  // `sekunder` kommer från `_sag`, som läser den avkodade buffertens längd; ett hårdkodat
  // tal här hade drivit isär från filen vid nästa omtagning.
  _replikEfterMin(ctx, namn, sekunder = 0) {
    const voice = ctx.services.voice
    const sag = (text) => {
      if (sekunder <= 0.35) { voice.say(text); return } // syntes-reserven: ingen väntan behövs
      ctx.later(sekunder + 0.15, () => { if (this._alive) voice.say(text) })
    }
    if (namn === 'sur') { sag('Oj! Vad surt det var!'); return }
    if (namn === 'forvanad' || namn === 'aj' || namn === 'skratt') {
      if (Math.random() < 0.5) sag('Hihi, nu blev det kladdigt!')
      return
    }
    if (Math.random() < 0.35) sag('Mmm, det där var gott!')
  },

  // ---------------------------------------------------------------- final ---

  _fyllTill(v) {
    const st = { v: this._fyllNiva }
    this._fyllNiva = v
    gsap.to(st, {
      v, duration: 0.5, ease: 'power2.out',
      onUpdate: () => { if (this._alive) this._ritaFyll(st.v) },
    })
    // Burken BÅGNAR när den tar emot en tugga: bredare + kortare i ett andetag. Det är
    // squash-and-stretch på mätaren själv — nivån som stiger syns i ögonvrån, pulsen gör
    // att den KÄNNS.
    const mc = this._matarC
    if (mc && !mc.destroyed) {
      gsap.killTweensOf(mc.scale)
      gsap.to(mc.scale, { x: 1.06, y: 0.955, duration: 0.13, yoyo: true, repeat: 1, ease: 'sine.out' })
    }
  },

  _final(ctx) {
    if (this._busy) return
    this._busy = true
    this._slappOnskan()
    const a = this._ans

    if (this._hjarta && !this._hjarta.destroyed) {
      gsap.to(this._hjarta, { alpha: 1, duration: 0.3 })
      pop(this._hjarta, { scale: 1.5 })
    }

    a?.slappMin(0.1)
    a?.min('nojd', { hall: 3 })
    ctx.services.voice.say('Nu är pappa mätt och belåten!')

    // Rapen: pappas eget klipp, och ibland en till. Sedan ett skratt.
    //
    // ⚠️ AVSTÅNDEN ÄR KLIPPENS LÄNGD, inte en känsla. Reserverna är 0,3 s stämda toner och
    // rymdes lätt på 0,7 s — men de INSPELADE klippen är 1,10 s (`pappa_rap`) och 1,26 s
    // (`pappa_fniss`), så den gamla tidtabellen lade dem ovanpå varandra: extrarapen och
    // skrattet startade i SAMMA ögonblick (0,5 + 0,7 = 1,2 s, och skrattet stod på 1,2 s).
    // Med toner lät det som ett ackord; med två röstklipp låter det som två pappor.
    const RAP = 1.15 // klippets längd + en liten andning
    ctx.later(0.5, () => {
      if (!this._alive) return
      this._sag(ctx, 'nojd')
      if (a?.view && !a.view.destroyed) shake(a.view, { intensity: 9, duration: 0.6 })
      burst(ctx.fxLayer, ANS.x, this._munY, { count: 18, colors: PLAYFUL })
      const dubbel = Math.random() < 0.3
      if (dubbel) ctx.later(RAP, () => { if (this._alive) this._sag(ctx, 'nojd') })
      // Skrattet väntar tills rapandet är slut — en rap eller två.
      ctx.later(dubbel ? RAP * 2 : RAP, () => {
        if (!this._alive) return
        this._sag(ctx, 'skratt')
        sparkle(ctx.fxLayer, ANS.x, this._ogonY, { count: 12 })
      })
    })

    ctx.progress.complete()

    // Klistermärket landar mellan rapen och avtorkningen: pappa har precis rapat, och det
    // som händer sedan är att kylen får ett märke till. Ligger på kyldörren, alltså långt
    // från både ansiktet och burken — tre firanden på samma plats hade blivit ett.
    ctx.later(2.05, () => { if (this._alive) this._nyttMarke(ctx) })

    // Geggan sitter kvar genom hela finalen och torkas av först när nästa tallrik kommer.
    ctx.later(2.6, () => {
      if (!this._alive) return
      this._torkaRent(ctx)
      this._sopaBanken(ctx)
      // Winken som avslutning — den enda gesten som talar direkt till barnet, och den
      // hör hemma just här: `nojd` har hunnit blekna (hållet är 3 s), och en wink bakom
      // en aktiv min hade varit osynlig eftersom min-lappen ligger över ögonlagren.
      this._ans?.blinkning('h')
    })
    ctx.later(3.4, () => {
      if (!this._alive) return
      this._busy = false
      this._nyTallrik(ctx)
      // Märkets replik tar introts plats i stället för att läggas ovanpå den. Introt har
      // redan hörts (`mount` + varje tidigare tallrik), medan "kylen fick ett märke" bara
      // sägs två gånger i hela spelets liv.
      //
      // ⚠️ Väntar in pappa. Skrattet (`pappa_fniss`, 1,26 s) startar 1,65 s in i finalen —
      // eller 2,80 s när han rapar två gånger — och slutar då 4,06 s in, alltså EFTER den
      // här punkten. Med en fast `later(3.4)` talade narratorn rakt över honom.
      const text = this._markeReplik || 'Mata pappa med maten på tallriken!'
      this._markeReplik = null
      this._narTyst(ctx, () => ctx.services.voice.say(text))
    })
  },

  // ----------------------------------------------------------------- tick ---

  _update(ctx, dtMS) {
    if (!this._alive) return
    const dt = Math.min(60, dtMS)
    this._phys?.update(dtMS)
    this._hallTick(ctx, dt)
    this._vatskaTick(ctx, dtMS)
    this._mjukTick(dtMS)
    this._kokTick(ctx, dt)

    // Munnen gapar när maten närmar sig — riggens tydligaste inbjudan. Läs fingrets
    // position (rec.tx/ty), inte den släpande bilden.
    const rec = this._drag?.active
    if (rec && rec.dragging && this._ans && !this._busy) {
      const d = Math.hypot(rec.tx - ANS.x, rec.ty - this._munY)
      const v = Math.max(0, Math.min(1, 1 - (d - 70) / 230))
      if (Math.abs(v - (this._gapNu ?? 0)) > 0.01) {
        this._gapNu = v
        this._ans.gap(v)
      }
      // …och han LUTAR SIG MOT maten. Bara käken svarade förr, vilket gör inbjudan
      // dubbelt så tydlig när hela huvudet är med — och lutningen skalas med samma
      // närhetstal som gapet, så han inte kastar sig efter något på andra sidan bänken.
      this._ans.lutaMot(Math.max(-1, Math.min(1, (rec.tx - ANS.x) / 300)) * v)
      // ÖGONEN går dit först, och till skillnad från gapet och lutningen är blicken INTE
      // skalad med närheten: att han följer maten redan medan den lyfts på andra sidan
      // bänken är hela inbjudan. Käken svarar när maten är framme, blicken direkt.
      this._ans.blick((rec.tx - ANS.x) / 300, (rec.ty - this._munY) / 200)
    } else {
      if (this._gapNu > 0 && !this._busy) {
        this._gapNu = Math.max(0, this._gapNu - dt / 260)
        this._ans?.gap(this._gapNu)
        this._ans?.lutaMot(0)
      }
      // Blicken nollas oavsett `_busy`: tuggar han bär minen sina egna ögon ändå, och en
      // kvarhängande blick hade betytt att han stirrar åt sidan genom hela finalen.
      // …MEN har han en önskan tittar han på DEN medan han väntar. Det är den halva av
      // önskan som inte kostar ett ord: ringen säger var, blicken säger vem som vill ha.
      const o = !this._busy ? this._onskan : null
      if (o && this._onskbar(o.rec)) {
        this._ans?.blick((o.rec.view.x - ANS.x) / 300, (o.rec.view.y - this._munY) / 200)
      } else {
        this._ans?.blick(0, 0)
      }
    }

    this._onskanTick(ctx, dt)

    // Mjuk om-cue vid stillhet — en fråga, aldrig en tillsägelse.
    this._idle += dt
    if (this._idle > 6800 && !this._busy) {
      this._idle = 0
      const kvar = (this._mat || []).filter((r) => !r._uppaten)
      this._cueVaxel += 1
      // Var tredje cue pekar på KÖKET i stället för på maten. Utan den syns det aldrig att
      // skåpen går att öppna: en stängd lucka har bara sitt handtag att gå på, och en
      // 2-åring läser inget. En ring och ett litet skutt på dörren är en inbjudan, aldrig
      // en tillsägelse — och den kräver ingen text (P0 NAVIGATION).
      // PAPPA SJÄLV gör något var fjärde cue. Vilo-cue:n pekade förr alltid på något
      // ANNAT (maten, en lucka) medan huvudpersonen stod och andades — och det är han
      // barnet tittar på. En gäspning säger "jag väntar" utan ett ord, och en blinkning
      // är den enda gesten i spelet som talar direkt TILL barnet.
      // ⚠️ Winken måste ligga när ingen min är aktiv: min-lappen ligger över ögonlagren,
      // så en wink bakom en grimas syns inte alls. Vilo-cue:n körs bara när `!_busy`.
      if (this._cueVaxel % 4 === 0) {
        const a = this._ans
        if (a) {
          if (this._cueVaxel % 8 === 0) {
            const sek = this._sag(ctx, 'gasp')
            a.min('gasp', { hall: Math.max(1.1, sek + 0.1) })
            a.liv(true, { takt: 3.6 }) // dåsig andhämtning under gäspningen
            ctx.later(Math.max(1.5, sek + 0.6), () => { if (this._alive) this._andas(ctx) })
          } else {
            a.blinkning('h')
            ctx.services.voice.say('Pappa vill ha mer!')
          }
        }
        return
      }
      if (this._cueVaxel % 3 === 0) {
        const stangda = (this._stationer || []).filter((st) => st.dorr && !st.oppen)
        const st = randomFrom(stangda)
        if (st) {
          kvittera(ctx.fxLayer, st.yta.x + st.yta.w / 2, st.yta.y + st.yta.h / 2,
            ctx.services.audio, { color: 0xffe3b0, maxR: 80 })
          pop(st.dorr, { scale: 1.04 })
          ctx.services.voice.say('Vad finns i skåpen, tror du?')
        }
        return
      }
      if (kvar.length) {
        const r = randomFrom(kvar)
        if (r?.view && !r.view.destroyed) wiggle(r.view)
        const harChili = kvar.some((m) => m.data.key === 'chili')
        if (harChili && this._cueVaxel % 2 === 1) ctx.services.voice.say('Vad tror du händer om pappa smakar chilin?')
        else ctx.services.voice.say('Titta, pappa tuggar och tuggar!')
      }
    }
  },

  // --------------------------------------------------------------- städning ---

  _rensaMat() {
    // Önskan pekar på en av bitarna som `clear()` strax river. Ringen är inte barn till
    // biten (den ligger i `_propL`), så den hade blivit kvar och pekat på tom bänk.
    this._slappOnskan()
    // Öppna luckor hör till den gamla omgången. Stängs de inte här ligger deras poster
    // kvar i `_saker` och pekar på vyer som `clear()` strax river.
    for (const st of [...(this._oppnaSt || [])]) {
      st.stang()
      st._saker = []
    }
    this._oppnaSt = []
    // Lösa kroppar först: `clear()` river strax vyerna, och en matter-kropp som pekar på
    // en förstörd vy skriver till den varje steg.
    for (const rec of [...(this._losa || [])]) this._lyftLos(rec)
    this._losa = []
    for (const rec of this._mat || []) {
      if (rec._inre) {
        rec._inre._fxLiv?.kill()
        gsap.killTweensOf(rec._inre)
      }
      if (!rec.view.destroyed) {
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
        rec.view.destroy({ children: true })
      }
    }
    this._mat = []
    // Föremålen är borta — dragets register måste följa med, annars pekar det på
    // förstörda noder. Målet (munnen) sätts tillbaka direkt.
    this._drag?.clear()
    if (this._mun && !this._mun.destroyed) this._drag?.addTarget(this._mun, () => true, { hitRadius: MUN_R })
  },

  destroy(ctx) {
    this._alive = false
    // Hettans tween skriver till riggen varje bildruta — den måste dö FÖRE ansiktet,
    // annars tintar den ett förstört lager (exit mitt i en chili).
    if (this._hetSt) { gsap.killTweensOf(this._hetSt); this._hetSt = null }
    if (this._kylSt) { gsap.killTweensOf(this._kylSt); this._kylSt = null }
    // Kranen och fläkten låter tills någon stänger av dem — och den som lämnar spelet
    // mitt i ett rinnande vatten stänger inte av något. (Skalet tystar allt efter varje
    // omgång också; det här är spelets egen del av samma ansvar.)
    for (const namn of this._slingor || []) ctx?.services?.audio?.stopLoop?.(namn)
    this._slingor = null
    // Hällningen håller en `rec` och en vy som `_drag.clear()` strax river.
    this._hallRec = null
    this._hallV = null
    // Önskans ring bär två EVIGA tweens (rotationen och andetaget). En `repeat: -1` dör
    // aldrig av sig själv, och `_root.destroy()` river bara noden — tweenen fortsätter
    // skriva till den. Samma familj som `_hetSt` ovanför: den måste dö FÖRE noden.
    if (this._onskan?.ring && !this._onskan.ring.destroyed) {
      gsap.killTweensOf(this._onskan.ring)
      gsap.killTweensOf(this._onskan.ring.scale)
    }
    this._onskan = null
    for (const nod of this._markeNoder || []) if (!nod.destroyed) gsap.killTweensOf(nod.scale)
    this._markeNoder = []
    this._markeL = null
    ctx?.ticker?.remove(this._tick)
    this._tick = null
    if (this._vakna && this._root && !this._root.destroyed) this._root.off('pointerdown', this._vakna)
    this._vakna = null

    for (const rec of this._mat || []) {
      rec._inre?._fxLiv?.kill()
      if (!rec.view.destroyed) {
        if (rec._grepp) rec.view.off('pointerdown', rec._grepp)
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
      }
      rec._grepp = null
    }
    for (const g of this._geggor || []) {
      for (const nod of [g.klet, g.bit]) if (nod && !nod.destroyed) gsap.killTweensOf(nod)
    }
    this._geggor = []
    this._mat = []
    if (this._hjarta && !this._hjarta.destroyed) gsap.killTweensOf(this._hjarta)
    gsap.killTweensOf(this._fyll)
    if (this._matarC && !this._matarC.destroyed) gsap.killTweensOf(this._matarC.scale)
    this._matarC = null

    for (const rec of this._losa || []) {
      if (rec?.view && !rec.view.destroyed) gsap.killTweensOf(rec.view)
    }
    this._losa = []
    this._frysGegga()
    // Kökets egna animerade noder. De ägs av `kok.js` men tweenas HÄRIFRÅN (`_knapp`), och
    // var därför de enda i filen utan städning — exakt mönstret CLAUDE.md varnar för
    // (en tween som skriver till ett förstört Pixi-objekt efter exit).
    const n = this._noder || {}
    for (const nod of [n.fagel, n.strale, n.plattor, n.flakthjul, n.sol,
      n.fjaril, n.regnbage, n.klocka, n.kastrull, ...(n.moln || [])]) {
      if (nod) { gsap.killTweensOf(nod); gsap.killTweensOf(nod.scale) }
    }
    this._noder = null
    this._phys?.destroy()
    this._phys = null
    this._rivVatska()

    for (const st of this._stationer || []) {
      if (st._hit && !st._hit.destroyed && st._tryck) st._hit.off('pointertap', st._tryck)
      st._tryck = null
      st.stada?.()
      for (const rec of st._saker || []) {
        if (rec?.view && !rec.view.destroyed) {
          gsap.killTweensOf(rec.view)
          gsap.killTweensOf(rec.view.scale)
        }
      }
      st._saker = []
    }
    this._stationer = []
    this._oppnaSt = []

    this._drag?.destroy()
    this._drag = null
    // `shake` lägger sin tween på ett proxy-objekt utanför riggens egen bokföring.
    this._ans?.view?._fxShakeTw?.kill()
    this._ans?.destroy()
    this._ans = null
    this._root?.destroy({ children: true })
    this._root = null
    this._mun = null
    this._fyll = null
    this._hjarta = null
  },
}
