# Vippbrädan (`vippbradan`)
> ⚙️ fysik · tap · 3–5 år · status: ✅ marknadsklar (2026-08-07)

## 1. Nuläge (sett som spelare)

En groda 🐸 sitter på vänster ände av en vippbräda (riktig matter.js-revolut, fastnålad i
mitten). Längs brädans HÖGER arm löper en skena med en bärbar grå **vikt** som jag DRAR (eller
tappar ett ställe) för att välja släpp-läge — nära navet = svag skjuts, ytterst = stark — och
tre knappar (**Liten / Mellan / Stor**) väljer viktens massa. En prickad förhandsvisning visar
grodans båge live när jag ändrar läge eller storlek (kalibrerad mot G_STEP, så bågen är ärlig).
Släpper jag vikten faller den på brädan, brädan vippar, och grodan katapulteras i en båge mot
en glödande korg nära högra kanten.

Landar grodan i korgen → firande + stjärna + klistermärke + ny nivå (korgen flyttas högre/
mindre). Missar landar roligt (puff, vingel, "Hihi!"), och efter två missar tar en snäll
auto-båge grodan tryggt i korgen. En "magnetisk" korg räknar en nedåtgående groda nära
öppningen som landning. Idle ~6s → talad ledtråd + en finger-ledtråd glider längs skenan
tills man interagerat.

**Funkar bra:** TVÅ riktiga kontroller (läge × vikt) som båda matar skjutkraften, en ärlig
bågförhandsvisning, katapult-fysiken är charmig, no-fail intakt, exit-säkert. En av de mer
agensrika fysiklekarna.

*(Skärmdump: vippbräda med groda mitt i flykten, vikten rullar, skenan med bärbar vikt högt
upp, glödande korg till höger, Liten/Mellan/Stor-knappar nederst med Mellan vald.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet ville bygga en **goal-based fysiklek med minst två kontroller** (enligt
ARKITEKTUR §physics): inte bara "tryck → skjut" utan ett val av VAR (läge på armen) och HUR
TUNGT (massa), där `_launchVel` gör att total≈1 träffar korgen exakt. Den prickade bågen lär
barnet koppla val → utfall. Assist-bågen + magnetkorgen + den tämjda plankan (`_tame`)
garanterar succé och hindrar att brädan slår runt.

## 3. Vad gör det lättjefullt / tunt

Bra grund — kritiken gäller karaktär, spatial tydlighet och hur mycket spelet löser åt dig:

- **Skenan svävar bortkopplad från brädan.** Den bärbara vikten ligger på en brun skena högt
  upp (y≈124), långt ovanför vippbrädans höger arm (y≈560). För ett litet barn är det otydligt
  *varför* en vikt man drar däruppe får grodan att flyga — kopplingen mellan kontrollen och
  fysiken är spatialt bruten.
- **Grodan är en stum prop.** Ett emoji som åker; den tittar inte mot korgen, blinkar inte,
  ropar inte. Korgen glöder men har ingen mottagare som väntar/jublar.
- **Den "magnetiska" korgen mjukar bort skickligheten.** I `_update` räknas en nedåtgående
  groda inom ±120px och dy ∈ [-150,110] som landning — generöst nog att en grovt siktad båge
  ofta "landar" ändå. Plus assist efter två missar = spelet löser sig lätt självt.
- **Förhandsvisningen löser pusslet — men inte för målgruppen.** En vuxen läser pricklinjen
  och träffar varje gång (nästan deterministiskt); en 2–3-åring läser den inte alls och förlitar
  sig på assist/magnet. Mittenläget blir "bra nog" varje gång.
- **Vikterna är identiska stenar.** Tre `🪨` i olika storlek, ingen charm eller variation
  (inga olika föremål/djur som vikt). Inga olika mål (en korg, ibland förflyttad).
- **Generisk belöning + tunt ljud.** `correct`/`celebrate` + standardkonfetti; `boing`/`plopp`/
  `pop`. Ingen stigande "wheee" under flykten, inget specifikt korg-mottagningsljud.

Kort sagt: *mekaniskt rik men känslomässigt tom* — grodan och korgen saknar liv, och magnet
+ assist + preview gör att det sällan kostar att inte tänka.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Knyt skenan till armen visuellt.** Lägg vikt-skenan PÅ höger arm (följ plankans
  vinkel) eller rita en tydlig "vikt-vagn på rälsen" så barnet ser att vikten faller på brädan
  som vippar. Kopplingen kontroll→fysik blir begriplig utan ord.
- **[Quick] Dra ner magnet-marginalen en aning.** Behåll no-fail (assist kvar), men gör
  magnetkorgen lite snävare så en välsiktad båge känns som *barnets* förtjänst.

### Variation & överraskning
- **[Quick] Vikt-variation.** Byt de tre stenarna mot roliga föremål (fjäder/äpple/städ) eller
  små djur — samma massa-roll men charm och igenkänning. Liten "tung/lätt"-min på vikten.
- **[Medium] Varierade mål.** Ibland två korgar (välj vilken), en korg på en pall, eller en
  korg som långsamt gungar i sidled på högre nivåer — får läge×vikt-valet att betyda mer.

### Juice
- **[Quick] Grodan lever.** Ögon som spårar korgen medan den siktar, ett "wheee!" och utsträckta
  ben under flykten, en glad plums-animation i korgen (i stället för bara krymp).
- ~~**[Quick] Brädan känns.**~~ ✅ 2026-08-12 (v1.158.0) — dammpuff i kontaktpunkten,
  anslagsljud som skalar med farten och egen röst per material, och en planka som går
  djupare och fjädrar tillbaka mer ju tyngre vikten är.

### Progression
- **[Quick] Samla i korgen.** Visa hur många grodor man landat (en liten grodkör i korgen som
  växer) i stället för bara nivåhöjning.

### Karaktär & berättelse
- ~~**[Deep] En mottagare.**~~ ✅ 2026-08-07 (verifierad i kod, gjord redan 2026-08-04). Bobo
  står vid korgen med ritad kropp, fötter och utsträckta armar och andas i vila —
  `index.js:155-175`. Punkten stod kvar som öppen i den här planen i tre dagar efter att den
  byggts; det var enda skälet till att spelet fortfarande bar 🔧.

### Ljud
- **[Quick] Riktiga SFX** (boing, korg-plums, "wheee") via SFX-pipelinen ([[real-audio-sfx]]);
  variera vinst-stinget och låt grodan ge ett litet kväk vid landning.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan). Spelet testat (errorCount 0, skärmdump sedd).
  Nyligen fixat (riktig revolut-fysik, dra-läge, kalibrerad båge) — därför enrichment, inte räddning.
