// Ballonglyft — räkna RIKTIGA ballonger som lyfter (2–4 år). Elvira står på sin balkong
// och önskar sig ett antal ballonger (tankebubbla: "3 🎈"). Bobos present 🎁 vilar på
// marken. Ett antal LÖSA, färgglada heliumballonger flyter nere i bilden — barnet TRYCKER
// på en ballong i taget för att skicka upp den (ett-till-ett-korrespondens: barnet räknar
// FÖREMÅL, inte knapptryck). Varje ballong fäster ovanför paketet, lyfter det ETT TYDLIGT
// steg (vi räknar högt på svenska) och spelar en STIGANDE lyft-ton + ett mjukt helium-"fffp".
// När sista ballongen sitter glider paketet upp i Elviras famn → det ÖPPNAS och en
// överraskning (djur/leksak ur en pool) hoppar ut som hon kramar → firande, klistermärke,
// ny nivå (fler ballonger). En blek "spök-present" vid balkongen visar hela tiden vart det
// ska. Inget kan bli fel: trycker man på paketet vinglar det bara lite, och efter ~9s utan
// tryck LOCKAR en mjuk auto-hjälp först (Elvira vinkar, en ballong studsar) innan den till
// slut fäster en åt barnet. Allt ritas programmatiskt (Pixi Graphics + emoji). Exit-säkert.
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene, lerpColor } from '../../lib/scene.js'
import { drawIcon } from '../../lib/artikoner.js'
import { makeElvira } from '../../lib/figurer.js'
import { bounceIn, pop, wiggle, sparkle, burst, floatText, breathe } from '../../lib/feedback.js'
import { COLORS, FONT, PLAYFUL } from '../../lib/theme.js'

// Räkneord (index = antal ballonger). n=1 -> 'en', n=2 -> 'två' ...
const SVENSKA_TAL = ['noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta']

// Överraskningar som hoppar ur paketet (alla "en"-ord för rösten). Djur/leksak.
const SURPRISES = [
  { e: '🐻', namn: 'björn' },
  { e: '🐰', namn: 'kanin' },
  { e: '🐤', namn: 'kyckling' },
  { e: '🐶', namn: 'hund' },
  { e: '🐱', namn: 'katt' },
  { e: '🦊', namn: 'räv' },
  { e: '🧸', namn: 'nalle' },
  { e: '🐧', namn: 'pingvin' },
]

// Layout (designkoordinater 1280×720) — presenten lyfts rakt upp i kolumnen vid Elvira.
const BOX_X = 820
const GROUND_BOX_Y = 600 // presentens center när den vilar på marken

const IDLE_MS = 9000 // ms utan tryck → mjuk auto-hjälp LOCKAR först
const HELP_MS = 3500 // ytterligare tid efter lockandet → fäster då en ballong åt barnet

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// x-position för lös ballong i av n. Jämnt fördelade över nederkanten MINUS
// presentens kolumn (700..940): en ballong bakom paketet är osynlig, och rundan
// kunde då bara lösas av auto-hjälpen. Vänsterbandet fylls först.
const LOOSE_L0 = 120, LOOSE_L1 = 690, LOOSE_R0 = 950, LOOSE_R1 = 1160
function looseX(i, n) {
  const lw = LOOSE_L1 - LOOSE_L0
  const rw = LOOSE_R1 - LOOSE_R0
  const t = n <= 1 ? 0.5 : i / (n - 1)
  const d = t * (lw + rw)
  return d <= lw ? LOOSE_L0 + d : LOOSE_R0 + (d - lw)
}

