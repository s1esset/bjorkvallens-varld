// Vilket Djur Låter Så? — pedagogiskt tryck-spel (2–4 år). Ett djurläte spelas
// upp (rösten säger lätet, t.ex. "Mu! Muu!") och barnet trycker på rätt djur
// bland 2–4 stora glada kort. Rätt -> djuret "svarar" med sitt namn + firande.
// Fel -> mjuk vingel, ingen bestraffning, lätet upprepas vänligt. Oändlig lek.
import { Container, Graphics, Text, Rectangle, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { pop, wiggle, sparkle } from '../../lib/feedback.js'
import { COLORS, FONT, PLAYFUL } from '../../lib/theme.js'

// Djurdata: emoji + svenskt namn (med rätt artikel + bestämd form) så rösten blir
// grammatiskt korrekt ("Det är en ko! Kon säger muu!", "Det är ett får! Fåret säger bää!").
// fras = lätet rösten spelar som ledtråd; late = lätesordet i namnfrasen.
const DJUR = [
  { emoji: '🐮', namn: 'ko', art: 'en', best: 'Kon', late: 'muu', fras: 'Mu! Muu!' },
  { emoji: '🐶', namn: 'hund', art: 'en', best: 'Hunden', late: 'voff', fras: 'Voff! Voff!' },
  { emoji: '🐱', namn: 'katt', art: 'en', best: 'Katten', late: 'mjau', fras: 'Mjau! Mjau!' },
  { emoji: '🐷', namn: 'gris', art: 'en', best: 'Grisen', late: 'nöff', fras: 'Nöff! Nöff!' },
  { emoji: '🐑', namn: 'får', art: 'ett', best: 'Fåret', late: 'bää', fras: 'Bää! Bää!' },
  { emoji: '🐸', namn: 'groda', art: 'en', best: 'Grodan', late: 'kvack', fras: 'Kvack! Kvack!' },
  { emoji: '🐔', namn: 'höna', art: 'en', best: 'Hönan', late: 'pock', fras: 'Pock pock!' },
  { emoji: '🐴', namn: 'häst', art: 'en', best: 'Hästen', late: 'gnägg', fras: 'Gnägg!' },
  { emoji: '🦆', namn: 'anka', art: 'en', best: 'Ankan', late: 'kvack', fras: 'Kvack kvack!' },
  { emoji: '🐝', namn: 'bi', art: 'ett', best: 'Biet', late: 'surr', fras: 'Bzzz!' },
]

// Svårighet = antal svarsalternativ (osynligt för barnet, växer långsamt).
const LEVELS = [{ n: 2 }, { n: 3 }, { n: 4 }]

// Layout (designkoordinater 1280x720).
const SOUND_X = 640
const SOUND_Y = 170
const SOUND_R = 90
const CARD_W = 210
const CARD_H = 240
const CARD_Y = 470
const GAP = 50

// Hur många rätt i rad innan det delade stora firandet (stjärna + klistermärke).
const WINS_PER_CELEBRATION = 5

export default {
  id: 'vilket-djur-later',
  titleSv: 'Vilket Djur Låter Så?',
  icon: '🐮',
  category: 'pedagogiskt',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'vilket-djur-later',
  voiceIntro: 'Lyssna! Vilket djur låter så?',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._wins = 0
    this._calls = []
    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._level = clampLevel(ctx.progress.get().highestLevel | 0)
    this._build(ctx)
    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._cueSoon(ctx, 1.3) // första lätet en stund efter intron
  },

  // Bygg en ny runda: städa gammalt, slumpa rätt-djur + distraktorer, rita
  // frågebricka + kort. Spelar INTE lätet här — anroparen styr ledtråden.
  _build(ctx) {
    if (!this._alive) return
    this._cueCall?.kill()
    this._killCalls()
    this._killSceneTweens()
    this._root.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._cards = []
    this._busy = false
    this._idle = 0

    const lvl = LEVELS[this._level]
    const answer = randomFrom(DJUR)
    this._answer = answer
    // Distraktorer får aldrig dela läte med svaret (groda/anka säger båda "kvack").
    const distractors = shuffle(DJUR.filter((d) => d !== answer && d.late !== answer.late)).slice(0, lvl.n - 1)
    const round = shuffle([answer, ...distractors])
    const palette = shuffle(PLAYFUL)

    this._makeSoundButton(ctx)

    const n = round.length
    const gridW = n * CARD_W + (n - 1) * GAP
    const startX = (ctx.width - gridW) / 2 + CARD_W / 2
    round.forEach((djur, i) => {
      const card = this._makeCard(ctx, djur, palette[i % palette.length])
      card.x = startX + i * (CARD_W + GAP)
      card.y = CARD_Y
      this._root.addChild(card)
      this._cards.push(card)
      card.scale.set(0)
      gsap.to(card.scale, { x: 1, y: 1, duration: 0.32, delay: 0.06 + i * 0.07, ease: 'back.out(1.7)' })
    })
  },

  // Frågebricka: gul cirkel + 🔊 + puls-ring. Tryck = repris av lätet (in-game-repetera).
  _makeSoundButton(ctx) {
    const btn = new Container()
    btn.position.set(SOUND_X, SOUND_Y)
    const ring = new Graphics().circle(0, 0, SOUND_R + 6).stroke({ width: 6, color: COLORS.yellow, alpha: 0.9 })
    ring.alpha = 0
    ring.eventMode = 'none'
    const body = new Graphics().circle(0, 0, SOUND_R).fill(COLORS.yellow).stroke({ width: 8, color: COLORS.white })
    const icon = new Text({ text: '🔊', style: { fontFamily: FONT.body, fontSize: 96 } })
    icon.anchor.set(0.5)
    btn.addChild(ring, body, icon)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    btn.hitArea = new Circle(0, 0, SOUND_R + 24) // generös träffyta (radie + halo)
    btn.on('pointertap', () => {
      pop(btn)
      this._playSound(ctx)
    })
    this._root.addChild(btn)
    this._soundBtn = btn
    this._ring = ring
    btn.scale.set(0)
    gsap.to(btn.scale, { x: 1, y: 1, duration: 0.35, ease: 'back.out(1.7)' })
  },

  // Djurkort: färgglad rundad ruta + stor djur-emoji. Tryck = välj svar.
  _makeCard(ctx, djur, color) {
    const card = new Container()
    card._djur = djur
    const body = new Graphics()
      .roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 28)
      .fill(color)
      .stroke({ width: 6, color: COLORS.white, alpha: 0.8 })
    const face = new Text({ text: djur.emoji, style: { fontFamily: FONT.body, fontSize: 130 } })
    face.anchor.set(0.5)
    card.addChild(body, face)
    card.eventMode = 'static'
    card.cursor = 'pointer'
    card.hitArea = new Rectangle(-CARD_W / 2 - 24, -CARD_H / 2 - 24, CARD_W + 48, CARD_H + 48)
    card.on('pointertap', () => this._choose(ctx, card))
    return card
  },

  // Spela upp lätet (ledtråd): pling + puls-ring + rösten säger lätet.
  _playSound(ctx) {
    if (!this._alive || !this._answer) return
    this._idle = 0
    ctx.services.audio.sfx('pling')
    ctx.services.voice.say(this._answer.fras)
    const ring = this._ring
    if (ring && !ring.destroyed) {
      gsap.killTweensOf(ring)
      gsap.killTweensOf(ring.scale)
      ring.scale.set(1)
      ring.alpha = 0.6
      gsap.to(ring.scale, { x: 1.6, y: 1.6, duration: 0.75, ease: 'sine.out' })
      gsap.to(ring, { alpha: 0, duration: 0.75, ease: 'sine.out' })
    }
  },

  _choose(ctx, card) {
    if (!this._alive || this._busy) return
    this._idle = 0
    // Omedelbar (<100ms) återkoppling på VARJE tryck.
    ctx.services.audio.sfx('tap')
    pop(card)

    if (card._djur !== this._answer) {
      // Fel: aldrig bestraffning — mjuk vingel + neutralt ljud, upprepa lätet vänligt.
      ctx.services.audio.sfx('soft')
      wiggle(card)
      this._cueSoon(ctx, 0.9)
      return
    }

    // Rätt: fira kortet, låt djuret "svara" med sitt namn.
    this._busy = true
    ctx.services.audio.sfx('correct')
    sparkle(this._root, card.x, card.y)
    ctx.services.voice.say(`Det är ${card._djur.art} ${card._djur.namn}! ${card._djur.best} säger ${card._djur.late}!`)

    // Spara framsteg + höj svårighet långsamt (var ~2:a runda).
    const rundor = (ctx.progress.get().custom?.rundor || 0) + 1
    ctx.progress.setCustom('rundor', rundor)
    const lvl = clampLevel(Math.floor(rundor / 2))
    if (lvl > this._level) this._level = lvl
    ctx.progress.setLevel(this._level)

    this._wins++
    if (this._wins % WINS_PER_CELEBRATION === 0) {
      // Milstolpe: stort delat firande (stjärna + klistermärke) efter att namnet sagts.
      this._schedule(2.0, () => ctx.progress.complete())
      this._schedule(3.4, () => this._nextRound(ctx))
    } else {
      this._schedule(1.8, () => this._nextRound(ctx))
    }
  },

  _nextRound(ctx) {
    this._build(ctx)
    this._playSound(ctx)
  },

  // Idle ~6s utan rätt svar: upprepa instruktionen + lätet och locka med en
  // liten studs på rätt kort. Återställs vid varje tryck.
  _update(ctx, ticker) {
    if (!this._alive || this._busy) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      this._cueSoon(ctx, 1.0)
      const answerCard = this._cards?.find((c) => c._djur === this._answer)
      if (answerCard) pop(answerCard)
    }
  },

  // Schemalägg en (enda) fördröjd ledtråd — ersätter ev. tidigare så de inte staplas.
  _cueSoon(ctx, delay) {
    this._cueCall?.kill()
    this._cueCall = gsap.delayedCall(delay, () => {
      if (this._alive && !this._busy) this._playSound(ctx)
    })
  },

  // Fördröjda anrop i upplösnings-/firandesekvensen (alive-skyddade, spårade).
  _schedule(delay, fn) {
    const call = gsap.delayedCall(delay, () => {
      if (this._alive) fn()
    })
    this._calls.push(call)
    return call
  },

  _killCalls() {
    this._calls?.forEach((c) => c.kill())
    this._calls = []
  },

  // Döda alla tweens på nuvarande scen-objekt innan de förstörs (exit-säkert).
  _killSceneTweens() {
    this._cards?.forEach((c) => {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
    })
    if (this._soundBtn) gsap.killTweensOf(this._soundBtn.scale)
    if (this._ring) {
      gsap.killTweensOf(this._ring)
      gsap.killTweensOf(this._ring.scale)
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._cueCall?.kill()
    this._killCalls()
    this._killSceneTweens()
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}

function clampLevel(l) {
  return Math.max(0, Math.min(LEVELS.length - 1, l))
}
