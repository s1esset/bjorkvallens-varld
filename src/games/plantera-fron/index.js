// Plantera Frön — lugn dra + vattna-lek (2–4 år). Tre steg utan press:
//   1. Så:    dra (eller tap-tap) frön ner i jordhålen → de snäpper ner, jordhög.
//   2. Vattna: när allt är sått dyker vattenkannan upp. Barnet DRAR kannan över en
//              planta och håller kvar → kannan lutar, vattendroppar rinner och plantan
//              VÄXER över tid (grodd → stjälk → blad → knopp → blomma).
//   3. Klart: när alla plantor blommat fladdrar fjärilar in → firande + klistermärke,
//              ny runda. Inga felsteg: vattnet växer alltid, och om barnet pausar
//              vattnar en mjuk auto-hjälp lite så det alltid blir klart.
// Inga felsteg, ingen timer, ingen poäng. Allt ritas programmatiskt (Pixi + emoji).
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { bounceIn, pop, wiggle, puff, sparkle } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, FONT } from '../../lib/theme.js'

const SKY = 0xbfe6ff
const HOLE_Y = 560 // jordhålens y (i jordrabatten)
const SEED_Y = 210 // fröförrådets y (uppe i himlen)
const FLOWERS = ['🌸', '🌺', '🌻', '🌷', '🌼', '🌹']
const BUD_COLORS = [0x6fbf73, 0x88c98a, 0x7bc043]
const DROP_BLUE = 0x6fc3ef
const STEM_H = 150 // full stjälkhöjd
const POUR_MS = 2600 // ms sammanhängande vattning för att blomma en planta
const SPROUT0 = 0.06 // liten startgrodd så det syns något att vattna
const CAN_HOME_X = 640
const CAN_HOME_Y = 150
const SPOUT_LOCAL = { x: -104, y: -12 } // pip-spetsen i kannans lokala koordinater

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (t) => t * t * (3 - 2 * t) // mjuk 0→1

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
    this._pouring = false
    this._resolving = false
    this._saidPlopp = false
    this._saidWater = false
    this._drops = [] // aktiva vattendroppar (ticker-drivna)
    this._plants = [] // per-runda-plantor
    this._tweened = [] // per-runda-objekt vars tweens måste dödas vid städ/exit
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._buildDecor(ctx)

    this._round = new Container() // all per-runda-grafik (frön/hål/plantor/kanna/droppar)
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

  // Ny runda: töm förra rundan, bygg hål + frön. Kannan skapas först vid vattenfasen.
  _newRound(ctx) {
    if (!this._alive) return
    this._clearRound()
    this._phase = 'sow'
    this._cuePhrase = this.voiceIntro
    this._pouring = false
    this._resolving = false
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
    this._canBob = null
    for (const o of this._tweened) {
      if (o && !o.destroyed) {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
      }
    }
    this._tweened = []
    this._drops = [] // droppar ligger i _round och förstörs nedan; nolla referenserna
    this._plants = []
    this._can = null
    this._dropLayer = null
    this._pouring = false
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
    if (this._sown >= this._holeCount) this._startWatering(ctx)
  },

  // Miss (sikta bredvid alla hål): lekfull vingel. DragControllern spelar 'soft'.
  _onMiss(ctx, rec) {
    if (!this._alive) return
    this._idle = 0
    wiggle(rec.view)
  },

  // Allt sått → bygg kollapsade plantor + vattenkanna att dra och vattna med.
  _startWatering(ctx) {
    if (!this._alive) return
    this._phase = 'water'
    this._cuePhrase = 'Dra vattenkannan över blommorna!'
    this._idle = 0
    this._bloomed = 0

    // Plantor (kollapsade, liten startgrodd).
    this._plants = this._holes.map((h) => this._makePlant(h))
    for (const p of this._plants) {
      p.grow = SPROUT0
      this._renderPlant(p)
    }

    // Droppar-lager (ticker-drivna partiklar). Eget lager så de inte fångar tap.
    this._dropLayer = new Container()
    this._dropLayer.eventMode = 'none'
    this._dropLayer.interactiveChildren = false
    this._round.addChild(this._dropLayer)

    // Vattenkanna (dragbar). Skapas ovanför plantorna och studsar mjukt för att locka.
    this._can = this._makeCan(ctx)
    this._can.position.set(CAN_HOME_X, CAN_HOME_Y)
    this._round.addChild(this._can)
    // Håll dropparna överst (ovanför kannan) så vattnet syns rinna ur pipen.
    this._round.setChildIndex(this._dropLayer, this._round.children.length - 1)

    bounceIn(this._can)
    this._track(this._can)
    this._canBob = gsap.to(this._can, { y: '-=12', duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    ctx.services.voice.say(this._cuePhrase)
  },

  // Bygg en planta (kollapsad) ovanpå ett hål: stjälk + blad + knopp + blomma.
  // Växer kontinuerligt via _renderPlant(grow 0→1).
  _makePlant(h) {
    const node = new Container()
    node.position.set(h.x, h.y - 8)
    node.eventMode = 'none'
    const dark = shade(COLORS.green, 0.22)

    const stem = new Graphics().roundRect(-7, -STEM_H, 14, STEM_H + 2, 7).fill(COLORS.green).stroke({ width: 3, color: dark })
    stem.scale.set(1, 0) // växer uppåt (skala y 0→1)

    const leftLeaf = new Graphics().ellipse(0, 0, 26, 12).fill(COLORS.green).stroke({ width: 3, color: dark })
    leftLeaf.rotation = -0.5
    leftLeaf.scale.set(0)
    const rightLeaf = new Graphics().ellipse(0, 0, 26, 12).fill(COLORS.green).stroke({ width: 3, color: dark })
    rightLeaf.rotation = 0.5
    rightLeaf.scale.set(0)

    const bud = new Graphics().circle(0, 0, 20).fill(randomFrom(BUD_COLORS)).stroke({ width: 3, color: dark })
    bud.scale.set(0)

    const flower = new Text({ text: randomFrom(FLOWERS), style: { fontFamily: FONT.body, fontSize: 92, align: 'center' } })
    flower.anchor.set(0.5)
    flower.scale.set(0)

    node.addChild(stem, leftLeaf, rightLeaf, bud, flower)
    this._round.addChild(node)
    this._track(stem)
    this._track(leftLeaf)
    this._track(rightLeaf)
    this._track(bud)
    this._track(flower)
    return { node, stem, leftLeaf, rightLeaf, bud, flower, hy: h.y, x: h.x, flowerY: h.y - 8 - STEM_H, grow: 0, done: false }
  },

  // Rita plantan utifrån dess grow-värde (0→1). Kontinuerligt: stjälk → blad → knopp → blomma.
  _renderPlant(p) {
    const g = p.grow
    const stemFrac = clamp01(g / 0.55)
    const leafFrac = clamp01((g - 0.28) / 0.34)
    const budFrac = clamp01((g - 0.5) / 0.26)
    const flowerFrac = clamp01((g - 0.78) / 0.22)
    const topY = -STEM_H * stemFrac

    p.stem.scale.y = stemFrac

    const midY = topY * 0.55
    p.leftLeaf.y = midY
    p.leftLeaf.x = -4
    p.leftLeaf.scale.set(leafFrac)
    p.rightLeaf.y = midY
    p.rightLeaf.x = 4
    p.rightLeaf.scale.set(leafFrac)

    p.bud.y = topY
    p.bud.alpha = 1 - flowerFrac
    p.bud.scale.set(budFrac * (1 - flowerFrac))

    p.flower.y = topY
    const fs = smooth(flowerFrac)
    p.flower.scale.set(fs)

    p.flowerY = p.node.y + topY // för gnistror i toppen
  },

  // Vattenkanna ritad programmatiskt (pip + kropp + handtag + stril). Dragbar.
  _makeCan(ctx) {
    const can = new Container()
    const blue = COLORS.blue
    const dark = shade(blue, 0.26)
    const g = new Graphics()

    // pip (rör) ut åt vänster-ned + stril i änden
    g.poly([-40, -8, -98, -28, -108, -12, -50, 20]).fill(blue).stroke({ width: 5, color: dark })
    g.circle(-104, -19, 13).fill(dark)
    // kropp
    g.roundRect(-46, -34, 92, 74, 22).fill(blue).stroke({ width: 5, color: dark })
    // övre kant (öppning)
    g.ellipse(0, -34, 44, 13).fill(shade(blue, 0.08)).stroke({ width: 5, color: dark })
    // glansremsa
    g.roundRect(-34, -20, 22, 42, 11).fill({ color: COLORS.white, alpha: 0.22 })
    can.addChild(g)
    // handtag (båge över toppen)
    const handle = new Graphics()
    handle.moveTo(-26, -30)
    handle.quadraticCurveTo(0, -82, 30, -28)
    handle.stroke({ width: 11, color: dark })
    can.addChild(handle)

    can.hitArea = new Circle(0, 0, 80) // träffyta Ø160 (≥96px)
    can.eventMode = 'static'
    can.cursor = 'pointer'
    can._spout = SPOUT_LOCAL
    can.on('pointerdown', (e) => this._canDown(ctx, e))
    return can
  },

  // Greppa kannan → börja vattna (luta + droppar). Draget följer fingret.
  _canDown(ctx, e) {
    if (!this._alive || this._phase !== 'water' || this._resolving) return
    if (!this._can || this._can.destroyed) return
    this._pouring = true
    this._idle = 0
    this._pourAccum = 0
    this._canBob?.kill()
    this._canBob = null

    const p = this._round.toLocal(e.global)
    this._can._grabDX = this._can.x - p.x
    this._can._grabDY = this._can.y - p.y
    gsap.killTweensOf(this._can)
    gsap.to(this._can, { rotation: -0.32, duration: 0.18, ease: 'power2.out' })
    ctx.services.audio.sfx('whoosh')
    if (!this._saidWater) {
      this._saidWater = true
      ctx.services.voice.say('Vattna blommorna!')
    }

    this._can._move = (ev) => this._canMove(ev)
    this._can._up = () => this._canUp()
    this._can.on('globalpointermove', this._can._move)
    this._can.on('pointerup', this._can._up)
    this._can.on('pointerupoutside', this._can._up)
  },

  _canMove(e) {
    if (!this._alive || !this._pouring || !this._can || this._can.destroyed) return
    const p = this._round.toLocal(e.global)
    const x = Math.max(150, Math.min(1130, p.x + this._can._grabDX))
    const y = Math.max(120, Math.min(470, p.y + this._can._grabDY)) // håll pipen ovanför jorden
    this._can.x = x
    this._can.y = y
  },

  _canUp() {
    this._pouring = false
    const can = this._can
    if (!can || can.destroyed) return
    if (can._move) can.off('globalpointermove', can._move)
    if (can._up) {
      can.off('pointerup', can._up)
      can.off('pointerupoutside', can._up)
    }
    can._move = can._up = null
    gsap.to(can, { rotation: 0, duration: 0.3, ease: 'power2.inOut' })
  },

  // Pågående vattning (varje tick medan kannan hålls): droppar + väx plantan under pipen.
  _pourTick(ctx, dt) {
    if (!this._can || this._can.destroyed || !this._dropLayer) return
    const sp = this._round.toLocal(this._can.toGlobal(this._can._spout))

    // Spreja droppar i en jämn takt (ticker-drivet, oberoende av FPS).
    this._pourAccum += dt
    while (this._pourAccum >= 45) {
      this._pourAccum -= 45
      this._spawnDrop(sp.x, sp.y)
    }

    // Närmaste ovattnade planta vars hål ligger nedanför pipen.
    let best = null
    let bd = 150
    for (const p of this._plants) {
      if (p.done) continue
      const dx = Math.abs(p.x - sp.x)
      if (p.hy > sp.y && dx < bd) {
        bd = dx
        best = p
      }
    }
    if (best) {
      best.grow = Math.min(1, best.grow + dt / POUR_MS)
      this._renderPlant(best)
      if (best.grow >= 1) this._bloom(ctx, best)
    }
  },

  // En vattendroppe (ticker-driven, exit-säker): ingen gsap, ren positions-integration.
  _spawnDrop(x, y) {
    if (!this._dropLayer || this._dropLayer.destroyed) return
    const d = new Graphics().ellipse(0, 0, 4, 7).fill({ color: DROP_BLUE, alpha: 0.92 })
    d.position.set(x + (Math.random() * 10 - 5), y)
    d.eventMode = 'none'
    this._dropLayer.addChild(d)
    this._drops.push({
      g: d,
      vx: Math.random() * 1.2 - 0.6,
      vy: 1.5 + Math.random() * 1.5,
      gy: 562 + Math.random() * 10,
    })
  },

  // Flytta alla droppar nedåt med "gravitation"; landar de → liten plask + förstör.
  // Exit-säkert: bara levande Pixi-objekt rörs, förstörda droppar släpps tyst.
  _stepDrops(ctx, dt) {
    if (!this._drops.length) return
    const f = dt / 16.667 // normalisera mot 60 fps
    const keep = []
    for (const dr of this._drops) {
      if (dr.g.destroyed) continue
      dr.vy += 0.55 * f
      dr.g.x += dr.vx * f
      dr.g.y += dr.vy * f
      if (dr.g.y >= dr.gy) {
        if (Math.random() < 0.22) puff(ctx.fxLayer, dr.g.x, dr.gy, { count: 2, color: DROP_BLUE })
        dr.g.destroy()
      } else {
        keep.push(dr)
      }
    }
    this._drops = keep
  },

  // En planta är fullvuxen → blomma: pling, gnistror, liten studs. Räkna mot firande.
  _bloom(ctx, p) {
    if (p.done) return
    p.done = true
    p.grow = 1
    this._renderPlant(p)
    ctx.services.audio.sfx('pling')
    sparkle(ctx.fxLayer, p.node.x, p.flowerY)
    pop(p.flower)
    this._bloomed++
    if (this._bloomed >= this._holeCount) this._finishRound(ctx)
  },

  // Alla blommor ute: fjärilar + delat firande + klistermärke, sedan ny runda.
  // _resolving säkrar att complete() bara körs EN gång per runda.
  _finishRound(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._phase = 'done'
    this._pouring = false
    this._canBob?.kill()
    this._canBob = null

    this._flyButterflies(ctx, 2 + ((Math.random() * 3) | 0))
    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('flowers', (ctx.progress.get().custom?.flowers || 0) + this._holeCount)
    ctx.progress.complete() // celebrate-ljud + beröm + konfetti + stjärna + klistermärke
    this._newRoundCall = gsap.delayedCall(1.4, () => {
      if (!this._alive) return
      this._level++
      this._newRound(ctx)
    })
  },

  // Mjuk auto-hjälp: om barnet pausar vattnar vi minst vuxna plantan en skvätt så
  // det ALLTID blir klart. Aldrig ett felsteg — bara en hjälpande hand.
  _autoHelp(ctx) {
    if (!this._alive || this._phase !== 'water' || this._resolving || this._pouring) return
    ctx.services.voice.say(this._cuePhrase)
    let best = null
    for (const p of this._plants) {
      if (p.done) continue
      if (!best || p.grow < best.grow) best = p
    }
    if (!best) return

    // Vinka kannan mot plantan och luta den lite (rent visuellt).
    if (this._can && !this._can.destroyed) {
      this._canBob?.kill()
      this._canBob = null
      gsap.killTweensOf(this._can)
      gsap.to(this._can, { x: best.x, y: 380, duration: 0.5, ease: 'power2.inOut' })
      gsap.to(this._can, { rotation: -0.28, duration: 0.3, yoyo: true, repeat: 1, ease: 'sine.inOut' })
    }
    for (let i = 0; i < 6; i++) this._spawnDrop(best.x + (Math.random() * 30 - 15), 400)
    ctx.services.audio.sfx('whoosh')
    best.grow = Math.min(1, best.grow + 0.22)
    this._renderPlant(best)
    if (best.grow >= 1) this._bloom(ctx, best)
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

  // Per-frame: flytta droppar; vattna medan kannan hålls; annars räkna idle → auto-hjälp/recue.
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS
    this._stepDrops(ctx, dt)

    if (this._phase === 'water') {
      if (this._pouring) {
        this._idle = 0
        this._pourTick(ctx, dt)
      } else {
        this._idle += dt / 1000
        if (this._idle > 6) {
          this._idle = 0
          this._autoHelp(ctx)
        }
      }
    } else if (this._phase === 'sow') {
      this._idle += dt / 1000
      if (this._idle > 6) {
        this._idle = 0
        ctx.services.voice.say(this._cuePhrase)
        const live = this._drag.items.find((r) => !r.placed && !r.view.destroyed)
        if (live) wiggle(live.view)
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    this._pouring = false
    ctx.ticker.remove(this._tick)
    this._newRoundCall?.kill()
    this._canBob?.kill()
    this._drag?.destroy()
    for (const o of this._tweened) {
      if (o && !o.destroyed) {
        gsap.killTweensOf(o)
        gsap.killTweensOf(o.scale)
      }
    }
    this._drops = []
    this._plants = []
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
