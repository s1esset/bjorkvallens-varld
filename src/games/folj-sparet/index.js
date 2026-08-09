// Följ Spåret — mjukt sekvensminne (3–5 år). Lysande fotspår (👣) ligger längs en
// slingrande äng från en liten figur (🐰/🐶/🐱/🦊) till dess hus (🏠). Spelet visar
// först sekvensen genom att tända fotspåren ett i taget (demofas), sedan trycker
// barnet på dem i samma ordning (härmfas). Rätt nästa fotspår -> det lyser, ett pling
// och figuren hoppar fram dit. Fel/redan tänt -> mjukt vingel + 'soft', ALDRIG en
// nollställning eller bestraffning. Hela spåret klart = figuren kommer hem, firande +
// ctx.progress.complete(), sedan byggs en ny (längre) runda. Oändlig lek, ingen poäng,
// ingen timer, inga felsteg. Allt ritas programmatiskt (Pixi Graphics + emoji).
// All async är skyddad med this._alive (exit-säkert).
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { bounceIn, pop, wiggle, sparkle, puff, floatText, kvittera } from '../../lib/feedback.js'
import { COLORS } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { Button } from '../../lib/Button.js'

// Layout (designkoordinater 1280×720).
const START = { x: 140, y: 410 } // figurens startpunkt (vänster)
const HOUSE = { x: 1150, y: 410 } // målet/huset (höger)
const PLATE_R = 58 // fotspårsplattans radie (Ø116 ≥ 96px)
const HIT_R = 72 // osynlig träffradie (extra marginal)
const RAB_DY = -14 // figuren står strax ovanför fotspåret
const IDLE_DELAY = 6 // s utan tap innan röst-recue + hint-puls


// Melodisk ledtråd: varje fotspår i sekvensen får en egen stigande ton ur en
// C-dur pentatonisk skala, så att FÖLJA spåret låter som en liten melodi (steg 1
// låg, steg N hög → örat får hjälp att minnas ordningen + ett litet crescendo hem).
const TONE_BASE = 523.25 // C5
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16] // halvtonssteg, ett per fotspår (upp till 8)
function toneFreq(k) {
  return TONE_BASE * Math.pow(2, PENTA[Math.min(k, PENTA.length - 1)] / 12)
}

// Små gömda fynd som ligger under vart 3:e fotspår och plockas upp när figuren
// skuttar dit (flyger till en liten samling uppe till höger) → "en till!"-känsla.
// P0 ASSETS: fynden RITAS (var 🌼🥕⭐🍓🌸). Centrerade i (0,0), ~±26 px.
const FINDS = ['blomma', 'morot', 'stjarna', 'jordgubbe', 'aster']
function makeFind(kind) {
  const g = new Graphics()
  if (kind === 'morot') {
    g.moveTo(-11, -10).lineTo(11, -10).lineTo(0, 24).closePath().fill(0xff9d3d).stroke({ width: 3, color: 0xd97520 })
    for (const y of [-2, 6, 13]) g.moveTo(-7 + y * 0.2, y).lineTo(7 - y * 0.2, y).stroke({ width: 2, color: 0xd97520, alpha: 0.7 })
    for (const [dx, dy] of [[-8, -22], [0, -26], [8, -22]]) {
      g.moveTo(0, -10).quadraticCurveTo(dx * 0.6, -18, dx, dy).stroke({ width: 5, color: 0x5bbf6a, cap: 'round' })
    }
  } else if (kind === 'stjarna') {
    const pts = []
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2
      const r = k % 2 === 0 ? 22 : 9.5
      pts.push(Math.cos(a) * r, Math.sin(a) * r)
    }
    g.poly(pts).fill(0xffd35c).stroke({ width: 3, color: 0xe0a94f })
  } else if (kind === 'jordgubbe') {
    g.moveTo(-16, -6).quadraticCurveTo(-18, 20, 0, 24).quadraticCurveTo(18, 20, 16, -6).closePath()
    g.fill(0xe0392b).stroke({ width: 3, color: 0xb02b20 })
    for (const [sx, sy] of [[-7, 2], [5, 0], [-2, 10], [8, 10], [-9, 14]]) g.ellipse(sx, sy, 1.8, 3).fill(0xffe08a)
    for (const dx of [-11, 0, 11]) g.ellipse(dx, -9, 8, 5).fill(0x5bbf6a)
    g.roundRect(-2, -20, 4, 10, 2).fill(0x3f8a44)
  } else {
    // blomma / aster — samma form, olika kronbladsfärg
    const petal = kind === 'aster' ? 0xf7b9e4 : 0xfff0a8
    for (let i = 0; i < (kind === 'aster' ? 8 : 6); i++) {
      const n = kind === 'aster' ? 8 : 6
      const a = (i / n) * Math.PI * 2
      g.ellipse(Math.cos(a) * 13, Math.sin(a) * 13, 8, 8).fill(petal).stroke({ width: 2, color: 0xe0a94f, alpha: 0.5 })
    }
    g.circle(0, 0, 8).fill(0xffc93c).stroke({ width: 2.5, color: 0xe0a94f })
  }
  g.eventMode = 'none'
  return g
}

