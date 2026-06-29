// Ballonglyft — räkne-känsla + finjustering (2–4 år). En tung present (🎁, "Bobos
// present") står på marken. Barnet trycker för att fästa heliumballonger 🎈 — varje
// ballong ger ett konstant UPP-lyft, så presenten "vill" vila högre ju fler den har.
// För få → den stannar lågt; LAGOM → den stiger och stannar i höjdfönstret vid
// balkongen där Elvira tar emot den; för många → den bonkar mjukt i taket (poppa en
// ballong för att sjunka). När presenten vilar lugnt i fönstret sträcker Elvira ut
// armarna → firande, klistermärke, ny (tyngre) present (oändlig lek).
//
// Rörelsen är 1D och drivs av en EGEN vertikal integrator i ctx.ticker (dämpad
// buoyancy-fjäder mot en vilohöjd som beror på antalet ballonger) — INGEN matter.js,
// INGEN AimLauncher. No-fail: för få/för många ger bara rolig respons, och en mjuk
// auto-hjälp lägger till/poppar en ballong åt barnet tills presenten garanterat
// hamnar i fönstret. Allt ritas programmatiskt (emoji + Pixi Graphics). Exit-säkert.
import { Container, Graphics, Text, Rectangle, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { Button } from '../../lib/Button.js'
import { bounceIn, pop, wiggle, puff, sparkle, burst, floatText, breathe } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'

// Räkneord (index = antal ballonger). n=1 -> 'en', n=2 -> 'två' ...
const SVENSKA_TAL = ['noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio']

// Layout (designkoordinater 1280×720) — presenten rör sig lodrätt i x-kolumnen ~860.
const BOX_X = 860
const GROUND_BOX_Y = 590 // presentens center när den vilar på marken
const CEILING_Y = 150 // mjukt "tak" där ballonger bonkar
const WINDOW_CX = 870 // höjdfönstrets centrum-x (pulserande band)

// Integrator-konstanter (dämpad fjäder mot vilohöjden eqY).
const K = 0.018
const DAMP = 0.9

// Nivåer: tyngre present (mindre riseStep) + högre balkong (fönster längre upp)
// kräver att räkna FLER ballonger. targetN ≈ (590 - windowCenter) / riseStep.
const LEVELS = [
  { riseStep: 75, windowLo: 205, windowHi: 300 }, // targetN ≈ 4–5
  { riseStep: 66, windowLo: 195, windowHi: 275 }, // targetN ≈ 5–6
  { riseStep: 58, windowLo: 180, windowHi: 255 }, // targetN ≈ 6–7
  { riseStep: 52, windowLo: 170, windowHi: 240 }, // targetN ≈ 7–8
]

function levelConfig(level) {
  const idx = Math.min(LEVELS.length - 1, Math.max(0, level - 1))
  const cfg = { ...LEVELS[idx] }
  // Nivå 5+: upprepa mönstret med liten höjd-jitter (hela fönstret skiftas, förblir lösbart).
  if (level > LEVELS.length) {
    const j = ((Math.random() * 16 - 8) | 0)
    cfg.windowLo += j
    cfg.windowHi += j
  }
  return cfg
}

export default {
  id: 'ballonglyft',
  titleSv: 'Ballonglyft',
  icon: '🎈',
  category: 'larande',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'ballonglyft',
  voiceIntro: 'Fäst ballonger så lyfter paketet upp till Elvira!',

  init(ctx) {
    this._alive = true
    this._level = Math.max(1, (ctx.progress.get().highestLevel | 0) || 1)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund (gradient + sol + moln + mark) som FÖRSTA barn, dekorativ.
    const scene = createScene('meadow', { width: ctx.width, height: ctx.height })
    this._root.addChild(scene)

    // Lager-ordning: balkong+Elvira → höjdfönster → snörren → ballonger → present → räknare → knappar.
    this._balcony = this._makeBalcony()
    this._root.addChild(this._balcony)

    this._window = new Graphics()
    this._window.eventMode = 'none'
    this._root.addChild(this._window)

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
      width: 300,
      height: 120,
      color: COLORS.green,
      services: ctx.services,
      sound: 'pop',
      onTap: () => this._addBalloon(ctx),
    })
    this._addBtn.position.set(230, 650)
    this._root.addChild(this._addBtn)

    this._popBtn = new Button({
      label: 'Poppa',
      icon: '💥',
      width: 240,
      height: 120,
      color: COLORS.orange,
      services: ctx.services,
      sound: 'soft',
      onTap: () => this._popBalloon(ctx),
    })
    this._popBtn.position.set(560, 650)
    this._root.addChild(this._popBtn)

    // Lugn inbjudande puls på höjdfönstret (skapas en gång, geometri ritas per nivå).
    this._windowBreathe = breathe(this._window, { scale: 1.06, duration: 1.3 })

    this._balloons = []
    this._loadLevel(ctx, this._level)

    this._tick = () => this._update(ctx)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // --- Bygg-hjälpare ---------------------------------------------------------

  _makeBalcony() {
    // Lokala koordinater: plattans ovansida ligger på lokal y=0; container.y flyttas per nivå.
    const c = new Container()
    c.eventMode = 'none'
    c.interactiveChildren = false

    const rail = new Graphics()
    rail.roundRect(752, -36, 12, 42, 5).fill(0x6f4630)
    rail.roundRect(1036, -36, 12, 42, 5).fill(0x6f4630)
    rail.roundRect(752, -36, 296, 10, 5).fill(0x6f4630)
    c.addChild(rail)

    const plate = new Graphics()
    plate.roundRect(740, 0, 320, 34, 14).fill(COLORS.brown).stroke({ width: 6, color: 0x6f4630 })
    c.addChild(plate)

    const elvira = new Text({ text: '🧒', style: { fontFamily: FONT.body, fontSize: 96 } })
    elvira.anchor.set(0.5, 1)
    elvira.position.set(820, 2)
    c.addChild(elvira)
    this._elvira = elvira

    const name = new Text({
      text: 'Elvira',
      style: { fontFamily: FONT.title, fontSize: 30, fontWeight: '700', fill: COLORS.ink },
    })
    name.anchor.set(0.5, 1)
    name.position.set(820, -104)
    c.addChild(name)

    return c
  },

  _makeBox(ctx) {
    const box = new Container()

    const shadow = new Graphics().ellipse(0, 82, 70, 18).fill({ color: COLORS.shadow, alpha: 0.18 })
    shadow.eventMode = 'none'
    box.addChild(shadow)

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

    // Extra rosett på tyngre presenter (nivå ≥ 2).
    const bow = new Text({ text: '🎀', style: { fontFamily: FONT.body, fontSize: 56 } })
    bow.anchor.set(0.5)
    bow.position.set(0, -68)
    bow.visible = false
    bow.eventMode = 'none'
    box.addChild(bow)
    this._extraBow = bow

    const gift = new Text({ text: '🎁', style: { fontFamily: FONT.body, fontSize: 110 } })
    gift.anchor.set(0.5)
    gift.position.set(0, -2)
    gift.eventMode = 'none'
    box.addChild(gift)

    // Hela presenten är en tap-yta (lägg till en ballong vid tryck), generös träff ≥96px.
    box.eventMode = 'static'
    box.cursor = 'pointer'
    box.hitArea = new Rectangle(-80, -90, 160, 180)
    box.on('pointertap', () => this._addBalloon(ctx))
    return box
  },

  _makeCounter() {
    const c = new Container()
    c.position.set(180, 150)
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

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._level = level
    const cfg = levelConfig(level)
    this._riseStep = cfg.riseStep
    this._windowLo = cfg.windowLo
    this._windowHi = cfg.windowHi
    this._windowCenter = (cfg.windowLo + cfg.windowHi) / 2
    const targetN = Math.round((GROUND_BOX_Y - this._windowCenter) / this._riseStep)
    this._maxN = Math.min(9, targetN + 3)

    // Nollställ tillstånd.
    this._n = 0
    this._vy = 0
    this._dwellMs = 0
    this._idleMs = 0
    this._t = 0
    this._resolving = false
    this._lifted = false
    this._inZonePrev = false
    this._recued = false
    this._sayCount = false
    this._bonkCooldown = 0

    // Töm ballonger.
    this._balloons.forEach((b) => {
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
      if (!b.destroyed) b.destroy()
    })
    this._balloons = []
    this._balloonLayer.removeChildren()

    // Present tillbaka på marken; lite större/tyngre look per nivå.
    gsap.killTweensOf(this._box)
    gsap.killTweensOf(this._box.scale)
    this._box.position.set(BOX_X, GROUND_BOX_Y)
    this._box.rotation = 0
    this._box.visible = true
    this._box.scale.set(1 + Math.min(0.18, (level - 1) * 0.05))
    this._extraBow.visible = level >= 2

    // Flytta balkong/Elvira/fönster till nivåns höjd (plattan sitter vid fönstrets botten).
    this._balcony.y = this._windowHi
    this._drawWindow()
    this._updateCounter(false)
    this._strings.clear()
  },

  _drawWindow() {
    const h = this._windowHi - this._windowLo
    this._window.clear()
    this._window
      .roundRect(-100, -h / 2, 200, h, 18)
      .fill({ color: COLORS.yellow, alpha: 0.22 })
      .stroke({ width: 4, color: COLORS.yellow, alpha: 0.6 })
    this._window.position.set(WINDOW_CX, this._windowCenter)
  },

  // --- Kontroller ------------------------------------------------------------

  _addBalloon(ctx, opts = {}) {
    if (!this._alive || this._resolving) return
    if (this._n >= this._maxN) {
      // Redan fullt — bara lekfullt, aldrig "fel".
      wiggle(this._box)
      ctx.services.audio.sfx('soft')
      if (!opts.auto) this._resetIdle()
      return
    }
    this._n++

    const b = new Text({ text: '🎈', style: { fontFamily: FONT.body, fontSize: 72 } })
    b.anchor.set(0.5, 1)
    b.eventMode = 'static'
    b.cursor = 'pointer'
    b.hitArea = new Circle(0, -28, 52) // ≥96px träff
    b.on('pointertap', () => this._popBalloon(ctx, b))
    this._balloonLayer.addChild(b)
    this._balloons.push(b)
    this._layoutBalloons() // placera direkt så entrén sker på rätt ställe
    bounceIn(b)

    this._updateCounter()
    ctx.services.audio.sfx('pop')
    if (Math.random() < 0.4) ctx.services.audio.sfx('pling')

    // Räkna högt på svenska — varannan gång (för att inte tjattra).
    this._sayCount = !this._sayCount
    if (this._sayCount && SVENSKA_TAL[this._n]) ctx.services.voice.say(SVENSKA_TAL[this._n])

    if (!opts.auto) this._resetIdle()
  },

  _popBalloon(ctx, b, opts = {}) {
    if (!this._alive || this._resolving) return
    if (this._n <= 0 || this._balloons.length === 0) {
      // Inget att poppa — liten vingel, inget störande.
      wiggle(this._box)
      ctx.services.audio.sfx('soft')
      if (!opts.auto) this._resetIdle()
      return
    }
    let target = b
    if (!target || target.destroyed || !this._balloons.includes(target)) {
      target = this._balloons[this._balloons.length - 1] // senaste/översta
    }
    const idx = this._balloons.indexOf(target)
    this._balloons.splice(idx, 1)
    this._n = Math.max(0, this._n - 1)

    const bx = target.x
    const by = target.y - 28
    puff(ctx.fxLayer, bx, by, { count: 8, color: COLORS.red })
    floatText(ctx.fxLayer, bx, by, '💨', { fontSize: 48 })
    ctx.services.audio.sfx('soft')

    gsap.killTweensOf(target)
    gsap.killTweensOf(target.scale)
    target.destroy()

    this._updateCounter()
    if (!opts.auto) this._resetIdle()
  },

  _updateCounter(animate = true) {
    if (!this._countText || this._countText.destroyed) return
    this._countText.text = String(this._n)
    if (animate) pop(this._counter)
  },

  _resetIdle() {
    this._idleMs = 0
    this._recued = false
  },

  // Solfjäder-placering: ballong i får en mål-offset relativt presentens topp.
  _layoutBalloons() {
    const box = this._box
    const n = this._balloons.length
    for (let i = 0; i < n; i++) {
      const b = this._balloons[i]
      if (b.destroyed) continue
      const angle = -Math.PI / 2 + (i - (n - 1) / 2) * 0.28
      const radius = 96
      b.x = box.x + Math.cos(angle) * radius
      b.y = box.y - 96 + Math.sin(angle) * radius + Math.sin(this._t * 0.003 + i) * 6
    }
  },

  _drawStrings() {
    const box = this._box
    const topX = box.x
    const topY = box.y - 70 * box.scale.y
    this._strings.clear()
    for (const b of this._balloons) {
      if (b.destroyed) continue
      this._strings.moveTo(topX, topY).lineTo(b.x, b.y)
    }
    this._strings.stroke({ width: 3, color: 0x8a7766, alpha: 0.7 })
  },

  _bonk(ctx) {
    if (this._bonkCooldown > 0) return
    this._bonkCooldown = 180
    ctx.services.audio.sfx('pop')
    sparkle(ctx.fxLayer, this._box.x, CEILING_Y)
    wiggle(this._box)
    if (Math.random() < 0.5) floatText(ctx.fxLayer, this._box.x, CEILING_Y - 20, 'boing!', { fontSize: 42 })
  },

  // Mjuk auto-hjälp: justera antalet mot rätt så presenten garanterat når fönstret.
  _autoHelp(ctx) {
    if (!this._alive || this._resolving) return
    const eqY = GROUND_BOX_Y - this._n * this._riseStep
    if (eqY > this._windowHi && this._n < this._maxN) {
      // Vilar för lågt (för få) → lägg till en.
      ctx.services.voice.say('Vi provar en ballong till!')
      this._addBalloon(ctx, { auto: true })
    } else if (eqY < this._windowLo && this._n > 0) {
      // Vilar för högt (för många) → poppa en.
      ctx.services.voice.say('Vi poppar en ballong.')
      this._popBalloon(ctx, undefined, { auto: true })
    }
  },

  // --- Huvudloop (fysik + idle/auto-hjälp + mål-detektion) -------------------

  _update(ctx) {
    if (!this._alive) return
    const deltaMS = ctx.ticker.deltaMS
    const dt = Math.min(2, deltaMS / 16.67)
    const box = this._box
    this._t += deltaMS

    if (!this._resolving) {
      // Dämpad buoyancy-fjäder mot vilohöjden eqY (= högre upp ju fler ballonger).
      const eqY = GROUND_BOX_Y - this._n * this._riseStep
      const a = K * (eqY - box.y)
      this._vy += a * dt
      this._vy *= Math.pow(DAMP, dt)
      box.y += this._vy * dt

      // Mjukt tak: "för många ballonger" studsar mjukt.
      if (box.y < CEILING_Y) {
        box.y = CEILING_Y
        this._vy = Math.abs(this._vy) * 0.4
        this._bonk(ctx)
      }
      // Mark: presenten kan aldrig falla genom marken.
      if (box.y > GROUND_BOX_Y) {
        box.y = GROUND_BOX_Y
        if (this._vy > 0) this._vy = 0
      }
      // Litet pop när den först lättar från marken.
      if (!this._lifted && box.y < GROUND_BOX_Y - 3) {
        this._lifted = true
        pop(box)
      }

      // Mjuk pling första gången presenten kommer in i höjdfönstret.
      const inZone = box.y >= this._windowLo && box.y <= this._windowHi
      if (inZone && !this._inZonePrev) {
        ctx.services.audio.sfx('pling')
        sparkle(ctx.fxLayer, WINDOW_CX, this._windowCenter)
      }
      this._inZonePrev = inZone

      // Mål-/stabilitetsdetektion: vila lugnt i fönstret → Elvira tar emot.
      if (inZone && Math.abs(this._vy) < 0.4) {
        this._dwellMs += deltaMS
        if (this._dwellMs >= 700) {
          this._succeed(ctx)
          return
        }
      } else {
        this._dwellMs = 0
      }

      // Idle-recue (mjuk nudge) + auto-hjälp (garanterad framgång) — bara utanför fönstret.
      if (inZone) {
        this._resetIdle()
      } else {
        this._idleMs += deltaMS
        if (this._idleMs >= 6000 && !this._recued) {
          this._recued = true
          ctx.services.voice.replayLast()
          pop(this._addBtn)
        }
        if (this._idleMs >= 7000) {
          this._autoHelp(ctx)
          this._idleMs = 4500 // nästa auto-steg om ~2,5s
          this._recued = true
        }
      }
    }

    // Ballonger bobbar + snörren ritas om (även under mottagning så de följer presenten).
    this._layoutBalloons()
    this._drawStrings()
    if (this._bonkCooldown > 0) this._bonkCooldown -= deltaMS
  },

  _succeed(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._dwellMs = 0
    const box = this._box

    pop(this._elvira)
    ctx.services.audio.sfx('correct')
    burst(ctx.fxLayer, box.x, box.y, { power: 1.2 })

    // Presenten glider de sista pixlarna in i Elviras famn (_resolving hindrar tap;
    // destroy() dödar tween:en om barnet lämnar mitt i animationen).
    gsap.killTweensOf(box)
    gsap.to(box, { x: 820, y: this._balcony.y - 30, duration: 0.8, ease: 'power2.inOut' })

    // Förlopp + delat firande (firar-ljud + beröm-röst + konfetti + stjärna + klistermärke).
    ctx.progress.setLevel(this._level + 1)
    const got = ctx.progress.get().custom?.leveranser || 0
    ctx.progress.setCustom('leveranser', got + 1)
    ctx.progress.complete()

    this._levelCall = gsap.delayedCall(1.6, () => {
      if (this._alive) this._loadLevel(ctx, this._level + 1)
    })
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    ctx.services.voice.cancel()
    this._levelCall?.kill()
    this._windowBreathe?.kill()
    if (this._box) {
      gsap.killTweensOf(this._box)
      gsap.killTweensOf(this._box.scale)
    }
    if (this._counter) gsap.killTweensOf(this._counter.scale)
    if (this._window) gsap.killTweensOf(this._window.scale)
    if (this._elvira) gsap.killTweensOf(this._elvira.scale)
    if (this._addBtn) gsap.killTweensOf(this._addBtn.scale)
    if (this._popBtn) gsap.killTweensOf(this._popBtn.scale)
    this._balloons?.forEach((b) => {
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
    })
    this._root?.destroy({ children: true })
  },
}
