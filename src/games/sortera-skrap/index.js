// Sortera Skräp — dra och släpp (2–5 år). MARKNADSMÄSSIG uppgradering som behåller
// mekaniken (dra varje sak till rätt tunna) men lyfter känslan rejält:
//  • Levande scen (createScene) + färgkodade tunnor som är GLADA VARELSER: stort huvud
//    med ögon vars pupiller FÖLJER det man håller, en mun som GAPAR när saken närmar sig
//    och TUGGAR belåtet vid rätt material; fel tunna skakar vänligt på huvudet ("inte
//    min sort!") — aldrig en bestraffning. Kategori-ikon som mage-bricka (INGEN läsning).
//  • Charmiga föremål med mjuk skugga som VÄXER när de lyfts (lyft + skala vid grepp).
//  • Materialspecifik juice: rätt släpp ger en ljudtextur som PASSAR sorten (glasklang,
//    pappersprassel, plast-studs, mjuk mat-duns) + huvud-tugg med "klonk" + gnistor/ring/
//    puff i materialets färg + plopp NER bakom tunnan. Fel = mjuk studs hem + vingel.
//  • Djup: läser progress.highestLevel och växer — börjar med 2 tunnor/få saker och
//    ökar upp till 4 tunnor (papper, mat, plast, glas/metall) och fler saker per runda.
//    VARIERAR vilka exakta saker som dyker upp varje runda; slängd/klustrad hög. FELFRITT.
//  • All transient-effekt går via lib/feedback.js (exit-säkert). Drag via DragController.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { createScene, lerpColor } from '../../lib/scene.js'
import { bounceIn, sparkle, ripple, pop, wiggle, breathe, shake, floatText, puff } from '../../lib/feedback.js'

// Talade svenska fraser (TTS). Korta, varma, alltid positiva.
const VOICE = {
  intro: 'Hjälp mig sortera skräpet! Dra varje sak till tunnan som passar.',
  cue: 'Dra skräpet till rätt tunna.',
  tryAgain: 'Nästan! Prova en annan tunna.',
}
const PRAISE_SV = ['Rätt!', 'Bra jobbat!', 'Ja, precis!', 'Perfekt!', 'Så duktig!']

// Kategorier: färgkodad tunna + tydlig ikon (ingen läsning) + bred föremålspool så
// varje runda varierar. Ordningen avgör vilka som läggs till när nivån stiger
// (de två första är extra lätta att skilja: papper vs mat).
const CAT_ORDER = ['papper', 'mat', 'plast', 'glasmetall']
const CATS = {
  papper: { color: 0x4aa3df, icon: '📄', items: ['📄', '📰', '📦', '✉️', '📒', '🗞️', '📕', '📃'] },
  mat: { color: 0x5bbf6a, icon: '🍎', items: ['🍌', '🍎', '🥕', '🍂', '🍐', '🌽', '🍞', '🥚'] },
  plast: { color: 0xffb14a, icon: '🧴', items: ['🥤', '🧴', '🍶', '🛍️', '🧃', '🪣', '🥡', '🪥'] },
  glasmetall: { color: 0x8a98a6, icon: '🥫', items: ['🍾', '🫙', '🥫', '🥃', '🔩', '🪙', '🥄', '🔋'] },
}

// DJUP: gradvis fler tunnor + fler saker. Strikt felfritt — bara mer, aldrig "svårare-på-fel-sätt".
const LEVELS = [
  { cats: 2, items: 4 },
  { cats: 2, items: 6 },
  { cats: 3, items: 6 },
  { cats: 3, items: 9 },
  { cats: 4, items: 8 },
  { cats: 4, items: 10 },
]

const ITEM_R = 58 // föremålets skivradie (designkoordinater)

// FULL TUNNA. Saken försvann tidigare bakom tunnan och lämnade inget spår — tunnan såg
// exakt likadan ut efter tio saker som före den första. Nu lägger varje svald sak en
// synlig klump i tunnan, i SAKENS egen färg, och lasten TRYCKER UPP locket. Samtidigt
// blir tunnan tyngre: den sjunker en aning i marken, guppar djupare och lugnar sig
// långsammare — en tom tunna hoppar till, en full tunna bara sjunker.
const HEAP_CAP = 6 // tak: så många klumpar syns och så mycket kan locket lyftas
const HEAP_LIFT = 8 // px lockhöjning per klump
const HEAP_SINK = 2.6 // px tunnan står lägre vid full last

// P0 ASSETS: alla 32 föremål + de 4 kategori-ikonerna RITAS. De låg tidigare som
// emoji inuti vita skivor — en ikon i en bricka. Emoji-strängen är kvar som
// NYCKEL (CATS-tabellerna slår upp på den). Tabellen: nyckel → [form, färg].
const TRASH_ART = {
  // papper (blått)
  '📄': ['sheet', 0xffffff], '📰': ['news', 0xf0f0e8], '📦': ['box', 0xc98a4b], '✉️': ['env', 0xfff0d8],
  '📒': ['book', 0xf0c33c], '🗞️': ['roll', 0xe8e8e0], '📕': ['book', 0xe0392b], '📃': ['sheet', 0xf5f5f0],
  // mat (grönt)
  '🍌': ['banana', 0xffd35c], '🍎': ['apple', 0xe0392b], '🥕': ['carrot', 0xff9d3d], '🍂': ['leaf', 0xd9922b],
  '🍐': ['pear', 0xc9e05a], '🌽': ['corn', 0xf0c33c], '🍞': ['bread', 0xd9a56b], '🥚': ['egg', 0xfff0e0],
  // plast (orange)
  '🥤': ['cup', 0xe0574f], '🧴': ['bottle', 0xf7b9e4], '🍶': ['bottle', 0xbfe6ff], '🛍️': ['bag', 0x6ad0ff],
  '🧃': ['carton', 0xffb14a], '🪣': ['bucket', 0x4aa3df], '🥡': ['box', 0xfff0d8], '🪥': ['brush', 0x6ad0ff],
  // glas/metall (grått)
  '🍾': ['bottle', 0x5aa653], '🫙': ['jar', 0xd8f0ff], '🥫': ['can', 0xc3ccd4], '🥃': ['cup', 0xd8f0ff],
  '🔩': ['screw', 0xa9b3bd], '🪙': ['coin', 0xf0c33c], '🥄': ['spoon', 0xc3ccd4], '🔋': ['battery', 0x5bbf6a],
  // kategori-ikoner (magen på tunnan)
  '🧴 ': ['bottle', 0xf7b9e4],
}

