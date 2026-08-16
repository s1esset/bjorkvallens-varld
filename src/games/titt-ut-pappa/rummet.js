// RUMMET — miljön och de elva gömställena i `titt-ut-pappa` (sidovy med djup, 1280×720).
//
// HELA ILLUSIONEN LIGGER I LAGERORDNINGEN, INTE I EN MASK. Varje gömställe har en `bak`-
// och en `fram`-del med SAMMA origo (platsens ankarpunkt i `layout.js`). Ansiktsriggen ligger
// i ett eget lager mellan dem, så möbeln skymmer pappa av sig själv. En "titt över kanten"
// blir då bara en tween uppåt i spelet — ingen mask, ingen `view`-flytt.
//
// ⚠️ GEOMETRIN BOR I `layout.js`, INTE HÄR. Den här filen ritar FORMEN; var pappa står i den,
//    var man trycker och hur stor möbeln blir på sitt djup står i `MOBLER`/`SLOTS`. Skälet är
//    mätbart: `layout.js` importerar ingenting och går därför att räkna på i ren Node
//    (`validera()`), medan den här filen kräver en webbläsare för att ens laddas.
//
// ⚠️ ANKARE, `kantY` OCH `ansY` ÄR RÄKNADE, INTE VALDA. Riggens `manifest.ruta` är 733×800
//    och silhuetten fyller x 158–579, rad 0–94,5 av 100. Vid höjd 300 betyder det: den
//    SYNLIGA pappan ~158 px bred och 283 px hög, hjässan 150 px över riggens mitt och hakan
//    134 px under. Därav de två reglerna varje gömställe är byggt mot:
//      · `ansY >= kantY + 152`  → hjässan hamnar UNDER fram-delens överkant
//      · fram-delen måste täcka ner till `ansY + 134` ELLER ut ur bild
//    Båda mäts av `layout.validera()`. Talen är LOKALA, så de gäller på VARJE djup: möbeln
//    och ansiktet skalas av samma `skala(djup)` och förhållandet ändras aldrig.
//
// ⚠️ INGA TVÅ FÖREMÅL ÖVERLAPPAR VARANDRA I BILD, och ingen träffyta (inte ens dess 24 px
//    halo) når in under skalets hemknapp eller högtalarknapp. Det är packat mot P0 och
//    uppmätt i `layout.validera()` — minsta avstånd mellan två träffytor är 53 px. Flyttar du
//    en plats: kör mätningen igen, gissa inte.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { verticalFill, verticalFillAlpha, topLightFill, cylinderFill, groundFill, sphereFill } from '../../lib/form.js'
import { liv as fbLiv, shake as fbShake } from '../../lib/feedback.js'
import { shade } from '../../lib/theme.js'
import { BAND, MOBLER, platsInfo } from './layout.js'

// Väggens nederkant / den bortersta golvlinjen.
export const GOLV_Y = BAND.vagg

// ------------------------------------------------------------------ palett ---

const F = {
  vaggLjus: 0xf8e9d1, vagg: 0xe7d1ac, vaggRand: 0xf2ddbc, vaggDekor: 0xdcbf95,
  list: 0xfbf4e8, listMork: 0xd2bf9e,
  golv: 0xd6a267, golvFog: 0x9c6a38,
  matta: 0xe08a7b, mattaLjus: 0xf1b6a8,
  lopare: 0x7fb6a6, loparLjus: 0xa9d6c9, loparMork: 0x4f8a7c,
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
  hylla: 0xc98f57, hyllaMork: 0x8f6134,
  fatolj: 0xe07f77, fatoljMork: 0xa9524d, fatoljLjus: 0xf3a89f,
  lada: 0xf0c06a, ladaMork: 0xb98b3c,
  kudde: 0x8fbfe0, kuddeMork: 0x5f92b8, kudde2: 0xf3b6c8, kudde2Mork: 0xc27f95,
}

// Bokryggarnas färger — en fast lista, aldrig slumpad vid ritning: skärmdumpen ska bli
// densamma två körningar i rad (bildkoll.mjs jämför mot baslinjer).
const BOKFARGER = [0xe06f6f, 0x6fa8dc, 0xf2c14e, 0x7cc47c, 0xb98adf, 0xef9c5e, 0x5fbfae]

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

// ⚠️ EN NOD KAN INTE BÅDE LEVA OCH ÖPPNAS. `feedback.liv()` skriver `y` OCH `rotation` på sin
//    nod VARJE bildruta (`repeat: -1`, se `lib/feedback.js:209`), så en `gsap.to(sammaNod,
//    { rotation })` skrivs över i nästa bildruta. Tvättkorgens lock, kartongens vänstra flik
//    och filtens vik delade nod med sin vilorörelse — deras avslöjande GLED I SIDLED men
//    tippade aldrig, helt utan konsolfel. Vilorörelsen får därför en egen HYLSA runt den nod
//    som öppnas: då komponeras de två i stället för att slåss om samma transform.
function livHylsa(nod) {
  const c = nyC()
  c.addChild(nod)
  return c
}

// Ett blad: en spetsig droppe med mittnerv. Används av krukväxten och bokhyllans lilla planta.
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
 * Bygger rummet: vägg med tapet och tavellist, golv i perspektiv med TRE synliga djupband
 * (golvlist 560 · löpare 639 · matta 704), tavla, klocka och ett klosstorn på golvet.
 * `fram` är mattkanten längst fram.
 *
 * ⚠️ DJUPBANDEN ÄR INTE DEKOR — de är det som gör att en möbel på 0,72 läser som LÄNGRE BORT
 *    i stället för som "en mindre möbel". Utan ett band att stå på blir skalskillnaden en
 *    storleksskillnad, och rummet ser ut som en leksakshylla i stället för som ett rum.
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
  // Tavellist: ligger ovanför de bortre möblernas överkanter (bakre raden når som högst
  // 182 med fönstrets gardinstång) och delar väggen i två höjder — ett djupband till.
  vagg.rect(x0, 166, x1 - x0, 9).fill(topLightFill(F.list))
  vagg.rect(x0, 175, x1 - x0, 5).fill({ color: F.listMork, alpha: 0.55 })
  // Tapetbård under listen: en rad små bågar, billigt och gör väggen mindre platt.
  for (let bx = -420; bx < 1740; bx += 34) {
    vagg.moveTo(bx, 192).quadraticCurveTo(bx + 17, 182, bx + 34, 192)
      .stroke({ width: 3, color: F.vaggDekor, alpha: 0.5 })
  }
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

  // Golvlist + skuggan där vägg möter golv (djupband 1).
  const list = nyG()
  list.rect(x0, GOLV_Y - 22, x1 - x0, 22).fill(topLightFill(F.list))
  list.rect(x0, GOLV_Y - 22, x1 - x0, 5).fill({ color: 0xffffff, alpha: 0.5 })
  list.rect(x0, GOLV_Y - 3, x1 - x0, 7).fill({ color: F.listMork, alpha: 0.75 })
  list.rect(x0, GOLV_Y + 4, x1 - x0, 14).fill(verticalFillAlpha(F.morkt, F.morkt, 0.16, 0))
  bak.addChild(list)

  // Löparen i mellanraden (djupband 2): en avsmalnande matta som mellanradens möbler står
  // PÅ. Den är ritad i perspektiv — smalare bak, bredare fram — så ögat får ett golv att
  // mäta avstånd mot.
  bak.addChild(_lopare())

  // --- väggdekor -----------------------------------------------------------
  // ⚠️ TAVLAN OCH KLOCKAN RITAS INTE HÄR LÄNGRE. De var dekor på (360,260) och (830,262);
  //    sedan 2026-08-16 är de riktiga gömställen på platserna W1/W2 (`layout.SLOTS`), och
  //    en ritad kopia här hade blivit en andra tavla bredvid den riktiga.
  // Ett litet klosstorn på golvet mellan mellanradens och främre radens möbler (x 525–565).
  bak.addChild(_klosstorn(545, 616))

  // --- mattkanten längst fram (djupband 3) --------------------------------
  const matta = nyG()
  matta.roundRect(70, 704, 1140, 130, 46).fill(topLightFill(F.matta, { highlight: 0.24, dark: 0.16 }))
  matta.roundRect(104, 718, 1072, 130, 34).stroke({ width: 5, color: F.mattaLjus, alpha: 0.8 })
  for (let fx = 96; fx < 1190; fx += 26) {
    matta.moveTo(fx, 704).lineTo(fx + 4, 690).stroke({ width: 3, color: F.mattaLjus, alpha: 0.75 })
  }
  matta.rect(70, 704, 1140, 6).fill({ color: 0xffffff, alpha: 0.22 })
  fram.addChild(matta)

  return { bak, fram }
}

