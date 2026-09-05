// Unika Knytt — genetiken. Ren logik, inget Pixi, inga sidoeffekter.
//
// Hela spelets variation bor har: ett uint32-fro + barnets recept ({f,z,m,v,g}) racker for
// att aterskapa en individ exakt, sa sparposten kan vara atta tal. Barnet valjer DISKRET
// (P0 forbjuder reglage) men de fro-harledda dragen ar KONTINUERLIGA — deltabellen valjer
// vilken FORM en del har, froet satter dess PROPORTIONER.
//
// Tva regler som allt annat vilar pa:
//   1. Ordningen pa dragen ar IDENTITET. Skjuter man in ett nytt rnd()-anrop mitt i
//      listan far varje redan sparat fro ett nytt utseende. Lagg nya drag SIST.
//   2. Sotma-envelopen ar inte kosmetik. Utan klampen ger slumpen smala ogon hogt upp pa
//      en avlang kropp — det laser som obehagligt, inte som soet.

const TAU = Math.PI * 2

const klamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const spann = (rnd, a, b) => a + (b - a) * rnd()
const heltal = (rnd, n) => Math.min(n - 1, Math.floor(rnd() * n))
/** Kortaste vinkelvagen fran a till b i grader, -180..180. */
const vinkelDiff = (a, b) => ((b - a + 540) % 360) - 180

// ---------------------------------------------------------------------------
// Slumpstrom och brus
// ---------------------------------------------------------------------------

/** Seedad PRNG (mulberry32). Samma fro ger alltid samma strom. */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Ett nytt uint32-fro ur en befintlig strom. */
export function slumpFro(rnd) {
  return (rnd() * 4294967296) >>> 0
}

/**
 * Billigt vardebrus ur samma strom — for kroppssiluettens ojamnhet.
 * Returnerar f(vinkel) i [-1,1] som ar PERIODISK over ett helt varv, sa konturen
 * sluter sig utan skarv. `frek` (prop.brusFrek 2,0-4,0) styr antalet lober.
 * Anvands som: radie = R + prop.brusAmp * brus(vinkel).
 */
export function byggBrus(fro, frek = 3) {
  const n = klamp(Math.round(frek * 2), 4, 16)
  const rnd = mulberry32((fro ^ 0x27d4eb2d) >>> 0)
  const tab = []
  for (let i = 0; i < n; i++) tab.push(rnd() * 2 - 1)
  return (vinkel) => {
    const t = (vinkel / TAU) * n
    const i = Math.floor(t)
    const u = t - i
    const a = tab[((i % n) + n) % n]
    const b = tab[(((i + 1) % n) + n) % n]
    return a + (b - a) * (u * u * (3 - 2 * u)) // smoothstep = mjuk overgang i noderna
  }
}

// ---------------------------------------------------------------------------
// Farg
// ---------------------------------------------------------------------------

/** HSL -> 0xRRGGBB. h i grader (valfri), s och l i 0..1. */
export function hslHex(h, s, l) {
  const hh = (((h % 360) + 360) % 360) / 60
  const ss = klamp(s, 0, 1)
  const ll = klamp(l, 0, 1)
  const c = (1 - Math.abs(2 * ll - 1)) * ss
  const x = c * (1 - Math.abs((hh % 2) - 1))
  const m = ll - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hh < 1) { r = c; g = x } else if (hh < 2) { r = x; g = c } else if (hh < 3) { g = c; b = x } else if (hh < 4) { g = x; b = c } else if (hh < 5) { r = x; b = c } else { r = c; b = x }
  const q = (v) => Math.max(0, Math.min(255, Math.round((v + m) * 255)))
  return (q(r) << 16) | (q(g) << 8) | q(b)
}

/** Drar ett index ur en VIKTAD fordelning — kostar exakt ETT rnd()-anrop. */
function vagtIndex(rnd, vikter) {
  let sum = 0
  for (let i = 0; i < vikter.length; i++) sum += vikter[i]
  let t = rnd() * sum
  for (let i = 0; i < vikter.length; i++) {
    t -= vikter[i]
    if (t < 0) return i
  }
  return vikter.length - 1
}

