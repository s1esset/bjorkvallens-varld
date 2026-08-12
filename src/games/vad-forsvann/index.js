// Vad Försvann? — en lugn minneslek (3–5 år). Några gulliga saker studsar in,
// barnet tittar i lugn takt och trycker på en stor "Göm dem!"-knapp. En mjuk
// filt glider över sakerna, EN sak försvinner i smyg, och filten glider undan
// igen — en tom platshållare lyser där saken fanns. NU måste barnet komma ihåg
// VILKEN sak som försvann: en rad svarskort dyker upp nedtill (den borta saken +
// ett par "lurar" bland de som fortfarande syns). Barnet trycker på rätt kort →
// saken studsar tillbaka på sin plats, säger sitt namn, gnistror + beröm. Fel
// kort = lekfull vingel + mjukt ljud + ny mild ledtråd (ALDRIG ett "fel"); efter
// ett par försök (eller om barnet väntar) lyser rätt kort upp och väljs till slut
// så det aldrig kan misslyckas. Ingen poäng, ingen timer, inget slut. Allt ritas
// programmatiskt (Pixi Graphics + emoji).
// Uppgiftstypen varieras (_mode): 'gone' = en sak försvinner (grund), 'added' = en
// NY sak dyker upp bakom filten och barnet väljer vilken som är ny — samma
// kort-svarsmekanik, men bryter den strukturellt identiska rundan.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, wiggle, sparkle, breathe, ripple, kvittera, liv } from '../../lib/feedback.js'
import { Button } from '../../lib/Button.js'
import { COLORS, PRAISE } from '../../lib/theme.js'
import { verticalFill } from '../../lib/form.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

// Saker som slumpas per runda. Emoji-strängen är bara NYCKELN (NAMES/SAMPLES
// slår upp på den) — P0 ASSETS: allt RITAS av drawMotif(), aldrig en emoji på
// en bricka. Varje motiv centreras i (0,0) och håller sig inom ~±46 px.
const MOTIFS = ['🍎', '🐶', '⭐', '🚗', '🌸', '🧸', '🎈', '🍌', '🐱', '🦋', '🍓', '🎩', '🐸', '⚽', '🌈', '🍰']

