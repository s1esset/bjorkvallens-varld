// Färgregn — färginlärning (2–5 år). Glansiga, tårformade droppar regnar mjukt
// nedåt över en ljus himmel med drivande moln; rösten ber barnet trycka på en
// viss färg. Varje pekning ger ringle + plask + ljud (<100ms). Rätt färg poppar
// med pling, gnistor och fyller framstegsraden; fel färg vinglar bara glatt
// vidare (ALDRIG en bestraffning). Ibland faller en regnbågsdroppe som sprutar
// alla färger. Inga felsteg, ingen timer, inget slut — när målet nås firar vi
// (complete) och en ny, lite svårare runda startar (oändlig lek).
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { pop, wiggle, sparkle, bounceIn, puff, ripple, burst, shake, breathe, floatText } from '../../lib/feedback.js'
import { COLORS, PRAISE, FONT } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

// Färgpalett: ASCII-nyckel + 0xRRGGBB + svensk plural-fras (böjd) + grundord (för ord-rundan).
const COLOR_DEFS = [
  { key: 'rod', color: 0xff6b6b, plural: 'röda', word: 'röd' },
  { key: 'gul', color: 0xffd35c, plural: 'gula', word: 'gul' },
  { key: 'bla', color: 0x4aa3df, plural: 'blåa', word: 'blå' },
  { key: 'gron', color: 0x5bbf6a, plural: 'gröna', word: 'grön' },
  { key: 'lila', color: 0xa78bfa, plural: 'lila', word: 'lila' },
  { key: 'rosa', color: 0xff9ec4, plural: 'rosa', word: 'rosa' },
]

// Stigande kombo-ton: klar dur-pentatonisk stege (flera rätt i snabb följd klättrar).
const COMBO_LADDER = [523.25, 587.33, 659.25, 783.99, 880, 987.77, 1174.66, 1318.51]
const RAINBOW = [0xff6b6b, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa, 0xff9ec4]

const SIDE_MARGIN = 120 // droppar håller sig i x ∈ [120, 1160]
const SPAWN_Y = -90
const DROP_R = 42
const BOTTOM_Y = 648 // droppen "landar" i pölremsan här
const PUDDLE_Y = 672 // pölarnas mittlinje (i markremsan)

// Mörkare nyans av en 0xRRGGBB-färg (till kontur/skuggning).
function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}

