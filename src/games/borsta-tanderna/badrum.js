// BADRUMMET — miljön i `borsta-tanderna` (1280×720, tablet-först, full bleed).
//
// SAMMA GREPP SOM `flugan-pa-nasan/rummet.js`, `titt-ut-pappa/rummet.js` OCH
// `mata-munnen/kok.js`: djupet ligger i LAGERORDNINGEN, inte i en mask. `bak` (kaklad
// vägg, spegelskåp, handduk, kakelsockel, bänkskivans liggande yta, handfatets BAKRE
// halva) ritas bakom ansiktsriggen; `fram` (bänkskivans framkant, kommoden, handfatets
// främre halva, kranen, hyllan) ritas framför den. Bänkskivans framkant skär då av
// fotorutans raka underkant av sig själv — ingen mask, och riggen behöver aldrig flyttas.
//
// ⚠️ ALLA TAL KOMMER UR `./layout.js`. Hårdkoda aldrig 640, 470 eller 250 här — de bor i
//    BANK_Y, HO, HYLLA och räknas i sin tur ur fotoriggen. Modulen känner INTE spelets
//    livscykel: ingen `ctx.later`, inga ticker-callbacks, bara gsap-tweens som `destroy()`
//    dödar.
//
// ⚠️ VAR ANSIKTET FAKTISKT LIGGER ÄR MÄTT, INTE GISSAT.
//    `ANSIKTE_YTA` (v 178 · h 768) är ansiktets BREDASTE rad — håret uppe vid y 34. Läser
//    man den som en vägg blir hela vänstra bänkskivan förbjuden mark, och då finns ingen
//    plats för kranen som `layout.KRAN` pekar ut. Silhuetten i
//    `public/ansikte/pappa/manifest.json` (`geometri.silhuett`, 8 källrader per post)
//    omräknad till designkoordinater vid ANS_H = 1100 ger i stället per rad:
//
//        y 342 →  x 289 … 680        y 518 →  x 297 … 691
//        y 386 →  x 303 … 666        y 562 →  x 299 … 689
//        y 430 →  x 304 … 665        y 606 →  x 300 … 688
//        y 474 →  x 296 … 692        y 628 →  x 324 … 665   (hakan)
//
//    Under y ≈ 340 är alltså ALLT till vänster om x 296 och till höger om x 692 fri vägg.
//    Kranen (bas x 215) och dess pip får därför gå till x 278 — 21 px marginal till
//    käklinjens 299 på den rad pipen är som längst ut. Flyttas ansiktets höjd eller
//    `ANS.x` måste den tabellen räknas om, annars växer kranen in i kinden.
//
// ⚠️ INGA TEXTURBAKNINGAR. `renderer.generateTexture()` fäller hela testsviten och en egen
//    `new FillGradient` per montering destabiliserar den på samma sätt (CLAUDE.md). All
//    volym går via de CACHADE hjälparna i `lib/form.js` — noll nya bakningar per montering.
//
// ⚠️ `bak` och `fram` är BÅDA `eventMode = 'none'` + `interactiveChildren = false`, precis
//    som kontraktet kräver: badrummet är ren dekor. Följden är att allt som läggs i
//    `hyllPlan` eller `ho` också är ren BILD — Pixi klipper hela grenen ur träfftestet.
//    Träffytorna för tuber, glas och borste måste alltså ligga i ett eget lager som
//    index.js äger. (Behöver de ändå bli träffbara: sätt `fram.interactiveChildren = true`
//    från index.js — en rad, och bara den som äger träffytorna får ta det beslutet.)

import { Container, Graphics } from 'pixi.js'
import gsap from 'gsap'
import { shade } from '../../lib/theme.js'
import { verticalFill, verticalFillAlpha, topLightFill, groundFill, cylinderFill } from '../../lib/form.js'
import { liv as fbLiv } from '../../lib/feedback.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { BANK_Y, HO, KRAN, HYLLA } from './layout.js'

// ----------------------------------------------------------------- palett ---

const F = {
  fog: 0xa9c7cd, fogLjus: 0xc9e0e4,
  kakel: 0xdcf0ee, kakelVarm: 0xf7efdb, kakelSval: 0x9fdbe2,
  bard: 0x74c9d6,
  gul: 0xffd35c, gulMork: 0xefb738, orange: 0xff8a3d, bla: 0x4aa3df,
  bank: 0xefe2c6, bankMork: 0xc0a87e, spack: 0xb59a6d,
  skap: 0xf3ecdd, skapMork: 0xc7b491,
  porslin: 0xfdfbf6, porslinMork: 0xcfc7b8, hoInne: 0xe1dacc,
  metall: 0xdde5ea, metallLjus: 0xf6fafb, metallMork: 0x8b98a3,
  spegelTopp: 0xe6f3f6, spegelBotten: 0xb4d1da,
  handduk: 0xf79a86, handdukMork: 0xcf6a58, handdukLjus: 0xffcfc0,
  glas: 0xd9f0f7, glasMork: 0x93c7d8,
  vatten: 0xa9dcf2, vattenLjus: 0xe8f8fe,
  morkt: 0x33484f,
}

// Kakelraster. `TILE` är plattans delning, `FOG` fogens bredd — plattans FRONT blir
// TILE − FOG, och fogen är den bakomliggande gradienten som lyser fram emellan.
const TILE = 64
const FOG = 5

// Handfatet i en form. `layout.HO` ger ytterkanterna (v/h), djupet och rimhöjden;
// `x` är avloppets läge (= ansiktets mittlinje), inte ellipsens centrum.
const HO_CX = (HO.v + HO.h) / 2
const HO_RX = (HO.h - HO.v) / 2
const HO_RY = 44
const HO_IN_RX = HO_RX - 17
const HO_IN_RY = HO_RY - 12

// Kakelsockeln och bänkskivans liggande yta (båda i `bak`, alltså bakom pappa).
const SOCKEL_Y = 548
const YTA_Y = BANK_Y - 56     // bänkskivans BAKRE kant; framkanten är BANK_Y

// Kranens fixtur, räknad ur `KRAN` (som pekar ut monteringspunkten på bänkskivans yta).
const KRAN_TOPP = -66         // lokalt: pipens högsta punkt
const PIP_X = 53              // lokalt: pipens mynning (abs 268 — se silhuett-tabellen)
const PIP_Y = -18

const KAPPA = 0.5523

// ------------------------------------------------------------- småverktyg ---

function nyG() {
  const g = new Graphics()
  g.eventMode = 'none'
  return g
}

function nyC() {
  const c = new Container()
  c.eventMode = 'none'
  return c
}

