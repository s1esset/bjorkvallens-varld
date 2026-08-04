// Bajs och Kiss — en busig, varm toaletthumor-lek (3–5 år). Elvira och Zacke turas
// om att KASTA en bajskorv i pottan. Barnet greppar bajset och drar mot pottan för
// att välja båge + kraft (prickad bana visar var det hamnar); vid släpp flyger korven
// som en riktig matter.js-kropp i en kastbåge under gravitation, studsar mot pottkanten
// och golvet (restitution) och — om den landar I pottan — PLOPP! Pott-mätaren fylls.
// Full mätare => stort spol-firande + nästa nivå. Två extra kontroller styr utfallet:
//   (a) en bajs-STORLEK (liten/mellan/stor) som sätter massa+täthet via MATERIALS
//       (stor = tung = kort tung båge; liten = lätt = flyger längre), och
//   (b) en "pruttvind" 💨-knapp som blåser korven mot pottan (phys.setWind +
//       launcher.setPreview så pricklinjen matchar). Vinden är ALLTID barnets val —
//       den slås aldrig på automatiskt, men knappen bjuder in sig själv när det behövs.
// INGET game-over: missar landar roligt (puff + fniss), och efter ett par missar
// hjälper kompisen till med ett garanterat plopp. Mätaren går bara UPP. Allt ritas
// programmatiskt med Pixi Graphics (inga emoji som spelobjekt) och städas exit-säkert.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, MATERIALS, Body } from '../../lib/physics.js'
import { AimLauncher } from '../../lib/launcher.js'
import { createScene, lerpColor } from '../../lib/scene.js'
import { bigCelebration, puff, sparkle, floatText, pop } from '../../lib/feedback.js'
import { Button } from '../../lib/Button.js'
import { COLORS } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

const FLOOR_Y = 600 // golvets ovansida (design-y)
const PED_H = 156 // toalettens höjd från skålöppning ner till fot (lokala px)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Snäll auto-hjälp: garantera ett plopp först efter så här många missar. Höjt från 2 → 4
// (ca dubbelt) så barnet hinner försöka mer själv innan kompisen hjälper. Fortfarande
// no-fail — hjälpen kommer alltid till slut.
const ASSIST_AFTER_MISSES = 4

// Bajstyper: vanlig är vardagen, glitter och regnbåge är de sällsynta wow-ögonblicken.
const TURD_TYPES = {
  vanlig: { c: [0x9c6239, 0xa96e42, 0xb87c4c], line: 0x6f4225, glow: 0xd6a06a, w: 0.62 },
  glitter: { c: [0xd979c2, 0xe98fd2, 0xf5a6de], line: 0x9c4f88, glow: 0xffd7f2, w: 0.21 },
  regnbage: { c: [0xff8a8a, 0xffd35c, 0x7fd6cf], line: 0xa2657f, glow: 0xffffff, w: 0.17 },
}
const TURD_ORDER = ['vanlig', 'glitter', 'regnbage']

// Väggtoner per nivå — badrummet byter färg mjukt när pottan flyttar sig.
const WALL_TINTS = [0xffffff, 0xffeede, 0xe6f6e2, 0xf1e6ff, 0xfff3d6]

