// KÄRL — grytan (och majspåsen) som ett FYSISKT föremål som barnet bär och häller ur.
//
// Ägarens krav (2026-09-25): barnet ska luta och hälla SJÄLV, med fysik, aldrig med en
// knapp som gör det åt det. Ett finger och ingen rotationsgest (P0 småbarn).
//
// EN GEST (ägarens rapport 2026-09-26: "jättesvår att styra … fastnar, spiller, vägrar luta
// ibland"). Förut fanns tre lägen bakom samma finger — bär i bygeln, släpp över målet och
// VÄNTA, greppa sedan SIDAN och dra lodrätt — och varje avvikelse från den ordningen gav
// något oväntat (`_popcornnaiv`: 5 av 10 nybörjargrepp misslyckades, två tappade 26–29 av 30
// popcorn). Nu gäller en regel var man än tar i kärlet:
//
//   · kärlet BÄRS upprätt dit fingret drar (en handled håller emot, innehållet följer med)
//   · över sitt MÅL (en skål, grytan) vilar det på en osynlig HYLLA i hällhöjd — det går
//     aldrig att pressa ned i skålen eller genom grytan
//   · tryck VIDARE NEDÅT där → kärlet lutar, så mycket som fingret trycker; upp → det rätar
//     sig. Sidan fingret håller i sänks (där målet tillåter den sidan)
//   · släpp → det hänger kvar vågrätt över målet (annars glider det hem)
//
// Spelet beskriver hyllan med `karl.hylla(x)` (se `_folj`). Det enda spelet självt gör är den
// osynliga HANDEN när ingen håller i: kärlet glider till en parkeringspunkt och hänger där.
//
// Rena tal + matter. Ingen Pixi — `_grytprobe.mjs` och `_popcornhall.mjs` kör exakt den här
// klassen utan webbläsare.
//
// ⚠️ Handen RÖR SIG MED FART i `steg()` (anropas från `phys.beforeStep`), aldrig med en
// teleport: en kropp som flyttas med `setPosition(…, true)` bär farten kvar (CLAUDE.md).
//
// ⚠️ GREPPET ÄR INTE ETT matter-`Constraint`. Det var första försöket, och kärlet snurrade
// tusentals varv (`_grytprobe`: vinkel 166 215°, noll NaN, noll konsolfel). Matters villkor
// räknar vridningen som r×F·m/I utan r²-termen i den effektiva massan, så när greppet sitter
// längre från tyngdpunkten än kroppens tröghetsradie SKJUTER korrektionen ÖVER — här
// r²·m/I = 3,0 (bygeln 177 px ut, tröghetsradien 102 px), tre gånger för mycket per varv,
// och det växer. Punktgreppet i `steg()` löser 2×2-systemet med rätt effektiv massa.
import Matter from 'matter-js'

const { Bodies, Body } = Matter

