// Djurorkesterns scen: bakvägg med målad kuliss och lampgirlang, trägolv, rampljus, ridå-
// draperier, en valance med notlinje (konsertmätaren) och en ridå som kan dras för.
// Allt är statiska Graphics utom det index.js medvetet får tillbaka (lampor, koner,
// gardinerna). Fyllningarna är cachade (form.js) — noll texturbakningar per montering.
import { Container, Graphics } from 'pixi.js'
import { verticalFill, verticalFillAlpha, groundFill, topLightFill, bage } from '../../lib/form.js'
import { PLAYFUL } from '../../lib/theme.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

export const W = 1280
export const GOLV_TOPP = 430 // där väggen möter scenen
export const KANT_Y = 610 // scenens framkant
export const STAFF_Y0 = 30 // notlinjens översta linje
export const STAFF_DY = 12
export const STAFF_X0 = 280
export const STAFF_X1 = 1000
export const BOBO_X = 640 // dirigenten står mitt framför scenen, på orkestergravens matta
const GULD = 0xf2b632
const GULD_MORK = 0xc98a17

const ren = (g) => {
  g.eventMode = 'none'
  return g
}

// --- Bakgrund: vägg + kuliss + golv ------------------------------------------------------
export function byggBak() {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false

  // Väggen är mörk på riktigt: ljusa djur (ko, höna, får) ska stå UT mot den, och
  // rampljusen behöver något att lysa upp.
  const vagg = ren(new Graphics()).rect(-BLEED_X, -BLEED_Y, W + 2 * BLEED_X, GOLV_TOPP + BLEED_Y).fill(verticalFill(0x2f2358, 0x5c418c))
  c.addChild(vagg)

  // Målad kuliss: en stor blek måne och några stjärnor. Läser som en scen, inte som en plan yta.
  const kuliss = ren(new Graphics())
  kuliss.circle(640, 290, 175).fill({ color: 0xfff2c2, alpha: 0.09 })
  kuliss.circle(640, 290, 120).fill({ color: 0xfff2c2, alpha: 0.07 })
  const stjarnor = [[160, 190, 9], [250, 300, 6], [420, 210, 7], [860, 200, 8], [1010, 300, 6], [1120, 190, 9], [700, 150, 6], [540, 165, 5], [1180, 330, 6], [95, 340, 5]]
  for (const [x, y, r] of stjarnor) kuliss.star(x, y, 4, r, r * 0.42).fill({ color: 0xfff3b0, alpha: 0.55 })
  c.addChild(kuliss)

  // Tapetränder
  const rander = ren(new Graphics())
  for (let x = -BLEED_X - 40; x < W + BLEED_X; x += 96) rander.rect(x, -BLEED_Y, 34, GOLV_TOPP + BLEED_Y).fill({ color: 0xffffff, alpha: 0.035 })
  c.addChild(rander)
  // List där väggen möter golvet
  c.addChild(ren(new Graphics()).rect(-BLEED_X, GOLV_TOPP - 14, W + 2 * BLEED_X, 16).fill({ color: 0x1d1440, alpha: 0.55 }))

  // Golv: trä med plankfog som lutar mot en försvinningspunkt = djup.
  const golv = ren(new Graphics()).rect(-BLEED_X, GOLV_TOPP, W + 2 * BLEED_X, KANT_Y - GOLV_TOPP).fill(groundFill(0xc48a52))
  c.addChild(golv)
  const fog = ren(new Graphics())
  for (let k = -14; k <= 14; k++) fog.moveTo(640 + k * 64, GOLV_TOPP).lineTo(640 + k * 118, KANT_Y)
  fog.stroke({ width: 2, color: 0x6b3f1e, alpha: 0.2 })
  for (const y of [458, 494, 540, 585]) fog.moveTo(-BLEED_X, y).lineTo(W + BLEED_X, y)
  fog.stroke({ width: 2, color: 0x6b3f1e, alpha: 0.16 })
  c.addChild(fog)

  // Lampgirlang: två svängar av glödlampor som blinkar i takt. index.js sätter alfa per slag.
  const kabel = ren(new Graphics())
  const svang = [[110, 120, 375, 218, 640, 120], [640, 120, 905, 218, 1170, 120]]
  for (const [x0, y0, cx, cy, x1, y1] of svang) kabel.moveTo(x0, y0).quadraticCurveTo(cx, cy, x1, y1)
  kabel.stroke({ width: 3, color: 0x1d1440, alpha: 0.8 })
  c.addChild(kabel)
  const lampor = []
  let n = 0
  for (const [x0, y0, cx, cy, x1, y1] of svang) {
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6
      const u = 1 - t
      const x = u * u * x0 + 2 * u * t * cx + t * t * x1
      const y = u * u * y0 + 2 * u * t * cy + t * t * y1 + 10
      const col = PLAYFUL[n % PLAYFUL.length]
      const l = ren(new Graphics())
      // Geometrin ritas PÅ plats (position 0,0): ett bart Graphics ritat i origo och sedan
      // flyttat med .position kan rendera som en helskärmsstapel (se minnet pixi-graphics-position-bar).
      l.circle(x, y, 17).fill({ color: col, alpha: 0.22 })
      l.circle(x, y, 9).fill(col)
      l.circle(x - 2.5, y - 3, 3).fill({ color: 0xffffff, alpha: 0.7 })
      l._par = n % 2
      c.addChild(l)
      lampor.push(l)
      n++
    }
  }
  return { c, lampor }
}

