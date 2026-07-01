// Spåra Linjen — lugn motorik-/rita-själv-lek (3–5 år). Barnet sätter fingret på
// startpricken (som pulsar) och drar längs en prickad väg. ENDAST nästa prick i
// ordningen är aktiv: når fingret den "tänds" den (fylls med rundans färg, ett färgat
// segment ritas från föregående prick och ✏️-pennspetsen flyttas dit). Att hoppa till
// en prick längre fram gör INGET (man kan inte "fuska" sig framåt) — den rätta nästa-
// pricken vinkar i stället vänligt (mjuk vingel + puls + mjukt ljud). Inget kan bli fel:
// straying ignoreras (pennan stannar på vägen, aldrig omstart) och allt drivs lika gärna
// med tap-tap (tappa nästa prick) som med drag. Står barnet stilla en stund tänds nästa
// prick automatiskt (auto-hjälp) så rundan ALLTID blir klar. Klart = hela linjen färglagd
// → firande + ny, svårare form (oändlig, stigande lek). Allt ritas programmatiskt
// (Pixi Graphics + emoji) — inga filer.
//
// SVÅRIGHET: varje klarad runda höjer nivån. Tidiga nivåer = få prickar, raka/mjuka vägar;
// senare nivåer = fler prickar och mer avancerade former (vågor, sicksack, trappor,
// trianglar, fyrkanter, spiraler, stjärnor). Bortom planen fortsätter leken oändligt med
// slumpade avancerade former som blir allt tätare.
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
const IDLE_DELAY = 6 // s utan interaktion innan röst-recue + puls
const AUTO_DELAY = 14 // s utan interaktion → auto-tänd EN prick, vänta sedan på barnet igen (no-fail)

// Logisk ruta som alla formgeneratorer ritar inom (med marginal till papperskanten).
const BOX = { x0: 250, x1: 1030, cx: 640, top: 250, bot: 555, cy: 402 }

// ---- Formgeneratorer (rena funktioner; arrays av {x,y} i ordning) ----------
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

