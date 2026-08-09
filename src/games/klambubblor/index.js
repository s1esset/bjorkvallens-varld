// Klämbubblor — tryck/orsak-verkan (2–4 år). Marknadsmässig uppgradering av
// referensspelet: glansiga, halvgenomskinliga bubblor på en levande scen, saftig
// "juice" vid varje pekning, och växande djup per nivå (fler/varierade bubblor,
// gömda överraskningar, regnbågsbubbla som kedjepoppar, och ett valfritt,
// HELT felfritt färgmål på högre nivåer). Inga felsteg, inget slut — när fältet är
// tomt firar vi (delat firande via progress.complete) och ett nytt, lite rikare
// fält fylls på. All transient-effekt går via lib/feedback.js (exit-säkert).
import { Container, Graphics } from 'pixi.js'
import { gsap } from 'gsap'
import { createScene } from '../../lib/scene.js'
import { bounceIn, ripple, burst, sparkle, floatText, shake, breathe } from '../../lib/feedback.js'
import { makeKaraktar } from '../../lib/karaktarer.js'
import { PLAYFUL } from '../../lib/theme.js'

// Scen-tema per nivå (alla "bubbel-vänliga"; vatten/himmel passar bäst).
const THEME_CYCLE = ['water', 'sky', 'sunset', 'candy', 'meadow', 'night']

// Hex -> svensk färgform för det talade färgmålet (full åäö).
const COLOR_WORDS = {
  [0xff8a3d]: 'orange',
  [0x5bbf6a]: 'gröna',
  [0x4aa3df]: 'blåa',
  [0xffd35c]: 'gula',
  [0xa78bfa]: 'lila',
  [0xff6b6b]: 'röda',
  [0xff9ec4]: 'rosa',
  [0x57c8c3]: 'turkosa',
}

// Gömda överraskningar (≈1 av 8 bubblor) — söta, neutrala emoji.
const SURPRISES = ['⭐', '🐠', '🦋', '🌸', '🐞', '🍓', '🌈', '🐢', '🐥', '🦄', '🍀', '🐝']

