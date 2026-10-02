// YTVAG — en vattenyta som ett 1D-höjdfält (FYSIKPLAN F5). Rena tal, ingen Pixi, ingen matter.
//
//   const yta = new Ytvag({ n: 41, x0: 120, x1: 1160, ytY: 330, sprid: 0.08, k: 0.021, damp: 0.972, max: 20 })
//   yta.stot(x, 2.2)                  // ett tryck NER vid x (negativt = ett poppande lyft uppåt)
//   yta.vila(ankaX, 4, 3 * yta.dx)    // en dell: ytans VILOLÄGE, deklareras varje bildruta
//   const ritaOm = yta.uppdatera(tk.deltaMS)   // fast steg via Takt · sant medan ytan rör sig
//   yta.hojd(x)  yta.avvikelse(x)     // vågen + dellen · bara vågen (flytaren rider på det)
//   yta.path(g, { x0, x1 })           // moveTo/lineTo längs ytan — du fyller/strokar själv
//
// Byggt av två handbyggda fält (`pruttbad` och `grodan-slurp/dammen`) som löste samma fyra fällor
// var för sig (minnet "Ytvågor via höjdfält"):
//  1. EN STÖT PER BILDRUTA ÄR EN KONSTANT KRAFT, inte en våg: jämvikten blir insatsen / (1 − damp)
//     ≈ 36×. Allt som tillförs per bildruta ska vara ~1/36 av utslaget du vill ha.
//  2. EN DELL SOM DRAS MOT ETT MÅLDJUP ÄR EN ENERGIKÄLLA (kämpar mot fjädern för alltid). Därför
//     är `vila()` fältets VILOLÄGE och fältet bär bara AVVIKELSEN `h` — den kan gå till exakt noll,
//     och vågor uppstår av att viloläget FLYTTAR SIG (`vilaKop` × förflyttningen blir fart).
//  3. DÄMPNINGEN SIST, efter spridningen — annars sitter Nyquist-moden nästan instabil.
//  4. OMRITNINGEN STYRS AV RÖRELSE (max|fart|), inte av utslag: en dell som ligger still är inte
//     en yta som ändrar sig. `uppdatera()` returnerar sant medan det rör sig + EN gång till.
// Och FAST TIDSSTEG (fällan från Mjukkropp): fjäder och dämpning räknas per steg, så `Takt` stegar
// alltid exakt 1 — en tappad bildruta får inte ge en annan jämvikt.
//
// ⚠️ Lång våglängd klingar av på ~6 s (1,13 → 0,67 → 0,30 → 0,19 → 0,085 → 0,040 → 0,010 med
// 0,7 s mellanrum). En mätning som väntar 4 s dömer ett friskt fält.
//
// Allt är opt-in: förvalen återger dammens fält (stötprofil 1 · 0,6 · 0,25, kantstötar tappas,
// ingen vilogrind). `pruttbad` sätter `stotProfil: [1, 0.55]`, `stotKlamma: true`, `vilaTrosk: 0.25`.
import { Takt } from './takt.js'

const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)

export class Ytvag {
  constructor({
    n = 41, // stödpunkter
    x0 = 0, // x för första stödpunkten
    x1 = 1280, // x för sista
    ytY = 0, // vilonivåns y (för path/yta())
    sprid = 0.08, // hur fort en våg vandrar i sidled (ETT pass)
    k = 0.021, // fjäder mot viloläget
    damp = 0.972, // dämpning per steg (sist)
    max = 20, // utslagstak för avvikelsen
    stotProfil = [1, 0.6, 0.25], // stötens vikt på mittpunkten, ±1, ±2 …
    stotKlamma = false, // true: en stöt utanför kanten läggs på kantpunkten · false: tappas
    vilaKop = 0.9, // hur mycket av ett flyttat viloläge som blir fart (1 = hela flytten)
    vilaTrosk = 0, // > 0: under det här utslaget (px) är ytan "i vila" och hojd()/avvikelse() ger 0
    rorTrosk = 0.02, // max|fart| över det här = ytan rör sig → ritas om
    maxSteg = 4, // tak på steg per bildruta (som Takt max)
  } = {}) {
    this.n = Math.max(2, n | 0)
    this.x0 = x0
    this.x1 = x1
    this.ytY = ytY
    this.dx = (x1 - x0) / (this.n - 1)
    this.sprid = sprid
    this.k = k
    this.damp = damp
    this.max = max
    this.stotProfil = stotProfil
    this.stotKlamma = stotKlamma
    this.vilaKop = vilaKop
    this.vilaTrosk = vilaTrosk
    this.rorTrosk = rorTrosk
    // h = AVVIKELSEN från viloläget (går till exakt noll) · v = fart · rest = viloläget (dellen)
    this.h = new Float32Array(this.n)
    this.v = new Float32Array(this.n)
    this.rest = new Float32Array(this.n)
    this._a = new Float32Array(this.n)
    this._dekl = new Float32Array(this.n) // viloläge deklarerat DEN HÄR bildrutan
    this._mal = new Float32Array(this.n) // viloläge som stegen läser
    this._takt = new Takt({ max: maxSteg })
    this.pa = false // utslag över vilaTrosk (eller en stöt nyss) — grind för att rita vågen alls
    this.rorlig = false // max|fart| över rorTrosk efter senaste uppdatera()
    this._smutsig = false
  }

  // x för stödpunkt i.
  xI(i) {
    return this.x0 + i * this.dx
  }