// Löparen: trapets med ränder och fransar i båda ändar.
function _lopare() {
  const g = nyG()
  const yT = 600
  const yB = 672
  const xTL = 118
  const xTR = 1162
  const xBL = 58
  const xBR = 1222
  const lerp = (a, b, t) => a + (b - a) * t
  g.poly([xTL, yT, xTR, yT, xBR, yB, xBL, yB]).fill(topLightFill(F.lopare, { highlight: 0.26, dark: 0.2 }))
  // Ränder tvärs över, ritade med trapetsens egen bredd så de följer perspektivet.
  for (const t of [0.22, 0.5, 0.78]) {
    const yy = lerp(yT, yB, t)
    g.moveTo(lerp(xTL, xBL, t) + 22, yy).lineTo(lerp(xTR, xBR, t) - 22, yy)
      .stroke({ width: 8, color: t === 0.5 ? F.loparMork : F.loparLjus, alpha: 0.55 })
  }
  // Ljus kant längs den bakre randen — det är den som säger "det här ligger ner".
  g.moveTo(xTL, yT).lineTo(xTR, yT).stroke({ width: 4, color: 0xffffff, alpha: 0.35 })
  g.moveTo(xBL, yB).lineTo(xBR, yB).stroke({ width: 5, color: F.loparMork, alpha: 0.5 })
  // Fransar i kortändarna.
  for (let i = 0; i < 8; i++) {
    const t = i / 7
    const yy = lerp(yT, yB, t)
    g.moveTo(lerp(xTL, xBL, t), yy).lineTo(lerp(xTL, xBL, t) - 13, yy + 3)
      .stroke({ width: 3, color: F.loparLjus, alpha: 0.8 })
    g.moveTo(lerp(xTR, xBR, t), yy).lineTo(lerp(xTR, xBR, t) + 13, yy + 3)
      .stroke({ width: 3, color: F.loparLjus, alpha: 0.8 })
  }
  return g
}

// Tre klossar på varandra — en glömd lek på golvet, i mellanradens skala.
function _klosstorn(x, y) {
  const g = nyG()
  const s = 0.86
  const b = 40 * s
  g.ellipse(x, y + 2, b * 0.72, 6).fill({ color: F.morkt, alpha: 0.16 })
  const klossar = [
    { c: 0xe4645c, dy: 0, rot: 0.03 },
    { c: 0x62a9dd, dy: -19 * s, rot: -0.05 },
    { c: 0xf0c14c, dy: -38 * s, rot: 0.06 },
  ]
  for (const k of klossar) {
    const yy = y + k.dy
    g.roundRect(x - b / 2, yy - 19 * s, b, 19 * s, 4)
      .fill(topLightFill(k.c, { highlight: 0.3, dark: 0.22 }))
      .stroke({ width: 2.5, color: F.morkt, alpha: 0.2 })
    g.rect(x - b / 2 + 4, yy - 15 * s, b - 8, 3).fill({ color: 0xffffff, alpha: 0.3 })
  }
  return g
}

// ------------------------------------------------------------- gömställena ---
//
// Varje byggare får en `to`-funktion som registrerar sina tweens (så `destroy()` kan döda
// varenda en) och returnerar allt som gömstället behöver RITAT. Alla koordinater är
// RELATIVA ankarpunkten: (0,0) = golvet, mitten. Måtten (kantY/ansY/hit) bor i `layout.js`.

function byggTvattkorg(to) {
  // Hög flätad tvättkorg: lock på glänt och kläder som kikar upp under det.
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
  korg.roundRect(-96, -190, 42, 18, 9).fill({ color: 0x59431f, alpha: 0.55 })
  korg.roundRect(54, -190, 42, 18, 9).fill({ color: 0x59431f, alpha: 0.55 })
  korg.roundRect(-124, -292, 248, 24, 11).fill(cylinderFill(F.korg, { axis: 'x' }))
    .stroke({ width: 3, color: F.korgMork })
  korg.roundRect(-116, 4, 232, 16, 7).fill(verticalFill(F.korgMork, 0x7d6636))

  const lock = nyC()
  const lockG = nyG()
  lockG.roundRect(0, -14, 248, 22, 11).fill(topLightFill(F.korg, { highlight: 0.34 }))
    .stroke({ width: 3, color: F.korgMork })
  lockG.moveTo(12, -5).quadraticCurveTo(124, 2, 236, -5).stroke({ width: 4, color: F.korgMork, alpha: 0.35 })
  lockG.roundRect(108, -26, 32, 14, 7).fill(cylinderFill(F.tra, { axis: 'x' }))
  lock.addChild(lockG)
  lock.position.set(-124, -298)
  lock.rotation = -0.045
  const lockLiv = livHylsa(lock)

  return {
    // ⚠️ LOCKET LIGGER I `bak`, INTE I `fram`. Gångjärnet sitter i BAKKANTEN — locket
    //    tippar alltså bort från betraktaren — och `fram` ritas ÖVER pappa. Med locket i
    //    `fram` svepte det upp TVÄRS ÖVER hans ansikte som en käpp genom näsan (sett i
    //    skärmdumpen). Felet syntes först när `livHylsa()` kom: dessförinnan skrev
    //    `liv()`s eviga tween över lockets rotation varje bildruta, så det TIPPADE ALDRIG.
    //    En riktig rättning avslöjade alltså en gammal, dold kompositionsbugg.
    bakDelar: [bakG, lockLiv],
    framDelar: [korg],
    buktNod: korg,
    bukt: { sx: 0.045, sy: -0.03 },
    livNoder: [{ n: lockLiv, bob: 2, sway: 0.01, duration: 3.1 }],
    noder: [lockLiv, lock, lockG, korg, bakG],
    oppna: () => { to(lock, { rotation: -0.6, y: -318, duration: 0.34, ease: 'back.out(1.6)' }) },
    stang: () => { to(lock, { rotation: -0.045, y: -298, duration: 0.3, ease: 'power2.inOut' }) },
  }
}

