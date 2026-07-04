---
name: threejs-shaders
description: Use when writing or tweaking GLSL/shaders for 3D-spelen (three.js) in this repo. Covers shaderMat/ShaderMaterial, backdrops (makeBackdrop/BACKDROPS), presets (rainbowMat/glitterMat/gradientMat), uTime/uResolution via ThreeLayer.animate, mobil-GLSL-regler, onBeforeCompile. Triggers on - shader, GLSL, ShaderMaterial, fragment, vertex, uniform, backdrop, uTime, varying, onBeforeCompile, glitter, rainbow.
---

# Shaders för 3D-spelen (three.js)

Allt bor i `src/lib/three-shaders.js` (re-exporteras av `src/lib/three3d.js` — spel behöver
bara EN dynamisk import). Grundmönstret för 3D-spel finns i skill **threejs-games**.

## Uniform-konventionen

Alla animerade material har `uTime` (sekunder) och `uResolution` (drawing-buffer-px).
`ThreeLayer` tickar dem — men bara för material som registrerats:

- Preset-fabrikerna (`makeBackdrop`, `rainbowMat`, `glitterMat`, `gradientMat`) tar `layer`
  som första argument och **själv-registrerar sig**.
- Egna material: `layer.animate(shaderMat({...}))` eller kortformen `layer.shaderMat({...})`.

## API

```js
// Lågnivå — ShaderMaterial med uTime/uResolution förberedda. Egna uniforms kan ges
// råa ({uFoo: 3.0}) eller färdiga ({uFoo: {value: 3.0}}); färger som new THREE.Color(hex).
const mat = shaderMat({ vertex?, fragment, uniforms?, ...materialOpts })

// Helskärms-bakgrund längst bak (ingen depth, renderOrder -1000). Preset-nycklar i
// BACKDROPS: 'sky' | 'sunset' | 'night' | 'meadow' | 'water' | 'candy' (matchar scene.js-
// teman) — eller skicka en egen komplett fragment-shader-sträng.
const mesh = makeBackdrop(layer, 'night', extraUniforms?)

// Objekt-presets (fejk-belyser via view-space-normal — behöver INGA ljus):
rainbowMat(layer, { speed })                    // regnbågsskimmer — sällsynta wow-objekt
glitterMat(layer, colorHex, { density, sparkle }) // basfärg + tindrande gnistor
gradientMat(layer, topHex, bottomHex)           // mjuk tvåfärgs-gradient

// Vertex-shaders att återanvända:
DEFAULT_VERT  // MVP + vUv
SHADED_VERT   // MVP + vUv + vNormal (view-space) för fakeLight-mönstret
```

## Skriva egna fragment-shaders

three.js injicerar automatiskt `precision`, `projectionMatrix`/`modelViewMatrix`/
`normalMatrix` och attributen `position`/`normal`/`uv` i ShaderMaterial — deklarera dem inte.
GLSL ES 1.0-stil (`gl_FragColor`, `texture2D`) gäller; three översätter till ES 3.0 själv.

```js
const mat = layer.shaderMat({
  vertex: SHADED_VERT,
  fragment: /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
uniform float uTime;
uniform vec3 uColor;
void main() {
  float light = 0.62 + 0.38 * max(dot(normalize(vNormal), normalize(vec3(0.35, 0.75, 0.6))), 0.0);
  float puls = 0.9 + 0.1 * sin(uTime * 2.0);
  gl_FragColor = vec4(uColor * light * puls, 1.0);
}
`,
  uniforms: { uColor: new THREE.Color(0xffd35c) },
})
```

## Mobil-GLSL-regler (P0 för surfplattor)

- **Billigt brus räcker:** `fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453)` (finns som
  `hash21` i preset-källorna). Ingen simplex/fbm med många oktaver.
- Inga loopar med dynamisk längd, inga beroende texturläsningar, undvik `discard` och
  derivator (`fwidth`/`dFdx`) i stora ytor.
- En gradient + ETT subtilt animerat lager per backdrop — mer syns ändå inte bakom spelobjekten.
- Backdrop-fragmentet körs för VARJE pixel varje frame — håll det under ~20 ALU-ops.
- Villkor är ok (`if (h > 0.965)`) när grenen är billig; hela skärmen betalar annars worst case.
- Färger: gl_FragColor skrivs rå (ingen tonemapping för ShaderMaterial) — välj mjuka,
  pastelliga värden direkt (appens palett: `PLAYFUL` i `lib/theme.js`, 0–1-skalad via THREE.Color).

## Utöka inbyggda material (onBeforeCompile)

För effekter ovanpå `toonMat`/Lambert (vind-vajning, dissolve) — injicera i stället för att
skriva om hela materialet:

```js
const mat = toonMat(0x5bbf6a)
mat.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = { value: 0 }
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uTime;')
    .replace('#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed.x += sin(uTime * 2.0 + position.y * 0.05) * 4.0;')
  mat.userData.shader = shader
}
// ticka själv: layer.onUpdate((dt, t) => { const s = mat.userData.shader; if (s) s.uniforms.uTime.value = t })
```

(`layer.animate` funkar inte här — uniformen finns på det kompilerade `shader`-objektet.)

## Kom ihåg

- Material som skapas per objekt måste **disposas** när objektet tas bort i förtid
  (`mesh.material.dispose()`); `layer.destroy()` tar bara det som är kvar i scenen.
- Nya backdrop-teman: lägg dem i `BACKDROPS` i `three-shaders.js` (namnge som scene.js-teman)
  så alla 3D-spel kan dela dem.
- Testa på riktig platta via Tailscale-flödet (se minnes-anteckningen phone-testing-tailscale).
