// Skuggmatchning — dra varje sak till sin skugga (2–5 år). Pussel.
// Picknick i parken: sakerna STÅR på en träbänk (skuggan rakt under fötterna) och deras
// skuggor ligger på en rutig filt — mörk blågrå, skarp kontur, mjuk halvskugga.
// Allt levande har vilo-liv på ett INRE barn (målcontainrar och drag-containrar rörs aldrig).
// Återanvänder DragController (snäpp/snäpp-tillbaka/tap-tap). Vid rätt skugga
// LYSER slotten upp och silhuetten BLOMMAR ut i full färg med en liten flourish;
// föremålet poppar och försvinner (färgföremålet sitter nu i skuggan). Fel = mjuk
// studs tillbaka + vingel (ALDRIG en bestraffning). När alla skuggor fyllts firar
// vi (stjärna + klistermärke) och en ny, något större runda startar — oändlig lek.
// Djupet växer med nivån: 2 → 6 föremål och bred variation (djur, frukt, fordon,
// verktyg, former) så varje runda känns fräsch. Inget fel-läge, ingen tidspress.
import { Container, Graphics, Circle } from 'pixi.js'
import { drawIcon } from '../../lib/artikoner.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { createScene } from '../../lib/scene.js'
import { bounceIn, pop, wiggle, sparkle, burst, ripple, shake, breathe, floatText, liv } from '../../lib/feedback.js'
import { shuffle, randomFrom } from '../../lib/swedish.js'

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

