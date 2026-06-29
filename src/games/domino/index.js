// Domino — fysik-sandlåda (2–5 år). En rad färgglada brickor står på golvet. Tryck
// på (eller nära) en bricka så puttas den omkull och knuffar nästa, som knuffar
// nästa ... hela raden ramlar i en kedjereaktion (matter.js). Inget mål att missa:
// varje tryck ger ljud + liv, fel/tomma tryck ger en mjuk studs. När det mesta har
// ramlat kommer ett delat firande, sedan reser sig raden igen för oändlig lek.
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Matter } from '../../lib/physics.js'
import { randomFrom } from '../../lib/swedish.js'
import { pop } from '../../lib/feedback.js'
import { COLORS, PLAYFUL, DESIGN_W, DESIGN_H } from '../../lib/theme.js'

const { Body } = Matter

const COUNT = 12 // antal brickor i raden
const TILE_W = 26
const TILE_H = 96
const SPACING = 80 // satt så en fallande bricka träffar nästa vid ~35° (sin θ=(S-W)/H):
// nog fart + häveffekt för att knuffa nästa förbi tipppunkten. För tätt -> träff för
// tidigt/svagt (brickan lutar bara mot nästa); för glest -> träffar för lågt.
const FLOOR_Y = DESIGN_H - 40 // 680 — brickornas vilolinje / markens överkant
const PUSH_AV = 0.12 // liten knuff strax förbi tipppunkten (~0.26 rad) — sedan välter
// GRAVITATIONEN brickan så den faller på sin botten-kant och knuffar nästa. För stor
// vinkelhastighet får brickan att snurra runt sin mitt (propeller) istället för att välta.
const FALLEN_ANGLE = 1.0 // |vinkel| (rad) då en bricka räknas som "omkullen"
const STAND_ANGLE = 0.6 // |vinkel| under detta = brickan står fortfarande
const PUSH_WORDS = ['Putta!', 'Titta!', 'Oj!']

