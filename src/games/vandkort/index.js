// Vändkort — minne/par (2–5 år). Marknadsmässig uppgradering: en levande scen,
// premium-kort med mönstrad baksida, mjuk skugga och en saftig 3D-aktig vändning
// (skala.x -> 0 -> visa framsida -> tillbaka). Par firas med popp + gnistor + ton;
// fel par vänds vänligt tillbaka (ALDRIG en bestraffning). När brädet är tomt:
// firande (delat via progress.complete) + mjuk skakning, och ett nytt, lite större
// och TEMA-VARIERAT bräde fylls på. Inga felsteg, ingen timer, inga poäng.
// All transient-effekt går via lib/feedback.js (exit-säkert).
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { shuffle } from '../../lib/swedish.js'
import { createScene, lerpColor } from '../../lib/scene.js'
import { bounceIn, sparkle, pop, ripple, breathe, shake, floatText, wiggle } from '../../lib/feedback.js'
import { COLORS } from '../../lib/theme.js'

// DJUP: rutnätet växer gradvis. Strikt felfritt — bara större, aldrig svårare-på-fel-sätt.
const LEVELS = [
  { pairs: 2, cols: 2 }, // 2x2
  { pairs: 3, cols: 3 }, // 3x2
  { pairs: 4, cols: 4 }, // 4x2
  { pairs: 6, cols: 4 }, // 4x3
  { pairs: 8, cols: 4 }, // 4x4
]

// VARIATION: korttema byts varje runda (djur/frukt/fordon/figurer/havsdjur) så att
// det aldrig blir samma bräde två gånger. name = talad svensk form, scene = bakgrund,
// back/accent = kortfärger, emblem = liten symbol på baksidan.
const SETS = [
  { name: 'djuren', kind: 'animal', scene: 'meadow', back: COLORS.green, accent: COLORS.greenDark, emblem: '🐾',
    symbols: ['🐶', '🐱', '🦊', '🐰', '🐻', '🦁', '🐸', '🐵', '🐼', '🐧', '🐮', '🐷'] },
  { name: 'frukterna', kind: 'fruit', scene: 'warm', back: COLORS.red, accent: COLORS.orangeDark, emblem: '🍃',
    symbols: ['🍎', '🍌', '🍓', '🍇', '🍊', '🍉', '🍐', '🍒', '🥝', '🍑', '🥥', '🍍'] },
  { name: 'fordonen', kind: 'vehicle', scene: 'sky', back: COLORS.blue, accent: COLORS.teal, emblem: '⭐',
    symbols: ['🚗', '🚒', '🚜', '🚌', '🚲', '🚁', '🚂', '🚀', '⛵', '🚓', '🚑', '🚕'] },
  { name: 'figurerna', kind: 'figure', scene: 'candy', back: COLORS.purple, accent: COLORS.pink, emblem: '✨',
    symbols: ['⭐', '❤️', '🔵', '🟢', '🟡', '🟣', '🔶', '🌸', '🌙', '🍀', '🔺', '💎'] },
  { name: 'havsdjuren', kind: 'sea', scene: 'water', back: COLORS.teal, accent: COLORS.blue, emblem: '🐚',
    symbols: ['🐠', '🐙', '🐳', '🦀', '🐬', '🐡', '🐢', '🦈', '🦐', '🐚', '🦑', '🪼'] },
]

// TEMA-BELÖNING: när ett par hittas ska symbolen "göra något". För djur/havsdjur knyter vi
// an till riktiga offline-klipp (audio.sample) där de finns, annars talas djurets namn.
// ASCII-nycklar (asciiFold) matchar public/audio/sfx/djur_*.mp3.
const ANIMAL_SOUND = { '🐶': 'djur_hund', '🐱': 'djur_katt', '🐮': 'djur_ko', '🐷': 'djur_gris', '🐸': 'djur_groda' }
const ANIMAL_NAME = { '🦊': 'Räv', '🐰': 'Kanin', '🐻': 'Björn', '🦁': 'Lejon', '🐵': 'Apa', '🐼': 'Panda', '🐧': 'Pingvin' }
const SEA_NAME = { '🐠': 'Fisk', '🐙': 'Bläckfisk', '🐳': 'Val', '🦀': 'Krabba', '🐬': 'Delfin', '🐡': 'Blåsfisk', '🐢': 'Sköldpadda', '🦈': 'Haj', '🦐': 'Räka', '🐚': 'Snäcka', '🦑': 'Bläckfisk', '🪼': 'Manet' }

