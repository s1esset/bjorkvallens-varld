// SKAFFERIET — allt som går att plocka fram ur kökets luckor och mata pappa med.
//
// Ingen ny matritning görs här. De två matspelen bär redan 128 färdiga föremål i sidoprofil
// (`hamburgerbygget/ingredienser.js` 63 st med svenska namn och bredder, `pizzabageriet/
// ingredienser.js` 65 st), inklusive hela busregistret — bajs, strumpa, spindel, snigel,
// tandborste, kackerlacka, kalsonger, mask, disksvamp, groda, mögelost. Att rita om dem hade
// varit att bygga samma sak en tredje gång.
//
// Det som DÄRUTÖVER behövdes står i ägarens egen lista och fanns ingenstans: kastruller,
// stekpannor, fat, glas med vätska, muggar, bestick, köksredskap — och en handfull saker som
// inte fanns i någon av matfilerna (glasstrut, räka, paj, popcorn, pepparkaka, saltgurka,
// senap, sylta, ketchup, leksaksbil). De ritas längst ner, i samma stil som de andra två
// filerna (sidoprofil kring (0,0), egen kontur på allt ljusare än ~0xf0e8d8 så det inte
// försvinner mot en ljus lucka). Volymen kommer från `lib/form.js`-fyllningarna — ett klot
// i stället för en skiva, ett rör i stället för ett streck — aldrig från egna gradienter.
//
// ⚠️ `farg` är INTE dekoration. Den bär geggan när något kastas i ansiktet och smulorna när
//    något tuggas — en sak utan färg blir en grå klick. Den kan inte läsas ur ritningen
//    (att baka en textur för att sampla den är förbjudet i det här repot), så den står här.
import { Container, Graphics } from 'pixi.js'
import { sphereFill, topLightFill, cylinderFill, rimLight } from '../../lib/form.js'
import { ITEMS, makeItemView } from '../hamburgerbygget/ingredienser.js'
import PIZZA from '../pizzabageriet/ingredienser.js'

const G = () => new Graphics()
const BURGARE = new Map(ITEMS.map((i) => [i.id, i]))

// Centrera den RITADE massan kring (0,0) och skala till önskad bredd. Samma sak som
// `makeItemView` gör, fast för en ritning som inte har en deklarerad bredd.
function passa(g, bredd) {
  const b = g.getLocalBounds()
  g.pivot.set(b.x + b.width / 2, b.y + b.height / 2)
  if (b.width > 0) g.scale.set(bredd / b.width)
  return g
}

// `min` = grimasen saken framkallar. `atbar: false` = pappa spottar ut den och magen fylls
// INTE. Det är hela busets mekanik: att mata pappa en gaffel eller en spindel ska ge en stor
// reaktion, men aldrig föra spelaren närmare målet — och aldrig heller längre bort, för
// tallriken fyller på sig själv (P0: inget misslyckande som avslutar eller nollställer).
const B = (id, sv, farg, min = 'lycksalig', atbar = true, bredd = 96) =>
  ({ id, sv, farg, min, atbar, rita: () => makeItemView(BURGARE.get(id), bredd) })
const P = (id, sv, farg, min = 'lycksalig', atbar = true, bredd = 92) =>
  ({ id, sv, farg, min, atbar, rita: () => passa(PIZZA[id](), bredd) })
// `mtrl` = materialets RÖST och studs när saken landar på bänken (lib/physics.js
// MATERIAL). En kastrull ska klinga och en tomat duns — utan det låter hela högen som
// samma sak, och då är kollisionen bara en rörelse.
// `hard: true` — saken KLADDAR inte. En gaffel som fastnar i ansiktet ska sitta fast i en
// vinkel, inte ligga i en pöl av sig själv; en tomat ska göra tvärtom. Köksprylarna är
// hårda som grupp, och de få busdjur som också är det står i `HARDA` nedan.
const R = (id, sv, farg, rita, bredd = 96, min = 'aj', mtrl = 'metall') =>
  ({ id, sv, farg, min, atbar: false, mtrl, hard: true, rita: () => passa(rita(), bredd) })
// Nyritade saker med hela flaggsatsen utskriven — som `R` fast ätbarheten och materialet
// väljs fritt (`R` är låst till oätlig metall). `hard` sätts via `HARDA`-setet nedan,
// precis som för busdjuren.
const NY = (id, sv, farg, rita, bredd, min, atbar, mtrl) =>
  ({ id, sv, farg, min, atbar, mtrl, rita: () => passa(rita(), bredd) })

// Busdjur och torra saker som inte heller kladdar. Allt ANNAT (mat, bajs, snor, svamp)
// gör det — förvalet är kladd, för det är den vanligaste sanningen i det här spelet.
// Ketchupflaskan och leksaksbilen hör hit: hård plast respektive leksak, ingen gegga.
const HARDA = new Set([
  'spindel', 'kackerlacka', 'fiskben', 'tandborste', 'snigel', 'groda',
  'ketchup', 'leksaksbil',
])

