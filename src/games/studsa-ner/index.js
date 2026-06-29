// Studsa Ner — en lugn plinko för 2–5 år. Tryck högst upp så släpps ett glansigt
// mynt som pingar ner genom en triangel av pinnar och landar i en färgglad ficka.
// Inget mål att missa: varje tryck ger ett mynt + mjukt ljud. När myntet lägger sig
// stilla i en ficka gnistrar det till. Efter ett gäng nedslag kommer ett delat
// firande, sedan rullar leken vidare. Oändlig, snäll lek (matter.js + Pixi v8).
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld } from '../../lib/physics.js'
import { sparkle } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, PLAYFUL, DESIGN_W, DESIGN_H } from '../../lib/theme.js'

const MAX_BALLS = 10 // tak för prestanda; äldsta myntet tonar bort över detta
const SETTLES_PER_CELEBRATION = 6 // antal nedslag innan ett delat firande
const BALL_R = 22
const TOP_Y = 56 // var myntet föds (i toppbandet)
const SETTLE_Y = 600 // myntet räknas som "nere i en ficka" under denna y
const SETTLE_SPEED = 0.6 // ... och långsammare än så här
const VOICE_THROTTLE = 2500 // ms mellan glada röst-rop (annars hackar rösten)

// Fem fickfärger (distinkta PLAYFUL-toner).
const BIN_COLORS = [0xff8a3d, 0x5bbf6a, 0x4aa3df, 0xa78bfa, 0xff9ec4]

// Korta glada svenska rop vid släpp (strypt så rösten inte avbryter sig själv).
const DROP_CHEERS = ['Ner den åker!', 'Studs studs!', 'Titta!', 'Pang!', 'Wii!']