  // En stöt i ytan vid x. Positivt = nedåt (något slår i), negativt = uppåt (en bubbla poppar).
  // Stöten läggs som FART — kallas den varje bildruta är den en konstant kraft (se fälla 1).
  stot(x, kraft) {
    if (!Number.isFinite(x) || !Number.isFinite(kraft)) return
    let c = Math.round((x - this.x0) / this.dx)
    if (this.stotKlamma) c = klamp(c, 0, this.n - 1)
    const v = this.v
    const n = this.n
    const lagg = (j, f) => {
      if (j >= 0 && j < n) v[j] += f
    }
    const p = this.stotProfil
    lagg(c, kraft * p[0])
    for (let q = 1; q < p.length; q++) {
      lagg(c - q, kraft * p[q])
      lagg(c + q, kraft * p[q])
    }
    this.pa = true
  }

  // En dell i ytan: ett VILOLÄGE (px nedåt) med trekantsprofil, `bredd` px ut till noll.
  // ⚠️ DEKLARERA DEN VARJE BILDRUTA medan den ska finnas — en bildruta utan anrop = ingen dell,
  // och ytan stiger tillbaka. Flera anrop samma bildruta summeras. Det är viloläget som flyttar
  // sig som skapar vågen; en dell som ligger still ger ingen.
  vila(x, djup, bredd) {
    if (!Number.isFinite(x) || !Number.isFinite(djup) || !(bredd > 0)) return
    const B = bredd / this.dx
    const c = Math.round(klamp((x - this.x0) / this.dx, 0, this.n - 1))
    const r = Math.ceil(B) - 1
    for (let q = -r; q <= r; q++) {
      const i = c + q
      if (i < 0 || i >= this.n) continue
      if (Math.abs(q) < B) this._dekl[i] += djup * (1 - Math.abs(q) / B)
    }
  }

  // Ett fast steg: viloläget flyttas → fart, fjäder + grannspridning, dämpning SIST.
  _steg() {
    const { h, v, rest, _mal: mal, _a: a, n } = this
    for (let i = 0; i < n; i++) {
      const d = mal[i] - rest[i]
      if (d !== 0) {
        v[i] += d * this.vilaKop
        rest[i] = mal[i]
      }
    }
    for (let i = 0; i < n; i++) {
      const l = h[i > 0 ? i - 1 : 0]
      const r = h[i < n - 1 ? i + 1 : n - 1]
      a[i] = this.sprid * (l + r - 2 * h[i]) - this.k * h[i]
    }
    const M = this.max
    for (let i = 0; i < n; i++) {
      v[i] = (v[i] + a[i]) * this.damp
      h[i] = klamp(h[i] + v[i], -M, M)
    }
  }

  // Stegar ytan med fast tidssteg. Returnerar SANT när den ska ritas om: medan den rör sig,
  // plus en sista gång så slutformen hamnar i bild.
  uppdatera(deltaMS) {
    this._mal.set(this._dekl)
    this._dekl.fill(0)
    this._takt.kor(deltaMS, () => this._steg())
    const { h, v, rest, n } = this
    let maxH = 0
    let maxV = 0
    for (let i = 0; i < n; i++) {
      const hh = Math.abs(h[i] + rest[i])
      const vv = Math.abs(v[i])
      if (hh > maxH) maxH = hh
      if (vv > maxV) maxV = vv
    }
    this.pa = maxH > this.vilaTrosk
    this.rorlig = maxV > this.rorTrosk
    if (this.rorlig) {
      this._smutsig = true
      return true
    }
    if (this._smutsig) {
      this._smutsig = false
      return true
    }
    return false
  }

  // Ytans höjd vid x relativt vilonivån: vågen + dellen. Allt som ligger I ytan läser den här.
  hojd(x) {
    if (this.vilaTrosk > 0 && !this.pa) return 0
    const t = klamp((x - this.x0) / this.dx, 0, this.n - 1)
    const i = Math.floor(t)
    const j = Math.min(this.n - 1, i + 1)
    const f = t - i
    const a = this.h[i] + this.rest[i]
    const b = this.h[j] + this.rest[j]
    return a + (b - a) * f
  }

  // Bara vågen (avvikelsen), utan dellen. Ett föremål som SJÄLV gör dellen ska rida på det som
  // kommer utifrån — läser det sin egen grop sjunker det i den det gör.
  avvikelse(x) {
    if (this.vilaTrosk > 0 && !this.pa) return 0
    const t = klamp((x - this.x0) / this.dx, 0, this.n - 1)
    const i = Math.floor(t)
    const j = Math.min(this.n - 1, i + 1)
    return this.h[i] + (this.h[j] - this.h[i]) * (t - i)
  }

  // Ytans y vid x (ytY + hojd) — för den som inte vill lägga ihop själv.
  yta(x) {
    return this.ytY + this.hojd(x)
  }

  // Lägger ytan som en öppen väg i `g` (moveTo + lineTo var `steg` px från x0 till x1). Fyll eller
  // stroka själv; `extra(x)` läggs på höjden (t.ex. en omgivningsvåg som bara är bild) och `dy`
  // förskjuter hela linjen. Ingen arc() — inga pennfällor.
  path(g, { x0 = this.x0, x1 = this.x1, steg = 22, dy = 0, extra = null } = {}) {
    const y = (x) => this.ytY + dy + this.hojd(x) + (extra ? extra(x) : 0)
    g.moveTo(x0, y(x0))
    for (let x = x0 + steg; x < x1; x += steg) g.lineTo(x, y(x))
    g.lineTo(x1, y(x1))
    return g
  }

  // Ny runda: tillbaka till spegelblankt. Fyller på plats (arrayerna kan delas med andra).
  nollstall() {
    this.h.fill(0)
    this.v.fill(0)
    this.rest.fill(0)
    this._a.fill(0)
    this._dekl.fill(0)
    this._mal.fill(0)
    this._takt.nollstall()
    this.pa = false
    this.rorlig = false
    this._smutsig = false
  }
}
