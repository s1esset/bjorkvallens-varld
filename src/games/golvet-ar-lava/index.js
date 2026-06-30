// Golvet är Lava — barnet bygger sin egen väg av trampstenar tvärs över en
// bubblande lavaflod så att figuren (Zacke/Alissa) kan hoppa hela vägen till
// skatten 💎. INGET misslyckande: är gapet för stort sveper ett snällt litet moln
// in och lyfter figuren över (med "Hihi!"-fniss). Figuren ramlar ALDRIG i lavan.
//
// Två kontroller som ändrar utfallet: (1) VAR stenarna placeras (kort/långt mellan
// stegen) och (2) en STUDS-sten (grön fjäder-sten) som kastar nästa hopp mycket
// längre (räckvidd 460 i st.f. 280) → kan brygga ett stort gap med flit.
//
// Fysik: spelet använder INTE matter.js/AimLauncher. Två egna, ticker-drivna,
// exit-säkra integratorer: (a) en parametrisk hoppbåge (parabel) för figuren och
// (b) en partikel-integrator för stigande lavabubblor + en vågig glödyta. Ingen
// GSAP körs direkt på bubblor/yta/moln (de lever i tickern och förstörs via
// container-destroy); puff/floatText/sparkle är redan exit-säkra.
//
// Stenarna dras med EGEN pointer-logik (pointerdown/globalpointermove/pointerup),
// INTE DragController, med tap-tap-fallback. Vid släpp snäpper stenen till
// närmaste spök-slot (inom 72px) — annars fri placering var som helst över lavan.
import { Container, Graphics, Text, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { bounceIn, pop, wiggle, breathe, puff, sparkle, burst, bigCelebration, floatText } from '../../lib/feedback.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'

// --- Geometri (designkoordinater 1280×720) ---
const SURFACE_Y = 438 // lavans ytlinje
const STONE_R = 46 // stenens visuella radie
const STONE_Y = 460 // placerad stens mitt-y (slot-y)
const STONE_TOP = STONE_Y - STONE_R // 414 — figurens fötter när hen står på en sten
const EDGE_Y = 400 // figurens fötter på klipporna
const SNAP_R = 72 // snäpp-radie till spök-slot vid släpp (annars fri placering)
const DROP_BAND = { yMin: 380, yMax: 600 } // giltig lava-yta för fri placering
const TRAY_Y = 140 // stenarnas hemplats i brickan
const TRAY_HOMES = [360, 540, 720, 860] // 3 vanliga + 1 studs (längst till höger)
const IDLE_DELAY = 6 // s utan handling → röst-recue
const BUBBLE_N = 14
const BUBBLE_THROTTLE = 0.22 // s mellan mjuka blubb-ljud
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'golvet-ar-lava',
  titleSv: 'Golvet är Lava',
  icon: '🌋',
  category: 'pussel',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'golvet-ar-lava',
  voiceIntro: 'Lägg stenar över lavan så hoppar Zacke till skatten!',

  // ---- Livscykel ----------------------------------------------------------

  init(ctx) {
    this._alive = true
    this._t = 0
    this._tnow = 0
    this._idle = 0
    this._lastBlub = -1
    this._walking = false
    this._resolving = false
    this._hasPlacedEver = false
    this._lastMoved = false
    this._drag = null
    this._cloud = null
    this._selStone = null
    this._selPulse = null
    this._stones = []
    this._slots = []
    this._lavaLeft = 240
    this._lavaRight = 1040
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // 1) Bakgrund FÖRST — vulkanhimmel (egen mark ritas som klippor → ground:false).
    this._root.addChild(
      createScene(
        { top: 0xffd9a0, bottom: 0xff8a3d, ground: 0x8a5a3b, groundDark: 0x6f4a2e, sun: 0xffe6a8, clouds: 2 },
        { width: ctx.width, height: ctx.height, ground: false }
      )
    )

    // 2) Klippor.
    this._terrain = new Graphics()
    this._terrain.eventMode = 'none'
    this._root.addChild(this._terrain)

    // 3) Lava (bas + vågig yta som ritas om i tickern).
    this._lavaBase = new Graphics()
    this._lavaBase.eventMode = 'none'
    this._root.addChild(this._lavaBase)
    this._lavaSurf = new Graphics()
    this._lavaSurf.eventMode = 'none'
    this._root.addChild(this._lavaSurf)

    // 4) Bubbel-lager (stigande lavabubblor).
    this._lavaFx = new Container()
    this._lavaFx.eventMode = 'none'
    this._root.addChild(this._lavaFx)

    // 5) Skatt (mål).
    this._buildTreasure()
    this._root.addChild(this._treasure)

    // 6) Osynlig fält-fångare: tap i tomrummet → placera vald sten (tap-tap) / mjuk puff.
    this._catcher = new Graphics().rect(0, 90, ctx.width, ctx.height - 90).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._catcher.hitArea = new Rectangle(0, 90, ctx.width, ctx.height - 90)
    this._onFieldTap = (e) => this._fieldTap(ctx, e)
    this._catcher.on('pointertap', this._onFieldTap)
    this._root.addChild(this._catcher)

    // 7) Stenbricka-panel (dekorativ).
    this._buildTray()
    this._root.addChild(this._tray)

    // 8) Slot-lager + sten-lager.
    this._slotLayer = new Container()
    this._root.addChild(this._slotLayer)
    this._stoneLayer = new Container()
    this._root.addChild(this._stoneLayer)

    // 9) Figur (skugga + emoji).
    this._heroShadow = new Graphics().ellipse(0, 0, 40, 13).fill({ color: 0x000000, alpha: 0.18 })
    this._heroShadow.eventMode = 'none'
    this._root.addChild(this._heroShadow)
    this._hero = new Container()
    this._hero.eventMode = 'none'
    this._heroEmoji = new Text({ text: '🧒', style: { fontFamily: FONT.body, fontSize: 96 } })
    this._heroEmoji.anchor.set(0.5, 1)
    this._heroEmoji.eventMode = 'none'
    this._hero.addChild(this._heroEmoji)
    this._root.addChild(this._hero)

    // 10) Gå!-knapp (behålls mellan nivåer).
    this._buildGoButton(ctx)
    this._root.addChild(this._goBtn)

    // Lavabubbel-pool.
    this._bubbles = []
    for (let i = 0; i < BUBBLE_N; i++) {
      const g = new Graphics()
      g.eventMode = 'none'
      this._lavaFx.addChild(g)
      const b = { g, x: 0, y: 0, vy: 0, r: 0 }
      this._respawnBubble(b)
      this._bubbles.push(b)
    }

    this._buildLevel(ctx, this._level)

    this._tick = (tk) => this._update(ctx, tk)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    // Säg rätt namn för aktuell nivå (figuren växlar Zacke/Alissa per nivå) så
    // rösten matchar den visade figuren; idle-recue (replayLast) ärver samma rad.
    ctx.services.voice.say(`Lägg stenar över lavan så hoppar ${this._heroName || 'Zacke'} till skatten!`)
  },

  // ---- Statiska byggdelar -------------------------------------------------

  _buildTreasure() {
    const c = new Container()
    c.eventMode = 'none'
    const glow = new Graphics().circle(0, 0, 82).stroke({ width: 5, color: COLORS.yellow, alpha: 0.5 })
    glow.position.set(0, -10)
    const chest = new Graphics()
    chest.roundRect(-60, -6, 120, 72, 14).fill(COLORS.brown).stroke({ width: 5, color: 0x6e4429 })
    chest.roundRect(-60, -30, 120, 34, 14).fill(COLORS.yellow).stroke({ width: 5, color: COLORS.orangeDark })
    chest.roundRect(-13, -4, 26, 26, 6).fill(COLORS.orangeDark)
    const gem = new Text({ text: '💎', style: { fontFamily: FONT.body, fontSize: 96 } })
    gem.anchor.set(0.5)
    gem.position.set(0, -62)
    c.addChild(glow, chest, gem)
    this._treasure = c
    this._treasureGlow = glow
    this._treasureGlowTween = breathe(glow, { scale: 1.1, duration: 1.3 })
  },

  _buildTray() {
    const c = new Container()
    c.eventMode = 'none'
    const bg = new Graphics().roundRect(290, 100, 700, 80, 24).fill(COLORS.cream).stroke({ width: 5, color: COLORS.brown })
    const ic = new Text({ text: '🌋', style: { fontFamily: FONT.body, fontSize: 36 } })
    ic.anchor.set(0.5)
    ic.position.set(960, 140)
    c.addChild(bg, ic)
    this._tray = c
  },

  _buildGoButton(ctx) {
    const btn = new Container()
    const lip = new Graphics().circle(0, 9, 58).fill(COLORS.greenDark)
    const face = new Graphics().circle(0, 0, 58).fill(COLORS.green).stroke({ width: 4, color: COLORS.greenDark })
    face.circle(-16, -18, 16).fill({ color: 0xffffff, alpha: 0.22 })
    const foot = new Text({ text: '👣', style: { fontFamily: FONT.body, fontSize: 40 } })
    foot.anchor.set(0.5)
    foot.position.set(0, -14)
    const lbl = new Text({ text: 'Gå!', style: { fontFamily: FONT.display, fontSize: 34, fontWeight: '800', fill: COLORS.white } })
    lbl.anchor.set(0.5)
    lbl.position.set(0, 22)
    btn.addChild(lip, face, foot, lbl)
    btn.position.set(640, 662)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    btn.interactiveChildren = false
    btn.hitArea = new Circle(0, 0, 84) // ≥96px träffyta
    this._onGo = () => this._startWalk(ctx)
    btn.on('pointertap', this._onGo)
    this._goBtn = btn
  },

  // ---- Nivå-uppbyggnad ----------------------------------------------------

  _layoutFor(level) {
    if (level <= 1) return { lavaLeft: 240, lavaRight: 1040, slotXs: [320, 470, 620, 770, 920] }
    if (level <= 3) return { lavaLeft: 220, lavaRight: 1060, slotXs: [340, 460, 580, 700, 820, 940] }
    if (level <= 5) return { lavaLeft: 200, lavaRight: 1080, slotXs: [310, 420, 530, 640, 750, 860, 970] }
    // 6+: samma breda flod men med liten slumpad slot-jitter ±20 → oändlig lek.
    const j = () => Math.round(Math.random() * 40 - 20)
    return { lavaLeft: 200, lavaRight: 1080, slotXs: [310, 420, 530, 640, 750, 860, 970].map((x) => clamp(x + j(), 230, 1050)) }
  },

  _buildLevel(ctx, level) {
    if (!this._alive) return
    this._level = level
    const lay = this._layoutFor(level)
    this._lavaLeft = lay.lavaLeft
    this._lavaRight = lay.lavaRight
    this._heroStartX = lay.lavaLeft - 120
    this._rightLandingX = lay.lavaRight + 60
    this._treasureNodeX = lay.lavaRight + 110

    // Klippor + lavabas.
    const L = lay.lavaLeft
    const R = lay.lavaRight
    this._terrain.clear()
    this._terrain.roundRect(-60, 400, L + 60, 380, 40).fill(COLORS.brown)
    this._terrain.roundRect(-60, 400, L + 60, 26, 40).fill(COLORS.green)
    this._terrain.roundRect(R, 400, 1340 - R, 380, 40).fill(COLORS.brown)
    this._terrain.roundRect(R, 400, 1340 - R, 26, 40).fill(COLORS.green)
    this._lavaBase.clear()
    this._lavaBase.rect(L, SURFACE_Y, R - L, 300).fill(0x7a1500)
    this._lavaBase.rect(L, SURFACE_Y, R - L, 40).fill(0xff5a1e)

    // Skatt på höger klippa.
    this._treasure.position.set(R + 140, 360)

    // Bubblor in i nya flod-bredden.
    for (const b of this._bubbles) this._respawnBubble(b)

    // Ev. kvarvarande moln bort.
    if (this._cloud && !this._cloud.destroyed) this._cloud.destroy()
    this._cloud = null

    // Slottar + stenar.
    this._buildSlots(ctx, lay.slotXs)
    this._buildStones(ctx)

    // Figur (jämn nivå = Alissa, udda = Zacke).
    const even = level % 2 === 0
    this._heroName = even ? 'Alissa' : 'Zacke'
    if (this._heroEmoji && !this._heroEmoji.destroyed) {
      this._heroEmoji.text = even ? '👧' : '🧒'
      gsap.killTweensOf(this._heroEmoji.scale)
      this._heroEmoji.scale.set(1)
    }
    gsap.killTweensOf(this._hero)
    gsap.killTweensOf(this._hero.scale)
    this._hero.scale.set(1)
    this._hero.position.set(this._heroStartX, EDGE_Y)
    this._heroShadow.position.set(this._heroStartX, EDGE_Y)
    this._heroShadow.scale.set(1)
    this._heroShadow.alpha = 0.18
    bounceIn(this._hero)

    this._walking = false
    this._resolving = false
    this._hasPlacedEver = false
    this._idle = 0
    this._setGoEnabled(true)
  },

  _buildSlots(ctx, slotXs) {
    this._clearSlots()
    this._slots = []
    for (const x of slotXs) {
      const c = new Container()
      c.position.set(x, STONE_Y)
      const g = new Graphics().circle(0, 0, 40).fill({ color: 0xffffff, alpha: 0.12 }).stroke({ width: 5, color: COLORS.yellow, alpha: 0.6 })
      g.eventMode = 'none'
      c.addChild(g)
      c.eventMode = 'static'
      c.cursor = 'pointer'
      c.hitArea = new Circle(0, 0, 72)
      const slot = { view: c, stone: null }
      c.on('pointertap', (e) => {
        e.stopPropagation()
        this._slotTap(ctx, slot)
      })
      this._slotLayer.addChild(c)
      this._slots.push(slot)
    }
  },

  _clearSlots() {
    for (const s of this._slots || []) {
      if (s.view && !s.view.destroyed) {
        s.view.removeAllListeners()
        s.view.destroy({ children: true })
      }
    }
    this._slots = []
  },

  _buildStones(ctx) {
    this._clearStones()
    this._stones = []
    const kinds = ['normal', 'normal', 'normal', 'bounce']
    kinds.forEach((kind, i) => {
      const st = this._makeStone(ctx, kind, TRAY_HOMES[i])
      bounceIn(st, { delay: 0.05 * i })
    })
  },

  _clearStones() {
    this._deselect()
    this._drag = null
    for (const s of this._stones || []) {
      if (s && !s.destroyed) {
        gsap.killTweensOf(s)
        gsap.killTweensOf(s.scale)
        s.removeAllListeners()
        s.destroy({ children: true })
      }
    }
    this._stones = []
  },

  _makeStone(ctx, kind, homeX) {
    const isBounce = kind === 'bounce'
    const c = new Container()
    c.position.set(homeX, TRAY_Y)
    const shadow = new Graphics().circle(0, 6, STONE_R).fill({ color: 0x000000, alpha: 0.18 })
    shadow.eventMode = 'none'
    const body = new Graphics().circle(0, 0, STONE_R)
    if (isBounce) body.fill(0x5bbf6a).stroke({ width: 5, color: 0x49a657 })
    else body.fill(0x9a8474).stroke({ width: 5, color: 0x6f5d4e })
    body.eventMode = 'none'
    const spots = new Graphics()
    spots.circle(-15, -14, 8).fill({ color: 0xffffff, alpha: 0.25 })
    spots.circle(13, 10, 5).fill({ color: 0xffffff, alpha: 0.18 })
    spots.eventMode = 'none'
    c.addChild(shadow, body, spots)
    if (isBounce) {
      // Fjäder-glans + uppåtpil → "studs"-känsla.
      const spring = new Graphics()
      for (const sx of [-16, 0, 16]) spring.moveTo(sx - 7, 9).lineTo(sx, 2).lineTo(sx + 7, 9).lineTo(sx, -3).lineTo(sx - 7, -8)
      spring.stroke({ width: 3, color: 0xffffff, alpha: 0.7 })
      spring.eventMode = 'none'
      const up = new Text({ text: '⤴', style: { fontFamily: FONT.body, fontSize: 30, fill: 0xffffff } })
      up.anchor.set(0.5)
      up.position.set(0, -3)
      up.eventMode = 'none'
      c.addChild(spring, up)
    }
    c._isBounce = isBounce
    c._home = { x: homeX, y: TRAY_Y }
    c._placed = false
    c._slot = null
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Circle(0, 0, 72) // osynlig hit-halo ≥96px

    // Egen drag-logik (INTE DragController) + tap-tap-fallback.
    c.on('pointerdown', (e) => this._stoneDown(ctx, c, e))
    c.on('globalpointermove', (e) => this._stoneMove(c, e))
    c.on('pointerup', () => this._stoneUp(ctx, c))
    c.on('pointerupoutside', () => this._stoneUp(ctx, c))
    c.on('pointertap', (e) => this._stoneTap(ctx, c, e))

    this._stoneLayer.addChild(c)
    this._stones.push(c)
    return c
  },

  // ---- Sten-interaktion (manuell drag + tap-tap) --------------------------

  _locked() {
    return !this._alive || this._walking || this._resolving
  },

  _stoneDown(ctx, c, e) {
    if (this._locked()) return
    this._deselect()
    this._idle = 0
    this._stoneLayer.addChild(c) // höj z-index
    const local = this._root.toLocal(e.global)
    this._drag = { stone: c, ox: c.x - local.x, oy: c.y - local.y, moved: false, sx: local.x, sy: local.y }
    gsap.killTweensOf(c)
    gsap.killTweensOf(c.scale)
    gsap.to(c.scale, { x: 1.12, y: 1.12, duration: 0.12 })
    ctx.services.audio.sfx('tap')
    e.stopPropagation()
  },

  _stoneMove(c, e) {
    if (!this._drag || this._drag.stone !== c) return
    const local = this._root.toLocal(e.global)
    c.x = local.x + this._drag.ox
    c.y = local.y + this._drag.oy
    if (Math.hypot(local.x - this._drag.sx, local.y - this._drag.sy) > 12) this._drag.moved = true
    this._idle = 0
  },

  _stoneUp(ctx, c) {
    if (!this._drag || this._drag.stone !== c) return
    const moved = this._drag.moved
    this._lastMoved = moved
    this._drag = null
    gsap.killTweensOf(c.scale)
    gsap.to(c.scale, { x: 1, y: 1, duration: 0.2, ease: 'back.out(2)' })
    if (moved) this._resolveDrop(ctx, c)
    this._idle = 0
  },

  _stoneTap(ctx, c, e) {
    e.stopPropagation()
    if (this._lastMoved) {
      this._lastMoved = false
      return
    }
    this._toggleSelect(ctx, c)
  },

  // Vart hamnar en släppt sten? Närmaste slot (inom SNAP_R) → annars fri placering
  // över lavan → annars mjuk hem-snäpp. Aldrig en bestraffning.
  _resolveDrop(ctx, stone) {
    const cx = stone.x
    const cy = stone.y
    let near = null
    let nd = Infinity
    for (const s of this._slots) {
      const d = Math.hypot(cx - s.view.x, cy - s.view.y)
      if (d < nd) {
        nd = d
        near = s
      }
    }
    const overLava = cx >= this._lavaLeft - 10 && cx <= this._lavaRight + 10 && cy >= DROP_BAND.yMin && cy <= DROP_BAND.yMax
    if (near && nd <= SNAP_R) this._placeInSlot(ctx, stone, near)
    else if (overLava) this._placeFree(ctx, stone, cx)
    else this._returnHome(ctx, stone)
  },

  _detachSlot(stone) {
    if (stone._slot) {
      if (stone._slot.stone === stone) stone._slot.stone = null
      stone._slot = null
    }
  },

  // Gemensam "lägg stenen här"-svans (slot eller fri lava-yta): lossa ev. gammal
  // slot, markera placerad, höj z, glid dit och fira med pop/gnistror.
  _settleStone(ctx, stone, tx, ty) {
    this._detachSlot(stone)
    stone._placed = true
    this._hasPlacedEver = true
    this._stoneLayer.addChild(stone)
    gsap.killTweensOf(stone)
    gsap.to(stone, { x: tx, y: ty, duration: 0.16, ease: 'power2.in' })
    ctx.services.audio.sfx('pop')
    pop(stone)
    sparkle(ctx.fxLayer, tx, ty)
  },

  _placeInSlot(ctx, stone, slot) {
    // Trängs en annan sten ut → den snäpps mjukt hem (aldrig "fel", aldrig borta).
    if (slot.stone && slot.stone !== stone) {
      const old = slot.stone
      this._detachSlot(old)
      old._placed = false
      this._snapHome(old)
      wiggle(old)
    }
    this._settleStone(ctx, stone, slot.view.x, slot.view.y)
    slot.stone = stone
    stone._slot = slot
  },

  _placeFree(ctx, stone, x) {
    const tx = clamp(x, this._lavaLeft + 30, this._lavaRight - 30)
    this._settleStone(ctx, stone, tx, STONE_Y)
  },

  _returnHome(ctx, stone) {
    this._detachSlot(stone)
    stone._placed = false
    this._snapHome(stone)
    ctx.services.audio.sfx('soft')
  },

  _snapHome(stone) {
    gsap.killTweensOf(stone)
    gsap.to(stone, { x: stone._home.x, y: stone._home.y, duration: 0.32, ease: 'back.out(1.4)' })
  },

  _toggleSelect(ctx, stone) {
    if (this._locked()) return
    this._idle = 0
    if (this._selStone === stone) {
      this._deselect()
      ctx.services.audio.sfx('soft')
      return
    }
    this._deselect()
    this._selStone = stone
    gsap.killTweensOf(stone.scale)
    stone.scale.set(1)
    this._selPulse = breathe(stone, { scale: 1.1, duration: 0.7 })
    ctx.services.audio.sfx('tap')
  },

  _deselect() {
    this._selPulse?.kill()
    this._selPulse = null
    if (this._selStone && !this._selStone.destroyed) {
      gsap.killTweensOf(this._selStone.scale)
      this._selStone.scale.set(1)
    }
    this._selStone = null
  },

  _slotTap(ctx, slot) {
    if (this._locked()) return
    this._idle = 0
    const sel = this._selStone
    if (sel && !sel.destroyed) {
      this._deselect()
      this._placeInSlot(ctx, sel, slot)
    } else {
      ctx.services.audio.sfx('soft')
    }
  },

  _fieldTap(ctx, e) {
    if (this._locked()) return
    const p = this._root.toLocal(e.global)
    this._idle = 0
    const sel = this._selStone
    if (sel && !sel.destroyed) {
      this._deselect()
      if (p.x >= this._lavaLeft + 10 && p.x <= this._lavaRight - 10) this._placeFree(ctx, sel, p.x)
      else this._returnHome(ctx, sel)
    } else {
      ctx.services.audio.sfx('soft')
      puff(ctx.fxLayer, p.x, p.y, { count: 4 })
    }
  },

  _setGoEnabled(on) {
    if (this._goBtn && !this._goBtn.destroyed) {
      this._goBtn.eventMode = on ? 'static' : 'none'
      this._goBtn.alpha = on ? 1 : 0.5
      this._goBtn.cursor = on ? 'pointer' : 'default'
    }
  },

  _setStonesEnabled(on) {
    for (const s of this._stones || []) if (s && !s.destroyed) s.eventMode = on ? 'static' : 'none'
    if (!on) this._deselect()
  },

  // ---- Gå! → bygg landnings-sekvensen och starta gång-loopen --------------

  _startWalk(ctx) {
    if (this._locked()) return
    this._deselect()
    const placed = (this._stones || []).filter((s) => s && !s.destroyed && s._placed).sort((a, b) => a.x - b.x)

    // Mjuk uppmuntran (inte krav): första Gå! utan stenar → be barnet lägga en,
    // starta INTE. Har barnet redan placerat (och ev. tagit bort) → molnet bär hela
    // vägen (no-fail). Aldrig "game over".
    if (placed.length === 0 && !this._hasPlacedEver) {
      ctx.services.voice.say(`Lägg några stenar först, så hoppar ${this._heroName}!`)
      for (const s of this._stones) if (s && !s.destroyed && !s._placed) wiggle(s)
      return
    }

    const seq = [{ x: this._heroStartX, y: EDGE_Y, isBounce: false }]
    for (const s of placed) seq.push({ x: s.x, y: STONE_TOP, isBounce: !!s._isBounce })
    seq.push({ x: this._rightLandingX, y: EDGE_Y, isBounce: false })
    seq.push({ x: this._treasureNodeX, y: EDGE_Y, isTreasure: true })

    this._seq = seq
    this._stepTo = 1
    this._walking = true
    this._setStonesEnabled(false)
    this._setGoEnabled(false)
    ctx.services.audio.sfx('whoosh')
    pop(this._goBtn)
    ctx.services.voice.say('Hej hopp!')
    this._beginStep(ctx)
  },

  _beginStep(ctx) {
    const a = this._seq[this._stepTo - 1]
    const b = this._seq[this._stepTo]
    this._segAx = a.x
    this._segAy = a.y
    this._segBx = b.x
    this._segBy = b.y
    const gap = Math.max(0, b.x - a.x)
    const reach = a.isBounce ? 460 : 280
    this._hopT = 0
    if (gap <= reach) {
      // Vanligt parabel-hopp.
      this._mode = 'hop'
      this._dur = clamp(0.38 + gap / 1400, 0.4, 0.8)
      this._H = clamp(70 + gap * 0.35, 90, 210) + (a.isBounce ? 90 : 0)
    } else {
      // Gapet för stort → snällt moln lyfter över (auto-hjälp, aldrig fail).
      this._mode = 'cloud'
      this._dur = clamp(0.5 + gap / 1600, 0.55, 0.95)
      this._H = 150
      this._spawnCloud(a.x, a.y)
      ctx.services.audio.sfx('whoosh')
      floatText(ctx.fxLayer, a.x, a.y - 60, 'Hihi!', { fontSize: 44 })
    }
  },

  _spawnCloud(x, y) {
    if (this._cloud && !this._cloud.destroyed) this._cloud.destroy()
    const c = new Text({ text: '☁️', style: { fontFamily: FONT.body, fontSize: 96 } })
    c.anchor.set(0.5)
    c.position.set(x, y - 66)
    c.eventMode = 'none'
    this._root.addChild(c)
    this._cloud = c
  },

  _onLand(ctx) {
    if (this._mode === 'cloud') {
      if (this._cloud && !this._cloud.destroyed) {
        puff(ctx.fxLayer, this._cloud.x, this._cloud.y, { count: 5, color: 0xffffff })
        this._cloud.destroy()
      }
      this._cloud = null
    } else {
      ctx.services.audio.sfx('pop')
      if (this._hero && !this._hero.destroyed) {
        puff(ctx.fxLayer, this._hero.x, this._hero.y, { count: 5, color: 0xcdbfae })
        pop(this._hero)
      }
    }
    if (this._stepTo >= this._seq.length - 1) {
      this._walking = false
      this._onWin(ctx)
      return
    }
    this._stepTo++
    this._beginStep(ctx)
  },

  // ---- Mål: firande + ny (bredare) bana ------------------------------------

  _onWin(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._walking = false
    this._deselect()
    this._setStonesEnabled(false)
    this._setGoEnabled(false)

    const tx = this._treasure && !this._treasure.destroyed ? this._treasure.x : this._treasureNodeX
    ctx.services.audio.sfx('correct')
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, tx, 360, { count: 18 })
    sparkle(ctx.fxLayer, tx, 360, { count: 8 })
    if (this._hero && !this._hero.destroyed) {
      gsap.killTweensOf(this._hero.scale)
      pop(this._hero, { scale: 1.25 })
    }

    this._level += 1
    ctx.progress.setLevel(this._level)
    const cur = ctx.progress.get().custom || {}
    ctx.progress.setCustom('rundor', (cur.rundor || 0) + 1)
    ctx.progress.complete()

    this._winTimer?.kill()
    this._winTimer = gsap.delayedCall(1.6, () => {
      if (this._alive) this._buildLevel(ctx, this._level)
    })
  },

  // ---- Ticker -------------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = Math.min(0.05, ticker.deltaMS / 1000)
    this._t += dt
    this._tnow += dt

    this._drawLavaSurf()
    this._updateBubbles(ctx, dt)

    if (this._walking) {
      this._updateWalk(ctx, dt)
      return
    }

    // Skuggan vilar under figuren när hen står stilla.
    if (this._hero && !this._hero.destroyed && this._heroShadow && !this._heroShadow.destroyed) {
      this._heroShadow.position.set(this._hero.x, this._hero.y)
    }

    if (!this._resolving) {
      this._idle += dt
      if (this._idle >= IDLE_DELAY) {
        this._idle = 0
        this._idleRecue(ctx)
      }
    }
  },

  _updateWalk(ctx, dt) {
    this._hopT = Math.min(1, this._hopT + dt / this._dur)
    const t = this._hopT
    const ax = this._segAx
    const ay = this._segAy
    const bx = this._segBx
    const by = this._segBy
    const arc = 4 * this._H * t * (1 - t) // uppåt-offset (topp vid t=0.5)
    const x = ax + (bx - ax) * t
    const y = ay + (by - ay) * t - arc
    if (this._hero && !this._hero.destroyed) this._hero.position.set(x, y)
    if (this._heroEmoji && !this._heroEmoji.destroyed) {
      const k = Math.sin(t * Math.PI) // 0 vid avstamp/landning, 1 i toppen → mjuk sträck
      this._heroEmoji.scale.set(1 - 0.06 * k, 1 + 0.12 * k)
    }
    const lift = arc / Math.max(this._H, 1)
    if (this._heroShadow && !this._heroShadow.destroyed) {
      this._heroShadow.position.set(x, ay + (by - ay) * t)
      this._heroShadow.scale.set(Math.max(0.4, 1 - 0.5 * lift))
      this._heroShadow.alpha = 0.18 * (1 - 0.4 * lift)
    }
    if (this._mode === 'cloud' && this._cloud && !this._cloud.destroyed) this._cloud.position.set(x, y - 66)
    if (t >= 1) this._onLand(ctx)
  },

  _idleRecue(ctx) {
    if (!this._alive) return
    ctx.services.voice.replayLast()
    if (this._goBtn && !this._goBtn.destroyed) pop(this._goBtn)
    const free = (this._stones || []).find((s) => s && !s.destroyed && !s._placed)
    if (free) wiggle(free)
  },

  // ---- Lava (yta + bubblor), helt ticker-drivet & exit-säkert -------------

  _drawLavaSurf() {
    const s = this._lavaSurf
    if (!s || s.destroyed) return
    const L = this._lavaLeft
    const R = this._lavaRight
    s.clear()
    s.moveTo(L, SURFACE_Y + 30)
    for (let x = L; x <= R; x += 20) s.lineTo(x, SURFACE_Y + Math.sin(x * 0.02 + this._t * 2) * 5)
    s.lineTo(R, SURFACE_Y + 30)
    s.lineTo(L, SURFACE_Y + 30)
    s.fill(0xff5a1e)
    s.moveTo(L, SURFACE_Y)
    for (let x = L; x <= R; x += 20) s.lineTo(x, SURFACE_Y + Math.sin(x * 0.02 + this._t * 2) * 5)
    s.stroke({ width: 3, color: 0xffd35c, alpha: 0.8 })
  },

  _respawnBubble(b) {
    const w = this._lavaRight - this._lavaLeft
    b.x = this._lavaLeft + 20 + Math.random() * (w - 40)
    b.y = SURFACE_Y + 40 + Math.random() * 240
    b.vy = 18 + Math.random() * 22
    b.r = 6 + Math.random() * 10
  },

  _updateBubbles(ctx, dt) {
    for (const b of this._bubbles) {
      b.y -= b.vy * dt
      b.r += 5 * dt
      if (b.y <= SURFACE_Y) {
        puff(this._lavaFx, b.x, SURFACE_Y, { count: 3, color: 0xff7a2e })
        if (this._tnow - this._lastBlub > BUBBLE_THROTTLE && Math.random() < 0.25) {
          this._lastBlub = this._tnow
          ctx.services.audio.sfx('soft')
        }
        this._respawnBubble(b)
      }
      if (!b.g.destroyed) {
        b.g.clear().circle(b.x, b.y, b.r).fill({ color: 0xff8a3d, alpha: 0.55 }).stroke({ width: 2, color: 0xffd35c, alpha: 0.5 })
      }
    }
  },

  // ---- Städning (exit-säkert) ---------------------------------------------

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._winTimer?.kill()
    this._selPulse?.kill()
    this._treasureGlowTween?.kill()

    this._deselect()
    this._drag = null

    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onFieldTap)
    if (this._goBtn && !this._goBtn.destroyed) {
      this._goBtn.off('pointertap', this._onGo)
      gsap.killTweensOf(this._goBtn)
      gsap.killTweensOf(this._goBtn.scale)
    }
    for (const s of this._stones || []) {
      if (s && !s.destroyed) {
        gsap.killTweensOf(s)
        gsap.killTweensOf(s.scale)
      }
    }
    if (this._hero && !this._hero.destroyed) {
      gsap.killTweensOf(this._hero)
      gsap.killTweensOf(this._hero.scale)
    }
    if (this._heroEmoji && !this._heroEmoji.destroyed) gsap.killTweensOf(this._heroEmoji.scale)
    if (this._treasureGlow && !this._treasureGlow.destroyed) gsap.killTweensOf(this._treasureGlow.scale)

    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
