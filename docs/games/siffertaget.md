# Siffertåget (`siffertaget`)
> 🔤 larande · mixed · 3–5 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

Ett glatt, helt programmerat ånglok står till vänster på en lång räls; under på golvet
ligger 3–5 numrerade vagnar i blandad ordning. Den vagn som står näst på tur (vagn 1 vid
start) **lyser** med en pulsande gul glöd. Jag drar (eller tap-tap, via DragController) en
vagn upp till en spök-ruta vid loket — men en kopplingsplats *accepterar bara* rätt siffra
**och** att den är näst lediga, så fel ordning kan aldrig fastna: en felaktig vagn pyser
mjukt tillbaka med en wiggle. Rätt vagn → `correct`+`pling`, en gnistra, rösten räknar
("Ett!", "Två!"), och nästa vagn börjar lysa. När tåget är fullt: `celebrate`+`whoosh`,
ångpuff, "Tut tut!" + beröm, loket drar iväg **åt vänster** (dit fronten pekar) med vagnarna
efter sig i ordning, konfetti + stjärna + klistermärke. En ny, ev. längre runda (N växer 3→4→5 med nivån) startar. Idle ~6s →
"Vilken kommer efter ett?" + vink på den aktiva vagnen.

**Funkar bra:** loket är charmigt och *läses* tydligt som tåg (kofångare, panna, skorsten,
hytt, hjul — ingen lat emoji). Den lysande "näst på tur"-vagnen är en utmärkt icke-läsande
ledtråd. Räkne-rösten är knuten till handlingen. No-fail via accept-villkoret är elegant
(omöjligt att placera fel permanent). Exit-säkert, rundan är oändlig.

