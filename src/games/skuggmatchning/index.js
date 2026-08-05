// Skuggmatchning — dra varje sak till sin svarta skugga (2–5 år). Pussel.
// Återanvänder DragController (snäpp/snäpp-tillbaka/tap-tap). Vid rätt skugga
// LYSER slotten upp och silhuetten BLOMMAR ut i full färg med en liten flourish;
// föremålet poppar och försvinner (färgföremålet sitter nu i skuggan). Fel = mjuk
// studs tillbaka + vingel (ALDRIG en bestraffning). När alla skuggor fyllts firar
// vi (stjärna + klistermärke) och en ny, något större runda startar — oändlig lek.
// Djupet växer med nivån: 2 → 6 föremål och bred variation (djur, frukt, fordon,
// verktyg, former) så varje runda känns fräsch. Inget fel-läge, ingen tidspress.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { drawIcon } from '../../lib/artikoner.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { createScene } from '../../lib/scene.js'
import { bounceIn, pop, wiggle, sparkle, ripple, shake, breathe, floatText } from '../../lib/feedback.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'
import { FONT } from '../../lib/theme.js'

// Föremålspool — bred variation så rundorna inte upprepar sig. Varje post har en
// ASCII-key (id/ljudnyckel), en emoji och ett SVENSKT namn (åäö ok) som talas vid
// rätt placering. Silhuetten görs genom att tinta emojin svart -> äkta skugga.
const POOL = [
  // Djur
  { key: 'hund', emoji: '🐶', name: 'Hund' },
  { key: 'katt', emoji: '🐱', name: 'Katt' },
  { key: 'kanin', emoji: '🐰', name: 'Kanin' },
  { key: 'bjorn', emoji: '🐻', name: 'Björn' },
  { key: 'groda', emoji: '🐸', name: 'Groda' },
  { key: 'fagel', emoji: '🐦', name: 'Fågel' },
  { key: 'fisk', emoji: '🐟', name: 'Fisk' },
  { key: 'bi', emoji: '🐝', name: 'Bi' },
  { key: 'fjaril', emoji: '🦋', name: 'Fjäril' },
  { key: 'skoldpadda', emoji: '🐢', name: 'Sköldpadda' },
  { key: 'uggla', emoji: '🦉', name: 'Uggla' },
  { key: 'gris', emoji: '🐷', name: 'Gris' },
  // Frukt
  { key: 'banan', emoji: '🍌', name: 'Banan' },
  { key: 'apple', emoji: '🍎', name: 'Äpple' },
  { key: 'jordgubbe', emoji: '🍓', name: 'Jordgubbe' },
  { key: 'paron', emoji: '🍐', name: 'Päron' },
  { key: 'apelsin', emoji: '🍊', name: 'Apelsin' },
  { key: 'vattenmelon', emoji: '🍉', name: 'Vattenmelon' },
  { key: 'citron', emoji: '🍋', name: 'Citron' },
  { key: 'druvor', emoji: '🍇', name: 'Druvor' },
  // Fordon
  { key: 'bil', emoji: '🚗', name: 'Bil' },
  { key: 'buss', emoji: '🚌', name: 'Buss' },
  { key: 'traktor', emoji: '🚜', name: 'Traktor' },
  { key: 'tag', emoji: '🚂', name: 'Tåg' },
  { key: 'flygplan', emoji: '✈️', name: 'Flygplan' },
  { key: 'bat', emoji: '⛵', name: 'Båt' },
  { key: 'raket', emoji: '🚀', name: 'Raket' },
  { key: 'cykel', emoji: '🚲', name: 'Cykel' },
  // Verktyg
  { key: 'hammare', emoji: '🔨', name: 'Hammare' },
  { key: 'sax', emoji: '✂️', name: 'Sax' },
  { key: 'nyckel', emoji: '🔑', name: 'Nyckel' },
  { key: 'pensel', emoji: '🖌️', name: 'Pensel' },
  { key: 'sked', emoji: '🥄', name: 'Sked' },
  { key: 'paraply', emoji: '☂️', name: 'Paraply' },
  // Former och annat kul
  { key: 'stjarna', emoji: '⭐', name: 'Stjärna' },
  { key: 'hjarta', emoji: '❤️', name: 'Hjärta' },
  { key: 'blomma', emoji: '🌸', name: 'Blomma' },
  { key: 'sol', emoji: '☀️', name: 'Sol' },
  { key: 'mane', emoji: '🌙', name: 'Måne' },
  { key: 'boll', emoji: '⚽', name: 'Boll' },
  { key: 'ballong', emoji: '🎈', name: 'Ballong' },
  { key: 'present', emoji: '🎁', name: 'Present' },
  { key: 'glass', emoji: '🍦', name: 'Glass' },
  { key: 'klocka', emoji: '⏰', name: 'Klocka' },
]

