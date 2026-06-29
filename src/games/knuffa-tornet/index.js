// Knuffa Tornet — fysik-lek (2–5 år). En tung rivningskula hänger i en kedja
// uppe till vänster. Tryck var som helst så svingar kulan ner och in i ett torn
// av glada klossar till höger — klossarna välter och far åt alla håll (matter.js).
// Inget mål att missa: varje tryck ger ljud + rörelse. När tornet vält kommer ett
// delat firande, sedan byggs tornet upp igen. Oändlig, lugn lek.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Matter } from '../../lib/physics.js'
import { puff, floatText, bounceIn } from '../../lib/feedback.js'
import { COLORS, PLAYFUL } from '../../lib/theme.js'

const { Constraint, Composite, Body } = Matter

// --- inställningar (justeras fritt) ---
const ANCHOR = { x: 250, y: 80 } // pivot uppe till vänster (kedjans fäste, fast punkt)
const CHAIN_LEN = 590 // pendelns längd ~ avståndet ner-och-bort till tornet
const BALL_R = 46
// Startläge: kulan hålls längst ner till vänster, kedjan spänd (radie ~CHAIN_LEN).
const BALL_START = { x: 65, y: 640 }
const LAUNCH_AIM = { x: 705, y: 470 } // siktpunkt: övre-mitten av tornet
const LAUNCH_SPEED = 20 // hur hårt kulan kastas mot tornet (höj om svinget tar slut för tidigt)

const FLOOR_Y = 720
const TOWER_X = 740 // tornet står till höger på golvet
const BLOCK_W = 110
const BLOCK_H = 60
const BLOCK_COUNT = 6
const BLOCK_COLORS = PLAYFUL

