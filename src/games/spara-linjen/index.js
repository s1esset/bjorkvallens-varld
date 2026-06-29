// Spåra Linjen — lugn motorik-/rita-själv-lek (3–5 år). Barnet sätter fingret på
// startpricken (som pulsar) och drar längs en prickad väg. När fingret passerar nära
// nästa prick i ordning "tänds" den: den fylls med rundans färg, ett färgat segment
// ritas från föregående prick och ✏️-pennspetsen flyttas dit. Inget kan bli fel:
// straying ignoreras (pennan stannar på vägen, aldrig omstart), hoppar fingret över en
// prick fylls den i automatiskt när nästa nås, och allt drivs lika gärna med tap-tap
// (tappa nästa prick) som med drag. Klart = hela linjen färglagd → firande + ny form
// (oändlig lek). Allt ritas programmatiskt (Pixi Graphics + emoji) — inga filer.
//
// OBS: DragController passar inte här (den snäpper föremål till mål). Spårningen är en
// egen pekar-lyssnare på själva ritytan, men följer samma snäll-principer (stora
// träffytor, tap-tap-fallback, snäll respons på varje pekning).
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { bounceIn, pop, wiggle, sparkle, bigCelebration } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, FONT, PLAYFUL, PRAISE } from '../../lib/theme.js'

// Layout i designkoordinater (1280×720).
const PAPER = { x: 120, y: 130, w: 1040, h: 520, r: 40 }
const DOT_R = 34 // vägpunkts-radie
const HIT_R = 70 // osynlig träffradie (≥96px Ø träffyta) — generös korridor
const INK_W = 22 // tjocklek på det färglagda spåret
const SHAPE_COUNT = 4 // antal formvarianter att rotera mellan
const IDLE_DELAY = 6 // s utan interaktion innan röst-recue

