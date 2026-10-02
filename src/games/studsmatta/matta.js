// MATTAN — studsmattans fysik, utan Pixi (FYSIKPLAN P1 + R2).
//
// Studsen kom förut ur ett SKRIPTAT `nudge(char, vx, -up)` vid landningen, med en uppfart ur
// `power` — den berodde bara på hur hårt mattan var spänd, aldrig på HUR HÖGT kaninen föll, och
// mattan gav ingen studs (en gsap-dipp VISADE en). Nu är mattan en `Fjaderbrada`:
//
//   • kaninen slår i → mattan SVÄLJER anslaget (`taEmot`), pressas ner, vänder och det är dess
//     egen fart UPPÅT som kastar iväg kaninen. Studsen kommer ur brädan — aldrig ur
//     `restitution` på en statisk kropp (CLAUDE.md, V10). Kaninens `restitution` är 0 just därför:
//     annars lägger matters lösare på ett eget (1+e)-kast ovanpå brädans.
//   • laddningen = FALL_ANDEL · anslagsfarten + en pump ur spänningen (`power`). Fallhöjden ger alltså
//     mer studs, och spänningen (barnets dra-ner-kontroll) bestämmer var den jämnar ut sig. Utan
//     pumpen hade kaninen tappat höjd för varje studs; en studsmatta ger tillbaka mer än den får.
//   • TAKET är räknat ur geometrin (`taket`): kaninen når aldrig högre än CEIL_Y + 40 oavsett
//     spänning, fall eller var mattan står (P0: aldrig ur bild). Det mjuka taket i spelet är kvar
//     som nät, men ska aldrig behövas.
//   • mattan följer fingret via `phys.kinematisk` (R2): basen går mot målet med högst MAX_FART
//     px/steg i fysiksteget, så en snabb dragning knuffar kaninen i stället för att teleportera
//     förbi den, och fjäderns eget utslag läggs ovanpå som en OKLAMPAD avvikelse (utkastet).
//
// ⚠️ KANINEN MÅSTE FÖLJA MED NER. Första försöket nollade bara kaninens fart (`taEmot`) — då stod
// den kvar i luften medan mattan dök 22 px, och när mattan vände hade kaninen hunnit lämna
// kontakten: brädan nådde sitt överslag samtidigt som den rörde kaninen och gav 4 px/steg i stället
// för 14 (uppmätt, icke-monotont: 12 → 12,9 men 13–14,5 → 4,3). Nu får kaninen brädans egen
// dykfart och åker med ner; då är kontakten kvar när mattan vänder, och utfarten följer laddningen
// över hela spannet (`scripts/_studsmattaprobe.mjs`).
import { Fjaderbrada } from '../../lib/fjader.js'
import { Matter, STEG2 } from '../../lib/physics.js'

const { Body } = Matter

// --- Geometri (designkoordinater 1280x720) ---
export const HALF_SPAN = 200 // halva mattans bredd
export const BED_H = 44 // kroppens tjocklek (mattans överkant = bedY)
export const CHAR_R = 38 // kaninens fysik-radie
export const BED_MIN_Y = 350 // högst upp mattan får dras (mjukast studs)
export const BED_MAX_Y = 560 // längst ner mattan får dras (spändast = högst studs)
export const CEIL_Y = 110 // mjukt tak i spelet (nät)
export const GRAVITY_Y = 1.2

// --- Studsen ---
export const MAX_FART = 10 // px/steg mattan går mot fingret (R2). Dras mattan UPP under kaninen läggs den farten ovanpå utkastet.
export const KANIN_MAX_FART = 18 // fartTak på kaninen (px/steg): kast + en uppåtdragen matta får aldrig bli tunnling eller ett skott ur bild
export const FALL_ANDEL = 0.5 // hur stor del av anslagsfarten som kommer tillbaka som laddning
export const JAMN_MIN = 10 // utfart (px/steg) som studsen jämnar ut sig mot vid lägsta spänning
export const JAMN_MAX = 16.5 // …och vid högsta (apex ~ 400 px över mattan)
export const MIN_LADDNING = 8.5 // golv: även en nuddande landning ger en generös studs
export const TAK_MARGINAL = 40 // kaninens mittpunkt når aldrig högre än CEIL_Y + detta
export const MAX_ANSLAG = 18 // fjäderns egen laddningsgräns (px/steg)
export const RETUR = 1.15 // utfart = laddning (uppmätt 1,00 vid överslag 0,6; 0,84 vid förvalets 0,3 — överslaget klippte utkastet)
export const OVERSLAG = 0.6 // hur långt mattan får bukta uppåt förbi vilan (andel av MAX_KOMP)
export const MAX_KOMP = 26 // djupaste nedtryckning (px) — mattans synliga dipp är 2 × detta i mitten-linjen

const G_EFF = GRAVITY_Y * 0.001 * STEG2 // px/steg² (matters gravitation)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t

// Högsta tillåtna utfart (px/steg) för en matta vars överkant står på `bedY`: kaninens mittpunkt
// startar CHAR_R över mattan, stiger v² / 2g, och ska aldrig komma högre än CEIL_Y + TAK_MARGINAL.
export function taket(bedY) {
  return Math.sqrt(2 * G_EFF * Math.max(1, bedY - CHAR_R - (CEIL_Y + TAK_MARGINAL)))
}

