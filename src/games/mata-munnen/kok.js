// KÖKET — miljön som `mata-munnen` spelas i (ägaruppdrag, se docs/games/mata-munnen.md §4).
//
// Poängen med rummet är INTE dekor. Före köket svävade pappas huvud i luften mitt i en tom
// creme-scen: fotot tonar ut i en grå skjortkrage och slutade i ingenting. Köksön löser det
// fysiskt — bänkskivans bakkant SKÄR halsen, så det som tonar ut aldrig syns.
//
// ⚠️ KANT_Y ÄR MÄTT, INTE VALD. `magick bas.webp -alpha extract -scale 1x697` ger radernas
//    medeltäckning: 122 vid ruta-y 592 (full hals), 101 vid 616, 79 vid 632, 47 vid 648,
//    4 vid 680. Skärlinjen ligger på 616 — sista raden med ~82 % täckning, alltså precis
//    innan fadet börjar synas. Lägre skärlinje = synlig utsuddning ovanför bänken; högre =
//    bänken äter hakan. Räknas ur ANS så den följer med om ansiktet flyttas eller skalas.
//
// ⚠️ ALLA TRÄFFYTOR ÄR RITADE FÖRE OBJEKTEN (P0: ≥96 px, ≥24 px mellan). Kolumnerna är
//    budgeterade i höjdled: vänstra väggen rymmer exakt tre stationer (116+24+120+24+104)
//    på sina 404 px. Flyttar du en, flyttar du alla — `npm run check` fångar inte det här.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { verticalFill, verticalFillAlpha, cylinderFill, topLightFill } from '../../lib/form.js'

// --------------------------------------------------------------- geometri ---

// Ansiktet är MASTER: köksön räknas ur det, aldrig tvärtom.
// Höjden är en avvägning mellan två saker som drar åt olika håll: grimasen ÄR belöningen
// (stort ansikte), men skärlinjen ligger på en fast andel av höjden — ett större ansikte
// trycker alltså ner köksön och gör bänkskivan till en list att balansera hakan på.
// Uppmätt i bild: vid h=500 blev djupet 146 och skarven läste som ett fat.
//
// 470 → 460 och y 268 → 250 är HALSENS pris, och det är ett litet pris: ansiktet krymper
// 2 % och flyttas upp 18 px, vilket räcker för att skärlinjen ska hamna i halsen (ruta
// 730) i stället för i skägget (ruta 616) — utan att röra bräda, mat, fysik eller öns
// front, som alla är fullt budgeterade. Hjässan får 20 px luft mot skärmkanten (vid
// h=470 blev det 10, för tunt).
export const ANS = { x: 620, y: 250, h: 460 }

// Var i fotorutan de olika delarna av pappa ligger, som andel av rutans höjd. AVLÄST med
// linjal i utrutan (`.tmp-ansikte/_halslinjal.png`), inte gissat: hakans/skäggets underkant
// 695, halsen 700–785, tröjkragen 785, axlar därunder.
const RUTA = { haka: 695 / 800, halsTopp: 700 / 800, krage: 785 / 800 }
// Var en ruta-andel hamnar i designkoordinater.
const rutaY = (a) => ANS.y + (a - 0.5) * ANS.h

// ⚠️ KÖKSÖNS BAKKANT ÄR INTE LÄNGRE HALSLINJEN. Så länge de var samma tal skar bänken
// mitt i skägget (ruta 616), och det var därför pappa läste som ett HUVUD PÅ ETT FAT: en
// hals som försvinner bakom en bänk är en person, ett avskuret skägg är det inte.
//
// De två talen drar dessutom åt olika håll och kan inte vara ett:
//   · bakkanten kan inte längre ner än ~445 — skärbrädan börjar på 452, och brädan i sin
//     tur kan inte flytta ner för öns luckor slutar redan på 706 av skärmens 720.
//   · halsen börjar först på ruta 700, alltså UNDER 445 så länge ansiktet står där det stod.
// Knuten löses i stället uppåt: ansiktet lyftes 23 px (`ANS.y` 268 → 245), vilket flyttar
// hela fotot upp utan att röra bräda, mat, fysik eller öns front. Skärlinjen hamnar då i
// halsen i stället för i skägget, och det blev samtidigt mer luft ovanför hjässan.
export const KANT_Y = 440 // köksöns bakkant, i design-y
export const HAKA_Y = Math.round(rutaY(RUTA.haka)) // hakans underkant — bakkanten ska ligga UNDER den
export const HALS_Y = Math.round(rutaY(RUTA.halsTopp)) // där halsen börjar i bilden

// Bus-ellipsens nedre halvaxel: hur långt NER från ansiktets mitt en släppt matbit
// fortfarande läser som "på pappa". Räknas ur FOTOT — ruta 616 är där silhuetten ännu är
// full bredd — och aldrig ur köksöns kant.
//
// ⚠️ Stod som `KANT_Y - ANS.y` i index.js och var därmed en TYST PASSAGERARE på
// bänkkanten. När kanten gick 395 → 440 växte ellipsen 127 → 190 utan att någon rört
// buset, och `_kasta` läste då varje kast som bus: uppmätt **0 av 8 kast nådde pappa**
// (`_kastprobe`), utan ett konsolfel. Halsen är dessutom SMAL — en ellips med rx 215 som
// når ner till bänken påstår att en bit 130 px vid sidan om halsen ligger på pappa.
export const BUS_NER = Math.round((616 / 800 - 0.5) * ANS.h)
export const BANK_Y = 566 // bänkskivans framkant; nedanför börjar öns front
export const GOLV_Y = 388 // vägg möter golv (bakom ön, syns bara ute i kanterna)

// Köksön: en aning bredare framtill så den läser som en kropp och inte som en tavla.
const O = { bakV: 222, bakH: 1042, framV: 200, framH: 1064 }

// Skärbrädan maten ligger på. Utan den svävar bitarna över bänkskivan; med den har de
// ett underlag som säger "här ligger maten" utan ett tecken text.
export const BRADA = { x0: 356, x1: 1046, y0: 452, y1: 558 }

// Fem platser på brädan. 104 px träffhalo + 42 px mellanrum (P0 kräver ≥96 / ≥24), och
// hela MATBILDEN (±52 px) innanför brädans kanter — samma fälla som sänkte den gamla
// tallriken två gånger: mat på kanten läser som utspilld mat.
export const PLATSER = [[410, 505], [556, 505], [702, 505], [848, 505], [994, 505]]

// Mättnadsburken står PÅ bänkskivan, till vänster om brädan. Höjden är TAKAD av något
// annat än smaken: en högre burk sticker upp över köksöns kant och lägger sig över
// väggskåpets träffyta — och två träffytor som överlappar är ett P0-brott, inte en
// skönhetsfråga. Locket når 329, väggens nedersta station slutar 272.
export const MATARE = { x: 268, y: 450, w: 112, h: 190 }

// FYSIKBORDET: den rektangel där lösa saker faller, krockar och lägger sig. Golvet
// ligger på brädans nivå så en utspottad gaffel hamnar BLAND maten, inte under den, och
// väggarna står innanför öns kanter så ingenting någonsin ramlar ur bild (P0: inget får
// försvinna för gott). Talen är öns egna — flyttas ön flyttas de här.
export const FYSIK = { v: 232, h: 1032, golv: 548 }

// Var köksöns yta börjar och slutar vid en given höjd (bänkskivan smalnar bakåt).
export function bankX(y) {
  const t = Math.max(0, Math.min(1, (y - KANT_Y) / (BANK_Y - KANT_Y)))
  return [O.bakV + (O.framV - O.bakV) * t, O.bakH + (O.framH - O.bakH) * t]
}

// ---------------------------------------------------------------- palett ---

const F = {
  vagg: 0xf2e0c6,
  vaggMork: 0xe6cfae,
  kakel: 0xdff0ee,
  kakelFog: 0xbcd8d5,
  golv: 0xc8ad8c,
  golvFog: 0xab8f6e,
  tra: 0xd49a5f,
  traMork: 0xa9713c,
  lucka: 0x6fa9bd, // underskåp + öns front — sval kontrast mot den varma väggen
  luckaMork: 0x4d8095,
  luckaLjus: 0x8dc2d3,
  vit: 0xf3f6f7,
  vitMork: 0xc3ced2,
  stal: 0xd3dade,
  stalMork: 0x9aa6ac,
  morkt: 0x3f4a52,
}

// ------------------------------------------------------- stationstabellen ---

