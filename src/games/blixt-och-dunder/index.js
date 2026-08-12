// Blixt och Dunder — väder-magi för 3–5 år. Barnet drar fluffiga åskmoln fritt
// i kvällshimlen över en mysig by och trycker/gnider ett moln tills det lyser
// blått (3 tryck = fullt, ⚡ tonar in). När TVÅ fulladdade moln glider ihop och
// nuddar varandra ritas en vänlig blixt ner till den NÄRMASTE otända lampan —
// lampan tänds (gyllene glöd 💡), en mjuk dunder hörs och båda molnen laddar ur
// (litet regn) → tomma igen. Tänd alla byns lampor → regnbåge + firande, sedan
// byggs en större by. INGET kan bli fel: ett oladdat tryck ger bara mjukt regn,
// blixten böjer sig alltid mot närmaste otända lampa, och efter ~7s utan en ny
// tändning hjälper maskoten Bobo till så en lampa garanterat tänds.
//
// Två kontroller (input 'mixed'): PLACERING (dra moln) + LADDNING (tryck/gnid).
// Allt ritas programmatiskt (Pixi Graphics + emoji + lib/scene.js). Ingen
// matter.js — bara tick-driven drift + jitter-geometri + exit-säkra partiklar.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { bounceIn, pop, sparkle, burst, floatText, shake, breathe } from '../../lib/feedback.js'
import { COLORS, FONT } from '../../lib/theme.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { randomFrom } from '../../lib/swedish.js'

// Himmel-band (molnens yta) — molnen klampas hit.
// Molnbandet börjar under mätaren (y 95..129) — dekorativa moln drev tidigare in
// bakom lykt-ikonerna och gjorde räknaren oläsbar.
const BAND = { x0: 120, x1: 1160, y0: 168, y1: 360 }
const CLOUD_R = 70 // logisk kollisionsradie
const TOUCH_GAP = 20 // krav på litet överlapp innan "nudd"
const STRIKE_COOLDOWN = 0.4 // s mellan blixtar (ingen spam)
const IDLE_DELAY = 6 // s utan handling → röst-recue
const HELP_DELAY = 7 // s utan ny tändning → Bobos auto-hjälp
const BASE_Y = 660 // husens fot

const LIT_LINES = ['Blixten tände lampan!', 'Titta, den lyser!', 'Ljus i byn!', 'En lampa till lyser!']
// Röst-räkning per laddningssteg (Lära-fliken RÄKNAR nu).
const CHARGE_WORDS = ['Ett', 'Två', 'Tre — fullt!']
// Räkna lamporna högt vid varje tändning ("En lampa! …Två lampor!").
const LAMP_COUNT = ['En lampa!', 'Två lampor!', 'Tre lampor!', 'Fyra lampor!', 'Fem lampor!', 'Sex lampor!']