// Hur stor del av glappet mellan hand och greppunkt som stängs per steg.
const GREPP_K = 0.35
// Handens accelerationstak (px/steg²).
const HAND_ACC = 0.8
// Vippningen: fingrets tryck UNDER hyllan → kärlets vinkel (VIPPA_PX px per radian). Taket ±120°:
// över det vänder mynningen nedåt, strålen blir 170 px bred och spills över skålens kant
// (upp och ned går, runt går inte). VIPPA_K = rad/steg per rad glapp, VIPPA_GREPP = hur hårt
// farten dras dit.
const VIPPA_PX = 90
// Vridpunkten: PIPEN själv (mynningens kant på den sida som häller), VIPPA_VRID px in mot mitten.
// Handen för pipen till hällpunkten (VIPPA_FORE före målets mitt) och håller den där medan
// resten av kärlet lyfts över den — så häller den som kan. Tre felaktiga vridpunkter mättes först
// (`_grytprobe --matris`): runt BYGELN svängde kärlet ut 170 px i sidled; runt kärlets MITT
// stod pipen 99 px ut när det började rinna och allt landade bredvid skålen; runt en punkt
// mot BORTRE sidan sänktes den hällande sidan ned i skålen och vippningen tog stopp vid 49–72°.
const VIPPA_VRID = 0
const VIPPA_MAX = 2.1
// Hur långt pipen sjunker (px) när kärlet vippats 90°.
const VIPPA_SANK = 140
// Pipen står så här långt FÖRE skålens mitt (bort från den hällande sidan). Vid ~105° vänder
// mynningen sig åt sidan, ovanför pipen, och popcornen trillar ut med fart bort från den —
// med pipen över mitten landade de på skålens bortre kant och utanför (`_grytprobe --bild`).
// Grytan sätter sin egen (70, `matt.js`), påsen sin (6).
const VIPPA_FORE = 60
const VIPPA_K = 0.1
const VIPPA_GREPP = 0.3
// Så långt (px) under hyllan fingret måste trycka innan hällningen börjar — ett darr när
// kärlet vilar på hyllan ska inte luta det.
const VIPPA_START = 10
// Pipen glider till hällpunkten i TAKT MED lutningen och är framme vid den här vinkeln (rad),
// alltså innan något hunnit rinna ut (~75°). Förut sköts pipen dit med full fart i samma
// ögonblick som vippningen började: grytan drogs 160 px i sidled i sin egen kant, vred sig
// moturs av ryckningen och doppade hörnet i köksbänken — lutningen fastnade på 27° och 26 av
// 30 popcorn hamnade på spisen (`_popcornspar`, fall G4 i `_popcornnaiv`).
const GLID_VINKEL = 0.9
// Handens fart (px/steg) under vilken kärlet räknas som stilla över målet och får börja tippa.
const STA_FART = 2.5
// Handleden i bygelgreppet: hur hårt vinkelfarten dras mot fjädern (0..1 per steg), och
// fjäderns styvhet (rad/steg per rad avvikelse).
const HANDLED = 0.35
const HANDLED_K = 0.12
// Hur fort den osynliga handen rätar upp ett parkerat kärl (rad/steg).
const UPPRAT_MAX = 0.035

const rot = (x, y, a) => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: x * c - y * s, y: x * s + y * c }
}

// PUNKTGREPPET: ge kroppen den impuls i punkten `r` (världsriktad förskjutning från
// tyngdpunkten) som får punkten att följa handen `h` = { x, y, vx, vy } — handens fart plus en
// andel av glappet. Löser 2×2-systemet Δv_punkt = K·J med K = (1/m)·I₂ + (1/I)·r⊥r⊥ᵀ, alltså
// rätt effektiv massa (se huvudet om varför det inte är ett matter-Constraint). Exporterad så
// att locket greppas med samma fysik som kärlen.
export function drivPunkt(b, r, h, k = GREPP_K) {
  const w = b.angularVelocity
  const dvx = h.vx + (h.x - (b.position.x + r.x)) * k - (b.velocity.x - w * r.y)
  const dvy = h.vy + (h.y - (b.position.y + r.y)) * k - (b.velocity.y + w * r.x)
  const im = b.inverseMass
  const ii = b.inverseInertia
  const k11 = im + ii * r.y * r.y
  const k12 = -ii * r.x * r.y
  const k22 = im + ii * r.x * r.x
  const det = k11 * k22 - k12 * k12
  if (det <= 1e-12) return
  const jx = (k22 * dvx - k12 * dvy) / det
  const jy = (-k12 * dvx + k11 * dvy) / det
  Body.setVelocity(b, { x: b.velocity.x + jx * im, y: b.velocity.y + jy * im })
  Body.setAngularVelocity(b, w + ii * (r.x * jy - r.y * jx))
}

