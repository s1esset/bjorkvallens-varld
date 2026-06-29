// Kittla Figuren — ren orsak-och-verkan-lek (2–5 år). En stor, gosig figur står
// mitt på en mjuk godis-scen. Varje tryck på en kittelzon (huvud, mage, kinder,
// fötter, öron/horn) ger ett OMEDELBART fnitter: figuren skuttar, ansiktet
// skrattar, ögonen knips ihop, gnistror/ringar/skratt-emoji yr och ett glatt
// ljud spelas (<100 ms). Inga felsteg, ingen timer, inget slut.
//
// DJUP (anti-upprepning): figuren byter SKEPNAD varje runda (klump, björn, kanin,
// monster) med egen färg, egna öron/horn och eget fnitter. Ju högre nivå
// (ctx.progress.highestLevel), desto fler kittelzoner — och från nivå 2 blir det
// en mild "kittel-följd": en zon LYSER, kittla den, nästa lyser … tills ett stort
// skratt + delat firande (ctx.progress.complete: ljud/beröm/konfetti/stjärna/
// klistermärke). Att kittla en icke-lysande zon fnissar ändå — ALDRIG fel.
//
// Allt ritas programmatiskt (Pixi Graphics + emoji) — inga externa tillgångar.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { pop, wiggle, puff, sparkle, floatText, ripple, burst, breathe } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { COLORS, DESIGN_W } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

// --- layout (designkoordinater, figur-rummet är centrerat i this._figure) ---
const CX = 640
const FIG_Y = 392
const HEAD_Y = -208 // huvudets mitt relativt figurmitten
const BELLY_Y = 42
const FOOT_X = 94
const FOOT_Y = 184
const CHEEK_DX = 70 // kinder, huvud-lokalt
const CHEEK_DY = 24
const ZONE_R = 64 // träffradie (Ø 128px ≥ 96px-kravet)
const MAX_LEVEL = 6

const MOUTH = 0x5a2d22 // mörk mun/kontur
const CHEEK = 0xff8fa3 // rosa kinder
const HORN = 0xffe7a8 // ljus horn/tand-färg

// Svävande skratt-emoji vid kittling.
const LAUGH_EMOJI = ['😄', '🤭', '❤️', '😆']

// Figurens skepnader — varje runda en ny för variation (egen färg + fnitter).
const SPECIES = [
  {
    key: 'klump',
    short: 'En klump!',
    intro: 'En liten klump! Kittla den!',
    giggles: ['Hihi!', 'Blubb, hihi!', 'Mer, mer!'],
    colors: [COLORS.teal, COLORS.blue, COLORS.purple, COLORS.pink],
    body: { w: 326, h: 286, r: 132 },
    headR: 100,
    ear: 'antenn',
  },
  {
    key: 'bjorn',
    short: 'En björn!',
    intro: 'En björn! Kittla björnen!',
    giggles: ['Hoho!', 'Hihi, mer!', 'Det kittlas!'],
    colors: [COLORS.brown, COLORS.orange, 0xc98a5b],
    body: { w: 300, h: 296, r: 96 },
    headR: 110,
    ear: 'oron',
  },
  {
    key: 'kanin',
    short: 'En kanin!',
    intro: 'En kanin! Kittla kaninen!',
    giggles: ['Hihi!', 'Hopp hopp, hihi!', 'Mer!'],
    colors: [COLORS.pink, 0xf4c6dd, COLORS.purple],
    body: { w: 280, h: 296, r: 116 },
    headR: 100,
    ear: 'langoron',
  },
  {
    key: 'monster',
    short: 'Ett monster!',
    intro: 'Ett gulligt monster! Kittla monstret!',
    giggles: ['Hahaha!', 'Hihi, sluta!', 'Mer kittel!'],
    colors: [COLORS.green, COLORS.purple, COLORS.teal, COLORS.red],
    body: { w: 312, h: 286, r: 82 },
    headR: 106,
    ear: 'horn',
  },
]

