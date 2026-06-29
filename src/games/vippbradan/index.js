// Vippbrädan — fysik-sandlåda (3–5 år). En lång planka balanserar på en triangel
// mitt på skärmen. Tryck till vänster eller höger så faller en rund sak (äpple/djur)
// ner på den sidan — plankan tippar och sakerna glider/rullar. Ren orsak-och-verkan.
// Inget mål att missa: får man brädan jämn (eller efter ett gäng saker) kommer ett
// delat firande, sedan rensas sakerna mjukt och leken rullar vidare. Oändlig, lugn lek.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Matter } from '../../lib/physics.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, PLAYFUL, FONT, DESIGN_W, DESIGN_H } from '../../lib/theme.js'

const { Constraint, Composite, Body } = Matter

const PLANK_W = 520
const PLANK_H = 26
const WEIGHT_R = 30
const MAX_WEIGHTS = 14 // tak för prestanda; äldsta tas bort mjukt över detta
const WEIGHTS_PER_CELEBRATION = 8 // fira även om man bara fyller på (aldrig "fel")
const LEVEL_ANGLE = 0.06 // |vinkel| under detta räknas som "jämn"

// Runda, lite "tunga" saker (emoji = inga bildtillgångar krävs).
const ITEMS = ['🍎', '🍐', '🍊', '🐢', '🐤', '🐹', '🦔', '🐸', '🦆', '⭐']
const DROP_WORDS = ['Plopp!', 'Titta vad som händer!', 'Vad kul!']

