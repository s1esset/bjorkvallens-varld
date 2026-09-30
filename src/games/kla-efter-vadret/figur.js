// Elvira i "Klä efter Vädret" — en egen figur (lib/figurer.js:makeElvira har en fastbakad
// klänning och röda skor, så plaggen barnet klär på henne hade hamnat OVANPÅ andra plagg).
// Den här är i underkläder (blekt lila) med bara ben och fötter, och har:
//   volym    — klot-/rörfyllningar (sphereFill/cylinderFill/topLightFill) i stället för platta färger
//   ansikte  — ögon med ljusreflex som blinkar och följer det barnet drar, ögonbryn som oroas,
//              tre munnar (lugn / glad / "brr") och en svettdroppe i värmen
//   vilo-liv — hon andas (skala kring fötterna) och blinkar, även när ingen rör henne
//
// Kroppsdelarna ritas i ABSOLUTA koordinater kring x = 640, och `inner` har sin pivot vid
// fötterna: då svänger ett `rotation` henne kring marken hon står på, inte kring scenens origo.
// `root` ägs av gsap (hoppet vid rätt plagg, "gå ut"-promenaden); `inner` ägs av tickern
// (skalv + andning) — de får aldrig skriva samma egenskap.
import { Container, Graphics } from 'pixi.js'
import { sphereFill, topLightFill, cylinderFill, bage } from '../../lib/form.js'
import { COLORS, shade } from '../../lib/theme.js'

export const CX = 640

