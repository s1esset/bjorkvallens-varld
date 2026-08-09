// Klappa Mullvaden — en SNÄLL "klappa-mullvaden" (2–5 år). Söta små djur kikar
// LUGNT upp ur sina hål i en blomsteräng och väntar; barnet klappar (tap) så de
// fnissar, blir glada (rosiga kinder + stort leende), studsar och dyker ner igen.
// Ingen miss, inget straff, ingen tidspress — ett djur som inte hinns klappas dyker
// bara mjukt ner av sig själv. Var N:te klapp firar vi (delat firande + stjärna +
// klistermärke) och en ny, lite livligare runda startar. Djuren varieras (mullvad,
// kanin, igelkott, mus, groda) och nivån växer mjukt med antal hål/uppdyk.
import { Container, Graphics, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { pop, wiggle, puff, ripple, sparkle, floatText, burst, breathe, shake } from '../../lib/feedback.js'
import { createScene } from '../../lib/scene.js'
import { topLightFill } from '../../lib/form.js'
import { randomFrom } from '../../lib/swedish.js'

// Lekfältets area (designkoordinater) — hålen placeras i ett rutnät här inne.
// FX1 lämnar plats åt vänboken (den lodräta samlingen) längs högerkanten.
const FX0 = 240
const FX1 = 1000
const FY0 = 240
const FY1 = 600

// Vänboken: en trätavla längs högerkanten där ett ansikte per klappad art hänger kvar.
const BOOK_X = 1196
const BOOK_Y0 = 196
const BOOK_GAP = 78

// Hål- och djurgeometri (lokalt i varje hål-container, origo = hålets mitt).
const HOLE_RX = 90
const HOLE_RY = 40
const MOLE_UP_Y = -45 // djuret uppe (huvudet pokar upp ur hålet)
const MOLE_DOWN_Y = 95 // djuret gömt under hålkanten (klipps bort av masken)

const DIRT = 0xb9905f // jordfärg till stänk-puffar

// Talade fraser (svenska med å/ä/ö — för TTS).
const IDLE = [
  'Klappa djuren när de kikar upp ur hålen!',
  'Titta, någon kikar upp! Klappa försiktigt.',
  'Var är djuren? Klappa när de tittar upp!',
]
// Beröm (talad svenska) — INGET "Hihi!" längre: fnisset är nu ett riktigt djurläte (se _critterSound).
const GENTLE = ['Vad fint du klappar!', 'Mjukt och snällt!', 'Klapp klapp!', 'Så bra klappat!']
// Glada bilder som flyter upp vid en klapp (emoji = ingen läsning krävs).
const JOY = ['😄', '🥰', '✨', '💛', '🐾', '😊']

// De djur som kan dyka upp (introduceras gradvis med nivån). ASCII-id:n.
const SPECIES = ['mullvad', 'kanin', 'igelkott', 'mus', 'groda']
const SPECIES_NAME = { mullvad: 'mullvaden', kanin: 'kaninen', igelkott: 'igelkotten', mus: 'musen', groda: 'grodan' }

// Varje art har eget SÄTT att komma upp — det är inte bara olika päls. Det gör *vilken*
// art som dyker upp till något att känna igen och vänta på (agens, inte utbytbar grafik).
//   rise  = hur snabbt/högt den reser sig     up = multiplikator på uppe-tiden
//   hops  = extra studsar när den står uppe   peek = kikar snabbt ner-och-upp igen
const BEHAVIOR = {
  mullvad: { rise: 0.46, ease: 'back.out(1.3)', lift: 0, up: 1.15, hops: 0 },
  kanin: { rise: 0.34, ease: 'back.out(2.6)', lift: 26, up: 0.95, hops: 2 },
  igelkott: { rise: 0.55, ease: 'power2.out', lift: 0, up: 1.25, hops: 0 },
  mus: { rise: 0.2, ease: 'power3.out', lift: 8, up: 0.62, hops: 0, peek: true },
  groda: { rise: 0.3, ease: 'back.out(3)', lift: 40, up: 0.85, hops: 1 },
}

// Riktigt inspelat läte per art om det finns (SFX-pipelinen, sample('djur_…')).
const SAMPLE_FOR = { groda: 'djur_groda' }
// Annars ett sött litet "pip" per art med egen tonhöjd (mus = ljusast, mullvad = mörkast).
const PIP_FOR = { mullvad: 520, kanin: 680, igelkott: 600, mus: 900, groda: 440 }

// Mjuk nivåtrappa: aldrig stressig, alltid generös uppe-tid (golv 1,8 s). Fler hål,
// fler djur-arter och något snabbare uppdyk när nivån stiger.
function paramsFor(level) {
  const L = Math.max(1, level)
  return {
    goal: Math.min(12, 4 + L), // klappar som krävs för rundan
    cols: L >= 3 ? 4 : 3,
    rows: L >= 4 ? 3 : 2,
    upTime: Math.max(1.8, 3.2 - 0.18 * (L - 1)), // sekunder ett djur väntar uppe
    spawnEvery: Math.max(0.85, 1.7 - 0.11 * (L - 1)), // sekunder mellan uppdyk
    cap: L >= 6 ? 3 : L >= 3 ? 2 : 1, // hur många som får vara uppe samtidigt
    variety: Math.min(SPECIES.length, 1 + Math.floor(L / 1.5)), // antal arter i mixen
  }
}

export default {
  id: 'klappa-mullvaden',
  titleSv: 'Klappa Mullvaden',
  icon: '🐹',
  category: 'motorik',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'klappa-mullvaden',
  voiceIntro: 'Klappa djuren när de kikar upp ur hålen!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._spawnAcc = 0
    this._roundDone = false
    this._level = ctx.progress.get().highestLevel || 1

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Marknadsmässig äng-bakgrund (sol, moln, kullar) — dekorativ, fångar inga tryck.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Trästaket vid horisonten — ger ängen ett bakre plan i stället för en tom kant.
    const fence = new Graphics()
    for (let x = -20; x < ctx.width + 40; x += 74) {
      fence.roundRect(x, 132, 22, 74, 6).fill(0xc79a68)
      fence.roundRect(x, 132, 22, 10, 6).fill(0xdcb388)
    }
    fence.rect(-20, 152, ctx.width + 60, 11).fill(0xb98a5f)
    fence.rect(-20, 180, ctx.width + 60, 11).fill(0xb98a5f)
    fence.eventMode = 'none'
    this._root.addChild(fence)

    // Gräsmatta för lekfältet (rundad topp) ovanpå scenens nedre del.
    const lawn = new Graphics()
    lawn.roundRect(-40, 195, ctx.width + 80, ctx.height - 195 + 80, 90).fill(0x8ed16a)
    lawn.roundRect(-40, 195, ctx.width + 80, 18, 90).fill({ color: 0xa6dd7f, alpha: 0.6 })
    // Klippta gräsränder ger djup och en känsla av verklig gräsmatta.
    for (let i = 0; i < 6; i++) {
      lawn.rect(-40, 214 + i * 88, ctx.width + 80, 44).fill({ color: 0x84c962, alpha: 0.28 })
    }
    // Mjuka gräs-plättar för djup.
    for (const [px, py, pr] of [[330, 360, 70], [900, 320, 84], [640, 540, 96], [200, 560, 60], [1080, 520, 72]]) {
      lawn.ellipse(px, py, pr, pr * 0.5).fill({ color: 0x7cc25c, alpha: 0.35 })
    }
    lawn.eventMode = 'none'
    this._root.addChild(lawn)

    // Spridd dekor längs kanterna — RITADE föremål med egen silhuett (P0 ASSETS),
    // inte emoji. Fjärilen och nyckelpigan rör sig så ängen lever mellan uppdyken.
    const deco = new Container()
    deco.eventMode = 'none'
    deco.interactiveChildren = false
    for (const [dx, dy, kind, col] of [
      [116, 300, 'tulpan', 0xff6b9d], [78, 470, 'prastkrage', 0xffffff],
      [1148, 626, 'grodd', 0x5bbf6a], [1116, 690, 'tulpan', 0xff8a3d],
      [96, 640, 'klover', 0x4fae51], [612, 172, 'prastkrage', 0xfff3b0],
      [700, 664, 'klover', 0x4fae51], [176, 214, 'tulpan', 0xa78bfa],
      [1052, 208, 'prastkrage', 0xffffff], [430, 668, 'grodd', 0x5bbf6a],
    ]) deco.addChild(makePlant(kind, col, dx, dy))
    this._root.addChild(deco)
    this._bugs = [makeButterfly(300, 176), makeLadybug(980, 174)]
    this._bugs.forEach((b) => deco.addChild(b))
    this._flutter(this._bugs[0], ctx)
    this._crawl(this._bugs[1], ctx)

    // Osynlig heltäckande träffyta: tomt tryck på ängen -> mjuk respons.
    const tapCatcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tapCatcher.eventMode = 'static'
    tapCatcher.on('pointertap', (e) => this._emptyTap(ctx, e))
    this._root.addChild(tapCatcher)

    // Fält (hål + djur) och räknar-rad byggs om mellan rundor.
    this._field = new Container()
    this._root.addChild(this._field)

    // Räknar-rad (tassavtryck), under headern (y<96 reserverad).
    this._pawRow = new Container()
    this._pawRow.position.set(140, 114)
    this._pawRow.eventMode = 'none'
    this._root.addChild(this._pawRow)

    // Partikellager överst (gnistror, puffar, ringar) — exit-säkert, fångar inga tryck.
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._root.addChild(this._fx)

    this._buildBook(ctx)
    this._buildField(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Bygg om hål-rutnätet + räknar-raden för aktuell nivå (städar gammalt först).
  _buildField(ctx) {
    if (!this._alive) return
    this._p = paramsFor(this._level)
    const { cols, rows, goal } = this._p

    this._holes?.forEach((h) => this._killHoleTweens(h))
    this._field.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._holes = []
    this._patted = 0
    this._roundDone = false
    this._spawnAcc = this._p.spawnEvery - 0.7 // första djuret dyker upp snabbt
    this._idle = 0

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let x = cols > 1 ? FX0 + (c * (FX1 - FX0)) / (cols - 1) : (FX0 + FX1) / 2
        let y = rows > 1 ? FY0 + (r * (FY1 - FY0)) / (rows - 1) : (FY0 + FY1) / 2
        // Organisk placering: liten jitter + storlek/rotation-variation så ängen ser
        // handgjord ut, inte som ett exakt rutnät (varje hög blir sin egen).
        x += (Math.random() * 2 - 1) * 30
        y += (Math.random() * 2 - 1) * 18
        const hole = this._makeHole(ctx)
        hole.position.set(x, y)
        hole.scale.set(0.93 + Math.random() * 0.14)
        hole.rotation = (Math.random() * 2 - 1) * 0.05
        this._field.addChild(hole)
        this._holes.push(hole)
      }
    }

    // Räknar-rad: ett RITAT tassavtryck per mål-klapp, tonat tills det klappas.
    this._pawRow.removeChildren().forEach((o) => o.destroy())
    this._paws = []
    for (let i = 0; i < goal; i++) {
      const paw = makePaw()
      paw.position.set(i * 46, 0)
      paw.alpha = 0.25
      this._pawRow.addChild(paw)
      this._paws.push(paw)
    }
  },

  // Vänboken: en trätavla längs högerkanten. Varje art man klappat hänger kvar där —
  // också nästa gång man startar spelet (custom.arter). Ger en anledning att komma
  // tillbaka: hitta alla fem.
  _buildBook(ctx) {
    const board = new Container()
    board.eventMode = 'none'
    board.interactiveChildren = false
    const g = new Graphics()
    const h = BOOK_GAP * SPECIES.length + 26
    g.roundRect(-46, -44, 92, h, 20).fill(0xc79a68).stroke({ width: 5, color: 0x9a6f45 })
    g.roundRect(-38, -36, 76, h - 16, 14).fill({ color: 0xe6c79c, alpha: 0.75 })
    g.position.set(BOOK_X, BOOK_Y0)
    board.addChild(g)
    this._root.addChild(board)
    this._book = board

    const saved = ctx.progress.get().custom?.arter
    this._found = new Set(Array.isArray(saved) ? saved.filter((s) => SPECIES.includes(s)) : [])
    this._bookSlots = {}
    SPECIES.forEach((sp, i) => {
      const slot = new Container()
      slot.position.set(BOOK_X, BOOK_Y0 + i * BOOK_GAP)
      slot.eventMode = 'none'
      // tom plats = en mjuk skugg-silhuett, så man ser vad som fattas
      const ghost = new Graphics()
      ghost.circle(0, 0, 26).fill({ color: 0x8a6a4f, alpha: 0.22 })
      slot.addChild(ghost)
      slot._ghost = ghost
      board.addChild(slot)
      this._bookSlots[sp] = slot
      if (this._found.has(sp)) this._fillBookSlot(sp, false)
    })
  },

  // Sätt in artens ansikte i vänboken (animerat första gången den klappas).
  _fillBookSlot(species, celebrate = true) {
    const slot = this._bookSlots?.[species]
    if (!slot || slot.destroyed || slot._face) return
    const { node } = makeCritter(species)
    node.scale.set(0.5)
    node.y = 4
    slot.addChild(node)
    slot._face = node
    if (slot._ghost && !slot._ghost.destroyed) slot._ghost.alpha = 0
    if (celebrate) {
      gsap.fromTo(node.scale, { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5, duration: 0.45, ease: 'back.out(2.6)' })
      gsap.fromTo(slot, { rotation: -0.4 }, { rotation: 0, duration: 0.5, ease: 'back.out(2)' })
    }
  },

  // Fjärilen fladdrar längs staketet; nyckelpigan kryper. Båda exit-säkra proxy-tweens.
  _flutter(bf, ctx) {
    if (!bf) return
    const st = { x: bf.x, y: bf.y, w: 1 }
    const wing = gsap.to(st, {
      w: 0.35, duration: 0.16, yoyo: true, repeat: -1, ease: 'sine.inOut',
      onUpdate: () => { if (bf.destroyed) { wing.kill(); return } if (bf._wings) bf._wings.scale.x = st.w },
    })
    const hop = () => {
      if (!this._alive || bf.destroyed) return
      const tx = 120 + Math.random() * (ctx.width - 320)
      const ty = 150 + Math.random() * 70
      const tw = gsap.to(st, {
        x: tx, y: ty, duration: 2.4 + Math.random() * 2.2, ease: 'sine.inOut',
        onUpdate: () => {
          if (bf.destroyed) { tw.kill(); return }
          bf.position.set(st.x, st.y + Math.sin(st.x * 0.05) * 7)
          bf.scale.x = st.x > bf.x ? 1 : -1
        },
        onComplete: hop,
      })
      this._bugTweens.push(tw)
    }
    this._bugTweens = this._bugTweens || []
    this._bugTweens.push(wing)
    hop()
  },

  _crawl(lb, ctx) {
    if (!lb) return
    const st = { x: lb.x, y: lb.y }
    const step = () => {
      if (!this._alive || lb.destroyed) return
      const tx = 200 + Math.random() * (ctx.width - 420)
      const tw = gsap.to(st, {
        x: tx, duration: 3 + Math.random() * 3, ease: 'none', delay: 0.6 + Math.random(),
        onUpdate: () => {
          if (lb.destroyed) { tw.kill(); return }
          lb.x = st.x
          lb.rotation = Math.sin(st.x * 0.2) * 0.08
        },
        onComplete: step,
      })
      this._bugTweens.push(tw)
    }
    this._bugTweens = this._bugTweens || []
    step()
  },

  // Ett hål: rest jordhög med mjuk kant, mörk öppning och en (gömd) djur-wrap som
  // klipps av en mask vid hålkanten + en främre kant-måne ovanpå djuret.
  _makeHole(ctx) {
    const hole = new Container()

    const mound = new Graphics()
    mound.ellipse(0, 14, 108, 50).fill(0xb98a5f) // rest jord (skugga)
    mound.ellipse(0, 8, 108, 46).fill(0xc99a6c) // ljus ovansida
    mound.eventMode = 'none'
    hole.addChild(mound)

    const opening = new Graphics()
    opening.ellipse(0, 0, HOLE_RX, HOLE_RY).fill(0x4a3526).stroke({ width: 5, color: 0x6b4a30 })
    opening.ellipse(0, -3, 78, 31).fill(0x33251a) // inre skugga -> djup
    opening.eventMode = 'none'
    hole.addChild(opening)

    const wrap = new Container() // tweenas i y -> djuret "kommer upp ur hålet"
    wrap.y = MOLE_DOWN_Y
    wrap.eventMode = 'none'
    hole.addChild(wrap)

    // Mask: visar bara det som är ovanför hålets framkant (y <= +RY).
    const maskG = new Graphics().rect(-140, -320, 280, 320 + HOLE_RY).fill(0xffffff)
    maskG.eventMode = 'none'
    hole.addChild(maskG)
    wrap.mask = maskG

    // Främre kant-måne ovanpå djuret -> djuret ser ut att komma UR hålet.
    const lip = new Graphics()
    lip.moveTo(-HOLE_RX - 2, 2)
    lip.quadraticCurveTo(0, 56, HOLE_RX + 2, 2)
    lip.quadraticCurveTo(0, 38, -HOLE_RX - 2, 2)
    lip.fill(0x5a4326)
    lip.eventMode = 'none'
    hole.addChild(lip)

    hole._state = 'down' // 'down' | 'telling' | 'rising' | 'up' | 'patted' | 'ducking'
    hole._mound = mound
    hole._wrap = wrap
    hole._critter = null
    hole._eyes = null
    hole._mouth = null
    hole._cheeks = null
    hole._breatheTw = null
    hole._upElapsed = 0
    hole._blinkAcc = 0
    hole._blinkNext = 2

    hole.hitArea = new Circle(0, -30, 92) // träffyta 184px Ø (>= 96px)
    hole.eventMode = 'static'
    hole.cursor = 'pointer'
    hole.on('pointertap', (e) => {
      e.stopPropagation?.()
      if (hole._state === 'up') this._whack(ctx, hole)
      else this._softHole(ctx, hole)
    })

    return hole
  },

  // Sätt ett nytt, slumpat djur i hålets wrap (städar ev. gammalt först).
  _setCritter(hole) {
    if (hole._critter && !hole._critter.destroyed) {
      this._killCritterTweens(hole)
      hole._critter.destroy({ children: true })
    }
    const species = this._pickSpecies()
    hole._species = species
    const cr = makeCritter(species)
    // Sällsynt: en KUNGLIG varelse med guldkrona. Klappen ger extra gnistor + bonusstjärna.
    hole._royal = Math.random() < 0.09
    if (hole._royal) {
      const crown = makeCrown()
      crown.y = species === 'kanin' ? -74 : species === 'groda' ? -52 : -46
      cr.node.addChild(crown)
      gsap.to(crown, { rotation: 0.12, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      hole._crown = crown
    } else {
      hole._crown = null
    }
    hole._critter = cr.node
    hole._eyes = cr.eyes
    hole._mouth = cr.mouth
    hole._cheeks = cr.cheeks
    hole._back = cr.back
    hole._wrap.addChild(cr.node)
  },

  // Välj art ur mixen för aktuell nivå (mullvaden väger lite tyngre — det är ju den).
  _pickSpecies() {
    if (Math.random() < 0.4) return 'mullvad'
    return randomFrom(SPECIES.slice(0, this._p.variety))
  },

  // "Tell" innan uppdyk: jorden buktar/skakar ~0,4 s så barnet hinner förvänta sig och
  // sikta (bygger spänning utan tidspress). Efteråt reser sig djuret ur just det hålet.
  _tell(ctx, hole) {
    if (!this._alive || hole.destroyed || hole._state !== 'down') return
    hole._state = 'telling'
    const m = hole._mound
    gsap.killTweensOf(m.scale)
    gsap.to(m.scale, { x: 0.95, y: 1.14, duration: 0.1, yoyo: true, repeat: 3, ease: 'sine.inOut' })
    puff(this._fx, hole.x, hole.y + 10, { count: 3, color: DIRT })
    // ctx.later: dör med spelomgången (en delayedCall skulle överleva destroy och köra
    // mot ett förstört hål när samma spel startas igen).
    ctx.later(0.4, () => {
      if (!this._alive || hole.destroyed) return
      if (m && !m.destroyed) m.scale.set(1)
      if (hole._state !== 'telling') return
      if (this._roundDone) hole._state = 'down'
      else {
        hole._state = 'down' // _raise kräver 'down'
        this._raise(hole)
      }
    })
  },

  // Res ett gömt djur upp — VARJE ART PÅ SITT SÄTT (se BEHAVIOR): kaninen skuttar högt
  // och studsar två gånger, musen kikar blixtsnabbt fram, grodan hoppar över hålkanten,
  // igelkotten kommer långsamt och stannar länge, mullvaden lugnt mittemellan.
  _raise(hole) {
    if (!this._alive || hole.destroyed || hole._state !== 'down') return
    this._setCritter(hole)
    hole._state = 'rising'
    hole._upElapsed = 0
    hole._blinkAcc = 0
    hole._blinkNext = 1.4 + Math.random() * 2.4

    const bh = BEHAVIOR[hole._species] || BEHAVIOR.mullvad
    hole._bh = bh
    puff(this._fx, hole.x, hole.y + 12, { count: 5, color: DIRT })

    // Squash -> stretch -> vila (livfullt uppdyk).
    hole._critter.scale.set(0.72, 0.55)
    gsap.killTweensOf(hole._critter.scale)
    gsap
      .timeline()
      .to(hole._critter.scale, { x: 1.06, y: 1.08, duration: bh.rise * 0.62, ease: 'back.out(2)' })
      .to(hole._critter.scale, { x: 1, y: 1, duration: 0.14, ease: 'sine.out' })

    const upY = MOLE_UP_Y - bh.lift
    gsap.killTweensOf(hole._wrap)
    const tl = gsap.timeline({
      onComplete: () => {
        if (!this._alive || hole.destroyed) return
        if (hole._state !== 'rising') return
        hole._state = 'up'
        hole._upElapsed = 0
        // Lugn andning för att locka en klapp.
        hole._breatheTw = breathe(hole._critter, { scale: 1.05, duration: 1.0 })
      },
    })
    tl.to(hole._wrap, { y: upY, duration: bh.rise, ease: bh.ease })
    // Kaninen/grodan studsar ett par gånger innan de står stilla.
    for (let i = 0; i < (bh.hops || 0); i++) {
      tl.to(hole._wrap, { y: upY - 18, duration: 0.16, ease: 'power2.out' })
      tl.to(hole._wrap, { y: upY, duration: 0.2, ease: 'bounce.out' })
    }
    hole._riseTl = tl
  },

  // Dyk ner igen (auto efter uppe-tid). Aldrig en "miss".
  _duck(hole, { delay = 0, duration = 0.34 } = {}) {
    if (!hole || hole.destroyed) return
    hole._breatheTw?.kill()
    hole._breatheTw = null
    hole._riseTl?.kill()
    hole._state = 'ducking'
    gsap.killTweensOf(hole._wrap)
    gsap.to(hole._wrap, {
      y: MOLE_DOWN_Y,
      delay,
      duration,
      ease: 'power2.in',
      onComplete: () => {
        if (this._alive && hole._state === 'ducking') hole._state = 'down'
      },
    })
  },

  // En snabb blinkning på det uppe-djurets ögon.
  _blink(hole) {
    const eyes = hole._eyes
    if (!eyes || eyes.destroyed) return
    gsap.killTweensOf(eyes.scale)
    gsap
      .timeline()
      .to(eyes.scale, { y: 0.12, duration: 0.06, ease: 'power1.in' })
      .to(eyes.scale, { y: 1, duration: 0.12, ease: 'power1.out' })
  },

  // Glad min: rosiga kinder, kisande ögon, större leende.
  _setHappy(hole) {
    if (hole._cheeks) {
      gsap.killTweensOf(hole._cheeks)
      gsap.to(hole._cheeks, { alpha: 1, duration: 0.12 })
    }
    if (hole._eyes) {
      gsap.killTweensOf(hole._eyes.scale)
      gsap.to(hole._eyes.scale, { y: 0.5, duration: 0.1 })
    }
    if (hole._mouth) {
      gsap.killTweensOf(hole._mouth.scale)
      gsap.to(hole._mouth.scale, { x: 1.3, y: 1.3, duration: 0.14, ease: 'back.out(2)' })
    }
  },

  // Artens egen röst vid klapp: riktigt inspelat läte om det finns (t.ex. grodan), annars
  // ett sött litet stigande "pip" med egen tonhöjd per art — aldrig TTS "Hihi!".
  _critterSound(ctx, species) {
    const key = SAMPLE_FOR[species]
    if (key && ctx.services.audio.sample(key)) return
    const base = PIP_FOR[species] || 660
    ctx.services.audio.tone({ freq: base, dur: 0.14, type: 'triangle', vol: 0.5, slideTo: base * 1.5 })
  },

  // Lyckad klapp på ett uppe-djur: direkt-juice (<100ms) + glatt fniss + nerdyk. Allt är "rätt".
  _whack(ctx, hole) {
    if (!this._alive || hole.destroyed || this._roundDone || hole._state !== 'up') return
    this._idle = 0
    hole._breatheTw?.kill()
    hole._breatheTw = null
    hole._riseTl?.kill()
    hole._state = 'patted'

    const cx = hole.x
    const cy = hole.y + MOLE_UP_Y - (hole._bh?.lift || 0)

    ctx.services.audio.sfx('pop') // taktil klapp-plopp
    this._critterSound(ctx, hole._species) // + riktigt djurläte/pip som "fniss"
    ripple(this._fx, cx, cy, { color: 0xffffff, maxR: 84 })
    pop(hole._critter)
    wiggle(hole._critter)
    this._setHappy(hole)
    sparkle(this._fx, cx, cy - 8)
    floatText(this._fx, cx, cy - 42, randomFrom(JOY), { fontSize: 46, rise: 72 })
    puff(this._fx, hole.x, hole.y + 8, { count: 7, color: DIRT })

    // Igelkotten reser taggarna när den klappas — artens egen reaktion.
    if (hole._species === 'igelkott' && hole._back && !hole._back.destroyed) {
      gsap.killTweensOf(hole._back.scale)
      gsap.to(hole._back.scale, {
        x: 1.16, y: 1.3, duration: 0.12, yoyo: true, repeat: 1, ease: 'back.out(3)',
        onComplete: () => { if (hole._back && !hole._back.destroyed) hole._back.scale.set(1) },
      })
    }

    // Kunglig varelse: eget wow-ögonblick (extra gnistor + bonusstjärna + gladare ton).
    if (hole._royal) {
      ctx.services.audio.sfx('reveal')
      sparkle(ctx.fxLayer, cx, cy - 30, { count: 14 })
      burst(this._fx, cx, cy - 10, { count: 16, colors: [0xffd24a, 0xffe27a, 0xfff3b0], power: 1.2 })
      ctx.progress.addStars(1)
      hole._royal = false
    }

    // Vänboken: första gången en art klappas hänger dess ansikte upp på tavlan — och
    // stannar där mellan spelomgångar.
    const sp = hole._species
    if (sp && !this._found.has(sp)) {
      this._found.add(sp)
      ctx.progress.setCustom('arter', [...this._found])
      this._fillBookSlot(sp, true)
      ctx.services.voice.say(`Du hittade ${SPECIES_NAME[sp]}!`)
      sparkle(ctx.fxLayer, BOOK_X, BOOK_Y0 + SPECIES.indexOf(sp) * BOOK_GAP, { count: 10 })
      if (this._found.size === SPECIES.length) {
        ctx.later(1.2, () => { if (this._alive) ctx.services.voice.say('Alla djuren är med i boken!') })
      }
    }

    // Glad liten studs uppåt -> dyk lugnt ner igen.
    gsap.killTweensOf(hole._wrap)
    gsap
      .timeline()
      .to(hole._wrap, { y: MOLE_UP_Y - (hole._bh?.lift || 0) - 22, duration: 0.16, ease: 'power2.out' })
      .to(hole._wrap, {
        y: MOLE_DOWN_Y,
        duration: 0.34,
        delay: 0.12,
        ease: 'power2.in',
        onComplete: () => {
          if (this._alive && hole._state === 'patted') hole._state = 'down'
        },
      })

    this._patted++
    const paw = this._paws[this._patted - 1]
    if (paw) {
      paw.alpha = 1
      pop(paw)
    }

    if (this._patted >= this._p.goal) {
      this._finishRound(ctx)
    } else if (this._patted % 3 === 0) {
      ctx.services.voice.say(randomFrom(GENTLE))
    }
  },

  // Tomt tryck i ett hål (inget djur uppe): mjuk, lekfull respons + jordpuff.
  _softHole(ctx, hole) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    ripple(this._fx, hole.x, hole.y, { color: 0xffe6b0, maxR: 60, alpha: 0.4 })
    puff(this._fx, hole.x, hole.y + 6, { count: 6, color: DIRT })
    pop(hole, { scale: 1.05 })
  },

  // Tomt tryck på ängen: mjukt ljud + liten ring + studs på närmaste hål. Aldrig fel.
  _emptyTap(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    const p = this._fx.toLocal(e.global)
    ripple(this._fx, p.x, p.y, { color: 0xffffff, maxR: 50, alpha: 0.35 })
    let nearest = null
    let best = Infinity
    for (const h of this._holes || []) {
      const d = (h.x - p.x) ** 2 + (h.y - p.y) ** 2
      if (d < best) {
        best = d
        nearest = h
      }
    }
    if (nearest) wiggle(nearest)
  },

  // Rundans mål nått: gör djuren glada (firande via complete) + mjuk skakning + ny livligare runda.
  _finishRound(ctx) {
    this._roundDone = true
    this._holes.forEach((h) => {
      if (h._state !== 'down') this._duck(h)
    })
    // complete() ger redan: celebrate-ljud + beröm + konfetti + stjärna + klistermärke.
    ctx.progress.complete()
    // Egen, icke-dubblerande extra-juice: mjuk skakning + en liten skur.
    shake(this._root, { intensity: 6, duration: 0.45 })
    burst(ctx.fxLayer, ctx.width / 2, ctx.height * 0.45, { count: 18, power: 1.2 })

    this._level += 1
    ctx.progress.setLevel(this._level)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    ctx.later(1.8, () => {
      if (this._alive) this._buildField(ctx)
    })
  },

  // Försök resa ett djur upp (respekterar "samtidigt uppe"-cap).
  _trySpawn(ctx) {
    if (!this._alive || this._roundDone) return
    const occupied = this._holes.filter((h) => h._state !== 'down').length
    if (occupied >= this._p.cap) return
    const down = this._holes.filter((h) => h._state === 'down')
    if (down.length) this._tell(ctx, randomFrom(down))
  },

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000

    // Idle-recue: ~6 s tystnad -> upprepa instruktionen och locka fram ett djur.
    this._idle += dt
    if (this._idle > 6 && !this._roundDone) {
      this._idle = 0
      ctx.services.voice.say(randomFrom(IDLE))
      this._trySpawn(ctx)
    }

    if (this._roundDone) return // pausa spawn medan vi firar

    // Uppe-djur blinkar då och då och dyker lugnt ner av sig själva i tid.
    for (const h of this._holes) {
      if (h._state === 'up') {
        h._upElapsed += dt
        h._blinkAcc += dt
        if (h._blinkAcc >= h._blinkNext) {
          h._blinkAcc = 0
          h._blinkNext = 2.4 + Math.random() * 3
          this._blink(h)
        }
        // Uppe-tiden skalas av artens temperament: musen kikar snabbt, igelkotten dröjer.
        if (h._upElapsed >= this._p.upTime * (h._bh?.up || 1)) this._duck(h)
      }
    }

    // Spawn-timer via ackumulerad tid (fryser/städas korrekt med tickern).
    this._spawnAcc += dt
    if (this._spawnAcc >= this._p.spawnEvery) {
      this._spawnAcc = 0
      this._trySpawn(ctx)
    }
  },

  _killCritterTweens(hole) {
    hole._breatheTw?.kill()
    if (hole._critter) {
      gsap.killTweensOf(hole._critter)
      gsap.killTweensOf(hole._critter.scale)
    }
    if (hole._eyes) {
      gsap.killTweensOf(hole._eyes)
      gsap.killTweensOf(hole._eyes.scale)
    }
    if (hole._mouth) {
      gsap.killTweensOf(hole._mouth)
      gsap.killTweensOf(hole._mouth.scale)
    }
    if (hole._cheeks) gsap.killTweensOf(hole._cheeks)
    if (hole._back) gsap.killTweensOf(hole._back.scale)
    if (hole._crown) gsap.killTweensOf(hole._crown)
  },

  _killHoleTweens(hole) {
    gsap.killTweensOf(hole)
    gsap.killTweensOf(hole.scale)
    hole._riseTl?.kill()
    if (hole._wrap) gsap.killTweensOf(hole._wrap)
    if (hole._mound) gsap.killTweensOf(hole._mound.scale)
    this._killCritterTweens(hole)
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx.ticker.remove(this._tick)
    this._holes?.forEach((h) => this._killHoleTweens(h))
    this._paws?.forEach((p) => {
      gsap.killTweensOf(p)
      gsap.killTweensOf(p.scale)
    })
    // Fjäril/nyckelpiga går i oändliga kedjor — deras tweens måste dödas explicit.
    this._bugTweens?.forEach((t) => t?.kill())
    this._bugTweens = []
    this._bugs?.forEach((b) => { gsap.killTweensOf(b); if (b._wings) gsap.killTweensOf(b._wings.scale) })
    this._bugs = []
    Object.values(this._bookSlots || {}).forEach((s) => {
      gsap.killTweensOf(s)
      if (s._face) gsap.killTweensOf(s._face.scale)
    })
    this._bookSlots = {}
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}

// --- Ritad ängsdekor (P0 ASSETS: riktiga föremål, aldrig en emoji som hela föremålet) ---

// En växt med egen silhuett: tulpan, prästkrage, klöver eller liten grodd.
function makePlant(kind, color, x, y) {
  const g = new Graphics()
  if (kind === 'tulpan') {
    g.moveTo(0, 34).quadraticCurveTo(-6, 12, 0, -4).stroke({ width: 5, color: 0x4fae51, cap: 'round' })
    g.ellipse(-13, 16, 12, 6).fill(0x4fae51)
    g.ellipse(13, 22, 12, 6).fill(0x4fae51)
    g.moveTo(-13, -4).quadraticCurveTo(-15, -30, 0, -34).quadraticCurveTo(15, -30, 13, -4)
      .quadraticCurveTo(0, 6, -13, -4).fill(color)
    g.moveTo(-4, -6).quadraticCurveTo(-6, -28, 0, -33).stroke({ width: 2, color: 0xffffff, alpha: 0.35 })
  } else if (kind === 'prastkrage') {
    g.moveTo(0, 36).quadraticCurveTo(5, 14, 0, -2).stroke({ width: 5, color: 0x4fae51, cap: 'round' })
    g.ellipse(12, 18, 11, 6).fill(0x4fae51)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      g.ellipse(Math.cos(a) * 15, -4 + Math.sin(a) * 15, 9, 6).fill(color)
    }
    g.circle(0, -4, 8).fill(0xffd35c)
  } else if (kind === 'klover') {
    g.moveTo(0, 32).quadraticCurveTo(-5, 14, 0, 2).stroke({ width: 4, color: 0x3f8f43, cap: 'round' })
    for (const [hx, hy] of [[-12, -8], [12, -8], [0, -20], [0, 4]]) {
      g.circle(hx, hy, 10).fill(color)
      g.circle(hx, hy, 5).fill({ color: 0x8fd67a, alpha: 0.5 })
    }
  } else {
    // liten grodd i en jordkulle
    g.ellipse(0, 22, 22, 9).fill(0xb98a5f)
    g.moveTo(0, 22).lineTo(0, -6).stroke({ width: 4, color: color, cap: 'round' })
    g.ellipse(-12, -2, 13, 8).fill(color)
    g.ellipse(12, -10, 13, 8).fill(color)
  }
  g.position.set(x, y)
  g.eventMode = 'none'
  return g
}

