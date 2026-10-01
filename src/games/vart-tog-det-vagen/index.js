// Vart Tog Det Vägen? — det klassiska kopp-spelet ("hitta bollen") för 3–5 år, som en liten
// trolleriföreställning. Trollkarls-Bobo står vid bordet under en spotlight, lyfter kopparna
// med sin stav, visar leksaken, blandar i takt med att kopparna byter plats — och jublar när
// barnet hittar den. Hittade leksaker flyger upp på en hylla som fylls över rundorna.
//
// En leksak göms under en av kopparna, kopparna byter plats i lugna svep och barnet följer med
// blicken och trycker på rätt kopp. Rätt kopp lyfts och leksaken hoppar fram (firande); fel
// kopp lyfts lite, visar tom plats och får trycka igen — aldrig ett "fel". Ingen poäng, ingen
// timer, inget slut.
//
// Svårigheten växer med nivån (var 3:e lyckad runda):
//   • FLER KOPPAR: 3 från start, +1 var tredje nivå (nivå 3 -> 4, nivå 6 -> 5).
//   • SAMMA RÖDA FÄRG: från nivå 3 är alla koppar likadant röda, så barnet inte
//     längre kan följa en kopp på dess färg utan måste följa rörelsen.
//   • FLER/SNABBARE BYTEN: antal byten och tempo ökar mjukt med nivån.
// Allt är fortfarande no-fail: fel tryck är lekfullt och idle ger auto-hjälp.
//
// Layout (1280×720): ridåer i sidorna, lampa i taket, bordet i mitten (muggarna på x 280–1030,
// y 270–550), Bobo till vänster om bordet (x 92 — utanför varje muggs träffyta), hyllan längst
// ner (y 590–714, inte under skalets knappar som sitter uppe i hörnen, y < 110).
// Allt ritas programmatiskt (Pixi Graphics), inga externa filer.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { drawIcon } from '../../lib/artikoner.js'
import { gsap } from 'gsap'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { pop, wiggle, sparkle, liv } from '../../lib/feedback.js'
import { COLORS, PRAISE } from '../../lib/theme.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'
import { cylinderFill } from '../../lib/form.js'
import { byggBakgrund, byggStjarnor, byggLjuskegla, byggRida, byggBord, CENTER } from './scen.js'
import { makeTrollkarl, spetsGlobal, armTill, snart } from './trollkarl.js'
import { Hylla } from './hylla.js'
import { valjEgna, byggEgenFigur, presentera } from '../../lib/egnafigurer.js'

const BASE_Y = 470 // y-referenslinje: koppen nedsänkt på bordet
const LIFT_Y = BASE_Y - 120 // koppens y i lyft-läge (visa/kika)
const PEEK_Y = BASE_Y - 60 // litet lyft vid fel gissning (visar tom plats)
const ROUNDS_PER_LEVEL = 3
const HYLLA_MAX = 11 // platser på brädan (plats 10 slutar på x 1156)
const HYLLA_FIG_MAX = 3 // högst tre figurer på brädan — resten av platserna är leksakernas
// Trumvirvelns avstånd mellan tickarna (s) — tätnar mot slutet, 0,645 s totalt.
const VIRVEL_GAP = [0.11, 0.1, 0.09, 0.08, 0.07, 0.06, 0.05, 0.045, 0.04]

// Layout: koppar centreras kring CENTER och sprids med jämnt mellanrum (max
// MAX_SPACING) men hålls inom bordets bredd (SPAN) även när det blir fler. Fem koppar
// ritas i 85 % storlek så att de får plats mellan Bobo och bordets högerkant.
const MAX_SPACING = 240
const SPAN = 740
const SMALL_CUP_K = 0.85

// Bobo står vänster om bordet. Hans högra arm med stav når som mest x≈190 när den är
// utsträckt, och den vänstra muggens träffyta börjar först vid x≈186.
const BOBO_X = 92
const BOBO_Y = 448

// Svårighetsparametrar per nivå (saturerar — högre nivå gör inte spelet hårdare).
const BASE_CUPS = 3 // antal koppar på nivå 0–2
const MAX_CUPS = 5 // tak (håller pekytor och layout rena)
const MAX_SWAPS = 7
const MIN_SWAP_DUR = 0.36
const RED_LEVEL = 3 // från denna nivå: alla koppar samma röda färg
const MAX_LEVEL = 9 // tak på sparad nivå (parametrarna är ändå maxade här)

const PRIZES = ['🐥', '⭐', '🍓', '🐸', '🚗', '🎈', '🐱', '🌟', '🦋', '🍎']
// Distinkta färger används bara på nivå 0–2 (3 koppar). Från nivå 3 blir alla röda.
const CUP_COLORS = [COLORS.red, COLORS.blue, COLORS.yellow, COLORS.green, COLORS.purple]

