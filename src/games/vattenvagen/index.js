// Vattenvägen — barnet drar och vrider rörbitar på ett rutnät så vattnet från
// kranen hittar hela vägen ner till Elviras törstiga mugg och plantan blommar.
// Pyssel i Where's My Water-anda men helt förlåtande: varje rör som inte kopplar
// "sitter bara där", läckage = en riktig stråle som rinner ut, och mjuk auto-hjälp
// garanterar att banan alltid går att klara. Kontroller: placering + rotation +
// lyfta bort sten (massor av agens). Avbildad person: bara Elvira (mugg-ägaren).
//
// VATTNET ÄR RIKTIG VÄTSKA (lib/vatska.js, SPH) på de tre ställen där det SYNS:
// kranens stråle, läckan ur sista öppna porten, och muggen som fylls på riktigt.
// Inuti rören simuleras ingenting — kanalen är 26 px bred och röret ogenomskinligt,
// så en simulering där hade kostat allt och synts noll. I stället SUGS vattnet in i
// källrörets mynning och kommer ut i andra änden efter en restid som växer med
// vägens längd; kanal-overlayen (_paintFlow) visar färden. Målet läses ur vätskan:
// muggens fyllnadsgrad är vattenYTANS höjd, inte en uppräknad siffra.
import { Container, Graphics, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { bounceIn, pop, puff, sparkle, ripple, burst, floatText, breathe } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { FluidWorld, FluidView, FLUIDS } from '../../lib/vatska.js'
import { COLORS, DESIGN_W, DESIGN_H } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

// --- rutnäts-geometri (designkoordinater 1280×720) ---
const CELL = 120
const GRIDY0 = 200 // översta radens center-y
// Rutnätet centreras efter antal kolumner — banorna växer i BREDD, aldrig i höjd:
// en fjärde rad trycker muggen till y≈690 där brickan och skärmkanten äter den.
const gridX0 = (cols) => 640 - ((cols - 1) * CELL) / 2

// --- muggens mått (relativt muggens center) ---
const MUG_HW = 62 // inre halvbredd — mellan väggkollisionerna
const MUG_FLOOR = 78 // inre botten
const MUG_LINE = -44 // den streckade mållinjen

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
function cellCenter(x0, col, row) {
  return { x: x0 + col * CELL, y: GRIDY0 + row * CELL }
}
// Yttre kant på en port, dit vattnet kommer ut ur ett rör, + farten det får med sig.
const PORT_OUT = {
  T: { dx: 0, dy: -62, vx: 0, vy: -1.6 },
  B: { dx: 0, dy: 62, vx: 0, vy: 2.6 },
  L: { dx: -62, dy: 0, vx: -2.6, vy: 0.6 },
  R: { dx: 62, dy: 0, vx: 2.6, vy: 0.6 },
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

    // Per-bana-bräde (innehållet rensas mellan banor; lagren själva ligger kvar,
    // för vätskelagret får inte rivas med banan).
    this._board = new Container()
    this._root.addChild(this._board)

    // Lager-ordning: rutor → rör → VÄTSKA → bricka(panel) → rekvisita → glöd → brickans rör.
    // Vätskan ligger framför rören (en läcka ska synas) men bakom muggen, så muggens
    // vatten ses GENOM glaset. Brickans panel ligger bakom muggen — annars döljer den
    // muggens nedre hälft, precis där vattennivån stiger.
    this._gridLayer = new Container()
    this._pipeLayer = new Container()
    this._board.addChild(this._gridLayer, this._pipeLayer)

    this._fluid = new FluidWorld({
      // Muggen rymmer ~220 partiklar upp till mållinjen, och strålarna lever
      // ovanpå det. Taket måste ligga klart över summan: när det nås återanvänds
      // den ÄLDSTA partikeln — alltså vattnet som redan ligger stilla i muggen.
      max: 420,
      radius: 22,
      gravityY: 0.5,
      rho0: FLUIDS.vatten.rho0,
      sigma: FLUIDS.vatten.sigma,
      beta: FLUIDS.vatten.beta,
      restitution: 0.06,
      wallFriction: 0.3,
      // Inga världsväggar: spill ska rinna ur bild och städas av _cull, inte samlas
      // i en pöl bakom brickan där ingen ser den.
      walls: { left: false, right: false, bottom: false, top: false },
      bounds: { left: -160, right: DESIGN_W + 160, top: -160, bottom: DESIGN_H + 140 },
    })
    // Tröskel och suddning är satta för en STRÅLE, inte för ett fyllt glas: en
    // fallande stråle är smal, och med saftbarens värden (blur 9, tröskel 0.42)
    // hamnar den under tröskeln och ritas i kantfärgen — nästan vit, mot en
    // ljusblå himmel = osynlig. Uppmätt i _vatskeprobe.mjs.
    this._fluidView = new FluidView(this._board, this._fluid, {
      color: FLUIDS.vatten.color,
      edge: 0x8fd4f5,
      alpha: FLUIDS.vatten.alpha,
      blobScale: 1.25,
      threshold: 0.34,
      soft: 0.1,
      blur: 6,
      quality: 2,
      resolution: 0.5,
    })
    this._fluidView.layer.eventMode = 'none'
    this._fluidView.layer.interactiveChildren = false

    this._trayBackLayer = new Container()
    this._trayBackLayer.eventMode = 'none'
    this._propLayer = new Container()
    this._glowLayer = new Container()
    this._glowLayer.eventMode = 'none'
    this._trayLayer = new Container()
    this._board.addChild(this._trayBackLayer, this._propLayer, this._glowLayer, this._trayLayer)

    this._drag = new DragController({ space: this._board, services: ctx.services })

    // Tillstånd
    this._pipes = []
    this._stones = []
    this._glow = null
    this._fill = 0
    this._connected = false
    this._resolving = false
    this._idle = 0
    this._hintShown = false
    this._spawnAcc = 0
    this._clock = 0
    this._mounted = false
    this._queue = [] // vatten på väg genom rören: tidpunkt då droppen kommer ut
    this._exit = null // var vattnet kommer ut just nu (mugg eller läcka)
    this._gluggSteg = 0

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

    // Städa förra banan (lagren återanvänds — vätskelagret får inte rivas).
    this._drag.clear()
    this._clearGlow()
    this._pipes.forEach((p) => this._killViewTweens(p))
    this._stones.forEach((s) => this._killViewTweens(s))
    this._elviraBreath?.kill()
    if (this._elvira) this._killViewTweens(this._elvira)
    this._elvira = null
    for (const l of [this._gridLayer, this._pipeLayer, this._trayBackLayer, this._propLayer, this._glowLayer, this._trayLayer]) {
      l.removeChildren().forEach((o) => o.destroy({ children: true }))
    }
    this._pipes = []
    this._stones = []
    this._fluid.clear()
    this._fluid.clearColliders()
    this._queue = []
    this._exit = null
    this._gluggSteg = 0

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
    this._gx0 = gridX0(this._cols)
    this._lastRowY = GRIDY0 + (this._rows - 1) * CELL
    this._sourceX = cellCenter(this._gx0, this._sourceCol, 0).x
    this._mugX = cellCenter(this._gx0, this._mugCol, this._rows - 1).x
    this._mugY = this._lastRowY + 145

    // Rutnätsceller + drop-mål.
    this._grid = []
    for (let r = 0; r < this._rows; r++) {
      const row = []
      for (let c = 0; c < this._cols; c++) {
        const center = cellCenter(this._gx0, c, r)
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
    // Kranen sitter så högt att strålen SYNS innan den går in i röret, och pipen
    // (lokalt x 26..44, skala 1.35) centreras över källkolumnen så vattnet kommer
    // ur pipen och inte bredvid den. Den gamla vita "pip-remsan" är borttagen —
    // den var en målad vattenstråle, och nu finns en riktig.
    tap.position.set(this._sourceX - 47, GRIDY0 - 142)
    tap.scale.set(1.35) // matchar den 96px-emoji den ersatte i visuell tyngd
    tap.eventMode = 'none'
    this._propLayer.addChild(tap)
    this._tapY = GRIDY0 - 112 // pipens mynning: där vattnet föds

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
    this._trayBackLayer.addChild(trayRect)
    let types = [...new Set(this._solution.filter((_, i) => missingSet.has(i)).map((s) => s.type))]
    if (!types.length) types = ['rak']
    // Brickans rör får inte hamna bakom muggen — muggen står PÅ brickan och skymde
    // annars den bit barnet ska dra. Krockar mitten, flytta hela raden åt andra hållet.
    const bredd = (types.length - 1) * 180
    let startX = 640 - bredd / 2
    if (Math.abs(this._mugX - 640) < bredd / 2 + 130) {
      startX = this._mugX < 640 ? 1090 - bredd : 190
    }
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
    this._recomputePath(ctx, false)

    if (this._mounted && this._level > 1) {
      ctx.later(0.5, () => ctx.services.voice.say(this.voiceIntro))
    }
  },

  _buildMug() {
    const mug = new Container()
    mug.position.set(this._mugX, this._mugY)
    const shadow = new Graphics().ellipse(this._mugX, this._mugY + 92, 72, 18).fill({ color: COLORS.shadow, alpha: 0.12 })
    shadow.eventMode = 'none'
    // Glaset ligger FRAMFÖR vätskan, så dess alpha bleker vattnet. 0.5 gjorde en
    // full mugg till en ljusblå kloss; 0.22 låter vattnet behålla sin färg och
    // glaset läsas på sin kontur och sin glansstrimma i stället.
    const glass = new Graphics()
      .roundRect(-75, -85, 150, 170, 24)
      .fill({ color: 0xbfe9ff, alpha: 0.22 })
      .stroke({ width: 5, color: COLORS.white, alpha: 0.8 })
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
    mug.addChild(glass, glans, line, plant)
    mug.eventMode = 'none'
    this._propLayer.addChild(shadow, mug)
    this._mugContainer = mug

    // Muggens INSIDA som kollisioner — det är de som gör att vattnet stannar kvar
    // och att ytan stiger. Glaset ritas ovanpå vätskelagret, så vattnet ses genom det.
    this._fluid.addBox(this._mugX, this._mugY + MUG_FLOOR + 12, MUG_HW * 2 + 40, 24)
    this._fluid.addBox(this._mugX - MUG_HW - 11, this._mugY, 22, 190)
    this._fluid.addBox(this._mugX + MUG_HW + 11, this._mugY, 22, 190)
  },

  // ---- bana-planer ----
  // ALLTID 3 rader: en fjärde rad trycker muggen ner i brickan och ur bild. Banorna
  // växer i bredd i stället — längre väg, fler kolumner, samma läsbara mugg.
  // Muggen ligger ALDRIG i kranens kolumn: gjorde den det föll läckan från översta
  // röret rakt ner i muggen och banan löste sig av sig själv medan barnet tittade på.
  _planLevel(level) {
    const L = Math.max(1, level)
    if (L === 1) return { cols: 4, rows: 3, sourceCol: 1, mugCol: 2, turnRow: 0, stones: [] }
    if (L === 2) return { cols: 4, rows: 3, sourceCol: 1, mugCol: 2, turnRow: 1, stones: [] }
    if (L === 3) return { cols: 5, rows: 3, sourceCol: 0, mugCol: 3, turnRow: 1, stones: [{ col: 1, row: 0 }] }
    if (L === 4) return { cols: 5, rows: 3, sourceCol: 1, mugCol: 4, turnRow: 1, stones: [{ col: 2, row: 0 }] }
    if (L === 5) return { cols: 6, rows: 3, sourceCol: 0, mugCol: 4, turnRow: 1, stones: [{ col: 2, row: 2 }] }
    // 6+: slumpad start/sväng — aldrig slut.
    const cols = 6
    const sourceCol = (Math.random() * cols) | 0
    return {
      cols,
      rows: 3,
      sourceCol,
      mugCol: (sourceCol + 1 + ((Math.random() * (cols - 1)) | 0)) % cols,
      turnRow: 1,
      stones: 'auto',
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
    let pushedCame = 'T' // inloppsporten på SISTA cellen som faktiskt blev våt
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
      pushedCame = came
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
    // Var kommer vattnet UT? Kopplad väg → muggen. Annars ur den öppna porten på
    // sista röret som vattnet nådde: nedåt hellre än i sidled, i sidled hellre än
    // tillbaka upp. Nådde vattnet inget rör alls finns ingen utgång — då rinner
    // kranens stråle rakt igenom rutnätet, och det är precis vad barnet ska se.
    let exit = null
    if (connected) {
      exit = { x: this._mugX, y: this._lastRowY + 62, vx: 0, vy: 2.4, mug: true }
    } else if (cells.length) {
      const last = cells[cells.length - 1]
      const cell = this._cellAt(last.col, last.row)
      const ports = cell && cell.pipe ? portsFor(cell.pipe._ptype, cell.pipe._rot) : []
      const open = ['B', 'L', 'R', 'T'].find((p) => ports.includes(p) && p !== pushedCame)
      if (open) {
        const c = cellCenter(this._gx0, last.col, last.row)
        const o = PORT_OUT[open]
        exit = { x: c.x + o.dx, y: c.y + o.dy, vx: o.vx, vy: o.vy, mug: false }
      }
    }
    return { cells, connected, exit }
  },

  _recomputePath(ctx, announce = true) {
    const res = this._traverse()
    this._exit = res.exit
    // Restid genom rören: ju längre ledning, desto längre innan vattnet kommer ut.
    this._pipeMs = 140 + res.cells.length * 95
    // Går det att mata in vatten alls? Källcellen måste ha ett rör med port uppåt.
    const src = this._cellAt(this._sourceCol, 0)
    this._hasEntry = !!(src && src.pipe && portsFor(src.pipe._ptype, src.pipe._rot).includes('T'))

    // Synligt rör-flöde: färga innerkanalen blå så långt vattnet nått (även läckande).
    this._paintFlow(res.cells)

    const was = this._connected
    this._connected = res.connected
    if (this._connected && !was && !this._resolving && announce) {
      ctx.services.audio.sfx('reveal')
      ctx.services.voice.say('Nu rinner det!')
      res.cells.forEach((c, i) =>
        ctx.later(i * 0.12, () => {
          const cc = cellCenter(this._gx0, c.col, c.row)
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

    this._flow(ctx, dt)
    this._fluid.update(dt)
    this._fluidView.update()
    this._readMug(ctx)

    if (this._fill >= 1 && this._connected && !this._resolving) this._bloom(ctx)
  },

  // ---- vattnet: kran → rör → utlopp ----
  _flow(ctx, dt) {
    const f = this._fluid

    // 1. Kranen rinner alltid (utom under firandet). Det är strålen som gör pusslet
    // begripligt: finns ingen väg faller vattnet rakt igenom rutnätet, och DÅ förstår
    // barnet vad rören är till för.
    // Takten är räknad, inte vald: en droppe faller ~480 px/s när den passerat
    // rutnätet, och klicken är 55 px. Med en droppe var 145:e ms hamnar de 70 px
    // isär — en prickad linje som aldrig når metaboll-tröskeln. 55 ms ger ~26 px
    // mellanrum och en sammanhängande stråle.
    if (!this._resolving) {
      this._spawnAcc += dt
      while (this._spawnAcc >= 70) {
        this._spawnAcc -= 70
        f.spawn(this._sourceX + (Math.random() - 0.5) * 6, this._tapY, { vy: 1.6 })
      }
    }

    // 2. Källrörets mynning suger in vattnet. Varje insugen droppe bokförs med den
    // tid då den kommer ut i andra änden.
    if (this._hasEntry) {
      const n = f.drain(this._sourceX, GRIDY0 - 32, 66, 56)
      for (let i = 0; i < n; i++) {
        if (this._queue.length < 60) this._queue.push(this._clock + this._pipeMs)
      }
    }

    // 3. Spill som inte kom genom ledningen rinner UTANFÖR muggen. Utan det här
    // samlas läckvattnet i muggen (den ser full ut men räknas inte) och äter hela
    // partikelbudgeten — uppmätt: 132 partiklar efter 6 s och stigande.
    if (f.drain(this._mugX, this._mugY - 10, MUG_HW * 2 + 52, 210, { pal: 0 }) > 0) {
      if (this._clock - (this._lastSpill || 0) > 700) {
        this._lastSpill = this._clock
        puff(ctx.fxLayer, this._mugX + (Math.random() < 0.5 ? -1 : 1) * (MUG_HW + 22), this._mugY - 70, { color: 0x9fdcf5, count: 4 })
      }
    }

    // 4. Utloppet: muggen eller läckan.
    const ex = this._exit
    while (this._queue.length && this._queue[0] <= this._clock) {
      this._queue.shift()
      if (!ex || this._resolving) continue
      // pal 1 = vatten som kommit HELA vägen genom ledningen. Det är bara sådant
      // vatten muggen räknar — annars kan ett stänk som råkar landa rätt fylla målet.
      // pal påverkar inte utseendet (ingen palette är satt).
      // TAKTKNAPP: en kopplad ledning ger två droppar per insugen. Kranens takt är
      // satt av hur strålen SER ut (droppar tätare än 55 px), muggens av hur länge
      // ett barn orkar titta på — 1:1 gav 14 s, det här ger ~7 s.
      const antal = ex.mug ? 2 : 1
      for (let k = 0; k < antal; k++) {
        f.spawn(ex.x + (Math.random() - 0.5) * 9, ex.y, { vx: ex.vx, vy: ex.vy, pal: ex.mug ? 1 : 0 })
      }
      if (ex.mug) {
        if (this._clock - (this._lastRip || 0) > 420) {
          this._lastRip = this._clock
          ripple(ctx.fxLayer, this._mugX, this._mugY - 40, { color: 0x9fdcf5, maxR: 46 })
        }
      } else if (this._clock - (this._lastLeak || 0) > 900) {
        // Läckage: en riktig stråle ur den öppna porten (aldrig straff, bara en ledtråd).
        this._lastLeak = this._clock
        puff(ctx.fxLayer, ex.x, ex.y + 10, { color: 0x9fdcf5, count: 5 })
        ctx.services.audio.sfx('soft')
      }
    }
  },

  // Muggens fyllnad = vattenYTANS höjd, inte en uppräknad siffra. Tre filter, och
  // alla tre behövs: bara vatten som gått genom ledningen (pal 1), bara vatten som
  // LIGGER STILL (en fallande droppe passerar mätfönstret från toppen och skulle
  // annars rapportera muggen full — uppmätt: fyllnaden hoppade 0.43 → 1 → 0.58),
  // och ytan som den TREDJE lägsta droppen.
  _readMug(ctx) {
    const f = this._fluid
    const x0 = this._mugX - MUG_HW - 6
    const x1 = this._mugX + MUG_HW + 6
    const yTop = this._mugY - 100
    const yBot = this._mugY + MUG_FLOOR + 10
    let n = 0
    let s0 = Infinity
    let s1 = Infinity
    let s2 = Infinity
    for (let i = 0; i < f.count; i++) {
      if (f.pal[i] !== 1) continue
      const y = f.y[i]
      if (y < yTop || y > yBot) continue
      const x = f.x[i]
      if (x < x0 || x > x1) continue
      if (Math.abs(f.vy[i]) > 1.8) continue
      n++
      if (y < s0) {
        s2 = s1
        s1 = s0
        s0 = y
      } else if (y < s1) {
        s2 = s1
        s1 = y
      } else if (y < s2) {
        s2 = y
      }
    }
    const floorY = this._mugY + MUG_FLOOR
    const lineY = this._mugY + MUG_LINE
    const surface = n >= 3 ? s2 : floorY
    const fill = n < 4 ? 0 : Math.max(0, Math.min(1, (floorY - surface) / (floorY - lineY)))
    this._fill = fill

    // "Glugg" per femtedel: en stigande pentatonisk ton så nivån HÖRS stiga.
    const steg = Math.min(5, Math.floor(fill * 5))
    if (steg > this._gluggSteg) {
      this._gluggSteg = steg
      const skala = [262, 294, 330, 392, 440]
      ctx.services.audio.tone({ freq: skala[Math.min(4, steg - 1)], dur: 0.16, type: 'sine', vol: 0.5 })
    }
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
    this._bloomPlant()
    ctx.services.audio.sfx('reveal')
    burst(ctx.fxLayer, this._mugX, this._mugY - 20, { count: 16 })
    sparkle(ctx.fxLayer, this._mugX, this._mugY - 40)
    this._cheerElvira(ctx, true) // Elvira dricker & jublar — muggen är full!
    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('banor', ((ctx.progress.get().custom?.banor) | 0) + 1)
    ctx.progress.complete() // delat firande: celebrate + beröm + bigCelebration + klistermärke
    ctx.later(1.6, () => this._alive && this._buildLevel(ctx, this._level + 1))
  },

  // Grodden slår ut. (Förut: `this._plant.text = '🌸'` — men plantan är en Graphics,
  // så tilldelningen gjorde ingenting alls och blomningen syntes ALDRIG.)
  _bloomPlant() {
    const p = this._plant
    if (!p || p.destroyed) return
    const kron = randomFrom([COLORS.pink, 0xff8fb1, 0xf2c14e])
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      p.ellipse(Math.cos(a) * 13, -34 + Math.sin(a) * 13, 10, 8).fill(kron)
    }
    p.circle(0, -34, 8).fill(COLORS.yellow).stroke({ width: 2, color: 0xd8a520 })
    bounceIn(p)
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
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)
    if (this._board && this._resetIdle) this._board.off('pointerdown', this._resetIdle)
    this._clearGlow()
    this._drag?.destroy()
    this._fluidView?.destroy()
    this._fluid?.destroy()
    this._fluidView = null
    this._fluid = null
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
