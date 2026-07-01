// Spindelnätet — motorik-/fysik-lek (2–4 år). Godis och små krypljus regnar ner från
// natthimlen som RIKTIGA matter.js-kroppar under mjuk gravitation. En gosig, helt
// EGEN liten webb-hjälte (pytteliten figur i röd dräkt med svarta nät-linjer och stora
// vita ögon — INTE Marvels Spindelmannen) sitter mitt i sitt nät och skjuter nättrådar.
// Barnet trycker nära ett fallande föremål -> en vit nättråd skjuts ut med ett "tjong",
// fångar kroppen (tas bort ur fysiken) och drar in den glidande i nätet; nät-mätaren
// tickar upp ett steg. Kontroller som ändrar utfallet: (A) VAR/NÄR man trycker (sikte +
// timing), (B) "Bredare nät"-knappen som fångar ALLA föremål inom en stor radie i ett
// svep och laddar långsamt om, (C) dra spindeln i sidled för bättre vinkel/kortare tråd.
// Inget kan misslyckas: missar studsar mjukt i marken och är fortfarande fångbara, och
// en snäll auto-hjälp fångar själv om barnet väntar för länge. Samla X godis -> delat
// firande + ny, lite svårare omgång. Allt ritas programmatiskt och städas exit-säkert.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, MATERIALS, Body } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'
import { pop, wiggle, sparkle, burst, floatText, bigCelebration, bounceIn, breathe } from '../../lib/feedback.js'

const TREATS = ['🍬', '🍭', '🍫', '🐛', '🪲']
const GROUND_FX = ['😄', '🌟', '🍬']

const BASE_Y = 600 // nät-/spindelbas (y)
const CATCH_R = 90 // fångstradie vid vanligt tryck
const WIDE_R = 200 // fångstradie vid bred svep (från basen)
const WIDE_RECHARGE = 6 // sek att ladda om bred-knappen
const MAX_FALL = 9 // px/steg-tak på fallfart (lugnt för små barn)
const GROUND_MARK_Y = 606 // y då ett föremål räknas som "i marken"
const SPIDER_MIN_X = 200
const SPIDER_MAX_X = 1080
const HAND_LOCAL = { x: 14, y: -35 } // skjut-handens läge i skjut-armens container (tråd-ursprung)

// Nivåtabeller (cykliskt, oändlig lek) — index = nivå-1, klampat till sista.
const GOALS = [4, 5, 6, 7, 8]
const GRAV = [0.9, 1.1, 1.3, 1.5]
const SPAWN_EVERY = [1.6, 1.3, 1.1, 0.9]
const MAX_ON = [4, 5, 6, 7]

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const pick = (arr, lvl) => arr[Math.min(Math.max(0, lvl - 1), arr.length - 1)]

