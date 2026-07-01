# Spindelhjälten (`spindelhjalten`)
> ⚙️ fysik · drag · 3–5 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

En ljus äng med moln, sol och en vindflagga uppe i skyn. Nere till vänster sitter en gosig,
EGEN **spindelhjälte** (rund röd kropp, åtta blå ben, stora vänliga ögon, en liten
webb-symbol på bröstet) i en träslangbella. Jag **drar honom bakåt** — ett elastiskt
webb-band spänns, en prickad bana visar flygvägen — och släpper: han skjuts iväg som en
studsig matter.js-kropp, faller under gravitation, **studsar (boing!)** mot väggar och en
flytande studsknopp, och samlar ⭐-stjärnor (och från nivå 2 en instängd 🐱-kattunge på en
moln-ledge) uppe i skyn. En stor **Vind**-knapp växlar av → blås höger → blås vänster;
vinden kröker tydligt banan (matter-vind + matchande prick-förhandsvisning, kalibrerad till
~2px) och flaggan + drivande pilar visar riktningen.

Missar är roliga: puff + vingel, hjälten zippar tillbaka till slangbellan. Efter 2 missar
får han ett nästan-perfekt **hjälp-skott** (löst via `_solveShot` som söker bästa
vinkel+kraft mot närmaste mål), efter 3 en garanterad **glid-båge** rakt till målet med
extra insamlingsradie — en stjärna samlas ALLTID. Alla mål → firande + nästa, högre nivå.

**Funkar bra:** slangbella-känslan med live-prickbana är riktigt bra och lärorik; den
kalibrerade vinden är ett genuint, begripligt extraval; studsknoppen + väggstudsar gör
banan oförutsägbar på ett kul sätt; figuren är charmig och tydligt egen; no-fail-trappan är
mjuk och hjälpsam. En stark fysik-MVP.

