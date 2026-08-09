// FJÄDERBRÄDA — en planka som LAGRAR ett anslag och ger tillbaka det
// (LYFTPLAN B5, spår 3 runda P1).
//
// `kulbana`s studsplatta var en STATISK kropp med `restitution: 0.95` och en
// GSAP-squash ovanpå. Två fel i ett: studsen var en konstant multiplikation (samma
// andel tillbaka oavsett hur hårt kulan slog i), och tillplattningen var ren dekor —
// den satt på `part.scale` och kunde inte påverka en enda kropp. Barnet såg alltså
// aldrig VARFÖR kulan flög: plattan stod blick stilla i samma sekund som den
// påstods vara en fjäder.
//
// En riktig studsmatta gör tvärtom: den ger efter, sjunker undan under den fallande
// kroppen, vänder, och det är MATTANS EGEN FART UPPÅT som kastar iväg. Det är den
// modellen som ligger här — en fjäder med eget tillstånd (inpressning + fart), och
// matter gör utkastet självt när plankans kropp rör sig uppåt genom kulan.
//
//   const f = new Fjaderbrada({ bredd: 140, hojd: 32 })
//   ...vid anslag:                 const last = f.ladda(f.anslagsfart(kula, vinkel))
//   ...i phys.beforeStep():        if (f.steg()) f.driv(kropp, x, y, vinkel)
//   ...varje bildruta:             f.path(g.clear()).fill(färg)
//   ...destroy():                  f.destroy()
//
// ⚠️ FARTEN MÅSTE SÄTTAS I MATTERS TAKT, ANNARS FINNS DEN INTE. `driv()` flyttar
// kroppen med `Body.setPosition(..., true)`: `updateVelocity`-flaggan är hela
// mekaniken. Uppmätt i samma scen (kula som faller mot en planka som svänger
// ±24 px): med flaggan lämnar kulan plankan i **10,83 px/steg**, utan den i
// **3,87** — praktiskt taget samma som en helt stillastående planka (3,67).
// Matters lösare läser `body.velocity` även på statiska kroppar; positionen ensam
// säger den ingenting om kraft. Och `beforeStep` (inte bildrutan) är takten: farten
// mäts i px/STEG, och en bildruta kan innehålla 1–5 steg.
//
// TAKET ÄR INBYGGT, INTE PÅKLISTRAT (P0 MOTGÅNG + "aldrig fly ur banan"): det är
// LADDNINGEN som klipps, inte inpressningen. Att klippa läget och nolla farten hade
// slukat energin i just de hårdaste träffarna — bräddan hade blivit slappast när
// barnet spelade som mest.
//
// ⚠️ STYVHET, DJUP OCH TAK ÄR SAMMA TAL TRE GÅNGER — sätt dem inte var för sig.
// Första versionen hade `styvhet`, `maxKomp` och `absorb` som fria rattar, och de åt
// upp varandra tyst: taket (√styvhet·maxKomp = 8,3 px/steg) låg under en normal träff,
// så bräddan bottnade vid FYRA av fem uppmätta fallhöjder och hela dynamiken försvann
// (uppmätt djup 16,8 · 24,0 · 23,4 · 23,4 · 23,5 px — en platt linje som såg ut som
// ett tak men var en förlorad ratt). Här räknas de i stället FRAM ur två tal som
// betyder något för spelet: `maxAnslag` (den fart som ska ge full inpressning — MÄTT
// i spelet) och `maxKomp` (hur djupt det får synas).
//
// Och kinematiken går inte att förhandla med: en matta som stoppar en kula i farten v
// inom djupet d gör det på ~π·d/(2v) steg. En 22 px djup bräda som tar emot 7,4 px/steg
// HINNER inte "ladda långsamt" — den gör det på ~3,5 steg. Djup och långsam går bara
// att få genom att kasta iväg svagare. Det som bär det springiga INTRYCKET är därför
// inte kontakttiden utan efterskalvet: mjukkroppen ringer i ~0,3 s efter att kulan
// lämnat (samma sak som bär glasstornets kopa).
//
// ÅTERKASTET är asymmetriskt, precis som en studsmatta med en unge på: mjukare in än
// ut. Utfarten blir då `retur · anslagsfart` (styvUt = styvIn · retur²) — ETT tal som
// betyder "hur mycket mer än den fick tillbaka bräddan ger", i stället för en
// energiräkning i huvudet.
//
// Rena tal + matter + Mjukkropp (silhuetten). Ingen Pixi, inga tweens, inga timers —
// bräddan kan inte överleva ett spelbyte, och `steg()` efter `destroy()` gör inget.
import Matter from 'matter-js'
import { Mjukkropp } from './mjukkropp.js'