// Mörkare/ljusare nyans av en kroppsfärg (kontur respektive mage/öra-markering).
function darken(hex, amt = 0.22) {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
function lighten(hex, amt = 0.55) {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  const l = (v) => Math.round(v + (255 - v) * amt)
  return (l(r) << 16) | (l(g) << 8) | l(b)
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export default {
  id: 'kittla-figuren',
  titleSv: 'Kittla Figuren',
  icon: '😄',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'kittla-figuren',
  voiceIntro: 'Kittla figuren så att den skrattar! Tryck på magen, huvudet och fötterna.',

  init(ctx) {
    this._alive = true
    this._ctx = ctx
    this.services = ctx.services
    this._idle = 0
    this._resolving = false
    this._count = 0
    this._goal = 5
    this._mode = 'free'
    this._seq = []
    this._seqStep = 0
    this._giggleIdx = 0
    this._level = clamp(ctx.progress.get().highestLevel || 0, 0, MAX_LEVEL)
    this._speciesIdx = Math.floor(Math.random() * SPECIES.length)
    this._lastColor = null
    this._parts = {}
    this._zones = []
    this._dots = []

    this._layer = new Container()
    ctx.stage.addChild(this._layer)

    // Polerad godis-scen (gradient + bokeh). Dekorativ, FÖRSTA barnet.
    this._scene = createScene('candy', { width: ctx.width, height: ctx.height, ground: true })
    this._layer.addChild(this._scene)

    // Osynligt tap-fångar-lager (ovanför scenen, under figuren): tomt tryck.
    const tap = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tap.eventMode = 'static'
    tap.on('pointertap', () => this._emptyTap(ctx))
    this._layer.addChild(tap)

    // Mjuk skugga under figuren (skalas vid skutt).
    this._shadow = new Graphics().ellipse(0, 0, 150, 34).fill({ color: COLORS.shadow, alpha: 0.16 })
    this._shadow.position.set(CX, FIG_Y + 196)
    this._shadow.eventMode = 'none'
    this._layer.addChild(this._shadow)

    // Figur-rot (persistent): skuttar/skvalpar som helhet.
    this._figure = new Container()
    this._figure.position.set(CX, FIG_Y)
    this._figure.eventMode = 'passive'
    this._layer.addChild(this._figure)

    this._startRound(ctx, true)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- rundans uppbyggnad -------------------------------------------------

  _configForLevel(level) {
    if (level <= 0) return { mode: 'free', goal: 5, zoneLevel: 0 }
    if (level === 1) return { mode: 'free', goal: 6, zoneLevel: 1 }
    return { mode: 'sequence', goal: clamp(2 + (level - 2), 2, 5), zoneLevel: 2 }
  },

  _startRound(ctx, first) {
    this._clearChar()
    // Återställ den persistenta figurens transform.
    gsap.killTweensOf(this._figure)
    gsap.killTweensOf(this._figure.scale)
    this._figure.rotation = 0
    this._figure.scale.set(1)
    this._figure.position.set(CX, FIG_Y)
    if (this._shadow) {
      gsap.killTweensOf(this._shadow.scale)
      this._shadow.scale.set(1)
    }

    this._resolving = false
    this._count = 0
    this._seqStep = 0
    this._giggleIdx = 0
    this._idle = 0

    const cfg = this._configForLevel(this._level)
    this._mode = cfg.mode
    this._goal = cfg.goal

    this._buildChar(ctx)
    this._buildZones(cfg.zoneLevel)
    this._buildDots(this._goal)
    this._fillDots(0)
    this._startBreathe()
    this._scheduleBlink()

    if (this._mode === 'sequence') {
      this._seq = shuffle(this._zones).slice(0, this._goal)
      this._setGlow(this._seq[0])
    }

    const sp = this._species
    if (first) ctx.services.voice.say(this.voiceIntro)
    else if (this._mode === 'sequence') ctx.services.voice.say(`${sp.short} Kittla där det lyser!`)
    else ctx.services.voice.say(sp.intro)

    pop(this._figure) // liten "fräsch start"-studs
  },

  _buildChar(ctx) {
    const sp = SPECIES[this._speciesIdx]
    this._species = sp
    const pool = sp.colors.filter((c) => c !== this._lastColor)
    const color = randomFrom(pool.length ? pool : sp.colors)
    this._lastColor = color
    const dark = darken(color)

    const char = new Container()
    char.eventMode = 'passive'
    this._char = char
    this._figure.addChild(char)
    const p = this._parts

    // Fötter (bakom kroppen, "tittar fram").
    p.footL = this._g(-FOOT_X, FOOT_Y)
    p.footR = this._g(FOOT_X, FOOT_Y)
    for (const f of [p.footL, p.footR]) f.ellipse(0, 0, 58, 34).fill(color).stroke({ width: 8, color: dark })
    char.addChild(p.footL, p.footR)

    // Kropp + armar.
    const bw = sp.body.w
    const bh = sp.body.h
    const br = sp.body.r
    p.body = this._g(0, 0)
    p.body
      .roundRect(-bw / 2 - 40, -54, 48, 156, 24)
      .fill(color)
      .stroke({ width: 8, color: dark })
      .roundRect(bw / 2 - 8, -54, 48, 156, 24)
      .fill(color)
      .stroke({ width: 8, color: dark })
      .roundRect(-bw / 2, -150, bw, bh, br)
      .fill(color)
      .stroke({ width: 8, color: dark })
    char.addChild(p.body)

    // Mage-markering (ljusare cirkel — kittelzon).
    p.belly = this._g(0, BELLY_Y)
    p.belly.circle(0, 0, 88).fill({ color: lighten(color), alpha: 0.85 })
    char.addChild(p.belly)

    // Huvud-container (skakar/andas som enhet).
    const head = new Container()
    head.position.set(0, HEAD_Y)
    head.eventMode = 'none'
    p.head = head
    char.addChild(head)

    // Öron/horn (bakom huvudet) + zon-geometri.
    this._drawEar(head, sp, color, dark)

    p.headG = this._g(0, 0)
    p.headG.circle(0, 0, sp.headR).fill(color).stroke({ width: 8, color: dark })
    head.addChild(p.headG)

    // Björn får en ljus nos.
    if (sp.ear === 'oron') {
      const snout = this._g(0, 30)
      snout.ellipse(0, 0, 54, 40).fill({ color: lighten(color, 0.4) })
      snout.circle(0, -6, 11).fill(MOUTH)
      head.addChild(snout)
    }

    p.eyeL = this._makeEye(-38, -12)
    p.eyeR = this._makeEye(38, -12)
    p.cheekL = this._g(-CHEEK_DX, CHEEK_DY)
    p.cheekR = this._g(CHEEK_DX, CHEEK_DY)
    for (const c of [p.cheekL, p.cheekR]) c.circle(0, 0, 26).fill({ color: CHEEK, alpha: 0.92 })
    p.mouth = this._g(0, 34)
    head.addChild(p.eyeL, p.eyeR, p.cheekL, p.cheekR, p.mouth)
    this._drawMouth(false)

    // Glöd-ring (kittel-följd). Bakom zonerna, framför kroppen.
    this._glow = new Graphics()
    this._glow.eventMode = 'none'
    this._glow.visible = false
    char.addChild(this._glow)
  },

  // Ritar öron/horn i huvudet och sätter this._geo (öronzonens läge).
  _drawEar(head, sp, color, dark) {
    const R = sp.headR
    let ex = 56
    let baseY = -R + 16 // ankare i huvud-lokalt rum
    const earL = new Container()
    const earR = new Container()
    this._parts.earL = earL
    this._parts.earR = earR

    const paint = (g) => {
      if (sp.ear === 'antenn') {
        ex = 36
        g.roundRect(-4, -46, 8, 50, 4).fill(dark)
        g.circle(0, -52, 14).fill(color).stroke({ width: 6, color: dark })
      } else if (sp.ear === 'oron') {
        ex = 60
        g.circle(0, 0, 34).fill(color).stroke({ width: 8, color: dark })
        g.circle(0, 0, 17).fill({ color: lighten(color, 0.45) })
      } else if (sp.ear === 'langoron') {
        ex = 42
        g.roundRect(-17, -150, 34, 158, 17).fill(color).stroke({ width: 8, color: dark })
        g.roundRect(-9, -134, 18, 124, 9).fill({ color: lighten(color, 0.5) })
      } else if (sp.ear === 'horn') {
        ex = 48
        g.poly([-17, 6, 17, 6, 0, -58]).fill(HORN).stroke({ width: 7, color: darken(HORN, 0.35) })
      }
    }

    const gL = new Graphics()
    paint(gL)
    earL.addChild(gL)
    const gR = new Graphics()
    paint(gR)
    earR.addChild(gR)

    earL.position.set(-ex, baseY)
    earR.position.set(ex, baseY)
    head.addChildAt(earL, 0)
    head.addChildAt(earR, 0)

    // Öronzonens figur-lokala läge (ovanpå örat/hornet).
    this._geo = { earX: ex, earY: baseY - 30 }
  },

  _g(x, y) {
    const g = new Graphics()
    g.position.set(x, y)
    g.eventMode = 'none'
    return g
  },

  _makeEye(x, y) {
    const e = new Container()
    e.position.set(x, y)
    e.eventMode = 'none'
    const w = new Graphics().circle(0, 0, 21).fill(0xffffff).stroke({ width: 3, color: MOUTH })
    const pupil = new Graphics().circle(0, 5, 11).fill(0x33271f)
    const shine = new Graphics().circle(5, 0, 4).fill(0xffffff)
    e.addChild(w, pupil, shine)
    return e
  },

  // Mun: liten glad båge eller stort öppet skratt.
  _drawMouth(open) {
    const m = this._parts.mouth
    if (!m || m.destroyed) return
    m.clear()
    if (open) {
      m.arc(0, 0, 42, 0, Math.PI).fill(MOUTH)
      m.circle(0, 28, 14).fill(COLORS.red) // tunga
    } else {
      m.arc(0, -8, 40, 0.16 * Math.PI, 0.84 * Math.PI).stroke({ width: 9, color: MOUTH, cap: 'round' })
    }
  },

  _buildZones(zoneLevel) {
    this._zones = []
    const list = [
      ['huvud', 0, HEAD_Y],
      ['mage', 0, BELLY_Y],
      ['fot_v', -FOOT_X, FOOT_Y],
      ['fot_h', FOOT_X, FOOT_Y],
    ]
    if (zoneLevel >= 1) {
      list.push(['kind_v', -CHEEK_DX, HEAD_Y + CHEEK_DY], ['kind_h', CHEEK_DX, HEAD_Y + CHEEK_DY])
    }
    if (zoneLevel >= 2 && this._geo) {
      list.push(['ora_v', -this._geo.earX, HEAD_Y + this._geo.earY], ['ora_h', this._geo.earX, HEAD_Y + this._geo.earY])
    }
    for (const [kind, zx, zy] of list) {
      const z = new Container()
      z.position.set(zx, zy)
      z.hitArea = new Circle(0, 0, ZONE_R)
      z.eventMode = 'static'
      z.cursor = 'pointer'
      z._kind = kind
      z._until = 0
      z.on('pointertap', () => this._tickle(z))
      this._char.addChild(z)
      this._zones.push(z)
    }
  },

  _buildDots(n) {
    if (this._dotsWrap) {
      this._dots.forEach((d) => gsap.killTweensOf(d.scale))
      this._dotsWrap.destroy({ children: true })
    }
    const wrap = new Container()
    wrap.eventMode = 'none'
    this._layer.addChild(wrap)
    this._dotsWrap = wrap
    this._dots = []
    const gap = 54
    const startX = DESIGN_W / 2 - ((n - 1) * gap) / 2
    for (let i = 0; i < n; i++) {
      const d = new Graphics()
      d.position.set(startX + i * gap, 666)
      d.eventMode = 'none'
      wrap.addChild(d)
      this._dots.push(d)
    }
  },

  _fillDots(n) {
    for (let i = 0; i < this._dots.length; i++) {
      const d = this._dots[i].clear().circle(0, 0, 14)
      if (i < n) d.fill(this._lastColor ?? COLORS.orange)
      else d.fill({ color: COLORS.inkSoft, alpha: 0.22 })
    }
  },

  // ---- kittling -----------------------------------------------------------

  _tickle(zon) {
    const ctx = this._ctx
    if (!this._alive || this._resolving) return
    const now = performance.now()
    if (now < zon._until) return // mjuk debounce mot snabbtryck på SAMMA zon
    zon._until = now + 200
    this._idle = 0

    // Omedelbart ljud (<100 ms).
    this.services.audio.sfx(randomFrom(['pop', 'pop', 'pling']))

    // Saftig kropps-reaktion + ansikte + zon-specifik krydda.
    this._giggle()
    this._react(zon._kind)

    // Partiklar vid själva trycket (i layer-koordinater).
    const lp = this._layer.toLocal(zon.getGlobalPosition())
    ripple(this._layer, lp.x, lp.y, { color: lighten(this._lastColor, 0.4), maxR: 92, alpha: 0.55 })
    puff(this._layer, lp.x, lp.y, { count: 7 })
    if (Math.random() < 0.6) sparkle(this._layer, lp.x, lp.y, { count: 5 })
    if (Math.random() < 0.5) floatText(this._layer, lp.x, lp.y - 18, randomFrom(LAUGH_EMOJI), { fontSize: 56 })

    if (this._mode === 'sequence') {
      const target = this._seq[this._seqStep]
      if (zon === target) {
        // Rätt steg i följden: distinkt fnitter + nästa lyser.
        this.services.audio.sfx('correct')
        this.services.voice.say(this._species.giggles[this._giggleIdx % this._species.giggles.length])
        this._giggleIdx++
        this._seqStep++
        this._fillDots(this._seqStep)
        if (this._dots[this._seqStep - 1]) pop(this._dots[this._seqStep - 1])
        if (this._seqStep >= this._goal) return this._celebrateRound(ctx)
        this._setGlow(this._seq[this._seqStep])
      } else if (Math.random() < 0.3) {
        // Fel zon = ändå skoj (NO-FAIL), bara sparsam röst.
        this.services.voice.say(randomFrom(this._species.giggles))
      }
      return
    }

    // Fri kittling: räkna upp tills rundan är full.
    this._count++
    this._fillDots(this._count)
    if (this._dots[this._count - 1]) pop(this._dots[this._count - 1])
    if (Math.random() < 0.3 && this._count < this._goal) {
      this.services.voice.say(randomFrom(this._species.giggles))
    }
    if (this._count >= this._goal) this._celebrateRound(ctx)
  },

  // Hela giggel-paketet: skvätt-skala + skutt + vingel + skrattande ansikte.
  _giggle() {
    this._squash()
    this._hop()
    wiggle(this._figure)
    this._laugh()
  },

  _laugh() {
    this._drawMouth(true)
    const eyes = [this._parts.eyeL?.scale, this._parts.eyeR?.scale].filter(Boolean)
    if (eyes.length) {
      gsap.killTweensOf(eyes)
      gsap.to(eyes, { y: 0.18, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.inOut' })
    }
    this._mouthTimer?.kill()
    this._mouthTimer = gsap.delayedCall(0.5, () => {
      if (this._alive && !this._resolving) this._drawMouth(false)
    })
  },

  // Squash & stretch på den persistenta figuren.
  _squash() {
    const f = this._figure
    gsap.killTweensOf(f.scale)
    gsap
      .timeline()
      .to(f.scale, { x: 1.1, y: 0.9, duration: 0.09, ease: 'power2.out' })
      .to(f.scale, { x: 0.95, y: 1.06, duration: 0.1, ease: 'power2.out' })
      .to(f.scale, { x: 1, y: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)' })
  },

  _hop(big = false) {
    const f = this._figure
    gsap.killTweensOf(f, 'y')
    const dip = big ? 30 : 20
    gsap.to(f, {
      y: FIG_Y - dip,
      duration: 0.14,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
      onComplete: () => {
        if (!f.destroyed) f.y = FIG_Y
      },
    })
    if (this._shadow) {
      gsap.killTweensOf(this._shadow.scale)
      gsap.to(this._shadow.scale, {
        x: 0.82,
        y: 0.82,
        duration: 0.14,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out',
        onComplete: () => {
          if (!this._shadow.destroyed) this._shadow.scale.set(1)
        },
      })
    }
  },

  // Zon-specifik rörelse — varje kittel-ställe svarar på sitt sätt.
  _react(kind) {
    const p = this._parts
    switch (kind) {
      case 'huvud': {
        const h = p.head
        gsap.killTweensOf(h, 'rotation')
        gsap
          .timeline({
            onComplete: () => {
              if (!h.destroyed) h.rotation = 0
            },
          })
          .to(h, { rotation: 0.18, duration: 0.06 })
          .to(h, { rotation: -0.18, duration: 0.06 })
          .to(h, { rotation: 0, duration: 0.06 })
        break
      }
      case 'mage':
        pop(p.belly)
        this._hop(true)
        break
      case 'fot_v':
        this._kick(p.footL)
        break
      case 'fot_h':
        this._kick(p.footR)
        break
      case 'kind_v':
        pop(p.cheekL)
        break
      case 'kind_h':
        pop(p.cheekR)
        break
      case 'ora_v':
        this._wiggleEar(p.earL, -1)
        break
      case 'ora_h':
        this._wiggleEar(p.earR, 1)
        break
    }
  },

  _kick(foot) {
    if (!foot || foot.destroyed) return
    const y0 = FOOT_Y
    gsap.killTweensOf(foot, 'y')
    gsap.to(foot, {
      y: y0 - 26,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
      onComplete: () => {
        if (!foot.destroyed) foot.y = y0
      },
    })
  },

  _wiggleEar(ear, dir) {
    if (!ear || ear.destroyed) return
    gsap.killTweensOf(ear, 'rotation')
    gsap.to(ear, {
      rotation: dir * 0.4,
      duration: 0.08,
      yoyo: true,
      repeat: 3,
      ease: 'sine.inOut',
      onComplete: () => {
        if (!ear.destroyed) ear.rotation = 0
      },
    })
  },

  // Flytta/visa glöd-ringen runt nästa kittel-mål (andas för att locka).
  _setGlow(zon) {
    const g = this._glow
    if (!g || g.destroyed || !zon) return
    this._glowTween?.kill()
    g.visible = true
    g.position.set(zon.x, zon.y)
    g.scale.set(1)
    g.clear()
      .circle(0, 0, ZONE_R + 4)
      .fill({ color: COLORS.yellow, alpha: 0.18 })
      .circle(0, 0, ZONE_R + 4)
      .stroke({ width: 10, color: 0xffffff, alpha: 0.9 })
    this._glowTween = breathe(g, { scale: 1.16, duration: 0.7 })
  },

  // ---- liv & idle ---------------------------------------------------------

  _startBreathe() {
    this._breatheTween?.kill()
    if (this._parts.head && !this._parts.head.destroyed) {
      this._breatheTween = breathe(this._parts.head, { scale: 1.04, duration: 1.2 })
    }
  },

  _scheduleBlink() {
    this._blinkTimer?.kill()
    this._blinkTimer = gsap.delayedCall(2 + Math.random() * 3.5, () => {
      if (!this._alive) return
      if (!this._resolving) this._blink()
      this._scheduleBlink()
    })
  },

  _blink() {
    const eyes = [this._parts.eyeL?.scale, this._parts.eyeR?.scale].filter(Boolean)
    if (!eyes.length) return
    gsap.to(eyes, { y: 0.12, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.inOut' })
  },

  // Tomt tryck bredvid zonerna: lekfull vingel + mjukt ljud. Aldrig "fel".
  _emptyTap(ctx) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    wiggle(this._figure)
  },

  // Runda klar: stort skratt + delat firande, sedan ny skepnad/runda.
  _celebrateRound(ctx) {
    this._resolving = true
    this._idle = 0
    this._glowTween?.kill()
    if (this._glow && !this._glow.destroyed) this._glow.visible = false
    this._drawMouth(true)

    const f = this._figure
    gsap.killTweensOf(f.scale)
    gsap.to(f.scale, {
      x: 1.14,
      y: 1.14,
      duration: 0.18,
      yoyo: true,
      repeat: 3,
      ease: 'sine.inOut',
      onComplete: () => {
        if (!f.destroyed) f.scale.set(1)
      },
    })
    // Lokal partikel-skur (kompletterar shellens konfetti — inget dubbelfirande).
    burst(this._layer, CX, FIG_Y + HEAD_Y, { count: 18, power: 1.2 })

    // complete() sköter celebrate-ljud, beröm-röst, konfetti, stjärna, klistermärke.
    ctx.progress.complete()

    // Väx i djup (fler zoner / kittel-följd) och spara framstegen.
    this._level = clamp(this._level + 1, 0, MAX_LEVEL)
    ctx.progress.setLevel(this._level)

    this._newRoundCall?.kill()
    this._newRoundCall = gsap.delayedCall(1.6, () => {
      if (!this._alive) return
      this._speciesIdx = (this._speciesIdx + 1) % SPECIES.length
      this._startRound(ctx, false)
    })
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6 && !this._resolving) {
      this._idle = 0
      const msg = this._mode === 'sequence' && this._glow?.visible ? 'Kittla där det lyser!' : this.voiceIntro
      ctx.services.voice.say(msg)
      this._react('huvud')
      pop(this._figure)
    }
  },

  // ---- städning ----------------------------------------------------------

  // Objekt i nuvarande skepnad som kan ha tweens.
  _charObjs() {
    const p = this._parts
    return [
      p.footL,
      p.footR,
      p.body,
      p.belly,
      p.head,
      p.headG,
      p.eyeL,
      p.eyeR,
      p.cheekL,
      p.cheekR,
      p.mouth,
      p.earL,
      p.earR,
      this._glow,
      ...this._zones,
    ].filter(Boolean)
  },

  _killTweens(objs) {
    for (const o of objs) {
      if (!o) continue
      gsap.killTweensOf(o)
      if (o.scale) gsap.killTweensOf(o.scale)
    }
  },

  // Riv nuvarande skepnad (tweens + timers) inför ny runda.
  _clearChar() {
    this._blinkTimer?.kill()
    this._blinkTimer = null
    this._breatheTween?.kill()
    this._breatheTween = null
    this._glowTween?.kill()
    this._glowTween = null
    this._mouthTimer?.kill()
    this._mouthTimer = null
    this._killTweens(this._charObjs())
    this._zones = []
    if (this._char) {
      this._char.destroy({ children: true })
      this._char = null
    }
    this._parts = {}
    this._glow = null
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx.ticker.remove(this._tick)
    this._blinkTimer?.kill()
    this._breatheTween?.kill()
    this._glowTween?.kill()
    this._mouthTimer?.kill()
    this._newRoundCall?.kill()
    this._killTweens([this._figure, this._shadow, ...this._charObjs(), ...this._dots])
    ctx.services.voice.cancel()
    gsap.killTweensOf(this._layer)
    this._layer?.destroy({ children: true })
  },
}
