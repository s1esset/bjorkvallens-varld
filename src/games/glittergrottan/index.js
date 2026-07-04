// Glittergrottan — tryck/orsak-verkan i 3D (2–4 år) och MALL för nya 3D-spel.
// Visar hela three.js-mönstret: dynamisk import av lib/three3d.js, ThreeLayer
// bakom Pixi, shader-backdrop + glitter/regnbågs-material, pick() från en
// Pixi-hityta, worldToDesign() för Pixi-feedback ovanpå 3D-objekt, och
// exit-säker destroy (layer.destroy städar GPU:n).
//
// Loop: glittrande kristaller svävar i en natthimmelsgrotta. Tryck → kristallen
// poppar med gnistor. En sällsynt regnbågskristall kedjepoppar sina grannar.
// Tomt fält → delat firande (progress.complete) och ett nytt, lite rikare fält.
// Inga felsteg: miss = mjukt ljud + närmaste kristall vickar lekfullt.
import { Container, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { sparkle, burst, floatText } from '../../lib/feedback.js'
import { PLAYFUL } from '../../lib/theme.js'

export default {
  id: 'glittergrottan',
  titleSv: 'Glittergrottan',
  icon: '💎',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 4],
  bundle: 'glittergrottan',
  voiceIntro: 'Tryck på kristallerna så glittrar de!',

  async init(ctx) {
    this._alive = true
    this._started = false
    this._idle = 0
    this._combo = 0
    this._lastPopAt = -9999

    // three.js laddas DYNAMISKT → egen chunk, huvudbundlen förblir Pixi-ren.
    const T = await import('../../lib/three3d.js')
    if (!this._alive) return
    this._T = T

    const layer = new T.ThreeLayer(ctx.services)
    this._layer = layer
    T.makeBackdrop(layer, 'night')
    T.addKidLighting(layer.scene)

    // Pixi ovanpå: helskärms-hityta (ALL input via Pixi) + eget fx-lager.
    this._root = new Container()
    ctx.stage.addChild(this._root)
    const hitPlane = new Container()
    hitPlane.eventMode = 'static'
    hitPlane.hitArea = new Rectangle(0, 0, ctx.width, ctx.height)
    hitPlane.on('pointertap', (e) => {
      const p = e.getLocalPosition(hitPlane)
      this._tap(ctx, p.x, p.y)
    })
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._root.addChild(hitPlane, this._fx)

    this._crystals = []
    this._build(ctx, false)
    this._offUpdate = layer.onUpdate((dt, t) => this._update(ctx, dt, t))
  },

  mount(ctx) {
    this._started = true
    ctx.services.voice.say(this.voiceIntro)
  },

  // Bygg (eller återuppbygg) ett kristallfält. Växer lugnt med nivån.
  _build(ctx, announce) {
    if (!this._alive) return
    const T = this._T
    const layer = this._layer

    this._crystals.forEach((c) => {
      gsap.killTweensOf(c.mesh.scale)
      gsap.killTweensOf(c.mesh.rotation)
      layer.scene.remove(c.mesh)
      c.mesh.geometry.dispose()
      c.mesh.material.dispose()
    })
    this._crystals = []
    this._cleared = false
    this._remaining = 0
    this._idle = 0

    const L = ctx.progress.get().highestLevel || 0
    const count = Math.min(6 + L, 12)
    const rainbowIdx = L >= 1 && Math.random() < 0.6 ? (Math.random() * count) | 0 : -1

    // Sprid ut i DESIGNKOORDINATER (under topp-knapparna) med kluster-jitter,
    // och lite z-djup så perspektivet känns — designToWorld kompenserar.
    const cols = Math.ceil(Math.sqrt(count * 1.7))
    const rows = Math.ceil(count / cols)
    const x0 = 190
    const x1 = ctx.width - 190
    const y0 = 210
    const y1 = ctx.height - 130
    const stepX = cols > 1 ? (x1 - x0) / (cols - 1) : 0
    const stepY = rows > 1 ? (y1 - y0) / (rows - 1) : 0

    for (let i = 0; i < count; i++) {
      const cIdx = i % cols
      const rIdx = (i / cols) | 0
      const rainbow = i === rainbowIdx
      const color = PLAYFUL[i % PLAYFUL.length]
      const r = rainbow ? 80 : 52 + Math.random() * 26

      // Kristallform: spetsad oktaeder (vanligast) eller isokaeder-"ädelsten".
      const geom =
        Math.random() < 0.65 ? new T.THREE.OctahedronGeometry(r) : new T.THREE.IcosahedronGeometry(r * 0.85)
      geom.scale(1, 1.3, 1) // bakad spets — mesh.scale är fri för pop-tweens

      const mat = rainbow ? T.rainbowMat(layer, { speed: 0.3 }) : T.glitterMat(layer, color)
      const mesh = new T.THREE.Mesh(geom, mat)

      const jx = (Math.random() * 2 - 1) * stepX * 0.22
      const jy = (Math.random() * 2 - 1) * stepY * 0.22
      const dx = Math.max(x0, Math.min(x1, x0 + cIdx * stepX + (rIdx % 2) * stepX * 0.3 + jx))
      const dy = Math.max(y0, Math.min(y1, y0 + rIdx * stepY + jy))
      mesh.position.copy(layer.designToWorld(dx, dy, -90 + Math.random() * 150))
      layer.scene.add(mesh)

      gsap.from(mesh.scale, {
        x: 0.01,
        y: 0.01,
        z: 0.01,
        duration: 0.45,
        delay: i * 0.06,
        ease: 'back.out(2)',
      })

      this._crystals.push({
        mesh,
        color,
        rainbow,
        popped: false,
        baseY: mesh.position.y,
        phase: Math.random() * Math.PI * 2,
        bobSpeed: 0.6 + Math.random() * 0.8,
        spin: (0.25 + Math.random() * 0.4) * (Math.random() < 0.5 ? -1 : 1),
      })
      this._remaining++
    }

    if (announce && this._started) ctx.services.voice.say(this.voiceIntro)
  },

  // Per frame (via ThreeLayer): sväva/rotera + lugn idle-lockelse.
  _update(ctx, dt, t) {
    if (!this._alive) return
    for (const c of this._crystals) {
      if (c.popped) continue
      c.mesh.position.y = c.baseY + Math.sin(t * c.bobSpeed + c.phase) * 12
      c.mesh.rotation.y += c.spin * dt
    }
    this._idle += dt
    if (this._idle > 6 && this._remaining > 0 && !this._cleared) {
      this._idle = 0
      ctx.services.voice.say(this.voiceIntro)
      const live = this._crystals.filter((c) => !c.popped)
      if (live.length) {
        const c = live[(Math.random() * live.length) | 0]
        gsap.killTweensOf(c.mesh.scale)
        gsap.to(c.mesh.scale, { x: 1.18, y: 1.18, z: 1.18, duration: 0.4, yoyo: true, repeat: 3, ease: 'sine.inOut' })
      }
    }
  },

  // Tap i designkoordinater → raycast in i 3D-världen. Aldrig fel: miss är kul.
  _tap(ctx, x, y) {
    if (!this._alive || !this._layer) return
    this._idle = 0
    const live = this._crystals.filter((c) => !c.popped)
    const hits = this._layer.pick(x, y, live.map((c) => c.mesh), false)
    if (hits.length) {
      const c = live.find((k) => k.mesh === hits[0].object)
      if (c) this._pop(ctx, c)
      return
    }
    // Miss: mjukt ljud, liten gnista där man tryckte, närmaste kristall vickar.
    ctx.services.audio.sfx('soft')
    sparkle(this._fx, x, y, { count: 4 })
    let best = null
    let bestD = Infinity
    for (const c of live) {
      const d2 = this._layer.worldToDesign(c.mesh.position)
      const d = Math.hypot(d2.x - x, d2.y - y)
      if (d < bestD) {
        bestD = d
        best = c
      }
    }
    if (best) {
      gsap.killTweensOf(best.mesh.rotation, 'z')
      gsap.to(best.mesh.rotation, { z: 0.2, duration: 0.07, yoyo: true, repeat: 5, ease: 'sine.inOut', onComplete: () => (best.mesh.rotation.z = 0) })
    }
  },

  _pop(ctx, c, chained = false) {
    if (!this._alive || c.popped) return
    c.popped = true
    this._remaining--

    // Stigande kombo-ton vid snabba pop i rad (samma mönster som Klämbubblor).
    const now = performance.now()
    this._combo = now - this._lastPopAt < 1100 ? Math.min(this._combo + 1, 12) : 0
    this._lastPopAt = now

    const d = this._layer.worldToDesign(c.mesh.position)
    ctx.services.audio.sfx(c.rainbow ? 'reveal' : chained ? 'match' : 'pling')
    if (!c.rainbow) ctx.services.audio.tone({ freq: 440 * Math.pow(2, this._combo / 12), dur: 0.12, type: 'sine', vol: 0.14 })
    sparkle(this._fx, d.x, d.y, { count: c.rainbow ? 18 : 10 })
    burst(this._fx, d.x, d.y, { count: c.rainbow ? 16 : 10, colors: c.rainbow ? PLAYFUL : [c.color], power: c.rainbow ? 1.3 : 1 })
    if (c.rainbow) floatText(this._fx, d.x, d.y - 60, '🌈', { fontSize: 72 })

    gsap.killTweensOf(c.mesh.scale)
    gsap
      .timeline()
      .to(c.mesh.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 0.1, ease: 'power2.out' })
      .to(c.mesh.scale, {
        x: 0.01,
        y: 0.01,
        z: 0.01,
        duration: 0.24,
        ease: 'back.in(2)',
        onComplete: () => {
          if (!this._alive) return
          this._layer.scene.remove(c.mesh)
          c.mesh.geometry.dispose()
          c.mesh.material.dispose()
        },
      })

    // Regnbågskristallen kedjepoppar sina tre närmaste grannar.
    if (c.rainbow) {
      const near = this._crystals
        .filter((k) => !k.popped)
        .map((k) => ({ k, d: k.mesh.position.distanceTo(c.mesh.position) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
      near.forEach(({ k }, i) => {
        gsap.delayedCall(0.14 * (i + 1), () => {
          if (!this._alive || k.popped) return
          this._pop(ctx, k, true)
          this._checkClear(ctx)
        })
      })
    }
    this._checkClear(ctx)
  },

  _checkClear(ctx) {
    if (!this._alive || this._cleared || this._remaining > 0) return
    this._cleared = true
    const L = ctx.progress.get().highestLevel || 0
    ctx.progress.setLevel(L + 1)
    ctx.progress.complete() // delat firande: sfx + beröm + konfetti + stjärna + klistermärke
    gsap.delayedCall(1.5, () => {
      if (!this._alive) return
      this._build(ctx, true)
    })
  },

  destroy(ctx) {
    this._alive = false
    this._offUpdate?.()
    this._crystals?.forEach((c) => {
      gsap.killTweensOf(c.mesh.scale)
      gsap.killTweensOf(c.mesh.rotation)
    })
    this._layer?.destroy() // släpper GPU-minne, tar bort canvasen, återställer bgLayer
    this._layer = null
    this._crystals = null
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
    this._fx = null
  },
}