export default {
  id: 'klambubblor',
  titleSv: 'Klämbubblor',
  icon: '🫧',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'klambubblor',
  voiceIntro: 'Tryck på bubblorna så spricker de!',

  init(ctx) {
    this._alive = true
    this._started = false
    this._root = new Container()
    ctx.stage.addChild(this._root)
    this._idle = 0
    this._combo = 0 // snabba pop i rad → stigande kombo-ton
    this._lastPopAt = -9999
    this._build(ctx, false)
    this._tick = (ticker) => this._update(ctx, ticker)
    ctx.ticker.add(this._tick)
  },

  mount(ctx) {
    this._started = true
    ctx.services.voice.say(this._cue || this.voiceIntro)
  },

  // Bygg (eller återuppbygg) ett fält. announce=true talar nivåns instruktion.
  _build(ctx, announce = false) {
    if (!this._alive) return

    // --- riv föregående fält (exit-/rebuild-säkert) ---
    if (this._idleBreath) {
      this._idleBreath.kill()
      this._idleBreath = null
    }
    if (this._targetView && !this._targetView.destroyed) gsap.killTweensOf(this._targetView.scale)
    this._targetView = null
    this._hintBubble = null
    this._bubbles?.forEach((b) => {
      b._bob?.kill()
      b._spin?.kill()
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
    })
    this._root.removeChildren().forEach((c) => c.destroy({ children: true }))

    const L = ctx.progress.get().highestLevel || 0

    // Bakgrundsscen (varierar per nivå).
    this._root.addChild(createScene(THEME_CYCLE[L % THEME_CYCLE.length]))

    // Små bubblor som stiger i bakgrunden — scenen var stillastående tapet.
    this._miniLayer = new Container()
    this._miniLayer.eventMode = 'none'
    this._miniLayer.interactiveChildren = false
    this._root.addChild(this._miniLayer)
    this._minis = []
    for (let i = 0; i < 26; i++) {
      const rr = 3 + Math.random() * 9
      const g = new Graphics()
        .circle(0, 0, rr).fill({ color: 0xffffff, alpha: 0.16 })
        .circle(-rr * 0.3, -rr * 0.3, rr * 0.32).fill({ color: 0xffffff, alpha: 0.35 })
      g.eventMode = 'none'
      this._miniLayer.addChild(g)
      this._minis.push({ g, x: Math.random() * ctx.width, y: Math.random() * ctx.height, sp: 12 + Math.random() * 26, amp: 8 + Math.random() * 20, ph: Math.random() * Math.PI * 2 })
    }

    // Bubbel-lager + ett fx-lager ovanpå för poppar/ringar/text (städas med roten).
    this._layer = new Container()
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._root.addChild(this._layer, this._fx)

    // Mottagare: Bobo står i vattnet nere till vänster med en burk som fylls för
    // varje bubbla man poppar — förut försvann allt man "samlade" spårlöst.
    // `kropp: false` med flit: Bobo står i VATTNET, så bara huvudet ska synas.
    // En hel kropp hade hamnat 108 px under hans nuvarande läge (2,36·46), alltså
    // utanför rutan — och en kropp som sticker ner genom vattenytan är inte samma
    // figur, det är en ny layout.
    this._boboBase = { x: 128, y: 636 }
    this._kar = makeKaraktar({ r: 46, kropp: false })
    this._bobo = this._kar.view
    this._bobo.position.set(this._boboBase.x, this._boboBase.y)
    this._root.addChild(this._bobo)
    this._jarG = new Graphics()
    this._jarG.position.set(232, 660)
    this._jarG.eventMode = 'none'
    this._root.addChild(this._jarG)
    this._caught = []
    this._drawJar()

    this._bubbles = []
    this._remaining = 0
    this._cleared = false
    this._idle = 0
    this._combo = 0

    // --- DJUP: fältet växer med nivån ---
    const cols = Math.min(4 + Math.floor(L * 0.8), 9)
    const rows = Math.min(3 + Math.floor(L * 0.5), 6)
    const marginX = 160
    const marginY = 160
    const stepX = cols > 1 ? (ctx.width - marginX * 2) / (cols - 1) : 0
    const stepY = rows > 1 ? (ctx.height - marginY * 2) / (rows - 1) : 0
    const cell = Math.min(stepX || 9999, stepY || 9999)
    const baseR = Math.max(30, Math.min(60, cell * 0.4))
    const jitter = cell * 0.24 // större slumphopp → lekfull kluster-känsla (inte ett rutnät)

    // Regnbågsbubbla (sällsynt): chans + position väljs först.
    const total = cols * rows
    const rainbowIdx = L >= 1 && Math.random() < 0.6 ? (Math.random() * total) | 0 : -1

    let idx = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++, idx++) {
        const isRainbow = idx === rainbowIdx
        const color = PLAYFUL[(r + c) % PLAYFUL.length]
        const rad = isRainbow ? baseR * 1.12 : baseR * (0.68 + Math.random() * 0.54) // bredare storleksspridning
        const surprise = !isRainbow && Math.random() < 0.125 ? SURPRISES[(Math.random() * SURPRISES.length) | 0] : null

        const b = this._makeBubble(ctx, { color, r: rad, rainbow: isRainbow, surprise })
        // Kluster-layout: hex-förskjutna rader + stort slumphopp bryter rutnäts-känslan;
        // klampas kvar på skärmen (under topp-knapparna).
        const hexOff = (r % 2) * stepX * 0.34
        const jx = marginX + c * stepX + hexOff + (Math.random() * 2 - 1) * jitter
        const jy = marginY + r * stepY + (Math.random() * 2 - 1) * jitter
        b.x = Math.max(rad + 12, Math.min(ctx.width - rad - 12, jx))
        b.y = Math.max(rad + 120, Math.min(ctx.height - rad - 96, jy))
        this._layer.addChild(b)
        this._bubbles.push(b)
        this._remaining++

        // Studsande entré.
        bounceIn(b, { delay: Math.min(idx * 0.012, 0.6), duration: 0.34 })
        // Levande drift: bubblorna vandrar mjukt i sidled, guppar och studsar mot
        // kanterna. Förut var det en ren gsap-y-bob — de rörde sig men LEVDE inte.
        b._vx = (Math.random() * 2 - 1) * 10
        b._baseY = b.y
        b._bobAmp = 5 + Math.random() * 7
        b._bobSp = 0.6 + Math.random() * 0.5
        b._ph = Math.random() * Math.PI * 2
      }
    }

    // --- DJUP: valfritt färgmål (helt felfritt) från nivå 2 ---
    this._goalColor = null
    if (L >= 2) {
      const counts = new Map()
      this._bubbles.forEach((b) => {
        if (!b._rainbow) counts.set(b._color, (counts.get(b._color) || 0) + 1)
      })
      const pool = [...counts.entries()].filter(([, n]) => n >= 3).map(([col]) => col)
      if (pool.length) this._goalColor = pool[(Math.random() * pool.length) | 0]
    }

    this._cue =
      this._goalColor != null
        ? `Tryck på de ${COLOR_WORDS[this._goalColor] || ''} bubblorna!`
        : this.voiceIntro

    // Visuell måltavla (talat + SYNLIGT): en liten mål-bubbla i målfärgen uppe i mitten,
    // så barnet ser vilken färg som gäller även utan ljud. Fortfarande helt felfritt.
    if (this._goalColor != null) {
      this._targetView = this._makeTarget(this._goalColor)
      this._targetView.position.set(ctx.width / 2, 78)
      this._fx.addChild(this._targetView)
    }

    if (announce && this._started) ctx.services.voice.say(this._cue)
  },

  _makeBubble(ctx, { color, r, rainbow, surprise }) {
    const b = new Container()

    // Mjuk skugga (offset, låg alpha) — ger djup utan filter.
    b.addChild(new Graphics().circle(2, 7, r * 1.04).fill({ color: 0x16314a, alpha: 0.13 }))

    // Halvgenomskinlig kropp.
    const body = new Graphics()
    if (rainbow) body.circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.3 })
    else body.circle(0, 0, r).fill({ color, alpha: 0.42 })
    b.addChild(body)

    if (rainbow) {
      // Roterande regnbågsring (mjuk shimmer).
      const ring = new Container()
      const n = PLAYFUL.length
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2
        const a1 = ((i + 1) / n) * Math.PI * 2 + 0.05
        ring.addChild(
          new Graphics().arc(0, 0, r, a0, a1).stroke({ width: r * 0.16, color: PLAYFUL[i], alpha: 0.95, cap: 'round' }),
        )
      }
      b.addChild(ring)
      b._spin = gsap.to(ring, { rotation: Math.PI * 2, duration: 6, repeat: -1, ease: 'none' })
    } else {
      // Ljus kant + svag iriserande "sheen" i en förskjuten nyans.
      body.circle(0, 0, r).stroke({ width: Math.max(3, r * 0.1), color, alpha: 0.95 })
      const sheen = PLAYFUL[(PLAYFUL.indexOf(color) + 3) % PLAYFUL.length]
      b.addChild(new Graphics().circle(r * 0.26, r * 0.3, r * 0.5).fill({ color: sheen, alpha: 0.16 }))
    }

    // Mjuk inre ring + glansig dager (roterad ellips) + liten gnista.
    b.addChild(new Graphics().circle(0, 0, r * 0.8).stroke({ width: 2, color: 0xffffff, alpha: 0.22 }))
    const gloss = new Graphics().ellipse(0, 0, r * 0.34, r * 0.19).fill({ color: 0xffffff, alpha: 0.85 })
    gloss.position.set(-r * 0.3, -r * 0.32)
    gloss.rotation = -0.6
    b.addChild(gloss)
    b.addChild(new Graphics().circle(r * 0.18, -r * 0.42, r * 0.07).fill({ color: 0xffffff, alpha: 0.6 }))

    b.eventMode = 'static'
    b.cursor = 'pointer'
    b.hitArea = { contains: (px, py) => px * px + py * py <= (r + 24) * (r + 24) } // +24px osynlig hit-halo
    b._popped = false
    b._color = color
    b._r = r
    b._rainbow = !!rainbow
    b._surprise = surprise || null
    b.on('pointertap', () => this._pop(ctx, b))
    return b
  },

  // Liten visuell måltavla: en mål-bubbla i målfärgen + en pil, uppe i mitten (noll läsning).
  _makeTarget(color) {
    const c = new Container()
    c.addChild(new Graphics().roundRect(-44, -40, 88, 82, 20).fill({ color: 0x16314a, alpha: 0.16 }))
    const bub = new Graphics().circle(0, -6, 26).fill({ color, alpha: 0.5 }).stroke({ width: 5, color, alpha: 0.95 })
    bub.circle(-8, -14, 7).fill({ color: 0xffffff, alpha: 0.85 })
    c.addChild(bub)
    c.addChild(new Graphics().poly([0, 34, -10, 20, 10, 20]).fill({ color: 0xffffff, alpha: 0.9 }))
    c.eventMode = 'none'
    return c
  },

  // Tappet: alltid roligt, aldrig fel. Regnbåge -> kedjepopp. Mål-färg -> extra gnistor.
  _pop(ctx, b) {
    if (!this._alive || b._popped) return
    this._idle = 0
    this._clearHint()

    if (b._rainbow) {
      floatText(this._fx, b.x, b.y - b._r, '🌈', { fontSize: Math.max(48, b._r * 1.2) })
      this._popOne(ctx, b, { special: true })
      // Kedjepoppa de närmaste grannarna i en gnist-våg.
      const live = this._bubbles
        .filter((x) => !x._popped && !x.destroyed)
        .map((x) => ({ x, d: Math.hypot(x.x - b.x, x.y - b.y) }))
        .sort((p, q) => p.d - q.d)
        .slice(0, 6)
      live.forEach((nb, i) => {
        gsap.delayedCall(0.09 * (i + 1), () => {
          if (!this._alive || nb.x._popped) return
          sparkle(this._fx, nb.x.x, nb.x.y, { count: 8 })
          this._popOne(ctx, nb.x, { special: true })
          this._checkClear(ctx)
        })
      })
      this._checkClear(ctx)
      return
    }

    const matched = this._goalColor != null && b._color === this._goalColor
    this._popOne(ctx, b, { matched })
    this._checkClear(ctx)
  },

  // Själva poppen (delad av tap + kedjepopp). Ljud+bild < 100ms.
  _popOne(ctx, b, { special = false, matched = false } = {}) {
    if (!this._alive || b._popped) return
    b._popped = true
    this._remaining--
    b._bob?.kill()
    b._spin?.kill()
    b.eventMode = 'none'

    // Stigande kombo: snabba pop i rad klättrar ett halvtonsteg (upp till en oktav).
    const nowMs = performance.now()
    this._combo = nowMs - this._lastPopAt < 1100 ? Math.min(this._combo + 1, 12) : 0
    this._lastPopAt = nowMs

    ctx.services.audio.sfx(special ? 'reveal' : matched ? 'pling' : 'pop')
    // Mjuk musikalisk "blubb" som klättrar med kombon (ersätter den slumpade pling-variationen).
    if (!special) ctx.services.audio.tone({ freq: 392 * Math.pow(2, this._combo / 12), dur: 0.13, type: 'sine', vol: 0.16 })

    // Direkt vattenring + saftig partikel-burst.
    ripple(this._fx, b.x, b.y, { color: b._color, maxR: b._r * 2.3, width: 5, alpha: 0.7 })
    burst(this._fx, b.x, b.y, {
      count: special ? 16 : 11,
      colors: special ? PLAYFUL : [b._color],
      power: special ? 1.3 : 1,
    })
    if (matched) {
      sparkle(this._fx, b.x, b.y, { count: 10 })
      ctx.services.audio.sfx('match')
      // Måltavlan studsar när rätt färg poppas (synlig koppling mål → handling).
      if (this._targetView && !this._targetView.destroyed) {
        gsap.killTweensOf(this._targetView.scale)
        gsap.fromTo(this._targetView.scale, { x: 1, y: 1 }, { x: 1.28, y: 1.28, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' })
      }
    }
    if (b._surprise) floatText(this._fx, b.x, b.y - 8, b._surprise, { fontSize: 64 })

    // Bobo tar emot: burken fylls med en pärla i bubblans färg och han mumsar till.
    this._catch(b._color)

    // Squash/stretch -> krymp och försvinn.
    gsap.killTweensOf(b.scale)
    gsap
      .timeline()
      .to(b.scale, { x: 1.3, y: 1.3, duration: 0.09, ease: 'power2.out' })
      .to(b.scale, {
        x: 0,
        y: 0,
        duration: 0.22,
        ease: 'back.in(2)',
        onComplete: () => {
          if (!b.destroyed) b.visible = false
        },
      })
  },

  _checkClear(ctx) {
    if (!this._alive || this._cleared || this._remaining > 0) return
    this._cleared = true
    const L = ctx.progress.get().highestLevel || 0
    ctx.progress.setLevel(L + 1)
    ctx.progress.setCustom('rundor', (ctx.progress.get().custom?.rundor || 0) + 1)
    ctx.progress.complete() // delat firande: celebrate-sfx + beröm + konfetti + stjärna + klistermärke
    shake(this._root, { intensity: 5, duration: 0.5 }) // mjuk, glad "duns"
    // Bobo jublar över hela fångsten. Spelets egen studs (fyra hopp på 40 px) är
    // större än riggens och får äga `y` — därför `setMood('stolt')` i stället för
    // `react('jubel')`, som hade tweenat samma `y` samtidigt. Minen firar, kroppen
    // hoppar, och ingen av dem skriver över den andra.
    this._kar?.setMood('stolt')
    if (this._bobo && !this._bobo.destroyed) {
      gsap.killTweensOf(this._bobo)
      gsap.to(this._bobo, {
        y: this._boboBase.y - 40, duration: 0.26, yoyo: true, repeat: 3, ease: 'power2.out',
        onComplete: () => {
          if (this._bobo && !this._bobo.destroyed) this._bobo.y = this._boboBase.y
          this._kar?.setMood('glad')
        },
      })
    }
    gsap.delayedCall(1.3, () => {
      if (!this._alive) return
      this._build(ctx, true)
    })
  },

  // Lugn idle-lockelse: upprepa instruktionen och låt en bubbla "andas".
  _update(ctx, ticker) {
    if (!this._alive) return
    const dt = Math.min(ticker.deltaMS, 50) / 1000
    this._t = (this._t || 0) + dt

    // Små bubblor stiger och lindar om — ger vatten-känsla i en annars stilla scen.
    for (const m of this._minis || []) {
      if (!m.g || m.g.destroyed) continue
      m.y -= m.sp * dt
      if (m.y < -20) { m.y = ctx.height + 20; m.x = Math.random() * ctx.width }
      m.g.position.set(m.x + Math.sin(this._t * 0.8 + m.ph) * m.amp, m.y)
    }

    // Bobo följer den bubbla som är närmast honom med blicken — publiken tittar på
    // det som är på väg att hända. Riggen räknar i FÖRÄLDERNS rymd (`_root`), och
    // bubblorna ligger i `_layer`; därför via global.
    if (this._kar && this._bobo && !this._bobo.destroyed) {
      let mal = null
      let bast = Infinity
      for (const b of this._bubbles || []) {
        if (!b || b.destroyed || b._popped) continue
        const d = (b.x - this._bobo.x) ** 2 + (b.y - this._bobo.y) ** 2
        if (d < bast) { bast = d; mal = b }
      }
      if (mal) {
        const p = this._root.toLocal(mal.getGlobalPosition())
        this._kar.look(p.x, p.y)
      }
    }

    // Bubblorna vandrar mjukt och studsar mot kanterna.
    for (const b of this._bubbles || []) {
      if (!b || b.destroyed || b._popped) continue
      b.x += b._vx * dt
      const r = b._r || 40
      if (b.x < r + 10) { b.x = r + 10; b._vx = Math.abs(b._vx) }
      if (b.x > ctx.width - r - 10) { b.x = ctx.width - r - 10; b._vx = -Math.abs(b._vx) }
      b.y = b._baseY + Math.sin(this._t * b._bobSp * Math.PI + b._ph) * b._bobAmp
    }

    this._idle += ticker.deltaMS / 1000
    if (this._idle > 6 && this._remaining > 0 && !this._cleared) {
      this._idle = 0
      ctx.services.voice.say(this._cue || this.voiceIntro)
      this._clearHint()
      const live = this._bubbles.filter((b) => !b._popped && !b.destroyed)
      let pool = live
      if (this._goalColor != null) {
        const g = live.filter((b) => b._color === this._goalColor)
        if (g.length) pool = g
      }
      if (pool.length) {
        const b = pool[(Math.random() * pool.length) | 0]
        this._hintBubble = b
        this._idleBreath = breathe(b, { scale: 1.12, duration: 0.7 })
      }
    }
  },

  // En poppad bubbla landar som en pärla i Bobos burk (synligt samlande).
  _catch(color) {
    if (!this._caught) return
    this._caught.push(color)
    if (this._caught.length > 26) this._caught.shift()
    this._drawJar()
    const now = performance.now()
    if (now - (this._lastChomp || 0) > 380) {
      this._lastChomp = now
      // `heja`, inte `pop()`: skalan ägs av riggens andning, och två skrivare om
      // samma värde blir hackigt. Utan kropp bär huvudets nick hela gesten.
      this._kar?.react('heja')
    }
  },

  _drawJar() {
    const g = this._jarG
    if (!g || g.destroyed) return
    g.clear()
    // Glasburk med hals och lock.
    g.roundRect(-34, -56, 68, 84, 16).fill({ color: 0xdff4ff, alpha: 0.45 })
      .roundRect(-34, -56, 68, 84, 16).stroke({ width: 4, color: 0xa8d6ea })
    g.roundRect(-22, -70, 44, 16, 7).fill(0xa8d6ea)
    // Pärlorna staplas nerifrån.
    const n = this._caught.length
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 4)
      const col = i % 4
      const px = -22 + col * 15 + (row % 2 ? 7 : 0)
      const py = 18 - row * 13
      if (py < -46) break
      g.circle(px, py, 7).fill({ color: this._caught[i], alpha: 0.95 })
      g.circle(px - 2, py - 2, 2.4).fill({ color: 0xffffff, alpha: 0.7 })
    }
  },

  _clearHint() {
    if (this._idleBreath) {
      this._idleBreath.kill()
      this._idleBreath = null
    }
    const h = this._hintBubble
    if (h && !h.destroyed && !h._popped) {
      gsap.killTweensOf(h.scale)
      h.scale.set(1)
    }
    this._hintBubble = null
  },

  destroy(ctx) {
    this._alive = false
    if (ctx?.ticker && this._tick) ctx.ticker.remove(this._tick)
    if (this._idleBreath) {
      this._idleBreath.kill()
      this._idleBreath = null
    }
    this._bubbles?.forEach((b) => {
      b._bob?.kill()
      b._spin?.kill()
      gsap.killTweensOf(b)
      gsap.killTweensOf(b.scale)
    })
    if (this._targetView && !this._targetView.destroyed) gsap.killTweensOf(this._targetView.scale)
    if (this._bobo && !this._bobo.destroyed) gsap.killTweensOf(this._bobo) // spelets egen studs på y
    this._kar?.destroy() // river riggens alla tweens (idle, blink, humör, reaktion)
    this._kar = null
    this._bobo = null
    gsap.killTweensOf(this._root)
    gsap.killTweensOf(this._layer)
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
    this._layer = null
    this._fx = null
    this._bubbles = null
    this._hintBubble = null
  },
}
