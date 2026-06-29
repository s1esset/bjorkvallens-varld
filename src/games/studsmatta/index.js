// Studsmatta — fysik-lek (2–5 år). En glad kanin (🐰) studsar på en studsmatta.
// Tryck var som helst så får kaninen en extra, hög studs (med squash-stretch och
// snurr). Kaninen studsar oändligt vidare av sig själv — det finns inget att missa,
// ingen poäng, ingen timer. Efter ett gäng riktiga studs kommer ett kort, delat
// firande och leken rullar vidare. matter.js sköter fysiken via lib/physics.js.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, nudge, Matter } from '../../lib/physics.js'
import { floatText } from '../../lib/feedback.js'
import { randomFrom } from '../../lib/swedish.js'
import { COLORS, FONT } from '../../lib/theme.js'

const { Body } = Matter

// --- Geometri (designkoordinater 1280x720) ---
const CX = 640 // studsmattans mitt
const BED_Y = 540 // mattans yta (övre kant)
const HALF_SPAN = 230 // halva mattans bredd
const FLOOR_Y = 678 // där benen står
const CHAR_R = 40 // kaninens fysik-radie

// --- Fysik-trimning (matter.js-enheter; finjustera vid speltest) ---
const GRAVITY_Y = 1.2
const MIN_UP = 11 // minsta studs -> kaninen studsar alltid vidare (oändligt)
const MAX_UP = 20 // tak på uppåt-fart -> kaninen flyger ALDRIG ur skärmen
const COUNT_THRESHOLD = 14 // landning räknas som "riktig studs" om nedfarten är snabb (dvs efter ett tryck)
const CEIL_Y = 130 // mjukt tak: studsar tillbaka ned om kaninen ändå kommer för högt
const BOUNCES_PER_CELEBRATION = 10

const RECUE = ['Tryck så studsar kaninen högt!', 'Tryck på kaninen!', 'Hoppla, så högt kaninen studsar!']
const CHEERS = ['Hopp!', 'Wii!', 'Högre!', 'Studs!']
const FLOATS = ['🎵', '⭐', '🎶', '🎉']

