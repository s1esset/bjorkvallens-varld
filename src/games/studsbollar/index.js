// Studsbollar — fysik-korgspel (2–5 år). EN boll i taget skjuts: barnet siktar &
// skjuter den enda redo-bollen mot en glödande korg. I fältet vilar några mål-/hinder-
// bollar som skottet KROCKAR med (riktig matter.js-kollision) — de kan knuffas och
// studsa vidare in i korgen för en bonuspoäng. INGEN ändlös spawn på klick längre.
// MÅL: få N bollar i korgen så fylls korg-mätaren; full mätare => firande + nästa nivå.
// Två kontroller styr utfallet (riktig fysik):
//   (a) SIKTA & SKJUT: barnet greppar redo-bollen på avskjutningsplattan och drar för att
//       välja riktning + kraft (prickad kastbåge via AimLauncher); vid släpp flyger
//       bollen som en matter-kropp i en båge mot korgen och studsar mot hinder-bollarna.
//       Litet drag = tap -> lagom skott mot korgen (tap-fallback för de minsta).
//   (b) BOLL-TYP: en stor knapp NERE TILL HÖGER växlar "Studsig 🤾" (MATERIALS.bouncy:
//       hög studs, lätt) <-> "Tung 🪨" (MATERIALS.heavy: tung, låg studs, mer momentum)
//       — valet syns direkt på skottet.
// INGET game-over: missar studsar bara vidare i gropen (mjukt ljud + studs), och efter
// ett par missade skott hjälper spelet till med en garanterad lobb rakt i korgen.
// Mätaren går bara UPP. Allt ritas programmatiskt (Pixi Graphics + emoji), exit-säkert.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, MATERIALS, Body } from '../../lib/physics.js'
import { AimLauncher } from '../../lib/launcher.js'
import { createScene } from '../../lib/scene.js'
import { bigCelebration, puff, sparkle, floatText, pop, ripple, shake, burst } from '../../lib/feedback.js'
import { Button } from '../../lib/Button.js'
import { COLORS, FONT, PLAYFUL } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

const FLOOR_Y = 648 // golvets ovansida (design-y)
const LAUNCH = { x: 205, y: 512 } // avskjutningsplattans boll-position
const MAX_BALLS = 26 // tak för nedsläppta bollar (prestanda)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Specialbollar roteras per nivå så tur 2 ≠ tur 1. 'star' = stjärnboll (fyller en EXTRA
// mätar-plats när den knuffas i korgen), 'balloon' = stor ballong-boll (studsar extra högt).
const SPECIAL_CYCLE = [
  ['star', null, null],
  ['balloon', null, 'star'],
  [null, 'balloon', null],
  ['star', 'balloon', null],
]
// Uppåtklättrande pentatonisk kaskad (alltid glad) för kombo-plingen i korgen.
const COMBO_SCALE = [523, 587, 659, 784, 880, 1047]

const SCORE_PRAISE = ['I korgen! Bravo!', 'Pang i korgen!', 'Vilket skott!', 'Mitt i korgen!']
const MISS_SAY = ['Hoppsan! Försök igen!', 'Nästan! En gång till!', 'Studs studs – kör igen!']
const FULL_SAY = ['Korgen är full! Hurra!', 'Korgmästare! Bravo!', 'Vilket korg-rekord!']
const IDLE_CUES = ['Sikta och skjut bollen i korgen!', 'Dra bollen och släpp mot korgen!', 'Studsa bollen mot de andra bollarna!']

