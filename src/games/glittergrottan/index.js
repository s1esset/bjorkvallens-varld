// Glittergrottan — ORDNINGSSPEL i 3D (2–5 år) och MALL för nya 3D-spel.
//
// Kärnloop: en rad små kristaller högst upp visar FACIT — i vilken ordning grottans
// kristaller ska tryckas. Barnet trycker dem i den ordningen; varje rätt kristall
// tänds, skickar sitt ljus till glimmerdjuret nere i vänstra hörnet och spelar nästa
// ton i en stigande pentatonisk skala. Sista kristallen → hela grottan lyser upp,
// djuret jublar och en ny runda börjar med EN NY ordningsregel (storlek, position,
// färg eller form). Ingen förlust: fel tryck ger ett mjukt ljud, kristallen vickar
// och rätt kristall blinkar tydligare. Motgång = glimmerdimma som lägger sig över en
// kristall (max 2 åt gången, löser upp sig själv, ett tryck sopar bort den).
//
// Visar hela three.js-mönstret: dynamisk import av lib/three3d.js, ThreeLayer bakom
// Pixi, egen backdrop-shader (uBoost = grottan tänds), glitter-material, pick() från
// en Pixi-hityta, worldToDesign() för Pixi-feedback ovanpå 3D-objekt, och exit-säker
// destroy (layer.destroy städar GPU:n).
import { Container, Graphics, Rectangle } from 'pixi.js'
import { gsap } from 'gsap'
import { sparkle, burst } from '../../lib/feedback.js'
import { shade, tint } from '../../lib/theme.js'
import { shuffle } from '../../lib/swedish.js'

// Regnbågsordning (används både som palett och som färgregelns facit).
const RAINBOW = [0xff6b6b, 0xff8a3d, 0xffd35c, 0x5bbf6a, 0x4aa3df, 0xa78bfa, 0xff9ec4]
const SHAPES = ['spets', 'klot', 'kub']

// Pentatonisk C-dur-skala: varje rätt tryck tar nästa steg → en klarad runda spelar
// en liten melodi som alltid låter fin (ingen ton kan krocka).
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66]

// Regelramp: en ny regel per nivå tills alla är introducerade, sedan slumpas de
// (aldrig samma två gånger i rad) → omgång 2 är aldrig omgång 1.
const RULES = ['storlek_upp', 'pos_hoger', 'farg', 'storlek_ner', 'pos_upp', 'form']

const RULE_LINES = {
  storlek_upp: 'Tryck på kristallerna från den minsta till den största!',
  storlek_ner: 'Tryck på kristallerna från den största till den minsta!',
  pos_hoger: 'Börja längst till vänster och gå åt höger!',
  pos_upp: 'Börja med kristallen längst ner och gå uppåt!',
  farg: 'Följ färgerna i raden högst upp, en färg i taget!',
}
const FORM_LINES = {
  klot: 'Tryck på alla runda klot först, sedan de spetsiga kristallerna!',
  spets: 'Tryck på alla spetsiga kristaller först, sedan alla runda klot!',
}
const MISS_LINE = 'Nästan! Kristallen som blinkar är nästa.'
const HELP_LINE = 'Titta, den här kristallen blinkar — tryck på den!'
const DONE_LINE = 'Titta, hela grottan lyser!'
const FOG_LINE = 'Oj, glimmerdimma! Tryck bort den.'

