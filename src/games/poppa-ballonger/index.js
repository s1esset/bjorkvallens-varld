// Poppa Ballongerna — tryck/orsak-verkan (2–4 år). Glansiga ballonger i olika
// storlekar svävar lugnt uppåt och vaggar; barnet trycker för att poppa dem med
// pling + saftig partikelskur. Ibland dyker en GULDBALLONG upp (extra konfetti +
// stjärna) och ibland räknar rösten poppen ("ett, två, tre…").
// Inga felsteg, ingen timer, inget slut — när rundans ballonger är poppade firar
// vi (delad complete()) och en ny, lite svårare runda fylls på (oändlig lek).
import { Container, Graphics, Circle, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { bounceIn, ripple, burst, sparkle, floatText, shake, breathe, pop, wiggle } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { PLAYFUL, FONT, COLORS } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

// Gör en mörkare nyans av en 0xRRGGBB-färg (kontur/skuggning).
function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}

const SIDE_MARGIN = 130 // ballonger håller sig i x ∈ [130, 1150]
const GOLD = 0xffd24a
const GOLD_BITS = [0xffe27a, 0xffd24a, 0xfff3b0, 0xffb347]
const WATER = 0x5ec8f0 // vattenballong
const WATER_BITS = [0x5ec8f0, 0x8fe0f6, 0xbdeefa, 0x4aa3df]
const SIZES = [0.78, 0.92, 0.92, 1.06, 1.06, 1.22] // viktat mot mitten
const NUM = ['ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio']
const NUDGES = ['Poppa fler ballonger!', 'Tryck på en ballong!', 'Titta, så många ballonger!']
// Stigande kombo-ton: snabba pop i rad klättrar uppför en C-dur-pentatonik (mönster #7).
const COMBO_ROOT = 523.25 // C5
const COMBO_STEP = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]

// Gömda kompisar: en av rundans ballonger kan bära en liten vän som seglar ner till
// Bobo och stannar kvar (sparas mellan omgångar -> något att SAMLA, inte bara poppa).
const FRIENDS = [
  { kind: 'katt', sample: 'djur_katt', say: 'En katt! Mjau!', body: 0xffb15c, ear: 0xf59042 },
  { kind: 'groda', sample: 'djur_groda', say: 'En groda! Kvack!', body: 0x6ac96a, ear: 0x4fae51 },
  { kind: 'bi', sample: 'djur_bi', say: 'Ett bi! Bzzz!', body: 0xffd35c, ear: 0x4a3526 },
  { kind: 'uggla', sample: 'djur_uggla', say: 'En uggla! Hoo!', body: 0xb98a5e, ear: 0x8a5a3b },
  { kind: 'anka', sample: 'djur_anka', say: 'En anka! Kvack kvack!', body: 0xfff0a8, ear: 0xff9e3d },
]
const FRIEND_X0 = 268 // vänraden börjar strax till höger om Bobo
const FRIEND_GAP = 74
const FRIEND_Y = 646