// Hem-repliker som HELA strängar (se _win): check.mjs matchar bara literaler.
const HOME_PRAISE = [
  'Hurra, den kom hem!',
  'Du hittade hela vägen hem!',
  'Vilket fint spårande!',
  'Hemma igen, jättebra!',
]

// Sekvenslängd (== antal fotspår) växer med nivån.
const LEVELS = [{ steps: 3 }, { steps: 4 }, { steps: 5 }, { steps: 6 }, { steps: 7 }]
function clampLevel(l) {
  return Math.max(0, Math.min(LEVELS.length - 1, l))
}

export default {
  id: 'folj-sparet',
  titleSv: 'Följ Spåret',
  icon: '👣',
  category: 'minne',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'folj-sparet',
  voiceIntro: 'Titta var fötterna lyser! Tryck på dem i samma ordning för att hjälpa kaninen hem.',

  init(ctx) {
    this._alive = true
    this._foots = []
    this._sequence = []
    this._expected = 0
    this._busy = false
    this._winning = false
    this._wrongStreak = 0
    this._idle = 0
    this._saidJa = false
    this._hintFoot = null
    this._eagerTween = null
    this._findTweens = []
    this._level = clampLevel(ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Ängmatta (dekorativ, fångar inga tryck).
    const meadow = new Graphics()
      .roundRect(40, 138, 1200, 562, 48)
      .fill({ color: COLORS.green, alpha: 0.16 })
      .stroke({ width: 6, color: COLORS.green, alpha: 0.22 })
    meadow.eventMode = 'none'
    this._root.addChild(meadow)

    // Svag prickad ledtråd mellan fotspåren (ritas om per runda).
    this._pathHint = new Graphics()
    this._pathHint.eventMode = 'none'
    this._root.addChild(this._pathHint)

    // Fotspårslager (rundans föränderliga innehåll).
    this._field = new Container()
    this._root.addChild(this._field)

    // Uppsamlade fynd (blommor/morötter/stjärnor) landar här, uppe till höger.
    this._finds = new Container()
    this._finds.eventMode = 'none'
    this._root.addChild(this._finds)

    // Hus (mål) + figur (start) — persistenta, flyttas/byts per runda.
    // RITAT hus (var en 🏠-emoji): stomme, tak, dörr, fönster och skorsten.
    this._house = new Graphics()
    this._house.roundRect(38, -52, 16, 30, 4).fill(0xb5544a).stroke({ width: 3, color: 0x8a3d36 }) // skorsten
    this._house.roundRect(-46, -14, 92, 62, 6).fill(0xf0d7ae).stroke({ width: 4, color: 0xb08d62 })
    this._house.moveTo(-58, -12).lineTo(0, -60).lineTo(58, -12).closePath()
    this._house.fill(0xe0574f).stroke({ width: 4, color: 0xb03f3a })
    this._house.roundRect(-14, 6, 28, 42, 4).fill(0x9a5c33).stroke({ width: 3, color: 0x6f4a2e }) // dörr
    this._house.circle(7, 28, 3.5).fill(0xffd35c)
    this._house.roundRect(18, 4, 22, 22, 4).fill(0x8ee0ff).stroke({ width: 3, color: 0x5aa6c4 }) // fönster
    this._house.moveTo(29, 4).lineTo(29, 26).moveTo(18, 15).lineTo(40, 15).stroke({ width: 2.5, color: 0x5aa6c4 })
    this._house.roundRect(-40, 4, 22, 22, 4).fill(0x8ee0ff).stroke({ width: 3, color: 0x5aa6c4 })
    this._house.moveTo(-29, 4).lineTo(-29, 26).moveTo(-40, 15).lineTo(-18, 15).stroke({ width: 2.5, color: 0x5aa6c4 })
    this._house.eventMode = 'none'
    this._house.position.set(HOUSE.x, HOUSE.y)
    this._root.addChild(this._house)

    // RITAD figur med KROPP (var en djur-emoji, alltså ett svävande huvud).
    this._rabbit = new Container()
    this._rabbit.eventMode = 'none'
    this._rabbit.position.set(START.x, START.y)
    this._root.addChild(this._rabbit)
    this._paintFigure(0)

    // "Visa igen": spelar upp den visuella demofasen på nytt (nere till vänster, fri yta).
    this._showBtn = new Button({
      label: 'Visa igen',
      icon: '🔁',
      width: 240,
      height: 84,
      color: COLORS.blue,
      services: ctx.services,
      onTap: () => {
        if (this._alive && !this._winning) this._playDemo(ctx)
      },
    })
    this._showBtn.position.set(170, 660)
    this._root.addChild(this._showBtn)

    this._build(ctx)

    // Idle-recue (~6s) sköts i tickern.
    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Bygg en ny runda (oändlig lek) -------------------------------------

  _build(ctx) {
    if (!this._alive) return
    // Döda förra rundans tweens/timelines/timers.
    this._demoLead?.kill?.()
    this._demoLead = null
    this._demoTl?.kill()
    this._demoTl = null
    this._winTl?.kill()
    this._winTl = null
    this._hopTl?.kill()
    this._hopTl = null
    this._nextCall?.kill?.()
    this._nextCall = null
    this._hintTween?.kill()
    this._hintTween = null
    this._hintFoot = null
    this._eagerTween?.kill()
    this._eagerTween = null

    // Töm förra rundans uppsamlade fynd + deras flyg-tweens.
    for (const t of this._findTweens) t?.kill?.()
    this._findTweens = []
    this._finds.removeChildren().forEach((o) => o.destroy())

    for (const fp of this._foots) {
      if (fp && !fp.destroyed) {
        gsap.killTweensOf(fp)
        gsap.killTweensOf(fp.scale)
      }
    }
    this._field.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._foots = []
    this._pathHint.clear()

    // Nollställ rund-state.
    this._expected = 0
    this._busy = true // tap blockeras tills demon är klar
    this._winning = false
    this._wrongStreak = 0
    this._idle = 0
    this._saidJa = false

    const steps = LEVELS[this._level].steps
    const pts = this._genPath(steps)

    // Prickad ledtråd i banordning (figur -> hus).
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      for (let s = 1; s <= 3; s++) {
        const t = s / 4
        this._pathHint.circle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 5).fill({ color: COLORS.greenDark, alpha: 0.3 })
      }
    }

    // Fotspår i banordning (index === pathIndex). Vart 3:e fotspår gömmer ett fynd.
    pts.forEach((p, i) => {
      const fp = this._makeFoot(ctx, p.x, p.y, i)
      if (i % 3 === 2) fp.find = randomFrom(FINDS)
      this._field.addChild(fp)
      this._foots.push(fp)
      bounceIn(fp, { delay: i * 0.05 })
    })

    // Tänd-/tryckordning: linjär (låga nivåer), blandad fr.o.m. nivå 3 (renare minne).
    const order = Array.from({ length: steps }, (_, k) => k)
    this._sequence = this._level >= 3 ? shuffle(order) : order

    // Figur (slumpad) vid start, hus vid mål.
    this._paintFigure(Math.floor(Math.random() * 4))
    gsap.killTweensOf(this._rabbit)
    gsap.killTweensOf(this._rabbit.scale)
    this._rabbit.scale.set(1)
    this._rabbit.rotation = 0
    this._rabbit.visible = true
    this._rabbit.position.set(START.x, START.y)

    // Spela demon när fotspåren studsat in.
    this._demoLead = gsap.delayedCall(0.5, () => {
      if (this._alive) this._playDemo(ctx)
    })
  },

  // Banpunkter: jämnt fördelade i x (280→1010), mjuk våg i y, klampade i lekområdet.
  // x-spacingen ger ≥120px centeravstånd ända upp till 7 steg (träffytor överlappar ej).
  _genPath(steps) {
    const x0 = 280
    const x1 = 1010
    const midY = 410
    const amp = 95 + Math.random() * 45
    const phase = Math.random() * Math.PI * 2
    const freq = 0.85 + Math.random() * 0.7
    const pts = []
    for (let i = 0; i < steps; i++) {
      const t = steps === 1 ? 0 : i / (steps - 1)
      const x = x0 + (x1 - x0) * t
      let y = midY + Math.sin(phase + i * freq) * amp
      y = Math.max(220, Math.min(560, y))
      if (x < 340) y = Math.min(y, 460) // håll vänsterkanten fri från "Visa igen"-knappen
      pts.push({ x, y })
    }
    return pts
  },

  // Fyra ritade djur med KROPP: kanin, hund, katt, räv. Låg tidigare som
  // 🐰/🐶/🐱/🦊 — emoji-huvuden utan kropp som svävade över ängen.
  _paintFigure(idx) {
    const r = this._rabbit
    if (!r || r.destroyed) return
    for (const ch of r.removeChildren()) ch.destroy({ children: true })
    const kind = ['kanin', 'hund', 'katt', 'rav'][idx % 4]
    const fur = { kanin: 0xf2f2f4, hund: 0xc98a4b, katt: 0x9aa4b0, rav: 0xef8a3d }[kind]
    const dark = { kanin: 0xd6d6dc, hund: 0x9a5c33, katt: 0x74808e, rav: 0xc4661f }[kind]
    const g = new Graphics()
    g.ellipse(0, 34, 26, 8).fill({ color: 0x000000, alpha: 0.15 }) // skugga
    g.moveTo(20, 16).quadraticCurveTo(42, 8, 34, -12).stroke({ width: kind === 'rav' ? 10 : 7, color: fur, cap: 'round' }) // svans
    g.ellipse(0, 10, 22, 24).fill(fur).stroke({ width: 3, color: dark }) // kropp
    g.ellipse(0, 16, 13, 15).fill({ color: 0xffffff, alpha: 0.55 }) // mage
    g.roundRect(-15, 26, 11, 10, 5).fill(fur).stroke({ width: 2.5, color: dark }) // tassar
    g.roundRect(4, 26, 11, 10, 5).fill(fur).stroke({ width: 2.5, color: dark })
    // Öron per art.
    if (kind === 'kanin') {
      g.ellipse(-9, -34, 7, 20).fill(fur).stroke({ width: 3, color: dark })
      g.ellipse(9, -34, 7, 20).fill(fur).stroke({ width: 3, color: dark })
      g.ellipse(-9, -34, 3.5, 13).fill(0xffc0cb)
      g.ellipse(9, -34, 3.5, 13).fill(0xffc0cb)
    } else if (kind === 'hund') {
      g.ellipse(-17, -14, 8, 15).fill(dark)
      g.ellipse(17, -14, 8, 15).fill(dark)
    } else {
      g.moveTo(-19, -26).lineTo(-13, -44).lineTo(-4, -28).closePath().fill(fur).stroke({ width: 2.5, color: dark })
      g.moveTo(19, -26).lineTo(13, -44).lineTo(4, -28).closePath().fill(fur).stroke({ width: 2.5, color: dark })
    }
    g.circle(0, -20, 20).fill(fur).stroke({ width: 3, color: dark }) // huvud
    g.circle(-7, -23, 4).fill(0x2b2b2b)
    g.circle(7, -23, 4).fill(0x2b2b2b)
    g.circle(-5.5, -24.5, 1.6).fill(0xffffff)
    g.circle(8.5, -24.5, 1.6).fill(0xffffff)
    g.moveTo(-3, -14).lineTo(0, -11).lineTo(3, -14).closePath().fill(0xff9d9d) // nos
    g.arc(-4, -10, 4, 0, Math.PI).stroke({ width: 2, color: dark })
    g.arc(4, -10, 4, 0, Math.PI).stroke({ width: 2, color: dark })
    r.addChild(g)
  },

  // Ett fotspår: rund platta (Graphics) + 👣 (Text) + generös träffyta. Aktiveras
  // (eventMode='static') först när demofasen är klar.
  _makeFoot(ctx, x, y, pathIndex) {
    const fp = new Container()
    fp.position.set(x, y)
    const plate = new Graphics()
    plate.eventMode = 'none'
    fp.plate = plate
    fp.addChild(plate)
    // P0 ASSETS: RITADE tass-avtryck (var en 👣-emoji ovanpå plattan). Det är
    // ett djur som gått här — alltså tassar, inte människofötter.
    const emoji = new Graphics()
    for (const [px, py, rot] of [[-11, 4, -0.2], [11, -6, -0.2]]) {
      const paw = new Graphics()
      paw.ellipse(0, 4, 9, 11).fill(0x6b4fc4)
      for (const [tx, ty] of [[-8, -8], [-2.5, -12], [3.5, -12], [9, -7]]) paw.circle(tx, ty, 3.4).fill(0x6b4fc4)
      paw.position.set(px, py)
      paw.rotation = rot
      emoji.addChild(paw)
    }
    emoji.eventMode = 'none'
    fp.addChild(emoji)
    this._paintFoot(fp, 'base')
    fp.hitArea = new Circle(0, 0, HIT_R)
    fp.eventMode = 'none'
    fp.cursor = 'pointer'
    fp.pathIndex = pathIndex
    fp.lit = false
    fp.find = null // ev. gömt fynd (sätts i _build)
    fp.on('pointertap', () => this._onTap(ctx, fp))
    return fp
  },

  // Plattans tre lägen: base (otänd), demo (tänd ledtråd), done (rätt tryckt).
  _paintFoot(fp, state) {
    const g = fp.plate
    if (!g || g.destroyed) return
    // Plattan är ett SKEN runt tassavtrycket, inte en bricka det ligger i:
    // svag fyllning + ring. En opak vit disc gjorde spåret till en ikon i en ruta.
    g.clear().circle(0, 0, PLATE_R)
    if (state === 'demo') g.fill({ color: COLORS.yellow, alpha: 0.55 }).stroke({ width: 5, color: COLORS.orange })
    else if (state === 'done') g.fill({ color: COLORS.green, alpha: 0.35 }).stroke({ width: 5, color: COLORS.greenDark })
    else g.fill({ color: COLORS.cream, alpha: 0.3 }).stroke({ width: 4, color: COLORS.green, alpha: 0.7 })
  },

  // ---- Demofas: tänd fotspåren ett i taget i sekvensordning ----------------

  _playDemo(ctx) {
    if (!this._alive || !this._foots.length) return
    this._demoTl?.kill()
    this._demoTl = null
    this._clearHint()
    this._busy = true
    this._expected = 0
    this._wrongStreak = 0
    this._idle = 0

    // Figuren tillbaka till start (man får titta på vägen på nytt).
    this._eagerTween?.kill()
    this._eagerTween = null
    this._hopTl?.kill()
    gsap.killTweensOf(this._rabbit)
    gsap.killTweensOf(this._rabbit.scale)
    this._rabbit.scale.set(1)
    this._rabbit.rotation = 0
    this._rabbit.visible = true
    this._rabbit.position.set(START.x, START.y)

    // Alla fotspår till base + tryck-låsta under demon.
    for (const fp of this._foots) {
      if (!fp || fp.destroyed) continue
      gsap.killTweensOf(fp)
      gsap.killTweensOf(fp.scale)
      fp.scale.set(1)
      fp.rotation = 0
      fp.lit = false
      fp.eventMode = 'none'
      this._paintFoot(fp, 'base')
    }

    const stepDur = Math.max(0.45, 0.8 - this._level * 0.07) // ≥450ms/steg, lite snabbare per nivå
    const tl = gsap.timeline({
      onComplete: () => {
        if (!this._alive) return
        for (const fp of this._foots) {
          if (!fp || fp.destroyed) continue
          this._paintFoot(fp, 'base')
          fp.eventMode = 'static'
          fp.cursor = 'pointer'
        }
        this._busy = false
        this._expected = 0
        this._wrongStreak = 0
        this._idle = 0
        this._lookEager() // figuren spanar mot första fotspåret
      },
    })
    this._demoTl = tl

    this._sequence.forEach((pathIndex, k) => {
      const fp = this._foots[pathIndex]
      const tOn = k * stepDur
      tl.add(() => {
        if (!this._alive || !fp || fp.destroyed) return
        this._paintFoot(fp, 'demo')
        pop(fp)
        // Stigande pentatonisk ton per sekvenssteg → demon spelar en liten melodi.
        ctx.services.audio.tone({ freq: toneFreq(k), dur: 0.24, type: 'triangle', vol: 0.3 })
      }, tOn)
      tl.add(() => {
        if (!this._alive || !fp || fp.destroyed) return
        this._paintFoot(fp, 'base')
      }, tOn + stepDur * 0.6)
    })
    // Liten svans så onComplete inte triggar mitt i sista släckningen.
    tl.add(() => {}, this._sequence.length * stepDur)
  },

  // ---- Härmfas: tap på ett fotspår ----------------------------------------

  _onTap(ctx, fp) {
    if (!this._alive) return
    // Under demonstrationen/firandet är spelet upptaget — men tystnad är ett
    // P0-brott, inte en paus. Dämpat kvitto på fotspåret barnet trycker på.
    if (this._busy) return kvittera(ctx.fxLayer, fp?.x, fp?.y, ctx.services.audio)
    this._idle = 0
    this._clearHint()

    const expectedPath = this._sequence[this._expected]
    if (fp.pathIndex === expectedPath && !fp.lit) {
      // RÄTT nästa fotspår: tänd grönt, gnistra, figuren hoppar fram.
      fp.lit = true
      this._wrongStreak = 0
      this._paintFoot(fp, 'done')
      pop(fp)
      sparkle(ctx.fxLayer, fp.x, fp.y)
      // Samma stigande ton som i demon (+ oktav-glitter) → härmningen blir melodisk.
      const k = this._expected
      ctx.services.audio.tone({ freq: toneFreq(k), dur: 0.26, type: 'triangle', vol: 0.32 })
      ctx.services.audio.tone({ freq: toneFreq(k) * 2, dur: 0.16, type: 'sine', vol: 0.12, delay: 0.05 })
      if (!this._saidJa) {
        this._saidJa = true
        ctx.services.voice.say('Ja!') // sparsamt beröm, en gång per runda
      }
      this._collectFind(ctx, fp) // ev. gömt fynd flyger till samlingen
      this._expected++
      if (this._expected >= this._sequence.length) this._win(ctx, fp)
      else this._hopRabbit(ctx, fp)
    } else {
      // FEL fotspår eller redan tänt: mjukt vingel, ALDRIG nollställning/bestraffning.
      ctx.services.audio.sfx('soft')
      wiggle(fp)
      this._wrongStreak++
      if (this._wrongStreak >= 2) {
        this._wrongStreak = 0
        ctx.services.voice.say('Titta noga var fötterna lyser. Tryck på den som lyser nu.')
        this._pulseNext()
      }
    }
  },

  // Figuren hoppar fram till ett fotspår (litet skutt: y dippar upp och ned) med
  // ett glatt "!" och en liten studs — en levande kompis, inte en bricka som glider.
  _hopRabbit(ctx, fp) {
    if (!this._rabbit || this._rabbit.destroyed) return
    this._eagerTween?.kill()
    this._eagerTween = null
    this._hopTl?.kill()
    gsap.killTweensOf(this._rabbit)
    gsap.killTweensOf(this._rabbit.scale)
    this._rabbit.rotation = 0
    floatText(ctx.fxLayer, fp.x, fp.y + RAB_DY - 60, '!', { fontSize: 52, rise: 60 })
    const tx = fp.x
    const ty = fp.y + RAB_DY
    const tl = gsap.timeline({
      onComplete: () => {
        if (this._alive) this._lookEager() // spanar mot nästa fotspår
      },
    })
    tl.to(this._rabbit, { x: tx, duration: 0.34, ease: 'power1.inOut' }, 0)
    tl.to(this._rabbit, { y: ty - 55, duration: 0.17, ease: 'power2.out' }, 0)
    tl.to(this._rabbit, { y: ty, duration: 0.17, ease: 'power2.in' }, 0.17)
    // Glad studs i landningen (squash & stretch).
    tl.to(this._rabbit.scale, { x: 1.16, y: 0.86, duration: 0.12, ease: 'power2.out' }, 0.24)
    tl.to(this._rabbit.scale, { x: 1, y: 1, duration: 0.18, ease: 'back.out(2)' }, 0.36)
    this._hopTl = tl
  },

  // Figuren spanar ivrigt mot nästa förväntade fotspår (mjuk lutning fram och åter).
  _lookEager() {
    this._eagerTween?.kill()
    this._eagerTween = null
    if (!this._alive || this._busy || this._winning) return
    if (!this._rabbit || this._rabbit.destroyed) return
    if (this._expected >= this._sequence.length) return
    const fp = this._foots[this._sequence[this._expected]]
    if (!fp || fp.destroyed) return
    const dir = fp.x >= this._rabbit.x ? 1 : -1
    gsap.killTweensOf(this._rabbit)
    this._rabbit.rotation = 0
    this._eagerTween = gsap.to(this._rabbit, {
      rotation: dir * 0.11,
      duration: 0.75,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    })
  },

  // Plocka upp ett ev. gömt fynd: det dyker upp vid fotspåret och flyger till
  // samlingen uppe till höger (exit-säkert: proxy-tween + destroyed-guard).
  _collectFind(ctx, fp) {
    if (!fp.find) return
    const emoji = fp.find
    fp.find = null
    const item = makeFind(emoji)
    item.position.set(fp.x, fp.y + RAB_DY)
    item.scale.set(0.5)
    this._finds.addChild(item)
    const slot = this._finds.children.length - 1
    const tx = 1112 - slot * 46
    const ty = 178
    const p = { x: item.x, y: item.y, s: 0.5 }
    const tw = gsap.to(p, {
      x: tx,
      y: ty,
      s: 0.82,
      duration: 0.7,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (!item.destroyed) {
          item.position.set(p.x, p.y)
          item.scale.set(p.s)
        }
      },
      onComplete: () => {
        if (!item.destroyed) {
          item.scale.set(0.82)
          pop(item)
        }
      },
    })
    this._findTweens.push(tw)
    ctx.services.audio.sfx('reveal')
    floatText(ctx.fxLayer, fp.x, fp.y - 44, 'En till!', { fontSize: 34 })
  },

  // Hela sekvensen klar: figuren hoppar in i huset, firande, ny (längre) runda.
  _win(ctx, lastFp) {
    this._busy = true
    this._winning = true
    this._idle = 0
    this._clearHint()
    this._eagerTween?.kill()
    this._eagerTween = null
    this._hopTl?.kill()
    gsap.killTweensOf(this._rabbit)
    gsap.killTweensOf(this._rabbit.scale)
    this._rabbit.rotation = 0

    const lx = lastFp.x
    const ly = lastFp.y + RAB_DY
    const hx = HOUSE.x
    const hy = HOUSE.y + RAB_DY
    const tl = gsap.timeline()
    this._winTl = tl
    // Hoppa upp på sista fotspåret ...
    tl.to(this._rabbit, { x: lx, duration: 0.3, ease: 'power1.inOut' }, 0)
    tl.to(this._rabbit, { y: ly - 50, duration: 0.15, ease: 'power2.out' }, 0)
    tl.to(this._rabbit, { y: ly, duration: 0.15, ease: 'power2.in' }, 0.15)
    // ... och sedan in i huset (skutt + krymp in genom dörren).
    tl.to(this._rabbit, { x: hx, duration: 0.5, ease: 'power1.inOut' }, 0.42)
    tl.to(this._rabbit, { y: hy - 80, duration: 0.25, ease: 'power2.out' }, 0.42)
    tl.to(this._rabbit, { y: hy, duration: 0.25, ease: 'power2.in' }, 0.67)
    tl.to(this._rabbit.scale, { x: 0.12, y: 0.12, duration: 0.28, ease: 'power2.in' }, 0.92)
    tl.add(() => {
      if (!this._alive || this._rabbit.destroyed) return
      this._rabbit.visible = false
      if (!this._house.destroyed) pop(this._house)
      puff(ctx.fxLayer, HOUSE.x, HOUSE.y - 16, { color: COLORS.cream })
    }, 1.2)

    // Delat firande (celebrate-ljud + konfetti + stjärna + klistermärke) + tema-röst.
    ctx.progress.complete()
    // Egna hel-repliker, inte 'Hurra! ' + PRAISE: en konkatenerad sträng kan
    // check.mjs inte hitta och /rost kan därför aldrig klippa den (POLERINGSRUNDA).
    ctx.services.voice.say(randomFrom(HOME_PRAISE))
    this._level = clampLevel(this._level + 1)
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)

    this._nextCall = gsap.delayedCall(1.6, () => {
      if (this._alive) this._build(ctx)
    })
  },

  // Mjuk puls på nästa förväntade fotspår (vänlig ledtråd, avslöjar inte för hårt).
  _pulseNext() {
    this._clearHint()
    if (this._expected >= this._sequence.length) return
    const fp = this._foots[this._sequence[this._expected]]
    if (!fp || fp.destroyed) return
    this._hintFoot = fp
    gsap.killTweensOf(fp.scale)
    fp.scale.set(1)
    this._hintTween = gsap.to(fp.scale, {
      x: 1.2,
      y: 1.2,
      duration: 0.45,
      yoyo: true,
      repeat: 3,
      ease: 'sine.inOut',
      onComplete: () => {
        if (!fp.destroyed) fp.scale.set(1)
      },
    })
  },

  _clearHint() {
    this._hintTween?.kill()
    this._hintTween = null
    if (this._hintFoot && !this._hintFoot.destroyed) {
      gsap.killTweensOf(this._hintFoot.scale)
      this._hintFoot.scale.set(1)
    }
    this._hintFoot = null
  },

  // Idle ~6s utan tap (under härmfasen): upprepa röst + pulsa nästa fotspår.
  _update(ctx, ticker) {
    if (!this._alive || this._busy) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle >= IDLE_DELAY) {
      this._idle = 0
      ctx.services.voice.say('Tryck på fötterna i samma ordning som de lyste.')
      this._pulseNext()
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    this._demoLead?.kill?.()
    this._demoTl?.kill()
    this._winTl?.kill()
    this._hopTl?.kill()
    this._nextCall?.kill?.()
    this._hintTween?.kill()
    this._eagerTween?.kill()
    for (const t of this._findTweens || []) t?.kill?.()
    if (this._rabbit && !this._rabbit.destroyed) {
      gsap.killTweensOf(this._rabbit)
      gsap.killTweensOf(this._rabbit.scale)
    }
    if (this._house && !this._house.destroyed) {
      gsap.killTweensOf(this._house)
      gsap.killTweensOf(this._house.scale)
    }
    for (const fp of this._foots) {
      if (fp && !fp.destroyed) {
        gsap.killTweensOf(fp)
        gsap.killTweensOf(fp.scale)
      }
    }
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel?.()
    this._root?.destroy({ children: true })
  },
}
