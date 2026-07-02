// Pizzabageriet — fri skaparlek + "passa färgen" (2–5 år). Barnet PYNTAR en pizza
// uppifrån: dra valfria ingredienser (mat, fisk, bajs, snor, blöja … allt går!) från
// hyllan ner på degen och släpp var som helst → fri placering + valfri mängd ger
// mönster och färgglada former (INGA ikon-behållare, själva saken visas i fullstorlek).
// Layout: pizzan till VÄNSTER, ugnen (mindre) till HÖGER, gräddaknappen (➡️🔥, ikon
// utan text) mitt emellan med soptunnan 🗑️ rakt under. Bagerimaskoten Bobo tronar
// högst upp i mitten och mumsar en bit av varje färdig pizza.
// Ingredienshyllan har MÅNGA saker (65, slumpad ordning varje start) → svep/dra i
// hyllan (eller pilarna) för att bläddra; ett tryck lägger på pizzan direkt
// (tap-fallback). Placerade ingredienser är STORA och kan DRAS OM: flytta dem på
// pizzan, dra till soptunnan för att ta bort (puff + glad tunna), eller släpp utanför
// → studsar tillbaka med en vinglig skratt-känsla. Sedan: tryck ➡️🔥 → pizzan åker in
// i ugnen och MÖRKNAR långsamt (ton-gradient: ljus → gyllene → brun → kol). Barnet
// tittar på färgen och trycker "Ta ut" när den ser god ut. INGET kan bli fel: även
// becksvart är bara roligt ("Hihi, bränd!"), firande + klistermärke varje gång, sedan
// en ny pizza. Allt ritas programmatiskt (Pixi Graphics + emoji). Exit-säkert:
// tweens dödas, ticker tas bort, _root förstörs.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from '../../lib/Button.js'
import { createScene } from '../../lib/scene.js'
import { BAKE_SECONDS, makeBakeTint, toneSpeech, buildToneMeter } from '../../lib/cooking.js'
import { bounceIn, pop, wiggle, sparkle, puff, floatText } from '../../lib/feedback.js'
import { makeMascot } from '../../lib/mascot.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { COLORS, FONT } from '../../lib/theme.js'

// Egenritade ingredienser (saknar bra emoji). Ritas i en ~100-enheters låda kring
// (0,0); makeItemView skalar dem till önskad storlek.
const DRAWN = {
  // Grön snorklump med glans och droppe.
  snor: () =>
    new Graphics()
      .circle(0, -4, 26).fill(0x8bc34a)
      .circle(-16, 12, 15).fill(0x8bc34a)
      .circle(15, 14, 12).fill(0x8bc34a)
      .circle(8, 34, 7).fill(0x9ccc65)
      .circle(-8, -12, 7).fill({ color: 0xffffff, alpha: 0.35 }),
  // Fiskskelett: huvud + ryggrad + revben + stjärtfena.
  fiskben: () => {
    const g = new Graphics()
    g.moveTo(-14, 0).lineTo(30, 0).stroke({ width: 6, color: 0xf2ecd8, cap: 'round' })
    for (const x of [-4, 6, 16, 26]) g.moveTo(x, -13).lineTo(x, 13).stroke({ width: 5, color: 0xf2ecd8, cap: 'round' })
    g.poly([30, 0, 44, -13, 44, 13]).fill(0xf2ecd8)
    g.circle(-24, 0, 13).fill(0xf2ecd8)
    g.circle(-28, -3, 3).fill(0x3a3430)
    return g
  },
  // Brun lerplask.
  lera: () =>
    new Graphics()
      .circle(0, 2, 26).fill(0x8a5a33)
      .circle(-22, -4, 12).fill(0x8a5a33)
      .circle(20, 8, 11).fill(0x8a5a33)
      .circle(4, -20, 9).fill(0x8a5a33)
      .circle(-8, 24, 8).fill(0x8a5a33)
      .circle(-6, -6, 6).fill({ color: 0xa9744a, alpha: 0.8 }),
  // Gul kissdroppe (💧 går inte att tona gul — ritas i stället).
  kissdroppe: () =>
    new Graphics()
      .moveTo(0, -34)
      .quadraticCurveTo(18, -4, 18, 10)
      .arc(0, 10, 18, 0, Math.PI)
      .quadraticCurveTo(-18, -4, 0, -34)
      .fill(0xf6d84a)
      .stroke({ width: 4, color: 0xd9b52e })
      .circle(-6, 10, 5).fill({ color: 0xffffff, alpha: 0.55 }),
  // Använd blöja: vit blöja med tejpflikar + brun överraskning.
  bloja: () =>
    new Graphics()
      .roundRect(-36, -18, 12, 12, 4).fill(0xbfe3f0)
      .roundRect(24, -18, 12, 12, 4).fill(0xbfe3f0)
      .roundRect(-32, -22, 64, 26, 10).fill(0xfdfcf4).stroke({ width: 4, color: 0xd8d2c0 })
      .roundRect(-22, -6, 44, 32, 16).fill(0xfdfcf4).stroke({ width: 4, color: 0xd8d2c0 })
      .circle(0, 10, 8).fill(0xa9743f)
      .circle(8, 14, 5).fill(0x8a5a33),
  // Blå potta med handtag.
  potta: () => {
    const g = new Graphics()
      .ellipse(0, 24, 22, 7).fill(0x4a92c8)
      .roundRect(-26, -8, 52, 32, 14).fill(0x62b1e8).stroke({ width: 4, color: 0x4a92c8 })
      .ellipse(0, -8, 26, 9).fill(0x8fd0f5).stroke({ width: 4, color: 0x4a92c8 })
    g.circle(31, 4, 8).stroke({ width: 5, color: 0x4a92c8 })
    return g
  },
}

