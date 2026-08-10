# Bajs och Kiss (`bajs-och-kiss`)
> 🎉 roligt · drag · 3–5 år · status: ✅ polerad (2026-08-05)

## 1. Nuläge (sett som spelare)

Ett ljust badrum med kaklat golv. Elvira och Zacke står till vänster och turas om att hålla
en söt bajskorv 💩. Jag *drar* korven (slunga-fritt, AimLauncher) → en prickad kastbåge visar
var den hamnar, jag släpper → korven flyger som en riktig matter.js-kropp i en båge, studsar
mot pottkanten och golvet och — om den landar i skålen — **PLOPP!** En liten mätare uppe i
mitten fylls med en 💩 per lyckat kast (3–5 behövs). Full mätare → stort firande, båda barnen
hoppar, nästa nivå (pottan flyttas längre bort + krymper).

Två kontroller styr utfallet: tre **storleksknappar** (Liten/Mellan/Stor = lätt/normal/tung →
kort eller lång båge via MATERIALS), och en **pruttvind** 💨-knapp som blåser korven åt höger
(och håller pricklinjen ärlig via `setPreview`). En busig **spol-knopp** på toalettlådan är ett
gömt påsk-ägg: tryck → "pappa" 👨 ramlar ner uppifrån och spolas ner i en snurrvirvel medan
barnen skrattar. Missar är ofarliga (puff + "Hihi!"/"Hoppsan!"), och efter 4 missar tar
kompisen ett garanterat plopp. Mätaren går bara uppåt.

**Funkar bra:** kärnloopen har äkta agens — storlek + vind förändrar bågen mätbart, och
pricklinjen är kalibrerad (`previewGravity 0.42`). No-fail är generöst (assist efter 4 missar,
inte 2). Turordningen Elvira/Zacke och spol-knoppens pappa-gag ger värme och skratt. Allt ritas
programmatiskt och städas exit-säkert.

*(Skärmdump: badrum, Elvira + Zacke till vänster, potta till höger, Liten/Mellan/Stor-knappar
nere, tom 3-platsers mätare uppe.)*

## 2. Ursprunglig plan & tankeprocess

Toaletthumor är *guld* för 3–5-åringar — den busiga, lite förbjudna skratt-tändaren. Designen
tar den fniss-energin och hänger den på ett riktigt sikt-och-kasta-mål (AimLauncher + matter.js)
så att leken har djup: barnet *väljer* båge, kraft, storlek och vind, ser konsekvensen och får
ett tillfredsställande plopp. Pott-träning bakas in mjukt och positivt (bajs hör hemma i pottan,
aldrig skam). Spol-knoppens pappa-gag finns för det där extra fniss-wow:et som får barn att visa
en vuxen. Allt är no-fail by design: kompisen räddar alltid till slut.

## 3. Vad gör det lättjefullt / tunt

Stark mekanik, men en kräsen spelare/förälder märker det billiga:

- **Badrummet är en tom blå tapet.** Scenen är bara en vatten-gradient + kaklat golv. Inget
  handfat, ingen spegel, inga handdukar, ingen toarulle, ingen badrumskänsla. För ett spel som
  *handlar* om ett badrum är rummet anonymt och kalt (se skärmdumpen — stora tomma blå ytor).
- **Barnen är kartong-figurer som bara guppar.** Elvira/Zacke har fasta ansikten och en
  liten studs vid plopp. De *strängar inte an* före kastet (ingen knip-anticipation, ingen
  rolig min), grimaserar inte, byter inte uttryck. Toaletthumorns bästa skämt — själva
  "uuuh… PLOPP!"-uppladdningen — saknas helt.
- **Pruttvinden slås på automatiskt från nivå 2 och blir bakgrund.** Den ena av de "två extra
  kontrollerna" sköter sig själv → barnet trycker den sällan medvetet. Agensen blir i praktiken
  bara storleksvalet.
- **Bara ETT mål, alltid samma potta.** Nivåvariationen är "flytta pottan längre + krymp den".
  Ingen variation i *vad* man siktar på, inga hinder, inget rörligt mål, inga olika bajs-typer.
