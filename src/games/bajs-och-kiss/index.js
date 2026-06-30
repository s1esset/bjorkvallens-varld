// Bajs och Kiss — en busig, varm toaletthumor-lek (3–5 år). Elvira och Zacke turas
// om att KASTA en bajskorv i pottan. Barnet greppar bajset och drar mot pottan för
// att välja båge + kraft (prickad bana visar var det hamnar); vid släpp flyger korven
// som en riktig matter.js-kropp i en kastbåge under gravitation, studsar mot pottkanten
// och golvet (restitution) och — om den landar I pottan — PLOPP! Pott-mätaren fylls.
// Full mätare => stort firande + nästa nivå. Två extra kontroller styr utfallet:
//   (a) en bajs-STORLEK (liten/mellan/stor) som sätter massa+täthet via MATERIALS
//       (stor = tung = kort tung båge; liten = lätt = flyger längre), och
//   (b) en "pruttvind" 💨-knapp som blåser korven mot pottan (phys.setWind +
//       launcher.setPreview så pricklinjen matchar).
// INGET game-over: missar landar roligt (puff + fniss), och efter ett par missar
// hjälper kompisen till med ett garanterat plopp. Mätaren går bara UPP. Allt ritas
// programmatiskt (Pixi Graphics + emoji) och städas exit-säkert.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, MATERIALS, Body } from '../../lib/physics.js'
import { AimLauncher } from '../../lib/launcher.js'
import { createScene } from '../../lib/scene.js'
import { bigCelebration, puff, sparkle, floatText, pop } from '../../lib/feedback.js'
import { Button } from '../../lib/Button.js'
import { COLORS, FONT } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

const FLOOR_Y = 600 // golvets ovansida (design-y)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Snäll auto-hjälp: garantera ett plopp först efter så här många missar. Höjt från 2 → 4
// (ca dubbelt) så barnet hinner försöka mer själv innan kompisen hjälper. Fortfarande
// no-fail — hjälpen kommer alltid till slut.
const ASSIST_AFTER_MISSES = 4

const IDLE_CUES = [
  'Dra bajset mot pottan och släpp!',
  'Sikta mot pottan – plopp!',
  'Hjälp Elvira och Zacke att bajsa i pottan!',
]
const PLOPP_PRAISE = ['Plopp! Rakt i pottan!', 'Bajs i pottan! Bravo!', 'Plopp! Vad duktig du är!']
const MISS_SAY = ['Hoppsan! Försök igen!', 'Nästan! En gång till!', 'Pruttig liten miss – kör igen!']
const FULL_SAY = ['Hela pottan är full! Hurra!', 'Bajsmästare! Bravo!', 'Vilket plopp-rekord!']