export default {
  id: 'studsbollar',
  titleSv: 'Studsbollar',
  icon: '🏀',
  category: 'fysik',
  input: 'mixed',
  ageRange: [2, 5],
  bundle: 'studsbollar',
  voiceIntro: 'Sikta och skjut bollen i korgen!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._balls = [] // fria nedsläppta bollar { body, view }
    this._shot = null // aktuellt skott { body, view }
    this._flying = false
    this._ready = false
    this._flightTime = 0
    this._restTime = 0
    this._misses = 0
    this._assistNext = false
    this._lastBounce = 0
    this._combo = 0 // stigande kombo-räknare (bollar i korgen tätt efter varandra)
    this._comboAt = 0
    this._lastShakeAt = 0
    this._matIdx = 0
    this._meter = 0
    this._need = 3
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    // Boll-typer: valet ändrar massa/studs via MATERIALS -> syns i utfallet.
    this._materials = [
      { key: 'bouncy', label: 'Studsig', icon: '🤾', color: COLORS.orange, btnColor: COLORS.orange, r: 28, mat: MATERIALS.bouncy },
      { key: 'heavy', label: 'Tung', icon: '🪨', color: 0x9aa0a6, btnColor: 0x7c828a, r: 34, mat: MATERIALS.heavy },
    ]

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Fysik: egen golvkropp (synlig grop) + korg-kroppar; väggar i sidled.
    this._phys = new PhysicsWorld({ gravityY: 1.25, walls: ['left', 'right'] })
    this._floorBody = this._phys.rectangle(640, FLOOR_Y + 60, 1760, 120, {
      isStatic: true,
      restitution: 0.45,
      friction: 0.6,
      label: 'floor',
    })
    this._unbindCollision = this._phys.onCollision((e) => this._onCollision(ctx, e))

    this._buildScene(ctx)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)

    this._loadLevel(ctx, this._level)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
    // Mål-/hinder-bollarna seedas i _loadLevel (init) — ingen spawn på klick längre.
  },

  // ---- Scen (byggs en gång) -----------------------------------------------

  _buildScene(ctx) {
    // Glad himmel-bakgrund (egen golvgrop ritas separat).
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height, ground: false }))

    // (Tidigare fanns här en heltäckande "fångare" som släppte en ny boll vid varje
    // klick — den gav alldeles för många bollar. Borttagen: nu skjuts EN boll i taget
    // och mål-/hinder-bollarna seedas per nivå.)

    // Golvgrop (visuell) — eventMode none (skottet ägs av redo-bollen/launchern).
    const floor = new Graphics()
    floor.rect(0, FLOOR_Y, ctx.width, ctx.height - FLOOR_Y).fill(0x86d27a)
    floor.rect(0, FLOOR_Y, ctx.width, 12).fill({ color: 0x5bbf6a, alpha: 0.8 })
    floor.eventMode = 'none'
    this._root.addChild(floor)

    // Korg (byggs/flyttas per nivå). Glöd-ring + programmatisk korg.
    this._basketView = new Container()
    this._basketView.eventMode = 'none'
    this._basketGlow = new Graphics()
    this._basketGlow.eventMode = 'none'
    this._basketView.addChild(this._basketGlow)
    this._root.addChild(this._basketView)
    this._basket = { x: 950, openingY: 500, scale: 1, sensor: null, rimL: null, rimR: null }

    // Lager för skjutna/flygande bollar (ovanför golvet).
    this._playLayer = new Container()
    this._playLayer.eventMode = 'none'
    this._root.addChild(this._playLayer)

    // Avskjutningsplatta (dekor) + redo-boll (= AimLauncherns target).
    const pad = new Graphics()
      .ellipse(LAUNCH.x, LAUNCH.y + 44, 70, 22)
      .fill({ color: 0x000000, alpha: 0.12 })
      .roundRect(LAUNCH.x - 60, LAUNCH.y + 30, 120, 26, 12)
      .fill(COLORS.brown)
      .stroke({ width: 4, color: 0x6b4527 })
    pad.eventMode = 'none'
    this._root.addChild(pad)

    this._readyBall = new Container()
    this._readyBall.position.set(LAUNCH.x, LAUNCH.y)
    this._readyBall.visible = false
    this._root.addChild(this._readyBall)
    this._redrawReady()

    // Sikta & skjut (prickad kastbåge). slingshot:false -> fling i dragriktningen.
    this._launcher = new AimLauncher({
      target: this._readyBall,
      root: this._root,
      audio: ctx.services.audio,
      slingshot: false,
      maxPower: 25,
      minPower: 9,
      powerScale: 0.16,
      hitRadius: 92,
      tapPower: 0.9,
      trailColor: 0xfff3b0,
      getOrigin: () => ({ x: this._readyBall.x, y: this._readyBall.y }),
      previewGravity: 0.44,
      previewWind: 0,
      bounds: { floorY: FLOOR_Y, leftX: 30, rightX: 1250 },
      defaultAim: () => ({ x: this._basket.x, y: this._basket.openingY - 40 }),
      onGrab: () => {
        this._idle = 0
      },
      onLaunch: (v) => this._fire(ctx, v),
    })
    this._launcher.setEnabled(false)

    // Korg-mätare uppe i mitten.
    this._meterLayer = new Container()
    this._meterLayer.position.set(640, 70)
    this._meterLayer.eventMode = 'none'
    this._root.addChild(this._meterLayer)

    // Boll-typ-knapp (nere till vänster, intill plattan).
    this._buildMatButton(ctx)
  },

  _buildMatButton(ctx) {
    const m = this._materials[this._matIdx]
    if (this._matBtn && !this._matBtn.destroyed) {
      gsap.killTweensOf(this._matBtn.scale)
      this._matBtn.destroy()
    }
    this._matBtn = new Button({
      icon: m.icon,
      label: m.label,
      width: 210,
      height: 104,
      color: m.btnColor,
      stacked: true,
      services: ctx.services,
      sound: 'tap',
      onTap: () => this._toggleMaterial(ctx),
    })
    // Nere till HÖGER (ägarfeedback). Center-origo + 24px hit-halo -> ryms i hörnet
    // (210x104: halo-höger = 1150+105+24 = 1279, halo-botten = 626+52+24+8 = 710).
    this._matBtn.position.set(1150, 626)
    this._root.addChild(this._matBtn)
  },

  // ---- Nivå ----------------------------------------------------------------

  _basketFor(level) {
    const x = clamp(820 + level * 42, 820, 1095)
    const scale = clamp(1.0 - level * 0.06, 0.66, 1.0)
    return { x, scale }
  },

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._need = clamp(3 + level, 3, 6)
    this._meter = 0
    this._misses = 0
    this._combo = 0
    this._assistNext = false
    this._flying = false

    const { x, scale } = this._basketFor(level)
    this._setBasket(x, scale)
    this._drawMeter()
    this._clearBalls()
    this._seedTargets(ctx, level)
    this._readyNext(ctx)
  },

  // Några vilande mål-/hinder-bollar i fältet (mellan plattan och korgen) som skottet
  // KROCKAR med (riktig matter.js-kollision). De kan knuffas/studsa in i korgen för en
  // bonuspoäng. Fast antal per nivå — ALDRIG ändlös spawn. (x:520/650/780 ligger alltid
  // till vänster om korgen vars x ≥ 820, så de auto-poängar aldrig av sig själva.)
  _seedTargets(ctx, level) {
    if (!this._alive) return
    const specials = SPECIAL_CYCLE[level % SPECIAL_CYCLE.length]
    const xs = [520, 650, 780]
    xs.forEach((x, i) => this._drop(ctx, x, specials[i] || null))
  },

  _setBasket(x, scale) {
    const openingY = FLOOR_Y - 150 * scale
    this._basket.x = x
    this._basket.scale = scale
    this._basket.openingY = openingY

    // Visuell korg.
    for (const c of [...this._basketView.children]) {
      if (c !== this._basketGlow) c.destroy()
    }
    this._basketView.addChild(makeBasket(scale))
    this._basketView.position.set(x, openingY)

    // Glöd-ring i öppningen (drar blicken).
    const gw = 84 * scale
    const gh = 26 * scale
    this._basketGlow.clear().ellipse(0, 0, gw, gh).stroke({ width: 6, color: COLORS.yellow, alpha: 0.7 })
    this._basketGlow.position.set(0, 0)
    this._basketTween?.kill()
    this._basketGlow.scale.set(1)
    this._basketTween = gsap.to(this._basketGlow.scale, { x: 1.18, y: 1.18, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    // Fysik-kroppar: sensor i öppningen + två studskanter på korgkanten.
    const { sensor, rimL, rimR } = this._basket
    if (sensor) this._phys.removeBody(sensor)
    if (rimL) this._phys.removeBody(rimL)
    if (rimR) this._phys.removeBody(rimR)
    this._basket.sensor = this._phys.rectangle(x, openingY + 38 * scale, 110 * scale, 44 * scale, {
      isStatic: true,
      isSensor: true,
      label: 'basket',
    })
    this._basket.rimL = this._phys.circle(x - 70 * scale, openingY, 12 * scale, { isStatic: true, restitution: 0.55, label: 'rim' })
    this._basket.rimR = this._phys.circle(x + 70 * scale, openingY, 12 * scale, { isStatic: true, restitution: 0.55, label: 'rim' })
  },

  // ---- Redo att skjuta -----------------------------------------------------

  _readyNext(ctx) {
    if (!this._alive) return
    this._flying = false
    this._shot = null
    this._flightTime = 0
    this._restTime = 0
    this._idle = 0

    this._redrawReady()
    gsap.killTweensOf(this._readyBall)
    gsap.killTweensOf(this._readyBall.scale)
    this._readyBreathe?.kill()
    this._readyBall.position.set(LAUNCH.x, LAUNCH.y)
    this._readyBall.visible = true
    this._readyBall.scale.set(0)
    gsap.to(this._readyBall.scale, {
      x: 1,
      y: 1,
      duration: 0.3,
      ease: 'back.out(2)',
      onComplete: () => {
        if (this._alive && this._readyBall && !this._readyBall.destroyed && this._ready) {
          this._readyBreathe = gsap.to(this._readyBall.scale, { x: 1.1, y: 1.1, duration: 0.85, yoyo: true, repeat: -1, ease: 'sine.inOut' })
        }
      },
    })
    this._launcher.setEnabled(true)
    this._ready = true
  },

  _redrawReady() {
    if (!this._readyBall || this._readyBall.destroyed) return
    if (this._readyGfx && !this._readyGfx.destroyed) this._readyGfx.destroy()
    const m = this._materials[this._matIdx]
    this._readyGfx = makeBall(m.r, m.color, m.key)
    this._readyGfx.eventMode = 'none'
    this._readyBall.addChild(this._readyGfx)
  },

  // ---- Kontroll: boll-typ --------------------------------------------------

  _toggleMaterial(ctx) {
    this._matIdx = 1 - this._matIdx
    this._idle = 0
    const m = this._materials[this._matIdx]
    this._buildMatButton(ctx)
    pop(this._matBtn)
    sparkle(ctx.fxLayer, this._matBtn.x, this._matBtn.y - 30, { count: 5 })
    ctx.services.audio.sfx(m.key === 'bouncy' ? 'pop' : 'soft')
    ctx.services.voice.say(`${m.label} boll!`)
    if (this._ready && !this._flying) this._redrawReady()
  },

  // ---- Skjut ---------------------------------------------------------------

  _fire(ctx, v) {
    if (!this._ready || this._flying || !this._alive) return
    this._ready = false
    this._launcher.setEnabled(false)
    this._readyBreathe?.kill()
    this._idle = 0

    const m = this._materials[this._matIdx]
    const start = { x: this._readyBall.x, y: this._readyBall.y }
    const view = makeBall(m.r, m.color, m.key)
    view.position.set(start.x, start.y)
    this._playLayer.addChild(view)
    this._readyBall.visible = false
    this._flying = true
    this._flightTime = 0
    this._restTime = 0
    ctx.services.audio.sfx('whoosh')

    // Garanterad lobb efter ett par missar (snäll hjälp, aldrig straff).
    if (this._assistNext) {
      this._assistNext = false
      this._shot = { body: null, view }
      this._assistGlide(ctx, view, start)
      return
    }

    const body = this._phys.circle(start.x, start.y, m.r, { ...m.mat, label: 'ball' })
    body.barnMaterial = m.key
    Body.setVelocity(body, { x: v.vx, y: v.vy })
    this._phys.link(body, view)
    this._shot = { body, view }
  },

  // Glider bollen i en mjuk båge rakt i korgen (garanterad framgång).
  _assistGlide(ctx, view, start) {
    ctx.services.voice.say('Titta, jag hjälper dig!')
    const tx = this._basket.x
    const ty = this._basket.openingY
    const arc = 200
    const st = { t: 0 }
    this._assistTween = gsap.to(st, {
      t: 1,
      duration: 0.95,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (!view || view.destroyed) {
          this._assistTween?.kill()
          return
        }
        const t = st.t
        view.x = start.x + (tx - start.x) * t
        view.y = start.y + (ty - start.y) * t - Math.sin(Math.PI * t) * arc
        view.rotation += 0.2
      },
      onComplete: () => {
        if (!this._alive) return
        this._shot = null
        this._flying = false
        this._registerScore(ctx, view, { isShot: true, speed: 6 })
      },
    })
  },

  // ---- Fri boll (kärn-mekaniken bevarad) -----------------------------------

  _drop(ctx, x, special = null) {
    if (!this._alive) return
    this._idle = 0
    // Specialbollar (stjärn-/ballong-boll) har egen storlek/fysik/utseende; vanliga
    // bollar följer vald boll-typ. Alla är knuffbara mål i gropen.
    let r, view, mat, barnMat
    if (special === 'star') {
      r = 30
      view = makeStarBall(r)
      mat = { ...MATERIALS.bouncy, label: 'ball' }
      barnMat = 'bouncy'
    } else if (special === 'balloon') {
      r = 40
      view = makeBalloonBall(r)
      mat = { ...MATERIALS.bouncy, restitution: 0.94, density: MATERIALS.light.density, label: 'ball' } // studsar extra högt
      barnMat = 'bouncy'
    } else {
      const m = this._materials[this._matIdx]
      r = m.r
      view = makeBall(r, m.key === 'bouncy' ? randomFrom(PLAYFUL) : m.color, m.key)
      mat = { ...m.mat, label: 'ball' }
      barnMat = m.key
    }
    x = clamp(x, r + 16, ctx.width - r - 16)
    view.position.set(x, -r - 10)
    this._playLayer.addChild(view)
    const body = this._phys.circle(x, -r - 10, r, mat)
    body.barnMaterial = barnMat
    body.special = special
    Body.setVelocity(body, { x: (Math.random() - 0.5) * 4, y: 0 })
    this._phys.link(body, view)
    this._balls.push({ body, view })
    ctx.services.audio.sfx(special ? 'pling' : 'pop')
    view.scale.set(0.2)
    gsap.to(view.scale, { x: 1, y: 1, duration: 0.3, ease: 'back.out(2)' })

    if (this._balls.length > MAX_BALLS) this._fade(this._balls.shift())
  },

  _fade(ball) {
    if (!ball) return
    this._phys.removeBody(ball.body)
    const v = ball.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    gsap.to(v.scale, {
      x: 0,
      y: 0,
      duration: 0.3,
      ease: 'back.in(2)',
      onComplete: () => {
        if (!v.destroyed) v.destroy()
      },
    })
  },

  _clearBalls() {
    const list = this._balls
    this._balls = []
    list.forEach((b) => this._fade(b))
  },

  // ---- Kollisioner: korg-poäng + studsljud ---------------------------------

  _onCollision(ctx, e) {
    if (!this._alive) return
    for (const pair of e.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB
      if (a.label === 'basket' || b.label === 'basket') {
        const ball = a.label === 'basket' ? b : a
        if (ball.label === 'ball') this._scoreBall(ctx, ball)
        continue
      }
      if (a.label === 'ball' || b.label === 'ball') {
        // Studsljud: HÅRT strypt + bara på rejäla studsar + MJUKT ljud (ägarfeedback:
        // det gamla "boing" vid varje kontakt var irriterande). >=140ms mellan ljud,
        // hög fart-tröskel, och 'pop'/'soft' istället för den hårda boingen.
        const now = performance.now()
        if (now - this._lastBounce >= 140) {
          const sp = (a.speed || 0) + (b.speed || 0)
          if (sp > 6) {
            this._lastBounce = now
            const ball = a.label === 'ball' ? a : b
            ctx.services.audio.sfx(ball.barnMaterial === 'heavy' ? 'soft' : 'pop')
          }
        }
      }
    }
  },

  _scoreBall(ctx, body) {
    if (!this._alive || body._scored) return
    body._scored = true
    const isShot = this._shot && body === this._shot.body
    const speed = body.speed || Math.hypot(body.velocity?.x || 0, body.velocity?.y || 0)
    const special = body.special || null
    let view = null
    if (isShot) {
      view = this._shot.view
      this._shot = null
      this._flying = false
    } else {
      const i = this._balls.findIndex((b) => b.body === body)
      if (i >= 0) {
        view = this._balls[i].view
        this._balls.splice(i, 1)
      }
    }
    this._phys.removeBody(body)
    this._registerScore(ctx, view, { isShot, speed, special })
  },

  // Gemensam "boll i korgen"-hantering (skott, fri boll eller hjälp-lobb).
  _registerScore(ctx, view, { isShot = false, speed = 0, special = null } = {}) {
    if (!this._alive) return
    const bx = this._basket.x
    const by = this._basket.openingY

    // Kombo: bollar som går i korgen tätt efter varandra (en boll knuffar en boll)
    // ger en UPPÅTklättrande pling-kaskad i stället för tystade studsar.
    const now = performance.now()
    this._combo = now - this._comboAt < 1400 ? Math.min(this._combo + 1, COMBO_SCALE.length - 1) : 0
    this._comboAt = now
    const f = COMBO_SCALE[this._combo]
    ctx.services.audio.tone({ freq: f, dur: 0.16, type: 'sine', vol: 0.3 })
    ctx.services.audio.tone({ freq: f * 2, dur: 0.1, type: 'triangle', vol: 0.1, delay: 0.05 })

    ctx.services.audio.sfx('plopp')
    ctx.services.audio.sfx('correct')
    ctx.services.voice.say(special === 'star' ? 'Stjärnboll! Extra poäng!' : randomFrom(SCORE_PRAISE))

    // Korg-reaktion: korgen "slukar" bollen (öppningen squashar), en nät-ring krusar och
    // en liten dammpuff far upp — mycket mer än bara ett svävande emoji. Mikroskak i
    // skärmen skalar med bollens fart in i korgen.
    this._basketGulp()
    ripple(ctx.fxLayer, bx, by, { color: COLORS.yellow, maxR: 92 * this._basket.scale, width: 7 })
    puff(ctx.fxLayer, bx, by - 6, { count: 8, color: 0xe8d8b0 }) // dammpuff (sandfärg)
    sparkle(ctx.fxLayer, bx, by - 8, { count: 6 })
    floatText(ctx.fxLayer, bx, by - 56, special === 'star' ? '⭐' : '🏀', { fontSize: 52 })
    this._screenShake(speed)
    if (this._combo >= 2) floatText(ctx.fxLayer, bx + 34, by - 92, 'Kombo!', { fontSize: 34, rise: 70 })

    if (view && !view.destroyed) {
      gsap.killTweensOf(view)
      gsap.killTweensOf(view.scale)
      gsap.to(view, { x: bx, y: by + 24, duration: 0.2, ease: 'power2.in' })
      gsap.to(view.scale, {
        x: 0.2,
        y: 0.2,
        duration: 0.34,
        ease: 'power2.in',
        onComplete: () => {
          if (!view.destroyed) view.destroy()
        },
      })
    }

    if (isShot) {
      this._misses = 0
      this._assistNext = false
    }
    // Stjärnboll fyller en EXTRA mätar-plats (bonus) — extra saftigt firande.
    const gain = special === 'star' ? 2 : 1
    if (special === 'star') burst(ctx.fxLayer, bx, by - 10, { count: 14, power: 1.1 })
    this._meter = Math.min(this._meter + gain, this._need)
    this._drawMeter()
    if (this._meterLayer && !this._meterLayer.destroyed) pop(this._meterLayer, { scale: 1.12 })

    if (this._meter >= this._need) {
      this._levelComplete(ctx)
    } else if (isShot) {
      this._afterTimer?.kill()
      this._afterTimer = gsap.delayedCall(0.7, () => {
        if (this._alive) this._readyNext(ctx)
      })
    }
  },

  // Korgen "slukar" bollen: öppningen squashar snabbt och studsar tillbaka. Direkt
  // tween på en beständig scale (dödas i destroy) — samma mönster som glöd/redo-bollen.
  _basketGulp() {
    const v = this._basketView
    if (!v || v.destroyed) return
    gsap.killTweensOf(v.scale)
    gsap
      .timeline()
      .to(v.scale, { x: 1.14, y: 0.82, duration: 0.09, ease: 'power2.out' })
      .to(v.scale, { x: 1, y: 1, duration: 0.3, ease: 'elastic.out(1, 0.45)' })
  },

  // Mjuk skärm-mikroskak som skalar med bollens fart. En skakning i taget (ingen drift).
  _screenShake(speed) {
    if (!this._alive || !this._root || this._root.destroyed) return
    const now = performance.now()
    if (now - this._lastShakeAt < 260) return
    this._lastShakeAt = now
    shake(this._root, { intensity: clamp(4 + speed * 0.5, 4, 12), duration: 0.3 })
  },

  // ---- Missat skott (aldrig straff) ----------------------------------------

  _missShot(ctx) {
    if (!this._shot) return
    const shot = this._shot
    this._shot = null
    this._flying = false

    // Behåll bollen som en fri, studsande boll i gropen (gropen lever vidare).
    if (shot.body) {
      this._balls.push({ body: shot.body, view: shot.view })
      if (this._balls.length > MAX_BALLS) this._fade(this._balls.shift())
    } else if (shot.view && !shot.view.destroyed) {
      this._fade({ body: null, view: shot.view })
    }

    ctx.services.audio.sfx('soft')
    this._misses++
    if (this._misses >= 2) {
      this._assistNext = true
      ctx.services.voice.say('Nästa gång hjälper jag dig!')
    } else if (Math.random() < 0.6) {
      ctx.services.voice.say(randomFrom(MISS_SAY))
    }

    this._afterTimer?.kill()
    this._afterTimer = gsap.delayedCall(0.7, () => {
      if (this._alive) this._readyNext(ctx)
    })
  },

  // ---- Mätare full: firande + nästa nivå -----------------------------------

  _levelComplete(ctx) {
    this._ready = false
    this._flying = false
    this._launcher.setEnabled(false)
    this._readyBreathe?.kill()
    if (this._readyBall && !this._readyBall.destroyed) this._readyBall.visible = false

    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(FULL_SAY))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    sparkle(ctx.fxLayer, this._basket.x, this._basket.openingY, { count: 10 })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('korgar', (ctx.progress.get().custom?.korgar || 0) + this._need)
    ctx.progress.complete()

    this._levelTimer?.kill()
    this._levelTimer = gsap.delayedCall(1.9, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  // ---- Mätare-UI -----------------------------------------------------------

  _drawMeter() {
    const layer = this._meterLayer
    if (!layer || layer.destroyed) return
    for (const c of [...layer.children]) c.destroy()
    const n = this._need
    const gap = 62
    const startX = (-(n - 1) * gap) / 2
    const korg = new Text({ text: '🧺', style: { fontFamily: FONT.body, fontSize: 46 } })
    korg.anchor.set(0.5)
    korg.position.set(startX - 70, 0)
    layer.addChild(korg)
    for (let i = 0; i < n; i++) {
      const x = startX + i * gap
      const slot = new Graphics().circle(x, 0, 24).fill({ color: 0xffffff, alpha: 0.85 }).stroke({ width: 4, color: COLORS.orange })
      layer.addChild(slot)
      if (i < this._meter) {
        const ball = new Text({ text: '🏀', style: { fontFamily: FONT.body, fontSize: 34 } })
        ball.anchor.set(0.5)
        ball.position.set(x, 0)
        layer.addChild(ball)
      }
    }
  },

  // ---- Ticker: fysik, miss-detektion, idle-recue ---------------------------

  _update(ctx, t) {
    if (!this._alive) return
    const dt = t.deltaMS / 1000
    this._phys.update(t.deltaMS)
    this._idle += dt

    if (this._flying && this._shot?.body) {
      this._flightTime += dt
      const b = this._shot.body
      if (b.position.y > 880) {
        this._missShot(ctx)
        return
      }
      if (this._flightTime > 0.5) {
        const sp = Math.hypot(b.velocity.x, b.velocity.y)
        if (sp < 0.8) {
          this._restTime += dt
          if (this._restTime > 0.45) {
            this._missShot(ctx)
            return
          }
        } else {
          this._restTime = 0
        }
      }
    }

    if (this._ready && !this._flying && this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(IDLE_CUES))
      if (this._readyBall && !this._readyBall.destroyed) pop(this._readyBall)
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbindCollision?.()
    this._launcher?.destroy()

    this._dropTimer?.kill()
    this._afterTimer?.kill()
    this._levelTimer?.kill()
    this._assistTween?.kill()
    this._readyBreathe?.kill()
    this._basketTween?.kill()

    if (this._readyBall && !this._readyBall.destroyed) {
      gsap.killTweensOf(this._readyBall)
      gsap.killTweensOf(this._readyBall.scale)
    }
    if (this._basketView && !this._basketView.destroyed) gsap.killTweensOf(this._basketView.scale)
    if (this._basketGlow && !this._basketGlow.destroyed) gsap.killTweensOf(this._basketGlow.scale)
    if (this._meterLayer && !this._meterLayer.destroyed) gsap.killTweensOf(this._meterLayer.scale)
    if (this._matBtn && !this._matBtn.destroyed) gsap.killTweensOf(this._matBtn.scale)

    this._balls.forEach((b) => {
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view)
        gsap.killTweensOf(b.view.scale)
      }
    })
    this._balls = []
    if (this._shot?.view && !this._shot.view.destroyed) {
      gsap.killTweensOf(this._shot.view)
      gsap.killTweensOf(this._shot.view.scale)
    }
    this._shot = null

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// ---- Programmatisk grafik -------------------------------------------------

// Glansig boll. kind 'bouncy' = glad färg + stor highlight; 'heavy' = grå sten med
// mörka fläckar + matt glans (signalerar tyngd).
function makeBall(r, color, kind) {
  const c = new Container()
  if (kind === 'heavy') {
    const body = new Graphics()
      .circle(0, 0, r)
      .fill(color)
      .stroke({ width: Math.max(2, r * 0.1), color: shade(color, 0.32), alpha: 0.7 })
    body.circle(-r * 0.3, r * 0.12, r * 0.13).fill({ color: shade(color, 0.26), alpha: 0.5 })
    body.circle(r * 0.26, -r * 0.18, r * 0.1).fill({ color: shade(color, 0.22), alpha: 0.45 })
    const gloss = new Graphics().circle(-r * 0.3, -r * 0.34, r * 0.24).fill({ color: COLORS.white, alpha: 0.28 })
    gloss.eventMode = 'none'
    c.addChild(body, gloss)
  } else {
    const body = new Graphics()
      .circle(0, 0, r)
      .fill(color)
      .stroke({ width: Math.max(2, r * 0.08), color: shade(color, 0.18), alpha: 0.6 })
    const gloss = new Graphics().circle(-r * 0.32, -r * 0.34, r * 0.34).fill({ color: COLORS.white, alpha: 0.55 })
    gloss.eventMode = 'none'
    c.addChild(body, gloss)
  }
  return c
}

// Stjärnboll: gyllene glansboll med en vit stjärna på — den ger en EXTRA mätar-plats.
function makeStarBall(r) {
  const c = new Container()
  c.addChild(makeBall(r, 0xffd23f, 'bouncy'))
  const st = new Graphics()
  if (st.star) st.star(0, 0, 5, r * 0.6, r * 0.28).fill(0xffffff).stroke({ width: 2, color: 0xffb020 })
  else st.circle(0, 0, r * 0.4).fill(0xffffff)
  st.eventMode = 'none'
  c.addChild(st)
  return c
}

// Ballong-boll: stor rosa glansboll med en liten knut nedtill (studsar extra högt).
function makeBalloonBall(r) {
  const c = new Container()
  c.addChild(makeBall(r, 0xff7ec8, 'bouncy'))
  const knot = new Graphics().poly([-5, r - 2, 5, r - 2, 0, r + 9]).fill(0xe14fae)
  knot.eventMode = 'none'
  c.addChild(knot)
  return c
}

// En glad flätkorg sedd snett framifrån. Origo = öppningens mitt (0,0); kroppen ritas
// nedåt. Skala styr storleken per nivå.
function makeBasket(scale = 1) {
  const c = new Container()
  c.scale.set(scale)
  const weave = 0xc88a4a
  const weaveDark = 0x8a5a28
  const lip = 0xe0a861

  // Korgkropp (svagt avsmalnande nedåt) + flätlinjer.
  const body = new Graphics()
    .moveTo(-80, 0)
    .lineTo(80, 0)
    .lineTo(60, 150)
    .lineTo(-60, 150)
    .closePath()
    .fill(weave)
    .stroke({ width: 5, color: weaveDark })
  for (let y = 26; y < 150; y += 28) {
    const t = y / 150
    const hw = 80 - 20 * t
    body.moveTo(-hw, y).lineTo(hw, y).stroke({ width: 3, color: weaveDark, alpha: 0.35 })
  }
  // Mörk insida (hål) i öppningen.
  const hole = new Graphics().ellipse(0, 0, 74, 22).fill(0x5b3d20)
  // Främre kant (lip-ring).
  const rim = new Graphics().ellipse(0, 0, 82, 24).stroke({ width: 9, color: lip })
  rim.ellipse(0, 0, 82, 24).stroke({ width: 3, color: weaveDark, alpha: 0.5 })

  c.addChild(body, hole, rim)
  return c
}

function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
