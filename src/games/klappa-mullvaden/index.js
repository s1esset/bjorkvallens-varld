// Klappa Mullvaden — snäll "whack-a-mole" (2–4 år). Mullvadar (🐹) tittar
// LUGNT upp ur sina hål och väntar; barnet klappar (tap) så de fnissar, studsar
// och dyker ner igen. Ingen miss, inget straff, ingen tidspress — en mullvad som
// inte hinns klappas dyker bara mjukt ner av sig själv. Var N:te klapp firar vi
// (delat firande + stjärna + klistermärke) och en ny, lite livligare runda startar.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { puff, pop, wiggle, bigCelebration } from '../../lib/feedback.js'
import { FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// Lekfältets area (designkoordinater) — hålen placeras i ett rutnät här inne.
const FX0 = 240
const FX1 = 1040
const FY0 = 230
const FY1 = 600

// Hål- och mullvadsgeometri (lokalt i varje hål-container, origo = hålets mitt).
const HOLE_RX = 90
const HOLE_RY = 40
const MOLE_UP_Y = -45 // mullvaden uppe (huvudet pokar upp ur hålet)
const MOLE_DOWN_Y = 95 // mullvaden gömd under hålkanten (klipps bort av masken)

// Mjuk nivåtrappa: aldrig stressig, alltid generös uppe-tid (golv 2,0 s).
function paramsFor(level) {
  const cols = level >= 5 ? 4 : level >= 3 ? 4 : 3
  const rows = level >= 5 ? 3 : 2
  return {
    goal: Math.min(10, 5 + (level - 1)), // klappar som krävs för rundan
    cols,
    rows,
    upTime: Math.max(2.0, 3.2 - 0.2 * (level - 1)), // sekunder en mullvad väntar uppe
    spawnEvery: Math.max(1.0, 1.6 - 0.1 * (level - 1)), // sekunder mellan uppdyk
    cap: level >= 5 ? 3 : level >= 3 ? 2 : 1, // hur många som får vara uppe samtidigt
  }
}

export default {
  id: 'klappa-mullvaden',
  titleSv: 'Klappa Mullvaden',
  icon: '🐹',
  category: 'motorik',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'klappa-mullvaden',
  voiceIntro: 'Klappa mullvadarna när de tittar upp!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._spawnAcc = 0
    this._roundDone = false
    this._level = ctx.progress.get().highestLevel || 1

    this._layer = new Container()
    ctx.stage.addChild(this._layer)

    // Äng-bakgrund (dekorativ, fångar inga tryck).
    const grass = new Graphics()
      .rect(0, 0, ctx.width, ctx.height)
      .fill(0x8ed16a)
    grass.rect(0, 560, ctx.width, 160).fill(0x6fbf4f)
    grass.eventMode = 'none'
    grass.interactiveChildren = false
    this._layer.addChild(grass)

    // Osynlig heltäckande träffyta: tomt tryck på ängen -> mjuk respons.
    const tapCatcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tapCatcher.eventMode = 'static'
    tapCatcher.on('pointertap', (e) => this._emptyTap(ctx, e))
    this._layer.addChild(tapCatcher)

    // Lite spridd dekor (blommor) — eventMode none så de aldrig blockerar tap.
    const deco = new Container()
    deco.eventMode = 'none'
    deco.interactiveChildren = false
    for (const [dx, dy, em] of [
      [150, 180, '🌼'], [1110, 200, '🌱'], [120, 520, '🌱'],
      [1140, 560, '🌼'], [640, 150, '🌼'], [340, 650, '🌱'], [950, 660, '🌼'],
    ]) {
      const f = new Text({ text: em, style: { fontFamily: FONT.body, fontSize: 46 } })
      f.anchor.set(0.5)
      f.position.set(dx, dy)
      deco.addChild(f)
    }
    this._layer.addChild(deco)

    // Fält (hål + mullvadar) och räknar-rad byggs om mellan rundor.
    this._field = new Container()
    this._layer.addChild(this._field)
    this._carrotRow = new Container()
    this._carrotRow.position.set(120, 120) // under headern (y<96 reserverad)
    this._carrotRow.eventMode = 'none'
    this._layer.addChild(this._carrotRow)

    this._buildField(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Bygg om hål-rutnätet + räknar-raden för aktuell nivå (städar gammalt först).
  _buildField(ctx) {
    if (!this._alive) return
    this._p = paramsFor(this._level)
    const { cols, rows, goal } = this._p

    // Städa gamla mullvadar/tweens innan vi river fältet.
    this._holes?.forEach((h) => this._killHoleTweens(h))
    this._field.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._holes = []
    this._patted = 0
    this._roundDone = false
    this._spawnAcc = this._p.spawnEvery - 0.6 // första mullvaden dyker upp snabbt
    this._idle = 0

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = cols > 1 ? FX0 + (c * (FX1 - FX0)) / (cols - 1) : (FX0 + FX1) / 2
        const y = rows > 1 ? FY0 + (r * (FY1 - FY0)) / (rows - 1) : (FY0 + FY1) / 2
        const hole = this._makeHole(ctx)
        hole.position.set(x, y)
        this._field.addChild(hole)
        this._holes.push(hole)
      }
    }

    // Räknar-rad: en 🥕 per mål-klapp, tonad tills den klappas.
    this._carrotRow.removeChildren().forEach((o) => o.destroy())
    this._carrots = []
    for (let i = 0; i < goal; i++) {
      const carrot = new Text({ text: '🥕', style: { fontFamily: FONT.body, fontSize: 40 } })
      carrot.anchor.set(0.5)
      carrot.position.set(i * 50, 0)
      carrot.alpha = 0.28
      this._carrotRow.addChild(carrot)
      this._carrots.push(carrot)
    }
  },

  // Ett hål med en (gömd) mullvad som klipps av en mask vid hålkanten.
  _makeHole(ctx) {
    const hole = new Container()

    const holeBack = new Graphics()
      .ellipse(0, 0, HOLE_RX, HOLE_RY)
      .fill(0x4a3b2a)
      .stroke({ width: 6, color: 0x3a2d20 })
    holeBack.eventMode = 'none'
    hole.addChild(holeBack)

    const wrap = new Container() // tweenas i y -> mullvaden "kommer upp ur hålet"
    wrap.y = MOLE_DOWN_Y
    wrap.eventMode = 'none'
    const sprite = new Text({ text: '🐹', style: { fontFamily: FONT.body, fontSize: 84 } })
    sprite.anchor.set(0.5)
    sprite.eventMode = 'none'
    wrap.addChild(sprite)
    hole.addChild(wrap)

    // Mask: visar bara det som är ovanför hålets framkant (y <= +RY).
    const maskG = new Graphics().rect(-130, -300, 260, 300 + HOLE_RY).fill(0xffffff)
    maskG.eventMode = 'none'
    hole.addChild(maskG)
    wrap.mask = maskG

    hole._state = 'down' // 'down' | 'rising' | 'up' | 'ducking'
    hole._wrap = wrap
    hole._sprite = sprite
    hole._upElapsed = 0

    hole.hitArea = new Circle(0, -30, 92) // träffyta 184px Ø (>= 96px)
    hole.eventMode = 'static'
    hole.cursor = 'pointer'
    hole.on('pointertap', (e) => {
      e.stopPropagation?.()
      if (hole._state === 'up') this._whack(ctx, hole)
      else this._softHole(ctx, hole)
    })

    return hole
  },

  // Res en gömd mullvad lugnt upp.
  _raise(hole) {
    if (!this._alive || hole._state !== 'down') return
    hole._state = 'rising'
    hole._upElapsed = 0
    hole._sprite.rotation = 0
    hole._sprite.scale.set(1)
    gsap.killTweensOf(hole._wrap)
    gsap.to(hole._wrap, {
      y: MOLE_UP_Y,
      duration: 0.4,
      ease: 'back.out(1.4)',
      onComplete: () => {
        if (!this._alive) return
        if (hole._state === 'rising') {
          hole._state = 'up'
          hole._upElapsed = 0
        }
      },
    })
  },

  // Dyk ner igen (auto efter uppe-tid ELLER efter en klapp). Aldrig en "miss".
  _duck(hole, { delay = 0, duration = 0.32 } = {}) {
    hole._state = 'ducking'
    gsap.killTweensOf(hole._wrap)
    gsap.to(hole._wrap, {
      y: MOLE_DOWN_Y,
      delay,
      duration,
      ease: 'power2.in',
      onComplete: () => {
        if (this._alive && hole._state === 'ducking') hole._state = 'down'
      },
    })
  },

  // Lyckad klapp på en uppe-mullvad: fniss + puff + räknare ökar. Allt är "rätt".
  _whack(ctx, hole) {
    if (!this._alive || this._roundDone || hole._state !== 'up') return
    this._idle = 0

    ctx.services.audio.sfx(Math.random() < 0.25 ? 'pling' : 'pop')
    pop(hole._sprite)
    wiggle(hole._sprite)
    puff(this._layer, hole.x, hole.y + MOLE_UP_Y, { count: 8 })
    this._duck(hole, { delay: 0.2, duration: 0.3 })

    this._patted++
    const carrot = this._carrots[this._patted - 1]
    if (carrot) {
      carrot.alpha = 1
      pop(carrot)
    }

    if (this._patted >= this._p.goal) {
      this._finishRound(ctx)
    } else if (this._patted % 3 === 0) {
      ctx.services.voice.say(randomFrom(PRAISE))
    }
  },

  // Tomt tryck i ett hål (ingen mullvad uppe): mjuk, lekfull respons.
  _softHole(ctx, hole) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    pop(hole, { scale: 1.06 })
  },

  // Tomt tryck på ängen: mjukt ljud + liten studs på närmaste hål. Aldrig fel.
  _emptyTap(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    const p = this._field.toLocal(e.global)
    let nearest = null
    let best = Infinity
    for (const h of this._holes || []) {
      const d = (h.x - p.x) ** 2 + (h.y - p.y) ** 2
      if (d < best) {
        best = d
        nearest = h
      }
    }
    if (nearest) wiggle(nearest)
  },

  // Rundans mål nått: kort firande + stjärna/klistermärke, sedan ny livligare runda.
  _finishRound(ctx) {
    this._roundDone = true
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say('Du klappade alla mullvadar! Hurra!')
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    ctx.progress.complete()
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    this._nextCall = gsap.delayedCall(1.6, () => {
      if (this._alive) this._buildField(ctx)
    })
  },

  // Försök resa en mullvad upp (respekterar "samtidigt uppe"-cap).
  _trySpawn() {
    const occupied = this._holes.filter((h) => h._state !== 'down').length
    if (occupied >= this._p.cap) return
    const down = this._holes.filter((h) => h._state === 'down')
    if (down.length) this._raise(randomFrom(down))
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000

    // Idle-recue: ~6 s tystnad -> upprepa instruktionen och vinka med en mullvad.
    this._idle += dt
    if (this._idle > 6 && !this._roundDone) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      this._trySpawn()
    }

    if (this._roundDone) return // pausa spawn medan vi firar

    // Uppe-mullvadar som inte klappas dyker lugnt ner av sig själva.
    for (const h of this._holes) {
      if (h._state === 'up') {
        h._upElapsed += dt
        if (h._upElapsed >= this._p.upTime) this._duck(h)
      }
    }

    // Spawn-timer via ackumulerad tid (fryser/städas korrekt med tickern).
    this._spawnAcc += dt
    if (this._spawnAcc >= this._p.spawnEvery) {
      this._spawnAcc = 0
      this._trySpawn()
    }
  },

  _killHoleTweens(hole) {
    gsap.killTweensOf(hole)
    gsap.killTweensOf(hole.scale)
    if (hole._wrap) gsap.killTweensOf(hole._wrap)
    if (hole._sprite) {
      gsap.killTweensOf(hole._sprite)
      gsap.killTweensOf(hole._sprite.scale)
    }
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx.ticker.remove(this._tick)
    this._nextCall?.kill()
    this._holes?.forEach((h) => this._killHoleTweens(h))
    this._carrots?.forEach((c) => {
      gsap.killTweensOf(c)
      gsap.killTweensOf(c.scale)
    })
    gsap.killTweensOf(this._layer)
    this._layer?.destroy({ children: true })
  },
}