// ---------------------------------------------------------------------------
// Tabeller — ORDNINGEN ar en del av kontraktet (index sparas)
// ---------------------------------------------------------------------------

/** De tio flaskorna i fargkranen. h/s/l ar UTGANGSPUNKTEN, envelopen klampar sen. */
export const FARGER = [
  { nyckel: 'rod', h: 4, s: 0.72, l: 0.63 },
  { nyckel: 'orange', h: 26, s: 0.78, l: 0.63 },
  { nyckel: 'gul', h: 46, s: 0.80, l: 0.65 },
  { nyckel: 'lime', h: 82, s: 0.62, l: 0.60 },
  { nyckel: 'gron', h: 132, s: 0.58, l: 0.58 },
  { nyckel: 'turkos', h: 172, s: 0.60, l: 0.61 },
  { nyckel: 'bla', h: 206, s: 0.66, l: 0.62 },
  { nyckel: 'lila', h: 268, s: 0.58, l: 0.66 },
  { nyckel: 'rosa', h: 326, s: 0.70, l: 0.70 },
  { nyckel: 'sand', h: 32, s: 0.54, l: 0.68 },
]

/** Balgens fyra steg. Skalfaktor pa hela knyttet. */
export const STORLEKAR = [0.74, 0.88, 1.03, 1.20]

/** Monsterhjulets sex motiv (ritas i kroppens statiska Graphics, matt mot m.bredd). */
export const MONSTER = ['enfarg', 'prickar', 'ranger', 'mage', 'flackar', 'stjarnor']

// OBS: knytt.js hall sina EGNA deltabeller (KROPPAR/ORON/SVANSAR/BEN/HORN/VINGAR) och
// importerar inget harifran. Den bindande kopplingen ar i stallet LANGDEN pa viktarrayen
// i varld.vikter mot langden pa knytt.js tabell — det ar den som avgor vilka delar som
// nagonsin kan valjas (se hornet krona i docs §5). Fyra namnlistor stod har och pastod
// sig aga ordningen utan att nagon las dem; de ar borttagna hellre an missvisande.
export const OGONFORMER = ['runda', 'stora', 'smala', 'stjarna', 'spiral', 'tre']
export const MUNNAR = ['leende', 'katt', 'nabb', 'glipa', 'prick']

/**
 * De fyra varldarna. `tema` gar rakt in i createScene — giltiga STRANGAR ar bara
 * sky/meadow/sunset/candy/water/night/warm, en okand strang faller TYST tillbaka pa bla
 * himmel. Snolandet far darfor ett EGET temaobjekt (createScene tar ett objekt lika garna).
 * `vikter` har en vikt PER index i respektive tabell ovan.
 */
export const VARLDAR = [
  {
    id: 'skog',
    tema: 'meadow',
    hyMin: 96, hyMax: 130, matt: 1.0,
    vikter: {
      kropp: [1, 3, 1, 1, 1, 3], // paron + larv
      oron: [1, 3, 1, 3, 1, 1], // runda + hang
      svans: [1, 3, 1, 1, 1], // tofs
    },
    rekvisita: ['trad', 'sten', 'svamp', 'stubbe'],
    kompis: 'skalbagge',
  },
  {
    id: 'vatten',
    tema: 'water',
    hyMin: 186, hyMax: 210, matt: 0.96,
    vikter: {
      kropp: [1, 1, 3, 3, 1, 1], // bona + droppe
      oron: [3, 1, 1, 3, 1, 1], // inga + hang
      svans: [1, 1, 1, 4, 1], // fena
    },
    rekvisita: ['sjogras', 'snacka', 'sten', 'bubbla'],
    kompis: 'smafisk',
  },
  {
    id: 'sno',
    // Inget snotema finns i scene.js. Egna objekt behover BADE ground och groundDark,
    // annars nar undefined Pixis fargparser. stars pa en nastan vit himmel syns inte —
    // bokeh gor jobbet i stallet.
    tema: {
      top: 0xdceffb, bottom: 0xf6fbff, ground: 0xeaf4fb, groundDark: 0xc9def0,
      sun: 0xffffff, clouds: 3, gras: false, bokeh: 9, stars: 0,
    },
    hyMin: 190, hyMax: 215, matt: 0.72,
    vikter: {
      kropp: [3, 1, 1, 1, 3, 1], // klot + kloss
      oron: [1, 1, 3, 1, 3, 1], // spetsiga + horn
      svans: [3, 3, 1, 1, 1], // ingen + tofs
    },
    rekvisita: ['gran', 'snodriva', 'istapp', 'snoflinga'],
    kompis: 'snosparv',
  },
  {
    id: 'natt',
    tema: 'night',
    hyMin: 258, hyMax: 286, matt: 1.04,
    vikter: {
      kropp: [3, 1, 1, 3, 1, 1], // klot + droppe
      oron: [1, 1, 1, 1, 1, 4], // antenner
      svans: [1, 1, 3, 1, 1], // lang
    },
    rekvisita: ['mane', 'stjarna', 'eldfluga', 'nattblomma'],
    kompis: 'nattfjaril',
  },
]

