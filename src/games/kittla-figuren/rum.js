// Kittla Figuren — platsen: ett barnrum med säng, matta, fönster och en leksakslåda.
//
// Förut stod figuren på `createScene('candy')`, en rosa gradientplatta med bokeh och en
// markremsa — ingen PLATS, bara en bakgrund. Nu är det ett rum (L2): tapet med väggpanel,
// golv med plankor, en matta som figuren står på, en säng i ena hörnet, ett fönster med
// gardiner i det andra och en leksakslåda. Allt är dekor (`eventMode 'none'`) och ligger
// BAKOM figuren och dess träffytor — kittelzonerna rörs inte av något här.
//
// Rummet byggs om varje runda med en ny palett (`nastaVariant` i spelet). Allt som rör sig
// (stjärnor, gardiner, nallen, bollen, vimplarna) går på tweens som `riv()` dödar INNAN
// noderna förstörs — spelet river rummet vid varje rundbyte, så en kvarglömd tween skulle
// skriva på en död nod varje bildruta.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { verticalFill, topLightFill, sphereFill, cylinderFill } from '../../lib/form.js'
import { shade, COLORS } from '../../lib/theme.js'
import { liv } from '../../lib/feedback.js'

const W = 1280
const GOLV_Y = 566 // där skurlisten slutar och plankorna börjar

// En palett per rum. `fonster` = himmel i rutan: dag, skymning eller natt.
export const PALETTER = [
  { id: 'rosa', vaggTop: 0xffe3ef, vaggBot: 0xffcce0, rand: 0xffa3c8, matta: 0x9d8cff, matta2: 0xffe27a, tacke: 0x6fc3f5, gardin: 0xff7fae, kista: 0xffb347, fonster: 'skymning' },
  { id: 'mint', vaggTop: 0xdff7e8, vaggBot: 0xc2ecd0, rand: 0x8fd9b0, matta: 0xff8fa3, matta2: 0xfff0b0, tacke: 0xffb86b, gardin: 0x6fb6e8, kista: 0x7fd0ff, fonster: 'dag' },
  { id: 'sol', vaggTop: 0xfff3c9, vaggBot: 0xffe5a8, rand: 0xffc46b, matta: 0x5fd0c5, matta2: 0xffffff, tacke: 0xc39bff, gardin: 0xff9a6b, kista: 0xff7a9c, fonster: 'natt' },
]

const TRA = 0xc98a5b
const VIT = 0xfff6ec

// Himlen i fönstret per tid på dygnet.
const HIMMEL = {
  dag: { top: 0xaee3fb, bot: 0xe6f7ff },
  skymning: { top: 0xffb98a, bot: 0xffe6c4 },
  natt: { top: 0x27346f, bot: 0x5a4a9a },
}

// Himlens färg på en viss höjd (t 0..1) — skäran klipps med exakt den, så ingen skiva syns.
function blanda(a, b, t) {
  const k = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t)
  return (k(16) << 16) | (k(8) << 8) | k(0)
}

function g0() {
  const g = new Graphics()
  g.eventMode = 'none'
  return g
}

