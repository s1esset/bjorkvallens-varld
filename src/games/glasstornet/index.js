// Glasstornet — mysig FYSIK-bygglek (3–5 år). Högst upp svävar en glasskula i en
// liten hand. Barnet DRAR kulan i sidled (eller tap-tap:ar på rälsen) och SLÄPPER
// (lyfter fingret) för att TAPPA den: kulan faller med RIKTIG matter.js-fysik, landar
// mjukt på struten/tornet, vobblar och nestlar sig. Tornet SVAJAR lugnt (lutande
// gravitation), så *när* man släpper spelar roll lika mycket som *var*. En stor
// klister-glass-knapp gör nästa kula klistrigare (mer friktion, lättare) = stabilare.
// INGEN game over: en kula som ramlar ner studsar mjukt, fnissar ("Hihi!") och tas
// bort — en ny dyker upp direkt; bara kulor som blir LIGGANDE räknas (aldrig som
// siffra). När `goal` kulor ligger kvar dråsar ett körsbär ner och vi firar (delat
// complete: stjärna + klistermärke), sedan byggs ett nytt, snäpp högre torn. Oändlig
// lek. Mjuk auto-hjälp (klister + magnet mot mitten) garanterar att tornet når målet.
// Allt ritas programmatiskt (Pixi Graphics + system-emoji) — inga externa filer.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, puff, sparkle, ripple, burst, bigCelebration, floatText } from '../../lib/feedback.js'
import { makeMascot } from '../../lib/mascot.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'

// ---- Konstanter (designkoordinater 1280×720) ----------------------------
const GRAV_Y = 1.0 // mjuk gravitation → lugnt, följbart fall
const TOWER_CX = 640 // tornets/strutens mittlinje
const CARRIER_Y = 120 // var den väntande kulan svävar (under headerns hörnknappar)
const SCOOP_R = 46 // fysikradie
const SCOOP_VR = 48 // visuell radie
const X_MIN = 130 // carrier-kulans sidledsgränser
const X_MAX = 1150

// Nominella stapelhöjder (kul-centra; fysiken sätter dem exakt) — guide för
// landningsring + mål-körsbär. spacing ≈82, första kulan vilar i strut-koppen.
const STACK_Y = [472, 390, 308, 226, 144]

// Material (kropp-opts, egna blandningar):
const SCOOP_NORMAL = { restitution: 0.1, friction: 0.7, frictionAir: 0.012, density: 0.0016, label: 'scoop' }
// klister-glass: griper hårt + lättare massa (mindre vältmoment) = mycket stabilare.
const SCOOP_STICKY = { restitution: 0.02, friction: 0.95, frictionAir: 0.02, density: 0.001, label: 'scoop' }

// Vila-/settle-trösklar.
const REST_SPEED = 0.6 // matter-fart under detta = kulan har lugnat sig
const REST_HOLD = 350 // ms i vila innan vi utvärderar
const SETTLE_MAX = 1600 // ms → tvinga fram utvärdering (spelet "hänger" aldrig)
const GROUND_Y = 600 // body.position.y >= detta = nådde marken (ramlade av)
const IDLE_MS = 6000 // ms utan handling → röst-recue