// Laddningen (≈ utfarten) för ett anslag. Ren funktion — sonden räknar med exakt samma.
//   vn     anslagsfart (px/steg, nedåt positiv)   power  0…1   bedY  mattans överkant
export function laddning(vn, power, bedY) {
  const jamn = lerp(JAMN_MIN, JAMN_MAX, clamp(power, 0, 1))
  const pump = (1 - FALL_ANDEL) * jamn
  return clamp(FALL_ANDEL * Math.max(0, vn) + pump, MIN_LADDNING, Math.min(MAX_ANSLAG, taket(bedY)))
}

export class Matta {
  // phys: PhysicsWorld · x, y: mattans mitt och överkant
  constructor(phys, x, y) {
    this.phys = phys
    this.fj = new Fjaderbrada({ bredd: HALF_SPAN * 2, hojd: BED_H, maxAnslag: MAX_ANSLAG, maxKomp: MAX_KOMP, retur: RETUR, overslag: OVERSLAG, mjuk: false })
    this.body = phys.rectangle(x, y + BED_H / 2, HALF_SPAN * 2, BED_H, { isStatic: true, label: 'bed' })
    // Fjädern stegas HÄR, i fysiksteget, och läggs som avvikelse ovanpå basen (oklampad).
    this.k = phys.kinematisk(this.body, {
      maxFart: MAX_FART,
      avvikelse: () => {
        this.fj.steg()
        return { x: 0, y: this.fj.komp }
      },
    })
    this._alive = true
  }

  // Basens läge (utan fjäderns utslag): det ritade, hållna läget. Överkant = bas.y − BED_H/2.
  get x() {
    return this.k.bas.x
  }
  get y() {
    return this.k.bas.y - BED_H / 2
  }

  // Nedtryckningen i px (negativ = buktar uppåt över vilan).
  get komp() {
    return this.fj.komp
  }

  // Mittlinjens dipp i `quadraticCurveTo(0, by + dip, …)`-enheter: kontrollpunkten rör sig 2 × mitten-
  // utslaget, så dipp = 2 · komp gör att den RITADE linjen sitter exakt där kroppens överkant är.
  get dip() {
    return this.fj.komp * 2
  }

  // MÅLET (fingret / hjälpen): mattan går dit med högst MAX_FART px/steg.
  till(x, y) {
    this.k.till(x, y + BED_H / 2)
  }

  // BÄR dit utan kastkraft (en ny omgång).
  flytta(x, y) {
    this.k.flytta(x, y + BED_H / 2)
  }

  // Ett lätt tryck på mattan (tap-fallback): den dyker och ringer ut av sig själv, och en kanin som
  // vilar på den lyfts lite. Bildkvittot på ett tryck kommer alltså ur brädan, inte en tween.
  // ⚠️ Bara på en MATTA I VILA (|fart| och |nedtryckning| < 2): ett tryck mitt i en landning la sin laddning ovanpå
  // landningens, och summan 18 px/steg slog igenom taket (uppmätt: kaninen y −22 utan nät).
  tryck(styrka = 0.45) {
    if (!this._alive || Math.abs(this.fj.kompFart) >= 2 || Math.abs(this.fj.komp) >= 2) return
    this.fj.ladda(this.fj.maxAnslag * clamp(styrka, 0, 1))
  }

  // KANINEN SLÅR I. Anropas vid `collisionStart` (före lösaren). Returnerar null om det inte var ett
  // anslag (kaninen kommer underifrån, eller mattan är mitt i utkastet) — annars
  // { vn, ladd, hojd }: anslagsfarten, laddningen i px/steg och `hojd` 0…1 (ljudets/uttryckets mått).
  landa(char, power) {
    if (!this._alive || !char) return null
    const fj = this.fj
    const vn = fj.anslagsfart(char)
    if (!(vn > 0) || fj.kompFart < 0) return null
    const ladd = laddning(vn, power, this.y)
    // Kaninens fart in i mattan SKRIVS OM till laddningen — taEmot läser den (minus mattans egen dykfart),
    // sväljer den och lagrar den i fjädern, så fjäderns fart blir exakt `ladd`. Är mattan redan nedtryckt
    // djupare än så (ett tryck just före landningen) läggs ingenting ovanpå: laddningen STAPLAS aldrig, för
    // taket gäller summan (uppmätt: tryck + landning gav 18 px/steg och kaninen y −22 utan nät).
    const hog = Math.max(0, fj.kompFart)
    if (ladd > hog) {
      Body.setVelocity(char, { x: char.velocity.x, y: ladd })
      if (!(fj.taEmot(char) > 0)) return null
    }
    // …och kaninen åker med brädan ner (se filhuvudet), annars är kontakten borta när den vänder.
    Body.setVelocity(char, { x: char.velocity.x, y: fj.kompFart })
    // `hojd` mäts på en FAST skala (golvet … den jämna toppen), inte mot dagens tak: ljudet ska stiga med höjden.
    return { vn, ladd, hojd: clamp((ladd - MIN_LADDNING) / (JAMN_MAX - MIN_LADDNING), 0, 1) }
  }

  destroy() {
    this._alive = false
    this.k?.destroy()
    this.fj?.destroy()
  }
}