const { Body } = Matter
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

// Plankans vilosilhuett: en superellips i stället för en ren ellips, så ändarna är
// FULLA som på en planka. En ellips läser som en lins, och exponent 4 räckte inte —
// den ritade bräddan som ett blad med spetsiga ändar (uppmätt: 84 % av tjockleken
// kvar vid 84 % av halva bredden). Exponent 8 ger 92 % vid 92 %, vilket läser som en
// bräda med rundade hörn.
const P = 8
const PLANKFORM = (a) => 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)), P) + Math.pow(Math.abs(Math.sin(a)), P), 1 / P)

export class Fjaderbrada {
  // bredd/hojd   plankans mått (px, i delens EGET koordinatsystem — mitten är 0,0).
  // maxAnslag    den anslagsfart (px/steg) som ger FULL inpressning — mät den i
  //              spelet, gissa den inte. Hårdare träffar än så bottnar (taket), och
  //              `last` (0…1) skalas mot den.
  // maxKomp      djupaste inpressning (px). Sätt den efter tjockleken: en 32 px
  //              planka som sjunker 22 px läser som en studsmatta, 60 px som ett hål.
  // retur        hur mycket FORTARE kulan lämnar än den kom (1 = golv, 1,2 = matta).
  //              Utfarten är retur · anslagsfart; höjden växer med kvadraten.
  // damp         fartdämpning per steg — gäller efterskalvet, inte kontakten.
  // overslag     hur långt över viloläget plankan får bukta ut (andel av maxKomp).
  // troghet      hur mycket av inpressningen som drar med hela mjukkroppen (0–1).
  //              Verlet läser förflyttningen som fart → axlarna släpar efter mitten.
  // mjuk         false = ingen mjukkropp (bara talen; `path` ger då en rundad ruta).
  constructor({
    bredd = 140,
    hojd = 32,
    maxAnslag = 10,
    maxKomp = 22,
    retur = 1.2,
    damp = 0.93,
    overslag = 0.3,
    // 0,9 och inte 0,7: en bräda BÖJER sig, den pressas inte ihop. Med för mycket
    // eftersläpning stannar undersidan kvar medan översidan sjunker, och plankan blev
    // synligt tunnare i mitten (uppmätt 18 % av tjockleken vid full inpressning) —
    // som en pannkaka, inte som en bräda. En gnutta släpning ger den liv.
    troghet = 0.9,
    punkter = 20,
    mjuk = true,
    vilaKomp = 0.5,
    vilaFart = 0.25,
  } = {}) {
    this.bredd = bredd
    this.hojd = hojd
    this.maxAnslag = maxAnslag
    this.maxKomp = maxKomp
    this.retur = retur
    this.damp = damp
    this.overslag = overslag
    this.troghet = troghet
    this.vilaKomp = vilaKomp
    this.vilaFart = vilaFart
    // Taket är anslagsfarten själv (bräddan lagrar den rakt), och styvheten är det som
    // gör att just den farten bottnar på exakt `maxKomp`. Ut igen med `retur` gånger
    // farten → styvUt = styvIn · retur².
    this.maxFart = maxAnslag
    this.styvIn = (maxAnslag / maxKomp) ** 2
    this.styvUt = this.styvIn * retur ** 2

    this.komp = 0 // px inpressning just nu (negativ = buktar ut över viloläget)
    this.kompFart = 0 // px/steg
    this._last = 0 // 0…1, hur hård den senaste laddningen var (ljud + skak)
    this._mjukStill = true // efterskalvet dött ut? (styr om `steg` har något att göra)
    this._alive = true

    this._m = null
    if (mjuk) {
      const n = Math.max(8, (punkter | 0) - ((punkter | 0) % 4)) // delbart med 4 → ändpunkter finns
      this._m = new Mjukkropp({ w: bredd, h: hojd, punkter: n, grav: 0, damp: 0.9, iter: 6, tryck: 1, styvhet: 1, form: PLANKFORM })
      // FÄSTENA. En bräda är skruvad i båda ändar — utan spikade ändpunkter sjunker
      // hela kroppen i stället för att BÖJA sig, och då finns ingen fjäder att se.
      // Tre punkter per ände (ändpunkten + dess grannar) = en ände som inte vrider sig.
      const hoger = n / 4 // 0° = höger ände
      const vanster = (3 * n) / 4 // 180° = vänster ände
      for (const i of [hoger - 1, hoger, hoger + 1, vanster - 1, vanster, vanster + 1]) {
        const p = this._m.pts[(i + n) % n]
        this._m.fast((i + n) % n, p.x, p.y)
      }
      this._toppVilaY = this._m.pts[this._m.topp].y
    }
  }

