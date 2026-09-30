// Rummet i "Klä efter Vädret": tapetserad vägg med dado, plankgolv med matta, ett klädstreck
// (två rader) på vänster sida och ett FÖNSTER på höger sida där vädret syns ute.
//
// Fönstret är spelets fråga: "vad är det för väder?" bärs av bilden (sol med strålar, mörka
// regnmoln med droppar, snöfall, blåst med flygande löv och ett träd som böjer sig) — ingen
// läsning krävs. Allt i fönstret ligger i EN container med en mask (samma mönster som
// flugan-pa-nasans fönster) och drivs av en tick, inte av tweens: inget att städa efter
// utom masken, som `destroy()` lossar innan noderna rivs.
//
// Geometri i designkoordinater 1280×720. Alla figurer ritas i absoluta koordinater i sina
// Graphics; det som ska röra sig ligger i en Container med eget läge (aldrig en bar
// Graphics med stor .position).
import { Container, Graphics } from 'pixi.js'
import { sphereFill, topLightFill, cylinderFill, verticalFill, groundFill } from '../../lib/form.js'
import { BLEED_X, BLEED_Y } from '../../lib/view.js'

export const FLOOR_Y = 606 // fötternas underkant ligger på 616 -> Elvira står PÅ golvet
export const WIN = { x: 900, y: 190, w: 280, h: 262 } // glasytan
const DADO_Y = 470 // överkant på dadon (panelen under tapeten)

// Klädstrecket: två rader på vänster sida. Repet kommer utifrån (utanför skärmens vänsterkant)
// och knyts i en krok på väggen strax innan Elvira. Höjderna är valda mot skalets knappar:
// hem-knappen upptar y 18..110 (+24 halo) i övre vänstra hörnet, så första raden med plagg
// börjar under y 146.
export const REP = { x0: -BLEED_X - 20, x1: 500, sag: 24, rader: [168, 392] }

// Repets y vid ett givet x (kvadratisk kurva med styrpunkt mitt emellan ändarna:
// y(t) = L + 4·sag·t·(1−t)).
export function repY(x, rad) {
  const L = REP.rader[rad]
  const t = Math.max(0, Math.min(1, (x - REP.x0) / (REP.x1 - REP.x0)))
  return L + 4 * REP.sag * t * (1 - t)
}

// Vägg + dado + golv + matta i ETT Graphics, så EN tint klär hela rummet efter vädret
// (blågrått i regn, ljust i snö) — samma mekanism som spelets gamla bakgrund. Bastonerna
// är varma; tinten multiplicerar dem.
export function byggRum() {
  const g = new Graphics()
  const L = -BLEED_X
  const W = 1280 + 2 * BLEED_X
  const T = -BLEED_Y
  const golvBotten = 720 + BLEED_Y

  // Tapet: ljusa breda ränder + små blommor. Det är detaljen som gör att väggen läses som en
  // vägg och inte som en färgad tomhet.
  g.rect(L, T, W, DADO_Y - T).fill(verticalFill(0xfbf1de, 0xf0e2c6))
  for (let sx = L; sx < L + W; sx += 88) g.rect(sx, T, 44, DADO_Y - T).fill({ color: 0xffffff, alpha: 0.32 })
  let i = 0
  for (let sx = L + 22; sx < L + W; sx += 88, i++) {
    for (let sy = 36; sy < DADO_Y - 16; sy += 74) {
      g.circle(sx, sy + (i % 2) * 30, 5).fill({ color: 0xf0b8a0, alpha: 0.38 })
    }
  }

  // Dado (träpanel) med list överst och golvlist nederst.
  g.rect(L, DADO_Y, W, FLOOR_Y - DADO_Y).fill(verticalFill(0xd9ab72, 0xc48f58))
  for (let px = L + 30; px < L + W; px += 160) {
    g.roundRect(px, DADO_Y + 30, 130, 76, 8).stroke({ width: 4, color: 0xa87444, alpha: 0.5 })
    g.roundRect(px + 6, DADO_Y + 36, 118, 64, 6).stroke({ width: 2, color: 0xffffff, alpha: 0.22 })
  }
  g.rect(L, DADO_Y - 8, W, 16).fill(verticalFill(0xfff0d0, 0xe8cf9f))
  g.rect(L, DADO_Y + 8, W, 8).fill({ color: 0x000000, alpha: 0.1 })
  g.rect(L, FLOOR_Y - 16, W, 16).fill(verticalFill(0xf2dcb4, 0xd8bb88))

  // Plankgolv: sömmar tvärs och staplade skarvar.
  g.rect(L, FLOOR_Y, W, golvBotten - FLOOR_Y).fill(groundFill(0xc99a62, { light: 0.1, dark: 0.2 }))
  const rader = [FLOOR_Y, 644, 686, 736]
  for (let r = 0; r < rader.length; r++) {
    g.moveTo(L, rader[r]).lineTo(L + W, rader[r]).stroke({ width: 3, color: 0x8a5a3b, alpha: 0.28 })
    const nasta = rader[r + 1] ?? golvBotten
    for (let sx = L + (r % 2) * 110; sx < L + W; sx += 220) {
      g.moveTo(sx, rader[r]).lineTo(sx, nasta).stroke({ width: 2, color: 0x8a5a3b, alpha: 0.2 })
    }
  }

  // Matta under Elvira. Den börjar bakom fötterna (y 604) så hon står på den.
  g.ellipse(640, 654, 268, 50).fill(topLightFill(0x57c8c3, { highlight: 0.2, dark: 0.22 })).stroke({ width: 5, color: 0x3f9d99 })
  g.ellipse(640, 654, 240, 41).stroke({ width: 5, color: 0xfff3d6, alpha: 0.85 })
  g.ellipse(640, 654, 205, 33).fill({ color: 0xffffff, alpha: 0.14 })
  g.eventMode = 'static'
  return g
}

