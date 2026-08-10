// Pizzabageriet — fri skaparlek + "passa färgen" (2–5 år). Barnet PYNTAR en pizza
// uppifrån: dra valfria ingredienser (mat, fisk, bajs, snor, blöja … allt går!) från
// hyllan ner på degen och släpp var som helst → fri placering + valfri mängd ger
// mönster och färgglada former.
//
// ALLA ingredienser är RITADE (./ingredienser.js) — ingen emoji är ett spelobjekt
// (P0 ASSETS). Detsamma gäller soptunnan, pizzabiten som serveras och bagaren.
//
// Scenen är ett riktigt bageri: kaklad vägg, mjölig bänkskiva, kavel, mjölsäck och
// degskål — inte en gradient. Bagaren Bobo står i kockmössa och förkläde högst upp
// och har en ÖNSKELISTA i en pratbubbla (1–2 ritade ingredienser). Önskan är helt
// frivillig: uppfyller man den blir Bobo extra lycklig, annars händer inget alls.
//
// Layout: pizzan till VÄNSTER, ugnen (mindre) till HÖGER, gräddaknappen (➡️🔥) mitt
// emellan med soptunnan rakt under. Hyllan har 65 saker i slumpad ordning → svep/dra
// (eller pilarna) för att bläddra; ett tryck lägger på pizzan direkt (tap-fallback).
// Placerade ingredienser är STORA och kan DRAS OM: flytta på pizzan, dra till
// soptunnan (puff + glad tunna), eller släpp utanför → studsar tillbaka.
//
// Sedan: tryck ➡️🔥 → pizzan åker in i ugnen och MÖRKNAR långsamt (ton-gradient:
// ljus → gyllene → brun → kol) medan osten smälter, topparna puttrar och ugnen fräser.
// Barnet tittar på färgen och trycker "Ta ut" när den ser god ut. INGET kan bli fel:
// även becksvart är bara roligt ("Hihi, bränd!"). Finishen är spel-specifik: en ritad
// pizzaskärare far över pizzan, den delas i sex bitar, och en bit flyger till Bobo som
// mumsar. Firande + klistermärke varje gång, sedan en ny pizza.
// Exit-säkert: tweens dödas, fördröjningar går via ctx.later, ticker tas bort, _root förstörs.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { Button } from '../../lib/Button.js'
import { createScene } from '../../lib/scene.js'
import { BAKE_SECONDS, makeBakeTint, toneSpeech, buildToneMeter } from '../../lib/cooking.js'
import { bounceIn, pop, wiggle, sparkle, puff, floatText } from '../../lib/feedback.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { COLORS, FONT, shade } from '../../lib/theme.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { verticalFill, topLightFill, verticalFillAlpha, groundFill, sphereFill } from '../../lib/form.js'
import DRAW from './ingredienser.js'

// Ingredienser. `id` = asciiFold-vänligt OCH nyckel i DRAW (ingredienser.js),
// `label` = talad svenska. `good` = riktig mat, dvs. kan hamna i Bobos önskelista.
// OBS (CLAUDE.md): avbildade människor är ENDAST rollerna Pappa/Mamma — inga namn.
const I = (id, label, good = false) => ({ id, label, good })
const ITEMS = [
  // Klassiker.
  I('tomat', 'Tomat', true), I('svamp', 'Svamp', true), I('paprika', 'Paprika', true),
  I('ost', 'Ost', true), I('majs', 'Majs', true), I('ananas', 'Ananas', true),
  I('fisk', 'Fisk', true), I('raka', 'Räka', true), I('bajs', 'Bajs'),
  I('strumpa', 'Strumpa'), I('tand', 'Tand'), I('stjarna', 'Stjärna'),
  I('bacon', 'Bacon', true), I('broccoli', 'Broccoli', true), I('morot', 'Morot', true),
  I('chili', 'Chili', true), I('oliv', 'Oliv', true), I('lok', 'Lök', true),
  I('vitlok', 'Vitlök', true), I('agg', 'Ägg', true), I('kyckling', 'Kyckling', true),
  I('kott', 'Kött', true), I('biff', 'Biff', true), I('stekt_agg', 'Stekt ägg', true),
  I('blackfisk', 'Bläckfisk', true), I('krabba', 'Krabba', true), I('atta_armar', 'Bläckfisk'),
  I('citron', 'Citron', true), I('druvor', 'Druvor'), I('choklad', 'Choklad'),
  I('godis', 'Godis'), I('munk', 'Munk'), I('kringla', 'Kringla'),
  I('jordnot', 'Jordnöt'), I('kastanj', 'Kastanj'), I('larv', 'Larv'),
  I('ben', 'Ben'),
  // Goda toppings.
  I('aubergine', 'Aubergine', true), I('zucchini', 'Zucchini', true), I('basilika', 'Basilika', true),
  I('spenat', 'Spenat', true), I('ruccola', 'Ruccola', true), I('korv', 'Korv', true),
  I('avokado', 'Avokado', true), I('scampi', 'Scampi', true), I('banan', 'Banan'),
  I('mango', 'Mango', true),
  // Äckligt-roliga (aldrig läskiga — bara fnissiga).
  I('snor', 'Snor'), I('mask', 'Mask'), I('smutsig_strumpa', 'Smutsig strumpa'),
  I('tandborste', 'Tandborste'), I('spindel', 'Spindel'), I('snigel', 'Snigel'),
  I('mogelost', 'Mögelost'), I('fiskben', 'Fiskben'), I('lera', 'Lera'),
  I('groda', 'Groda'),
  // Extra-roliga specialare.
  I('pappa', 'Pappa'), I('mamma', 'Mamma'), I('fluga', 'Fluga'),
  I('gulligt_monster', 'Gulligt monster'), I('kissdroppe', 'Kissdroppe'),
  I('anvand_bloja', 'Använd blöja'), I('potta', 'Potta'), I('prutt', 'Prutt'),
]

