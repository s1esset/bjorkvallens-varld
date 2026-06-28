// Vändkort — minne/par (3–5 år). Introducerar speltillstånd (tur-logik),
// match-upplösning och skalbart rutnät — grunden för minnes-/pusselspel.
// Vänd två kort: par = stannar uppe + gnistror; inget par = vänds tillbaka (ingen bestraffning).
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { shuffle } from '../../lib/swedish.js'
import { sparkle, pop } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'

const MOTIFS = ['🐶', '🐱', '🦊', '🐰', '🐻', '🦁', '🐸', '🐵', '🐼', '🐧', '🐮', '🐷']
const LEVELS = [
  { pairs: 2, cols: 2 },
  { pairs: 3, cols: 3 },
  { pairs: 4, cols: 4 },
  { pairs: 6, cols: 4 },
]

export default {
  id: 'vandkort',
  titleSv: 'Vändkort',
  icon: '🃏',
  category: 'minne',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'vandkort',
  voiceIntro: 'Hitta paren! Vänd korten.',

  init(ctx) {
    this._alive = true
    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._level = clampLevel(ctx.progress.get().highestLevel | 0)
    this._build(ctx)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  _build(ctx) {
    if (!this._alive) return
    this._cards?.forEach((c) => gsap.killTweensOf(c.scale))
    this._root.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._cards = []
    this._first = null
    this._busy = false
    this._matched = 0

    const lvl = LEVELS[this._level]
    const chosen = shuffle(MOTIFS).slice(0, lvl.pairs)
    const deck = shuffle([...chosen, ...chosen])
    const cols = lvl.cols
    const rows = Math.ceil(deck.length / cols)
    const cardW = 150
    const cardH = 188
    const gap = 26
    const gridW = cols * cardW + (cols - 1) * gap
    const gridH = rows * cardH + (rows - 1) * gap
    const startX = (ctx.width - gridW) / 2 + cardW / 2
    const startY = (ctx.height - gridH) / 2 + cardH / 2 + 18

    deck.forEach((motif, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const card = this._makeCard(ctx, motif, cardW, cardH)
      card.x = startX + col * (cardW + gap)
      card.y = startY + row * (cardH + gap)
      this._root.addChild(card)
      this._cards.push(card)
      card.scale.set(0)
      gsap.to(card.scale, { x: 1, y: 1, duration: 0.3, delay: i * 0.04, ease: 'back.out(1.7)' })
    })
  },

  _makeCard(ctx, motif, w, h) {
    const card = new Container()
    card._motif = motif
    card._flipped = false
    card._done = false

    const back = new Graphics().roundRect(-w / 2, -h / 2, w, h, 22).fill(COLORS.orange).stroke({ width: 5, color: 0xffffff, alpha: 0.7 })
    const q = new Text({ text: '❓', style: { fontFamily: FONT.body, fontSize: 76 } })
    q.anchor.set(0.5)
    const front = new Graphics().roundRect(-w / 2, -h / 2, w, h, 22).fill(COLORS.cream).stroke({ width: 5, color: COLORS.orange })
    const face = new Text({ text: motif, style: { fontFamily: FONT.body, fontSize: 96 } })
    face.anchor.set(0.5)
    front.visible = false
    face.visible = false

    card.addChild(back, q, front, face)
    card._back = back
    card._q = q
    card._front = front
    card._face = face
    card.eventMode = 'static'
    card.cursor = 'pointer'
    card.on('pointertap', () => this._flip(ctx, card))
    return card
  },

  _flip(ctx, card) {
    if (!this._alive || this._busy || card._flipped || card._done) return
    this._showFace(card, true)
    ctx.services.audio.sfx('flip')

    if (!this._first) {
      this._first = card
      return
    }

    this._busy = true
    const a = this._first
    const b = card
    this._first = null

    if (a._motif === b._motif) {
      gsap.delayedCall(0.35, () => {
        if (!this._alive) return
        a._done = b._done = true
        ctx.services.audio.sfx('match')
        sparkle(ctx.stage, a.x, a.y)
        sparkle(ctx.stage, b.x, b.y)
        pop(a)
        pop(b)
        this._matched++
        this._busy = false
        if (this._matched >= LEVELS[this._level].pairs) {
          this._level = clampLevel(this._level + 1)
          ctx.progress.setLevel(this._level)
          ctx.progress.complete()
          gsap.delayedCall(1.4, () => this._build(ctx))
        }
      })
    } else {
      gsap.delayedCall(0.9, () => {
        if (!this._alive) return
        this._showFace(a, false)
        this._showFace(b, false)
        ctx.services.audio.sfx('soft')
        this._busy = false
      })
    }
  },

  _showFace(card, faceUp) {
    card._flipped = faceUp
    gsap.to(card.scale, {
      x: 0,
      duration: 0.12,
      onComplete: () => {
        card._back.visible = !faceUp
        card._q.visible = !faceUp
        card._front.visible = faceUp
        card._face.visible = faceUp
        gsap.to(card.scale, { x: 1, duration: 0.14 })
      },
    })
  },

  destroy() {
    this._alive = false
    this._cards?.forEach((c) => gsap.killTweensOf(c.scale))
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}

function clampLevel(l) {
  return Math.max(0, Math.min(LEVELS.length - 1, l))
}
