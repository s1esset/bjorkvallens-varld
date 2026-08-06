// Delade ritade figurer — mottagarna som står i spelens scener (gate-punkt 4).
//
// `mascot.js` ger BARA ett huvud (`makeMascot`), så varje spel som velat ha Bobo i
// bild har fått rita kroppen själv. Fem spel hann göra det innan den här filen fanns
// (vippbradan · bowling · glasstornet · domino · blixt-och-dunder) med nästan samma
// geometri. Proportionerna nedan är hämtade ur vippbradans kropp, som är den renaste
// av dem, och parametriserade på `faceR` — samma radie som skickas till makeMascot.
//
// Alla figurer har origo i MARKEN mellan fötterna där det är meningsfullt, så en
// `pop()`/`wiggle()` studsar dem från underlaget i stället för från magen.
import { Container, Graphics } from 'pixi.js'
import { makeMascot } from './mascot.js'
import { lerpColor } from './scene.js'
import { COLORS } from './theme.js'

// Bobos kropp utan huvud. Ritas FÖRE huvudet så huvudet vilar på bålen.
// Origo = huvudets centrum (som makeMascot), fötterna hamnar på y ≈ faceR * 2.2.
export function makeBoboBody(faceR = 50) {
  const r = faceR
  const g = new Graphics()
  g.ellipse(0, r * 2.36, r * 0.68, r * 0.22).fill({ color: 0x000000, alpha: 0.16 }) // markskugga
  g.ellipse(-r * 0.34, r * 2.16, r * 0.28, r * 0.18).fill(COLORS.orangeDark) // fötter
  g.ellipse(r * 0.34, r * 2.16, r * 0.28, r * 0.18).fill(COLORS.orangeDark)
  g.ellipse(0, r * 1.36, r * 0.68, r * 0.8).fill(COLORS.orange) // bål
  g.ellipse(0, r * 1.48, r * 0.42, r * 0.44).fill({ color: COLORS.cream, alpha: 0.92 }) // mage
  // armar (streck med rundade ändar) + tassar
  g.moveTo(-r * 0.54, r * 1.04).quadraticCurveTo(-r * 0.96, r * 0.8, -r * 1.04, r * 0.24)
  g.stroke({ width: r * 0.26, color: COLORS.orange, cap: 'round' })
  g.moveTo(r * 0.54, r * 1.04).quadraticCurveTo(r * 0.96, r * 0.8, r * 1.04, r * 0.24)
  g.stroke({ width: r * 0.26, color: COLORS.orange, cap: 'round' })
  g.circle(-r * 1.04, r * 0.24, r * 0.2).fill(COLORS.cream)
  g.circle(r * 1.04, r * 0.24, r * 0.2).fill(COLORS.cream)
  g.eventMode = 'none'
  return g
}

// Hel Bobo: kropp + huvud i en behållare. Det här är vad ett spel nästan alltid vill ha.
export function makeBobo(faceR = 50) {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  c.addChild(makeBoboBody(faceR), makeMascot(faceR))
  return c
}

// Elvira, ritad och stående. Origo = marken mellan fötterna (y=0); figuren växer
// uppåt till ca y = -1,06 * h där h är önskad höjd i px (standard 104).
export function makeElvira(h = 104) {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  const k = h / 104
  const skin = 0xffe0b2
  const skinDark = 0xe7c193
  const hair = 0xf6cb45
  const hairDark = lerpColor(hair, 0x000000, 0.22)
  const dress = COLORS.teal
  const dressDark = lerpColor(COLORS.teal, 0x000000, 0.2)
  const ink = 0x4a3526
  const g = new Graphics()
  g.ellipse(-11 * k, -5 * k, 12 * k, 7 * k).fill(0xe0574f) // skor
  g.ellipse(11 * k, -5 * k, 12 * k, 7 * k).fill(0xe0574f)
  g.roundRect(-15 * k, -32 * k, 9 * k, 27 * k, 4 * k).fill(skin) // ben
  g.roundRect(6 * k, -32 * k, 9 * k, 27 * k, 4 * k).fill(skin)
  g.moveTo(-15 * k, -70 * k).lineTo(-26 * k, -28 * k).lineTo(26 * k, -28 * k).lineTo(15 * k, -70 * k).closePath()
  g.fill(dress).stroke({ width: 4 * k, color: dressDark }) // klänning
  g.roundRect(-26 * k, -68 * k, 8 * k, 30 * k, 4 * k).fill(skin).stroke({ width: 3 * k, color: skinDark }) // armar
  g.roundRect(18 * k, -68 * k, 8 * k, 30 * k, 4 * k).fill(skin).stroke({ width: 3 * k, color: skinDark })
  g.ellipse(-22 * k, -84 * k, 8 * k, 15 * k).fill(hair).stroke({ width: 3 * k, color: hairDark }) // tofsar
  g.ellipse(22 * k, -84 * k, 8 * k, 15 * k).fill(hair).stroke({ width: 3 * k, color: hairDark })
  g.circle(0, -84 * k, 22 * k).fill(skin).stroke({ width: 4 * k, color: skinDark }) // huvud
  g.ellipse(0, -101 * k, 23 * k, 12 * k).fill(hair).stroke({ width: 3 * k, color: hairDark }) // lugg
  g.circle(-12 * k, -80 * k, 4 * k).fill({ color: COLORS.pink, alpha: 0.55 })
  g.circle(12 * k, -80 * k, 4 * k).fill({ color: COLORS.pink, alpha: 0.55 })
  g.circle(-7 * k, -86 * k, 3 * k).fill(ink)
  g.circle(7 * k, -86 * k, 3 * k).fill(ink)
  // moveTo före arc — annars drar Pixi v8 ett streck från origo till bågens start.
  const a0 = 0.15 * Math.PI
  g.moveTo(8 * k * Math.cos(a0), -81 * k + 8 * k * Math.sin(a0))
  g.arc(0, -81 * k, 8 * k, a0, 0.85 * Math.PI).stroke({ width: 3 * k, color: ink, cap: 'round' })
  g.circle(-21 * k, -92 * k, 4 * k).fill(COLORS.pink) // hårsnoddar
  g.circle(21 * k, -92 * k, 4 * k).fill(COLORS.pink)
  c.addChild(g)
  return c
}