// Layout: pizza VÄNSTER · knappkolumn (grädda + soptunna) MITTEN · ugn (mindre) HÖGER.
const PIZZA = { x: 330, y: 330, r: 196 }
const OVEN = { x: 1085, y: 330 }
const BTN = { x: 735, y: 330 } // ➡️🔥 / Ta ut: vertikalt centrerad mellan pizza & ugn
const TRASH = { x: 735, y: 478 } // soptunnan rakt under gräddaknappen
const TRASH_R = 85 // släpp-radie
const BAKER = { x: 636, y: 122 } // bagaren Bobo högst upp i mitten
const ORDER = { x: 828, y: 118 } // önskelistans pratbubbla, mellan Bobo och ugnen
const COUNTER_Y = 508 // bänkskivans överkant
const MAX_TOPPINGS = 60
const PLACED_SIZE = 140 // ~2.5× hyllstorleken — stora, tydliga toppings på pizzan
const SHELF_SIZE = 56

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
const SERVE_CHEERS = ['Mums, tack!', 'Så god pizza!', 'Jättegott!']
const ORDER_CUES = [
  'Titta vad jag önskar mig! Kan du lägga det på pizzan?',
  'Jag är så hungrig! Det här skulle smaka gott.',
  'Kan du baka en pizza med det här på?',
]

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// En visningsbild av en ingrediens i given storlek (px). ALLTID ritad grafik — DRAW
// ritar i en 100-enheters låda, så lokal rymd == skärm-px efter skalningen.
function makeItemView(item, size) {
  const c = new Container()
  const g = DRAW[item.id]()
  g.scale.set(size / 100)
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}

