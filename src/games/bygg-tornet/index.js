// Bygg Tornet — bygg-/fysiklek (3–5 år). Barnet drar (eller tap-tap:ar) mjuka
// klossar från lådan upp till tornets lysande topp-plats. Klossen snäpper magnetiskt
// på plats, tornet växer en våning och vajar lekfullt. Tornet kan ALDRIG rasa eller
// "förlora" — det studsar bara glatt och kan alltid byggas vidare. När mål-höjden nås
// firar vi (delat complete: stjärna + klistermärke) och en ny, högre runda byggs upp.
// Allt ritas programmatiskt (Pixi Graphics + system-emoji) — inga externa filer.
import { Container, Graphics, Text } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, wiggle, puff, sparkle } from '../../lib/feedback.js'
import { COLORS, PLAYFUL, FONT } from '../../lib/theme.js'

// Layout i designkoordinater (1280×720).
const BASE_X = 640 // tornets mittlinje
const GROUND_TOP_Y = 600 // markens ovansida (nedersta klossens botten)
const BW = 220 // klossbredd (≫96px träffyta)
const BH = 76 // klosshöjd
const BOX_X = 250 // lådans/spawn-platsens mitt
const BOX_BLOCK_Y = 560 // den väntande klossens y i lådan

// Slot-center för kloss-index i (0 = nederst): 562, 486, 410, ... (max 8 ryms).
const slotY = (i) => GROUND_TOP_Y - BH / 2 - i * BH

const NUMBERS = ['ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta']
const PLACE_LINES = ['En till!', 'Så högt!', 'Pling!', 'Wow!', 'Mer!']