function drawMotif(key) {
  const g = new Graphics()
  const star = (R, r, fill, line) => {
    const pts = []
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2
      const rr = k % 2 === 0 ? R : r
      pts.push(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    g.poly(pts).fill(fill).stroke({ width: 4, color: line })
  }
  switch (key) {
    case '🍎':
      g.circle(-11, 6, 25).fill(0xe0392b)
      g.circle(11, 6, 25).fill(0xe0392b)
      g.circle(0, 2, 26).fill(0xe0392b).stroke({ width: 4, color: 0xb02b20 })
      g.ellipse(-11, -6, 8, 11).fill({ color: 0xffffff, alpha: 0.35 })
      g.roundRect(-3, -32, 6, 14, 3).fill(0x6f4a2e)
      g.ellipse(14, -28, 13, 8).fill(0x5bbf6a).stroke({ width: 3, color: 0x3f8a44 })
      break
    case '🐶':
      g.ellipse(-30, -10, 11, 22).fill(0x9a5c33) // öron
      g.ellipse(30, -10, 11, 22).fill(0x9a5c33)
      g.circle(0, 0, 30).fill(0xc98a4b).stroke({ width: 4, color: 0x9a5c33 })
      g.ellipse(0, 14, 17, 13).fill(0xf0d7ae)
      g.circle(-11, -7, 4.5).fill(0x2b2b2b)
      g.circle(11, -7, 4.5).fill(0x2b2b2b)
      g.ellipse(0, 8, 7, 5).fill(0x2b2b2b)
      g.moveTo(0, 12).lineTo(0, 18).stroke({ width: 2.5, color: 0x6f4a2e })
      g.arc(-6, 18, 6, 0, Math.PI).arc(6, 18, 6, 0, Math.PI).stroke({ width: 2.5, color: 0x6f4a2e })
      break
    case '⭐':
      star(38, 16, 0xffd35c, 0xe0a94f)
      break
    case '🚗':
      g.roundRect(-42, -4, 84, 26, 10).fill(0x4aa3df).stroke({ width: 4, color: 0x2f7fb8 })
      g.moveTo(-26, -4).lineTo(-16, -26).lineTo(20, -26).lineTo(30, -4).closePath()
      g.fill(0x6ac0f0).stroke({ width: 4, color: 0x2f7fb8 })
      g.roundRect(-14, -22, 14, 16, 3).fill(0xd8f0ff)
      g.roundRect(4, -22, 14, 16, 3).fill(0xd8f0ff)
      g.circle(-22, 24, 11).fill(0x3a3a3a).stroke({ width: 3, color: 0x1c1c1c })
      g.circle(22, 24, 11).fill(0x3a3a3a).stroke({ width: 3, color: 0x1c1c1c })
      g.circle(-22, 24, 4).fill(0xc3ccd4)
      g.circle(22, 24, 4).fill(0xc3ccd4)
      break
    case '🌸':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        g.ellipse(Math.cos(a) * 22, Math.sin(a) * 22, 15, 15).fill(0xffb3d1).stroke({ width: 3, color: 0xe48ab4 })
      }
      g.circle(0, 0, 12).fill(0xffe08a).stroke({ width: 3, color: 0xe0a94f })
      break
    case '🧸':
      g.circle(-26, -24, 12).fill(0x9a5c33)
      g.circle(26, -24, 12).fill(0x9a5c33)
      g.ellipse(0, 22, 26, 22).fill(0xc98a4b).stroke({ width: 4, color: 0x9a5c33 })
      g.ellipse(0, 26, 15, 13).fill(0xf0d7ae)
      g.circle(-28, 16, 10).fill(0xc98a4b).stroke({ width: 3, color: 0x9a5c33 })
      g.circle(28, 16, 10).fill(0xc98a4b).stroke({ width: 3, color: 0x9a5c33 })
      g.circle(0, -14, 24).fill(0xc98a4b).stroke({ width: 4, color: 0x9a5c33 })
      g.ellipse(0, -6, 11, 9).fill(0xf0d7ae)
      g.circle(-9, -18, 4).fill(0x2b2b2b)
      g.circle(9, -18, 4).fill(0x2b2b2b)
      g.ellipse(0, -8, 5, 4).fill(0x4a3728)
      break
    case '🎈':
      g.moveTo(0, 22).quadraticCurveTo(-8, 34, 4, 44).stroke({ width: 3, color: 0x8a8a8a })
      g.ellipse(0, -8, 26, 31).fill(0xe0574f).stroke({ width: 4, color: 0xb03f3a })
      g.moveTo(-6, 22).lineTo(6, 22).lineTo(0, 30).closePath().fill(0xb03f3a)
      g.ellipse(-10, -16, 7, 10).fill({ color: 0xffffff, alpha: 0.45 })
      break
    case '🍌':
      g.moveTo(-34, -14).quadraticCurveTo(-6, 34, 34, 12).quadraticCurveTo(6, 22, -22, -18).closePath()
      g.fill(0xffd35c).stroke({ width: 4, color: 0xd9a52b })
      g.moveTo(-34, -14).lineTo(-38, -24).stroke({ width: 6, color: 0x8a6a2a, cap: 'round' })
      g.moveTo(34, 12).lineTo(40, 8).stroke({ width: 5, color: 0x8a6a2a, cap: 'round' })
      break
    case '🐱':
      g.moveTo(-28, -18).lineTo(-22, -44).lineTo(-6, -24).closePath().fill(0x9aa4b0).stroke({ width: 3, color: 0x74808e })
      g.moveTo(28, -18).lineTo(22, -44).lineTo(6, -24).closePath().fill(0x9aa4b0).stroke({ width: 3, color: 0x74808e })
      g.circle(0, 0, 29).fill(0xb6c0cc).stroke({ width: 4, color: 0x74808e })
      g.circle(-11, -5, 5).fill(0x2b2b2b)
      g.circle(11, -5, 5).fill(0x2b2b2b)
      g.moveTo(-4, 8).lineTo(0, 12).lineTo(4, 8).closePath().fill(0xff9d9d)
      g.arc(-5, 15, 5, 0, Math.PI).arc(5, 15, 5, 0, Math.PI).stroke({ width: 2.5, color: 0x74808e })
      for (const s of [-1, 1]) {
        g.moveTo(s * 14, 6).lineTo(s * 36, 2).moveTo(s * 14, 12).lineTo(s * 36, 14)
        g.stroke({ width: 2, color: 0x74808e })
      }
      break
    case '🦋':
      g.ellipse(-18, -12, 18, 21).fill(0xa78bfa).stroke({ width: 3, color: 0x6b4fc4 })
      g.ellipse(18, -12, 18, 21).fill(0xa78bfa).stroke({ width: 3, color: 0x6b4fc4 })
      g.ellipse(-15, 14, 14, 16).fill(0xc4b1ff).stroke({ width: 3, color: 0x6b4fc4 })
      g.ellipse(15, 14, 14, 16).fill(0xc4b1ff).stroke({ width: 3, color: 0x6b4fc4 })
      g.roundRect(-4, -22, 8, 44, 4).fill(0x4a3728)
      g.moveTo(-3, -22).quadraticCurveTo(-11, -36, -17, -33).stroke({ width: 3, color: 0x4a3728 })
      g.moveTo(3, -22).quadraticCurveTo(11, -36, 17, -33).stroke({ width: 3, color: 0x4a3728 })
      break
    case '🍓':
      g.moveTo(-26, -8).quadraticCurveTo(-30, 30, 0, 38).quadraticCurveTo(30, 30, 26, -8).closePath()
      g.fill(0xe0392b).stroke({ width: 4, color: 0xb02b20 })
      for (const [sx, sy] of [[-11, 4], [8, 0], [-3, 16], [13, 16], [-14, 24], [2, 28]]) g.ellipse(sx, sy, 2.4, 4).fill(0xffe08a)
      for (const dx of [-17, 0, 17]) g.ellipse(dx, -13, 12, 7).fill(0x5bbf6a).stroke({ width: 2.5, color: 0x3f8a44 })
      g.roundRect(-3, -30, 6, 14, 3).fill(0x3f8a44)
      break
    case '🎩':
      g.ellipse(0, 26, 46, 12).fill(0x3a3a4a).stroke({ width: 4, color: 0x1c1c28 })
      g.roundRect(-26, -34, 52, 60, 6).fill(0x4a4a5c).stroke({ width: 4, color: 0x1c1c28 })
      g.roundRect(-27, 8, 54, 14, 3).fill(0xe0392b)
      break
    case '🐸':
      g.circle(-18, -22, 14).fill(0x6fd07a).stroke({ width: 3, color: 0x3f8a44 })
      g.circle(18, -22, 14).fill(0x6fd07a).stroke({ width: 3, color: 0x3f8a44 })
      g.circle(-18, -22, 6).fill(0x2b2b2b)
      g.circle(18, -22, 6).fill(0x2b2b2b)
      g.ellipse(0, 8, 32, 26).fill(0x7ed06a).stroke({ width: 4, color: 0x3f8a44 })
      g.ellipse(0, 16, 20, 13).fill(0xdff3c4)
      g.arc(0, 4, 16, 0.1 * Math.PI, 0.9 * Math.PI).stroke({ width: 3.5, color: 0x3f8a44 })
      g.ellipse(-28, 28, 12, 7).fill(0x6fd07a).stroke({ width: 3, color: 0x3f8a44 })
      g.ellipse(28, 28, 12, 7).fill(0x6fd07a).stroke({ width: 3, color: 0x3f8a44 })
      break
    case '⚽':
      g.circle(0, 0, 34).fill(0xffffff).stroke({ width: 4, color: 0x3a3a3a })
      g.poly([0, -16, 15, -5, 9, 13, -9, 13, -15, -5]).fill(0x2b2b2b)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        g.circle(Math.cos(a) * 30, Math.sin(a) * 30, 7).fill(0x2b2b2b)
      }
      break
    case '🌈': {
      const cols = [0xe0392b, 0xff9d3d, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa]
      cols.forEach((c, i) => g.arc(0, 24, 42 - i * 6, Math.PI, 0).stroke({ width: 6, color: c }))
      g.circle(-40, 26, 11).fill(0xffffff)
      g.circle(40, 26, 11).fill(0xffffff)
      break
    }
    default: // 🍰
      g.moveTo(-32, 30).lineTo(-32, -6).lineTo(32, -6).lineTo(32, 30).closePath()
      g.fill(0xfff0d8).stroke({ width: 4, color: 0xe0c9a8 })
      g.roundRect(-32, 4, 64, 10, 2).fill(0xf7b9e4)
      g.moveTo(-34, -6).quadraticCurveTo(0, -22, 34, -6).lineTo(34, 2).quadraticCurveTo(0, -14, -34, 2).closePath()
      g.fill(0xffb3d1).stroke({ width: 3, color: 0xe48ab4 })
      g.circle(0, -22, 9).fill(0xe0392b).stroke({ width: 3, color: 0xb02b20 })
      g.roundRect(-2, -34, 4, 10, 2).fill(0x3f8a44)
      break
  }
  g.eventMode = 'none'
  return g
}