- Rekommenderad första-omgång: **[Medium] knyt skenan till armen + [Quick] levande groda &
  mottagare** — gör den spatialt tydlig och själfull utan att röra den fina fysiken.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). Skenan flyttad ned till strax ovanför
  brädans HÖGER arm (RAIL_Y 124→470) med stödben ner till plankan + vikten släpps därifrån
  (kort, tydligt fall på armen) → kopplingen kontroll→fysik blir spatialt begriplig utan ord.
  Grodan lever: lutar sig ivrigt mot korgen medan den siktar (tittar mot målet), sträcker på
  benen + "Wheee!" i flykten, glad squash-studs ner i korgen. Mottagare tillagd: Bobo står vid
  korgen, hejar (andas) medan barnet siktar och fångar grodan med kram-puls + vinst-dans + hjärta
  (pattern #2 — ger varje skott ett "varför"). Fysik/kalibrering + no-fail (assist/magnet) orörda.
- 2026-08-04: **Andra omgången** (errorCount 0) — P0 ASSETS och en mottagare med kropp.
  - **Vikt-variation** (§4 [Quick]): de tre identiska stenarna är utbytta mot **fjäder ·
    äpple · städ**, alla ritade med egen silhuett. Etiketterna heter nu **Lätt / Mellan /
    Tung** i stället för Liten/Mellan/Stor — barnet kopplar *sak → tyngd → hur högt grodan
    flyger*, vilket är precis vad mekaniken lär ut.
  - **P0 ASSETS:** grodan ritas nu (ögonkullar, ljus mage, ben, leende) i stället för 🐸-emoji;
    vikterna var 🪨-emoji **inuti en grå cirkel** — exakt det regeln förbjuder; korgens
    🧺-dekal är ersatt av en ritad rosett. Det svävande 🐸 vid landning är borttaget
    (grodan själv syns ju i korgen).
  - **Bobo hade bara ett svävande huvud** bredvid korgen. Han har nu ritad kropp, fötter och
    utsträckta armar och står stadigt på marken — mottagaren läser som en figur som väntar.
- 2026-08-07: **Doc-avstämning mot koden (ingen kodändring).** Planens enda [Deep]-punkt
  ("En mottagare") var byggd redan 2026-08-04 men aldrig struken i §4 — och eftersom
  `docs/games/README.md` definierar 🔧 som "har kvarvarande [Deep]-punkter i §4" bar spelet
  fel badge i tre dagar. Verifierat i `index.js:155-175` (Bobo med kropp, fötter, utsträckta
  armar, andas i vila vid korgen). **Kvalitet 🔧 → ✅.** Kvar i §4: bara [Quick]/[Medium].
- 2026-08-09: **Mottagaren blev en rigg** (`lib/karaktarer.js`, utrullningens omgång 4). Den
  handritade kroppen från 08-04 togs inte bort — den **kändes igen**: `_byggKropp` skrev av
  precis de måtten (skugga 2,36·r = 118, fötter 2,16·r = 108, bål 1,36·r = 68, axel ±0,54·r =
  ±27, tass ±1,04·r = ±52), så 15 rader `Graphics` blev ett anrop. Riggen ligger i den yttre
  containern (spelet äger `pop`/`wiggle`, riggen `view.scale`). `breathe(_bobo)` borttagen —
  två pulser på samma figur glider isär. Nytt beteende: `look()` följer grodan på plankan och
  hela flygbanan, `setMood('nyfiken')` medan barnet siktar, `react('jubel')` vid landning,
  `react('hoppsan')` vid miss (förvånad, aldrig sur — P0 MOTGÅNG). `npm run test` grön,
  `check` 0/0. Commit `3c2d9e0`.
- 2026-08-12: **Brädan känns** (§4 [Quick], v1.158.0). Ny sond `scripts/_vippprobe.mjs` mätte
  först HEAD, och baslinjen var värre än planen antog: **plankan såg likadan ut för två av tre
  vikter.** Både äpplet och städet slog i `_tame`s hårda klamp — uppmätt **28,65° = exakt
  0,5 rad** för båda, där skillnaden bara syntes i hur LÄNGE de låg kvar mot taket (städet 51
  bildrutor, äpplet 5). Utslaget var alltså klampens, inte viktens.
  - **Mjukt ändläge i stället för hård klamp.** Från 0,30 rad tar brädan emot med en
    progressiv fjäder + extra dämpning (`TILT_SOFT/SPRING/DAMP`); 0,5 rad finns kvar men bara
    som nödbroms, och nås inte längre. Toppvinkeln blev viktens egen: **5,1° · 19,0° · 22,6°**
    (fjäder · äpple · städ), **0 bildrutor mot taket**. Och eftersom energin nu går tillbaka i
    fjädern i stället för att nollställas fjädrar plankan tillbaka: **0,0° · 2,5° · 5,4°** med
    **0 · 1 · 2** riktningsbyten. Det är §4-punktens "studsar en aning extra vid stor vikt".
  - **`_tame` flyttad till `phys.beforeStep()`.** Konstanterna är per STEG; på en bildruta som
    tappas kör fysiken upp till 5 steg, och per-bildruta hade brädan då fått en femtedel så
    mycket dämpning på svaga enheter. (Samma regel som mjuka kroppar, [[mjukkropp-tidssteg]].)
  - **Anslagsljudet kommer ur delade `phys.impactAudio`** (fart → volym + tonhöjd, material →
    röst) i stället för ett fast `plopp` som lät likadant för alla tre. Vikterna fick en
    `rost`: fjäder och äpple möter trä mot trä, städet är det enda som klingar i metall —
    uppmätt **225 · 229 · 705 Hz**.
    ⚠️ **Städet låter INTE starkast, och det är rätt.** Det är stort (r 52) och möter därför
    plankan efter ett kortare fall än äpplet: styrka 0,20 mot 0,28, alltså 0,114 mot 0,129 i
    volym. Tyngden bärs av rösten (metall, mer än dubbelt så lång ton), av dammet och av hur
    djupt plankan går — inte av volymen. Ingen `impactAudio`-parameter känner till massa.
  - **Damm i kontaktpunkten** (`onImpact` → `puff`), mängd = anslagsstyrka × viktens egen
    skala, färg = materialets märke (trä brunt, metall grått): **391–600 · 1232–1496 ·
    1952 px** över två körningar. Tröskeln sattes till `minSpeed 1.8`: vid 2,4 föll fjädern
    under den och blev **helt** dammfri (0 px) — en tröskel som en av tre vikter aldrig
    passerar döljer effekten i stället för att dosera den.
  - **Kalibreringen orörd, och det är mätt:** `_launchVel` löser bågen från grodans FAKTISKA
    läge mot korgen, så ett djupare utslag flyttar startpunkten utan att flytta siktet. Sonden
    kollar det varje körning (äpple, mitt på skenan → landar i korgen).
  - **Sonden var fel tre gånger innan spelet var det** (nu åttonde gången i projektet):
    (1) den fotograferade dammet efter en FAST paus på 260 ms — fjädern bromsas av luften och
    hade inte landat än, så en effekt som fungerade rapporterades som 0 px; (2) den fångade
    utskjutningens `sparkle` + "Wheee!" i samma fxLayer och mätte 791/771/755 px, alltså
    texten och inte dammet; (3) den stängde av utskjutningen för att isolera dammet — och
    eftersom **spelmodulen är ETT objekt som återanvänds vid varje montering** överlevde
    patchen `nav.go` och fick nästa runda att rapportera "bågen har flyttat sig". Dessutom
    mätte den först i partiklarnas FÖDELSEÖGONBLICK, då alla ligger i en klump: 3 och 10
    partiklar gav samma pixeltal (verifierat i bild — ett enda grått klot).
  Kontroll: `check` 0 fel/0 varningar · `npm run test vippbradan` grön · `_vippprobe` grön.
