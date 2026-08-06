# IDEER.md — idébank (spel som inte är planerade än)

Parkerade spelidéer, **nyast överst**. En idé här är *inte* ett spec-kort — den är råmaterialet
som `/spel <idé>` får som indata när vi bestämmer oss för att bygga den. Varje post fångar
idén som ägaren beskrev den, plus de frågor en planerare måste svara på först.

När en idé byggs: flytta den till `docs/games/<id>.md` (§0 Spec) och stryk posten här.

---

## 1. Ansiktssektionen — riktiga foton som spelfigur (arbets-id: `ansiktssektionen`)

*Inlagd 2026-08-06. Status: ⬜ ej planerad. Omfattning: **en hel ny sektion**, inte ett spel.*

**Idén, som den beskrevs:** En helt ny sektion i biblioteket där **riktiga foton av ägarens
ansikte** är spelfiguren. Ansiktet **grimaserar som svar på vad spelaren gör** — grimasen är
återkopplingen. Fotot är inte en stillbild: det **skärs upp i delar** så att det blir
interaktivt — **mun och käke** lyfts ut som egna bitar så ansiktet kan se ut att **prata**
och kunna **äta genom att gapa**.

**Första spelet i sektionen:** dra-och-släpp **mat i munnen**. Munnen gapar när maten närmar
sig, tuggar, och **ansiktet/grimasen ändras beroende på vad man matade det med** — citron ger
sur min, chili ger het min, tårta ger lycksalig min, broccoli ger en fundersam min.

### Varför den är intressant
- **Ingenting i biblioteket ser ut så här.** 70 spel är ritad vektorgrafik. Ett riktigt ansikte
  som reagerar är en helt annan sorts belöning — och det är *pappas* ansikte, vilket för ett
  2–5-åring slår varje tecknad figur.
- **Grimasen ÄR återkopplingen.** P0 kräver ljud+bild <100 ms per pekning; ett ansikte som
  ändrar min är den mest avläsbara feedback som finns för en 2-åring — noll läsning, noll ikoner.
- **Motgång blir rolig av sig själv.** P0 `MOTGÅNG` vill hinder som är roliga och aldrig
  skambelagda: "fel" mat = en jättegrimas + ett spott-ljud, aldrig ett rött kryss. Sur min är
  en belöning i sig, inte ett misslyckande.
- **En uppskuren ansiktsrigg är återanvändbar** — samma käke/mun/ögon-rigg driver hela
  sektionen: mata, härma grimasen, tandborstning, prat-docka, ansiktet som sjunger med.

### Möjliga spel i sektionen (att välja bland senare)
| Arbets-id | Vad det är |
|---|---|
| `mata-munnen` | dra mat till munnen → gap, tugg, grimas efter smak (**först ut**) |
| `harma-grimasen` | ansiktet gör en min, barnet trycker på rätt min bland tre |
| `borsta-tanderna` | dra tandborsten i den gapande munnen, ansiktet reagerar på var man är |
| `prat-ansiktet` | tryck på ord/ikoner → käken rör sig i takt med röstklippet |

### Frågor att svara på i planeringen (INTE nu)
1. **Fotoshoot-listan.** Vilka miner behövs, och hur många? Grundrigg: neutral · glad · förvånad
   · sur · äcklad · het/chili · nöjd/mätt + **gap öppet** och **gap stängt**. Allt måste tas i
   **samma ljus, samma avstånd, samma vinkel**, annars hoppar ansiktet mellan minerna. Detta är
   en riktig produktionsuppgift för ägaren innan ett spel kan byggas.
2. **Skära eller byta?** Två helt olika tekniska vägar: (a) *rigg* — ett foto skärs i käke,
   mun-inre, ögon, ögonbryn som rör sig var för sig; (b) *minbyte* — ett foto per grimas som
   korsbleknar. Rigg ger prat och gap, minbyte ger äkta miner. **Troligen båda:** riggad käke
   ovanpå ett minbyte för ögon/bryn. Måste avgöras före första spelet.
