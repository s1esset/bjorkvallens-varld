// Peka på Kroppen — lugn lärlek (2–4 år). En glad barnfigur står mitt på
// skärmen; rösten ber barnet peka på en kroppsdel ("Var är näsan?") och rätt
// del lyser upp, studsar och får sitt namn uppläst. Fel tryck ger bara en
// vänlig vingel + mjukt ljud och frågan upprepas — aldrig en bestraffning.
// Efter ett antal hittade delar firas rundan (delat firande + stjärna +
// klistermärke) och en ny runda börjar direkt. Allt ritas programmatiskt
// (Pixi Graphics + emoji) — inga externa filer.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { pop, wiggle, sparkle, floatText } from '../../lib/feedback.js'
import { COLORS, PLAYFUL, FONT } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

const CX = 640 // figurens mitt-x (designkoordinater)
const FIG_Y = 400 // figurens mitt-y

const SKIN = 0xffd9a8 // varm hudton
const HAIR = 0x8a5a3b // hår
const MOUTH = 0x5a2d22 // mörk mun/ögonkontur

// Kroppsdelar: svensk bestämd form (till frågan), namn (till beröm) och en
// emoji som visas i prompt-bubblan som visuellt stöd. key:n är ASCII.
const PARTS = {
  huvud: { def: 'huvudet', namn: 'Huvud', emoji: '🧒' },
  mage: { def: 'magen', namn: 'Mage', emoji: '🫄' },
  fot: { def: 'foten', namn: 'Fot', emoji: '🦶' },
  hand: { def: 'handen', namn: 'Hand', emoji: '✋' },
  nasa: { def: 'näsan', namn: 'Näsa', emoji: '👃' },
  mun: { def: 'munnen', namn: 'Mun', emoji: '👄' },
  ora: { def: 'örat', namn: 'Öra', emoji: '👂' },
  oga: { def: 'ögat', namn: 'Öga', emoji: '👁️' },
  arm: { def: 'armen', namn: 'Arm', emoji: '💪' },
}

// Osynlig svårighetstrappa: större och tydligare delar först, fler vid högre nivå.
const LEVEL_POOL = {
  1: ['mage', 'huvud', 'fot', 'hand'],
  2: ['mage', 'huvud', 'fot', 'hand', 'nasa', 'mun', 'ora'],
  3: ['mage', 'huvud', 'fot', 'hand', 'nasa', 'mun', 'ora', 'oga', 'arm'],
}
const clampLevel = (n) => Math.min(3, Math.max(1, n || 1))
const poolFor = (level) => LEVEL_POOL[clampLevel(level)]
const goalFor = (level) => (level >= 3 ? 5 : level === 2 ? 4 : 3)

// Frågeformer (alla med bestämd form) och beröm-fraser.
const QFORMS = ['Kan du peka på {d}?', 'Var är {d}?', 'Hitta {d}!']
const praiseFor = (part) => randomFrom([`${part.namn}! Bra!`, `Ja, det är ${part.def}!`, 'Duktig!', 'Bravo!'])