export default {
  id: 'spara-linjen',
  titleSv: 'Spåra Linjen',
  icon: '✏️',
  category: 'motorik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'spara-linjen',
  voiceIntro: 'Dra fingret längs prickarna!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._dots = []
    this._next = 0
    this._tracing = false
    this._resolving = false
    this._round = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Rityta / papperspanel — DETTA är den interaktiva spårningsytan.
    this._paper = new Graphics()
      .roundRect(PAPER.x, PAPER.y, PAPER.w, PAPER.h, PAPER.r)
      .fill(COLORS.cream)
      .stroke({ width: 6, color: COLORS.yellow })
    this._paper.eventMode = 'static'
    this._paper.cursor = 'pointer'
    this._root.addChild(this._paper)

    // Färglagt spår (under prickarna).
    this._ink = new Graphics()
    this._ink.eventMode = 'none'
    this._root.addChild(this._ink)

    // Prick-lager (ovanpå spåret) — prickarna fångar inga pekhändelser; ritytan gör det.
    this._dotsLayer = new Container()
    this._dotsLayer.eventMode = 'none'
    this._dotsLayer.interactiveChildren = false
    this._root.addChild(this._dotsLayer)

    // ✏️-pennspets (ovanpå allt).
    this._pencil = new Text({ text: '✏️', style: { fontFamily: FONT.body, fontSize: 64 } })
    this._pencil.anchor.set(0.5)
    this._pencil.eventMode = 'none'
    this._root.addChild(this._pencil)

    // Pekar-lyssnare på ritytan (drag OCH tap-tap går genom samma _checkPoint).
    this._onDown = (e) => this._pointerDown(ctx, e)
    this._onMove = (e) => this._pointerMove(ctx, e)
    this._onUp = () => { this._tracing = false }
    this._paper.on('pointerdown', this._onDown)
    this._paper.on('globalpointermove', this._onMove)
    this._paper.on('pointerup', this._onUp)
    this._paper.on('pointerupoutside', this._onUp)

    this._buildRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Rundor: bygg en ny form (oändlig lek) ------------------------------

  _buildRound(ctx) {
    if (!this._alive) return
    // Städa förra rundans tweens + prickar.
    this._celebrateTL?.kill()
    this._celebrateTL = null
    this._pulseTween?.kill()
    this._pulseTween = null
    if (this._pencil && !this._pencil.destroyed) gsap.killTweensOf(this._pencil)
    for (const d of this._dots) {
      if (d && !d.destroyed) {
        gsap.killTweensOf(d)
        gsap.killTweensOf(d.scale)
      }
    }
    this._dotsLayer.removeChildren().forEach((d) => d.destroy())
    this._ink.clear()

    // Ny form + slumpfärg.
    this._color = randomFrom(PLAYFUL)
    const points = this._genShape(this._round % SHAPE_COUNT)

    this._dots = []
    this._next = 0
    this._litCount = 0
    this._saidGo = false
    this._resolving = false
    this._tracing = false
    this._idle = 0

    points.forEach((pt, i) => {
      const d = this._makeDot(pt.x, pt.y)
      this._dotsLayer.addChild(d)
      this._dots.push(d)
      bounceIn(d, { delay: i * 0.05 })
    })

    // Pennspets vid första pricken; pulsa nästa otända prick som inbjudan.
    const first = this._dots[0]
    this._pencil.position.set(first.x, first.y - 6)
    this._pencil.visible = true
    this._pulseNext()
  },

  // Formgeneratorer — arrays av {x,y} inom logiska rutan [180,1100]×[200,590].
  _genShape(variation) {
    const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

    if (variation === 0) {
      // 1. Rak vågrät linje, 4 prickar.
      const n = 4
      const y = 395
      const x0 = 260
      const x1 = 1020
      return Array.from({ length: n }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / (n - 1), y }))
    }

    if (variation === 1) {
      // 2. Vågig linje (sinus), 5–6 prickar.
      const n = 5 + Math.min((this._round / 8) | 0, 1)
      const x0 = 240
      const x1 = 1040
      const amp = 110 + Math.random() * 30
      const phase = randomFrom([0, Math.PI])
      const cycles = 1.5 + Math.random() * 0.5
      return Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1)
        return { x: x0 + (x1 - x0) * t, y: 395 + Math.sin(phase + t * Math.PI * cycles) * amp }
      })
    }

    if (variation === 2) {
      // 3. Enkel form (triangel/fyrkant), sluten väg — sista pricken nära första.
      const corners =
        Math.random() < 0.5
          ? [{ x: 640, y: 235 }, { x: 980, y: 560 }, { x: 300, y: 560 }]
          : [{ x: 350, y: 250 }, { x: 930, y: 250 }, { x: 930, y: 560 }, { x: 350, y: 560 }]
      const close = lerp(corners[corners.length - 1], corners[0], 0.7)
      return [...corners, close]
    }

    // 4. Sicksack-berg, 6–8 prickar.
    const n = 6 + Math.min((this._round / 4) | 0, 2)
    const x0 = 240
    const x1 = 1040
    return Array.from({ length: n }, (_, i) => ({
      x: x0 + ((x1 - x0) * i) / (n - 1),
      y: i % 2 === 0 ? 560 : 250,
    }))
  },

  _makeDot(x, y) {
    const g = new Graphics()
      .circle(0, 0, DOT_R)
      .fill({ color: COLORS.inkSoft, alpha: 0.18 })
      .stroke({ width: 4, color: COLORS.inkSoft, alpha: 0.5 })
    g.position.set(x, y)
    g.eventMode = 'none'
    g._lit = false
    return g
  },

  // Mjuk puls på nästa otända prick (lockar fingret framåt).
  _pulseNext() {
    this._pulseTween?.kill()
    this._pulseTween = null
    const d = this._dots[this._next]
    if (!d || d.destroyed) return
    gsap.killTweensOf(d.scale)
    d.scale.set(1)
    this._pulseTween = gsap.to(d.scale, {
      x: 1.18,
      y: 1.18,
      duration: 0.6,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    })
  },

  // ---- Pekare: spårning (drag) + tap-tap genom samma _checkPoint ----------

  _pointerDown(ctx, e) {
    if (!this._alive || this._resolving) return
    this._tracing = true
    this._idle = 0
    this._checkPoint(ctx, this._root.toLocal(e.global), true)
  },

  _pointerMove(ctx, e) {
    if (!this._alive || this._resolving || !this._tracing) return
    this._checkPoint(ctx, this._root.toLocal(e.global), false)
  },

  // Tänd nästa prick(ar) inom träffradien. Hoppar fingret över en prick fylls de
  // överhoppade i på vägen (barnet fastnar aldrig). Strayar fingret händer inget
  // störande — pennan stannar kvar på vägen, ALDRIG en omstart.
  _checkPoint(ctx, p, isTap) {
    if (this._resolving || !this._alive || this._next >= this._dots.length) return

    let target = -1
    for (let i = this._next; i < this._dots.length; i++) {
      const d = this._dots[i]
      if (Math.hypot(p.x - d.x, p.y - d.y) < HIT_R) target = i
    }

    if (target < 0) {
      // Endast på ett friskt tryck (inte under själva draget) ger vi en mjuk respons,
      // så varje pekning får återkoppling utan att tjattra under draget.
      if (isTap) {
        for (let i = this._next + 1; i < this._dots.length; i++) {
          const d = this._dots[i]
          if (Math.hypot(p.x - d.x, p.y - d.y) < HIT_R) {
            // Tappade en prick längre fram — vänlig vink mot rätt nästa-prick.
            ctx.services.audio.sfx('soft')
            wiggle(this._dots[this._next])
            return
          }
        }
        // Tomt tryck på ritytan: liten gnista (aldrig en bestraffning).
        ctx.services.audio.sfx('soft')
        sparkle(ctx.fxLayer, p.x, p.y, { count: 4 })
      }
      return
    }

    this._idle = 0
    for (let i = this._next; i <= target; i++) this._lightDot(ctx, i)
    this._next = target + 1
    this._afterLight(ctx)
  },

  // Tänd EN prick: fyll med färg + ljud + puls + gnista (<100ms).
  _lightDot(ctx, i) {
    const d = this._dots[i]
    if (!d || d._lit) return
    d._lit = true
    gsap.killTweensOf(d.scale)
    d.scale.set(1)
    d.clear()
      .circle(0, 0, DOT_R)
      .fill(this._color)
      .stroke({ width: 4, color: COLORS.white, alpha: 0.85 })
    this._litCount++
    ctx.services.audio.sfx(this._litCount % 3 === 0 ? 'pop' : 'pling')
    pop(d)
    sparkle(ctx.fxLayer, d.x, d.y)
  },

  // Efter att en eller flera prickar tänts: rita spåret, flytta pennan, kolla klart.
  _afterLight(ctx) {
    this._redrawInk()
    const last = this._dots[this._next - 1]
    if (last && this._pencil && !this._pencil.destroyed) {
      gsap.killTweensOf(this._pencil)
      gsap.to(this._pencil, { x: last.x, y: last.y - 6, duration: 0.18, ease: 'power2.out' })
    }
    if (!this._saidGo) {
      this._saidGo = true
      ctx.services.voice.say('Bra, fortsätt!')
    }
    if (this._next >= this._dots.length) this._onComplete(ctx)
    else this._pulseNext()
  },

  // Rita om hela det färglagda spåret genom de tända prickarna (kontigt prefix 0.._next-1).
  _redrawInk() {
    this._ink.clear()
    if (this._next < 2) return
    this._ink.moveTo(this._dots[0].x, this._dots[0].y)
    for (let i = 1; i < this._next; i++) this._ink.lineTo(this._dots[i].x, this._dots[i].y)
    this._ink.stroke({ width: INK_W, color: this._color, cap: 'round', join: 'round' })
  },

  // Hela linjen klar: firande + ny form. _resolving skyddar mot dubbel-trigg.
  _onComplete(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._tracing = false
    this._pulseTween?.kill()
    this._pulseTween = null

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))

    // Linjen "vaknar": varje prick pulsar i följd (städbar timeline).
    this._celebrateTL = gsap.timeline()
    this._dots.forEach((d, i) => {
      this._celebrateTL.add(() => {
        if (this._alive && !d.destroyed) pop(d)
      }, i * 0.08)
    })
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    // Förlopp: höj nivå/svårighet + räkna rundor (oändligt) + delat firande.
    this._round += 1
    ctx.progress.setLevel(this._round)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    ctx.progress.complete()

    this._nextRoundCall = gsap.delayedCall(1.4, () => {
      if (this._alive) this._buildRound(ctx)
    })
  },

  // ---- Idle-recue ----------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive || this._resolving) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle >= IDLE_DELAY) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      const d = this._dots[this._next]
      if (d && !d.destroyed) wiggle(d) // vänlig vink om var man fortsätter
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._nextRoundCall?.kill?.()
    this._celebrateTL?.kill()
    this._pulseTween?.kill()
    if (this._paper && !this._paper.destroyed) {
      this._paper.off('pointerdown', this._onDown)
      this._paper.off('globalpointermove', this._onMove)
      this._paper.off('pointerup', this._onUp)
      this._paper.off('pointerupoutside', this._onUp)
    }
    for (const d of this._dots) {
      if (d && !d.destroyed) {
        gsap.killTweensOf(d)
        gsap.killTweensOf(d.scale)
      }
    }
    if (this._pencil && !this._pencil.destroyed) gsap.killTweensOf(this._pencil)
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