  // Kulans fart IN I plankan (px/steg) längs normalen, RELATIVT plankans egen yta.
  // Negativ = kommer underifrån, eller lämnar.
  //
  // ⚠️ RELATIVT, inte absolut. Absolut fart läser en matta som åker UPP i en fallande
  // kula som ett nytt, hårt anslag — och laddar fjädern en gång till med energi den
  // just gav bort. Uppmätt med absolut fart: en nätt beröring (3,5 px/steg) kastade
  // kulan 133 px, och de hårdaste anslagen gav LÄGRE kast än de mellanhårda
  // (288 → 285 → 270 px) därför att pumpen tog över utfallet. Ligger i libbet och
  // inte i spelet därför att sonden måste räkna exakt likadant som spelet — ett eget
  // skalärproduktsuttryck i sonden mäter sonden, inte spelet.
  anslagsfart(body, vinkel = 0) {
    const n = this.normal(vinkel)
    const v = body?.velocity
    return v ? v.x * n.x + v.y * n.y - this.kompFart : 0
  }

  // Plankans INÅT-normal i världen (delens lokala (0,1) vriden `vinkel`): den
  // riktning inpressningen går. Utkastet går rakt motsatt — vrider barnet brädan
  // vrids alltså utkastet med, och det är just den kontrollen som gör den till ett
  // verktyg och inte en slump.
  normal(vinkel = 0) {
    return { x: -Math.sin(vinkel), y: Math.cos(vinkel) }
  }

  // TA EMOT: bräddan SVÄLJER anslaget (lagrar det i fjädern) i stället för att låta
  // matter kasta iväg kulan elastiskt i samma steg. Anropas vid `collisionStart` —
  // matter skickar det INNAN hastighetslösaren körs, så farten vi nollar här är den
  // lösaren räknar på. Returnerar lasten 0…1.
  //
  // ⚠️ UTAN DETTA SKER ÅTERGÅNGEN I TOMMA LUFTEN. Kulan studsar bort på SIN EGEN
  // restitution (0,42 i kulbana) i samma steg som den träffar, och är sedan borta
  // i 30 steg — medan mattan gör hela sin dykning och återgång på ~6. Uppmätt utan
  // `taEmot`: höjden efter studsen blev 85 · 79 · 56 · 31 · 103 px för allt hårdare
  // anslag, alltså inte bara svagt utan ICKE-MONOTONT — utfallet avgjordes av var i
  // fjäderns cykel kulan råkade komma tillbaka, vilket är ren slump för barnet.
  // Att svälja farten är dessutom det ÄRLIGA bokslutet: kulan tappar exakt `vn`,
  // fjädern lagrar exakt `vn`, och `retur` säger hur mycket mer den ger tillbaka.
  taEmot(body, vinkel = 0) {
    if (!this._alive || !body) return 0
    // GRINDEN ÄR ÅTERGÅNGEN, INTE VILAN. Går plankan UPPÅT är kontakten själva utkastet
    // — då ska matters lösare göra jobbet, inte fjädern laddas med energi den just gav
    // bort (det var pumpen bakom mätningen ovan). Går den nedåt eller ligger still är en
    // annalkande kula ett äkta nytt anslag, och en studsmatta ska kunna ta emot det.
    //
    // Första versionen krävde full vila i stället, och det mätte fel sak: skalären
    // behöver 103 steg (1,7 s) för att ringa ut de sista tiondelarna av en px — längre
    // tid än kulans hela kast och återfall (~1,5 s). Bräddan hade alltså vägrat ta emot
    // just den kula den själv nyss kastade upp, och känts som en styv platta varannan
    // studs.
    if (this.kompFart < 0) return 0
    const vn = this.anslagsfart(body, vinkel)
    if (vn <= 0) return 0 // kommer underifrån/glider längs — inget anslag att lagra
    const n = this.normal(vinkel)
    Body.setVelocity(body, { x: body.velocity.x - n.x * vn, y: body.velocity.y - n.y * vn })
    return this.ladda(vn)
  }