// Mörkare/ljusare variant av en färg (kontur respektive markering).
function shade(hex, amt) {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  const f = amt < 0 ? (v) => Math.round(v + (255 - v) * -amt) : (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (f(r) << 16) | (f(g) << 8) | f(b)
}

export default {
  id: 'peka-pa-kroppen',
  titleSv: 'Peka på Kroppen',
  icon: '👦',
  category: 'pedagogiskt',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'peka-pa-kroppen',
  voiceIntro: 'Kan du peka på näsan?',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._resolving = false
    this._found = 0
    this._lastKey = null
    this._queue = []
    this._rounds = ctx.progress.get().custom?.rundor || 0

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._build(ctx)
    this._startRound(ctx, false) // sätter första frågan tyst; mount talar

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this._currentPrompt)
  },

  _build(ctx) {
    // Bakgrund: fångar "tomt tryck" (mjuk respons, frågan står kvar).
    const bg = new Graphics().rect(0, 0, ctx.width, ctx.height).fill(COLORS.bg)
    bg.eventMode = 'static'
    bg.on('pointertap', () => this._emptyTap(ctx))
    this._root.addChild(bg)

    // Mjuk pastellpanel (dekorativ — släpper igenom tryck till bakgrunden).
    const panel = new Graphics().roundRect(40, 96, 1200, 600, 48).fill({ color: COLORS.cream, alpha: 0.9 })
    panel.eventMode = 'none'
    this._root.addChild(panel)

    // Figur-rot: centrerad, hela containern vinglar lekfullt vid tomt tryck.
    const fig = new Container()
    fig.position.set(CX, FIG_Y)
    fig.eventMode = 'passive' // egna zoner är interaktiva; missar faller till bg
    this._figure = fig
    this._root.addChild(fig)

    this._parts = []
    const part = (x, y) => {
      const g = new Graphics()
      g.position.set(x, y)
      g.eventMode = 'none'
      this._parts.push(g)
      return g
    }

    // Ben + fötter (bakom kroppen).
    this._legL = part(-48, 178)
    this._legR = part(48, 178)
    this._footL = part(-48, 268)
    this._footR = part(48, 268)
    fig.addChild(this._legL, this._legR, this._footL, this._footR)

    // Armar + händer (bakom kroppen så kroppen täcker inneränden).
    this._armL = part(-128, 10)
    this._armR = part(128, 10)
    this._handL = part(-128, 108)
    this._handR = part(128, 108)
    fig.addChild(this._armL, this._armR, this._handL, this._handR)

    // Kropp + mage-markering.
    this._torso = part(0, 30)
    this._belly = part(0, 30)
    fig.addChild(this._torso, this._belly)

    // Huvud-container (poppar som en enhet vid "huvud").
    const head = new Container()
    head.position.set(0, -196)
    head.eventMode = 'none'
    this._head = head
    this._headG = part(0, 0)
    this._hair = part(0, 0)
    this._earL = part(-104, 4)
    this._earR = part(104, 4)
    this._eyeL = part(-40, -26)
    this._eyeR = part(40, -26)
    this._nose = part(0, 10)
    this._mouth = part(0, 62)
    head.addChild(this._headG, this._hair, this._earL, this._earR, this._eyeL, this._eyeR, this._nose, this._mouth)
    fig.addChild(head)

    this._shirt = randomFrom(PLAYFUL)
    this._paint()

    // Interaktiva träffzoner (osynliga halo:n, generösa cirklar ≥96px Ø).
    // Ordning = z-ordning: små ansiktsdelar läggs EFTER huvudet så de "äger"
    // sina punkter; varje dels mitt löser därför alltid ut rätt del.
    const Z = [
      ['huvud', 0, -196, 104, head],
      ['mage', 0, 30, 82, this._belly],
      ['arm', -128, 10, 58, this._armL],
      ['arm', 128, 10, 58, this._armR],
      ['hand', -128, 108, 52, this._handL],
      ['hand', 128, 108, 52, this._handR],
      ['fot', -48, 268, 56, this._footL],
      ['fot', 48, 268, 56, this._footR],
      ['ora', -104, -192, 50, this._earL],
      ['ora', 104, -192, 50, this._earR],
      ['nasa', 0, -186, 50, this._nose],
      ['oga', -40, -222, 48, this._eyeL],
      ['oga', 40, -222, 48, this._eyeR],
      ['mun', 0, -134, 50, this._mouth],
    ]
    this._zones = []
    for (const [key, zx, zy, r, target] of Z) {
      const z = new Container()
      z.position.set(zx, zy)
      z.hitArea = new Circle(0, 0, r)
      z.eventMode = 'static'
      z.cursor = 'pointer'
      z.key = key
      z._target = target
      // Osynligt halo gör att även små delar (näsa/öga) har stor träffyta.
      const halo = new Graphics().circle(0, 0, r).fill({ color: COLORS.white, alpha: 0.001 })
      halo.eventMode = 'none'
      z.addChild(halo)
      z.on('pointertap', () => this._onPart(ctx, z))
      fig.addChild(z)
      this._zones.push(z)
    }

    // Prompt-bubbla: visar den efterfrågade delens emoji (visuellt stöd).
    const bubble = new Container()
    bubble.position.set(1060, 214)
    bubble.eventMode = 'none'
    const card = new Graphics().roundRect(-74, -74, 148, 148, 36).fill(COLORS.cream).stroke({ width: 6, color: COLORS.teal })
    this._bubbleEmoji = new Text({ text: '❓', style: { fontFamily: FONT.body, fontSize: 86, align: 'center' } })
    this._bubbleEmoji.anchor.set(0.5)
    bubble.addChild(card, this._bubbleEmoji)
    this._bubble = bubble
    this._root.addChild(bubble)

    // Förlopps-prickar (hittade delar i rundan — fylls, sjunker aldrig).
    this._dotsLayer = new Container()
    this._dotsLayer.eventMode = 'none'
    this._root.addChild(this._dotsLayer)
    this._dots = []
  },

  // Färglägg figuren utifrån this._shirt (kläder) + fast hudton.
  _paint() {
    const skin = SKIN
    const shirt = this._shirt
    const sStroke = shade(skin, 0.22)
    const cStroke = shade(shirt, 0.22)
    // Kläder: kropp, armar, ben.
    this._torso.clear().roundRect(-92, -110, 184, 220, 64).fill(shirt).stroke({ width: 8, color: cStroke })
    for (const a of [this._armL, this._armR]) {
      a.clear().roundRect(-22, -80, 44, 160, 22).fill(shirt).stroke({ width: 8, color: cStroke })
    }
    for (const l of [this._legL, this._legR]) {
      l.clear().roundRect(-28, -68, 56, 150, 28).fill(shirt).stroke({ width: 8, color: cStroke })
    }
    this._belly.clear().circle(0, 0, 70).fill({ color: shade(shirt, -0.5), alpha: 0.85 })
    // Hud: huvud, öron, händer, fötter, näsa.
    this._headG.clear().circle(0, 0, 104).fill(skin).stroke({ width: 8, color: sStroke })
    for (const e of [this._earL, this._earR]) {
      e.clear().circle(0, 0, 26).fill(skin).stroke({ width: 7, color: sStroke })
    }
    for (const h of [this._handL, this._handR]) {
      h.clear().circle(0, 0, 34).fill(skin).stroke({ width: 8, color: sStroke })
    }
    for (const f of [this._footL, this._footR]) {
      f.clear().ellipse(0, 0, 48, 30).fill(skin).stroke({ width: 8, color: sStroke })
    }
    this._nose.clear().circle(0, 0, 14).fill(shade(skin, 0.14)).stroke({ width: 3, color: sStroke })
    // Ansikte.
    for (const eye of [this._eyeL, this._eyeR]) {
      eye.clear().circle(0, 0, 17).fill(COLORS.white).stroke({ width: 3, color: MOUTH }).circle(0, 5, 8).fill(0x33271f)
    }
    this._mouth.clear().arc(0, 0, 34, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 8, color: MOUTH, cap: 'round' })
    const hair = this._hair.clear()
    for (const [hx, hy] of [[-52, -78], [-18, -94], [18, -94], [52, -78]]) hair.circle(hx, hy, 26)
    hair.fill(HAIR)
  },

  // Ny runda: nollställ räknare, läs nivå, bygg förloppsprickar, ställ fråga.
  _startRound(ctx, speak = true) {
    if (!this._alive) return
    this._resolving = false
    this._found = 0
    this._level = clampLevel(ctx.progress.get().highestLevel)
    this._goal = goalFor(this._level)
    this._buildDots(ctx)
    this._nextQuestion(ctx, speak)
  },

  // Välj nästa del (utan direkt upprepning), bygg svensk fras, uppdatera bubbla.
  _nextQuestion(ctx, speak = true) {
    if (!this._alive) return
    this._resolving = false
    this._idle = 0
    if (!this._queue.length) this._queue = shuffle(poolFor(this._level))
    let key = this._queue.shift()
    if (key === this._lastKey && this._queue.length) {
      this._queue.push(key)
      key = this._queue.shift()
    }
    this._lastKey = key
    this._target = key
    this._targetZones = this._zones.filter((z) => z.key === key)
    const part = PARTS[key]
    this._currentPrompt = randomFrom(QFORMS).replace('{d}', part.def)
    this._bubbleEmoji.text = part.emoji
    pop(this._bubble)
    if (speak) ctx.services.voice.say(this._currentPrompt)
  },

  // Ett tryck på en kroppsdel: omedelbar (<100ms) respons.
  _onPart(ctx, zone) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    if (zone.key === this._target) this._correct(ctx, zone)
    else this._wrong(ctx, zone)
  },

  // Rätt del: puls + lysande ring + gnistror + beröm. Räkna upp och gå vidare.
  _correct(ctx, zone) {
    this._resolving = true
    this._idle = 0
    ctx.services.audio.sfx(Math.random() < 0.3 ? 'pling' : 'correct')

    pop(zone._target)
    this._glowRing(ctx, zone)
    const fp = ctx.fxLayer.toLocal(zone.getGlobalPosition())
    sparkle(ctx.fxLayer, fp.x, fp.y, { count: 8 })
    floatText(ctx.fxLayer, fp.x, fp.y - 24, '🌟', { fontSize: 56 })
    ctx.services.voice.say(praiseFor(PARTS[zone.key]))

    this._found++
    this._fillDots(this._found)
    if (this._dots[this._found - 1]) pop(this._dots[this._found - 1])

    this._resolveTimer?.kill()
    this._resolveTimer = gsap.delayedCall(1.1, () => {
      if (!this._alive) return
      if (this._found >= this._goal) this._completeRound(ctx)
      else this._nextQuestion(ctx, true)
    })
  },

  // Annan del: vänlig vingel + mjukt ljud, sedan upprepas frågan. Aldrig "fel".
  _wrong(ctx, zone) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    wiggle(zone._target)
    this._reaskTimer?.kill()
    this._reaskTimer = gsap.delayedCall(0.8, () => {
      if (this._alive && !this._resolving) ctx.services.voice.say(this._currentPrompt)
    })
  },

  // Runda klar: delat firande (ljud + beröm + konfetti + stjärna + klistermärke),
  // höj nivån mjukt var 2:a runda (tak 3), starta sedan ny runda. Oändlig lek.
  _completeRound(ctx) {
    this._resolving = true
    this._idle = 0
    ctx.progress.complete()
    this._rounds += 1
    ctx.progress.setCustom('rundor', this._rounds)
    const want = clampLevel(1 + Math.floor(this._rounds / 2))
    if (want > (ctx.progress.get().highestLevel || 1)) ctx.progress.setLevel(want)
    pop(this._figure)
    this._roundTimer?.kill()
    this._roundTimer = gsap.delayedCall(1.5, () => this._startRound(ctx, true))
  },

  // Lysande ring runt en träffad del (exit-säker: tweenar ett JS-objekt och rör
  // Pixi-objektet bara om det lever).
  _glowRing(ctx, zone) {
    const fp = ctx.fxLayer.toLocal(zone.getGlobalPosition())
    const ring = new Graphics().circle(0, 0, 46).stroke({ width: 8, color: COLORS.yellow })
    ring.position.set(fp.x, fp.y)
    ring.eventMode = 'none'
    ctx.fxLayer.addChild(ring)
    const st = { s: 0.6, a: 0.95 }
    ring.scale.set(st.s)
    ring.alpha = st.a
    const tw = gsap.to(st, {
      s: 1.9,
      a: 0,
      duration: 0.6,
      ease: 'power2.out',
      onUpdate: () => {
        if (ring.destroyed) {
          tw.kill()
          return
        }
        ring.scale.set(st.s)
        ring.alpha = st.a
      },
      onComplete: () => {
        if (!ring.destroyed) ring.destroy()
      },
    })
  },

  // Förloppsprickar: en per del att hitta i rundan.
  _buildDots(ctx) {
    for (const d of this._dots) {
      gsap.killTweensOf(d.scale)
      d.destroy()
    }
    this._dots = []
    const gap = 54
    const startX = ctx.width / 2 - ((this._goal - 1) * gap) / 2
    for (let i = 0; i < this._goal; i++) {
      const d = new Graphics().circle(0, 0, 13).fill({ color: COLORS.inkSoft, alpha: 0.22 })
      d.position.set(startX + i * gap, 668)
      d.eventMode = 'none'
      this._dotsLayer.addChild(d)
      this._dots.push(d)
    }
  },

  _fillDots(n) {
    for (let i = 0; i < this._dots.length; i++) {
      const d = this._dots[i].clear().circle(0, 0, 13)
      if (i < n) d.fill(PLAYFUL[i % PLAYFUL.length])
      else d.fill({ color: COLORS.inkSoft, alpha: 0.22 })
    }
  },

  // Tomt tryck (bredvid delarna): lekfull vingel + mjukt ljud. Aldrig "fel".
  _emptyTap(ctx) {
    if (!this._alive || this._resolving) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    wiggle(this._figure)
  },

  // Idle-recue: efter ~6s tystnad upprepar vi frågan och låter måldelen pulsa.
  _update(ctx, ticker) {
    if (!this._alive || this._resolving || !this._target) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6) {
      this._idle = 0
      ctx.services.voice.say(this._currentPrompt)
      pop(this._bubble)
      const z = this._targetZones?.[0]
      if (z?._target) pop(z._target)
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._resolveTimer?.kill()
    this._reaskTimer?.kill()
    this._roundTimer?.kill()
    ctx.services.voice.cancel()
    for (const o of [this._figure, this._head, this._bubble, ...(this._parts || []), ...(this._dots || [])]) {
      if (!o) continue
      gsap.killTweensOf(o)
      gsap.killTweensOf(o.scale)
    }
    this._zones?.forEach((z) => gsap.killTweensOf(z))
    gsap.killTweensOf(this._root)
    this._root?.destroy({ children: true })
  },
}
