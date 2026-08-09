// Enkelt Pussel — dra 2–4 stora pusselbitar på rätt plats i ramen så att en glad
// bild blir hel (3–5 år). Pussel. Återanvänder DragController (snäpp/snäpp-tillbaka/
// tap-tap). Rätt plats = magnetiskt snäpp + 'match' + gnistra. Fel = mjuk vingel +
// snäpp tillbaka (aldrig en bestraffning). När bilden är klar: firande + ny runda
// med nytt motiv och fler bitar — oändlig lek.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { drawIcon } from '../../lib/artikoner.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { bounceIn, pop, wiggle, sparkle, puff, liv } from '../../lib/feedback.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { COLORS } from '../../lib/theme.js'

// Pusselramen (designkoordinater). Mittpunkt (370, 360).
const BOARD = { x: 120, y: 110, w: 500, h: 500 }

// Spridningsyta (tray) till höger där bitarna börjar varje runda.
const TRAY = { x: 700, y: 90, w: 500, h: 540 }

// Svårighet växer: en bit MER för varje runda (2, 3, 4, 5 …) upp till MAX_PIECES.
// Klamras vid 9 (3×3) så bitarna förblir stora (>=96px) och småbarnsvänliga.
const MIN_PIECES = 2
const MAX_PIECES = 9

// Glada beröm vid varannan rätt bit.
const NUDGES = ['Så där ja!', 'Den passar!', 'Bra!']

// Klar-repliker som HELA strängar (se _win): check.mjs matchar bara literaler.
const DONE_PRAISE = [
  'Bravo! Titta, bilden är klar!',
  'Jättebra! Titta, bilden är klar!',
  'Toppen! Nu är hela bilden hel!',
  'Wow! Vilken fin bild du gjorde!',
]