function byggGardin(to) {
  // Fönster med dagsljus, två gardinvåder och ett lågt skåp med fönsterbräda.
  const bakG = nyG()
  bakG.roundRect(-146, -496, 292, 206, 10).fill(topLightFill(F.tra)).stroke({ width: 4, color: F.traMork })
  bakG.roundRect(-130, -482, 260, 178, 5).fill(verticalFill(0x9fd9f7, 0xe6f5fe))
  bakG.circle(74, -440, 23).fill(0xffdf8a)
  bakG.circle(68, -446, 11).fill({ color: 0xfff3c8, alpha: 0.85 })
  bakG.ellipse(-64, -432, 30, 13).fill({ color: 0xffffff, alpha: 0.92 })
  bakG.ellipse(-42, -438, 22, 12).fill({ color: 0xffffff, alpha: 0.92 })
  bakG.ellipse(18, -402, 26, 11).fill({ color: 0xffffff, alpha: 0.8 })
  // ⚠️ Kullarna måste hålla sig innanför glaset (±130), annars rinner de ut över karmen.
  bakG.ellipse(-58, -318, 72, 40).fill(0x8ecb7a)
  bakG.ellipse(62, -312, 66, 34).fill(0x67ab63)
  bakG.ellipse(-6, -326, 46, 26).fill({ color: 0x5c9c59, alpha: 0.95 })
  bakG.rect(-7, -482, 14, 178).fill(topLightFill(F.list))
  bakG.rect(-130, -406, 260, 13).fill(topLightFill(F.list))
  bakG.rect(-134, -312, 268, 20).fill(topLightFill(F.tra)).stroke({ width: 3, color: F.traMork })
  bakG.roundRect(-164, -524, 328, 14, 7).fill(cylinderFill(F.tra, { axis: 'x' }))
  bakG.circle(-168, -517, 11).fill(sphereFill(F.tra))
  bakG.circle(168, -517, 11).fill(sphereFill(F.tra))

  const vader = nyC()
  const gjord = []
  for (const sida of [-1, 1]) {
    const v = nyC()
    const g = nyG()
    const yttre = sida * 168
    const inner = sida * 46
    g.moveTo(yttre, -510)
    g.lineTo(inner, -510)
    g.lineTo(inner, -300)
    g.quadraticCurveTo(sida * 76, -282, sida * 106, -300)
    g.quadraticCurveTo(sida * 138, -318, yttre, -300)
    g.closePath()
    g.fill(topLightFill(F.gardin, { highlight: 0.34, dark: 0.26 }))
    for (let i = 0; i < 4; i++) {
      const t = (i + 0.5) / 4
      const xx = yttre + (inner - yttre) * t
      g.moveTo(xx, -506).quadraticCurveTo(xx + sida * 6, -404, xx, -302)
        .stroke({ width: 9, color: i % 2 ? F.gardinMork : 0xa9d6f2, alpha: 0.32 })
    }
    g.roundRect(sida < 0 ? -170 : -2, -518, 172, 20, 8).fill(cylinderFill(F.gardin, { axis: 'x' }))
      .stroke({ width: 3, color: F.gardinMork, alpha: 0.6 })
    v.addChild(g)
    const px = sida < 0 ? -168 : 168
    v.pivot.set(px, -510)
    v.position.set(px, -510)
    vader.addChild(v)
    gjord.push(v)
  }
  vader.pivot.set(0, -300)
  vader.position.set(0, -300)

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
  bakG.moveTo(-116, -300).lineTo(-80, -334).lineTo(30, -334).lineTo(-2, -300).closePath()
    .fill(topLightFill(0xc79a62, { dark: 0.3 })).stroke({ width: 3, color: F.kartongMork, alpha: 0.7 })
  bakG.moveTo(2, -300).lineTo(34, -334).lineTo(124, -334).lineTo(116, -300).closePath()
    .fill(topLightFill(0xbf9159, { dark: 0.3 })).stroke({ width: 3, color: F.kartongMork, alpha: 0.7 })

  const box = nyG()
  box.ellipse(0, 14, 126, 18).fill({ color: F.morkt, alpha: 0.18 })
  box.moveTo(-120, -300).lineTo(120, -300).lineTo(114, 12).lineTo(-114, 12).closePath()
    .fill(topLightFill(F.kartong, { highlight: 0.24, dark: 0.26 }))
  box.moveTo(-120, -300).lineTo(-82, -296).lineTo(-78, 10).lineTo(-114, 12).closePath()
    .fill({ color: F.kartongMork, alpha: 0.3 })
  for (let i = 0; i < 20; i++) {
    const xx = -118 + i * 12
    box.moveTo(xx, -300).quadraticCurveTo(xx + 6, -292, xx + 12, -300)
      .stroke({ width: 2.4, color: F.kartongMork, alpha: 0.5 })
  }
  box.rect(-26, -292, 52, 302).fill({ color: 0xf0e2c2, alpha: 0.75 })
  box.rect(-116, -166, 232, 28).fill({ color: 0xf0e2c2, alpha: 0.6 })
  box.roundRect(22, -110, 84, 62, 5).fill(0xfdf6e6).stroke({ width: 3, color: F.kartongMork, alpha: 0.7 })
  for (let i = 0; i < 3; i++) {
    box.rect(31, -98 + i * 15, 66 - i * 16, 7).fill({ color: F.kartongMork, alpha: 0.55 })
  }
  box.moveTo(-100, -60).lineTo(-48, -60).moveTo(-100, -40).lineTo(-66, -40)
    .stroke({ width: 5, color: F.kartongMork, alpha: 0.35 })

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
  const flikLiv = livHylsa(flikar[0])

  return {
    bakDelar: [bakG],
    framDelar: [box, flikLiv, flikar[1]],
    buktNod: box,
    bukt: { sx: 0.05, sy: -0.025 },
    livNoder: [{ n: flikLiv, bob: 1.6, sway: 0.014, duration: 3.6 }],
    noder: [box, flikLiv, flikar[0], flikar[1], bakG],
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
  bakG.roundRect(-72, -262, 12, 20, 5).fill({ color: F.metallMork, alpha: 0.8 })
  bakG.moveTo(-66, -244).quadraticCurveTo(-104, -190, -92, -122)
    .quadraticCurveTo(-66, -104, -40, -122).quadraticCurveTo(-30, -190, -66, -244)
    .fill({ color: 0x5d7f9c, alpha: 0.85 })

  // ⚠️ TVÅ NODER TILL DÖRRBLADET, OCH DET ÄR INTE PRYDNAD. `bukt()` skriver `buktNod.scale`
  //    VARJE BILDRUTA (det är andningen genom möbeln), och bladet är buktnoden. Låg
  //    öppningen på samma `scale.x` slog andningen tillbaka den varenda bildruta: `glugg()`
  //    var en tween som aldrig syntes — dörren stod stängd medan pappa kikade bakom den,
  //    utan ett konsolfel och med grönt test. (`oppna()` slapp undan bara därför att
  //    `_busy` pausar bukten under avslöjandet — en ren tillfällighet.)
  //    `blad` = bukt + vilorörelse. `bladOppna` = öppningen. Samma vridpunkt, olika ägare.
  const blad = nyC()
  const bladOppna = nyC()
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
  bladOppna.addChild(bladG)
  bladOppna.pivot.set(-112, -300)
  bladOppna.position.set(-112, -300)
  blad.addChild(bladOppna)
  blad.pivot.set(-112, -300)
  blad.position.set(-112, -300)

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
    noder: [blad, bladOppna, bladG, karm, bakG],
    oppna: () => { to(bladOppna.scale, { x: 0.16, duration: 0.38, ease: 'power2.out' }) },
    stang: () => { to(bladOppna.scale, { x: 1, duration: 0.34, ease: 'back.out(1.4)' }) },

    // ⚠️ GLUGGEN ÄR DÖRRENS SKVALLER (ägarens punkt 1, andra halvan). Bladet krymper mot
    //    VÄNSTER karm (pivot −112), så en `scale.x` på 0,78 lämnar en springa på 49 px vid
    //    den högra karmen. Pappa skjuts samtidigt dit av `MOBLER.dorr.kika`, och den högra
    //    karmen — som ritas i FRAM-delen, alltså ovanpå honom — klipper ansiktet i springan.
    //    Ett halvt öga i en dörrspringa, inte ett huvud ovanför karmen.
    glugg: () => { to(bladOppna.scale, { x: 0.66, duration: 0.26, ease: 'power2.out' }) },
    stangGlugg: () => { to(bladOppna.scale, { x: 1, duration: 0.3, ease: 'power2.inOut' }) },

    // GNISSLET: dörren rör sig en aning på gångjärnen. Ljudet läggs på av spelet — det här
    // är bilden som gör ljudet begripligt (P0: orsaken ska vara synlig).
    gnissla: () => {
      to(bladOppna.scale, { x: 0.94, duration: 0.34, ease: 'sine.inOut', yoyo: true, repeat: 1 })
      to(karm, { rotation: 0.004, duration: 0.22, ease: 'sine.inOut', yoyo: true, repeat: 3 })
    },
  }
}

// ⚠️ TAVLAN OCH KLOCKAN ÄR GÖMSTÄLLEN, INTE DEKOR (ägarens punkt 3). De hängde förut som
//    ritade detaljer i `byggRum` och är nu riktiga möbler med bak-/fram-del. Pappa krymper
//    bakom dem (`MOBLER.tavla.ansSkala`) och tittar ut vid SIDAN — en tavla är platt mot
//    väggen, och ett huvud som kom upp över dess överkant hade hängt fritt i tapeten precis
//    som dörrens gjorde. Ankaret (0,0) är ramens NEDRE kant, mitten.
function byggTavla(to) {
  // Skuggan mot väggen ligger i BAK-delen: den ska inte ligga över pappa när han lutar ut.
  const bakG = nyG()
  bakG.roundRect(-104, -198, 216, 204, 10).fill({ color: F.morkt, alpha: 0.12 })
  // Spiken och snöret som ramen hänger i — utan dem svävar en tavla som lutar.
  bakG.circle(0, -232, 6).fill(sphereFill(F.metallMork))
  bakG.moveTo(-52, -206).lineTo(0, -230).lineTo(52, -206).stroke({ width: 3, color: 0x8a7355 })

  const ram = nyC()
  const g = nyG()
  const W = 222
  const H = 208
  g.roundRect(-W / 2, -H, W, H, 8).fill(topLightFill(F.tra)).stroke({ width: 6, color: F.traMork })
  g.roundRect(-W / 2 + 15, -H + 15, W - 30, H - 30, 4).fill(0xfffaf0)
  g.roundRect(-W / 2 + 27, -H + 27, W - 54, H - 54, 3).fill(verticalFill(0xbfe4f7, 0xe8f6fd))
  // Ett litet landskap i kritstreck — samma motiv som den gamla dekorationen.
  g.circle(46, -152, 15).fill(0xffd766)
  g.moveTo(-80, -66).quadraticCurveTo(-26, -112, 20, -66).lineTo(-80, -66).fill(0x8ec97a)
  g.moveTo(-16, -66).quadraticCurveTo(34, -94, 80, -66).lineTo(-16, -66).fill(0x67ab63)
  g.roundRect(-W / 2 + 27, -60, W - 54, 12, 3).fill({ color: 0x4f8f52, alpha: 0.5 })
  g.roundRect(-W / 2 + 27, -48, W - 54, 21, 3).fill({ color: 0x9fd0c0, alpha: 0.35 })
  ram.addChild(g)
  // Vridpunkten är SPIKEN, inte ramens mitt: en tavla som gläntas svänger kring sitt upphäng.
  ram.pivot.set(0, -228)
  ram.position.set(0, -228)

  return {
    bakDelar: [bakG],
    framDelar: [ram],
    buktNod: ram,
    bukt: { sx: 0.03, sy: 0.03 },
    livNoder: [{ n: ram, bob: 0, sway: 0.012, duration: 4.4 }],
    noder: [ram, g, bakG],
    // Ramen gläntar ÅT MOTSATT HÅLL mot där pappa lutar sig ut (`MOBLER.tavla.avsloja`
    // speglad av platsen) — en ram som svängde åt samma håll följde med och täckte honom
    // igen. `spegel` kommer från `makeGomstalle.placera()`.
    // ⚠️ RAMEN FÅR INTE FÖRFLYTTA SIG, bara vicka. Ett `x: -26` såg ofarligt ut men drog
    //    ramen 19 px BORT från pappa i samma sekund han lutade sig ut, och där emellan
    //    öppnade sig ett tomrum: ett litet huvud som svävar fritt i tapeten i stället för
    //    ett som tittar fram BAKOM en tavla. Vinkeln 0,07 flyttar underkanten 6 px.
    oppna: (spegel = 1) => { to(ram, { rotation: -0.07 * spegel, duration: 0.4, ease: 'back.out(2.2)' }) },
    stang: () => { to(ram, { rotation: 0, duration: 0.36, ease: 'power2.inOut' }) },
  }
}