// Rita en liten fristående kompis (egen silhuett — aldrig en emoji i en ruta, se P0 ASSETS).
function makeFriend(kind, s = 1) {
  const spec = FRIENDS.find((f) => f.kind === kind) || FRIENDS[0]
  const c = new Container()
  const g = new Graphics()
  const R = 26 * s

  // mjuk markskugga så figuren står på gräset
  g.ellipse(0, R * 1.15, R * 0.9, R * 0.24).fill({ color: 0x2f6b34, alpha: 0.2 })

  if (kind === 'katt') {
    g.moveTo(-R * 0.72, -R * 0.5).lineTo(-R * 0.34, -R * 1.1).lineTo(-R * 0.06, -R * 0.46).closePath().fill(spec.ear)
    g.moveTo(R * 0.72, -R * 0.5).lineTo(R * 0.34, -R * 1.1).lineTo(R * 0.06, -R * 0.46).closePath().fill(spec.ear)
    g.ellipse(0, R * 0.5, R * 0.72, R * 0.6).fill(spec.body) // kropp
    g.circle(0, -R * 0.16, R * 0.72).fill(spec.body) // huvud
    g.moveTo(R * 0.6, R * 0.7).quadraticCurveTo(R * 1.3, R * 0.5, R * 1.05, -R * 0.2).stroke({ width: 6 * s, color: spec.ear, cap: 'round' })
    g.moveTo(-R * 0.95, -R * 0.06).lineTo(-R * 0.3, -R * 0.02).moveTo(-R * 0.95, R * 0.16).lineTo(-R * 0.3, R * 0.08)
      .moveTo(R * 0.95, -R * 0.06).lineTo(R * 0.3, -R * 0.02).moveTo(R * 0.95, R * 0.16).lineTo(R * 0.3, R * 0.08)
      .stroke({ width: 2 * s, color: 0xffffff, alpha: 0.9 })
  } else if (kind === 'groda') {
    g.circle(-R * 0.42, -R * 0.66, R * 0.3).fill(spec.body) // ögonkullar
    g.circle(R * 0.42, -R * 0.66, R * 0.3).fill(spec.body)
    g.ellipse(0, R * 0.2, R * 0.92, R * 0.74).fill(spec.body)
    g.ellipse(0, R * 0.46, R * 0.6, R * 0.36).fill({ color: 0xdff6c8, alpha: 0.9 }) // ljus mage
    g.circle(-R * 0.42, -R * 0.7, R * 0.17).fill(0xffffff)
    g.circle(R * 0.42, -R * 0.7, R * 0.17).fill(0xffffff)
    g.ellipse(-R * 0.9, R * 0.62, R * 0.3, R * 0.16).fill(spec.ear) // fötter
    g.ellipse(R * 0.9, R * 0.62, R * 0.3, R * 0.16).fill(spec.ear)
  } else if (kind === 'bi') {
    g.ellipse(-R * 0.5, -R * 0.6, R * 0.5, R * 0.3).fill({ color: 0xffffff, alpha: 0.65 }) // vingar
    g.ellipse(R * 0.5, -R * 0.6, R * 0.5, R * 0.3).fill({ color: 0xffffff, alpha: 0.65 })
    g.ellipse(0, R * 0.12, R * 0.8, R * 0.66).fill(spec.body)
    g.rect(-R * 0.3, -R * 0.5, R * 0.24, R * 1.2).fill(spec.ear) // ränder
    g.rect(R * 0.14, -R * 0.42, R * 0.24, R * 1.04).fill(spec.ear)
    g.circle(-R * 0.2, -R * 0.98, R * 0.09).fill(spec.ear) // antenner
    g.circle(R * 0.2, -R * 0.98, R * 0.09).fill(spec.ear)
    g.moveTo(-R * 0.2, -R * 0.9).lineTo(-R * 0.12, -R * 0.5).moveTo(R * 0.2, -R * 0.9).lineTo(R * 0.12, -R * 0.5)
      .stroke({ width: 2.5 * s, color: spec.ear })
  } else if (kind === 'uggla') {
    g.moveTo(-R * 0.78, -R * 0.5).lineTo(-R * 0.5, -R * 1.05).lineTo(-R * 0.2, -R * 0.56).closePath().fill(spec.ear)
    g.moveTo(R * 0.78, -R * 0.5).lineTo(R * 0.5, -R * 1.05).lineTo(R * 0.2, -R * 0.56).closePath().fill(spec.ear)
    g.ellipse(0, R * 0.06, R * 0.86, R * 0.9).fill(spec.body)
    g.ellipse(0, R * 0.34, R * 0.5, R * 0.5).fill({ color: 0xf3ddc0, alpha: 0.9 }) // ljus mage
    g.circle(-R * 0.34, -R * 0.28, R * 0.28).fill(0xffffff)
    g.circle(R * 0.34, -R * 0.28, R * 0.28).fill(0xffffff)
    g.moveTo(0, -R * 0.16).lineTo(-R * 0.14, R * 0.02).lineTo(R * 0.14, R * 0.02).closePath().fill(0xff9e3d) // näbb
  } else {
    // anka
    g.ellipse(R * 0.1, R * 0.34, R * 0.92, R * 0.6).fill(spec.body) // kropp
    g.ellipse(-R * 0.8, R * 0.3, R * 0.36, R * 0.3).fill({ color: 0xf7e08c, alpha: 0.95 }) // stjärt
    g.circle(R * 0.52, -R * 0.42, R * 0.5).fill(spec.body) // huvud
    g.ellipse(R * 1.02, -R * 0.3, R * 0.34, R * 0.18).fill(spec.ear) // näbb
  }

  // ögon (samma för alla utom groda/uggla som ritat sina egna vitor)
  const eyes = new Graphics()
  if (kind === 'groda') {
    eyes.circle(-R * 0.42, -R * 0.7, R * 0.09).fill(COLORS.ink)
    eyes.circle(R * 0.42, -R * 0.7, R * 0.09).fill(COLORS.ink)
  } else if (kind === 'uggla') {
    eyes.circle(-R * 0.34, -R * 0.28, R * 0.14).fill(COLORS.ink)
    eyes.circle(R * 0.34, -R * 0.28, R * 0.14).fill(COLORS.ink)
  } else if (kind === 'anka') {
    eyes.circle(R * 0.62, -R * 0.5, R * 0.09).fill(COLORS.ink)
  } else {
    eyes.circle(-R * 0.24, -R * 0.22, R * 0.1).fill(COLORS.ink)
    eyes.circle(R * 0.24, -R * 0.22, R * 0.1).fill(COLORS.ink)
  }
  c.addChild(g, eyes)
  c.eventMode = 'none'
  c.interactiveChildren = false
  c._kind = kind
  c._spec = spec
  return c
}

// Rita en liten ballong (används av klusterballongen — riktiga föremål, inte 🎈-emoji).
function makeMiniBalloon(color, r = 15) {
  const c = new Container()
  const g = new Graphics()
  g.ellipse(0, 0, r, r * 1.2).fill(color).stroke({ width: 2, color: darken(color, 0.24) })
  g.ellipse(-r * 0.34, -r * 0.42, r * 0.34, r * 0.4).fill({ color: 0xffffff, alpha: 0.45 })
  g.moveTo(-r * 0.22, r * 1.2).lineTo(r * 0.22, r * 1.2).lineTo(0, r * 1.55).closePath().fill(darken(color, 0.2))
  g.moveTo(0, r * 1.55).quadraticCurveTo(r * 0.55, r * 2.2, -r * 0.2, r * 3).stroke({ width: 1.8, color: 0x9aa6b0, alpha: 0.85 })
  c.addChild(g)
  c.eventMode = 'none'
  return c
}

