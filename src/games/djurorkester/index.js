// Djurorkester — pedagogiskt tryck-spel/leksak (2–4 år). En rad/rutnät av sex stora,
// färgglada djurkort. Tryck på ett djur så hoppar och "sjunger" det sitt svenska läte
// (squash-and-stretch-studs, en svävande nottecken-emoji, mjukt ljud + rösten).
// Inget mål, inga fel — det är ett instrument. Olika djur i följd bildar en kör.
// Efter ~8 tryck kommer ett delat firande, sedan rullar leken vidare. Oändlig lek.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { randomFrom } from '../../lib/swedish.js'
import { pop, floatText } from '../../lib/feedback.js'
import { COLORS, FONT, PLAYFUL } from '../../lib/theme.js'

// Djurdata (delmängd av vilket-djur-later). Vi behöver bara emoji + fras (lätet
// som rösten "sjunger"). Färg = en distinkt PLAYFUL-färg per kort.
const DJUR = [
  { id: 'ko', emoji: '🐮', fras: 'Mu! Muu!' },
  { id: 'hund', emoji: '🐶', fras: 'Voff! Voff!' },
  { id: 'katt', emoji: '🐱', fras: 'Mjau! Mjau!' },
  { id: 'groda', emoji: '🐸', fras: 'Kvack! Kvack!' },
  { id: 'gris', emoji: '🐷', fras: 'Nöff! Nöff!' },
  { id: 'anka', emoji: '🦆', fras: 'Kvack kvack!' },
]

// Layout (designkoordinater 1280x720): 2 rader x 3 kolumner med stora kort.
const COLS = 3
const ROWS = 2
const CARD_W = 300
const CARD_H = 250
const GAP_X = 56
const GAP_Y = 56

// Hur många tryck innan det delade stora firandet (stjärna + klistermärke).
const TAPS_PER_CELEBRATION = 8

export default {
  id: 'djurorkester',
  titleSv: 'Djurorkester',
  icon: '🐾',
  category: 'pedagogiskt',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'djurorkester',
  voiceIntro: 'Tryck på djuren så sjunger de!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._taps = 0
    this._cards = []
    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._build(ctx)
    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Bygg rutnätet en gång: sex djurkort, var sin distinkt färg, studsar in.
  _build(ctx) {
    if (!this._alive) return
    const palette = PLAYFUL // sex första färgerna räcker till sex distinkta kort
    const gridW = COLS * CARD_W + (COLS - 1) * GAP_X
    const gridH = ROWS * CARD_H + (ROWS - 1) * GAP_Y
    const startX = (ctx.width - gridW) / 2 + CARD_W / 2
    const startY = (ctx.height - gridH) / 2 + CARD_H / 2

    DJUR.forEach((djur, i) => {
      const col = i % COLS
      const row = (i / COLS) | 0
      const card = this._makeCard(ctx, djur, palette[i % palette.length])
      card.x = startX + col * (CARD_W + GAP_X)
      card.y = startY + row * (CARD_H + GAP_Y)
      card._homeY = card.y
      this._root.addChild(card)
      this._cards.push(card)
      card.scale.set(0)
      gsap.to(card.scale, { x: 1, y: 1, duration: 0.36, delay: 0.06 + i * 0.06, ease: 'back.out(1.7)' })
    })
  },

  // Djurkort: färgglad rundad ruta + stor djur-emoji. Tryck = sjung.
  _makeCard(ctx, djur, color) {
    const card = new Container()
    card._djur = djur
    const body = new Graphics()
      .roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 34)
      .fill(color)
      .stroke({ width: 7, color: COLORS.white, alpha: 0.85 })
    const face = new Text({ text: djur.emoji, style: { fontFamily: FONT.body, fontSize: 150 } })
    face.anchor.set(0.5)
    card.addChild(body, face)
    card.eventMode = 'static'
    card.cursor = 'pointer'
    card.hitArea = new Rectangle(-CARD_W / 2 - 24, -CARD_H / 2 - 24, CARD_W + 48, CARD_H + 48)
    card.on('pointertap', () => this._sing(ctx, card))
    return card
  },

  // Tryck på ett djur: omedelbar (<100ms) återkoppling — squash-stretch-studs +
  // litet hopp, en svävande nottecken-emoji, mjukt ljud, och djuret "sjunger".
  _sing(ctx, card) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('pop')

    this._hop(card)

    // Nottecken stiger upp från kortets topp.
    floatText(this._root, card.x, card.y - CARD_H / 2, '🎵', { fontSize: 64, rise: 110, duration: 1.0 })

    // Riktigt förinspelat djurläte om klippet finns — annars sjunger rösten lätet.
    if (!ctx.services.audio.sample(`djur_${card._djur.id}`)) {
      ctx.services.voice.say(card._djur.fras)
    }

    this._taps++
    if (this._taps % TAPS_PER_CELEBRATION === 0) {
      ctx.progress.complete()
    }
  },

  // Squash-and-stretch + ett litet hopp uppåt och tillbaka. Springigt och glatt.
  _hop(card) {
    gsap.killTweensOf(card.scale)
    gsap.killTweensOf(card)
    const home = card._homeY
    card.y = home
    gsap
      .timeline()
      // anticipation: tryck ihop (squash)
      .to(card.scale, { x: 1.16, y: 0.84, duration: 0.09, ease: 'power2.out' })
      // sträck ut på vägen upp (stretch)
      .to(card.scale, { x: 0.9, y: 1.18, duration: 0.12, ease: 'power2.out' })
      // tillbaka mot normal med studs
      .to(card.scale, { x: 1, y: 1, duration: 0.34, ease: 'back.out(2.6)' })
    gsap
      .timeline()
      .to(card, { y: home - 46, duration: 0.18, ease: 'power2.out' })
      .to(card, { y: home, duration: 0.4, ease: 'bounce.out' })
  },

  // Idle ~6s: upprepa instruktionen och locka med en mjuk studs på ett djur.
  _update(ctx, ticker) {
    if (!this._alive) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      const card = randomFrom(this._cards)
      if (card && !card.destroyed) pop(card)
    }
  },

  // Döda alla tweens på korten (och deras scale) innan de förstörs (exit-säkert).
  _killCardTweens() {
    this._cards?.forEach((c) => {
      if (!c || c.destroyed) return
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
    })
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._killCardTweens()
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}
