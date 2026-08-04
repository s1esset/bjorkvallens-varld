# Vippbrädan (`vippbradan`)
> ⚙️ fysik · tap · 3–5 år · status: 🔧 förbättringar pågår

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
- **[Quick] Brädan känns.** Liten dammpuff + studsljud-skala när vikten slår i; plankan
  studsar en aning extra vid stor vikt.

### Progression
- **[Quick] Samla i korgen.** Visa hur många grodor man landat (en liten grodkör i korgen som
  växer) i stället för bara nivåhöjning.

### Karaktär & berättelse
- **[Deep] En mottagare.** Ett djur/Bobo vid korgen som hejar när man siktar och fångar grodan
  med ett kram + egen vinst-dans — ersätter generisk konfetti och ger varje skott ett "varför".

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
