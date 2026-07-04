// Shader-verktyg för 3D-spel (three.js). Mobilbilliga GLSL-material och
// helskärms-bakgrunder ("backdrops") som matchar appens scenteman.
//
// Alla animerade material har uniforms uTime (sekunder) och uResolution (px).
// ThreeLayer (lib/three3d.js) tickar uTime/uResolution åt dig — antingen via
// preset-fabrikerna nedan (som tar layer som första argument och själv-
// registrerar sig) eller via layer.animate(mat) för egna shaderMat().
//
// Mobil-regler (håll dem!):
//  - Inga beroende texturläsningar, inga loopar med dynamisk längd, ingen derivata.
//  - Billigt brus: hash via fract(sin(dot(...))) räcker för glitter/stjärnor.
//  - En gradient + ETT subtilt animerat lager per backdrop — inte mer.
import * as THREE from 'three'

// Standard-vertex: MVP + vUv (för plana/enkla material).
export const DEFAULT_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// Vertex med normal i view-space → fragmentet kan fejk-belysa (billigare än riktiga ljus).
export const SHADED_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// Backdrop-vertex: helskärmstriangel/quad direkt i klipprymd, längst bak (z=1).
const BACKDROP_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`

// Delad GLSL-hjälp (klistras in i fragment som behöver den).
const GLSL_HASH = /* glsl */ `
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`

/**
 * Lågnivå: skapa ett ShaderMaterial med uTime/uResolution förberedda.
 * Egna uniforms kan ges som { uFoo: { value: x } } ELLER { uFoo: x } (viks in).
 * Glöm inte layer.animate(mat) om shadern använder uTime/uResolution.
 */
export function shaderMat({ vertex = DEFAULT_VERT, fragment, uniforms = {}, ...opts } = {}) {
  const u = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  }
  for (const [k, v] of Object.entries(uniforms)) {
    u[k] = v && typeof v === 'object' && 'value' in v ? v : { value: v }
  }
  return new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms: u, ...opts })
}

// ---------------------------------------------------------------------------
// Helskärms-bakgrunder (renderas längst bak, ingen depth). Namnen speglar
// scene.js-teman så 3D-spel känns som resten av appen.
// ---------------------------------------------------------------------------
export const BACKDROPS = {
  sky: /* glsl */ `
varying vec2 vUv;
uniform float uTime;
void main() {
  vec3 col = mix(vec3(0.80, 0.93, 1.00), vec3(0.38, 0.65, 0.92), vUv.y);
  float clouds = sin(vUv.x * 6.2831 + uTime * 0.12) * sin(vUv.y * 8.0 - uTime * 0.05);
  col += 0.035 * clouds;
  gl_FragColor = vec4(col, 1.0);
}
`,
  sunset: /* glsl */ `
varying vec2 vUv;
uniform float uTime;
void main() {
  vec3 low  = vec3(1.00, 0.72, 0.42);
  vec3 mid  = vec3(0.98, 0.52, 0.47);
  vec3 high = vec3(0.55, 0.35, 0.64);
  vec3 col = mix(low, mid, smoothstep(0.0, 0.55, vUv.y));
  col = mix(col, high, smoothstep(0.5, 1.0, vUv.y));
  col += 0.04 * sin(vUv.y * 20.0 + uTime * 0.3) * (1.0 - vUv.y);
  gl_FragColor = vec4(col, 1.0);
}
`,
  night: /* glsl */ `
varying vec2 vUv;
uniform float uTime;
${GLSL_HASH}
void main() {
  vec3 col = mix(vec3(0.16, 0.13, 0.34), vec3(0.05, 0.06, 0.20), vUv.y);
  vec2 grid = vUv * vec2(90.0, 50.0);
  vec2 cell = floor(grid);
  float h = hash21(cell);
  if (h > 0.965) {
    vec2 f = fract(grid) - 0.5;
    float star = 1.0 - smoothstep(0.0, 0.4, length(f));
    float twinkle = 0.55 + 0.45 * sin(uTime * (1.0 + h * 4.0) + h * 40.0);
    col += star * twinkle;
  }
  gl_FragColor = vec4(col, 1.0);
}
`,
  meadow: /* glsl */ `
varying vec2 vUv;
uniform float uTime;
void main() {
  vec3 sky   = mix(vec3(0.78, 0.93, 1.00), vec3(0.45, 0.72, 0.95), smoothstep(0.45, 1.0, vUv.y));
  vec3 grass = mix(vec3(0.30, 0.62, 0.34), vec3(0.55, 0.80, 0.45), vUv.y * 2.2);
  vec3 col = mix(grass, sky, smoothstep(0.42, 0.47, vUv.y));
  col += 0.03 * sin(vUv.x * 14.0 + uTime * 0.4) * (1.0 - smoothstep(0.4, 0.5, vUv.y));
  gl_FragColor = vec4(col, 1.0);
}
`,
  water: /* glsl */ `
