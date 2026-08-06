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
import { drawIcon } from '../../lib/artikoner.js'
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
    if (!this._alive || this._cleared) return
    // Ett tryck får ALDRIG vara stumt (P0). Kortet kan vara upptaget (jämförelse-
    // pausen), redan vänt eller färdigt — svara med en vänlig knuff i stället för
    // tystnad. Diagnostikloggen hittade tre sådana döda tryck på nio.
    if (this._busy || card._flipped || card._done) {
      this._nudge(ctx, card)
      return
    }
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
  // Svar på ett tryck som inte får vända kortet just nu. Lekfullt, aldrig ett nej:
  // färdigt par ger ett glatt pling, "vänta lite" en mjuk ton. wiggle() rör bara
  // rotationen, så den krockar aldrig med vändningens skal-tween.
  _nudge(ctx, card) {
    if (!this._alive || card.destroyed) return
    wiggle(card)
    ctx.services.audio.sfx(card._done ? 'pling' : 'soft')
    ripple(this._fx, card.x, card.y, { color: 0xffffff, maxR: card._w * 0.5, width: 3, alpha: 0.3 })
  },

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
  const em = drawIcon(set.emblem, h * 0.26)
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
  const face = drawIcon(symbol, h * 0.46)
  v.addChild(face)
  return v
}

function clampLevel(l) {
  return Math.max(0, Math.min(LEVELS.length - 1, l))
}
