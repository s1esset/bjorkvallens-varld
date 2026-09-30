// Djurorkesterns konst — allt som ritas, i ett eget lager så index.js får handla om spelet.
// Inget här bär en emoji som föremål: instrumenten, kropparna, noterna och podierna är
// ritade former med egen silhuett (P0 ASSETS). Allt returnerar Graphics/Container som
// index.js äger och river.
import { Container, Graphics } from 'pixi.js'
import { lerpColor } from '../../lib/scene.js'
import { sphereFill, cylinderFill, topLightFill } from '../../lib/form.js'
import { tint, shade } from '../../lib/theme.js'

const BRASS = 0xf2b632
const BRASS_DK = 0xc98a17
const TRE = 0x8a5a2a

// --- Instrument -------------------------------------------------------------------------
// Varje instrument ritas centrerat i (0,0) inom ungefär ±34 px och läser på en silhuett:
// trumpetens klocka, trummans stockar, klaviaturens svarta tangenter …

function trumpet(g) {
  g.roundRect(-34, -4, 8, 8, 3).fill(BRASS_DK) // munstycke
  g.roundRect(-16, 4, 34, 16, 8).stroke({ width: 5, color: BRASS_DK }) // slingan
  g.roundRect(-28, -6, 44, 12, 6).fill(topLightFill(BRASS))
  g.poly([12, -6, 33, -21, 33, 21, 12, 6]).fill(topLightFill(BRASS))
  g.ellipse(33, 0, 5, 21).fill(BRASS_DK)
  for (const x of [-14, -4, 6]) {
    g.roundRect(x - 2, -16, 4, 10, 2).fill(0x8a5a10)
    g.circle(x, -17, 3.5).fill(0xf1f1f6)
  }
}

function drum(g) {
  g.roundRect(-28, -6, 56, 32, 6).fill(cylinderFill(0xe0523f, { dark: 0.3 }))
  for (const x of [-20, -10, 0, 10, 20]) g.moveTo(x, -4).lineTo(x + 5, 24).stroke({ width: 2, color: 0xfff3d6, alpha: 0.85 })
  g.ellipse(0, 26, 28, 7).fill(BRASS_DK)
  g.ellipse(0, -6, 28, 10).fill(0xfff3d6).stroke({ width: 3, color: BRASS })
  // Stockarna
  g.moveTo(-8, -10).lineTo(-30, -34).stroke({ width: 4, color: TRE, cap: 'round' })
  g.moveTo(8, -10).lineTo(30, -34).stroke({ width: 4, color: TRE, cap: 'round' })
  g.circle(-30, -34, 4.5).fill(0xf6efe2)
  g.circle(30, -34, 4.5).fill(0xf6efe2)
}

function keys(g) {
  g.roundRect(-36, -15, 72, 30, 7).fill(topLightFill(0x3b4256))
  for (let i = 0; i < 7; i++) g.roundRect(-33 + i * 9.6, -11, 8.6, 22, 2).fill(0xfdfdfb)
  for (const i of [0, 1, 3, 4, 5]) g.roundRect(-33 + (i + 1) * 9.6 - 3.2, -11, 6, 13, 2).fill(0x232838)
}

function maracas(g) {
  for (const [s, c] of [[-1, 0xe0523f], [1, 0x3f8fdb]]) {
    g.moveTo(s * 13, -4).lineTo(s * 5, 28).stroke({ width: 6, color: TRE, cap: 'round' })
    g.circle(s * 14, -8, 14).fill(sphereFill(c)).stroke({ width: 2.5, color: shade(c, 0.3) })
    for (const [dx, dy] of [[-4, -6], [5, -2], [-2, 4]]) g.circle(s * 14 + dx, -8 + dy, 2.4).fill(0xffffff)
  }
}

