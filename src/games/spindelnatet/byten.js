// Spindelnätets byten (FYSIKPLAN L2) — större än förut och med eget liv: karamellens
// pappersvingar fladdrar, klubbans spiral snurrar, chokladens omslag vajar, larven slingrar
// och blinkar, skalbaggen viftar med benen och antennerna. Allt ritas (ingen emoji), och
// rörelsen är rena egenskapsskrivningar i `animera(T, k)` — inga tweens att städa.
// T = tid + egen fas (sekunder), k = livlighet 0..1 (lugn på marken, livlig i fallet/kryp).
import { Container, Graphics } from 'pixi.js'

const SKALA = { karamell: 1.35, guld: 1.3, klubba: 1.2, choklad: 1.3, larv: 1.25, skalbagge: 1.3 }

const stjarna = () =>
  new Graphics()
    .poly([0, -8, 2, -2, 8, 0, 2, 2, 0, 8, -2, 2, -8, 0, -2, -2])
    .fill({ color: 0xffffff, alpha: 0.9 })

export function makeTreat(kind) {
  const c = new Container()
  const art = new Container()
  art.scale.set(SKALA[kind] || 1.3)
  c.addChild(art)
  let animera = null

  if (kind === 'karamell' || kind === 'guld') {
    const guld = kind === 'guld'
    const kropp = guld ? 0xffd24a : 0xff6b9d
    const papper = guld ? 0xffe27a : 0xff9ec4
    let gloria = null
    if (guld) {
      gloria = new Graphics()
      gloria.circle(0, 0, 40).fill({ color: 0xffe27a, alpha: 0.14 })
      gloria.circle(0, 0, 30).fill({ color: 0xfff3b0, alpha: 0.16 })
      art.addChild(gloria)
    }
    const vingL = new Graphics().moveTo(0, 0).lineTo(-18, -15).lineTo(-14, 15).closePath().fill(papper)
    vingL.position.set(-22, 0)
    const vingR = new Graphics().moveTo(0, 0).lineTo(18, -15).lineTo(14, 15).closePath().fill(papper)
    vingR.position.set(22, 0)
    const body = new Graphics().ellipse(0, 0, 22, 17).fill(kropp)
    if (guld) body.ellipse(0, 0, 22, 17).stroke({ width: 3, color: 0xe0a92c })
    body.moveTo(-12, -12).quadraticCurveTo(0, 0, -12, 12).stroke({ width: 4, color: 0xfffdf7, alpha: 0.75 })
    body.circle(-6, -6, 5).fill({ color: 0xffffff, alpha: 0.6 })
    const glimt = stjarna()
    glimt.position.set(11, -9)
    art.addChild(vingL, vingR, body, glimt)
    animera = (T, k) => {
      const s = Math.sin(T * (4 + 5 * k))
      const amp = 0.15 + 0.3 * k
      vingL.rotation = s * amp
      vingR.rotation = -s * amp
      vingL.scale.y = vingR.scale.y = 1 + s * 0.08
      glimt.rotation = T * 1.5
      glimt.alpha = 0.3 + 0.7 * Math.max(0, Math.sin(T * 3.1))
      if (gloria) gloria.alpha = 0.75 + 0.25 * Math.sin(T * 3)
    }
  } else if (kind === 'klubba') {
    const pinne = new Graphics().moveTo(0, 18).lineTo(0, 44).stroke({ width: 7, color: 0xfffdf7, cap: 'round' })
    const bow = new Graphics()
    bow.moveTo(0, 0).lineTo(-10, -6).lineTo(-10, 6).closePath()
    bow.moveTo(0, 0).lineTo(10, -6).lineTo(10, 6).closePath()
    bow.fill(0xff6b9d)
    bow.position.set(0, 31)
    const huvud = new Graphics().circle(0, 0, 24).fill(0xffd35c)
    const spiral = new Container()
    const sp = new Graphics()
    for (let i = 0; i < 3; i++) {
      const a0 = i * 2.1
      sp.moveTo(0, 0)
      for (let t = 0; t < 22; t++) {
        const a = a0 + t * 0.22
        const r = t * 1.05
        sp.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      sp.stroke({ width: 5, color: [0xff6b9d, 0x57c8c3, 0xa78bfa][i], alpha: 0.95 })
    }
    spiral.addChild(sp)
    const kant = new Graphics().circle(0, 0, 24).stroke({ width: 3, color: 0xe0a92c })
    const glans = new Graphics().ellipse(-9, -11, 5, 3.4).fill({ color: 0xffffff, alpha: 0.55 })
    art.addChild(pinne, bow, huvud, spiral, kant, glans)
    animera = (T, k) => {
      spiral.rotation = T * (0.5 + 0.8 * k)
      bow.rotation = Math.sin(T * (3 + 3 * k)) * 0.35
      bow.scale.x = 1 + Math.sin(T * 5) * 0.1
    }
  } else if (kind === 'choklad') {
    const bar = new Graphics().roundRect(-26, -20, 52, 40, 6).fill(0x6f452c)
    for (let r = 0; r < 2; r++) {
      for (let k = 0; k < 3; k++) {
        bar.roundRect(-23 + k * 16, -17 + r * 18, 13, 15, 3).fill({ color: 0x8a5a3b, alpha: 0.95 })
      }
    }
    bar.roundRect(-26, -20, 52, 40, 6).stroke({ width: 2.5, color: 0xc08a5e, alpha: 0.85 })
    const omslag = new Graphics().roundRect(-26, -24, 26, 48, 6).fill(0xff6b6b)
    omslag.roundRect(-26, -24, 26, 10, 5).fill({ color: 0xff9e9e, alpha: 0.9 })
    omslag.position.set(-4, 0)
    const glans = new Graphics().roundRect(-3, -15, 6, 30, 3).fill({ color: 0xffffff, alpha: 0.22 })
    art.addChild(bar, glans, omslag)
    animera = (T, k) => {
      const s = Math.sin(T * (3 + 4 * k))
      omslag.scale.x = 1 + s * 0.07
      omslag.skew.y = s * 0.09
      glans.x = 5 + (Math.sin(T * 1.7) * 0.5 + 0.5) * 18
    }
  } else if (kind === 'larv') {
    const bas = [3, -3, 3, -3]
    const segs = []
    for (let i = 0; i < 4; i++) {
      const s = new Graphics().circle(0, 0, 13).fill(i % 2 ? 0x6ac96a : 0x8fd67a)
      s.position.set(-24 + i * 16, bas[i])
      segs.push(s)
      art.addChild(s)
    }
    const huvud = new Container()
    huvud.position.set(28, 0)
    huvud.addChild(new Graphics().circle(0, 0, 15).fill(0x5bbf6a))
    const ogon = new Container()
    ogon.position.set(0, -4)
    ogon.addChild(
      new Graphics().circle(5, 0, 4).fill(0x33291f),
      new Graphics().circle(-4, 0, 4).fill(0x33291f),
      new Graphics().circle(6, -1.5, 1.4).fill(0xffffff),
      new Graphics().circle(-3, -1.5, 1.4).fill(0xffffff),
    )
    const antenn = (x, dx) => {
      const a = new Graphics()
      a.moveTo(0, 0).lineTo(dx, -10).stroke({ width: 2.6, color: 0x3f8f43, cap: 'round' })
      a.circle(dx, -10, 3).fill(0x3f8f43)
      a.position.set(x, -14)
      return a
    }
    const antL = antenn(-4, -4)
    const antR = antenn(5, 4)
    huvud.addChild(ogon, antL, antR)
    art.addChild(huvud)
    animera = (T, k) => {
      const f = 4 + 5 * k
      const amp = 1.5 + 2.5 * k
      for (let i = 0; i < 4; i++) {
        const w = Math.sin(T * f - i * 1.1)
        segs[i].y = bas[i] + w * amp
        segs[i].scale.y = 1 + Math.sin(T * f - i * 1.1 + 1.5) * 0.06
      }
      huvud.y = Math.sin(T * f - 4.5) * amp
      antL.rotation = Math.sin(T * 3.2) * 0.3
      antR.rotation = Math.sin(T * 3.2 + 1) * 0.3
      ogon.scale.y = (T * 0.8) % 3.4 < 0.13 ? 0.1 : 1
    }
  } else {
    // skalbagge
    const ben = []
    const benDef = [
      [-20, -4, -12, -6], [-22, 6, -12, 2], [-18, 14, -10, 10],
      [20, -4, 12, -6], [22, 6, 12, 2], [18, 14, 10, 10],
    ]
    for (const [x, y, dx, dy] of benDef) {
      const b = new Graphics().moveTo(0, 0).lineTo(dx, dy).stroke({ width: 3, color: 0x2a2018, cap: 'round' })
      b.position.set(x, y)
      ben.push(b)
      art.addChild(b)
    }
    const kropp = new Graphics().ellipse(0, 2, 24, 20).fill(0x57c8c3)
    kropp.moveTo(0, -16).lineTo(0, 20).stroke({ width: 3, color: 0x2f7c78 })
    for (const [dx, dy] of [[-12, -2], [12, -2], [-8, 11], [8, 11]]) kropp.circle(dx, dy, 4.5).fill(0x2f7c78)
    kropp.ellipse(-9, -4, 4.5, 8).fill({ color: 0xffffff, alpha: 0.25 })
    const huvud = new Graphics().circle(0, -18, 12).fill(0x33291f)
    huvud.circle(-5, -22, 2.4).fill(0xffd35c)
    huvud.circle(5, -22, 2.4).fill(0xffd35c)
    const antenn = (x, dx) => {
      const a = new Graphics().moveTo(0, 0).lineTo(dx, -8).stroke({ width: 2.6, color: 0x33291f, cap: 'round' })
      a.position.set(x, -28)
      return a
    }
    const antL = antenn(-6, -5)
    const antR = antenn(6, 5)
    art.addChild(kropp, huvud, antL, antR)
    animera = (T, k) => {
      const f = 5 + 6 * k
      const amp = 0.1 + 0.25 * k
      for (let i = 0; i < ben.length; i++) {
        const sida = i < 3 ? 1 : -1
        ben[i].rotation = Math.sin(T * f + i * 1.3) * amp * sida
      }
      antL.rotation = Math.sin(T * 3.4) * 0.35
      antR.rotation = Math.sin(T * 3.4 + 1.2) * 0.35
    }
  }

  c.animera = animera
  c.eventMode = 'none'
  c.interactiveChildren = false
  return c
}
