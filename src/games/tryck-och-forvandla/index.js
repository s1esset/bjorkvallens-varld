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
import { Container, Graphics, Text, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { pop, wiggle, puff, sparkle, burst, ripple, floatText, breathe, shake } from '../../lib/feedback.js'
import { COLORS, PLAYFUL, FONT } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'

// Förvandlingskedjor. Varje steg: e=emoji, n=svenskt namn, a=artikel (en/ett).
// Sista steget = "resultatet" som rösten ropar ut. Blandade längder (2–4 steg)
// så svårighet kan väljas per nivå (kortare kedjor lågt, längre högt upp).
const CHAINS = [
  [{ e: '🌰', n: 'frö', a: 'Ett' }, { e: '🌱', n: 'grodd', a: 'En' }, { e: '🌿', n: 'planta', a: 'En' }, { e: '🌻', n: 'blomma', a: 'En' }],
  [{ e: '🥚', n: 'ägg', a: 'Ett' }, { e: '🐥', n: 'kyckling', a: 'En' }, { e: '🐔', n: 'höna', a: 'En' }],
  [{ e: '☁️', n: 'moln', a: 'Ett' }, { e: '🌧️', n: 'regnmoln', a: 'Ett' }, { e: '🌈', n: 'regnbåge', a: 'En' }],
  [{ e: '🚗', n: 'bil', a: 'En' }, { e: '🚌', n: 'buss', a: 'En' }, { e: '🚀', n: 'raket', a: 'En' }],
  [{ e: '🐛', n: 'larv', a: 'En' }, { e: '🦋', n: 'fjäril', a: 'En' }],
  [{ e: '❄️', n: 'snöflinga', a: 'En' }, { e: '⛄', n: 'snögubbe', a: 'En' }],
  [{ e: '🐶', n: 'valp', a: 'En' }, { e: '🐕', n: 'hund', a: 'En' }],
  [{ e: '🐱', n: 'kattunge', a: 'En' }, { e: '🐈', n: 'katt', a: 'En' }],
  [{ e: '✨', n: 'gnista', a: 'En' }, { e: '⭐', n: 'stjärna', a: 'En' }],
  [{ e: '🌙', n: 'måne', a: 'En' }, { e: '🌝', n: 'fullmåne', a: 'En' }],
]

// Lugna idle-uppmuntringar (sägs efter ~7s tystnad).
const HINTS = ['Tryck på en sak till!', 'Vad blir det här?', 'Tryck så förvandlas de!', 'Förvandla mer!']

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
    ctx.progress.setLevel(this._level)

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
    // Platta att stå på.
    const pad = new Graphics().circle(0, 0, podR).fill({ color: tint, alpha: 0.16 }).stroke({ width: 6, color: tint, alpha: 0.55 })
    pad.eventMode = 'none'
    // Själva saken (emoji).
    const label = new Text({ text: chain[0].e, style: { fontFamily: FONT.body, fontSize: Math.round(podR * 1.5), align: 'center' } })
    label.anchor.set(0.5)
    label.eventMode = 'none'

    cont.addChild(shadow, pad, label)
    const halo = podR + 26 // generös, osynlig hit-halo (>=96px mål)
    cont.hitArea = new Rectangle(-halo, -halo, halo * 2, halo * 2)
    cont.eventMode = 'static'
    cont.cursor = 'pointer'

    const obj = { chain, stage: 0, cont, label, shadow, x: pt.x, y: pt.y, done: false, busy: false, breatheT: null, phase: Math.random() * Math.PI * 2 }
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

    // Direkt återkoppling (<100ms): ljud + ring + poff.
    ctx.services.audio.sfx(final ? 'reveal' : 'pop')
    this._poof(obj.x, obj.y, final)

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
      .add(() => { if (this._alive && obj.label && !obj.label.destroyed) obj.label.text = st.e })
      .to(obj.cont.scale, { x: 1, y: 1, duration: 0.36, ease: 'back.out(2.4)' })

    if (final) {
      obj.done = true
      sparkle(this._fx, obj.x, obj.y - 10, { count: 8 })
      floatText(this._fx, obj.x, obj.y - 40, st.e, { fontSize: 64, rise: 72 })
      this._say(ctx, `${st.a} ${st.n}!`) // rösten ropar resultatet
      this._refreshDots()
      this._checkRound(ctx)
    } else {
      floatText(this._fx, obj.x, obj.y - 30, st.e, { fontSize: 46, rise: 58 })
    }
  },

  // Tryck på en redan klar sak: glittrar och säger namnet igen — aldrig "fel".
  _replayDone(ctx, obj) {
    if (!this._alive) return
    this._idle = 0
    const st = obj.chain[obj.chain.length - 1]
    if (obj.label && !obj.label.destroyed) obj.label.text = st.e
    ctx.services.audio.sfx('pling')
    pop(obj.cont)
    sparkle(this._fx, obj.x, obj.y - 10, { count: 6 })
    this._say(ctx, `${st.a} ${st.n}!`)
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

  _poof(x, y, big) {
    ripple(this._fx, x, y, { maxR: big ? 110 : 80, color: 0xffffff, width: 6 })
    if (big) burst(this._fx, x, y, { count: 16, power: 1.1 })
    else puff(this._fx, x, y, { count: 10 })
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
