// SKAFFERIET — allt som går att plocka fram ur kökets luckor och mata pappa med.
//
// Ingen ny matritning görs här. De två matspelen bär redan 128 färdiga föremål i sidoprofil
// (`hamburgerbygget/ingredienser.js` 63 st med svenska namn och bredder, `pizzabageriet/
// ingredienser.js` 65 st), inklusive hela busregistret — bajs, strumpa, spindel, snigel,
// tandborste, kackerlacka, kalsonger, mask, disksvamp, groda, mögelost. Att rita om dem hade
// varit att bygga samma sak en tredje gång.
//
// Det som DÄRUTÖVER behövdes står i ägarens egen lista och fanns ingenstans: kastruller,
// stekpannor, fat, glas med vätska, muggar, bestick, köksredskap. De ritas längst ner, i
// samma stil som de andra två filerna (sidoprofil kring (0,0), platta fyllningar, egen
// kontur på allt ljusare än ~0xf0e8d8 så det inte försvinner mot en ljus lucka).
//
// ⚠️ `farg` är INTE dekoration. Den bär geggan när något kastas i ansiktet och smulorna när
//    något tuggas — en sak utan färg blir en grå klick. Den kan inte läsas ur ritningen
//    (att baka en textur för att sampla den är förbjudet i det här repot), så den står här.
import { Container, Graphics } from 'pixi.js'
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
const R = (id, sv, farg, rita, bredd = 96, min = 'aj', mtrl = 'metall') =>
  ({ id, sv, farg, min, atbar: false, mtrl, rita: () => passa(rita(), bredd) })

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
    g.roundRect(-46, -14, 92, 56, 10).fill(STAL_M).stroke({ width: 4, color: MORK })
    g.roundRect(-40, -8, 26, 40, 8).fill({ color: 0xffffff, alpha: 0.22 })
    g.ellipse(0, -14, 50, 13).fill(STAL).stroke({ width: 4, color: MORK })
    g.roundRect(44, -2, 34, 9, 4).fill(MORK)
    g.roundRect(-78, -2, 34, 9, 4).fill(MORK)
    g.circle(0, -20, 9).fill(MORK)
    return g
  },
  stekpanna: () => {
    const g = G()
    g.roundRect(28, -6, 62, 11, 5).fill(MORK)
    g.ellipse(0, 0, 44, 18).fill(MORK).stroke({ width: 4, color: 0x2b3239 })
    g.ellipse(0, -3, 34, 12).fill(0x5e6a75)
    g.ellipse(-12, -6, 12, 4).fill({ color: 0xffffff, alpha: 0.22 })
    return g
  },
  fat: () => {
    const g = G()
    g.ellipse(0, 0, 54, 19).fill(0xf3f6f7).stroke({ width: 4, color: 0xb9c5cb })
    g.ellipse(0, -2, 38, 12).fill(0xffffff).stroke({ width: 3, color: 0xd3dade })
    g.ellipse(-16, -5, 12, 4).fill({ color: 0xffffff, alpha: 0.9 })
    return g
  },
  mugg: () => {
    const g = G()
    g.roundRect(-26, -26, 52, 54, 8).fill(0xff8f5a).stroke({ width: 4, color: 0xd66a3a })
    g.ellipse(0, -26, 26, 8).fill(0xffb187).stroke({ width: 3, color: 0xd66a3a })
    g.circle(38, -2, 15).stroke({ width: 8, color: 0xff8f5a })
    g.circle(38, -2, 15).stroke({ width: 3, color: 0xd66a3a, alpha: 0.6 })
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
      .fill(0xff9c3a)
    g.ellipse(0, -12, 19, 5).fill(0xffc27a)
    g.roundRect(-14, -26, 7, 48, 3).fill({ color: 0xffffff, alpha: 0.45 })
    return g
  },
  mjolk: () => {
    const g = G()
    g.moveTo(-24, -18).lineTo(0, -38).lineTo(24, -18).lineTo(24, 34).lineTo(-24, 34).closePath()
      .fill(0xf7fbfd).stroke({ width: 4, color: 0xb9c5cb })
    g.roundRect(-24, -6, 48, 22, 3).fill(0x5ab7e8)
    g.circle(0, 5, 8).fill(0xf7fbfd)
    g.moveTo(-8, 2).quadraticCurveTo(0, 12, 8, 2).stroke({ width: 3, color: 0x5ab7e8, cap: 'round' })
    return g
  },
  gaffel: () => {
    const g = G()
    skaft(g, 0, 34, 0, -2)
    for (const x of [-11, -4, 4, 11]) {
      g.moveTo(x, -2).lineTo(x, -34).stroke({ width: 5, color: STAL, cap: 'round' })
    }
    g.roundRect(-13, -8, 26, 12, 5).fill(STAL)
    return g
  },
  sked: () => {
    const g = G()
    skaft(g, 0, 34, 0, -8)
    g.ellipse(0, -24, 15, 20).fill(STAL).stroke({ width: 3, color: STAL_M })
    g.ellipse(-4, -28, 6, 8).fill({ color: 0xffffff, alpha: 0.7 })
    return g
  },
  kniv: () => {
    const g = G()
    skaft(g, 0, 34, 0, 4)
    g.moveTo(-11, 4).lineTo(11, 0).lineTo(9, -34).quadraticCurveTo(0, -40, -11, -30).closePath()
      .fill(STAL).stroke({ width: 3, color: STAL_M })
    g.moveTo(-6, -2).lineTo(-5, -28).stroke({ width: 3, color: 0xffffff, alpha: 0.7 })
    return g
  },
  slev: () => {
    const g = G()
    skaft(g, 4, -34, 0, 12)
    g.circle(0, 26, 20).fill(STAL).stroke({ width: 4, color: STAL_M })
    g.circle(-6, 20, 8).fill({ color: 0xffffff, alpha: 0.6 })
    return g
  },
  visp: () => {
    const g = G()
    skaft(g, 0, -36, 0, -4)
    for (const s of [-1, -0.45, 0.45, 1]) {
      g.moveTo(0, -6).quadraticCurveTo(18 * s, 8, 0, 34)
        .stroke({ width: 4, color: STAL_M, cap: 'round' })
    }
    g.roundRect(-9, -10, 18, 10, 4).fill(STAL_M)
    return g
  },
  kavel: () => {
    const g = G()
    g.roundRect(-34, -11, 68, 22, 10).fill(0xe0ac72).stroke({ width: 4, color: 0xa9713c })
    g.roundRect(34, -5, 24, 10, 5).fill(0xc98a4e)
    g.roundRect(-58, -5, 24, 10, 5).fill(0xc98a4e)
    g.roundRect(-26, -7, 30, 6, 3).fill({ color: 0xffffff, alpha: 0.3 })
    return g
  },
  glasspinne: () => {
    const g = G()
    g.roundRect(-6, 10, 12, 34, 5).fill(0xd9b070)
    g.roundRect(-22, -36, 44, 52, 16).fill(0xffb0c8).stroke({ width: 4, color: 0xe07a9c })
    g.roundRect(-22, -36, 44, 16, 12).fill({ color: 0xffffff, alpha: 0.35 })
    for (const [x, y] of [[-9, -18], [7, -8], [-3, 2]]) g.circle(x, y, 3.5).fill(0xfff0a0)
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
].map((s) => [s.id, s]))

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