// Deterministisk cellvariation. Ingen `Math.random` i bilden: två monteringar måste ge
// exakt samma kakelvägg, annars flaggar baslinjebilderna en diff ingen orsakat.
const cellHash = (c, r) => (((c * 37 + r * 61) % 9) + 9) % 9

// Halva ellipser som PATH — Pixis `ellipse()` ritar bara hela, och handfatets rim måste
// delas i en bakre halva (i `bak`) och en främre (i `fram`). Två kubiska bezier per halva
// ger kappa-approximationen, alltså en verklig ellipsbåge och ingen kantig klump.
function bageNer(g, cx, cy, rx, ry, borja = true) {
  if (borja) g.moveTo(cx - rx, cy)
  g.bezierCurveTo(cx - rx, cy + ry * KAPPA, cx - rx * KAPPA, cy + ry, cx, cy + ry)
  g.bezierCurveTo(cx + rx * KAPPA, cy + ry, cx + rx, cy + ry * KAPPA, cx + rx, cy)
}

function bageNerBak(g, cx, cy, rx, ry) {
  g.bezierCurveTo(cx + rx, cy + ry * KAPPA, cx + rx * KAPPA, cy + ry, cx, cy + ry)
  g.bezierCurveTo(cx - rx * KAPPA, cy + ry, cx - rx, cy + ry * KAPPA, cx - rx, cy)
}

function bageUpp(g, cx, cy, rx, ry, borja = true) {
  if (borja) g.moveTo(cx - rx, cy)
  g.bezierCurveTo(cx - rx, cy - ry * KAPPA, cx - rx * KAPPA, cy - ry, cx, cy - ry)
  g.bezierCurveTo(cx + rx * KAPPA, cy - ry, cx + rx, cy - ry * KAPPA, cx + rx, cy)
}

function bageUppBak(g, cx, cy, rx, ry) {
  g.bezierCurveTo(cx + rx, cy - ry * KAPPA, cx + rx * KAPPA, cy - ry, cx, cy - ry)
  g.bezierCurveTo(cx - rx * KAPPA, cy - ry, cx - rx, cy - ry * KAPPA, cx - rx, cy)
}

// ------------------------------------------------------- kakelplattornas motiv ---
//
// Ett mönsterkakel är MÅLAT PORSLIN, inte en ikon i en ruta: motivet ritas direkt på
// plattans yta med egna former (P0 ASSETS). Tre motiv räcker för att ögat ska läsa
// väggen som ett barnbadrum i stället för som en textur.

function motivAnka(g, cx, cy) {
  g.poly([cx - 13, cy + 2, cx - 25, cy - 6, cx - 12, cy - 2]).fill({ color: F.gul, alpha: 0.95 })
  g.ellipse(cx - 1, cy + 5, 17, 12).fill({ color: F.gul, alpha: 0.95 })
  g.circle(cx + 11, cy - 8, 9).fill({ color: F.gul, alpha: 0.95 })
  g.poly([cx + 19, cy - 9, cx + 28, cy - 6, cx + 19, cy - 3]).fill({ color: F.orange, alpha: 0.95 })
  g.ellipse(cx - 2, cy + 4, 8, 5).fill({ color: F.gulMork, alpha: 0.75 })
  g.circle(cx + 13, cy - 10, 2.2).fill({ color: F.morkt, alpha: 0.85 })
  g.moveTo(cx - 16, cy + 15).quadraticCurveTo(cx - 2, cy + 19, cx + 14, cy + 15)
    .stroke({ width: 2, color: F.bla, alpha: 0.5 })
}

function motivFisk(g, cx, cy) {
  g.poly([cx - 11, cy, cx - 25, cy - 10, cx - 25, cy + 10]).fill({ color: F.bla, alpha: 0.9 })
  g.ellipse(cx + 3, cy, 16, 11).fill({ color: F.bla, alpha: 0.9 })
  g.moveTo(cx - 2, cy - 9).quadraticCurveTo(cx + 3, cy - 19, cx + 10, cy - 7)
    .fill({ color: shade(F.bla, 0.2), alpha: 0.9 })
  g.circle(cx + 10, cy - 3, 3).fill({ color: 0xffffff, alpha: 0.95 })
  g.circle(cx + 11, cy - 3, 1.6).fill({ color: F.morkt, alpha: 0.9 })
  g.moveTo(cx - 5, cy + 3).quadraticCurveTo(cx + 1, cy + 7, cx + 8, cy + 3)
    .stroke({ width: 2, color: 0xffffff, alpha: 0.45 })
}

function motivBubblor(g, cx, cy) {
  for (const [bx, by, r] of [[cx - 9, cy + 7, 11], [cx + 10, cy + 2, 7.5], [cx, cy - 12, 6]]) {
    g.circle(bx, by, r).fill({ color: 0xffffff, alpha: 0.5 })
    g.circle(bx, by, r).stroke({ width: 2, color: F.bla, alpha: 0.55 })
    g.circle(bx - r * 0.32, by - r * 0.36, r * 0.28).fill({ color: 0xffffff, alpha: 0.9 })
  }
}

const MOTIV = [motivAnka, motivBubblor, motivFisk]

// ================================================================ byggaren ===

/**
 * Bygger badrummet.
 *
 * @param {object} ctx  spelets GameContext (bara `ctx.view` läses — för full bleed).
 * @returns {{bak:Container, fram:Container, hyllPlan:Container, ho:Container,
 *           kran:{pa:(v:boolean)=>void, destroy:()=>void},
 *           liv:()=>void, destroy:()=>void}}
 *
 * `hyllPlan` och `ho` är tomma containrar i DESIGNKOORDINATER (position 0,0) — den som
 * lägger noder där räknar alltså i samma 1280×720 som allt annat, med `layout.TUB_PLATS`
 * respektive `layout.HO` som ankare. `destroy()` PLOCKAR LOSS de noderna i stället för att
 * riva dem: badrummet äger dem inte, och en dubbelrivning är precis den sortens tysta fel
 * exit-cykeln annars hittar åt oss.
 */