export class Karl {
  // Lokalt rum: origo = MITTEN AV MYNNINGEN (väggarnas överkant), y nedåt.
  //   bredd   innermått mellan väggarna
  //   djup    väggarnas höjd (mynning → golvets ovansida)
  //   vagg    väggtjocklek · golv  bottentjocklek
  //   bygel   hur högt bygelns topp står över mynningen (0 = ingen bygel)
  //   greppHalo  hur långt utanför kroppen ett grepp ändå räknas (P0 hit-halo)
  //   utfall  väggarnas lutning utåt (rad). `bredd` gäller vid mynningen; botten är smalare.
  //
  // ⚠️ HÄLLVINKELN = 90° − utfall + friktionsvinkeln. Med raka väggar och paret popcorn/gryta
  // på friktion 0,5 (27°) började det rinna först vid ~117° — då hade pipen svept långt förbi
  // skålen (`_grytprobe --matris`: 85° hällde ut 15–35 %). Hal gryta (oljad metall) och 15°
  // utfall flyttar det till ~75°, där barnets drag fortfarande är kort.
  constructor(phys, { x, y, bredd = 190, djup = 104, vagg = 13, golv = 16, bygel = 92, utfall = 0, densitet = 0.006, friktion = 0.5, greppHalo = 34, label = 'karl', maxFart = 22, vinkelDamp = 0.965, vippaVrid = VIPPA_VRID, vippaPx = VIPPA_PX, vippaFore = VIPPA_FORE, vippaSank = VIPPA_SANK, grupp = 0, vippaMax = VIPPA_MAX } = {}) {
    this.vippaMax = vippaMax
    this.vippaFore = vippaFore
    this.vippaSank = vippaSank
    this.vippaVrid = vippaVrid
    this.vippaPx = vippaPx
    this.phys = phys
    this.bredd = bredd
    this.djup = djup
    this.vagg = vagg
    this.golv = golv
    this.bygelH = bygel
    this.utfall = utfall
    this.bottenB = bredd - 2 * djup * Math.tan(utfall)
    this.greppHalo = greppHalo
    this.maxFart = maxFart
    this.vinkelDamp = vinkelDamp
    this.label = label

    // `grupp` < 0: kärl i samma grupp kolliderar aldrig med varandra (matters collisionFilter).
    // Handen driver kärlet utan att bry sig om kontakter, så ett buret kärl är en murbräcka —
    // påsen som bars till grytan knuffade ner grytan från spisen (`_popcornspel`).
    const opt = { density: densitet, friction: friktion, frictionStatic: 0.8, restitution: 0.05, label, collisionFilter: { group: grupp, category: 1, mask: 0xffffffff } }
    const botten = Bodies.rectangle(x, y + djup + golv / 2, this.bottenB + vagg * 2, golv, opt)
    const vaggar = [-1, 1].map((sida) => {
      // Innerlinjen går från bottnens kant till mynningens kant; väggen ligger utanför den.
      const mx = sida * (this.bottenB / 2 + bredd / 2) / 2 + sida * (vagg / 2) * Math.cos(utfall)
      const my = djup / 2 + (vagg / 2) * Math.sin(utfall)
      const b = Bodies.rectangle(x + mx, y + my, vagg, djup / Math.cos(utfall) + 2, opt)
      Body.setAngle(b, sida * utfall)
      return b
    })
    this.body = Body.create({ parts: [botten, ...vaggar], label, frictionAir: 0.02 })
    // Filtret läses på FÖRÄLDERN i matters bredfas — delarnas filter räcker inte.
    this.body.collisionFilter = { ...opt.collisionFilter }
    this._vilse = 0
    // Tyngdpunkten i det lokala rummet: matter lägger kroppens position i delarnas masscentrum.
    this._com = { x: this.body.position.x - x, y: this.body.position.y - y }
    phys.add(this.body)

    this._hand = null // { x, y, vx, vy } — handens punkt; null = ingen håller (kärlet står fritt)
    this._fast = null // greppunkten i kärlets lokala rum
    this._mal = { x: 0, y: 0 } // dit handen är på väg
    this.lage = 'fri' // 'fri' | 'grepp' (bärs) | 'vippa' (häller, fingret kvar) | 'park'
    this.zon = null // 'bygel' | 'kropp' — var fingret tog (ljudet); greppet sitter alltid i bygeln
    this._lokalGrepp = null
    // Hyllan: spelet sätter `hylla(x)` → { y, mal? } — bygelns lägsta höjd när kärlets mitt står
    // vid x, och (om kärlet får hälla där) målet { x, sidor, ... }. Utan hylla bärs det fritt.
    this.hylla = null
    // Rummets väggar i x ({ x0, x1 }): kärlets mitt hålls så långt in att det aldrig tar i dem.
    this.rum = null
    this._fing = null // fingret (världen) medan någon håller i
    this._hvila = null // fingrets vilonivå på hyllan (se `_folj`)
    this._hallMal = null // målet som hälls i just nu
    // Det som ligger i kärlet och ska följa med när det bärs (spelet sätter listan).
    this.innehall = null
    this.barAndel = 0.85
  }

