// LANDA — saker som släpps från ovankanten och landar med tyngd (FYSIKPLAN P4).
//
//   const l = landa(inreBarn, { ticker: ctx.ticker, fran: -520, markY: 0, tyngd: 'stor',
//                               fordrojning: 160, onLand: (tyngd, slag) => { … } })
//   l.klar      // Promise → 'landad' | 'avbruten' | 'riven' (resolvas ALLTID, ingen kund hänger)
//   l.avbryt()  // barnet greppade mitt i fallet: noden ligger på markY OMEDELBART
//   l.destroy() // spelet rivs: tickern lossas, en levande nod läggs på marken, ingen svävar kvar
//
// Stort = DUNS (en enda tung studs, snabbt stilla), litet = STUDS (flera avtagande hopp).
// Ingen matter-värld: en boll med fast steg, stegad med `Takt` (samma bildfrekvens → samma kurva).
//
// KOORDINATER: `fran` och `markY` är värden för `noden.y` i NODENS EGET föräldrarum. Libbet skriver
// BARA `noden.y` — och bara den. Kör därför animationen i ett INRE BARN (`bild`) till det som
// `DragController.addTarget` fick: då står släppmålet och `hitArea` stilla medan bilden faller.
// Sitter det inre barnet i viloläget y = 0 är `markY: 0` och `fran` negativt (t.ex. −(markY_abs + 80)).
// Utelämnas `markY` är det nodens y vid anropet; utelämnas `fran` blir det markY − 600.
//
// LJUD OCH SKAK är kundens: `onLand(tyngd, slag)` anropas vid VARJE nedslag (`slag.nr` 0 = första,
// `slag.fart` px/s). Skaka scenen/bordet, spela duns eller plopp där. Libbet spelar ingenting och
// skalar inget (en klämd skala måste återställas, och den stjäl träffytan).
// `avbryt()` anropar INTE onLand — den körs ur kundens pekhanterare.
//
// Efter landningen står noden på EXAKT `markY` och `ticker.remove` är gjort — ingen lyssnare kvar.
// Utan `ticker` skapas ingen lyssnare; kunden anropar då `l.tick(deltaMS)` själv.

import { Takt } from './takt.js'

export const LANDA_STEG_MS = 1000 / 60
const DEL = 4 // delsteg per Takt-steg — nedslaget hittas inom ett delsteg, inte ett helt
const GRAV = 3000 // px/s² (ett fall på 400 px tar ~0,5 s och slår i med ~1550 px/s)

// restitution = andel av farten som studsar tillbaka. stor: en liten tung studs; liten: tydligt hopp.
export const TYNGDER = {
  stor: { studs: 0.12 },
  liten: { studs: 0.5 },
}
const STILLA_APEX = 0.6 // px — ett hopp lägre än så är inget hopp: lägg dem på marken

// Ren funktion av steg: ingen nod, ingen renderare — sonden driver den direkt.
// `steg(slag?)` kör ETT fast steg (1/60 s) och returnerar true när föremålet står still på markY.
export function skapaLandning({ fran, markY = 0, tyngd = 'liten', fordrojning = 0, studs } = {}) {
  const t = TYNGDER[tyngd] || TYNGDER.liten
  const e = Number.isFinite(studs) ? studs : t.studs
  const start = Number.isFinite(fran) ? fran : markY - 600
  let vanta = Math.max(0, Math.round((Number(fordrojning) || 0) / LANDA_STEG_MS))
  const s = {
    y: start,
    v: 0,
    slag: 0,
    klar: start >= markY, // redan på/under marken: inget fall
    steg(onSlag) {
      if (s.klar) return true
      if (vanta > 0) {
        vanta--
        return false
      }
      const h = LANDA_STEG_MS / 1000 / DEL
      for (let i = 0; i < DEL; i++) {
        s.v += GRAV * h
        s.y += s.v * h
        if (s.y >= markY) {
          const fart = s.v
          s.y = markY
          const ut = fart * e
          if (onSlag) onSlag(s.slag, fart)
          s.slag++
          if ((ut * ut) / (2 * GRAV) < STILLA_APEX) {
            s.v = 0
            s.klar = true
            return true
          }
          s.v = -ut
        }
      }
      return false
    },
    lagg() {
      s.y = markY
      s.v = 0
      s.klar = true
    },
  }
  if (s.klar) s.y = markY
  return s
}

export function landa(nod, { ticker = null, fran, markY, tyngd = 'liten', fordrojning = 0, onLand = null, studs } = {}) {
  const mark = Number.isFinite(markY) ? markY : nod.y
  const sim = skapaLandning({ fran, markY: mark, tyngd, fordrojning, studs })
  const takt = new Takt({ steg: LANDA_STEG_MS, max: 3 })
  let lyssnare = null
  let slut = null
  let lost
  const klar = new Promise((r) => (lost = r))

  const lev = () => nod && !nod.destroyed
  const stoppa = (orsak) => {
    if (slut) return
    slut = orsak
    if (lyssnare && ticker) ticker.remove(lyssnare)
    lyssnare = null
    sim.lagg()
    if (lev()) nod.y = mark // exakt markY, aldrig en rest av en tween eller ett halvt steg
    lost(orsak)
  }
  const skriv = () => {
    if (lev()) nod.y = sim.y
  }

  const tick = (d) => {
    if (slut) return
    if (!lev()) return stoppa('riven') // spelet rev noden under oss
    const ms = d && typeof d === 'object' ? d.deltaMS : d
    takt.kor(ms, () => {
      if (slut) return
      const klart = sim.steg((nr, fart) => {
        if (onLand) onLand(tyngd, { nr, fart })
      })
      if (klart) stoppa('landad')
    })
    if (!slut) skriv()
  }

  // Börja på `fran` direkt — annars syns föremålet en bildruta på sin vilplats före fallet.
  skriv()
  if (sim.klar) stoppa('landad')
  else if (ticker) {
    lyssnare = tick
    ticker.add(lyssnare)
  }

  return {
    klar,
    tick,
    get ar() {
      return !slut
    },
    avbryt() {
      stoppa('avbruten')
    },
    destroy() {
      stoppa('riven')
    },
  }
}
