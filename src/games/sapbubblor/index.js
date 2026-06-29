// Såpbubblor — skimrande såpbubblor svävar UPPÅT; tryck på en bubbla -> den
// spricker med ett "pop" (lugn orsak-verkan, 2–5 år). DET BEVARADE: bubblorna
// glittrar, driver och poppas precis som förr — det är fortfarande härligt att
// bara peta sönder dem.
//
// NYTT (gör det till ett RIKTIGT spel): en lysande RING 🛟 sitter på skärmen.
// Barnet styr bubblorna IN i ringen med två stora FLÄKTAR (vänster fläkt blåser
// åt höger, höger fläkt blåser åt vänster). Varje bubbla som åker in i ringen
// fyller en mätare; när mätaren är full -> firande + stjärna + klistermärke och
// nästa nivå (ringen flyttar/krymper, fler bubblor, lite gemen bris högre upp).
//
// FYSIK: bubblorna har riktig MASSA (stora = tunga, små = lätta), en horisontell
// hastighet med LUFTMOTSTÅND (drag) och MOMENTUM. Fläkten ger en kraft (impuls)
// som accelererar dem i sidled — lätta bubblor blåser längre, precis som på
// riktigt. INGET felsteg: poppning är bara kul, fläkten hjälper alltid (straffar
// aldrig), och en mild auto-hjälp ser till att ringen alltid blir full.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { sparkle, puff, floatText, bigCelebration, pop } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { FONT, COLORS } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

const TARGET_BUBBLES = 9 // håll ~7–10 bubblor i luften
const SAY_THROTTLE_MS = 800 // strypa röst så den aldrig tjattrar/stammar
const IDLE_DELAY = 6 // s utan interaktion -> mild om-uppmaning

// Vind/fysik-konstanter (designkoordinater, px & sekunder).
const GUST_KICK = 1500 // kraft som varje fläkt-tryck lägger till
const GUST_MAX = 2900 // tak på samlad vindkraft
const GUST_DECAY = 0.94 // per bildruta -> vinden mojnar på ~1s
const VX_DRAG = 0.93 // luftmotstånd per bildruta på sidledsfart
const VX_MAX = 470 // hastighetstak i sidled (px/s)
const PULL = 720 // mjuk "sug" mot ringen (förlåtande infångning)
const AUTO_HELP_AFTER = 10 // s utan poäng -> starkare auto-sug (no-fail)

