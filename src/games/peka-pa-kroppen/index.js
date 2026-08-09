// Peka på Kroppen — lugn lärlek (2–5 år). Zacke, en gosig figur, står på en grön äng;
// rösten ber barnet peka på en kroppsdel ("Var är näsan?") och rätt del lyser
// upp, studsar och får sitt namn uppläst medan Zacke skrattar glatt. Fel tryck
// ger bara en vänlig vingel + mjukt ljud och frågan upprepas — ALDRIG en
// bestraffning. När alla delar i rundan hittats firas det (delat firande +
// stjärna + klistermärke), Zacke BYTER skepnad (barn, nallebjörn, kanin) och en
// ny, lite klurigare runda börjar. Allt ritas programmatiskt (Pixi Graphics +
// emoji) — inga externa tillgångar.
//
// DJUP (anti-upprepning / inte för lätt): ctx.progress.highestLevel styr hur
// många och hur svåra delar som efterfrågas (stora delar först; ansikte, armar,
// ben och knä tillkommer), hur många frågor per runda och tempot. Varje runda
// planeras utan direkta upprepningar och figuren byts ut för variation. NO-FAIL
// genom hela spelet.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { pop, wiggle, sparkle, floatText, ripple, breathe, shake, burst, kvittera } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { COLORS, PLAYFUL, FONT } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

// --- layout (designkoordinater; figur-rummet är centrerat i this._figure) ---
const CX = 640
const FIG_Y = 358 // figurens mitt-y
const HEAD_Y = -150
const HEAD_R = 110
const TORSO_Y = 50
const BELLY_Y = 55
const ARM_X = 112
const ARM_Y = 8
const HAND_Y = 82
const LEG_X = 48
const LEG_Y = 150 // benets mitt
const KNEE_Y = 158
const BEN_HI_Y = 96 // benzonens mitt när knät också efterfrågas (övre låret)
const FOOT_Y = 232

const CHEEK = 0xff8fa3 // rosa kinder
const MOUTH = 0x5a2d22 // mörk mun/kontur
const SKIN_TONES = [0xffd9a8, 0xf4c19a, 0xe8b48c]
const HAIR_COLORS = [0x8a5a3b, 0x3b2a22, 0xd9a441, 0x5a3826]

const MAX_LEVEL = 6
const clampLevel = (n) => Math.min(MAX_LEVEL, Math.max(1, n || 1))
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Kroppsdelar: svensk bestämd form (till frågan), namn (till beröm/float), en
// emoji som visas i prompt-bubblan som visuellt stöd, samt bas (obestämd form) +
// poss (din/ditt) för "peka på DIN …"-frågor. key:n är ASCII.
const PARTS = {
  huvud: { def: 'huvudet', namn: 'Huvud', emoji: '🧒', bas: 'huvud', poss: 'ditt' },
  mage: { def: 'magen', namn: 'Mage', emoji: '🫄', bas: 'mage', poss: 'din' },
  fot: { def: 'foten', namn: 'Fot', emoji: '🦶', bas: 'fot', poss: 'din' },
  hand: { def: 'handen', namn: 'Hand', emoji: '✋', bas: 'hand', poss: 'din' },
  nasa: { def: 'näsan', namn: 'Näsa', emoji: '👃', bas: 'näsa', poss: 'din' },
  mun: { def: 'munnen', namn: 'Mun', emoji: '👄', bas: 'mun', poss: 'din' },
  ora: { def: 'örat', namn: 'Öra', emoji: '👂', bas: 'öra', poss: 'ditt' },
  oga: { def: 'ögat', namn: 'Öga', emoji: '👁️', bas: 'öga', poss: 'ditt' },
  arm: { def: 'armen', namn: 'Arm', emoji: '💪', bas: 'arm', poss: 'din' },
  ben: { def: 'benet', namn: 'Ben', emoji: '🦵', bas: 'ben', poss: 'ditt' },
  kna: { def: 'knät', namn: 'Knä', emoji: '🦵', bas: 'knä', poss: 'ditt' },
}

// Bubbel-emoji som matchar den AKTUELLA skepnaden (barn/nalle/kanin). Framför allt
// huvudet klingar fel med en människo-emoji på nallen/kaninen — ge varje skepnad
// sin egen. Övriga delar (näsa/öra/hand…) är generiska nog och faller tillbaka på
// PARTS[key].emoji.
const KIND_EMOJI = {
  barn: { huvud: '🧒' },
  nalle: { huvud: '🧸', nasa: '🐻', ora: '🐻' },
  kanin: { huvud: '🐰', nasa: '🐰', ora: '🐰' },
}
const emojiFor = (key, charKey) => KIND_EMOJI[charKey]?.[key] || PARTS[key].emoji

// Delar som räknas som "på huvudet" — så ett pek på näsan/ögat/munnen/örat vid
// frågan "huvud" godkänns på låga nivåer (generöst för de yngsta).
const HEAD_REGION = new Set(['huvud', 'nasa', 'oga', 'mun', 'ora'])
const SOFT_HEAD_MAX_LEVEL = 3

// "Peka på DIN …"-frågor (kroppslig koppling) + glad bekräftelse OAVSETT — kameran
// kan inte se barnet, så vi firar alltid.
const ownPraiseFor = (part) =>
  randomFrom([
    `Ja! Där är ${part.poss} ${part.bas}!`,
    `Duktigt! Det är ${part.poss} ${part.bas}!`,
    `Bravo! Du hittade ${part.poss} ${part.bas}!`,
    'Så bra!',
    'Precis så!',
  ])

