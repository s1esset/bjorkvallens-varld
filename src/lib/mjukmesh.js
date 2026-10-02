// mjukmesh.js — en `Mjukkropp` ritad som MeshSimple i stället för omritad Graphics (FYSIKPLAN O1).
//
//   const mm = mjukMesh(kropp, { farg: 0xfff1c9, kontur: { farg: 0xb88a3a, bredd: 2 }, glans: { alpha: 0.4 } })
//   värld.addChild(mm.mesh)
//   // varje bildruta, efter kroppens steg:
//   mm.uppdatera()
//   // vid rivning:
//   mm.destroy()
//
// Samma kurva som `Mjukkropp.path()` (kvadratiska steg genom kantmittpunkterna, kontrollpunkt =
// ringpunkten) men SAMPLAD till en fast ring av `tathet` punkter per kantsegment. Då behövs ingen
// `Graphics.clear()` + triangulering per bildruta: hörnen skrivs rakt in i en återanvänd
// Float32Array och bufferten laddas upp av MeshSimple.
//
// Tre remsor i en Container (`mesh`): FYLLNING (solfjäder från kroppens mitt), KONTUR (en
// remsa ±bredd/2 längs ringen) och GLANS (samma solfjäder krympt mot mitten, vit med alfa).
// Fyllning/kontur/glans är `Texture.WHITE` + `tint` — noll texturbakning. Vill man ha en
// lodrät toning: `gradient: [topp, botten]` ger en 1×64 Canvas2D-textur CACHAD per färgpar
// (aldrig `generateTexture`, aldrig en `FillGradient` per montering).
//
// ÄGARSKAP: Pixis `Mesh.destroy()` river INTE sin `MeshGeometry` och `Geometry.destroy()` river inte
// dess BUFFERTAR utan `destroy(true)` (V16-familjen; uppmätt 24 kvarlämnade buffertar per 12 popp) — `destroy()`
// här gör det själv, annars ligger en geometri + GPU-buffert kvar per riven kropp.
import { CanvasSource, Container, MeshSimple, Texture } from 'pixi.js'

const _gradTex = new Map()

function gradientTextur(topp, botten) {
  const nyckel = `${topp.toString(16)}:${botten.toString(16)}`
  const funnen = _gradTex.get(nyckel)
  if (funnen && !funnen.destroyed) return funnen
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    const hex = (c) => '#' + c.toString(16).padStart(6, '0')
    const g = ctx.createLinearGradient(0, 0, 0, 64)
    g.addColorStop(0, hex(topp))
    g.addColorStop(1, hex(botten))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 2, 64)
    const tex = new Texture({ source: new CanvasSource({ resource: canvas, scaleMode: 'linear' }), label: `mjukmesh:${nyckel}` })
    _gradTex.set(nyckel, tex)
    return tex
  } catch {
    return null
  }
}

// Frigör de cachade toningstexturerna (anropas t.ex. när sista spelet som använde dem rivs).
export function rensaMjukmeshTexturer() {
  for (const t of _gradTex.values()) if (!t.destroyed) t.destroy(true)
  _gradTex.clear()
}

function remsa(texture, hornAntal, index, uvs) {
  const m = new MeshSimple({
    texture,
    vertices: new Float32Array(hornAntal * 2),
    uvs: uvs || new Float32Array(hornAntal * 2),
    indices: index,
  })
  m.eventMode = 'none'
  return m
}

/**
 * @param {import('./mjukkropp.js').Mjukkropp} m
 * @param {{ farg?: number, tathet?: number, gradient?: [number, number]|null,
 *           kontur?: { farg: number, bredd?: number }|null,
 *           glans?: { alpha?: number, skala?: number, farg?: number }|null }} [opt]
 * @returns {{ mesh: Container, uppdatera: () => void, destroy: () => void,
 *             setFarg: (farg: number, konturFarg?: number) => void, setGlans: (alpha: number) => void }}
 */