// Emoji -> svenskt ord (bestämd form) så rösten blir korrekt: "Det var ju äpplet!".
const NAMES = {
  '🍎': 'äpplet', '🐶': 'hunden', '⭐': 'stjärnan', '🚗': 'bilen', '🌸': 'blomman',
  '🧸': 'nallen', '🎈': 'ballongen', '🍌': 'bananen', '🐱': 'katten', '🦋': 'fjärilen',
  '🍓': 'jordgubben', '🎩': 'hatten', '🐸': 'grodan', '⚽': 'bollen', '🌈': 'regnbågen', '🍰': 'tårtan',
}

// Emoji -> ev. riktigt sak-läte (spelas ovanpå namn-TTS via audio.sample). Saknas
// klippet faller det tyst bort (sample() returnerar false) — helt ofarligt.
const SAMPLES = {
  '🐶': 'djur_hund', '🐱': 'djur_katt', '🐸': 'djur_groda', '🚗': 'bil_tut',
}

// RUMMET. `_plattprobe --medbakgrund` mätte spelet som appens plattaste: 809 744 px —
// 88 % av hela skärmen — i EN enda ton, och den tonen var skalets `COLORS.bg`. Orsaken
// var inte en platt yta utan en SAKNAD yta: spelet ritade ingen bakgrund alls, så sakerna
// svävade i ett cremetomrum utan rum, mark eller skala. Väggen nedan spänner OM den gamla
// bakgrunden (0xfdf6e3) — samma varma creme, bara med ljus i — så bilden är igenkännlig;
// det är rummet som tillkommit. Tonerna är cachade per färgpar (`verticalFill`), så en
// montering kostar NOLL texturbakningar; en obakad gradient per montering fäller sviten.
const C_WALL_TOP = 0xfffaf0
const C_WALL_BOT = 0xf1e3c5
const FLOOR_Y = 648 // horisont: under varje hyllplan, bakom svarskortens nedre halva
// Golvet ligger MEDVETET nära väggens ton. Ett första försök på 0xe7d0a6 läste som en gul
// rand tvärs över bilden i stället för som ett golv — kontrasten mot väggen gjorde bandet
// till ett föremål. Nu skiljer bara ett halvsteg, plus en tunn golvlist.
const C_FLOOR_TOP = 0xe9d8b8
const C_FLOOR_BOT = 0xdcc79c
const C_FLOOR_EDGE = 0xc2a97e

// Hyllplanen. Ett per rad i rutnätet, så sakerna STÅR på något i stället för att sväva.
// Ett försök med konsoler under planet BACKADES: i den storlek som fick plats lästes de
// som en vimpel som hängde under plankan, inte som ett fäste. Det som faktiskt gör att
// plankan läser som en hylla är kontaktskuggorna på ovansidan (se `_makeSlot`) plus
// slagskuggan under — inte fler detaljer.
const SHELF_DROP = 60 // planets ovansida strax under motivens fötter (motiv når ~54 px ned)
const C_SHELF_TOP = 0xd9a873
const C_SHELF_BOT = 0xbb8752
const C_SHELF_EDGE = 0x9a6a3c

// Svårigheten växer via fler saker (3→6) och 2-radsuppställning på sista nivån.
// Antalet "som försvinner" är alltid 1 (passar 3–5 år). Layoutsiffror = designkoord.
const LEVELS = [
  { count: 3, cols: 3, rows: 1, cellW: 200, gap: 60, startX: 380, startY: 400 },
  { count: 4, cols: 4, rows: 1, cellW: 190, gap: 44, startX: 289, startY: 400 },
  { count: 5, cols: 5, rows: 1, cellW: 180, gap: 30, startX: 220, startY: 400 },
  { count: 6, cols: 3, rows: 2, cellW: 190, gap: 50, startX: 400, startY: 290, rowStep: 240 },
]

const HALF = 95 // halv cell -> generös träffyta (190px ≫ 96px minimum)

// VILORÖRELSE per motiv. `_livprobe` mätte spelet på NOLL levande objekt: raden stod
// blick stilla medan barnet memorerade den, alltså läste den som fyra utklippta kort och
// inte som fyra saker på en hylla. Karaktären ligger i att de INTE guppar likadant —
// ballongen driver högt och långsamt, bilen guppar knappt men vaggar på hjulen, fjärilen
// fladdrar snabbt. `fot: true` flyttar rotationens centrum ner till kontaktskuggan, så
// det som STÅR på planet vaggar kring sina fötter i stället för att svänga i luften.
const LIV = {
  '🎈': { bob: 7, sway: 0.05, duration: 3.0 },
  '🦋': { bob: 6, sway: 0.10, duration: 1.5 },
  '🌈': { bob: 4, sway: 0.03, duration: 3.2 },
  '⭐': { bob: 3, sway: 0.12, duration: 2.6 },
  '🐶': { bob: 4, sway: 0.04, duration: 1.9, fot: true },
  '🐱': { bob: 4, sway: 0.05, duration: 2.1, fot: true },
  '🐸': { bob: 5, sway: 0.03, duration: 1.6, fot: true },
  '🧸': { bob: 3, sway: 0.02, duration: 3.4, fot: true },
  '🚗': { bob: 1.5, sway: 0.05, duration: 2.2, fot: true },
  '⚽': { bob: 2, sway: 0.07, duration: 2.0, fot: true },
  '🎩': { bob: 2, sway: 0.06, duration: 2.8, fot: true },
  '🍰': { bob: 1.5, sway: 0.02, duration: 3.0, fot: true },
  '🍎': { bob: 3, sway: 0.03, duration: 2.5, fot: true },
  '🍌': { bob: 3, sway: 0.04, duration: 2.4, fot: true },
  '🍓': { bob: 3, sway: 0.03, duration: 2.3, fot: true },
  '🌸': { bob: 4, sway: 0.06, duration: 2.7, fot: true },
}
const LIV_FALLBACK = { bob: 3, sway: 0.04, duration: 2.5, fot: true }
const FOT_Y = SHELF_DROP - 7 // kontaktskuggans höjd = "fötterna"

