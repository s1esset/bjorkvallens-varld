# Räkna Äpplena (`rakna-applen`)
> 🔤 larande · tap · 2–5 år · status: ✅ första-omgång klar

## 1. Nuläge (sett som spelare)

En charmig fruktträdgård: programmatiskt ritat träd med en lummig grön krona, en
flätad korg nedanför och en mjuk äng med sol och kullar bakom. Frukter (äpple/päron/
apelsin/plommon/citron, en typ per runda) hänger i kronan, varje med glans, blad och
skugga. Rösten säger "Tryck på frukterna och räkna med mig — ett, två, tre!". Jag
trycker en frukt → 'pop' + ring + en stor svävande siffra stiger, en **jättesiffra**
i mitten studsar in, en progress-prick fylls, och rösten räknar "ett… två… tre…"
medan frukten susar ner och staplas i korgen. Tomt tryck bredvid = mjukt ljud +
vänlig vingel på en oplockad frukt. När rundans mål nås sägs **totalen** ("Tre äpplen!"),
en lokal burst + mjuk skak, sedan firande + stjärna + klistermärke och en ny, lite
större runda. Från nivå 5 dyker ibland ett "tryck på N stycken"-mål upp bland fler frukter.

**Funkar bra:** räkningen är *äkta* pedagogik — ett-till-ett-räkning med talad siffra
per plock + kardinaltal-bekräftelse ("Tre äpplen!") på slutet. Den stora siffran +
svävtalet + progress-prickarna ger tre samtidiga representationer av talet. Frukttypen
byts varje runda, hitytan är generös (radie 72 ≈ 144px), idle-recue och exit-säkerhet finns.

*(Skärmdump: äppleträd med tre röda äpplen, tom korg, tre tomma progress-prickar.)*

## 2. Ursprunglig plan & tankeprocess

Tänkt (kodkommentar) som kärn-**räknespelet** i Lära-fliken: barnet ska bygga
ett-till-ett-korrespondens (en frukt = ett räkneord) och kardinalitet (sista ordet =
hur många det blev). Frukten susar synligt till korgen så räkningen "samlar" något
konkret, jättesiffran knyter räkneordet till siffran, och variation (frukttyp per
runda + "tryck på N"-läge från nivå 5) håller det fräscht. NO-FAIL: tomt tryck är
bara en lekfull vingel, ingen poäng, ingen timer.

## 3. Vad gör det lättjefullt / tunt

- **Räkningen är alltid 1→N i ordning genom att trycka *vilken* frukt som helst.**
  Barnet hör siffrorna men *identifierar* aldrig en mängd eller en siffra själv. Det
  finns ingen "Hur många?"-fråga, ingen subitisering (känna igen 3 utan att räkna),
  ingen siffer-igenkänning (peka på *trean*). Det är guidad uppräkning, inte räkneförståelse.
- **"Tryck på N stycken"-läget kommer för sent och för sällan** (`lvl >= 5 && lvl % 2 === 1`).
  Hela den tidiga upplevelsen — där 2–4-åringarna faktiskt är — är "tryck på alla", där
  målet = antalet frukter, så barnet behöver aldrig stanna vid rätt antal.
- **Jättesiffran och svävsiffran säger samma sak samtidigt** men kopplas aldrig tillbaka:
  ingen "titta — det blev TRE" där barnet ser tre frukter i korgen *och* siffran 3 ihop.
  Korgen fylls men räknas aldrig om på slutet ("ett, två, tre äpplen i korgen!").
- **Ljudet är syntetiskt och tunt:** 'pop'/'whoosh'/'correct'. Ingen riktig plock/knäpp
  eller "plums i korgen"-klang — just de ljuden som skulle göra plockandet taktilt.
- **Generisk belöning + statisk värld.** Trädet och korgen står helt stilla; ingen figur
  som bär korgen, ingen ekorre/fågel som reagerar, ingen som tar emot frukten. Firandet är
  samma konfetti överallt.