// En station = en klickbar plats i köket. `yta` är TRÄFFYTAN (P0 ≥96 px, ≥24 px mellan).
//
// `typ` styr hur den öppnas: `dorr-v`/`dorr-h` svänger upp kring vänster/höger gångjärn
// (scale.x mot 0 med pivot i gångjärnet — den billigaste 2D-dörren som läser rätt),
// `lucka-ner` faller framåt som en ugnslucka, `lada` dras ut. `knapp` öppnar ingenting
// utan gör en sak: vattnet rinner, plattan glöder, fläkten snurrar.
//
// ⚠️ `platser` är begränsade av P0, inte av plats i skåpet. Ett föremål inne i ett skåp är
//    ett DRAGBART föremål och behöver sina 96 px träffyta med 24 px omkring sig. Ett
//    180 px brett skåp rymmer alltså EN sak per rad — inte fyra. Kylskåpet är det enda
//    som är högt nog för tre.
export const STATIONER = [
  // --- vänster: kylskåpet står på golvet, framför väggen ---
  { id: 'frys', sv: 'Frysen', yta: { x: 20, y: 128, w: 168, h: 114 }, typ: 'dorr-v', inre: 'kall', ljus: 0xdff2ff,
    innehall: ['is', 'glasspinne', 'blackfisk', 'glass'], platser: [[104, 185]] },
  { id: 'kyl', sv: 'Kylskåpet', yta: { x: 20, y: 266, w: 168, h: 374 }, typ: 'dorr-v', inre: 'kall', ljus: 0xeafaff,
    innehall: ['ost', 'agg', 'tomat', 'gurka', 'korv', 'mjolk', 'groda', 'mogelost', 'sallad', 'raka', 'ketchup', 'kal'],
    // ⚠️ 130 px isär, inte 120. Ett dragbart föremåls träffyta är `GRIP_R` = 52, alltså
    //    104 px i DIAMETER — inte 96. Vid 120 px mellanrum blev luften mellan två hyllplan
    //    16 px och P0 kräver 24. Kylen växte 40 px neråt för att rymma den rättelsen.
    platser: [[104, 318], [104, 448], [104, 578]] },
  // --- vänster vägg: fönster · diskho. Underskåpet DÄRUNDER är med flit dött: burken
  //     står framför det, och en lucka man ser men inte kan öppna är bättre än en
  //     träffyta som ligger under ett annat föremål.
  { id: 'fonster', sv: 'Fönstret', yta: { x: 225, y: 12, w: 160, h: 116 }, typ: 'knapp' },
  { id: 'diskho', sv: 'Kranen', yta: { x: 225, y: 152, w: 160, h: 120 }, typ: 'knapp' },
  // --- höger vägg: fläkt · spis · ugn ---
  { id: 'flakt', sv: 'Fläkten', yta: { x: 866, y: 12, w: 180, h: 100 }, typ: 'knapp' },
  { id: 'spis', sv: 'Spisen', yta: { x: 866, y: 136, w: 180, h: 110 }, typ: 'knapp' },
  { id: 'ugn', sv: 'Ugnen', yta: { x: 866, y: 270, w: 180, h: 112 }, typ: 'lucka-ner', inre: 'het', ljus: 0xffb15a,
    innehall: ['kyckling', 'pommes', 'kaka', 'potatis', 'kringla', 'paj'], platser: [[956, 326]] },
  // --- höger: högskåpet med micro, skafferi och lådor ---
  { id: 'micro', sv: 'Mikron', yta: { x: 1078, y: 124, w: 180, h: 120 }, typ: 'lucka-ner', inre: 'het', ljus: 0xffe6a0,
    innehall: ['pizza', 'korv', 'munk', 'potatis', 'popcorn'], platser: [[1150, 180]] },
  { id: 'skafferi', sv: 'Skafferiet', yta: { x: 1078, y: 268, w: 180, h: 146 }, typ: 'dorr-h',
    innehall: ['kringla', 'choklad', 'godis', 'jordnot', 'kastanj', 'honung', 'druvor', 'mango', 'pepparkaka', 'saltgurka', 'senap', 'sylta', 'bonor'],
    platser: [[1168, 341]] },
  // Skräplådan: det ÄR meningen att det ligger konstiga saker här. P0 MOTGÅNG säger att
  // bus ska vara roligt och gå att åtgärda — inte att det ska saknas.
  { id: 'lador', sv: 'Lådorna', yta: { x: 1078, y: 438, w: 180, h: 166 }, typ: 'lada',
    innehall: ['tandborste', 'disksvamp', 'strumpa', 'kalsonger', 'kackerlacka', 'spindel', 'toapapper', 'snor', 'leksaksbil'],
    platser: [[1168, 494]] }, // ovanför fronten när den dragits ut 56 % av 166 px
  // --- köksöns front (`pa: 'on'` = ritas i FRAMGRUNDEN, framför pappa) ---
  { id: 'oskap_v', sv: 'Kastrullskåpet', yta: { x: 300, y: 600, w: 320, h: 106 }, typ: 'dorr-v', pa: 'on',
    innehall: ['kastrull', 'stekpanna', 'fat', 'slev', 'kavel'], platser: [[382, 650], [538, 650]] },
  { id: 'oskap_h', sv: 'Besticklådan', yta: { x: 660, y: 600, w: 320, h: 106 }, typ: 'lada', pa: 'on',
    innehall: ['gaffel', 'sked', 'kniv', 'mugg', 'glas_saft', 'visp'], platser: [[742, 636], [898, 636]] },
]

// Hur många luckor som får stå öppna samtidigt. Samma sorts tak som `GEGGA_MAX`: fri lek
// utan att köket blir kaos (P0 MOTGÅNG — "TAK på hur mycket som kan gå fel samtidigt").
export const OPPNA_MAX = 2

// Bänkskivan längs bakväggen: `SLAB` är ytan, `SKAP` underskåpen. Spisens häll ligger i
// skivan och diskhon är insänkt i den — båda måste flytta med om raden flyttar.
const SLAB = { y: 226, h: 20 }

// ------------------------------------------------------------------ ritning ---

// Träådring: tre mjuka bågar. En bänkskiva i EN platt ton rankas av `_plattprobe`, och
// köksön är den största sammanhängande ytan i hela bilden.
function adring(g, x0, x1, y, n, färg, alpha = 0.3) {
  for (let i = 0; i < n; i++) {
    const yy = y + i * 13
    g.moveTo(x0, yy).quadraticCurveTo((x0 + x1) / 2, yy + 6, x1, yy)
      .stroke({ width: 2.5, color: färg, alpha })
  }
}

// En skåpslucka: ram + infälld spegel + handtag. Samma form överallt, så hela köket
// läser som en möbelserie i stället för tolv olika saker.
function lucka(x, y, w, h, { färg = F.lucka, mörk = F.luckaMork, handtag = 'h' } = {}) {
  const g = new Graphics()
  g.roundRect(x, y, w, h, 10).fill(verticalFill(färg, mörk)).stroke({ width: 4, color: mörk })
  g.roundRect(x + 13, y + 13, w - 26, h - 26, 6)
    .stroke({ width: 3, color: mörk, alpha: 0.55 })
  g.roundRect(x + 13, y + 13, w - 26, Math.max(8, (h - 26) * 0.4), 6)
    .fill({ color: 0xffffff, alpha: 0.1 })
  if (handtag === 'h') {
    g.roundRect(x + w - 30, y + h / 2 - 26, 11, 52, 5).fill(cylinderFill(F.stal))
  } else if (handtag === 'v') {
    g.roundRect(x + w / 2 - 34, y + 14, 68, 11, 5).fill(cylinderFill(F.stal, { axis: 'x' }))
  } else {
    g.roundRect(x + 26, y + h / 2 - 6, 11, 52, 5).fill(cylinderFill(F.stal))
  }
  return g
}

// ------------------------------------------------------ luckor som öppnas ---

// Handtaget sitter ALLTID mitt emot gångjärnet. Läggs det på samma sida ser dörren ut att
// öppnas åt fel håll, och en 2-åring läser den riktningen innan den läser något annat.
const DORR_HANDTAG = { 'dorr-v': 'h', 'dorr-h': 'l', 'lucka-ner': 'v', lada: 'v' }

const DORR_STIL = {
  frys: { färg: F.vit, mörk: F.vitMork },
  kyl: { färg: F.vit, mörk: F.vitMork },
  skafferi: { färg: F.vit, mörk: F.vitMork },
  lador: { färg: F.vit, mörk: F.vitMork },
  oskap_v: { färg: F.luckaLjus, mörk: F.luckaMork },
  oskap_h: { färg: F.luckaLjus, mörk: F.luckaMork },
}

