// BOWLINGENS VINDBY — auto-hjälpens "glada vindpust" som en SYNLIG luftström (lib/vind.js, Vindfalt, F4).
//
// Förut: efter andra kastet fick varje kvarstående kägla en slumpvinkel-knuff (`nudge`, 9 px/steg)
// och en global `setWind` — käglorna föll av en osynlig orsak. Nu är hjälpen en BY: luft i ett
// vågrätt band tvärs över kägeldäcket, från den sida käglorna INTE ska åt, som tar i käglorna
// (och bara dem — klotet står stilla ändå). Barnet ser strömmen, ser käglorna luta sig och glida,
// och ser dem falla. Hjälpen är lika säker som förut: en kägla som vinden ändå inte fått iväg
// får en sista bärande knuff i vindens riktning (`barKvar`) och backstoppet i index.js tippar rest.
//
// Ren matematik + matter (ingen Pixi) så att `scripts/_bowlingvindprobe.mjs` kör EXAKT spelets kod.
import { Vindfalt } from '../../lib/vind.js'
import { nudge } from '../../lib/physics.js'

export const BY_STEG = 84 // byns längd i fysiksteg (1,4 s) — sinus-kuvert, toppen mitt i
export const BY_LUFT = 16 // luftens fart i bandets mitt, px/steg. Kägla: frictionAir 0,02 → fa·w = 0,32 px/steg²
export const BANDKANT_X = 326 // vänster rand (källan när vinden blåser åt vänster = höger kant 954)
export const BANDKANT_X2 = 954
export const BAND_RACKVIDD = BANDKANT_X2 - BANDKANT_X // 628: hela banans bredd
export const MIN_HALV = 96
export const KNOCK_DIST = 38 // samma tal som index.js: förskjutning (px) innan en kägla räknas som vält
export const KNOCK_FART = 6.5

// Fältet. `aktiv: true` men `styrka: 0` — luften finns först när en by blåser (`pust`).
export function nyVindby(phys) {
  return new Vindfalt({
    varld: phys,
    form: { typ: 'band', x: BANDKANT_X, y: 260, rackvidd: BAND_RACKVIDD, halvhojd: MIN_HALV },
    luft: { x: BY_LUFT, y: 0 },
    avtag: { langs: 0.25, tvars: 0.3 },
    filter: (b) => b.label === 'pin',
    styrka: 0,
    aktiv: true,
  })
}

// Vilken väg byn blåser: åt den sida där de kvarstående käglorna redan står (kortast väg in i
// rännan, samma regel som den gamla vindpusten). −1 = åt vänster, +1 = åt höger.
export function byRiktning(kvar) {
  if (!kvar.length) return 1
  const mx = kvar.reduce((s, p) => s + p.x, 0) / kvar.length
  return mx < 640 ? -1 : 1
}

// Ställ bandet över de kvarstående käglorna och starta byn. `kvar` = [{x, y}]. Returnerar riktningen.
export function startaBy(vind, kvar, { steg = BY_STEG, styrka = 1 } = {}) {
  const dir = byRiktning(kvar)
  const ys = kvar.map((p) => p.y)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  vind.form.y = (y0 + y1) / 2
  vind.form.halvhojd = Math.max(MIN_HALV, (y1 - y0) / 2 + 74)
  // Källan sitter på sidan käglorna blåser FRÅN: åt vänster → högra kanten, och tvärtom.
  vind.flytta(dir < 0 ? BANDKANT_X2 : BANDKANT_X, vind.form.y)
  vind.luft.x = BY_LUFT * dir
  vind.luft.y = 0
  vind.rikta(dir < 0 ? Math.PI : 0)
  vind.pust(steg, styrka)
  return dir
}

// Stopp med en gång (nytt varv, strike, rivning).
export function stoppaBy(vind) {
  if (!vind) return
  vind.pust(1, 0) // en by med styrka 0 ersätter den pågående; den går ut efter ett steg
}

export function byPagar(vind) {
  return !!vind && vind.faktor > 0.001
}

// Sista bärande knuff åt vindens håll för en kägla som fältet inte fått att lämna sin plats —
// samma sak som byn gör, bara avslutad: fart i vindens riktning (aldrig en slumpvinkel).
export function barKvar(kropp, dir, fart = 9) {
  nudge(kropp, dir * fart, -0.4)
}