// Väggklockan. Urtavlan är en HEL cirkel med radie 104 kring (0, −104) — det är den som ska
// täcka det krympta ansiktet, och `layout.validera()` mäter mot den.
function byggKlocka(to) {
  const bakG = nyG()
  bakG.circle(6, -98, 106).fill({ color: F.morkt, alpha: 0.12 })
  bakG.circle(0, -222, 5).fill(sphereFill(F.metallMork))

  const ur = nyC()
  const g = nyG()
  g.circle(0, -104, 104).fill(topLightFill(F.tra)).stroke({ width: 7, color: F.traMork })
  g.circle(0, -104, 88).fill(sphereFill(0xfffaf0, { highlight: 0.5, dark: 0.14 }))
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r1 = 74
    const r2 = i % 3 === 0 ? 56 : 63
    g.moveTo(Math.cos(a) * r1, -104 + Math.sin(a) * r1)
      .lineTo(Math.cos(a) * r2, -104 + Math.sin(a) * r2)
      .stroke({ width: i % 3 === 0 ? 8 : 5, color: F.morkt, alpha: 0.6 })
  }
  ur.addChild(g)

  // Visarna på egna noder — de snurrar när klockan gläntas, och det är klockans egen skämt.
  const visare = nyC()
  visare.position.set(0, -104)
  const vg = nyG()
  vg.roundRect(-5, -52, 10, 58, 5).fill(F.morkt)
  const vg2 = nyG()
  vg2.roundRect(-4, -6, 74, 8, 4).fill(F.morkt)
  const lang = nyC()
  lang.addChild(vg2)
  visare.addChild(vg, lang)
  const nav = nyG()
  nav.circle(0, -104, 9).fill(0xe0603f).stroke({ width: 3, color: shade(0xe0603f, 0.3) })

  ur.addChild(visare, nav)
  ur.pivot.set(0, -222)
  ur.position.set(0, -222)

  return {
    bakDelar: [bakG],
    framDelar: [ur],
    buktNod: ur,
    bukt: { sx: 0.03, sy: 0.03 },
    livNoder: [{ n: ur, bob: 0, sway: 0.014, duration: 3.8 }],
    noder: [ur, g, visare, vg, vg2, lang, nav, bakG],
    oppna: (spegel = 1) => {
      // …och urtavlan vickar åt motsatt håll mot pappa, utan att flytta sig (se tavlan).
      to(ur, { rotation: -0.07 * spegel, duration: 0.4, ease: 'back.out(2.2)' })
      to(visare, { rotation: visare.rotation + Math.PI * 4, duration: 0.9, ease: 'power2.out' })
      to(lang, { rotation: lang.rotation + Math.PI * 9, duration: 0.9, ease: 'power2.out' })
    },
    stang: () => { to(ur, { rotation: 0, duration: 0.36, ease: 'power2.inOut' }) },
  }
}

// TRASMATTAN på golvet (ägarens punkt 4). Han ligger UNDER den; hela mattan är en kulle med
// fransar, och vid avslöjandet lyfts närmaste hörn undan. Samma familj som filten, men med
// randigt trasväv och ett eget prassel.
function byggMatta(to) {
  const bakG = nyG()
  bakG.ellipse(0, -46, 116, 40).fill({ color: 0x8a6a4a, alpha: 0.26 })

  const RAND = [0xe08a7b, 0xf1b6a8, 0x7fb6a6, 0xf0d79a, 0xa9d6c9]
  const hog = nyG()
  hog.ellipse(0, 14, 128, 20).fill({ color: F.morkt, alpha: 0.16 })
  // ⚠️ DEN STATISKA MATTAN MÅSTE SJÄLV NÅ UPP TILL KANTLINJEN (−112). Hörnet som lyfts får
  //    aldrig vara det som täcker hakan — samma fälla som filtens vik, se `byggFilt`.
  hog.moveTo(-118, -96).quadraticCurveTo(-56, -142, 6, -124)
    .quadraticCurveTo(64, -108, 118, -130).lineTo(118, -16)
    .quadraticCurveTo(0, -2, -118, -16).closePath()
    .fill(topLightFill(F.matta, { highlight: 0.28, dark: 0.2 }))
  for (let i = 0; i < 5; i++) {
    hog.moveTo(-114, -86 + i * 20).quadraticCurveTo(0, -62 + i * 20, 114, -88 + i * 20)
      .stroke({ width: 11, color: RAND[i % RAND.length], alpha: 0.7 })
  }
  // Fransarna längs framkanten — det som gör en trasmatta till en trasmatta.
  for (let fx = -114; fx <= 114; fx += 12) {
    hog.moveTo(fx, -12).lineTo(fx + 3, 12).stroke({ width: 4, color: 0xf6e4c0, alpha: 0.85 })
  }

  const horn = nyC()
  const hg = nyG()
  hg.moveTo(-112, -74).quadraticCurveTo(-58, -112, -2, -98)
    .quadraticCurveTo(-24, -56, -110, -40).closePath()
    .fill(topLightFill(F.mattaLjus, { highlight: 0.3, dark: 0.18 }))
  hg.moveTo(-104, -70).quadraticCurveTo(-56, -96, -14, -88).stroke({ width: 7, color: F.lopare, alpha: 0.6 })
  hg.moveTo(-106, -56).quadraticCurveTo(-58, -76, -12, -80).stroke({ width: 5, color: 0xf0d79a, alpha: 0.6 })
  horn.addChild(hg)
  horn.pivot.set(-112, -58)
  horn.position.set(-112, -58)
  const hornLiv = livHylsa(horn)

  return {
    bakDelar: [bakG],
    framDelar: [hog, hornLiv],
    buktNod: hog,
    bukt: { sx: 0.035, sy: -0.15 },
    livNoder: [{ n: hornLiv, bob: 2.2, sway: 0.012, duration: 3.4 }],
    noder: [hog, hornLiv, horn, hg, bakG],
    // Hörnet slås UPPÅT-UTÅT och lägger sig tillbaka. Fria änden räknad ur pivoten:
    // (110, −40) roterat −0,5 rad ⇒ (77, −88), alltså utåt vänster och något upp — bort
    // från ansiktet, som ligger till höger om gångjärnet.
    oppna: () => { to(horn, { rotation: -0.5, x: -132, duration: 0.36, ease: 'back.out(1.3)' }) },
    stang: () => { to(horn, { rotation: 0, x: -112, duration: 0.34, ease: 'power2.inOut' }) },
  }
}

