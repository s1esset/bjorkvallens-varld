// Spåra Linjen — lugn motorik-/rita-själv-lek (3–5 år). Scenen är ett ritbord: ett
// papper med en blek konturskiss av det man ska rita, och under det en trälåda med
// fem vaxkritor. Barnet VÄLJER krita (färgen linjen får, bytbar mitt i en teckning,
// och valet minns sig till nästa gång), sätter fingret på startpricken (som pulsar)
// och drar längs den prickade vägen. ENDAST nästa prick i ordningen är aktiv: når
// fingret den "tänds" den (fylls med kritans färg, ett färgat segment ritas från
// föregående prick och den ritade pennspetsen flyttas dit). Att hoppa till
// en prick längre fram gör INGET (man kan inte "fuska" sig framåt) — den rätta nästa-
// pricken vinkar i stället vänligt (mjuk vingel + puls + mjukt ljud). Inget kan bli fel:
// straying ignoreras (pennan stannar på vägen, aldrig omstart) och allt drivs lika gärna
// med tap-tap (tappa nästa prick) som med drag. Står barnet stilla en stund tänds nästa
// prick automatiskt (auto-hjälp) så rundan ALLTID blir klar. Klart = hela linjen färglagd
// → motivet vaknar (fylls, får ögon) + ny, svårare form (oändlig, stigande lek). Allt
// ritas programmatiskt (Pixi Graphics) — inga filer, ingen emoji.
//
// SVÅRIGHET: varje klarad runda höjer nivån. FÖRSTA rundan är ett motiv (ett berg), så
// det första barnet ser är en bild att rita. Tidiga nivåer = få prickar, mjuka vägar;
// senare nivåer = fler prickar och mer avancerade former (vågor, sicksack, trappor,
// trianglar, fyrkanter, spiraler, stjärnor). Bortom planen fortsätter leken oändligt med
// slumpade avancerade former som blir allt tätare.
//
// OBS: DragController passar inte här (den snäpper föremål till mål). Spårningen är en
// egen pekar-lyssnare på själva ritytan, men följer samma snäll-principer (stora
// träffytor, tap-tap-fallback, snäll respons på varje pekning).
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { bounceIn, breathe, pop, wiggle, sparkle, bigCelebration } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, PRAISE, shade, tint } from '../../lib/theme.js'

// Layout i designkoordinater (1280×720). Pappret ligger på ett ritbord: under det
// står kritlådan, så scenen är ett skrivbord med papper och kritor — inte ett
// ensamt vitt fält.
const PAPER = { x: 120, y: 86, w: 1040, h: 424, r: 40 }
const TRAY = { x: 230, y: 566, w: 820, h: 128, r: 24 } // kritlådan under pappret
const CRAYON_Y = 600 // kritornas mittpunkt (de sticker upp ur lådan)
const CRAYON_XS = [320, 480, 640, 800, 960] // 160 px isär → 36 px mellan träffytorna
const DOT_R = 34 // vägpunkts-radie
const HIT_R = 70 // osynlig träffradie (≥96px Ø träffyta) — generös korridor
const INK_W = 22 // tjocklek på det färglagda spåret
const IDLE_DELAY = 6 // s utan interaktion innan röst-recue + puls
const AUTO_DELAY = 14 // s utan interaktion → auto-tänd EN prick, vänta sedan på barnet igen (no-fail)

// Kritorna barnet väljer mellan. Färgen barnet väljer ÄR färgen linjen får — och
// den kan bytas mitt i en teckning, så spåret blir barnets eget färgval.
const CRAYONS = [
  { color: COLORS.red, say: 'Röd krita!' },
  { color: COLORS.yellow, say: 'Gul krita!' },
  { color: COLORS.green, say: 'Grön krita!' },
  { color: COLORS.blue, say: 'Blå krita!' },
  { color: COLORS.purple, say: 'Lila krita!' },
]

