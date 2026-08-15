// RUMMET — miljön och de sju gömställena i `titt-ut-pappa` (sidovy, 1280×720).
//
// HELA ILLUSIONEN LIGGER I LAGERORDNINGEN, INTE I EN MASK. Varje gömställe har en `bak`-
// och en `fram`-del med SAMMA origo (ankarpunkten i `RUM`). Ansiktsriggen ligger i ett eget
// lager mellan dem, så möbeln skymmer pappa av sig själv. En "titt över kanten" blir då
// bara en tween uppåt i spelet — ingen mask, ingen `view`-flytt (träffytan och `traffar()`
// mäter den noden och får aldrig röras).
//
// ⚠️ ANKARE, `kantY` OCH `ansY` ÄR RÄKNADE, INTE VALDA. Riggens `manifest.ruta` är 733×800
//    och silhuetten (`geometri.silhuett`) fyller x 158–579, rad 0–94,5 av 100. Vid höjd 300
//    (`k = 0.375`) betyder det: rutan 275×300 px, men den SYNLIGA pappan bara ~158 px bred
//    och 283 px hög, med överkanten 150 px ovanför riggens mitt och hakan 134 px under.
//    Därav de två reglerna som varje gömställe nedan är byggt mot:
//      · `ansY >= kantY + 152`  → hjässan hamnar UNDER fram-delens överkant
//      · fram-delen måste täcka ner till `ansY + 134` ELLER ut ur bild (720)
//    Marginalen är uppmätt 8–16 px överallt. Ändrar du ett ankare: räkna om båda.
//
// ⚠️ INGA TVÅ FÖREMÅL ÖVERLAPPAR VARANDRA I BILD — uppmätt del för del (inte per objekt;
//    gardinstången ligger 300 px ovanför skåpet och gör helhetens bbox lögnaktig). Minsta
//    luft mellan två föremål är 17 px och minsta träffyta 150×130 px. Avståndet mellan två
//    träffytor är minst 53 px — inte 24, för `index.js` lägger en osynlig 24 px-halo runt
//    varje, och två halor som möts gör tryckets ägare till en lagerordningsfråga.
//    (P0 kräver 96/24.) Flyttar du något: kontrollmät BÅDA måtten.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { verticalFill, verticalFillAlpha, topLightFill, cylinderFill, groundFill, sphereFill } from '../../lib/form.js'
import { liv as fbLiv, shake as fbShake } from '../../lib/feedback.js'

// Väggens nederkant / golvlinjen. Golvet är bandet 560–720.
export const GOLV_Y = 560

// Ankarpunkterna i designkoordinater: x = mitten, y = golvlinjen där saken står.
// (`lampa` hänger — där är y lampskärmens undre rand.)
//
// TRE DJUP, och det är de som gör att sex möbler får plats utan att skymma varandra:
//   · VÄGGRADEN   (bas 560, y 233–577): gardinen/fönstret och dörren.
//   · GOLVRADEN   (bas 712, y 372–724): tvättkorgen och kartongen — höga saker som står
//                                       PÅ golvplanet, i x-bandet där väggen är tom.
//   · LÅGA RADEN  (bas 706, y 582–722): filten och krukan — de får stå framför väggradens
//                                       möbler eftersom de aldrig når upp till dem.
// Taklampan hänger över golvradens x-band med 30 px luft ner till kartongens flikar.
export const RUM = {
  gardin: { x: 225, y: 560 },
  kruka: { x: 225, y: 706 },
  tvattkorg: { x: 535, y: 712 },
  lampa: { x: 640, y: 336 },
  kartong: { x: 810, y: 712 },
  dorr: { x: 1120, y: 560 },
  filt: { x: 1105, y: 706 },
}

// De sex spelbara gömställena. `lampa` ritas alltid som rumsdekor men används bara i
// spelets sällsynta wow-läge — den ligger därför utanför listan.
export const NYCKLAR = ['tvattkorg', 'gardin', 'kartong', 'dorr', 'filt', 'kruka']
export const WOW_NYCKEL = 'lampa'

// ------------------------------------------------------------------ palett ---

