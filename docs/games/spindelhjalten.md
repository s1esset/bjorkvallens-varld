# Spindelhjälten (`spindelhjalten`)
> ⚙️ fysik · drag · 3–5 år · status: ✅ marknadsklar (2026-08-07)

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

> **Ögonblicksbild 2026-06-30 — flera punkter är åtgärdade sedan dess.** Kattung-räddningen,
> hjälp-trappan, den tomma luften, den generiska vinsten och det tunna ljudet är alla fixade
> (se §4 och §5). Kvar av kritiken nedan: studsknoppen som passivt pynt och insamlingen som
> avstånds-magi. Kritiken står som historik, inte som nuläge.

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
- ~~**[Medium] Infria kattung-räddningen.**~~ ✅ 2026-08-07 (verifierad i kod, byggd tidigare).
  `_rescueKitten` (`index.js:460`) öppnar buren (`:1204`), spelar ett riktigt `djur_katt`-läte
  (`:464`) och låter kattungen hoppa ner i hjältens famn. Hon är banans finalmål.
- ~~**[Deep] Låt hjälpen bjuda in, inte ersätta.**~~ ✅ 2026-08-07 — **den här omgången.**
  Vid miss 2 ritas hjälp-skottets prickbana ut och en **Skjut!**-knapp tänds; hjälten rör sig
  inte förrän barnet trycker (`_offerAssist`/`_takeOffer`). Slangbellan stängs aldrig av, så
  det går lika bra att sikta själv — griper barnet hjälten försvinner erbjudandet. Rör ingen
  knappen på 12 s (`OFFER_PATIENCE`) tar det garanterade glidet vid, så no-fail-golvet är
  orört. Mätt med `scripts/_offerprobe.mjs`: **11/11**.

### Variation & överraskning
- ~~**[Quick] Fyll luften med studsmoln/hinder.**~~ ✅ 2026-08-07 (byggd tidigare; 1–2 moln per
  bana i `_layoutFor`). **Men de gick inte att SE:** `makeCloudBumper` ritade ett moln identiskt
  med ängens dekor-moln, så ingen kunde veta vilka moln som studsade — jag läste dem själv som
  bakgrund i skärmdumpen. Åtgärdat den här omgången: krans av blå studsprickar + två uppåtpilar,
  och stjärnor spawnar inte längre ovanpå ett moln (`_layoutFor` kastar om en gång).
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
- ~~**[Deep] Hjälten reagerar och firar eget.**~~ ✅ 2026-08-07 (verifierad i kod, gjord redan
  2026-08-06). Glad snurr vid insamling och plattad "uff" vid väggstuds — `index.js:702-704`;
  vinsten kallar `_heroHangFinish`, han hänger upp-och-ner i sin egen tråd och vinkar —
  `index.js:689`.

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
- 2026-08-04: **P0 ASSETS + läsbarhet.** (1) Stjärnorna ritas nu (tio hörn, guldkant, glansprick)
  i stället för ⭐-emoji, och den instängda **kattungen ritas** (öron med rosa insida, svans,
  nos, morrhår, kinder) i stället för 🐱 — buren och räddningsanimationen var redan på plats,
  men själva figuren var en emoji. (2) Vind-etiketten ("Av/→/←") var mörk text direkt mot
  himmel/kulle och svävade bortkopplad från knappen; den har nu en ljus pill bakom sig.
  errorCount 0.
- 2026-08-06: **[Deep] Hjälten reagerar och firar eget** (spår "20 spel från 🔧 till ✅").
  - **Glad gest vid insamling** (`_heroYay` — snabb squash-and-stretch) och **"Uff!" vid
    väggstuds** (`_heroOof` — plattas till + svävande text). Hjälten var tidigare helt
    uttryckslös mellan skotten; nu svarar han på det som händer.
  - **Spel-specifik finish** (`_heroHangFinish`): vid rundvinst hissas han upp i en **egen
    webbtråd**, hänger **upp-och-ner** och gungar fram och tillbaka — i stället för att bara
    skalas upp ovanpå den delade konfettin. Tråden ritas per bildruta mot hjältens faktiska
    x, och `_hangTl` dödas både vid ny runda (annars hänger han kvar) och i `destroy`.
  - Kvar sedan tidigare: [Deep] hjälpen ska bjuda in i stället för att ersätta (rita
    hjälp-skottets prickbana och låt barnet trycka "Skjut!" självt).