// Ingredienser (visas som själva saken — ingen ikon-bricka). id = asciiFold-vänligt,
// label = talad svenska (åäö ok). Mat + fisk + äckligt-roliga + specialare.
// OBS (CLAUDE.md): avbildade människor är ENDAST rollerna Pappa/Mamma — inga namn.
const I = (id, label, emoji, opts = {}) => ({ id, label, emoji, ...opts })
const ITEMS = [
  // Klassiker.
  I('tomat', 'Tomat', '🍅'), I('svamp', 'Svamp', '🍄'), I('paprika', 'Paprika', '🫑'),
  I('ost', 'Ost', '🧀'), I('majs', 'Majs', '🌽'), I('ananas', 'Ananas', '🍍'),
  I('fisk', 'Fisk', '🐟'), I('raka', 'Räka', '🦐'), I('bajs', 'Bajs', '💩'),
  I('strumpa', 'Strumpa', '🧦'), I('tand', 'Tand', '🦷'), I('stjarna', 'Stjärna', '⭐'),
  I('bacon', 'Bacon', '🥓'), I('broccoli', 'Broccoli', '🥦'), I('morot', 'Morot', '🥕'),
  I('chili', 'Chili', '🌶️'), I('oliv', 'Oliv', '🫒'), I('lok', 'Lök', '🧅'),
  I('vitlok', 'Vitlök', '🧄'), I('agg', 'Ägg', '🥚'), I('kyckling', 'Kyckling', '🍗'),
  I('kott', 'Kött', '🍖'), I('biff', 'Biff', '🥩'), I('stekt_agg', 'Stekt ägg', '🍳'),
  I('blackfisk', 'Bläckfisk', '🦑'), I('krabba', 'Krabba', '🦀'), I('atta_armar', 'Bläckfisk', '🐙'),
  I('citron', 'Citron', '🍋'), I('druvor', 'Druvor', '🍇'), I('choklad', 'Choklad', '🍫'),
  I('godis', 'Godis', '🍬'), I('munk', 'Munk', '🍩'), I('kringla', 'Kringla', '🥨'),
  I('jordnot', 'Jordnöt', '🥜'), I('kastanj', 'Kastanj', '🌰'), I('larv', 'Larv', '🐛'),
  I('ben', 'Ben', '🦴'),
  // Nya goda toppings.
  I('aubergine', 'Aubergine', '🍆'), I('zucchini', 'Zucchini', '🥒'), I('basilika', 'Basilika', '🍃'),
  I('spenat', 'Spenat', '🥬'), I('ruccola', 'Ruccola', '🌿'), I('korv', 'Korv', '🌭'),
  I('avokado', 'Avokado', '🥑'), I('scampi', 'Scampi', '🍤'), I('banan', 'Banan', '🍌'),
  I('mango', 'Mango', '🥭'),
  // Nya äckligt-roliga (aldrig läskiga — bara fnissiga).
  I('snor', 'Snor', '', { draw: 'snor' }), I('mask', 'Mask', '🪱'),
  I('smutsig_strumpa', 'Smutsig strumpa', '🧦', { tint: 0x9a8a62 }),
  I('tandborste', 'Tandborste', '🪥'), I('spindel', 'Spindel', '🕷️'), I('snigel', 'Snigel', '🐌'),
  I('mogelost', 'Mögelost', '🧀', { tint: 0xa8c46a }),
  I('fiskben', 'Fiskben', '', { draw: 'fiskben' }), I('lera', 'Lera', '', { draw: 'lera' }),
  I('groda', 'Groda', '🐸'),
  // Extra-roliga specialare.
  I('pappa', 'Pappa', '👨'), I('mamma', 'Mamma', '👩'), I('fluga', 'Fluga', '🪰'),
  I('gulligt_monster', 'Gulligt monster', '👾'),
  I('kissdroppe', 'Kissdroppe', '', { draw: 'kissdroppe' }),
  I('anvand_bloja', 'Använd blöja', '', { draw: 'bloja' }),
  I('potta', 'Potta', '', { draw: 'potta' }), I('prutt', 'Prutt', '💨'),
]

// Layout: pizza VÄNSTER · knappkolumn (grädda + soptunna) MITTEN · ugn (mindre) HÖGER.
const PIZZA = { x: 330, y: 330, r: 196 }
const OVEN = { x: 1085, y: 330 }
const BTN = { x: 735, y: 330 } // ➡️🔥 / Ta ut: vertikalt centrerad mellan pizza & ugn
const TRASH = { x: 735, y: 478 } // soptunnan rakt under gräddaknappen
const TRASH_R = 85 // släpp-radie
const MASCOT = { x: 640, y: 132 } // bageriets björnlogga (Bobo) högst upp i mitten
const MAX_TOPPINGS = 60
const PLACED_FONT = 140 // ~2.5× hyllstorleken (56) — stora, tydliga toppings på pizzan
const SHELF_FONT = 56

