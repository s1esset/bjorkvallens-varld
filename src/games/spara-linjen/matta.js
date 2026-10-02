// Ritbordets kulisser (L2). Förut: pappret låg på en krämplatta. Nu ligger det på en
// lekmatta vars värld följer motivet — berg i ett bergslandskap, fisken i havet, stjärnan
// under natthimlen — och mattan ligger på ett trabord. Kurv-rundorna (ingen figur) får en
// lugn mintmatta med prickar och kritkrumelurer.
//
// Mattan syns bara RUNT pappret (papperet täcker mitten), så scenen ritas som ett landskap
// som fortsätter bakom arket: marken längs sidorna och nederkanten, himlen längs sidorna och
// överkanten. Allt är platta fyllningar (inga gradienter — mattan byts varje runda) och
// ritas en gång per runda. Inget är högre än ~150 px över horisonten och vänsterhörnet
// (bakom skalets knappar) lämnas stilla.
import { Container, Graphics } from 'pixi.js'
import { shade, COLORS } from '../../lib/theme.js'
import { verticalFill } from '../../lib/form.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

export const MAT = { x: 20, y: 20, w: 1240, h: 526, r: 44 }
const MX1 = MAT.x + MAT.w
const MY1 = MAT.y + MAT.h

// ---- Trabordet under mattan ----------------------------------------------------------
const C_TRA_TOP = 0xf0dcb0
const C_TRA_BOT = 0xe0c590

export function byggSkrivbord(W, H) {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  const x0 = -BLEED_X
  const y0 = -BLEED_Y
  const bredd = W + 2 * BLEED_X
  const hojd = H + 2 * BLEED_Y
  c.addChild(new Graphics().rect(x0, y0, bredd, hojd).fill(verticalFill(C_TRA_TOP, C_TRA_BOT)))
  // Plankor: vågräta skarvar var 100:e px och förskjutna stötskarvar.
  const sark = new Graphics()
  const glans = new Graphics()
  for (let rad = 0, y = 30; y < H + BLEED_Y; rad++, y += 100) {
    sark.moveTo(x0, y).lineTo(x0 + bredd, y)
    glans.moveTo(x0, y + 3).lineTo(x0 + bredd, y + 3)
    for (let sx = 140 + ((rad * 277) % 520); sx < W + BLEED_X; sx += 640) {
      sark.moveTo(sx, y).lineTo(sx, y + 100)
      glans.moveTo(sx + 3, y + 4).lineTo(sx + 3, y + 100)
    }
  }
  sark.stroke({ width: 3, color: 0xa97c46, alpha: 0.3 })
  glans.stroke({ width: 2, color: COLORS.white, alpha: 0.2 })
  c.addChild(sark, glans)
  return c
}

// ---- Småformer ----------------------------------------------------------------------
function moln(g, x, y, s, a = 0.92) {
  g.circle(x - s * 0.6, y + s * 0.12, s * 0.48)
    .circle(x, y - s * 0.2, s * 0.64)
    .circle(x + s * 0.7, y + s * 0.1, s * 0.46)
    .rect(x - s * 0.6, y + s * 0.12, s * 1.3, s * 0.46)
    .fill({ color: 0xffffff, alpha: a })
}
function trad(g, x, y, s, krona = 0x5fb85a) {
  g.rect(x - s * 0.09, y - s * 0.1, s * 0.18, s * 0.55).fill(0x8a5a3b)
  g.circle(x, y - s * 0.36, s * 0.42).fill(krona)
  g.circle(x - s * 0.24, y - s * 0.16, s * 0.28).fill(krona)
  g.circle(x + s * 0.24, y - s * 0.16, s * 0.28).fill(krona)
}
function gran(g, x, y, s, farg = 0x3f9a5a) {
  g.rect(x - s * 0.07, y, s * 0.14, s * 0.26).fill(0x7a4e32)
  g.poly([x - s * 0.42, y + s * 0.06, x, y - s * 0.5, x + s * 0.42, y + s * 0.06]).fill(farg)
  g.poly([x - s * 0.32, y - s * 0.22, x, y - s * 0.82, x + s * 0.32, y - s * 0.22]).fill(farg)
}
function stjarna(g, x, y, r, farg, a = 1) {
  const p = []
  for (let i = 0; i < 10; i++) {
    const v = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    p.push(x + Math.cos(v) * rr, y + Math.sin(v) * rr)
  }
  g.poly(p).fill({ color: farg, alpha: a })
}
function hjarta(g, x, y, s, farg, a = 1) {
  g.circle(x - s * 0.26, y - s * 0.14, s * 0.3)
    .circle(x + s * 0.26, y - s * 0.14, s * 0.3)
    .poly([x - s * 0.53, y - s * 0.02, x + s * 0.53, y - s * 0.02, x, y + s * 0.56])
    .fill({ color: farg, alpha: a })
}
function blomma(g, x, y, s, kron, mitt = 0xffd35c) {
  g.rect(x - 2, y, 4, s * 1.1).fill(0x4f9a49)
  for (let k = 0; k < 5; k++) {
    const v = (k / 5) * Math.PI * 2 - Math.PI / 2
    g.circle(x + Math.cos(v) * s * 0.36, y + Math.sin(v) * s * 0.36, s * 0.26).fill(kron)
  }
  g.circle(x, y, s * 0.2).fill(mitt)
}
function tuss(g, x, y, s, farg) {
  g.poly([x - s * 0.5, y, x - s * 0.34, y - s, x - s * 0.1, y]).fill(farg)
  g.poly([x - s * 0.2, y, x, y - s * 1.3, x + s * 0.2, y]).fill(farg)
  g.poly([x + s * 0.1, y, x + s * 0.34, y - s, x + s * 0.5, y]).fill(farg)
}
function tass(g, x, y, s, farg, a = 0.5) {
  g.ellipse(x, y + s * 0.18, s * 0.34, s * 0.28)
  for (const [dx, dy] of [[-0.42, -0.2], [-0.15, -0.46], [0.15, -0.46], [0.42, -0.2]]) g.ellipse(x + dx * s, y + dy * s, s * 0.13, s * 0.17)
  g.fill({ color: farg, alpha: a })
}
function bubbla(g, x, y, r) {
  g.circle(x, y, r).stroke({ width: 2.5, color: 0xffffff, alpha: 0.7 })
  g.circle(x - r * 0.35, y - r * 0.35, r * 0.2).fill({ color: 0xffffff, alpha: 0.75 })
}
function tang(g, x, y, h, farg) {
  g.moveTo(x, y)
    .quadraticCurveTo(x - 14, y - h * 0.35, x, y - h * 0.62)
    .quadraticCurveTo(x + 14, y - h * 0.85, x, y - h)
    .stroke({ width: 7, color: farg, cap: 'round' })
}