export default {
  id: 'vippbradan',
  titleSv: 'Vippbrädan',
  icon: '⚖️',
  category: 'fysik',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'vippbradan',
  voiceIntro: 'Släpp saker på vippbrädan och se den gunga!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._dropped = 0
    this._celebrating = false
    this._lastHit = 0
    this._lastSay = 0
    this._weights = [] // { body, view, side }

    this._cx = ctx.width / 2 // 640
    this._pivotY = 560 // plankans nav, en bit ovanför golvet (720)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // --- Fysik: golv + sidoväggar så saker som glider av stannar kvar i bilden.
    this._phys = new PhysicsWorld({ gravityY: 1.2, walls: ['floor', 'left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // --- Tryckyta över hela scenen (vänster/höger halva avgör sidan).
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._catcher.on('pointertap', (ev) => {
      const p = this._root.toLocal(ev.global)
      this._drop(ctx, p.x < this._cx ? -1 : 1)
    })
    this._root.addChild(this._catcher)

    // --- Mark + triangel-stöd (rent dekorativt; plankan hålls av constrainten).
    const deco = new Graphics()
    deco.rect(0, 700, ctx.width, ctx.height - 700).fill(COLORS.green)
    deco.moveTo(this._cx - 74, 700)
    deco.lineTo(this._cx + 74, 700)
    deco.lineTo(this._cx, this._pivotY + 16)
    deco.closePath()
    deco.fill(COLORS.orange).stroke({ width: 4, color: COLORS.orangeDark })
    deco.eventMode = 'none'
    deco.interactiveChildren = false
    this._root.addChild(deco)

    // --- Plankan: Matter-rektangel, fastnålad i CENTRUM med en revolut-constraint.
    // Den kan ROTERA kring navet men inte förflytta sig. frictionAir dämpar vaggandet.
    const plankBody = this._phys.rectangle(this._cx, this._pivotY, PLANK_W, PLANK_H, {
      density: 0.0012, // måttlig massa -> tröghet -> lugnt, läsbart vaggande
      frictionAir: 0.02, // vinkel-dämpning så den gungar mjukt, inte våldsamt
      friction: 0.6, // saker sitter kvar tills lutningen blir tydlig, då glider de
      restitution: 0.05,
      label: 'plank',
    })
    this._plankBody = plankBody
    this._constraint = Constraint.create({
      pointA: { x: this._cx, y: this._pivotY },
      bodyB: plankBody,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 1, // styv -> navet sitter still, bara rotation tillåts
    })
    Composite.add(this._phys.world, this._constraint)

    this._plankView = makePlank()
    this._plankView.eventMode = 'none'
    this._plankView.interactiveChildren = false
    this._root.addChild(this._plankView)
    this._phys.link(plankBody, this._plankView)

    // --- Lager för saker (ovanpå plankan).
    this._weightsLayer = new Container()
    this._weightsLayer.eventMode = 'none'
    this._weightsLayer.interactiveChildren = false
    this._root.addChild(this._weightsLayer)

    // --- Mjuka "tryck här"-ledtrådar (dekorativa; tap går igenom till catchern).
    this._hints = [this._makeHint(this._cx - 360, 150), this._makeHint(this._cx + 360, 150)]
    this._hints.forEach((h) => this._root.addChild(h))

    this._tick = (t) => {
      if (!this._alive) return
      this._phys.update(t.deltaMS)
      this._tame() // håll vaggandet lugnt och hindra att brädan slår runt
      if (!this._celebrating) this._checkBalance(ctx)
      this._idle += t.deltaMS / 1000
      if (this._idle > 6) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
        this._drop(ctx, Math.random() < 0.5 ? -1 : 1)
      }
    }
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    // En sak på varje sida för att visa idén direkt.
    this._drop(ctx, -1)
    gsap.delayedCall(0.4, () => this._alive && this._drop(ctx, 1))
  },

  // Släpp en sak ovanför plankans vänstra (-1) eller högra (+1) zon.
  _drop(ctx, side) {
    if (!this._alive || this._celebrating) return
    this._idle = 0
    const base = this._cx + side * 150
    const x = base + (Math.random() * 60 - 30) // landar tryggt på plankan
    const y = 40
    const color = randomFrom(PLAYFUL)
    const emoji = randomFrom(ITEMS)

    const view = makeWeight(WEIGHT_R, emoji, color)
    view.x = x
    view.y = y
    this._weightsLayer.addChild(view)

    const body = this._phys.circle(x, y, WEIGHT_R, {
      density: 0.0016, // måttlig massa -> tippar plankan tydligt men snällt
      restitution: 0.05, // låg studs -> lägger sig till ro
      friction: 0.8, // hög friktion -> sitter kvar tills lutningen blir stor
      frictionAir: 0.01,
      label: 'weight',
    })
    this._phys.link(body, view)

    const w = { body, view, side }
    this._weights.push(w)
    ctx.services.audio.sfx('pop')
    view.scale.set(0.2)
    gsap.to(view.scale, { x: 1, y: 1, duration: 0.28, ease: 'back.out(2)' })

    // Glatt litet ord ibland (men aldrig så ofta att rösten klipper sig själv).
    const now = performance.now()
    if (now - this._lastSay > 2200 && Math.random() < 0.45) {
      this._lastSay = now
      ctx.services.voice.say(randomFrom(DROP_WORDS))
    }

    if (this._weights.length > MAX_WEIGHTS) this._removeWeight(this._weights.shift())

    this._dropped++
    if (this._dropped >= WEIGHTS_PER_CELEBRATION) this._celebrate(ctx)
  },

  // Håll rörelsen lugn och säker: dämpa snabba ryck och hindra att brädan slår runt.
  _tame() {
    const pb = this._plankBody
    if (!pb) return
    const av = pb.angularVelocity
    if (Math.abs(av) > 0.09) Body.setAngularVelocity(pb, Math.sign(av) * 0.09)
    if (Math.abs(pb.angle) > 0.55) {
      Body.setAngle(pb, Math.sign(pb.angle) * 0.55)
      Body.setAngularVelocity(pb, 0)
    }
  },

  // Fira när brädan är (nära) jämn med minst en sak på varje sida och allt ligger still.
  _checkBalance(ctx) {
    if (this._celebrating) return
    const pb = this._plankBody
    if (Math.abs(pb.angle) >= LEVEL_ANGLE || Math.abs(pb.angularVelocity) > 0.02) return
    let left = 0
    let right = 0
    for (const w of this._weights) {
      const b = w.body
      const onPlank = Math.abs(b.position.x - this._cx) < 290 && b.position.y < this._pivotY + 50
      if (!onPlank) continue
      if (b.speed > 0.5) return // något rör sig fortfarande -> vänta
      if (b.position.x < this._cx) left++
      else right++
    }
    if (left >= 1 && right >= 1) this._celebrate(ctx)
  },

  _celebrate(ctx) {
    if (this._celebrating) return
    this._celebrating = true
    this._dropped = 0
    // complete() sköter celebrate-sfx + slumpat beröm-röst + konfetti + stjärna + klistermärke.
    ctx.progress.complete()
    // Rensa sakerna mjukt en stund senare och fortsätt leken.
    gsap.delayedCall(1.6, () => {
      if (!this._alive) return
      while (this._weights.length) this._removeWeight(this._weights.shift())
      this._celebrating = false
      this._idle = 0
    })
  },

  // Mjuk landningston när en sak möter plankan eller en annan sak (strypt mot ljud-spam).
  _onCollision(ctx, e) {
    if (!this._alive) return
    const now = performance.now()
    if (now - this._lastHit < 110) return
    for (const pair of e.pairs) {
      const speed = pair.bodyA.speed + pair.bodyB.speed
      if (speed > 2.4) {
        this._lastHit = now
        ctx.services.audio.sfx('soft')
        break
      }
    }
  },

  _removeWeight(w) {
    if (!w) return
    this._phys.removeBody(w.body)
    const v = w.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    gsap.to(v.scale, {
      x: 0,
      y: 0,
      duration: 0.3,
      ease: 'back.in(2)',
      onComplete: () => {
        if (!v.destroyed) v.destroy()
      },
    })
  },

  _makeHint(x, y) {
    const c = new Container()
    c.x = x
    c.y = y
    const disc = new Graphics().circle(0, 0, 46).fill({ color: COLORS.white, alpha: 0.28 })
    const arrow = new Text({ text: '👇', style: { fontFamily: FONT.body, fontSize: 48 } })
    arrow.anchor.set(0.5)
    c.addChild(disc, arrow)
    c.eventMode = 'none'
    c.interactiveChildren = false
    // Lugn pulsering som inbjuder till tryck.
    gsap.to(c.scale, { x: 1.12, y: 1.12, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    return c
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._unbind?.()
    this._weights.forEach((w) => {
      if (w.view && !w.view.destroyed) {
        gsap.killTweensOf(w.view)
        gsap.killTweensOf(w.view.scale)
      }
    })
    this._weights = []
    if (this._plankView && !this._plankView.destroyed) gsap.killTweensOf(this._plankView.scale)
    this._hints?.forEach((h) => {
      if (h && !h.destroyed) gsap.killTweensOf(h.scale)
    })
    this._phys?.destroy() // rensar även constrainten (Composite.clear)
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}

// Planka: avrundad träbjälke med en glad nav-bult i mitten (roterar med plankan).
function makePlank() {
  const c = new Container()
  const board = new Graphics()
    .roundRect(-PLANK_W / 2, -PLANK_H / 2, PLANK_W, PLANK_H, PLANK_H / 2)
    .fill(COLORS.brown)
    .stroke({ width: 4, color: shade(COLORS.brown, 0.25) })
  const bolt = new Graphics().circle(0, 0, 9).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.orangeDark })
  c.addChild(board, bolt)
  return c
}

// Rund "sak": färgad glansig disk med en emoji ovanpå.
function makeWeight(r, emoji, color) {
  const c = new Container()
  const disc = new Graphics()
    .circle(0, 0, r)
    .fill(color)
    .stroke({ width: 3, color: shade(color, 0.2), alpha: 0.5 })
  const gloss = new Graphics().circle(-r * 0.3, -r * 0.33, r * 0.32).fill({ color: COLORS.white, alpha: 0.5 })
  gloss.eventMode = 'none'
  const t = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: r * 1.2 } })
  t.anchor.set(0.5)
  c.addChild(disc, gloss, t)
  return c
}

function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