// Logisk ruta som alla formgeneratorer ritar inom (med marginal till papperskanten).
const BOX = { x0: 250, x1: 1030, cx: 640, top: 164, bot: 432, cy: 298 }

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
// ---- MOTIV: prickarna bildar en BILD ---------------------------------------
// Det viktigaste lyftet i spelet: i stället för en abstrakt form spårar barnet
// konturen av något — ett berg, ett hus, en fisk — och när linjen sluts fylls
// motivet med färg och får ögon och ett leende. Man ritar NÅGOT.
// Koordinater är normaliserade i [-1, 1] och skalas in i MOTIF_BOX.
const MOTIF_BOX = { cx: 640, cy: 298, w: 580, h: 288 }

const MOTIFS = [
  {
    key: 'berg', say: 'Titta, ett berg!', close: 'base',
    pts: [[-1, 0.9], [-0.56, -0.15], [-0.2, 0.35], [0.16, -0.85], [0.62, 0.2], [1, 0.9]],
    eyes: [[-0.3, 0.45], [0.06, 0.45]], mouth: [-0.12, 0.66],
    detail: (g, P, col) => {
      // snötopp på den höga toppen
      g.moveTo(...P(-0.02, -0.4)).lineTo(...P(0.16, -0.85)).lineTo(...P(0.34, -0.4))
        .quadraticCurveTo(...P(0.16, -0.24), ...P(-0.02, -0.4)).fill(0xfffdf7)
    },
  },
  {
    key: 'hus', say: 'Titta, ett hus!', close: 'polygon',
    pts: [[-0.82, 0.9], [-0.82, -0.08], [0, -0.9], [0.82, -0.08], [0.82, 0.9], [-0.3, 0.9]],
    eyes: null, mouth: null,
    detail: (g, P, col) => {
      g.rect(...P(-0.2, 0.1), 0.4 * MOTIF_BOX.w / 2, 0.8 * MOTIF_BOX.h / 2).fill(0x8a5a3b) // dörr
      g.circle(...P(-0.06, 0.5), 7).fill(0xffd35c)
      g.rect(...P(-0.62, 0.06), 0.28 * MOTIF_BOX.w / 2, 0.34 * MOTIF_BOX.h / 2).fill(0xbfe9ff) // fönster
      g.rect(...P(0.34, 0.06), 0.28 * MOTIF_BOX.w / 2, 0.34 * MOTIF_BOX.h / 2).fill(0xbfe9ff)
    },
  },
  {
    key: 'fisk', say: 'Titta, en fisk!', close: 'polygon',
    pts: [[-0.9, 0], [-0.35, -0.55], [0.3, -0.45], [0.72, -0.75], [0.72, 0.75], [0.3, 0.45], [-0.35, 0.55]],
    eyes: [[-0.52, -0.16]], mouth: [-0.78, 0.1],
  },
  {
    key: 'hjarta', say: 'Titta, ett hjärta!', close: 'polygon',
    pts: [[0, 0.92], [-0.86, 0.02], [-0.76, -0.62], [-0.3, -0.78], [0, -0.36], [0.3, -0.78], [0.76, -0.62], [0.86, 0.02]],
    eyes: [[-0.28, -0.1], [0.28, -0.1]], mouth: [0, 0.2],
  },
  {
    key: 'moln', say: 'Titta, ett moln!', close: 'base',
    pts: [[-0.95, 0.55], [-0.78, -0.18], [-0.32, -0.6], [0.2, -0.75], [0.66, -0.38], [0.95, 0.1], [0.95, 0.55]],
    eyes: [[-0.26, -0.02], [0.14, -0.02]], mouth: [-0.06, 0.24],
  },
  {
    key: 'katt', say: 'Titta, en katt!', close: 'polygon',
    pts: [[-0.76, -0.2], [-0.56, -0.92], [-0.2, -0.52], [0.2, -0.52], [0.56, -0.92], [0.76, -0.2], [0.52, 0.7], [-0.52, 0.7]],
    eyes: [[-0.3, -0.1], [0.3, -0.1]], mouth: [0, 0.3],
    detail: (g, P, col) => {
      g.moveTo(...P(-0.1, 0.16)).lineTo(...P(0.1, 0.16)).lineTo(...P(0, 0.3)).closePath().fill(0xe79ab0) // nos
      for (const s of [-1, 1]) {
        g.moveTo(...P(s * 0.16, 0.24)).lineTo(...P(s * 0.68, 0.14))
          .moveTo(...P(s * 0.16, 0.34)).lineTo(...P(s * 0.68, 0.4))
          .stroke({ width: 3, color: 0xfffdf7, alpha: 0.9 })
      }
    },
  },
  {
    key: 'blomma', say: 'Titta, en blomma!', close: 'polygon',
    pts: (() => {
      const out = []
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k / 5) * Math.PI * 2
        const b = a + Math.PI / 5
        out.push([Math.cos(a), Math.sin(a)])
        out.push([Math.cos(b) * 0.42, Math.sin(b) * 0.42])
      }
      return out
    })(),
    eyes: [[-0.18, -0.06], [0.18, -0.06]], mouth: [0, 0.16],
  },
  {
    key: 'stjarna', say: 'Titta, en stjärna!', close: 'polygon',
    pts: [0, 2, 4, 1, 3].map((k) => {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5
      return [Math.cos(a), Math.sin(a)]
    }),
    eyes: [[-0.2, -0.04], [0.2, -0.04]], mouth: [0, 0.2],
  },
]