const F = {
  vaggLjus: 0xf8e9d1, vagg: 0xe7d1ac, vaggRand: 0xf2ddbc, vaggDekor: 0xdcbf95,
  list: 0xfbf4e8, listMork: 0xd2bf9e,
  golv: 0xd6a267, golvFog: 0x9c6a38,
  matta: 0xe08a7b, mattaLjus: 0xf1b6a8,
  tra: 0xd39a5f, traMork: 0x9d6c39,
  korg: 0xe3c48c, korgMork: 0xac8a4e,
  kartong: 0xd9a86b, kartongMork: 0xa87c46,
  dorrblad: 0xc4d9e6, dorrMork: 0x8fb2c8,
  morkt: 0x3a2f26,
  gardin: 0x74b6e2, gardinMork: 0x4189bd,
  skap: 0xd7e3d2, skapMork: 0xa8bda2,
  filt: 0xb08ad8, filtLjus: 0xcaadea, filtMork: 0x8360ab, filtRand: 0xf6e4a0,
  kruka: 0xd98b5e, krukaMork: 0xa25c34,
  blad: 0x63b063, bladMork: 0x3f8548, bladLjus: 0x8ecb7a,
  metall: 0xd3dade, metallMork: 0x99a5ac,
  glod: 0xffe9ae,
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

// Träådring: mjuka bågar. En träyta i EN platt ton rankas av `_plattprobe`.
function adring(g, x0, x1, y, n, farg, alpha = 0.28, steg = 13) {
  for (let i = 0; i < n; i++) {
    const yy = y + i * steg
    g.moveTo(x0, yy).quadraticCurveTo((x0 + x1) / 2, yy + 5, x1, yy)
      .stroke({ width: 2.5, color: farg, alpha })
  }
}

// Ett blad: en spetsig droppe med mittnerv. Används av krukväxten.
function ritaBlad(g, x, y, dx, dy, bredd, farg) {
  const mx = x + dx * 0.5
  const my = y + dy * 0.5
  const nx = -dy
  const ny = dx
  const len = Math.hypot(nx, ny) || 1
  const bx = (nx / len) * bredd
  const by = (ny / len) * bredd
  g.moveTo(x, y)
    .quadraticCurveTo(mx + bx, my + by, x + dx, y + dy)
    .quadraticCurveTo(mx - bx, my - by, x, y)
    .fill(topLightFill(farg))
  g.moveTo(x, y).quadraticCurveTo(mx, my, x + dx, y + dy)
    .stroke({ width: 2, color: F.bladMork, alpha: 0.5 })
}

// ------------------------------------------------------------------- rummet ---

/**
 * Bygger rummet: vägg med tapet och bröstlist, golv med bräder i perspektiv, golvlist,
 * tavla och klocka på väggen. `fram` är mattkanten längst fram.
 * Taklampan ritas INTE här — den kommer ur `makeGomstalle('lampa')`.
 */
export function byggRum(ctx) {
  const v = ctx?.view || {}
  const x0 = Math.min(-260, (v.left ?? 0) - 140)
  const x1 = Math.max(1280 + 260, (v.right ?? 1280) + 140)
  const yTop = Math.min(-160, (v.top ?? 0) - 120)
  const yBot = Math.max(720 + 180, (v.bottom ?? 720) + 140)

  const bak = nyC()
  const fram = nyC()
  bak.interactiveChildren = false
  fram.interactiveChildren = false

  // --- vägg ---------------------------------------------------------------
  const vagg = nyG()
  vagg.rect(x0, yTop, x1 - x0, GOLV_Y - yTop).fill(verticalFill(F.vaggLjus, F.vagg))
  // Breda tapetränder: väggen är bildens största sammanhängande yta och skulle annars
  // ligga i EN ton (`_plattprobe` rankar precis sådana).
  for (let x = -420; x < 1740; x += 76) {
    vagg.rect(x, yTop, 36, GOLV_Y - yTop).fill({ color: F.vaggRand, alpha: 0.45 })
  }
  // Små tapetblommor, deterministiskt rutnät (baslinjebilder ska bli identiska).
  for (let ry = yTop + 46, rad = 0; ry < GOLV_Y - 24; ry += 92, rad++) {
    for (let rx = -400 + (rad % 2) * 38; rx < 1740; rx += 76) {
      for (let p = 0; p < 4; p++) {
        const a = (p / 4) * Math.PI * 2 + 0.4
        vagg.circle(rx + Math.cos(a) * 7, ry + Math.sin(a) * 7, 4.6)
          .fill({ color: F.vaggDekor, alpha: 0.55 })
      }
      vagg.circle(rx, ry, 3.4).fill({ color: 0xf6c96a, alpha: 0.7 })
    }
  }
  // Bröstlist: ligger strax ovanför fönsterbänkens och dörrens överkanter (264/260).
  vagg.rect(x0, 240, x1 - x0, 9).fill(topLightFill(F.list))
  vagg.rect(x0, 249, x1 - x0, 5).fill({ color: F.listMork, alpha: 0.55 })
  bak.addChild(vagg)

  // --- golv ---------------------------------------------------------------
  const golv = nyG()
  golv.rect(x0, GOLV_Y, x1 - x0, yBot - GOLV_Y).fill(groundFill(F.golv, { light: 0.16, dark: 0.24 }))
  // Bräder i perspektiv mot en flyktpunkt ovanför golvlinjen: linjerna glesnar neråt,
  // och då läser golvet som ett PLAN i stället för som en färgad remsa.
  const vpx = 640
  const vpy = 300
  const spann = (yBot - vpy) / (GOLV_Y - vpy)
  const golvX = (px, y) => vpx + (px - vpx) * ((y - vpy) / (GOLV_Y - vpy))
  const kolumner = []
  for (let px = -1500; px <= 2800; px += 122) kolumner.push(px)
  for (const px of kolumner) {
    golv.moveTo(px, GOLV_Y).lineTo(vpx + (px - vpx) * spann, yBot)
      .stroke({ width: 2.5, color: F.golvFog, alpha: 0.3 })
  }
  const rader = [GOLV_Y]
  for (let i = 1; i <= 5; i++) {
    const yy = GOLV_Y + i * i * 9
    if (yy >= yBot) break
    rader.push(yy)
    golv.moveTo(x0, yy).lineTo(x1, yy).stroke({ width: 2, color: F.golvFog, alpha: 0.22 })
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
        .fill(hv === 0 ? { color: 0xffffff, alpha: 0.07 } : { color: F.golvFog, alpha: 0.08 })
    }
  }
  bak.addChild(golv)

  // Golvlist + skuggan där vägg möter golv.
  const list = nyG()
  list.rect(x0, GOLV_Y - 22, x1 - x0, 22).fill(topLightFill(F.list))
  list.rect(x0, GOLV_Y - 22, x1 - x0, 5).fill({ color: 0xffffff, alpha: 0.5 })
  list.rect(x0, GOLV_Y - 3, x1 - x0, 7).fill({ color: F.listMork, alpha: 0.75 })
  list.rect(x0, GOLV_Y + 4, x1 - x0, 14).fill(verticalFillAlpha(F.morkt, F.morkt, 0.16, 0))
  bak.addChild(list)

  // --- väggdekor -----------------------------------------------------------
  // Den enda väggytan som ingen möbel och ingen träffyta rör: x 800–960 ovanför
  // kartongens flikar (374). Tavlan 114–226, klockan 260–340.
  bak.addChild(_tavla(880, 170), _klocka(880, 300))

  // --- mattkanten längst fram ---------------------------------------------
  const matta = nyG()
  matta.roundRect(70, 706, 1140, 130, 46).fill(topLightFill(F.matta, { highlight: 0.24, dark: 0.16 }))
  matta.roundRect(104, 720, 1072, 130, 34).stroke({ width: 5, color: F.mattaLjus, alpha: 0.8 })
  for (let fx = 96; fx < 1190; fx += 26) {
    matta.moveTo(fx, 706).lineTo(fx + 4, 692).stroke({ width: 3, color: F.mattaLjus, alpha: 0.75 })
  }
  matta.rect(70, 706, 1140, 6).fill({ color: 0xffffff, alpha: 0.22 })
  fram.addChild(matta)

  return { bak, fram }
}

// En tavla: ram, passepartout och ett litet landskap i kritstreck.
function _tavla(x, y) {
  const g = nyG()
  const w = 150
  const h = 112
  g.roundRect(x - w / 2 + 5, y - h / 2 + 8, w, h, 6).fill({ color: F.morkt, alpha: 0.13 })
  g.roundRect(x - w / 2, y - h / 2, w, h, 6).fill(topLightFill(F.tra)).stroke({ width: 4, color: F.traMork })
  g.roundRect(x - w / 2 + 11, y - h / 2 + 11, w - 22, h - 22, 3).fill(0xfffaf0)
  g.roundRect(x - w / 2 + 19, y - h / 2 + 19, w - 38, h - 38, 2).fill(verticalFill(0xbfe4f7, 0xe8f6fd))
  g.circle(x + 32, y - 20, 10).fill(0xffd766)
  g.moveTo(x - 56, y + 18).quadraticCurveTo(x - 18, y - 14, x + 14, y + 18)
    .lineTo(x - 56, y + 18).fill(0x8ec97a)
  g.moveTo(x - 12, y + 18).quadraticCurveTo(x + 24, y - 4, x + 56, y + 18)
    .lineTo(x - 12, y + 18).fill(0x67ab63)
  g.roundRect(x - w / 2 + 19, y + h / 2 - 27, w - 38, 8, 2).fill({ color: 0x4f8f52, alpha: 0.5 })
  return g
}

