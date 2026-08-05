// Hamburgerbyggets ingredienser — ALLA ritade i SIDOPROFIL som fristående föremål (P0 ASSETS).
// Hyllan var tidigare 54 emoji i en Text; en emoji är inte ett ritat spelobjekt, så varje sak
// har nu egen silhuett, egna färger och en glansfläck som gör den saftig.
//
// Ritregler i den här filen:
//  · Allt ses FRÅN SIDAN (burgaren staplas i profil). Varje ritfunktion returnerar en Graphics
//    ritad kring (0,0), ungefär `w` bred och `th` hög — samma mått som stapeln räknar med.
//  · Pixi v8: form → fill(). En `arc()` efter ett `fill()` i SAMMA Graphics fortsätter vägen och
//    drar ett streck från förra formen (POLERINGSRUNDA.md, sjätte läckan). Därför används bara
//    circle/ellipse/quadraticCurveTo här — ingen naken arc().
//  · Allt ljusare än ~0xf0e8d8 får EGEN kontur (sjunde läckan) — annars försvinner det mot
//    hyllan och de ljusa bröden.
//  · `bake` styr hur mycket lagret bryns på grillen (1 = som kött, 0 = ändras knappt).
import { Graphics } from 'pixi.js'

const G = () => new Graphics()

// Mjuk vit glansfläck — ger allt en blank, aptitlig yta.
const gloss = (g, x, y, r, a = 0.35) => g.circle(x, y, r).fill({ color: 0xffffff, alpha: a })

// Ljusa saker behöver egen kontur för att synas mot ljus bakgrund.
const PALE_EDGE = 0xd8c9ad

// Litet glatt ansikte (ögon + leende) — för djuren och specialarna. Aldrig läskigt.
function face(g, cx, cy, s = 1, ink = 0x2f2a26) {
  g.circle(cx - 6 * s, cy, 3.4 * s).fill(ink)
  g.circle(cx + 6 * s, cy, 3.4 * s).fill(ink)
  g.circle(cx - 5 * s, cy - 1.3 * s, 1.3 * s).fill(0xffffff)
  g.circle(cx + 7 * s, cy - 1.3 * s, 1.3 * s).fill(0xffffff)
  g.moveTo(cx - 5 * s, cy + 6 * s).quadraticCurveTo(cx + 1 * s, cy + 11 * s, cx + 7 * s, cy + 6 * s)
    .stroke({ width: 2.4 * s, color: ink, cap: 'round' })
  return g
}

// Ben som sticker ut under en liten kropp (spindel, kackerlacka, krabba).
function legsUnder(g, count, spanX, y, len, color, width = 3.5) {
  for (let i = 0; i < count; i++) {
    const x = -spanX + (i / (count - 1)) * spanX * 2
    const out = x < 0 ? -1 : 1
    g.moveTo(x, y).quadraticCurveTo(x + out * 6, y + len * 0.7, x + out * 11, y + len)
      .stroke({ width, color, cap: 'round' })
  }
  return g
}

// Genomskinlig vinge (mygga, fluga).
function wing(g, cx, cy, w, h) {
  g.moveTo(cx, cy).quadraticCurveTo(cx + w * 0.4, cy - h, cx + w, cy - h * 0.3)
    .quadraticCurveTo(cx + w * 0.5, cy + h * 0.3, cx, cy)
    .fill({ color: 0xdff0fb, alpha: 0.72 })
  g.moveTo(cx, cy).quadraticCurveTo(cx + w * 0.5, cy - h * 0.5, cx + w, cy - h * 0.3)
    .stroke({ width: 1.6, color: 0x9fc4dc, alpha: 0.8 })
  return g
}

// En liten tecknad figur som LIGGER i burgaren och vinkar. Pappa/Mamma är ROLLER —
// avbildade personer namnges aldrig här (P0 KARAKTÄRER).
function lyingPerson(shirt, hair, pants) {
  const g = G()
  const skin = 0xf5c9a0
  // Ben utsträckta åt höger + skor.
  g.roundRect(8, -12, 60, 13, 7).fill(pants)
  g.roundRect(8, 2, 60, 13, 7).fill(pants)
  g.roundRect(62, -14, 22, 14, 6).fill(0x8a5a33)
  g.roundRect(62, 1, 22, 14, 6).fill(0x7a4e2c)
  // Bål.
  g.roundRect(-30, -16, 46, 32, 14).fill(shirt)
  g.roundRect(-30, -16, 46, 11, 8).fill({ color: 0xffffff, alpha: 0.22 })
  // Arm som vinkar uppåt.
  g.moveTo(-6, -12).quadraticCurveTo(2, -30, 16, -34).stroke({ width: 11, color: shirt, cap: 'round' })
  g.circle(18, -35, 8).fill(skin)
  // Huvud + hår + glatt ansikte.
  g.circle(-46, -2, 19).fill(skin)
  g.moveTo(-64, -8).quadraticCurveTo(-58, -26, -32, -15).quadraticCurveTo(-48, -16, -64, -8).fill(hair)
  g.circle(-50, -4, 2.8).fill(0x2f2a26)
  g.circle(-40, -4, 2.8).fill(0x2f2a26)
  g.moveTo(-51, 4).quadraticCurveTo(-45, 9, -39, 4).stroke({ width: 2.4, color: 0x2f2a26, cap: 'round' })
  return g
}

// ============================ ritningarna (id → Graphics) ============================

