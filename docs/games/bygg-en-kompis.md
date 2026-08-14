# Bygg en Kompis (`bygg-en-kompis`)

> roligt · tap · 2–5 · ✅
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

## 0. Spec (fylls i av `/spel` innan kod skrivs)

| | |
|---|---|
| **id** | `bygg-en-kompis` |
| **titleSv** | Bygg en Kompis |
| **icon** | 👾 |
| **kategori** | roligt → flik Roligt |
| **input** | tap |
| **ålder** | [2, 5] |
| **kärnloop** | Sex kontrollrader med var sitt par stora pilknappar (kroppsform · ögon · mun · huvudprydnad · färg · storlek). Varje tryck byter delen DIREKT på varelsen mitt på golvet: den nya delen studsar in, hela kompisen squashar och blinkar, och delen spelar sin egen ton i en pentaton skala — bygget blir en melodi. |
| **mål** | Tryck på Bobos ritade kamera → kompisen blir levande (hoppar, snurrar, vinkar, sjunger SIN melodi), blixten smäller, fotografiet flyger upp på bildväggen och spikas fast (klonk). `progress.complete()` + ny upplåst del + ny kompis. |
| **agens** | Total: sex oberoende val × 6·6·6·6·10·3 kombinationer, och varje val syns i samma ögonblick på figuren och i ramen som hängs upp. |
| **variation** | En ny del låses upp per färdig kompis (vingar → färg → kroppsform → ögon → mun → …, 12 steg). Varje ny runda börjar med en slumpad kompis där den nyupplåsta delen är förvald. Bildväggen växer till 6 ramar och de gamla kompisarna vinkar. |
| **mottagare** | Bobo står bakom kameran (rigg ur `lib/karaktarer.js`: nyfiken när kortet tas, jubel när ramen sitter) + hela bildväggen, som vinkar till den nya kompisen. Tryck på en gammal ram → den kompisen vinkar och sjunger sin melodi. |
| **finish** | Blixt ur den ritade kameran (vit smäll över hela vyn + gnistor), fotografiet flyger i en båge upp till väggen, spik-klonk (två låga toner), ramen vippar rätt, alla ramar vinkar i tur och ordning. |

**Röstrepliker**
```
"Bygg en kompis! Tryck på pilarna och se vad som händer."
"Vad rolig den blev!"
"Oj, vilken fin kompis!"
"Titta vad du gör!"
"Nu blir din kompis levande!"
"Vilken fin kompis! Nu hänger den på väggen."
"Titta! Nu finns något nytt att sätta på huvudet!"
"Titta! Nu finns en ny kroppsform!"
"Titta! Nu finns nya ögon att välja!"
"Titta! Nu finns en ny mun!"
"Titta! Nu finns en ny färg att välja!"
"Nu bygger vi en ny kompis!"
"Hej igen, gamla kompis!"
"Hejdå, lilla fjäril!"
"Tryck på en pil så byter din kompis utseende!"
"Tryck på kameran när din kompis är klar!"
```

## 1. Nuläge (sett som spelare)

En varm verkstad. Mitt på golvet står en liten varelse med egen silhuett — kropp, ögon, mun,
öron/horn/vingar, färg/mönster och storlek — som guppar i vila och blinkar. Till vänster tre
kontrollrader (kropp · ögon · mun), till höger tre (prydnad · färg · storlek); varje rad är
◀ 96 px · ritad förhandsvisning · ▶ 96 px i radens egen färg. Ett tryck byter delen på under
100 ms med studs, squash och en stämd ton (varje del har sin plats i en pentaton skala i C).

Till höger om varelsen står en ritad kamera på stativ med en skylt där det står "Klar!" och
Bobo som tittar fram bakom den med tassarna på kamerahuset. Tryck där och finishen rullar.
Överst hänger bildväggen med plats för sex ramar; tomma platser visar spik + konturruta.

