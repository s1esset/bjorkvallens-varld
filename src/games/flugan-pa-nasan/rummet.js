// RUMMET — miljön i `flugan-pa-nasan` (sidovy, 1280×720).
//
// SAMMA GREPP SOM `titt-ut-pappa/rummet.js` OCH `vakna-pappa/sovrum.js`: djupet ligger i
// LAGERORDNINGEN, inte i en mask. `bak` (vägg, väggdekor, fönster med öppen båge, gardin,
// stolsrygg) ritas BAKOM ansiktsriggen; `fram` (bordsskivan, fläkten, pappren, kaffekoppen,
// ljuset från fönstret) ritas FRAMFÖR den. Bordsskivans bakkant skär då hans hals av sig
// själv — ingen mask, och riggens `view` behöver aldrig flyttas.
//
// ⚠️ ALLA TAL HÄR ÄR RÄKNADE MOT `index.js` ANS_H = 300, INTE VALDA.
//    Riggens `manifest.ruta` är 733×800 och silhuetten fyller x 158–579, rad 0–94,5 av 100.
//    Vid höjd 300 (`k = 0.375`) betyder det: rutan 275×300 px, men den SYNLIGA pappan bara
//    ~158 px bred, med hjässan **150 px ovanför** riggens mitt och hakan **134 px under**.
//    Med `PLATS.ansikte = (360, 330)` ligger alltså:
//      · hjässan på y 180   · hakan på y 464   · fotorutans RAKA underkant på y 480
//      · synlig bredd x 281–439
//    Därav bordsskivan: `PLATS.bord.y = 472`, alltså
//      · 8 px UNDER hakan          → hela hakan syns, en strimma hals syns (det ska den)
//      · 8 px ÖVER fotots underkant → den raka fotokanten är täckt
//    Det felet kostade en rättning i `vakna-pappa`; ändrar `index.js` sitt `ANS_H` måste
//    BÅDA talen räknas om.
//
// ⚠️ FÖNSTRET ÄR MÅLET OCH MÅSTE LÄSA SOM EN VÄG UT, INTE SOM EN TAVLA. Fyra saker gör
//    det jobbet tillsammans, och ingen av dem räcker ensam:
//      ⓵ SMYGEN — väggens tjocklek ritas som tre inre band (mörk topp, ljus vänster, mörk
//        höger). En ram utan smyg är en tavelram.
//      ⓶ INGET GLAS I ÖPPNINGEN — utsikten ritas rakt av, utan reflexband. Reflexen ligger
//        bara på den ÖPPNA BÅGEN utanför, så skillnaden mellan glas och hål syns i bild.
//      ⓷ BÅGEN PÅ GLÄNT i perspektiv (trapets, smalare bortre kant) utanför högra karmen.
//      ⓸ LJUSET som faller IN — glorja på väggen runt karmen + en varm kil ner över bordet.
//    Öppningen är 300×300 px (x 860–1160, y 76–376). Smygen äter 20 px upptill och till
//    vänster, 14 px till höger: fri sikt ut är 266×280 — långt över kravets 220×220.
//
// ⚠️ FLÄKTENS TRÄFFYTA SÄTTS AV `index.js` (+24 px halo) — KONSTEN OCH TRÄFFYTAN ÄR TVÅ
//    BUDGETAR. Fläktens egen ritade geometri ligger i x 638–762, y 351–555 (lokalt
//    −62…62 / −185…19, fotskuggan inräknad). Med den föreslagna träffytan
//    `Rectangle(-72, -192, 144, 208)` blir halot x 604–796. Inget annat i filen ritar
//    innanför det bandet: pappershögens vänstraste ark börjar på 826 (30 px marginal) och
//    syltburkens fria startyta ligger på 500, 104 px från halots vänsterkant. Ritar du
//    något nytt på bordet: räkna extremvärdet ur GEOMETRIN (bredd/2 + lutning + rotation),
//    inte ur nodens x — den skillnaden var 47 px när högen ritades första gången.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { verticalFill, verticalFillAlpha, topLightFill, cylinderFill, groundFill, sphereFill } from '../../lib/form.js'
import { liv as fbLiv, shake as fbShake } from '../../lib/feedback.js'

// Fönstrets ÖPPNING i absoluta designkoordinater (rektangel, inte mittpunkt).
const FX = 860
const FY = 76
const FW = 300
const FH = 300

// Bordsskivan i sidovy: BAKKANTEN (linjen som skär pappas hals) och FRAMKANTEN. Bandet
// däremellan är den yta föremålen står på; framkanten och sargen göms i `fram`.
const BORD_BAK = 472
const BORD_FRAM = 552
const BORD_KANT = 574   // underkanten på skivans bullnose — sargen börjar här

// Fläktens huvud sitter `HUVUD_Y` px ovanför ankaret (foten på bordet).
const HUVUD_Y = -128

/**
 * Ankarpunkter som `index.js` bygger mot.
 *
 * · `ansikte` — ansiktsriggens MITTPUNKT (`view.position`) när han sitter vid bordet.
 *               Riggen står UPPRÄTT; fotot är ett frontporträtt och roteras aldrig.
 * · `fonster` — den öppna öppningens MITTPUNKT + storlek. (Rektangeln är x−w/2 … x+w/2,
 *               y−h/2 … y+h/2 = x 860–1160, y 76–376.) MÅLET: flugan ska ut här.
 * · `flakt`   — fläktnodens ankare, alltså FOTENS mitt där den står på bordsskivan.
 *               Nodens egen geometri sträcker sig lokalt x −62…62, y −185…19 (fotskuggan
 *               är den bredaste delen, gallret den högsta), så en träffyta på
 *               `Rectangle(-72, -192, 144, 208)` täcker hela fläkten med marginal
 *               (P0: 96 px + 24 px halo ryms).
 * · `sylt`    — syltburkens STARTLÄGE (burkens FOT på bordsskivan). Ingenting ritas här:
 *               ytan är fri 138 px åt höger (till fläktfotens skuggkant på 638) och ända
 *               ut i bild åt vänster.
 * · `bord`    — bordsskivans ovansida (bakkanten). Ett föremål vars fot står på `y` + några
 *               px hamnar visuellt på skivan; fläkt, papper och kopp står på 536–548.
 *
 * KAFFEKOPPEN (som spelet vill kunna landa en fluga i) står inte i `PLATS` eftersom
 * exportlistan är låst, men talen är stabila och ligger i `_kaffekopp()`: fatet på
 * (1110, 542), muggens MYNNING på y 490, fri drop-yta för sylten mellan pappershögen
 * (slutar 985) och fatet (börjar 1060).
 */
