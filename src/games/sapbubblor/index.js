// Såpbubblor — lugn orsak-verkan (2–5 år). Skimrande, genomskinliga
// såpbubblor svävar långsamt UPPÅT med mjuk sidledes vaggling. Tryck på en
// bubbla -> den spricker med ett "pop", en liten skvätt droppar och bubblan
// växer snabbt till och tonar bort. Inga felsteg, ingen poäng, inget slut —
// nya bubblor fylls hela tiden på underifrån. Skiljer sig medvetet från
// Klämbubblor (som är en fast "kläm"-leksak): dessa flyter, glittrar och driver.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { sparkle } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'

const TARGET_BUBBLES = 8 // håll ~6–10 bubblor i luften
const POPS_PER_CELEBRATION = 12 // efter ett gäng spruckna bubblor -> firande
const SAY_THROTTLE_MS = 700 // strypa röst så den aldrig tjattrar/stammar

// Korta, glada repliker vid pop (full åäö i synlig/talad text).
const POP_PHRASES = ['Pang!', 'Plopp!', 'Pop!', 'Hihi!', 'Så fint!', 'Där!']

// Skimmer-färger till regnbågsglansen på bubbelkanten.
const SHEEN = [0xff9ec4, 0x9ad0ff, 0xa78bfa, 0x9ff0d0, 0xffe08a]