// Svepbar hylla.
const SHELF_Y = 672
const SHELF_VX0 = 150 // synligt fönster (vänster)
const SHELF_VX1 = 1130 // synligt fönster (höger)
const ITEM_STEP = 104

// Ton-gradient för degen: ljus → gyllene → brun → kol.
const bakeTint = makeBakeTint([0xffffff, 0xfff0c8, 0xe8b25a, 0x9a5a2c, 0x2e241c])

const RECUE = [
  'Dra ingredienser på pizzan! Allt får plats.',
  'Pynta klart och tryck på pilen mot ugnen!',
  'Gör ett roligt mönster på pizzan!',
  'Du kan flytta sakerna på pizzan, eller dra dem till soptunnan.',
]
const PLACE_CHEERS = ['Mums!', 'Fin!', 'En till!', 'Snyggt!', 'Oj!']
const TRASH_CHEERS = ['I soporna!', 'Nam nam, sa soptunnan!', 'Hihi, borta!']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// En visningsbild av en ingrediens i given storlek (px). Emoji = Text (ev. tonad),
// egenritad = Container med skalad grafik. Lokal rymd == skärm-px i båda fallen.
function makeItemView(item, size) {
  if (item.draw) {
    const c = new Container()
    const g = DRAWN[item.draw]()
    g.scale.set(size / 100)
    g.eventMode = 'none'
    c.addChild(g)
    c.eventMode = 'none'
    return c
  }
  const t = new Text({ text: item.emoji, style: { fontFamily: FONT.body, fontSize: size } })
  t.anchor.set(0.5)
  if (item.tint) t.tint = item.tint
  t.eventMode = 'none'
  return t
}