// Fyra motiv. draw(g) ritar i scenens 500×500-rymd; accenter är emoji som Text.
const THEMES = [
  {
    id: 'tradgard',
    draw(g) {
      g.rect(0, 0, 500, 280).fill(0x9bd7f2) // ljus himmel
      g.rect(0, 280, 500, 220).fill(0x7cc86a) // gräs
      g.circle(105, 95, 55).fill(COLORS.yellow) // sol
      g.rect(243, 330, 14, 150).fill(COLORS.greenDark) // stjälk
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        g.circle(250 + Math.cos(a) * 72, 300 + Math.sin(a) * 72, 40).fill(COLORS.pink)
      }
      g.circle(250, 300, 50).fill(COLORS.yellow) // blomhjärta
    },
    accents: [
      { emoji: '🦋', x: 390, y: 140, size: 74 },
      { emoji: '🌳', x: 410, y: 372, size: 120 },
    ],
  },
  {
    id: 'katt',
    draw(g) {
      g.rect(0, 0, 500, 500).fill(0xcdeafd)
      g.poly([120, 150, 190, 70, 215, 185]).fill(COLORS.orange) // vänster öra
      g.poly([380, 150, 310, 70, 285, 185]).fill(COLORS.orange) // höger öra
      g.circle(250, 270, 165).fill(COLORS.orange) // ansikte
      g.circle(205, 250, 18).fill(COLORS.ink) // ögon
      g.circle(295, 250, 18).fill(COLORS.ink)
      g.circle(250, 302, 16).fill(COLORS.pink) // nos
    },
    accents: [
      { emoji: '🐾', x: 110, y: 425, size: 78 },
      { emoji: '🐾', x: 390, y: 425, size: 78 },
    ],
  },
  {
    id: 'hus',
    draw(g) {
      g.rect(0, 0, 500, 300).fill(0x9bd7f2)
      g.rect(0, 300, 500, 200).fill(0x7cc86a)
      g.circle(410, 90, 52).fill(COLORS.yellow) // sol
      g.rect(120, 250, 260, 200).fill(COLORS.cream).stroke({ width: 6, color: COLORS.brown, alpha: 0.4 })
      g.poly([100, 250, 250, 120, 400, 250]).fill(COLORS.red) // tak
      g.rect(160, 330, 70, 70).fill(COLORS.blue) // fönster
      g.rect(290, 330, 70, 120).fill(COLORS.brown) // dörr
    },
    accents: [
      { emoji: '🌳', x: 60, y: 380, size: 120 },
      { emoji: '☁️', x: 120, y: 90, size: 80 },
    ],
  },
  {
    id: 'bat',
    draw(g) {
      g.rect(0, 0, 500, 300).fill(0xcdeafd)
      g.rect(0, 300, 500, 200).fill(COLORS.blue) // hav
      g.circle(100, 90, 52).fill(COLORS.yellow) // sol
      g.poly([250, 120, 250, 320, 150, 320]).fill(COLORS.white) // segel
      g.poly([270, 140, 270, 320, 360, 320]).fill(COLORS.red)
      g.rect(246, 120, 8, 210).fill(COLORS.brown) // mast
      g.poly([130, 330, 370, 330, 330, 400, 170, 400]).fill(COLORS.brown) // skrov
    },
    accents: [
      { emoji: '🐟', x: 110, y: 435, size: 64 },
      { emoji: '☁️', x: 400, y: 100, size: 80 },
    ],
  },
  {
    id: 'tag',
    draw(g) {
      g.rect(0, 0, 500, 320).fill(0x9bd7f2) // himmel
      g.rect(0, 320, 500, 180).fill(0x7cc86a) // gräs
      g.rect(0, 388, 500, 12).fill(COLORS.brown) // räls
    },
    accents: [
      { emoji: '🚂', x: 250, y: 250, size: 240 },
      { emoji: '☁️', x: 95, y: 95, size: 78 },
      { emoji: '☁️', x: 410, y: 130, size: 60 },
    ],
  },
  {
    id: 'raket',
    draw(g) {
      g.rect(0, 0, 500, 500).fill(0x2b2b5e) // natthimmel
      // små stjärnprickar
      const stars = [[60, 70], [150, 130], [420, 80], [470, 200], [80, 380], [430, 430], [360, 60], [120, 250]]
      for (const [sx, sy] of stars) g.circle(sx, sy, 5).fill(COLORS.yellow)
    },
    accents: [
      { emoji: '🚀', x: 250, y: 255, size: 250 },
      { emoji: '⭐', x: 110, y: 150, size: 56 },
      { emoji: '🪐', x: 400, y: 360, size: 74 },
    ],
  },
  {
    id: 'regnbage',
    draw(g) {
      g.rect(0, 0, 500, 500).fill(0xcdeafd) // ljus himmel
      const bands = [COLORS.red, COLORS.orange, COLORS.yellow, COLORS.green, COLORS.blue, COLORS.purple]
      bands.forEach((c, i) => g.circle(250, 470, 300 - i * 30).fill(c))
      g.circle(250, 470, 300 - bands.length * 30).fill(0xcdeafd) // ihåligt mitt -> bågar
      g.rect(0, 470, 500, 60).fill(0xcdeafd) // platt nederkant
    },
    accents: [
      { emoji: '☀️', x: 410, y: 110, size: 78 },
      { emoji: '☁️', x: 95, y: 430, size: 84 },
      { emoji: '☁️', x: 405, y: 430, size: 72 },
    ],
  },
  {
    id: 'glass',
    draw(g) {
      g.rect(0, 0, 500, 500).fill(0xfff0f6) // pastellrosa
      g.circle(250, 250, 230).fill({ color: 0xffe1ee, alpha: 0.6 }) // mjuk ring
    },
    accents: [
      { emoji: '🍦', x: 250, y: 255, size: 270 },
      { emoji: '🍓', x: 100, y: 410, size: 64 },
      { emoji: '⭐', x: 405, y: 110, size: 60 },
    ],
  },
  {
    id: 'hav',
    draw(g) {
      g.rect(0, 0, 500, 110).fill(0xcdeafd) // ovanför ytan
      g.rect(0, 110, 500, 330).fill(COLORS.blue) // hav
      g.rect(0, 440, 500, 60).fill(COLORS.yellow) // sandbotten
    },
    accents: [
      { emoji: '🐠', x: 250, y: 260, size: 200 },
      { emoji: '🐚', x: 110, y: 455, size: 60 },
      { emoji: '🫧', x: 370, y: 175, size: 56 },
    ],
  },
]