export function mjukMesh(m, { farg = 0xffffff, tathet = 3, gradient = null, kontur = null, glans = null } = {}) {
  const n = m.n
  const K = Math.max(1, tathet | 0)
  const R = n * K // ringpunkter
  const ring = new Float32Array(R * 2)

  const rot = new Container()
  rot.eventMode = 'none'

  // Gemensamma index: solfjäder (mitt = 0, ring = 1..R) respektive remsa (yttre 2j, inre 2j+1).
  const fanIdx = new Uint16Array(R * 3)
  for (let j = 0; j < R; j++) {
    fanIdx[j * 3] = 0
    fanIdx[j * 3 + 1] = 1 + j
    fanIdx[j * 3 + 2] = 1 + ((j + 1) % R)
  }
  const stripIdx = new Uint16Array(R * 6)
  for (let j = 0; j < R; j++) {
    const a = 2 * j
    const b = 2 * ((j + 1) % R)
    stripIdx.set([a, a + 1, b, a + 1, b + 1, b], j * 6)
  }

  // Fyllning (ev. med en lodrät toning — UV:erna fästs i viloläget och följer sedan hörnen).
  let tex = Texture.WHITE
  let fyllTint = farg
  let fyllUv = null
  if (gradient) {
    const t = gradientTextur(gradient[0], gradient[1])
    if (t) {
      tex = t
      fyllTint = 0xffffff
      fyllUv = new Float32Array((R + 1) * 2)
    }
  }
  const fyll = remsa(tex, R + 1, fanIdx, fyllUv)
  fyll.tint = fyllTint
  rot.addChild(fyll)
  const fv = fyll.vertices

  let kont = null
  let kv = null
  const kHalv = kontur ? (kontur.bredd ?? 2) / 2 : 0
  if (kontur) {
    kont = remsa(Texture.WHITE, R * 2, stripIdx)
    kont.tint = kontur.farg
    rot.addChild(kont)
    kv = kont.vertices
  }

  let gl = null
  let gv = null
  const glSkala = glans ? (glans.skala ?? 0.6) : 1
  if (glans) {
    gl = remsa(Texture.WHITE, R + 1, fanIdx)
    gl.tint = glans.farg ?? 0xffffff
    gl.alpha = glans.alpha ?? 0.4
    rot.addChild(gl)
    gv = gl.vertices
  }

  let forstaGangen = true
  function uppdatera() {
    const p = m.pts
    const c = p[m.mitt]
    // 1) Sampla ringen: segment i går från mid(p[i-1],p[i]) via kontrollpunkten p[i] till mid(p[i],p[i+1]).
    let w = 0
    for (let i = 0; i < n; i++) {
      const pa = p[(i + n - 1) % n]
      const pb = p[i]
      const pc = p[(i + 1) % n]
      const ax = (pa.x + pb.x) / 2
      const ay = (pa.y + pb.y) / 2
      const ex = (pb.x + pc.x) / 2
      const ey = (pb.y + pc.y) / 2
      for (let s = 1; s <= K; s++) {
        const t = s / K
        const u = 1 - t
        ring[w++] = u * u * ax + 2 * u * t * pb.x + t * t * ex
        ring[w++] = u * u * ay + 2 * u * t * pb.y + t * t * ey
      }
    }
    // 2) Fyllning.
    fv[0] = c.x
    fv[1] = c.y
    for (let j = 0; j < R * 2; j++) fv[2 + j] = ring[j]
    // 3) Glans (samma ring krympt mot mitten).
    if (gv) {
      gv[0] = c.x
      gv[1] = c.y
      for (let j = 0; j < R; j++) {
        gv[2 + j * 2] = c.x + (ring[j * 2] - c.x) * glSkala
        gv[3 + j * 2] = c.y + (ring[j * 2 + 1] - c.y) * glSkala
      }
    }
    // 4) Kontur: ±halv bredd längs ringens normal (tangent = nästa − förra).
    if (kv) {
      for (let j = 0; j < R; j++) {
        const jp = ((j + R - 1) % R) * 2
        const jn = ((j + 1) % R) * 2
        const tx = ring[jn] - ring[jp]
        const ty = ring[jn + 1] - ring[jp + 1]
        const l = Math.hypot(tx, ty) || 1
        const nx = (ty / l) * kHalv
        const ny = (-tx / l) * kHalv
        const x = ring[j * 2]
        const y = ring[j * 2 + 1]
        kv[j * 4] = x + nx
        kv[j * 4 + 1] = y + ny
        kv[j * 4 + 2] = x - nx
        kv[j * 4 + 3] = y - ny
      }
    }
    // 5) Toningens UV:er fästs i viloläget (första uppdateringen).
    if (forstaGangen) {
      forstaGangen = false
      if (fyllUv) {
        let y0 = Infinity
        let y1 = -Infinity
        for (let j = 0; j < R; j++) {
          y0 = Math.min(y0, ring[j * 2 + 1])
          y1 = Math.max(y1, ring[j * 2 + 1])
        }
        const h = y1 - y0 || 1
        fyllUv[0] = 0.5
        fyllUv[1] = (c.y - y0) / h
        for (let j = 0; j < R; j++) {
          fyllUv[2 + j * 2] = 0.5
          fyllUv[3 + j * 2] = (ring[j * 2 + 1] - y0) / h
        }
        fyll.geometry.getBuffer('aUV').update()
      }
    }
    // Geometrins gränser följer med (annars klipps/missbedöms en kropp som rört sig långt).
    fyll.geometry._boundsDirty = true
    if (kont) kont.geometry._boundsDirty = true
    if (gl) gl.geometry._boundsDirty = true
  }
  uppdatera()

  let borta = false
  return {
    mesh: rot,
    uppdatera,
    setFarg(f, konturFarg) {
      if (tex === Texture.WHITE) fyll.tint = f
      if (kont && konturFarg != null) kont.tint = konturFarg
    },
    setGlans(alpha) {
      if (gl) gl.alpha = alpha
    },
    destroy() {
      if (borta) return
      borta = true
      for (const d of [fyll, kont, gl]) {
        if (!d) continue
        d.geometry.destroy(true) // true: buffertarna med — annars ligger aPosition/aUV kvar i GPU-hashen (uppmätt 24 per 12 popp)
        d.destroy()
      }
      rot.destroy()
    },
  }
}