/**
 * 24 tvastaviga namn. FAST tabell just for att alla 24 kan fa riktiga rostklipp
 * (VoiceService slar upp pa exakt text) — ett fritt genererat namn kan aldrig fa ett.
 */
export const NAMN = [
  'Bubbel', 'Glimma', 'Knoppe', 'Lurvi', 'Snöfnatt', 'Gnista',
  'Mossa', 'Droppe', 'Stjärne', 'Vippa', 'Dunge', 'Frosta',
  'Blicka', 'Pyre', 'Skimra', 'Tussa', 'Kvista', 'Rimma',
  'Flisa', 'Bolla', 'Nypon', 'Skugga', 'Tindra', 'Vinter',
]

// Durskala i Hz (C-dur, pentatonisk stomme) — motivet blir stamd musik, aldrig en blipp.
const SKALA = [262, 294, 330, 392, 440, 523, 587, 659, 784]
// Fem motivformer. `r` i sparposten valjer form; i leverans 1 satts den av froet.
const MOTIVFORM = [
  [0, 1, 2, 4], // stigande
  [4, 3, 1, 0], // fallande
  [0, 2, 1, 3], // vag
  [0, 4, 1, 3], // hopp
  [2, 0, 2, 4], // vaggande
]

// ---------------------------------------------------------------------------
// Sprickvagen — byggd EN gang ur froet (kallan ritade om med Math.random varje
// tryck, sa sprickorna hoppade runt mellan knackningarna)
// ---------------------------------------------------------------------------

/** Halller en punkt innanfor aggets enhetsprofil (-1..1). */
function iAgget(x, y) {
  const d = Math.hypot(x / 0.74, y / 0.94)
  return d <= 1 ? { x, y } : { x: x / d, y: y / d }
}

function byggSprickor(fro) {
  const rnd = mulberry32((fro ^ 0x5bf03635) >>> 0)
  const punkter = [iAgget(spann(rnd, -0.34, 0.34), -0.70)]
  let riktning = spann(rnd, -0.5, 0.5) // 0 = rakt ner
  for (let i = 0; i < 12; i++) {
    riktning = klamp(riktning + spann(rnd, -0.55, 0.55), -1.15, 1.15)
    const steg = spann(rnd, 0.12, 0.20)
    const f = punkter[punkter.length - 1]
    punkter.push(iAgget(f.x + Math.sin(riktning) * steg, f.y + Math.cos(riktning) * steg))
  }
  // Grenar ut fran punkt 4, 7 och 10 — korta stickare at sidan.
  const grenar = [4, 7, 10].map((idx) => {
    const bas = punkter[idx]
    let v = (rnd() < 0.5 ? -1 : 1) * spann(rnd, 0.9, 1.5)
    const gren = [{ x: bas.x, y: bas.y }]
    for (let j = 0; j < 3; j++) {
      v += spann(rnd, -0.4, 0.4)
      const f = gren[gren.length - 1]
      const steg = spann(rnd, 0.09, 0.15)
      gren.push(iAgget(f.x + Math.sin(v) * steg, f.y + Math.cos(v) * steg))
    }
    return gren
  })
  // Fyra steg: 3 / 6 / 9 segment, sedan hela klyvningen. Egna kopior per steg sa
  // ritaren aldrig kan mutera en delad punkt.
  const kopia = (lista) => lista.map((p) => ({ x: p.x, y: p.y }))
  return [3, 6, 9, 12].map((n, i) => ({
    segment: kopia(punkter.slice(0, n + 1)),
    gren: grenar.slice(0, [0, 1, 2, 3][i]).map(kopia),
  }))
}

