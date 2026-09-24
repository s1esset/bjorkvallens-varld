// BIOMERNA i Grodan Slurp (L5) — samma motor, olika världar.
//
// Ägaren bad om "slumpmässiga varierande banor med olika biosfärer där varje biosfär har dess
// fysiska egenskaper och objekt / hinder och plattformar anpassade av miljön". En biom är DATA:
// vilken sorts vatten, vilka plattformar, vilka färger, vilka insekter och vilka hinder. dammen.js
// läser vatten/plattformar/färger, index.js läser insekter/hinder/intro.
//
//   vatten  'oppet'  dammen som förut
//           'is'     isen är ett HALT golv (friktion `isFriktion`) med vakar att simma i
//           'strom'  forsen: vattnet för med sig allt som flyter (`strom` px/steg, mot kören)
//           'gol'    skogsmark från strand till strand, och en liten göl där kören sitter
//
// Ordningen (`BIOM_ORDNING`) är den spelet går igenom när det öppnas (en ny biom per start,
// sparad i progress — så går alla att se genom att gå ut och in), och inom en session väljs
// nästa rundas biom slumpvis bland de andra.
export const BIOM_ORDNING = ['damm', 'is', 'fors', 'skog']

export const BIOMER = {
  damm: {
    vatten: 'oppet',
    blad: [6, 8],
    stenar: [2, 3],
    stubbe: true,
    trad: 2,
    svampar: 0,
    insekter: ['fluga', 'fjaril', 'trollslanda', 'mygga'],
    hinder: ['kotte', 'kotte', 'skoldpadda', 'fisk', 'vind'],
    anka: true,
  },
  is: {
    vatten: 'is',
    vakar: [2, 3],
    isFriktion: 0.012,
    blad: [0, 0],
    stenar: [2, 3],
    stubbe: true,
    trad: 2,
    svampar: 0,
    sno: true,
    // Vintern har få insekter: flugor, myggor och tjocka flugor (och ibland en guldfluga).
    insekter: ['fluga', 'fluga', 'mygga', 'tjockfluga'],
    hinder: ['snoboll', 'snoboll', 'vind'],
    anka: false,
  },
  fors: {
    vatten: 'strom',
    strom: 1.1,
    blad: [0, 0],
    stenar: [6, 8],
    stubbe: false,
    stockar: 2,
    trad: 2,
    svampar: 0,
    insekter: ['fluga', 'trollslanda', 'trollslanda', 'mygga', 'fjaril'],
    hinder: ['fisk', 'fisk', 'kotte', 'vind'],
    anka: true,
  },
  skog: {
    vatten: 'gol',
    blad: [1, 2],
    stenar: [0, 0],
    stubbe: true,
    trad: 4,
    svampar: [3, 4],
    insekter: ['fluga', 'fjaril', 'fjaril', 'humla', 'mygga'],
    hinder: ['kotte', 'kotte', 'kotte', 'vind'],
    anka: false,
  },
}

// Färgerna per biom, ovanpå tid-på-dagen-paletten (dammen.js PALETT). Bara det som skiljer.
export const BIOM_PALETT = {
  damm: {},
  is: {
    kulle: 0xdfe8f2, skogFjarran: 0x6f8f9a, skogNara: 0x4d6f78, strandFjarran: 0xe9f1f8,
    fjarrVatten: 0xe8f4fb, djupTopp: 0x7fa9c2, djupBotten: 0x2a4a66, sand: 0xa9b4be,
    yta: 0xbfe3f2, djup: 0x3a6f92,
  },
  fors: {
    yta: 0x7fd6e0, djup: 0x1d6f84, djupTopp: 0x5cb8c8, djupBotten: 0x17506a, sand: 0xa89c86,
  },
  skog: {
    kulle: 0x7fa77a, skogFjarran: 0x4f8457, skogNara: 0x356b3f, strandFjarran: 0x2f5a33,
    fjarrVatten: 0x6a8f5a, djupTopp: 0x3f6b3a, djupBotten: 0x243f24, sand: 0x7a6248,
  },
}
