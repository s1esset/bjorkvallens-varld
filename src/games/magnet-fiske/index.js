// Magnetfiske — fysik-/upptäckarlek (2–4 år). Barnet drar en magnet på ett spö över en
// damm sedd ovanifrån. Metallsaker (🐟🔑🪙🔩🥫) lever som RIKTIGA matter.js-kroppar och
// dras RADIELLT mot magnetpunkten när magneten DOPPATS i vattnet (en egen per-tick-kraft
// ∝ 1/avstånd → len drift långt bort, snabb snäpp nära) tills de fastnar i en liten
// klase under magneten. Icke-metall
// (🦆🛟⛵) bryr sig inte alls — kommer magneten för nära knuffas ankan bara mjukt undan
// med ett fniss (ALDRIG en bestraffning). Barnet lyfter de fastklistrade sakerna till
// hinken 🪣 på stranden där de släpps (plopp + räknas). Alla metallsaker i hinken →
// firande + ny, lite större damm. Lär ut: magneter gillar metall, inte trä/gummi.
// Ingen fail-state: fältet når hela dammen, idle-vink + auto-hjälp garanterar framgång.
// Allt ritas programmatiskt (Pixi Graphics + emoji) och städas exit-säkert.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body, nudge, speedToAccel } from '../../lib/physics.js'
import { Magnetfalt } from '../../lib/magnet.js'
import { createScene } from '../../lib/scene.js'
import { COLORS, PRAISE } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { sparkle, pop, wiggle, puff, floatText, breathe, bigCelebration, ripple, bounceIn } from '../../lib/feedback.js'

// P0 ASSETS: varje sak i dammen är ett RITAT föremål med egen silhuett, aldrig
// en emoji. Nycklarna nedan är id:n — formen ligger i makeThing().
const METAL = ['fisk', 'nyckel', 'mynt', 'skruv', 'burk']
const NONMETAL = ['anka', 'badring', 'batt']
// Vilket material varje icke-metall är av → pedagogisk kontrast ("Magneten gillar inte trä!").
const MATERIAL = { anka: 'Trä', badring: 'Gummi', batt: 'Trä' }

// Ritar en sak. Allt centreras i (0,0) och håller sig inom ~±34 px så att
// fysikkroppens radie (28) och solfjäder-slottarna under magneten stämmer.
function makeThing(kind) {
  const g = new Graphics()
  if (kind === 'fisk') {
    g.ellipse(0, 0, 28, 17).fill(0x8fbcd4).stroke({ width: 3, color: 0x5d8ba6 })
    g.moveTo(22, 0).lineTo(38, -13).lineTo(38, 13).closePath().fill(0x6fa3c0)
    g.ellipse(-4, -6, 12, 6).fill({ color: 0xffffff, alpha: 0.35 })
    g.circle(-14, -4, 4.5).fill(0xffffff)
    g.circle(-14.5, -4, 2.5).fill(0x2b2b2b)
    g.arc(-24, 2, 6, -0.5, 0.5).stroke({ width: 2, color: 0x5d8ba6 })
  } else if (kind === 'nyckel') {
    g.circle(-16, 0, 13).stroke({ width: 7, color: 0xd9b44a })
    g.roundRect(-4, -4, 34, 8, 4).fill(0xd9b44a)
    g.roundRect(20, 2, 6, 11, 3).fill(0xd9b44a)
    g.roundRect(28, 2, 6, 8, 3).fill(0xd9b44a)
    g.circle(-16, -4, 4).fill({ color: 0xfff0b8, alpha: 0.6 })
  } else if (kind === 'mynt') {
    g.circle(0, 0, 22).fill(0xf0c33c).stroke({ width: 4, color: 0xc79a1e })
    g.circle(0, 0, 14).stroke({ width: 3, color: 0xc79a1e, alpha: 0.75 })
    g.circle(-7, -8, 5).fill({ color: 0xffffff, alpha: 0.45 })
  } else if (kind === 'skruv') {
    g.roundRect(-6, -4, 40, 12, 3).fill(0xa9b3bd).stroke({ width: 3, color: 0x7b858f })
    for (const sx of [4, 12, 20, 28]) g.moveTo(sx, -4).lineTo(sx - 4, 8).stroke({ width: 2, color: 0x7b858f, alpha: 0.8 })
    g.moveTo(-8, -14).lineTo(-22, -8).lineTo(-22, 10).lineTo(-8, 16).closePath()
    g.fill(0xc3ccd4).stroke({ width: 3, color: 0x7b858f })
  } else if (kind === 'burk') {
    g.roundRect(-16, -24, 32, 48, 6).fill(0xc3ccd4).stroke({ width: 3, color: 0x7b858f })
    g.ellipse(0, -24, 16, 6).fill(0xdfe6eb).stroke({ width: 3, color: 0x7b858f })
    g.roundRect(-16, -8, 32, 18, 2).fill(0xe0574f)
    g.moveTo(-13, -6).lineTo(13, -6).stroke({ width: 2, color: 0xffffff, alpha: 0.5 })
    g.moveTo(-11, 22).lineTo(-11, -18).stroke({ width: 4, color: 0xffffff, alpha: 0.28 })
  } else if (kind === 'anka') {
    g.ellipse(2, 6, 26, 16).fill(0xffe08a).stroke({ width: 3, color: 0xe0a94f })
    g.moveTo(20, -2).quadraticCurveTo(34, -6, 30, 8).closePath().fill(0xffd35c) // stjärt
    g.circle(-14, -10, 14).fill(0xffe08a).stroke({ width: 3, color: 0xe0a94f })
    g.moveTo(-28, -8).lineTo(-38, -4).lineTo(-28, 1).closePath().fill(0xff9d3d)
    g.circle(-17, -13, 3.5).fill(0x2b2b2b)
  } else if (kind === 'badring') {
    g.circle(0, 0, 24).fill(0xff6b6b).stroke({ width: 4, color: 0xd94f4f })
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4
      g.moveTo(Math.cos(a) * 14, Math.sin(a) * 14).lineTo(Math.cos(a) * 26, Math.sin(a) * 26)
      g.stroke({ width: 9, color: 0xffffff })
    }
    g.circle(0, 0, 11).fill(0xbfe6ff)
  } else {
    // batt (liten träbåt)
    g.moveTo(-28, 2).lineTo(28, 2).lineTo(20, 18).lineTo(-20, 18).closePath()
    g.fill(0xb07a4a).stroke({ width: 3, color: 0x8a5a3b })
    g.roundRect(-3, -26, 6, 28, 3).fill(0x8a5a3b)
    g.moveTo(3, -24).lineTo(24, -4).lineTo(3, -4).closePath().fill(0xfff0d8).stroke({ width: 2.5, color: 0xe0c9a8 })
  }
  g.eventMode = 'none'
  return g
}