const DRAW = {
  // ---------------------------------------------------- klassiska burgarlager
  sallad: () => {
    const g = G()
    g.roundRect(-120, -4, 240, 22, 11).fill(0x5aa832)
    for (let i = -112; i <= 112; i += 25) g.circle(i, -6, 17).fill(0x73c34a)
    for (let i = -100; i <= 100; i += 25) g.circle(i, -11, 12).fill({ color: 0x8ed863, alpha: 0.9 })
    return g
  },
  ost: () => {
    const g = G()
    g.roundRect(-116, -11, 232, 22, 7).fill(0xffce4a)
    g.moveTo(-86, 9).quadraticCurveTo(-80, 32, -62, 9).fill(0xffce4a)
    g.moveTo(20, 9).quadraticCurveTo(30, 34, 46, 9).fill(0xffce4a)
    g.roundRect(-116, -11, 232, 8, 6).fill({ color: 0xffe490, alpha: 0.8 })
    gloss(g, -60, -6, 8, 0.4)
    return g
  },
  biff: () => {
    const g = G()
    g.roundRect(-110, -21, 220, 42, 17).fill(0x6b4226)
    g.roundRect(-110, -21, 220, 13, 14).fill({ color: 0x8a5a36, alpha: 0.6 })
    for (let i = -96; i <= 96; i += 32) g.circle(i, 18, 9).fill(0x5b371f)
    for (const x of [-70, -12, 52]) g.roundRect(x, -8, 26, 7, 4).fill({ color: 0x3d2515, alpha: 0.55 })
    gloss(g, -50, -14, 9, 0.22)
    return g
  },
  tomat: () => {
    const g = G()
    g.ellipse(0, 0, 104, 15).fill(0xff6b6b).stroke({ width: 3, color: 0xe85555 })
    for (let i = -66; i <= 66; i += 26) g.ellipse(i, 0, 6, 9).fill({ color: 0xffd0c0, alpha: 0.95 })
    gloss(g, -40, -6, 7, 0.4)
    return g
  },
  bacon: () => {
    const g = G()
    g.moveTo(-108, -6).quadraticCurveTo(-54, -18, 0, -6).quadraticCurveTo(54, 6, 108, -6)
      .lineTo(108, 10).quadraticCurveTo(54, 22, 0, 10).quadraticCurveTo(-54, -2, -108, 10).closePath()
      .fill(0xc0392b)
    g.moveTo(-104, -2).quadraticCurveTo(-52, -14, 0, -2).quadraticCurveTo(52, 10, 104, -2)
      .stroke({ width: 5, color: 0xf0b0aa, alpha: 0.9 })
    return g
  },

  // ------------------------------------------------------------- goda grejer
  avokado: () => {
    const g = G()
    g.moveTo(-74, 8).quadraticCurveTo(-70, -22, -20, -22).quadraticCurveTo(64, -22, 74, 2)
      .quadraticCurveTo(64, 22, -20, 22).quadraticCurveTo(-70, 22, -74, 8).fill(0x3f6b2b)
    g.moveTo(-66, 6).quadraticCurveTo(-62, -15, -18, -15).quadraticCurveTo(56, -15, 64, 2)
      .quadraticCurveTo(56, 15, -18, 15).quadraticCurveTo(-62, 15, -66, 6).fill(0xa8cf6a)
    g.ellipse(22, 1, 20, 13).fill(0x8a5a2b)
    gloss(g, 12, -5, 5, 0.4)
    return g
  },
  morot: () => {
    const g = G()
    g.moveTo(-76, -4).quadraticCurveTo(-20, -20, 52, -13).quadraticCurveTo(76, -8, 76, 0)
      .quadraticCurveTo(76, 8, 52, 13).quadraticCurveTo(-20, 20, -76, 4).closePath().fill(0xef8b28)
    for (const x of [-40, -10, 22]) {
      g.moveTo(x, -14).quadraticCurveTo(x + 4, 0, x, 14).stroke({ width: 2.5, color: 0xd0701a, alpha: 0.7 })
    }
    for (const [dx, dy] of [[-8, -14], [0, -20], [8, -8]]) {
      g.moveTo(-74, 0).quadraticCurveTo(-88 + dx, dy, -100 + dx, dy * 1.2).stroke({ width: 6, color: 0x54a83c, cap: 'round' })
    }
    gloss(g, 10, -6, 6, 0.3)
    return g
  },
  majs: () => {
    const g = G()
    g.roundRect(-84, -19, 168, 38, 19).fill(0xe8b12a)
    for (let r = 0; r < 3; r++) {
      for (let c = -5; c <= 5; c++) {
        g.ellipse(c * 15 + (r % 2 ? 7 : 0), -10 + r * 11, 6, 5).fill(0xfbdc70)
      }
    }
    g.moveTo(-80, -14).quadraticCurveTo(-108, -4, -84, 16).quadraticCurveTo(-72, 4, -80, -14).fill(0x74b84a)
    return g
  },
  aubergine: () => {
    const g = G()
    g.moveTo(-58, 0).quadraticCurveTo(-58, -22, -14, -22).quadraticCurveTo(70, -22, 70, 0)
      .quadraticCurveTo(70, 22, -14, 22).quadraticCurveTo(-58, 22, -58, 0).fill(0x6b3f96)
    g.moveTo(-40, -14).quadraticCurveTo(10, -18, 52, -10).stroke({ width: 5, color: 0x9a6ec4, alpha: 0.6 })
    g.moveTo(-58, -6).quadraticCurveTo(-78, -14, -84, 0).quadraticCurveTo(-74, 10, -58, 6).fill(0x4e9a3c)
    g.moveTo(-80, -4).quadraticCurveTo(-96, -12, -100, -2).stroke({ width: 6, color: 0x3f8030, cap: 'round' })
    gloss(g, -18, -12, 8, 0.3)
    return g
  },
  potatis: () => {
    const g = G()
    g.moveTo(-68, 2).quadraticCurveTo(-64, -20, -18, -20).quadraticCurveTo(48, -22, 66, -4)
      .quadraticCurveTo(74, 12, 22, 20).quadraticCurveTo(-52, 24, -68, 2).fill(0xc99a63)
    for (const [x, y, r] of [[-30, -4, 5], [12, 6, 4], [40, -6, 4.5]]) g.ellipse(x, y, r, r * 0.7).fill(0x9a7040)
    gloss(g, -22, -12, 8, 0.3)
    return g
  },
  kottbit: () => {
    const g = G()
    g.moveTo(-86, -4).quadraticCurveTo(-80, -22, -30, -20).quadraticCurveTo(60, -20, 82, -6)
      .quadraticCurveTo(88, 10, 40, 19).quadraticCurveTo(-60, 22, -86, 6).closePath().fill(0xa8443a)
    g.moveTo(-80, -8).quadraticCurveTo(-20, -16, 60, -10).stroke({ width: 7, color: 0xf3e4d0, alpha: 0.9 })
    for (const x of [-40, 4, 44]) {
      g.moveTo(x, -6).quadraticCurveTo(x + 6, 4, x, 14).stroke({ width: 2.5, color: 0x8a3028, alpha: 0.7 })
    }
    gloss(g, -30, -10, 7, 0.25)
    return g
  },
  kyckling: () => {
    const g = G()
    g.roundRect(50, -8, 40, 16, 8).fill(0xf6efdf).stroke({ width: 3, color: PALE_EDGE })
    g.circle(88, -8, 10).fill(0xf6efdf).stroke({ width: 3, color: PALE_EDGE })
    g.circle(88, 8, 10).fill(0xf6efdf).stroke({ width: 3, color: PALE_EDGE })
    g.moveTo(-70, 0).quadraticCurveTo(-66, -24, -14, -24).quadraticCurveTo(46, -22, 56, 0)
      .quadraticCurveTo(46, 22, -14, 22).quadraticCurveTo(-66, 22, -70, 0).fill(0xc57b34)
    g.moveTo(-60, -8).quadraticCurveTo(-10, -18, 42, -8).stroke({ width: 5, color: 0xe0a05a, alpha: 0.75 })
    gloss(g, -34, -10, 8, 0.3)
    return g
  },
  smor: () => {
    const g = G()
    g.roundRect(-58, -18, 116, 36, 8).fill(0xf7e58c).stroke({ width: 3.5, color: 0xd6bf5e })
    g.roundRect(-58, -18, 116, 12, 7).fill({ color: 0xfdf3c0, alpha: 0.9 })
    g.roundRect(-30, -18, 34, 36, 6).fill({ color: 0xfffdf2, alpha: 0.85 }).stroke({ width: 2.5, color: PALE_EDGE })
    return g
  },
  oliv: () => {
    const g = G()
    for (const x of [-42, 0, 42]) {
      g.ellipse(x, 0, 20, 15).fill(0x4a6a2a)
      g.ellipse(x, 0, 9, 7).fill(0xb84a2a)
      gloss(g, x - 8, -6, 4, 0.35)
    }
    return g
  },
  honung: () => {
    const g = G()
    g.moveTo(-80, 6).quadraticCurveTo(-40, -14, 0, -8).quadraticCurveTo(46, -2, 80, 8)
      .quadraticCurveTo(40, 22, -20, 20).quadraticCurveTo(-70, 18, -80, 6).fill(0xe8a31e)
    g.moveTo(-70, 4).quadraticCurveTo(-30, -10, 10, -4).stroke({ width: 6, color: 0xfbd067, alpha: 0.9 })
    g.moveTo(30, -8).quadraticCurveTo(36, -26, 44, -8).fill(0xf0b52e)
    gloss(g, -34, 2, 7, 0.4)
    return g
  },

  // ------------------------------------------------------- extra & överraskningar
  raka: () => {
    const g = G()
    g.moveTo(-52, 10).quadraticCurveTo(-58, -20, -18, -20).quadraticCurveTo(38, -20, 44, 4)
      .quadraticCurveTo(46, 20, 16, 20).quadraticCurveTo(-40, 22, -52, 10).fill(0xf58c6a)
    for (const x of [-30, -8, 16]) {
      g.moveTo(x, -18).quadraticCurveTo(x + 5, 0, x, 18).stroke({ width: 3, color: 0xd96a48, alpha: 0.8 })
    }
    g.moveTo(44, -4).lineTo(70, -18).lineTo(66, 0).lineTo(72, 16).closePath().fill(0xef7a55)
    g.circle(-40, -6, 3).fill(0x2f2a26)
    gloss(g, -22, -12, 6, 0.35)
    return g
  },
  lok: () => {
    const g = G()
    for (const [x, s] of [[-56, 1], [0, 1.15], [56, 0.95]]) {
      g.moveTo(x - 30 * s, 12).quadraticCurveTo(x, -26 * s, x + 30 * s, 12).stroke({ width: 7, color: 0xf3ecf7 })
      g.moveTo(x - 19 * s, 12).quadraticCurveTo(x, -14 * s, x + 19 * s, 12).stroke({ width: 6, color: 0xe4d6ee })
      g.moveTo(x - 32 * s, 13).quadraticCurveTo(x, -28 * s, x + 32 * s, 13).stroke({ width: 2, color: 0xb79ac6 })
    }
    return g
  },
  gurka: () => {
    const g = G()
    for (const x of [-62, 0, 62]) {
      g.ellipse(x, 0, 28, 17).fill(0x3f8a34)
      g.ellipse(x, 0, 22, 12).fill(0xd9edb4)
      for (const [dx, dy] of [[-7, -2], [6, -3], [0, 4]]) g.ellipse(x + dx, dy, 2.6, 3.4).fill(0xa8c97a)
      gloss(g, x - 10, -6, 5, 0.35)
    }
    return g
  },
  stekt_agg: () => {
    const g = G()
    g.moveTo(-84, 6).quadraticCurveTo(-88, -14, -50, -12).quadraticCurveTo(-30, -22, 4, -14)
      .quadraticCurveTo(58, -20, 78, -2).quadraticCurveTo(86, 16, 30, 18).quadraticCurveTo(-56, 22, -84, 6)
      .fill(0xfffdf4).stroke({ width: 3.5, color: PALE_EDGE })
    g.ellipse(-14, -2, 26, 17).fill(0xf5a623)
    g.ellipse(-14, -2, 20, 12).fill(0xffc44d)
    gloss(g, -22, -8, 6, 0.5)
    return g
  },
  agg: () => {
    const g = G()
    g.moveTo(-64, 4).quadraticCurveTo(-64, -22, -10, -22).quadraticCurveTo(60, -22, 60, 2)
      .quadraticCurveTo(60, 22, -10, 22).quadraticCurveTo(-64, 22, -64, 4)
      .fill(0xfffdf4).stroke({ width: 3.5, color: PALE_EDGE })
    g.ellipse(2, 0, 22, 15).fill(0xf7c33f)
    g.ellipse(-2, -4, 10, 6).fill({ color: 0xffe08a, alpha: 0.85 })
    return g
  },
  chili: () => {
    const g = G()
    g.moveTo(-66, -10).quadraticCurveTo(0, -24, 52, -4).quadraticCurveTo(68, 6, 58, 16)
      .quadraticCurveTo(20, 4, -30, 12).quadraticCurveTo(-62, 14, -66, -10).fill(0xd6342a)
    g.moveTo(-56, -8).quadraticCurveTo(0, -18, 44, -2).stroke({ width: 5, color: 0xf07068, alpha: 0.8 })
    g.moveTo(-64, -8).quadraticCurveTo(-84, -14, -92, -2).stroke({ width: 8, color: 0x4e9a3c, cap: 'round' })
    return g
  },
  paprika: () => {
    const g = G()
    for (const [x, y, col] of [[-52, -4, 0xe0452f], [4, 2, 0xf0682a], [56, -2, 0xe8a81e]]) {
      g.moveTo(x - 30, y + 8).quadraticCurveTo(x, y - 20, x + 30, y + 8)
        .quadraticCurveTo(x, y - 6, x - 30, y + 8).fill(col)
    }
    gloss(g, -50, -8, 5, 0.35)
    return g
  },
  svamp: () => {
    const g = G()
    g.roundRect(-13, -2, 26, 24, 9).fill(0xf5ead2).stroke({ width: 3, color: PALE_EDGE })
    g.moveTo(-60, 0).quadraticCurveTo(-56, -26, 0, -26).quadraticCurveTo(56, -26, 60, 0)
      .quadraticCurveTo(0, 12, -60, 0).fill(0xb5734a)
    g.moveTo(-58, -1).quadraticCurveTo(0, 9, 58, -1).quadraticCurveTo(0, 6, -58, -1).fill(0x94592f)
    g.ellipse(-22, -13, 9, 5).fill({ color: 0xd8a077, alpha: 0.8 })
    return g
  },
  broccoli: () => {
    const g = G()
    g.roundRect(-14, 0, 28, 22, 9).fill(0x9ccf6f)
    for (const [x, y, r] of [[-46, -4, 18], [-18, -12, 20], [16, -12, 19], [44, -2, 16], [0, -2, 18]]) {
      g.circle(x, y, r).fill(0x3f8a34)
    }
    for (const [x, y, r] of [[-40, -10, 8], [-14, -18, 9], [20, -17, 8], [40, -8, 7]]) {
      g.circle(x, y, r).fill({ color: 0x5aa832, alpha: 0.9 })
    }
    return g
  },
  ananas: () => {
    const g = G()
    g.ellipse(0, 0, 86, 20).fill(0xe0a72c)
    g.ellipse(0, -3, 82, 17).fill(0xf8d45c)
    g.ellipse(0, -3, 22, 8).fill(0xe8bb46)
    for (let i = -60; i <= 60; i += 24) g.ellipse(i, -3, 5, 4).fill({ color: 0xfceec0, alpha: 0.8 })
    gloss(g, -46, -8, 7, 0.35)
    return g
  },
  banan: () => {
    const g = G()
    g.moveTo(-84, -6).quadraticCurveTo(0, 26, 84, -10).quadraticCurveTo(78, 6, 60, 14)
      .quadraticCurveTo(0, 38, -72, 8).closePath().fill(0xf2cf4a)
    g.moveTo(-80, -4).quadraticCurveTo(0, 26, 80, -8).stroke({ width: 5, color: 0xfae596, alpha: 0.9 })
    g.roundRect(76, -20, 18, 15, 6).fill(0x8a6a2a)
    return g
  },
  jordgubbe: () => {
    const g = G()
    g.moveTo(-58, -8).quadraticCurveTo(-30, -20, 10, -16).quadraticCurveTo(54, -12, 58, 0)
      .quadraticCurveTo(40, 20, -6, 20).quadraticCurveTo(-52, 18, -58, -8).fill(0xe0392e)
    for (const [x, y] of [[-34, -2], [-8, 6], [18, -4], [36, 6], [4, -10]]) {
      g.ellipse(x, y, 3, 4).fill({ color: 0xffe08a, alpha: 0.95 })
    }
    for (const [dx, dy] of [[-16, -10], [0, -14], [16, -10]]) {
      g.moveTo(-8, -14).quadraticCurveTo(-8 + dx, -22 + dy, -8 + dx * 1.6, -14 + dy * 0.4).fill(0x4e9a3c)
    }
    gloss(g, -30, -6, 7, 0.35)
    return g
  },
  pizza: () => {
    const g = G()
    g.moveTo(-80, 12).lineTo(72, -12).quadraticCurveTo(88, -8, 84, 4).lineTo(78, 18)
      .quadraticCurveTo(0, 26, -80, 12).closePath().fill(0xe7a85d)
    g.moveTo(-76, 8).lineTo(70, -8).quadraticCurveTo(78, 0, 72, 10).quadraticCurveTo(0, 18, -76, 8)
      .closePath().fill(0xf3cd63)
    for (const [x, y] of [[-40, 6], [4, 0], [44, 2]]) g.ellipse(x, y, 11, 7).fill(0xcf4326)
    g.moveTo(70, -12).quadraticCurveTo(90, -6, 84, 8).quadraticCurveTo(78, -2, 70, -12).fill(0xd9954c)
    return g
  },
  korv: () => {
    const g = G()
    g.roundRect(-96, -16, 192, 32, 16).fill(0xb0503a)
    g.roundRect(-96, -16, 192, 11, 10).fill({ color: 0xd0705a, alpha: 0.8 })
    for (const x of [-60, -20, 20, 60]) g.ellipse(x, 6, 12, 4).fill({ color: 0x8f3c2a, alpha: 0.6 })
    g.moveTo(-70, -6).quadraticCurveTo(-20, 6, 30, -6).quadraticCurveTo(60, -12, 78, -4)
      .stroke({ width: 6, color: 0xf3d14a, alpha: 0.95 })
    return g
  },
  pommes: () => {
    const g = G()
    for (const [x, y] of [[-52, 10], [-6, 12], [40, 10], [-28, -6], [18, -8]]) {
      g.roundRect(x - 34, y - 7, 68, 14, 6).fill(0xf0b73c).stroke({ width: 2.5, color: 0xd1912a })
      g.roundRect(x - 30, y - 5, 60, 5, 3).fill({ color: 0xfbd478, alpha: 0.85 })
    }
    return g
  },
  kringla: () => {
    const g = G()
    g.moveTo(-64, 14).quadraticCurveTo(-84, -18, -40, -18).quadraticCurveTo(-8, -16, 0, 8)
      .stroke({ width: 15, color: 0x9a5f2a, cap: 'round' })
    g.moveTo(64, 14).quadraticCurveTo(84, -18, 40, -18).quadraticCurveTo(8, -16, 0, 8)
      .stroke({ width: 15, color: 0x9a5f2a, cap: 'round' })
    g.moveTo(-64, 14).quadraticCurveTo(0, 26, 64, 14).stroke({ width: 15, color: 0xb0763a, cap: 'round' })
    for (const [x, y] of [[-40, -10], [0, 14], [38, -8], [16, 4]]) g.circle(x, y, 2.6).fill(0xfff6e0)
    return g
  },
  munk: () => {
    const g = G()
    g.roundRect(-72, -12, 144, 32, 16).fill(0xd99a52)
    g.moveTo(-72, -6).quadraticCurveTo(-64, -24, -30, -22).quadraticCurveTo(0, -26, 34, -22)
      .quadraticCurveTo(66, -24, 72, -4).quadraticCurveTo(60, 6, 30, 2).quadraticCurveTo(0, 8, -32, 2)
      .quadraticCurveTo(-62, 6, -72, -6).fill(0xf584b0)
    for (const [x, y, c] of [[-46, -12, 0xfff05a], [-16, -16, 0x63d2f0], [16, -14, 0x9be86a], [44, -10, 0xfff05a]]) {
      g.roundRect(x, y, 12, 5, 2.5).fill(c)
    }
    gloss(g, -40, -16, 6, 0.3)
    return g
  },
  kaka: () => {
    const g = G()
    g.moveTo(-64, 2).quadraticCurveTo(-62, -18, -20, -18).quadraticCurveTo(46, -20, 62, -2)
      .quadraticCurveTo(64, 16, 10, 18).quadraticCurveTo(-56, 20, -64, 2).fill(0xd6a35e)
    for (const [x, y, r] of [[-36, -4, 7], [-4, 4, 6], [26, -6, 7], [44, 6, 5]]) g.circle(x, y, r).fill(0x5b3a20)
    gloss(g, -30, -12, 7, 0.3)
    return g
  },
  choklad: () => {
    const g = G()
    g.roundRect(-84, -16, 168, 32, 6).fill(0x5b3a20)
    for (let i = -3; i <= 2; i++) g.roundRect(i * 27 + 3, -13, 22, 26, 4).fill({ color: 0x74492a, alpha: 0.95 })
    g.roundRect(38, -18, 50, 36, 6).fill(0xd8b25a).stroke({ width: 3, color: 0xb08f3f })
    g.roundRect(44, -12, 34, 8, 4).fill({ color: 0xf0d894, alpha: 0.9 })
    return g
  },
  is: () => {
    const g = G()
    g.roundRect(-52, -20, 104, 40, 12).fill(0xcfeefb).stroke({ width: 4, color: 0x8fc9e4 })
    g.roundRect(-44, -14, 40, 14, 6).fill({ color: 0xffffff, alpha: 0.85 })
    g.moveTo(10, 10).lineTo(38, -10).stroke({ width: 5, color: 0xffffff, alpha: 0.7, cap: 'round' })
    return g
  },
  mask: () => {
    const g = G()
    for (const [x, r] of [[-58, 17], [-28, 18], [4, 18], [36, 17]]) g.circle(x, 0, r).fill(0x6bbf3f)
    g.circle(62, -2, 19).fill(0x84d152)
    for (const [x, r] of [[-58, 8], [-28, 9], [4, 9]]) g.circle(x, -6, r).fill({ color: 0x93dd61, alpha: 0.7 })
    g.moveTo(56, -20).quadraticCurveTo(52, -34, 60, -36).stroke({ width: 3, color: 0x4a8a2a, cap: 'round' })
    g.moveTo(70, -20).quadraticCurveTo(74, -34, 82, -34).stroke({ width: 3, color: 0x4a8a2a, cap: 'round' })
    face(g, 64, -4, 0.95)
    return g
  },
  blackfisk: () => {
    const g = G()
    for (const [x, len] of [[-56, 26], [-24, 32], [10, 32], [44, 26]]) {
      g.moveTo(x, 2).quadraticCurveTo(x + 10, 14 + len * 0.4, x - 6, 22)
        .stroke({ width: 11, color: 0xb066cc, cap: 'round' })
    }
    g.moveTo(-62, 4).quadraticCurveTo(-58, -26, -4, -26).quadraticCurveTo(52, -26, 56, 2)
      .quadraticCurveTo(0, 14, -62, 4).fill(0xc478dd)
    for (const [x, y] of [[-30, -14], [16, -16]]) g.ellipse(x, y, 8, 6).fill({ color: 0xe0aef0, alpha: 0.8 })
    face(g, -4, -10, 1.05)
    return g
  },
  krabba: () => {
    const g = G()
    legsUnder(g, 6, 52, 8, 16, 0xd0432c, 5)
    g.moveTo(-72, -6).quadraticCurveTo(-40, -30, 0, -30).quadraticCurveTo(40, -30, 72, -6)
      .quadraticCurveTo(0, 16, -72, -6).fill(0xe0503a)
    g.moveTo(-66, -6).quadraticCurveTo(0, 8, 66, -6).quadraticCurveTo(0, 2, -66, -6).fill({ color: 0xf07a5a, alpha: 0.7 })
    for (const s of [-1, 1]) {
      g.moveTo(s * 66, -10).quadraticCurveTo(s * 86, -18, s * 84, -30).stroke({ width: 7, color: 0xd0432c, cap: 'round' })
      g.moveTo(s * 78, -30).quadraticCurveTo(s * 96, -40, s * 90, -20).quadraticCurveTo(s * 84, -24, s * 78, -30).fill(0xe0503a)
    }
    face(g, 0, -14, 1.05)
    return g
  },
  groda: () => {
    const g = G()
    legsUnder(g, 4, 46, 6, 14, 0x4e9a3c, 7)
    g.moveTo(-64, 2).quadraticCurveTo(-60, -22, 0, -22).quadraticCurveTo(60, -22, 64, 2)
      .quadraticCurveTo(0, 20, -64, 2).fill(0x63b83f)
    g.moveTo(-52, 4).quadraticCurveTo(0, 16, 52, 4).quadraticCurveTo(0, 10, -52, 4).fill({ color: 0xd7ef9a, alpha: 0.9 })
    for (const x of [-22, 22]) {
      g.circle(x, -24, 13).fill(0x63b83f)
      g.circle(x, -26, 8).fill(0xffffff)
      g.circle(x, -26, 4.5).fill(0x2f2a26)
    }
    g.moveTo(-16, 0).quadraticCurveTo(0, 9, 16, 0).stroke({ width: 3, color: 0x2f6b22, cap: 'round' })
    return g
  },
  godis: () => {
    const g = G()
    g.moveTo(-40, -16).quadraticCurveTo(0, -22, 40, -16).quadraticCurveTo(46, 0, 40, 16)
      .quadraticCurveTo(0, 22, -40, 16).quadraticCurveTo(-46, 0, -40, -16).fill(0xf06fa8)
    for (const s of [-1, 1]) {
      g.moveTo(s * 40, -14).lineTo(s * 74, -22).lineTo(s * 66, 0).lineTo(s * 76, 20).lineTo(s * 40, 14)
        .closePath().fill(0xf9a6c8)
    }
    g.moveTo(-24, -8).quadraticCurveTo(0, 0, -20, 12).stroke({ width: 5, color: 0xffffff, alpha: 0.55, cap: 'round' })
    return g
  },
  bajs: () => {
    const g = G()
    g.moveTo(-56, 22).quadraticCurveTo(-52, 2, -34, 0).quadraticCurveTo(-46, -14, -26, -18)
      .quadraticCurveTo(-20, -34, 4, -32).quadraticCurveTo(28, -32, 30, -16)
      .quadraticCurveTo(52, -12, 46, 4).quadraticCurveTo(62, 8, 56, 22).closePath().fill(0x7a4a24)
    g.moveTo(-44, 12).quadraticCurveTo(0, 4, 44, 12).stroke({ width: 4, color: 0x96602f, alpha: 0.8 })
    g.moveTo(-22, -8).quadraticCurveTo(2, -16, 26, -8).stroke({ width: 4, color: 0x96602f, alpha: 0.8 })
    face(g, 2, 2, 1.1)
    return g
  },
  strumpa: () => {
    const g = G()
    g.moveTo(-16, -22).lineTo(22, -22).lineTo(22, 6).quadraticCurveTo(22, 20, 2, 22)
      .lineTo(-56, 24).quadraticCurveTo(-72, 20, -66, 6).lineTo(-16, 4).closePath().fill(0x5aa8d8)
    g.roundRect(-20, -26, 46, 13, 6).fill(0xf0f4f8).stroke({ width: 3, color: PALE_EDGE })
    g.moveTo(-16, -4).lineTo(22, -4).stroke({ width: 6, color: 0xf0f4f8 })
    g.circle(-40, 12, 7).fill({ color: 0x7a6244, alpha: 0.6 })
    return g
  },
  fisk: () => {
    const g = G()
    g.moveTo(58, 0).lineTo(94, -20).quadraticCurveTo(88, 0, 94, 20).closePath().fill(0x3f9ec8)
    g.moveTo(-84, 0).quadraticCurveTo(-40, -26, 20, -22).quadraticCurveTo(58, -18, 62, 0)
      .quadraticCurveTo(58, 18, 20, 22).quadraticCurveTo(-40, 26, -84, 0).fill(0x5ab8e0)
    g.moveTo(-70, 6).quadraticCurveTo(-10, 22, 50, 8).quadraticCurveTo(-10, 14, -70, 6).fill({ color: 0xc4ecfa, alpha: 0.9 })
    g.moveTo(0, -20).quadraticCurveTo(10, -34, 26, -20).fill(0x3f9ec8)
    for (const [x, y] of [[6, 2], [26, -4], [26, 8]]) g.circle(x, y, 5).fill({ color: 0x9bdcf4, alpha: 0.8 })
    face(g, -52, -2, 0.95)
    return g
  },
  ben: () => {
    const g = G()
    g.roundRect(-52, -9, 104, 18, 9).fill(0xfaf3e2).stroke({ width: 3.5, color: PALE_EDGE })
    for (const s of [-1, 1]) {
      g.circle(s * 60, -13, 14).fill(0xfaf3e2).stroke({ width: 3.5, color: PALE_EDGE })
      g.circle(s * 60, 13, 14).fill(0xfaf3e2).stroke({ width: 3.5, color: PALE_EDGE })
    }
    g.roundRect(-46, -6, 92, 6, 3).fill({ color: 0xffffff, alpha: 0.7 })
    return g
  },
  stjarna: () => {
    const g = G()
    g.star(0, 0, 5, 46, 21).fill(0xffc93c).stroke({ width: 4, color: 0xe0a41e })
    g.star(0, 0, 5, 30, 13).fill({ color: 0xffe27a, alpha: 0.85 })
    face(g, 0, -2, 0.9)
    return g
  },
  spindel: () => {
    const g = G()
    legsUnder(g, 8, 56, 0, 20, 0x3a3040, 4)
    for (let i = 0; i < 8; i++) {
      const x = -56 + (i / 7) * 112
      g.moveTo(x, 0).quadraticCurveTo(x * 1.2, -22, x * 1.35, -12).stroke({ width: 4, color: 0x3a3040, cap: 'round' })
    }
    g.ellipse(-6, 0, 42, 26).fill(0x50435e)
    g.ellipse(-6, -6, 30, 14).fill({ color: 0x6b5a7c, alpha: 0.8 })
    g.circle(34, 2, 18).fill(0x50435e)
    face(g, 36, 0, 0.85, 0xfff4d8)
    return g
  },
  snigel: () => {
    const g = G()
    g.moveTo(-76, 18).quadraticCurveTo(-88, 2, -66, -2).quadraticCurveTo(-40, -8, -6, 0)
      .quadraticCurveTo(40, 8, 74, 18).quadraticCurveTo(0, 26, -76, 18).fill(0xe0b98a)
    g.circle(20, -6, 30).fill(0xc98a3e)
    g.circle(20, -6, 22).fill(0xe8a94e)
    g.circle(20, -6, 13).fill(0xc98a3e)
    g.circle(20, -6, 6).fill(0xe8a94e)
    g.moveTo(-64, -2).quadraticCurveTo(-72, -22, -62, -26).stroke({ width: 3.5, color: 0xd0a878, cap: 'round' })
    g.moveTo(-52, -4).quadraticCurveTo(-48, -24, -38, -26).stroke({ width: 3.5, color: 0xd0a878, cap: 'round' })
    g.circle(-62, -28, 4).fill(0x2f2a26)
    g.circle(-37, -28, 4).fill(0x2f2a26)
    g.moveTo(-62, 6).quadraticCurveTo(-54, 12, -46, 6).stroke({ width: 2.4, color: 0x2f2a26, cap: 'round' })
    return g
  },
  tandborste: () => {
    const g = G()
    g.roundRect(-96, -8, 130, 16, 8).fill(0x3fa8d8).stroke({ width: 3, color: 0x2d86b0 })
    g.roundRect(-96, -6, 40, 6, 3).fill({ color: 0xa8e0f4, alpha: 0.9 })
    g.roundRect(28, -13, 60, 26, 10).fill(0x2d86b0)
    for (let i = 0; i < 6; i++) {
      g.roundRect(34 + i * 9, -26, 7, 16, 3).fill(0xfdfaf2).stroke({ width: 2, color: PALE_EDGE })
    }
    return g
  },
  kackerlacka: () => {
    const g = G()
    legsUnder(g, 6, 48, 4, 15, 0x5b3a20, 4)
    g.moveTo(-66, -2).quadraticCurveTo(-60, -22, 0, -22).quadraticCurveTo(58, -22, 66, -2)
      .quadraticCurveTo(0, 18, -66, -2).fill(0x8a5a2b)
    g.moveTo(-56, -4).quadraticCurveTo(0, 10, 56, -4).quadraticCurveTo(0, 4, -56, -4).fill({ color: 0xa8763c, alpha: 0.9 })
    g.moveTo(0, -20).quadraticCurveTo(4, 6, 0, 14).stroke({ width: 3, color: 0x5b3a20, alpha: 0.8 })
    g.circle(-58, -10, 15).fill(0x74491f)
    g.moveTo(-66, -22).quadraticCurveTo(-84, -34, -92, -28).stroke({ width: 3, color: 0x5b3a20, cap: 'round' })
    g.moveTo(-62, -24).quadraticCurveTo(-72, -40, -62, -44).stroke({ width: 3, color: 0x5b3a20, cap: 'round' })
    face(g, -58, -12, 0.8, 0xfff4d8)
    return g
  },
  kalsonger: () => {
    const g = G()
    g.moveTo(-64, -14).lineTo(64, -14).lineTo(58, 14).quadraticCurveTo(40, 22, 26, 12)
      .quadraticCurveTo(0, -2, -26, 12).quadraticCurveTo(-40, 22, -58, 14).closePath().fill(0x5a9ad8)
    for (const x of [-40, -12, 16, 44]) g.roundRect(x, -12, 9, 24, 4).fill({ color: 0x84bcee, alpha: 0.8 })
    g.roundRect(-66, -22, 132, 14, 7).fill(0xf0f4f8).stroke({ width: 3, color: PALE_EDGE })
    return g
  },
  toapapper: () => {
    const g = G()
    g.moveTo(30, -16).quadraticCurveTo(74, -22, 78, 4).quadraticCurveTo(80, 18, 62, 18)
      .lineTo(30, 18).closePath().fill(0xfdfaf2).stroke({ width: 3, color: PALE_EDGE })
    g.roundRect(-38, -22, 74, 44, 12).fill(0xfffdf6).stroke({ width: 3.5, color: PALE_EDGE })
    g.ellipse(-38, 0, 11, 22).fill(0xf3ece0).stroke({ width: 3, color: PALE_EDGE })
    g.ellipse(-38, 0, 5, 10).fill(0xd8c9ad)
    for (const x of [-14, 4, 22]) g.moveTo(x, -18).lineTo(x, 18).stroke({ width: 2, color: 0xece4d6 })
    return g
  },
  tand: () => {
    const g = G()
    g.moveTo(-42, -6).quadraticCurveTo(-44, -24, -14, -24).quadraticCurveTo(14, -26, 42, -22)
      .quadraticCurveTo(50, -6, 40, 6).quadraticCurveTo(32, 22, 22, 8).quadraticCurveTo(12, -4, 0, 8)
      .quadraticCurveTo(-12, 22, -24, 6).quadraticCurveTo(-40, -2, -42, -6)
      .fill(0xfffdf6).stroke({ width: 3.5, color: PALE_EDGE })
    g.moveTo(-30, -14).quadraticCurveTo(-10, -20, 12, -16).stroke({ width: 5, color: 0xffffff, alpha: 0.85 })
    face(g, 0, -8, 0.75)
    return g
  },
  mygga: () => {
    const g = G()
    wing(g, -6, -8, 46, 24)
    g.moveTo(-6, -8).quadraticCurveTo(-30, -34, -52, -22).quadraticCurveTo(-30, -6, -6, -8)
      .fill({ color: 0xdff0fb, alpha: 0.72 })
    g.ellipse(0, 2, 30, 13).fill(0x4a4058)
    g.ellipse(0, -2, 22, 6).fill({ color: 0x6b5f7c, alpha: 0.8 })
    g.circle(30, -2, 13).fill(0x584a68)
    g.moveTo(42, 0).lineTo(64, 8).stroke({ width: 4, color: 0x4a4058, cap: 'round' })
    for (const s of [-1, 1]) g.moveTo(s * 12, 12).lineTo(s * 20, 26).stroke({ width: 3, color: 0x4a4058, cap: 'round' })
    face(g, 31, -4, 0.72, 0xfff4d8)
    return g
  },
  daggmask: () => {
    const g = G()
    g.moveTo(-80, 12).quadraticCurveTo(-50, -18, -16, 4).quadraticCurveTo(18, 26, 48, 0)
      .quadraticCurveTo(66, -14, 80, -4)
      .stroke({ width: 22, color: 0xe89a9e, cap: 'round' })
    g.moveTo(-76, 10).quadraticCurveTo(-48, -16, -14, 2).quadraticCurveTo(16, 22, 46, -2)
      .stroke({ width: 8, color: 0xf5babe, alpha: 0.8, cap: 'round' })
    for (const [x, y] of [[-52, -2], [-22, 6], [10, 14], [40, 2]]) g.ellipse(x, y, 3, 9).fill({ color: 0xd07e84, alpha: 0.7 })
    face(g, 78, -6, 0.72)
    return g
  },
  disksvamp: () => {
    const g = G()
    g.roundRect(-72, -4, 144, 22, 7).fill(0x4aa8b8)
    g.roundRect(-72, -20, 144, 20, 7).fill(0xf5d64a)
    for (const [x, y, r] of [[-46, -12, 5], [-8, -8, 4], [24, -13, 5], [52, -9, 4]]) g.circle(x, y, r).fill(0xd9b52e)
    g.roundRect(-70, -19, 140, 5, 3).fill({ color: 0xfbe98a, alpha: 0.9 })
    return g
  },
  pappa: () => lyingPerson(0x4a8ad0, 0x5b3a20, 0x3f5a86),
  mamma: () => lyingPerson(0xe0648a, 0xe0a53c, 0x8a4a68),
  fluga: () => {
    const g = G()
    wing(g, -4, -10, 40, 26)
    g.moveTo(-4, -10).quadraticCurveTo(-26, -36, -46, -24).quadraticCurveTo(-26, -8, -4, -10)
      .fill({ color: 0xdff0fb, alpha: 0.72 })
    g.ellipse(0, 2, 32, 17).fill(0x3a3442)
    g.ellipse(0, -3, 24, 8).fill({ color: 0x5b5268, alpha: 0.85 })
    g.circle(30, 0, 16).fill(0x484056)
    for (const s of [-1, 1]) g.moveTo(s * 14, 15).lineTo(s * 22, 28).stroke({ width: 3.5, color: 0x3a3442, cap: 'round' })
    g.circle(38, -6, 7).fill(0xd0402c)
    face(g, 30, -2, 0.8, 0xfff4d8)
    return g
  },
  monster: () => {
    const g = G()
    for (const s of [-1, 1]) {
      g.moveTo(s * 30, -18).lineTo(s * 40, -42).lineTo(s * 48, -16).closePath().fill(0x3fa8a0)
    }
    g.moveTo(-64, 4).quadraticCurveTo(-62, -24, 0, -24).quadraticCurveTo(62, -24, 64, 4)
      .quadraticCurveTo(48, 20, 22, 14).quadraticCurveTo(0, 24, -22, 14).quadraticCurveTo(-48, 20, -64, 4)
      .fill(0x4ac4b8)
    g.moveTo(-52, 2).quadraticCurveTo(0, 14, 52, 2).quadraticCurveTo(0, 8, -52, 2).fill({ color: 0x8ce0d6, alpha: 0.8 })
    g.circle(0, -6, 19).fill(0xfffdf6).stroke({ width: 3, color: 0x2f9a90 })
    g.circle(4, -6, 10).fill(0x2f2a26)
    g.circle(8, -10, 4).fill(0xffffff)
    g.moveTo(-22, 6).quadraticCurveTo(-16, 13, -8, 8).stroke({ width: 3, color: 0x2f7a72, cap: 'round' })
    return g
  },
  kissdroppe: () => {
    const g = G()
    g.moveTo(0, -30).quadraticCurveTo(16, -6, 18, 4).quadraticCurveTo(18, 22, 0, 22)
      .quadraticCurveTo(-18, 22, -18, 4).quadraticCurveTo(-16, -6, 0, -30).fill(0xf5d637)
    g.ellipse(-6, 4, 5, 8).fill({ color: 0xffffff, alpha: 0.55 })
    face(g, 1, 4, 0.7)
    return g
  },
  anvand_bloja: () => {
    const g = G()
    g.roundRect(-58, -22, 116, 44, 20).fill(0xf6f2ea).stroke({ width: 4, color: PALE_EDGE })
    g.roundRect(-58, -22, 116, 14, 11).fill({ color: 0xbfe3f0, alpha: 0.9 })
    for (const s of [-1, 1]) g.roundRect(s * 44 - 9, -20, 18, 12, 5).fill(0x8fd0e4)
    g.circle(2, 6, 10).fill(0x8a5a2b)
    g.circle(18, 10, 6).fill(0x9a682f)
    return g
  },
  potta: () => {
    const g = G()
    g.roundRect(-46, -12, 92, 36, 15).fill(0x7fc8e8).stroke({ width: 4, color: 0x5aa8cc })
    g.ellipse(0, -12, 46, 11).fill(0xa8ddf2).stroke({ width: 3, color: 0x5aa8cc })
    g.ellipse(0, -12, 31, 6).fill(0x6fb8d8)
    g.circle(56, -2, 10).stroke({ width: 7, color: 0x7fc8e8 })
    g.roundRect(-40, 8, 80, 5, 3).fill({ color: 0xffffff, alpha: 0.35 })
    return g
  },
  prutt: () => {
    const g = G()
    for (const [x, y, r] of [[-52, 4, 22], [-16, -6, 26], [22, 0, 24], [54, 8, 18]]) {
      g.circle(x, y, r).fill({ color: 0xb8d98a, alpha: 0.55 })
    }
    for (const [x, y, r] of [[-46, 2, 12], [-12, -8, 14], [24, -2, 12]]) {
      g.circle(x, y, r).fill({ color: 0xd8ecb4, alpha: 0.6 })
    }
    for (const [x, y] of [[-30, 14], [8, 16], [40, 12]]) {
      g.moveTo(x, y).quadraticCurveTo(x + 10, y + 8, x + 20, y).stroke({ width: 3, color: 0x9ac46a, alpha: 0.7, cap: 'round' })
    }
    face(g, 0, 0, 0.85, 0x6b8a44)
    return g
  },
}

