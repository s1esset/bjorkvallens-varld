// Gungan — fysik-GAME (2–4 år). Lova sitter på en gunga (pendel) som hänger i en
// A-ram. Barnet TRYCKER i takt med gungandet för att pumpa henne högre och högre
// (resonans: en knuff i rätt fas tillför mest energi) tills hon når toppen och
// NUDDAR fågeln/äpplet på grenen → firande. Hon faller ALDRIG av, och en mjuk
// auto-medvind garanterar att målet alltid nås även om barnet inte trycker rätt.
//
// TVÅ kontroller som ändrar utfallet (krav ≥2):
//   1) TIMING av trycken — fas-kvaliteten q (nära ytterläget = full knuff, i botten
//      = liten men aldrig negativ knuff) avgör hur snabbt amplituden växer.
//   2) "Starkare knuff"-toggle (💪) — dubblar (~×1.8) knuffstyrkan. (Bonus: ett
//      svep > 60px ger en extra-stor knuff skalad av sveplängden.)
//
// Pendeln drivs ENBART av en egen, ticker-driven integrator (theta'' =
// -(g/L)sinθ - dämpning + knuff). INGEN GSAP rör pendeln → trivialt exit-säker.
import { Container, Graphics, Text, Rectangle, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { pop, wiggle, sparkle, floatText, burst, breathe } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// --- Pendel-konstanter (egen integrator, px/sekund) ---
const OMEGA0 = 2.5 // rad/s naturlig vinkelfrekvens → period ≈ 2,5 s (lugn, lärbar rytm)
const DAMP = 0.22 // 1/s lätt dämpning → bromsar mjukt utan pumpning (faller aldrig av)
const THETA_MAX = 1.45 // ~83°, hård spärr — går ALDRIG över toppen
const PIVOT_X = 640 // upphängningspunkt x
const PIVOT_Y = 150 // upphängningspunkt y
const OMEGA_CAP = 3.2 // tak på vinkelhastighet → kan aldrig skjutas över THETA_MAX

const GOAL_EMOJIS = ['🐦', '🍎', '🎈']
const RHYTHM_LINE = 'Just så — tryck i takt!'
const STRONG_LINE = 'Nu knuffar vi starkare!'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'gungan',
  titleSv: 'Gungan',
  icon: '🐧',
  category: 'fysik',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'gungan',
  voiceIntro: 'Tryck i takt så gungar Lova högre!',

  // ------------------------------------------------------------------ livscykel
  init(ctx) {
    this._alive = true
    this._resolving = false
    this._strong = false
    this._toldStrong = false
    this._toldRhythm = false
    this._theta = 0.22
    this._omega = 0
    this._prevOmega = 0
    this._sinceTap = 0
    this._didIdleCue = false
    this._maxAbs = 0
    this._lastSoft = 0
    this._lastReveal = 0
    this._goalSign = -1
    this._goalAmp = 0.85
    this._goalEmoji = '🐦'
    this._L = 300
    this._pumpStart = null
    this._pumpDist = 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund (FÖRSTA barn): grön äng + himmel/sol/moln. Aldrig tryckbar.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // A-ram (brun ställning).
    this._root.addChild(this._buildFrame())

    // Bågspår (dekorativt, fylls mot målet) — bakom gungan.
    this._arc = new Graphics()
    this._arc.eventMode = 'none'
    this._root.addChild(this._arc)

    // Gungan: en container med origin i pivåpunkten; rotation = theta.
    this._swing = new Container()
    this._swing.position.set(PIVOT_X, PIVOT_Y)
    this._swing.eventMode = 'none'
    this._root.addChild(this._swing)

    // Mål (🐦/🍎/🎈) på en gren i toppläget.
    this._target = new Container()
    this._target.eventMode = 'none'
    this._root.addChild(this._target)

    // Pump-yta: osynlig heltäckande träffyta (utom headern överst). Tryck var som
    // helst = pumpa; ett svep > 60px = extra-stor knuff.
    this._pump = new Graphics().rect(0, 90, ctx.width, ctx.height - 90).fill({ color: 0x000000, alpha: 0 })
    this._pump.eventMode = 'static'
    this._pump.hitArea = new Rectangle(0, 90, ctx.width, ctx.height - 90)
    this._hPumpDown = (e) => this._pumpDown(ctx, e)
    this._hPumpMove = (e) => this._pumpMove(e)
    this._hPumpUp = (e) => this._pumpUp(ctx, e)
    this._pump.on('pointerdown', this._hPumpDown)
    this._root.addChild(this._pump)

    // "Starkare knuff"-toggle (ovanpå pump-ytan så den får trycket).
    this._buildToggle(ctx)

    // Nivå från sparad progress → oändlig variation.
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._loadLevel(ctx, this._level)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._sinceTap = 0
    this._didIdleCue = false
    ctx.services.voice.say(this.voiceIntro)
  },

  // ----------------------------------------------------------------- nivåer
  _levelParams(level) {
    if (level <= 1) return { L: 300, goal: 0.85 }
    if (level <= 3) return { L: 330, goal: 1.0 }
    if (level <= 5) return { L: 360, goal: 1.15 }
    return { L: 390, goal: 1.3 }
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._resolving = false
    this._sinceTap = 0
    this._didIdleCue = false
    this._maxAbs = 0
    this._prevOmega = 0

    const p = this._levelParams(level)
    this._L = p.L
    this._goalAmp = p.goal
    if (level >= 2) {
      this._goalSign = Math.random() < 0.5 ? -1 : 1 // målet kan byta sida
      this._goalEmoji = randomFrom(GOAL_EMOJIS)
    } else {
      this._goalSign = -1
      this._goalEmoji = '🐦'
    }
    if (level >= 6) this._goalAmp = clamp(this._goalAmp + randomFrom([-0.05, 0, 0.05]), 0.85, 1.32)

    this._buildSwing()
    this._buildTarget()

    // Litet startutslag, ingen rörelse.
    this._theta = this._goalSign * 0.22
    this._omega = 0
    this._arc.clear()
    this._drawArc()
  },

  // ----------------------------------------------------------------- ritning
  _buildFrame() {
    const g = new Graphics()
    g.eventMode = 'none'
    // Markskugga.
    g.ellipse(640, 628, 320, 28).fill({ color: COLORS.shadow, alpha: 0.12 })
    // Ben (lätt A-form), tjocka rundade streck.
    const leg = (x1, y1, x2, y2) =>
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 22, color: COLORS.brown, cap: 'round' })
    leg(470, 150, 360, 612)
    leg(490, 150, 560, 612)
    leg(810, 150, 920, 612)
    leg(790, 150, 720, 612)
    // Toppbalk (pivå-höjd).
    g.roundRect(430, 138, 420, 26, 12).fill(COLORS.brown).stroke({ width: 3, color: 0x6f4428 })
    // Pivå-knopp.
    g.circle(PIVOT_X, PIVOT_Y, 15).fill(COLORS.brown).stroke({ width: 3, color: 0x6f4428 })
    return g
  },

  _buildSwing() {
    // Rensa gamla barn (döda ev. tweens på Lova).
    for (const c of this._swing.removeChildren()) {
      gsap.killTweensOf(c)
      if (c.scale) gsap.killTweensOf(c.scale)
      c.destroy({ children: true })
    }
    const L = this._L
    const ropes = new Graphics()
    ropes.moveTo(-34, 0).lineTo(-44, L).stroke({ width: 8, color: COLORS.inkSoft, cap: 'round' })
    ropes.moveTo(34, 0).lineTo(44, L).stroke({ width: 8, color: COLORS.inkSoft, cap: 'round' })
    ropes.eventMode = 'none'
    const seat = new Graphics().roundRect(-54, L - 10, 108, 20, 8).fill(COLORS.brown).stroke({ width: 3, color: 0x6f4428 })
    seat.eventMode = 'none'
    this._lova = this._buildLova()
    this._lova.position.set(0, L - 10) // höfter på sitsens ovankant
    this._swing.addChild(ropes, seat, this._lova)
  },

  // Lova ritad programmatiskt, sittande. Origin (0,0) = höfterna; negativ y = uppåt.
  _buildLova() {
    const c = new Container()
    c.eventMode = 'none'
    const skin = 0xffd9b3
    const hair = 0x8a5a3b

    const back = new Graphics()
    back.circle(0, -86, 33).fill(hair) // hår bakom
    back.circle(-30, -78, 12).fill(hair) // tofs
    back.circle(30, -78, 12).fill(hair) // tofs

    const legs = new Graphics()
    legs.roundRect(-22, 0, 16, 40, 7).fill(COLORS.blue) // byxben
    legs.roundRect(6, 0, 16, 40, 7).fill(COLORS.blue)
    legs.roundRect(-24, 34, 22, 12, 5).fill(0x4a3526) // skor
    legs.roundRect(2, 34, 22, 12, 5).fill(0x4a3526)

    const arms = new Graphics()
    arms.moveTo(-18, -46).lineTo(-40, -78).stroke({ width: 9, color: skin, cap: 'round' }) // håller i repen
    arms.moveTo(18, -46).lineTo(40, -78).stroke({ width: 9, color: skin, cap: 'round' })

    const dress = new Graphics()
    dress.moveTo(-36, 0).lineTo(36, 0).lineTo(20, -52).lineTo(-20, -52).closePath().fill(COLORS.pink)

    const face = new Graphics()
    face.circle(0, -84, 30).fill(skin)
    face.circle(-10, -88, 3.5).fill(COLORS.ink) // ögon
    face.circle(10, -88, 3.5).fill(COLORS.ink)
    face.arc(0, -82, 11, 0.18 * Math.PI, 0.82 * Math.PI).stroke({ width: 3, color: COLORS.ink }) // leende

    c.addChild(back, legs, arms, dress, face)
    return c
  },

  _buildTarget() {
    for (const c of this._target.removeChildren()) {
      gsap.killTweensOf(c)
      if (c.scale) gsap.killTweensOf(c.scale)
      c.destroy({ children: true })
    }
    this._glowTween?.kill()

    const gt = this._goalSign * this._goalAmp
    const pos = this._bobWorld(gt, this._L - 118) // strax ovanför Lovas huvud i toppläget
    this._targetPos = pos

    const branch = new Graphics().roundRect(-48, -8, 96, 16, 8).fill(COLORS.brown).stroke({ width: 3, color: 0x6f4428 })
    branch.position.set(pos.x, pos.y + 34)
    branch.eventMode = 'none'

    const ring = new Graphics().circle(0, 0, 58).stroke({ width: 6, color: COLORS.yellow, alpha: 0.4 })
    ring.position.set(pos.x, pos.y)
    ring.eventMode = 'none'
    this._targetRing = ring

    const emo = new Text({ text: this._goalEmoji, style: { fontFamily: FONT.body, fontSize: 90 } })
    emo.anchor.set(0.5)
    emo.position.set(pos.x, pos.y)
    emo.eventMode = 'none'
    this._targetEmoji = emo

    this._target.addChild(branch, ring, emo)
    this._glowTween = breathe(ring, { scale: 1.12, duration: 1.0 })
  },

  _drawArc() {
    const g = this._arc
    if (!g || g.destroyed) return
    g.clear()
    const L = this._L
    const steps = 18
    for (let i = 1; i <= steps; i++) {
      const phi = (i / steps) * this._goalAmp
      const w = this._bobWorld(this._goalSign * phi, L)
      const reached = phi <= this._maxAbs + 0.001
      g.circle(w.x, w.y, reached ? 6 : 3).fill({ color: reached ? COLORS.yellow : COLORS.white, alpha: reached ? 0.5 : 0.22 })
    }
  },

  // Världsposition för en lokal punkt (0, localY) på gungan vid given vinkel.
  _bobWorld(theta, localY) {
    const s = Math.sin(theta)
    const c = Math.cos(theta)
    return { x: PIVOT_X - localY * s, y: PIVOT_Y + localY * c }
  },

  // ----------------------------------------------------------------- toggle
  _buildToggle(ctx) {
    this._toggle = new Container()
    this._toggle.position.set(150, 600)
    this._toggleGlow = new Graphics().circle(0, 0, 80).fill({ color: COLORS.orange, alpha: 0 })
    this._toggleBg = new Graphics()
    this._toggleIcon = new Text({ text: '💪', style: { fontFamily: FONT.body, fontSize: 64 } })
    this._toggleIcon.anchor.set(0.5)
    this._toggle.addChild(this._toggleGlow, this._toggleBg, this._toggleIcon)
    this._toggle.eventMode = 'static'
    this._toggle.cursor = 'pointer'
    this._toggle.hitArea = new Circle(0, 0, 72) // diameter 144px ≥ 96
    this._hToggle = () => this._toggleStrong(ctx)
    this._toggle.on('pointertap', this._hToggle)
    this._root.addChild(this._toggle)
    this._drawToggle()
  },

  _drawToggle() {
    const g = this._toggleBg
    if (!g || g.destroyed) return
    g.clear()
    g.circle(0, 0, 65)
      .fill(this._strong ? COLORS.orange : 0x9fb0a8)
      .stroke({ width: 5, color: this._strong ? COLORS.orangeDark : 0x7a8a82 })
    this._toggleGlow.alpha = this._strong ? 0.35 : 0
  },

  _toggleStrong(ctx) {
    if (!this._alive || this._resolving) return
    this._sinceTap = 0
    this._didIdleCue = false
    this._strong = !this._strong
    this._drawToggle()
    pop(this._toggle, { scale: 1.12 })
    ctx.services.audio.sfx('pling')
    if (this._strong && !this._toldStrong) {
      this._toldStrong = true
      ctx.services.voice.say(STRONG_LINE)
    }
  },

  // ----------------------------------------------------------------- pumpa
  _pumpDown(ctx, e) {
    if (!this._alive || this._resolving) return
    this._pumpStart = this._root.toLocal(e.global)
    this._pumpDist = 0
    this._pump.on('globalpointermove', this._hPumpMove)
    this._pump.on('pointerup', this._hPumpUp)
    this._pump.on('pointerupoutside', this._hPumpUp)
  },

  _pumpMove(e) {
    if (!this._alive || !this._pumpStart) return
    const p = this._root.toLocal(e.global)
    this._pumpDist = Math.hypot(p.x - this._pumpStart.x, p.y - this._pumpStart.y)
  },

  _pumpUp(ctx) {
    this._detachPump()
    const dist = this._pumpDist || 0
    this._pumpStart = null
    // Svep > 60px = extra-stor knuff skalad av sveplängden; annars vanlig pump.
    const scale = dist > 60 ? clamp(dist / 180, 1, 1.6) : 1
    this._pump_(ctx, scale)
  },

  _detachPump() {
    if (this._pump && !this._pump.destroyed) {
      this._pump.off('globalpointermove', this._hPumpMove)
      this._pump.off('pointerup', this._hPumpUp)
      this._pump.off('pointerupoutside', this._hPumpUp)
    }
  },

  // Energi-injektion: ALLTID med rörelsen (ΔE ≥ 0) → fel fas gör inget illa.
  _pump_(ctx, strengthScale = 1) {
    if (!this._alive || this._resolving) return
    this._sinceTap = 0
    this._didIdleCue = false

    // Knuff-riktning = pendelns kommande rörelse; i ytterläget in mot mitten.
    const dir = Math.abs(this._omega) > 0.15 ? Math.sign(this._omega) : -Math.sign(this._theta || 1)
    // Fas-kvalitet: FÖRLÅTANDE — nära ytterläget q→1, i botten golv 0.35 (alltid lite framåt).
    const q = clamp(Math.abs(this._theta) / 0.5, 0.35, 1)
    const base = (this._strong ? 0.9 : 0.5) * strengthScale
    this._omega = clamp(this._omega + dir * q * base, -OMEGA_CAP, OMEGA_CAP)

    // Omedelbar respons (<100ms).
    if (this._lova && !this._lova.destroyed) pop(this._lova, { scale: 1.08 })
    const b = this._bobWorld(this._theta, this._L - 20)
    ctx.services.audio.sfx(q >= 0.7 ? 'whoosh' : 'soft')
    sparkle(ctx.fxLayer, b.x, b.y, { count: q >= 0.7 ? 7 : 4 })
    if (q >= 0.85) floatText(ctx.fxLayer, b.x, b.y - 60, randomFrom(['⭐', 'Höögre!']))
    if (!this._toldRhythm && q >= 0.6) {
      this._toldRhythm = true
      ctx.services.voice.say(RHYTHM_LINE)
    }
  },

  // Auto-medvind (no-fail): mjuk knuff i bästa fas, tyst feedback, nollar inga timers.
  _autoPush(ctx, base) {
    const dir = Math.abs(this._omega) > 0.15 ? Math.sign(this._omega) : -Math.sign(this._theta || 1)
    const q = clamp(Math.abs(this._theta) / 0.5, 0.35, 1)
    this._omega = clamp(this._omega + dir * q * base, -OMEGA_CAP, OMEGA_CAP)
    const now = performance.now()
    if (now - this._lastSoft > 150) {
      this._lastSoft = now
      ctx.services.audio.sfx('soft')
    }
    const b = this._bobWorld(this._theta, this._L - 20)
    sparkle(ctx.fxLayer, b.x, b.y, { count: 4 })
  },

  // ----------------------------------------------------------------- tick
  _update(ctx, t) {
    if (!this._alive) return

    // Pendel-integration (egen, ticker-driven). Klampa flik-byte-hopp.
    const dt = Math.min(t.deltaMS / 1000, 0.05)
    const SUB = 2
    const h = dt / SUB
    for (let i = 0; i < SUB; i++) {
      const alpha = -(OMEGA0 * OMEGA0) * Math.sin(this._theta) - DAMP * this._omega
      this._omega += alpha * h
      this._theta += this._omega * h
    }
    if (!Number.isFinite(this._theta) || !Number.isFinite(this._omega)) {
      this._theta = this._goalSign * 0.2
      this._omega = 0
    }
    // Mjuk men hård spärr — går aldrig över toppen.
    if (Math.abs(this._theta) > THETA_MAX) {
      this._theta = Math.sign(this._theta) * THETA_MAX
      this._omega *= -0.4
    }
    this._swing.rotation = this._theta

    // Bågspår fylls på när ny topphöjd nås (billigt: bara vid ökning).
    const amp = Math.abs(this._theta)
    if (amp > this._maxAbs + 0.02) {
      this._maxAbs = amp
      this._drawArc()
    }

    if (!this._resolving) {
      // Målet "lockar" när hon närmar sig.
      if (this._goalSign * this._theta > 0.7 * this._goalAmp) {
        const now = performance.now()
        if (now - this._lastReveal > 600) {
          this._lastReveal = now
          ctx.services.audio.sfx('reveal')
          if (this._targetPos) sparkle(ctx.fxLayer, this._targetPos.x, this._targetPos.y, { count: 5 })
        }
      }

      // Mål nått (rätt sida, rätt höjd) → firande.
      if (this._goalSign * this._theta >= this._goalAmp - 0.015) {
        this._win(ctx)
      } else {
        // Idle-om-cue + auto-hjälp.
        this._sinceTap += dt
        if (this._sinceTap > 6 && !this._didIdleCue) {
          this._didIdleCue = true
          ctx.services.voice.say(this.voiceIntro)
          if (this._toggle && !this._toggle.destroyed) wiggle(this._toggle)
          const b = this._bobWorld(this._theta, this._L - 90)
          sparkle(ctx.fxLayer, b.x, b.y)
        }
        if (this._sinceTap > 5) {
          // Lägg en auto-knuff varje gång gungan vänder (omega passerar noll = bästa fas).
          const crossed = this._prevOmega !== 0 && Math.sign(this._omega) !== Math.sign(this._prevOmega)
          if (crossed) this._autoPush(ctx, this._sinceTap > 12 ? 0.7 : 0.35)
        }
      }
    }

    this._prevOmega = this._omega
  },

  _win(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._sinceTap = 0
    this._glowTween?.kill()

    ctx.services.audio.sfx('correct')

    // Fågeln/äpplet plockas: göm originalet, låt en kopia flaxa/hoppa iväg.
    const pos = this._targetPos || this._bobWorld(this._goalSign * this._goalAmp, this._L - 118)
    if (this._targetEmoji && !this._targetEmoji.destroyed) this._targetEmoji.alpha = 0
    if (this._targetRing && !this._targetRing.destroyed) this._targetRing.alpha = 0
    floatText(ctx.fxLayer, pos.x, pos.y, this._goalEmoji, { rise: 120, duration: 1.1, fontSize: 80 })
    const b = this._bobWorld(this._theta, this._L - 90)
    burst(ctx.fxLayer, b.x, b.y, { count: 16 })

    // Delat firande (firar-ljud + beröm-röst + konfetti + stjärna + klistermärke).
    ctx.progress.complete()

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('gungor', (ctx.progress.get().custom?.gungor || 0) + 1)

    this._winTimer = gsap.delayedCall(1.6, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  // ----------------------------------------------------------------- städning
  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._winTimer?.kill()
    this._glowTween?.kill()
    this._detachPump()
    if (this._pump && !this._pump.destroyed) this._pump.off('pointerdown', this._hPumpDown)
    if (this._toggle && !this._toggle.destroyed) {
      this._toggle.off('pointertap', this._hToggle)
      gsap.killTweensOf(this._toggle)
      gsap.killTweensOf(this._toggle.scale)
    }
    if (this._lova && !this._lova.destroyed) {
      gsap.killTweensOf(this._lova)
      gsap.killTweensOf(this._lova.scale)
    }
    if (this._targetEmoji && !this._targetEmoji.destroyed) {
      gsap.killTweensOf(this._targetEmoji)
      gsap.killTweensOf(this._targetEmoji.scale)
    }
    if (this._targetRing && !this._targetRing.destroyed) gsap.killTweensOf(this._targetRing)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