// Skala normaliserade motiv-punkter till designkoordinater.
function motifPoints(m) {
  const B = MOTIF_BOX
  return m.pts.map(([x, y]) => ({ x: B.cx + x * (B.w / 2), y: B.cy + y * (B.h / 2) }))
}

// Rita en tecknad penna (ersätter ✏️-emojin). Spetsen pekar nedåt-vänster och
// kroppen bär den valda kritans färg, så pennan i handen ÄR kritan barnet valt.
function paintPencil(g, color) {
  g.clear()
  g.moveTo(-26, 26).lineTo(-14, 8).lineTo(-2, 20).closePath().fill(0xf0d0a8) // träspets
  g.moveTo(-26, 26).lineTo(-19, 17).lineTo(-14, 22).closePath().fill(shade(color, 0.5)) // stift
  g.moveTo(-14, 8).lineTo(-2, 20).lineTo(18, -6).lineTo(6, -18).closePath().fill(color) // kropp
  g.moveTo(-8, 14).lineTo(12, -12).stroke({ width: 2, color: shade(color, 0.28), alpha: 0.7 })
  g.moveTo(6, -18).lineTo(18, -6).lineTo(24, -12).lineTo(12, -24).closePath().fill(0xb8c2ca) // hylsa
  g.moveTo(12, -24).lineTo(24, -12).lineTo(30, -18).lineTo(18, -30).closePath().fill(0xff9ec4) // suddgummi
}

// En fristående ritad vaxkrita (P0 ASSETS): spets, kropp, pappersetikett, dager.
function makeCrayon(color) {
  const c = new Container()
  const g = new Graphics()
  const dark = shade(color, 0.32)
  const deep = shade(color, 0.14)
  const wrap = tint(color, 0.64)
  g.roundRect(-26, -46, 52, 98, 12).fill(color) // kropp
  g.moveTo(-26, -40).lineTo(26, -40).lineTo(5, -78).quadraticCurveTo(0, -84, -5, -78).closePath().fill(deep) // spets
  g.moveTo(-8, -64).lineTo(5, -78).quadraticCurveTo(0, -84, -5, -78).closePath().fill(dark) // sliten udd
  g.roundRect(-26, -18, 52, 34, 6).fill(wrap) // pappersetikett
  g.moveTo(-26, -18).lineTo(26, -18).moveTo(-26, 16).lineTo(26, 16)
    .stroke({ width: 3, color: dark, alpha: 0.55 })
  g.roundRect(-18, -36, 7, 76, 4).fill({ color: COLORS.white, alpha: 0.22 }) // glansdager
  c.addChild(g)
  return c
}