export default {
  id: 'bajs-och-kiss',
  titleSv: 'Bajs och Kiss',
  icon: '💩',
  category: 'roligt',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'bajs-och-kiss',
  voiceIntro: 'Hjälp Elvira och Zacke att bajsa i pottan!',

  init(ctx) {
    this._alive = true
    this._floorY = FLOOR_Y
    this._idle = 0
    this._flying = false
    this._ready = false
    this._flightTime = 0
    this._restTime = 0
    this._lastBounce = 0
    this._misses = 0
    this._assistNext = false
    this._activeKid = 0 // 0 = Elvira, 1 = Zacke
    this._turd = null // { body, view }
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    // Bajs-storlekar -> massa/studs via MATERIALS (utfallet beror på valet).
    this._sizes = [
      { key: 'liten', label: 'Liten', r: 24, mat: MATERIALS.light }, // lätt -> flyger långt
      { key: 'mellan', label: 'Mellan', r: 34, mat: MATERIALS.normal },
      { key: 'stor', label: 'Stor', r: 46, mat: MATERIALS.heavy }, // tung -> kort tung båge
    ]
    this._sizeIdx = 1

    // Pruttvind (blåser korven mot pottan = åt höger). Hjälpsam, aldrig bestraffande.
    this._windOn = false
    this._windDir = 1
    this._windMag = 0.0005 // matter-acceleration (≈ halv gravitation i sidled)
    this._windPreview = 0.13 // pricklinjens vind (px/steg) ungefär matchad

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Fysik: egen golvkropp + pottans kroppar; väggar bara i sidled.
    this._phys = new PhysicsWorld({ gravityY: 1.2, walls: ['left', 'right'] })
    this._floorBody = this._phys.rectangle(640, this._floorY + 50, 1700, 100, {
      isStatic: true,
      restitution: 0.2,
      friction: 0.9,
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
  },

  // ---- Scen (byggs en gång) -----------------------------------------------

  _buildScene(ctx) {
    // Ljus "badrums"-bakgrund + kaklat golv.
    this._root.addChild(createScene('water', { width: ctx.width, height: ctx.height, ground: false }))
    const floor = new Graphics()
    floor.rect(0, this._floorY, ctx.width, ctx.height - this._floorY).fill(0xeaf2f5)
    floor.rect(0, this._floorY, ctx.width, 8).fill({ color: 0xbcd2dc, alpha: 0.8 })
    for (let x = 80; x < ctx.width; x += 120) floor.rect(x, this._floorY + 8, 3, ctx.height, 0).fill({ color: 0xd2e0e7, alpha: 0.7 })
    floor.eventMode = 'none'
    this._root.addChild(floor)

    // Pottan (byggs/flyttas per nivå).
    this._toiletView = new Container()
    this._toiletView.eventMode = 'none'
    this._root.addChild(this._toiletView)
    this._toilet = { x: 950, bowlY: 440, scale: 1, sensor: null, rimL: null, rimR: null }

    // Spol-knopp på toalettlådan: en busig överraskning (pappa spolas ner!). Egen
    // interaktiv knapp med stort träffområde (>=96px); flyttas per nivå i _setToilet.
    this._pappa = null
    this._flushKnob = makeFlushKnob()
    this._flushKnob.on('pointertap', () => this._flushPappa(ctx))
    this._root.addChild(this._flushKnob)

    // Barnen (Elvira + Zacke).
    this._kids = [makeKid('elvira'), makeKid('zacke')]
    this._kids[0].position.set(165, 500)
    this._kids[1].position.set(305, 500)
    this._kids.forEach((k) => this._root.addChild(k))
    this._kidHands = [
      { x: 222, y: 470 },
      { x: 362, y: 470 },
    ]

    // Lager för flygande korvar (ovanför barnen).
    this._playLayer = new Container()
    this._playLayer.eventMode = 'none'
    this._root.addChild(this._playLayer)

    // Bajset i handen = siktobjektet (stabil referens mellan kast).
    this._held = new Container()
    this._held.visible = false
    this._root.addChild(this._held)
    this._redrawHeld()

    // Sikt-/kast-kontroll (prickad kastbåge).
    this._launcher = new AimLauncher({
      target: this._held,
      root: this._root,
      audio: ctx.services.audio,
      slingshot: false,
      maxPower: 24,
      minPower: 8,
      powerScale: 0.16,
      hitRadius: 96,
      tapPower: 0.85,
      trailColor: 0xfff3b0,
      getOrigin: () => ({ x: this._held.x, y: this._held.y }),
      previewGravity: 0.42,
      previewWind: 0,
      bounds: { floorY: this._floorY, leftX: 30, rightX: 1250 },
      defaultAim: () => ({ x: this._toilet.x, y: this._toilet.bowlY - 50 }),
      onGrab: () => {
        this._idle = 0
      },
      onLaunch: (v) => this._fire(ctx, v),
    })
    this._launcher.setEnabled(false)

    // --- UI ovanpå allt ---
    // Pott-mätare uppe i mitten.
    this._meterLayer = new Container()
    this._meterLayer.position.set(640, 72)
    this._meterLayer.eventMode = 'none'
    this._root.addChild(this._meterLayer)

    // Storleksknappar (nere i mitten).
    this._sizeButtons = []
    this._sizeRing = new Graphics()
    this._sizeRing.eventMode = 'none'
    this._root.addChild(this._sizeRing)
    const bx = [470, 640, 810]
    this._sizes.forEach((s, i) => {
      const b = new Button({
        icon: '💩',
        label: s.label,
        width: 150,
        height: 96,
        color: COLORS.brown,
        stacked: true,
        services: ctx.services,
        sound: 'tap',
        onTap: () => this._selectSize(ctx, i),
      })
      b.position.set(bx[i], 668)
      this._sizeButtons.push(b)
      this._root.addChild(b)
    })

    // Pruttvind-knapp (nere till höger).
    this._windButton = new Button({
      icon: '💨',
      label: 'Pruttvind',
      width: 180,
      height: 96,
      color: COLORS.teal,
      stacked: true,
      services: ctx.services,
      sound: 'whoosh',
      onTap: () => this._toggleWind(ctx),
    })
    this._windButton.position.set(1130, 668)
    this._root.addChild(this._windButton)

    // Vindflagga (visas när pruttvinden är på).
    this._windFlag = new Text({ text: '💨💨', style: { fontFamily: FONT.body, fontSize: 40 } })
    this._windFlag.anchor.set(0.5)
    this._windFlag.position.set(620, 150)
    this._windFlag.visible = false
    this._windFlag.eventMode = 'none'
    this._root.addChild(this._windFlag)

    this._updateSizeRing()
  },

  // ---- Nivå ----------------------------------------------------------------

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._need = clamp(3 + level, 3, 5)
    this._meter = 0
    this._misses = 0
    this._assistNext = false
    this._flying = false

    const toiletX = clamp(900 + level * 48, 900, 1150)
    const scale = clamp(1.0 - level * 0.05, 0.72, 1.0)
    this._setToilet(ctx, toiletX, scale)

    // Pruttvind: knappen dyker upp från nivå 1, och slås på automatiskt från nivå 2.
    const windAvail = level >= 1
    this._windButton.visible = windAvail
    this._windOn = level >= 2
    this._applyWind()
    this._updateWindButton()

    this._drawMeter()

    this._activeKid = level % 2
    this._readyThrow(ctx)
  },

  _setToilet(ctx, x, scale) {
    this._toilet.x = x
    this._toilet.scale = scale
    this._toilet.bowlY = 460 - 16 * scale
    // Visuell potta.
    for (const c of [...this._toiletView.children]) c.destroy()
    this._toiletView.addChild(makeToilet(scale))
    this._toiletView.position.set(x, this._toilet.bowlY)

    // Spol-knoppen sitter ovanpå spollådan. Behåll knappens egen skala = 1 så träffytan
    // alltid är >=96px, även när pottan krymper på högre nivåer.
    if (this._flushKnob && !this._flushKnob.destroyed) {
      this._flushKnob.position.set(x, this._toilet.bowlY - 150 * scale)
    }

    // Fysik-kroppar: en sensor i skålöppningen + två studskanter.
    const { sensor, rimL, rimR } = this._toilet
    if (sensor) this._phys.removeBody(sensor)
    if (rimL) this._phys.removeBody(rimL)
    if (rimR) this._phys.removeBody(rimR)
    this._toilet.sensor = this._phys.rectangle(x, this._toilet.bowlY + 10, 84 * scale, 30 * scale, {
      isStatic: true,
      isSensor: true,
      label: 'toilet',
    })
    this._toilet.rimL = this._phys.circle(x - 80 * scale, this._toilet.bowlY, 13 * scale, { isStatic: true, restitution: 0.5, label: 'rim' })
    this._toilet.rimR = this._phys.circle(x + 80 * scale, this._toilet.bowlY, 13 * scale, { isStatic: true, restitution: 0.5, label: 'rim' })

    // Mjuk andning på pottan (drar blicken).
    this._toiletTween?.kill()
    this._toiletView.scale.set(1)
    this._toiletTween = gsap.to(this._toiletView.scale, { x: 1.04, y: 1.04, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  // ---- Turordning / redo att kasta -----------------------------------------

  _readyThrow(ctx) {
    if (!this._alive) return
    this._flying = false
    this._flightTime = 0
    this._restTime = 0
    this._idle = 0
    this._positionKids()

    // Bajset placeras i den aktiva kompisens hand.
    const hand = this._kidHands[this._activeKid]
    this._redrawHeld()
    gsap.killTweensOf(this._held)
    gsap.killTweensOf(this._held.scale)
    this._breatheTween?.kill()
    this._held.position.set(hand.x, hand.y)
    this._held.visible = true
    this._held.scale.set(0)
    gsap.to(this._held.scale, {
      x: 1,
      y: 1,
      duration: 0.3,
      ease: 'back.out(2)',
      onComplete: () => {
        if (this._alive && this._held && !this._held.destroyed && this._ready) {
          this._breatheTween = gsap.to(this._held.scale, { x: 1.1, y: 1.1, duration: 0.8, yoyo: true, repeat: -1, ease: 'sine.inOut' })
        }
      },
    })

    this._launcher.setEnabled(true)
    this._ready = true

    if (Math.random() < 0.4) {
      const name = this._activeKid === 0 ? 'Elvira' : 'Zacke'
      ctx.services.voice.say(`Nu är det ${name}s tur!`)
    }
  },

  _nextThrow(ctx) {
    if (!this._alive) return
    this._activeKid = 1 - this._activeKid
    this._readyThrow(ctx)
  },

  _positionKids() {
    this._kidBobTween?.kill()
    this._kids.forEach((k, i) => {
      if (!k || k.destroyed) return
      gsap.killTweensOf(k)
      gsap.killTweensOf(k.scale)
      const active = i === this._activeKid
      k.alpha = active ? 1 : 0.62
      k.scale.set(active ? 1 : 0.86)
      k.y = 500
    })
    const a = this._kids[this._activeKid]
    if (a && !a.destroyed) {
      this._kidBobTween = gsap.to(a, { y: 492, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    }
  },

  // ---- Kontroller: storlek + pruttvind -------------------------------------

  _selectSize(ctx, i) {
    this._sizeIdx = i
    this._idle = 0
    this._updateSizeRing()
    pop(this._sizeButtons[i])
    sparkle(ctx.fxLayer, this._sizeButtons[i].x, this._sizeButtons[i].y - 30, { count: 5 })
    ctx.services.voice.say(`${this._sizes[i].label} bajskorv!`)
    if (this._ready && !this._flying) this._redrawHeld()
  },

  _updateSizeRing() {
    const b = this._sizeButtons?.[this._sizeIdx]
    if (!b || !this._sizeRing || this._sizeRing.destroyed) return
    this._sizeRing.clear().roundRect(b.x - 90, b.y - 64, 180, 128, 28).stroke({ width: 8, color: COLORS.yellow })
  },

  _toggleWind(ctx) {
    this._windOn = !this._windOn
    this._idle = 0
    this._applyWind()
    this._updateWindButton()
    if (this._windOn) {
      ctx.services.audio.sfx('fart')
      ctx.services.voice.say('Pruttprutt!')
      floatText(ctx.fxLayer, this._kidHands[this._activeKid].x, this._kidHands[this._activeKid].y - 30, '💨')
    } else {
      ctx.services.audio.sfx('soft')
    }
  },

  _applyWind() {
    const mag = this._windOn ? this._windMag * this._windDir : 0
    this._phys.setWind(mag, 0)
    this._launcher?.setPreview({ wind: this._windOn ? this._windPreview * this._windDir : 0 })
  },

  _updateWindButton() {
    if (this._windButton && !this._windButton.destroyed) {
      this._windButton.alpha = this._windOn ? 1 : 0.7
      gsap.killTweensOf(this._windButton.scale)
      gsap.to(this._windButton.scale, { x: this._windOn ? 1.06 : 1, y: this._windOn ? 1.06 : 1, duration: 0.2 })
    }
    if (this._windFlag && !this._windFlag.destroyed) {
      this._windFlag.visible = this._windOn
      gsap.killTweensOf(this._windFlag)
      if (this._windOn) {
        this._windFlag.x = 600
        gsap.to(this._windFlag, { x: 700, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      }
    }
  },

  // ---- Spol-knopp: busigt påsk-ägg (pappa spolas ner i en virvel) -----------

  // Tryck på spol-knoppen → "pappa" ramlar ner uppifrån och spolas ner i en snurrig
  // virvel medan barn skrattar. Helt positivt, ingen miss. Exit-säkert: vi tweenar en
  // {}-proxy och skriver bara till pappa om den inte hunnit förstöras (spelet kan
  // avslutas mitt i snurren).
  _flushPappa(ctx) {
    if (!this._alive) return
    if (this._pappa) return // en pappa i taget

    pop(this._flushKnob)
    ctx.services.audio.sfx('whoosh')
    // Barnskratt om klipp finns, annars glad fallback + rolig svensk röst.
    if (!ctx.services.audio.sample('skratt')) ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(['Hihihi! Hej då pappa!', 'Hahaha! Pappa åker ner i pottan!', 'Hihi! Spola ner pappa!']))

    const tx = this._toilet.x
    const by = this._toilet.bowlY
    const pappa = new Text({ text: '👨', style: { fontFamily: FONT.body, fontSize: 96 } })
    pappa.anchor.set(0.5)
    pappa.eventMode = 'none'
    pappa.position.set(tx, -140)
    this._playLayer.addChild(pappa)
    this._pappa = pappa

    // Proxy som tweenas; kopieras till pappa endast om den lever (exit-säkert).
    const st = { cx: tx, angle: 0, radius: 0, y: -140, rot: 0, scale: 1.15 }
    const apply = () => {
      if (!pappa || pappa.destroyed) {
        this._pappaTween?.kill()
        return
      }
      pappa.x = st.cx + Math.cos(st.angle) * st.radius
      pappa.y = st.y
      pappa.rotation = st.rot
      pappa.scale.set(Math.max(0.001, st.scale))
    }
    const finish = () => {
      if (pappa && !pappa.destroyed) {
        puff(ctx.fxLayer, tx, by, { count: 10, color: 0x9fd6e8 })
        pappa.destroy()
      }
      this._pappa = null
      this._pappaTween = null
    }

    this._pappaTween?.kill()
    this._pappaTween = gsap
      .timeline({ onUpdate: apply, onComplete: finish })
      // 1) faller ner uppifrån till skålkanten (snurrar redan lite).
      .to(st, { y: by - 6, rot: Math.PI * 1.5, scale: 1, duration: 0.6, ease: 'power1.in' })
      // 2) virveln bullrar ut lite åt sidan.
      .to(st, { radius: 42, duration: 0.18, ease: 'sine.out' }, 'swirl')
      // 3) snurrar runt och ner i hålet medan den krymper bort.
      .to(st, { angle: Math.PI * 10, duration: 1.1, ease: 'power1.in' }, 'swirl')
      .to(st, { y: by + 26, duration: 1.1, ease: 'power2.in' }, 'swirl')
      .to(st, { radius: 0, scale: 0.05, rot: '+=' + Math.PI * 6, duration: 0.95, ease: 'power2.in' }, 'swirl+=0.18')
  },

  // ---- Kast ----------------------------------------------------------------

  _fire(ctx, v) {
    if (!this._ready || this._flying || !this._alive) return
    this._ready = false
    this._launcher.setEnabled(false)
    this._breatheTween?.kill()
    this._idle = 0

    ctx.services.audio.sfx('fart') // hela poängen med leken
    if (Math.random() < 0.5) ctx.services.voice.say('Pruttprutt!')

    const start = { x: this._held.x, y: this._held.y }
    const size = this._sizes[this._sizeIdx]
    const view = makeTurd(size.r)
    view.position.set(start.x, start.y)
    this._playLayer.addChild(view)
    this._held.visible = false
    this._flying = true
    this._flightTime = 0
    this._restTime = 0

    // Garanterat plopp efter ett par missar (snäll auto-hjälp, aldrig straff).
    if (this._assistNext) {
      this._assistNext = false
      this._turd = { body: null, view }
      this._assistGlide(ctx, view, start)
      return
    }

    const body = this._phys.circle(start.x, start.y, size.r, { ...size.mat, label: 'turd' })
    Body.setVelocity(body, { x: v.vx, y: v.vy })
    this._phys.link(body, view)
    this._turd = { body, view }
  },

  // Glider korven i en mjuk båge rakt ner i pottan (garanterad framgång).
  _assistGlide(ctx, view, start) {
    ctx.services.voice.say('Titta, jag hjälper dig!')
    const tx = this._toilet.x
    const ty = this._toilet.bowlY
    const arc = 190
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
        view.rotation += 0.22
      },
      onComplete: () => {
        if (this._alive) this._score(ctx)
      },
    })
  },

  _onCollision(ctx, e) {
    if (!this._alive || !this._flying || !this._turd?.body) return
    const tb = this._turd.body
    for (const pair of e.pairs) {
      const involvesTurd = pair.bodyA === tb || pair.bodyB === tb
      if (!involvesTurd) continue
      const other = pair.bodyA === tb ? pair.bodyB : pair.bodyA
      if (other.label === 'toilet') {
        this._score(ctx)
        return
      }
      if (other.label === 'rim') {
        const now = performance.now()
        if (now - this._lastBounce > 140) {
          this._lastBounce = now
          ctx.services.audio.sfx('pop')
        }
      }
    }
  },

  // ---- Plopp! (lyckat kast) ------------------------------------------------

  _score(ctx) {
    if (!this._flying) return
    this._flying = false
    this._ready = false
    const turd = this._turd
    this._turd = null
    if (turd?.body) this._phys.removeBody(turd.body)
    const v = turd?.view
    const bx = this._toilet.x
    const by = this._toilet.bowlY

    ctx.services.audio.sfx('plopp')
    ctx.services.voice.say(randomFrom(PLOPP_PRAISE))

    if (v && !v.destroyed) {
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
      gsap.to(v, { x: bx, y: by + 12, duration: 0.18, ease: 'power2.in' })
      gsap.to(v.scale, {
        x: 0.18,
        y: 0.18,
        duration: 0.32,
        ease: 'power2.in',
        onComplete: () => {
          if (!v.destroyed) v.destroy()
        },
      })
    }
    puff(ctx.fxLayer, bx, by, { count: 10, color: 0x9fd6e8 })
    sparkle(ctx.fxLayer, bx, by - 8, { count: 6 })
    floatText(ctx.fxLayer, bx, by - 46, 'Plopp!', { fontSize: 48 })

    this._misses = 0
    this._assistNext = false
    this._meter++
    this._drawMeter()
    if (!this._meterLayer.destroyed) pop(this._meterLayer, { scale: 1.12 })
    this._cheerActive()

    if (this._meter >= this._need) {
      this._levelComplete(ctx)
    } else {
      this._afterShotTimer?.kill()
      this._afterShotTimer = gsap.delayedCall(0.85, () => {
        if (this._alive) this._nextThrow(ctx)
      })
    }
  },

  // ---- Miss (alltid roligt, aldrig straff) ---------------------------------

  _miss(ctx) {
    if (!this._flying) return
    this._flying = false
    this._ready = false
    const turd = this._turd
    this._turd = null
    let lx = 500
    let ly = this._floorY
    if (turd?.body) {
      lx = turd.body.position.x
      ly = turd.body.position.y
      this._phys.removeBody(turd.body)
    } else if (turd?.view) {
      lx = turd.view.x
      ly = turd.view.y
    }
    const v = turd?.view

    ctx.services.audio.sfx('soft')
    if (v && !v.destroyed) {
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
      gsap.to(v.scale, {
        x: 1.35,
        y: 0.6,
        duration: 0.12,
        yoyo: true,
        repeat: 1,
        ease: 'sine.inOut',
        onComplete: () => {
          if (!v.destroyed) {
            gsap.to(v.scale, {
              x: 0,
              y: 0,
              duration: 0.3,
              ease: 'back.in(1.8)',
              onComplete: () => {
                if (!v.destroyed) v.destroy()
              },
            })
          }
        },
      })
    }
    puff(ctx.fxLayer, lx, Math.min(ly, this._floorY), { count: 8, color: 0xb5793a })
    floatText(ctx.fxLayer, lx, ly - 30, randomFrom(['Hihi!', 'Hoppsan!', 'Pruttig!']), { fontSize: 46 })

    this._misses++
    if (this._misses >= ASSIST_AFTER_MISSES) {
      this._assistNext = true
      ctx.services.voice.say('Nästa gång hjälper jag dig!')
    } else if (Math.random() < 0.6) {
      ctx.services.voice.say(randomFrom(MISS_SAY))
    }

    this._afterShotTimer?.kill()
    this._afterShotTimer = gsap.delayedCall(0.7, () => {
      if (this._alive) this._nextThrow(ctx)
    })
  },

  _cheerActive() {
    const k = this._kids?.[this._activeKid]
    if (!k || k.destroyed) return
    this._kidBobTween?.kill()
    gsap.killTweensOf(k)
    const y0 = 500
    gsap.to(k, {
      y: y0 - 34,
      duration: 0.22,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
      onComplete: () => {
        if (!k.destroyed) k.y = y0
      },
    })
  },

  // ---- Mätare full: firande + nästa nivå -----------------------------------

  _levelComplete(ctx) {
    this._ready = false
    this._flying = false
    this._launcher.setEnabled(false)
    this._breatheTween?.kill()
    if (this._held && !this._held.destroyed) this._held.visible = false

    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(FULL_SAY))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    sparkle(ctx.fxLayer, this._toilet.x, this._toilet.bowlY, { count: 10 })

    // Båda kompisarna hoppar av glädje.
    this._kidBobTween?.kill()
    this._kids?.forEach((k, i) => {
      if (!k || k.destroyed) return
      gsap.killTweensOf(k)
      k.alpha = 1
      gsap.to(k, { y: 500 - 40, duration: 0.24, yoyo: true, repeat: 3, ease: 'power2.out', delay: i * 0.08, onComplete: () => !k.destroyed && (k.y = 500) })
    })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('plopps', (ctx.progress.get().custom?.plopps || 0) + this._need)
    ctx.progress.complete()

    this._levelTimer?.kill()
    this._levelTimer = gsap.delayedCall(1.9, () => {
      if (this._alive) this._loadLevel(ctx, this._level)
    })
  },

  // ---- Mätare + bajs i handen ----------------------------------------------

  _drawMeter() {
    const layer = this._meterLayer
    if (!layer || layer.destroyed) return
    for (const c of [...layer.children]) c.destroy()
    const n = this._need
    const gap = 64
    const startX = -(n - 1) * gap / 2
    const pot = new Text({ text: '🚽', style: { fontFamily: FONT.body, fontSize: 46 } })
    pot.anchor.set(0.5)
    pot.position.set(startX - 70, 0)
    layer.addChild(pot)
    for (let i = 0; i < n; i++) {
      const x = startX + i * gap
      const slot = new Graphics().circle(x, 0, 25).fill({ color: 0xffffff, alpha: 0.85 }).stroke({ width: 4, color: COLORS.brown })
      layer.addChild(slot)
      if (i < this._meter) {
        const p = new Text({ text: '💩', style: { fontFamily: FONT.body, fontSize: 36 } })
        p.anchor.set(0.5)
        p.position.set(x, 0)
        layer.addChild(p)
      }
    }
  },

  _redrawHeld() {
    if (!this._held || this._held.destroyed) return
    if (this._heldGfx && !this._heldGfx.destroyed) this._heldGfx.destroy()
    this._heldGfx = makeTurd(this._sizes[this._sizeIdx].r)
    this._heldGfx.eventMode = 'none'
    this._held.addChild(this._heldGfx)
  },

  // ---- Ticker: fysik, miss-detektion, idle-recue ---------------------------

  _update(ctx, t) {
    if (!this._alive) return
    const dt = t.deltaMS / 1000
    this._phys.update(t.deltaMS)
    this._idle += dt

    if (this._flying && this._turd?.body) {
      this._flightTime += dt
      const b = this._turd.body
      if (b.position.y > 840) {
        this._miss(ctx)
        return
      }
      if (this._flightTime > 0.3) {
        const sp = Math.hypot(b.velocity.x, b.velocity.y)
        if (sp < 0.6 && b.position.y > this._toilet.bowlY + 24) {
          this._restTime += dt
          if (this._restTime > 0.35) {
            this._miss(ctx)
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
      if (this._held && !this._held.destroyed) pop(this._held)
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._unbindCollision?.()
    this._launcher?.destroy()

    this._afterShotTimer?.kill()
    this._levelTimer?.kill()
    this._assistTween?.kill()
    this._breatheTween?.kill()
    this._kidBobTween?.kill()
    this._toiletTween?.kill()
    this._pappaTween?.kill()
    if (this._pappa && !this._pappa.destroyed) {
      gsap.killTweensOf(this._pappa)
      this._pappa.destroy()
    }
    if (this._flushKnob && !this._flushKnob.destroyed) gsap.killTweensOf(this._flushKnob.scale)

    if (this._held && !this._held.destroyed) {
      gsap.killTweensOf(this._held)
      gsap.killTweensOf(this._held.scale)
    }
    if (this._turd?.view && !this._turd.view.destroyed) {
      gsap.killTweensOf(this._turd.view)
      gsap.killTweensOf(this._turd.view.scale)
    }
    this._kids?.forEach((k) => {
      if (k && !k.destroyed) {
        gsap.killTweensOf(k)
        gsap.killTweensOf(k.scale)
      }
    })
    this._sizeButtons?.forEach((b) => {
      if (b && !b.destroyed) gsap.killTweensOf(b.scale)
    })
    if (this._windButton && !this._windButton.destroyed) gsap.killTweensOf(this._windButton.scale)
    if (this._windFlag && !this._windFlag.destroyed) gsap.killTweensOf(this._windFlag)
    if (this._toiletView && !this._toiletView.destroyed) gsap.killTweensOf(this._toiletView.scale)
    if (this._meterLayer && !this._meterLayer.destroyed) gsap.killTweensOf(this._meterLayer.scale)

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// ---- Programmatisk grafik -------------------------------------------------

// Söt bajskorv med liten markskugga (emoji = pålitlig och gullig).
function makeTurd(r) {
  const c = new Container()
  const shadow = new Graphics().ellipse(0, r * 0.78, r * 0.85, r * 0.3).fill({ color: 0x000000, alpha: 0.14 })
  shadow.eventMode = 'none'
  const t = new Text({ text: '💩', style: { fontFamily: FONT.body, fontSize: r * 2.2 } })
  t.anchor.set(0.5)
  t.eventMode = 'none'
  c.addChild(shadow, t)
  return c
}

// En glad potta/toalett sedd snett framifrån. Origo = skålöppningens mitt (0,0).
function makeToilet(scale = 1) {
  const c = new Container()
  c.scale.set(scale)
  const white = 0xffffff
  const edge = 0xcdd9df
  const water = 0x9fd6e8

  // Spollåda bakom-upptill.
  const tank = new Graphics().roundRect(-72, -150, 144, 104, 16).fill(white).stroke({ width: 4, color: edge })
  tank.roundRect(-30, -150, 18, 30, 6).fill({ color: edge, alpha: 0.8 }) // spolknapp
  // Pelare/fot ner mot golvet.
  const ped = new Graphics()
    .moveTo(-58, 18)
    .lineTo(58, 18)
    .lineTo(46, 140)
    .lineTo(-46, 140)
    .closePath()
    .fill(white)
    .stroke({ width: 4, color: edge })
  // Sits (vit ellips).
  const seat = new Graphics().ellipse(0, 0, 92, 40).fill(white).stroke({ width: 5, color: edge })
  // Hål med vatten.
  const hole = new Graphics().ellipse(0, 6, 62, 25).fill(water)
  hole.ellipse(0, 6, 62, 25).stroke({ width: 3, color: 0x7cc0d6 })
  // Liten glansprick i vattnet.
  const gloss = new Graphics().ellipse(-22, 0, 14, 6).fill({ color: white, alpha: 0.5 })

  c.addChild(tank, ped, seat, hole, gloss)
  return c
}

// Spol-knopp: en grön spol-platta med stort osynligt träffområde (radie 58 = 116px,
// väl över 96px-kravet). Egen interaktiv container; håll dess skala = 1.
function makeFlushKnob() {
  const c = new Container()
  c.eventMode = 'static'
  c.cursor = 'pointer'
  c.hitArea = new Circle(0, 0, 58)
  // Osynlig träff-halo (säkrar pekytan även mellan grafikens kanter).
  const halo = new Graphics().circle(0, 0, 58).fill({ color: 0xffffff, alpha: 0.001 })
  halo.eventMode = 'none'
  // Synlig spol-platta + tryck-prick.
  const plate = new Graphics()
    .roundRect(-32, -17, 64, 34, 14)
    .fill(0x6fbf73)
    .stroke({ width: 4, color: 0x3f9a4a })
    .circle(0, 0, 9)
    .fill({ color: 0xffffff, alpha: 0.92 })
  plate.eventMode = 'none'
  c.addChild(halo, plate)
  return c
}

// Söt unge (programmatisk). kind: 'elvira' (rosett + tofsar) | 'zacke' (keps).
function makeKid(kind) {
  const c = new Container()
  const skin = 0xffe0bd
  const elvira = kind === 'elvira'
  const shirt = elvira ? COLORS.pink : COLORS.blue
  const shirtDark = elvira ? 0xe87da8 : 0x3a85c2
  // Elvira är blond (ägarens önskemål); Zacke har brunt hår (göms ändå under kepsen).
  const hair = elvira ? 0xf4cf63 : 0x7a4a25

  // Tofsar bakom huvudet (Elvira).
  if (elvira) {
    const tails = new Graphics()
      .circle(-40, -56, 16)
      .fill(hair)
      .circle(40, -56, 16)
      .fill(hair)
    c.addChild(tails)
  }

  // Ben + skor.
  const legs = new Graphics()
    .roundRect(-24, 44, 18, 44, 8)
    .fill(0x5a6b8c)
    .roundRect(6, 44, 18, 44, 8)
    .fill(0x5a6b8c)
    .roundRect(-28, 82, 26, 16, 8)
    .fill(0x3a3a3a)
    .roundRect(2, 82, 26, 16, 8)
    .fill(0x3a3a3a)
  c.addChild(legs)

  // Kropp (klänning eller tröja).
  const body = new Graphics()
  if (elvira) {
    body.moveTo(-28, -22).lineTo(28, -22).lineTo(46, 56).lineTo(-46, 56).closePath().fill(shirt).stroke({ width: 3, color: shirtDark })
  } else {
    body.roundRect(-32, -22, 64, 76, 16).fill(shirt).stroke({ width: 3, color: shirtDark })
  }
  c.addChild(body)

  // Armar + händer.
  const arms = new Graphics()
    .roundRect(-46, -14, 18, 48, 9)
    .fill(shirt)
    .roundRect(28, -14, 18, 48, 9)
    .fill(shirt)
    .circle(-37, 38, 9)
    .fill(skin)
    .circle(37, 38, 9)
    .fill(skin)
  c.addChild(arms)

  // Huvud + ansikte.
  const head = new Graphics().circle(0, -56, 34).fill(skin)
  head.circle(-12, -58, 4).fill(0x3a2a1a) // ögon
  head.circle(12, -58, 4).fill(0x3a2a1a)
  head.circle(-20, -48, 6).fill({ color: 0xffb0b0, alpha: 0.7 }) // kinder
  head.circle(20, -48, 6).fill({ color: 0xffb0b0, alpha: 0.7 })
  c.addChild(head)
  const smile = new Graphics().arc(0, -50, 13, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 4, color: 0x9a5b3b })
  c.addChild(smile)

  // Hår / huvudbonad.
  if (elvira) {
    const fringe = new Graphics().roundRect(-32, -86, 64, 22, 12).fill(hair)
    // Rosett på toppen.
    const bow = new Graphics()
      .circle(-11, -90, 11)
      .fill(COLORS.red)
      .circle(11, -90, 11)
      .fill(COLORS.red)
      .circle(0, -90, 6)
      .fill(0xd64a4a)
    c.addChild(fringe, bow)
  } else {
    const cap = new Graphics()
      .ellipse(0, -78, 36, 24)
      .fill(COLORS.green)
      .ellipse(20, -72, 28, 9)
      .fill(0x49a657) // skärm
      .circle(0, -98, 6)
      .fill(0x49a657) // knopp
    c.addChild(cap)
  }

  return c
}
