// Tryck och Förvandla — magisk orsak-verkan-lek (2–5 år).
//
// På en mjuk ängsscen står flera "förtrollade" saker på var sin platta. Varje
// tryck puffar i en magisk poff och förvandlar saken ett steg längre i sin
// kedja: frö → grodd → planta → blomma, ägg → kyckling → höna, larv → fjäril,
// moln → regn → regnbåge, bil → buss → raket … Rösten säger vad den blev.
//
// Djup utan att bli svårt: ju högre nivå desto FLER saker på scenen och desto
// LÄNGRE kedjor (2–3 tryck för att fullborda). När ALLA saker i omgången är
// fullt förvandlade firar vi (delat firande + stjärna + klistermärke) och en ny
// omgång dyker upp. Inga felsteg, ingen timer, inget slut — bara magi.
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { pop, wiggle, sparkle, burst, ripple, floatText, breathe, shake } from '../../lib/feedback.js'
import { COLORS, PLAYFUL } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

// Förvandlingskedjor. Varje steg: e=emoji, n=svenskt namn, a=artikel (en/ett).
// Sista steget = "resultatet" som rösten ropar ut. Blandade längder (2–4 steg)
// så svårighet kan väljas per nivå (kortare kedjor lågt, längre högt upp).
// k = ritnyckel (drawThing), n = svenskt namn, a = artikel (en/ett). Allt RITAT — förut
// var varje steg en emoji i en cirkelplatta, precis det P0 ASSETS förbjuder.
const CHAINS = [
  [{ k: 'fro', n: 'frö', a: 'Ett' }, { k: 'grodd', n: 'grodd', a: 'En' }, { k: 'planta', n: 'planta', a: 'En' }, { k: 'blomma', n: 'blomma', a: 'En' }],
  [{ k: 'agg', n: 'ägg', a: 'Ett' }, { k: 'kyckling', n: 'kyckling', a: 'En' }, { k: 'hona', n: 'höna', a: 'En' }],
  [{ k: 'moln', n: 'moln', a: 'Ett' }, { k: 'regnmoln', n: 'regnmoln', a: 'Ett' }, { k: 'regnbage', n: 'regnbåge', a: 'En' }],
  [{ k: 'bil', n: 'bil', a: 'En' }, { k: 'buss', n: 'buss', a: 'En' }, { k: 'raket', n: 'raket', a: 'En' }],
  [{ k: 'larv', n: 'larv', a: 'En' }, { k: 'fjaril', n: 'fjäril', a: 'En' }],
  [{ k: 'snoflinga', n: 'snöflinga', a: 'En' }, { k: 'snogubbe', n: 'snögubbe', a: 'En' }],
  [{ k: 'valp', n: 'valp', a: 'En' }, { k: 'hund', n: 'hund', a: 'En' }],
  [{ k: 'kattunge', n: 'kattunge', a: 'En' }, { k: 'katt', n: 'katt', a: 'En' }],
  [{ k: 'gnista', n: 'gnista', a: 'En' }, { k: 'stjarna', n: 'stjärna', a: 'En' }],
  [{ k: 'mane', n: 'måne', a: 'En' }, { k: 'fullmane', n: 'fullmåne', a: 'En' }],
]

// Lugna idle-uppmuntringar (sägs efter ~7s tystnad).
const HINTS = ['Tryck på en sak till!', 'Vad blir det här?', 'Tryck så förvandlas de!', 'Förvandla mer!']

// Kedjespecifik poff-smak (nyckel = kedjans FÖRSTA emoji): egna partikelfärger + en
// liten flöts-emoji (blad/droppe/hjärta/stjärnstoft). Ger varje förvandling eget uttryck.
const FLAVORS = {
  fro: { colors: [0x5bbf6a, 0x3f9e52], puff: '🍃' },
  agg: { colors: [0xffd35c, 0xffe08a], puff: '💛' },
  moln: { colors: [0x4aa3df, 0x9ad0f0], puff: '💧' },
  bil: { colors: [0x9aa7b0, 0xff8a3d], puff: '💨' },
  larv: { colors: [0xff9ec4, 0xa78bfa, 0xffd35c], puff: '🦋' },
  snoflinga: { colors: [0xcfeeff, 0xffffff], puff: '❄️' },
  valp: { colors: [0xff6b6b, 0xff9ec4], puff: '❤️' },
  kattunge: { colors: [0xff6b6b, 0xff9ec4], puff: '❤️' },
  gnista: { colors: [0xffd35c, 0xfff3b0], puff: '⭐' },
  mane: { colors: [0xa78bfa, 0xfff3b0], puff: '✨' },
}

const MAX_LEVEL = 6
const MAX_OBJ = 6

// Antal saker på scenen per nivå (fler ju högre upp).
function objCountFor(level) {
  return Math.min(MAX_OBJ, 2 + level)
}
// Längsta tillåtna kedja per nivå (kortare = lättare/snabbare belöning).
function maxStagesFor(level) {
  return level <= 1 ? 2 : level <= 2 ? 3 : 4
}

