// Fallskärmen — Zacke eller Lova svävar mjukt ner i en stor fallskärm medan vinden
// vill knuffa dem åt sidan. Barnet styr i sidled (håll/dra vänster–höger om
// fallskärmen) KONTRA vinden, mot en studsmatta på marken. Två kontroller som
// ändrar utfallet: (1) kontinuerlig sid-styrning, (2) en tyngd-knapp (🪶 Lätt /
// 🪨 Tung) som byter fallfart + hur mycket vinden biter. Vindbyar växlar riktning
// och visas med lövpartiklar 🍃. Landningen är ALLTID mjuk: mitt på mattan = jubel,
// bredvid = snäll auto-glid in, långt bort = glad gräslandning + ny runda. Aldrig
// en krasch, aldrig game over, ingen synlig poäng eller timer. Allt ritas
// programmatiskt (Pixi Graphics + emoji) och städas exit-säkert.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'
import { bounceIn, pop, wiggle, puff, sparkle, burst, bigCelebration, floatText , kvittera} from '../../lib/feedback.js'
import { makeKaraktar } from '../../lib/karaktarer.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Logiskt luftrum (designkoordinater).
const START_Y = 150 // fallskärmens (barnets fötter) start-y
const GROUND_Y = 560 // marknivå: landning triggas här
const BOBO_R = 44 // mottagarens ansiktsradie (makeBobo: fötterna 2,36·r under origo)
const X_MIN = 140 // mjuka väggar i sidled
const X_MAX = 1140

// Fysik (px & px/frame @60fps). Se "Fysik & kalibrering" i specen.
const SINK_LIGHT = 1.5 // px/frame nedåt i Lätt-läge
const SINK_HEAVY = 2.4 // px/frame nedåt i Tung-läge (faller snabbare)
const STEER_FORCE = 0.45 // sidkraft från styrning (px/frame²)
const WIND_FACTOR_HEAVY = 0.45 // Tung biter mindre mot vinden
const VX_DAMP = 0.92 // luftmotstånd-damp per frame
const VX_MAX = 6 // sidofarts-tak (px/frame)
const STEER_DEADZONE = 20 // dödzon kring fallskärmen så den inte vibrerar
const TAP_IMPULSE = 0.5 // s — enkel-tap ger en kort styr-puff (för de minsta)
const IDLE_DELAY = 6 // s utan input -> mild om-cue