// Riktiga glass-smaker: varje smak har egen färg OCH egen dekor (frön/strössel/chips/swirl).
const FLAVORS = [
  { color: 0xff9ec4, kind: 'strawberry' }, // jordgubb (röda frön)
  { color: 0x8a5a3b, kind: 'chocolate' }, // choklad (färgglatt strössel)
  { color: 0x9fe3c9, kind: 'mint' }, // mint (mörka chokladchips)
  { color: 0xfdf2d0, kind: 'vanilla' }, // vanilj (gyllene swirl)
  { color: 0xb7a6ef, kind: 'blueberry' }, // blåbär (blå prickar)
]
const PLACE_LINES = ['En till!', 'Så fint!', 'Pling!']
const GIGGLES = ['Hihi!', 'Hoppsan!']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'glasstornet',
  titleSv: 'Glasstornet',
  icon: '🍦',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'glasstornet',
  voiceIntro: 'Stapla glasskulorna! Dra en kula i sidled och släpp den på toppen.',

  init(ctx) {
    this._alive = true
    this._live = [] // levande kul-kroppar { body, view, magnet }
    this._sticky = false // klister-glass-toggle (nästa kula)
    this._helpNext = false // mjuk auto-hjälp på nästa kula
    this._count = 0 // kulor som ligger kvar på tornet just nu
    this._fallStreak = 0
    this._stallT = 0 // ms sedan tornet stod ett steg från mål
    this._falling = false // en kula faller/settlar (inget nytt släpp)
    this._resolving = false // firande pågår (lås alla pekar-callbacks)
    this._dragging = false
    this._idle = 0
    this._swayT = 0
    this._lean = 0
    this._settle = 0
    this._restAcc = 0
    this._placeN = 0
    this._pointerId = null
    this._lastDropped = null // nyaste kroppen (settle-bevakas)
    this._lastRec = null
    this._level = 0
    this._serveItem = null // glass som flyger till mottagaren vid finalen

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bundna lyssnare (för ren av-registrering).
    this._onPlateTapBound = (e) => this._onPlateTap(ctx, e)
    this._onStickyBound = () => this._toggleSticky(ctx)
    this._onScoopDown = (e) => this._scoopDown(ctx, e)
    this._onScoopMove = (e) => this._scoopMove(ctx, e)
    this._onScoopUp = (e) => this._scoopUp(ctx, e)

    this._buildScene(ctx)

    this._phys = new PhysicsWorld({ gravityY: GRAV_Y, walls: ['floor', 'left', 'right'] })
    this._buildCone()

    this._newTower(ctx)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Statisk scen (byggs en gång) --------------------------------------

  _buildScene(ctx) {
    // Pastell glass-bakgrund (markens topp hamnar vid y=624).
    const bg = createScene('candy', { width: ctx.width, height: ctx.height, ground: true, groundH: 96 })
    bg.eventMode = 'none'
    this._root.addChild(bg)

    // Osynlig bak-platta / tap-räls: tap var som helst → carrier-kulan glider dit.
    this._plate = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._plate.eventMode = 'static'
    this._plate.on('pointertap', this._onPlateTapBound)
    this._root.addChild(this._plate)

    // Mjuk skugga under struten.
    this._shadow = new Graphics().ellipse(TOWER_CX, 612, 110, 22).fill({ color: 0x000000, alpha: 0.18 })
    this._shadow.eventMode = 'none'
    this._root.addChild(this._shadow)

    // Strut-grafik (fylls i _buildCone).
    this._coneG = new Graphics()
    this._coneG.eventMode = 'none'
    this._root.addChild(this._coneG)

    // Kul-lager (icke-interaktivt → pekningar faller ner till bak-plattan).
    this._scoopLayer = new Container()
    this._scoopLayer.eventMode = 'none'
    this._scoopLayer.interactiveChildren = false
    this._root.addChild(this._scoopLayer)

    // Mål-körsbär (blekt) som visar måhöjden.
    this._goalMark = new Text({ text: '🍒', style: { fontFamily: FONT.body, fontSize: 48 } })
    this._goalMark.anchor.set(0.5)
    this._goalMark.alpha = 0.5
    this._goalMark.eventMode = 'none'
    this._root.addChild(this._goalMark)

    // Sikt-guide: prickad lodlinje + landningsring (ritas medan vi bär).
    this._guide = new Graphics()
    this._guide.eventMode = 'none'
    this._root.addChild(this._guide)

    // Carrier-hand/skopa (ritas medan vi bär).
    this._handG = new Graphics()
    this._handG.eventMode = 'none'
    this._root.addChild(this._handG)

    // Balans-lod (pendel): visar svajet så barnet SER när tornet är balanserat —
    // lodet hänger rakt ner + blir grönt = bra läge att släppa (läsbart svaj).
    this._tiltG = new Graphics()
    this._tiltG.eventMode = 'none'
    this._root.addChild(this._tiltG)

    // Glassugen mottagare (Bobo) vid sidan: tittar på tornet, blir sugnare ju högre
    // det blir, och MUMSAR glassen vid finalen — bygget får ett syfte (mönster #2).
    this._customer = makeMascot(60)
    this._customer.position.set(150, 300)
    this._customer.eventMode = 'none'
    this._root.addChild(this._customer)

    this._buildStickyButton()
  },

  _buildStickyButton() {
    this._stickyBtn = new Container()
    this._stickyBtn.position.set(150, 590)
    this._stickyGlow = new Graphics().circle(0, 0, 70).stroke({ width: 6, color: COLORS.yellow, alpha: 0.9 })
    this._stickyGlow.visible = false
    const bg = new Graphics().circle(0, 0, 60).fill(COLORS.cream).stroke({ width: 5, color: COLORS.orange })
    this._stickyIcon = new Text({ text: '💧', style: { fontFamily: FONT.body, fontSize: 56 } })
    this._stickyIcon.anchor.set(0.5)
    this._stickyBtn.addChild(this._stickyGlow, bg, this._stickyIcon)
    this._stickyBtn.eventMode = 'static'
    this._stickyBtn.cursor = 'pointer'
    this._stickyBtn.hitArea = new Circle(0, 0, 66)
    this._stickyBtn.on('pointertap', this._onStickyBound)
    this._root.addChild(this._stickyBtn)
  },

  // Brun strut-triangel (spets nedåt) + våffel-linjer + statiska kroppar.
  _buildCone() {
    const g = this._coneG
    g.clear()
    g.moveTo(548, 486).lineTo(732, 486).lineTo(640, 624).closePath().fill(COLORS.brown).stroke({ width: 5, color: 0x6e4326 })
    g.moveTo(572, 500).lineTo(648, 600).stroke({ width: 3, color: 0xffe0b0, alpha: 0.25 })
    g.moveTo(612, 492).lineTo(672, 568).stroke({ width: 3, color: 0xffe0b0, alpha: 0.25 })
    g.moveTo(652, 490).lineTo(700, 548).stroke({ width: 3, color: 0xffe0b0, alpha: 0.25 })
    g.moveTo(708, 492).lineTo(636, 600).stroke({ width: 3, color: 0xffe0b0, alpha: 0.25 })

    // Statisk sockel (top ≈518 → första kulan vilar vid center ≈472) + två "läpp"-
    // kroppar som cradlar botten så tornet sällan rasar helt.
    this._phys.rectangle(TOWER_CX, 554, 160, 72, { isStatic: true, friction: 0.9, label: 'cone' })
    this._phys.rectangle(556, 470, 18, 56, { isStatic: true, friction: 0.9, label: 'lip' })
    this._phys.rectangle(724, 470, 18, 56, { isStatic: true, friction: 0.9, label: 'lip' })
  },

  // ---- Torn (runda) -------------------------------------------------------

  _newTower(ctx) {
    if (!this._alive) return
    this._finishCall?.kill()
    this._cherryTween?.kill()
    this._serveTween?.kill()
    if (this._cherry && !this._cherry.destroyed) {
      gsap.killTweensOf(this._cherry)
      this._cherry.destroy()
    }
    this._cherry = null
    if (this._serveItem && !this._serveItem.destroyed) {
      gsap.killTweensOf(this._serveItem)
      this._serveItem.destroy()
    }
    this._serveItem = null

    this._clearLive()

    this._count = 0
    this._fallStreak = 0
    this._stallT = 0
    this._falling = false
    this._resolving = false
    this._dragging = false
    this._helpNext = false
    this._swayT = 0
    this._lean = 0
    this._idle = 0

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._goal = Math.min(3 + this._level, 5)

    this._goalMark.position.set(820, STACK_Y[Math.min(this._goal - 1, STACK_Y.length - 1)])
    this._goalMark.visible = true

    this._spawnCarrier(ctx)
  },

  // Skapa nästa kula svävande i handen vid (640, 120).
  _spawnCarrier(ctx) {
    if (!this._alive || this._resolving) return
    if (this._count >= this._goal) {
      this._finishTower(ctx)
      return
    }
    const view = this._makeScoop(randomFrom(FLAVORS))
    view.position.set(TOWER_CX, CARRIER_Y)
    view.eventMode = 'static'
    view.cursor = 'pointer'
    view.hitArea = new Circle(0, 0, 66)
    view.on('pointerdown', this._onScoopDown)
    view.on('globalpointermove', this._onScoopMove)
    view.on('pointerup', this._onScoopUp)
    view.on('pointerupoutside', this._onScoopUp)
    this._root.addChild(view)

    this._carrier = view
    this._dragging = false
    this._idle = 0
    this._applyStickyLook(view, this._sticky || this._helpNext)
    bounceIn(view)
  },

  // ---- Peklogik på carrier-kulan -----------------------------------------

  _scoopDown(ctx, e) {
    if (!this._alive || this._resolving || this._falling || !this._carrier || this._dragging) return
    this._dragging = true
    this._pointerId = e.pointerId
    gsap.killTweensOf(this._carrier)
    gsap.killTweensOf(this._carrier.scale)
    gsap.to(this._carrier.scale, { x: 1.12, y: 1.12, duration: 0.12, ease: 'power2.out' })
    ctx.services.audio.sfx('tap')
    this._idle = 0
  },

  _scoopMove(_ctx, e) {
    if (!this._dragging || e.pointerId !== this._pointerId || !this._carrier) return
    const p = this._root.toLocal(e.global)
    this._carrier.x = clamp(p.x, X_MIN, X_MAX)
    this._idle = 0
  },

  _scoopUp(ctx, e) {
    if (!this._dragging || (e && e.pointerId !== this._pointerId)) return
    this._dragging = false
    const x = this._carrier ? this._carrier.x : TOWER_CX
    this._dropScoop(ctx, x)
  },

  // Tap på bak-rälsen → carrier glider dit (tap-tap-fallback för de minsta).
  _onPlateTap(ctx, e) {
    if (!this._alive || this._resolving || this._falling || !this._carrier) return
    const p = this._root.toLocal(e.global)
    const x = clamp(p.x, X_MIN, X_MAX)
    gsap.killTweensOf(this._carrier)
    gsap.to(this._carrier, { x, duration: 0.25, ease: 'power2.out' })
    ctx.services.audio.sfx('soft')
    ripple(ctx.fxLayer, x, CARRIER_Y, { maxR: 60 })
    this._idle = 0
  },

  // Släpp = tappa: gör carrier-vyn till en fallande matter-kropp.
  _dropScoop(ctx, x) {
    if (!this._alive || this._resolving || this._falling || !this._carrier) return
    const view = this._carrier
    this._detachCarrier(view)
    gsap.killTweensOf(view)
    gsap.killTweensOf(view.scale)
    view.scale.set(1)

    this._scoopLayer.addChild(view)
    view.position.set(x, CARRIER_Y)

    const help = this._helpNext
    const mat = this._sticky || help ? SCOOP_STICKY : SCOOP_NORMAL
    const body = this._phys.circle(x, CARRIER_Y, SCOOP_R, { ...mat })
    this._phys.link(body, view)

    const rec = { body, view, magnet: help }
    this._live.push(rec)
    this._lastDropped = body
    this._lastRec = rec
    this._carrier = null
    this._helpNext = false
    this._falling = true
    this._settle = 0
    this._restAcc = 0
    this._stallT = 0

    ctx.services.audio.sfx('whoosh')
    this._guide?.clear()
    this._handG?.clear()
  },

  _toggleSticky(ctx) {
    if (!this._alive || this._resolving) return
    this._sticky = !this._sticky
    this._stickyIcon.text = this._sticky ? '🍯' : '💧'
    this._stickyGlow.visible = this._sticky
    ctx.services.audio.sfx('tap')
    if (!this._stickyBtn.destroyed) pop(this._stickyBtn)
    if (this._carrier && !this._carrier.destroyed && !this._falling) {
      this._applyStickyLook(this._carrier, this._sticky || this._helpNext)
    }
    this._idle = 0
  },

  // ---- Uppdatering --------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dms = ticker.deltaMS

    // Svaj: oscillera gravitationens x-komponent → hela tornet "andas". Tydligt men
    // snällt (kapat) så barnet hinner se när det är balanserat och släppa i rätt läge.
    this._swayT += dms
    const amp = Math.min(0.13 + 0.025 * this._count, 0.24) // högre torn lutar mer (kapat)
    const period = Math.max(2000, 2600 - this._level * 150)
    this._lean = amp * Math.sin((this._swayT * (2 * Math.PI)) / period)
    this._phys.setGravity(GRAV_Y, this._lean)

    // Stega fysiken (fast tidssteg) + synka vyer.
    this._phys.update(dms)

    // Balans-lodet följer svajet varje frame (grönt vid ~lodrätt = "släpp nu").
    this._drawTilt()

    // Medan vi bär: rita hand + guide, idle-recue, stall-timer.
    if (this._carrier && !this._falling && !this._resolving) {
      this._drawHand()
      this._drawGuide()
      this._idle += dms
      if (this._idle > IDLE_MS) {
        this._idle = 0
        const v = ctx.services.voice
        if (v.replayLast) v.replayLast()
        else v.say(this.voiceIntro)
        if (this._carrier && !this._carrier.destroyed) pop(this._carrier)
      }
      if (this._count === this._goal - 1) {
        this._stallT += dms
        if (this._stallT > 8000 && !this._helpNext) {
          this._helpNext = true
          this._applyStickyLook(this._carrier, true)
        }
      }
    } else if (this._handG && !this._handG.destroyed) {
      this._handG.clear()
    }

    // Settle-bevakning av den fallande kulan.
    if (this._falling) {
      this._settle += dms
      const b = this._lastDropped
      if (b) {
        const sp = Math.hypot(b.velocity.x, b.velocity.y)
        if (sp < REST_SPEED) this._restAcc += dms
        else this._restAcc = 0
        // Mjuk magnet (auto-hjälp): styr lugnt mot mitten så kulan fastnar.
        if (this._lastRec && this._lastRec.magnet) {
          Body.setVelocity(b, { x: b.velocity.x * 0.5 + (TOWER_CX - b.position.x) * 0.03, y: b.velocity.y })
        }
      }
      if ((this._settle > 150 && this._restAcc >= REST_HOLD) || this._settle > SETTLE_MAX) {
        this._evaluate(ctx)
      }
    }
  },

  // Räkna liggande kulor; ramlade studsar bort glatt (no-fail) + auto-hjälp.
  _evaluate(ctx) {
    if (!this._alive) return
    const survivors = []
    for (const rec of this._live) {
      if (rec.body.position.y >= GROUND_Y) {
        // Ramlade till marken → studsa mjukt bort + fniss. Räknas aldrig.
        const x = rec.view.x
        const y = rec.view.y
        this._phys.removeBody(rec.body)
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
        if (!rec.view.destroyed) rec.view.destroy({ children: true })
        puff(ctx.fxLayer, x, y, { count: 8 })
        floatText(ctx.fxLayer, x, y - 30, randomFrom(GIGGLES))
        ctx.services.audio.sfx('soft')
      } else {
        survivors.push(rec)
      }
    }

    const landedNew = survivors.includes(this._lastRec)
    this._live = survivors
    this._count = survivors.length

    if (landedNew) {
      this._fallStreak = 0
      this._stallT = 0
      this._placeReward(ctx, this._lastRec)
    } else {
      this._fallStreak++
    }
    // Mjuk auto-hjälp efter 3 missar i rad → garanterad framgång.
    if (this._fallStreak >= 3) this._helpNext = true

    this._falling = false
    this._lastDropped = null
    this._lastRec = null

    if (this._count >= this._goal) {
      this._finishTower(ctx)
      return
    }
    this._spawnCarrier(ctx)
  },

  // En kula blev liggande: mjukt "plopp" + STIGANDE pling per våning, nestle-squash,
  // gnistror, sugen mottagare + (sparsamt) röst.
  _placeReward(ctx, rec) {
    this._placeN++
    ctx.services.audio.sfx('pop') // mjukt plopp/smask när kulan nestlar sig
    // Stigande pling per våning (pentatoniskt) → tornet "sjunger" högre ju högre det blir.
    const semis = [0, 2, 4, 7, 9, 12]
    const idx = Math.max(0, Math.min(this._count - 1, semis.length - 1))
    ctx.services.audio.tone({ freq: 523.25 * Math.pow(2, semis[idx] / 12), dur: 0.16, type: 'sine', vol: 0.26 })
    this._nestleSquash(rec.view) // squasha/stretcha mjukt som riktig mjukglass
    sparkle(ctx.fxLayer, rec.body.position.x, rec.body.position.y, { count: 6 })
    this._reactCustomer(ctx)
    if (Math.random() < 0.5) ctx.services.voice.say(randomFrom(PLACE_LINES))
  },

  // Nestle-squash: en landande kula plattas till och studsar tillbaka (taktil stapling).
  _nestleSquash(view) {
    if (!view || view.destroyed) return
    gsap.killTweensOf(view.scale)
    gsap
      .timeline()
      .to(view.scale, { x: 1.22, y: 0.82, duration: 0.1, ease: 'power2.out' })
      .to(view.scale, { x: 0.93, y: 1.08, duration: 0.12, ease: 'sine.inOut' })
      .to(view.scale, { x: 1, y: 1, duration: 0.24, ease: 'back.out(2.2)' })
  },

  // Mottagaren blir sugen: studsar till (större ju högre tornet är) + gör stora ögon nära mål.
  _reactCustomer(ctx) {
    const c = this._customer
    if (!c || c.destroyed) return
    pop(c, { scale: 1.1 + 0.03 * this._count })
    if (this._count >= Math.max(2, this._goal - 1)) {
      floatText(ctx.fxLayer, c.x, c.y - 68, randomFrom(['😋', '👀', '❤️']), { fontSize: 40 })
    }
  },

  // ---- Mål nått: körsbär + firande + nytt torn ---------------------------

  _finishTower(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true

    // Hitta tornets topp (lägsta y bland liggande kulor).
    let topY = STACK_Y[STACK_Y.length - 1]
    let topX = TOWER_CX
    let best = Infinity
    for (const rec of this._live) {
      if (rec.body.position.y < best) {
        best = rec.body.position.y
        topX = rec.body.position.x
      }
    }
    if (best !== Infinity) topY = best

    // Körsbär dråsar ner på toppen (exit-säkert: tweena {}-proxy, rör Pixi bara om den lever).
    const cherry = new Text({ text: '🍒', style: { fontFamily: FONT.body, fontSize: 56 } })
    cherry.anchor.set(0.5)
    cherry.eventMode = 'none'
    cherry.position.set(topX, topY - 220)
    this._root.addChild(cherry)
    this._cherry = cherry
    const st = { y: topY - 220 }
    this._cherryTween = gsap.to(st, {
      y: topY - 52,
      duration: 0.6,
      ease: 'bounce.out',
      onUpdate: () => {
        if (!cherry.destroyed) cherry.y = st.y
      },
    })

    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, topX, topY - 40, { count: 16 })
    this._serveToCustomer(ctx, topX, topY - 40) // glassen flyger till den hungriga mottagaren

    // Spara förlopp + delat firande (stjärna + klistermärke) — exakt en gång.
    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('torn', (ctx.progress.get().custom?.torn || 0) + 1)
    ctx.progress.complete()

    this._finishCall = gsap.delayedCall(1.5, () => {
      if (this._alive) this._newTower(ctx)
    })
  },

  // Glassen flyger från tornets topp till mottagaren som mumsar ("Mums! Tack!").
  // Exit-säkert: tweena en {}-proxy, rör Pixi-objektet bara om det lever.
  _serveToCustomer(ctx, fromX, fromY) {
    const c = this._customer
    if (!c || c.destroyed) return
    const item = new Text({ text: '🍦', style: { fontFamily: FONT.body, fontSize: 60 } })
    item.anchor.set(0.5)
    item.position.set(fromX, fromY)
    item.eventMode = 'none'
    this._root.addChild(item)
    this._serveItem = item
    const st = { x: fromX, y: fromY, s: 1 }
    this._serveTween = gsap.to(st, {
      x: c.x,
      y: c.y - 26,
      s: 0.5,
      duration: 0.7,
      delay: 0.5,
      ease: 'power2.in',
      onUpdate: () => {
        if (item.destroyed) {
          this._serveTween?.kill()
          return
        }
        item.position.set(st.x, st.y)
        item.scale.set(st.s)
      },
      onComplete: () => {
        if (!item.destroyed) item.destroy()
        this._serveItem = null
        if (this._alive && c && !c.destroyed) {
          pop(c, { scale: 1.3 })
          floatText(ctx.fxLayer, c.x, c.y - 64, randomFrom(['Mums!', '😋', '❤️']), { fontSize: 44 })
          ctx.services.voice.say('Mums! Tack!')
          ctx.services.audio.tone({ freq: 660, dur: 0.14, type: 'sine', vol: 0.26 })
          ctx.services.audio.tone({ freq: 990, dur: 0.18, type: 'sine', vol: 0.22, delay: 0.12 })
        }
      },
    })
  },

  // ---- Ritning ------------------------------------------------------------

  // Balans-lod (pendel) uppe till höger: hänger rakt ner vid lean=0 och blir grönt =
  // "tornet är balanserat, släpp nu". Amplifierad vinkel så svajet syns tydligt.
  _drawTilt() {
    const g = this._tiltG
    if (!g || g.destroyed) return
    g.clear()
    const px = 1086
    const py = 214
    const len = 74
    const ang = Math.PI / 2 + this._lean * 4.2
    const bx = px + Math.cos(ang) * len
    const by = py + Math.sin(ang) * len
    const level = Math.abs(this._lean) < 0.045
    // lodrät referens (prickad) + fäste + arm + lod
    for (let i = 1; i <= 5; i++) g.circle(px, py + (len / 5) * i, 2).fill({ color: COLORS.inkSoft, alpha: 0.22 })
    g.circle(px, py, 7).fill(COLORS.inkSoft)
    g.moveTo(px, py).lineTo(bx, by).stroke({ width: 5, color: COLORS.inkSoft, cap: 'round' })
    g.circle(bx, by, 16).fill(level ? COLORS.green : COLORS.orange).stroke({ width: 3, color: COLORS.white, alpha: 0.7 })
  },

  _drawHand() {
    const g = this._handG
    if (!g || g.destroyed || !this._carrier) return
    g.clear()
    const x = this._carrier.x
    const y = CARRIER_Y
    g.roundRect(x - 34, y + 30, 68, 22, 10).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
    g.roundRect(x - 46, y - 8, 12, 34, 6).fill(COLORS.orange)
    g.roundRect(x + 34, y - 8, 12, 34, 6).fill(COLORS.orange)
  },

  // Prickad lodlinje + landningsring (driftX kalibrerad mot matter, se docs).
  _drawGuide() {
    const g = this._guide
    if (!g || g.destroyed || !this._carrier) return
    g.clear()
    const x0 = this._carrier.x
    const y0 = CARRIER_Y + 48
    const yTop = STACK_Y[Math.min(this._count, STACK_Y.length - 1)]
    const fall = Math.max(40, yTop - CARRIER_Y)
    const steps = Math.sqrt((2 * fall) / (0.2778 * GRAV_Y))
    const driftX = 0.5 * (0.2778 * this._lean) * steps * steps
    const xLand = clamp(x0 + driftX, 120, 1160)
    const n = 9
    for (let i = 1; i <= n; i++) {
      const tt = i / n
      g.circle(x0 + (xLand - x0) * tt, y0 + (yTop - y0) * tt, 4).fill({ color: 0xffffff, alpha: 0.6 })
    }
    g.circle(xLand, yTop, 40).stroke({ width: 5, color: COLORS.yellow, alpha: 0.6 })
  },

  // Glansig glasskula: skugg-cirkel + (dold) klister-ring + färgcirkel + smak-dekor + glansfläck.
  _makeScoop(flavor) {
    const c = new Container()
    c._flavor = flavor
    c.addChild(new Graphics().circle(0, 8, SCOOP_VR).fill({ color: 0x000000, alpha: 0.18 }))
    const ring = new Graphics().circle(0, 0, SCOOP_VR + 5).stroke({ width: 5, color: 0xffcf3f, alpha: 0.95 })
    ring.visible = false
    c.addChild(ring)
    c._stickyRing = ring
    c.addChild(new Graphics().circle(0, 0, SCOOP_VR).fill(flavor.color).stroke({ width: 3, color: COLORS.white, alpha: 0.5 }))
    this._decorateScoop(c, flavor)
    c.addChild(new Graphics().circle(-16, -16, 12).fill({ color: 0xffffff, alpha: 0.6 }))
    return c
  },

  // Smak-specifik dekor ovanpå färgcirkeln: frön/strössel/chips/swirl → varje kula
  // ser ut som EN riktig smak i stället för en anonym cirkel.
  _decorateScoop(c, flavor) {
    const g = new Graphics()
    g.eventMode = 'none'
    switch (flavor.kind) {
      case 'strawberry':
        for (const [dx, dy] of [[-18, -6], [8, -18], [22, 6], [-4, 16], [-24, 12], [12, 22]]) g.ellipse(dx, dy, 3.5, 5).fill(0xc0392b)
        break
      case 'blueberry':
        for (const [dx, dy] of [[-16, -8], [10, -16], [20, 10], [-8, 18], [-22, 8], [6, 4]]) g.circle(dx, dy, 5).fill(0x5a3fa0)
        break
      case 'chocolate': {
        const cols = [0xff9ec4, 0xffd35c, 0x57c8c3, 0xffffff, 0x5bbf6a, 0xa78bfa]
        const pts = [[-20, -6], [-4, -18], [14, -12], [22, 6], [6, 16], [-16, 14], [-2, 2], [18, -2], [-10, -10]]
        pts.forEach(([dx, dy], i) => {
          if (i % 2) g.roundRect(dx - 6, dy - 2, 12, 4, 2).fill(cols[i % cols.length])
          else g.roundRect(dx - 2, dy - 6, 4, 12, 2).fill(cols[i % cols.length])
        })
        break
      }
      case 'mint':
        for (const [dx, dy] of [[-16, -6], [10, -14], [18, 8], [-6, 16], [-22, 10], [4, 0]]) g.circle(dx, dy, 5).fill(0x3a2a1e)
        break
      case 'vanilla':
        g.arc(0, 0, 30, -0.4, 2.4).stroke({ width: 5, color: 0xe8c37a, alpha: 0.8 })
        g.arc(2, 2, 15, 0.4, 3.2).stroke({ width: 5, color: 0xe8c37a, alpha: 0.7 })
        break
    }
    c.addChild(g)
  },

  _applyStickyLook(view, on) {
    if (view && view._stickyRing && !view._stickyRing.destroyed) view._stickyRing.visible = !!on
  },

  // ---- Städning (exit-säkert) --------------------------------------------

  _detachCarrier(view) {
    if (!view) return
    view.off('pointerdown', this._onScoopDown)
    view.off('globalpointermove', this._onScoopMove)
    view.off('pointerup', this._onScoopUp)
    view.off('pointerupoutside', this._onScoopUp)
    view.eventMode = 'none'
    view.hitArea = null
  },

  _clearLive() {
    for (const rec of this._live) {
      if (rec.body) this._phys.removeBody(rec.body)
      if (rec.view && !rec.view.destroyed) {
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
        rec.view.destroy({ children: true })
      }
    }
    this._live = []
    if (this._carrier && !this._carrier.destroyed) {
      this._detachCarrier(this._carrier)
      gsap.killTweensOf(this._carrier)
      gsap.killTweensOf(this._carrier.scale)
      this._carrier.destroy({ children: true })
    }
    this._carrier = null
    this._lastDropped = null
    this._lastRec = null
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._finishCall?.kill()
    this._cherryTween?.kill()
    this._serveTween?.kill()
    if (this._customer && !this._customer.destroyed) {
      gsap.killTweensOf(this._customer)
      gsap.killTweensOf(this._customer.scale)
    }
    if (this._serveItem && !this._serveItem.destroyed) gsap.killTweensOf(this._serveItem)

    if (this._plate && !this._plate.destroyed) this._plate.off('pointertap', this._onPlateTapBound)
    if (this._stickyBtn && !this._stickyBtn.destroyed) {
      this._stickyBtn.off('pointertap', this._onStickyBound)
      gsap.killTweensOf(this._stickyBtn.scale)
    }

    if (this._carrier && !this._carrier.destroyed) {
      this._detachCarrier(this._carrier)
      gsap.killTweensOf(this._carrier)
      gsap.killTweensOf(this._carrier.scale)
    }
    for (const rec of this._live || []) {
      if (rec.view && !rec.view.destroyed) {
        gsap.killTweensOf(rec.view)
        gsap.killTweensOf(rec.view.scale)
      }
    }
    if (this._cherry && !this._cherry.destroyed) gsap.killTweensOf(this._cherry)

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel?.()
    this._root?.destroy({ children: true })
  },
}
