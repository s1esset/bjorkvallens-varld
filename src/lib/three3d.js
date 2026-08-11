// 3D-stöd för spelmoduler (three.js). En ThreeLayer äger en egen transparent
// WebGL-canvas BAKOM Pixi-canvasen: 3D-världen blir spelets bakgrund/scen och
// Pixi ritar UI (hem/högtalare, firande, feedback) ovanpå som vanligt.
//
// VIKTIGT — ladda alltid den här modulen DYNAMISKT i spelets init:
//   const T = await import('../../lib/three3d.js')
// (registry.js importeras statiskt av skalet; en statisk three-import där skulle
// dra in hela three.js i huvudbundlen. Dynamisk import → egen chunk, precachas
// ändå offline av service workern.)
//
// Koordinater: med autoFrame (default) mappas designrymden 1280x720 1:1 på
// planet z=0 — origo i mitten, +x höger, +y UPP (spegelvänt mot Pixi-y).
// designToWorld/worldToDesign/pick översätter åt båda hållen, så all input kan
// (och ska) gå genom Pixi (pointertap på en helskärms-hityta + layer.pick).
//
// Mobilbudget: pixelRatio cappad (2), inga skuggor per default, en ljusrigg,
// låg poly (<50k trianglar), ingen postprocessing. Se .claude/skills/threejs-games.
import * as THREE from 'three'
import { DESIGN_W, DESIGN_H } from './theme.js'
import { shaderMat as _shaderMat } from './three-shaders.js'
import { ON as DIAG, logThree, flag } from './gamelog.js'

export { THREE }
export * from './three-shaders.js'

// En delad WebGLRenderer för hela appen (se konstruktorn för varför).
let _sharedRenderer = null