export function byggRum(pal) {
  const tw = []
  const view = new Container()
  view.eventMode = 'none'
  view.interactiveChildren = false
  const X0 = -BLEED_X
  const BW = W + 2 * BLEED_X

  // ---- vägg: tapet med ränder, en panel i nedre delen och en list ----
  const vagg = g0()
  vagg.rect(X0, -BLEED_Y, BW, GOLV_Y + BLEED_Y).fill(verticalFill(pal.vaggTop, pal.vaggBot))
  for (let x = -Math.ceil(BLEED_X / 96) * 96; x < W + BLEED_X; x += 96) {
    vagg.rect(x, -BLEED_Y, 44, 396 + BLEED_Y).fill({ color: pal.rand, alpha: 0.2 })
  }
  // Panelen: lite mörkare än tapeten, med infällda fält så den läser som snickeri.
  vagg.rect(X0, 396, BW, GOLV_Y - 396).fill(verticalFill(shade(pal.vaggBot, 0.07), shade(pal.vaggBot, 0.17)))
  for (let x = -Math.ceil(BLEED_X / 160) * 160; x < W + BLEED_X; x += 160) {
    vagg.roundRect(x + 16, 424, 128, 100, 10).stroke({ width: 3, color: shade(pal.vaggBot, 0.3), alpha: 0.35 })
  }
  view.addChild(vagg)
  const list = g0()
  list.rect(X0, 386, BW, 16).fill(topLightFill(VIT, { highlight: 0.1, dark: 0.1 }))
  list.rect(X0, 540, BW, 28).fill(topLightFill(VIT, { highlight: 0.1, dark: 0.14 }))
  view.addChild(list)

  // ---- golv: plankor + ljuspöl från fönstret ----
  const golv = g0()
  golv.rect(X0, GOLV_Y, BW, 720 - GOLV_Y + BLEED_Y).fill(verticalFill(0xf0d4a8, 0xcfa271))
  const rader = [GOLV_Y, 594, 628, 670, 720 + BLEED_Y]
  for (let r = 0; r < rader.length - 1; r++) {
    golv.moveTo(X0, rader[r]).lineTo(X0 + BW, rader[r]).stroke({ width: 2, color: 0x9a6b3c, alpha: 0.16 })
    for (let x = X0 + ((r * 53) % 150); x < X0 + BW; x += 150) {
      golv.moveTo(x, rader[r]).lineTo(x, rader[r + 1]).stroke({ width: 2, color: 0x9a6b3c, alpha: 0.12 })
    }
  }
  golv.poly([1010, 572, 1190, 572, 1090, 712, 880, 712]).fill({ color: 0xffffff, alpha: 0.15 })
  view.addChild(golv)

  // ---- matta: figuren står på den ----
  const matta = g0()
  matta.ellipse(640, 602, 368, 56).fill({ color: COLORS.shadow, alpha: 0.1 })
  matta.ellipse(640, 596, 360, 54).fill(topLightFill(pal.matta, { highlight: 0.2, dark: 0.18 })).stroke({ width: 4, color: shade(pal.matta, 0.25), alpha: 0.7 })
  matta.ellipse(640, 596, 334, 43).stroke({ width: 5, color: 0xffffff, alpha: 0.55 })
  matta.ellipse(640, 596, 236, 29).fill({ color: pal.matta2, alpha: 0.38 })
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    matta.circle(640 + Math.cos(a) * 296, 596 + Math.sin(a) * 36, 6).fill({ color: pal.matta2, alpha: 0.8 })
  }
  view.addChild(matta)

  // ---- girland (vimplar) ----
  const girl = new Container()
  girl.eventMode = 'none'
  const rep = g0()
  const pp = (t) => ({ x: 250 + t * 820, y: 30 + 56 * 4 * t * (1 - t) })
  rep.moveTo(pp(0).x, pp(0).y)
  for (let i = 1; i <= 24; i++) rep.lineTo(pp(i / 24).x, pp(i / 24).y)
  rep.stroke({ width: 3, color: 0xa9856a, alpha: 0.9 })
  const FANOR = [0xff7fae, 0xffd35c, 0x6ec1ff, 0x8ee0a0]
  const fan = g0()
  for (let i = 1; i < 20; i++) {
    const p = pp(i / 20)
    fan.poly([p.x - 17, p.y, p.x + 17, p.y + 3, p.x + 1, p.y + 46]).fill(FANOR[i % FANOR.length])
  }
  girl.addChild(rep, fan)
  girl.pivot.set(660, 30)
  girl.position.set(660, 30)
  view.addChild(girl)
  tw.push(gsap.to(girl, { rotation: 0.012, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }))

  // ---- fönster med gardiner (höger) ----
  const fon = new Container()
  fon.eventMode = 'none'
  const him = HIMMEL[pal.fonster] || HIMMEL.dag
  const ram = g0()
  ram.roundRect(996, 126, 208, 236, 14).fill(topLightFill(VIT, { highlight: 0.05, dark: 0.12 }))
  ram.roundRect(1012, 142, 176, 204, 6).fill(verticalFill(him.top, him.bot))
  fon.addChild(ram)
  const ute = g0()
  if (pal.fonster === 'natt') {
    // Månen är en skära: en ljus skiva med en mörk skiva framför.
    ute.circle(1140, 190, 22).fill(0xfff3c4)
    ute.circle(1150, 184, 19).fill(blanda(him.top, him.bot, 0.2))
  } else if (pal.fonster === 'skymning') {
    ute.circle(1100, 300, 30).fill({ color: 0xfff0b0, alpha: 0.95 })
    ute.ellipse(1060, 214, 34, 12).fill({ color: 0xffffff, alpha: 0.7 }).ellipse(1082, 208, 22, 12).fill({ color: 0xffffff, alpha: 0.7 })
  } else {
    ute.circle(1150, 186, 24).fill(0xffe27a)
    ute.ellipse(1070, 232, 38, 13).fill({ color: 0xffffff, alpha: 0.9 }).ellipse(1094, 224, 24, 13).fill({ color: 0xffffff, alpha: 0.9 })
  }
  // Kullar utanför fönstret ger det ett utanför.
  ute.ellipse(1060, 346, 90, 28).fill({ color: shade(him.bot, 0.22), alpha: 0.5 })
  ute.ellipse(1150, 350, 80, 24).fill({ color: shade(him.bot, 0.3), alpha: 0.5 })
  fon.addChild(ute)
  if (pal.fonster === 'natt') {
    for (const [sx, sy] of [[1040, 176], [1090, 208], [1056, 258], [1164, 250], [1122, 150]]) {
      const s = g0()
      s.circle(sx, sy, 3.2).fill(0xffffff) // geometrin bakad kring sin plats, ingen .position
      s.alpha = 0.9
      fon.addChild(s)
      tw.push(gsap.to(s, { alpha: 0.25, duration: 0.8 + Math.random() * 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: Math.random() }))
    }
  }
  const spros = g0()
  spros.rect(1097, 142, 6, 204).fill(VIT).rect(1012, 240, 176, 6).fill(VIT)
  fon.addChild(spros)
  const bank = g0()
  bank.roundRect(984, 354, 232, 18, 8).fill(topLightFill(VIT, { highlight: 0.05, dark: 0.18 }))
  fon.addChild(bank)
  // Gardiner: hänger från en stång och gungar sakta runt sin fästpunkt.
  const stang = g0()
  stang.roundRect(970, 114, 260, 10, 5).fill(topLightFill(TRA)).circle(970, 119, 10).fill(sphereFill(0xe8c05a)).circle(1230, 119, 10).fill(sphereFill(0xe8c05a))
  fon.addChild(stang)
  for (const [gx, riktning] of [[1000, 1], [1200, -1]]) {
    const c = new Container()
    c.eventMode = 'none'
    c.position.set(gx, 122)
    const k = g0()
    k.roundRect(-24, 0, 48, 250, 14).fill(cylinderFill(pal.gardin, { dark: 0.22, highlight: 0.2 }))
    k.roundRect(-24, 112, 48, 12, 4).fill({ color: 0xffffff, alpha: 0.5 }) // knytband
    c.addChild(k)
    c.rotation = riktning * 0.012
    fon.addChild(c)
    tw.push(gsap.to(c, { rotation: -riktning * 0.012, duration: 3.2 + riktning * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
  }
  view.addChild(fon)

  // ---- säng (vänster) ----
  const bed = new Container()
  bed.eventMode = 'none'
  const sk = g0()
  sk.ellipse(190, 618, 182, 16).fill({ color: COLORS.shadow, alpha: 0.14 })
  bed.addChild(sk)
  const ben = g0()
  ben.roundRect(40, 588, 16, 30, 4).fill(shade(TRA, 0.25)).roundRect(292, 588, 16, 30, 4).fill(shade(TRA, 0.25))
  bed.addChild(ben)
  const bas = g0()
  bas.roundRect(26, 410, 42, 192, 16).fill(topLightFill(TRA, { highlight: 0.22, dark: 0.22 }))
  bas.circle(47, 408, 13).fill(sphereFill(TRA, { highlight: 0.3, dark: 0.2 }))
  bas.roundRect(30, 552, 292, 40, 10).fill(topLightFill(TRA, { highlight: 0.18, dark: 0.22 }))
  bed.addChild(bas)
  const madr = g0()
  madr.roundRect(62, 514, 238, 50, 18).fill(topLightFill(0xfffaf0, { highlight: 0.0, dark: 0.1 })).stroke({ width: 3, color: 0xe4d6c0, alpha: 0.8 })
  bed.addChild(madr)
  const kudde = g0()
  kudde.roundRect(72, 482, 94, 50, 24).fill(topLightFill(0xffffff, { highlight: 0.0, dark: 0.1 })).stroke({ width: 3, color: 0xe3d9e6, alpha: 0.9 })
  bed.addChild(kudde)
  const tacke = g0()
  tacke.roundRect(152, 494, 152, 68, 20).fill(topLightFill(pal.tacke, { highlight: 0.22, dark: 0.2 })).stroke({ width: 3, color: shade(pal.tacke, 0.3), alpha: 0.8 })
  tacke.roundRect(152, 494, 152, 18, 9).fill({ color: 0xffffff, alpha: 0.4 })
  for (const x of [176, 204, 232, 260, 284]) for (const y of [530, 548]) tacke.circle(x + (y === 548 ? 10 : 0), y, 4.5).fill({ color: 0xffffff, alpha: 0.4 })
  bed.addChild(tacke)
  const foot = g0()
  foot.roundRect(294, 500, 34, 102, 12).fill(topLightFill(TRA, { highlight: 0.22, dark: 0.22 }))
  bed.addChild(foot)
  // Nallen sitter på kudden och guppar långsamt — ett eget litet liv i hörnet.
  const nalle = new Container()
  nalle.eventMode = 'none'
  nalle.position.set(120, 470)
  const nk = g0()
  nk.ellipse(0, 12, 16, 15).fill(sphereFill(0xb97b4c)).circle(-14, -20, 8).fill(sphereFill(0xb97b4c)).circle(14, -20, 8).fill(sphereFill(0xb97b4c))
  nk.circle(0, -6, 21).fill(sphereFill(0xc98a5b)).stroke({ width: 2.5, color: 0x8a5a3b })
  nk.ellipse(0, 1, 10, 8).fill(0xf0d2aa).circle(0, -2, 3.4).fill(0x4a3526)
  nk.circle(-8, -10, 2.6).fill(0x33271f).circle(8, -10, 2.6).fill(0x33271f)
  nalle.addChild(nk)
  bed.addChild(nalle)
  const nl = liv(nalle, { bob: 2.5, sway: 0.05, duration: 3.1 })
  if (nl) tw.push(nl)
  view.addChild(bed)

  // ---- leksakslåda + klossar + boll (höger) ----
  const lek = new Container()
  lek.eventMode = 'none'
  const sk2 = g0()
  sk2.ellipse(1170, 628, 100, 12).fill({ color: COLORS.shadow, alpha: 0.13 })
  sk2.ellipse(1030, 624, 44, 8).fill({ color: COLORS.shadow, alpha: 0.12 })
  lek.addChild(sk2)
  const boll = new Container()
  boll.eventMode = 'none'
  boll.position.set(1146, 548)
  const bg = g0()
  bg.circle(0, 0, 26).fill(sphereFill(0xff6b6b)).stroke({ width: 3, color: 0xc94a4a })
  bg.rect(-26, -5, 52, 10).fill({ color: 0xffffff, alpha: 0.55 })
  boll.addChild(bg)
  lek.addChild(boll)
  const bl = liv(boll, { bob: 3, sway: 0.08, duration: 2.7 })
  if (bl) tw.push(bl)
  const kista = g0()
  kista.roundRect(1098, 566, 144, 62, 10).fill(topLightFill(pal.kista, { highlight: 0.2, dark: 0.2 })).stroke({ width: 3, color: shade(pal.kista, 0.3) })
  kista.roundRect(1090, 556, 160, 20, 8).fill(topLightFill(shade(pal.kista, 0.08), { highlight: 0.3, dark: 0.15 })).stroke({ width: 3, color: shade(pal.kista, 0.3) })
  kista.star(1170, 604, 5, 17, 8).fill(0xffe27a).stroke({ width: 2.5, color: 0xe0b030 })
  lek.addChild(kista)
  const kl = new Container()
  kl.eventMode = 'none'
  kl.position.set(1030, 624)
  const k1 = g0()
  k1.roundRect(-24, -46, 48, 46, 7).fill(topLightFill(0x6ec1ff, { highlight: 0.25, dark: 0.2 })).stroke({ width: 2.5, color: 0x3a8fc9 })
  k1.circle(0, -23, 9).fill({ color: 0xffffff, alpha: 0.55 })
  const k2 = new Container()
  k2.eventMode = 'none'
  const k2g = g0()
  k2g.roundRect(-20, -42, 40, 42, 7).fill(topLightFill(0xff7ab0, { highlight: 0.25, dark: 0.2 })).stroke({ width: 2.5, color: 0xc84b82 })
  k2.addChild(k2g)
  k2.position.set(3, -46)
  k2.rotation = 0.2
  kl.addChild(k1, k2)
  lek.addChild(kl)
  view.addChild(lek)

  return {
    view,
    riv() {
      for (const t of tw) t?.kill()
      tw.length = 0
      if (!view.destroyed) view.destroy({ children: true })
    },
  }
}