// Rak vågrät linje.
function genLine(n, B) {
  return Array.from({ length: n }, (_, i) => ({ x: B.x0 + ((B.x1 - B.x0) * i) / (n - 1), y: B.cy }))
}
// Diagonal (nedre vänster → övre höger).
function genDiagonal(n, B) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    return { x: B.x0 + (B.x1 - B.x0) * t, y: B.bot - (B.bot - B.top) * t }
  })
}
// Vågig linje (sinus) — mjuka kurvor.
function genWave(n, B, cycles = 1, amp = 110) {
  const phase = Math.random() < 0.5 ? 0 : Math.PI
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    return { x: B.x0 + (B.x1 - B.x0) * t, y: B.cy + Math.sin(phase + t * Math.PI * 2 * cycles) * amp }
  })
}
// Sicksack — skarpa upp/ner-vändningar (svårare än sinus).
function genZigzag(n, B) {
  return Array.from({ length: n }, (_, i) => ({
    x: B.x0 + ((B.x1 - B.x0) * i) / (n - 1),
    y: i % 2 === 0 ? B.bot : B.top,
  }))
}
// Båge (kulle uppåt) eller dal (sänka nedåt) — en mjuk parabel.
function genArch(n, B, down = false) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    const h = 4 * t * (1 - t) // 0 → 1 → 0
    const y = down ? B.top + (B.bot - B.top) * h : B.bot - (B.bot - B.top) * h
    return { x: B.x0 + (B.x1 - B.x0) * t, y }
  })
}
// Trappa som klättrar uppåt-höger (höger-steg, upp-steg, ...).
function genStairs(n, B) {
  const steps = Math.max(2, Math.floor(n / 2))
  const dx = (B.x1 - B.x0) / steps
  const dy = (B.bot - B.top) / steps
  let x = B.x0
  let y = B.bot
  const pts = [{ x, y }]
  for (let s = 0; s < steps; s++) {
    x += dx
    pts.push({ x, y }) // höger
    y -= dy
    pts.push({ x, y }) // upp
  }
  return pts
}
// Sluten triangel — sista pricken vinklar tillbaka mot första.
function genTriangle(B) {
  const corners = [
    { x: B.cx, y: B.top },
    { x: B.x1 - 40, y: B.bot },
    { x: B.x0 + 40, y: B.bot },
  ]
  return [...corners, lerp(corners[corners.length - 1], corners[0], 0.7)]
}
// Sluten fyrkant — sista pricken vinklar tillbaka mot första.
function genSquare(B) {
  const corners = [
    { x: B.x0 + 40, y: B.top },
    { x: B.x1 - 40, y: B.top },
    { x: B.x1 - 40, y: B.bot },
    { x: B.x0 + 40, y: B.bot },
  ]
  return [...corners, lerp(corners[corners.length - 1], corners[0], 0.6)]
}
// Spiral som växer utåt från mitten (avancerad, lång väg).
function genSpiral(n, B) {
  const rx = (B.x1 - B.x0) / 2 - 20
  const ry = (B.bot - B.top) / 2 - 2
  const turns = 2.2
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    const ang = t * turns * 2 * Math.PI
    const r = 0.18 + 0.82 * t
    return { x: B.cx + Math.cos(ang) * rx * r, y: B.cy + Math.sin(ang) * ry * r }
  })
}
// Femuddig stjärna i ett drag (hoppordning 0,2,4,1,3,0 → korsande linjer, svårast).
function genStar(B) {
  const rx = (B.x1 - B.x0) / 2 - 30
  const ry = (B.bot - B.top) / 2
  const outer = Array.from({ length: 5 }, (_, k) => {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5
    return { x: B.cx + Math.cos(a) * rx, y: B.cy + Math.sin(a) * ry }
  })
  return [0, 2, 4, 1, 3, 0].map((k) => outer[k])
}
// Lägg in `extra` mellanprickar på varje segment (gör en form tätare/svårare).
function subdivide(points, extra) {
  if (!extra) return points
  const out = []
  for (let i = 0; i < points.length; i++) {
    out.push(points[i])
    if (i < points.length - 1) {
      const a = points[i]
      const b = points[i + 1]
      for (let k = 1; k <= extra; k++) out.push(lerp(a, b, k / (extra + 1)))
    }
  }
  return out
}

