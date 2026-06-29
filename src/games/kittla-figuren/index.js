// Kittla Figuren — ren orsak-och-verkan-lek (2–4 år). En stor, glad figur
// ("Kittel-Kalle") står mitt på skärmen. Varje tryck på en kittelzon (mage,
// fötter, huvud, kinder) får zonen att studsa, hela figuren att sprattla och
// ett glatt ljud att spelas. Inga felsteg, ingen timer, inget slut — var 6:e
// kittling får figuren ett "skrattanfall" (firande + stjärna + klistermärke)
// och en ny runda börjar direkt. Allt ritas programmatiskt (Pixi Graphics + emoji).
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { puff, pop, wiggle, floatText } from '../../lib/feedback.js'
import { COLORS, PLAYFUL } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

const CX = 640 // figurens mitt-x (designkoordinater)
const FIG_Y = 400 // figurens mitt-y (lite under mitten så huvudet får plats)
const GOAL = 6 // antal kittlingar per runda innan skrattanfall

// Korta fnitter-fraser (sparsam röst — inte vid varje tryck).
const GIGGLES = ['Hihi!', 'Det kittlas!', 'Mer!', 'Haha!']
// Svävande skratt-emoji vid kittling.
const LAUGH_EMOJI = ['😄', '😆', '🤣', '❤️']

const MOUTH = 0x5a2d22 // mörk mun/kontur
const CHEEK = 0xff8fa3 // rosa kinder