// Osynlig svårighetstrappa: stora, tydliga delar först; fler/finare vid högre nivå.
const POOL_BY_LEVEL = {
  1: ['mage', 'huvud', 'fot', 'hand'],
  2: ['mage', 'huvud', 'fot', 'hand', 'nasa', 'mun', 'ora'],
  3: ['mage', 'huvud', 'fot', 'hand', 'nasa', 'mun', 'ora', 'oga', 'arm'],
  4: ['mage', 'huvud', 'fot', 'hand', 'nasa', 'mun', 'ora', 'oga', 'arm', 'ben'],
  5: ['mage', 'huvud', 'fot', 'hand', 'nasa', 'mun', 'ora', 'oga', 'arm', 'ben', 'kna'],
  6: ['mage', 'huvud', 'fot', 'hand', 'nasa', 'mun', 'ora', 'oga', 'arm', 'ben', 'kna'],
}
const GOAL_BY_LEVEL = { 1: 3, 2: 4, 3: 4, 4: 5, 5: 5, 6: 6 }

// Figur-skepnader (cyklas per runda för variation). Alla delar samma "skelett" så
// träffzonerna alltid stämmer; bara färg/öron/päls/hår skiljer.
const CHARACTERS = [{ key: 'barn' }, { key: 'nalle' }, { key: 'kanin' }]

// Frågorna skrivs ut som FULLA LITERALER per kroppsdel. En mallsträng ('Var är {d}?')
// kan aldrig få ett röstklipp: klipp-manifestet slår upp på exakt text och check.mjs
// matchar bara literaler. Fyra varianter per del och läge — alla fanns redan i
// manifestet, det var källkoden som dolde dem.
const QUESTIONS = {
  huvud: ['Var är huvudet?', 'Kan du peka på huvudet?', 'Hitta huvudet!', 'Visa var huvudet är!'],
  mage: ['Var är magen?', 'Kan du peka på magen?', 'Hitta magen!', 'Visa var magen är!'],
  fot: ['Var är foten?', 'Kan du peka på foten?', 'Hitta foten!', 'Visa var foten är!'],
  hand: ['Var är handen?', 'Kan du peka på handen?', 'Hitta handen!', 'Visa var handen är!'],
  nasa: ['Var är näsan?', 'Kan du peka på näsan?', 'Hitta näsan!', 'Visa var näsan är!'],
  mun: ['Var är munnen?', 'Kan du peka på munnen?', 'Hitta munnen!', 'Visa var munnen är!'],
  ora: ['Var är örat?', 'Kan du peka på örat?', 'Hitta örat!', 'Visa var örat är!'],
  oga: ['Var är ögat?', 'Kan du peka på ögat?', 'Hitta ögat!', 'Visa var ögat är!'],
  arm: ['Var är armen?', 'Kan du peka på armen?', 'Hitta armen!', 'Visa var armen är!'],
  ben: ['Var är benet?', 'Kan du peka på benet?', 'Hitta benet!', 'Visa var benet är!'],
  kna: ['Var är knät?', 'Kan du peka på knät?', 'Hitta knät!', 'Visa var knät är!'],
}

// Samma sak för DIN-frågorna (barnets egen kropp).
const OWN_QUESTIONS = {
  huvud: ['Kan du peka på ditt huvud?', 'Var är ditt huvud?', 'Klappa ditt huvud!', 'Visa ditt huvud!'],
  mage: ['Kan du peka på din mage?', 'Var är din mage?', 'Klappa din mage!', 'Visa din mage!'],
  fot: ['Kan du peka på din fot?', 'Var är din fot?', 'Klappa din fot!', 'Visa din fot!'],
  hand: ['Kan du peka på din hand?', 'Var är din hand?', 'Klappa din hand!', 'Visa din hand!'],
  nasa: ['Kan du peka på din näsa?', 'Var är din näsa?', 'Klappa din näsa!', 'Visa din näsa!'],
  mun: ['Kan du peka på din mun?', 'Var är din mun?', 'Klappa din mun!', 'Visa din mun!'],
  ora: ['Kan du peka på ditt öra?', 'Var är ditt öra?', 'Klappa ditt öra!', 'Visa ditt öra!'],
  oga: ['Kan du peka på ditt öga?', 'Var är ditt öga?', 'Klappa ditt öga!', 'Visa ditt öga!'],
  arm: ['Kan du peka på din arm?', 'Var är din arm?', 'Klappa din arm!', 'Visa din arm!'],
  ben: ['Kan du peka på ditt ben?', 'Var är ditt ben?', 'Klappa ditt ben!', 'Visa ditt ben!'],
  kna: ['Kan du peka på ditt knä?', 'Var är ditt knä?', 'Klappa ditt knä!', 'Visa ditt knä!'],
}

const praiseFor = (part) =>
  randomFrom([`${part.namn}! Bra!`, `Ja, det är ${part.def}!`, `Du hittade ${part.def}!`, 'Duktigt!', 'Bravo!', 'Wow!'])

// Bygg en runda-plan (längd = goal) utan direkta upprepningar.
function buildPlan(pool, goal) {
  const plan = []
  let bag = []
  let last = null
  while (plan.length < goal) {
    if (!bag.length) bag = shuffle(pool)
    let k = bag.shift()
    if (k === last && bag.length) {
      bag.push(k)
      k = bag.shift()
    }
    plan.push(k)
    last = k
  }
  return plan
}