export default {
  id: 'spara-linjen',
  titleSv: 'Spåra Linjen',
  icon: '✏️',
  category: 'motorik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'spara-linjen',
  voiceIntro: 'Dra fingret längs prickarna i ordning!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._cued = false
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

    this._buildRound()

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    this._cued = false
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Rundor: bygg en ny form (oändlig, stigande lek) --------------------

  _buildRound() {
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

    // Ny form (svårare ju högre nivå) + slumpfärg.
    this._color = randomFrom(PLAYFUL)
    const points = this._genShape()

    this._dots = []
    this._next = 0
    this._litCount = 0
    this._saidGo = false
    this._resolving = false
    this._tracing = false
    this._idle = 0
    this._cued = false

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

  // Väljer form utifrån nivå (this._round). Tidigt = lätt; sent = avancerat/tätt.
  _genShape() {
    const r = this._round
    const B = BOX
    // Stigande svårighetsplan (en form per nivå de första rundorna).
    const plan = [
      () => genLine(4, B),
      () => genDiagonal(4, B),
      () => genWave(5, B, 1, 110),
      () => genArch(5, B, false),
      () => genZigzag(5, B),
      () => genArch(6, B, true),
      () => genWave(6, B, 1.5, 120),
      () => genStairs(7, B),
      () => genTriangle(B),
      () => genZigzag(7, B),
      () => genWave(7, B, 2, 130),
      () => genSquare(B),
      () => genSpiral(8, B),
      () => genStar(B),
    ]
    if (r < plan.length) return plan[r]()

    // Bortom planen: oändlig lek med slumpade avancerade former som blir tätare.
    const extra = Math.min(3, 1 + Math.floor((r - plan.length) / 3))
    const advanced = [
      () => genWave(7 + extra, B, 2 + Math.random(), 120 + Math.random() * 20),
      () => genZigzag(7 + extra, B),
      () => genSpiral(8 + extra, B),
      () => subdivide(genStar(B), 1),
      () => subdivide(genSquare(B), extra),
      () => subdivide(genTriangle(B), extra),
      () => genStairs(7 + extra, B),
    ]
    return randomFrom(advanced)()
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

  // Mjuk puls på nästa otända prick (lockar fingret framåt; visar tydligt VAR man ska).
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
    this._cued = false
    this._checkPoint(ctx, this._root.toLocal(e.global), true)
  },

  _pointerMove(ctx, e) {
    if (!this._alive || this._resolving || !this._tracing) return
    this._checkPoint(ctx, this._root.toLocal(e.global), false)
  },

  // ENDAST nästa prick i ordningen accepteras (ingen fusk-genväg framåt). Träffar
  // fingret en prick längre fram händer inget störande — den RÄTTA nästa-pricken vinkar
  // i stället (mjuk vingel + puls + mjukt ljud). Strayar fingret: pennan stannar kvar,
  // ALDRIG en omstart.
  _checkPoint(ctx, p, isTap) {
    if (this._resolving || !this._alive || this._next >= this._dots.length) return

    const nextDot = this._dots[this._next]
    if (Math.hypot(p.x - nextDot.x, p.y - nextDot.y) < HIT_R) {
      // Rätt prick i tur och ordning → tänd den och gå ett steg framåt.
      this._idle = 0
      this._cued = false
      this._lightDot(ctx, this._next)
      this._next += 1
      this._afterLight(ctx)
      return
    }

    // Inte nästa pricken. Endast på ett friskt tryck (inte under själva draget) ger vi en
    // mjuk respons, så varje pekning får återkoppling utan att tjattra under draget.
    if (!isTap) return

    for (let i = this._next + 1; i < this._dots.length; i++) {
      const d = this._dots[i]
      if (Math.hypot(p.x - d.x, p.y - d.y) < HIT_R) {
        // Tappade en prick längre fram (fusk-försök) — gör inget; vinka mot rätt nästa-prick.
        ctx.services.audio.sfx('soft')
        wiggle(this._dots[this._next])
        this._pulseNext()
        return
      }
    }
    // Tomt tryck på ritytan: liten gnista (aldrig en bestraffning).
    ctx.services.audio.sfx('soft')
    sparkle(ctx.fxLayer, p.x, p.y, { count: 4 })
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

  // Efter att en prick tänts: rita spåret, flytta pennan, kolla klart.
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

  // Auto-hjälp: tänd nästa prick själv (no-fail-garanti om barnet kör fast).
  _autoAdvance(ctx) {
    if (!this._alive || this._resolving || this._next >= this._dots.length) return
    this._lightDot(ctx, this._next)
    this._next += 1
    this._afterLight(ctx)
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
      if (this._alive) this._buildRound()
    })
  },

  // ---- Idle-recue + auto-hjälp ---------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive || this._resolving || this._tracing) return
    this._idle += ticker.deltaMS / 1000

    // 1) Första stillastående: vänlig röst-recue + vink mot rätt nästa-prick.
    if (!this._cued && this._idle >= IDLE_DELAY) {
      this._cued = true
      ctx.services.voice.say(this.voiceIntro)
      const d = this._dots[this._next]
      if (d && !d.destroyed) wiggle(d)
      this._pulseNext()
    }
    // 2) Fortsatt stillastående: tänd EN prick automatiskt och vänta sedan på barnet igen
    //    (full idle-reset + ny recue) — teckningen ritar INTE sig själv vid passivitet,
    //    men rundan går ändå alltid att slutföra (no-fail).
    if (this._idle >= AUTO_DELAY) {
      this._idle = 0
      this._cued = false
      this._autoAdvance(ctx)
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
