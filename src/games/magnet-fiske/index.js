// Magnetfiske — fysik-/upptäckarlek (2–4 år). Barnet drar en magnet på ett spö över en
// damm sedd ovanifrån. Metallsaker (🐟🔑🪙🔩🥫) lever som RIKTIGA matter.js-kroppar och
// dras RADIELLT mot magnetpunkten (en egen per-tick-kraft ∝ 1/avstånd → len drift långt
// bort, snabb snäpp nära) tills de fastnar i en liten klase under magneten. Icke-metall
// (🦆🛟⛵) bryr sig inte alls — kommer magneten för nära knuffas ankan bara mjukt undan
// med ett fniss (ALDRIG en bestraffning). Barnet lyfter de fastklistrade sakerna till
// hinken 🪣 på stranden där de släpps (plopp + räknas). Alla metallsaker i hinken →
// firande + ny, lite större damm. Lär ut: magneter gillar metall, inte trä/gummi.
// Ingen fail-state: fältet når hela dammen, idle-vink + auto-hjälp garanterar framgång.
// Allt ritas programmatiskt (Pixi Graphics + emoji) och städas exit-säkert.
import { Container, Graphics, Text, Circle } from 'pixi.js'
import { gsap } from 'gsap'
import { PhysicsWorld, Body, nudge } from '../../lib/physics.js'
import { createScene } from '../../lib/scene.js'
import { COLORS, FONT, PRAISE } from '../../lib/theme.js'
import { randomFrom, shuffle } from '../../lib/swedish.js'
import { sparkle, pop, wiggle, puff, floatText, breathe, bigCelebration } from '../../lib/feedback.js'

const METAL = ['🐟', '🔑', '🪙', '🔩', '🥫']
const NONMETAL = ['🦆', '🛟', '⛵']

// Radiell magnet-attraktion (kalibrerad mot matters fasta 1/60-steg, se docs):
// a = min(STRENGTH/max(dist,R_MIN), A_MAX). Långt bort (300) → len drift, nära → snabb snäpp.
const R_FIELD = 300 // kraftfältets radie
const R_MIN = 28 // golv på avståndet (undvik singularitet nära magneten)
const STRENGTH = 12 // fältstyrka
const A_MAX = 10 // tak på accelerationen
const STICK_R = 46 // fastna-radie (== klister-halons radie)
const DUCK_PUSH_R = 80 // ankan knuffas mjukt undan inom denna radie

const BUCKET = { x: 1150, y: 510 } // hinkens släpp-zon (centrum)
const BUCKET_R = 130 // släpp-zonens radie
const PIVOT = { x: 1200, y: 70 } // spöets fasta pivot uppe i högra hörnet
// Fastklistrade saker hänger i en liten solfjäder under magneten (indexerat på fångstordning).
const SLOTS = [{ x: 0, y: 48 }, { x: -36, y: 60 }, { x: 36, y: 60 }, { x: 0, y: 76 }, { x: -30, y: 86 }]