export default {
  id: 'ballonglyft',
  titleSv: 'Ballonglyft',
  icon: '🎈',
  category: 'larande',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'ballonglyft',
  voiceIntro: 'Tryck på ballongerna en i taget — räkna så lyfter paketet upp till Elvira!',

  init(ctx) {
    this._alive = true
    this._ctx = ctx
    this._level = Math.max(1, (ctx.progress.get().highestLevel | 0) || 1)
    this._t = 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund (gradient + sol + moln + mark) som FÖRSTA barn, dekorativ.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Lager: balkong+Elvira+bubbla → spök-present (mål) → snören → ballonger → present → räknare.
    this._balcony = this._makeBalcony()
    this._root.addChild(this._balcony)

    // Blek "spök-present" vid balkongen — visar HELA tiden vart presenten ska.
    this._ghost = drawIcon('🎁', 104)
    this._ghost.alpha = 0.28
    this._ghost.eventMode = 'none'
    this._root.addChild(this._ghost)

    // Snören som binder de fästa ballongerna till paketet (en "bukett").
    this._strings = new Graphics()
    this._strings.eventMode = 'none'
    this._root.addChild(this._strings)

    // Ballonglager (både lösa nere och fästa ovanför paketet).
    this._balloonLayer = new Container()
    this._root.addChild(this._balloonLayer)

    this._box = this._makeBox(ctx)
    this._root.addChild(this._box)

    this._counter = this._makeCounter()
    this._root.addChild(this._counter)

    this._loose = []
    this._attached = []
    this._loadLevel(ctx, this._level)

    this._tick = () => this._update(ctx)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idleMs = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // --- Bygg-hjälpare ---------------------------------------------------------

  _makeBalcony() {
    // Lokala koordinater: plattans ovansida ligger på lokal y=0; container.y flyttas per nivå.
    const c = new Container()
    c.eventMode = 'none'
    c.interactiveChildren = false

    const rail = new Graphics()
    rail.roundRect(712, -36, 12, 42, 5).fill(0x6f4630)
    rail.roundRect(996, -36, 12, 42, 5).fill(0x6f4630)
    rail.roundRect(712, -36, 296, 10, 5).fill(0x6f4630)
    c.addChild(rail)

    const plate = new Graphics()
    plate.roundRect(700, 0, 320, 34, 14).fill(COLORS.brown).stroke({ width: 6, color: 0x6f4630 })
    c.addChild(plate)

    const elvira = makeElvira()
    elvira.position.set(BOX_X, 2)
    c.addChild(elvira)
    this._elvira = elvira

    const name = new Text({
      text: 'Elvira',
      style: { fontFamily: FONT.title, fontSize: 30, fontWeight: '700', fill: COLORS.ink },
    })
    name.anchor.set(0.5, 1)
    name.position.set(BOX_X, -104)
    c.addChild(name)

    // Tankebubbla som visar MÅLET: "N 🎈".
    const bubble = new Container()
    const bg = new Graphics()
      .circle(0, 0, 52).fill({ color: COLORS.white })
      .circle(-44, 40, 12).fill({ color: COLORS.white })
      .circle(-60, 58, 7).fill({ color: COLORS.white })
    const want = new Text({ text: '3', style: { fontFamily: FONT.display, fontSize: 52, fontWeight: '700', fill: COLORS.ink } })
    want.anchor.set(0.5)
    want.position.set(-16, 0)
    const balloon = drawIcon('🎈', 52)
    balloon.position.set(24, -4)
    bubble.addChild(bg, want, balloon)
    bubble.position.set(BOX_X + 96, -150)
    c.addChild(bubble)
    this._wantText = want

    return c
  },

  // En färgglad ballong ritad i Pixi Graphics (kropp + glans + knut + kort snöre).
  // Lokala koordinater: kroppens center = (0,0).
  _makeBalloon(color) {
    const b = new Container()
    const g = new Graphics()
    g.ellipse(0, 0, 34, 42).fill(color)
    g.ellipse(-12, -14, 8, 12).fill({ color: 0xffffff, alpha: 0.4 }) // glansfläck
    g.moveTo(-8, 40).lineTo(8, 40).lineTo(0, 52).closePath().fill(color) // knut
    g.moveTo(0, 52).quadraticCurveTo(10, 66, 2, 80).stroke({ width: 3, color: 0x8a7766, alpha: 0.8 }) // snöre
    g.eventMode = 'none'
    b.addChild(g)
    return b
  },

  _makeBox(ctx) {
    const box = new Container()

    const shadow = new Graphics().ellipse(0, 82, 70, 18).fill({ color: COLORS.shadow, alpha: 0.18 })
    shadow.eventMode = 'none'
    box.addChild(shadow)
    this._boxShadow = shadow

    const plate = new Graphics()
    plate.roundRect(-70, -70, 140, 140, 22).fill(COLORS.red).stroke({ width: 6, color: COLORS.orangeDark })
    plate.roundRect(-58, -60, 116, 26, 12).fill({ color: COLORS.white, alpha: 0.18 }) // glansband
    plate.eventMode = 'none'
    box.addChild(plate)

    const ribbon = new Graphics()
    ribbon.rect(-12, -70, 24, 140).fill(COLORS.yellow)
    ribbon.rect(-70, -12, 140, 24).fill(COLORS.yellow)
    ribbon.eventMode = 'none'
    box.addChild(ribbon)

    // Locket med rosett är ETT EGET lager — det är det som försvinner när paketet
    // öppnas. Tidigare låg en 🎁-emoji ovanpå den redan ritade lådan (två presenter
    // i varandra) och det var emojin som gömdes.
    const lid = new Graphics()
    lid.roundRect(-78, -84, 156, 34, 12).fill(COLORS.red).stroke({ width: 6, color: COLORS.orangeDark })
    lid.roundRect(-68, -80, 136, 10, 5).fill({ color: COLORS.white, alpha: 0.22 })
    lid.rect(-12, -84, 24, 34).fill(COLORS.yellow)
    lid.moveTo(-6, -84).quadraticCurveTo(-52, -122, -26, -84).closePath().fill(COLORS.yellow)
    lid.moveTo(6, -84).quadraticCurveTo(52, -122, 26, -84).closePath().fill(COLORS.yellow)
    lid.circle(0, -86, 9).fill(COLORS.yellow).stroke({ width: 4, color: COLORS.orangeDark })
    lid.eventMode = 'none'
    box.addChild(lid)
    this._gift = lid

    // Att trycka på paketet är bara lekfullt (vinglar + lockar) — aldrig "fel".
    box.eventMode = 'static'
    box.cursor = 'pointer'
    box.hitArea = new Rectangle(-80, -90, 160, 180)
    box.on('pointertap', () => this._pokeBox(ctx))
    return box
  },

  _makeCounter() {
    const c = new Container()
    // 170,150 lade räknarens övre vänstra hörn under hemknappen (som slutar 115,112).
    c.position.set(205, 178)
    c.eventMode = 'none'
    const plate = new Graphics()
    plate.roundRect(-72, -58, 144, 116, 24).fill(COLORS.cream).stroke({ width: 5, color: COLORS.orange })
    c.addChild(plate)
    const t = new Text({
      text: '0',
      style: { fontFamily: FONT.display, fontSize: 96, fontWeight: '700', fill: COLORS.ink, align: 'center' },
    })
    t.anchor.set(0.5)
    t.position.set(0, 2)
    c.addChild(t)
    this._countText = t
    return c
  },

  // --- Nivå-laddning ---------------------------------------------------------

  _loadLevel(ctx, level) {
    if (!this._alive) return
    this._level = level

    // Antal ballonger som krävs växer med nivån (3→8) — lika många LÖSA ballonger spawnas.
    this._N = clamp(2 + level + (Math.random() < 0.5 ? 0 : 1), 3, 8)
    // Balkongen sitter högt så lyftet syns; lite högre per nivå (förblir lösbar; steget = total/N).
    this._balconyY = 250 - Math.min(level - 1, 5) * 16
    this._targetY = this._balconyY + 40 // dit presentens center når när Elvira tar emot

    // Nollställ tillstånd.
    this._n = 0
    this._idleMs = 0
    this._enticed = false
    this._resolving = false

    // Töm ballonger (både lösa och fästa) + eventuell överraskning.
    this._clearBalloons()
    this._clearSurprise()

    // Present tillbaka på marken; lock/glans synlig igen.
    gsap.killTweensOf(this._box)
    gsap.killTweensOf(this._box.scale)
    this._box.position.set(BOX_X, GROUND_BOX_Y)
    this._box.rotation = 0
    this._box.visible = true
    this._box.scale.set(1)
    if (this._gift && !this._gift.destroyed) this._gift.visible = true

    // Balkong/Elvira till nivåns höjd; mål-bubbla + spök-present.
    this._balcony.y = this._balconyY
    this._elvira.rotation = 0
    if (this._wantText && !this._wantText.destroyed) this._wantText.text = String(this._N)
    this._ghost.position.set(BOX_X, this._targetY)
    this._ghostBreathe?.kill()
    this._ghostBreathe = breathe(this._ghost, { scale: 1.06, duration: 1.2 })
    this._updateCounter(false)
    this._strings.clear()

    // Spawna N LÖSA, färgglada ballonger längs nederkanten — en per önskad ballong.
    for (let i = 0; i < this._N; i++) {
      const x = looseX(i, this._N)
      const y = 610 + (i % 2) * 26
      const color = PLAYFUL[(i + level) % PLAYFUL.length]
      const b = this._makeBalloon(color)
      b.position.set(x, y)
      b._baseX = x
      b._baseY = y
      b._phase = i * 0.7
      b._taken = false
      b._flying = false
      b.eventMode = 'static'
      b.cursor = 'pointer'
      b.hitArea = new Rectangle(-52, -56, 104, 130) // generös träffyta ≥96px
      b.on('pointertap', () => this._attachLoose(ctx, b))
      this._balloonLayer.addChild(b)
      this._loose.push(b)
      bounceIn(b, { delay: i * 0.05 })
    }
  },

  _clearBalloons() {
    const all = [...(this._loose || []), ...(this._attached || [])]
    all.forEach((b) => {
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.position)
      gsap.killTweensOf(b.scale)
      if (!b.destroyed) b.destroy({ children: true })
    })
    this._loose = []
    this._attached = []
    this._balloonLayer.removeChildren()
  },

  _clearSurprise() {
    this._surpriseTl?.kill()
    this._surpriseTl = null
    if (this._surprise && !this._surprise.destroyed) this._surprise.destroy()
    this._surprise = null
  },

  // Presentens center-y för c fästa ballonger (0 → marken, N → uppe hos Elvira).
  _riseY(c) {
    return GROUND_BOX_Y - (GROUND_BOX_Y - this._targetY) * (c / this._N)
  },

  // Solfjäder-punkt för fäst ballong nr i (av n) när paketet står på boxY.
  _fanPoint(i, n, boxY) {
    const angle = -Math.PI / 2 + (i - (n - 1) / 2) * 0.3
    const radius = 92
    return { x: BOX_X + Math.cos(angle) * radius, y: boxY - 92 + Math.sin(angle) * radius }
  },

  // --- Kontroll: skicka upp en LÖS ballong -----------------------------------

  _attachLoose(ctx, b, opts = {}) {
    if (!this._alive || this._resolving) return
    if (!b || b.destroyed || b._taken) return
    b._taken = true
    b._flying = true
    b.eventMode = 'none'
    this._idleMs = 0
    this._enticed = false

    this._n++
    const idx = this._n - 1
    this._attached.push(b)
    this._updateCounter()
    pop(b)

    // Ljud: pop + mjukt helium-"fffp" + STIGANDE lyft-ton (klättrar mot målet).
    ctx.services.audio.sfx('pop')
    this._heliumFffp(ctx)
    this._liftTone(ctx, this._n)

    // Räkna högt på svenska (varje gång — räkning är poängen).
    if (SVENSKA_TAL[this._n]) ctx.services.voice.say(SVENSKA_TAL[this._n])

    // Ballongen flyger upp till sin plats i buketten ovanför paketet.
    const reached = this._n >= this._N
    const boxTargetY = this._riseY(this._n)
    const slot = this._fanPoint(idx, this._n, boxTargetY)
    gsap.killTweensOf(b.position)
    gsap.to(b.position, {
      x: slot.x,
      y: slot.y,
      duration: 0.5,
      ease: 'back.out(1.3)',
      onComplete: () => {
        if (!b.destroyed) b._flying = false
      },
    })

    // Presenten lyfts ett tydligt steg uppåt. Sista ballongen → upp till Elvira.
    gsap.killTweensOf(this._box)
    this._riseTween = gsap.to(this._box, {
      y: boxTargetY,
      duration: 0.55,
      ease: reached ? 'power2.inOut' : 'back.out(1.3)',
      onComplete: () => {
        if (this._alive && reached) this._succeed(ctx)
      },
    })
    sparkle(ctx.fxLayer, BOX_X, boxTargetY - 110, { count: 4 })
  },

  // Mjukt helium-"fffp" när en ballong fäster (kort uppåt-chirp).
  _heliumFffp(ctx) {
    ctx.services.audio.tone({ freq: 680, slideTo: 1500, dur: 0.11, type: 'sine', vol: 0.1 })
  },

  // Stigande lyft-ton: tonhöjden klättrar med antalet ballonger mot målet.
  _liftTone(ctx, n) {
    const frac = clamp(n / this._N, 0, 1)
    const base = 380 + frac * 520 // ~380 → ~900 Hz
    ctx.services.audio.tone({ freq: base, slideTo: base * 1.18, dur: 0.22, type: 'triangle', vol: 0.16 })
  },

  // Trycka på paketet: bara lekfullt + en vänlig knuff mot att räkna ballonger.
  _pokeBox(ctx) {
    if (!this._alive || this._resolving) return
    wiggle(this._box)
    ctx.services.audio.sfx('soft')
    const next = this._loose.find((x) => !x._taken)
    if (next) {
      pop(next)
      ctx.services.voice.say('Tryck på en ballong!')
      this._idleMs = 0
      this._enticed = false
    }
  },

  _updateCounter(animate = true) {
    if (!this._countText || this._countText.destroyed) return
    this._countText.text = String(this._n)
    if (animate) pop(this._counter)
  },

  // Rita bukett-snören från paketets knut till varje fäst ballong.
  _drawStrings() {
    const box = this._box
    const topX = box.x
    const topY = box.y - 66
    this._strings.clear()
    for (const b of this._attached) {
      if (b.destroyed || b._flying) continue
      this._strings.moveTo(topX, topY).lineTo(b.x, b.y + 44)
    }
    this._strings.stroke({ width: 3, color: 0x8a7766, alpha: 0.7 })
  },

  // Håll fästa ballonger i solfjäder + låt lösa ballonger bobba lugnt.
  _layoutBalloons() {
    const n = this._attached.length
    for (let i = 0; i < n; i++) {
      const b = this._attached[i]
      if (b.destroyed || b._flying) continue
      const p = this._fanPoint(i, n, this._box.y)
      b.x = p.x
      b.y = p.y + Math.sin(this._t * 0.003 + i) * 5
    }
    for (const b of this._loose) {
      if (b.destroyed || b._taken) continue
      b.y = b._baseY + Math.sin(this._t * 0.002 + b._phase) * 8
    }
  },

  // --- Huvudloop: bobb + snören + idle/auto-hjälp -----------------------------

  _update(ctx) {
    if (!this._alive) return
    this._t += ctx.ticker.deltaMS
    this._layoutBalloons()
    this._drawStrings()

    if (this._resolving) return
    if (this._n >= this._N) return

    this._idleMs += ctx.ticker.deltaMS

    // Fas 1 (~9s): LOCKA först — Elvira vinkar, en ballong studsar, röst uppmuntrar.
    if (!this._enticed && this._idleMs >= IDLE_MS) {
      this._enticed = true
      const next = this._loose.find((x) => !x._taken)
      if (next) {
        wiggle(this._elvira)
        pop(next)
        floatText(ctx.fxLayer, next.x, next.y - 70, '👆', { fontSize: 48, rise: 40 })
        ctx.services.voice.say('Tryck på en ballong till!')
      }
      return
    }

    // Fas 2 (~+3,5s): om barnet ändå väntar, fäst en ballong åt det (garanterad framgång).
    if (this._enticed && this._idleMs >= IDLE_MS + HELP_MS) {
      const next = this._loose.find((x) => !x._taken)
      if (next) {
        ctx.services.voice.say('Jag hjälper dig — en ballong till!')
        this._attachLoose(ctx, next, { auto: true })
      }
    }
  },

  _succeed(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true

    ctx.services.audio.sfx('correct')

    // Presenten glider de sista pixlarna in i Elviras famn → öppnas där.
    gsap.killTweensOf(this._box)
    gsap.to(this._box, {
      y: this._balconyY - 6,
      duration: 0.45,
      ease: 'power2.out',
      onComplete: () => {
        if (this._alive) this._openPackage(ctx)
      },
    })
    pop(this._elvira)

    // Förlopp + delat firande (firar-ljud + beröm-röst + konfetti + stjärna + klistermärke).
    ctx.progress.setLevel(this._level + 1)
    const got = ctx.progress.get().custom?.leveranser || 0
    ctx.progress.setCustom('leveranser', got + 1)
    ctx.progress.complete()

    this._levelCall = gsap.delayedCall(2.7, () => {
      if (this._alive) this._loadLevel(ctx, this._level + 1)
    })
  },

  // Paketet spricker upp och en överraskning hoppar ut → Elvira kramar den.
  _openPackage(ctx) {
    if (!this._alive || this._box?.destroyed) return
    const pick = SURPRISES[(Math.random() * SURPRISES.length) | 0]

    const bx = this._box.x
    const by = this._box.y
    if (this._gift && !this._gift.destroyed) this._gift.visible = false
    pop(this._box)
    ctx.services.audio.sfx('reveal')
    sparkle(ctx.fxLayer, bx, by - 30, { count: 8 })
    burst(ctx.fxLayer, bx, by - 20, { power: 1 })

    // Överraskningen: hoppar upp ur paketet och sedan in i Elviras famn.
    const s = drawIcon(pick.e, 96)
    s.position.set(bx, by - 20)
    s.scale.set(0.2)
    s.eventMode = 'none'
    this._root.addChild(s)
    this._surprise = s

    const armX = BOX_X
    const armY = this._balconyY - 30
    const st = { x: bx, y: by - 20, s: 0.2, rot: 0 }
    const apply = () => {
      if (s.destroyed) return
      s.x = st.x
      s.y = st.y
      s.rotation = st.rot
      s.scale.set(st.s)
    }
    this._surpriseTl?.kill()
    this._surpriseTl = gsap.timeline()
      .to(st, { s: 1, y: by - 120, duration: 0.4, ease: 'back.out(2)', onUpdate: apply })
      .to(st, {
        x: armX,
        y: armY,
        rot: 0.12,
        duration: 0.5,
        ease: 'power1.inOut',
        onUpdate: apply,
        onComplete: () => {
          if (!this._alive) return
          pop(this._elvira)
          if (!s.destroyed) burst(ctx.fxLayer, armX, armY, { power: 0.9 })
        },
      })

    ctx.services.voice.say(`Titta, en ${pick.namn}! Tack så mycket!`)
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    ctx.services.voice.cancel()
    this._levelCall?.kill()
    this._riseTween?.kill()
    this._ghostBreathe?.kill()
    this._surpriseTl?.kill()
    if (this._box) {
      gsap.killTweensOf(this._box)
      gsap.killTweensOf(this._box.scale)
    }
    if (this._ghost) gsap.killTweensOf(this._ghost.scale)
    if (this._counter) gsap.killTweensOf(this._counter.scale)
    if (this._elvira) gsap.killTweensOf(this._elvira.scale)
    ;[...(this._loose || []), ...(this._attached || [])].forEach((b) => {
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.position)
      gsap.killTweensOf(b.scale)
    })
    if (this._surprise && !this._surprise.destroyed) gsap.killTweensOf(this._surprise)
    this._root?.destroy({ children: true })
  },
}