export default {
  id: 'pizzabageriet',
  titleSv: 'Pizzabageriet',
  icon: '🍕',
  category: 'roligt',
  input: 'drag',
  ageRange: [2, 5],
  voiceIntro: 'Pynta din pizza! Dra ingredienser på degen och grädda den sedan i ugnen.',

  init(ctx) {
    this._alive = true
    this._phase = 'decorate' // 'decorate' | 'baking' | 'reveal'
    this._toppings = []
    this._idle = 0
    this._bake = 0 // 0..1 doneness
    this._lastPlaceCheer = 0
    this._lastTrashCheer = 0
    this._lastSmoke = 0
    this._grab = null // pågående hyll-gest
    this._top = null // pågående omflytt av placerad topping
    this._rounds = ctx.progress.get().custom?.pizzor || 0
    // Slumpad ordning på hyllan VARJE start så två sessioner inte ser lika ut.
    this._items = shuffle(ITEMS.slice())

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Varm köks-bakgrund (dekor).
    this._root.addChild(createScene('warm', { width: ctx.width, height: ctx.height }))

    // Instruktion (uppdateras per fas).
    this._hint = new Text({ text: '', style: { fontFamily: FONT.title, fontSize: 30, fontWeight: '700', fill: COLORS.ink } })
    this._hint.anchor.set(0.5)
    this._hint.position.set(640, 40)
    this._hint.eventMode = 'none'
    this._root.addChild(this._hint)

    // Ugnen (höger, kompakt). Glöd + rök läggs ovanpå när det gräddas.
    this._oven = this._buildOven()
    this._root.addChild(this._oven)

    // Fat/peel under pizzan (stannar kvar när pizzan åker in i ugnen).
    this._plate = new Graphics()
      .ellipse(PIZZA.x, PIZZA.y + 14, PIZZA.r + 30, PIZZA.r + 18).fill({ color: COLORS.shadow, alpha: 0.1 })
      .circle(PIZZA.x, PIZZA.y, PIZZA.r + 22).fill(0xf3ead6).stroke({ width: 6, color: 0xe2d4b8 })
    this._plate.eventMode = 'none'
    this._root.addChild(this._plate)

    // Pizzan (bas + topping-lager). Flyttas/tintar som EN enhet.
    this._pizza = new Container()
    this._pizza.position.set(PIZZA.x, PIZZA.y)
    this._buildBase()
    this._toppingLayer = new Container() // barnen är interaktiva (omdragbara)
    this._pizza.addChild(this._toppingLayer)
    this._root.addChild(this._pizza)

    // Ton-mätare (visas under gräddning) — gradient + markör = "titta på färgen".
    const meter = buildToneMeter({ width: 340, tint: bakeTint })
    this._meter = meter.container
    this._setMeterProgress = meter.setProgress
    this._meter.position.set(OVEN.x, 600)
    this._meter.visible = false
    this._root.addChild(this._meter)

    // Doneness-ring runt pizzan i ugnen: färgen visas PÅ pizzan (blick + färg på samma plats).
    this._doneRing = new Graphics()
    this._doneRing.eventMode = 'none'
    this._doneRing.visible = false
    this._root.addChild(this._doneRing)

    // Bageriets logga & hungriga kund (Bobo): tronar högst upp i mitten och mumsar
    // en bit pizza när den serveras (pattern #2).
    this._customerBase = { x: MASCOT.x, y: MASCOT.y }
    this._customer = makeMascot(56)
    this._customer.position.set(this._customerBase.x, this._customerBase.y)
    this._customer.eventMode = 'none'
    this._root.addChild(this._customer)

    // Ingrediens-bräda nederst (svepbar hylla, oändlig påfyllning).
    this._buildPalette(ctx)

    // Soptunna (släpp-mål för ånger) under gräddaknappen.
    this._buildTrash()

    // Drag-lager överst (spöken från hyllan + toppings som flyttas ligger här).
    this._dragLayer = new Container()
    this._dragLayer.eventMode = 'passive' // själv ej träffbar; barnen får lyssna
    this._root.addChild(this._dragLayer)

    // Knappar: ➡️🔥 (decorate) / Ta ut (baking) — växlar synlighet. Mellan pizza & ugn.
    this._bakeBtn = new Button({
      icon: '➡️🔥', width: 180, height: 100, color: COLORS.orange,
      services: ctx.services, sound: 'whoosh', onTap: () => this._startBake(ctx),
    })
    this._bakeBtn.position.set(BTN.x, BTN.y)
    this._root.addChild(this._bakeBtn)

    this._takeBtn = new Button({
      label: 'Ta ut', icon: '🧤', width: 190, height: 100, color: COLORS.green,
      services: ctx.services, sound: 'pop', onTap: () => this._takeOut(ctx),
    })
    this._takeBtn.position.set(BTN.x, BTN.y)
    this._takeBtn.visible = false
    this._root.addChild(this._takeBtn)

    this._setHint('Pynta din pizza! 🍕')

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Bygg-hjälpare ------------------------------------------------------

  _buildBase() {
    const r = PIZZA.r
    const base = new Graphics()
      .circle(0, 0, r).fill(0xe7a85d) // skorpa
      .circle(0, 0, r - 20).fill(0xefb86b) // inre skorpa
      .circle(0, 0, r - 30).fill(0xcf4326) // tomatsås
      .circle(0, 0, r - 44).fill(0xf3cd63) // ost
    // Lite ost-fläckar för liv.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const rr = (r - 70) * (0.3 + Math.random() * 0.6)
      base.circle(Math.cos(a) * rr, Math.sin(a) * rr, 8 + Math.random() * 6).fill({ color: 0xfbe08a, alpha: 0.7 })
    }
    base.eventMode = 'none'
    this._pizza.addChild(base)
  },

  _buildOven() {
    const c = new Container()
    const { x, y } = OVEN
    // Kropp (kompakt).
    c.addChild(new Graphics().roundRect(x - 170, y - 160, 340, 352, 30).fill(0x55505a).stroke({ width: 8, color: 0x3d3942 }))
    // Övre kontrollpanel + vred.
    c.addChild(new Graphics().roundRect(x - 152, y - 152, 304, 42, 14).fill(0x6b6570))
    c.addChild(new Graphics().circle(x - 104, y - 131, 13).fill(0xd9d2c2).circle(x - 56, y - 131, 13).fill(0xd9d2c2))
    // Lucka/öppning (mörk håla).
    c.addChild(new Graphics().roundRect(x - 136, y - 90, 272, 264, 22).fill(0x6b6570))
    this._cavity = new Graphics().roundRect(x - 120, y - 74, 240, 232, 18).fill(0x1d1a20)
    c.addChild(this._cavity)
    // Värmeglöd (alpha höjs under gräddning).
    this._glow = new Graphics().roundRect(x - 120, y - 74, 240, 232, 18).fill({ color: 0xff7a1a, alpha: 0 })
    this._glow.eventMode = 'none'
    c.addChild(this._glow)
    // Glas (svag reflex).
    c.addChild(new Graphics().roundRect(x - 120, y - 74, 240, 232, 18).fill({ color: 0xffffff, alpha: 0.06 }).roundRect(x - 112, y - 66, 100, 48, 12).fill({ color: 0xffffff, alpha: 0.08 }))
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  _buildTrash() {
    const c = new Container()
    c.position.set(TRASH.x, TRASH.y)
    // Mjukt runt fat (≥96px mål) + tunnan själv.
    c.addChild(new Graphics()
      .circle(0, 6, 60).fill({ color: COLORS.shadow, alpha: 0.08 })
      .circle(0, 0, 58).fill({ color: 0xffffff, alpha: 0.75 }).stroke({ width: 4, color: 0xe6d8bf }))
    const bin = new Text({ text: '🗑️', style: { fontFamily: FONT.body, fontSize: 64 } })
    bin.anchor.set(0.5)
    bin.eventMode = 'none'
    c.addChild(bin)
    c.eventMode = 'none' // rent släpp-mål (avstånd mäts vid släpp)
    c.interactiveChildren = false
    this._trash = c
    this._root.addChild(c)
  },

  // ---- Svepbar ingredienshylla -------------------------------------------

  _buildPalette(ctx) {
    // Hyll-dekor (mjuk bakgrund, hela bredden).
    const shelf = new Graphics().roundRect(70, SHELF_Y - 52, 1140, 96, 28).fill({ color: 0xffffff, alpha: 0.5 }).stroke({ width: 4, color: 0xe6d8bf })
    shelf.eventMode = 'none'
    this._root.addChild(shelf)

    // Klippt fönster (mask) så saker utanför hyllan inte syns.
    this._paletteViewport = new Container()
    this._root.addChild(this._paletteViewport)
    const maskG = new Graphics().roundRect(SHELF_VX0, SHELF_Y - 50, SHELF_VX1 - SHELF_VX0, 100, 22).fill(0xffffff)
    this._paletteViewport.addChild(maskG)
    this._paletteViewport.mask = maskG

    // Strippen som scrollas (alla ingredienser i en lång rad).
    this._paletteStrip = new Container()
    this._paletteViewport.addChild(this._paletteStrip)

    this._paletteItems = []
    this._items.forEach((item, i) => {
      const it = makeItemView(item, SHELF_FONT)
      it.position.set(i * ITEM_STEP, SHELF_Y) // lokal x i strippen
      it.eventMode = 'static'
      it.cursor = 'pointer'
      it.hitArea = new Circle(0, 0, 50) // ≥96px träff
      const onDown = (e) => this._onItemDown(ctx, item, it, e)
      it.on('pointerdown', onDown)
      it._onDown = onDown
      this._paletteStrip.addChild(it)
      this._paletteItems.push(it)
    })

    // Scroll-gränser (strip.x).
    const contentW = (this._items.length - 1) * ITEM_STEP
    this._scrollMax = SHELF_VX0 + 40 // första saken vid vänsterkanten
    this._scrollMin = Math.min(this._scrollMax, SHELF_VX1 - 40 - contentW)
    this._paletteStrip.x = this._scrollMax
    this._paletteStrip.y = 0

    // Pilar för att bläddra (tap) — komplement till svep.
    this._arrows = []
    const mkArrow = (x, char, dir) => {
      const a = new Container()
      a.position.set(x, SHELF_Y)
      a.addChild(new Graphics().circle(0, 0, 34).fill({ color: COLORS.orange, alpha: 0.95 }).stroke({ width: 4, color: 0xffffff }))
      const t = new Text({ text: char, style: { fontFamily: FONT.body, fontSize: 34, fontWeight: '900', fill: 0xffffff } })
      t.anchor.set(0.5)
      a.addChild(t)
      a.eventMode = 'static'
      a.cursor = 'pointer'
      a.hitArea = new Circle(0, 0, 48)
      const onTap = () => this._pageShelf(ctx, dir)
      a.on('pointertap', onTap)
      a._onTap = onTap
      this._root.addChild(a)
      this._arrows.push(a)
    }
    mkArrow(102, '◀', +1) // visa tidigare
    mkArrow(1178, '▶', -1) // visa senare
  },

  _pageShelf(ctx, dir) {
    if (!this._alive || this._phase !== 'decorate') return
    this._idle = 0
    const target = clamp(this._paletteStrip.x + dir * 560, this._scrollMin, this._scrollMax)
    gsap.killTweensOf(this._paletteStrip)
    gsap.to(this._paletteStrip, { x: target, duration: 0.32, ease: 'power2.out' })
    ctx.services.audio.sfx('tap')
  },

  // ---- Gest: tap / drag-till-pizza / svep-scroll (disambiguering) ----------

  _onItemDown(ctx, item, view, e) {
    if (!this._alive || this._phase !== 'decorate' || this._grab || this._top) return
    this._idle = 0
    gsap.killTweensOf(this._paletteStrip)
    const move = (ev) => this._onGrabMove(ctx, ev)
    const up = (ev) => this._onGrabUp(ctx, ev)
    this._grab = {
      item, src: view, mode: 'undecided', ghost: null,
      startX: e.global.x, startY: e.global.y, startScroll: this._paletteStrip.x, move, up,
    }
    view.on('globalpointermove', move)
    view.on('pointerup', up)
    view.on('pointerupoutside', up)
  },

  _onGrabMove(ctx, e) {
    const g = this._grab
    if (!g) return
    const dx = e.global.x - g.startX
    const dy = e.global.y - g.startY
    if (g.mode === 'undecided') {
      if (Math.hypot(dx, dy) < 14) return
      if (Math.abs(dx) > Math.abs(dy) * 1.2) {
        g.mode = 'scroll' // vågrätt drag → bläddra hyllan
      } else {
        g.mode = 'drag' // uppåt/lodrätt → dra ut en ingrediens
        ctx.services.audio.sfx('tap')
        const view = makeItemView(g.item, 64)
        const p = this._root.toLocal(e.global)
        view.position.set(p.x, p.y)
        this._dragLayer.addChild(view)
        g.ghost = view
        pop(view)
      }
    }
    if (g.mode === 'scroll') {
      this._paletteStrip.x = clamp(g.startScroll + dx, this._scrollMin, this._scrollMax)
    } else if (g.mode === 'drag' && g.ghost && !g.ghost.destroyed) {
      const p = this._root.toLocal(e.global)
      g.ghost.position.set(p.x, p.y)
    }
  },

  _onGrabUp(ctx, e) {
    const g = this._grab
    if (!g) return
    g.src.off('globalpointermove', g.move)
    g.src.off('pointerup', g.up)
    g.src.off('pointerupoutside', g.up)
    this._grab = null

    if (g.mode === 'drag') {
      const local = this._pizza.toLocal(e.global)
      const dist = Math.hypot(local.x, local.y)
      if (dist <= PIZZA.r - 14 && this._toppings.length < MAX_TOPPINGS) {
        this._placeTopping(ctx, g.item, local.x, local.y)
      } else {
        const rp = this._root.toLocal(e.global)
        puff(ctx.fxLayer, rp.x, rp.y, { count: 6 })
        ctx.services.audio.sfx('soft')
      }
      if (g.ghost && !g.ghost.destroyed) g.ghost.destroy()
    } else if (g.mode === 'undecided') {
      // Rent tryck (ingen rörelse) = tap-fallback: lägg på pizzan på en slumpad plats.
      this._tapPlace(ctx, g.item)
    } else {
      // scroll settle
      ctx.services.audio.sfx('soft')
    }
  },

  _tapPlace(ctx, item) {
    if (this._toppings.length >= MAX_TOPPINGS) return
    const a = Math.random() * Math.PI * 2
    const rr = (PIZZA.r - 60) * Math.sqrt(Math.random()) * 0.9
    this._placeTopping(ctx, item, Math.cos(a) * rr, Math.sin(a) * rr)
  },

  _placeTopping(ctx, item, lx, ly) {
    // Placerad ingrediens = STOR (2.5× hyllstorleken) för tydliga, saftiga former.
    const t = makeItemView(item, PLACED_FONT)
    t.position.set(lx, ly)
    t.rotation = (Math.random() - 0.5) * 0.5
    // Omdragbar: flytta på pizzan, till soptunnan, eller studsa tillbaka.
    t.eventMode = 'static'
    t.cursor = 'pointer'
    t.hitArea = new Circle(0, 0, 62) // ≥96px träff
    const onDown = (e) => this._onToppingDown(ctx, t, e)
    t.on('pointerdown', onDown)
    t._onDown = onDown
    this._toppingLayer.addChild(t)
    this._toppings.push(t)
    bounceIn(t)
    sparkle(ctx.fxLayer, this._pizza.x + lx, this._pizza.y + ly, { count: 5 })
    ctx.services.audio.sfx('pop')
    const now = performance.now()
    if (now - this._lastPlaceCheer > 1400 && Math.random() < 0.6) {
      this._lastPlaceCheer = now
      ctx.services.voice.say(Math.random() < 0.5 ? item.label : randomFrom(PLACE_CHEERS))
    }
  },

  // ---- Omdrag av placerade toppings (flytta / soptunna / studsa tillbaka) --

  _onToppingDown(ctx, view, e) {
    if (!this._alive || this._phase !== 'decorate' || this._grab || this._top) return
    this._idle = 0
    const move = (ev) => this._onTopMove(ev)
    const up = (ev) => this._onTopUp(ctx, ev)
    // Flytta upp i drag-lagret (över knappar/soptunna) utan att hoppa.
    const lp = this._dragLayer.toLocal(view.getGlobalPosition())
    const start = this._dragLayer.toLocal(e.global)
    this._top = { view, move, up, prevX: view.x, prevY: view.y, offX: lp.x - start.x, offY: lp.y - start.y }
    this._dragLayer.addChild(view)
    view.position.set(lp.x, lp.y)
    gsap.killTweensOf(view.scale)
    gsap.to(view.scale, { x: 1.1, y: 1.1, duration: 0.12, ease: 'power2.out' })
    ctx.services.audio.sfx('tap')
    view.on('globalpointermove', move)
    view.on('pointerup', up)
    view.on('pointerupoutside', up)
  },

  _onTopMove(e) {
    const d = this._top
    if (!d || d.view.destroyed) return
    const p = this._dragLayer.toLocal(e.global)
    d.view.position.set(p.x + d.offX, p.y + d.offY)
  },

  _onTopUp(ctx, e) {
    const d = this._top
    if (!d) return
    this._detachTop()
    const view = d.view
    if (view.destroyed) return
    gsap.killTweensOf(view.scale)
    gsap.to(view.scale, { x: 1, y: 1, duration: 0.2, ease: 'back.out(2)' })

    // Soptunnan? → bort med den, med puff + glad tunna (aldrig ett "fel").
    const rp = this._root.toLocal(e.global)
    if (Math.hypot(rp.x - TRASH.x, rp.y - TRASH.y) < TRASH_R) {
      this._trashTopping(ctx, view)
      return
    }

    // Tillbaka till pizzans lager (behåll skärmläget).
    const lp = this._toppingLayer.toLocal(view.getGlobalPosition())
    this._toppingLayer.addChild(view)
    view.position.set(lp.x, lp.y)
    if (Math.hypot(lp.x, lp.y) <= PIZZA.r - 14) {
      // Ny plats på pizzan.
      ctx.services.audio.sfx('pop')
      sparkle(ctx.fxLayer, this._pizza.x + lp.x, this._pizza.y + lp.y, { count: 4 })
    } else {
      // Utanför både pizza & soptunna → vinglar glatt tillbaka till sin gamla plats.
      ctx.services.audio.sfx('soft')
      wiggle(view)
      gsap.to(view, { x: d.prevX, y: d.prevY, duration: 0.35, ease: 'back.out(1.8)' })
    }
  },

  _trashTopping(ctx, view) {
    const i = this._toppings.indexOf(view)
    if (i >= 0) this._toppings.splice(i, 1)
    gsap.killTweensOf(view)
    gsap.killTweensOf(view.scale)
    if (!view.destroyed) view.destroy({ children: true })
    puff(ctx.fxLayer, TRASH.x, TRASH.y - 16, { count: 8 })
    ctx.services.audio.sfx('whoosh')
    if (this._trash && !this._trash.destroyed) {
      wiggle(this._trash)
      pop(this._trash, { scale: 1.15 })
    }
    floatText(ctx.fxLayer, TRASH.x, TRASH.y - 66, '😋', { fontSize: 40 })
    const now = performance.now()
    if (now - this._lastTrashCheer > 1600) {
      this._lastTrashCheer = now
      ctx.services.voice.say(randomFrom(TRASH_CHEERS))
    }
  },

  _detachTop() {
    const d = this._top
    if (!d) return
    d.view.off('globalpointermove', d.move)
    d.view.off('pointerup', d.up)
    d.view.off('pointerupoutside', d.up)
    this._top = null
  },

  _cancelTopDrag() {
    const d = this._top
    if (!d) return
    this._detachTop()
    const view = d.view
    if (view && !view.destroyed && this._toppingLayer && !this._toppingLayer.destroyed) {
      gsap.killTweensOf(view)
      gsap.killTweensOf(view.scale)
      this._toppingLayer.addChild(view)
      view.position.set(d.prevX, d.prevY)
      view.scale.set(1)
    }
  },

  // ---- Gräddning ----------------------------------------------------------

  _startBake(ctx) {
    if (!this._alive || this._phase !== 'decorate') return
    if (this._toppings.length === 0) {
      // Mjuk knuff: lägg på något först (men aldrig ett "fel").
      ctx.services.voice.say('Lägg på lite topping först!')
      this._paletteItems.forEach((it, i) => { if (i % 3 === 0 && !it.destroyed) wiggle(it) })
      return
    }
    this._phase = 'baking'
    this._bake = 0
    this._idle = 0
    this._cancelTopDrag()
    this._setPaletteEnabled(false)
    this._bakeBtn.visible = false
    this._setHint('Titta på färgen — ta ut när den är klar!')
    ctx.services.audio.sfx('whoosh')
    ctx.services.voice.say('In i ugnen! Titta på färgen och ta ut den när den ser god ut.')

    // Pizzan åker in i ugnen (krymper för att passa hålan).
    gsap.killTweensOf(this._pizza)
    gsap.killTweensOf(this._pizza.scale)
    gsap.to(this._pizza, { x: OVEN.x, y: OVEN.y, duration: 0.7, ease: 'power2.inOut' })
    gsap.to(this._pizza.scale, { x: 0.48, y: 0.48, duration: 0.7, ease: 'power2.inOut' })

    this._meter.visible = true
    this._doneRing.visible = true
    this._takeBtn.visible = true
    pop(this._takeBtn)
  },

  _update(ctx, t) {
    if (!this._alive) return
    const dt = (t.deltaMS || 16.67) / 1000

    if (this._phase === 'baking') {
      this._bake = clamp(this._bake + dt / BAKE_SECONDS, 0, 1)
      this._pizza.tint = bakeTint(this._bake)
      // Glöd + markör.
      if (this._glow && !this._glow.destroyed) this._glow.alpha = 0.12 + 0.22 * Math.min(1, this._bake * 1.3)
      this._setMeterProgress(this._bake)
      // Doneness-ring runt pizzan — färgen visas PÅ pizzan (blick + färg samlas).
      if (this._doneRing && !this._doneRing.destroyed) {
        this._doneRing.clear()
        const rr = PIZZA.r * (this._pizza.scale.x || 1) + 14
        this._doneRing.circle(this._pizza.x, this._pizza.y, rr).stroke({ width: 8, color: bakeTint(this._bake), alpha: 0.9 })
      }
      // Rök när den börjar bli mörk.
      if (this._bake > 0.85) {
        const now = performance.now()
        if (now - this._lastSmoke > 420) {
          this._lastSmoke = now
          floatText(ctx.fxLayer, OVEN.x + (Math.random() * 80 - 40), OVEN.y - 120, '💨', { fontSize: 40, rise: 70 })
        }
      }
      // Becksvart → vänta kort, ta sedan ut automatiskt (no-fail, ingen evig loop).
      if (this._bake >= 1 && !this._autoOut) {
        this._autoOut = gsap.delayedCall(1.8, () => { if (this._alive && this._phase === 'baking') this._takeOut(ctx) })
      }
      return
    }

    if (this._phase === 'decorate') {
      this._idle += dt
      if (this._idle > 6.5) {
        this._idle = 0
        ctx.services.voice.say(randomFrom(RECUE))
        if (this._toppings.length === 0) this._paletteItems.forEach((it, i) => { if (i % 4 === 0 && !it.destroyed) pop(it) })
        else pop(this._bakeBtn)
      }
    }
  },

  _takeOut(ctx) {
    if (!this._alive || this._phase !== 'baking') return
    this._phase = 'reveal'
    this._autoOut?.kill()
    this._autoOut = null
    this._meter.visible = false
    this._takeBtn.visible = false
    if (this._glow && !this._glow.destroyed) this._glow.alpha = 0
    if (this._doneRing && !this._doneRing.destroyed) {
      this._doneRing.clear()
      this._doneRing.visible = false
    }

    const tone = this._bake
    ctx.services.audio.sfx('reveal')
    ctx.services.voice.say(toneSpeech(tone))

    // Pizzan glider ut och fram igen (behåller sin gräddade ton).
    gsap.killTweensOf(this._pizza)
    gsap.killTweensOf(this._pizza.scale)
    gsap.to(this._pizza, { x: PIZZA.x, y: PIZZA.y, duration: 0.6, ease: 'power2.out' })
    gsap.to(this._pizza.scale, { x: 1, y: 1, duration: 0.6, ease: 'back.out(1.4)' })
    this._setHint(tone >= 0.9 ? 'Lite bränd — men rolig! 🤭' : 'Klar! Vilken läcker pizza! 🍕')

    sparkle(ctx.fxLayer, PIZZA.x, PIZZA.y, { count: 10 })
    floatText(ctx.fxLayer, PIZZA.x, PIZZA.y - 60, tone >= 0.9 ? '🤭' : '😋', { fontSize: 60 })
    this._serveToCustomer(ctx, tone) // en bit flyger till den hungriga kunden som mumsar

    // Förlopp + delat firande (firar-ljud + beröm + konfetti + stjärna + klistermärke).
    this._rounds += 1
    ctx.progress.setCustom('pizzor', this._rounds)
    ctx.progress.setLevel(this._rounds)
    ctx.progress.complete()

    this._resetTimer = gsap.delayedCall(2.2, () => { if (this._alive) this._reset(ctx) })
  },

  // En bit pizza flyger till kunden (Bobo) som mumsar — mottagaren för det man bakat.
  _serveToCustomer(ctx, tone) {
    const c = this._customer
    if (!c || c.destroyed) return
    const slice = new Text({ text: '🍕', style: { fontFamily: FONT.body, fontSize: 52 } })
    slice.anchor.set(0.5)
    slice.position.set(PIZZA.x, PIZZA.y)
    slice.tint = bakeTint(tone) // biten har pizzans gräddade ton
    slice.eventMode = 'none'
    this._root.addChild(slice)
    const st = { x: PIZZA.x, y: PIZZA.y, s: 1 }
    this._serveTween = gsap.to(st, {
      x: c.x, y: c.y, s: 0.42, duration: 0.6, ease: 'power2.in',
      onUpdate: () => {
        if (slice.destroyed) { this._serveTween?.kill(); return }
        slice.position.set(st.x, st.y)
        slice.scale.set(st.s)
      },
      onComplete: () => {
        if (!slice.destroyed) slice.destroy()
        if (this._alive && c && !c.destroyed) {
          pop(c, { scale: 1.2 })
          floatText(ctx.fxLayer, c.x, c.y - 52, randomFrom(['😋', 'Mums!', '❤️']), { fontSize: 42 })
          ctx.services.voice.say(randomFrom(['Mums, tack!', 'Så god pizza!', 'Jättegott!']))
        }
      },
    })
  },

  _reset(ctx) {
    if (!this._alive) return
    this._phase = 'decorate'
    this._bake = 0
    this._idle = 0
    this._cancelTopDrag()
    // Töm toppings, återställ ton.
    for (const t of this._toppings) {
      gsap.killTweensOf(t)
      gsap.killTweensOf(t.scale)
      if (!t.destroyed) t.destroy({ children: true })
    }
    this._toppings = []
    this._pizza.tint = 0xffffff
    this._setPaletteEnabled(true)
    this._bakeBtn.visible = true
    pop(this._bakeBtn)
    this._setHint('En ny pizza! Pynta igen 🍕')
    ctx.services.voice.say('En ny pizza! Pynta igen.')
  },

  // ---- Hjälpare -----------------------------------------------------------

  _setHint(text) {
    if (this._hint && !this._hint.destroyed) this._hint.text = text
  },

  _setPaletteEnabled(on) {
    if (!on) this._cancelGrab()
    for (const it of this._paletteItems) {
      if (it.destroyed) continue
      it.eventMode = on ? 'static' : 'none'
      it.alpha = on ? 1 : 0.4
    }
    for (const a of this._arrows || []) {
      if (a.destroyed) continue
      a.eventMode = on ? 'static' : 'none'
      a.alpha = on ? 1 : 0.35
    }
    if (this._trash && !this._trash.destroyed) this._trash.alpha = on ? 1 : 0.35
  },

  _cancelGrab() {
    const g = this._grab
    if (!g) return
    g.src.off('globalpointermove', g.move)
    g.src.off('pointerup', g.up)
    g.src.off('pointerupoutside', g.up)
    if (g.ghost && !g.ghost.destroyed) g.ghost.destroy()
    this._grab = null
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._autoOut?.kill()
    this._resetTimer?.kill()
    this._serveTween?.kill()
    if (this._customer && !this._customer.destroyed) {
      gsap.killTweensOf(this._customer)
      gsap.killTweensOf(this._customer.scale)
    }
    this._cancelGrab()
    this._detachTop()
    gsap.killTweensOf(this._paletteStrip)
    for (const it of this._paletteItems || []) {
      if (it && !it.destroyed) {
        it.off('pointerdown', it._onDown)
        gsap.killTweensOf(it)
        gsap.killTweensOf(it.scale)
      }
    }
    for (const a of this._arrows || []) {
      if (a && !a.destroyed) a.off('pointertap', a._onTap)
    }
    for (const t of this._toppings || []) {
      if (t && !t.destroyed) t.off('pointerdown', t._onDown)
      gsap.killTweensOf(t)
      gsap.killTweensOf(t.scale)
    }
    if (this._trash && !this._trash.destroyed) {
      gsap.killTweensOf(this._trash)
      gsap.killTweensOf(this._trash.scale)
    }
    if (this._pizza) {
      gsap.killTweensOf(this._pizza)
      gsap.killTweensOf(this._pizza.scale)
    }
    if (this._bakeBtn) gsap.killTweensOf(this._bakeBtn.scale)
    if (this._takeBtn) gsap.killTweensOf(this._takeBtn.scale)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
