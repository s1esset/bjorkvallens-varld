// Såpbubblor — skimrande såpbubblor svävar UPPÅT; tryck på en bubbla -> den
// spricker med ett "pop" (lugn orsak-verkan, 2–5 år). DET BEVARADE: bubblorna
// glittrar, driver och poppas precis som förr — det är fortfarande härligt att
// bara peta sönder dem.
//
// MÅLET: Bobo står och håller en RING. Bubblor som åker in i ringen fyller en
// mätare; full mätare -> firande + stjärna + klistermärke och nästa nivå
// (ringen flyttar/krymper, mild bris högre upp).
//
// STYRNINGEN (omgång 2, 2026-08-05): blåset är RIKTAT. Trycker jag var som helst
// i himlen vrider sig närmaste fläkt mot punkten och skickar en synlig vindpuff
// dit. Puffen färdas, växer och skjuter de bubblor den sveper förbi — i BÅDA
// axlarna, så jag kan blåsa upp-och-över in i en högt sittande ring. Varje tryck
// är ett val med synlig effekt; suget mot ringen är bara en mild sista knuff.
//
// FYSIK: bubblorna har riktig MASSA (stora = tunga, små = lätta), luftmotstånd
// och momentum. Vindens kraft delas med massan -> små bubblor blåser långt, en
// jättebubbla knappt alls. INGET felsteg: poppning straffar aldrig (den släpper
// tvärtom en liten barnbubbla som kan blåsas in), fläkten hjälper alltid, och en
// mild auto-hjälp ser till att ringen alltid blir full.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { sparkle, puff, bigCelebration, pop } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { COLORS, PLAYFUL } from '../../lib/theme.js'
import { randomFrom } from '../../lib/swedish.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { SURPRISE_KEYS, makeSurprise, makeStar } from './overraskningar.js'

const TARGET_BUBBLES = 9 // håll ~7–10 bubblor i luften
const MAX_BUBBLES = 15 // tak inkl. barnbubblor från poppningar
const SAY_THROTTLE_MS = 800 // strypa röst så den aldrig tjattrar/stammar
const IDLE_DELAY = 6 // s utan interaktion -> mild om-uppmaning

// Vind: varje blås föder en PUFF som färdas längs siktlinjen och knuffar
// bubblorna den sveper förbi (designkoordinater, px & sekunder).
const GUST_SPEED = 620 // px/s som puffen färdas
const GUST_FORCE = 2500 // kraft i puffens kärna
const GUST_R0 = 84 // startradie
const GUST_GROW = 120 // px/s radien växer (puffen breddas och tunnas ut)
const GUST_LIFE = 0.9 // s
const MAX_GUSTS = 5 // tak: spam ger inte oändligt med vind

// Hinnans fjäder (se `_deformera`). Talen är mätta i `scripts/_bubbelprobe.mjs`.
// ⚠️ EN DIREKTTRÄFF FÅR INTE SLÅ I TAKET. Med 0,0013 nådde varje puff exakt 30 % och
// då slutar MASSAN synas — en liten bubbla och en jättebubbla deformerades lika mycket,
// fast hela fläktmekaniken bygger på att kraften delas med massan. 0,0008 lägger en
// direktträff på ~22 % och lämnar plats åt både lättare kantträffar och tyngre bubblor.
const SQ_PER_KRAFT = 0.00034 // kraft/massa → måldeformation (direktträff ≈ 21 %)
const SQ_MAX = 0.3 // tak: 30 % utdragning, mer läser som en trasig bubbla
const SQ_STYVHET = 0.09 // hur snabbt hinnan söker sig mot målformen
const SQ_DAMP = 0.86 // dämpning per bildruta → den svänger tillbaka, inte studsar vilt

const VX_DRAG = 0.93 // luftmotstånd per bildruta
const VX_MAX = 470 // hastighetstak i sidled (px/s)
const WY_MAX = 330 // hastighetstak i höjdled från vind (px/s)
const PULL = 520 // mjuk sista-knuff mot ringen (dämpad — fläkten avgör)
// Räckvidd i ringradier. Infångningen sker vid 0.8·r, så 1.15 gör suget till just
// en förlåtande nästan-träff-hjälp. Vidare (1.6) blev det en osynlig tratt som
// svalde allt som råkade driva förbi, och blåset kändes överflödigt.
const PULL_RANGE = 1.15
const AUTO_HELP_AFTER = 14 // s utan poäng -> mild auto-hjälp (no-fail)

const IDLE_SPIN = 0.9 // rad/s: fläktbladen idlar alltid (levande maskin)
const SPIN_KICK = 20 // rad/s som ett blås lägger till
const SPIN_DECAY = 0.95 // per bildruta

