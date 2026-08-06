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
import { ON as DIAG, logThree } from './gamelog.js'

export { THREE }
export * from './three-shaders.js'

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

    this.renderer = new THREE.WebGLRenderer({
      antialias,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio))
    if (clearColor != null) this.renderer.setClearColor(clearColor, 1)
    if (shadows) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }

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
    this.renderer.dispose()
    this.renderer.forceContextLoss?.()
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