export default {
  id: 'studsmatta',
  titleSv: 'Studsmatta',
  icon: '🦘',
  category: 'fysik',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'studsmatta',
  voiceIntro: 'Tryck så studsar kaninen högt!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._bounces = 0
    this._lastLand = 0
    this._lastVoice = 0
    this._bedProxy = { dip: 0 }

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Dekor (himmel/sol/moln/gräs) — aldrig tryckbar.
    const decor = makeDecor(ctx.width, ctx.height)
    this._root.addChild(decor)

    // Skugga under kaninen (grundkänsla; krymper när den är hög).
    this._shadow = new Graphics().ellipse(0, 0, 60, 15).fill({ color: COLORS.shadow, alpha: 0.18 })
    this._shadow.position.set(CX, BED_Y + 16)
    this._shadow.eventMode = 'none'
    this._root.addChild(this._shadow)

    // Studsmattans ram + ben (statiskt, ritas en gång).
    this._frame = makeFrame()
    this._root.addChild(this._frame)

    // Elastisk matt-linje (ritas om varje bildruta med aktuell "dip").
    this._bed = new Graphics()
    this._bed.eventMode = 'none'
    this._root.addChild(this._bed)
    this._drawBed(0)

    // Kaninen (emoji), kopplad till en fysik-kropp.
    this._charView = new Text({ text: '🐰', style: { fontFamily: FONT.body, fontSize: 78 } })
    this._charView.anchor.set(0.5)
    this._charView.eventMode = 'none'
    this._root.addChild(this._charView)

    // Fysik: golv + sidoväggar (mjukt tak hanteras manuellt i ticken).
    this._phys = new PhysicsWorld({ gravityY: GRAVITY_Y, walls: ['floor', 'left', 'right'] })

    // Studsmattans bädd = statisk kropp tvärs över mattan. Restitution 0 — själva
    // studsen styr vi själva i _land (collisionStart fyras efter Matters lösare,
    // så vår setVelocity vinner alltid -> full kontroll, inga okontrollerade höjder).
    this._bedBody = this._phys.rectangle(CX, BED_Y + 22, HALF_SPAN * 2, 44, {
      isStatic: true,
      restitution: 0,
      friction: 0,
      label: 'bed',
    })

    this._char = this._phys.circle(CX, BED_Y - 80, CHAR_R, {
      restitution: 0.9,
      friction: 0.001,
      frictionAir: 0.002,
      label: 'char',
    })
    this._phys.link(this._char, this._charView)

    this._unbind = this._phys.onCollision((e) => this._onCollision(ctx, e))

    // Hela scenen är ett stort, förlåtande tryck-mål: tryck var som helst = studs.
    this._catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    this._catcher.eventMode = 'static'
    this._catcher.on('pointertap', () => this._boost(ctx))
    this._root.addChild(this._catcher)

    this._tick = (t) => {
      if (!this._alive) return
      this._phys.update(t.deltaMS)
      const char = this._char

      // Mjukt tak: kommer kaninen ändå för högt, studsa lugnt tillbaka ned.
      if (char.position.y < CEIL_Y && char.velocity.y < 0) {
        nudge(char, char.velocity.x, Math.abs(char.velocity.y) * 0.35 + 1)
      }

      // Mjuk centrering så kaninen håller sig över mattan (aldrig av åt sidan).
      const dx = CX - char.position.x
      if (Math.abs(dx) > 24) {
        let vx = char.velocity.x + dx * 0.01
        vx = Math.max(-8, Math.min(8, vx))
        nudge(char, vx, char.velocity.y)
      }

      // Dämpa eventuellt snurr mjukt mot vila.
      if (Math.abs(char.angularVelocity) > 0.01) {
        Body.setAngularVelocity(char, char.angularVelocity * 0.95)
      }

      // Elastisk matta + skugga som krymper med höjden.
      this._drawBed(this._bedProxy.dip)
      const h = Math.max(0, Math.min(1, (BED_Y - char.position.y) / 380))
      this._shadow.x = char.position.x
      this._shadow.scale.set(1 - h * 0.5, 1)
      this._shadow.alpha = 0.18 * (1 - h * 0.6)

      // Tyst om-tilltal om barnet inte tryckt på ~6 s (kaninen studsar ändå vidare).
      this._idle += t.deltaMS / 1000
      if (this._idle > 6) {
        this._idle = 0
        this._say(ctx, randomFrom(RECUE), 0)
      }
    }
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    this._say(ctx, this.voiceIntro, 0)
  },

  // Tryck -> extra hög studs (capad), squash-stretch, litet snurr, glatt ljud.
  _boost(ctx) {
    if (!this._alive) return
    this._idle = 0
    const char = this._char
    nudge(char, (Math.random() - 0.5) * 4, -MAX_UP)
    Body.setAngularVelocity(char, (Math.random() - 0.5) * 0.4)
    this._squash(this._charView, true)
    ctx.services.audio.sfx(Math.random() < 0.5 ? 'whoosh' : 'pop')
    if (Math.random() < 0.45) {
      floatText(ctx.fxLayer, this._charView.x, this._charView.y - 70, randomFrom(FLOATS))
    }
    if (Math.random() < 0.4) this._say(ctx, randomFrom(CHEERS), 1600)
  },

  // Kaninen landar på mattan: studsa upp igen (alltid minst MIN_UP, högst MAX_UP).
  _land(ctx) {
    if (!this._alive) return
    const now = performance.now()
    if (now - this._lastLand < 90) return // skydd mot dubbel-kollision
    this._lastLand = now

    const char = this._char
    const down = Math.max(char.velocity.y, 0)
    let up = down * 0.92
    if (up < MIN_UP) up = MIN_UP
    if (up > MAX_UP) up = MAX_UP
    nudge(char, char.velocity.x * 0.5, -up)

    this._dipBed()
    this._squash(this._charView, down > COUNT_THRESHOLD)
    ctx.services.audio.sfx('soft')

    // Bara riktiga studs (snabb nedfart, dvs efter ett tryck) räknas mot firandet
    // och får snurr/svävande symboler — de lugna idle-studsarna firas inte.
    if (down > COUNT_THRESHOLD) {
      Body.setAngularVelocity(char, (Math.random() - 0.5) * 0.34)
      if (Math.random() < 0.5) {
        floatText(ctx.fxLayer, this._charView.x, this._charView.y - 70, randomFrom(FLOATS))
      }
      this._bounces++
      if (this._bounces >= BOUNCES_PER_CELEBRATION) {
        this._bounces = 0
        ctx.progress.complete() // delat firande + beröm-röst + stjärna + klistermärke
      }
    }
  },

  _onCollision(ctx, e) {
    if (!this._alive) return
    for (const pair of e.pairs) {
      const hitBed =
        (pair.bodyA === this._char && pair.bodyB === this._bedBody) ||
        (pair.bodyB === this._char && pair.bodyA === this._bedBody)
      if (hitBed) {
        this._land(ctx)
        break
      }
    }
  },

  // Elastisk matt-linje som en kurva med variabel "dip".
  _drawBed(dip) {
    const g = this._bed
    if (!g || g.destroyed) return
    const lx = CX - HALF_SPAN
    const rx = CX + HALF_SPAN
    g.clear()
    g.moveTo(lx, BED_Y)
      .quadraticCurveTo(CX, BED_Y + dip, rx, BED_Y)
      .stroke({ width: 11, color: COLORS.teal, cap: 'round' })
    g.moveTo(lx, BED_Y - 4)
      .quadraticCurveTo(CX, BED_Y - 4 + dip, rx, BED_Y - 4)
      .stroke({ width: 3, color: COLORS.white, alpha: 0.5, cap: 'round' })
  },

  // Mattan sänks snabbt och fjädrar tillbaka.
  _dipBed() {
    if (!this._alive) return
    gsap.killTweensOf(this._bedProxy)
    gsap
      .timeline()
      .to(this._bedProxy, { dip: 30, duration: 0.07, ease: 'power2.out' })
      .to(this._bedProxy, { dip: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' })
  },

  // Squash (platt) -> stretch (lång) -> tillbaka. Tweenar bara scale (positionen
  // styrs av fysik-länken), så detta krockar aldrig med synken.
  _squash(view, big = false) {
    if (!view || view.destroyed) return
    gsap.killTweensOf(view.scale)
    const sq = big ? 0.58 : 0.7 // hur platt
    const st = big ? 1.3 : 1.18 // hur lång
    gsap
      .timeline()
      .to(view.scale, { x: 2 - sq, y: sq, duration: 0.07, ease: 'power2.out' })
      .to(view.scale, { x: 2 - st, y: st, duration: 0.12, ease: 'power1.out' })
      .to(view.scale, { x: 1, y: 1, duration: 0.26, ease: 'back.out(2.2)' })
  },

  // Strypt röst-tilltal (undviker att prat staplas på varandra).
  _say(ctx, text, minGap = 1500) {
    const now = performance.now()
    if (now - this._lastVoice < minGap) return
    this._lastVoice = now
    ctx.services.voice.say(text)
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._unbind?.()
    if (this._charView && !this._charView.destroyed) {
      gsap.killTweensOf(this._charView)
      gsap.killTweensOf(this._charView.scale)
    }
    gsap.killTweensOf(this._bedProxy)
    gsap.killTweensOf(this._root)
    this._phys?.destroy()
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}

// --- Ritning (programmatisk, inga tillgångar) ---

// Statisk ram: ben + ändknoppar som håller mattan.
function makeFrame() {
  const g = new Graphics()
  g.eventMode = 'none'
  const lx = CX - HALF_SPAN
  const rx = CX + HALF_SPAN
  // Ben (vinklade ut mot golvet).
  g.moveTo(lx, BED_Y).lineTo(lx - 48, FLOOR_Y).stroke({ width: 18, color: COLORS.orangeDark, cap: 'round' })
  g.moveTo(rx, BED_Y).lineTo(rx + 48, FLOOR_Y).stroke({ width: 18, color: COLORS.orangeDark, cap: 'round' })
  // Fötter.
  g.roundRect(lx - 70, FLOOR_Y - 6, 44, 14, 7).fill(COLORS.brown)
  g.roundRect(rx + 26, FLOOR_Y - 6, 44, 14, 7).fill(COLORS.brown)
  // Ändknoppar (mattans fästen).
  g.circle(lx, BED_Y, 17).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
  g.circle(rx, BED_Y, 17).fill(COLORS.orange).stroke({ width: 3, color: COLORS.orangeDark })
  return g
}

// Dekorlager: gräs, sol, ett par moln. Aldrig interaktivt.
function makeDecor(w, h) {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false

  // Gräs längst ned.
  const grass = new Graphics().rect(0, FLOOR_Y + 2, w, h - FLOOR_Y).fill(COLORS.green)
  grass.rect(0, FLOOR_Y + 2, w, 8).fill(COLORS.greenDark)
  c.addChild(grass)

  // Sol uppe i hörnet.
  const sun = new Graphics().circle(120, 110, 56).fill(COLORS.yellow)
  c.addChild(sun)

  // Ett par mjuka moln.
  c.addChild(makeCloud(940, 130, 1))
  c.addChild(makeCloud(1120, 220, 0.75))

  return c
}

function makeCloud(x, y, scale = 1) {
  const g = new Graphics()
  g.circle(0, 0, 34).circle(38, 8, 28).circle(-34, 10, 26).circle(6, 18, 30).fill({ color: COLORS.white, alpha: 0.95 })
  g.position.set(x, y)
  g.scale.set(scale)
  g.eventMode = 'none'
  return g
}