*(Skärmdump: rött lok, 3 spök-rutor, vagnar 3/2/1 på golvet, vagn 1 glöd-markerad; lång
tom räls till höger.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet beskriver siffer-/räknelek med tågtema: barnet kopplar vagnar i **stigande
ordning** genom att dra dem till nästa lediga koppling. Pedagogiken är *ordningstal +
räkneramsa* — siffran syns stor, prickraden (`dots`) ger ett icke-läsande antals-stöd, och
rösten befäster talordet vid varje rätt. Den lysande aktiva vagnen + det hårda accept-
villkoret är medvetna no-fail-grepp: barnet kan experimentera fritt utan att någonsin "göra
fel". Tåget som tutar och rullar iväg är belöningen som gör räknandet meningsfullt.

## 3. Vad gör det lättjefullt / tunt

Stark, korrekt grund — men pedagogiskt och scenografiskt tunt på flera punkter:

- **Svaret ges bort.** Endast *en* vagn lyser åt gången = barnet behöver aldrig veta vilket
  tal som kommer härnäst, det räcker att jaga glöden. Räknandet blir "dra den som blinkar",
  inte "vilken siffra är 3?". Ledtråden är så stark att tänkandet kortsluts.
- **Statisk, tom scen.** En platt `COLORS.bg`-tapet bakom räls + lok, och en lång räls som
  bara fortsätter tom åt höger (syns i skärmdumpen). Ingen värld, inget landskap som rullar
  förbi, ingen station, inga passagerare. Loket bara *står* — det andas inte, ångan puffar
  inte, hjulen snurrar inte förrän slutet.
- **Vagnarna är tomma lådor.** En vagn är bara "färgad ruta + siffra + prickar". Inget åker
  *med* tåget — inga djur, frukter, paket att lasta. Talet 3 betyder inget mer än "tre" om
  inget i vagnen visar tre saker man bryr sig om.
- **Endast 1→N, alltid stigande, alltid från 1.** Ingen variation i vad räknandet *gör*:
  ingen baklängesräkning, inget "para siffra med antal", ingen lucka att fylla. Runda 2 med
  N=4 är runda 1 med en vagn till.
- **Ljudet är funktionellt, inte tågigt.** `correct`/`pling`/`celebrate`/`whoosh` är delade
  UI-stingar. Inget riktigt tågtut, inget chuff-chuff, ingen stigande ton när tåget blir
  längre. Räkne-rösten är ensam bärare av temat.
- **Generisk finish.** "Rulla ut + konfetti" är samma belöningsmall som alla spel. Tåget når
  ingen station, ingen vinkar av det, inget mål i världen uppfylls.

Kort sagt: mekaniskt vattentätt och sött, men **vagnarna fraktar ingenting, scenen är en
vägg, och glöden tänker åt barnet.**

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ ~~**[Medium] Låt antalet betyda något — lasta vagnarna.**~~ Redan byggd (`index.js:369–377`:
  n ritade föremål per vagn via `drawIcon`) — uppdagat 2026-09-23.
- ✅ ~~**[Medium] Tona ned auto-glöden till ett efterfrågat stöd.**~~ Klar 2026-10-01: ingen
  vagn lyser från start; rösten frågar per steg ("Vilken vagn är nummer tre?") och glöden
  tänds först efter ~4 s tyst tvekan eller direkt efter en fel vagn.
- **[Deep] Fler räkne-lägen per runda (rotera).** ✅ ~~(a) fyll luckan~~ (klar 2026-10-01,
  ett luck-läge `1, _, 3`; en längre variant med flera luckor `1,_,3,_,5` återstår); (b) ✅ ~~baklänges-tåg~~ (klar 2026-10-03, se §5); (c) para-läge:
  vagn visar 🍓🍓🍓, slot visar siffran. Samma drag-mekanik, helt ny tanke.

### Variation & överraskning
- ✅ ~~**[Quick] Slumpa loksfärg per runda.**~~ Klar 2026-09-23 (v1.251.0): lokets kropp målas om
  i röd/blå/grön/turkos/lila medan det står utanför bild (`LOK_FARGER` :53, `_ritaLok` :216,
  bytet :429) — aldrig samma två rundor i rad, första rundan alltid röd, inget orange (vagn 1
  är orange). **Vagnsinnehållet** slumpas inte: lasten är bunden till räkneramsans klipp ("Tre!
  Tre äpplen!") och ett nytt innehåll kräver nya röstklipp (TTS nere).
- **[Medium] En passagerare/överraskning emellanåt:** en vagn gömmer ett vinkande djur som
  tittar fram när den kopplas på (liten "wow", anledning att vilja se nästa).

### Juice
- ✅ ~~**[Quick] Riktigt tågljud.**~~ Redan byggd som stämda toner: ett tut per koppling som
  klättrar med antalet vagnar (:485) och en tvåstämmig ångvissel vid fullt tåg (:543) —
  uppdagat 2026-09-23. Riktiga `chuff`-klipp skulle kräva MOSS (nere).
- ✅ ~~**[Quick] Levande lok medan man spelar.**~~ Redan byggd (`_startLocoLife` :246 hjulgupp +
  ångpuffar, `_startRock` :267 vagga) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Koppel-snäpp.**~~ Klar 2026-09-23 (v1.251.0): glidningen in fanns redan
  (DragControllers översläng); nu klickar vagnen i kopplet — kort metallisk tvåtons-klick (E6
  + G5), grusdamm vid båda hjulen och ett ryck på 9 px mot loket som studsar tillbaka
  (`_koppelSnapp` :513). Rycket går på vagnens BARN via ett proxy-objekt, ett per vagn.
- ✅ ~~**[Quick] Kopplen fjädrar när tåget startar och stannar (FYSIKPLAN P2).**~~ Klar 2026-10-02:
  se §5.

### Progression
- **[Deep] Kurvan planar ut efter N=5.** Två luckor i ett 5-tåg (`1,_,3,_,5`), tåg som börjar på 2 i stället för 1. ✅ ~~olika laster per runda~~ (klar 2026-10-03: paket, bananer, ballonger, se §5).
- ✅ ~~**[Quick] Rälsen rullar.**~~ Klar 2026-10-01 (`varld.js`: fyra parallaxlager + sliprar
  och förgrund som skrollar med en enda variabel).
- ✅ ~~**[Medium] En station som mål.**~~ Klar 2026-10-01: stationen glider in, kanin, Bobo och
  björn vinkar och jublar. (Att djuren *kliver på* återstår.)

### Karaktär & berättelse
- **[Deep] Lokförare Bobo.** (Bobo står nu som stationsföreståndare på perrongen — hytten återstår.) Sätt maskoten i hytten; han reagerar (jublar vid rätt, lutar
  sig ut och pekar vid idle, viftar vid avgång). Ger en röst åt instruktionerna och någon
  att glädja — "fyll tåget åt Bobo".

### Ljud
- **[Quick] Variera räkne-frasen ibland** ("Ett! En vagn!", "Två vagnar!") så ramsan inte
  blir helt mekanisk, och lägg en lugn bakgrunds-ambient (fågelkvitter/vind) för värme.
  ⛔ Blockerad: nya fraser kräver nya röstklipp (TTS nere) och ambienten ett nytt SFX-klipp
  (MOSS nere).

## 5. Status / loggar

- 2026-10-03 · **Baklänges-tåg och växlande last (FYSIKPLAN U3, "innehåll som tar slut").** Premissen höll: `_mode` var `level % 2` (rad/lucka), `N = 3 + floor(level/2)`, och lasten bunden till vagnsnumret (`LAST_ORD`). Nu tre lägen per tåglängd — `['rad','lucka','bak'][level % 3]`, `N = min(5, 3 + floor(level/3))` (tre rundor på 3 vagnar, tre på 4, därefter 5) — så baklängesrundan kommer som runda 3 för en ny profil (sparad `highestLevel` = 2). **Bak:** platserna tar N först, sedan N−1 … 1 (`_expected` börjar på N och minskar; accept-villkoret `data.n === _expected && index === _placedCount` är samma), rösten säger "Nu räknar vi baklänges!" före första frågan (`_fraga`, en gång) och frågar sedan `fragaNummer` som vanligt. Tutet följer vagnens nummer (`220 + (n−1)·34`, identiskt med förut i rad/lucka) och faller alltså baklänges. Idle-cuen "efter"-frågar bara i radläget. **Last:** `LAST_TEMAN` — `blandad` (blomma/fisk/äpple/ankunge/stjärna, som förut) och tre nya teman med n likadana ritade föremål i varje vagn: paket, bananer, ballonger — alla via `drawIcon`, ingen ny emoji-text. Första rundan alltid blandad; därefter en påse (`variation.pase`, aldrig samma två i rad). Temat sätts i `_newRound` och styr både `_makeCar` och räkneorden (`sagaAntal(voice, n, tema)`: 15 nya literala repliker). Ingen ny sparnyckel: nivån (`highestLevel`) och `custom.rundor` är oförändrade, lasttemat slumpas per runda. Vagnarnas fjädring (vippa) orörd. Omätt i webbläsare (byggnatt utan test).

- 2026-10-02 · **Vagnskorgarna gungar på sina hjul (FYSIKPLAN P2, `lib/vippa.js`).** Premissen ("stel tidslinje, `:877`") höll: avfärden är en gsap-tidslinje där vagnarna bara byter x. Varje vagn har nu en `_fjad`-nod (barn till `_inner`, pivot på hjullinjen y 70 så hjulen står kvar på rälsen) som `vippa(…, { axel: 'skev', max: 0.06 })` lutar. Vagnen själv (hitArea, DragController-item, landning), `_inner` (vilo-livets y/rotation, kopplingsryckets x) och `_glow` rörs inte av den. Stötarna: **start** (t 0,1 s i `_finishRound`) lutar korgarna bakåt en vagn i taget, loket först; **inbromsning** vid stationen (t `FARD_TID − 0,15`) skjuter dem framåt i samma ordning; **avfärd** (`UTFART_T`) lutar varje vagn i samma ögonblick som dess tween börjar (samma stafett, `DEPART_STAGGER` orörd); **koppling** (`_onCorrect`) ger den nya vagnen och grannarna en stöt. Vippan skapas först när en vagn får sin första stöt (`_gunga`) och rivs i `_dodaRundTweens` (rundbyte + destroy). Tidslinjens `call`s dör med `_depart.kill()`. Rundor, laster, lägen, repliker och tider är orörda. Omätt i webbläsare (byggnatt utan test).

- 2026-10-01 🚂 **Sluta jaga blinkern, börja räkna** (arbetsorder, nattkörning; ej körd i webbläsare
  av byggaren — orkestreraren testar).
  - **Pedagogik.** `_setActiveCar` (glöd från start) är borta. Varje steg börjar med en FRÅGA
    (`_fraga`: "Vilken vagn är nummer två?"), köad med `ctx.narTyst` och gällande bara för sitt
    steg (`_stegTok`). Glöden (`_tandGlod`) tänds efter `GLOD_EFTER` = 4 s tyst tvekan
    (klockan står still medan rösten talar eller ett drag pågår) eller direkt efter en fel vagn.
    Fel vagn = vinglar, mjukt ljud och vagnen säger sitt eget nummer ("Det där är nummer tre!",
    utrop, hoppas över om något talar). Den mjuka om-cuen efter 6 s finns kvar (småbarn).
  - **Bild.** Spökplatsen är en streckad vagnskontur med streckade hjul och kopplingskrokar.
    Marken kommer ur `createScene` (tonad), banvall + sliprar. `varld.js`: kullar (två djup),
    träd, telefonstolpar med tråd, förgrundsstrån — alla periodiska lager på EN skrollvariabel
    `s` (ingen tween per föremål). När tåget är fullt "åker" det: landskapet glider, en station
    glider in bakom tåget, kanin/björn vinkar och Bobo (rigg) jublar, sedan rullar tåget ut.
  - **Läge 2, fyll luckan.** Udda nivåer: tåget står färdigt utom EN vagn (aldrig först/sist);
    poolen har rätt vagn + två avledare (helst siffror som inte sitter i tåget).
  - **Fixvarv 1 (P0 ÅTERKOPPLING).** Osynlig fångare längst bak (`_buildFangare`, hela ytan inkl. bleed) ger `kvittera` (ton + ring) på ett tryck på tomt/station/under färden. Loket är tryckbart (`hitArea` -125,-80,225x165 i lokets rum, slutar 100 px höger om origo, före första platsens träffyta): vissla + ångpuff, puls på lokets kropp (barn).
  - **Ej byggt:** riktigt tuff-tuff/stationsljud (MOSS nere) — stämda toner används.

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): `_finishRound` spelade eget
  vinstljud och eget konfettiregn i samma tick som `complete()` — strukna. "Tut tut! <beröm>"
  sades i samma tick EFTER `complete()` och kapade sista vagnens räkneord ("Fem! Fem
  stjärnor!") innan det hördes; nu väntar den med `ctx.narTyst` (och utgår om barnet redan
  kopplat en vagn i nästa runda). Två A-rader byggda: **slumpad loksfärg** och **koppelsnäpp**.
  §4 städad: 3 redan byggda; räknefraser och ambient väntar på TTS/MOSS.

- 2026-08-10 🎨 **D1 (repo-brett svep): platt yta fick ljus** (`ec8ee2b`, v1.99.0).
  `_plattprobe --medbakgrund` mätte **697 730 px = 76 % av skärmen** i EN ton.
  Bakgrunden RITADES redan (0xfff0d6, medvetet vald bort från `COLORS.bg`), men som en
  enda platt yta över hela bilden — och följden var mer än platthet: **rälsen hängde i
  luften** utan mark att vila på och utan horisont mellan himmel och jord. Nu finns himmel,
  kullar, mark och banvall i `_buildBackdrop()`. Kullarna ritas MELLAN himmel och mark så
  marken klipper deras underkant; annars svävar de som två ellipser. Sliprarna ritas efter
  bakgrunden och hamnar ovanpå gruset, så spåret ligger I banvallen. Kontaktskuggor under de
  lösa vagnarna valdes bort med flit — `DragController` lägger redan en skugga under draget.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **697 730 → 39 195 px** (76 % → 4,3 %).

- 2026-06-30: Doc skriven efter kodläsning + headless playtest (errorCount 0; skärmdump
  verifierad: lok + 3 spök-rutor + vagnar 3/2/1, vagn 1 glöd-markerad). Ersatte gammal
  build-spec med granskningsdoc.
- Rekommenderad första-omgång: **[Medium] lasta vagnarna med n föremål + [Quick] riktigt
  tågtut/chuff + [Quick] levande ång-lok** — gör räknandet meningsfullt och scenen levande
  utan att röra den vattentäta no-fail-mekaniken.
- 2026-07-02: **Första-omgång IMPLEMENTERAD** (errorCount 0, exit-cykel ren):
  - **Lastade vagnar.** Prickraden ersatt med `n` tematiska föremål per vagn (`LAST_ORD`):
    1🌸 blomma, 2🐟 fiskar, 3🍎 äpplen, 4🐤 ankungar, 5⭐ stjärnor — barnet kan räkna
    sakerna, inte bara jaga glöden. Siffran flyttad upp (78px) för att ge plats.
  - **Riktigt tågljud** via `audio.tone`: mjukt "tut" (två stämmor) vid varje koppling med
    tonhöjd som KLÄTTRAR per vagn (`base = 220 + placedCount*34`, kombo-känsla) + en stolt,
    hållen ångvissel (620/930 Hz, stiger) när tåget är fullt. Räkne-rösten knyter nu siffran
    till antalet: "Tre! Tre äpplen!".
  - **Levande lok:** hjulen (egen behållare `eng._wheels`) guppar lätt, loket vaggar svagt
    (y-gupp + pytteliten rotation, `_startRock`, startas om per runda), och ång-puffar stiger
    ur skorstenen i loop (`_steamLayer` + `_emitSteam`, exit-säker proxy-tween). Alla nya
    tweens (`_steam`/`_rock`/`_wheelBob`) dödas i `destroy`. No-fail-kopplingen orörd.
- 2026-07-25: **BUGGFIX — tåget backade iväg + omgjord tågkomposition** (`check` grön,
  `npm run test siffertaget` 0 fel, hela rundan spelad till avfärd i harnessen).
  - **Grundorsak.** Loket ritas med kofångare, panna, strålkastare och skorsten till
    *vänster* om sitt origo — **fronten pekar åt vänster** — medan vagnsplatserna ligger åt
    höger. Avfärden gjorde ändå `gsap.to(engine/cars, { x: '+=1500' })`, alltså åt **höger**:
    tåget backade iväg med sista vagnen först. Rent riktningsfel, ingen annan logik inblandad.
  - **Kör åt rätt håll.** Avfärden är nu en egen timeline (`this._depart`) som rullar lok +
    alla vagnar `x: '-=1500'` (`DEPART_DX`) på `DEPART_TIME = 1.5 s`, `power1.in`. Loket startar
    på t=0 och vagn *n* på `n × DEPART_STAGGER (0,035 s)` — vagn 1 (närmast loket) rycker med
    först, sista vagnen sist, så man ser kopplen tas upp ett i taget utan att tågsättet dras
    isär. Loket lämnar bilden först, sista vagnen sist.
  - **Ny, centrerad tågkomposition.** `ENGINE_X = 150` / `SLOT0_X = 290` (spökrutorna
    överlappade dessutom lokets hytt med ~55 px) är borta. Nya konstanter: `ENGINE_NOSE = 122`,
    `ENGINE_GAP = 200` (lok-origo → första platsen; koppel möter koppel), `CAR_HALF = 85`,
    `SLOT_STEP = 188` (170 vagnsbredd + 18 → kopplingsstumparna möts). `_engineXFor(n)`
    centrerar *hela* tågsättet efter rundans vagnantal: lok-x ≈ **371** vid 3 vagnar, **277**
    vid 4, **183** vid 5. Vid maxlängden (5) går tåget från x≈61 till x≈1220 — inom bild, långt
    under hem-/högtalarknapparna (y≥158 mot deras y≤110) och med ordentlig startsträcka kvar.
    Slotarna beräknas från `this._engineX`, inte från en hårdkodad konstant.
  - **Resten av sekvensen granskad och rättad.** Ångpuffarna följer nu skorstenen där loket
    *faktiskt* är (`this._engine.x/y` i stället för konstanten) och driver bakåt/åt höger =
    korrekt för ett vänsterkörande tåg; fem extra chuff-puffar läggs in i avfärds-timelinen och
    hjulgungningen får `timeScale(3.2)` medan tåget drar iväg (återställs per runda).
    Spökrutan **tonas bort** när vagnen kopplats på — tidigare stod tomma streckade rutor kvar
    på rälsen efter att tåget lämnat bilden. `_roundLayer` ligger nu under loket så loket kör
    snyggt förbi rutorna. Nästa runda startar efter `DEPART_TIME + 0,45 s` (hela sättet ute).
  - **Nytt: loket rullar in.** Varje runda börjar med att ett lok kommer in från *höger* och
    bromsar in på plats (1,1 s, `power2.out`) — framlänges, eftersom fronten pekar åt vänster.
    `this._rollIn`/`this._depart` dödas i både `_newRound` och `destroy`, och slot-tweens dödas
    innan `_roundLayer` rensas → exit-säkert (exit-cykel testad, 0 konsolfel).
  - Pedagogiken (siffror, last-räkning, accept-villkoret) och no-fail-beteendet är orörda.
- 2026-08-06: **P0 ASSETS — vagnslasten ritas** (poleringsrundan, 🔤 Lära-fliken).
  - `LAST_ORD`-föremålen (🌸 blomma · 🐟 fisk · 🍎 äpple · 🐤 ankunge · ⭐ stjärna) var
    emoji-Text. Det är just de här föremålen barnet ska RÄKNA för att koppla siffra till
    antal — de fick inte vara glyfer ur systemfonten. Nu `drawIcon`; emoji-strängen är
    kvar som nyckel. 🐤 saknades i biblioteket och lades till i samma runda.
  - **Lasten låg utanför korgen.** y=40 med föremålens underkant på ~58 mot korgens
    botten 57 — de klipptes av chassit. Flyttad till y=36.
  - **Ny lastbädd:** en mörkare remsa (`alpha 0.13`) i korgens botten som lasten vilar på.
    Utan den flöt föremålen fritt i vagnsfärgen — blomman försvann nästan mot den orange
    vagnen. Storleken höjd 26/30 → 30/36 nu när det finns kontrast att synas mot.
  - `npm run test` 0 fel; alla fem lastikoner verifierade i `scripts/_ikoner.mjs`.
- 2026-08-09 ✅ **Full bleed [Quick]** (v1.68.0): bakgrund i varm ton (0xfff0d6 — exakt `COLORS.bg` kan aldrig passera kant-cream), tåget parkerar vid `ctx.view.right+240` och avfärden förlängs så hela tågsättet passerar synliga vänsterkanten. Testad båda viewports: 0 fel.
- 2026-08-09 ✅ **Tyngd i draget [Quick]** (v1.69.0): föremålet följer fingret med en liten eftersläpning, lutar åt dragets håll och landar med en tryckning i målet (delat i `DragController`). Här tändes dessutom lyft-skuggan (`skugga: true`) — spelet ritar ingen egen. Mätt med `_dragprobe`: 12 px släp, 0,097 rad lutning, skuggan borta och lagret tillbaka efter släpp, 0 konsolfel vid exit mitt i drag.

- 2026-10-01 · **Barnets egna figurer (LYFTPLAN §10, v1.287.0).** Premissen höll: kanin och björn står på perrongen och vinkar (`varld.js`). Barnets knytt/kompis blir en FJÄRDE gäst mellan Bobo och björnen (x +100 på perrongen, höjd 104, bredd ≤ 84): `_egenGast` i `_finishRound` (en gång per ankomst, varannan station via `valjEgna`), hållen i `Varld` (`sattGast`), tittar mot tåget, vinkar i `hurra` (`react('hej')`: kompisen med armen, knyttet med ett skutt) och följer stationen ut ur bild (rivs i `stationDolj`/`destroy`). En NY figur presenteras (`presentera`, två repliker); mötta och kända figurer får bilden räcka. Reserv = kanin, Bobo och björn som förut. Sond: `_egnakund --trigger "ctx.later(5, () => g._finishRound(ctx))"`, alla armar gröna.
