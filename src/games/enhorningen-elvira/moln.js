// MOLNET — Elviras studsmoln som en riktig fjäder, utan Pixi (FYSIKPLAN P1).
//
// Molnstudsen var SKRIPTAD: `_cloudBoost` skrev `Body.setVelocity(-up)` på Elvira i bildrutan efter
// träffen, med en uppfart ur studsräknaren (6,5 · 5,2 · 3,9 …). Den berodde alltså bara på HUR MÅNGA
// moln hon studsat på — aldrig på hur högt hon föll. Och molnens `restitution: 0.6` gjorde ingenting
// (statisk kropp, CLAUDE.md V10): det var Elviras egen 0,4 som studsade, så utan golvet i
// `_cloudBoost` hade det blivit 0,4 · fartens in. Nu är varje moln en `Fjaderbrada`:
//
//   • Elvira landar OVANPÅ → molnet SVÄLJER anslaget (`taEmot`), trycks ner, vänder, och det är
//     molnets egen fart UPPÅT som kastar iväg henne. Pressningen syns som molnets egen kropp (spelet
//     läser `komp`), så barnet ser VARFÖR hon flyger.
//   • LADDNINGEN = ett golv som avtar för varje molnstuds (GOLV_BAS · (1 − (n−1)/MAX_BOUNCES), samma
//     avtagande garanti som förut: aldrig en evighetsloop) + FALL_ANDEL · anslagsfarten. Faller hon
//     högre studsar hon alltså högre, och efter MAX_BOUNCES finns bara den dämpade delen kvar.
//   • TAKET är räknat ur geometrin (`taket`): en molnstuds tar henne aldrig högre än mittpunkt
//     y = TOPP_MARG (hon rör aldrig taket av ett moln), och aldrig över MAX_LADD (P0: aldrig ur bild).
//   • En träff från SIDAN eller UNDERIFRÅN är ingen landning — den får sin vanliga studs (0,4) som förut.
//
// ⚠️ ELVIRAS RESTITUTION ÄR KVAR (väggar och golv studsar på den, de är statiska = 0). Det är bara PARET
// mot molnets ovansida som nollas (`pair.restitution = 0` i collisionStart, innan lösaren läser den) —
// annars lägger matters lösare ett eget (1+e)-kast ovanpå molnets.
//
// ⚠️ ELVIRA MÅSTE FÖLJA MED NER (samma lärdom som studsmattan): `landa` sätter hennes lodräta fart till
// molnets egen dykfart, så kontakten finns kvar när molnet vänder och utfarten följer laddningen.
import { Fjaderbrada } from '../../lib/fjader.js'
import { Matter, STEG2 } from '../../lib/physics.js'

const { Body } = Matter

export const CLOUD_BODY_W = 114 // fysikkroppens mått (CLOUD_W − 18 · CLOUD_H − 8 i spelet)
export const CLOUD_BODY_H = 38
export const ELVIRA_R = 46 // spelets fysikradie (taket räknas mot den)

export const MAX_BOUNCES = 5 // molnstudsar per kast som får en garanterad lyftdel
export const GOLV_BAS = 5 // px/steg: lyftdelen vid FÖRSTA molnstudsen (avtar mot 0 vid MAX_BOUNCES)
export const FALL_ANDEL = 0.45 // andel av anslagsfarten som kommer tillbaka som laddning
export const MAX_LADD = 14 // px/steg: aldrig mer än så, oavsett fall (≈ 14² / 2g = 440 px stigning vid lätt)
export const MIN_LADD = 3.5 // px/steg: golvet för en studs som överhuvudtaget sker
export const VILA_UNDER = 2.2 // laddning under detta = ingen studs (hon får vila på molnet)
export const TOPP_MARG = 56 // en molnstuds tar aldrig mittpunkten ovanför denna y (taket ligger på ELVIRA_R)
// Fjäderns egna mått — samma som studsmattans (uppmätt där: utfarten = laddningen).
export const MAX_ANSLAG = 18
export const RETUR = 1.3 // kraftigare / dämpning 0,85 äter en del av utkastet: retur 1,3 ger utfart ≈ 0,5–0,58 · laddningen (apex inkl. luft), och ett fall på 60 px ger samma höjd som HEAD (63 mot 65 px)
export const OVERSLAG = 0.6
export const MAX_KOMP = 26
export const DAMP = 0.85 // fartdämpning per steg: molnet ringer ut på ~25 steg (studsmattans 0,93 tog ~100 — Elvira landade på ett moln som fortfarande vickade)
export const REST_FART = 2.5 // en uppåtgående fart under detta (px/steg) är efterskalv, inte ett utkast: hon får landa ändå

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// Högsta tillåtna utfart (px/steg) för ett moln vars ÖVERKANT står på `toppY`: Elviras mittpunkt startar
// ELVIRA_R över molnet, stiger v² / 2g, och ska aldrig komma över TOPP_MARG. Luftmotståndet gör att hon i
// verkligheten stiger lite lägre — taket är alltså konservativt.
export function taket(toppY, gravity) {
  const g = gravity * 0.001 * STEG2 // px/steg² (matters gravitation)
  return Math.sqrt(2 * g * Math.max(1, toppY - ELVIRA_R - TOPP_MARG))
}