// Kritlådan i trä — bakstycke (kritorna står i den) och framkant (döljer deras fötter).
function makeTrayBack() {
  const g = new Graphics()
  g.roundRect(TRAY.x, TRAY.y, TRAY.w, TRAY.h, TRAY.r).fill(0xc9945f)
  g.roundRect(TRAY.x + 16, TRAY.y + 10, TRAY.w - 32, 52, 14).fill({ color: COLORS.brown, alpha: 0.38 })
  g.eventMode = 'none'
  return g
}
function makeTrayFront() {
  const g = new Graphics()
  g.roundRect(TRAY.x, TRAY.y + 58, TRAY.w, TRAY.h - 58, 20).fill(0xdba873)
  g.moveTo(TRAY.x + 26, TRAY.y + 80).lineTo(TRAY.x + TRAY.w - 26, TRAY.y + 80)
    .stroke({ width: 5, color: 0xc9945f, alpha: 0.85 })
  g.moveTo(TRAY.x + 40, TRAY.y + 100).lineTo(TRAY.x + TRAY.w - 40, TRAY.y + 100)
    .stroke({ width: 3, color: 0xc9945f, alpha: 0.5 })
  g.eventMode = 'none'
  return g
}

// Stigande pentatonik: varje tänd prick spelar nästa ton -> linjen blir en melodi.
const MELODY = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760]

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
    const saved = ctx.progress.get()
    this._round = Math.max(0, saved.highestLevel | 0)
    // Vald krita minns sig mellan besök — barnets favoritfärg är dess egen.
    this._crayonIx = Math.min(CRAYONS.length - 1, Math.max(0, saved.custom?.krita | 0))
    this._color = CRAYONS[this._crayonIx].color

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

    // Motiv-siluett: blek kontur av det man ska rita (fylls vid completion).
    this._silhouette = new Graphics()
    this._silhouette.eventMode = 'none'
    this._root.addChild(this._silhouette)

    // Färglagt spår (under prickarna).
    this._ink = new Graphics()
    this._ink.eventMode = 'none'
    this._root.addChild(this._ink)

    // Prick-lager (ovanpå spåret) — prickarna fångar inga pekhändelser; ritytan gör det.
    this._dotsLayer = new Container()
    this._dotsLayer.eventMode = 'none'
    this._dotsLayer.interactiveChildren = false
    this._root.addChild(this._dotsLayer)

    // Ritad pennspets (ovanpå allt) — P0 ASSETS: eget föremål, inte en ✏️-emoji.
    this._pencil = new Container()
    this._pencilG = new Graphics()
    this._pencil.addChild(this._pencilG)
    this._pencil.eventMode = 'none'
    this._pencil.interactiveChildren = false
    paintPencil(this._pencilG, this._color)
    this._root.addChild(this._pencil)

    this._buildTray(ctx)

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

  // ---- Kritlådan: barnet väljer färg (och får byta mitt i en teckning) -----

  _buildTray(ctx) {
    this._tray = new Container()
    this._root.addChild(this._tray)
    this._tray.addChild(makeTrayBack())

    this._crayons = CRAYONS.map((c, i) => {
      const cr = makeCrayon(c.color)
      cr.position.set(CRAYON_XS[i], CRAYON_Y)
      cr.eventMode = 'static'
      cr.cursor = 'pointer'
      cr.hitArea = new Rectangle(-62, -90, 124, 180) // 124×180 (P0 ≥96), 26 px emellan
      cr.on('pointertap', () => this._pickCrayon(ctx, i))
      this._tray.addChild(cr)
      return cr
    })

    this._tray.addChild(makeTrayFront()) // framkanten döljer kritornas fötter
    this._liftCrayon(false)
  },

  // Den valda kritan lyfts ur lådan och ANDAS (den lever, alla andra står stilla och
  // en aning nedtonade) — så det syns utan ett ord vilken färg som är i handen.
  _liftCrayon(animate = true) {
    this._breath?.kill() // breathe() tweenar en proxy, inte .scale — måste dödas explicit
    this._breath = null
    this._crayons.forEach((cr, i) => {
      if (!cr || cr.destroyed) return
      const chosen = i === this._crayonIx
      const y = CRAYON_Y - (chosen ? 24 : 0)
      gsap.killTweensOf(cr)
      gsap.killTweensOf(cr.scale)
      cr.alpha = chosen ? 1 : 0.84
      cr.scale.set(1)
      if (animate) gsap.to(cr, { y, duration: 0.24, ease: 'back.out(2.4)' })
      else cr.y = y
      if (chosen) this._breath = breathe(cr, { scale: 1.1, duration: 1.1 })
    })
  },

  _pickCrayon(ctx, i) {
    if (!this._alive) return
    const c = CRAYONS[i]
    const changed = i !== this._crayonIx
    this._crayonIx = i
    this._color = c.color
    ctx.progress.setCustom('krita', i)
    this._idle = 0
    this._cued = false

    this._liftCrayon()
    paintPencil(this._pencilG, c.color) // pennan i handen ÄR kritan barnet valde
    ctx.services.audio.sfx('tap')
    // Kritorna är stämda i samma pentatonik som linjens melodi — lådan är ett
    // litet instrument, inte fem UI-blipp.
    ctx.services.audio.tone({ freq: MELODY[i], dur: 0.18, type: 'triangle', vol: 0.16 })
    sparkle(ctx.fxLayer, CRAYON_XS[i], CRAYON_Y - 62, { count: 6 })
    if (changed) ctx.services.voice.say(c.say)
    // Byte mitt i en teckning: skissen följer den nya färgen, redan dragna streck
    // behåller sin — spåret blir barnets egen färgblandning.
    if (!this._resolving) this._drawSilhouette()
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
    gsap.killTweensOf(this._dotsLayer)
    this._dotsLayer.alpha = 1
    this._ink.clear()
    if (this._silhouette && !this._silhouette.destroyed) {
      gsap.killTweensOf(this._silhouette.scale)
      this._silhouette.clear()
      this._silhouette.scale.set(1)
      this._silhouette.pivot.set(0, 0)
      this._silhouette.position.set(0, 0)
    }

    // Ny form (svårare ju högre nivå). Färgen är den krita barnet håller — inte
    // slump. Är det ett MOTIV ritas en blek kontur bakom prickarna så barnet ser
    // vad det ska bli.
    this._color = CRAYONS[this._crayonIx].color
    const { points, motif } = this._genShape()
    this._motif = motif || null
    this._drawSilhouette()

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
    this._pencil.position.set(first.x + 20, first.y - 22)
    this._pencil.visible = true
    this._pulseNext()
  },

  // Väljer form utifrån nivå (this._round). Tidigt = lätt; sedan varvas MOTIV in så att
  // varannan runda blir en riktig bild att rita. Returnerar { points, motif }.
  _genShape() {
    const r = this._round
    const B = BOX
    // Stigande svårighetsplan. ALLRA FÖRSTA rundan är ett motiv: det första ett barn
    // ser ska vara en bild att rita, inte fyra grå prickar på ett tomt papper.
    // Sedan varvas motiv med kurvor (handträningen), i stigande svårighet.
    const plan = [
      () => this._motifShape('berg'),
      () => ({ points: genLine(4, B) }),
      () => this._motifShape('hus'),
      () => ({ points: genDiagonal(4, B) }),
      () => this._motifShape('moln'),
      () => ({ points: genWave(5, B, 1, 110) }),
      () => this._motifShape('fisk'),
      () => ({ points: genArch(5, B, false) }),
      () => this._motifShape('hjarta'),
      () => ({ points: genZigzag(5, B) }),
      () => this._motifShape('katt'),
      () => ({ points: genStairs(7, B) }),
      () => this._motifShape('blomma'),
      () => ({ points: genWave(7, B, 2, 130) }),
      () => this._motifShape('stjarna'),
      () => ({ points: genSpiral(8, B) }),
      () => ({ points: genTriangle(B) }),
      () => ({ points: genSquare(B) }),
    ]
    if (r < plan.length) return plan[r]()

    // Bortom planen: oändlig lek. Övervägande motiv (det är dem barnet vill rita),
    // ibland en tätare kurva som handträning.
    const extra = Math.min(3, 1 + Math.floor((r - plan.length) / 4))
    if (Math.random() < 0.65) return this._motifShape(randomFrom(MOTIFS).key)
    const advanced = [
      () => ({ points: genWave(7 + extra, B, 2 + Math.random(), 120 + Math.random() * 20) }),
      () => ({ points: genZigzag(7 + extra, B) }),
      () => ({ points: genSpiral(8 + extra, B) }),
      () => ({ points: subdivide(genSquare(B), extra) }),
      () => ({ points: genStairs(7 + extra, B) }),
    ]
    return randomFrom(advanced)()
  },

  _motifShape(key) {
    const m = MOTIFS.find((x) => x.key === key) || MOTIFS[0]
    return { points: motifPoints(m), motif: m }
  },

  // Blek konturskiss av motivet bakom prickarna — barnet SER vad det ska bli.
  _drawSilhouette() {
    const g = this._silhouette
    if (!g || g.destroyed) return
    g.clear()
    const m = this._motif
    if (!m) return
    const pts = motifPoints(m)
    g.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y)
    if (m.close === 'polygon') g.closePath()
    g.fill({ color: this._color, alpha: 0.1 })
    g.stroke({ width: 7, color: this._color, alpha: 0.32 })
  },

  // Motivet vaknar: konturen fylls med färg, får ögon och ett leende, och hoppar till.
  _revealMotif(ctx) {
    const m = this._motif
    const g = this._silhouette
    if (!m || !g || g.destroyed) return
    const B = MOTIF_BOX
    const P = (x, y) => [B.cx + x * (B.w / 2), B.cy + y * (B.h / 2)]
    const pts = motifPoints(m)
    g.clear()
    g.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y)
    if (m.close === 'polygon') g.closePath()
    g.fill(this._color)
    m.detail?.(g, P, this._color)
    // ögon + leende
    for (const [ex, ey] of m.eyes || []) {
      const [px, py] = P(ex, ey)
      g.ellipse(px, py, 15, 18).fill(0xfffdf7)
      g.circle(px + 2, py + 2, 7).fill(0x33291f)
      g.circle(px - 1, py - 3, 3).fill(0xfffdf7)
    }
    if (m.mouth) {
      const [mx, my] = P(m.mouth[0], m.mouth[1])
      g.moveTo(mx - 16, my).quadraticCurveTo(mx, my + 18, mx + 16, my)
        .stroke({ width: 5, color: 0x33291f, cap: 'round' })
    }
    // hoppa till av glädje (proxy-tween via scale på en pivot i motivets mitt)
    g.pivot.set(B.cx, B.cy)
    g.position.set(B.cx, B.cy)
    gsap.killTweensOf(g.scale)
    gsap.fromTo(g.scale, { x: 0.86, y: 0.86 }, { x: 1, y: 1, duration: 0.6, ease: 'elastic.out(1,0.5)' })
    // Prickarna var bara vägvisare — nu när bilden är klar tonar de bort så motivet
    // syns rent (annars ligger de mitt i ansiktet på figuren).
    if (this._dotsLayer && !this._dotsLayer.destroyed) {
      gsap.killTweensOf(this._dotsLayer)
      gsap.to(this._dotsLayer, { alpha: 0, duration: 0.5, delay: 0.55 })
    }
    ctx.services.voice.say(m.say)
    sparkle(ctx.fxLayer, B.cx, B.cy, { count: 14 })
  },

  // Kurv-rundorna har ingen figur som vaknar. Då firar PENNAN i stället: den hoppar
  // till, snurrar glatt och strör gnistor längs hela spåret barnet just dragit — så
  // ingen runda känns som ett steg tillbaka efter en runda med ett motiv.
  _celebrateLine(ctx) {
    const p = this._pencil
    if (p && !p.destroyed) {
      gsap.killTweensOf(p)
      const y0 = p.y
      gsap.timeline()
        .to(p, { y: y0 - 46, rotation: -0.5, duration: 0.22, ease: 'power2.out' })
        .to(p, { y: y0, rotation: 0.35, duration: 0.34, ease: 'bounce.out' })
        .to(p, { rotation: 0, duration: 0.25, ease: 'sine.inOut' })
    }
    // Gnistor vandrar längs spåret, från start till slut (koordinaterna fångas nu,
    // så en riven prick senare inte kan läsas).
    for (let i = 1; i < this._dots.length; i++) {
      const mx = (this._dots[i - 1].x + this._dots[i].x) / 2
      const my = (this._dots[i - 1].y + this._dots[i].y) / 2
      ctx.later(0.06 * i, () => {
        if (this._alive) sparkle(ctx.fxLayer, mx, my, { count: 5 })
      })
    }
    ctx.services.voice.say(randomFrom(PRAISE))
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
    d._wcol = this._color // färgen kritan hade JUST DÅ — byter barnet krita står den kvar
    gsap.killTweensOf(d.scale)
    d.scale.set(1)
    d.clear()
      .circle(0, 0, DOT_R)
      .fill(this._color)
      .stroke({ width: 4, color: COLORS.white, alpha: 0.85 })
    this._litCount++
    ctx.services.audio.sfx(this._litCount % 3 === 0 ? 'pop' : 'pling')
    // Stigande melodi: varje tänd prick spelar nästa ton i en pentatonisk slinga, så
    // en färdig linje låter som en liten låt i stället för samma blipp gång på gång.
    ctx.services.audio.tone({ freq: MELODY[(this._litCount - 1) % MELODY.length], dur: 0.18, type: 'triangle', vol: 0.16 })
    pop(d)
    sparkle(ctx.fxLayer, d.x, d.y)
    // Kritdamm från pennspetsen.
    for (let k = 0; k < 4; k++) sparkle(ctx.fxLayer, d.x + (Math.random() * 30 - 15), d.y + (Math.random() * 20 - 10), { count: 1 })
  },

  // Efter att en prick tänts: rita spåret, flytta pennan, kolla klart.
  _afterLight(ctx) {
    this._redrawInk()
    const last = this._dots[this._next - 1]
    if (last && this._pencil && !this._pencil.destroyed) {
      gsap.killTweensOf(this._pencil)
      gsap.to(this._pencil, { x: last.x + 20, y: last.y - 22, duration: 0.18, ease: 'power2.out' })
    }
    if (!this._saidGo) {
      this._saidGo = true
      ctx.services.voice.say('Bra, fortsätt!')
    }
    if (this._next >= this._dots.length) this._onComplete(ctx)
    else this._pulseNext()
  },

  // Rita om spåret genom de tända prickarna (kontigt prefix 0.._next-1). Varje segment
  // bär färgen kritan hade när det ritades, så en teckning kan vara flerfärgad.
  _redrawInk() {
    this._ink.clear()
    for (let i = 1; i < this._next; i++) {
      const a = this._dots[i - 1]
      const b = this._dots[i]
      this._ink.moveTo(a.x, a.y).lineTo(b.x, b.y)
        .stroke({ width: INK_W, color: b._wcol ?? this._color, cap: 'round', join: 'round' })
    }
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

    // Linjen "vaknar": varje prick pulsar i följd (städbar timeline).
    this._celebrateTL = gsap.timeline()
    this._dots.forEach((d, i) => {
      this._celebrateTL.add(() => {
        if (this._alive && !d.destroyed) pop(d)
      }, i * 0.08)
    })
    // Motivet vaknar: konturen fylls, får ögon och ett leende. Är det ingen motivrunda
    // faller vi tillbaka på det generella firandet.
    if (this._motif) this._revealMotif(ctx)
    else this._celebrateLine(ctx)
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    // Förlopp: höj nivå/svårighet + räkna rundor (oändligt) + delat firande.
    this._round += 1
    ctx.progress.setLevel(this._round)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    ctx.progress.complete()

    this._nextRoundCall = ctx.later(2.2, () => {
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
    this._breath?.kill()
    this._breath = null
    if (this._paper && !this._paper.destroyed) {
      this._paper.off('pointerdown', this._onDown)
      this._paper.off('globalpointermove', this._onMove)
      this._paper.off('pointerup', this._onUp)
      this._paper.off('pointerupoutside', this._onUp)
    }
    // Döda tweens på HELA trädet, inte på en handhållen lista över de objekt vi råkar
    // ha referenser till — och utan `if (!x.destroyed)`-vakter, som hoppar över
    // städningen i precis det läge då den behövs mest (se bajs-och-kiss / V5).
    const dodaTrad = (nod) => {
      if (!nod) return
      gsap.killTweensOf(nod)
      if (nod.scale) gsap.killTweensOf(nod.scale)
      if (nod.position) gsap.killTweensOf(nod.position)
      const barn = nod.children
      if (barn) for (let i = 0; i < barn.length; i++) dodaTrad(barn[i])
    }
    dodaTrad(this._root)
    this._dots = []
    this._crayons = []
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