  // Ett anslag med farten `vn` (px/steg in i plankan). Returnerar lasten 0…1.
  ladda(vn) {
    if (!this._alive) return 0
    const inn = clamp(vn, 0, this.maxAnslag)
    const last = this.maxAnslag > 0 ? inn / this.maxAnslag : 0
    this.kompFart = clamp(this.kompFart + inn, -this.maxFart, this.maxFart)
    this._last = Math.max(this._last, last)
    return last
  }

  // ETT fast fysiksteg. Returnerar false när bräddan redan låg still — då behöver
  // varken kroppen flyttas eller silhuetten ritas om (en orörd bräda kostar noll).
  steg() {
    if (!this._alive) return false
    // Fjädern kan ligga still medan MJUKKROPPEN fortfarande ringer — och det är just
    // efterskalvet ögat läser som "springig". Steget får därför inte sluta med
    // skalären, annars fryser plankan mitt i en bukt.
    if (this.komp === 0 && this.kompFart === 0 && this._mjukStill) return false
    const forra = this.komp
    // Mjukare in än ut: `styvIn` medan bräddan pressas, `styvUt` medan den sparkar
    // tillbaka. Det är den asymmetrin som gör den till en matta och inte ett golv.
    const k = this.kompFart > 0 ? this.styvIn : this.styvUt
    this.kompFart = (this.kompFart - k * this.komp) * this.damp
    this.komp += this.kompFart
    // Säkerhetsnät (nås inte med kapad laddning): botten och överslaget.
    const tak = this.maxKomp
    const botten = -this.maxKomp * this.overslag
    if (this.komp > tak) {
      this.komp = tak
      if (this.kompFart > 0) this.kompFart = 0
    } else if (this.komp < botten) {
      this.komp = botten
      if (this.kompFart < 0) this.kompFart = 0
    }
    if (Math.abs(this.komp) < this.vilaKomp && Math.abs(this.kompFart) < this.vilaFart) {
      this.komp = 0
      this.kompFart = 0
      this._last = 0
    }
    this._mjukSteg(this.komp - forra)
    return true
  }

  // Flytta plankans kropp till viloläget + inpressningen längs normalen — MED fart,
  // annars är hela bräddan bara en bild (se filhuvudet). Anropas per fysiksteg.
  driv(body, x, y, vinkel = 0) {
    if (!this._alive || !body) return this
    const n = this.normal(vinkel)
    Body.setPosition(body, { x: x + n.x * this.komp, y: y + n.y * this.komp }, true)
    return this
  }

  // BÄR bräddan dit någon annan bestämt (barnets drag, en vridning, en nollställning) —
  // utan att ge den någon kastkraft.
  //
  // ⚠️ ANVÄND ALDRIG `driv` TILL ETT DRAG. `updateVelocity` gör förflyttningen till en
  // fart, och ett drag på 230 px blir då en planka som enligt matter far uppåt i
  // 230 px/steg. Uppmätt i spelet: kroppens fart låg kvar på (−651, −230) hela
  // byggfasen, och när kulan sedan kom emot den läste lösaren kontakten som SEPARERANDE
  // (relativ normalfart positiv) och la ingen impuls alls — kulan föll rakt genom
  // bräddan, utan ett enda konsolfel. Sådana här farter dör inte av sig själva: matter
  // räknar aldrig om hastigheten på en statisk kropp.
  flytta(body, x, y, vinkel = 0) {
    if (!this._alive || !body) return this
    const n = this.normal(vinkel)
    Body.setPosition(body, { x: x + n.x * this.komp, y: y + n.y * this.komp })
    Body.setVelocity(body, { x: 0, y: 0 })
    return this
  }

