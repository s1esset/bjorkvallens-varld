// Designkonstanter och färgpalett för Björkvallens Värld.
// All layout sker i en fast designupplösning som skalas med "contain"-letterbox.

export const DESIGN_W = 1280
export const DESIGN_H = 720

export const FONT = {
  display: 'Fredoka, "Baloo 2", "Trebuchet MS", sans-serif',
  title: '"Baloo 2", Fredoka, "Trebuchet MS", sans-serif',
  body: 'Nunito, "Baloo 2", system-ui, sans-serif',
}

// Pixi vill ha färger som 0xRRGGBB.
export const COLORS = {
  bg: 0xfdf6e3,
  cream: 0xfffdf7,
  orange: 0xff8a3d,
  orangeDark: 0xf5731e,
  red: 0xff6b6b,
  yellow: 0xffd35c,
  green: 0x5bbf6a,
  greenDark: 0x49a657,
  blue: 0x4aa3df,
  teal: 0x57c8c3,
  purple: 0xa78bfa,
  pink: 0xff9ec4,
  brown: 0x8a5a3b,
  ink: 0x4a3526,
  inkSoft: 0x7a6657,
  white: 0xffffff,
  shadow: 0x000000,
}

// Spacing-skala (px i designrymden). Se docs/DESIGN.md §3.
export const SPACING = { xs: 8, sm: 16, md: 24, lg: 32, xl: 48, xxl: 64, edge: 24 }

// Hörnradier. Knappar räknar sin egen (min(h/2, 36)). Se docs/DESIGN.md §6.
export const RADIUS = { chip: 16, card: 28, panel: 36 }

// Rörelse-tokens (sekunder / GSAP-easar). Se docs/DESIGN.md §7.
export const ANIM = {
  press: { duration: 0.08, ease: 'power2.out', scale: 0.92 },
  release: { duration: 0.28, ease: 'back.out(3)' },
  enter: { duration: 0.5, ease: 'back.out(1.7)' },
  // Tillbaka till viloläge med en lätt översläng (flikar, val, landningar).
  settle: { duration: 0.22, ease: 'back.out(2)' },
  // Ett föremål lyfts i handen: större, snabbt, med skugga under.
  lift: { duration: 0.12, ease: 'power2.out', scale: 1.12 },
  // Squash-and-stretch: ihoptryckning -> uttöjning -> viloläge (feedback.squash/landa).
  squash: { in: 0.09, out: 0.12, settle: 0.34, ease: 'power2.out', settleEase: 'back.out(2.6)' },
  stagger: { per: 0.03, max: 0.4 },
  fade: 0.18,
  breathe: { duration: 1.6, ease: 'sine.inOut' },
}

// Mörkna en 0xRRGGBB-färg med amt (0..1) — används till knapp-"lip" och djup.
export function shade(hex, amt) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const d = (v) => Math.max(0, Math.round(v * (1 - amt)))
  return (d(r) << 16) | (d(g) << 8) | d(b)
}

// Blanda en färg mot cream (t 0..1, 1 = helt cream) — för urblekta/inaktiva ytor.
export function tint(hex, t) {
  const cr = 0xff, cg = 0xfd, cb = 0xf7
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const mix = (v, c) => Math.round(v + (c - v) * t)
  return (mix(r, cr) << 16) | (mix(g, cg) << 8) | mix(b, cb)
}

// Glada accentfärger till spelbrickor/bubblor m.m.
export const PLAYFUL = [
  0xff8a3d, 0x5bbf6a, 0x4aa3df, 0xffd35c, 0xa78bfa, 0xff6b6b, 0xff9ec4, 0x57c8c3,
]

// Kategorier (matchar GameModule.category) -> svensk etikett + brickfärg.
export const CATEGORIES = {
  drag: { label: 'Dra och släpp', color: 0x4aa3df },
  larande: { label: 'Lärande', color: 0xa78bfa },
  pedagogiskt: { label: 'Pedagogiskt', color: 0x57c8c3 },
  roligt: { label: 'Roligt', color: 0xff8a3d },
  fysik: { label: 'Fysik', color: 0x5bbf6a },
  pussel: { label: 'Pussel', color: 0xffd35c },
  motorik: { label: 'Motorik', color: 0xff6b6b },
  minne: { label: 'Minne', color: 0xff9ec4 },
}

// Flik-grupper i biblioteket: de 8 kategorierna samlas i 4 barnvänliga flikar.
// `cats` mappar GameModule.category -> flik. `color` matchar en representativ kategori.
export const TAB_GROUPS = [
  { key: 'roligt', label: 'Roligt', icon: '🎉', color: 0xff8a3d, cats: ['roligt'] },
  { key: 'fysik', label: 'Fysik', icon: '⚙️', color: 0x5bbf6a, cats: ['fysik', 'motorik'] },
  { key: 'pussel', label: 'Pussel', icon: '🧩', color: 0x4aa3df, cats: ['pussel', 'minne', 'drag'] },
  { key: 'lara', label: 'Lära', icon: '🔤', color: 0xa78bfa, cats: ['larande', 'pedagogiskt'] },
]

// Beröm som spelas upp (röst) när ett spel klaras.
export const PRAISE = ['Bravo!', 'Jättebra!', 'Toppen!', 'Vad duktig du är!', 'Hurra!', 'Fint jobbat!', 'Wow!']

// Namngivna människor i spelen. ALLA avbildade personer/figurer ska heta något av
// dessa fyra (djur, monster, nallen och maskoten Bobo är undantagna). Lova är
// reserverad för nästa avbildade flicka. Se CLAUDE.md ("CHARACTERS").
export const CHARACTERS = ['Zacke', 'Alissa', 'Elvira', 'Lova']
