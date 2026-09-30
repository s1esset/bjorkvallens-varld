// Härma Melodin — de fyra sjungande varelserna. Fristående föremål (P0 ASSETS): varje
// varelse har egen silhuett, egna ögon som blinkar och en mun som öppnas när den sjunger.
// Ingen ruta, ingen bricka, ingen emoji — bara ritade former.
//
// Två uppsättningar (teman) med SAMMA fyra färger och platser, så barnet känner igen vilken
// som är vilken på färgen och läget medan formen byts:
//   kompisar  groda (grön) · äpple (röd) · vattendroppe (blå) · stjärna (gul)
//   frukt     päron (grön) · jordgubbe (röd) · blåbär (blå) · citron (gul)
//
// Kontrakt (se skapaVarelse): varje varelse ritas centrerad i (0,0) med fötterna vid y = FOT.
// Containern som returneras har pivot vid fötterna — skala/squash/vingel sker därför kring
// marken, inte kring magen. Fältet `_glow` är en vit silhuett-overlay (alfa 0 i vila) som
// spelet tonar vid tändning; `_mund(öppen)` och `_blink(stängd)` byter mun och ögonlock.
// Transienta tweens ägs av spelet (index.js) — den här filen skapar inga egna.
import { Container, Graphics } from 'pixi.js'
import { COLORS, shade, tint } from '../../lib/theme.js'
import { sphereFill, topLightFill } from '../../lib/form.js'

export const FOT = 88 // y för fötterna i varelsens eget rum

const MUN_MORK = 0x7a2b3a
const MUN_TUNGA = 0xff8fa3
const INK = 0x4a3526

// En kropp = två Graphics: först omriss (bred linje i mörk ton), sedan fyllningen ovanpå.
// Omrisset ritas FÖRST och fyllningen täcker dess inre halva, så överlappande former
// (två äppellober, en päronhals) inte får en synlig söm mitt i kroppen. Två separata
// Graphics med flit — olika fyllningar i SAMMA Graphics har tidigare tagit den första färgen.
function kropp(parent, shapes, fill, color, { rundW = 0 } = {}) {
  const ut = new Graphics()
  shapes(ut)
  ut.stroke({ width: 10 + rundW, color: shade(color, 0.42), alpha: 0.9, join: 'round' })
  ut.eventMode = 'none'
  const g = new Graphics()
  shapes(g)
  g.fill(fill)
  if (rundW) g.stroke({ width: rundW, color: shade(color, 0.06), join: 'round' })
  g.eventMode = 'none'
  parent.addChild(ut, g)
  return g
}

function del(parent, rita, x = 0, y = 0, rot = 0) {
  const g = new Graphics()
  rita(g)
  g.position.set(x, y)
  g.rotation = rot
  g.eventMode = 'none'
  parent.addChild(g)
  return g
}

// Ögon: vit skiva, pupill med ljusglimt. Egen container per öga så ett blink är ETT tal
// (scale.y) utan omritning.
function ogon(parent, x, y, r) {
  const c = new Container()
  c.position.set(x, y)
  c.eventMode = 'none'
  const vit = new Graphics().circle(0, 0, r).fill(0xffffff).stroke({ width: 3, color: INK, alpha: 0.45 })
  const pup = new Graphics().circle(0, r * 0.1, r * 0.52).fill(INK)
  const glim = new Graphics().circle(-r * 0.16, -r * 0.14, r * 0.17).fill(0xffffff)
  c.addChild(vit, pup, glim)
  parent.addChild(c)
  return c
}

function ritaMun(g, oppen, w) {
  g.clear()
  if (oppen) {
    const rx = w * 0.3
    const ry = w * 0.27
    g.ellipse(0, ry * 0.3, rx, ry).fill(MUN_MORK)
    g.ellipse(0, ry * 0.75, rx * 0.62, ry * 0.42).fill(MUN_TUNGA)
  } else {
    g.moveTo(-w * 0.3, 0).quadraticCurveTo(0, w * 0.28, w * 0.3, 0).stroke({ width: 5, color: INK, cap: 'round' })
  }
}