  // ---- koordinater -------------------------------------------------------

  // Lokalt (mynningens mitt = origo) → världen, med kärlets nuvarande vinkel.
  varld(lx, ly) {
    const r = rot(lx - this._com.x, ly - this._com.y, this.body.angle)
    return { x: this.body.position.x + r.x, y: this.body.position.y + r.y }
  }

  lokal(wx, wy) {
    const r = rot(wx - this.body.position.x, wy - this.body.position.y, -this.body.angle)
    return { x: r.x + this._com.x, y: r.y + this._com.y }
  }

  get vinkel() {
    return this.body.angle
  }

  // Ligger en världspunkt INNE i kärlet (mellan väggarna, under mynningen)? `marg` > 0 tar
  // med en rand ovanför mynningen — det som ligger i en hög över kanten hör också till.
  inuti(wx, wy, marg = 0) {
    const p = this.lokal(wx, wy)
    return Math.abs(p.x) <= this.innerHalv(p.y) && p.y >= -marg && p.y <= this.djup
  }

  // Halva innerbredden på lokal höjd y (mynningen = bredd, botten = bottenB).
  innerHalv(y) {
    const t = Math.max(0, Math.min(1, y / this.djup))
    return (this.bredd + (this.bottenB - this.bredd) * t) / 2
  }

  // Vilken zon ett tryck landar i, eller null om det missar kärlet.
  zonVid(wx, wy) {
    const p = this.lokal(wx, wy)
    const h = this.greppHalo
    const ytter = this.bredd / 2 + this.vagg
    if (Math.abs(p.x) <= ytter + h && p.y >= -18 && p.y <= this.djup + this.golv + h) return 'kropp'
    if (this.bygelH > 0 && p.y < -18 && p.y >= -this.bygelH - h && Math.abs(p.x) <= ytter + h * 0.5) return 'bygel'
    return null
  }

  // Hur långt UTANFÖR kärlets egen form (kropp eller bygel) en punkt ligger — 0 = på kärlet.
  // När två kärls zoner överlappar (påsen hänger över grytan och täcker dess bygel) väljer
  // spelet det kärl fingret faktiskt rör, inte det vars osynliga halo råkar nå dit.
  avstand(wx, wy) {
    const p = this.lokal(wx, wy)
    const dx = Math.max(0, Math.abs(p.x) - (this.bredd / 2 + this.vagg))
    const topp = this.bygelH > 0 ? -this.bygelH : -18
    const dy = Math.max(0, topp - p.y, p.y - (this.djup + this.golv))
    return Math.hypot(dx, dy)
  }

  // ---- handen ------------------------------------------------------------