const IDLE_CUES = [
  'Dra bajset mot pottan och släpp!',
  'Sikta mot pottan – plopp!',
  'Hjälp Elvira och Zacke att bajsa i pottan!',
]
const PLOPP_PRAISE = ['Plopp! Rakt i pottan!', 'Bajs i pottan! Bravo!', 'Plopp! Vad duktig du är!']
const MISS_SAY = ['Hoppsan! Försök igen!', 'Nästan! En gång till!', 'Pruttig liten miss – kör igen!']
const FULL_SAY = ['Hela pottan är full! Hurra!', 'Bajsmästare! Bravo!', 'Vilket plopp-rekord!']
const TURN_SAY = ['Nu är det Elviras tur!', 'Nu är det Zackes tur!']
const SIZE_SAY = ['Liten bajskorv!', 'Mellan bajskorv!', 'Stor bajskorv!']
const RARE_SAY = ['', 'Åh, en glitterbajs!', 'Titta, en regnbågsbajs!']
// Spolbara busgäster (badanka, strumpa, leksaksbil, maskoten Bobo) — en per tryck.
const GUESTS = ['anka', 'strumpa', 'bil', 'bobo']
const FLUSH_SAY = [
  'Hihi! Ankan simmar ner i pottan!',
  'Hoppsan! Strumpan åker ner i pottan!',
  'Vroom! Bilen spolas ner i pottan!',
  'Hihihi! Hej då Bobo! Vi ses sen!',
]

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
    this._ploppCombo = 0 // plopp-i-rad → stigande kombo-ton
    this._lastPloppAt = 0
    this._assistNext = false
    this._activeKid = 0 // 0 = Elvira, 1 = Zacke
    this._turd = null // { body, view }
    this._turdType = 'vanlig'
    this._meterTypes = [] // vilken sorts korv varje plopp var (mätaren visar den riktiga)
    this._guest = null
    this._guestIdx = -1
    this._flushInvite = false
    this._windInvited = false
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    // Bajs-storlekar -> massa/studs via MATERIALS (utfallet beror på valet).
    this._sizes = [
      { key: 'liten', label: 'Liten', r: 24, mat: MATERIALS.light }, // lätt -> flyger långt
      { key: 'mellan', label: 'Mellan', r: 34, mat: MATERIALS.normal },
      { key: 'stor', label: 'Stor', r: 46, mat: MATERIALS.heavy }, // tung -> kort tung båge
    ]
    this._sizeIdx = 1

    // Pruttvind (blåser korven mot pottan = åt höger). Hjälpsam, aldrig bestraffande,
    // och ALLTID barnets eget val.
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

    this._loadLevel(ctx, this._level, false)
    this._scheduleDrip(ctx)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scen (byggs en gång) -----------------------------------------------

  _buildScene(ctx) {
    // Ljus bakgrund + riktigt badrum (kakel, handfat, spegel, handdukar, toarulle).
    this._root.addChild(createScene('water', { width: ctx.width, height: ctx.height, ground: false }))

    this._bath = makeBathroom(ctx.width, ctx.height, this._floorY)
    this._root.addChild(this._bath.view)
    this._tiles = this._bath.tiles
    this._cat = this._bath.cat

    // Pottan (byggs/flyttas per nivå).
    this._toiletView = new Container()
    this._toiletView.eventMode = 'none'
    this._root.addChild(this._toiletView)
    this._toilet = { x: 950, bowlY: 444, scale: 1, sensor: null, rimL: null, rimR: null }

    // Spol-knopp på toalettlådan: en busig överraskning (en busgäst spolas ner!). Egen
    // interaktiv knapp med stort träffområde (>=96px); flyttas per nivå i _setToilet.
    this._flushKnob = makeFlushKnob()
    this._flushGlow = this._flushKnob.glow
    this._flushKnob.on('pointertap', () => this._flushGuest(ctx))
    this._root.addChild(this._flushKnob)

    // Barnen (Elvira + Zacke) med riktiga, ritade ansiktsuttryck.
    this._kids = [makeKid('elvira'), makeKid('zacke')]
    this._kids[0].position.set(165, 500)
    this._kids[1].position.set(305, 500)
    this._kids.forEach((k) => this._root.addChild(k))
    // Handen = den ritade handcirkeln (lokalt 37,38 => absolut y 538). Korven ska VILA i
    // handen, inte sväva i tomrummet mellan barnens huvuden.
    this._kidHands = [
      { x: 204, y: 514 },
      { x: 344, y: 514 },
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
    // Pott-mätare uppe i mitten: en riktig ritad potta som fylls korv för korv.
    this._meterLayer = new Container()
    this._meterLayer.position.set(640, 74)
    this._meterLayer.eventMode = 'none'
    this._root.addChild(this._meterLayer)
    const potty = makePotty()
    this._pottyMouth = potty.mouth
    this._meterPile = new Container()
    this._meterPile.eventMode = 'none'
    this._meterLayer.addChild(potty.view, this._meterPile)

    // Storleksknappar (nere i mitten). y=650 håller knapparnas underkant på 698 —
    // 22px marginal till skärmkanten i stället för att klistra i den.
    this._sizeButtons = []
    this._sizeRing = new Graphics()
    this._sizeRing.eventMode = 'none'
    this._root.addChild(this._sizeRing)
    // 200px isär: 50px synligt mellanrum, så Button.js egna 24px hit-halor inte överlappar
    // varandra (P0 kräver >=24px avstånd mellan träffytor).
    const bx = [440, 640, 840]
    this._sizes.forEach((s, i) => {
      const b = new Button({
        label: s.label,
        width: 150,
        height: 96,
        color: COLORS.brown,
        services: ctx.services,
        sound: 'tap',
        onTap: () => this._selectSize(ctx, i),
      })
      // Ritad mini-korv i knappen så barnet SER storleksskillnaden, inte bara läser den.
      // Button lägger [lip, face, etikett] — flytta ner etiketten och lägg korven över.
      const labelText = b.children[b.children.length - 1]
      if (labelText) labelText.y = 28
      // Ljus platta bakom korven — brunt på brunt syns inte.
      const disc = new Graphics().ellipse(0, -14, 40, 30).fill({ color: COLORS.cream, alpha: 0.9 })
      disc.eventMode = 'none'
      const ic = makeTurd(11 + i * 5, 'vanlig')
      ic.position.set(0, -14)
      ic.eventMode = 'none'
      b.addChild(disc, ic)
      b.position.set(bx[i], 650)
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
    this._windButton.position.set(1130, 650)
    this._root.addChild(this._windButton)

    // Vindvirvel (ritad) — visas när pruttvinden är på.
    this._windFlag = makeWindSwirl()
    this._windFlag.position.set(620, 170)
    this._windFlag.visible = false
    this._windFlag.eventMode = 'none'
    this._root.addChild(this._windFlag)

    this._updateSizeRing()
  },

  // ---- Nivå ----------------------------------------------------------------

  _loadLevel(ctx, level, animate = true) {
    if (!this._alive) return
    this._need = clamp(3 + level, 3, 5)
    this._meter = 0
    this._meterTypes = []
    this._misses = 0
    this._assistNext = false
    this._flying = false
    this._windInvited = false

    const toiletX = clamp(900 + level * 48, 900, 1150)
    const scale = clamp(1.0 - level * 0.05, 0.72, 1.0)
    this._setToilet(toiletX, scale, animate)
    this._tintWall(level, animate)

    // Pruttvinden finns från nivå 1 och är ALLTID barnets val — den slås aldrig på
    // automatiskt längre (då blev den bara bakgrund). Auto-assist är säkerhetsnätet.
    this._windButton.visible = level >= 1
    this._windOn = false
    this._applyWind()
    this._updateWindButton()

    this._drawMeter()

    this._activeKid = level % 2
    this._readyThrow(ctx)
  },

  _setToilet(x, scale, animate = false) {
    this._toilet.x = x
    this._toilet.scale = scale
    // Foten ska alltid stå PÅ golvet — annars svävar toaletten när den krymper.
    this._toilet.bowlY = this._floorY - PED_H * scale

    const rebuild = () => {
      if (!this._alive || this._toiletView.destroyed) return
      for (const c of [...this._toiletView.children]) c.destroy()
      this._toiletView.addChild(makeToilet(scale))
      this._toiletView.position.set(x, this._toilet.bowlY)
      if (this._flushKnob && !this._flushKnob.destroyed) {
        this._flushKnob.position.set(x, this._toilet.bowlY - 128 * scale)
      }
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

    this._toiletTween?.kill()
    this._toiletFade?.kill()
    this._toiletView.scale.set(1)

    const breathe = () => {
      if (!this._alive || this._toiletView.destroyed) return
      this._toiletTween = gsap.to(this._toiletView.scale, { x: 1.03, y: 1.03, duration: 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    }

    if (animate) {
      // Mjuk scenövergång: pottan tonar ut, flyttar sig och tonar in igen.
      this._toiletFade = gsap
        .timeline()
        .to(this._toiletView, { alpha: 0, duration: 0.28, ease: 'sine.in' })
        .add(rebuild)
        .to(this._toiletView, { alpha: 1, duration: 0.34, ease: 'sine.out', onComplete: breathe })
    } else {
      rebuild()
      this._toiletView.alpha = 1
      breathe()
    }
  },

  // Väggtonen glider mjukt mellan nivåerna så världen känns sammanhängande.
  _tintWall(level, animate) {
    if (!this._tiles || this._tiles.destroyed) return
    const to = WALL_TINTS[level % WALL_TINTS.length]
    this._wallTween?.kill()
    if (!animate) {
      this._tiles.tint = to
      return
    }
    const from = this._tiles.tint
    const st = { t: 0 }
    this._wallTween = gsap.to(st, {
      t: 1,
      duration: 0.9,
      ease: 'sine.inOut',
      onUpdate: () => {
        if (!this._tiles || this._tiles.destroyed) {
          this._wallTween?.kill()
          return
        }
        this._tiles.tint = lerpColor(from, to, st.t)
      },
    })
  },

  // ---- Turordning / redo att kasta -----------------------------------------

  _readyThrow(ctx) {
    if (!this._alive) return
    this._flying = false
    this._flightTime = 0
    this._restTime = 0
    this._idle = 0
    this._positionKids()

    // Ny bajstyp per kast — vanlig är vardagen, glitter/regnbåge är wow-ögonblicken.
    const prev = this._turdType
    this._turdType = pickTurdType()
    const ti = TURD_ORDER.indexOf(this._turdType)

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
    this._setKidFace(this._activeKid, 'glad')
    this._stankaPose(ctx, this._activeKid) // knip-anticipation när korven dyker upp

    if (ti > 0 && this._turdType !== prev) {
      sparkle(ctx.fxLayer, hand.x, hand.y, { count: 7 })
      ctx.services.voice.say(RARE_SAY[ti])
    } else if (Math.random() < 0.4) {
      ctx.services.voice.say(TURN_SAY[this._activeKid])
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
      if (!active) this._setKidFace(i, 'glad')
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
    ctx.services.voice.say(SIZE_SAY[i])
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
    this._windInvited = true
    this._applyWind()
    this._updateWindButton()
    if (this._windOn) {
      ctx.services.audio.sfx('fart')
      ctx.services.voice.say('Pruttprutt!')
      puff(ctx.fxLayer, this._kidHands[this._activeKid].x, this._kidHands[this._activeKid].y + 10, { count: 7, color: 0xbfe6e0 })
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
      this._windGlowTween?.kill()
      gsap.killTweensOf(this._windButton.scale)
      gsap.to(this._windButton.scale, { x: this._windOn ? 1.06 : 1, y: this._windOn ? 1.06 : 1, duration: 0.2 })
    }
    if (this._windFlag && !this._windFlag.destroyed) {
      this._windFlag.visible = this._windOn
      gsap.killTweensOf(this._windFlag)
      if (this._windOn) {
        this._windFlag.x = 580
        gsap.to(this._windFlag, { x: 720, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      }
    }
  },

  // Vinden bjuder in sig själv i stället för att slå på sig själv: när pottan står
  // långt bort och kastet inte riktigt når, guppar knappen och kompisen tipsar.
  _maybeInviteWind(ctx) {
    if (this._windInvited || this._windOn || this._level < 2) return
    const b = this._windButton
    if (!b || b.destroyed || !b.visible) return
    this._windInvited = true
    this._windGlowTween?.kill()
    gsap.killTweensOf(b.scale)
    this._windGlowTween = gsap.to(b.scale, { x: 1.12, y: 1.12, duration: 0.45, yoyo: true, repeat: 5, ease: 'sine.inOut' })
    ctx.services.voice.say('Prova pruttvinden! Då flyger bajset längre.')
  },

  // ---- Spol-knopp: busiga gäster spolas ner --------------------------------

  // Tryck på spol-knoppen → en busgäst (badanka, strumpa, leksaksbil eller Bobo)
  // ramlar ner uppifrån och spolas ner i en snurrig virvel medan barnen skrattar.
  // Helt positivt, ingen miss. Efter en full potta LYSER knoppen som belöning så att
  // alla barn hittar gaget, inte bara de som råkar trycka. Exit-säkert: vi tweenar en
  // {}-proxy och skriver bara till gästen om den inte hunnit förstöras.
  _flushGuest(ctx) {
    if (!this._alive) return
    if (this._guest) return // en gäst i taget

    this._setFlushInvite(false)
    pop(this._flushKnob)
    ctx.services.audio.sfx('whoosh')
    // Barnskratt om klipp finns, annars ett LÄTT pling — inte celebrate-fanfaren, som ska
    // vara reserverad för full potta så det ögonblicket förblir spelets största ljud.
    if (!ctx.services.audio.sample('skratt')) ctx.services.audio.sfx('pling')

    // Rotera gästerna så tryck 2 inte ser ut som tryck 1.
    let gi = Math.floor(Math.random() * GUESTS.length)
    if (gi === this._guestIdx) gi = (gi + 1) % GUESTS.length
    this._guestIdx = gi
    ctx.services.voice.say(FLUSH_SAY[gi])

    const tx = this._toilet.x
    const by = this._toilet.bowlY
    const guest = makeGuest(GUESTS[gi])
    guest.eventMode = 'none'
    guest.position.set(tx, -140)
    this._playLayer.addChild(guest)
    this._guest = guest

    // Proxy som tweenas; kopieras till gästen endast om den lever (exit-säkert).
    const st = { cx: tx, angle: 0, radius: 0, y: -140, rot: 0, scale: 1.15 }
    const apply = () => {
      if (!guest || guest.destroyed) {
        this._guestTween?.kill()
        return
      }
      guest.x = st.cx + Math.cos(st.angle) * st.radius
      guest.y = st.y
      guest.rotation = st.rot
      guest.scale.set(Math.max(0.001, st.scale))
    }
    const finish = () => {
      if (guest && !guest.destroyed) {
        puff(ctx.fxLayer, tx, by, { count: 10, color: 0x9fd6e8 })
        guest.destroy()
      }
      this._guest = null
      this._guestTween = null
    }

    this._guestTween?.kill()
    this._guestTween = gsap
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

  _setFlushInvite(on) {
    this._flushInvite = on
    const g = this._flushGlow
    if (!g || g.destroyed) return
    this._flushGlowTween?.kill()
    gsap.killTweensOf(g)
    gsap.killTweensOf(g.scale)
    g.visible = on
    if (!on) return
    g.alpha = 0.9
    g.scale.set(1)
    this._flushGlowTween = gsap
      .timeline({ repeat: -1 })
      .to(g.scale, { x: 1.45, y: 1.45, duration: 0.9, ease: 'sine.out' }, 0)
      .to(g, { alpha: 0.15, duration: 0.9, ease: 'sine.out' }, 0)
      .set(g.scale, { x: 1, y: 1 })
      .set(g, { alpha: 0.9 })
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
    this._setKidFace(this._activeKid, 'wow') // kompisen ser korven flyga

    const start = { x: this._held.x, y: this._held.y }
    const size = this._sizes[this._sizeIdx]
    const view = makeTurd(size.r, this._turdType)
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
    const type = TURD_TYPES[this._turdType] || TURD_TYPES.vanlig

    ctx.services.audio.sfx('plopp')
    // Stigande plopp-kombo: varje plopp i rad klättrar ett halvtonsteg.
    const nowMs = performance.now()
    this._ploppCombo = nowMs - this._lastPloppAt < 3500 ? Math.min(this._ploppCombo + 1, 8) : 0
    this._lastPloppAt = nowMs
    ctx.services.audio.tone({ freq: 300 * Math.pow(2, this._ploppCombo / 12), dur: 0.14, type: 'sine', vol: 0.16 })
    ctx.services.voice.say(randomFrom(PLOPP_PRAISE))
    this._setKidFace(this._activeKid, 'jubel')
    this._catReact()

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
          if (!v.destroyed) {
            gsap.killTweensOf(v)
            v.destroy()
          }
        },
      })
    }
    // Pott-vatten som stänker upp — skalar med bajs-storleken.
    const splash = 8 + Math.round(this._sizes[this._sizeIdx].r / 6)
    puff(ctx.fxLayer, bx, by, { count: splash, color: 0x9fd6e8 })
    sparkle(ctx.fxLayer, bx, by - 8, { count: this._turdType === 'vanlig' ? 6 : 14 })
    if (this._turdType !== 'vanlig') puff(ctx.fxLayer, bx, by - 20, { count: 10, color: type.glow })
    floatText(ctx.fxLayer, bx, by - 46, 'Plopp!', { fontSize: 48 })

    this._misses = 0
    this._assistNext = false
    this._meterTypes.push(this._turdType)
    this._meter++
    this._drawMeter()
    if (!this._meterLayer.destroyed) pop(this._meterLayer, { scale: 1.12 })
    this._cheerActive()

    if (this._meter >= this._need) {
      this._levelComplete(ctx)
    } else {
      this._afterShotTimer?.kill()
      this._afterShotTimer = ctx.later(0.85, () => {
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
    this._ploppCombo = 0
    this._setKidFace(this._activeKid, 'fniss')
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
                if (!v.destroyed) {
                  gsap.killTweensOf(v)
                  v.destroy()
                }
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
    } else if (this._misses >= 1 && !this._windInvited && this._level >= 2) {
      this._maybeInviteWind(ctx)
    } else if (Math.random() < 0.6) {
      ctx.services.voice.say(randomFrom(MISS_SAY))
    }

    this._afterShotTimer?.kill()
    this._afterShotTimer = ctx.later(0.7, () => {
      if (this._alive) this._nextThrow(ctx)
    })
  },

  // Ritat ansiktsuttryck på den aktiva kompisen: glad / wow / jubel / fniss.
  _setKidFace(i, mood) {
    const k = this._kids?.[i]
    if (!k || k.destroyed || !k.face || k.face.destroyed) return
    drawKidFace(k.face, mood)
  },

  // Knip-anticipation: den aktiva kompisen gör en kort, fnissig "stånka" (squash + pruttpip)
  // precis när korven dyker upp i handen — varje kast får en liten komisk uppladdning.
  _stankaPose(ctx, i) {
    const k = this._kids?.[i]
    if (!k || k.destroyed) return
    gsap.killTweensOf(k.scale)
    gsap
      .timeline()
      .to(k.scale, { x: 1.14, y: 0.86, duration: 0.14, ease: 'power2.out' })
      .to(k.scale, { x: 0.94, y: 1.08, duration: 0.12, ease: 'power2.out' })
      .to(k.scale, { x: 1, y: 1, duration: 0.34, ease: 'elastic.out(1, 0.5)' })
    const hand = this._kidHands[i]
    puff(ctx.fxLayer, hand.x - 10, hand.y + 8, { count: 5, color: 0xbfe6e0 })
    if (!ctx.services.audio.sample?.('prutt')) ctx.services.audio.tone({ freq: 190, dur: 0.14, type: 'sawtooth', vol: 0.08, slideTo: 90 })
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

  // Katten i hörnet tittar upp vid varje plopp — en liten publik som bryr sig.
  _catReact() {
    const c = this._cat
    if (!c || c.destroyed) return
    gsap.killTweensOf(c)
    gsap.killTweensOf(c.scale)
    gsap.to(c.scale, { x: 1.12, y: 0.9, duration: 0.12, yoyo: true, repeat: 1, ease: 'sine.inOut' })
    if (c.tail && !c.tail.destroyed) {
      gsap.killTweensOf(c.tail)
      gsap.fromTo(c.tail, { rotation: -0.25 }, { rotation: 0.3, duration: 0.18, yoyo: true, repeat: 3, ease: 'sine.inOut' })
    }
  },

  // ---- Mätare full: spol-firande + nästa nivå ------------------------------

  _levelComplete(ctx) {
    this._ready = false
    this._flying = false
    this._launcher.setEnabled(false)
    this._breatheTween?.kill()
    if (this._held && !this._held.destroyed) this._held.visible = false

    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(FULL_SAY))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    // Spel-specifik finish: pottan SPOLAS. En vattenvirvel snurrar i skålen, bubblor
    // stiger och spol-svischen faller i tonhöjd — inte samma konfetti som alla andra.
    this._flushCelebrate(ctx)

    // Båda kompisarna hoppar av glädje med jubel-min.
    this._kidBobTween?.kill()
    this._kids?.forEach((k, i) => {
      if (!k || k.destroyed) return
      gsap.killTweensOf(k)
      k.alpha = 1
      this._setKidFace(i, 'jubel')
      gsap.to(k, { y: 500 - 40, duration: 0.24, yoyo: true, repeat: 3, ease: 'power2.out', delay: i * 0.08, onComplete: () => !k.destroyed && (k.y = 500) })
    })
    this._catReact()

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('plopps', (ctx.progress.get().custom?.plopps || 0) + this._need)
    ctx.progress.complete()

    // Spol-knoppen tänds som belöning: nu FÅR man spola, och gaget hittas av alla.
    this._setFlushInvite(true)
    ctx.later(1.5, () => {
      if (this._alive && this._flushInvite) ctx.services.voice.say('Tryck på den gröna spolknappen!')
    })

    this._levelTimer?.kill()
    this._levelTimer = ctx.later(2.6, () => {
      if (this._alive) this._loadLevel(ctx, this._level, true)
    })
  },

  // Vattenvirvel + bubblor i skålen, med fallande spol-svisch.
  _flushCelebrate(ctx) {
    const bx = this._toilet.x
    const by = this._toilet.bowlY
    const s = this._toilet.scale

    ctx.services.audio.sfx('whoosh')
    ctx.services.audio.tone({ freq: 620, dur: 0.7, type: 'sine', vol: 0.12, slideTo: 180 })

    const swirl = new Graphics()
    swirl.eventMode = 'none'
    swirl.position.set(bx, by + 6)
    this._playLayer.addChild(swirl)
    for (let i = 0; i < 3; i++) {
      const r = (18 + i * 15) * s
      arcPath(swirl, 0, 0, r, 0.2 + i * 0.7, 0.2 + i * 0.7 + Math.PI * 1.25).stroke({ width: 6 * s, color: 0x9fd6e8, alpha: 0.9, cap: 'round' })
    }
    swirl.scale.set(1, 0.42)

    const st = { rot: 0, a: 1, sc: 1 }
    this._swirlTween?.kill()
    this._swirlTween = gsap.to(st, {
      rot: Math.PI * 6,
      a: 0,
      sc: 0.25,
      duration: 1.5,
      ease: 'power2.in',
      onUpdate: () => {
        if (!swirl || swirl.destroyed) {
          this._swirlTween?.kill()
          return
        }
        swirl.rotation = st.rot
        swirl.alpha = st.a
        swirl.scale.set(st.sc, st.sc * 0.42)
      },
      onComplete: () => {
        if (swirl && !swirl.destroyed) swirl.destroy()
        this._swirlTween = null
      },
    })

    for (let i = 0; i < 4; i++) {
      ctx.later(0.12 * i, () => {
        if (this._alive) sparkle(ctx.fxLayer, bx + (i - 1.5) * 26 * s, by - 10, { count: 4 })
      })
    }
    puff(ctx.fxLayer, bx, by, { count: 14, color: 0x9fd6e8 })
  },

  // ---- Mätare + bajs i handen ----------------------------------------------

  // Pott-mätaren är en riktig ritad potta: varje plopp lägger en korv i den, och de
  // som fattas ligger kvar som bleka konturer så barnet ser hur långt det är kvar.
  _drawMeter() {
    const pile = this._meterPile
    if (!pile || pile.destroyed) return
    // Döda pågående tweens FÖRE destroy — Pixi v8 nollar .scale vid destroy, och en
    // levande gsap.from skulle då skriva till null.
    for (const c of [...pile.children]) {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
      c.destroy()
    }
    const n = this._need
    const span = 84
    const step = n > 1 ? span / (n - 1) : 0
    for (let i = 0; i < n; i++) {
      const done = i < this._meter
      const t = makeTurd(14, done ? this._meterTypes[i] || 'vanlig' : 'vanlig')
      // Klara korvar sitter högt och syns; de som fattas ligger sjunkna och nästan osynliga
      // i kanten — annars ser pottan nästan full ut redan från start.
      t.position.set(-span / 2 + i * step, done ? -26 - (i % 2) * 6 : -10)
      t.alpha = done ? 1 : 0.09
      t.eventMode = 'none'
      pile.addChild(t)
      if (done && i === this._meter - 1) {
        gsap.from(t.scale, { x: 0.2, y: 0.2, duration: 0.3, ease: 'back.out(2.4)' })
      }
    }
    // Pottans mun blir bredare ju fullare den är.
    if (this._pottyMouth && !this._pottyMouth.destroyed) {
      const f = n > 0 ? this._meter / n : 0
      drawPottyMouth(this._pottyMouth, f)
    }
  },

  _redrawHeld() {
    if (!this._held || this._held.destroyed) return
    if (this._heldGfx && !this._heldGfx.destroyed) this._heldGfx.destroy()
    this._heldGfx = makeTurd(this._sizes[this._sizeIdx].r, this._turdType)
    this._heldGfx.eventMode = 'none'
    this._held.addChild(this._heldGfx)
  },

  // ---- Badrums-ambiens: en droppande kran ----------------------------------

  _scheduleDrip(ctx) {
    this._dripCall = ctx.later(5 + Math.random() * 6, () => {
      if (!this._alive) return
      this._drip(ctx)
      this._scheduleDrip(ctx)
    })
  },

  _drip(ctx) {
    const layer = this._bath?.view
    if (!layer || layer.destroyed) return
    const drop = new Graphics().circle(0, 0, 5).fill({ color: 0x9fd6e8, alpha: 0.9 })
    drop.eventMode = 'none'
    drop.position.set(112, 452)
    layer.addChild(drop)
    ctx.services.audio.tone({ freq: 1500, dur: 0.08, type: 'sine', vol: 0.04, slideTo: 900 })
    gsap.to(drop, {
      y: 492,
      duration: 0.42,
      ease: 'power2.in',
      onComplete: () => {
        if (!drop.destroyed) drop.destroy()
      },
    })
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
    this._dripCall?.kill()
    this._assistTween?.kill()
    this._breatheTween?.kill()
    this._kidBobTween?.kill()
    this._toiletTween?.kill()
    this._toiletFade?.kill()
    this._wallTween?.kill()
    this._windGlowTween?.kill()
    this._flushGlowTween?.kill()
    this._swirlTween?.kill()
    this._guestTween?.kill()
    if (this._guest && !this._guest.destroyed) {
      gsap.killTweensOf(this._guest)
      this._guest.destroy()
    }
    if (this._flushKnob && !this._flushKnob.destroyed) gsap.killTweensOf(this._flushKnob.scale)
    if (this._flushGlow && !this._flushGlow.destroyed) {
      gsap.killTweensOf(this._flushGlow)
      gsap.killTweensOf(this._flushGlow.scale)
    }

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
    if (this._cat && !this._cat.destroyed) {
      gsap.killTweensOf(this._cat)
      gsap.killTweensOf(this._cat.scale)
      if (this._cat.tail && !this._cat.tail.destroyed) gsap.killTweensOf(this._cat.tail)
    }
    if (this._windButton && !this._windButton.destroyed) gsap.killTweensOf(this._windButton.scale)
    if (this._windFlag && !this._windFlag.destroyed) gsap.killTweensOf(this._windFlag)
    if (this._toiletView && !this._toiletView.destroyed) {
      gsap.killTweensOf(this._toiletView)
      gsap.killTweensOf(this._toiletView.scale)
    }
    if (this._meterLayer && !this._meterLayer.destroyed) gsap.killTweensOf(this._meterLayer.scale)
    if (this._meterPile && !this._meterPile.destroyed) {
      this._meterPile.children.forEach((c) => !c.destroyed && gsap.killTweensOf(c.scale))
    }

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// ---- Programmatisk grafik -------------------------------------------------

// Pixi v8: arc() FORTSÄTTER den aktuella vägen. Ritas en båge i samma Graphics som
// redan har former dras annars ett streck från förra punkten till bågens start (det
// gav ett brunt streck tvärs över barnen). Sätt alltid startpunkten först.
function arcPath(g, cx, cy, r, a0, a1) {
  return g.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r).arc(cx, cy, r, a0, a1)
}

// Slumpa bajstyp med vikter: vanlig är vardagen, glitter/regnbåge de sällsynta wow:en.
function pickTurdType() {
  let r = Math.random()
  for (const key of TURD_ORDER) {
    r -= TURD_TYPES[key].w
    if (r <= 0) return key
  }
  return 'vanlig'
}

// Ritad bajskorv med egen silhuett och eget ansikte: tre mjuka lager som smalnar av
// uppåt, mörk kontur, glansdrag och två pigga ögon. r = ungefärlig halva bredden.
function makeTurd(r, type = 'vanlig') {
  const c = new Container()
  const P = TURD_TYPES[type] || TURD_TYPES.vanlig

  const shadow = new Graphics().ellipse(0, r * 0.92, r * 0.8, r * 0.24).fill({ color: 0x000000, alpha: 0.13 })
  shadow.eventMode = 'none'
  c.addChild(shadow)

  const layers = [
    { y: r * 0.5, rx: r * 0.98, ry: r * 0.34, col: P.c[0] },
    { y: r * 0.04, rx: r * 0.76, ry: r * 0.31, col: P.c[1] },
    { y: -r * 0.42, rx: r * 0.5, ry: r * 0.26, col: P.c[2] },
  ]

  // Kontur = samma former lite större i mörk ton (ger ren silhuett utan inre streck).
  const outline = new Graphics()
  for (const L of layers) outline.ellipse(0, L.y, L.rx + r * 0.07, L.ry + r * 0.07).fill(P.line)
  outline
    .moveTo(-r * 0.2, -r * 0.5)
    .quadraticCurveTo(r * 0.02, -r * 1.02, r * 0.2, -r * 0.5)
    .closePath()
    .fill(P.line)
  outline.eventMode = 'none'
  c.addChild(outline)

  const body = new Graphics()
  body
    .moveTo(-r * 0.14, -r * 0.46)
    .quadraticCurveTo(r * 0.02, -r * 0.94, r * 0.14, -r * 0.46)
    .closePath()
    .fill(P.c[2])
  for (const L of layers) body.ellipse(0, L.y, L.rx, L.ry).fill(L.col)
  // Glansdrag uppe till vänster på varje lager.
  for (const L of layers) body.ellipse(-L.rx * 0.42, L.y - L.ry * 0.42, L.rx * 0.3, L.ry * 0.28).fill({ color: 0xffffff, alpha: 0.22 })
  body.eventMode = 'none'
  c.addChild(body)

  if (type === 'glitter' || type === 'regnbage') {
    const g = new Graphics()
    const dots = [
      [-r * 0.5, -r * 0.1],
      [r * 0.44, r * 0.32],
      [-r * 0.2, r * 0.62],
      [r * 0.18, -r * 0.62],
    ]
    for (const [dx, dy] of dots) {
      g.circle(dx, dy, r * 0.09).fill({ color: P.glow, alpha: 0.95 })
      g.rect(dx - r * 0.02, dy - r * 0.19, r * 0.04, r * 0.38).fill({ color: P.glow, alpha: 0.6 })
      g.rect(dx - r * 0.19, dy - r * 0.02, r * 0.38, r * 0.04).fill({ color: P.glow, alpha: 0.6 })
    }
    g.eventMode = 'none'
    c.addChild(g)
  }

  // Ansikte på mittlagret (bredast + syns bäst i luften).
  const face = new Graphics()
  const ey = r * 0.0
  face.circle(-r * 0.25, ey, r * 0.17).fill(0xffffff)
  face.circle(r * 0.25, ey, r * 0.17).fill(0xffffff)
  face.circle(-r * 0.23, ey + r * 0.03, r * 0.085).fill(0x2f2018)
  face.circle(r * 0.27, ey + r * 0.03, r * 0.085).fill(0x2f2018)
  arcPath(face, 0, r * 0.16, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: Math.max(2, r * 0.06), color: 0x2f2018, cap: 'round' })
  face.eventMode = 'none'
  c.addChild(face)

  return c
}

// Ett riktigt badrum: kaklad nedre vägg, spegel + handfat, handdukshängare,
// toarullehållare, badmatta och en nyfiken katt. Ren dekor (eventMode none).
function makeBathroom(w, h, floorY) {
  const view = new Container()
  view.eventMode = 'none'

  // --- Kakel på nedre halvan av väggen + list ---
  const tiles = new Graphics()
  const TILE_TOP = 296
  for (let y = TILE_TOP; y < floorY; y += 52) {
    for (let x = 0; x < w; x += 60) {
      tiles.roundRect(x + 3, y + 3, 54, 46, 8).fill({ color: 0xffffff, alpha: 0.34 })
    }
  }
  tiles.rect(0, TILE_TOP - 12, w, 12).fill({ color: 0xffffff, alpha: 0.6 })
  tiles.eventMode = 'none'
  view.addChild(tiles)

  // --- Golv (kaklat, med fogar) ---
  const floor = new Graphics()
  floor.rect(0, floorY, w, h - floorY).fill(0xeaf2f5)
  floor.rect(0, floorY, w, 8).fill({ color: 0xbcd2dc, alpha: 0.8 })
  for (let x = 80; x < w; x += 120) floor.rect(x, floorY + 8, 3, h).fill({ color: 0xd2e0e7, alpha: 0.7 })
  floor.eventMode = 'none'
  view.addChild(floor)

  // --- Fönster med himmel (fyller den tomma övre väggen) ---
  const win = new Graphics()
  win.roundRect(-86, -74, 172, 148, 18).fill(0xe6d3b8).stroke({ width: 6, color: 0xcbb391 })
  win.roundRect(-72, -60, 144, 120, 10).fill(0xb9e6f7)
  win.circle(-30, 14, 34).fill({ color: 0xffffff, alpha: 0.85 })
  win.circle(4, 6, 26).fill({ color: 0xffffff, alpha: 0.85 })
  win.circle(36, 20, 22).fill({ color: 0xffffff, alpha: 0.85 })
  win.circle(38, -34, 20).fill({ color: COLORS.yellow, alpha: 0.9 }) // sol
  win.rect(-4, -60, 8, 120).fill(0xcbb391) // spröjs
  win.rect(-72, -6, 144, 8).fill(0xcbb391)
  win.position.set(252, 152)
  win.eventMode = 'none'
  view.addChild(win)

  // --- Hylla med badgrejer uppe till höger ---
  const shelf = new Graphics()
  shelf.roundRect(-72, 24, 144, 12, 6).fill(0xd8c2a3)
  shelf.roundRect(-56, -18, 26, 42, 7).fill(COLORS.teal).stroke({ width: 3, color: 0x3fa8a3 })
  shelf.roundRect(-50, -30, 14, 14, 4).fill(0x3fa8a3)
  shelf.roundRect(-18, -8, 22, 32, 6).fill(COLORS.pink).stroke({ width: 3, color: 0xe87da8 })
  shelf.roundRect(-12, -20, 10, 14, 3).fill(0xe87da8)
  shelf.roundRect(16, -24, 30, 48, 8).fill(0xfff0c2).stroke({ width: 3, color: 0xe0c877 })
  shelf.circle(31, -8, 8).fill({ color: 0xe0c877, alpha: 0.7 })
  shelf.position.set(1010, 176)
  shelf.eventMode = 'none'
  view.addChild(shelf)

  // --- Spegel + handfat till vänster (barnen står framför) ---
  const mirror = new Graphics()
  mirror.roundRect(-64, -82, 128, 156, 24).fill(0xe6d3b8).stroke({ width: 6, color: 0xcbb391 })
  mirror.roundRect(-50, -68, 100, 128, 16).fill(0xd6eef8)
  // Spegelbild: en aning av kakelvägg + ljusstrimma.
  mirror.roundRect(-50, 6, 100, 54, 16).fill({ color: 0xbfe2f0, alpha: 0.9 })
  mirror.moveTo(-38, 54).lineTo(8, -60).lineTo(30, -60).lineTo(-16, 54).closePath().fill({ color: 0xffffff, alpha: 0.6 })
  mirror.position.set(78, 320)
  mirror.eventMode = 'none'
  view.addChild(mirror)

  const sink = new Graphics()
  // kran + rör
  sink.roundRect(-6, -74, 12, 46, 5).fill(0xc3d3db)
  sink.moveTo(-4, -74).quadraticCurveTo(30, -80, 34, -46).stroke({ width: 11, color: 0xc3d3db, cap: 'round' })
  // fot
  sink.roundRect(-16, 6, 32, 74, 12).fill(0xf3f9fb).stroke({ width: 4, color: 0xcdd9df })
  // skål
  sink.roundRect(-72, -30, 144, 44, 16).fill(0xffffff).stroke({ width: 4, color: 0xcdd9df })
  sink.ellipse(0, -30, 62, 13).fill(0xe6f2f7)
  sink.position.set(78, 500)
  sink.eventMode = 'none'
  view.addChild(sink)

  // --- Handdukshängare ---
  const towels = new Container()
  const rail = new Graphics().roundRect(-92, -8, 184, 12, 6).fill(0xc3d3db)
  towels.addChild(rail)
  const mk = (x, col, dark) => {
    const t = new Graphics()
    t.roundRect(x - 34, -2, 68, 104, 12).fill(col).stroke({ width: 4, color: dark })
    t.rect(x - 34, 44, 68, 12).fill({ color: dark, alpha: 0.65 })
    t.rect(x - 34, 66, 68, 8).fill({ color: 0xffffff, alpha: 0.45 })
    return t
  }
  towels.addChild(mk(-44, COLORS.pink, 0xe87da8), mk(44, COLORS.teal, 0x3fa8a3))
  towels.position.set(430, 250)
  towels.eventMode = 'none'
  view.addChild(towels)

  // --- Toarullehållare (väggfäste + rulle med hängande ark) ---
  const roll = new Container()
  // Fäste som tydligt sitter i väggen till vänster om rullen.
  const holder = new Graphics()
  holder.roundRect(-52, -10, 18, 44, 7).fill(0x9db8c4).stroke({ width: 3, color: 0x7d97a3 })
  holder.roundRect(-42, 8, 46, 10, 5).fill(0xa9c2cd)
  const paper = new Graphics()
  // Hängande ark bakom rullen, med sågtandad avrivningskant.
  paper.moveTo(14, 14).lineTo(46, 16).lineTo(45, 84).lineTo(36, 94).lineTo(28, 84).lineTo(20, 94).lineTo(13, 84).closePath()
    .fill(0xf2f8fb)
    .stroke({ width: 4, color: 0x9db8c4 })
  paper.moveTo(18, 40).lineTo(42, 42).stroke({ width: 3, color: 0xcfe0e8 })
  paper.moveTo(18, 62).lineTo(42, 64).stroke({ width: 3, color: 0xcfe0e8 })
  // Själva rullen: tydlig kontur + brun papphylsa.
  paper.circle(0, 16, 30).fill(0xf2f8fb).stroke({ width: 5, color: 0x9db8c4 })
  paper.circle(0, 16, 19).stroke({ width: 3, color: 0xcfe0e8 })
  paper.circle(0, 16, 11).fill(0xdcaf7a).stroke({ width: 3, color: 0xb98d5c })
  roll.addChild(paper, holder)
  roll.position.set(760, 332)
  roll.eventMode = 'none'
  view.addChild(roll)

  // --- Badmatta framför barnen ---
  const mat = new Graphics()
  mat.roundRect(-130, -13, 260, 26, 13).fill(0xffd9ea).stroke({ width: 4, color: 0xf0aecb })
  for (let i = -120; i <= 120; i += 24) mat.rect(i, -6, 10, 12).fill({ color: 0xf0aecb, alpha: 0.55 })
  mat.position.set(210, 622)
  mat.eventMode = 'none'
  view.addChild(mat)

  // --- Nyfiken katt (djur => inget namnkrav) ---
  const cat = makeCat()
  cat.position.set(392, 598)
  view.addChild(cat)

  return { view, tiles, cat }
}

// Liten sittande katt sedd framifrån. Origo = tassarna (står på golvet).
function makeCat() {
  const c = new Container()
  c.eventMode = 'none'
  const fur = 0x9aa7b4
  const furDark = 0x7d8b99

  const tail = new Graphics()
  tail.moveTo(0, 0).quadraticCurveTo(34, -6, 30, -44).stroke({ width: 13, color: fur, cap: 'round' })
  tail.position.set(20, -12)
  tail.pivot.set(0, 0)
  c.addChild(tail)

  const g = new Graphics()
  // kropp
  g.moveTo(-26, 0).quadraticCurveTo(-30, -56, 0, -58).quadraticCurveTo(30, -56, 26, 0).closePath().fill(fur)
  // framtassar
  g.roundRect(-20, -12, 16, 12, 6).fill(furDark)
  g.roundRect(4, -12, 16, 12, 6).fill(furDark)
  // huvud
  g.circle(0, -74, 25).fill(fur)
  // öron
  g.moveTo(-22, -88).lineTo(-14, -108).lineTo(-4, -90).closePath().fill(fur)
  g.moveTo(22, -88).lineTo(14, -108).lineTo(4, -90).closePath().fill(fur)
  g.moveTo(-18, -90).lineTo(-14, -101).lineTo(-8, -91).closePath().fill(COLORS.pink)
  g.moveTo(18, -90).lineTo(14, -101).lineTo(8, -91).closePath().fill(COLORS.pink)
  // ansikte
  g.circle(-9, -78, 3.5).fill(0x2f2018)
  g.circle(9, -78, 3.5).fill(0x2f2018)
  g.moveTo(-3, -69).lineTo(3, -69).lineTo(0, -65).closePath().fill(COLORS.pink)
  g.moveTo(-14, -62).quadraticCurveTo(0, -56, 14, -62).stroke({ width: 2.5, color: 0x2f2018, cap: 'round' })
  c.addChild(g)

  c.tail = tail
  return c
}

// En glad potta/toalett sedd snett framifrån. Origo = skålöppningens mitt (0,0),
// foten slutar på y = PED_H så toaletten alltid kan ställas PÅ golvet.
function makeToilet(scale = 1) {
  const c = new Container()
  c.scale.set(scale)
  const white = 0xffffff
  const edge = 0xcdd9df
  const water = 0x9fd6e8

  // Golvskugga så toaletten står, inte svävar.
  const shade = new Graphics().ellipse(0, PED_H - 4, 74, 13).fill({ color: 0x000000, alpha: 0.12 })

  // Spollåda + rygg som binder ihop lådan med skålen (inget svävande block).
  const back = new Graphics()
  back.roundRect(-46, -46, 92, 62, 12).fill(0xf3f9fb).stroke({ width: 4, color: edge })
  const tank = new Graphics().roundRect(-72, -150, 144, 108, 18).fill(white).stroke({ width: 4, color: edge })
  tank.roundRect(-58, -138, 116, 26, 10).fill({ color: 0xeaf4f8, alpha: 0.9 })

  // Pelare/fot ner mot golvet.
  const ped = new Graphics()
    .moveTo(-58, 18)
    .lineTo(58, 18)
    .lineTo(48, PED_H)
    .lineTo(-48, PED_H)
    .closePath()
    .fill(white)
    .stroke({ width: 4, color: edge })
  ped.roundRect(-54, PED_H - 12, 108, 14, 7).fill(0xf0f6f9).stroke({ width: 3, color: edge })

  // Sits (vit ellips).
  const seat = new Graphics().ellipse(0, 0, 92, 40).fill(white).stroke({ width: 5, color: edge })
  // Hål med vatten.
  const hole = new Graphics().ellipse(0, 6, 62, 25).fill(water)
  hole.ellipse(0, 6, 62, 25).stroke({ width: 3, color: 0x7cc0d6 })
  // Liten glansprick i vattnet.
  const gloss = new Graphics().ellipse(-22, 0, 14, 6).fill({ color: white, alpha: 0.5 })

  c.addChild(shade, back, tank, ped, seat, hole, gloss)
  return c
}

// Spol-knopp: en grön spol-platta med stort osynligt träffområde (radie 58 = 116px,
// väl över 96px-kravet). Egen interaktiv container; håll dess skala = 1.
// Glow-ringen tänds som belöning efter en full potta.
function makeFlushKnob() {
  const c = new Container()
  c.eventMode = 'static'
  c.cursor = 'pointer'
  c.hitArea = new Circle(0, 0, 58)
  // Osynlig träff-halo (säkrar pekytan även mellan grafikens kanter).
  const halo = new Graphics().circle(0, 0, 58).fill({ color: 0xffffff, alpha: 0.001 })
  halo.eventMode = 'none'
  // Inbjudande glow-ring (dold tills pottan är full).
  const glow = new Graphics().circle(0, 0, 40).stroke({ width: 7, color: COLORS.yellow, alpha: 0.95 })
  glow.eventMode = 'none'
  glow.visible = false
  // Synlig spol-platta + tryck-prick.
  const plate = new Graphics()
    .roundRect(-32, -17, 64, 34, 14)
    .fill(0x6fbf73)
    .stroke({ width: 4, color: 0x3f9a4a })
    .circle(0, 0, 9)
    .fill({ color: 0xffffff, alpha: 0.92 })
  plate.eventMode = 'none'
  c.addChild(halo, glow, plate)
  c.glow = glow
  return c
}

// Ritad vindvirvel — tre böjda pruttdrag i stället för en emoji.
function makeWindSwirl() {
  const c = new Container()
  c.eventMode = 'none'
  const g = new Graphics()
  const puffs = [
    { y: -26, len: 74, curl: 15 },
    { y: 0, len: 104, curl: 19 },
    { y: 26, len: 62, curl: 13 },
  ]
  for (const p of puffs) {
    g.moveTo(-p.len / 2, p.y)
      .quadraticCurveTo(0, p.y - 12, p.len / 2 - p.curl, p.y)
      .stroke({ width: 8, color: 0x8fd6cf, alpha: 0.9, cap: 'round' })
    arcPath(g, p.len / 2 - p.curl, p.y + p.curl * 0.75, p.curl, -Math.PI * 0.55, Math.PI * 0.85).stroke({ width: 8, color: 0x8fd6cf, alpha: 0.9, cap: 'round' })
  }
  c.addChild(g)
  return c
}

// Pott-mätaren: en riktig barnpotta med ryggstöd och ansikte (INTE en kastrull — därför
// inget sidohandtag). Returnerar munnen separat så den kan ritas om bredare ju fullare
// pottan blir.
function makePotty() {
  const view = new Container()
  view.eventMode = 'none'
  const body = 0xb9a6f5
  const light = 0xd3c6fb
  const dark = 0x8a72d8

  const g = new Graphics()
  // Ryggstöd bakom sitsen (den detalj som gör den till en potta).
  g.roundRect(-38, -54, 76, 46, 16).fill(light).stroke({ width: 4, color: dark })
  // Tapetserad tratt-formad tub.
  g.moveTo(-64, -12).lineTo(64, -12).lineTo(48, 42).quadraticCurveTo(0, 52, -48, 42).closePath().fill(body).stroke({ width: 4, color: dark })
  // Sits/kant + hål.
  g.ellipse(0, -12, 70, 21).fill(light).stroke({ width: 4, color: dark })
  g.ellipse(0, -10, 53, 13).fill({ color: 0x5b4a8c, alpha: 0.35 })
  // Glad pott-min på framsidan.
  g.circle(-21, 16, 5.5).fill(COLORS.ink)
  g.circle(21, 16, 5.5).fill(COLORS.ink)
  view.addChild(g)

  const mouth = new Graphics()
  view.addChild(mouth)
  drawPottyMouth(mouth, 0)

  return { view, mouth }
}

function drawPottyMouth(g, fill) {
  if (!g || g.destroyed) return
  const r = 9 + fill * 10
  g.clear()
  arcPath(g, 0, 20, r, 0.12 * Math.PI, 0.88 * Math.PI).stroke({ width: 4, color: COLORS.ink, cap: 'round' })
}

// Spolbara busgäster — ritade föremål (och maskoten Bobo), aldrig en emoji.
function makeGuest(kind) {
  const c = new Container()
  c.eventMode = 'none'
  const g = new Graphics()

  if (kind === 'anka') {
    g.ellipse(0, 12, 40, 28).fill(COLORS.yellow).stroke({ width: 4, color: 0xe0a92e })
    g.moveTo(24, 2).quadraticCurveTo(52, -6, 40, 18).closePath().fill(0xf2c53d) // stjärt
    g.circle(-16, -22, 24).fill(COLORS.yellow).stroke({ width: 4, color: 0xe0a92e })
    g.moveTo(-38, -18).quadraticCurveTo(-58, -12, -36, -6).closePath().fill(COLORS.orange) // näbb
    g.circle(-10, -28, 4.5).fill(0x2f2018)
    g.ellipse(4, 14, 16, 11).fill({ color: 0xf2c53d, alpha: 0.9 }) // vinge
  } else if (kind === 'strumpa') {
    g.moveTo(-16, -44).lineTo(18, -44).lineTo(18, 16).quadraticCurveTo(18, 40, -6, 40).lineTo(-40, 40).quadraticCurveTo(-52, 30, -40, 16).lineTo(-16, 16).closePath()
      .fill(0xffffff)
      .stroke({ width: 4, color: 0xcdd9df })
    g.rect(-16, -38, 34, 10).fill(COLORS.red)
    g.rect(-16, -22, 34, 10).fill(COLORS.blue)
    g.moveTo(-40, 22).lineTo(-6, 22).lineTo(-6, 32).lineTo(-40, 32).closePath().fill({ color: COLORS.red, alpha: 0.8 })
  } else if (kind === 'bil') {
    g.roundRect(-44, -6, 88, 30, 10).fill(COLORS.red).stroke({ width: 4, color: 0xc9484c })
    g.moveTo(-26, -6).lineTo(-14, -32).lineTo(20, -32).lineTo(30, -6).closePath().fill(0xff8f8f).stroke({ width: 4, color: 0xc9484c })
    g.roundRect(-12, -28, 28, 18, 5).fill(0xdff1f8)
    g.circle(-24, 26, 13).fill(0x3a3a3a)
    g.circle(24, 26, 13).fill(0x3a3a3a)
    g.circle(-24, 26, 5).fill(0xbfc7cc)
    g.circle(24, 26, 5).fill(0xbfc7cc)
  } else {
    c.addChild(makeMascotHead(38))
    return c
  }

  c.addChild(g)
  return c
}

// Bobo-huvud i miniatyr (samma ansikte som maskoten, ritat lokalt så gästen kan
// snurra fritt i virveln utan att dra in hela mascot-modulens layout).
function makeMascotHead(r) {
  const c = new Container()
  c.eventMode = 'none'
  const g = new Graphics()
  g.circle(-r * 0.78, -r * 0.78, r * 0.32).fill(COLORS.cream)
  g.circle(r * 0.78, -r * 0.78, r * 0.32).fill(COLORS.cream)
  g.circle(0, r * 0.06, r).fill(COLORS.orangeDark)
  g.circle(0, 0, r).fill(COLORS.cream)
  g.circle(-r * 0.56, r * 0.22, r * 0.18).fill(COLORS.pink)
  g.circle(r * 0.56, r * 0.22, r * 0.18).fill(COLORS.pink)
  g.circle(-r * 0.36, -r * 0.12, r * 0.13).fill(COLORS.ink)
  g.circle(r * 0.36, -r * 0.12, r * 0.13).fill(COLORS.ink)
  arcPath(g, 0, r * 0.05, r * 0.42, 0.12 * Math.PI, 0.88 * Math.PI).stroke({ width: r * 0.1, color: COLORS.ink, cap: 'round' })
  c.addChild(g)
  return c
}

// Söt unge (programmatisk). kind: 'elvira' (rosett + tofsar) | 'zacke' (keps).
// Ansiktet ligger i en egen Graphics (c.face) som ritas om per känsla.
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

  // Huvud (ansiktet ritas separat ovanpå).
  const head = new Graphics().circle(0, -56, 34).fill(skin)
  c.addChild(head)
  const face = new Graphics()
  face.eventMode = 'none'
  c.addChild(face)
  drawKidFace(face, 'glad')

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

  c.face = face
  return c
}

// Fyra riktiga miner i stället för flytande emoji-bubblor:
// glad (vila) · wow (korven flyger) · jubel (plopp!) · fniss (miss).
function drawKidFace(g, mood) {
  if (!g || g.destroyed) return
  const ink = 0x3a2a1a
  const cheek = { color: 0xffb0b0, alpha: 0.7 }
  g.clear()

  if (mood === 'wow') {
    g.circle(-12, -58, 7).fill(0xffffff).circle(12, -58, 7).fill(0xffffff)
    g.circle(-12, -58, 4).fill(ink).circle(12, -58, 4).fill(ink)
    g.circle(-22, -47, 7).fill(cheek).circle(22, -47, 7).fill(cheek)
    g.ellipse(0, -44, 7, 9).fill(0x9a5b3b) // öppen "ooo"-mun
    return
  }

  if (mood === 'jubel') {
    // Blundande glädjeögon (uppåtbågar) + stort skratt.
    arcPath(g, -12, -58, 8, Math.PI, 2 * Math.PI).stroke({ width: 4, color: ink, cap: 'round' })
    arcPath(g, 12, -58, 8, Math.PI, 2 * Math.PI).stroke({ width: 4, color: ink, cap: 'round' })
    g.circle(-23, -46, 8).fill(cheek).circle(23, -46, 8).fill(cheek)
    g.moveTo(-16, -46).quadraticCurveTo(0, -26, 16, -46).closePath().fill(0x9a5b3b)
    g.moveTo(-9, -36).quadraticCurveTo(0, -28, 9, -36).closePath().fill(COLORS.pink) // tunga
    return
  }

  if (mood === 'fniss') {
    // Kisande fniss-ögon + snett leende.
    g.moveTo(-19, -59).lineTo(-5, -56).stroke({ width: 4, color: ink, cap: 'round' })
    g.moveTo(5, -56).lineTo(19, -59).stroke({ width: 4, color: ink, cap: 'round' })
    g.circle(-22, -46, 8).fill(cheek).circle(22, -46, 8).fill(cheek)
    g.moveTo(-12, -48).quadraticCurveTo(0, -38, 14, -50).stroke({ width: 4, color: 0x9a5b3b, cap: 'round' })
    return
  }

  // glad (vila)
  g.circle(-12, -58, 4).fill(ink)
  g.circle(12, -58, 4).fill(ink)
  g.circle(-20, -48, 6).fill(cheek)
  g.circle(20, -48, 6).fill(cheek)
  arcPath(g, 0, -50, 13, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 4, color: 0x9a5b3b, cap: 'round' })
}