// Rampljuskon: ETT delat gradientspår (verticalFillAlpha är cachad), en cone per djur.
// Ritad PÅ plats (x, y = toppen av konen) — ingen .position på lövet.
export function ritaKon(x, y, hojd) {
  const g = ren(new Graphics())
  g.poly([x - 20, y, x + 20, y, x + 118, y + hojd, x - 118, y + hojd]).fill(verticalFillAlpha(0xfff2b8, 0xfff2b8, 0.36, 0.03))
  return g
}

// --- Ram: valance med notlinje + sidodraperier -----------------------------------------------
function ritaDraperi() {
  const g = ren(new Graphics())
  g.moveTo(-BLEED_X, -BLEED_Y).lineTo(150, -BLEED_Y)
    .bezierCurveTo(150, 200, 74, 300, 74, 380)
    .bezierCurveTo(74, 480, 130, 560, 172, KANT_Y + 30)
    .lineTo(-BLEED_X, KANT_Y + 30).closePath()
    .fill(verticalFill(0xd8404f, 0x9b2a3b))
  // Veck
  for (let x = -BLEED_X; x < 64; x += 44) {
    g.rect(x, -BLEED_Y, 18, KANT_Y + BLEED_Y + 30).fill({ color: 0x000000, alpha: 0.13 })
    g.rect(x + 22, -BLEED_Y, 9, KANT_Y + BLEED_Y + 30).fill({ color: 0xffffff, alpha: 0.07 })
  }
  // Kant i skugga längs den fria kanten
  g.moveTo(150, -BLEED_Y).bezierCurveTo(150, 200, 74, 300, 74, 380).bezierCurveTo(74, 480, 130, 560, 172, KANT_Y + 30)
    .stroke({ width: 6, color: 0x7d1f2e, alpha: 0.65 })
  // Uppbindning med tofs
  g.roundRect(26, 370, 66, 18, 8).fill(topLightFill(GULD)).stroke({ width: 2, color: GULD_MORK })
  g.moveTo(58, 388).lineTo(58, 410).stroke({ width: 4, color: GULD_MORK })
  g.ellipse(58, 424, 9, 17).fill(topLightFill(GULD)).stroke({ width: 2, color: GULD_MORK })
  return g
}