function drawTrash(key) {
  const g = new Graphics()
  const a = TRASH_ART[key]
  if (!a) {
    g.roundRect(-24, -24, 48, 48, 8).fill(0xc3ccd4).stroke({ width: 4, color: 0x8d99a6 })
    g.eventMode = 'none'
    return g
  }
  const [form, col] = a
  const dk = lerpColor(col, 0x000000, 0.28)
  switch (form) {
    case 'sheet':
      g.roundRect(-22, -30, 44, 60, 4).fill(col).stroke({ width: 3, color: dk })
      for (const y of [-18, -8, 2, 12]) g.moveTo(-14, y).lineTo(14, y).stroke({ width: 3, color: dk, alpha: 0.5 })
      g.moveTo(10, -30).lineTo(22, -18).stroke({ width: 3, color: dk })
      break
    case 'news':
      g.roundRect(-28, -24, 56, 48, 4).fill(col).stroke({ width: 3, color: dk })
      g.roundRect(-22, -18, 24, 14, 2).fill(dk)
      for (const y of [2, 10, 18]) g.moveTo(-22, y).lineTo(22, y).stroke({ width: 3, color: dk, alpha: 0.45 })
      break
    case 'roll':
      g.roundRect(-30, -12, 60, 26, 13).fill(col).stroke({ width: 3, color: dk })
      g.ellipse(-30, 1, 7, 13).fill(dk)
      g.moveTo(-16, -12).lineTo(-16, 14).moveTo(4, -12).lineTo(4, 14).stroke({ width: 2.5, color: dk, alpha: 0.4 })
      break
    case 'box':
      g.roundRect(-28, -18, 56, 42, 5).fill(col).stroke({ width: 3, color: dk })
      g.moveTo(-28, -18).lineTo(0, -32).lineTo(28, -18).stroke({ width: 3, color: dk })
      g.moveTo(0, -32).lineTo(0, 24).stroke({ width: 3, color: dk, alpha: 0.5 })
      g.roundRect(-8, -22, 16, 10, 2).fill({ color: 0xffffff, alpha: 0.5 })
      break
    case 'env':
      g.roundRect(-30, -20, 60, 40, 5).fill(col).stroke({ width: 3, color: dk })
      g.moveTo(-30, -20).lineTo(0, 4).lineTo(30, -20).stroke({ width: 3, color: dk })
      break
    case 'book':
      g.roundRect(-24, -30, 48, 60, 4).fill(col).stroke({ width: 3, color: dk })
      g.roundRect(-24, -30, 10, 60, 4).fill(dk)
      g.roundRect(-8, -18, 26, 5, 2).fill({ color: 0xffffff, alpha: 0.7 })
      break
    case 'banana':
      g.moveTo(-30, -12).quadraticCurveTo(-4, 30, 30, 10).quadraticCurveTo(4, 18, -18, -16).closePath()
      g.fill(col).stroke({ width: 3, color: dk })
      break
    case 'apple':
      g.circle(0, 6, 26).fill(col).stroke({ width: 3, color: dk })
      g.roundRect(-3, -26, 6, 12, 3).fill(0x6f4a2e)
      g.ellipse(13, -22, 11, 7).fill(0x5bbf6a)
      break
    case 'pear':
      g.circle(0, 12, 22).fill(col).stroke({ width: 3, color: dk })
      g.ellipse(0, -10, 14, 17).fill(col).stroke({ width: 3, color: dk })
      g.roundRect(-3, -30, 6, 10, 3).fill(0x6f4a2e)
      break
    case 'carrot':
      g.moveTo(-13, -8).lineTo(13, -8).lineTo(0, 30).closePath().fill(col).stroke({ width: 3, color: dk })
      for (const dx of [-9, 0, 9]) g.moveTo(0, -8).quadraticCurveTo(dx * 0.6, -20, dx, -28).stroke({ width: 5, color: 0x5bbf6a, cap: 'round' })
      break
    case 'leaf':
      g.moveTo(-26, 20).quadraticCurveTo(-16, -26, 26, -20).quadraticCurveTo(22, 20, -26, 20).closePath()
      g.fill(col).stroke({ width: 3, color: dk })
      g.moveTo(-22, 16).quadraticCurveTo(2, 0, 22, -16).stroke({ width: 3, color: dk, alpha: 0.6 })
      break
    case 'corn':
      g.ellipse(0, 0, 16, 30).fill(col).stroke({ width: 3, color: dk })
      for (let r = -22; r <= 22; r += 9) g.moveTo(-14, r).lineTo(14, r).stroke({ width: 2, color: dk, alpha: 0.5 })
      g.ellipse(-18, 6, 8, 22).fill(0x5bbf6a)
      g.ellipse(18, 6, 8, 22).fill(0x5bbf6a)
      break
    case 'bread':
      g.moveTo(-26, 22).lineTo(-26, -6).quadraticCurveTo(0, -32, 26, -6).lineTo(26, 22).closePath()
      g.fill(col).stroke({ width: 3, color: dk })
      g.moveTo(-20, 6).quadraticCurveTo(0, -14, 20, 6).stroke({ width: 3, color: dk, alpha: 0.5 })
      break
    case 'egg':
      g.ellipse(0, 4, 21, 27).fill(col).stroke({ width: 3, color: dk })
      g.ellipse(-7, -6, 6, 9).fill({ color: 0xffffff, alpha: 0.7 })
      break
    case 'cup':
      g.moveTo(-20, -24).lineTo(20, -24).lineTo(14, 28).lineTo(-14, 28).closePath()
      g.fill(col).stroke({ width: 3, color: dk })
      g.roundRect(-23, -30, 46, 10, 4).fill(dk)
      g.roundRect(-4, -46, 6, 18, 3).fill({ color: 0xffffff, alpha: 0.8 })
      break
    case 'bottle':
      g.roundRect(-15, -8, 30, 40, 7).fill(col).stroke({ width: 3, color: dk })
      g.moveTo(-15, -8).quadraticCurveTo(-8, -22, -7, -30).lineTo(7, -30).quadraticCurveTo(8, -22, 15, -8).closePath()
      g.fill(col).stroke({ width: 3, color: dk })
      g.roundRect(-9, -40, 18, 12, 4).fill(dk)
      g.roundRect(-12, 2, 24, 12, 2).fill({ color: 0xffffff, alpha: 0.55 })
      break
    case 'jar':
      g.roundRect(-19, -14, 38, 42, 7).fill(col).stroke({ width: 3, color: dk })
      g.roundRect(-15, -26, 30, 14, 4).fill(dk)
      g.roundRect(-13, -6, 12, 22, 3).fill({ color: 0xffffff, alpha: 0.5 })
      break
    case 'bag':
      g.moveTo(-22, -8).lineTo(22, -8).lineTo(26, 30).lineTo(-26, 30).closePath()
      g.fill(col).stroke({ width: 3, color: dk })
      g.arc(0, -8, 13, Math.PI, 0).stroke({ width: 4, color: dk })
      break
    case 'carton':
      g.moveTo(-16, -18).lineTo(16, -18).lineTo(16, 28).lineTo(-16, 28).closePath()
      g.fill(col).stroke({ width: 3, color: dk })
      g.moveTo(-16, -18).lineTo(0, -30).lineTo(16, -18).stroke({ width: 3, color: dk })
      g.roundRect(4, -40, 5, 16, 2).fill(0xffffff)
      break
    case 'bucket':
      g.moveTo(-22, -14).lineTo(22, -14).lineTo(16, 28).lineTo(-16, 28).closePath()
      g.fill(col).stroke({ width: 3, color: dk })
      g.arc(0, -16, 22, Math.PI, 0).stroke({ width: 4, color: dk })
      break
    case 'brush':
      g.roundRect(-5, -30, 10, 52, 5).fill(col).stroke({ width: 3, color: dk })
      g.roundRect(-9, 18, 18, 14, 5).fill(0xffffff).stroke({ width: 3, color: dk })
      for (const bx of [-5, 0, 5]) g.moveTo(bx, 32).lineTo(bx, 40).stroke({ width: 3, color: dk })
      break
    case 'can':
      g.roundRect(-17, -24, 34, 50, 6).fill(col).stroke({ width: 3, color: dk })
      g.ellipse(0, -24, 17, 6).fill({ color: 0xffffff, alpha: 0.6 }).stroke({ width: 3, color: dk })
      g.roundRect(-17, -8, 34, 18, 2).fill(0xe0392b)
      break
    case 'screw':
      g.roundRect(-6, -6, 38, 13, 3).fill(col).stroke({ width: 3, color: dk })
      for (const sx of [2, 10, 18, 26]) g.moveTo(sx, -6).lineTo(sx - 4, 7).stroke({ width: 2, color: dk })
      g.moveTo(-8, -16).lineTo(-24, -10).lineTo(-24, 11).lineTo(-8, 17).closePath().fill(col).stroke({ width: 3, color: dk })
      break
    case 'coin':
      g.circle(0, 0, 24).fill(col).stroke({ width: 4, color: dk })
      g.circle(0, 0, 15).stroke({ width: 3, color: dk, alpha: 0.7 })
      break
    case 'spoon':
      g.ellipse(0, -18, 12, 17).fill(col).stroke({ width: 3, color: dk })
      g.roundRect(-4, -4, 8, 36, 4).fill(col).stroke({ width: 3, color: dk })
      break
    default: // battery
      g.roundRect(-14, -24, 28, 50, 4).fill(col).stroke({ width: 3, color: dk })
      g.roundRect(-7, -30, 14, 8, 3).fill(0xc3ccd4)
      g.roundRect(-10, -10, 20, 22, 2).fill({ color: 0xffffff, alpha: 0.35 })
      g.moveTo(-3, -6).lineTo(3, 0).lineTo(-3, 2).lineTo(3, 8).stroke({ width: 3, color: dk })
      break
  }
  g.eventMode = 'none'
  return g
}