export default {
  id: 'vad-forsvann',
  titleSv: 'Vad Försvann?',
  icon: '🔍',
  category: 'minne',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'vad-forsvann',
  voiceIntro: 'Titta noga på sakerna! Snart försvinner en — vilken?',

  init(ctx) {
    this._alive = true
    this._timers = []
    this._idle = 0
    this._phase = 'show' // show | covering | answer | resolved
    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._level = clampLevel(ctx.progress.get().highestLevel | 0)
    this._build(ctx)
    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this._introLine())
  },

  // Talad intro beror på uppgiftstypen (satt i _build).
  _introLine() {
    return this._mode === 'added'
      ? 'Titta noga på sakerna! Snart dyker en ny sak upp — vilken?'
      : 'Titta noga på sakerna! Snart försvinner en — vilken?'
  },

  // Bygg en runda: städa gammalt, slumpa saker, lägg ut rutnät, skapa knapp,
  // studsa in sakerna. Talar INTE — anroparen (mount/_newRound) styr rösten.
  _build(ctx) {
    if (!this._alive) return
    this._killTimers()
    this._killSceneTweens()
    this._root.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._slots = []
    this._choices = []
    this._choiceLayer = null
    this._blanket = null
    this._missing = null
    this._busy = false
    this._misses = 0
    this._helped = false
    this._resolving = false
    this._idle = 0
    this._idleNudges = 0
    this._phase = 'show'

    // Varierad uppgiftstyp bryter den strukturellt identiska rundan: 'gone' = en
    // sak försvinner (grund), 'added' = en NY sak dyker upp. De yngsta (nivå 0)
    // får alltid grundvarianten; från nivå 1 slumpas läget.
    this._mode = this._level === 0 ? 'gone' : (Math.random() < 0.5 ? 'added' : 'gone')
    this._newcomer = null

    const lvl = LEVELS[this._level]

    // Rummet ritas först, längst bak. Full bleed åt alla håll så en bred telefon aldrig
    // ser skalets cremekant utanför 0..1280. Se rumsbeskrivningen vid C_WALL_TOP.
    const room = new Graphics()
      .rect(-BLEED_X, -BLEED_Y, ctx.width + 2 * BLEED_X, ctx.height + 2 * BLEED_Y)
      .fill(verticalFill(C_WALL_TOP, C_WALL_BOT))
    room
      .rect(-BLEED_X, FLOOR_Y, ctx.width + 2 * BLEED_X, ctx.height + BLEED_Y - FLOOR_Y)
      .fill(verticalFill(C_FLOOR_TOP, C_FLOOR_BOT))
    room.rect(-BLEED_X, FLOOR_Y - 3, ctx.width + 2 * BLEED_X, 4).fill({ color: C_FLOOR_EDGE, alpha: 0.45 })
    // Väggen är skärmens största yta — utan handlare vore varje tryck utanför sakerna
    // obesvarat (P0 ÅTERKOPPLING). Kvitterar ALLTID: en vakt på en upptagen-flagga här
    // vore precis den döda träffyta `_tystprobe` letar efter.
    room.eventMode = 'static'
    this._onRoomTap = (e) => {
      if (!this._alive) return
      const p = ctx.fxLayer.toLocal(e.global)
      kvittera(ctx.fxLayer, p.x, p.y, ctx.services.audio, { color: COLORS.yellow, maxR: 70 })
      this._idle = 0
    }
    room.on('pointertap', this._onRoomTap)
    this._root.addChild(room)

    // Rutnätet bor i ett eget lager så vi kan glida upp det när svarskorten kommer.
    this._gridShift = lvl.rows > 1 ? 90 : 0
    this._gridLayer = new Container()
    this._root.addChild(this._gridLayer)

    const motifs = shuffle(MOTIFS).slice(0, lvl.count)
    const positions = layout(lvl)

    // Hyllplanen ligger i grid-lagret och följer därför automatiskt med när rutnätet
    // glider upp för svarskorten. Läggs före sakerna så de hamnar bakom dem.
    for (const s of shelves(lvl)) this._gridLayer.addChild(makeShelf(s.x, s.y, s.w))
    // I 'added'-läget är sista rutan "nykomlingen": den ligger gömd i visa-fasen
    // (ingen studs-in) och dyker fram bakom filten. Sista rutan -> luckan hamnar i
    // radens slut, inte som ett hål mitt bland sakerna.
    const newcomerIndex = this._mode === 'added' ? lvl.count - 1 : -1

    motifs.forEach((motif, i) => {
      const slot = this._makeSlot(ctx, motif)
      slot.position.set(positions[i].x, positions[i].y)
      this._gridLayer.addChild(slot)
      this._slots.push(slot)
      slot.scale.set(0)
      if (i === newcomerIndex) {
        this._newcomer = slot
        slot._emoji.visible = false // syns inte förrän den dyker upp bakom filten
        return
      }
      gsap.to(slot.scale, {
        x: 1, y: 1, duration: 0.34, delay: 0.05 + i * 0.08, ease: 'back.out(1.7)',
        onStart: () => { if (this._alive) ctx.services.audio.sfx('pop') },
      })
    })

    // "Göm dem!"-knapp: barnet styr tempot själv (ingen press). Syns i visa-fasen.
    this._button = new Button({
      label: 'Göm dem!', icon: '🙈', width: 300, height: 92, color: COLORS.orange,
      services: ctx.services, sound: 'tap', onTap: () => this._hide(ctx),
    })
    this._button.position.set(640, 650)
    this._root.addChild(this._button)
    this._button.scale.set(0)
    gsap.to(this._button.scale, { x: 1, y: 1, duration: 0.4, delay: 0.05 + lvl.count * 0.08, ease: 'back.out(1.7)' })
  },

  // En slot = tryckbar Container med emoji-Text + (dold) tom platshållare.
  _makeSlot(ctx, motif) {
    const slot = new Container()
    slot._motif = motif
    slot._isGap = false

    const placeholder = makePlaceholder()
    placeholder.visible = false
    const emoji = drawMotif(motif)
    emoji.scale.set(1.18)

    // Kontaktskugga mot hyllplanet. Det är skuggan som gör att saken STÅR på planet i
    // stället för att sväva ovanför det — motiven är olika höga, så en gemensam skugga
    // vid planets ovansida bär kontakten bättre än att försöka nudda varje silhuett.
    const kontakt = new Graphics().ellipse(0, FOT_Y, 46, 9).fill({ color: COLORS.shadow, alpha: 0.13 })
    kontakt.eventMode = 'none'

    // Vilorörelsen bor i ett EGET inre lager. Den får aldrig ligga på `slot`: den noden
    // bär `hitArea` (P0 — träffytan får inte vandra), och kontaktskuggan + den tomma
    // platshållaren ska stå kvar på hyllan när saken guppar eller när den är borta.
    const o = LIV[motif] || LIV_FALLBACK
    const livLager = new Container()
    livLager.eventMode = 'none'
    if (o.fot) {
      // Rotation kring fötterna i stället för kring mitten: en bil vaggar på hjulen.
      // Pivån kompenseras av positionen, så viloläget är exakt oförändrat (0,0).
      livLager.pivot.set(0, FOT_Y)
      livLager.position.set(0, FOT_Y)
    }
    livLager.addChild(emoji)

    slot.addChild(kontakt, placeholder, livLager)
    slot._placeholder = placeholder
    slot._emoji = emoji
    slot._livLager = livLager
    liv(livLager, { bob: o.bob, sway: o.sway, duration: o.duration })

    slot.eventMode = 'static'
    slot.cursor = 'pointer'
    slot.hitArea = new Rectangle(-HALF, -HALF, HALF * 2, HALF * 2) // ≫ 96px + hit-halo
    slot.on('pointertap', () => this._onTap(ctx, slot))
    return slot
  },

  // Knappens onTap: visa-fas -> täck-fas. Filten glider in över sakerna.
  _hide(ctx) {
    if (!this._alive || this._busy || this._phase !== 'show') return
    this._busy = true
    this._phase = 'covering'
    this._idle = 0

    // Göm knappen (den hör hemma i visa-fasen).
    const btn = this._button
    if (btn) {
      btn.setEnabled(false)
      gsap.to(btn, { alpha: 0, duration: 0.2, onComplete: () => { if (btn && !btn.destroyed) btn.visible = false } })
    }

    // Filten täcker hela rutnätet + 40px marginal. Startar utanför den SYNLIGA
    // skärmkanten (ctx.view.right, läses vid användning) — vid 1280+60 stod den
    // parkerad fullt synlig i telefonens högra kantremsa.
    const b = bounds(this._slots)
    const blanket = makeBlanket(b.w, b.h)
    blanket.position.set(ctx.view.right + 60, b.top)
    // Filten ÄR skärmens mitt medan den ligger på — och den låg tidigare där som en
    // död yta: trycket träffade filten, inte rutorna under, och ingenting hände
    // (uppmätt `dod-traffyta` mitt i täck-fasen). Nu vaggar den till och kvitterar.
    // Att peta på filten är dessutom precis vad ett barn vill göra just då.
    blanket.eventMode = 'static'
    blanket.cursor = 'pointer'
    blanket.on('pointertap', (e) => {
      if (!this._alive || blanket.destroyed) return
      // Ringen sätts där FINGRET var, inte i filtens mitt: filten glider medan den
      // täcker, och dess pivå ligger i hörnet — en vingel eller puls därifrån hade
      // svängt hela duken. Ett kvitto får aldrig se ut som en bugg.
      const p = ctx.fxLayer.toLocal(e.global)
      kvittera(ctx.fxLayer, p.x, p.y, ctx.services.audio, { color: COLORS.orange, maxR: 90 })
    })
    this._root.addChild(blanket)
    this._blanket = blanket

    ctx.services.audio.sfx('whoosh')
    gsap.to(blanket, {
      x: b.left, duration: 0.5, ease: 'power2.out',
      onComplete: () => {
        if (!this._alive) return
        this._later(0.8, () => this._removeOne(ctx, blanket))
      },
    })
  },

  // Bakom filten: byt en sak i smyg. 'gone' -> göm en slumpvald sak (platshållare
  // fram). 'added' -> låt nykomlingen dyka upp. Glid sedan undan filten. Ett litet
  // "poff" (reveal + fallande ton) gör bytet trolskt medan filten täcker.
  _removeOne(ctx, blanket) {
    if (!this._alive) return
    let slot
    if (this._mode === 'added') {
      slot = this._newcomer
      slot._emoji.visible = true
      gsap.killTweensOf(slot.scale)
      slot.scale.set(1) // saken dyker upp bakom filten
    } else {
      slot = randomFrom(this._slots)
      slot._isGap = true
      slot._emoji.visible = false
      slot._placeholder.visible = true
      // Luckan ska vara ett HÅL. Låt vilorörelsen fortsätta och platshållaren ligger
      // still medan ett osynligt lager andas i den — harmlöst i bild, men det gör
      // luckan till "en sak som gömmer sig" i koden i stället för till en tom plats,
      // och nästa effekt som hänger på lagret hade ärvt guppet. Nollställ i stället.
      slot._livLager?._fxLiv?.kill()
      if (slot._livLager) {
        slot._livLager.y = slot._livLager.pivot.y
        slot._livLager.rotation = 0
      }
    }
    this._missing = slot

    ctx.services.audio.sfx('reveal')
    ctx.services.audio.tone({ freq: 320, dur: 0.18, type: 'sine', vol: 0.18, slideTo: 150 }) // magiskt "poff"
    gsap.to(blanket, {
      // Glid ut förbi den SYNLIGA kanten (ctx.view läses när tweenen startar).
      x: ctx.view.right + 60, duration: 0.5, ease: 'power2.in',
      onComplete: () => {
        if (!this._alive) return
        if (!blanket.destroyed) blanket.destroy({ children: true })
        if (this._blanket === blanket) this._blanket = null
        this._phase = 'answer'
        this._busy = false
        this._misses = 0
        this._helped = false
        this._idle = 0
        this._idleNudges = 0
        // Glid upp rutnätet (på 2-radsnivån) så svarskorten får plats nedtill.
        if (this._gridShift) gsap.to(this._gridLayer, { y: -this._gridShift, duration: 0.4, ease: 'power2.out' })
        pop(slot) // liten puls på platsen som ändrats
        // Magisk gnist-pluff där saken försvann/dök upp (nu synlig).
        const gp = ctx.fxLayer.toLocal(slot.getGlobalPosition())
        sparkle(ctx.fxLayer, gp.x, gp.y)
        this._showChoices(ctx)
        ctx.services.voice.say(this._askLine())
      },
    })
  },

  // Frågan i svarsfasen beror på uppgiftstypen.
  _askLine() {
    return this._mode === 'added'
      ? 'Vad är nytt? Tryck på saken som kom till!'
      : 'Vad försvann? Tryck på saken som är borta!'
  },

  // Visa svarsraden: rätt (borta) sak + ett par "lurar" bland de som SYNS kvar.
  // Eftersom lurarna fortfarande finns kvar uppe är den borta saken det enda
  // kortet som inte längre syns — ett äkta igenkännings-/minnesval (inte "tryck
  // på den tomma rutan"). Korten studsar in en efter en.
  _showChoices(ctx) {
    if (!this._alive || !this._missing) return
    const remaining = this._slots.filter((s) => s !== this._missing)
    const lureCount = Math.min(this._level >= 2 ? 3 : 2, remaining.length)
    const lures = shuffle(remaining.map((s) => s._motif)).slice(0, lureCount)
    const motifs = shuffle([this._missing._motif, ...lures])

    const layer = new Container()
    this._root.addChild(layer)
    this._choiceLayer = layer
    this._choices = []

    const positions = choiceLayout(motifs.length)
    motifs.forEach((motif, i) => {
      const card = this._makeChoice(ctx, motif)
      card.position.set(positions[i].x, positions[i].y)
      layer.addChild(card)
      this._choices.push(card)
      card.scale.set(0)
      gsap.to(card.scale, {
        x: 1, y: 1, duration: 0.32, delay: 0.1 + i * 0.08, ease: 'back.out(1.7)',
        onStart: () => { if (this._alive && i === 0) ctx.services.audio.sfx('pling') },
      })
    })
  },

  // Ett svarskort = stort tryckbart kort med en emoji. Träffyta ≫ 96px.
  _makeChoice(ctx, motif) {
    const card = makeChoiceCard(motif)
    card.on('pointertap', () => this._onChoice(ctx, card, motif))
    return card
  },

  // Tap på ett svarskort.
  _onChoice(ctx, card, motif) {
    if (!this._alive) return
    if (this._busy || this._phase !== 'answer') return this._kvitto(ctx, card)
    this._idle = 0
    this._idleNudges = 0

    if (motif === this._missing._motif) {
      this._resolveCorrect(ctx, card) // RÄTT
      return
    }
    // FEL: aldrig en bestraffning — lekfull vingel + mjukt ljud + ny mild ledtråd.
    ctx.services.audio.sfx('soft')
    wiggle(card)
    this._misses = (this._misses || 0) + 1
    if (this._mode === 'added') {
      ctx.services.voice.say(this._misses === 1
        ? 'Nästan! Vilken sak fanns inte där förut?'
        : 'Prova igen! Leta efter saken som är ny.')
    } else {
      ctx.services.voice.say(this._misses === 1
        ? 'Nästan! Titta vad som finns kvar — vilken sak är borta?'
        : 'Prova igen! Leta efter saken som inte syns längre.')
    }
    if (this._misses >= 2) this._autoHelp(ctx) // mjuk auto-hjälp -> kan aldrig fastna
  },

  // RÄTT svar: firande EN gång (guard _resolving). Saken studsar tillbaka på sin
  // plats, säger sitt namn, gnistror + beröm, framsteg + delat firande.
  _resolveCorrect(ctx, card) {
    if (this._resolving) return
    this._resolving = true
    this._busy = true
    this._phase = 'resolved'
    this._idle = 0
    this._killHelpTween()

    ctx.services.audio.sfx('correct')
    if (card && !card.destroyed) {
      gsap.killTweensOf(card.scale)
      card.scale.set(1)
      pop(card)
    }
    // Tona ned de andra korten + lås alla kort.
    this._choices.forEach((c) => {
      c.eventMode = 'none'
      if (c !== card && !c.destroyed) gsap.to(c, { alpha: 0.3, duration: 0.3 })
    })

    // Saken kommer tillbaka på sin plats i rutnätet.
    const slot = this._missing
    slot._isGap = false
    slot._placeholder.visible = false
    slot._emoji.visible = true
    bounceIn(slot._emoji)
    pop(slot)
    // Saken är tillbaka på hyllan — då ska den andas igen. Ny slumpfas, annars hade
    // återkomsten hamnat i lås med grannen den råkade lämna vid.
    if (slot._livLager && !slot._livLager.destroyed) {
      const o = LIV[slot._motif] || LIV_FALLBACK
      liv(slot._livLager, { bob: o.bob, sway: o.sway, duration: o.duration })
    }
    const gp = ctx.fxLayer.toLocal(slot.getGlobalPosition())
    sparkle(ctx.fxLayer, gp.x, gp.y)
    ripple(ctx.fxLayer, gp.x, gp.y, { color: COLORS.green, maxR: 120 }) // triumf-ring kring rutan
    // Stigande "rätt"-pling + ev. sak-specifikt läte (voff/tut) ovanpå namn-TTS.
    ctx.services.audio.tone({ freq: 520, dur: 0.14, type: 'triangle', vol: 0.22, slideTo: 900 })
    const sample = SAMPLES[slot._motif]
    if (sample) ctx.services.audio.sample(sample)
    const namn = NAMES[slot._motif] || 'den'
    const line = this._mode === 'added'
      ? `Ja! ${cap(namn)} kom till! ${randomFrom(PRAISE)}`
      : `Ja! Det var ju ${namn}! ${randomFrom(PRAISE)}`
    ctx.services.voice.say(line)

    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    this._level = clampLevel(this._level + 1)
    ctx.progress.setLevel(this._level)
    ctx.progress.complete()
    this._later(1.7, () => this._newRound(ctx))
  },

  // Mjuk auto-hjälp (efter ~2 fel eller om barnet väntar): rätt kort får en grön
  // glödring + lugn andnings-puls och en vänlig ledtråd; väljs sedan automatiskt
  // efter en stund om barnet inte hinner -> rundan kan ALDRIG misslyckas.
  _autoHelp(ctx) {
    if (!this._alive || this._helped || this._resolving) return
    this._helped = true
    const card = this._choices.find((c) => c._motif === this._missing._motif)
    if (!card || card.destroyed) return
    if (!card._glow) {
      const ring = new Graphics().roundRect(-84, -84, 168, 168, 30).stroke({ width: 8, color: COLORS.green, alpha: 0.95 })
      ring.eventMode = 'none'
      card.addChildAt(ring, 0)
      card._glow = ring
    }
    this._killHelpTween()
    this._helpTween = breathe(card, { scale: 1.12, duration: 0.7 })
    const namn = NAMES[this._missing._motif] || 'den'
    ctx.services.voice.say(this._mode === 'added'
      ? `Titta — det var ${namn} som kom till. Tryck på den!`
      : `Titta — det var ${namn} som försvann. Tryck på den!`)
    this._later(2.8, () => {
      if (this._alive && this._phase === 'answer' && !this._resolving) this._resolveCorrect(ctx, card)
    })
  },

  _killHelpTween() {
    if (this._helpTween) { this._helpTween.kill(); this._helpTween = null }
  },

  // Tap på en sak i rutnätet = ALLTID bara en lekfull poke (feedback < 100ms).
  // Själva svaret ges på svarskorten (_onChoice), aldrig genom att trycka på
  // rutorna — så det går inte längre att "ha rätt" utan att välja rätt sak.
  _onTap(ctx, slot) {
    if (!this._alive) return
    // Filten glider in, svaret avslöjas, en sak är ännu gömd — spelet kan inte utföra
    // trycket, men det får inte SVARA MED TYSTNAD (P0). Uppmätt: ett tryck under
    // täck-/avslöjningsfasen gav noll återkoppling (`dod-traffyta`).
    const upptagen = this._busy || (this._phase !== 'show' && this._phase !== 'answer') || (slot === this._newcomer && !slot._emoji.visible)
    if (upptagen) return this._kvitto(ctx, slot)
    this._idle = 0
    ctx.services.audio.sfx('pop')
    pop(slot)
  },

  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  // Rutor och svarskort bor i egna, förskjutna lager — koordinaten måste därför gå
  // via global rymd, precis som triumf-ringen i _resolveCorrect.
  _kvitto(ctx, mal) {
    if (!mal || mal.destroyed) return kvittera(null, null, null, ctx.services.audio)
    const p = ctx.fxLayer.toLocal(mal.getGlobalPosition())
    kvittera(ctx.fxLayer, p.x, p.y, ctx.services.audio, { color: COLORS.teal })
  },

  _newRound(ctx) {
    if (!this._alive) return
    this._build(ctx)
    ctx.services.voice.say(this._introLine())
  },

  // Idle ~6s: locka vänligt vidare beroende på fas (aldrig press).
  _update(ctx, ticker) {
    if (!this._alive || this._busy) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle < 6) return
    this._idle = 0
    if (this._phase === 'answer' && this._missing) {
      this._idleNudges = (this._idleNudges || 0) + 1
      if (this._idleNudges >= 2 || this._helped) {
        this._autoHelp(ctx) // har väntat ett tag -> visa & välj rätt kort
      } else {
        ctx.services.voice.say('Titta igen — vilken sak är borta? Välj rätt kort här nere.')
        this._choices.forEach((c) => { if (c && !c.destroyed) pop(c) })
      }
    } else if (this._phase === 'show' && this._button && this._button.visible) {
      ctx.services.voice.say('Tryck på Göm dem! när du har tittat klart.')
      pop(this._button)
    }
  },

  // Schemalägg en guardad fördröjd callback (samlas så destroy/_build kan döda dem).
  _later(delay, fn) {
    const c = gsap.delayedCall(delay, () => { if (this._alive) fn() })
    this._timers.push(c)
    return c
  },

  _killTimers() {
    this._timers?.forEach((t) => t.kill())
    this._timers = []
  },

  // Döda alla tweens på nuvarande scen-objekt innan de förstörs (exit-säkert).
  _killSceneTweens() {
    this._slots?.forEach((s) => {
      gsap.killTweensOf(s)
      gsap.killTweensOf(s.scale)
      if (s._emoji) gsap.killTweensOf(s._emoji.scale)
      // `liv()` tweenar ett INTERNT tillståndsobjekt, inte målet — `killTweensOf(nod)`
      // rör den alltså inte. Handtaget ligger på noden och måste dödas explicit,
      // annars tickar vilorörelsen vidare efter att spelet lämnats.
      s._livLager?._fxLiv?.kill()
    })
    this._choices?.forEach((c) => {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
    })
    this._killHelpTween()
    if (this._gridLayer) gsap.killTweensOf(this._gridLayer)
    if (this._button) {
      gsap.killTweensOf(this._button)
      gsap.killTweensOf(this._button.scale)
    }
    if (this._blanket) gsap.killTweensOf(this._blanket)
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._killTimers()
    this._killSceneTweens()
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel?.()
    this._root?.destroy({ children: true })
  },
}

