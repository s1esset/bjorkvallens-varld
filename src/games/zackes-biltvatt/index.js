// Zackes Biltvätt — tvätta smutsiga fordon med svamp och slang medan fåglar flyger
// förbi och bajsar (2–5 år). Kärnan är orsak-verkan med ETT val: svampen skrubbar
// tjock smuts snabbt, slangen sköljer brett och SKRÄMMER BORT fåglar innan de hinner
// bajsa — barnet väljer att förebygga eller städa efter.
//
// MOTGÅNG (se P0 i CLAUDE.md): fågelbajs är ett äkta bakslag men med hårt tak —
// max 3 bajsfläckar på bilen samtidigt, därefter missar fåglarna och bajset plaskar
// bredvid. Ursprungssmutsen kommer aldrig tillbaka, så arbetet kan bara sakta ner,
// aldrig växa ifrån barnet. Ingen timer, ingen poäng, inget misslyckande.
//
// All transient effekt går via lib/feedback.js (exit-säkert) och allt fördröjt är
// vaktat av this._alive.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { puff, sparkle, floatText, ripple, wiggle, shake } from '../../lib/feedback.js'
import { makeMascot } from '../../lib/mascot.js'
import { FONT } from '../../lib/theme.js'

// --- Fordon: karossform + färg. Ritas programmatiskt (inga tillgångar). ---
const VEHICLES = [
  { key: 'bil', namn: 'bilen', color: 0xe94f4f, w: 340, h: 130, roof: 0.58, roofW: 0.52, wheels: [-0.28, 0.3], emoji: '🚗' },
  { key: 'buss', namn: 'bussen', color: 0xf5b73d, w: 420, h: 165, roof: 0.9, roofW: 0.9, wheels: [-0.32, 0.32], emoji: '🚌' },
  { key: 'brandbil', namn: 'brandbilen', color: 0xd93c3c, w: 400, h: 150, roof: 0.62, roofW: 0.4, wheels: [-0.33, 0.3], emoji: '🚒' },
  { key: 'traktor', namn: 'traktorn', color: 0x5bbf6a, w: 300, h: 140, roof: 0.7, roofW: 0.42, wheels: [-0.3, 0.32], bigRear: true, emoji: '🚜' },
  { key: 'glassbil', namn: 'glassbilen', color: 0x63c7d6, w: 360, h: 150, roof: 0.72, roofW: 0.6, wheels: [-0.3, 0.3], emoji: '🍦' },
  { key: 'lastbil', namn: 'lastbilen', color: 0x6b8dd6, w: 420, h: 155, roof: 0.64, roofW: 0.38, wheels: [-0.34, 0.28], emoji: '🚚' },
]

// --- Fåglar: storlek + bajsnyans + hur många skrubb bajset tål. ---
const BIRDS = [
  { key: 'sparv', namn: 'sparven', size: 0.62, body: 0x9b7653, poop: 0xf4f2e6, poopR: 24, lager: 1, ljud: 'djur_hona', emoji: '🐦' },
  { key: 'duva', namn: 'duvan', size: 0.82, body: 0x9aa4b0, poop: 0xdcdcd0, poopR: 31, lager: 1, ljud: 'djur_uggla', emoji: '🕊️' },
  { key: 'mas', namn: 'måsen', size: 1.0, body: 0xf2f2f2, poop: 0xd6e2ba, poopR: 39, lager: 2, ljud: 'djur_anka', emoji: '🦅' },
  { key: 'gas', namn: 'gåsen', size: 1.22, body: 0xe8e4d8, poop: 0xa9814f, poopR: 47, lager: 3, ljud: 'djur_tupp', emoji: '🦆' },
]
const RAINBOW_BIRD = {
  key: 'regnbage', namn: 'regnbågsfågeln', size: 1.05, body: 0xffffff,
  poop: 0xffd7f2, poopR: 35, lager: 1, ljud: 'magi', emoji: '🌈', glitter: true,
}

// C-dur pentatonisk — varje ren fläck klättrar ett steg → en bil = en liten melodi.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1568.0]

const MAX_BAJS = 3      // taket: så många bajsfläckar kan finnas på bilen samtidigt
const CAR_X = 545
const CAR_Y = 430

