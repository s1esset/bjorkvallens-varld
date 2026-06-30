// Delad "tillaga-till-ton"-verktygslåda för matlagningsspelen (pizza i ugn, burgare på
// grill). BARA den vy-oberoende ton-modellen delas: en ton-gradient (rå → gyllene → mörk
// → kol), en svensk ton-replik och en ton-mätare (gradient-remsa + 😋-guide + rörlig
// markör). Själva scenen (uppifrån/sidan, ugn/grill, fri placering/stapling, ritade
// ingredienser) bor kvar i varje spel. Exit-säker: mätaren är ren Graphics utan tweens.
import { Container, Graphics, Text } from 'pixi.js'
import { lerpColor } from './scene.js'
import { COLORS, FONT } from './theme.js'

export const BAKE_SECONDS = 7.5 // tid från rå till becksvart om man aldrig tar ut

// Ton-gradient som tint. `stops` = [rå, gyllene, mellan, mörk, kol] (5 färger); de
// gemensamma brytpunkterna 0.3/0.55/0.8 ger samma "kurva", bara färgerna skiljer per spel.
// Returnerar en funktion t(0..1) → färg.
export function makeBakeTint(stops) {
  const [c0, c1, c2, c3, c4] = stops
  return (t) => {
    if (t < 0.3) return lerpColor(c0, c1, t / 0.3)
    if (t < 0.55) return lerpColor(c1, c2, (t - 0.3) / 0.25)
    if (t < 0.8) return lerpColor(c2, c3, (t - 0.55) / 0.25)
    return lerpColor(c3, c4, (t - 0.8) / 0.2)
  }
}

// Positiv ton-replik (aldrig ett "fel"). `mid` = den gyllene mittenfrasen (spel-specifik).
export function toneSpeech(t, mid = 'Mums! Gyllene och god!') {
  if (t < 0.22) return 'Nästan rå — men jättefin!'
  if (t < 0.68) return mid
  if (t < 0.9) return 'Lite mörk och knaprig!'
  return 'Hoppsan, alldeles bränd! Hihi!'
}

// Ton-mätare: gradient-remsa + 😋-guide över gyllene zon + rörlig markör.
// `tint` = en makeBakeTint(...)-funktion så remsan matchar spelets egen ton.
// Returnerar { container, setProgress(t) } — spelet positionerar containern och uppdaterar
// markören per frame via setProgress (en ren property-skrivning, ingen om-ritning).
export function buildToneMeter({ width = 340, height = 30, tint }) {
  const c = new Container()
  c.eventMode = 'none'
  const bar = new Graphics()
  const steps = 40
  for (let i = 0; i < steps; i++) {
    bar.rect(-width / 2 + (i * width) / steps, -height / 2, width / steps + 1, height).fill(tint(i / (steps - 1)))
  }
  bar.roundRect(-width / 2, -height / 2, width, height, height / 2).stroke({ width: 4, color: COLORS.white })
  c.addChild(bar)
  const yum = new Text({ text: '😋', style: { fontFamily: FONT.body, fontSize: 30 } })
  yum.anchor.set(0.5)
  yum.position.set(0, -height - 6)
  c.addChild(yum)
  const marker = new Graphics().moveTo(0, -height / 2 - 4).lineTo(-9, -height / 2 - 20).lineTo(9, -height / 2 - 20).closePath().fill(COLORS.ink)
  marker.x = -width / 2
  c.addChild(marker)
  return {
    container: c,
    setProgress(t) {
      marker.x = -width / 2 + width * t
    },
  }
}