export function byggRam() {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  const vansterD = ritaDraperi()
  const hogerD = new Container()
  hogerD.addChild(ritaDraperi())
  hogerD.x = W
  hogerD.scale.x = -1
  c.addChild(vansterD, hogerD)

  // Valance
  const v = ren(new Graphics())
  const botten = 96
  v.rect(-BLEED_X, -BLEED_Y, W + 2 * BLEED_X, botten + BLEED_Y).fill(verticalFill(0xdc4757, 0xa32c3c))
  // Halva skivor UNDER kanten, inte hela cirklar: en hel cirkel gick upp över notlinjen och
  // lade en mörk prickrad bakom de nedre linjerna.
  for (let x = -BLEED_X - 40; x < W + BLEED_X + 80; x += 80) bage(v, x + 40, botten, 40, 0, Math.PI).closePath().fill(0xa32c3c)
  for (let x = -BLEED_X - 40; x < W + BLEED_X + 80; x += 80) bage(v, x + 40, botten, 37, 0.05 * Math.PI, 0.95 * Math.PI).stroke({ width: 4, color: GULD })
  v.rect(-BLEED_X, 84, W + 2 * BLEED_X, 6).fill(GULD)
  c.addChild(v)

  // Notlinjen — konsertmätaren. Fem linjer + start- och slutstreck.
  const s = ren(new Graphics())
  for (let i = 0; i < 5; i++) s.moveTo(STAFF_X0, STAFF_Y0 + i * STAFF_DY).lineTo(STAFF_X1, STAFF_Y0 + i * STAFF_DY)
  s.stroke({ width: 3, color: 0xffe7a8, alpha: 0.85 })
  s.moveTo(STAFF_X0, STAFF_Y0).lineTo(STAFF_X0, STAFF_Y0 + 4 * STAFF_DY).stroke({ width: 4, color: 0xffe7a8, alpha: 0.9 })
  s.moveTo(STAFF_X1 - 9, STAFF_Y0).lineTo(STAFF_X1 - 9, STAFF_Y0 + 4 * STAFF_DY).stroke({ width: 3, color: 0xffe7a8, alpha: 0.9 })
  s.moveTo(STAFF_X1, STAFF_Y0).lineTo(STAFF_X1, STAFF_Y0 + 4 * STAFF_DY).stroke({ width: 7, color: 0xffe7a8, alpha: 0.95 })
  c.addChild(s)
  return c
}

// --- Front: scenkant, rampljus, orkestergrav -------------------------------------------------
export function byggFront() {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  c.addChild(ren(new Graphics()).rect(-BLEED_X, KANT_Y, W + 2 * BLEED_X, 34).fill(topLightFill(0x8a5a2a, { highlight: 0.22, dark: 0.3 })))
  c.addChild(ren(new Graphics()).rect(-BLEED_X, KANT_Y, W + 2 * BLEED_X, 5).fill({ color: 0xffe2b0, alpha: 0.7 }))
  // Orkestergraven: mörk, så dirigenten och hans matta läser tydligt.
  c.addChild(ren(new Graphics()).rect(-BLEED_X, KANT_Y + 34, W + 2 * BLEED_X, 720 - KANT_Y - 34 + BLEED_Y).fill(verticalFill(0x2a1d4a, 0x150e2e)))
  c.addChild(ren(new Graphics()).ellipse(640, 704, 86, 17).fill({ color: 0x7a3fa0, alpha: 0.9 }).ellipse(640, 704, 62, 11).fill({ color: 0x9a5cc4, alpha: 0.9 }))
  // Rampljus längs kanten
  const fotlampor = []
  for (let i = 0; i < 13; i++) {
    const l = ren(new Graphics())
    const lx = 50 + i * 90
    const ly = KANT_Y + 19
    l.circle(lx, ly, 17).fill({ color: 0xffd35c, alpha: 0.25 })
    l.circle(lx, ly, 8).fill(0xffe9a0)
    l._par = i % 2
    c.addChild(l)
    fotlampor.push(l)
  }
  return { c, fotlampor }
}

// --- Ridån som dras för mellan konserterna ---------------------------------------------------
// Två fasta paneler, inte draperiet: de glider in bakom sidodraperierna när ridån är öppen.
export const GORDIN_OPPEN = 70
export const GORDIN_STANGD = 644
const GORDIN_B = 640 + BLEED_X + 40

function ritaPanel() {
  const g = ren(new Graphics())
  g.rect(-GORDIN_B, 88, GORDIN_B, KANT_Y - 88).fill(verticalFill(0xe04c5b, 0xa32c3c))
  for (let x = -GORDIN_B; x < 0; x += 46) {
    g.rect(x, 88, 20, KANT_Y - 88).fill({ color: 0x000000, alpha: 0.13 })
    g.rect(x + 24, 88, 9, KANT_Y - 88).fill({ color: 0xffffff, alpha: 0.08 })
  }
  g.rect(-12, 88, 12, KANT_Y - 88).fill(topLightFill(GULD))
  for (let y = 100; y < KANT_Y - 10; y += 46) g.circle(-6, y, 3.2).fill(GULD_MORK)
  return g
}

export function byggGordiner() {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  const vanster = new Container()
  vanster.addChild(ritaPanel())
  vanster.x = GORDIN_OPPEN
  const hoger = new Container()
  hoger.addChild(ritaPanel())
  hoger.scale.x = -1
  hoger.x = W - GORDIN_OPPEN
  c.addChild(vanster, hoger)
  return { c, vanster, hoger }
}
