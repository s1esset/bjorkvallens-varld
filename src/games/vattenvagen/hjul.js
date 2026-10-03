// Vattenhjulet vid kranen (FYSIKPLAN F6a, kund 2): ett skovelhjul som snurrar av strålen.
//
// Ren fysik — ingen Pixi, inget ljud, ingen gsap (spelet äger vyn och ljuden), så att
// `scripts/_dag-vattenvagen-hjul.mjs` kör EXAKT den här koden i Node.
//
// DELARNA, och vem som gör vad:
//   · en matter-kropp (cirkel i navet) i en egen `PhysicsWorld` utan tyngd och väggar, fastnålad i
//     världen med `phys.gangjarn` — hjulet får snurra fritt runt sin axel, `frictionAir` är lagret;
//   · `fluid.foljKroppar(phys, [{ body, form }])` ger skovlarna som kolliderare i vätskan: strålen
//     delas av en skovel, den trycker undan vatten som en riktig planka (F6a);
//   · VÄTSKAN knuffar aldrig en kropp i libbet (F6b är inte byggd), så det som får hjulet att gå runt
//     är lokalt här: `_koppla()` läser partiklarnas fart (`fluid.vx/vy`) i skovelringen och lägger
//     ett vridmoment på kroppen i `phys.beforeStep` — en gång per FAST steg, aldrig per bildruta.
//     Kopplingen är ett motstånd mot RELATIV fart (partikelns fart minus skovelns egen fart där den
//     ligger), så samma tal driver hjulet när strålen träffar och bromsar det när det snurrar fortare
//     än vattnet. Det här borde lyftas till `lib/vatska.js` som F6b om fler spel vill ha det.
//
// MOMENTET är ett Δω (rad/steg) som räknas om till matters enhet: `body.torque = Δω / (invTröghet · STEG2)`.
import { PhysicsWorld, Body, STEG2 } from '../../lib/physics.js'

export const HJUL_R = 31 // skovelspetsarnas radie (px)
export const HJUL_NAV = 12 // navets radie
export const HJUL_SKOVLAR = 6
const SKOVEL_L = 20 // radiell längd (r 13..33 → centrum på 23, hänger över spetsradien med 2 px)
const SKOVEL_T = 8 // tjocklek
const SKOVEL_C = 23 // skovelns centrum, avstånd från navet
const R_IN = 12
const R_UT = HJUL_R + 8 // vattnet som tas med i kopplingen: skovelringen + lite luft
const KOPPLING = 0.2 // Δω (rad/steg) per partikel vid referensavståndet och referensfarten, se _koppla
const REF_R = 24
const VIKT = 0.03 // samma sak för vatten som LIGGER på en skovel (fart ≈ 0): dess tyngd vrider hjulet — annars stannar det med vatten på sig
const VILA_FART = 1.2 // px/steg: långsammare än så ligger vattnet på skoveln
const MAX_DW = 0.012 // tak på fartändringen per steg
const MAX_FART = 0.11 // rad/steg (≈ 1,05 varv/s)
const LAGER = 0.02 // frictionAir — hjulet snurrar ut på ~3 s
const TREGHET = 0.14 // utjämning av vattnets moment (0 = stött, 1 = ingen): ett tungt hjul, inte ett som ryker med varje droppe

const klam = (v, a, b) => (v < a ? a : v > b ? b : v)

export class Vattenhjul {
  // x, y    navets läge (design)
  // vatska  FluidWorld som skovlarna ska ligga i och läsa strömmen ur
  // onKlick (n) anropas när en ny skovel passerar en 60°-gräns — n räknar uppåt/nedåt med varvriktningen
  constructor({ x, y, vatska, onKlick = null } = {}) {
    this.x = x
    this.y = y
    this._v = vatska
    this._onKlick = onKlick
    this._levande = true
    this.phys = new PhysicsWorld({ gravityY: 0, walls: [] })
    this.kropp = this.phys.circle(x, y, HJUL_NAV, { frictionAir: LAGER, density: 0.002, isSensor: true, label: 'vattenhjul' })
    this.led = this.phys.gangjarn(this.kropp, { x, y })
    this._unbind = this.phys.beforeStep(() => this._koppla())
    // Skovlarna: en låda per skovel (dx/dy/angle i kroppens eget system, vrids med body.angle) + navet.
    const form = [{ type: 'circle', r: HJUL_NAV - 1 }]
    for (let i = 0; i < HJUL_SKOVLAR; i++) {
      const a = (i * 2 * Math.PI) / HJUL_SKOVLAR
      form.push({ type: 'box', w: SKOVEL_L, h: SKOVEL_T, dx: Math.cos(a) * SKOVEL_C, dy: Math.sin(a) * SKOVEL_C, angle: a })
    }
    this._fk = vatska.foljKroppar(this.phys, [{ body: this.kropp, form }])
    this._klickN = 0
    this.moment = 0 // senaste (utjämnade) Δω från vattnet (för en mätning)
    this._dwF = 0
    this.traffar = 0 // antal partiklar i skovelringen senaste steget
  }

  get vinkel() {
    return this.kropp.angle
  }

  // rad/steg, positivt = medurs på skärmen
  get fart() {
    return this.kropp.angularVelocity
  }

  // Varje bildruta, FÖRE `vatska.update` (som läser skovlarnas läge först av allt).
  steg(deltaMS) {
    if (!this._levande) return
    this.phys.update(deltaMS)
    const n = Math.floor(this.kropp.angle / (Math.PI / 3))
    if (n !== this._klickN) {
      this._klickN = n
      this._onKlick?.(n)
    }
  }