// ---------------------------------------------------------------------------
// Sotma-envelopen — agarens neoteni-sparrar som HARDA klamp
// ---------------------------------------------------------------------------

function sotmaVakt(p, ogonform) {
  // En smal, hog kropp behover storre och LAGRE satta ogon for att lasa som en unge.
  const slank = p.kroppHojd / p.kroppBredd
  if (slank > 1.12) {
    p.ogonSkala = Math.max(p.ogonSkala, 0.98)
    p.ogonHojd = Math.max(p.ogonHojd, 0.05)
  }
  // Smala ogon (form 2) kompenseras med stor pupill och rejal kind.
  if (ogonform === 2) {
    p.ogonSkala = Math.max(p.ogonSkala, 1.0)
    p.pupill = Math.max(p.pupill, 0.74)
    p.kindAlfa = Math.max(p.kindAlfa, 0.38)
  }
  // Sma ogon far aldrig kombineras med sma pupiller eller vitt isarsatta ogon.
  if (p.ogonSkala < 0.92) {
    p.pupill = Math.max(p.pupill, 0.72)
    p.ogonAvstand = Math.min(p.ogonAvstand, 1.08)
  }
  // Liten mun -> tydligare kinder, sa ansiktet aldrig blir tomt.
  if (p.munBredd < 0.92) p.kindAlfa = Math.max(p.kindAlfa, 0.34)
  // Slutklamp: spannen i §6c ar sjalva regelverket.
  p.ogonSkala = klamp(p.ogonSkala, 0.78, 1.30)
  p.ogonHojd = klamp(p.ogonHojd, -0.06, 0.14)
  p.pupill = klamp(p.pupill, 0.55, 0.85)
  p.ogonAvstand = klamp(p.ogonAvstand, 0.80, 1.25)
  p.kindAlfa = klamp(p.kindAlfa, 0.25, 0.60)
  return p
}

// ---------------------------------------------------------------------------
// Hjartat
// ---------------------------------------------------------------------------

/**
 * Bygger en hel individ ur ett fro + barnets recept.
 * val = { f farg 0-9, z storlek 0-3, m monster 0-5, v varld 0-3, g gnistor 0-3 }.
 * Deterministisk: samma (fro, val) ger byte-identiskt utfall varje gang.
 */
