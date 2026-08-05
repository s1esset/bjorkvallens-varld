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
- **[Medium] Låt antalet betyda något — lasta vagnarna.** Rita `n` små föremål i varje vagn
  (3 äpplen i vagn 3, 4 ankungar i vagn 4) som matchar siffran. Då kopplar barnet *siffra ↔
  antal* och kan räkna sakerna, inte bara läsa glöden. Prickraden finns redan — uppgradera
  den till tematiska föremål.
- **[Medium] Tona ned auto-glöden till ett efterfrågat stöd.** Visa glöden först efter ~4s
  tvekan (eller efter ett felförsök), inte direkt. Lägg en talad fråga "Vilken vagn är
  nummer **tre**?" vid varje steg så barnet *söker* talet i stället för att jaga blinket.
- **[Deep] Fler räkne-lägen per runda (rotera).** (a) fyll luckan: ett tåg med 1,_,3,_,5 där
  bara udda platser saknas; (b) baklänges-tåg ("5,4,3…" — rösten räknar ner); (c) para-läge:
  vagn visar 🍓🍓🍓, slot visar siffran. Samma drag-mekanik, helt ny tanke.

### Variation & överraskning
- **[Quick] Slumpa loksfärg + vagnsinnehåll per runda** så två rundor aldrig ser lika ut.
- **[Medium] En passagerare/överraskning emellanåt:** en vagn gömmer ett vinkande djur som
  tittar fram när den kopplas på (liten "wow", anledning att vilja se nästa).

### Juice
- **[Quick] Riktigt tågljud.** Lägg `chuff`/`tut`-nycklar i SFX-pipelinen ([[real-audio-sfx]]):
  ett mjukt tut vid varje koppling och ett stolt ångvissel vid full tåg. Stigande tonhöjd ju
  fler vagnar (kombo-känsla som klättrar).
- **[Quick] Levande lok medan man spelar:** lätt ång-puff ur skorstenen i loop, små guppande
  hjul, en svag fram-och-tillbaka-vagga. Loket ska *leva*, inte vänta.
- **[Quick] Koppel-snäpp:** när en vagn landar rätt, låt den glida sista biten och "klicka"
  i loket med en liten ryck-animation + dammpuff vid hjulen.

### Progression
- **[Quick] Rälsen rullar.** Vid full tåg: panorera bakgrunden (parallax-kullar/träd) medan
  tåget kör — så "iväg-rullandet" blir en *resa*, inte bara att objekt lämnar skärmen.
- **[Medium] En station som mål.** Tåget kör in till en liten station där figurer (Bobo/
  djuren) vinkar och kliver på — en spel-specifik finish i stället för generisk konfetti.

### Karaktär & berättelse
- **[Deep] Lokförare Bobo.** Sätt maskoten i hytten; han reagerar (jublar vid rätt, lutar
  sig ut och pekar vid idle, viftar vid avgång). Ger en röst åt instruktionerna och någon
  att glädja — "fyll tåget åt Bobo".

### Ljud
- **[Quick] Variera räkne-frasen ibland** ("Ett! En vagn!", "Två vagnar!") så ramsan inte
  blir helt mekanisk, och lägg en lugn bakgrunds-ambient (fågelkvitter/vind) för värme.

## 5. Status / loggar

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