// En väggklocka: vit urtavla, ring, streck och två visare.
function _klocka(x, y) {
  const g = nyG()
  g.circle(x + 3, y + 5, 40).fill({ color: F.morkt, alpha: 0.12 })
  g.circle(x, y, 40).fill(topLightFill(F.tra)).stroke({ width: 4, color: F.traMork })
  g.circle(x, y, 31).fill(sphereFill(0xfffaf0, { highlight: 0.5, dark: 0.14 }))
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.moveTo(x + Math.cos(a) * 26, y + Math.sin(a) * 26)
      .lineTo(x + Math.cos(a) * (i % 3 === 0 ? 19 : 22), y + Math.sin(a) * (i % 3 === 0 ? 19 : 22))
      .stroke({ width: i % 3 === 0 ? 3 : 2, color: F.morkt, alpha: 0.6 })
  }
  g.moveTo(x, y).lineTo(x + 2, y - 18).stroke({ width: 4, color: F.morkt })
  g.moveTo(x, y).lineTo(x + 20, y + 7).stroke({ width: 3, color: F.morkt })
  g.circle(x, y, 4).fill(0xe0603f)
  return g
}

// ------------------------------------------------------------- gömställena ---
//
// Varje byggare får en `to`-funktion som registrerar sina tweens (så `destroy()` kan döda
// varenda en) och returnerar allt som gömstället behöver. Alla koordinater är RELATIVA
// ankarpunkten: (0,0) = golvet, mitten.

function byggTvattkorg(to) {
  // Hög flätad tvättkorg på golvplanet: lock på glänt och kläder som kikar upp under det.
  // Allt ovanför kanten håller sig under y-rel -330 (bild 382) — taklampans underkant
  // ligger på 342 och de två får inte mötas.
  const bakG = nyG()
  bakG.roundRect(-116, -304, 232, 96, 12).fill(verticalFill(0x6b5334, 0x40301d))
  // Kläder ovanför kanten (BAKOM pappa — de ska aldrig skymma honom när han reser sig).
  bakG.roundRect(-92, -330, 74, 52, 22).fill(topLightFill(0xef7f7f)).stroke({ width: 3, color: 0xc85a5a })
  bakG.roundRect(-24, -336, 78, 58, 24).fill(topLightFill(0x6fb3e8)).stroke({ width: 3, color: 0x4a8cc0 })
  bakG.roundRect(40, -324, 58, 44, 19).fill(topLightFill(0xf6d26a)).stroke({ width: 3, color: 0xd0a63f })
  bakG.moveTo(-58, -312).quadraticCurveTo(-38, -326, -18, -312).stroke({ width: 3, color: 0xc85a5a, alpha: 0.7 })

  // Korgens front: kanten på -292 är den linje pappa tittar över, botten +12 täcker hakan.
  const korg = nyG()
  korg.ellipse(0, 14, 128, 18).fill({ color: F.morkt, alpha: 0.16 })
  korg.moveTo(-120, -276).lineTo(120, -276).lineTo(110, 12).lineTo(-110, 12).closePath()
    .fill(topLightFill(F.korg, { highlight: 0.28, dark: 0.24 }))
  // Flätningen: vågräta band + korta lodräta stygn.
  for (let i = 0; i < 8; i++) {
    const yy = -258 + i * 34
    const k = 119 - i * 1.3
    korg.moveTo(-k, yy).quadraticCurveTo(0, yy + 8, k, yy)
      .stroke({ width: 9, color: F.korgMork, alpha: 0.32 })
  }
  for (let i = 0; i < 11; i++) {
    const xx = -108 + i * 21.6
    korg.moveTo(xx, -272).lineTo(xx - xx * 0.08, 8).stroke({ width: 3, color: F.korgMork, alpha: 0.28 })
  }
  // Handtagshål i sidorna.
  korg.roundRect(-96, -190, 42, 18, 9).fill({ color: 0x59431f, alpha: 0.55 })
  korg.roundRect(54, -190, 42, 18, 9).fill({ color: 0x59431f, alpha: 0.55 })
  // Kant och fot.
  korg.roundRect(-124, -292, 248, 24, 11).fill(cylinderFill(F.korg, { axis: 'x' }))
    .stroke({ width: 3, color: F.korgMork })
  korg.roundRect(-116, 4, 232, 16, 7).fill(verticalFill(F.korgMork, 0x7d6636))

  // Locket: ligger på glänt över kanten och lyfts vid avslöjandet.
  const lock = nyC()
  const lockG = nyG()
  lockG.roundRect(0, -14, 248, 22, 11).fill(topLightFill(F.korg, { highlight: 0.34 }))
    .stroke({ width: 3, color: F.korgMork })
  lockG.moveTo(12, -5).quadraticCurveTo(124, 2, 236, -5).stroke({ width: 4, color: F.korgMork, alpha: 0.35 })
  lockG.roundRect(108, -26, 32, 14, 7).fill(cylinderFill(F.tra, { axis: 'x' }))
  lock.addChild(lockG)
  lock.position.set(-124, -298)
  lock.rotation = -0.045

  return {
    bakDelar: [bakG],
    framDelar: [korg, lock],
    buktNod: korg,
    bukt: { sx: 0.045, sy: -0.03 },
    livNoder: [{ n: lock, bob: 2, sway: 0.01, duration: 3.1 }],
    noder: [lock, lockG, korg, bakG],
    kantY: -292,
    ansX: 0,
    ansY: -134,
    hit: { x: -111, y: -292, w: 222, h: 280 },
    oppna: () => {
      to(lock, { rotation: -0.6, y: -318, duration: 0.34, ease: 'back.out(1.6)' })
    },
    stang: () => {
      to(lock, { rotation: -0.045, y: -298, duration: 0.3, ease: 'power2.inOut' })
    },
  }
}