// Ugnens och mikrons luckor: mörk ram med glasruta. De två saknas i `DORR_STIL` och får
// den här i stället.
function glasLucka(x, y, w, h) {
  const g = new Graphics()
  g.roundRect(x, y, w, h, 10).fill(verticalFill(F.stalMork, F.morkt)).stroke({ width: 5, color: F.morkt })
  g.roundRect(x + 16, y + 26, w - 32, h - 44, 8)
    .fill(verticalFill(0x2b3239, 0x1d2328)).stroke({ width: 4, color: F.stal })
  g.roundRect(x + 24, y + 32, w - 48, 22, 6).fill({ color: 0xffffff, alpha: 0.1 })
  g.roundRect(x + 16, y + 6, w - 32, 12, 6).fill(cylinderFill(F.stal, { axis: 'x' }))
  return g
}

// Kromstaven som gör kyl/frys öppningsbara PÅ HÅLL: fästena först, röret över dem.
function _kylHandtag(g, y0, len) {
  g.roundRect(148, y0 + 8, 10, 7, 3).fill(F.stalMork)
  g.roundRect(148, y0 + len - 15, 10, 7, 3).fill(F.stalMork)
  g.roundRect(156, y0, 12, len, 6).fill(cylinderFill(F.stal)).stroke({ width: 2, color: F.stalMork, alpha: 0.7 })
}

// Barnteckningen på kyldörren: lapp, tejpbit och kritklotter — sol, hus, streckgubbe.
// Tunna färgade strokes i stället för fyllda former är det som gör att den läser som
// RITAD av ett barn, inte som en ikon.
function _barnteckning(g) {
  g.roundRect(46, 318, 86, 100, 3).fill(0xfffdf4).stroke({ width: 2, color: 0xd9d2c2, alpha: 0.8 })
  g.poly([74, 312, 102, 314, 100, 326, 72, 324]).fill({ color: 0xfff0b8, alpha: 0.6 })
  g.circle(110, 338, 8).stroke({ width: 2.2, color: 0xf2a53c, alpha: 0.9 })
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    g.moveTo(110 + Math.cos(a) * 10, 338 + Math.sin(a) * 10)
      .lineTo(110 + Math.cos(a) * 15, 338 + Math.sin(a) * 15)
      .stroke({ width: 2.2, color: 0xf2a53c, alpha: 0.9 })
  }
  g.rect(56, 366, 24, 20).stroke({ width: 2.2, color: 0x6a8dd6, alpha: 0.9 })
  g.poly([53, 366, 68, 352, 83, 366]).stroke({ width: 2.2, color: 0xd65a4a, alpha: 0.9 })
  g.rect(64, 374, 8, 12).stroke({ width: 2, color: 0x8a6a4a, alpha: 0.9 })
  g.circle(106, 376, 5.5).stroke({ width: 2.2, color: 0x4a9e5c, alpha: 0.9 })
  g.moveTo(106, 381).lineTo(106, 398)
    .moveTo(106, 386).lineTo(97, 392).moveTo(106, 386).lineTo(115, 392)
    .moveTo(106, 398).lineTo(99, 409).moveTo(106, 398).lineTo(113, 409)
    .stroke({ width: 2.2, color: 0x4a9e5c, alpha: 0.9 })
  g.moveTo(52, 410).quadraticCurveTo(70, 405, 88, 410).quadraticCurveTo(106, 415, 126, 410)
    .stroke({ width: 2.2, color: 0x5cae4f, alpha: 0.8 })
}

// Detaljer som hör till en VISS dörr. De ritas PÅ dörrgrafiken och inte på stommen, av
// två skäl som är mätta, inte valda: en stängd dörr ligger ÖVERST i lagerordningen, så
// allt som ritas på stommen bakom den syns aldrig (kylens gamla magneter satt där —
// skärmdumpen visade en kal vitvara), och en teckning som är tejpad på dörren ska följa
// med dörren när den svänger upp, inte bli hängande i luften.
function _dorrDetalj(g, def) {
  if (def.id === 'frys') {
    // Vattendispensern: mörkare botten + skugga i överkanten är det som gör nischen
    // INSÄNKT i stället för påklistrad.
    g.roundRect(56, 146, 64, 74, 8).fill(verticalFill(0xaeb9be, 0x87939a))
      .stroke({ width: 3, color: F.stalMork })
    g.rect(60, 150, 56, 9).fill({ color: 0x000000, alpha: 0.16 })
    g.roundRect(80, 152, 16, 11, 3).fill(cylinderFill(F.stalMork))
    g.roundRect(74, 197, 28, 17, 4).fill(cylinderFill(0x5ab7e8)).stroke({ width: 2, color: 0x3b8ec0 })
    g.rect(60, 214, 56, 4).fill({ color: F.morkt, alpha: 0.35 })
    _kylHandtag(g, 146, 86)
    g.roundRect(28, 136, 7, 96, 4).fill({ color: 0xffffff, alpha: 0.16 })
  } else if (def.id === 'kyl') {
    // Magneter på dörren — en kyl utan magneter är en vitvara, inte ett hem.
    for (const [mx, my, mf] of [[52, 296, 0xff8f5a], [88, 290, 0x6bd0a8], [124, 298, 0xffd166]]) {
      g.circle(mx, my, 11).fill(mf).stroke({ width: 2.5, color: 0xffffff, alpha: 0.8 })
    }
    _barnteckning(g)
    _kylHandtag(g, 336, 156)
    g.roundRect(28, 276, 7, 352, 4).fill({ color: 0xffffff, alpha: 0.13 })
  } else if (def.id === 'ugn' || def.id === 'micro') {
    const { x, y, w, h } = def.yta
    if (def.id === 'ugn') {
      // Skenet först, gallret över: två rader stänger med korta frontpinnar räcker för
      // att glaset ska läsa som "det finns något DÄRINNE" utan att tävla med maten.
      g.roundRect(x + 24, y + 34, w - 48, h - 60, 6).fill({ color: 0xd96b28, alpha: 0.16 })
      for (const gy of [y + 52, y + 74]) {
        g.moveTo(x + 24, gy).lineTo(x + w - 24, gy).stroke({ width: 3.5, color: 0x66707a, alpha: 0.6 })
        for (let sx = x + 32; sx <= x + w - 30; sx += 16) {
          g.moveTo(sx, gy).lineTo(sx, gy + 6).stroke({ width: 2, color: 0x565f68, alpha: 0.5 })
        }
      }
      g.roundRect(x + 16, y + 17, 10, 8, 3).fill(F.stalMork)
      g.roundRect(x + w - 26, y + 17, 10, 8, 3).fill(F.stalMork)
      g.roundRect(x + 8, y + 2, w - 16, 16, 8).fill(cylinderFill(F.stal, { axis: 'x' }))
        .stroke({ width: 2.5, color: F.stalMork })
      // Vredraden i nederkanten — markörstrecket uppåt på alla fyra så raden läser som EN sak.
      for (let i = 0; i < 4; i++) {
        const px = x + 46 + i * 30
        g.circle(px, y + h - 10, 6).fill(verticalFill(F.stal, F.stalMork)).stroke({ width: 2, color: 0x20262b })
        g.moveTo(px, y + h - 14).lineTo(px, y + h - 10).stroke({ width: 2, color: 0x20262b })
      }
    } else {
      // Displayen: två ljusa segmentstreck räcker för "klocka" — ingen Text-nod i dekor.
      g.roundRect(x + w - 72, y + h - 16, 46, 13, 3).fill(0x16352a).stroke({ width: 2, color: 0x0d221a })
      g.rect(x + w - 66, y + h - 11, 9, 3).fill({ color: 0x74e6a0, alpha: 0.9 })
      g.rect(x + w - 53, y + h - 11, 9, 3).fill({ color: 0x74e6a0, alpha: 0.9 })
    }
  }
}

// Skåpets INSIDA: en mörk låda med hyllor och några fasta burkar. Den ligger bakom dörren
// och tänds när dörren svänger upp. Utan den syns väggen genom öppningen, och ett skåp
// med vägg i botten läser som ett hål.
// Insidan ser olika ut i ett kylskåp och ett skafferi, och det är just skillnaden som
// säger vilket skåp man öppnat. En enda brun låda åt alla tolv gjorde kylen till en
// garderob — bilden avgjorde det, inget tal.
const INRE_STIL = {
  kall: { bak: [0xeaf6fb, 0xcfe4ef], hylla: 0xf7fdff, hyllKant: 0xa8c4d2, vara: [0x5ab7e8, 0xffd166, 0xff8f5a] },
  tra: { bak: [0x7a6249, 0x584533], hylla: 0xd9cbb6, hyllKant: 0x9a8a72, vara: [0xd66a5a, 0x6bd0a8, 0xffd166] },
  het: { bak: [0x4a2f1e, 0x2b1a10], hylla: 0x6b5340, hyllKant: 0x3f2e20, vara: null },
}