// PICKNICK I PARKEN: sakerna står på en träbänk upptill (fötterna på plankans ovansida, så
// deras markskugga ligger rakt under dem) och deras SKUGGOR ligger på en rutig filt nedtill —
// en skugga kastas alltid på en yta, aldrig i tomma luften.
const SHELF_Y = 322 // plankans ovansida: alla föremåls fötter står här
const SKUGGA = 0x16212b // skuggornas ton: mörk blågrå, inte kolsvart — läser som skugga på ljus filt
// Filtens hörn (perspektiv: smal bakkant, bred framkant). Skuggraden ligger mitt på den.
const FILT = { ty: 470, by: 706, tl: 150, tr: 1130, bl: 20, br: 1260 }
// Sällsynt gyllene skugga (~1 runda av 6): samma svarta silhuett — reglerna ändras inte —
// men den ligger på en gyllene markskugga med glitterstjärnor som tindrar runt den.
const GOLD_CHANCE = 1 / 6
const GOLD = 0xffc233
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

    // Picknickplatsen: träbänk (sakerna står på den), rutig filt (skuggorna ligger på den)
    // och några blommor. Bara dekor — eventMode 'none', byggs en gång per omgång.
    this._blommor = []
    this._root.addChild(this._makePicknick())

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
      // Tomgången räknas från TYSTNAD — annars kapar om-cuen en replik som talar.
      if (ctx.services.voice.talar) this._idle = 0
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
    this._roundNr = (this._roundNr || 0) + 1

    // DJUP: fler föremål (2 → 6) och mindre figurer ju fler de blir.
    const count = Math.min(Math.max(2, 2 + Math.floor(this._level / 2)), 6)
    // Få föremål = större föremål: med 2–3 stod en liten sak mitt på en stor bänk och filt.
    const scale = count <= 2 ? 1.3 : count === 3 ? 1.15 : count === 4 ? 0.9 : count === 5 ? 0.82 : 0.74

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
    const goldIdx = Math.random() < GOLD_CHANCE ? Math.floor(Math.random() * count) : -1

    // Skuggor (mål) på gräset.
    shadowOrder.forEach((pick, i) => {
      const sh = this._makeShadow(pick, scale, i === goldIdx)
      sh.x = xs[i]
      sh.y = SHADOW_Y
      this._play.addChild(sh)
      this._shadows.push(sh)
      // Studsa in BARNET — målcontainern (sh) rörs aldrig av en tween: DragController mäter
      // snäppavståndet mot sh.x/y och hitArea sitter på samma nod.
      bounceIn(sh._bump, { delay: i * 0.04, duration: 0.4 })
      const key = pick.key
      this._drag.addTarget(sh, (d) => d.key === key, { hitRadius: hitR })
    })

    // Förrådsföremål (källor) upptill.
    itemOrder.forEach((pick, i) => {
      const made = this._makeItem(pick, scale)
      made.container.x = xs[i]
      made.container.y = SHELF_Y - made.foot // fötterna i plankans ovansida
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
        gsap.to(made.shadow, { alpha: 0.35, duration: 0.14 })
        gsap.to(made.shadow.scale, { x: 1.4, y: 1.25, duration: 0.14 })
      }
      const settle = () => {
        if (made.container.destroyed) return
        gsap.killTweensOf(made.body)
        gsap.killTweensOf(made.shadow)
        gsap.killTweensOf(made.shadow.scale)
        gsap.to(made.body, { y: 0, duration: 0.2, ease: 'back.out(1.6)' })
        gsap.to(made.shadow, { alpha: 1, duration: 0.2 })
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

  // En skugg-plats på filten: ett gömt varmt sken (tänds vid rätt) + en SKUGGA — mörk
  // blågrå skarp silhuett ovanpå en mjuk, lite förskjuten halvskugga (solen kastar, kanten
  // mjuknar, konturen förblir skarp) + färgföremål (börjar osynligt, litet).
  //
  // Hierarki (P0: målet `s` rörs aldrig av en tween — DragController mäter snäppavståndet mot
  // s.x/y och hitArea sitter på samma nod):
  //   s (släppmål + hitArea) → _bump (studs in / "fel"-knuff) → _fig (vilo-liv) → halo/dark/color
  _makeShadow(pick, scale, golden = false) {
    const plateR = 78 * scale
    const slotR = plateR + 12
    const s = new Container()
    const bump = new Container()
    bump.eventMode = 'none'
    bump.interactiveChildren = false
    s.addChild(bump)

    // Gyllene skuggan: en varm solfläck på filten under silhuetten.
    let patch = null
    if (golden) {
      patch = new Graphics().ellipse(0, 6, slotR * 1.08, slotR * 0.82).fill({ color: GOLD, alpha: 0.4 })
      patch.eventMode = 'none'
    }
    const glow = new Graphics().circle(0, 0, slotR * 1.05).fill({ color: 0xfff3b0 })
    glow.alpha = 0
    glow.eventMode = 'none'

    // Skuggan (tint -> äkta skugga oavsett föremålets egna färger). Halvskuggan ligger
    // något större och förskjuten åt solens bortvända håll (höger/ner) — bara ett mjukt
    // sken runt den skarpa konturen, så formen blir aldrig otydligare.
    const size = 116 * scale
    const halo = drawIcon(pick.emoji, size * 1.07)
    halo.tint = SKUGGA
    halo.alpha = 0.12 // svagare och närmare: 0,2 på (6,7) gav en grå dubbelkontur på stora silhuetter
    halo.position.set(4, 5)
    const dark = drawIcon(pick.emoji, size)
    dark.tint = SKUGGA
    dark.alpha = 0.9
    // Samma föremål i full färg, börjar osynligt + litet — blommar ut vid match.
    const color = drawIcon(pick.emoji, size)
    color.alpha = 0
    color.scale.set(0.55)

    // Vilo-liv på ETT barn: skuggan vaggar svagt som om ljuset fläktade genom löven.
    const fig = new Container()
    fig.addChild(halo, dark, color)
    if (patch) bump.addChild(patch)
    bump.addChild(glow, fig)
    liv(fig, { bob: 2.5, sway: 0.02, duration: 2.8 + Math.random() * 1.2 })

    s._bump = bump
    s._fig = fig
    s._halo = halo
    s._dark = dark
    s._color = color
    s._glow = glow
    s._golden = golden
    s._twinkles = []
    if (golden) {
      // Tindrande glitter runt silhuetten (egna barn — målets träffyta står still).
      // Ingen platta bakom figuren: silhuetten ÄR målet.
      const spots = [[-0.95, 0.9], [-2.35, 0.95], [0.35, 1.0], [2.75, 0.85]]
      spots.forEach(([a, f], i) => {
        const t = makeTwinkle(9 + (i % 2) * 4)
        t.position.set(Math.cos(a) * slotR * f, Math.sin(a) * slotR * f * 0.9)
        t.scale.set(0.4)
        bump.addChild(t)
        s._twinkles.push(t)
        gsap.to(t.scale, { x: 1.15, y: 1.15, duration: 0.7, delay: i * 0.22, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      })
    }
    // Osynlig släpp-/tap-yta (>=96px). Drop-radien styrs separat via addTarget(hitRadius).
    s.hitArea = new Circle(0, 0, slotR)
    return s
  },

  // Bara figuren — INGEN platta/kort bakom. Saken STÅR på träbänken: containerns y sätts
  // så att fötterna ligger i plankans ovansida, och markskuggan (ett syskon till kroppen)
  // ligger rakt under fötterna. Plockas saken upp blir skuggan kvar, större och svagare.
  //
  // Hierarki: c (dras av DragController) → shadow (kontaktskugga) · body (lyft-tween på y)
  //   → inner (vilo-liv: gupp + vaggning) → icon. Varje nivå har EN ägare av sina egenskaper.
  _makeItem(pick, scale) {
    const plateR = 78 * scale
    const size = 104 * scale
    const c = new Container()

    const inner = new Container()
    const e = drawIcon(pick.emoji, size)
    inner.addChild(e)
    // Fötterna ur den RITADE formen — föremålen har olika höjd, men alla ska stå på plankan.
    let foot = size * 0.5
    try {
      const b = e.getLocalBounds()
      if (Number.isFinite(b.maxY)) foot = b.maxY
    } catch { /* behåll reservvärdet */ }
    // Vilolägets mitt ligger 3 px upp så guppet (±3) aldrig sänker saken genom plankan.
    inner.y = -3

    const shadow = new Container()
    shadow.position.set(0, foot)
    shadow.eventMode = 'none'
    shadow.addChild(
      new Graphics().ellipse(0, 0, Math.max(28, size * 0.36), Math.max(7, size * 0.085)).fill({ color: 0x3b2410, alpha: 0.3 })
    )

    const body = new Container()
    body.addChild(inner)
    c.addChild(shadow, body)
    liv(inner, { bob: 3, sway: 0.025, duration: 2.4 + Math.random() * 1.2 })

    // Osynlig träffyta (>=96px) så små fingrar lätt får tag i den bara figuren.
    c.hitArea = new Circle(0, 0, Math.max(56, plateR + 12))
    return { container: c, body, inner, shadow, emoji: e, foot, key: pick.key, name: pick.name }
  },

  // Picknickplatsen (dekor, byggs en gång): bänk + filt + blommor. Allt eventMode 'none'.
  _makePicknick() {
    const d = new Container()
    d.eventMode = 'none'
    d.interactiveChildren = false

    // --- Filten (perspektiv): fransig skugga, krämvit botten, rödrutigt gingham ovanpå.
    const F = FILT
    const xAt = (yy, edge) => {
      const t = (yy - F.ty) / (F.by - F.ty)
      return edge === 'l' ? F.tl + (F.bl - F.tl) * t : F.tr + (F.br - F.tr) * t
    }
    const filt = new Graphics()
    filt.poly([F.tl + 6, F.ty + 10, F.tr + 6, F.ty + 10, F.br + 8, F.by + 12, F.bl + 8, F.by + 12]).fill({ color: 0x2f5a2a, alpha: 0.22 })
    filt.poly([F.tl, F.ty, F.tr, F.ty, F.br, F.by, F.bl, F.by]).fill(0xfffaf0)
    const N = 14
    const bandAt = (t) => F.ty + (F.by - F.ty) * Math.pow(t, 1.25)
    const RUTA = { color: 0xff6b6b, alpha: 0.3 }
    for (let i = 0; i < N; i += 2) {
      const a = i / N
      const b = (i + 1) / N
      filt.poly([
        F.tl + (F.tr - F.tl) * a, F.ty, F.tl + (F.tr - F.tl) * b, F.ty,
        F.bl + (F.br - F.bl) * b, F.by, F.bl + (F.br - F.bl) * a, F.by,
      ]).fill(RUTA)
    }
    for (let j = 0; j < 7; j += 2) {
      const y0 = bandAt(j / 7)
      const y1 = bandAt((j + 1) / 7)
      filt.poly([xAt(y0, 'l'), y0, xAt(y0, 'r'), y0, xAt(y1, 'r'), y1, xAt(y1, 'l'), y1]).fill(RUTA)
    }
    filt.poly([F.tl, F.ty, F.tr, F.ty, F.br, F.by, F.bl, F.by]).stroke({ width: 4, color: 0xe65a5a, alpha: 0.7 })
    filt.eventMode = 'none'
    d.addChild(filt)

    // --- Bänken: ben, sarg och planka. Sakerna står på plankans ovansida (SHELF_Y).
    const bank = new Graphics()
    bank.ellipse(640, 452, 560, 14).fill({ color: 0x2f5a2a, alpha: 0.18 })
    for (const lx of [108, 1146]) {
      bank.roundRect(lx, 356, 26, 96, 6).fill(0xa86a36)
      bank.roundRect(lx + 4, 356, 6, 96, 3).fill({ color: 0xffffff, alpha: 0.14 })
    }
    bank.roundRect(56, SHELF_Y + 20, 1168, 20, 6).fill(0xb9793f)
    bank.roundRect(40, SHELF_Y, 1200, 26, 10).fill(0xdca66a)
    bank.roundRect(40, SHELF_Y, 1200, 7, 4).fill({ color: 0xffffff, alpha: 0.28 })
    for (const gx of [210, 470, 760, 1010]) {
      bank.roundRect(gx, SHELF_Y + 13, 70, 3, 1.5).fill({ color: 0x9c6230, alpha: 0.45 })
    }
    bank.eventMode = 'none'
    d.addChild(bank)

    // --- Blommor i kanten av gräset (sidorna, utanför föremåls- och skuggraderna).
    const spots = [[36, 486, 0xff9ec4], [74, 440, 0xffd35c], [1226, 480, 0xa78bfa], [1206, 438, 0xff6b6b], [214, 452, 0xffffff], [1070, 452, 0xff9ec4]]
    spots.forEach(([x, y, col], i) => {
      const f = makeBlomma(col)
      f.position.set(x, y)
      d.addChild(f)
      liv(f, { bob: 0, sway: 0.08, duration: 2.6 + (i % 3) * 0.5, phase: i / spots.length })
      this._blommor.push(f)
    })
    return d
  },

  // Rätt skugga: glad chime + namnet sägs, ring + gnistror, slotten tänds, och
  // silhuetten morfar till färg med en flourish. Föremålet poppar och tonar bort.
  _onCorrect(ctx, rec, target, made) {
    if (!this._alive || made._done) return
    made._done = true
    made.inner._fxLiv?.kill() // saken är på väg in i skuggan — inget vilogupp längre
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
    gsap.killTweensOf(sh._halo)
    gsap.to(sh._dark, { alpha: 0, duration: 0.22 })
    gsap.to(sh._halo, { alpha: 0, duration: 0.22 })
    gsap.to(sh._color, { alpha: 1, duration: 0.22 })
    gsap.to(sh._color.scale, { x: 1, y: 1, duration: 0.4, ease: 'back.out(2.2)' })

    // Föremålets egen lilla reaktion (hoppar/rullar/fladdrar/snurrar) efter blomningen.
    this._reactFigure(sh, made.key)
    if (sh._golden) this._goldenReward(ctx, sh)

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
    const bump = target?.view?._bump
    if (bump && !bump.destroyed) {
      // Knuffen går på BARNET — målcontainern (snäppytan) står still.
      gsap.killTweensOf(bump)
      bump.y = 0
      gsap.timeline()
        .to(bump, { y: -14, duration: 0.1 })
        .to(bump, { y: 0, duration: 0.16, ease: 'back.out(2)' })
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

  // Gyllene skuggan hittad: guldregn, ett glittrigt C-dur-arpeggio ovanpå snäppet och en
  // glad rad EFTER namnet (namnet sägs alltid — ordinlärningen går först, raden köar).
  _goldenReward(ctx, sh) {
    for (const t of sh._twinkles || []) {
      if (t.destroyed) continue
      gsap.killTweensOf(t.scale)
      gsap.to(t.scale, { x: 1.6, y: 1.6, duration: 0.25, ease: 'power2.out' })
      gsap.to(t, { alpha: 0, duration: 0.45, delay: 0.1 })
    }
    burst(ctx.fxLayer, sh.x, sh.y, { count: 18, colors: [GOLD, 0xffe27a, 0xffffff] })
    sparkle(ctx.fxLayer, sh.x, sh.y - 30, { count: 12 })
    ;[1046.5, 1318.5, 1568.0, 2093.0].forEach((f, i) =>
      ctx.services.audio.tone({ freq: f, dur: 0.16, type: 'sine', vol: 0.1, delay: 0.24 + i * 0.07 })
    )
    const nr = this._roundNr
    ctx.narTyst(() => {
      if (this._alive && this._roundNr === nr) ctx.services.voice.say('Oj, vad det glittrar!')
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
    // liv() tweenar en proxy, inte figuren — killTweensOf(fig) når den aldrig, så den dödas
    // uttryckligen (annars skriver den på en riven nod varje bildruta).
    s._fig?._fxLiv?.kill()
    if (s._fig) gsap.killTweensOf(s._fig)
    if (s._bump) {
      gsap.killTweensOf(s._bump)
      gsap.killTweensOf(s._bump.scale)
    }
    if (s._halo) gsap.killTweensOf(s._halo)
    if (s._dark) gsap.killTweensOf(s._dark)
    if (s._color) {
      gsap.killTweensOf(s._color)
      gsap.killTweensOf(s._color.scale)
    }
    if (s._glow) {
      gsap.killTweensOf(s._glow)
      gsap.killTweensOf(s._glow.scale)
    }
    for (const t of s._twinkles || []) {
      gsap.killTweensOf(t)
      gsap.killTweensOf(t.scale)
    }
  },

  _killItemTweens(m) {
    if (!m) return
    m.inner?._fxLiv?.kill() // vilogupp (proxy-tween — killTweensOf når den inte)
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
    this._blommor?.forEach((f) => {
      f._fxLiv?.kill()
      gsap.killTweensOf(f)
    })
    this._blommor = []
    gsap.killTweensOf(this._play)
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// En ritad blomma (stjälk, fem kronblad, gul mitt) med foten i origo så den vaggar från marken.
function makeBlomma(col) {
  const f = new Container()
  f.eventMode = 'none'
  const g = new Graphics()
  g.roundRect(-1.5, -26, 3, 26, 1.5).fill(0x3f9a4e)
  g.ellipse(6, -9, 7, 3).fill(0x4fb25f)
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2
    g.circle(Math.cos(a) * 7, -28 + Math.sin(a) * 7, 6).fill(col)
  }
  g.circle(0, -28, 4.5).fill(0xffc233)
  g.eventMode = 'none'
  f.addChild(g)
  return f
}

// Fyrudd glitterstjärna för den gyllene skuggan (ritad, aldrig en emoji).
function makeTwinkle(r) {
  const pts = []
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2
    const rr = i % 2 === 0 ? r : r * 0.3
    pts.push(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  const g = new Graphics().poly(pts).fill(0xffe27a).stroke({ width: 1.5, color: 0xffffff, alpha: 0.9 })
  g.eventMode = 'none'
  return g
}