// ================================ hyllans innehåll ================================
// th = lagrets tjocklek i stapeln · w = ritad bredd (träffyta + hyllskala)
// bake = hur mycket lagret bryns på grillen (1 = kött, 0.1 = sallad som knappt ändras)
// good = får dyka upp i Bobos önskelista (bara riktig burgarmat)
// sv   = talat namn (literal → får ett röstklipp via /rost)

const I = (id, sv, th, w, bake, good = false) => ({ id, sv, th, w, bake, good, draw: DRAW[id] })

export const ITEMS = [
  // klassiska lager
  I('sallad', 'Sallad', 30, 240, 0.1, true),
  I('ost', 'Ost', 24, 232, 0.45, true),
  I('biff', 'Biff', 42, 220, 1, true),
  I('tomat', 'Tomat', 28, 208, 0.15, true),
  I('bacon', 'Bacon', 22, 216, 1, true),
  // goda grejer
  I('avokado', 'Avokado', 42, 150, 0.2, true),
  I('morot', 'Morot', 42, 176, 0.3, true),
  I('majs', 'Majs', 42, 176, 0.4, true),
  I('aubergine', 'Aubergine', 44, 170, 0.5, true),
  I('potatis', 'Potatis', 42, 145, 0.6, true),
  I('kottbit', 'Köttbit', 44, 176, 1, true),
  I('kyckling', 'Kycklingklubba', 44, 180, 0.9, true),
  I('smor', 'Smör', 38, 120, 0.5),
  I('oliv', 'Oliv', 36, 124, 0.2, true),
  I('honung', 'Honung', 42, 165, 0.55),
  // extra & överraskningar
  I('raka', 'Räka', 44, 145, 0.6, true),
  I('lok', 'Lök', 40, 180, 0.5, true),
  I('gurka', 'Gurka', 34, 180, 0.1, true),
  I('stekt_agg', 'Stekt ägg', 40, 175, 0.4, true),
  I('agg', 'Ägg', 44, 130, 0.35, true),
  I('chili', 'Chili', 40, 160, 0.4),
  I('paprika', 'Paprika', 42, 175, 0.3, true),
  I('svamp', 'Svamp', 42, 125, 0.7, true),
  I('broccoli', 'Broccoli', 46, 130, 0.3, true),
  I('ananas', 'Ananas', 44, 175, 0.35),
  I('banan', 'Banan', 44, 175, 0.3),
  I('jordgubbe', 'Jordgubbe', 40, 120, 0.2),
  I('pizza', 'Pizza', 44, 175, 0.6),
  I('korv', 'Korv', 40, 195, 0.9, true),
  I('pommes', 'Pommes', 46, 175, 0.7, true),
  I('kringla', 'Kringla', 44, 165, 0.6),
  I('munk', 'Munk', 46, 148, 0.4),
  I('kaka', 'Kaka', 40, 130, 0.5),
  I('choklad', 'Choklad', 38, 175, 0.5),
  I('is', 'Isbit', 40, 110, 0.05),
  I('mask', 'Larv', 38, 165, 0.4),
  I('blackfisk', 'Bläckfisk', 48, 130, 0.5),
  I('krabba', 'Krabba', 46, 190, 0.5),
  I('groda', 'Groda', 44, 135, 0.3),
  I('godis', 'Godis', 38, 155, 0.3),
  // roliga grejer
  I('bajs', 'Bajs', 54, 118, 0.6),
  I('strumpa', 'Strumpa', 50, 150, 0.4),
  I('fisk', 'Fisk', 48, 180, 0.6),
  I('ben', 'Ben', 46, 150, 0.2),
  I('stjarna', 'Stjärna', 46, 96, 0.1),
  // äckligt-roliga
  I('spindel', 'Spindel', 44, 155, 0.3),
  I('snigel', 'Snigel', 42, 160, 0.3),
  I('tandborste', 'Tandborste', 46, 195, 0.2),
  I('kackerlacka', 'Kackerlacka', 40, 190, 0.4),
  I('kalsonger', 'Kalsonger', 46, 135, 0.3),
  I('toapapper', 'Toapapper', 46, 120, 0.4),
  I('tand', 'Tand', 38, 90, 0.15),
  I('mygga', 'Mygga', 38, 130, 0.3),
  I('daggmask', 'Daggmask', 40, 165, 0.35),
  I('disksvamp', 'Disksvamp', 42, 148, 0.3),
  // specialare
  I('pappa', 'Pappa', 48, 175, 0.25),
  I('mamma', 'Mamma', 48, 175, 0.25),
  I('fluga', 'Fluga', 36, 130, 0.3),
  I('monster', 'Gulligt monster', 46, 135, 0.2),
  I('kissdroppe', 'Kissdroppe', 44, 40, 0.15),
  I('anvand_bloja', 'Använd blöja', 44, 120, 0.3),
  I('potta', 'Potta', 46, 135, 0.2),
  I('prutt', 'Prutt', 42, 115, 0.1),
]

// En vy för en ingrediens. `fit` = största tillåtna bredd (hyllan) — skalas ner så att
// även en 240 px sallad får plats i ett 120 px hyllfack utan att tappa sin silhuett.
export function makeItemView(item, fit = 0) {
  const g = item.draw()
  g.eventMode = 'none'
  // Centrera den RITADE massan kring (0,0). Utan detta hamnar allt med utstickande
  // delar (antenner, stjälkar, ben) snett i sitt fack — både i hyllan och i stapeln.
  const b = g.getLocalBounds()
  g.pivot.set(b.x + b.width / 2, b.y + b.height / 2)
  if (fit && item.w > fit) g.scale.set(fit / item.w)
  return g
}

export default DRAW
