// Plantera Frön — lugn dra + tryck-lek (2–4 år). Tre steg utan press:
//   1. Så:    dra (eller tap-tap) frön ner i jordhålen → de snäpper ner, jordhög.
//   2. Vattna: när allt är sått dyker vattenkannan upp → tryck för att vattna.
//   3. Växa:   varje frö gror i tydliga steg (groddar → knopp → blomma) och när
//              allt blommat fladdrar fjärilar in → firande + klistermärke, ny runda.
// Inga felsteg, ingen timer, ingen poäng. Allt ritas programmatiskt (Pixi + emoji).
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { Button } from '../../lib/Button.js'
import { bounceIn, pop, wiggle, puff, sparkle } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, FONT } from '../../lib/theme.js'

const SKY = 0xbfe6ff
const HOLE_Y = 560 // jordhålens y (i jordrabatten)
const SEED_Y = 210 // fröförrådets y (uppe i himlen)
const FLOWERS = ['🌸', '🌺', '🌻', '🌷', '🌼', '🌹']
const BUD_COLORS = [0x6fbf73, 0x88c98a, 0x7bc043]

// Mörkare variant av en färg (jordkant, konturer).
function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}

export default {
  id: 'plantera-fron',
  titleSv: 'Plantera Frön',
  icon: '🌱',
  category: 'drag',
  input: 'drag',
  ageRange: [2, 4],
  bundle: 'plantera-fron',
  voiceIntro: 'Dra fröna ner i jorden!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._watering = false
    this._saidPlopp = false
    this._saidWater = false
    this._tweened = [] // per-runda-objekt vars tweens måste dödas vid städ/exit
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._buildDecor(ctx)

    this._round = new Container() // all per-runda-grafik (frön/hål/plantor/kanna)
    this._root.addChild(this._round)

    this._drag = new DragController({ space: this._round, services: ctx.services })

    this._newRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Bakgrund: himmel + jordrabatt + sol/moln. Allt dekorativt (fångar ingen tap).
  _buildDecor(ctx) {
    const decor = new Container()
    decor.eventMode = 'none'
    decor.interactiveChildren = false

    decor.addChild(new Graphics().rect(0, 0, ctx.width, 460).fill(SKY))
    decor.addChild(new Graphics().roundRect(-20, 440, ctx.width + 40, 300, 36).fill(COLORS.brown))
    decor.addChild(new Graphics().roundRect(-20, 432, ctx.width + 40, 46, 24).fill(shade(COLORS.brown, 0.18)))

    const sun = new Text({ text: '☀️', style: { fontFamily: FONT.body, fontSize: 96 } })
    sun.anchor.set(0.5)
    sun.position.set(1080, 132) // medvetet undan hörn-knapparna
    decor.addChild(sun)

    const clouds = new Graphics()
    for (const [cx, cy, s] of [[330, 120, 1], [640, 90, 0.8], [880, 150, 0.7]]) {
      clouds.roundRect(cx - 70 * s, cy - 26 * s, 140 * s, 52 * s, 26 * s).fill({ color: COLORS.white, alpha: 0.9 })
    }
    decor.addChild(clouds)

    this._root.addChild(decor)
  },

  // Ny runda: töm förra rundan, bygg hål + frön, dölj kannan. Oändlig lek.
  _newRound(ctx) {
    if (!this._alive) return
    this._clearRound()
    this._phase = 'sow'
    this._cuePhrase = this.voiceIntro
    this._watering = false
    this._sown = 0
    this._bloomed = 0
    this._idle = 0
    this._holeCount = Math.min(3, 1 + Math.floor(this._level / 2)) // 1–3 hål, mjuk trappa

    // Mjuk "frökorg"-panel bakom fröraden (dekor).
    const panW = this._holeCount * 120 + 60
    const basket = new Graphics().roundRect(640 - panW / 2, SEED_Y - 64, panW, 128, 30).fill({ color: COLORS.white, alpha: 0.35 })
    basket.eventMode = 'none'
    this._round.addChild(basket)

    // Jordhål (mål): jämnt fördelade kring x=640 med 230px mellanrum.
    this._holes = []
    const hStart = 640 - ((this._holeCount - 1) * 230) / 2
    for (let i = 0; i < this._holeCount; i++) {
      const hx = hStart + i * 230
      const hole = this._makeHole()
      hole.position.set(hx, HOLE_Y)
      hole._filled = false
      this._round.addChild(hole)
      this._holes.push({ view: hole, x: hx, y: HOLE_Y })
      this._drag.addTarget(hole, () => !hole._filled, { hitRadius: 160 })
    }

    // Vattenkanna (skapas dold, visas när allt är sått).
    this._can = this._makeCan(ctx)
    this._can.position.set(640, 665)
    this._can.visible = false
    this._can.setEnabled(false)
    this._round.addChild(this._can)

    // Frön (källa): lika många som hålen, alltid lösbart.
    const sStart = 640 - ((this._holeCount - 1) * 120) / 2
    for (let i = 0; i < this._holeCount; i++) {
      const seed = this._makeSeed()
      seed.position.set(sStart + i * 120, SEED_Y)
      this._round.addChild(seed)
      bounceIn(seed, { delay: i * 0.08 })
      this._drag.addItem(
        seed,
        { idx: i },
        { onCorrect: (rec, target) => this._onSow(ctx, rec, target), onWrong: (rec) => this._onMiss(ctx, rec) }
      )
    }
  },

  // Töm förra rundans noder + döda alla per-runda-tweens (exit/round-säkert).
  _clearRound() {
    this._drag.clear()
    this._canBob?.kill()
    this._growTL?.kill()
    for (const o of this._tweened) {
      if (o && !o.destroyed) {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
      }
    }
    this._tweened = []
    this._can = null
    this._round.removeChildren().forEach((o) => o.destroy({ children: true }))
  },

  _track(obj) {
    this._tweened.push(obj)
    return obj
  },

  _makeSeed() {
    const c = new Container()
    const bg = new Graphics().circle(0, 0, 46).fill({ color: 0xffffff, alpha: 0.9 }).stroke({ width: 4, color: 0xeadfca })
    const e = new Text({ text: '🌰', style: { fontFamily: FONT.body, fontSize: 70 } })
    e.anchor.set(0.5)
    c.addChild(bg, e)
    c.hitArea = new Circle(0, 0, 70) // hit-halo ≥96px Ø
    return c
  },

  _makeHole() {
    const c = new Container()
    c.addChild(new Graphics().ellipse(0, 0, 75, 30).fill(0x3a2616).stroke({ width: 4, color: shade(COLORS.brown, 0.35) }))
    c.hitArea = new Circle(0, 0, 90) // generös träffyta för tap-tap
    return c
  },

  _makeCan(ctx) {
    return new Button({
      icon: '🪣',
      label: 'Vattna',
      width: 260,
      height: 110,
      color: COLORS.blue,
      services: ctx.services,
      sound: 'whoosh',
      onTap: () => this._water(ctx),
    })
  },

  // Frö ner i hål: plopp, jordhög, puff, göm fröet. Allt är "rätt".
  _onSow(ctx, rec, target) {
    if (!this._alive) return
    const hole = target.view
    hole._filled = true
    this._idle = 0
    ctx.services.audio.sfx('pop')
    if (!this._saidPlopp) {
      this._saidPlopp = true
      ctx.services.voice.say('Plopp!')
    }

    const mound = new Graphics()
      .ellipse(0, 0, 60, 26)
      .fill(shade(COLORS.brown, 0.15))
      .stroke({ width: 3, color: shade(COLORS.brown, 0.32) })
    mound.eventMode = 'none'
    mound.position.set(hole.x, hole.y - 6)
    this._round.addChild(mound)
    this._track(mound)
    pop(mound)
    puff(ctx.fxLayer, hole.x, hole.y, { count: 6, color: COLORS.brown })

    gsap.to(rec.view, {
      alpha: 0,
      duration: 0.2,
      onComplete: () => {
        if (!rec.view.destroyed) rec.view.destroy({ children: true })
      },
    })

    this._sown++
    if (this._sown >= this._holeCount) this._revealCan(ctx)
  },

  // Miss (sikta bredvid alla hål): lekfull vingel. DragControllern spelar 'soft'.
  _onMiss(ctx, rec) {
    if (!this._alive) return
    this._idle = 0
    wiggle(rec.view)
  },

  // Allt sått → visa kannan och locka till tryck.
  _revealCan(ctx) {
    if (!this._alive || !this._can) return
    this._phase = 'water'
    this._cuePhrase = 'Tryck på vattenkannan!'
    this._idle = 0
    this._can.visible = true
    this._can.setEnabled(true)
    bounceIn(this._can)
    this._track(this._can)
    this._canBob = gsap.to(this._can, { y: '-=12', duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    ctx.services.voice.say('Tryck på vattenkannan!')
  },

  // Tryck på kannan: vattna och starta växt-sekvensen (en gång per runda).
  _water(ctx) {
    if (!this._alive || this._watering || this._sown < this._holeCount) return
    this._watering = true
    this._phase = 'grow'
    this._idle = 0
    this._can.setEnabled(false) // dubbeltrycksskydd
    this._canBob?.kill()
    this._can.y = 665

    // Luta kannan + blå droppar över varje hål.
    gsap.killTweensOf(this._can)
    gsap.timeline().to(this._can, { rotation: -0.28, duration: 0.2, ease: 'power2.out' }).to(this._can, { rotation: 0, duration: 0.4, ease: 'power2.inOut' })
    for (const h of this._holes) puff(ctx.fxLayer, h.x, h.y - 24, { count: 6, color: COLORS.blue })
    if (!this._saidWater) {
      this._saidWater = true
      ctx.services.voice.say('Vattna blommorna!')
    }

    // Varje frö gror, lätt staggrat.
    this._bloomed = 0
    this._growTL = gsap.timeline()
    this._holes.forEach((h, i) => {
      const plant = this._makePlant(h)
      this._growTL.add(this._growPlant(ctx, plant), 0.25 + i * 0.5)
    })
  },

  // Bygg en planta (kollapsad) ovanpå ett hål: stjälk + knopp + blomma.
  _makePlant(h) {
    const node = new Container()
    node.position.set(h.x, h.y - 8)
    node.eventMode = 'none'
    const dark = shade(COLORS.green, 0.22)

    const stem = new Graphics().roundRect(-7, -150, 14, 152, 7).fill(COLORS.green).stroke({ width: 3, color: dark })
    stem.scale.set(1, 0) // växer uppåt (skala y 0→1)

    const bud = new Graphics().circle(0, 0, 20).fill(randomFrom(BUD_COLORS)).stroke({ width: 3, color: dark })
    bud.position.set(0, -150)
    bud.scale.set(0)

    const flower = new Text({ text: randomFrom(FLOWERS), style: { fontFamily: FONT.body, fontSize: 92, align: 'center' } })
    flower.anchor.set(0.5)
    flower.position.set(0, -150)
    flower.scale.set(0)

    node.addChild(stem, bud, flower)
    this._round.addChild(node)
    this._track(stem)
    this._track(bud)
    this._track(flower)
    return { node, stem, bud, flower, flowerY: h.y - 8 - 150 }
  },

  // Växt-sekvens för en planta: gro (stjälk) → knopp → blomma (pling + gnistor).
  _growPlant(ctx, plant) {
    const { stem, bud, flower, node, flowerY } = plant
    const tl = gsap.timeline()
    tl.to(stem.scale, { y: 1, duration: 0.5, ease: 'back.out(1.3)' })
    tl.to(bud.scale, { x: 1, y: 1, duration: 0.28, ease: 'back.out(2)' }, '>-0.05')
    tl.add(() => {
      if (!this._alive) return
      ctx.services.audio.sfx('pling')
      sparkle(ctx.fxLayer, node.x, flowerY)
    })
    tl.to(bud.scale, { x: 0, y: 0, duration: 0.18, ease: 'power2.in' })
    tl.to(flower.scale, { x: 1, y: 1, duration: 0.42, ease: 'back.out(2)' }, '<')
    tl.add(() => {
      if (this._alive) this._onBloom(ctx)
    })
    return tl
  },

  _onBloom(ctx) {
    this._bloomed++
    if (this._bloomed >= this._holeCount) this._finishRound(ctx)
  },

  // Alla blommor ute: fjärilar + delat firande + klistermärke, sedan ny runda.
  _finishRound(ctx) {
    if (!this._alive) return
    this._flyButterflies(ctx, 2 + ((Math.random() * 3) | 0))
    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('flowers', (ctx.progress.get().custom?.flowers || 0) + this._holeCount)
    ctx.progress.complete() // celebrate-ljud + beröm + konfetti + stjärna + klistermärke
    this._newRoundCall = gsap.delayedCall(1.3, () => {
      if (!this._alive) return
      this._level++
      this._newRound(ctx)
    })
  },

  // Fjärilar som fladdrar in i fxLayer (exit-säkert: proxy + kopiera bara om levande).
  _flyButterflies(ctx, n) {
    for (let i = 0; i < n; i++) {
      const b = new Text({ text: '🦋', style: { fontFamily: FONT.body, fontSize: 64 } })
      b.anchor.set(0.5)
      b.eventMode = 'none'
      const startX = 180 + Math.random() * 220
      const baseY = 300 + Math.random() * 150
      const endX = startX + 480 + Math.random() * 320
      const amp = 38 + Math.random() * 34
      b.position.set(startX, baseY)
      ctx.fxLayer.addChild(b)
      const st = { p: 0 }
      const tw = gsap.to(st, {
        p: 1,
        duration: 2.6 + Math.random() * 0.8,
        delay: i * 0.12,
        ease: 'none',
        onUpdate: () => {
          if (b.destroyed) {
            tw.kill()
            return
          }
          b.x = startX + (endX - startX) * st.p
          b.y = baseY + Math.sin(st.p * Math.PI * 4) * amp
          b.alpha = st.p > 0.8 ? (1 - st.p) / 0.2 : 1
        },
        onComplete: () => {
          if (!b.destroyed) b.destroy()
        },
      })
    }
  },

  // Idle-recue: efter ~6s tystnad upprepas fasens instruktion + en mjuk vink.
  _update(ctx, ticker) {
    if (!this._alive || this._watering) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(this._cuePhrase)
      if (this._phase === 'water' && this._can) {
        pop(this._can)
      } else {
        const live = this._drag.items.find((r) => !r.placed && !r.view.destroyed)
        if (live) wiggle(live.view)
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._newRoundCall?.kill()
    this._canBob?.kill()
    this._growTL?.kill()
    this._drag?.destroy()
    for (const o of this._tweened) {
      if (o && !o.destroyed) {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
      }
    }
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