  // Barnet sätter fingret på kärlet. Returnerar zonen (eller null = miss).
  //
  // Var fingret än hamnar håller handen kärlet i BYGELN (påsen: mynningens mitt) — det bärs
  // upprätt. Förut hängde ett grepp i kroppen fritt från greppunkten och spillde längs vägen,
  // och ett grepp i bygeln på en parkerad gryta gick inte att luta alls (`_popcornnaiv` G3:
  // bygeln + drag nedåt pressade ned grytan i skålen och krossade ut 29 av 30 popcorn).
  greppa(wx, wy) {
    const zon = this.zonVid(wx, wy)
    if (!zon) return null
    const p = this.lokal(wx, wy)
    // Sidan fingret håller i blir den sida som sänks när kärlet lutas (där målet tillåter
    // den). Mitt på / i bygeln är obestämt — då väljer målet (`sidor[0]`).
    this._greppSida = Math.abs(p.x) > this.bredd * 0.25 ? Math.sign(p.x) : 0
    const lp = { x: 0, y: -this.bygelH }
    const fp = this.varld(lp.x, lp.y)
    // Handen börjar i själva greppunkten med PUNKTENS fart — ett kärl som fortfarande glider
    // (släppt nyss, på väg till sin parkering) ska inte tvärbromsas av greppet.
    this._satHand(lp, fp.x, fp.y, true)
    this._fing = { x: wx, y: wy }
    this._fingerOff = { x: fp.x - wx, y: fp.y - wy }
    this._mal.x = fp.x
    this._mal.y = fp.y
    this._hvila = null
    this._hallMal = null
    this.lage = 'grepp'
    this.zon = zon
    this._lokalGrepp = lp
    return zon
  }

  // Fingret rör sig. Vad det betyder (bära, vila på hyllan, luta) avgörs i `_folj`, varje
  // fast steg — hyllan kan flytta sig (påsens hylla följer grytan).
  dra(wx, wy) {
    if (this.lage !== 'grepp' && this.lage !== 'vippa') return
    this._fing = { x: wx, y: wy }
  }

  // Fingret släpper ett kärl som häller: det hänger kvar över målet och rätar upp sig lugnt.
  slappVippa() {
    if (this.lage !== 'vippa') return
    const lp = { x: 0, y: -this.bygelH }
    const p = this.varld(lp.x, lp.y)
    this._satHand(lp, p.x, p.y, true)
    this._mal.x = this._parkMal.x
    this._mal.y = this._parkMal.y
    this.lage = 'park'
    this.zon = 'bygel'
    this._fing = null
  }

  // Den osynliga handen tar kärlet i BYGELN och bär det till (x, y) = bygelns fästpunkt.
  // Kärlet hänger där vågrätt tills någon greppar det igen.
  parkera(x, y) {
    const lp = { x: 0, y: -this.bygelH }
    if (!this._hand || this._fast.x !== lp.x || this._fast.y !== lp.y) {
      const p = this.varld(lp.x, lp.y)
      this._satHand(lp, p.x, p.y, true)
    }
    this._mal.x = x
    this._mal.y = y
    this.lage = 'park'
    this.zon = 'bygel'
    this._lokalGrepp = lp
    this._fing = null
    this._hallMal = null
  }

  // Målet kärlet häller i just nu (null om det inte häller).
  get hallMal() {
    return this.lage === 'vippa' ? this._hallMal : null
  }