const POND = { x0: 120, y0: 200, x1: 960, y1: 610 } // logisk damm-ruta (väggar längs kanterna)
const MOVE = { x0: 120, y0: 110, x1: 1210, y1: 620 } // magnetens rörelse-ruta (damm + hink)
const PARK = { x: 560, y: 130 } // magnetens parkering ovanför dammen
// Inre rektangel där saker placeras (marginal in från väggarna).
const SPAWN = { x0: 160, y0: 245, x1: 920, y1: 565 }

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default {
  id: 'magnet-fiske',
  titleSv: 'Magnetfiske',
  icon: '🧲',
  category: 'drag',
  input: 'drag',
  ageRange: [2, 4],
  bundle: 'magnet-fiske',
  voiceIntro: 'Dra magneten och fiska upp metallsakerna!',

  init(ctx) {
    this._alive = true
    this._dragging = false
    this._resolving = false
    this._saidFirst = false
    this._idle = 0
    this._caught = 0
    this._needed = 0
    this._lastFniss = 0
    this._items = [] // { body, view, metal, stuck, delivered, slot }
    this._stuck = []
    this._proxyTweens = []
    this._hintTween = null
    this._hintView = null
    this._grab = { x: 0, y: 0 }
    this._target = { x: PARK.x, y: PARK.y }

    this._root = new Container()
    ctx.stage.addChild(this._root)

    // Bakgrund FÖRST: mjuk blå vatten-scen (dekorativ).
    this._root.addChild(createScene('water', { width: ctx.width, height: ctx.height }))

    // Damm-panel + ljusa vågremsor (dekorativ).
    const panel = new Graphics()
    panel.roundRect(70, 150, 940, 500, 60).fill({ color: COLORS.blue, alpha: 0.55 }).stroke({ width: 10, color: COLORS.teal })
    panel.roundRect(110, 230, 860, 26, 13).fill({ color: COLORS.white, alpha: 0.1 })
    panel.roundRect(150, 360, 780, 26, 13).fill({ color: COLORS.white, alpha: 0.1 })
    panel.roundRect(120, 500, 840, 26, 13).fill({ color: COLORS.white, alpha: 0.1 })
    panel.eventMode = 'none'
    this._root.addChild(panel)

    // Hink + gul glödring (släpp-zon) + skugga (dekorativa).
    const glow = new Graphics().circle(BUCKET.x, 500, 130).stroke({ width: 8, color: COLORS.yellow, alpha: 0.5 })
    glow.eventMode = 'none'
    this._root.addChild(glow)
    const bsh = new Graphics().ellipse(1150, 624, 84, 20).fill({ color: COLORS.shadow, alpha: 0.12 })
    bsh.eventMode = 'none'
    this._root.addChild(bsh)
    this._bucketText = new Text({ text: '🪣', style: { fontFamily: FONT.body, fontSize: 130 } })
    this._bucketText.anchor.set(0.5)
    this._bucketText.position.set(1150, 540)
    this._bucketText.eventMode = 'none'
    this._root.addChild(this._bucketText)

    // Räknar-rad (små ⭐ visar hur många som ligger i hinken — aldrig en sjunkande siffra).
    this._counter = new Container()
    this._counter.position.set(1150, 372)
    this._counter.eventMode = 'none'
    this._counter.interactiveChildren = false
    this._root.addChild(this._counter)

    // Fysik: ingen gravitation (ovanifrån-damm), inga skärmväggar — egna pondväggar.
    this._phys = new PhysicsWorld({ gravityY: 0, gravityX: 0, walls: [] })
    const wopt = { isStatic: true, restitution: 0.3, label: 'wall' }
    this._phys.rectangle(540, POND.y0 - 20, 900, 40, wopt) // topp
    this._phys.rectangle(540, POND.y1 + 20, 900, 40, wopt) // botten
    this._phys.rectangle(POND.x0 - 20, 405, 40, 450, wopt) // vänster
    this._phys.rectangle(POND.x1 + 20, 405, 40, 450, wopt) // höger

    // Osynlig träffyta över hinken (tap-tap → magneten åker dit och släpper lasten).
    this._bucketHit = new Graphics().circle(BUCKET.x, BUCKET.y, BUCKET_R).fill({ color: 0xffffff, alpha: 0.001 })
    this._bucketHit.eventMode = 'static'
    this._bucketHit.cursor = 'pointer'
    this._onBucketTap = () => {
      if (!this._alive || this._resolving) return
      this._target = { x: BUCKET.x, y: BUCKET.y }
      this._idle = 0
    }
    this._bucketHit.on('pointertap', this._onBucketTap)
    this._root.addChild(this._bucketHit)

    // Lager för flytande saker (framför dammen, bakom magneten).
    this._itemLayer = new Container()
    this._root.addChild(this._itemLayer)

    // Spö (ritas om varje tick) + magnet på toppen.
    this._rod = new Graphics()
    this._rod.eventMode = 'none'
    this._root.addChild(this._rod)

    this._magnet = new Container()
    this._magnet.addChild(new Graphics().circle(0, 0, 46).fill({ color: COLORS.blue, alpha: 0.18 })) // klister-halo
    const head = new Text({ text: '🧲', style: { fontFamily: FONT.body, fontSize: 90 } })
    head.anchor.set(0.5)
    this._magnet.addChild(head)
    this._magnet.position.set(PARK.x, PARK.y)
    this._magnet.eventMode = 'static'
    this._magnet.cursor = 'pointer'
    this._magnet.hitArea = new Circle(0, 0, 90) // ≥96px + halo: lätt att greppa
    this._onDown = (e) => {
      if (!this._alive || this._resolving) return
      this._dragging = true
      const lp = this._root.toLocal(e.global)
      this._grab = { x: this._magnet.x - lp.x, y: this._magnet.y - lp.y }
      ctx.services.audio.sfx('tap')
      pop(this._magnet)
      this._idle = 0
    }
    this._onMove = (e) => {
      if (!this._dragging || !this._alive) return
      const lp = this._root.toLocal(e.global)
      this._target = {
        x: clamp(lp.x + this._grab.x, MOVE.x0, MOVE.x1),
        y: clamp(lp.y + this._grab.y, MOVE.y0, MOVE.y1),
      }
      this._idle = 0
    }
    this._onUp = () => {
      this._dragging = false
    }
    this._magnet.on('pointerdown', this._onDown)
    this._magnet.on('globalpointermove', this._onMove)
    this._magnet.on('pointerup', this._onUp)
    this._magnet.on('pointerupoutside', this._onUp)
    this._root.addChild(this._magnet)

    this._level = Math.max(0, ctx.progress.get().highestLevel | 0)
    this._buildPond(ctx)

    this._tick = (t) => this._update(ctx, t)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._idle = 0
    ctx.services.voice.say(this.voiceIntro)
  },

  // ---- Bygg en damm för aktuell nivå --------------------------------------

  _counts(level) {
    if (level <= 0) return { metal: 2, kork: 1 }
    if (level === 1) return { metal: 3, kork: 1 }
    if (level === 2) return { metal: 4, kork: 2 }
    return { metal: 5, kork: 3 } // cap
  },

  _buildPond(ctx) {
    if (!this._alive) return
    this._clearItems()
    this._caught = 0
    this._resolving = false
    this._dragging = false
    this._target = { x: PARK.x, y: PARK.y }
    this._magnet.position.set(PARK.x, PARK.y)

    const { metal, kork } = this._counts(this._level)
    this._needed = metal

    // Svag ambient ström på höga nivåer → lite mer sikte krävs (no-fail kvarstår).
    this._phys.setWind(this._level >= 3 ? 0.004 : 0, 0)

    // Tillåtna icke-metall-emojis växer med nivån.
    const korkPool = this._level <= 1 ? ['🦆'] : this._level === 2 ? ['🦆', '🛟'] : NONMETAL
    const metalEmojis = fill(METAL, metal)
    const korkEmojis = fill(korkPool, kork)

    const placed = []
    const spawn = (emoji, isMetal) => {
      const p = pickSpot(placed)
      placed.push(p)
      this._addItem(ctx, emoji, isMetal, p.x, p.y)
    }
    for (const e of metalEmojis) spawn(e, true)
    for (const e of korkEmojis) spawn(e, false)

    this._drawCounter()
  },

  _addItem(ctx, emoji, metal, x, y) {
    const view = new Container()
    const sh = new Graphics().ellipse(0, 30, 34, 12).fill({ color: COLORS.shadow, alpha: 0.12 })
    sh.eventMode = 'none'
    const t = new Text({ text: emoji, style: { fontFamily: FONT.body, fontSize: 72 } })
    t.anchor.set(0.5)
    view.addChild(sh, t)
    view.position.set(x, y)
    view.eventMode = 'static'
    view.cursor = 'pointer'
    view.hitArea = new Circle(0, 0, 55)
    this._itemLayer.addChild(view)

    const body = this._phys.circle(x, y, 38, { restitution: 0.2, friction: 0.1, frictionAir: 0.06, density: 0.0012, label: metal ? 'metal' : 'kork' })
    nudge(body, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6) // litet levande gupp
    this._phys.link(body, view)

    const it = { body, view, metal, stuck: false, delivered: false, slot: 0 }
    view.on('pointertap', () => {
      if (!this._alive || this._resolving || it.delivered || it.stuck) return
      if (it.metal) {
        // tap-tap-mål: magneten glider hit (samma _target-logik som drag)
        this._target = { x: it.view.x, y: it.view.y }
        this._idle = 0
      } else {
        // anka: lekfullt fniss, fastnar aldrig
        this._fniss(ctx, it)
        this._idle = 0
      }
    })
    this._items.push(it)
  },

  // Lekfull anka-reaktion (mjukt ljud + vingel + "Hihi!") — aldrig en bestraffning.
  _fniss(ctx, it) {
    ctx.services.audio.sfx('soft')
    if (!it.view.destroyed) wiggle(it.view)
    floatText(ctx.fxLayer, it.view.x, it.view.y - 24, 'Hihi!', { fontSize: 42 })
  },

  // ---- Ticker -------------------------------------------------------------

  _update(ctx, t) {
    if (!this._alive) return
    const dt = Math.min(0.05, (t.deltaMS || 16.67) / 1000)

    // Magneten följer fingret/tap-målet (mjuk lerp), klampad till rörelse-rutan.
    const m = this._magnet
    m.x += (this._target.x - m.x) * 0.5
    m.y += (this._target.y - m.y) * 0.5
    m.x = clamp(m.x, MOVE.x0, MOVE.x1)
    m.y = clamp(m.y, MOVE.y0, MOVE.y1)
    const tip = { x: m.x, y: m.y }

    // Rita om spöet (pivot → magnetspets) + knopp vid pivoten.
    this._rod.clear()
    this._rod.moveTo(PIVOT.x, PIVOT.y).lineTo(tip.x, tip.y).stroke({ width: 12, color: COLORS.brown, cap: 'round' })
    this._rod.circle(PIVOT.x, PIVOT.y, 14).fill(COLORS.brown)

    // Per-tick krafter FÖRE fysiksteget: pinna fastklistrade, dra metall, knuffa ankor.
    if (!this._resolving) {
      for (const it of this._items) {
        if (it.delivered) continue
        const p = it.body.position
        if (it.metal && it.stuck) {
          const s = SLOTS[Math.min(it.slot, SLOTS.length - 1)]
          Body.setPosition(it.body, { x: tip.x + s.x, y: tip.y + s.y })
          Body.setVelocity(it.body, { x: 0, y: 0 })
          continue
        }
        const dx = tip.x - p.x
        const dy = tip.y - p.y
        const dist = Math.hypot(dx, dy) || 0.0001
        if (it.metal) {
          if (dist < R_FIELD) {
            const a = Math.min(STRENGTH / Math.max(dist, R_MIN), A_MAX)
            Body.applyForce(it.body, p, { x: it.body.mass * a * (dx / dist), y: it.body.mass * a * (dy / dist) })
          }
        } else if (dist < DUCK_PUSH_R) {
          // mjuk knuff BORT — ankan kan aldrig fastna
          Body.applyForce(it.body, p, { x: it.body.mass * 0.25 * (-dx / dist), y: it.body.mass * 0.25 * (-dy / dist) })
          const now = performance.now()
          if (now - this._lastFniss > 600) {
            this._lastFniss = now
            this._fniss(ctx, it)
          }
        }
      }
    }

    // Stega fysiken + synka vyer.
    this._phys.update(t.deltaMS)

    // EFTER steget: fastna-koll + släpp i hink.
    if (!this._resolving) {
      for (const it of this._items) {
        if (!it.metal || it.stuck || it.delivered) continue
        const p = it.body.position
        if (Math.hypot(tip.x - p.x, tip.y - p.y) < STICK_R) this._stick(ctx, it)
      }
      if (this._stuck.length && Math.hypot(tip.x - BUCKET.x, tip.y - BUCKET.y) < BUCKET_R) {
        for (const it of [...this._stuck]) this._deliver(ctx, it)
      }
    }

    // Idle-vink (~6s): röst-repris + närmaste ofångade metall gnistrar/andas + snäll auto-hjälp.
    if (!this._resolving) {
      this._idle += dt
      if (this._idle > 6) {
        this._idle = 0
        this._recue(ctx)
      }
    }
  },

  // ---- Fastna (klister) ---------------------------------------------------

  _stick(ctx, it) {
    if (!this._alive || it.stuck || it.delivered) return
    it.stuck = true
    it.body._stuck = true // exponerat teststate
    it.slot = this._stuck.length
    this._stuck.push(it)
    Body.setVelocity(it.body, { x: 0, y: 0 })
    this._clearHint()

    ctx.services.audio.sfx('match')
    sparkle(ctx.fxLayer, it.view.x, it.view.y)
    if (!it.view.destroyed) pop(it.view)
    floatText(ctx.fxLayer, it.view.x, it.view.y - 20, '✨', { fontSize: 46 })
    if (!this._saidFirst) {
      this._saidFirst = true
      ctx.services.voice.say('Den fastnar! Metall!')
    }
    this._idle = 0
  },

  // ---- Släpp i hinken -----------------------------------------------------

  _deliver(ctx, it) {
    if (!this._alive || it.delivered) return
    it.delivered = true
    const si = this._stuck.indexOf(it)
    if (si >= 0) this._stuck.splice(si, 1)
    if (it.body) this._phys.removeBody(it.body)

    ctx.services.audio.sfx('pling')
    puff(ctx.fxLayer, BUCKET.x, BUCKET.y, { color: COLORS.yellow })
    this._caught++
    this._drawCounter()

    // Vyn ploppar ner i hinken (exit-säker proxy-tween).
    const v = it.view
    if (v && !v.destroyed) {
      gsap.killTweensOf(v)
      gsap.killTweensOf(v.scale)
      const st = { x: v.x, y: v.y, s: v.scale.x || 1, a: 1 }
      const tw = gsap.to(st, {
        x: BUCKET.x,
        y: BUCKET.y + 14,
        s: 0.2,
        a: 0,
        duration: 0.4,
        ease: 'power2.in',
        onUpdate: () => {
          if (v.destroyed) {
            tw.kill()
            return
          }
          v.x = st.x
          v.y = st.y
          v.scale.set(st.s)
          v.alpha = st.a
        },
        onComplete: () => {
          const i = this._proxyTweens.indexOf(tw)
          if (i >= 0) this._proxyTweens.splice(i, 1)
          if (!v.destroyed) v.destroy()
        },
      })
      this._proxyTweens.push(tw)
    }

    if (this._caught >= this._needed) this._onComplete(ctx)
  },

  // ---- Mål nått: firande + ny, lite större damm ---------------------------

  _onComplete(ctx) {
    if (!this._alive || this._resolving) return
    this._resolving = true
    this._clearHint()

    ctx.services.audio.sfx('celebrate')
    ctx.services.voice.say(randomFrom(PRAISE))
    bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })
    if (this._bucketText && !this._bucketText.destroyed) pop(this._bucketText, { scale: 1.18 })

    ctx.progress.setLevel(this._level + 1)
    const cust = ctx.progress.get().custom || {}
    ctx.progress.setCustom('rundor', (cust.rundor || 0) + 1)
    ctx.progress.complete()
    this._level += 1

    this._completeTimer?.kill()
    this._completeTimer = gsap.delayedCall(1.5, () => {
      if (!this._alive) return
      ctx.services.voice.say('Fler saker att fiska!')
      this._buildPond(ctx)
    })
  },

  // ---- Idle-vink + snäll auto-hjälp ---------------------------------------

  _recue(ctx) {
    if (!this._alive || this._resolving) return
    ctx.services.voice.replayLast?.()
    let best = null
    let bd = Infinity
    for (const it of this._items) {
      if (!it.metal || it.stuck || it.delivered) continue
      const p = it.body.position
      const d = Math.hypot(this._magnet.x - p.x, this._magnet.y - p.y)
      if (d < bd) {
        bd = d
        best = it
      }
    }
    if (!best || best.view.destroyed) return
    sparkle(ctx.fxLayer, best.view.x, best.view.y)
    this._clearHint()
    this._hintView = best.view
    this._hintTween = breathe(best.view, { scale: 1.12, duration: 0.7 })
    // Mjuk auto-hjälp: knuffa närmaste metall en gnutta mot magneten så den till slut nås.
    const p = best.body.position
    const dx = this._magnet.x - p.x
    const dy = this._magnet.y - p.y
    const d = Math.hypot(dx, dy) || 1
    nudge(best.body, (dx / d) * 1.2, (dy / d) * 1.2)
  },

  _clearHint() {
    this._hintTween?.kill()
    this._hintTween = null
    if (this._hintView && !this._hintView.destroyed) this._hintView.scale.set(1)
    this._hintView = null
  },

  // ---- Räknar-rad ---------------------------------------------------------

  _drawCounter() {
    const c = this._counter
    if (!c || c.destroyed) return
    for (const ch of [...c.children]) ch.destroy()
    const n = this._caught
    const startX = -((n - 1) * 30) / 2
    for (let i = 0; i < n; i++) {
      const s = new Text({ text: '⭐', style: { fontFamily: FONT.body, fontSize: 30 } })
      s.anchor.set(0.5)
      s.position.set(startX + i * 30, 0)
      s.eventMode = 'none'
      c.addChild(s)
    }
  },

  // ---- Städning -----------------------------------------------------------

  _clearItems() {
    this._clearHint()
    for (const it of this._items) {
      if (it.body) this._phys.removeBody(it.body)
      const v = it.view
      if (v && !v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
        v.destroy()
      }
    }
    this._items = []
    this._stuck = []
  },

  destroy(ctx) {
    this._alive = false
    if (this._tick) ctx?.ticker?.remove(this._tick)
    this._completeTimer?.kill()
    this._clearHint()

    if (this._bucketHit && !this._bucketHit.destroyed) this._bucketHit.off('pointertap', this._onBucketTap)
    if (this._magnet && !this._magnet.destroyed) {
      this._magnet.off('pointerdown', this._onDown)
      this._magnet.off('globalpointermove', this._onMove)
      this._magnet.off('pointerup', this._onUp)
      this._magnet.off('pointerupoutside', this._onUp)
      gsap.killTweensOf(this._magnet)
      gsap.killTweensOf(this._magnet.scale)
    }
    for (const it of this._items) {
      const v = it.view
      if (v && !v.destroyed) {
        gsap.killTweensOf(v)
        gsap.killTweensOf(v.scale)
      }
    }
    this._items = []
    this._stuck = []
    this._proxyTweens.forEach((t) => t.kill())
    this._proxyTweens = []
    if (this._bucketText && !this._bucketText.destroyed) gsap.killTweensOf(this._bucketText.scale)

    this._phys?.destroy()
    gsap.killTweensOf(this._root)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
  },
}

// Fyll en lista med n emojis ur poolen (upprepa vid behov, slumpad ordning).
function fill(pool, n) {
  const s = shuffle(pool)
  const out = []
  let i = 0
  while (out.length < n) {
    out.push(s[i % s.length])
    i++
  }
  return out
}

// Hitta en plats i damm-rutan med ≥110px lucka till redan placerade saker.
function pickSpot(placed) {
  for (let tries = 0; tries < 40; tries++) {
    const x = SPAWN.x0 + Math.random() * (SPAWN.x1 - SPAWN.x0)
    const y = SPAWN.y0 + Math.random() * (SPAWN.y1 - SPAWN.y0)
    let ok = true
    for (const p of placed) {
      if (Math.hypot(p.x - x, p.y - y) < 110) {
        ok = false
        break
      }
    }
    if (ok) return { x, y }
  }
  return { x: SPAWN.x0 + Math.random() * (SPAWN.x1 - SPAWN.x0), y: SPAWN.y0 + Math.random() * (SPAWN.y1 - SPAWN.y0) }
}