export const PLATS = {
  ansikte: { x: 360, y: 330 },
  fonster: { x: FX + FW / 2, y: FY + FH / 2, w: FW, h: FH },
  flakt: { x: 700, y: 536 },
  sylt: { x: 500, y: 540 },
  bord: { y: BORD_BAK },
}

// ------------------------------------------------------------------ palett ---

const F = {
  vaggLjus: 0xeff4de, vagg: 0xcbdda9, vaggRand: 0xe1ecc4, vaggDekor: 0xa9c483,
  list: 0xfbf6e6, listMork: 0xc9bb98,
  tra: 0xcf9556, traLjus: 0xe6b779, traMork: 0x8b5c2f,
  bord: 0xc98a4f, bordTopp: 0xdda96a, bordMork: 0x86532c,
  karm: 0xfcf5e8, karmMork: 0xc0a986,
  himmelTopp: 0x6fc0ef, himmelBotten: 0xe6f5fd,
  kulle: 0x79b26c, kulleMork: 0x4f8656, kulleLjus: 0x9ccb84,
  sol: 0xffd766, solGlod: 0xffeeb2,
  gardin: 0xef968f, gardinLjus: 0xf8bdb6, gardinMork: 0xc1645d,
  stol: 0x7fa6cf, stolMork: 0x50769e, stolLjus: 0xa6c6e4,
  flakt: 0xe6eef1, flaktMork: 0x9fb3bb, flaktBlad: 0xcadfe8, flaktFot: 0x54687a,
  papper: 0xfdf8ec, papperRad: 0x9db4c9, papperMork: 0xd9cfba,
  porslin: 0xfdf9f1, porslinMork: 0xd3c9bb, kaffe: 0x5b3520, kaffeLjus: 0x8a5836,
  band: 0x5f97c9,
  morkt: 0x372d24,
}

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