export default {
  id: 'bygg-tornet',
  titleSv: 'Bygg Tornet',
  icon: '🧱',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'bygg-tornet',
  voiceIntro: 'Bygg ett högt torn! Dra en kloss och ställ den överst.',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._idle = 0
    this._sway = 0
    this._wobble = 0
    this._placed = []
    this._count = 0
    this._goal = 4
    this._resolving = false
    this._celebrating = false
    this._active = null

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._buildScene(ctx)
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._newTower(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Statisk scen (byggs en gång, återanvänds mellan torn) --------------

  _buildScene(ctx) {
    // Bakgrund: fångar tomma tryck mjukt (alltid ett svar på varje pekning).
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(COLORS.bg)
    bg.eventMode = 'static'
    bg.on('pointertap', (e) => this._bgTap(ctx, e))
    this._root.addChild(bg)

    // Mark/golv med ljus gräskant ovanpå.
    const floor = new Graphics()
      .roundRect(BASE_X - 260, GROUND_TOP_Y, 520, 90, 24)
      .fill(COLORS.brown)
    floor.roundRect(BASE_X - 260, GROUND_TOP_Y, 520, 18, 9).fill(COLORS.green)
    floor.eventMode = 'none'
    this._root.addChild(floor)

    // Tornets staplingskolumn: roterar om basen (mjuk sway). Klossar blir barn här.
    this._tower = new Container()
    this._tower.pivot.set(BASE_X, GROUND_TOP_Y)
    this._tower.position.set(BASE_X, GROUND_TOP_Y)
    this._tower.eventMode = 'none'
    this._tower.interactiveChildren = false
    this._root.addChild(this._tower)

    // Mål-indikator (flagga) som visar hur högt det ska byggas.
    this._flag = new Text({ text: '🚩', style: { fontFamily: FONT.body, fontSize: 64 } })
    this._flag.anchor.set(0.5)
    this._flag.eventMode = 'none'
    this._root.addChild(this._flag)

    // Platsmarkör (drop-slot): pulsande ljus kontur — DragControllerns target.
    this._slot = new Graphics()
      .roundRect(-BW / 2 - 6, -BH / 2 - 6, BW + 12, BH + 12, 20)
      .fill({ color: COLORS.yellow, alpha: 0.12 })
      .stroke({ width: 6, color: COLORS.yellow })
    this._slot.x = BASE_X
    this._slot.y = slotY(0)
    this._root.addChild(this._slot)

    // Lådan/förvaringen runt spawn-platsen (rent visuell).
    const box = new Graphics()
      .roundRect(BOX_X - 132, BOX_BLOCK_Y - 8, 264, 112, 20)
      .fill({ color: COLORS.orange, alpha: 0.16 })
      .stroke({ width: 8, color: COLORS.orange })
    box.eventMode = 'none'
    this._root.addChild(box)
  },

  // ---- Torn (runda) -------------------------------------------------------

  _newTower(ctx) {
    if (!this._alive) return

    // Riv föregående torn: timers, drag-controller och alla placerade klossar.
    this._spawnTimer?.kill()
    this._celebrate?.kill()
    this._flagTween?.kill()
    this._drag?.destroy()
    for (const b of this._placed) {
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
      if (!b.destroyed) b.destroy({ children: true })
    }

    // Nollställ tillstånd.
    this._placed = []
    this._count = 0
    this._sway = 0
    this._wobble = 0
    this._resolving = false
    this._celebrating = false
    this._idle = 0
    this._active = null
    this._goal = Math.min(4 + this._level, 8)
    if (this._tower && !this._tower.destroyed) this._tower.rotation = 0

    // Platsmarkören tillbaka till nedersta våningen.
    gsap.killTweensOf(this._slot)
    this._slot.visible = true
    this._slot.alpha = 1
    this._slot.scale.set(1)
    this._slot.y = slotY(0)

    // Mål-flaggan vid mål-höjden.
    this._flag.position.set(820, slotY(this._goal - 1) - 10)
    this._flag.scale.set(1)
    this._flagTween = gsap.to(this._flag, {
      y: this._flag.y - 12,
      duration: 1.1,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    })

    // Drag-controller: ett enda generöst target (markören) som tar emot ALLT.
    this._drag = new DragController({ space: this._root, services: ctx.services })
    this._drag.addTarget(this._slot, () => true, { hitRadius: 1500 })

    this._spawnBlock(ctx)
  },

  _spawnBlock(ctx) {
    if (!this._alive) return
    if (this._count >= this._goal) {
      this._finishTower(ctx)
      return
    }
    const i = this._count
    const block = this._makeBlock(i)
    block.position.set(BOX_X, BOX_BLOCK_Y)
    this._root.addChild(block)
    this._active = block
    bounceIn(block)

    this._drag.addItem(
      block,
      { i },
      {
        onSelect: () => {
          this._idle = 0
        },
        onWrong: (rec) => {
          if (!this._alive) return
          this._idle = 0
          ctx.services.audio.sfx('soft')
          wiggle(rec.view)
        },
        onCorrect: (rec) => this._onCorrect(ctx, rec),
      },
    )
  },

  // Kloss snäppt på markören (DragController har redan flyttat den dit).
  _onCorrect(ctx, rec) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._idle = 0
    const i = this._count
    const block = rec.view

    // Fäst klossen i tornet på exakt slot-position (tornet står rakt vid släpp).
    this._sway = 0
    if (this._tower && !this._tower.destroyed) {
      this._tower.rotation = 0
      if (!block.destroyed) {
        this._tower.addChild(block)
        block.position.set(BASE_X, slotY(i))
        block.rotation = 0
      }
    }
    this._placed.push(block)
    this._active = null
    this._count++

    // Återkoppling < 100ms: ljud + glad puls + gnistror + extra torn-gunga.
    ctx.services.audio.sfx(this._count % 4 === 0 ? 'pop' : 'pling')
    if (!block.destroyed) pop(block)
    this._wobble = 0.05
    sparkle(ctx.fxLayer, BASE_X, slotY(i))
    ctx.services.voice.say(this._count <= NUMBERS.length ? NUMBERS[this._count - 1] : randomFrom(PLACE_LINES))

    if (this._count >= this._goal) {
      this._finishTower(ctx)
      return
    }

    // Flytta markören upp och spawna nästa kloss FÖRST när allt landat.
    gsap.to(this._slot, { y: slotY(this._count), duration: 0.3, ease: 'back.out(1.6)' })
    this._spawnTimer = gsap.delayedCall(0.18, () => {
      if (!this._alive) return
      this._resolving = false
      this._spawnBlock(ctx)
    })
  },

  // Mål-höjden nådd: glad flagga, delat firande, "studsa isär"-puff, ny högre runda.
  _finishTower(ctx) {
    if (!this._alive || this._celebrating) return
    this._celebrating = true
    this._resolving = true
    this._idle = 0

    // Markören vilar; flaggan hoppar glatt.
    gsap.killTweensOf(this._slot)
    this._slot.visible = false
    this._flagTween?.kill()
    pop(this._flag)
    this._flagTween = gsap.to(this._flag, {
      y: this._flag.y - 26,
      duration: 0.18,
      yoyo: true,
      repeat: 3,
      ease: 'power1.inOut',
    })

    // Spara förlopp och kör delat firande (celebrate-ljud + beröm + konfetti +
    // stjärna + klistermärke sköts av ctx.progress.complete()).
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('torn', (ctx.progress.get().custom?.torn || 0) + 1)
    ctx.progress.complete()

    // Glad "vinst"-gunga + exit-säkra puffar vid varje våning (aldrig ett fall).
    this._wobble = 0.13
    this._placed.forEach((_, idx) => puff(ctx.fxLayer, BASE_X, slotY(idx), { count: 6 }))

    this._celebrate = gsap.delayedCall(1.5, () => {
      if (this._alive) this._newTower(ctx)
    })
  },

  // En chunky LEGO-aktig kloss: rundad rektangel + två studs-cirklar + skuggrad.
  _makeBlock(i) {
    const c = new Container()
    const color = PLAYFUL[i % PLAYFUL.length]
    const g = new Graphics()
      .roundRect(-BW / 2, -BH / 2, BW, BH, 16)
      .fill(color)
      .stroke({ width: 5, color: COLORS.white, alpha: 0.7 })
    // skuggrad nedtill (volym)
    g.roundRect(-BW / 2 + 10, BH / 2 - 16, BW - 20, 10, 6).fill({ color: darken(color, 0.22), alpha: 0.55 })
    // två studs upptill (LEGO-känsla)
    for (const sx of [-50, 50]) {
      g.circle(sx, -BH / 2 + 9, 12).fill({ color: lighten(color, 0.3) })
    }
    c.addChild(g)
    return c
  },

  // ---- Bakgrund, sway & idle ---------------------------------------------

  _bgTap(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    if (this._drag?.selected) return // ett tap-tap-släpp pågår -> markören sköter det
    const p = this._root.toLocal(e.global)
    puff(ctx.fxLayer, p.x, p.y, { count: 6 })
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._t += dt
    this._idle += dt

    // Tornets sway + glad wobble — EN skrivare av tower.rotation. Sway dämpas under
    // drag så snäpp-koordinaterna stämmer; wobble är en avtagande extra-gunga.
    if (this._tower && !this._tower.destroyed) {
      const dragging = !!(this._drag && this._drag.active)
      const amp = Math.min(0.004 * this._count, 0.045)
      const swayTarget = dragging ? 0 : Math.sin(this._t * 1.6) * amp
      this._sway += (swayTarget - this._sway) * Math.min(1, dt * 5)
      this._wobble *= Math.exp(-7 * dt)
      this._tower.rotation = this._sway + Math.sin(this._t * 22) * this._wobble
    }

    // Markören andas mjukt.
    if (this._slot && !this._slot.destroyed && this._slot.visible) {
      this._slot.scale.set(1 + Math.sin(this._t * 4) * 0.06)
    }

    // Idle-recue efter ~6s: upprepa instruktionen + blinka markören/nudga klossen.
    if (this._idle > 6 && !this._celebrating) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      if (this._slot && !this._slot.destroyed && this._slot.visible) {
        gsap.fromTo(this._slot, { alpha: 0.35 }, { alpha: 1, duration: 0.45, repeat: 1, yoyo: true })
      }
      if (this._active && !this._active.destroyed && !this._drag?.active && !this._drag?.selected) {
        pop(this._active)
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._spawnTimer?.kill()
    this._celebrate?.kill()
    this._flagTween?.kill()
    this._drag?.destroy()
    for (const b of this._placed || []) {
      if (!b.destroyed) {
        gsap.killTweensOf(b)
        gsap.killTweensOf(b.scale)
      }
    }
    if (this._active && !this._active.destroyed) {
      gsap.killTweensOf(this._active)
      gsap.killTweensOf(this._active.scale)
    }
    if (this._tower && !this._tower.destroyed) gsap.killTweensOf(this._tower)
    if (this._slot && !this._slot.destroyed) {
      gsap.killTweensOf(this._slot)
      gsap.killTweensOf(this._slot.scale)
    }
    if (this._flag && !this._flag.destroyed) {
      gsap.killTweensOf(this._flag)
      gsap.killTweensOf(this._flag.scale)
    }
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}

function lighten(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const l = (v) => Math.round(v + (255 - v) * amt)
  return (l(r) << 16) | (l(g) << 8) | l(b)
}

function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