- **Mätaren är abstrakta cirklar.** Att fylla 3–5 vita ringar säger inte "pottan blir full" på
  ett tematiskt eller roligt sätt; pottan i skålen ser likadan ut hela tiden.
- **Belöningen är generisk.** Samma `bigCelebration` som alla spel; ingen egen pott-/badrums-
  vinstanimation (t.ex. spolning, glad potta-figur).
- **Spol-gagen är gömd och osammanhängande.** Pappa-virveln är härlig men knoppen är liten och
  grön, lätt att missa, och kopplad till inget i kärnloopen. Många barn upptäcker den aldrig.
- **Ljudpaletten är tunn.** `fart`/`plopp`/`pop`/`soft` räcker till grunden men det finns ingen
  stigande "plopp-kombo", ingen variation i plopp-klangen, inget spol-svisch som belöning.

Kort sagt: *mekaniskt rikt, scenografiskt och karaktärsmässigt fattigt*. Humorn bor i koden
(röstfraser, pappa-gag) men inte i bilden — barnen och rummet bär den inte.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Knip-anticipation före kast.** Låt den aktiva ungen göra en kort, fnissig
  "stånka"-pose (lutar fram, kinder puffar, 💨-pip) precis innan korven föds — så blir varje
  kast en liten komisk uppladdning istället för att korven bara dyker upp i handen.
- **[Medium] Gör pruttvinden till ett aktivt val igen.** Slå inte på den automatiskt; låt den
  istället *erbjudas* (knappen guppar/lyser) när pottan står långt bort, så barnet känner att
  *det* löste kastet med vinden. Behåll auto-assist som säkerhetsnät.
- **[Deep] Fler siktemål & lekfulla hinder.** Variera vad man siktar på per nivå: en gungande
  potta på hjul, en pall i vägen att studsa över, två pottor (välj vilken). Allt fortfarande
  no-fail — hinder gör bara bågen roligare att lista ut.

### Variation & överraskning
- **[Quick] Olika bajs-typer per kast/nivå.** Glitterbajs ✨, regnbågsbajs 🌈, jätte-plums-bajs
  som ger extra-stor ploppe. Rotera så tur 2 inte ser ut som tur 1.
- **[Medium] Knyt spol-gagen till loopen.** Låt spol-knoppen lysa upp som en *belöning* efter
  full mätare ("spola allt!") så pappa-virveln blir en upptäckt alla får se, inte en gömd
  slump. Lägg fler spolbara busgäster (badanka, en strumpa, en leksak) för upprepningsvärde.

### Juice
- **[Quick] Saftigare plopp.** Stigande tonhöjd vid plopp-i-rad (kombo som klättrar) + ett
  litet stänk av "pott-vatten"-droppar + en mikroskak som skalar med bajs-storleken.
- **[Quick] Tematisk mätare.** Byt de abstrakta ringarna mot en liten potta som *fylls*
  synligt korv för korv (och puttrar nöjt när den är full), så framsteget blir begripligt utan
  läsning.

### Progression
- **[Quick] Mjuk scenövergång mellan nivåer.** Cross-fada bakgrunden / låt ett nytt badrums-
  tema glida in istället för hård ompositionering av pottan, så världen känns sammanhängande.

### Karaktär & berättelse
- **[Medium] Levande badrum.** Bygg in handfat, spegel (där barnens min syns!), handdukshängare,
  toarulle, en kackel-vägg och kanske en nyfiken katt — så rummet bär humorn. Använd bara
  godkända namn (Elvira/Zacke/Alissa/Lova) på avbildade personer.
- **[Deep] Reaktiva barn.** Ge Elvira/Zacke uttryck som byter med utfallet: stora ögon under
  flygningen, jubel-min vid plopp, fnitter-min vid miss, "heja"-vift mot kompisen. Det är här
  spelets själ skulle vakna.

### Ljud
- **[Quick] Spol-svisch som vinstljud** + variera plopp- och fart-klippen så de inte blir
  monotona; lägg en lugn badrums-ambient (droppande kran) i botten.