Kort sagt: en *välbyggd uppräknings-loop* som låter barnet höra siffror, men som sällan
ber barnet *förstå* mängd, känna igen siffran eller stanna vid rätt antal.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Inför "Hur många?"-beat tidigt.** Efter en uppräknad korg: visa frukten +
  en stor **siffra att välja** (eller fingrar att räkna) och låt barnet bekräfta antalet
  — kopplar mängd→siffra aktivt. No-fail: fel val ger bara "Vi räknar igen!" + omräkning.
- **[Quick] Flytta in "tryck på N"-läget tidigare och oftare**, gärna med en synlig
  mål-siffra ("Tryck på **2** äpplen") så barnet övar att stanna vid rätt antal redan
  från nivå 2 — det är där den verkliga räkneförståelsen sitter.

### Variation & överraskning
- **[Quick] Subitiserings-runda:** visa korta stunder en grupp om 1–3 frukter och fråga
  "Hur många ser du?" innan de räknas — bygger taluppfattning utan att räkna ett-och-ett.
- **[Medium] Olika behållare/teman:** korg → fruktfat → saftpress (frukten pressas till
  saft) som payoff. Roterar känslan utan att ändra mekaniken.

### Juice
- **[Quick] Riktigt plock + "plums"-ljud** när frukten lossnar och landar i korgen
  (taktilt), plus en liten studs på korgen vid varje landning.
- **[Quick] Korgen reagerar:** den gungar/svämmar lite mer ju fullare den blir, och
  prickraden "blinkar" klart när den fylls.

### Progression
- **[Medium] Avsluta med en omräkning.** På slutet: kameran/blicken går till korgen och
  rösten räknar de samlade frukterna igen ("ett, två, tre — tre äpplen!") medan var och en
  studsar — sluter kardinalitets-loopen visuellt.
- **[Quick] Sifferigenkänning som mild krydda:** låt jättesiffran ibland visas *före* sista
  plocket ("Vi ska ha **3**") så barnet siktar mot ett tal.

### Karaktär & berättelse
- **[Deep] En mottagar-figur (Bobo/ekorre)** som håller korgen, räknar med, och blir
  gladare ju fler frukter den får — ger en anledning att plocka och en egen finish istället
  för generisk konfetti.

### Ljud
- **[Quick] Riktiga frukt/korg-klipp via SFX-pipelinen** ([[real-audio-sfx]]): plock-knäpp,
  plums, en mjuk "full korg"-klang. Behåll den talade räkningen som bär pedagogiken.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan; gammal byggspec överskriven). Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] tidigare "tryck på N"-mål med synlig siffra +
  plums-ljud** och **[Medium] avslutande omräkning av korgen** — störst räkne-pedagogiskt
  lyft för minst risk.
- 2026-07-02: ✅ Första-omgång IMPLEMENTERAD.
  - **[Quick] "Tryck på N" tidigt + synlig mål-siffra:** goalMode flyttat från `lvl>=5 && lvl%2===1`
    till `lvl>=1 && lvl%4!==0` (start redan runda 2, mestadels; var 4:e runda "räkna alla").
    Mål börjar på 2 och växer 2..5. Ny mål-banner ("Tryck på **N**") med stor färgad siffra
    visas i goalMode så barnet ser och siktar mot antalet. Progress-prickar flyttade till y=160
    så de inte krockar med bannern.
  - **[Quick] Plums + korg-studs:** ny `_plums()` (nedåt-glidande ton 400→165 Hz) + `_basketBounce()`
    squash-and-stretch på korgens båda delar vid varje landning.
  - **[Medium] Avslutande omräkning:** `_finish()` tonar bort kvarvarande frukt, säger "Nu räknar
    vi i korgen!", och kör en exit-säker gsap-timeline som studsar varje plockad frukt medan rösten
    räknar om ("ett, två, tre…") + stor siffra, avslutar med totalen och firandet.
  - Exit-säkert: alla nya tweens/timeline (recountTl, banner/korg/frukt-scale) dödas i `destroy`,
    alla timeline-callbacks guardade med `_alive`/`!destroyed`. Self-test: errorCount 0.