export default {
  id: 'fallskarmen',
  titleSv: 'Fallskärmen',
  icon: '🪂',
  category: 'fysik',
  input: 'drag',
  ageRange: [3, 5],
  bundle: 'fallskarmen',
  voiceIntro: 'Styr fallskärmen till mattan!',

  init(ctx) {
    this._alive = true
    this._resolving = false
    this._idle = 0
    this._misses = 0

    // Styr-state.
    this._steer = { active: false, x: 0, downAt: 0 }
    this._tapDir = 0
    this._tapTimer = 0

    // Vind-state.
    this._heavy = false
    this._vx = 0
    this._wind = 0
    this._windAmp = 0.12
    this._windPeriod = 6
    this._windTimer = 0
    this._leafTimer = 0
    this._leaves = []
    this._susTimer = 0 // stigande vind-sus (mjuk luft-svallning vars volym följer byn)
    this._legPhase = 0 // dinglande ben-pendel (fas)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund FÖRST: mjuk himmel + sol/moln + grön markremsa.
    this._root.addChild(createScene('sky', { ground: true, groundH: 120, width: ctx.width, height: ctx.height }))

    // Mjuk markskugga under fallskärmen (växer när den närmar sig marken).
    this._shadow = new Graphics().ellipse(0, 0, 70, 20).fill({ color: COLORS.shadow, alpha: 1 })
    this._shadow.position.set(640, GROUND_Y + 36)
    this._shadow.alpha = 0.12
    this._shadow.eventMode = 'none'
    this._root.addChild(this._shadow)

    // Osynlig styr-yta över hela luftrummet (egen pointer-logik, INTE DragController).
    this._steerPad = new Graphics().rect(0, 110, ctx.width, 490).fill({ color: 0x000000, alpha: 0 })
    this._steerPad.eventMode = 'static'
    this._steerPad.cursor = 'pointer'
    this._onDown = (e) => this._steerDown(ctx, e)
    this._onMove = (e) => this._steerMove(e)
    this._onUp = (e) => this._steerUp(ctx, e)
    this._steerPad.on('pointerdown', this._onDown)
    this._steerPad.on('globalpointermove', this._onMove)
    this._steerPad.on('pointerup', this._onUp)
    this._steerPad.on('pointerupoutside', this._onUp)
    this._root.addChild(this._steerPad)

    // Mål (studsmatta + glödring + 🎯).
    this._makeTarget(ctx)

    // Fallskärm + barn + linor + chevroner.
    this._makeChute(ctx)

    // Vind-banner uppe.
    this._makeWindUi(ctx)

    // Tyngd-knapp nere till vänster.
    this._makeWeightBtn(ctx)

    // Välj barn (endast Zacke/Lova) + matchande emoji.
    this._kidName = randomFrom(['Zacke', 'Lova'])
    this._kid.setName?.(this._kidName)

    // Starta på sparad nivå.
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._loadLevel(ctx, this._level)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    // Hela repliken som literal (inte konkatenerad) så check.mjs kan hitta den och
    // /rost kan generera ett klipp.
    ctx.services.voice.say(
      this._kidName === 'Zacke'
        ? 'Hjälp Zacke! Styr fallskärmen till mattan!'
        : 'Hjälp Lova! Styr fallskärmen till mattan!',
    )
  },

  // ---- Bygg scen-noder -----------------------------------------------------

  _makeTarget(ctx) {
    this._target = new Container()
    this._target.eventMode = 'none'
    this._glow = new Graphics()
    this._mat = new Graphics()
    // RITAD måltavla (P0 ASSETS) — var en 🎯-emoji.
    this._bull = new Graphics()
    this._bull.circle(0, 0, 26).fill(0xff6b6b)
    this._bull.circle(0, 0, 18).fill(0xfffdf7)
    this._bull.circle(0, 0, 11).fill(0xff6b6b)
    this._bull.circle(0, 0, 5).fill(0xfffdf7)
    this._bull.y = -46
    this._target.addChild(this._glow, this._mat, this._bull)
    this._target.position.set(700, GROUND_Y)
    this._root.addChild(this._target)

    // Mottagaren vid mattan (gate-punkt 4): Bobo vinkar in föraren och fångar/hejar
    // vid träff. Scenen hade ingen alls — bara en matta och generisk konfetti.
    // Riggen ligger i en YTTRE container. Spelet speglar Bobo (`scale.x = side`) och
    // vaggar honom (`rotation`), och riggens andning tweenar sin egen `view.scale` —
    // två skrivare om samma skala hade dels hackat, dels raderat spegelvändningen
    // (0.988 skriver över −1 och Bobo tittar plötsligt åt fel håll).
    this._bobo = new Container()
    this._bobo.eventMode = 'none'
    this._bobo.interactiveChildren = false
    this._kar = makeKaraktar({ r: BOBO_R })
    this._bobo.addChild(this._kar.view)
    this._root.addChild(this._bobo)
    this._placeBobo(700, 150)
    this._boboWave()
    // Mjuk andning på glödringen (drar blicken mot målet).
    this._glowTw = gsap.to(this._glow.scale, { x: 1.12, y: 1.12, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  },

  // Bobo hör till MÅLET, inte till scenen — mattan flyttar sig per nivå (tx 200..1080)
  // så han flyttar med. Han står på den sida som har plats; är det trångt till vänster
  // ställer han sig till höger. Egen container i _root (inte barn till _target) så
  // mattans landnings-squash inte klämmer honom.
  _placeBobo(tx, r) {
    const bo = this._bobo
    if (!bo || bo.destroyed) return
    const gap = r + 92
    const side = tx - gap > 78 ? -1 : 1
    bo.x = clamp(tx + side * gap, 78, 1202)
    bo.y = GROUND_Y + 44 - 2.36 * BOBO_R
    bo.scale.x = side // vänder sig mot mattan
  },

  // Vinkar in föraren: lugn vaggning i vila.
  _boboWave() {
    const bo = this._bobo
    if (!bo || bo.destroyed) return
    this._boboIdle?.kill()
    this._boboIdle = gsap.to(bo, {
      rotation: 0.1,
      duration: 1.15,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    })
  },

  // Fångar/kramar vid träff: riggens `jubel` (hopp + utsträckta armar) i stället för
  // en skal-studs. Den yttre containerns `scale.x` bär spegelvändningen och rörs inte.
  _boboCatch(ctx) {
    const bo = this._bobo
    if (!this._kar || !bo || bo.destroyed) return
    this._kar.react('jubel')
    sparkle(ctx.fxLayer, bo.x, bo.y - BOBO_R * 1.5, { count: 7 })
  },

  _drawTarget(r) {
    const cx = r // halva mattans bredd
    this._glow.clear().circle(0, 0, r).stroke({ width: 8, color: COLORS.yellow, alpha: 0.5 })
    this._mat.clear()
    this._mat.roundRect(-cx, -18, 2 * cx, 36, 14).fill(COLORS.purple).stroke({ width: 4, color: 0x6f5bd0, alpha: 0.6 })
    // Fjäder-streck över mattan.
    for (let i = 0; i <= 6; i++) {
      const x = -cx + (i / 6) * 2 * cx
      this._mat.moveTo(x, -14).lineTo(x, 14)
    }
    this._mat.stroke({ width: 3, color: 0xffffff, alpha: 0.5 })
    // Ben.
    this._mat.moveTo(-cx + 16, 18).lineTo(-cx + 26, 46)
    this._mat.moveTo(cx - 16, 18).lineTo(cx - 26, 46)
    this._mat.stroke({ width: 6, color: 0x6f5bd0 })
  },

  _makeChute(ctx) {
    const chute = new Container()
    chute.position.set(640, START_Y)

    // Kupol: randig halv-ellips (mjuk dom) byggd av lodräta strips.
    const canopy = new Graphics()
    const rx = 92
    const ry = 50
    const cy = -116 // kupolens centrum (ovanför barnet)
    const cols = [COLORS.red, COLORS.yellow, COLORS.blue, COLORS.green, COLORS.purple]
    const strips = 12
    for (let i = 0; i < strips; i++) {
      const sx = -rx + (i / strips) * 2 * rx
      const ex = -rx + ((i + 1) / strips) * 2 * rx
      const midx = (sx + ex) / 2
      const inside = 1 - (midx * midx) / (rx * rx)
      const topY = cy - ry * Math.sqrt(Math.max(0, inside))
      const col = cols[i % cols.length]
      canopy.rect(sx, topY, ex - sx + 0.8, cy + 16 - topY).fill(col)
    }
    // Mjuk underkant (scalloper) + glansbåge upptill.
    for (let i = 0; i < 4; i++) {
      const segx = -rx + (i + 0.5) * (2 * rx) / 4
      canopy.circle(segx, cy + 16, rx / 4).fill({ color: 0xffffff, alpha: 0.12 })
    }
    canopy.arc(0, cy, rx * 0.7, Math.PI * 1.15, Math.PI * 1.85).stroke({ width: 7, color: 0xffffff, alpha: 0.25, cap: 'round' })
    chute.addChild(canopy)

    // Linor: 4 tunna streck från kupolens underkant ner till barnet.
    const lines = new Graphics()
    const tops = [-rx * 0.8, -rx * 0.3, rx * 0.3, rx * 0.8]
    for (const tx of tops) lines.moveTo(tx, cy + 16).lineTo(0, -34)
    lines.stroke({ width: 3, color: COLORS.inkSoft })
    chute.addChild(lines)

    // Sele (liten båge) + barn.
    const harness = new Graphics().roundRect(-22, -42, 44, 16, 8).fill(COLORS.brown)
    chute.addChild(harness)

    // Dinglande ben (pendel kring höften) — byggs en gång, roteras i ticker så
    // föraren känns levande: svänger med sidofart + vind + en lugn grundsväng.
    const legs = new Graphics()
    legs.moveTo(-9, 0).lineTo(-9, 20)
    legs.moveTo(9, 0).lineTo(9, 20)
    legs.stroke({ width: 8, color: COLORS.brown, cap: 'round' })
    legs.circle(-9, 22, 6).fill(COLORS.red) // små skor
    legs.circle(9, 22, 6).fill(COLORS.red)
    legs.position.set(0, 4) // höft-pivot strax under emojin
    legs.eventMode = 'none'
    this._legs = legs
    chute.addChild(legs)

    // RITAT barn (P0 ASSETS) med kropp och dinglande ben — var bara ett 🧒-ansikte.
    this._kid = makeKid()
    this._kid.y = -18 // barnets fötter ≈ origo (landar på mattan vid GROUND_Y)
    chute.addChild(this._kid)

    // Styr-chevroner (◀ ▶) som tänds när barnet håller åt det hållet.
    // Ritade riktningspilar i stället för ◀▶-tecken.
    this._chevL = new Graphics()
    this._chevL.moveTo(10, -20).lineTo(10, 20).lineTo(-14, 0).closePath().fill(COLORS.blue)
    this._chevR = new Graphics()
    this._chevR.moveTo(-10, -20).lineTo(-10, 20).lineTo(14, 0).closePath().fill(COLORS.blue)
    this._chevL.position.set(-92, -40)
    this._chevR.position.set(92, -40)
    this._chevL.alpha = 0.12
    this._chevR.alpha = 0.12
    this._chevL.eventMode = 'none'
    this._chevR.eventMode = 'none'
    chute.addChild(this._chevL, this._chevR)

    chute.eventMode = 'none'
    chute.interactiveChildren = false
    this._chute = chute
    this._root.addChild(chute)
  },

  _makeWindUi(ctx) {
    this._windUi = new Container()
    this._windUi.position.set(ctx.width / 2, 90)
    this._windUi.eventMode = 'none'
    const panel = new Graphics().roundRect(-160, -28, 320, 56, 28).fill({ color: 0xffffff, alpha: 0.82 }).stroke({ width: 4, color: COLORS.blue, alpha: 0.6 })
    const leaf = makeLeaf(1)
    leaf.position.set(-126, 0)
    this._bannerText = new Text({ text: 'Vinden blåser', style: { fontFamily: FONT.title, fontSize: 26, fontWeight: '700', fill: COLORS.ink } })
    this._bannerText.anchor.set(0.5)
    this._bannerText.position.set(-12, 0)
    this._windArrow = new Graphics()
    this._windArrow.position.set(112, 0)
    this._windUi.addChild(panel, leaf, this._bannerText, this._windArrow)
    this._root.addChild(this._windUi)
  },

  _makeWeightBtn(ctx) {
    const btn = new Container()
    btn.position.set(140, 600)
    const plate = new Graphics().circle(0, 0, 60).fill(COLORS.teal).stroke({ width: 6, color: 0xffffff, alpha: 0.85 })
    const gloss = new Graphics().ellipse(0, -20, 38, 18).fill({ color: 0xffffff, alpha: 0.25 })
    // Ritad fjäder/sten-ikon (P0 ASSETS) — byts i _applyWeight.
    this._wIco = new Graphics()
    this._wLabel = new Text({ text: 'Lätt', style: { fontFamily: FONT.title, fontSize: 24, fontWeight: '700', fill: 0xffffff } })
    this._wLabel.anchor.set(0.5)
    this._wLabel.y = 80
    btn.addChild(plate, gloss, this._wIco, this._wLabel)
    btn.eventMode = 'static'
    btn.cursor = 'pointer'
    btn.hitArea = new Circle(0, 0, 72) // träffyta ≥96px (+ halo)
    this._onWeight = () => this._toggleWeight(ctx)
    btn.on('pointertap', this._onWeight)
    this._weightBtn = btn
    this._root.addChild(btn)
    this._drawWeightIcon()
  },

  // ---- Nivå ----------------------------------------------------------------

  _loadLevel(ctx, level) {
    if (!this._alive) return
    // Nivåparametrar: vindstyrka, bytestakt, målstorlek/-läge.
    let amp, period, r, tx
    if (level <= 1) {
      amp = 0.12; period = 6; r = 150; tx = 700
    } else if (level <= 3) {
      amp = 0.2; period = 4.5; r = 120; tx = randomFrom([840, 460])
    } else if (level <= 5) {
      amp = 0.28; period = 3.5; r = 100; tx = randomFrom([980, 300])
    } else {
      amp = 0.3; period = 3; r = 90; tx = 200 + Math.random() * 880
    }
    if (level >= 2) tx += (Math.random() - 0.5) * 60
    tx = clamp(tx, r + 60, ctx.width - r - 60)

    this._windAmp = amp
    this._windPeriod = period
    this._targetR = r
    this._targetX = tx
    this._windTimer = 0
    this._leafTimer = 0
    this._tapTimer = 0
    this._vx = 0
    this._resolving = false

    // Placera/rita mål.
    this._target.position.set(tx, GROUND_Y)
    this._target.scale.set(1)
    this._drawTarget(r)
    this._placeBobo(tx, r)

    // Nollställ fallskärm till start (slumpad x nära mitten).
    const chute = this._chute
    if (chute && !chute.destroyed) {
      gsap.killTweensOf(chute)
      chute.position.set(clamp(640 + (Math.random() - 0.5) * 200, X_MIN, X_MAX), START_Y)
      chute.rotation = 0
      bounceIn(chute)
    }

    // Första vindbyn + lövsvärm.
    this._setWind(ctx, (Math.random() < 0.5 ? -1 : 1) * amp, true)
  },

  // ---- Ticker --------------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dms = ticker.deltaMS || 16.67
    const dt = Math.min(2, dms / 16.67) // fysik-frames (clamp mot lagg-hopp)
    const ds = Math.min(0.05, dms / 1000) // sekunder för timers

    // Lövpartiklar drivs alltid (så de hinner lämna skärmen även vid landning).
    this._driveLeaves(dt)

    if (this._resolving) return
    const chute = this._chute
    if (!chute || chute.destroyed) return

    // Bobo följer fallskärmen med blicken hela vägen ner. `toLocal` går genom den
    // yttre containerns `scale.x`, så spegelvändningen räknas bort och tillbaka av
    // sig själv — blicken pekar rätt oavsett vilken sida han står på.
    if (this._kar && this._bobo && !this._bobo.destroyed) {
      const p = this._bobo.toLocal(chute.getGlobalPosition())
      this._kar.look(p.x, p.y)
    }

    // 1. Styr-riktning (håll: tecken av finger−fallskärm med dödzon; tap: kort puff).
    let dir = 0
    if (this._steer.active) {
      const d = this._steer.x - chute.x
      if (Math.abs(d) > STEER_DEADZONE) dir = Math.sign(d)
    } else if (this._tapTimer > 0) {
      this._tapTimer -= ds
      dir = this._tapTimer > 0 ? this._tapDir : 0
    }

    // 2. Konstant nedåt-glid (luftmotstånd-clamp = lugnt fall).
    const sink = this._heavy ? SINK_HEAVY : SINK_LIGHT
    chute.y += sink * dt

    // 3. Sidkrafter: styrning + vind, sedan damp + tak.
    const windFactor = this._heavy ? WIND_FACTOR_HEAVY : 1.0
    this._vx += (dir * STEER_FORCE + this._wind * windFactor) * dt
    // Snäll styr-assist som växer efter mjuka omstarter (no-fail-garanti). 0 vid
    // 0 missar -> barnet styr helt själv; starkare efteråt -> når alltid målet.
    if (this._misses > 0) {
      const assist = Math.min(this._misses, 4) * 0.05
      const low = chute.y > 360 ? 1 : 0.4
      this._vx += Math.sign(this._targetX - chute.x) * assist * low * dt
    }
    this._vx *= Math.pow(VX_DAMP, dt)
    this._vx = clamp(this._vx, -VX_MAX, VX_MAX)
    chute.x += this._vx * dt
    chute.x = clamp(chute.x, X_MIN, X_MAX) // mjuka väggar (ingen studs-straff)

    // Mjuk lutning: styrningen lutar åt sitt håll OCH vinden drar kupolen åt sitt
    // (barnet SER/känner att vinden puttar — och att styra rätar upp den igen).
    const windLean = clamp(this._wind * windFactor * 0.8, -0.3, 0.3)
    const targetRot = clamp(dir * 0.13 + windLean, -0.34, 0.34)
    chute.rotation += (targetRot - chute.rotation) * Math.min(1, 0.15 * dt)

    // Dinglande ben pendlar med sidofart + vind + en lugn grundsväng.
    this._legPhase += 0.11 * dt
    if (this._legs && !this._legs.destroyed) {
      const vxN = clamp(this._vx / VX_MAX, -1, 1)
      this._legs.rotation = Math.sin(this._legPhase) * 0.16 + vxN * 0.35 + this._wind * 0.9
    }

    // Chevroner tänds/dämpas mjukt.
    this._chevL.alpha += ((dir < 0 ? 0.95 : 0.12) - this._chevL.alpha) * Math.min(1, 0.25 * dt)
    this._chevR.alpha += ((dir > 0 ? 0.95 : 0.12) - this._chevR.alpha) * Math.min(1, 0.25 * dt)

    // Skugga följer x och växer mot marken.
    const tprog = clamp((chute.y - START_Y) / (GROUND_Y - START_Y), 0, 1)
    this._shadow.x = chute.x
    this._shadow.scale.set(0.55 + tprog * 0.7)
    this._shadow.alpha = 0.1 + tprog * 0.1

    // 4. Vind-byt-timer (ackumulator, ej setInterval).
    this._windTimer += ds
    if (this._windTimer >= this._windPeriod) {
      this._windTimer = 0
      this._setWind(ctx, (Math.random() < 0.5 ? -1 : 1) * this._windAmp, true)
    }

    // Driv-löv löpande (tätare när det blåser hårt).
    this._leafTimer += ds
    const leafEvery = this._windAmp > 0.2 ? 0.25 : 0.4
    if (this._leafTimer >= leafEvery) {
      this._leafTimer = 0
      this._spawnLeaf(ctx)
    }

    // Stigande vind-sus: en mjuk luft-svallning vars volym OCH täthet följer hur
    // hårt det blåser (Math.abs(this._wind)) — vinden HÖRS starkare i byarna. Tyst
    // när det nästan står stilla (ingen påträngande loop). tone() = ren syntes.
    this._susTimer += ds
    const wmag = clamp(Math.abs(this._wind) / 0.3, 0, 1)
    if (wmag > 0.1 && this._susTimer >= 1.3 - wmag * 0.7) {
      this._susTimer = 0
      const v = 0.04 + wmag * 0.1
      ctx.services.audio.tone({ freq: 150 + wmag * 70, dur: 0.6 + wmag * 0.5, type: 'sawtooth', vol: v, slideTo: 90 })
      ctx.services.audio.tone({ freq: 600, dur: 0.5, type: 'sine', vol: v * 0.4, slideTo: 360, delay: 0.04 })
    }

    // 5. Landningskoll.
    if (chute.y >= GROUND_Y) {
      this._land(ctx)
      return
    }

    // Idle-cue.
    this._idle += ds
    if (this._idle >= IDLE_DELAY) {
      this._idle = 0
      ctx.services.voice.replayLast()
      this._blinkChevrons()
      if (this._windUi && !this._windUi.destroyed) pop(this._windUi, { scale: 1.08 })
    }
  },

  // ---- Vind + löv ----------------------------------------------------------

  _setWind(ctx, w, swarm) {
    this._wind = w
    this._drawWindBanner()
    if (this._windUi && !this._windUi.destroyed) pop(this._windUi, { scale: 1.07 })
    if (swarm) {
      ctx.services.audio.sfx('whoosh')
      const n = 5 + ((Math.random() * 3) | 0)
      for (let i = 0; i < n; i++) this._spawnLeaf(ctx)
    }
  },

  _drawWindBanner() {
    const dir = Math.sign(this._wind) || 1
    const mag = Math.abs(this._wind)
    const norm = clamp(mag / 0.3, 0, 1)
    this._bannerText.text = 'Vinden blåser'
    const L = 24 + norm * 40
    const a = Math.min(1, 0.55 + norm * 0.45)
    const x0 = dir > 0 ? -L / 2 : L / 2
    const x1 = -x0
    const g = this._windArrow
    g.clear()
    g.moveTo(x0, 0).lineTo(x1, 0)
    g.moveTo(x1, 0).lineTo(x1 - dir * 12, -8)
    g.moveTo(x1, 0).lineTo(x1 - dir * 12, 8)
    g.stroke({ width: 6, color: COLORS.green, alpha: a, cap: 'round' })
  },

  _spawnLeaf(ctx) {
    if (!this._alive) return
    const dir = Math.sign(this._wind) || 1
    const strong = Math.abs(this._wind) > 0.2
    const leaf = makeLeaf(0.7 + Math.random() * 0.5)
    leaf.x = dir > 0 ? -30 - Math.random() * 60 : 1310 + Math.random() * 60
    leaf.y = 140 + Math.random() * 360
    leaf.alpha = 0.9
    leaf.eventMode = 'none'
    leaf._vx = dir * (3 + Math.random() * 3) * (strong ? 1.6 : 1)
    leaf._vy = 0.4 + Math.random() * 0.8
    leaf._spin = (Math.random() - 0.5) * 0.14
    leaf._phase = Math.random() * Math.PI * 2
    ctx.fxLayer.addChild(leaf)
    this._leaves.push(leaf)
  },

  _driveLeaves(dt) {
    for (let i = this._leaves.length - 1; i >= 0; i--) {
      const lf = this._leaves[i]
      if (!lf || lf.destroyed) {
        this._leaves.splice(i, 1)
        continue
      }
      lf._phase += 0.15 * dt
      lf.x += lf._vx * dt
      lf.y += lf._vy * dt + Math.sin(lf._phase) * 0.6
      lf.rotation += lf._spin * dt
      if (lf.x < -50 || lf.x > 1330 || lf.y > 760) {
        this._leaves.splice(i, 1)
        if (!lf.destroyed) lf.destroy()
      }
    }
  },

  // ---- Styrning (egen pointer-logik) ---------------------------------------

  // Dämpat kvitto på ett tryck spelet inte kan utföra just nu (P0: aldrig tystnad).
  _kvitto(ctx, e) {
    const p = e?.global ? ctx.fxLayer.toLocal(e.global) : null
    kvittera(ctx.fxLayer, p?.x, p?.y, ctx.services.audio)
  },

  _steerDown(ctx, e) {
    if (!this._alive) return
    if (this._resolving) return this._kvitto(ctx, e)
    this._steer.active = true
    this._steer.x = this._root.toLocal(e.global).x
    this._steer.downAt = performance.now()
    this._idle = 0
    ctx.services.audio.sfx('tap')
  },

  _steerMove(e) {
    if (!this._alive || !this._steer.active) return
    this._steer.x = this._root.toLocal(e.global).x
    this._idle = 0
  },

  _steerUp() {
    if (!this._steer.active) return
    this._steer.active = false
    // Kort tryck = enkel-tap-fallback: ge en liten styr-puff åt sidan barnet petade.
    const dt = performance.now() - this._steer.downAt
    if (dt < 250 && this._chute && !this._chute.destroyed) {
      const side = this._steer.x < this._chute.x ? -1 : 1
      this._tapDir = side
      this._tapTimer = TAP_IMPULSE
    }
  },

  _blinkChevrons() {
    for (const c of [this._chevL, this._chevR]) {
      if (!c || c.destroyed) continue
      gsap.killTweensOf(c)
      const st = { a: 0.12 }
      const tw = gsap.to(st, {
        a: 0.95,
        duration: 0.25,
        yoyo: true,
        repeat: 1,
        ease: 'sine.inOut',
        onUpdate: () => {
          if (c.destroyed) {
            tw.kill()
            return
          }
          c.alpha = st.a
        },
      })
    }
  },

  // ---- Tyngd-knapp ---------------------------------------------------------

  // Ritar vikt-ikonen: fjäder (lätt) eller sten (tung). Anropas både vid bygge och
  // växling — ikonen var tidigare tom tills man tryckt en gång.
  _drawWeightIcon() {
    const wi = this._wIco
    if (!wi || wi.destroyed) return
    wi.clear()
    if (this._heavy) {
      wi.poly([-22, 4, -15, -13, -1, -18, 15, -12, 22, 3, 14, 16, -9, 17]).fill(0x9aa6b0)
      wi.poly([-15, -13, -1, -18, 4, -8, -9, -4]).fill({ color: 0xb8c2ca, alpha: 0.8 })
    } else {
      wi.moveTo(-6, 24).quadraticCurveTo(4, 4, 14, -22).stroke({ width: 4, color: 0xe8dfc8, cap: 'round' })
      wi.moveTo(12, -20).quadraticCurveTo(-16, -12, -6, 14).quadraticCurveTo(14, 2, 12, -20).fill(0xfffdf7)
      wi.moveTo(12, -20).quadraticCurveTo(24, -4, 2, 18).quadraticCurveTo(8, -2, 12, -20).fill(0xdff0f7)
    }
  },

  _toggleWeight(ctx) {
    if (!this._alive) return
    this._heavy = !this._heavy
    this._idle = 0
    this._drawWeightIcon()
    this._wLabel.text = this._heavy ? 'Tung' : 'Lätt'
    ctx.services.audio.sfx('pling')
    pop(this._weightBtn)
    floatText(ctx.fxLayer, this._weightBtn.x, this._weightBtn.y - 80, this._heavy ? 'Tung!' : 'Lätt!')
    // Tung = lite ihopdragen kupol (visuell skillnad).
    const chute = this._chute
    if (chute && !chute.destroyed) {
      gsap.killTweensOf(chute.scale)
      gsap.to(chute.scale, { x: this._heavy ? 0.9 : 1, y: this._heavy ? 0.92 : 1, duration: 0.25, ease: 'power2.out' })
    }
  },

  // ---- Landning (alltid mjuk, aldrig krasch) -------------------------------

  _land(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._idle = 0
    const chute = this._chute
    chute.y = GROUND_Y
    const dx = Math.abs(chute.x - this._targetX)

    if (dx <= this._targetR) {
      // Träff: mjuk studs + firande.
      this._boboCatch(ctx)
      this._celebrate(ctx)
    } else if (dx <= this._targetR * 1.8) {
      // Nära: snäll auto-glid in mot mitten, sedan firas som en träff.
      ctx.services.audio.sfx('soft')
      ctx.services.voice.say('Nästan! Jag hjälper till.')
      sparkle(ctx.fxLayer, (chute.x + this._targetX) / 2, GROUND_Y - 20, { count: 6 })
      const st = { x: chute.x }
      this._glideTw = gsap.to(st, {
        x: this._targetX,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (chute.destroyed) {
            this._glideTw?.kill()
            return
          }
          chute.x = st.x
        },
        onComplete: () => {
          if (!this._alive || chute.destroyed) return
          this._boboCatch(ctx)
          this._celebrate(ctx)
        },
      })
    } else {
      // Långt bort: glad gräslandning + mjuk omstart (samma nivå, INGET straff).
      ctx.services.audio.sfx('soft')
      wiggle(chute)
      puff(ctx.fxLayer, chute.x, GROUND_Y + 8, { count: 9, color: COLORS.green })
      ctx.services.voice.say('Hoppsan! Vi provar igen!')
      this._misses++
      this._retryTimer?.kill()
      this._retryTimer = gsap.delayedCall(1.0, () => {
        if (this._alive) this._loadLevel(ctx, this._level)
      })
    }
  },

  _celebrate(ctx) {
    if (!this._alive) return
    this._misses = 0
    const chute = this._chute
    ctx.services.audio.sfx('correct')
    if (this._target && !this._target.destroyed) pop(this._target, { scale: 1.12 })

    // Föraren skrattar till vid den mjuka landningen (litet "iiih!" + glad puls).
    floatText(ctx.fxLayer, chute.x, GROUND_Y - 150, 'Iiih!', { fontSize: 46 })
    ctx.services.audio.tone({ freq: 700, dur: 0.1, type: 'sine', vol: 0.22, slideTo: 1020 })
    ctx.services.audio.tone({ freq: 880, dur: 0.12, type: 'sine', vol: 0.2, slideTo: 1240, delay: 0.11 })
    if (this._kid && !this._kid.destroyed) pop(this._kid, { scale: 1.18 })

    // Mjuk studs-sekvens (direkt på fallskärmen; dödas i destroy).
    this._landTl?.kill()
    this._landTl = gsap
      .timeline()
      .to(chute, { y: GROUND_Y - 72, duration: 0.28, ease: 'power2.out' })
      .to(chute, { y: GROUND_Y, duration: 0.26, ease: 'bounce.out' })
      .to(chute, { y: GROUND_Y - 38, duration: 0.2, ease: 'power2.out' })
      .to(chute, { y: GROUND_Y, duration: 0.22, ease: 'bounce.out' })

    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    burst(ctx.fxLayer, this._targetX, GROUND_Y, { count: 16 })

    // Progress: höj nivå + räkna mjuka landningar + delat firande (stjärna + sticker).
    ctx.progress.setLevel(this._level + 1)
    ctx.progress.setCustom('landningar', ((ctx.progress.get().custom?.landningar) || 0) + 1)
    ctx.progress.complete()

    this._nextTimer?.kill()
    this._nextTimer = gsap.delayedCall(1.6, () => {
      if (!this._alive) return
      this._level += 1
      this._loadLevel(ctx, this._level)
    })
  },

  // ---- Städning ------------------------------------------------------------

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._glowTw?.kill()
    this._landTl?.kill()
    this._glideTw?.kill()
    this._boboIdle?.kill()
    if (this._bobo && !this._bobo.destroyed) {
      gsap.killTweensOf(this._bobo)
      gsap.killTweensOf(this._bobo.scale)
    }
    this._kar?.destroy() // river riggens alla tweens (idle, blink, humör, reaktion)
    this._kar = null
    this._nextTimer?.kill()
    this._retryTimer?.kill()

    if (this._steerPad && !this._steerPad.destroyed) {
      this._steerPad.off('pointerdown', this._onDown)
      this._steerPad.off('globalpointermove', this._onMove)
      this._steerPad.off('pointerup', this._onUp)
      this._steerPad.off('pointerupoutside', this._onUp)
    }
    if (this._weightBtn && !this._weightBtn.destroyed) this._weightBtn.off('pointertap', this._onWeight)

    if (this._chute && !this._chute.destroyed) {
      gsap.killTweensOf(this._chute)
      gsap.killTweensOf(this._chute.scale)
    }
    if (this._kid && !this._kid.destroyed) gsap.killTweensOf(this._kid.scale)
    if (this._glow && !this._glow.destroyed) gsap.killTweensOf(this._glow.scale)
    if (this._target && !this._target.destroyed) gsap.killTweensOf(this._target.scale)
    if (this._chevL && !this._chevL.destroyed) gsap.killTweensOf(this._chevL)
    if (this._chevR && !this._chevR.destroyed) gsap.killTweensOf(this._chevR)

    // Kvarvarande lövpartiklar är exit-säkra (egen destroyed-koll) men rensa listan.
    for (const lf of this._leaves) {
      if (lf && !lf.destroyed) lf.destroy()
    }
    this._leaves = []

    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// RITAT barn i selen (P0 ASSETS): huvud, kropp, armar och dinglande ben.
function makeKid() {
  const c = new Container()
  const g = new Graphics()
  g.roundRect(-9, 16, 8, 24, 4).fill(0x4aa3df) // ben
  g.roundRect(1, 16, 8, 24, 4).fill(0x4aa3df)
  g.roundRect(-12, 38, 12, 8, 4).fill(0xff6b6b) // skor
  g.roundRect(0, 38, 12, 8, 4).fill(0xff6b6b)
  g.roundRect(-16, -6, 32, 26, 10).fill(0xffd35c) // kropp
  g.moveTo(-15, 0).quadraticCurveTo(-27, -8, -25, -22).stroke({ width: 7, color: 0xffd9a8, cap: 'round' })
  g.moveTo(15, 0).quadraticCurveTo(27, -8, 25, -22).stroke({ width: 7, color: 0xffd9a8, cap: 'round' })
  g.circle(0, -24, 19).fill(0xffd9a8) // huvud
  g.eventMode = 'none'
  c.addChild(g)
  // Håret ritas separat så figuren kan byta frisyr med namnet (Zacke/Lova).
  const hair = new Graphics()
  c.addChild(hair)
  c.setName = (name) => {
    if (hair.destroyed) return
    hair.clear()
    hair.moveTo(-19, -30).quadraticCurveTo(0, -50, 19, -30).quadraticCurveTo(0, -40, -19, -30).fill(0xf5a623)
    if (name === 'Lova') {
      hair.ellipse(-20, -22, 9, 15).fill(0xf5a623) // längre hår
      hair.ellipse(20, -22, 9, 15).fill(0xf5a623)
      hair.circle(15, -38, 6).fill(0xff6b9d) // rosett
      hair.circle(23, -35, 5).fill(0xff6b9d)
    }
  }
  c.setName('Zacke')
  g.circle(-7, -26, 3.4).fill(0x33291f)
  g.circle(7, -26, 3.4).fill(0x33291f)
  g.moveTo(-7, -17).quadraticCurveTo(0, -10, 7, -17).stroke({ width: 3, color: 0x33291f, cap: 'round' })
  g.circle(-13, -19, 4).fill({ color: 0xff9ec4, alpha: 0.75 })
  g.circle(13, -19, 4).fill({ color: 0xff9ec4, alpha: 0.75 })
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}

// RITAT löv (P0 ASSETS) — var en 🍃-emoji.
function makeLeaf(s = 1) {
  const c = new Container()
  const g = new Graphics()
  const R = 16 * s
  g.moveTo(-R, R * 0.4).quadraticCurveTo(-R * 0.3, -R * 1.1, R, -R * 0.4)
    .quadraticCurveTo(R * 0.2, R * 0.9, -R, R * 0.4).fill(0x6ac96a)
  g.moveTo(-R, R * 0.4).quadraticCurveTo(0, -R * 0.1, R, -R * 0.4)
    .stroke({ width: 2 * s, color: 0x3f8f43, alpha: 0.8 })
  g.eventMode = 'none'
  c.addChild(g)
  c.eventMode = 'none'
  return c
}
