// Spel-register. Lägg till ett nytt spel genom att importera dess modul och
// lägga det i GAMES — biblioteket och AssetService läser härifrån.
// Varje modul följer GameModule-kontraktet (se CLAUDE.md).
import klambubblor from './klambubblor/index.js'
import sorteraSkrap from './sortera-skrap/index.js'
import vandkort from './vandkort/index.js'

export const GAMES = [klambubblor, sorteraSkrap, vandkort]

export function getGame(id) {
  return GAMES.find((g) => g.id === id) || null
}
