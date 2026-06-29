// Mata Monstret — dra och släpp (2–4 år). Dra maten upp i monstrets glupska mun;
// det tuggar, säger "mums" och firar när tallrikarna är tomma. Återanvänder den
// delade DragController (stor träffyta, snäpp, snäpp-tillbaka, tap-tap-fallback).
// Det finns bara ETT mål (munnen) som accepterar allt → ingen kan göra fel.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { bounceIn, wiggle, puff, sparkle } from '../../lib/feedback.js'
import { FONT } from '../../lib/theme.js'

const FOODS = ['🍬', '🍎', '🍌', '🍓', '🍪', '🧁', '🍇', '🥕', '🍒', '🍩', '🥦', '🍐']
const MUMS = ['Mums!', 'Nam nam!', 'Så gott!', 'Åh vad gott!']

const MONSTER_X = 640
const MONSTER_Y = 300
const MOUTH_LOCAL_Y = 60 // munnens lokala y inom monstret -> världs-y 360

export default {
  id: 'mata-monstret',
  titleSv: 'Mata Monstret',
  icon: '🍬',
  category: 'drag',
  input: 'drag',
  ageRange: [2, 4],
  bundle: 'mata-monstret',
  voiceIntro: 'Mata monstret! Dra maten till munnen.',

  init(ctx) {
    this._alive = true
    this._fed = 0
    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._buildBackground(ctx)
    this._buildMonster(ctx)

    // Ett enda mål: munnen. Accepterar allt → inget felsteg är möjligt.
    this._drag = new DragController({ space: this._root, services: ctx.services })
    this._drag.addTarget(this._mouthHit, () => true, { hitRadius: 170 })

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._newRound(ctx)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._resetIdle(ctx)
  },

  _buildBackground(ctx) {
    const decor = new Container()
    decor.eventMode = 'none'
    decor.interactiveChildren = false
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(0xfdf3e3)
    // Mjukt "bord" där tallrikarna står.
    const floor = new Graphics().roundRect(0, 540, ctx.width, 200, 60).fill({ color: 0xf3e2c2, alpha: 0.7 })
    decor.addChild(bg, floor)
    this._root.addChild(decor)
  },

  _buildMonster(ctx) {
    const mon = new Container()
    mon.position.set(MONSTER_X, MONSTER_Y)
    mon.eventMode = 'none'
    mon.interactiveChildren = false

    // Öron/horn (bakom kroppen, kikar fram).
    const ears = new Graphics()
      .circle(-120, -160, 32).fill(0x6bb39b)
      .circle(120, -160, 32).fill(0x6bb39b)

    // Kropp.
    const body = new Graphics()
      .roundRect(-180, -170, 360, 340, 90)
      .fill(0x7fc7ad)
      .stroke({ width: 8, color: 0xffffff, alpha: 0.5 })

    // Mage (guppar vid tugg) — ritad centrerad så scale.y gör en fin studs.
    const belly = new Graphics().roundRect(-100, -48, 200, 96, 44).fill({ color: 0x9ed8c2 })
    belly.position.set(0, 102)

    // Ögon (kisar glatt vid tugg) — pivot på ögonlinjen så de squishar på plats.
    const eyes = new Container()
    eyes.position.set(0, -70)
    const eyeG = new Graphics()
      .circle(-80, 0, 46).fill(0xffffff)
      .circle(80, 0, 46).fill(0xffffff)
      .circle(-80, 6, 22).fill(0x3a2b22)
      .circle(80, 6, 22).fill(0x3a2b22)
    eyes.addChild(eyeG)

    // Mun (synlig målzon). Ritad centrerad; scale.y = käke som tuggar.
    const mouth = new Graphics()
    mouth.roundRect(-100, -60, 200, 120, 40).fill(0x8b2f3a)
    mouth.roundRect(-58, 8, 116, 50, 26).fill(0xd9536a) // tunga
    for (const tx of [-86, -44, 0, 44, 80]) mouth.roundRect(tx - 14, -60, 28, 26, 8).fill(0xffffff) // tänder
    mouth.position.set(0, MOUTH_LOCAL_Y)

    mon.addChild(ears, body, belly, eyes, mouth)
    this._root.addChild(mon)

    this._monster = mon
    this._belly = belly
    this._eyes = eyes
    this._mouth = mouth

    // Osynlig, generös träffzon för drag + tap-tap, på munnens världsposition.
    const mouthHit = new Container()
    mouthHit.position.set(MONSTER_X, MONSTER_Y + MOUTH_LOCAL_Y)
    mouthHit.hitArea = new Circle(0, 0, 170)
    this._root.addChild(mouthHit)
    this._mouthHit = mouthHit
  },

  _newRound(ctx) {
    if (!this._alive) return
    this._resolving = false
    this._foods = []
    const count = this._level >= 3 ? 4 : 3
    const xs = count === 4 ? [256, 512, 768, 1024] : [320, 640, 960]
    const picks = shuffle(FOODS).slice(0, count)
    this._left = count

    picks.forEach((emoji, i) => {
      const food = this._makeFood(emoji)
      food.x = xs[i]
      food.y = 600
      this._root.addChild(food)
      this._foods.push(food)
      bounceIn(food, { delay: i * 0.08 })
      this._drag.addItem(food, { emoji }, {
        onSelect: () => this._resetIdle(ctx),
        onWrong: (rec) => {
          if (!this._alive) return
          wiggle(rec.view) // DragController spelar redan 'soft'
          this._resetIdle(ctx)
        },
        onCorrect: (rec) => this._onEat(ctx, rec),
      })
    })

    this._resetIdle(ctx)
  },

  _makeFood(emoji) {
    const it = new Container()
    const plate = new Graphics().circle(0, 0, 78).fill({ color: 0xffffff, alpha: 0.85 }).stroke({ width: 4, color: 0xeadfca })
    const e = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: 98 } })
    e.anchor.set(0.5)
    it.addChild(plate, e)
    return it
  },

  _onEat(ctx, rec) {
    if (!this._alive) return
    ctx.services.audio.sfx('match')
    ctx.services.voice.say(randomFrom(MUMS))
    this._chomp()
    puff(ctx.fxLayer, MONSTER_X, MONSTER_Y + MOUTH_LOCAL_Y, { count: 8 })

    // Maten krymper och försvinner i munnen (exit-säkert: guarda destroy).
    const view = rec.view
    gsap.to(view.scale, { x: 0, y: 0, duration: 0.22, ease: 'power2.in' })
    gsap.to(view, {
      alpha: 0,
      duration: 0.22,
      onComplete: () => {
        if (!view.destroyed) view.destroy({ children: true })
      },
    })

    this._fed++
    ctx.progress.setCustom('matningar', this._fed)
    this._resetIdle(ctx)

    if (--this._left <= 0) this._finishRound(ctx)
  },

  // Glad tugg-animation: käken stänger/öppnar, magen guppar, ögonen kisar.
  _chomp() {
    const m = this._mouth
    const b = this._belly
    const eyes = this._eyes
    gsap.killTweensOf(m.scale)
    gsap.timeline()
      .to(m.scale, { y: 0.25, duration: 0.1, ease: 'power2.in' })
      .to(m.scale, { y: 1, duration: 0.12, ease: 'back.out(2)' })
      .to(m.scale, { y: 0.45, duration: 0.09 })
      .to(m.scale, { y: 1, duration: 0.14, ease: 'back.out(2)' })
    gsap.killTweensOf(b.scale)
    gsap.timeline()
      .to(b.scale, { y: 1.18, x: 0.94, duration: 0.12 })
      .to(b.scale, { y: 1, x: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' })
    gsap.killTweensOf(eyes.scale)
    gsap.timeline().to(eyes.scale, { y: 0.45, duration: 0.1 }).to(eyes.scale, { y: 1, duration: 0.18 })
  },

  _finishRound(ctx) {
    if (!this._alive) return
    this._resolving = true
    const mon = this._monster
    gsap.killTweensOf(mon)
    gsap.timeline()
      .to(mon, { y: MONSTER_Y - 44, duration: 0.24, ease: 'power2.out' })
      .to(mon, { y: MONSTER_Y, duration: 0.7, ease: 'bounce.out' })
    this._chomp()
    sparkle(ctx.fxLayer, MONSTER_X, MONSTER_Y, { count: 8 })

    ctx.services.voice.say('Mätt och belåten! Tack för maten!')
    ctx.progress.setLevel(this._level + 1)
    this._level++
    ctx.progress.complete() // delat firande + stjärna + klistermärke

    gsap.delayedCall(1.4, () => {
      if (this._alive) this._newRound(ctx)
    })
  },

  // Mjuk röst-recue om barnet är inaktivt ~6s (aldrig pressande).
  _resetIdle(ctx) {
    this._idleCall?.kill()
    if (!this._alive) return
    this._idleCall = gsap.delayedCall(6, () => {
      if (!this._alive || this._resolving) return
      ctx.services.voice.say(this.voiceIntro)
      this._resetIdle(ctx)
    })
  },

  destroy() {
    this._alive = false
    this._idleCall?.kill()
    this._drag?.destroy()
    // Döda alla aktiva tweens (annars kan en fly-/försvinn-tween skriva till ett
    // förstört Pixi-objekt om barnet avslutar mitt i en animation).
    for (const f of this._foods || []) {
      gsap.killTweensOf(f)
      gsap.killTweensOf(f.scale)
    }
    gsap.killTweensOf(this._root)
    if (this._monster) gsap.killTweensOf(this._monster)
    if (this._mouth) gsap.killTweensOf(this._mouth.scale)
    if (this._belly) gsap.killTweensOf(this._belly.scale)
    if (this._eyes) gsap.killTweensOf(this._eyes.scale)
    this._root?.destroy({ children: true })
  },
}
