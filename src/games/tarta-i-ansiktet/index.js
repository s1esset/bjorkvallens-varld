// Tårta i Ansiktet — ren slapstick-glädje (3–5 år). Alissa, en stor, skrattande clown,
// står på scenen; längst ner väntar en gräddtårta. Barnet DRAR tårtan och SLÄPPER
// med fart (flick) — den flyger i en fysik-båge mot ansiktet och PLASKAR: grädde-splat,
// fnitter, konfetti och en glad studs. När ansiktet blir kladdigt dyker en SVAMP upp:
// barnet drar svampen fram och tillbaka över ansiktet och grädden torkas bort där
// svampen gnuggar (skrubba-rent). Inga felsteg, ingen timer, inget slut. En svag flick
// når ändå fram (mjuk auto-hjälp) och torkningen blir alltid klar. Efter några tårtor
// firar vi (delat firande + stjärna + klistermärke) och en ny, fräsch runda börjar.
// Allt ritas programmatiskt (Pixi Graphics) — inga externa assets.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { puff, pop, wiggle, bounceIn, sparkle , kvittera} from '../../lib/feedback.js'
import { COLORS, PLAYFUL } from '../../lib/theme.js'
import { makeMascot } from '../../lib/mascot.js'
import { randomFrom } from '../../lib/swedish.js'

// Tårtsorter — projektilen roterar, och splatten får sortens färg. Förut var det
// alltid samma gräddtårta och alltid vita klumpar: träff sex såg ut som träff ett.
const PIES = [
  { name: 'gradde', base: 0xc98a5a, baseEdge: 0xa9703f, cream: 0xffffff, creamEdge: 0xeaf2f6, top: 0xff6b6b },
  { name: 'choklad', base: 0x6b4326, baseEdge: 0x462a17, cream: 0x8a5a3b, creamEdge: 0x5e3720, top: 0xffd35c },
  { name: 'blabar', base: 0xd9c3a5, baseEdge: 0xb59d7d, cream: 0x8f8ae0, creamEdge: 0x5f59b8, top: 0x4a3f8a },
  { name: 'jordgubb', base: 0xe8d3b0, baseEdge: 0xc0a980, cream: 0xff9ec4, creamEdge: 0xe0709b, top: 0xe8354b },
]

const FACE_X = 640 // clownens ansikte (mitt-x) i designkoordinater
const FACE_Y = 300
const CAKE_X = 640 // tårtans viloplats (brickan)
const CAKE_Y = 620
const MAX_LEVEL = 3 // mjuk tak: håller rundan kort (max 6 tårtor) så den aldrig tjatar
const MAX_CREAM = 16 // cappa grädde-klumpar så ansiktet inte växer i oändlighet

// Flick-fysik (designkoordinater, px och px/s). Tårtan integreras i tickern med en
// enkel gravitation + mjuk styrning mot ansiktet så den ALLTID når fram (no-fail).
const GRAVITY = 1300 // px/s² nedåt under flygning
const STEER = 26 // styrkraft mot ansiktet (garanterar träff, även vid sned flick)
const DAMP = 3 // dämpning så tårtan inte kretsar runt ansiktet
const FLICK_MIN = 300 // px/s — under detta räknas släppet inte som en flick
const FLICK_MAX = 1700 // px/s — cappa farten så tårtan inte skjuter förbi
const VEL_WINDOW = 90 // ms — fönster som flick-hastigheten mäts över

// Svampens viloplats (nere till höger, stor träffyta).
const SPONGE_HOME_X = 1130
const SPONGE_HOME_Y = 600
const WIPE_RADIUS = 70 // hur långt svampen torkar runt sin mitt
const RUB_PER_TOUCH = 0.12 // hur mycket en klump rensas per gnugg-bildruta (skrubba-rent)

// Korta, busiga ropp vid varje träff (slumpas, aldrig samma tjat).
const SPLATS = ['Plask!', 'Mums!', 'Hihi!', 'Pang!', 'En till!', 'Oj då!', 'Kladd!']

// Antal tårtor per runda (växer mjukt med nivån, alltid 3–6).
function throwsForLevel(level) {
  return Math.max(3, Math.min(6, 3 + level))
}