// Klädstreckets rep + krok. Ritas bakom både plagg och Elvira.
export function byggStreck() {
  const g = new Graphics()
  g.eventMode = 'none'
  const { x0, x1, sag, rader } = REP
  for (const L of rader) {
    const cx = (x0 + x1) / 2
    // slagskugga på väggen, sedan repet självt (mörk under + ljus över = en tvinnad tråd)
    g.moveTo(x0, L + 7).quadraticCurveTo(cx, L + 2 * sag + 7, x1, L + 7).stroke({ width: 5, color: 0x000000, alpha: 0.1 })
    g.moveTo(x0, L).quadraticCurveTo(cx, L + 2 * sag, x1, L).stroke({ width: 5, color: 0xb59a68 })
    g.moveTo(x0, L - 1).quadraticCurveTo(cx, L + 2 * sag - 1, x1, L - 1).stroke({ width: 2, color: 0xe8d9b0 })
    // krokplatta + ögla på väggen
    g.roundRect(x1 - 4, L - 16, 16, 32, 6).fill(sphereFill(0xb8c2cc)).stroke({ width: 3, color: 0x7d8993 })
    g.circle(x1 + 4, L, 6).fill(0x5d6871)
  }
  return g
}

// En klädnypa. Origo = där repet går; nypan sitter över plaggets överkant.
export function byggNypa() {
  const p = new Graphics()
  p.eventMode = 'none'
  p.roundRect(-8, -14, 16, 34, 4).fill(topLightFill(0xe8bf80, { highlight: 0.2, dark: 0.2 })).stroke({ width: 2.5, color: 0x9a6b3a })
  p.moveTo(0, -3).lineTo(0, 19).stroke({ width: 2, color: 0x9a6b3a })
  p.circle(0, -7, 2.6).fill(0x9a6b3a)
  return p
}