// Mörkare/ljusare variant av en kroppsfärg (kontur respektive mage-markering).
function darken(hex, amt = 0.22) {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
function lighten(hex, amt = 0.55) {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  const l = (v) => Math.round(v + (255 - v) * amt)
  return (l(r) << 16) | (l(g) << 8) | l(b)
}

export default {
  id: 'kittla-figuren',
  titleSv: 'Kittla Figuren',
  icon: '😄',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'kittla-figuren',
  voiceIntro: 'Kittla gubben! Tryck på magen, fötterna och huvudet!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._resolving = false
    this._count = 0
    this._goal = GOAL
    this._round = ctx.progress.get().custom?.rundor || 0
    this._bodyColor = randomFrom(PLAYFUL)

    this._layer = new Container()
    ctx.stage.addChild(this._layer)

    this._build(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  _build(ctx) {
    // Bakgrund: mjuk pastell, fångar "tomt tryck".
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(COLORS.bg)
    bg.eventMode = 'static'
    bg.on('pointertap', () => this._emptyTap(ctx))
    this._layer.addChild(bg)

    // Dekor-moln (ej interaktiva).
    const clouds = new Graphics()
    clouds.eventMode = 'none'
    clouds.interactiveChildren = false
    for (const [cx, cy, s] of [[210, 110, 1], [560, 70, 0.8], [1050, 130, 1.15], [850, 60, 0.7]]) {
      clouds.roundRect(cx - 70 * s, cy - 28 * s, 140 * s, 56 * s, 28 * s).fill({ color: COLORS.white, alpha: 0.85 })
    }
    this._layer.addChild(clouds)

    // Figur-rot: centrerad, hela containern används för "sprattel"-vinglet.
    const fig = new Container()
    fig.position.set(CX, FIG_Y)
    fig.eventMode = 'passive' // egna zoner är interaktiva; missar faller till bakgrunden
    this._figure = fig
    this._layer.addChild(fig)

    // Fötter (bakom kroppen så de "tittar fram").
    this._footL = this._part(-90, 175)
    this._footR = this._part(90, 175)
    fig.addChild(this._footL, this._footR)

    // Kropp + armar (repaintbar vid färgbyte).
    this._body = this._part(0, 0)
    fig.addChild(this._body)

    // Mage-markering (ljusare cirkel — kittelzon).
    this._belly = this._part(0, 30)
    fig.addChild(this._belly)

    // Huvud-container (skakar som en enhet vid huvud-kittling).
    const head = new Container()
    head.position.set(0, -230)
    head.eventMode = 'none'
    this._head = head
    this._headG = this._part(0, 0)
    head.addChild(this._headG)
    this._eyeL = this._makeEye(-40, -15)
    this._eyeR = this._makeEye(40, -15)
    this._cheekL = this._part(-70, 15)
    this._cheekR = this._part(70, 15)
    this._mouth = this._part(0, 25)
    head.addChild(this._eyeL, this._eyeR, this._cheekL, this._cheekR, this._mouth)
    fig.addChild(head)

    this._paint()
    this._drawMouth(false)

    // Sex kittelzoner — generösa, exakta träffytor (hitArea-cirkel r=70 ≥ 96px Ø).
    this._zones = []
    const Z = [
      ['huvud', 0, -230],
      ['kind_v', -70, -215],
      ['kind_h', 70, -215],
      ['mage', 0, 30],
      ['fot_v', -90, 175],
      ['fot_h', 90, 175],
    ]
    for (const [kind, zx, zy] of Z) {
      const z = new Container()
      z.position.set(zx, zy)
      z.hitArea = new Circle(0, 0, 70)
      z.eventMode = 'static'
      z.cursor = 'pointer'
      z._kind = kind
      z._busy = false
      z.on('pointertap', () => this._tickle(ctx, z))
      fig.addChild(z)
      this._zones.push(z)
    }

    // Räknar-prickar (visuell, kräver ingen läsning).
    this._dots = []
    const gap = 56
    const startX = ctx.width / 2 - ((this._goal - 1) * gap) / 2
    for (let i = 0; i < this._goal; i++) {
      const d = new Graphics()
      d.position.set(startX + i * gap, 660)
      d.eventMode = 'none'
      this._layer.addChild(d)
      this._dots.push(d)
    }
    this._fillDots(0)
  },

  // Tom, repaintbar grafikbit på en lokal position i figur-/huvud-rummet.
  _part(x, y) {
    const g = new Graphics()
    g.position.set(x, y)
    g.eventMode = 'none'
    return g
  },

  _makeEye(x, y) {
    const e = new Container()
    e.position.set(x, y)
    e.eventMode = 'none'
    const w = new Graphics().circle(0, 0, 18).fill(0xffffff).stroke({ width: 3, color: MOUTH })
    const p = new Graphics().circle(0, 4, 9).fill(0x33271f)
    e.addChild(w, p)
    return e
  },

  // Färglägg kropp/armar/huvud/fötter + mage-markering utifrån this._bodyColor.
  _paint() {
    const col = this._bodyColor
    const dark = darken(col)
    // Kropp + armar (armar bakom kroppen).
    this._body
      .clear()
      .roundRect(-205, -70, 52, 170, 26)
      .fill(col)
      .stroke({ width: 8, color: dark })
      .roundRect(153, -70, 52, 170, 26)
      .fill(col)
      .stroke({ width: 8, color: dark })
      .roundRect(-160, -150, 320, 300, 80)
      .fill(col)
      .stroke({ width: 8, color: dark })
    this._headG.clear().circle(0, 0, 110).fill(col).stroke({ width: 8, color: dark })
    for (const f of [this._footL, this._footR]) {
      f.clear().ellipse(0, 0, 60, 35).fill(col).stroke({ width: 8, color: dark })
    }
    this._belly.clear().circle(0, 0, 90).fill({ color: lighten(col), alpha: 0.85 })
    this._cheekL.clear().circle(0, 0, 30).fill(CHEEK)
    this._cheekR.clear().circle(0, 0, 30).fill(CHEEK)
  },

  // Mun: liten båge (neutral-glad) eller stor öppen halvcirkel (skratt).
  _drawMouth(open) {
    const m = this._mouth.clear()
    if (open) {
      m.arc(0, 0, 40, 0, Math.PI).fill(MOUTH)
      m.circle(0, 26, 13).fill(COLORS.red) // tunga
    } else {
      m.arc(0, -6, 38, 0.16 * Math.PI, 0.84 * Math.PI).stroke({ width: 9, color: MOUTH, cap: 'round' })
    }
  },

  // Färglägg prickarna: < n tända (glada färger), resten tonade.
  _fillDots(n) {
    for (let i = 0; i < this._dots.length; i++) {
      const d = this._dots[i].clear().circle(0, 0, 14)
      if (i < n) d.fill(PLAYFUL[i % PLAYFUL.length])
      else d.fill({ color: COLORS.inkSoft, alpha: 0.22 })
    }
  },

  // Kittling på en zon: omedelbar (<100ms) positiv reaktion. Allt är "rätt".
  _tickle(ctx, zon) {
    if (!this._alive || zon._busy || this._resolving) return
    zon._busy = true
    this._idle = 0
    this._count++

    ctx.services.audio.sfx(Math.random() < 0.25 ? 'pling' : 'pop')

    wiggle(this._figure) // hela figuren sprattlar
    this._laugh() // ansiktet skrattar
    this._react(zon._kind) // zon-specifik krydda

    // Partiklar + svävande skratt vid själva trycket (i layer-koordinater).
    const lp = this._layer.toLocal(zon.getGlobalPosition())
    puff(this._layer, lp.x, lp.y, { count: 8 })
    if (Math.random() < 0.5) this._floatEmoji(lp.x, lp.y)

    // Sparsam röst (≈30 %) — annars pratar den i mun på sig själv.
    if (Math.random() < 0.3 && this._count < this._goal) ctx.services.voice.say(randomFrom(GIGGLES))

    // Tänd nästa prick.
    this._fillDots(this._count)
    pop(this._dots[this._count - 1])

    // Släpp busy-flaggan efter reaktionen (skydd mot snabbtryck på SAMMA zon).
    gsap.delayedCall(0.25, () => {
      if (this._alive) zon._busy = false
    })

    if (this._count >= this._goal) this._celebrateRound(ctx)
  },

  // Munnen byter till stort skratt och ögonen knips ihop en kort stund.
  _laugh() {
    this._drawMouth(true)
    gsap.to([this._eyeL.scale, this._eyeR.scale], { y: 0.2, duration: 0.1, yoyo: true, repeat: 1 })
    this._mouthTimer?.kill()
    this._mouthTimer = gsap.delayedCall(0.4, () => {
      if (this._alive && !this._resolving) this._drawMouth(false)
    })
  },

  // Zon-specifik rörelse: huvud skakar, fötter sparkar, mage hoppar, kinder pulserar.
  _react(kind) {
    switch (kind) {
      case 'huvud': {
        const h = this._head
        gsap.killTweensOf(h, 'rotation')
        gsap
          .timeline({ onComplete: () => (h.rotation = 0) })
          .to(h, { rotation: 0.18, duration: 0.06 })
          .to(h, { rotation: -0.18, duration: 0.06 })
          .to(h, { rotation: 0, duration: 0.06 })
        break
      }
      case 'fot_v':
        this._kick(this._footL)
        break
      case 'fot_h':
        this._kick(this._footR)
        break
      case 'kind_v':
        pop(this._cheekL)
        break
      case 'kind_h':
        pop(this._cheekR)
        break
      case 'mage':
        pop(this._belly)
        gsap.killTweensOf(this._figure, 'y')
        gsap.to(this._figure, {
          y: FIG_Y - 16,
          duration: 0.12,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
          onComplete: () => (this._figure.y = FIG_Y),
        })
        break
    }
  },

  _kick(foot) {
    const y0 = 175
    gsap.killTweensOf(foot, 'y')
    gsap.to(foot, {
      y: y0 - 26,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
      onComplete: () => (foot.y = y0),
    })
  },

  // Kort svävande skratt-emoji ovanför trycket (exit-säker via floatText).
  _floatEmoji(x, y) {
    floatText(this._layer, x, y, randomFrom(LAUGH_EMOJI), { fontSize: 54 })
  },

  // Tomt tryck (bredvid zonerna): lekfull vingel + mjukt ljud. Aldrig "fel".
  _emptyTap(ctx) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    wiggle(this._figure)
  },

  // Runda klar: skrattanfall + delat firande (stjärna + klistermärke), sedan ny runda.
  _celebrateRound(ctx) {
    this._resolving = true
    this._idle = 0
    this._drawMouth(true)
    gsap.killTweensOf(this._figure.scale)
    gsap.to(this._figure.scale, { x: 1.12, y: 1.12, duration: 0.18, yoyo: true, repeat: 3, ease: 'sine.inOut' })

    // complete() sköter celebrate-ljud, beröm-röst, konfetti, stjärna och klistermärke.
    ctx.progress.complete()
    this._round += 1
    ctx.progress.setCustom('rundor', this._round)
    // Mild variation var 3:e runda (aldrig svårare/snabbare).
    if (this._round % 3 === 0) ctx.progress.setLevel(Math.floor(this._round / 3))

    this._celebrate = gsap.delayedCall(1.4, () => this._newRound(ctx))
  },

  // Ny runda: nollställ räknare, slumpa ny färg, återställ ansikte. Oändlig lek.
  _newRound(ctx) {
    if (!this._alive) return
    this._resolving = false
    this._count = 0
    this._idle = 0
    const choices = PLAYFUL.filter((c) => c !== this._bodyColor)
    this._bodyColor = randomFrom(choices.length ? choices : PLAYFUL)
    this._paint()
    this._drawMouth(false)
    this._eyeL.scale.set(1)
    this._eyeR.scale.set(1)
    this._fillDots(0)
    this._zones.forEach((z) => (z._busy = false))
    pop(this._figure) // liten "fräsch start"-studs
  },

  // Idle-recue: efter ~6s tystnad upprepar vi instruktionen och figuren skakar lite.
  _update(ctx, ticker) {
    if (!this._alive) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6 && !this._resolving) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      this._react('huvud')
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._celebrate?.kill()
    this._mouthTimer?.kill()
    this._zones?.forEach((z) => gsap.killTweensOf(z))
    for (const o of [
      this._figure,
      this._head,
      this._footL,
      this._footR,
      this._cheekL,
      this._cheekR,
      this._belly,
      this._eyeL,
      this._eyeR,
    ]) {
      if (!o) continue
      gsap.killTweensOf(o)
      gsap.killTweensOf(o.scale)
    }
    gsap.killTweensOf(this._layer)
    this._layer?.destroy({ children: true })
  },
}