  // Ett tryck: en liten knuff som får hjulet att snurra ut (stöt → rörelse → vila).
  stota(riktning = 1, styrka = 0.07) {
    if (!this._levande) return
    const v = klam(this.kropp.angularVelocity + (riktning < 0 ? -1 : 1) * styrka, -MAX_FART, MAX_FART)
    Body.setAngularVelocity(this.kropp, v)
  }

  // Vattnets moment, i fysikens egna steg. Vätskan läses, aldrig skrivs.
  _koppla() {
    const w = this._v
    const b = this.kropp
    const om = b.angularVelocity
    const hx = b.position.x
    const hy = b.position.y
    const a0 = b.angle
    const rIn2 = R_IN * R_IN
    const rUt2 = R_UT * R_UT
    const sektor = (2 * Math.PI) / HJUL_SKOVLAR
    let dw = 0
    let n = 0
    for (let i = 0; i < w.count; i++) {
      const dx = w.x[i] - hx
      const dy = w.y[i] - hy
      const d2 = dx * dx + dy * dy
      if (d2 < rIn2 || d2 > rUt2) continue
      // närmast en skovel? (vattnet mellan två skovlar fastnar inte i hjulet)
      let da = (Math.atan2(dy, dx) - a0) % sektor
      if (da < 0) da += sektor
      const avst = Math.min(da, sektor - da) // 0 = mitt på en skovel
      const vikt = klam(1 - avst / 0.62, 0, 1)
      if (vikt <= 0) continue
      n++
      // skovelns egen fart där partikeln ligger: ω × r
      const wx = w.vx[i] + om * dy
      const wy = w.vy[i] - om * dx
      dw += (vikt * KOPPLING * (dx * wy - dy * wx)) / (REF_R * REF_R)
      if (w.vx[i] * w.vx[i] + w.vy[i] * w.vy[i] < VILA_FART * VILA_FART) dw += (vikt * VIKT * dx * w.gravityY) / (REF_R * REF_R) * 24
    }
    this.traffar = n
    dw = klam(dw, -MAX_DW, MAX_DW)
    // håll farten under taket: ett moment som skulle driva förbi det klipps
    if ((om + dw > MAX_FART && dw > 0) || (om + dw < -MAX_FART && dw < 0)) dw = klam(dw, -MAX_FART - om, MAX_FART - om)
    this._dwF += (dw - this._dwF) * TREGHET
    dw = this._dwF
    this.moment = dw
    if (dw !== 0) b.torque += dw / (b.inverseInertia * STEG2)
    // vilan: en hjulaxel utan vatten och utan fart står stilla (ingen evig mikrorörelse)
    if (n === 0 && Math.abs(om) < 0.0015) Body.setAngularVelocity(b, 0)
  }

  destroy() {
    if (!this._levande) return
    this._levande = false
    this._unbind?.()
    this._unbind = null
    this._fk?.stoppa()
    this.led?.ta()
    this.phys?.destroy()
    this._onKlick = null
    this._v = null
  }
}

// Ritar hjulets rörliga del (nav, ekrar, skovlar) centrerad i origo. Samma tal som kolliderarna:
// skovlarna ligger på radie 13–33 (centrum 23), 20×8 px.
export function ritaHjul(g) {
  g.clear()
  const TRA = 0xc98a4b
  const TRA_KANT = 0x6f4521
  const TRA_LJUS = 0xf0c58a
  // ekrar
  for (let i = 0; i < HJUL_SKOVLAR; i++) {
    const a = (i * 2 * Math.PI) / HJUL_SKOVLAR
    g.moveTo(0, 0).lineTo(Math.cos(a) * 16, Math.sin(a) * 16).stroke({ width: 7, color: TRA_KANT, cap: 'round' })
  }
  // skovlar: en kantlinje under, brädan ovanpå och en ljus kant
  for (let i = 0; i < HJUL_SKOVLAR; i++) {
    const a = (i * 2 * Math.PI) / HJUL_SKOVLAR
    const cx = Math.cos(a) * SKOVEL_C
    const cy = Math.sin(a) * SKOVEL_C
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    // brädan är en 20×8 rektangel vriden `a` runt sitt centrum: fyra hörn
    const hl = SKOVEL_L / 2
    const ht = SKOVEL_T / 2
    const hn = [[-hl, -ht], [hl, -ht], [hl, ht], [-hl, ht]].map(([u, v]) => [cx + u * ca - v * sa, cy + u * sa + v * ca])
    g.poly(hn.flat()).fill(TRA).stroke({ width: 2.5, color: TRA_KANT, join: 'round' })
    const ljus = [[-hl + 2, -ht + 1.5], [hl - 2, -ht + 1.5], [hl - 2, -ht + 3.5], [-hl + 2, -ht + 3.5]].map(([u, v]) => [cx + u * ca - v * sa, cy + u * sa + v * ca])
    g.poly(ljus.flat()).fill({ color: TRA_LJUS, alpha: 0.7 })
  }
  // nav
  g.circle(0, 0, HJUL_NAV).fill(0xe0a93a).stroke({ width: 3, color: 0x7a5a1a })
  g.circle(-3, -3, 4).fill({ color: 0xffffff, alpha: 0.55 })
  g.circle(0, 0, 3.2).fill(0x7a5a1a)
}