const kl01 = (v) => (v > 1 ? 1 : v < 0 ? 0 : v || 0)
const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// Deterministisk pseudoslump — tapetens prickar och molnen måste bli IDENTISKA i två
// körningar, annars flaggar baslinjebilderna en diff som ingen har orsakat.
function slumpare(fro) {
  let s = fro >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Träådring: mjuka bågar. En träyta i EN platt ton rankas av `_plattprobe`.
function adring(g, x0, x1, y, n, farg, alpha = 0.24, hopp = 15) {
  for (let i = 0; i < n; i++) {
    const yy = y + i * hopp
    g.moveTo(x0, yy).quadraticCurveTo((x0 + x1) / 2, yy + 4, x1, yy)
      .stroke({ width: 2.5, color: farg, alpha })
  }
}

// ---------------------------------------------------------------- byggaren ---

/**
 * Bygger rummet. Se filhuvudet för kontraktet och `PLATS` för ankarpunkterna.
 *
 * `bak` får `eventMode = 'none'` (ren dekor). `fram` får DÄREMOT INTE det: `eventMode:
 * 'none'` släcker även BARNENS interaktion i Pixi v8, och `flaktNod` bor där. Varje
 * dekorativt barn i `fram` är i stället släckt för sig (via `nyG`/`nyC`), så bara fläkten
 * kan göras träffbar — av den som monterar rummet.
 */
export function byggRum(ctx) {
  const v = ctx?.view || {}
  const x0 = Math.min(-260, (v.left ?? 0) - 140)
  const x1 = Math.max(1280 + 260, (v.right ?? 1280) + 140)
  const yTop = Math.min(-160, (v.top ?? 0) - 120)
  const yBot = Math.max(720 + 180, (v.bottom ?? 720) + 140)

  const bak = new Container()
  const fram = new Container()
  bak.eventMode = 'none'
  bak.interactiveChildren = false
  fram.eventMode = 'passive'

  const tweens = []
  const to = (mal, vars) => {
    const tw = gsap.to(mal, vars)
    tweens.push(tw)
    return tw
  }

  // ================================================================= VÄGGEN ===
  // Väggen går hela vägen ner till `yBot`; bordsskivan i `fram` täcker allt under 472, så
  // en golvlinje skulle ändå aldrig synas — och en synlig skarv vägg/golv bakom ett bord
  // som fyller framkanten läser som ett fel.
  const vagg = nyG()
  vagg.rect(x0, yTop, x1 - x0, yBot - yTop).fill(verticalFill(F.vaggLjus, F.vagg))
  // Breda tapetränder: väggen är bildens största sammanhängande yta och skulle annars ligga
  // i EN ton (`_plattprobe` rankar precis sådana).
  for (let x = -420; x < 1740; x += 80) {
    vagg.rect(x, yTop, 38, yBot - yTop).fill({ color: F.vaggRand, alpha: 0.4 })
  }
  // Tapetmönster: små körsbärskvistar i ett förskjutet rutnät. Deterministiskt.
  for (let ry = yTop + 50, rad = 0; ry < BORD_BAK + 40; ry += 90, rad++) {
    for (let rx = -400 + (rad % 2) * 40; rx < 1740; rx += 80) {
      vagg.moveTo(rx, ry + 9).quadraticCurveTo(rx + 3, ry, rx - 2, ry - 9)
        .stroke({ width: 2.5, color: F.vaggDekor, alpha: 0.55 })
      vagg.ellipse(rx - 9, ry - 2, 7, 4.2).fill({ color: F.vaggDekor, alpha: 0.5 })
      vagg.ellipse(rx + 8, ry + 4, 7, 4.2).fill({ color: F.vaggDekor, alpha: 0.4 })
      vagg.circle(rx - 3, ry - 12, 3.2).fill({ color: 0xe89a9a, alpha: 0.6 })
    }
  }
  // Taklist högt upp — ovanför både hjässan (180) och fönsterkarmen (52).
  vagg.rect(x0, 20, x1 - x0, 10).fill(topLightFill(F.list))
  vagg.rect(x0, 30, x1 - x0, 5).fill({ color: F.listMork, alpha: 0.5 })
  bak.addChild(vagg)

  // ============================================================== VÄGGDEKOR ===
  // ⚠️ DE TVÅ FRIA VÄGGYTORNA ÄR SMALARE ÄN DE SER UT. Stolsryggen (x 207–513) ritas EFTER
  //    väggdekoren och skulle svälja allt som hamnar under 513 — klockan stod först på 520
  //    och låg då till 35 px bakom ryggen. Kvar är: x 88–172 (till vänster om stolen) och
  //    x 604–776 (mellan stolen och fönstrets foder på 836). Tavlan ligger dessutom 86 px
  //    ovanför fläktens gallerkant (352), så inget föremål på bordet rör den.
  bak.addChild(_klocka(130, 220), _tavla(690, 200))

  // =============================================================== FÖNSTRET ===
  const fonster = nyC()

  // Ljuset som strömmar IN: fyra ringar med fallande alfa runt karmen. Utan dem hänger
  // öppningen som en lapp på tapeten i stället för att lysa upp väggen omkring sig.
  for (let i = 0; i < 4; i++) {
    const m = 26 + i * 32
    const ring = nyG()
    ring.roundRect(FX - m, FY - m, FW + m * 2, FH + m * 2, 24 + m * 0.5)
      .fill({ color: 0xfff6d8, alpha: 0.2 - i * 0.042 })
    fonster.addChild(ring)
  }

  // --- UTSIKTEN ------------------------------------------------------------
  // Maskad till öppningen, annars rinner kullarna ut över karmen och lägger sig som gröna
  // klumpar på tapeten (exakt det felet fanns i `titt-ut-pappa` innan masken kom dit).
  const ute = nyC()
  const rnd = slumpare(20260816)

  const himmel = nyG()
  himmel.rect(FX, FY, FW, FH).fill(verticalFill(F.himmelTopp, F.himmelBotten))
  ute.addChild(himmel)

  const sol = nyG()
  for (let i = 0; i < 4; i++) {
    sol.circle(FX + 230, FY + 60, 30 + i * 15).fill({ color: F.solGlod, alpha: 0.2 - i * 0.045 })
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    sol.moveTo(FX + 230 + Math.cos(a) * 31, FY + 60 + Math.sin(a) * 31)
      .lineTo(FX + 230 + Math.cos(a) * 44, FY + 60 + Math.sin(a) * 44)
      .stroke({ width: 5, color: F.solGlod, alpha: 0.8 })
  }
  sol.circle(FX + 230, FY + 60, 28).fill(sphereFill(F.sol, { highlight: 0.4, dark: 0.2 }))
  ute.addChild(sol)

  // Moln: fyra puffar styck, varje puff en egen ellips så `form.js` normaliserar gradienten
  // per puff och molnet läser som klot i stället för som en klump.
  const moln = nyG()
  for (const [mx, my, ms] of [[FX + 74, FY + 52, 1], [FX + 176, FY + 118, 0.72], [FX + 264, FY + 150, 0.6]]) {
    for (const [dx, dy, r] of [[-30, 4, 22], [-4, -8, 27], [23, 2, 20], [44, 8, 14]]) {
      moln.ellipse(mx + dx * ms, my + dy * ms, r * ms, r * ms * 0.72)
        .fill({ color: 0xffffff, alpha: 0.92 })
    }
  }
  ute.addChild(moln)

  // Fåglar: tre streck i par. De säger "därute" på ett sätt ingen kulle gör.
  const faglar = nyG()
  for (const [bx, by, bs] of [[FX + 96, FY + 128, 1], [FX + 138, FY + 108, 0.76], [FX + 62, FY + 158, 0.62]]) {
    faglar.moveTo(bx - 13 * bs, by).quadraticCurveTo(bx - 6 * bs, by - 8 * bs, bx, by - 1 * bs)
      .quadraticCurveTo(bx + 6 * bs, by - 8 * bs, bx + 13 * bs, by)
      .stroke({ width: 2.6 * bs, color: 0x4b6a80, alpha: 0.7 })
  }
  ute.addChild(faglar)

  // Kullar + träd + gräsplan i öppningens nederkant: en horisont gör hålet till en PLATS
  // man kan flyga ut till.
  const mark = nyG()
  mark.ellipse(FX + 44, FY + FH - 66, 130, 54).fill(F.kulleLjus)
  mark.ellipse(FX + 236, FY + FH - 58, 138, 48).fill(F.kulle)
  mark.ellipse(FX + 146, FY + FH - 84, 84, 32).fill({ color: F.kulleMork, alpha: 0.9 })
  for (const [tx, ty, ts] of [[FX + 62, FY + FH - 96, 1], [FX + 214, FY + FH - 88, 0.82]]) {
    mark.roundRect(tx - 5 * ts, ty, 10 * ts, 40 * ts, 4).fill(cylinderFill(0x8a5f38))
    mark.circle(tx - 14 * ts, ty - 6 * ts, 20 * ts).fill(topLightFill(F.kulleMork))
    mark.circle(tx + 13 * ts, ty - 2 * ts, 18 * ts).fill(topLightFill(F.kulle))
    mark.circle(tx, ty - 22 * ts, 23 * ts).fill(topLightFill(F.kulleLjus))
  }
  mark.rect(FX, FY + FH - 46, FW, 48).fill(groundFill(F.kulle, { light: 0.2, dark: 0.22 }))
  for (let i = 0; i < 26; i++) {
    const gx = FX + 6 + rnd() * (FW - 12)
    const gy = FY + FH - 40 + rnd() * 34
    mark.moveTo(gx, gy).lineTo(gx + 2, gy - 8 - rnd() * 6)
      .stroke({ width: 2.4, color: F.kulleLjus, alpha: 0.6 })
  }
  ute.addChild(mark)

  const uteMask = nyG()
  uteMask.roundRect(FX, FY, FW, FH, 6).fill(0xffffff)
  ute.mask = uteMask
  fonster.addChild(ute, uteMask)

  // --- SMYGEN (väggens tjocklek) -------------------------------------------
  // ⓵ i filhuvudet. Tre band längs öppningens insida: mörkt uppe (ljuset kommer utifrån
  // och nedifrån), ljust till vänster (solen står till höger), mörkt till höger.
  const smygG = nyG()
  smygG.rect(FX, FY, FW, 20).fill(verticalFillAlpha(0x6f5f47, 0xbdaa8a, 0.85, 0.5))
  smygG.rect(FX, FY, 20, FH).fill(verticalFillAlpha(0xfdf6e4, 0xe6d7ba, 0.9, 0.7))
  smygG.rect(FX + FW - 14, FY, 14, FH).fill(verticalFillAlpha(0x8a7757, 0xc2b092, 0.7, 0.45))
  fonster.addChild(smygG)

  // --- ÖPPEN BÅGE ----------------------------------------------------------
  // ⓷ i filhuvudet. Trapets: gångjärnskanten (lokal x 0) är full höjd, den bortre kanten
  // (lokal x 90) är kortare och lyft — det är perspektivet som säger att bågen står UT ur
  // väggen. Geometrin är bakad relativt gångjärnet så `liv()` kan svaja den kring det.
  const bageNod = nyC()
  const bageG = nyG()
  bageG.moveTo(0, -150).lineTo(90, -112).lineTo(90, 114).lineTo(0, 152).closePath()
    .fill(topLightFill(F.karm, { highlight: 0.2, dark: 0.22 }))
    .stroke({ width: 4, color: F.karmMork })
  bageG.moveTo(11, -128).lineTo(79, -96).lineTo(79, 98).lineTo(11, 130).closePath()
    .fill(verticalFillAlpha(0xcfeaf8, 0xf2fbff, 0.72, 0.5))
    .stroke({ width: 3, color: F.karmMork, alpha: 0.6 })
  // Reflexbandet ligger BARA här — det är det som skiljer glaset i bågen från hålet i
  // väggen (⓶ i filhuvudet).
  bageG.moveTo(18, 118).lineTo(48, -110).lineTo(66, -102).lineTo(36, 108).closePath()
    .fill({ color: 0xffffff, alpha: 0.34 })
  bageG.moveTo(58, 96).lineTo(72, -94).lineTo(78, -92).lineTo(64, 94).closePath()
    .fill({ color: 0xffffff, alpha: 0.22 })
  // Handtag på den bortre stilen. ⚠️ Det sitter INÅT med flit: bågens gångjärn ligger på
  //    x 1172 och varje px handtag utanför lokal x 98 hamnar bortom designytans 1280.
  bageG.roundRect(74, -14, 18, 10, 5).fill(cylinderFill(F.flaktMork, { axis: 'x' }))
  bageG.circle(92, -9, 6).fill(sphereFill(0xe8c86a))
  bageNod.addChild(bageG)
  bageNod.position.set(FX + FW + 12, FY + FH / 2)
  fonster.addChild(bageNod)

  // --- KARM + FÖNSTERBRÄDA -------------------------------------------------
  const karm = nyG()
  karm.roundRect(FX - 11, FY - 11, FW + 22, FH + 22, 8)
    .stroke({ width: 22, color: F.karm, alignment: 0.5 })
  karm.roundRect(FX - 24, FY - 24, FW + 48, FH + 48, 10)
    .stroke({ width: 5, color: F.karmMork, alpha: 0.65 })
  karm.roundRect(FX - 2, FY - 2, FW + 4, FH + 4, 5)
    .stroke({ width: 3, color: F.karmMork, alpha: 0.5 })
  // Gångjärn på högra karmen — bågen ska sitta fast i något.
  for (const hy of [FY + 54, FY + FH - 54]) {
    karm.roundRect(FX + FW + 6, hy - 11, 18, 22, 6).fill(cylinderFill(F.flaktMork, { axis: 'x' }))
      .stroke({ width: 2, color: 0x6d7f88 })
  }
  // Fönsterbräda med underrede: överhäng framåt + två konsoler + slagskugga.
  karm.roundRect(FX - 46, FY + FH + 12, FW + 92, 24, 8).fill(topLightFill(F.karm, { highlight: 0.22, dark: 0.18 }))
    .stroke({ width: 3, color: F.karmMork })
  karm.rect(FX - 46, FY + FH + 12, FW + 92, 6).fill({ color: 0xffffff, alpha: 0.45 })
  for (const kx of [FX + 40, FX + FW - 40]) {
    karm.moveTo(kx - 16, FY + FH + 36).lineTo(kx + 16, FY + FH + 36)
      .lineTo(kx + 6, FY + FH + 60).lineTo(kx - 6, FY + FH + 60).closePath()
      .fill(topLightFill(F.karm, { dark: 0.24 })).stroke({ width: 2.5, color: F.karmMork, alpha: 0.7 })
  }
  karm.rect(FX - 46, FY + FH + 36, FW + 92, 10).fill(verticalFillAlpha(F.morkt, F.morkt, 0.18, 0))
  fonster.addChild(karm)

  // --- GARDIN --------------------------------------------------------------
  // Stången ligger FRAMFÖR karmen; våden hänger till vänster och täcker bara 18 px av
  // öppningen — målet får inte skymmas.
  const stang = nyG()
  stang.roundRect(FX - 60, 38, FW + 120, 14, 7).fill(cylinderFill(F.tra, { axis: 'x' }))
  stang.circle(FX - 66, 45, 12).fill(sphereFill(F.tra))
  stang.circle(FX + FW + 66, 45, 12).fill(sphereFill(F.tra))
  fonster.addChild(stang)

  // Två noder: den YTTRE kickas av `blas()`, den INRE svajar i `liv()`. `fbLiv` äger
  // målets `y` och `rotation` — samma nod kan alltså inte bära båda rörelserna.
  const gardinNod = nyC()
  const gardinInre = nyC()
  const gardinG = nyG()
  gardinG.moveTo(-48, 0).lineTo(44, 0).lineTo(52, 300)
    .quadraticCurveTo(22, 330, -8, 306)
    .quadraticCurveTo(-34, 286, -56, 312)
    .closePath()
    .fill(topLightFill(F.gardin, { highlight: 0.32, dark: 0.24 }))
  // Veck: lodräta band i två toner — det är de som ger tyget volym.
  for (let i = 0; i < 4; i++) {
    const t = (i + 0.5) / 4
    const xx = -48 + 92 * t
    gardinG.moveTo(xx, 6).quadraticCurveTo(xx + 7, 160, xx + 3, 306)
      .stroke({ width: 11, color: i % 2 ? F.gardinMork : F.gardinLjus, alpha: 0.3 })
  }
  // Vita prickar — mönstret gör våden till ett TYG och inte till en färgad remsa.
  for (let r = 0; r < 8; r++) {
    for (let k = 0; k < 3; k++) {
      const px = -36 + k * 30 + (r % 2) * 15
      const py = 30 + r * 34
      gardinG.circle(px, py, 4.6).fill({ color: 0xffffff, alpha: 0.55 })
    }
  }
  gardinG.roundRect(-54, -8, 106, 20, 9).fill(cylinderFill(F.gardin, { axis: 'x' }))
    .stroke({ width: 3, color: F.gardinMork, alpha: 0.6 })
  gardinInre.addChild(gardinG)
  gardinNod.addChild(gardinInre)
  gardinNod.position.set(FX - 22, 52)
  fonster.addChild(gardinNod)

  bak.addChild(fonster)

  // ============================================================== STOLSRYGG ===
  // Den enda saken som säger att han SITTER. Ryggen är bredare än den synliga pappan
  // (281–439) med 68 px på varje sida, så den syns som en ryggstödsram omkring honom i
  // stället för som två öron.
  const stol = nyG()
  stol.roundRect(216, 300, 288, 200, 22).fill({ color: F.morkt, alpha: 0.12 })
  stol.moveTo(213, 500).lineTo(213, 340)
    .quadraticCurveTo(213, 296, 262, 294).lineTo(458, 294)
    .quadraticCurveTo(507, 296, 507, 340).lineTo(507, 500).closePath()
    .fill(verticalFill(F.stolLjus, F.stolMork))
  stol.moveTo(231, 500).lineTo(231, 346)
    .quadraticCurveTo(231, 312, 268, 310).lineTo(452, 310)
    .quadraticCurveTo(489, 312, 489, 346).lineTo(489, 500).closePath()
    .fill(topLightFill(F.stol, { highlight: 0.24, dark: 0.24 }))
  // Tre spjälor + en tvärslå: en målad köksstol, inte en blå platta.
  for (const sx of [287, 360, 433]) {
    stol.roundRect(sx - 11, 330, 22, 160, 10).fill({ color: F.stolMork, alpha: 0.3 })
    stol.roundRect(sx - 8, 334, 6, 150, 3).fill({ color: 0xffffff, alpha: 0.28 })
  }
  stol.roundRect(225, 400, 270, 18, 9).fill(cylinderFill(F.stolLjus, { axis: 'x' }))
  stol.roundRect(207, 288, 306, 22, 11).fill(cylinderFill(F.stolLjus, { axis: 'x' }))
    .stroke({ width: 3, color: F.stolMork, alpha: 0.7 })
  bak.addChild(stol)

  // ========================================================= FRAM: BORDET ===
  //
  // Bordsskivans BAKKANT (472) är linjen som skär pappas hals — se filhuvudet. Skivan går
  // hela vägen ut i bild åt båda håll; ett bord med synliga kortändor mitt i rutan skulle
  // lämna en glipa där fotots underkant kikar fram.
  const bordSkiva = nyG()
  bordSkiva.rect(x0, BORD_BAK, x1 - x0, BORD_FRAM - BORD_BAK)
    .fill(groundFill(F.bordTopp, { light: 0.15, dark: 0.24 }))
  // Bräder i perspektiv mot en flyktpunkt ovanför skivan: linjerna glesnar neråt och ytan
  // läser som ett PLAN i stället för som en färgad remsa.
  const vpx = 640
  const vpy = 250
  for (let px = -1500; px <= 2800; px += 118) {
    const k = (BORD_FRAM - vpy) / (BORD_BAK - vpy)
    bordSkiva.moveTo(px, BORD_BAK).lineTo(vpx + (px - vpx) * k, BORD_FRAM)
      .stroke({ width: 2.5, color: F.bordMork, alpha: 0.22 })
  }
  adring(bordSkiva, x0 + 20, x1 - 20, BORD_BAK + 22, 3, F.bordMork, 0.16, 20)
  bordSkiva.rect(x0, BORD_BAK, x1 - x0, 5).fill({ color: 0xffffff, alpha: 0.4 })
  // Bullnose-kant + sarg. Sargen är hel (inga synliga ben) med flit: ett ben skulle lämna
  // en glipa i bildens nederkant.
  bordSkiva.roundRect(x0, BORD_FRAM, x1 - x0, BORD_KANT - BORD_FRAM + 4, 9)
    .fill(cylinderFill(F.bordTopp, { axis: 'x' }))
  bordSkiva.rect(x0, BORD_KANT, x1 - x0, yBot - BORD_KANT).fill(verticalFill(F.bord, F.bordMork))
  adring(bordSkiva, x0 + 20, x1 - 20, BORD_KANT + 26, 6, F.bordMork, 0.2, 22)
  for (let dx = -320; dx < x1; dx += 320) {
    bordSkiva.roundRect(dx + 20, BORD_KANT + 24, 280, 74, 9).fill({ color: 0xffffff, alpha: 0.09 })
      .stroke({ width: 3, color: 0x71441f, alpha: 0.45 })
  }
  bordSkiva.rect(x0, BORD_KANT, x1 - x0, 5).fill({ color: F.morkt, alpha: 0.22 })
  fram.addChild(bordSkiva)

  // ================================================== FRAM: KAFFEKOPPEN ===
  const kopp = _kaffekopp(1110, 542)
  fram.addChild(kopp.nod)

  // ==================================================== FRAM: PAPPREN ===
  // Fyra ark i en slarvig hög. Varje ark är TVÅ noder: den yttre flaxar i `papper()`, den
  // inre andas i `liv()` — `fbLiv` äger `y` och `rotation` och kan inte dela nod med en
  // flaxtween.
  const papperL = nyC()
  const arkNoder = []
  const arkInre = []
  // ⚠️ ARKENS BREDD ÄR MÄTT MOT FLÄKTENS TRÄFFYTA, INTE VALD EFTER ÖGAT. Högen låg först på
  //    152–158 px breda ark kring x 900, och det vänstra arket nådde då x 795 — INNANFÖR
  //    fläktens halo (den föreslagna träffytan −72…72 kring x 700 ger 628–772, +24 px halo
  //    = 604–796). Ett tryck avsett för fläkten hade landat ovanpå ritat papper. Med de här
  //    talen ligger högens vänstraste punkt på x 826, alltså 30 px utanför halot, och den
  //    högraste på 985 — 75 px från kaffefatets vänsterkant (1060). (Uppmätt ur geometrin,
  //    inte skattat: rotationen ensam flyttar hörnen 2–3 px.)
  const arkSpec = [
    [-16, 6, -0.05, 118, 40],
    [10, 1, 0.07, 112, 38],
    [-4, -8, -0.02, 124, 42],
    [18, -15, 0.11, 106, 36],
  ]
  arkSpec.forEach(([dx, dy, rot, aw, ah], i) => {
    const yttre = nyC()
    const inre = nyC()
    const g = nyG()
    // Arket ligger på bordet och ses i perspektiv: ett parallellogram, inte en rektangel.
    const lut = 12
    g.moveTo(-aw / 2 + lut, -ah / 2).lineTo(aw / 2 + lut, -ah / 2)
      .lineTo(aw / 2, ah / 2).lineTo(-aw / 2, ah / 2).closePath()
      .fill(topLightFill(F.papper, { highlight: 0.14, dark: 0.14 }))
      .stroke({ width: 2, color: F.papperMork, alpha: 0.7 })
    for (let r = 0; r < 4; r++) {
      const ly = -ah / 2 + 10 + r * 9
      const skift = lut * (1 - (ly + ah / 2) / ah)
      g.moveTo(-aw / 2 + 14 + skift, ly).lineTo(aw / 2 - 16 + skift, ly)
        .stroke({ width: 2.4, color: F.papperRad, alpha: 0.55 - r * 0.06 })
    }
    inre.addChild(g)
    yttre.addChild(inre)
    yttre.position.set(900 + dx, 546 + dy)
    yttre.rotation = rot
    papperL.addChild(yttre)
    arkNoder.push({ n: yttre, viloY: yttre.y, viloRot: rot, i })
    arkInre.push(inre)
  })
  // Slagskuggan under högen ligger UNDER arken och rör sig aldrig — den håller kvar högen
  // på bordet när arken flaxar.
  const papperSkugga = nyG()
  papperSkugga.ellipse(902, 564, 78, 13).fill({ color: F.morkt, alpha: 0.16 })
  fram.addChild(papperSkugga, papperL)

  // ===================================================== FRAM: FLÄKTEN ===
  //
  // `flaktNod` är noden `index.js` sätter träffytan på — DEN FÅR ALDRIG ANIMERAS. Allt som
  // rör sig ligger i `flaktInre` (och dess barn), annars flyttar sig träffytan mitt i ett
  // tryck. Ankarpunkten är fotens mitt på bordsskivan.
  const flaktNod = new Container()
  flaktNod.position.set(PLATS.flakt.x, PLATS.flakt.y)
  const flaktInre = nyC()
  flaktNod.addChild(flaktInre)

  const flaktKropp = nyG()
  flaktKropp.ellipse(0, 6, 62, 13).fill({ color: F.morkt, alpha: 0.2 })
  // Fot: en tung platta med gummikant.
  flaktKropp.roundRect(-54, -18, 108, 24, 11).fill(topLightFill(F.flakt, { highlight: 0.3, dark: 0.22 }))
    .stroke({ width: 3, color: F.flaktMork })
  flaktKropp.roundRect(-56, -2, 112, 10, 5).fill(cylinderFill(F.flaktFot, { axis: 'x' }))
  flaktKropp.roundRect(-40, -14, 34, 8, 4).fill({ color: 0xffffff, alpha: 0.4 })
  // Vridknapp på foten — en fläkt har alltid en.
  flaktKropp.circle(34, -6, 8).fill(sphereFill(F.flaktFot))
  flaktKropp.moveTo(34, -6).lineTo(38, -12).stroke({ width: 2.5, color: 0xffffff, alpha: 0.7 })
  // Stativ.
  flaktKropp.roundRect(-9, -112, 18, 96, 9).fill(cylinderFill(F.flakt))
    .stroke({ width: 2.5, color: F.flaktMork, alpha: 0.6 })
  flaktKropp.roundRect(-14, -78, 28, 9, 4).fill(cylinderFill(F.flaktMork, { axis: 'x' }))
  flaktInre.addChild(flaktKropp)

  // Huvudet: allt som lutar mot blåsriktningen. Geometrin är bakad CENTRERAD kring (0,0)
  // så rotationen sker kring nav-axeln.
  const huvud = nyC()
  huvud.position.set(0, HUVUD_Y)

  // Vindkonen ligger FÖRST i huvudet (bakom bladen) och speglas med scale.x. Den föds
  // osynlig, så spegelvändningen syns aldrig som ett hopp.
  const kon = nyC()
  const konG = nyG()
  konG.moveTo(26, -24)
    .quadraticCurveTo(104, -58, 172, -46)
    .quadraticCurveTo(132, 0, 172, 46)
    .quadraticCurveTo(104, 58, 26, 24)
    .closePath()
    .fill(verticalFillAlpha(0xffffff, 0xbfe4fb, 0.3, 0.14))
  for (let i = 0; i < 3; i++) {
    const r = 52 + i * 40
    konG.moveTo(r * 0.62, -r * 0.42)
      .quadraticCurveTo(r * 1.02, 0, r * 0.62, r * 0.42)
      .stroke({ width: 8 - i * 1.6, color: 0xeaf8ff, alpha: 0.5 - i * 0.1 })
  }
  kon.addChild(konG)
  kon.alpha = 0
  huvud.addChild(kon)

  const bakskal = nyG()
  bakskal.circle(0, 0, 54).fill(topLightFill(F.flaktMork, { highlight: 0.2, dark: 0.3 }))
  huvud.addChild(bakskal)

  // Bladen: fyra svepta vingar i en egen nod som SNURRAR.
  const blad = nyC()
  const bladG = nyG()
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const px = (r, t) => ca * r - sa * t
    const py = (r, t) => sa * r + ca * t
    bladG.moveTo(px(10, -7), py(10, -7))
      .quadraticCurveTo(px(30, -26), py(30, -26), px(45, -6), py(45, -6))
      .quadraticCurveTo(px(32, 16), py(32, 16), px(11, 8), py(11, 8))
      .closePath()
      .fill(topLightFill(i % 2 ? F.flaktBlad : 0xdcecf3, { highlight: 0.26, dark: 0.2 }))
      .stroke({ width: 2, color: F.flaktMork, alpha: 0.55 })
  }
  blad.addChild(bladG)
  huvud.addChild(blad)

  // Gallret ritas EFTER bladen: ringar och ekrar i enbart stroke, så bladen syns igenom.
  const galler = nyG()
  for (const r of [17, 27, 37, 46]) {
    galler.circle(0, 0, r).stroke({ width: 2.4, color: F.flakt, alpha: 0.85 })
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    galler.moveTo(Math.cos(a) * 12, Math.sin(a) * 12)
      .lineTo(Math.cos(a) * 52, Math.sin(a) * 52)
      .stroke({ width: 2.2, color: F.flakt, alpha: 0.7 })
  }
  galler.circle(0, 0, 53).stroke({ width: 7, color: F.flakt })
  galler.circle(0, 0, 53).stroke({ width: 2.5, color: F.flaktMork, alpha: 0.55 })
  galler.circle(0, 0, 12).fill(sphereFill(F.flakt, { highlight: 0.4, dark: 0.24 }))
    .stroke({ width: 2.5, color: F.flaktMork, alpha: 0.6 })
  galler.arc(0, 0, 46, Math.PI * 1.15, Math.PI * 1.62)
    .stroke({ width: 6, color: 0xffffff, alpha: 0.45 })
  huvud.addChild(galler)

  flaktInre.addChild(huvud)
  fram.addChild(flaktNod)

  // ================================================ FRAM: LJUSET IN ===
  // ⓸ i filhuvudet: en varm kil från öppningen ner över bordet. Polygonens vänsterkant
  // stannar på x 744 i nederkanten — den når ALDRIG pappas ansikte (281–439). En gul
  // hinna över fotot gör honom sjuk i ansiktsfärgen (uppmätt i `vakna-pappa`).
  const kil = nyG()
  kil.moveTo(FX + 14, FY + 20).lineTo(FX + FW - 10, FY + 20)
    .lineTo(1290, yBot).lineTo(744, yBot).closePath()
    .fill(verticalFillAlpha(0xfff3c8, 0xfff3c8, 0.28, 0))
  fram.addChild(kil)

  // ================================================== LIV + TILLSTÅND ===

  let levande = true

  // Vilolägen läses EN gång, innan någon rörelse startat.
  const livSpec = [
    { n: gardinInre, bob: 0, sway: 0.02, duration: 3.7 },
    { n: bageNod, bob: 0, sway: 0.009, duration: 5.4 },
    ...kopp.angaNoder.map((n, i) => ({ n, bob: 8 + i * 4, sway: 0.06, duration: 2.6 + i * 0.6 })),
    ...arkInre.map((n, i) => ({ n, bob: 1.4, sway: 0.006, duration: 4.2 + i * 0.5 })),
  ].map((L) => ({ ...L, viloY: L.n.y, viloRot: L.n.rotation }))

  const allaNoder = [
    bak, fram, fonster, ute, flaktNod, flaktInre, huvud, blad, kon, galler,
    gardinNod, gardinInre, bageNod, papperL, papperSkugga, kil,
    ...arkNoder.map((a) => a.n), ...arkInre, kopp.nod, ...kopp.angaNoder,
  ]

  let bladTw = null
  let konTw = null

  // Flaxen bor i en LOKAL funktion, inte bara som metod: `blas()` behöver den, och en
  // anropare som plockar isär objektet (`const { blas } = rum`) skulle annars tappa `this`
  // och få en pust utan papper — tyst, utan konsolfel.
  function flaxa() {
    if (!levande) return
    for (const a of arkNoder) {
      if (!a.n || a.n.destroyed) continue
      // Nollställ mot VILOLÄGET, aldrig mot det förskjutna: två flax i rad skulle annars
      // ta det halvlyfta arket som ny bas och högen vandrar iväg över en omgång.
      gsap.killTweensOf(a.n)
      a.n.y = a.viloY
      a.n.rotation = a.viloRot
      const upp = 10 + a.i * 5
      to(a.n, {
        y: a.viloY - upp,
        rotation: a.viloRot + (a.i % 2 ? 0.16 : -0.13),
        duration: 0.18,
        delay: a.i * 0.05,
        ease: 'power2.out',
        onComplete: () => {
          if (!levande || a.n.destroyed) return
          to(a.n, { y: a.viloY, rotation: a.viloRot, duration: 0.62, ease: 'elastic.out(1, 0.62)' })
        },
      })
    }
  }

  return {
    bak,
    fram,
    flaktNod,

    /**
     * FLÄKTENS PUST. `riktning` −1 (mot vänster) … 1 (mot höger); beloppet är styrkan.
     *
     * Fyra saker händer samtidigt och de är alla samma händelse: bladen SNURRAR UPP (och
     * varvar ner igen — `power2.out`, aldrig en konstant rotation som skulle löpa vidare
     * efter pusten), huvudet lutar en aning åt hållet, en genomskinlig VINDKON far ut ur
     * gallret, och pappren flaxar. Anropas högst var 2:a sekund av spelet.
     *
     * Konen speglas med `scale.x` medan den ligger på alfa 0 — spegelvändningen syns
     * alltså aldrig som ett hopp. Returnerar konens tween (den längst levande av de fyra).
     */
    blas(riktning) {
      if (!levande || flaktNod.destroyed) return null
      const d = klamp(typeof riktning === 'number' ? riktning : 1, -1, 1)
      const s = d < 0 ? -1 : 1
      const kraft = 0.45 + 0.55 * Math.abs(d)

      // Bladen: absolut målvinkel ur NUVARANDE läge, och den gamla tweenen dödas först —
      // två tweens på samma `rotation` slåss annars och varvtalet blir slumpmässigt.
      bladTw?.kill()
      bladTw = to(blad, {
        rotation: blad.rotation + Math.PI * 9 * kraft * s,
        duration: 1.05,
        ease: 'power2.out',
        onComplete: () => {
          // Håll vinkeln liten — den växer annars obegränsat över en hel omgång.
          if (!blad.destroyed) blad.rotation %= Math.PI * 2
        },
      })

      // Huvudet lutar mot blåsriktningen och rätar upp sig.
      gsap.killTweensOf(huvud)
      to(huvud, {
        rotation: s * 0.15 * kraft,
        duration: 0.14,
        ease: 'power2.out',
        onComplete: () => {
          if (!levande || huvud.destroyed) return
          to(huvud, { rotation: 0, duration: 0.6, ease: 'power2.inOut' })
        },
      })

      // Rekylen i hela fläkten — den lilla darrning en riktig bordsfläkt har.
      fbShake(flaktInre, { intensity: 3, duration: 0.3 })

      // Vindkonen.
      konTw?.kill()
      gsap.killTweensOf(kon)
      gsap.killTweensOf(kon.scale)
      kon.scale.set(s * 0.5, 0.62)
      kon.position.set(0, 0)
      kon.alpha = 0
      to(kon.scale, { x: s * (0.9 + 0.35 * kraft), y: 1.05, duration: 0.5, ease: 'power2.out' })
      // Uppgången slutar EXAKT när uttoningen börjar (0,10 s = utfasningens `delay`) — två
      // överlappande tweens på samma `alpha` skriver annars i mun på varandra.
      to(kon, { alpha: 0.85, duration: 0.1, ease: 'power1.out' })
      konTw = to(kon, {
        x: s * 130 * kraft,
        alpha: 0,
        duration: 0.62,
        delay: 0.1,
        ease: 'power1.out',
        onComplete: () => {
          if (!kon.destroyed) {
            kon.alpha = 0
            kon.position.set(0, 0)
          }
        },
      })

      // Pappren flaxar — samma pust, inte en separat händelse.
      flaxa()

      // Blåser den mot fönstret tar gardinen emot vinden.
      if (s > 0) {
        gsap.killTweensOf(gardinNod)
        to(gardinNod, {
          rotation: 0.11 * kraft,
          duration: 0.26,
          ease: 'power2.out',
          onComplete: () => {
            if (!levande || gardinNod.destroyed) return
            to(gardinNod, { rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' })
          },
        })
      }

      return konTw
    },

    /**
     * Pappren flaxar till: varje ark lyfter en kant, vrider sig och lägger sig tillbaka —
     * förskjutet i tiden så högen inte rör sig som ETT föremål. Kan kallas om mitt i en
     * flax; varje ark nollställs mot sitt VILOLÄGE först, aldrig mot det förskjutna, så
     * högen inte vandrar iväg över en omgång.
     */
    papper() {
      flaxa()
    },

    /**
     * Vilo-rörelse med EGEN FAS per nod: gardinen svajar, den öppna bågen rör sig knappt,
     * ångan ur kaffekoppen driver uppåt, arken andas. Kan kallas om — viloläget nollställs
     * först, annars blir det förskjutna värdet ny bas.
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
    },

    destroy() {
      levande = false
      for (const tw of tweens) tw?.kill()
      tweens.length = 0
      bladTw = null
      konTw = null
      // `killTweensOf(roten)` når BARA roten — gardinens innernod, ångtussarna och arkens
      // inre behållare ligger flera nivåer in och deras `liv()`-tweens överlever annars
      // hela rivningen, helt tyst.
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
      // Masken måste lossas innan noderna rivs — en förstörd mask på en levande container
      // är precis den sortens tysta fel `_alive` inte fångar.
      if (!ute.destroyed) ute.mask = null
      if (!bak.destroyed) bak.destroy({ children: true })
      if (!fram.destroyed) fram.destroy({ children: true })
    },
  }
}

// ------------------------------------------------------------- inredning ---

/**
 * Kaffekoppen på bordet: fat, mugg med öra, kaffeyta och tre ångtussar.
 * `x, y` = fatets mitt på bordsskivan. Muggens MYNNING hamnar på y − 52.
 * Returnerar noden + ångtussarna (de senare drivs av `liv()`).
 */
function _kaffekopp(x, y) {
  const nod = nyC()
  const g = nyG()

  // Fat.
  g.ellipse(0, 4, 52, 13).fill({ color: F.morkt, alpha: 0.2 })
  g.ellipse(0, 0, 50, 12).fill(topLightFill(F.porslin, { highlight: 0.24, dark: 0.16 }))
    .stroke({ width: 2.5, color: F.porslinMork })
  g.ellipse(0, -2, 34, 8).fill({ color: F.porslinMork, alpha: 0.3 })

  // Öra — ritas FÖRE kroppen så fästena göms under muggens sida.
  g.moveTo(26, -40).quadraticCurveTo(56, -38, 54, -26)
    .quadraticCurveTo(52, -14, 26, -14)
    .stroke({ width: 9, color: F.porslin })
  g.moveTo(26, -40).quadraticCurveTo(56, -38, 54, -26)
    .quadraticCurveTo(52, -14, 26, -14)
    .stroke({ width: 3, color: F.porslinMork, alpha: 0.55 })

  // Muggen: svagt konisk, mynning på −52.
  g.moveTo(-32, -50).lineTo(32, -50).lineTo(27, -6).lineTo(-27, -6).closePath()
    .fill(topLightFill(F.porslin, { highlight: 0.22, dark: 0.18 }))
  g.rect(-32, -34, 64, 12).fill({ color: F.band, alpha: 0.7 })
  g.moveTo(-24, -46).lineTo(-19, -10).stroke({ width: 6, color: 0xffffff, alpha: 0.5 })
  g.ellipse(0, -52, 32, 9).fill(topLightFill(F.porslin, { highlight: 0.3 }))
    .stroke({ width: 2.5, color: F.porslinMork })
  g.ellipse(0, -51, 26, 6.5).fill(topLightFill(F.kaffe, { highlight: 0.3, dark: 0.2 }))
  g.ellipse(-7, -52, 9, 2.4).fill({ color: F.kaffeLjus, alpha: 0.5 })
  nod.addChild(g)

  // Ångan: tre tussar, var och en en egen nod med egen fas i `liv()`.
  const angaNoder = []
  for (let i = 0; i < 3; i++) {
    const t = nyC()
    const tg = nyG()
    const r = 8 - i * 1.6
    tg.moveTo(-r, 10)
      .quadraticCurveTo(r * 1.5, 2, -r * 0.4, -8)
      .quadraticCurveTo(-r * 1.7, -18, r * 0.6, -26)
      .stroke({ width: 5 - i * 0.8, color: 0xffffff, alpha: 0.38 - i * 0.07 })
    t.addChild(tg)
    // ⚠️ Tussarna hålls LÅGA med flit. Fönsterbrädans konsoler slutar på y 436 och koppen
    //    står på 542 — med det gamla avståndet (−74, −16/tuss) nådde översta tussens topp
    //    y 410 och drev in i konsolen. Nu ligger toppen på ~432, och `liv()`s gupp (8–16 px)
    //    lägger den som mest strax under brädans skugga.
    t.position.set(-14 + i * 14, -58 - i * 14)
    nod.addChild(t)
    angaNoder.push(t)
  }

  nod.position.set(x, y)
  return { nod, angaNoder }
}

// En väggklocka: träring, vit urtavla, streck och två visare.
function _klocka(x, y) {
  const g = nyG()
  g.circle(x + 3, y + 5, 42).fill({ color: F.morkt, alpha: 0.12 })
  g.circle(x, y, 42).fill(topLightFill(F.tra)).stroke({ width: 4, color: F.traMork })
  g.circle(x, y, 33).fill(sphereFill(0xfffaf0, { highlight: 0.5, dark: 0.14 }))
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.moveTo(x + Math.cos(a) * 27, y + Math.sin(a) * 27)
      .lineTo(x + Math.cos(a) * (i % 3 === 0 ? 19 : 22), y + Math.sin(a) * (i % 3 === 0 ? 19 : 22))
      .stroke({ width: i % 3 === 0 ? 3 : 2, color: F.morkt, alpha: 0.6 })
  }
  g.moveTo(x, y).lineTo(x - 3, y - 19).stroke({ width: 4, color: F.morkt })
  g.moveTo(x, y).lineTo(x + 21, y + 5).stroke({ width: 3, color: F.morkt })
  g.circle(x, y, 4).fill(0xe0603f)
  return g
}

// En tavla: ram, passepartout och en sommaräng i kritstreck — samma sommar som ligger
// utanför fönstret, så rummet och utsikten hör ihop.
function _tavla(x, y) {
  const g = nyG()
  const w = 172
  const h = 132
  g.roundRect(x - w / 2 + 6, y - h / 2 + 9, w, h, 7).fill({ color: F.morkt, alpha: 0.14 })
  g.roundRect(x - w / 2, y - h / 2, w, h, 7).fill(topLightFill(F.tra)).stroke({ width: 5, color: F.traMork })
  g.roundRect(x - w / 2 + 12, y - h / 2 + 12, w - 24, h - 24, 4).fill(0xfffaf0)
  g.roundRect(x - w / 2 + 21, y - h / 2 + 21, w - 42, h - 42, 3).fill(verticalFill(0xbfe4f7, 0xeaf7fd))
  g.circle(x + 38, y - 26, 12).fill(0xffd766)
  g.moveTo(x - 64, y + 22).quadraticCurveTo(x - 20, y - 14, x + 18, y + 22)
    .lineTo(x - 64, y + 22).fill(0x8ecb7a)
  g.moveTo(x - 14, y + 22).quadraticCurveTo(x + 26, y - 4, x + 64, y + 22)
    .lineTo(x - 14, y + 22).fill(0x67ab63)
  // Tre blommor i ängen — de gör tavlan till en BILD och inte till två gröna kilar.
  for (const [bx, by] of [[x - 40, y + 14], [x - 6, y + 22], [x + 34, y + 16]]) {
    for (let p = 0; p < 4; p++) {
      const a = (p / 4) * Math.PI * 2 + 0.4
      g.circle(bx + Math.cos(a) * 4.4, by + Math.sin(a) * 4.4, 3).fill({ color: 0xffffff, alpha: 0.9 })
    }
    g.circle(bx, by, 2.4).fill(0xffd766)
  }
  g.roundRect(x - w / 2 + 21, y + h / 2 - 30, w - 42, 9, 3).fill({ color: 0x6f9f68, alpha: 0.5 })
  return g
}
