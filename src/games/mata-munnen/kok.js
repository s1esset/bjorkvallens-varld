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
import { verticalFill, cylinderFill, topLightFill } from '../../lib/form.js'

// --------------------------------------------------------------- geometri ---

// Ansiktet är MASTER: köksön räknas ur det, aldrig tvärtom.
// Höjden är en avvägning mellan två saker som drar åt olika håll: grimasen ÄR belöningen
// (stort ansikte), men skärlinjen ligger på en fast andel av höjden — ett större ansikte
// trycker alltså ner köksön och gör bänkskivan till en list att balansera hakan på. 470
// ger 171 px bänkdjup, vilket är det som får huvudet att stå BAKOM en bänk i stället för
// på en kant. Uppmätt i bild: vid h=500 blev djupet 146 och skarven läste som ett fat.
export const ANS = { x: 620, y: 268, h: 470 }

// Andelen av fotorutan där halsen fortfarande är tät (616/800) — se filhuvudet.
const HALS = 0.77

export const KANT_Y = Math.round(ANS.y + (HALS - 0.5) * ANS.h) // 395 — köksöns bakkant
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
    innehall: ['is', 'glasspinne', 'blackfisk'], platser: [[104, 185]] },
  { id: 'kyl', sv: 'Kylskåpet', yta: { x: 20, y: 266, w: 168, h: 374 }, typ: 'dorr-v', inre: 'kall', ljus: 0xeafaff,
    innehall: ['ost', 'agg', 'tomat', 'gurka', 'korv', 'mjolk', 'groda', 'mogelost', 'sallad'],
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
    innehall: ['kyckling', 'pommes', 'kaka', 'potatis', 'kringla'], platser: [[956, 326]] },
  // --- höger: högskåpet med micro, skafferi och lådor ---
  { id: 'micro', sv: 'Mikron', yta: { x: 1078, y: 124, w: 180, h: 120 }, typ: 'lucka-ner', inre: 'het', ljus: 0xffe6a0,
    innehall: ['pizza', 'korv', 'munk', 'potatis'], platser: [[1150, 180]] },
  { id: 'skafferi', sv: 'Skafferiet', yta: { x: 1078, y: 268, w: 180, h: 146 }, typ: 'dorr-h',
    innehall: ['kringla', 'choklad', 'godis', 'jordnot', 'kastanj', 'honung', 'druvor', 'mango'],
    platser: [[1168, 341]] },
  // Skräplådan: det ÄR meningen att det ligger konstiga saker här. P0 MOTGÅNG säger att
  // bus ska vara roligt och gå att åtgärda — inte att det ska saknas.
  { id: 'lador', sv: 'Lådorna', yta: { x: 1078, y: 438, w: 180, h: 166 }, typ: 'lada',
    innehall: ['tandborste', 'disksvamp', 'strumpa', 'kalsonger', 'kackerlacka', 'spindel', 'toapapper', 'snor'],
    platser: [[1168, 494]] }, // ovanför fronten när den dragits ut 56 % av 166 px
  // --- köksöns front ---
  { id: 'oskap_v', sv: 'Kastrullskåpet', yta: { x: 300, y: 600, w: 320, h: 106 }, typ: 'dorr-v',
    innehall: ['kastrull', 'stekpanna', 'fat', 'slev', 'kavel'], platser: [[382, 650], [538, 650]] },
  { id: 'oskap_h', sv: 'Besticklådan', yta: { x: 660, y: 600, w: 320, h: 106 }, typ: 'lada',
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
  for (let i = 1; i <= 6; i++) {
    const yy = GOLV_Y + i * i * 8
    if (yy > yBot) break
    rum.moveTo(x0, yy).lineTo(x1, yy).stroke({ width: 2, color: F.golvFog, alpha: 0.4 })
  }
  for (let gx = -400; gx < 1700; gx += 150) {
    rum.moveTo(gx, GOLV_Y).lineTo(gx + (gx - 640) * 0.7, yBot)
      .stroke({ width: 2, color: F.golvFog, alpha: 0.28 })
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
    const lager = st.yta.y > KANT_Y ? framgrund : bakgrund
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
  detalj.roundRect(26, 248, 156, 8, 4).fill({ color: F.stalMork, alpha: 0.6 })
  // Magneter på dörren — en kyl utan magneter är en vitvara, inte ett hem.
  for (const [mx, my, mf] of [[48, 300, 0xff8f5a], [82, 292, 0x6bd0a8], [116, 302, 0xffd166]]) {
    detalj.circle(mx, my, 11).fill(mf).stroke({ width: 2.5, color: 0xffffff, alpha: 0.8 })
  }
  detalj.roundRect(24, 644, 160, 16, 6).fill({ color: F.morkt, alpha: 0.35 })
  c.addChild(detalj)
  return c
}

function _fonster(noder = {}) {
  const c = new Container()
  const g = new Graphics()
  // Utsikt: himmel över en grön kulle, med en sol. Ljuset i rummet kommer härifrån.
  g.roundRect(225, 12, 160, 116, 10).fill(verticalFill(0xa8dcf5, 0xd8f0fb))
  g.rect(225, 84, 160, 44).fill(verticalFill(0x8fca6e, 0x6fa94f))
  const sol = new Graphics().circle(0, 0, 17).fill(0xffe08a)
  sol.position.set(348, 42)
  g.circle(258, 44, 13).fill({ color: 0xffffff, alpha: 0.85 })
  g.circle(276, 42, 16).fill({ color: 0xffffff, alpha: 0.85 })
  g.roundRect(225, 12, 160, 116, 10).stroke({ width: 9, color: F.vit })
  g.moveTo(305, 16).lineTo(305, 124).stroke({ width: 7, color: F.vit })
  g.moveTo(229, 70).lineTo(381, 70).stroke({ width: 7, color: F.vit })
  // Fönsterbräda, så fönstret sitter i väggen i stället för att hänga som en tavla.
  g.roundRect(215, 126, 180, 12, 5).fill(topLightFill(F.tra)).stroke({ width: 3, color: F.traMork })
  c.addChildAt(sol, 0)
  c.addChild(g)
  noder.sol = sol
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
  c.addChild(kastrull)
  noder.kastrull = kastrull
  noder.gryta = { x: 922, y: 162 }
  // Stekpanna sedd snett uppifrån
  const panna = new Graphics()
  panna.roundRect(1000, 200, 58, 10, 5).fill(cylinderFill(F.morkt, { axis: 'x' }))
  panna.ellipse(998, 204, 38, 15).fill(verticalFill(0x4b5560, F.morkt)).stroke({ width: 4, color: F.morkt })
  panna.ellipse(998, 202, 29, 10).fill({ color: 0x5e6a75, alpha: 0.8 })
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
  c.addChild(g)
  // Micro: en inbyggd låda med lucka och panel.
  const micro = new Graphics()
  micro.roundRect(1078, 124, 180, 120, 10).fill(verticalFill(F.stalMork, F.morkt)).stroke({ width: 4, color: F.morkt })
  micro.roundRect(1210, 136, 40, 96, 6).fill({ color: F.morkt, alpha: 0.75 })
  for (let i = 0; i < 3; i++) micro.circle(1230, 160 + i * 26, 7).fill(F.stal)
  c.addChild(micro)
  return c
}