function byggGardin(to) {
  // Fönster med dagsljus, två gardinvåder och ett lågt skåp med fönsterbräda. Pappa
  // gömmer sig BAKOM skåpet och tittar upp över brädan; gardinerna delar sig vid
  // avslöjandet så att han står i dagsljuset.
  const bakG = nyG()
  // Karm + glas (fönsterhålet: y -490..-296, alltså 70..264 i bild).
  bakG.roundRect(-146, -496, 292, 206, 10).fill(topLightFill(F.tra)).stroke({ width: 4, color: F.traMork })
  bakG.roundRect(-130, -482, 260, 178, 5).fill(verticalFill(0x9fd9f7, 0xe6f5fe))
  // Utsikt: sol, moln, kullar.
  bakG.circle(74, -440, 23).fill(0xffdf8a)
  bakG.circle(68, -446, 11).fill({ color: 0xfff3c8, alpha: 0.85 })
  bakG.ellipse(-64, -432, 30, 13).fill({ color: 0xffffff, alpha: 0.92 })
  bakG.ellipse(-42, -438, 22, 12).fill({ color: 0xffffff, alpha: 0.92 })
  bakG.ellipse(18, -402, 26, 11).fill({ color: 0xffffff, alpha: 0.8 })
  // ⚠️ Kullarna måste hålla sig innanför glaset (±130). Ritas de bredare rinner de ut
  //    ÖVER karmen och lägger sig som gröna klumpar på tapeten — karmen ritades före dem.
  bakG.ellipse(-58, -318, 72, 40).fill(0x8ecb7a)
  bakG.ellipse(62, -312, 66, 34).fill(0x67ab63)
  bakG.ellipse(-6, -326, 46, 26).fill({ color: 0x5c9c59, alpha: 0.95 })
  // Spröjs och nedre karmstycke (det senare klipper kullarna mot brädan).
  bakG.rect(-7, -482, 14, 178).fill(topLightFill(F.list))
  bakG.rect(-130, -406, 260, 13).fill(topLightFill(F.list))
  bakG.rect(-134, -312, 268, 20).fill(topLightFill(F.tra)).stroke({ width: 3, color: F.traMork })
  // Gardinstång med kulor.
  bakG.roundRect(-164, -524, 328, 14, 7).fill(cylinderFill(F.tra, { axis: 'x' }))
  bakG.circle(-168, -517, 11).fill(sphereFill(F.tra))
  bakG.circle(168, -517, 11).fill(sphereFill(F.tra))

  // Gardinvåderna: två fristående våder med vågig fåll och veck.
  const vader = nyC()
  const gjord = []
  for (const sida of [-1, 1]) {
    const v = nyC()
    const g = nyG()
    const yttre = sida * 168
    const inner = sida * 46
    // Polygon: rak överkant, vågig fåll.
    g.moveTo(yttre, -510)
    g.lineTo(inner, -510)
    g.lineTo(inner, -300)
    g.quadraticCurveTo(sida * 76, -282, sida * 106, -300)
    g.quadraticCurveTo(sida * 138, -318, yttre, -300)
    g.closePath()
    g.fill(topLightFill(F.gardin, { highlight: 0.34, dark: 0.26 }))
    // Veck: lodräta band i två toner, det är de som ger tyget volym.
    for (let i = 0; i < 4; i++) {
      const t = (i + 0.5) / 4
      const xx = yttre + (inner - yttre) * t
      g.moveTo(xx, -506).quadraticCurveTo(xx + sida * 6, -404, xx, -302)
        .stroke({ width: 9, color: i % 2 ? F.gardinMork : 0xa9d6f2, alpha: 0.32 })
    }
    // Gardinkappa i överkanten.
    g.roundRect(sida < 0 ? -170 : -2, -518, 172, 20, 8).fill(cylinderFill(F.gardin, { axis: 'x' }))
      .stroke({ width: 3, color: F.gardinMork, alpha: 0.6 })
    v.addChild(g)
    // Pivot i den YTTRE kanten så våden dras samman utåt vid `oppna()`.
    const px = sida < 0 ? -168 : 168
    v.pivot.set(px, -510)
    v.position.set(px, -510)
    vader.addChild(v)
    gjord.push(v)
  }
  // Bukten hör hemma i tyget: pivot i fållen så våderna sväller nedtill.
  vader.pivot.set(0, -300)
  vader.position.set(0, -300)

  // Skåpet under fönstret: fönsterbräda + korpus + socken. Överkanten (-296) är kanten
  // pappa tittar över; korpusen når +12 så hakan (ansY + 134 = -10) är väl täckt.
  const skap = nyG()
  skap.roundRect(-150, -298, 300, 24, 7).fill(topLightFill(F.tra)).stroke({ width: 3, color: F.traMork })
  adring(skap, -138, 138, -290, 1, F.traMork, 0.3)
  skap.roundRect(-138, -276, 276, 286, 8).fill(verticalFill(F.skap, F.skapMork))
    .stroke({ width: 4, color: F.skapMork })
  for (const px of [-70, 70]) {
    skap.roundRect(px - 56, -252, 112, 200, 8).fill({ color: 0xffffff, alpha: 0.28 })
      .stroke({ width: 3, color: F.skapMork, alpha: 0.85 })
    skap.circle(px, -152, 11).fill(sphereFill(F.tra))
  }
  skap.roundRect(-134, 0, 268, 12, 6).fill(verticalFill(F.skapMork, 0x86987f))
  skap.ellipse(0, 8, 138, 5).fill({ color: F.morkt, alpha: 0.16 })

  return {
    bakDelar: [bakG],
    framDelar: [vader, skap],
    buktNod: vader,
    bukt: { sx: 0.05, sy: 0.035 },
    livNoder: [{ n: vader, bob: 3, sway: 0.012, duration: 3.4 }],
    noder: [vader, gjord[0], gjord[1], skap, bakG],
    kantY: -298,
    ansX: 0,
    ansY: -140,
    hit: { x: -140, y: -300, w: 280, h: 268 },
    oppna: () => {
      to(gjord[0].scale, { x: 0.5, duration: 0.36, ease: 'power2.out' })
      to(gjord[1].scale, { x: 0.5, duration: 0.36, ease: 'power2.out' })
    },
    stang: () => {
      to(gjord[0].scale, { x: 1, duration: 0.34, ease: 'power2.inOut' })
      to(gjord[1].scale, { x: 1, duration: 0.34, ease: 'power2.inOut' })
    },
  }
}