function inreSkap(x, y, w, h, stilNamn, ljus) {
  const st = INRE_STIL[stilNamn] || INRE_STIL.tra
  const c = new Container()
  c.eventMode = 'none'
  c.visible = false
  const g = new Graphics()
  g.roundRect(x, y, w, h, 8).fill(verticalFill(st.bak[0], st.bak[1]))
  // Skenet ur skåpet — det är det som säger "här är det öppet" på en meters håll.
  if (ljus) g.roundRect(x + 5, y + 5, w - 10, h - 10, 6).fill({ color: ljus, alpha: 0.3 })
  // Skuggan innerst, så lådan har djup i stället för att vara en platt lapp.
  g.roundRect(x + 5, y + 5, w - 10, 16, 6).fill({ color: 0x000000, alpha: 0.16 })

  const rader = Math.max(1, Math.round(h / 118))
  for (let i = 1; i < rader; i++) {
    const hy = y + (h / rader) * i
    g.rect(x + 5, hy - 5, w - 10, 9).fill(topLightFill(st.hylla)).stroke({ width: 2, color: st.hyllKant })
  }
  // Varor längst in mot kanterna: de ligger BAKOM det dragbara föremålet (som ritas i
  // matlagret) och fyller ut skåpet utan att lägga sig i vägen för någon träffyta.
  if (st.vara) {
    for (let i = 0; i < rader; i++) {
      const hy = y + (h / rader) * (i + 1) - 12
      for (const [sida, k] of [[-1, 0], [1, 1]]) {
        const bx = sida < 0 ? x + 12 : x + w - 34
        const f = st.vara[(i + k) % st.vara.length]
        g.roundRect(bx, hy - 30, 22, 30, 5).fill(f).stroke({ width: 2, color: 0x000000, alpha: 0.18 })
        g.roundRect(bx + 4, hy - 36, 14, 8, 3).fill({ color: 0xffffff, alpha: 0.5 })
      }
    }
  }
  c.addChild(g)
  return c
}

/**
 * Bygger en öppningsbar station: insidan (dold), dörren (med pivot i gångjärnet) och
 * metoderna som öppnar/stänger. Dörrens container har pivot OCH position i samma punkt,
 * så `scale` krymper den mot gångjärnet i stället för mot sitt eget centrum.
 */
function byggLucka(def, dorrGrafik) {
  const { x, y, w, h } = def.yta
  const inre = inreSkap(x, y, w, h, def.inre || 'tra', def.ljus)
  const dorr = new Container()
  dorr.eventMode = 'none'
  dorr.addChild(dorrGrafik)

  // Gångjärnet: den kant dörren svänger kring (eller kanten lådan dras ut ur).
  const gx = def.typ === 'dorr-h' ? x + w : x
  const gy = def.typ === 'lucka-ner' ? y + h : y
  dorr.pivot.set(gx, gy)
  dorr.position.set(gx, gy)

  return {
    ...def, inre, dorr, oppen: false, _tw: null,
    // Öppningen är alltid samma rörelse i tre varianter, för barnet ska känna igen den
    // efter första skåpet: dörren viker undan, insidan tänds.
    oppna() {
      if (this.oppen) return
      this.oppen = true
      inre.visible = true
      inre.alpha = 0
      this._tw?.kill()
      gsap.to(inre, { alpha: 1, duration: 0.18 })
      // En LÅDA dras ut, den krymper inte. Första försöket skalade `scale.y` mot 0,3 och
      // lådfronten såg då ut att sugas upp i sitt eget överkant — i bild läste det som att
      // lådan försvann, inte som att den öppnades. Fronten flyttas i stället NER, och
      // innehållet blir synligt ovanför den (därför ligger lådornas `platser` högt).
      if (def.typ === 'lada') {
        this._tw = gsap.to(dorr, { y: gy + h * 0.56, duration: 0.32, ease: 'power2.out' })
        return
      }
      const mal = def.typ === 'lucka-ner' ? { y: 0.22 } : { x: 0.16 }
      this._tw = gsap.to(dorr.scale, { ...mal, duration: 0.32, ease: 'power2.out' })
    },
    stang() {
      if (!this.oppen) return
      this.oppen = false
      this._tw?.kill()
      gsap.to(inre, { alpha: 0, duration: 0.2,
        onComplete: () => { if (!inre.destroyed) inre.visible = false } })
      this._tw = def.typ === 'lada'
        ? gsap.to(dorr, { y: gy, duration: 0.3, ease: 'back.out(1.6)' })
        : gsap.to(dorr.scale, { x: 1, y: 1, duration: 0.3, ease: 'back.out(1.6)' })
    },
    stada() {
      this._tw?.kill()
      gsap.killTweensOf(dorr)
      gsap.killTweensOf(dorr.scale)
      gsap.killTweensOf(inre)
    },
  }
}

/**
 * Bygger hela kökets stillbild. Returnerar en container som ligger LÄNGST BAK i spelet —
 * ansiktet ritas ovanpå väggen, och köksön (`framgrund`) ovanpå ansiktet.
 *
 * Två lager, inte ett: allt som ska ligga BAKOM pappa (`bakgrund`) och allt som ska ligga
 * FRAMFÖR honom (`framgrund` = köksön). Det är hela tricket som tar bort det svävande
 * huvudet — bänkskivan skär halsen i stället för att sluta ovanför den.
 */