export default {
  id: 'poppa-ballonger',
  titleSv: 'Poppa Ballongerna',
  icon: '🎈',
  category: 'motorik',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'poppa-ballonger',
  voiceIntro: 'Tryck på ballongerna och poppa dem!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._level = ctx.progress.get().highestLevel || 1
    this._attractTween = null
    this._attractBalloon = null
    this._respawnCall = null
    this._combo = 0
    this._comboDecay = 0
    this._pips = []
    // Befriade kompisar överlever mellan omgångar: raden står redan där när man kommer
    // tillbaka, och man ser vilka som fattas.
    const saved = ctx.progress.get().custom?.vanner
    this._friendKinds = Array.isArray(saved) ? saved.filter((k) => FRIENDS.some((f) => f.kind === k)) : []
    this._friendSprites = []

    this._layer = new Container()
    ctx.stage.addChild(this._layer)

    // Polerad himmel-scen (gradient + sol + drivande moln). Dekorativ, FÖRSTA barnet.
    this._scene = createScene('sky', { width: ctx.width, height: ctx.height })
    this._layer.addChild(this._scene)

    // Levande värld nederst: äng med blommor + Bobo som tittar upp och hejar, plus
    // raden med kompisar man befriat ur ballongerna. Ligger UNDER ballongerna så de
    // seglar förbi framför honom.
    this._world = new Container()
    this._world.eventMode = 'none'
    this._world.interactiveChildren = false
    this._layer.addChild(this._world)
    this._buildWorld(ctx)

    // Osynligt tap-fångar-lager (ovanför scenen, under ballonger): tomt-tryck.
    const tap = new Graphics()
    tap.rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tap.eventMode = 'static'
    tap.on('pointertap', (e) => this._emptyTap(ctx, e))
    this._layer.addChild(tap)
    this._tapCatcher = tap

    // Ballonglager ovanpå tap-lagret.
    this._balloonLayer = new Container()
    this._layer.addChild(this._balloonLayer)

    // HUD ovanpå allt: synlig räknerad (fylls per pop under en räknerunda).
    this._hud = new Container()
    this._hud.eventMode = 'none'
    this._layer.addChild(this._hud)

    this._balloons = []
    this._build(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Slumpa en x-position inom sidmarginalerna.
  _spawnX(ctx) {
    return SIDE_MARGIN + Math.random() * (ctx.width - SIDE_MARGIN * 2)
  },

  // Ängen + Bobo + kompisraden. Allt dekorativt (eventMode 'none' via _world).
  _buildWorld(ctx) {
    const gy = ctx.height - 96 // markremsans överkant (matchar createScene)

    // Grässtrån och blommor så markremsan inte är en tom platta.
    const deco = new Graphics()
    for (let i = 0; i < 34; i++) {
      const x = Math.random() * ctx.width
      const y = gy + 6 + Math.random() * 74
      const h = 12 + Math.random() * 18
      deco.moveTo(x, y).quadraticCurveTo(x + 4, y - h * 0.6, x + (Math.random() * 10 - 5), y - h)
        .stroke({ width: 3, color: 0x49a657, alpha: 0.55 })
    }
    for (let i = 0; i < 11; i++) {
      const x = 40 + Math.random() * (ctx.width - 80)
      const y = gy + 18 + Math.random() * 58
      const col = randomFrom([COLORS.pink, COLORS.yellow, COLORS.white, COLORS.purple])
      deco.moveTo(x, y + 14).lineTo(x, y).stroke({ width: 3, color: 0x49a657 })
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2
        deco.circle(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 5).fill(col)
      }
      deco.circle(x, y, 4).fill(COLORS.yellow)
    }
    this._world.addChild(deco)

    // Bobo: huvud ur delade maskoten + egen ritad kropp och en uppsträckt arm.
    const bobo = new Container()
    const body = new Graphics()
    body.ellipse(0, 66, 52, 56).fill(COLORS.orange) // kropp
    body.ellipse(0, 74, 34, 34).fill({ color: COLORS.cream, alpha: 0.9 }) // mage
    body.ellipse(-30, 116, 22, 13).fill(COLORS.orangeDark) // fötter
    body.ellipse(30, 116, 22, 13).fill(COLORS.orangeDark)
    bobo.addChild(body)
    const arm = new Graphics()
    arm.moveTo(0, 0).quadraticCurveTo(34, -26, 44, -74).stroke({ width: 17, color: COLORS.orange, cap: 'round' })
    arm.circle(44, -74, 13).fill(COLORS.cream)
    arm.position.set(40, 46)
    bobo.addChild(arm)
    // Bara HUVUDET blir en rigg (`kropp: false`). Bobos ena arm sträcker sig efter
    // ballongerna och betyder något i det här spelet — riggens två armar hänger vid
    // sidorna och hade tagit bort gesten, inte ersatt den.
    this._kar = makeKaraktar({ r: 46, kropp: false })
    bobo.addChild(this._kar.view)
    bobo.position.set(148, 574)
    this._world.addChild(bobo)
    this._bobo = bobo
    this._boboArm = arm
    // vilo-guppning så han lever även när ingenting händer
    this._boboIdle = gsap.to(bobo, { y: 566, duration: 1.5, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    // Kompisraden (redan befriade vänner står kvar).
    this._friendRow = new Container()
    this._world.addChild(this._friendRow)
    this._friendKinds.forEach((k, i) => this._placeFriend(k, i))
  },

  // Ställ en kompis på sin plats i raden och ge den en lugn andning.
  _placeFriend(kind, index) {
    if (!this._friendRow || this._friendRow.destroyed) return null
    const f = makeFriend(kind)
    f.position.set(FRIEND_X0 + index * FRIEND_GAP, FRIEND_Y)
    this._friendRow.addChild(f)
    this._friendSprites.push(f)
    f._breath = breathe(f, { scale: 1.05, duration: 1.1 + Math.random() * 0.6 })
    return f
  },

  // Bygg en ny runda (städar föregående först). Skalar med nivån.
  _build(ctx) {
    if (!this._alive) return
    this._stopAttract()

    // städa förra rundans ballonger + tweens
    this._balloons.forEach((b) => {
      b._sway?.kill()
      b._silTw?.kill()
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
    })
    this._balloonLayer.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._balloons = []

    const level = this._level
    const count = Math.min(9, 5 + Math.floor(level / 2)) // fler per nivå (tak 9)
    this._speed = Math.min(78, 34 + level * 4) // lite snabbare drift per nivå
    this._remaining = count
    this._resolving = false
    this._idle = 0
    this._popCount = 0
    this._combo = 0
    this._comboDecay = 0
    // Räkne-känsla: säg poppen på svenska — vanligare för de yngsta/låga nivåer.
    this._countingRound = Math.random() < (level <= 3 ? 0.7 : 0.4)
    // En enstaka guldballong då och då (oftare högre upp), men aldrig garanterat.
    const goldenIndex = Math.random() < Math.min(0.6, 0.28 + level * 0.05) ? (Math.random() * count) | 0 : -1

    // Ballongtyper som kryddar rundan (roteras/skalas per nivå så tur 2 ≠ tur 1). No-fail —
    // varje typ poppar fortfarande glatt, bara med sin egen poff. vatten (blå skvätt),
    // kluster (släpper 3 miniballonger), jätte (kräver en extra kram innan den brister).
    const specials = []
    if (level >= 2) specials.push('vatten')
    if (level >= 3) specials.push('kluster')
    if (level >= 4 && Math.random() < 0.7) specials.push('jatte')
    if (level >= 6 && Math.random() < 0.5) specials.push(randomFrom(['vatten', 'kluster']))
    const typeAt = {}
    const freeSlots = shuffle([...Array(count).keys()].filter((i) => i !== goldenIndex))
    specials.forEach((t, k) => { if (freeSlots[k] != null) typeAt[freeSlots[k]] = t })

    // Gömd kompis: en av ballongerna kan bära en vän som ännu inte står i Bobos rad.
    // Man SER en mörk skugga röra sig inuti ballongen — den som tittar noga hittar den.
    const missing = FRIENDS.map((f) => f.kind).filter((k) => !this._friendKinds.includes(k))
    let friendIndex = -1
    this._friendPick = null
    if (missing.length && Math.random() < 0.6) {
      const slot = freeSlots.slice(specials.length).find((i) => typeAt[i] == null)
      if (slot != null) {
        friendIndex = slot
        this._friendPick = randomFrom(missing)
      }
    }

    // Synlig räknerad: en rad tomma pluppar (1..N) som fylls per pop — gör räkningen
    // begriplig UTAN ljud (mönster: progression synlig). Bara under räknerundor.
    this._buildCountRow(count)

    for (let i = 0; i < count; i++) {
      const golden = i === goldenIndex
      const type = golden ? 'guld' : typeAt[i] || 'normal'
      const color = type === 'vatten' ? WATER : golden ? GOLD : PLAYFUL[i % PLAYFUL.length]
      const size = golden ? 1.12 : type === 'jatte' ? 1.5 : randomFrom(SIZES)
      const b = this._makeBalloon(ctx, color, size, golden, type, i === friendIndex ? this._friendPick : null)
      b._baseX = this._spawnX(ctx)
      b.x = b._baseX
      b.y = 160 + Math.random() * 640 // spridda, en del syns direkt
      this._balloonLayer.addChild(b)
      this._balloons.push(b)
      // mjuk entré-studs
      bounceIn(b, { delay: i * 0.06, duration: 0.42 })
    }
  },

  // Bygg räknerad-pluppar i HUD:en. Bara synliga i en räknerunda; annars tom rad.
  _buildCountRow(count) {
    this._pips.forEach((p) => { gsap.killTweensOf(p.scale); if (!p.destroyed) p.destroy() })
    this._pips = []
    if (!this._countingRound || !this._hud || this._hud.destroyed) return
    const gap = 46
    const x0 = 640 - ((count - 1) * gap) / 2
    for (let i = 0; i < count; i++) {
      const pip = new Graphics()
      pip.circle(0, 0, 16).fill({ color: 0xffffff, alpha: 0.5 }).stroke({ width: 3, color: COLORS.ink, alpha: 0.35 })
      pip.position.set(x0 + i * gap, 52)
      pip.eventMode = 'none'
      this._hud.addChild(pip)
      this._pips.push(pip)
    }
  },

  // Fyll nästa plupp (vid pop under räknerunda) med en glad puls.
  _fillPip(idx) {
    const pip = this._pips[idx]
    if (!pip || pip.destroyed) return
    const col = PLAYFUL[idx % PLAYFUL.length]
    pip.clear().circle(0, 0, 17).fill(col).stroke({ width: 3, color: 0xffffff, alpha: 0.9 })
    gsap.killTweensOf(pip.scale)
    gsap.fromTo(pip.scale, { x: 0.3, y: 0.3 }, { x: 1, y: 1, duration: 0.34, ease: 'back.out(2.4)' })
  },

  // Bygg en glansig ballong-Container (ankare i kroppens centrum).
  _makeBalloon(ctx, color, size, golden, type = 'normal', friend = null) {
    const b = new Container()
    const g = new Graphics()
    const rx = 56 * size
    const ry = 68 * size
    const knotY = ry + 4 * size

    // mjuk volym-skugga (bakom kroppen, lätt förskjuten)
    g.ellipse(rx * 0.16, ry * 0.18, rx * 0.98, ry * 0.98).fill({ color: darken(color, 0.4), alpha: 0.16 })
    // kropp
    g.ellipse(0, 0, rx, ry).fill(color).stroke({ width: 3 * size, color: darken(color, 0.22) })
    // botten-skuggning (ger rundhet)
    g.ellipse(rx * 0.1, ry * 0.24, rx * 0.74, ry * 0.62).fill({ color: darken(color, 0.18), alpha: 0.18 })
    // stor mjuk glans
    g.ellipse(-rx * 0.34, -ry * 0.34, rx * 0.44, ry * 0.5).fill({ color: 0xffffff, alpha: 0.3 })
    // liten skarp glansprick
    g.ellipse(-rx * 0.4, -ry * 0.42, rx * 0.14, ry * 0.18).fill({ color: 0xffffff, alpha: 0.85 })
    // knut (liten triangel under kroppen)
    g.moveTo(-6 * size, knotY - 4 * size)
      .lineTo(6 * size, knotY - 4 * size)
      .lineTo(0, knotY + 9 * size)
      .closePath()
      .fill(darken(color, 0.18))
    // snöre (mjukt böjt, dekorativt)
    const sy = knotY + 9 * size
    g.moveTo(0, sy)
      .quadraticCurveTo(20 * size, sy + 48 * size, -8 * size, sy + 100 * size)
      .stroke({ width: 2.5 * size, color: 0x9aa6b0, alpha: 0.9 })
    b.addChild(g)

    // Guldballong markeras med en liten stjärna.
    if (golden) {
      const star = new Text({ text: '⭐', style: { fontFamily: FONT.body, fontSize: 40 * size } })
      star.anchor.set(0.5)
      star.y = ry * 0.06
      star.eventMode = 'none'
      b.addChild(star)
    } else if (type === 'vatten') {
      // liten vattendroppe-markör så vattenballongen känns igen
      const drop = new Text({ text: '💧', style: { fontFamily: FONT.body, fontSize: 34 * size } })
      drop.anchor.set(0.5)
      drop.y = ry * 0.04
      drop.eventMode = 'none'
      b.addChild(drop)
    } else if (type === 'kluster') {
      // tre små pluppar antyder att den släpper flera
      const dots = new Graphics()
      for (let k = -1; k <= 1; k++) dots.circle(k * 14 * size, ry * 0.06, 6 * size).fill({ color: 0xffffff, alpha: 0.85 })
      dots.eventMode = 'none'
      b.addChild(dots)
    }

    // Gömd kompis: en mjuk skugga som rör sig inuti ballongen. Ingen text, ingen pil —
    // barnet upptäcker den själv och väljer att trycka just där (agens, inte tur).
    if (friend) {
      const sil = new Graphics()
      sil.ellipse(0, 4 * size, 22 * size, 20 * size).fill({ color: darken(color, 0.55), alpha: 0.34 })
      sil.circle(-11 * size, -12 * size, 8 * size).fill({ color: darken(color, 0.55), alpha: 0.34 })
      sil.circle(11 * size, -12 * size, 8 * size).fill({ color: darken(color, 0.55), alpha: 0.34 })
      sil.eventMode = 'none'
      b.addChild(sil)
      // Proxy-tween: silhuetten kan förstöras mitt i loopen (ny runda / exit) och en rå
      // gsap.to(pixiObj) skriver då till en nollställd transform -> krasch.
      const sst = { x: -9 * size, s: 1 }
      const stw = gsap.to(sst, {
        x: 9 * size, s: 1.08, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut',
        onUpdate: () => {
          if (sil.destroyed) { stw.kill(); return }
          sil.x = sst.x
          sil.scale.set(sst.s, 2 - sst.s)
        },
      })
      b._friend = friend
      b._sil = sil
      b._silTw = stw
    }

    b._color = color
    b._golden = golden
    b._type = type
    b._tapsLeft = type === 'jatte' ? 2 : 1 // jätten behöver en extra kram
    b._size = size
    b._popped = false
    b._swayOffset = 0
    b._bumpCd = 0
    // tyngre (större) ballonger stiger lite lugnare -> parallax
    b._speedMul = (1.3 - size * 0.4) * (0.9 + Math.random() * 0.3)
    b.eventMode = 'static'
    b.cursor = 'pointer'
    // stor träffyta + osynligt halo, alltid generös för små fingrar
    b.hitArea = new Circle(0, -8 * size, Math.max(82, 90 * size))
    b.on('pointertap', () => this._pop(ctx, b))

    // lätt sidledes vagga (ticker lägger ihop baseX + swayOffset)
    const amp = 14 + Math.random() * 16
    b._sway = gsap.fromTo(
      b,
      { _swayOffset: -amp },
      { _swayOffset: amp, duration: 1.6 + Math.random() * 1.3, yoyo: true, repeat: -1, ease: 'sine.inOut' },
    )
    // lätt tilt som följer vaggan (rotation-tween, separat från scale)
    const tilt = 0.05 + Math.random() * 0.05
    gsap.fromTo(
      b,
      { rotation: -tilt },
      { rotation: tilt, duration: 1.8 + Math.random() * 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' },
    )
    return b
  },

  // Poppa en ballong (endast positivt; dubbeltryck-säkrat).
  _pop(ctx, b) {
    if (!this._alive || b._popped) return
    this._idle = 0

    // Jätteballongen behöver en extra kram: första trycket ger en stor wobble + mjuk
    // låg ton, inte en pop. Aldrig ett "fel" — bara mer att göra innan den brister.
    if (b._tapsLeft > 1) {
      b._tapsLeft--
      ctx.services.audio.tone({ freq: 150, dur: 0.18, type: 'sine', vol: 0.22, slideTo: 120 })
      ripple(this._layer, b.x, b.y, { color: 0xffffff, maxR: 90 * b._size, alpha: 0.4 })
      gsap.killTweensOf(b.scale)
      gsap.to(b.scale, { x: 1.16, y: 0.9, duration: 0.1, yoyo: true, repeat: 3, ease: 'sine.inOut', onComplete: () => { if (!b.destroyed && !b._popped) b.scale.set(1) } })
      return
    }

    b._popped = true
    b.eventMode = 'none'
    b._sway?.kill()
    gsap.killTweensOf(b) // stoppa vagga/tilt
    if (this._attractBalloon === b) this._stopAttract()
    this._remaining--

    // Ljud + ring + skur < 100ms.
    ctx.services.audio.sfx(b._golden ? 'reveal' : Math.random() < 0.25 ? 'pling' : 'pop')
    // Stigande kombo-ton: snabba pop i rad klättrar uppför pentatoniken (juice #7).
    const semi = COMBO_STEP[Math.min(this._combo, COMBO_STEP.length - 1)]
    ctx.services.audio.tone({ freq: COMBO_ROOT * Math.pow(2, semi / 12), dur: 0.14, type: 'triangle', vol: 0.16 })
    this._combo++
    this._comboDecay = 0.7
    ripple(this._layer, b.x, b.y, { color: 0xffffff, maxR: 70 * b._size, alpha: 0.55 })

    if (b._golden) {
      ctx.services.audio.sfx('pling')
      burst(this._layer, b.x, b.y, { count: 20, colors: GOLD_BITS, power: 1.35 })
      sparkle(ctx.fxLayer, b.x, b.y, { count: 9 })
      floatText(ctx.fxLayer, b.x, b.y - 10, '⭐', { fontSize: 64, rise: 110 })
      ctx.progress.addStars(1) // liten bonusstjärna
    } else if (b._type === 'vatten') {
      // vattenballong: blå skvätt + flera mini-droppar + två ringar
      ctx.services.audio.tone({ freq: 320, dur: 0.22, type: 'sine', vol: 0.2, slideTo: 140 })
      burst(this._layer, b.x, b.y, { count: 18, colors: WATER_BITS, power: b._size * 1.2 })
      ripple(this._layer, b.x, b.y, { color: 0x9fe4f8, maxR: 96 * b._size, alpha: 0.7 })
      for (let d = 0; d < 6; d++) this._spawnDrop(b.x + (Math.random() * 70 - 35), b.y)
    } else if (b._type === 'kluster') {
      // klusterballong: släpper 3 RITADE miniballonger som seglar iväg + tre stigande pling
      burst(this._layer, b.x, b.y, { count: 14, colors: PLAYFUL, power: b._size })
      for (let m = 0; m < 3; m++) {
        this._spawnMini(b.x + (m - 1) * 30, b.y, PLAYFUL[(Math.random() * PLAYFUL.length) | 0])
        ctx.services.audio.tone({ freq: COMBO_ROOT * Math.pow(2, (4 + m * 3) / 12), dur: 0.12, type: 'triangle', vol: 0.14, delay: m * 0.08 })
      }
    } else {
      burst(this._layer, b.x, b.y, { count: b._size > 1 ? 14 : 11, colors: [b._color, ...GOLD_BITS.slice(2)], power: b._size })
    }

    // Gömd kompis befriad: den seglar ner till Bobo och blir kvar i raden.
    if (b._friend) this._releaseFriend(ctx, b)
    else this._boboReact(ctx)

    // Räkne-känsla: säg poppen ("ett, två, tre…") + fyll motsvarande plupp i raden.
    if (this._countingRound) {
      this._popCount++
      this._fillPip(this._popCount - 1)
      const word = NUM[this._popCount - 1]
      if (word) ctx.services.voice.say(word)
    }

    // squash/stretch -> kollaps
    gsap.killTweensOf(b.scale)
    gsap
      .timeline()
      .to(b.scale, { x: 1.22, y: 0.82, duration: 0.05, ease: 'power2.out' })
      .to(b.scale, {
        x: 0,
        y: 0,
        duration: 0.17,
        ease: 'back.in(2)',
        onComplete: () => {
          if (this._alive && !b.destroyed) b.visible = false
        },
      })

    if (this._remaining <= 0 && !this._resolving) {
      this._resolving = true
      // complete() äger firandet: beröm-röst + konfetti + stjärna + klistermärke.
      ctx.progress.complete()
      shake(this._layer, { intensity: 7, duration: 0.45 }) // extra mjuk juice (ej i complete)
      this._finish(ctx) // spelets EGNA slut: Bobo hoppar, kompisarna hoppar i våg
      ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
      this._level++
      ctx.progress.setLevel(this._level)
      this._respawnCall = ctx.later(1.8, () => {
        if (!this._alive) return
        if (Math.random() < 0.5) ctx.services.voice.say('Här kommer fler ballonger!')
        this._build(ctx)
      })
    }
  },

  // Bobo tittar upp och puffar till varje gång en ballong smäller — han är publiken.
  // `hoppsan` är förvånad, aldrig sur (P0 MOTGÅNG): en smäll ska överraska, inte
  // läxa upp. `pop()` går på den YTTRE containern, inte på riggens `view` — riggens
  // andning äger sin egen skala.
  _boboReact() {
    if (!this._bobo || this._bobo.destroyed) return
    this._kar?.react('hoppsan')
    pop(this._bobo, { scale: 1.06 })
    if (this._boboArm && !this._boboArm.destroyed) wiggle(this._boboArm)
  },

  // Spelets egen finish: Bobo hoppar högt, hela kompisraden studsar i en våg och en
  // regnbågsbåge sveper över himlen. (Inte samma konfetti+stjärna som alla andra spel.)
  _finish(ctx) {
    this._kar?.react('jubel')
    if (this._bobo && !this._bobo.destroyed) {
      const by = this._bobo.y
      this._boboIdle?.pause()
      gsap.to(this._bobo, {
        y: by - 54, duration: 0.26, ease: 'power2.out', yoyo: true, repeat: 1,
        onComplete: () => {
          if (this._bobo && !this._bobo.destroyed) { this._bobo.y = by; this._boboIdle?.resume() }
        },
      })
    }
    this._friendSprites.forEach((f, i) => {
      if (f.destroyed) return
      const fy = f.y
      gsap.to(f, {
        y: fy - 34, duration: 0.22, delay: 0.1 + i * 0.09, ease: 'power2.out', yoyo: true, repeat: 1,
        onComplete: () => { if (!f.destroyed) f.y = fy },
      })
      ctx.services.audio.tone({ freq: COMBO_ROOT * Math.pow(2, [0, 4, 7, 12, 16][i % 5] / 12), dur: 0.16, type: 'triangle', vol: 0.13, delay: 0.1 + i * 0.09 })
    })
    // Regnbågsbåge som ritar sig själv över himlen och tonar bort.
    const arc = new Graphics()
    arc.eventMode = 'none'
    this._layer.addChild(arc)
    const bands = [0xff6b6b, 0xff8a3d, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa]
    const st = { p: 0, a: 0.85 }
    const tw = gsap.to(st, {
      p: 1, duration: 0.7, ease: 'power2.out',
      onUpdate: () => {
        if (arc.destroyed) { tw.kill(); return }
        arc.clear()
        bands.forEach((col, i) => {
          const r = 430 - i * 26
          arc.arc(640, 720, r, Math.PI, Math.PI + Math.PI * st.p)
            .stroke({ width: 24, color: col, alpha: st.a * 0.5 })
        })
      },
      onComplete: () => {
        const fade = gsap.to(st, {
          a: 0, duration: 0.7, delay: 0.35,
          onUpdate: () => {
            if (arc.destroyed) { fade.kill(); return }
            arc.clear()
            bands.forEach((col, i) => {
              arc.arc(640, 720, 430 - i * 26, Math.PI, Math.PI * 2).stroke({ width: 24, color: col, alpha: st.a * 0.5 })
            })
          },
          onComplete: () => { if (!arc.destroyed) arc.destroy() },
        })
      },
    })
  },

  // Befria en gömd kompis: den poppar fram, snurrar glatt och seglar ner till raden
  // bredvid Bobo där den stannar (även nästa gång man spelar).
  _releaseFriend(ctx, b) {
    const kind = b._friend
    b._friend = null
    if (this._friendKinds.includes(kind)) return
    const idx = this._friendKinds.length
    this._friendKinds.push(kind)
    ctx.progress.setCustom('vanner', [...this._friendKinds])

    const spec = FRIENDS.find((f) => f.kind === kind)
    const flyer = makeFriend(kind, 1.25)
    flyer.position.set(b.x, b.y)
    this._layer.addChild(flyer)
    sparkle(ctx.fxLayer, b.x, b.y, { count: 10 })
    if (!ctx.services.audio.sample(spec.sample)) ctx.services.audio.sfx('reveal')
    ctx.services.voice.say(spec.say)

    const tx = FRIEND_X0 + idx * FRIEND_GAP
    const st = { x: b.x, y: b.y, r: 0, s: 1.25 }
    const tw = gsap.timeline()
    tw.to(st, {
      r: Math.PI * 2, duration: 0.5, ease: 'power1.out',
      onUpdate: () => { if (!flyer.destroyed) flyer.rotation = st.r },
    })
    tw.to(st, {
      x: tx, y: FRIEND_Y, s: 1, duration: 0.85, ease: 'power1.inOut',
      onUpdate: () => {
        if (flyer.destroyed) { tw.kill(); return }
        flyer.position.set(st.x, st.y)
        flyer.scale.set(st.s)
      },
      onComplete: () => {
        if (!flyer.destroyed) flyer.destroy({ children: true })
        if (!this._alive) return
        const placed = this._placeFriend(kind, idx)
        if (placed) {
          bounceIn(placed, { duration: 0.4 })
          ctx.services.audio.sfx('pling')
        }
        this._boboReact()
        if (this._friendKinds.length === FRIENDS.length) {
          ctx.services.voice.say('Du hittade alla kompisar!')
          sparkle(ctx.fxLayer, FRIEND_X0 + FRIEND_GAP * 2, FRIEND_Y - 40, { count: 14 })
        }
      },
    })
  },

  // En ritad vattendroppe som skvätter iväg och faller (ersätter 💧-emoji, P0 ASSETS).
  _spawnDrop(x, y) {
    const d = new Graphics()
    const r = 5 + Math.random() * 5
    d.circle(0, 0, r).fill(0x8fe0f6)
    d.moveTo(-r * 0.7, -r * 0.4).quadraticCurveTo(0, -r * 2.2, r * 0.7, -r * 0.4).closePath().fill(0x8fe0f6)
    d.circle(-r * 0.3, -r * 0.3, r * 0.28).fill({ color: 0xffffff, alpha: 0.7 })
    d.position.set(x, y)
    d.eventMode = 'none'
    this._layer.addChild(d)
    const vx = (Math.random() * 2 - 1) * 150
    const st = { x, y, vy: -140 - Math.random() * 120, t: 0 }
    const tw = gsap.to(st, {
      t: 1, duration: 0.9, ease: 'none',
      onUpdate: () => {
        if (d.destroyed) { tw.kill(); return }
        const dt = 1 / 60
        st.vy += 900 * dt
        st.x += vx * dt
        st.y += st.vy * dt
        d.position.set(st.x, st.y)
        d.alpha = 1 - st.t * st.t
      },
      onComplete: () => { if (!d.destroyed) d.destroy() },
    })
  },

  // En ritad miniballong som klusterballongen släpper — seglar uppåt och tonar bort.
  _spawnMini(x, y, color) {
    const m = makeMiniBalloon(color)
    m.position.set(x, y)
    this._layer.addChild(m)
    const st = { x, y, a: 1 }
    const drift = (Math.random() * 2 - 1) * 70
    const tw = gsap.to(st, {
      y: y - 150 - Math.random() * 90, x: x + drift, a: 0, duration: 1.2, ease: 'power1.out',
      onUpdate: () => {
        if (m.destroyed) { tw.kill(); return }
        m.position.set(st.x, st.y)
        m.alpha = st.a
      },
      onComplete: () => { if (!m.destroyed) m.destroy({ children: true }) },
    })
  },

  // Tomt tryck (mellanrum): mjuk ring + 'soft' + närmaste ballong wobblar. Aldrig "fel".
  _emptyTap(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    this._stopAttract()
    ctx.services.audio.sfx('soft')
    const p = this._layer.toLocal(e.global)
    ripple(this._layer, p.x, p.y, { color: 0xffffff, maxR: 64, alpha: 0.8 })

    // hitta närmaste levande ballong och ge den en lekfull skvätt-wobble
    let near = null
    let best = 1e9
    for (const b of this._balloons) {
      if (b._popped) continue
      const d = (b.x - p.x) ** 2 + (b.y - p.y) ** 2
      if (d < best) {
        best = d
        near = b
      }
    }
    if (near && best < 320 * 320) {
      gsap.killTweensOf(near.scale)
      gsap.to(near.scale, {
        x: 1.12,
        y: 0.9,
        duration: 0.08,
        yoyo: true,
        repeat: 3,
        ease: 'sine.inOut',
        onComplete: () => {
          if (!near.destroyed && !near._popped) near.scale.set(1)
        },
      })
    }
  },

  // Starta/stoppa idle-lockaren (en ballong "andas").
  _startAttract() {
    if (this._attractTween) return
    const live = this._balloons.filter((b) => !b._popped && !b.destroyed)
    if (!live.length) return
    const b = randomFrom(live)
    this._attractBalloon = b
    this._attractTween = breathe(b, { scale: 1.1, duration: 0.85 })
  },

  _stopAttract() {
    if (this._attractTween) {
      this._attractTween.kill()
      this._attractTween = null
    }
    const b = this._attractBalloon
    this._attractBalloon = null
    if (b && !b.destroyed && !b._popped) b.scale.set(1)
  },

  // Driv stigningen, vaggan, respawn och idle-recue.
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000

    if (!this._resolving) {
      const live = []
      for (const b of this._balloons) {
        if (b._popped) continue
        b.y -= this._speed * b._speedMul * dt
        if (b.y < -130) {
          // svävat ut över toppen -> mjuk respawn nere igen (oändlig sväng)
          b.y = ctx.height + 130
          b._baseX = this._spawnX(ctx)
        }
        if (b._bumpCd > 0) b._bumpCd -= dt
        live.push(b)
      }

      // Bobo tittar på den ballong som är närmast honom — publiken följer det som
      // är på väg att hända. `look()` räknar i FÖRÄLDERNS rymd, och riggen sitter i
      // `_bobo`, medan ballongerna ligger i `_world`; därför via global.
      if (this._kar && this._bobo && !this._bobo.destroyed && live.length) {
        let mal = null
        let bast = Infinity
        for (const b of live) {
          const d = (b.x - this._bobo.x) ** 2 + (b.y - this._bobo.y) ** 2
          if (d < bast) { bast = d; mal = b }
        }
        if (mal && !mal.destroyed) {
          const p = this._bobo.toLocal(mal.getGlobalPosition())
          this._kar.look(p.x, p.y)
        }
      }

      // Ballongerna knuffar undan varandra (billig cirkelstöt, ingen matter.js). Det gör
      // dem till LEVANDE, rörliga mål istället för rekvisita på räls: en pop mitt i
      // klungan får grannarna att guppa undan, och nästa tryck kräver ett nytt sikte.
      const minX = SIDE_MARGIN
      const maxX = ctx.width - SIDE_MARGIN
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          const a = live[i]
          const c = live[j]
          const dx = c.x - a.x
          const dy = c.y - a.y
          const rad = 58 * a._size + 58 * c._size
          const d2 = dx * dx + dy * dy
          if (d2 >= rad * rad || d2 < 0.5) continue
          const d = Math.sqrt(d2)
          const push = (rad - d) * 0.45
          const nx = dx / d
          const ny = dy / d
          a._baseX = Math.max(minX, Math.min(maxX, a._baseX - nx * push))
          c._baseX = Math.max(minX, Math.min(maxX, c._baseX + nx * push))
          a.y -= ny * push * 0.5
          c.y += ny * push * 0.5
          // liten squash vid första kontakten (inte varje bildruta)
          if (a._bumpCd <= 0 && c._bumpCd <= 0) {
            a._bumpCd = 0.6
            c._bumpCd = 0.6
            for (const o of [a, c]) {
              if (o._fxScaleBusy || o._popped) continue
              gsap.to(o.scale, {
                x: 1.07, y: 0.94, duration: 0.09, yoyo: true, repeat: 1, ease: 'sine.inOut',
                onComplete: () => { if (!o.destroyed && !o._popped) o.scale.set(1) },
              })
            }
          }
        }
      }
      for (const b of live) b.x = b._baseX + b._swayOffset
    }

    // Kombo-ton svalnar: ingen pop på ~0,7s → nästa pop börjar om nerifrån.
    if (this._comboDecay > 0) {
      this._comboDecay -= dt
      if (this._comboDecay <= 0) this._combo = 0
    }

    this._idle += dt
    if (this._idle > 6 && this._remaining > 0 && !this._resolving) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(NUDGES))
      this._startAttract()
      // Bobo pekar uppåt mot ballongerna — en visuell om-cue som funkar utan ljud.
      if (this._boboArm && !this._boboArm.destroyed) {
        gsap.to(this._boboArm, {
          rotation: -0.5, duration: 0.35, yoyo: true, repeat: 3, ease: 'sine.inOut',
          onComplete: () => { if (this._boboArm && !this._boboArm.destroyed) this._boboArm.rotation = 0 },
        })
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    ctx.services.voice.cancel()
    this._respawnCall?.kill()
    this._stopAttract()
    this._kar?.destroy() // river riggens alla tweens (idle, blink, humör, reaktion)
    this._kar = null
    this._boboIdle?.kill()
    if (this._bobo) gsap.killTweensOf(this._bobo)
    if (this._boboArm) gsap.killTweensOf(this._boboArm)
    this._friendSprites?.forEach((f) => {
      f._breath?.kill()
      gsap.killTweensOf(f)
      gsap.killTweensOf(f.scale)
    })
    this._friendSprites = []
    this._pips?.forEach((p) => gsap.killTweensOf(p.scale))
    this._balloons?.forEach((b) => {
      b._sway?.kill()
      b._silTw?.kill()
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
    })
    gsap.killTweensOf(this._layer)
    this._layer?.destroy({ children: true })
  },
}