export default {
  id: 'vandkort',
  titleSv: 'Vändkort',
  icon: '🃏',
  category: 'minne',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'vandkort',
  voiceIntro: 'Vänd korten och hitta paren som hör ihop!',

  init(ctx) {
    this._alive = true
    this._started = false
    this._level = clampLevel(ctx.progress.get().highestLevel | 0)
    this._setIdx = (Math.random() * SETS.length) | 0
    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._build(ctx, false)
    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._started = true
    ctx.services.voice.say(this._cue || this.voiceIntro)
  },

  // Bygg (eller återuppbygg) ett bräde. announce=true talar rundans instruktion.
  _build(ctx, announce = false) {
    if (!this._alive) return

    // --- riv föregående bräde (exit-/rebuild-säkert) ---
    this._clearHint()
    this._cards?.forEach((c) => {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
    })
    this._root.removeChildren().forEach((o) => o.destroy({ children: true }))

    this._cards = []
    this._first = null
    this._busy = false
    this._matched = 0
    this._cleared = false
    this._idle = 0

    const set = SETS[this._setIdx]
    this._set = set // aktivt tema (används av tema-belöningen när ett par hittas)

    // Bakgrundsscen (varierar med temat).
    this._root.addChild(createScene(set.scene))
    // Kort-lager + ett fx-lager ovanpå för ringar/gnistor/text (städas med roten).
    this._layer = new Container()
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._root.addChild(this._layer, this._fx)

    const lvl = LEVELS[this._level]
    const chosen = shuffle(set.symbols).slice(0, lvl.pairs)
    const deck = shuffle([...chosen, ...chosen])
    const cols = lvl.cols
    const rows = Math.ceil(deck.length / cols)

    // --- responsiv kortstorlek så även 4x4 får plats (och 2x2 inte blir jättelikt) ---
    const gap = 22
    const topPad = 132 // plats för hem-/högtalarknapp högst upp
    const availW = ctx.width - 120
    const availH = ctx.height - topPad - 46
    const AR = 0.8 // bredd/höjd
    let cardW = (availW - (cols - 1) * gap) / cols
    let cardH = cardW / AR
    const maxH = (availH - (rows - 1) * gap) / rows
    if (cardH > maxH) {
      cardH = maxH
      cardW = cardH * AR
    }
    cardW = Math.min(cardW, 208)
    cardH = cardW / AR

    const gridW = cols * cardW + (cols - 1) * gap
    const gridH = rows * cardH + (rows - 1) * gap
    const startX = (ctx.width - gridW) / 2 + cardW / 2
    const startY = topPad + (availH - gridH) / 2 + cardH / 2

    deck.forEach((symbol, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const card = this._makeCard(ctx, symbol, cardW, cardH, set)
      card.x = startX + col * (cardW + gap)
      card.y = startY + row * (cardH + gap)
      this._layer.addChild(card)
      this._cards.push(card)
      // Studsande "dela ut"-entré med liten stagger.
      bounceIn(card, { delay: Math.min(i * 0.05, 0.7), duration: 0.32 })
    })

    this._cue = `Hitta ${set.name} som hör ihop!`
    if (announce && this._started) ctx.services.voice.say(this._cue)

    // Rotera temat för NÄSTA runda (garanterar variation).
    this._setIdx = (this._setIdx + 1) % SETS.length

    // "Titta först"-peek för de yngsta (nivå 0–1): visa alla kort en stund, vänd
    // ner mjukt och säg "kom ihåg!" — sänker tröskeln utan att bli svårare.
    if (this._level <= 1) this._peekBoard(ctx)
  },

  // Kort förhandstitt: efter att korten delats ut vänds alla upp ~1,5s, sedan ner.
  // Blockerar tryck under tiden (inget negativt — bara "titta"). Exit-/rebuild-säkert.
  _peekBoard(ctx) {
    this._busy = true
    gsap.delayedCall(1.1, () => {
      if (!this._alive || this._cleared) return
      this._cards?.forEach((c) => this._showFace(c, true))
      ctx.services.voice.say('Titta noga på korten!')
      gsap.delayedCall(1.5, () => {
        if (!this._alive || this._cleared) return
        this._cards?.forEach((c) => {
          if (!c.destroyed && !c._done) this._showFace(c, false)
        })
        this._busy = false
        this._idle = 0
        gsap.delayedCall(0.35, () => {
          if (this._alive && !this._cleared) ctx.services.voice.say('Kom ihåg!')
        })
      })
    })
  },

  _makeCard(ctx, symbol, w, h, set) {
    const card = new Container()
    card._symbol = symbol
    card._flipped = false
    card._done = false
    card._w = w
    card._h = h
    const radius = Math.max(16, w * 0.14)

    // Mjuk skugga (offset, låg alpha) — djup utan filter.
    const shadow = new Graphics().roundRect(-w / 2 + 3, -h / 2 + 8, w, h, radius).fill({ color: 0x16314a, alpha: 0.16 })

    const backView = makeBackView(w, h, radius, set)
    const frontView = makeFrontView(w, h, radius, symbol, set)
    frontView.visible = false

    card.addChild(shadow, backView, frontView)
    card._backView = backView
    card._frontView = frontView

    card.eventMode = 'static'
    card.cursor = 'pointer'
    card.hitArea = { contains: (px, py) => Math.abs(px) <= w / 2 + 12 && Math.abs(py) <= h / 2 + 12 }
    card.on('pointertap', () => this._flip(ctx, card))
    return card
  },

  _flip(ctx, card) {
    if (!this._alive || this._busy || this._cleared || card._flipped || card._done) return
    this._idle = 0
    this._clearHint()

    // Direkt återkoppling < 100ms: ring + vänd-ljud, sedan vändningen.
    ripple(this._fx, card.x, card.y, { color: 0xffffff, maxR: card._w * 0.75, width: 5, alpha: 0.55 })
    ctx.services.audio.sfx('flip')
    this._showFace(card, true)

    if (!this._first) {
      this._first = card
      return
    }

    this._busy = true
    const a = this._first
    const b = card
    this._first = null

    if (a._symbol === b._symbol) {
      // PAR: kort paus så barnet hinner se båda, sedan firande.
      gsap.delayedCall(0.4, () => {
        if (!this._alive || a.destroyed || b.destroyed) return
        a._done = b._done = true
        this._matched++
        // Stigande kombo-pling: tonhöjden klättrar för varje funnet par mot tomt bräde.
        const freq = 440 + (this._matched - 1) * 90
        ctx.services.audio.tone({ freq, dur: 0.16, type: 'sine', vol: 0.32, slideTo: freq * 1.5 })
        this._celebratePair(a)
        this._celebratePair(b)
        this._rewardPair(ctx, a, b) // temat får mening: djurläte / mums / vroom / magi
        floatText(this._fx, (a.x + b.x) / 2, Math.min(a.y, b.y) - a._h * 0.35, '⭐', { fontSize: a._h * 0.4, rise: 70 })
        this._busy = false
        if (this._matched >= LEVELS[this._level].pairs) this._onCleared(ctx)
      })
    } else {
      // INGET par: vänlig vingel och mjuk ton, vänd sedan tillbaka. Ingen bestraffning.
      gsap.delayedCall(0.85, () => {
        if (!this._alive || a.destroyed || b.destroyed) return
        ctx.services.audio.sfx('soft')
        // Saftigare (men vänlig) miss: korten "skakar nej" mot varandra + vinglar,
        // vänds sedan tillbaka. Aldrig en bestraffning — bara lekfullt.
        const dir = Math.sign(b.x - a.x) || 1
        gsap.to(a, { x: a.x + dir * 10, duration: 0.07, yoyo: true, repeat: 3, ease: 'sine.inOut' })
        gsap.to(b, { x: b.x - dir * 10, duration: 0.07, yoyo: true, repeat: 3, ease: 'sine.inOut' })
        wiggle(a)
        wiggle(b)
        this._showFace(a, false)
        this._showFace(b, false)
        this._busy = false
      })
    }
  },

  // 3D-aktig vändning: krymp på x, byt synlig sida vid mitten, väx tillbaka.
  _showFace(card, faceUp) {
    if (!this._alive || card.destroyed) return
    card._flipped = faceUp
    gsap.killTweensOf(card.scale)
    gsap.to(card.scale, {
      x: 0,
      duration: 0.13,
      ease: 'power2.in',
      onComplete: () => {
        if (!this._alive || card.destroyed) return
        card._backView.visible = !faceUp
        card._frontView.visible = faceUp
        gsap.to(card.scale, { x: 1, duration: 0.17, ease: 'back.out(2)' })
      },
    })
  },

  // Glad markering av ett funnet par: grön glöd + popp + gnistor.
  _celebratePair(card) {
    if (!this._alive || card.destroyed) return
    const w = card._w
    const h = card._h
    const r = Math.max(16, w * 0.14)
    const glow = new Graphics().roundRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16, r + 6).fill({ color: COLORS.green, alpha: 0.3 })
    card.addChildAt(glow, card.getChildIndex(card._frontView))
    card._frontView.addChild(new Graphics().roundRect(-w / 2, -h / 2, w, h, r).stroke({ width: 6, color: COLORS.green, alpha: 0.95 }))
    pop(card)
    sparkle(this._fx, card.x, card.y, { count: 8 })
  },

  // Tema-belöning: paret GÖR något så "två lika bilder" blir en liten belöningsscen.
  // Djur/havsdjur hörs (riktigt klipp via sample, annars talat namn), frukt "mumsas",
  // fordon kör iväg (whoosh), figurer glittrar (magi/reveal). Ett glatt skutt på båda korten.
  // Ljudet läggs strax efter kombo-pling:t så de inte krockar. Exit-säkert (killTweensOf i destroy).
  _rewardPair(ctx, a, b) {
    if (!this._alive) return
    const set = this._set
    const sym = a._symbol
    // Litet glädjeskutt på båda korten (yoyo -> tillbaka exakt; kort dödas i destroy).
    ;[a, b].forEach((c) => {
      if (c.destroyed) return
      gsap.to(c, { y: c.y - c._h * 0.16, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' })
    })
    gsap.delayedCall(0.22, () => {
      if (!this._alive || a.destroyed) return
      const audio = ctx.services.audio
      const voice = ctx.services.voice
      if (set.kind === 'animal') {
        const key = ANIMAL_SOUND[sym]
        if (key && audio.sample(key)) return // riktigt djurläte spelades
        const nm = ANIMAL_NAME[sym]
        if (nm) voice.say(`${nm}!`)
        else audio.sfx('reveal')
      } else if (set.kind === 'sea') {
        const nm = SEA_NAME[sym]
        if (nm) voice.say(`${nm}!`)
        else audio.sfx('reveal')
      } else if (set.kind === 'fruit') {
        voice.say('Mums!')
      } else if (set.kind === 'vehicle') {
        audio.sfx('whoosh')
      } else {
        audio.sfx('reveal')
      }
    })
  },

  // Brädet tomt: höj nivå, fira (delat: celebrate-sfx + beröm + konfetti + stjärna +
  // klistermärke via progress.complete — INTE duplicerat här) + mjuk glad skakning.
  _onCleared(ctx) {
    if (!this._alive || this._cleared) return
    this._cleared = true
    this._clearHint()
    this._level = clampLevel(this._level + 1)
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)

    // Liten gnist-svep över korten innan firandet (extra juice, ingen konfetti-dubbel).
    this._cards?.forEach((c, i) => {
      gsap.delayedCall(0.05 * i, () => {
        if (!this._alive || c.destroyed) return
        sparkle(this._fx, c.x, c.y, { count: 5 })
      })
    })

    gsap.delayedCall(0.45, () => {
      if (!this._alive) return
      ctx.progress.complete()
      shake(this._root, { intensity: 5, duration: 0.5 })
    })

    gsap.delayedCall(1.7, () => {
      if (!this._alive) return
      this._build(ctx, true)
    })
  },

  // Lugn idle-lockelse: upprepa instruktionen och låt ett nedvänt kort "andas".
  _update(ctx, ticker) {
    if (!this._alive || this._cleared || this._busy) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(this._cue || this.voiceIntro)
      this._clearHint()
      const pool = this._cards?.filter((c) => !c._done && !c._flipped && !c.destroyed) || []
      if (pool.length) {
        const c = pool[(Math.random() * pool.length) | 0]
        this._hintCard = c
        this._hintTween = breathe(c, { scale: 1.07, duration: 0.7 })
      }
    }
  },

  _clearHint() {
    if (this._hintTween) {
      this._hintTween.kill()
      this._hintTween = null
    }
    const c = this._hintCard
    if (c && !c.destroyed && !c._done) {
      gsap.killTweensOf(c.scale)
      c.scale.set(1)
    }
    this._hintCard = null
  },

  destroy(ctx) {
    this._alive = false
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)
    if (this._hintTween) {
      this._hintTween.kill()
      this._hintTween = null
    }
    this._cards?.forEach((c) => {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
    })
    gsap.killTweensOf(this._root)
    gsap.killTweensOf(this._layer)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
    this._layer = null
    this._fx = null
    this._cards = null
    this._hintCard = null
  },
}