// Byn sover tills lamporna tänds (se makeHouse/_wakeHouse).
const WIN_SLEEP = 0x53627a // släckt ruta — kvällsblå, aldrig svart
const HOUSE_SLEEP = 0xd6cfe4 // huset i kvällens kalla ton
const SMOKE_DUR = 2.8 // s för en rökpuff hela vägen upp
const SMOKE_RISE = 74 // px puffen stiger innan den tunnas ut

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'blixt-och-dunder',
  titleSv: 'Blixt och Dunder',
  icon: '⚡',
  category: 'larande',
  input: 'mixed',
  ageRange: [3, 5],
  bundle: 'blixt-och-dunder',
  voiceIntro: 'Dra ihop molnen och tryck för att ladda dem!',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._idle = 0
    this._sinceLight = 0
    this._strikeCooldown = 0
    this._resolving = false
    this._completing = false
    this._activeCloud = null
    this._clouds = []
    this._lamps = []
    this._houses = []
    this._meterIcons = []
    this._litCount = 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund: varm skymning med sol + drivande moln (FÖRSTA barn).
    const scene = createScene('sunset', { width: ctx.width, height: ctx.height, ground: true })
    scene.eventMode = 'none'
    this._root.addChild(scene)

    // Lager-ordning: scen → by → blixt → moln → mätare → Bobo.
    this._village = new Container()
    this._village.eventMode = 'none'
    this._village.interactiveChildren = false
    this._root.addChild(this._village)

    this._bolt = new Graphics()
    this._bolt.eventMode = 'none'
    this._root.addChild(this._bolt)

    this._cloudLayer = new Container()
    this._root.addChild(this._cloudLayer)

    this._meterLayer = new Container()
    this._meterLayer.eventMode = 'none'
    this._meterLayer.interactiveChildren = false
    this._root.addChild(this._meterLayer)

    // Bobo som RIGG (lib/karaktarer.js). Yttre containern står kvar: spelets egna
    // `pop()` går på den, medan riggens andning äger sin egen `view.scale`.
    // y=596 lade fötterna på 731 — utanför 720-skärmen. 556 sätter dem på 686.
    this._bobo = new Container()
    this._bobo.position.set(112, 556)
    this._bobo.eventMode = 'none'
    this._bobo.interactiveChildren = false
    this._kar = makeKaraktar({ r: 54 })
    this._bobo.addChild(this._kar.view)
    this._root.addChild(this._bobo)

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._buildVillage(ctx, this._level)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Bygg by (hus + lampor + mätare + moln) -----------------------------

  _layoutFor(level) {
    let lampXs, cloudCount
    if (level <= 1) {
      lampXs = [430, 850]
      cloudCount = 2
    } else if (level <= 3) {
      lampXs = [320, 640, 960]
      cloudCount = 3
    } else if (level <= 5) {
      lampXs = [280, 540, 800, 1050]
      cloudCount = level >= 5 ? 4 : 3
    } else {
      lampXs = [240, 460, 660, 880, 1100]
      cloudCount = 4
    }
    // Nivå 6+: upprepa mönstren med liten slump-jitter (±30px).
    if (level >= 6) lampXs = lampXs.map((x) => clamp(x + (Math.random() * 60 - 30), 200, 1090))
    return { lampXs, cloudCount }
  },

  _buildVillage(ctx, level) {
    if (!this._alive) return
    this._clearVillage()

    this._resolving = false
    this._completing = false
    this._activeCloud = null
    this._litCount = 0
    this._idle = 0
    this._sinceLight = 0
    this._strikeCooldown = 0
    this._t = 0

    const lay = this._layoutFor(level)

    // Hus + lampor (otänd stil). Husen ligger index-parallellt med lamporna, så
    // lampa i väcker hus i.
    this._lamps = []
    this._houses = []
    lay.lampXs.forEach((cx, i) => {
      const house = makeHouse(cx, BASE_Y, i)
      this._village.addChild(house)
      this._houses.push(house)
      const lamp = makeLamp(cx, BASE_Y - 210, i)
      this._village.addChild(lamp.container)
      lamp.cx = cx
      lamp.cy = BASE_Y - 210
      lamp._lit = false
      lamp.index = i
      this._lamps.push(lamp)
      bounceIn(lamp.container, { delay: 0.05 * i })
    })

    // Mätare: en liten ritad lykta per lampa, grå tills lampan tänds.
    this._buildMeter(ctx, lay.lampXs.length)

    // Moln spridda i himmel-bandet med liten drift.
    this._clouds = []
    const n = lay.cloudCount
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0.5 : i / (n - 1)
      const x = clamp(220 + f * 840 + (Math.random() * 40 - 20), BAND.x0 + 40, BAND.x1 - 40)
      const y = clamp(180 + (i % 2) * 90 + (Math.random() * 30 - 15), BAND.y0, BAND.y1)
      const cloud = this._makeCloud(ctx, x, y)
      this._cloudLayer.addChild(cloud)
      this._clouds.push(cloud)
      bounceIn(cloud, { delay: 0.08 * i })
    }
  },

  _buildMeter(ctx, n) {
    this._meterIcons = []
    const gap = 52
    const startX = ctx.width / 2 - ((n - 1) * gap) / 2
    for (let i = 0; i < n; i++) {
      // Samma ritade lykta som i byn, nedskalad — mätaren ska visa DE HÄR sakerna,
      // inte en emoji som råkar likna dem.
      const t = makeLampArt('lampa')
      t.scale.set(0.58)
      t.position.set(startX + i * gap, 112)
      t.tint = 0x888888
      t.alpha = 0.5
      this._meterLayer.addChild(t)
      this._meterIcons.push(t)
    }
  },

  _clearVillage() {
    if (this._bolt && !this._bolt.destroyed) this._bolt.clear()
    this._boltTween?.kill()
    if (this._rainbow && !this._rainbow.destroyed) {
      gsap.killTweensOf(this._rainbow)
      this._rainbow.destroy()
    }
    this._rainbow = null
    // Lampor (döda tweens innan destroy).
    for (const l of this._lamps) {
      if (l.container && !l.container.destroyed) {
        gsap.killTweensOf(l.container.scale)
        if (l.art && !l.art.destroyed) {
          gsap.killTweensOf(l.art.scale)
          gsap.killTweensOf(l.art)
        }
        gsap.killTweensOf(l.glow)
      }
    }
    this._lamps = []
    // Hus (vakna-tween + rutans pop dör innan noden rivs).
    for (const h of this._houses || []) {
      h._wakeTw?.kill()
      if (h._win && !h._win.destroyed) {
        h._win._fxPopTl?.kill()
        gsap.killTweensOf(h._win.scale)
      }
    }
    this._houses = []
    if (this._village) for (const c of [...this._village.children]) c.destroy({ children: true })
    // Moln (avregistrera lyssnare + döda tweens innan destroy).
    for (const c of this._clouds) this._teardownCloud(c)
    this._clouds = []
    if (this._cloudLayer) for (const c of [...this._cloudLayer.children]) c.destroy({ children: true })
    // Mätare.
    for (const m of this._meterIcons) if (m && !m.destroyed) gsap.killTweensOf(m.scale)
    this._meterIcons = []
    if (this._meterLayer) for (const c of [...this._meterLayer.children]) c.destroy({ children: true })
  },

  // ---- Ett moln -----------------------------------------------------------

  _makeCloud(ctx, x, y) {
    const c = new Container()
    c.position.set(x, y)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Circle(0, 0, 96) // ≥192px träffyta
    c._r = CLOUD_R
    c.charge = 0
    c.vx = (Math.random() * 2 - 1) * 0.15
    c.vy = (Math.random() * 2 - 1) * 0.1
    c._moved = false
    c._autoHelp = false

    // Blå laddnings-glöd (bakom kroppen → haloar runt molnet). Alpha sätts per frame.
    const glow = new Graphics().circle(0, 6, 92).fill(COLORS.blue)
    glow.alpha = 0
    glow.eventMode = 'none'
    c.addChild(glow)

    // Distinkt ÅSKMOLN-kropp: mörkare grå-blå & plufsigare så det ALDRIG förväxlas
    // med scenens dekorativa vita moln (den enskilt viktigaste läsbarhets-fixen).
    const body = makeThunderCloudBody(1.25)
    body.eventMode = 'none'
    c.addChild(body)

    // Tre laddnings-prickar som fylls per tryck (synligt "hur nära fullt?").
    const pipBox = new Container()
    pipBox.position.set(0, 30)
    pipBox.eventMode = 'none'
    const pips = []
    for (let i = 0; i < 3; i++) {
      const px = (i - 1) * 30
      const ring = new Graphics().circle(0, 0, 11).fill({ color: 0xffffff, alpha: 0.22 }).stroke({ width: 3, color: 0xffffff, alpha: 0.9 })
      ring.position.set(px, 0)
      const fill = new Graphics().circle(0, 0, 8).fill(COLORS.yellow)
      fill.position.set(px, 0)
      fill.alpha = 0
      fill.eventMode = 'none'
      ring.eventMode = 'none'
      pipBox.addChild(ring, fill)
      pips.push({ ring, fill })
    }
    c.addChild(pipBox)
    c._pipBox = pipBox
    c._pips = pips
    c._litPips = 0
    c._full = false

    // ⚡ tonar in vid full laddning.
    const zap = new Text({ text: '⚡', style: { fontFamily: FONT.body, fontSize: 54 } })
    zap.anchor.set(0.5)
    zap.position.set(0, -10)
    zap.alpha = 0
    zap.eventMode = 'none'
    c.addChild(zap)

    c._glow = glow
    c._zap = zap

    // Mjuk "tryck mig"-puls på prickarna tills barnet börjar ladda (stannar vid 1:a).
    c._hintTween = breathe(pipBox, { scale: 1.18, duration: 0.7 })

    c._moveHandler = (e) => this._onCloudMove(ctx, c, e)
    c._downHandler = (e) => this._onCloudDown(ctx, c, e)
    c._upHandler = () => this._onCloudUp(ctx, c)
    c.on('pointerdown', c._downHandler)
    c.on('pointerup', c._upHandler)
    c.on('pointerupoutside', c._upHandler)
    return c
  },

  _teardownCloud(c) {
    if (!c || c.destroyed) return
    c.off('globalpointermove', c._moveHandler)
    c.removeAllListeners()
    c._hintTween?.kill()
    if (c._pipBox && !c._pipBox.destroyed) gsap.killTweensOf(c._pipBox.scale)
    if (c._pips) for (const p of c._pips) if (p.fill && !p.fill.destroyed) gsap.killTweensOf(p.fill.scale)
    gsap.killTweensOf(c.scale)
    gsap.killTweensOf(c)
  },

  // ---- Peklogik (egen, INTE DragController) -------------------------------

  _onCloudDown(ctx, cloud, e) {
    if (cloud.destroyed) return
    this._activeCloud = cloud
    const p = this._cloudLayer.toLocal(e.global)
    cloud._grabDX = cloud.x - p.x
    cloud._grabDY = cloud.y - p.y
    cloud._downGX = e.global.x
    cloud._downGY = e.global.y
    cloud._moved = false
    cloud.vx = 0
    cloud.vy = 0
    cloud._autoHelp = false
    // Lyft fram molnet överst + studs + ljud (<100ms).
    this._cloudLayer.setChildIndex(cloud, this._cloudLayer.children.length - 1)
    pop(cloud)
    ctx.services.audio.sfx('tap')
    cloud.on('globalpointermove', cloud._moveHandler)
    this._idle = 0
  },

  _onCloudMove(ctx, cloud, e) {
    if (this._activeCloud !== cloud || cloud.destroyed) return
    const p = this._cloudLayer.toLocal(e.global)
    cloud.x = clamp(p.x + cloud._grabDX, BAND.x0, BAND.x1)
    cloud.y = clamp(p.y + cloud._grabDY, BAND.y0, BAND.y1)
    const moved = Math.hypot(e.global.x - cloud._downGX, e.global.y - cloud._downGY)
    if (moved > 14) cloud._moved = true
    // Gnid-laddning medan fingret rör sig (throttlat, aldrig bestraffande).
    if (cloud._moved && cloud.charge < 1) this._rubCharge(ctx, cloud)
    this._idle = 0
  },

  _onCloudUp(ctx, cloud) {
    if (cloud.destroyed) return
    cloud.off('globalpointermove', cloud._moveHandler)
    if (this._activeCloud === cloud) {
      if (!cloud._moved) this._chargeTap(ctx, cloud) // ren tryckning → laddningssteg
      // Ge tillbaka en lugn drift.
      cloud.vx = (Math.random() * 2 - 1) * 0.15
      cloud.vy = (Math.random() * 2 - 1) * 0.1
      this._activeCloud = null
    }
    this._idle = 0
  },

  _rubCharge(ctx, cloud) {
    if (cloud.charge >= 1) return
    const now = performance.now()
    if (now - (cloud._lastRub || 0) < 35) return
    cloud._lastRub = now
    cloud.charge = Math.min(1, cloud.charge + 0.02)
    this._afterCharge(ctx, cloud, true)
  },

  _chargeTap(ctx, cloud) {
    if (cloud.charge >= 1) {
      // Redan fullt — bara mjuk gnistra, aldrig fel.
      ctx.services.audio.sfx('soft')
      sparkle(ctx.fxLayer, cloud.x, cloud.y, { count: 4 })
      return
    }
    cloud.charge = Math.min(1, cloud.charge + 1 / 3) // 3 tryck = fullt
    if (cloud.charge < 1) this._rain(ctx, cloud) // rolig liten "miss": mjukt regn
    this._afterCharge(ctx, cloud, true)
  },

  // Fyll synliga prickar upp till aktuell laddning + räkna högt ("ett… två… tre").
  _afterCharge(ctx, cloud, speak) {
    if (!this._alive || cloud.destroyed) return
    const target = clamp(Math.round(cloud.charge * 3), 0, 3)
    while (cloud._litPips < target) {
      const idx = cloud._litPips
      const pip = cloud._pips?.[idx]
      if (pip && !pip.fill.destroyed) {
        pip.fill.alpha = 1
        pop(pip.fill)
      }
      cloud._litPips++
      // Sluta pulsa "tryck mig" så fort barnet laddat första gången.
      cloud._hintTween?.kill()
      cloud._hintTween = null
      if (cloud._pipBox && !cloud._pipBox.destroyed) cloud._pipBox.scale.set(1)
      // Stigande laddningston per tryck (hörbar trappa upp mot fullt).
      ctx.services.audio.tone({ freq: 380 + idx * 150, dur: 0.14, type: 'triangle', vol: 0.26, slideTo: 470 + idx * 170 })
      if (speak) ctx.services.voice.say(CHARGE_WORDS[cloud._litPips - 1])
    }
    if (cloud.charge >= 1 && !cloud._full) this._becameFull(ctx, cloud)
  },

  // Fyll alla prickar utan röst/ton (används av Bobos auto-hjälp).
  _setPipsFull(cloud) {
    if (cloud.destroyed) return
    cloud._litPips = 3
    cloud._full = true
    cloud._hintTween?.kill()
    cloud._hintTween = null
    if (cloud._pipBox && !cloud._pipBox.destroyed) cloud._pipBox.scale.set(1)
    if (cloud._pips) for (const p of cloud._pips) if (p.fill && !p.fill.destroyed) { p.fill.alpha = 1; pop(p.fill) }
  },

  // Nollställ prickar vid urladdning.
  _resetPips(cloud) {
    if (!cloud || cloud.destroyed) return
    cloud._litPips = 0
    cloud._full = false
    if (cloud._pips) for (const p of cloud._pips) if (p.fill && !p.fill.destroyed) {
      gsap.killTweensOf(p.fill.scale)
      p.fill.alpha = 0
      p.fill.scale.set(1)
    }
  },

  _becameFull(ctx, cloud) {
    cloud.charge = 1
    cloud._full = true
    ctx.services.audio.sfx('pling')
    // Litet "fräs" när molnet blir fullt — kort stigande fizz.
    ctx.services.audio.tone({ freq: 520, slideTo: 1500, dur: 0.2, type: 'sawtooth', vol: 0.12 })
    sparkle(ctx.fxLayer, cloud.x, cloud.y, { count: 8 })
    if (!cloud.destroyed) pop(cloud)
  },

  // Mjukt varmt mullrande dunder (temats bärande ljud) — lagrade låga toner med
  // liten slump-variation, i stället för whoosh+pop.
  _thunderRumble(ctx) {
    const a = ctx.services.audio
    const base = 58 + Math.random() * 26
    a.tone({ freq: base * 2, slideTo: base, dur: 0.7, type: 'sawtooth', vol: 0.14 })
    a.tone({ freq: base * 3.1, slideTo: base * 1.3, dur: 0.55, type: 'triangle', vol: 0.1, delay: 0.05 })
    a.tone({ freq: base, slideTo: base * 0.6, dur: 0.95, type: 'sine', vol: 0.12, delay: 0.12 })
  },

  // ---- Tick: drift + glöd + kollision + timers ----------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 16.67
    const dts = ticker.deltaMS / 1000
    this._t += dts
    if (this._strikeCooldown > 0) this._strikeCooldown -= dts

    for (const cloud of this._clouds) {
      if (cloud.destroyed) continue
      if (cloud === this._activeCloud) {
        // följer fingret — ingen drift.
      } else if (cloud._autoHelp) {
        // Bobos auto-hjälp: glid mjukt mot mötespunkten.
        cloud.x += (cloud._autoTX - cloud.x) * 0.07 * dt
        cloud.y += (cloud._autoTY - cloud.y) * 0.07 * dt
      } else {
        cloud.x += cloud.vx * dt
        cloud.y += cloud.vy * dt
        if (cloud.x <= BAND.x0) cloud.vx = Math.abs(cloud.vx)
        else if (cloud.x >= BAND.x1) cloud.vx = -Math.abs(cloud.vx)
        if (cloud.y <= BAND.y0) cloud.vy = Math.abs(cloud.vy)
        else if (cloud.y >= BAND.y1) cloud.vy = -Math.abs(cloud.vy)
      }
      cloud.x = clamp(cloud.x, BAND.x0, BAND.x1)
      cloud.y = clamp(cloud.y, BAND.y0, BAND.y1)
      // Glöd + ⚡ speglar laddningen (full = mjuk puls).
      if (cloud._glow && !cloud._glow.destroyed) {
        cloud._glow.alpha = cloud.charge >= 1 ? 0.5 + 0.12 * Math.sin(this._t * 6) : cloud.charge * 0.6
      }
      if (cloud._zap && !cloud._zap.destroyed) cloud._zap.alpha = cloud.charge
    }

    // Röken ur skorstenarna på de hus som vaknat. Puffarna återanvänds — bara
    // läge/skala/alfa ändras, ingen Graphics ritas om.
    for (const h of this._houses) {
      if (!h || h.destroyed || !h._awake) continue
      const sm = h._smoke
      if (!sm || sm.destroyed) continue
      for (const p of sm.children) {
        p._fas = (p._fas + dts / SMOKE_DUR) % 1
        const f = p._fas
        p.y = -f * SMOKE_RISE
        p.x = Math.sin(f * 5.4) * 9
        p.scale.set(0.65 + f * 0.95)
        // tonar in vid mynningen och ut mot toppen — en puff ska aldrig blinka fram.
        // ⚠️ Alfan får INTE följa (1−f) rakt av: mot en ljus kvällshimmel blir puffen då
        // osynlig redan halvvägs (uppmätt 655 målade px). Den håller sig tät längre.
        p.alpha = (1 - f * 0.85) * 0.72 * Math.min(1, f * 8)
      }
    }

    // Kollision: två fulladdade moln som nuddar → blixt.
    if (!this._resolving && this._strikeCooldown <= 0) {
      let struck = false
      for (let i = 0; i < this._clouds.length && !struck; i++) {
        for (let j = i + 1; j < this._clouds.length; j++) {
          const a = this._clouds[i]
          const b = this._clouds[j]
          if (a.destroyed || b.destroyed || a.charge < 1 || b.charge < 1) continue
          if (Math.hypot(a.x - b.x, a.y - b.y) < a._r + b._r - TOUCH_GAP) {
            this._strike(ctx, a, b)
            struck = true
            break
          }
        }
      }
    }

    // Mjuka timers.
    this._idle += dts
    this._sinceLight += dts
    if (this._idle >= IDLE_DELAY && !this._resolving) {
      this._idle = 0
      this._recue(ctx)
    }
    if (this._sinceLight >= HELP_DELAY && !this._resolving && this._strikeCooldown <= 0) {
      this._sinceLight = 0
      this._autoHelp(ctx)
    }
  },

  _recue(ctx) {
    if (!this._alive) return
    ctx.services.voice.say(this.voiceIntro)
    this._kar?.react('hej') // han VINKAR nu, inte bara studsar bredvid en 👋
    if (this._bobo && !this._bobo.destroyed) pop(this._bobo)
    floatText(ctx.fxLayer, this._bobo.x + 24, this._bobo.y - 70, '👋', { fontSize: 44 })
    const top = [...this._clouds].filter((c) => !c.destroyed).sort((a, b) => b.charge - a.charge)[0]
    if (top) pop(top)
  },

  // ---- Blixt --------------------------------------------------------------

  _strike(ctx, a, b) {
    if (!this._alive || this._resolving || this._strikeCooldown > 0) return
    const p0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const lamp = this._nearestUnlitLamp(p0)
    if (!lamp) return

    this._resolving = true
    this._strikeCooldown = STRIKE_COOLDOWN

    // Ladda ur molnen direkt (paret kan inte återutlösa) + litet regn.
    a.charge = 0
    b.charge = 0
    this._resetPips(a)
    this._resetPips(b)
    a._autoHelp = false
    b._autoHelp = false
    this._autoTimer?.kill()
    this._rain(ctx, a, 4)
    this._rain(ctx, b, 4)

    // Bygg + rita jagged båge ner till lampan.
    this._boltP0 = p0
    this._boltP1 = { x: lamp.cx, y: lamp.cy }
    this._buildBoltPts()
    this._drawBolt(1)

    // Dunder + mjuk vänlig ljusblixt + lätt skak.
    this._thunderRumble(ctx)
    this._lightFlash(ctx)
    shake(this._root, { intensity: 5, duration: 0.25 })

    // Tänd lampan.
    this._lightLamp(ctx, lamp)

    // Animera flash exit-säkert (tweena {}-proxy, ALDRIG _bolt direkt).
    const st = { a: 1, f: 0 }
    this._boltTween?.kill()
    this._boltTween = gsap.to(st, {
      a: 0,
      duration: 0.35,
      ease: 'power1.in',
      onUpdate: () => {
        if (!this._bolt || this._bolt.destroyed) {
          this._boltTween?.kill()
          return
        }
        st.f++
        if (st.f % 3 === 0) this._buildBoltPts() // re-jittra → flimmer
        this._drawBolt(st.a)
      },
      onComplete: () => {
        if (this._bolt && !this._bolt.destroyed) this._bolt.clear()
        if (this._alive && !this._completing) this._resolving = false
      },
    })

    if (this._litCount >= this._lamps.length) this._onComplete(ctx)
  },

  _buildBoltPts() {
    const p0 = this._boltP0
    const p1 = this._boltP1
    const n = 7
    const dx = p1.x - p0.x
    const dy = p1.y - p0.y
    const len = Math.hypot(dx, dy) || 1
    const px = -dy / len // vinkelrät enhetsvektor
    const py = dx / len
    const pts = []
    for (let i = 0; i <= n; i++) {
      const tt = i / n
      let x = p0.x + dx * tt
      let y = p0.y + dy * tt
      if (i > 0 && i < n) {
        const off = (Math.random() * 2 - 1) * 22
        x += px * off
        y += py * off
      }
      pts.push({ x, y })
    }
    this._boltPts = pts
  },

  _drawBolt(alpha) {
    const g = this._bolt
    if (!g || g.destroyed) return
    const pts = this._boltPts
    g.clear()
    if (!pts || pts.length < 2) return
    // Bred mjuk glow.
    g.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y)
    g.stroke({ width: 18, color: 0xbfe3ff, alpha: 0.5 * alpha, cap: 'round', join: 'round' })
    // Skarp vit kärna.
    g.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y)
    g.stroke({ width: 6, color: 0xffffff, alpha, cap: 'round', join: 'round' })
  },

  _nearestUnlitLamp(p) {
    let best = null
    let bd = Infinity
    for (const l of this._lamps) {
      if (l._lit) continue
      const d = Math.hypot(l.cx - p.x, l.cy - p.y)
      if (d < bd) {
        bd = d
        best = l
      }
    }
    return best
  },

  _lightLamp(ctx, lamp) {
    if (lamp._lit) return
    lamp._lit = true
    this._litCount++
    this._sinceLight = 0

    // Glöd tänds (exit-säker proxy).
    const gl = lamp.glow
    if (gl && !gl.destroyed) {
      const st = { a: 0 }
      const tw = gsap.to(st, {
        a: 0.5,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: () => {
          if (gl.destroyed) {
            tw.kill()
            return
          }
          gl.alpha = st.a
        },
      })
    }
    if (lamp.art && !lamp.art.destroyed) {
      lamp.art.tint = 0xffffff
      lamp.art.alpha = 1
      pop(lamp.art)
    }
    const mi = this._meterIcons[lamp.index]
    if (mi && !mi.destroyed) {
      mi.tint = 0xffffff
      mi.alpha = 1
      pop(mi)
    }

    // Huset under lampan vaknar — tändningen blir en händelse i byn, inte en tint.
    this._wakeHouse(this._houses[lamp.index])

    ctx.services.audio.sfx('correct')
    burst(ctx.fxLayer, lamp.cx, lamp.cy, { colors: [COLORS.yellow, 0xffffff] })
    floatText(ctx.fxLayer, lamp.cx, lamp.cy - 50, '💡', { fontSize: 56 })
    // Räkna lamporna högt — knyt ljud + siffra + bild ("En lampa! …Två lampor!").
    const line = this._litCount <= LAMP_COUNT.length ? LAMP_COUNT[this._litCount - 1] : randomFrom(LIT_LINES)
    ctx.services.voice.say(line)
  },

  // Huset vaknar: rutan blir varm, ljuset syns på väggen, kvällstonen släpper och
  // röken börjar stiga. Alfa-tweens går på en {}-proxy (exit-säkert), skalan via den
  // delade `pop()` — rutan har egen origo, så den skalar kring sig själv.
  _wakeHouse(house) {
    if (!house || house.destroyed || house._awake) return
    house._awake = true

    const win = house._win
    if (win && !win.destroyed) {
      win.clear()
      win.roundRect(-15, -15, 30, 30, 6).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.brown })
      pop(win, { scale: 1.3 })
    }
    const glow = house._glow
    const kropp = house._kropp
    const st = { a: 0 }
    const tw = gsap.to(st, {
      a: 1,
      duration: 0.45,
      ease: 'power2.out',
      onUpdate: () => {
        if (!glow || glow.destroyed || !kropp || kropp.destroyed) {
          tw.kill()
          return
        }
        glow.alpha = st.a
        // Kvällstonen lyfter ur väggen i takt med ljuset (blandning mot vitt).
        const m = (sh) => {
          const ch = (HOUSE_SLEEP >> sh) & 0xff
          return Math.round(ch + (255 - ch) * st.a)
        }
        kropp.tint = (m(16) << 16) | (m(8) << 8) | m(0)
      },
    })
    house._wakeTw = tw
    if (house._smoke && !house._smoke.destroyed) house._smoke.visible = true
  },

  // ---- Auto-hjälp (garanterad framgång) -----------------------------------

  _autoHelp(ctx) {
    if (!this._alive || this._resolving || this._completing) return
    if (this._litCount >= this._lamps.length) return
    const cands = this._clouds.filter((c) => !c.destroyed && c !== this._activeCloud)
    if (cands.length < 2) return
    cands.sort((a, b) => b.charge - a.charge)
    const a = cands[0]
    const b = cands[1]
    // Toppa båda till fullt och glid ihop mot mötespunkten.
    a.charge = 1
    b.charge = 1
    this._setPipsFull(a)
    this._setPipsFull(b)
    ctx.services.audio.sfx('pling')
    sparkle(ctx.fxLayer, a.x, a.y, { count: 6 })
    sparkle(ctx.fxLayer, b.x, b.y, { count: 6 })
    this._kar?.react('nyfiken') // han tittar på molnen han just skickade ihop
    if (this._bobo && !this._bobo.destroyed) pop(this._bobo)
    floatText(ctx.fxLayer, this._bobo.x + 24, this._bobo.y - 70, '👉', { fontSize: 46 })
    ctx.services.voice.say('Titta, Bobo hjälper till!')

    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    a._autoHelp = true
    b._autoHelp = true
    a._autoTX = mx
    a._autoTY = my
    b._autoTX = mx
    b._autoTY = my
    // Säkerhet: släpp glid-styrningen efter en stund även om något oväntat händer.
    this._autoTimer?.kill()
    this._autoTimer = gsap.delayedCall(3.5, () => {
      if (!this._alive) return
      a._autoHelp = false
      b._autoHelp = false
    })
  },

  // ---- Klart: regnbåge + firande + ny by ----------------------------------

  _onComplete(ctx) {
    if (this._completing) return
    this._completing = true
    this._resolving = true

    this._drawRainbow(ctx)
    this._lamps.forEach((lamp, i) => {
      gsap.delayedCall(0.14 * i, () => {
        if (this._alive && lamp.emoji && !lamp.emoji.destroyed) pop(lamp.emoji)
      })
    })
    ctx.services.voice.say('Hela byn lyser nu!')
    this._kar?.react('jubel') // hela byn lyser — det här är kvällens stora ögonblick

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('byar', (ctx.progress.get().custom?.byar || 0) + 1)
    ctx.progress.complete() // delat firande: celebrate-ljud + beröm + konfetti + stjärna + klistermärke

    this._buildTimer?.kill()
    this._buildTimer = gsap.delayedCall(1.6, () => {
      if (this._alive) this._buildVillage(ctx, this._level)
    })
  },

  _drawRainbow(ctx) {
    const g = new Graphics()
    g.eventMode = 'none'
    const cx = ctx.width / 2
    const cy = 560
    const cols = [0xff6b6b, 0xff8a3d, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa]
    let r = 380
    for (const col of cols) {
      g.arc(cx, cy, r, Math.PI, Math.PI * 2).stroke({ width: 22, color: col, alpha: 0.9 })
      r -= 22
    }
    // Lägg precis under molnlagret (över by + blixt).
    this._root.addChildAt(g, this._root.getChildIndex(this._cloudLayer))
    this._rainbow = g
    g.alpha = 0
    const st = { a: 0 }
    const tw = gsap.to(st, {
      a: 1,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        if (g.destroyed) {
          tw.kill()
          return
        }
        g.alpha = st.a
      },
    })
  },

  // ---- Exit-säkra partiklar -----------------------------------------------

  // Litet regn under ett moln (oladdat tryck + urladdning). {}-proxy → exit-säkert.
  _rain(ctx, cloud, count) {
    if (!cloud || cloud.destroyed) return
    const n = count ?? 5 + ((Math.random() * 3) | 0)
    const cx = cloud.x
    const cy = cloud.y + 36
    for (let i = 0; i < n; i++) {
      const drop = new Graphics().roundRect(-2, -8, 4, 16, 2).fill({ color: COLORS.blue, alpha: 0.7 })
      const x0 = cx + (Math.random() * 70 - 35)
      const y0 = cy + Math.random() * 12
      drop.position.set(x0, y0)
      drop.eventMode = 'none'
      ctx.fxLayer.addChild(drop)
      const st = { y: y0, a: 0.7 }
      const tw = gsap.to(st, {
        y: y0 + 80 + Math.random() * 30,
        a: 0,
        duration: 0.55 + Math.random() * 0.2,
        ease: 'power1.in',
        onUpdate: () => {
          if (drop.destroyed) {
            tw.kill()
            return
          }
          drop.y = st.y
          drop.alpha = st.a
        },
        onComplete: () => {
          if (!drop.destroyed) drop.destroy()
        },
      })
    }
  },

  // En enda mjuk, vänlig helskärms-ljuspuls (aldrig stroboskop). Exit-säker.
  _lightFlash(ctx) {
    const flash = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(0xffffff)
    flash.alpha = 0
    flash.eventMode = 'none'
    ctx.fxLayer.addChild(flash)
    const st = { a: 0 }
    const tl = gsap.timeline({
      onUpdate: () => {
        if (flash.destroyed) {
          tl.kill()
          return
        }
        flash.alpha = st.a
      },
      onComplete: () => {
        if (!flash.destroyed) flash.destroy()
      },
    })
    tl.to(st, { a: 0.25, duration: 0.12, ease: 'power1.out' }).to(st, { a: 0, duration: 0.13, ease: 'power1.in' })
  },

  // ---- Städning (exit-säkert) --------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._boltTween?.kill()
    this._buildTimer?.kill()
    this._autoTimer?.kill()

    for (const c of this._clouds) this._teardownCloud(c)
    this._clouds = []
    for (const l of this._lamps) {
      if (l.container && !l.container.destroyed) gsap.killTweensOf(l.container.scale)
      if (l.emoji && !l.emoji.destroyed) {
        gsap.killTweensOf(l.emoji.scale)
        gsap.killTweensOf(l.emoji)
      }
    }
    for (const h of this._houses || []) {
      h._wakeTw?.kill()
      if (h._win && !h._win.destroyed) {
        h._win._fxPopTl?.kill()
        gsap.killTweensOf(h._win.scale)
      }
    }
    this._houses = []
    for (const m of this._meterIcons) if (m && !m.destroyed) gsap.killTweensOf(m.scale)
    if (this._bobo && !this._bobo.destroyed) gsap.killTweensOf(this._bobo.scale)
    this._kar?.destroy() // river riggens alla tweens (idle, blink, humör, reaktion)
    this._kar = null
    if (this._rainbow && !this._rainbow.destroyed) gsap.killTweensOf(this._rainbow)
    if (this._bolt && !this._bolt.destroyed) this._bolt.clear()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// =================== Programmatisk grafik ===================

