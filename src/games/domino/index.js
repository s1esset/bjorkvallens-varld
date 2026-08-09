// Domino — bygg REGNBÅGSVÄGEN till klockan (2–5 år). En rad domino-brickor leder från
// vänster fram till en KLOCKA längst till höger, och hela raden är en mjuk regnbågs-
// gradient: varje plats i kedjan har sin egen färg. I raden finns LUCKOR — varje lucka
// visar ett blekt spöke i DEN FÄRG som söks, och i brickfacket ligger brickor i just de
// färgerna (blandade). Barnet DRAR en bricka till luckan med SAMMA FÄRG (förlåtande snäpp
// 135px). Fel lucka = brickan glider snällt hem igen med ett vänligt ljud och rätt lucka
// pulserar — aldrig en summer. Är vägen hel spelar regnbågen en liten fanfar.
// Sedan TRYCKER barnet på FÖRSTA brickan: BARA den puttas — matter-fysiken låter varje
// bricka fälla nästa (äkta kedjereaktion) med en stigande pentatonisk skala. Vid en TOM
// lucka stannar raset naturligt (ingen kropp att träffa) — inget misslyckande; när brickan
// läggs i fortsätter raset av sig självt. Når raset fram ringer klockan, Bobo hoppar av
// glädje -> firande + ny, längre bana (regnbågen vänder håll varannan nivå). Mjuk hjälp:
// först en färg-ledtråd (rätt lucka lyser), sedan auto-fyllning — banan blir ALLTID klar.
// Allt ritas programmatiskt (Pixi Graphics) — inga externa filer, inga emoji-i-ruta-objekt.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Matter, mat } from '../../lib/physics.js'
import { createScene, lerpColor } from '../../lib/scene.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { pop, wiggle, sparkle, burst, breathe, bigCelebration, ripple, puff, shake } from '../../lib/feedback.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { COLORS, DESIGN_W, DESIGN_H, shade, tint } from '../../lib/theme.js'

const { Body } = Matter

const TILE_W = 26
const TILE_H = 96
const SPACING = 80 // satt så en fallande bricka träffar nästa vid ~35° — bär kedjan vidare
const FLOOR_Y = DESIGN_H - 40 // 680 — brickornas vilolinje / markens överkant
const TILE_Y = FLOOR_Y - TILE_H / 2 // brickans mittpunkt så underkanten vilar på golvet
const LAST_SLOT_X = 1040 // sista brickans x — strax till vänster om klockan
const BELL_X = 1168 // klockstolpens x
const BELL_Y = 432 // klockans hängpunkt (svingar härifrån)
const PUSH_AV = 0.12 // liten knuff förbi tipppunkten -> gravitationen välter brickan
const STAND_ANGLE = 0.6 // |vinkel| under detta = brickan står fortfarande
const FALL_GUARANTEE = 0.45 // s: väntar fysiken för länge på nästa bricka -> mjuk knuff-garanti
const STALL_CONFIRM = 0.4 // s: bekräfta att raset stannat vid en tom lucka (låt fallet lugna sig)
const SNAP_R = 135 // förlåtande snäpp-radie när en bricka släpps nära SIN lucka
const TRAY_Y = 150 // brickfackets rad (uppe)
const IDLE_DELAY = 6

// Regnbågens hållpunkter (glada, barnvänliga nyanser). Färgen för plats i i en rad om n
// interpoleras mjukt mellan dessa -> hela den färdiga raden läser som en regnbåge, men
// två grannbrickor skiljer sig alltid tydligt (max 13 brickor över 7 hållpunkter).
const RAINBOW = [0xff5a5a, 0xff9d3d, 0xffd35c, 0x5bbf6a, 0x57c8c3, 0x4aa3df, 0xa78bfa]
// Pentatonisk skala (halvtonssteg från C4) — raset spelar en STÄMD stigande melodi.
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28]
const BASE_HZ = 261.63 // C4

// --- Röstbank ------------------------------------------------------------------
// ALLA repliker bor här (inte som strängar inne i say-anropen) så de är lätta att hitta
// och lägga in i scripts/voice-phrases.json när nya klipp genereras.
const SAY = {
  intro2: 'Lägg varje bricka i luckan med samma färg!',
  goOn: 'Och vidare!',
  oneMore: 'Lägg en bricka till!',
  pushFirst: 'Putta den första brickan!',
  pathDone: 'Nu är vägen klar! Putta den första brickan.',
  rainbow: 'Titta, en hel regnbåge!',
  ring: 'Klockan ringer! Pling!',
  help: 'Jag hjälper till!',
}
const PUSH_WORDS = ['Putta!', 'Titta!', 'Oj!']
const PLACE_WORDS = ['Bra!', 'Fint!', 'Så där ja!']
const WRONG_WORDS = [
  'Nästan! Leta efter luckan med samma färg.',
  'Den luckan har en annan färg — prova igen!',
]
const HINT_WORDS = [
  'Titta på färgen — där ska brickan stå!',
  'Vilken lucka har samma färg som brickan?',
]

