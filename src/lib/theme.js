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

// Beröm som spelas upp (röst) när ett spel klaras.
export const PRAISE = ['Bravo!', 'Jättebra!', 'Toppen!', 'Vad duktig du är!', 'Hurra!', 'Fint jobbat!', 'Wow!']

// Namngivna människor i spelen. ALLA avbildade personer/figurer ska heta något av
// dessa fyra (djur, monster, nallen och maskoten Bobo är undantagna). Lova är
// reserverad för nästa avbildade flicka. Se CLAUDE.md ("CHARACTERS").
export const CHARACTERS = ['Zacke', 'Alissa', 'Elvira', 'Lova']