varying vec2 vUv;
uniform float uTime;
void main() {
  vec3 col = mix(vec3(0.16, 0.46, 0.72), vec3(0.55, 0.85, 0.95), vUv.y);
  float band = sin(vUv.y * 26.0 + sin(vUv.x * 9.0 + uTime * 0.7) * 1.4 - uTime * 0.9);
  col += 0.05 * smoothstep(0.55, 1.0, band);
  gl_FragColor = vec4(col, 1.0);
}
`,
  candy: /* glsl */ `
varying vec2 vUv;
uniform float uTime;
void main() {
  vec3 col = mix(vec3(1.00, 0.85, 0.93), vec3(0.80, 0.72, 0.98), vUv.y);
  float swirl = sin((vUv.x + vUv.y) * 12.0 + uTime * 0.25);
  col += 0.035 * swirl;
  gl_FragColor = vec4(col, 1.0);
}
`,
}

/**
 * Lägg en animerad helskärms-bakgrund längst bak i scenen.
 * preset: nyckel i BACKDROPS ('sky'|'sunset'|'night'|'meadow'|'water'|'candy')
 * ELLER en egen komplett fragment-shader (med varying vec2 vUv).
 */
export function makeBackdrop(layer, preset = 'sky', uniforms = {}) {
  const fragment = BACKDROPS[preset] || preset
  const mat = shaderMat({
    vertex: BACKDROP_VERT,
    fragment,
    uniforms,
    depthWrite: false,
    depthTest: false,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
  mesh.frustumCulled = false
  mesh.renderOrder = -1000
  layer.scene.add(mesh)
  layer.animate(mat)
  return mesh
}

// ---------------------------------------------------------------------------
// Material-presets för 3D-objekt (själv-registrerande: tar layer först).
// Alla fejk-belyser via view-space-normal — inga riktiga ljus behövs.
// ---------------------------------------------------------------------------
const GLSL_FAKE_LIGHT = /* glsl */ `
float fakeLight(vec3 n) { return 0.62 + 0.38 * max(dot(normalize(n), normalize(vec3(0.35, 0.75, 0.6))), 0.0); }
`

/** Regnbågsskimmer (för "magiska" objekt — sällsynta wow-ögonblick). */
export function rainbowMat(layer, { speed = 0.15, ...opts } = {}) {
  const mat = shaderMat({
    vertex: SHADED_VERT,
    fragment: /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
uniform float uTime;
uniform float uSpeed;
${GLSL_FAKE_LIGHT}
void main() {
  float t = vUv.y * 0.8 + vUv.x * 0.2 + uTime * uSpeed;
  vec3 col = 0.62 + 0.38 * cos(6.2831 * (t + vec3(0.0, 0.33, 0.67)));
  gl_FragColor = vec4(col * fakeLight(vNormal), 1.0);
}
`,
    uniforms: { uSpeed: speed },
    ...opts,
  })
  return layer.animate(mat)
}

/** Glittrande material: basfärg + tindrande gnistor (kristaller, skatter, snö). */
export function glitterMat(layer, color = 0xa78bfa, { density = 60.0, sparkle = 0.85, ...opts } = {}) {
  const mat = shaderMat({
    vertex: SHADED_VERT,
    fragment: /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
uniform float uTime;
uniform vec3 uColor;
uniform float uDensity;
uniform float uSparkle;
${GLSL_HASH}
${GLSL_FAKE_LIGHT}
void main() {
  vec3 col = uColor * fakeLight(vNormal);
  vec2 cell = floor(vUv * uDensity);
  float h = hash21(cell);
  float tw = max(sin(uTime * (2.0 + h * 5.0) + h * 40.0), 0.0);
  col += uSparkle * step(0.9, h) * tw * tw;
  gl_FragColor = vec4(col, 1.0);
}
`,
    uniforms: { uColor: new THREE.Color(color), uDensity: density, uSparkle: sparkle },
    ...opts,
  })
  return layer.animate(mat)
}

/** Mjuk tvåfärgs-gradient (obelyst-stilren, t.ex. kullar, träd, hus). */
export function gradientMat(layer, top = 0xffd35c, bottom = 0xff8a3d, opts = {}) {
  const mat = shaderMat({
    vertex: SHADED_VERT,
    fragment: /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
uniform vec3 uTop;
uniform vec3 uBottom;
${GLSL_FAKE_LIGHT}
void main() {
  vec3 col = mix(uBottom, uTop, vUv.y) * fakeLight(vNormal);
  gl_FragColor = vec4(col, 1.0);
}
`,
    uniforms: { uTop: new THREE.Color(top), uBottom: new THREE.Color(bottom) },
    ...opts,
  })
  return layer.animate(mat) // harmlös utan uTime; ger uResolution-uppdatering gratis
}
