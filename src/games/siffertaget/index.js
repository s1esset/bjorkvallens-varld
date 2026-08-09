// Siffertåget — siffer-/räknelek med tågtema (3–5 år). Ett glatt ånglok står till
// vänster; barnet kopplar på de numrerade vagnarna i stigande ordning (1→N) genom
// att dra (eller tap-tap) dem till nästa lediga kopplingsplats. Den vagn som står
// näst på tur "lyser" (glöd-puls) så fel ordning aldrig kan bli permanent. Rätt =>
// pling + gnistra + rösten räknar ("Ett!", "Två!"). Fel/fel plats => mjuk pys
// tillbaka (aldrig en bestraffning). När tåget är helt tutar det och rullar iväg
// ("Tut tut!"), konfetti, och en ny (ev. längre) runda startar. Oändlig lek, ingen
// poäng, ingen timer, inga felsteg. All async är skyddad med this._alive (exit-säkert).
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, wiggle, sparkle, puff, bigCelebration } from '../../lib/feedback.js'
import { drawIcon } from '../../lib/artikoner.js'
import { COLORS, FONT, PLAYFUL, PRAISE } from '../../lib/theme.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

// Räkneorden 1–5 (rundans vagnar håller sig alltid inom 1–5).
const SIFFROR = { 1: 'Ett', 2: 'Två', 3: 'Tre', 4: 'Fyra', 5: 'Fem' }
const SIFFROR_LOW = { 1: 'ett', 2: 'två', 3: 'tre', 4: 'fyra', 5: 'fem' }
// Ord för antalet last-föremål (för räkne-frasen "…tre äpplen").
const LAST_ORD = {
  1: { emoji: '🌸', ental: 'blomma', flertal: 'blommor' },
  2: { emoji: '🐟', ental: 'fisk', flertal: 'fiskar' },
  3: { emoji: '🍎', ental: 'äpple', flertal: 'äpplen' },
  4: { emoji: '🐤', ental: 'ankunge', flertal: 'ankungar' },
  5: { emoji: '⭐', ental: 'stjärna', flertal: 'stjärnor' },
}

// Layout (designkoordinater 1280x720).
// VIKTIGT om riktningen: loket ritas med kofångare, panna och skorsten till VÄNSTER om
// sitt origo — fronten pekar alltså åt vänster — och vagnarna hängs på åt HÖGER. Därför
// måste tåget rulla iväg åt VÄNSTER (loket först ur bild, sista vagnen sist). Allt som
// rör avfärden nedan utgår från det.
const RAIL_Y = 300
const ENGINE_Y = 250
const ENGINE_NOSE = 122 // hur långt loket sticker ut till vänster om sitt origo (kofångaren)
const ENGINE_GAP = 200 // lok-origo -> första kopplingsplatsens centrum (koppel möter koppel)
const CAR_HALF = 85 // halva vagnskorgen
const SLOT_Y = 245
const SLOT_STEP = 188 // 170 vagnsbredd + 18 -> kopplingsstumparna möts snyggt
const POOL_Y = 560
const DEPART_DX = 1500 // minsta rullsträcka (åt vänster) vid avfärd — förlängs efter ctx.view
const DEPART_TIME = 1.5
const DEPART_STAGGER = 0.035 // stafett: varje vagn rycker med strax efter den framför