export default {
  id: 'spindelnatet',
  titleSv: 'Spindelnätet',
  icon: '🕷️',
  category: 'motorik',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'spindelnatet',
  voiceIntro: 'Tryck nära godiset så fångar spindeln det!',

  // --- Livscykel ----------------------------------------------------------

  init(ctx) {
    this._alive = true
    this._items = [] // { body, view, _caught, _onGround, _groundAge }
    this._strands = [] // aktiva nättrådar (ritas om varje frame)
    this._tweens = [] // transienta tweens (skjut/indrag/fade) — städas i destroy
    this._slots = []
    this._baseX = ctx.width / 2
    this._dragSpider = false
    this._resolving = false
    this._firstCatch = false
    this._luredItem = null
    this._lureTween = null
    this._lastBounce = 0
    this._idle = 0
    this._spawnT = 0
    this._caughtCount = 0
    this._addedTotal = 0
    this._wideCooldown = 0 // 0 = redo, >0 = laddar (räknas ner i ticker)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Stjärnhimmel (FÖRSTA barn) + mörk markremsa nederst.
    this._root.addChild(createScene('night', { width: ctx.width, height: ctx.height }))
    const ground = new Graphics()
    ground.roundRect(-40, 648, 1360, 140, 50).fill(COLORS.brown)
    ground.rect(-40, 648, 1360, 12).fill({ color: 0x000000, alpha: 0.18 })
    ground.eventMode = 'none'
    this._root.addChild(ground)

    // Fysik: mjuk gravitation + sidoväggar; egen studsig markkropp en bit ner.
    this._phys = new PhysicsWorld({ gravityY: 0.9, walls: ['floor', 'left', 'right'] })
    this._phys.rectangle(640, 689, 1400, 80, { isStatic: true, restitution: 0.5, friction: 0.4, label: 'ground' })

    // Heltäckande osynlig fångst-yta (tap). Ligger bakom spindel/knapp som vinner i
    // sina egna ytor; föremål är icke-interaktiva så taps når hit och fångas via avstånd.
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onTapHandler = (e) => this._onTap(ctx, e)
    this._catcher.on('pointertap', this._onTapHandler)
    this._root.addChild(this._catcher)

    // Spindelväv (dekorativ), centrerad på basen, följer spindelns x.
    this._web = makeWeb()
    this._web.position.set(this._baseX, BASE_Y)
    this._root.addChild(this._web)

    // Föremålslager (icke-interaktivt).
    this._itemLayer = new Container()
    this._itemLayer.eventMode = 'none'
    this._itemLayer.interactiveChildren = false
    this._root.addChild(this._itemLayer)

    // Nättråd (lever hela spelet, clear/redraw varje frame).
    this._thread = new Graphics()
    this._thread.eventMode = 'none'
    this._root.addChild(this._thread)

    // Spindeln (drag i sidled).
    this._spider = makeSpider()
    this._shootArm = this._spider.shootArm // flaxande skjut-arm (tråden skjuts från handen)
    this._spider.position.set(this._baseX, BASE_Y)
    this._spider.eventMode = 'static'
    this._spider.cursor = 'pointer'
    this._spider.hitArea = new Circle(0, 0, 90)
    this._onSpiderDown = () => {
      if (!this._alive || this._resolving) return
      this._dragSpider = true
      this._idle = 0
      ctx.services.audio.sfx('tap')
      gsap.to(this._spider.scale, { x: 1.08, y: 1.08, duration: 0.12 })
    }
    this._onSpiderMove = (e) => {
      if (!this._alive || !this._dragSpider) return
      const lx = this._root.toLocal(e.global).x
      const nx = clamp(lx, SPIDER_MIN_X, SPIDER_MAX_X)
      this._baseX = nx
      this._spider.x = nx
      this._web.x = nx
      this._idle = 0
    }
    this._onSpiderUp = () => {
      if (!this._dragSpider) return
      this._dragSpider = false
      if (this._spider && !this._spider.destroyed) gsap.to(this._spider.scale, { x: 1, y: 1, duration: 0.18, ease: 'back.out(2)' })
    }
    this._spider.on('pointerdown', this._onSpiderDown)
    this._spider.on('globalpointermove', this._onSpiderMove)
    this._spider.on('pointerup', this._onSpiderUp)
    this._spider.on('pointerupoutside', this._onSpiderUp)
    this._root.addChild(this._spider)

    // Nät-mätare (slots uppe till vänster) — byggs i _buildRound (mål känt då).
    this._meterLayer = new Container()
    this._meterLayer.position.set(150, 140)
    this._meterLayer.eventMode = 'none'
    this._meterLayer.interactiveChildren = false
    this._root.addChild(this._meterLayer)

    // "Bredare nät"-knapp nere till höger (stor träffyta + laddnings-ring).
    this._wideBtn = new Container()
    this._wideBtn.position.set(1150, 600)
    this._wideFace = new Container()
    this._wideFace.addChild(new Graphics().circle(0, 0, 70).fill(COLORS.purple).stroke({ width: 6, color: 0xffffff, alpha: 0.85 }))
    this._wideFace.addChild(new Graphics().circle(-20, -22, 22).fill({ color: 0xffffff, alpha: 0.22 }))
    const wIcon = new Text({ text: '🕸️', style: { fontFamily: FONT.body, fontSize: 56 } })
    wIcon.anchor.set(0.5)
    this._wideFace.addChild(wIcon)
    this._wideBtn.addChild(this._wideFace)
    this._wideRing = new Graphics()
    this._wideRing.eventMode = 'none'
    this._wideBtn.addChild(this._wideRing)
    this._wideBtn.eventMode = 'static'
    this._wideBtn.cursor = 'pointer'
    this._wideBtn.hitArea = new Circle(0, 0, 94)
    this._onWideTap = () => this._shootWide(ctx)
    this._wideBtn.on('pointertap', this._onWideTap)
    this._root.addChild(this._wideBtn)

    // Starta på sparad nivå.
    this._level = Math.max(1, ctx.progress.get().highestLevel || 1)
    this._buildRound(ctx)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
    this._spawn(ctx) // något att fånga direkt
    this._spawnT = 0
  },

  // --- Omgång / nivå ------------------------------------------------------

  _buildRound(ctx) {
    if (!this._alive) return
    this._resolving = false
    this._caughtCount = 0
    this._addedTotal = 0
    this._idle = 0
    this._spawnT = 0
    this._wideCooldown = 0
    this._clearLure()
    this._clearItems()

    const lvl = this._level
    this._goal = pick(GOALS, lvl)
    this._gravityY = pick(GRAV, lvl)
    this._spawnEvery = pick(SPAWN_EVERY, lvl)
    this._maxOnScreen = pick(MAX_ON, lvl)
    this._phys.setGravity(this._gravityY)

    this._buildMeter()
    this._spawn(ctx) // seed
  },

  _buildMeter() {
    const layer = this._meterLayer
    if (!layer || layer.destroyed) return
    gsap.killTweensOf(layer.scale)
    for (const c of [...layer.children]) c.destroy()
    this._slots = []
    const n = Math.min(this._goal, 8)
    const gap = 56
    const panel = new Graphics().roundRect(-78, -34, n * gap + 40, 68, 34).fill({ color: 0x000000, alpha: 0.22 })
    layer.addChild(panel)
    const label = new Text({ text: '🕸️', style: { fontFamily: FONT.body, fontSize: 40 } })
    label.anchor.set(0.5)
    label.position.set(-48, 0)
    layer.addChild(label)
    for (let i = 0; i < n; i++) {
      const x = i * gap
      const ring = new Graphics().circle(x, 0, 22).fill({ color: 0xffffff, alpha: 0.1 }).stroke({ width: 4, color: 0xffffff, alpha: 0.7 })
      layer.addChild(ring)
      this._slots.push({ x })
    }
  },

  // --- Spawn --------------------------------------------------------------

  _spawn(ctx) {
    if (!this._alive || this._resolving) return
    if (this._items.length >= this._maxOnScreen) return
    const emoji = randomFrom(TREATS)
    const x = 120 + Math.random() * (1160 - 120)

    const view = new Container()
    const shadow = new Graphics().circle(0, 8, 28).fill({ color: 0x000000, alpha: 0.12 })
    shadow.eventMode = 'none'
    view.addChild(shadow)
    const face = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: 64 } })
    face.anchor.set(0.5)
    view.addChild(face)
    view.eventMode = 'none'
    view.x = x
    view.y = -40
    this._itemLayer.addChild(view)
    bounceIn(view, { duration: 0.35 })

    const body = this._phys.circle(x, -40, 34, { ...MATERIALS.light, label: 'treat' })
    Body.setVelocity(body, { x: (Math.random() * 2 - 1) * 1.5, y: 0 })
    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.1)
    this._phys.link(body, view)
    this._items.push({ body, view, _caught: false, _onGround: false, _groundAge: 0 })
  },

  // --- Tap -> fångst ------------------------------------------------------

  _onTap(ctx, e) {
    if (!this._alive || this._resolving) return
    const p = this._root.toLocal(e.global)
    this._idle = 0
    this._shootAt(ctx, p)
  },

  _shootAt(ctx, p) {
    let best = null
    let bestD = CATCH_R
    for (const it of this._items) {
      if (it._caught) continue
      const d = Math.hypot(it.view.x - p.x, it.view.y - p.y)
      if (d <= bestD) {
        bestD = d
        best = it
      }
    }
    if (best) {
      this._capture(ctx, best)
    } else {
      // Tomt tryck — lekfullt, ALDRIG straff.
      ctx.services.audio.sfx('soft')
      sparkle(ctx.fxLayer, p.x, p.y, { count: 4 })
      if (this._spider && !this._spider.destroyed) wiggle(this._spider)
    }
  },

  // Handens världsposition (i root-koordinater) — tråden skjuts härifrån, inte från basen.
  // Följer både sidled-drag, luta-mot-byte och den flaxande armen.
  _handPos() {
    const a = this._shootArm
    if (!a || a.destroyed) return { x: this._baseX, y: BASE_Y }
    return this._root.toLocal(a.toGlobal(HAND_LOCAL))
  },

  // Snabb flax med skjut-armen (pivå vid axeln) vid varje skott — jägaren "kastar" nätet.
  _flapArm() {
    const a = this._shootArm
    if (!a || a.destroyed) return
    gsap.killTweensOf(a)
    a.rotation = 0
    const tw = gsap.to(a, {
      rotation: -0.55,
      duration: 0.09,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
      onComplete: () => {
        if (a && !a.destroyed) a.rotation = 0
      },
    })
    this._tweens.push(tw)
  },

  _capture(ctx, obj, opts = {}) {
    if (!this._alive || obj._caught) return
    obj._caught = true
    if (obj === this._luredItem) this._clearLure()
    const i = this._items.indexOf(obj)
    if (i >= 0) this._items.splice(i, 1)
    if (obj.body) this._phys.removeBody(obj.body)
    this._idle = 0

    ctx.services.audio.sfx('whoosh')
    this._flapArm() // jägaren kastar nätet
    const v = obj.view
    const targetX = v && !v.destroyed ? v.x : this._baseX
    const targetY = v && !v.destroyed ? v.y : BASE_Y
    const strand = { obj, t: 0, reeling: false, targetX, targetY }
    this._strands.push(strand)

    // Skjut ut tråden (~150 ms), dra sedan in föremålet.
    const tw = gsap.to(strand, {
      t: 1,
      duration: 0.15,
      ease: 'power2.out',
      onComplete: () => {
        if (!this._alive) {
          this._removeStrand(strand)
          return
        }
        // Klistrigt "tjong/sproing" när tråden fäster (ej i bred-kaskaden — den har egen
        // stigande ton per fångst så det inte blir rörigt).
        if (!opts.cascade) ctx.services.audio.tone({ freq: 190, slideTo: 540, dur: 0.17, type: 'triangle', vol: 0.42 })
        strand.reeling = true
        this._reelIn(ctx, strand)
      },
    })
    this._tweens.push(tw)
  },

  _reelIn(ctx, strand) {
    const v = strand.obj.view
    if (!this._alive || !v || v.destroyed) {
      this._removeStrand(strand)
      if (v && !v.destroyed) v.destroy()
      return
    }
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    const st = { x: v.x, y: v.y, s: v.scale.x || 1 }
    const tw = gsap.to(st, {
      x: this._baseX,
      y: BASE_Y - 8,
      s: 0.35,
      duration: 0.3,
      ease: 'power2.in',
      onUpdate: () => {
        if (v.destroyed) {
          tw.kill()
          return
        }
        v.x = st.x
        v.y = st.y
        v.scale.set(st.s)
      },
      onComplete: () => {
        this._removeStrand(strand)
        if (!v.destroyed) v.destroy()
        this._landInNet(ctx, strand.obj)
      },
    })
    this._tweens.push(tw)
  },

  _removeStrand(strand) {
    const i = this._strands.indexOf(strand)
    if (i >= 0) this._strands.splice(i, 1)
  },

  _landInNet(ctx, obj) {
    if (!this._alive) return
    this._addedTotal++
    ctx.services.audio.sfx(this._addedTotal % 3 === 0 ? 'pop' : 'pling')
    // Mjukt "mums/plopp" när bytet landar i nätet.
    ctx.services.audio.tone({ freq: 320, slideTo: 150, dur: 0.12, type: 'sine', vol: 0.32 })
    if (this._spider && !this._spider.destroyed) pop(this._spider)
    sparkle(ctx.fxLayer, this._baseX, BASE_Y - 10, { count: 6 })
    if (Math.random() < 0.5) floatText(ctx.fxLayer, this._baseX, BASE_Y - 60, '🍬', { fontSize: 40 })
    if (!this._firstCatch) {
      this._firstCatch = true
      ctx.services.voice.say('Bra fångat!')
    }
    this._addToMeter(ctx)
  },

  _addToMeter(ctx) {
    if (this._resolving) return // räkna inte fångster som landar under firandet
    const idx = this._caughtCount
    this._caughtCount++
    if (idx < this._slots.length) {
      const slot = this._slots[idx]
      const candy = new Text({ text: '🍬', style: { fontFamily: FONT.body, fontSize: 30 } })
      candy.anchor.set(0.5)
      candy.position.set(slot.x, 0)
      candy.eventMode = 'none'
      this._meterLayer.addChild(candy)
    }
    if (this._meterLayer && !this._meterLayer.destroyed) pop(this._meterLayer, { scale: 1.06 })
    if (this._caughtCount >= this._goal) this._onComplete(ctx)
  },

  // --- Bred fångst (kontroll B) -------------------------------------------

  _shootWide(ctx) {
    if (!this._alive || this._resolving) return
    if (this._wideCooldown > 0) return // laddar fortfarande om
    const bx = this._baseX
    const by = BASE_Y
    const targets = this._items.filter((it) => !it._caught && Math.hypot(it.view.x - bx, it.view.y - by) <= WIDE_R)
    if (targets.length === 0) {
      // Inget inom radien — lekfullt, ingen omladdning slösas.
      ctx.services.audio.sfx('soft')
      sparkle(ctx.fxLayer, bx, by - 30, { count: 5 })
      if (this._wideFace && !this._wideFace.destroyed) pop(this._wideFace, { scale: 1.06 })
      return
    }
    this._idle = 0
    ctx.services.audio.sfx('match')
    burst(ctx.fxLayer, bx, by, { count: 18 })
    if (this._spider && !this._spider.destroyed) pop(this._spider)
    if (this._wideFace && !this._wideFace.destroyed) pop(this._wideFace)
    targets.forEach((it, k) => {
      const dc = gsap.delayedCall(k * 0.06, () => {
        if (!this._alive) return
        // Stigande ton per fångst — bred-svepet blir en glad liten kaskad.
        ctx.services.audio.tone({ freq: 330 + k * 80, dur: 0.12, type: 'triangle', vol: 0.34 })
        this._capture(ctx, it, { cascade: true })
      })
      this._tweens.push(dc)
    })
    this._wideCooldown = 1 // räknas ner i _update
  },

  // --- Mål nått -----------------------------------------------------------

  _onComplete(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._clearLure()

    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    sparkle(ctx.fxLayer, this._baseX, BASE_Y, { count: 10 })
    if (this._spider && !this._spider.destroyed) {
      pop(this._spider, { scale: 1.2 })
      const dc = gsap.delayedCall(0.22, () => {
        if (this._alive && this._spider && !this._spider.destroyed) pop(this._spider, { scale: 1.16 })
      })
      this._tweens.push(dc)
    }

    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('skordar', (ctx.progress.get().custom?.skordar || 0) + 1)
    ctx.progress.complete()

    this._roundTimer?.kill()
    this._roundTimer = gsap.delayedCall(1.6, () => {
      if (!this._alive) return
      this._level++
      this._buildRound(ctx)
    })
  },

  // --- Auto-hjälp + lockning ---------------------------------------------

  _autoHelp(ctx) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    const it = this._lowestItem()
    if (!it) {
      this._spawn(ctx)
      return
    }
    ctx.services.voice.say('Titta, jag hjälper till!')
    ctx.services.audio.sfx('reveal')
    this._capture(ctx, it)
  },

  _lowestItem() {
    let best = null
    let by = -Infinity
    for (const it of this._items) {
      if (it._caught) continue
      const y = it.view.y
      if (y > by) {
        by = y
        best = it
      }
    }
    return best
  },

  _setLure(it) {
    this._clearLure()
    if (!it || !it.view || it.view.destroyed) return
    this._luredItem = it
    this._lureTween = breathe(it.view, { scale: 1.12 })
  },

  _clearLure() {
    if (this._lureTween) {
      this._lureTween.kill()
      this._lureTween = null
    }
    const it = this._luredItem
    if (it && it.view && !it.view.destroyed) it.view.scale.set(1)
    this._luredItem = null
  },

  // --- Pensionera ett tråkigt golv-föremål (håll ytan ren) ----------------

  _retireItem(it) {
    const i = this._items.indexOf(it)
    if (i >= 0) this._items.splice(i, 1)
    if (it === this._luredItem) this._clearLure()
    if (it.body) this._phys.removeBody(it.body)
    const v = it.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    const st = { a: v.alpha, s: v.scale.x || 1 }
    const tw = gsap.to(st, {
      a: 0,
      s: 0.4,
      duration: 0.4,
      ease: 'power1.in',
      onUpdate: () => {
        if (v.destroyed) {
          tw.kill()
          return
        }
        v.alpha = st.a
        v.scale.set(st.s)
      },
      onComplete: () => {
        if (!v.destroyed) v.destroy()
      },
    })
    this._tweens.push(tw)
  },

  // --- Ticker -------------------------------------------------------------

  _update(ctx, t) {
    if (!this._alive) return
    this._phys.update(t.deltaMS)
    const dt = Math.min(0.05, (t.deltaMS || 16.67) / 1000)

    // Levande jägare: luta hjälten mjukt mot närmaste (lägsta) fallande föremål (billig lerp
    // av rotation). Låter honom kännas närvarande — han tittar/vänder sig mot bytet.
    const sp = this._spider
    if (sp && !sp.destroyed) {
      const aim = this._lowestItem()
      let targetRot = 0
      if (aim && aim.view && !aim.view.destroyed) targetRot = clamp((aim.view.x - this._baseX) * 0.00045, -0.14, 0.14)
      sp.rotation += (targetRot - sp.rotation) * Math.min(1, dt * 6)
    }

    // Rita om nättrådar (skjut-ut-fas: tip vandrar ut; indrag: följ föremålet).
    const th = this._thread
    if (th && !th.destroyed) {
      th.clear()
      if (this._strands.length) {
        const hp = this._handPos() // tråden skjuts från handen, inte basen
        const bx = hp.x
        const by = hp.y
        let drew = false
        for (const s of this._strands) {
          let tx
          let ty
          if (s.reeling) {
            const v = s.obj.view
            if (!v || v.destroyed) continue
            tx = v.x
            ty = v.y
          } else {
            tx = bx + (s.targetX - bx) * s.t
            ty = by + (s.targetY - by) * s.t
          }
          th.moveTo(bx, by).lineTo(tx, ty)
          drew = true
        }
        if (drew) th.stroke({ width: 5, color: 0xffffff, alpha: 0.9, cap: 'round' })
      }
    }

    // Spawn-takt (ej under firande, ej över taket).
    if (!this._resolving) {
      this._spawnT += dt
      if (this._spawnT >= this._spawnEvery && this._items.length < this._maxOnScreen) {
        this._spawnT = 0
        this._spawn(ctx)
      }
      // Golv-garanti: håll alltid minst ett par fångbara föremål i luften/marken.
      if (this._items.length < 2) this._spawn(ctx)
    }

    // Föremål: fartgräns, golv-markering (mjuk studs-feedback), liten krypning, pension.
    for (let i = this._items.length - 1; i >= 0; i--) {
      const it = this._items[i]
      if (it._caught) continue
      const b = it.body
      if (!b) continue
      if (b.velocity.y > MAX_FALL) Body.setVelocity(b, { x: b.velocity.x, y: MAX_FALL })
      const py = b.position.y
      if (!it._onGround && py > GROUND_MARK_Y) {
        it._onGround = true
        const now = performance.now()
        if (now - this._lastBounce > 180) {
          this._lastBounce = now
          ctx.services.audio.sfx('soft')
          if (Math.random() < 0.4) floatText(ctx.fxLayer, b.position.x, GROUND_MARK_Y - 10, randomFrom(GROUND_FX), { fontSize: 40 })
        }
      }
      if (it._onGround) {
        it._groundAge += dt
        if (Math.random() < 0.008) Body.setVelocity(b, { x: (Math.random() * 2 - 1) * 0.8, y: b.velocity.y })
        if (it._groundAge > 9) {
          this._retireItem(it)
          continue
        }
      }
    }

    // Bred-knappens omladdning + ring/dimning.
    if (this._wideCooldown > 0) {
      this._wideCooldown -= dt / WIDE_RECHARGE
      if (this._wideCooldown < 0) this._wideCooldown = 0
    }
    this._drawWideButton()

    // Idle: lockning vid ~3 s, snäll auto-hjälp vid ~6 s (garanterar framgång).
    if (!this._resolving) {
      this._idle += dt
      if (this._idle > 6) {
        this._autoHelp(ctx)
      } else if (this._idle > 3 && (!this._luredItem || this._luredItem._caught || !this._items.includes(this._luredItem))) {
        this._setLure(this._lowestItem())
      }
      if (this._idle < 0.2 && this._luredItem) this._clearLure()
    }
  },

  _drawWideButton() {
    const ring = this._wideRing
    if (!ring || ring.destroyed) return
    ring.clear()
    const ready = this._wideCooldown <= 0
    const frac = ready ? 1 : 1 - this._wideCooldown
    if (frac > 0.001) {
      ring.arc(0, 0, 82, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2).stroke({ width: 8, color: ready ? 0xfff3b0 : 0xffffff, alpha: ready ? 0.95 : 0.55 })
    }
    if (this._wideFace && !this._wideFace.destroyed) this._wideFace.alpha = ready ? 1 : 0.45
  },

  // --- Städning -----------------------------------------------------------

  _clearItems() {
    for (const it of this._items) {
      if (it.body) this._phys.removeBody(it.body)
      const v = it.view
      if (v && !v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
        v.destroy()
      }
    }
    this._items = []
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._roundTimer?.kill()
    this._clearLure()

    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onTapHandler)
    if (this._spider && !this._spider.destroyed) {
      this._spider.off('pointerdown', this._onSpiderDown)
      this._spider.off('globalpointermove', this._onSpiderMove)
      this._spider.off('pointerup', this._onSpiderUp)
      this._spider.off('pointerupoutside', this._onSpiderUp)
      gsap.killTweensOf(this._spider)
      gsap.killTweensOf(this._spider.scale)
    }
    if (this._shootArm && !this._shootArm.destroyed) gsap.killTweensOf(this._shootArm)
    if (this._wideBtn && !this._wideBtn.destroyed) this._wideBtn.off('pointertap', this._onWideTap)
    if (this._wideFace && !this._wideFace.destroyed) gsap.killTweensOf(this._wideFace.scale)
    if (this._meterLayer && !this._meterLayer.destroyed) gsap.killTweensOf(this._meterLayer.scale)

    this._clearItems()
    this._tweens.forEach((t) => t.kill())
    this._tweens = []
    this._strands = []

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// --- Programmatiska figurer ------------------------------------------------