// --- P0 ASSETS: ritade kortsymboler ------------------------------------------
// Korten är brickor och FÅR bära text/UI — men symbolen barnet ska KÄNNA IGEN är
// ett spelobjekt och ska ritas (samma bedömning som djurkorten i POLERINGSRUNDA).
// 60 symboler för hand vore ohanterligt; i stället är de parametriska: fem mallar
// (djur · frukt · fordon · form · havsdjur) som drivs av en tabell. Emoji-strängen
// är kvar som NYCKEL — bara renderingen har bytts.
const ART = {
  // djur: [pälsfärg, öronform, nosfärg, extra]
  '🐶': ['animal', 0xc98a4b, 'flop', 0xf0d7ae], '🐱': ['animal', 0xb6c0cc, 'point', 0xdfe6eb],
  '🦊': ['animal', 0xef8a3d, 'point', 0xfff0d8], '🐰': ['animal', 0xf2f2f4, 'long', 0xffe0e6],
  '🐻': ['animal', 0x9a6b45, 'round', 0xd9b48a], '🦁': ['animal', 0xf0b850, 'mane', 0xffe0a8],
  '🐸': ['animal', 0x7ed06a, 'eyes', 0xdff3c4], '🐵': ['animal', 0xa9714a, 'round', 0xf0d7ae],
  '🐼': ['animal', 0xf5f5f5, 'panda', 0xffffff], '🐧': ['animal', 0x3a3a4a, 'beak', 0xffffff],
  '🐮': ['animal', 0xf5f5f5, 'round', 0xffd7d7], '🐷': ['animal', 0xf7b9c4, 'pig', 0xffd0da],
  // frukt: [kroppsform, färg, bladfärg]
  '🍎': ['fruit', 'round', 0xe0392b, 0x5bbf6a], '🍌': ['fruit', 'crescent', 0xffd35c, 0x8a6a2a],
  '🍓': ['fruit', 'berry', 0xe0392b, 0x5bbf6a], '🍇': ['fruit', 'bunch', 0xa78bfa, 0x5bbf6a],
  '🍊': ['fruit', 'round', 0xff9d3d, 0x5bbf6a], '🍉': ['fruit', 'slice', 0xff6b6b, 0x5bbf6a],
  '🍐': ['fruit', 'pear', 0xc9e05a, 0x5bbf6a], '🍒': ['fruit', 'cherry', 0xe0392b, 0x5bbf6a],
  '🥝': ['fruit', 'kiwi', 0x8fbe4a, 0x5bbf6a], '🍑': ['fruit', 'round', 0xffb38a, 0x5bbf6a],
  '🥥': ['fruit', 'coco', 0x8a5a3b, 0x5bbf6a], '🍍': ['fruit', 'pine', 0xf0c33c, 0x5bbf6a],
  // fordon: [karossfärg, taktyp]
  '🚗': ['vehicle', 0x4aa3df, 'cab'], '🚒': ['vehicle', 0xe0392b, 'ladder'],
  '🚜': ['vehicle', 0x5bbf6a, 'big'], '🚌': ['vehicle', 0xffd35c, 'bus'],
  '🚲': ['vehicle', 0x8d99a6, 'bike'], '🚁': ['vehicle', 0x6ad0ff, 'heli'],
  '🚂': ['vehicle', 0x74695f, 'train'], '🚀': ['vehicle', 0xf0f2f5, 'rocket'],
  '⛵': ['vehicle', 0xc98a4b, 'boat'], '🚓': ['vehicle', 0x3a5a78, 'cab'],
  '🚑': ['vehicle', 0xffffff, 'bus'], '🚕': ['vehicle', 0xf0c33c, 'cab'],
  // former: [form, färg]
  '⭐': ['shape', 'star', 0xffd35c], '❤️': ['shape', 'heart', 0xe0392b],
  '🔵': ['shape', 'circle', 0x4aa3df], '🟢': ['shape', 'circle', 0x5bbf6a],
  '🟡': ['shape', 'circle', 0xffd35c], '🟣': ['shape', 'circle', 0xa78bfa],
  '🔶': ['shape', 'diamond', 0xff9d3d], '🌸': ['shape', 'flower', 0xffb3d1],
  '🌙': ['shape', 'moon', 0xffe08a], '🍀': ['shape', 'clover', 0x5bbf6a],
  '🔺': ['shape', 'triangle', 0xe0574f], '💎': ['shape', 'gem', 0x6ad0ff],
  // havsdjur: [kroppsfärg, form]
  '🐠': ['sea', 0xffa63d, 'fish'], '🐙': ['sea', 0xd96aa8, 'octo'],
  '🐳': ['sea', 0x5aa6d6, 'whale'], '🦀': ['sea', 0xe0574f, 'crab'],
  '🐬': ['sea', 0x8fb8d4, 'whale'], '🐡': ['sea', 0xffd35c, 'puffer'],
  '🐢': ['sea', 0x7ed06a, 'turtle'], '🦈': ['sea', 0x9aa4b0, 'fish'],
  '🦐': ['sea', 0xffa08a, 'shrimp'], '🐚': ['sea', 0xffd7c4, 'shell'],
  '🦑': ['sea', 0xd96a6a, 'octo'], '🪼': ['sea', 0xd0b8f0, 'jelly'],
  // baksidornas emblem
  '🐾': ['shape', 'paw', 0xffffff], '🍃': ['shape', 'leaf', 0xffffff], '✨': ['shape', 'sparkle', 0xffffff],
}