export default {
  id: 'tryck-och-forvandla',
  titleSv: 'Tryck och Förvandla',
  icon: '✨',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'tryck-och-forvandla',
  voiceIntro: 'Tryck på sakerna så förvandlas de!',

  init(ctx) {
    this._alive = true
    this._idle = 0
    this._bob = 0
    this._lastSay = 0
    this._roundDone = false
    this._objects = []
    this._dots = []
    this._timers = []

    const stored = ctx.progress.get()
    this._rounds = stored.custom?.rundor || 0
    this._count = stored.custom?.forvandlingar || 0
    this._level = Math.min(MAX_LEVEL, Math.max(stored.highestLevel || 1, 1 + this._rounds))
    // Ingen setLevel här: spelet skrev framsteg redan vid INGÅNG, innan barnet gjort
    // något. Nivån sparas när en runda faktiskt är klar (_checkRound).

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Marknadsmässig bakgrund (sol, kullar, moln) — dekorativ, fångar ej tap.
    this._root.addChild(createScene('meadow'))

    // Heltäckande tap-fångare UNDER sakerna: tomt tryck -> lekfull respons.
    const catcher = new Graphics().rect(0, 0, ctx.width, ctx.height).fill({ color: 0x000000, alpha: 0 })
    catcher.eventMode = 'static'
    catcher.on('pointertap', (e) => this._emptyTap(ctx, e))
    this._root.addChild(catcher)

    // Lager: saker, sedan fx (poffar/gnistor) ovanpå, sedan hud (prickar) överst.
    this._play = new Container()
    this._root.addChild(this._play)
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._root.addChild(this._fx)
    this._hud = new Container()
    this._hud.eventMode = 'none'
    this._hud.interactiveChildren = false
    this._root.addChild(this._hud)

    this._spawnRound(ctx)

    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    ctx.services.voice.say(this.voiceIntro)
    this._lastSay = performance.now()
  },

  // --- omgångar -----------------------------------------------------------

  _spawnRound(ctx) {
    if (!this._alive) return
    this._roundDone = false
    this._idle = 0
    const n = objCountFor(this._level)
    const { pts, podR } = this._layout(n)
    const chains = this._pickChains(n)
    this._buildDots(n)
    this._objects = []
    for (let i = 0; i < n; i++) {
      this._objects.push(this._makeObject(ctx, chains[i], pts[i], podR, i * 0.08))
    }
  },

  // Välj n distinkta kedjor som ryms inom nivåns max-längd.
  _pickChains(n) {
    const max = maxStagesFor(this._level)
    const elig = CHAINS.filter((c) => c.length <= max)
    const out = []
    let pool = shuffle(elig)
    while (out.length < n) {
      if (!pool.length) pool = shuffle(elig)
      out.push(pool.shift())
    }
    return out
  },

  // Rutnät centrerat i spelytan; returnerar punkter + platt-radie.
  _layout(n) {
    const cols = Math.min(3, n)
    const rows = Math.ceil(n / cols)
    const left = 180, right = 1100, top = 200, bottom = 600
    const cw = (right - left) / cols
    const ch = (bottom - top) / rows
    const pts = []
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols)
      const inRow = Math.min(cols, n - r * cols)
      const cInRow = i - r * cols
      const startX = (left + right) / 2 - (inRow * cw) / 2 + cw / 2
      const x = startX + cInRow * cw
      const y = rows === 1 ? (top + bottom) / 2 : top + ch * (r + 0.5)
      pts.push({ x, y })
    }
    const podR = Math.max(68, Math.min(96, Math.min(cw, ch) * 0.34))
    return { pts, podR }
  },

  _makeObject(ctx, chain, pt, podR, delay) {
    const cont = new Container()
    cont.position.set(pt.x, pt.y)
    const tint = PLAYFUL[(Math.random() * PLAYFUL.length) | 0]

    // Mjuk markskugga (ger djup; krymper när saken "svävar" upp i tickern).
    const shadow = new Graphics().ellipse(0, podR * 0.72, podR * 0.72, podR * 0.26).fill({ color: COLORS.shadow, alpha: 0.12 })
    shadow.eventMode = 'none'
    // Platta att stå PÅ — inte en ring runt om. En cirkel kring föremålet läste som
    // "ikon i en bubbla", vilket är precis det P0 ASSETS vill bort från.
    const pad = new Graphics()
      .ellipse(0, podR * 0.62, podR * 0.9, podR * 0.28).fill({ color: tint, alpha: 0.22 })
      .ellipse(0, podR * 0.56, podR * 0.9, podR * 0.28).fill({ color: tint, alpha: 0.4 })
      .ellipse(0, podR * 0.56, podR * 0.9, podR * 0.28).stroke({ width: 5, color: tint, alpha: 0.7 })
    pad.eventMode = 'none'
    // Själva saken — RITAD, skalad efter plattans storlek.
    const label = new Graphics()
    label.eventMode = 'none'
    label.scale.set(podR / 62)
    drawThing(label, chain[0].k)

    // Stegtrappa: små punkter ovanför pod:en visar hur många tryck som är kvar.
    const taps = chain.length - 1
    const stepDots = new Container()
    stepDots.eventMode = 'none'
    for (let s = 0; s < taps; s++) {
      const dot = new Graphics().circle(0, 0, 7).fill({ color: tint, alpha: 0.3 }).stroke({ width: 2, color: tint, alpha: 0.6 })
      dot.position.set((s - (taps - 1) / 2) * 22, -podR - 20)
      stepDots.addChild(dot)
    }

    cont.addChild(shadow, pad, stepDots, label)
    const halo = podR + 26 // generös, osynlig hit-halo (>=96px mål)
    cont.hitArea = new Rectangle(-halo, -halo, halo * 2, halo * 2)
    cont.eventMode = 'static'
    cont.cursor = 'pointer'

    const obj = { chain, stage: 0, cont, label, shadow, stepDots, tint, x: pt.x, y: pt.y, done: false, busy: false, breatheT: null, phase: Math.random() * Math.PI * 2 }
    cont.on('pointertap', () => this._advance(ctx, obj))
    this._play.addChild(cont)

    // Studsande entré -> börja "andas" (idle-lockare) när den landat.
    cont.scale.set(0)
    gsap.to(cont.scale, {
      x: 1, y: 1, duration: 0.5, delay, ease: 'back.out(1.7)',
      onComplete: () => { if (this._alive && !obj.done) obj.breatheT = breathe(cont, { scale: 1.05, duration: 1.1 }) },
    })
    return obj
  },

  // --- interaktion --------------------------------------------------------

  // Tryck på en sak: magisk poff + ett steg längre i kedjan. Allt är "rätt".
  _advance(ctx, obj) {
    if (!this._alive) return
    if (obj.done) return this._replayDone(ctx, obj)
    if (obj.busy) {
      ctx.services.audio.sfx('soft')
      ripple(this._fx, obj.x, obj.y, { maxR: 60, alpha: 0.4 })
      return
    }
    this._idle = 0
    obj.busy = true
    obj.stage++
    const st = obj.chain[obj.stage]
    const final = obj.stage === obj.chain.length - 1

    // Direkt återkoppling (<100ms): kedjespecifik poff + STIGANDE förvandlingston.
    if (final) {
      ctx.services.audio.sfx('reveal')
      ctx.services.audio.tone({ freq: 784, dur: 0.16, type: 'triangle', vol: 0.2 }) // litet "ta-da"
      ctx.services.audio.tone({ freq: 1047, dur: 0.24, type: 'triangle', vol: 0.2, delay: 0.13 })
    } else {
      ctx.services.audio.sfx('pop')
      ctx.services.audio.tone({ freq: 440 * Math.pow(2, obj.stage / 12), dur: 0.14, type: 'sine', vol: 0.18 })
    }
    this._poof(obj, final)
    this._refreshSteps(obj)

    this._count++
    ctx.progress.setCustom('forvandlingar', this._count)

    // Studsa ihop -> byt emoji i botten -> studsa upp = ren magisk övergång.
    gsap.killTweensOf(obj.cont.scale)
    obj.breatheT?.kill()
    obj.breatheT = null
    gsap.timeline({
      onComplete: () => {
        if (!this._alive) return
        obj.busy = false
        if (!obj.done) obj.breatheT = breathe(obj.cont, { scale: 1.05, duration: 1.1 })
      },
    })
      .to(obj.cont.scale, { x: 0.22, y: 0.22, duration: 0.12, ease: 'power2.in' })
      .add(() => { if (this._alive && obj.label && !obj.label.destroyed) drawThing(obj.label, st.k) })
      .to(obj.cont.scale, { x: 1, y: 1, duration: 0.36, ease: 'back.out(2.4)' })

    if (final) {
      obj.done = true
      sparkle(this._fx, obj.x, obj.y - 10, { count: 8 })
      floatText(this._fx, obj.x, obj.y - 40, '🎉', { fontSize: 64, rise: 72 })
      this._sayResult(ctx, st.k) // rösten ropar resultatet
      this._refreshDots()
      this._checkRound(ctx)
    } else {
      floatText(this._fx, obj.x, obj.y - 30, '✨', { fontSize: 46, rise: 58 })
    }
  },

  // Tryck på en redan klar sak: glittrar och säger namnet igen — aldrig "fel".
  _replayDone(ctx, obj) {
    if (!this._alive) return
    this._idle = 0
    const st = obj.chain[obj.chain.length - 1]
    if (obj.label && !obj.label.destroyed) drawThing(obj.label, st.k)
    ctx.services.audio.sfx('pling')
    pop(obj.cont)
    sparkle(this._fx, obj.x, obj.y - 10, { count: 6 })
    this._sayResult(ctx, st.k)
  },

  // Tomt tryck bredvid sakerna: mjukt ljud + ring + en sak vinglar lekfullt.
  _emptyTap(ctx, e) {
    if (!this._alive) return
    this._idle = 0
    ctx.services.audio.sfx('soft')
    const p = this._root.toLocal(e.global)
    ripple(this._fx, p.x, p.y, { maxR: 60, width: 5, alpha: 0.5 })
    sparkle(this._fx, p.x, p.y, { count: 4 })
    const un = this._objects.filter((o) => !o.done)
    if (un.length) wiggle(randomFrom(un).cont)
  },

  // Kedjespecifik poff: egna partikelfärger + en liten flöts-emoji (blad/droppe/hjärta …).
  _poof(obj, big) {
    const x = obj.x
    const y = obj.y
    const fl = FLAVORS[obj.chain[0].k] || { colors: PLAYFUL, puff: '✨' }
    ripple(this._fx, x, y, { maxR: big ? 110 : 80, color: fl.colors[0], width: 6 })
    burst(this._fx, x, y, { count: big ? 16 : 10, power: big ? 1.1 : 0.9, colors: fl.colors })
    floatText(this._fx, x + (Math.random() * 36 - 18), y - 6, fl.puff, { fontSize: big ? 40 : 30, rise: 52 })
  },

  // Fyll pod:ens stegprickar upp till aktuellt steg (visar hur många tryck som är kvar).
  _refreshSteps(obj) {
    const sd = obj.stepDots
    if (!sd || sd.destroyed) return
    const kids = sd.children
    for (let s = 0; s < kids.length; s++) {
      const d = kids[s].clear()
      if (s < obj.stage) d.circle(0, 0, 8).fill(PLAYFUL[s % PLAYFUL.length])
      else d.circle(0, 0, 7).fill({ color: obj.tint, alpha: 0.3 }).stroke({ width: 2, color: obj.tint, alpha: 0.6 })
    }
  },

  // --- omgångs-slut + nivå ------------------------------------------------

  _checkRound(ctx) {
    if (this._objects.length && this._objects.every((o) => o.done)) this._finishRound(ctx)
  },

  _finishRound(ctx) {
    if (!this._alive || this._roundDone) return
    this._roundDone = true
    this._idle = 0

    this._rounds++
    ctx.progress.setCustom('rundor', this._rounds)
    const nl = Math.min(MAX_LEVEL, 1 + this._rounds)
    if (nl > this._level) this._level = nl
    ctx.progress.setLevel(this._level)

    ctx.progress.complete() // firande sfx + beröm + konfetti + stjärna + klistermärke
    shake(this._play, { intensity: 7, duration: 0.5 }) // mjuk skakning på fullt set

    this._timers.push(gsap.delayedCall(1.7, () => {
      if (!this._alive) return
      this._clearObjects()
      this._spawnRound(ctx)
    }))
  },

  // Krymp bort gamla saker (exit-säkert: rör Pixi-objektet bara om det lever).
  _clearObjects() {
    for (const obj of this._objects) {
      gsap.killTweensOf(obj.cont.scale)
      obj.breatheT?.kill()
      const cont = obj.cont
      const stt = { s: cont.scale.x || 1, a: cont.alpha }
      const tw = gsap.to(stt, {
        s: 0, a: 0, duration: 0.3, ease: 'back.in(1.5)',
        onUpdate: () => {
          if (cont.destroyed) { tw.kill(); return }
          cont.scale.set(stt.s)
          cont.alpha = stt.a
        },
        onComplete: () => { if (!cont.destroyed) cont.destroy({ children: true }) },
      })
    }
    this._objects = []
  },

  // --- hud (förloppsprickar, ej en "poäng") -------------------------------

  _buildDots(n) {
    for (const d of this._dots) if (!d.destroyed) d.destroy()
    this._dots = []
    const gap = 44
    const x0 = 640 - ((n - 1) * gap) / 2
    for (let i = 0; i < n; i++) {
      const d = new Graphics()
      d.position.set(x0 + i * gap, 112)
      d.eventMode = 'none'
      this._hud.addChild(d)
      this._dots.push(d)
    }
    this._refreshDots()
  },

  _refreshDots() {
    const done = this._objects.filter((o) => o.done).length
    for (let i = 0; i < this._dots.length; i++) {
      const d = this._dots[i].clear()
      if (i < done) {
        if (d.star) d.star(0, 0, 5, 14, 7).fill(PLAYFUL[i % PLAYFUL.length])
        else d.circle(0, 0, 11).fill(PLAYFUL[i % PLAYFUL.length])
      } else {
        d.circle(0, 0, 9).fill({ color: COLORS.inkSoft, alpha: 0.22 })
      }
    }
  },

  // --- tick: liv (sväv) + idle-recue --------------------------------------

  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = ticker.deltaMS / 1000
    this._bob += dt
    for (const o of this._objects) {
      if (!o.label || o.label.destroyed) continue
      const off = Math.sin(this._bob * 1.6 + o.phase) * 5
      o.label.y = -off - 4
      if (o.shadow && !o.shadow.destroyed) {
        const lift = (off + 5) / 10 // 0..1
        o.shadow.scale.set(1 - lift * 0.22)
        o.shadow.alpha = 0.12 * (1 - lift * 0.3)
      }
    }

    this._idle += dt
    if (this._idle > 7 && !this._roundDone) {
      this._idle = 0
      this._say(ctx, randomFrom(HINTS))
      const un = this._objects.filter((o) => !o.done)
      const tgt = un.length ? randomFrom(un) : this._objects[0]
      if (tgt) {
        pop(tgt.cont)
        ripple(this._fx, tgt.x, tgt.y, { maxR: 90 })
      }
    }
  },

  // Strypt röst så snabba tryck inte staplar tal på varandra.
  // Resultat-repliker som HELA literaler — en mall-sträng (`${st.a} ${st.n}!`) hittas
  // aldrig av check.mjs, så /rost kunde aldrig generera klipp för dem.
  _sayResult(ctx, k) {
    if (k === 'blomma') this._say(ctx, 'En blomma!')
    else if (k === 'hona') this._say(ctx, 'En höna!')
    else if (k === 'regnbage') this._say(ctx, 'En regnbåge!')
    else if (k === 'raket') this._say(ctx, 'En raket!')
    else if (k === 'fjaril') this._say(ctx, 'En fjäril!')
    else if (k === 'snogubbe') this._say(ctx, 'En snögubbe!')
    else if (k === 'hund') this._say(ctx, 'En hund!')
    else if (k === 'katt') this._say(ctx, 'En katt!')
    else if (k === 'stjarna') this._say(ctx, 'En stjärna!')
    else if (k === 'fullmane') this._say(ctx, 'En fullmåne!')
    else this._say(ctx, 'Titta vad fin!')
  },

  _say(ctx, text) {
    const now = performance.now()
    if (now - this._lastSay < 650) return
    this._lastSay = now
    ctx.services.voice.say(text)
  },

  destroy(ctx) {
    this._alive = false
    ctx?.ticker?.remove(this._tick)
    for (const t of this._timers) t.kill()
    this._timers = []
    for (const o of this._objects) {
      o.breatheT?.kill()
      gsap.killTweensOf(o.cont)
      gsap.killTweensOf(o.cont.scale)
      gsap.killTweensOf(o.label)
      gsap.killTweensOf(o.shadow)
    }
    this._objects = []
    gsap.killTweensOf(this._play)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// =================== Programmatisk grafik ===================
// Varje steg i varje kedja ritas som ett fristående föremål med egen silhuett.
// Rityta ~±58 px kring origo; skalas av anroparen efter plattans storlek.
function drawThing(g, k) {
  if (!g || g.destroyed) return
  g.clear()
  const ink = 0x4a3526
  switch (k) {
    case 'fro': // ekollon
      g.ellipse(0, 14, 24, 30).fill(0xb98a5c).stroke({ width: 3, color: 0x7a5330 })
      g.ellipse(-8, 6, 8, 12).fill({ color: 0xffffff, alpha: 0.22 })
      g.roundRect(-26, -22, 52, 20, 9).fill(0x7a5330).stroke({ width: 3, color: 0x543a20 })
      g.roundRect(-4, -38, 8, 18, 4).fill(0x543a20)
      break
    case 'grodd': // groddskott ur jord
      g.ellipse(0, 40, 34, 12).fill(0x7a5330)
      g.roundRect(-4, -6, 8, 46, 4).fill(0x49a657)
      g.moveTo(0, 4).quadraticCurveTo(-30, -10, -32, 14).quadraticCurveTo(-10, 20, 0, 4).fill(0x5bbf6a)
      g.moveTo(0, -4).quadraticCurveTo(28, -20, 30, 4).quadraticCurveTo(8, 10, 0, -4).fill(0x6fd07a)
      break
    case 'planta': // planta med flera blad
      g.ellipse(0, 44, 34, 11).fill(0x7a5330)
      g.roundRect(-4.5, -30, 9, 74, 4.5).fill(0x49a657)
      for (const [sy, dir, sc] of [[-16, -1, 1], [-2, 1, 1.1], [12, -1, 0.9]]) {
        g.moveTo(0, sy).quadraticCurveTo(dir * 34 * sc, sy - 18 * sc, dir * 36 * sc, sy + 6 * sc)
          .quadraticCurveTo(dir * 12 * sc, sy + 12 * sc, 0, sy).fill(dir < 0 ? 0x5bbf6a : 0x6fd07a)
      }
      break
    case 'blomma': // solros
      g.ellipse(0, 46, 30, 10).fill(0x7a5330)
      g.roundRect(-4.5, -6, 9, 52, 4.5).fill(0x49a657)
      g.moveTo(0, 16).quadraticCurveTo(-30, 6, -32, 30).quadraticCurveTo(-10, 34, 0, 16).fill(0x5bbf6a)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        g.ellipse(Math.cos(a) * 30, Math.sin(a) * 30 - 18, 15, 10).fill(i % 2 ? 0xffd35c : 0xffc233)
      }
      g.circle(0, -18, 20).fill(0x8a5a3b).stroke({ width: 3, color: 0x5e3720 })
      for (const [dx, dy] of [[-7, -24], [5, -22], [-2, -12], [8, -13]]) g.circle(dx, dy, 3).fill(0x5e3720)
      break
    case 'agg':
      g.ellipse(0, 44, 28, 9).fill({ color: ink, alpha: 0.12 })
      g.ellipse(0, 4, 30, 40).fill(0xfff3e2).stroke({ width: 3.5, color: 0xd9c3a5 })
      g.ellipse(-10, -8, 9, 14).fill({ color: 0xffffff, alpha: 0.6 })
      g.ellipse(8, 18, 7, 5).fill({ color: 0xe8d7bd, alpha: 0.8 })
      break
    case 'kyckling':
      g.ellipse(0, 46, 26, 8).fill({ color: ink, alpha: 0.12 })
      g.roundRect(-10, 32, 6, 14, 3).fill(0xff9e3d)
      g.roundRect(4, 32, 6, 14, 3).fill(0xff9e3d)
      g.ellipse(0, 14, 30, 26).fill(0xffd35c).stroke({ width: 3, color: 0xe0a72c })
      g.circle(0, -16, 22).fill(0xffe27a).stroke({ width: 3, color: 0xe0a72c })
      g.poly([0, -12, 16, -6, 0, 0]).fill(0xff8a3d)
      g.circle(-8, -20, 3.6).fill(ink)
      g.circle(8, -20, 3.6).fill(ink)
      g.moveTo(-2, -38).quadraticCurveTo(4, -50, 10, -40).stroke({ width: 4, color: 0xe0a72c, cap: 'round' })
      break
    case 'hona':
      g.ellipse(0, 48, 32, 9).fill({ color: ink, alpha: 0.12 })
      g.roundRect(-12, 34, 7, 16, 3.5).fill(0xff9e3d)
      g.roundRect(6, 34, 7, 16, 3.5).fill(0xff9e3d)
      g.ellipse(2, 10, 36, 30).fill(0xfffdf7).stroke({ width: 3.5, color: 0xd9cfc0 })
      g.ellipse(14, 6, 18, 16).fill({ color: 0xe8ded0, alpha: 0.8 })
      g.circle(-18, -20, 20).fill(0xfffdf7).stroke({ width: 3.5, color: 0xd9cfc0 })
      g.poly([-34, -18, -50, -13, -34, -8]).fill(0xff8a3d)
      g.circle(-24, -24, 3.6).fill(ink)
      g.circle(-26, -40, 7).fill(0xff6b6b)
      g.circle(-18, -44, 8).fill(0xff6b6b)
      g.circle(-10, -40, 6).fill(0xff6b6b)
      g.ellipse(-30, -6, 6, 8).fill(0xff6b6b)
      break
    case 'moln':
      g.circle(-22, 4, 20).fill(0xfffdf7)
      g.circle(20, 6, 17).fill(0xfffdf7)
      g.circle(-2, -12, 25).fill(0xfffdf7)
      g.roundRect(-34, 0, 68, 22, 11).fill(0xfffdf7)
      g.roundRect(-24, -2, 40, 8, 4).fill({ color: 0xffffff, alpha: 0.7 })
      break
    case 'regnmoln':
      g.circle(-22, -6, 20).fill(0x9fb3c8)
      g.circle(20, -4, 17).fill(0x9fb3c8)
      g.circle(-2, -22, 25).fill(0xb4c6d8)
      g.roundRect(-34, -10, 68, 22, 11).fill(0x9fb3c8)
      for (const [dx, dy] of [[-22, 22], [-2, 30], [18, 22], [8, 44], [-12, 42]]) {
        g.moveTo(dx, dy).quadraticCurveTo(dx - 7, dy + 10, dx, dy + 16)
          .quadraticCurveTo(dx + 7, dy + 10, dx, dy).fill(0x4aa3df)
      }
      break
    case 'regnbage': {
      const cols = [0xff6b6b, 0xff8a3d, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa]
      for (let i = 0; i < cols.length; i++) {
        const R = 52 - i * 8
        g.moveTo(-R, 26).arc(0, 26, R, Math.PI, Math.PI * 2).stroke({ width: 8, color: cols[i] })
      }
      g.circle(-46, 30, 12).fill(0xfffdf7)
      g.circle(46, 30, 12).fill(0xfffdf7)
      break
    }
    case 'bil':
      g.ellipse(0, 40, 40, 9).fill({ color: ink, alpha: 0.14 })
      g.roundRect(-44, 2, 88, 28, 12).fill(0xff6b6b).stroke({ width: 3, color: 0xc9424f })
      g.moveTo(-30, 2).lineTo(-18, -22).lineTo(20, -22).lineTo(32, 2).closePath()
        .fill(0xff6b6b).stroke({ width: 3, color: 0xc9424f })
      g.roundRect(-16, -18, 16, 16, 4).fill(0x9be3ff)
      g.roundRect(4, -18, 16, 16, 4).fill(0x9be3ff)
      g.circle(-24, 32, 11).fill(0x3a3230).circle(-24, 32, 5).fill(0xd9d2c8)
      g.circle(24, 32, 11).fill(0x3a3230).circle(24, 32, 5).fill(0xd9d2c8)
      g.circle(42, 12, 5).fill(0xffe27a)
      break
    case 'buss':
      g.ellipse(0, 42, 44, 9).fill({ color: ink, alpha: 0.14 })
      g.roundRect(-48, -32, 96, 66, 14).fill(0xffd35c).stroke({ width: 3.5, color: 0xd9a12c })
      for (let i = 0; i < 3; i++) g.roundRect(-40 + i * 27, -24, 21, 20, 5).fill(0x9be3ff)
      g.roundRect(20, -24, 22, 44, 5).fill(0x9be3ff)
      g.roundRect(-46, 6, 60, 8, 4).fill({ color: 0xd9a12c, alpha: 0.6 })
      g.circle(-26, 36, 11).fill(0x3a3230).circle(-26, 36, 5).fill(0xd9d2c8)
      g.circle(26, 36, 11).fill(0x3a3230).circle(26, 36, 5).fill(0xd9d2c8)
      break
    case 'raket':
      g.moveTo(0, -50).quadraticCurveTo(22, -18, 20, 20).lineTo(-20, 20)
        .quadraticCurveTo(-22, -18, 0, -50).closePath().fill(0xfffdf7).stroke({ width: 3.5, color: 0xc9c0b4 })
      g.poly([-20, 6, -40, 34, -20, 26]).fill(0xff6b6b).stroke({ width: 3, color: 0xc9424f })
      g.poly([20, 6, 40, 34, 20, 26]).fill(0xff6b6b).stroke({ width: 3, color: 0xc9424f })
      g.circle(0, -14, 11).fill(0x4aa3df).stroke({ width: 3, color: 0x2f7cb0 })
      g.roundRect(-13, 20, 26, 10, 5).fill(0x9aa7b0)
      g.moveTo(-9, 30).quadraticCurveTo(0, 54, 9, 30).fill(0xff8a3d)
      g.moveTo(-4, 30).quadraticCurveTo(0, 44, 4, 30).fill(0xffe27a)
      break
    case 'larv':
      g.ellipse(0, 34, 40, 9).fill({ color: ink, alpha: 0.12 })
      for (let i = 0; i < 5; i++) {
        g.circle(-32 + i * 16, 8 + (i % 2 ? -5 : 0), 15).fill(i % 2 ? 0x6fd07a : 0x5bbf6a)
          .stroke({ width: 2.5, color: 0x3f8a4f })
      }
      g.circle(36, 0, 18).fill(0x8ee08e).stroke({ width: 3, color: 0x3f8a4f })
      g.circle(31, -5, 3.6).fill(ink)
      g.circle(43, -5, 3.6).fill(ink)
      g.moveTo(30, -16).lineTo(26, -30).stroke({ width: 3, color: 0x3f8a4f, cap: 'round' })
      g.moveTo(42, -16).lineTo(46, -30).stroke({ width: 3, color: 0x3f8a4f, cap: 'round' })
      g.circle(26, -32, 3.5).fill(0xff9ec4)
      g.circle(46, -32, 3.5).fill(0xff9ec4)
      break
    case 'fjaril':
      g.ellipse(-24, -12, 22, 26).fill(0xa78bfa).stroke({ width: 2.5, color: 0x7a5fd0 })
      g.ellipse(24, -12, 22, 26).fill(0xa78bfa).stroke({ width: 2.5, color: 0x7a5fd0 })
      g.ellipse(-20, 18, 16, 18).fill(0xff9ec4).stroke({ width: 2.5, color: 0xe0709b })
      g.ellipse(20, 18, 16, 18).fill(0xff9ec4).stroke({ width: 2.5, color: 0xe0709b })
      g.circle(-24, -14, 6).fill({ color: 0xfff3b0, alpha: 0.85 })
      g.circle(24, -14, 6).fill({ color: 0xfff3b0, alpha: 0.85 })
      g.roundRect(-5, -26, 10, 54, 5).fill(0x5e3720)
      g.circle(0, -30, 8).fill(0x5e3720)
      g.moveTo(-2, -36).lineTo(-14, -48).stroke({ width: 3, color: 0x5e3720, cap: 'round' })
      g.moveTo(2, -36).lineTo(14, -48).stroke({ width: 3, color: 0x5e3720, cap: 'round' })
      break
    case 'snoflinga':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const ex = Math.cos(a) * 44
        const ey = Math.sin(a) * 44
        g.moveTo(0, 0).lineTo(ex, ey).stroke({ width: 7, color: 0xd7f0ff, cap: 'round' })
        g.moveTo(ex * 0.6, ey * 0.6).lineTo(ex * 0.6 + Math.cos(a + 1) * 15, ey * 0.6 + Math.sin(a + 1) * 15)
          .stroke({ width: 5, color: 0xd7f0ff, cap: 'round' })
        g.moveTo(ex * 0.6, ey * 0.6).lineTo(ex * 0.6 + Math.cos(a - 1) * 15, ey * 0.6 + Math.sin(a - 1) * 15)
          .stroke({ width: 5, color: 0xd7f0ff, cap: 'round' })
      }
      g.circle(0, 0, 9).fill(0xffffff)
      break
    case 'snogubbe':
      g.ellipse(0, 50, 32, 9).fill({ color: ink, alpha: 0.12 })
      g.circle(0, 24, 28).fill(0xfffdf7).stroke({ width: 3, color: 0xc7d6e0 })
      g.circle(0, -12, 21).fill(0xfffdf7).stroke({ width: 3, color: 0xc7d6e0 })
      g.moveTo(-20, 12).lineTo(-46, -2).stroke({ width: 5, color: 0x8a5a3b, cap: 'round' })
      g.moveTo(20, 12).lineTo(46, -2).stroke({ width: 5, color: 0x8a5a3b, cap: 'round' })
      g.circle(-7, -16, 3.4).fill(ink)
      g.circle(7, -16, 3.4).fill(ink)
      g.poly([0, -10, 18, -6, 0, -2]).fill(0xff8a3d)
      for (const dy of [16, 28]) g.circle(0, dy, 4).fill(ink)
      g.roundRect(-20, -34, 40, 10, 4).fill(0x4a3f5c)
      g.roundRect(-13, -52, 26, 20, 5).fill(0x4a3f5c)
      break
    case 'valp':
      g.ellipse(0, 44, 30, 9).fill({ color: ink, alpha: 0.12 })
      g.ellipse(-30, 4, 12, 22).fill(0x8a5a3b).stroke({ width: 2.5, color: 0x5e3720 })
      g.ellipse(30, 4, 12, 22).fill(0x8a5a3b).stroke({ width: 2.5, color: 0x5e3720 })
      g.circle(0, 0, 30).fill(0xd7a06a).stroke({ width: 3.5, color: 0xa8763c })
      g.ellipse(0, 16, 18, 13).fill(0xf0d3ae)
      g.ellipse(0, 9, 8, 6).fill(0x3a2a20)
      g.circle(-11, -6, 4.4).fill(ink)
      g.circle(11, -6, 4.4).fill(ink)
      g.circle(-9, -8, 1.8).fill(0xffffff)
      g.circle(13, -8, 1.8).fill(0xffffff)
      g.roundRect(-5, 22, 10, 11, 5).fill(0xff8fae)
      break
    case 'hund':
      g.ellipse(0, 48, 40, 10).fill({ color: ink, alpha: 0.12 })
      g.ellipse(26, 6, 26, 20).fill(0xd7a06a).stroke({ width: 3, color: 0xa8763c })
      g.moveTo(46, -4).quadraticCurveTo(60, -32, 44, -34).quadraticCurveTo(44, -18, 38, -8).fill(0xd7a06a)
      g.roundRect(28, 22, 11, 24, 5).fill(0xc08a52)
      g.roundRect(12, 22, 11, 24, 5).fill(0xd7a06a)
      g.circle(-22, -6, 26).fill(0xd7a06a).stroke({ width: 3.5, color: 0xa8763c })
      g.ellipse(-42, -4, 12, 22).fill(0x8a5a3b).stroke({ width: 2.5, color: 0x5e3720 })
      g.ellipse(-34, 12, 16, 12).fill(0xf0d3ae)
      g.ellipse(-38, 7, 7, 5).fill(0x3a2a20)
      g.circle(-28, -12, 4.2).fill(ink)
      g.circle(-12, -12, 4.2).fill(ink)
      g.roundRect(-40, 34, 12, 12, 6).fill(0xc08a52)
      break
    case 'kattunge':
      g.ellipse(0, 44, 28, 9).fill({ color: ink, alpha: 0.12 })
      g.poly([-30, -34, -10, -14, -34, -8]).fill(0xf2a34a).stroke({ width: 2.5, color: 0xc07a24 })
      g.poly([30, -34, 10, -14, 34, -8]).fill(0xf2a34a).stroke({ width: 2.5, color: 0xc07a24 })
      g.circle(0, 2, 29).fill(0xf2a34a).stroke({ width: 3.5, color: 0xc07a24 })
      g.poly([0, 12, -7, 5, 7, 5]).fill(0xff8fae)
      g.moveTo(-10, 16).lineTo(-34, 12).stroke({ width: 2.5, color: 0xfffdf7, cap: 'round' })
      g.moveTo(10, 16).lineTo(34, 12).stroke({ width: 2.5, color: 0xfffdf7, cap: 'round' })
      g.ellipse(-12, -6, 5, 7).fill(ink)
      g.ellipse(12, -6, 5, 7).fill(ink)
      break
    case 'katt':
      g.ellipse(0, 48, 40, 10).fill({ color: ink, alpha: 0.12 })
      g.moveTo(34, 12).quadraticCurveTo(58, 6, 50, -26).stroke({ width: 9, color: 0xf2a34a, cap: 'round' })
      g.ellipse(18, 18, 28, 22).fill(0xf2a34a).stroke({ width: 3, color: 0xc07a24 })
      g.roundRect(4, 32, 10, 16, 5).fill(0xe0912f)
      g.roundRect(26, 32, 10, 16, 5).fill(0xe0912f)
      g.poly([-42, -30, -24, -12, -46, -6]).fill(0xf2a34a).stroke({ width: 2.5, color: 0xc07a24 })
      g.poly([-8, -32, -12, -10, 6, -20]).fill(0xf2a34a).stroke({ width: 2.5, color: 0xc07a24 })
      g.circle(-24, 0, 26).fill(0xf2a34a).stroke({ width: 3.5, color: 0xc07a24 })
      g.poly([-24, 10, -31, 3, -17, 3]).fill(0xff8fae)
      g.ellipse(-34, -6, 5, 7).fill(ink)
      g.ellipse(-13, -6, 5, 7).fill(ink)
      g.moveTo(-34, 14).lineTo(-56, 10).stroke({ width: 2.5, color: 0xfffdf7, cap: 'round' })
      g.moveTo(-14, 14).lineTo(6, 10).stroke({ width: 2.5, color: 0xfffdf7, cap: 'round' })
      break
    case 'gnista':
      g.moveTo(0, -34).quadraticCurveTo(5, -6, 30, 0).quadraticCurveTo(5, 6, 0, 34)
        .quadraticCurveTo(-5, 6, -30, 0).quadraticCurveTo(-5, -6, 0, -34).fill(0xffe27a)
      g.circle(0, 0, 7).fill({ color: 0xffffff, alpha: 0.9 })
      g.circle(-26, -22, 5).fill({ color: 0xfff3b0, alpha: 0.8 })
      g.circle(24, 20, 4).fill({ color: 0xfff3b0, alpha: 0.8 })
      break
    case 'stjarna': {
      const pts = []
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const rr = i % 2 ? 18 : 44
        pts.push(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      g.poly(pts).fill(0xffd35c).stroke({ width: 3.5, color: 0xd9a12c })
      g.circle(-9, -9, 7).fill({ color: 0xffffff, alpha: 0.7 })
      break
    }
    case 'mane':
      g.moveTo(14, -42).quadraticCurveTo(-30, -30, -30, 4).quadraticCurveTo(-30, 40, 14, 44)
        .quadraticCurveTo(-8, 20, -8, 0).quadraticCurveTo(-8, -22, 14, -42).fill(0xfff3b0)
        .stroke({ width: 3, color: 0xe0c66a })
      g.circle(24, -30, 4).fill({ color: 0xfff3b0, alpha: 0.8 })
      g.circle(30, 6, 3).fill({ color: 0xfff3b0, alpha: 0.6 })
      break
    case 'fullmane':
      g.circle(0, 0, 52).fill({ color: 0xfff3b0, alpha: 0.16 })
      g.circle(0, 0, 40).fill(0xfff3d0).stroke({ width: 3, color: 0xe0c66a })
      g.circle(-14, -12, 9).fill({ color: 0xe6d5a0, alpha: 0.8 })
      g.circle(12, 10, 7).fill({ color: 0xe6d5a0, alpha: 0.75 })
      g.circle(16, -18, 5).fill({ color: 0xe6d5a0, alpha: 0.7 })
      g.circle(-8, 22, 4).fill({ color: 0xe6d5a0, alpha: 0.6 })
      break
    default:
      g.circle(0, 0, 34).fill(0xffd35c).stroke({ width: 3, color: 0xd9a12c })
      break
  }
}
