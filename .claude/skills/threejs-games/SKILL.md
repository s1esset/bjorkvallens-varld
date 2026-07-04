---
name: threejs-games
description: Use when building or changing 3D games in this repo (three.js). Covers ThreeLayer (3D-canvas bakom Pixi), design-koordinat-mappning (designToWorld/worldToDesign/pick), input via Pixi-hityta, GameModule-livscykel + exit-säker destroy, mobilbudget, toonMat/addKidLighting. Triggers on - three.js, three, 3D, ThreeLayer, WebGLRenderer, PerspectiveCamera, mesh, geometry, raycast, pick, toon, GLTF, three3d.
---

# 3D-spel med three.js i Björkvallens Värld

Allt 3D-stöd bor i `src/lib/three3d.js` (som re-exporterar `src/lib/three-shaders.js`).
Mallspel/facit: **`src/games/glittergrottan/index.js`** — kopiera det för nya 3D-spel.
För shaders (backdrops, glitter/regnbågs-material, egna ShaderMaterial): se skill **threejs-shaders**.

## Arkitektur (läs detta först)

- `ThreeLayer` skapar en **egen transparent WebGL-canvas BAKOM Pixi-canvasen** (Pixi kör
  `backgroundAlpha: 0`). 3D-världen blir spelets scen; Pixi ritar UI, hem/högtalar-knappar,
  konfetti och all `lib/feedback.js`-juice **ovanpå** som vanligt.
- Pixis heltäckande `bgLayer` göms medan lagret lever och återställs i `layer.destroy()`.
- 3D-canvasen har `pointer-events: none` — **ALL input går via Pixi** (P0-reglerna om
  träffytor/gester gäller oförändrat).
- Ett spel = fortfarande en vanlig GameModule. Skalet vet inget om three.js.

## Obligatoriskt mönster: dynamisk import

`registry.js` importeras statiskt av skalet. En statisk three-import i ett spel drar in hela
three.js (~170 kB gzip) i huvudbundlen. Ladda därför ALLTID dynamiskt i `init`:

```js
async init(ctx) {
  this._alive = true
  const T = await import('../../lib/three3d.js') // egen chunk, precachas offline ändå
  if (!this._alive) return                        // spelaren kan ha hunnit lämna
  this._T = T
  const layer = new T.ThreeLayer(ctx.services)
  this._layer = layer
  T.makeBackdrop(layer, 'night')                  // se threejs-shaders
  T.addKidLighting(layer.scene)                   // behövs för toonMat/Lambert/Standard
  // ... bygg meshar, positionera med layer.designToWorld(x, y, z)
  this._offUpdate = layer.onUpdate((dt, t) => { /* per frame; dt/t i sekunder */ })
}
```

## ThreeLayer-API (src/lib/three3d.js)

```js
new ThreeLayer(ctx.services, {
  fov: 50, near: 1, far: 6000,
  antialias: true,
  maxPixelRatio: 2,     // sänk till 1.5 för tunga scener
  autoFrame: true,      // håll designrymden 1280x720 1:1 på planet z=0
  shadows: false,       // PCFSoft; slå bara på i enkla scener
  clearColor: null,     // null = transparent; annars hex (utan backdrop)
})
layer.scene / layer.camera / layer.renderer   // vanliga three.js-objekt
layer.designToWorld(dx, dy, z = 0)  // designpx (Pixi-y NERÅT) -> Vector3 som SYNS där
layer.worldToDesign(v3)             // -> {x, y} designpx (för Pixi-feedback på 3D-objekt)
layer.pick(dx, dy, objects?, recursive?)  // raycast från designkoordinat -> intersektioner
layer.onUpdate(fn)                  // per frame (dt, t); returnerar av-funktion
layer.animate(mat)                  // ticka uTime/uResolution på ett ShaderMaterial
layer.paused = true                 // pausa render + updates
layer.destroy()                     // MÅSTE anropas i spelets destroy()
// Hjälpare: addKidLighting(scene, {shadows}), toonMat(color, {steps}), toonGradient(steps),
//           disposeObject(root), THREE (re-export), samt allt i three-shaders.js
```