export default {
  id: 'vart-tog-det-vagen',
  titleSv: 'Vart Tog Det Vägen?',
  icon: '🥤',
  category: 'minne',
  input: 'tap',
  ageRange: [3, 5],
  bundle: 'vart-tog-det-vagen',
  voiceIntro: 'Titta noga! Var är leksaken? Tryck på rätt kopp.',

  init(ctx) {
    this._alive = true
    this._ctx = ctx
    this._phase = 'reveal' // reveal | shuffle | guess | resolving
    this._resolving = false
    this._roundsDone = 0
    this._rundaNr = 0
    this._idleCues = 0
    this._hyllaBusy = false
    this._flyer = null
    this._flyTw = null
    this._figur = null // barnets figur som pris just nu (ägs av spelet tills den står på hyllan)
    this._shuffleTl = null
    this._lastInteract = performance.now()
    const sparat = ctx.progress.get()
    this._level = clampLevel(sparat.highestLevel | 0)
    // Hittade leksaker ur sparet: bara kända nycklar, varje högst en gång.
    const lista = Array.isArray(sparat.custom?.hittade) ? sparat.custom.hittade : []
    this._hittade = lista.filter((k, i) => PRIZES.includes(k) && lista.indexOf(k) === i)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    this._build(ctx)

    this._tick = () => this._update(ctx)
    ctx.ticker.add(this._tick)

    this._newRound(ctx)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
  },

  // Bygg den persistenta scenen en gång: teater, bord, Bobo, hylla, leksak.
  // Själva kopparna (antal + färg) byggs/ombyggs av _ensureLayout per nivå.
  _build(ctx) {
    const root = this._root
    root.addChild(byggBakgrund())
    this._stjarnor = byggStjarnor()
    root.addChild(this._stjarnor)
    this._stjarnTw = gsap.to(this._stjarnor, { alpha: 0.5, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' })

    // Fångar "tomt tryck" -> mjukt ljud (aldrig "fel"). Full bleed: täcker även telefonens
    // kantremsor utanför 16:9. Nästan genomskinlig, inte osynlig-av-`visible`, så den träffas.
    const fang = new Graphics()
    fang.rect(-BLEED_X, -BLEED_Y, 1280 + BLEED_X * 2, 720 + BLEED_Y * 2).fill({ color: 0x000000, alpha: 0.001 })
    fang.eventMode = 'static'
    fang.on('pointertap', () => this._emptyTap(ctx))
    root.addChild(fang)

    root.addChild(byggLjuskegla())
    root.addChild(byggRida())
    root.addChild(byggBord())

    // Mjuka skuggor under varje plats (ritas om per layout).
    this._shadows = new Graphics()
    this._shadows.eventMode = 'none'
    this._shadows.interactiveChildren = false
    root.addChild(this._shadows)

    // Trollkarls-Bobo vänster om bordet.
    this._bobo = makeTrollkarl(52)
    this._bobo.view.position.set(BOBO_X, BOBO_Y)
    root.addChild(this._bobo.view)

    // Hyllan med hittade leksaker (osynlig tills första fyndet).
    this._hylla = new Hylla(root, { onTap: () => this._hyllaTap(ctx) })
    for (const k of this._hittade) this._hylla.laggTill(k)

    // Behållare för den RITADE leksaken (ikon + skugga), återanvänds varje runda.
    this._prize = new Container()
    this._prize.eventMode = 'none'
    this._prize.position.set(CENTER, BASE_Y)
    root.addChild(this._prize)

    this._cups = []
    this._slots = []
    this._layoutKey = null
  },

  // Bygg om kopparna om antal/färg ändrats sedan förra rundan. Kopparna ligger
  // alltid överst i z-led (framför skuggor + leksak), så leksaken döljs när koppen
  // är nere och syns när den lyfts.
  _ensureLayout(ctx, params) {
    const key = params.cups + (params.allRed ? ':r' : ':c')
    if (this._layoutKey === key && this._cups.length === params.cups) return
    this._layoutKey = key
    this._slots = computeSlots(params.cups)
    const k = params.cups >= MAX_CUPS ? SMALL_CUP_K : 1
    const spacing = params.cups > 1 ? this._slots[1] - this._slots[0] : MAX_SPACING
    // Träffytan är kopparnas bredd men aldrig så bred att grannarna närmare än 26 px.
    const halv = Math.min(105, (spacing - 26) / 2)

    // Riv gamla koppar (döda tweens först — spelaren kan ha hunnit avsluta).
    this._cups.forEach((cup) => this._rivKopp(cup))
    this._cups = []

    // Rita om skuggorna under de nya platserna.
    this._shadows.clear()
    for (const x of this._slots) {
      this._shadows.ellipse(x, BASE_Y + 58 * k, 96 * k, 20 * k).fill({ color: 0x000000, alpha: 0.2 })
    }

    // Bygg kopparna. Från RED_LEVEL är alla samma röda; annars distinkta färger.
    for (let i = 0; i < params.cups; i++) {
      const color = params.allRed ? COLORS.red : CUP_COLORS[i % CUP_COLORS.length]
      const cup = this._makeCup(color, k)
      cup._slot = i
      cup._peeking = false
      cup.position.set(this._slots[i], BASE_Y)
      cup.eventMode = 'static'
      cup.cursor = 'pointer'
      // Generös träffyta (≥160 px bred, 250+ hög ≫ 96px) så även kanttryck registreras.
      cup.hitArea = new Rectangle(-halv, -200 * k, halv * 2, 280 * k)
      cup.on('pointertap', () => this._onTap(ctx, cup))
      this._root.addChild(cup)
      this._cups.push(cup)
    }
  },

  _rivKopp(cup) {
    if (!cup) return
    gsap.killTweensOf(cup)
    gsap.killTweensOf(cup.scale)
    cup._fxWiggleTl?.kill()
    cup._fxPopTl?.kill()
    cup._g?._fxLiv?.kill()
    if (cup._g) gsap.killTweensOf(cup._g)
    if (!cup.destroyed) cup.destroy({ children: true })
  },

  // Upp-och-nedvänd kopp: trapets-kropp (smalare topp) + rundad topp + glansremsa.
  // Lokalt origo = referenslinjen; kroppen går från y=-190k (topp) till y=+60k (rim).
  _makeCup(color, k = 1) {
    const cup = new Container()
    const topW = 150 * k
    const botW = 200 * k
    const top = -190 * k
    const bot = 60 * k
    const g = new Graphics()
    g.moveTo(-topW / 2, top)
      .lineTo(topW / 2, top)
      .lineTo(botW / 2, bot)
      .lineTo(-botW / 2, bot)
      .closePath()
      // En upp-och-nedvänd mugg ÄR en cylinder sedd från sidan: ljus längs mittlinjen,
      // mörkare mot båda kanterna. `cylinderFill` normaliseras mot den här formens egen
      // bbox, så trapetsen får sin toning oberoende av kupolen nedan. (LYFTPLAN C1)
      .fill(cylinderFill(color, { axis: 'y' }))
      .stroke({ width: 6, color: COLORS.white })
    // rundad topp-kupol — liten detalj, medvetet platt (C1: gradient på huvudformen)
    g.ellipse(0, top, topW / 2, 16 * k).fill(darken(color, 0.12)).stroke({ width: 6, color: COLORS.white })
    g.eventMode = 'none'
    cup.addChild(g)
    cup._g = g
    // Kopparna står och vaggar medan de väntar. Guppningen ligger på den INRE
    // grafiken — spelet äger `cup` (blandning, kik, snäpp tillbaka), så de kan
    // aldrig slåss om samma y.
    liv(g, { bob: 3, sway: 0.01, duration: 2.8 })
    return cup
  },

  // Ny runda: säkerställ layout, nollställ koppar, slumpa göm-plats + leksak, visa, blanda.
  _newRound(ctx) {
    if (!this._alive) return
    this._klarFlyg()
    this._slappFigur() // FÖRE prize.removeChildren: en nod som rivs tar annars figurens view med sig
    this._resolving = false
    this._phase = 'reveal'
    this._params = levelParams(this._level)
    this._ensureLayout(ctx, this._params)
    const n = this._cups.length

    // Återställ koppar till sina hemplatser (snäppt, inga kvardröjande tweens).
    this._cups.forEach((cup, i) => {
      gsap.killTweensOf(cup)
      gsap.killTweensOf(cup.scale)
      cup._slot = i
      cup._peeking = false
      cup.x = this._slots[i]
      cup.y = BASE_Y
      cup.rotation = 0
      cup.scale.set(1)
    })

    // Slumpa göm-plats och leksak. Prize-koppen följs via identitet.
    this._prizeSlot = (Math.random() * n) | 0
    this._prizeCup = this._cups[this._prizeSlot]
    for (const ch of this._prize.removeChildren()) ch.destroy({ children: true })
    // Nyckeln måste sparas SEPARAT. Leksaken är en ritad ikon i en Container; en tabell som
    // läser nyckeln ur en nod-egenskap faller TYST till `default` (se doc §5, 2026-08-12).
    // Nya leksaker föredras (75 %) tills hyllan är full, och samma leksak två gånger i rad undviks.
    // Barnets egen figur som priset — varannan runda (valjEgna räknar takten, så EN gång per runda).
    // Utan egna figurer blir listan tom och rundan är exakt som förut.
    const [beskr] = valjEgna(ctx.services, 'vart-tog-det-vagen', { antal: 1 })
    const skugga = new Graphics().ellipse(0, 44, 38, 8).fill({ color: 0x000000, alpha: 0.22 })
    skugga.eventMode = 'none'
    if (beskr) {
      // Fötterna står där leksakens skugga ligger (+44), höjden 100 px så toppen ryms under den
      // lyfta koppen. Figuren ÄR priset: tweens går på this._prize, aldrig på fig.view.
      this._prizeKey = 'egen'
      this._figur = byggEgenFigur(ctx, beskr, { hojd: 100, maxBredd: 120, skugga: false })
      this._figur.view.position.set(0, 44)
      this._prize.addChild(skugga, this._figur.view)
    } else {
      const okanda = PRIZES.filter((k) => !this._hittade.includes(k) && k !== this._prizeKey)
      const andra = PRIZES.filter((k) => k !== this._prizeKey)
      this._prizeKey = okanda.length && Math.random() < 0.75 ? randomFrom(okanda) : randomFrom(andra)
      this._prize.addChild(skugga, drawIcon(this._prizeKey, 96))
    }
    // Reaktionerna flyttar numera leksaken på riktigt (bilen kör, grodan hoppar),
    // inte bara skalan. En reaktion som råkar leva kvar in i nästa runda hade
    // annars dragit den nya leksaken ur sin kopp.
    gsap.killTweensOf(this._prize)
    gsap.killTweensOf(this._prize.scale)
    this._prize.x = this._slots[this._prizeSlot]
    this._prize.y = BASE_Y
    this._prize.rotation = 0
    this._prize.scale.set(1)
    this._prize.visible = true

    // Visa: Bobo lyfter staven (gnistor) och alla koppar lyfts så leksaken syns.
    ctx.services.audio.sfx('pling')
    this._bobo.setMood('glad')
    this._bobo.look(this._prizeCup.x, BASE_Y)
    armTill(this._bobo, 0.95, 0.35)
    this._later(0.2, () => this._stavGnistor(ctx, 7))
    // Efter en nivåhöjning byggs rundan 1,8 s efter complete(), mitt i dess beröm — och
    // `say()` kallar `cancel()`. Kopparna lyfts genast; bara repliken väntar in rösten, och
    // den sägs bara medan leksaken fortfarande syns (samma runda, visa-fasen).
    const runda = ++this._rundaNr
    const fig = this._figur
    if (fig) {
      // Tre varianter: barnets knytt, barnets kompis, ett MÖTT knytt (aldrig "ditt").
      if (fig.ny && !fig.mott) {
        presentera(ctx, fig, {
          knytt: 'Titta, ditt nya knytt gömmer sig under koppen!',
          kompis: 'Titta, din nya kompis gömmer sig under koppen!',
        })
      } else {
        ctx.narTyst(() => {
          if (!this._alive || this._rundaNr !== runda || this._phase !== 'reveal') return
          if (fig.mott) ctx.services.voice.say('Titta, ett knytt gömmer sig!')
          else if (fig.typ === 'kompis') ctx.services.voice.say('Titta, din kompis gömmer sig!')
          else ctx.services.voice.say('Titta, ditt knytt gömmer sig!')
        })
      }
    } else {
      ctx.narTyst(() => {
        if (this._alive && this._rundaNr === runda && this._phase === 'reveal') ctx.services.voice.say('Titta var leksaken är!')
      })
    }
    this._cups.forEach((cup) => this._liftCup(cup, LIFT_Y))
    pop(this._prize)

    // Efter ~1,5s: sänk kopparna (mjukt "tock" mot bordet) och börja blanda.
    this._later(1.5, () => {
      this._cups.forEach((cup) => this._lowerCup(cup))
      this._tock(ctx)
      armTill(this._bobo, 0, 0.4, 'power2.inOut')
      this._later(0.45, () => this._shuffle(ctx))
    })
  },

  // Gnistor vid stavspetsen (trolleri!). Hoppar över om Bobo hunnit rivas.
  _stavGnistor(ctx, count = 4) {
    if (!this._alive) return
    const gp = spetsGlobal(this._bobo)
    if (!gp) return
    const p = ctx.fxLayer.toLocal(gp)
    sparkle(ctx.fxLayer, p.x, p.y, { count })
  },

  // Blanda: en sekvens av "drag" som VARIERAR (par-byte i olika stilar, cyklisk
  // virvel om 3 koppar, ofarlig fint) så ingen blandning ser exakt likadan ut.
  // Variationen växer med nivån (se planMoves). Glid-ljudet stiger i tonhöjd mot
  // slutet -> en mjuk spännings-crescendo. Leksaken följer alltid MED sin kopp.
  _shuffle(ctx) {
    if (!this._alive) return
    this._phase = 'shuffle'
    this._bobo.setMood('nyfiken')
    const params = this._params
    const n = this._cups.length

    // order[slot] = kopp som just nu står på den platsen (uppdateras per drag).
    const order = []
    this._cups.forEach((c) => (order[c._slot] = c))

    const tl = gsap.timeline({
      onComplete: () => {
        if (this._alive) this._beginGuess(ctx)
      },
    })
    this._shuffleTl = tl

    const moves = planMoves(params.swaps, n, this._level)
    moves.forEach((mv, mi) => {
      const prog = moves.length > 1 ? mi / (moves.length - 1) : 0
      this._addMove(ctx, tl, order, mv, params, prog)
    })

    // Trumvirvel: nio stämda tick (G3) som tätnar och växer mot blandningens slut, så att
    // ögonblicket innan gissningen blir laddat — och `_beginGuess`s tock blir slagets
    // landning. Virveln ligger INNE i tidslinjen: gissningen börjar exakt när den gjorde
    // förut, och tickarna dör med `_shuffleTl` vid exit.
    const T = tl.duration()
    let t = Math.max(0, T - VIRVEL_GAP.reduce((a, b) => a + b, 0))
    VIRVEL_GAP.forEach((gap, i) => {
      const vol = 0.03 + (i / (VIRVEL_GAP.length - 1)) * 0.06
      tl.call(() => {
        if (this._alive) ctx.services.audio.tone({ freq: 196, dur: 0.035, type: 'triangle', vol })
      }, null, t)
      t += gap
    })
  },

  // Bobo följer draget med blicken och ger staven ett snärt + några gnistor.
  _bobGest(ctx, x, dur) {
    if (!this._alive) return
    this._bobo.look(x, BASE_Y)
    snart(this._bobo, dur * 1.2)
    this._stavGnistor(ctx, 3)
  },

  // Lägg ETT drag till blandnings-tidslinjen. Uppdaterar order[]/_slot löpande.
  // mv = { type:'swap'|'swirl', slots:[…], style, feint }. prog 0..1 = hur långt in
  // i blandningen (styr glid-ljudets tonhöjd). Leksaken följer sin kopp via identitet.
  _addMove(ctx, tl, order, mv, params, prog) {
    const dur = params.swapDur
    const sub = gsap.timeline()

    // Glid/svisch under draget — stigande tonhöjd mot slutet (spänning).
    sub.call(() => {
      if (!this._alive) return
      const base = 280 + prog * 260
      ctx.services.audio.tone({ freq: base, slideTo: base * 0.68, dur: dur * 0.8, type: 'sine', vol: 0.12 })
    })

    if (mv.type === 'swirl') {
      // Cyklisk virvel: tre koppar roterar ett steg (i->j->k->i eller baklänges).
      const [i, j, k] = mv.slots
      const cA = order[i]
      const cB = order[j]
      const cC = order[k]
      const fwd = Math.random() < 0.5
      // [kopp, mål-x, mål-slot]
      const map = fwd
        ? [[cA, this._slots[j], j], [cB, this._slots[k], k], [cC, this._slots[i], i]]
        : [[cA, this._slots[k], k], [cB, this._slots[i], i], [cC, this._slots[j], j]]
      sub.call(() => this._bobGest(ctx, this._slots[j], dur))
      map.forEach(([cup, tx], idx) => {
        sub.to(cup, { x: tx, duration: dur * 1.15, ease: 'power1.inOut' }, 0)
        sub.to(cup, { y: BASE_Y - 30 - idx * 8, duration: dur * 0.6, ease: 'sine.out', yoyo: true, repeat: 1 }, 0)
        if (cup === this._prizeCup) sub.to(this._prize, { x: tx, duration: dur * 1.15, ease: 'power1.inOut' }, 0)
      })
      sub.call(() => {
        if (!this._alive) return
        map.forEach(([cup, , slot]) => (cup._slot = slot))
        this._prizeSlot = this._prizeCup._slot
      })
      map.forEach(([cup, , slot]) => (order[slot] = cup))
      tl.add(sub)
      return
    }

    // Par-byte i vald stil.
    const [i, j] = mv.slots
    const cupA = order[i]
    const cupB = order[j]
    const xA = this._slots[i]
    const xB = this._slots[j]
    sub.call(() => this._bobGest(ctx, (xA + xB) / 2, dur))

    // Ofarlig "fint": en kopp gör en liten falsk rörelse innan det riktiga bytet.
    if (mv.feint) {
      const feint = Math.random() < 0.5 ? cupA : cupB
      const dx = (Math.random() < 0.5 ? -1 : 1) * 60
      sub.to(feint, { x: feint.x + dx, duration: dur * 0.35, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
    }
    const t0 = mv.feint ? dur * 0.7 : 0

    sub.to(cupA, { x: xB, duration: dur, ease: 'power1.inOut' }, t0)
    sub.to(cupB, { x: xA, duration: dur, ease: 'power1.inOut' }, t0)
    // Vem som bågar över (passerar framför) beror på stilen.
    if (mv.style === 'under') {
      sub.to(cupB, { y: BASE_Y - 40, duration: dur / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, t0)
    } else if (mv.style === 'cross') {
      sub.to(cupA, { y: BASE_Y - 48, duration: dur / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, t0)
      sub.to(cupB, { y: BASE_Y - 20, duration: dur / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, t0)
    } else {
      sub.to(cupA, { y: BASE_Y - 40, duration: dur / 2, ease: 'sine.out', yoyo: true, repeat: 1 }, t0)
    }
    // Leksaken följer med sin kopp (rör sig MED koppen, inte kvar på bordet).
    if (cupA === this._prizeCup) sub.to(this._prize, { x: xB, duration: dur, ease: 'power1.inOut' }, t0)
    if (cupB === this._prizeCup) sub.to(this._prize, { x: xA, duration: dur, ease: 'power1.inOut' }, t0)
    sub.call(() => {
      if (!this._alive) return
      cupA._slot = j
      cupB._slot = i
      this._prizeSlot = this._prizeCup._slot
    })
    tl.add(sub)
    order[i] = cupB
    order[j] = cupA
  },

  // Gissa-fasen: nu är kopparna tryckbara.
  _beginGuess(ctx) {
    if (!this._alive) return
    this._phase = 'guess'
    this._idleCues = 0
    this._lastInteract = performance.now()
    this._bobo.setMood('glad')
    this._bobo.look(CENTER, BASE_Y)
    // Kopparna "landar" — ett sista mjukt tock innan gissningen.
    this._tock(ctx, 0.13)
    // V24: gissningen börjar 3,3 s in och introt är 5,3 s — frågan kapade "Tryck på rätt
    // kopp." varje start. Kopparna är tryckbara genast; bara frågan väntar in rösten, och den
    // ställs bara om barnet inte redan hunnit gissa i den här rundan.
    const runda = this._rundaNr
    ctx.narTyst(() => {
      if (!this._alive || this._rundaNr !== runda || this._phase !== 'guess' || this._resolving) return
      ctx.services.voice.say('Var tog den vägen? Tryck på koppen!')
    })
  },

  // Tap på en kopp.
  _onTap(ctx, cup) {
    if (!this._alive) return
    this._lastInteract = performance.now()
    this._idleCues = 0

    // Utanför gissa-fasen (eller mitt i upplösning): lekfullt, ingen rundlogik.
    if (this._phase !== 'guess' || this._resolving) {
      ctx.services.audio.sfx('tap')
      wiggle(cup)
      return
    }

    this._bobo.look(cup.x, BASE_Y)
    if (cup === this._prizeCup) {
      // RÄTT: lyft koppen, leksaken hoppar fram, Bobo jublar, beröm + gnistror.
      this._resolving = true
      this._phase = 'resolving'
      ctx.services.audio.sfx('reveal')
      this._liftCup(cup, LIFT_Y - 10, () => {
        if (!this._alive) return
        ctx.services.audio.sfx('correct')
        pop(cup)
        const gp = ctx.fxLayer.toLocal(this._prize.getGlobalPosition())
        sparkle(ctx.fxLayer, gp.x, gp.y)
        // Leksaken gör SITT eget (anka kvackar, groda hoppar, stjärna snurrar…).
        this._reactPrize(ctx)
        // Bobo jublar med hela kroppen (armgesterna hör till hans rigg).
        gsap.killTweensOf(this._bobo.armar[1], 'rotation')
        this._bobo.react('jubel')
        this._sparaFynd(ctx)
        this._roundsDone++
        // Rundan som höjer nivån firas av complete() 2,2 s härifrån (vinstljud + beröm +
        // regn). Ett eget beröm även här blev dubbelberöm: de korta klippen (1,03–1,31 s)
        // hann tystna före complete(), som då lade ett andra ovanpå.
        if (this._roundsDone < ROUNDS_PER_LEVEL) ctx.services.voice.say(randomFrom(PRAISE))
        // Leksaken flyger upp på hyllan medan reaktionen tonar ut, sedan nästa runda.
        this._later(1.0, () => this._flygTillHylla(ctx))
        this._later(2.2, () => this._finishRound(ctx))
      })
    } else {
      // FEL: lyft lite, visa tom plats, vingla, mjukt ljud, "Kika igen!".
      this._peekEmpty(cup)
      this._bobo.react('nyfiken')
      ctx.services.audio.sfx('soft')
      ctx.services.voice.say('Kika igen!')
    }
  },

  // Spara fyndet direkt (innan flygningen), så ett barn som lämnar mitt i den inte
  // tappar leksaken. Hyllan fylls på först när leksaken landat.
  _sparaFynd(ctx) {
    if (this._figur) return // barnets figur sparas aldrig här — custom.hittade är bara leksaker
    const key = this._prizeKey
    if (this._hittade.includes(key)) return
    this._hittade.push(key)
    ctx.progress.setCustom('hittade', [...this._hittade])
  },

  // Den hittade leksaken flyger i en båge från bordet till sin plats på hyllan.
  _flygTillHylla(ctx) {
    if (!this._alive || this._flyer) return
    const fig = this._figur
    // Figuren står på hyllan resten av besöket. Finns den redan där, eller är hyllan full,
    // flyger den till en befintlig plats, hyllan hoppar, och exemplaret rivs i _landa.
    const key = fig ? `egen:${fig.id}` : this._prizeKey
    const finns = this._hylla.har(key)
    const plats = finns || this._hyllaRymmer(fig)
    const i = finns ? this._hylla.index(key) : plats ? this._hylla.antal() : this._hylla.antal() - 1
    const mal = this._hylla.plats(i)
    const fran = { x: this._prize.x, y: this._prize.y }
    const flyer = new Container()
    flyer.eventMode = 'none'
    if (fig) {
      // Samma figur flyger — view flyttas över till flygaren (fötterna 44 px under mitten).
      fig.view.position.set(0, 44)
      flyer.addChild(fig.view)
    } else flyer.addChild(drawIcon(key, 96))
    const slutSkala = fig ? 0.62 : 62 / 96
    flyer.position.set(fran.x, fran.y)
    this._root.addChild(flyer)
    this._flyer = flyer
    this._prize.visible = false
    ctx.services.audio.tone({ freq: 660, slideTo: 1100, dur: 0.35, type: 'sine', vol: 0.1 })
    const st = { p: 0 }
    this._flyTw = gsap.to(st, {
      p: 1,
      duration: 0.75,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (flyer.destroyed) return
        const p = st.p
        flyer.x = fran.x + (mal.x - fran.x) * p
        flyer.y = fran.y + (mal.y - fran.y) * p - Math.sin(p * Math.PI) * 150
        flyer.scale.set(1 - (1 - slutSkala) * p)
        flyer.rotation = Math.sin(p * Math.PI * 2) * 0.3
      },
      onComplete: () => this._landa(ctx, key, i),
    })
  },

  // Flygningen är klar (eller avbruten av en ny runda): städa flygaren.
  _klarFlyg() {
    this._flyTw?.kill()
    this._flyTw = null
    if (this._flyer && !this._flyer.destroyed) {
      // En figur mitt i flygningen lyfts ur FÖRE flygaren rivs (annars tar noden view med sig).
      const v = this._figur?.view
      if (v && !v.destroyed && v.parent === this._flyer) this._flyer.removeChild(v)
      this._flyer.destroy({ children: true })
    }
    this._flyer = null
  },

  // Ryms ett föremål till på brädan? Högst 11 platser (plats 10 slutar på x 1156), och bara tre
  // av dem figurer — de sparade leksakerna (högst tio) ska alltid få sin plats.
  _hyllaRymmer(fig) {
    const h = this._hylla
    if (h.antal() >= HYLLA_MAX) return false
    return !fig || h.antalFigurer() < HYLLA_FIG_MAX
  },

  // Riv rundans figur om den inte hunnit upp på hyllan: lyft ur sin förälder, sedan destroy()
  // (en EgenFigur tickar på ctx.ticker och måste rivas själv).
  _slappFigur() {
    const fig = this._figur
    this._figur = null
    if (!fig) return
    const v = fig.view
    if (v && !v.destroyed) {
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
      v.parent?.removeChild(v)
    }
    fig.destroy()
  },

  _landa(ctx, key, i) {
    if (!this._alive) return
    this._klarFlyg()
    const fig = this._figur
    const ny = !this._hylla.har(key) && this._hyllaRymmer(fig)
    const p = this._hylla.plats(i)
    if (fig) {
      // _klarFlyg lyfte ur figuren; antingen tar hyllan över den, eller så var platsen redan
      // tagen/full och exemplaret rivs medan hyllans egen figur hoppar.
      const kan = ny
      if (kan) {
        this._hylla.laggTillFigur(fig, key, { animera: true })
        this._figur = null
      } else {
        this._slappFigur()
        this._hylla.hoppa(i)
      }
      const fx = ctx.fxLayer.toLocal(this._root.toGlobal(p))
      sparkle(ctx.fxLayer, fx.x, fx.y, { count: kan ? 8 : 4 })
      const f = this._hylla.ton(i)
      ctx.services.audio.tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.16 })
      ctx.services.audio.tone({ freq: f * 1.5, dur: 0.22, type: 'triangle', vol: 0.12, delay: 0.1 })
      if (kan && !ctx.services.voice.talar) {
        if (fig.mott) ctx.services.voice.say('Ett knytt står på hyllan nu!')
        else if (fig.typ === 'kompis') ctx.services.voice.say('Din kompis står på hyllan nu!')
        else ctx.services.voice.say('Ditt knytt står på hyllan nu!')
      }
      return
    }
    if (ny) this._hylla.laggTill(key, { animera: true })
    else this._hylla.hoppa(i)
    const fx = ctx.fxLayer.toLocal(this._root.toGlobal(p))
    sparkle(ctx.fxLayer, fx.x, fx.y, { count: ny ? 8 : 4 })
    const f = this._hylla.ton(i)
    ctx.services.audio.tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.16 })
    ctx.services.audio.tone({ freq: f * 1.5, dur: 0.22, type: 'triangle', vol: 0.12, delay: 0.1 })
    // Ett utrop på ögonblicket: hoppas över om berömmet fortfarande talar.
    if (ny && !ctx.services.voice.talar) ctx.services.voice.say('En ny leksak till hyllan!')
  },

  // Tryck på hyllan: alla leksaker hoppar i tur och ordning med stigande ton.
  _hyllaTap(ctx) {
    if (!this._alive) return
    this._lastInteract = performance.now()
    const n = this._hylla.antal()
    if (!n) return
    if (this._hyllaBusy) {
      ctx.services.audio.sfx('tap')
      return
    }
    this._hyllaBusy = true
    for (let i = 0; i < n; i++) {
      this._later(i * 0.09, () => {
        this._hylla.hoppa(i)
        ctx.services.audio.tone({ freq: this._hylla.ton(i), dur: 0.14, type: 'triangle', vol: 0.12 })
      })
    }
    this._later(n * 0.09 + 0.5, () => (this._hyllaBusy = false))
    if (this._phase === 'guess' && !this._resolving) this._bobo.react('heja')
    if (n >= 2 && !ctx.services.voice.talar) ctx.services.voice.say('Titta, alla leksaker du har hittat!')
  },

  // Avsluta runda: efter ROUNDS_PER_LEVEL lyckade rundor -> höj nivå + firande.
  _finishRound(ctx) {
    if (!this._alive) return
    if (this._roundsDone >= ROUNDS_PER_LEVEL) {
      this._roundsDone = 0
      this._level = clampLevel(this._level + 1)
      ctx.progress.setLevel(this._level)
      ctx.progress.complete() // delat firande (1–2s) + stjärna + klistermärke
      this._later(1.8, () => this._newRound(ctx))
    } else {
      this._newRound(ctx)
    }
  },

  // Fel gissning: koppen lyfts ~60px (tom plats), vinglar, sänks tillbaka.
  _peekEmpty(cup) {
    if (cup._peeking) return
    cup._peeking = true
    wiggle(cup)
    gsap.killTweensOf(cup, 'y')
    gsap.to(cup, {
      y: PEEK_Y,
      duration: 0.18,
      ease: 'power2.out',
      onComplete: () => {
        if (!this._alive) {
          cup._peeking = false
          return
        }
        this._later(0.4, () => {
          gsap.to(cup, {
            y: BASE_Y,
            duration: 0.22,
            ease: 'power2.in',
            onComplete: () => (cup._peeking = false),
          })
        })
      },
    })
  },

  _liftCup(cup, y, onDone) {
    gsap.killTweensOf(cup, 'y')
    gsap.to(cup, {
      y,
      duration: 0.4,
      ease: 'back.out(1.3)',
      onComplete: () => {
        if (this._alive) onDone?.()
      },
    })
  },

  _lowerCup(cup) {
    gsap.killTweensOf(cup, 'y')
    gsap.to(cup, { y: BASE_Y, duration: 0.35, ease: 'power2.in' })
  },

  // Mjukt "tock" när en kopp möter bordet (ren syntes, ingen sample behövs).
  _tock(ctx, vol = 0.16) {
    if (!this._alive) return
    ctx.services.audio.tone({ freq: 150, slideTo: 90, dur: 0.09, type: 'sine', vol })
  },

  // Leksaks-reaktion vid fynd: varje sorts leksak gör sitt egna lilla nummer
  // (rörelse + eget ljud). this._prize är ett persistent objekt -> gsap direkt är
  // ok (dödas i destroy); tonerna är fire-and-forget. Rotation/skala nollställs i
  // _newRound, så reaktionerna får lämna dem påverkade.
  _reactPrize(ctx) {
    if (!this._alive) return
    const p = this._prize
    const a = ctx.services.audio
    const fx = ctx.fxLayer
    const gp = fx.toLocal(p.getGlobalPosition())
    gsap.killTweensOf(p)
    gsap.killTweensOf(p.scale)
    const y0 = p.y
    if (this._figur) {
      // Barnets figur gör sitt eget (knyttets motiv / kompisens armar upp + melodin).
      this._figur.react('jubel')
      pop(p)
      sparkle(fx, gp.x, gp.y - 20, { count: 9 })
      return
    }
    switch (this._prizeKey) {
      case '🐥': // anka: vaggar + kvackar
        wiggle(p)
        a.tone({ freq: 620, dur: 0.1, type: 'square', vol: 0.16, slideTo: 470 })
        this._later(0.14, () => a.tone({ freq: 560, dur: 0.1, type: 'square', vol: 0.16, slideTo: 420 }))
        break
      case '🐸': // groda: hoppar med "boing"
        gsap.timeline()
          .to(p, { y: y0 - 80, duration: 0.24, ease: 'power2.out' })
          .to(p, { y: y0, duration: 0.34, ease: 'bounce.out' })
        a.tone({ freq: 200, dur: 0.2, type: 'sine', vol: 0.18, slideTo: 560 })
        break
      case '🚗': // bil: kör iväg och tillbaka med "vroom"
        gsap.timeline()
          .to(p, { x: p.x + 80, duration: 0.28, ease: 'power2.out' })
          .to(p, { x: p.x, duration: 0.4, ease: 'power2.inOut' })
        a.tone({ freq: 120, dur: 0.4, type: 'sawtooth', vol: 0.12, slideTo: 240 })
        break
      case '🎈': // ballong: guppar upp lätt + högt pip
        gsap.timeline()
          .to(p, { y: y0 - 60, duration: 0.5, ease: 'sine.out' })
          .to(p, { y: y0, duration: 0.4, ease: 'sine.in' })
        a.tone({ freq: 900, dur: 0.16, type: 'sine', vol: 0.13, slideTo: 1200 })
        break
      case '🐱': // katt: vinglar + jamar (två toner)
        wiggle(p)
        a.tone({ freq: 700, dur: 0.14, type: 'sawtooth', vol: 0.12, slideTo: 520 })
        this._later(0.16, () => a.tone({ freq: 520, dur: 0.16, type: 'sawtooth', vol: 0.12, slideTo: 660 }))
        break
      case '🦋': // fjäril: fladdrar (snabba vinglingar) + ljus klang + gnistror
        wiggle(p)
        sparkle(fx, gp.x, gp.y, { count: 8 })
        a.tone({ freq: 1000, dur: 0.1, type: 'sine', vol: 0.1, slideTo: 1400 })
        break
      case '⭐':
      case '🌟': // stjärna: snurrar ett varv + gnistror + skimmer
        gsap.to(p, { rotation: p.rotation + Math.PI * 2, duration: 0.6, ease: 'power1.inOut' })
        pop(p)
        sparkle(fx, gp.x, gp.y, { count: 9 })
        a.tone({ freq: 1100, dur: 0.14, type: 'triangle', vol: 0.12, slideTo: 1650 })
        break
      case '🍓':
      case '🍎': // frukt: saftig kläm-puls
        pop(p, { scale: 1.32 })
        a.tone({ freq: 420, dur: 0.12, type: 'sine', vol: 0.16, slideTo: 300 })
        break
      default: // övrigt: glad puls + gnistror
        pop(p)
        sparkle(fx, gp.x, gp.y)
        break
    }
  },

  // Tomt tryck bredvid kopparna: lekfullt mjukt ljud. Aldrig "fel".
  _emptyTap(ctx) {
    if (!this._alive) return
    this._lastInteract = performance.now()
    ctx.services.audio.sfx('soft')
  },

  // Auto-hjälp: lyft rätt kopp en stund så barnet ser var leksaken är, sänk igen.
  // Aldrig ett "fel" — bara en snäll knuff. Koppen är fortfarande tryckbar efteråt.
  _hintPrize(ctx) {
    if (!this._alive || this._phase !== 'guess' || this._resolving) return
    const cup = this._prizeCup
    if (!cup || cup._peeking) return
    ctx.services.audio.sfx('pling')
    ctx.services.voice.say('Titta, här är den!')
    this._bobo.look(cup.x, BASE_Y)
    armTill(this._bobo, 0.95, 0.35)
    gsap.killTweensOf(cup, 'y')
    gsap.to(cup, {
      y: LIFT_Y,
      duration: 0.4,
      ease: 'back.out(1.3)',
      onComplete: () => {
        if (!this._alive) return
        this._later(0.9, () => {
          if (!this._alive || this._phase !== 'guess') return
          gsap.to(cup, { y: BASE_Y, duration: 0.3, ease: 'power2.in' })
          armTill(this._bobo, 0, 0.35, 'power2.inOut')
        })
      },
    })
  },

  // Mjuk ledtråd (hjälpens steg 2): rätt kopp vippar till och gör ett litet skutt, med ett
  // stämt "hallå" (G4→C5). Skuttet är 10 px — kanten når aldrig upp förbi leksaken, så den
  // förblir gömd. y + rotation dödas av `_newRound`/`destroy` (killTweensOf(cup)).
  _vippaKopp(ctx) {
    if (!this._alive || this._phase !== 'guess' || this._resolving) return
    const cup = this._prizeCup
    if (!cup || cup.destroyed || cup._peeking) return
    ctx.services.audio.tone({ freq: 392, dur: 0.08, type: 'triangle', vol: 0.12 })
    ctx.services.audio.tone({ freq: 523.25, dur: 0.1, type: 'triangle', vol: 0.12, delay: 0.12 })
    this._bobo.look(cup.x, BASE_Y)
    snart(this._bobo, 0.5)
    gsap.killTweensOf(cup, 'y,rotation')
    gsap.timeline()
      .to(cup, { y: BASE_Y - 10, rotation: -0.09, duration: 0.12, ease: 'power2.out' })
      .to(cup, { y: BASE_Y, rotation: 0.07, duration: 0.14, ease: 'power2.in' })
      .to(cup, { y: BASE_Y - 6, rotation: -0.04, duration: 0.1, ease: 'power2.out' })
      .to(cup, { y: BASE_Y, rotation: 0, duration: 0.14, ease: 'power2.in' })
  },

  // Idle-recue: i gissa-fasen efter ~6s tystnad — först upprepa uppmaningen, sedan
  // vippar rätt kopp, sist lyfts den (auto-hjälp). Aldrig bestraffande.
  _update(ctx) {
    if (!this._alive || this._phase !== 'guess' || this._resolving) return
    // Tomgången räknas från TYSTNAD: medan rösten talar står klockan på noll, annars
    // kapar hjälpstegen en replik som talar.
    if (ctx.services.voice.talar) this._lastInteract = performance.now()
    if (performance.now() - this._lastInteract > 6000) {
      this._lastInteract = performance.now()
      this._idleCues++
      // Hjälpen kommer i steg, mjukast först: 6 s → frågan igen, 12 s → rätt kopp VIPPAR
      // (drar blicken dit utan att visa leksaken), 18 s → koppen lyfts och visar den.
      // Förut lyftes den redan vid 12 s — facit kom innan barnet hunnit gissa en gång till.
      if (this._idleCues >= 3) {
        this._idleCues = 0
        this._hintPrize(ctx)
      } else if (this._idleCues === 2) {
        this._vippaKopp(ctx)
      } else {
        ctx.services.voice.say('Var tog den vägen? Tryck på koppen!')
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)
    this._shuffleTl?.kill()
    this._shuffleTl = null
    this._klarFlyg()
    this._slappFigur() // före rötterna rivs; hyllans figurer rivs av hylla.destroy()
    this._stjarnTw?.kill()
    if (this._stjarnor) gsap.killTweensOf(this._stjarnor)
    this._cups?.forEach((cup) => {
      gsap.killTweensOf(cup)
      gsap.killTweensOf(cup.scale)
      cup._fxWiggleTl?.kill()
      cup._fxPopTl?.kill()
      cup._g?._fxLiv?.kill()
      if (cup._g) gsap.killTweensOf(cup._g)
    })
    if (this._prize) {
      gsap.killTweensOf(this._prize)
      gsap.killTweensOf(this._prize.scale)
      this._prize._fxPopTl?.kill()
      this._prize._fxWiggleTl?.kill()
    }
    this._bobo?.destroy()
    this._bobo = null
    this._hylla?.destroy()
    this._hylla = null
    gsap.killTweensOf(this._root)
    ctx.services.voice.cancel?.()
    this._root?.destroy({ children: true })
    this._cups = []
  },

  // Schemalägg en guardad fördröjd callback. `ctx.later` dör med spelomgången, så ett anrop
  // från en tidigare omgång kan aldrig köra in i nästa (modulen är en singleton).
  _later(delay, fn) {
    return this._ctx.later(delay, () => {
      if (this._alive) fn()
    })
  },
}

// Svårighetsparametrar för en nivå. Parametrarna saturerar vid taken ovan.
function levelParams(level) {
  return {
    cups: Math.min(BASE_CUPS + Math.floor(level / 3), MAX_CUPS),
    swaps: Math.min(2 + level, MAX_SWAPS),
    swapDur: Math.max(MIN_SWAP_DUR, 0.7 - level * 0.05),
    allRed: level >= RED_LEVEL,
  }
}

// Planera blandnings-dragen. Variationen VÄXER med nivån: nivå 0 = bara "over"-
// byten, nivå 1 lägger "under", nivå 2 "cross" + cyklisk virvel (om ≥3 koppar),
// nivå 3 ofarliga finter. Så svårare nivåer är inte bara fler/snabbare utan även
// visuellt rikare. Undviker att direkt upprepa exakt samma par-byte.
function planMoves(count, n, level) {
  const moves = []
  let prevKey = ''
  const swirlOk = n >= 3 && level >= 2
  const styles = ['over']
  if (level >= 1) styles.push('under')
  if (level >= 2) styles.push('cross')
  for (let m = 0; m < count; m++) {
    let mv
    if (swirlOk && Math.random() < 0.28) {
      const pick = shuffle([...Array(n).keys()]).slice(0, 3).sort((a, b) => a - b)
      mv = { type: 'swirl', slots: pick, style: 'over' }
      prevKey = ''
    } else {
      let pair
      do {
        pair = shuffle([...Array(n).keys()]).slice(0, 2).sort((a, b) => a - b)
      } while (n > 2 && pair.join(',') === prevKey)
      prevKey = pair.join(',')
      mv = { type: 'swap', slots: pair, style: randomFrom(styles) }
    }
    // Ofarlig fint (falsk rörelse) blir möjlig från nivå 3.
    mv.feint = level >= 3 && Math.random() < 0.22
    moves.push(mv)
  }
  return moves
}

// Jämnt fördelade kopp-platser, centrerade kring CENTER, inom bordets bredd.
function computeSlots(n) {
  if (n <= 1) return [CENTER]
  const spacing = Math.min(MAX_SPACING, SPAN / (n - 1))
  const total = spacing * (n - 1)
  const start = CENTER - total / 2
  const slots = []
  for (let i = 0; i < n; i++) slots.push(Math.round(start + spacing * i))
  return slots
}

function clampLevel(l) {
  return Math.max(0, Math.min(MAX_LEVEL, l | 0))
}

function darken(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}
