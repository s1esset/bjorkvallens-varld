// Siffertåget — siffer-/räknelek med tågtema (3–5 år). Ett glatt ånglok står till
// vänster; barnet kopplar på de numrerade vagnarna i stigande ordning (1→N) genom
// att dra (eller tap-tap) dem till nästa lediga kopplingsplats. Den vagn som står
// näst på tur "lyser" (glöd-puls) så fel ordning aldrig kan bli permanent. Rätt =>
// pling + gnistra + rösten räknar ("Ett!", "Två!"). Fel/fel plats => mjuk pys
// tillbaka (aldrig en bestraffning). När tåget är helt tutar det och rullar iväg
// ("Tut tut!"), konfetti, och en ny (ev. längre) runda startar. Oändlig lek, ingen
// poäng, ingen timer, inga felsteg. All async är skyddad med this._alive (exit-säkert).
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, wiggle, sparkle, puff, bigCelebration } from '../../lib/feedback.js'
import { COLORS, FONT, PLAYFUL, PRAISE } from '../../lib/theme.js'

// Räkneorden 1–5 (rundans vagnar håller sig alltid inom 1–5).
const SIFFROR = { 1: 'Ett', 2: 'Två', 3: 'Tre', 4: 'Fyra', 5: 'Fem' }
const SIFFROR_LOW = { 1: 'ett', 2: 'två', 3: 'tre', 4: 'fyra', 5: 'fem' }

// Layout (designkoordinater 1280x720).
const RAIL_Y = 300
const ENGINE_X = 150
const ENGINE_Y = 250
const SLOT_Y = 245
const SLOT0_X = 290 // första kopplingsplatsens centrum (efter loket)
const SLOT_STEP = 194 // 170 bredd + 24 gap
const POOL_Y = 560

