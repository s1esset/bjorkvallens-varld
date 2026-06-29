// Klappa Mullvaden — en SNÄLL "klappa-mullvaden" (2–5 år). Söta små djur kikar
// LUGNT upp ur sina hål i en blomsteräng och väntar; barnet klappar (tap) så de
// fnissar, blir glada (rosiga kinder + stort leende), studsar och dyker ner igen.
// Ingen miss, inget straff, ingen tidspress — ett djur som inte hinns klappas dyker
// bara mjukt ner av sig själv. Var N:te klapp firar vi (delat firande + stjärna +
// klistermärke) och en ny, lite livligare runda startar. Djuren varieras (mullvad,
// kanin, igelkott, mus, groda) och nivån växer mjukt med antal hål/uppdyk.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { pop, wiggle, puff, ripple, sparkle, floatText, burst, breathe, shake } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { FONT } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// Lekfältets area (designkoordinater) — hålen placeras i ett rutnät här inne.
const FX0 = 250
const FX1 = 1030
const FY0 = 240
const FY1 = 600

// Hål- och djurgeometri (lokalt i varje hål-container, origo = hålets mitt).
const HOLE_RX = 90
const HOLE_RY = 40
const MOLE_UP_Y = -45 // djuret uppe (huvudet pokar upp ur hålet)
const MOLE_DOWN_Y = 95 // djuret gömt under hålkanten (klipps bort av masken)

const DIRT = 0xb9905f // jordfärg till stänk-puffar

// Talade fraser (svenska med å/ä/ö — för TTS).
const IDLE = [
  'Klappa djuren när de kikar upp ur hålen!',
  'Titta, någon kikar upp! Klappa försiktigt.',
  'Var är djuren? Klappa när de tittar upp!',
]
const GENTLE = ['Vad fint du klappar!', 'Mjukt och snällt!', 'Klapp klapp!', 'Så bra klappat!', 'Hihi!']
// Glada bilder som flyter upp vid en klapp (emoji = ingen läsning krävs).
const JOY = ['😄', '🥰', '✨', '💛', '🐾', '😊']

// De djur som kan dyka upp (introduceras gradvis med nivån). ASCII-id:n.
const SPECIES = ['mullvad', 'kanin', 'igelkott', 'mus', 'groda']

// Mjuk nivåtrappa: aldrig stressig, alltid generös uppe-tid (golv 1,8 s). Fler hål,
// fler djur-arter och något snabbare uppdyk när nivån stiger.
function paramsFor(level) {
  const L = Math.max(1, level)
  return {
    goal: Math.min(12, 4 + L), // klappar som krävs för rundan
    cols: L >= 3 ? 4 : 3,
    rows: L >= 4 ? 3 : 2,
    upTime: Math.max(1.8, 3.2 - 0.18 * (L - 1)), // sekunder ett djur väntar uppe
    spawnEvery: Math.max(0.85, 1.7 - 0.11 * (L - 1)), // sekunder mellan uppdyk
    cap: L >= 6 ? 3 : L >= 3 ? 2 : 1, // hur många som får vara uppe samtidigt
    variety: Math.min(SPECIES.length, 1 + Math.floor(L / 1.5)), // antal arter i mixen
  }
}

