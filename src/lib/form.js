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

// En rak lodrät toning mellan två färger — för himlar, marker och andra stora ytor där
// det inte handlar om att ge ett FÖREMÅL volym utan om att ytan inte ska vara en enda ton.
// (`scene.js` har en egen, identisk cache för scenens himmel; den ligger kvar där för att
// scenen har mer logik runt sin och är den fil sviten är känsligast för.)
const _vertCache = new Map()
export function verticalFill(top, bottom) {
  if (_detalj < 1) return top
  const key = `${top}|${bottom}`
  let g = _vertCache.get(key)
  if (g) return g
  g = new FillGradient({ colorStops: [{ offset: 0, color: top }, { offset: 1, color: bottom }] })
  _vertCache.set(key, g)
  return g
}

// En stor VÅGRÄT yta — mark, golv, bänkskiva, hylla — som annars ligger i EN ton över
// tiotusentals pixlar. Ljuset kommer uppifrån/från horisonten, så ytan är ljusast längst
// bort och mörknar mot betraktaren.
//
// Talen är inte valda utan AVLÄSTA: exakt det här mönstret stod redan handskrivet på åtta
// ställen i repot (`golvet-ar-lava` ×2, `plantera-fron` ×2, `bowling`, `lagerelden`,
// `vart-tog-det-vagen`, `mata-monstret`) med ljus topp ~0,14 och mörk botten ~0,28. Den
// här funktionen är det mönstret med ett namn, så nästa markplan blir gratis och likadan.
//
// Skillnaden mot `topLightFill`: den har ett TREDJE stopp som lägger grundfärgen på 45 %
// av höjden, vilket är rätt för ett FÖREMÅL som ska läsa som rundat. En markplan är ingen
// rundad form utan en yta i perspektiv, och får därför en rak ramp mellan två ändpunkter.
//
// ⚠️ Standardvärdena är kalibrerade för en MELLANMÖRK yta (jord, trä, asfalt — `0x8a5a3b`
// och släkt). På en nästan vit yta är samma 28 % mörkning ett mycket större SYNLIGT fall,
// eftersom den äter av ett stort absolut spann: `valpens-bajs` grusstig (`0xeadfc2`) blev
// grumligt gråbrun i stället för sandig, och det syntes bara i skärmdumpen — talet i
// `_plattprobe` blev utmärkt. Ljusa ytor vill ha ~0,07/0,11; kolla alltid bilden.
//
// `alpha` < 1 för en yta som ska SLÄPPA IGENOM det som ligger under (en grusstig över
// gräset, en dis-remsa). Då går fyllningen via `verticalFillAlpha` i stället, eftersom
// `.fill({ color, alpha })` och `.fill(gradient)` utesluter varandra i Pixi. Två följder
// värda att känna till: den vägen är medvetet INTE `_detalj`-avstängd (att tappa alfan är
// en bugg, att tappa volym bara kosmetik), och alfan läggs lika på topp och botten så
// ytan inte råkar tona bort mot betraktaren.
//
// Ärver cachen (per färgpar) från den fyllning den routar till — en scen som monteras gör
// alltså noll nya texturbakningar efter första gången.
export function groundFill(color, opts = {}) {
  const { light = 0.14, dark = 0.28, alpha = 1 } = opts
  const top = tint(color, light)
  const bottom = shade(color, dark)
  return alpha < 1 ? verticalFillAlpha(top, bottom, alpha, alpha) : verticalFill(top, bottom)
}

// Samma som verticalFill, men toningen bär sin egen GENOMSKINLIGHET.
//
// Bakgrunden: `.fill({ color, alpha })` och `.fill(gradient)` utesluter varandra — det går
// inte att ge en gradientfyllning ett alpha-värde. Ytor som behöver BÅDA (badvatten som
// Zacke ska synas nedsänkt i, en halvgenomskinlig hylla, en dis-remsa) tvingades därför
// välja: antingen genomskinlighet ELLER volym. Vägen runt ligger i STOPPEN — `addColorStop`
// kör dem genom `Color.toHexa()`, så '#rrggbbaa' är ett giltigt färgstopp och toningen kan
// bära alfan själv. Alfa anges 0..1 och gäller topp respektive botten.
//
// Cachad per färg+alfa-par som resten av filen: en anropare som ritar om varje bildruta
// bakar ändå noll nya texturer.
//
// MEDVETET UTAN `_detalj`-avstängning, till skillnad från alla andra fyllningar här. De
// andra får falla tillbaka på råfärgen på låg detaljnivå eftersom bara VOLYMEN går
// förlorad. Här bär toningen även genomskinligheten, så en råfärg skulle göra ytan HELT
// TÄCKANDE — badvattnet skulle dölja Zacke. Att tappa volym är kosmetiskt; att tappa
// alfan är en bugg.
const _vertACache = new Map()
export function verticalFillAlpha(top, bottom, alphaTop = 1, alphaBottom = 1) {
  const key = `${top}|${bottom}|${alphaTop}|${alphaBottom}`
  let g = _vertACache.get(key)
  if (g) return g
  const hex = (c, a) => `#${c.toString(16).padStart(6, '0')}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')}`
  g = new FillGradient({
    colorStops: [
      { offset: 0, color: hex(top, alphaTop) },
      { offset: 1, color: hex(bottom, alphaBottom) },
    ],
  })
  _vertACache.set(key, g)
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