// En ritad pizzabit (skorpa + ost + toppar) — det som serveras till bagaren.
function makeSlice(size = 100) {
  const c = new Container()
  const g = new Graphics()
  g.moveTo(0, -48).lineTo(36, 32).quadraticCurveTo(0, 46, -36, 32).closePath().fill(0xf3cd63)
  g.moveTo(0, -44).lineTo(30, 26).quadraticCurveTo(0, 38, -30, 26).closePath().fill(0xd8402c)
  g.moveTo(0, -38).lineTo(25, 20).quadraticCurveTo(0, 31, -25, 20).closePath().fill(0xf6d97a)
  g.moveTo(36, 32).quadraticCurveTo(0, 46, -36, 32).quadraticCurveTo(-40, 44, -36, 48)
    .quadraticCurveTo(0, 62, 36, 48).quadraticCurveTo(40, 44, 36, 32).closePath().fill(0xe7a85d)
  g.circle(-9, 12, 7).fill(0xd8402c)
  g.circle(11, 18, 6).fill(0xb5734a)
  g.circle(1, -12, 5.5).fill(0x4e9c3f)
  g.scale.set(size / 100)
  c.addChild(g)
  c.eventMode = 'none'
  return c
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
    this._lastSizzle = 0
    this._goldenPinged = false
    this._grab = null // pågående hyll-gest
    this._top = null // pågående omflytt av placerad topping
    this._order = []
    this._rounds = ctx.progress.get().custom?.pizzor || 0
    // Slumpad ordning på hyllan VARJE start så två sessioner inte ser lika ut.
    this._items = shuffle(ITEMS.slice())

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Varm bakgrund + ett RIKTIGT bageri ovanpå (kakel, bänk, mjöl, kavel, degskål).
    this._root.addChild(createScene('warm', { width: ctx.width, height: ctx.height }))
    this._root.addChild(this._buildBakery(ctx))

    // Instruktion (uppdateras per fas).
    // x=400: bred nog för den längsta repliken utan att glida in under hemknappen (70,64).
    this._hint = new Text({ text: '', style: { fontFamily: FONT.title, fontSize: 28, fontWeight: '700', fill: COLORS.ink } })
    this._hint.anchor.set(0.5)
    this._hint.position.set(400, 38)
    this._hint.eventMode = 'none'
    this._root.addChild(this._hint)

    // Ugnen (höger, kompakt). Glöd + rök läggs ovanpå när det gräddas.
    this._oven = this._buildOven()
    this._root.addChild(this._oven)

    // Fat/peel under pizzan (stannar kvar när pizzan åker in i ugnen).
    this._plate = new Graphics()
      .ellipse(PIZZA.x, PIZZA.y + 14, PIZZA.r + 30, PIZZA.r + 18).fill({ color: COLORS.shadow, alpha: 0.1 })
      // Fatet blev bildens största fält (86 175 px) så fort väggen fick ljus — samma
      // fynd, ett lager in. `topLightFill` ger porslinet ljus ovanifrån.
      .circle(PIZZA.x, PIZZA.y, PIZZA.r + 22).fill(topLightFill(0xf3ead6, { highlight: 0.35, dark: 0.3 })).stroke({ width: 6, color: 0xe2d4b8 })
    this._plate.eventMode = 'none'
    this._root.addChild(this._plate)

    // Pizzan (bas + smält-ost + bubblor + topping-lager). Flyttas/tintar som EN enhet.
    this._pizza = new Container()
    this._pizza.position.set(PIZZA.x, PIZZA.y)
    this._buildBase()
    this._toppingLayer = new Container() // barnen är interaktiva (omdragbara)
    this._pizza.addChild(this._toppingLayer)
    this._cuts = new Graphics() // skärlinjerna ritas vid finishen
    this._cuts.eventMode = 'none'
    this._pizza.addChild(this._cuts)
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

    // Bagaren Bobo (kockmössa + förkläde) och hans önskelista.
    this._baker = this._buildBaker()
    this._root.addChild(this._baker)
    this._orderBubble = new Container()
    this._orderBubble.position.set(ORDER.x, ORDER.y)
    this._orderBubble.eventMode = 'none'
    this._root.addChild(this._orderBubble)

    // Ingrediens-bräda nederst (svepbar hylla, oändlig påfyllning).
    this._buildPalette(ctx)

    // Soptunna (släpp-mål för ånger) under gräddaknappen.
    this._buildTrash()

    // Drag-lager överst (spöken från hyllan + toppings som flyttas ligger här).
    this._dragLayer = new Container()
    this._dragLayer.eventMode = 'passive' // själv ej träffbar; barnen får lyssna
    this._root.addChild(this._dragLayer)

    // Pizzaskäraren (ritad) — far över pizzan vid finishen.
    this._cutter = this._buildCutter()
    this._cutter.visible = false
    this._root.addChild(this._cutter)

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
    this._newOrder()

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Bageriet (scen) ----------------------------------------------------

  // Kaklad vägg, mjölig bänkskiva, golv och riktiga bageri-prylar. Ren dekor.
  _buildBakery(ctx) {
    const c = new Container()
    const W = ctx.width
    const H = ctx.height

    // Kaklad vägg med lätt förskjutna rader. Ritas med bleed (±BLEED_X i sidled, BLEED_Y
    // uppåt) så breda telefoner aldrig visar ängen från `createScene` bakom bageriet.
    // Rutnätets FAS är oförändrad: raderna räknas från samma row 0 och kolumnerna kliver
    // 62 px från samma `off`, bara längre ut åt vänster — bilden i 0..W är bit-identisk.
    const wall = new Graphics().rect(-BLEED_X, -BLEED_Y, W + 2 * BLEED_X, COUNTER_Y + BLEED_Y).fill(0xf7dcb8)
    for (let row = -Math.ceil(BLEED_Y / 62); row * 62 < COUNTER_Y; row++) {
      const y = row * 62
      const off = row % 2 ? -31 : 0
      let x0 = off
      while (x0 > -BLEED_X - 62) x0 -= 62
      for (let x = x0; x < W + BLEED_X; x += 62) {
        wall.roundRect(x + 4, y + 4, 54, 54, 10).fill({ color: 0xfdefd8, alpha: 0.9 })
      }
    }
    c.addChild(wall)

    // Ljus över kaklet. `_plattprobe --medbakgrund` mätte 211 569 px — 23 % av skärmen —
    // i EN ton: rutorna bryter ytan för ögat, men varje ruta har exakt samma färg, så
    // väggen saknade ljus uppifrån-ned. Samma fynd och samma fix som i `hamburgerbygget`.
    // Eget objekt eftersom `alpha` inte går att kombinera med en gradientfyllning.
    // Bleed: BARA i sidled på själva gradienten — bbox-höjden styr mappningen, så ett
    // extra topp-bleed hade flyttat hela ljuset i den synliga bilden. Remsan ovanför
    // y = 0 är därför en helfärgad fortsättning av gradientens översta ton.
    const vaggljus = new Graphics()
      .rect(-BLEED_X, 0, W + 2 * BLEED_X, COUNTER_Y).fill(verticalFill(0xfff6e6, 0x9a7346))
      .rect(-BLEED_X, -BLEED_Y, W + 2 * BLEED_X, BLEED_Y).fill(0xfff6e6)
    vaggljus.alpha = 0.22
    vaggljus.eventMode = 'none'
    c.addChild(vaggljus)

    // Bänkskiva (trä) med mörkare framkant.
    const counter = new Graphics()
      .rect(-BLEED_X, COUNTER_Y, W + 2 * BLEED_X, 74).fill(0xc98f57)
      .rect(-BLEED_X, COUNTER_Y, W + 2 * BLEED_X, 12).fill(0xe0ab73)
      .rect(-BLEED_X, COUNTER_Y + 62, W + 2 * BLEED_X, 12).fill(0xa9723f)
    for (let i = 0; i < 9; i++) {
      const y = COUNTER_Y + 18 + (i % 3) * 15
      counter.moveTo(i * 150 - 20, y).quadraticCurveTo(i * 150 + 55, y + 5, i * 150 + 120, y)
        .stroke({ width: 2, color: 0xb8804c, alpha: 0.5 })
    }
    c.addChild(counter)

    // Golv (syns bara i kanterna under hyllan).
    // Golvet under disken lag pa 62 882 px i EN ton (`_plattprobe --medbakgrund`) — spelets
    // storsta falt. Delad markfyllning, se lib/form.js.
    // Bleed som väggljuset: gradienten breddas bara i sidled (höjden styr mappningen),
    // och remsan under H är en helfärgad fortsättning av dess understa ton.
    c.addChild(new Graphics()
      .rect(-BLEED_X, COUNTER_Y + 74, W + 2 * BLEED_X, H - COUNTER_Y - 74).fill(groundFill(0xb07a4a))
      .rect(-BLEED_X, H, W + 2 * BLEED_X, BLEED_Y).fill(shade(0xb07a4a, 0.28)))

    // Mjölfläckar på bänken runt pizzan.
    const flour = new Graphics()
    for (let i = 0; i < 26; i++) {
      const x = 60 + Math.random() * 560
      const y = COUNTER_Y + 8 + Math.random() * 54
      flour.circle(x, y, 3 + Math.random() * 9).fill({ color: 0xfdf6e6, alpha: 0.35 + Math.random() * 0.35 })
    }
    c.addChild(flour)

    // Kavel till vänster på bänken.
    const pin = new Graphics()
    pin.roundRect(52, COUNTER_Y + 20, 132, 28, 14).fill(0xf7e3c0).stroke({ width: 4, color: 0x9c6a35 })
    pin.roundRect(22, COUNTER_Y + 28, 34, 13, 7).fill(0x8a5a33)
    pin.roundRect(180, COUNTER_Y + 28, 34, 13, 7).fill(0x8a5a33)
    pin.roundRect(66, COUNTER_Y + 26, 42, 6, 3).fill({ color: 0xffffff, alpha: 0.6 })
    c.addChild(pin)

    // Mjölsäck mellan pizzan och knappkolumnen.
    const sack = new Graphics()
    sack.moveTo(556, COUNTER_Y + 58).lineTo(562, COUNTER_Y - 24).quadraticCurveTo(596, COUNTER_Y - 38, 630, COUNTER_Y - 24)
      .lineTo(636, COUNTER_Y + 58).closePath().fill(0xf0e2c4).stroke({ width: 3, color: 0xd6c39c })
    sack.moveTo(566, COUNTER_Y - 22).quadraticCurveTo(596, COUNTER_Y - 4, 626, COUNTER_Y - 22)
      .stroke({ width: 3, color: 0xd6c39c })
    sack.roundRect(574, COUNTER_Y + 2, 44, 30, 6).fill({ color: 0xfdf6e6, alpha: 0.8 })
    sack.circle(596, COUNTER_Y + 17, 9).fill(0xc98f57)
    c.addChild(sack)

    // Degskål till höger om soptunnan.
    const bowl = new Graphics()
    bowl.moveTo(838, COUNTER_Y - 4).quadraticCurveTo(882, COUNTER_Y + 62, 926, COUNTER_Y - 4).closePath().fill(0x6fc4e8)
    bowl.ellipse(882, COUNTER_Y - 4, 44, 12).fill(0x8fd0f5).stroke({ width: 3, color: 0x4a92c8 })
    bowl.ellipse(882, COUNTER_Y - 8, 32, 8).fill(0xf3e3c0)
    c.addChild(bowl)

    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // ---- Bygg-hjälpare ------------------------------------------------------

  _buildBase() {
    const r = PIZZA.r
    const base = new Graphics()
    // Bubblig skorpkant (inte en perfekt cirkel) — degkänsla.
    base.circle(0, 0, r).fill(0xe7a85d)
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2
      base.circle(Math.cos(a) * (r - 13), Math.sin(a) * (r - 13), 10).fill(0xefb86b)
    }
    base.circle(0, 0, r - 20).fill(0xefb86b)
    base.circle(0, 0, r - 30).fill(0xcf4326) // tomatsås
    // Såsen får synas ordentligt — osten ligger som en mjukt oregelbunden ö i mitten.
    base.circle(0, 0, r - 44).fill(0xd94b2c)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      base.circle(Math.cos(a) * (r - 56), Math.sin(a) * (r - 56), 9).fill(0xf3cd63)
    }
    // Osten lag pa 60 494 px i EN ton (`_plattprobe --medbakgrund`) — spelets storsta falt
    // sedan golvet tonades i 8d6b1a9. En pizza ses uppifran, sa det ar ingen yta i
    // perspektiv utan ett FOREMAL med en svag kupa: dampad klotfyllning ger den graddad
    // volym utan att bli en glansig boll. Cachad per farg. Se lib/form.js.
    base.circle(0, 0, r - 54).fill(sphereFill(0xf3cd63, { highlight: 0.16, dark: 0.14, spread: 0.72 })) // ost
    // Lite ost-fläckar för liv.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const rr = (r - 70) * (0.3 + Math.random() * 0.6)
      base.circle(Math.cos(a) * rr, Math.sin(a) * rr, 8 + Math.random() * 6).fill({ color: 0xfbe08a, alpha: 0.7 })
    }
    base.eventMode = 'none'
    this._pizza.addChild(base)

    // Smält ost: ljusa pölar som tonas in under gräddningen.
    const melt = new Graphics()
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3
      const rr = (r - 80) * (0.25 + Math.random() * 0.75)
      melt.circle(Math.cos(a) * rr, Math.sin(a) * rr, 16 + Math.random() * 14).fill({ color: 0xffe9a8, alpha: 0.85 })
    }
    melt.alpha = 0
    melt.eventMode = 'none'
    this._melt = melt
    this._pizza.addChild(melt)

    // Bubblor som puttrar i osten (ritas om per frame under gräddning).
    this._bubbles = new Graphics()
    this._bubbles.eventMode = 'none'
    this._bubbles.visible = false
    this._pizza.addChild(this._bubbles)
    this._bubbleSeeds = Array.from({ length: 9 }, () => {
      const a = Math.random() * Math.PI * 2
      const rr = (r - 76) * Math.sqrt(Math.random())
      return { x: Math.cos(a) * rr, y: Math.sin(a) * rr, ph: Math.random() * Math.PI * 2, r: 6 + Math.random() * 7 }
    })
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

  // Bagaren Bobo: maskot-huvudet med kropp, förkläde, armar och kockmössa.
  _buildBaker() {
    const c = new Container()
    c.position.set(BAKER.x, BAKER.y)

    // Kropp: björnbål i cream med orange skuggkant, tassar och ett vitt bagarförkläde.
    const body = new Graphics()
    // Armar (bakom bålen).
    body.roundRect(-76, 40, 36, 19, 10).fill(COLORS.cream).stroke({ width: 4, color: 0xe8cfa8 })
    body.roundRect(40, 40, 36, 19, 10).fill(COLORS.cream).stroke({ width: 4, color: 0xe8cfa8 })
    body.circle(-76, 50, 14).fill(COLORS.cream).stroke({ width: 4, color: 0xe8cfa8 })
    body.circle(76, 50, 14).fill(COLORS.cream).stroke({ width: 4, color: 0xe8cfa8 })
    // Tassar nedtill så kroppen avslutas (i stället för att sluta tvärt).
    body.ellipse(-26, 108, 21, 13).fill(COLORS.cream).stroke({ width: 4, color: 0xe8cfa8 })
    body.ellipse(26, 108, 21, 13).fill(COLORS.cream).stroke({ width: 4, color: 0xe8cfa8 })
    // Bål (skuggkant + kropp).
    body.roundRect(-52, 22, 104, 88, 34).fill(COLORS.orangeDark)
    body.roundRect(-52, 16, 104, 88, 34).fill(COLORS.cream)
    // Förkläde med hängslen och band.
    body.moveTo(-30, 40).lineTo(30, 40).lineTo(27, 96).quadraticCurveTo(0, 106, -27, 96).closePath()
      .fill(0xfffdf7).stroke({ width: 3, color: 0xe2d4b8 })
    body.moveTo(-17, 40).lineTo(-9, 18).stroke({ width: 7, color: COLORS.orange, cap: 'round' })
    body.moveTo(17, 40).lineTo(9, 18).stroke({ width: 7, color: COLORS.orange, cap: 'round' })
    body.roundRect(-33, 52, 66, 11, 6).fill(COLORS.orange)
    // Litet mjölhandavtryck på förklädet.
    body.circle(10, 78, 7).fill({ color: 0xf0e2c4, alpha: 0.9 })
    c.addChild(body)

    // Huvudet: riggen, med `kropp: false`. Bålen ovan bär förkläde, hängslen och band
    // — den är bagarens uniform, inte en platshållare för en björnkropp. `c` är den
    // yttre containern och äger `y` (vilo-guppet) och `pop`; riggen äger `view.scale`.
    this._kar = makeKaraktar({ r: 44, kropp: false })
    this._kar.setMood('nyfiken') // tom botten från start — samma min som _reset sätter
    c.addChild(this._kar.view)

    // Kockmössa ovanpå.
    const hat = new Graphics()
    hat.roundRect(-34, -62, 68, 22, 9).fill(0xfffdf7).stroke({ width: 3, color: 0xe2d4b8 })
    hat.circle(-24, -78, 20).fill(0xfffdf7)
    hat.circle(0, -86, 24).fill(0xfffdf7)
    hat.circle(24, -78, 20).fill(0xfffdf7)
    hat.roundRect(-32, -84, 64, 26, 13).fill(0xfffdf7)
    hat.roundRect(-34, -62, 68, 22, 9).stroke({ width: 3, color: 0xe2d4b8 })
    c.addChild(hat)

    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // Ritad soptunna (metall med lock och handtag) — inget emoji.
  _buildTrash() {
    const c = new Container()
    c.position.set(TRASH.x, TRASH.y)
    // Mjukt runt fat (≥96px mål).
    c.addChild(new Graphics()
      .circle(0, 8, 60).fill({ color: COLORS.shadow, alpha: 0.08 })
      .circle(0, 0, 58).fill({ color: 0xffffff, alpha: 0.7 }).stroke({ width: 4, color: 0xe6d8bf }))
    const bin = new Graphics()
    // Konisk tunna med räfflor.
    bin.moveTo(-32, -18).lineTo(32, -18).lineTo(25, 34).quadraticCurveTo(24, 42, 15, 42)
      .lineTo(-15, 42).quadraticCurveTo(-24, 42, -25, 34).closePath().fill(0x9aa2b1)
    bin.moveTo(-32, -18).lineTo(-25, 34).quadraticCurveTo(-24, 42, -15, 42).lineTo(-6, 42)
      .lineTo(-12, -18).closePath().fill({ color: 0xb6bdc9, alpha: 0.9 })
    for (const x of [-14, 0, 14]) {
      bin.moveTo(x, -10).lineTo(x - x * 0.22, 34).stroke({ width: 2.5, color: 0x7c8494, alpha: 0.7 })
    }
    // Lock + handtag.
    bin.roundRect(-38, -30, 76, 16, 8).fill(0xb6bdc9).stroke({ width: 3, color: 0x7c8494 })
    bin.roundRect(-10, -40, 20, 12, 6).fill(0x7c8494)
    bin.eventMode = 'none'
    c.addChild(bin)
    c.eventMode = 'none' // rent släpp-mål (avstånd mäts vid släpp)
    c.interactiveChildren = false
    this._trash = c
    this._root.addChild(c)
  },

  // Ritad pizzaskärare: hjul + handtag. Far över pizzan vid finishen.
  _buildCutter() {
    const c = new Container()
    const g = new Graphics()
    g.roundRect(6, -14, 62, 18, 9).fill(0x8a5a33).stroke({ width: 3, color: 0x6d4425 })
    g.roundRect(-4, -10, 20, 10, 5).fill(0xb6bdc9)
    g.circle(-18, 6, 24).fill(0xd7dde6).stroke({ width: 4, color: 0x9aa2b1 })
    g.circle(-18, 6, 7).fill(0x9aa2b1)
    g.moveTo(-40, 2).quadraticCurveTo(-18, -8, 4, 2).stroke({ width: 2.5, color: 0xffffff, alpha: 0.6 })
    c.addChild(g)
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // ---- Bobos önskelista (frivillig order) ---------------------------------

  _newOrder() {
    const pool = ITEMS.filter((i) => i.good)
    const n = 1 + (Math.random() < 0.45 ? 1 : 0) // 1–2 önskningar — aldrig övermäktigt
    this._order = shuffle(pool.slice()).slice(0, n)
    this._drawOrder()
  },

  // Ritar pratbubblan med de önskade ingredienserna (bild, ingen läsning).
  _drawOrder() {
    const b = this._orderBubble
    if (!b || b.destroyed) return
    b.removeChildren().forEach((ch) => ch.destroy({ children: true }))
    const n = this._order.length
    const w = 42 + n * 62
    const h = 92
    const bg = new Graphics()
      .roundRect(-w / 2 + 5, -h / 2 + 7, w, h, 26).fill({ color: COLORS.shadow, alpha: 0.08 })
      .roundRect(-w / 2, -h / 2, w, h, 26).fill(0xfffdf7).stroke({ width: 4, color: COLORS.orange })
    // Svans mot bagaren (åt vänster).
    bg.moveTo(-w / 2 + 6, 6).lineTo(-w / 2 - 22, 22).lineTo(-w / 2 + 10, 26).closePath()
      .fill(0xfffdf7).stroke({ width: 4, color: COLORS.orange })
    bg.eventMode = 'none'
    b.addChild(bg)
    this._order.forEach((item, i) => {
      const v = makeItemView(item, 54)
      v.position.set(-((n - 1) * 62) / 2 + i * 62, 0)
      b.addChild(v)
      bounceIn(v, { delay: 0.1 + i * 0.08 })
    })
    b.scale.set(1)
  },

  // Hur många av önskningarna ligger på pizzan just nu?
  _orderFilled() {
    if (!this._order.length) return false
    return this._order.every((o) => this._toppings.some((t) => t._itemId === o.id))
  },

  // ---- Svepbar ingredienshylla -------------------------------------------

  _buildPalette(ctx) {
    // Hyll-dekor (mjuk bakgrund, hela bredden).
    // Hyllan var bildens största enfärgade fält (88 106 px) — MÄTT, inte gissat: jag
    // trodde först att det var kaklet, men pixlarnas bbox låg på 72,622 → 1207,713,
    // alltså hyllan. Den ritas halvgenomskinlig, så toningen måste bära alfan själv
    // (`verticalFillAlpha`, lib/form.js).
    const shelf = new Graphics().roundRect(70, SHELF_Y - 52, 1140, 96, 28).fill(verticalFillAlpha(0xfffdf7, 0xe8dcc4, 0.88, 0.82)).stroke({ width: 4, color: 0xe6d8bf })
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
      const it = makeItemView(item, SHELF_SIZE)
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
        const view = makeItemView(g.item, 84)
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
    const t = makeItemView(item, PLACED_SIZE)
    t.position.set(lx, ly)
    t.rotation = (Math.random() - 0.5) * 0.5
    t._itemId = item.id
    t._ph = Math.random() * Math.PI * 2 // egen fas i ugns-puttrandet
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

    // Var det något Bobo önskade sig? Då blir han glad direkt.
    const wanted = this._order.some((o) => o.id === item.id)
    if (wanted && !t._cheered) {
      t._cheered = true
      // `heja`, inte `jubel`: det här händer flera gånger per pizza. Ett hopp på var
      // och en hade gjort firandet till bakgrundsljud, och då finns ingenting kvar
      // som markerar att pizzan faktiskt blev serverad.
      if (this._baker && !this._baker.destroyed) this._kar?.react('heja')
      if (this._orderBubble && !this._orderBubble.destroyed) wiggle(this._orderBubble)
      ctx.services.audio.sfx('pling')
      sparkle(ctx.fxLayer, ORDER.x, ORDER.y, { count: 6 })
    }

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
    this._kar?.setMood('hungrig') // pizzan är i ugnen och det börjar dofta
    this._bake = 0
    this._idle = 0
    this._goldenPinged = false
    this._cancelTopDrag()
    this._setPaletteEnabled(false)
    this._bakeBtn.visible = false
    // Kort text: utrymmet mellan hemknappen och bagaren är ~460px, och barnet läser
    // ändå inte — rösten säger hela meningen.
    this._setHint('Titta på färgen!')
    ctx.services.audio.sfx('whoosh')
    // Ugnen slår igång: en låg, varm hum.
    ctx.services.audio.tone({ freq: 78, dur: 1.1, type: 'sawtooth', vol: 0.05 })
    ctx.services.voice.say('In i ugnen! Titta på färgen och ta ut den när den ser god ut.')

    // Pizzan åker in i ugnen (krymper för att passa hålan).
    gsap.killTweensOf(this._pizza)
    gsap.killTweensOf(this._pizza.scale)
    gsap.to(this._pizza, { x: OVEN.x, y: OVEN.y, duration: 0.7, ease: 'power2.inOut' })
    gsap.to(this._pizza.scale, { x: 0.48, y: 0.48, duration: 0.7, ease: 'power2.inOut' })

    // Tona ner det tomma fatet — annars är en stor blank cirkel scenens mittpunkt
    // under hela gräddningen, och blicken ska vara i ugnen.
    gsap.killTweensOf(this._plate)
    gsap.to(this._plate, { alpha: 0.4, duration: 0.5, ease: 'power2.out' })

    this._bubbles.visible = true
    this._meter.visible = true
    this._doneRing.visible = true
    this._takeBtn.visible = true
    pop(this._takeBtn)
  },

  _update(ctx, t) {
    if (!this._alive) return
    const dt = (t.deltaMS || 16.67) / 1000

    // Bagaren guppar i vila (skriver bara y på den YTTRE containern, så riggens
    // andning på `view.scale` kan köra parallellt utan att de skriver samma tal).
    if (this._baker && !this._baker.destroyed) {
      this._baker.y = BAKER.y + Math.sin(performance.now() * 0.0021) * 4
      // Blicken följer det barnet drar; utan drag vilar den på pizzan. Bagaren tittar
      // alltså på ARBETET, inte rakt fram — det är skillnaden mot en dekor i mössa.
      const mal = this._grab?.ghost && !this._grab.ghost.destroyed ? this._grab.ghost : this._pizza
      if (this._kar && mal && !mal.destroyed) {
        const p = this._baker.toLocal(mal.getGlobalPosition())
        this._kar.look(p.x, p.y)
      }
    }

    if (this._phase === 'baking') {
      this._bake = clamp(this._bake + dt / BAKE_SECONDS, 0, 1)
      this._pizza.tint = bakeTint(this._bake)
      const now = performance.now()

      // Glöd + markör.
      if (this._glow && !this._glow.destroyed) this._glow.alpha = 0.12 + 0.22 * Math.min(1, this._bake * 1.3)
      this._setMeterProgress(this._bake)

      // Osten smälter ut och toppen puttrar — ingredienserna LEVER i ugnen.
      if (this._melt && !this._melt.destroyed) this._melt.alpha = Math.min(0.8, this._bake * 2.2)
      for (const top of this._toppings) {
        if (top.destroyed) continue
        const s = 1 + Math.sin(now * 0.006 + top._ph) * 0.045
        top.scale.set(s)
      }
      if (this._bubbles && !this._bubbles.destroyed) {
        this._bubbles.clear()
        for (const b of this._bubbleSeeds) {
          const k = (Math.sin(now * 0.0035 + b.ph) + 1) / 2 // 0..1
          this._bubbles.circle(b.x, b.y, b.r * (0.35 + k * 0.9)).fill({ color: 0xfff2c4, alpha: 0.28 + k * 0.3 })
        }
      }

      // Doneness-ring runt pizzan — färgen visas PÅ pizzan (blick + färg samlas).
      if (this._doneRing && !this._doneRing.destroyed) {
        this._doneRing.clear()
        const rr = PIZZA.r * (this._pizza.scale.x || 1) + 14
        this._doneRing.circle(this._pizza.x, this._pizza.y, rr).stroke({ width: 8, color: bakeTint(this._bake), alpha: 0.9 })
      }

      // Ugnen fräser (kort, ljust brus) — köket låter som ett kök.
      if (now - this._lastSizzle > 340) {
        this._lastSizzle = now
        ctx.services.audio.tone({ freq: 2200 + Math.random() * 1400, dur: 0.07, type: 'sawtooth', vol: 0.025 })
      }
      // Knaster när den når gyllene: "nu är den fin!"
      if (!this._goldenPinged && this._bake >= 0.42) {
        this._goldenPinged = true
        ctx.services.audio.sfx('pling')
      }

      // Rök när den börjar bli mörk.
      if (this._bake > 0.85 && now - this._lastSmoke > 420) {
        this._lastSmoke = now
        floatText(ctx.fxLayer, OVEN.x + (Math.random() * 80 - 40), OVEN.y - 120, '💨', { fontSize: 40, rise: 70 })
      }

      // Becksvart → vänta kort, ta sedan ut automatiskt (no-fail, ingen evig loop).
      if (this._bake >= 1 && !this._autoOut) {
        this._autoOut = ctx.later(1.8, () => { if (this._alive && this._phase === 'baking') this._takeOut(ctx) })
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
    if (this._bubbles && !this._bubbles.destroyed) {
      this._bubbles.clear()
      this._bubbles.visible = false
    }
    if (this._doneRing && !this._doneRing.destroyed) {
      this._doneRing.clear()
      this._doneRing.visible = false
    }
    // Puttrandet slutar — allt tillbaka till full storlek.
    for (const top of this._toppings) if (!top.destroyed) top.scale.set(1)

    const tone = this._bake
    const filled = this._orderFilled()
    ctx.services.audio.sfx('reveal')
    ctx.services.voice.say(toneSpeech(tone))

    // Fatet fram i full styrka igen — pizzan är tillbaka på bänken.
    gsap.killTweensOf(this._plate)
    gsap.to(this._plate, { alpha: 1, duration: 0.4, ease: 'power2.out' })

    // Pizzan glider ut och fram igen (behåller sin gräddade ton).
    gsap.killTweensOf(this._pizza)
    gsap.killTweensOf(this._pizza.scale)
    gsap.to(this._pizza, { x: PIZZA.x, y: PIZZA.y, duration: 0.6, ease: 'power2.out' })
    gsap.to(this._pizza.scale, { x: 1, y: 1, duration: 0.6, ease: 'back.out(1.4)' })
    this._setHint(tone >= 0.9 ? 'Lite bränd — men rolig! 🤭' : 'Klar! Vilken läcker pizza! 🍕')

    sparkle(ctx.fxLayer, PIZZA.x, PIZZA.y, { count: 10 })
    floatText(ctx.fxLayer, PIZZA.x, PIZZA.y - 60, tone >= 0.9 ? '🤭' : '😋', { fontSize: 60 })

    // Spel-specifik finish: skär pizzan i bitar, servera en till bagaren.
    this._sliceTimer = ctx.later(0.65, () => this._cutPizza(ctx, tone, filled))

    // Förlopp + delat firande (firar-ljud + beröm + konfetti + stjärna + klistermärke).
    this._rounds += 1
    ctx.progress.setCustom('pizzor', this._rounds)
    ctx.progress.setLevel(this._rounds)
    ctx.progress.complete()

    this._resetTimer = ctx.later(3.4, () => { if (this._alive) this._reset(ctx) })
  },

  // Pizzaskäraren far över pizzan och delar den i sex bitar — den fysiska payoffen.
  _cutPizza(ctx, tone, filled) {
    if (!this._alive || this._phase !== 'reveal') return
    const cut = this._cutter
    if (cut && !cut.destroyed) {
      cut.visible = true
      cut.alpha = 1
      cut.position.set(PIZZA.x - PIZZA.r - 60, PIZZA.y - 26)
      cut.rotation = -0.12
      // Skäraren tonar bort medan den lämnar pizzan — annars står den kvar och
      // svävar mitt i den tomma delen av köket.
      const x0 = cut.x
      const x1 = PIZZA.x + PIZZA.r + 30
      const st = { x: x0 }
      this._cutTween = gsap.to(st, {
        x: x1, duration: 0.55, ease: 'power1.inOut',
        onUpdate: () => {
          if (cut.destroyed) { this._cutTween?.kill(); return }
          cut.x = st.x
          const k = (st.x - x0) / (x1 - x0) // 0..1 längs resan
          cut.alpha = k < 0.72 ? 1 : Math.max(0, 1 - (k - 0.72) / 0.28)
        },
        onComplete: () => { if (!cut.destroyed) cut.visible = false },
      })
    }
    ctx.services.audio.tone({ freq: 950, dur: 0.16, type: 'triangle', vol: 0.16, slideTo: 320 })

    // Skärlinjerna tonas in i takt med att skäraren passerar.
    if (this._cuts && !this._cuts.destroyed) {
      this._cuts.clear()
      // Snitten går genom osten, inte ut över skorpan — mörk skåra + ljus kant.
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI + 0.26
        const r = PIZZA.r - 34
        const dx = Math.cos(a) * r
        const dy = Math.sin(a) * r
        this._cuts.moveTo(-dx, -dy).lineTo(dx, dy).stroke({ width: 5, color: 0xb03a22, alpha: 0.75 })
        this._cuts.moveTo(-dx, -dy + 2.5).lineTo(dx, dy + 2.5).stroke({ width: 2, color: 0xffe9a8, alpha: 0.5 })
      }
      this._cuts.alpha = 0
      gsap.killTweensOf(this._cuts)
      gsap.to(this._cuts, { alpha: 1, duration: 0.4, ease: 'power2.out' })
    }

    this._serveTimer = ctx.later(0.55, () => this._serveToBaker(ctx, tone, filled))
  },

  // En ritad pizzabit flyger till bagaren som mumsar — mottagaren för det man bakat.
  _serveToBaker(ctx, tone, filled) {
    if (!this._alive) return
    const c = this._baker
    if (!c || c.destroyed) return
    const slice = makeSlice(96)
    slice.position.set(PIZZA.x, PIZZA.y)
    slice.tint = bakeTint(tone) // biten har pizzans gräddade ton
    this._root.addChild(slice)
    ctx.services.audio.sfx('whoosh')
    const st = { x: PIZZA.x, y: PIZZA.y, s: 1, rot: 0 }
    this._serveTween = gsap.to(st, {
      x: c.x, y: c.y + 12, s: 0.42, rot: 1.4, duration: 0.6, ease: 'power2.in',
      onUpdate: () => {
        if (slice.destroyed) { this._serveTween?.kill(); return }
        slice.position.set(st.x, st.y)
        slice.scale.set(st.s)
        slice.rotation = st.rot
      },
      onComplete: () => {
        if (!slice.destroyed) slice.destroy({ children: true })
        if (!this._alive || !c || c.destroyed) return
        // Först tuggan, sedan firandet — biten landar i munnen och DÄREFTER jublar han.
        this._kar?.react('nam')
        ctx.later(0.5, () => this._kar?.react('jubel'))
        ctx.services.audio.sfx('pop')
        if (filled) {
          // Önskan uppfylld → extra lycka (aldrig ett krav, bara en bonus).
          sparkle(ctx.fxLayer, c.x, c.y, { count: 14 })
          floatText(ctx.fxLayer, c.x, c.y - 78, '❤️', { fontSize: 48 })
          ctx.services.audio.sfx('correct')
          ctx.services.voice.say('Precis som jag önskade mig! Tack så mycket!')
        } else {
          floatText(ctx.fxLayer, c.x, c.y - 78, randomFrom(['😋', 'Mums!']), { fontSize: 42 })
          ctx.services.voice.say(randomFrom(SERVE_CHEERS))
        }
      },
    })
  },

  _reset(ctx) {
    if (!this._alive) return
    this._phase = 'decorate'
    this._kar?.setMood('nyfiken') // ny pizza, tom botten — han tittar på vad barnet gör
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
    if (this._melt && !this._melt.destroyed) this._melt.alpha = 0
    if (this._cuts && !this._cuts.destroyed) {
      gsap.killTweensOf(this._cuts)
      this._cuts.clear()
      this._cuts.alpha = 1
    }
    this._setPaletteEnabled(true)
    this._bakeBtn.visible = true
    pop(this._bakeBtn)
    this._setHint('En ny pizza! Pynta igen 🍕')
    // Ny önskelista varje omgång = ny variation att upptäcka.
    this._newOrder()
    ctx.services.voice.say(randomFrom(ORDER_CUES))
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
    this._sliceTimer?.kill()
    this._serveTimer?.kill()
    this._serveTween?.kill()
    this._cutTween?.kill()
    if (this._baker && !this._baker.destroyed) {
      gsap.killTweensOf(this._baker)
      gsap.killTweensOf(this._baker.scale)
    }
    this._kar?.destroy() // river riggens alla tweens (idle, blink, humör, reaktion)
    this._kar = null
    if (this._orderBubble && !this._orderBubble.destroyed) {
      gsap.killTweensOf(this._orderBubble)
      gsap.killTweensOf(this._orderBubble.scale)
      for (const ch of this._orderBubble.children) {
        gsap.killTweensOf(ch)
        gsap.killTweensOf(ch.scale)
      }
    }
    if (this._cuts && !this._cuts.destroyed) gsap.killTweensOf(this._cuts)
    if (this._cutter && !this._cutter.destroyed) gsap.killTweensOf(this._cutter)
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
    if (this._plate && !this._plate.destroyed) gsap.killTweensOf(this._plate)
    if (this._bakeBtn) gsap.killTweensOf(this._bakeBtn.scale)
    if (this._takeBtn) gsap.killTweensOf(this._takeBtn.scale)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