*(Skärmdump: slangbella nere till vänster, spindelhjälten mitt i en studs nära flaggan, två stjärnor, Vind-knapp.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet: en **slangbella med sikte + kraft + trajektoria-preview** (delad `AimLauncher`)
där barnet hjälper en gullig hjälte att flyga till stjärnorna. Det pedagogiska: sikta/kraft/
studs-intuition + ett extra system (vind) som synligt kröker banan, så barnet upptäcker
orsak-verkan. Kalibreringen mot matter.js (PREVIEW_G/DAMP/WIND_DIV) är en uttalad
designpoäng: pricklinjen MÅSTE matcha verklig flykt, annars pekar hjälpen och förhandsvisningen
fel. Figuren gjordes till en egen varelse (inte Marvels Spindelmannen) för att slippa
licens/igenkänning. No-fail via hjälp-skott → glid-båge.

## 3. Vad gör det lättjefullt / tunt

- **Studsknoppen och kattungen är "pynt" mer än spelmål.** Studsknoppen är en statisk
  cirkel man råkar studsa på; den gör inget eget (rör sig inte, växlar inte, ger ingen
  bonus). Kattungen samlas på exakt samma sätt som en stjärna (avstånds-träff) — den
  "instängda" framing:en infrias aldrig: ingen bur som öppnas, inget jamande, ingen
  räddnings-känsla. Det är en stjärna med katt-emoji.
- **Hjälp-trappan kan spela klart åt en.** `_autoAssist` (miss 2) skjuter ett nästan-perfekt
  skott och `_glideToTarget` (miss 3) flyger rakt dit med +30px radie. Ett barn som bara
  släpper rakt ner tre gånger får ändå alla stjärnor — agensen kan kringgås passivt.
- **Insamling är osynlig avstånds-magi.** `_checkCollect` samlar allt inom en radie kring
  hjältens *mittpunkt* — stjärnan behöver inte vidröras visuellt, hjälten kan "ta" den
  flera tiotal px bort. Generöst (bra!) men kan kännas som att poäng dyker upp utan kontakt.
- **Banan är tom mellan målen.** Stjärnor guppar, men det finns inga moln att studsa på,
  inga hinder, ingen rörlig miljö — bara luft mellan slangbella och stjärnor. Studsknoppen
  är ofta den enda interaktiva ytan, och bara på nivå 1+.
- **Stjärnorna blir inget.** De krymper bort vid insamling och försvinner; ingen samling,
  ingen "stjärnhimmel" som fylls, ingen återkomst-morot.
- **Vinst = generisk konfetti.** `bigCelebration` + en liten skala-puls på hjälten. Ingen
  spel-specifik finish (hjälten svingar segt i en webb, kattungen kramar honom, en
  stjärnbild tänds).
- **Ljudet är procedurellt och tunt.** `thwip`/`whoosh`/`boing`/`pling` är syntade blippar;
  ingen riktig "tjong" från bandet, inget mjukt "mjau" från katten, ingen stigande kombo
  när flera stjärnor tas i ett skott.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Gör studsknoppen till ett *aktivt* val.** Låt den röra sig långsamt
  (sin-bana), eller bli en knapp som barnet kan **dra för att placera** innan skottet — då
  blir den ett verktyg som ändrar utfallet (som molnen i `enhorningen-elvira`), inte pynt.
- **[Medium] Infria kattung-räddningen.** Ge kattungen en liten bur/molnkant som **öppnas**
  vid träff, ett "mjau" + hopp ner i hjältens famn, och låt den vara banans *finalmål*
  (samlas sist). Då betyder "instängd kattunge" något.
- **[Deep] Låt hjälpen bjuda in, inte ersätta.** Vid miss 2: rita hjälp-skottets prickbana
  och låt barnet trycka "Skjut!" självt; glid-bågen (miss 3) blir sista utväg. Behåll no-fail
  men flytta tillbaka handlingen till barnet.

### Variation & överraskning
- **[Quick] Fyll luften med studsmoln/hinder.** Strö in 1–2 passiva studsmoln per nivå att
  studsa runt på vägen till stjärnorna — fler "boing", mer bana, mindre tomhet.
- **[Quick] Stjärn-kluster i former.** Lägg ibland stjärnorna i en båge/hjärta/trappa så ett
  enda välsiktat skott kan ta flera — belönar skicklighet utan att kräva den.
- **[Medium] Sällsynt regnbågs-stjärna** som zippar hjälten vidare i en gnistsvans (kedje-tag).

### Juice
- **[Quick] Kombo-pling som klättrar** när flera stjärnor tas i ett skott (stigande tonhöjd),
  + en liten gnistsvans efter hjälten i luften så banan han ritar syns.
- **[Quick] Band-spänn-feedback.** Stigande "tjiing" medan man drar bakåt (tonhöjd ∝ kraft);
  en fet "TJONG" + bandvibration vid släpp.
- **[Quick] Studsknopp reagerar mer** (gör redan `pop`): lägg en utåtgående ring + studs-stjärnor.

### Progression
- **[Medium] Stjärnhimmel som fylls.** Insamlade stjärnor flyger upp till en liten räknare/
  stjärnbild i hörnet som växer över banor — något att återkomma till (jfr `klambubblor`-boken).

### Karaktär & berättelse
- **[Deep] Hjälten reagerar och firar eget.** Glad min vid insamling, "uff" vid väggstuds,
  och en spel-specifik vinst (hänger upp-och-ner i en webb och vinkar / kattungen kramar
  honom) istället för generisk konfetti.

### Ljud
- **[Quick] Riktiga klipp** ([[real-audio-sfx]]): web-thwip, mjukt boing, kattens "mjau",
  band-tjong. Idag allt syntat.
- **[Quick] Lugn äng-ambient** (vind/fågel) + varierat vinst-sting.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskad mot kalibrerings-noterna i koden + ARCHITECTURE physics-
  avsnittet). Inga kodändringar.
- Rekommenderad första-omgång: **[Medium] infria kattung-räddningen + [Quick] fler studsmoln
  + kombo-pling** — ger mål-känsla och fyller den tomma luften, störst upplevd lyft.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). (1) *Kattung-räddningen infriad*:
  kattungen sitter nu bakom ett litet galler (bur) som **svänger upp** vid räddning, ett
  riktigt "mjau" (`audio.sample('djur_katt')`, faller till talad "Mjau!"), och kattungen
  (bara emojin, inte molnledgen) **hoppar i en båge ner i hjältens famn**. Den är nu banans
  FINALmål — kan inte tas förrän alla stjärnor är samlade (gate i `_checkCollect` +
  `_nearestTarget`, så även hjälp-skotten tar den sist). (2) *Fler studsmoln*: 1–2 passiva,
  slumpplacerade `makeCloudBumper`-moln per nivå (statiska matter-kroppar, label `bumper`)
  fyller den tomma luften mellan slangbella och stjärnor → fler boing, mer bana. Studsknopp-
  hanteringen generaliserad till en `_bumpers`-lista (rätt knopp poppar vid krock). (3)
  *Kombo-pling + gnistsvans*: varje stjärna i SAMMA skott klättrar i tonhöjd
  (`audio.tone`, +130 Hz/steg) med en `×N`-flyttext, och en liten självstädande gnistsvans
  ritar hjältens flygbana. Kombot nollas vid varje nytt skott/glid. Alla nya tweens är
  exit-säkra (proxy-`{}` eller spårade i destroy). Ingen fail-state rörd; hjälp-trappan intakt.