// ------------------------------------------------------------- köksprylarna ---

const STAL = 0xd3dade
const STAL_M = 0x9aa6ac
const MORK = 0x3f4a52

// Ett skaft med grepp — delas av slev, visp och stekspade.
function skaft(g, x0, y0, x1, y1, farg = MORK) {
  g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 9, color: farg, cap: 'round' })
  g.moveTo(x1 - (x1 - x0) * 0.28, y1 - (y1 - y0) * 0.28).lineTo(x1, y1)
    .stroke({ width: 13, color: 0x5c6b76, cap: 'round' })
}

const PRYLAR = {
  kastrull: () => {
    const g = G()
    g.roundRect(-46, -14, 92, 56, 10).fill(cylinderFill(STAL_M)).stroke({ width: 4, color: MORK })
    g.roundRect(-40, -8, 26, 40, 8).fill({ color: 0xffffff, alpha: 0.22 })
    g.ellipse(0, -14, 50, 13).fill(topLightFill(STAL)).stroke({ width: 4, color: MORK })
    g.roundRect(44, -2, 34, 9, 4).fill(cylinderFill(MORK, { axis: 'x' }))
    g.roundRect(-78, -2, 34, 9, 4).fill(cylinderFill(MORK, { axis: 'x' }))
    // nitar där handtagen fäster
    g.circle(44.5, 2.5, 2.5).fill(STAL)
    g.circle(-44.5, 2.5, 2.5).fill(STAL)
    g.circle(0, -20, 9).fill(sphereFill(MORK))
    return g
  },
  stekpanna: () => {
    const g = G()
    g.roundRect(28, -6, 62, 11, 5).fill(cylinderFill(MORK, { axis: 'x' }))
    g.ellipse(0, 0, 44, 18).fill(topLightFill(MORK)).stroke({ width: 4, color: 0x2b3239 })
    g.ellipse(0, -3, 34, 12).fill(sphereFill(0x5e6a75, { lightX: 0.4, lightY: 0.25 }))
    g.ellipse(-12, -6, 12, 4).fill({ color: 0xffffff, alpha: 0.22 })
    g.circle(47, -0.5, 2.8).fill(STAL_M) // nit vid handtagets fäste
    return g
  },
  fat: () => {
    const g = G()
    g.ellipse(0, 0, 54, 19).fill(topLightFill(0xf3f6f7)).stroke({ width: 4, color: 0xb9c5cb })
    g.ellipse(0, -1, 46, 15).stroke({ width: 3, color: 0x7fc4e8, alpha: 0.8 }) // dekorring
    g.ellipse(0, -2, 38, 12).fill(0xffffff).stroke({ width: 3, color: 0xd3dade })
    g.ellipse(-16, -5, 12, 4).fill({ color: 0xffffff, alpha: 0.9 })
    return g
  },
  mugg: () => {
    const g = G()
    g.roundRect(-26, -26, 52, 54, 8).fill(cylinderFill(0xff8f5a)).stroke({ width: 4, color: 0xd66a3a })
    g.ellipse(0, -26, 26, 8).fill(0xffb187).stroke({ width: 3, color: 0xd66a3a })
    g.circle(38, -2, 15).stroke({ width: 8, color: 0xff8f5a })
    g.circle(38, -2, 15).stroke({ width: 3, color: 0xd66a3a, alpha: 0.6 })
    // prick-dekor som på en riktig barnmugg
    for (const [x, y] of [[-8, -8], [6, 2], [-4, 14]]) {
      g.circle(x, y, 3).fill({ color: 0xffffff, alpha: 0.5 })
    }
    g.roundRect(-19, -18, 9, 36, 4).fill({ color: 0xffffff, alpha: 0.3 })
    return g
  },
  // Glaset med vätska — ägaren bad uttryckligen om "glas med vätskor". Ytan ritas som en
  // egen ellips så det läser som VÄTSKA i ett glas, inte som ett färgat glas.
  glas_saft: () => {
    const g = G()
    g.moveTo(-22, -32).lineTo(22, -32).lineTo(17, 30).lineTo(-17, 30).closePath()
      .fill({ color: 0xeaf6fb, alpha: 0.75 }).stroke({ width: 4, color: 0xa8c4d2 })
    g.moveTo(-19, -12).lineTo(19, -12).lineTo(17, 28).lineTo(-17, 28).closePath()
      .fill(topLightFill(0xff9c3a))
    g.ellipse(0, -12, 19, 5).fill(0xffc27a)
    // bubblor i saften
    for (const [x, y, r] of [[-8, 6, 2.5], [6, 14, 2], [1, -2, 1.8]]) {
      g.circle(x, y, r).fill({ color: 0xffffff, alpha: 0.5 })
    }
    g.roundRect(-14, -26, 7, 48, 3).fill({ color: 0xffffff, alpha: 0.45 })
    return g
  },
  mjolk: () => {
    const g = G()
    g.moveTo(-24, -18).lineTo(0, -38).lineTo(24, -18).lineTo(24, 34).lineTo(-24, 34).closePath()
      .fill(topLightFill(0xf7fbfd)).stroke({ width: 4, color: 0xb9c5cb })
    // ko-fläckar på paketet (tryck utan text)
    g.ellipse(-13, -12, 6, 4.5).fill({ color: 0x3f4a52, alpha: 0.85 })
    g.ellipse(-8, -10, 3, 2.5).fill({ color: 0x3f4a52, alpha: 0.85 })
    g.ellipse(14, 24, 7, 5).fill({ color: 0x3f4a52, alpha: 0.85 })
    g.ellipse(9, 27, 3.5, 2.5).fill({ color: 0x3f4a52, alpha: 0.85 })
    g.roundRect(-24, -6, 48, 22, 3).fill(0x5ab7e8)
    g.circle(0, 5, 8).fill(0xf7fbfd)
    g.moveTo(-8, 2).quadraticCurveTo(0, 12, 8, 2).stroke({ width: 3, color: 0x5ab7e8, cap: 'round' })
    g.roundRect(-20, -14, 6, 26, 3).fill({ color: 0xffffff, alpha: 0.5 })
    return g
  },
  gaffel: () => {
    const g = G()
    skaft(g, 0, 34, 0, -2)
    for (const x of [-11, -4, 4, 11]) {
      g.moveTo(x, -2).lineTo(x, -34).stroke({ width: 5, color: STAL, cap: 'round' })
    }
    g.roundRect(-13, -8, 26, 12, 5).fill(cylinderFill(STAL))
    g.circle(0, 29, 2.2).fill(STAL) // nit i greppet
    g.ellipse(-6, -3, 3.5, 2).fill({ color: 0xffffff, alpha: 0.6 })
    return g
  },
  sked: () => {
    const g = G()
    skaft(g, 0, 34, 0, -8)
    g.circle(0, 29, 2.2).fill(STAL) // nit i greppet
    g.ellipse(0, -24, 15, 20).fill(sphereFill(STAL)).stroke({ width: 3, color: STAL_M })
    g.ellipse(-4, -28, 6, 8).fill({ color: 0xffffff, alpha: 0.7 })
    return g
  },
  kniv: () => {
    const g = G()
    skaft(g, 0, 34, 0, 4)
    g.circle(0, 29, 2.2).fill(STAL) // nit i greppet
    g.moveTo(-11, 4).lineTo(11, 0).lineTo(9, -34).quadraticCurveTo(0, -40, -11, -30).closePath()
      .fill(topLightFill(STAL)).stroke({ width: 3, color: STAL_M })
    g.moveTo(-6, -2).lineTo(-5, -28).stroke({ width: 3, color: 0xffffff, alpha: 0.7 })
    return g
  },
  slev: () => {
    const g = G()
    skaft(g, 4, -34, 0, 12)
    g.circle(0.6, 5, 2.2).fill(STAL) // nit i greppet
    g.circle(0, 26, 20).fill(sphereFill(STAL)).stroke({ width: 4, color: STAL_M })
    const rl = rimLight(20, { alpha: 0.55 })
    rl.position.set(0, 26)
    g.addChild(rl)
    return g
  },
  visp: () => {
    const g = G()
    skaft(g, 0, -36, 0, -4)
    for (const s of [-1, -0.45, 0.45, 1]) {
      g.moveTo(0, -6).quadraticCurveTo(18 * s, 8, 0, 34)
        .stroke({ width: 4, color: STAL_M, cap: 'round' })
    }
    g.roundRect(-9, -10, 18, 10, 4).fill(cylinderFill(STAL_M))
    g.circle(0, -5, 2.2).fill(MORK) // skruvnit i hylsan
    g.ellipse(-4, -7, 4, 2).fill({ color: 0xffffff, alpha: 0.5 })
    return g
  },
  kavel: () => {
    const g = G()
    g.roundRect(-34, -11, 68, 22, 10).fill(cylinderFill(0xe0ac72, { axis: 'x' }))
      .stroke({ width: 4, color: 0xa9713c })
    // ådring i träet + ett kvistöga
    g.moveTo(-24, -4).quadraticCurveTo(0, -7, 24, -3).stroke({ width: 2, color: 0xa9713c, alpha: 0.5 })
    g.moveTo(-26, 3).quadraticCurveTo(-2, 6, 26, 2).stroke({ width: 2, color: 0xa9713c, alpha: 0.4 })
    g.ellipse(-16, 0, 3, 5).stroke({ width: 2, color: 0xa9713c, alpha: 0.45 })
    g.roundRect(34, -5, 24, 10, 5).fill(cylinderFill(0xc98a4e, { axis: 'x' }))
    g.roundRect(-58, -5, 24, 10, 5).fill(cylinderFill(0xc98a4e, { axis: 'x' }))
    g.roundRect(-26, -7, 30, 6, 3).fill({ color: 0xffffff, alpha: 0.3 })
    return g
  },
  glasspinne: () => {
    const g = G()
    g.roundRect(-6, 10, 12, 34, 5).fill(cylinderFill(0xd9b070))
    g.roundRect(-22, -36, 44, 52, 16).fill(sphereFill(0xffb0c8, { spread: 0.75 }))
      .stroke({ width: 4, color: 0xe07a9c })
    g.roundRect(-22, -36, 44, 16, 12).fill({ color: 0xffffff, alpha: 0.35 })
    for (const [x, y] of [[-9, -18], [7, -8], [-3, 2], [10, -24]]) g.circle(x, y, 3.5).fill(0xfff0a0)
    return g
  },

  // ------------------------------------------------- nya saker ur luckorna ---
  // Ritade i samma sidoprofil-stil som prylarna ovan: egen silhuett kring (0,0),
  // volym via lib/form.js, kontur på allt ljust.

  glass: () => {
    const g = G()
    // våffelstrut
    g.moveTo(-26, -4).lineTo(26, -4).lineTo(0, 36).closePath()
      .fill(topLightFill(0xe0a25a)).stroke({ width: 4, color: 0xa9713c })
    // rutmönster
    g.moveTo(-19, 2).lineTo(10, 18).stroke({ width: 2.5, color: 0xa9713c, alpha: 0.7 })
    g.moveTo(-12, 14).lineTo(3, 29).stroke({ width: 2.5, color: 0xa9713c, alpha: 0.7 })
    g.moveTo(19, 2).lineTo(-10, 18).stroke({ width: 2.5, color: 0xa9713c, alpha: 0.7 })
    g.moveTo(12, 14).lineTo(-3, 29).stroke({ width: 2.5, color: 0xa9713c, alpha: 0.7 })
    // kula
    g.circle(0, -20, 23).fill(sphereFill(0xffb0c8)).stroke({ width: 4, color: 0xe07a9c })
    const rl = rimLight(23, { alpha: 0.5 })
    rl.position.set(0, -20)
    g.addChild(rl)
    // körsbär med skaft
    g.moveTo(6, -49).quadraticCurveTo(8, -56, 14, -58).stroke({ width: 3, color: 0x6b4226, cap: 'round' })
    g.circle(6, -44, 6.5).fill(sphereFill(0xd8402c)).stroke({ width: 3, color: 0xa02a1e })
    return g
  },
  raka: () => {
    const g = G()
    // stjärtfläkt
    g.moveTo(-27, 10).lineTo(-43, 2).lineTo(-39, 15).closePath()
      .fill(0xffb5a5).stroke({ width: 3, color: 0xd86a58 })
    g.moveTo(-27, 10).lineTo(-44, 14).lineTo(-35, 23).closePath()
      .fill(0xffb5a5).stroke({ width: 3, color: 0xd86a58 })
    // böjd rygg — ett band mellan två bågar
    g.moveTo(-30, 8)
      .arc(0, 8, 30, Math.PI, 0, true)
      .arc(0, 8, 15, 0, Math.PI, true)
      .closePath()
      .fill(sphereFill(0xff9a8a, { lightY: 0.2 })).stroke({ width: 4, color: 0xd86a58 })
    // segment tvärs över ryggen
    for (const a of [-2.25, -1.85, -1.45, -1.05]) {
      const c = Math.cos(a), s = Math.sin(a)
      g.moveTo(16 * c, 8 + 16 * s).lineTo(29 * c, 8 + 29 * s)
        .stroke({ width: 3, color: 0xd86a58, alpha: 0.6 })
    }
    g.ellipse(-8, -14, 5, 3).fill({ color: 0xffffff, alpha: 0.5 })
    // huvud med ögon, antenner och små ben
    g.circle(28, 14, 13).fill(sphereFill(0xff9a8a)).stroke({ width: 3, color: 0xd86a58 })
    g.moveTo(36, 6).quadraticCurveTo(46, 10, 48, 20).stroke({ width: 2, color: 0xd86a58, cap: 'round' })
    g.moveTo(36, 9).quadraticCurveTo(44, 16, 44, 26).stroke({ width: 2, color: 0xd86a58, cap: 'round' })
    for (const x of [18, 24, 30]) {
      g.moveTo(x, 24).lineTo(x - 3, 31).stroke({ width: 2.5, color: 0xd86a58, cap: 'round' })
    }
    g.circle(32, 10, 2.6).fill(0x3a2430)
    g.circle(31.2, 9.2, 0.9).fill(0xffffff)
    return g
  },
  ketchup: () => {
    const g = G()
    // vit kork + hals
    g.roundRect(-11, -40, 22, 10, 4).fill(topLightFill(0xf3f6f7)).stroke({ width: 3, color: 0xb9c5cb })
    g.roundRect(-9, -32, 18, 10, 3).fill(0xc23a28)
    // mjuk flaskkropp
    g.roundRect(-20, -24, 40, 58, 14).fill(cylinderFill(0xd8402c)).stroke({ width: 4, color: 0xa02a1e })
    // tomat-emblem (ingen text)
    g.circle(0, 8, 12).fill(0xf7ecd8).stroke({ width: 3, color: 0xb08f6a })
    g.circle(0, 9, 6).fill(sphereFill(0xe23b30))
    g.ellipse(-2, 3.5, 3, 1.5).fill(0x5aa832)
    g.ellipse(2, 3.5, 3, 1.5).fill(0x5aa832)
    g.roundRect(-14, -18, 6, 40, 3).fill({ color: 0xffffff, alpha: 0.3 })
    return g
  },
  paj: () => {
    const g = G()
    // pajform
    g.moveTo(-44, -4).lineTo(44, -4).lineTo(34, 24).lineTo(-34, 24).closePath()
      .fill(topLightFill(0xb5733a)).stroke({ width: 4, color: 0x8a5a30 })
    // bärfyllning som skymtar mellan form och lock
    g.ellipse(0, -6, 41, 11).fill(0x8f2f4a)
    g.circle(-18, -8, 3).fill(0x6d1f38)
    g.circle(12, -5, 3).fill(0x6d1f38)
    // gyllene lock med veckad kant
    g.ellipse(0, -14, 40, 13).fill(topLightFill(0xe8b05a)).stroke({ width: 4, color: 0xa9713c })
    for (const [x, y] of [[-36, -18], [-24, -23], [-8, -25], [8, -25], [24, -23], [36, -18]]) {
      g.circle(x, y, 3.5).fill(topLightFill(0xe8b05a)).stroke({ width: 2, color: 0xa9713c })
    }
    // rutnätslock
    g.moveTo(-30, -22).lineTo(-14, -4).stroke({ width: 3.5, color: 0xa9713c, alpha: 0.8 })
    g.moveTo(-8, -26).lineTo(10, -3).stroke({ width: 3.5, color: 0xa9713c, alpha: 0.8 })
    g.moveTo(16, -24).lineTo(30, -6).stroke({ width: 3.5, color: 0xa9713c, alpha: 0.8 })
    g.moveTo(30, -22).lineTo(14, -4).stroke({ width: 3.5, color: 0xa9713c, alpha: 0.8 })
    g.moveTo(8, -26).lineTo(-10, -3).stroke({ width: 3.5, color: 0xa9713c, alpha: 0.8 })
    g.moveTo(-16, -24).lineTo(-30, -6).stroke({ width: 3.5, color: 0xa9713c, alpha: 0.8 })
    g.ellipse(-14, -19, 8, 3).fill({ color: 0xffffff, alpha: 0.35 })
    return g
  },
  popcorn: () => {
    const g = G()
    // randig bägare
    g.moveTo(-24, -8).lineTo(24, -8).lineTo(18, 34).lineTo(-18, 34).closePath()
      .fill(topLightFill(0xf3f6f7)).stroke({ width: 4, color: 0xc94f43 })
    for (const t of [-0.6, 0, 0.6]) {
      g.moveTo(24 * t - 4, -6).lineTo(24 * t + 4, -6).lineTo(18 * t + 3, 31).lineTo(18 * t - 3, 31)
        .closePath().fill({ color: 0xd8402c, alpha: 0.9 })
    }
    // popcornmoln — varje puff ett eget litet klot
    for (const [x, y, r] of [[-16, -13, 9], [16, -13, 9], [-8, -22, 10], [9, -21, 10], [0, -13, 11], [1, -31, 8]]) {
      g.circle(x, y, r).fill(sphereFill(0xfff0d8)).stroke({ width: 3, color: 0xd8b06a })
    }
    // smörgula toner
    g.circle(-4, -18, 3).fill({ color: 0xf6d24a, alpha: 0.6 })
    g.circle(9, -26, 2.5).fill({ color: 0xf6d24a, alpha: 0.6 })
    return g
  },
  pepparkaka: () => {
    const g = G()
    const brun = 0x9a6535
    // armar och ben
    g.moveTo(-8, -8).lineTo(-26, 0).stroke({ width: 15, color: brun, cap: 'round' })
    g.moveTo(8, -8).lineTo(26, 0).stroke({ width: 15, color: brun, cap: 'round' })
    g.moveTo(-6, 14).lineTo(-14, 34).stroke({ width: 16, color: brun, cap: 'round' })
    g.moveTo(6, 14).lineTo(14, 34).stroke({ width: 16, color: brun, cap: 'round' })
    // kropp + huvud
    g.roundRect(-16, -14, 32, 34, 14).fill(topLightFill(brun)).stroke({ width: 3, color: 0x7a4b24 })
    g.circle(0, -28, 15).fill(sphereFill(brun)).stroke({ width: 3, color: 0x7a4b24 })
    // kristyr vid händer och fötter
    g.moveTo(-27, -4).lineTo(-24, -1).lineTo(-21, -5).stroke({ width: 2.5, color: 0xffffff, cap: 'round' })
    g.moveTo(21, -5).lineTo(24, -1).lineTo(27, -4).stroke({ width: 2.5, color: 0xffffff, cap: 'round' })
    g.moveTo(-18, 31).lineTo(-14, 34).lineTo(-10, 30).stroke({ width: 2.5, color: 0xffffff, cap: 'round' })
    g.moveTo(10, 30).lineTo(14, 34).lineTo(18, 31).stroke({ width: 2.5, color: 0xffffff, cap: 'round' })
    // ansikte + tre knappar
    g.circle(-5, -31, 2.2).fill(0x3a2417)
    g.circle(5, -31, 2.2).fill(0x3a2417)
    g.moveTo(-5, -24).quadraticCurveTo(0, -20, 5, -24).stroke({ width: 2.5, color: 0xffffff, cap: 'round' })
    for (const y of [-6, 2, 10]) g.circle(0, y, 2.8).fill(0xffffff)
    return g
  },
  saltgurka: () => {
    const g = G()
    const gron = 0x5f8f3a
    const kant = 0x3e6326
    // knölar längs kanten — ritas först så kroppen täcker deras insida
    for (const [x, y] of [[-26, -13], [-8, -15], [12, -14], [28, -11], [-18, 13], [2, 15], [22, 13]]) {
      g.circle(x, y, 5).fill(gron).stroke({ width: 3, color: kant })
    }
    g.roundRect(-38, -14, 76, 28, 14).fill(cylinderFill(gron, { axis: 'x' })).stroke({ width: 4, color: kant })
    // prickar + blänk
    for (const [x, y] of [[-20, -2], [-4, 5], [14, -4], [26, 4], [6, -8]]) {
      g.circle(x, y, 1.6).fill({ color: 0x3e6326, alpha: 0.5 })
    }
    g.ellipse(-12, -6, 14, 4).fill({ color: 0xffffff, alpha: 0.3 })
    return g
  },
  senap: () => {
    const g = G()
    // axel + spetspip
    g.moveTo(-18, -8).lineTo(-6, -23).lineTo(6, -23).lineTo(18, -8).closePath()
      .fill(topLightFill(0xe8c22e)).stroke({ width: 3, color: 0xb08f18 })
    g.moveTo(-6, -22).lineTo(-2, -38).lineTo(2, -38).lineTo(6, -22).closePath()
      .fill(cylinderFill(0xd4ad20)).stroke({ width: 3, color: 0xb08f18 })
    g.roundRect(-3.5, -44, 7, 7, 2.5).fill(0xb08f18)
    g.roundRect(-8, -25, 16, 4, 2).fill(0xb08f18)
    // klämkropp
    g.roundRect(-22, -10, 44, 40, 10).fill(cylinderFill(0xe8c22e)).stroke({ width: 4, color: 0xb08f18 })
    g.roundRect(-15, -4, 7, 28, 3).fill({ color: 0xffffff, alpha: 0.35 })
    return g
  },
  sylta: () => {
    const g = G()
    // litet fat
    g.ellipse(0, 18, 40, 12).fill(topLightFill(0xf3f6f7)).stroke({ width: 3, color: 0xb9c5cb })
    g.ellipse(0, 16, 30, 8).stroke({ width: 2, color: 0xd3dade })
    // dallrig geléskiva — halvgenomskinlig, med en liten våg i toppen
    g.moveTo(-28, 14)
      .quadraticCurveTo(-32, -8, -18, -16)
      .quadraticCurveTo(-8, -22, 0, -18)
      .quadraticCurveTo(8, -22, 18, -16)
      .quadraticCurveTo(32, -8, 28, 14)
      .closePath()
      .fill({ color: 0xe89aa8, alpha: 0.78 }).stroke({ width: 4, color: 0xc86a80 })
    // bärnstenston som skymtar inuti
    g.ellipse(0, 2, 16, 10).fill({ color: 0xf0b268, alpha: 0.5 })
    g.ellipse(-10, -8, 8, 5).fill({ color: 0xffffff, alpha: 0.55 })
    return g
  },
  leksaksbil: () => {
    const g = G()
    // kaross med kupé
    g.moveTo(-40, 10).lineTo(-40, -2).quadraticCurveTo(-38, -8, -30, -8)
      .lineTo(-22, -8).quadraticCurveTo(-16, -24, 0, -24)
      .quadraticCurveTo(16, -24, 22, -8).lineTo(30, -8)
      .quadraticCurveTo(38, -8, 40, -2).lineTo(40, 10)
      .quadraticCurveTo(40, 14, 34, 14).lineTo(-34, 14)
      .quadraticCurveTo(-40, 14, -40, 10).closePath()
      .fill(topLightFill(0x4a90d9)).stroke({ width: 4, color: 0x2f6cab })
    // fönster
    g.moveTo(-14, -8).quadraticCurveTo(-10, -19, -2, -19).lineTo(-2, -8).closePath()
      .fill(0xcfeefb).stroke({ width: 2.5, color: 0x2f6cab })
    g.moveTo(2, -19).quadraticCurveTo(12, -19, 15, -8).lineTo(2, -8).closePath()
      .fill(0xcfeefb).stroke({ width: 2.5, color: 0x2f6cab })
    // strålkastare + blänk på huven
    g.circle(37, -1, 3).fill(0xf6d24a)
    g.ellipse(-28, -3, 7, 3).fill({ color: 0xffffff, alpha: 0.4 })
    // hjul med nav
    for (const x of [-22, 22]) {
      g.circle(x, 14, 11).fill(sphereFill(0x3f4a52)).stroke({ width: 3, color: 0x2b3239 })
      g.circle(x, 14, 4.5).fill(0xd3dade)
    }
    return g
  },
}