// --- rena hjälpare (ingen this-/ctx-bindning) ---

function clampLevel(l) {
  return Math.max(0, Math.min(LEVELS.length - 1, l))
}

// Versal första bokstav (svensk mening: "Äpplet kom till!").
function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Cellpositioner (center) för en nivå.
function layout(lvl) {
  const out = []
  const stepX = lvl.cellW + lvl.gap
  const stepY = lvl.rowStep || lvl.cellW + lvl.gap
  for (let i = 0; i < lvl.count; i++) {
    const col = i % lvl.cols
    const row = Math.floor(i / lvl.cols)
    out.push({ x: lvl.startX + col * stepX, y: lvl.startY + row * stepY })
  }
  return out
}

// Ett hyllplan per rad i rutnätet, lika brett som raden + ett litet överhäng. Måtten
// följer nivåns egen layout, så planen sitter rätt oavsett 3, 4, 5 eller 6 saker.
// Bredden landar med flit inom filtens täckyta (`bounds`), så filten drar sig över hela
// hyllan och inte bara över sakerna som står på den.
function shelves(lvl) {
  const stepX = lvl.cellW + lvl.gap
  const stepY = lvl.rowStep || lvl.cellW + lvl.gap
  const w = (lvl.cols - 1) * stepX + lvl.cellW + 60
  const x = lvl.startX + ((lvl.cols - 1) * stepX) / 2
  const out = []
  for (let r = 0; r < lvl.rows; r++) out.push({ x, y: lvl.startY + r * stepY + SHELF_DROP, w })
  return out
}