function byggBokhylla(to) {
  // NY: en bokhylla mot väggen. Hyllplanen är FYLLDA med böcker — det är böckerna som gör
  // fram-delen ogenomskinlig, och utan dem hade pappa lyst igenom en öppen möbel.
  // Överkanten (-300) är den kant han tittar över.
  const bakG = nyG()
  bakG.rect(-96, -300, 192, 300).fill(verticalFill(0x7c5a34, 0x4d3820))

  const stomme = nyG()
  stomme.ellipse(0, 8, 108, 12).fill({ color: F.morkt, alpha: 0.18 })
  // Korpus.
  stomme.roundRect(-100, -300, 200, 310, 6)
    .fill(verticalFill(F.hylla, shade(F.hylla, 0.26)))
    .stroke({ width: 4, color: F.hyllaMork })
  adring(stomme, -92, 92, -286, 3, F.hyllaMork, 0.22, 96)
  // Hyllplan — fyra fack. `hyllY` är fackets GOLV.
  const hyllY = [-224, -150, -76, -6]
  for (const y of hyllY) {
    stomme.rect(-96, y, 192, 11).fill(topLightFill(F.hylla, { highlight: 0.4 }))
    stomme.rect(-96, y + 11, 192, 4).fill({ color: F.hyllaMork, alpha: 0.6 })
  }
  // Böcker: en deterministisk rad per fack, hela facket fullt.
  const fackTak = [-296, -224, -150, -76]
  for (let f = 0; f < 4; f++) {
    const golvY = hyllY[f]
    const takY = fackTak[f]
    let x = -92
    let i = f * 3
    while (x < 88) {
      const w = 13 + ((i * 7) % 5) * 3
      const h = Math.min(golvY - takY - 6, 44 + ((i * 5) % 4) * 7)
      const lut = (i % 6 === 5) ? 0.16 : 0
      const c = BOKFARGER[i % BOKFARGER.length]
      const yTop = golvY - h
      if (lut) {
        stomme.poly([x, golvY, x + w, golvY, x + w + h * lut, yTop, x + h * lut, yTop])
          .fill(topLightFill(c, { highlight: 0.28, dark: 0.24 }))
      } else {
        stomme.roundRect(x, yTop, w, h, 3).fill(topLightFill(c, { highlight: 0.28, dark: 0.24 }))
      }
      stomme.rect(x + 2, yTop + 7, w - 4, 3).fill({ color: 0xffffff, alpha: 0.45 })
      stomme.rect(x + 2, golvY - 11, w - 4, 3).fill({ color: 0xffffff, alpha: 0.3 })
      x += w + 2
      i++
    }
  }
  // Topplist — den kant han tittar över får en egen profil.
  stomme.roundRect(-108, -312, 216, 18, 6).fill(cylinderFill(F.hylla, { axis: 'x' }))
    .stroke({ width: 3, color: F.hyllaMork })
  stomme.roundRect(-104, 6, 208, 16, 5).fill(verticalFill(F.hyllaMork, 0x6f4a26))

  // En bok som glider ut ur MELLERSTA facket vid avslöjandet — långt under hans haka
  // (-292), så den kan aldrig skymma ansiktet.
  const bok = nyC()
  const bokG = nyG()
  bokG.roundRect(-11, -50, 22, 50, 3).fill(topLightFill(0xef8f5e, { highlight: 0.3, dark: 0.22 }))
    .stroke({ width: 2.5, color: 0xb5643c })
  bokG.rect(-8, -42, 16, 3).fill({ color: 0xffffff, alpha: 0.5 })
  bok.addChild(bokG)
  bok.position.set(58, -150)
  const bokLiv = livHylsa(bok)

  return {
    bakDelar: [bakG],
    framDelar: [stomme, bokLiv],
    buktNod: stomme,
    bukt: { sx: 0.03, sy: -0.02 },
    livNoder: [{ n: bokLiv, bob: 1.4, sway: 0.02, duration: 3.9 }],
    noder: [stomme, bokLiv, bok, bokG, bakG],
    oppna: () => {
      to(bok, { rotation: 0.7, x: 82, y: -142, duration: 0.34, ease: 'back.out(1.5)' })
    },
    stang: () => {
      to(bok, { rotation: 0, x: 58, y: -150, duration: 0.32, ease: 'power2.inOut' })
    },
  }
}

function byggFatolj(to) {
  // NY: en fåtölj sedd framifrån-snett. Ryggen (-288) är kanten pappa tittar över; sits,
  // armstöd och ben täcker hela vägen ner förbi hakan.
  const bakG = nyG()
  // En kudde som sticker upp bakom ryggen — bakom pappa, aldrig framför.
  bakG.roundRect(-52, -330, 104, 62, 22).fill(topLightFill(0xf6d98a)).stroke({ width: 3, color: 0xcaa94f })
  bakG.moveTo(-30, -312).quadraticCurveTo(0, -300, 30, -312).stroke({ width: 3, color: 0xcaa94f, alpha: 0.6 })

  const stol = nyG()
  stol.ellipse(0, 12, 132, 16).fill({ color: F.morkt, alpha: 0.18 })
  // Ryggstöd.
  stol.roundRect(-118, -288, 236, 236, 36)
    .fill(topLightFill(F.fatolj, { highlight: 0.3, dark: 0.24 }))
    .stroke({ width: 4, color: F.fatoljMork })
  // Knappar i ryggen (kapitonering) — de gör tyget till en fåtölj och inte en klump.
  for (const kx of [-58, 0, 58]) {
    for (const ky of [-228, -166]) {
      stol.circle(kx, ky, 7).fill({ color: F.fatoljMork, alpha: 0.5 })
      stol.circle(kx - 1.5, ky - 1.5, 3.4).fill({ color: F.fatoljLjus, alpha: 0.7 })
    }
  }
  // Sits.
  stol.roundRect(-126, -96, 252, 62, 26)
    .fill(topLightFill(F.fatoljLjus, { highlight: 0.3, dark: 0.2 }))
    .stroke({ width: 4, color: F.fatoljMork })
  stol.moveTo(-96, -70).quadraticCurveTo(0, -56, 96, -70).stroke({ width: 4, color: F.fatoljMork, alpha: 0.4 })
  // Armstöd, ett på varje sida.
  for (const sida of [-1, 1]) {
    stol.roundRect(sida * 100 - 31, -168, 62, 92, 26)
      .fill(topLightFill(F.fatolj, { highlight: 0.34, dark: 0.2 }))
      .stroke({ width: 4, color: F.fatoljMork })
    stol.ellipse(sida * 100, -160, 27, 14).fill({ color: F.fatoljLjus, alpha: 0.65 })
  }
  // Kjol + fyra ben. ⚠️ Kjolen når till +8 med flit: hakan ligger på `ansY + 134 = +2`, och
  // med den gamla höjden (till −6) fanns ett 8 px brett band där hakan kunde titta fram
  // MELLAN benen. Möbeln måste täcka hela vägen förbi hakan, inte nästan.
  stol.roundRect(-120, -40, 240, 48, 12).fill(verticalFill(F.fatoljMork, 0x8a3f3c))
  for (const bx of [-96, -34, 34, 96]) {
    stol.roundRect(bx - 9, -8, 18, 22, 5).fill(cylinderFill(F.traMork))
  }

  // En liten prydnadskudde i sitsen som far iväg vid avslöjandet.
  const kudde = nyC()
  const kuddeG = nyG()
  kuddeG.roundRect(-34, -30, 68, 60, 18).fill(topLightFill(F.kudde, { highlight: 0.32, dark: 0.2 }))
    .stroke({ width: 3, color: F.kuddeMork })
  for (const dx of [-14, 0, 14]) kuddeG.moveTo(dx, -20).lineTo(dx, 20).stroke({ width: 2.5, color: F.kuddeMork, alpha: 0.35 })
  kudde.addChild(kuddeG)
  kudde.position.set(-70, -96)
  const kuddeLiv = livHylsa(kudde)

  return {
    bakDelar: [bakG],
    framDelar: [stol, kuddeLiv],
    buktNod: stol,
    bukt: { sx: 0.04, sy: -0.03 },
    livNoder: [{ n: kuddeLiv, bob: 2.2, sway: 0.03, duration: 3.3 }],
    noder: [stol, kuddeLiv, kudde, kuddeG, bakG],
    oppna: () => {
      to(kudde, { rotation: -0.8, x: -128, y: -74, duration: 0.36, ease: 'back.out(1.4)' })
    },
    stang: () => {
      to(kudde, { rotation: 0, x: -70, y: -96, duration: 0.34, ease: 'power2.inOut' })
    },
  }
}