// Korta, glada repliker.
const POP_PHRASES = ['Pang!', 'Plopp!', 'Pop!', 'Hihi!', 'Så fint!', 'Där!']
const SCORE_PHRASES = ['Ja! In i ringen!', 'Pang i ringen!', 'Mitt i prick!', 'Vilken fin!']
const SHEEN = [0xff9ec4, 0x9ad0ff, 0xa78bfa, 0x9ff0d0, 0xffe08a]

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'sapbubblor',
  titleSv: 'Såpbubblor',
  icon: '🫧',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'sapbubblor',
  voiceIntro: 'Blås bubblorna in i ringen!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._lastSay = 0
    this._bubbles = []
    this._pipNodes = []
    this._fanBlades = []
    this._gust = 0
    this._breeze = 0
    this._breezePhase = 0
    this._sinceScore = 0
    this._resolving = false

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Mjuk himmel bakom bubblorna (dekorativ, släpper igenom pekningar).
    this._scene = createScene('sky', { width: ctx.width, height: ctx.height })
    this._root.addChild(this._scene)

    // Heltäckande, genomskinlig fångare: glatt litet svar på tomma tryck.
    this._catcher = new Graphics()
      .rect(0, 0, ctx.width, ctx.height)
      .fill({ color: 0xdcefff, alpha: 0.12 })
    this._catcher.eventMode = 'static'
    this._onCatch = (ev) => {
      if (!this._alive) return
      const p = this._root.toLocal(ev.global)
      this._idle = 0
      ctx.services.audio.sfx('soft')
      sparkle(ctx.fxLayer, p.x, p.y, { count: 4 })
    }
    this._catcher.on('pointertap', this._onCatch)
    this._root.addChild(this._catcher)

    // Lager: bubblor UNDER fläktar/mätare så kontrollerna alltid syns/går att nå.
    this._bubbleLayer = new Container()
    this._root.addChild(this._bubbleLayer)

    // Ringen (målet) — ritas om per nivå.
    this._buildHoop(ctx)

    // Två stora fläktar (vänster blåser höger, höger blåser vänster).
    this._buildFans(ctx)

    // Mätare (fylls per bubbla i ringen) — byggs om per nivå.
    this._meter = new Container()
    this._root.addChild(this._meter)

    // Nivå utifrån sparad progress.
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._startLevel(ctx, this._level, true)

    // Seed: bubblor utspridda direkt så scenen aldrig är tom.
    for (let i = 0; i < TARGET_BUBBLES; i++) this._spawn(ctx, true)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Ring (mål) ----------------------------------------------------------

  _buildHoop(ctx) {
    this._hoop = new Container()
    this._hoop.eventMode = 'none' // ringen tar inga tryck (bubblor passerar in)
    this._hoopGlow = new Graphics()
    this._hoopRing = new Graphics()
    const e = new Text({ text: '🛟', style: { fontFamily: FONT.body, fontSize: 64 } })
    e.anchor.set(0.5)
    e.y = 0
    e.alpha = 0.0 // dekor-emoji hålls dold; den ritade ringen är tydligast
    this._hoop.addChild(this._hoopGlow, this._hoopRing)
    this._root.addChildAt(this._hoop, this._root.getChildIndex(this._bubbleLayer) + 1)
    // Mjuk andning på glödringen (drar blicken mot målet).
    this._hoopTween = gsap.to(this._hoopGlow.scale, {
      x: 1.1, y: 1.1, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut',
    })
  },

  _drawHoop(r) {
    // Tjock, färgglad ring med ljus högdager -> läses tydligt som ett "mål".
    this._hoopRing
      .clear()
      .circle(0, 0, r)
      .fill({ color: 0x9ad0ff, alpha: 0.14 }) // svag fyllning = "innanför"
      .circle(0, 0, r)
      .stroke({ width: 22, color: COLORS.blue, alpha: 0.95 })
      .circle(0, 0, r)
      .stroke({ width: 8, color: 0xffffff, alpha: 0.65 })
    this._hoopGlow
      .clear()
      .circle(0, 0, r + 14)
      .stroke({ width: 6, color: COLORS.yellow, alpha: 0.55 })
  },

  // ---- Fläktar (kontroll) --------------------------------------------------

  _buildFans(ctx) {
    this._fanLayer = new Container()
    this._root.addChild(this._fanLayer)
    this._makeFan(ctx, +1, 96, ctx.height - 96) // vänster: blåser åt höger
    this._makeFan(ctx, -1, ctx.width - 96, ctx.height - 96) // höger: blåser åt vänster
  },

  _makeFan(ctx, dir, x, y) {
    const fan = new Container()
    fan.position.set(x, y)

    // Stativ.
    fan.addChild(new Graphics().roundRect(-10, 20, 20, 70, 8).fill(0x6b5840))
    fan.addChild(new Graphics().roundRect(-46, 84, 92, 16, 8).fill(0x6b5840))
    // Hölje.
    fan.addChild(new Graphics().circle(0, 0, 60).fill({ color: 0xeef4fb }).stroke({ width: 6, color: COLORS.blue }))

    // Roterande blad.
    const blade = new Graphics()
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      blade.moveTo(0, 0)
      blade.arc(0, 0, 46, a - 0.42, a + 0.42)
      blade.lineTo(0, 0)
      blade.fill({ color: i % 2 ? COLORS.teal : COLORS.blue, alpha: 0.95 })
    }
    blade.circle(0, 0, 12).fill(0xffffff)
    fan.addChild(blade)
    this._fanBlades.push(blade)

    // Riktningspil (💨) på den sida vinden blåser.
    const arrow = new Text({ text: '💨', style: { fontFamily: FONT.body, fontSize: 40 } })
    arrow.anchor.set(0.5)
    arrow.x = dir * 64
    arrow.scale.x = dir // spegelvänd så plymen pekar inåt
    fan.addChild(arrow)

    fan.eventMode = 'static'
    fan.cursor = 'pointer'
    fan.hitArea = new Circle(0, 0, 96) // stor träffyta (>= designkrav)
    fan.on('pointertap', () => this._blow(ctx, dir, blade, x, y))
    this._fanLayer.addChild(fan)
    return fan
  },

  _blow(ctx, dir, blade, x, y) {
    if (!this._alive) return
    this._idle = 0
    // Ljud + bild direkt (< 100ms): fläkten snurrar, vinddrag puffar, vind tar fart.
    ctx.services.audio.sfx('whoosh')
    this._gust = clamp(this._gust + dir * GUST_KICK, -GUST_MAX, GUST_MAX)
    gsap.killTweensOf(blade)
    gsap.to(blade, { rotation: blade.rotation + dir * Math.PI * 2.2, duration: 0.6, ease: 'power2.out' })
    this._windStreaks(x + dir * 70, y - 10, dir)
    const now = performance.now()
    if (now - this._lastSay > SAY_THROTTLE_MS && Math.random() < 0.4) {
      this._lastSay = now
      ctx.services.voice.say('Blås!')
    }
  },

  // Lätta vindstreck som driver i blås-riktningen (exit-säkert via {}-proxy).
  _windStreaks(x, y, dir) {
    for (let i = 0; i < 4; i++) {
      const len = 24 + Math.random() * 26
      const s = new Graphics()
        .roundRect(-len / 2, -2.5, len, 5, 2.5)
        .fill({ color: 0xffffff, alpha: 0.55 })
      const sy = y + (Math.random() - 0.5) * 70
      s.position.set(x, sy)
      s.eventMode = 'none'
      this._root.addChild(s)
      const st = { x, a: 0.55 }
      const tw = gsap.to(st, {
        x: x + dir * (160 + Math.random() * 120),
        a: 0,
        duration: 0.5 + Math.random() * 0.25,
        ease: 'power2.out',
        onUpdate: () => {
          if (s.destroyed) { tw.kill(); return }
          s.x = st.x
          s.alpha = st.a
        },
        onComplete: () => { if (!s.destroyed) s.destroy() },
      })
    }
  },

  // ---- Mätare --------------------------------------------------------------

  _buildMeter(need) {
    if (this._meter) {
      for (const c of [...this._meter.children]) c.destroy()
    }
    this._pipNodes = []
    const gap = 56
    const total = (need - 1) * gap
    const padX = 30
    const bg = new Graphics()
      .roundRect(-total / 2 - padX - 40, -34, total + padX * 2 + 80, 68, 34)
      .fill({ color: 0xffffff, alpha: 0.82 })
      .stroke({ width: 4, color: COLORS.blue, alpha: 0.6 })
    this._meter.addChild(bg)
    // Liten ring-ikon till vänster om pricken-raden.
    const ic = new Text({ text: '🛟', style: { fontFamily: FONT.body, fontSize: 40 } })
    ic.anchor.set(0.5)
    ic.x = -total / 2 - padX - 6
    this._meter.addChild(ic)
    for (let i = 0; i < need; i++) {
      const pip = new Graphics()
      pip.x = -total / 2 + i * gap
      this._drawPip(pip, false)
      this._meter.addChild(pip)
      this._pipNodes.push(pip)
    }
    this._meter.position.set(640, 64)
  },

  _drawPip(pip, filled) {
    pip.clear()
    if (filled) {
      pip.circle(0, 0, 18).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.orange })
    } else {
      pip.circle(0, 0, 16).fill({ color: 0xcfe0ee }).stroke({ width: 3, color: COLORS.blue, alpha: 0.5 })
    }
  },

  _fillPip(i) {
    const pip = this._pipNodes[i]
    if (!pip || pip.destroyed) return
    this._drawPip(pip, true)
    gsap.killTweensOf(pip.scale)
    pop(pip)
  },

  // ---- Nivåer --------------------------------------------------------------

  _layoutFor(level) {
    const need = Math.min(3 + level, 8)
    const hoopR = Math.max(78, 120 - level * 6)
    const xs = [900, 380, 760, 520, 1000, 280]
    let hoopX = xs[level % xs.length]
    let hoopY = 240 + (level % 3) * 56
    if (level >= 4) {
      hoopX += (Math.random() - 0.5) * 120
      hoopY += (Math.random() - 0.5) * 40
    }
    hoopX = clamp(hoopX, hoopR + 50, 1280 - hoopR - 50)
    hoopY = clamp(hoopY, 210, 380)
    const breezeAmp = level >= 3 ? Math.min(220 + (level - 3) * 90, 620) : 0
    const breezeSpeed = 0.5 + level * 0.05
    return { need, hoopR, hoopX, hoopY, breezeAmp, breezeSpeed }
  },

  _startLevel(ctx, level, silent = false) {
    if (!this._alive) return
    const L = this._layoutFor(level)
    this._need = L.need
    this._scored = 0
    this._hoopR = L.hoopR
    this._hoopX = L.hoopX
    this._hoopY = L.hoopY
    this._breezeAmp = L.breezeAmp
    this._breezeSpeed = L.breezeSpeed
    this._sinceScore = 0
    this._resolving = false

    this._hoop.position.set(L.hoopX, L.hoopY)
    this._drawHoop(L.hoopR)
    this._buildMeter(L.need)
    if (!this._hoop.destroyed) pop(this._hoop)

    if (!silent) ctx.services.voice.say('Ny ring! Blås in bubblorna.')
  },

  // ---- Bubblor -------------------------------------------------------------

  _makeBubble(ctx, r) {
    const b = new Container()
    const g = new Graphics()
    g.circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.12 })
    g.circle(0, 0, r).stroke({ width: Math.max(2, r * 0.05), color: 0xffffff, alpha: 0.85 })
    const o = Math.random() * Math.PI * 2
    const arcs = [
      { rad: r * 0.88, a0: -2.5, a1: -1.7 },
      { rad: r * 0.88, a0: 0.55, a1: 1.45 },
      { rad: r * 0.72, a0: 2.2, a1: 3.0 },
    ]
    arcs.forEach((arc, i) => {
      g.arc(0, 0, arc.rad, arc.a0 + o, arc.a1 + o).stroke({
        width: Math.max(2, r * 0.06),
        color: SHEEN[(i + ((Math.random() * SHEEN.length) | 0)) % SHEEN.length],
        alpha: 0.5,
        cap: 'round',
      })
    })
    g.circle(-r * 0.34, -r * 0.34, r * 0.2).fill({ color: 0xffffff, alpha: 0.6 })
    g.circle(-r * 0.12, -r * 0.46, r * 0.07).fill({ color: 0xffffff, alpha: 0.8 })

    b.addChild(g)
    b.eventMode = 'static'
    b.cursor = 'pointer'
    b.hitArea = new Circle(0, 0, r + 20) // osynlig hit-halo
    b._popped = false
    b.on('pointertap', () => this._pop(ctx, b))
    return b
  },

  _spawn(ctx, seed = false) {
    if (!this._alive) return
    const r = 30 + Math.random() * 40 // ~30..70
    const b = this._makeBubble(ctx, r)
    b._r = r
    b._mass = (r * r) / (48 * 48) // riktig massa: stora bubblor = tunga, små = lätta
    // Bias en del bubblor mot ringens x så det alltid finns något att styra in.
    const alignToHoop = !seed && Math.random() < 0.33
    b._baseX = alignToHoop
      ? this._hoopX + (Math.random() - 0.5) * 200
      : r + 20 + Math.random() * (ctx.width - 2 * (r + 20))
    b._baseX = clamp(b._baseX, r, ctx.width - r)
    b._vx = 0 // sidledshastighet (px/s) — vind/sug accelererar denna
    b._wobbleAmp = 12 + Math.random() * 22
    b._wobbleSpeed = 0.7 + Math.random() * 1.0
    b._phase = Math.random() * Math.PI * 2
    b._vy = 18 + Math.random() * 26 + (70 - r) * 0.25 // mindre bubblor stiger snabbare
    b._popped = false

    b.x = b._baseX
    b.y = seed ? 160 + Math.random() * (ctx.height - 280) : ctx.height + r + 10 + Math.random() * 140

    this._bubbleLayer.addChild(b)
    this._bubbles.push(b)

    b.scale.set(0.4)
    gsap.to(b.scale, { x: 1, y: 1, duration: 0.5, ease: 'sine.out' })
  },

  // Tap-pop: ren glädje (poängar INTE — det gör ringen). No-fail.
  _pop(ctx, b) {
    if (!this._alive || b._popped || b.destroyed) return
    b._popped = true
    b.eventMode = 'none'
    this._idle = 0

    ctx.services.audio.sfx(Math.random() < 0.2 ? 'pling' : 'pop')
    this._droplets(ctx, b.x, b.y, b._r)
    sparkle(ctx.fxLayer, b.x, b.y, { count: 5 })

    const now = performance.now()
    if (now - this._lastSay > SAY_THROTTLE_MS) {
      this._lastSay = now
      ctx.services.voice.say(randomFrom(POP_PHRASES))
    }
    this._burstBubble(b)
  },

  // Bubbla in i ringen = POÄNG: fyll en prick, fira litet, närma full -> nivå klar.
  _scoreBubble(ctx, b) {
    if (!this._alive || b._popped || b.destroyed || this._resolving) return
    b._popped = true
    b.eventMode = 'none'
    this._idle = 0
    this._sinceScore = 0

    ctx.services.audio.sfx('correct')
    sparkle(ctx.fxLayer, this._hoopX, this._hoopY, { count: 8 })
    puff(ctx.fxLayer, this._hoopX, this._hoopY, { count: 8, color: COLORS.yellow })
    floatText(ctx.fxLayer, this._hoopX, this._hoopY - 20, '⭐', { fontSize: 56 })
    if (!this._hoop.destroyed) pop(this._hoop)

    const idx = this._scored
    this._scored++
    this._fillPip(idx)

    const now = performance.now()
    if (now - this._lastSay > SAY_THROTTLE_MS && this._scored < this._need) {
      this._lastSay = now
      ctx.services.voice.say(randomFrom(SCORE_PHRASES))
    }

    // Bubblan sugs in mot ringens mitt och tonar bort (exit-säkert via proxy).
    const st = { x: b.x, y: b.y, s: b.scale.x, a: 1 }
    const tw = gsap.to(st, {
      x: this._hoopX,
      y: this._hoopY,
      s: 0.2,
      a: 0,
      duration: 0.35,
      ease: 'power2.in',
      onUpdate: () => {
        if (b.destroyed) { tw.kill(); return }
        b.x = st.x
        b.y = st.y
        b.scale.set(st.s)
        b.alpha = st.a
      },
      onComplete: () => { if (!b.destroyed) b.destroy({ children: true }) },
    })

    if (this._scored >= this._need) this._levelComplete(ctx)
  },

  // Spricka (väx till + tona ut, förstör sedan). Exit-säkert via {}-proxy.
  _burstBubble(b) {
    const st = { s: b.scale.x, a: 1 }
    const tw = gsap.to(st, {
      s: b.scale.x * 1.4,
      a: 0,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        if (b.destroyed) { tw.kill(); return }
        b.scale.set(st.s)
        b.alpha = st.a
      },
      onComplete: () => { if (!b.destroyed) b.destroy({ children: true }) },
    })
  },

  _droplets(ctx, x, y, r) {
    const n = 5 + ((Math.random() * 3) | 0)
    for (let i = 0; i < n; i++) {
      const dr = 3 + Math.random() * 4
      const p = new Graphics()
        .circle(0, 0, dr)
        .fill({ color: 0xffffff, alpha: 0.55 })
        .stroke({ width: 1, color: 0xbfe6ff, alpha: 0.85 })
      p.x = x
      p.y = y
      p.eventMode = 'none'
      ctx.fxLayer.addChild(p)
      const ang = Math.random() * Math.PI * 2
      const dist = r * 0.5 + Math.random() * r * 0.9
      const st = { x, y, a: 1, s: 1 }
      const tw = gsap.to(st, {
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist + 18,
        a: 0,
        s: 0.3,
        duration: 0.4 + Math.random() * 0.25,
        ease: 'power2.out',
        onUpdate: () => {
          if (p.destroyed) { tw.kill(); return }
          p.x = st.x
          p.y = st.y
          p.alpha = st.a
          p.scale.set(st.s)
        },
        onComplete: () => { if (!p.destroyed) p.destroy() },
      })
    }
  },

  // ---- Nivå klar -----------------------------------------------------------

  _levelComplete(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._idle = 0

    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say('Ringen är full! Bravo!')
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    sparkle(ctx.fxLayer, this._hoopX, this._hoopY, { count: 10 })

    // Progress: höj nivå + delat firande (stjärna + klistermärke).
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.complete()

    this._levelTimer = gsap.delayedCall(1.7, () => {
      if (!this._alive) return
      this._startLevel(ctx, this._level)
    })
  },

  // ---- Ticker --------------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    const dtF = ticker.deltaMS / 16.67

    // Vind: fläkt-gust mojnar; ev. ambient bris högre upp i nivåerna.
    this._gust *= Math.pow(GUST_DECAY, dtF)
    if (Math.abs(this._gust) < 1) this._gust = 0
    if (this._breezeAmp > 0) {
      this._breezePhase += this._breezeSpeed * dt
      this._breeze = Math.sin(this._breezePhase) * this._breezeAmp
    } else {
      this._breeze = 0
    }
    this._sinceScore += dt
    const wind = this._gust + this._breeze
    const helpBoost = this._sinceScore > AUTO_HELP_AFTER ? 2.2 : 1 // mild auto-hjälp (no-fail)

    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      const b = this._bubbles[i]
      if (!b || b.destroyed) { this._bubbles.splice(i, 1); continue }
      if (b._popped) continue // pop/score-tween styr den; rör inte positionen

      // Stiga uppåt + vaggla.
      b.y -= b._vy * dt
      b._phase += b._wobbleSpeed * dt

      // Vind ger en KRAFT -> acceleration = kraft / massa (lätta blåser mer).
      b._vx += (wind / b._mass) * dt

      // Mjuk "sug" mot ringen när bubblan närmar sig (förlåtande infångning).
      const dxh = this._hoopX - b.x
      const inBandX = Math.abs(dxh) < this._hoopR * 1.9
      const inBandY = b.y < this._hoopY + 240 && b.y > this._hoopY - 70
      if (inBandX && inBandY) {
        const near = 1 - Math.min(1, Math.abs(dxh) / (this._hoopR * 1.9))
        b._vx += Math.sign(dxh) * PULL * (0.4 + near) * helpBoost * dt
      }

      // Luftmotstånd + tak.
      b._vx *= Math.pow(VX_DRAG, dtF)
      b._vx = clamp(b._vx, -VX_MAX, VX_MAX)

      // Integrera basläge; studsa mjukt mot kanterna.
      b._baseX += b._vx * dt
      if (b._baseX < b._r) { b._baseX = b._r; b._vx = Math.abs(b._vx) * 0.5 }
      else if (b._baseX > ctx.width - b._r) { b._baseX = ctx.width - b._r; b._vx = -Math.abs(b._vx) * 0.5 }

      b.x = b._baseX + Math.sin(b._phase) * b._wobbleAmp

      // Infångning: bubblans mitt inne i ringen -> poäng.
      if (!this._resolving && Math.hypot(b.x - this._hoopX, b.y - this._hoopY) < this._hoopR * 0.8) {
        this._scoreBubble(ctx, b)
        continue
      }

      // Drev förbi toppen -> ta bort mjukt.
      if (b.y < -b._r - 20) {
        this._bubbles.splice(i, 1)
        gsap.killTweensOf(b)
        gsap.killTweensOf(b.scale)
        if (!b.destroyed) b.destroy({ children: true })
      }
    }

    // Fyll alltid på.
    while (this._alive && this._bubbles.length < TARGET_BUBBLES) this._spawn(ctx, false)

    // Mild om-uppmaning vid paus.
    this._idle += dt
    if (this._idle > IDLE_DELAY) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      const live = this._bubbles.filter((b) => b && !b.destroyed && !b._popped)
      if (live.length) {
        const b = randomFrom(live)
        gsap.to(b.scale, { x: b.scale.x * 1.18, y: b.scale.y * 1.18, duration: 0.22, yoyo: true, repeat: 3 })
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._levelTimer?.kill()
    this._hoopTween?.kill()
    this._fanBlades?.forEach((bl) => { if (bl && !bl.destroyed) gsap.killTweensOf(bl) })
    this._fanBlades = []
    this._bubbles?.forEach((b) => {
      if (b && !b.destroyed) {
        gsap.killTweensOf(b)
        gsap.killTweensOf(b.scale)
      }
    })
    this._bubbles = []
    this._pipNodes?.forEach((p) => { if (p && !p.destroyed) gsap.killTweensOf(p.scale) })
    this._pipNodes = []
    if (this._hoopGlow && !this._hoopGlow.destroyed) gsap.killTweensOf(this._hoopGlow.scale)
    if (this._hoop && !this._hoop.destroyed) gsap.killTweensOf(this._hoop.scale)
    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onCatch)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