function drawSymbol(key, size = 100) {
  const g = new Graphics()
  const a = ART[key]
  const S = size / 100
  if (!a) {
    g.circle(0, 0, 32 * S).fill(0xc3ccd4).stroke({ width: 4, color: 0x8d99a6 })
    g.eventMode = 'none'
    return g
  }
  const [tpl] = a
  if (tpl === 'animal') {
    const [, fur, ear, muzzle] = a
    const dk = lerpColor(fur, 0x000000, 0.22)
    if (ear === 'mane') g.circle(0, 0, 44 * S).fill(0xd9922b)
    if (ear === 'long') {
      g.ellipse(-14 * S, -46 * S, 9 * S, 26 * S).fill(fur).stroke({ width: 3, color: dk })
      g.ellipse(14 * S, -46 * S, 9 * S, 26 * S).fill(fur).stroke({ width: 3, color: dk })
    } else if (ear === 'point') {
      g.moveTo(-30 * S, -18 * S).lineTo(-24 * S, -48 * S).lineTo(-6 * S, -26 * S).closePath().fill(fur).stroke({ width: 3, color: dk })
      g.moveTo(30 * S, -18 * S).lineTo(24 * S, -48 * S).lineTo(6 * S, -26 * S).closePath().fill(fur).stroke({ width: 3, color: dk })
    } else if (ear === 'flop') {
      g.ellipse(-32 * S, -6 * S, 12 * S, 24 * S).fill(dk)
      g.ellipse(32 * S, -6 * S, 12 * S, 24 * S).fill(dk)
    } else if (ear === 'panda') {
      g.circle(-26 * S, -28 * S, 13 * S).fill(0x2b2b2b)
      g.circle(26 * S, -28 * S, 13 * S).fill(0x2b2b2b)
    } else if (ear !== 'beak' && ear !== 'eyes') {
      g.circle(-26 * S, -26 * S, 13 * S).fill(fur).stroke({ width: 3, color: dk })
      g.circle(26 * S, -26 * S, 13 * S).fill(fur).stroke({ width: 3, color: dk })
    }
    if (ear === 'eyes') {
      g.circle(-17 * S, -30 * S, 14 * S).fill(fur).stroke({ width: 3, color: dk })
      g.circle(17 * S, -30 * S, 14 * S).fill(fur).stroke({ width: 3, color: dk })
      g.circle(-17 * S, -30 * S, 6 * S).fill(0x2b2b2b)
      g.circle(17 * S, -30 * S, 6 * S).fill(0x2b2b2b)
    }
    g.circle(0, 0, 34 * S).fill(fur).stroke({ width: 4, color: dk })
    g.ellipse(0, 14 * S, 19 * S, 14 * S).fill(muzzle)
    if (ear === 'panda') {
      g.ellipse(-13 * S, -6 * S, 10 * S, 12 * S).fill(0x2b2b2b)
      g.ellipse(13 * S, -6 * S, 10 * S, 12 * S).fill(0x2b2b2b)
    }
    if (ear !== 'eyes') {
      g.circle(-12 * S, -6 * S, 5 * S).fill(0x2b2b2b)
      g.circle(12 * S, -6 * S, 5 * S).fill(0x2b2b2b)
    }
    if (ear === 'beak') g.moveTo(-9 * S, 8 * S).lineTo(0, 20 * S).lineTo(9 * S, 8 * S).closePath().fill(0xff9d3d)
    else if (ear === 'pig') {
      g.ellipse(0, 12 * S, 13 * S, 10 * S).fill(0xef8fa4)
      g.circle(-5 * S, 12 * S, 3 * S).fill(0xc4647c)
      g.circle(5 * S, 12 * S, 3 * S).fill(0xc4647c)
    } else g.ellipse(0, 8 * S, 7 * S, 5 * S).fill(0x2b2b2b)
    g.arc(-5 * S, 18 * S, 6 * S, 0, Math.PI).arc(5 * S, 18 * S, 6 * S, 0, Math.PI).stroke({ width: 3, color: dk })
  } else if (tpl === 'fruit') {
    const [, shape, col, leaf] = a
    const dk = lerpColor(col, 0x000000, 0.2)
    if (shape === 'crescent') {
      g.moveTo(-36 * S, -14 * S).quadraticCurveTo(-6 * S, 34 * S, 36 * S, 12 * S).quadraticCurveTo(6 * S, 22 * S, -24 * S, -18 * S).closePath()
      g.fill(col).stroke({ width: 4, color: dk })
    } else if (shape === 'bunch') {
      for (const [bx, by] of [[-16, -8], [0, -14], [16, -8], [-8, 8], [8, 8], [0, 26]]) g.circle(bx * S, by * S, 13 * S).fill(col).stroke({ width: 3, color: dk })
    } else if (shape === 'pear') {
      g.circle(0, 14 * S, 26 * S).fill(col).stroke({ width: 4, color: dk })
      g.ellipse(0, -12 * S, 17 * S, 20 * S).fill(col).stroke({ width: 4, color: dk })
    } else if (shape === 'cherry') {
      g.circle(-16 * S, 18 * S, 16 * S).fill(col).stroke({ width: 3, color: dk })
      g.circle(16 * S, 22 * S, 16 * S).fill(col).stroke({ width: 3, color: dk })
      g.moveTo(-16 * S, 4 * S).quadraticCurveTo(0, -26 * S, 16 * S, 8 * S).stroke({ width: 4, color: leaf })
    } else if (shape === 'slice') {
      g.moveTo(-38 * S, -18 * S).arc(0, -18 * S, 38 * S, Math.PI, 0, true).closePath().fill(col).stroke({ width: 4, color: dk })
      g.moveTo(-38 * S, -18 * S).arc(0, -18 * S, 38 * S, Math.PI, 0, true).stroke({ width: 8 * S, color: 0x5bbf6a })
      for (const sx of [-18, 0, 18]) g.circle(sx * S, 2 * S, 3 * S).fill(0x2b2b2b)
    } else if (shape === 'kiwi') {
      g.circle(0, 0, 32 * S).fill(0x8a6a4a).stroke({ width: 4, color: 0x6f4a2e })
      g.circle(0, 0, 25 * S).fill(col)
      g.circle(0, 0, 9 * S).fill(0xfff0d8)
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2
        g.circle(Math.cos(ang) * 16 * S, Math.sin(ang) * 16 * S, 2.5 * S).fill(0x2b2b2b)
      }
    } else if (shape === 'coco') {
      g.circle(0, 0, 32 * S).fill(col).stroke({ width: 4, color: 0x6f4a2e })
      g.circle(-10 * S, -8 * S, 5 * S).fill(0x5c3720)
      g.circle(6 * S, -12 * S, 5 * S).fill(0x5c3720)
      g.arc(0, 6 * S, 20 * S, Math.PI, 0).fill(0xfff0e8)
    } else if (shape === 'pine') {
      g.ellipse(0, 12 * S, 24 * S, 30 * S).fill(col).stroke({ width: 4, color: dk })
      for (let r = -14; r <= 30; r += 11) g.moveTo(-22 * S, r * S).lineTo(22 * S, r * S).stroke({ width: 2, color: dk, alpha: 0.6 })
      for (const dx of [-14, 0, 14]) g.moveTo(0, -14 * S).quadraticCurveTo(dx * S, -34 * S, dx * 1.4 * S, -44 * S).stroke({ width: 6 * S, color: leaf, cap: 'round' })
    } else if (shape === 'berry') {
      g.moveTo(-26 * S, -8 * S).quadraticCurveTo(-30 * S, 30 * S, 0, 38 * S).quadraticCurveTo(30 * S, 30 * S, 26 * S, -8 * S).closePath()
      g.fill(col).stroke({ width: 4, color: dk })
      for (const [sx, sy] of [[-11, 4], [8, 0], [-3, 16], [13, 16]]) g.ellipse(sx * S, sy * S, 2.4 * S, 4 * S).fill(0xffe08a)
      for (const dx of [-16, 0, 16]) g.ellipse(dx * S, -13 * S, 11 * S, 7 * S).fill(leaf)
    } else {
      g.circle(0, 4 * S, 30 * S).fill(col).stroke({ width: 4, color: dk })
      g.ellipse(-11 * S, -6 * S, 8 * S, 11 * S).fill({ color: 0xffffff, alpha: 0.3 })
      g.roundRect(-3 * S, -34 * S, 6 * S, 14 * S, 3 * S).fill(0x6f4a2e)
      g.ellipse(14 * S, -30 * S, 13 * S, 8 * S).fill(leaf)
    }
  } else if (tpl === 'vehicle') {
    const [, col, top] = a
    const dk = lerpColor(col, 0x000000, 0.25)
    if (top === 'bike') {
      g.circle(-24 * S, 16 * S, 18 * S).stroke({ width: 5, color: dk })
      g.circle(24 * S, 16 * S, 18 * S).stroke({ width: 5, color: dk })
      g.moveTo(-24 * S, 16 * S).lineTo(-4 * S, -12 * S).lineTo(24 * S, 16 * S).moveTo(-4 * S, -12 * S).lineTo(10 * S, -12 * S)
      g.stroke({ width: 5, color: 0xe0392b })
    } else if (top === 'heli') {
      g.ellipse(-4 * S, 6 * S, 30 * S, 20 * S).fill(col).stroke({ width: 4, color: dk })
      g.moveTo(22 * S, 4 * S).lineTo(46 * S, -4 * S).lineTo(46 * S, 8 * S).closePath().fill(col).stroke({ width: 3, color: dk })
      g.moveTo(-44 * S, -22 * S).lineTo(36 * S, -22 * S).stroke({ width: 6, color: 0x74695f })
      g.roundRect(-6 * S, -26 * S, 8 * S, 12 * S, 3 * S).fill(0x74695f)
      g.circle(-14 * S, 2 * S, 10 * S).fill({ color: 0xd8f0ff, alpha: 0.9 })
    } else if (top === 'rocket') {
      g.moveTo(0, -46 * S).quadraticCurveTo(20 * S, -10 * S, 16 * S, 24 * S).lineTo(-16 * S, 24 * S).quadraticCurveTo(-20 * S, -10 * S, 0, -46 * S)
      g.fill(col).stroke({ width: 4, color: 0x9aa4b0 })
      g.moveTo(-16 * S, 8 * S).lineTo(-32 * S, 32 * S).lineTo(-16 * S, 26 * S).closePath().fill(0xe0392b)
      g.moveTo(16 * S, 8 * S).lineTo(32 * S, 32 * S).lineTo(16 * S, 26 * S).closePath().fill(0xe0392b)
      g.circle(0, -12 * S, 10 * S).fill(0x6ad0ff).stroke({ width: 3, color: 0x2f7fb8 })
      g.moveTo(-10 * S, 26 * S).lineTo(0, 46 * S).lineTo(10 * S, 26 * S).closePath().fill(0xff9d3d)
    } else if (top === 'boat') {
      g.moveTo(-38 * S, 12 * S).lineTo(38 * S, 12 * S).lineTo(26 * S, 34 * S).lineTo(-26 * S, 34 * S).closePath()
      g.fill(col).stroke({ width: 4, color: dk })
      g.roundRect(-3 * S, -40 * S, 6 * S, 52 * S, 3 * S).fill(0x8a5a3b)
      g.moveTo(4 * S, -38 * S).lineTo(32 * S, 8 * S).lineTo(4 * S, 8 * S).closePath().fill(0xfff0d8).stroke({ width: 3, color: 0xe0c9a8 })
    } else if (top === 'train') {
      g.roundRect(-38 * S, -14 * S, 76 * S, 34 * S, 6 * S).fill(col).stroke({ width: 4, color: dk })
      g.roundRect(-34 * S, -38 * S, 30 * S, 26 * S, 5 * S).fill(col).stroke({ width: 4, color: dk })
      g.roundRect(14 * S, -44 * S, 12 * S, 16 * S, 4 * S).fill(0x3a3a3a)
      g.roundRect(-30 * S, -32 * S, 20 * S, 14 * S, 3 * S).fill(0xd8f0ff)
      for (const wx of [-24, 0, 24]) g.circle(wx * S, 24 * S, 11 * S).fill(0x3a3a3a).stroke({ width: 3, color: 0x1c1c1c })
    } else {
      const isBus = top === 'bus' || top === 'big'
      g.roundRect(-40 * S, -6 * S, 80 * S, isBus ? 34 * S : 26 * S, 9 * S).fill(col).stroke({ width: 4, color: dk })
      if (top === 'ladder') g.roundRect(-30 * S, -18 * S, 60 * S, 8 * S, 3 * S).fill(0xc3ccd4)
      g.moveTo(-26 * S, -6 * S).lineTo(-16 * S, -30 * S).lineTo(20 * S, -30 * S).lineTo(30 * S, -6 * S).closePath()
      g.fill(lerpColor(col, 0xffffff, 0.25)).stroke({ width: 4, color: dk })
      g.roundRect(-14 * S, -26 * S, 13 * S, 16 * S, 3 * S).fill(0xd8f0ff)
      g.roundRect(3 * S, -26 * S, 13 * S, 16 * S, 3 * S).fill(0xd8f0ff)
      if (top === 'big') {
        g.circle(-22 * S, 30 * S, 16 * S).fill(0x3a3a3a).stroke({ width: 3, color: 0x1c1c1c })
        g.circle(24 * S, 32 * S, 10 * S).fill(0x3a3a3a).stroke({ width: 3, color: 0x1c1c1c })
      } else {
        g.circle(-22 * S, 28 * S, 11 * S).fill(0x3a3a3a).stroke({ width: 3, color: 0x1c1c1c })
        g.circle(22 * S, 28 * S, 11 * S).fill(0x3a3a3a).stroke({ width: 3, color: 0x1c1c1c })
      }
    }
  } else if (tpl === 'shape') {
    const [, shape, col] = a
    const dk = lerpColor(col, 0x000000, 0.25)
    if (shape === 'star' || shape === 'gem') {
      if (shape === 'gem') {
        g.moveTo(-32 * S, -8 * S).lineTo(-17 * S, -28 * S).lineTo(17 * S, -28 * S).lineTo(32 * S, -8 * S).lineTo(0, 32 * S).closePath()
        g.fill(col).stroke({ width: 4, color: dk })
        g.moveTo(-17 * S, -28 * S).lineTo(-8 * S, -8 * S).lineTo(0, -28 * S).closePath().fill({ color: 0xffffff, alpha: 0.5 })
      } else {
        const pts = []
        for (let k = 0; k < 10; k++) {
          const ang = (k / 10) * Math.PI * 2 - Math.PI / 2
          const rr = (k % 2 === 0 ? 36 : 15) * S
          pts.push(Math.cos(ang) * rr, Math.sin(ang) * rr)
        }
        g.poly(pts).fill(col).stroke({ width: 4, color: dk })
      }
    } else if (shape === 'heart') {
      g.moveTo(0, 32 * S).quadraticCurveTo(-40 * S, 2 * S, -20 * S, -20 * S).quadraticCurveTo(-4 * S, -30 * S, 0, -10 * S)
      g.quadraticCurveTo(4 * S, -30 * S, 20 * S, -20 * S).quadraticCurveTo(40 * S, 2 * S, 0, 32 * S).closePath()
      g.fill(col).stroke({ width: 4, color: dk })
    } else if (shape === 'diamond') {
      g.poly([0, -34 * S, 30 * S, 0, 0, 34 * S, -30 * S, 0]).fill(col).stroke({ width: 4, color: dk })
    } else if (shape === 'triangle') {
      g.poly([0, -32 * S, 32 * S, 26 * S, -32 * S, 26 * S]).fill(col).stroke({ width: 4, color: dk })
    } else if (shape === 'moon') {
      g.circle(0, 0, 32 * S).fill(col).stroke({ width: 4, color: dk })
      g.circle(16 * S, -8 * S, 27 * S).fill(COLORS.cream)
    } else if (shape === 'flower') {
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI / 2
        g.ellipse(Math.cos(ang) * 20 * S, Math.sin(ang) * 20 * S, 14 * S, 14 * S).fill(col).stroke({ width: 3, color: dk })
      }
      g.circle(0, 0, 11 * S).fill(0xffe08a).stroke({ width: 3, color: 0xe0a94f })
    } else if (shape === 'paw') {
      g.ellipse(0, 12 * S, 20 * S, 17 * S).fill(col)
      for (const [tx, ty] of [[-22, -12], [-8, -24], [8, -24], [22, -12]]) g.circle(tx * S, ty * S, 8 * S).fill(col)
    } else if (shape === 'leaf') {
      g.moveTo(-26 * S, 22 * S).quadraticCurveTo(-16 * S, -26 * S, 26 * S, -22 * S)
      g.quadraticCurveTo(22 * S, 20 * S, -26 * S, 22 * S).closePath().fill(col)
      g.moveTo(-22 * S, 18 * S).quadraticCurveTo(2 * S, 2 * S, 22 * S, -18 * S).stroke({ width: 3, color: dk, alpha: 0.5 })
    } else if (shape === 'sparkle') {
      for (const [sx, sy, r] of [[0, 0, 26], [-22, 18, 12], [22, -18, 10]]) {
        g.moveTo(sx * S, (sy - r) * S).quadraticCurveTo(sx * S, sy * S, (sx + r * 0.45) * S, sy * S)
        g.quadraticCurveTo(sx * S, sy * S, sx * S, (sy + r) * S)
        g.quadraticCurveTo(sx * S, sy * S, (sx - r * 0.45) * S, sy * S)
        g.quadraticCurveTo(sx * S, sy * S, sx * S, (sy - r) * S).closePath().fill(col)
      }
    } else if (shape === 'clover') {
      for (const [cx, cy] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) g.circle(cx * S, cy * S, 15 * S).fill(col).stroke({ width: 3, color: dk })
      g.moveTo(0, 10 * S).quadraticCurveTo(8 * S, 30 * S, 0, 38 * S).stroke({ width: 4, color: dk })
    } else {
      g.circle(0, 0, 32 * S).fill(col).stroke({ width: 4, color: dk })
      g.circle(-10 * S, -11 * S, 9 * S).fill({ color: 0xffffff, alpha: 0.35 })
    }
  } else {
    const [, col, form] = a
    const dk = lerpColor(col, 0x000000, 0.25)
    if (form === 'octo') {
      for (let i = 0; i < 5; i++) {
        const ox = (-24 + i * 12) * S
        g.moveTo(ox, 6 * S).quadraticCurveTo(ox - 6 * S, 26 * S, ox + 4 * S, 36 * S).stroke({ width: 7 * S, color: col, cap: 'round' })
      }
      g.ellipse(0, -8 * S, 28 * S, 26 * S).fill(col).stroke({ width: 4, color: dk })
      g.circle(-10 * S, -12 * S, 5 * S).fill(0x2b2b2b)
      g.circle(10 * S, -12 * S, 5 * S).fill(0x2b2b2b)
    } else if (form === 'whale') {
      g.ellipse(-4 * S, 4 * S, 34 * S, 22 * S).fill(col).stroke({ width: 4, color: dk })
      g.moveTo(26 * S, 2 * S).lineTo(44 * S, -14 * S).lineTo(44 * S, 18 * S).closePath().fill(col).stroke({ width: 3, color: dk })
      g.ellipse(-6 * S, 12 * S, 22 * S, 10 * S).fill({ color: 0xffffff, alpha: 0.5 })
      g.circle(-18 * S, -2 * S, 4.5 * S).fill(0x2b2b2b)
      g.moveTo(-8 * S, -18 * S).quadraticCurveTo(-4 * S, -34 * S, 4 * S, -30 * S).stroke({ width: 4, color: 0xbfe6ff })
    } else if (form === 'crab') {
      g.ellipse(0, 6 * S, 32 * S, 22 * S).fill(col).stroke({ width: 4, color: dk })
      for (const s2 of [-1, 1]) {
        g.moveTo(s2 * 30 * S, 0).quadraticCurveTo(s2 * 46 * S, -12 * S, s2 * 38 * S, -26 * S).stroke({ width: 6 * S, color: col })
        g.circle(s2 * 38 * S, -30 * S, 10 * S).fill(col).stroke({ width: 3, color: dk })
        for (let i = 0; i < 3; i++) g.moveTo(s2 * 24 * S, 14 * S + i * 8 * S).lineTo(s2 * 40 * S, 20 * S + i * 8 * S).stroke({ width: 4, color: col })
      }
      g.circle(-11 * S, -4 * S, 5 * S).fill(0xffffff)
      g.circle(11 * S, -4 * S, 5 * S).fill(0xffffff)
      g.circle(-11 * S, -4 * S, 2.5 * S).fill(0x2b2b2b)
      g.circle(11 * S, -4 * S, 2.5 * S).fill(0x2b2b2b)
    } else if (form === 'puffer') {
      g.circle(0, 0, 28 * S).fill(col).stroke({ width: 4, color: dk })
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2
        g.moveTo(Math.cos(ang) * 27 * S, Math.sin(ang) * 27 * S).lineTo(Math.cos(ang) * 40 * S, Math.sin(ang) * 40 * S)
        g.stroke({ width: 4, color: dk, cap: 'round' })
      }
      g.circle(-10 * S, -6 * S, 5 * S).fill(0x2b2b2b)
      g.circle(10 * S, -6 * S, 5 * S).fill(0x2b2b2b)
    } else if (form === 'turtle') {
      g.ellipse(-30 * S, 10 * S, 10 * S, 7 * S).fill(0x9bd88a)
      g.ellipse(30 * S, 10 * S, 10 * S, 7 * S).fill(0x9bd88a)
      g.circle(34 * S, -8 * S, 12 * S).fill(0x9bd88a).stroke({ width: 3, color: 0x3f8a44 })
      g.circle(38 * S, -10 * S, 3.5 * S).fill(0x2b2b2b)
      g.ellipse(0, 0, 32 * S, 26 * S).fill(col).stroke({ width: 4, color: dk })
      for (const [hx, hy] of [[0, 0], [-16, -8], [16, -8], [-14, 10], [14, 10]]) g.circle(hx * S, hy * S, 8 * S).stroke({ width: 3, color: dk })
    } else if (form === 'shrimp') {
      g.moveTo(-30 * S, -6 * S).quadraticCurveTo(10 * S, -26 * S, 30 * S, 6 * S).quadraticCurveTo(6 * S, 30 * S, -26 * S, 12 * S).closePath()
      g.fill(col).stroke({ width: 4, color: dk })
      g.moveTo(-26 * S, 2 * S).lineTo(-44 * S, -10 * S).lineTo(-42 * S, 12 * S).closePath().fill(col)
      g.circle(22 * S, 2 * S, 4 * S).fill(0x2b2b2b)
      g.moveTo(26 * S, -4 * S).lineTo(40 * S, -18 * S).stroke({ width: 3, color: dk })
    } else if (form === 'shell') {
      g.moveTo(-34 * S, 22 * S).arc(0, 22 * S, 34 * S, Math.PI, 0).closePath().fill(col).stroke({ width: 4, color: dk })
      for (let i = 1; i < 5; i++) {
        const ang = Math.PI + (i / 5) * Math.PI
        g.moveTo(0, 22 * S).lineTo(Math.cos(ang) * 34 * S, 22 * S + Math.sin(ang) * 34 * S).stroke({ width: 3, color: dk, alpha: 0.7 })
      }
    } else if (form === 'jelly') {
      g.arc(0, 0, 30 * S, Math.PI, 0).fill(col).stroke({ width: 4, color: dk })
      g.roundRect(-30 * S, -2 * S, 60 * S, 8 * S, 4 * S).fill(col)
      for (const tx of [-20, -7, 7, 20]) {
        g.moveTo(tx * S, 6 * S).quadraticCurveTo(tx * S + 8 * S, 24 * S, tx * S - 4 * S, 38 * S).stroke({ width: 4, color: col, cap: 'round' })
      }
      g.circle(-10 * S, -12 * S, 4 * S).fill(0x2b2b2b)
      g.circle(10 * S, -12 * S, 4 * S).fill(0x2b2b2b)
    } else {
      g.ellipse(-2 * S, 0, 30 * S, 20 * S).fill(col).stroke({ width: 4, color: dk })
      g.moveTo(24 * S, 0).lineTo(42 * S, -16 * S).lineTo(42 * S, 16 * S).closePath().fill(dk)
      g.moveTo(-6 * S, -18 * S).lineTo(4 * S, -32 * S).lineTo(12 * S, -16 * S).closePath().fill(dk)
      g.ellipse(-6 * S, 4 * S, 14 * S, 8 * S).fill({ color: 0xffffff, alpha: 0.35 })
      g.circle(-16 * S, -4 * S, 5 * S).fill(0xffffff)
      g.circle(-16 * S, -4 * S, 2.5 * S).fill(0x2b2b2b)
    }
  }
  g.eventMode = 'none'
  return g
}

