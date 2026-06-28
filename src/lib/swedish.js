// Svenska hjälpare. Viktigt: synliga texter behåller å/ä/ö, men id:n,
// filnamn och ljudnycklar ASCII-viks (å/ä -> a, ö -> o) enligt CLAUDE.md.

export function asciiFold(str = '') {
  return String(str)
    .toLowerCase()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[éè]/g, 'e')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// Avatarer till barnprofiler (emoji = inga bildtillgångar krävs).
export const AVATARS = [
  { id: 'bobo', emoji: '🐻', name: 'Björnen' },
  { id: 'rav', emoji: '🦊', name: 'Räven' },
  { id: 'kanin', emoji: '🐰', name: 'Kaninen' },
  { id: 'katt', emoji: '🐱', name: 'Katten' },
  { id: 'groda', emoji: '🐸', name: 'Grodan' },
  { id: 'panda', emoji: '🐼', name: 'Pandan' },
  { id: 'lejon', emoji: '🦁', name: 'Lejonet' },
  { id: 'apa', emoji: '🐵', name: 'Apan' },
  { id: 'enhorning', emoji: '🦄', name: 'Enhörningen' },
  { id: 'pingvin', emoji: '🐧', name: 'Pingvinen' },
]

export function avatarEmoji(id) {
  return (AVATARS.find((a) => a.id === id) || AVATARS[0]).emoji
}

export function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Slumpa ordning (Fisher–Yates) — används för kort, bubblor m.m.
export function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