export default {
  id: 'studsa-ner',
  titleSv: 'Studsa Ner',
  icon: '🪙',
  category: 'fysik',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'studsa-ner',
  voiceIntro: 'Tryck högst upp så ramlar bollen ner!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._settled = 0
    this._balls = [] // { body, view, settled }
    this._lastHit = 0
    this._lastVoice = 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Fysik: bara golv + sidoväggar (myntet ramlar in uppifrån).
    this._phys = new PhysicsWorld({ gravityY: 1.3, walls: ['floor', 'left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    this._buildBoard(ctx)
    this._buildPegs(ctx)
    this._buildBins(ctx)
    this._buildIndicator(ctx)

    // Hela skärmen är tryckbar; ett tryck släpper alltid ett mynt uppifrån vid
    // fingrets x (klampat). Toppbandet är extra inbjudande tack vare pulsaren.
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

      // Upptäck mynt som lagt sig stilla nere i en ficka.
      for (const ball of this._balls) {
        if (ball.settled) continue
        if (ball.body.position.y > SETTLE_Y && ball.body.speed < SETTLE_SPEED) {
          ball.settled = true
          this._onSettle(ctx, ball)
        }
      }

      // Mild återpåminnelse om ingen rört skärmen på ett tag.
      this._idle += t.deltaMS / 1000
      if (this._idle > 6) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
        this._lastVoice = performance.now()
        this._drop(ctx, ctx.width / 2)
      }
    }
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._lastVoice = performance.now()
    // Ett mynt direkt för att visa idén.
    gsap.delayedCall(0.4, () => this._alive && this._drop(ctx, ctx.width / 2))
  },

  _drop(ctx, x) {
    if (!this._alive) return
    this._idle = 0
    const r = BALL_R
    x = Math.max(r + 12, Math.min(ctx.width - r - 12, x))

    const color = randomFrom(PLAYFUL)
    const view = makeBall(r, color)
    view.x = x
    view.y = TOP_Y
    this._root.addChild(view)

    const body = this._phys.circle(x, TOP_Y, r, {
      restitution: 0.5,
      friction: 0.02,
      frictionAir: 0.003,
      density: 0.002,
      label: 'ball',
    })
    // Pytteliten sidoknuff så myntet inte fastnar rakt ovanpå en pinne.
    body.velocity.x = (Math.random() - 0.5) * 1.6

    const ball = { body, view, settled: false }
    this._balls.push(ball)
    this._phys.link(body, view)

    // Direkt återkoppling (<100ms): ljud + studs-in.
    ctx.services.audio.sfx('pop')
    view.scale.set(0.2)
    gsap.to(view.scale, { x: 1, y: 1, duration: 0.28, ease: 'back.out(2)' })

    // Glatt rop ibland (strypt så rösten inte hackar vid snabba tryck).
    const now = performance.now()
    if (now - this._lastVoice > VOICE_THROTTLE) {
      this._lastVoice = now
      ctx.services.voice.say(randomFrom(DROP_CHEERS))
    }

    // Tak: tona bort det äldsta myntet.
    if (this._balls.length > MAX_BALLS) {
      const old = this._balls.shift()
      this._fade(old)
    }
  },

  _onSettle(ctx, ball) {
    if (!this._alive) return
    const p = ball.body.position
    sparkle(this._root, p.x, p.y, { count: 8 })
    ctx.services.audio.sfx(randomFrom(['pling', 'correct']))
    this._settled++
    if (this._settled % SETTLES_PER_CELEBRATION === 0) {
      ctx.progress.complete()
    }
  },

  _onCollision(ctx, e) {
    if (!this._alive) return
    const now = performance.now()
    if (now - this._lastHit < 70) return // strypa ljud-spam
    for (const pair of e.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB
      const hitsPeg = a.label === 'peg' || b.label === 'peg'
      if (!hitsPeg) continue
      const ballBody = a.label === 'peg' ? b : a
      if (ballBody.speed > 1.6) {
        this._lastHit = now
        ctx.services.audio.sfx('tap')
        break
      }
    }
  },

  // Exit-säker uttoning: tweena en proxy och rör myntet bara om det lever.
  _fade(ball) {
    if (!ball) return
    this._phys.removeBody(ball.body)
    const v = ball.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    const st = { s: v.scale.x || 1, a: 1 }
    const tw = gsap.to(st, {
      s: 0,
      a: 0,
      duration: 0.3,
      ease: 'back.in(2)',
      onUpdate: () => {
        if (v.destroyed) {
          tw.kill()
          return
        }
        v.scale.set(st.s)
        v.alpha = st.a
      },
      onComplete: () => {
        if (!v.destroyed) v.destroy()
      },
    })
  },

  // --- statisk scen (allt dekorativt = eventMode 'none') ---

  _buildBoard(ctx) {
    const board = new Graphics()
      .roundRect(72, 140, ctx.width - 144, 410, 28)
      .fill({ color: COLORS.cream, alpha: 0.7 })
      .stroke({ width: 4, color: COLORS.inkSoft, alpha: 0.2 })
    board.eventMode = 'none'
    this._root.addChild(board)

    // Mjuk markering av toppbandet (där man trycker).
    const band = new Graphics().roundRect(72, 16, ctx.width - 144, 96, 24).fill({ color: COLORS.yellow, alpha: 0.18 })
    band.eventMode = 'none'
    this._root.addChild(band)
  },

  _buildPegs(ctx) {
    const rows = 7
    const top = 196
    const rowGap = 52
    const colGap = 112
    const marginX = 150
    const layer = new Container()
    layer.eventMode = 'none'
    layer.interactiveChildren = false

    for (let row = 0; row < rows; row++) {
      const y = top + row * rowGap
      const offset = row % 2 ? colGap / 2 : 0
      for (let x = marginX + offset; x <= ctx.width - marginX; x += colGap) {
        // Statisk pinne i fysiken (länkas ej — rör sig aldrig).
        this._phys.circle(x, y, 10, { isStatic: true, restitution: 0.5, friction: 0.1, label: 'peg' })
        const peg = new Graphics()
          .circle(0, 0, 10)
          .fill(COLORS.white)
          .stroke({ width: 3, color: COLORS.inkSoft, alpha: 0.35 })
        const dot = new Graphics().circle(-3, -3, 3).fill({ color: COLORS.white, alpha: 0.9 })
        dot.eventMode = 'none'
        peg.addChild(dot)
        peg.x = x
        peg.y = y
        layer.addChild(peg)
      }
    }
    this._root.addChild(layer)
  },

  _buildBins(ctx) {
    const count = 5
    const binW = ctx.width / count
    const top = 560
    const floorY = DESIGN_H
    const h = floorY - top

    const layer = new Container()
    layer.eventMode = 'none'
    layer.interactiveChildren = false

    for (let i = 0; i < count; i++) {
      const x0 = i * binW
      const fill = new Graphics()
        .roundRect(x0 + 8, top, binW - 16, h, 16)
        .fill({ color: BIN_COLORS[i], alpha: 0.85 })
      layer.addChild(fill)
    }

    // Fyra inre avdelare (vänster/höger vägg är yttre kanter).
    for (let i = 1; i < count; i++) {
      const x = i * binW
      this._phys.rectangle(x, top + h / 2, 14, h, { isStatic: true, restitution: 0.3, friction: 0.2, label: 'divider' })
      const post = new Graphics()
        .roundRect(x - 7, top - 6, 14, h + 6, 7)
        .fill(COLORS.brown)
        .stroke({ width: 3, color: COLORS.ink, alpha: 0.3 })
      layer.addChild(post)
    }

    this._root.addChild(layer)
  },

  _buildIndicator(ctx) {
    const ind = new Container()
    ind.eventMode = 'none'
    // Litet glansigt mynt + pil neråt.
    const coin = new Graphics()
      .circle(0, 0, 22)
      .fill(COLORS.yellow)
      .stroke({ width: 4, color: COLORS.orangeDark, alpha: 0.6 })
    const gloss = new Graphics().circle(-7, -7, 7).fill({ color: COLORS.white, alpha: 0.7 })
    const arrow = new Graphics().poly([-14, 30, 14, 30, 0, 50]).fill({ color: COLORS.orange, alpha: 0.9 })
    ind.addChild(coin, gloss, arrow)
    ind.x = ctx.width / 2
    ind.y = 50
    this._root.addChild(ind)
    this._indicator = ind

    // Lugn puls (dödas i destroy).
    gsap.to(ind.scale, { x: 1.14, y: 1.14, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 })
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._unbind?.()

    if (this._indicator && !this._indicator.destroyed) gsap.killTweensOf(this._indicator.scale)
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

// Glansigt mynt/boll: huvudfärg + ljus highlight + mjuk kant (programmatisk "3D").
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
