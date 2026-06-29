// Valpens Bajs — mys-motorik (2–4 år). Lovas lilla valp tassar runt i parken och
// lämnar små bajshögar. Barnet styr VART valpen går (tap-to-walk) och skyfflar upp
// bajset i tunnan med bajstången (drag, med tap-fallback). Glada flugor surrar runt
// gammalt bajs — rent komiskt, ALDRIG straff. Inga misslyckanden: bajset ligger
// snällt kvar tills man tar det och tunnan fylls alltid till slut (mjuk auto-hjälp).
// Valpen är ett djur (undantaget namnregeln); den enda namngivna människan är Lova.
//
// Allt ritas programmatiskt (Pixi Graphics + emoji). Firande/partiklar via lib/feedback.js
// (exit-säkra) eller {}-proxy-mönstret. Flugor flyttas direkt i tickern (ingen GSAP på
// dem) → exit-säkra. All async är skyddad med this._alive / this._resolving.
import { Container, Graphics, Text, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { bounceIn, pop, wiggle, puff, sparkle, floatText, bigCelebration } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Geometri (designkoordinater 1280×720).
const WALK = { x0: 120, x1: 1080, y0: 300, y1: 650 } // valpens gångyta
const DOG_HOME = { x: 640, y: 460 }
const BIN = { x: 1140, y: 540 } // tunnans position
const DROP = { x: 1140, y: 470, r: 120 } // insläppszon (tunnans mun)
const METER_X = 1230
const METER_Y = 470
const SCOOP_HOME = { x: 200, y: 650 }
const PICK_R = 70 // skopa griper hög inom denna radie

export default {
  id: 'valpens-bajs',
  titleSv: 'Valpens Bajs',
  icon: '🐶',
  category: 'motorik',
  input: 'mixed',
  ageRange: [2, 4],
  bundle: 'valpens-bajs',
  voiceIntro: 'Tryck dit valpen ska gå — och skyffla bajset i tunnan!',

  // ---- Livscykel ----------------------------------------------------------

  init(ctx) {
    this._alive = true
    this._resolving = false
    this._scooping = false
    this._autoBusy = false
    this._walking = false
    this._carry = null
    this._poops = []
    this._loose = [] // lösa {}-proxy-tweens (deposit) att döda vid exit
    this._collected = 0
    this._needed = 3
    this._lastPoop = 0
    this._idle = 0
    this._idleHelps = 0
    this._wanderTimer = 0
    this._saidScoop = false
    this._meter = { v: 0 }
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // 1) Bakgrund (FÖRSTA barn).
    this._root.addChild(createScene('meadow', { width: 1280, height: 720 }))

    // 2) Parkdekor (rent pynt).
    this._buildDecor()

    // 3) Insläppszonens glödring (mål-markör).
    const ring = new Graphics().circle(DROP.x, DROP.y, DROP.r).stroke({ width: 6, color: COLORS.yellow, alpha: 0.5 })
    ring.eventMode = 'none'
    this._root.addChild(ring)

    // 4) Gå-yta (osynlig hitArea över hela planen, fångar tap "gå dit").
    const area = new Container()
    area.hitArea = new Rectangle(0, 90, 1280, 630)
    area.eventMode = 'static'
    this._walkH = (e) => this._onWalkTap(ctx, e)
    area.on('pointertap', this._walkH)
    this._walkArea = area
    this._root.addChild(area)

    // 5) Bajs-lager (högar + flugor).
    this._poopLayer = new Container()
    this._root.addChild(this._poopLayer)

    // 6) Hint-streck (prickad ledtråd skyffel → hög vid idle).
    this._hintGfx = new Graphics()
    this._hintGfx.eventMode = 'none'
    this._root.addChild(this._hintGfx)

    // 7) Valpen.
    this._buildDog()

    // 8) Tunnan.
    this._buildBin()

    // 9) Mätare.
    this._buildMeter()

    // 10) Skyffeln.
    this._buildScooper(ctx)

    // Svans-vift (lugn, kontinuerlig).
    this._tailTween = gsap.to(this._dogTail, {
      rotation: 0.45,
      duration: 0.42,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })

    this._resetRound()

    this._tick = (tk) => this._update(ctx, tk)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Nivå-skalning ------------------------------------------------------

  _applyLevel() {
    const L = this._level
    this._cap = L >= 4 ? 5 : L >= 2 ? 4 : 3
    this._speed = L >= 4 ? 330 : L >= 2 ? 300 : 260
    this._poopChance = L >= 2 ? 0.7 : 0.55
  },

  // ---- Scenbyggen ---------------------------------------------------------

  _buildDecor() {
    const d = new Container()
    d.eventMode = 'none'
    d.interactiveChildren = false

    // Grusgång (mjuk slinga mitt på planen).
    d.addChild(new Graphics().roundRect(290, 380, 720, 190, 96).fill({ color: 0xe9dcc0, alpha: 0.7 }))

    // Träd uppe till vänster.
    const tree = new Text({ text: '🌳', style: { fontFamily: FONT.body, fontSize: 110 } })
    tree.anchor.set(0.5)
    tree.position.set(180, 210)
    d.addChild(tree)

    // Blomsterrad längs nederkanten.
    for (let x = 80, i = 0; x <= 1200; x += 118, i++) {
      const f = new Text({ text: i % 2 ? '🌼' : '🌷', style: { fontFamily: FONT.body, fontSize: 40 } })
      f.anchor.set(0.5)
      f.position.set(x, 696)
      d.addChild(f)
    }

    this._root.addChild(d)
  },

  _buildDog() {
    const dog = new Container()
    dog.position.set(DOG_HOME.x, DOG_HOME.y)
    dog.eventMode = 'none' // gå-ytan under fångar tappet bakom valpen

    // Markskugga (direkt barn — flippas/bobbas inte).
    dog.addChild(new Graphics().ellipse(0, 46, 66, 15).fill({ color: COLORS.shadow, alpha: 0.16 }))

    const facing = new Container() // scale.x = riktning (vänd valpen)
    const bob = new Container() // vagg-bob (y) + huk (scale.y) vid bajsning
    facing.addChild(bob)
    dog.addChild(facing)

    const fur = 0xc9a06a
    const furDark = 0xa9794a

    // Svans (egen barn-container, viftar).
    const tail = new Container()
    tail.position.set(-56, -14)
    tail.addChild(new Graphics().roundRect(-5, -30, 11, 34, 6).fill(fur).stroke({ width: 2, color: furDark }))
    bob.addChild(tail)

    const g = new Graphics()
    // Ben.
    for (const lx of [-32, -10, 12, 34]) g.roundRect(lx - 7, 18, 14, 32, 6).fill(furDark)
    // Kropp.
    g.ellipse(0, 0, 60, 40).fill(fur)
    g.ellipse(-14, -12, 22, 12).fill({ color: 0xffffff, alpha: 0.22 }) // glans
    // Hängande öron (bakom huvudet).
    g.ellipse(40, -18, 12, 24).fill(furDark)
    g.ellipse(66, -18, 12, 24).fill(furDark)
    // Huvud.
    g.circle(54, -22, 30).fill(fur)
    // Nos/tryne.
    g.circle(80, -16, 8).fill(COLORS.ink)
    // Ögon.
    g.circle(50, -32, 7).fill(COLORS.white)
    g.circle(66, -30, 7).fill(COLORS.white)
    g.circle(52, -32, 4).fill(COLORS.ink)
    g.circle(67, -30, 4).fill(COLORS.ink)
    g.eventMode = 'none'
    bob.addChild(g)

    this._dog = dog
    this._dogFacing = facing
    this._dogBob = bob
    this._dogTail = tail
    this._root.addChild(dog)
  },

  _buildBin() {
    const bin = new Container()
    bin.position.set(BIN.x, BIN.y)
    bin.eventMode = 'none'
    const g = new Graphics()
    g.roundRect(-70, -90, 140, 170, 22).fill(COLORS.green).stroke({ width: 8, color: COLORS.greenDark })
    g.roundRect(-78, -98, 156, 24, 11).fill(COLORS.greenDark) // lock-streck
    g.roundRect(-12, -120, 24, 22, 8).fill(COLORS.greenDark) // handtag
    // Vertikala revben.
    for (const rx of [-36, 0, 36]) g.roundRect(rx - 3, -70, 6, 140, 3).fill({ color: COLORS.greenDark, alpha: 0.5 })
    bin.addChild(g)
    const label = new Text({ text: '♻️', style: { fontFamily: FONT.body, fontSize: 54 } })
    label.anchor.set(0.5)
    label.position.set(0, -6)
    bin.addChild(label)
    this._bin = bin
    this._root.addChild(bin)
  },

  _buildMeter() {
    const glass = new Graphics()
      .roundRect(METER_X - 22, METER_Y - 150, 44, 300, 22)
      .fill({ color: COLORS.white, alpha: 0.5 })
      .stroke({ width: 4, color: COLORS.greenDark, alpha: 0.6 })
    glass.eventMode = 'none'
    this._root.addChild(glass)

    this._meterFill = new Graphics()
    this._meterFill.eventMode = 'none'
    this._root.addChild(this._meterFill)

    this._slotLayer = new Container()
    this._slotLayer.eventMode = 'none'
    this._root.addChild(this._slotLayer)
  },

  _drawMeter() {
    const g = this._meterFill
    if (!g || g.destroyed) return
    g.clear()
    const frac = clamp(this._meter.v, 0, 1)
    const innerTop = METER_Y - 144
    const innerBot = METER_Y + 144
    const h = (innerBot - innerTop) * frac
    if (h > 3) g.roundRect(METER_X - 16, innerBot - h, 32, h, 12).fill(COLORS.yellow)
    if (h > 12) g.circle(METER_X, innerBot - h, 6).fill({ color: 0xfff0b0, alpha: 0.9 })
  },

  // Rad av slot-prickar (💩→⭐) längs röret — tydlig, läs-fri progress.
  _layoutSlots() {
    this._slotLayer.removeChildren().forEach((c) => c.destroy())
    this._slots = []
    const n = Math.min(this._needed, 12)
    const top = METER_Y - 130
    const bot = METER_Y + 130
    for (let i = 0; i < n; i++) {
      const dot = new Graphics()
        .circle(0, 0, 8)
        .fill({ color: COLORS.white, alpha: 0.6 })
        .stroke({ width: 2, color: COLORS.greenDark, alpha: 0.4 })
      dot.position.set(METER_X, bot - (i + 0.5) * ((bot - top) / n))
      dot.eventMode = 'none'
      this._slotLayer.addChild(dot)
      this._slots.push(dot)
    }
  },

  _litSlot(i) {
    const dot = this._slots && this._slots[i]
    if (!dot || dot.destroyed) return
    dot.clear().circle(0, 0, 9).fill(COLORS.orange).stroke({ width: 2, color: COLORS.orangeDark })
    pop(dot)
  },

  _buildScooper(ctx) {
    const s = new Container()
    s.position.set(SCOOP_HOME.x, SCOOP_HOME.y)
    // Origin (0,0) = skopans tip (den punkt som skyfflar = den punkt barnet drar).

    // Öppen skopa/pan med fronttippen vid origin.
    const pan = new Graphics()
    pan.moveTo(-38, 0).lineTo(38, 0).lineTo(30, 36).lineTo(-30, 36).closePath().fill(0xd2d6dd).stroke({ width: 4, color: 0x9aa0aa })
    pan.roundRect(-42, -7, 84, 11, 6).fill(0xe6e9ee) // front-lip glans
    pan.eventMode = 'none'
    s.addChild(pan)

    // Brunt handtag som lutar nedåt-höger till ett grepp.
    const handle = new Graphics().roundRect(-7, 0, 14, 92, 7).fill(COLORS.brown).stroke({ width: 3, color: COLORS.ink })
    handle.position.set(14, 30)
    handle.rotation = 0.5
    handle.eventMode = 'none'
    s.addChild(handle)
    const gx = 14 + Math.sin(0.5) * 92
    const gy = 30 + Math.cos(0.5) * 92
    s.addChild(new Graphics().circle(gx, gy, 15).fill(COLORS.brown).stroke({ width: 3, color: COLORS.ink }))

    s.eventMode = 'static'
    s.cursor = 'pointer'
    s.hitArea = new Circle(0, 0, 90) // träffyta-diameter 180px ≫ 96px

    this._scoopDownH = (e) => this._scoopDown(ctx, e)
    this._scoopMoveH = (e) => this._scoopMove(ctx, e)
    this._scoopUpH = () => this._scoopUp(ctx)
    s.on('pointerdown', this._scoopDownH)

    this._scooper = s
    this._root.addChild(s)
  },

  // ---- A) Vägval — tap-to-walk -------------------------------------------

  _onWalkTap(ctx, e) {
    if (!this._alive || this._resolving) return
    const p = this._root.toLocal(e.global)
    this._walkTo(ctx, p.x, p.y)
  },

  _walkTo(ctx, tx, ty, opts = {}) {
    if (!this._alive || this._resolving) return
    this._poke()
    ctx.services.audio.sfx('tap')
    tx = clamp(tx, WALK.x0, WALK.x1)
    ty = clamp(ty, WALK.y0, WALK.y1)
    const dir = tx < this._dog.x - 4 ? -1 : tx > this._dog.x + 4 ? 1 : this._dogFacing.scale.x || 1
    this._dogFacing.scale.x = dir
    const dist = Math.hypot(tx - this._dog.x, ty - this._dog.y)
    this._walkTween?.kill()
    if (dist < 4) {
      this._arrive(ctx, opts)
      return
    }
    this._walking = true
    this._startBob()
    this._walkTween = gsap.to(this._dog.position, {
      x: tx,
      y: ty,
      duration: Math.max(0.2, dist / this._speed),
      ease: 'sine.inOut',
      onComplete: () => this._arrive(ctx, opts),
    })
  },

  _startBob() {
    this._bobTween?.kill()
    this._dogBob.y = 0
    this._bobTween = gsap.to(this._dogBob, { y: -6, duration: 0.18, repeat: -1, yoyo: true, ease: 'sine.inOut' })
  },

  _stopBob() {
    this._bobTween?.kill()
    this._bobTween = null
    if (this._dogBob && !this._dogBob.destroyed) gsap.to(this._dogBob, { y: 0, duration: 0.12 })
  },

  _arrive(ctx, opts = {}) {
    this._walking = false
    this._stopBob()
    if (!this._alive || this._resolving) return
    const now = performance.now()
    const canPoop = this._poops.length < this._cap && now - this._lastPoop > 2500
    if (canPoop && (opts.force || Math.random() < this._poopChance)) {
      this._poop(ctx)
    } else if (this._dogTail && !this._dogTail.destroyed) {
      pop(this._dogTail) // glad svans-vift
    }
  },

  _poop(ctx) {
    if (!this._alive || this._resolving) return
    const dir = this._dogFacing.scale.x || 1
    const px = clamp(this._dog.x - dir * 40, 140, 1040)
    const py = clamp(this._dog.y + 30, 320, WALK.y1)
    this._poopTl?.kill()
    gsap.killTweensOf(this._dogBob)
    gsap.killTweensOf(this._dogBob.scale)
    const tl = gsap.timeline()
    this._poopTl = tl
    tl.to(this._dogBob.scale, { y: 0.72, duration: 0.3, ease: 'power2.out' }, 0)
    tl.to(this._dogBob, { y: 8, duration: 0.3, ease: 'power2.out' }, 0)
    tl.add(() => {
      if (!this._alive || this._resolving) return
      ctx.services.audio.sfx('soft')
      ctx.services.audio.sfx('pop') // plopp
      this._spawnPoop(ctx, px, py)
      floatText(ctx.fxLayer, this._dog.x, this._dog.y - 70, '💨')
      this._lastPoop = performance.now()
    }, 0.3)
    tl.to(this._dogBob.scale, { y: 1, duration: 0.34, ease: 'back.out(2)' }, 0.56)
    tl.to(this._dogBob, { y: 0, duration: 0.34, ease: 'power2.out' }, 0.56)
  },

  _spawnPoop(ctx, x, y) {
    if (!this._alive) return
    const pile = new Container()
    pile.position.set(x, y)
    pile.addChild(new Graphics().ellipse(0, 18, 26, 8).fill({ color: COLORS.shadow, alpha: 0.16 }))
    const g = new Graphics()
    g.ellipse(0, 12, 26, 13).fill(COLORS.brown)
    g.ellipse(0, 1, 20, 11).fill(0x6f4530)
    g.ellipse(0, -8, 13, 9).fill(COLORS.brown)
    g.circle(-5, -10, 3).fill({ color: 0xffffff, alpha: 0.4 }) // glansprick
    g.eventMode = 'none'
    pile.addChild(g)

    pile.eventMode = 'static'
    pile.cursor = 'pointer'
    pile.hitArea = new Circle(0, 0, 60) // ≥96px träffyta för tap-fallback
    pile._taken = false
    pile._flies = []
    pile._tapH = () => this._tapPile(ctx, pile)
    pile.on('pointertap', pile._tapH)

    this._poopLayer.addChild(pile)
    this._poops.push(pile)
    bounceIn(pile)

    // Flugor börjar surra efter ~4s (rent komiskt).
    this._scheduleFlies(ctx, pile)

    // Lär ut skyffeln en gång, strax efter intro.
    if (!this._saidScoop) {
      this._saidScoop = true
      this._scoopCueCall = gsap.delayedCall(0.6, () => {
        if (this._alive && !this._resolving) ctx.services.voice.say('Skyffla bajset i tunnan!')
      })
    }
  },

  // ---- Flugor (dekorativa, ticker-styrda) --------------------------------

  // Schemalägg surrande flugor ~4s efter att en hög lagts (delas av spawn + mjuk släpp-tillbaka).
  _scheduleFlies(ctx, pile) {
    pile._flyCall = gsap.delayedCall(4, () => {
      if (this._alive && !pile._taken && !pile.destroyed) this._addFlies(ctx, pile)
    })
  },

  _addFlies(ctx, pile) {
    if (!this._alive || pile.destroyed || pile._taken) return
    const n = 1 + (Math.random() < 0.5 ? 1 : 0)
    for (let i = 0; i < n; i++) {
      const f = new Text({ text: '🪰', style: { fontFamily: FONT.body, fontSize: 28 } })
      f.anchor.set(0.5)
      f.eventMode = 'none'
      f._ang = Math.random() * Math.PI * 2
      f._spd = 0.06 + Math.random() * 0.04
      f._r = 34 + Math.random() * 12
      this._poopLayer.addChild(f)
      pile._flies.push(f)
    }
  },

  _clearFlies(ctx, pile, withPuff) {
    pile._flyCall?.kill?.()
    pile._flyCall = null
    if (pile._flies) {
      for (const f of pile._flies) {
        if (f && !f.destroyed) {
          if (withPuff) puff(ctx.fxLayer, f.x, f.y, { count: 5 })
          f.destroy()
        }
      }
      pile._flies = []
    }
  },

  // ---- B) Skyffeln — drag (med tap-fallback) -----------------------------

  _scoopDown(ctx, e) {
    if (!this._alive || this._resolving) return
    this._poke()
    this._scooping = true
    this._returnTween?.kill()
    gsap.killTweensOf(this._scooper.scale)
    this._scooper.scale.set(1.08)
    ctx.services.audio.sfx('tap')
    this._scooper.on('globalpointermove', this._scoopMoveH)
    this._scooper.on('pointerup', this._scoopUpH)
    this._scooper.on('pointerupoutside', this._scoopUpH)
  },

  _scoopMove(ctx, e) {
    if (!this._scooping || !this._alive) return
    const p = this._root.toLocal(e.global)
    const x = clamp(p.x, 120, 1180)
    const y = clamp(p.y, 200, 670)
    this._scooper.position.set(x, y)
    this._idle = 0

    if (this._carry) {
      if (!this._carry.destroyed) this._carry.position.set(x, y)
      if (Math.hypot(x - DROP.x, y - DROP.y) < DROP.r) this._deposit(ctx)
      return
    }

    // Plocka upp närmaste oupphämtade hög inom PICK_R.
    let best = null
    let bd = PICK_R
    for (const pile of this._poops) {
      if (!pile || pile.destroyed || pile._taken) continue
      const d = Math.hypot(x - pile.x, y - pile.y)
      if (d < bd) {
        bd = d
        best = pile
      }
    }
    if (best) {
      best._taken = true
      const idx = this._poops.indexOf(best)
      if (idx >= 0) this._poops.splice(idx, 1)
      this._carry = best
      this._clearFlies(ctx, best, true)
      ctx.services.audio.sfx('pop')
      if (!best.destroyed) {
        best.position.set(x, y)
        pop(best)
      }
    }
  },

  _scoopUp(ctx) {
    if (!this._scooping) return
    this._scooping = false
    this._scooper.off('globalpointermove', this._scoopMoveH)
    this._scooper.off('pointerup', this._scoopUpH)
    this._scooper.off('pointerupoutside', this._scoopUpH)
    gsap.killTweensOf(this._scooper.scale)
    this._scooper.scale.set(1)

    // Bär hög men inte över tunnan → tappa mjukt tillbaka (aldrig straff).
    if (this._carry) {
      const pile = this._carry
      this._carry = null
      if (pile && !pile.destroyed) {
        const gx = clamp(this._scooper.x, 140, 1040)
        const gy = clamp(this._scooper.y, 320, WALK.y1)
        pile.position.set(gx, gy)
        pile.scale.set(1)
        pile._taken = false
        this._poops.push(pile)
        bounceIn(pile)
        ctx.services.audio.sfx('soft')
        floatText(ctx.fxLayer, gx, gy - 40, 'Hihi!')
        this._scheduleFlies(ctx, pile)
      }
    }
    this._returnScooper()
  },

  // Tap-fallback: tappa en hög → skyffeln flyger dit och skyfflar upp den själv.
  _tapPile(ctx, pile) {
    if (!this._alive || this._resolving) return
    this._poke()
    if (this._carry || this._scooping || this._autoBusy || pile._taken) {
      if (!pile.destroyed) wiggle(pile)
      return
    }
    this._autoScoopPile(ctx, pile)
  },

  // Auto-skyffel av en hög (delas av tap-fallback och idle-auto-hjälp).
  _autoScoopPile(ctx, pile) {
    if (!this._alive || this._resolving || pile._taken || pile.destroyed) return
    pile._taken = true
    this._autoBusy = true
    this._clearFlies(ctx, pile, true)
    ctx.services.audio.sfx('whoosh')
    const idx = this._poops.indexOf(pile)
    if (idx >= 0) this._poops.splice(idx, 1)

    this._autoScoopTl?.kill()
    const tl = gsap.timeline()
    this._autoScoopTl = tl
    this._returnTween?.kill()
    tl.to(this._scooper.position, { x: pile.x, y: pile.y, duration: 0.4, ease: 'power2.inOut' }, 0)
    tl.add(() => {
      if (!this._alive) return
      this._carry = pile
      ctx.services.audio.sfx('pop')
      if (!this._scooper.destroyed) pop(this._scooper)
    })
    tl.to(
      this._scooper.position,
      {
        x: DROP.x,
        y: DROP.y,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (this._carry === pile && !pile.destroyed) pile.position.set(this._scooper.x, this._scooper.y)
        },
      },
      '>',
    )
    tl.add(() => {
      this._autoBusy = false
      if (!this._alive) return
      this._deposit(ctx)
      this._returnScooper()
    })
  },

  _deposit(ctx) {
    if (!this._alive || this._resolving) return
    const pile = this._carry
    if (!pile) return
    this._carry = null
    const idx = this._poops.indexOf(pile)
    if (idx >= 0) this._poops.splice(idx, 1)

    // Hög faller i tunnan: tweena en {}-proxy och rör Pixi-objektet bara om det lever.
    if (!pile.destroyed) {
      const st = { x: pile.x, y: pile.y, s: pile.scale.x || 1 }
      const tw = gsap.to(st, {
        x: DROP.x,
        y: DROP.y + 14,
        s: 0,
        duration: 0.32,
        ease: 'power2.in',
        onUpdate: () => {
          if (!pile.destroyed) {
            pile.position.set(st.x, st.y)
            pile.scale.set(st.s)
          }
        },
        onComplete: () => {
          if (!pile.destroyed) pile.destroy()
        },
      })
      this._loose.push(tw)
    }

    this._collected++
    this._litSlot(this._collected - 1)
    this._meterTween?.kill()
    const target = Math.min(1, this._collected / this._needed)
    const ms = { v: this._meter.v }
    this._meterTween = gsap.to(ms, {
      v: target,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        this._meter.v = ms.v
        this._drawMeter()
      },
    })

    ctx.services.audio.sfx('whoosh')
    ctx.services.audio.sfx('correct')
    sparkle(ctx.fxLayer, DROP.x, DROP.y)
    floatText(ctx.fxLayer, DROP.x, DROP.y - 30, '💩', { fontSize: 40, rise: 60 })
    if (this._bin && !this._bin.destroyed) pop(this._bin)

    if (this._collected >= this._needed) this._finish(ctx)
  },

  _returnScooper() {
    if (!this._scooper || this._scooper.destroyed) return
    this._returnTween?.kill()
    this._scooper.scale.set(1)
    this._returnTween = gsap.to(this._scooper.position, { x: SCOOP_HOME.x, y: SCOOP_HOME.y, duration: 0.45, ease: 'power2.inOut' })
    wiggle(this._scooper)
  },

  // ---- Tick: flug-orbit, idle/auto-hjälp, auto-vandring -------------------

  _update(ctx, tk) {
    if (!this._alive) return
    const dt = Math.min(2.5, tk.deltaMS / 16.67)

    // Flugor cirklar sina högar (flyttas direkt — exit-säkert).
    for (const pile of this._poops) {
      if (!pile || pile.destroyed || !pile._flies || !pile._flies.length) continue
      for (const f of pile._flies) {
        if (!f || f.destroyed) continue
        f._ang += f._spd * dt
        f.position.set(pile.x + Math.cos(f._ang) * f._r, pile.y - 6 + Math.sin(f._ang) * f._r * 0.6)
      }
    }

    if (this._resolving) return

    // Idle-recue + mjuk auto-hjälp (~6s).
    this._idle += tk.deltaMS / 1000
    if (this._idle >= 6) {
      this._idle = 0
      this._autoHelp(ctx)
    }

    // Periodisk auto-vandring så det alltid finns bajs att skyffla.
    this._wanderTimer += tk.deltaMS / 1000
    if (this._poops.length < 2 && !this._walking && !this._scooping && !this._autoBusy && this._wanderTimer > 4) {
      this._wanderTimer = 0
      this._autoWander(ctx)
    }
  },

  _autoHelp(ctx) {
    if (!this._alive || this._resolving) return
    ctx.services.voice.replayLast()
    // Närmaste oupphämtade hög?
    let best = null
    let bd = Infinity
    for (const pile of this._poops) {
      if (!pile || pile.destroyed || pile._taken) continue
      const d = Math.hypot(this._scooper.x - pile.x, this._scooper.y - pile.y)
      if (d < bd) {
        bd = d
        best = pile
      }
    }
    if (!best) {
      this._autoWander(ctx, true) // ingen hög → valpen ger material
      return
    }
    if (this._autoBusy || this._carry || this._scooping) return
    this._idleHelps++
    if (this._idleHelps >= 2) {
      this._idleHelps = 0
      this._autoScoopPile(ctx, best) // garanterar att tunnan blir full
    } else {
      this._showHint(best)
    }
  },

  _showHint(pile) {
    const g = this._hintGfx
    if (!g || g.destroyed || pile.destroyed) return
    g.clear()
    const ax = this._scooper.x
    const ay = this._scooper.y
    for (let i = 1; i <= 6; i++) {
      const t = i / 7
      g.circle(ax + (pile.x - ax) * t, ay + (pile.y - ay) * t, 6).fill({ color: COLORS.yellow, alpha: 0.9 })
    }
    g.alpha = 1
    this._hintTween?.kill()
    const st = { a: 1 }
    this._hintTween = gsap.to(st, {
      a: 0,
      duration: 1.6,
      ease: 'power1.in',
      onUpdate: () => {
        if (!g.destroyed) g.alpha = st.a
      },
    })
    if (this._scooper && !this._scooper.destroyed) wiggle(this._scooper)
    if (!pile.destroyed) pop(pile)
  },

  _autoWander(ctx, force) {
    if (!this._alive || this._resolving || this._walking) return
    const tx = 220 + Math.random() * 720 // håll auto-vandring borta från tunnan
    const ty = WALK.y0 + 20 + Math.random() * (WALK.y1 - WALK.y0 - 40)
    this._walkTo(ctx, tx, ty, { force: !!force || this._poops.length < 1 })
  },

  _poke() {
    this._idle = 0
    this._idleHelps = 0
  },

  // ---- Runda klar → firande → ny runda -----------------------------------

  _finish(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._scooping = false

    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say('Hurra! Parken är ren!')
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    // Valpen skuttar glatt, tunnan vickar.
    if (this._dog && !this._dog.destroyed) {
      pop(this._dog)
      this._hopTl?.kill()
      const baseY = this._dog.y
      const tl = gsap.timeline()
      this._hopTl = tl
      tl.to(this._dog, { y: baseY - 44, duration: 0.22, ease: 'power2.out' })
      tl.to(this._dog, { y: baseY, duration: 0.26, ease: 'bounce.out' })
      tl.to(this._dog, { y: baseY - 28, duration: 0.2, ease: 'power2.out' })
      tl.to(this._dog, { y: baseY, duration: 0.26, ease: 'bounce.out' })
    }
    if (this._bin && !this._bin.destroyed) wiggle(this._bin)

    ctx.progress.complete()
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('hogar', ((ctx.progress.get().custom?.hogar | 0) || 0) + this._collected)

    this._finishCall = gsap.delayedCall(1.6, () => {
      if (this._alive) this._resetRound()
    })
  },

  _resetRound() {
    if (!this._alive) return
    this._resolving = true // blockera pekar-callbacks under teardown

    // Döda förra rundans tweens/timers.
    this._walkTween?.kill()
    this._bobTween?.kill()
    this._poopTl?.kill()
    this._autoScoopTl?.kill()
    this._returnTween?.kill()
    this._meterTween?.kill()
    this._hintTween?.kill()
    this._hopTl?.kill()
    this._scoopCueCall?.kill?.()
    this._loose.forEach((t) => t?.kill?.())
    this._loose = []

    // Töm högar + flugor.
    for (const pile of this._poops) {
      if (!pile) continue
      pile._flyCall?.kill?.()
      if (pile._flies) for (const f of pile._flies) if (f && !f.destroyed) f.destroy()
      if (!pile.destroyed) {
        gsap.killTweensOf(pile)
        gsap.killTweensOf(pile.scale)
        pile.destroy({ children: true })
      }
    }
    this._poops = []
    if (this._carry && !this._carry.destroyed) this._carry.destroy({ children: true })
    this._carry = null
    this._poopLayer.removeChildren().forEach((c) => {
      if (!c.destroyed) c.destroy()
    })

    // Nivå-parametrar + mätare.
    this._applyLevel()
    this._needed = 3 + this._level
    this._collected = 0
    this._meter.v = 0
    this._drawMeter()
    this._layoutSlots()
    if (this._hintGfx && !this._hintGfx.destroyed) this._hintGfx.clear()

    // Valpen till mitten.
    gsap.killTweensOf(this._dog)
    gsap.killTweensOf(this._dog.position)
    gsap.killTweensOf(this._dogBob)
    gsap.killTweensOf(this._dogBob.scale)
    this._dog.position.set(DOG_HOME.x, DOG_HOME.y)
    this._dog.scale.set(1)
    this._dogFacing.scale.x = 1
    this._dogBob.position.set(0, 0)
    this._dogBob.scale.set(1, 1)

    // Skyffeln hem.
    gsap.killTweensOf(this._scooper)
    gsap.killTweensOf(this._scooper.position)
    gsap.killTweensOf(this._scooper.scale)
    this._scooper.position.set(SCOOP_HOME.x, SCOOP_HOME.y)
    this._scooper.scale.set(1)

    // Nollställ rund-state.
    this._lastPoop = 0
    this._idle = 0
    this._idleHelps = 0
    this._wanderTimer = 0
    this._walking = false
    this._scooping = false
    this._autoBusy = false
    this._saidScoop = false
    this._resolving = false
  },

  // ---- Städning -----------------------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._scooping = false

    this._walkTween?.kill()
    this._bobTween?.kill()
    this._tailTween?.kill()
    this._poopTl?.kill()
    this._autoScoopTl?.kill()
    this._returnTween?.kill()
    this._meterTween?.kill()
    this._hintTween?.kill()
    this._hopTl?.kill()
    this._finishCall?.kill?.()
    this._scoopCueCall?.kill?.()
    this._loose?.forEach((t) => t?.kill?.())

    for (const pile of this._poops || []) {
      if (!pile) continue
      pile._flyCall?.kill?.()
      if (!pile.destroyed) {
        gsap.killTweensOf(pile)
        gsap.killTweensOf(pile.scale)
      }
    }
    if (this._carry && !this._carry.destroyed) {
      this._carry._flyCall?.kill?.()
      gsap.killTweensOf(this._carry)
      gsap.killTweensOf(this._carry.scale)
    }

    if (this._walkArea && !this._walkArea.destroyed) this._walkArea.off('pointertap', this._walkH)
    if (this._scooper && !this._scooper.destroyed) {
      this._scooper.off('pointerdown', this._scoopDownH)
      this._scooper.off('globalpointermove', this._scoopMoveH)
      this._scooper.off('pointerup', this._scoopUpH)
      this._scooper.off('pointerupoutside', this._scoopUpH)
      gsap.killTweensOf(this._scooper)
      gsap.killTweensOf(this._scooper.position)
      gsap.killTweensOf(this._scooper.scale)
    }
    if (this._dog && !this._dog.destroyed) {
      gsap.killTweensOf(this._dog)
      gsap.killTweensOf(this._dog.position)
    }
    if (this._dogBob && !this._dogBob.destroyed) {
      gsap.killTweensOf(this._dogBob)
      gsap.killTweensOf(this._dogBob.scale)
    }
    if (this._dogTail && !this._dogTail.destroyed) gsap.killTweensOf(this._dogTail)

    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel?.()
    this._root?.destroy({ children: true })
  },
}