3. **P0 `KARAKTÄRER`.** Avbildade människor får bara heta Zacke/Alissa/Elvira/Lova. Ett foto av
   ägaren är en avbildad människa — heter han "Pappa" (roll, inte namn), är han namnlös, eller
   behöver regeln i `lib/theme.js` ett uttryckligt undantag? Bestäm och skriv in i regeln.
4. **P0 `ASSETS`.** "Spelobjekt ritas fristående — aldrig en emoji/ikon i en ruta." Ett foto är
   inte en emoji, men det måste vara en **friskuren silhuett** med genomskinlig bakgrund och
   eget liv (andning, blink i vila) — aldrig ett rektangulärt foto i en ram. Maten som dras
   ritas som vanligt (`artikoner.js`).
5. **Integritet.** P0 `DATA`: ingen PII lämnar enheten. Foton i `public/` följer med i bygget
   och serveras över Tailscale till telefonen. Det är familjens egen app och egna bilder — men
   bestäm medvetet: bara ägarens ansikte, eller barnens också? Och ska sektionen fungera om
   fotona saknas (fallback till ritat ansikte), så repot går att dela utan bilderna?
6. **Egen flik eller inte?** "Sektion" antyder en femte flik i biblioteket (`TAB_GROUPS` i
   `lib/theme.js`, se skill **skal-och-data**). En flik med ett spel i ser tom ut — bygg 2–3
   spel först och lyft ut fliken när de finns, eller lägg dem i Roligt tills vidare?
7. **Vad är målet i `mata-munnen`?** Kvalitetsgrindens punkt 1 kräver agens med utfall. Väg:
   "mata tills tallriken är tom" · "hitta vilken mat som ger vilken min" (upptäckarloop) ·
   "gör ansiktet mätt" med en synlig mättnadsmätare. Alltid utan fail.
8. **Bildbudget.** Hur många MB får sektionen kosta? Foton är tyngre än vektorgrafik och
   service-workern cachar allt offline. Format (webp), maxbredd och antal miner måste sättas.

### Tekniska hållpunkter
- **Ansiktsriggen blir en delad modul** (`lib/ansikte.js`-aktig), inte kod i ett spel — käke som
  roterar kring en pivot vid örat, mun-inre som eget lager under käken, ögonlock för blink.
  Pixi v8: `Sprite` med `anchor` för pivoten, eller `PerspectiveMesh`/`MeshPlane` om käken
  behöver deformera i stället för att bara rotera (se skill **pixijs-scene-mesh**).
- **Uppskärningen görs offline**, inte i körning: ett skript under `scripts/` som klipper ut
  delarna ur källfotona till färdiga PNG/webp-lager — samma mönster som `npm run voice`/`sfx`.
- **Käken kan drivas av rösten.** `VoiceService` spelar redan mp3-klipp; enklast är
  tidsbaserat käkflaxande medan ett klipp spelas, dyrare är amplitud från `AudioService`.
  Se skill **ljud-och-rost**.
- **Grimasbyte** = korsblekning över ~120 ms + en liten skalpuff, aldrig ett hårt klipp.
  `feedback.js`-hjälparna och `_alive`-flaggan gäller som vanligt (P0 `EXIT-SÄKERT`).
- **Maten** dras med `DragController` (samma som övriga dra-spel) med mun-området som mottagare
  — träffytan runt munnen måste vara ≥96px även om munnen på fotot är mindre.

---

## 2. Nätskott från bilfönstret (arbets-id: `natskott-pa-stan`)

*Inlagd 2026-08-06. Status: ⬜ ej planerad.*

**Idén, som den beskrevs:** Förstapersonsvy där man ser **sin egen arm och hand** nere i bild,
i webb-skjutar-posen (pek- och lillfinger ut, mellanfingrarna in mot handflatan), med
hjältedräkt på underarmen. Man **trycker var som helst på skärmen → ett nät skjuts dit**.
Scenen är en **sidscrollande gatuvy sett från ett bilfönster** — bakgrunden glider från höger
till vänster och skiftar mellan stad och förort medan man åker. Längs vägen passerar saker
man kan skjuta nät på och **påverka med fysik**: gummor som går på trottoaren, katter, hundar,
blomkrukor i fönsterbleck, brevlådor, fåglar, paket, fönster som går sönder, m.m.

