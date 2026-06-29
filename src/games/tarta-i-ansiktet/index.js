// Tårta i Ansiktet — ren slapstick-glädje (3–5 år). Alissa, en stor, skrattande clown,
// står på scenen; längst ner väntar en gräddtårta. Barnet TRYCKER på tårtan
// (den flyger i en båge mot ansiktet) eller DRAR den upp mot Alissa — båda ger
// samma härliga PLASK: grädde-splat, fnitter, konfetti och en glad studs. Inga
// felsteg, ingen timer, inget slut. Efter några tårtor firar vi (delat firande +
// stjärna + klistermärke) och en ny, fräsch runda börjar direkt.
// Allt ritas programmatiskt (Pixi Graphics); enda emoji är 🧽 på torka-knappen.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { puff, pop, wiggle, bounceIn, sparkle } from '../../lib/feedback.js'
import { Button } from '../../lib/Button.js'
import { COLORS, PLAYFUL } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

const FACE_X = 640 // clownens ansikte (mitt-x) i designkoordinater
const FACE_Y = 300
const CAKE_X = 640 // tårtans viloplats (brickan)
const CAKE_Y = 620
const MAX_LEVEL = 3 // mjuk tak: håller rundan kort (max 6 tårtor) så den aldrig tjatar
const MAX_CREAM = 16 // cappa grädde-klumpar så ansiktet inte växer i oändlighet

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
  voiceIntro: 'Kasta tårtan i ansiktet på Alissa!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._resolving = false // sant under flygning + firande -> ignorera nya kast
    this._holding = false // sant medan tårtan hålls/dras
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

    // Dekor: scengolv + röda ridåer i kanterna (ej interaktiva, släpper tap igenom).
    const decor = new Graphics()
    decor.rect(0, 560, ctx.width, 160).fill(COLORS.cream)
    decor.rect(0, 0, 90, ctx.height).fill(COLORS.red)
    decor.rect(ctx.width - 90, 0, 90, ctx.height).fill(COLORS.red)
    decor.eventMode = 'none'
    decor.interactiveChildren = false
    this._root.addChild(decor)

    this._buildClown(ctx)
    this._buildCake(ctx)
    this._buildDots(ctx)

    // Svampknapp: visas först när ansiktet blivit kladdigt (_splats > 0).
    this._wipeBtn = new Button({
      icon: '🧽',
      label: 'Torka',
      width: 200,
      height: 120,
      color: COLORS.blue,
      services: ctx.services,
      sound: 'whoosh',
      radius: 28,
      stacked: true,
      onTap: () => this._wipe(ctx),
    })
    this._wipeBtn.position.set(1120, 620)
    this._wipeBtn.visible = false
    this._wipeBtn.eventMode = 'none'
    this._root.addChild(this._wipeBtn)

    // Bundna peklyssnare för dra/släpp på tårtan (av/på vid varje gest).
    this._cakeDown = (e) => this._onCakeDown(ctx, e)
    this._cakeMove = (e) => this._onCakeMove(ctx, e)
    this._cakeUp = () => this._onCakeUp(ctx)
    this._cake.on('pointerdown', this._cakeDown)

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

    // Ansikte: rosa kinder, ögon m. pupiller, röd näsa, brett glatt leende.
    const face = new Graphics()
    face.circle(-95, 35, 26).fill({ color: COLORS.pink, alpha: 0.75 })
    face.circle(95, 35, 26).fill({ color: COLORS.pink, alpha: 0.75 })
    face.circle(-58, -45, 28).fill(0xffffff).stroke({ width: 3, color: 0x33271f })
    face.circle(58, -45, 28).fill(0xffffff).stroke({ width: 3, color: 0x33271f })
    face.circle(-56, -40, 13).fill(0x33271f)
    face.circle(56, -40, 13).fill(0x33271f)
    face.arc(0, 60, 60, 0.08 * Math.PI, 0.92 * Math.PI).fill(0x7a2b22) // öppen skratt-mun
    face.circle(0, 104, 22).fill(COLORS.red) // tunga
    face.circle(0, 25, 36).fill(COLORS.red) // röd näsa (ritas sist -> ovanpå)
    face.eventMode = 'none'

    // Hatt (liten kon + pompom ovanpå huvudet).
    const hatColor = randomFrom(PLAYFUL)
    const hat = new Graphics()
    hat.ellipse(0, -148, 96, 20).fill(0x5a3a8a)
    hat.moveTo(-58, -150).lineTo(58, -150).lineTo(0, -238).closePath().fill(hatColor)
    hat.circle(0, -240, 22).fill(COLORS.yellow)
    hat.eventMode = 'none'

    // Grädde-lager (på ansiktet, men under svampknappen). Lokala koordinater.
    this._splatLayer = new Container()
    this._splatLayer.eventMode = 'none'

    c.addChild(hair, head, face, hat, this._splatLayer)
    this._root.addChild(c)
  },

  // Gräddtårta på brickan: tårtbotten + grädde + körsbär. Generös träffyta r=90.
  _buildCake() {
    const cake = new Container()
    cake.position.set(CAKE_X, CAKE_Y)
    const g = new Graphics()
    g.ellipse(0, 34, 82, 16).fill({ color: COLORS.shadow, alpha: 0.12 }) // mjuk skugga/fat
    g.roundRect(-70, -6, 140, 42, 12).fill(0xc98a5a).stroke({ width: 4, color: 0xa9703f }) // botten
    g.roundRect(-72, -28, 144, 28, 14).fill(0xffffff).stroke({ width: 4, color: 0xede6da }) // grädde
    g.circle(0, -34, 13).fill(COLORS.red) // körsbär
    g.eventMode = 'none'
    cake.addChild(g)
    cake.hitArea = new Circle(0, 0, 90)
    cake.eventMode = 'static'
    cake.cursor = 'pointer'
    this._cake = cake
    this._root.addChild(cake)
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

  // ---- Interaktion --------------------------------------------------------

  // Pekning på tårtan: starta gest. Omedelbar feedback (<100ms): ljud + studs.
  _onCakeDown(ctx, e) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    this._holding = true
    this._dragMoved = false
    const p = this._root.toLocal(e.global)
    this._grabDX = this._cake.x - p.x
    this._grabDY = this._cake.y - p.y
    this._startX = p.x
    this._startY = p.y
    ctx.services.audio.sfx('tap')
    pop(this._cake)
    this._cake.on('globalpointermove', this._cakeMove)
    this._cake.on('pointerup', this._cakeUp)
    this._cake.on('pointerupoutside', this._cakeUp)
  },

  _onCakeMove(ctx, e) {
    if (!this._alive || this._resolving) return
    const p = this._root.toLocal(e.global)
    if (!this._dragMoved && Math.hypot(p.x - this._startX, p.y - this._startY) > 14) this._dragMoved = true
    if (this._dragMoved) {
      this._cake.x = p.x + this._grabDX
      this._cake.y = p.y + this._grabDY
    }
  },

  _onCakeUp(ctx) {
    if (!this._alive) return
    this._detachCake()
    this._holding = false
    if (this._resolving) return
    if (!this._dragMoved) {
      // Ren tryckning -> tårtan flyger i en båge upp mot ansiktet.
      this._launch(ctx, true)
    } else if (Math.hypot(this._cake.x - FACE_X, this._cake.y - FACE_Y) < 220) {
      // Släppt nära ansiktet -> kort nedslag -> PLASK.
      this._launch(ctx, false)
    } else {
      // Släppt långt bredvid -> mjuk vingel + snäpp tillbaka (aldrig "fel").
      ctx.services.audio.sfx('soft')
      wiggle(this._cake)
      gsap.to(this._cake, { x: CAKE_X, y: CAKE_Y, duration: 0.32, ease: 'back.out(1.4)' })
    }
  },

  _detachCake() {
    const cake = this._cake
    if (!cake) return
    cake.off('globalpointermove', this._cakeMove)
    cake.off('pointerup', this._cakeUp)
    cake.off('pointerupoutside', this._cakeUp)
  },

  // Tryck på clownen = kasta den väntande tårtan direkt (stor träffyta).
  _onClownTap(ctx) {
    if (!this._alive || this._resolving || this._holding) return
    ctx.services.audio.sfx('tap')
    pop(this._cake)
    this._launch(ctx, true)
  },

  // Tomt tryck bredvid allt: lekfull vingel + mjukt ljud. Aldrig en bestraffning.
  _emptyTap(ctx) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    wiggle(this._cake)
  },

  // Skicka iväg tårtan mot ansiktet. `arc` = hög båge (tryck) eller kort släpp (drag).
  // Persistent tårta (poolad) -> vi tweenar Pixi-objektet direkt och dödar tweens i
  // destroy; onComplete är skyddad med this._alive. Inga objekt förstörs mid-tween.
  _launch(ctx, arc) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._idle = 0
    const cake = this._cake
    cake.eventMode = 'none'
    gsap.killTweensOf(cake)
    gsap.killTweensOf(cake.scale)
    const tl = gsap.timeline({
      onComplete: () => {
        if (this._alive) this._land(ctx)
      },
    })
    if (arc) tl.to(cake, { x: FACE_X, y: 230, duration: 0.16, ease: 'power1.out' })
    tl.to(cake, { x: FACE_X, y: 320, duration: arc ? 0.12 : 0.1, ease: 'power2.in' })
    tl.to(cake.scale, { x: 1.3, y: 1.3, duration: 0.26, ease: 'power1.out' }, 0)
    this._flight = tl
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

  // Själva PLASK-effekten (delas av tryck och drag).
  _splat(ctx) {
    if (!this._alive) return
    ctx.services.audio.sfx('pop')
    if (Math.random() < 0.25) ctx.services.audio.sfx('pling')
    this._addCream()
    puff(ctx.fxLayer, FACE_X, FACE_Y, { count: 12, color: 0xffffff })
    wiggle(this._clown)
    pop(this._clown)
    ctx.services.voice.say(randomFrom(SPLATS))
    this._splats++
    if (this._splats === 1) this._showWipe()
  },

  // Lägg 3–5 ojämna vita grädde-klumpar på ansiktet (cappat antal, exit-säkert).
  _addCream() {
    const n = 3 + ((Math.random() * 3) | 0)
    for (let i = 0; i < n; i++) {
      const r = 18 + Math.random() * 22
      const ang = Math.random() * Math.PI * 2
      const dist = Math.random() * 100
      const blob = new Graphics().circle(0, 0, r).fill(0xffffff).stroke({ width: 3, color: 0xeaf2f6 })
      blob.position.set(Math.cos(ang) * dist, 15 + Math.sin(ang) * dist * 0.7)
      blob.eventMode = 'none'
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

  _showWipe() {
    if (!this._wipeBtn) return
    this._wipeBtn.visible = true
    this._wipeBtn.eventMode = 'static'
    this._wipeBtn.scale.set(1)
    bounceIn(this._wipeBtn)
  },

  _hideWipe() {
    if (!this._wipeBtn) return
    gsap.killTweensOf(this._wipeBtn)
    gsap.killTweensOf(this._wipeBtn.scale)
    this._wipeBtn.visible = false
    this._wipeBtn.eventMode = 'none'
    this._wipeBtn.scale.set(1)
  },

  // Torka rent: ta bort all grädde, dölj svampknappen (ljudet sköts av Button).
  _wipe(ctx) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    ctx.services.voice.say('Nu blir Alissa ren igen!')
    this._clearCream()
    this._splats = 0
    this._hideWipe()
  },

  _clearCream() {
    if (!this._splatLayer) return
    this._splatLayer.children.forEach((c) => {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
    })
    this._splatLayer.removeChildren().forEach((c) => c.destroy())
  },

  // Återställ tårtan till brickan med en glad "ny tårta"-studs.
  _resetCake() {
    const cake = this._cake
    if (!cake) return
    gsap.killTweensOf(cake)
    gsap.killTweensOf(cake.scale)
    cake.position.set(CAKE_X, CAKE_Y)
    cake.scale.set(1)
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
    this._hideWipe()
    this._buildDots(ctx)
    this._resetCake()
    pop(this._clown)
  },

  // Idle-recue: efter ~6s tystnad upprepa instruktionen + locka med en studs.
  _update(ctx, ticker) {
    if (!this._alive) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6 && !this._resolving) {
      this._idle = 0
      ctx.services.voice.say('Kasta en tårta till!')
      pop(this._cake)
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._flight?.kill()
    this._celebrate?.kill()
    this._detachCake()
    for (const o of [this._cake, this._clown, this._wipeBtn]) {
      if (!o) continue
      gsap.killTweensOf(o)
      gsap.killTweensOf(o.scale)
    }
    this._splatLayer?.children.forEach((c) => {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
    })
    this._dots?.forEach((d) => gsap.killTweensOf(d))
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