// Försök skapa renderaren, med OMTAGNINGAR över flera bildrutor. (ÅTGÄRDER V15)
//
// Bakgrunden är mätt, inte gissad. `npm run test glittergrottan` föll ~23 % av gångerna
// (6 av 26 ENSAMMA körningar) och konsolen bar två olika fel i följd:
//   1. `Could not create a WebGL context … ErrorMessage = BindToCurrentSequence failed`
//   2. `Web page caused context loss and was blocked`
// Det första är GPU-processen som inte hinner binda en kontext; det andra är Chromes egen
// spärr som slår till EFTER det första felet. `GL_VENDOR = Disabled` i samma rad säger att
// webbläsaren kör helt utan GPU (SwiftShader) — alltså är det svåraste läget, inte det
// normala, och spelet är svitens enda som behöver en ANDRA kontext (Pixi äger den första).
//
// Två saker uteslöts med mätning innan den här koden skrevs (`scripts/_kontextprobe.mjs`):
//   · ATTRIBUTEN är oskyldiga — 32 råa `getContext`-försök över fyra attributuppsättningar
//     (three's egna, utan antialias, default-power, helt nakna) föll **0 gånger**. three gör
//     dessutom själv ett attributfritt omförsök internt, och det faller med.
//   · Det är inte ett tak på antalet kontexter — bara EN duk finns på sidan när det smäller.
//
// KONTEXTEN HÄMTAS SJÄLV, three får den färdig. Det är inte en stilfråga utan mätt:
// three lyssnar på `webglcontextcreationerror` och gör `console.error` i lyssnaren INNAN
// konstruktorn hinner kasta, så en vägran skrev åtta konsolfel som harnessen räknade —
// spelet hade då reservläge och full bild, men testet var ändå rött. `getContext` utan
// lyssnare är tyst, och först när vi har en kontext byggs `WebGLRenderer({ canvas, context })`.
// Vägran blir därmed en VARNING med diagnos (`ingen-3d-kontext`) i stället för buller.
//
// OMTAGNINGARNA ÄR MÄTTA OCH HAR ALDRIG RÄDDAT NÅGOT: över 15 harness-körningar föll två,
// och båda gångerna misslyckades ALLA försöken (`renderare-omtagen` 0). Det stämmer med
// Chromes egen formulering — "was blocked" är en spärr för SIDAN, inte en transient. De
// ligger kvar för att de nu är gratis (tysta) och för att spärren kan bete sig annorlunda
// på en riktig GPU, men ingen ska tro att de är det som räddar bilden. Det gör reservläget.
//
// Returnerar renderaren, eller `null` när alla försök är slut — ALDRIG ett kastat fel.
// Att kasta här är just det som gav "Spelet kraschade vid start" och en tom skärm för ett
// barn; anroparen får i stället välja vad som ska hända.
export async function sakraRenderare(opts = {}, forsok = 3) {
  // DEV-only: `window.__tvingaIngen3D` låtsas att webbläsaren VÄGRAR, så reservvägen går
  // att KÖRA i stället för att bara finnas (samma skäl som harnessens `--tvinga-tom` — en
  // väg ingen har kört är en gissning till). Vägran simuleras nere i loopen, inte som en
  // tidig retur, så att omtagningarna, flaggan OCH tystnaden mot konsolen testas på riktigt.
  // Vite ersätter import.meta.env.DEV, så grenen faller bort i bygget.
  const tvingaVagran = DIAG && typeof window !== 'undefined' && !!window.__tvingaIngen3D
  if (!tvingaVagran && _sharedRenderer && !_sharedRenderer.getContext().isContextLost()) return _sharedRenderer
  const { antialias = true } = opts
  let sistaFel = null
  for (let i = 0; i < forsok; i++) {
    if (i > 0) {
      // Vänta en målad bildruta OCH en växande paus (0 · 120 · 360 · 800 ms). GPU-processen
      // behöver realtid, inte bara en ny bildruta, för att komma tillbaka.
      await new Promise((r) => requestAnimationFrame(() => r()))
      await new Promise((r) => setTimeout(r, [0, 120, 360, 800][Math.min(i, 3)]))
    }
    try {
      const attrs = { antialias, alpha: true, powerPreference: 'high-performance', stencil: false }
      const canvas = document.createElement('canvas')
      // Tyst: ingen `webglcontextcreationerror`-lyssnare finns på den här duken, så en
      // vägran ger `null` i stället för ett konsolfel. three faller själv tillbaka på
      // webgl1 innan den kastar — gör samma sak här.
      const context = tvingaVagran ? null : (canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs))
      if (!context) { sistaFel = new Error('getContext gav null (webbläsaren vägrade)'); continue }
      _sharedRenderer = new THREE.WebGLRenderer({ ...attrs, canvas, context })
      if (DIAG && i > 0) logThree('renderare-omtagen', { forsok: i + 1 })
      return _sharedRenderer
    } catch (err) {
      sistaFel = err
    }
  }
  // Reservläget får ALDRIG passera tyst. Det räddar bilden, alltså blir testet grönt —
  // och utan en flagga skulle "spelet gick aldrig igång i 3D" se ut som en ren körning.
  // Varning, inte fel: appen gör exakt rätt sak, men någon ska kunna se att det hände.
  if (DIAG) {
    logThree('renderare-foll', { forsok, fel: String(sistaFel?.message || sistaFel).slice(0, 160) })
    flag('ingen-3d-kontext', `webblasaren vagrade en WebGL-kontext efter ${forsok} forsok — spelet gick i reservlage`,
      { forsok, fel: String(sistaFel?.message || sistaFel).slice(0, 160) }, 'varning')
  }
  return null
}