// Distinkt ÅSKMOLN-kropp: mörkare grå-blå & plufsigare (fler, större lobber) med
// en mörkare undersida — omöjlig att förväxla med scenens dekorativa VITA moln.
function makeThunderCloudBody(scale = 1) {
  const g = new Graphics()
  const w = 76 * scale
  const mid = 0x8b98b3 // grå-blå kropp
  const dark = 0x5f6d8a // skuggad undersida
  g.circle(-w * 0.78, 10 * scale, 30 * scale).fill(mid)
  g.circle(-w * 0.25, -14 * scale, 42 * scale).fill(mid)
  g.circle(w * 0.4, -8 * scale, 40 * scale).fill(mid)
  g.circle(w * 0.86, 10 * scale, 30 * scale).fill(mid)
  g.roundRect(-w * 1.05, 12 * scale, w * 2.1, 36 * scale, 20 * scale).fill(mid)
  // Mörkare, tyngre undersida ger "åska på gång"-känsla.
  g.roundRect(-w * 0.95, 30 * scale, w * 1.9, 16 * scale, 10 * scale).fill({ color: dark, alpha: 0.55 })
  return g
}

// Litet mysigt hus på marken.
// Ett hus i byn. Huset SOVER tills dess egen lampa tänds: rutan är mörk och kall,
// väggen ligger i kvällens blåa ton och skorstenen är kall. Blixten tänder lampan →
// huset VAKNAR (varm ruta + glöd + rök ur skorstenen). Poängen är att tändningen ska
// vara en händelse i byn, inte bara en tint på en lykta — och att den lampa barnet
// just tände hör ihop med ETT hus, inte med byn i allmänhet.
// Fönster, glöd och rök ligger som EGNA noder kring sin egen origo, så vaknandet är
// en tween på några fyllningar (och `pop()` skalar kring rutans mitt, inte kring
// husets — en Graphics ritad i absoluta koordinater hoppar iväg när den skalas).
function makeHouse(cx, baseY, i) {
  const c = new Container()
  c.eventMode = 'none'
  c.interactiveChildren = false
  const roofColor = i % 2 === 0 ? COLORS.red : COLORS.orange

  const g = new Graphics()
  // Skorsten (bakom taket — röken föds vid dess mynning). Den går HELA vägen ner till
  // takfoten: en skorsten som slutar vid takytan möter sluttningen i en enda punkt och
  // läser som ett brunt block bredvid huset i stället för något som sitter i taket.
  g.roundRect(cx + 28, baseY - 196, 24, 86, 4).fill(0xb0705a).stroke({ width: 4, color: COLORS.brown })
  // Vägg.
  g.roundRect(cx - 70, baseY - 110, 140, 120, 16).fill(COLORS.cream).stroke({ width: 4, color: COLORS.brown })
  // Tak.
  g.poly([cx - 82, baseY - 110, cx, baseY - 180, cx + 82, baseY - 110]).fill(roofColor).stroke({ width: 4, color: COLORS.brown })
  // Dörr.
  g.roundRect(cx - 22, baseY - 62, 44, 62, 8).fill(COLORS.brown)
  g.tint = HOUSE_SLEEP // hela huset ligger i kvällstonen tills det vaknar
  g.eventMode = 'none'
  c.addChild(g)

  // Ljuset inifrån, som ett mjukt sken på väggen runt rutan. TRE ringar med avtagande
  // alfa — en ensam cirkel med 0,55 läser som en gul dekal på väggen, inte som ljus.
  // (En radiell FillGradient duger inte: den kan inte ha genomskinlig mitt.)
  const glow = new Graphics()
  for (const [r, a] of [[46, 0.1], [36, 0.14], [26, 0.2]]) glow.circle(0, 0, r).fill({ color: 0xffd873, alpha: a })
  glow.position.set(cx + 31, baseY - 81)
  glow.alpha = 0
  glow.eventMode = 'none'
  c.addChild(glow)

  // Rutan — egen nod kring sin egen mitt.
  const win = new Graphics()
  win.roundRect(-15, -15, 30, 30, 6).fill(WIN_SLEEP).stroke({ width: 3, color: COLORS.brown })
  win.position.set(cx + 31, baseY - 81)
  win.eventMode = 'none'
  c.addChild(win)

  // Röken: tre puffar som ÅTERANVÄNDS (flyttas/skalas per bildruta, ritas aldrig om).
  const smoke = new Container()
  smoke.position.set(cx + 50, baseY - 206)
  smoke.visible = false
  smoke.eventMode = 'none'
  smoke.interactiveChildren = false
  for (let k = 0; k < 4; k++) {
    const p = new Graphics().circle(0, 0, 13).fill({ color: 0xffffff, alpha: 1 })
    p._fas = k / 4 // spridd fas → en jämn ström, inte fyra puffar i klump
    p.eventMode = 'none'
    smoke.addChild(p)
  }
  c.addChild(smoke)

  c._kropp = g
  c._win = win
  c._glow = glow
  c._smoke = smoke
  c._awake = false
  return c
}