// Mattans kontur: en form med rundade hörn (quadratiska, samma väg för botten och mark så
// ingen kant sticker ut). `toppRunt = false` ger en markyta med rak överkant.
function form(g, yTop, toppRunt) {
  const r = MAT.r
  if (toppRunt) {
    g.moveTo(MAT.x + r, yTop).lineTo(MX1 - r, yTop).quadraticCurveTo(MX1, yTop, MX1, yTop + r)
  } else {
    g.moveTo(MAT.x, yTop).lineTo(MX1, yTop)
  }
  g.lineTo(MX1, MY1 - r)
    .quadraticCurveTo(MX1, MY1, MX1 - r, MY1)
    .lineTo(MAT.x + r, MY1)
    .quadraticCurveTo(MAT.x, MY1, MAT.x, MY1 - r)
  if (toppRunt) g.lineTo(MAT.x, yTop + r).quadraticCurveTo(MAT.x, yTop, MAT.x + r, yTop)
  g.closePath()
  return g
}

// ---- Världarna ----------------------------------------------------------------------
// sky = fyllning överallt; mark = markyta från horisonten `hy` och nedåt (valfri).
const VARLDAR = {
  berg: {
    sky: 0xbfe3f7, mark: 0x86c872, hy: 360,
    draw(g) {
      g.poly([30, 360, 78, 232, 128, 360]).fill(0x9fb4c8)
      g.poly([78, 232, 64, 266, 92, 266]).fill(0xffffff)
      g.poly([1148, 360, 1204, 206, 1252, 360]).fill(0x9fb4c8)
      g.poly([1204, 206, 1188, 250, 1220, 250]).fill(0xffffff)
      g.poly([1090, 360, 1136, 286, 1190, 360]).fill(0xb4c6d6)
      gran(g, 64, 410, 70)
      gran(g, 1216, 420, 76)
      gran(g, 1178, 470, 52, 0x2f8a4f)
      moln(g, 360, 54, 22)
      moln(g, 860, 50, 26)
      moln(g, 1040, 62, 18)
      g.circle(1124, 56, 22).fill(0xffd96a)
      for (let x = 60; x < 1240; x += 140) tuss(g, x, 538, 14, 0x5fb25a)
    },
  },
  hus: {
    sky: 0xc9e8fb, mark: 0x97d27a, hy: 380,
    draw(g) {
      trad(g, 62, 392, 74)
      trad(g, 1214, 384, 82)
      trad(g, 1160, 440, 50, 0x6cc062)
      moln(g, 420, 50, 22)
      moln(g, 900, 52, 26)
      g.circle(1124, 56, 22).fill(0xffd96a)
      // Staket längs nederkanten.
      g.rect(MAT.x + 20, 524, MAT.w - 40, 6).fill(0xffffff)
      for (let x = 40; x < 1230; x += 36) {
        g.poly([x, 514, x + 10, 504, x + 20, 514, x + 20, 540, x, 540]).fill(0xfffdf7)
      }
      blomma(g, 70, 452, 20, 0xff8fb4)
      blomma(g, 1200, 480, 18, 0xfff06a, 0xff9f43)
    },
  },
  moln: {
    sky: 0xa6d8f6, mark: 0xcdeafc, hy: 300,
    draw(g) {
      moln(g, 62, 150, 30)
      moln(g, 1206, 196, 36)
      moln(g, 1210, 430, 30)
      moln(g, 72, 440, 28)
      moln(g, 330, 50, 20)
      moln(g, 720, 46, 24)
      moln(g, 1000, 54, 20)
      moln(g, 560, 528, 24, 0.9)
      moln(g, 250, 534, 18, 0.9)
      moln(g, 1010, 530, 26, 0.9)
      for (const [bx, by] of [[1130, 130], [1190, 110], [120, 330]]) {
        g.moveTo(bx - 14, by).quadraticCurveTo(bx - 7, by - 10, bx, by).quadraticCurveTo(bx + 7, by - 10, bx + 14, by)
          .stroke({ width: 3, color: 0x4a6a86, alpha: 0.5, cap: 'round' })
      }
    },
  },
  fisk: {
    sky: 0x69bbe8, mark: 0x3f94cf, hy: 290,
    draw(g) {
      // Ljusstrålar uppifrån.
      g.poly([200, 20, 280, 20, 160, 546, 60, 546]).fill({ color: 0xffffff, alpha: 0.07 })
      g.poly([1000, 20, 1100, 20, 1000, 546, 880, 546]).fill({ color: 0xffffff, alpha: 0.06 })
      // Sandbotten (egen yta med raka hörn upptill).
      form(g, 506, false).fill(0xf2d78e)
      g.ellipse(300, 514, 60, 8).fill({ color: 0xe6c374, alpha: 0.7 })
      g.ellipse(900, 520, 80, 8).fill({ color: 0xe6c374, alpha: 0.7 })
      for (const x of [58, 94, 1166, 1204, 1236]) tang(g, x, 512, 90 + (x % 3) * 22, x % 2 ? 0x3aa05e : 0x58bb6f)
      for (const [bx, by, r] of [[70, 180, 10], [96, 120, 7], [1190, 250, 12], [1224, 180, 8], [1160, 360, 9], [60, 340, 8], [600, 52, 8], [900, 60, 11]]) bubbla(g, bx, by, r)
      // En snäcka i sanden.
      g.ellipse(640, 530, 16, 11).fill(0xff9fb4)
      g.ellipse(640, 530, 8, 5).fill({ color: 0xffffff, alpha: 0.45 })
    },
  },
  hjarta: {
    sky: 0xfcd5e3, mark: null,
    draw(g) {
      const h = [
        [60, 180, 30, 0xf58fb2, 0.9], [96, 250, 20, 0xffffff, 0.7], [58, 400, 26, 0xf58fb2, 0.8],
        [100, 500, 18, 0xffffff, 0.7], [1210, 172, 28, 0xf58fb2, 0.9], [1170, 270, 18, 0xffffff, 0.7],
        [1214, 400, 30, 0xf58fb2, 0.8], [1176, 506, 20, 0xffffff, 0.7], [300, 52, 18, 0xf58fb2, 0.8],
        [520, 56, 14, 0xffffff, 0.7], [760, 50, 20, 0xf58fb2, 0.8], [980, 56, 14, 0xffffff, 0.7],
        [260, 530, 16, 0xffffff, 0.7], [520, 526, 20, 0xf58fb2, 0.8], [780, 532, 14, 0xffffff, 0.7], [1000, 528, 18, 0xf58fb2, 0.8],
      ]
      for (const [x, y, s, c, a] of h) hjarta(g, x, y, s, c, a)
    },
  },
  katt: {
    sky: 0xf6e0bd, mark: null,
    draw(g) {
      // Mattans kantränder.
      g.roundRect(MAT.x + 16, MAT.y + 16, MAT.w - 32, MAT.h - 32, 30).stroke({ width: 5, color: 0xe0a05a, alpha: 0.7 })
      g.roundRect(MAT.x + 30, MAT.y + 30, MAT.w - 60, MAT.h - 60, 20).stroke({ width: 3, color: 0xe0a05a, alpha: 0.4 })
      for (const [x, y, s] of [[64, 190, 26], [88, 330, 20], [1204, 150, 24], [1176, 300, 22], [300, 56, 18], [800, 54, 20], [480, 530, 20], [930, 528, 18]]) tass(g, x, y, s, 0xb7814a, 0.5)
      // Garnnystan i hörnet med en tråd ner mot kanten.
      g.circle(1206, 470, 28).fill(0xf08a4b)
      g.moveTo(1186, 458).quadraticCurveTo(1206, 446, 1230, 462).stroke({ width: 3, color: 0xffd0a8, alpha: 0.9 })
      g.moveTo(1182, 474).quadraticCurveTo(1208, 462, 1232, 480).stroke({ width: 3, color: 0xffd0a8, alpha: 0.9 })
      g.moveTo(1190, 496).quadraticCurveTo(1150, 520, 1100, 508).stroke({ width: 4, color: 0xf08a4b, cap: 'round' })
    },
  },
  blomma: {
    sky: 0xd4effc, mark: 0x7fd16c, hy: 330,
    draw(g) {
      moln(g, 410, 50, 22)
      moln(g, 840, 46, 24)
      g.circle(1124, 56, 22).fill(0xffd96a)
      blomma(g, 58, 420, 26, 0xff8fb4)
      blomma(g, 96, 488, 20, 0xfff06a, 0xff9f43)
      blomma(g, 1200, 396, 28, 0xc79bff)
      blomma(g, 1232, 480, 20, 0xff8fb4)
      blomma(g, 1160, 520, 16, 0xfff06a, 0xff9f43)
      for (let x = 70; x < 1240; x += 120) tuss(g, x, 540, 14, 0x5fb25a)
    },
  },
  stjarna: {
    sky: 0x2c2f66, mark: 0x1d1f4a, hy: 440,
    draw(g) {
      // Kullar mot horisonten.
      g.poly([20, 440, 70, 396, 140, 440]).fill(0x1d1f4a)
      g.poly([1120, 440, 1190, 392, 1260, 440]).fill(0x1d1f4a)
      for (const [x, y, r, a] of [
        [60, 150, 14, 1], [100, 300, 9, 0.8], [56, 360, 7, 0.8], [1214, 250, 15, 1], [1170, 330, 9, 0.8],
        [1232, 380, 7, 0.8], [280, 54, 10, 0.9], [440, 44, 7, 0.8], [640, 56, 12, 1], [840, 46, 8, 0.8], [1000, 58, 10, 0.9],
        [200, 524, 8, 0.7], [520, 530, 10, 0.8], [900, 526, 8, 0.7], [1080, 532, 11, 0.8],
      ]) stjarna(g, x, y, r, 0xffe27a, a)
      // Månskäran: en gul skiva med en natt-tonad skiva framför.
      g.circle(1120, 60, 26).fill(0xfff1a8)
      g.circle(1132, 52, 23).fill(0x2c2f66)
      for (const [x, y] of [[170, 120], [360, 90], [760, 100], [1090, 120], [150, 240]]) g.circle(x, y, 2.5).fill({ color: 0xffffff, alpha: 0.8 })
    },
  },
  // Kurv-rundor: ingen figur, en lugn mintmatta med prickar och kritkrumelurer.
  kurva: {
    sky: 0xd2efe3, mark: null,
    draw(g) {
      for (let rad = 0, y = 50; y < 546; rad++, y += 56) {
        for (let x = rad % 2 ? 60 : 88; x < 1260; x += 56) {
          const kant = x < 130 || x > 1150 || y < 100 || y > 500
          if (kant) g.circle(x, y, 7).fill({ color: 0xffffff, alpha: 0.6 })
        }
      }
      for (const [x, y, c] of [[70, 200, 0xf2a2b4], [1206, 300, 0x8fc6f0], [420, 52, 0xf6cd6a], [880, 534, 0xb59be6]]) {
        g.moveTo(x - 22, y).quadraticCurveTo(x - 11, y - 16, x, y).quadraticCurveTo(x + 11, y + 16, x + 22, y)
          .stroke({ width: 6, color: c, alpha: 0.6, cap: 'round' })
      }
    },
  },
}

/**
 * Bygger mattan för ett motiv (nyckeln ur MOTIFS; `null` = kurv-runda). Statisk kulisse:
 * ingen träffyta, inga tweens — spelet tonar in hela containern.
 */
export function byggMatta(key) {
  const v = VARLDAR[key] || VARLDAR.kurva
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  // Skugga mot bordet.
  const skugga = new Graphics()
  form(skugga, MAT.y + 10, true).fill({ color: COLORS.shadow, alpha: 0.16 })
  const g = new Graphics()
  form(g, MAT.y, true).fill(v.sky)
  if (v.mark != null) form(g, v.hy, false).fill(v.mark)
  v.draw(g)
  // Mattans kant: en mörkare konturlinje.
  const kant = new Graphics()
  form(kant, MAT.y, true).stroke({ width: 5, color: shade(v.sky, 0.3), alpha: 0.5 })
  c.addChild(skugga, g, kant)
  return c
}