  get last() {
    return this._last
  }

  // KLAR ATT TA EMOT (inte "helt stilla"): bara skalären. Att kräva att mjukkroppen
  // också tystnat hade gjort bräddan avvisande i en halv sekund efter varje kast —
  // och det är precis då kulan kommer tillbaka.
  get vilar() {
    return this.komp === 0 && this.kompFart === 0
  }

  // Tillbaka till viloläget (ny bana, nytt släpp) — utan att lämna kvar en fart som
  // hade kastat iväg nästa kula ur tomma intet.
  nolla() {
    this.komp = 0
    this.kompFart = 0
    this._last = 0
    if (this._m) {
      this._m.fast(this._m.topp, 0, this._toppVilaY)
      for (let i = 0; i < 8; i++) this._m.steg(1) // låt formen sätta sig i vila
    }
    this._mjukStill = true
    return this
  }

  // Hur hoptryckt silhuetten är (1 = viloform) — sondens mått på att formen håller.
  fyllnad() {
    return this._m ? this._m.fyllnad() : 1
  }

  // Silhuetten i delens egna koordinater (mitten 0,0). `skala` krymper mot mitten så
  // ALLA lager (skugga, kropp, glans) kan ritas ur SAMMA kropp — annars glider de
  // isär i böjen (lärdomen från glasstornets kopa).
  path(g, skala = 1) {
    if (this._m) return this._m.path(g, skala)
    const w = (this.bredd * skala) / 2
    const h = (this.hojd * skala) / 2
    return g.roundRect(-w, -h + this.komp, w * 2, h * 2, Math.min(14, h))
  }

  // Plankans mittlinje just nu (till gnistor och skak).
  get mittY() {
    return this._m ? this._m.pts[this._m.topp].y + this.hojd / 2 : this.komp
  }

  // Y på UNDERSIDAN vid en lokal x. Allt som sitter fast i plankan (fjädrarna under
  // den, en skruv, en skugga) måste läsa kroppen i stället för att räkna på `komp`:
  // mitten sjunker hela vägen men ändarna är fastskruvade, så en fjäder ritad på
  // `komp` släpper från plankan med några px i just de bildrutor barnet tittar på.
  // Samma sömn som glasstornets skugga och regnbågsband (en kropp, N lager).
  undersida(x) {
    const m = this._m
    if (!m) return this.hojd / 2 + this.komp
    const c = m.pts[m.mitt]
    let v = null
    let h = null
    for (let i = 0; i < m.n; i++) {
      const p = m.pts[i]
      if (p.y <= c.y) continue // bara undre halvan
      if (p.x <= x && (!v || p.x > v.x)) v = p
      if (p.x >= x && (!h || p.x < h.x)) h = p
    }
    if (!v) return h ? h.y : this.hojd / 2 + this.komp
    if (!h) return v.y
    const d = h.x - v.x
    return d < 0.001 ? v.y : v.y + ((h.y - v.y) * (x - v.x)) / d
  }

  // Största punktfarten i mjukkroppen (px/steg) — måttet på om efterskalvet dött ut.
  _mjukFart() {
    const m = this._m
    if (!m) return 0
    let s = 0
    for (let i = 0; i < m.n; i++) {
      const p = m.pts[i]
      const d = Math.abs(p.x - p.px) + Math.abs(p.y - p.py)
      if (d > s) s = d
    }
    return s
  }

  _mjukSteg(d) {
    const m = this._m
    if (!m) return
    // Mitten spikas EXAKT vid inpressningen: den ytan är den kulan studsar mot, och
    // en silhuett som sjunker "ungefär" lika mycket som kroppen ljuger om fysiken.
    // Axlarna och undersidan får släpa efter (tröghet) → böj, inte stämpel.
    m.fast(m.topp, 0, this._toppVilaY + this.komp)
    if (d !== 0) m.skjut(0, d * this.troghet)
    m.steg(1)
    this._mjukStill = this._mjukFart() < 0.05
  }

  destroy() {
    this._alive = false
    this.komp = 0
    this.kompFart = 0
    this._m?.destroy()
    this._m = null
  }
}

export function makeFjaderbrada(opts) {
  return new Fjaderbrada(opts)
}