// Glada svävande emoji vid en lyckad placering (då och då).
const HAPPY = ['😄', '🎉', '⭐', '💛', '✨', '🌟']
// Mjuka, ALLTID positiva uppmuntringar vid fel skugga (talas ibland).
const WRONG = ['Prova en annan skugga!', 'Hoppsan, försök igen!', 'Den passar nån annanstans!']

// Föremåls-EGEN reaktion när det landar i sin skugga — bryter "en-utfalls"-känslan:
// grodan hoppar, bilen rullar, fjärilen fladdrar upp, stjärnan snurrar. Nyckel -> typ;
// allt annat (de flesta djur, frukt, verktyg) får en glad "squish"-studs. Rör bara
// figuren (sh._color) i skugg-slotten; exit-säkert via _killShadowTweens.
const REACTION = {
  groda: 'hop', kanin: 'hop',
  bi: 'fly', fjaril: 'fly', fagel: 'fly', flygplan: 'fly', raket: 'fly', ballong: 'fly',
  bil: 'roll', buss: 'roll', traktor: 'roll', tag: 'roll', cykel: 'roll',
  stjarna: 'spin', sol: 'spin', mane: 'spin', boll: 'spin', klocka: 'spin',
}

// Riktiga förinspelade djurläten (offline mp3, se scripts/gen-sfx.py). audio.sample()
// returnerar true om klippet spelades, annars false -> vi faller tillbaka på ett
// passande syntes-ljud och/eller det talade namnet.
const SAMPLE = {
  hund: 'djur_hund', katt: 'djur_katt', gris: 'djur_gris',
  groda: 'djur_groda', bi: 'djur_bi', uggla: 'djur_uggla',
}

const ITEM_Y = 235 // föremålsraden (källor) upptill
const SHADOW_Y = 560 // skuggraden (mål) på gräset