// Ekorre med yvig svans. Origo = marken mellan fötterna. Kinderna ligger i ett eget
// lager (`._cheeks`) så de kan rodna mer allt eftersom spelet går bra.
export function makeSquirrel(h = 130) {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  const k = h / 130
  const fur = 0xc4763f
  const furDark = 0x8a5030
  const belly = 0xf0c9a0
  const g = new Graphics()
  // Svans: stor plym bakom ryggen (ritas först = längst bak).
  g.moveTo(-24 * k, -12 * k).quadraticCurveTo(-94 * k, -22 * k, -80 * k, -98 * k)
  g.quadraticCurveTo(-72 * k, -146 * k, -28 * k, -130 * k)
  g.quadraticCurveTo(-58 * k, -120 * k, -58 * k, -92 * k)
  g.quadraticCurveTo(-60 * k, -46 * k, -20 * k, -42 * k).closePath()
  g.fill(fur).stroke({ width: 4 * k, color: furDark })
  g.ellipse(-14 * k, -6 * k, 14 * k, 9 * k).fill(furDark) // fötter
  g.ellipse(14 * k, -6 * k, 14 * k, 9 * k).fill(furDark)
  g.roundRect(-35 * k, -74 * k, 12 * k, 34 * k, 6 * k).fill(fur).stroke({ width: 3 * k, color: furDark }) // armar
  g.roundRect(23 * k, -74 * k, 12 * k, 34 * k, 6 * k).fill(fur).stroke({ width: 3 * k, color: furDark })
  g.ellipse(0, -50 * k, 31 * k, 44 * k).fill(fur).stroke({ width: 4 * k, color: furDark }) // kropp
  g.ellipse(0, -44 * k, 19 * k, 29 * k).fill(belly)
  g.ellipse(-19 * k, -116 * k, 10 * k, 14 * k).fill(fur).stroke({ width: 3 * k, color: furDark }) // öron
  g.ellipse(19 * k, -116 * k, 10 * k, 14 * k).fill(fur).stroke({ width: 3 * k, color: furDark })
  g.circle(0, -100 * k, 28 * k).fill(fur).stroke({ width: 4 * k, color: furDark }) // huvud
  g.ellipse(0, -90 * k, 15 * k, 11 * k).fill(belly)
  g.circle(-10 * k, -104 * k, 5 * k).fill(0x2b2b2b)
  g.circle(10 * k, -104 * k, 5 * k).fill(0x2b2b2b)
  g.circle(-8 * k, -106 * k, 2 * k).fill(0xffffff)
  g.circle(12 * k, -106 * k, 2 * k).fill(0xffffff)
  g.ellipse(0, -93 * k, 5 * k, 4 * k).fill(0x2b2b2b)
  const a0 = 0.15 * Math.PI
  g.moveTo(9 * k * Math.cos(a0), -89 * k + 9 * k * Math.sin(a0))
  g.arc(0, -89 * k, 9 * k, a0, 0.85 * Math.PI).stroke({ width: 3 * k, color: 0x2b2b2b, cap: 'round' })
  g.eventMode = 'none'

  const cheeks = new Graphics()
  cheeks.circle(-19 * k, -95 * k, 7 * k).fill(0xef8fa4)
  cheeks.circle(19 * k, -95 * k, 7 * k).fill(0xef8fa4)
  cheeks.alpha = 0.35
  cheeks.eventMode = 'none'

  c.addChild(g, cheeks)
  c._cheeks = cheeks
  return c
}