// Korta, glada repliker.
const POP_PHRASES = ['Pang!', 'Plopp!', 'Pop!', 'Hihi!', 'Så fint!', 'Där!']
const SCORE_PHRASES = ['Ja! In i ringen!', 'Pang i ringen!', 'Mitt i prick!', 'Vilken fin!', 'Bobo fångade den!']
const IDLE_PHRASES = ['Blås bubblorna in i ringen!', 'Peka dit du vill blåsa!']
const SHEEN = [0xff9ec4, 0x9ad0ff, 0xa78bfa, 0x9ff0d0, 0xffe08a]

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'sapbubblor',
  titleSv: 'Såpbubblor',
  icon: '🫧',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'sapbubblor',
  voiceIntro: 'Blås bubblorna in i ringen!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._lastSay = 0
    this._bubbles = []
    this._pipNodes = []
    this._fans = []
    this._gusts = []
    this._breeze = 0
    this._breezePhase = 0
    this._sinceScore = 0
    this._resolving = false

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Mjuk himmel bakom bubblorna (dekorativ, släpper igenom pekningar).
    this._scene = createScene('sky', { width: ctx.width, height: ctx.height })
    this._root.addChild(this._scene)

    // Heltäckande fångare: ETT tryck var som helst = rikta + blås åt det hållet.
    this._catcher = new Graphics()
      .rect(0, 0, ctx.width, ctx.height)
      .fill({ color: 0xdcefff, alpha: 0.12 })
    this._catcher.eventMode = 'static'
    this._onCatch = (ev) => {
      if (!this._alive) return
      const p = this._root.toLocal(ev.global)
      sparkle(ctx.fxLayer, p.x, p.y, { count: 4 })
      const fan = this._nearestFan(p.x, p.y)
      if (fan) this._blow(ctx, fan, p.x, p.y)
    }
    this._catcher.on('pointertap', this._onCatch)
    this._root.addChild(this._catcher)

    // Lager i ritordning: bubblor -> ring/Bobo -> vind -> fläktar -> mätare.
    this._bubbleLayer = new Container()
    this._root.addChild(this._bubbleLayer)

    this._buildHoop()

    this._windLayer = new Container()
    this._windLayer.eventMode = 'none'
    this._root.addChild(this._windLayer)

    this._buildFans(ctx)

    this._meter = new Container()
    this._root.addChild(this._meter)

    // Nivå utifrån sparad progress.
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._startLevel(ctx, this._level, true)

    // Seed: bubblor utspridda direkt så scenen aldrig är tom.
    for (let i = 0; i < TARGET_BUBBLES; i++) this._spawn(ctx, { seed: true })

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Ring + Bobo (målet & mottagaren) ------------------------------------

  _buildHoop() {
    this._hoop = new Container()
    this._hoop.eventMode = 'none' // ringen tar inga tryck (bubblor passerar in)
    this._hoopGlow = new Graphics()
    this._hoopRing = new Graphics()
    this._bobo = this._makeBobo()
    // Ordning: glöd, ring, Bobo överst — armen ligger INUTI Bobo (se _makeBobo),
    // så handen syns greppa ringen och följer med när han hoppar och skalas.
    this._hoop.addChild(this._hoopGlow, this._hoopRing, this._bobo)
    this._root.addChild(this._hoop)
    // Mjuk andning på glödringen (drar blicken mot målet).
    this._hoopTween = gsap.to(this._hoopGlow.scale, {
      x: 1.1, y: 1.1, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut',
    })
  },

  // Bobo som håller ringen: kropp, ansikte och en gapande mun som visas när han
  // sväljer en bubbla. Andas i vila så han aldrig ser ut som en dekal.
  _makeBobo() {
    const c = new Container()
    const body = new Graphics()
      .ellipse(0, 60, 38, 38)
      .fill(COLORS.orange)
      .stroke({ width: 4, color: COLORS.orangeDark })
    c.addChild(body)
    // Båda armarna ritas i _drawHoop (sidan byts när ringen flyttar). De hör
    // hemma i Bobos egen container — låg de i ringens, lossnade de från kroppen
    // när han hoppade vid full mätare. Fötter vore fel: Bobo svävar.
    this._boboFreeArm = new Graphics()
    this._boboArm = new Graphics()
    c.addChild(this._boboFreeArm, this._boboArm)
    // Ansiktet är en RIGG (lib/karaktarer.js) med `kropp: false` — den orange
    // kulkroppen och armarna ovan ÄR Bobos svävande form här. Den handrullade
    // gap-munnen (`_boboMouth`) är borta: riggens 'nam' ÄR att tugga och svälja.
    this._rig = makeKaraktar({ r: 38, kropp: false })
    const face = this._rig.view
    c.addChild(face)
    this._boboFace = face
    return c
  },

  _drawHoop(r) {
    // Tjock, färgglad ring med ljus högdager -> läses tydligt som ett "mål".
    this._hoopRing
      .clear()
      .circle(0, 0, r)
      .fill({ color: 0x9ad0ff, alpha: 0.14 }) // svag fyllning = "innanför"
      .circle(0, 0, r)
      .stroke({ width: 22, color: COLORS.blue, alpha: 0.95 })
      .circle(0, 0, r)
      .stroke({ width: 8, color: 0xffffff, alpha: 0.65 })
    this._hoopGlow
      .clear()
      .circle(0, 0, r + 14)
      .stroke({ width: 6, color: COLORS.yellow, alpha: 0.55 })

    // Bobo står på den sida där han får plats (ringen kan hamna nära en kant).
    const side = this._hoopX > 640 ? -1 : 1
    const bx = side * (r + 96)
    this._bobo.position.set(bx, 4)
    // Armarna ritas i BOBOS koordinater. Handen hamnar alltid 96 px från hans
    // mitt mot ringen — dvs. exakt på ringbandet, oavsett ringens radie.
    this._boboArm
      .clear()
      .moveTo(-side * 22, 50)
      .quadraticCurveTo(-side * 74, 26, -side * 96, 2)
      .stroke({ width: 14, color: COLORS.orange, cap: 'round' })
      .circle(-side * 96, 2, 14)
      .fill(COLORS.cream)
      .stroke({ width: 3, color: COLORS.orangeDark })
    // Lediga armen hänger avslappnat NEDÅT-utåt. Speglar den den hållande armen
    // läser bilden som "två händer i luften" i stället för ett grepp om ringen.
    this._boboFreeArm
      .clear()
      .moveTo(side * 20, 44)
      .quadraticCurveTo(side * 54, 56, side * 60, 82)
      .stroke({ width: 12, color: COLORS.orange, cap: 'round' })
      .circle(side * 60, 84, 11)
      .fill(COLORS.cream)
      .stroke({ width: 3, color: COLORS.orangeDark })
  },

  // Bobo gapar och sväljer — kort, tydlig kvittens på att bubblan togs emot.
  _boboSwallow() {
    if (!this._alive || !this._rig) return
    this._rig.react('nam')
    if (this._bobo && !this._bobo.destroyed) pop(this._bobo, { scale: 1.14 })
  },

  // ---- Fläktar (kontroll) --------------------------------------------------

  _buildFans(ctx) {
    this._fanLayer = new Container()
    this._root.addChild(this._fanLayer)
    // y valt så stativets fot (y + 100) hamnar innanför 720 — förr klipptes den av.
    const fy = ctx.height - 108
    this._makeFan(ctx, +1, 96, fy) // vänster: siktar in åt höger
    this._makeFan(ctx, -1, ctx.width - 96, fy) // höger: siktar in åt vänster
  },

  _makeFan(ctx, dir, x, y) {
    const node = new Container()
    node.position.set(x, y)

    // Stativ (ritas först = bakom huvudet).
    node.addChild(new Graphics()
      .roundRect(-10, 20, 20, 70, 8).fill(0x6b5840)
      .roundRect(-46, 84, 92, 16, 8).fill(0x6b5840))

    // Huvudet vrids mot sikte. Munstycket pekar längs +x i huvudets koordinater.
    const head = new Container()
    // Munstycke: kort och mättat så det läser som ett SNYTE på fläkten, inte som
    // en lös form bredvid den. Ritas före höljet -> innerkanten göms bakom det.
    head.addChild(new Graphics()
      .poly([38, -28, 94, -44, 94, 44, 38, 28])
      .fill({ color: 0x9cc7ea })
      .stroke({ width: 5, color: COLORS.blue, join: 'round' }))
    head.addChild(new Graphics()
      .circle(0, 0, 60)
      .fill({ color: 0xeef4fb })
      .stroke({ width: 6, color: COLORS.blue }))

    const blade = new Graphics()
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      // moveTo till bågens start innan arc() — annars drar Pixi ett streck hit.
      blade.moveTo(0, 0)
      blade.arc(0, 0, 46, a - 0.42, a + 0.42)
      blade.lineTo(0, 0)
      blade.fill({ color: i % 2 ? COLORS.teal : COLORS.blue, alpha: 0.95 })
    }
    blade.circle(0, 0, 12).fill(0xffffff)
    head.addChild(blade)

    // Ritade riktningspilar i munstycket (ersätter 💨-emojin).
    const arrow = new Graphics()
    for (let i = 0; i < 2; i++) {
      // Utanför höljets radie (60) — annars göms den inre pilen bakom det.
      const ax = 62 + i * 16
      arrow.moveTo(ax, -15).lineTo(ax + 13, 0).lineTo(ax, 15)
        .stroke({ width: 7, color: 0xffffff, alpha: 0.95, cap: 'round', join: 'round' })
    }
    head.addChild(arrow)
    node.addChild(head)

    node.eventMode = 'static'
    node.cursor = 'pointer'
    node.hitArea = new Circle(0, 0, 96) // stor träffyta (>= designkrav)

    const fan = { node, head, blade, x, y, dir, aim: Math.atan2(-0.42, dir), spin: IDLE_SPIN }
    fan.aimTarget = fan.aim
    head.rotation = fan.aim
    node.on('pointertap', () => this._blow(ctx, fan, null, null))
    this._fanLayer.addChild(node)
    this._fans.push(fan)
    return fan
  },

  _nearestFan(x, y) {
    let best = null
    let bd = Infinity
    for (const f of this._fans) {
      const d = Math.hypot(f.x - x, f.y - y)
      if (d < bd) { bd = d; best = f }
    }
    return best
  },

  // Ett blås: sikta (om en punkt gavs), snurra upp bladet, föd en vindpuff.
  _blow(ctx, fan, aimX, aimY) {
    if (!this._alive) return
    this._idle = 0

    if (aimX != null) {
      let dx = aimX - fan.x
      let dy = aimY - fan.y
      if (dy > -40) dy = -40 // blås aldrig rakt ner i marken
      if (Math.abs(dx) < 1) dx = fan.dir
      fan.aimTarget = Math.atan2(dy, dx)
    }
    fan.aim = fan.aimTarget
    fan.spin += SPIN_KICK

    ctx.services.audio.sfx('whoosh')
    // Fläkt-virr (synt) — riktigt klipp om det finns (MOSS, #3).
    if (!ctx.services.audio.sample?.('flakt')) {
      ctx.services.audio.tone({ freq: 140, dur: 0.26, type: 'sawtooth', vol: 0.07, slideTo: 230 })
    }

    const ux = Math.cos(fan.aim)
    const uy = Math.sin(fan.aim)
    this._addGust(fan.x + ux * 92, fan.y + uy * 92, ux, uy)

    const now = performance.now()
    if (now - this._lastSay > SAY_THROTTLE_MS && Math.random() < 0.4) {
      this._lastSay = now
      ctx.services.voice.say('Blås!')
    }
  },

  // Vindpuff: en synlig, färdande kraft. Rent ticker-driven -> exit-säker.
  _addGust(x, y, dx, dy) {
    if (this._gusts.length >= MAX_GUSTS) {
      const old = this._gusts.shift()
      if (old?.gfx && !old.gfx.destroyed) old.gfx.destroy()
    }
    const gfx = new Graphics()
    for (let i = 0; i < 4; i++) {
      const oy = (i - 1.5) * 24
      const len = 48 + Math.random() * 44
      gfx.moveTo(-len / 2, oy)
        .quadraticCurveTo(0, oy - 9, len / 2, oy)
        .stroke({ width: 7, color: 0xffffff, alpha: 0.6, cap: 'round' })
    }
    gfx.eventMode = 'none'
    gfx.position.set(x, y)
    gfx.rotation = Math.atan2(dy, dx)
    this._windLayer.addChild(gfx)
    this._gusts.push({ x, y, dx, dy, r: GUST_R0, life: GUST_LIFE, gfx })
  },

  // ---- Mätare --------------------------------------------------------------

  _buildMeter(need) {
    if (this._meter) {
      for (const c of [...this._meter.children]) c.destroy()
    }
    this._pipNodes = []
    const gap = 56
    const total = (need - 1) * gap
    const padX = 30
    this._meter.addChild(new Graphics()
      .roundRect(-total / 2 - padX - 40, -34, total + padX * 2 + 80, 68, 34)
      .fill({ color: 0xffffff, alpha: 0.82 })
      .stroke({ width: 4, color: COLORS.blue, alpha: 0.6 }))
    // Ritad miniring som etikett (förr en 🛟-emoji).
    this._meter.addChild(new Graphics()
      .circle(-total / 2 - padX - 6, 0, 16)
      .stroke({ width: 7, color: COLORS.blue })
      .circle(-total / 2 - padX - 6, 0, 16)
      .stroke({ width: 2.5, color: 0xffffff, alpha: 0.7 }))
    for (let i = 0; i < need; i++) {
      const pip = new Graphics()
      pip.x = -total / 2 + i * gap
      this._drawPip(pip, false)
      this._meter.addChild(pip)
      this._pipNodes.push(pip)
    }
    this._meter.position.set(640, 64)
  },

  _drawPip(pip, filled) {
    pip.clear()
    if (filled) {
      pip.circle(0, 0, 18).fill(COLORS.yellow).stroke({ width: 3, color: COLORS.orange })
    } else {
      pip.circle(0, 0, 16).fill({ color: 0xcfe0ee }).stroke({ width: 3, color: COLORS.blue, alpha: 0.5 })
    }
  },

  _fillPip(i) {
    const pip = this._pipNodes[i]
    if (!pip || pip.destroyed) return
    this._drawPip(pip, true)
    gsap.killTweensOf(pip.scale)
    pop(pip)
  },

  // ---- Nivåer --------------------------------------------------------------

  _layoutFor(level) {
    const need = Math.min(3 + level, 8)
    const hoopR = Math.max(78, 120 - level * 6)
    const xs = [900, 380, 760, 520, 1000, 280]
    let hoopX = xs[level % xs.length]
    let hoopY = 240 + (level % 3) * 56
    if (level >= 4) {
      hoopX += (Math.random() - 0.5) * 120
      hoopY += (Math.random() - 0.5) * 40
    }
    // Marginal så Bobo (ringradie + ~140 px) alltid ryms bredvid ringen.
    hoopX = clamp(hoopX, hoopR + 150, 1280 - hoopR - 150)
    hoopY = clamp(hoopY, 210, 380)
    const breezeAmp = level >= 3 ? Math.min(220 + (level - 3) * 90, 620) : 0
    const breezeSpeed = 0.5 + level * 0.05
    return { need, hoopR, hoopX, hoopY, breezeAmp, breezeSpeed }
  },

  _startLevel(ctx, level, silent = false) {
    if (!this._alive) return
    const L = this._layoutFor(level)
    this._need = L.need
    this._scored = 0
    this._hoopR = L.hoopR
    this._hoopX = L.hoopX
    this._hoopY = L.hoopY
    this._breezeAmp = L.breezeAmp
    this._breezeSpeed = L.breezeSpeed
    this._sinceScore = 0
    this._resolving = false

    this._hoop.position.set(L.hoopX, L.hoopY)
    this._drawHoop(L.hoopR)
    this._buildMeter(L.need)
    if (!this._hoop.destroyed) pop(this._hoop)

    if (!silent) ctx.services.voice.say('Ny ring! Blås in bubblorna.')
  },

  // ---- Bubblor -------------------------------------------------------------

  // Själva bubbelritningen — delas av spelbubblor och firandets bubbelregn.
  _drawBubble(g, r, kind = 'normal') {
    const rainbow = kind === 'rainbow'
    g.circle(0, 0, r).fill({ color: 0xffffff, alpha: rainbow ? 0.16 : 0.12 })
    // Mörkare ytterkontur under den vita: annars försvinner bubblan mot den
    // ljusa himlen (sjunde läckan, se docs/POLERINGSRUNDA.md).
    g.circle(0, 0, r).stroke({ width: Math.max(3, r * 0.09), color: 0x5b9fd4, alpha: 0.38 })
    g.circle(0, 0, r).stroke({ width: Math.max(2, r * 0.05), color: 0xffffff, alpha: 0.9 })
    const o = Math.random() * Math.PI * 2
    const palette = rainbow ? PLAYFUL : SHEEN // regnbågsbubbla = starka regnbågs-bågar
    const arcs = [
      { rad: r * 0.88, a0: -2.5, a1: -1.7 },
      { rad: r * 0.88, a0: 0.55, a1: 1.45 },
      { rad: r * 0.72, a0: 2.2, a1: 3.0 },
    ]
    arcs.forEach((arc, i) => {
      const a0 = arc.a0 + o
      // moveTo till bågens startpunkt — utan den drar Pixi ett streck från förra
      // formen tvärs över bubblan (sjätte läckan; syntes som "krokar" i skärmdumpen).
      g.moveTo(Math.cos(a0) * arc.rad, Math.sin(a0) * arc.rad)
      g.arc(0, 0, arc.rad, a0, arc.a1 + o).stroke({
        width: Math.max(2, r * (rainbow ? 0.09 : 0.06)),
        color: palette[(i + ((Math.random() * palette.length) | 0)) % palette.length],
        alpha: rainbow ? 0.75 : 0.5,
        cap: 'round',
      })
    })
    g.circle(-r * 0.34, -r * 0.34, r * 0.2).fill({ color: 0xffffff, alpha: 0.6 })
    g.circle(-r * 0.12, -r * 0.46, r * 0.07).fill({ color: 0xffffff, alpha: 0.8 })
    return g
  },

  // HINNAN GER EFTER FÖR VINDEN. En såpbubbla är inte en styv skiva: träffas den av en
  // puff dras den ut längs blåset, trycks ihop tvärs det, och svänger sedan tillbaka.
  // Förut var bubblan en perfekt cirkel oavsett hur hårt det blåste — hela fläktmekaniken
  // syntes bara som en förflyttning.
  //
  // ⚠️ VARFÖR INTE `lib/mjukkropp.js` (som LYFTPLAN B2 föreslog). En verlet-ring hör hemma
  // i en glasskula eller en fallskärmskupol — stora, få, långsamma. Här är bubblorna
  // 20–60 px och det kan ligga femton i luften samtidigt: en ring på tio punkter med
  // fyra relaxationsvarv blir 600 villkorspass per bildruta OCH tvingar fram en full
  // omritning av varje bubblas Graphics (kontur, tre glansbågar, två högdagrar) varje
  // ruta. Dessutom blir resultatet SÄMRE att titta på — en tiohörning på 40 px läser som
  // en kantig klump, inte som en såphinna. En fjäder på två tal per bubbla ger den
  // utdragning ögat faktiskt läser, kostar inga omritningar alls, och svänger på riktigt.
  // Talen är mätta i `scripts/_bubbelprobe.mjs`.
  _deformera(b, fx, fy, dtF) {
    const kraft = Math.hypot(fx, fy)
    if (kraft > 1) b._sqA = Math.atan2(fy, fx) // vindens riktning = utdragningens axel
    const mal = Math.min(SQ_MAX, kraft * SQ_PER_KRAFT)
    b._sqV += (mal - b._sq) * SQ_STYVHET * dtF
    b._sqV *= Math.pow(SQ_DAMP, dtF)
    b._sq += b._sqV * dtF
    // ⚠️ TAKET MÅSTE SITTA PÅ UTDRAGNINGEN, INTE PÅ MÅLET. Först klipptes bara `mal`,
    // men en fjäder svänger FÖRBI sitt mål: uppmätt 42,7 % utdragning mot ett "tak" på
    // 30. Samma fälla som fjäderbrädans "styvhet, djup och tak är samma tal tre gånger".
    if (b._sq > SQ_MAX) {
      b._sq = SQ_MAX
      if (b._sqV > 0) b._sqV = 0
    }
    if (b._sq < 0) b._sq = 0
    b.rotation = b._sqA
    b.scale.set(1 + b._sq, 1 - b._sq * 0.85)
  },

  _makeBubble(ctx, r, kind = 'normal') {
    const b = new Container()
    b.addChild(this._drawBubble(new Graphics(), r, kind))

    if (kind === 'surprise') {
      // Svag siluett inuti: "det ligger NÅGOT i den där!" — en anledning att jaga
      // en särskild bubbla i stället för vilken som helst.
      b._surprise = randomFrom(SURPRISE_KEYS)
      const hint = makeSurprise(b._surprise, r * 0.42)
      hint.alpha = 0.34
      b.addChild(hint)
    }
    b._kind = kind
    b._sq = 0 // utdragning just nu (0 = rund)
    b._sqV = 0 // fjäderns fart
    b._sqA = 0 // utdragningens axel (vindens riktning)
    b.eventMode = 'static'
    b.cursor = 'pointer'
    // Osynlig hit-halo. Golvet 48 håller P0:s 96 px träffyta även för de minsta
    // barnbubblorna (r 20–28 gav annars bara 80–96 px i diameter).
    b.hitArea = new Circle(0, 0, Math.max(48, r + 20))
    b._popped = false
    b.on('pointertap', () => this._pop(ctx, b))
    return b
  },

  _spawn(ctx, { seed = false, x = null, y = null, kind = null, r = null, vx = 0 } = {}) {
    if (!this._alive || this._bubbles.length >= MAX_BUBBLES) return
    // Specialbubblor (aldrig på seed): regnbåge (fest), överraskning, trög jätte.
    let k = kind
    if (!k) {
      k = 'normal'
      if (!seed) {
        const roll = Math.random()
        if (roll < 0.06) k = 'rainbow'
        else if (roll < 0.14) k = 'surprise'
        else if (roll < 0.2) k = 'giant'
      }
    }
    const rr = r ?? (k === 'giant' ? 80 + Math.random() * 14 : 30 + Math.random() * 40)
    const b = this._makeBubble(ctx, rr, k)
    b._r = rr
    b._mass = (rr * rr) / (48 * 48) // riktig massa: stora = tunga, små = lätta
    // Bias mot ringens x BARA när auto-hjälpen är påslagen (ingen poäng på
    // AUTO_HELP_AFTER sekunder). Förr föddes var tredje bubbla i ringens linje
    // och drev in gratis — en hel nivå kunde klaras utan ett enda tryck, och
    // blåset kändes dekorativt. Nu är gratispassagen bara ren tur, och den
    // matande hjälpen slår till först när barnet faktiskt fastnat.
    const alignToHoop = !seed && x == null && this._sinceScore > AUTO_HELP_AFTER && Math.random() < 0.5
    b._baseX = x ?? (alignToHoop
      ? this._hoopX + (Math.random() - 0.5) * 200
      : rr + 20 + Math.random() * (ctx.width - 2 * (rr + 20)))
    // Bubblor stiger RAKT upp tills vinden tar tag i dem, så varje bubbla som
    // föds i ringens lodräta korridor scorar gratis. Mätt: en hel nivå klarades
    // på 10 s helt utan tryck. Alla bubblor utom den matande auto-hjälpen föds
    // därför utanför korridoren — vill man ha en poäng får man blåsa dit den.
    if (!alignToHoop && x == null && Math.abs(b._baseX - this._hoopX) < this._hoopR * 1.3) {
      const away = b._baseX < this._hoopX ? -1 : 1
      b._baseX = this._hoopX + away * (this._hoopR * 1.3 + Math.random() * 220)
    }
    b._baseX = clamp(b._baseX, rr, ctx.width - rr)
    b._vx = vx // sidledshastighet (px/s) — vind/sug accelererar denna
    b._wy = 0 // vindens lodräta hastighet (px/s, + = nedåt)
    b._wobbleAmp = 12 + Math.random() * 22
    b._wobbleSpeed = 0.7 + Math.random() * 1.0
    b._phase = Math.random() * Math.PI * 2
    b._vy = 18 + Math.random() * 26 + (70 - rr) * 0.25 // mindre bubblor stiger snabbare
    b._popped = false

    b.x = b._baseX
    // Nya bubblor föds under den SYNLIGA nederkanten (ctx.view.bottom) — under 720
    // låg de mitt i bild på en hög platta och dök upp ur tomma intet.
    b.y = y ?? (seed ? 160 + Math.random() * (ctx.height - 280) : ctx.view.bottom + rr + 10 + Math.random() * 140)

    this._bubbleLayer.addChild(b)
    this._bubbles.push(b)

    b.scale.set(0.4)
    gsap.to(b.scale, { x: 1, y: 1, duration: 0.5, ease: 'sine.out' })
    return b
  },

  // Tap-pop: ren glädje — OCH en liten barnbubbla stiger ur skummet, så att
  // poppa-leksaken och ring-målet till slut hänger ihop. Poppning straffar aldrig.
  _pop(ctx, b) {
    if (!this._alive || b._popped || b.destroyed) return
    b._popped = true
    b.eventMode = 'none'
    this._idle = 0

    // Bubbel-"blubb" (synt nedåt-plopp) — riktigt klipp om det finns (MOSS, #3).
    if (!ctx.services.audio.sample?.('blubb')) {
      // Tonhöjd efter storlek: en jättebubbla ploppar djupt, en barnbubbla pipigt.
      const freq = clamp(900 - b._r * 5, 330, 900) + Math.random() * 80
      ctx.services.audio.tone({ freq, dur: 0.12, type: 'sine', vol: 0.2, slideTo: 150 })
    }
    this._droplets(ctx, b.x, b.y, b._r)
    sparkle(ctx.fxLayer, b.x, b.y, { count: 5 })

    if (b._kind === 'rainbow') {
      ctx.services.audio.sfx('pling')
      sparkle(ctx.fxLayer, b.x, b.y, { count: 12 })
    }
    if (b._surprise) this._floatShape(ctx, b.x, b.y - 8, makeSurprise(b._surprise, 30))

    // Barnbubbla ur skummet: liten, lätt och lättblåst -> går att styra in i ringen.
    if (b._r > 26) {
      this._spawn(ctx, {
        x: clamp(b.x, 24, ctx.width - 24), y: b.y, kind: 'normal',
        r: 20 + Math.random() * 8, vx: b._vx * 0.5,
      })
    }

    const now = performance.now()
    if (now - this._lastSay > SAY_THROTTLE_MS) {
      this._lastSay = now
      ctx.services.voice.say(randomFrom(POP_PHRASES))
    }
    this._burstBubble(b)
  },

  // Bubbla in i ringen = POÄNG: Bobo sväljer, en prick fylls, nivån närmar sig klar.
  _scoreBubble(ctx, b) {
    if (!this._alive || b._popped || b.destroyed || this._resolving) return
    b._popped = true
    b.eventMode = 'none'
    this._idle = 0
    this._sinceScore = 0

    ctx.services.audio.sfx('correct')
    ctx.services.audio.tone({ freq: 320, dur: 0.18, type: 'sine', vol: 0.16, slideTo: 920 }) // "shloop"
    sparkle(ctx.fxLayer, this._hoopX, this._hoopY, { count: 8 })
    puff(ctx.fxLayer, this._hoopX, this._hoopY, { count: 8, color: COLORS.yellow })
    this._floatShape(ctx, this._hoopX, this._hoopY - 20, makeStar(30))
    if (!this._hoop.destroyed) pop(this._hoop)
    this._boboSwallow()

    const idx = this._scored
    this._scored++
    this._fillPip(idx)

    const now = performance.now()
    if (now - this._lastSay > SAY_THROTTLE_MS && this._scored < this._need) {
      this._lastSay = now
      ctx.services.voice.say(randomFrom(SCORE_PHRASES))
    }

    // Bubblan sugs in mot ringens mitt och tonar bort (exit-säkert via proxy).
    const st = { x: b.x, y: b.y, s: b.scale.x, a: 1 }
    const tw = gsap.to(st, {
      x: this._hoopX,
      y: this._hoopY,
      s: 0.2,
      a: 0,
      duration: 0.35,
      ease: 'power2.in',
      onUpdate: () => {
        if (b.destroyed) { tw.kill(); return }
        b.x = st.x
        b.y = st.y
        b.scale.set(st.s)
        b.alpha = st.a
      },
      onComplete: () => { if (!b.destroyed) b.destroy({ children: true }) },
    })

    if (this._scored >= this._need) this._levelComplete(ctx)
  },

  // Ritad figur som stiger och tonar bort (ersätter floatText med emoji).
  _floatShape(ctx, x, y, gfx) {
    if (!this._alive || !gfx) { gfx?.destroy?.(); return }
    gfx.position.set(x, y)
    gfx.eventMode = 'none'
    ctx.fxLayer.addChild(gfx)
    const st = { y, a: 1, s: 0.6 }
    const tw = gsap.to(st, {
      y: y - 96, a: 0, s: 1.15, duration: 0.95, ease: 'power2.out',
      onUpdate: () => {
        if (gfx.destroyed) { tw.kill(); return }
        gfx.y = st.y
        gfx.alpha = st.a
        gfx.scale.set(st.s)
      },
      onComplete: () => { if (!gfx.destroyed) gfx.destroy() },
    })
  },

  // Spricka (väx till + tona ut, förstör sedan). Exit-säkert via {}-proxy.
  _burstBubble(b) {
    const st = { s: b.scale.x, a: 1 }
    const tw = gsap.to(st, {
      s: b.scale.x * 1.4,
      a: 0,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        if (b.destroyed) { tw.kill(); return }
        b.scale.set(st.s)
        b.alpha = st.a
      },
      onComplete: () => { if (!b.destroyed) b.destroy({ children: true }) },
    })
  },

  _droplets(ctx, x, y, r) {
    const n = 5 + ((Math.random() * 3) | 0)
    for (let i = 0; i < n; i++) {
      const dr = 3 + Math.random() * 4
      const p = new Graphics()
        .circle(0, 0, dr)
        .fill({ color: 0xffffff, alpha: 0.55 })
        .stroke({ width: 1, color: 0xbfe6ff, alpha: 0.85 })
      p.x = x
      p.y = y
      p.eventMode = 'none'
      ctx.fxLayer.addChild(p)
      const ang = Math.random() * Math.PI * 2
      const dist = r * 0.5 + Math.random() * r * 0.9
      const st = { x, y, a: 1, s: 1 }
      const tw = gsap.to(st, {
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist + 18,
        a: 0,
        s: 0.3,
        duration: 0.4 + Math.random() * 0.25,
        ease: 'power2.out',
        onUpdate: () => {
          if (p.destroyed) { tw.kill(); return }
          p.x = st.x
          p.y = st.y
          p.alpha = st.a
          p.scale.set(st.s)
        },
        onComplete: () => { if (!p.destroyed) p.destroy() },
      })
    }
  },

  // ---- Nivå klar -----------------------------------------------------------

  _levelComplete(ctx) {
    if (this._resolving) return
    this._resolving = true
    this._idle = 0

    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say('Ringen är full! Bravo!')
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    this._bubbleShower(ctx)
    this._boboCheer()

    // Progress: höj nivå + delat firande (stjärna + klistermärke).
    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.complete()

    this._levelTimer = ctx.later(2.4, () => {
      if (!this._alive) return
      this._startLevel(ctx, this._level)
    })
  },

  // Spelspecifik finish: ett regn av bubblor som stiger och poppar i tur och
  // ordning med en stigande ton — inte samma konfetti som alla andra spel.
  _bubbleShower(ctx) {
    const n = 14
    for (let i = 0; i < n; i++) {
      const r = 20 + Math.random() * 30
      const g = this._drawBubble(new Graphics(), r, i % 5 === 0 ? 'rainbow' : 'normal')
      g.eventMode = 'none'
      g.position.set(90 + Math.random() * (ctx.width - 180), ctx.height + 60 + Math.random() * 220)
      ctx.fxLayer.addChild(g)
      const st = { y: g.y, s: 1, a: 1 }
      const tw = gsap.to(st, {
        y: 90 + Math.random() * 240,
        duration: 1.1 + Math.random() * 0.7,
        ease: 'sine.out',
        onUpdate: () => {
          if (g.destroyed) { tw.kill(); return }
          g.y = st.y
        },
        onComplete: () => {
          if (!this._alive || g.destroyed) { if (!g.destroyed) g.destroy(); return }
          ctx.services.audio.tone({ freq: 520 + i * 46, dur: 0.1, type: 'sine', vol: 0.11, slideTo: 190 })
          sparkle(ctx.fxLayer, g.x, g.y, { count: 4 })
          const bt = gsap.to(st, {
            s: 1.5, a: 0, duration: 0.24, ease: 'power2.out',
            onUpdate: () => {
              if (g.destroyed) { bt.kill(); return }
              g.scale.set(st.s)
              g.alpha = st.a
            },
            onComplete: () => { if (!g.destroyed) g.destroy() },
          })
        },
      })
    }
  },

  _boboCheer() {
    if (!this._alive || !this._bobo || this._bobo.destroyed) return
    // Spelets hopp är 34 px — större än riggens `jubel` (0,5·r = 19) — så spelet
    // äger y och riggen bidrar med minen.
    this._rig?.setMood('stolt')
    const base = this._bobo.y
    gsap.killTweensOf(this._bobo)
    const st = { y: base }
    const tw = gsap.to(st, {
      y: base - 34, duration: 0.24, yoyo: true, repeat: 5, ease: 'sine.out',
      onUpdate: () => {
        if (this._bobo.destroyed) { tw.kill(); return }
        this._bobo.y = st.y
      },
      onComplete: () => { if (!this._bobo.destroyed) this._bobo.y = base },
    })
  },

  // ---- Ticker --------------------------------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = Math.min(ticker.deltaMS / 1000, 0.05)
    const dtF = ticker.deltaMS / 16.67

    // Fläktarna lever: bladen idlar alltid och snurrar upp efter ett blås.
    for (const f of this._fans) {
      f.spin = IDLE_SPIN + (f.spin - IDLE_SPIN) * Math.pow(SPIN_DECAY, dtF)
      if (f.blade && !f.blade.destroyed) {
        f.blade.rotation = (f.blade.rotation + f.spin * dt * f.dir) % (Math.PI * 2)
      }
      if (f.head && !f.head.destroyed) {
        let d = f.aimTarget - f.head.rotation
        while (d > Math.PI) d -= Math.PI * 2
        while (d < -Math.PI) d += Math.PI * 2
        f.head.rotation += d * Math.min(1, 14 * dt)
      }
    }

    // Vindpuffarna färdas, breddas och tonar bort.
    for (let i = this._gusts.length - 1; i >= 0; i--) {
      const gu = this._gusts[i]
      gu.life -= dt
      gu.x += gu.dx * GUST_SPEED * dt
      gu.y += gu.dy * GUST_SPEED * dt
      gu.r = GUST_R0 + GUST_GROW * (GUST_LIFE - gu.life)
      const t = 1 - Math.max(0, gu.life) / GUST_LIFE
      if (gu.gfx && !gu.gfx.destroyed) {
        gu.gfx.position.set(gu.x, gu.y)
        gu.gfx.alpha = (1 - t) * 0.9
        gu.gfx.scale.set(1 + t * 0.9)
      }
      // Marginalen räknas från den SYNLIGA ytan (ctx.view, läses varje tick) — på
      // telefon är den bredare än 1280, och en puff fick inte försvinna mitt i bild.
      const vv = ctx.view
      const off = gu.x < vv.left - 200 || gu.x > vv.right + 200 || gu.y < vv.top - 200 || gu.y > vv.bottom + 200
      if (gu.life <= 0 || off) {
        if (gu.gfx && !gu.gfx.destroyed) gu.gfx.destroy()
        this._gusts.splice(i, 1)
      }
    }

    // Ambient bris högre upp i nivåerna (mjuk, förutsägbar sidled).
    if (this._breezeAmp > 0) {
      this._breezePhase += this._breezeSpeed * dt
      this._breeze = Math.sin(this._breezePhase) * this._breezeAmp
    } else {
      this._breeze = 0
    }
    this._sinceScore += dt
    const helpBoost = this._sinceScore > AUTO_HELP_AFTER ? 1.6 : 1 // mild sista-knuff (no-fail)

    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      const b = this._bubbles[i]
      if (!b || b.destroyed) { this._bubbles.splice(i, 1); continue }
      if (b._popped) continue // pop/score-tween styr den; rör inte positionen

      // Vindpuffar: kraft / massa -> lätta bubblor blåser långt, jättar knappt.
      // Kraften summeras också som en VEKTOR, för det är den som deformerar hinnan.
      let fx = 0
      let fy = 0
      for (const gu of this._gusts) {
        const d = Math.hypot(b.x - gu.x, b.y - gu.y)
        if (d > gu.r) continue
        const f = (GUST_FORCE * (1 - d / gu.r) * (Math.max(0, gu.life) / GUST_LIFE)) / b._mass
        b._vx += gu.dx * f * dt
        b._wy += gu.dy * f * dt
        fx += gu.dx * f
        fy += gu.dy * f
      }
      this._deformera(b, fx, fy, dtF)
      // Ambient bris (samma massberoende).
      if (this._breeze) b._vx += (this._breeze / b._mass) * dt

      // Mjuk sista-knuff mot ringen när bubblan är nära (nu i båda axlarna).
      const dxh = this._hoopX - b.x
      const dyh = this._hoopY - b.y
      const dh = Math.hypot(dxh, dyh) || 1
      const range = this._hoopR * PULL_RANGE
      if (dh < range) {
        const k = PULL * (0.25 + (1 - dh / range)) * helpBoost * dt
        b._vx += (dxh / dh) * k
        b._wy += (dyh / dh) * k
      }

      // Luftmotstånd + tak i båda axlarna.
      b._vx = clamp(b._vx * Math.pow(VX_DRAG, dtF), -VX_MAX, VX_MAX)
      b._wy = clamp(b._wy * Math.pow(VX_DRAG, dtF), -WY_MAX, WY_MAX)

      // Stiga uppåt (egen lyftkraft) plus vindens lodräta del.
      b.y += (b._wy - b._vy) * dt
      b._phase += b._wobbleSpeed * dt

      // Integrera basläge; studsa mjukt mot kanterna — den SYNLIGA ytans kanter
      // (ctx.view), annars studsar bubblan mot ingenting mitt i bild på telefon.
      const ve = ctx.view
      b._baseX += b._vx * dt
      if (b._baseX < ve.left + b._r) { b._baseX = ve.left + b._r; b._vx = Math.abs(b._vx) * 0.5 }
      else if (b._baseX > ve.right - b._r) { b._baseX = ve.right - b._r; b._vx = -Math.abs(b._vx) * 0.5 }

      b.x = b._baseX + Math.sin(b._phase) * b._wobbleAmp

      // Infångning: bubblans mitt inne i ringen -> poäng.
      if (!this._resolving && Math.hypot(b.x - this._hoopX, b.y - this._hoopY) < this._hoopR * 0.8) {
        this._scoreBubble(ctx, b)
        continue
      }

      // Drev ut ur bild (upp ELLER ner, sedan blåset blev riktat) -> ta bort mjukt.
      // "Ur bild" = utanför ctx.view, inte utanför 0..720 (synligt på hög platta).
      if (b.y < ve.top - b._r - 20 || b.y > ve.bottom + b._r + 140) {
        this._bubbles.splice(i, 1)
        gsap.killTweensOf(b)
        gsap.killTweensOf(b.scale)
        if (!b.destroyed) b.destroy({ children: true })
      }
    }

    // Fyll alltid på.
    while (this._alive && this._bubbles.length < TARGET_BUBBLES) this._spawn(ctx, {})

    // Mild om-uppmaning vid paus.
    this._idle += dt
    if (this._idle > IDLE_DELAY) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(IDLE_PHRASES))
      const live = this._bubbles.filter((b) => b && !b.destroyed && !b._popped)
      if (live.length) {
        const b = randomFrom(live)
        gsap.to(b.scale, { x: b.scale.x * 1.18, y: b.scale.y * 1.18, duration: 0.22, yoyo: true, repeat: 3 })
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._levelTimer?.kill?.()
    this._hoopTween?.kill()
    this._rig?.destroy()
    this._rig = null
    this._gusts?.forEach((gu) => { if (gu?.gfx && !gu.gfx.destroyed) gu.gfx.destroy() })
    this._gusts = []
    this._fans?.forEach((f) => {
      if (f?.blade && !f.blade.destroyed) gsap.killTweensOf(f.blade)
      if (f?.head && !f.head.destroyed) gsap.killTweensOf(f.head)
    })
    this._fans = []
    this._bubbles?.forEach((b) => {
      if (b && !b.destroyed) {
        gsap.killTweensOf(b)
        gsap.killTweensOf(b.scale)
      }
    })
    this._bubbles = []
    this._pipNodes?.forEach((p) => { if (p && !p.destroyed) gsap.killTweensOf(p.scale) })
    this._pipNodes = []
    if (this._boboFace && !this._boboFace.destroyed) gsap.killTweensOf(this._boboFace.scale)
    if (this._bobo && !this._bobo.destroyed) {
      gsap.killTweensOf(this._bobo)
      gsap.killTweensOf(this._bobo.scale)
    }
    if (this._hoopGlow && !this._hoopGlow.destroyed) gsap.killTweensOf(this._hoopGlow.scale)
    if (this._hoop && !this._hoop.destroyed) gsap.killTweensOf(this._hoop.scale)
    if (this._catcher && !this._catcher.destroyed) this._catcher.off('pointertap', this._onCatch)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
