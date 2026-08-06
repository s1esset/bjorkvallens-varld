// Vattenvägen — barnet drar och vrider rörbitar på ett rutnät så vattnet från
// kranen hittar hela vägen ner till Elviras törstiga mugg och plantan blommar.
// Pyssel i Where's My Water-anda men helt förlåtande: varje rör som inte kopplar
// "sitter bara där", läckage = en mjuk pöl, och mjuk auto-hjälp garanterar att
// banan alltid går att klara. Vatten = droppar längs en beräknad väg (ticker-
// drivet, exit-säkert) — INTE matter.js. Kontroller: placering + rotation +
// lyfta bort sten (massor av agens). Avbildad person: bara Elvira (mugg-ägaren).
import { Container, Graphics, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { bounceIn, pop, puff, sparkle, ripple, burst, floatText, breathe } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { COLORS } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

// --- rutnäts-geometri (designkoordinater 1280×720) ---
const CELL = 120
const GRIDX0 = 470 // övre vänstra cellens center-x
const GRIDY0 = 200 // övre vänstra cellens center-y

// --- rör-modell: portar = öppna sidor (T=topp, R=höger, B=botten, L=vänster) ---
const ROT = { T: 'R', R: 'B', B: 'L', L: 'T' } // medurs 90°
const OPP = { T: 'B', B: 'T', L: 'R', R: 'L' }
const BASE = { rak: ['T', 'B'], boj: ['T', 'R'], tratt: ['B', 'L', 'R'] }

function portsFor(type, rot) {
  let ps = BASE[type] || []
  const n = (((rot | 0) % 4) + 4) % 4
  for (let i = 0; i < n; i++) ps = ps.map((d) => ROT[d])
  return ps
}
// Hitta {type,rot} vars portar exakt = de önskade två (raka/böj räcker för banan).
function pipeForPorts(ports) {
  const want = [...ports].sort().join('')
  for (const type of ['rak', 'boj']) {
    for (let r = 0; r < 4; r++) {
      if (portsFor(type, r).slice().sort().join('') === want) return { type, rot: r }
    }
  }
  return { type: 'rak', rot: 0 }
}
const opposite = (d) => OPP[d]
function neighborOf(c, dir) {
  if (dir === 'T') return { col: c.col, row: c.row - 1 }
  if (dir === 'B') return { col: c.col, row: c.row + 1 }
  if (dir === 'L') return { col: c.col - 1, row: c.row }
  return { col: c.col + 1, row: c.row }
}
function dirBetween(a, b) {
  if (b.col > a.col) return 'R'
  if (b.col < a.col) return 'L'
  if (b.row > a.row) return 'B'
  return 'T'
}
function cellCenter(col, row) {
  return { x: GRIDX0 + col * CELL, y: GRIDY0 + row * CELL }
}

// Rita en rörbit (grå rörkropp + ljusblå innerkanal) för en uppsättning bas-portar.
function armRect(dir, half, th) {
  if (dir === 'T') return [-th / 2, -half, th, half + 6]
  if (dir === 'B') return [-th / 2, -6, th, half + 6]
  if (dir === 'L') return [-half, -th / 2, half + 6, th]
  return [-6, -th / 2, half + 6, th] // R
}
function drawPipe(g, dirs) {
  const HALF = 58
  const BODY = 0xb8c4cc
  const INNER = 0xbfe9ff
  for (const d of dirs) {
    const [x, y, w, h] = armRect(d, HALF, 56)
    g.roundRect(x, y, w, h, 10).fill(BODY)
  }
  g.circle(0, 0, 28).fill(BODY)
  for (const d of dirs) {
    const [x, y, w, h] = armRect(d, HALF, 26)
    g.roundRect(x, y, w, h, 8).fill(INNER)
  }
  g.circle(0, 0, 14).fill(INNER)
  // liten glansstrimma
  g.roundRect(-9, -52, 5, 30, 3).fill({ color: COLORS.white, alpha: 0.5 })
}

// Rita ENBART innerkanalen i stark vattenblå — läggs som overlay ovanpå röret och
// tonas in (alpha) allteftersom vattnet passerar → barnet SER flödet hitta vägen.
function drawPipeWet(g, dirs) {
  const HALF = 58
  const WATER = COLORS.blue
  for (const d of dirs) {
    const [x, y, w, h] = armRect(d, HALF, 26)
    g.roundRect(x, y, w, h, 8).fill(WATER)
  }
  g.circle(0, 0, 14).fill(WATER)
}

// Elvira — den törstiga mottagaren som väntar bredvid muggen (helt programmatisk,
// speglar kid-figuren i bajs-och-kiss). Symmetrisk, så ingen spegling behövs.
// Avbildad person: ENDAST Elvira (se CLAUDE.md CHARACTERS).
function makeElvira() {
  const c = new Container()
  const skin = 0xffe0bd
  const shirt = COLORS.pink
  const shirtDark = 0xe87da8
  const hair = 0xf4cf63 // Elvira är blond (ägarens önskemål)

  // Tofsar bakom huvudet.
  c.addChild(new Graphics().circle(-40, -56, 16).fill(hair).circle(40, -56, 16).fill(hair))

  // Ben + skor.
  c.addChild(
    new Graphics()
      .roundRect(-24, 44, 18, 44, 8).fill(0x5a6b8c)
      .roundRect(6, 44, 18, 44, 8).fill(0x5a6b8c)
      .roundRect(-28, 82, 26, 16, 8).fill(0x3a3a3a)
      .roundRect(2, 82, 26, 16, 8).fill(0x3a3a3a)
  )

  // Klänning.
  c.addChild(
    new Graphics()
      .moveTo(-28, -22).lineTo(28, -22).lineTo(46, 56).lineTo(-46, 56).closePath()
      .fill(shirt).stroke({ width: 3, color: shirtDark })
  )

  // Armar sträcker sig framåt/nedåt (mot muggen) + händer.
  c.addChild(
    new Graphics()
      .roundRect(-52, -8, 20, 42, 10).fill(shirt)
      .roundRect(32, -8, 20, 42, 10).fill(shirt)
      .circle(-42, 36, 10).fill(skin)
      .circle(42, 36, 10).fill(skin)
  )

  // Huvud + ansikte.
  const head = new Graphics().circle(0, -56, 34).fill(skin)
  head.circle(-12, -58, 4).fill(0x3a2a1a) // ögon
  head.circle(12, -58, 4).fill(0x3a2a1a)
  head.circle(-20, -48, 6).fill({ color: 0xffb0b0, alpha: 0.7 }) // kinder
  head.circle(20, -48, 6).fill({ color: 0xffb0b0, alpha: 0.7 })
  c.addChild(head)
  const mouth = new Graphics().arc(0, -50, 13, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 4, color: 0x9a5b3b })
  c.addChild(mouth)
  c._mouth = mouth

  // Lugg + rosett.
  c.addChild(new Graphics().roundRect(-32, -86, 64, 22, 12).fill(hair))
  c.addChild(
    new Graphics()
      .circle(-11, -90, 11).fill(COLORS.red)
      .circle(11, -90, 11).fill(COLORS.red)
      .circle(0, -90, 6).fill(0xd64a4a)
  )
  return c
}