// KRAFTENHETER — läs det här innan du rör en konstant nedan.
// Alla krafttal här anges i PX/STEG (den fart de ska ge) och räknas om till matters
// kraftenheter av `speedToAccel()` i lib/physics.js, där hela härledningen står.
// De gamla talen var satta som om force vore hastighet, alltså ~280× för starka: hela
// dammen sögs in i den PARKERADE magneten på under en sekund (uppmätt toppfart 79 px/steg,
// saker for rakt igenom dammens 40 px tjocka väggar).
const FRICTION_AIR = 0.06 // sakernas luftmotstånd (samma värde som kropparna skapas med)

// Radiell magnet-attraktion, ∝ 1/avstånd: len drift långt bort, snabb snäpp nära.
// Fältet självt bor i lib/magnet.js; konstanterna nedan är dess inställningar.
// Verkar BARA när magneten är doppad i dammen — en magnet som hänger i luften fiskar inte.
const R_FIELD = 300 // kraftfältets radie
const R_MIN = 28 // golv på avståndet (undvik singularitet nära magneten)
const PULL = 480 // px²/steg: 1,6 px/steg vid fältkanten (300), 10,4 px/steg vid fastna-radien
const PULL_MAX = 14 // tak på dragfarten (px/steg) — långt under väggarnas 40 px, ingen tunnling
const STICK_R = 46 // fastna-radie (== klister-halons radie)
const DUCK_PUSH_R = 80 // ankan knuffas mjukt undan inom denna radie
const DUCK_PUSH = 4 // px/steg — en mjuk knuff, aldrig en katapult

// Simning: sakerna vandrar långsamt runt dammen (fisken "simmar") → aktivt fiske av
// rörliga mål istället för statiska högar. Farten (px/steg) ökar per nivå (svårare).
const SWIM_BASE = 1.1 // grund-simfart
const SWIM_PER_LEVEL = 0.3 // hur mycket snabbare per nivå

const BUCKET = { x: 1150, y: 510 } // hinkens släpp-zon (centrum)
const BUCKET_R = 130 // släpp-zonens radie
// Spöets fasta pivot. Låg tidigare på (1200, 70) — rakt under ljudknappen, så
// spöet drogs tvärs igenom den och ut ur bild. Nu klart nedanför knappen.
const PIVOT = { x: 1222, y: 168 }
// Fastklistrade saker hänger i en liten solfjäder under magneten (indexerat på fångstordning).
const SLOTS = [{ x: 0, y: 48 }, { x: -36, y: 60 }, { x: 36, y: 60 }, { x: 0, y: 76 }, { x: -30, y: 86 }]