// Ett hyllplan: skugga under, tonad ovansida (ljus bak -> mörk framkant = tjocklek),
// mörkt kantband och en ljus linje längst upp där planet fångar ljuset.
function makeShelf(x, y, w) {
  const c = new Container()
  c.position.set(x, y)
  const g = new Graphics()
  g.ellipse(0, 34, w / 2 - 14, 12).fill({ color: COLORS.shadow, alpha: 0.09 })
  g.roundRect(-w / 2, 0, w, 26, 9).fill(verticalFill(C_SHELF_TOP, C_SHELF_BOT))
  g.roundRect(-w / 2, 17, w, 9, 4).fill({ color: C_SHELF_EDGE, alpha: 0.5 })
  g.roundRect(-w / 2 + 8, 2, w - 16, 3, 1.5).fill({ color: COLORS.white, alpha: 0.38 })
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}

// Filtens täckyta utifrån sakernas positioner (+ halv cell + 40px marginal).
function bounds(slots) {
  const margin = 40
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const s of slots) {
    minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x)
    minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y)
  }
  const pad = HALF + margin
  return { left: minX - pad, top: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
}

// Tom, ljus platshållare: rundad cirkel (cream) med blek kant + blekt "❔".
function makePlaceholder() {
  const c = new Container()
  // Radien var 80 och gjorde platshållaren till scenens största föremål — den sjönk ned
  // GENOM hyllplanet medan varje riktigt motiv når ~54 px ut. 62 sätter den i samma skala
  // som sakerna och låter den vila på planet. Träffytan sitter på sloten (HALF=95), inte
  // här, så den krymper inte.
  const g = new Graphics().circle(0, 0, 62).fill(COLORS.cream).stroke({ width: 5, color: COLORS.inkSoft, alpha: 0.5 })
  g.eventMode = 'none'
  // Ritat frågetecken (var ❔) — blekt, som en tom plats som väntar.
  const q = new Graphics()
  q.arc(0, -14, 15, Math.PI, Math.PI * 0.15).stroke({ width: 9, color: COLORS.inkSoft, cap: 'round' })
  q.moveTo(6, -4).lineTo(0, 14).stroke({ width: 9, color: COLORS.inkSoft, cap: 'round' })
  q.circle(0, 30, 6).fill(COLORS.inkSoft)
  q.alpha = 0.4
  q.eventMode = 'none'
  c.addChild(g, q)
  return c
}

