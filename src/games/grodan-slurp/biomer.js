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
//           'hav'    stranden (L6): land på ena sidan, havet på den andra, vågor (`vagor`)
//
// L6 och L7 (docs §4i) lägger till träsk, öken, strand, kök, vardagsrum och badrum. Samma kroppar
// som förut — det är konsten (konst-ute.js / konst-inne.js / djur.js) och de här talen som skiljer:
//   flyt       { motstand, maxFart } för vattnet (träsket är tjockt)
//   tuvor      träskets gräsklumpar i vattnet (som stenar, fast gröna)
//   golStil    vad gölen ÄR: 'skog' · 'oas' · 'diskho' · 'akvarium' · 'badkar'
//   markStil   marken: 'skog' · 'oken' · 'bank' (köksbänken) · 'golv' · 'kakel'
//   mobler     det som står på marken (skogens flugsvampar): [{ typ, antal, w, topp, studs }]
//   klippor / dyner   öknens klippor och sanddyner
//   tradStil   'lov' · 'dod' · 'kaktus' · 'livrad'+'hopptorn' · 'kokshylla' · 'bokhylla' · 'badhylla'
//   stubbStil  'dod' (dammens döda stam) · 'slevar' · 'golvlampa' · 'dusch'
//   korUnderlag  det kören sitter på: 'blad' · 'badring' · 'disksvamp'
//   inne       inomhus: ingen himmel, en vägg i stället (konst-inne.js)
//   het        öknens heta sand (index.js: grodan trippar när den sitter på sanden)
//   vagor      strandens vågor: strömmen svänger { amp px/steg, per s, mot px/steg mot land }
//   halt       badrummets våta kakel: friktionen nära badkaret
//
// Ordningen (`BIOM_ORDNING`) är den spelet går igenom när det öppnas (en ny biom per start,
// sparad i progress — så går alla att se genom att gå ut och in), och inom en session väljs
// nästa rundas biom slumpvis bland de andra.
export const BIOM_ORDNING = ['damm', 'is', 'fors', 'skog', 'trask', 'oken', 'strand', 'kok', 'vardagsrum', 'badrum']

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
  // ── L6 ────────────────────────────────────────────────────────────────────────────────
  // Träsket: vatten överallt, men TJOCKT — grodan simmar trögt och saker driver sakta. Gasbubblor
  // stiger ur dyn. Tuvor i stället för de flesta bladen, döda träd med skägglav.
  trask: {
    vatten: 'oppet',
    flyt: { motstand: 0.87, maxFart: 14 },
    blad: [2, 3],
    tuvor: [3, 4],
    stenar: [0, 0],
    stubbe: true,
    stockar: 2,
    trad: 2,
    tradStil: 'dod',
    svampar: 0,
    insekter: ['mygga', 'mygga', 'trollslanda', 'eldfluga', 'fluga'],
    hinder: ['gasbubbla', 'gasbubbla', 'gadda', 'vind'],
    anka: false,
  },
  // Öknen: en värld utan vatten utom oasen där kören sitter. HET sand — grodan trippar när den
  // sitter på sanden (klipporna, kaktusarmarna och oasen är svala). Sanddyner att glida nedför.
  oken: {
    vatten: 'gol',
    golStil: 'oas',
    markStil: 'oken',
    blad: [1, 1],
    stenar: [0, 0],
    stubbe: false,
    trad: 2,
    tradStil: 'kaktus',
    svampar: 0,
    klippor: [2, 3],
    dyner: [2, 3],
    het: true,
    insekter: ['fluga', 'grashoppa', 'grashoppa', 'fjaril'],
    hinder: ['buskboll', 'buskboll', 'pillerbagge', 'sandvind'],
    anka: false,
  },
  // Stranden: havet på ena sidan, sanden på den andra. Vågorna för det som flyter fram och
  // tillbaka mot stranden, och ibland kommer en stor våg. Brygga, hopptorn, parasoll.
  strand: {
    vatten: 'hav',
    blad: [2, 2],
    bladStil: 'luftmadrass',
    stenar: [2, 2],
    stenStil: 'strand',
    stubbe: false,
    stockar: 1,
    trad: 2,
    tradStil: 'livrad',
    svampar: 0,
    korUnderlag: 'badring',
    vagor: { amp: 2.6, per: 4.4, mot: 0.3 },
    insekter: ['fluga', 'nyckelpiga', 'trollslanda', 'fjaril', 'grashoppa'],
    hinder: ['krabba', 'krabba', 'mas', 'badboll', 'vag'],
    anka: false,
  },
  // ── L7: inomhus, i grodans skala ──────────────────────────────────────────────────────
  // Köket: grodan lever på köksbänken, diskhon är gölen (kören på en disksvamp). Gelé-puddingar
  // som studsar och darrar, hyllställ att klättra i, en slevkruka mitt på bänken.
  kok: {
    vatten: 'gol',
    inne: true,
    golStil: 'diskho',
    markStil: 'bank',
    blad: [0, 0],
    stenar: [0, 0],
    stubbe: true,
    stubbStil: 'slevar',
    trad: 2,
    tradStil: 'kokshylla',
    svampar: 0,
    mobler: [
      { typ: 'gele', antal: [2, 2], w: [120, 150], topp: [380, 430], studs: 0.85 },
      { typ: 'kakfat', antal: [1, 1], w: [150, 180], topp: [360, 400], studs: 0 },
    ],
    korUnderlag: 'disksvamp',
    insekter: ['fruktfluga', 'fruktfluga', 'fruktfluga', 'fluga'],
    hinder: ['apelsin', 'apelsin', 'droppe', 'anga'],
    anka: false,
  },
  // Vardagsrummet: golvet, akvariet är gölen. Soffan och puffen studsar, bokhyllor att klättra i,
  // en golvlampa mitt i rummet — och ibland går katten förbi.
  vardagsrum: {
    vatten: 'gol',
    inne: true,
    golStil: 'akvarium',
    markStil: 'golv',
    blad: [1, 1],
    stenar: [0, 0],
    stubbe: true,
    stubbStil: 'golvlampa',
    trad: 2,
    tradStil: 'bokhylla',
    svampar: 0,
    mobler: [
      { typ: 'soffa', antal: [1, 1], w: [340, 400], topp: [360, 390], studs: 0.7 },
      { typ: 'puff', antal: [1, 1], w: [120, 140], topp: [410, 440], studs: 0.75 },
      { typ: 'soffbord', antal: [1, 1], w: [200, 240], topp: [390, 420], studs: 0 },
    ],
    insekter: ['fluga', 'mal', 'mal', 'nyckelpiga', 'fjaril'],
    hinder: ['leksaksboll', 'leksaksboll', 'katt', 'pappersflygplan', 'flakt'],
    anka: false,
  },
  // Badrummet: kakelgolvet, badkaret är gölen (kören på en badring). Kaklet närmast badkaret är
  // vått och HALT. En badanka simmar förbi — tungan i den = vattenskidor i badkaret.
  badrum: {
    vatten: 'gol',
    inne: true,
    golStil: 'badkar',
    markStil: 'kakel',
    blad: [0, 0],
    stenar: [0, 0],
    stubbe: true,
    stubbStil: 'dusch',
    trad: 2,
    tradStil: 'badhylla',
    svampar: 0,
    mobler: [
      { typ: 'handfat', antal: [1, 1], w: [150, 170], topp: [360, 390], studs: 0 },
      { typ: 'pall', antal: [1, 1], w: [110, 130], topp: [420, 450], studs: 0 },
      { typ: 'tvattkorg', antal: [1, 1], w: [130, 150], topp: [400, 430], studs: 0.3 },
    ],
    halt: { friktion: 0.02, bredd: 260 },
    korUnderlag: 'badring',
    insekter: ['fluga', 'mygga', 'mal', 'fruktfluga'],
    hinder: ['badanka', 'tval', 'droppe', 'sapbubbla'],
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
  // Träsket: grumligt olivgrönt vatten (tätare än dammens), dimma, gråaktig skog i fjärran.
  trask: {
    kulle: 0x9aa892, skogFjarran: 0x6c7f66, skogNara: 0x4a5e45, strandFjarran: 0x3f4f36,
    fjarrVatten: 0x9aa47a, djupTopp: 0x6f7d4a, djupBotten: 0x2a3218, sand: 0x4f4030,
    yta: 0x8f9c5c, djup: 0x3f4a24, ytA: 0.55, djupA: 0.9, dis: 0.6, disFarg: 0xe8eedc, dimma: true,
  },
  // Öknen: sandfärgad fjärran (dyner och klippor i stället för skog), turkos oas.
  oken: {
    kulle: 0xf0d49a, skogFjarran: 0xdcae72, skogNara: 0xc98f55, strandFjarran: 0xe6bf80,
    fjarrVatten: 0xf2dcaa, djupTopp: 0xe9c88c, djupBotten: 0xc99a5c, sand: 0xc9b07a,
    yta: 0x7fd8cf, djup: 0x238a86, dis: 0.45, disFarg: 0xfff1d6,
  },
  // Stranden: havsblått, öar i fjärran, ljus sand.
  strand: {
    kulle: 0xa8d4bf, skogFjarran: 0x86b99c, skogNara: 0x6a9f82, strandFjarran: 0xf0dcae,
    fjarrVatten: 0xaee6f2, djupTopp: 0x4fbad8, djupBotten: 0x15507c, sand: 0xe6d3a4,
    yta: 0x72d4ea, djup: 0x1b6c9e,
  },
  // Inomhus: vattnet i diskhon, akvariet och badkaret (himlen syns bara i fönstret).
  kok: { yta: 0xd6ecf2, djup: 0x86aabb, ytA: 0.45, djupA: 0.75, sand: 0xa7b2ba, djupTopp: 0xa9c4cf, djupBotten: 0x5f7a88 },
  vardagsrum: { yta: 0x8fe3e6, djup: 0x2a8ea6, sand: 0xd9c79a, djupTopp: 0x6cc4d0, djupBotten: 0x1d5f78 },
  badrum: { yta: 0xdff4fb, djup: 0x8ccbe2, ytA: 0.42, djupA: 0.7, sand: 0xf2f1ec, djupTopp: 0xbfe3ef, djupBotten: 0x7fb0c8 },
}