**Koordinater med autoFrame:** designrymden mappas 1:1 på planet `z = 0` — origo i mitten,
+x höger, **+y UPP** (spegelvänt mot Pixi). 1 designpx = 1 världsenhet. `designToWorld` med
`z != 0` perspektiv-kompenserar så punkten *syns* på rätt designposition (förutsätter
default-kameran på +z-axeln). Positivt z = närmare kameran. Vid resize flyttas kameran så
mappningen håller; världen utanför 1280x720 syns i det som annars vore letterbox — placera
gärna dekor där (det ser flott ut), men aldrig något spelviktigt.

## Input: alltid via Pixi

```js
const hitPlane = new Container()
hitPlane.eventMode = 'static'
hitPlane.hitArea = new Rectangle(0, 0, ctx.width, ctx.height)
hitPlane.on('pointertap', (e) => {
  const p = e.getLocalPosition(hitPlane)          // = designkoordinater
  const hits = layer.pick(p.x, p.y, pickableMeshes, false)
  if (hits.length) { /* träff: hits[0].object */ }
  else { /* miss är KUL: mjukt ljud + vick — aldrig fel */ }
})
ctx.stage.addChild(hitPlane)
```

Träffyte-regeln (≥96px + halo) i 3D: gör meshen stor nog på skärmen, eller picka mot en
osynlig större "hit-mesh" (`new Mesh(SphereGeometry(r*1.3), invisibleMat)` som barn till objektet,
`material.visible = false`) och picka `recursive: true`.

## Feedback: Pixi ovanpå 3D

Använd `lib/feedback.js` (sparkle/burst/floatText/…) på en egen fx-Container i `ctx.stage`,
positionerad med `layer.worldToDesign(mesh.position)`. Belöningar, röst och firande är
oförändrade (`ctx.progress.complete()`).

## Destroy-checklista (exit-säkert)

```js
destroy(ctx) {
  this._alive = false
  this._offUpdate?.()                 // onUpdate-callbacks
  /* gsap.killTweensOf på alla tweenade mesh.scale/rotation/position */
  this._layer?.destroy()              // tar bort ticker-cb, disposar HELA scenen
                                      // (geometrier/material/texturer), renderer.dispose +
                                      // forceContextLoss, tar bort canvasen, återställer bgLayer
  this._layer = null
  this._root?.destroy({ children: true })  // Pixi-sidan som vanligt
}
```

- Meshar som tas bort i förtid (poppade objekt): `scene.remove(mesh)` +
  `mesh.geometry.dispose()` + `mesh.material.dispose()` själv (layer.destroy ser bara det
  som är kvar i scenen). Dubbel-dispose är ofarligt.
- gsap-tweens på three-objekt kraschar INTE efter destroy (JS-objektet finns kvar) — men
  guarda `onComplete`/`delayedCall` med `this._alive` ändå så spel-state inte muteras.
- Tweena `mesh.scale`/`mesh.rotation`/`mesh.position` direkt är ok (till skillnad från
  Pixi-objekt som kan vara `destroyed`).

## Mobilbudget (surfplattor, P0)

- `maxPixelRatio: 2` (default) — sänk till 1.5 om scenen är tung.
- **Inga skuggor** som default; om på: EN DirectionalLight, `shadow.mapSize` 1024.
- < 50 000 trianglar, < 30 draw calls. Låg-poly-geometrier (Octahedron/Icosahedron/Box)
  ser dessutom "leksaksrätt" ut för målgruppen.
- Ingen postprocessing (EffectComposer), inga transparenta lager i högar, ingen env-map.
- Material: `toonMat()`/`MeshLambertMaterial` eller unlit shader-presets — undvik
  `MeshStandardMaterial` i mängd.
- Återanvänd geometrier/material när många likadana objekt skapas.
- three.js r185: ljusintensiteter är fysiska (ambient ~1, directional ~2–3);
  `renderer.outputColorSpace` är sRGB per default — rör den inte.

## Vanliga fel

- **Svart/beige skärm:** glömt `makeBackdrop`/`clearColor` (transparent visar bara body-bg),
  eller inget ljus i scenen med toon/lambert-material.
- **Allt i huvudbundlen:** statisk `import ... from 'three'` i en spelfil — använd dynamisk import.
- **Objekt "hoppar" vid resize:** placera via `designToWorld` (inte råa världskoordinater)
  och/eller läs om positioner i en `scaler.onResize`-lyssnare vid behov.
- **Minnesläcka mellan spelomgångar:** `_build` som skapar nya meshar måste disposa de gamla.
