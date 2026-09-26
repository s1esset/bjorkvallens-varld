// Måtten spelet, sonderna och konsten delar (`_grytprobe.mjs` mäter precis de här talen).
// Designkoordinater 1280×720, y nedåt. Rena tal — ingen Pixi, så node kan importera filen.
//
// RUMMET (från vänster): köksbänk med majspåsen och spisen · soffbordet med tre skålar ·
// soffan bakom bordet med gästerna. Tv:n står utanför bild till höger (syns bara i finishen).
//
//   y 0–470    vägg (kök t.v., vardagsrum t.h.)
//   y 470      bänkskivan / spisplattan (grytan och påsen står här)
//   y 470–650  spisens front med värmereglaget · bänkskåp
//   y 596      soffbordets skiva (skålarna står här)
//   y 650      golvet (spill landar här; hunden äter det)

export const GOLV = 650

// Köksbänken (skivans ovansida = `yta`). Spisen sitter i bänken.
export const BANK = { x0: -260, x1: 520, yta: 470, djup: 26 }

// Spisen: plattan i bänkskivans nivå, fronten nedanför med reglaget.
export const SPIS = { x: 330, yta: 470, w: 300, x0: 150, x1: 510, plattaR: 92 }

// Värmereglaget på spisens front: ett spår med 10 hack mellan − och +.
export const REGLAGE = { x0: 262, x1: 398, y: 548, steg: 10, knappR: 48, minusX: 180, plusX: 480 }

// Majspåsen på bänken till vänster om spisen.
// Påsen är smalare NEDTILL (utfall > 0) och hal: med en påse som vidgade sig nedåt låg kornen
// kvar vid 120° — bara 7 av 32 rann ut (`_popcornspel`).
export const PASE = {
  x: 72, bredd: 76, djup: 104, vagg: 8, golv: 10, bygel: 0, utfall: 0.08,
  densitet: 0.004, friktion: 0.08, greppHalo: 40,
  // Påsen häller i en BRED gryta: kort förskjutning och sänkning, men får vippas längre.
  // `vippaPx` 60 (inte 80): med en-gest-hällningen trycks påsen först ned TILL hyllan, och ett
  // tryck på 160 px nådde bara 67° — där rinner inga korn ur en påse (`_popcornnaiv` P1).
  vippaFore: 6, vippaSank: 60, vippaPx: 60, vippaMax: 2.6,
}

// Grytan (se karl.js för det lokala rummet: origo = mynningens mitt). `utfall` = väggarnas
// lutning utåt (rad); `bredd` gäller vid mynningen. Hal (oljad metall) — se karl.js om
// hällvinkeln. `vippaFore` = hur långt FÖRE skålens mitt pipen står när den häller. Svept
// 60…130 i båda sonderna (2026-09-26): ett drag i ETT svep landar förbi mitten (vill ha mer),
// ett långsamt drag droppar det sista UNDER pipen, i glappet mellan bänken och bordet (vill ha
// mindre). 70 håller sämsta fallet: `_grytprobe` A 98 % av det hällda i skålen (sämst 91 %),
// `_popcornhall` 75 % i målskålen och 6 % spill. Vid 90 föll `_grytprobe` till 70 %.
// Ägarens design 2026-09-26: ingen hinkbygel — två SIDOHANDTAG (`handtag`: mitt i (±x, y) lokalt,
// träffradie r, P0 ≥ 96 px). Ta i grytan = den bärs stadigt; ta i ett handtag = den hänger där
// och tippar lugnt (karl.js). `greppTak` gör greppet till en fjäder med krafttak, så att grytan
// aldrig kan tryckas genom bordet eller skjutas iväg (`_popcorngast`).
export const GRYTA = { bredd: 200, djup: 100, vagg: 13, golv: 16, bygel: 0, utfall: 0.26, densitet: 0.006, friktion: 0.12, vippaFore: 70, handtag: { x: 139, y: 12, r: 64 }, greppTak: { dv: 3, v: 22 } }

// Locket: en platta med knopp som vilar på mynningen.
export const LOCK = { bredd: 226, tjock: 12, knoppR: 16 }

// Soffbordet och skålarna. `kant` = mynningens höjd, `botten` = bottnens ovansida.
// Första skålen står ≥ 200 px från spisen: när grytan vippas doppar dess bortre hörn tidigt
// i rörelsen (`_grytprobe --bild`), och det tog i spisen när skålen stod vid x 600.
export const BORD = { x0: 596, x1: 1236, yta: 596, tjock: 18 }
const skal = (x) => ({ x, kant: 522, botten: 590, kantB: 214, bottenB: 112 })
export const SKAL = [skal(706), skal(926), skal(1146)]

// Hur högt över skålens kant grytans golv hänger när den är parkerad där.
export const SKAL_LUFT = 100

// Soffan bakom bordet och gästernas platser. `x,y` = gästens sittpunkt (där sitsen möter
// ryggen); `skal` = index för skålen gästen äger. Fyra platser, tre dras per omgång. (En
// golvkudde vid x 632 ströks: en gäst där skymde skål 0, och till vänster står reglagets +.)
export const SOFFA = { x0: 606, x1: 1262, sits: 492, rygg: 330 }
export const PLATSER = [
  { id: 'sits1', x: 716, y: 492, skal: 0 },
  { id: 'sits2', x: 930, y: 492, skal: 1 },
  { id: 'sits3', x: 1140, y: 492, skal: 2 },
  { id: 'armstod', x: 1238, y: 452, skal: 2 },
]

// Ett poppat popcorn. Sjuhörning: en cirkel rullar av ett bord i matter (ingen rullfriktion),
// en bulig kropp lägger sig. Låg friktion popcorn–popcorn: med 0,6 höll högen sin rasvinkel
// och bara översta lagret rann ur grytan.
export const POPCORN = {
  r: 13,
  kropp: { density: 0.0008, friction: 0.3, frictionStatic: 0.6, frictionAir: 0.02, restitution: 0.1 },
}

// Ett okokt majskorn.
export const KORN = {
  r: 5,
  kropp: { density: 0.002, friction: 0.3, frictionAir: 0.01, restitution: 0.15 },
}

// Hur många popcorn som räknas som en FULL skål (sensorn räknar de som ligger still i den).
export const FULL_SKAL = 12
