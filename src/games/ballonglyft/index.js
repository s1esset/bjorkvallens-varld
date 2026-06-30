// Ballonglyft — räkna ballonger som lyfter (2–4 år). Elvira står på sin balkong och
// önskar sig ett antal ballonger (visas som en tankebubbla: "3 🎈"). Bobos present 🎁
// står på marken. Barnet TRYCKER (på presenten eller den stora knappen) för att fästa
// en helium­ballong i taget — varje ballong syns fästa ovanför presenten och lyfter den
// ETT TYDLIGT STEG uppåt (vi räknar högt på svenska). När presenten nått upp till Elvira
// tar hon emot den → firande, klistermärke, ny (fler ballonger) nivå. En blek "spök­present"
// vid balkongen visar HELA tiden vart den ska. Inget kan bli fel: trycker man när alla
// ballonger redan sitter vinglar det bara lite, och en mjuk auto-hjälp fäster en ballong
// åt barnet om det dröjer. Rörelsen är enkla gsap-steg (ingen fjäder/studs) → lätt att
// förstå vad som händer. Allt ritas programmatiskt (emoji + Pixi Graphics). Exit-säkert.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { Button } from '../../lib/Button.js'
import { bounceIn, pop, wiggle, sparkle, burst, floatText, breathe } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'

// Räkneord (index = antal ballonger). n=1 -> 'en', n=2 -> 'två' ...
const SVENSKA_TAL = ['noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta']

// Layout (designkoordinater 1280×720) — presenten lyfts rakt upp i kolumnen vid Elvira.
const BOX_X = 820
const GROUND_BOX_Y = 600 // presentens center när den vilar på marken