const POND = { x0: 120, y0: 200, x1: 960, y1: 610 } // logisk damm-ruta (väggar längs kanterna)
const MOVE = { x0: 120, y0: 110, x1: 1210, y1: 620 } // magnetens rörelse-ruta (damm + hink)
const PARK = { x: 560, y: 130 } // magnetens parkering ovanför dammen
// Inre rektangel där saker placeras (marginal in från väggarna).
const SPAWN = { x0: 160, y0: 245, x1: 920, y1: 565 }

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'magnet-fiske',
  titleSv: 'Magnetfiske',
  icon: '🧲',
  category: 'drag',
  input: 'drag',
  ageRange: [2, 4],
  bundle: 'magnet-fiske',
  voiceIntro: 'Dra magneten och fiska upp metallsakerna!',

  init(ctx) {
    this._alive = true
    this._dragging = false
    this._resolving = false
    this._saidFirst = false
    this._idle = 0
    this._caught = 0
    this._needed = 0
    this._lastFniss = 0
    this._lastWhy = 0 // strypning: förklara "trä/gummi" i lugn takt, inte varje knuff
    this._inWater = false // för plask-ljud när magneten doppas i dammen
    this._items = [] // { body, view, metal, stuck, delivered, slot }
    this._stuck = []
    this._proxyTweens = []
    this._hintTween = null
    this._hintView = null
    this._grab = { x: 0, y: 0 }
    this._target = { x: PARK.x, y: PARK.y }

    // Magnetens kraftfält (lib/magnet.js): radiellt drag ∝ 1/avstånd med tak, och
    // samma fält baklänges som den mjuka knuffen ankan får. Sitter i magnetspetsen.
    this._falt = new Magnetfalt({ x: PARK.x, y: PARK.y, radie: R_FIELD, styrka: PULL, minAvstand: R_MIN, maxFart: PULL_MAX, aktiv: false })

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund FÖRST: mjuk blå vatten-scen (dekorativ).
    this._root.addChild(createScene('water', { width: ctx.width, height: ctx.height }))

    // Damm-panel + ljusa vågremsor (dekorativ).
    const panel = new Graphics()
    panel.roundRect(70, 150, 940, 500, 60).fill({ color: COLORS.blue, alpha: 0.55 }).stroke({ width: 10, color: COLORS.teal })
    panel.roundRect(110, 230, 860, 26, 13).fill({ color: COLORS.white, alpha: 0.1 })
    panel.roundRect(150, 360, 780, 26, 13).fill({ color: COLORS.white, alpha: 0.1 })
    panel.roundRect(120, 500, 840, 26, 13).fill({ color: COLORS.white, alpha: 0.1 })
    panel.eventMode = 'none'
    this._root.addChild(panel)

    // Hink + gul glödring (släpp-zon) + skugga (dekorativa).
    const glow = new Graphics().circle(BUCKET.x, 500, 130).stroke({ width: 8, color: COLORS.yellow, alpha: 0.5 })
    glow.eventMode = 'none'
    this._root.addChild(glow)
    const bsh = new Graphics().ellipse(1150, 624, 84, 20).fill({ color: COLORS.shadow, alpha: 0.12 })
    bsh.eventMode = 'none'
    this._root.addChild(bsh)
    // RITAD hink (var en 🪣-emoji): konisk kropp med band, mörk öppning, bygel.
    this._bucketText = new Graphics()
    this._bucketText.arc(0, -46, 52, Math.PI, 0).stroke({ width: 6, color: 0x8d99a6 })
    this._bucketText.moveTo(-58, -46).lineTo(58, -46).lineTo(46, 48).lineTo(-46, 48).closePath()
    this._bucketText.fill(COLORS.blue).stroke({ width: 5, color: 0x2f7fb8 })
    this._bucketText.ellipse(0, -46, 58, 12).fill(0x2f7fb8)
    this._bucketText.ellipse(0, -46, 50, 8).fill(0x1f5d8a)
    this._bucketText.moveTo(-53, -18).lineTo(53, -18).stroke({ width: 4, color: 0x2f7fb8, alpha: 0.8 })
    this._bucketText.moveTo(-49, 16).lineTo(49, 16).stroke({ width: 4, color: 0x2f7fb8, alpha: 0.8 })
    this._bucketText.moveTo(-38, -36).lineTo(-33, 40).stroke({ width: 5, color: 0xffffff, alpha: 0.22 })
    this._bucketText.position.set(1150, 540)

    // Mottagare: en katt sitter vid hinken och väntar på fångsten. Spelet hade
    // ingen publik alls — saker försvann bara ner i en hink.
    this._cat = new Container()
    this._cat.eventMode = 'none'
    const cg = new Graphics()
    cg.moveTo(22, 6).quadraticCurveTo(48, 2, 40, -26).stroke({ width: 9, color: 0xf0a860, cap: 'round' }) // svans
    cg.ellipse(0, 0, 24, 28).fill(0xf7c07a).stroke({ width: 3, color: 0xd99a4f }) // kropp
    cg.ellipse(0, 8, 15, 17).fill(0xfff0d8)
    cg.moveTo(-18, -26).lineTo(-13, -44).lineTo(-4, -30).closePath().fill(0xf7c07a).stroke({ width: 2.5, color: 0xd99a4f })
    cg.moveTo(18, -26).lineTo(13, -44).lineTo(4, -30).closePath().fill(0xf7c07a).stroke({ width: 2.5, color: 0xd99a4f })
    cg.circle(0, -26, 21).fill(0xf7c07a).stroke({ width: 3, color: 0xd99a4f }) // huvud
    const ce = new Graphics()
    ce.circle(-8, -29, 4).fill(0x2b2b2b)
    ce.circle(8, -29, 4).fill(0x2b2b2b)
    ce.circle(-6.5, -30.5, 1.5).fill(0xffffff)
    ce.circle(9.5, -30.5, 1.5).fill(0xffffff)
    ce.moveTo(-3, -20).lineTo(0, -17).lineTo(3, -20).closePath().fill(0xff9d9d)
    ce.arc(-4, -16, 4, 0, Math.PI).stroke({ width: 2, color: 0x8a6a4a })
    ce.arc(4, -16, 4, 0, Math.PI).stroke({ width: 2, color: 0x8a6a4a })
    this._cat.addChild(cg, ce)
    this._cat.position.set(1042, 596)
    this._root.addChild(this._cat)
    this._catIdle = breathe(this._cat, { scale: 1.05, duration: 1.9 })
    this._bucketText.eventMode = 'none'
    this._root.addChild(this._bucketText)

    // Synlig hög av fångade saker OVANPÅ hinken (fylls konkret per runda i stället
    // för att bara försvinna). Dekorativ; barnen ser vad de har fiskat upp.
    this._bucketPile = new Container()
    this._bucketPile.eventMode = 'none'
    this._bucketPile.interactiveChildren = false
    this._root.addChild(this._bucketPile)

    // Räknar-rad (små ⭐ visar hur många som ligger i hinken — aldrig en sjunkande siffra).
    this._counter = new Container()
    this._counter.position.set(1150, 372)
    this._counter.eventMode = 'none'
    this._counter.interactiveChildren = false
    this._root.addChild(this._counter)

    // Fysik: ingen gravitation (ovanifrån-damm), inga skärmväggar — egna pondväggar.
    this._phys = new PhysicsWorld({ gravityY: 0, gravityX: 0, walls: [] })
    const wopt = { isStatic: true, restitution: 0.3, label: 'wall' }
    this._phys.rectangle(540, POND.y0 - 20, 900, 40, wopt) // topp
    this._phys.rectangle(540, POND.y1 + 20, 900, 40, wopt) // botten
    this._phys.rectangle(POND.x0 - 20, 405, 40, 450, wopt) // vänster
    this._phys.rectangle(POND.x1 + 20, 405, 40, 450, wopt) // höger

    // Osynlig träffyta över hinken (tap-tap → magneten åker dit och släpper lasten).
    this._bucketHit = new Graphics().circle(BUCKET.x, BUCKET.y, BUCKET_R).fill({ color: 0xffffff, alpha: 0.001 })
    this._bucketHit.eventMode = 'static'
    this._bucketHit.cursor = 'pointer'
    this._onBucketTap = () => {
      if (!this._alive || this._resolving) return
      this._target = { x: BUCKET.x, y: BUCKET.y }
      this._idle = 0
    }
    this._bucketHit.on('pointertap', this._onBucketTap)
    this._root.addChild(this._bucketHit)

    // Lager för flytande saker (framför dammen, bakom magneten).
    this._itemLayer = new Container()
    this._root.addChild(this._itemLayer)

    // Spö (ritas om varje tick) + magnet på toppen.
    this._rod = new Graphics()
    this._rod.eventMode = 'none'
    this._root.addChild(this._rod)

    this._magnet = new Container()
    this._magnet.addChild(new Graphics().circle(0, 0, 46).fill({ color: COLORS.blue, alpha: 0.18 })) // klister-halo
    // RITAD hästskomagnet (var en 🧲-emoji): röd båge med vita poler.
    const head = new Graphics()
    head.arc(0, -4, 30, Math.PI, 0).stroke({ width: 22, color: 0xe0392b })
    head.roundRect(-41, -6, 22, 30, 4).fill(0xe0392b)
    head.roundRect(19, -6, 22, 30, 4).fill(0xe0392b)
    head.roundRect(-41, 18, 22, 20, 4).fill(0xf0f2f5).stroke({ width: 2, color: 0xc3ccd4 })
    head.roundRect(19, 18, 22, 20, 4).fill(0xf0f2f5).stroke({ width: 2, color: 0xc3ccd4 })
    head.arc(0, -4, 30, Math.PI + 0.25, Math.PI + 0.75).stroke({ width: 6, color: 0xffffff, alpha: 0.35 })
    this._magnet.addChild(head)
    this._magnet.position.set(PARK.x, PARK.y)
    this._magnet.eventMode = 'static'
    this._magnet.cursor = 'pointer'
    this._magnet.hitArea = new Circle(0, 0, 90) // ≥96px + halo: lätt att greppa
    this._onDown = (e) => {
      if (!this._alive || this._resolving) return
      this._dragging = true
      const lp = this._root.toLocal(e.global)
      this._grab = { x: this._magnet.x - lp.x, y: this._magnet.y - lp.y }
      ctx.services.audio.sfx('tap')
      pop(this._magnet)
      this._idle = 0
    }
    this._onMove = (e) => {
      if (!this._dragging || !this._alive) return
      const lp = this._root.toLocal(e.global)
      this._target = {
        x: clamp(lp.x + this._grab.x, MOVE.x0, MOVE.x1),
        y: clamp(lp.y + this._grab.y, MOVE.y0, MOVE.y1),
      }
      this._idle = 0
    }
    this._onUp = () => {
      this._dragging = false
    }
    this._magnet.on('pointerdown', this._onDown)
    this._magnet.on('globalpointermove', this._onMove)
    this._magnet.on('pointerup', this._onUp)
    this._magnet.on('pointerupoutside', this._onUp)
    this._root.addChild(this._magnet)

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._buildPond(ctx)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Bygg en damm för aktuell nivå --------------------------------------

  _counts(level) {
    if (level <= 0) return { metal: 2, kork: 1 }
    if (level === 1) return { metal: 3, kork: 1 }
    if (level === 2) return { metal: 4, kork: 2 }
    return { metal: 5, kork: 3 } // cap
  },

  _buildPond(ctx) {
    if (!this._alive) return
    this._clearItems()
    this._clearBucketPile()
    this._caught = 0
    this._resolving = false
    this._dragging = false
    this._target = { x: PARK.x, y: PARK.y }
    this._magnet.position.set(PARK.x, PARK.y)

    const { metal, kork } = this._counts(this._level)
    this._needed = metal

    // Simfart för den här nivån (sakerna vandrar snabbare ju högre nivå → svårare).
    this._swim = SWIM_BASE + this._level * SWIM_PER_LEVEL

    // Svag ambient ström på höga nivåer → lite mer sikte krävs (no-fail kvarstår).
    // 0,7 px/steg drift — samma enhet som resten av krafterna (se SPEED_TO_A).
    this._phys.setWind(this._level >= 3 ? speedToAccel(0.7, FRICTION_AIR) : 0, 0)

    // Tillåtna icke-metaller växer med nivån.
    // ⚠️ De här ska vara RITADE SORTERS-ID (`makeThing`), inte emoji. Stod '🦆'/'🛟' kvar
    // sedan emoji→ritat-migreringen, och `makeThing` faller igenom till sin sista gren
    // för okända namn — så nivå 0–2 visade en TRÄBÅT i stället för en anka, varje gång.
    // Ingen märkte det på tio nivåer: `MATERIAL` saknar också nyckeln '🦆' och föll
    // tillbaka på 'Trä', vilket råkar vara sant om en båt. Spelets pedagogiska ankare —
    // gummiankan — fanns alltså inte förrän nivå 3.
    const korkPool = this._level <= 1 ? ['anka'] : this._level === 2 ? ['anka', 'badring'] : NONMETAL
    const metalEmojis = fill(METAL, metal)
    const korkEmojis = fill(korkPool, kork)

    const placed = []
    const spawn = (emoji, isMetal) => {
      const p = pickSpot(placed)
      placed.push(p)
      this._addItem(ctx, emoji, isMetal, p.x, p.y)
    }
    for (const e of metalEmojis) spawn(e, true)
    for (const e of korkEmojis) spawn(e, false)

    this._drawCounter()
  },

  _addItem(ctx, emoji, metal, x, y) {
    const view = new Container()
    const sh = new Graphics().ellipse(0, 30, 34, 12).fill({ color: COLORS.shadow, alpha: 0.12 })
    sh.eventMode = 'none'
    const t = makeThing(emoji)
    view.addChild(sh, t)
    view.position.set(x, y)
    view.eventMode = 'static'
    view.cursor = 'pointer'
    view.hitArea = new Circle(0, 0, 55)
    this._itemLayer.addChild(view)

    const body = this._phys.circle(x, y, 38, { restitution: 0.2, friction: 0.1, frictionAir: 0.06, density: 0.0012, label: metal ? 'metal' : 'kork' })
    nudge(body, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6) // litet levande gupp
    this._phys.link(body, view)

    const it = { body, view, metal, emoji, stuck: false, delivered: false, slot: 0, wt: Math.random() * 1.2, wh: Math.random() * Math.PI * 2 }
    view.on('pointertap', () => {
      if (!this._alive || this._resolving || it.delivered || it.stuck) return
      if (it.metal) {
        // tap-tap-mål: magneten glider hit (samma _target-logik som drag)
        this._target = { x: it.view.x, y: it.view.y }
        this._idle = 0
      } else {
        // anka: lekfullt fniss, fastnar aldrig
        this._fniss(ctx, it)
        this._idle = 0
      }
    })
    this._items.push(it)
  },

  // Lekfull anka-reaktion (mjukt ljud + vingel) — aldrig en bestraffning. Då och då
  // förklaras VARFÖR sakerna inte fastnar ("Trä!"/"Gummi!") → pedagogisk kontrast till metall.
  _fniss(ctx, it) {
    ctx.services.audio.sfx('soft')
    if (!it.view.destroyed) wiggle(it.view)
    const mat = MATERIAL[it.emoji] || 'Trä'
    const now = performance.now()
    // Håll förklaringen lugn (var ~3,5 s), annars bara ett glatt "Hihi!".
    if (now - this._lastWhy > 3500) {
      this._lastWhy = now
      floatText(ctx.fxLayer, it.view.x, it.view.y - 24, mat + '!', { fontSize: 46 })
      ctx.services.voice.say(mat === 'Gummi' ? 'Gummi! Magneten gillar inte gummi.' : 'Trä! Magneten gillar inte trä.')
    } else {
      floatText(ctx.fxLayer, it.view.x, it.view.y - 24, 'Hihi!', { fontSize: 42 })
    }
  },

  // ---- Ticker -------------------------------------------------------------

  _update(ctx, t) {
    if (!this._alive) return
    const dt = Math.min(0.05, (t.deltaMS || 16.67) / 1000)

    // Magneten följer fingret/tap-målet (mjuk lerp), klampad till rörelse-rutan.
    const m = this._magnet
    m.x += (this._target.x - m.x) * 0.5
    m.y += (this._target.y - m.y) * 0.5
    m.x = clamp(m.x, MOVE.x0, MOVE.x1)
    m.y = clamp(m.y, MOVE.y0, MOVE.y1)
    const tip = { x: m.x, y: m.y }

    // Rita om spöet (pivot → magnetspets) + knopp vid pivoten.
    this._rod.clear()
    this._rod.moveTo(PIVOT.x, PIVOT.y).lineTo(tip.x, tip.y).stroke({ width: 12, color: COLORS.brown, cap: 'round' })
    this._rod.circle(PIVOT.x, PIVOT.y, 14).fill(COLORS.brown)

    // Plask + krusning när magneten doppas i dammen (bara vid övergången torr→våt).
    const inWater = tip.x > POND.x0 && tip.x < POND.x1 && tip.y > POND.y0 && tip.y < POND.y1
    if (inWater && !this._inWater && !this._resolving) {
      ctx.services.audio.tone({ freq: 200, dur: 0.18, type: 'sine', vol: 0.14, slideTo: 90 })
      ripple(ctx.fxLayer, tip.x, tip.y, { color: COLORS.white, maxR: 70, alpha: 0.5 })
    }
    this._inWater = inWater

    // Kraftfältet sitter i magnetspetsen och är levande bara under vattnet.
    this._falt.flytta(tip.x, tip.y)
    this._falt.aktiv = inWater

    // Per-tick krafter FÖRE fysiksteget: pinna fastklistrade, dra metall, knuffa ankor.
    if (!this._resolving) {
      for (const it of this._items) {
        if (it.delivered) continue
        const p = it.body.position
        if (it.metal && it.stuck) {
          const s = SLOTS[Math.min(it.slot, SLOTS.length - 1)]
          Body.setPosition(it.body, { x: tip.x + s.x, y: tip.y + s.y })
          Body.setVelocity(it.body, { x: 0, y: 0 })
          continue
        }
        const dx = tip.x - p.x
        const dy = tip.y - p.y
        const dist = Math.hypot(dx, dy) || 0.0001

        // Vandring (simning): byt riktning ibland, styr in från väggar, mjuk fart.
        it.wt -= dt
        if (it.wt <= 0) {
          it.wh = Math.random() * Math.PI * 2
          it.wt = 0.8 + Math.random() * 1.6
        }
        if (p.x < SPAWN.x0) it.wh = 0
        else if (p.x > SPAWN.x1) it.wh = Math.PI
        if (p.y < SPAWN.y0) it.wh = Math.PI / 2
        else if (p.y > SPAWN.y1) it.wh = -Math.PI / 2
        // Nära magneten dras metall ändå (nedan) → dämpa simningen så den inte motverkar fångst.
        const swimA = speedToAccel(this._swim * (it.metal && inWater && dist < R_FIELD ? 0.3 : 1), it.body.frictionAir)
        Body.applyForce(it.body, p, { x: it.body.mass * swimA * Math.cos(it.wh), y: it.body.mass * swimA * Math.sin(it.wh) })

        // Magneten fiskar bara när den är DOPPAD (`_falt.aktiv` sätts ovan). Låg den och
        // drog i luften fångade den hela dammen av sig själv medan barnet tittade på.
        if (!inWater) continue

        if (it.metal) {
          this._falt.dra(it.body)
        } else if (this._falt.knuff(it.body, { radie: DUCK_PUSH_R, styrka: DUCK_PUSH, profil: 'jamn' })) {
          // mjuk knuff BORT — ankan kan aldrig fastna. Returvärdet ÄR närhetsvillkoret.
          const now = performance.now()
          if (now - this._lastFniss > 600) {
            this._lastFniss = now
            this._fniss(ctx, it)
          }
        }
      }
    }

    // Stega fysiken + synka vyer.
    this._phys.update(t.deltaMS)

    // EFTER steget: fastna-koll + släpp i hink.
    if (!this._resolving) {
      for (const it of this._items) {
        if (!it.metal || it.stuck || it.delivered) continue
        const p = it.body.position
        if (Math.hypot(tip.x - p.x, tip.y - p.y) < STICK_R) this._stick(ctx, it)
      }
      if (this._stuck.length && Math.hypot(tip.x - BUCKET.x, tip.y - BUCKET.y) < BUCKET_R) {
        for (const it of [...this._stuck]) this._deliver(ctx, it)
      }
    }

    // Idle-vink (~6s): röst-repris + närmaste ofångade metall gnistrar/andas + snäll auto-hjälp.
    if (!this._resolving) {
      this._idle += dt
      if (this._idle > 6) {
        this._idle = 0
        this._recue(ctx)
      }
    }
  },

  // ---- Fastna (klister) ---------------------------------------------------

  _stick(ctx, it) {
    if (!this._alive || it.stuck || it.delivered) return
    it.stuck = true
    it.body._stuck = true // exponerat teststate
    it.slot = this._stuck.length
    this._stuck.push(it)
    Body.setVelocity(it.body, { x: 0, y: 0 })
    // En fastklistrad sak pinnas till sin slot varje bildruta (se _update). Låt den
    // därför sluta KROCKA: solvern knuffade isär klasen varje steg (slottarna ligger
    // 38 px isär, kropparna är 38 px i radie) och nästa bildruta teleporterades den
    // tillbaka — uppmätt skakning upp till 53 px. Som sensor behåller den sin plats
    // och slutar dessutom bråka med de saker som fortfarande simmar fritt.
    it.body.isSensor = true
    this._clearHint()

    ctx.services.audio.sfx('match')
    // Metalliskt "kläck" ovanpå match-tonen — känseln av metall som snäpper mot magneten.
    ctx.services.audio.tone({ freq: 240, dur: 0.08, type: 'square', vol: 0.16, slideTo: 560 })
    sparkle(ctx.fxLayer, it.view.x, it.view.y)
    ripple(ctx.fxLayer, it.view.x, it.view.y, { color: COLORS.white, maxR: 54, alpha: 0.45, duration: 0.4 })
    if (!it.view.destroyed) pop(it.view)
    floatText(ctx.fxLayer, it.view.x, it.view.y - 20, '✨', { fontSize: 46 })
    if (!this._saidFirst) {
      this._saidFirst = true
      ctx.services.voice.say('Den fastnar! Metall!')
    }
    this._idle = 0
  },

  // ---- Släpp i hinken -----------------------------------------------------

  _deliver(ctx, it) {
    if (!this._alive || it.delivered) return
    it.delivered = true
    const si = this._stuck.indexOf(it)
    if (si >= 0) this._stuck.splice(si, 1)
    if (it.body) this._phys.removeBody(it.body)

    ctx.services.audio.sfx('pling')
    // Mjukt "plopp" i vattnet + krusning i hinken (vatten-respons vid släpp).
    ctx.services.audio.tone({ freq: 320, dur: 0.14, type: 'sine', vol: 0.16, slideTo: 130 })
    puff(ctx.fxLayer, BUCKET.x, BUCKET.y, { color: COLORS.yellow })
    ripple(ctx.fxLayer, BUCKET.x, BUCKET.y, { color: COLORS.yellow, maxR: 66, alpha: 0.5 })
    this._caught++
    this._drawCounter()
    this._addToBucketPile(it.emoji) // saken syns nu ligga kvar i hinken
    this._catCheer() // katten hoppar till för varje fångst

    // Vyn ploppar ner i hinken (exit-säker proxy-tween).
    const v = it.view
    if (v && !v.destroyed) {
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
      const st = { x: v.x, y: v.y, s: v.scale.x || 1, a: 1 }
      const tw = gsap.to(st, {
        x: BUCKET.x,
        y: BUCKET.y + 14,
        s: 0.2,
        a: 0,
        duration: 0.4,
        ease: 'power2.in',
        onUpdate: () => {
          if (v.destroyed) {
            tw.kill()
            return
          }
          v.x = st.x
          v.y = st.y
          v.scale.set(st.s)
          v.alpha = st.a
        },
        onComplete: () => {
          const i = this._proxyTweens.indexOf(tw)
          if (i >= 0) this._proxyTweens.splice(i, 1)
          if (!v.destroyed) v.destroy()
        },
      })
      this._proxyTweens.push(tw)
    }

    if (this._caught >= this._needed) this._onComplete(ctx)
  },

  // ---- Mål nått: firande + ny, lite större damm ---------------------------

  _onComplete(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._clearHint()

    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    if (this._bucketText && !this._bucketText.destroyed) pop(this._bucketText, { scale: 1.18 })

    ctx.progress.setLevel(this._level + 1)
    const cust = ctx.progress.get().custom || {}
    ctx.progress.setCustom('rundor', (cust.rundor || 0) + 1)
    ctx.progress.complete()
    this._level += 1

    this._completeTimer?.kill()
    this._completeTimer = gsap.delayedCall(1.5, () => {
      if (!this._alive) return
      ctx.services.voice.say('Fler saker att fiska!')
      this._buildPond(ctx)
    })
  },

  // ---- Idle-vink + snäll auto-hjälp ---------------------------------------

  _recue(ctx) {
    if (!this._alive || this._resolving) return
    ctx.services.voice.replayLast?.()
    let best = null
    let bd = Infinity
    for (const it of this._items) {
      if (!it.metal || it.stuck || it.delivered) continue
      const p = it.body.position
      const d = Math.hypot(this._magnet.x - p.x, this._magnet.y - p.y)
      if (d < bd) {
        bd = d
        best = it
      }
    }
    if (!best || best.view.destroyed) return
    sparkle(ctx.fxLayer, best.view.x, best.view.y)
    this._clearHint()
    this._hintView = best.view
    this._hintTween = breathe(best.view, { scale: 1.12, duration: 0.7 })
    // Mjuk auto-hjälp: knuffa närmaste metall en gnutta mot magneten så den till slut nås.
    const p = best.body.position
    const dx = this._magnet.x - p.x
    const dy = this._magnet.y - p.y
    const d = Math.hypot(dx, dy) || 1
    nudge(best.body, (dx / d) * 1.2, (dy / d) * 1.2)
  },

  _clearHint() {
    this._hintTween?.kill()
    this._hintTween = null
    if (this._hintView && !this._hintView.destroyed) this._hintView.scale.set(1)
    this._hintView = null
  },

  // ---- Räknar-rad ---------------------------------------------------------

  // Visar MÅLET: en stjärna per metallsak — guld = i hinken, blek = kvar att fiska.
  _drawCounter() {
    const c = this._counter
    if (!c || c.destroyed) return
    for (const ch of [...c.children]) ch.destroy()
    const total = Math.max(this._needed, this._caught)
    const startX = -((total - 1) * 32) / 2
    for (let i = 0; i < total; i++) {
      const done = i < this._caught
      // Ritad stjärna (var ⭐) — femuddig, med kontur så den syns mot vattnet.
      const s = new Graphics()
      const pts = []
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2
        const r = k % 2 === 0 ? 15 : 6.5
        pts.push(Math.cos(a) * r, Math.sin(a) * r)
      }
      s.poly(pts).fill(COLORS.yellow).stroke({ width: 2.5, color: COLORS.orangeDark })
      s.position.set(startX + i * 32, 0)
      s.alpha = done ? 1 : 0.28
      s.eventMode = 'none'
      c.addChild(s)
    }
  },

  // ---- Synlig hink-hög ----------------------------------------------------

  // Lägg en liten kopia av den fångade saken i högen ovanpå hinken (staplas i rader).
  _addToBucketPile(emoji) {
    const p = this._bucketPile
    if (!p || p.destroyed) return
    const i = p.children.length
    const col = i % 3 // 3 saker per rad
    const row = (i / 3) | 0
    const t = makeThing(emoji)
    t.scale.set(0.58)
    t.position.set(BUCKET.x + (col - 1) * 32, 516 - row * 26 + (Math.random() * 6 - 3))
    t.eventMode = 'none'
    p.addChild(t)
    bounceIn(t, { duration: 0.32 }) // liten studs in (dödas i destroy/clear)
  },

  _clearBucketPile() {
    const p = this._bucketPile
    if (!p || p.destroyed) return
    for (const ch of [...p.children]) {
      gsap.killTweensOf(ch.scale)
      ch.destroy()
    }
  },

  // ---- Städning -----------------------------------------------------------

  _clearItems() {
    this._clearHint()
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
    this._stuck = []
  },

  // Katten hoppar till av glädje. Tweenar position (inte scale) så breathe-idlen
  // på scale får leva vidare ostört.
  _catCheer() {
    const c = this._cat
    if (!c || c.destroyed) return
    const y0 = 596
    gsap.killTweensOf(c.position)
    gsap.fromTo(c.position, { y: y0 }, { y: y0 - 20, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out' })
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._completeTimer?.kill()
    this._catIdle?.kill()
    this._clearHint()

    if (this._cat && !this._cat.destroyed) {
      gsap.killTweensOf(this._cat)
      gsap.killTweensOf(this._cat.position)
      gsap.killTweensOf(this._cat.scale)
    }
    if (this._bucketHit && !this._bucketHit.destroyed) this._bucketHit.off('pointertap', this._onBucketTap)
    if (this._magnet && !this._magnet.destroyed) {
      this._magnet.off('pointerdown', this._onDown)
      this._magnet.off('globalpointermove', this._onMove)
      this._magnet.off('pointerup', this._onUp)
      this._magnet.off('pointerupoutside', this._onUp)
      gsap.killTweensOf(this._magnet)
      gsap.killTweensOf(this._magnet.scale)
    }
    for (const it of this._items) {
      const v = it.view
      if (v && !v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
      }
    }
    this._items = []
    this._stuck = []
    this._proxyTweens.forEach((t) => t.kill())
    this._proxyTweens = []
    if (this._bucketText && !this._bucketText.destroyed) gsap.killTweensOf(this._bucketText.scale)
    if (this._bucketPile && !this._bucketPile.destroyed) {
      for (const ch of this._bucketPile.children) gsap.killTweensOf(ch.scale)
    }

    this._falt?.destroy()
    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// Fyll en lista med n emojis ur poolen (upprepa vid behov, slumpad ordning).
function fill(pool, n) {
  const s = shuffle(pool)
  const out = []
  let i = 0
  while (out.length < n) {
    out.push(s[i % s.length])
    i++
  }
  return out
}

// Hitta en plats i damm-rutan med ≥110px lucka till redan placerade saker.
function pickSpot(placed) {
  for (let tries = 0; tries < 40; tries++) {
    const x = SPAWN.x0 + Math.random() * (SPAWN.x1 - SPAWN.x0)
    const y = SPAWN.y0 + Math.random() * (SPAWN.y1 - SPAWN.y0)
    let ok = true
    for (const p of placed) {
      if (Math.hypot(p.x - x, p.y - y) < 110) {
        ok = false
        break
      }
    }
    if (ok) return { x, y }
  }
  return { x: SPAWN.x0 + Math.random() * (SPAWN.x1 - SPAWN.x0), y: SPAWN.y0 + Math.random() * (SPAWN.y1 - SPAWN.y0) }
}