// Fjäril med egna vingar (två par + kropp + antenner).
function makeButterfly(x, y) {
  const c = new Container()
  const wings = new Graphics()
  wings.ellipse(-15, -8, 15, 12).fill(0xff8a3d)
  wings.ellipse(15, -8, 15, 12).fill(0xff8a3d)
  wings.ellipse(-12, 9, 11, 9).fill(0xffb37a)
  wings.ellipse(12, 9, 11, 9).fill(0xffb37a)
  wings.circle(-16, -9, 4).fill({ color: 0x4a3526, alpha: 0.55 })
  wings.circle(16, -9, 4).fill({ color: 0x4a3526, alpha: 0.55 })
  const body = new Graphics()
  body.ellipse(0, 0, 4, 15).fill(0x4a3526)
  body.moveTo(-2, -13).quadraticCurveTo(-9, -24, -11, -26).stroke({ width: 1.6, color: 0x4a3526 })
  body.moveTo(2, -13).quadraticCurveTo(9, -24, 11, -26).stroke({ width: 1.6, color: 0x4a3526 })
  c.addChild(wings, body)
  c._wings = wings
  c.position.set(x, y)
  c.eventMode = 'none'
  return c
}

// Nyckelpiga med skal, prickar och delningslinje.
function makeLadybug(x, y) {
  const c = new Container()
  const g = new Graphics()
  g.ellipse(0, 2, 17, 14).fill(0xd93b4a)
  g.circle(0, -10, 9).fill(0x33291f)
  g.moveTo(0, -6).lineTo(0, 15).stroke({ width: 2, color: 0x33291f })
  for (const [dx, dy] of [[-9, -1], [9, -1], [-6, 9], [6, 9], [0, 4]]) g.circle(dx, dy, 3.4).fill(0x33291f)
  g.circle(-4, -15, 1.8).fill(0xffffff)
  g.circle(4, -15, 1.8).fill(0xffffff)
  c.addChild(g)
  c.position.set(x, y)
  c.eventMode = 'none'
  return c
}