function byggKartong(to) {
  // Flyttkartong med fyra flikar: de två bakre står upp bakom pappa, de två främre
  // ligger på glänt och viker ut vid avslöjandet.
  const bakG = nyG()
  bakG.roundRect(-112, -316, 224, 96, 8).fill(verticalFill(0x7a5a34, 0x4a3520))
  // Bakre flikar, lätt bakåtvikta.
  bakG.moveTo(-116, -300).lineTo(-80, -334).lineTo(30, -334).lineTo(-2, -300).closePath()
    .fill(topLightFill(0xc79a62, { dark: 0.3 })).stroke({ width: 3, color: F.kartongMork, alpha: 0.7 })
  bakG.moveTo(2, -300).lineTo(34, -334).lineTo(124, -334).lineTo(116, -300).closePath()
    .fill(topLightFill(0xbf9159, { dark: 0.3 })).stroke({ width: 3, color: F.kartongMork, alpha: 0.7 })

  const box = nyG()
  box.ellipse(0, 14, 126, 18).fill({ color: F.morkt, alpha: 0.18 })
  box.moveTo(-120, -300).lineTo(120, -300).lineTo(114, 12).lineTo(-114, 12).closePath()
    .fill(topLightFill(F.kartong, { highlight: 0.24, dark: 0.26 }))
  // Sidan: en mörkare remsa som ger lådan volym i stället för att vara en platt lapp.
  box.moveTo(-120, -300).lineTo(-82, -296).lineTo(-78, 10).lineTo(-114, 12).closePath()
    .fill({ color: F.kartongMork, alpha: 0.3 })
  // Wellpappkant i överkanten.
  for (let i = 0; i < 20; i++) {
    const xx = -118 + i * 12
    box.moveTo(xx, -300).quadraticCurveTo(xx + 6, -292, xx + 12, -300)
      .stroke({ width: 2.4, color: F.kartongMork, alpha: 0.5 })
  }
  // Tejp i kors + en fraktetikett (ritad som linjer, aldrig text).
  box.rect(-26, -292, 52, 302).fill({ color: 0xf0e2c2, alpha: 0.75 })
  box.rect(-116, -166, 232, 28).fill({ color: 0xf0e2c2, alpha: 0.6 })
  box.roundRect(22, -110, 84, 62, 5).fill(0xfdf6e6).stroke({ width: 3, color: F.kartongMork, alpha: 0.7 })
  for (let i = 0; i < 3; i++) {
    box.rect(31, -98 + i * 15, 66 - i * 16, 7).fill({ color: F.kartongMork, alpha: 0.55 })
  }
  box.moveTo(-100, -60).lineTo(-48, -60).moveTo(-100, -40).lineTo(-66, -40)
    .stroke({ width: 5, color: F.kartongMork, alpha: 0.35 })

  // Främre flikar: gångjärn i lådans övre hörn. Vilovinkeln 0,10 rad är TAKAD av
  // taklampan — en brantare flik når upp i skärmen (mätt: 0,22 rad gav 342 i bild).
  const flikar = []
  for (const sida of [-1, 1]) {
    const f = nyC()
    const g = nyG()
    if (sida < 0) g.roundRect(0, -22, 120, 24, 7).fill(topLightFill(F.kartong)).stroke({ width: 3, color: F.kartongMork })
    else g.roundRect(-120, -22, 120, 24, 7).fill(topLightFill(F.kartong)).stroke({ width: 3, color: F.kartongMork })
    f.addChild(g)
    f.position.set(sida * 120, -300)
    f.rotation = sida * 0.16
    flikar.push(f)
  }

  return {
    bakDelar: [bakG],
    framDelar: [box, flikar[0], flikar[1]],
    buktNod: box,
    bukt: { sx: 0.05, sy: -0.025 },
    livNoder: [{ n: flikar[0], bob: 1.6, sway: 0.014, duration: 3.6 }],
    noder: [box, flikar[0], flikar[1], bakG],
    kantY: -300,
    ansX: 0,
    ansY: -142,
    hit: { x: -111, y: -300, w: 222, h: 290 },
    oppna: () => {
      to(flikar[0], { rotation: -1.7, duration: 0.36, ease: 'back.out(1.4)' })
      to(flikar[1], { rotation: 1.7, duration: 0.36, ease: 'back.out(1.4)' })
    },
    stang: () => {
      to(flikar[0], { rotation: -0.16, duration: 0.32, ease: 'power2.inOut' })
      to(flikar[1], { rotation: 0.16, duration: 0.32, ease: 'power2.inOut' })
    },
  }
}

function byggDorr(to) {
  // Dörr på glänt i en karm. Bakom bladet ligger en mörk hall med en varm ljusstrimma.
  const bakG = nyG()
  bakG.rect(-116, -304, 232, 312).fill(verticalFill(0x4c4038, 0x241d18))
  bakG.rect(74, -304, 42, 312).fill(verticalFillAlpha(0xffd9a0, 0xffd9a0, 0.24, 0.06))
  bakG.rect(-116, -14, 232, 22).fill({ color: 0x14100c, alpha: 0.5 })
  // En krok med en jacka längst in — hallen ska läsa som ett rum, inte som ett hål.
  bakG.roundRect(-72, -262, 12, 20, 5).fill({ color: F.metallMork, alpha: 0.8 })
  bakG.moveTo(-66, -244).quadraticCurveTo(-104, -190, -92, -122)
    .quadraticCurveTo(-66, -104, -40, -122).quadraticCurveTo(-30, -190, -66, -244)
    .fill({ color: 0x5d7f9c, alpha: 0.85 })

  const blad = nyC()
  const bladG = nyG()
  bladG.roundRect(-112, -300, 224, 308, 5).fill(verticalFill(F.dorrblad, F.dorrMork))
    .stroke({ width: 4, color: F.dorrMork })
  for (const [py, ph] of [[-284, 128], [-142, 138]]) {
    bladG.roundRect(-88, py, 176, ph, 6).fill({ color: 0xffffff, alpha: 0.3 })
      .stroke({ width: 4, color: F.dorrMork, alpha: 0.8 })
    bladG.roundRect(-76, py + 10, 152, ph - 20, 4).stroke({ width: 2.5, color: F.dorrMork, alpha: 0.5 })
  }
  bladG.roundRect(74, -158, 16, 44, 7).fill(cylinderFill(F.metall))
  bladG.circle(82, -136, 13).fill(sphereFill(0xe8c86a))
  bladG.rect(-112, -300, 10, 308).fill({ color: 0xffffff, alpha: 0.22 })
  blad.addChild(bladG)
  blad.pivot.set(-112, -300)
  blad.position.set(-112, -300)

  // Karmen ligger UTANFÖR bukten: en foderlist som sväller läser som gummi.
  const karm = nyG()
  karm.rect(-136, -326, 24, 334).fill(topLightFill(F.list)).stroke({ width: 3, color: F.listMork })
  karm.rect(112, -326, 24, 334).fill(topLightFill(F.list)).stroke({ width: 3, color: F.listMork })
  karm.rect(-136, -326, 272, 26).fill(topLightFill(F.list)).stroke({ width: 3, color: F.listMork })
  karm.rect(-126, 2, 252, 10).fill(verticalFill(F.tra, F.traMork))
  karm.ellipse(0, 8, 118, 4).fill({ color: F.morkt, alpha: 0.16 })

  return {
    bakDelar: [bakG],
    framDelar: [blad, karm],
    buktNod: blad,
    bukt: { sx: 0.035, sy: -0.015 },
    livNoder: [{ n: blad, bob: 1.2, sway: 0.004, duration: 4.2 }],
    noder: [blad, bladG, karm, bakG],
    kantY: -300,
    ansX: 0,
    ansY: -142,
    hit: { x: -125, y: -300, w: 250, h: 268 },
    oppna: () => {
      to(blad.scale, { x: 0.16, duration: 0.38, ease: 'power2.out' })
    },
    stang: () => {
      to(blad.scale, { x: 1, duration: 0.34, ease: 'back.out(1.4)' })
    },
  }
}

