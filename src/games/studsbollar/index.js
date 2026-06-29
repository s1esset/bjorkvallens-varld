// Studsbollar — fysik-sandlåda (2–5 år). Tryck var som helst så släpps en glad,
// glansig boll som faller, studsar och krockar med de andra och väggarna (matter.js).
// Inget mål att missa: varje tryck ger en boll + mjukt ljud. Efter ett gäng bollar
// kommer ett delat firande, sedan rullar leken vidare. Oändlig, lugn lek.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld } from '../../lib/physics.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, PLAYFUL } from '../../lib/theme.js'

const MAX_BALLS = 34 // tak för prestanda; äldsta bollen tas bort över detta
const BALLS_PER_CELEBRATION = 12

export default {
  id: 'studsbollar',
  titleSv: 'Studsbollar',
  icon: '🏀',
  category: 'fysik',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'studsbollar',
  voiceIntro: 'Tryck för att släppa bollar!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._dropped = 0
    this._balls = [] // { body, view }
    this._lastHit = 0
    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._phys = new PhysicsWorld({ gravityY: 1.5, walls: ['floor', 'left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // Hela scenen är tryckbar (släpp en boll där fingret tar i).
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._catcher.on('pointertap', (ev) => {
      const p = this._root.toLocal(ev.global)
      this._drop(ctx, p.x)
    })
    this._root.addChild(this._catcher)

    this._tick = (t) => {
      if (!this._alive) return
      this._phys.update(t.deltaMS)
      this._idle += t.deltaMS / 1000
      if (this._idle > 6) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
        this._drop(ctx, ctx.width / 2)
      }
    }
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    // Ett par bollar för att visa idén direkt.
    this._drop(ctx, ctx.width * 0.4)
    gsap.delayedCall(0.35, () => this._alive && this._drop(ctx, ctx.width * 0.6))
  },

  _drop(ctx, x) {
    if (!this._alive) return
    this._idle = 0
    const r = 24 + Math.random() * 22
    x = Math.max(r + 10, Math.min(ctx.width - r - 10, x))
    const color = randomFrom(PLAYFUL)
    const view = makeBall(r, color)
    view.x = x
    view.y = -r - 10
    this._root.addChild(view)
    const body = this._phys.circle(x, -r - 10, r, {
      restitution: 0.62,
      friction: 0.02,
      frictionAir: 0.004,
      density: 0.0012,
    })
    // liten sidledes knuff för liv
    body.velocity.x = (Math.random() - 0.5) * 4
    const ball = { body, view }
    this._balls.push(ball)
    this._phys.link(body, view)
    ctx.services.audio.sfx('pop')
    // studs-in
    view.scale.set(0.2)
    gsap.to(view.scale, { x: 1, y: 1, duration: 0.3, ease: 'back.out(2)' })

    // Tak: ta bort äldsta bollen mjukt.
    if (this._balls.length > MAX_BALLS) {
      const old = this._balls.shift()
      this._fade(old)
    }

    this._dropped++
    if (this._dropped % BALLS_PER_CELEBRATION === 0) {
      ctx.progress.complete()
    }
  },

  _onCollision(ctx, e) {
    if (!this._alive) return
    const now = performance.now()
    if (now - this._lastHit < 90) return // strypa ljud-spam
    for (const pair of e.pairs) {
      const speed = Math.abs(pair.collision?.depth || 0) + (pair.bodyA.speed + pair.bodyB.speed)
      if (speed > 3.2) {
        this._lastHit = now
        ctx.services.audio.sfx('tap')
        break
      }
    }
  },

  _fade(ball) {
    if (!ball) return
    this._phys.removeBody(ball.body)
    const v = ball.view
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

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._unbind?.()
    this._balls.forEach((b) => {
      if (b.view && !b.view.destroyed) {
        gsap.killTweensOf(b.view)
        gsap.killTweensOf(b.view.scale)
      }
    })
    this._balls = []
    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}

// Glansig boll: huvudfärg + ljus highlight + mjuk kant (programmatisk "3D").
function makeBall(r, color) {
  const c = new Container()
  const body = new Graphics()
    .circle(0, 0, r)
    .fill(color)
    .stroke({ width: Math.max(2, r * 0.08), color: shade(color, 0.18), alpha: 0.6 })
  const gloss = new Graphics().circle(-r * 0.32, -r * 0.34, r * 0.34).fill({ color: COLORS.white, alpha: 0.55 })
  gloss.eventMode = 'none'
  c.addChild(body, gloss)
  return c
}

function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