export default {
  id: 'siffertaget',
  titleSv: 'Siffertåget',
  icon: '🚂',
  category: 'larande',
  input: 'mixed',
  ageRange: [3, 5],
  bundle: 'siffertaget',
  voiceIntro: 'Hjälp tåget! Sätt vagnarna i ordning, ett, två, tre.',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._resolving = false
    this._cars = []
    this._slots = []
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Lugn bakgrund (dekorativ, fångar inga tryck). Breddad med BLEED så en bred
    // telefon (full bleed) aldrig ser creme-kanter utanför 0..1280. Tonen är en varm
    // himmel (samma som scene.js warm-tema) i stället för COLORS.bg: den färgen ÄR
    // letterbox-cremen, så en bakgrund i exakt den tonen kan aldrig läsas som scen —
    // varken av ögat eller av bildkollens kant-cream-mätning.
    const bg = new Graphics().rect(-BLEED_X, -BLEED_Y, ctx.width + 2 * BLEED_X, ctx.height + 2 * BLEED_Y).fill(0xfff0d6)
    bg.eventMode = 'none'
    this._root.addChild(bg)

    // Statisk räls + lok byggs en gång; vagnar/slots byggs om per runda.
    this._engineX = this._engineXFor(3)
    this._root.addChild(this._buildRail())

    // Rundans föränderliga innehåll (slots + lösa vagnar) ligger UNDER loket, så att
    // loket kör snyggt förbi de halvgenomskinliga spökrutorna när det rullar in.
    this._roundLayer = new Container()
    this._root.addChild(this._roundLayer)

    this._engine = this._buildEngine()
    this._root.addChild(this._engine)

    // Egen behållare för ångpuffarna ur skorstenen (överst — röken syns alltid).
    // Förstörs med _root vid exit -> ingen läcka.
    this._steamLayer = new Container()
    this._steamLayer.eventMode = 'none'
    this._root.addChild(this._steamLayer)

    this._drag = new DragController({ space: this._root, services: ctx.services, skugga: true })

    this._newRound(ctx)

    // Levande lok: hjul som guppar lätt + en svag vagga, och en loop med ång-puffar.
    this._startLocoLife(ctx)

    // Idle-recue (~6s): GameHost gör ingen egen, så vi sköter en mjuk ledtråd.
    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Räls: korta sliprar + en lång brun balk ovanpå.
  _buildRail() {
    const rail = new Container()
    rail.eventMode = 'none'
    const g = new Graphics()
    for (let x = 70; x <= 1210; x += 60) g.rect(x - 7, RAIL_Y - 4, 14, 30).fill({ color: COLORS.brown, alpha: 0.55 })
    g.roundRect(60, RAIL_Y, 1160, 18, 9).fill(COLORS.brown)
    rail.addChild(g)
    return rail
  },

  // Centrera hela tågsättet (lok + n vagnsplatser) i bilden och returnera lokets x.
  // Med n=5 blir loket x≈183 (vänsterkant 61) och sista vagnens högerkant ≈1220 —
  // balanserat, inget under hem-/högtalarknapparna, och gott om räls kvar att rulla på.
  _engineXFor(n) {
    const span = ENGINE_NOSE + ENGINE_GAP + (n - 1) * SLOT_STEP + CAR_HALF
    return Math.round(640 - span / 2 + ENGINE_NOSE)
  },

  // Ånglok ritat helt med Pixi Graphics så det tydligt läses som ett tåg:
  // kofångare + panna (boiler) med skorsten och ångdom till vänster (fronten),
  // hytt med tak och fönster till höger (mot vagnarna) och runda hjul under.
  // Ingen emoji/ikon inuti — bara loket.
  _buildEngine() {
    const eng = new Container()
    eng.position.set(this._engineX, ENGINE_Y)
    eng.eventMode = 'none'

    // Hjulen i en egen behållare så de kan gunga lätt (levande lok) utan att röra
    // resten av loket; ritas först så chassi/kropp täcker överkanten (rullar på rälsen).
    const wheels = new Graphics()
    wheels.eventMode = 'none'
    const wheel = (cx, cy, r) => {
      wheels.circle(cx, cy, r).fill(COLORS.ink).stroke({ width: 3, color: COLORS.white, alpha: 0.3 })
      wheels.circle(cx, cy, r * 0.45).fill(COLORS.inkSoft)
      wheels.circle(cx, cy, 4).fill(COLORS.ink)
    }
    wheel(-70, 48, 16) // litet löphjul fram
    wheel(-28, 50, 28) // drivhjul
    wheel(44, 50, 28) // drivhjul
    eng.addChild(wheels)
    eng._wheels = wheels

    const g = new Graphics()

    // Kofångare (pilot) längst fram till vänster.
    g.poly([-96, 22, -120, 52, -96, 52]).fill(COLORS.orangeDark)
    // Chassi/fotplåt.
    g.roundRect(-98, 24, 200, 18, 7).fill(COLORS.ink)

    // Pannans kropp (boiler) + mörkare smokebox-ring + strålkastare fram.
    g.roundRect(-100, -34, 150, 64, 22).fill(COLORS.red).stroke({ width: 5, color: COLORS.white, alpha: 0.45 })
    g.roundRect(-99, -30, 24, 56, 13).fill(COLORS.orangeDark)
    g.circle(-89, -2, 11).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.white, alpha: 0.6 })

    // Hytt (cab) bak till höger, med tak-överhäng och fönster mot vagnarna.
    g.roundRect(36, -60, 60, 90, 16).fill(COLORS.red).stroke({ width: 5, color: COLORS.white, alpha: 0.45 })
    g.roundRect(28, -68, 80, 16, 8).fill(COLORS.orangeDark) // tak
    g.roundRect(50, -46, 38, 34, 9).fill(COLORS.yellow).stroke({ width: 4, color: COLORS.white, alpha: 0.5 })

    // Skorsten (funnel) på pannan, vidare upptill.
    g.poly([-78, -34, -84, -66, -54, -66, -60, -34]).fill(COLORS.ink)
    g.roundRect(-86, -74, 36, 13, 6).fill(COLORS.ink)
    // Ångdom mitt på pannan.
    g.roundRect(-30, -50, 32, 20, 9).fill(COLORS.yellow)
    g.circle(-14, -50, 9).fill(COLORS.yellow)

    // Koppel mot första vagnen.
    g.roundRect(94, 6, 16, 12, 4).fill(COLORS.ink)

    eng.addChild(g)
    return eng
  },

  // Levande lok: hjulen guppar lätt + ång-puffar ur skorstenen i loop. Vaggan
  // (_startRock) startas/återställs per runda eftersom _newRound dödar lok-tweens.
  _startLocoLife(ctx) {
    if (!this._alive || !this._engine || this._engine.destroyed) return
    // Hjulen guppar en aning (egen behållare -> stör inte vaggan eller utrullningen).
    if (this._engine._wheels) {
      this._wheelBob = gsap.to(this._engine._wheels, {
        y: 2,
        duration: 0.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      })
    }
    // Ång-puffar var ~1,4:e sekund.
    this._steam = gsap
      .timeline({ repeat: -1 })
      .to({}, { duration: 1.4 })
      .call(() => this._emitSteam(ctx))
  },

  // Svag fram-och-tillbaka-vagga på loket (y-gupp + pytteliten rotation). Dödas av
  // gsap.killTweensOf(this._engine) i _newRound, så vi startar om den där.
  _startRock() {
    this._rock?.kill()
    this._rock = null
    if (!this._alive || !this._engine || this._engine.destroyed) return
    this._engine.y = ENGINE_Y
    this._engine.rotation = 0
    this._rock = gsap
      .timeline({ repeat: -1 })
      .to(this._engine, { y: ENGINE_Y - 3, rotation: 0.012, duration: 1.0, ease: 'sine.inOut' })
      .to(this._engine, { y: ENGINE_Y, rotation: -0.012, duration: 1.0, ease: 'sine.inOut' })
      .to(this._engine, { y: ENGINE_Y - 2, rotation: 0.006, duration: 0.9, ease: 'sine.inOut' })
      .to(this._engine, { y: ENGINE_Y, rotation: 0, duration: 0.9, ease: 'sine.inOut' })
  },

  // En mjuk vit ångpuff ur skorstenen som stiger, växer och tonar bort. Exit-säkert:
  // tweenar ett vanligt objekt och rör Pixi-objektet bara om det lever (förstörs med
  // _steamLayer/_root vid exit -> kan aldrig krascha på null-transform).
  _emitSteam(ctx) {
    if (!this._alive || !this._steamLayer || this._steamLayer.destroyed) return
    if (!this._engine || this._engine.destroyed) return
    // Följ skorstenen där loket FAKTISKT är just nu (det rullar in och ut ur bild).
    const x0 = this._engine.x - 68 + (Math.random() * 10 - 5)
    const y0 = this._engine.y - 80
    const p = new Graphics().circle(0, 0, 9 + Math.random() * 5).fill({ color: COLORS.white, alpha: 0.75 })
    p.position.set(x0, y0)
    p.eventMode = 'none'
    this._steamLayer.addChild(p)
    const st = { x: x0, y: y0, s: 0.6, a: 0.7 }
    const tw = gsap.to(st, {
      // Ångan driver BAKÅT (åt höger) — tåget kör åt vänster, så röken hamnar efter det.
      x: x0 + 24 + Math.random() * 20,
      y: y0 - 70 - Math.random() * 30,
      s: 1.7,
      a: 0,
      duration: 1.6,
      ease: 'power1.out',
      onUpdate: () => {
        if (p.destroyed) {
          tw.kill()
          return
        }
        p.position.set(st.x, st.y)
        p.scale.set(st.s)
        p.alpha = st.a
      },
      onComplete: () => {
        if (!p.destroyed) p.destroy()
      },
    })
  },

  // Spökruta: ljus rundad ruta med streck-kant — visar var nästa vagn ska kopplas.
  _makeSlot() {
    const s = new Container()
    const g = new Graphics()
      .roundRect(-85, -75, 170, 150, 20)
      .fill({ color: COLORS.white, alpha: 0.35 })
      .stroke({ width: 5, color: COLORS.ink, alpha: 0.4 })
    g.eventMode = 'none'
    s.addChild(g)
    s.hitArea = new Rectangle(-95, -85, 190, 170)
    return s
  },

  // En tågvagn: glöd-halo (dold tills aktiv) + färgad kropp + hjul + stor siffra +
  // prickrad (icke-läsande stöd). Träffyta 190x170 (>96px med hit-halo).
  _makeCar(n) {
    const car = new Container()
    const glow = new Graphics().roundRect(-97, -87, 194, 174, 26).fill(COLORS.yellow)
    glow.alpha = 0
    glow.eventMode = 'none'
    const body = new Graphics()
    // Hjul med nav (ritas först).
    ;[-45, 45].forEach((wx) => {
      body.circle(wx, 70, 24).fill(COLORS.ink).stroke({ width: 3, color: COLORS.white, alpha: 0.3 })
      body.circle(wx, 70, 11).fill(COLORS.inkSoft)
      body.circle(wx, 70, 4).fill(COLORS.ink)
    })
    // Chassi + koppel-stumpar på sidorna (kopplar ihop vagnarna).
    body.roundRect(-82, 52, 164, 16, 6).fill(COLORS.ink)
    body.roundRect(-94, 54, 14, 10, 3).fill(COLORS.ink)
    body.roundRect(80, 54, 14, 10, 3).fill(COLORS.ink)
    // Vagnskorg + lätt takdager.
    body
      .roundRect(-85, -75, 170, 132, 20)
      .fill(PLAYFUL[(n - 1) % PLAYFUL.length])
      .stroke({ width: 6, color: COLORS.white, alpha: 0.7 })
    body.roundRect(-78, -70, 156, 24, 12).fill({ color: COLORS.white, alpha: 0.16 })
    // Lastbädd: en mörkare remsa i korgens botten som lasten vilar på. Utan den
    // flyter föremålen i vagnsfärgen (blomman försvann nästan mot den orange vagnen).
    body.roundRect(-74, 18, 148, 36, 12).fill({ color: 0x000000, alpha: 0.13 })
    body.eventMode = 'none'
    const num = new Text({
      text: String(n),
      style: { fontFamily: FONT.display, fontSize: 78, fontWeight: '700', fill: COLORS.white, align: 'center' },
    })
    num.anchor.set(0.5)
    num.position.set(0, -20)
    num.eventMode = 'none'
    // Lasta vagnen med exakt n tematiska föremål (3 äpplen i vagn 3, 4 ankungar i
    // vagn 4 …) — så barnet kopplar siffra <-> antal och kan RÄKNA sakerna, inte bara
    // jaga glöden. En liten rad längst ned i korgen; skalas ned när det blir trångt.
    const cargo = new Container()
    cargo.eventMode = 'none'
    // Lasten RITAS (P0 ASSETS) — det är de här föremålen barnet ska räkna, så de får
    // inte vara emoji-glyfer. Emoji-strängen är kvar som nyckel in i artikoner.js.
    const key = (LAST_ORD[n] || LAST_ORD[1]).emoji
    const size = n >= 4 ? 30 : 36
    const spacing = n >= 4 ? 31 : 37
    for (let i = 0; i < n; i++) {
      const it = drawIcon(key, size)
      it.position.set(-((n - 1) * spacing) / 2 + i * spacing, 36)
      cargo.addChild(it)
    }
    car.addChild(glow, body, num, cargo)
    car.hitArea = new Rectangle(-97, -87, 194, 174)
    car._glow = glow
    return car
  },

  // Markera vilken vagn som står näst på tur: pulsa dess glöd, släck förra.
  _setActiveCar(n) {
    this._pulse?.kill()
    this._pulse = null
    const prev = this._activeCar
    if (prev && !prev.destroyed && prev._glow) {
      gsap.killTweensOf(prev._glow)
      prev._glow.alpha = 0
    }
    this._activeCar = null
    const car = this._cars.find((c) => !c.destroyed && !c._placed && c._n === n)
    if (!car) return
    this._activeCar = car
    car._glow.alpha = 0.45
    this._pulse = gsap.to(car._glow, { alpha: 0.9, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  // Bygg en ny runda: rensa förra, beräkna N (växer med nivå), lägg ut slots +
  // blandade vagnar, markera vagn 1 som aktiv.
  _newRound(ctx) {
    if (!this._alive) return
    this._depart?.kill()
    this._depart = null
    this._rollIn?.kill()
    this._rollIn = null
    this._wheelBob?.timeScale(1)
    this._clearRound()
    this._placedCount = 0
    this._expected = 1
    this._resolving = false
    this._idle = 0
    const N = Math.min(5, 3 + Math.floor(this._level / 2)) // 3 → 4 → 5
    this._N = N

    gsap.killTweensOf(this._engine)
    this._engineX = this._engineXFor(N) // tågsättet centreras efter hur många vagnar rundan har
    this._startRock() // vaggan dödas ovan -> starta om (återställer även y/rotation)
    // Ett nytt lok rullar in från HÖGER och bromsar in på sin plats — fronten pekar åt
    // vänster, så det kör framlänges in precis som det strax kör framlänges ut.
    // Parkeringen utgår från ctx.view.right (läses vid användning): på en bred telefon
    // syns designkoordinater bortom 1280, och loket får inte stå synligt och vänta.
    this._engine.x = ctx.view.right + 240
    this._rollIn = gsap.to(this._engine, { x: this._engineX, duration: 1.1, ease: 'power2.out' })

    // Kopplingsplatser: en target per slot, men accepts kräver rätt siffra OCH att
    // sloten är den näst lediga -> omöjligt att placera i fel ordning.
    for (let i = 0; i < N; i++) {
      const slot = this._makeSlot()
      slot.position.set(this._engineX + ENGINE_GAP + i * SLOT_STEP, SLOT_Y)
      slot._index = i
      this._roundLayer.addChild(slot)
      this._slots.push(slot)
      this._drag.addTarget(slot, (data) => data.n === this._expected && slot._index === this._placedCount, { hitRadius: 130 })
    }

    // Lösa vagnar i blandad ordning längs nederkanten.
    const order = shuffle(Array.from({ length: N }, (_, k) => k + 1))
    order.forEach((n, i) => {
      const car = this._makeCar(n)
      car.position.set(N === 1 ? 640 : 170 + ((1110 - 170) * i) / (N - 1), POOL_Y)
      car._n = n
      car._placed = false
      this._roundLayer.addChild(car)
      this._cars.push(car)
      bounceIn(car, { delay: i * 0.08 })
      this._drag.addItem(car, { n }, {
        onSelect: () => {
          if (this._alive) this._idle = 0
        },
        onWrong: (rec) => {
          if (!this._alive || this._resolving) return
          this._idle = 0
          wiggle(rec.view) // DragController spelar redan 'soft' + snäpper hem
        },
        onCorrect: (rec, target) => this._onCorrect(ctx, rec, target),
      })
    })

    this._setActiveCar(1)
  },

  // Rätt vagn på rätt plats: räkna, gnistra, koppla på och gå vidare.
  _onCorrect(ctx, rec, target) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    rec.view._placed = true
    const n = rec.data.n

    ctx.services.audio.sfx('correct')
    // Mjukt tåg-"tut" vid varje koppling; tonhöjden KLÄTTRAR ju fler vagnar som
    // hängts på (kombo-känsla). audio.tone går förbi anti-loop-skyddet med flit.
    const base = 220 + this._placedCount * 34
    ctx.services.audio.tone({ freq: base, dur: 0.24, type: 'triangle', vol: 0.18, slideTo: base * 1.18 })
    ctx.services.audio.tone({ freq: base * 1.5, dur: 0.24, type: 'sine', vol: 0.08, slideTo: base * 1.5 * 1.18 })
    // Räkna OCH knyt siffran till antalet last-föremål ("Tre! Tre äpplen!").
    const lo = LAST_ORD[n] || LAST_ORD[1]
    ctx.services.voice.say(`${SIFFROR[n] || n}! ${n === 1 ? 'En' : SIFFROR[n]} ${n === 1 ? lo.ental : lo.flertal}!`)
    sparkle(ctx.fxLayer, target.view.x, target.view.y)
    pop(rec.view)
    // Spökrutan har gjort sitt när vagnen sitter i — tona bort den, annars står tomma
    // streckade rutor kvar på rälsen när tåget rullar iväg.
    const ghost = target.view
    if (ghost && !ghost.destroyed) {
      gsap.killTweensOf(ghost)
      gsap.to(ghost, { alpha: 0, duration: 0.3, ease: 'sine.out' })
    }

    this._placedCount++
    this._expected++
    this._setActiveCar(this._expected)

    if (this._placedCount >= this._N) this._finishRound(ctx)
  },

  // Hela tåget klart: tut + firande + tåget rullar ut, sedan ny runda. Oändlig lek.
  _finishRound(ctx) {
    if (!this._alive) return
    this._resolving = true
    this._idle = 0
    this._pulse?.kill()
    this._pulse = null

    ctx.services.audio.sfx('celebrate')
    ctx.services.audio.sfx('whoosh')
    // Stolt ångvissel när hela tåget är fullt: en varm, rätt hög ton som stiger och
    // hålls (två stämmor = ångvisslans övertoner).
    ctx.services.audio.tone({ freq: 620, dur: 0.75, type: 'sawtooth', vol: 0.2, slideTo: 720 })
    ctx.services.audio.tone({ freq: 930, dur: 0.75, type: 'sine', vol: 0.1, slideTo: 1080 })
    this._rollIn?.kill()
    this._rollIn = null
    puff(ctx.fxLayer, this._engine.x - 68, this._engine.y - 82, { color: COLORS.inkSoft })
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    // AVFÄRD ÅT VÄNSTER. Loket har fronten (kofångare/skorsten) åt vänster och vagnarna
    // åt höger, så tåget måste rulla åt VÄNSTER för att köra framlänges: loket lämnar
    // bilden först, sista vagnen sist. Varje vagn rycker med en aning efter den framför
    // (stafett) så man känner att kopplen tas upp ett i taget.
    // Rullsträckan läses mot ctx.view.left vid användning: på en bred telefon syns
    // designkoordinater till vänster om 0, och HELA tågsättet (sista vagnen sist) ska
    // hinna förbi den synliga kanten. På 16:9 blir det exakt DEPART_DX som förut.
    const lastCarX = this._engineX + ENGINE_GAP + (this._N - 1) * SLOT_STEP
    const departDx = Math.max(DEPART_DX, Math.round(lastCarX + CAR_HALF + 40 - ctx.view.left + 60))
    this._depart = gsap.timeline()
    this._depart.to(this._engine, { x: `-=${departDx}`, duration: DEPART_TIME, ease: 'power1.in' }, 0)
    this._cars.forEach((c) => {
      if (c.destroyed) return
      const place = Math.max(0, (c._n | 0) - 1) // vagn 1 sitter närmast loket och rycker först
      this._depart.to(c, { x: `-=${departDx}`, duration: DEPART_TIME, ease: 'power1.in' }, (place + 1) * DEPART_STAGGER)
    })
    // Hjulen snurrar snabbare och skorstenen chuffar när tåget drar iväg.
    this._wheelBob?.timeScale(3.2)
    ;[0, 0.16, 0.34, 0.56, 0.82].forEach((t) => this._depart.call(() => this._emitSteam(ctx), null, t))

    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    ctx.progress.complete() // delat firande: stjärna + klistermärke (+ röst-beröm)
    // Sista (hörbara) frasen: glatt tut + beröm medan tåget åker.
    ctx.services.voice.say(`Tut tut! ${randomFrom(PRAISE)}`)

    // Vänta tills hela tågsättet (inkl. stafett-fördröjningen på sista vagnen) lämnat
    // bilden innan nästa lok rullar in från höger.
    this._next = gsap.delayedCall(DEPART_TIME + 0.45, () => {
      if (!this._alive) return
      this._level++
      this._newRound(ctx)
    })
  },

  // Idle ~6s: upprepa en mjuk ledtråd och vinka med den aktiva vagnen.
  _update(ctx, ticker) {
    if (!this._alive || this._resolving) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6) {
      this._idle = 0
      const prev = SIFFROR_LOW[this._expected - 1]
      ctx.services.voice.say(prev ? `Vilken kommer efter ${prev}?` : 'Vilken vagn är nummer ett?')
      if (this._activeCar && !this._activeCar.destroyed) wiggle(this._activeCar)
    }
  },

  // Töm förra rundans slots/vagnar utan att läcka tweens eller lyssnare.
  _clearRound() {
    this._pulse?.kill()
    this._pulse = null
    this._activeCar = null
    this._drag.clear()
    this._slots.forEach((s) => {
      if (!s.destroyed) gsap.killTweensOf(s)
    })
    this._cars.forEach((c) => {
      if (!c.destroyed) {
        gsap.killTweensOf(c)
        gsap.killTweensOf(c.scale)
        if (c._glow) gsap.killTweensOf(c._glow)
      }
    })
    this._roundLayer.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._cars = []
    this._slots = []
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._next?.kill()
    this._pulse?.kill()
    this._depart?.kill()
    this._rollIn?.kill()
    this._steam?.kill()
    this._rock?.kill()
    this._wheelBob?.kill()
    this._drag?.destroy()
    this._slots.forEach((s) => {
      if (!s.destroyed) gsap.killTweensOf(s)
    })
    this._cars.forEach((c) => {
      if (!c.destroyed) {
        gsap.killTweensOf(c)
        gsap.killTweensOf(c.scale)
        if (c._glow) gsap.killTweensOf(c._glow)
      }
    })
    if (this._engine) gsap.killTweensOf(this._engine)
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