export function byggKok(ctx) {
  const v = ctx.view
  const x0 = Math.min(-260, v.left - 140)
  const x1 = Math.max(ctx.width + 260, v.right + 140)
  const yTop = Math.min(-180, v.top - 140)
  const yBot = Math.max(ctx.height + 180, v.bottom + 140)

  const bakgrund = new Container()
  const framgrund = new Container()
  bakgrund.eventMode = 'none'
  framgrund.eventMode = 'none'

  // --- vägg + golv -------------------------------------------------------
  const rum = new Graphics()
  rum.rect(x0, yTop, x1 - x0, GOLV_Y - yTop).fill(verticalFill(F.vagg, F.vaggMork))
  rum.rect(x0, GOLV_Y, x1 - x0, yBot - GOLV_Y).fill(verticalFill(F.golvFog, F.golv))
  // Golvplattor i perspektiv: linjerna glesnar neråt, så golvet läser som ett plan.
  const radRader = [GOLV_Y]
  for (let i = 1; i <= 6; i++) {
    const yy = GOLV_Y + i * i * 8
    if (yy > yBot) break
    radRader.push(yy)
    rum.moveTo(x0, yy).lineTo(x1, yy).stroke({ width: 2, color: F.golvFog, alpha: 0.4 })
  }
  radRader.push(yBot)
  for (let gx = -400; gx < 1700; gx += 150) {
    rum.moveTo(gx, GOLV_Y).lineTo(gx + (gx - 640) * 0.7, yBot)
      .stroke({ width: 2, color: F.golvFog, alpha: 0.28 })
  }
  // Var tredje-fjärde platta får en egen svag ton: springorna ensamma lämnar golvet i EN
  // platt ton (`_plattprobe`-mat). Deterministiskt ur cellindex, ingen slump — baslinje-
  // bilder ska vara exakt likadana vid varje montering.
  const golvX = (gx, y) => gx + (gx - 640) * 0.7 * ((y - GOLV_Y) / (yBot - GOLV_Y))
  for (let r = 0; r + 1 < radRader.length; r++) {
    let k = 0
    for (let gx = -400; gx < 1550; gx += 150, k++) {
      const hv = (r * 5 + k * 3) % 7
      if (hv > 2) continue
      const ya = radRader[r]
      const yb = radRader[r + 1]
      rum.poly([golvX(gx, ya), ya, golvX(gx + 150, ya), ya, golvX(gx + 150, yb), yb, golvX(gx, yb), yb])
        .fill(hv === 0 ? { color: 0xffffff, alpha: 0.05 } : { color: F.golvFog, alpha: 0.09 })
    }
  }
  rum.rect(x0, GOLV_Y - 5, x1 - x0, 9).fill({ color: F.vaggMork, alpha: 0.5 })
  // Väggen är kökets största sammanhängande yta och skulle utan detta ligga i EN ton
  // (`_plattprobe` rankar just sådana). En bröstlist och en tapetrandning kostar två
  // stroke-loopar och gör att ytan läser som en vägg i stället för som bakgrund.
  rum.rect(x0, 96, x1 - x0, 7).fill({ color: F.traMork, alpha: 0.5 })
  rum.rect(x0, 103, x1 - x0, 5).fill({ color: 0xffffff, alpha: 0.25 })
  for (let sx = -400; sx < 1700; sx += 46) {
    rum.moveTo(sx, 108).lineTo(sx, GOLV_Y).stroke({ width: 2, color: F.vaggMork, alpha: 0.45 })
  }
  for (let sx = -378; sx < 1700; sx += 46) {
    rum.circle(sx, 150, 5).fill({ color: F.vaggMork, alpha: 0.5 })
    rum.circle(sx, 260, 5).fill({ color: F.vaggMork, alpha: 0.5 })
    rum.circle(sx, 370, 5).fill({ color: F.vaggMork, alpha: 0.5 })
  }
  bakgrund.addChild(rum)

  // Kakel bakom bänkarna — bara i de två väggpartier som faktiskt syns.
  const kakel = new Graphics()
  const kTop = 104
  for (const [kx0, kx1] of [[206, 404], [853, 1064]]) {
    kakel.rect(kx0, kTop, kx1 - kx0, SLAB.y - kTop).fill(verticalFill(F.kakel, F.kakelFog))
    for (let ky = kTop; ky <= SLAB.y; ky += 24) {
      kakel.moveTo(kx0, ky).lineTo(kx1, ky).stroke({ width: 2, color: F.kakelFog, alpha: 0.7 })
    }
    for (let kx = kx0; kx <= kx1; kx += 34) {
      kakel.moveTo(kx, kTop).lineTo(kx, SLAB.y).stroke({ width: 2, color: F.kakelFog, alpha: 0.5 })
    }
  }
  bakgrund.addChild(kakel)

  // --- bakre bänkrad (vänster + höger parti; mitten döljs av pappa) -------
  const bank = new Graphics()
  const skapY = SLAB.y + SLAB.h
  for (const [bx0, bx1] of [[206, 404], [853, 1064]]) {
    bank.rect(bx0, skapY, bx1 - bx0, GOLV_Y + 14 - skapY).fill(verticalFill(F.vit, F.vitMork))
    bank.rect(bx0 - 6, SLAB.y, bx1 - bx0 + 12, SLAB.h).fill(topLightFill(F.tra))
      .stroke({ width: 3, color: F.traMork })
    adring(bank, bx0, bx1, SLAB.y + 7, 1, F.traMork, 0.35)
  }
  // Döda underskåpsluckor: möbler, inte stationer. Burken respektive ugnen står framför.
  bank.roundRect(225, skapY + 14, 160, 100, 8).stroke({ width: 3, color: F.vitMork })
  bakgrund.addChild(bank)

  // `noder` samlar de fåtal ritade delar som spelet behöver kunna ANIMERA: kranens
  // stråle, hällens plattor, fläktens hjul, fönstrets sol. Allt annat är stilla bild.
  const noder = {}
  bakgrund.addChild(_kylskap(), _fonster(noder), _diskho(noder))
  bakgrund.addChild(_flakt(noder), _spis(noder), _ugn(), _hogskap())
  // Dekor i de tre väggytor som är TOMMA — allt ligger mätbart utanför varje stations
  // träffyta (hyllan slutar y110, frysen börjar y128; klockan slutar x475, fotot ~x495;
  // krukväxten slutar y113, mikron börjar y124).
  bakgrund.addChild(_hylla(), _klocka(noder), _krukvaxt())

  // Ljuset från fönstret: ett snett varmt band ner över bänken. LINJÄRT med alfa i
  // stoppen — en radiell med genomskinlig mitt förfyller hela duken med sista stoppet
  // och blir en jämn mörkning över allt i stället för ett band (uppmätt fälla).
  const ljus = new Graphics()
  ljus.poly([248, 142, 380, 142, 486, 400, 306, 400])
    .fill(verticalFillAlpha(0xffe9b4, 0xffe9b4, 0.1, 0.04))
  bakgrund.addChild(ljus)

  // --- luckorna byggs på ETT ställe -------------------------------------
  // Möblerna ovanför ritar bara stommen. Varje dörr, lucka och låda skapas här ur samma
  // tabell, så handtagets sida, gångjärnet och rörelsen alltid hänger ihop med `typ`.
  const stationer = STATIONER.map((def) => {
    if (def.typ === 'knapp') {
      return { ...def, oppen: false, oppna() {}, stang() {}, stada() {} }
    }
    const { x, y, w, h } = def.yta
    const stil = DORR_STIL[def.id]
    const g = stil
      ? lucka(x, y, w, h, { ...stil, handtag: DORR_HANDTAG[def.typ] })
      : glasLucka(x, y, w, h)
    _dorrDetalj(g, def)
    return byggLucka(def, g)
  })

  // --- köksön (framför pappa) --------------------------------------------
  const o = new Graphics()
  // Skivan: en trapets bakifrån och fram. Ovankanten är skärlinjen mot halsen.
  o.moveTo(O.bakV, KANT_Y).lineTo(O.bakH, KANT_Y).lineTo(O.framH, BANK_Y).lineTo(O.framV, BANK_Y)
    .fill(topLightFill(F.tra))
  adring(o, O.bakV + 20, O.bakH - 20, KANT_Y + 26, 6, F.traMork, 0.26)
  // Framkanten: en tjock list som fångar ljuset — det är den som säger "detta är en kant".
  o.rect(O.framV, BANK_Y, O.framH - O.framV, 26).fill(cylinderFill(F.tra, { axis: 'x' }))
    .stroke({ width: 4, color: F.traMork })
  o.moveTo(O.bakV, KANT_Y).lineTo(O.bakH, KANT_Y).stroke({ width: 4, color: F.traMork, alpha: 0.7 })
  // Stommen under skivan.
  o.rect(O.framV, BANK_Y + 26, O.framH - O.framV, yBot - BANK_Y - 26)
    .fill(verticalFill(F.lucka, F.luckaMork))
  // Sockel, så ön står på golvet i stället för att svälja det.
  o.rect(O.framV, 700, O.framH - O.framV, yBot - 700).fill({ color: F.morkt, alpha: 0.3 })
  framgrund.addChild(o)

  // Skuggan under hakan. Utan den ligger huvudet PÅ en linje; med den vilar det bakom en
  // bänk som fångar ljuset. Ellipsen är det billigaste sättet att säga "det här är djup".
  const hakskugga = new Graphics()
  hakskugga.ellipse(ANS.x, KANT_Y + 11, 118, 15).fill({ color: 0x6b4a2c, alpha: 0.11 })
  hakskugga.ellipse(ANS.x, KANT_Y + 6, 78, 9).fill({ color: 0x6b4a2c, alpha: 0.12 })
  framgrund.addChild(hakskugga)

  // Skärbrädan maten ligger på: rejält handtag i vänsteränden, så den läser som en bräda
  // och inte som en hylla.
  const brada = new Graphics()
  const bw = BRADA.x1 - BRADA.x0
  const bh = BRADA.y1 - BRADA.y0
  brada.ellipse(BRADA.x0 + bw / 2, BRADA.y1 - 2, bw / 2 - 8, 15).fill({ color: 0x6b4a2c, alpha: 0.18 })
  brada.roundRect(BRADA.x0, BRADA.y0, bw, bh, 26).fill(topLightFill(0xe0ac72))
    .stroke({ width: 5, color: F.traMork })
  brada.roundRect(BRADA.x0 + 12, BRADA.y0 + 11, bw - 24, bh - 22, 18)
    .stroke({ width: 3, color: F.traMork, alpha: 0.4 })
  adring(brada, BRADA.x0 + 40, BRADA.x1 - 40, BRADA.y0 + 24, 5, F.traMork, 0.24)
  // Upphängningshålet ritas som en mörk cirkel, inte som `cut()`: ett hål fäster bara på
  // EN ritinstruktion (den sista), och här är den sista en stroke — hålet hade landat i
  // ådringen i stället för i brädan.
  brada.circle(BRADA.x0 + 30, BRADA.y0 + bh / 2, 11).fill({ color: 0x8a5a30, alpha: 0.55 })
  framgrund.addChild(brada)

  for (const st of stationer) {
    if (!st.inre) continue
    // Öns luckor hör till framgrunden (framför pappa), resten till bakgrunden. Insidan
    // ALLTID före dörren — annars svänger dörren upp bakom sitt eget skåp. Och loopen
    // ligger SIST: läggs öns luckor till innan öns stomme hamnar de bakom den.
    //
    // ⚠️ Villkoret stod som `st.yta.y > KANT_Y` och var därmed en TYST passagerare på ett
    // tal som just flyttades. Vad som hör till ön är inte en höjdfråga — det är en
    // tillhörighetsfråga — och `lador` (y 438) hade bytt lager av sig självt när kanten
    // gick 395 → 440. Ingen skillnad i bild (lådan står på x 1078–1258, ön slutar 1064),
    // men en lagerordning som ändrar sig när en helt annan siffra ändras är en fälla.
    const lager = st.pa === 'on' ? framgrund : bakgrund
    lager.addChild(st.inre, st.dorr)
  }

  return { bakgrund, framgrund, stationer, noder }
}

