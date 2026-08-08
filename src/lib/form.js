// Gradient-fyllningar som ger platta former volym: ett klot i stället för en skiva, en stav
// i stället för ett streck. Bygger på Pixi 8.19 FillGradient med textureSpace 'local'
// (standard) — koordinater 0..1 normaliserade mot VARJE ritad forms egen bounding box, så
// en delad gradient-instans anpassar sig automatiskt när den återanvänds på former av olika
// storlek. Bekräftat i källan, inte gissat: `generateTextureFillMatrix.js` gör
// `const bounds = shape.getBounds()` PER FORM — inte per fill()-anrop och inte per Graphics.
// Två cirklar i samma Graphics får alltså var sin egen normalisering, vilket är precis det
// som gör att ett moln av fyra puffar läser som fyra klot i stället för en klump.
// Ersätter mönstret "mörk skugga-cirkel + ljus gloss-cirkel för hand" som upprepas i många
// spelfiler — se docs/LYFTPLAN.md C1.
import { FillGradient, Graphics } from 'pixi.js'
import { shade, tint, COLORS } from './theme.js'

// Delade instanser per färg+opts — en form med samma parametrar återanvänder samma bakade
// FillGradient (canvas + GPU-textur byggs en gång) i stället för en ny per anrop. Viktigt för
// artikoner.js: samma ikon (samma färg) ritas ofta på nytt många gånger i ett spel.
const _sphereCache = new Map()
const _cylinderCache = new Map()
const _topCache = new Map()

// Detaljnivå, app-brett. 2 = full (gradienter + strukturaccenter) · 1 = gradienter utan
// accenter · 0 = platta färger, exakt som appen såg ut före lib/form.js. Nivå 0 gör att
// fyllningsfunktionerna returnerar RÅFÄRGEN i stället för en FillGradient — `.fill(0x4aa3df)`
// är lika giltigt som `.fill(gradient)`, så ingen anropare behöver veta om skillnaden och
// ingen ritgren behöver en egen if-sats. Sänk på svaga plattor.
let _detalj = 2
export function setDetaljniva(n) { _detalj = Math.max(0, Math.min(2, n | 0)) }
export function detaljniva() { return _detalj }

// En radiell fyllning som läser som ett klot: innercirkelns centrum (ljuskällan) sitter
// förskjuten uppe till vänster medan yttercirkeln är centrerad i formen — samma tvåcirkel-
// trick som ger CSS-klot sin rundning. lightX/lightY (0..1 mot formens bbox) styr
// ljuskällans position, spread hur fort det mörknar mot kanten (0.5 = exakt formens kant).
// Returnerar en FillGradient — används som `graphics.fill(sphereFill(farg))`.
export function sphereFill(color, opts = {}) {
  if (_detalj < 1) return color
  const { lightX = 0.32, lightY = 0.3, spread = 0.55, highlight = 0.45, dark = 0.32 } = opts
  const key = `${color}|${lightX}|${lightY}|${spread}|${highlight}|${dark}`
  let g = _sphereCache.get(key)
  if (g) return g
  g = new FillGradient({
    type: 'radial',
    // 64 i stället för Pixis standard 256. En radiell gradient bakas till en NxN-duk
    // (linjära blir Nx1), så varje klotfyllning kostar N²·4 byte GPU-minne: 256 ger
    // 256 KB styck och hela ikonbiblioteket landade på 15,3 MB — mätt med
    // scripts/_ikonkostnad.mjs. Vid 64 är samma bibliotek 0,96 MB. Övergången är mjuk
    // och magnifieras med linjär filtrering, så banding syns inte ens på 300px-ikoner.
    textureSize: 64,
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

// En linjär fyllning TVÄRS över en cylinder: ljus längs mittlinjen, mörknar mot båda
// kanterna. `axis` är cylinderns EGEN längdriktning — 'y' (standard) = stående rör
// (raketkropp, stam, stolpe, morot), 'x' = liggande rör (slang, gren, banan).
// Skillnaden mot topLightFill är att en cylinder har TVÅ mörka kanter; en form som bara
// är belyst uppifrån har en ljus topp och en mörk botten.
export function cylinderFill(color, opts = {}) {
  const { axis = 'y', dark = 0.28, highlight = 0.3 } = opts
  if (_detalj < 1) return color
  const key = `${color}|${axis}|${dark}|${highlight}`
  let g = _cylinderCache.get(key)
  if (g) return g
  const end = axis === 'y' ? { x: 1, y: 0 } : { x: 0, y: 1 }
  g = new FillGradient({
    end,
    colorStops: [
      { offset: 0, color: shade(color, dark) },
      { offset: 0.42, color: tint(color, highlight) },
      { offset: 0.58, color: tint(color, highlight * 0.5) },
      { offset: 1, color: shade(color, dark) },
    ],
  })
  _cylinderCache.set(key, g)
  return g
}

// Standardfyllningen för allt som INTE är ett klot eller ett rör: en form belyst uppifrån.
// Ljus överkant → grundfärg → mörkad underkant, lodrätt över formens egen bbox. Fungerar
// rakt av på polygoner, roundRects, kläder, karosser och verktyg — där en radiell
// klot-gradient skulle läsa som en bubbla i stället för ett föremål.
export function topLightFill(color, opts = {}) {
  const { highlight = 0.3, dark = 0.2, mid = 0.45 } = opts
  if (_detalj < 1) return color
  const key = `${color}|${highlight}|${dark}|${mid}`
  let g = _topCache.get(key)
  if (g) return g
  g = new FillGradient({
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: tint(color, highlight) },
      { offset: mid, color },
      { offset: 1, color: shade(color, dark) },
    ],
  })
  _topCache.set(key, g)
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