function byggLeksaklada(to) {
  // NY: en leksakslåda i trä med gångjärnslock. Locket ligger på glänt och slås upp vid
  // avslöjandet — samma gest som tvättkorgen, men i en helt annan form och färg.
  const bakG = nyG()
  bakG.roundRect(-108, -300, 216, 90, 8).fill(verticalFill(0x6e5230, 0x3f2d18))
  // Leksaker som tittar upp ur lådan, BAKOM pappa.
  bakG.circle(-62, -312, 26).fill(topLightFill(0x7cc47c)).stroke({ width: 3, color: 0x4f8f52 })
  bakG.circle(-72, -320, 7).fill({ color: 0xffffff, alpha: 0.55 })
  bakG.roundRect(24, -334, 46, 46, 8).fill(topLightFill(0x62a9dd)).stroke({ width: 3, color: 0x3d7cab })
  bakG.roundRect(32, -326, 30, 8, 3).fill({ color: 0xffffff, alpha: 0.4 })
  bakG.moveTo(-14, -292).lineTo(2, -330).lineTo(18, -292).closePath()
    .fill(topLightFill(0xf0c14c)).stroke({ width: 3, color: 0xba8f2f })

  const lada = nyG()
  lada.ellipse(0, 16, 120, 16).fill({ color: F.morkt, alpha: 0.18 })
  lada.roundRect(-113, -286, 226, 300, 10)
    .fill(verticalFill(F.lada, shade(F.lada, 0.26)))
    .stroke({ width: 4, color: F.ladaMork })
  // Plankor.
  for (const py of [-206, -126, -46]) {
    lada.moveTo(-109, py).lineTo(109, py).stroke({ width: 3, color: F.ladaMork, alpha: 0.45 })
    lada.moveTo(-109, py + 4).lineTo(109, py + 4).stroke({ width: 2, color: 0xffffff, alpha: 0.3 })
  }
  adring(lada, -104, 104, -262, 2, F.ladaMork, 0.2, 118)
  // Beslag i hörnen.
  for (const sx of [-1, 1]) {
    for (const [py, ph] of [[-282, 60], [-46, 56]]) {
      lada.roundRect(sx * 96 - 13, py, 26, ph, 5).fill(cylinderFill(F.metall))
        .stroke({ width: 2.5, color: F.metallMork })
      lada.circle(sx * 96, py + 10, 3.4).fill(F.metallMork)
      lada.circle(sx * 96, py + ph - 10, 3.4).fill(F.metallMork)
    }
  }
  // Ett hjärta som är utsågat ur framsidan, och ett hasp under det.
  lada.moveTo(0, -108)
    .quadraticCurveTo(-30, -140, -16, -160)
    .quadraticCurveTo(0, -174, 0, -150)
    .quadraticCurveTo(0, -174, 16, -160)
    .quadraticCurveTo(30, -140, 0, -108)
    .fill({ color: 0x8a5c2c, alpha: 0.75 })
  lada.roundRect(-16, -84, 32, 20, 6).fill(cylinderFill(F.metall)).stroke({ width: 2.5, color: F.metallMork })
  lada.roundRect(-106, 6, 212, 16, 5).fill(verticalFill(F.ladaMork, 0x8a6428))

  // Locket: gångjärn i vänstra bakkanten, ligger på glänt.
  const lock = nyC()
  const lockG = nyG()
  lockG.roundRect(0, -18, 232, 28, 10).fill(topLightFill(F.lada, { highlight: 0.36 }))
    .stroke({ width: 4, color: F.ladaMork })
  lockG.moveTo(14, -6).lineTo(218, -6).stroke({ width: 3, color: F.ladaMork, alpha: 0.4 })
  lockG.roundRect(102, -32, 34, 16, 8).fill(cylinderFill(F.metall)).stroke({ width: 2.5, color: F.metallMork })
  lock.addChild(lockG)
  lock.position.set(-116, -290)
  lock.rotation = -0.05
  const lockLiv = livHylsa(lock)

  return {
    // Locket i `bak` av samma skäl som tvättkorgens — gångjärnet sitter i bakkanten.
    bakDelar: [bakG, lockLiv],
    framDelar: [lada],
    buktNod: lada,
    bukt: { sx: 0.04, sy: -0.028 },
    livNoder: [{ n: lockLiv, bob: 1.8, sway: 0.008, duration: 3.5 }],
    noder: [lada, lockLiv, lock, lockG, bakG],
    oppna: () => { to(lock, { rotation: -0.66, y: -310, duration: 0.36, ease: 'back.out(1.5)' }) },
    stang: () => { to(lock, { rotation: -0.05, y: -290, duration: 0.32, ease: 'power2.inOut' }) },
  }
}

function byggFilt(to) {
  // En hög med filtar på golvet. Översta viket kastas åt sidan vid avslöjandet.
  const bakG = nyG()
  bakG.ellipse(0, -58, 118, 42).fill({ color: 0x6a4b7a, alpha: 0.32 })
  bakG.moveTo(52, -92).quadraticCurveTo(80, -130, 108, -108)
    .quadraticCurveTo(94, -90, 52, -92).fill(topLightFill(F.filtLjus))

  const hog = nyG()
  hog.ellipse(0, 16, 130, 20).fill({ color: F.morkt, alpha: 0.16 })
  hog.roundRect(-120, -52, 240, 72, 30).fill(topLightFill(F.filtMork, { highlight: 0.28 }))
  // ⚠️ DEN STATISKA HÖGEN MÅSTE SJÄLV NÅ UPP TILL KANTLINJEN. Viket (som flyttar sig vid
  //    avslöjandet) definierade förut överkanten, så när det gled undan låg fotorutans raka
  //    underkant (`kantY + 24`) bar. Det som täcker hakan får aldrig vara det som rör sig.
  hog.moveTo(-116, -100).quadraticCurveTo(-58, -148, 4, -130)
    .quadraticCurveTo(66, -112, 116, -136).lineTo(118, -20)
    .quadraticCurveTo(0, -6, -118, -20).closePath()
    .fill(topLightFill(F.filt, { highlight: 0.3, dark: 0.22 }))
  for (let i = 0; i < 3; i++) {
    hog.moveTo(-112, -44 + i * 16).quadraticCurveTo(0, -20 + i * 16, 112, -46 + i * 16)
      .stroke({ width: 7, color: F.filtRand, alpha: 0.5 })
  }
  for (let fx = -108; fx <= 108; fx += 17) {
    hog.moveTo(fx, 14).lineTo(fx + 3, 26).stroke({ width: 4, color: F.filtRand, alpha: 0.65 })
  }

  const vik = nyC()
  const vikG = nyG()
  vikG.moveTo(-106, -66).quadraticCurveTo(-50, -108, 10, -94)
    .quadraticCurveTo(66, -80, 106, -100).lineTo(108, -56)
    .quadraticCurveTo(0, -28, -108, -50).closePath()
    .fill(topLightFill(F.filtLjus, { highlight: 0.3, dark: 0.2 }))
  vikG.moveTo(-98, -70).quadraticCurveTo(-16, -100, 98, -88)
    .stroke({ width: 6, color: F.filtRand, alpha: 0.55 })
  vikG.moveTo(-98, -52).quadraticCurveTo(-16, -80, 98, -66)
    .stroke({ width: 5, color: F.filtMork, alpha: 0.3 })
  vik.addChild(vikG)
  vik.pivot.set(106, -58)
  vik.position.set(106, -58)
  const vikLiv = livHylsa(vik)

  return {
    bakDelar: [bakG],
    framDelar: [hog, vikLiv],
    buktNod: hog,
    bukt: { sx: 0.035, sy: -0.16 },
    livNoder: [{ n: vikLiv, bob: 2.4, sway: 0.01, duration: 3.2 }],
    noder: [hog, vikLiv, vik, vikG, bakG],
    // ⚠️ VIKET SLÄPPS NEDÅT, INTE UPPÅT. Med `rotation: 0.62` svängde den fria änden 130 px
    //    UPP från gångjärnet — alltså 54 px ovanför kanten pappa tittar över — och la sig
    //    tvärs över hans mun som en kavel. Låg hög + fram-lager = allt som går upp går över
    //    ansiktet. Räkna den fria änden ur pivoten innan du ändrar talen:
    //    (−214, −8) roterat −0,16 rad ⇒ (−213, +26), alltså NEDÅT.
    oppna: () => { to(vik, { rotation: -0.16, x: 148, y: -36, duration: 0.36, ease: 'back.out(1.3)' }) },
    stang: () => { to(vik, { rotation: 0, x: 106, y: -58, duration: 0.34, ease: 'power2.inOut' }) },
  }
}

