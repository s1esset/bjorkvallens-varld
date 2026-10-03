// Loopdjuren — öppen, kreativ musiklek i Loopimal-stil (2–5 år). Varje djur har en
// LOOP-bana med tomma slots. En spelhuvud-stapel sveper kontinuerligt vänster→höger
// och börjar om (oändlig loop). Barnet drar rörelse-/ljudblock (hopp/snurr/tut/klapp/
// röst) från brickan ner i slotsen; när huvudet passerar en ifylld slot dansar och
// låter just det djuret i takt. En liten låt + dans växer fram av sig själv.
//
// INGET kan bli fel: inga poäng, ingen game-over, ingen timerpress. Ett block som
// släpps utanför en slot puffar snällt bort. "Klart" är mjukt och öppet: första hela
// varvet där varje aktivt djur spelat minst ett block firas EN gång (klistermärke),
// men loopen rullar vidare i all oändlighet.
//
// Exit-säkerhet: loop-logiken är ren ticker-matte (ALDRIG GSAP). Djur-animationer
// kör GSAP på de PERSISTENTA avatar-vyerna (dödas i destroy). Partiklar via de
// exit-säkra hjälparna i lib/feedback.js. Allt gömt bakom this._alive.
import { Container, Graphics, Circle, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { DragController } from '../../lib/DragController.js'
import { bounceIn, pop, wiggle, puff, sparkle, floatText, liv, ripple } from '../../lib/feedback.js'
import { bage } from '../../lib/form.js'
import { createScene } from '../../lib/scene.js'
import { COLORS } from '../../lib/theme.js'
import { nastaVariant } from '../../lib/variation.js'
import { vippa } from '../../lib/vippa.js'

// Djur som har riktiga förinspelade läten (djur_<id> i sfx-manifestet).
const ANIMALS = [
  { id: 'ko', cry: 'Mu! Muu!', color: COLORS.pink },
  { id: 'hund', cry: 'Voff! Voff!', color: COLORS.orange },
  { id: 'katt', cry: 'Mjau!', color: COLORS.purple },
  { id: 'gris', cry: 'Nöff! Nöff!', color: COLORS.teal },
]

// Block-typer: rörelse + ljud. 'rost' (röst) säger djurets eget läte.
const BLOCKS = {
  hopp: { color: COLORS.green }, // studsfjäder
  snurr: { color: COLORS.blue }, // snurra
  tut: { color: COLORS.orange }, // trumpet
  klapp: { color: COLORS.red }, // klappande händer
  rost: { color: COLORS.purple }, // musiknot = djurets egen röst
  shaker: { color: COLORS.teal }, // maracas: djuret skakar, tre korta tick (nivå 2)
  eko: { color: COLORS.pink }, // klocka: tonen ekar tillbaka, allt svagare (nivå 3)
}
const STAMP_ORDER = ['hopp', 'snurr', 'tut', 'klapp', 'rost', 'shaker', 'eko']
// Hur många block som är framme vid en viss nivå (highestLevel): 5 → 6 → 7. Slot-tap cyklar
// tomt → de framme blocken → tomt (se _cykel).
function blockAntal(level) {
  return level >= 3 ? 7 : level === 2 ? 6 : 5
}
const AVATAR_X = 130

// Stämda instrument per djur (mönster #7): samma pentatoniska skala, olika oktav + klang.
// Block på olika djur klingar därför ALLTID ihop till harmoni, och en rad block stiger
// till en liten melodi (ton = skalsteg efter slot-index). Röst-blocket = djurets eget läte.
const PENTA = [0, 2, 4, 7, 9] // C-dur-pentatonik (semitonsteg)
const INSTRUMENTS = {
  ko: { base: 131, type: 'sine' }, // bas (C3)
  hund: { base: 262, type: 'triangle' }, // mellanregister (C4)
  katt: { base: 523, type: 'triangle' }, // ljus marimba (C5)
  gris: { base: 196, type: 'sine' }, // (G3)
}

// Scen per nivå (U2): nivå 1 dag på ängen, nivå 2 kväll, nivå 3 natt — och inom nivån lottas en
// av två, aldrig samma som sist. Samma djur och block; bara världen runt dem byts.
const SCENER = [
  [
    { id: 'meadow', tema: 'meadow', silhuett: 'skog', forgrund: true },
    { id: 'sky', tema: 'sky', silhuett: 'skog', forgrund: true },
  ],
  [
    { id: 'sunset', tema: 'sunset', silhuett: 'stad' },
    { id: 'warm', tema: 'warm', silhuett: 'stad', forgrund: true },
  ],
  [
    { id: 'night', tema: 'night', silhuett: 'stad' },
    { id: 'candy', tema: 'candy' },
  ],
]

// Örats fästpunkt i huvudets rum (höger öra; vänster speglas): öronen fjädrar kring den.
const EAR_FAST = {
  ko: [40, -6], // sidoöron
  hund: [44, -20], // hängöron svänger från toppen
  katt: [34, -24], // spetsöra, foten
  gris: [26, -22],
}

// Loop-banans x-utbredning (slot-mitt) och playhead-svep.
const TRACK_X0 = 280
const TRACK_X1 = 1150
const Y3 = [210, 370, 530]
const Y4 = [185, 320, 455, 590]

export default {
  id: 'loopdjuren',
  titleSv: 'Loopdjuren',
  icon: '🎶',
  category: 'roligt',
  input: 'drag',
  ageRange: [2, 5],
  bundle: 'loopdjuren',
  voiceIntro: 'Lägg blocken hos djuren så börjar de dansa!',

  init(ctx) {
    this._alive = true
    this._t = 0
    this._lastBeat = -1
    this._celebrated = false
    this._fullDone = false
    this._idle = 0
    this._placedCount = 0
    this._beatMs = 900
    this._rows = []
    this._stamps = []
    this._delays = []

    // Nivå styr storleken (3 djur/4 slots → 3 djur/5 slots → 4 djur/6 slots).
    const level = Math.min(ctx.progress.get().highestLevel || 1, 3)
    this._nAnimals = level >= 3 ? 4 : 3
    this._slots = level >= 3 ? 6 : level === 2 ? 5 : 4
    // Nivån låser också upp NYA BLOCK (shaker på 2, eko på 3). `blockSett` = hur många block
    // barnet redan fått se presenterade (sparas) — ett nytt block får sin hälsning EN gång.
    this._nBlock = blockAntal(ctx.progress.get().highestLevel || 1)

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Lager-ordning: bakgrund < radpaneler < playhead < djur/slots(+block) < bricka < stämplar.
    const sc = (this._scen = nastaVariant(SCENER[Math.min(level, 3) - 1], this._scen?.id))
    this._root.addChild(
      createScene(sc.tema, { width: ctx.width, height: ctx.height, silhuett: sc.silhuett || false, forgrund: !!sc.forgrund, fro: 1 + ((Math.random() * 900) | 0) }),
    )
    this._panelLayer = new Container()
    this._panelLayer.eventMode = 'none'
    this._root.addChild(this._panelLayer)
    this._buildPlayhead()
    this._stageLayer = new Container()
    this._root.addChild(this._stageLayer)

    this._drag = new DragController({ space: this._root, services: ctx.services })

    this._buildRows(ctx)
    this._buildTray(ctx)
    // Barnets sparade låt kommer tillbaka. Firandet kräver ändå att barnet lägger/byter
    // minst ett block DEN HÄR gången — annars gav varje öppning ett gratis klistermärke.
    this._barnetsTur = false
    this._aterstallLoop(ctx)

    this._tick = (ticker) => this._loop(ticker, ctx)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    // Fler block framme än barnet sett presenterade (nivån steg förra gången, eller spelet fick
    // nya block medan barnet redan var högre upp): visa dem en gång.
    const sett = ctx.progress.get().custom?.blockSett || 5
    if (this._nBlock > sett) {
      ctx.later(0.7, () => this._visaNyaBlock(ctx, sett, this._nBlock))
    }
  },

  // Hälsa på nya block: stämpeln vinkar, gnistrar och låter, och rösten säger det en gång.
  // Sparar hur många block som presenterats så hälsningen aldrig upprepas.
  _visaNyaBlock(ctx, fran, till) {
    if (!this._alive) return
    for (let i = fran; i < till; i++) {
      const s = this._stamps[i]
      if (!s || s.destroyed) continue
      wiggle(s)
      sparkle(ctx.fxLayer, s.x, s.y)
      ctx.services.audio.tone({ freq: 880 + (i - fran) * 220, dur: 0.16, type: 'sine', vol: 0.12, delay: (i - fran) * 0.12 })
    }
    ctx.narTyst(() => {
      if (this._alive) ctx.services.voice.say('Titta, ett nytt block!')
    })
    ctx.progress.setCustom('blockSett', till)
  },

  // Blocken som ligger framme just nu, i stämpelordning.
  _cykel() {
    return [null, ...STAMP_ORDER.slice(0, this._nBlock)]
  },

  // --- bygg scenen ---------------------------------------------------------

  _buildPlayhead() {
    const ph = new Container()
    ph.eventMode = 'none'
    ph.addChild(new Graphics().roundRect(-6, 130, 12, 480, 6).fill({ color: COLORS.yellow, alpha: 0.55 }))
    ph.addChild(new Graphics().circle(0, 128, 13).fill({ color: COLORS.yellow, alpha: 0.9 }))
    ph.x = TRACK_X0
    this._playhead = ph
    this._root.addChild(ph)
  },

  _buildRows(ctx) {
    const ys = this._nAnimals === 4 ? Y4 : Y3
    const N = this._slots
    const gap = N > 1 ? (TRACK_X1 - TRACK_X0) / (N - 1) : 0
    for (let r = 0; r < this._nAnimals; r++) {
      const animal = ANIMALS[r]
      const yc = ys[r]
      // Banan (dekor): ett mjukt färgat band bakom slotsen — ingen ram, och djuret står
      // FRITT utanför det (P0 ASSETS: inga paneler eller ringar runt spelobjekt).
      const panel = new Graphics()
        .roundRect(200, yc - 58, 1018, 116, 30)
        .fill({ color: animal.color, alpha: 0.16 })
      panel.eventMode = 'none'
      this._panelLayer.addChild(panel)

      // Radgrupp (avatar + slots) — dimmas som helhet när djuret tystas.
      const group = new Container()
      this._stageLayer.addChild(group)

      const row = {
        id: animal.id,
        cry: animal.cry,
        yc,
        active: true,
        group,
        slots: new Array(N).fill(null),
        slotC: [],
        blockViews: new Array(N).fill(null),
        _playedThisLoop: false,
        _lastSampleAt: 0,
      }

      // Avatar.
      const avatar = this._makeAnimal(ctx, animal, yc)
      avatar.on('pointertap', () => this._toggleAnimal(ctx, row))
      group.addChild(avatar)
      row.view = avatar

      // Loop-bana med slots.
      for (let i = 0; i < N; i++) {
        const slotX = TRACK_X0 + i * gap
        const slot = this._makeSlot(slotX, yc)
        slot._row = row
        slot._idx = i
        // VIKTIGT: egen cykel-lyssnare FÖRE DragController-målet, så ett markerat
        // tap-tap-block placeras (av DragController) istället för att cykla.
        slot.on('pointertap', () => {
          if (!this._alive) return
          if (this._drag.selected) return // tap-tap-placering pågår
          this._cycleSlot(ctx, row, i)
        })
        this._drag.addTarget(slot, () => true, { hitRadius: 80 })
        group.addChild(slot)
        row.slotC.push(slot)
      }

      this._rows.push(row)
    }
  },

  _makeAnimal(ctx, animal, yc) {
    const c = new Container()
    c.x = 130
    c.y = yc
    // RITAT djurhuvud med egen silhuett (öron, horn, nos sticker ut) — förut satt en
    // emoji i en gräddvit cirkel, precis det P0 ASSETS förbjuder.
    c.addChild(new Graphics().ellipse(0, 52, 52, 12).fill({ color: COLORS.shadow, alpha: 0.12 }))
    // `huvud` bär livet (gupp + vaggning) och innehåller öronen + ansiktet. Öronen ligger i
    // var sin `ora`-container med pivån i fästpunkten och fjädrar (lib/vippa.js) — INRE barn,
    // aldrig `c` som bär hitArea och som hopp/snurr/pop tweenar.
    const huvud = new Container()
    huvud.eventMode = 'none'
    c.addChild(huvud)
    const g = new Graphics()
    const gl = new Graphics()
    const gr = new Graphics()
    drawAnimalHead(g, animal.id, gl, gr)
    g.eventMode = 'none'
    const [fx, fy] = EAR_FAST[animal.id] || EAR_FAST.gris
    c._wxOron = [[gl, -fx], [gr, fx]].map(([eg, px]) => {
      eg.position.set(-px, -fy) // geometrin är ritad i huvudets rum; pivån hamnar i fästpunkten
      eg.eventMode = 'none'
      const ora = new Container()
      ora.eventMode = 'none'
      ora.position.set(px, fy)
      ora.addChild(eg)
      huvud.addChild(ora)
      return vippa(ora, { axel: 'rot', max: 0.42, k: 210, damp: 0.16, ticker: ctx.ticker })
    })
    huvud.addChild(g)
    // Huvudet guppar och vaggar i sin egen takt (skuggan ligger kvar på marken).
    // Egen fas per djur — annars nickar hela raden i lås och läses som EN yta.
    liv(huvud, { bob: 5, sway: 0.02 })
    c._wxHuvud = huvud
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Circle(0, 0, 80)
    return c
  },

  _makeSlot(slotX, yc) {
    const c = new Container()
    c.x = slotX
    c.y = yc
    c.addChild(
      new Graphics()
        .roundRect(-46, -46, 92, 92, 18)
        .fill({ color: COLORS.white, alpha: 0.55 })
        .stroke({ width: 3, color: COLORS.inkSoft, alpha: 0.4 }),
    )
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Rectangle(-58, -58, 116, 116)
    return c
  },

  // En blockvy som ligger i en slot (icke-interaktiv — tap går till sloten under).
  _makeBlockView(type) {
    const c = new Container()
    c.eventMode = 'none'
    c.addChild(makeBlockArt(type))
    return c
  },

  _buildTray(ctx) {
    // Brick-panel (dekor).
    const tray = new Graphics()
      .roundRect(60, 624, 1160, 84, 24)
      .fill({ color: COLORS.white, alpha: 0.92 })
      .stroke({ width: 3, color: COLORS.yellow })
    tray.eventMode = 'none'
    this._root.addChild(tray)

    // Tempo-knapp (i brickan, till höger).
    this._root.addChild(this._makeTempo(ctx))

    // 5–7 dra-stämplar (oändlig källa — släpps i en slot men återgår alltid hem). Antalet
    // följer nivån (blockAntal); sju stämplar slutar vid x 930, före tempo-knappens träffyta (1090).
    STAMP_ORDER.slice(0, this._nBlock).forEach((type, i) => this._laggStamp(ctx, type, i))
  },

  // En stämpel på plats i (x 150 + i·130). Återanvänds när nivån låser upp ett nytt block mitt i
  // ett pass.
  _laggStamp(ctx, type, i) {
    const stamp = this._makeStamp(type)
    stamp.x = 150 + i * 130
    stamp.y = 666
    this._root.addChild(stamp)
    this._stamps.push(stamp)
    // Förhandslyssning i lyftet (samma pointerdown som DragController lyfter på).
    stamp.on('pointerdown', () => {
      if (this._alive) this._stampLjud(ctx, type)
    })
    this._drag.addItem(stamp, { type }, {
      onCorrect: (rec, target) => {
        if (!this._alive) return
        this._idle = 0
        const sv = target.view
        this._setSlot(ctx, sv._row, sv._idx, type)
        this._resetStamp(rec)
      },
      onMiss: (rec) => {
        if (!this._alive) return
        this._idle = 0
        puff(ctx.fxLayer, rec.view.x, rec.view.y)
        ctx.services.audio.sfx('soft')
      },
    })
    return stamp
  },

  _makeStamp(type) {
    const c = new Container()
    c.addChild(makeBlockArt(type))
    c.hitArea = new Rectangle(-58, -58, 116, 116)
    return c
  },

  // FÖRHANDSLYSSNING: stämpeln låter som sitt block i samma ögonblick som den lyfts (samma
  // pointerdown som DragController lyfter på) — barnet hör paletten innan det drar. Samma
  // ljud som `_perform` spelar i loopen, på en neutral marimba-ton. Röst-blocket låter som
  // ett djur — i tur och ordning, så det hörs att det är DJURETS röst som läggs.
  _stampLjud(ctx, type) {
    const nu = performance.now()
    if (nu - (this._stampLjudAt || 0) < 120) return // ett tryck = ett ljud
    this._stampLjudAt = nu
    const audio = ctx.services.audio
    const note = this._noteFreq('katt', 0)
    switch (type) {
      case 'hopp':
        audio.tone({ freq: note.freq, dur: 0.18, type: note.type, vol: 0.18 })
        break
      case 'snurr':
        audio.tone({ freq: note.freq, dur: 0.22, type: note.type, vol: 0.16, slideTo: note.freq * 1.5 })
        break
      case 'tut':
        audio.tone({ freq: note.freq, dur: 0.34, type: note.type, vol: 0.18 })
        break
      case 'klapp':
        audio.tone({ freq: note.freq, dur: 0.1, type: note.type, vol: 0.18 })
        audio.tone({ freq: note.freq, dur: 0.1, type: note.type, vol: 0.14, delay: 0.13 })
        break
      case 'shaker':
        ljudShaker(audio, note.freq, 0.9)
        break
      case 'eko':
        ljudEko(audio, note.freq, note.type, 0.9)
        break
      case 'rost': {
        const n = this._rows.length || 1
        this._rostIdx = ((this._rostIdx ?? -1) + 1) % n
        const id = this._rows[this._rostIdx]?.id
        // Aldrig rösten här: en förhandslyssning får inte kapa berättaren.
        if (!id || !audio.sample('djur_' + id)) audio.tone({ freq: note.freq, dur: 0.16, type: note.type, vol: 0.16, slideTo: note.freq * 1.25 })
        break
      }
    }
  },

  // Spara barnets låt (bara vilka block som ligger var) — en rad per djur.
  _sparaLoop(ctx) {
    ctx.progress.setCustom('loop', this._rows.map((r) => r.slots.map((t) => t || null)))
  },

  // Lägg tillbaka en sparad låt TYST (ingen gnista/pling per block vid start). Nätet kan ha
  // vuxit sedan sist (nivån styr 3–4 djur × 4–6 fack): det som ryms läggs tillbaka, resten
  // av de nya facken står tomma. Okända typer hoppas över.
  _aterstallLoop(ctx) {
    const sparad = ctx.progress.get().custom?.loop
    if (!Array.isArray(sparad)) return
    for (let r = 0; r < Math.min(sparad.length, this._rows.length); r++) {
      const row = this._rows[r]
      const rad = Array.isArray(sparad[r]) ? sparad[r] : []
      for (let i = 0; i < Math.min(rad.length, this._slots); i++) {
        const type = rad[i]
        if (!type || !BLOCKS[type] || STAMP_ORDER.indexOf(type) >= this._nBlock) continue
        row.slots[i] = type
        const bv = this._makeBlockView(type)
        row.slotC[i].addChild(bv)
        row.blockViews[i] = bv
        this._placedCount++
      }
    }
    // Är nätet redan fullt ska milstolpen inte smälla vid första ändringen.
    this._fullDone = this._placedCount >= this._rows.length * this._slots
  },

  // Återställ stämpeln till sin hemplats så den är en oändlig källa.
  _resetStamp(rec) {
    const v = rec.view
    if (!v || v.destroyed) return
    gsap.killTweensOf(v)
    gsap.killTweensOf(v.scale)
    v.x = rec.home.x
    v.y = rec.home.y
    v.scale.set(rec.base.x, rec.base.y)
    v.eventMode = 'static'
    rec.placed = false
    rec.dragging = false
  },

  _makeTempo(ctx) {
    const c = new Container()
    c.x = 1150
    c.y = 666
    c.addChild(new Graphics().circle(0, 0, 46).fill(COLORS.yellow).stroke({ width: 4, color: COLORS.white }))
    // Ritad sköldpadda/hare — takt-knappen är en UI-kontroll, men den ritas ändå.
    const icon = new Graphics()
    icon.eventMode = 'none'
    drawTempoIcon(icon, false)
    c.addChild(icon)
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.hitArea = new Circle(0, 0, 60)
    c.on('pointertap', () => {
      if (!this._alive) return
      this._idle = 0
      this._beatMs = this._beatMs === 900 ? 640 : 900
      drawTempoIcon(icon, this._beatMs === 640)
      ctx.services.audio.sfx('flip')
      pop(c)
    })
    this._tempo = c
    return c
  },

  // --- spel-state ----------------------------------------------------------

  // Sätt/ersätt/töm en slot. type=null tömmer. Uppdaterar räknare + blockvy.
  _setSlot(ctx, row, i, type) {
    if (!this._alive) return
    const old = row.slots[i]
    const oldView = row.blockViews[i]
    if (oldView && !oldView.destroyed) {
      gsap.killTweensOf(oldView)
      gsap.killTweensOf(oldView.scale)
      oldView.destroy({ children: true })
    }
    row.blockViews[i] = null
    if (old && !type) this._placedCount--
    else if (!old && type) this._placedCount++
    row.slots[i] = type
    if (type) {
      const bv = this._makeBlockView(type)
      row.slotC[i].addChild(bv)
      row.blockViews[i] = bv
      bounceIn(bv)
      sparkle(ctx.fxLayer, row.slotC[i].x, row.yc)
      ctx.services.audio.sfx('pling')
    }
    this._barnetsTur = true
    this._sparaLoop(ctx)
    this._checkFullMilestone(ctx)
  },

  // Tap på slot cyklar block-typen (tomt → hopp → … → röst → tomt).
  _cycleSlot(ctx, row, i) {
    this._idle = 0
    const cur = row.slots[i]
    const cykel = this._cykel()
    const next = cykel[(cykel.indexOf(cur) + 1) % cykel.length]
    this._setSlot(ctx, row, i, next)
    ctx.services.audio.sfx('pop')
  },

  // Tap på djuret tystar/aktiverar dess rad (sola ut ett djur).
  _toggleAnimal(ctx, row) {
    if (!this._alive) return
    this._idle = 0
    row.active = !row.active
    gsap.killTweensOf(row.group)
    gsap.to(row.group, { alpha: row.active ? 1 : 0.5, duration: 0.2 })
    if (row.active) {
      ctx.services.audio.sfx('pop')
      pop(row.view)
      this._oronStot(row, 0.9)
    } else {
      ctx.services.audio.sfx('flip')
    }
  },

  // Milstolpe: alla slots i alla banor fyllda → extra gnistor (spammar ALDRIG complete).
  _checkFullMilestone(ctx) {
    const total = this._rows.length * this._slots
    if (total > 0 && this._placedCount >= total) {
      if (!this._fullDone) {
        this._fullDone = true
        this._rows.forEach((r) => sparkle(ctx.fxLayer, r.slotC[this._slots - 1].x, r.yc))
        floatText(ctx.fxLayer, ctx.width / 2, 116, '⭐', { fontSize: 72, rise: 80 })
      }
    } else {
      this._fullDone = false
    }
  },

  // --- loop-timer (ticker-driven, exit-säker) -----------------------------

  _loop(ticker, ctx) {
    if (!this._alive) return
    const dt = ticker.deltaMS
    this._t += dt
    // Tomgången räknas från TYSTNAD: medan en replik talar står klockan still (V21 —
    // annars kapar påminnelsens say() en replik som redan talar).
    if (ctx.services.voice.talar) this._idle = 0
    this._idle += dt / 1000

    // Playhead glider mjukt (ren positionsuppdatering, ingen fysik).
    const cycle = this._beatMs * this._slots
    const frac = (this._t % cycle) / cycle
    this._playhead.x = TRACK_X0 + frac * (TRACK_X1 - TRACK_X0)

    // Beat-trigger.
    const beat = Math.floor(this._t / this._beatMs) % this._slots
    if (beat !== this._lastBeat) {
      const wrapped = beat === 0 && this._lastBeat !== -1
      if (wrapped) this._onLoopWrap(ctx) // utvärdera varvet som just tog slut
      for (const row of this._rows) {
        if (!row.active) continue
        const type = row.slots[beat]
        if (type) {
          this._perform(ctx, row, type, beat)
          row._playedThisLoop = true
        }
      }
      // Beat-puls: hela den aktiva kolumnen studsar mjukt så takten SYNS.
      for (const row of this._rows) {
        const sc = row.slotC[beat]
        if (sc && !sc.destroyed) {
          gsap.killTweensOf(sc.scale)
          gsap.to(sc.scale, { x: 1.12, y: 1.12, duration: 0.09, yoyo: true, repeat: 1, ease: 'power2.out', onComplete: () => { if (!sc.destroyed) sc.scale.set(1) } })
        }
      }
      this._lastBeat = beat
    }

    // Mjuk idle-vink — bara om inga block ännu placerats (annars talar musiken själv).
    if (this._idle > 6 && this._placedCount === 0) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      const s = this._stamps[0]
      if (s && !s.destroyed) wiggle(s)
    }
  },

  // Slut på ett varv: om varje aktivt djur spelat ≥1 block → mjukt firande (en gång).
  _onLoopWrap(ctx) {
    if (!this._celebrated) {
      const active = this._rows.filter((r) => r.active)
      if (this._barnetsTur && this._placedCount > 0 && active.length > 0 && active.every((r) => r._playedThisLoop)) {
        this._celebrate(ctx)
      }
    }
    for (const row of this._rows) row._playedThisLoop = false
  },

  _celebrate(ctx) {
    this._celebrated = true
    ctx.progress.complete() // firande (1–2s) + stjärna + klistermärke; loopen pausas INTE
    // Progression: nästa besök får fler slots/djur; räkna skapade arrangemang.
    const cur = ctx.progress.get().highestLevel || 1
    ctx.progress.setLevel(cur + 1)
    const n = ctx.progress.get().custom?.arrangemang || 0
    ctx.progress.setCustom('arrangemang', n + 1)
    // Nivån steg: ett nytt block kommer fram DIREKT i brickan (rutnätet växer först nästa besök).
    const nya = blockAntal(cur + 1)
    if (nya > this._nBlock) {
      const fran = this._nBlock
      for (let i = fran; i < nya; i++) {
        const s = this._laggStamp(ctx, STAMP_ORDER[i], i)
        bounceIn(s, { delay: 0.3 + (i - fran) * 0.15 })
      }
      this._nBlock = nya
      ctx.later(0.4, () => this._visaNyaBlock(ctx, fran, nya))
    }
  },

  // Tonen för ett djur vid ett slot-index: djurets instrument på pentatonisk skala,
  // skalsteget bestäms av slot-index (rad av block stiger till en melodi).
  _noteFreq(id, slotIdx) {
    const ins = INSTRUMENTS[id] || INSTRUMENTS.ko
    const semi = PENTA[slotIdx % PENTA.length] + 12 * Math.floor(slotIdx / PENTA.length)
    return { freq: ins.base * Math.pow(2, semi / 12), type: ins.type }
  },

  // Utför ett blocks rörelse + ljud på djurets PERSISTENTA avatar-vy (exit-säkert).
  // Blocken spelar nu en STÄMD ton (harmoniserar mellan djur); röst = djurets läte.
  _perform(ctx, row, type, slotIdx = 0) {
    const view = row.view
    if (!view || view.destroyed) return
    const audio = ctx.services.audio
    const note = this._noteFreq(row.id, slotIdx)
    switch (type) {
      case 'hopp':
        gsap.killTweensOf(view, 'y')
        view.y = row.yc
        gsap.to(view, { y: row.yc - 26, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' })
        this._oronStot(row, 0.7) // öronen hänger kvar i luften …
        this._later(0.24, () => this._oronStot(row, -0.9)) // … och flaxar vid landningen
        audio.tone({ freq: note.freq, dur: 0.18, type: note.type, vol: 0.2 })
        break
      case 'snurr':
        gsap.to(view, { rotation: view.rotation + Math.PI * 2, duration: 0.4, ease: 'power1.inOut' })
        this._oronStot(row, 1)
        audio.tone({ freq: note.freq, dur: 0.22, type: note.type, vol: 0.18, slideTo: note.freq * 1.5 }) // liten upp-svirr
        break
      case 'tut':
        pop(view, { scale: 1.3 })
        this._oronStot(row, 0.8)
        audio.tone({ freq: note.freq, dur: 0.34, type: note.type, vol: 0.2 })
        break
      case 'klapp':
        pop(view)
        this._oronStot(row, 0.6)
        this._later(0.13, () => { pop(view); this._oronStot(row, -0.6) }) // snabb dubbel-squash
        audio.tone({ freq: note.freq, dur: 0.1, type: note.type, vol: 0.2 })
        this._later(0.13, () => audio.tone({ freq: note.freq, dur: 0.1, type: note.type, vol: 0.16 }))
        break
      case 'rost': {
        pop(view, { scale: 1.22 })
        this._oronStot(row, 0.7)
        const now = performance.now()
        if (now - row._lastSampleAt > 120) {
          row._lastSampleAt = now
          if (!audio.sample('djur_' + row.id)) ctx.services.voice.say(row.cry)
        }
        floatText(ctx.fxLayer, view.x, view.y - 70, '🎵', { fontSize: 48, rise: 70 })
        break
      }
      case 'shaker': {
        // Skakar sidledes (tre fram-och-tillbaka) medan öronen flaxar i motfas och pärlor flyger.
        gsap.killTweensOf(view, 'x')
        view.x = AVATAR_X
        gsap.to(view, {
          x: AVATAR_X + 9,
          duration: 0.045,
          yoyo: true,
          repeat: 5,
          ease: 'sine.inOut',
          onComplete: () => {
            if (!view.destroyed) view.x = AVATAR_X
          },
        })
        this._oronStot(row, 0.6)
        this._later(0.07, () => this._oronStot(row, -0.6))
        this._later(0.14, () => this._oronStot(row, 0.6))
        puff(ctx.fxLayer, view.x, view.y - 40, { count: 3, color: COLORS.teal })
        ljudShaker(audio, note.freq, 1)
        break
      }
      case 'eko': {
        // Tonen ekar tillbaka tre gånger, allt svagare; en ring och en liten puls per eko.
        pop(view, { scale: 1.2 })
        this._oronStot(row, 0.7)
        // Ekots steg skalas med takten: i snabbaste tempot ska svansen hinna dö ut före nästa slag.
        const steg = Math.min(EKO_STEG, (this._beatMs / 1000) * 0.28)
        ljudEko(audio, note.freq, note.type, 1, steg)
        const rad = COLORS.pink
        for (let k = 1; k <= 3; k++) {
          this._later(steg * k, () => {
            if (view.destroyed) return
            ripple(ctx.fxLayer, view.x, view.y, { color: rad, maxR: 55 + k * 22, duration: 0.5, width: 5, alpha: 0.6 - k * 0.12 })
            if (k < 3) pop(view, { scale: 1.1 - k * 0.025 })
          })
        }
        break
      }
    }
  },

  // Öronen fjädrar (lib/vippa.js): vänster/höger speglade, så båda slår UT eller IN tillsammans.
  _oronStot(row, v) {
    if (!this._alive) return
    const o = row?.view?._wxOron
    if (!o) return
    o[0].stot(v)
    o[1].stot(-v)
  },

  // Exit-säker fördröjd anrop (kör bara om spelet lever).
  _later(sec, fn) {
    const c = gsap.delayedCall(sec, () => {
      if (this._alive) fn()
    })
    // Färdiga anrop rensas när listan växer — öronstötarna lägger ett per hopp/klapp-beat.
    if (this._delays.length > 32) this._delays = this._delays.filter((d) => d.parent)
    this._delays.push(c)
    return c
  },

  // --- städning ------------------------------------------------------------

  destroy(ctx) {
    this._alive = false
    ctx.ticker.remove(this._tick)

    this._delays.forEach((d) => d?.kill())
    this._delays = []

    this._drag?.destroy()

    // Döda alla tweens på persistenta vyer innan de förstörs (ingen null-transform-krasch).
    for (const row of this._rows) {
      // Öronfjädrarna är tickerlyssnare, inga tweens — släpp dem före rivningen.
      for (const o of row.view?._wxOron || []) o.destroy()
      if (row.view) row.view._wxOron = null
      row.view?._wxHuvud?._fxLiv?.kill() // vilo-guppet är en evig tween på huvudet — döda den uttryckligen
      if (row.view && !row.view.destroyed) {
        gsap.killTweensOf(row.view)
        gsap.killTweensOf(row.view.scale)
      }
      if (row.group && !row.group.destroyed) gsap.killTweensOf(row.group)
      for (const bv of row.blockViews) {
        if (bv && !bv.destroyed) {
          gsap.killTweensOf(bv)
          gsap.killTweensOf(bv.scale)
        }
      }
      for (const sc of row.slotC || []) {
        if (sc && !sc.destroyed) gsap.killTweensOf(sc.scale)
      }
    }
    if (this._playhead && !this._playhead.destroyed) gsap.killTweensOf(this._playhead)
    if (this._tempo && !this._tempo.destroyed) {
      gsap.killTweensOf(this._tempo)
      gsap.killTweensOf(this._tempo.scale)
    }
    for (const s of this._stamps) {
      if (s && !s.destroyed) {
        gsap.killTweensOf(s)
        gsap.killTweensOf(s.scale)
      }
    }
    gsap.killTweensOf(this._root)

    ctx.services.voice.cancel()
    this._root?.destroy({ children: true })
  },
}

// Ljud för de nya blocken (stämpelns förhandslyssning och loopens uppspelning delar dem).
// `vol` skalar volymen. Skakan = tre korta tick på djurets egen ton (oktav upp) så den klingar
// ihop med resten; ekot = tonen och tre allt svagare upprepningar.
const EKO_STEG = 0.24 // s mellan ekona
function ljudShaker(audio, freq, vol) {
  for (let k = 0; k < 3; k++) {
    audio.tone({ freq: freq * 2, dur: 0.035, type: 'square', vol: 0.07 * vol, delay: k * 0.07 })
    audio.tone({ freq: freq * 4, dur: 0.05, type: 'triangle', vol: 0.05 * vol, delay: k * 0.07 + 0.01 })
  }
}
function ljudEko(audio, freq, type, vol, steg = EKO_STEG) {
  ;[0.2, 0.12, 0.07, 0.035].forEach((v, k) => {
    audio.tone({ freq, dur: k === 0 ? 0.2 : Math.min(0.14, steg * 0.8), type, vol: v * vol, delay: k * steg })
  })
}

// =================== Programmatisk grafik ===================

// Djurhuvuden med EGEN silhuett — öron, horn och nosar sticker ut ur konturen, så de
// aldrig blir "en ikon i en cirkel". Origo = mitten av huvudet.
// Öronen ritas i EGNA Graphics (`gl` vänster, `gr` höger, i huvudets koordinater) så de kan
// fjädra var för sig kring fästpunkten (EAR_FAST, lib/vippa.js). Resten av huvudet i `g`.
function drawAnimalHead(g, id, gl, gr) {
  g.clear()
  gl.clear()
  gr.clear()
  if (id === 'ko') {
    g.ellipse(-48, -32, 15, 9).fill(0xefe0c2).stroke({ width: 3, color: 0xc9b48a }) // horn
    g.ellipse(48, -32, 15, 9).fill(0xefe0c2).stroke({ width: 3, color: 0xc9b48a })
    gl.ellipse(-57, -6, 20, 13).fill(0xf4f0ea).stroke({ width: 3, color: 0xc0b8ac }) // öron
    gr.ellipse(57, -6, 20, 13).fill(0xf4f0ea).stroke({ width: 3, color: 0xc0b8ac })
    g.ellipse(0, 0, 50, 46).fill(0xfbf8f4).stroke({ width: 4, color: 0xb0a89c })
    g.ellipse(-29, -18, 16, 12).fill(0x4a4038) // fläckar
    g.ellipse(31, 9, 13, 10).fill(0x4a4038)
    g.ellipse(0, 21, 30, 20).fill(0xffb9cf).stroke({ width: 3, color: 0xe08bad }) // mule
    g.ellipse(-10, 19, 4.5, 6).fill(0xd8749b)
    g.ellipse(10, 19, 4.5, 6).fill(0xd8749b)
    g.circle(-18, -9, 5.5).fill(0x2f2823)
    g.circle(18, -9, 5.5).fill(0x2f2823)
    g.circle(-16, -11, 2).fill(0xffffff)
    g.circle(20, -11, 2).fill(0xffffff)
  } else if (id === 'hund') {
    gl.ellipse(-46, 8, 17, 33).fill(0x8a5a3b).stroke({ width: 3, color: 0x5e3720 }) // hängöron
    gr.ellipse(46, 8, 17, 33).fill(0x8a5a3b).stroke({ width: 3, color: 0x5e3720 })
    g.ellipse(0, -2, 48, 44).fill(0xd7a06a).stroke({ width: 4, color: 0xa8763c })
    g.ellipse(0, -32, 34, 16).fill(0xc08a52) // lugg
    g.ellipse(0, 22, 27, 19).fill(0xf0d3ae).stroke({ width: 3, color: 0xc59f74 }) // nosparti
    g.ellipse(0, 13, 11, 8).fill(0x3a2a20)
    g.roundRect(-7, 30, 14, 15, 7).fill(0xff8fae) // tunga
    g.circle(-17, -8, 5.5).fill(0x2f2823)
    g.circle(17, -8, 5.5).fill(0x2f2823)
    g.circle(-15, -10, 2).fill(0xffffff)
    g.circle(19, -10, 2).fill(0xffffff)
  } else if (id === 'katt') {
    gl.poly([-46, -54, -18, -28, -54, -16]).fill(0xf2a34a).stroke({ width: 3, color: 0xc07a24 }) // öron
    gr.poly([46, -54, 18, -28, 54, -16]).fill(0xf2a34a).stroke({ width: 3, color: 0xc07a24 })
    gl.poly([-42, -45, -25, -29, -46, -22]).fill(0xffc9d8)
    gr.poly([42, -45, 25, -29, 46, -22]).fill(0xffc9d8)
    g.ellipse(0, 2, 46, 42).fill(0xf2a34a).stroke({ width: 4, color: 0xc07a24 })
    g.roundRect(-11, -34, 5, 15, 2.5).fill(0xc07a24) // pannränder
    g.roundRect(2, -36, 5, 15, 2.5).fill(0xc07a24)
    g.poly([0, 12, -8, 4, 8, 4]).fill(0xff8fae)
    g.moveTo(-14, 16).lineTo(-48, 10).stroke({ width: 2.5, color: 0xfffdf7, cap: 'round' }) // morrhår
    g.moveTo(-14, 20).lineTo(-46, 24).stroke({ width: 2.5, color: 0xfffdf7, cap: 'round' })
    g.moveTo(14, 16).lineTo(48, 10).stroke({ width: 2.5, color: 0xfffdf7, cap: 'round' })
    g.moveTo(14, 20).lineTo(46, 24).stroke({ width: 2.5, color: 0xfffdf7, cap: 'round' })
    g.ellipse(-17, -6, 6, 8).fill(0x2f2823)
    g.ellipse(17, -6, 6, 8).fill(0x2f2823)
    g.circle(-15, -9, 2.2).fill(0xffffff)
    g.circle(19, -9, 2.2).fill(0xffffff)
  } else {
    gl.poly([-44, -40, -14, -30, -34, -6]).fill(0xffb3c8).stroke({ width: 3, color: 0xe0709b }) // öron
    gr.poly([44, -40, 14, -30, 34, -6]).fill(0xffb3c8).stroke({ width: 3, color: 0xe0709b })
    g.ellipse(0, 0, 48, 42).fill(0xffc3d4).stroke({ width: 4, color: 0xe0709b })
    g.ellipse(0, 17, 25, 18).fill(0xff9ec4).stroke({ width: 3, color: 0xd45f8c }) // tryne
    g.ellipse(-8, 16, 4, 6).fill(0xc44a7a)
    g.ellipse(8, 16, 4, 6).fill(0xc44a7a)
    g.circle(-17, -10, 5.5).fill(0x2f2823)
    g.circle(17, -10, 5.5).fill(0x2f2823)
    g.circle(-15, -12, 2).fill(0xffffff)
    g.circle(19, -12, 2).fill(0xffffff)
  }
}

// Blockens konst: ett RIKTIGT ritat föremål med en mjuk färgglöd bakom (rund glöd,
// aldrig en ruta) — förut satt en emoji i en färgad fyrkant.
function makeBlockArt(type) {
  const b = BLOCKS[type]
  const c = new Container()
  c.eventMode = 'none'
  c.addChild(new Graphics()
    .circle(0, 5, 45).fill({ color: b.color, alpha: 0.2 })
    .circle(0, 0, 38).fill({ color: b.color, alpha: 0.3 }))
  const g = new Graphics()
  g.eventMode = 'none'
  if (type === 'hopp') {
    // Studsfjäder med platta.
    g.roundRect(-24, 26, 48, 11, 5.5).fill(0x3f8a4f)
    for (let i = 0; i < 4; i++) {
      const y = 20 - i * 11
      g.moveTo(-18, y).quadraticCurveTo(0, y - 13, 18, y - 4)
        .stroke({ width: 8, color: COLORS.green, cap: 'round' })
    }
    g.circle(0, -30, 13).fill(COLORS.green).stroke({ width: 3, color: 0x3f8a4f })
    g.circle(-4, -34, 4).fill({ color: COLORS.white, alpha: 0.6 })
  } else if (type === 'snurr') {
    // Snurra: kon nedåt, knopp upptill, virvel.
    g.moveTo(-29, -14).lineTo(29, -14).lineTo(0, 35).closePath().fill(COLORS.blue).stroke({ width: 3, color: 0x2f7cb0 })
    g.ellipse(0, -14, 29, 10).fill(0x7bc4ea).stroke({ width: 3, color: 0x2f7cb0 })
    g.roundRect(-5, -35, 10, 21, 5).fill(0x2f7cb0)
    g.circle(0, -39, 8).fill(COLORS.white).stroke({ width: 3, color: 0x2f7cb0 })
    g.moveTo(-17, -12).quadraticCurveTo(0, 6, 15, -6).stroke({ width: 3.5, color: COLORS.white, alpha: 0.85, cap: 'round' })
  } else if (type === 'tut') {
    // Trumpet med klockstycke och ventiler.
    g.roundRect(-36, -7, 50, 15, 7.5).fill(COLORS.yellow).stroke({ width: 3, color: 0xc98a2e })
    g.moveTo(12, -24).lineTo(34, -32).lineTo(34, 32).lineTo(12, 24).closePath().fill(COLORS.yellow).stroke({ width: 3, color: 0xc98a2e })
    g.ellipse(34, 0, 8, 32).fill(0xffe9a8).stroke({ width: 3, color: 0xc98a2e })
    for (let i = 0; i < 3; i++) g.roundRect(-24 + i * 13, -22, 8, 17, 4).fill(0xc98a2e)
    g.roundRect(-44, -9, 12, 19, 6).fill(0xc98a2e)
  } else if (type === 'klapp') {
    // Två händer som möts + rörelsestreck.
    g.roundRect(-35, -16, 29, 37, 13).fill(0xf6c396).stroke({ width: 3, color: 0xcf9a68 })
    g.roundRect(-31, -29, 10, 21, 5).fill(0xf6c396).stroke({ width: 2.5, color: 0xcf9a68 })
    g.roundRect(6, -16, 29, 37, 13).fill(0xffd7ae).stroke({ width: 3, color: 0xcf9a68 })
    g.roundRect(21, -29, 10, 21, 5).fill(0xffd7ae).stroke({ width: 2.5, color: 0xcf9a68 })
    for (const [x0, y0, x1, y1] of [[-38, -30, -46, -40], [0, -36, 0, -48], [38, -30, 46, -40]]) {
      g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 4, color: COLORS.red, alpha: 0.85, cap: 'round' })
    }
  } else if (type === 'shaker') {
    // Två maracas som lutar isär: handtag, äggformat huvud med band och prickar.
    for (const [sx, hx, hy, fa, fb] of [[-1, -15, -12, COLORS.teal, 0x2f9a8f], [1, 15, -12, COLORS.orange, 0xc9731f]]) {
      g.moveTo(hx + sx * 4, hy + 14).lineTo(hx + sx * 15, 30).stroke({ width: 9, color: 0x8a5a3b, cap: 'round' })
      g.circle(hx + sx * 16, 33, 6.5).fill(0xc08a52).stroke({ width: 2.5, color: 0x8a5a3b })
      g.ellipse(hx, hy, 18, 22).fill(fa).stroke({ width: 3, color: fb })
      g.moveTo(hx - 15, hy + 3).quadraticCurveTo(hx, hy + 12, hx + 15, hy + 3).stroke({ width: 3.5, color: COLORS.white, alpha: 0.85, cap: 'round' })
      for (const [dx, dy] of [[-6, -10], [5, -13], [0, -3]]) g.circle(hx + dx, hy + dy, 2.8).fill({ color: COLORS.white, alpha: 0.9 })
    }
  } else if (type === 'eko') {
    // Klocka som ringer: kupol, kant, kläpp och ringar som ekar ut åt sidorna.
    const rim = 0xc98a2e
    g.moveTo(0, -30).lineTo(0, -26).stroke({ width: 5, color: rim, cap: 'round' })
    g.circle(0, -33, 5).fill(COLORS.yellow).stroke({ width: 2.5, color: rim })
    g.moveTo(-25, 18).quadraticCurveTo(-29, -24, 0, -26).quadraticCurveTo(29, -24, 25, 18).closePath()
      .fill(COLORS.yellow).stroke({ width: 3, color: rim })
    g.roundRect(-31, 14, 62, 11, 5.5).fill(0xffe9a8).stroke({ width: 3, color: rim })
    g.circle(0, 31, 7).fill(rim)
    g.moveTo(-12, -14).quadraticCurveTo(-18, -6, -16, 6).stroke({ width: 4, color: COLORS.white, alpha: 0.7, cap: 'round' })
    for (const [r, a] of [[44, 0.8], [54, 0.45]]) {
      bage(g, 0, -2, r, Math.PI * 0.78, Math.PI * 1.22).stroke({ width: 4, color: COLORS.pink, alpha: a, cap: 'round' })
      bage(g, 0, -2, r, -Math.PI * 0.22, Math.PI * 0.22).stroke({ width: 4, color: COLORS.pink, alpha: a, cap: 'round' })
    }
  } else {
    // Musiknot — djurets egen röst.
    g.ellipse(-11, 25, 17, 13).fill(COLORS.purple).stroke({ width: 3, color: 0x7a5fd0 })
    g.roundRect(2, -32, 7, 58, 3.5).fill(COLORS.purple)
    g.moveTo(9, -32).quadraticCurveTo(36, -24, 27, 4).quadraticCurveTo(31, -15, 9, -13).closePath()
      .fill(COLORS.purple).stroke({ width: 3, color: 0x7a5fd0 })
  }
  c.addChild(g)
  return c
}