export default {
  id: 'sapbubblor',
  titleSv: 'Såpbubblor',
  icon: '🫧',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'sapbubblor',
  voiceIntro: 'Tryck på bubblorna så spricker de!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._popped = 0
    this._lastSay = 0
    this._bubbles = []

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Mjuk himmel-/vatten-ton bakom bubblorna (gör de vita kanterna synliga,
    // och ger en lugn, "flytande" känsla som skiljer sig från Klämbubblor).
    this._catcher = new Graphics()
      .rect(0, 0, ctx.width, ctx.height)
      .fill({ color: 0xdcefff, alpha: 0.55 })
    this._catcher.eventMode = 'static'
    this._catcher.on('pointertap', (ev) => {
      if (!this._alive) return
      const p = this._root.toLocal(ev.global)
      this._idle = 0
      ctx.services.audio.sfx('soft')
      sparkle(this._root, p.x, p.y, { count: 4 })
    })
    this._root.addChild(this._catcher)

    // Seed: några bubblor utspridda direkt så scenen aldrig är tom.
    for (let i = 0; i < TARGET_BUBBLES; i++) this._spawn(ctx, true)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // En skimrande, genomskinlig såpbubbla som ett eget Container.
  _makeBubble(ctx, r) {
    const b = new Container()
    const g = new Graphics()

    // Svag genomskinlig fyllning.
    g.circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.12 })
    // Ljus, tunn kant.
    g.circle(0, 0, r).stroke({ width: Math.max(2, r * 0.05), color: 0xffffff, alpha: 0.85 })

    // Regnbågsglans: 2–3 tunna färgade bågar längs kanten (irisering).
    const o = Math.random() * Math.PI * 2 // slumpa var glansen sitter per bubbla
    const arcs = [
      { rad: r * 0.88, a0: -2.5, a1: -1.7 },
      { rad: r * 0.88, a0: 0.55, a1: 1.45 },
      { rad: r * 0.72, a0: 2.2, a1: 3.0 },
    ]
    arcs.forEach((arc, i) => {
      g.arc(0, 0, arc.rad, arc.a0 + o, arc.a1 + o).stroke({
        width: Math.max(2, r * 0.06),
        color: SHEEN[(i + ((Math.random() * SHEEN.length) | 0)) % SHEEN.length],
        alpha: 0.5,
        cap: 'round',
      })
    })

    // Liten vit högdager uppe till vänster (fast ljuskälla) + en pytteglimt.
    g.circle(-r * 0.34, -r * 0.34, r * 0.2).fill({ color: 0xffffff, alpha: 0.6 })
    g.circle(-r * 0.12, -r * 0.46, r * 0.07).fill({ color: 0xffffff, alpha: 0.8 })

    b.addChild(g)
    b.eventMode = 'static'
    b.cursor = 'pointer'
    b.hitArea = new Circle(0, 0, r + 20) // osynlig hit-halo (>= designkrav)
    b._popped = false
    b.on('pointertap', () => this._pop(ctx, b))
    return b
  },

  // Skapa en bubbla. seed=true sprider dem över skärmen vid start; annars
  // kommer de in underifrån och driver uppåt.
  _spawn(ctx, seed = false) {
    if (!this._alive) return
    const r = 30 + Math.random() * 40 // ~30..70
    const b = this._makeBubble(ctx, r)
    b._r = r
    b._baseX = r + 20 + Math.random() * (ctx.width - 2 * (r + 20))
    b._wobbleAmp = 18 + Math.random() * 34 // sidledes vagglingsbredd
    b._wobbleSpeed = 0.7 + Math.random() * 1.0
    b._phase = Math.random() * Math.PI * 2
    b._driftX = (Math.random() - 0.5) * 12 // långsam horisontell drift
    b._vy = 18 + Math.random() * 26 + (70 - r) * 0.25 // mindre bubblor stiger lite snabbare
    b._popped = false

    b._baseX = Math.max(r, Math.min(ctx.width - r, b._baseX))
    b.x = b._baseX
    b.y = seed
      ? 120 + Math.random() * (ctx.height - 160)
      : ctx.height + r + 10 + Math.random() * 140

    this._root.addChild(b)
    this._bubbles.push(b)

    // Mjuk in-skalning (ingen "klämknapp"-studs — bara en lugn uppblåsning).
    b.scale.set(0.4)
    gsap.to(b.scale, { x: 1, y: 1, duration: 0.5, ease: 'sine.out' })
  },

  _pop(ctx, b) {
    if (!this._alive || b._popped || b.destroyed) return
    b._popped = true
    b.eventMode = 'none'
    this._idle = 0

    this._popped++
    const celebrate = this._popped % POPS_PER_CELEBRATION === 0

    // Ljud + bild direkt (< 100ms).
    ctx.services.audio.sfx(Math.random() < 0.2 ? 'pling' : 'pop')
    this._droplets(b.x, b.y, b._r)
    sparkle(this._root, b.x, b.y, { count: 5 })

    // Röst: kort glad replik (strypt). Hoppa över precis när firandet talar.
    if (!celebrate) {
      const now = performance.now()
      if (now - this._lastSay > SAY_THROTTLE_MS) {
        this._lastSay = now
        ctx.services.voice.say(randomFrom(POP_PHRASES))
      }
    }

    // Spricka: väx snabbt till och tona ut, förstör sedan.
    // Exit-säkert: tweena ett {}-proxy och rör Pixi-objektet endast om det lever.
    const st = { s: b.scale.x, a: 1 }
    const tw = gsap.to(st, {
      s: b.scale.x * 1.4,
      a: 0,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        if (b.destroyed) {
          tw.kill()
          return
        }
        b.scale.set(st.s)
        b.alpha = st.a
      },
      onComplete: () => {
        if (!b.destroyed) b.destroy({ children: true })
      },
    })

    if (celebrate) ctx.progress.complete() // firande + beröm + stjärna + klistermärke (delat)
  },

  // Liten skvätt såpdroppar vid pop. Exit-säker via {}-proxy (rör/förstör
  // Pixi-objektet bara om det inte redan är förstört).
  _droplets(x, y, r) {
    const n = 5 + ((Math.random() * 3) | 0)
    for (let i = 0; i < n; i++) {
      const dr = 3 + Math.random() * 4
      const p = new Graphics()
        .circle(0, 0, dr)
        .fill({ color: 0xffffff, alpha: 0.55 })
        .stroke({ width: 1, color: 0xbfe6ff, alpha: 0.85 })
      p.x = x
      p.y = y
      p.eventMode = 'none'
      this._root.addChild(p)

      const ang = Math.random() * Math.PI * 2
      const dist = r * 0.5 + Math.random() * r * 0.9
      const st = { x, y, a: 1, s: 1 }
      const tw = gsap.to(st, {
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist + 18, // en gnutta "tyngd" neråt
        a: 0,
        s: 0.3,
        duration: 0.4 + Math.random() * 0.25,
        ease: 'power2.out',
        onUpdate: () => {
          if (p.destroyed) {
            tw.kill()
            return
          }
          p.x = st.x
          p.y = st.y
          p.alpha = st.a
          p.scale.set(st.s)
        },
        onComplete: () => {
          if (!p.destroyed) p.destroy()
        },
      })
    }
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000

    // Driva bubblorna uppåt med mjuk sinus-vaggling. Skydda alltid mot
    // förstörda objekt innan vi skriver till dem.
    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      const b = this._bubbles[i]
      if (!b || b.destroyed) {
        this._bubbles.splice(i, 1)
        continue
      }
      if (b._popped) continue // pop-tweenen styr den; rör inte positionen

      b.y -= b._vy * dt
      b._phase += b._wobbleSpeed * dt
      b._baseX += b._driftX * dt
      if (b._baseX < b._r) {
        b._baseX = b._r
        b._driftX *= -1
      } else if (b._baseX > ctx.width - b._r) {
        b._baseX = ctx.width - b._r
        b._driftX *= -1
      }
      b.x = b._baseX + Math.sin(b._phase) * b._wobbleAmp

      // Drev förbi toppen -> ta bort mjukt.
      if (b.y < -b._r - 20) {
        this._bubbles.splice(i, 1)
        gsap.killTweensOf(b)
        gsap.killTweensOf(b.scale)
        if (!b.destroyed) b.destroy({ children: true })
      }
    }

    // Fyll på så det alltid finns gott om bubblor.
    while (this._alive && this._bubbles.length < TARGET_BUBBLES) this._spawn(ctx, false)

    // Mild om-uppmaning om barnet pausar en stund.
    this._idle += dt
    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      const live = this._bubbles.filter((b) => b && !b.destroyed && !b._popped)
      if (live.length) {
        const b = randomFrom(live)
        gsap.to(b.scale, { x: b.scale.x * 1.18, y: b.scale.y * 1.18, duration: 0.22, yoyo: true, repeat: 3 })
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._bubbles?.forEach((b) => {
      if (b && !b.destroyed) {
        gsap.killTweensOf(b)
        gsap.killTweensOf(b.scale)
      }
    })
    this._bubbles = []
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}