export function dnaFromSeed(seed, val = {}) {
  const fro = seed >>> 0
  const f = klamp(val.f | 0, 0, FARGER.length - 1)
  const z = klamp(val.z | 0, 0, STORLEKAR.length - 1)
  const m = klamp(val.m | 0, 0, MONSTER.length - 1)
  const v = klamp(val.v | 0, 0, VARLDAR.length - 1)
  const g = klamp(val.g | 0, 0, 3)
  const varld = VARLDAR[v]

  // EN strom for hela varelsen. Varldens val syns som VIKTER, inte som en egen strom:
  // da drar ett snorecept mot horn och ett skogsrecept mot hangoron, medan fargvalet
  // lamnar formen ororid ("bla flaska ger blatt knytt", inte ett annat djur).
  const rnd = mulberry32(fro)

  // --- 1. Delval (ordningen ar identitet — lagg nya drag sist)
  const kropp = vagtIndex(rnd, varld.vikter.kropp)
  const oron = vagtIndex(rnd, varld.vikter.oron)
  const svans = vagtIndex(rnd, varld.vikter.svans)
  const ben = vagtIndex(rnd, [2, 3, 2])
  const ogonform = heltal(rnd, OGONFORMER.length)
  const mun = heltal(rnd, MUNNAR.length)
  const hornDrag = rnd()
  const vingDrag = rnd()
  const ogonDrag = rnd()
  const horn = hornDrag < 0.62 ? 0 : hornDrag < 0.86 ? 1 : 2 // extra horn ovanpa oronvalet
  const vingar = vingDrag < 0.70 ? 0 : vingDrag < 0.90 ? 1 : 2
  // 'tre' (ogonform 5) bar sitt tredje oga i pannan; annars nastan alltid tva.
  const ogonantal = ogonform === 5 ? 3 : ogonDrag < 0.08 ? 1 : 2
  const r = heltal(rnd, MOTIVFORM.length)

  // --- 2. De 22 kontinuerliga dragen + vilororelsens tre
  const p = {
    kroppBredd: spann(rnd, 0.82, 1.18),
    kroppHojd: spann(rnd, 0.85, 1.15),
    taper: spann(rnd, 0.0, 0.40),
    asym: spann(rnd, 0.0, 0.06),
    brusAmp: spann(rnd, 0, 5),
    brusFrek: spann(rnd, 2.0, 4.0),
    ogonSkala: spann(rnd, 0.78, 1.30),
    ogonAvstand: spann(rnd, 0.80, 1.25),
    ogonHojd: spann(rnd, -0.06, 0.14), // andel av kroppshojden NEDAT fran faceY; hogre = lagre satta = sotare
    pupill: spann(rnd, 0.55, 0.85),
    blank: rnd() < 0.55 ? 1 : 2,
    oronLangd: spann(rnd, 0.70, 1.40),
    oronLutning: spann(rnd, -0.35, 0.35),
    oronHang: spann(rnd, 0.0, 0.80),
    svansLangd: spann(rnd, 0.70, 1.50),
    svansTjock: spann(rnd, 0.70, 1.30),
    benLangd: spann(rnd, 0.70, 1.30),
    benTjock: spann(rnd, 0.80, 1.20),
    munBredd: spann(rnd, 0.80, 1.25),
    munBage: spann(rnd, 0.30, 1.00),
    kindAlfa: spann(rnd, 0.25, 0.60),
    kindRadie: spann(rnd, 0.80, 1.30),
    // Vilororelsen: sten trogare, natt piggare — tva knytt ror sig alltsa inte likadant.
    andning: spann(rnd, 1.4, 2.2) * (kropp === 4 ? 0.86 : v === 3 ? 1.10 : 1.0),
    gupp: spann(rnd, 3, 7) * (ben === 0 ? 1.25 : 1.0), // svavande kroppar guppar hogre
    fas: rnd() * TAU,
  }
  sotmaVakt(p, ogonform)
  p.andning = klamp(p.andning, 1.2, 2.5)
  p.gupp = klamp(p.gupp, 3, 9)

  // --- 3. Paletten: barnets farg + varldens nyansjitter, klampad i sotma-envelopen
  const grund = FARGER[f]
  const mittHy = (varld.hyMin + varld.hyMax) / 2
  const drag = vinkelDiff(grund.h, mittHy) * 0.14 + spann(rnd, -3, 3)
  const h = grund.h + klamp(drag, -8, 8) // ±8° — varldens familj syns, fargvalet vinner
  const s = klamp(grund.s * varld.matt, 0.52, 0.80)
  const l = klamp(grund.l + spann(rnd, -0.03, 0.03), 0.56, 0.72)
  const mHy = spann(rnd, varld.hyMin, varld.hyMax) // monstret bar varldens egen familj
  const kindH = grund.h + vinkelDiff(grund.h, 348) * 0.8
  const palett = {
    bas: hslHex(h, s, l),
    ljus: hslHex(h + 4, s * 0.90, Math.min(l + 0.13, 0.88)),
    mork: hslHex(h - 6, Math.min(s * 1.06, 0.88), Math.max(l - 0.17, 0.30)),
    buk: hslHex(h - 3, s * 0.52, Math.min(l + 0.21, 0.92)),
    monster: hslHex(mHy, klamp(0.62 * varld.matt, 0.20, 0.85), klamp(l - 0.19, 0.26, 0.62)),
    kind: hslHex(kindH, 0.72, 0.74),
    oga: 0xfffdf7,
    pupill: hslHex(h, 0.42, 0.15),
  }

  // --- 4. Namn och motiv
  const namn = NAMN[heltal(rnd, NAMN.length)]
  const rot = heltal(rnd, 4)
  const motiv = MOTIVFORM[r].map((steg) => SKALA[Math.min(SKALA.length - 1, rot + steg)])

  // Tiern ar INTE genetik: den rullas i index.js ur ett eget slumptal och sparas pa plats 7.
  // Den laser inget ur strommen (regel 1: ordningen ar identitet), sa samma fro ger samma
  // knytt oavsett tier — skimret laggs OVANPA individen, det byter aldrig ut den.
  // Kompisen ar det ett VANLIGT knytt far och ett skimrande aldrig far (§3b), en per varld.
  const tier = klamp(val.t | 0, 0, 3)

  return {
    fro,
    val: { f, z, m, v, g, r },
    varld: v,
    tier,
    kompis: varld.kompis || 'skalbagge',
    storlek: STORLEKAR[z],
    kropp, oron, svans, ben, ogonform, ogonantal, mun, horn, vingar,
    monster: m,
    prop: p,
    palett,
    namn,
    motiv,
    sprickor: byggSprickor(fro),
  }
}