// "Bilden vaknar"-final per motiv: när pusslet är klart spelar en stor hjälte-emoji
// en kort, motiv-specifik liten scen ovanpå ramen (solen stiger, tåget rullar in och
// visslar, raketen lyfter med rök, fisken simmar, regnbågen skimrar ...). Nyckeln är
// THEME.id. Allt är exit-säkert (proxy-tween + destroyed-vakt i _wakePicture).
const WAKE = {
  tradgard: { emoji: '🦋', motion: 'flutter', size: 120, sound: 'pling' },
  katt: { emoji: '😻', motion: 'pop', size: 150, sound: 'pling' },
  hus: { emoji: '☀️', motion: 'rise', size: 130, sound: 'reveal' },
  bat: { emoji: '⛵', motion: 'swim', size: 150, sound: 'whoosh' },
  tag: { emoji: '🚂', motion: 'slide', size: 160, sound: 'whoosh', tone: { freq: 300, dur: 0.32, type: 'sawtooth', vol: 0.16, slideTo: 520 } },
  raket: { emoji: '🚀', motion: 'rise', size: 150, sound: 'whoosh', smoke: true },
  regnbage: { emoji: '🌈', motion: 'shimmer', size: 200, sound: 'reveal' },
  glass: { emoji: '🍦', motion: 'pop', size: 150, sound: 'pling' },
  hav: { emoji: '🐠', motion: 'swim', size: 150, sound: 'whoosh' },
}

// Ritar en pusselbit-väg centrerad i (0,0): rektangel w×h med valfria knopp/hål-
// bulor mitt på varje inre kant (yttre kanter = 'flat'). bezier ≈ halvcirkel.
function tracePiece(g, w, h, edges = {}) {
  const r = Math.min(w, h) * 0.16
  const hw = w / 2
  const hh = h / 2
  const TL = [-hw, -hh]
  const TR = [hw, -hh]
  const BR = [hw, hh]
  const BL = [-hw, hh]
  g.moveTo(TL[0], TL[1])
  traceEdge(g, TL, TR, [0, -1], edges.top, r)
  traceEdge(g, TR, BR, [1, 0], edges.right, r)
  traceEdge(g, BR, BL, [0, 1], edges.bottom, r)
  traceEdge(g, BL, TL, [-1, 0], edges.left, r)
  g.closePath()
  return g
}

// En kant från S till E med yttre normal N. 'knob' bular utåt, 'hole' inåt.
function traceEdge(g, S, E, N, type, r) {
  if (type !== 'knob' && type !== 'hole') {
    g.lineTo(E[0], E[1])
    return
  }
  const len = Math.hypot(E[0] - S[0], E[1] - S[1])
  const dx = (E[0] - S[0]) / len
  const dy = (E[1] - S[1]) / len
  const mx = (S[0] + E[0]) / 2
  const my = (S[1] + E[1]) / 2
  const sign = type === 'knob' ? 1 : -1
  const k = r * 1.55 // styr-utskjut -> ungefär halvcirkel
  const p1x = mx - dx * r
  const p1y = my - dy * r
  const p2x = mx + dx * r
  const p2y = my + dy * r
  g.lineTo(p1x, p1y)
  g.bezierCurveTo(p1x + N[0] * k * sign, p1y + N[1] * k * sign, p2x + N[0] * k * sign, p2y + N[1] * k * sign, p2x, p2y)
  g.lineTo(E[0], E[1])
}

// Delade kanter interlockar: knopp på ena biten, hål på grannen. Yttre = flat.
// `cols` är antal kolumner på just den här raden. Topp/botten-knoppar bara när
// rutnätet är regelbundet (alla rader lika många kolumner) så de möter en granne;
// i ojämna rad-layouter (t.ex. 5 = 3+2) hålls topp/botten platta -> rena remsor.
function edgesFor(col, row, cols, rows, regular) {
  return {
    top: row === 0 ? 'flat' : regular ? 'hole' : 'flat',
    bottom: row === rows - 1 ? 'flat' : regular ? 'knob' : 'flat',
    left: col === 0 ? 'flat' : 'hole',
    right: col === cols - 1 ? 'flat' : 'knob',
  }
}