## 5. Status / loggar

- 2026-08-10 🎨 **D1: badrumsgolvet fick ljus uppifrån** (`f16b2ef`, v1.123.0).
  Golvet låg på **88 856 px i EN ton** (`_plattprobe --medbakgrund`) — spelets största fält.
  Delad `groundFill()` med dämpad ramp (0,06/0,10): ytan är nästan vit och standardvärdena
  hade gjort den smutsgrå.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **88 856 → 31 820 px.**

- 2026-08-07 (`/fixa`, ATGARDER **V5** — spelet föll BARA i full `test:all`):
  - **Symptom:** `pageerror ×112`, `tween-mot-forstort ×3`, `tween-lacka ×1` — men bara när
    alla 71 spel kördes parallellt. Ensamt: grönt. Fyra parallellt: grönt. Det gjorde det lätt
    att avfärda som flakigt; det var det inte.
  - **Reproduktion utan att köra 71 spel:** `scripts/_bajsprobe.mjs` stryper CPU:n via CDP
    (`Emulation.setCPUThrottlingRate`) och lämnar spelet vid en rad olika tidpunkter. Det
    återskapar exakt det loggen visade före kraschen (`lang-ruta 100 ms` + `fysik/svalt`):
    långa bildrutor gör att teardown förlorar kapplöpningen. Träffbild före fixen: **~1–2 av
    20 avhopp**.
  - **Grundorsak:** `destroy()` dödade tweens objekt för objekt ur en **handhållen lista** över
    de referenser spelet råkade ha kvar. Allt spelet tappat greppet om missades — t.ex. en
    tidigare bajs-vy vars plopp-tween fortfarande gled — och varje `if (!x.destroyed)`-vakt
    **hoppade över städningen i precis det läge då den behövs mest**. Kvar blev en tween som
    skrev `.y` på ett rivet objekt. Pixi v8 nollar `_position` i `destroy()`, så settern kastar
    `Cannot set properties of null (setting 'y')` varje bildruta — därav 112 fel av EN läcka.
  - **Fix:** `dodaTrad(this._root)` går igenom hela displayträdet och dödar tweens på varje nod
    (plus `.scale`/`.position`), oavsett om spelet har en referens kvar. De sparade
    proxy-tweenarna (`_wallTween`, `_assistTween`, `_swirlTween` …) och `ctx.later`-timrarna
    dödas som förut — de sitter på hjälpobjekt, inte i trädet.
  - **Mätt efter:** 0 fel på 24 strypta avhopp, och **`test:all` 71/71** — sviten hade varit
    röd på exakt det här spelet tre fulla körningar i rad.

- 2026-06-30: Doc skriven (granskad i spelet, errorCount 0). Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Medium] knip-anticipation + reaktiva barn + [Quick] tematisk
  pott-mätare** — lyfter humorn och karaktären där spelet är som tunnast, utan att röra den
  redan starka kast-mekaniken.
