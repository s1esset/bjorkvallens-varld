// SOVRUMMET — miljön i `vakna-pappa` (sidovy, 1280×720).
//
// SAMMA GREPP SOM `titt-ut-pappa/rummet.js`: illusionen ligger i LAGERORDNINGEN, inte i en
// mask. `bak` (vägg, fönster, sänggavel, kudde) ritas bakom ansiktsriggen, `fram` (filten,
// sängkanten, nattduksbordets framkant, ljuset) framför den. Filten över huvudet blir då
// bara en tween uppåt — ingen mask, och riggens `view` behöver aldrig flyttas.
//
// ⚠️ ALLA TAL HÄR ÄR RÄKNADE MOT `index.js` ANS_H = 320, INTE VALDA.
//    Riggens `manifest.ruta` är 733×800 och silhuetten fyller x 158–579, rad 0–94,5 av 100.
//    Vid höjd 320 (`k = 0.4`) betyder det: rutan 293×320 px, men den SYNLIGA pappan bara
//    ~168 px bred och ~302 px hög, med hjässan **160 px ovanför** riggens mitt och hakan
//    **142 px under** den. Med `PLATS.ansikte.y = 290` ligger alltså:
//      · hjässan på y 130     · hakan på y 432     · synlig bredd x 217–385
//    Därav de tre reglerna hela filen är byggd mot:
//      · kuddens överkant (205) ligger 75 px UNDER hjässan → huvudet syns över kudden
//      · filtens vilokant (440) ligger 8 px UNDER hakan   → filten är tuckad under hakan
//      · filten uppdragen når y 100, alltså 30 px ÖVER hjässan → huvudet är HELT täckt
//    Ändrar `index.js` sitt `ANS_H`: räkna om alla tre.
//
// ⚠️ RULLGARDINEN FÅR ALDRIG TÄCKA HELA GLASET. `index.js` startar varje omgång med
//    `rullgardin(true)` (nere), och himlen ÄR sömnmätaren (P0: ingen siffra, ingen stapel).
//    En gardin som täcker hela fönstret skulle alltså dölja mätaren under hela spelets
//    första halva. Den går därför ner till 50 % av glaset och lämnar bandet y 230–404 fritt
//    — det är precis där bågen som månen och solen går längs har sin topp (y 282).
//    Skillnaden nere/uppe bärs i stället av LJUSET: ljuskilen, väggskenet och rumstonen.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { verticalFill, verticalFillAlpha, topLightFill, cylinderFill, groundFill, sphereFill } from '../../lib/form.js'
import { lerpColor } from '../../lib/scene.js'
import { liv as fbLiv } from '../../lib/feedback.js'

// Väggens nederkant / golvlinjen. Golvet är bandet 500–720.
const GOLV_Y = 500

// Fönstrets GLASÖPPNING i absoluta designkoordinater (rektangel, inte mittpunkt).
const FX = 878
const FY = 56
const FW = 334
const FH = 348

// Bågen som månen och solen går längs. Centrum ligger UNDER glaset, så bara toppen av
// bågen syns — det är därför båda kropparna kommer upp ur och går ner under fönsterkarmen
// i stället för att glida in från sidan som klistermärken.
const BAGE = { x: FX + FW / 2, y: 434, r: 152 }

// Rullgardinens duk: lokal höjd = NERE-läget. scale.y 1 = nere, 0.10 = upprullad.
const GARD_TOP = 58
const GARD_H = 174

// Filtens två lägen (filtNodens y). Vilo = tuckad under hakan, över = 30 px ovanför hjässan.
//
// ⚠️ VILOLÄGET RÄTTAT EFTER BILDEN (`_somnprobe.mjs`, `.test-shots/somn/lage-*.png`). 440 låg
//    8 px under hakan (432) — matematiskt "under hakan", men fotorutan slutar först på 450
//    och dess nedersta band är en uttonad hals. Kvar blev ett ljust streck med en RAK
//    underkant mellan hakan och filten, alltså precis den fotokant hela riggen är byggd för
//    att dölja. 424 lägger filtkanten 8 px OVANFÖR hakan i stället, så tygets egen kontur
//    skär halsen — det är så en filt ser ut, och det är det enda som döljer klippet.
const FILT_VILO_Y = 424
const FILT_OVER_Y = 100

/**
 * Ankarpunkter som `index.js` bygger mot.
 *
 * · `ansikte` — ansiktsriggens MITTPUNKT (`view.position`) när han ligger på kudden.
 *               Riggen står UPPRÄTT; fotot är ett frontporträtt och roteras aldrig.
 * · `filt`    — filtnodens ankare i viloläge (nodens ÖVERKANT, mitten i x).
 * · `fonster` — glasöppningens MITTPUNKT + storlek. (Rektangeln är x−w/2 … x+w/2.)
 *               `index.js` använder x/y som en punkt för glitter, därför mitten och inte
 *               ett hörn.
 * · `katt`    — kattens mittpunkt när den landar på kudden till vänster om ansiktet.
 *               Kuddens ovansida ligger på y ≈ 250 vid det x:et, så en katt vars tassar
 *               går ~45 px under mitten sjunker mjukt ner i kudden. Fri kuddyta bredvid
 *               ansiktet: x 124–217 (ansiktets synliga vänsterkant är 217).
 * · `hylla`   — y-linjen för verktygens MITTPUNKT. Nattduksbordets skiva ligger på y 662,
 *               så ett 128 px högt verktyg (KLICK_R 64) står med foten exakt på skivan.
 */
export const PLATS = {
  ansikte: { x: 300, y: 290 },
  filt: { x: 300, y: FILT_VILO_Y },
  fonster: { x: FX + FW / 2, y: FY + FH / 2, w: FW, h: FH },
  katt: { x: 172, y: 282 },
  hylla: { y: 596 },
  // Släppzonerna på pappa (`index.js` ZONER) och rummets tryckbara saker. Alla fyra är
  // MÄTTA mot ritningen ovan, inte valda: magen är täckets kulle (y 396–490), foten är
  // den bara foten i fotändan, vägghyllan är hyllplanet med sina tre böcker.
  mage: { x: 570, y: 446 },
  fot: { x: 874, y: 436 },
  vagghylla: { x: 752, y: 312 },
  tavla: { x: 650, y: 178 },
}

// ------------------------------------------------------------------ palett ---

const F = {
  vaggLjus: 0xf2e2cd, vagg: 0xd9c0a3, vaggRand: 0xe7d2b6, vaggDekor: 0xc3a582,
  list: 0xfaf1e4, listMork: 0xc9b497,
  golv: 0xb3855a, golvFog: 0x7c5533,
  matta: 0x6f8fbf, mattaLjus: 0xa3bce0, mattaMork: 0x4d6b9b,
  tra: 0xc98f57, traMork: 0x8d5d34,
  gavel: 0x8f6da8, gavelMork: 0x604678, gavelLjus: 0xb492cc,
  madrass: 0xf6efe2, madrassMork: 0xd6c8b0,
  kudde: 0xfdf8ee, kuddeMork: 0xded0b9, kuddeSkugga: 0xbfae94,
  filt: 0x4f86c6, filtLjus: 0x87b2e6, filtMork: 0x315f96, filtRand: 0xf2dfa0,
  bord: 0xbd7f4e, bordMork: 0x84532f, bordTopp: 0xd9a86e,
  karm: 0xf6ead8, karmMork: 0xc0a888,
  gardin: 0xe8cf95, gardinMork: 0xb7995e,
  mane: 0xfdf6d8, maneMork: 0xe0d3a4,
  sol: 0xffd15c, solGlod: 0xffe8a4,
  stjarna: 0xfffdf0,
  hud: 0xf2c9a4,
  morkt: 0x3a2f26,
}