- 2026-08-07: **Doc-avstämning mot koden (ingen kodändring).** [Deep] "Hjälten reagerar och
  firar eget" verifierad som byggd (`index.js:689` `_heroHangFinish` + `:702-704`) och struken.
  **Kvar och äkta öppen:** [Deep] "hjälpen ska bjuda in, inte ersätta" — vid miss 2 kallar
  `_ready` fortfarande `_autoAssist`, som räknar ut skottet och **avfyrar det åt barnet**
  (`index.js:542-559`). Det är den sista kvarvarande *ersättande* formen av auto-hjälp-mönstret
  i repot; `enhorningen-elvira:757-794` är mallen för hur den ska bjuda in i stället.
- 2026-08-07 ✅ **Poleringsomgång: hjälpen bjuder in i stället för att ersätta.** Spelets sista
  äkta [Deep]-punkt — och den sista *ersättande* formen av auto-hjälp-mönstret i repot.
  1. **`_autoAssist` → `_offerAssist`.** Förr räknade spelet ut ett nästan-perfekt skott vid
     miss 2 och **avfyrade det åt barnet**. Nu ritas skottets prickbana ut och en Skjut!-knapp
     (210×112 + Buttons 24px halo) tänds mitt nere — hjälten står kvar tills BARNET trycker.
     Slangbellan stängs aldrig av; `onGrab` plockar bort erbjudandet så det aldrig finns två
     aktiva lägen. Mall: `enhorningen-elvira:_placeHelperCloud`.
  2. **No-fail-golvet är orört.** `OFFER_PATIENCE` 12 s utan tryck → samma garanterade
     `_glideToTarget` som förr. Inbjudan flyttar agensen till barnet utan att ta bort garantin.
  3. **Inbjudan kan inte ljuga.** `_solveShot` behåller den vinnande kandidatens egna
     `predictTrajectory`-punkter, så prickbanan ÄR den bana skottet flyger — ingen andra
     kalibrering att glida isär. `spelkritiker` hittade hålet i just den garantin:
     `predictTrajectory` känner golv/väggar men **inte studsmoln**, så en bana kunde gå rakt
     genom ett moln och lova en flykt som i verkligheten studsar bort. `_solveShot` slutar nu
     läsa en kandidatbana vid första studskontakten (`_hitsBumper`, hjälteradie inräknad).
     Mätt efter: minsta marginal bana↔moln **75 px** (var negativ).
  4. **Studsmolnen syns.** Se §4 — egen siluett + ingen stjärna ovanpå.
  5. **Prickarna växer mot målet** i stället för att tona bort, och banan pulserar svagt, så
     inbjudan läses även med ljudet av (kritikerns påpekande att 🎯 ensam bär lite).
     Steget skalas mot banans längd — ett fast steg gav bara 4 prickar på ett kort skott.
  - **Mätt:** `scripts/_offerprobe.mjs` **11/11** (erbjudande efter exakt 2 missar · hjälten
    stilla på (240,540) · banans närmaste punkt 2 px från ett mål · banan ≥0 px från alla moln ·
    slangbellan påslagen · tryck på Skjut samlar en stjärna · utan tryck samlar glidet ändå ·
    0 konsolfel vid exit). `npm run check` 0/0 · `npm run test:all` **71/71** · 0 fynd i
    `.test-logs/spindelhjalten.json`.
  - `spelkritiker`: **inga blockerare**, alla 7 grindpunkter håller. **Kvalitet 🔧 → ✅.**
  - Kvar som [Medium]/[Quick] i §4: studsknoppen som dragbart verktyg, stjärn-kluster i former,
    sällsynt regnbågsstjärna, stjärnhimmel som fylls, vilo-guppning på studsmoln, riktiga
    SFX-klipp (väntar på MOSS).
- 2026-08-09: **LYFTPLAN rad 3 / A2** (v1.47–48.0, `62b91db` + `bce776d`): stjärnorna ritas av delade `makeStjarna` (`lib/foremal.js`, glöd behållen); studsbumpern fick `sphereFill`. Bumpern delades medvetet inte med flipperspelets — de är två olika föremål.
  Kontroll: `check` 0 fel · `test:all` 72/72 · skärmdump granskad. Inga spelregler eller layout rörda.