export default {
  id: 'tarta-i-ansiktet',
  titleSv: 'Tårta i Ansiktet',
  icon: '🎂',
  category: 'roligt',
  input: 'mixed',
  ageRange: [3, 5],
  bundle: 'tarta-i-ansiktet',
  voiceIntro: 'Dra tårtan och släpp — kasta den i ansiktet på Alissa!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._resolving = false // sant under flygning + firande -> ignorera nya kast
    this._holding = false // sant medan tårtan hålls/dras
    this._flying = false // sant medan tårtan flyger (integreras i tickern)
    this._cakeVel = { x: 0, y: 0 }
    this._flightElapsed = 0
    this._vSamples = [] // peksamplingar {x,y,t} för att mäta flick-hastighet
    this._rubCount = 0 // räknare för att stryppa gnugg-ljud
    this._splats = 0 // antal grädde-lager på ansiktet just nu
    this._throws = 0 // kast i den pågående rundan
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._perRound = throwsForLevel(this._level)
    this._total = ctx.progress.get().custom?.tartor || 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund: fångar "tomt tryck" -> lekfull vingel + mjukt ljud (aldrig fel).
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(COLORS.bg)
    bg.eventMode = 'static'
    bg.on('pointertap', () => this._emptyTap(ctx))
    this._root.addChild(bg)

    // Dekor: scengolv + RIKTIGA ridåer. De två platta röda rektanglarna läste som
    // en trasig ram, inte som en scen.
    const decor = new Graphics()
    // Scengolv med kantlist.
    decor.rect(0, 560, ctx.width, 160).fill(0xe8d9bf)
    decor.rect(0, 560, ctx.width, 14).fill(0xcbb392)
    for (let i = 0; i < 16; i++) decor.rect(i * 80 + 4, 574, 4, 146).fill({ color: 0xcbb392, alpha: 0.5 })
    // Ridåveck i sidorna.
    const curtain = (x0, dir) => {
      for (let i = 0; i < 4; i++) {
        const w = 30
        const cx = x0 + dir * i * w
        decor.moveTo(cx, 0)
          .quadraticCurveTo(cx + dir * w * 0.6, ctx.height * 0.5, cx, ctx.height)
          .lineTo(cx + dir * w, ctx.height)
          .quadraticCurveTo(cx + dir * w * 1.6, ctx.height * 0.5, cx + dir * w, 0)
          .closePath()
          .fill(i % 2 ? 0xc9424f : 0xe05563)
      }
      // Guldsnodd som håller upp ridån.
      decor.ellipse(x0 + dir * 58, 300, 22, 13).fill(0xe8c05a)
      decor.circle(x0 + dir * 58, 316, 9).fill(0xd9a12c)
    }
    curtain(0, 1)
    curtain(ctx.width, -1)
    // Kappa längs överkanten med tofsar.
    decor.rect(0, 0, ctx.width, 54).fill(0xc9424f)
    for (let i = 0; i <= 16; i++) {
      decor.moveTo(i * 80, 54).quadraticCurveTo(i * 80 + 40, 92, i * 80 + 80, 54).closePath().fill(0xe05563)
      decor.circle(i * 80 + 40, 88, 7).fill(0xe8c05a)
    }
    decor.eventMode = 'none'
    decor.interactiveChildren = false
    this._root.addChild(decor)

    // Publik på scengolvet: Bobo och Zacke ser på och jublar när tårtan träffar.
    this._audience = []
    for (const [ax, kind] of [[176, 'bobo'], [1104, 'zacke']]) {
      const v = kind === 'bobo' ? makeMascot(44) : makeAudienceZacke()
      v.position.set(ax, kind === 'bobo' ? 606 : 596)
      v.eventMode = 'none'
      this._root.addChild(v)
      this._audience.push({ view: v, baseY: v.y })
    }

    this._buildClown(ctx)
    this._buildCake(ctx)
    this._buildDots(ctx)
    this._buildSponge(ctx)

    // Bundna peklyssnare för dra/släpp (flick) på tårtan (av/på vid varje gest).
    this._cakeDown = (e) => this._onCakeDown(ctx, e)
    this._cakeMove = (e) => this._onCakeMove(e)
    this._cakeUp = () => this._onCakeUp(ctx)
    this._cake.on('pointerdown', this._cakeDown)

    this._scheduleBlink() // Alissa blinkar lite då och då (levande ansikte)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Scenbyggen ---------------------------------------------------------

  // Glad clown av Pixi Graphics. Hela containern är EN stor träffyta (r=170)
  // så även de minsta kan "kasta" genom att trycka på clownen.
  _buildClown(ctx) {
    const c = new Container()
    c.position.set(FACE_X, FACE_Y)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Circle(0, 0, 170)
    c.on('pointertap', () => this._onClownTap(ctx))
    this._clown = c

    // Hår (bakom huvudet).
    const hair = new Graphics().circle(-128, -38, 70).fill(COLORS.red).circle(128, -38, 70).fill(COLORS.red)
    hair.eventMode = 'none'

    // Huvud.
    const head = new Graphics().circle(0, 0, 150).fill(0xfff0e0).stroke({ width: 8, color: 0xe8c9b0 })
    head.eventMode = 'none'

    // Ansikte: rosa kinder (statiska) + SEPARATA ögon/mun/näsa så Alissa kan REAGERA
    // (ögonen följer tårtan, knips ihop och munnen blir ett förvånat "O" vid träff).
    const face = new Graphics()
    face.circle(-95, 35, 26).fill({ color: COLORS.pink, alpha: 0.75 })
    face.circle(95, 35, 26).fill({ color: COLORS.pink, alpha: 0.75 })
    face.eventMode = 'none'

    this._eyeL = this._makeClownEye(-58, -45)
    this._eyeR = this._makeClownEye(58, -45)
    this._mouth = new Graphics()
    this._mouth.eventMode = 'none'
    this._drawClownMouthOn(this._mouth, 'smile')
    const nose = new Graphics().circle(0, 25, 36).fill(COLORS.red)
    nose.eventMode = 'none'

    // Hatt (liten kon + pompom ovanpå huvudet).
    const hatColor = randomFrom(PLAYFUL)
    const hat = new Graphics()
    hat.ellipse(0, -148, 96, 20).fill(0x5a3a8a)
    hat.moveTo(-58, -150).lineTo(58, -150).lineTo(0, -238).closePath().fill(hatColor)
    hat.circle(0, -240, 22).fill(COLORS.yellow)
    hat.eventMode = 'none'

    // Grädde-lager (på ansiktet, men under svampen). Lokala koordinater.
    this._splatLayer = new Container()
    this._splatLayer.eventMode = 'none'

    c.addChild(hair, head, face, this._eyeL, this._eyeR, this._mouth, nose, hat, this._splatLayer)
    this._root.addChild(c)
  },

  // Ett clown-öga: vit boll + rörlig pupill (följer tårtan). Skalas i y för blink/knip.
  _makeClownEye(x, y) {
    const e = new Container()
    e.position.set(x, y)
    e.eventMode = 'none'
    const w = new Graphics().circle(0, 0, 28).fill(0xffffff).stroke({ width: 3, color: 0x33271f })
    const pupil = new Graphics().circle(0, 0, 13).fill(0x33271f)
    w.eventMode = 'none'
    pupil.eventMode = 'none'
    e.addChild(w, pupil)
    e._pupil = pupil
    return e
  },

  // Mun: brett leende eller förvånat "O".
  _drawClownMouthOn(m, mode) {
    if (!m || m.destroyed) return
    m.clear()
    if (mode === 'o') {
      m.circle(0, 74, 34).fill(0x7a2b22)
      m.circle(0, 86, 13).fill(COLORS.red)
    } else {
      // moveTo till bågens startpunkt först — annars drar arc() en kil från (0,0).
      m.moveTo(60 * Math.cos(0.08 * Math.PI), 60 + 60 * Math.sin(0.08 * Math.PI))
      m.arc(0, 60, 60, 0.08 * Math.PI, 0.92 * Math.PI).fill(0x7a2b22)
      m.circle(0, 104, 22).fill(COLORS.red)
    }
  },

  // Pupillerna följer en punkt (tårtan) under flygningen — ger "hon ser den komma".
  _lookAt(x, y) {
    const dx = x - FACE_X
    const dy = y - FACE_Y
    const d = Math.hypot(dx, dy) || 1
    const off = Math.min(10, d / 22)
    for (const e of [this._eyeL, this._eyeR]) {
      if (e && e._pupil && !e._pupil.destroyed) e._pupil.position.set((dx / d) * off, (dy / d) * off)
    }
  },

  // Träff-reaktion: ögonen knips + munnen blir ett "O", återgår sen till leendet.
  // Publiken (Bobo + Zacke) hoppar till av skratt när tårtan landar.
  _audienceCheer() {
    for (const a of this._audience || []) {
      const v = a.view
      if (!v || v.destroyed) continue
      gsap.killTweensOf(v)
      gsap.to(v, {
        y: a.baseY - 28, duration: 0.2, yoyo: true, repeat: 3, ease: 'power2.out',
        onComplete: () => { if (!v.destroyed) v.y = a.baseY },
      })
    }
  },

  _faceSplat() {
    this._drawClownMouthOn(this._mouth, 'o')
    for (const e of [this._eyeL, this._eyeR]) {
      if (!e || e.destroyed) continue
      gsap.killTweensOf(e.scale)
      e.scale.set(1)
      gsap.to(e.scale, { y: 0.2, duration: 0.09, yoyo: true, repeat: 1, ease: 'power2.inOut' })
      if (e._pupil && !e._pupil.destroyed) e._pupil.position.set(0, 0)
    }
    this._faceTimer?.kill()
    this._faceTimer = gsap.delayedCall(0.55, () => {
      if (this._alive) this._drawClownMouthOn(this._mouth, 'smile')
    })
  },

  _scheduleBlink() {
    this._blinkTimer?.kill()
    this._blinkTimer = gsap.delayedCall(2 + Math.random() * 3, () => {
      if (!this._alive) return
      this._blink()
      this._scheduleBlink()
    })
  },

  _blink() {
    for (const e of [this._eyeL, this._eyeR]) {
      if (!e || e.destroyed) continue
      gsap.killTweensOf(e.scale)
      e.scale.set(1)
      gsap.to(e.scale, { y: 0.14, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.inOut' })
    }
  },

  // Gräddtårta på brickan: tårtbotten + grädde + körsbär. Generös träffyta r=90.
  _buildCake() {
    const cake = new Container()
    cake.position.set(CAKE_X, CAKE_Y)
    this._pieIdx = (Math.random() * PIES.length) | 0
    const g = new Graphics()
    g.eventMode = 'none'
    this._cakeG = g
    this._drawCake()
    cake.addChild(g)
    cake.hitArea = new Circle(0, 0, 90)
    cake.eventMode = 'static'
    cake.cursor = 'pointer'
    this._cake = cake
    this._root.addChild(cake)
  },

  // Svamp: dras fram och tillbaka över ansiktet för att torka bort grädden. Stor
  // träffyta (r=84) och stor kropp (>=96px). Visas först när ansiktet blivit kladdigt.
  _buildSponge(ctx) {
    const s = new Container()
    s.position.set(SPONGE_HOME_X, SPONGE_HOME_Y)
    const g = new Graphics()
    g.ellipse(0, 54, 60, 12).fill({ color: COLORS.shadow, alpha: 0.12 }) // skugga
    g.roundRect(-66, -46, 132, 92, 22).fill(0xffd24a).stroke({ width: 5, color: 0xe8a92e }) // svampkropp
    g.roundRect(-66, -46, 132, 34, 22).fill(0xeaf6ff) // ljus skumkant upptill
    for (const [hx, hy, hr] of [[-30, 18, 9], [6, 28, 7], [34, 8, 8], [-8, 4, 6], [40, 30, 6]]) {
      g.circle(hx, hy, hr).fill({ color: 0xe8a92e, alpha: 0.6 }) // hål i svampen
    }
    g.eventMode = 'none'
    s.addChild(g)
    s.hitArea = new Circle(0, 0, 84)
    s.cursor = 'pointer'
    s.eventMode = 'none' // aktiveras vid _showSponge
    s.visible = false
    this._sponge = s

    this._spongeDown = (e) => this._onSpongeDown(ctx, e)
    this._spongeMove = (e) => this._onSpongeMove(ctx, e)
    this._spongeUp = () => this._onSpongeUp(ctx)
    s.on('pointerdown', this._spongeDown)
    this._root.addChild(s)
  },

  // Räknar-prickar (en per tårta i rundan) — visuell progress utan läsning.
  _buildDots(ctx) {
    if (!this._hud) {
      this._hud = new Container()
      this._hud.eventMode = 'none'
      this._root.addChild(this._hud)
    }
    this._hud.removeChildren().forEach((d) => {
      gsap.killTweensOf(d)
      d.destroy()
    })
    this._dots = []
    const n = this._perRound
    const gap = 48
    const startX = ctx.width / 2 - ((n - 1) * gap) / 2
    for (let i = 0; i < n; i++) {
      const d = new Graphics()
      d.position.set(startX + i * gap, 72)
      d.eventMode = 'none'
      this._hud.addChild(d)
      this._dots.push(d)
    }
    this._fillDots(0)
  },

  _fillDots(k) {
    for (let i = 0; i < this._dots.length; i++) {
      const d = this._dots[i].clear().circle(0, 0, 14)
      if (i < k) d.fill(PLAYFUL[i % PLAYFUL.length])
      else d.fill({ color: COLORS.inkSoft, alpha: 0.25 })
    }
  },

  // ---- Tårt-flick (dra + släpp med fart) ----------------------------------

  // Pekning på tårtan: starta gest. Omedelbar feedback (<100ms): ljud + studs.
  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e) {
    const p = e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _onCakeDown(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._idle = 0
    this._holding = true
    this._dragMoved = false
    const p = this._root.toLocal(e.global)
    this._grabDX = this._cake.x - p.x
    this._grabDY = this._cake.y - p.y
    this._startX = p.x
    this._startY = p.y
    this._vSamples = [{ x: p.x, y: p.y, t: performance.now() }]
    ctx.services.audio.sfx('tap')
    pop(this._cake)
    this._cake.on('globalpointermove', this._cakeMove)
    this._cake.on('pointerup', this._cakeUp)
    this._cake.on('pointerupoutside', this._cakeUp)
  },

  _onCakeMove(e) {
    if (!this._alive || this._resolving) return
    const p = this._root.toLocal(e.global)
    if (!this._dragMoved && Math.hypot(p.x - this._startX, p.y - this._startY) > 14) this._dragMoved = true
    if (this._dragMoved) {
      this._cake.x = p.x + this._grabDX
      this._cake.y = p.y + this._grabDY
      // Spara peksamplingar i ett kort tidsfönster -> ger flick-hastigheten vid släpp.
      const now = performance.now()
      this._vSamples.push({ x: p.x, y: p.y, t: now })
      while (this._vSamples.length > 2 && now - this._vSamples[0].t > VEL_WINDOW) this._vSamples.shift()
    }
  },

  _onCakeUp(ctx) {
    if (!this._alive) return
    this._detachCake()
    this._holding = false
    if (this._resolving) return
    if (!this._dragMoved) {
      // Ren tryckning (tap-fallback för de minsta) -> mjuk auto-flick mot ansiktet.
      const a = this._assistVel()
      this._flick(ctx, a.x, a.y)
      return
    }
    const v = this._measureFlick()
    if (v.speed >= FLICK_MIN) {
      // En riktig flick: använd dragets fart, cappad så den inte skjuter förbi.
      let vx = v.x
      let vy = v.y
      if (v.speed > FLICK_MAX) {
        vx *= FLICK_MAX / v.speed
        vy *= FLICK_MAX / v.speed
      }
      this._flick(ctx, vx, vy)
    } else if (Math.hypot(this._cake.x - FACE_X, this._cake.y - FACE_Y) < 220) {
      // Långsamt släppt nära ansiktet -> mjuk auto-flick (no-fail).
      const a = this._assistVel()
      this._flick(ctx, a.x, a.y)
    } else {
      // Långsamt släppt långt bredvid -> vänlig vingel + snäpp tillbaka (aldrig "fel").
      ctx.services.audio.sfx('soft')
      wiggle(this._cake)
      gsap.to(this._cake, { x: CAKE_X, y: CAKE_Y, rotation: 0, duration: 0.32, ease: 'back.out(1.4)' })
    }
  },

  // Mät flick-hastighet (px/s) från peksamplingarna i tidsfönstret.
  _measureFlick() {
    const s = this._vSamples
    if (!s || s.length < 2) return { x: 0, y: 0, speed: 0 }
    const a = s[0]
    const b = s[s.length - 1]
    const dt = (b.t - a.t) / 1000
    if (dt <= 0) return { x: 0, y: 0, speed: 0 }
    const vx = (b.x - a.x) / dt
    const vy = (b.y - a.y) / dt
    return { x: vx, y: vy, speed: Math.hypot(vx, vy) }
  },

  // Mjuk auto-hjälp-hastighet: riktad mot ansiktet (lite ovanför -> fin båge).
  _assistVel() {
    const dx = FACE_X - this._cake.x
    const dy = FACE_Y - 60 - this._cake.y
    const d = Math.hypot(dx, dy) || 1
    const speed = 880
    return { x: (dx / d) * speed, y: (dy / d) * speed }
  },

  // Skicka iväg tårtan i en fysik-båge. Hastigheten integreras i tickern med
  // gravitation + mjuk styrning mot ansiktet (garanterar träff). Tårtan är poolad
  // (persistent) -> vi flyttar Pixi-objektet direkt och dödar tweens i destroy.
  _flick(ctx, vx, vy) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._flying = true
    this._idle = 0
    this._flightElapsed = 0
    this._cakeVel = { x: vx, y: vy }
    const cake = this._cake
    cake.eventMode = 'none'
    gsap.killTweensOf(cake)
    gsap.killTweensOf(cake.scale)
    ctx.services.audio.sfx('whoosh')
    gsap.to(cake.scale, { x: 1.25, y: 1.25, duration: 0.5, ease: 'power1.out' })
  },

  // Ett integrationssteg av tårtans flygning (anropas från _update varje bildruta).
  _stepFlight(ctx, dt) {
    const cake = this._cake
    const vel = this._cakeVel
    this._flightElapsed += dt
    vel.y += GRAVITY * dt
    // Mjuk styrning mot ansiktet — svag i början (flicken syns), starkare med tiden
    // så tårtan ALLTID når fram, oavsett hur den kastades.
    const dx = FACE_X - cake.x
    const dy = FACE_Y - cake.y
    const dist = Math.hypot(dx, dy)
    const steer = Math.min(1, Math.max(0, (this._flightElapsed - 0.1) / 0.45))
    const pull = STEER * steer
    vel.x += dx * pull * dt
    vel.y += dy * pull * dt
    const damp = 1 - DAMP * steer * dt
    vel.x *= damp
    vel.y *= damp
    cake.x += vel.x * dt
    cake.y += vel.y * dt
    cake.rotation += vel.x * 0.0008 + 4 * dt // glad snurr i luften
    this._lookAt(cake.x, cake.y) // Alissa följer tårtan med blicken
    if (dist < 62 || this._flightElapsed > 1.5) {
      this._flying = false
      cake.x = FACE_X
      cake.y = FACE_Y - 10
      this._land(ctx)
    }
  },

  // Tryck på clownen = mjuk auto-flick av den väntande tårtan (stor träffyta).
  _onClownTap(ctx) {
    if (!this._alive || this._holding) return
    if (this._resolving) return this._kvitto(ctx)
    ctx.services.audio.sfx('tap')
    pop(this._cake)
    const a = this._assistVel()
    this._flick(ctx, a.x, a.y)
  },

  // Tomt tryck bredvid allt: lekfull vingel + mjukt ljud. Aldrig en bestraffning.
  _emptyTap(ctx) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx)
    this._idle = 0
    ctx.services.audio.sfx('soft')
    wiggle(this._cake)
  },

  _detachCake() {
    const cake = this._cake
    if (!cake) return
    cake.off('globalpointermove', this._cakeMove)
    cake.off('pointerup', this._cakeUp)
    cake.off('pointerupoutside', this._cakeUp)
  },

  // Nedslag: PLASK! grädde, partiklar, fnitter, clownen vinglar glatt.
  _land(ctx) {
    if (!this._alive) return
    this._splat(ctx)
    this._throws++
    this._total++
    ctx.progress.setCustom('tartor', this._total)
    const filled = Math.min(this._throws, this._perRound)
    this._fillDots(filled)
    if (this._dots[filled - 1]) pop(this._dots[filled - 1])

    if (this._throws >= this._perRound) {
      this._finishRound(ctx)
    } else {
      this._resetCake()
      this._resolving = false
    }
  },

  // Själva PLASK-effekten.
  _splat(ctx) {
    if (!this._alive) return
    // Riktigt plask-klipp om det finns (genereras senare via MOSS, [[real-audio-sfx]]),
    // annars en synt-"squelch" nedåt + en liten komisk boing.
    if (!ctx.services.audio.sample?.('plask')) {
      ctx.services.audio.tone({ freq: 520, dur: 0.16, type: 'sawtooth', vol: 0.16, slideTo: 90 })
      ctx.services.audio.tone({ freq: 170, dur: 0.2, type: 'sine', vol: 0.13, slideTo: 340, delay: 0.05 })
    }
    this._addCream()
    puff(ctx.fxLayer, FACE_X, FACE_Y, { count: 12, color: 0xffffff })
    this._faceSplat() // ögon knips + förvånat "O"
    this._audienceCheer() // publiken skrattar och hoppar till
    wiggle(this._clown)
    pop(this._clown)
    ctx.services.voice.say(randomFrom(SPLATS))
    this._splats++
    if (this._splats === 1) this._showSponge(ctx)
  },

  // Lägg 3–5 ojämna vita grädde-klumpar på ansiktet (cappat antal, exit-säkert).
  // Varje klump bär `_r` (radie) och `_clean` (0..1, hur bortskrubbad den är).
  _addCream() {
    const n = 3 + ((Math.random() * 3) | 0)
    for (let i = 0; i < n; i++) {
      const r = 18 + Math.random() * 22
      const ang = Math.random() * Math.PI * 2
      const dist = Math.random() * 100
      const p = PIES[this._pieIdx % PIES.length]
      const blob = new Graphics().circle(0, 0, r).fill(p.cream).stroke({ width: 3, color: p.creamEdge })
      blob.position.set(Math.cos(ang) * dist, 15 + Math.sin(ang) * dist * 0.7)
      blob.eventMode = 'none'
      blob._r = r
      blob._clean = 0
      this._splatLayer.addChild(blob)
      bounceIn(blob, { duration: 0.35 })
    }
    while (this._splatLayer.children.length > MAX_CREAM) {
      const old = this._splatLayer.children[0]
      gsap.killTweensOf(old)
      gsap.killTweensOf(old.scale)
      old.destroy()
    }
  },

  // ---- Svamp-torkning (dra svampen över ansiktet) -------------------------

  _showSponge(ctx) {
    const s = this._sponge
    if (!s) return
    s.visible = true
    s.eventMode = 'static'
    s.position.set(SPONGE_HOME_X, SPONGE_HOME_Y)
    s.scale.set(1)
    s.rotation = 0
    bounceIn(s)
    ctx.services.voice.say('Ta svampen och torka Alissa ren!')
  },

  _hideSponge() {
    const s = this._sponge
    if (!s) return
    this._detachSponge()
    gsap.killTweensOf(s)
    gsap.killTweensOf(s.scale)
    s.visible = false
    s.eventMode = 'none'
    s.scale.set(1)
    s.rotation = 0
    s.position.set(SPONGE_HOME_X, SPONGE_HOME_Y)
  },

  _onSpongeDown(ctx, e) {
    if (!this._alive || !this._sponge.visible) return
    this._idle = 0
    const s = this._sponge
    gsap.killTweensOf(s)
    gsap.killTweensOf(s.scale)
    s.scale.set(1)
    const p = this._root.toLocal(e.global)
    this._spongeDX = s.x - p.x
    this._spongeDY = s.y - p.y
    ctx.services.audio.sfx('soft')
    pop(s)
    s.on('globalpointermove', this._spongeMove)
    s.on('pointerup', this._spongeUp)
    s.on('pointerupoutside', this._spongeUp)
    this._rub(ctx)
  },

  _onSpongeMove(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    const p = this._root.toLocal(e.global)
    this._sponge.x = p.x + this._spongeDX
    this._sponge.y = p.y + this._spongeDY
    this._rub(ctx)
  },

  _onSpongeUp() {
    if (!this._alive) return
    this._detachSponge()
    // Fortfarande kladdigt? Lämna svampen där den släpptes (redo att gnugga vidare).
  },

  _detachSponge() {
    const s = this._sponge
    if (!s) return
    s.off('globalpointermove', this._spongeMove)
    s.off('pointerup', this._spongeUp)
    s.off('pointerupoutside', this._spongeUp)
  },

  // Skrubba-rent: varje grädde-klump under svampen rensas en aning per bildruta
  // (alpha + skala krymper) tills den försvinner. Exit-säkert (poolade Graphics).
  _rub(ctx) {
    const layer = this._splatLayer
    if (!layer || layer.children.length === 0) return
    const sx = this._sponge.x
    const sy = this._sponge.y
    const cx = this._clown.x // FACE_X
    const cy = this._clown.y // FACE_Y
    let wipedAny = false
    for (let i = layer.children.length - 1; i >= 0; i--) {
      const blob = layer.children[i]
      const bx = cx + blob.x
      const by = cy + blob.y
      if (Math.hypot(sx - bx, sy - by) < WIPE_RADIUS + (blob._r || 22)) {
        gsap.killTweensOf(blob.scale)
        blob._clean = (blob._clean || 0) + RUB_PER_TOUCH
        const k = Math.max(0, 1 - blob._clean)
        blob.alpha = k
        blob.scale.set(0.5 + 0.5 * k)
        wipedAny = true
        if (blob._clean >= 1) blob.destroy()
      }
    }
    if (wipedAny) {
      this._rubCount++
      if (this._rubCount % 6 === 0) ctx.services.audio.sfx('soft')
      if (Math.random() < 0.12) sparkle(ctx.fxLayer, sx, sy, { count: 4 })
    }
    if (layer.children.length === 0 && this._splats > 0) this._finishWipe(ctx)
  },

  // All grädde borttorkad -> glad belöning + dölj svampen.
  _finishWipe(ctx) {
    if (this._splats <= 0) return
    this._splats = 0
    ctx.services.audio.sfx('pling')
    ctx.services.voice.say('Nu blir Alissa ren igen!')
    pop(this._clown)
    sparkle(ctx.fxLayer, FACE_X, FACE_Y, { count: 8 })
    this._hideSponge()
  },

  // Töm grädde-lagret direkt (vid ny runda / städning) — utan belöning.
  _clearCream() {
    if (!this._splatLayer) return
    this._splatLayer.children.forEach((c) => {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
    })
    this._splatLayer.removeChildren().forEach((c) => c.destroy())
  },

  // Återställ tårtan till brickan med en glad "ny tårta"-studs.
  // Ritar den aktuella tårtsorten.
  _drawCake() {
    const g = this._cakeG
    if (!g || g.destroyed) return
    const p = PIES[this._pieIdx % PIES.length]
    g.clear()
    g.ellipse(0, 34, 82, 16).fill({ color: COLORS.shadow, alpha: 0.12 }) // mjuk skugga/fat
    g.roundRect(-70, -6, 140, 42, 12).fill(p.base).stroke({ width: 4, color: p.baseEdge }) // botten
    g.roundRect(-72, -28, 144, 28, 14).fill(p.cream).stroke({ width: 4, color: p.creamEdge }) // grädde
    g.circle(0, -34, 13).fill(p.top) // topping
  },

  _resetCake() {
    const cake = this._cake
    if (!cake) return
    // Ny sort till nästa kast → varje omgång ser ny ut.
    this._pieIdx = (this._pieIdx + 1 + ((Math.random() * (PIES.length - 1)) | 0)) % PIES.length
    this._drawCake()
    gsap.killTweensOf(cake)
    gsap.killTweensOf(cake.scale)
    cake.position.set(CAKE_X, CAKE_Y)
    cake.scale.set(1)
    cake.rotation = 0
    cake.alpha = 1
    cake.visible = true
    cake.eventMode = 'static'
    bounceIn(cake)
  },

  // ---- Runda / firande ----------------------------------------------------

  // Runda klar: extra kladdigt firande + delat firande (stjärna + klistermärke).
  // complete() sköter celebrate-ljud, beröm-röst, konfetti och stjärna -> ingen dubblering.
  _finishRound(ctx) {
    this._resolving = true
    this._flying = false
    this._idle = 0
    this._cake.visible = false
    this._level = Math.min(this._level + 1, MAX_LEVEL)
    ctx.progress.setLevel(this._level)
    ctx.progress.complete()
    // Extra "messy" guldkant: en sista skvätt grädde + gnistor + glad clown-studs.
    this._addCream()
    sparkle(ctx.fxLayer, FACE_X, FACE_Y, { count: 10 })
    pop(this._clown, { scale: 1.16 })
    this._celebrate = gsap.delayedCall(1.4, () => this._newRound(ctx))
  },

  // Ny, fräsch runda — oändlig lek, inget slutläge.
  _newRound(ctx) {
    if (!this._alive) return
    this._resolving = false
    this._throws = 0
    this._splats = 0
    this._idle = 0
    this._perRound = throwsForLevel(this._level)
    this._clearCream()
    this._hideSponge()
    this._buildDots(ctx)
    this._resetCake()
    pop(this._clown)
  },

  // Idle-recue: efter ~6s tystnad locka mjukt. Kontextkänslig: kladdigt -> torka,
  // annars -> kasta. Vid kladd ger vi även mjuk auto-hjälp (börjar torka en klump).
  _update(ctx, ticker) {
    if (!this._alive) return
    if (this._flying) {
      const dt = Math.min(0.05, ticker.deltaMS / 1000)
      this._stepFlight(ctx, dt)
      return
    }
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6 && !this._resolving) {
      this._idle = 0
      if (this._splats > 0 && this._sponge?.visible) {
        ctx.services.voice.say('Ta svampen och torka Alissa ren!')
        pop(this._sponge)
        this._autoHelpWipe(ctx) // mjuk auto-hjälp så torkningen aldrig fastnar
      } else {
        ctx.services.voice.say('Kasta en tårta till!')
        pop(this._cake)
      }
    }
  },

  // Mjuk auto-hjälp vid idle: börja torka bort en klump som ledtråd. Upprepade
  // idle-cykler rensar till slut ansiktet helt -> spelet kan aldrig låsa sig.
  _autoHelpWipe(ctx) {
    const layer = this._splatLayer
    if (!layer || layer.children.length === 0) return
    const blob = layer.children[layer.children.length - 1]
    gsap.killTweensOf(blob.scale)
    blob._clean = (blob._clean || 0) + 0.34
    const k = Math.max(0, 1 - blob._clean)
    blob.alpha = k
    blob.scale.set(0.5 + 0.5 * k)
    if (blob._clean >= 1) {
      blob.destroy()
      if (layer.children.length === 0) this._finishWipe(ctx)
    }
  },

  destroy(ctx) {
    this._alive = false
    this._flying = false
    ctx.ticker.remove(this._tick)
    this._celebrate?.kill()
    this._blinkTimer?.kill()
    this._faceTimer?.kill()
    this._detachCake()
    this._detachSponge()
    for (const o of [this._cake, this._clown, this._sponge, this._eyeL, this._eyeR]) {
      if (!o) continue
      gsap.killTweensOf(o)
      gsap.killTweensOf(o.scale)
    }
    this._splatLayer?.children.forEach((c) => {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
    })
    this._dots?.forEach((d) => gsap.killTweensOf(d))
    for (const a of this._audience || []) {
      if (a.view && !a.view.destroyed) {
        gsap.killTweensOf(a.view)
        gsap.killTweensOf(a.view.scale)
      }
    }
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}