// Himlen inuti fönstret: tre färdiga lager som TONAS mot varandra. Att korsblanda alfa är
// enda sättet att gå mellan två gradienter utan att rita om något — en gradient går inte
// att interpolera, och en ny `FillGradient` per bildruta destabiliserar hela testsviten.
const HIMMEL = {
  nattTopp: 0x0b1533, nattBotten: 0x273c6e,
  gryTopp: 0x4c5ba0, gryBotten: 0xffa869,
  dagTopp: 0x74c0ee, dagBotten: 0xe2f3fd,
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

// Mjuk tröskel (smoothstep). Alla kurvor i `himmel()` går genom den, så inget tal hoppar.
function steg(a, b, v) {
  const t = kl01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

// Deterministisk pseudoslump — stjärnfältet och tapetens prickar måste bli IDENTISKA i två
// körningar, annars flaggar baslinjebilderna en diff som ingen har orsakat.
function slumpare(fro) {
  let s = fro >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Träådring: mjuka bågar. En träyta i EN platt ton rankas av `_plattprobe`.
function adring(g, x0, x1, y, n, farg, alpha = 0.26, hopp = 13) {
  for (let i = 0; i < n; i++) {
    const yy = y + i * hopp
    g.moveTo(x0, yy).quadraticCurveTo((x0 + x1) / 2, yy + 4, x1, yy)
      .stroke({ width: 2.5, color: farg, alpha })
  }
}

// En vit form som bara finns för att FÄRGAS med `.tint` varje bildruta. Vitt × tint = tint,
// och tint är en uniform — ingen omritning, ingen ny gradient. Det är hela tricket bakom att
// `himmel()` kan byta rumsljus per bildruta utan att röra en enda ritinstruktion.
function ljusark(ritare, alfaTopp, alfaBotten) {
  const g = nyG()
  ritare(g, verticalFillAlpha(0xffffff, 0xffffff, alfaTopp, alfaBotten))
  return g
}

// ---------------------------------------------------------------- byggaren ---

/**
 * Bygger sovrummet. Se filhuvudet för kontraktet och `PLATS` för ankarpunkterna.
 *
 * `bak` får `eventMode = 'none'` (dekor, aldrig träffbar). `fram` får DÄREMOT INTE det:
 * `eventMode: 'none'` i Pixi v8 släcker även BARNENS interaktion, och `filtNod` ligger där.
 * Varje dekorativt barn i `fram` är släckt för sig i stället — bara filten kan göras
 * träffbar av den som monterar rummet.
 */
export function byggSovrum(ctx) {
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
  const vagg = nyG()
  vagg.rect(x0, yTop, x1 - x0, GOLV_Y - yTop).fill(verticalFill(F.vaggLjus, F.vagg))
  // Breda tapetränder: väggen är bildens största sammanhängande yta och skulle annars ligga
  // i EN ton (`_plattprobe` rankar precis sådana).
  for (let x = -420; x < 1740; x += 84) {
    vagg.rect(x, yTop, 40, GOLV_Y - yTop).fill({ color: F.vaggRand, alpha: 0.42 })
  }
  // Tapetmönster: små sovande månskäror i ett förskjutet rutnät. Deterministiskt.
  for (let ry = yTop + 54, rad = 0; ry < GOLV_Y - 30; ry += 96, rad++) {
    for (let rx = -400 + (rad % 2) * 42; rx < 1740; rx += 84) {
      vagg.moveTo(rx - 7, ry - 8)
        .quadraticCurveTo(rx + 9, ry, rx - 7, ry + 8)
        .quadraticCurveTo(rx + 2, ry, rx - 7, ry - 8)
        .fill({ color: F.vaggDekor, alpha: 0.5 })
      vagg.circle(rx + 12, ry - 9, 2.6).fill({ color: F.vaggDekor, alpha: 0.42 })
    }
  }
  bak.addChild(vagg)

  // ================================================================== GOLVET ===
  const golv = nyG()
  golv.rect(x0, GOLV_Y, x1 - x0, yBot - GOLV_Y).fill(groundFill(F.golv, { light: 0.15, dark: 0.26 }))
  // Bräder mot en flyktpunkt ovanför golvlinjen: linjerna glesnar neråt, och då läser golvet
  // som ett PLAN i stället för som en färgad remsa.
  const vpx = 640
  const vpy = 250
  const spann = (yBot - vpy) / (GOLV_Y - vpy)
  const golvX = (px, y) => vpx + (px - vpx) * ((y - vpy) / (GOLV_Y - vpy))
  const kolumner = []
  for (let px = -1500; px <= 2800; px += 128) kolumner.push(px)
  for (const px of kolumner) {
    golv.moveTo(px, GOLV_Y).lineTo(vpx + (px - vpx) * spann, yBot)
      .stroke({ width: 2.5, color: F.golvFog, alpha: 0.28 })
  }
  const rader = [GOLV_Y]
  for (let i = 1; i <= 5; i++) {
    const yy = GOLV_Y + i * i * 11
    if (yy >= yBot) break
    rader.push(yy)
    golv.moveTo(x0, yy).lineTo(x1, yy).stroke({ width: 2, color: F.golvFog, alpha: 0.2 })
  }
  rader.push(yBot)
  // Enstaka brädor i egen ton — springorna ensamma lämnar golvet i en platt ton.
  for (let r = 0; r + 1 < rader.length; r++) {
    for (let k = 0; k + 1 < kolumner.length; k++) {
      const hv = (r * 5 + k * 3) % 7
      if (hv > 1) continue
      const ya = rader[r]
      const yb = rader[r + 1]
      const pa = kolumner[k]
      const pb = kolumner[k + 1]
      golv.poly([golvX(pa, ya), ya, golvX(pb, ya), ya, golvX(pb, yb), yb, golvX(pa, yb), yb])
        .fill(hv === 0 ? { color: 0xffffff, alpha: 0.06 } : { color: F.golvFog, alpha: 0.08 })
    }
  }
  bak.addChild(golv)

  // Golvlist + skuggan där vägg möter golv.
  const list = nyG()
  list.rect(x0, GOLV_Y - 20, x1 - x0, 20).fill(topLightFill(F.list))
  list.rect(x0, GOLV_Y - 20, x1 - x0, 5).fill({ color: 0xffffff, alpha: 0.5 })
  list.rect(x0, GOLV_Y - 3, x1 - x0, 6).fill({ color: F.listMork, alpha: 0.7 })
  list.rect(x0, GOLV_Y + 3, x1 - x0, 15).fill(verticalFillAlpha(F.morkt, F.morkt, 0.15, 0))
  bak.addChild(list)

  // Mattan: en oval trasmatta i den fria golvytan under fönstret (bädden når x 846).
  const matta = nyG()
  matta.ellipse(1020, 590, 244, 64).fill(topLightFill(F.matta, { highlight: 0.26, dark: 0.2 }))
  for (let i = 0; i < 5; i++) {
    const rx = 214 - i * 44
    const ry = 56 - i * 11
    matta.ellipse(1020, 590, rx, ry)
      .stroke({ width: 6, color: i % 2 ? F.mattaLjus : F.mattaMork, alpha: 0.55 })
  }
  for (let a = 0; a < 22; a++) {
    const ang = (a / 22) * Math.PI * 2
    const fx = 1020 + Math.cos(ang) * 246
    const fy = 590 + Math.sin(ang) * 66
    matta.moveTo(fx, fy).lineTo(fx + Math.cos(ang) * 13, fy + Math.sin(ang) * 13)
      .stroke({ width: 3, color: F.mattaLjus, alpha: 0.7 })
  }
  bak.addChild(matta)

  // =============================================================== FÖNSTRET ===
  //
  // Ordningen inuti fönstret är hela mätaren: himmelslagren tonar, månen sjunker, solen
  // stiger, och ALLT är maskat av glasöppningen så bågens ändpunkter (x 893 / 1197 vid
  // y 434) aldrig hamnar som lösa klot på tapeten.
  const fonster = nyC()

  // Väggskenet runt karmen: fyra ringar med fallande alfa. Vitt, tintas i `_mala`.
  const fonsterGlod = nyC()
  for (let i = 0; i < 4; i++) {
    const m = 22 + i * 30
    const ring = nyG()
    ring.roundRect(FX - m, FY - m, FW + m * 2, FH + m * 2, 26 + m * 0.5)
      .fill({ color: 0xffffff, alpha: 0.26 - i * 0.055 })
    fonsterGlod.addChild(ring)
  }
  fonster.addChild(fonsterGlod)

  // Himmelslagren — tre stycken, alla förritade.
  const himmelL = nyC()
  const skyNatt = nyG()
  skyNatt.rect(FX, FY, FW, FH).fill(verticalFill(HIMMEL.nattTopp, HIMMEL.nattBotten))
  const stjarnor = nyG()
  const rnd = slumpare(20260816)
  for (let i = 0; i < 46; i++) {
    const sx = FX + 10 + rnd() * (FW - 20)
    const sy = FY + 8 + rnd() * (FH * 0.62)
    const r = 1.4 + rnd() * 2.4
    stjarnor.circle(sx, sy, r).fill({ color: F.stjarna, alpha: 0.55 + rnd() * 0.45 })
    if (r > 3) {
      stjarnor.moveTo(sx - r * 2.6, sy).lineTo(sx + r * 2.6, sy)
        .moveTo(sx, sy - r * 2.6).lineTo(sx, sy + r * 2.6)
        .stroke({ width: 1.2, color: F.stjarna, alpha: 0.5 })
    }
  }
  const skyGry = nyG()
  skyGry.rect(FX, FY, FW, FH).fill(verticalFill(HIMMEL.gryTopp, HIMMEL.gryBotten))
  const skyDag = nyG()
  skyDag.rect(FX, FY, FW, FH).fill(verticalFill(HIMMEL.dagTopp, HIMMEL.dagBotten))

  // Moln — bara på dagen. Fyra puffar per moln, varje puff en egen ellips så form.js
  // normaliserar gradienten per puff och molnet läser som klot i stället för som en klump.
  const moln = nyG()
  for (const [mx, my, ms] of [[950, 132, 1], [1130, 196, 0.76], [1010, 250, 0.58]]) {
    for (const [dx, dy, r] of [[-30, 4, 22], [-4, -8, 28], [24, 2, 21], [46, 8, 15]]) {
      moln.ellipse(mx + dx * ms, my + dy * ms, r * ms, r * ms * 0.72)
        .fill({ color: 0xffffff, alpha: 0.9 })
    }
  }

  // Fjärran kullar i nederkanten av glaset — utan dem har fönstret ingen horisont, och en
  // sol som "stiger" har inget att stiga ur.
  const kullar = nyG()
  kullar.ellipse(FX + 60, FY + FH - 12, 130, 52).fill(0x4e7a58)
  kullar.ellipse(FX + 240, FY + FH - 4, 150, 46).fill(0x3f6a4c)
  kullar.ellipse(FX + 156, FY + FH - 26, 90, 34).fill({ color: 0x5c8b62, alpha: 0.95 })
  kullar.rect(FX, FY + FH - 22, FW, 24).fill(0x3f6a4c)

  // Månen: skära + krater. Ritad centrerad i en container så den kan flyttas per bildruta
  // utan att bli den kända "bar Graphics + stor .position"-stapeln.
  const mane = nyC()
  const maneG = nyG()
  maneG.circle(0, 0, 28).fill(sphereFill(F.mane, { highlight: 0.3, dark: 0.24 }))
  maneG.circle(-8, -7, 6.5).fill({ color: F.maneMork, alpha: 0.55 })
  maneG.circle(7, 5, 4.6).fill({ color: F.maneMork, alpha: 0.45 })
  maneG.circle(4, -11, 3.4).fill({ color: F.maneMork, alpha: 0.4 })
  const maneGlod = nyG()
  for (let i = 0; i < 3; i++) {
    maneGlod.circle(0, 0, 34 + i * 13).fill({ color: F.mane, alpha: 0.16 - i * 0.045 })
  }
  mane.addChild(maneGlod, maneG)

  // Solen: skiva + strålkrans + glorja.
  const sol = nyC()
  const solGlod = nyG()
  for (let i = 0; i < 4; i++) {
    solGlod.circle(0, 0, 34 + i * 16).fill({ color: F.solGlod, alpha: 0.22 - i * 0.05 })
  }
  const solG = nyG()
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    solG.moveTo(Math.cos(a) * 31, Math.sin(a) * 31)
      .lineTo(Math.cos(a) * 45, Math.sin(a) * 45)
      .stroke({ width: 6, color: F.solGlod, alpha: 0.85 })
  }
  solG.circle(0, 0, 30).fill(sphereFill(F.sol, { highlight: 0.42, dark: 0.22 }))
  sol.addChild(solGlod, solG)

  // ------------------------------------------------------------ VÄDRET ---
  //
  // Regnet bor INNANFÖR himmelsmasken, annars skulle strecken smattra rakt ut på tapeten.
  // Varje droppe är en egen nod med egen fas — 22 streck som faller i samma tween läser
  // som en gardin, inte som regn. Molnvalvet är en enda mörk hinna över himlen som tonas
  // in: en åskhimmel är MÖRKARE, och utan den syns inte att vädret slog om i mörkret.
  const regn = nyC()
  const regnMork = nyG()
  regnMork.rect(FX, FY, FW, FH).fill(verticalFillAlpha(0x2b3550, 0x4a5570, 0.85, 0.5))
  regn.addChild(regnMork)
  const droppar = []
  const rrnd = slumpare(31415926)
  for (let i = 0; i < 22; i++) {
    const d = nyC()
    const dg = nyG()
    const langd = 12 + rrnd() * 12
    dg.moveTo(0, 0).lineTo(-3, langd).stroke({ width: 2.6, color: 0xcfe6ff, alpha: 0.75, cap: 'round' })
    d.addChild(dg)
    d.position.set(FX + 8 + rrnd() * (FW - 16), FY + rrnd() * FH)
    d._wFas = rrnd()
    d._wFart = 0.8 + rrnd() * 0.5
    regn.addChild(d)
    droppar.push(d)
  }
  regn.alpha = 0
  regn.visible = false

  // Blixten inuti rutan: en vit hinna över hela glaset.
  const blixtG = nyG()
  blixtG.rect(FX, FY, FW, FH).fill({ color: 0xffffff })
  blixtG.alpha = 0

  himmelL.addChild(skyNatt, stjarnor, skyGry, skyDag, moln, kullar, mane, sol, regn, blixtG)
  // Masken måste ligga i scengrafen för att räknas — den bor därför i fönstercontainern
  // och rivs med den.
  const himmelMask = nyG()
  himmelMask.roundRect(FX, FY, FW, FH, 8).fill(0xffffff)
  himmelL.mask = himmelMask
  fonster.addChild(himmelL, himmelMask)

  // Karm, spröjs och fönsterbräda — ritas EFTER himlen så glaset klipps snyggt.
  const karm = nyG()
  karm.roundRect(FX - 16, FY - 16, FW + 32, FH + 32, 12)
    .stroke({ width: 16, color: F.karm, alignment: 0.5 })
  karm.roundRect(FX - 24, FY - 24, FW + 48, FH + 48, 14)
    .stroke({ width: 4, color: F.karmMork, alpha: 0.7 })
  karm.rect(FX + FW / 2 - 8, FY, 16, FH).fill(topLightFill(F.karm))
  karm.rect(FX, FY + FH * 0.42 - 7, FW, 14).fill(topLightFill(F.karm))
  karm.roundRect(FX - 44, FY + FH + 16, FW + 88, 22, 7).fill(topLightFill(F.tra))
    .stroke({ width: 3, color: F.traMork })
  adring(karm, FX - 32, FX + FW + 32, FY + FH + 26, 1, F.traMork, 0.3)
  // Glasets egen reflex: ett snedställt band över rutan.
  karm.moveTo(FX + 26, FY + FH - 8).lineTo(FX + 128, FY + 6).lineTo(FX + 176, FY + 6)
    .lineTo(FX + 74, FY + FH - 8).closePath().fill({ color: 0xffffff, alpha: 0.1 })
  fonster.addChild(karm)

  // ------------------------------------------------------------ rullgardin ---
  const gardinDuk = nyC()
  const gardinDukG = nyG()
  // Geometrin är bakad CENTRERAD i x och börjar i lokal y 0 (överkanten), så containern
  // ensam bär positionen. scale.y skalar duken; vecken är vågräta och tål det.
  gardinDukG.rect(-FW / 2 - 6, 0, FW + 12, GARD_H).fill(verticalFill(F.gardin, 0xd9bd82))
  for (let i = 1; i < 7; i++) {
    const yy = (i / 7) * GARD_H
    gardinDukG.moveTo(-FW / 2 - 6, yy).quadraticCurveTo(0, yy + 5, FW / 2 + 6, yy)
      .stroke({ width: 3, color: F.gardinMork, alpha: 0.28 })
  }
  gardinDukG.rect(-FW / 2 - 6, 0, 14, GARD_H).fill({ color: 0xffffff, alpha: 0.2 })
  gardinDuk.addChild(gardinDukG)
  gardinDuk.position.set(FX + FW / 2, GARD_TOP)

  // Nedre listen med snöret. Snöret är BARN till listen, så dess lokala y står stilla när
  // gardinen åker — och `liv()` kan gunga det utan att slåss med gardinens tween.
  const gardinList = nyC()
  const gardinListG = nyG()
  gardinListG.roundRect(-FW / 2 - 12, -9, FW + 24, 18, 9).fill(cylinderFill(F.gardin, { axis: 'x' }))
    .stroke({ width: 3, color: F.gardinMork })
  gardinList.addChild(gardinListG)
  const snore = nyC()
  const snoreG = nyG()
  snoreG.moveTo(0, 0).quadraticCurveTo(4, 34, 0, 66).stroke({ width: 3, color: 0xd8c49a })
  snoreG.roundRect(-7, 66, 14, 20, 7).fill(topLightFill(F.tra)).stroke({ width: 2, color: F.traMork })
  snore.addChild(snoreG)
  snore.position.set(FW / 2 - 18, 6)
  gardinList.addChild(snore)
  gardinList.position.set(FX + FW / 2, GARD_TOP + GARD_H)

  // Rullen högst upp: den ligger alltid kvar och är det som gör att duken läser som en
  // RULLGARDIN och inte som en lapp någon hängde framför rutan.
  const gardinRulle = nyG()
  gardinRulle.roundRect(FX - 26, 34, FW + 52, 26, 13).fill(cylinderFill(0xd9bd82, { axis: 'x' }))
    .stroke({ width: 3, color: F.gardinMork })
  gardinRulle.circle(FX - 30, 47, 11).fill(sphereFill(F.tra))
  gardinRulle.circle(FX + FW + 30, 47, 11).fill(sphereFill(F.tra))

  fonster.addChild(gardinDuk, gardinList, gardinRulle)
  bak.addChild(fonster)

  // =========================================================== VÄGGDEKOR ===
  // Den enda väggytan ingen möbel och ingen träffyta rör: x 540–860 ovanför sängen.
  const hyllan = _hylla(752, 336)
  // ⚠️ TAVLAN RITAS I ABSOLUTA KOORDINATER. Ska den kunna gunga måste pivot OCH position
  //    flyttas till dess mitt — en rotation kring (0,0) hade svingat den tvärs över rummet.
  const tavlan = nyC()
  tavlan.addChild(_tavla(650, 178))
  tavlan.pivot.set(650, 178)
  tavlan.position.set(650, 178)
  bak.addChild(tavlan, hyllan)

  // ================================================================ SÄNGEN ===
  // Gaveln (x 30–510, y 118–470) är stoppad och hög med flit: hjässan ligger på y 130, och
  // utan en gavel BAKOM huvudet skulle pappa se ut att sväva mot tapeten.
  const gavel = nyG()
  gavel.roundRect(38, 126, 480, 350, 18).fill({ color: F.morkt, alpha: 0.14 })
  gavel.moveTo(30, 470).lineTo(30, 190)
    .quadraticCurveTo(30, 118, 118, 118).lineTo(422, 118)
    .quadraticCurveTo(510, 118, 510, 190).lineTo(510, 470).closePath()
    .fill(verticalFill(F.gavelLjus, F.gavelMork))
  gavel.moveTo(46, 470).lineTo(46, 194)
    .quadraticCurveTo(46, 134, 122, 134).lineTo(418, 134)
    .quadraticCurveTo(494, 134, 494, 194).lineTo(494, 470).closePath()
    .fill(topLightFill(F.gavel, { highlight: 0.26, dark: 0.24 }))
  // Kapitonering: knappar i ett diamantmönster + sömmar. Utan dem är gaveln en lila platta.
  for (let rad = 0; rad < 4; rad++) {
    for (let k = 0; k < 6; k++) {
      const kx = 96 + k * 70 + (rad % 2) * 35
      const ky = 176 + rad * 66
      if (kx > 470) continue
      gavel.circle(kx, ky, 8).fill({ color: F.gavelMork, alpha: 0.55 })
      gavel.circle(kx - 2, ky - 2, 4).fill({ color: F.gavelLjus, alpha: 0.6 })
      gavel.moveTo(kx, ky).lineTo(kx + 35, ky + 33)
        .moveTo(kx, ky).lineTo(kx - 35, ky + 33)
        .stroke({ width: 2, color: F.gavelMork, alpha: 0.3 })
    }
  }
  gavel.roundRect(26, 118, 488, 22, 11).fill(cylinderFill(F.gavelLjus, { axis: 'x' }))
  bak.addChild(gavel)

  // Madrassen: bandet mellan kuddens underkant (442) och sängkantens överkant (466).
  const madrass = nyG()
  madrass.roundRect(52, 424, 800, 60, 14).fill(topLightFill(F.madrass, { highlight: 0.12, dark: 0.14 }))
  madrass.moveTo(60, 440).quadraticCurveTo(450, 432, 846, 442)
    .stroke({ width: 3, color: F.madrassMork, alpha: 0.5 })
  bak.addChild(madrass)

  // KUDDEN (x 124–496, y 205–442) med en DELL där huvudet vilar. Dellen är det enda som
  // säger att huvudet ligger PÅ kudden och inte framför den.
  const kudde = nyG()
  kudde.ellipse(310, 438, 190, 22).fill({ color: F.kuddeSkugga, alpha: 0.5 })
  kudde.moveTo(128, 300)
    .quadraticCurveTo(150, 214, 225, 205)
    .quadraticCurveTo(300, 200, 300, 232)
    .quadraticCurveTo(300, 200, 392, 208)
    .quadraticCurveTo(478, 218, 492, 298)
    .quadraticCurveTo(500, 380, 470, 418)
    .quadraticCurveTo(300, 452, 142, 414)
    .quadraticCurveTo(118, 372, 128, 300)
    .closePath()
    .fill(topLightFill(F.kudde, { highlight: 0.18, dark: 0.2 }))
  // Skuggan i dellen — en mjuk mörkning där huvudet trycker ner kudden.
  kudde.ellipse(300, 320, 118, 96).fill({ color: F.kuddeSkugga, alpha: 0.2 })
  kudde.ellipse(300, 306, 92, 74).fill({ color: F.kuddeSkugga, alpha: 0.16 })
  // Söm + veck: två bågar från dellen ut mot kanterna.
  kudde.moveTo(150, 300).quadraticCurveTo(200, 340, 196, 404)
    .stroke({ width: 4, color: F.kuddeMork, alpha: 0.45 })
  kudde.moveTo(468, 300).quadraticCurveTo(420, 344, 420, 406)
    .stroke({ width: 4, color: F.kuddeMork, alpha: 0.45 })
  kudde.moveTo(136, 292).quadraticCurveTo(300, 246, 486, 292)
    .stroke({ width: 3, color: F.kuddeMork, alpha: 0.3 })
  // Fållkant med stygn längs nederkanten.
  for (let sx = 156; sx <= 452; sx += 22) {
    kudde.moveTo(sx, 424).lineTo(sx + 11, 426).stroke({ width: 3, color: F.kuddeMork, alpha: 0.55 })
  }
  bak.addChild(kudde)

  // ======================================================= FRAM: KROPPEN ===
  //
  // PYJAMASEN ligger UNDER täcket och syns bara när barnet drar ner det (`taketAv`). Utan
  // den vore pappa ett fritt svävande huvud i samma sekund täcket åkte ner — och hela
  // busvägen "dra av täcket" hade varit obyggbar.
  const pyjamas = nyG()
  pyjamas.moveTo(352, 486)
    .quadraticCurveTo(392, 416, 466, 412)
    .quadraticCurveTo(560, 406, 636, 408)
    .quadraticCurveTo(700, 410, 720, 434)
    .quadraticCurveTo(754, 408, 800, 412)
    .quadraticCurveTo(842, 416, 852, 458)
    .lineTo(854, 490)
    .lineTo(352, 490)
    .closePath()
    .fill(topLightFill(0xa8c4e8, { highlight: 0.28, dark: 0.22 }))
  // Randigt pyjamastyg — en enfärgad platta läser som en presenning.
  for (let i = 0; i < 14; i++) {
    const px = 366 + i * 36
    pyjamas.moveTo(px, 490).quadraticCurveTo(px + 6, 452, px + 2, 412)
      .stroke({ width: 9, color: 0x7fa5d6, alpha: 0.5 })
  }
  // Knappraden längs bröstet + en krage.
  for (let i = 0; i < 5; i++) {
    pyjamas.circle(430 + i * 62, 424 + i * 3, 5).fill({ color: 0xfffdf7, alpha: 0.9 })
  }
  pyjamas.moveTo(356, 470).quadraticCurveTo(396, 420, 452, 414)
    .stroke({ width: 7, color: 0xfffdf7, alpha: 0.6 })
  fram.addChild(pyjamas)

  // TÄCKNODEN bär täckets läge (uppe/nere). Fladdret bor i `kropp` INUTI den, så en fläkt
  // som skakar tyget aldrig slåss med tweenen som drar ner det.
  const taketNod = new Container()
  taketNod.eventMode = 'none'
  //
  // Filten över kroppen börjar på x 346, alltså 39 px till höger om ansiktets synliga
  // högerkant (385)... nej: den börjar UNDER hakan och tuckar in sig. Bulan stiger till
  // y 392 vid axeln, sjunker vid midjan och stiger igen vid knäna — en rak korv läser som
  // en stock, inte som en sovande pappa.
  const kropp = nyG()
  kropp.moveTo(346, 486)
    .quadraticCurveTo(390, 404, 470, 400)
    .quadraticCurveTo(566, 394, 640, 396)
    .quadraticCurveTo(700, 398, 722, 424)
    .quadraticCurveTo(756, 396, 802, 400)
    .quadraticCurveTo(846, 404, 856, 452)
    .lineTo(858, 490)
    .lineTo(346, 490)
    .closePath()
    .fill(topLightFill(F.filt, { highlight: 0.3, dark: 0.24 }))
  // Ränder: det är de som gör tyget till en FILT och inte till en presenning.
  for (let i = 0; i < 4; i++) {
    const fy = 424 + i * 17
    kropp.moveTo(354, fy).quadraticCurveTo(600, fy - 20, 852, fy - 4)
      .stroke({ width: 7, color: F.filtRand, alpha: 0.42 })
  }
  // Veck som följer kroppens form.
  kropp.moveTo(470, 404).quadraticCurveTo(486, 440, 470, 488)
    .stroke({ width: 5, color: F.filtMork, alpha: 0.3 })
  kropp.moveTo(722, 426).quadraticCurveTo(714, 456, 720, 488)
    .stroke({ width: 5, color: F.filtMork, alpha: 0.3 })
  kropp.moveTo(640, 398).quadraticCurveTo(652, 440, 640, 488)
    .stroke({ width: 4, color: F.filtMork, alpha: 0.22 })
  taketNod.addChild(kropp)
  fram.addChild(taketNod)

  // FOTEN ligger UTANFÖR täcknoden — den är ju bar, och ska stå kvar när täcket åker ner.
  // (Den lilla komiken som gör bädden bebodd, och en egen träffyta i `index.js`.)
  const fot = nyG()
  fot.moveTo(846, 430).quadraticCurveTo(890, 418, 898, 442)
    .quadraticCurveTo(902, 462, 872, 462).quadraticCurveTo(846, 458, 846, 430)
    .fill(topLightFill(F.hud, { highlight: 0.2, dark: 0.18 }))
  fot.circle(888, 436, 4).fill({ color: 0xd9a077, alpha: 0.7 })
  fot.circle(880, 430, 3.4).fill({ color: 0xd9a077, alpha: 0.6 })
  fram.addChild(fot)

  // ======================================================= FRAM: FILTEN ===
  //
  // FILTNODEN. Geometrin är bakad centrerad i x och börjar i lokal y 0 (kanten som tuckas
  // under hakan). Containern ensam bär positionen — en bar Graphics med stor `.position`
  // renderas som en helskärmsstapel i det här repot.
  //
  // I VILA (y 440) syns bara de översta 26 px av noden; resten göms av sängkanten som
  // ritas EFTER den. UPPDRAGEN (y 100) täcker den y 100–440, alltså hela huvudet (130–432)
  // med 30 px marginal upptill och 8 px nedtill. Nodens bbox är 400×340 px — långt över
  // P0:s 96 px och över uppdragets 120×120.
  const filtNod = new Container()
  const filtG = nyG()
  const FW2 = 200
  const FLH = 340
  filtG.moveTo(-FW2, 22)
    .quadraticCurveTo(-120, -2, -30, 6)
    .quadraticCurveTo(70, 16, FW2, 0)
    .lineTo(FW2, FLH)
    .lineTo(-FW2, FLH)
    .closePath()
    .fill(topLightFill(F.filt, { highlight: 0.34, dark: 0.22 }))
  // Uppvikt hemkant i ljusare ton — filtens "insida", det som syns när den dras upp.
  filtG.moveTo(-FW2, 22)
    .quadraticCurveTo(-120, -2, -30, 6)
    .quadraticCurveTo(70, 16, FW2, 0)
    .lineTo(FW2, 48)
    .quadraticCurveTo(70, 64, -30, 54)
    .quadraticCurveTo(-120, 46, -FW2, 70)
    .closePath()
    .fill(topLightFill(F.filtLjus, { highlight: 0.26, dark: 0.14 }))
  filtG.moveTo(-FW2, 46).quadraticCurveTo(-120, 22, -30, 30)
    .quadraticCurveTo(70, 40, FW2, 24)
    .stroke({ width: 4, color: F.filtRand, alpha: 0.6 })
  for (let i = 0; i < 4; i++) {
    const fy = 96 + i * 46
    filtG.moveTo(-FW2, fy).quadraticCurveTo(0, fy + 14, FW2, fy - 4)
      .stroke({ width: 8, color: F.filtRand, alpha: 0.38 })
  }
  // Lodräta veck: tyget måste ha volym när det ligger som en kulle över ett huvud.
  for (const vx of [-132, -46, 52, 138]) {
    filtG.moveTo(vx, 44).quadraticCurveTo(vx + 12, 190, vx - 6, FLH)
      .stroke({ width: 10, color: F.filtMork, alpha: 0.18 })
  }
  filtNod.addChild(filtG)
  filtNod.position.set(PLATS.filt.x, FILT_VILO_Y)
  fram.addChild(filtNod)

  // ================================================== FRAM: SÄNGENS KANT ===
  // Sängkanten (y 466–668) är det som gömmer filtnodens vilotail. Den är en hel sarg utan
  // synliga ben med flit: ett ben skulle lämna en glipa där filten stack ut under sängen.
  const sangFram = nyG()
  sangFram.ellipse(450, 664, 420, 26).fill({ color: F.morkt, alpha: 0.2 })
  sangFram.roundRect(50, 456, 806, 40, 14).fill(cylinderFill(F.tra, { axis: 'x' }))
    .stroke({ width: 3, color: F.traMork })
  sangFram.rect(60, 492, 786, 168).fill(verticalFill(F.tra, 0x9a6a3c))
  adring(sangFram, 74, 832, 512, 9, F.traMork, 0.22, 17)
  // Två infällda speglar i sargen + ett par träknoppar: annars är den en brun platta.
  for (const px of [250, 650]) {
    sangFram.roundRect(px - 150, 512, 300, 122, 10).fill({ color: 0xffffff, alpha: 0.1 })
      .stroke({ width: 4, color: F.traMork, alpha: 0.5 })
  }
  sangFram.roundRect(50, 640, 806, 22, 10).fill(verticalFill(0xa8743f, 0x7c5027))
  sangFram.rect(60, 492, 786, 6).fill({ color: 0xffffff, alpha: 0.24 })
  fram.addChild(sangFram)

  // ============================================ FRAM: NATTDUKSBORDET ===
  // En lång låg byrå längs bildens framkant. Skivan ligger på y 662 — verktygen i
  // `PLATS.hylla.y` (596) står med foten exakt där.
  const bord = nyG()
  bord.rect(x0, 662, x1 - x0, yBot - 662).fill(verticalFill(F.bord, F.bordMork))
  bord.roundRect(x0, 640, x1 - x0, 26, 8).fill(topLightFill(F.bordTopp, { highlight: 0.24, dark: 0.16 }))
  bord.rect(x0, 640, x1 - x0, 6).fill({ color: 0xffffff, alpha: 0.34 })
  adring(bord, x0 + 20, x1 - 20, 650, 1, 0x8b5a33, 0.24)
  bord.rect(x0, 666, x1 - x0, 5).fill({ color: F.morkt, alpha: 0.24 })
  // Lådfronter med handtag — deterministiskt rutnät över hela bredden.
  for (let dx = -320; dx < x1; dx += 300) {
    bord.roundRect(dx + 16, 682, 268, 46, 8).fill({ color: 0xffffff, alpha: 0.1 })
      .stroke({ width: 3, color: 0x6f4526, alpha: 0.55 })
    bord.roundRect(dx + 118, 700, 64, 11, 6).fill(cylinderFill(0xdfc79a, { axis: 'x' }))
  }
  fram.addChild(bord)

  // ================================================== FRAM: LJUSET ===
  //
  // Ljuskilen från fönstret. Vit form + `.tint` — kall måne på natten, varm sol på morgonen,
  // och nästan släckt när rullgardinen är nere. Faller över kroppen (x 448–920 vid y 440),
  // aldrig över ansiktet: en gul hinna över fotot gör pappa sjuk i ansiktsfärgen.
  const kil = ljusark((g, fyll) => {
    g.moveTo(FX + 2, FY + 14).lineTo(FX + FW - 2, FY + 14)
      .lineTo(700, yBot).lineTo(120, yBot).closePath().fill(fyll)
  }, 0.5, 0)
  fram.addChild(kil)

  // Dammkornen i ljuset — de enda sakerna i rummet som rör sig av sig själva (`liv()`).
  const damm = nyC()
  const dammNoder = []
  const drnd = slumpare(770419)
  for (let i = 0; i < 9; i++) {
    const d = nyC()
    const g = nyG()
    const r = 2.6 + drnd() * 3.6
    g.circle(0, 0, r).fill({ color: 0xfff6de, alpha: 0.85 })
    g.circle(0, 0, r * 2.2).fill({ color: 0xfff6de, alpha: 0.18 })
    d.addChild(g)
    d.position.set(500 + drnd() * 480, 210 + drnd() * 340)
    damm.addChild(d)
    dammNoder.push(d)
  }
  fram.addChild(damm)

  // Morgonens värme över kudden och ansiktet: fem ellipser med fallande alfa. En radiell
  // gradient går INTE att använda här — den fyller hela duken med sista stoppet och blir en
  // jämn hinna i stället för en glorja (uppmätt, se CLAUDE.md).
  const ansGlod = nyC()
  for (let i = 0; i < 5; i++) {
    const g = nyG()
    g.ellipse(300, 300, 96 + i * 34, 108 + i * 38).fill({ color: 0xffffff, alpha: 0.14 - i * 0.024 })
    ansGlod.addChild(g)
  }
  fram.addChild(ansGlod)

  // NATTEN: en hel skärm vit form med fallande alfa nedåt, tintad från djupblå till varm.
  // Ligger SIST i `fram` så den mörknar även möblerna — men taket är 0,44, för under det
  // slutar fotot av pappa att läsa som ett ansikte.
  const natt = ljusark((g, fyll) => {
    g.rect(x0, yTop, x1 - x0, yBot - yTop).fill(fyll)
  }, 1, 0.72)
  fram.addChild(natt)

  // ÅSKANS SKEN I RUMMET. Ligger allra sist, alltså över nattens scrim och över ansiktet:
  // en blixt som bara lyser upp fönstret men lämnar rummet becksvart läser som en bugg.
  // Taket är 0,5 — vitare än så och fotot av pappa blir en vit lapp i två bildrutor.
  const rumBlixt = nyG()
  rumBlixt.rect(x0, yTop, x1 - x0, yBot - yTop).fill({ color: 0xeaf2ff })
  rumBlixt.alpha = 0
  fram.addChild(rumBlixt)

  // ================================================== TILLSTÅND + MÅLNING ===

  let levande = true
  let vNu = 0          // 0 = natt, 1 = morgon
  const gard = { v: 1 } // 1 = rullgardin NERE (index.js startar där)

  /**
   * ENDA STÄLLET DÄR LJUSET SKRIVS. Kallas av `himmel()` varje bildruta och av
   * rullgardinens tween.
   *
   * ⚠️ DEN RITAR ALDRIG OM NÅGOT. Inga `clear()`, inga nya `FillGradient`, inga nya noder.
   *    Den skriver 21 fält: tre himmelsalfa, stjärnor, moln, månens x/y/alfa, solens
   *    x/y/alfa/skala, nattens alfa+tint, kilens alfa+tint, väggskenets alfa+tint,
   *    ansiktsglödens alfa+tint och dammets alfa. Allt är rena funktioner av (v, gard.v),
   *    så samma tal ger alltid samma bild — `himmel(0.4)` två gånger i rad är en no-op.
   */
  function mala() {
    if (!levande) return
    const v = vNu
    const ner = gard.v            // 1 = gardinen nere
    const dager = 1 - 0.9 * ner   // hur mycket ljus som når in i rummet

    // --- himlen i fönstret ---
    skyNatt.alpha = 1 - steg(0.18, 0.55, v)
    skyGry.alpha = steg(0.14, 0.44, v) * (1 - steg(0.6, 0.92, v))
    skyDag.alpha = steg(0.55, 0.96, v)
    stjarnor.alpha = (1 - steg(0.04, 0.42, v)) * 0.95
    moln.alpha = steg(0.4, 0.82, v) * 0.9

    // --- månen sjunker, solen stiger — samma båge, samma topp ---
    const fiM = Math.PI / 2 + (Math.PI / 2 + 0.34) * v
    mane.position.set(BAGE.x + Math.cos(fiM) * BAGE.r, BAGE.y - Math.sin(fiM) * BAGE.r)
    mane.alpha = 1 - steg(0.52, 0.84, v)
    const fiS = -0.34 + (Math.PI / 2 + 0.34) * v
    sol.position.set(BAGE.x + Math.cos(fiS) * BAGE.r, BAGE.y - Math.sin(fiS) * BAGE.r)
    sol.alpha = steg(0.16, 0.46, v)
    const ss = 0.82 + 0.24 * v
    sol.scale.set(ss, ss)

    // --- rummets ton ---
    const varm = steg(0.2, 0.8, v)
    // ⚠️ TAKET 0,42 ÄR INTE PYNT. Mörkret ligger ÖVER ansiktsriggen (scrimen är sista barnet
    //    i `fram`), och över ~0,45 slutar fotot av pappa att läsa som ett ansikte — då är
    //    spelets enda karaktär borta i just det läge barnet börjar i.
    natt.alpha = Math.min(0.42, (1 - steg(0.05, 0.88, v)) * 0.4 + 0.12 * ner)
    natt.tint = lerpColor(lerpColor(0x1c2a5e, 0x7b4f7a, steg(0, 0.55, v)), 0xffd3a2, steg(0.45, 1, v))

    const ljusTon = lerpColor(0x9fc6ff, 0xffd68a, varm)
    kil.alpha = (0.1 + 0.26 * steg(0.24, 0.9, v)) * dager
    kil.tint = ljusTon
    fonsterGlod.alpha = (0.14 + 0.34 * steg(0.28, 0.95, v)) * (1 - 0.8 * ner)
    fonsterGlod.tint = ljusTon
    // De fem ellipserna staplas i mitten (~0,46 sammanlagt), så nodalfan måste hållas nere:
    // 0,34 ger ~0,16 över fotot, vilket är en morgonvärme och inte en vit hinna.
    ansGlod.alpha = 0.34 * steg(0.42, 1, v) * dager
    ansGlod.tint = 0xffdcae
    damm.alpha = 0.55 * steg(0.3, 0.9, v) * dager
  }

  // Rullgardinens två noder skrivs ur EN proxy, så duken och listen aldrig kan hamna i
  // otakt (två separata tweens driver isär vid en avbruten omgång).
  function malaGardin() {
    const t = gard.v
    if (!gardinDuk.destroyed) gardinDuk.scale.y = 0.1 + 0.9 * t
    if (!gardinList.destroyed) gardinList.y = GARD_TOP + 17 + (GARD_H - 17) * t
  }

  malaGardin()
  mala()

  // Vilolägen för `liv()` — läses EN gång, innan någon rörelse startat.
  const livSpec = [
    { n: snore, bob: 3, sway: 0.07, duration: 3.1 },
    ...dammNoder.map((d, i) => ({ n: d, bob: 9 + (i % 4) * 5, sway: 0.02, duration: 3.4 + (i % 5) * 0.6 })),
  ].map((L) => ({ ...L, viloY: L.n.y, viloRot: L.n.rotation }))

  const allaNoder = [
    bak, fram, filtNod, gardinDuk, gardinList, snore, damm, ...dammNoder,
    mane, sol, natt, kil, fonsterGlod, ansGlod, himmelL,
    taketNod, kropp, fot, pyjamas, regn, blixtG, rumBlixt, hyllan, ...hyllan.bocker, tavlan,
  ]

  // REGNET drivs av EN proxy-tween, inte av 22 egna tidslinjer: varje droppe har sin egen
  // fas och fart, och positionen räknas ur `regnFas.t`. Tweenen pausas när det är uppehåll,
  // så ett torrt sovrum kostar exakt noll per bildruta.
  const regnFas = { t: 0 }
  const REGN_START = FY - 40
  const REGN_SPANN = FH + 60
  let regnTw = null
  function malaRegn() {
    if (!levande || regn.destroyed) return
    for (const d of droppar) {
      if (d.destroyed) continue
      const f = (regnFas.t * d._wFart + d._wFas) % 1
      d.y = REGN_START + f * REGN_SPANN
    }
  }

  return {
    bak,
    fram,
    filtNod,

    /**
     * SÖMNMÄTAREN. 0 = djup natt (måne högt, kallt blått rumsljus), 1 = morgon (sol uppe,
     * varmt gult ljus, månen borta). Anropas varje bildruta av `index.js` — se `mala()`
     * för exakt vad som skrivs, och för varför ingenting ritas om.
     */
    himmel(v) {
      if (!levande) return
      vNu = kl01(v)
      mala()
    },

    /**
     * Filten dras över huvudet (`true`) eller ner igen (`false`). Returnerar tweenen.
     * Vägen är 340 px, och `back.out` uppåt ger den ryck som en filt som RYCKS upp har.
     */
    filtOver(pa) {
      if (!levande || filtNod.destroyed) return null
      return to(filtNod, {
        y: pa ? FILT_OVER_Y : FILT_VILO_Y,
        rotation: pa ? -0.018 : 0,
        duration: pa ? 0.44 : 0.38,
        ease: pa ? 'back.out(1.25)' : 'power2.inOut',
      })
    },

    /**
     * Rullgardinen ner (`true`) eller upp (`false`). Nere täcker den halva glaset och
     * strypar ljuset; uppe flödar dagsljuset in — ljuskilen, väggskenet och glöden över
     * kudden fyrdubblas. Se filhuvudet för varför den ALDRIG täcker hela fönstret.
     */
    rullgardin(pa) {
      if (!levande) return null
      return to(gard, {
        v: pa ? 1 : 0,
        duration: 0.52,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (!levande) return
          malaGardin()
          mala()
        },
      })
    },

    /** Böckerna på vägghyllan — `index.js` tippar ner en av dem på täcket. */
    bocker: hyllan.bocker,

    /**
     * VÄDRET utanför fönstret: `false` = uppehåll, `true` = regn som smattrar.
     * Regnet mörknar himlen och lägger 22 fallande streck innanför glasmasken.
     */
    vader(regnar) {
      if (!levande || regn.destroyed) return
      gsap.killTweensOf(regn)
      if (regnar) {
        regn.visible = true
        if (!regnTw) {
          regnTw = gsap.to(regnFas, {
            t: 100, duration: 100, ease: 'none', repeat: -1,
            onUpdate: malaRegn,
          })
          tweens.push(regnTw)
        }
        regnTw.play()
        to(regn, { alpha: 1, duration: 0.7, ease: 'power2.out' })
      } else {
        to(regn, {
          alpha: 0,
          duration: 0.7,
          ease: 'power2.in',
          onComplete: () => {
            if (!regn.destroyed) regn.visible = false
            regnTw?.pause()
          },
        })
      }
    },

    /**
     * ETT BLIXTNEDSLAG: två snabba sken, ett i rutan och ett över hela rummet. Dundret
     * är `index.js` sak (ljudet ska komma EFTER ljuset, precis som i verkligheten).
     */
    blixt() {
      if (!levande || blixtG.destroyed) return
      const tl = gsap.timeline()
      tweens.push(tl)
      tl.to(blixtG, { alpha: 0.95, duration: 0.05, ease: 'power2.out' }, 0)
        .to(blixtG, { alpha: 0.1, duration: 0.12, ease: 'power2.in' }, 0.05)
        .to(blixtG, { alpha: 0.8, duration: 0.05, ease: 'power2.out' }, 0.2)
        .to(blixtG, { alpha: 0, duration: 0.45, ease: 'power2.in' }, 0.26)
      tl.to(rumBlixt, { alpha: 0.5, duration: 0.05, ease: 'power2.out' }, 0)
        .to(rumBlixt, { alpha: 0.06, duration: 0.12, ease: 'power2.in' }, 0.05)
        .to(rumBlixt, { alpha: 0.42, duration: 0.05, ease: 'power2.out' }, 0.2)
        .to(rumBlixt, { alpha: 0, duration: 0.45, ease: 'power2.in' }, 0.26)
      return tl
    },

    /**
     * TÄCKET ÖVER KROPPEN dras ner (`true`) eller upp igen (`false`). Nere glider det bakom
     * sängkanten och pappa ligger i randiga pyjamas — och fryser. 86 px räcker: sargen
     * börjar på y 456 och täckets överkant ligger på 396, så inget tyg sticker fram.
     */
    taketAv(av) {
      if (!levande || taketNod.destroyed) return null
      return to(taketNod, {
        y: av ? 86 : 0,
        duration: av ? 0.5 : 0.6,
        ease: av ? 'power2.in' : 'back.out(1.2)',
      })
    },

    /** Fladdrar täcket — vind, en boll som landar, en hund som skuttar upp. */
    filtFladdra(styrka = 1) {
      if (!levande || kropp.destroyed) return null
      gsap.killTweensOf(kropp)
      const tl = gsap.timeline()
      tweens.push(tl)
      tl.to(kropp, { y: -9 * styrka, duration: 0.14, ease: 'power2.out' }, 0)
        .to(kropp, { y: 3 * styrka, duration: 0.18, ease: 'sine.inOut' }, 0.14)
        .to(kropp, { y: -4 * styrka, duration: 0.16, ease: 'sine.inOut' }, 0.32)
        .to(kropp, { y: 0, duration: 0.46, ease: 'elastic.out(1, 0.5)' }, 0.48)
      return tl
    },

    /** Den bara foten rycks in — svaret på ett tryck eller en fjäder under fotsulan. */
    fotRyck() {
      if (!levande || fot.destroyed) return null
      gsap.killTweensOf(fot)
      const tl = gsap.timeline()
      tweens.push(tl)
      tl.to(fot, { x: -22, y: -8, duration: 0.11, ease: 'power2.out' }, 0)
        .to(fot, { x: -6, y: -2, duration: 0.16, ease: 'sine.inOut' }, 0.11)
        .to(fot, { x: -16, y: -6, duration: 0.14, ease: 'sine.inOut' }, 0.27)
        .to(fot, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }, 0.41)
      return tl
    },

    /** Hyllan skakar till (utan att tappa något) — svaret när alla böcker redan ligger nere. */
    hyllaSkak() {
      if (!levande || hyllan.destroyed) return null
      gsap.killTweensOf(hyllan)
      const tl = gsap.timeline()
      tweens.push(tl)
      tl.to(hyllan, { x: 4, duration: 0.05, ease: 'sine.inOut', yoyo: true, repeat: 5 }, 0)
        .to(hyllan, { x: 0, duration: 0.16, ease: 'sine.out' }, 0.3)
      return tl
    },

    /** Tavlans sovande måne gungar till. Ren glädje, noll vakenhet. */
    tavlaGunga() {
      if (!levande || tavlan.destroyed) return null
      gsap.killTweensOf(tavlan)
      const tl = gsap.timeline()
      tweens.push(tl)
      tl.to(tavlan, { rotation: 0.05, duration: 0.13, ease: 'power2.out' }, 0)
        .to(tavlan, { rotation: -0.04, duration: 0.18, ease: 'sine.inOut' })
        .to(tavlan, { rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' })
      return tl
    },

    /**
     * Vilo-rörelse med EGEN FAS per nod: gardinsnöret svajar, dammkornen driver i ljuset.
     * Kan kallas om — viloläget nollställs först, annars blir det förskjutna värdet ny bas.
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
      // `killTweensOf(roten)` når BARA roten — snöret och dammkornen ligger flera nivåer in
      // och deras `liv()`-tweens överlever annars hela rivningen, helt tyst.
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
      gsap.killTweensOf(gard)
      // Masken måste lossas innan noderna rivs — en förstörd mask på en levande container
      // är precis den sortens tysta fel `_alive` inte fångar.
      if (!himmelL.destroyed) himmelL.mask = null
      if (!bak.destroyed) bak.destroy({ children: true })
      if (!fram.destroyed) fram.destroy({ children: true })
    },
  }
}

// ------------------------------------------------------------- väggdekor ---

// En tavla: ram, passepartout och en sovande måne i kritstreck. Tematisk, och den enda
// bilden i rummet som säger "natt" utan att himlen behöver göra jobbet.
function _tavla(x, y) {
  const g = nyG()
  const w = 172
  const h = 132
  g.roundRect(x - w / 2 + 6, y - h / 2 + 9, w, h, 7).fill({ color: F.morkt, alpha: 0.14 })
  g.roundRect(x - w / 2, y - h / 2, w, h, 7).fill(topLightFill(F.tra)).stroke({ width: 5, color: F.traMork })
  g.roundRect(x - w / 2 + 12, y - h / 2 + 12, w - 24, h - 24, 4).fill(0xfffaf0)
  g.roundRect(x - w / 2 + 21, y - h / 2 + 21, w - 42, h - 42, 3).fill(verticalFill(0x2a3a6e, 0x536aa8))
  // Månskäran + tre stjärnor.
  g.moveTo(x + 6, y - 22)
    .quadraticCurveTo(x + 40, y - 4, x + 6, y + 18)
    .quadraticCurveTo(x + 26, y - 4, x + 6, y - 22)
    .fill(F.mane)
  for (const [sx, sy, r] of [[x - 34, y - 20, 5], [x - 18, y + 8, 3.4], [x - 44, y + 14, 4]]) {
    g.star?.(sx, sy, 4, r, r * 0.42)
    if (g.star) g.fill(F.stjarna)
    else g.circle(sx, sy, r).fill(F.stjarna)
  }
  g.roundRect(x - w / 2 + 21, y + h / 2 - 30, w - 42, 9, 3).fill({ color: 0x9db6da, alpha: 0.5 })
  return g
}

/**
 * En vägghylla med tre böcker och en liten kruka.
 *
 * ⚠️ BÖCKERNA ÄR EGNA NODER, inte streck i hyllans Graphics. `index.js` gör hyllan
 *    tryckbar och låter en bok RAMLA NER på täcket — och en bok som är inbakad i samma
 *    Graphics som hyllplanet går inte att tippa. Varje bok står i en container vars origo
 *    är dess NEDRE MITT, så en rotation svänger den kring ryggens fot precis som en
 *    riktig bok som tappar balansen.
 */
function _hylla(x, y) {
  const c = nyC()
  const g = nyG()
  c.addChild(g)
  g.roundRect(x - 96, y + 24, 192, 8, 4).fill({ color: F.morkt, alpha: 0.16 })
  g.roundRect(x - 96, y + 12, 192, 14, 6).fill(topLightFill(F.tra)).stroke({ width: 3, color: F.traMork })
  g.moveTo(x - 72, y + 26).lineTo(x - 66, y + 42).stroke({ width: 5, color: F.traMork, alpha: 0.7 })
  g.moveTo(x + 72, y + 26).lineTo(x + 66, y + 42).stroke({ width: 5, color: F.traMork, alpha: 0.7 })
  // Böckerna: tre olika höjder, en lutande. Var bok är en EGEN container med origo i
  // ryggens fot (nedre mitt), så `index.js` kan tippa och tappa den.
  const bocker = []
  const bok = (bx, bh, bw, farg, lut = 0) => {
    const n = nyC()
    n.position.set(bx + bw / 2, y + 12)
    const bg = nyG()
    const ox = -bw / 2
    if (lut) {
      bg.moveTo(ox, 0).lineTo(ox + bw, 0)
        .lineTo(ox + bw + lut, -bh).lineTo(ox + lut, -bh).closePath()
        .fill(topLightFill(farg)).stroke({ width: 2.5, color: 0x2a2118, alpha: 0.3 })
    } else {
      bg.roundRect(ox, -bh, bw, bh, 3).fill(topLightFill(farg))
        .stroke({ width: 2.5, color: 0x2a2118, alpha: 0.35 })
    }
    // Guldband på ryggen — det är de som gör en färgad pinne till en bok.
    bg.rect(ox + 3 + lut * 0.5, -bh + 4, 3, bh - 12).fill({ color: 0xffffff, alpha: 0.35 })
    bg.rect(ox + 2 + lut * 0.7, -bh + 10, bw - 5, 3).fill({ color: 0xfff0c0, alpha: 0.65 })
    bg.rect(ox + 2 + lut * 0.2, -12, bw - 5, 3).fill({ color: 0xfff0c0, alpha: 0.55 })
    n.addChild(bg)
    c.addChild(n)
    bocker.push(n)
    return n
  }
  bok(x - 86, 62, 18, 0xd8695f)
  bok(x - 64, 74, 20, 0x5f9ed8)
  bok(x - 40, 54, 16, 0xe0b45c, 9)
  // Krukan med en liten planta.
  g.moveTo(x + 32, y - 24).lineTo(x + 74, y - 24).lineTo(x + 68, y + 12).lineTo(x + 38, y + 12).closePath()
    .fill(topLightFill(0xd08a5c, { highlight: 0.26, dark: 0.24 }))
  g.roundRect(x + 27, y - 32, 52, 14, 5).fill(cylinderFill(0xd08a5c, { axis: 'x' }))
    .stroke({ width: 2.5, color: 0xa25c34 })
  for (const [dx, dy, bw] of [[-20, -26, 10], [16, -22, 9], [-2, -34, 8]]) {
    const sx = x + 53
    const sy = y - 30
    g.moveTo(sx, sy).quadraticCurveTo(sx + dx * 0.4, sy + dy * 0.7, sx + dx, sy + dy)
      .stroke({ width: 4, color: 0x3f8548, alpha: 0.85 })
    g.ellipse(sx + dx, sy + dy, bw, bw * 0.62).fill(topLightFill(0x63b063))
  }
  c.bocker = bocker
  return c
}