export default {
  id: 'sortera-skrap',
  titleSv: 'Sortera Skräp',
  icon: '♻️',
  category: 'drag',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'sortera-skrap',
  // Literal, inte VOICE.intro: check.mjs (och därmed /rost) ser bara strängar som
  // står skrivna på plats — en referens gjorde att spelet räknades som röstlöst.
  voiceIntro: 'Hjälp mig sortera skräpet! Dra varje sak till tunnan som passar.',

  init(ctx) {
    this._alive = true
    this._started = false
    this._level = clampLevel(ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)
    // Bakgrundsscen (utomhus-äng) FÖRST så allt innehåll renderas ovanpå.
    this._root.addChild(createScene('meadow'))

    // Spel-lager (tunnor + föremål) och ett fx-lager ovanpå för partiklar/ringar/text.
    this._play = new Container()
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._root.addChild(this._play, this._fx)

    // Lager INUTI play: "behind" (dit ett rätt föremål ploppar ner bakom tunnan) +
    // binsLayer (tunnorna). Föremål läggs direkt i play -> ovanpå tunnorna under drag.
    this._behind = new Container()
    this._binsLayer = new Container()
    this._play.addChild(this._behind, this._binsLayer)

    // EN DragController för hela spelets livstid (space = play). Återställs per runda.
    this._drag = new DragController({ space: this._play, services: ctx.services })

    this._bins = []
    this._items = []
    this._buildRound(ctx, false)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._started = true
    ctx.services.voice.say(this._cue || VOICE.intro)
  },

  // Bygg (eller återuppbygg) en runda: städar föregående, lägger tunnor + en varierad
  // hög med skräp. announce=true talar rundans instruktion.
  _buildRound(ctx, announce = false) {
    if (!this._alive) return
    this._clearHint()

    // --- riv föregående runda (exit-/rebuild-säkert) ---
    this._drag.clear() // tömmer items + targets, dödar item-tweens (ej redan förstörda)
    this._bins?.forEach((b) => killBinTweens(b))
    this._items?.forEach((it) => {
      const c = it.container
      if (c && !c.destroyed) {
        gsap.killTweensOf(c)
        gsap.killTweensOf(c.scale)
        c.destroy({ children: true })
      }
    })
    this._behind.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._binsLayer.removeChildren().forEach((o) => o.destroy({ children: true }))

    this._bins = []
    this._items = []
    this._sorted = 0
    this._idle = 0
    this._roundDone = false

    const lvl = LEVELS[this._level]
    const activeKeys = CAT_ORDER.slice(0, lvl.cats)

    // --- tunnor (responsiv bredd så även 4 får plats) ---
    const gap = 44
    const avail = ctx.width - 120
    const binW = Math.min(300, (avail - (activeKeys.length - 1) * gap) / activeKeys.length)
    const binH = Math.min(232, binW * 0.78)
    const totalW = activeKeys.length * binW + (activeKeys.length - 1) * gap
    const startX = (ctx.width - totalW) / 2 + binW / 2
    const binY = ctx.height - 175
    const hitR = Math.max(140, binW * 0.62)

    activeKeys.forEach((key, i) => {
      const bin = this._makeBin(key, binW, binH)
      bin.x = startX + i * (binW + gap)
      bin.y = binY
      bin._baseY = binY // vilo-y; lasten sänker den (se _settleBin)
      this._binsLayer.addChild(bin)
      this._bins.push(bin)
      this._drag.addTarget(bin, (d) => d.category === key, { hitRadius: hitR })
      bounceIn(bin, { delay: i * 0.06, duration: 0.34 })
    })

    // --- skräp-högen (varierad varje runda) ---
    const batch = this._makeBatch(lvl, activeKeys)
    const spots = layoutItems(ctx, batch.length)
    batch.forEach((data, i) => {
      const c = this._makeItem(data, ITEM_R)
      c.x = spots[i].x
      c.y = spots[i].y
      this._play.addChild(c)
      const it = { container: c, data, sorted: false, lift: 0 }
      c._it = it
      this._items.push(it)

      this._drag.addItem(c, data, {
        onSelect: () => {
          if (!this._alive) return
          this._idle = 0
          this._clearHint()
        },
        onCorrect: (_rec, target) => this._onCorrect(ctx, it, target),
        onWrong: (_rec, target) => this._onWrong(ctx, it, target),
      })
      // Extra: vilken pekning som helst nollställer idle + släcker en lockande puls.
      c.on('pointerdown', () => {
        if (!this._alive) return
        this._idle = 0
        this._clearHint()
      })
      bounceIn(c, { delay: Math.min(i * 0.06, 0.6), duration: 0.32 })
    })

    this._cue = VOICE.cue
    if (announce && this._started) ctx.services.voice.say(this._cue)
  },

  // En varierad, jämnt fördelad hög: round-robin över aktiva kategorier, distinkta
  // föremål per kategori (blandad pool) -> aldrig samma hög två gånger.
  _makeBatch(lvl, activeKeys) {
    const queues = {}
    activeKeys.forEach((k) => (queues[k] = shuffle(CATS[k].items)))
    const batch = []
    for (let i = 0; i < lvl.items; i++) {
      const key = activeKeys[i % activeKeys.length]
      const q = queues[key]
      const emoji = q.length ? q.shift() : randomFrom(CATS[key].items)
      batch.push({ category: key, emoji })
    }
    return shuffle(batch)
  },

  // RÄTT tunna: chime + gnistor + ring + lock-studs + tunna-popp, och föremålet
  // ploppar NER bakom tunnan. (Firande/konfetti sker via progress.complete vid rundslut.)
  _onCorrect(ctx, it, target) {
    if (!this._alive || it.sorted) return
    it.sorted = true
    this._idle = 0
    this._clearHint()

    const bin = target.view
    const mx = bin.x
    const my = bin.y - bin._mouthDY
    const matColor = CATS[bin._cat].color

    // Materialspecifik ljudtextur (glasklang/pappersprassel/plast-studs/mjuk mat-duns)
    // + lock-"klonk" + huvudet TUGGAR belåtet. Juice i materialets egen färg.
    this._materialSound(ctx, bin._cat)
    sparkle(this._fx, mx, my, { count: 8 })
    ripple(this._fx, mx, my, { color: matColor, maxR: bin._w * 0.6, width: 5, alpha: 0.55 })
    puff(this._fx, mx, my, { count: 6, color: matColor })
    // Lasten växer FÖRE lockpoppet: locket studsar då tillbaka till sin NYA, högre
    // vilo-höjd (klumpen under trycker upp det) i stället för att en andra tween
    // ska flytta det efteråt.
    this._fillBin(bin, it.data)
    this._popLid(bin)
    ctx.services.audio.tone({ freq: 150, dur: 0.06, type: 'square', vol: 0.12 }) // lock-"klonk"
    this._chew(bin)
    this._settleBin(bin)
    pop(bin, { scale: 1.05 - 0.035 * binFill(bin) })
    if (Math.random() < 0.55) ctx.services.voice.say(randomFrom(PRAISE_SV))
    if (Math.random() < 0.4) floatText(this._fx, mx, my - 10, '⭐', { fontSize: 44, rise: 64 })

    this._dropIntoBin(it, bin)

    this._sorted++
    if (this._sorted >= this._items.length) this._onRoundDone(ctx)
  },

  // FEL tunna: DragController har redan spelat 'soft' + snäppt hem. Lägg på vänlig
  // vingel + liten puff, och tunnan SKAKAR PÅ HUVUDET ("inte min sort!"). Aldrig en
  // bestraffning.
  _onWrong(ctx, it, target) {
    if (!this._alive || it.sorted) return
    this._idle = 0
    wiggle(it.container)
    puff(this._fx, it.container.x, it.container.y, { count: 6 })
    if (target && target.view && !target.view.destroyed) this._headShake(target.view)
    if (Math.random() < 0.4) ctx.services.voice.say(VOICE.tryAgain)
  },

  // Föremålet faller ner i tunnan: flytta bakom tunnan, sjunk + krymp + tona bort.
  _dropIntoBin(it, bin) {
    const c = it.container
    if (!c || c.destroyed) return
    this._behind.addChild(c) // bakom tunnan (samma origo i play -> koordinater oförändrade)
    gsap.killTweensOf(c)
    gsap.killTweensOf(c.scale)
    if (c._shadow && !c._shadow.destroyed) c._shadow.alpha = 0
    const tl = gsap.timeline()
    tl.to(c, { y: bin.y + bin._h * 0.16, duration: 0.3, ease: 'power1.in' })
    tl.to(c.scale, { x: 0.25, y: 0.25, duration: 0.3, ease: 'power1.in' }, '<')
    tl.to(c, { alpha: 0, duration: 0.16 }, '-=0.16')
    tl.call(() => {
      if (!c.destroyed) c.destroy({ children: true })
    })
  },

  // En svald sak blir en synlig klump INUTI tunnan — i sakens egen färg — och lasten
  // trycker upp locket. Klumpen föds när saken faktiskt landat (samma 0,3 s som
  // _dropIntoBin tar), så orsaken syns: saken åker ner, locket lyfts av det som kom in.
  _fillBin(bin, data) {
    if (!bin || bin.destroyed) return
    const i = bin._eaten
    bin._eaten = i + 1
    const lid = bin._lid
    if (lid && !lid.destroyed) bin._lidBaseY = bin._lidY0 - HEAP_LIFT * Math.min(bin._eaten, HEAP_CAP)
    if (i >= HEAP_CAP) return
    const col = (TRASH_ART[data?.emoji] || [])[1] ?? CATS[bin._cat].color
    gsap.delayedCall(0.3, () => {
      if (!this._alive || bin.destroyed || !bin._heap || bin._heap.destroyed) return
      // Halsen växer först (locket får något att vila på), sedan läggs klumpen ovanpå.
      const H = HEAP_LIFT * Math.min(bin._eaten, HEAP_CAP)
      const neck = bin._neck
      if (neck && !neck.destroyed) {
        // Halsen slutar precis under lockets underkant (locket vilar på lasten), så de
        // översta klumparna sticker upp UR den i stället för att begravas i den.
        neck.clear().roundRect(-bin._w * 0.44, -H + 4, bin._w * 0.88, H + 10, 11).fill(bin._neckCol)
      }
      const lump = new Graphics()
        .roundRect(-21, -12, 42, 24, 10)
        .fill(col)
        .stroke({ width: 3, color: lerpColor(col, 0x000000, 0.35) })
      lump.position.set((Math.random() * 2 - 1) * bin._w * 0.22, 2 - HEAP_LIFT * i)
      lump.rotation = (Math.random() * 2 - 1) * 0.42
      lump.eventMode = 'none'
      lump.scale.set(0.35)
      bin._heap.addChild(lump)
      gsap.to(lump.scale, { x: 1, y: 1, duration: 0.26, ease: 'back.out(2.2)' })
    })
  },

  // Tyngden. Tunnan sätter sig i marken för varje sak: guppet blir DJUPARE, sättningen
  // LÅNGSAMMARE och skuggan bredare ju fullare den är. Bara y tweenas (rotationen ägs av
  // _headShake) så en vänlig huvudskakning aldrig lämnar tunnan hängande vid sidan om
  // sitt viloläge.
  _settleBin(bin) {
    if (!bin || bin.destroyed) return
    const sag = bin._sag
    if (!sag || sag.destroyed) return
    const f = binFill(bin)
    const rest = HEAP_SINK * f
    gsap.killTweensOf(sag, 'y')
    gsap
      .timeline()
      .to(sag, { y: rest + 4 + 9 * f, duration: 0.09 + 0.05 * f, ease: 'power2.out' })
      .to(sag, { y: rest, duration: 0.3 + 0.3 * f, ease: 'bounce.out' })
    const sh = bin._shadowG
    if (sh && !sh.destroyed) {
      gsap.killTweensOf(sh.scale)
      gsap.to(sh.scale, { x: 1 + 0.12 * f, duration: 0.4, ease: 'power2.out' })
    }
  },

  // Rundslut: varje tunna som ätit RAPAR belåtet — locket lättar, lasten skakar till och
  // en låg ton glider NEDÅT och dör ut. Ett skämt, aldrig en summer.
  _burp(ctx, bin) {
    if (!this._alive || !bin || bin.destroyed || !bin._eaten) return
    const lid = bin._lid
    if (lid && !lid.destroyed) {
      gsap.killTweensOf(lid)
      gsap
        .timeline()
        .to(lid, { y: bin._lidBaseY - 26, rotation: 0.13, duration: 0.14, ease: 'power2.out' })
        .to(lid, { y: bin._lidBaseY, rotation: 0, duration: 0.44, ease: 'bounce.out' })
    }
    const heap = bin._heap
    if (heap && !heap.destroyed) {
      gsap.killTweensOf(heap.scale)
      gsap.fromTo(heap.scale, { x: 1, y: 1 }, { x: 1.1, y: 0.86, duration: 0.11, yoyo: true, repeat: 3, ease: 'sine.inOut' })
    }
    ctx.services.audio.tone({ freq: 190, dur: 0.3, type: 'sawtooth', vol: 0.13, slideTo: 78 })
    puff(this._fx, bin.x, bin.y - bin._h / 2 - 34, { count: 5, color: CATS[bin._cat].color })
  },

  // Locket "poppar" upp och studsar tillbaka (avslöjar den mörka munnen).
  _popLid(bin) {
    const lid = bin._lid
    if (!lid || lid.destroyed) return
    gsap.killTweensOf(lid)
    const baseY = bin._lidBaseY
    gsap
      .timeline()
      .to(lid, { y: baseY - 16, rotation: -0.06, duration: 0.1, ease: 'power2.out' })
      .to(lid, { y: baseY, rotation: 0, duration: 0.28, ease: 'bounce.out' })
  },

  // Materialspecifik ljudtextur (helt syntetiserad via audio.tone → inget nytt klipp):
  // glas klingar ljust, papper prasslar i korta blip, plast studsar, mat dunsar mjukt.
  _materialSound(ctx, key) {
    const a = ctx.services.audio
    switch (key) {
      case 'glasmetall': // glasklang: två ljusa pling
        a.tone({ freq: 1320, dur: 0.12, type: 'sine', vol: 0.16, slideTo: 1760 })
        a.tone({ freq: 1980, dur: 0.14, type: 'sine', vol: 0.1, delay: 0.06 })
        break
      case 'papper': // pappersprassel: korta ljusa triangelblip
        a.tone({ freq: 760, dur: 0.05, type: 'triangle', vol: 0.1 })
        a.tone({ freq: 900, dur: 0.05, type: 'triangle', vol: 0.09, delay: 0.05 })
        a.tone({ freq: 680, dur: 0.05, type: 'triangle', vol: 0.08, delay: 0.1 })
        break
      case 'plast': // plast-studs: liten "boing"
        a.tone({ freq: 300, dur: 0.16, type: 'square', vol: 0.14, slideTo: 620 })
        break
      case 'mat': // mjuk duns
        a.tone({ freq: 200, dur: 0.16, type: 'sine', vol: 0.2, slideTo: 120 })
        break
      default:
        a.sfx('pling')
    }
  },

  // Huvudet TUGGAR belåtet vid rätt släpp (munnen gapar och tuggar ihop). Flaggan
  // _chewing pausar den gaze-drivna gapningen i _update medan tuggningen spelar.
  _chew(bin) {
    const m = bin._mouth
    if (!m || m.destroyed) return
    bin._chewing = true
    gsap.killTweensOf(m.scale)
    gsap
      .timeline({
        onComplete: () => {
          if (!bin.destroyed) bin._chewing = false
        },
      })
      .to(m.scale, { y: 2.4, duration: 0.1, ease: 'power2.out' })
      .to(m.scale, { y: 1.2, duration: 0.12, ease: 'power2.in' })
      .to(m.scale, { y: 2.0, duration: 0.1 })
      .to(m.scale, { y: 1, duration: 0.16, ease: 'power2.inOut' })
  },

  // Tunnan skakar vänligt på huvudet vid fel sort ("inte min sort!") — aldrig en
  // bestraffning, bara en gullig "nej tack". Rotation dödas i killBinTweens/destroy.
  _headShake(bin) {
    if (!bin || bin.destroyed) return
    gsap.killTweensOf(bin, 'rotation') // BARA rotationen — y ägs av _settleBin
    gsap
      .timeline()
      .to(bin, { rotation: 0.12, duration: 0.08 })
      .to(bin, { rotation: -0.12, duration: 0.1 })
      .to(bin, { rotation: 0.08, duration: 0.09 })
      .to(bin, { rotation: 0, duration: 0.12 })
  },

  // Rundan klar: höj nivå, gnist-svep över tunnorna, sedan delat firande
  // (celebrate-sfx + beröm + konfetti + stjärna + klistermärke via progress.complete —
  // INTE duplicerat här) + en mjuk glad skakning. Sedan en ny, lite större runda.
  _onRoundDone(ctx) {
    if (!this._alive || this._roundDone) return
    this._roundDone = true
    this._clearHint()
    this._level = clampLevel(this._level + 1)
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)

    this._bins.forEach((b, i) => {
      gsap.delayedCall(0.05 * i, () => {
        if (!this._alive || b.destroyed) return
        sparkle(this._fx, b.x, b.y - b._mouthDY, { count: 6 })
      })
      // ...och en belåten rap från var och en som faktiskt ätit (staplad så de rapar
      // efter varandra i stället för i kör).
      gsap.delayedCall(0.3 + 0.22 * i, () => this._burp(ctx, b))
    })

    gsap.delayedCall(0.4, () => {
      if (!this._alive) return
      ctx.progress.complete()
      shake(this._root, { intensity: 5, duration: 0.5 })
    })

    gsap.delayedCall(1.8, () => {
      if (!this._alive) return
      this._buildRound(ctx, true)
    })
  },

  // Per-bild: mjuk lyft-känsla (skugga växer + skivan stiger) medan ett föremål hålls.
  // Plus lugn idle-lockelse efter ~6s.
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    const k = Math.min(1, dt * 12)

    for (const it of this._items) {
      const c = it.container
      if (!c || c.destroyed || it.sorted) continue
      const lifted = this._drag.active?.view === c || this._drag.selected?.view === c
      it.lift += ((lifted ? 1 : 0) - it.lift) * k
      if (c._content && !c._content.destroyed) c._content.y = -22 * it.lift
      if (c._shadow && !c._shadow.destroyed) {
        const s = 1 + 0.5 * it.lift
        c._shadow.scale.set(s)
        c._shadow.alpha = 0.26 - 0.1 * it.lift
      }
    }

    // Tunn-varelser: pupillerna FÖLJER det man håller, och munnen GAPAR när saken
    // närmar sig öppningen (pausas medan en tugg-animation spelar). Rent per-bild-
    // satta värden (inga tweens) → exit-säkert; tunnan förstörs med sina barn.
    const held = this._drag?.active?.view || this._drag?.selected?.view || null
    const heldLive = held && !held.destroyed ? held : null
    for (const bin of this._bins) {
      if (!bin || bin.destroyed) continue
      let tx = 0
      let ty = 3 // vila: titta lite nedåt mot magen
      if (heldLive) {
        const dx = heldLive.x - bin.x
        const dy = heldLive.y - (bin.y + bin._eyeY)
        const d = Math.hypot(dx, dy) || 1
        tx = (dx / d) * bin._eyeMax
        ty = (dy / d) * bin._eyeMax
      }
      if (bin._pupils) {
        for (const pu of bin._pupils) {
          if (pu.destroyed) continue
          pu.x += (tx - pu.x) * k
          pu.y += (ty - pu.y) * k
        }
      }
      if (bin._mouth && !bin._mouth.destroyed && !bin._chewing) {
        let gape = 0
        if (heldLive) {
          const dx = heldLive.x - bin.x
          const dyv = heldLive.y - (bin.y - bin._mouthDY)
          gape = Math.max(0, 1 - Math.hypot(dx, dyv) / 260)
        }
        bin._gapeCur += (gape - bin._gapeCur) * k
        bin._mouth.scale.y = 1 + bin._gapeCur * 1.4
      }
    }

    if (this._roundDone) return
    this._idle += dt
    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(this._cue || VOICE.cue)
      this._clearHint()
      const pool = this._items.filter((it) => !it.sorted && !it.container.destroyed)
      if (pool.length) {
        const it = randomFrom(pool)
        this._hintItem = it
        this._hintTween = breathe(it.container, { scale: 1.1, duration: 0.7 })
        const bin = this._bins.find((b) => b._cat === it.data.category)
        if (bin && !bin.destroyed) {
          ripple(this._fx, bin.x, bin.y - bin._mouthDY, { color: 0xffffff, maxR: bin._w * 0.5, width: 5, alpha: 0.5 })
        }
      }
    }
  },

  _clearHint() {
    if (this._hintTween) {
      this._hintTween.kill()
      this._hintTween = null
    }
    const it = this._hintItem
    this._hintItem = null
    if (it && it.container && !it.container.destroyed && !it.sorted) {
      const c = it.container
      const active = this._drag?.active?.view === c || this._drag?.selected?.view === c
      if (!active) {
        gsap.killTweensOf(c.scale)
        c.scale.set(1)
      }
    }
  },

  // --- grafik (rena Graphics/Text, inga tillgångar) ---

  _makeBin(key, w, h) {
    const cat = CATS[key]
    const base = cat.color
    const light = lerpColor(base, 0xffffff, 0.2)
    const dark = lerpColor(base, 0x000000, 0.18)

    const bin = new Container()
    bin._cat = key
    bin._w = w
    bin._h = h
    bin._mouthDY = h / 2 - 18 // munnens y-offset (vid övre kanten) för effekter

    // Mjuk markskugga.
    const shadow = new Graphics().ellipse(0, h / 2 + 8, w * 0.52, 18).fill({ color: 0x2a1c10, alpha: 0.2 })
    // Kropp + vit kant.
    const body = new Graphics().roundRect(-w / 2, -h / 2, w, h, 26).fill(base).stroke({ width: 6, color: 0xffffff, alpha: 0.55 })
    // Ljusare inre panel (djup).
    const panel = new Graphics().roundRect(-w / 2 + 12, -h / 2 + 34, w - 24, h - 50, 16).fill({ color: light, alpha: 0.22 })
    // Vänster ljus-stripe.
    const hi = new Graphics().roundRect(-w / 2 + 12, -h / 2 + 14, 13, h - 28, 6).fill({ color: 0xffffff, alpha: 0.18 })
    // Gapande "mun" (öppning) nära toppen — egen container så den kan GAPA nedåt
    // (scale.y) när en sak närmar sig och TUGGA belåtet vid rätt släpp, utan att
    // själva öppningen flyttar sig (pivot i munnens överkant).
    const mouth = new Container()
    mouth.position.set(0, -h / 2 + 8)
    mouth.addChild(new Graphics().roundRect(-w * 0.32, 0, w * 0.64, 18, 9).fill({ color: 0x201814, alpha: 0.42 }))
    mouth.addChild(new Graphics().roundRect(-w * 0.24, 3, w * 0.48, 9, 5).fill({ color: 0x000000, alpha: 0.3 }))
    bin._mouth = mouth
    bin._gapeCur = 0
    bin._chewing = false

    // Ögon (varelse-känsla): vita + pupiller som FÖLJER det man håller (se _update).
    const eyeY = -h * 0.16
    const eyeDX = w * 0.2
    const eyeWR = Math.max(12, w * 0.1)
    const pupilR = eyeWR * 0.46
    const eyes = new Container()
    bin._pupils = []
    bin._eyeY = eyeY
    bin._eyeMax = eyeWR * 0.42
    for (const sx of [-1, 1]) {
      // Varje öga är en egen container (vita + pupill med bakad mitt), positionerad i
      // ögonhålan. Pupillen flyttas med SMÅ offset kring sin bakade mitt (0,2) — samma
      // beprövade mönster som nallen/kompisarna; undviker bounds-glitchen som uppstod
      // när en bar Graphics fick en stor .position.
      const eye = new Container()
      eye.position.set(sx * eyeDX, eyeY)
      eye.addChild(new Graphics().circle(0, 0, eyeWR).fill(0xffffff).stroke({ width: 3, color: dark, alpha: 0.5 }))
      const pupil = new Graphics().circle(0, 2, pupilR).fill(0x2a2320)
      eye.addChild(pupil)
      eyes.addChild(eye)
      bin._pupils.push(pupil)
    }

    // Kategori-ikon som mage-bricka: vit skiva + emoji (ingen läsning krävs).
    const iconDisc = new Graphics().circle(0, h * 0.2, w * 0.17).fill({ color: 0xffffff, alpha: 0.92 })
    const iconEmoji = drawTrash(cat.icon)
    iconEmoji.scale.set(w * 0.0042)
    iconEmoji.position.set(0, h * 0.2)
    // Lock (studsar vid rätt släpp) med liten knopp.
    const lidW = w * 0.96
    const lidH = 24
    const lid = new Graphics()
      .roundRect(-lidW / 2, -lidH / 2, lidW, lidH, 12)
      .fill(dark)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.5 })
    lid.roundRect(-lidW * 0.09, -lidH / 2 - 9, lidW * 0.18, 11, 5).fill(dark)
    lid.y = -h / 2 - 6
    bin._lid = lid
    bin._lidBaseY = lid.y
    bin._lidY0 = lid.y // tom tunna; lasten höjer _lidBaseY härifrån

    // Lasten: klumpar som staplas i tunnans öppning och lyfter locket. Ligger under
    // locket i z-led så locket alltid vilar OVANPÅ högen.
    //
    // ⚠️ Halsen (`neck`) är inte dekoration. Utan den syntes HIMLEN mellan det upplyfta
    // locket och högen — klumparna täcker bara mitten, och tunnan såg trasig ut i stället
    // för full. Halsen är en solid massa i tunnans egen mörka ton som växer med lasten,
    // så locket vilar på något.
    const heap = new Container()
    heap.eventMode = 'none'
    heap.position.set(0, -h / 2)
    const neck = new Graphics()
    neck.eventMode = 'none'
    heap.addChild(neck)
    bin._heap = heap
    bin._neck = neck
    // Mörkare än locket (som är `dark`): halsen ska läsas som tunnans INSIDA i skugga,
    // inte som ett andra lock. Med lockets egen ton smälte de ihop till en hög hatt.
    bin._neckCol = lerpColor(base, 0x000000, 0.4)
    bin._eaten = 0
    bin._shadowG = shadow

    // ⚠️ SÄTTNINGEN SKER I ETT INRE LAGER, inte på `bin` självt. `DragController` mäter
    // avståndet till `target.view.x/y` NÄR saken släpps — hade tunnan sjunkit 13 px mitt i
    // sitt gupp hade själva MÅLET flyttat sig undan mitt i ett släpp. Testloggen fångade
    // exakt det: `snal-snappyta`, ett släpp 2 px utanför radien. Träffytan sitter också på
    // `bin` och står därmed still (P0: ytan får aldrig hoppa runt).
    const sag = new Container()
    sag.addChild(shadow, body, panel, hi, mouth, eyes, iconDisc, iconEmoji, heap, lid)
    bin._sag = sag
    bin.addChild(sag)

    // Generös, exakt träffyta (mjukt utökad).
    bin.hitArea = { contains: (px, py) => Math.abs(px) <= w / 2 + 14 && py >= -h / 2 - 18 && py <= h / 2 + 14 }
    return bin
  },

  _makeItem(data, r) {
    const c = new Container()
    c._data = data
    // Mjuk skugga (växer när föremålet lyfts — se _update).
    const shadow = new Graphics().ellipse(0, r * 0.98, r * 0.84, r * 0.3).fill({ color: 0x2a1c10, alpha: 0.26 })
    shadow.eventMode = 'none'
    // Innehåll (lyfts uppåt vid grepp).
    const content = new Container()
    // P0 ASSETS: föremålet står FRITT. Den opaka cream-skivan bakom var precis
    // den bricka regeln förbjuder; kvar är ett svagt sken så saken syns mot både
    // himmel och gräs.
    const disc = new Graphics().circle(0, 0, r * 0.9).fill({ color: 0xffffff, alpha: 0.25 })
    const emoji = drawTrash(data.emoji)
    emoji.scale.set(r / 50)
    content.addChild(disc, emoji)

    c.addChild(shadow, content)
    c._shadow = shadow
    c._content = content
    c.rotation = (Math.random() * 2 - 1) * 0.22 // slängd hög → tydligare lutning
    // Stor, stabil träffyta (oberoende av lyft-offset).
    c.hitArea = { contains: (px, py) => px * px + py * py <= (r + 18) * (r + 18) }
    return c
  },

  destroy(ctx) {
    this._alive = false
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)
    this._clearHint()
    // VIKTIGT: DragController river lyssnare + dödar item-tweens (snäpp/skala).
    this._drag?.destroy()
    this._drag = null
    this._bins?.forEach((b) => killBinTweens(b))
    this._items?.forEach((it) => {
      const c = it.container
      if (c && !c.destroyed) {
        gsap.killTweensOf(c)
        gsap.killTweensOf(c.scale)
      }
    })
    gsap.killTweensOf(this._root)
    gsap.killTweensOf(this._play)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
    this._play = null
    this._fx = null
    this._behind = null
    this._binsLayer = null
    this._bins = null
    this._items = null
    this._hintItem = null
    this._hintTween = null
  },
}