  // FINGRET → HANDEN, en gång per fast steg medan någon håller i.
  //
  // `hylla(x)` → { y, mal? }: bygelns lägsta höjd när kärlets mitt står vid x. Fingret kan
  // dra kärlet NED TILL hyllan, aldrig genom den. Står kärlet över ett mål (`mal`) blir det
  // som fingret trycker UNDER hyllan en lutning: `vippaPx` px per radian.
  //
  // Vilonivån `_hvila` är den högsta punkt fingret nått sedan kärlet lade sig på hyllan —
  // lutningen räknas därifrån. Bärs kärlet in över skålen LÄGRE än hyllan (från spisen, som
  // står lägre) lyfts det upp på hyllan men lutar inte förrän fingret faktiskt trycker nedåt.
  _folj() {
    const f = this._fing
    if (!f) return
    const T = { x: f.x + this._fingerOff.x, y: f.y + this._fingerOff.y }
    // Aldrig in i rummets väggar: med farten från bärningen slog grytan i högerväggen vid
    // skål 2 och slungade ut popcornen (`_popcornhallspar 2 1 --bild`).
    if (this.rum) {
      const halv = this.bredd / 2 + this.vagg + 12
      T.x = Math.max(this.rum.x0 + halv, Math.min(this.rum.x1 - halv, T.x))
    }
    const h = this.hylla?.(T.x)
    let tryck = 0
    if (h && T.y > h.y) {
      this._hvila = this._hvila == null ? T.y : Math.min(this._hvila, T.y)
      tryck = T.y - this._hvila
      T.y = h.y
    } else this._hvila = null
    if (this.lage === 'grepp') {
      this._mal.x = T.x
      this._mal.y = T.y
      // Kärlet tippar först när det STÅR över målet: började hällningen medan grytan ännu gled
      // efter bärningen, ärvde handen farten, sköt förbi och slog grytans kant i högerväggen
      // vid skål 2 — popcornen pressades ut uppåt (`_popcornhallspar 2 1 --bild`).
      const hv = this._hand
      if (h?.mal && tryck > VIPPA_START && Math.hypot(hv.vx, hv.vy) < STA_FART) this._borjaHalla(h)
      return
    }
    // Häller. Lämnar fingret målet i sidled räknas det som att det släpper trycket: kärlet
    // rätar upp sig och bärs sedan vidare.
    // Samma mål? Påsens mål räknas om ur grytans läge varje steg, så jämför med marginal — en
    // gryta som darrar en hundradels pixel avbröt annars hällningen efter 11° (`_popcornhall`).
    const samma = h?.mal && Math.abs(h.mal.x - this._hallMal.x) < 40
    const a = samma ? Math.max(0, tryck - VIPPA_START) : 0
    this._vippaMal = this._sida * Math.min(this.vippaMax, a / this.vippaPx)
    // Den som häller SÄNKER pipen mot skålen. Fallet från en pipe i parkeringshöjd var 180 px,
    // och popcorn som glidit av den lutande väggen flög förbi skålen (`_grytprobe` A: 55 % på
    // spisen och golvet till vänster om skålen). Kärlets botten svänger UPP runt pipen, så
    // pipen kan sjunka med lutningen utan att kärlet tar i skålen.
    // ⚠️ Sänkning och glidning följer fingrets MÅLVINKEL, inte den faktiska: den bortre kanten
    // stiger med ω·200 px när kärlet vrids runt pipen, och bara en pipe som sjunker FÖRE
    // vridningen tar ut det lyftet. Följde de den faktiska vinkeln kom handen efter, och
    // grytan blev en katapult — popcornen kastades upp vid −20° och landade 290 px bort
    // (`_popcornhallspar --bild`: 38–56 % i skålen mot 94 %).
    const m = Math.abs(this._vippaMal)
    const t = Math.min(1, m / (Math.PI / 2))
    const s = Math.min(1, m / GLID_VINKEL)
    const glid = s * s * (3 - 2 * s)
    this._mal.x = this._A.x + (this._ideal - this._A.x) * glid
    this._mal.y = this._A.y + this.vippaSank * t
    const v = Math.abs(this.body.angle)
    if (a <= 0 && v < 0.08 && Math.abs(this.body.angularVelocity) < 0.02) this._slutaHalla()
  }