export default {
  id: 'domino',
  titleSv: 'Domino',
  icon: '🧱',
  category: 'fysik',
  input: 'mixed',
  ageRange: [2, 5],
  bundle: 'domino',
  voiceIntro: 'Lägg brickor i luckorna och putta den första — då ringer klockan!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._running = false // kedjan faller
    this._resetting = false // mellan firande och ny bana
    this._rung = false // klockan har ringt denna omgång
    this._resolving = false // firande + complete() körs (EXAKT en gång per bana)
    this._stalledAt = null // index där raset stannade vid en tom lucka (väntar på bricka)
    this._waitingStart = false // vägen är hel, väntar på att barnet puttar
    this._frontier = -1 // sista slot-index som HAR fallit (kedjan bevakas i tickern)
    this._fallWait = 0 // s: väntat på att nästa bricka ska välta (mot knuff-garantin)
    this._stallWait = 0 // s: väntat vid en tom lucka innan raset bekräftas stoppat
    this._fallCount = 0 // antal fallna brickor denna omgång
    this._hintStage = 0 // 0 = nästa idle ger färg-ledtråd, 1 = nästa idle fyller åt barnet
    this._lastHit = 0
    this._lastSay = 0
    this._time = 0 // s, driver brickfackets mjuka guppning
    this._nSlots = 0
    this._reverse = false
    this._slots = [] // { x, y, index, isGap, filled, color, tile, ghost }
    this._tiles = [] // alla aktiva brick-vyer med kropp { view, body }
    this._tray = [] // draggbara reservbrickor { view, home, placed, targetIndex, color }
    this._cascadeCalls = []
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // --- Bakgrund (marknadsmässig äng).
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height, ground: false }))

    // --- Fysik: golv + sidoväggar.
    this._phys = new PhysicsWorld({ gravityY: 1.5, walls: ['floor', 'left', 'right'] })
    // Egen statisk mark vars ÖVERKANT ligger på FLOOR_Y (brickorna vilar här).
    this._phys.rectangle(DESIGN_W / 2, FLOOR_Y + 130, DESIGN_W + 600, 260, {
      isStatic: true,
      friction: 0.9,
      restitution: 0,
    })
    // Kedjan HÖRS nu. Varje bricka som slår i nästa ger en träklang vars volym och
    // tonhöjd följer anslagsfarten — en kedja som just kommit igång viskar, en som
    // rusar smäller. Taket (3 par/bildruta, 28 ms mellan toner) finns i physics.js:
    // en rasande rad ger tiotals par i EN bildruta och blir annars ett skrik.
    this._phys.impactAudio(ctx.services.audio, { hardSpeed: 11 })

    // --- Bakgrundsvärld: kullar, träd och ett staket i fjärran. Scenen var tidigare
    // en tom himmel med en grön remsa längst ner.
    const world = new Graphics()
    world.circle(200, FLOOR_Y + 40, 190).fill({ color: 0x8ed16a, alpha: 0.55 })
    world.circle(560, FLOOR_Y + 66, 230).fill({ color: 0x86cf62, alpha: 0.45 })
    world.circle(980, FLOOR_Y + 34, 170).fill({ color: 0x8ed16a, alpha: 0.5 })
    for (let x = -20; x < DESIGN_W + 40; x += 76) {
      world.roundRect(x, FLOOR_Y - 66, 16, 66, 5).fill({ color: 0xc79a68, alpha: 0.85 })
    }
    world.rect(-20, FLOOR_Y - 52, DESIGN_W + 60, 9).fill({ color: 0xb98a5f, alpha: 0.85 })
    world.rect(-20, FLOOR_Y - 28, DESIGN_W + 60, 9).fill({ color: 0xb98a5f, alpha: 0.85 })
    for (const [tx, ts] of [[92, 1], [372, 0.8], [1120, 0.9]]) {
      world.rect(tx - 10 * ts, FLOOR_Y - 138 * ts, 20 * ts, 138 * ts).fill(0x8a5a3b)
      world.circle(tx, FLOOR_Y - 162 * ts, 66 * ts).fill(0x5bbf6a)
      world.circle(tx - 44 * ts, FLOOR_Y - 128 * ts, 46 * ts).fill(0x4fae51)
      world.circle(tx + 46 * ts, FLOOR_Y - 132 * ts, 48 * ts).fill(0x6ac96a)
    }
    world.eventMode = 'none'
    this._root.addChild(world)

    // --- Dekorativ gräsremsa.
    const deco = new Graphics()
    deco.rect(0, FLOOR_Y, DESIGN_W, DESIGN_H - FLOOR_Y).fill(COLORS.green)
    deco.moveTo(0, FLOOR_Y).lineTo(DESIGN_W, FLOOR_Y).stroke({ width: 4, color: COLORS.greenDark })
    for (let i = 0; i < 40; i++) {
      const gx = Math.random() * DESIGN_W
      const gy = FLOOR_Y + 12 + Math.random() * (DESIGN_H - FLOOR_Y - 20)
      deco.moveTo(gx, gy).quadraticCurveTo(gx + 4, gy - 8, gx + (Math.random() * 8 - 4), gy - 15)
        .stroke({ width: 3, color: COLORS.greenDark, alpha: 0.5 })
    }
    deco.eventMode = 'none'
    this._root.addChild(deco)

    // --- Lager (ordning: luckor under brickor, klocka, hjälpglöd, osynlig tryckyta,
    // brickfack överst så reservbrickorna fångar drag).
    this._ghostLayer = new Container()
    this._ghostLayer.eventMode = 'none'
    this._tilesLayer = new Container()
    this._tilesLayer.eventMode = 'none'
    this._tilesLayer.interactiveChildren = false
    this._root.addChild(this._ghostLayer, this._tilesLayer)

    // --- Klocka (mål) på en stolpe + Bobo som väntar och hejar.
    this._buildBell()

    // --- Startglöd bakom första brickan (lockar tryck).
    this._startGlow = new Graphics().circle(0, 0, 64).fill({ color: COLORS.yellow, alpha: 0.32 })
    this._startGlow.eventMode = 'none'
    this._startGlow.visible = false
    this._root.addChild(this._startGlow)

    // --- Osynlig yta: tryck UTANFÖR start/brickfack -> ENBART en mjuk, positiv gnista.
    //     (Startar ALDRIG raset — det gör bara start-brickan här under.)
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._onCatch = (ev) => this._onTap(ctx, ev)
    this._catcher.on('pointertap', this._onCatch)
    this._root.addChild(this._catcher)

    // --- Tryckyta ENBART över start-brickan (stor träffhalo, >=96px) -> välter kedjan.
    //     Ligger ovanpå catchern så bara denna ruta startar raset; positioneras per nivå.
    this._startHit = new Graphics().rect(-72, -118, 144, 236).fill({ color: 0x000000, alpha: 0 })
    this._startHit.eventMode = 'none'
    this._startHit.cursor = 'pointer'
    this._onStart = () => this._onStartTap(ctx)
    this._startHit.on('pointertap', this._onStart)
    this._root.addChild(this._startHit)

    // --- Brickfack (överst) — reservbrickorna byggs per nivå.
    this._trayLayer = new Container()
    this._root.addChild(this._trayLayer)

    this._buildLevel(ctx, this._level)

    this._tick = (t) => {
      if (!this._alive) return
      this._phys.update(t.deltaMS)
      this._time += t.deltaMS / 1000
      this._bobTray()
      // Bevaka den ÄKTA kedjereaktionen medan raset rullar (fysiken fäller brickorna).
      if (this._running) this._stepCascade(ctx, t.deltaMS / 1000)
      // Medan raset rullar / firandet pågår: rör inte auto-hjälpen.
      if (this._running || this._resetting) {
        this._idle = 0
        return
      }
      this._idle += t.deltaMS / 1000
      if (this._idle > IDLE_DELAY) {
        this._idle = 0
        this._idleHelp(ctx)
      }
    }
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
    const call = gsap.delayedCall(3.6, () => {
      if (this._alive && !this._running && this._firstUnfilledGap()) ctx.services.voice.say(SAY.intro2)
    })
    this._cascadeCalls.push(call)
  },

  // ---- Regnbågsfärger -----------------------------------------------------

  // Färgen för plats i i en rad om n: mjuk interpolation genom RAINBOW-hållpunkterna.
  // Ovanpå gradienten läggs ett litet ljus/mörk-sicksack (±8%) så att TVÅ GRANNAR alltid
  // går att skilja åt även i en lång rad — helheten läser ändå som en regnbåge.
  // Varannan nivå vänds regnbågen (variation utan att regeln ändras).
  _colorAt(i, n = this._nSlots) {
    let t = n > 1 ? i / (n - 1) : 0
    if (this._reverse) t = 1 - t
    const s = t * (RAINBOW.length - 1)
    const k = Math.min(RAINBOW.length - 2, Math.floor(s))
    const base = lerpColor(RAINBOW[k], RAINBOW[k + 1], s - k)
    return i % 2 ? shade(base, 0.08) : tint(base, 0.08)
  },

  // ---- Klocka + Bobo (mottagaren) -----------------------------------------

  _buildBell() {
    this._bell = new Container()
    this._bell.position.set(BELL_X, BELL_Y)
    this._bell.eventMode = 'none'
    // Stolpe + arm (brun), bakom klockan, ner till marken.
    const post = new Graphics()
    post.roundRect(-10, 0, 20, FLOOR_Y - BELL_Y, 8).fill(COLORS.brown)
    post.roundRect(-70, -6, 80, 16, 8).fill(COLORS.brown) // arm åt vänster (mot raden)
    post.eventMode = 'none'
    // Själva klockan: ett riktigt ritat föremål (mässingsklocka med ögla, rand och kläpp)
    // som svingar runt sin ögla — ingen emoji.
    this._bellObj = makeBell()
    this._bellObj.position.set(-44, -2)
    this._bell.addChild(post, this._bellObj)
    this._root.addChild(this._bell)
    // Lugn andning som lockar blicken mot målet.
    this._bellTween = breathe(this._bellObj, { scale: 1.06, duration: 1.1 })

    // Bobo väntar under klockan och tar emot raset.
    // Bobo hade bara ett svävande huvud, dessutom halvt utanför högerkanten. Nu står han
    // med ritad kropp intill klockstället och väntar på att raset ska nå fram.
    // Bobo är en RIGG (lib/karaktarer.js), inte ett stillbildshuvud med en handritad
    // kropp under. Den gamla kroppen hade exakt riggens proportioner (skugga 2,36·r,
    // fötter 2,15·r, bål 1,35·r vid r 40) — alltså ett rakt byte, inget flyttat origo.
    // `this._bobo` är den YTTRE containern: spelet äger position och hoppet vid raset,
    // riggen äger sin egen skala (andningen). Två skrivare på samma skala hackar.
    this._bobo = new Container()
    this._rig = makeKaraktar({ r: 40 })
    this._rig.view.y = -48
    this._bobo.addChild(this._rig.view)
    this._bobo.position.set(1206, FLOOR_Y - 52)
    this._bobo.eventMode = 'none'
    this._bobo.interactiveChildren = false
    this._root.addChild(this._bobo)
    this._rig.setMood('nyfiken', { direkt: true })
  },

  // ---- Flagga längs banan (dekorativ, byggs om per nivå) -------------------

  _buildFlag(x, color) {
    const H = 128 // stångens höjd (vimpeln uppe, ovanför brickorna)
    this._flag = new Container()
    this._flag.position.set(x, FLOOR_Y - H)
    this._flag.eventMode = 'none'
    const pole = new Graphics().roundRect(-3, 0, 6, H, 3).fill(COLORS.brown)
    // Vimpel med spets i (0,0) -> wiggle roterar runt fästpunkten = "flaggan flaxar".
    const pennant = new Graphics()
      .poly([0, 0, 40, 13, 0, 26]).fill(color).stroke({ width: 2, color: shade(color, 0.25) })
    this._flagPennant = pennant
    this._flag.addChild(pole, pennant)
    this._ghostLayer.addChild(this._flag) // bakom brickorna
    this._flagBreathe = breathe(pennant, { scale: 1.06, duration: 1.2 })
  },

  _waveFlag() {
    if (this._flagPennant && !this._flagPennant.destroyed) wiggle(this._flagPennant)
  },

  // ---- Nivå-uppbyggnad ----------------------------------------------------

  _layoutFor(level) {
    const nSlots = Math.min(7 + level, 13)
    let nGaps = Math.min(1 + level, 4)
    nGaps = Math.min(nGaps, nSlots - 3)
    // Luckorna väljs jämnt spridda bland de inre brickorna (aldrig första/sista).
    const interior = []
    for (let i = 1; i <= nSlots - 2; i++) interior.push(i)
    const gapSet = new Set()
    const step = interior.length / nGaps
    for (let i = 0; i < nGaps; i++) {
      gapSet.add(interior[Math.min(interior.length - 1, Math.floor(i * step + step / 2))])
    }
    // Högre nivåer: bredda några luckor (intilliggande tom bricka) — "större glugg".
    if (level >= 5) {
      for (const g of [...gapSet]) {
        if (gapSet.size >= 6) break
        if (g + 1 <= nSlots - 2 && !gapSet.has(g + 1)) gapSet.add(g + 1)
      }
    }
    return { nSlots, gapSet }
  },

  _buildLevel(ctx, level) {
    if (!this._alive) return
    this._clearLevel()
    this._running = false
    this._resetting = false
    this._rung = false
    this._resolving = false
    this._stalledAt = null
    this._waitingStart = false
    this._frontier = -1
    this._fallWait = 0
    this._stallWait = 0
    this._fallCount = 0
    this._hintStage = 0
    this._idle = 0

    const { nSlots, gapSet } = this._layoutFor(level)
    this._nSlots = nSlots
    this._reverse = level % 2 === 1
    const startX = LAST_SLOT_X - (nSlots - 1) * SPACING

    // Slots vänster -> höger (index 0 = första, alltid en fast bricka att putta).
    // Varje plats får sin färg ur regnbågsgradienten — färgen är spelets regel.
    for (let i = 0; i < nSlots; i++) {
      const x = startX + i * SPACING
      const isGap = gapSet.has(i)
      const color = this._colorAt(i, nSlots)
      const slot = { x, y: TILE_Y, index: i, isGap, filled: !isGap, color, tile: null, ghost: null }
      if (isGap) {
        // Blekt spöke i DEN FÄRG som söks — barnet kan lösa det utan att läsa eller minnas.
        const ghost = makeGhost(TILE_W, TILE_H, color)
        ghost.position.set(x, TILE_Y)
        ghost.eventMode = 'none'
        ghost.alpha = 0.85
        this._ghostLayer.addChild(ghost)
        slot.ghost = ghost
        slot._ghostTween = breathe(ghost.arrow, { scale: 1.22, duration: 0.95 })
      } else {
        // Fast stående bricka i platsens regnbågsfärg.
        const { view, body } = this._spawnTile(x, color)
        slot.tile = { view, body }
        this._tiles.push(slot.tile)
        view.scale.set(0)
        gsap.fromTo(view.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.4, delay: i * 0.03, ease: 'back.out(1.7)' })
      }
      this._slots.push(slot)
    }

    // Objekt längs banan: en liten flagga mitt på vägen som VINKAR när raset passerar
    // — ett litet Rube-Goldberg-ögonblick (rent dekorativt, stör inte fysiken).
    this._flagIndex = Math.max(1, Math.floor(nSlots / 2))
    this._buildFlag(startX + this._flagIndex * SPACING + SPACING / 2, this._colorAt(this._flagIndex, nSlots))

    // Brickfack: en reservbricka per lucka i luckans färg, i BLANDAD ordning (annars
    // skulle vänster-till-höger räcka — nu måste barnet titta på färgen).
    const gaps = [...gapSet].sort((a, b) => a - b)
    const homes = gaps.map((_, k) => (DESIGN_W - (gaps.length - 1) * 130) / 2 + k * 130)
    const order = shuffle(gaps.slice())
    order.forEach((gi, k) => {
      this._makeTrayTile(ctx, { x: homes[k], y: TRAY_Y }, gi, this._colorAt(gi, nSlots))
    })

    // Startglöd + tryckyta vid första brickan (placeras dit; aktiveras för tryck).
    const first = this._slots[0]
    this._startGlow.position.set(first.x, TILE_Y)
    this._startGlow.visible = true
    this._startGlowTween?.kill()
    this._startGlowTween = breathe(this._startGlow, { scale: 1.25, duration: 0.9 })
    if (this._startHit) {
      this._startHit.position.set(first.x, TILE_Y)
      this._startHit.eventMode = 'static'
    }
  },

  // Skapa en fysik-bricka (kropp + vy) som står på golvet.
  _spawnTile(x, color) {
    const view = makeTile(TILE_W, TILE_H, color)
    view.position.set(x, TILE_Y)
    this._tilesLayer.addChild(view)
    const body = this._phys.rectangle(x, TILE_Y, TILE_W, TILE_H, mat('tra', {
      friction: 0.4,
      restitution: 0.04,
      frictionAir: 0.003,
    }))
    this._phys.link(body, view)
    return { view, body }
  },

  _makeTrayTile(ctx, home, targetIndex, color) {
    const view = makeTile(TILE_W, TILE_H, color)
    view.position.set(home.x, home.y)
    view.eventMode = 'static'
    view.cursor = 'pointer'
    view.hitArea = new Circle(0, 0, 80) // stor träffhalo (>=96px diameter)
    const tile = { view, home, placed: false, targetIndex, color, phase: Math.random() * 6.28 }
    view.scale.set(0)
    gsap.fromTo(view.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(1.7)' })
    const onDown = (e) => this._trayDown(ctx, tile, e)
    view.on('pointerdown', onDown)
    tile._onDown = onDown
    this._trayLayer.addChild(view)
    this._tray.push(tile)
  },

  // Brickorna i facket guppar mjukt (eget liv) — men aldrig den som dras eller
  // den som är på väg tillbaka/ner (då äger tweenen positionen).
  _bobTray() {
    for (const t of this._tray) {
      if (t.placed || t._auto || t._returning || t === this._dragTile) continue
      if (!t.view || t.view.destroyed) continue
      t.view.y = t.home.y + Math.sin(this._time * 1.9 + t.phase) * 5
    }
  },

  // Mjuk hemglidning till facket (aldrig ett "fel" — bara en vänlig retur).
  _returnHome(tile, { duration = 0.3, ease = 'power2.out' } = {}) {
    tile._returning = true
    gsap.to(tile.view, {
      x: tile.home.x,
      y: tile.home.y,
      rotation: 0,
      duration,
      ease,
      onComplete: () => { tile._returning = false },
    })
  },

  _clearLevel() {
    this._killCascade()
    this._startGlowTween?.kill()
    this._startGlow.visible = false
    // Flagga (döda tweens FÖRE destroy -> aldrig skrivning på förstört objekt).
    this._flagBreathe?.kill()
    if (this._flagPennant && !this._flagPennant.destroyed) {
      gsap.killTweensOf(this._flagPennant)
      gsap.killTweensOf(this._flagPennant.scale)
    }
    if (this._flag && !this._flag.destroyed) {
      gsap.killTweensOf(this._flag)
      this._flag.destroy({ children: true })
    }
    this._flag = null
    this._flagPennant = null
    this._flagBreathe = null
    // Brickor (vyer + kroppar).
    for (const t of this._tiles) {
      if (t.body) this._phys.removeBody(t.body)
      if (t.view && !t.view.destroyed) {
        gsap.killTweensOf(t.view)
        gsap.killTweensOf(t.view.scale)
        t.view.destroy()
      }
    }
    this._tiles = []
    // Spöken.
    for (const s of this._slots) {
      s._ghostTween?.kill()
      if (s.ghost && !s.ghost.destroyed) {
        gsap.killTweensOf(s.ghost)
        gsap.killTweensOf(s.ghost.scale)
        if (s.ghost.arrow && !s.ghost.arrow.destroyed) gsap.killTweensOf(s.ghost.arrow.scale)
        s.ghost.destroy({ children: true })
      }
    }
    this._slots = []
    // Brickfack.
    this._dragTile = null
    for (const t of this._tray) {
      if (t.view && !t.view.destroyed) {
        t.view.off('pointerdown', t._onDown)
        this._detachTray(t)
        gsap.killTweensOf(t.view)
        gsap.killTweensOf(t.view.scale)
        t.view.destroy()
      }
    }
    this._tray = []
  },

  // ---- Brickfack: dra en bricka till luckan med SAMMA FÄRG ----------------

  _trayDown(ctx, tile, e) {
    if (!this._alive || tile.placed) return
    if (this._running || this._resetting) {
      // Kedjan rullar redan: mjuk lekfull respons istället för placering.
      ctx.services.audio.sfx('soft')
      wiggle(tile.view)
      return
    }
    this._idle = 0
    this._hintStage = 0
    this._dragTile = tile
    tile._wasNear = false
    tile._returning = false
    gsap.killTweensOf(tile.view) // ev. pågående hemglidning släpper taget
    const p = this._root.toLocal(e.global)
    this._dragOff = { x: tile.view.x - p.x, y: tile.view.y - p.y }
    this._trayLayer.addChild(tile.view) // till toppen
    gsap.killTweensOf(tile.view.scale)
    gsap.to(tile.view.scale, { x: 1.16, y: 1.16, duration: 0.12 })
    ctx.services.audio.sfx('tap')
    // Rätt lucka svarar direkt (<100ms): den lyser upp, de andra bleknar.
    this._highlightGhosts(tile, Infinity)
    tile._onMove = (ev) => this._trayMove(ctx, ev)
    tile._onUp = (ev) => this._trayUp(ctx, tile, ev)
    tile.view.on('globalpointermove', tile._onMove)
    tile.view.on('pointerup', tile._onUp)
    tile.view.on('pointerupoutside', tile._onUp)
  },

  _trayMove(ctx, e) {
    const tile = this._dragTile
    if (!tile || tile.view.destroyed) return
    const p = this._root.toLocal(e.global)
    tile.view.position.set(p.x + this._dragOff.x, p.y + this._dragOff.y)
    const target = this._slotFor(tile)
    const d = target ? dist(tile.view, target) : Infinity
    this._highlightGhosts(tile, d)
    // Liten "klick, här passar jag"-signal när brickan kommer inom snäpp-radien.
    const near = d < SNAP_R
    if (near !== tile._wasNear) {
      tile._wasNear = near
      if (near && target?.ghost) {
        pop(target.ghost, { scale: 1.14 })
        ctx.services.audio.tone({ freq: 880, dur: 0.05, type: 'triangle', vol: 0.12 })
      }
    }
  },

  // Rätt lucka lyser (starkast när brickan är nära), övriga bleknar tillbaka.
  _highlightGhosts(tile, d) {
    const ti = tile?.targetIndex
    for (const s of this._slots) {
      if (!s.isGap || s.filled || !s.ghost || s.ghost.destroyed) continue
      if (tile == null) s.ghost.alpha = 0.85
      else if (s.index === ti) s.ghost.alpha = d < SNAP_R ? 1 : 0.9
      else s.ghost.alpha = 0.38
    }
  },

  _trayUp(ctx, tile, e) {
    if (this._dragTile !== tile) return
    this._detachTray(tile)
    this._dragTile = null
    tile._wasNear = false
    this._highlightGhosts(null, 0)
    gsap.killTweensOf(tile.view.scale)
    gsap.to(tile.view.scale, { x: 1, y: 1, duration: 0.18 })

    // 1) Egen färg-lucka inom snäpp-radien -> snäpp fast (förlåtande).
    const target = this._slotFor(tile)
    if (target && dist(tile.view, target) < SNAP_R) {
      this._placeTile(ctx, tile, target)
      return
    }
    // 2) Släppt vid NÅGON lucka men fel färg -> vänlig retur + rätt lucka pulserar.
    const near = this._nearestGap(tile.view.x, tile.view.y)
    if (near && dist(tile.view, near) < SNAP_R) {
      // Har barnets egen lucka redan blivit fylld (auto-hjälp)? Då får brickan
      // byta färg och passa här — inget kan fastna.
      if (!target) {
        tile.targetIndex = near.index
        tile.color = near.color
        paintTile(tile.view, TILE_W, TILE_H, near.color)
        this._placeTile(ctx, tile, near)
        return
      }
      this._wrongSlot(ctx, tile, target)
      return
    }
    // 3) Inte nära någon lucka: glid snällt tillbaka till facket (aldrig fel).
    ctx.services.audio.sfx('soft')
    this._returnHome(tile)
  },

  // Fel lucka: INGET misslyckande — brickan glider hem med ett vänligt ljud och
  // rätt lucka pulserar så barnet ser vart den ska.
  _wrongSlot(ctx, tile, target) {
    ctx.services.audio.sfx('soft')
    ctx.services.audio.tone({ freq: 523, dur: 0.09, type: 'sine', vol: 0.14 })
    ctx.services.audio.tone({ freq: 659, dur: 0.11, type: 'sine', vol: 0.14, delay: 0.08 })
    wiggle(tile.view)
    this._returnHome(tile, { duration: 0.42, ease: 'back.out(1.1)' })
    this._flashSlot(ctx, target)
    const now = performance.now()
    if (now - this._lastSay > 1400) {
      this._lastSay = now
      ctx.services.voice.say(randomFrom(WRONG_WORDS))
    }
  },

  // Pulserar en lucka i sin färg: "hit ska den".
  _flashSlot(ctx, slot) {
    if (!slot?.ghost || slot.ghost.destroyed) return
    pop(slot.ghost, { scale: 1.3 })
    if (slot.ghost.arrow && !slot.ghost.arrow.destroyed) wiggle(slot.ghost.arrow)
    sparkle(ctx.fxLayer, slot.x, TILE_Y - 30, { count: 6 })
    ripple(ctx.fxLayer, slot.x, TILE_Y, { color: slot.color, maxR: 90, width: 8 })
  },

  _detachTray(tile) {
    if (tile.view && !tile.view.destroyed) {
      if (tile._onMove) tile.view.off('globalpointermove', tile._onMove)
      if (tile._onUp) {
        tile.view.off('pointerup', tile._onUp)
        tile.view.off('pointerupoutside', tile._onUp)
      }
    }
  },

  // Luckan som HÖR IHOP med brickans färg (om den fortfarande är tom).
  _slotFor(tile) {
    return this._slots.find((s) => s.isGap && !s.filled && s.index === tile.targetIndex) || null
  },

  // Närmaste lediga lucka (slots har ett riktigt y -> hypot ger ett tal, inte NaN).
  _nearestGap(x, y) {
    let best = null
    let bestD = Infinity
    for (const s of this._slots) {
      if (!s.isGap || s.filled) continue
      const d = Math.hypot(x - s.x, y - s.y)
      if (d < bestD) {
        bestD = d
        best = s
      }
    }
    return best
  },

  // Placera en reservbricka i en lucka: snäpp på plats, ge den en kropp.
  _placeTile(ctx, tile, slot) {
    tile.placed = true
    slot.filled = true
    this._hintStage = 0
    // Spöket bort.
    slot._ghostTween?.kill()
    if (slot.ghost && !slot.ghost.destroyed) {
      gsap.killTweensOf(slot.ghost)
      gsap.killTweensOf(slot.ghost.scale)
      if (slot.ghost.arrow && !slot.ghost.arrow.destroyed) gsap.killTweensOf(slot.ghost.arrow.scale)
      slot.ghost.destroy({ children: true })
      slot.ghost = null
    }
    // Bricka på plats, görs till fysik-bricka.
    tile.view.off('pointerdown', tile._onDown)
    tile.view.eventMode = 'none'
    tile.view.position.set(slot.x, TILE_Y)
    tile.view.rotation = 0
    this._tilesLayer.addChild(tile.view)
    // mat('tra') sätter BARA materialets identitet (och därmed dess röst) — spelets
    // egna, handtrimmade tal ligger sist och vinner. Ett material får aldrig tuna om
    // ett fungerande spel bakvägen; det är den fällan `spindelhjalten`/`bajs-och-kiss`
    // redan betalat för en gång i förhandsvisningens kalibrering.
    const body = this._phys.rectangle(slot.x, TILE_Y, TILE_W, TILE_H, mat('tra', {
      friction: 0.4,
      restitution: 0.04,
      frictionAir: 0.003,
    }))
    this._phys.link(body, tile.view)
    slot.tile = { view: tile.view, body }
    this._tiles.push(slot.tile)
    // Ta bort ur brickfacket.
    const ti = this._tray.indexOf(tile)
    if (ti >= 0) this._tray.splice(ti, 1)

    this._idle = 0
    ctx.services.audio.sfx('plopp')
    // Tonen är platsens ton i skalan -> rätt färg låter som rätt ton.
    ctx.services.audio.tone({ freq: noteFor(slot.index), dur: 0.16, type: 'triangle', vol: 0.2 })
    pop(tile.view, { scale: 1.18 })
    sparkle(ctx.fxLayer, slot.x, TILE_Y - 20, { count: 6 })
    ripple(ctx.fxLayer, slot.x, TILE_Y, { color: slot.color, maxR: 80, width: 7 })
    const now = performance.now()
    if (now - this._lastSay > 1100) {
      this._lastSay = now
      ctx.services.voice.say(randomFrom(PLACE_WORDS))
    }
    // Fyllde vi just den lucka där raset stannade? Ge den nya brickan en mjuk knuff
    // (den föregående ligger redan ner) så fysik-kedjan fortsätter av sig själv.
    if (this._stalledAt === slot.index) {
      this._stalledAt = null
      this._waitingStart = false
      this._frontier = slot.index - 1 // nästa förväntade = den just lagda brickan
      this._fallWait = 0
      this._stallWait = 0
      this._running = true
      ctx.services.voice.say(SAY.goOn)
      const call = gsap.delayedCall(0.16, () => {
        if (this._alive && this._running && slot.tile && Math.abs(slot.tile.body.angle) < STAND_ANGLE) {
          Body.setAngularVelocity(slot.tile.body, PUSH_AV)
        }
      })
      this._cascadeCalls.push(call)
      return
    }
    // Alla luckor fyllda? Regnbågen är hel — liten fanfar längs hela raden.
    if (!this._slots.some((s) => s.isGap && !s.filled)) {
      this._waitingStart = false
      this._rainbowFanfare(ctx)
    }
  },

  // Regnbågen är komplett: en gnistrande våg vänster->höger med stigande skala.
  _rainbowFanfare(ctx) {
    ctx.services.voice.say(SAY.rainbow)
    this._slots.forEach((s, i) => {
      const call = gsap.delayedCall(0.05 * i, () => {
        if (!this._alive || this._resetting) return
        if (s.tile?.view && !s.tile.view.destroyed) pop(s.tile.view, { scale: 1.22 })
        sparkle(ctx.fxLayer, s.x, TILE_Y - 40, { count: 4 })
        ctx.services.audio.tone({ freq: noteFor(i), dur: 0.12, type: 'triangle', vol: 0.17 })
      })
      this._cascadeCalls.push(call)
    })
    const call = gsap.delayedCall(0.05 * this._slots.length + 0.35, () => {
      if (this._alive && !this._running) ctx.services.voice.say(SAY.pathDone)
    })
    this._cascadeCalls.push(call)
  },

  // ---- Tryck utanför start: bara mjuk, positiv respons (startar ALDRIG raset) ----

  _onTap(ctx, ev) {
    if (!this._alive) return
    this._idle = 0
    const p = this._root.toLocal(ev.global)
    ctx.services.audio.sfx('soft')
    sparkle(ctx.fxLayer, p.x, p.y, { count: 4 })
  },

  // ---- Tryck på START-brickan -> välter kedjan ---------------------------------

  _onStartTap(ctx) {
    if (!this._alive) return
    this._idle = 0
    if (this._running || this._resetting) {
      ctx.services.audio.sfx('soft')
      return
    }
    this._startCascade(ctx)
  },

  _startCascade(ctx) {
    this._running = true
    this._resolving = false
    this._rung = false
    this._stalledAt = null
    this._waitingStart = false
    this._frontier = -1 // ännu har inget fallit denna omgång
    this._fallWait = 0
    this._stallWait = 0
    this._fallCount = 0
    // Släck start-lockbete + stäng av start-tryckytan medan raset rullar.
    this._startGlowTween?.kill()
    this._startGlow.visible = false
    if (this._startHit) this._startHit.eventMode = 'none'
    this._highlightGhosts(null, 0)
    ctx.services.audio.sfx('pop')
    const now = performance.now()
    if (now - this._lastSay > 1000) {
      this._lastSay = now
      ctx.services.voice.say(randomFrom(PUSH_WORDS))
    }
    // ÄKTA kedjereaktion: putta BARA första brickan — resten fäller fysiken (se _stepCascade).
    const first = this._slots[0]
    if (first?.tile && Math.abs(first.tile.body.angle) < STAND_ANGLE) {
      Body.setAngularVelocity(first.tile.body, PUSH_AV)
    }
  },

  // Bevakar den fysik-drivna kedjan varje bildruta (kallas medan _running). Går vänster
  // -> höger: när brickan efter fronten HAR fallit (fälld av den föregående) räknas den
  // in med sin ton i skalan. Tom lucka framför -> raset stannar naturligt (no-fail).
  // Vägrar en bricka falla (glipa/vinkel) inom FALL_GUARANTEE ges en mjuk knuff-garanti.
  _stepCascade(ctx, dt) {
    if (!this._alive) return
    const n = this._slots.length
    const nextIdx = this._frontier + 1
    if (nextIdx >= n) return
    const slot = this._slots[nextIdx]
    // Tom lucka framför: ingen kropp att fälla -> raset stannar av sig självt.
    if (slot.isGap && !slot.filled) {
      this._stallWait += dt
      if (this._stallWait > STALL_CONFIRM) this._stallAtGap(ctx, slot)
      return
    }
    const body = slot.tile?.body
    if (body && Math.abs(body.angle) > STAND_ANGLE) {
      // Denna bricka har vält — driven av den föregående. Äkta domino.
      this._frontier = nextIdx
      this._fallWait = 0
      this._stallWait = 0
      this._onTileFell(ctx, slot)
      if (nextIdx >= n - 1) {
        // Sista brickan nere -> klockan ringer strax.
        this._running = false
        const call = gsap.delayedCall(0.28, () => this._ringBell(ctx))
        this._cascadeCalls.push(call)
      }
      return
    }
    // Brickan står ännu — vänta på fysiken; dröjer den för länge, mjuk knuff-garanti.
    this._fallWait += dt
    if (this._fallWait > FALL_GUARANTEE && body && Math.abs(body.angle) < STAND_ANGLE) {
      Body.setAngularVelocity(body, PUSH_AV)
      this._fallWait = 0
    }
  },

  // En bricka har just fallit: dess ton i den pentatoniska skalan (raset spelar en
  // stigande melodi vänster->höger), en dammpuff i brickans egen färg vid marken och
  // flaggan flaxar när raset passerar den.
  _onTileFell(ctx, slot) {
    this._fallCount++
    const now = performance.now()
    if (now - this._lastHit > 40) {
      this._lastHit = now
      ctx.services.audio.tone({ freq: noteFor(slot.index), dur: 0.07, type: 'triangle', vol: 0.2 })
    }
    puff(ctx.fxLayer, slot.x + 22, FLOOR_Y - 4, { count: 4, color: tint(slot.color, 0.4) })
    if (slot.index === this._flagIndex) this._waveFlag()
  },

  // En tom lucka stoppade raset: ingen bestraffning — bara en vänlig "lägg en till"
  // med luckans färg tydligt markerad.
  _stallAtGap(ctx, slot) {
    if (!this._alive) return
    this._running = false
    this._stalledAt = slot.index
    this._idle = 0 // räkna mot mjuk auto-hjälp
    this._hintStage = 0
    ctx.services.audio.sfx('soft')
    this._flashSlot(ctx, slot)
    const now = performance.now()
    if (now - this._lastSay > 1100) {
      this._lastSay = now
      ctx.services.voice.say(SAY.oneMore)
    }
    this._pulseHints()
  },

  _killCascade() {
    this._cascadeCalls?.forEach((c) => c.kill())
    this._cascadeCalls = []
  },

  // ---- Klockan ringer: mål nått -------------------------------------------

  _ringBell(ctx) {
    if (!this._alive || this._resolving || this._rung) return
    this._resolving = true // firande + complete() körs nu, exakt en gång
    this._rung = true
    this._killCascade()

    ctx.services.audio.sfx('pling')
    // Klockklang: en ren treklang ovanpå (riktig tonhöjd, inte bara brus).
    ctx.services.audio.tone({ freq: 1046.5, dur: 0.9, type: 'sine', vol: 0.18 })
    ctx.services.audio.tone({ freq: 1568, dur: 0.7, type: 'sine', vol: 0.12, delay: 0.06 })
    ctx.services.audio.tone({ freq: 2093, dur: 0.5, type: 'sine', vol: 0.08, delay: 0.12 })
    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(SAY.ring)
    // Liten skärm-mikroskak i takt med klock-slaget (mjuk, aldrig hård).
    shake(this._root, { intensity: 6, duration: 0.4 })

    // Klockan svingar (runt sin ögla).
    if (this._bellObj && !this._bellObj.destroyed) {
      this._bellTween?.kill()
      gsap.killTweensOf(this._bellObj)
      const r0 = this._bellObj.rotation
      gsap.timeline({ onComplete: () => { if (!this._bellObj?.destroyed) this._bellObj.rotation = r0 } })
        .to(this._bellObj, { rotation: 0.4, duration: 0.12 })
        .to(this._bellObj, { rotation: -0.34, duration: 0.16 })
        .to(this._bellObj, { rotation: 0.24, duration: 0.16 })
        .to(this._bellObj, { rotation: -0.14, duration: 0.16 })
        .to(this._bellObj, { rotation: 0, duration: 0.16 })
    }
    // Bobo tar emot raset och hoppar av glädje. Hoppet är 52 px — mycket större än
    // riggens `jubel` (0,5·r = 20 px) — så SPELET äger y och riggen får 'stolt'.
    this._rig?.setMood('stolt')
    if (this._bobo && !this._bobo.destroyed) {
      gsap.killTweensOf(this._bobo)
      const y0 = this._bobo.y
      gsap.timeline({ onComplete: () => { if (!this._bobo?.destroyed) this._bobo.y = y0 } })
        .to(this._bobo, { y: y0 - 52, duration: 0.2, ease: 'power2.out' })
        .to(this._bobo, { y: y0, duration: 0.22, ease: 'bounce.out' })
        .to(this._bobo, { y: y0 - 34, duration: 0.18, ease: 'power2.out' })
        .to(this._bobo, { y: y0, duration: 0.2, ease: 'bounce.out' })
      pop(this._bobo, { scale: 1.15 })
    }
    sparkle(ctx.fxLayer, BELL_X - 44, BELL_Y + 60, { count: 10 })
    burst(ctx.fxLayer, BELL_X - 44, BELL_Y + 60, { count: 14, colors: RAINBOW })
    ripple(ctx.fxLayer, BELL_X - 44, BELL_Y + 60, { color: COLORS.yellow, maxR: 160, width: 10 })
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })

    // Förlopp: höj nivå + delat firande (stjärna + klistermärke).
    const next = this._level + 1
    ctx.progress.setLevel(next)
    ctx.progress.complete()

    this._resetting = true
    this._resetCall = gsap.delayedCall(2.4, () => {
      if (!this._alive) return
      this._level = next
      ctx.services.audio.sfx('whoosh')
      this._buildLevel(ctx, this._level)
    })
  },

  // Lockande puls vid idle: andas första brickan + reservbrickorna.
  _pulseHints() {
    const first = this._slots[0]
    if (first?.tile?.view && !first.tile.view.destroyed) pop(first.tile.view)
    for (const t of this._tray) {
      if (!t.placed && t.view && !t.view.destroyed) pop(t.view)
    }
  },

  // ---- Mjuk auto-hjälp (no-fail): banan blir ALLTID klar -----------------------
  // Steg 1: färg-ledtråd — brickan i facket vinkar och DESS lucka lyser/pulserar.
  // Steg 2 (om barnet väntar igen): brickan flyger dit själv. Är vägen redan hel
  // -> påminn om att putta, och om barnet ändå väntar: putta åt det.
  _idleHelp(ctx) {
    if (!this._alive || this._running || this._resetting) return
    const gap = this._firstUnfilledGap()
    if (gap) {
      const tile = this._tileFor(gap)
      if (this._hintStage === 0 && tile) {
        this._hintStage = 1
        ctx.services.voice.say(randomFrom(HINT_WORDS))
        wiggle(tile.view)
        pop(tile.view, { scale: 1.2 })
        this._flashSlot(ctx, gap)
        // Gnist-spår från brickan ner mot rätt lucka (visar vägen utan ord).
        for (let k = 1; k <= 3; k++) {
          const call = gsap.delayedCall(0.12 * k, () => {
            if (!this._alive || tile.placed) return
            const f = k / 4
            sparkle(ctx.fxLayer, tile.view.x + (gap.x - tile.view.x) * f, tile.view.y + (TILE_Y - tile.view.y) * f, { count: 3 })
          })
          this._cascadeCalls.push(call)
        }
        return
      }
      this._hintStage = 0
      ctx.services.voice.say(SAY.help)
      this._autoFillGap(ctx, gap)
      return
    }
    // Vägen är hel.
    if (this._waitingStart) {
      this._waitingStart = false
      this._startCascade(ctx) // garanterar att en passiv lekare också når klockan
    } else {
      this._waitingStart = true
      ctx.services.voice.say(SAY.pushFirst)
      this._pulseHints()
    }
  },

  _firstUnfilledGap() {
    return this._slots.find((s) => s.isGap && !s.filled) || null
  },

  // Brickan som matchar luckans färg (faller tillbaka på vilken ledig som helst).
  _tileFor(slot) {
    return (
      this._tray.find((t) => !t.placed && !t._auto && t.targetIndex === slot.index) ||
      this._tray.find((t) => !t.placed && !t._auto) ||
      null
    )
  },

  // Flyg rätt reservbricka mjukt ner i luckan och placera den (samma väg som drag).
  // Fyller det den lucka som stoppade raset fortsätter kedjan automatiskt (_placeTile).
  _autoFillGap(ctx, slot) {
    const tile = this._tileFor(slot)
    if (!tile || tile.view.destroyed) return
    tile._auto = true
    this._detachTray(tile) // ev. pågående drag-lyssnare bort
    if (this._dragTile === tile) this._dragTile = null
    tile.view.eventMode = 'none'
    // Färgen ska alltid stämma med luckan (om brickorna hunnit hamna i otakt).
    if (tile.targetIndex !== slot.index) {
      tile.targetIndex = slot.index
      tile.color = slot.color
      paintTile(tile.view, TILE_W, TILE_H, slot.color)
    }
    gsap.killTweensOf(tile.view)
    gsap.killTweensOf(tile.view.scale)
    sparkle(ctx.fxLayer, tile.view.x, tile.view.y, { count: 5 })
    gsap.to(tile.view, {
      x: slot.x,
      y: TILE_Y,
      rotation: 0,
      duration: 0.55,
      ease: 'power2.inOut',
      onComplete: () => {
        if (this._alive && !tile.view.destroyed && !slot.filled) this._placeTile(ctx, tile, slot)
      },
    })
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._resetCall?.kill()
    this._startGlowTween?.kill()
    this._bellTween?.kill()
    this._rig?.destroy()
    this._rig = null
    this._killCascade()
    this._dragTile = null
    // Brickor / spöken / brickfack.
    this._clearLevel()
    if (this._bellObj && !this._bellObj.destroyed) {
      gsap.killTweensOf(this._bellObj)
      gsap.killTweensOf(this._bellObj.scale)
    }
    if (this._bobo && !this._bobo.destroyed) {
      gsap.killTweensOf(this._bobo)
      gsap.killTweensOf(this._bobo.scale)
    }
    if (this._startGlow && !this._startGlow.destroyed) gsap.killTweensOf(this._startGlow.scale)
    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onCatch)
    if (this._startHit && !this._startHit.destroyed) this._startHit.off('pointertap', this._onStart)
    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// ---- Ritade föremål (P0: fristående objekt, aldrig emoji i en ruta) ----------