export function byggElvira(golv) {
  const root = new Container()
  root.eventMode = 'none'
  root.interactiveChildren = false
  const inner = new Container()
  inner.pivot.set(CX, golv)
  inner.position.set(CX, golv)
  root.addChild(inner)

  const skin = 0xffe0b2
  const skinDark = 0xe2b98a
  const hair = 0xf6cb45
  const hairDark = shade(hair, 0.24)
  const body = 0xe6dcf7
  const bodyDark = shade(body, 0.28)
  const shorts = 0xc8b6ec
  const ink = 0x4a3526
  const hud = sphereFill(skin, { lightX: 0.4, lightY: 0.32, highlight: 0.22, dark: 0.14 })
  const ben = cylinderFill(skin, { axis: 'y', dark: 0.16, highlight: 0.18 })

  const legs = new Graphics()
  for (const lx of [-46, 10]) legs.roundRect(CX + lx, 496, 36, 98, 16).fill(ben)
  const feet = new Graphics()
  for (const fx of [-40, 40]) feet.ellipse(CX + fx, 592, 40, 22).fill(hud).stroke({ width: 5, color: skinDark })
  const arms = new Graphics()
  for (const ax of [-124, 88]) arms.roundRect(CX + ax, 304, 36, 146, 18).fill(ben)
  const torso = new Graphics()
  torso.roundRect(CX - 90, 290, 180, 222, 40).fill(topLightFill(body, { highlight: 0.28, dark: 0.16 })).stroke({ width: 6, color: bodyDark })
  const shortsG = new Graphics()
  shortsG.roundRect(CX - 88, 478, 176, 46, 22).fill(topLightFill(shorts, { highlight: 0.22, dark: 0.18 })).stroke({ width: 5, color: shade(shorts, 0.28) })
  const hands = new Graphics()
  for (const hx of [-106, 106]) hands.circle(CX + hx, 456, 21).fill(hud).stroke({ width: 5, color: skinDark })
  const neck = new Graphics().roundRect(CX - 20, 292, 40, 34, 10).fill(ben)

  // Hår bakom huvudet: en bred bakgrund + två tofsar som tittar fram vid sidorna.
  const backHair = new Graphics()
  backHair.ellipse(CX, 240, 80, 82).fill(sphereFill(hair, { highlight: 0.2, dark: 0.22 })).stroke({ width: 5, color: hairDark })
  for (const hx of [-80, 80]) backHair.ellipse(CX + hx, 288, 24, 48).fill(sphereFill(hair, { highlight: 0.25, dark: 0.22 })).stroke({ width: 5, color: hairDark })
  const ears = new Graphics()
  for (const ex of [-68, 68]) ears.circle(CX + ex, 254, 12).fill(hud).stroke({ width: 4, color: skinDark })
  const head = new Graphics().circle(CX, 250, 70).fill(hud).stroke({ width: 6, color: skinDark })
  // Lugg: topphår + tre puffar över pannan (ovanför ögonen, som börjar på y 231).
  const topHair = new Graphics()
  topHair.ellipse(CX, 196, 74, 42).fill(sphereFill(hair, { highlight: 0.28, dark: 0.2 })).stroke({ width: 5, color: hairDark })
  for (const [bx, by, br] of [[-34, 212, 16], [0, 214, 18], [34, 212, 16]]) topHair.circle(CX + bx, by, br).fill(sphereFill(hair, { highlight: 0.25, dark: 0.2 }))
  const ties = new Graphics()
  for (const tx of [-72, 72]) ties.circle(CX + tx, 240, 10).fill(sphereFill(COLORS.pink))

  const kind = new Graphics()
  kind.circle(CX - 42, 266, 10).fill({ color: COLORS.pink, alpha: 0.5 })
  kind.circle(CX + 42, 266, 10).fill({ color: COLORS.pink, alpha: 0.5 })
  kind.ellipse(CX, 258, 4.5, 3.5).fill({ color: skinDark, alpha: 0.85 })

  // Ögon: en behållare i sin egen mitt (så scale.y kan blinka), pupillerna i ett eget
  // lager (så blicken kan flytta dem).
  const eyes = new Container()
  eyes.position.set(CX, 244)
  const vitor = new Graphics()
  for (const ex of [-26, 26]) vitor.ellipse(ex, 0, 13, 14.5).fill(0xffffff).stroke({ width: 2, color: skinDark, alpha: 0.7 })
  const pupils = new Container()
  const pg = new Graphics()
  for (const ex of [-26, 26]) {
    pg.circle(ex, 1, 9.5).fill(sphereFill(0x7a5236, { highlight: 0.3, dark: 0.3 }))
    pg.circle(ex, 1, 5.4).fill(ink)
    pg.circle(ex + 3.2, -3.6, 3.2).fill(0xffffff)
    pg.circle(ex - 3, 4.4, 1.6).fill({ color: 0xffffff, alpha: 0.8 })
  }
  pupils.addChild(pg)
  eyes.addChild(vitor, pupils)

  // Ögonbryn: en behållare per bryn, pivot i brynets mitt så rotationen sluttar det.
  const bryn = (bx) => {
    const c = new Container()
    c.position.set(CX + bx, 224)
    const g = new Graphics()
    g.moveTo(-11, 2).quadraticCurveTo(0, -4, 11, 2).stroke({ width: 4.5, color: hairDark, cap: 'round' })
    c.addChild(g)
    return c
  }
  const brynV = bryn(-26)
  const brynH = bryn(26)

  // Tre munnar; bara en syns.
  const munLugn = new Graphics()
  bage(munLugn, CX, 258, 24, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 6, color: ink, cap: 'round' })
  const munGlad = new Graphics()
  munGlad.moveTo(CX - 27, 262).quadraticCurveTo(CX, 300, CX + 27, 262).closePath().fill(0x8a3b3b).stroke({ width: 5, color: ink, join: 'round' })
  munGlad.ellipse(CX, 281, 12, 6).fill(0xf08a8a)
  const munBrr = new Graphics()
  munBrr.moveTo(CX - 22, 272).lineTo(CX - 13, 266).lineTo(CX - 4, 273).lineTo(CX + 5, 266).lineTo(CX + 14, 273).lineTo(CX + 22, 267)
    .stroke({ width: 5, color: ink, cap: 'round', join: 'round' })
  munGlad.visible = false
  munBrr.visible = false

  // Svettdroppe (värmen i solen). Behållaren bobbar; själva droppen ritas i absoluta koordinater.
  const svett = new Container()
  const sg = new Graphics()
  const sx = CX + 62
  const sy = 214
  sg.moveTo(sx, sy - 14).quadraticCurveTo(sx + 12, sy + 3, sx, sy + 9).quadraticCurveTo(sx - 12, sy + 3, sx, sy - 14)
    .fill(0x7fd0f5).stroke({ width: 2, color: 0x4aa3df })
  svett.addChild(sg)
  svett.visible = false

  inner.addChild(legs, feet, arms, torso, shortsG, hands, neck, backHair, ears, head, topHair, ties, kind,
    eyes, brynV, brynH, munLugn, munGlad, munBrr, svett)

  const f = {
    root,
    inner,
    bakHar: backHair, // överkroppsplagg läggs UNDER huvudet (huvor och kragar hamnar bakom det)
    _t: 0,
    _blinkT: 1.2,
    _lock: 0,
    _mun: 'lugn',
    _kittla: 0,

    // Ett tryck på henne: hon skrattar en stund (glad mun) oavsett hur klädd hon är.
    kittla(sek = 1.1) {
      f._kittla = sek
    },

    // Ansiktet + vilo-livet varje bildruta. Skalvet (inner.x / inner.rotation) sköts av spelet.
    uppdatera(sec, { obehag = 0, glad: gladIn = false, vader = 'sol', lookX = 0, lookY = 0 } = {}) {
      if (inner.destroyed) return
      f._t += sec
      if (f._kittla > 0) f._kittla -= sec
      const glad = gladIn || f._kittla > 0

      // Andning kring fötterna.
      inner.scale.y = 1 + Math.sin(f._t * 1.9) * 0.011

      // Blink.
      f._blinkT -= sec
      if (f._blinkT <= 0) {
        f._lock = 0.13
        f._blinkT = 2.2 + Math.random() * 3.2
      }
      if (f._lock > 0) {
        f._lock -= sec
        eyes.scale.y = 0.12
      } else {
        eyes.scale.y = 1
      }

      // Blicken följer det som dras.
      const k = Math.min(1, sec * 10)
      pupils.x += (lookX * 4 - pupils.x) * k
      pupils.y += (lookY * 3 - pupils.y) * k

      // Bryn oroas med obehaget; rakt och lugnt när hon är lagom.
      const o = glad ? 0 : Math.min(1, obehag)
      brynV.rotation += (-0.38 * o - brynV.rotation) * k
      brynH.rotation += (0.38 * o - brynH.rotation) * k
      brynV.y = brynH.y = 224 - 3 * o

      // Mun: glad när hon är lagom klädd, "brr" medan hon lider, annars ett lugnt leende.
      const mun = glad || o < 0.05 ? 'glad' : o > 0.3 ? 'brr' : 'lugn'
      if (mun !== f._mun) {
        f._mun = mun
        munLugn.visible = mun === 'lugn'
        munGlad.visible = mun === 'glad'
        munBrr.visible = mun === 'brr'
      }

      svett.visible = vader === 'sol' && o > 0.15 && !glad
      // (kittlad = glad även med obehag; svetten göms då också)
      if (svett.visible) svett.y = Math.sin(f._t * 3) * 3 + ((f._t * 14) % 10) * 0.3
    },
  }
  return f
}