export default {
  id: 'enkelt-pussel',
  titleSv: 'Enkelt Pussel',
  icon: '🧩',
  category: 'pussel',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'enkelt-pussel',
  voiceIntro: 'Lägg pusselbitarna på rätt plats!',

  init(ctx) {
    this._alive = true
    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Varm rampaltta (statisk — ligger kvar mellan rundor).
    const plate = new Graphics()
      .roundRect(BOARD.x, BOARD.y, BOARD.w, BOARD.h, 28)
      .fill(COLORS.cream)
      .stroke({ width: 6, color: COLORS.brown, alpha: 0.35 })
    plate.eventMode = 'none'
    this._root.addChild(plate)

    // Per-runda-lager (förhandsvisning, spök-slots, bitar) — rensas mellan rundor.
    this._layer = new Container()
    this._root.addChild(this._layer)

    this._drag = new DragController({ space: this._layer, services: ctx.services, skugga: true })
    this._pieces = []
    this._ghosts = []
    this._slotViews = []
    this._timers = []
    this._placed = 0
    this._done = false

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._round = Math.max(0, ctx.progress.get().custom?.round | 0)

    // Idle-recue: nollställs vid varje pekning (bubblar upp till root).
    this._idle = 0
    this._root.eventMode = 'static'
    this._resetIdle = () => (this._idle = 0)
    this._root.on('pointerdown', this._resetIdle)
    this._tickerRef = ctx.ticker
    this._tick = (t) => {
      if (!this._alive) return
      this._idle += t.deltaMS
      if (this._idle >= 6000) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
      }
    }
    ctx.ticker.add(this._tick)

    this._newRound(ctx)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  _newRound(ctx) {
    if (!this._alive) return
    // Avregistrera och städa förra rundans bitar/slots (rampaltta ligger kvar).
    this._drag.clear()
    this._timers.forEach((c) => c.kill())
    this._timers = []
    this._pieces.forEach((p) => this._killViewTweens(p))
    this._ghosts.forEach((g) => this._killViewTweens(g))
    this._slotViews.forEach((s) => this._killViewTweens(s))
    this._layer.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._pieces = []
    this._ghosts = []
    this._slotViews = []
    this._placed = 0
    this._done = false
    this._idle = 0

    // En bit mer för varje runda (klamrad), cykla motiv genom hela THEMES-listan.
    const n = Math.min(MIN_PIECES + this._round, MAX_PIECES)
    const theme = THEMES[this._round % THEMES.length]
    this._theme = theme

    // Förhandsvisning av hela bilden inuti ramen (ledtråd, fångar inga pekningar).
    // GRADVIS DÄMPAD ledtråd: ju fler rundor barnet klarat desto svagare förhands-
    // visning (0.16 → ner mot 0.05) → mer verkligt tankearbete för de äldre, utan att
    // bli svårare för de yngsta. Dämpas dessutom inom rundan när bitar placeras.
    this._previewAlpha = Math.max(0.05, 0.16 - this._round * 0.012)
    const preview = this._buildScene(theme)
    preview.position.set(BOARD.x, BOARD.y)
    preview.alpha = this._previewAlpha
    this._preview = preview
    this._layer.addChild(preview)

    // Bygg slot-beskrivningar för n bitar (rad-baserad layout som alltid täcker ramen).
    const slots = this._layoutSlots(n)

    // Spök-slots + osynliga drop-mål.
    slots.forEach((slot) => {
      const ghost = new Graphics()
      tracePiece(ghost, slot.w, slot.h, slot.edges)
      ghost.fill({ color: COLORS.brown, alpha: 0.1 }).stroke({ width: 4, color: COLORS.brown, alpha: 0.25 })
      ghost.position.set(slot.cx, slot.cy)
      ghost.eventMode = 'none'
      this._layer.addChild(ghost)
      this._ghosts.push(ghost)
      slot.ghost = ghost

      const slotView = new Container()
      slotView.position.set(slot.cx, slot.cy)
      slotView.hitArea = new Rectangle(-slot.w / 2, -slot.h / 2, slot.w, slot.h)
      this._layer.addChild(slotView)
      this._slotViews.push(slotView)
      // Generös snäpp-radie kring varje slot (skalar med bitens egen storlek).
      const hitRadius = Math.max(slot.w, slot.h) / 2 + 70
      this._drag.addTarget(slotView, (data) => data.slot === slot.index, { hitRadius })
    })

    // Bitar i spridningsytan (tray, höger sida). Slumpa vilken bit hamnar var.
    const spots = shuffle(this._trayPositions(n))
    ctx.services.audio.sfx('whoosh')
    slots.forEach((slot, i) => {
      const piece = this._makePiece(theme, slot)
      const spot = spots[i]
      piece.position.set(spot[0], spot[1])
      // Begränsa träffytan till bitens egen ruta (+halo) så scen-grafiken inte
      // blir ett gigantiskt träffområde.
      piece.hitArea = new Rectangle(-slot.w / 2 - 14, -slot.h / 2 - 14, slot.w + 28, slot.h + 28)
      piece.interactiveChildren = false
      this._layer.addChild(piece)
      this._pieces.push(piece)
      bounceIn(piece, { delay: i * 0.07 })
      this._drag.addItem(
        piece,
        { slot: slot.index },
        {
          onCorrect: (rec) => this._onCorrect(ctx, rec, slot),
          onWrong: (rec) => {
            if (this._alive) wiggle(rec.view)
          },
        }
      )
    })
  },

  // Antal kolumner per rad för n bitar. Hålls nästan kvadratiskt så bitarna förblir
  // stora: <=3 -> 1 rad, <=6 -> 2 rader, annars 3 rader; n fördelas jämnt över raderna.
  // Exempel: 5 -> [3,2], 7 -> [3,2,2], 8 -> [3,3,2], 9 -> [3,3,3].
  _rowCounts(n) {
    const rows = n <= 3 ? 1 : n <= 6 ? 2 : 3
    const base = Math.floor(n / rows)
    const extra = n % rows
    const counts = []
    for (let r = 0; r < rows; r++) counts.push(base + (r < extra ? 1 : 0))
    return counts
  },

  // Bygger slot-beskrivningar som alltid täcker hela ramen (rad-baserat rutnät).
  _layoutSlots(n) {
    const rowCounts = this._rowCounts(n)
    const rows = rowCounts.length
    const regular = rowCounts.every((c) => c === rowCounts[0])
    const cellH = BOARD.h / rows
    const slots = []
    let idx = 0
    for (let row = 0; row < rows; row++) {
      const cols = rowCounts[row]
      const cellW = BOARD.w / cols
      for (let col = 0; col < cols; col++) {
        const lx = cellW * (col + 0.5)
        const ly = cellH * (row + 0.5)
        slots.push({
          index: idx++,
          lx,
          ly,
          cx: BOARD.x + lx,
          cy: BOARD.y + ly,
          w: cellW,
          h: cellH,
          edges: edgesFor(col, row, cols, rows, regular),
        })
      }
    }
    return slots
  },

  // Spridningspunkter i tray:en — ett nästan kvadratiskt rutnät; sista (kortare)
  // raden centreras. Bitstorleken krymper med antalet så de ryms utan att klumpa ihop.
  _trayPositions(n) {
    const cols = Math.ceil(Math.sqrt(n))
    const rows = Math.ceil(n / cols)
    const cellW = TRAY.w / cols
    const cellH = TRAY.h / rows
    const pts = []
    for (let j = 0; j < n; j++) {
      const row = Math.floor(j / cols)
      const col = j % cols
      const inRow = row === rows - 1 ? n - row * cols : cols
      const offset = ((cols - inRow) * cellW) / 2 // centrera sista raden
      pts.push([TRAY.x + cellW * (col + 0.5) + offset, TRAY.y + cellH * (row + 0.5)])
    }
    return pts
  },

  // Hela scenen, maskad till bitens form, med vit pussel-kant ovanpå.
  _makePiece(theme, slot) {
    const piece = new Container()
    // Allt bitens UTSEENDE hänger i en inre behållare. Den guppar (liv) medan biten
    // ligger och väntar i spridningsytan; DragController äger den yttre `piece` och
    // dess x/y, så guppningen kan aldrig slåss med draget. Guppningen dödas när
    // biten hamnar rätt (_onCorrect) — en placerad bit ska sitta blick stilla.
    const inner = new Container()
    piece.addChild(inner)
    piece._inner = inner

    // Maskad scen: förskjut så slot-centret hamnar i bitens origo (0,0).
    const clip = new Container()
    const scene = this._buildScene(theme)
    scene.position.set(-slot.lx, -slot.ly)
    clip.addChild(scene)
    const mask = new Graphics()
    tracePiece(mask, slot.w, slot.h, slot.edges)
    mask.fill(0xffffff)
    clip.addChild(mask)
    clip.mask = mask
    inner.addChild(clip)
    piece._clip = clip

    // Vit kant + mjuk skuggkant (omaskad) ger pussel-looken.
    const edge = new Graphics()
    tracePiece(edge, slot.w, slot.h, slot.edges)
    edge.stroke({ width: 7, color: COLORS.white, alpha: 0.95 })
    const shade = new Graphics()
    tracePiece(shade, slot.w, slot.h, slot.edges)
    shade.stroke({ width: 3, color: COLORS.brown, alpha: 0.3 })
    inner.addChild(edge, shade)
    liv(inner, { bob: 4, sway: 0.015, duration: 2.6 })
    return piece
  },

  _buildScene(theme) {
    const c = new Container()
    const g = new Graphics()
    theme.draw(g)
    c.addChild(g)
    for (const a of theme.accents) {
      // P0 ASSETS: motivets accenter RITAS (var emoji-Text ovanpå den ritade scenen).
      const t = drawIcon(a.emoji, a.size)
      t.position.set(a.x, a.y)
      c.addChild(t)
    }
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  _onCorrect(ctx, rec, slot) {
    if (!this._alive) return
    // Biten sitter — sluta guppa och sätt utseendet exakt i ramen igen.
    const inner = rec.view?._inner
    if (inner && !inner.destroyed) {
      inner._fxLiv?.kill()
      inner.y = 0
      inner.rotation = 0
    }
    ctx.services.audio.sfx('match')
    sparkle(ctx.fxLayer, slot.cx, slot.cy)
    pop(rec.view)
    // Släck spök-konturen under biten.
    if (slot.ghost && !slot.ghost.destroyed) gsap.to(slot.ghost, { alpha: 0, duration: 0.3 })
    this._placed += 1
    // Dämpa förhandsvisnings-ledtråden gradvis medan bitarna hamnar rätt (mot ~30 %
    // av start vid sista biten) så hjälpen tonar bort när barnet redan är på gång.
    if (this._preview && !this._preview.destroyed && this._pieces.length) {
      const frac = 1 - (this._placed / this._pieces.length) * 0.7
      gsap.to(this._preview, { alpha: this._previewAlpha * frac, duration: 0.3 })
    }
    if (this._placed % 2 === 0) ctx.services.voice.say(randomFrom(NUDGES))
    if (this._placed >= this._pieces.length) this._finishRound(ctx)
  },

  _finishRound(ctx) {
    if (!this._alive || this._done) return
    this._done = true
    ctx.services.audio.sfx('reveal')
    // Bilden vaknar till liv: en glad studs-våg över bitarna ...
    this._pieces.forEach((p, i) => {
      this._delay(i * 0.07, () => {
        if (!p.destroyed) pop(p)
      })
    })
    sparkle(ctx.fxLayer, BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h / 2)
    // ... och en MOTIV-SPECIFIK liten scen ovanpå (solen stiger, tåget visslar in,
    // raketen lyfter med rök, fisken simmar, regnbågen skimrar) — spelets klimax.
    this._delay(0.24, () => this._wakePicture(ctx, this._theme))

    this._level += 1
    ctx.progress.setLevel(this._level)
    this._round += 1
    ctx.progress.setCustom('round', this._round)
    ctx.progress.complete() // delat firande + stjärna + klistermärke + konfetti
    // Hela repliker, inte PRAISE + ' Titta, bilden är klar!': en konkatenerad
    // sträng kan check.mjs inte hitta och /rost kan därför aldrig klippa den.
    ctx.services.voice.say(randomFrom(DONE_PRAISE))

    this._delay(1.6, () => this._newRound(ctx))
  },

  // Motiv-specifik "bilden vaknar"-flärd: en stor hjälte-emoji spelar en kort scen
  // ovanpå ramen (via WAKE[theme.id]). Exit-säkert: en plain proxy tweenas och kopieras
  // till Text-objektet BARA om det lever; objektet destrueras i onComplete om det lever.
  _wakePicture(ctx, theme) {
    const w = theme && WAKE[theme.id]
    if (!w) return
    const cx = BOARD.x + BOARD.w / 2
    const cy = BOARD.y + BOARD.h / 2
    if (w.sound) ctx.services.audio.sfx(w.sound)
    if (w.tone) ctx.services.audio.tone(w.tone)

    // RITAD hjälte i "bilden vaknar"-finalen (var en stor emoji-Text).
    const t = drawIcon(w.emoji, w.size || 150)
    t.eventMode = 'none'
    t.position.set(cx, cy)
    ctx.fxLayer.addChild(t)

    const motion = w.motion
    const st = { p: 0 }
    const tw = gsap.to(st, {
      p: 1,
      duration: w.dur || 1.5,
      ease: 'none',
      onUpdate: () => {
        if (t.destroyed) {
          tw.kill()
          return
        }
        const p = st.p
        if (motion === 'rise') {
          t.x = cx
          t.y = cy + 120 - p * 320
          t.alpha = p < 0.15 ? p / 0.15 : 1 - Math.max(0, (p - 0.7) / 0.3)
        } else if (motion === 'slide') {
          t.x = BOARD.x - 130 + p * (BOARD.w + 260)
          t.y = cy
          t.alpha = 1
        } else if (motion === 'swim') {
          t.x = BOARD.x - 110 + p * (BOARD.w + 220)
          t.y = cy + Math.sin(p * Math.PI * 3) * 60
          t.scale.x = -1 // vänd i färdriktningen (emojin pekar annars vänster)
          t.alpha = p < 0.1 ? p / 0.1 : 1 - Math.max(0, (p - 0.85) / 0.15)
        } else if (motion === 'shimmer') {
          t.x = cx
          t.y = cy
          t.scale.set(1 + Math.sin(p * Math.PI * 4) * 0.12)
          t.alpha = 1 - Math.max(0, (p - 0.6) / 0.4)
        } else {
          // pop/flutter — mjuk studs uppåt med lite sidled + intoning/uttoning.
          t.x = cx + Math.sin(p * Math.PI * 3) * 40
          t.y = cy - p * 150
          t.alpha = 1 - Math.max(0, (p - 0.5) / 0.5)
        }
      },
      onComplete: () => {
        if (!t.destroyed) t.destroy()
      },
    })

    // Raket-rök: små puffar vid basen medan den lyfter.
    if (w.smoke) {
      for (let i = 0; i < 5; i++) {
        this._delay(0.1 + i * 0.12, () => puff(ctx.fxLayer, cx + (Math.random() * 44 - 22), cy + 90, { count: 4, color: 0xdedede }))
      }
    }
    // Regnbåge/skimmer: extra gnist-svep.
    if (motion === 'shimmer') {
      for (let i = 0; i < 3; i++) this._delay(0.16 * i, () => sparkle(ctx.fxLayer, cx, cy - 40, { count: 8 }))
    }
  },

  // gsap.delayedCall som spåras (kan dödas vid exit) och vaktas av _alive.
  _delay(t, fn) {
    const call = gsap.delayedCall(t, () => {
      if (this._alive) fn()
    })
    this._timers.push(call)
    return call
  },

  _killViewTweens(v) {
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    if (v._clip && !v._clip.destroyed) v._clip.mask = null
  },

  destroy() {
    this._alive = false
    this._timers?.forEach((c) => c.kill())
    this._tickerRef?.remove(this._tick)
    if (this._resetIdle) this._root?.off('pointerdown', this._resetIdle)
    this._drag?.destroy()
    this._pieces?.forEach((p) => this._killViewTweens(p))
    this._ghosts?.forEach((g) => this._killViewTweens(g))
    this._slotViews?.forEach((s) => this._killViewTweens(s))
    gsap.killTweensOf(this._root)
    if (this._layer) gsap.killTweensOf(this._layer)
    this._root?.destroy({ children: true })
  },
}