// --- kort-grafik (rena Graphics/Text, inga tillgångar) ---

// Mönstrad, premium-känslig baksida: bas + ljusare inre platta + prick-mönster +
// centralt emblem. Stroke i vitt för "tryckt kort"-look.
function makeBackView(w, h, radius, set) {
  const v = new Container()
  const inner = radius - 6
  const light = lerpColor(set.back, 0xffffff, 0.22)
  const dark = lerpColor(set.back, 0x000000, 0.12)
  v.addChild(new Graphics().roundRect(-w / 2, -h / 2, w, h, radius).fill(set.back).stroke({ width: 5, color: 0xffffff, alpha: 0.9 }))
  v.addChild(new Graphics().roundRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18, inner).fill({ color: light, alpha: 0.55 }).stroke({ width: 3, color: dark, alpha: 0.45 }))
  // Prick-mönster (förskjutna rader) inom den inre plattan.
  const dots = new Graphics()
  const stepX = w / 5
  const stepY = h / 6
  for (let row = 0; row * stepY < h - 28; row++) {
    for (let colp = 0; colp * stepX < w - 28; colp++) {
      const px = -w / 2 + 22 + colp * stepX + (row % 2 ? stepX / 2 : 0)
      const py = -h / 2 + 24 + row * stepY
      if (px > w / 2 - 16) continue
      dots.circle(px, py, Math.max(2.5, w * 0.022)).fill({ color: 0xffffff, alpha: 0.16 })
    }
  }
  v.addChild(dots)
  // Centralt emblem (mjuk skiva + symbol).
  v.addChild(new Graphics().circle(0, 0, w * 0.26).fill({ color: 0xffffff, alpha: 0.2 }))
  const em = drawSymbol(set.emblem, h * 0.26)
  em.alpha = 0.9
  v.addChild(em)
  return v
}

// Ren, glansig framsida: gräddvit platta + accent-kant + topp-glans + stor symbol.
function makeFrontView(w, h, radius, symbol, set) {
  const v = new Container()
  v.addChild(new Graphics().roundRect(-w / 2, -h / 2, w, h, radius).fill(COLORS.cream).stroke({ width: 5, color: set.accent }))
  // Topp-glans (mjuk vit ellips) för "blank skärm"-känsla.
  const gloss = new Graphics().ellipse(0, -h * 0.26, w * 0.36, h * 0.16).fill({ color: 0xffffff, alpha: 0.55 })
  v.addChild(gloss)
  const face = drawSymbol(symbol, h * 0.46)
  v.addChild(face)
  return v
}

function clampLevel(l) {
  return Math.max(0, Math.min(LEVELS.length - 1, l))
}