export default {
  id: 'skuggmatchning',
  titleSv: 'Skuggmatchning',
  icon: '🌑',
  category: 'pussel',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'skuggmatchning',
  voiceIntro: 'Dra varje sak till sin svarta skugga!',

  init(ctx) {
    this._alive = true
    this._resolving = false
    this._shadows = []
    this._items = []
    this._recent = []
    this._placed = 0
    this._idle = 0
    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Mjuk, inbjudande äng-bakgrund (sol, moln, kullar, gräs) — exit-säker.
    this._root.addChild(createScene('meadow', { width: ctx.width, height: ctx.height }))

    // Genomskinlig tap-fångare: tomt tryck -> litet lekfullt ljud (aldrig negativt).
    const tapCatcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    tapCatcher.eventMode = 'static'
    tapCatcher.on('pointertap', () => {
      if (!this._alive) return
      ctx.services.audio.sfx('tap')
    })
    this._root.addChild(tapCatcher)

    // Spel-lager (skuggor + föremål) — separat från bakgrunden så vi kan skaka det
    // milt vid firande utan att hela scenen guppar.
    this._play = new Container()
    this._root.addChild(this._play)

    this._drag = new DragController({ space: this._play, services: ctx.services })

    // Idle-recue: nollställ vid varje pekning (bubblar upp till root).
    this._root.eventMode = 'static'
    this._onDown = () => this._resetIdle()
    this._root.on('pointerdown', this._onDown)

    // Idle-detektor via ticker: efter ~6s tystnad upprepas instruktionen och ett
    // kvarvarande föremål "andas" som vänlig ledtråd.
    this._tickerRef = ctx.ticker
    this._tick = (t) => {
      if (!this._alive || this._resolving) return
      this._idle += t.deltaMS
      if (this._idle >= 6000) {
        this._idle = 0
        ctx.services.voice.say(this.voiceIntro)
        this._hintRandom()
      }
    }
    ctx.ticker.add(this._tick)

    this._newRound(ctx)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._idle = 0
  },

  // --- Runda --------------------------------------------------------------

  _newRound(ctx) {
    if (!this._alive) return
    // Städa förra rundan: avregistrera drag/mål och döda alla dess tweens.
    this._drag.clear()
    this._killHint()
    this._shadows.forEach((s) => this._killShadowTweens(s))
    this._items.forEach((m) => this._killItemTweens(m))
    this._play.removeChildren().forEach((o) => o.destroy({ children: true }))
    this._shadows = []
    this._items = []
    this._placed = 0
    this._resolving = false
    this._idle = 0

    // DJUP: fler föremål (2 → 6) och mindre figurer ju fler de blir.
    const count = Math.min(Math.max(2, 2 + Math.floor(this._level / 2)), 6)
    const scale = count <= 3 ? 1 : count === 4 ? 0.9 : count === 5 ? 0.82 : 0.74

    // Anti-upprepning: undvik förra rundans föremål om poolen räcker.
    let avail = POOL.filter((p) => !this._recent.includes(p.key))
    if (avail.length < count) avail = POOL
    const picks = shuffle(avail).slice(0, count)
    this._recent = picks.map((p) => p.key)

    // Skuggor och föremål placeras på samma x-rad men i OBEROENDE ordning, så det
    // alltid är en äkta matchningsuppgift.
    const shadowOrder = shuffle(picks)
    const itemOrder = shuffle(picks)
    const xs = this._slots(ctx, count)
    const hitR = Math.max(120, 150 * scale)

    // Skuggor (mål) på gräset.
    shadowOrder.forEach((pick, i) => {
      const sh = this._makeShadow(pick, scale)
      sh.x = xs[i]
      sh.y = SHADOW_Y
      this._play.addChild(sh)
      this._shadows.push(sh)
      bounceIn(sh, { delay: i * 0.04, duration: 0.4 })
      const key = pick.key
      this._drag.addTarget(sh, (d) => d.key === key, { hitRadius: hitR })
    })

    // Förrådsföremål (källor) upptill.
    itemOrder.forEach((pick, i) => {
      const made = this._makeItem(pick, scale)
      made.container.x = xs[i]
      made.container.y = ITEM_Y
      this._play.addChild(made.container)
      this._items.push(made)
      bounceIn(made.container, { delay: i * 0.06, duration: 0.36 })

      // Egna lyft-/lägg-lyssnare (DragController ger ingen "plocka upp"-hook):
      // föremålet lyfter, skuggan under växer + tonar (känns lyft). Exit-säkert —
      // tweens dödas i destroy/_killItemTweens innan objektet rivs.
      const lift = () => {
        if (!this._alive || made.container.destroyed || made._done) return
        this._resetIdle()
        ctx.services.audio.sfx('pop')
        gsap.killTweensOf(made.body)
        gsap.killTweensOf(made.shadow)
        gsap.killTweensOf(made.shadow.scale)
        gsap.to(made.body, { y: -20, duration: 0.14, ease: 'power2.out' })
        gsap.to(made.shadow, { alpha: 0.1, duration: 0.14 })
        gsap.to(made.shadow.scale, { x: 1.5, y: 1.3, duration: 0.14 })
      }
      const settle = () => {
        if (made.container.destroyed) return
        gsap.killTweensOf(made.body)
        gsap.killTweensOf(made.shadow)
        gsap.killTweensOf(made.shadow.scale)
        gsap.to(made.body, { y: 0, duration: 0.2, ease: 'back.out(1.6)' })
        gsap.to(made.shadow, { alpha: 0.18, duration: 0.2 })
        gsap.to(made.shadow.scale, { x: 1, y: 1, duration: 0.2 })
      }
      made.container.on('pointerdown', lift)
      made.container.on('pointerup', settle)
      made.container.on('pointerupoutside', settle)
      made._lift = lift
      made._settle = settle

      this._drag.addItem(made.container, { key: pick.key }, {
        onSelect: () => this._resetIdle(),
        onCorrect: (rec, target) => this._onCorrect(ctx, rec, target, made),
        onWrong: (rec, target) => this._onWrong(ctx, rec, target, made),
      })
    })

    this._idle = 0
  },

  // Jämnt centrerad rad med plats för upp till sex föremål.
  _slots(ctx, count) {
    const cell = Math.min(220, (ctx.width - 120) / count)
    const totalW = cell * count
    const startX = (ctx.width - totalW) / 2 + cell / 2
    const xs = []
    for (let i = 0; i < count; i++) xs.push(startX + i * cell)
    return xs
  },

  // En skugg-plats: en svag markskugga + ett gömt varmt sken (tänds vid rätt) +
  // svart silhuett + färgföremål (börjar osynligt, litet). INGEN platta/ring bakom —
  // silhuetten ÄR målet (ägaråterkoppling: bara figuren, separerad).
  _makeShadow(pick, scale) {
    const plateR = 78 * scale
    const slotR = plateR + 12
    const s = new Container()

    const oval = new Graphics().ellipse(0, slotR * 0.78, slotR * 0.95, slotR * 0.34).fill({ color: 0x000000, alpha: 0.14 })
    oval.eventMode = 'none'
    const glow = new Graphics().circle(0, 0, slotR * 1.05).fill({ color: 0xfff3b0 })
    glow.alpha = 0
    glow.eventMode = 'none'

    // Svart silhuett (tint -> äkta skugga oavsett emojins egna färger).
    // P0 ASSETS: RITAD figur (var en 116px emoji-Text). tint svartar ut hela
    // grafiken precis som den gjorde med emojin, så silhuett-mekaniken är oförändrad.
    const dark = drawIcon(pick.emoji, 116 * scale)
    dark.tint = 0x000000
    dark.alpha = 0.82
    // Samma emoji i full färg, börjar osynlig + liten — blommar ut vid match.
    const color = drawIcon(pick.emoji, 116 * scale)
    color.alpha = 0
    color.scale.set(0.55)

    s.addChild(oval, glow, dark, color)
    s._dark = dark
    s._color = color
    s._glow = glow
    // Osynlig släpp-/tap-yta (>=96px). Drop-radien styrs separat via addTarget(hitRadius).
    s.hitArea = new Circle(0, 0, slotR)
    return s
  },

  // Bara figuren — INGEN platta/kort bakom (ägaråterkoppling: föremålet separerat,
  // endast själva saken/figuren). En mjuk markskugga (sibling) ligger kvar på marken
  // och ger lyft-känsla när föremålet plockas upp.
  _makeItem(pick, scale) {
    const plateR = 78 * scale
    const c = new Container()
    const shadow = new Graphics()
      .ellipse(0, plateR + 14, plateR * 0.86, plateR * 0.3)
      .fill({ color: 0x000000, alpha: 0.18 })
    shadow.eventMode = 'none'

    const body = new Container()
    const e = drawIcon(pick.emoji, 104 * scale)
    body.addChild(e)
    c.addChild(shadow, body)

    // Osynlig träffyta (>=96px) så små fingrar lätt får tag i den bara figuren.
    c.hitArea = new Circle(0, 0, Math.max(56, plateR + 12))
    return { container: c, body, shadow, emoji: e, key: pick.key, name: pick.name }
  },

  // Rätt skugga: glad chime + namnet sägs, ring + gnistror, slotten tänds, och
  // silhuetten morfar till färg med en flourish. Föremålet poppar och tonar bort.
  _onCorrect(ctx, rec, target, made) {
    if (!this._alive || made._done) return
    made._done = true
    const sh = target.view
    const combo = this._placed // 0-baserat: hur många som redan satts denna runda

    // Ljud i lager: tydligt "snäpp" när silhuetten morfar + stigande kombo-ton medan
    // raden fylls + föremålets EGET ljud (djurläte om klipp finns, annars passande
    // syntes). Namnet sägs alltid (ordinlärning), går i parallell med ljudet.
    this._matchSound(ctx, made.key, combo)
    ctx.services.voice.say(made.name)
    ripple(ctx.fxLayer, sh.x, sh.y, { color: 0xfff3b0, maxR: 130 })
    sparkle(ctx.fxLayer, sh.x, sh.y)
    if (Math.random() < 0.4) floatText(ctx.fxLayer, sh.x, sh.y - 80, randomFrom(HAPPY))
    this._lightSlot(sh._glow)

    // Morf: svart silhuett tonar ut, färgen blommar fram.
    gsap.killTweensOf(sh._dark)
    gsap.killTweensOf(sh._color)
    gsap.killTweensOf(sh._color.scale)
    gsap.to(sh._dark, { alpha: 0, duration: 0.22 })
    gsap.to(sh._color, { alpha: 1, duration: 0.22 })
    gsap.to(sh._color.scale, { x: 1, y: 1, duration: 0.4, ease: 'back.out(2.2)' })

    // Föremålets egen lilla reaktion (hoppar/rullar/fladdrar/snurrar) efter blomningen.
    this._reactFigure(sh, made.key)

    // Det dragna föremålet: glad puls, sedan göm/destruera (färgen sitter i skuggan).
    pop(rec.view)
    gsap.to(rec.view, {
      alpha: 0,
      duration: 0.22,
      delay: 0.3,
      onComplete: () => {
        if (!rec.view.destroyed) rec.view.destroy({ children: true })
      },
    })

    this._placed++
    this._resetIdle()
    if (this._placed >= this._shadows.length) this._finishRound(ctx)
  },

  // Lagrat matchljud: (1) kort "snäpp"-klick i takt med morfen, (2) stigande kombo-ton
  // som klättrar medan raden fylls (combo 0..n → högre tonhöjd), (3) föremålets eget
  // ljud. Endast ljud — inget Pixi, alltså inget att städa.
  _matchSound(ctx, key, combo) {
    const audio = ctx.services.audio
    // (1) snäpp — silhuetten snäpper till färg
    audio.tone({ freq: 620, dur: 0.06, type: 'square', vol: 0.16, slideTo: 940 })
    // (2) stigande kombo-ton (C-dur-trappa, klingar högre för varje matchning i rundan)
    const semis = [0, 2, 4, 5, 7, 9] // pentatonisk-ish, glad
    const st = semis[Math.min(combo, semis.length - 1)]
    audio.tone({ freq: 523.25 * Math.pow(2, st / 12), dur: 0.16, type: 'sine', vol: 0.24, delay: 0.06 })
    // (3) föremålets eget ljud (djurläte/fordonston) — annars den vanliga glada 'match'
    if (!this._objectSound(audio, key)) audio.sfx('match')
  },

  // Föremåls-specifikt ljud. Riktigt djurläte om ett klipp finns (audio.sample →
  // true), annars en passande liten syntes (fordon tutar, båt tuter, fågel kvittrar).
  // Returnerar true om något föremåls-eget spelades; false → fall tillbaka på 'match'.
  _objectSound(audio, key) {
    const sample = SAMPLE[key]
    if (sample && audio.sample(sample)) return true
    switch (key) {
      case 'bil':
      case 'buss':
      case 'traktor':
        // tut-tut
        audio.tone({ freq: 392, dur: 0.14, type: 'square', vol: 0.2 })
        audio.tone({ freq: 330, dur: 0.16, type: 'square', vol: 0.2, delay: 0.16 })
        return true
      case 'tag':
        audio.tone({ freq: 300, dur: 0.32, type: 'sawtooth', vol: 0.16, slideTo: 520 })
        return true
      case 'cykel':
        audio.sfx('pling') // ringklocka
        return true
      case 'flygplan':
      case 'raket':
        audio.sfx('whoosh')
        return true
      case 'bat':
        audio.tone({ freq: 180, dur: 0.36, type: 'sine', vol: 0.2 }) // mistlur
        return true
      case 'fagel':
        audio.tone({ freq: 1200, dur: 0.08, type: 'sine', vol: 0.16, slideTo: 1700 })
        audio.tone({ freq: 1500, dur: 0.08, type: 'sine', vol: 0.14, slideTo: 2000, delay: 0.1 })
        return true
      default:
        return false
    }
  },

  // Föremålets egen reaktion i skugg-slotten efter blomningen. Rör bara figuren
  // (sh._color): y/x/rotation eller en squish på skalan. Direkt gsap på Pixi-objektet
  // är OK här — _killShadowTweens dödar sh._color + sh._color.scale i destroy/_newRound
  // FÖRE objektet rivs (samma mönster som morfen ovan). Delayen ligger efter blomningen.
  _reactFigure(sh, key) {
    const c = sh?._color
    if (!c || c.destroyed) return
    const type = REACTION[key] || 'squish'
    if (type === 'hop') {
      gsap
        .timeline({ delay: 0.28 })
        .to(c, { y: -48, duration: 0.18, ease: 'power2.out' })
        .to(c, { y: 0, duration: 0.26, ease: 'bounce.out' })
        .to(c, { y: -28, duration: 0.15, ease: 'power2.out' })
        .to(c, { y: 0, duration: 0.22, ease: 'bounce.out' })
    } else if (type === 'roll') {
      gsap
        .timeline({ delay: 0.28 })
        .to(c, { x: -26, rotation: -0.5, duration: 0.22, ease: 'sine.inOut' })
        .to(c, { x: 32, rotation: 0.6, duration: 0.4, ease: 'sine.inOut' })
        .to(c, { x: 0, rotation: 0, duration: 0.3, ease: 'sine.inOut' })
    } else if (type === 'fly') {
      gsap
        .timeline({ delay: 0.28 })
        .to(c, { y: -42, x: 14, rotation: 0.2, duration: 0.3, ease: 'sine.inOut' })
        .to(c, { y: -22, x: -14, rotation: -0.2, duration: 0.3, ease: 'sine.inOut' })
        .to(c, { y: 0, x: 0, rotation: 0, duration: 0.34, ease: 'sine.inOut' })
    } else if (type === 'spin') {
      gsap
        .timeline({ delay: 0.28 })
        .to(c, { rotation: Math.PI * 2, duration: 0.6, ease: 'power2.inOut' })
        .set(c, { rotation: 0 })
    } else {
      // squish — glad studs. Delay > blomningens skal-tween (0.4s) så de inte krockar.
      gsap
        .timeline({ delay: 0.44 })
        .to(c.scale, { x: 1.24, y: 0.8, duration: 0.12, ease: 'power2.out' })
        .to(c.scale, { x: 0.86, y: 1.18, duration: 0.12 })
        .to(c.scale, { x: 1.06, y: 0.96, duration: 0.12 })
        .to(c.scale, { x: 1, y: 1, duration: 0.18, ease: 'back.out(2)' })
    }
  },

  // Fel skugga: DragController gav redan 'soft' + snäpper hem. Lägg lekfull
  // återkoppling (vingel + liten knuff + mjuk ring) — ALDRIG en bestraffning.
  _onWrong(ctx, rec, target, made) {
    if (!this._alive) return
    wiggle(made.body)
    if (target && !target.view.destroyed) {
      gsap.killTweensOf(target.view)
      gsap.timeline()
        .to(target.view, { y: target.view.y - 14, duration: 0.1 })
        .to(target.view, { y: target.view.y, duration: 0.16, ease: 'back.out(2)' })
      ripple(ctx.fxLayer, target.view.x, target.view.y, { color: 0xffffff, maxR: 90, alpha: 0.4 })
    }
    this._resetIdle()
    if (Math.random() < 0.35) ctx.services.voice.say(randomFrom(WRONG))
  },

  // Runda klar: mild skakning + delat firande (complete() ger redan celebrate-ljud,
  // beröm, konfetti, stjärna och klistermärke — så vi DUPLICERAR inte det). Sedan
  // en ny, något större runda.
  _finishRound(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._idle = 0
    this._killHint()
    this._level++
    ctx.progress.setLevel(this._level)
    shake(this._play, { intensity: 6, duration: 0.45 })
    ctx.progress.complete()
    this._roundCall = gsap.delayedCall(1.6, () => {
      if (this._alive) this._newRound(ctx)
    })
  },

  // --- Sken / ledtråd / idle ----------------------------------------------

  // Tänder slottens varma sken kort (exit-säkert: skriver bara om det lever).
  _lightSlot(glow) {
    if (!glow || glow.destroyed) return
    glow.alpha = 0
    glow.scale.set(0.7)
    const st = { a: 0, s: 0.7 }
    const apply = () => {
      if (!glow.destroyed) {
        glow.alpha = st.a
        glow.scale.set(st.s)
      }
    }
    gsap
      .timeline()
      .to(st, { a: 0.8, s: 1.1, duration: 0.16, ease: 'power2.out', onUpdate: apply })
      .to(st, { a: 0, s: 1.55, duration: 0.5, ease: 'power2.in', onUpdate: apply })
  },

  _resetIdle() {
    this._idle = 0
    this._killHint()
  },

  // Låt ett kvarvarande föremål "andas" som vänlig ledtråd (vid idle).
  _hintRandom() {
    this._killHint()
    const live = this._items.filter((m) => !m.container.destroyed && !m._done)
    if (!live.length) return
    const m = randomFrom(live)
    this._hintItem = m
    this._hint = breathe(m.body, { scale: 1.12, duration: 0.7 })
  },

  _killHint() {
    this._hint?.kill()
    this._hint = null
    if (this._hintItem && !this._hintItem.container.destroyed) {
      gsap.killTweensOf(this._hintItem.body.scale)
      this._hintItem.body.scale.set(1, 1)
    }
    this._hintItem = null
  },

  // --- Städning ------------------------------------------------------------

  _killShadowTweens(s) {
    if (!s) return
    gsap.killTweensOf(s)
    gsap.killTweensOf(s.scale)
    if (s._dark) gsap.killTweensOf(s._dark)
    if (s._color) {
      gsap.killTweensOf(s._color)
      gsap.killTweensOf(s._color.scale)
    }
    if (s._glow) {
      gsap.killTweensOf(s._glow)
      gsap.killTweensOf(s._glow.scale)
    }
  },

  _killItemTweens(m) {
    if (!m) return
    gsap.killTweensOf(m.container)
    gsap.killTweensOf(m.container.scale)
    gsap.killTweensOf(m.body)
    gsap.killTweensOf(m.body.scale)
    gsap.killTweensOf(m.shadow)
    gsap.killTweensOf(m.shadow.scale)
    if (!m.container.destroyed) {
      if (m._lift) m.container.off('pointerdown', m._lift)
      if (m._settle) {
        m.container.off('pointerup', m._settle)
        m.container.off('pointerupoutside', m._settle)
      }
    }
  },

  destroy(ctx) {
    this._alive = false
    this._roundCall?.kill()
    this._killHint()
    this._tickerRef?.remove(this._tick)
    if (this._onDown) this._root?.off('pointerdown', this._onDown)
    // DragController river sina lyssnare och dödar föremåls-view-tweens.
    this._drag?.destroy()
    // Egna sub-objekt-tweens (kropp/skugga/silhuett/färg/sken) som DragController
    // inte känner till.
    this._shadows?.forEach((s) => this._killShadowTweens(s))
    this._items?.forEach((m) => this._killItemTweens(m))
    gsap.killTweensOf(this._play)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}