// Takt-knappens ikon: sköldpadda (lugnt) eller hare (snabbt).
function drawTempoIcon(g, fast) {
  g.clear()
  if (fast) {
    g.ellipse(-8, -25, 6, 18).fill(0xfffdf7).stroke({ width: 2.5, color: 0xb9a98f })
    g.ellipse(9, -27, 6, 18).fill(0xfffdf7).stroke({ width: 2.5, color: 0xb9a98f })
    g.ellipse(-8, -25, 3, 11).fill(0xffc9d8)
    g.ellipse(9, -27, 3, 11).fill(0xffc9d8)
    g.ellipse(0, 3, 21, 18).fill(0xfffdf7).stroke({ width: 3, color: 0xb9a98f })
    g.circle(-7, 0, 3).fill(0x3a2f28)
    g.circle(7, 0, 3).fill(0x3a2f28)
    g.ellipse(0, 9, 5, 4).fill(0xff9ec4)
  } else {
    g.ellipse(-22, 16, 9, 6).fill(0x8ec96e).stroke({ width: 2.5, color: 0x3f6f2c }) // fötter
    g.ellipse(16, 17, 9, 6).fill(0x8ec96e).stroke({ width: 2.5, color: 0x3f6f2c })
    g.ellipse(-30, -3, 8, 7).fill(0x8ec96e).stroke({ width: 2.5, color: 0x3f6f2c }) // svans
    g.ellipse(26, -6, 13, 11).fill(0x8ec96e).stroke({ width: 2.5, color: 0x3f6f2c }) // huvud
    g.circle(30, -9, 2.6).fill(0x2f2823)
    g.ellipse(0, 0, 28, 21).fill(0x6fae52).stroke({ width: 3.5, color: 0x3f6f2c }) // skal
    for (const [hx, hy, rr] of [[0, -6, 9], [-14, 3, 7], [13, 4, 7], [-2, 10, 6]]) {
      g.circle(hx, hy, rr).fill(0x8ec96e).stroke({ width: 2, color: 0x3f6f2c })
    }
  }
}
