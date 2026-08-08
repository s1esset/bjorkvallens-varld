// Gradient-fyllningar som ger platta former volym: ett klot i stället för en skiva, en stav
// i stället för ett streck. Bygger på Pixi 8.19 FillGradient med textureSpace 'local'
// (standard) — koordinater 0..1 normaliserade mot VARJE ritad forms egen bounding box, så
// en delad gradient-instans anpassar sig automatiskt när den återanvänds på former av olika
// storlek (bekräftat i node_modules/pixi.js FillGradient.js: transformen byggs i 0..1-rymd,
// inte i pixlar). Ersätter mönstret "mörk skugga-cirkel + ljus gloss-cirkel för hand" som
// upprepas i många spelfiler — se docs/LYFTPLAN.md C1.
import { FillGradient, Graphics } from 'pixi.js'
import { shade, tint, COLORS } from './theme.js'

// Delade instanser per färg+opts — en form med samma parametrar återanvänder samma bakade
// FillGradient (canvas + GPU-textur byggs en gång) i stället för en ny per anrop. Viktigt för
// artikoner.js: samma ikon (samma färg) ritas ofta på nytt många gånger i ett spel.
const _sphereCache = new Map()
const _cylinderCache = new Map()

// En radiell fyllning som läser som ett klot: innercirkelns centrum (ljuskällan) sitter
// förskjuten uppe till vänster medan yttercirkeln är centrerad i formen — samma tvåcirkel-
// trick som ger CSS-klot sin rundning. lightX/lightY (0..1 mot formens bbox) styr
// ljuskällans position, spread hur fort det mörknar mot kanten (0.5 = exakt formens kant).
// Returnerar en FillGradient — används som `graphics.fill(sphereFill(farg))`.
export function sphereFill(color, opts = {}) {
  const { lightX = 0.32, lightY = 0.3, spread = 0.55, highlight = 0.45, dark = 0.32 } = opts
  const key = `${color}|${lightX}|${lightY}|${spread}|${highlight}|${dark}`
  let g = _sphereCache.get(key)
  if (g) return g
  g = new FillGradient({
    type: 'radial',
    center: { x: lightX, y: lightY },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: spread,
    colorStops: [
      { offset: 0, color: tint(color, highlight) },
      { offset: 0.55, color },
      { offset: 1, color: shade(color, dark) },
    ],
  })
  _sphereCache.set(key, g)
  return g
}

// En linjär fyllning tvärs över formen som läser som en cylinder/stav sedd rakt framifrån:
// ljus i mitten, mörknar mot båda kanterna. vertical: true ger ett lodrätt tvärsnitt
// (stolpar/stammar) i stället för det vågräta standardläget (slangar/stavar liggande).
export function cylinderFill(color, opts = {}) {
  const { vertical = false, dark = 0.28, highlight = 0.3 } = opts
  const key = `${color}|${vertical}|${dark}|${highlight}`
  let g = _cylinderCache.get(key)
  if (g) return g
  const end = vertical ? { x: 0, y: 1 } : { x: 1, y: 0 }
  g = new FillGradient({
    end,
    colorStops: [
      { offset: 0, color: shade(color, dark) },
      { offset: 0.45, color: tint(color, highlight) },
      { offset: 0.55, color: tint(color, highlight) },
      { offset: 1, color: shade(color, dark) },
    ],
  })
  _cylinderCache.set(key, g)
  return g
}

// En liten glansfläck som egen Graphics, redo att läggas som syskon ovanpå en redan ritad
// form — samma handrullade "gloss"-cirkel som upprepas i många spelfiler, nu som en rad:
// `c.addChild(body, rimLight(r))`. r = formens radie (ry för en ellips lodrätt).
export function rimLight(r, opts = {}) {
  const { offsetX = -0.32, offsetY = -0.34, size = 0.34, alpha = 0.5, ry = r } = opts
  const g = new Graphics().ellipse(r * offsetX, ry * offsetY, r * size, ry * size).fill({ color: COLORS.white, alpha })
  g.eventMode = 'none'
  return g
}