// --- hjälpare ---

function killBinTweens(b) {
  if (!b || b.destroyed) return
  gsap.killTweensOf(b)
  gsap.killTweensOf(b.scale)
  if (b._lid && !b._lid.destroyed) gsap.killTweensOf(b._lid)
  if (b._mouth && !b._mouth.destroyed) gsap.killTweensOf(b._mouth.scale)
  if (b._sag && !b._sag.destroyed) gsap.killTweensOf(b._sag)
  if (b._shadowG && !b._shadowG.destroyed) gsap.killTweensOf(b._shadowG.scale)
  if (b._heap && !b._heap.destroyed) {
    gsap.killTweensOf(b._heap.scale)
    for (const l of b._heap.children) if (!l.destroyed) gsap.killTweensOf(l.scale)
  }
}

// Hur full tunnan är, 0–1 (mättad vid HEAP_CAP). Styr guppets djup, sättningens längd,
// hur lite den orkar studsa och hur bred skuggan blir.
function binFill(b) {
  return Math.min(b?._eaten || 0, HEAP_CAP) / HEAP_CAP
}

// Lägg ut föremålen i en lätt klustrad, "slängd" hög (1–2 rader, centrerade) ovanför
// tunnorna, med jitter i x/y så det ser ut som riktigt skräp — inte en prydlig tabell.
function layoutItems(ctx, n) {
  const perRow = n <= 5 ? n : Math.ceil(n / 2)
  const rows = Math.ceil(n / perRow)
  const spacingX = 168
  const spacingY = 150
  const centerY = 255
  const yTop = centerY - ((rows - 1) * spacingY) / 2
  const jit = (m) => (Math.random() * 2 - 1) * m
  const spots = []
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow)
    const cols = row < rows - 1 ? perRow : n - perRow * (rows - 1)
    const idx = i - row * perRow
    const rowW = (cols - 1) * spacingX
    spots.push({ x: ctx.width / 2 - rowW / 2 + idx * spacingX + jit(30), y: yTop + row * spacingY + jit(22) })
  }
  return spots
}

function clampLevel(l) {
  return Math.max(0, Math.min(LEVELS.length - 1, l))
}