  // Trycket under hyllan blev en lutning: handen flyttar sitt grepp till PIPEN (mynningens
  // kant på den sida som sänks) och kärlet vippar runt den.
  _borjaHalla(h) {
    const sidor = h.mal.sidor || [1, -1]
    this._sida = sidor.includes(this._greppSida) ? this._greppSida : sidor[0]
    const vrid = { x: this._sida * (this.bredd / 2 - this.vippaVrid), y: 0 }
    const pm = this.varld(vrid.x, vrid.y)
    this._satHand(vrid, pm.x, pm.y, true)
    // Pipens utgångsläge: där barnet höll kärlet, på hyllans höjd.
    this._A = { x: pm.x, y: h.y + this.bygelH }
    // Hällpunkten: pipen står `vippaFore` px FÖRE målets mitt. Vid ~105° vänder mynningen sig
    // åt sidan, ovanför pipen, och popcornen trillar ut med fart bort från den — med pipen över
    // mitten landade de på skålens bortre kant och utanför (`_grytprobe --bild`).
    this._ideal = h.mal.x - this._sida * this.vippaFore
    this._hallMal = h.mal
    this._parkMal = { x: h.mal.x, y: h.y }
    this._vippaMal = 0
    this.lage = 'vippa'
  }

  // Kärlet är upprätt igen och fingret trycker inte längre: tillbaka till bygelgreppet. Samma
  // förskjutning mot fingret som när barnet tog tag — kärlet glider tillbaka under fingret.
  _slutaHalla() {
    const lp = { x: 0, y: -this.bygelH }
    const p = this.varld(lp.x, lp.y)
    this._satHand(lp, p.x, p.y, true)
    this._hallMal = null
    this.lage = 'grepp'
  }

  // Vart bygelns fästpunkt ska stå för att kärlets golv ska vila på en yta på höjd `ytaY`.
  parkHojd(ytaY) {
    return ytaY - this.golv - this.djup - this.bygelH
  }

  // Släpp helt: kärlet står fritt (på spisen) och bärs av det det står på.
  lagNer() {
    this._taHand()
    this.lage = 'fri'
    this.zon = null
  }

  // Har den osynliga handen nått fram?
  framme(tol = 3) {
    if (!this._hand) return true
    return Math.hypot(this._hand.x - this._mal.x, this._hand.y - this._mal.y) <= tol
  }

  // `arv`: handen tar över greppunktens FART (v + ω×r) i stället för att börja stilla. Ett
  // grepp som flyttas (bygel → pipe → bygel) eller tas på ett kärl i rörelse ska inte bli en
  // tvärbroms — den slungade innehållet över kanten.
  _satHand(lp, ax, ay, arv = false) {
    let vx = 0
    let vy = 0
    if (arv) {
      const b = this.body
      const r = rot(lp.x - this._com.x, lp.y - this._com.y, b.angle)
      vx = b.velocity.x - b.angularVelocity * r.y
      vy = b.velocity.y + b.angularVelocity * r.x
    }
    this._hand = { x: ax, y: ay, vx, vy }
    this._fast = { x: lp.x, y: lp.y }
  }

  _taHand() {
    this._hand = null
    this._fast = null
  }