function sax(g) {
  g.moveTo(-8, -30).quadraticCurveTo(-8, -40, -22, -36).stroke({ width: 6, color: BRASS_DK, cap: 'round' })
  g.moveTo(-8, -30).lineTo(-8, 8).quadraticCurveTo(-8, 30, 9, 30).quadraticCurveTo(26, 30, 26, 8)
    .stroke({ width: 13, color: BRASS, cap: 'round' })
  g.moveTo(-8, -28).lineTo(-8, 6).stroke({ width: 4, color: tint(BRASS, 0.5), cap: 'round', alpha: 0.7 })
  g.ellipse(26, 4, 14, 6).fill(BRASS_DK)
  g.ellipse(26, 4, 9, 3.5).fill(0x5a3a08)
  for (const y of [-18, -6, 6]) g.circle(-8, y, 3.4).fill(0xf6efe2)
}

function fiddle(g) {
  g.moveTo(-32, 28).lineTo(34, -26).stroke({ width: 3.5, color: 0xd9c28f, cap: 'round' }) // stråken
  g.moveTo(-31, 31).lineTo(35, -23).stroke({ width: 1.5, color: 0xfff3d6, cap: 'round' })
  g.roundRect(-3, -46, 6, 42, 2).fill(0x4a2c14)
  g.circle(0, -48, 5.5).fill(0x4a2c14)
  g.circle(0, 12, 19).fill(sphereFill(0xc06a2c))
  g.circle(0, -8, 14).fill(sphereFill(0xc06a2c))
  for (const s of [-1, 1]) g.moveTo(s * 8, 6).quadraticCurveTo(s * 11, 12, s * 8, 18).stroke({ width: 2.2, color: 0x3a1f0c, cap: 'round' })
  g.moveTo(-1, -40).lineTo(-1, 24).stroke({ width: 1.2, color: 0xf3ead6 })
  g.moveTo(1.5, -40).lineTo(1.5, 24).stroke({ width: 1.2, color: 0xf3ead6 })
}

function tambourine(g) {
  g.circle(0, 0, 29).fill(sphereFill(0xd7995a)).stroke({ width: 2.5, color: shade(0xd7995a, 0.35) })
  g.circle(0, 0, 21).fill(0xfff1d2)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3
    g.circle(Math.cos(a) * 29, Math.sin(a) * 29, 5.5).fill(BRASS).stroke({ width: 1.8, color: BRASS_DK })
  }
  g.circle(-6, -6, 4).fill({ color: 0xffffff, alpha: 0.6 })
}

function xylophone(g) {
  const cols = [0xe0523f, 0xf5993a, 0xffd35c, 0x5bbf6a, 0x4aa3df]
  g.moveTo(-30, -20).lineTo(-30, 26).stroke({ width: 4, color: TRE, cap: 'round' })
  g.moveTo(30, -20).lineTo(30, 26).stroke({ width: 4, color: TRE, cap: 'round' })
  cols.forEach((c, i) => {
    const h = 44 - i * 5
    g.roundRect(-27 + i * 11.5, -h / 2 + 2, 10, h, 3).fill(topLightFill(c))
  })
  g.moveTo(-6, -34).lineTo(-26, -8).stroke({ width: 3.5, color: TRE, cap: 'round' })
  g.moveTo(8, -34).lineTo(28, -8).stroke({ width: 3.5, color: TRE, cap: 'round' })
  g.circle(-6, -34, 4.5).fill(0xe0523f)
  g.circle(8, -34, 4.5).fill(0xe0523f)
}

function triangel(g) {
  g.moveTo(0, -30).lineTo(-28, 20).lineTo(28, 20).lineTo(4, -22).stroke({ width: 5, color: 0xcfd6e0, cap: 'round', join: 'round' })
  g.moveTo(-1, -34).lineTo(-1, -42).stroke({ width: 2, color: 0x8d99a6 })
  g.moveTo(14, 34).lineTo(36, -2).stroke({ width: 3.5, color: 0xa9b2bf, cap: 'round' })
}

const INSTR = { trumpet, drum, keys, maracas, sax, fiddle, tambourine, xylophone, triangel }

export function ritaInstrument(kind, storlek = 64) {
  const g = new Graphics()
  ;(INSTR[kind] || tambourine)(g)
  g.scale.set(storlek / 68)
  g.eventMode = 'none'
  return g
}