// Grottans himmel: stjärngnistor i taket + varm glöd nerifrån. uBoost tänder allt
// när en runda klaras (spelets egen finish — ingen generisk konfetti).
const CAVE_SKY = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform float uBoost;
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 col = mix(vec3(0.20, 0.13, 0.32), vec3(0.06, 0.06, 0.20), vUv.y);
  float glow = smoothstep(0.85, 0.0, vUv.y);
  col += glow * vec3(0.16, 0.09, 0.20) * (0.65 + 0.35 * sin(uTime * 0.5));
  vec2 grid = vUv * vec2(90.0, 50.0);
  vec2 cell = floor(grid);
  float h = hash21(cell);
  if (h > 0.955) {
    vec2 f = fract(grid) - 0.5;
    float star = 1.0 - smoothstep(0.0, 0.4, length(f));
    float tw = 0.55 + 0.45 * sin(uTime * (1.0 + h * 4.0) + h * 40.0);
    col += star * tw * (0.85 + uBoost * 1.6);
  }
  col += uBoost * vec3(0.34, 0.26, 0.46);
  gl_FragColor = vec4(col, 1.0);
}
`

// Spelplan (designkoordinater): facit-raden ligger ovanför, glimmerdjuret nere t.v.
// x0 håller avstånd till glimmerdjuret i hörnet så träffytorna aldrig krockar.
const FIELD = { x0: 312, x1: 1046, y0: 268, y1: 566 }
const FACIT_Y = 86
const PET = { x: 136, y: 620 }

export default {
  id: 'glittergrottan',
  titleSv: 'Glittergrottan',
  icon: '💎',
  category: 'roligt',
  input: 'tap',
  ageRange: [2, 5],
  bundle: 'glittergrottan',
  voiceIntro: 'Tryck på kristallerna i rätt ordning!',

  async init(ctx) {
    this._alive = true
    this._started = false
    this._idle = 0
    this._phase = 'idle'
    this._crystals = []
    this._clouds = []
    this._lit = []
    this._miss = 0
    this._level = 0
    this._fogTimer = 0
    this._fogSeen = false
    this._lastRule = null
    this._ruleLine = this.voiceIntro
    this._timers = []

    // three.js laddas DYNAMISKT → egen chunk, huvudbundlen förblir Pixi-ren.
    const T = await import('../../lib/three3d.js')
    if (!this._alive) return
    this._T = T

    const layer = new T.ThreeLayer(ctx.services)
    this._layer = layer
    this._backdrop = T.makeBackdrop(layer, CAVE_SKY, { uBoost: 0 })
    this._boost = this._backdrop.material.uniforms.uBoost
    T.addKidLighting(layer.scene)

    this._buildCave()
    this._buildPet()

    // Pixi ovanpå: helskärms-hityta (ALL input via Pixi) + fx-lager + facit-rad.
    this._root = new Container()
    ctx.stage.addChild(this._root)
    const hitPlane = new Container()
    hitPlane.eventMode = 'static'
    hitPlane.hitArea = new Rectangle(0, 0, ctx.width, ctx.height)
    hitPlane.on('pointertap', (e) => {
      const p = e.getLocalPosition(hitPlane)
      this._tap(ctx, p.x, p.y)
    })
    this._facit = new Container()
    this._facit.eventMode = 'none'
    this._facit.interactiveChildren = false
    this._fx = new Container()
    this._fx.eventMode = 'none'
    this._fx.interactiveChildren = false
    this._root.addChild(hitPlane, this._facit, this._fx)

    this._build(ctx)
    this._offUpdate = layer.onUpdate((dt, t) => this._update(ctx, dt, t))
  },

  mount(ctx) {
    this._started = true
    ctx.services.voice.say(this.voiceIntro)
    // Regeln talas strax efter introt (introt är kort med flit).
    this._later(2.8, () => {
      if (this._phase !== 'play') return
      ctx.services.voice.say(this._ruleLine)
    })
  },

  // Fördröjd callback som ALLTID dör med spelet. Modulen är en singleton: en
  // delayedCall från en tidigare omgång skulle annars vakna mitt i nästa och
  // bygga om rundan (sedd bugg: rundan nollställdes efter en snabb ut/in-cykel).
  _later(sec, fn) {
    const call = gsap.delayedCall(sec, () => {
      const i = this._timers.indexOf(call)
      if (i >= 0) this._timers.splice(i, 1)
      if (!this._alive) return
      fn()
    })
    this._timers.push(call)
    return call
  },

  // ---------------------------------------------------------------- grottan --

  _buildCave() {
    const T = this._T
    const layer = this._layer
    const decor = new T.THREE.Group()

    // Grottgolv (mörkt, så kristallerna lyser).
    const floor = new T.THREE.Mesh(new T.THREE.PlaneGeometry(2800, 760), T.gradientMat(layer, 0x4b3a86, 0x241a48))
    floor.position.copy(layer.designToWorld(640, 1040, -120))
    decor.add(floor)

    // Stalagmiter längs golvet (låg poly, mest i letterbox-zonen under spelplanen).
    const stoneMat = T.gradientMat(layer, 0x9c86e0, 0x4a3a86)
    for (let i = 0; i < 11; i++) {
      const h = 90 + Math.random() * 130
      const r = 44 + Math.random() * 38
      const cone = new T.THREE.Mesh(new T.THREE.ConeGeometry(r, h, 6), stoneMat)
      const dx = -120 + i * 155 + Math.random() * 50
      cone.position.copy(layer.designToWorld(dx, 748 - h / 2, -140 + Math.random() * 60))
      cone.rotation.y = Math.random() * Math.PI
      decor.add(cone)
    }

    // Djupa bakgrundskristaller i sidozonerna (syns i letterbox på plattor).
    for (let i = 0; i < 5; i++) {
      const geom = new T.THREE.OctahedronGeometry(60 + Math.random() * 40)
      geom.scale(1, 1.5, 1)
      const m = new T.THREE.Mesh(geom, T.glitterMat(layer, 0x3b2f6e, { density: 30, sparkle: 0.5 }))
      const dx = i < 3 ? -140 - i * 60 : 1420 + (i - 3) * 70
      m.position.copy(layer.designToWorld(dx, 300 + Math.random() * 340, -380))
      decor.add(m)
    }

    layer.scene.add(decor)
    this._decor = decor
  },

  // Glimmerdjuret: MOTTAGAREN. Tar emot varje kristalls ljus och jublar när rundan
  // är klar. Fristående figur byggd av primitiver (ingen ikon i en ruta).
  _buildPet() {
    const T = this._T
    const layer = this._layer
    const pet = new T.THREE.Group()

    pet.add(new T.THREE.Mesh(new T.THREE.IcosahedronGeometry(52, 1), T.toonMat(0x57c8c3)))
    const belly = new T.THREE.Mesh(new T.THREE.IcosahedronGeometry(34, 1), T.toonMat(0xcdf2ee))
    belly.position.set(0, -12, 30)
    belly.scale.set(1, 0.9, 0.5)
    pet.add(belly)

    const eyeGeom = new T.THREE.IcosahedronGeometry(14, 1)
    const eyeMat = new T.THREE.MeshBasicMaterial({ color: 0xfffdf7 })
    const pupilGeom = new T.THREE.IcosahedronGeometry(7, 0)
    const pupilMat = new T.THREE.MeshBasicMaterial({ color: 0x2a1f3d })
    for (const sx of [-1, 1]) {
      const eye = new T.THREE.Mesh(eyeGeom, eyeMat)
      eye.position.set(sx * 20, 14, 44)
      pet.add(eye)
      const pupil = new T.THREE.Mesh(pupilGeom, pupilMat)
      pupil.position.set(sx * 21, 13, 54)
      pet.add(pupil)
    }
    // Kristallhorn — den bor ju i en glittergrotta.
    for (const sx of [-1, 1]) {
      const horn = new T.THREE.Mesh(new T.THREE.ConeGeometry(11, 40, 5), T.glitterMat(layer, 0xffd35c, { density: 20 }))
      horn.position.set(sx * 24, 52, 4)
      horn.rotation.z = sx * -0.3
      pet.add(horn)
    }
    // Osynlig träffyta (>=96px) så djuret går att klappa.
    const hit = new T.THREE.Mesh(new T.THREE.IcosahedronGeometry(78, 0), new T.THREE.MeshBasicMaterial({ visible: false }))
    hit.position.set(0, 6, 0)
    pet.add(hit)

    pet.position.copy(layer.designToWorld(PET.x, PET.y, 120))
    this._petBaseY = pet.position.y
    layer.scene.add(pet)
    this._pet = pet
  },

  // --------------------------------------------------------------- rundan ----

  _build(ctx) {
    if (!this._alive) return

    this._clearClouds()
    this._removeHint()
    this._crystals.forEach((c) => this._disposeCrystal(c))
    this._crystals = []
    this._lit = []
    this._step = 0
    this._miss = 0
    this._idle = 0
    this._fogTimer = -7
    this._phase = 'play'

    const L = ctx.progress.get().highestLevel || 0
    this._level = L
    const n = Math.min(3 + Math.floor(L / 2), 6)
    let rule = L < RULES.length ? RULES[L] : null
    if (!rule) {
      const pool = RULES.filter((r) => r !== this._lastRule)
      rule = pool[(Math.random() * pool.length) | 0]
    }
    this._lastRule = rule
    this._rule = rule

    const items = this._planRound(rule, n)
    items.forEach((it, i) => {
      const c = this._makeCrystal(it)
      c.rank = it.rank
      this._crystals.push(c)
      gsap.from(c.mesh.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.45, delay: i * 0.07, ease: 'back.out(2)' })
    })

    this._ruleLine = rule === 'form' ? FORM_LINES[this._formFirst] : RULE_LINES[rule]
    this._buildFacit()
    if (this._started) ctx.services.voice.say(this._ruleLine)
  },

  // Bestäm färg/form/storlek/plats OCH rang (turordning) för rundans kristaller.
  // Lika rang = valfri ordning inom gruppen (det är så formregeln blir förlåtande).
  _planRound(rule, n) {
    const sizeRule = rule === 'storlek_upp' || rule === 'storlek_ner'
    const posRule = rule === 'pos_hoger' || rule === 'pos_upp'

    // --- färger: alltid unika, i regnbågsordning när färgregeln gäller ---
    let colors
    if (rule === 'farg') {
      const start = (Math.random() * (RAINBOW.length - n + 1)) | 0
      colors = RAINBOW.slice(start, start + n)
    } else {
      colors = shuffle(RAINBOW).slice(0, n)
    }

    // --- former ---
    const shapes = []
    if (rule === 'form') {
      const first = Math.random() < 0.5 ? 'klot' : 'spets'
      const second = first === 'klot' ? 'spets' : 'klot'
      this._formFirst = first
      const kFirst = Math.max(1, Math.min(n - 1, Math.round(n / 2)))
      for (let i = 0; i < n; i++) shapes.push(i < kFirst ? first : second)
    } else {
      for (let i = 0; i < n; i++) shapes.push(SHAPES[(Math.random() * SHAPES.length) | 0])
    }

    // --- storlekar: tydligt trappsteg när storleken är regeln ---
    const radii = []
    for (let i = 0; i < n; i++) {
      radii.push(sizeRule ? 38 + (i * 40) / Math.max(1, n - 1) : 52 + Math.random() * 20)
    }

    const items = []
    for (let i = 0; i < n; i++) items.push({ color: colors[i], shape: shapes[i], r: radii[i], dx: 0, dy: 0, rank: 0 })

    if (posRule) {
      // Platsen bestämmer turordningen; övriga egenskaper slumpas fritt.
      const slots = this._posLayout(rule, n)
      shuffle(items.map((_, i) => i)).forEach((idx, slotIdx) => {
        items[idx].dx = slots[slotIdx].x
        items[idx].dy = slots[slotIdx].y
        items[idx].rank = slotIdx
      })
    } else {
      // Storlek/färg/form bestämmer turordningen; platsen slumpas.
      const slots = shuffle(this._scatterSlots(n))
      items.forEach((it, i) => {
        it.dx = slots[i].x
        it.dy = slots[i].y
      })
      if (rule === 'storlek_upp') items.forEach((it, i) => (it.rank = i))
      else if (rule === 'storlek_ner') items.forEach((it, i) => (it.rank = n - 1 - i))
      else if (rule === 'farg') items.forEach((it, i) => (it.rank = i))
      else items.forEach((it) => (it.rank = it.shape === this._formFirst ? 0 : 1))
    }
    return shuffle(items)
  },

  // Utspridda platser (3x2-rutnät med jitter). Kolumnerna fylls i tur och ordning så
  // fältet aldrig blir tomt i ena halvan — mycket mer än 140px mellan mittpunkterna.
  _scatterSlots(n) {
    const xs = [FIELD.x0, (FIELD.x0 + FIELD.x1) / 2, FIELD.x1]
    const ys = [FIELD.y0, FIELD.y1]
    const cols = shuffle([0, 1, 2])
    const flip = Math.random() < 0.5 ? 0 : 1
    const slots = []
    for (let i = 0; i < n; i++) {
      const c = cols[i % 3]
      const r = (i + flip) % 2 // varannan rad → aldrig en helt tom halva
      slots.push({ x: xs[c] + (Math.random() * 2 - 1) * 34, y: ys[r] + (Math.random() * 2 - 1) * 24 })
    }
    return slots
  },

  // Positionsregler: tydliga sicksack-banor så riktningen går att läsa av.
  _posLayout(rule, n) {
    const slots = []
    if (rule === 'pos_hoger') {
      const step = (FIELD.x1 - FIELD.x0) / Math.max(1, n - 1)
      for (let i = 0; i < n; i++) {
        slots.push({ x: FIELD.x0 + i * step, y: (i % 2 ? FIELD.y1 : FIELD.y0) + (Math.random() * 2 - 1) * 20 })
      }
    } else {
      // Nerifrån och upp: tre x-banor så att träffytorna aldrig krockar (>=24px isär)
      // trots att kristallerna klättrar tätt i höjdled.
      const lanes = [352, 640, 928]
      const yTop = 216
      const yBot = 612
      const step = (yBot - yTop) / Math.max(1, n - 1)
      for (let i = 0; i < n; i++) {
        slots.push({ x: lanes[i % 3] + (Math.random() * 2 - 1) * 28, y: yBot - i * step })
      }
    }
    return slots
  },

  _makeCrystal(it) {
    const T = this._T
    const layer = this._layer
    const r = it.r
    let geom
    if (it.shape === 'klot') geom = new T.THREE.IcosahedronGeometry(r * 0.92, 1)
    else if (it.shape === 'kub') geom = new T.THREE.BoxGeometry(r * 1.35, r * 1.35, r * 1.35)
    else {
      geom = new T.THREE.OctahedronGeometry(r)
      geom.scale(1, 1.45, 1) // bakad spets — mesh.scale är fri för pop-tweens
    }
    const mat = T.glitterMat(layer, it.color, { density: 44, sparkle: 0.8 })
    const mesh = new T.THREE.Mesh(geom, mat)

    // Osynlig träffyta: >=96px diameter + halo även för de minsta kristallerna.
    const hitR = Math.max(r * 1.4, 62) * 1.18
    const hit = new T.THREE.Mesh(new T.THREE.IcosahedronGeometry(hitR, 0), new T.THREE.MeshBasicMaterial({ visible: false }))
    mesh.add(hit)

    const z = -60 + Math.random() * 120
    mesh.position.copy(layer.designToWorld(it.dx, it.dy, z))
    if (it.shape === 'kub') mesh.rotation.set(0.4, 0.5, 0.2)
    layer.scene.add(mesh)

    return {
      mesh,
      mat,
      color: it.color,
      shape: it.shape,
      r,
      dx: it.dx,
      dy: it.dy,
      z,
      lit: false,
      fogged: null,
      halo: null,
      mini: null,
      baseY: mesh.position.y,
      phase: Math.random() * Math.PI * 2,
      bobSpeed: 0.55 + Math.random() * 0.6,
      spin: (0.2 + Math.random() * 0.3) * (Math.random() < 0.5 ? -1 : 1),
    }
  },

  _disposeCrystal(c) {
    gsap.killTweensOf(c.mesh.scale)
    gsap.killTweensOf(c.mesh.rotation)
    gsap.killTweensOf(c.mesh.position)
    if (c.halo && !c.halo.destroyed) c.halo.destroy()
    c.halo = null
    c.mini = null
    // Sluta ticka uTime på ett material som inte finns kvar (ThreeLayer saknar
    // ett publikt "unanimate" — se docs/games/glittergrottan.md §5).
    this._layer?._animated?.delete(c.mat)
    this._layer?.scene.remove(c.mesh)
    c.mesh.traverse((o) => {
      o.geometry?.dispose?.()
      o.material?.dispose?.()
    })
  },

  // ------------------------------------------------------------ facit-raden --

  // Rundans lösning ritad som riktiga minikristaller (egen silhuett, aldrig en ikon
  // i en ruta) med pilar emellan: ordningen syns UTAN att man kan läsa.
  _buildFacit() {
    this._facit.removeChildren().forEach((ch) => ch.destroy({ children: true }))
    const order = this._crystals.slice().sort((a, b) => a.rank - b.rank)
    const pitch = 96
    const x0 = 640 - ((order.length - 1) * pitch) / 2
    order.forEach((c, i) => {
      const x = x0 + i * pitch
      if (i > 0) this._facit.addChild(makeChevron(x - pitch / 2, FACIT_Y))
      const mini = new Container()
      mini.position.set(x, FACIT_Y)
      const glow = new Graphics().circle(0, 0, 38).fill({ color: 0x1a1440, alpha: 0.55 })
      const body = new Graphics()
      drawMini(body, c.shape, c.color, 14 + ((c.r - 38) / 40) * 16)
      const ring = new Graphics()
      ring.visible = false
      mini.addChild(glow, body, ring)
      this._facit.addChild(mini)
      c.mini = mini
      c.miniRing = ring
    })
    this._pulseFacit()
  },

  // Markera vilken/vilka minikristaller som står på tur (lugn andning).
  _pulseFacit() {
    if (!this._alive) return
    this._crystals.forEach((c) => {
      if (!c.mini || c.mini.destroyed || c.lit) return
      gsap.killTweensOf(c.mini.scale)
      c.mini.scale.set(1)
    })
    this._nextTargets().forEach((c) => {
      if (!c.mini || c.mini.destroyed) return
      gsap.to(c.mini.scale, { x: 1.18, y: 1.18, duration: 0.62, yoyo: true, repeat: -1, ease: 'sine.inOut' })
    })
  },

  _markFacitDone(c) {
    if (!c.mini || c.mini.destroyed) return
    gsap.killTweensOf(c.mini.scale)
    c.miniRing.clear().circle(0, 0, 34).stroke({ width: 5, color: 0xfff3b0, alpha: 0.95 })
    c.miniRing.visible = true
    gsap.fromTo(c.mini.scale, { x: 1.45, y: 1.45 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(2.4)' })
  },

  // ------------------------------------------------------------------ input --

  _nextTargets() {
    const live = this._crystals.filter((c) => !c.lit)
    if (!live.length) return []
    const min = Math.min(...live.map((c) => c.rank))
    return live.filter((c) => c.rank === min)
  },

  _tap(ctx, x, y) {
    if (!this._alive || !this._layer) return
    this._idle = 0
    if (this._phase !== 'play') {
      sparkle(this._fx, x, y, { count: 4 })
      return
    }

    // 1) Glimmerdimman ligger främst — ett tryck sopar bort den.
    const cloudMeshes = this._clouds.filter((f) => f.group).map((f) => f.group)
    if (cloudMeshes.length) {
      const hit = this._layer.pick(x, y, cloudMeshes, true)
      if (hit.length) {
        let o = hit[0].object
        while (o && !cloudMeshes.includes(o)) o = o.parent
        const f = this._clouds.find((k) => k.group === o)
        if (f) {
          ctx.services.audio.sfx('pop')
          ctx.services.audio.tone({ freq: 660, dur: 0.14, type: 'sine', vol: 0.12, slideTo: 990 })
          this._popCloud(f)
          return
        }
      }
    }

    // 2) Kristallerna.
    const live = this._crystals.filter((c) => !c.lit)
    const found = this._layer.pick(x, y, live.map((c) => c.mesh), true)
    if (found.length) {
      let o = found[0].object
      while (o && !live.some((c) => c.mesh === o)) o = o.parent
      const c = live.find((k) => k.mesh === o)
      if (c) {
        if (this._nextTargets().includes(c)) this._correct(ctx, c)
        else this._nudge(ctx, c)
        return
      }
    }

    // 3) Glimmerdjuret vill bli klappat.
    if (this._pet && this._layer.pick(x, y, [this._pet], true).length) {
      ctx.services.audio.tone({ freq: 392, dur: 0.14, type: 'triangle', vol: 0.14, slideTo: 587 })
      this._petHop(1.22)
      const d = this._layer.worldToDesign(this._pet.position)
      sparkle(this._fx, d.x, d.y - 40, { count: 6 })
      return
    }

    // 4) Tomt: mjukt ljud + gnista, och nästa kristall blinkar hjälpsamt.
    ctx.services.audio.sfx('soft')
    sparkle(this._fx, x, y, { count: 4 })
    this._flashTargets(0.9)
  },

  // Rätt kristall: tänds, skickar ljuset till glimmerdjuret, nästa ton i skalan.
  _correct(ctx, c) {
    c.lit = true
    const step = this._step++
    this._miss = 0
    this._removeHint()
    if (c.fogged) this._popCloud(c.fogged, true)
    this._lit.push(c)

    const d = this._layer.worldToDesign(c.mesh.position)
    const freq = PENTA[Math.min(step, PENTA.length - 1)]
    ctx.services.audio.tone({ freq, dur: 0.3, type: 'sine', vol: 0.18 })
    ctx.services.audio.tone({ freq: freq * 2, dur: 0.2, type: 'triangle', vol: 0.06, delay: 0.05 })

    c.mat.uniforms.uSparkle.value = 2.1
    c.mat.uniforms.uColor.value.lerp(new this._T.THREE.Color(0xffffff), 0.4)
    sparkle(this._fx, d.x, d.y, { count: 12 })
    burst(this._fx, d.x, d.y, { count: 10, colors: [c.color, 0xfff3b0], power: 0.9 })

    gsap.killTweensOf(c.mesh.scale)
    gsap
      .timeline()
      .to(c.mesh.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 0.12, ease: 'power2.out' })
      .to(c.mesh.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.3, ease: 'back.out(2)' })
    c.spin *= 2.4
    c.baseY += 22
    c.halo = new Graphics().circle(0, 0, c.r * 1.18).stroke({ width: 7, color: 0xfff3b0, alpha: 0.7 })
    c.halo.eventMode = 'none'
    this._fx.addChild(c.halo)

    this._markFacitDone(c)
    this._sendLight(ctx, d.x, d.y, c.color)
    this._pulseFacit()

    if (!this._crystals.some((k) => !k.lit)) this._finish(ctx)
  },

  // Ljusklot som flyger till mottagaren. Exit-säkert (tweenar ett vanligt objekt).
  _sendLight(ctx, x, y, color) {
    const orb = new Graphics().circle(0, 0, 26).fill({ color, alpha: 0.35 }).circle(0, 0, 14).fill({ color: 0xfff3b0, alpha: 0.95 })
    orb.position.set(x, y)
    orb.eventMode = 'none'
    this._fx.addChild(orb)
    const st = { x, y, s: 1 }
    const tw = gsap.to(st, {
      x: PET.x + 10,
      y: PET.y - 30,
      s: 0.5,
      duration: 0.62,
      ease: 'power2.in',
      onUpdate: () => {
        if (orb.destroyed) {
          tw.kill()
          return
        }
        orb.position.set(st.x, st.y)
        orb.scale.set(st.s)
      },
      onComplete: () => {
        if (!orb.destroyed) orb.destroy()
        if (!this._alive) return
        this._petHop(1.3)
        ctx.services.audio.tone({ freq: 880, dur: 0.1, type: 'triangle', vol: 0.08 })
        sparkle(this._fx, PET.x + 10, PET.y - 40, { count: 7 })
      },
    })
  },

  _petHop(scale = 1.2) {
    if (!this._pet) return
    gsap.killTweensOf(this._pet.scale)
    gsap.killTweensOf(this._pet.position)
    gsap
      .timeline()
      .to(this._pet.scale, { x: scale, y: scale * 0.86, z: scale, duration: 0.1, ease: 'power2.out' })
      .to(this._pet.scale, { x: 1, y: 1, z: 1, duration: 0.34, ease: 'back.out(2.6)' })
    gsap
      .timeline()
      .to(this._pet.position, { y: this._petBaseY + 34, duration: 0.16, ease: 'power2.out' })
      .to(this._pet.position, { y: this._petBaseY, duration: 0.3, ease: 'bounce.out' })
  },

  // Fel kristall: ALDRIG en bestraffning. Den vickar glatt och rätt kristall blinkar
  // tydligare; efter två försök kommer en tydlig ring som pekar ut nästa.
  _nudge(ctx, c) {
    ctx.services.audio.sfx('soft')
    const d = this._layer.worldToDesign(c.mesh.position)
    sparkle(this._fx, d.x, d.y, { count: 5 })
    gsap.killTweensOf(c.mesh.rotation)
    gsap.to(c.mesh.rotation, {
      z: 0.24,
      duration: 0.07,
      yoyo: true,
      repeat: 5,
      ease: 'sine.inOut',
      onComplete: () => {
        c.mesh.rotation.z = 0
      },
    })
    this._miss++
    this._flashTargets(this._miss >= 2 ? 1.5 : 1.1)
    if (this._miss === 1) ctx.services.voice.say(MISS_LINE)
    if (this._miss >= 2) {
      this._showHint()
      ctx.services.voice.say(HELP_LINE)
    }
  },

  _flashTargets(strength) {
    const s = 1 + 0.14 * strength
    this._nextTargets().forEach((t) => {
      gsap.killTweensOf(t.mesh.scale)
      gsap.to(t.mesh.scale, {
        x: s,
        y: s,
        z: s,
        duration: 0.34,
        yoyo: true,
        repeat: strength >= 1.5 ? 5 : 3,
        ease: 'sine.inOut',
        onComplete: () => {
          if (!t.lit) t.mesh.scale.set(1, 1, 1)
        },
      })
    })
  },

  // Tydlig visuell hjälp: en pulserande ring runt nästa kristall (ritas i _update).
  _showHint() {
    if (this._hint || !this._fx) return
    this._hint = new Graphics()
    this._hint.eventMode = 'none'
    this._fx.addChild(this._hint)
  },

  _removeHint() {
    if (this._hint && !this._hint.destroyed) this._hint.destroy()
    this._hint = null
  },

  // ---------------------------------------------------------- glimmerdimman --

  // MOTGÅNG: en liten dimma lägger sig över en kristall och dämpar den. Den löser
  // upp sig själv efter ~9s och ETT tryck sopar bort den — den kan alltså som mest
  // sakta ner leken. Tak: max 2 samtidigt, aldrig över en redan tänd kristall.
  _spawnCloud(ctx) {
    const T = this._T
    const layer = this._layer
    const free = this._crystals.filter((c) => !c.lit && !c.fogged)
    if (free.length < 2 || this._clouds.length >= 2) return
    const target = free[(Math.random() * free.length) | 0]

    const group = new T.THREE.Group()
    const mat = new T.THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.5, depthWrite: false })
    for (let i = 0; i < 3; i++) {
      const puff = new T.THREE.Mesh(new T.THREE.IcosahedronGeometry(42 + Math.random() * 22, 1), mat)
      puff.position.set((i - 1) * 34, (Math.random() * 2 - 1) * 14, (Math.random() * 2 - 1) * 10)
      group.add(puff)
    }
    group.position.copy(layer.designToWorld(target.dx, target.dy, target.z + 150))
    group.scale.set(0.01, 0.01, 0.01)
    layer.scene.add(group)
    gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.6)' })

    target.mat.uniforms.uSparkle.value = 0.12
    const cloud = { group, mat, target, life: 0, popping: false, phase: Math.random() * 6 }
    target.fogged = cloud
    this._clouds.push(cloud)
    if (!this._fogSeen) {
      this._fogSeen = true
      ctx.services.voice.say(FOG_LINE)
    }
  },

  _popCloud(cloud, silent = false) {
    if (!cloud || !cloud.group || cloud.popping) return
    cloud.popping = true
    const i = this._clouds.indexOf(cloud)
    if (i >= 0) this._clouds.splice(i, 1)
    if (cloud.target) {
      if (!cloud.target.lit) cloud.target.mat.uniforms.uSparkle.value = 0.8
      cloud.target.fogged = null
    }
    if (!silent && this._fx && this._layer) {
      const d = this._layer.worldToDesign(cloud.group.position)
      sparkle(this._fx, d.x, d.y, { count: 8 })
    }
    gsap.killTweensOf(cloud.group.scale)
    gsap.to(cloud.group.scale, {
      x: 1.6,
      y: 1.6,
      z: 1.6,
      duration: 0.28,
      ease: 'power2.out',
      onComplete: () => this._disposeCloud(cloud),
    })
    gsap.to(cloud.mat, { opacity: 0, duration: 0.28 })
  },

  _disposeCloud(cloud) {
    if (!cloud.group) return
    this._layer?.scene.remove(cloud.group)
    cloud.group.traverse((o) => o.geometry?.dispose?.())
    cloud.mat?.dispose?.()
    cloud.group = null
  },

  _clearClouds() {
    this._clouds.forEach((f) => {
      gsap.killTweensOf(f.group?.scale)
      gsap.killTweensOf(f.mat)
      if (f.target) f.target.fogged = null
      this._disposeCloud(f)
    })
    this._clouds = []
  },

  // ----------------------------------------------------------------- finish --

  // Spel-specifik finish: kristallerna tänds i tur och ordning (melodin spelas om),
  // grottan lyser upp och glimmerdjuret jublar.
  _finish(ctx) {
    if (this._phase !== 'play') return
    this._phase = 'finish'
    this._clearClouds()
    this._removeHint()
    ctx.services.voice.say(DONE_LINE)

    const n = this._lit.length
    this._lit.forEach((c, i) => {
      this._later(0.18 * i, () => {
        if (!this._layer || !c.mesh.parent) return
        const d = this._layer.worldToDesign(c.mesh.position)
        ctx.services.audio.tone({ freq: PENTA[Math.min(i, PENTA.length - 1)], dur: 0.34, type: 'sine', vol: 0.2 })
        sparkle(this._fx, d.x, d.y, { count: 14 })
        burst(this._fx, d.x, d.y, { count: 12, colors: [c.color, 0xfff3b0], power: 1.1 })
        c.mat.uniforms.uSparkle.value = 2.6
        gsap.killTweensOf(c.mesh.scale)
        gsap.to(c.mesh.scale, { x: 1.45, y: 1.45, z: 1.45, duration: 0.22, yoyo: true, repeat: 1, ease: 'sine.out' })
      })
    })

    // Grottan tänds och tonar lugnt tillbaka.
    this._boostTween = gsap.to(this._boost, {
      value: 0.9,
      duration: 0.18 * n + 0.5,
      ease: 'sine.inOut',
      onComplete: () => {
        this._boostTween = gsap.to(this._boost, { value: 0, duration: 1.4, ease: 'sine.inOut' })
      },
    })

    this._later(0.18 * n + 0.35, () => {
      this._petHop(1.5)
      ctx.services.audio.sfx('reveal')
      sparkle(this._fx, PET.x + 10, PET.y - 50, { count: 16 })
      burst(this._fx, PET.x + 20, PET.y - 40, { count: 14, power: 1.2 })
    })

    this._later(0.18 * n + 0.8, () => {
      ctx.progress.setLevel((ctx.progress.get().highestLevel || 0) + 1)
      ctx.progress.complete()
    })

    this._later(0.18 * n + 3.0, () => this._build(ctx))
  },

  // ------------------------------------------------------------- per frame ---

  _update(ctx, dt, t) {
    if (!this._alive || !this._layer) return

    for (const c of this._crystals) {
      if (!c.mesh.parent) continue
      c.mesh.position.y = c.baseY + Math.sin(t * c.bobSpeed + c.phase) * (c.lit ? 6 : 12)
      c.mesh.rotation.y += c.spin * dt
      if (c.halo && !c.halo.destroyed) {
        const d = this._layer.worldToDesign(c.mesh.position)
        c.halo.position.set(d.x, d.y)
        c.halo.alpha = 0.35 + 0.2 * Math.sin(t * 2.2 + c.phase)
      }
    }

    // Glimmerdimman driver långsamt och löser upp sig själv.
    for (const f of this._clouds.slice()) {
      if (!f.group) continue
      f.life += dt
      f.group.position.x += Math.sin(t * 0.6 + f.phase) * 14 * dt
      f.group.position.y += Math.cos(t * 0.5 + f.phase) * 10 * dt
      f.group.rotation.z += 0.12 * dt
      if (f.life > 9) this._popCloud(f)
    }
    if (this._phase === 'play' && this._level >= 2) {
      this._fogTimer += dt
      if (this._fogTimer > 10) {
        this._fogTimer = -2 - Math.random() * 3
        this._spawnCloud(ctx)
      }
    }

    // Hjälp-ringen följer nästa kristall.
    if (this._hint && !this._hint.destroyed) {
      const target = this._nextTargets()[0]
      if (target && target.mesh.parent) {
        const d = this._layer.worldToDesign(target.mesh.position)
        const r = target.r * (1.35 + 0.12 * Math.sin(t * 4))
        this._hint.clear().circle(0, 0, r).stroke({ width: 7, color: 0xfff3b0, alpha: 0.8 })
        this._hint.position.set(d.x, d.y)
      } else {
        this._removeHint()
      }
    }

    // Glimmerdjuret andas.
    if (this._pet && !gsap.isTweening(this._pet.position)) {
      this._pet.position.y = this._petBaseY + Math.sin(t * 1.4) * 5
      this._pet.rotation.z = Math.sin(t * 0.9) * 0.05
    }

    // Mjuk om-cue vid inaktivitet — aldrig tjat, aldrig tidspress.
    this._idle += dt
    if (this._idle > 7 && this._phase === 'play') {
      this._idle = 0
      ctx.services.voice.say(this._ruleLine)
      this._flashTargets(1.3)
    }
  },

  destroy(ctx) {
    this._alive = false
    this._offUpdate?.()
    this._timers?.forEach((t) => t.kill())
    this._timers = []
    gsap.killTweensOf(this._boost)
    this._boostTween?.kill()
    this._crystals?.forEach((c) => {
      gsap.killTweensOf(c.mesh.scale)
      gsap.killTweensOf(c.mesh.rotation)
      gsap.killTweensOf(c.mesh.position)
      if (c.mini) gsap.killTweensOf(c.mini.scale)
    })
    this._clouds?.forEach((f) => {
      gsap.killTweensOf(f.group?.scale)
      gsap.killTweensOf(f.mat)
    })
    if (this._pet) {
      gsap.killTweensOf(this._pet.scale)
      gsap.killTweensOf(this._pet.position)
    }
    this._clouds = []
    this._crystals = null
    this._lit = null
    this._pet = null
    this._layer?.destroy() // släpper GPU-minne, tar bort canvasen, återställer bgLayer
    this._layer = null
    ctx?.services?.voice?.cancel()
    this._root?.destroy({ children: true })
    this._root = null
    this._fx = null
    this._facit = null
    this._hint = null
  },
}

// --- ritade minikristaller (fristående föremål, aldrig en ikon i en ruta) ------

function drawMini(g, shape, color, s) {
  const dark = shade(color, 0.45)
  if (shape === 'klot') {
    g.circle(0, 0, s).fill(color).stroke({ width: 3, color: dark })
    g.circle(s * 0.26, s * 0.3, s * 0.55).fill({ color: dark, alpha: 0.28 })
    g.circle(-s * 0.32, -s * 0.34, s * 0.26).fill({ color: 0xffffff, alpha: 0.8 })
  } else if (shape === 'kub') {
    const top = [0, -s, s * 0.9, -s * 0.5, 0, 0, -s * 0.9, -s * 0.5]
    g.poly(top).fill(tint(color, 0.3))
    g.poly([0, 0, s * 0.9, -s * 0.5, s * 0.9, s * 0.45, 0, s]).fill(color)
    g.poly([0, 0, -s * 0.9, -s * 0.5, -s * 0.9, s * 0.45, 0, s]).fill(shade(color, 0.3))
    g.poly([0, -s, s * 0.9, -s * 0.5, s * 0.9, s * 0.45, 0, s, -s * 0.9, s * 0.45, -s * 0.9, -s * 0.5]).stroke({
      width: 3,
      color: dark,
    })
  } else {
    const gem = [0, -s * 1.15, s * 0.7, -s * 0.2, s * 0.4, s * 1.05, -s * 0.4, s * 1.05, -s * 0.7, -s * 0.2]
    g.poly(gem).fill(color)
    g.poly([0, -s * 1.15, -s * 0.7, -s * 0.2, -s * 0.4, s * 1.05]).fill({ color: 0xffffff, alpha: 0.24 })
    g.poly([0, -s * 1.15, s * 0.7, -s * 0.2, s * 0.4, s * 1.05]).fill({ color: dark, alpha: 0.22 })
    g.poly(gem).stroke({ width: 3, color: dark })
  }
}

function makeChevron(x, y) {
  const g = new Graphics()
  g.poly([-8, -12, 8, 0, -8, 12], false).stroke({ width: 5, color: 0xd7e3ff, alpha: 0.65 })
  g.position.set(x, y)
  g.eventMode = 'none'
  return g
}