function byggFilt(to) {
  // En hög med filtar på golvet. Översta viket kastas åt sidan vid avslöjandet.
  const bakG = nyG()
  bakG.ellipse(0, -58, 128, 42).fill({ color: 0x6a4b7a, alpha: 0.32 })
  bakG.moveTo(58, -92).quadraticCurveTo(88, -130, 118, -108)
    .quadraticCurveTo(102, -90, 58, -92).fill(topLightFill(F.filtLjus))

  const hog = nyG()
  hog.ellipse(0, 16, 140, 20).fill({ color: F.morkt, alpha: 0.16 })
  // Understa lagret.
  hog.roundRect(-135, -52, 270, 72, 30).fill(topLightFill(F.filtMork, { highlight: 0.28 }))
  // Mellanlager med vågig ovansida.
  hog.moveTo(-130, -50).quadraticCurveTo(-64, -94, 4, -76)
    .quadraticCurveTo(72, -58, 130, -82).lineTo(132, -20)
    .quadraticCurveTo(0, -6, -132, -20).closePath()
    .fill(topLightFill(F.filt, { highlight: 0.3, dark: 0.22 }))
  // Ränder: det är de som gör tyget till en FILT och inte till en kudde.
  for (let i = 0; i < 3; i++) {
    hog.moveTo(-126, -44 + i * 16).quadraticCurveTo(0, -20 + i * 16, 126, -46 + i * 16)
      .stroke({ width: 7, color: F.filtRand, alpha: 0.5 })
  }
  // Fransar längs nederkanten.
  for (let fx = -122; fx <= 122; fx += 17) {
    hog.moveTo(fx, 14).lineTo(fx + 3, 26).stroke({ width: 4, color: F.filtRand, alpha: 0.65 })
  }

  // Översta viket: eget veck med pivot i höger nederkant.
  const vik = nyC()
  const vikG = nyG()
  vikG.moveTo(-118, -66).quadraticCurveTo(-56, -108, 10, -94)
    .quadraticCurveTo(72, -80, 118, -100).lineTo(120, -56)
    .quadraticCurveTo(0, -28, -120, -50).closePath()
    .fill(topLightFill(F.filtLjus, { highlight: 0.3, dark: 0.2 }))
  vikG.moveTo(-110, -70).quadraticCurveTo(-18, -100, 110, -88)
    .stroke({ width: 6, color: F.filtRand, alpha: 0.55 })
  vikG.moveTo(-110, -52).quadraticCurveTo(-18, -80, 110, -66)
    .stroke({ width: 5, color: F.filtMork, alpha: 0.3 })
  vik.addChild(vikG)
  vik.pivot.set(118, -58)
  vik.position.set(118, -58)

  return {
    bakDelar: [bakG],
    framDelar: [hog, vik],
    buktNod: hog,
    bukt: { sx: 0.035, sy: -0.16 },
    livNoder: [{ n: vik, bob: 2.4, sway: 0.01, duration: 3.2 }],
    noder: [hog, vik, vikG, bakG],
    kantY: -118,
    ansX: 0,
    ansY: 48,
    hit: { x: -130, y: -124, w: 260, h: 132 },
    oppna: () => {
      to(vik, { rotation: 0.62, x: 158, y: -42, duration: 0.36, ease: 'back.out(1.3)' })
    },
    stang: () => {
      to(vik, { rotation: 0, x: 118, y: -58, duration: 0.34, ease: 'power2.inOut' })
    },
  }
}