export default {
  id: 'zackes-biltvatt',
  titleSv: 'Zackes Biltvätt',
  icon: '🚗',
  category: 'roligt',
  input: 'mixed',
  bundle: 'zackes-biltvatt',
  ageRange: [2, 5],
  voiceIntro: 'Zacke tvättar bilar! Ta svampen och skrubba bort smutsen.',

  init(ctx) {
    this._alive = true
    this._started = false
    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._idle = 0
    this._birdTimer = 0
    this._spots = []
    this._birds = []
    this._tool = null          // aktivt verktyg som följer fingret
    this._selected = null      // tap-tap-fallback: valt verktyg
    this._cleanedInCar = 0
    this._sprayCooldown = 0
    this._hosedBird = false    // har barnet upptäckt slang-mot-fågel?

    this._buildScene(ctx)
    this._nextCar(ctx, false)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._started = true
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---------------------------------------------------------------- scen

  _buildScene(ctx) {
    this._root.addChild(createScene('meadow'))

    // Tvätthallens golv (mörkare platta under bilen).
    const floor = new Graphics()
      .roundRect(120, 505, 1040, 120, 28)
      .fill({ color: 0x8fa0a8, alpha: 0.55 })
      .stroke({ width: 5, color: 0x6f8189, alpha: 0.5 })
    floor.eventMode = 'none'
    this._root.addChild(floor)

    // Glansbågen till höger — bilen rullar ut genom den när den är ren.
    this._arch = this._makeArch()
    this._arch.position.set(1105, 400)
    this._root.addChild(this._arch)

    // Lager: bil under, fx över.
    this._carLayer = new Container()
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false

    // Zacke till vänster — hejar, torkar pannan, tummen upp.
    this._zacke = this._makeZacke()
    this._zacke.position.set(148, 452)

    // Ägaren väntar vid bågen.
    this._owner = new Container()
    this._owner.position.set(1000, 442)
    this._ownerHomeY = 442

    this._root.addChild(this._carLayer, this._zacke, this._owner)

    // Fåglarna flyger ovanför allt utom fx.
    this._birdLayer = new Container()
    this._root.addChild(this._birdLayer)

    // Verktygsstället längst ner (stora träffytor).
    this._makeTools(ctx)
    this._root.addChild(this._fx)
  },

  _makeArch() {
    const c = new Container()
    const g = new Graphics()
    g.roundRect(-62, -190, 26, 380, 12).fill(0xbfd4dc)
    g.roundRect(36, -190, 26, 380, 12).fill(0xbfd4dc)
    g.roundRect(-62, -212, 124, 34, 14).fill(0x9dbcc7)
    c.addChild(g)
    // Glittrande "glans"-droppar i bågen.
    for (let i = 0; i < 5; i++) {
      const d = new Graphics().circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.75 })
      d.position.set(-40 + i * 20, -170 + (i % 2) * 14)
      c.addChild(d)
      const proxy = { a: 0.3 + Math.random() * 0.5 }
      gsap.to(proxy, {
        a: 0.9, duration: 0.7 + Math.random() * 0.6, yoyo: true, repeat: -1,
        ease: 'sine.inOut', delay: i * 0.12,
        onUpdate: () => { if (!d.destroyed) d.alpha = proxy.a },
      })
      d._twinkleProxy = proxy
    }
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // Zacke — enkel figur (huvud, kropp, armar) som kan reagera.
  _makeZacke() {
    const c = new Container()
    const g = new Graphics()
    g.roundRect(-30, -40, 60, 92, 22).fill(0x4aa3df)          // overall
    g.roundRect(-30, 6, 60, 14, 6).fill(0x3f8fc6)             // bälte
    g.circle(0, -72, 36).fill(0xf7d9b8)                        // huvud
    g.roundRect(-38, -104, 76, 26, 12).fill(0xffd35c)          // keps
    g.roundRect(-42, -86, 26, 10, 5).fill(0xffd35c)            // kepsskärm
    g.circle(-13, -74, 5).fill(0x2b2b2b)
    g.circle(13, -74, 5).fill(0x2b2b2b)
    c.addChild(g)
    // Munnen i EGEN Graphics: en .arc() efter andra former i samma Graphics drar en
    // anslutningslinje från förra punkten (streck tvärs över ansiktet). Samma
    // mönster som lib/mascot.js.
    const mouth = new Graphics()
      .arc(0, -66, 15, 0.15 * Math.PI, 0.85 * Math.PI)
      .stroke({ width: 5, color: 0x2b2b2b, cap: 'round' })
    c.addChild(mouth)
    const arm = new Graphics().roundRect(-9, -10, 18, 62, 9).fill(0x4aa3df)
    arm.position.set(30, -28)
    c.addChild(arm)
    c._arm = arm
    c.eventMode = 'none'
    c.interactiveChildren = false
    return c
  },

  // --------------------------------------------------------------- verktyg

  _makeTools(ctx) {
    this._toolLayer = new Container()
    this._root.addChild(this._toolLayer)

    this._svamp = this._makeTool('svamp', 176, 638)
    this._slang = this._makeTool('slang', 336, 638)
    this._toolLayer.addChild(this._svamp, this._slang)

    for (const t of [this._svamp, this._slang]) this._bindTool(ctx, t)
  },

  _makeTool(kind, x, y) {
    const c = new Container()
    // Bricka bakom verktyget (gör träffytan tydlig och stor).
    c.addChild(new Graphics().roundRect(-58, -58, 116, 116, 26).fill({ color: 0xffffff, alpha: 0.72 })
      .stroke({ width: 5, color: kind === 'svamp' ? 0xffd35c : 0x4aa3df, alpha: 0.95 }))

    const g = new Graphics()
    if (kind === 'svamp') {
      g.roundRect(-40, -26, 80, 52, 16).fill(0xffd35c)
      g.roundRect(-40, -26, 80, 20, 12).fill(0xfff0b8)
      for (let i = 0; i < 7; i++) {
        g.circle(-30 + (i % 4) * 20, -8 + Math.floor(i / 4) * 18, 4).fill({ color: 0xe0ac2b, alpha: 0.8 })
      }
    } else {
      g.roundRect(-14, -30, 28, 56, 10).fill(0x4aa3df)        // munstycke
      g.roundRect(-30, 10, 60, 22, 10).fill(0x3f8fc6)         // handtag
      g.circle(0, -34, 12).fill(0x9fdcf5)
    }
    c.addChild(g)

    const label = new Text({
      text: kind === 'svamp' ? '🧽' : '🚿',
      style: { fontFamily: FONT.body, fontSize: 44 },
    })
    label.anchor.set(0.5)
    label.position.set(0, kind === 'svamp' ? 0 : -2)
    c.addChild(label)

    c.position.set(x, y)
    c._kind = kind
    c._home = { x, y }
    c.eventMode = 'static'
    c.cursor = 'pointer'
    // +24px osynlig hit-halo → effektiv träffyta 164px.
    c.hitArea = { contains: (px, py) => Math.abs(px) <= 82 && Math.abs(py) <= 82 }
    return c
  },

  _bindTool(ctx, tool) {
    tool._down = (e) => {
      if (!this._alive || this._locked) return
      this._idle = 0
      this._tool = tool
      tool._dragging = false
      const p = this._root.toLocal(e.global)
      tool._startX = p.x
      tool._startY = p.y
      this._toolLayer.setChildIndex(tool, this._toolLayer.children.length - 1)
      gsap.to(tool.scale, { x: 1.12, y: 1.12, duration: 0.12 })

      tool._move = (ev) => this._onToolMove(ctx, tool, ev)
      tool._up = () => this._onToolUp(ctx, tool)
      tool.on('globalpointermove', tool._move)
      tool.on('pointerup', tool._up)
      tool.on('pointerupoutside', tool._up)
    }
    tool.on('pointerdown', tool._down)
  },

  _onToolMove(ctx, tool, e) {
    if (!this._alive || this._tool !== tool) return
    const p = this._root.toLocal(e.global)
    if (!tool._dragging && Math.hypot(p.x - tool._startX, p.y - tool._startY) > 12) {
      tool._dragging = true
      this._deselectTool()
    }
    if (!tool._dragging) return
    tool.position.set(p.x, p.y)
    this._applyTool(ctx, tool, p.x, p.y)
  },

  _onToolUp(ctx, tool) {
    if (this._tool !== tool) return
    this._detachTool(tool)
    this._tool = null
    gsap.to(tool.scale, { x: 1, y: 1, duration: 0.16 })
    if (!tool._dragging) {
      // Tap-tap-fallback: markera verktyget, tryck sedan på en fläck.
      this._toggleSelectTool(ctx, tool)
      return
    }
    gsap.to(tool, { x: tool._home.x, y: tool._home.y, duration: 0.34, ease: 'back.out(1.3)' })
  },

  _detachTool(tool) {
    if (tool._move) tool.off('globalpointermove', tool._move)
    if (tool._up) {
      tool.off('pointerup', tool._up)
      tool.off('pointerupoutside', tool._up)
    }
    tool._move = tool._up = null
  },

  _toggleSelectTool(ctx, tool) {
    if (this._selected === tool) {
      this._deselectTool()
      return
    }
    this._deselectTool()
    this._selected = tool
    ctx.services.audio.sfx('tap')
    tool._pulse = gsap.to(tool.scale, {
      x: 1.1, y: 1.1, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut',
    })
    ctx.services.voice.say(tool._kind === 'svamp' ? 'Skrubba smutsen med svampen!' : 'Spola med slangen!')
  },

  _deselectTool() {
    const t = this._selected
    this._selected = null
    if (t && !t.destroyed) {
      t._pulse?.kill()
      t._pulse = null
      gsap.to(t.scale, { x: 1, y: 1, duration: 0.15 })
    }
  },

  // Verktyget i (x,y) påverkar allt i närheten. Svamp = stark på tjockt,
  // slang = bred, mildare, men skrämmer fåglar.
  _applyTool(ctx, tool, x, y) {
    if (!this._alive) return
    const svamp = tool._kind === 'svamp'

    if (svamp) {
      for (const s of [...this._spots]) this._scrub(ctx, s, x, y, 74, 1)
    } else {
      // Vattenstråle uppåt-framåt från munstycket.
      this._spray(ctx, x, y)
      for (const s of [...this._spots]) this._scrub(ctx, s, x, y, 96, s.lagerKvar > 1 ? 0.42 : 1)
      // Fåglar i strålen flyr.
      for (const b of [...this._birds]) {
        if (b._gone) continue
        const bx = b.view.x
        const by = b.view.y
        if (Math.hypot(bx - x, by - y) < 210 && by < y) this._scareBird(ctx, b, true)
      }
    }
  },

  _spray(ctx, x, y) {
    this._sprayCooldown -= 1
    if (this._sprayCooldown > 0) return
    this._sprayCooldown = 3
    ctx.services.audio.sfx('whoosh')
    for (let i = 0; i < 3; i++) {
      const d = new Graphics().circle(0, 0, 5 + Math.random() * 5).fill({ color: 0x9fdcf5, alpha: 0.85 })
      d.position.set(x + (Math.random() * 30 - 15), y - 26)
      this._fx.addChild(d)
      const proxy = { x: d.x, y: d.y, a: 0.85 }
      gsap.to(proxy, {
        x: d.x + (Math.random() * 120 - 60),
        y: d.y - 80 - Math.random() * 70,
        a: 0,
        duration: 0.42,
        ease: 'power2.out',
        onUpdate: () => {
          if (d.destroyed) return
          d.position.set(proxy.x, proxy.y)
          d.alpha = proxy.a
        },
        onComplete: () => { if (!d.destroyed) d.destroy() },
      })
    }
  },

  // ------------------------------------------------------------------ bil

  _nextCar(ctx, announce = true) {
    if (!this._alive) return
    this._locked = false
    this._cleanedInCar = 0

    const n = this._carsDone || 0
    const v = VEHICLES[n % VEHICLES.length]
    this._vehicle = v

    // Riv föregående bil.
    if (this._car && !this._car.destroyed) {
      gsap.killTweensOf(this._car)
      this._car.destroy({ children: true })
    }
    this._spots = []

    this._car = this._makeVehicle(v)
    this._car.position.set(-360, CAR_Y)
    this._carLayer.addChild(this._car)

    // Ägaren byts ut per bil (Bobo eller ett djur) — mottagaren som jublar.
    this._makeOwner(n)

    // Smutsfläckar: växer lugnt med antal tvättade bilar.
    const antal = Math.min(4 + Math.floor(n * 0.9), 9)
    for (let i = 0; i < antal; i++) {
      const r = 26 + Math.random() * 20
      this._addSpot(ctx, this._randomSpotPos(v, r), 'smuts', null, r)
    }

    // Kör in.
    gsap.to(this._car, {
      x: CAR_X, duration: 1.05, ease: 'power2.out',
      onComplete: () => {
        if (!this._alive) return
        if (announce && this._started) {
          ctx.services.voice.say(`Här kommer ${v.namn}! Tvätta den ren.`)
        }
      },
    })

    // Takt: fåglarna kommer tätare på senare bilar, men aldrig snabbare än 6 s.
    this._birdInterval = Math.max(6, 9 - n * 0.4)
    this._birdTimer = this._birdInterval * 0.6
    this._idle = 0
  },

  _makeVehicle(v) {
    const c = new Container()
    const w = v.w
    const h = v.h
    const g = new Graphics()

    // Hjul
    const wheelR = v.key === 'traktor' ? 40 : 32
    for (let i = 0; i < v.wheels.length; i++) {
      const wx = v.wheels[i] * w
      const r = v.bigRear && i === 1 ? wheelR * 1.35 : wheelR
      g.circle(wx, h / 2 + 6, r).fill(0x2f3640)
      g.circle(wx, h / 2 + 6, r * 0.45).fill(0xb2bec3)
    }
    // Kaross
    g.roundRect(-w / 2, -h / 2, w, h, 26).fill(v.color)
    // Tak/hytt
    const rw = w * v.roofW
    const rh = h * v.roof
    g.roundRect(-rw / 2 - w * 0.08, -h / 2 - rh + 8, rw, rh, 18).fill(v.color)
    // Fönster
    g.roundRect(-rw / 2 - w * 0.08 + 12, -h / 2 - rh + 20, rw - 24, rh - 30, 12)
      .fill({ color: 0xdff3fb, alpha: 0.95 })
    // Ljus
    g.circle(w / 2 - 18, -h * 0.1, 13).fill(0xfff3c4)
    g.circle(-w / 2 + 18, -h * 0.1, 11).fill(0xffb3b3)
    c.addChild(g)

    // Glans-svep (används i finishen).
    const shine = new Graphics().roundRect(-w / 2, -h / 2 - h * v.roof, 60, h * (1 + v.roof) + 20, 20)
      .fill({ color: 0xffffff, alpha: 0.55 })
    shine.alpha = 0
    c.addChild(shine)
    c._shine = shine
    c._w = w
    c._h = h

    // Fläckarna ligger i ett eget lager ovanpå karossen.
    const spotLayer = new Container()
    c.addChild(spotLayer)
    c._spotLayer = spotLayer

    c.eventMode = 'none'
    return c
  },

  // Slumpad plats PÅ karossen (lokala koordinater i bilen). Fläckens radie MÅSTE vägas in
  // här — annars hänger stora klickar utanför plåten och ser trasiga ut. Taket är smalare
  // än bilen, så det används bara när fläcken faktiskt ryms där.
  _randomSpotPos(v, r = 30) {
    const w = v.w
    const h = v.h
    const rw = w * v.roofW
    const rh = h * v.roof
    const roofCx = -w * 0.08
    const pad = 8
    const rnd = (min, max) => min + Math.random() * Math.max(0, max - min)

    // Taket: bara om fläcken ryms med marginal (30 % chans).
    const roofY0 = -h / 2 - rh + pad + r + 4
    const roofY1 = -h / 2 - r - 6
    const roofHalf = rw / 2 - r - pad
    if (roofHalf > 12 && roofY1 > roofY0 && Math.random() < 0.3) {
      return { x: roofCx + (Math.random() - 0.5) * roofHalf * 2, y: rnd(roofY0, roofY1) }
    }

    // Karossen: klampad så hela klicken ligger på plåten.
    const halfX = Math.max(10, w / 2 - r - 14)
    return {
      x: (Math.random() - 0.5) * halfX * 2,
      y: rnd(-h / 2 + r + pad, h / 2 - r - pad),
    }
  },

  _makeOwner(n) {
    this._owner.removeChildren().forEach((c) => c.destroy({ children: true }))
    const djur = ['🐶', '🐮', '🐷', '🐰']
    const c = new Container()
    // Liten kropp så ägaren står på marken i stället för att strunta i tyngdlagen.
    c.addChild(new Graphics().roundRect(-32, 34, 64, 74, 24).fill(0x8f6bd8))
    c.addChild(new Graphics().roundRect(-30, 96, 24, 16, 7).fill(0x5f4a94))
    c.addChild(new Graphics().roundRect(6, 96, 24, 16, 7).fill(0x5f4a94))
    if (n % 3 === 0) {
      c.addChild(makeMascot(52))
    } else {
      const t = new Text({ text: djur[n % djur.length], style: { fontFamily: FONT.body, fontSize: 86 } })
      t.anchor.set(0.5)
      c.addChild(t)
    }
    this._owner.addChild(c)
    this._ownerBody = c
    // Väntar och studsar lite.
    this._ownerBob?.kill()
    this._ownerBob = gsap.to(this._owner, {
      y: '-=10', duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut',
    })
  },

  // ---------------------------------------------------------------- fläckar

  // r skickas in av anroparen, som redan behövt den för att välja en position som
  // ryms på karossen (se _randomSpotPos).
  _addSpot(ctx, pos, typ, bird = null, r = 30) {
    if (!this._alive || !this._car || this._car.destroyed) return
    const lager = typ === 'bajs' ? bird.lager : 1 + ((Math.random() * 2) | 0)
    const color = typ === 'bajs' ? bird.poop : 0x8a6b45

    const view = new Container()
    const g = new Graphics()
    // Oregelbunden klick: några överlappande cirklar.
    g.circle(0, 0, r).fill({ color, alpha: 0.92 })
    g.circle(r * 0.5, -r * 0.35, r * 0.55).fill({ color, alpha: 0.9 })
    g.circle(-r * 0.45, r * 0.3, r * 0.5).fill({ color, alpha: 0.9 })
    if (typ === 'bajs') {
      // Rinnande droppe under (bajs "kladdar").
      g.ellipse(r * 0.15, r * 0.85, r * 0.28, r * 0.42).fill({ color, alpha: 0.85 })
      g.circle(-r * 0.2, -r * 0.2, r * 0.22).fill({ color: 0xffffff, alpha: 0.35 })
    }
    view.addChild(g)

    if (bird?.glitter) {
      for (let i = 0; i < 6; i++) {
        const s = new Graphics().circle(0, 0, 3.5).fill({ color: 0xffffff, alpha: 0.95 })
        s.position.set((Math.random() - 0.5) * r * 1.6, (Math.random() - 0.5) * r * 1.6)
        view.addChild(s)
      }
    }

    view.position.set(pos.x, pos.y)
    view.eventMode = 'static'
    view.cursor = 'pointer'
    // Träffyta minst 108px i diameter (P0-golvet är 96 — lite marginal, inte exakt på gränsen).
    const hit = Math.max(r + 24, 54)
    view.hitArea = { contains: (px, py) => px * px + py * py <= hit * hit }

    const spot = { view, typ, r, lager, lagerKvar: lager, bird, glitter: !!bird?.glitter }
    view.on('pointertap', () => this._tapSpot(ctx, spot))
    this._car._spotLayer.addChild(view)
    this._spots.push(spot)

    gsap.from(view.scale, { x: 0.2, y: 0.2, duration: 0.28, ease: 'back.out(2)' })
    return spot
  },

  // Tap-tap-fallback: verktyg valt + tryck på fläck → verktyget far dit och skrubbar.
  _tapSpot(ctx, spot) {
    if (!this._alive || this._locked) return
    this._idle = 0
    const tool = this._selected
    if (!tool) {
      // Ingen valt verktyg: rolig men neutral reaktion + mjuk vägledning.
      wiggle(spot.view)
      ctx.services.audio.sfx('soft')
      ctx.services.voice.say('Ta svampen och skrubba!')
      wiggle(this._svamp)
      return
    }
    const gp = spot.view.getGlobalPosition()
    const p = this._root.toLocal(gp)
    this._deselectTool()
    gsap.to(tool, {
      x: p.x, y: p.y, duration: 0.22, ease: 'power2.out',
      onComplete: () => {
        if (!this._alive || tool.destroyed) return
        // Ett tap-tap skrubbar bort hela fläcken (annars blir det tröttsamt).
        this._scrub(ctx, spot, p.x, p.y, 999, spot.lagerKvar)
        gsap.to(tool, { x: tool._home.x, y: tool._home.y, duration: 0.34, ease: 'back.out(1.2)', delay: 0.12 })
      },
    })
  },

  // Skrubba en fläck om verktyget är nära nog. styrka = hur många lager per anrop.
  _scrub(ctx, spot, x, y, radie, styrka) {
    if (!this._alive || spot.klar || !this._car || this._car.destroyed) return
    const gp = spot.view.getGlobalPosition()
    const p = this._root.toLocal(gp)
    if (Math.hypot(p.x - x, p.y - y) > radie + spot.r) return

    spot.lagerKvar -= styrka
    if (spot.lagerKvar > 0) {
      // Blekna successivt + liten skvätt, så framsteget syns direkt.
      const frac = spot.lagerKvar / spot.lager
      if (!spot.view.destroyed) {
        spot.view.alpha = 0.35 + frac * 0.65
        gsap.killTweensOf(spot.view.scale)
        gsap.to(spot.view.scale, {
          x: 0.86 + frac * 0.14, y: 0.86 + frac * 0.14, duration: 0.14, ease: 'power2.out',
        })
      }
      if (styrka >= 1) ctx.services.audio.sfx('soft')
      return
    }

    // Fläcken är borta.
    spot.klar = true
    const idx = this._spots.indexOf(spot)
    if (idx >= 0) this._spots.splice(idx, 1)

    ctx.services.audio.sfx('pop')
    // Stigande pentatonisk ton → hela bilen blir en liten melodi.
    const note = SCALE[Math.min(this._cleanedInCar, SCALE.length - 1)]
    ctx.services.audio.tone({ freq: note, dur: 0.16, type: 'sine', vol: 0.18 })
    this._cleanedInCar++

    puff(this._fx, p.x, p.y, { count: 9, color: spot.typ === 'bajs' ? spot.bird.poop : 0xbfa77f })
    ripple(this._fx, p.x, p.y, { color: 0xffffff, maxR: spot.r * 2.1, width: 4, alpha: 0.6 })
    if (spot.glitter) {
      sparkle(this._fx, p.x, p.y, { count: 12 })
      floatText(this._fx, p.x, p.y - 20, '✨', { fontSize: 52 })
    }
    this._zackeCheer()

    const v = spot.view
    gsap.killTweensOf(v.scale)
    gsap.to(v.scale, {
      x: 0, y: 0, duration: 0.2, ease: 'back.in(2)',
      onComplete: () => { if (!v.destroyed) v.destroy({ children: true }) },
    })

    this._checkClean(ctx)
  },

  _zackeCheer() {
    const arm = this._zacke?._arm
    if (!arm || arm.destroyed) return
    gsap.killTweensOf(arm)
    gsap.fromTo(arm, { rotation: 0 }, { rotation: -0.9, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' })
  },

  // ---------------------------------------------------------------- fåglar

  _spawnBird(ctx) {
    if (!this._alive || this._locked) return
    const n = this._carsDone || 0
    // Fågeltyp: större fåglar dyker upp först på senare bilar.
    const maxTyp = Math.min(1 + Math.floor(n * 0.7), BIRDS.length - 1)
    let art = BIRDS[(Math.random() * (maxTyp + 1)) | 0]
    if (n >= 2 && Math.random() < 0.08) art = RAINBOW_BIRD

    const fromLeft = Math.random() < 0.5
    const y = 110 + Math.random() * 90
    const view = this._makeBird(art)
    view.position.set(fromLeft ? -90 : 1370, y)
    view.scale.x = fromLeft ? 1 : -1
    this._birdLayer.addChild(view)

    const bird = { view, art, _gone: false, _pooped: false, fromLeft, baseY: y }
    this._birds.push(bird)

    // Tryck på fågeln: den flaxar till och skyndar på (alltid en rolig reaktion).
    view.on('pointertap', () => this._tapBird(ctx, bird))

    // Flyg tvärs över. Bajsar ungefär mitt över bilen.
    const targetX = fromLeft ? 1400 : -120
    bird.flight = gsap.to(view, {
      x: targetX,
      duration: 7.5 + Math.random() * 2,
      ease: 'none',
      onComplete: () => this._removeBird(bird),
    })
    bird.bob = gsap.to(view, {
      y: y + 22, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut',
    })

    if (art.ljud) ctx.services.audio.sample(art.ljud)
    if (art.glitter && this._started) {
      ctx.services.voice.say('En regnbågsfågel! Den bajsade glitter!')
    } else if (!this._hintedHose && this._started) {
      // Slangens huvudsyfte måste vara UPPTÄCKBART. Tipset kommer proaktivt vid
      // första fågeln — inte som bekräftelse efteråt (då hittar barnet det aldrig).
      this._hintedHose = true
      ctx.services.voice.say('Spola på fågeln så flyger den iväg!')
      wiggle(this._slang)
    }
  },

  _makeBird(art) {
    const c = new Container()
    const s = art.size
    const g = new Graphics()
    g.ellipse(0, 0, 34 * s, 22 * s).fill(art.body)                       // kropp
    g.circle(26 * s, -8 * s, 15 * s).fill(art.body)                      // huvud
    g.poly([38 * s, -8 * s, 56 * s, -3 * s, 38 * s, 2 * s]).fill(0xf5a623) // näbb
    g.circle(30 * s, -12 * s, 3.4 * s).fill(0x2b2b2b)                    // öga
    g.poly([-30 * s, 2 * s, -56 * s, 14 * s, -18 * s, 12 * s]).fill(art.body) // stjärt
    c.addChild(g)

    // Vinge som flaxar.
    const wing = new Graphics().ellipse(0, 0, 24 * s, 12 * s).fill({ color: 0x000000, alpha: 0.18 })
    const wing2 = new Graphics().ellipse(0, 0, 22 * s, 11 * s).fill(art.body)
    const wingC = new Container()
    wingC.addChild(wing, wing2)
    wingC.position.set(-2 * s, -10 * s)
    c.addChild(wingC)
    c._wing = wingC
    gsap.to(wingC.scale, { y: 0.35, duration: 0.26, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    if (art.glitter) {
      const rb = new Text({ text: '🌈', style: { fontFamily: FONT.body, fontSize: 34 } })
      rb.anchor.set(0.5)
      rb.position.set(-6 * s, -26 * s)
      c.addChild(rb)
    }

    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = { contains: (px, py) => Math.abs(px) <= 60 && Math.abs(py) <= 52 }
    return c
  },

  _tapBird(ctx, bird) {
    if (!this._alive || bird._gone) return
    this._idle = 0
    ctx.services.audio.sfx('boing')
    if (bird.art.ljud) ctx.services.audio.sample(bird.art.ljud)
    wiggle(bird.view)
    // Trycket ska GÖRA något, annars är det en lögn: fågeln stiger, skyndar på och
    // MISSAR bilen (bajset plaskar bredvid). Slangen är fortfarande starkare —
    // den gör att fågeln flyr helt utan att hinna bajsa.
    bird._missar = true
    if (bird.flight) bird.flight.timeScale(1.9)
    if (!bird.view.destroyed) {
      bird.bob?.kill()
      gsap.to(bird.view, { y: Math.max(60, bird.baseY - 55), duration: 0.3, ease: 'power2.out' })
    }
    floatText(this._fx, bird.view.x, bird.view.y - 30, '💨', { fontSize: 40 })
  },

  // Slangen träffade fågeln → den flyr utan att bajsa. Barnets "skicklighet".
  _scareBird(ctx, bird, byHose) {
    if (!this._alive || bird._gone) return
    bird._gone = true
    bird._pooped = true // hinner inte bajsa
    ctx.services.audio.sfx('whoosh')
    if (bird.art.ljud) ctx.services.audio.sample(bird.art.ljud)
    floatText(this._fx, bird.view.x, bird.view.y - 30, '💦', { fontSize: 44 })

    bird.flight?.kill()
    bird.bob?.kill()
    const v = bird.view
    gsap.to(v, {
      x: v.x + (bird.fromLeft ? 320 : -320),
      y: -140,
      duration: 0.85,
      ease: 'power2.in',
      onComplete: () => this._removeBird(bird),
    })

    if (byHose && !this._hosedBird) {
      this._hosedBird = true
      ctx.services.voice.say('Bra spolat! Den hann inte bajsa.')
    }
  },

  _birdPoop(ctx, bird) {
    if (!this._alive || bird._pooped || bird._gone) return
    bird._pooped = true

    // TAKET: max 3 bajsfläckar på bilen samtidigt. Är det fullt missar fågeln —
    // bajset plaskar bredvid på marken. Motgången kan alltså aldrig skena.
    const aktivaBajs = this._spots.filter((s) => s.typ === 'bajs' && !s.klar).length
    const traffar = aktivaBajs < MAX_BAJS && !this._locked && !bird._missar

    const startX = bird.view.x
    const startY = bird.view.y + 16
    const art = bird.art

    const drop = new Graphics()
      .circle(0, 0, art.poopR * 0.42)
      .fill({ color: art.poop, alpha: 0.95 })
    drop.position.set(startX, startY)
    this._fx.addChild(drop)

    // Landningspunkt: på bilen om det får plats, annars bredvid på marken.
    let landX
    let landY
    let pos = null
    if (traffar) {
      pos = this._randomSpotPos(this._vehicle, art.poopR)
      landX = CAR_X + pos.x
      landY = CAR_Y + pos.y
    } else {
      landX = startX < CAR_X ? CAR_X - this._vehicle.w / 2 - 90 : CAR_X + this._vehicle.w / 2 + 90
      landX = Math.max(180, Math.min(1080, landX))
      landY = 560
    }

    const proxy = { x: startX, y: startY }
    gsap.to(proxy, {
      x: landX,
      y: landY,
      duration: 0.62,
      ease: 'power2.in',
      onUpdate: () => {
        if (drop.destroyed) return
        drop.position.set(proxy.x, proxy.y)
      },
      onComplete: () => {
        if (!drop.destroyed) drop.destroy()
        if (!this._alive) return
        ctx.services.audio.sample('plopp') || ctx.services.audio.sfx('pop')
        if (traffar && this._car && !this._car.destroyed && !this._locked) {
          this._addSpot(ctx, pos, 'bajs', art, art.poopR)
          shake(this._car, { intensity: 4, duration: 0.3 })
          floatText(this._fx, landX, landY - 40, '💩', { fontSize: 46 })
          if (this._started) ctx.services.voice.say('Akta! Fågeln bajsade på bilen!')
        } else {
          // Missen: roligt plask på marken, ingen extra fläck att tvätta.
          puff(this._fx, landX, landY, { count: 8, color: art.poop })
          floatText(this._fx, landX, landY - 40, '💩', { fontSize: 40 })
          if (this._started) ctx.services.voice.say('Puh! Den missade bilen!')
        }
      },
    })
  },

  _removeBird(bird) {
    bird.flight?.kill()
    bird.bob?.kill()
    const i = this._birds.indexOf(bird)
    if (i >= 0) this._birds.splice(i, 1)
    const v = bird.view
    if (v && !v.destroyed) {
      gsap.killTweensOf(v)
      if (v._wing && !v._wing.destroyed) gsap.killTweensOf(v._wing.scale)
      v.destroy({ children: true })
    }
  },

  // ---------------------------------------------------------------- finish

  _checkClean(ctx) {
    if (!this._alive || this._locked) return
    if (this._spots.length > 0) return
    this._locked = true
    this._deselectTool()

    const v = this._vehicle
    const car = this._car

    // 1. Glans-svep över lacken.
    if (car && !car.destroyed && car._shine) {
      const shine = car._shine
      shine.alpha = 0.75
      gsap.fromTo(shine, { x: -v.w / 2 }, {
        x: v.w / 2, duration: 0.55, ease: 'power1.inOut',
        onComplete: () => { if (!shine.destroyed) shine.alpha = 0 },
      })
    }
    sparkle(this._fx, CAR_X - 90, CAR_Y - 60, { count: 10 })
    sparkle(this._fx, CAR_X + 90, CAR_Y - 40, { count: 10 })
    ctx.services.audio.sfx('reveal')

    // 2. Tuta — riktig tvåtons-signal (inte ett generiskt blipp).
    gsap.delayedCall(0.45, () => {
      if (!this._alive) return
      ctx.services.audio.tone({ freq: 392, dur: 0.22, type: 'square', vol: 0.16 })
      ctx.services.audio.tone({ freq: 523.25, dur: 0.3, type: 'square', vol: 0.16, delay: 0.16 })
      if (car && !car.destroyed) {
        gsap.fromTo(car, { y: CAR_Y }, { y: CAR_Y - 16, duration: 0.14, yoyo: true, repeat: 3, ease: 'power2.out' })
      }
    })

    // 3. Ägaren jublar och hoppar in.
    gsap.delayedCall(0.7, () => {
      if (!this._alive) return
      const o = this._owner
      if (o && !o.destroyed) {
        this._ownerBob?.kill()
        gsap.to(o, { y: this._ownerHomeY - 46, duration: 0.22, yoyo: true, repeat: 1, ease: 'power2.out' })
        floatText(this._fx, o.x, o.y - 90, '🎉', { fontSize: 54 })
      }
      ctx.services.voice.say('Bilen är skinande ren! Bra jobbat!')
    })

    // 4. Bilen rullar ut genom glansbågen. OBS: progress.complete() säger ett slumpat
    // beröm, och voice.say() avbryter alltid pågående tal — därför ligger den här
    // rejält efter den spelspecifika repliken (0,7 s), annars klipps den varje gång.
    gsap.delayedCall(2.2, () => {
      if (!this._alive) return
      const o = this._owner
      if (o && !o.destroyed) gsap.to(o, { alpha: 0, duration: 0.3 })
      if (car && !car.destroyed) {
        gsap.to(car, {
          x: 1500, duration: 1.5, ease: 'power2.in',
          onUpdate: () => {
            if (!this._alive || car.destroyed) return
            if (Math.random() < 0.25) sparkle(this._fx, car.x, CAR_Y - 40, { count: 3 })
          },
        })
      }
      // Progress + delat firande (stjärna, klistermärke, beröm).
      this._carsDone = (this._carsDone || 0) + 1
      ctx.progress.setLevel(this._carsDone)
      ctx.progress.setCustom('tvattade', this._carsDone)
      ctx.progress.complete()
    })

    // 5. Nästa bil rullar in (efter firandet hunnit andas ut).
    gsap.delayedCall(4.2, () => {
      if (!this._alive) return
      if (this._owner && !this._owner.destroyed) {
        this._owner.alpha = 1
        this._owner.y = this._ownerHomeY
      }
      this._nextCar(ctx, true)
    })
  },

  // ---------------------------------------------------------------- loop

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000

    // Fåglar: bajsa när de är ovanför bilen.
    for (const b of [...this._birds]) {
      if (b._gone || b._pooped || b.view.destroyed) continue
      const overCar = Math.abs(b.view.x - CAR_X) < 70
      if (overCar) this._birdPoop(ctx, b)
    }

    // Ny fågel med lagom mellanrum (aldrig under 6 s).
    if (!this._locked) {
      this._birdTimer -= dt
      if (this._birdTimer <= 0) {
        this._birdTimer = this._birdInterval
        this._spawnBird(ctx)
      }
    }

    // Lugn om-cue vid inaktivitet.
    this._idle += dt
    if (this._idle > 6 && !this._locked && this._spots.length > 0) {
      this._idle = 0
      const bajs = this._spots.find((s) => s.typ === 'bajs')
      ctx.services.voice.say(bajs ? 'Skrubba bort bajset med svampen!' : 'Skrubba smutsen med svampen!')
      const s = bajs || this._spots[0]
      if (s && !s.view.destroyed) wiggle(s.view)
      wiggle(this._svamp)
    }
  },

  destroy(ctx) {
    this._alive = false
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)

    // Verktyg: lossa lyssnare + döda tweens.
    for (const t of [this._svamp, this._slang]) {
      if (!t) continue
      this._detachTool(t)
      t._pulse?.kill()
      if (t._down) t.off('pointerdown', t._down)
      if (!t.destroyed) {
        gsap.killTweensOf(t)
        gsap.killTweensOf(t.scale)
      }
    }
    // Fåglar
    for (const b of [...(this._birds || [])]) {
      b.flight?.kill()
      b.bob?.kill()
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view)
        if (b.view._wing && !b.view._wing.destroyed) gsap.killTweensOf(b.view._wing.scale)
      }
    }
    // Fläckar
    for (const s of [...(this._spots || [])]) {
      if (s.view && !s.view.destroyed) {
        gsap.killTweensOf(s.view)
        gsap.killTweensOf(s.view.scale)
      }
    }
    this._ownerBob?.kill()
    if (this._owner && !this._owner.destroyed) gsap.killTweensOf(this._owner)
    if (this._car && !this._car.destroyed) {
      gsap.killTweensOf(this._car)
      if (this._car._shine && !this._car._shine.destroyed) gsap.killTweensOf(this._car._shine)
    }
    if (this._zacke?._arm && !this._zacke._arm.destroyed) gsap.killTweensOf(this._zacke._arm)
    // Bågens glimt-tweens (proxy-baserade).
    if (this._arch && !this._arch.destroyed) {
      for (const d of this._arch.children) if (d._twinkleProxy) gsap.killTweensOf(d._twinkleProxy)
    }
    gsap.killTweensOf(this._root)

    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
    this._car = null
    this._fx = null
    this._spots = []
    this._birds = []
    this._tool = null
    this._selected = null
  },
}
