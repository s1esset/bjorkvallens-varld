// VÄRME — hur varmt något ÄR, och hur färdigt det har HUNNIT BLI (LYFTPLAN, spår 3).
//
// Appen hade noll representation av värme. `lagerelden` räknade en enda skalär `_toast`
// som steg när marshmallowen låg nära lågan, och den skalären fick göra tre jobb
// samtidigt: färgen, mjukheten och målet. Det gör att ett föremål som lyfts UR elden
// fortsätter vara lika slappt som när det låg i den — sockret "vet" inte att det svalnar.
//
//   this._varme = new Varmefalt({ avsvalning: 1.6 })
//   this._varme.lagg('marsh')
//   ...varje bildruta:
//   this._varme.kalla('eld', { x: hotX, y: hotY, radie: hotR, styrka: 0.1 + heat * 0.18 })
//   this._varme.flytta('marsh', marsh.x, marsh.y)
//   this._varme.steg(dtF)
//   soft.mjukhet(this._varme.temp('marsh') * 0.9)   // svalnar → stelnar igen
//   if (this._varme.grad('marsh') >= 1) klart()     // hunnen gradning står kvar
//
// TVÅ TAL, INTE ETT — och det är hela poängen med modulen:
//
//   temp   0..1  hur varmt föremålet är JUST NU. Stiger mot fältet, faller mot 0 när
//                man drar undan det. Driver utseende och känsla: glöd, mjukhet, ånga.
//   grad   0..1  hur färdigt det har hunnit bli. **SJUNKER ALDRIG.** Driver målet.
//
// Att låta `temp` styra målet vore ett P0-brott: barnet som lyfter upp marshmallowen
// för att titta på den skulle se sitt arbete rinna tillbaka, alltså ett misslyckande
// som nollställer. Att låta `grad` styra utseendet är det fel som finns i dag. Med två
// tal får man både svalnandet (som syns) och tryggheten (som räknas).
//
// GRADNINGEN RÄKNAS PÅ NÄRHETEN, INTE PÅ TEMPERATUREN. Det ser bakvänt ut en sekund,
// men är avsiktligt: en uppvärmningskurva mellan fältet och gradningen hade tyst gjort
// varje redan trimmat spel långsammare. Närheten är samma tal spelen redan räknade, så
// balansen är oförändrad — mätbart, inte ungefär (se `scripts/_varmeprobe.mjs`).
//
// Rena tal. Ingen Pixi, inga tweens, inga timers; `steg()` efter `destroy()` gör
// ingenting. Källor är namngivna och sätts om varje bildruta — en eld som svajar i
// vinden är samma källa på en ny plats, inte en ny källa.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

export class Varmefalt {
  // uppvarmning  hur snabbt `temp` söker sig mot fältets värde (per sekund, exponentiellt)
  // avsvalning   hur snabbt `temp` faller mot `ambient` utanför fältet (per sekund)
  // ambient      omgivningens värme (0 = rumstempererat)
  constructor({ uppvarmning = 3, avsvalning = 1.6, ambient = 0 } = {}) {
    this.uppvarmning = uppvarmning
    this.avsvalning = avsvalning
    this.ambient = ambient
    this._kallor = new Map()
    this._saker = new Map()
    this._alive = true
  }

  // Skapa ELLER flytta/tuna en källa. `styrka` är gradning per sekund i källans mitt.
  kalla(namn, { x = 0, y = 0, radie = 100, styrka = 1 } = {}) {
    const k = this._kallor.get(namn)
    if (k) {
      k.x = x
      k.y = y
      k.radie = radie
      k.styrka = styrka
      return k
    }
    const ny = { x, y, radie, styrka }
    this._kallor.set(namn, ny)
    return ny
  }

  taKalla(namn) {
    this._kallor.delete(namn)
  }

  lagg(namn, { x = 0, y = 0, temp = 0, grad = 0 } = {}) {
    const rec = { x, y, temp, grad, narhet: 0 }
    this._saker.set(namn, rec)
    return rec
  }

  flytta(namn, x, y) {
    const s = this._saker.get(namn)
    if (s) {
      s.x = x
      s.y = y
    }
  }

  ta(namn) {
    this._saker.delete(namn)
  }

  // Ny marshmallow på pinnen: kall och orörd. (Att skapa om hela fältet hade slängt
  // källorna med, och de hör till elden — inte till det som rostas.)
  nollstall(namn) {
    const s = this._saker.get(namn)
    if (s) {
      s.temp = 0
      s.grad = 0
      s.narhet = 0
    }
  }

  // En SKVÄTT kallt (eller hett) rakt i något — en isbit i grytan, en klick smör i
  // pannan. Rör BARA `temp`, aldrig `grad`: det barnet redan hunnit göra får inte
  // rinna tillbaka (P0 "misslyckande som nollställer"). Delta i samma enhet som temp,
  // så en uppmätt mängd kan delas per partikel/gram och summeras.
  knuff(namn, delta) {
    const s = this._saker.get(namn)
    if (!s) return 0
    const fore = s.temp
    s.temp = clamp(s.temp + delta, 0, 1)
    return s.temp - fore
  }

  temp(namn) {
    return this._saker.get(namn)?.temp ?? 0
  }

  grad(namn) {
    return this._saker.get(namn)?.grad ?? 0
  }

  // 0..1 — hur nära den närmaste källans mitt föremålet ligger, just nu.
  narhet(namn) {
    return this._saker.get(namn)?.narhet ?? 0
  }

  // dtF = bildrutor (16,67 ms = 1), samma enhet som mjukkropp/rep använder.
  steg(dtF = 1) {
    if (!this._alive) return
    const sek = dtF / 60
    for (const s of this._saker.values()) {
      let narhet = 0
      let takt = 0
      for (const k of this._kallor.values()) {
        const d = Math.hypot(k.x - s.x, k.y - s.y)
        if (d >= k.radie) continue
        const n = 1 - d / k.radie
        if (n > narhet) narhet = n
        takt += k.styrka * n // flera eldar värmer TILLSAMMANS
      }
      s.narhet = narhet
      s.grad = clamp(s.grad + takt * sek, 0, 1)
      // Temperaturen söker sig mot närheten när något värmer, mot omgivningen annars.
      // Exponentiellt och bildrutefritt: 30 och 60 fps ger samma kurva.
      const mal = narhet > 0 ? Math.max(narhet, this.ambient) : this.ambient
      const takten = narhet > 0 ? this.uppvarmning : this.avsvalning
      s.temp += (mal - s.temp) * (1 - Math.exp(-takten * sek))
    }
  }

  destroy() {
    this._alive = false
    this._kallor.clear()
    this._saker.clear()
  }
}