// Positioner (center) för svarsraden nedtill, centrerad kring x=640.
function choiceLayout(n, { y = 632, cardW = 150, gap = 56 } = {}) {
  const step = cardW + gap
  const totalW = n * cardW + (n - 1) * gap
  const startX = 640 - totalW / 2 + cardW / 2
  const out = []
  for (let i = 0; i < n; i++) out.push({ x: startX + i * step, y })
  return out
}

// Ett svarskort: rundad cream-bricka (150×150) med en stor emoji. Generös
// träffyta (156px ≫ 96px + osynlig halo). Emoji fångar inte tryck själv.
function makeChoiceCard(motif) {
  const card = new Container()
  const bg = new Graphics()
    .roundRect(-75, -75, 150, 150, 28)
    .fill(COLORS.cream)
    .stroke({ width: 5, color: COLORS.inkSoft, alpha: 0.4 })
  bg.eventMode = 'none'
  const emoji = drawMotif(motif)
  card.addChild(bg, emoji)
  card._motif = motif
  card._emoji = emoji
  card.eventMode = 'static'
  card.cursor = 'pointer'
  card.hitArea = new Rectangle(-78, -78, 156, 156)
  return card
}

// Mjuk filt: rundad lila rektangel (lokalt origo 0,0) med ljus kant + 🧺-motiv.
function makeBlanket(w, h) {
  const c = new Container()
  const g = new Graphics().roundRect(0, 0, w, h, 40).fill({ color: COLORS.purple, alpha: 0.95 }).stroke({ width: 6, color: 0xffffff, alpha: 0.8 })
  // Ritad picknickkorg som filtens motiv (var en 🧺-emoji).
  const motif = new Graphics()
  motif.arc(0, -14, 34, Math.PI, 0).stroke({ width: 7, color: 0x9a5c33 })
  motif.moveTo(-42, -14).lineTo(42, -14).lineTo(34, 34).lineTo(-34, 34).closePath()
  motif.fill(0xc98a4b).stroke({ width: 5, color: 0x9a5c33 })
  for (let i = 1; i < 4; i++) {
    const t = i / 4
    motif.moveTo(-42 + 8 * t, -14 + t * 48).lineTo(42 - 8 * t, -14 + t * 48).stroke({ width: 3, color: 0x9a5c33, alpha: 0.5 })
  }
  for (let x = -30; x <= 30; x += 20) motif.moveTo(x, -12).lineTo(x + 6, 32).stroke({ width: 3, color: 0x9a5c33, alpha: 0.4 })
  motif.roundRect(-46, -22, 92, 14, 7).fill(0xd9925e).stroke({ width: 5, color: 0x9a5c33 })
  motif.position.set(w / 2, h / 2)
  motif.eventMode = 'none'
  c.addChild(g, motif)
  c.eventMode = 'static' // absorberar tryck medan filten täcker
  return c
}