// ------------------------------------------------------------ möblerna ---

function _kylskap() {
  const c = new Container()
  const g = new Graphics()
  g.roundRect(14, 116, 180, 544, 18).fill(verticalFill(F.stal, F.stalMork))
    .stroke({ width: 5, color: F.stalMork })
  c.addChild(g)
  const detalj = new Graphics()
  // Dörrspringan mellan frys och kyl: en mörk skåra med ljuskant under — skarven som
  // säger "två dörrar", i stommens enda synliga glipa. (Magneterna och teckningen bor
  // på DÖRREN i `_dorrDetalj`: stommen bakom en stängd dörr syns aldrig.)
  detalj.roundRect(26, 246, 156, 8, 4).fill({ color: F.stalMork, alpha: 0.7 })
  detalj.rect(28, 254, 152, 3).fill({ color: F.morkt, alpha: 0.3 })
  detalj.rect(28, 258, 152, 2).fill({ color: 0xffffff, alpha: 0.4 })
  detalj.roundRect(24, 644, 160, 16, 6).fill({ color: F.morkt, alpha: 0.35 })
  c.addChild(detalj)
  return c
}

function _fonster(noder = {}) {
  const c = new Container()
  // Utsikt: himmel över en grön kulle. Glaset ligger i ett EGET lager under ramen:
  // molnen ska kunna driva några px och fjärilen flyga utan mask, och då måste allt som
  // bor i glaset hamna BAKOM spröjsen — annars glider ett moln ovanpå träramen och
  // utsikten slutar läsa som "utanför".
  const glas = new Graphics()
  glas.roundRect(225, 12, 160, 116, 10).fill(verticalFill(0xa8dcf5, 0xd8f0fb))
  glas.rect(225, 84, 160, 44).fill(verticalFill(0x8fca6e, 0x6fa94f))
  c.addChild(glas)

  // Regnbågen över kullen: släckt tills spelet tänder den, längst bak av allt i glaset.
  const regnbage = new Graphics()
  for (const [rr, rf] of [[52, 0xff5a5a], [46, 0xffc93c], [40, 0x6bd0a8], [34, 0x5ab7e8]]) {
    regnbage.arc(305, 122, rr, Math.PI, Math.PI * 2).stroke({ width: 6, color: rf, alpha: 0.85 })
  }
  regnbage.visible = false
  regnbage.alpha = 0
  c.addChild(regnbage)
  noder.regnbage = regnbage

  // ⚠️ Solen låg tidigare på index 0 — BAKOM den täckande glasfyllningen — så `pop(sol)`
  // vid fönstertryck syntes aldrig (avläst i skärmdumpen). Nu bor den i glaset.
  const sol = new Graphics()
  sol.circle(0, 0, 17).fill(0xffe08a)
  sol.circle(-4, -4, 8).fill({ color: 0xfff4c4, alpha: 0.8 })
  sol.position.set(348, 42)
  c.addChild(sol)
  noder.sol = sol

  // Två moln som egna containrar så spelet kan driva dem. De står ≥12 px innanför
  // glasets kanter även med lite drift — därför behövs ingen mask.
  const moln = []
  for (const [mx, my, ms] of [[276, 44, 1], [336, 58, 0.78]]) {
    const m = new Container()
    const mg = new Graphics()
    mg.ellipse(-11, 2, 13, 9).fill({ color: 0xffffff, alpha: 0.92 })
    mg.ellipse(9, 1, 14, 10).fill({ color: 0xffffff, alpha: 0.92 })
    mg.ellipse(0, -6, 11, 9).fill({ color: 0xffffff, alpha: 0.92 })
    m.addChild(mg)
    m.position.set(mx, my)
    m.scale.set(ms)
    c.addChild(m)
    moln.push(m)
  }
  noder.moln = moln

  // Fjärilen: vingarna är egna Graphics med origo i kroppen, så spelet kan vinkla dem
  // (fladder = motriktad rotation på de två, inget mer). Dold tills spelet visar den.
  const fjaril = new Container()
  const vinge = (rikt) => {
    const vg = new Graphics()
    vg.ellipse(rikt * 8, -6, 7, 5.5).fill(0xffb347).stroke({ width: 2, color: 0xe08a2e, alpha: 0.9 })
    vg.ellipse(rikt * 6.5, 2.5, 5.5, 4.5).fill(0xffcf7a).stroke({ width: 2, color: 0xe08a2e, alpha: 0.9 })
    vg.circle(rikt * 8, -6, 2).fill({ color: 0xffffff, alpha: 0.7 })
    return vg
  }
  const vingar = [vinge(-1), vinge(1)]
  const fkropp = new Graphics()
  fkropp.ellipse(0, 0, 2.6, 7.5).fill(0x4a3a2e)
  fkropp.circle(0, -8, 3.2).fill(0x4a3a2e)
  fkropp.moveTo(-1, -10).quadraticCurveTo(-5, -15, -6, -17)
    .moveTo(1, -10).quadraticCurveTo(5, -15, 6, -17)
    .stroke({ width: 1.6, color: 0x4a3a2e })
  fjaril.addChild(vingar[0], vingar[1], fkropp)
  fjaril.vingar = vingar
  fjaril.position.set(255, 58)
  fjaril.visible = false
  c.addChild(fjaril)
  noder.fjaril = fjaril

  const ram = new Graphics()
  // Karmens djup: en inre skugglinje runt glaset gör rutan INSATT i väggen.
  ram.roundRect(231, 18, 148, 104, 8).stroke({ width: 6, color: 0x5f7d8c, alpha: 0.2 })
  ram.roundRect(225, 12, 160, 116, 10).stroke({ width: 9, color: F.vit })
  ram.moveTo(305, 16).lineTo(305, 124).stroke({ width: 7, color: F.vit })
  ram.moveTo(229, 70).lineTo(381, 70).stroke({ width: 7, color: F.vit })
  // Fönsterbräda, så fönstret sitter i väggen i stället för att hänga som en tavla.
  ram.roundRect(215, 126, 180, 12, 5).fill(topLightFill(F.tra)).stroke({ width: 3, color: F.traMork })
  c.addChild(ram)

  // Gardiner: stång, två längder med vågig nederkant och en kappa över. Det varma tyget
  // mot den svala utsikten är det som gör väggen till ett HEM och inte en kuliss.
  const gardin = new Graphics()
  gardin.roundRect(196, 2, 218, 7, 3).fill(cylinderFill(F.traMork, { axis: 'x' }))
  gardin.circle(196, 5, 5).fill(F.traMork)
  gardin.circle(414, 5, 5).fill(F.traMork)
  for (const [gx0, gx1] of [[202, 228], [382, 408]]) {
    gardin.moveTo(gx0, 6).lineTo(gx1, 6).lineTo(gx1, 110)
      .quadraticCurveTo((gx0 + gx1) / 2, 126, gx0, 114).closePath()
      .fill(verticalFill(0xf2a65a, 0xd97f3c))
    for (let vx = gx0 + 7; vx < gx1 - 3; vx += 8) {
      gardin.moveTo(vx, 12).quadraticCurveTo(vx + 3, 60, vx, 104)
        .stroke({ width: 2, color: 0xb96a2e, alpha: 0.3 })
    }
  }
  gardin.moveTo(198, 6).lineTo(412, 6).lineTo(412, 14)
  for (let kx = 412; kx > 199; kx -= 30.6) {
    gardin.quadraticCurveTo(kx - 15.3, 30, kx - 30.6, 14)
  }
  gardin.closePath().fill(verticalFill(0xf7b46e, 0xe08f47))
  c.addChild(gardin)
  // Fågeln sitter på fönsterblecket och är dold tills någon knackar på rutan.
  const fagel = new Container()
  fagel.visible = false
  const fg = new Graphics()
  fg.ellipse(0, 0, 17, 13).fill(0x6fa9bd).stroke({ width: 3, color: 0x4d8095 })
  fg.circle(12, -9, 9).fill(0x8dc2d3).stroke({ width: 3, color: 0x4d8095 })
  fg.moveTo(20, -9).lineTo(29, -6).lineTo(20, -3).closePath().fill(0xffb937)
  fg.circle(15, -11, 2.6).fill(0x2f2a26)
  fg.moveTo(-16, -2).quadraticCurveTo(-28, -8, -30, 2).quadraticCurveTo(-22, 4, -16, 2).fill(0x4d8095)
  fagel.addChild(fg)
  fagel.position.set(300, 118)
  c.addChild(fagel)
  noder.fagel = fagel
  return c
}