export default {
  id: 'fargregn',
  titleSv: 'Färgregn',
  icon: '🌈',
  category: 'larande',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'fargregn',
  voiceIntro: 'Tryck på de röda dropparna!',

  init(ctx) {
    this._alive = true
    this._drops = []
    this._breaths = []
    this._idle = 0
    this._spawnAcc = 0
    this._paused = true
    this._t = 0
    this._lastTargetKey = null
    this._combo = 0
    this._lastCorrectAt = -999
    this._lastPlop = -999
    const prog = ctx.progress.get()
    this._rounds = prog.highestLevel || prog.custom?.rundor || 0
    // Bemästrade färger (fyller "samla regnbågen"-tavlan) — persistas via progress.
    this._mastered = new Set(Array.isArray(prog.custom?.mastered) ? prog.custom.mastered : [])

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._buildScene(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)

    this._startRound(ctx, false) // första rundan annonseras i mount()
  },

  mount(ctx) {
    ctx.services.voice.say(this._introPhrase)
  },

  // Bygger bakgrund, pölar, lager och HUD en gång.
  _buildScene(ctx) {
    // 1) Marknadsmässig himmel med sol + drivande moln (exit-säker).
    this._root.addChild(createScene('sky', { width: ctx.width, height: ctx.height }))

    // Allt spelinnehåll i en egen container så ett firande-skak inte avslöjar
    // bakgrundens kanter (bakgrunden står stilla).
    this._content = new Container()
    this._root.addChild(this._content)

    // 2) Pölar i markremsan (dekor — fångar inga tap, men plaskar när droppar landar).
    this._puddleLayer = new Container()
    this._puddleLayer.eventMode = 'none'
    this._puddleLayer.interactiveChildren = false
    this._content.addChild(this._puddleLayer)
    this._buildPuddles(ctx)

    // 3) Droppar (interaktiva).
    this._dropsLayer = new Container()
    this._content.addChild(this._dropsLayer)

    // 4) Plask/gnist-fx ovanpå droppar men under HUD (dekor).
    this._splashLayer = new Container()
    this._splashLayer.eventMode = 'none'
    this._splashLayer.interactiveChildren = false
    this._content.addChild(this._splashLayer)

    // 5) HUD: målfärg-skylt + framstegsrad.
    this._hud = new Container()
    this._content.addChild(this._hud)

    this._sign = new Container()
    this._sign.position.set(640, 96)
    this._signBox = new Graphics()
    this._signDrop = new Graphics()
    // Stort färgord (visas i ord-rundan i stället för droppe-formen).
    this._signWord = new Text({
      text: '',
      style: { fontFamily: FONT.display, fontSize: 66, fontWeight: '800', fill: 0x333333 },
    })
    this._signWord.anchor.set(0.5)
    this._signWord.visible = false
    this._sign.addChild(this._signBox, this._signDrop, this._signWord)
    this._sign.eventMode = 'static'
    this._sign.cursor = 'pointer'
    this._sign.on('pointertap', () => {
      if (!this._alive) return
      this._idle = 0
      ctx.services.voice.say(this._introPhrase)
      pop(this._signWord.visible ? this._signWord : this._signDrop)
    })
    this._hud.addChild(this._sign)

    // Lugn idle-attraktor: skylten andas mjukt så blicken dras till målfärgen.
    this._breaths.push(breathe(this._sign, { scale: 1.05, duration: 1.4 }))

    this._dotsRoot = new Container()
    this._dotsRoot.position.set(640, 178)
    this._dotsRoot.eventMode = 'none'
    this._hud.addChild(this._dotsRoot)
    this._dots = []

    // 6) "Samla regnbågen"-tavla i vänstra marginalen: en klick per bemästrad färg.
    this._buildRainbowBoard()
  },

  // Liten färgtavla i vänsterkanten (drop-fri marginal). Tomma prickar fylls med
  // riktig färg när barnet bemästrat den — något att återvända till och minnas orden.
  _buildRainbowBoard() {
    this._board = new Container()
    this._board.position.set(50, 360)
    this._board.eventMode = 'none'
    this._board.interactiveChildren = false
    const gap = 66
    const total = (COLOR_DEFS.length - 1) * gap
    const panel = new Graphics().roundRect(-32, -total / 2 - 34, 64, total + 68, 28).fill({ color: 0xffffff, alpha: 0.28 })
    this._board.addChild(panel)
    this._swatches = new Map()
    COLOR_DEFS.forEach((def, i) => {
      const g = new Graphics()
      g.y = -total / 2 + i * gap
      this._board.addChild(g)
      this._swatches.set(def.key, g)
      this._paintSwatch(def, this._mastered.has(def.key))
    })
    this._hud.addChild(this._board)
  },

  _paintSwatch(def, filled) {
    const g = this._swatches?.get(def.key)
    if (!g || g.destroyed) return
    g.clear()
    if (filled) {
      g.circle(0, 0, 20).fill(def.color).stroke({ width: 3, color: darken(def.color, 0.25) })
      g.ellipse(-6, -7, 7, 5).fill({ color: 0xffffff, alpha: 0.55 })
    } else {
      g.circle(0, 0, 20).fill({ color: 0xffffff, alpha: 0.45 }).stroke({ width: 3, color: 0xcbe6f4 })
    }
  },

  _buildPuddles(ctx) {
    this._puddles = []
    for (const fx of [0.16, 0.4, 0.61, 0.84]) {
      const w = 64 + Math.random() * 46
      const p = new Graphics()
      p.ellipse(0, 7, w, w * 0.26).fill({ color: 0x3f8fc6, alpha: 0.32 }) // skugga
      p.ellipse(0, 0, w, w * 0.28).fill({ color: 0x8fd6ee, alpha: 0.6 }) // vatten
      p.ellipse(-w * 0.28, -w * 0.06, w * 0.42, w * 0.1).fill({ color: 0xffffff, alpha: 0.45 }) // glans
      p.position.set(ctx.width * fx, PUDDLE_Y)
      this._puddleLayer.addChild(p)
      this._puddles.push(p)
    }
  },

  // Nivåparametrar växer mjukt med antal klarade rundor: fler färger, snabbare
  // och tätare regn samt fler droppar att samla. Alltid NO-FAIL.
  _levelFor(r) {
    return {
      colors: Math.min(6, 3 + Math.floor(r / 2)),
      need: Math.min(8, 4 + Math.floor(r / 2)),
      speed: Math.min(150, 72 + r * 8),
      interval: Math.max(480, 900 - r * 45),
    }
  },

  // Starta ny runda: ny målfärg, ny palett, nollställd räknare.
  _startRound(ctx, speak = true) {
    if (!this._alive) return
    const lvl = this._levelFor(this._rounds)
    this._need = lvl.need
    this._speed = lvl.speed
    this._interval = lvl.interval
    this._collected = 0
    this._paused = false
    this._idle = 0
    this._spawnAcc = lvl.interval // spawna direkt

    this._palette = shuffle(COLOR_DEFS).slice(0, lvl.colors)
    let choices = this._palette.filter((c) => c.key !== this._lastTargetKey)
    if (!choices.length) choices = this._palette
    this._target = randomFrom(choices)
    this._lastTargetKey = this._target.key
    this._introPhrase = 'Tryck på de ' + this._target.plural + ' dropparna!'

    // Ord-runda: efter ett par vanliga rundor visar skylten BARA färgordet stort i
    // färgen (ingen droppe-form att matcha mot) → barnet kopplar ord→färg.
    this._wordRound = this._rounds >= 2 && this._rounds % 3 === 2
    this._wordHintShown = false

    this._updateSign()
    this._buildDots()

    if (speak) ctx.services.voice.say(this._introPhrase)
  },

  _updateSign() {
    const t = this._target
    this._signBox
      .clear()
      .roundRect(-150, -58, 300, 116, 30)
      .fill(COLORS.cream)
      .stroke({ width: 6, color: t.color })

    if (this._wordRound && !this._wordHintShown) {
      // Bara ordet, stort och i färgen — ingen droppe att matcha mot.
      this._signDrop.visible = false
      this._signWord.visible = true
      this._signWord.text = t.word
      this._signWord.style.fontSize = 66
      this._signWord.style.fill = t.color
      this._signWord.position.set(0, 0)
    } else if (this._wordRound) {
      // Barnet tvekade → visa ordet mindre PLUS droppe-formen som hjälp.
      this._signWord.visible = true
      this._signWord.text = t.word
      this._signWord.style.fontSize = 50
      this._signWord.style.fill = t.color
      this._signWord.position.set(-64, 0)
      this._signDrop.visible = true
      this._signDrop.position.set(96, 0)
      this._drawDrop(this._signDrop, 30, t.color)
    } else {
      // Vanlig runda: droppe-formen i målfärgen.
      this._signWord.visible = false
      this._signDrop.visible = true
      this._signDrop.position.set(0, 0)
      this._drawDrop(this._signDrop, 36, t.color)
    }
  },

  _buildDots() {
    this._dotsRoot.removeChildren().forEach((o) => o.destroy())
    this._dots = []
    const gap = 44
    const total = (this._need - 1) * gap
    for (let i = 0; i < this._need; i++) {
      const d = new Graphics()
      d.circle(0, 0, 16).fill(0xffffff).stroke({ width: 3, color: 0xcbe6f4 })
      d.x = -total / 2 + i * gap
      this._dotsRoot.addChild(d)
      this._dots.push(d)
    }
  },

  _lightDot(i) {
    const d = this._dots[i]
    if (!d) return
    d.clear().circle(0, 0, 16).fill(this._target.color).stroke({ width: 3, color: darken(this._target.color, 0.25) })
    pop(d)
  },

  // Glansig tårformad droppe (spets uppåt) med mjuk svans, skuggning och highlight.
  _drawDrop(g, r, color) {
    g.clear()
    // mjuk svans ovanför (rörelsekänsla)
    g.ellipse(0, -r * 2.5, r * 0.3, r * 0.95).fill({ color, alpha: 0.14 })
    g.ellipse(0, -r * 1.95, r * 0.42, r * 0.7).fill({ color, alpha: 0.2 })
    // spets
    g.moveTo(0, -r * 1.8)
      .lineTo(r * 0.6, -r * 0.2)
      .lineTo(-r * 0.6, -r * 0.2)
      .fill({ color })
    // kropp
    g.circle(0, 0, r).fill(color).stroke({ width: 4, color: darken(color, 0.22) })
    // volym-skuggning nedtill
    g.circle(0, r * 0.3, r * 0.7).fill({ color: darken(color, 0.16), alpha: 0.3 })
    // glansig highlight + ljus spekulärprick
    g.ellipse(-r * 0.3, -r * 0.42, r * 0.26, r * 0.4).fill({ color: 0xffffff, alpha: 0.55 })
    g.circle(-r * 0.42, -r * 0.55, r * 0.13).fill({ color: 0xffffff, alpha: 0.9 })
  },

  // Regnbågsdroppe: koncentriska färgringar + glans.
  _drawRainbow(g, r) {
    g.clear()
    g.ellipse(0, -r * 2.4, r * 0.3, r * 0.9).fill({ color: 0xffffff, alpha: 0.18 })
    g.moveTo(0, -r * 1.8)
      .lineTo(r * 0.6, -r * 0.2)
      .lineTo(-r * 0.6, -r * 0.2)
      .fill({ color: RAINBOW[0] })
    for (let i = 0; i < RAINBOW.length; i++) {
      g.circle(0, 0, r * (1 - i * 0.14)).fill(RAINBOW[i])
    }
    g.circle(0, 0, r).stroke({ width: 4, color: 0xffffff, alpha: 0.85 })
    g.ellipse(-r * 0.32, -r * 0.42, r * 0.22, r * 0.34).fill({ color: 0xffffff, alpha: 0.7 })
    g.circle(-r * 0.42, -r * 0.55, r * 0.11).fill({ color: 0xffffff, alpha: 0.95 })
  },

  _randX(ctx) {
    return SIDE_MARGIN + Math.random() * (ctx.width - SIDE_MARGIN * 2)
  },

  // Gemensamt skal: halo-hitarea + tap-koppling.
  _dropShell(ctx, g, def) {
    const drop = new Container()
    const halo = new Graphics().circle(0, 0, 66).fill({ color: 0xffffff, alpha: 0.001 })
    drop.addChild(halo, g)
    drop._def = def
    drop._resolved = false
    drop.eventMode = 'static'
    drop.cursor = 'pointer'
    drop.hitArea = new Circle(0, 0, 66) // träffyta 132px (>= 96px)
    drop.on('pointertap', () => this._tapDrop(ctx, drop))
    return drop
  },

  // Spawna en droppe. >=50% är målfärg; ibland en regnbågsdroppe (bonus).
  _spawnDrop(ctx, forceTarget = false) {
    if (!this._alive) return
    let drop
    const rainbowChance = Math.min(0.09, 0.04 + this._rounds * 0.005)
    if (!forceTarget && Math.random() < rainbowChance) {
      const g = new Graphics()
      this._drawRainbow(g, DROP_R)
      drop = this._dropShell(ctx, g, { key: '__rainbow', color: 0xffffff, rainbow: true })
    } else {
      let def
      if (forceTarget || Math.random() < 0.5) {
        def = this._target
      } else {
        const others = this._palette.filter((c) => c.key !== this._target.key)
        def = others.length ? randomFrom(others) : this._target
      }
      const g = new Graphics()
      this._drawDrop(g, DROP_R, def.color)
      drop = this._dropShell(ctx, g, def)
    }

    // Slumpa x men undvik krockar nära toppen (max 6 försök).
    let x = this._randX(ctx)
    for (let i = 0; i < 6; i++) {
      if (this._drops.every((d) => d.y > 150 || Math.abs(d._baseX - x) > 100)) break
      x = this._randX(ctx)
    }

    drop._baseX = x
    drop._phase = Math.random() * Math.PI * 2
    drop._sway = 8 + Math.random() * 10
    drop.x = x
    drop.y = SPAWN_Y
    this._dropsLayer.addChild(drop)
    this._drops.push(drop)
    bounceIn(drop)
  },

  _removeDrop(drop) {
    const i = this._drops.indexOf(drop)
    if (i >= 0) this._drops.splice(i, 1)
    gsap.killTweensOf(drop)
    gsap.killTweensOf(drop.scale)
    if (!drop.destroyed) drop.destroy({ children: true })
  },

  _tapDrop(ctx, drop) {
    if (!this._alive || drop._resolved || this._paused) return
    this._idle = 0
    const x = drop.x
    const y = drop.y
    const isTarget = drop._def.rainbow || drop._def.key === this._target.key

    // Varje pekning: ringle på vattenytan (<100ms).
    ripple(ctx.fxLayer, x, y, { color: drop._def.rainbow ? 0xfff3b0 : drop._def.color, maxR: 92 })

    if (isTarget) {
      drop._resolved = true
      drop.eventMode = 'none'

      // Stigande kombo-ton: flera rätt i snabb följd klättrar uppför stegen.
      if (this._t - this._lastCorrectAt < 1.6) this._combo = Math.min(this._combo + 1, COMBO_LADDER.length - 1)
      else this._combo = 0
      this._lastCorrectAt = this._t

      if (drop._def.rainbow) {
        // Regnbåge: sprutar alla färger + chime + glad emoji.
        ctx.services.audio.sfx('match')
        for (const c of RAINBOW) burst(this._splashLayer, x, y, { count: 5, colors: [c], power: 1.15 })
        sparkle(ctx.fxLayer, x, y, { count: 10 })
        floatText(ctx.fxLayer, x, y - 30, '🌈', { fontSize: 64 })
        ctx.services.voice.say('Regnbåge!')
      } else {
        // Rätt färg: klättrande pling (kombo-ton) + extra gnistor + färgglatt plask.
        const f = COMBO_LADDER[this._combo]
        ctx.services.audio.tone({ freq: f, dur: 0.16, type: 'sine', vol: 0.3 })
        ctx.services.audio.tone({ freq: f * 1.5, dur: 0.14, type: 'sine', vol: 0.12, delay: 0.03 })
        sparkle(ctx.fxLayer, x, y)
        burst(this._splashLayer, x, y, { count: 8, colors: [drop._def.color] })
      }

      // Droppen krymper bort, prick tänds.
      gsap.killTweensOf(drop.scale)
      gsap.to(drop.scale, { x: 0, y: 0, duration: 0.22, ease: 'back.in(2)', onComplete: () => this._removeDrop(drop) })
      this._lightDot(this._collected)
      this._collected++
      // Sparsamt beröm (inte pratigt).
      if (this._collected < this._need && this._collected % 2 === 0) {
        ctx.services.voice.say(randomFrom(PRAISE))
      }
      if (this._collected >= this._need) this._finishRound(ctx)
    } else {
      // Fel färg: ALDRIG bestraffning — glad vingel + mjukt ljud + litet plask.
      ctx.services.audio.sfx('soft')
      burst(this._splashLayer, x, y, { count: 4, colors: [drop._def.color] })
      wiggle(drop)
    }
  },

  _finishRound(ctx) {
    if (!this._alive) return
    this._paused = true
    this._combo = 0
    // complete() = celebrate-ljud + beröm + konfetti + stjärna + klistermärke (GameHost).
    ctx.progress.complete()
    shake(this._content, { intensity: 7, duration: 0.5 }) // mjukt, glatt firande-skak
    ctx.services.voice.say('Du hittade alla ' + this._target.plural + '!')

    // Fyll färgen på "samla regnbågen"-tavlan (första gången den bemästras).
    if (!this._mastered.has(this._target.key)) {
      this._mastered.add(this._target.key)
      ctx.progress.setCustom('mastered', [...this._mastered])
      this._paintSwatch(this._target, true)
      const sw = this._swatches?.get(this._target.key)
      if (sw && !sw.destroyed) {
        pop(sw, { scale: 1.4 })
        sparkle(ctx.fxLayer, this._board.x + sw.x, this._board.y + sw.y, { count: 8 })
      }
    }

    this._rounds++
    ctx.progress.setCustom('rundor', this._rounds)
    ctx.progress.setLevel(this._rounds)

    this._fadeOutDrops()
    this._nextRoundCall = gsap.delayedCall(1.4, () => {
      if (!this._alive) return
      this._startRound(ctx, true)
    })
  },

  // Tona ut kvarvarande droppar mjukt.
  _fadeOutDrops() {
    for (const d of this._drops.slice()) {
      d._resolved = true
      d.eventMode = 'none'
      gsap.killTweensOf(d.scale)
      gsap.killTweensOf(d)
      gsap.to(d, {
        alpha: 0,
        duration: 0.5,
        ease: 'power1.out',
        onComplete: () => this._removeDrop(d),
      })
    }
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt

    // Flytta droppar med mjuk sidledspendling; landa i pölen (plask, ingen "miss").
    for (let i = this._drops.length - 1; i >= 0; i--) {
      const d = this._drops[i]
      if (d._resolved) continue
      d.y += this._speed * dt
      const s = Math.sin(this._t * 1.6 + d._phase)
      d.x = d._baseX + s * d._sway
      d.rotation = s * 0.05
      if (d.y > BOTTOM_Y) {
        this._drops.splice(i, 1)
        gsap.killTweensOf(d)
        gsap.killTweensOf(d.scale)
        // Pöl-plask: nu BÅDE hört (mjukt vått plopp) OCH sett (krusning + närmsta pöl studsar).
        ripple(this._splashLayer, d.x, PUDDLE_Y, { color: 0xbfe9ff, maxR: 46, duration: 0.5, width: 4, alpha: 0.5 })
        puff(this._splashLayer, d.x, PUDDLE_Y - 4, { count: 5, color: d._def.rainbow ? randomFrom(RAINBOW) : d._def.color })
        this._plop(ctx)
        this._rippleNearestPuddle(d.x)
        if (!d.destroyed) d.destroy({ children: true })
      }
    }

    // Spawn-ackumulator (pausar/städas med tickern).
    if (!this._paused) {
      this._spawnAcc += ticker.deltaMS
      if (this._spawnAcc >= this._interval) {
        this._spawnAcc = 0
        this._spawnDrop(ctx)
      }
    }

    // Idle-recue (~6s): upprepa instruktionen, lyft fram en målfärg-droppe.
    this._idle += dt
    if (this._idle > 6 && !this._paused) {
      this._idle = 0
      ctx.services.voice.say(this._introPhrase)
      // Tvekar barnet i en ord-runda? Avslöja droppe-formen som stödhjul.
      if (this._wordRound && !this._wordHintShown) {
        this._wordHintShown = true
        this._updateSign()
        pop(this._signDrop)
      }
      const targets = this._drops.filter((d) => !d._resolved && d._def.key === this._target.key)
      if (targets.length) pop(randomFrom(targets))
      else this._spawnDrop(ctx, true)
    }
  },

  // Mjukt vått "plopp" när en droppe landar i pölen (lätt strypt så det inte spammar).
  _plop(ctx) {
    if (this._t - this._lastPlop < 0.05) return
    this._lastPlop = this._t
    const base = 150 + Math.random() * 70
    ctx.services.audio.tone({ freq: base, dur: 0.14, type: 'sine', vol: 0.16, slideTo: base * 0.5 })
  },

  // Närmaste pöl studsar mjukt när en droppe landar (exit-säkert via feedback.pop).
  _rippleNearestPuddle(x) {
    if (!this._puddles) return
    let nearest = null
    let best = Infinity
    for (const p of this._puddles) {
      if (p.destroyed) continue
      const dx = Math.abs(p.x - x)
      if (dx < best) {
        best = dx
        nearest = p
      }
    }
    if (nearest && !nearest.destroyed) pop(nearest, { scale: 1.12 })
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._nextRoundCall?.kill()
    this._breaths?.forEach((t) => t?.kill())
    this._drops?.forEach((d) => {
      gsap.killTweensOf(d)
      gsap.killTweensOf(d.scale)
    })
    this._dots?.forEach((d) => gsap.killTweensOf(d.scale))
    this._puddles?.forEach((p) => gsap.killTweensOf(p.scale))
    this._swatches?.forEach((g) => gsap.killTweensOf(g.scale))
    if (this._sign) gsap.killTweensOf(this._sign.scale)
    if (this._signDrop) gsap.killTweensOf(this._signDrop.scale)
    if (this._signWord) gsap.killTweensOf(this._signWord.scale)
    gsap.killTweensOf(this._content)
    gsap.killTweensOf(this._root)
    ctx.services.voice?.cancel?.()
    this._root?.destroy({ children: true })
  },
}