// ------------------------------------------------------------- katalogen ---

// Nyckel → { sv, farg, rita }. `sv` används i talad svenska (och måste därför finnas som
// literal i en `voice.say()` om den ska få ett röstklipp — se CLAUDE.md).
export const SAKER = Object.fromEntries([
  // --- riktig mat (hamburgerbyggets ritningar) ---
  B('ost', 'Ost', 0xffce4a, 'lycksalig'),
  B('agg', 'Ägg', 0xfff3d6, 'fundersam'),
  B('tomat', 'Tomat', 0xd8402c, 'fundersam'),
  B('gurka', 'Gurka', 0x6db83f, 'acklad'),
  B('korv', 'Korv', 0xc8563a, 'lycksalig'),
  B('sallad', 'Sallad', 0x5aa832, 'acklad'),
  B('kyckling', 'Kycklingklubba', 0xd9a05b, 'lycksalig'),
  B('pommes', 'Pommes', 0xf6c445, 'lycksalig'),
  B('pizza', 'Pizza', 0xe8a34a, 'lycksalig'),
  B('potatis', 'Potatis', 0xd6b06a, 'fundersam'),
  B('kringla', 'Kringla', 0xb5733a, 'lycksalig'),
  B('munk', 'Munk', 0xf2a9c4, 'lycksalig'),
  B('choklad', 'Choklad', 0x6b4226, 'lycksalig'),
  B('godis', 'Godis', 0xff7bb0, 'skratt'),
  B('jordgubbe', 'Jordgubbe', 0xe23b4f, 'lycksalig'),
  B('banan', 'Banan', 0xf7d548, 'lycksalig'),
  B('is', 'Isbit', 0xcfeefb, 'het'),
  B('smor', 'Smör', 0xffe08a, 'fundersam'),
  B('honung', 'Honung', 0xffb937, 'lycksalig'),
  B('oliv', 'Oliv', 0x4a5b2a, 'sur'),
  B('kaka', 'Kaka', 0xc98a4e, 'lycksalig'),
  B('bacon', 'Bacon', 0xd66a5a, 'lycksalig'),
  // --- pizzabageriets extrahyllor ---
  P('jordnot', 'Jordnöt', 0xd6a86a, 'fundersam'),
  P('kastanj', 'Kastanj', 0x8a5a30, 'fundersam'),
  P('druvor', 'Vindruvor', 0x8f6fd0, 'lycksalig'),
  P('mango', 'Mango', 0xf7a13a, 'lycksalig'),
  // --- äckligt: går att svälja, men blää ---
  P('mogelost', 'Mögelost', 0xcfd8b0, 'acklad'),
  // --- bus: samma ritningar, annan avsikt. Spottas ut, mättar inte. ---
  B('bajs', 'Bajs', 0x8a5a30, 'acklad', false),
  B('strumpa', 'Strumpa', 0xd8dde2, 'acklad', false),
  B('kalsonger', 'Kalsonger', 0x7fc4e8, 'skratt', false),
  B('tandborste', 'Tandborste', 0x54b8e0, 'forvanad', false),
  B('disksvamp', 'Disksvamp', 0xf6d24a, 'acklad', false),
  B('kackerlacka', 'Kackerlacka', 0x6b4a2c, 'aj', false),
  B('spindel', 'Spindel', 0x3f3a36, 'aj', false),
  B('snigel', 'Snigel', 0xd8b06a, 'acklad', false),
  B('groda', 'Groda', 0x6fbf5a, 'forvanad', false),
  B('blackfisk', 'Bläckfisk', 0xc86aa8, 'acklad', false),
  B('mask', 'Larv', 0xf2a9a0, 'acklad', false),
  B('toapapper', 'Toapapper', 0xf3f6f7, 'skratt', false),
  P('snor', 'Snor', 0x9fd6a8, 'acklad', false),
  P('fiskben', 'Fiskben', 0xe8e0cc, 'aj', false),
  // --- köksprylarna (ritade här). Alla oätliga: en gaffel mättar ingen. ---
  R('kastrull', 'Kastrull', 0x9aa6ac, PRYLAR.kastrull, 104, 'forvanad'),
  R('stekpanna', 'Stekpanna', 0x4b5560, PRYLAR.stekpanna, 110, 'forvanad'),
  R('fat', 'Fat', 0xf3f6f7, PRYLAR.fat, 100, 'forvanad'),
  R('mugg', 'Mugg', 0xff8f5a, PRYLAR.mugg, 92, 'fundersam'),
  R('glas_saft', 'Glas med saft', 0xff9c3a, PRYLAR.glas_saft, 74, 'lycksalig', 'glas'),
  R('mjolk', 'Mjölkpaket', 0xf7fbfd, PRYLAR.mjolk, 76, 'lycksalig', 'tra'),
  R('gaffel', 'Gaffel', 0xd3dade, PRYLAR.gaffel, 52, 'aj'),
  R('sked', 'Sked', 0xd3dade, PRYLAR.sked, 52, 'forvanad'),
  R('kniv', 'Kniv', 0xd3dade, PRYLAR.kniv, 52, 'aj'),
  R('slev', 'Slev', 0xd3dade, PRYLAR.slev, 60, 'forvanad'),
  R('visp', 'Visp', 0xd3dade, PRYLAR.visp, 64, 'skratt'),
  R('kavel', 'Kavel', 0xe0ac72, PRYLAR.kavel, 100, 'forvanad', 'tra'),
  R('glasspinne', 'Glasspinne', 0xffb0c8, PRYLAR.glasspinne, 64, 'lycksalig'),
  // --- nya luckfynd (ritade här). Senapen är STARK med flit: `het` triggar samma
  //     rodnad som chilin. Ketchupflaskan och leksaksbilen är bus — hårda, mättar inte. ---
  NY('glass', 'Glasstrut', 0xffb0c8, PRYLAR.glass, 72, 'lycksalig', true, 'tra'),
  NY('raka', 'Räka', 0xff9a8a, PRYLAR.raka, 84, 'fundersam', true, 'tra'),
  NY('ketchup', 'Ketchupflaska', 0xd8402c, PRYLAR.ketchup, 66, 'forvanad', false, 'glas'),
  NY('paj', 'Paj', 0xd9a05b, PRYLAR.paj, 96, 'lycksalig', true, 'tra'),
  NY('popcorn', 'Popcorn', 0xf6d24a, PRYLAR.popcorn, 76, 'skratt', true, 'tra'),
  NY('pepparkaka', 'Pepparkaka', 0x9a6535, PRYLAR.pepparkaka, 72, 'lycksalig', true, 'tra'),
  NY('saltgurka', 'Saltgurka', 0x5f8f3a, PRYLAR.saltgurka, 92, 'acklad', true, 'tra'),
  NY('senap', 'Senapsflaska', 0xe8c22e, PRYLAR.senap, 62, 'het', true, 'glas'),
  NY('sylta', 'Sylta', 0xe89aa8, PRYLAR.sylta, 84, 'forvanad', true, 'tra'),
  NY('leksaksbil', 'Leksaksbil', 0x4a90d9, PRYLAR.leksaksbil, 92, 'forvanad', false, 'tra'),
].map((s) => [s.id, HARDA.has(s.id) ? { ...s, hard: true } : s]))

/** En vy för en sak, centrerad kring (0,0). Alltid en ny nod — de delas aldrig. */
export function makeSak(key) {
  const s = SAKER[key]
  if (!s) return G().circle(0, 0, 26).fill(0xcccccc) // syns om en nyckel stavats fel
  const c = new Container()
  c.eventMode = 'none'
  c.addChild(s.rita())
  return c
}

export function sakFarg(key) { return SAKER[key]?.farg ?? 0xd8b98a }
export function sakNamn(key) { return SAKER[key]?.sv ?? 'Något' }
export function sakMin(key) { return SAKER[key]?.min ?? 'fundersam' }
export function arAtbar(key) { return SAKER[key]?.atbar !== false }
export function sakMaterial(key) { return SAKER[key]?.mtrl ?? 'tra' }