function _diskho(noder = {}) {
  const c = new Container()
  const g = new Graphics()
  // Kranen reser sig ur bänkskivan och böjer sig ut över hon.
  g.moveTo(288, 228).lineTo(288, 186).quadraticCurveTo(288, 164, 320, 164).lineTo(320, 186)
    .stroke({ width: 14, color: F.stalMork, cap: 'round' })
  g.moveTo(288, 226).lineTo(288, 188).quadraticCurveTo(288, 168, 316, 168)
    .stroke({ width: 7, color: F.stal, cap: 'round' })
  g.roundRect(266, 216, 46, 14, 6).fill(cylinderFill(F.stal, { axis: 'x' }))
  g.roundRect(302, 190, 38, 11, 5).fill(cylinderFill(F.stal, { axis: 'x' })) // vredet
  // Hon: en oval insänkning i skivan.
  g.ellipse(322, 240, 56, 17).fill(verticalFill(F.stalMork, F.stal)).stroke({ width: 3, color: F.stalMork })
  g.ellipse(322, 242, 45, 11).fill({ color: 0x8e9ba1, alpha: 0.7 })
  g.circle(322, 243, 6).fill({ color: F.morkt, alpha: 0.45 })
  // Blänk i porslinet — hon fångar ljuset från fönstret snett ovanför.
  g.ellipse(306, 236, 16, 4.5).fill({ color: 0xffffff, alpha: 0.3 })
  // Diskmedelspumpen på bänken och handduken över kanten: två småsaker som gör hörnet
  // ANVÄNT — en diskho utan spår av disk läser som en kuliss.
  g.roundRect(386, 198, 18, 30, 5).fill(verticalFill(0x7ccf6a, 0x55a848)).stroke({ width: 2.5, color: 0x3f8236 })
  g.roundRect(391, 188, 8, 12, 3).fill(cylinderFill(F.stal))
  g.roundRect(383, 183, 16, 7, 3).fill(cylinderFill(F.stal, { axis: 'x' }))
  g.roundRect(389, 203, 4, 20, 2).fill({ color: 0xffffff, alpha: 0.3 })
  g.roundRect(228, 222, 32, 62, 5).fill(verticalFill(0xf6f9fa, 0xd9e3e7)).stroke({ width: 2.5, color: 0xb9c6cc })
  g.rect(228, 262, 32, 4).fill({ color: 0xd66a5a, alpha: 0.75 })
  g.rect(228, 270, 32, 3).fill({ color: 0xd66a5a, alpha: 0.55 })
  g.moveTo(244, 226).lineTo(244, 280).stroke({ width: 2, color: 0xb9c6cc, alpha: 0.6 })
  g.roundRect(226, 220, 36, 9, 4).fill(topLightFill(0xe8eef0)) // viket över bänkkanten
  c.addChild(g)
  // Strålen: en egen nod som tänds när kranen slås på. Den ritas EN gång och skalas i
  // höjdled, i stället för att ritas om varje bildruta.
  const strale = new Graphics()
  strale.moveTo(-5, 0).lineTo(5, 0).lineTo(8, 54).lineTo(-8, 54).closePath()
    .fill({ color: 0x8fd6f5, alpha: 0.72 })
  strale.roundRect(-2, 4, 3, 44, 2).fill({ color: 0xffffff, alpha: 0.5 })
  strale.position.set(318, 186)
  strale.visible = false
  c.addChild(strale)
  noder.strale = strale
  noder.pip = { x: 318, y: 186 }
  noder.ho = { x: 322, y: 240 }
  return c
}

function _flakt(noder = {}) {
  const c = new Container()
  const g = new Graphics()
  g.rect(940, -20, 32, 26).fill(verticalFill(F.stalMork, F.stal)) // kanal upp i taket
  g.moveTo(866, 12).lineTo(1046, 12).lineTo(1012, 92).lineTo(900, 92)
    .fill(verticalFill(F.stal, F.stalMork)).stroke({ width: 5, color: F.stalMork })
  g.roundRect(892, 86, 128, 22, 8).fill(cylinderFill(F.stalMork, { axis: 'x' }))
  g.roundRect(928, 20, 54, 10, 5).fill({ color: 0xffffff, alpha: 0.4 })
  // Filterlamellerna: sneda streck i kåpans underdel — det som skiljer en fläktkåpa
  // från en grå tratt.
  for (let lx = 908; lx <= 998; lx += 12) {
    g.moveTo(lx, 84).lineTo(lx + 9, 62).stroke({ width: 2.5, color: F.morkt, alpha: 0.22 })
  }
  // Lampremsan: statiskt varmt sken ur listen; hjulet får snurra, lampan står still.
  g.roundRect(922, 98, 68, 8, 4).fill({ color: 0xffe08a, alpha: 0.9 })
  c.addChild(g)
  // Fläkthjulet sitter i kåpans underkant och roterar när fläkten är på.
  const hjul = new Graphics()
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    hjul.ellipse(Math.cos(a) * 12, Math.sin(a) * 12, 11, 5).fill({ color: F.stalMork, alpha: 0.9 })
  }
  hjul.circle(0, 0, 6).fill(F.morkt)
  hjul.position.set(956, 97)
  c.addChild(hjul)
  noder.flakthjul = hjul
  return c
}

function _spis(noder = {}) {
  const c = new Container()
  const g = new Graphics()
  // Hällen ligger i bänkskivan; kastrullen och stekpannan står på den.
  g.roundRect(872, SLAB.y - 2, 168, SLAB.h + 6, 8)
    .fill(verticalFill(F.morkt, 0x2c343a)).stroke({ width: 3, color: F.stalMork })
  // Tre vred i glipan mellan hällen och ugnen — markörstrecket uppåt på alla tre så
  // raden läser som EN sak, inte tre prickar.
  for (const px of [906, 956, 1006]) {
    g.circle(px, 257, 6).fill(verticalFill(F.stal, F.stalMork)).stroke({ width: 2, color: F.morkt })
    g.moveTo(px, 253).lineTo(px, 257).stroke({ width: 2, color: F.morkt })
  }
  c.addChild(g)
  // Plattorna: en egen nod vars alpha går 0,35 → 1 när spisen slås på.
  const plattor = new Graphics()
  for (const px of [906, 956, 1006]) {
    plattor.ellipse(px, SLAB.y + 10, 19, 7).fill({ color: 0xff6a2a, alpha: 0.55 })
    plattor.ellipse(px, SLAB.y + 10, 19, 7).stroke({ width: 3, color: 0xff8f5a })
  }
  plattor.alpha = 0.35
  c.addChild(plattor)
  noder.plattor = plattor
  // Kastrull
  const kastrull = new Graphics()
  kastrull.roundRect(878, 168, 88, 56, 10).fill(cylinderFill(F.stalMork)).stroke({ width: 4, color: F.morkt })
  kastrull.ellipse(922, 168, 48, 13).fill(verticalFill(F.stal, F.stalMork)).stroke({ width: 4, color: F.morkt })
  kastrull.roundRect(960, 182, 34, 9, 4).fill(cylinderFill(F.morkt, { axis: 'x' }))
  kastrull.circle(922, 162, 9).fill(F.morkt)
  // Ånghål i locket — två räcker för att locket ska läsa som ett lock, inte en skiva.
  kastrull.circle(902, 166, 2.6).fill({ color: F.morkt, alpha: 0.7 })
  kastrull.circle(942, 166, 2.6).fill({ color: F.morkt, alpha: 0.7 })
  c.addChild(kastrull)
  noder.kastrull = kastrull
  noder.gryta = { x: 922, y: 162 }
  // Stekpanna sedd snett uppifrån
  const panna = new Graphics()
  panna.roundRect(1000, 200, 58, 10, 5).fill(cylinderFill(F.morkt, { axis: 'x' }))
  panna.ellipse(998, 204, 38, 15).fill(verticalFill(0x4b5560, F.morkt)).stroke({ width: 4, color: F.morkt })
  panna.ellipse(998, 202, 29, 10).fill({ color: 0x5e6a75, alpha: 0.8 })
  panna.ellipse(986, 200, 11, 4).fill({ color: 0xffffff, alpha: 0.28 }) // blänk i teflonet
  c.addChild(panna)
  return c
}