export default {
  id: 'siffertaget',
  titleSv: 'Siffertåget',
  icon: '🚂',
  category: 'larande',
  input: 'mixed',
  ageRange: [3, 5],
  bundle: 'siffertaget',
  voiceIntro: 'Hjälp tåget! Sätt vagnarna i ordning, ett, två, tre.',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._resolving = false
    this._cars = []
    this._slots = []
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Lugn bakgrund (dekorativ, fångar inga tryck).
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(COLORS.bg)
    bg.eventMode = 'none'
    this._root.addChild(bg)

    // Statisk räls + lok byggs en gång; vagnar/slots byggs om per runda.
    this._root.addChild(this._buildRail())
    this._engine = this._buildEngine()
    this._root.addChild(this._engine)

    // Rundans föränderliga innehåll (slots + lösa vagnar).
    this._roundLayer = new Container()
    this._root.addChild(this._roundLayer)

    this._drag = new DragController({ space: this._root, services: ctx.services })

    this._newRound(ctx)

    // Idle-recue (~6s): GameHost gör ingen egen, så vi sköter en mjuk ledtråd.
    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Räls: korta sliprar + en lång brun balk ovanpå.
  _buildRail() {
    const rail = new Container()
    rail.eventMode = 'none'
    const g = new Graphics()
    for (let x = 70; x <= 1210; x += 60) g.rect(x - 7, RAIL_Y - 4, 14, 30).fill({ color: COLORS.brown, alpha: 0.55 })
    g.roundRect(60, RAIL_Y, 1160, 18, 9).fill(COLORS.brown)
    rail.addChild(g)
    return rail
  },

  // Ånglok ritat helt med Pixi Graphics så det tydligt läses som ett tåg:
  // kofångare + panna (boiler) med skorsten och ångdom till vänster (fronten),
  // hytt med tak och fönster till höger (mot vagnarna) och runda hjul under.
  // Ingen emoji/ikon inuti — bara loket.
  _buildEngine() {
    const eng = new Container()
    eng.position.set(ENGINE_X, ENGINE_Y)
    eng.eventMode = 'none'
    const g = new Graphics()

    // Hjul (ritas först; chassi och kropp täcker överkanten så de "rullar" på rälsen).
    const wheel = (cx, cy, r) => {
      g.circle(cx, cy, r).fill(COLORS.ink).stroke({ width: 3, color: COLORS.white, alpha: 0.3 })
      g.circle(cx, cy, r * 0.45).fill(COLORS.inkSoft)
      g.circle(cx, cy, 4).fill(COLORS.ink)
    }
    wheel(-70, 48, 16) // litet löphjul fram
    wheel(-28, 50, 28) // drivhjul
    wheel(44, 50, 28) // drivhjul

    // Kofångare (pilot) längst fram till vänster.
    g.poly([-96, 22, -120, 52, -96, 52]).fill(COLORS.orangeDark)
    // Chassi/fotplåt.
    g.roundRect(-98, 24, 200, 18, 7).fill(COLORS.ink)

    // Pannans kropp (boiler) + mörkare smokebox-ring + strålkastare fram.
    g.roundRect(-100, -34, 150, 64, 22).fill(COLORS.red).stroke({ width: 5, color: COLORS.white, alpha: 0.45 })
    g.roundRect(-99, -30, 24, 56, 13).fill(COLORS.orangeDark)
    g.circle(-89, -2, 11).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.white, alpha: 0.6 })

    // Hytt (cab) bak till höger, med tak-överhäng och fönster mot vagnarna.
    g.roundRect(36, -60, 60, 90, 16).fill(COLORS.red).stroke({ width: 5, color: COLORS.white, alpha: 0.45 })
    g.roundRect(28, -68, 80, 16, 8).fill(COLORS.orangeDark) // tak
    g.roundRect(50, -46, 38, 34, 9).fill(COLORS.yellow).stroke({ width: 4, color: COLORS.white, alpha: 0.5 })

    // Skorsten (funnel) på pannan, vidare upptill.
    g.poly([-78, -34, -84, -66, -54, -66, -60, -34]).fill(COLORS.ink)
    g.roundRect(-86, -74, 36, 13, 6).fill(COLORS.ink)
    // Ångdom mitt på pannan.
    g.roundRect(-30, -50, 32, 20, 9).fill(COLORS.yellow)
    g.circle(-14, -50, 9).fill(COLORS.yellow)

    // Koppel mot första vagnen.
    g.roundRect(94, 6, 16, 12, 4).fill(COLORS.ink)

    eng.addChild(g)
    return eng
  },

  // Spökruta: ljus rundad ruta med streck-kant — visar var nästa vagn ska kopplas.
  _makeSlot() {
    const s = new Container()
    const g = new Graphics()
      .roundRect(-85, -75, 170, 150, 20)
      .fill({ color: COLORS.white, alpha: 0.35 })
      .stroke({ width: 5, color: COLORS.ink, alpha: 0.4 })
    g.eventMode = 'none'
    s.addChild(g)
    s.hitArea = new Rectangle(-95, -85, 190, 170)
    return s
  },

  // En tågvagn: glöd-halo (dold tills aktiv) + färgad kropp + hjul + stor siffra +
  // prickrad (icke-läsande stöd). Träffyta 190x170 (>96px med hit-halo).
  _makeCar(n) {
    const car = new Container()
    const glow = new Graphics().roundRect(-97, -87, 194, 174, 26).fill(COLORS.yellow)
    glow.alpha = 0
    glow.eventMode = 'none'
    const body = new Graphics()
    // Hjul med nav (ritas först).
    ;[-45, 45].forEach((wx) => {
      body.circle(wx, 70, 24).fill(COLORS.ink).stroke({ width: 3, color: COLORS.white, alpha: 0.3 })
      body.circle(wx, 70, 11).fill(COLORS.inkSoft)
      body.circle(wx, 70, 4).fill(COLORS.ink)
    })
    // Chassi + koppel-stumpar på sidorna (kopplar ihop vagnarna).
    body.roundRect(-82, 52, 164, 16, 6).fill(COLORS.ink)
    body.roundRect(-94, 54, 14, 10, 3).fill(COLORS.ink)
    body.roundRect(80, 54, 14, 10, 3).fill(COLORS.ink)
    // Vagnskorg + lätt takdager.
    body
      .roundRect(-85, -75, 170, 132, 20)
      .fill(PLAYFUL[(n - 1) % PLAYFUL.length])
      .stroke({ width: 6, color: COLORS.white, alpha: 0.7 })
    body.roundRect(-78, -70, 156, 24, 12).fill({ color: COLORS.white, alpha: 0.16 })
    body.eventMode = 'none'
    const num = new Text({
      text: String(n),
      style: { fontFamily: FONT.display, fontSize: 96, fontWeight: '700', fill: COLORS.white, align: 'center' },
    })
    num.anchor.set(0.5)
    num.position.set(0, -6)
    num.eventMode = 'none'
    const dots = new Graphics()
    const spacing = 22
    for (let i = 0; i < n; i++) dots.circle(-((n - 1) * spacing) / 2 + i * spacing, 46, 8).fill(COLORS.white)
    dots.eventMode = 'none'
    car.addChild(glow, body, num, dots)
    car.hitArea = new Rectangle(-97, -87, 194, 174)
    car._glow = glow
    return car
  },

  // Markera vilken vagn som står näst på tur: pulsa dess glöd, släck förra.
  _setActiveCar(n) {
    this._pulse?.kill()
    this._pulse = null
    const prev = this._activeCar
    if (prev && !prev.destroyed && prev._glow) {
      gsap.killTweensOf(prev._glow)
      prev._glow.alpha = 0
    }
    this._activeCar = null
    const car = this._cars.find((c) => !c.destroyed && !c._placed && c._n === n)
    if (!car) return
    this._activeCar = car
    car._glow.alpha = 0.45
    this._pulse = gsap.to(car._glow, { alpha: 0.9, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  // Bygg en ny runda: rensa förra, beräkna N (växer med nivå), lägg ut slots +
  // blandade vagnar, markera vagn 1 som aktiv.
  _newRound(ctx) {
    if (!this._alive) return
    this._clearRound()
    this._placedCount = 0
    this._expected = 1
    this._resolving = false
    this._idle = 0
    const N = Math.min(5, 3 + Math.floor(this._level / 2)) // 3 → 4 → 5
    this._N = N

    gsap.killTweensOf(this._engine)
    this._engine.x = ENGINE_X

    // Kopplingsplatser: en target per slot, men accepts kräver rätt siffra OCH att
    // sloten är den näst lediga -> omöjligt att placera i fel ordning.
    for (let i = 0; i < N; i++) {
      const slot = this._makeSlot()
      slot.position.set(SLOT0_X + i * SLOT_STEP, SLOT_Y)
      slot._index = i
      this._roundLayer.addChild(slot)
      this._slots.push(slot)
      this._drag.addTarget(slot, (data) => data.n === this._expected && slot._index === this._placedCount, { hitRadius: 130 })
    }

    // Lösa vagnar i blandad ordning längs nederkanten.
    const order = shuffle(Array.from({ length: N }, (_, k) => k + 1))
    order.forEach((n, i) => {
      const car = this._makeCar(n)
      car.position.set(N === 1 ? 640 : 170 + ((1110 - 170) * i) / (N - 1), POOL_Y)
      car._n = n
      car._placed = false
      this._roundLayer.addChild(car)
      this._cars.push(car)
      bounceIn(car, { delay: i * 0.08 })
      this._drag.addItem(car, { n }, {
        onSelect: () => {
          if (this._alive) this._idle = 0
        },
        onWrong: (rec) => {
          if (!this._alive || this._resolving) return
          this._idle = 0
          wiggle(rec.view) // DragController spelar redan 'soft' + snäpper hem
        },
        onCorrect: (rec, target) => this._onCorrect(ctx, rec, target),
      })
    })

    this._setActiveCar(1)
  },

  // Rätt vagn på rätt plats: räkna, gnistra, koppla på och gå vidare.
  _onCorrect(ctx, rec, target) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    rec.view._placed = true
    const n = rec.data.n

    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('pling')
    ctx.services.voice.say(`${SIFFROR[n] || n}!`)
    sparkle(ctx.fxLayer, target.view.x, target.view.y)
    pop(rec.view)

    this._placedCount++
    this._expected++
    this._setActiveCar(this._expected)

    if (this._placedCount >= this._N) this._finishRound(ctx)
  },

  // Hela tåget klart: tut + firande + tåget rullar ut, sedan ny runda. Oändlig lek.
  _finishRound(ctx) {
    if (!this._alive) return
    this._resolving = true
    this._idle = 0
    this._pulse?.kill()
    this._pulse = null

    ctx.services.audio.sfx('celebrate')
    ctx.services.audio.sfx('whoosh')
    puff(ctx.fxLayer, ENGINE_X - 68, ENGINE_Y - 82, { color: COLORS.inkSoft })
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    // Lok + alla vagnar rullar långsamt ut åt höger (chuggar iväg).
    gsap.to(this._engine, { x: '+=1500', duration: 1.4, ease: 'power1.in' })
    this._cars.forEach((c) => {
      if (!c.destroyed) gsap.to(c, { x: '+=1500', duration: 1.4, ease: 'power1.in' })
    })

    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    ctx.progress.complete() // delat firande: stjärna + klistermärke (+ röst-beröm)
    // Sista (hörbara) frasen: glatt tut + beröm medan tåget åker.
    ctx.services.voice.say(`Tut tut! ${randomFrom(PRAISE)}`)

    this._next = gsap.delayedCall(1.6, () => {
      if (!this._alive) return
      this._level++
      this._newRound(ctx)
    })
  },

  // Idle ~6s: upprepa en mjuk ledtråd och vinka med den aktiva vagnen.
  _update(ctx, ticker) {
    if (!this._alive || this._resolving) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6) {
      this._idle = 0
      const prev = SIFFROR_LOW[this._expected - 1]
      ctx.services.voice.say(prev ? `Vilken kommer efter ${prev}?` : 'Vilken vagn är nummer ett?')
      if (this._activeCar && !this._activeCar.destroyed) wiggle(this._activeCar)
    }
  },

  // Töm förra rundans slots/vagnar utan att läcka tweens eller lyssnare.
  _clearRound() {
    this._pulse?.kill()
    this._pulse = null
    this._activeCar = null
    this._drag.clear()
    this._cars.forEach((c) => {
      if (!c.destroyed) {
        gsap.killTweensOf(c)
        gsap.killTweensOf(c.scale)
        if (c._glow) gsap.killTweensOf(c._glow)
      }
    })
    this._roundLayer.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._cars = []
    this._slots = []
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._next?.kill()
    this._pulse?.kill()
    this._drag?.destroy()
    this._cars.forEach((c) => {
      if (!c.destroyed) {
        gsap.killTweensOf(c)
        gsap.killTweensOf(c.scale)
        if (c._glow) gsap.killTweensOf(c._glow)
      }
    })
    if (this._engine) gsap.killTweensOf(this._engine)
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