// Ett ritat tassavtryck (ersätter 🐾-emojin i räknar-raden).
function makePaw(color = 0x8a6a4f) {
  const g = new Graphics()
  g.ellipse(0, 6, 11, 9).fill(color)
  g.ellipse(-11, -6, 5, 6).fill(color)
  g.ellipse(-4, -11, 5, 6).fill(color)
  g.ellipse(4, -11, 5, 6).fill(color)
  g.ellipse(11, -6, 5, 6).fill(color)
  g.eventMode = 'none'
  return g
}

// En liten guldkrona som den sällsynta "kungliga" varelsen bär.
function makeCrown() {
  const g = new Graphics()
  g.moveTo(-20, 0).lineTo(-20, -14).lineTo(-10, -5).lineTo(0, -19).lineTo(10, -5).lineTo(20, -14).lineTo(20, 0)
    .closePath().fill(topLightFill(0xffd24a)).stroke({ width: 2, color: 0xd9a021 })
  g.circle(0, -19, 3.6).fill(0xff6b6b)
  g.circle(-20, -14, 3).fill(0x57c8c3)
  g.circle(20, -14, 3).fill(0x57c8c3)
  g.eventMode = 'none'
  return g
}

// --- Söta djur, ritade med Pixi Graphics (inga bildtillgångar krävs) ---