function byggKuddhog(to) {
  // NY: en kuddborg. Tre kuddar staplade, den översta tippar av vid avslöjandet.
  const bakG = nyG()
  bakG.ellipse(0, -60, 112, 40).fill({ color: 0x4f7ba0, alpha: 0.28 })
  bakG.roundRect(-42, -140, 84, 52, 22).fill(topLightFill(0xf6d98a)).stroke({ width: 3, color: 0xcaa94f })

  const hog = nyG()
  hog.ellipse(0, 18, 126, 18).fill({ color: F.morkt, alpha: 0.16 })
  // Understa kudden — bred och plattryckt av de andra.
  hog.roundRect(-118, -46, 236, 64, 26).fill(topLightFill(F.kuddeMork, { highlight: 0.3, dark: 0.16 }))
    .stroke({ width: 3.5, color: 0x466f8f })
  hog.moveTo(-96, -22).quadraticCurveTo(0, -10, 96, -22).stroke({ width: 4, color: 0x466f8f, alpha: 0.4 })
  // Mellankudden i en annan färg och med rutmönster.
  // ⚠️ MELLANKUDDEN ÄR HÖJD TILL −114 (var −92) AV SAMMA SKÄL SOM FILTENS HÖG: den översta
  //    kudden GLIDER UNDAN vid avslöjandet, så den får inte vara det som täcker hakan.
  //    Fotorutans raka underkant ligger på `kantY + 24` = −98 i lokala mått — mellankudden
  //    når nu 16 px förbi den.
  hog.roundRect(-108, -134, 216, 100, 28).fill(topLightFill(F.kudde2, { highlight: 0.32, dark: 0.18 }))
    .stroke({ width: 3.5, color: F.kudde2Mork })
  for (const rx of [-62, -14, 34, 82]) hog.moveTo(rx, -124).lineTo(rx, -44).stroke({ width: 3, color: F.kudde2Mork, alpha: 0.35 })
  for (const ry of [-108, -68]) hog.moveTo(-100, ry).lineTo(100, ry).stroke({ width: 3, color: F.kudde2Mork, alpha: 0.3 })
  // Hörnknoppar — det är de som gör formen till en KUDDE och inte en rundad låda.
  for (const sx of [-1, 1]) {
    hog.circle(sx * 104, -86, 9).fill({ color: F.kudde2Mork, alpha: 0.55 })
    hog.circle(sx * 112, -18, 8).fill({ color: 0x466f8f, alpha: 0.5 })
  }

  // Översta kudden: egen nod som tippar av vid avslöjandet.
  const topp = nyC()
  const toppG = nyG()
  toppG.roundRect(-96, -30, 192, 56, 24).fill(topLightFill(F.kudde, { highlight: 0.34, dark: 0.18 }))
    .stroke({ width: 3.5, color: F.kuddeMork })
  toppG.moveTo(-72, -8).quadraticCurveTo(0, 4, 72, -8).stroke({ width: 4, color: F.kuddeMork, alpha: 0.35 })
  toppG.circle(-86, -2, 8).fill({ color: F.kuddeMork, alpha: 0.5 })
  toppG.circle(86, -2, 8).fill({ color: F.kuddeMork, alpha: 0.5 })
  // Ett litet broderat hjärta.
  toppG.moveTo(0, 6).quadraticCurveTo(-20, -12, -10, -22)
    .quadraticCurveTo(0, -30, 0, -14)
    .quadraticCurveTo(0, -30, 10, -22)
    .quadraticCurveTo(20, -12, 0, 6)
    .fill({ color: 0xffffff, alpha: 0.55 })
  topp.addChild(toppG)
  topp.pivot.set(90, -4)
  topp.position.set(90, -96)
  const toppLiv = livHylsa(topp)

  return {
    bakDelar: [bakG],
    framDelar: [hog, toppLiv],
    buktNod: hog,
    bukt: { sx: 0.035, sy: -0.14 },
    livNoder: [{ n: toppLiv, bob: 2.6, sway: 0.012, duration: 3.4 }],
    noder: [hog, toppLiv, topp, toppG, bakG],
    // Samma räkning som filtens vik: kudden GLIDER NER längs högens framsida i stället för
    //    att kastas upp över ansiktet. (−186, 0) roterat −0,22 rad ⇒ (−182, +41).
    oppna: () => { to(topp, { rotation: -0.22, x: 152, y: -60, duration: 0.36, ease: 'back.out(1.3)' }) },
    stang: () => { to(topp, { rotation: 0, x: 90, y: -96, duration: 0.34, ease: 'power2.inOut' }) },
  }
}

function byggKruka(to) {
  // ⚠️ KRUKAN ÄR MED FLIT ALLDELES FÖR LITEN. Alla andra gömställen döljer pappa helt;
  //    här sticker han upp ovanför en 76 px hög kruka. Det är spelets skämt, inte ett
  //    räknefel — barnet ska SE honom och skratta. Talen står i `layout.js` (`skamt: true`).
  const bakG = nyG()
  bakG.ellipse(0, -62, 44, 11).fill(0x5b4230)
  // ⚠️ VÄXTEN LIGGER I FRAM-DELEN, INTE I BAK. Bladen stod först bakom ansiktet, och då
  //    svalde pappas huvud dem helt: kvar blev en naken kruka mitt i hans ansikte.
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

  // ⚠️ HÄNGBLADEN ÄR INTE DEKOR — de täcker FOTORUTANS RAKA UNDERKANT. Avslöjad står
  //    pappas fotoruta med sin nedre kant på `kantY + 24`, och den kanten är 158 px bred
  //    medan krukan bara är 106. Utan de här bladen syntes ett rakt ljust band tvärs över
  //    halsen på var sida om krukan — den klassiska fotokantsbuggen, och den enda i hela
  //    rummet som `layout.validera()` inte kan fånga (krukan är `skamt: true` och hoppas
  //    över i breddregeln, med flit: SKÄMTET är att den är för LÅG, inte för smal).
  //    Bladen spänner ±104 px och når ner till lokal y 0, alltså över hela bandet.
  const hangG = nyG()
  for (const [hx, hy, dx, dy, hw, hc] of [
    [-40, -60, -64, 52, 11, F.bladMork],
    [40, -60, 64, 50, 11, F.blad],
    [-26, -62, -40, 62, 10, F.blad],
    [26, -62, 44, 60, 10, F.bladLjus],
    [-10, -64, -14, 66, 9, F.bladLjus],
    [12, -64, 18, 64, 9, F.bladMork],
  ]) {
    hangG.moveTo(hx, hy).quadraticCurveTo(hx + dx * 0.75, hy + dy * 0.35, hx + dx, hy + dy)
      .stroke({ width: 4, color: F.bladMork, alpha: 0.75 })
    ritaBlad(hangG, hx + dx * 0.6, hy + dy * 0.5, dx * 0.7, dy * 0.7, hw, hc)
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
    framDelar: [bladG, hangG, potNod],
    buktNod: potNod,
    bukt: { sx: 0.07, sy: -0.05 },
    livNoder: [{ n: bladG, bob: 2.6, sway: 0.02, duration: 3.8 }],
    noder: [potNod, pot, bladG, hangG, bakG],
    // Krukan tippar BORT från ansiktet. Med +0,34 hamnade krukans övre vänstra hörn 24 px
    //    ovanför kanten — mitt i hans mun; med −0,34 hamnar det 24 px under hakan.
    oppna: () => { to(potNod, { rotation: -0.34, duration: 0.32, ease: 'back.out(1.5)' }) },
    stang: () => { to(potNod, { rotation: 0, duration: 0.32, ease: 'power2.inOut' }) },
  }
}