- 2026-08-05 ✅ **Andra omgången — scenografi, assets och karaktär (poleringsrundan, Kö 1 #1).**
  Alla emoji-spelobjekt bort; spelet ritas nu helt programmatiskt.
  - **Ritad bajskorv [P0 ASSETS]** — `makeTurd()` bygger en riktig korv (tre avsmalnande lager,
    mörk kontur, glansdrag, eget ansikte) i tre typer: **vanlig / glitter / regnbåge** med
    vikterna 0.62/0.21/0.17, så tur 2 ≠ tur 1 och de sällsynta ger extra gnistor + egen replik.
    Ersätter `new Text({ text: '💩' })`.
  - **Levande badrum [Medium]** — `makeBathroom()`: kaklad nedre vägg med list, fönster med
    himmel/sol/moln, spegel, handfat med **droppande kran** (ambiens var ~5–11 s via `ctx.later`),
    handdukshängare, toarullehållare, hylla med badflaskor, badmatta och en **nyfiken katt** som
    tittar upp vid varje plopp. Väggtonen glider mjukt mellan nivåerna (`WALL_TINTS` + `lerpColor`).
  - **Reaktiva barn [Deep, nu gjort]** — `drawKidFace()` ger Elvira/Zacke fyra riktiga miner:
    glad (vila) · wow (korven flyger) · jubel (plopp, blundande ögon + tunga) · fniss (miss).
    Ersätter de flytande emoji-bubblorna från §5-posten 2026-07-01.
  - **Tematisk mätare [Quick]** — `makePotty()`: en ritad barnpotta med ryggstöd och ansikte som
    fylls korv för korv (den riktiga typen per plopp) och vars mun blir bredare ju fullare den är.
    Ersätter 🚽 + 💩-cirklarna.
  - **Spol-gaget knutet till loopen [Medium]** — `👨`-pappan (bröt P0 KARAKTÄRER: avbildade
    människor får bara heta Zacke/Alissa/Elvira/Lova) är ersatt av fyra **ritade busgäster** —
    badanka, strumpa, leksaksbil och maskoten Bobo — som roterar utan direkt upprepning. Efter
    full potta **lyser spolknappen** (glow-ring + röstinbjudan) så alla hittar gaget.
  - **Pruttvinden är ett val igen [Medium]** — auto-på från nivå 2 borttaget; knappen guppar och
    bjuder in efter en miss från nivå 2 (`_maybeInviteWind`). Auto-assist efter 4 missar kvar.
  - **Spel-specifik finish [Quick]** — `_flushCelebrate()`: vattenvirvel som snurrar ner i skålen,
    bubblor och en spol-svisch som faller i tonhöjd, ovanpå `bigCelebration`.
  - **Buggar fixade:** (a) toaletten **svävade** när den krympte — `bowlY` härleds nu ur
    `FLOOR_Y - PED_H * scale` så foten alltid står på golvet; (b) dubbel spolknapp (spollådans
    egen grå knapp bort, den gröna knoppen är enda); (c) `arc()` i en delad `Graphics` utan
    `moveTo` drog **ett brunt streck tvärs över båda barnen** → hjälparen `arcPath()`;
    (d) `gsap.from` på mätarkorvar levde kvar efter `destroy()` och skrev till `null.y` →
    tweens dödas före destroy; (e) konkatenerade repliker (`` `Nu är det ${namn}s tur!` ``,
    `` `${label} bajskorv!` ``) är literaler (`TURN_SAY`/`SIZE_SAY`) så `check` ser dem;
    (f) storleksknapparna stod 20px isär → hit-halorna överlappade; nu 440/640/840 (50px).
  - **Efter `spelkritiker`:** korven låg 68px ovanför den ritade handen → `_kidHands` sänkta till
    y 514; spolgästens skratt-fallback var samma `celebrate`-fanfar som nivåvinsten → `pling`;
    mätarens tomma platser syntes nästan lika mycket som de fyllda → alpha 0.16 → 0.09.
  - 8 nya repliker i `scripts/voice-phrases.json` (väntar på `/rost`). `check` 0 fel,
    `test` 0 konsolfel i tre körningar (standard, riktade drag, spolknapp).
  - **Kvar [Deep]:** fler siktemål och lekfulla hinder (gungande potta, pall att studsa över,
    två pottor att välja mellan) — mekanikändring, egen omgång.
- 2026-07-01 🔧 **Första-omgången byggd (karaktär, scoped):** (1) **Knip-anticipation [Medium]** —
  `_stankaPose`: den aktiva kompisen gör en fnissig squash + 💨-pip (synt) precis när korven dyker
  upp → varje kast får en komisk uppladdning. (2) **Reaktiva barn [scoped]** — `_reactKid` flyter en
  reaktions-emoji över den aktiva kompisen: 😮 vid kast, 😄/❤️/🎉 vid plopp, 🤭/😆 vid miss (ansikts-
  refaktor/Deep lämnad). (3) **Saftigare plopp [Quick]** — stigande plopp-kombo-ton via `audio.tone()`,
  nollas vid miss. Mätaren är redan halv-tematisk (🚽 + 💩-platser, pulsar vid plopp). Städning:
  oanvänd `ctx`-param bort ur `_setToilet`. errorCount 0.