// Publik-Zacke: liten glad pojke som ser på från scengolvet.
function makeAudienceZacke() {
  const c = new Container()
  const skin = 0xf6b78a
  const shirt = COLORS.blue
  c.addChild(new Graphics().ellipse(0, 60, 30, 9).fill({ color: COLORS.shadow, alpha: 0.16 }))
  c.addChild(new Graphics()
    .roundRect(-16, 26, 13, 30, 6).fill(0x3f6f9e)
    .roundRect(4, 26, 13, 30, 6).fill(0x3f6f9e)
    .roundRect(-21, 52, 21, 11, 5).fill(0x4a3526)
    .roundRect(1, 52, 21, 11, 5).fill(0x4a3526))
  c.addChild(new Graphics()
    .roundRect(-22, -12, 44, 44, 17).fill(shirt)
    .roundRect(-22, 8, 44, 9, 5).fill({ color: 0xffffff, alpha: 0.18 }))
  // Armar uppe i jubel.
  c.addChild(new Graphics()
    .moveTo(-18, -4).lineTo(-36, -34).stroke({ width: 11, color: shirt, cap: 'round' })
    .moveTo(18, -4).lineTo(36, -34).stroke({ width: 11, color: shirt, cap: 'round' })
    .circle(-38, -38, 7).fill(skin)
    .circle(38, -38, 7).fill(skin))
  const head = new Graphics().circle(0, -34, 26).fill(skin)
  head.circle(-9, -38, 3.4).fill(COLORS.ink)
  head.circle(9, -38, 3.4).fill(COLORS.ink)
  head.circle(-16, -28, 5).fill({ color: COLORS.pink, alpha: 0.5 })
  head.circle(16, -28, 5).fill({ color: COLORS.pink, alpha: 0.5 })
  c.addChild(head)
  // Skrattande öppen mun.
  c.addChild(new Graphics().ellipse(0, -24, 9, 7).fill(0x7a2b22))
  c.addChild(new Graphics()
    .ellipse(0, -52, 27, 17).fill(0x5a3a23)
    .ellipse(-19, -42, 9, 11).fill(0x5a3a23)
    .ellipse(19, -42, 9, 11).fill(0x5a3a23))
  c.children.forEach((ch) => (ch.eventMode = 'none'))
  c.eventMode = 'none'
  return c
}
