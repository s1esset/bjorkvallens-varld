// FLÄKTENS LUFT — `lib/vind.js` (Vindfalt, F4) som flugans vindfält.
//
// Förut hade `index.js` en egen `_vindKraft(x, y)`: en kon framför fläkten och ett sug bakom
// den, handräknade. Formen och styrkan bor numera i `Vindfalt` (form `kon` + `sug`); den här
// filen är bara spelets tunna lim, och den ligger i en egen modul så att en Node-sond
// (`scripts/_flugvindprobe.mjs`) kan köra EXAKT samma kod som spelet — utan Pixi.
//
// ⚠️ FLUGAN ÄR INTE EN MATTER-KROPP. `Flugbana` är en egen integrator (`bana.vind()` lägger
//    pusten utanför fartspärren), så fältet byggs UTAN `varld` och stegar aldrig själv: spelet
//    läser `formVid(x, y)` (form + riktning, utan tidsfaktor) och äger tiden (`_vindT`).
//
// ⚠️ DET ENDA SOM INTE ÄR LIBBETS: utblåsets riktning. Konen har en vågrät axel (samma punkter
//    som HEAD:s rad — `_flugvindprobe` mäter att mängden är identisk), men fläkten står vid
//    y 536 och fönstret är en lucka högre upp. Rakt åt sidan drev flugorna FÖRBI fönstret,
//    så riktningen blandas 45 % mot fönstrets mitt, ordagrant som förut. Sugets riktning
//    (mot huvudet) är libbets egen.
import { Vindfalt } from '../../lib/vind.js'

export const FLAKT_RACKVIDD = 760 // px från huvudet där pusten fortfarande biter
export const FLAKT_HOJD = 260 // px halv konhöjd vid huvudet (den vidgar sig utåt)
export const FLAKT_SUG_RACK = 620 // px bakom gallret där insuget når
export const FLAKT_SUG_DEL = 0.62 // insugets styrka som andel av utblåsets
const SUG_TVARS = 0.55 // sugets sidoavtagande (HEAD: 0,55)
const MOT_FONSTRET = 0.45 // andel av utblåsets riktning som pekar mot fönstrets mitt

// huvud = fläktens huvud (där konen ritas ur) · rikt = +1 | −1 (mot fönstret).
// `luft` har längd 1: fältets `s` är då exakt formens 0..1-styrka (spelet skalar med FLAKT_KRAFT).
export function byggFlaktfalt({ huvud, rikt }) {
  return new Vindfalt({
    form: {
      typ: 'kon',
      x: huvud.x,
      y: huvud.y,
      rackvidd: FLAKT_RACKVIDD,
      halvhojd: FLAKT_HOJD,
      vinkel: rikt > 0 ? 0 : Math.PI,
      sug: { rackvidd: FLAKT_SUG_RACK, halvhojd: FLAKT_HOJD * 1.25, del: FLAKT_SUG_DEL, tvars: SUG_TVARS },
    },
    luft: { x: rikt, y: 0 },
  })
}

// Luften vid (x, y): `{ vx, vy, s }` (riktning, inte nödvändigtvis enhetslång) eller `null`.
// `fonster` = { x, y } — utblåsets riktning bändes mot det. Utan `fonster` blir den libbets rena axel.
export function flaktLuft(falt, huvud, rikt, x, y, fonster = null) {
  const o = falt.formVid(x, y)
  if (!o) return null
  const framfor = (x - huvud.x) * rikt >= 0
  if (framfor && fonster) {
    const fx = fonster.x - x
    const fy = fonster.y - y
    const d = Math.hypot(fx, fy) || 1
    return { vx: o.ux * (1 - MOT_FONSTRET) + (fx / d) * MOT_FONSTRET, vy: (fy / d) * MOT_FONSTRET, s: o.s }
  }
  return { vx: o.ux, vy: o.uy, s: o.s }
}