  // EN gång per fast steg (phys.beforeStep). Handen rör sig mot målet med ett fartak — ett
  // finger som flyger över skärmen får inte slita kärlet igenom sitt eget innehåll.
  steg() {
    const h = this._hand
    if (!h) return
    if (this.lage === 'grepp' || this.lage === 'vippa') this._folj()
    const dx = this._mal.x - h.x
    const dy = this._mal.y - h.y
    const d = Math.hypot(dx, dy)
    const park = this.lage === 'park' || this.lage === 'vippa'
    const max = park ? this.maxFart * 0.55 : this.maxFart
    // Handen ACCELERERAR och BROMSAR mjukt: ett finger kan gå från stillastående till
    // 20 px/steg på en bildruta och tvärstanna lika fort, en hand som håller i en gryta full
    // av popcorn gör det inte — och en tvärstopp slungade popcornen över kanten
    // (`_grytprobe` B: hälften spilld vid 1000 px/s). Farten mot målet är den man hinner
    // bromsa ifrån (√(2·a·d)), och ändringen per steg är klämd till `HAND_ACC`.
    const fart = Math.min(max, Math.sqrt(2 * HAND_ACC * d))
    let vx = d > 1e-6 ? (dx / d) * fart : 0
    let vy = d > 1e-6 ? (dy / d) * fart : 0
    const ax = vx - h.vx
    const ay = vy - h.vy
    const a = Math.hypot(ax, ay)
    if (a > HAND_ACC) {
      vx = h.vx + (ax / a) * HAND_ACC
      vy = h.vy + (ay / a) * HAND_ACC
    }
    if (d < 0.5 && Math.hypot(vx, vy) < HAND_ACC) {
      h.x = this._mal.x
      h.y = this._mal.y
      vx = 0
      vy = 0
    }
    h.vx = vx
    h.vy = vy
    h.x += h.vx
    h.y += h.vy

    // Punktgreppet: vilken fart ska greppunkten ha för att följa handen? Handens egen fart
    // plus en andel av glappet (ett mjukt grepp, inte ett stelt — fingret är ingen skruv).
    const b = this.body
    const v0x = b.velocity.x
    const v0y = b.velocity.y
    const r = rot(this._fast.x - this._com.x, this._fast.y - this._com.y, b.angle)
    drivPunkt(b, r, h)
    // HANDLEDEN. En hink som hänger fritt i bygeln lutar atan(a/g) mot varje acceleration, och
    // matters g är bara 0,278 px/steg² — ett fingerryck välte hela grytan och den tömdes
    // under bärningen (`_grytprobe` B: 10 % kvar vid 500 px/s). En hand som håller i bygeln
    // håller alltså också emot: vinkelfarten dras mot en fjäder kring vågrätt.
    let wn = b.angularVelocity
    if (this.lage === 'vippa') {
      // Fingret vippar kärlet runt pipen: vinkelfarten dras mot fingrets vinkel.
      wn += ((this._vippaMal - b.angle) * VIPPA_K - wn) * VIPPA_GREPP
    } else {
      wn += (-b.angle * HANDLED_K - wn) * HANDLED
      // En pendel utan friktion svänger för evigt: lite gnidning i greppet.
      wn *= park ? 0.9 : this.vinkelDamp
      // Ett kärl som rätar upp sig efter en vippning gör det LUGNT. Fjädern ensam vred tillbaka
      // 84° på ~10 steg och slungade ut det som låg vid mynningen — det var sondens "golv".
      if (park) wn = Math.max(-UPPRAT_MAX, Math.min(UPPRAT_MAX, wn))
    }
    Body.setAngularVelocity(b, wn)

    // INNEHÅLLET FÖLJER MED. Utan det ligger popcornen kvar när handen sätter fart och
    // klättrar ut över kanten när den bromsar: med en hal gryta hälldes 60 % ut på golvet
    // under en bärning i 1000 px/s (`_grytprobe` B). Samma grepp som saftbarens `_carryAll`,
    // fast för stela kroppar: de som ligger i kärlet får kärlets fartändring detta steg.
    // `barAndel` < 1 lämnar lite eftersläpning kvar — ett ryck skvimpar fortfarande.
    const dvx2 = b.velocity.x - v0x
    const dvy2 = b.velocity.y - v0y
    if (this.innehall && (dvx2 || dvy2)) {
      const k = this.barAndel
      for (const c of this.innehall) {
        if (c.isStatic || !this.inuti(c.position.x, c.position.y, 24)) continue
        Body.setVelocity(c, { x: c.velocity.x + dvx2 * k, y: c.velocity.y + dvy2 * k })
      }
    }
  }

  destroy() {
    this._taHand()
    this.phys = null
  }
}
