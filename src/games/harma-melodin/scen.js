// Härma Melodin — konsertscenen: en äng med kullar bakom, en trästage med rampljus, vimplar
// över hela scenen och ett dirigentpall i mitten. Allt är dekor (eventMode 'none') och bär
// ingen tryckyta — varelserna står ovanpå och äger sina egna träffytor.
//
// Geometrin hänger ihop med index.js: varelsernas fötter står vid y ≈ 558 (mitt på
// stagens golv 512–590), rampen slutar på y 624 så "Visa igen" (y 634–710) ligger fritt
// under den, och dirigenten står mellan äpplet (x 500) och droppen (x 780).
import { Container, Graphics } from 'pixi.js'
import { createScene } from '../../lib/scene.js'
import { COLORS, shade } from '../../lib/theme.js'
import { verticalFill, topLightFill } from '../../lib/form.js'

const STAGE_X0 = 150
const STAGE_X1 = 1130
const FLAGG = [COLORS.green, COLORS.red, COLORS.blue, COLORS.yellow, COLORS.orange, COLORS.pink]

// Hela bakgrunden + stagen. Returnerar en Container med bara dekor.
export function byggScen() {
  const root = new Container()
  root.eventMode = 'none'
  root.interactiveChildren = false

  // Äng med kullar och moln. Solen hamnar uppe till höger men under skalets högtalare
  // (x 1140–1280, y 0–134) — den är ren dekor, men ska inte ligga exakt bakom en knapp.
  root.addChild(createScene('meadow', { sunX: 1000, sunY: 150, groundH: 200 }))

  // Vimplar: en lågt hängande kedja över scenen. Kurvan är en kvadratisk bezier, flaggorna
  // sitter på den med jämna steg. Toppen ligger utanför hemknappen (x 0–140).
  const snorLager = new Container()
  snorLager.eventMode = 'none'
  const snor = new Graphics()
  const P0 = { x: 230, y: 62 }
  const C = { x: 640, y: 206 }
  const P2 = { x: 1050, y: 62 }
  snor.moveTo(P0.x, P0.y).quadraticCurveTo(C.x, C.y, P2.x, P2.y).stroke({ width: 4, color: COLORS.brown, alpha: 0.8, cap: 'round' })
  const N = 13
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N
    const x = (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * C.x + t * t * P2.x
    const y = (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * C.y + t * t * P2.y
    const f = new Graphics()
      .moveTo(-16, 0).lineTo(16, 0).lineTo(0, 40).closePath()
      .fill(FLAGG[i % FLAGG.length])
      .stroke({ width: 2.5, color: shade(FLAGG[i % FLAGG.length], 0.35), alpha: 0.7, join: 'round' })
    f.position.set(x, y + 1)
    f.rotation = (t - 0.5) * 0.5
    snorLager.addChild(f)
  }
  snor.eventMode = 'none'
  root.addChild(snor, snorLager)

  // Stagen: golv (ljust trä med plankfogar), en mörkare framkant och rampljus längs kanten.
  const golv = new Graphics()
  golv.roundRect(STAGE_X0, 512, STAGE_X1 - STAGE_X0, 88, 20).fill(verticalFill(0xf0c58a, 0xd19a5e))
  golv.roundRect(STAGE_X0, 512, STAGE_X1 - STAGE_X0, 88, 20).stroke({ width: 4, color: 0x8a5a3b, alpha: 0.45 })
  for (const y of [538, 564]) {
    golv.moveTo(STAGE_X0 + 14, y).lineTo(STAGE_X1 - 14, y).stroke({ width: 2, color: 0x8a5a3b, alpha: 0.2 })
  }
  for (let r = 0; r < 3; r++) {
    const y0 = 512 + r * 26
    for (let x = STAGE_X0 + 90 + ((r * 137) % 160); x < STAGE_X1 - 40; x += 230) {
      golv.moveTo(x, y0 + (r === 0 ? 8 : 0)).lineTo(x, y0 + 26).stroke({ width: 2, color: 0x8a5a3b, alpha: 0.18 })
    }
  }
  golv.eventMode = 'none'
  root.addChild(golv)

  const kant = new Graphics()
  kant.roundRect(STAGE_X0 - 6, 592, STAGE_X1 - STAGE_X0 + 12, 32, 12).fill(topLightFill(0xb9743f, { highlight: 0.18, dark: 0.22 }))
  kant.roundRect(STAGE_X0 - 6, 592, STAGE_X1 - STAGE_X0 + 12, 32, 12).stroke({ width: 3, color: 0x6e4327, alpha: 0.6 })
  for (let x = STAGE_X0 + 40; x < STAGE_X1 - 20; x += 70) {
    kant.circle(x, 608, 13).fill({ color: 0xffe27a, alpha: 0.28 })
    kant.circle(x, 608, 7.5).fill(0xffe27a).stroke({ width: 2, color: 0xc99a2e })
  }
  kant.eventMode = 'none'
  root.addChild(kant)

  // Dirigentpallen: en rund trälåda med ljus topp. Dirigenten själv byggs i index.js.
  const pall = new Graphics()
  pall.rect(596, 450, 88, 104).fill(topLightFill(0xa8683a, { highlight: 0.15, dark: 0.25 }))
  pall.ellipse(640, 554, 44, 10).fill(0x8a5a3b)
  pall.ellipse(640, 450, 44, 11).fill(0xd69a62).stroke({ width: 3, color: 0x6e4327, alpha: 0.6 })
  pall.eventMode = 'none'
  root.addChild(pall)

  return root
}

// Dirigent-Bobo: kropp, bowtie, armar och taktpinne runt den färdiga huvud-riggen. Hela
// gruppen nickar (y) i takt; taktpinnen är en egen container som svingar (rotation).
// Returnerar { grupp, pinne, PINNE_VILA }.
export const PINNE_VILA = 0.35

export function byggDirigent(kar) {
  const grupp = new Container()
  grupp.eventMode = 'none'
  grupp.interactiveChildren = false

  const drakt = 0x35467a
  const kropp = new Graphics()
    .roundRect(600, 306, 80, 130, 34).fill(topLightFill(drakt, { highlight: 0.18, dark: 0.2 }))
    .stroke({ width: 3, color: shade(drakt, 0.4), alpha: 0.8 })
  // Skjortbröst + fluga.
  const skjorta = new Graphics().moveTo(626, 308).lineTo(654, 308).lineTo(640, 366).closePath().fill(0xffffff)
  const fluga = new Graphics()
    .moveTo(640, 320).lineTo(616, 306).lineTo(616, 334).closePath().fill(COLORS.red)
    .moveTo(640, 320).lineTo(664, 306).lineTo(664, 334).closePath().fill(COLORS.red)
    .circle(640, 320, 6).fill(shade(COLORS.red, 0.3))
  // Skor på pallen.
  const skor = new Graphics().ellipse(618, 440, 19, 9).fill(0x2a2a3a).ellipse(662, 440, 19, 9).fill(0x2a2a3a)
  // Armar: vänster hänger, höger håller taktpinnen uppe.
  const armV = new Graphics()
    .moveTo(606, 334).lineTo(590, 390).stroke({ width: 17, color: drakt, cap: 'round' })
    .circle(589, 394, 9).fill(0xfff0d6)
  const armH = new Graphics()
    .moveTo(674, 334).lineTo(706, 318).stroke({ width: 17, color: drakt, cap: 'round' })
  const hand = new Graphics().circle(708, 316, 9).fill(0xfff0d6)

  const pinne = new Container()
  pinne.position.set(708, 316)
  pinne.rotation = PINNE_VILA
  pinne.addChild(
    new Graphics()
      .moveTo(0, 2).lineTo(0, -62).stroke({ width: 5, color: 0xfff6e0, cap: 'round' })
      .circle(0, -64, 5.5).fill(0xffffff)
      .circle(0, 4, 7).fill(0xfff0d6),
  )
  for (const g of [kropp, skjorta, fluga, skor, armV, armH, hand, pinne]) g.eventMode = 'none'

  kar.view.position.set(640, 246)
  grupp.addChild(skor, kropp, skjorta, fluga, armV, armH, kar.view, hand, pinne)
  return { grupp, pinne }
}