// --- Djurets kropp ------------------------------------------------------------------------
// Huvudet kommer ur drawIcon (artikoner.js); kroppen är vår: en äggform med mage, fötter och
// ett djurspecifikt mönster så att grodan, kon och biet inte bara är ett huvud på en tunna.
// Origo = fötterna (y=0), kroppen sträcker sig uppåt.
export function ritaKropp(djur) {
  const c = djur.pals
  const dk = shade(c, 0.22)
  const g = new Graphics()
  g.ellipse(-24, -3, 17, 9).fill(dk) // fötter
  g.ellipse(24, -3, 17, 9).fill(dk)
  g.ellipse(0, -44, 53, 46).fill(sphereFill(c, { dark: 0.2 }))
  g.ellipse(0, -36, 33, 30).fill({ color: tint(c, 0.55), alpha: 0.9 }) // mage
  if (djur.marke === 'flackar') {
    g.ellipse(-30, -58, 13, 10).fill(0x3a3a44)
    g.ellipse(32, -30, 10, 13).fill(0x3a3a44)
  } else if (djur.marke === 'rander') {
    for (const y of [-64, -46, -28]) {
      const rx = 53 * Math.sqrt(Math.max(0, 1 - ((y + 44) / 46) ** 2))
      g.roundRect(-rx + 3, y - 4, (rx - 3) * 2, 8, 4).fill(0x3a2a14)
    }
  }
  g.eventMode = 'none'
  return g
}

// Händerna ritas ovanpå instrumentet så djuret verkligen HÅLLER det.
export function ritaHander(djur) {
  const g = new Graphics()
  const c = djur.pals
  for (const s of [-1, 1]) g.ellipse(s * 34, -34, 10, 9).fill(sphereFill(shade(c, 0.05))).stroke({ width: 2, color: shade(c, 0.3) })
  g.eventMode = 'none'
  return g
}

// --- Noter (konsertmätaren) ---------------------------------------------------------------
// Ritas vita och färgas med `tint` — en not som tänds är samma form i djurets färg.
export function ritaNot() {
  const c = new Container()
  const g = new Graphics()
  g.moveTo(10, -2).lineTo(10, -38).stroke({ width: 4, color: 0xffffff, cap: 'round' })
  g.moveTo(10, -38).quadraticCurveTo(24, -32, 20, -18).stroke({ width: 4, color: 0xffffff, cap: 'round' })
  g.ellipse(0, 0, 13, 9.5).fill(0xffffff)
  g.rotation = 0
  g.eventMode = 'none'
  c.addChild(g)
  c._not = g
  c.eventMode = 'none'
  return c
}

// Flygande not (transient, självstädande i index.js) — samma form som mätarens.
export function ritaFlygNot(color) {
  const n = ritaNot()
  n._not.tint = color
  return n
}

// --- Podium ------------------------------------------------------------------------------
// En liten rund tunna att stå på. Färgen är djurets — den bär identiteten som kortets ram gjorde.
export function ritaPodium(color) {
  const g = new Graphics()
  const bas = shade(color, 0.05)
  g.ellipse(0, 46, 66, 15).fill({ color: 0x000000, alpha: 0.22 }) // markskugga
  g.rect(-58, 0, 116, 40).fill(cylinderFill(bas, { dark: 0.3, highlight: 0.22 }))
  g.ellipse(0, 40, 58, 14).fill(cylinderFill(bas, { dark: 0.3, highlight: 0.22 }))
  g.ellipse(0, 26, 58, 14).stroke({ width: 3, color: 0xffffff, alpha: 0.22 }) // list
  g.ellipse(0, 0, 58, 15).fill(lerpColor(color, 0xffffff, 0.35)).stroke({ width: 3, color: shade(color, 0.12) })
  g.ellipse(0, 1, 44, 10).fill({ color: 0x000000, alpha: 0.08 }) // trycket där djuret står
  g.eventMode = 'none'
  return g
}