const IDLE_MS = 5500 // ms utan tryck → mjuk auto-hjälp (fäster en ballong åt barnet)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'ballonglyft',
  titleSv: 'Ballonglyft',
  icon: '🎈',
  category: 'larande',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'ballonglyft',
  voiceIntro: 'Tryck för att fästa ballonger — räkna så lyfter paketet upp till Elvira!',

  init(ctx) {
    this._alive = true
    this._level = Math.max(1, (ctx.progress.get().highestLevel | 0) || 1)
    this._t = 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund (gradient + sol + moln + mark) som FÖRSTA barn, dekorativ.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Lager: balkong+Elvira+bubbla → spök-present (mål) → snören → ballonger → present → räknare → knapp.
    this._balcony = this._makeBalcony()
    this._root.addChild(this._balcony)

    // Blek "spök-present" vid balkongen — visar HELA tiden vart presenten ska.
    this._ghost = new Text({ text: '🎁', style: { fontFamily: FONT.body, fontSize: 96 } })
    this._ghost.anchor.set(0.5)
    this._ghost.alpha = 0.28
    this._ghost.eventMode = 'none'
    this._root.addChild(this._ghost)

    this._strings = new Graphics()
    this._strings.eventMode = 'none'
    this._root.addChild(this._strings)

    this._balloonLayer = new Container()
    this._root.addChild(this._balloonLayer)

    this._box = this._makeBox(ctx)
    this._root.addChild(this._box)

    this._counter = this._makeCounter()
    this._root.addChild(this._counter)

    this._addBtn = new Button({
      label: 'Fäst ballong',
      icon: '🎈',
      width: 340,
      height: 124,
      color: COLORS.green,
      services: ctx.services,
      sound: 'pop',
      onTap: () => this._addBalloon(ctx),
    })
    this._addBtn.position.set(330, 650)
    this._root.addChild(this._addBtn)

    this._balloons = []
    this._loadLevel(this._level)

    this._tick = () => this._update(ctx)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idleMs = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // --- Bygg-hjälpare ---------------------------------------------------------

  _makeBalcony() {
    // Lokala koordinater: plattans ovansida ligger på lokal y=0; container.y flyttas per nivå.
    const c = new Container()
    c.eventMode = 'none'
    c.interactiveChildren = false

    const rail = new Graphics()
    rail.roundRect(712, -36, 12, 42, 5).fill(0x6f4630)
    rail.roundRect(996, -36, 12, 42, 5).fill(0x6f4630)
    rail.roundRect(712, -36, 296, 10, 5).fill(0x6f4630)
    c.addChild(rail)

    const plate = new Graphics()
    plate.roundRect(700, 0, 320, 34, 14).fill(COLORS.brown).stroke({ width: 6, color: 0x6f4630 })
    c.addChild(plate)

    const elvira = new Text({ text: '🧒', style: { fontFamily: FONT.body, fontSize: 96 } })
    elvira.anchor.set(0.5, 1)
    elvira.position.set(BOX_X, 2)
    c.addChild(elvira)
    this._elvira = elvira

    const name = new Text({
      text: 'Elvira',
      style: { fontFamily: FONT.title, fontSize: 30, fontWeight: '700', fill: COLORS.ink },
    })
    name.anchor.set(0.5, 1)
    name.position.set(BOX_X, -104)
    c.addChild(name)

    // Tankebubbla som visar MÅLET: "N 🎈".
    const bubble = new Container()
    const bg = new Graphics()
      .circle(0, 0, 52).fill({ color: COLORS.white })
      .circle(-44, 40, 12).fill({ color: COLORS.white })
      .circle(-60, 58, 7).fill({ color: COLORS.white })
    const want = new Text({ text: '3', style: { fontFamily: FONT.display, fontSize: 52, fontWeight: '700', fill: COLORS.ink } })
    want.anchor.set(0.5)
    want.position.set(-16, 0)
    const balloon = new Text({ text: '🎈', style: { fontFamily: FONT.body, fontSize: 40 } })
    balloon.anchor.set(0.5)
    balloon.position.set(22, 0)
    bubble.addChild(bg, want, balloon)
    bubble.position.set(BOX_X + 96, -150)
    c.addChild(bubble)
    this._wantText = want

    return c
  },

  _makeBox(ctx) {
    const box = new Container()

    const shadow = new Graphics().ellipse(0, 82, 70, 18).fill({ color: COLORS.shadow, alpha: 0.18 })
    shadow.eventMode = 'none'
    box.addChild(shadow)
    this._boxShadow = shadow

    const plate = new Graphics()
    plate.roundRect(-70, -70, 140, 140, 22).fill(COLORS.red).stroke({ width: 6, color: COLORS.orangeDark })
    plate.roundRect(-58, -60, 116, 26, 12).fill({ color: COLORS.white, alpha: 0.18 }) // glansband
    plate.eventMode = 'none'
    box.addChild(plate)

    const ribbon = new Graphics()
    ribbon.rect(-12, -70, 24, 140).fill(COLORS.yellow)
    ribbon.rect(-70, -12, 140, 24).fill(COLORS.yellow)
    ribbon.eventMode = 'none'
    box.addChild(ribbon)

    const gift = new Text({ text: '🎁', style: { fontFamily: FONT.body, fontSize: 110 } })
    gift.anchor.set(0.5)
    gift.position.set(0, -2)
    gift.eventMode = 'none'
    box.addChild(gift)

    // Hela presenten är en tap-yta (fäst en ballong vid tryck), generös träff ≥96px.
    box.eventMode = 'static'
    box.cursor = 'pointer'
    box.hitArea = new Rectangle(-80, -90, 160, 180)
    box.on('pointertap', () => this._addBalloon(ctx))
    return box
  },

  _makeCounter() {
    const c = new Container()
    c.position.set(170, 150)
    c.eventMode = 'none'
    const plate = new Graphics()
    plate.roundRect(-72, -58, 144, 116, 24).fill(COLORS.cream).stroke({ width: 5, color: COLORS.orange })
    c.addChild(plate)
    const t = new Text({
      text: '0',
      style: { fontFamily: FONT.display, fontSize: 96, fontWeight: '700', fill: COLORS.ink, align: 'center' },
    })
    t.anchor.set(0.5)
    t.position.set(0, 2)
    c.addChild(t)
    this._countText = t
    return c
  },

  // --- Nivå-laddning ---------------------------------------------------------

  _loadLevel(level) {
    if (!this._alive) return
    this._level = level

    // Slumpad svårighet: antal ballonger som krävs växer med nivån (3→8).
    this._N = clamp(2 + level + (Math.random() < 0.5 ? 0 : 1), 3, 8)
    // Balkongen sitter högt så lyftet syns tydligt; lite högre per nivå (förblir lösbar; steget = total/N).
    this._balconyY = 250 - Math.min(level - 1, 5) * 16
    this._targetY = this._balconyY + 40 // dit presentens center når när Elvira tar emot

    // Nollställ tillstånd.
    this._n = 0
    this._idleMs = 0
    this._resolving = false
    this._sayCount = false

    // Töm ballonger.
    this._balloons.forEach((b) => {
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
      if (!b.destroyed) b.destroy()
    })
    this._balloons = []
    this._balloonLayer.removeChildren()

    // Present tillbaka på marken; lite större look per nivå.
    gsap.killTweensOf(this._box)
    gsap.killTweensOf(this._box.scale)
    this._box.position.set(BOX_X, GROUND_BOX_Y)
    this._box.rotation = 0
    this._box.visible = true
    this._box.scale.set(1)

    // Balkong/Elvira till nivåns höjd; mål-bubbla + spök-present.
    this._balcony.y = this._balconyY
    if (this._wantText && !this._wantText.destroyed) this._wantText.text = String(this._N)
    this._ghost.position.set(BOX_X, this._targetY)
    this._ghostBreathe?.kill()
    this._ghostBreathe = breathe(this._ghost, { scale: 1.06, duration: 1.2 })
    this._updateCounter(false)
    this._strings.clear()
  },

  // Presentens center-y för c fästa ballonger (0 → marken, N → uppe hos Elvira).
  _riseY(c) {
    return GROUND_BOX_Y - (GROUND_BOX_Y - this._targetY) * (c / this._N)
  },

  // --- Kontroll: fäst en ballong ---------------------------------------------

  _addBalloon(ctx, opts = {}) {
    if (!this._alive || this._resolving) return
    if (this._n >= this._N) {
      // Alla ballonger sitter redan — bara lekfullt, aldrig "fel".
      wiggle(this._box)
      ctx.services.audio.sfx('soft')
      if (!opts.auto) this._idleMs = 0
      return
    }
    this._n++
    if (!opts.auto) this._idleMs = 0

    const b = new Text({ text: '🎈', style: { fontFamily: FONT.body, fontSize: 72 } })
    b.anchor.set(0.5, 1)
    b.eventMode = 'none'
    this._balloonLayer.addChild(b)
    this._balloons.push(b)
    this._layoutBalloons()
    bounceIn(b)

    this._updateCounter()
    ctx.services.audio.sfx('pop')
    if (Math.random() < 0.4) ctx.services.audio.sfx('pling')

    // Räkna högt på svenska (varje gång — räkning är poängen).
    if (SVENSKA_TAL[this._n]) ctx.services.voice.say(SVENSKA_TAL[this._n])

    // Presenten lyfts ett tydligt steg uppåt. Sista ballongen → upp till Elvira.
    const reached = this._n >= this._N
    gsap.killTweensOf(this._box)
    this._riseTween = gsap.to(this._box, {
      y: this._riseY(this._n),
      duration: 0.55,
      ease: reached ? 'power2.inOut' : 'back.out(1.3)',
      onComplete: () => {
        if (this._alive && reached) this._succeed(ctx)
      },
    })
    sparkle(ctx.fxLayer, this._box.x, this._box.y - 110, { count: 4 })
  },

  _updateCounter(animate = true) {
    if (!this._countText || this._countText.destroyed) return
    this._countText.text = String(this._n)
    if (animate) pop(this._counter)
  },

  // Solfjäder-placering: ballongerna fäster ovanför presenten och bobbar lugnt.
  _layoutBalloons() {
    const box = this._box
    const n = this._balloons.length
    for (let i = 0; i < n; i++) {
      const b = this._balloons[i]
      if (b.destroyed) continue
      const angle = -Math.PI / 2 + (i - (n - 1) / 2) * 0.3
      const radius = 92
      b.x = box.x + Math.cos(angle) * radius
      b.y = box.y - 92 + Math.sin(angle) * radius + Math.sin(this._t * 0.003 + i) * 5
    }
  },

  _drawStrings() {
    const box = this._box
    const topX = box.x
    const topY = box.y - 66
    this._strings.clear()
    for (const b of this._balloons) {
      if (b.destroyed) continue
      this._strings.moveTo(topX, topY).lineTo(b.x, b.y)
    }
    this._strings.stroke({ width: 3, color: 0x8a7766, alpha: 0.7 })
  },

  // --- Huvudloop: ballong-bobb + snören + idle/auto-hjälp ---------------------

  _update(ctx) {
    if (!this._alive) return
    this._t += ctx.ticker.deltaMS
    this._layoutBalloons()
    this._drawStrings()

    if (this._resolving) return

    // Idle → mjuk auto-hjälp som fäster en ballong åt barnet (garanterad framgång).
    this._idleMs += ctx.ticker.deltaMS
    if (this._idleMs >= IDLE_MS) {
      this._idleMs = 0
      if (this._n < this._N) {
        ctx.services.voice.say('Vi fäster en ballong till!')
        pop(this._addBtn)
        this._addBalloon(ctx, { auto: true })
      } else {
        ctx.services.voice.replayLast()
      }
    }
  },

  _succeed(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true

    pop(this._elvira)
    ctx.services.audio.sfx('correct')
    burst(ctx.fxLayer, this._box.x, this._box.y, { power: 1.2 })
    floatText(ctx.fxLayer, this._box.x, this._box.y - 120, '🎈', { fontSize: 56 })

    // Presenten glider de sista pixlarna in i Elviras famn.
    gsap.killTweensOf(this._box)
    gsap.to(this._box, { y: this._balconyY - 10, duration: 0.5, ease: 'power2.out' })

    // Förlopp + delat firande (firar-ljud + beröm-röst + konfetti + stjärna + klistermärke).
    ctx.progress.setLevel(this._level + 1)
    const got = ctx.progress.get().custom?.leveranser || 0
    ctx.progress.setCustom('leveranser', got + 1)
    ctx.progress.complete()

    this._levelCall = gsap.delayedCall(1.7, () => {
      if (this._alive) this._loadLevel(this._level + 1)
    })
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    ctx.services.voice.cancel()
    this._levelCall?.kill()
    this._riseTween?.kill()
    this._ghostBreathe?.kill()
    if (this._box) {
      gsap.killTweensOf(this._box)
      gsap.killTweensOf(this._box.scale)
    }
    if (this._ghost) gsap.killTweensOf(this._ghost.scale)
    if (this._counter) gsap.killTweensOf(this._counter.scale)
    if (this._elvira) gsap.killTweensOf(this._elvira.scale)
    if (this._addBtn) gsap.killTweensOf(this._addBtn.scale)
    this._balloons?.forEach((b) => {
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
    })
    this._root?.destroy({ children: true })
  },
}