// Avstånd från en vy till en lucka (luckan har både x och y — utan y blir det NaN
// och ingenting kan någonsin snäppa; det var den ursprungliga buggen).
function dist(view, slot) {
  return Math.hypot(view.x - slot.x, view.y - slot.y)
}

// Ton för en plats i kedjan (pentatonisk skala -> alltid välklingande).
function noteFor(i) {
  return BASE_HZ * Math.pow(2, PENTA[Math.min(i, PENTA.length - 1)] / 12)
}

// Domino-bricka: ett riktigt föremål med volym — färgad kropp, ljus kant på ena sidan,
// mörk fot, mittlinje och två prickar. Ritad runt origo (0,0) = kroppens mitt.
function paintTile(g, w, h, color) {
  g.clear()
  const edge = shade(color, 0.3)
  const light = tint(color, 0.4)
  g.roundRect(-w / 2, -h / 2, w, h, 8).fill(color).stroke({ width: 3, color: edge })
  g.roundRect(-w / 2 + 4, -h / 2 + 7, 5, h - 14, 3).fill({ color: light, alpha: 0.8 }) // ljusstrimma
  g.roundRect(-w / 2 + 2, h / 2 - 9, w - 4, 7, 3).fill({ color: edge, alpha: 0.55 }) // fot/skugga
  g.moveTo(-w / 2 + 4, 0).lineTo(w / 2 - 4, 0).stroke({ width: 2, color: edge, alpha: 0.75 })
  g.circle(0, -h * 0.24, 4.5).fill({ color: COLORS.white })
  g.circle(0, h * 0.24, 4.5).fill({ color: COLORS.white })
  return g
}

