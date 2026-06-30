# Siffertåget (`siffertaget`)
> 🔤 larande · mixed · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

Ett glatt, helt programmerat ånglok står till vänster på en lång räls; under på golvet
ligger 3–5 numrerade vagnar i blandad ordning. Den vagn som står näst på tur (vagn 1 vid
start) **lyser** med en pulsande gul glöd. Jag drar (eller tap-tap, via DragController) en
vagn upp till en spök-ruta vid loket — men en kopplingsplats *accepterar bara* rätt siffra
**och** att den är näst lediga, så fel ordning kan aldrig fastna: en felaktig vagn pyser
mjukt tillbaka med en wiggle. Rätt vagn → `correct`+`pling`, en gnistra, rösten räknar
("Ett!", "Två!"), och nästa vagn börjar lysa. När tåget är fullt: `celebrate`+`whoosh`,
ångpuff, "Tut tut!" + beröm, loket + alla vagnar rullar ut åt höger, konfetti + stjärna +
klistermärke. En ny, ev. längre runda (N växer 3→4→5 med nivån) startar. Idle ~6s →
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
