// Tryck och Förvandla — ren orsak-verkan-lek (2–5 år). En glad figur står
// mitt på en scenplatta; varje tryck puffar och förvandlar den till en ny
// emoji. Inga felsteg, ingen timer, inget slut. Var 8:e förvandling firar vi
// (delat firande + stjärna + klistermärke) och leken fortsätter direkt.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { puff, pop, wiggle } from '../../lib/feedback.js'
import { COLORS, PLAYFUL, PRAISE, FONT } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

const CX = 640 // scenens mitt-x (designkoordinater)
const CY = 380 // scenens mitt-y (under headern)

// Figurpool i stigande "överraskningsordning". Svenskt namn + rätt artikel
// (en/ett) så rösten blir grammatiskt korrekt ("En groda!", "Ett äpple!").
// Nivåtrösklar avgör hur stor del av poolen som är aktiv (osynligt för barnet).
const POOL = [
  { emoji: '🐸', namn: 'groda', art: 'En' },
  { emoji: '🐱', namn: 'katt', art: 'En' },
  { emoji: '🐶', namn: 'hund', art: 'En' },
  { emoji: '⭐', namn: 'stjärna', art: 'En' },
  { emoji: '🌸', namn: 'blomma', art: 'En' },
  { emoji: '🐰', namn: 'kanin', art: 'En' },
  { emoji: '🦋', namn: 'fjäril', art: 'En' },
  { emoji: '🐢', namn: 'sköldpadda', art: 'En' },
  { emoji: '🐝', namn: 'bi', art: 'Ett' },
  { emoji: '🚗', namn: 'bil', art: 'En' },
  { emoji: '🍎', namn: 'äpple', art: 'Ett' },
  { emoji: '🌈', namn: 'regnbåge', art: 'En' },
  { emoji: '🐥', namn: 'kyckling', art: 'En' },
  { emoji: '🌟', namn: 'stjärna', art: 'En' },
  { emoji: '☀️', namn: 'sol', art: 'En' },
]

// Hur många av POOL som är aktiva per nivå (1 = bekanta djur, 3 = allt).
function poolSize(level) {
  return level >= 3 ? 15 : level === 2 ? 9 : 5
}

// Nivå utifrån antal förvandlingar (mjuk, osynlig variationstrappa).
function levelFor(count) {
  return count > 40 ? 3 : count > 16 ? 2 : 1
}

export default {
  id: 'tryck-och-forvandla',
  titleSv: 'Tryck och Förvandla',
  icon: '✨',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'tryck-och-forvandla',
  voiceIntro: 'Tryck på figuren så förvandlas den!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._resolving = false
    this._count = ctx.progress.get().custom?.forvandlingar || 0
    this._level = levelFor(this._count)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund: mjuk pastell, dekorativ (fångar inte tap).
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(COLORS.bg)
    bg.eventMode = 'none'
    bg.interactiveChildren = false
    this._root.addChild(bg)

    // Scenplatta: ger figuren en tydlig "scen". Dekorativ.
    const plate = new Graphics()
      .roundRect(-210, -210, 420, 420, 48)
      .fill(COLORS.cream)
      .stroke({ width: 8, color: COLORS.orange })
    plate.position.set(CX, CY)
    plate.eventMode = 'none'
    this._root.addChild(plate)

    // Förloppsring: 8 prickar som fylls mot var 8:e förvandling (firande).
    this._dots = []
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2
      const dot = new Graphics()
      dot.position.set(CX + Math.cos(a) * 250, CY + Math.sin(a) * 250)
      dot.eventMode = 'none'
      this._root.addChild(dot)
      this._dots.push(dot)
    }
    this._updateRing(this._count % 8)

    // Osynlig heltäckande tap-fångare (under figuren): tomt tryck -> mjuk respons.
    const tap = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tap.eventMode = 'static'
    tap.on('pointertap', () => this._emptyTap(ctx))
    this._root.addChild(tap)

    // Figuren: enda interaktiva ytan, generös hit-area så även små emojier träffas.
    this._current = randomFrom(this._activePool())
    this._figure = new Text({
      text: this._current.emoji,
      style: { fontFamily: FONT.body, fontSize: 240, align: 'center' },
    })
    this._figure.anchor.set(0.5)
    this._figure.position.set(CX, CY)
    this._figure.hitArea = new Rectangle(-200, -200, 400, 400)
    this._figure.eventMode = 'static'
    this._figure.cursor = 'pointer'
    this._figure.on('pointertap', () => this._transform(ctx))
    this._root.addChild(this._figure)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // De aktiva figurerna för nuvarande nivå.
  _activePool() {
    return POOL.slice(0, poolSize(this._level))
  },

  // Nästa figur, alltid skild från den nuvarande (ingen direkt upprepning).
  _pickNext() {
    const pool = this._activePool()
    const choices = pool.filter((p) => p.emoji !== this._current.emoji)
    return randomFrom(choices.length ? choices : pool)
  },

  // Färga ringen: prickar < n fyllda (glada färger), resten tonade.
  _updateRing(n) {
    for (let i = 0; i < this._dots.length; i++) {
      const dot = this._dots[i].clear().circle(0, 0, 12)
      if (i < n) dot.fill(PLAYFUL[i % PLAYFUL.length])
      else dot.fill({ color: COLORS.inkSoft, alpha: 0.25 })
    }
  },

  // Tryck på figuren: puff + magisk förvandling. Allt är "rätt".
  _transform(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._idle = 0

    ctx.services.audio.sfx(Math.random() < 0.2 ? 'pling' : 'pop')
    puff(this._root, CX, CY, { count: 9 })

    this._count++
    ctx.progress.setCustom('forvandlingar', this._count)
    const lvl = levelFor(this._count)
    if (lvl > this._level) {
      this._level = lvl
      ctx.progress.setLevel(lvl)
    }

    const next = this._pickNext()
    this._current = next

    // Studs ner till 0 -> byt emoji vid botten -> studs upp = ren "magisk" övergång.
    gsap.killTweensOf(this._figure.scale)
    gsap
      .timeline({
        onComplete: () => {
          if (this._alive) this._resolving = false
        },
      })
      .to(this._figure.scale, { x: 0, y: 0, duration: 0.12, ease: 'power2.in' })
      .add(() => {
        if (this._alive) this._figure.text = next.emoji
      })
      .to(this._figure.scale, { x: 1, y: 1, duration: 0.26, ease: 'back.out(2.2)' })

    // Fyll ringen; var 8:e -> firande, annars ibland säg figurens namn.
    const ringPos = this._count % 8 === 0 ? 8 : this._count % 8
    this._updateRing(ringPos)
    if (this._count % 8 === 0) {
      ctx.progress.complete()
      ctx.services.voice.say(randomFrom(PRAISE))
      this._celebrate = gsap.delayedCall(1.4, () => {
        if (this._alive) this._updateRing(0)
      })
    } else if (this._count % 3 === 0) {
      ctx.services.voice.say(`${next.art} ${next.namn}!`)
    }
  },

  // Tomt tryck (bredvid figuren): lekfull vingel + mjukt ljud. Aldrig "fel".
  _emptyTap(ctx) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    wiggle(this._figure)
  },

  // Idle-recue: efter ~6s tystnad upprepar vi instruktionen och figuren "vinkar".
  _update(ctx, ticker) {
    if (!this._alive) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      pop(this._figure)
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._celebrate?.kill()
    gsap.killTweensOf(this._figure?.scale)
    gsap.killTweensOf(this._figure)
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