function byggLampa(to) {
  // Taklampan: sladd och ljuskägla bakom, skärmen framför. Skärmen är en rak trumma just
  // för att den ska kunna gömma hela riggen — en rundad lykta smalnar av nedtill.
  const bakG = nyG()
  bakG.rect(-5, -420, 10, 126).fill(cylinderFill(0x7a6650))
  bakG.ellipse(0, -14, 104, 18).fill(verticalFillAlpha(F.glod, F.glod, 0.3, 0))

  const skarm = nyC()
  const skarmG = nyG()
  const kb = (y) => 90 + 40 * ((y + 310) / 310)
  skarmG.roundRect(-24, -324, 48, 16, 7).fill(cylinderFill(F.metall, { axis: 'x' }))
    .stroke({ width: 2.5, color: F.metallMork })
  skarmG.moveTo(-90, -310).lineTo(90, -310).lineTo(130, 0).lineTo(-130, 0).closePath()
    .fill(verticalFill(0xf7d9a2, 0xe0ac66))
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

  // ⚠️ KRAGEN ÄR DET SOM TÄCKER FOTORUTANS RAKA UNDERKANT, och den STÅR STILL. En taklampa
  //    har ingenting under sig: lyfts skärmen hänger pappa fritt i luften, och fotots raka
  //    nederkant står naken i bild. Förut var det KUPAN som gjorde det jobbet — och därför
  //    kunde kupan inte röra sig, vilket är precis vad ägaren såg ("kupan svävar medan
  //    skärmen åker"). Kragen är en riktig lampdel (diffusorns fattningsring), den täcker
  //    bandet −10 … 40 över hela bredden, och den frigör kupan till att bli en LUCKA.
  //    `MOBLER.lampa.avsloja` håller hakan inne i det bandet — ändras det ena måste det
  //    andra räknas om.
  const krage = nyG()
  // Frostad glascylinder mellan skärmen och luckan. Bandet −10 … 56 är MÄTT mot
  // `MOBLER.lampa.avsloja`: hakan hamnar på lokal 44 och fotorutans raka kant på 52, båda
  // innanför. Ändras det ena måste det andra räknas om — det finns ingen annan yta som
  // kan ta det jobbet, för en taklampa har ingenting under sig.
  krage.roundRect(-128, -6, 256, 62, 16).fill(verticalFill(0xfdf3dc, 0xecd6a4))
    .stroke({ width: 3, color: 0xc79f5f })
  krage.roundRect(-132, -12, 264, 20, 10).fill(cylinderFill(0xe8b877, { axis: 'x' }))
    .stroke({ width: 3, color: 0xb5813f })
  krage.roundRect(-130, 40, 260, 18, 9).fill(cylinderFill(0xe8b877, { axis: 'x' }))
    .stroke({ width: 3, color: 0xb5813f })
  krage.moveTo(-108, 6).quadraticCurveTo(-114, 24, -106, 40).stroke({ width: 10, color: 0xffffff, alpha: 0.34 })
  krage.ellipse(0, 24, 112, 16).fill({ color: F.glod, alpha: 0.34 })

  // KUPAN ÄR EN LUCKA SOM SLÅR UPP NEDÅT (ägarens punkt 2). Gångjärnet sitter i den nedre
  // mässingsringens vänstra rand, och där ritas ett synligt beslag — utan det läser en
  // lucka som en bit som lossnade.
  const kupa = nyC()
  const kg = nyG()
  kg.moveTo(-112, 0).quadraticCurveTo(-104, 72, 0, 82)
    .quadraticCurveTo(104, 72, 112, 0)
    .quadraticCurveTo(0, 24, -112, 0).closePath()
    .fill(verticalFill(0xfdf3dc, 0xe9cf9c))
    .stroke({ width: 3, color: 0xc79f5f })
  kg.moveTo(-84, 18).quadraticCurveTo(-72, 56, -22, 68).stroke({ width: 9, color: 0xffffff, alpha: 0.4 })
  kg.ellipse(0, 76, 44, 9).fill({ color: F.glod, alpha: 0.65 })
  kupa.addChild(kg)
  kupa.pivot.set(-108, 0)
  kupa.position.set(-108, 54)

  const gangjarn = nyG()
  gangjarn.roundRect(-124, 44, 28, 18, 7).fill(cylinderFill(F.metall, { axis: 'y' }))
    .stroke({ width: 2.5, color: F.metallMork })
  gangjarn.circle(-110, 53, 4.5).fill(F.metallMork)

  return {
    bakDelar: [bakG],
    framDelar: [skarm, krage, kupa, gangjarn],
    buktNod: skarm,
    bukt: { sx: 0.055, sy: 0.05 },
    // Lampan svänger kring TAKET, inte kring skärmens underkant.
    livNoder: [{ n: null, bob: 2.5, sway: 0.026, duration: 4.6, pivotY: -410 }],
    noder: [skarm, skarmG, kupa, kg, krage, gangjarn, bakG],
    oppna: () => {
      to(skarm, { rotation: -0.22, y: -470, duration: 0.44, ease: 'back.out(1.4)' })
      to(kupa, { rotation: 1.28, duration: 0.5, ease: 'back.out(1.2)' })
    },
    stang: () => {
      to(skarm, { rotation: 0, y: -310, duration: 0.36, ease: 'power2.inOut' })
      to(kupa, { rotation: 0, duration: 0.4, ease: 'power2.inOut' })
    },
  }
}

const BYGGARE = {
  tvattkorg: byggTvattkorg,
  gardin: byggGardin,
  kartong: byggKartong,
  dorr: byggDorr,
  bokhylla: byggBokhylla,
  fatolj: byggFatolj,
  leksaklada: byggLeksaklada,
  filt: byggFilt,
  matta: byggMatta,
  kuddhog: byggKuddhog,
  kruka: byggKruka,
  lampa: byggLampa,
  tavla: byggTavla,
  klocka: byggKlocka,
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
 * Formen ritas i lokala koordinater; `placera(slot)` sätter läge OCH skala ur `layout.js`.
 * Att skala HELA `bak`/`fram` (och inte delarna var för sig) är det som gör djupet
 * konsekvent: möbelns kant, dess bukt, dess skakning och dess vilorörelse krymper alla med
 * samma tal, precis som ansiktet gör.
 */
export function makeGomstalle(key) {
  const mat = MOBLER[key]
  const byggare = BYGGARE[key]
  if (!mat || !byggare) throw new Error(`titt-ut-pappa/rummet: okänt gömställe "${key}"`)

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
  for (const c of [bak, fram]) c.interactiveChildren = false
  bak.addChild(bakInre)
  fram.addChild(framInre)
  for (const d of spec.bakDelar || []) bakInre.addChild(d)
  for (const d of spec.framDelar || []) framInre.addChild(d)

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
  // anroparen gör det (spelet kör `wiggle(g.fram)` och tonar dem vid ett platsbyte).
  const alla = [bak, fram, bakInre, framInre, ...(spec.noder || []), ...livSpec.map((L) => L.n)]

  return {
    key,
    bak,
    fram,
    kantY: mat.kantY,
    ansX: mat.ansX ?? 0,
    ansY: mat.ansY,
    _oppen: false,
    _levande: true,
    skala: 1,

    /**
     * Ställ möbeln på en plats: läge OCH skala ur djupet.
     *
     * ⚠️ SKALAN SÄTTS PÅ `bak`/`fram`, ALDRIG PÅ NÅGON INNERNOD. Bukten skriver
     *    `buktNod.scale` varje bildruta och vilorörelsen äger `livNod.y` — delade de nod
     *    med djupskalan skulle en av dem skriva över den andra, och möbeln skulle andas
     *    sig tillbaka till full storlek.
     */
    placera(slot) {
      const { x, y, s } = platsInfo(slot)
      this.skala = s
      // Platsens spegling går vidare till `oppna()`: tavlan och klockan måste glänta ÅT
      // MOTSATT HÅLL mot där pappa lutar sig ut, och vilket håll det är beror på platsen.
      this.spegel = slot.spegel ?? 1
      for (const c of [bak, fram]) {
        if (c.destroyed) continue
        c.position.set(x, y)
        c.scale.set(s)
      }
    },

    // 0..1 — fram-delen sväller mjukt i andningens takt.
    bukt(v) {
      if (!this._levande || !buktNod || buktNod.destroyed) return
      const t = kl01(v)
      buktNod.scale.set(1 + (spec.bukt?.sx ?? 0.05) * t, 1 + (spec.bukt?.sy ?? -0.02) * t)
    },

    // Kort synlig skakning — fnissskvallret. Skakningen ligger på de INRE behållarna, så
    // varken ankarpunkten eller träffytan flyttar sig.
    skaka() {
      if (!this._levande) return
      fbShake(framInre, { intensity: 7, duration: 0.42 })
      fbShake(bakInre, { intensity: 5, duration: 0.42 })
    },

    oppna() {
      if (!this._levande || this._oppen) return
      this._oppen = true
      spec.oppna(this.spegel ?? 1)
    },

    stang() {
      if (!this._levande || !this._oppen) return
      this._oppen = false
      spec.stang(this.spegel ?? 1)
    },

    /**
     * MÖBELNS EGNA SKVALLERGESTER. Alla tre är valfria — en möbel som saknar dem gör
     * ingenting, och spelet behöver inte veta vilka som har vilka.
     *
     * ⚠️ EN METOD SOM BARA FINNS I `spec` NÅR ALDRIG SPELET. Det här objektet är hela
     *    gömställets yta utåt, och `glugg()` låg först bara i dörrens byggare: spelet
     *    anropade `plats.g.glugg?.()`, `?.` svalde det tyst, och dörrens kikande blev en
     *    osynlig tween bakom ett stängt dörrblad. Grönt test, noll konsolfel, ingen bild.
     */
    glugg() { if (this._levande && !this._oppen) spec.glugg?.() },
    stangGlugg() { if (this._levande && !this._oppen) spec.stangGlugg?.() },
    gnissla() { if (this._levande) spec.gnissla?.() },

    // Vilo-rörelse med EGEN FAS: två gömställen ska aldrig gunga i takt.
    liv() {
      if (!this._levande) return
      const fas = Math.random()
      for (const L of livSpec) {
        if (!L.n || L.n.destroyed) continue
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