function _ugn() {
  const c = new Container()
  const g = new Graphics()
  g.roundRect(862, 266, 188, 120, 10).fill(verticalFill(F.stalMork, F.morkt)).stroke({ width: 5, color: F.morkt })
  c.addChild(g)
  return c
}

function _hogskap() {
  const c = new Container()
  const g = new Graphics()
  g.roundRect(1070, 112, 198, 508, 16).fill(verticalFill(F.vit, F.vitMork)).stroke({ width: 5, color: F.vitMork })
  g.roundRect(1076, 604, 186, 16, 6).fill({ color: F.morkt, alpha: 0.3 })
  // Dörrspringor mellan sektionerna: skåpet är tre möbler i EN stomme, och utan
  // skarvarna läser det som en vit pelare.
  for (const sy of [252, 424]) {
    g.rect(1078, sy, 180, 3).fill({ color: F.morkt, alpha: 0.28 })
    g.rect(1078, sy + 4, 180, 2).fill({ color: 0xffffff, alpha: 0.35 })
  }
  c.addChild(g)
  // Micro: en inbyggd låda med lucka och panel.
  const micro = new Graphics()
  micro.roundRect(1078, 124, 180, 120, 10).fill(verticalFill(F.stalMork, F.morkt)).stroke({ width: 4, color: F.morkt })
  micro.roundRect(1210, 136, 40, 96, 6).fill({ color: F.morkt, alpha: 0.75 })
  for (let i = 0; i < 3; i++) micro.circle(1230, 160 + i * 26, 7).fill(F.stal)
  c.addChild(micro)
  return c
}

// Trähyllan med tre burkar. Etiketterna är TOMMA med en färgrand — en 2-åring läser färg
// och form, och text i dekor är förbjuden. Burkarna ritas före brädan så hyllans framkant
// skär deras fot: det är den skärningen som säger "de STÅR på hyllan".
//
// ⚠️ PLACERAD MOT SKALETS KNAPPAR, inte bara mot stationerna. Första platsen (ovanför
// kylen) låg mätbart utanför varje stations träffyta — men skalets HEM-knapp ligger
// ALLTID i övre vänstra hörnet och svalde halva hyllan i varje skärmdump (kritikerfynd).
// Nu sitter den på väggen mellan fönstret och pappa, under klockan: x 388–488 är fritt
// från fönsterramen (≤395), diskho-ytan (≤385), ansiktet (≥495) och klockan (botten ~98).
function _hylla() {
  const c = new Container()
  const g = new Graphics()
  // mjölburken — glas med ljust innehåll och trälock
  g.roundRect(40, 48, 34, 44, 7).fill(verticalFill(0xf7f2e6, 0xe0d5bd)).stroke({ width: 2.5, color: 0xcabb9e })
  g.roundRect(38, 42, 38, 10, 4).fill(topLightFill(0xa9713c))
  g.roundRect(48, 62, 18, 15, 3).fill(0xfff9ec).stroke({ width: 2, color: 0xd9cbb0 })
  g.rect(50, 68, 14, 3).fill({ color: 0xd0a468, alpha: 0.8 })
  g.roundRect(44, 52, 5, 34, 2).fill({ color: 0xffffff, alpha: 0.35 })
  // pastaburken — högst; spagettistrån som tunna streck bakom glaset
  g.roundRect(92, 32, 36, 59, 7).fill(verticalFill(0xf0dcab, 0xdcbf82)).stroke({ width: 2.5, color: 0xcaa96a })
  for (let i = 0; i < 4; i++) {
    g.moveTo(99 + i * 7, 38).lineTo(97 + i * 7, 86).stroke({ width: 2, color: 0xd9ad60, alpha: 0.6 })
  }
  g.roundRect(90, 26, 40, 10, 4).fill(topLightFill(0xd3a25e))
  g.roundRect(100, 54, 20, 14, 3).fill(0xfff9ec).stroke({ width: 2, color: 0xd9cbb0 })
  g.rect(102, 59, 16, 3).fill({ color: 0xd66a5a, alpha: 0.8 })
  g.roundRect(96, 38, 5, 46, 2).fill({ color: 0xffffff, alpha: 0.3 })
  // syltburken — kortast, mörkröd med metallock och en rund klick på etiketten
  g.roundRect(142, 58, 30, 33, 6).fill(verticalFill(0xb0455e, 0x87304a)).stroke({ width: 2.5, color: 0x6d2338 })
  g.roundRect(140, 52, 34, 9, 4).fill(cylinderFill(F.stalMork, { axis: 'x' }))
  g.roundRect(148, 68, 18, 14, 3).fill(0xfff9ec).stroke({ width: 2, color: 0xd9cbb0 })
  g.circle(157, 75, 3.5).fill({ color: 0xb0455e, alpha: 0.85 })
  g.roundRect(146, 62, 4, 24, 2).fill({ color: 0xffffff, alpha: 0.3 })
  // brädan sist, med två konsoler under
  g.roundRect(28, 90, 150, 11, 4).fill(topLightFill(F.tra)).stroke({ width: 3, color: F.traMork })
  g.poly([46, 101, 60, 101, 46, 110]).fill({ color: F.traMork, alpha: 0.9 })
  g.poly([146, 101, 160, 101, 160, 110]).fill({ color: F.traMork, alpha: 0.9 })
  c.addChild(g)
  c.scale.set(0.66)
  c.position.set(370, 128)
  return c
}

// Väggklockan: tio-i-två — samma glada V som på leksaksklockor. Tolv streck och inga
// siffror; visarna är hela poängen, och spelet kan ge containern en `pop`.
function _klocka(noder = {}) {
  const c = new Container()
  c.position.set(443, 62)
  const g = new Graphics()
  g.circle(0, -32, 3.5).fill(F.traMork) // upphängningen
  g.circle(0, 0, 32).fill(topLightFill(F.tra)).stroke({ width: 3, color: F.traMork })
  g.circle(0, 0, 25).fill(verticalFill(0xfdfaf2, 0xece4d2)).stroke({ width: 2, color: 0xd9cbb0 })
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.moveTo(Math.cos(a) * 19, Math.sin(a) * 19).lineTo(Math.cos(a) * 22.5, Math.sin(a) * 22.5)
      .stroke({ width: i % 3 === 0 ? 3 : 2, color: F.traMork, alpha: 0.75 })
  }
  g.moveTo(0, 0).lineTo(Math.cos(-Math.PI / 6) * 12, Math.sin(-Math.PI / 6) * 12)
    .stroke({ width: 4, color: F.morkt, cap: 'round' })
  g.moveTo(0, 0).lineTo(Math.cos((-5 * Math.PI) / 6) * 18, Math.sin((-5 * Math.PI) / 6) * 18)
    .stroke({ width: 3, color: F.morkt, cap: 'round' })
  g.circle(0, 0, 3).fill(F.morkt)
  c.addChild(g)
  noder.klocka = c
  return c
}

// Krukväxten ovanpå högskåpet: bladen först, krukan över — stjälkarna ska försvinna NER
// i krukan, inte sluta på dess kant. Förskjuten 60 px vänster: skalets LJUD-knapp täcker
// alltid övre högra hörnet (från x ~1164) och skar av krukan där den först stod.
function _krukvaxt() {
  const c = new Container()
  c.position.set(-60, 0)
  const g = new Graphics()
  for (const [dx, ty, f] of [[-26, 68, 0x4f9c46], [26, 68, 0x4f9c46], [-15, 60, 0x5cae4f], [15, 60, 0x5cae4f]]) {
    g.moveTo(1168, 88)
      .quadraticCurveTo(1168 + dx * 1.35, (ty + 96) / 2, 1168 + dx, ty)
      .quadraticCurveTo(1168 + dx * 0.2, (ty + 84) / 2, 1168, 88)
      .fill(topLightFill(f))
  }
  // mittbladet som ellips — en kvadratisk kurva med dx 0 blir en osynlig strimma
  g.ellipse(1168, 70, 5.5, 11).fill(topLightFill(0x6fbf5e))
  g.poly([1148, 90, 1188, 90, 1183, 113, 1153, 113]).fill(topLightFill(0xb85f42)).stroke({ width: 2.5, color: 0x8f462f })
  g.roundRect(1144, 82, 48, 11, 5).fill(cylinderFill(0xc96b4a, { axis: 'x' })).stroke({ width: 2.5, color: 0x8f462f })
  g.roundRect(1152, 95, 5, 14, 2).fill({ color: 0xffffff, alpha: 0.18 })
  c.addChild(g)
  return c
}