function byggKruka(to) {
  // ⚠️ KRUKAN ÄR MED FLIT ALLDELES FÖR LITEN. Alla andra gömställen döljer pappa helt
  //    (`ansY >= kantY + 152`); här står `ansY` på -40 så pappa sticker upp 124 px ovanför
  //    en 76 px hög kruka. Det är spelets skämt, inte ett räknefel — barnet ska SE honom
  //    och skratta. Rör inte talet utan att läsa docs/games/titt-ut-pappa.md.
  const bakG = nyG()
  bakG.ellipse(0, -62, 44, 11).fill(0x5b4230)
  // ⚠️ VÄXTEN LIGGER I FRAM-DELEN, INTE I BAK. Bladen stod först bakom ansiktet, och då
  //    svalde pappas huvud dem helt: kvar blev en naken kruka mitt i hans ansikte, som
  //    läste som ett munskydd i terrakotta i stället för som något han gömmer sig bakom.
  //    Framför honom gör de precis vad skämtet behöver — han kikar fram MELLAN bladen på
  //    en växt som är löjligt för liten. Bladen ligger FÖRE krukan i `framDelar`, så
  //    krukans framkant fortfarande täcker stjälkarnas fästen.
  const bladG = nyG()
  const stjalk = [
    [-6, -56, -46, -30, 13, F.blad],
    [5, -56, 44, -26, 13, F.bladMork],
    [-3, -58, -24, -44, 12, F.bladLjus],
    [3, -58, 26, -40, 12, F.blad],
    [0, -60, 1, -46, 10, F.bladLjus],
  ]
  for (const [sx, sy, dx, dy, w, c] of stjalk) {
    bladG.moveTo(sx, sy).quadraticCurveTo(sx + dx * 0.4, sy + dy * 0.7, sx + dx, sy + dy)
      .stroke({ width: 5, color: F.bladMork, alpha: 0.8 })
    ritaBlad(bladG, sx + dx * 0.35, sy + dy * 0.35, dx * 0.85, dy * 0.85, w, c)
  }

  const potNod = nyC()
  const pot = nyG()
  pot.ellipse(0, 10, 50, 10).fill({ color: F.morkt, alpha: 0.18 })
  pot.moveTo(-46, -56).lineTo(46, -56).lineTo(35, 6).lineTo(-35, 6).closePath()
    .fill(topLightFill(F.kruka, { highlight: 0.28, dark: 0.26 }))
  pot.roundRect(-53, -66, 106, 18, 6).fill(cylinderFill(F.kruka, { axis: 'x' }))
    .stroke({ width: 3, color: F.krukaMork })
  pot.moveTo(-36, -42).quadraticCurveTo(0, -36, 36, -42).stroke({ width: 3, color: F.krukaMork, alpha: 0.4 })
  pot.moveTo(-32, -34).lineTo(-26, 0).stroke({ width: 5, color: 0xffffff, alpha: 0.2 })
  potNod.addChild(pot)
  potNod.pivot.set(32, 6)
  potNod.position.set(32, 6)

  return {
    bakDelar: [bakG],
    framDelar: [bladG, potNod],
    buktNod: potNod,
    bukt: { sx: 0.07, sy: -0.05 },
    livNoder: [{ n: bladG, bob: 2.6, sway: 0.02, duration: 3.8 }],
    noder: [potNod, pot, bladG, bakG],
    kantY: -66,
    ansX: 0,
    // ⚠️ KRUKAN ÄR DET AVSIKTLIGA UNDANTAGET från `ansY >= kantY + 152` — hon är för liten
    //    och halva pappa SKA synas (spelets skämt i runda 3). Talet stod först på −40, och
    //    det var fel av ett skäl som bara syntes i bild: ansiktets mitt hamnade då på y 666,
    //    så hjässan låg på 516 och hakan 66 px NEDANFÖR bildkanten. Det läste inte som
    //    "dåligt gömd bakom en kruka" utan som ett avskuret huvud som stack upp ur golvet,
    //    med krukan klistrad över munnen. −116 lägger mitten på 590: hela huvudet är i bild,
    //    krukan täcker haka och mun, och ögonen tittar över kanten på den. Uppmätt med
    //    `scripts/_gommaprobe.mjs`.
    ansY: -116,
    hit: { x: -75, y: -122, w: 150, h: 130 },
    oppna: () => {
      to(potNod, { rotation: 0.34, duration: 0.32, ease: 'back.out(1.5)' })
    },
    stang: () => {
      to(potNod, { rotation: 0, duration: 0.32, ease: 'power2.inOut' })
    },
  }
}

function byggLampa(to) {
  // Taklampan: sladd och ljuskägla bakom, skärmen framför. Skärmen är en rak trumma
  // (300 px bred, 306 px hög) just för att den ska kunna gömma hela riggen — en rundad
  // lykta smalnar av nedtill och släpper fram hakan.
  const bakG = nyG()
  // Sladden går upp genom bildkanten — takrosetten ligger utanför rutan, precis som i ett
  // riktigt rum där taket är ovanför bilden.
  bakG.rect(-5, -420, 10, 126).fill(cylinderFill(0x7a6650))
  // Skenet: en tajt glorja runt skärmens underrand. En bred ljuskägla hade lagt sig som
  // en gul hinna över tvättkorgen och kartongen (deras överkanter börjar 30 px under).
  bakG.ellipse(0, -14, 104, 18).fill(verticalFillAlpha(F.glod, F.glod, 0.3, 0))

  const skarm = nyC()
  const skarmG = nyG()
  // Halva bredden vid höjden y: 100 uppe (-310) → 150 nere (0). Utan den avsmalningen
  // läser skärmen som en rullgardin — uppmätt i skärmdumpen med raka sidor.
  const kb = (y) => 90 + 40 * ((y + 310) / 310)
  skarmG.roundRect(-24, -324, 48, 16, 7).fill(cylinderFill(F.metall, { axis: 'x' }))
    .stroke({ width: 2.5, color: F.metallMork })
  skarmG.moveTo(-90, -310).lineTo(90, -310).lineTo(130, 0).lineTo(-130, 0).closePath()
    .fill(verticalFill(0xf7d9a2, 0xe0ac66))
  // Revben + två ringar: en lampskärm i EN ton läser som en pappkloss.
  for (let i = 1; i < 6; i++) {
    const t = i / 6
    skarmG.moveTo(-90 + 180 * t, -304).lineTo(-130 + 260 * t, -6)
      .stroke({ width: 3, color: 0xc08a45, alpha: 0.3 })
  }
  for (const yy of [-214, -108]) {
    skarmG.moveTo(-kb(yy), yy).lineTo(kb(yy), yy).stroke({ width: 3, color: 0xc08a45, alpha: 0.26 })
  }
  skarmG.moveTo(-82, -300).lineTo(-108, -14).lineTo(-82, -14).lineTo(-64, -300).closePath()
    .fill({ color: 0xffffff, alpha: 0.24 })
  skarmG.roundRect(-134, -12, 268, 18, 9).fill(cylinderFill(0xe8b877, { axis: 'x' }))
    .stroke({ width: 3, color: 0xb5813f })
  skarmG.ellipse(0, 0, 114, 13).fill({ color: F.glod, alpha: 0.7 })
  skarm.addChild(skarmG)
  skarm.pivot.set(0, -310)
  skarm.position.set(0, -310)

  return {
    bakDelar: [bakG],
    framDelar: [skarm],
    buktNod: skarm,
    bukt: { sx: 0.055, sy: 0.05 },
    // Lampan svänger kring TAKET, inte kring skärmens underkant — därför flyttas
    // liv-nodens pivot dit (se `_livPivot` nedan).
    livNoder: [{ n: null, bob: 2.5, sway: 0.026, duration: 4.6, pivotY: -410 }],
    noder: [skarm, skarmG, bakG],
    // ⚠️ LAMPANS `kantY` ÄR INTE SKÄRMENS ÖVERKANT, och det är med flit. Spelet räknar
    //    `kik = ankare + kantY − 26 − ögonDy` och `upp = ankare + kantY − 0,42·300` — båda
    //    ANTAR att man tittar upp över en möbelkant. Med skärmens verkliga överkant (−310)
    //    hamnar avslöjandet på y = −100, alltså UTANFÖR BILDEN: wow-läget hade varit osynligt.
    //    +60 sätter i stället `upp` på 336+60−126 = y 270 → hans ansikte hänger fritt under
    //    skärmen när den lyfts (`oppna` drar upp den 160 px, som en hatt). Kik-värdet hamnar
    //    då under gömställets y och kortsluts av spelets egen klämma "aldrig kika nedåt" —
    //    taklampan skvallrar med bukt och skakning i stället, vilket är rätt: ingen tittar
    //    fram över kanten på en lampa.
    kantY: 60,
    ansX: 0,
    ansY: -142,
    hit: { x: -140, y: -292, w: 280, h: 280 },
    oppna: () => {
      to(skarm, { rotation: -0.22, y: -470, duration: 0.44, ease: 'back.out(1.4)' })
    },
    stang: () => {
      to(skarm, { rotation: 0, y: -310, duration: 0.36, ease: 'power2.inOut' })
    },
  }
}