// Målet som ska tändas, RITAT (P0 ASSETS). Tre varianter i samma silhuett-storlek
// (~±32) så tänd/otänd-logiken är identisk. Otänd = grå tint + halv alpha; tänd
// sätter tint till vitt. Graphics bär tint, så en enda ritning räcker för båda lägen.
function makeLampArt(variant) {
  const g = new Graphics()
  if (variant === 'lykta') {
    g.roundRect(-6, -32, 12, 9, 3).fill(0xc9a227)
    g.ellipse(0, 2, 26, 28).fill(0xe0574f).stroke({ width: 4, color: 0xa8392f })
    for (const rx of [-13, 0, 13]) g.ellipse(rx, 2, 4, 27).stroke({ width: 2, color: 0xa8392f, alpha: 0.55 })
    g.roundRect(-7, 26, 14, 9, 3).fill(0xc9a227)
    g.moveTo(0, 35).lineTo(0, 45).stroke({ width: 3, color: 0xc9a227 })
  } else if (variant === 'trad') {
    g.roundRect(-7, 12, 14, 28, 4).fill(0x8a5a3b).stroke({ width: 3, color: 0x6f4a2e })
    g.circle(-15, 0, 17).fill(0x5bbf6a)
    g.circle(15, 0, 17).fill(0x5bbf6a)
    g.circle(0, -16, 20).fill(0x5bbf6a).stroke({ width: 4, color: 0x3f8a44 })
    for (const [bx, by] of [[-14, -6], [10, -10], [0, 4], [-5, -25], [16, 2]]) g.circle(bx, by, 5).fill(0xffe08a)
  } else {
    // gatlykta: skärm + glödlampa
    g.roundRect(-8, -30, 16, 11, 4).fill(0x4a525c)
    g.moveTo(-27, 6).lineTo(-14, -20).lineTo(14, -20).lineTo(27, 6).closePath()
    g.fill(0x6f7883).stroke({ width: 4, color: 0x4a525c })
    g.ellipse(0, 14, 16, 15).fill(0xfff0c4).stroke({ width: 3, color: 0xe0c07a })
    g.moveTo(-7, 26).lineTo(7, 26).stroke({ width: 4, color: 0xc9b48a })
  }
  g.eventMode = 'none'
  return g
}

// Lampa ovanför ett hus: mjuk glödcirkel (börjar släckt) + ritat mål (otänd = nedtonat).
function makeLamp(cx, cy, i) {
  const container = new Container()
  container.position.set(cx, cy)
  container.eventMode = 'none'

  const glow = new Graphics().circle(0, 0, 46).fill({ color: COLORS.yellow, alpha: 1 })
  glow.alpha = 0
  glow.eventMode = 'none'

  const post = new Graphics().roundRect(-4, 24, 8, 60, 4).fill(COLORS.brown)
  post.eventMode = 'none'

  // Vart 3:e mål varieras (lykta / träd som tänds), samma tänd/otänd-logik.
  const variant = (i + 1) % 3 === 0 ? (i % 2 ? 'trad' : 'lykta') : 'lampa'
  const art = makeLampArt(variant)
  art.tint = 0x888888
  art.alpha = 0.55

  container.addChild(post, glow, art)
  return { container, glow, art, variant }
}

