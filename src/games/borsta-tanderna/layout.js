// LAYOUT — en enda sanning för `borsta-tanderna`s geometri.
//
// ⚠️ ANSIKTET ÄR MASTER. Allt annat i badrummet räknas ur fotoriggen, aldrig tvärtom
// (samma regel som `mata-munnen`s kök). Talen nedan är MÄTTA med
// `node scripts/_gapprobe.mjs --hojd 880`, inte stämda för hand.
//
// ⚠️ DEN VIKTIGASTE MÄTNINGEN, och den kullkastade spec-kortets antagande:
//    manifestets mun-RUTA är 170×138 källpixlar (187×152 designpixlar vid `hojd: 880`),
//    men den rutan är till 3/4 SKYMD av överläppen och käken. Den yta som faktiskt går
//    att se — och alltså borsta — är remsan mellan underkanten på `ovre` och överkanten
//    på `undre`, och den är vid FULLT gap **186 × 37 px**. Kontrollarmen (gap 0) mätte
//    0 px, så talet är munnen och inget annat.
//
//    Munnen är alltså ingen HÅLA att föra in en borste i; den är en bred, låg TANDRAD.
//    Det är också vad tandborstning är: ett vågrätt svep längs en rad. Smutsen ligger
//    därför på raden, och SKUMMET — spelets synliga belöning — svämmar ut över läpparna
//    och hakan, där det finns hur mycket plats som helst.
//
// ⚠️ HÖJDEN PRÖVADES PÅ 1100 OCH FÖLL — PÅ BILDEN, INTE PÅ TALEN. Sonden sa att 1100 ger
// en remsa på 233 × 46 px mot 880:s 186 × 37, och på den grunden byggdes spelet först på
// 1100. Skärmdumpen visade vad talet inte kunde: ett ansikte på 1100 är 590 px brett och
// 1100 högt i en ruta på 1280 × 720 — han blir en närbild som tränger undan hyllan, kranen
// och maskoten, och hjässan är inte "beskuren" utan borta. Vid 880 är han 472 px bred och
// hela badrummet får plats runt honom.
//
// Nio pixlar remsa är inte värda kompositionen, och de behövdes inte: det barnet SER växa
// är skummet, och skummet ligger utanför munnen. Spec-kortets 880 står alltså kvar — nu av
// ett MÄTT skäl i stället för ett antaget. Ändra inte utan att både köra `_gapprobe.mjs`
// OCH titta på `.test-shots/borsta-tanderna.png`.

export const ANS_H = 880
export const ANS = { x: 470, y: 209 }
export const K = ANS_H / 800 // 1,10 — fotorutans h är 800

// Ansiktets SYNLIGA innehåll (bas-lagret), inte fotorutan — rutan bär genomskinlig marginal.
export const ANSIKTE_YTA = { v: 236, h: 708, botten: 615, ogonY: 144 }

// TANDRADEN: den remsa av mun-lagret som syns vid fullt gap. `topp` är fast (överläppens
// underkant flyttar sig inte), `botten` gäller vid gap 1,0 — vid mindre gap ligger den
// högre upp.
export const TANDRAD = { x: 471, y: 350, v: 379, h: 564, topp: 332, botten: 368 }

// Smutsen och skummet ritas i FOTORUTANS koordinater, som barn till riggens inre
// container vid mun-lagrets index — då skymmer käken och överläppen dem exakt som de
// skymmer mun-fotot, gratis och utan mask. Banden nedan är rutkoordinater.
export const RAD_RUTA = { v: 296, h: 440, y0: 516, y1: 536 }

export const BANK_Y = 600          // bänkskivans framkant (skär strax under hakans uttoning)
export const HO = { x: 470, v: 240, h: 720, rim: 600, djup: 140 }
export const KRAN = { x: 205, y: 548 }
export const BOBO = { x: 84, y: 486 }

export const HYLLA = { y: 250, v: 760, h: 1275 }
export const TUB_PLATS = [{ x: 850, y: 178 }, { x: 990, y: 178 }, { x: 1130, y: 178 }]
export const GLAS = { x: 1150, y: 520 }
export const MUGG = { x: 855, y: 552 }
export const BORSTE_HEM = { x: 855, y: 456 }

// Borstens kontaktradie. Generös med flit: ett tvåårigt svep ska alltid träffa något
// på raden (spec-kortets punkt ⓶ — munnen är EN yta, inte sex tandknappar).
export const KONTAKT_R = 55