// --- De åtta varelserna ---------------------------------------------------------
// `sil(g)` lägger till formerna (utan färg) och används både till kroppen och till glödens
// vita overlay. `rita(c, färg)` bygger kroppen och returnerar ansiktets mått.

const GRODA = {
  sil: (g) => {
    g.ellipse(0, 26, 76, 62).circle(-40, -42, 26).circle(40, -42, 26).ellipse(-50, 74, 28, 15).ellipse(50, 74, 28, 15)
  },
  rita(c, col) {
    kropp(c, (g) => g.ellipse(-50, 74, 28, 15).ellipse(50, 74, 28, 15), shade(col, 0.14), col)
    kropp(c, (g) => g.ellipse(0, 26, 76, 62).circle(-40, -42, 26).circle(40, -42, 26), sphereFill(col), col)
    del(c, (g) => g.ellipse(0, 50, 46, 32).fill({ color: tint(col, 0.6), alpha: 0.9 }))
    del(c, (g) => g.circle(0, 0, 10).fill({ color: COLORS.pink, alpha: 0.5 }), -56, 26)
    del(c, (g) => g.circle(0, 0, 10).fill({ color: COLORS.pink, alpha: 0.5 }), 56, 26)
    return { ogon: [[-40, -44, 17], [40, -44, 17]], mund: { x: 0, y: 22, w: 88 } }
  },
}

const APPLE = {
  sil: (g) => {
    g.circle(-26, 14, 60).circle(26, 14, 60).ellipse(0, 30, 70, 56).ellipse(-30, 82, 22, 10).ellipse(30, 82, 22, 10)
  },
  rita(c, col) {
    kropp(c, (g) => g.ellipse(-30, 82, 22, 10).ellipse(30, 82, 22, 10), shade(col, 0.4), col)
    kropp(c, (g) => g.circle(-26, 14, 60).circle(26, 14, 60).ellipse(0, 30, 70, 56), sphereFill(col), col)
    del(c, (g) => g.ellipse(0, 0, 15, 6).fill({ color: shade(col, 0.5), alpha: 0.35 }), 0, -40)
    del(c, (g) => g.moveTo(0, 0).quadraticCurveTo(2, -18, 12, -34).stroke({ width: 9, color: COLORS.brown, cap: 'round' }), 0, -42)
    del(c, (g) => g.ellipse(0, 0, 21, 9).fill(COLORS.green).stroke({ width: 3, color: COLORS.greenDark }), 30, -74, -0.45)
    del(c, (g) => g.ellipse(0, 0, 10, 19).fill({ color: 0xffffff, alpha: 0.36 }), -58, -6, 0.3)
    return { ogon: [[-24, 8, 15], [24, 8, 15]], mund: { x: 0, y: 44, w: 54 } }
  },
}

// Vattendroppens kurva — samma väg för kropp och glöd.
const droppe = (g) => {
  g.moveTo(0, -94)
    .bezierCurveTo(14, -60, 74, -14, 74, 32)
    .bezierCurveTo(74, 66, 42, 88, 0, 88)
    .bezierCurveTo(-42, 88, -74, 66, -74, 32)
    .bezierCurveTo(-74, -14, -14, -60, 0, -94)
    .closePath()
}
const DROPPE = {
  sil: droppe,
  rita(c, col) {
    kropp(c, droppe, sphereFill(col, { lightX: 0.34, lightY: 0.42, spread: 0.6 }), col)
    del(c, (g) => g.ellipse(0, 0, 9, 24).fill({ color: 0xffffff, alpha: 0.5 }), -40, 8, 0.25)
    del(c, (g) => g.circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.6 }), -30, -22)
    del(c, (g) => g.circle(0, 0, 10).fill({ color: COLORS.pink, alpha: 0.4 }), -44, 54)
    del(c, (g) => g.circle(0, 0, 10).fill({ color: COLORS.pink, alpha: 0.4 }), 44, 54)
    return { ogon: [[-23, 28, 15], [23, 28, 15]], mund: { x: 0, y: 56, w: 48 } }
  },
}