// Ett kisande-bart öga: vit sclera + mörk pupill + liten glansprick.
function eye(x, r = 7) {
  const g = new Graphics()
  g.circle(0, 0, r).fill(0xffffff)
  g.circle(0.5, 1, r * 0.62).fill(0x33291f)
  g.circle(-1.6, -1, r * 0.24).fill(0xffffff)
  g.position.set(x, 0)
  return g
}

// Ett leende (ritat runt eget origo så det kan skalas från mitten).
function smile(color = 0x6b4a36, w = 12, drop = 11) {
  const g = new Graphics()
  g.moveTo(-w, 0).quadraticCurveTo(0, drop, w, 0).stroke({ width: 4, color, cap: 'round' })
  return g
}

// Bygg ett djur. Returnerar { node, eyes, mouth, cheeks } för animering.
// node-origo = mitt; kropp sträcker sig nedåt och klipps av hålkanten/masken.
function makeCritter(type) {
  const node = new Container()
  node.eventMode = 'none'
  const back = new Graphics() // öron/taggar bakom kroppen
  const body = new Graphics()
  const face = new Container()
  face.eventMode = 'none'
  node.addChild(back, body, face)

  const eyes = new Container()
  const cheeks = new Container()
  cheeks.alpha = 0
  for (const s of [-1, 1]) cheeks.addChild(new Graphics().circle(s * 23, 12, 8).fill({ color: 0xff9ec4, alpha: 0.8 }))
  let mouth = null

  if (type === 'kanin') {
    for (const s of [-1, 1]) {
      const ear = new Graphics()
      ear.ellipse(0, -24, 11, 32).fill(0xf4ede3)
      ear.ellipse(0, -24, 6, 23).fill(0xf6c2d3)
      ear.position.set(s * 15, -38)
      ear.rotation = s * 0.16
      back.addChild(ear)
    }
    body.ellipse(0, 6, 44, 50).fill(0xf4ede3)
    body.ellipse(0, 20, 26, 24).fill(0xfffaf3)
    eyes.addChild(eye(-15, 7), eye(15, 7))
    eyes.position.set(0, -10)
    const nose = new Graphics().ellipse(0, 4, 4.5, 3.5).fill(0xe79ab0)
    mouth = smile(0xc98aa0, 9, 8)
    mouth.position.set(0, 12)
    face.addChild(nose, cheeks, eyes, mouth)
  } else if (type === 'igelkott') {
    const cap = (color, yo) => {
      const g = new Graphics()
      for (let i = -3; i <= 3; i++) {
        const x = i * 13
        g.poly([x - 9, 8 + yo, x, -36 + yo, x + 9, 8 + yo]).fill(color)
      }
      return g
    }
    back.addChild(cap(0x5a3f29, 4), cap(0x6e4f33, -3))
    body.ellipse(0, 12, 42, 44).fill(0xd9b48a)
    body.ellipse(0, 22, 26, 22).fill(0xeccfa8)
    eyes.addChild(eye(-13, 6.5), eye(13, 6.5))
    eyes.position.set(0, -2)
    const nose = new Graphics().ellipse(0, 12, 5, 4).fill(0x3a2a1d)
    mouth = smile(0x6e4f33, 9, 8)
    mouth.position.set(0, 22)
    face.addChild(nose, cheeks, eyes, mouth)
  } else if (type === 'mus') {
    for (const s of [-1, 1]) {
      const ear = new Graphics()
      ear.circle(0, 0, 19).fill(0xb3ada4)
      ear.circle(0, 0, 12).fill(0xf6c2d3)
      ear.position.set(s * 26, -32)
      back.addChild(ear)
    }
    body.ellipse(0, 6, 44, 48).fill(0xc3beb6)
    body.ellipse(0, 20, 26, 22).fill(0xe2ded7)
    eyes.addChild(eye(-14, 7), eye(14, 7))
    eyes.position.set(0, -8)
    const nose = new Graphics().ellipse(0, 6, 4.5, 3.5).fill(0xe79ab0)
    const wk = new Graphics()
    for (const s of [-1, 1]) {
      wk.moveTo(s * 6, 8).lineTo(s * 30, 4).stroke({ width: 1.5, color: 0x8a857d })
      wk.moveTo(s * 6, 11).lineTo(s * 30, 12).stroke({ width: 1.5, color: 0x8a857d })
    }
    mouth = smile(0x8a685a, 8, 7)
    mouth.position.set(0, 14)
    face.addChild(wk, nose, cheeks, eyes, mouth)
  } else if (type === 'groda') {
    body.ellipse(0, 10, 46, 46).fill(0x76c463)
    body.ellipse(0, 24, 30, 22).fill(0xa8de8f)
    for (const s of [-1, 1]) back.circle(s * 22, -30, 17).fill(0x76c463) // ögonkullar
    for (const s of [-1, 1]) {
      const e = new Graphics()
      e.circle(0, 0, 13).fill(0xffffff)
      e.circle(0, 2, 7).fill(0x2a2320)
      e.circle(-2.5, -1.5, 3).fill(0xffffff)
      e.position.set(s * 22, -30)
      eyes.addChild(e)
    }
    const nostrils = new Graphics()
    nostrils.circle(-5, -2, 1.6).fill(0x3a6b2f)
    nostrils.circle(5, -2, 1.6).fill(0x3a6b2f)
    mouth = smile(0x2f6b2a, 20, 12)
    mouth.position.set(0, 16)
    face.addChild(nostrils, cheeks, eyes, mouth)
  } else {
    // mullvad (standard)
    body.ellipse(0, 6, 46, 50).fill(0x9c7c5f)
    body.ellipse(0, 20, 26, 24).fill(0xb89a7d)
    body.circle(-34, 30, 9).fill(0x88684c) // små händer
    body.circle(34, 30, 9).fill(0x88684c)
    const snout = new Graphics()
    snout.ellipse(0, 8, 13, 10).fill(0xeaa1b6)
    snout.circle(-3.5, 8, 1.7).fill(0x7a4a55)
    snout.circle(3.5, 8, 1.7).fill(0x7a4a55)
    eyes.addChild(eye(-13, 5.5), eye(13, 5.5))
    eyes.position.set(0, -8)
    mouth = snout // glad min skalar nosen
    face.addChild(snout, cheeks, eyes)
  }

  return { node, eyes, mouth, cheeks, back }
}