// ---------------------------------------------------------------------------
// Sjalvkoll — underlag for en sond, aldrig nagot spelet kor
// ---------------------------------------------------------------------------

/** Signatur som raknar TVA knytt som lika om de ser likadana ut for ett oga. */
function signatur(d) {
  const q = (x, n = 100) => Math.round(x * n)
  const pr = d.prop
  return [
    d.kropp, d.oron, d.svans, d.ben, d.ogonform, d.ogonantal, d.mun, d.horn, d.vingar,
    q(pr.kroppBredd), q(pr.kroppHojd), q(pr.taper), q(pr.asym), q(pr.brusAmp, 10), q(pr.brusFrek, 10),
    q(pr.ogonSkala), q(pr.ogonAvstand), q(pr.ogonHojd), q(pr.pupill), pr.blank,
    q(pr.oronLangd), q(pr.oronLutning), q(pr.oronHang), q(pr.svansLangd), q(pr.svansTjock),
    q(pr.benLangd), q(pr.benTjock), q(pr.munBredd), q(pr.munBage), q(pr.kindAlfa), q(pr.kindRadie),
    d.palett.bas, d.namn,
  ].join(',')
}

/** 500 fron ur SAMMA recept -> { unika, kollisioner }. Kollisioner ska vara 0. */
export function _sanity(recept = { f: 6, z: 2, m: 3, v: 2, g: 1 }, antal = 500) {
  const rnd = mulberry32(0x1a2b3c4d)
  const sedda = new Set()
  let kollisioner = 0
  for (let i = 0; i < antal; i++) {
    const nyckel = signatur(dnaFromSeed(slumpFro(rnd), recept))
    if (sedda.has(nyckel)) kollisioner++
    else sedda.add(nyckel)
  }
  return { unika: sedda.size, kollisioner }
}

// ---------------------------------------------------------------------------
// Upplasningar — spelets enda SAMLINGS-krok (ATGARDER U3)
// ---------------------------------------------------------------------------
//
// Verkstan borjar SMALARE an tabellerna ovan och vaxer med antalet klackta knytt.
// Ordningen ar vald sa spanningen stiger: fargerna forst (minst dramatiskt),
// Stjarnnatten som den stora belonigen, storsta balgsteget sist.
//
// 🚨 Spec-radens fjarde belonig var "en rost". Den finns inte att lasa upp langre:
// Ljudtratten skots upp 2026-08-30 (docens §4c) och rosten harleds nu ur froet. Posten
// ar darfor omskriven till det som faktiskt gar att bygga — balgens fjarde steg — i
// stallet for att en kontroll uppfinns for att radda formuleringen.
//
// `tak` ar antalet steg axeln far EFTER milstolpen; det som lases upp ar alltsa
// indexen START_TAK[axel] .. tak-1, i tabellernas egen ordning. Tabellerna ror sig
// aldrig (index sparas), sa en upplasning kan bara lagga till i slutet.

/** Verkstans tak vid noll klackta knytt. Nycklarna ar verktygens axelnamn. */
export const START_TAK = { farg: 8, monster: 4, varld: 3, storlek: 3, gnista: 4 }