// Stjärnan har rundade spetsar (runt linjeled i samma färg) och två små fötter.
const STJARNA_R = 74
const stjarna = (g) => g.star(0, 10, 5, STJARNA_R, 38, -Math.PI / 2)
const STJARNA = {
  sil: stjarna,
  rundW: 14,
  rita(c, col) {
    kropp(c, (g) => g.ellipse(-44, 78, 17, 9).ellipse(44, 78, 17, 9), COLORS.orange, COLORS.orange)
    kropp(c, stjarna, topLightFill(col, { highlight: 0.2, dark: 0.16 }), col, { rundW: 14 })
    del(c, (g) => g.star(0, 0, 5, 38, 21, -Math.PI / 2).fill({ color: tint(col, 0.6), alpha: 0.5 }), 0, 14)
    return { ogon: [[-17, 6, 13], [17, 6, 13]], mund: { x: 0, y: 32, w: 40 } }
  },
}

const paron = (g) => g.ellipse(0, 36, 62, 52).ellipse(0, -20, 38, 46)
const PARON = {
  sil: paron,
  rita(c, col) {
    kropp(c, paron, sphereFill(col, { lightX: 0.36, lightY: 0.32 }), col)
    del(c, (g) => g.moveTo(0, 0).quadraticCurveTo(2, -14, 12, -24).stroke({ width: 8, color: COLORS.brown, cap: 'round' }), 0, -64)
    del(c, (g) => g.ellipse(0, 0, 20, 8).fill(tint(COLORS.green, 0.15)).stroke({ width: 3, color: COLORS.greenDark }), 30, -82, -0.4)
    del(c, (g) => g.ellipse(0, 0, 8, 20).fill({ color: 0xffffff, alpha: 0.34 }), -30, -6, 0.2)
    del(c, (g) => g.circle(0, 0, 2.6).fill({ color: shade(col, 0.45), alpha: 0.5 }), 26, 70)
    del(c, (g) => g.circle(0, 0, 2.6).fill({ color: shade(col, 0.45), alpha: 0.5 }), -18, 76)
    return { ogon: [[-20, 26, 13], [20, 26, 13]], mund: { x: 0, y: 56, w: 44 } }
  },
}

const gubbe = (g) => {
  g.moveTo(0, 86)
    .bezierCurveTo(-30, 80, -80, 30, -78, -18)
    .bezierCurveTo(-76, -56, -40, -66, 0, -50)
    .bezierCurveTo(40, -66, 76, -56, 78, -18)
    .bezierCurveTo(80, 30, 30, 80, 0, 86)
    .closePath()
}
const JORDGUBBE = {
  sil: gubbe,
  rita(c, col) {
    kropp(c, gubbe, sphereFill(col, { lightX: 0.36, lightY: 0.3 }), col)
    for (const [x, y] of [[-54, -8], [-58, 30], [54, -10], [58, 28], [-32, 58], [32, 58], [0, 70], [-66, 10], [66, 8]]) {
      del(c, (g) => g.ellipse(0, 0, 4, 6.5).fill(0xffe9a0), x, y, x * 0.012)
    }
    for (const k of [-1, -0.5, 0, 0.5, 1]) {
      del(c, (g) => g.ellipse(0, -16, 10, 22).fill(COLORS.green).stroke({ width: 3, color: COLORS.greenDark }), 0, -52, k * 0.95)
    }
    del(c, (g) => g.ellipse(0, 0, 8, 16).fill({ color: 0xffffff, alpha: 0.32 }), -48, -30, 0.5)
    return { ogon: [[-24, 2, 14], [24, 2, 14]], mund: { x: 0, y: 32, w: 46 } }
  },
}