// Laddningen (≈ utfarten) för en landning. Ren funktion — sonden räknar med exakt samma.
//   vn anslagsfart (px/steg, nedåt positiv) · bounce molnstudsens nummer i kastet (1…) · gravity
//   spelets gravitation (lätt 0,8 / tung 1,45) · toppY molnets överkant. Returnerar 0 = ingen studs.
export function laddning(vn, bounce, gravity, toppY) {
  const golv = bounce <= MAX_BOUNCES ? GOLV_BAS * (1 - (bounce - 1) / MAX_BOUNCES) : 0
  const rå = golv + FALL_ANDEL * Math.max(0, vn)
  if (rå < VILA_UNDER) return 0
  return Math.min(Math.max(rå, MIN_LADD), MAX_LADD, Math.max(MIN_LADD, taket(toppY, gravity)))
}

export class Moln {
  // phys: PhysicsWorld · x, y: molnets mitt (kroppens mitt)
  constructor(phys, x, y) {
    this.phys = phys
    this.fj = new Fjaderbrada({ bredd: CLOUD_BODY_W, hojd: CLOUD_BODY_H, maxAnslag: MAX_ANSLAG, maxKomp: MAX_KOMP, retur: RETUR, overslag: OVERSLAG, damp: DAMP, mjuk: false })
    this.body = phys.rectangle(x, y, CLOUD_BODY_W, CLOUD_BODY_H, { isStatic: true, label: 'cloud' })
    // Fjädern stegas HÄR, i fysiksteget (px/STEG), och läggs som avvikelse ovanpå basen.
    this.k = phys.kinematisk(this.body, {
      avvikelse: () => {
        this.fj.steg()
        return { x: 0, y: this.fj.komp }
      },
    })
    this._alive = true
  }

  // Överkanten i VILA (utan fjäderns utslag).
  get toppY() {
    return this.k.bas.y - CLOUD_BODY_H / 2
  }

  // Nedtryckningen i px (negativ = buktar uppåt över vilan). Spelet ritar molnet efter den.
  get komp() {
    return this.fj.komp
  }

  // Elvira slår i ovanifrån. Anropas vid `collisionStart` (före lösaren). null = ingen studs (underifrån, molnet
  // är mitt i utkastet, eller en nuddande beröring → hon får vila); annars { vn, ladd, hojd } där `hojd` är
  // 0…1 på en fast skala (ljudets/uttryckets mått).
  landa(el, bounce, gravity) {
    if (!this._alive || !el) return null
    const fj = this.fj
    // Efterskalvet (litet uppåt) är inget utkast — nolla det så hon inte missar en riktig landning på ett moln som
    // råkar vicka uppåt just då (annars stannar hon inelastiskt, paret har restitution 0).
    if (fj.kompFart < 0 && fj.kompFart > -REST_FART && Math.abs(fj.komp) < 8) fj.kompFart = 0
    const vn = fj.anslagsfart(el)
    if (!(vn > 0) || fj.kompFart < 0) return null
    const ladd = laddning(vn, bounce, gravity, this.toppY)
    if (!(ladd > 0)) return null
    // Hennes fart in i molnet SKRIVS OM till laddningen — taEmot läser den (minus molnets egen dykfart), sväljer den
    // och lagrar den i fjädern. Är molnet redan nedtryckt djupare än så läggs ingenting ovanpå (laddningen STAPLAS
    // aldrig — taket gäller summan).
    const hog = Math.max(0, fj.kompFart)
    if (ladd > hog) {
      Body.setVelocity(el, { x: el.velocity.x, y: ladd })
      if (!(fj.taEmot(el) > 0)) return null
    }
    // …och hon åker med molnet ner, annars är kontakten borta när det vänder.
    Body.setVelocity(el, { x: el.velocity.x, y: fj.kompFart })
    return { vn, ladd, hojd: clamp((ladd - MIN_LADD) / (MAX_LADD - MIN_LADD), 0, 1) }
  }

  destroy() {
    if (!this._alive) return
    this._alive = false
    this.phys.removeBody(this.body) // river även den kinematiska länken
    this.fj?.destroy()
  }
}

// En träff mellan Elvira och ett moln — SAMMA kod i spelet och i sonden. `pair` är matters par ur collisionStart.
// Returnerar { topp, r }: topp = en landning ovanifrån (då är studsen molnets), r = landa()-resultatet.
export function molnTraff(moln, el, pair, bounce, gravity) {
  if (!moln || !el) return { topp: false, r: null }
  const topp = el.position.y < moln.k.bas.y - CLOUD_BODY_H / 2
  if (!topp) return { topp: false, r: null }
  if (pair) pair.restitution = 0 // paret mot molnets ovansida: studsen är molnets, inte lösarens
  return { topp: true, r: moln.landa(el, bounce, gravity) }
}