// Position längs en polylinje vid avståndet d (px). ended=true när d nått slutet.
function pointAt(pts, d) {
  if (!pts || pts.length < 2) return null
  let rem = d
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x
    const dy = pts[i + 1].y - pts[i].y
    const len = Math.hypot(dx, dy) || 0.0001
    if (rem <= len) return { x: pts[i].x + dx * (rem / len), y: pts[i].y + dy * (rem / len), ended: false }
    rem -= len
  }
  const last = pts[pts.length - 1]
  return { x: last.x, y: last.y, ended: true }
}

export default {
  id: 'vattenvagen',
  titleSv: 'Vattenvägen',
  icon: '💧',
  category: 'pussel',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'vattenvagen',
  voiceIntro: 'Lägg rören så vattnet rinner ner till muggen!',

  init(ctx) {
    this._alive = true
    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Mjuk vattenblå scen (ground:false) som FÖRSTA barn.
    this._root.addChild(createScene('water', { width: ctx.width, height: ctx.height, ground: false }))

    // Per-bana-bräde (allt nedan rensas mellan banor; scenen ligger kvar).
    this._board = new Container()
    this._root.addChild(this._board)

    this._drag = new DragController({ space: this._board, services: ctx.services })

    // Tillstånd
    this._pipes = []
    this._stones = []
    this._drops = []
    this._timers = []
    this._glow = null
    this._fill = 0
    this._connected = false
    this._resolving = false
    this._idle = 0
    this._hintShown = false
    this._spawnAcc = 0
    this._clock = 0
    this._mounted = false
    this._path = []

    this._level = Math.max(1, ctx.progress.get().highestLevel | 0)

    // Idle-recue nollställs vid varje pekning någonstans på brädet.
    this._board.eventMode = 'static'
    this._resetIdle = () => {
      this._idle = 0
      this._hintShown = false
      this._clearGlow()
    }
    this._board.on('pointerdown', this._resetIdle)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)

    this._buildLevel(ctx, this._level)
  },

  mount(ctx) {
    this._mounted = true
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- bana ----
  _buildLevel(ctx, level) {
    if (!this._alive) return
    this._level = Math.max(1, level)

    // Städa förra banan (brädet återanvänds).
    this._drag.clear()
    this._timers.forEach((c) => c.kill())
    this._timers = []
    this._clearGlow()
    this._drops.forEach((d) => !d.g.destroyed && d.g.destroy())
    this._drops = []
    this._pipes.forEach((p) => this._killViewTweens(p))
    this._stones.forEach((s) => this._killViewTweens(s))
    this._elviraBreath?.kill()
    if (this._elvira) this._killViewTweens(this._elvira)
    this._elvira = null
    this._board.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._pipes = []
    this._stones = []

    // Lager-ordning: rutor -> rör -> droppar -> kran/mugg/sten -> glöd -> tray.
    this._gridLayer = new Container()
    this._pipeLayer = new Container()
    this._dropLayer = new Container()
    this._propLayer = new Container()
    this._glowLayer = new Container()
    this._glowLayer.eventMode = 'none'
    this._trayLayer = new Container()
    this._board.addChild(this._gridLayer, this._pipeLayer, this._dropLayer, this._propLayer, this._glowLayer, this._trayLayer)

    // Planera en garanterat lösbar bana.
    const plan = this._planLevel(this._level)
    this._cols = plan.cols
    this._rows = plan.rows
    this._sourceCol = plan.sourceCol
    this._mugCol = plan.mugCol

    const path = this._generatePath(plan)
    this._solution = path.map((c, i) => {
      const enter = i === 0 ? 'T' : opposite(dirBetween(path[i - 1], c))
      const exit = i === path.length - 1 ? 'B' : dirBetween(c, path[i + 1])
      const { type, rot } = pipeForPorts([enter, exit])
      return { col: c.col, row: c.row, type, rot }
    })

    // Vilka rör ligger redan vs. ska barnet lägga? Förplacera BARA käll-biten
    // (index 0) + mugg-biten (sista) — barnet bygger HELA resten av ledningen
    // själv (mer agens; docs §4 "fler tomma celler, färre förplacerade").
    const lastIdx = this._solution.length - 1
    const missingSet = new Set()
    this._solution.forEach((_, i) => {
      if (i !== 0 && i !== lastIdx) missingSet.add(i)
    })

    // Käll-/mugg-koordinater.
    this._sourceX = cellCenter(this._sourceCol, 0).x
    this._mugX = cellCenter(this._mugCol, this._rows - 1).x
    this._mugY = GRIDY0 + (this._rows - 1) * CELL + 130

    // Rutnätsceller + drop-mål.
    this._grid = []
    for (let r = 0; r < this._rows; r++) {
      const row = []
      for (let c = 0; c < this._cols; c++) {
        const center = cellCenter(c, r)
        const cell = { col: c, row: r, x: center.x, y: center.y, pipe: null, stone: null }
        const well = new Graphics()
          .roundRect(-56, -56, 112, 112, 18)
          .fill({ color: COLORS.white, alpha: 0.1 })
          .stroke({ width: 3, color: COLORS.white, alpha: 0.35 })
        well.eventMode = 'none'
        const view = new Container()
        view.position.set(center.x, center.y)
        view.addChild(well)
        view.eventMode = 'static'
        view.cursor = 'pointer'
        view.hitArea = new Rectangle(-58, -58, 116, 116)
        this._gridLayer.addChild(view)
        cell.view = view
        const trec = this._drag.addTarget(view, () => !cell.pipe && !cell.stone, { hitRadius: 110 })
        trec.cell = cell
        row.push(cell)
      }
      this._grid.push(row)
    }

    // Kran + pip.
    // RITAD kran (var en 🚰-emoji i en blå ruta): vägghållare, böjt rör och pip.
    const tap = new Graphics()
    tap.roundRect(-34, -34, 26, 68, 8).fill(0xb6c0cc).stroke({ width: 4, color: 0x8d99a6 }) // vägghållare
    tap.roundRect(-8, -14, 44, 18, 8).fill(0xc3ccd4).stroke({ width: 4, color: 0x8d99a6 })  // horisontellt rör
    tap.roundRect(26, -6, 18, 32, 6).fill(0xc3ccd4).stroke({ width: 4, color: 0x8d99a6 })   // nedåtpip
    tap.roundRect(-2, -42, 30, 12, 6).fill(0x4aa3df).stroke({ width: 4, color: 0x2f7fb8 })  // vred
    tap.circle(13, -36, 9).fill(0x6ac0f0).stroke({ width: 4, color: 0x2f7fb8 })
    tap.roundRect(-30, -24, 8, 48, 4).fill({ color: 0xffffff, alpha: 0.35 })
    tap.position.set(this._sourceX - 22, GRIDY0 - 116)
    tap.scale.set(1.35) // matchar den 96px-emoji den ersatte i visuell tyngd
    tap.eventMode = 'none'
    const spout = new Graphics().roundRect(this._sourceX - 8, GRIDY0 - 78, 16, 46, 6).fill({ color: COLORS.white, alpha: 0.85 })
    spout.eventMode = 'none'
    this._propLayer.addChild(spout, tap)

    // Mugg + planta (mål).
    this._buildMug()

    // Elvira väntar törstig BREDVID muggen (mot närmaste kant så hon inte skymmer
    // rutnätet). Hon "andas" (lever) och jublar/dricker när vattnet kommer.
    this._elvira = makeElvira()
    const ey = Math.min(this._mugY, 560)
    const side = this._mugX >= 640 ? 1 : -1 // stå mot den närmaste skärmkanten
    const ex = Math.max(190, Math.min(1105, this._mugX + side * 150))
    this._elvira.position.set(ex, ey)
    this._elvira.scale.set(0.78)
    this._elvira.eventMode = 'none'
    this._propLayer.addChild(this._elvira)
    // Lugn "andning" så hon känns levande (breathe multiplicerar basskalan 0.78).
    this._elviraBreath = breathe(this._elvira, { scale: 1.03, duration: 1.4 })

    // Förplacerade rör (rätt typ + rotation → kopplar redan).
    this._solution.forEach((s, i) => {
      if (missingSet.has(i)) return
      const cell = this._cellAt(s.col, s.row)
      if (cell) this._placePipeInCell(ctx, cell, s.type, s.rot, false)
    })

    // Stenar (aldrig på lösningsvägen).
    const pathKeys = new Set(path.map((c) => c.col + ',' + c.row))
    let stoneCells = []
    if (plan.stones === 'auto') {
      const free = []
      for (let r = 0; r < this._rows; r++)
        for (let c = 0; c < this._cols; c++) if (!pathKeys.has(c + ',' + r)) free.push({ col: c, row: r })
      stoneCells = shuffle(free).slice(0, 1 + ((Math.random() * 2) | 0))
    } else {
      stoneCells = plan.stones.filter((s) => !pathKeys.has(s.col + ',' + s.row))
    }
    stoneCells.forEach((sc) => {
      const cell = this._cellAt(sc.col, sc.row)
      if (cell && !cell.pipe) cell.stone = this._makeStone(ctx, cell)
    })

    // Rörbricka (oändlig tillgång): de typer som saknas.
    const trayRect = new Graphics().roundRect(120, 600, 1040, 96, 28).fill({ color: COLORS.cream, alpha: 0.85 })
    trayRect.eventMode = 'none'
    this._trayLayer.addChild(trayRect)
    let types = [...new Set(this._solution.filter((_, i) => missingSet.has(i)).map((s) => s.type))]
    if (!types.length) types = ['rak']
    const startX = 640 - ((types.length - 1) * 180) / 2
    types.forEach((type, i) => {
      const stamp = new Container()
      stamp.position.set(startX + i * 180, 648)
      const halo = new Graphics().circle(0, 0, 58).fill({ color: COLORS.white, alpha: 0.35 })
      halo.eventMode = 'none'
      const pv = this._makePipe(type)
      pv.scale.set(0.6)
      pv.eventMode = 'none'
      stamp.addChild(halo, pv)
      stamp.hitArea = new Circle(0, 0, 62)
      this._trayLayer.addChild(stamp)
      this._drag.addItem(
        stamp,
        { type },
        {
          onSelect: () => this._resetIdle(),
          onCorrect: (rec, target) => this._onStampDrop(ctx, rec, target),
          onWrong: () => {},
        }
      )
    })

    // Nollställ vattentillstånd.
    this._fill = 0
    this._connected = false
    this._resolving = false
    this._idle = 0
    this._hintShown = false
    this._spawnAcc = 0
    this._drawMugWater()
    this._recomputePath(ctx, false)

    if (this._mounted && this._level > 1) {
      this._delay(0.5, () => ctx.services.voice.say(this.voiceIntro))
    }
  },

  _buildMug() {
    const mug = new Container()
    mug.position.set(this._mugX, this._mugY)
    const shadow = new Graphics().ellipse(this._mugX, this._mugY + 92, 72, 18).fill({ color: COLORS.shadow, alpha: 0.12 })
    shadow.eventMode = 'none'
    const glass = new Graphics()
      .roundRect(-75, -85, 150, 170, 24)
      .fill({ color: 0xbfe9ff, alpha: 0.5 })
      .stroke({ width: 5, color: COLORS.white, alpha: 0.8 })
    const water = new Graphics()
    this._mugWater = water
    const glans = new Graphics().roundRect(-58, -70, 16, 120, 8).fill({ color: COLORS.white, alpha: 0.45 })
    const line = new Graphics() // streckad gul fyll-linje (mål-nivå)
    for (let x = -54; x < 54; x += 18) line.roundRect(x, -44, 10, 4, 2).fill({ color: COLORS.yellow, alpha: 0.95 })
    // RITAD grodd i kruka (var en 🌱-emoji).
    const plant = new Graphics()
    plant.moveTo(-20, 4).lineTo(20, 4).lineTo(15, 26).lineTo(-15, 26).closePath()
    plant.fill(0x9a5c33).stroke({ width: 3, color: 0x6f4a2e })
    plant.roundRect(-23, -4, 46, 11, 4).fill(0xc98a4b).stroke({ width: 3, color: 0x6f4a2e })
    plant.roundRect(-3, -30, 6, 30, 3).fill(0x5bbf6a)
    plant.ellipse(-15, -26, 14, 9).fill(0x6fd07a).stroke({ width: 3, color: 0x3f8a44 })
    plant.ellipse(15, -34, 14, 9).fill(0x6fd07a).stroke({ width: 3, color: 0x3f8a44 })
    plant.position.set(0, -92)
    this._plant = plant
    mug.addChild(glass, water, glans, line, plant)
    mug.eventMode = 'none'
    this._propLayer.addChild(shadow, mug)
    this._mugContainer = mug
  },

  _drawMugWater() {
    if (!this._mugWater || this._mugWater.destroyed) return
    const top = 70 - this._fill * 112 // _fill=1 når fyll-linjen vid -42
    this._mugWater.clear()
    if (this._fill > 0) this._mugWater.roundRect(-58, top, 116, 70 - top, 10).fill({ color: COLORS.blue, alpha: 0.82 })
  },

  // ---- bana-planer ----
  _planLevel(level) {
    const L = Math.max(1, level)
    if (L === 1) return { cols: 4, rows: 3, sourceCol: 1, mugCol: 1, turnRow: 0, stones: [], missing: 2 }
    if (L === 2) return { cols: 4, rows: 3, sourceCol: 1, mugCol: 2, turnRow: 1, stones: [], missing: 3 }
    if (L === 3) return { cols: 4, rows: 4, sourceCol: 0, mugCol: 3, turnRow: 1, stones: [{ col: 1, row: 0 }], missing: 4 }
    if (L === 4) return { cols: 5, rows: 4, sourceCol: 1, mugCol: 3, turnRow: 2, stones: [{ col: 2, row: 0 }], missing: 5 }
    if (L === 5) return { cols: 5, rows: 4, sourceCol: 0, mugCol: 4, turnRow: 1, stones: [{ col: 2, row: 2 }], missing: 6 }
    // 6+: slumpad start/sväng — aldrig slut.
    const cols = 5
    const rows = 4
    return {
      cols,
      rows,
      sourceCol: (Math.random() * cols) | 0,
      mugCol: (Math.random() * cols) | 0,
      turnRow: 1 + ((Math.random() * (rows - 2)) | 0),
      stones: 'auto',
      missing: 6,
    }
  },

  // Garanterat lösbar väg: ner i källkolumnen till turnRow, sidled till mugg-
  // kolumnen, sedan ner till botten (eller rakt ner om käll == mugg).
  _generatePath(plan) {
    const { sourceCol, mugCol, rows } = plan
    const tr = Math.min(rows - 1, Math.max(0, plan.turnRow))
    const cells = []
    if (sourceCol === mugCol) {
      for (let r = 0; r < rows; r++) cells.push({ col: sourceCol, row: r })
      return cells
    }
    for (let r = 0; r <= tr; r++) cells.push({ col: sourceCol, row: r })
    const step = mugCol > sourceCol ? 1 : -1
    for (let c = sourceCol + step; c !== mugCol + step; c += step) cells.push({ col: c, row: tr })
    for (let r = tr + 1; r < rows; r++) cells.push({ col: mugCol, row: r })
    return cells
  },

  // ---- rör ----
  _makePipe(type) {
    const view = new Container()
    const g = new Graphics()
    drawPipe(g, BASE[type] || BASE.rak)
    g.eventMode = 'none'
    // Vattenblå kanal-overlay (tonas in när flödet når röret) — se _paintFlow.
    const wet = new Graphics()
    drawPipeWet(wet, BASE[type] || BASE.rak)
    wet.eventMode = 'none'
    wet.alpha = 0
    view.addChild(g, wet)
    view._wet = wet
    return view
  },

  _placePipeInCell(ctx, cell, type, rot, announce = true) {
    if (!cell || cell.stone || cell.pipe) return null
    const view = this._makePipe(type)
    view.position.set(cell.x, cell.y)
    view._ptype = type
    view._rot = ((rot % 4) + 4) % 4
    view.rotation = view._rot * (Math.PI / 2)
    view.eventMode = 'static'
    view.cursor = 'pointer'
    view.hitArea = new Circle(0, 0, 70)
    view._tap = () => this._rotatePipe(ctx, cell)
    view.on('pointertap', view._tap)
    view._cell = cell
    this._pipeLayer.addChild(view)
    cell.pipe = view
    this._pipes.push(view)
    bounceIn(view)
    this._recomputePath(ctx, announce)
    return view
  },

  _removePipe(cell) {
    const p = cell.pipe
    cell.pipe = null
    if (!p) return
    this._killViewTweens(p)
    if (p._tap) p.off('pointertap', p._tap)
    const i = this._pipes.indexOf(p)
    if (i >= 0) this._pipes.splice(i, 1)
    if (!p.destroyed) p.destroy()
  },

  _rotatePipe(ctx, cell) {
    if (!this._alive || this._resolving) return
    const p = cell.pipe
    if (!p) return
    p._rot = (p._rot + 1) % 4
    ctx.services.audio.sfx('flip')
    gsap.to(p, { rotation: p._rot * (Math.PI / 2), duration: 0.18, ease: 'back.out(2)' })
    pop(p)
    this._recomputePath(ctx, true)
    this._resetIdle()
  },

  _onStampDrop(ctx, rec, target) {
    if (!this._alive) return
    this._resetStamp(rec)
    const cell = target && target.cell
    if (!cell || cell.pipe || cell.stone) return
    this._placePipeInCell(ctx, cell, rec.data.type, 0, true)
    ctx.services.audio.sfx('pop')
    this._resetIdle()
  },

  // Stämpeln är återanvändbar: efter att den lagt ett rör fjädrar den hem igen.
  _resetStamp(rec) {
    rec.placed = false
    if (rec.view.destroyed) return
    rec.view.eventMode = 'static'
    gsap.to(rec.view, { x: rec.home.x, y: rec.home.y, duration: 0.25, ease: 'back.out(1.4)' })
    gsap.to(rec.view.scale, { x: rec.base.x, y: rec.base.y, duration: 0.18 })
  },

  // ---- sten ----
  _makeStone(ctx, cell) {
    const c = new Container()
    c.position.set(cell.x, cell.y)
    const sh = new Graphics().ellipse(0, 42, 46, 14).fill({ color: COLORS.shadow, alpha: 0.14 })
    sh.eventMode = 'none'
    // RITAD sten (var en 🪨-emoji).
    const e = new Graphics()
    e.moveTo(-38, 26).lineTo(-28, -14).lineTo(-4, -30).lineTo(28, -14).lineTo(36, 26).closePath()
    e.fill(0x9b9088).stroke({ width: 4, color: 0x74695f })
    e.moveTo(-16, 24).lineTo(-10, -8).lineTo(8, -20).stroke({ width: 3, color: 0x74695f, alpha: 0.55 })
    e.ellipse(-14, 4, 8, 5).fill({ color: 0xb6ada4, alpha: 0.7 })
    c.addChild(sh, e)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Circle(0, 0, 70)
    c._tap = () => this._removeStone(ctx, cell)
    c.on('pointertap', c._tap)
    this._propLayer.addChild(c)
    this._stones.push(c)
    return c
  },

  _removeStone(ctx, cell) {
    if (!this._alive) return
    const s = cell.stone
    if (!s) return
    cell.stone = null
    if (s._tap) s.off('pointertap', s._tap)
    const i = this._stones.indexOf(s)
    if (i >= 0) this._stones.splice(i, 1)
    ctx.services.audio.sfx('soft')
    puff(ctx.fxLayer, cell.x, cell.y, { color: 0xb8b8b8 })
    floatText(ctx.fxLayer, cell.x, cell.y - 30, '💪')
    pop(s)
    const st = { s: 1, a: 1 }
    const tw = gsap.to(st, {
      s: 1.3,
      a: 0,
      duration: 0.35,
      ease: 'power2.in',
      onUpdate: () => {
        if (s.destroyed) {
          tw.kill()
          return
        }
        s.scale.set(st.s)
        s.alpha = st.a
      },
      onComplete: () => {
        if (!s.destroyed) s.destroy()
      },
    })
    this._recomputePath(ctx, true)
    this._resetIdle()
  },

  // ---- vägberäkning (flödesfyll från källan) ----
  _cellAt(col, row) {
    return this._grid[row] ? this._grid[row][col] : null
  },

  _traverse() {
    const cells = []
    const visited = new Set()
    let cur = { col: this._sourceCol, row: 0 }
    let came = 'T' // vatten matas in uppifrån i källcellen
    let connected = false
    while (cur) {
      if (cur.col < 0 || cur.col >= this._cols || cur.row < 0 || cur.row >= this._rows) break
      const cell = this._cellAt(cur.col, cur.row)
      if (!cell || !cell.pipe) break
      const ports = portsFor(cell.pipe._ptype, cell.pipe._rot)
      if (!ports.includes(came)) break
      const key = cur.col + ',' + cur.row
      if (visited.has(key)) break
      visited.add(key)
      cells.push({ col: cur.col, row: cur.row })
      if (cur.col === this._mugCol && cur.row === this._rows - 1 && ports.includes('B')) {
        connected = true
        break
      }
      let moved = false
      for (const p of ports) {
        if (p === came) continue
        const n = neighborOf(cur, p)
        if (n.col < 0 || n.col >= this._cols || n.row < 0 || n.row >= this._rows) continue
        const nc = this._cellAt(n.col, n.row)
        if (!nc || !nc.pipe) continue
        const nports = portsFor(nc.pipe._ptype, nc.pipe._rot)
        if (!nports.includes(opposite(p))) continue
        cur = n
        came = opposite(p)
        moved = true
        break
      }
      if (!moved) break
    }
    return { cells, connected }
  },

  _recomputePath(ctx, announce = true) {
    const res = this._traverse()
    const pts = [{ x: this._sourceX, y: GRIDY0 - 60 }]
    for (const c of res.cells) pts.push(cellCenter(c.col, c.row))
    if (res.connected) pts.push({ x: this._mugX, y: this._mugY - 58 })
    this._path = pts

    // Synligt rör-flöde: färga innerkanalen blå så långt vattnet nått (även läckande).
    this._paintFlow(res.cells)

    const was = this._connected
    this._connected = res.connected
    if (this._connected && !was && !this._resolving && announce) {
      ctx.services.audio.sfx('reveal')
      ctx.services.voice.say('Nu rinner det!')
      res.cells.forEach((c, i) =>
        this._delay(i * 0.12, () => {
          const cc = cellCenter(c.col, c.row)
          sparkle(ctx.fxLayer, cc.x, cc.y)
        })
      )
      this._cheerElvira(ctx, false) // Elvira ser att vattnet är på väg
    }
  },

  // Tona in/ut kanal-overlayen per rör: "vått" = ligger på vattnets aktuella väg.
  // Fördröjning per steg → en löpande fyllning som följer vattnet ner mot muggen.
  _paintFlow(cells) {
    const wetKeys = new Set(cells.map((c) => c.col + ',' + c.row))
    for (const p of this._pipes) {
      if (!p || p.destroyed || !p._wet) continue
      const key = p._cell && p._cell.col + ',' + p._cell.row
      const on = key != null && wetKeys.has(key)
      if (on && !p._wetOn) {
        p._wetOn = true
        const idx = cells.findIndex((c) => c.col + ',' + c.row === key)
        gsap.killTweensOf(p._wet)
        gsap.to(p._wet, { alpha: 0.92, duration: 0.28, delay: Math.max(0, idx) * 0.07, ease: 'sine.out' })
      } else if (!on && p._wetOn) {
        p._wetOn = false
        gsap.killTweensOf(p._wet)
        gsap.to(p._wet, { alpha: 0, duration: 0.18 })
      }
    }
  },

  // Elvira reagerar: ett glatt litet hopp (via y, krockar ej med skal-andningen) +
  // ett hjärta/vatten-emoji ovanför henne.
  _cheerElvira(ctx, drink) {
    const e = this._elvira
    if (!e || e.destroyed) return
    const by = e.y
    gsap.killTweensOf(e, 'y')
    gsap
      .timeline()
      .to(e, { y: by - 22, duration: 0.16, ease: 'power2.out' })
      .to(e, { y: by, duration: 0.36, ease: 'bounce.out' })
    floatText(ctx.fxLayer, e.x, by - 130, drink ? randomFrom(['💗', '😋', '🥰']) : '💧')
  },

  // ---- ticker: vatten + idle/auto-hjälp ----
  _update(ctx, t) {
    if (!this._alive) return
    const dt = t.deltaMS
    this._clock += dt

    // Idle-recue (glöd vid ~6s) + auto-hjälp (vid ~14s) — bara om ej klar.
    if (!this._resolving && !this._connected) {
      this._idle += dt
      if (this._idle >= 6000 && !this._hintShown) {
        this._hintShown = true
        this._showHint(ctx)
      }
      if (this._idle >= 14000) {
        this._idle = 0
        this._hintShown = false
        this._clearGlow()
        this._autoHelp(ctx)
      }
    } else if (this._connected) {
      this._idle = 0
    }

    // Spawna droppar medan det finns en väg (även om den läcker).
    if (!this._resolving && this._path && this._path.length > 1 && this._drops.length < 32) {
      this._spawnAcc += dt
      if (this._spawnAcc >= 280) {
        this._spawnAcc -= 280
        this._spawnDrop()
      }
    }

    // Flytta droppar längs vägen.
    if (this._drops.length) {
      const pxPerMs = 0.3
      let dead = false
      for (const d of this._drops) {
        d.dist += pxPerMs * dt
        const p = pointAt(this._path, d.dist)
        if (!p || p.ended) {
          if (this._connected) {
            this._fill = Math.min(1, this._fill + 0.012)
            if (this._clock - (this._lastRip || 0) > 360) {
              this._lastRip = this._clock
              ripple(ctx.fxLayer, this._mugX, this._mugY - 40, { color: 0x9fdcf5, maxR: 46 })
              if (Math.random() < 0.5) ctx.services.audio.sfx('soft')
            }
          } else if (p) {
            // Läckage: en mjuk pöl vid sista öppna porten (aldrig straff).
            if (this._clock - (this._lastLeak || 0) > 750) {
              this._lastLeak = this._clock
              puff(ctx.fxLayer, p.x, p.y + 18, { color: 0x9fdcf5, count: 6 })
              ctx.services.audio.sfx('soft')
            }
          }
          if (!d.g.destroyed) d.g.destroy()
          d._dead = true
          dead = true
          continue
        }
        if (!d.g.destroyed) {
          d.g.x = p.x + Math.sin(d.dist * 0.045 + d.phase) * 3
          d.g.y = p.y
        }
      }
      if (dead) this._drops = this._drops.filter((d) => !d._dead)
    }

    this._drawMugWater()
    if (this._fill >= 1 && this._connected && !this._resolving) this._bloom(ctx)
  },

  _spawnDrop() {
    if (!this._path || this._path.length < 2) return
    const g = new Graphics().circle(0, 0, 7 + Math.random() * 3).fill({ color: Math.random() < 0.5 ? COLORS.blue : 0x9fdcf5 })
    g.eventMode = 'none'
    g.position.set(this._path[0].x, this._path[0].y)
    this._dropLayer.addChild(g)
    this._drops.push({ g, dist: 0, phase: Math.random() * 6.28, _dead: false })
  },

  // ---- hjälp ----
  // Första lösningscell som saknar/har fel rör → nästa "rätta" handling.
  _findNextFix() {
    for (const s of this._solution) {
      const cell = this._cellAt(s.col, s.row)
      if (!cell || cell.stone) continue
      if (!cell.pipe) return { cell, req: s, kind: 'place' }
      if (cell.pipe._ptype !== s.type) return { cell, req: s, kind: 'replace' }
      if (cell.pipe._rot !== s.rot) return { cell, req: s, kind: 'rotate' }
    }
    return null
  },

  _showHint(ctx) {
    const fix = this._findNextFix()
    if (!fix) return
    this._clearGlow()
    const g = new Container()
    g.position.set(fix.cell.x, fix.cell.y)
    g.eventMode = 'none'
    g.addChild(
      new Graphics()
        .roundRect(-56, -56, 112, 112, 18)
        .fill({ color: COLORS.yellow, alpha: 0.16 })
        .stroke({ width: 6, color: COLORS.yellow, alpha: 0.9 })
    )
    this._glowLayer.addChild(g)
    this._glow = { g, tw: breathe(g, { scale: 1.06 }) }
    ctx.services.voice.say('Prova ett rör här!')
  },

  _clearGlow() {
    if (!this._glow) return
    this._glow.tw?.kill()
    if (!this._glow.g.destroyed) this._glow.g.destroy()
    this._glow = null
  },

  // Lägg/justera EN felande bit → vägen garanteras till slut kopplas.
  _autoHelp(ctx) {
    if (!this._alive || this._resolving) return
    const fix = this._findNextFix()
    if (!fix) return
    const { cell, req, kind } = fix
    if (kind === 'place') {
      this._placePipeInCell(ctx, cell, req.type, req.rot, true)
    } else if (kind === 'replace') {
      this._removePipe(cell)
      this._placePipeInCell(ctx, cell, req.type, req.rot, true)
    } else {
      cell.pipe._rot = req.rot
      gsap.to(cell.pipe, { rotation: req.rot * (Math.PI / 2), duration: 0.2, ease: 'back.out(2)' })
      pop(cell.pipe)
      this._recomputePath(ctx, true)
    }
    ctx.services.audio.sfx('pop')
  },

  // ---- blomning + nästa bana ----
  _bloom(ctx) {
    if (this._resolving) return
    this._resolving = true
    if (this._plant && !this._plant.destroyed) {
      this._plant.text = randomFrom(['🌸', '🌻'])
      bounceIn(this._plant)
    }
    ctx.services.audio.sfx('reveal')
    burst(ctx.fxLayer, this._mugX, this._mugY - 20, { count: 16 })
    sparkle(ctx.fxLayer, this._mugX, this._mugY - 40)
    this._cheerElvira(ctx, true) // Elvira dricker & jublar — muggen är full!
    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('banor', ((ctx.progress.get().custom?.banor) | 0) + 1)
    ctx.progress.complete() // delat firande: celebrate + beröm + bigCelebration + klistermärke
    this._delay(1.6, () => this._alive && this._buildLevel(ctx, this._level + 1))
  },

  // ---- städning ----
  _delay(time, fn) {
    const call = gsap.delayedCall(time, () => {
      if (this._alive) fn()
    })
    this._timers.push(call)
    return call
  },

  _killViewTweens(v) {
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    if (v._wet) gsap.killTweensOf(v._wet)
  },

  destroy(ctx) {
    this._alive = false
    ctx?.services?.voice?.cancel()
    this._timers?.forEach((c) => c.kill())
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)
    if (this._board && this._resetIdle) this._board.off('pointerdown', this._resetIdle)
    this._clearGlow()
    this._drag?.destroy()
    this._drops?.forEach((d) => !d.g.destroyed && d.g.destroy())
    this._pipes?.forEach((p) => this._killViewTweens(p))
    this._stones?.forEach((s) => this._killViewTweens(s))
    this._elviraBreath?.kill()
    if (this._elvira) this._killViewTweens(this._elvira)
    if (this._mugContainer) this._killViewTweens(this._mugContainer)
    if (this._plant) this._killViewTweens(this._plant)
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