**Två nättyper** (kärnvalet i spelet):
- **Klibbnät** — det man träffar fastnar i bakgrunden/väggen där det är.
- **Dragnät** — det man träffar dras tillbaka mot spelaren.

### Varför den är intressant
- Ett **helt nytt kameraperspektiv** i biblioteket — alla 70 spel är sidovy eller ovanifrån.
  Förstaperson + åkande bakgrund ger en resa-känsla ingen annan titel har.
- **Ett enda gest-verb** (tap där du vill) men **två utfall** via lägesknappen → äkta agens
  utan mer motorik. Passar 2–5 år rakt av.
- Bakgrunden som rullar ger gratis **variation och progression** (stad → förort → …) utan att
  vi behöver nivåer med fail-tillstånd.

### Avgränsa mot de tre spindelspel som redan finns
| Finns redan | Vad det är | Hur den nya skiljer sig |
|---|---|---|
| `spindelhjalten` | slangbella, drar hjälten själv genom luften | här skjuter man nät, hjälten rör sig inte |
| `spindel-zacke-svingar` | pendel, timing-släpp mellan hustak | här ingen svingning, ingen timing-press |
| `spindelnatet` | står still, fångar fallande föremål i ett nät | här rullar världen förbi och nätet påverkar *världen* |

### Frågor att svara på i planeringen (INTE nu)
1. **Varumärke.** Repot har konsekvent egna hjältar ("INTE Spider-Man", se `spindelnatet`,
   `spindel-zacke-svingar`). Armen/dräkten måste bli **vår egen** — t.ex. Spindel-Zackes
   färger — inte Marvels design. Beskriv dräkten i speccen så ingen ritar fel.
2. **Fönster som går sönder.** Passar det P0 (`fel tryck = roligt, aldrig tillsägelse`) eller
   läser en förälder det som skadegörelse? Alternativ: rutan blir *målad med nät* / får ett
   roligt klistermärke i stället för att krossas.
3. **Gummorna.** P0 `KARAKTÄRER`: avbildade människor får bara heta Zacke/Alissa/Elvira/Lova.
   Antingen är fotgängarna **namnlösa**, eller så blir de djur/monster i stället.
4. **Vad är målet?** Fritt lek-läge räcker inte för kvalitetsgrindens punkt 1 (agens med utfall).
   Förslag att väga: "hämta hem X saker med dragnät" · "fånga katten som sprungit iväg" ·
   "fäst alla paket innan de blåser bort" — alltid utan fail.
5. **Bilen.** Ser man fönsterkarmen/dörren i bild (ram runt scenen) eller är det ren
   förstaperson? Ramen ger djup men äter skärmyta i 1280×720.
6. **Lägesbytet klibb/drag.** En stor knapp (≥96px) nere i hörnet, eller växlar det automatiskt
   per mål? Knapp är mer agens, auto är mindre att lära sig.
7. **Fysikbudget.** matter.js med rullande bakgrund → kropparna måste följa med i scrollen och
   städas bort utanför bild. Se skill **fysik-spel** + `PhysicsWorld`.

### Tekniska hållpunkter
- matter.js (`PhysicsWorld`) för de påverkade föremålen; bakgrunden som parallax-lager
  (TilingSprite eller egna ritade lager) i tre djup: hus · trottoar · vägkant.
- Nätet självt: en dragen linje som skjuts ut från handen till träffpunkten, med `whoosh` +
  träffljud <100 ms. Klibbnät = kroppen blir statisk där den är. Dragnät = constraint som
  drar kroppen mot kameran och plockar bort den ur fysiken när den kommer nära.
- Armen/handen är ett **fristående ritat objekt** (P0 `ASSETS`), aldrig en emoji — med
  vilo-rörelse och rekyl vid skott.