function makeTile(w, h, color) {
  return paintTile(new Graphics(), w, h, color)
}

// Spök-bricka: visar VILKEN FÄRG som söks (blek variant av målfärgen) + en pil.
// Container så pilen kan andas utan att slåss med pulsen på hela spöket.
function makeGhost(w, h, color) {
  const c = new Container()
  const pale = tint(color, 0.5)
  const plate = new Graphics()
  plate.roundRect(-w / 2, -h / 2, w, h, 8).fill({ color: pale, alpha: 0.55 }).stroke({ width: 3, color, alpha: 0.9 })
  plate.circle(0, -h * 0.24, 4.5).fill({ color: COLORS.white, alpha: 0.8 })
  plate.circle(0, h * 0.24, 4.5).fill({ color: COLORS.white, alpha: 0.8 })
  // Färgklick uppe (samma färg, mättad) så matchningen syns även på håll.
  const arrow = new Graphics()
  arrow.circle(0, -h / 2 - 34, 13).fill(color).stroke({ width: 3, color: shade(color, 0.3) })
  arrow.moveTo(-10, -h / 2 - 20).lineTo(10, -h / 2 - 20).lineTo(0, -h / 2 - 6).closePath().fill(color)
  c.addChild(plate, arrow)
  c.arrow = arrow
  return c
}

// Klocka: ritad mässingsklocka (ögla, kupa, rand, kläpp) som hänger i sin ögla i (0,0).
function makeBell() {
  const c = new Container()
  const gold = 0xffc93c
  const goldDark = shade(gold, 0.32)
  const g = new Graphics()
  // ögla
  g.circle(0, 8, 10).stroke({ width: 6, color: goldDark })
  // kupa
  g.moveTo(-46, 76)
    .quadraticCurveTo(-46, 14, 0, 14)
    .quadraticCurveTo(46, 14, 46, 76)
    .closePath()
    .fill(gold)
    .stroke({ width: 3, color: goldDark })
  // rand (nedre kant)
  g.roundRect(-54, 72, 108, 18, 9).fill(gold).stroke({ width: 3, color: goldDark })
  // kläpp
  g.circle(0, 100, 11).fill(goldDark)
  // ljusreflex
  g.ellipse(-18, 44, 7, 20).fill({ color: COLORS.white, alpha: 0.35 })
  c.addChild(g)
  return c
}