const BYGGARE = {
  tvattkorg: byggTvattkorg,
  gardin: byggGardin,
  kartong: byggKartong,
  dorr: byggDorr,
  filt: byggFilt,
  kruka: byggKruka,
  lampa: byggLampa,
}

// --------------------------------------------------------------- städning ---

// Dödar ALLT som kan hänga kvar på en nod. `gsap.killTweensOf(nod)` når varken
// `.scale`/`.position` (egna objekt) eller feedback.js egna tweens, som ligger som
// `_fxLiv`/`_fxShakeTw` på målet och tweenar ett proxy-objekt.
function stadaNod(n) {
  if (!n) return
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

/**
 * Bygger ett gömställe. Se filhuvudet för kontraktet.
 *
 * `bak` och `fram` positioneras HÄR till sin ankarpunkt ur `RUM`, så den som monterar dem
 * bara behöver lägga dem i rätt lager (`_bakL` respektive `_framL`). Sätter anroparen
 * samma position en gång till är det en no-op.
 */
export function makeGomstalle(key) {
  const ank = RUM[key]
  const byggare = BYGGARE[key]
  if (!ank || !byggare) throw new Error(`titt-ut-pappa/rummet: okänt gömställe "${key}"`)

  const tweens = []
  const to = (mal, vars) => {
    const tw = gsap.to(mal, vars)
    tweens.push(tw)
    return tw
  }
  const spec = byggare(to)

  const bak = nyC()
  const fram = nyC()
  const bakInre = nyC()
  const framInre = nyC()
  for (const c of [bak, fram]) {
    c.interactiveChildren = false
    c.position.set(ank.x, ank.y)
  }
  bak.addChild(bakInre)
  fram.addChild(framInre)
  for (const d of spec.bakDelar || []) bakInre.addChild(d)
  for (const d of spec.framDelar || []) framInre.addChild(d)

  // Bukt-noden får sin pivot flyttad av byggaren där det behövs (gardinens fåll,
  // lampans upphängning). Ligger den kvar i origo sväller föremålet från golvet — vilket
  // är rätt för korg, kartong, dörr, filt och kruka.
  const buktNod = spec.buktNod || null

  // Liv-noderna: en nod utan `n` betyder "hela fram-delen", och `pivotY` flyttar
  // rotationscentrum (lampan svänger kring taket).
  const livSpec = (spec.livNoder || []).map((L) => {
    const n = L.n || framInre
    if (L.pivotY != null) {
      n.pivot.set(0, L.pivotY)
      n.position.set(n.position.x, L.pivotY)
    }
    return { ...L, n, viloY: n.y, viloRot: n.rotation }
  })

  // `bak` och `fram` står med i städlistan trots att filen aldrig animerar dem själv:
  // anroparen gör det (spelet kör `wiggle(g.fram)` på ett tomt gömställe), och en tween
  // som skriver `rotation` på en förstörd Container är precis den kraschen `_alive` inte
  // fångar. Ägaren av noden städar den — inte den som råkade tweena den.
  const alla = [bak, fram, bakInre, framInre, ...(spec.noder || []), ...livSpec.map((L) => L.n)]

  return {
    key,
    bak,
    fram,
    kantY: spec.kantY,
    ansX: spec.ansX ?? 0,
    ansY: spec.ansY,
    hit: spec.hit,
    _oppen: false,
    _levande: true,

    // 0..1 — fram-delen sväller mjukt i andningens takt. Ren funktion av `v`: samma
    // värde ger samma bild, och den skriver bara två tal per bildruta.
    bukt(v) {
      if (!this._levande || !buktNod || buktNod.destroyed) return
      const t = kl01(v)
      buktNod.scale.set(1 + (spec.bukt?.sx ?? 0.05) * t, 1 + (spec.bukt?.sy ?? -0.02) * t)
    },

    // Kort synlig skakning — fnissskvallret. Skakningen ligger på de inre behållarna, så
    // varken ankarpunkten eller träffytan flyttar sig.
    skaka() {
      if (!this._levande) return
      fbShake(framInre, { intensity: 7, duration: 0.42 })
      fbShake(bakInre, { intensity: 5, duration: 0.42 })
    },

    // Avslöjandet: locket lyfter, gardinen delar sig, dörren svänger upp, flikarna viker
    // ut, filten kastas åt sidan, krukan lutar, lampskärmen lyfts.
    oppna() {
      if (!this._levande || this._oppen) return
      this._oppen = true
      spec.oppna()
    },

    stang() {
      if (!this._levande || !this._oppen) return
      this._oppen = false
      spec.stang()
    },

    // Vilo-rörelse med EGEN FAS: två gömställen ska aldrig gunga i takt.
    liv() {
      if (!this._levande) return
      const fas = Math.random()
      for (const L of livSpec) {
        if (!L.n || L.n.destroyed) continue
        // Nollställ först: `fbLiv` läser viloläget ur noden, och en andra körning mitt i
        // en gungning skulle annars ta det förskjutna värdet som ny bas.
        L.n._fxLiv?.kill()
        L.n.y = L.viloY
        L.n.rotation = L.viloRot
        fbLiv(L.n, { bob: L.bob, sway: L.sway, duration: L.duration, phase: fas })
      }
    },

    destroy() {
      this._levande = false
      for (const tw of tweens) tw?.kill()
      tweens.length = 0
      for (const n of alla) stadaNod(n)
      if (!bak.destroyed) bak.destroy({ children: true })
      if (!fram.destroyed) fram.destroy({ children: true })
    },
  }
}