// --- Fönstret ---------------------------------------------------------------
export function byggFonster() {
  const { x, y, w, h } = WIN
  const view = new Container()
  view.eventMode = 'none'
  view.interactiveChildren = false

  // Karm bakom glaset
  const karm = new Graphics()
  karm.roundRect(x - 20, y - 20, w + 40, h + 40, 22).fill(topLightFill(0xfffaf0, { highlight: 0.05, dark: 0.14 })).stroke({ width: 4, color: 0xd8c7a6 })
  view.addChild(karm)

  // Golvljus från fönstret — ligger UTANFÖR fönster-containern, ritas av anroparen över golvet.
  const ljus = new Graphics()
  ljus.moveTo(930, FLOOR_Y + 4).lineTo(1190, FLOOR_Y + 4).lineTo(1100, 716).lineTo(770, 716).closePath().fill(0xfff1b0)
  ljus.alpha = 0
  ljus.eventMode = 'none'

  // Allt utomhus, klippt mot glaset.
  const ute = new Container()
  const mask = new Graphics().roundRect(x, y, w, h, 6).fill(0xffffff)
  ute.mask = mask
  view.addChild(ute, mask)

  const sky = new Graphics().rect(x, y, w, h).fill(verticalFill(0xd8ecf8, 0xffffff))
  ute.addChild(sky)

  // Sol: sken + roterande strålar + klot.
  const sol = new Container()
  sol.position.set(x + w - 72, y + 72)
  const solSken = new Graphics().circle(0, 0, 56).fill({ color: 0xffe9a0, alpha: 0.35 })
  const stralar = new Graphics()
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6
    stralar.moveTo(Math.cos(a - 0.1) * 40, Math.sin(a - 0.1) * 40)
      .lineTo(Math.cos(a) * 62, Math.sin(a) * 62)
      .lineTo(Math.cos(a + 0.1) * 40, Math.sin(a + 0.1) * 40)
      .closePath().fill({ color: 0xffe27a, alpha: 0.9 })
  }
  const solKlot = new Graphics().circle(0, 0, 30).fill(sphereFill(0xffd35c, { highlight: 0.4, dark: 0.16 }))
  sol.addChild(solSken, stralar, solKlot)
  ute.addChild(sol)

  // Moln: tre, var och ett en behållare med puffar (varje puff en egen ellips → egen gradient).
  const moln = []
  for (const [mx, my, ms, fart] of [[60, 58, 1, 0.12], [180, 116, 0.74, 0.08], [250, 40, 0.6, 0.16]]) {
    const c = new Container()
    c.position.set(x + mx, y + my)
    const g = new Graphics()
    for (const [dx, dy, r] of [[-30, 4, 22], [-4, -8, 27], [23, 2, 20], [44, 8, 14]]) {
      g.ellipse(dx * ms, dy * ms, r * ms, r * ms * 0.72).fill(sphereFill(0xffffff, { highlight: 0.06, dark: 0.12 }))
    }
    c.addChild(g)
    c._fart = fart
    c._puffG = g
    ute.addChild(c)
    moln.push(c)
  }

  // Kullar (ett Graphics, en tint) och ett träd som kan böja sig i blåst.
  const kullar = new Graphics()
  kullar.ellipse(x + 60, y + h - 18, 170, 62).fill(topLightFill(0xffffff, { highlight: 0.06, dark: 0.2 }))
  kullar.ellipse(x + 240, y + h - 12, 150, 50).fill(topLightFill(0xffffff, { highlight: 0.06, dark: 0.16 }))
  kullar.rect(x, y + h - 26, w, 28).fill(topLightFill(0xffffff, { highlight: 0.04, dark: 0.22 }))
  ute.addChild(kullar)

  const trad = new Container()
  trad.position.set(x + 74, y + h - 30)
  const stam = new Graphics().roundRect(-6, -74, 12, 78, 4).fill(cylinderFill(0x8a5a3b)).stroke({ width: 2, color: 0x5d3b25 })
  const krona = new Graphics()
  for (const [cx0, cy0, r] of [[-24, -86, 26], [22, -90, 24], [0, -112, 29], [-2, -80, 27]]) {
    krona.circle(cx0, cy0, r).fill(sphereFill(0xffffff, { highlight: 0.06, dark: 0.2 }))
  }
  trad.addChild(stam, krona)
  ute.addChild(trad)

  // Regn, snö och löv — samma pool-mönster som spelets gamla fallande partiklar, nu inne i glaset.
  const rand = (lo, hi) => lo + Math.random() * (hi - lo)
  const regn = []
  for (let i = 0; i < 18; i++) {
    const d = new Graphics().roundRect(-2, -11, 4, 22, 2).fill({ color: 0x5fa8d6, alpha: 0.85 })
    d.x = rand(x, x + w)
    d.y = rand(y, y + h)
    d._fart = 7 + Math.random() * 4
    d.visible = false
    ute.addChild(d)
    regn.push(d)
  }
  const sno = []
  for (let i = 0; i < 18; i++) {
    const s = new Graphics().circle(0, 0, 3.5 + Math.random() * 3.5).fill({ color: 0xffffff, alpha: 0.95 })
    s._bx = rand(x, x + w)
    s.x = s._bx
    s.y = rand(y, y + h)
    s._fart = 0.9 + Math.random() * 1.0
    s._amp = 8 + Math.random() * 14
    s._ph = Math.random() * Math.PI * 2
    s.visible = false
    ute.addChild(s)
    sno.push(s)
  }
  const lov = []
  for (let i = 0; i < 8; i++) {
    const l = new Graphics()
    l.ellipse(0, 0, 9, 5).fill([0xe08a3c, 0xd9b43c, 0xb85c2c, 0x8fb84a][i % 4])
    l.moveTo(-9, 0).lineTo(-14, 2).stroke({ width: 2, color: 0x7a5230 })
    l.x = rand(x, x + w)
    l.y = rand(y + 10, y + h - 40)
    l._fart = 2.6 + Math.random() * 2.2
    l._ph = Math.random() * Math.PI * 2
    l.visible = false
    ute.addChild(l)
    lov.push(l)
  }

  // Glasreflex överst i glaset.
  const reflex = new Graphics()
  reflex.moveTo(x + 22, y + h).lineTo(x + 92, y).lineTo(x + 118, y).lineTo(x + 48, y + h).closePath().fill({ color: 0xffffff, alpha: 0.15 })
  reflex.moveTo(x + 132, y + h).lineTo(x + 186, y).lineTo(x + 196, y).lineTo(x + 142, y + h).closePath().fill({ color: 0xffffff, alpha: 0.1 })
  ute.addChild(reflex)

  // Spröjs + innerkarm framför glaset.
  const sprojs = new Graphics()
  sprojs.roundRect(x - 3, y - 3, w + 6, h + 6, 8).stroke({ width: 8, color: 0xf3e8d0 })
  sprojs.rect(x + w / 2 - 6, y, 12, h).fill(cylinderFill(0xfff8ea, { axis: 'y', dark: 0.12 }))
  sprojs.rect(x, y + h / 2 - 6, w, 12).fill(cylinderFill(0xfff8ea, { axis: 'x', dark: 0.12 }))
  view.addChild(sprojs)

  // Gardinstång + gardiner (svajar i blåst) + fönsterbräda + kruka.
  const stang = new Graphics()
  stang.roundRect(x - 74, y - 40, w + 148, 12, 6).fill(cylinderFill(0x8a5a3b, { axis: 'x' }))
  stang.circle(x - 78, y - 34, 10).fill(sphereFill(0xb07a48))
  stang.circle(x + w + 78, y - 34, 10).fill(sphereFill(0xb07a48))
  view.addChild(stang)

  const H = h + 74
  const gardin = (gx) => {
    const c = new Container()
    c.position.set(gx, y - 32)
    const g = new Graphics()
    g.moveTo(0, 0).lineTo(58, 0).lineTo(52, H - 8)
      .quadraticCurveTo(38, H + 10, 26, H - 6)
      .quadraticCurveTo(12, H + 12, 0, H - 4).closePath()
      .fill(cylinderFill(0xf08a7e, { axis: 'x', dark: 0.22, highlight: 0.28 }))
      .stroke({ width: 3, color: 0xc4685e })
    for (const fx of [16, 32, 46]) g.moveTo(fx, 8).lineTo(fx - 2, H - 14).stroke({ width: 2, color: 0xc4685e, alpha: 0.4 })
    g.roundRect(-2, H * 0.55, 62, 12, 6).fill(0xfff0d0).stroke({ width: 2, color: 0xc9a86a })
    c.addChild(g)
    return c
  }
  const gardinV = gardin(x - 62)
  const gardinH = gardin(x + w + 4)
  view.addChild(gardinV, gardinH)

  const brada = new Graphics()
  brada.roundRect(x - 40, y + h + 22, w + 80, 22, 8).fill(topLightFill(0xfff4de, { highlight: 0.1, dark: 0.16 })).stroke({ width: 3, color: 0xd8c7a6 })
  view.addChild(brada)

  const kruka = new Container()
  kruka.position.set(x + 36, y + h + 22)
  const kg = new Graphics()
  for (const a of [-0.9, -0.42, 0, 0.42, 0.9]) {
    const sx = Math.sin(a)
    const cy = Math.cos(a)
    kg.moveTo(0, -30)
      .quadraticCurveTo(sx * 34 - 9, -30 - cy * 40, sx * 42, -30 - cy * 58)
      .quadraticCurveTo(sx * 34 + 9, -30 - cy * 36, 0, -30)
      .fill(topLightFill(0x5bbf6a, { highlight: 0.2, dark: 0.22 }))
  }
  kg.moveTo(-17, -28).lineTo(17, -28).lineTo(12, 0).lineTo(-12, 0).closePath().fill(cylinderFill(0xd2734a, { axis: 'y' })).stroke({ width: 2.5, color: 0x9a4d2c })
  kg.roundRect(-20, -34, 40, 9, 4).fill(topLightFill(0xe08a5c, { highlight: 0.2 })).stroke({ width: 2, color: 0x9a4d2c })
  kruka.addChild(kg)
  view.addChild(kruka)

  const st = { wind: 0.15, ljusMal: 0 }

  return {
    view,
    ljus,

    // Ställ in vädret utanför fönstret. `snap` = ingen tonad övergång (första bygget).
    apply(look, snap = false) {
      sky.tint = look.sky
      kullar.tint = look.hill
      krona.tint = look.crown
      moln.forEach((c, i) => {
        const t = look.moln[i]
        c.visible = t != null
        if (t != null) c._puffG.tint = t
      })
      sol.visible = !!look.sol
      for (const d of regn) d.visible = !!look.regn
      for (const s of sno) s.visible = !!look.sno
      for (const l of lov) l.visible = !!look.lov
      st.wind = look.wind
      st.ljusMal = look.ljus
      ute.alpha = snap ? 1 : 0
      if (snap) ljus.alpha = look.ljus
    },

    // dt = ticker.deltaTime (bildrutor à 1/60 s), t = sekunder sedan start.
    update(dt, t) {
      if (ute.destroyed) return
      const wind = st.wind
      if (ute.alpha < 1) ute.alpha = Math.min(1, ute.alpha + dt * 0.06)
      ljus.alpha += (st.ljusMal - ljus.alpha) * Math.min(1, dt * 0.06)

      if (sol.visible) stralar.rotation += 0.004 * dt

      for (const c of moln) {
        if (!c.visible) continue
        c.x += c._fart * (0.5 + wind * 3.2) * dt
        if (c.x > x + w + 90) c.x = x - 90
      }

      // Trädet: lugn gunga, i blåst en tydlig böj som kommer i vindpuffar.
      const puff = 0.6 + 0.4 * Math.sin(t * 0.9 + 1.3)
      trad.rotation = Math.sin(t * (1.1 + wind * 2.6)) * (0.012 + 0.08 * wind * puff) + wind * 0.05 * puff
      gardinV.rotation = Math.sin(t * 0.9) * 0.008 + wind * Math.sin(t * 2.1 + 1) * 0.03
      gardinH.rotation = Math.sin(t * 0.9 + 2) * -0.008 + wind * Math.sin(t * 2.3) * -0.03
      kruka.rotation = Math.sin(t * 1.6) * 0.012 + wind * Math.sin(t * 3.1) * 0.05

      if (regn[0].visible) {
        for (const d of regn) {
          d.y += d._fart * dt * 1.4
          if (d.y > y + h + 12) {
            d.y = y - 12
            d.x = x + Math.random() * w
          }
        }
      }
      if (sno[0].visible) {
        for (const s of sno) {
          s._ph += 0.04 * dt
          s.y += s._fart * dt
          s.x = s._bx + Math.sin(s._ph) * s._amp
          if (s.y > y + h + 10) {
            s.y = y - 10
            s._bx = x + Math.random() * w
          }
        }
      }
      if (lov[0].visible) {
        for (const l of lov) {
          l._ph += 0.07 * dt
          l.x += l._fart * dt
          l.y += Math.sin(l._ph) * 1.1 * dt
          l.rotation = Math.sin(l._ph * 0.8) * 1.2
          if (l.x > x + w + 16) {
            l.x = x - 16
            l.y = y + 10 + Math.random() * (h - 60)
          }
        }
      }
    },

    destroy() {
      // Masken måste lossas innan noderna rivs — en mask som pekar på en förstörd nod är en
      // tyst renderarfälla som `_alive` inte fångar.
      if (!ute.destroyed) ute.mask = null
    },
  }
}