// Spindelväv: 8 radiella ekrar + 3 koncentriska ringar (vit, halvgenomskinlig).
function makeWeb() {
  const g = new Graphics()
  const R = 150
  const spokes = 8
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2
    g.moveTo(0, 0).lineTo(Math.cos(a) * R, Math.sin(a) * R)
  }
  g.stroke({ width: 3, color: 0xffffff, alpha: 0.32 })
  for (const rr of [55, 100, 150]) {
    for (let i = 0; i < spokes; i++) {
      const a0 = (i / spokes) * Math.PI * 2
      const a1 = ((i + 1) / spokes) * Math.PI * 2
      g.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr).lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr)
    }
  }
  g.stroke({ width: 2.5, color: 0xffffff, alpha: 0.28 })
  g.eventMode = 'none'
  return g
}

// En gosig, HELT EGEN liten webb-hjälte (INTE Marvels Spindelmannen): en pytteliten
// figur i RÖD dräkt med SVARTA nät-linjer, stora vänliga VITA ögon (tunn svart kant)
// och enkla armar/ben. Den ena armen är lyft i en glad "skjut-nätet"-pose — hjälten
// skjuter fortfarande ut samma vita nättråd för att fånga godiset.
function makeSpider() {
  const c = new Container()
  const RED = 0xe23b3b // röd dräkt
  const REDDARK = 0xb02a2a // mörkröd kontur/skuggning
  const BLACK = 0x1a1a1a // svarta nät-linjer + handskar/stövlar
  const headCx = 0
  const headCy = -20
  const headR = 28

  // Mjuk skugga under hjälten.
  const shadow = new Graphics().ellipse(0, 52, 36, 11).fill({ color: 0x000000, alpha: 0.16 })
  shadow.eventMode = 'none'
  c.addChild(shadow)

  // Vänster arm (sänkt, stilla) + svart handske.
  const arms = new Graphics()
  arms.moveTo(-15, 6).quadraticCurveTo(-32, 14, -33, 30)
  arms.stroke({ width: 10, color: RED, cap: 'round' })
  arms.eventMode = 'none'
  c.addChild(arms)
  const hands = new Graphics()
  hands.circle(-33, 31, 7).fill(BLACK)
  hands.eventMode = 'none'
  c.addChild(hands)

  // Höger "skjut-arm" i EGEN container med pivå vid axeln (15,4) så den kan FLAXA vid
  // varje skott — och tråden skjuts ut från handens (14,-35 lokalt) världsposition.
  const shootArm = new Container()
  shootArm.position.set(15, 4)
  const shootG = new Graphics()
  shootG.moveTo(0, 0).quadraticCurveTo(18, -12, 14, -34)
  shootG.stroke({ width: 10, color: RED, cap: 'round' })
  shootG.circle(14, -35, 7).fill(BLACK)
  shootG.eventMode = 'none'
  shootArm.addChild(shootG)
  shootArm.eventMode = 'none'
  c.addChild(shootArm)
  c.shootArm = shootArm // exponeras för flax + hand-position

  // Ben (röda) + små svarta stövlar.
  const legs = new Graphics()
  legs.moveTo(-9, 32).lineTo(-11, 50)
  legs.moveTo(9, 32).lineTo(11, 50)
  legs.stroke({ width: 11, color: RED, cap: 'round' })
  legs.circle(-11, 51, 7).fill(BLACK)
  legs.circle(11, 51, 7).fill(BLACK)
  legs.eventMode = 'none'
  c.addChild(legs)

  // Kropp (torso) i röd dräkt.
  const body = new Graphics().ellipse(0, 12, 21, 22).fill(RED).stroke({ width: 3, color: REDDARK })
  body.eventMode = 'none'
  c.addChild(body)
  // Svarta nät-linjer på bröstet (radiella ekrar + mjuka bågar).
  const bodyWeb = new Graphics()
  for (let i = -2; i <= 2; i++) {
    const a = Math.PI / 2 + i * 0.5
    bodyWeb.moveTo(0, 2).lineTo(Math.cos(a) * 19, 4 + Math.sin(a) * 22)
  }
  for (const r of [8, 14, 20]) bodyWeb.arc(0, 2, r, 0.16 * Math.PI, 0.84 * Math.PI)
  bodyWeb.stroke({ width: 1.3, color: BLACK, alpha: 0.5 })
  bodyWeb.eventMode = 'none'
  c.addChild(bodyWeb)

  // Huvud i röd mask.
  const head = new Graphics().circle(headCx, headCy, headR).fill(RED).stroke({ width: 3, color: REDDARK })
  head.eventMode = 'none'
  c.addChild(head)
  // Svarta nät-linjer på masken (ekrar från mitten + koncentriska ringar).
  const headWeb = new Graphics()
  const spokes = 8
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2
    headWeb.moveTo(headCx, headCy).lineTo(headCx + Math.cos(a) * headR, headCy + Math.sin(a) * headR)
  }
  for (const r of [9, 18, 27]) headWeb.circle(headCx, headCy, r)
  headWeb.stroke({ width: 1.3, color: BLACK, alpha: 0.5 })
  headWeb.eventMode = 'none'
  c.addChild(headWeb)

  // Stora vänliga VITA ögon (tunn svart kant), lätt lutade som en klassisk mask.
  const eyeL = new Graphics().ellipse(0, 0, 10, 14).fill(0xffffff).stroke({ width: 2, color: BLACK })
  eyeL.position.set(-12, -16)
  eyeL.rotation = 0.42
  eyeL.eventMode = 'none'
  const eyeR = new Graphics().ellipse(0, 0, 10, 14).fill(0xffffff).stroke({ width: 2, color: BLACK })
  eyeR.position.set(12, -16)
  eyeR.rotation = -0.42
  eyeR.eventMode = 'none'
  // Liten glaslins-glans uppe i varje öga.
  const shine = new Graphics()
  shine.ellipse(-13, -20, 3.5, 5).fill({ color: 0xeaf3ff, alpha: 0.9 })
  shine.ellipse(11, -20, 3.5, 5).fill({ color: 0xeaf3ff, alpha: 0.9 })
  shine.eventMode = 'none'
  c.addChild(eyeL, eyeR, shine)

  return c
}