const blabar = (g) => g.circle(0, 16, 72)
const BLABAR = {
  sil: (g) => g.circle(0, 16, 72).star(0, -38, 5, 20, 9, -Math.PI / 2),
  rita(c, col) {
    kropp(c, blabar, sphereFill(col, { lightX: 0.34, lightY: 0.3 }), col)
    del(c, (g) => g.ellipse(0, 0, 54, 34).fill({ color: 0xffffff, alpha: 0.12 }), 0, -8)
    del(c, (g) => g.star(0, 0, 5, 20, 9, -Math.PI / 2).fill(shade(col, 0.5)).stroke({ width: 3, color: shade(col, 0.6), join: 'round' }), 0, -38)
    del(c, (g) => g.ellipse(0, 0, 12, 18).fill({ color: 0xffffff, alpha: 0.34 }), -36, -2, 0.4)
    return { ogon: [[-23, 14, 14], [23, 14, 14]], mund: { x: 0, y: 46, w: 46 } }
  },
}

const citron = (g) => g.ellipse(0, 24, 76, 64).ellipse(-80, 26, 13, 10).ellipse(80, 26, 13, 10)
const CITRON = {
  sil: citron,
  rita(c, col) {
    kropp(c, citron, sphereFill(col, { lightX: 0.36, lightY: 0.3 }), col)
    del(c, (g) => g.ellipse(0, 0, 22, 9).fill(COLORS.green).stroke({ width: 3, color: COLORS.greenDark }), 22, -40, -0.5)
    del(c, (g) => g.ellipse(0, 0, 14, 8).fill({ color: 0xffffff, alpha: 0.4 }), -46, -4, 0.5)
    for (const [x, y] of [[-50, 60], [48, 66], [60, 14], [-62, 18]]) {
      del(c, (g) => g.circle(0, 0, 2.6).fill({ color: shade(col, 0.4), alpha: 0.45 }), x, y)
    }
    return { ogon: [[-23, 14, 14], [23, 14, 14]], mund: { x: 0, y: 46, w: 48 } }
  },
}

export const TEMAN = [
  { id: 'kompisar', varelser: [GRODA, APPLE, DROPPE, STJARNA] },
  { id: 'frukt', varelser: [PARON, JORDGUBBE, BLABAR, CITRON] },
]

// Bygg en varelse. `col` = platsens färg (samma i alla teman).
export function skapaVarelse(tema, index, col) {
  const def = TEMAN[tema % TEMAN.length].varelser[index]
  const c = new Container()
  c.pivot.set(0, FOT)
  c.position.set(0, FOT)
  c.eventMode = 'none'
  c.interactiveChildren = false

  const ansikte = def.rita(c, col)

  // Glöd: vit silhuett ovanpå kroppen men UNDER ansiktet, så ögon och mun aldrig bleks ut.
  const glow = new Graphics()
  def.sil(glow)
  glow.fill(0xffffff)
  if (def.rundW) {
    def.sil(glow)
    glow.stroke({ width: def.rundW, color: 0xffffff, join: 'round' })
  }
  glow.alpha = 0
  glow.eventMode = 'none'
  c.addChild(glow)

  const ogonLista = ansikte.ogon.map(([x, y, r]) => ogon(c, x, y, r))
  const mund = new Graphics()
  mund.position.set(ansikte.mund.x, ansikte.mund.y)
  mund.eventMode = 'none'
  c.addChild(mund)
  ritaMun(mund, false, ansikte.mund.w)

  c._glow = glow
  c._mund = (oppen) => {
    if (!mund.destroyed) ritaMun(mund, oppen, ansikte.mund.w)
  }
  c._blink = (stangd) => {
    for (const o of ogonLista) if (!o.destroyed) o.scale.y = stangd ? 0.1 : 1
  }
  return c
}