export function byggBadrum(ctx) {
  const v = ctx?.view || {}
  const x0 = Math.min(-BLEED_X, (v.left ?? 0) - 40)
  const x1 = Math.max(1280 + BLEED_X, (v.right ?? 1280) + 40)
  const yTop = Math.min(-BLEED_Y, (v.top ?? 0) - 40)
  const yBot = Math.max(720 + BLEED_Y, (v.bottom ?? 720) + 60)

  const bak = new Container()
  const fram = new Container()
  bak.eventMode = 'none'
  bak.interactiveChildren = false
  fram.eventMode = 'none'
  fram.interactiveChildren = false

  // ⚠️ LISTAN MÅSTE RENSAS, INTE BARA VÄXA. Droppen faller var 2,4:e sekund och lägger en
  // FÄRDIG tween i listan varje gång — efter tio minuters lek är det ett par hundra döda
  // poster som hålls vid liv av just den här arrayen. Samma familj som ansiktsriggens
  // ringbuffert, och samma mått avgör: `tw.parent` är sann för löpande OCH väntande,
  // falsk för både färdiga och dödade (se `scripts/_tweenprobe.mjs`).
  let tweens = []
  const to = (mal, vars) => {
    const tw = gsap.to(mal, vars)
    tweens.push(tw)
    if (tweens.length > 40) tweens = tweens.filter((t) => t === tw || t?.parent)
    return tw
  }

  let levande = true

  // ============================================================ KAKELVÄGGEN ===
  // Fogen är BOTTENFÄRGEN (en lodrät toning, aldrig en platt ton — `_plattprobe` rankar
  // just stora enfärgade ytor), plattorna ligger som fronter ovanpå den med FOG px glapp.

  const vagg = nyG()
  const vaggBot = BANK_Y + 60
  vagg.rect(x0, yTop, x1 - x0, vaggBot - yTop).fill(verticalFill(F.fogLjus, F.fog))

  const kx0 = Math.floor(x0 / TILE) * TILE
  const ky0 = Math.floor(yTop / TILE) * TILE
  // Bårdraden: den kakelrad vars ÖVERKANT ligger på y 320. Den är vald mot mätningen —
  // spegelskåpet slutar på 312 och Bobos hjässa börjar först runt 460, så raden syns i
  // sin helhet på BÅDA sidor om ansiktet (vänster om x 289, höger om x 680).
  const BARD_TOPP = 320

  for (let ty = ky0, r = 0; ty < vaggBot; ty += TILE, r++) {
    const bard = ty === BARD_TOPP
    for (let tx = kx0, c = 0; tx < x1; tx += TILE, c++) {
      const fx = tx + FOG / 2
      const fy = ty + FOG / 2
      const fw = TILE - FOG
      const fh = TILE - FOG
      const grund = bard ? F.kakelSval : F.kakel
      vagg.roundRect(fx, fy, fw, fh, 7).fill(topLightFill(grund, { highlight: 0.26, dark: 0.12 }))
      if (!bard) {
        const hv = cellHash(c, r)
        // Var nionde platta är en nyans varmare, var nionde en nyans svalare. Utan dem
        // ligger 400 plattor i EXAKT samma ton och ytan läser som en textur, inte kakel.
        if (hv === 0) vagg.roundRect(fx, fy, fw, fh, 7).fill({ color: F.kakelVarm, alpha: 0.42 })
        else if (hv === 3) vagg.roundRect(fx, fy, fw, fh, 7).fill({ color: F.kakelSval, alpha: 0.2 })
      }
      // Glansstrecket i plattans övre vänstra hörn — det är det som säger "blankt kakel".
      vagg.moveTo(fx + 7, fy + 4).lineTo(fx + fw - 12, fy + 4)
        .stroke({ width: 2, color: 0xffffff, alpha: 0.55 })
      vagg.moveTo(fx + 4, fy + 7).lineTo(fx + 4, fy + fh - 12)
        .stroke({ width: 2, color: 0xffffff, alpha: 0.32 })
      // Bårdens motiv: var tredje platta, motivet växlar med kolumnen.
      if (bard && ((c % 3) + 3) % 3 === 0) {
        MOTIV[(((c / 3) | 0) % MOTIV.length + MOTIV.length) % MOTIV.length](vagg, fx + fw / 2, fy + fh / 2)
      }
    }
  }
  // Bårdens av- och påfart: två smala linjer som binder raden till väggen.
  vagg.rect(x0, BARD_TOPP - 3, x1 - x0, 3).fill({ color: F.bard, alpha: 0.55 })
  vagg.rect(x0, BARD_TOPP + TILE, x1 - x0, 3).fill({ color: F.bard, alpha: 0.55 })
  bak.addChild(vagg)

  // ============================================================ SPEGELSKÅPET ===
  // Uppe till VÄNSTER, x 6..168 — silhuettens smalaste rad uppe vid håret är x 183, så
  // skåpet ligger 15 px från ansiktet i värsta raden och kan aldrig hamna i hans huvud.
  const spegel = _spegelskap(6, 52, 162, 260)
  bak.addChild(spegel.nod)

  // ================================================================ HANDDUKEN ===
  // Till höger, under hyllans högra ände (hyllplankan slutar 1275, konsolen står på 1180).
  // Kroken sitter på 332 så handduken börjar under konsolens fot.
  const handduk = _handduk(1216, 330)
  bak.addChild(handduk.nod)

  // ============================================================= KAKELSOCKEL ===
  // Ett stående band av små plattor bakom bänkskivan — det är den som gör att skivan
  // MÖTER väggen i stället för att sluta i den. Ligger i `bak`, alltså bakom pappa: den
  // syns i gluggarna mellan hans käke och kanterna, precis som resten av rummet.
  const sockel = nyG()
  sockel.rect(x0, SOCKEL_Y, x1 - x0, YTA_Y - SOCKEL_Y + 4)
    .fill(verticalFill(F.fogLjus, F.fog))
  for (let sx = Math.floor(x0 / 36) * 36; sx < x1; sx += 36) {
    sockel.roundRect(sx + 2, SOCKEL_Y + 3, 32, YTA_Y - SOCKEL_Y - 3, 5)
      .fill(topLightFill(F.kakel, { highlight: 0.3, dark: 0.1 }))
    sockel.moveTo(sx + 6, SOCKEL_Y + 6).lineTo(sx + 30, SOCKEL_Y + 6)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.5 })
  }
  sockel.rect(x0, SOCKEL_Y - 4, x1 - x0, 5).fill({ color: F.bard, alpha: 0.5 })
  bak.addChild(sockel)

  // =================================================== BÄNKSKIVANS LIGGANDE YTA ===
  // Den syns bara UTANFÖR ansiktet (x < 296 och x > 692 på de raderna) — men det är
  // exakt där Bobo, muggen och vattenglaset står, och utan den svävar de på en framkant.
  const yta = nyG()
  yta.rect(x0, YTA_Y, x1 - x0, BANK_Y - YTA_Y + 3)
    .fill(groundFill(F.bank, { light: 0.07, dark: 0.11 }))
  yta.rect(x0, YTA_Y, x1 - x0, 4).fill({ color: F.bankMork, alpha: 0.35 })
  // Stenspräcklet: utan det är skivan en enda platt sandton över 1800 px.
  for (let i = 0; i < 190; i++) {
    const px = kx0 + ((i * 137) % (x1 - kx0))
    const py = YTA_Y + 8 + ((i * 53) % (BANK_Y - YTA_Y - 12))
    const rr = 1.1 + ((i * 7) % 5) * 0.35
    yta.circle(px, py, rr).fill({ color: F.spack, alpha: 0.2 + ((i * 3) % 4) * 0.05 })
  }
  bak.addChild(yta)

  // ============================================= HANDFATETS BAKRE HALVA (bak) ===
  // Rim-ellipsen har sitt CENTRUM på BANK_Y. Övre halvan hör hemma bakom pappa (den
  // ligger på y < 640 innanför ansiktsbandet och får aldrig ritas i `fram`), undre halvan
  // längre ner. Ihop läser de som en skål nedsänkt i skivan.
  const hoBak = nyG()
  bageUpp(hoBak, HO_CX, BANK_Y, HO_RX, HO_RY)
  hoBak.lineTo(HO_CX + HO_IN_RX, BANK_Y)
  bageUppBak(hoBak, HO_CX, BANK_Y, HO_IN_RX, HO_IN_RY)
  hoBak.lineTo(HO_CX - HO_RX, BANK_Y)
  hoBak.fill(verticalFill(shade(F.porslin, 0.14), F.porslin))
  bageUpp(hoBak, HO_CX, BANK_Y, HO_IN_RX, HO_IN_RY)
  hoBak.lineTo(HO_CX - HO_IN_RX, BANK_Y)
  hoBak.fill({ color: F.hoInne })
  // Skuggan under bakre rimmet — det är den som gör hålet DJUPT i stället för målat.
  bageUpp(hoBak, HO_CX, BANK_Y - 2, HO_IN_RX - 3, HO_IN_RY - 3)
  hoBak.stroke({ width: 9, color: shade(F.hoInne, 0.42), alpha: 0.5 })
  bak.addChild(hoBak)

  // ==================================================== BÄNKSKIVAN (fram) ===

  const bank = nyG()
  // Framkantsprofilen: en tjock list med en blank överkant. Det är den som säger
  // "det här är en kant", och den skär fotorutans raka underkant.
  bank.rect(x0, BANK_Y, x1 - x0, 30).fill(cylinderFill(F.bank, { axis: 'x', dark: 0.2, highlight: 0.26 }))
  bank.rect(x0, BANK_Y, x1 - x0, 4).fill({ color: 0xffffff, alpha: 0.6 })
  bank.rect(x0, BANK_Y + 27, x1 - x0, 3).fill({ color: F.bankMork, alpha: 0.65 })
  for (let i = 0; i < 120; i++) {
    const px = kx0 + ((i * 211) % (x1 - kx0))
    const py = BANK_Y + 7 + ((i * 31) % 18)
    bank.circle(px, py, 1 + ((i * 5) % 4) * 0.3).fill({ color: F.spack, alpha: 0.24 })
  }
  // Kommoden under skivan, ända ner till `yBot` — inget får ta slut i luften på en
  // 4:3-platta, och ett golv skulle bara bli en remsa som läser som ett fel.
  bank.rect(x0, BANK_Y + 30, x1 - x0, yBot - BANK_Y - 30).fill(verticalFill(F.skap, shade(F.skap, 0.22)))
  bank.rect(x0, BANK_Y + 30, x1 - x0, 16).fill({ color: F.skapMork, alpha: 0.35 })
  fram.addChild(bank)

  // Luckor: bara UTANFÖR handfatets skål (skålen bottnar på BANK_Y + HO.djup = 772), så
  // ingen fogkant löper rakt igenom porslinet.
  const luckor = nyG()
  for (const [lx0, lx1] of [[x0 + 40, 190], [790, x1 - 40]]) {
    luckor.roundRect(lx0, BANK_Y + 62, lx1 - lx0, 132, 14)
      .fill(topLightFill(F.skap, { highlight: 0.2, dark: 0.14 }))
    luckor.roundRect(lx0 + 16, BANK_Y + 78, lx1 - lx0 - 32, 100, 9)
      .stroke({ width: 3, color: F.skapMork, alpha: 0.55 })
    const hx = lx0 < 400 ? lx1 - 34 : lx0 + 34
    luckor.ellipse(hx, BANK_Y + 130, 12, 12).fill(cylinderFill(F.metall, { axis: 'y' }))
    luckor.circle(hx - 3, BANK_Y + 126, 3.5).fill({ color: 0xffffff, alpha: 0.7 })
  }
  luckor.rect(x0, yBot - 46, x1 - x0, 46).fill({ color: F.morkt, alpha: 0.16 })
  fram.addChild(luckor)

  // ============================================ HANDFATETS FRÄMRE HALVA (fram) ===

  // Skålens kropp, från rimmets ytterkant ner till `HO.djup`.
  const skal = nyG()
  skal.ellipse(HO_CX, BANK_Y + HO.djup - 6, HO_RX * 0.86, 26).fill({ color: F.morkt, alpha: 0.13 })
  skal.moveTo(HO_CX - HO_RX, BANK_Y)
  skal.quadraticCurveTo(HO_CX - HO_RX * 0.96, BANK_Y + HO.djup * 1.24, HO_CX, BANK_Y + HO.djup)
  skal.quadraticCurveTo(HO_CX + HO_RX * 0.96, BANK_Y + HO.djup * 1.24, HO_CX + HO_RX, BANK_Y)
  skal.closePath()
  skal.fill(verticalFill(F.porslin, shade(F.porslin, 0.2)))
  // Blänket längs skålens vänstra rundning — porslin utan högdager läser som gips.
  skal.moveTo(HO_CX - HO_RX * 0.72, BANK_Y + 16)
    .quadraticCurveTo(HO_CX - HO_RX * 0.66, BANK_Y + 76, HO_CX - HO_RX * 0.4, BANK_Y + 112)
    .stroke({ width: 11, color: 0xffffff, alpha: 0.45, cap: 'round' })
  skal.moveTo(HO_CX + HO_RX * 0.55, BANK_Y + 22)
    .quadraticCurveTo(HO_CX + HO_RX * 0.6, BANK_Y + 70, HO_CX + HO_RX * 0.3, BANK_Y + 108)
    .stroke({ width: 7, color: shade(F.porslinMork, 0.1), alpha: 0.3, cap: 'round' })
  fram.addChild(skal)

  // Skålens INNERYTA (undre halvan) + avloppet. Ligger under skummet i `ho`.
  const hoInne = nyG()
  bageNer(hoInne, HO_CX, BANK_Y, HO_IN_RX, HO_IN_RY)
  hoInne.lineTo(HO_CX - HO_IN_RX, BANK_Y)
  hoInne.fill({ color: F.hoInne })
  hoInne.ellipse(HO.x, BANK_Y + HO_IN_RY * 0.45, 24, 8).fill({ color: shade(F.hoInne, 0.34) })
  hoInne.ellipse(HO.x, BANK_Y + HO_IN_RY * 0.45, 20, 6).fill(cylinderFill(F.metall, { axis: 'x' }))
  for (const dx of [-9, 0, 9]) {
    hoInne.roundRect(HO.x + dx - 1.6, BANK_Y + HO_IN_RY * 0.45 - 4, 3.2, 8, 1.5)
      .fill({ color: F.metallMork, alpha: 0.75 })
  }
  fram.addChild(hoInne)

  // ------ vattenstrålen + plasket (mellan innerytan och främre rimmet) ------
  const strom = nyG()
  strom.alpha = 0
  strom.visible = false
  const plask = nyG()
  plask.alpha = 0
  fram.addChild(strom, plask)

  // ------ skummet som spottas i hon (index.js äger innehållet) ------
  const ho = nyC()
  ho.position.set(0, 0)
  fram.addChild(ho)

  // ------ främre rimmet: läppen som skummet försvinner bakom ------
  const hoFram = nyG()
  bageNer(hoFram, HO_CX, BANK_Y, HO_RX, HO_RY)
  hoFram.lineTo(HO_CX + HO_IN_RX, BANK_Y)
  bageNerBak(hoFram, HO_CX, BANK_Y, HO_IN_RX, HO_IN_RY)
  hoFram.lineTo(HO_CX - HO_RX, BANK_Y)
  hoFram.fill(verticalFill(F.porslin, shade(F.porslin, 0.1)))
  bageNer(hoFram, HO_CX, BANK_Y + 3, HO_RX - 6, HO_RY - 5)
  hoFram.stroke({ width: 3.5, color: 0xffffff, alpha: 0.75 })
  bageNer(hoFram, HO_CX, BANK_Y, HO_RX, HO_RY)
  hoFram.stroke({ width: 2.5, color: F.porslinMork, alpha: 0.55 })
  fram.addChild(hoFram)

  // ==================================================================== KRANEN ===
  const kranNod = nyC()
  kranNod.position.set(KRAN.x, KRAN.y)
  const kranKonst = nyG()
  // Fotplattan står på bänkskivans liggande yta (KRAN.y ligger i det bandet).
  kranKonst.ellipse(0, 10, 40, 13).fill({ color: F.morkt, alpha: 0.14 })
  kranKonst.ellipse(0, 6, 38, 12).fill(cylinderFill(F.metall, { axis: 'x' }))
  kranKonst.roundRect(-17, KRAN_TOPP + 8, 34, 66 - 2, 12).fill(cylinderFill(F.metall, { axis: 'y' }))
  // Pipen: en STRUKEN båge, inte ett rör av rektanglar — den ska ha en verklig krök.
  kranKonst.moveTo(0, -54)
    .quadraticCurveTo(2, KRAN_TOPP, 26, KRAN_TOPP + 4)
    .quadraticCurveTo(50, KRAN_TOPP + 8, PIP_X, PIP_Y - 6)
    .stroke({ width: 21, color: F.metallMork, cap: 'round', join: 'round' })
  kranKonst.moveTo(0, -54)
    .quadraticCurveTo(2, KRAN_TOPP, 26, KRAN_TOPP + 4)
    .quadraticCurveTo(50, KRAN_TOPP + 8, PIP_X, PIP_Y - 6)
    .stroke({ width: 15, color: F.metall, cap: 'round', join: 'round' })
  kranKonst.moveTo(2, -54)
    .quadraticCurveTo(4, KRAN_TOPP + 4, 26, KRAN_TOPP + 8)
    .stroke({ width: 4, color: F.metallLjus, alpha: 0.85, cap: 'round' })
  // Mynningen.
  kranKonst.roundRect(PIP_X - 10, PIP_Y - 10, 20, 16, 5).fill(cylinderFill(F.metall, { axis: 'x' }))
  kranKonst.ellipse(PIP_X, PIP_Y + 5, 9, 3.5).fill({ color: F.metallMork })
  kranNod.addChild(kranKonst)

  // Spaken sitter i en EGEN nod så den kan vippa utan att röra resten av kranen.
  const spak = nyC()
  spak.position.set(0, -50)
  const spakG = nyG()
  spakG.roundRect(-6, -30, 12, 32, 6).fill(cylinderFill(F.metall, { axis: 'y' }))
  spakG.roundRect(-7, -36, 26, 12, 6).fill(cylinderFill(F.metall, { axis: 'x' }))
  spakG.circle(14, -30, 4).fill({ color: F.bla, alpha: 0.85 })
  spak.addChild(spakG)
  kranNod.addChild(spak)

  // Droppen som samlas i mynningen (vilorörelsen).
  const dropp = nyG()
  dropp.moveTo(0, -9).quadraticCurveTo(6.5, -1, 5, 3.5)
    .quadraticCurveTo(0, 9, -5, 3.5).quadraticCurveTo(-6.5, -1, 0, -9)
    .fill({ color: F.vatten, alpha: 0.85 })
  dropp.circle(-1.6, -2, 1.8).fill({ color: 0xffffff, alpha: 0.8 })
  dropp.position.set(KRAN.x + PIP_X, KRAN.y + PIP_Y + 8)
  dropp.alpha = 0
  dropp.eventMode = 'none'

  fram.addChild(kranNod, dropp)

  // ==================================================================== HYLLAN ===
  const hylla = nyG()
  // Konsolerna i borstad metall.
  for (const bx of [858, 1180]) {
    hylla.moveTo(bx - 13, HYLLA.y + 4)
      .lineTo(bx + 13, HYLLA.y + 4)
      .lineTo(bx + 13, HYLLA.y + 18)
      .lineTo(bx - 2, HYLLA.y + 52)
      .lineTo(bx - 13, HYLLA.y + 48)
      .closePath()
      .fill(cylinderFill(F.metall, { axis: 'x' }))
    hylla.moveTo(bx - 9, HYLLA.y + 10).lineTo(bx - 1, HYLLA.y + 44)
      .stroke({ width: 2.5, color: F.metallLjus, alpha: 0.8 })
    hylla.circle(bx, HYLLA.y + 46, 3.5).fill({ color: F.metallMork, alpha: 0.7 })
  }
  // Plankans skugga på kaklet.
  hylla.roundRect(HYLLA.v + 10, HYLLA.y + 20, HYLLA.h - HYLLA.v - 20, 16, 8)
    .fill({ color: F.morkt, alpha: 0.1 })
  // Glasplankan: genomskinlig OCH med volym (verticalFillAlpha bär alfan i stoppen —
  // `.fill({color, alpha})` och `.fill(gradient)` utesluter varandra i Pixi).
  hylla.roundRect(HYLLA.v, HYLLA.y, HYLLA.h - HYLLA.v, 18, 7)
    .fill(verticalFillAlpha(F.glas, F.glasMork, 0.62, 0.5))
  hylla.rect(HYLLA.v + 4, HYLLA.y + 1, HYLLA.h - HYLLA.v - 8, 3)
    .fill({ color: 0xffffff, alpha: 0.85 })
  hylla.rect(HYLLA.v + 4, HYLLA.y + 15, HYLLA.h - HYLLA.v - 8, 2)
    .fill({ color: F.glasMork, alpha: 0.6 })
  // Ett par blänk längs kanten, annars läser glaset som plast.
  for (const gx of [HYLLA.v + 90, HYLLA.v + 320, HYLLA.v + 410]) {
    hylla.moveTo(gx, HYLLA.y + 3).lineTo(gx + 26, HYLLA.y + 3)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.7 })
  }
  fram.addChild(hylla)

  // Tuberna och glaset läggs HÄR av index.js — ovanpå plankan, i designkoordinater.
  const hyllPlan = nyC()
  hyllPlan.position.set(0, 0)
  fram.addChild(hyllPlan)

  // ============================================================ LIV + KRAN-API ===

  const allaNoder = [
    bak, fram, vagg, sockel, yta, hoBak, bank, luckor, skal, hoInne, strom, plask,
    hoFram, kranNod, kranKonst, spak, spakG, dropp, hylla, ho, hyllPlan,
    spegel.nod, spegel.reflex, handduk.nod, handduk.inre, handduk.snibb,
  ]

  const livSpec = [
    { n: handduk.inre, bob: 0, sway: 0.016, duration: 4.6 },
    { n: handduk.snibb, bob: 1.6, sway: 0.03, duration: 3.3 },
  ].map((L) => ({ ...L, viloY: L.n.y, viloRot: L.n.rotation }))

  let stromPa = false
  let stromTw = null
  let droppTl = null
  let reflexTw = null

  // Strålen ritas om per bildruta ur en PROXY (aldrig ur en Pixi-egenskap): tre ljusa
  // ådror som vandrar nedåt gör att vattnet RINNER i stället för att stå still.
  const flode = { t: 0 }
  const px = KRAN.x + PIP_X
  const py = KRAN.y + PIP_Y + 6
  // Strålen slutar 16 px UNDER rimlinjen — den sista biten göms av det främre rimmet
  // (`hoFram` ritas efter), vilket är precis hur vatten ser ut när det går ner i en skål.
  const pyBot = BANK_Y + 16
  // Ringen ligger INTE under strålen utan en bit in mot mitten: vid x 268 är skålens
  // synliga inneryta bara ~10 px hög (ellipsens ytterkant), vid x 296 är den ~19 px.
  // Uppmätt ur samma ellips som ritar rimmet, inte gissat.
  const plaskX = 296
  const plaskY = BANK_Y + 8

  function ritaStrom() {
    if (!levande || strom.destroyed) return
    strom.clear()
    const bredd = 13
    strom.moveTo(px - bredd / 2, py)
      .quadraticCurveTo(px - bredd / 2 - 3, (py + pyBot) / 2, px - bredd / 2 - 1, pyBot)
      .lineTo(px + bredd / 2 + 1, pyBot)
      .quadraticCurveTo(px + bredd / 2 + 3, (py + pyBot) / 2, px + bredd / 2, py)
      .closePath()
      .fill(verticalFillAlpha(F.vattenLjus, F.vatten, 0.62, 0.85))
    for (let i = 0; i < 3; i++) {
      const f = ((flode.t + i / 3) % 1)
      const ay = py + f * (pyBot - py)
      const h = 22 - i * 4
      if (ay + h > pyBot) continue
      strom.roundRect(px - 3 + (i - 1) * 3, ay, 3, h, 1.5)
        .fill({ color: 0xffffff, alpha: 0.5 - i * 0.1 })
    }
    strom.circle(px, py + 3, 7).fill({ color: F.vattenLjus, alpha: 0.5 })
  }

  function ritaPlask(f) {
    if (!levande || plask.destroyed) return
    plask.clear()
    const ry = 4 + f * 4
    plask.ellipse(plaskX, plaskY, 14 + f * 20, ry).stroke({ width: 3, color: F.vattenLjus, alpha: 0.7 * (1 - f) })
    plask.ellipse(plaskX, plaskY + 2, 7 + f * 11, ry * 0.55).stroke({ width: 2, color: 0xffffff, alpha: 0.5 * (1 - f) })
  }

  const kran = {
    /**
     * Sätt på/stäng av vattnet. `pa(true)` vippar spaken, tänder strålen (som RINNER —
     * ådrorna vandrar) och lägger en ring i hon; `pa(false)` tonar ut allt igen.
     * Idempotent: två `pa(true)` i rad gör ingenting extra.
     */
    pa(v) {
      const av = !!v
      if (!levande || av === stromPa || strom.destroyed) return
      stromPa = av
      gsap.killTweensOf(strom)
      gsap.killTweensOf(spak)
      if (av) {
        droppTl?.pause()
        gsap.killTweensOf(dropp)
        dropp.alpha = 0
        strom.visible = true
        ritaStrom()
        to(strom, { alpha: 1, duration: 0.16, ease: 'power1.out' })
        to(spak, { rotation: -0.5, duration: 0.22, ease: 'back.out(2)' })
        stromTw?.kill()
        stromTw = to(flode, {
          t: '+=1',
          duration: 0.55,
          repeat: -1,
          ease: 'none',
          onUpdate: ritaStrom,
        })
        // Ringarna i hon pulserar så länge vattnet står på.
        gsap.killTweensOf(plask)
        plask.alpha = 1
        const ring = { f: 0 }
        gsap.killTweensOf(ring)
        to(ring, {
          f: 1,
          duration: 0.85,
          repeat: -1,
          ease: 'none',
          onUpdate: () => ritaPlask(ring.f),
        })
      } else {
        stromTw?.kill()
        stromTw = null
        to(spak, { rotation: 0, duration: 0.3, ease: 'power2.out' })
        to(strom, {
          alpha: 0,
          duration: 0.24,
          ease: 'power1.in',
          onComplete: () => {
            if (!strom.destroyed) {
              strom.visible = false
              strom.clear()
            }
          },
        })
        to(plask, {
          alpha: 0,
          duration: 0.3,
          onComplete: () => { if (!plask.destroyed) plask.clear() },
        })
        if (levande) droppTl?.resume()
      }
    },

    /** Stoppar kranens egna tweens. Bilden rivs av badrummets `destroy()`. */
    destroy() {
      stromTw?.kill()
      stromTw = null
      stromPa = false
      gsap.killTweensOf(flode)
      gsap.killTweensOf(strom)
      gsap.killTweensOf(plask)
      gsap.killTweensOf(spak)
    },
  }

  return {
    bak,
    fram,
    hyllPlan,
    ho,
    kran,

    /**
     * Vilorörelse med EGEN FAS per nod: handduken vaggar på kroken, snibben rör sig i en
     * annan takt, spegeldörrens reflex vandrar långsamt, och en droppe samlas i kranen
     * och faller ner i hon med en liten ring. Kan kallas om — viloläget nollställs först,
     * annars blir det förskjutna värdet ny bas.
     *
     * Ingen av tweenarna får överleva `destroy()`: alla ligger i `tweens`/`droppTl` och
     * dödas där.
     */
    liv() {
      if (!levande) return
      for (const L of livSpec) {
        if (!L.n || L.n.destroyed) continue
        L.n._fxLiv?.kill()
        L.n.y = L.viloY
        L.n.rotation = L.viloRot
        fbLiv(L.n, { bob: L.bob, sway: L.sway, duration: L.duration, phase: Math.random() })
      }

      if (!spegel.reflex.destroyed) {
        reflexTw?.kill()
        gsap.killTweensOf(spegel.reflex)
        spegel.reflex.alpha = 0.1
        reflexTw = to(spegel.reflex, {
          alpha: 0.3,
          duration: 5.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      }

      droppTl?.kill()
      if (dropp.destroyed) return
      gsap.killTweensOf(dropp)
      gsap.killTweensOf(dropp.scale)
      droppTl = gsap.timeline({ repeat: -1, repeatDelay: 2.4 })
      droppTl
        .set(dropp, { x: KRAN.x + PIP_X, y: KRAN.y + PIP_Y + 8, alpha: 0 })
        .set(dropp.scale, { x: 0.25, y: 0.25 })
        .to(dropp, { alpha: 0.9, duration: 0.45, ease: 'power1.out' }, 0)
        .to(dropp.scale, { x: 1, y: 1, duration: 0.95, ease: 'power1.out' }, 0)
        .to(dropp, { y: pyBot - 8, duration: 0.4, ease: 'power2.in' })
        .to(dropp, { alpha: 0, duration: 0.1 }, '-=0.06')
        .add(() => {
          if (!levande || plask.destroyed || stromPa) return
          const ring = { f: 0 }
          plask.alpha = 1
          gsap.killTweensOf(plask)
          to(ring, {
            f: 1,
            duration: 0.7,
            ease: 'power2.out',
            onUpdate: () => ritaPlask(ring.f),
            onComplete: () => { if (!plask.destroyed) plask.clear() },
          })
        })
      if (stromPa) droppTl.pause()
    },

    destroy() {
      levande = false
      kran.destroy()
      droppTl?.kill()
      droppTl = null
      reflexTw = null
      for (const tw of tweens) tw?.kill()
      tweens = []
      gsap.killTweensOf(flode)
      // `killTweensOf(roten)` når BARA roten — handdukens innernod och snibben ligger
      // flera nivåer in och deras `liv()`-tweens överlever annars hela rivningen, tyst.
      for (const n of allaNoder) {
        if (!n) continue
        n._fxLiv?.kill()
        n._fxShakeTw?.kill()
        n._fxPopTl?.kill()
        n._fxWiggleTl?.kill()
        n._fxSquashTl?.kill()
        n._fxHopTl?.kill()
        gsap.killTweensOf(n)
        if (n.scale) gsap.killTweensOf(n.scale)
        if (n.position) gsap.killTweensOf(n.position)
      }
      // Noder som NÅGON ANNAN lagt i hyllplanet eller hon plockas bara loss — badrummet
      // äger dem inte, och en dubbelrivning är precis den sortens tysta fel exit-cykeln
      // annars hittar åt oss.
      if (!hyllPlan.destroyed) hyllPlan.removeChildren()
      if (!ho.destroyed) ho.removeChildren()
      if (!bak.destroyed) bak.destroy({ children: true })
      if (!fram.destroyed) fram.destroy({ children: true })
    },
  }
}

// ------------------------------------------------------------- inredning ---

/**
 * Spegelskåpet på väggen. `x, y` = skåpets övre vänstra hörn, `w, h` dess yttermått.
 * Spegeln är INGEN vit rektangel: en sval lodrät toning, en svag spegling av kaklet
 * bakom betraktaren och två snedställda ljusband. Returnerar noden + reflexbandet
 * (det senare vandrar i `liv()`).
 */
function _spegelskap(x, y, w, h) {
  const nod = nyC()
  const g = nyG()
  // Skuggan mot väggen — utan den är skåpet en dekal.
  g.roundRect(x + 5, y + 8, w, h, 14).fill({ color: 0x2b4a55, alpha: 0.16 })
  // Stommen.
  g.roundRect(x, y, w, h, 14).fill(topLightFill(0xf7f2e6, { highlight: 0.22, dark: 0.16 }))
  g.roundRect(x, y, w, h, 14).stroke({ width: 3, color: 0xcdbfa4, alpha: 0.8 })
  // Spegeldörren.
  const mx = x + 12
  const my = y + 12
  const mw = w - 24
  const mh = h - 24
  g.roundRect(mx, my, mw, mh, 9).fill(verticalFill(F.spegelTopp, F.spegelBotten))
  // Speglingen av kaklet bakom betraktaren: svaga rutor, inte en tapet.
  for (let ry = my + 14; ry < my + mh - 6; ry += 34) {
    g.moveTo(mx + 4, ry).lineTo(mx + mw - 4, ry).stroke({ width: 2, color: 0xffffff, alpha: 0.22 })
  }
  for (let rx = mx + 20; rx < mx + mw - 6; rx += 34) {
    g.moveTo(rx, my + 4).lineTo(rx, my + mh - 4).stroke({ width: 2, color: 0xffffff, alpha: 0.14 })
  }
  // En antydd spegelbild av rummet: en varm strimma nertill (bänkskivan) och en sval
  // klump uppe till höger (kakelbården).
  g.roundRect(mx + 3, my + mh - 34, mw - 6, 31, 6).fill({ color: 0xe8d9b6, alpha: 0.3 })
  g.roundRect(mx + 3, my + 26, mw - 6, 16, 4).fill({ color: F.kakelSval, alpha: 0.24 })
  g.roundRect(mx, my, mw, mh, 9).stroke({ width: 3, color: 0xb9d2d9, alpha: 0.75 })
  // Handtaget på dörrens högra kant.
  g.roundRect(x + w - 20, y + h / 2 - 26, 9, 52, 4.5).fill(cylinderFill(F.metall, { axis: 'y' }))
  g.roundRect(x + w - 19, y + h / 2 - 22, 3, 44, 1.5).fill({ color: 0xffffff, alpha: 0.6 })
  // Undersidans list — skåpet får en tjocklek att kasta skugga från.
  g.roundRect(x + 2, y + h - 6, w - 4, 10, 5).fill({ color: 0xd8c9ab })
  g.rect(x + 6, y + h + 4, w - 12, 5).fill({ color: 0x2b4a55, alpha: 0.14 })
  nod.addChild(g)

  // Reflexbandet ligger i en EGEN nod: `liv()` pulsar dess alfa utan att röra resten.
  const reflex = nyG()
  reflex.poly([mx + 6, my + mh - 10, mx + mw * 0.52, my + 4, mx + mw * 0.78, my + 4, mx + 20, my + mh - 4])
    .fill({ color: 0xffffff, alpha: 0.55 })
  reflex.poly([mx + mw * 0.72, my + mh - 6, mx + mw - 12, my + 6, mx + mw - 4, my + 22, mx + mw * 0.86, my + mh - 4])
    .fill({ color: 0xffffff, alpha: 0.3 })
  reflex.alpha = 0.18
  nod.addChild(reflex)

  return { nod, reflex }
}

/**
 * Handduken på en krok. `x, y` = krokens fästpunkt i väggen; handduken hänger under den
 * och vaggar kring den i `liv()`. Returnerar krok + tygets två svajnoder.
 */
function _handduk(x, y) {
  const nod = nyC()
  nod.position.set(x, y)

  // Kroken sitter i den YTTRE noden så den står still när tyget vaggar.
  const krok = nyG()
  krok.roundRect(-13, -22, 26, 20, 7).fill(cylinderFill(F.metall, { axis: 'x' }))
  krok.circle(-5, -13, 3).fill({ color: F.metallMork, alpha: 0.7 })
  krok.circle(5, -13, 3).fill({ color: F.metallMork, alpha: 0.7 })
  krok.moveTo(0, -4).quadraticCurveTo(0, 12, 13, 12)
    .stroke({ width: 9, color: F.metallMork, cap: 'round' })
  krok.moveTo(0, -4).quadraticCurveTo(0, 10, 11, 10)
    .stroke({ width: 5, color: F.metallLjus, alpha: 0.8, cap: 'round' })
  nod.addChild(krok)

  // Tyget: en inre nod som svajar kring kroken.
  const inre = nyC()
  const w = 44
  const H = 226
  const t = nyG()
  // Bakre halvan, en aning bredare — då läser handduken som VIKT över kroken.
  t.moveTo(-w - 6, 6)
    .lineTo(w + 4, 2)
    .lineTo(w + 12, H - 26)
    .quadraticCurveTo(w * 0.4, H - 6, 0, H - 18)
    .quadraticCurveTo(-w * 0.5, H - 30, -w - 12, H - 14)
    .closePath()
    .fill(verticalFill(F.handdukLjus, F.handdukMork))
  // Främre halvan.
  t.moveTo(-w + 2, 10)
    .lineTo(w - 4, 8)
    .lineTo(w - 2, H - 44)
    .quadraticCurveTo(0, H - 22, -w + 4, H - 36)
    .closePath()
    .fill(verticalFill(F.handduk, shade(F.handduk, 0.16)))
  // Vecken: fyra mjuka linjer som följer fallet.
  for (const [vx, vk] of [[-30, 8], [-8, -4], [16, 6], [36, -6]]) {
    t.moveTo(vx, 16).quadraticCurveTo(vx + vk, H * 0.55, vx + vk * 1.6, H - 52)
      .stroke({ width: 3, color: F.handdukMork, alpha: 0.32 })
  }
  // Två vita band nedtill — en handduk utan bård läser som en filt.
  t.moveTo(-w + 3, H - 92).quadraticCurveTo(0, H - 82, w - 3, H - 90)
    .stroke({ width: 9, color: 0xfff6ee, alpha: 0.9 })
  t.moveTo(-w + 3, H - 74).quadraticCurveTo(0, H - 64, w - 3, H - 72)
    .stroke({ width: 5, color: 0xfff6ee, alpha: 0.7 })
  // Frans i underkanten.
  for (let fx = -w + 6; fx < w - 4; fx += 9) {
    const fy = H - 40 + Math.sin((fx + w) * 0.06) * 7
    t.moveTo(fx, fy).lineTo(fx + 1, fy + 9)
      .stroke({ width: 3, color: F.handdukMork, alpha: 0.5, cap: 'round' })
  }
  t.moveTo(-w - 4, 8).quadraticCurveTo(0, 20, w + 2, 6)
    .stroke({ width: 4, color: 0xffffff, alpha: 0.45 })
  inre.addChild(t)

  // Den lösa snibben hänger i sin egen takt — utan den rör sig hela handduken som EN
  // stel platta och vilorörelsen läser som en glidning.
  const snibb = nyC()
  snibb.position.set(w - 8, H - 66)
  const s = nyG()
  s.moveTo(-14, -8).lineTo(16, -14).quadraticCurveTo(24, 22, 6, 44)
    .quadraticCurveTo(-6, 26, -14, -8)
    .closePath()
    .fill(verticalFill(F.handdukLjus, F.handduk))
  s.moveTo(-8, 0).quadraticCurveTo(6, 18, 4, 38)
    .stroke({ width: 3, color: F.handdukMork, alpha: 0.3 })
  snibb.addChild(s)
  inre.addChild(snibb)

  nod.addChild(inre)
  return { nod, inre, snibb }
}