export class ThreeLayer {
  /**
   * @param {Services} services  ctx.services från GameModule
   * @param {object} [opts]
   *   fov (50) · near (1) · far (6000) · antialias (true) · maxPixelRatio (2)
   *   autoFrame (true)  håll kameran så att 1280x720 vid z=0 fyller design-ytan
   *   shadows (false)   PCFSoft-skuggor (dyrt på mobil — använd sparsamt)
   *   clearColor (null) null = transparent (bakgrund via makeBackdrop/CSS)
   */
  constructor(services, opts = {}) {
    const {
      fov = 50,
      near = 1,
      far = 6000,
      antialias = true,
      maxPixelRatio = 2,
      autoFrame = true,
      shadows = false,
      clearColor = null,
    } = opts

    this.services = services
    this.autoFrame = autoFrame
    this._destroyed = false
    this.paused = false
    this._elapsed = 0
    this._animated = new Set() // material vars uTime/uResolution vi tickar
    this._updates = new Set() // per-frame-callbacks (dt, t)
    this._raycaster = new THREE.Raycaster()
    this._ndc = new THREE.Vector2()

    // WebGL-kontexter är en knapp resurs: gamla kontexter GC:as lat, och tredje
    // snabba återinträdet i ett 3D-spel fick "Failed to create WebGL2RenderingContext"
    // → "Spelet kraschade vid start" (uppmätt i scripts/_glitterprobe.mjs). Renderern
    // ÅTERBRUKAS därför mellan ThreeLayer-instanser — destroy() tömmer cacher och
    // kopplar loss canvasen men behåller kontexten vid liv.
    if (_sharedRenderer && !_sharedRenderer.getContext().isContextLost()) {
      this.renderer = _sharedRenderer
    } else {
      try {
        this.renderer = new THREE.WebGLRenderer({
          antialias,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
        })
        _sharedRenderer = this.renderer
      } catch (err) {
        // Chrome kan BLOCKERA nya kontexter efter en sid-attribuerad förlust.
        // Återbruka då den gamla renderern: input/pick fungerar (matriser tickas
        // explicit ovan) och three ritar igen när kontexten återställs — bättre
        // än "Spelet kraschade vid start".
        if (!_sharedRenderer) throw err
        this.renderer = _sharedRenderer
      }
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio))
    // Återställ ALLTID delade lägen (en tidigare instans kan ha ändrat dem).
    if (clearColor != null) this.renderer.setClearColor(clearColor, 1)
    else this.renderer.setClearColor(0x000000, 0)
    this.renderer.shadowMap.enabled = !!shadows
    if (shadows) this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far)
    this.camera.position.set(0, 0, 900)
    this.camera.lookAt(0, 0, 0)

    // Lägg 3D-canvasen bakom Pixi-canvasen (Pixi har backgroundAlpha:0).
    const canvas = this.renderer.domElement
    canvas.style.position = 'absolute'
    canvas.style.inset = '0'
    canvas.style.zIndex = '0'
    canvas.style.pointerEvents = 'none' // ALL input går via Pixi
    const pixiCanvas = services.app.canvas
    pixiCanvas.style.position = 'relative'
    pixiCanvas.style.zIndex = '1'
    pixiCanvas.parentElement.insertBefore(canvas, pixiCanvas)

    // Pixis bgLayer täcker annars hela skärmen — göm den medan 3D är aktivt.
    this._bgLayer = services.scaler.bgLayer
    this._bgWasVisible = this._bgLayer.visible
    this._bgLayer.visible = false

    this._unsubResize = services.scaler.onResize(() => this._layout())
    this._layout()

    this._tick = (ticker) => {
      if (this._destroyed || this.paused) return
      const dt = ticker.deltaMS / 1000
      this._elapsed += dt
      for (const m of this._animated) {
        if (m.uniforms?.uTime) m.uniforms.uTime.value = this._elapsed
      }
      for (const fn of this._updates) fn(dt, this._elapsed)
      // Matriser uppdateras EXPLICIT, inte bara via render(): tappas WebGL-
      // kontexten (flikbyte, GPU-reset) no-op:ar render(), och nya meshar fick
      // aldrig sin matrixWorld → pick() missade dem trots rätt position (uppmätt
      // i _glitterprobe: mwPos [0,0,0], pick 0 → 2 efter updateMatrixWorld).
      // Med detta förblir spelet spelbart tills kontexten återställs.
      this.scene.updateMatrixWorld()
      this.camera.updateMatrixWorld()
      this.renderer.render(this.scene, this.camera)
      if (DIAG && ++this._diagFrames % 60 === 0) this._diagSample()
    }
    services.app.ticker.add(this._tick)
    if (DIAG) {
      this._diagFrames = 0
      logThree('skapad', { fov, shadows, pixelRatio: this.renderer.getPixelRatio(), antialias })
    }
  }

  // renderer.info är three:s egen sanning om ritanrop, trianglar och GPU-minne.
  _diagSample() {
    const i = this.renderer.info
    logThree('prov', {
      ritanrop: i.render.calls,
      trianglar: i.render.triangles,
      geometrier: i.memory.geometries,
      texturer: i.memory.textures,
      program: i.programs?.length ?? 0,
      objekt: this.scene.children.length,
      animerade: this._animated.size,
    })
  }

  _layout() {
    if (this._destroyed) return
    const w = Math.max(1, window.innerWidth)
    const h = Math.max(1, window.innerHeight)
    this.renderer.setSize(w, h, false) // CSS-storlek styrs av styles.css (100%)
    this.camera.aspect = w / h
    if (this.autoFrame) {
      // Synlig höjd vid z=0 = fönsterhöjd i designenheter → 1 designpx == 1 världsenhet.
      const s = Math.min(w / DESIGN_W, h / DESIGN_H)
      const visibleH = h / s
      this.camera.position.z = visibleH / 2 / Math.tan((this.camera.fov * Math.PI) / 360)
    }
    this.camera.updateProjectionMatrix()
    const pr = this.renderer.getPixelRatio()
    for (const m of this._animated) {
      if (m.uniforms?.uResolution) m.uniforms.uResolution.value.set(w * pr, h * pr)
    }
  }

  /** Registrera ett material så uTime/uResolution tickas. Returnerar materialet. */
  animate(material) {
    this._animated.add(material)
    const pr = this.renderer.getPixelRatio()
    material.uniforms?.uResolution?.value.set(window.innerWidth * pr, window.innerHeight * pr)
    return material
  }

  /** Sluta ticka ett material (t.ex. inför dispose av ett enskilt objekt). */
  unanimate(material) {
    this._animated.delete(material)
    return material
  }

  /** Bekvämlighet: shaderMat + animate i ett. */
  shaderMat(opts) {
    // (import längst upp — three-shaders re-exporteras av denna modul)
    return this.animate(_shaderMat(opts))
  }

  /** Per-frame-callback (dt sek, t sek). Returnerar avregistrerings-funktion. */
  onUpdate(fn) {
    this._updates.add(fn)
    return () => this._updates.delete(fn)
  }

  /**
   * Designkoordinat (1280x720, Pixi-y neråt) → världspunkt som SYNS där.
   * z=0 (default) ger exakt 1:1; annat z kompenserar perspektivet (kräver
   * autoFrame-kameran: på +z-axeln, tittar mot origo).
   */
  designToWorld(dx, dy, z = 0) {
    const v = new THREE.Vector3(dx - DESIGN_W / 2, DESIGN_H / 2 - dy, z)
    if (z !== 0) {
      const k = (this.camera.position.z - z) / this.camera.position.z
      v.x *= k
      v.y *= k
    }
    return v
  }

  /** Världspunkt → designkoordinat (för Pixi-feedback ovanpå 3D-objekt). */
  worldToDesign(v) {
    const p = new THREE.Vector3(v.x, v.y, v.z).project(this.camera)
    const w = Math.max(1, window.innerWidth)
    const h = Math.max(1, window.innerHeight)
    const s = Math.min(w / DESIGN_W, h / DESIGN_H)
    const cssX = ((p.x + 1) / 2) * w
    const cssY = ((1 - p.y) / 2) * h
    return {
      x: (cssX - (w - DESIGN_W * s) / 2) / s,
      y: (cssY - (h - DESIGN_H * s) / 2) / s,
    }
  }

  /**
   * Raycast från en designkoordinat (t.ex. Pixi pointertap-position).
   * Returnerar three.js-intersektioner (närmast först).
   */
  pick(dx, dy, objects = this.scene.children, recursive = true) {
    const w = Math.max(1, window.innerWidth)
    const h = Math.max(1, window.innerHeight)
    const s = Math.min(w / DESIGN_W, h / DESIGN_H)
    const cssX = (w - DESIGN_W * s) / 2 + dx * s
    const cssY = (h - DESIGN_H * s) / 2 + dy * s
    this._ndc.set((cssX / w) * 2 - 1, -((cssY / h) * 2 - 1))
    this._raycaster.setFromCamera(this._ndc, this.camera)
    return this._raycaster.intersectObjects(objects, recursive)
  }

  /** Fullständig städning — anropa ALLTID i spelets destroy(). Exit-säker. */
  destroy() {
    if (this._destroyed) return
    if (DIAG) {
      const i = this.renderer.info
      logThree('riven', { rutor: this._diagFrames, geometrier: i.memory.geometries, texturer: i.memory.textures })
    }
    this._destroyed = true
    this.services.app.ticker.remove(this._tick)
    this._unsubResize?.()
    this._updates.clear()
    this._animated.clear()
    disposeObject(this.scene)
    this.scene.clear()
    // dispose() tömmer interna GPU-cacher (program, render-listor) men lämnar
    // kontexten användbar — renderern återbrukas av nästa ThreeLayer. Aldrig
    // forceContextLoss(): Chrome räknar sid-orsakade förluster och BLOCKERAR då
    // nya kontexter (uppmätt: andra inträdet kraschade med tom scen).
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this._bgLayer.visible = this._bgWasVisible
    const pixiCanvas = this.services.app.canvas
    pixiCanvas.style.position = ''
    pixiCanvas.style.zIndex = ''
  }
}