Ibland kommer en bus-fjäril inflygande och sätter sig på kompisens huvud (P0 MOTGÅNG med tak:
max en, minst 22 s emellan, aldrig under finishen). Ett tryck och den flyger vidare — och den
flyger av sig själv efter nio sekunder, så den kan aldrig blockera något.

Skärmdumpar: `.test-shots/kompis-*.png` (via `node scripts/_kompisbild.mjs`).

## 2. Ursprunglig plan & tankeprocess

Spelko §6. Målet är ren skaparglädje för de yngsta: inga rätt eller fel, bara val som syns.
Det pedagogiska värdet ligger i orsak → verkan (jag trycker, DEN ändras) och i att barnet får
äga resultatet — kompisen blir kvar på väggen och finns där nästa gång appen startas.

Två designbeslut värda att minnas:

* **Melodin i bygget.** Varje del har en egen ton, så en byggd kompis har en egen liten melodi
  som spelas när den blir levande och när man trycker på dess ram i galleriet. Det binder ihop
  ljud med val i stället för att lägga ett klick ovanpå allt.
* **Kameran ÄR knappen.** "Klar!" som en vanlig UI-knapp hade fungerat, men en ritad kamera på
  stativ ger finishen (blixt, kort, ram) en tydlig orsak i bild, och Bobo får ett jobb.

## 3. Vad gör det lättjefullt / tunt

* Prydnadsrutan (`topp`) rymmer både öron, antenner, horn och vingar. Horn och runda öron
  läser lite lika på smala kroppar (kon/lång) där de fäster nära spetsen.
* Bakgrunden är `createScene('warm')` rakt av — verkstaden har ingen egen rekvisita (burkar,
  färgpyts, hyllor) som skulle förklara VAR man är.
* Kompisen kan inte flyttas eller pysslas med mellan bytena; all interaktion går genom pilarna,
  kameran, ramarna och fjärilen.
* Mönstren (prickar/ränder) sitter på färgvalet i stället för att vara en egen rad — det är en
  medveten begränsning (fler rader ryms inte med P0-måtten) men gör mönstren lite gömda.

## 4. Förbättringar & förhöjningar (plan)

**Kärnloop**
* [Quick] Tryck på KOMPISEN själv → den kittlas, skrattar och gör en grimas (i dag händer bara
  ett kvitto från bottenytan).
* [Medium] Låt barnet dra en del från förhandsvisningen till kompisen som alternativ till pilen
  (tap-tap-fallback via `DragController`) — samma val, en motorisk väg till.

**Variation**
* [Medium] Sällsynt "gyllene del" som glittrar och ger kompisen en egen fanfar i galleriet.
* [Medium] Egen rad för mönster när layouten tillåter (kräver att storlek flyttar in i en
  kombinerad rad eller att kolumnerna blir fyra rader djupa).

**Juice**
* [Quick] Kompisen tittar på den knapp som just trycktes (`look`-liknande pupillförskjutning).
* [Quick] Damm-puff vid fötterna när storleken växer.

**Progression**
* [Medium] En liten "affisch" på väggen som visar hur många delar som återstår att låsa upp.

**Karaktär**
* [Medium] Bobo kommenterar den valda kombinationen ibland ("En kompis med vingar!").

**Ljud**
* [Quick] Egen materialklang per kroppsform (klot = mjuk, kloss = trä) ovanpå delens ton.

## 5. Status / loggar

`2026-08-14 · byggd (spelko §6): sex delrader, 6·6·6·6·10·3 kombinationer, 12 upplåsningar,
bildvägg med 6 sparade kompisar via progress.setCustom('galleri'), kamera-finish med blixt och
spik, bus-fjäril som motgång. Bilder + exit-kontroll via scripts/_kompisbild.mjs (0 konsolfel
vid exit 0,2 / 1,3 / 1,9 / 2,4 s in i finishen). Skärmdumpen fann två fel som koden inte
visade: ögonens studs dödades av blinkningen (scale.x fastnade på 0 → ansiktet tomt) och
sömnig-lockets kroppsfärg gjorde ögonen osynliga.`
