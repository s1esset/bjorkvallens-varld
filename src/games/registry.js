// Spel-register. Lägg till ett nytt spel genom att importera dess modul och
// lägga det i GAMES — biblioteket och AssetService läser härifrån.
// Varje modul följer GameModule-kontraktet (se CLAUDE.md).
import klambubblor from './klambubblor/index.js'
import sorteraSkrap from './sortera-skrap/index.js'
import vandkort from './vandkort/index.js'
import poppaBallonger from './poppa-ballonger/index.js'
import tryckOchForvandla from './tryck-och-forvandla/index.js'
import kittlaFiguren from './kittla-figuren/index.js'
import fargregn from './fargregn/index.js'
import mataMonstret from './mata-monstret/index.js'
import raknaApplen from './rakna-applen/index.js'
import klappaMullvaden from './klappa-mullvaden/index.js'
import pekaPaKroppen from './peka-pa-kroppen/index.js'
import vilketDjurLater from './vilket-djur-later/index.js'
import storLiten from './stor-liten/index.js'
import tartaIAnsiktet from './tarta-i-ansiktet/index.js'
import klaPaNallen from './kla-pa-nallen/index.js'
import planteraFron from './plantera-fron/index.js'
import skuggmatchning from './skuggmatchning/index.js'

export const GAMES = [klambubblor, sorteraSkrap, vandkort, poppaBallonger, tryckOchForvandla, kittlaFiguren, fargregn, mataMonstret, raknaApplen, klappaMullvaden, pekaPaKroppen, vilketDjurLater, storLiten, tartaIAnsiktet, klaPaNallen, planteraFron, skuggmatchning]

export function getGame(id) {
  return GAMES.find((g) => g.id === id) || null
}