export default {
  id: 'domino',
  titleSv: 'Domino',
  icon: '🧱',
  category: 'fysik',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'domino',
  voiceIntro: 'Putta den första brickan så ramlar alla!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._resetting = false // sant från kedja-firande till dess raden rests igen
    this._lastHit = 0
    this._lastSay = 0
    this._tiles = [] // { body, view, home:{x,y}, index }
    this._cascadeCalls = [] // schemalagda knuffar i den pågående kedjan
    this._threshold = Math.ceil(COUNT * 0.7) // minst så här många omkullna -> firande

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // --- Fysik: golv + sidoväggar (sidoväggarna hindrar brickor från att åka av).
    this._phys = new PhysicsWorld({ gravityY: 1.5, walls: ['floor', 'left', 'right'] })
    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // Egen statisk mark vars ÖVERKANT ligger på FLOOR_Y (golvväggen sitter vid DESIGN_H,
    // så utan denna skulle brickorna falla 40px innan de landade). Brickorna vilar här.
    this._phys.rectangle(DESIGN_W / 2, FLOOR_Y + 130, DESIGN_W + 600, 260, {
      isStatic: true,
      friction: 0.9,
      restitution: 0,
    })

    // --- Dekorativ mark (grön gräsremsa) längst ner.
    const deco = new Graphics()
    deco.rect(0, FLOOR_Y, DESIGN_W, DESIGN_H - FLOOR_Y).fill(COLORS.green)
    deco.moveTo(0, FLOOR_Y).lineTo(DESIGN_W, FLOOR_Y).stroke({ width: 4, color: COLORS.greenDark })
    deco.eventMode = 'none'
    deco.interactiveChildren = false
    this._root.addChild(deco)

    // --- Brickorna i en jämnt spridd, rak rad.
    this._tilesLayer = new Container()
    this._tilesLayer.eventMode = 'none'
    this._tilesLayer.interactiveChildren = false
    this._root.addChild(this._tilesLayer)

    const startX = (DESIGN_W - (COUNT - 1) * SPACING) / 2
    for (let i = 0; i < COUNT; i++) {
      const x = startX + i * SPACING
      const y = FLOOR_Y - TILE_H / 2 // mitten -> underkant landar på FLOOR_Y
      const color = PLAYFUL[i % PLAYFUL.length]
      const view = makeTile(TILE_W, TILE_H, color)
      view.x = x
      view.y = y
      view.scale.set(0) // poppar in vid mount/reset
      this._tilesLayer.addChild(view)
      const body = this._phys.rectangle(x, y, TILE_W, TILE_H, {
        friction: 0.4,
        restitution: 0.04,
        frictionAir: 0.003, // låg luftfriktion -> rörelsemängden bär kedjan vidare
      })
      this._phys.link(body, view)
      this._tiles.push({ body, view, home: { x, y }, index: i })
    }

    // --- Tryckyta över hela scenen: tryck var som helst -> närmaste stående bricka puttas.
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._catcher.on('pointertap', (ev) => {
      if (!this._alive) return
      const p = this._root.toLocal(ev.global)
      this._handleTap(ctx, p.x)
    })
    this._root.addChild(this._catcher)

    this._tick = (t) => {
      if (!this._alive) return
      this._phys.update(t.deltaMS)

      // Kedjan klar? Räkna omkullna brickor och fira en gång per omgång.
      if (!this._resetting && this._countFallen() >= this._threshold) this._onChain(ctx)

      this._idle += t.deltaMS / 1000
      if (this._idle > 6) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
        // Visa idén: putta första brickan om raden står stilla.
        if (!this._resetting && this._countFallen() === 0) this._cascadeFrom(ctx, 0, 1)
      }
    }
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._standUp() // poppa upp brickorna i rad (visuell entré)
  },

  // Tryck (eller nära) en bricka -> putta närmaste STÅENDE bricka i riktning mot den
  // sida som har flest brickor kvar (maximal kedja oavsett var barnet trycker).
  _handleTap(ctx, x) {
    this._idle = 0
    const standing = this._tiles.filter((t) => Math.abs(t.body.angle) < STAND_ANGLE)
    if (standing.length) {
      const tile = nearestByX(standing, x)
      const left = standing.filter((t) => t.index < tile.index).length
      const right = standing.filter((t) => t.index > tile.index).length
      ctx.services.audio.sfx('pop')
      pop(tile.view, { scale: 1.12 })
      const now = performance.now()
      if (now - this._lastSay > 1400) {
        this._lastSay = now
        ctx.services.voice.say(randomFrom(PUSH_WORDS))
      }
      this._cascadeFrom(ctx, tile.index, right >= left ? 1 : -1)
    } else {
      // Allt ligger redan ner (t.ex. under reset-pausen): mjuk, lekfull respons.
      const tile = nearestByX(this._tiles, x)
      ctx.services.audio.sfx('soft')
      pop(tile.view, { scale: 1.12 })
    }
  },

  // Garanterad kedjereaktion: knuffa brickan vid index, schemalägg sedan nästa bricka i
  // riktningen ~100ms senare. Varje bricka faller med RIKTIG fysik (gravitationen välter
  // den på sin botten-kant), men spridningen är kodstyrd så kedjan ALLTID går hela vägen —
  // perfekt för ett no-fail-spel där exakt stel-kropps-kontakt annars blir nyckfull.
  _cascadeFrom(ctx, index, dir) {
    if (!this._alive || this._resetting) return
    const tile = this._tiles[index]
    if (tile && Math.abs(tile.body.angle) < STAND_ANGLE) {
      Body.setAngularVelocity(tile.body, dir * PUSH_AV)
    }
    const next = index + dir
    if (next >= 0 && next < this._tiles.length) {
      const call = gsap.delayedCall(0.1, () => this._cascadeFrom(ctx, next, dir))
      this._cascadeCalls.push(call)
    }
  },

  _killCascade() {
    this._cascadeCalls?.forEach((c) => c.kill())
    this._cascadeCalls = []
  },

  _countFallen() {
    let n = 0
    for (const t of this._tiles) if (Math.abs(t.body.angle) > FALLEN_ANGLE) n++
    return n
  },

  // Kedjan har vält tillräckligt många: ett mjukt "Pang!", delat firande, och om en
  // stund reser sig hela raden igen för oändlig omlek.
  _onChain(ctx) {
    this._resetting = true
    this._killCascade() // stoppa ev. återstående schemalagda knuffar
    ctx.services.voice.say('Pang!')
    // complete() sköter celebrate-sfx + slumpat beröm-röst + konfetti + stjärna + klistermärke.
    ctx.progress.complete()
    this._resetCall = gsap.delayedCall(2.2, () => {
      if (!this._alive) return
      this._reset(ctx)
    })
  },

  // Nollställ varje kropp till upprätt viloläge och synka vyn direkt.
  _reset(ctx) {
    for (const t of this._tiles) {
      Body.setPosition(t.body, { x: t.home.x, y: t.home.y })
      Body.setAngle(t.body, 0)
      Body.setVelocity(t.body, { x: 0, y: 0 })
      Body.setAngularVelocity(t.body, 0)
      if (!t.view.destroyed) {
        t.view.x = t.home.x
        t.view.y = t.home.y
        t.view.rotation = 0
      }
    }
    this._resetting = false
    this._idle = 0
    ctx.services.audio.sfx('whoosh')
    this._standUp() // poppa upp dem igen, vänster -> höger
  },

  // Visuell "res dig"-effekt: skala upp varje bricka från 0, lite förskjutet i tid.
  _standUp() {
    this._tiles.forEach((t, i) => {
      if (t.view.destroyed) return
      gsap.killTweensOf(t.view.scale)
      gsap.fromTo(
        t.view.scale,
        { x: 0, y: 0 },
        { x: 1, y: 1, duration: 0.4, delay: i * 0.04, ease: 'back.out(1.7)' },
      )
    })
  },

  // Mjuk "klack" när en bricka slår i nästa (strypt mot ljud-spam, men tät nog att
  // kedjan låter som rad-rad-rad).
  _onCollision(ctx, e) {
    if (!this._alive) return
    const now = performance.now()
    if (now - this._lastHit < 55) return
    for (const pair of e.pairs) {
      const speed = pair.bodyA.speed + pair.bodyB.speed
      if (speed > 1.6) {
        this._lastHit = now
        ctx.services.audio.sfx('tap')
        break
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._unbind?.()
    this._resetCall?.kill()
    this._killCascade()
    this._tiles.forEach((t) => {
      if (t.view && !t.view.destroyed) {
        gsap.killTweensOf(t.view)
        gsap.killTweensOf(t.view.scale)
      }
    })
    this._tiles = []
    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}

// Närmaste bricka (efter x-läge) i en lista.
function nearestByX(list, x) {
  let best = list[0]
  let bestD = Infinity
  for (const t of list) {
    const d = Math.abs(t.view.x - x)
    if (d < bestD) {
      bestD = d
      best = t
    }
  }
  return best
}

// Domino-bricka: avrundad rektangel i glad färg, en mittlinje och två små vita prickar.
// Ritad runt origo (0,0) = kroppens mitt, så fysik-länken kan sätta position+rotation.
function makeTile(w, h, color) {
  const g = new Graphics()
  const edge = shade(color, 0.22)
  g.roundRect(-w / 2, -h / 2, w, h, 7).fill(color).stroke({ width: 3, color: edge })
  g.moveTo(-w / 2 + 3, 0).lineTo(w / 2 - 3, 0).stroke({ width: 2, color: edge, alpha: 0.7 })
  g.circle(0, -h * 0.24, 4).fill({ color: COLORS.white })
  g.circle(0, h * 0.24, 4).fill({ color: COLORS.white })
  return g
}

function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