export default {
  id: 'knuffa-tornet',
  titleSv: 'Knuffa Tornet',
  icon: '💥',
  category: 'fysik',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'knuffa-tornet',
  voiceIntro: 'Tryck så välter klossarna!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._phase = 'ready' // ready -> launched -> impact -> done -> (reset) ready
    this._blocks = [] // { body, view }
    this._lastHit = 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Hela scenen är tryckbar (släpp kulan var fingret än tar i). Längst ner i
    // stacken; alla synliga objekt är eventMode:'none' så trycket faller hit.
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._catcher.on('pointertap', () => this._onTap(ctx))
    this._root.addChild(this._catcher)

    // Mjuk markremsa för sammanhang (dekorativ).
    const ground = new Graphics().rect(0, FLOOR_Y - 16, ctx.width, 16 + 8).fill({ color: COLORS.green, alpha: 0.35 })
    ground.eventMode = 'none'
    this._root.addChild(ground)

    this._phys = new PhysicsWorld({ gravityY: 1.2, walls: ['floor', 'left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // Kedja + pivot ritas över tornet/kulan.
    this._chain = new Graphics()
    this._chain.eventMode = 'none'

    // Kulan (tung rivningskula) + pendel-tvång till den fasta pivoten.
    this._ballView = makeBall(BALL_R)
    this._ballView.position.set(BALL_START.x, BALL_START.y)
    this._ballBody = this._phys.circle(BALL_START.x, BALL_START.y, BALL_R, {
      density: 0.02, // tung -> välter klossarna säkert
      restitution: 0.12, // studsar nästan inte (plöjer igenom)
      friction: 0.4,
      frictionAir: 0.001, // svingar fritt
      label: 'ball',
    })
    this._phys.link(this._ballBody, this._ballView)
    Body.setStatic(this._ballBody, true) // hålls stilla tills man trycker
    this._constraint = Constraint.create({
      pointA: { x: ANCHOR.x, y: ANCHOR.y }, // ingen bodyA => fast världspunkt
      bodyB: this._ballBody,
      pointB: { x: 0, y: 0 },
      length: CHAIN_LEN,
      stiffness: 0.9,
      damping: 0.08,
    })
    Composite.add(this._phys.world, this._constraint)

    // Pivot-fäste (dekor) uppe till vänster.
    this._pivot = new Graphics()
    this._pivot.eventMode = 'none'
    this._pivot
      .moveTo(ANCHOR.x - 26, ANCHOR.y - 18)
      .lineTo(ANCHOR.x + 26, ANCHOR.y - 18)
      .lineTo(ANCHOR.x, ANCHOR.y + 14)
      .closePath()
      .fill(COLORS.ink)
    this._pivot.circle(ANCHOR.x, ANCHOR.y, 10).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.ink })

    this._root.addChild(this._ballView, this._chain, this._pivot)

    this._buildTower(ctx)

    this._tick = (t) => {
      if (!this._alive) return
      this._phys.update(t.deltaMS)
      this._drawChain()
      if (this._phase === 'ready') {
        this._idle += t.deltaMS / 1000
        if (this._idle > 6) {
          this._idle = 0
          ctx.services.voice.say(this.voiceIntro)
        }
      }
    }
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  _onTap(ctx) {
    if (!this._alive) return
    this._idle = 0
    if (this._phase === 'ready') {
      this._launch(ctx)
    } else if (this._phase === 'launched' && this._ballBody && this._ballBody.speed < 2) {
      // Svinget tog slut utan träff -> låt barnet kasta igen.
      this._launch(ctx)
    } else {
      // Alltid något att höra på ett tryck (aldrig bestraffande).
      ctx.services.audio.sfx('tap')
    }
  },

  _launch(ctx) {
    if (!this._alive || !this._ballBody) return
    this._phase = 'launched'
    Body.setStatic(this._ballBody, false)
    const bx = this._ballBody.position.x
    const by = this._ballBody.position.y
    let dx = LAUNCH_AIM.x - bx
    let dy = LAUNCH_AIM.y - by
    const len = Math.hypot(dx, dy) || 1
    Body.setVelocity(this._ballBody, { x: (dx / len) * LAUNCH_SPEED, y: (dy / len) * LAUNCH_SPEED })
    Body.setAngularVelocity(this._ballBody, 0)
    ctx.services.audio.sfx('whoosh')
    ctx.services.voice.say('Iväg!')
  },

  _onCollision(ctx, e) {
    if (!this._alive) return
    const now = performance.now()
    let ballHitBlock = false
    for (const pair of e.pairs) {
      const la = pair.bodyA.label
      const lb = pair.bodyB.label
      if ((la === 'ball' && lb === 'block') || (lb === 'ball' && la === 'block')) ballHitBlock = true
    }

    // Ljud på rejäla krockar (strypt så det inte spammar).
    if (now - this._lastHit > 70) {
      for (const pair of e.pairs) {
        const involvesBlock = pair.bodyA.label === 'block' || pair.bodyB.label === 'block'
        if (!involvesBlock) continue
        if (pair.bodyA.speed + pair.bodyB.speed > 2) {
          this._lastHit = now
          ctx.services.audio.sfx(ballHitBlock ? 'pop' : 'tap') // mjukt "pang"
          break
        }
      }
    }

    // Första träffen mot tornet -> krasch-effekt + tidsstyrt firande.
    if (ballHitBlock && this._phase === 'launched') {
      this._phase = 'impact'
      const x = this._ballView?.x ?? LAUNCH_AIM.x
      const y = this._ballView?.y ?? LAUNCH_AIM.y
      puff(ctx.fxLayer, x, y, { count: 12 })
      floatText(ctx.fxLayer, x, y - 40, '💥', { fontSize: 72 })
      gsap.delayedCall(1.5, () => {
        if (!this._alive || this._phase !== 'impact') return
        this._phase = 'done'
        ctx.progress.complete() // firande + beröm + stjärna + klistermärke (delat)
        gsap.delayedCall(2.5, () => {
          if (!this._alive) return
          this._reset(ctx)
        })
      })
    }
  },

  _buildTower(ctx) {
    for (let i = 0; i < BLOCK_COUNT; i++) {
      const y = FLOOR_Y - BLOCK_H / 2 - i * BLOCK_H
      const color = BLOCK_COLORS[i % BLOCK_COLORS.length]
      const view = makeBlock(BLOCK_W, BLOCK_H, color)
      view.position.set(TOWER_X, y)
      // Lägg klossen under kedjan/pivoten (men över catcher/mark).
      this._root.addChildAt(view, this._root.getChildIndex(this._ballView))
      const body = this._phys.rectangle(TOWER_X, y, BLOCK_W, BLOCK_H, {
        density: 0.0016, // lätta klossar
        restitution: 0.08,
        friction: 0.6,
        frictionStatic: 1.2, // håller stapeln stilla tills den knuffas
        label: 'block',
      })
      this._phys.link(body, view)
      this._blocks.push({ body, view })
      bounceIn(view, { delay: i * 0.05 })
    }
  },

  _clearTower() {
    for (const b of this._blocks) {
      this._phys.removeBody(b.body)
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view)
        gsap.killTweensOf(b.view.scale)
        b.view.destroy()
      }
    }
    this._blocks = []
  },

  _reset(ctx) {
    if (!this._alive) return
    this._clearTower()
    this._buildTower(ctx)
    // Återställ kulan till starthåll och frys den igen.
    Body.setStatic(this._ballBody, false)
    Body.setPosition(this._ballBody, { x: BALL_START.x, y: BALL_START.y })
    Body.setVelocity(this._ballBody, { x: 0, y: 0 })
    Body.setAngularVelocity(this._ballBody, 0)
    Body.setAngle(this._ballBody, 0)
    Body.setStatic(this._ballBody, true)
    if (this._ballView && !this._ballView.destroyed) this._ballView.rotation = 0
    this._phase = 'ready'
    this._idle = 0
    ctx.services.voice.say('Vi bygger ett nytt torn!')
  },

  _drawChain() {
    const g = this._chain
    if (!g || g.destroyed || !this._ballView || this._ballView.destroyed) return
    g.clear()
    g.moveTo(ANCHOR.x, ANCHOR.y)
      .lineTo(this._ballView.x, this._ballView.y)
      .stroke({ width: 9, color: COLORS.inkSoft, alpha: 0.9 })
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx.ticker.remove(this._tick)
    this._unbind?.()
    for (const b of this._blocks) {
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view)
        gsap.killTweensOf(b.view.scale)
      }
    }
    this._blocks = []
    if (this._ballView && !this._ballView.destroyed) {
      gsap.killTweensOf(this._ballView)
      gsap.killTweensOf(this._ballView.scale)
    }
    gsap.killTweensOf(this._root)
    this._phys?.destroy()
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}

// Tung, glansig rivningskula (programmatisk "3D": färg + highlight + mörk kant).
function makeBall(r) {
  const c = new Container()
  const body = new Graphics()
    .circle(0, 0, r)
    .fill(0x6b6f76)
    .stroke({ width: r * 0.1, color: 0x3a3d42, alpha: 0.85 })
  const gloss = new Graphics().circle(-r * 0.32, -r * 0.34, r * 0.34).fill({ color: COLORS.white, alpha: 0.45 })
  gloss.eventMode = 'none'
  c.addChild(body, gloss)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// Färgglad kloss (rundad rektangel + mjuk highlight).
function makeBlock(w, h, color) {
  const c = new Container()
  const g = new Graphics()
    .roundRect(-w / 2, -h / 2, w, h, 12)
    .fill(color)
    .stroke({ width: 4, color: shade(color, 0.22), alpha: 0.7 })
  const hi = new Graphics().roundRect(-w / 2 + 10, -h / 2 + 8, w * 0.4, h * 0.22, 6).fill({ color: COLORS.white, alpha: 0.28 })
  hi.eventMode = 'none'
  c.addChild(g, hi)
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