function darken(hex, amt = 0.22) {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
function lighten(hex, amt = 0.5) {
  const r = (hex >> 16) & 255
  const g = (hex >> 8) & 255
  const b = hex & 255
  const l = (v) => Math.round(v + (255 - v) * amt)
  return (l(r) << 16) | (l(g) << 8) | l(b)
}

export default {
  id: 'peka-pa-kroppen',
  titleSv: 'Peka på Kroppen',
  icon: '👦',
  category: 'pedagogiskt',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'peka-pa-kroppen',
  voiceIntro: 'Zacke vill leka med kroppen!',

  init(ctx) {
    this._alive = true
    this._ctx = ctx
    this._idle = 0
    this._resolving = false
    this._step = 0
    this._rounds = ctx.progress.get().custom?.rundor || 0
    this._lastShirt = null
    this._parts = {}
    this._zones = []
    this._dots = []

    this._layer = new Container()
    ctx.stage.addChild(this._layer)

    // Polerad äng-scen (gradient + sol + moln + gräs). Dekorativ, FÖRSTA barnet.
    this._scene = createScene('meadow', { width: ctx.width, height: ctx.height, ground: true })
    this._layer.addChild(this._scene)

    // Osynligt tap-fångar-lager (ovanför scenen, under figuren): tomt tryck.
    const tap = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tap.eventMode = 'static'
    tap.on('pointertap', (e) => this._emptyTap(ctx, e))
    this._layer.addChild(tap)
    this._tap = tap

    // Mjuk skugga under figuren (skalas vid skutt — ger djup).
    this._shadow = new Graphics().ellipse(0, 0, 152, 30).fill({ color: COLORS.shadow, alpha: 0.15 })
    this._shadow.position.set(CX, FIG_Y + 268)
    this._shadow.eventMode = 'none'
    this._layer.addChild(this._shadow)

    // Figur-rot (persistent): hoppar/vinglar/skakar som helhet. Skepnaden bor i
    // this._charRoot och byggs om varje runda.
    this._figure = new Container()
    this._figure.position.set(CX, FIG_Y)
    this._figure.eventMode = 'passive'
    this._layer.addChild(this._figure)

    this._buildBubble(ctx)

    this._dotsLayer = new Container()
    this._dotsLayer.eventMode = 'none'
    this._layer.addChild(this._dotsLayer)

    this._startRound(ctx, false) // första frågan sätts tyst; mount talar

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    if (!this._alive) return
    // En enda mening (voice.say avbryter sig själv) -> intro + första frågan.
    ctx.services.voice.say(`${this.voiceIntro} ${this._currentPrompt}`)
  },

  // --- prompt-bubbla (visuellt stöd: den efterfrågade delens emoji) ---------
  _buildBubble(ctx) {
    const bubble = new Container()
    bubble.position.set(1090, 210)
    bubble.eventMode = 'none'
    const card = new Graphics()
      .roundRect(-74, -74, 148, 148, 36)
      .fill(COLORS.cream)
      .stroke({ width: 6, color: COLORS.teal })
    this._bubbleEmoji = new Text({ text: '❓', style: { fontFamily: FONT.body, fontSize: 86, align: 'center' } })
    this._bubbleEmoji.anchor.set(0.5)
    bubble.addChild(card, this._bubbleEmoji)
    this._bubble = bubble
    this._layer.addChild(bubble)
  },

  // --- rundans uppbyggnad ---------------------------------------------------
  _startRound(ctx, speak) {
    if (!this._alive) return
    this._clearHint()
    this._resolving = false
    this._step = 0
    this._idle = 0

    // Nollställ den persistenta figurens transform inför ny skepnad.
    gsap.killTweensOf(this._figure)
    gsap.killTweensOf(this._figure.scale)
    this._figure.rotation = 0
    this._figure.scale.set(1)
    this._figure.position.set(CX, FIG_Y)
    if (this._shadow) {
      gsap.killTweensOf(this._shadow.scale)
      this._shadow.scale.set(1)
    }

    this._level = clampLevel(ctx.progress.get().highestLevel)
    // De yngsta (låg nivå): hela huvudet godkänns även när ansiktet är aktivt.
    this._softHead = this._level <= SOFT_HEAD_MAX_LEVEL
    const pool = POOL_BY_LEVEL[this._level]
    this._goal = GOAL_BY_LEVEL[this._level] || 5
    this._plan = buildPlan(pool, this._goal)

    // Tempo: snabbare och kortare väntan vid högre nivå (men aldrig stressande).
    this._advanceDelay = clamp(1.2 - (this._level - 1) * 0.1, 0.7, 1.2)
    this._reaskDelay = clamp(0.95 - (this._level - 1) * 0.05, 0.65, 0.95)
    this._idleLimit = clamp(6.5 - (this._level - 1) * 0.35, 4.5, 6.5)
    // "Peka på DIN …": en kort paus så barnet hinner peka på sig själv innan vi firar.
    this._ownDelay = clamp(2.6 - (this._level - 1) * 0.1, 2.0, 2.6)

    this._mountCharacter(ctx)
    this._buildZones(pool)
    this._buildDots(ctx)
    this._fillDots(0)
    this._scheduleBlink()
    this._nextQuestion(ctx, speak)
  },

  _mountCharacter(ctx) {
    this._clearCharacter()
    const spec = CHARACTERS[this._rounds % CHARACTERS.length]
    this._charKey = spec.key // 'barn' | 'nalle' | 'kanin' (för matchande bubbel-emoji)
    this._char = this._resolveColors(spec)
    this._buildChar()
    // Lugn "andning" på hela skepnaden -> levande känsla (subtil, stör inte zoner).
    this._breatheTween = breathe(this._charRoot, { scale: 1.03, duration: 1.6 })
  },

  _resolveColors(spec) {
    if (spec.key === 'barn') {
      const skin = randomFrom(SKIN_TONES)
      const shirtPool = PLAYFUL.filter((c) => c !== this._lastShirt)
      const shirt = randomFrom(shirtPool.length ? shirtPool : PLAYFUL)
      this._lastShirt = shirt
      const pants = randomFrom([COLORS.blue, COLORS.purple, COLORS.teal, COLORS.green, COLORS.orange].filter((c) => c !== shirt))
      return { kind: 'barn', skin, shirt, pants, belly: lighten(shirt, 0.5), hair: randomFrom(HAIR_COLORS), ear: 'round', snout: false, noseColor: darken(skin, 0.14), noseY: 24, mouthY: 56 }
    }
    if (spec.key === 'nalle') {
      const fur = 0xc9925e
      return { kind: 'djur', skin: fur, shirt: COLORS.red, pants: COLORS.brown, belly: lighten(COLORS.red, 0.5), hair: null, ear: 'bear', snout: true, noseColor: MOUTH, noseY: 18, mouthY: 52 }
    }
    // kanin
    const fur = 0xf0dceb
    return { kind: 'djur', skin: fur, shirt: COLORS.purple, pants: COLORS.teal, belly: lighten(COLORS.purple, 0.5), hair: null, ear: 'long', snout: false, noseColor: CHEEK, noseY: 22, mouthY: 50 }
  },

  _g(x, y) {
    const g = new Graphics()
    g.position.set(x, y)
    g.eventMode = 'none'
    return g
  },

  _makeEye(x, y) {
    const e = new Container()
    e.position.set(x, y)
    e.eventMode = 'none'
    e.addChild(new Graphics().circle(0, 0, 20).fill(COLORS.white).stroke({ width: 3, color: MOUTH }))
    e.addChild(new Graphics().circle(0, 4, 10).fill(0x33271f))
    e.addChild(new Graphics().circle(4, -2, 4).fill(COLORS.white))
    return e
  },

  _buildChar() {
    const c = this._char
    const skin = c.skin
    const dSkin = darken(skin)
    const shirt = c.shirt
    const dShirt = darken(shirt)
    const pants = c.pants
    const dPants = darken(pants)

    const root = new Container()
    root.eventMode = 'passive'
    this._charRoot = root
    this._figure.addChild(root)
    const p = (this._parts = {})

    // Ben + knän + fötter (bakom kroppen).
    p.legL = this._g(-LEG_X, LEG_Y)
    p.legR = this._g(LEG_X, LEG_Y)
    for (const g of [p.legL, p.legR]) g.roundRect(-26, -62, 52, 130, 26).fill(pants).stroke({ width: 8, color: dPants })
    p.kneeL = this._g(-LEG_X, KNEE_Y)
    p.kneeR = this._g(LEG_X, KNEE_Y)
    for (const g of [p.kneeL, p.kneeR]) g.ellipse(0, 0, 22, 17).fill({ color: lighten(pants, 0.28), alpha: 0.9 })
    p.footL = this._g(-LEG_X, FOOT_Y)
    p.footR = this._g(LEG_X, FOOT_Y)
    for (const g of [p.footL, p.footR]) g.ellipse(0, 0, 50, 30).fill(skin).stroke({ width: 8, color: dSkin })
    root.addChild(p.legL, p.legR, p.kneeL, p.kneeR, p.footL, p.footR)

    // Armar + händer (bakom kroppen så kroppen täcker inneränden).
    p.armL = this._g(-ARM_X, ARM_Y)
    p.armR = this._g(ARM_X, ARM_Y)
    for (const g of [p.armL, p.armR]) g.roundRect(-20, -58, 40, 118, 20).fill(shirt).stroke({ width: 8, color: dShirt })
    p.handL = this._g(-ARM_X, HAND_Y)
    p.handR = this._g(ARM_X, HAND_Y)
    for (const g of [p.handL, p.handR]) g.circle(0, 0, 32).fill(skin).stroke({ width: 8, color: dSkin })
    root.addChild(p.armL, p.armR, p.handL, p.handR)

    // Kropp + mage-markering (ljusare cirkel ovanpå tröjan).
    p.torso = this._g(0, TORSO_Y)
    p.torso.roundRect(-90, -86, 180, 176, 54).fill(shirt).stroke({ width: 8, color: dShirt })
    p.belly = this._g(0, BELLY_Y)
    p.belly.circle(0, 0, 58).fill({ color: c.belly, alpha: 0.92 })
    root.addChild(p.torso, p.belly)

    // Huvud-container (poppar/andas/blinkar som enhet).
    const head = new Container()
    head.position.set(0, HEAD_Y)
    head.eventMode = 'none'
    p.head = head
    root.addChild(head)

    // Öron (ritas först = bakom huvudet) + sätter this._earGeo (öronzonens läge).
    this._drawEars(head, c)

    p.headG = this._g(0, 0)
    p.headG.circle(0, 0, HEAD_R).fill(skin).stroke({ width: 8, color: dSkin })
    head.addChild(p.headG)

    if (c.hair) {
      p.hair = this._g(0, 0)
      const hg = p.hair
      for (const [hx, hy] of [[-58, -82], [-22, -98], [18, -98], [56, -82], [0, -104]]) hg.circle(hx, hy, 28)
      hg.fill(c.hair)
      head.addChild(p.hair)
    }

    if (c.snout) {
      const sn = this._g(0, 30)
      sn.ellipse(0, 0, 52, 40).fill({ color: lighten(skin, 0.42) }).stroke({ width: 6, color: dSkin })
      head.addChild(sn)
    }

    p.eyeL = this._makeEye(-42, -10)
    p.eyeR = this._makeEye(42, -10)
    head.addChild(p.eyeL, p.eyeR)

    p.cheekL = this._g(-64, 28)
    p.cheekR = this._g(64, 28)
    for (const g of [p.cheekL, p.cheekR]) g.circle(0, 0, 22).fill({ color: CHEEK, alpha: 0.8 })
    head.addChild(p.cheekL, p.cheekR)

    p.nose = this._g(0, c.noseY)
    p.nose.circle(0, 0, 13).fill(c.noseColor).stroke({ width: 3, color: dSkin })
    head.addChild(p.nose)

    this._mouthY = c.mouthY
    p.mouth = this._g(0, c.mouthY)
    head.addChild(p.mouth)
    this._drawMouth(false)
  },

  // Ritar öron i valt utförande och sparar öronzonens läge (this._earGeo).
  _drawEars(head, c) {
    const skin = c.skin
    const dSkin = darken(skin)
    let geo
    if (c.ear === 'round') {
      // Små runda barn-öron vid sidorna.
      for (const sx of [-1, 1]) {
        const e = this._g(sx * 100, 6)
        e.circle(0, 0, 26).fill(skin).stroke({ width: 7, color: dSkin }).circle(0, 0, 12).fill({ color: lighten(skin, 0.3) })
        head.addChild(e)
        if (sx < 0) this._parts.earL = e
        else this._parts.earR = e
      }
      geo = { x: 100, y: 6, r: 46 }
    } else if (c.ear === 'bear') {
      // Stora runda björn-öron uppe i hörnen.
      for (const sx of [-1, 1]) {
        const e = this._g(sx * 68, -86)
        e.circle(0, 0, 34).fill(skin).stroke({ width: 8, color: dSkin }).circle(0, 0, 17).fill({ color: lighten(skin, 0.42) })
        head.addChild(e)
        if (sx < 0) this._parts.earL = e
        else this._parts.earR = e
      }
      geo = { x: 68, y: -86, r: 48 }
    } else {
      // Långa kanin-öron som flörtar uppåt.
      for (const sx of [-1, 1]) {
        const e = this._g(sx * 36, -28)
        e.roundRect(-16, -150, 32, 168, 16).fill(skin).stroke({ width: 8, color: dSkin }).roundRect(-8, -138, 16, 148, 8).fill({ color: lighten(skin, 0.45), alpha: 0.9 })
        head.addChild(e)
        if (sx < 0) this._parts.earL = e
        else this._parts.earR = e
      }
      geo = { x: 36, y: -110, r: 48 }
    }
    this._earGeo = geo
  },

  // Mun: liten glad båge eller stort öppet skratt (vid beröm).
  _drawMouth(open) {
    const m = this._parts.mouth
    if (!m || m.destroyed) return
    m.clear()
    if (open) {
      m.arc(0, 0, 30, 0, Math.PI).fill(MOUTH)
      m.circle(0, 18, 9).fill(COLORS.red)
    } else {
      m.arc(0, -6, 30, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 8, color: MOUTH, cap: 'round' })
    }
  },

  // Bygg träffzoner för delarna i nivåns pool. Endast aktiva delar finns -> låga
  // nivåer är generösa (hela huvudet/benet) medan högre nivåer blir precisa
  // (panna/lår). Ordning = z-ordning: ansiktets smådelar läggs SIST och "äger"
  // sina punkter, så varje dels mitt alltid löser ut rätt del.
  _buildZones(pool) {
    this._zones = []
    const has = (k) => pool.includes(k)
    const faceActive = has('nasa') || has('oga') || has('mun')
    const kneeActive = has('kna')
    const p = this._parts
    const add = (key, x, y, r, react) => {
      const z = new Container()
      z.position.set(x, y)
      z.hitArea = new Circle(0, 0, r)
      z.eventMode = 'static'
      z.cursor = 'pointer'
      z.key = key
      z._react = react
      z._r = r
      z.on('pointertap', (e) => this._onPart(this._ctx, z, e))
      this._charRoot.addChild(z)
      this._zones.push(z)
    }

    if (has('huvud')) {
      // Krymp till pannan bara på HÖGRE nivåer när ansiktet är aktivt; för de
      // yngsta godkänns hela huvudet (kompletteras av HEAD_REGION-logiken i _onPart).
      if (faceActive && !this._softHead) add('huvud', 0, HEAD_Y - 60, 56, p.head) // pannan
      else add('huvud', 0, HEAD_Y, 104, p.head) // hela huvudet
    }
    if (has('mage')) add('mage', 0, BELLY_Y, 70, p.belly)
    if (has('arm')) {
      add('arm', -ARM_X, ARM_Y - 6, 48, p.armL)
      add('arm', ARM_X, ARM_Y - 6, 48, p.armR)
    }
    if (has('hand')) {
      add('hand', -ARM_X, HAND_Y, 48, p.handL)
      add('hand', ARM_X, HAND_Y, 48, p.handR)
    }
    if (has('ben')) {
      if (kneeActive) {
        add('ben', -LEG_X, BEN_HI_Y, 44, p.legL)
        add('ben', LEG_X, BEN_HI_Y, 44, p.legR)
      } else {
        add('ben', -LEG_X, LEG_Y, 56, p.legL)
        add('ben', LEG_X, LEG_Y, 56, p.legR)
      }
    }
    if (kneeActive) {
      add('kna', -LEG_X, KNEE_Y, 38, p.kneeL)
      add('kna', LEG_X, KNEE_Y, 38, p.kneeR)
    }
    if (has('fot')) {
      add('fot', -LEG_X, FOOT_Y, 52, p.footL)
      add('fot', LEG_X, FOOT_Y, 52, p.footR)
    }
    // Ansikte + öron läggs sist (överst) så centrumen blir entydiga.
    if (has('ora') && this._earGeo) {
      const g = this._earGeo
      add('ora', -g.x, HEAD_Y + g.y, g.r, p.earL)
      add('ora', g.x, HEAD_Y + g.y, g.r, p.earR)
    }
    if (has('nasa')) add('nasa', 0, HEAD_Y + this._char.noseY, 40, p.nose)
    if (has('oga')) {
      add('oga', -42, HEAD_Y - 10, 40, p.eyeL)
      add('oga', 42, HEAD_Y - 10, 40, p.eyeR)
    }
    if (has('mun')) add('mun', 0, HEAD_Y + this._char.mouthY, 42, p.mouth)
  },

  _buildDots(ctx) {
    for (const d of this._dots) {
      gsap.killTweensOf(d.scale)
      if (!d.destroyed) d.destroy()
    }
    this._dots = []
    const gap = 52
    const startX = ctx.width / 2 - ((this._goal - 1) * gap) / 2
    for (let i = 0; i < this._goal; i++) {
      const d = new Graphics().circle(0, 0, 13).fill({ color: COLORS.inkSoft, alpha: 0.22 })
      d.position.set(startX + i * gap, 678)
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

  // Välj nästa del ur rundans plan, bygg svensk fras, uppdatera bubbla.
  _nextQuestion(ctx, speak) {
    if (!this._alive) return
    this._resolving = false
    this._idle = 0
    this._clearHint()
    this._ownTimer?.kill()
    const key = this._plan[this._step]
    this._target = key
    this._targetZones = this._zones.filter((z) => z.key === key)
    const part = PARTS[key]
    // Varannan fråga knyter an till barnets EGNA kropp ("Peka på DIN mage?").
    this._ownBody = this._step % 2 === 1
    if (this._ownBody) {
      this._currentPrompt = randomFrom(OWN_QUESTIONS[key] || OWN_QUESTIONS.huvud)
    } else {
      this._currentPrompt = randomFrom(QUESTIONS[key] || QUESTIONS.huvud)
    }
    this._bubbleEmoji.text = emojiFor(key, this._charKey)
    pop(this._bubble)
    if (speak) ctx.services.voice.say(this._currentPrompt)
    // DIN-frågan: efter en kort paus firar vi ALLTID (kameran ser inte barnet).
    if (this._ownBody) {
      this._ownTimer = gsap.delayedCall(this._ownDelay, () => this._confirmOwnBody(ctx))
    }
  },

  // --- pekningar ------------------------------------------------------------

  // Ett tryck på en kroppsdel: omedelbar (<100 ms) respons (ljud + ring).
  _onPart(ctx, zone, e) {
    if (!this._alive) return
    // Under firandet/övergången är svaret låst — men tystnad är ett P0-brott, inte
    // en paus (uppmätt: tre döda tryck i rad). Dämpat kvitto på fingrets plats.
    if (this._resolving) {
      const q = ctx.fxLayer.toLocal(e.global)
      return kvittera(ctx.fxLayer, q.x, q.y, ctx.services.audio, { color: COLORS.yellow })
    }
    this._idle = 0
    this._clearHint()
    const fp = ctx.fxLayer.toLocal(e.global)
    // DIN-fråga: barnet ska peka på sig självt — vilket pek på Zacke som helst firas.
    if (this._ownBody) {
      this._confirmOwnBody(ctx, fp)
      return
    }
    // Låg nivå: ett pek på näsan/ögat/munnen/örat vid "huvud" räknas som huvudet.
    const headOk = this._target === 'huvud' && this._softHead && HEAD_REGION.has(zone.key)
    if (zone.key === this._target || headOk) {
      ctx.services.audio.sfx(Math.random() < 0.3 ? 'pling' : 'correct')
      ripple(ctx.fxLayer, fp.x, fp.y, { color: COLORS.yellow, maxR: 96, alpha: 0.6 })
      this._correct(ctx, zone, fp)
    } else {
      ctx.services.audio.sfx('soft')
      ripple(ctx.fxLayer, fp.x, fp.y, { color: COLORS.white, maxR: 78, alpha: 0.5 })
      this._wrong(ctx, zone)
    }
  },

  // Rätt del: puls + lysande ring + gnistror + namn + glad reaktion. Gå vidare.
  _correct(ctx, zone, fp) {
    this._resolving = true
    this._idle = 0
    const part = PARTS[this._target] // namnge alltid den EFTERFRÅGADE delen
    pop(zone._react)
    this._glowRing(ctx, zone)
    sparkle(ctx.fxLayer, fp.x, fp.y, { count: 9 })
    floatText(ctx.fxLayer, fp.x, fp.y - 30, `${part.namn}!`, { fontSize: 52, fontFamily: FONT.title })
    this._happyReact()
    this._joy(ctx) // Zacke skrattar glatt
    ctx.services.voice.say(praiseFor(part))

    this._step++
    this._fillDots(this._step)
    if (this._dots[this._step - 1]) pop(this._dots[this._step - 1])

    this._resolveTimer?.kill()
    this._resolveTimer = gsap.delayedCall(this._advanceDelay, () => {
      if (!this._alive) return
      if (this._step >= this._goal) this._completeRound(ctx)
      else this._nextQuestion(ctx, true)
    })
  },

  // Annan del: vänlig vingel + mjukt ljud, sedan upprepas frågan + mjuk ledtråd.
  // Aldrig "fel".
  _wrong(ctx, zone) {
    if (!this._alive) return
    this._idle = 0
    wiggle(zone._react)
    this._reaskTimer?.kill()
    this._reaskTimer = gsap.delayedCall(this._reaskDelay, () => {
      if (!this._alive || this._resolving) return
      ctx.services.voice.say(this._currentPrompt)
      pop(this._bubble)
      this._showHint()
    })
  },

  // DIN-fråga besvarad (av paus-timern eller av vilket pek som helst): glad
  // bekräftelse OAVSETT — vi firar alltid, och visar delen på Zacke som brygga.
  _confirmOwnBody(ctx, fp) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._idle = 0
    this._ownTimer?.kill()
    this._clearHint()
    const part = PARTS[this._target]
    ctx.services.audio.sfx('pling')
    this._joy(ctx) // Zacke skrattar glatt med barnet
    this._happyReact()
    const z = this._targetZones?.[0]
    if (z) this._glowRing(ctx, z) // "…och där sitter den på Zacke!"
    let ex = fp?.x
    let ey = fp?.y
    if (ex == null) {
      const hp = ctx.fxLayer.toLocal((this._parts.head || this._figure).getGlobalPosition())
      ex = hp.x
      ey = hp.y
    }
    sparkle(ctx.fxLayer, ex, ey, { count: 9 })
    floatText(ctx.fxLayer, ex, ey - 30, `${part.namn}!`, { fontSize: 52, fontFamily: FONT.title })
    ctx.services.voice.say(ownPraiseFor(part))

    this._step++
    this._fillDots(this._step)
    if (this._dots[this._step - 1]) pop(this._dots[this._step - 1])

    this._resolveTimer?.kill()
    this._resolveTimer = gsap.delayedCall(this._advanceDelay, () => {
      if (!this._alive) return
      if (this._step >= this._goal) this._completeRound(ctx)
      else this._nextQuestion(ctx, true)
    })
  },

  // Zacke skrattar glatt: riktigt skratt-klipp om det finns, annars en varm liten
  // "hehehe"-gigg via toner (audio-context-schemalagd -> exit-säker, inga Pixi-objekt).
  _joy(ctx) {
    const a = ctx.services.audio
    if (a.sample('skratt')) return
    a.tone({ freq: 620, dur: 0.09, type: 'sine', vol: 0.22 })
    a.tone({ freq: 780, dur: 0.09, type: 'sine', vol: 0.22, delay: 0.11 })
    a.tone({ freq: 700, dur: 0.08, type: 'sine', vol: 0.2, delay: 0.22 })
    a.tone({ freq: 880, dur: 0.1, type: 'sine', vol: 0.2, delay: 0.33 })
  },

  // Tomt tryck (bredvid delarna): lekfull vingel + mjukt ljud + ring. Aldrig fel.
  _emptyTap(ctx, e) {
    if (!this._alive) return
    if (this._resolving) {
      const q = ctx.fxLayer.toLocal(e.global)
      return kvittera(ctx.fxLayer, q.x, q.y, ctx.services.audio, { color: COLORS.white })
    }
    this._idle = 0
    const fp = ctx.fxLayer.toLocal(e.global)
    // DIN-fråga: barnet pekar på sig självt bredvid skärmen — fira ändå.
    if (this._ownBody) {
      this._confirmOwnBody(ctx, fp)
      return
    }
    ctx.services.audio.sfx('soft')
    ripple(ctx.fxLayer, fp.x, fp.y, { color: COLORS.white, maxR: 70, alpha: 0.45 })
    wiggle(this._figure)
  },

  // Runda klar: glad dans + mjuk skakning + lokal skur, sedan shellens firande
  // (ljud + beröm + konfetti + stjärna + klistermärke) via complete(). Ny skepnad.
  _completeRound(ctx) {
    this._resolving = true
    this._idle = 0
    this._clearHint()
    this._happyDance()
    shake(this._figure, { intensity: 7, duration: 0.4 })
    burst(ctx.fxLayer, CX, FIG_Y + HEAD_Y, { count: 18, power: 1.2 })

    ctx.progress.complete() // celebrate-ljud + beröm + konfetti + stjärna + klistermärke

    this._rounds += 1
    ctx.progress.setCustom('rundor', this._rounds)
    const want = clampLevel(1 + Math.floor(this._rounds / 2)) // höj nivå var 2:a runda
    ctx.progress.setLevel(want)

    this._roundTimer?.kill()
    this._roundTimer = gsap.delayedCall(1.7, () => {
      if (this._alive) this._startRound(ctx, true)
    })
  },

  // --- glada reaktioner -----------------------------------------------------
  _happyReact() {
    this._hop()
    this._openSmile()
    const eyes = [this._parts.eyeL?.scale, this._parts.eyeR?.scale].filter(Boolean)
    if (eyes.length) {
      gsap.killTweensOf(eyes)
      gsap.to(eyes, { y: 0.2, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.inOut' })
    }
    if (this._parts.cheekL) pop(this._parts.cheekL)
    if (this._parts.cheekR) pop(this._parts.cheekR)
  },

  _hop() {
    const f = this._figure
    gsap.killTweensOf(f, 'y')
    gsap.to(f, {
      y: FIG_Y - 22,
      duration: 0.13,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
      onComplete: () => {
        if (!f.destroyed) f.y = FIG_Y
      },
    })
    if (this._shadow) {
      gsap.killTweensOf(this._shadow.scale)
      gsap.to(this._shadow.scale, {
        x: 0.85,
        y: 0.85,
        duration: 0.13,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out',
        onComplete: () => {
          if (!this._shadow.destroyed) this._shadow.scale.set(1)
        },
      })
    }
  },

  _openSmile() {
    this._drawMouth(true)
    this._mouthTimer?.kill()
    this._mouthTimer = gsap.delayedCall(0.7, () => {
      if (this._alive && this._parts.mouth && !this._parts.mouth.destroyed) this._drawMouth(false)
    })
  },

  _happyDance() {
    const f = this._figure
    gsap.killTweensOf(f.scale)
    gsap.to(f.scale, {
      x: 1.12,
      y: 1.12,
      duration: 0.16,
      yoyo: true,
      repeat: 3,
      ease: 'sine.inOut',
      onComplete: () => {
        if (!f.destroyed) f.scale.set(1)
      },
    })
    this._openSmile()
  },

  // Lysande ring runt en träffad del (exit-säker: tweenar ett JS-objekt och rör
  // Pixi-objektet bara om det lever).
  _glowRing(ctx, zone) {
    const fp = ctx.fxLayer.toLocal(zone.getGlobalPosition())
    const ring = new Graphics().circle(0, 0, zone._r + 4).stroke({ width: 8, color: COLORS.yellow })
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

  // --- ledtråd vid idle -----------------------------------------------------
  _showHint() {
    if (!this._alive) return
    const z = this._targetZones?.[0]
    if (!z || !this._charRoot || this._charRoot.destroyed) return
    this._clearHint()
    const g = new Graphics()
      .circle(0, 0, z._r + 6)
      .fill({ color: COLORS.yellow, alpha: 0.12 })
      .circle(0, 0, z._r + 6)
      .stroke({ width: 8, color: COLORS.yellow, alpha: 0.9 })
    g.position.set(z.x, z.y)
    g.eventMode = 'none'
    this._charRoot.addChild(g)
    this._hintGlow = g
    this._hintTween = breathe(g, { scale: 1.18, duration: 0.7 })
  },

  _clearHint() {
    this._hintTween?.kill()
    this._hintTween = null
    if (this._hintGlow) {
      gsap.killTweensOf(this._hintGlow.scale)
      if (!this._hintGlow.destroyed) this._hintGlow.destroy()
      this._hintGlow = null
    }
  },

  // --- liv & idle -----------------------------------------------------------
  _scheduleBlink() {
    this._blinkTimer?.kill()
    this._blinkTimer = gsap.delayedCall(2 + Math.random() * 3.5, () => {
      if (!this._alive) return
      if (!this._resolving) this._blink()
      this._scheduleBlink()
    })
  },

  _blink() {
    const eyes = [this._parts.eyeL?.scale, this._parts.eyeR?.scale].filter(Boolean)
    if (!eyes.length) return
    gsap.to(eyes, { y: 0.12, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.inOut' })
  },

  // Idle-recue: efter en stunds tystnad upprepar vi frågan och visar en ledtråd.
  _update(ctx, ticker) {
    if (!this._alive || this._resolving || this._ownBody || !this._target) return
    this._idle += ticker.deltaMS / 1000
    if (this._idle > this._idleLimit) {
      this._idle = 0
      ctx.services.voice.say(this._currentPrompt)
      pop(this._bubble)
      this._showHint()
    }
  },

  // --- städning -------------------------------------------------------------

  // Alla objekt i nuvarande skepnad som kan ha tweens.
  _charObjs() {
    const p = this._parts || {}
    return [
      this._charRoot,
      p.head,
      p.headG,
      p.hair,
      p.torso,
      p.belly,
      p.armL,
      p.armR,
      p.handL,
      p.handR,
      p.legL,
      p.legR,
      p.kneeL,
      p.kneeR,
      p.footL,
      p.footR,
      p.earL,
      p.earR,
      p.eyeL,
      p.eyeR,
      p.cheekL,
      p.cheekR,
      p.nose,
      p.mouth,
      ...(this._zones || []),
    ].filter(Boolean)
  },

  _killCharTweens() {
    for (const o of this._charObjs()) {
      gsap.killTweensOf(o)
      if (o.scale) gsap.killTweensOf(o.scale)
    }
  },

  // Riv nuvarande skepnad (tweens + timers) inför ny runda.
  _clearCharacter() {
    this._clearHint()
    this._ownTimer?.kill()
    this._ownTimer = null
    this._breatheTween?.kill()
    this._breatheTween = null
    this._blinkTimer?.kill()
    this._blinkTimer = null
    this._mouthTimer?.kill()
    this._mouthTimer = null
    this._killCharTweens()
    this._zones = []
    if (this._charRoot) {
      this._charRoot.destroy({ children: true })
      this._charRoot = null
    }
    this._parts = {}
    this._target = null
    this._targetZones = []
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx.ticker.remove(this._tick)
    this._resolveTimer?.kill()
    this._reaskTimer?.kill()
    this._roundTimer?.kill()
    this._ownTimer?.kill()
    this._blinkTimer?.kill()
    this._mouthTimer?.kill()
    this._breatheTween?.kill()
    this._hintTween?.kill()
    ctx.services.voice.cancel()
    this._killCharTweens()
    for (const o of [this._figure, this._shadow, this._bubble, this._hintGlow, ...(this._dots || [])]) {
      if (!o) continue
      gsap.killTweensOf(o)
      if (o.scale) gsap.killTweensOf(o.scale)
    }
    gsap.killTweensOf(this._layer)
    this._layer?.destroy({ children: true })
  },
}