/** Släpp GPU-minne rekursivt: geometrier, material och deras texturer. */
export function disposeObject(root) {
  root.traverse((obj) => {
    obj.geometry?.dispose?.()
    const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : []
    for (const m of mats) {
      for (const v of Object.values(m)) {
        if (v?.isTexture) v.dispose()
      }
      if (m.uniforms) {
        for (const u of Object.values(m.uniforms)) {
          if (u?.value?.isTexture) u.value.dispose()
        }
      }
      m.dispose()
    }
  })
}

/**
 * Barnvänlig standardljusrigg: mjukt ambient + varm "sol". Räcker för
 * MeshToon/Lambert/Standard. Skuggor är AV per default (mobilbudget).
 */
export function addKidLighting(scene, { shadows = false } = {}) {
  const ambient = new THREE.AmbientLight(0xfff6e8, 1.1)
  const sun = new THREE.DirectionalLight(0xfff2d9, 2.4)
  sun.position.set(350, 550, 650)
  if (shadows) {
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
  }
  scene.add(ambient, sun)
  return { ambient, sun }
}

// Toon-gradienter (chunky tecknad skuggning) — cachas per stegantal.
const _gradients = new Map()
export function toonGradient(steps = 3) {
  let tex = _gradients.get(steps)
  if (tex) return tex
  const data = new Uint8Array(steps)
  for (let i = 0; i < steps; i++) data[i] = Math.round(80 + (175 * i) / Math.max(1, steps - 1))
  tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  _gradients.set(steps, tex)
  return tex
}

/** Tecknat toon-material i en färg — appens standardlook för 3D-objekt. */
export function toonMat(color, { steps = 3, ...opts } = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(steps), ...opts })
}