export default {
  id: 'klappa-mullvaden',
  titleSv: 'Klappa Mullvaden',
  icon: '🐹',
  category: 'motorik',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'klappa-mullvaden',
  voiceIntro: 'Klappa djuren när de kikar upp ur hålen!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._spawnAcc = 0
    this._roundDone = false
    this._calls = []
    this._level = ctx.progress.get().highestLevel || 1

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Marknadsmässig äng-bakgrund (sol, moln, kullar) — dekorativ, fångar inga tryck.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Gräsmatta för lekfältet (rundad topp) ovanpå scenens nedre del.
    const lawn = new Graphics()
    lawn.roundRect(-40, 195, ctx.width + 80, ctx.height - 195 + 80, 90).fill(0x8ed16a)
    lawn.roundRect(-40, 195, ctx.width + 80, 18, 90).fill({ color: 0xa6dd7f, alpha: 0.6 })
    // Mjuka gräs-plättar för djup.
    for (const [px, py, pr] of [[330, 360, 70], [900, 320, 84], [640, 540, 96], [200, 560, 60], [1080, 520, 72]]) {
      lawn.ellipse(px, py, pr, pr * 0.5).fill({ color: 0x7cc25c, alpha: 0.35 })
    }
    lawn.eventMode = 'none'
    this._root.addChild(lawn)

    // Liten spridd dekor (blommor, fjäril, nyckelpiga) längs kanterna — eventMode none.
    const deco = new Container()
    deco.eventMode = 'none'
    deco.interactiveChildren = false
    for (const [dx, dy, em] of [
      [120, 300, '🌷'], [80, 470, '🌼'], [1170, 320, '🌱'], [1180, 510, '🌷'],
      [1130, 215, '🌼'], [100, 640, '🍀'], [1170, 660, '🌼'], [600, 168, '🌼'],
      [300, 175, '🦋'], [980, 172, '🐞'], [700, 660, '🍀'],
    ]) {
      const f = new Text({ text: em, style: { fontFamily: FONT.body, fontSize: 44 } })
      f.anchor.set(0.5)
      f.position.set(dx, dy)
      deco.addChild(f)
    }
    this._root.addChild(deco)

    // Osynlig heltäckande träffyta: tomt tryck på ängen -> mjuk respons.
    const tapCatcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tapCatcher.eventMode = 'static'
    tapCatcher.on('pointertap', (e) => this._emptyTap(ctx, e))
    this._root.addChild(tapCatcher)

    // Fält (hål + djur) och räknar-rad byggs om mellan rundor.
    this._field = new Container()
    this._root.addChild(this._field)

    // Räknar-rad (tassavtryck), under headern (y<96 reserverad).
    this._pawRow = new Container()
    this._pawRow.position.set(140, 132)
    this._pawRow.eventMode = 'none'
    this._root.addChild(this._pawRow)

    // Partikellager överst (gnistror, puffar, ringar) — exit-säkert, fångar inga tryck.
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._root.addChild(this._fx)

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

    this._holes?.forEach((h) => this._killHoleTweens(h))
    this._field.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._holes = []
    this._patted = 0
    this._roundDone = false
    this._spawnAcc = this._p.spawnEvery - 0.7 // första djuret dyker upp snabbt
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

    // Räknar-rad: ett 🐾 per mål-klapp, tonat tills det klappas.
    this._pawRow.removeChildren().forEach((o) => o.destroy())
    this._paws = []
    for (let i = 0; i < goal; i++) {
      const paw = new Text({ text: '🐾', style: { fontFamily: FONT.body, fontSize: 38 } })
      paw.anchor.set(0.5)
      paw.position.set(i * 46, 0)
      paw.alpha = 0.25
      this._pawRow.addChild(paw)
      this._paws.push(paw)
    }
  },

  // Ett hål: rest jordhög med mjuk kant, mörk öppning och en (gömd) djur-wrap som
  // klipps av en mask vid hålkanten + en främre kant-måne ovanpå djuret.
  _makeHole(ctx) {
    const hole = new Container()

    const mound = new Graphics()
    mound.ellipse(0, 14, 108, 50).fill(0xb98a5f) // rest jord (skugga)
    mound.ellipse(0, 8, 108, 46).fill(0xc99a6c) // ljus ovansida
    mound.eventMode = 'none'
    hole.addChild(mound)

    const opening = new Graphics()
    opening.ellipse(0, 0, HOLE_RX, HOLE_RY).fill(0x4a3526).stroke({ width: 5, color: 0x6b4a30 })
    opening.ellipse(0, -3, 78, 31).fill(0x33251a) // inre skugga -> djup
    opening.eventMode = 'none'
    hole.addChild(opening)

    const wrap = new Container() // tweenas i y -> djuret "kommer upp ur hålet"
    wrap.y = MOLE_DOWN_Y
    wrap.eventMode = 'none'
    hole.addChild(wrap)

    // Mask: visar bara det som är ovanför hålets framkant (y <= +RY).
    const maskG = new Graphics().rect(-140, -320, 280, 320 + HOLE_RY).fill(0xffffff)
    maskG.eventMode = 'none'
    hole.addChild(maskG)
    wrap.mask = maskG

    // Främre kant-måne ovanpå djuret -> djuret ser ut att komma UR hålet.
    const lip = new Graphics()
    lip.moveTo(-HOLE_RX - 2, 2)
    lip.quadraticCurveTo(0, 56, HOLE_RX + 2, 2)
    lip.quadraticCurveTo(0, 38, -HOLE_RX - 2, 2)
    lip.fill(0x5a4326)
    lip.eventMode = 'none'
    hole.addChild(lip)

    hole._state = 'down' // 'down' | 'rising' | 'up' | 'patted' | 'ducking'
    hole._wrap = wrap
    hole._critter = null
    hole._eyes = null
    hole._mouth = null
    hole._cheeks = null
    hole._breatheTw = null
    hole._upElapsed = 0
    hole._blinkAcc = 0
    hole._blinkNext = 2

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

  // Sätt ett nytt, slumpat djur i hålets wrap (städar ev. gammalt först).
  _setCritter(hole) {
    if (hole._critter && !hole._critter.destroyed) {
      this._killCritterTweens(hole)
      hole._critter.destroy({ children: true })
    }
    const cr = makeCritter(this._pickSpecies())
    hole._critter = cr.node
    hole._eyes = cr.eyes
    hole._mouth = cr.mouth
    hole._cheeks = cr.cheeks
    hole._wrap.addChild(cr.node)
  },

  // Välj art ur mixen för aktuell nivå (mullvaden väger lite tyngre — det är ju den).
  _pickSpecies() {
    if (Math.random() < 0.4) return 'mullvad'
    return randomFrom(SPECIES.slice(0, this._p.variety))
  },

  // Res ett gömt djur lugnt upp med liten squash/stretch + jordpuff.
  _raise(hole) {
    if (!this._alive || hole._state !== 'down') return
    this._setCritter(hole)
    hole._state = 'rising'
    hole._upElapsed = 0
    hole._blinkAcc = 0
    hole._blinkNext = 1.4 + Math.random() * 2.4

    puff(this._fx, hole.x, hole.y + 12, { count: 5, color: DIRT })

    // Squash -> stretch -> vila (livfullt uppdyk).
    hole._critter.scale.set(0.72, 0.55)
    gsap.killTweensOf(hole._critter.scale)
    gsap
      .timeline()
      .to(hole._critter.scale, { x: 1.06, y: 1.08, duration: 0.26, ease: 'back.out(2)' })
      .to(hole._critter.scale, { x: 1, y: 1, duration: 0.14, ease: 'sine.out' })

    gsap.killTweensOf(hole._wrap)
    gsap.to(hole._wrap, {
      y: MOLE_UP_Y,
      duration: 0.42,
      ease: 'back.out(1.4)',
      onComplete: () => {
        if (!this._alive) return
        if (hole._state === 'rising') {
          hole._state = 'up'
          hole._upElapsed = 0
          // Lugn andning för att locka en klapp.
          hole._breatheTw = breathe(hole._critter, { scale: 1.05, duration: 1.0 })
        }
      },
    })
  },

  // Dyk ner igen (auto efter uppe-tid). Aldrig en "miss".
  _duck(hole, { delay = 0, duration = 0.34 } = {}) {
    hole._breatheTw?.kill()
    hole._breatheTw = null
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

  // En snabb blinkning på det uppe-djurets ögon.
  _blink(hole) {
    const eyes = hole._eyes
    if (!eyes || eyes.destroyed) return
    gsap.killTweensOf(eyes.scale)
    gsap
      .timeline()
      .to(eyes.scale, { y: 0.12, duration: 0.06, ease: 'power1.in' })
      .to(eyes.scale, { y: 1, duration: 0.12, ease: 'power1.out' })
  },

  // Glad min: rosiga kinder, kisande ögon, större leende.
  _setHappy(hole) {
    if (hole._cheeks) {
      gsap.killTweensOf(hole._cheeks)
      gsap.to(hole._cheeks, { alpha: 1, duration: 0.12 })
    }
    if (hole._eyes) {
      gsap.killTweensOf(hole._eyes.scale)
      gsap.to(hole._eyes.scale, { y: 0.5, duration: 0.1 })
    }
    if (hole._mouth) {
      gsap.killTweensOf(hole._mouth.scale)
      gsap.to(hole._mouth.scale, { x: 1.3, y: 1.3, duration: 0.14, ease: 'back.out(2)' })
    }
  },

  // Lyckad klapp på ett uppe-djur: direkt-juice (<100ms) + glatt fniss + nerdyk. Allt är "rätt".
  _whack(ctx, hole) {
    if (!this._alive || this._roundDone || hole._state !== 'up') return
    this._idle = 0
    hole._breatheTw?.kill()
    hole._breatheTw = null
    hole._state = 'patted'

    const cx = hole.x
    const cy = hole.y + MOLE_UP_Y

    ctx.services.audio.sfx(Math.random() < 0.3 ? 'pling' : 'pop')
    ripple(this._fx, cx, cy, { color: 0xffffff, maxR: 84 })
    pop(hole._critter)
    wiggle(hole._critter)
    this._setHappy(hole)
    sparkle(this._fx, cx, cy - 8)
    floatText(this._fx, cx, cy - 42, randomFrom(JOY), { fontSize: 46, rise: 72 })
    puff(this._fx, hole.x, hole.y + 8, { count: 7, color: DIRT })

    // Glad liten studs uppåt -> dyk lugnt ner igen.
    gsap.killTweensOf(hole._wrap)
    gsap
      .timeline()
      .to(hole._wrap, { y: MOLE_UP_Y - 22, duration: 0.16, ease: 'power2.out' })
      .to(hole._wrap, {
        y: MOLE_DOWN_Y,
        duration: 0.34,
        delay: 0.12,
        ease: 'power2.in',
        onComplete: () => {
          if (this._alive && hole._state === 'patted') hole._state = 'down'
        },
      })

    this._patted++
    const paw = this._paws[this._patted - 1]
    if (paw) {
      paw.alpha = 1
      pop(paw)
    }

    if (this._patted >= this._p.goal) {
      this._finishRound(ctx)
    } else if (this._patted % 3 === 0) {
      ctx.services.voice.say(randomFrom(GENTLE))
    }
  },

  // Tomt tryck i ett hål (inget djur uppe): mjuk, lekfull respons + jordpuff.
  _softHole(ctx, hole) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    ripple(this._fx, hole.x, hole.y, { color: 0xffe6b0, maxR: 60, alpha: 0.4 })
    puff(this._fx, hole.x, hole.y + 6, { count: 6, color: DIRT })
    pop(hole, { scale: 1.05 })
  },

  // Tomt tryck på ängen: mjukt ljud + liten ring + studs på närmaste hål. Aldrig fel.
  _emptyTap(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    const p = this._fx.toLocal(e.global)
    ripple(this._fx, p.x, p.y, { color: 0xffffff, maxR: 50, alpha: 0.35 })
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

  // Rundans mål nått: gör djuren glada (firande via complete) + mjuk skakning + ny livligare runda.
  _finishRound(ctx) {
    this._roundDone = true
    this._holes.forEach((h) => {
      if (h._state !== 'down') this._duck(h)
    })
    // complete() ger redan: celebrate-ljud + beröm + konfetti + stjärna + klistermärke.
    ctx.progress.complete()
    // Egen, icke-dubblerande extra-juice: mjuk skakning + en liten skur.
    shake(this._root, { intensity: 6, duration: 0.45 })
    burst(ctx.fxLayer, ctx.width / 2, ctx.height * 0.45, { count: 18, power: 1.2 })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    const call = gsap.delayedCall(1.8, () => {
      if (this._alive) this._buildField(ctx)
    })
    this._calls.push(call)
  },

  // Försök resa ett djur upp (respekterar "samtidigt uppe"-cap).
  _trySpawn() {
    if (!this._alive || this._roundDone) return
    const occupied = this._holes.filter((h) => h._state !== 'down').length
    if (occupied >= this._p.cap) return
    const down = this._holes.filter((h) => h._state === 'down')
    if (down.length) this._raise(randomFrom(down))
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000

    // Idle-recue: ~6 s tystnad -> upprepa instruktionen och locka fram ett djur.
    this._idle += dt
    if (this._idle > 6 && !this._roundDone) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(IDLE))
      this._trySpawn()
    }

    if (this._roundDone) return // pausa spawn medan vi firar

    // Uppe-djur blinkar då och då och dyker lugnt ner av sig själva i tid.
    for (const h of this._holes) {
      if (h._state === 'up') {
        h._upElapsed += dt
        h._blinkAcc += dt
        if (h._blinkAcc >= h._blinkNext) {
          h._blinkAcc = 0
          h._blinkNext = 2.4 + Math.random() * 3
          this._blink(h)
        }
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

  _killCritterTweens(hole) {
    hole._breatheTw?.kill()
    if (hole._critter) {
      gsap.killTweensOf(hole._critter)
      gsap.killTweensOf(hole._critter.scale)
    }
    if (hole._eyes) {
      gsap.killTweensOf(hole._eyes)
      gsap.killTweensOf(hole._eyes.scale)
    }
    if (hole._mouth) {
      gsap.killTweensOf(hole._mouth)
      gsap.killTweensOf(hole._mouth.scale)
    }
    if (hole._cheeks) gsap.killTweensOf(hole._cheeks)
  },

  _killHoleTweens(hole) {
    gsap.killTweensOf(hole)
    gsap.killTweensOf(hole.scale)
    if (hole._wrap) gsap.killTweensOf(hole._wrap)
    this._killCritterTweens(hole)
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx.ticker.remove(this._tick)
    this._calls?.forEach((c) => c?.kill())
    this._calls = []
    this._holes?.forEach((h) => this._killHoleTweens(h))
    this._paws?.forEach((p) => {
      gsap.killTweensOf(p)
      gsap.killTweensOf(p.scale)
    })
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}

// --- Söta djur, ritade med Pixi Graphics (inga bildtillgångar krävs) ---

// Ett kisande-bart öga: vit sclera + mörk pupill + liten glansprick.
function eye(x, r = 7) {
  const g = new Graphics()
  g.circle(0, 0, r).fill(0xffffff)
  g.circle(0.5, 1, r * 0.62).fill(0x33291f)
  g.circle(-1.6, -1, r * 0.24).fill(0xffffff)
  g.position.set(x, 0)
  return g
}

// Ett leende (ritat runt eget origo så det kan skalas från mitten).
function smile(color = 0x6b4a36, w = 12, drop = 11) {
  const g = new Graphics()
  g.moveTo(-w, 0).quadraticCurveTo(0, drop, w, 0).stroke({ width: 4, color, cap: 'round' })
  return g
}

// Bygg ett djur. Returnerar { node, eyes, mouth, cheeks } för animering.
// node-origo = mitt; kropp sträcker sig nedåt och klipps av hålkanten/masken.
function makeCritter(type) {
  const node = new Container()
  node.eventMode = 'none'
  const back = new Graphics() // öron/taggar bakom kroppen
  const body = new Graphics()
  const face = new Container()
  face.eventMode = 'none'
  node.addChild(back, body, face)

  const eyes = new Container()
  const cheeks = new Container()
  cheeks.alpha = 0
  for (const s of [-1, 1]) cheeks.addChild(new Graphics().circle(s * 23, 12, 8).fill({ color: 0xff9ec4, alpha: 0.8 }))
  let mouth = null

  if (type === 'kanin') {
    for (const s of [-1, 1]) {
      const ear = new Graphics()
      ear.ellipse(0, -24, 11, 32).fill(0xf4ede3)
      ear.ellipse(0, -24, 6, 23).fill(0xf6c2d3)
      ear.position.set(s * 15, -38)
      ear.rotation = s * 0.16
      back.addChild(ear)
    }
    body.ellipse(0, 6, 44, 50).fill(0xf4ede3)
    body.ellipse(0, 20, 26, 24).fill(0xfffaf3)
    eyes.addChild(eye(-15, 7), eye(15, 7))
    eyes.position.set(0, -10)
    const nose = new Graphics().ellipse(0, 4, 4.5, 3.5).fill(0xe79ab0)
    mouth = smile(0xc98aa0, 9, 8)
    mouth.position.set(0, 12)
    face.addChild(nose, cheeks, eyes, mouth)
  } else if (type === 'igelkott') {
    const cap = (color, yo) => {
      const g = new Graphics()
      for (let i = -3; i <= 3; i++) {
        const x = i * 13
        g.poly([x - 9, 8 + yo, x, -36 + yo, x + 9, 8 + yo]).fill(color)
      }
      return g
    }
    back.addChild(cap(0x5a3f29, 4), cap(0x6e4f33, -3))
    body.ellipse(0, 12, 42, 44).fill(0xd9b48a)
    body.ellipse(0, 22, 26, 22).fill(0xeccfa8)
    eyes.addChild(eye(-13, 6.5), eye(13, 6.5))
    eyes.position.set(0, -2)
    const nose = new Graphics().ellipse(0, 12, 5, 4).fill(0x3a2a1d)
    mouth = smile(0x6e4f33, 9, 8)
    mouth.position.set(0, 22)
    face.addChild(nose, cheeks, eyes, mouth)
  } else if (type === 'mus') {
    for (const s of [-1, 1]) {
      const ear = new Graphics()
      ear.circle(0, 0, 19).fill(0xb3ada4)
      ear.circle(0, 0, 12).fill(0xf6c2d3)
      ear.position.set(s * 26, -32)
      back.addChild(ear)
    }
    body.ellipse(0, 6, 44, 48).fill(0xc3beb6)
    body.ellipse(0, 20, 26, 22).fill(0xe2ded7)
    eyes.addChild(eye(-14, 7), eye(14, 7))
    eyes.position.set(0, -8)
    const nose = new Graphics().ellipse(0, 6, 4.5, 3.5).fill(0xe79ab0)
    const wk = new Graphics()
    for (const s of [-1, 1]) {
      wk.moveTo(s * 6, 8).lineTo(s * 30, 4).stroke({ width: 1.5, color: 0x8a857d })
      wk.moveTo(s * 6, 11).lineTo(s * 30, 12).stroke({ width: 1.5, color: 0x8a857d })
    }
    mouth = smile(0x8a685a, 8, 7)
    mouth.position.set(0, 14)
    face.addChild(wk, nose, cheeks, eyes, mouth)
  } else if (type === 'groda') {
    body.ellipse(0, 10, 46, 46).fill(0x76c463)
    body.ellipse(0, 24, 30, 22).fill(0xa8de8f)
    for (const s of [-1, 1]) back.circle(s * 22, -30, 17).fill(0x76c463) // ögonkullar
    for (const s of [-1, 1]) {
      const e = new Graphics()
      e.circle(0, 0, 13).fill(0xffffff)
      e.circle(0, 2, 7).fill(0x2a2320)
      e.circle(-2.5, -1.5, 3).fill(0xffffff)
      e.position.set(s * 22, -30)
      eyes.addChild(e)
    }
    const nostrils = new Graphics()
    nostrils.circle(-5, -2, 1.6).fill(0x3a6b2f)
    nostrils.circle(5, -2, 1.6).fill(0x3a6b2f)
    mouth = smile(0x2f6b2a, 20, 12)
    mouth.position.set(0, 16)
    face.addChild(nostrils, cheeks, eyes, mouth)
  } else {
    // mullvad (standard)
    body.ellipse(0, 6, 46, 50).fill(0x9c7c5f)
    body.ellipse(0, 20, 26, 24).fill(0xb89a7d)
    body.circle(-34, 30, 9).fill(0x88684c) // små händer
    body.circle(34, 30, 9).fill(0x88684c)
    const snout = new Graphics()
    snout.ellipse(0, 8, 13, 10).fill(0xeaa1b6)
    snout.circle(-3.5, 8, 1.7).fill(0x7a4a55)
    snout.circle(3.5, 8, 1.7).fill(0x7a4a55)
    eyes.addChild(eye(-13, 5.5), eye(13, 5.5))
    eyes.position.set(0, -8)
    mouth = snout // glad min skalar nosen
    face.addChild(snout, cheeks, eyes)
  }

  return { node, eyes, mouth, cheeks }
}
