// Följ Spåret — mjukt sekvensminne (3–5 år). Lysande fotspår (👣) ligger längs en
// slingrande äng från en liten figur (🐰/🐶/🐱/🦊) till dess hus (🏠). Spelet visar
// först sekvensen genom att tända fotspåren ett i taget (demofas), sedan trycker
// barnet på dem i samma ordning (härmfas). Rätt nästa fotspår -> det lyser, ett pling
// och figuren hoppar fram dit. Fel/redan tänt -> mjukt vingel + 'soft', ALDRIG en
// nollställning eller bestraffning. Hela spåret klart = figuren kommer hem, firande +
// ctx.progress.complete(), sedan byggs en ny (längre) runda. Oändlig lek, ingen poäng,
// ingen timer, inga felsteg. Allt ritas programmatiskt (Pixi Graphics + emoji).
// All async är skyddad med this._alive (exit-säkert).
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { bounceIn, pop, wiggle, sparkle, puff } from '../../lib/feedback.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { Button } from '../../lib/Button.js'

// Layout (designkoordinater 1280×720).
const START = { x: 140, y: 410 } // figurens startpunkt (vänster)
const HOUSE = { x: 1150, y: 410 } // målet/huset (höger)
const PLATE_R = 58 // fotspårsplattans radie (Ø116 ≥ 96px)
const HIT_R = 72 // osynlig träffradie (extra marginal)
const FOOT_FS = 64 // 👣-storlek
const RAB_DY = -14 // figuren står strax ovanför fotspåret
const IDLE_DELAY = 6 // s utan tap innan röst-recue + hint-puls

const FIGURES = ['🐰', '🐶', '🐱', '🦊']

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

    // Hus (mål) + figur (start) — persistenta, flyttas/byts per runda.
    this._house = new Text({ text: '🏠', style: { fontFamily: FONT.body, fontSize: 96 } })
    this._house.anchor.set(0.5)
    this._house.eventMode = 'none'
    this._house.position.set(HOUSE.x, HOUSE.y)
    this._root.addChild(this._house)

    this._rabbit = new Text({ text: FIGURES[0], style: { fontFamily: FONT.body, fontSize: 86 } })
    this._rabbit.anchor.set(0.5)
    this._rabbit.eventMode = 'none'
    this._rabbit.position.set(START.x, START.y)
    this._root.addChild(this._rabbit)

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

    // Fotspår i banordning (index === pathIndex).
    pts.forEach((p, i) => {
      const fp = this._makeFoot(ctx, p.x, p.y, i)
      this._field.addChild(fp)
      this._foots.push(fp)
      bounceIn(fp, { delay: i * 0.05 })
    })

    // Tänd-/tryckordning: linjär (låga nivåer), blandad fr.o.m. nivå 3 (renare minne).
    const order = Array.from({ length: steps }, (_, k) => k)
    this._sequence = this._level >= 3 ? shuffle(order) : order

    // Figur (slumpad) vid start, hus vid mål.
    this._rabbit.text = randomFrom(FIGURES)
    gsap.killTweensOf(this._rabbit)
    gsap.killTweensOf(this._rabbit.scale)
    this._rabbit.scale.set(1)
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

  // Ett fotspår: rund platta (Graphics) + 👣 (Text) + generös träffyta. Aktiveras
  // (eventMode='static') först när demofasen är klar.
  _makeFoot(ctx, x, y, pathIndex) {
    const fp = new Container()
    fp.position.set(x, y)
    const plate = new Graphics()
    plate.eventMode = 'none'
    fp.plate = plate
    fp.addChild(plate)
    const emoji = new Text({ text: '👣', style: { fontFamily: FONT.body, fontSize: FOOT_FS } })
    emoji.anchor.set(0.5)
    emoji.eventMode = 'none'
    fp.addChild(emoji)
    this._paintFoot(fp, 'base')
    fp.hitArea = new Circle(0, 0, HIT_R)
    fp.eventMode = 'none'
    fp.cursor = 'pointer'
    fp.pathIndex = pathIndex
    fp.lit = false
    fp.on('pointertap', () => this._onTap(ctx, fp))
    return fp
  },

  // Plattans tre lägen: base (otänd), demo (tänd ledtråd), done (rätt tryckt).
  _paintFoot(fp, state) {
    const g = fp.plate
    if (!g || g.destroyed) return
    g.clear().circle(0, 0, PLATE_R)
    if (state === 'demo') g.fill(COLORS.yellow).stroke({ width: 5, color: COLORS.orange })
    else if (state === 'done') g.fill({ color: COLORS.green, alpha: 0.5 }).stroke({ width: 5, color: COLORS.greenDark })
    else g.fill(COLORS.cream).stroke({ width: 5, color: COLORS.green })
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
    this._hopTl?.kill()
    gsap.killTweensOf(this._rabbit)
    gsap.killTweensOf(this._rabbit.scale)
    this._rabbit.scale.set(1)
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
        ctx.services.audio.sfx('pling')
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
    if (!this._alive || this._busy) return
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
      ctx.services.audio.sfx('correct')
      if (!this._saidJa) {
        this._saidJa = true
        ctx.services.voice.say('Ja!') // sparsamt beröm, en gång per runda
      }
      this._expected++
      if (this._expected >= this._sequence.length) this._win(ctx, fp)
      else this._hopRabbit(fp)
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

  // Figuren hoppar fram till ett fotspår (litet skutt: y dippar upp och ned).
  _hopRabbit(fp) {
    if (!this._rabbit || this._rabbit.destroyed) return
    this._hopTl?.kill()
    gsap.killTweensOf(this._rabbit)
    const tx = fp.x
    const ty = fp.y + RAB_DY
    const tl = gsap.timeline()
    tl.to(this._rabbit, { x: tx, duration: 0.34, ease: 'power1.inOut' }, 0)
    tl.to(this._rabbit, { y: ty - 55, duration: 0.17, ease: 'power2.out' }, 0)
    tl.to(this._rabbit, { y: ty, duration: 0.17, ease: 'power2.in' }, 0.17)
    this._hopTl = tl
  },

  // Hela sekvensen klar: figuren hoppar in i huset, firande, ny (längre) runda.
  _win(ctx, lastFp) {
    this._busy = true
    this._winning = true
    this._idle = 0
    this._clearHint()
    this._hopTl?.kill()
    gsap.killTweensOf(this._rabbit)
    gsap.killTweensOf(this._rabbit.scale)

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
    ctx.services.voice.say('Hurra! ' + randomFrom(PRAISE))
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