/**
 * `falt` ar postens index i sparposten [fro, f, z, m, v, r, g, 0] — det ar den som
 * later en GAMMAL sparpost (utan raknare) beratta hur langt barnet redan kommit.
 */
export const MILSTOLPAR = [
  { vid: 4, axel: 'farg', tak: FARGER.length, falt: 1 },
  { vid: 8, axel: 'monster', tak: MONSTER.length, falt: 3 },
  { vid: 12, axel: 'varld', tak: VARLDAR.length, falt: 4 },
  { vid: 16, axel: 'storlek', tak: STORLEKAR.length, falt: 2 },
]

/** Vilka tak galler efter `n` klackta knytt? Ett nytt objekt varje gang — aldrig delat. */
export function takFor(n) {
  const t = { ...START_TAK }
  const k = Number.isFinite(n) ? Math.trunc(n) : 0
  for (const m of MILSTOLPAR) if (k >= m.vid) t[m.axel] = m.tak
  return t
}

/**
 * Migrering for sparposter skrivna FORE raknaren fanns (`v: 1`, ingen `n`).
 * Regeln ar att ingen nagonsin far forlora nagot hen redan gjort: har barnet ett knytt
 * i en varld/farg/storlek som ligger bakom en milstolpe, sa ar den milstolpen passerad.
 * Utan den hade en spelare som redan byggt ett stjarnnattsknytt vaknat till en verkstad
 * dar Stjarnnatten var borta.
 */
export function antalFranPoster(lista) {
  const rader = Array.isArray(lista) ? lista : []
  let n = rader.length
  for (const post of rader) {
    if (!Array.isArray(post)) continue
    for (const m of MILSTOLPAR) {
      const v = post[m.falt]
      if (Number.isFinite(v) && v >= START_TAK[m.axel] && n < m.vid) n = m.vid
    }
  }
  return n
}

// ---------------------------------------------------------------------------
// Sallsynthet — agarens tal, husets etik (docens §3b). Ren logik, matt av _tierprobe.
// ---------------------------------------------------------------------------
//
// Grundrullning per spakdrag: guld 2 % · silver 5 % · brons 10 % · vanlig 83 %.
// Burken ar ratten, med TAK: varje gnista ger +1,0 pp brons · +0,5 pp silver · +1/6 pp
// guld, tre gnistor ar taket (17,0 % -> 22,0 % skimmer; guld 2,00 -> 2,50 %). Guld
// forblir alltsa genuint sallsynt hur mycket stjarnstoft barnet an haller i — det ar
// skillnaden mellan en generator och en gacha.
//
// Utfallet rullas FORE spaken dras, i `_startaCeremoni`, ur ETT slumptal u. Ceremonin ar
// darmed en avtackning, inte en snurr: inget barnet gor under animationen andrar det.
// Garantier i stallet for jakt: forsta klackningen pa en profil ar minst brons, och efter
// sex vanliga i rad (`torka`) ar nasta minst brons. Raknarna renderas aldrig, sags aldrig.

export const TIER = ['vanlig', 'brons', 'silver', 'guld']

/** Oddsen som ANDELAR efter burkens g gnistor (0-3). Taket +5 pp ligger i talen. */
export function tierOdds(g) {
  const k = klamp(g | 0, 0, 3)
  return { guld: 0.02 + k / 600, silver: 0.05 + k * 0.005, brons: 0.10 + k * 0.01 }
}

/**
 * Tier 0-3 ur ett slumptal u (0..1). `forsta` och `torka >= 6` lyfter en vanlig till brons.
 * Kontrollarm i _tierprobe: utan garantier ar 0 mojlig (~83 %), med dem aldrig.
 */
export function rullaTier(u, g, { forsta = false, torka = 0 } = {}) {
  const o = tierOdds(g)
  const x = klamp(Number.isFinite(u) ? u : 0.5, 0, 0.999999)
  let t = 0
  if (x < o.guld) t = 3
  else if (x < o.guld + o.silver) t = 2
  else if (x < o.guld + o.silver + o.brons) t = 1
  if (t === 0 && (forsta || torka >= 6)) t = 1
  return t
}
