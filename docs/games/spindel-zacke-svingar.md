# Spindel-Zacke Svingar (`spindel-zacke-svingar`)
> ⚙️ fysik · tap · 3–5 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

Spindel-Zacke (en helt egen hjälte-figur i röd/blå dräkt med domino-mask — INTE Spider-Man)
hänger i en spindeltråd från ett fäste och svingar som en **pendel** fram och tillbaka över en rad
färgglada hustak mot en ljus himmel. Längst upp sitter en rad fästen (knoppar med 🕸️), och på det
sista taket väntar en kattunge 🐱 med Elvira som vinkar bredvid. Jag **trycker var som helst på
himlen** för att SLÄPPA nätet i rätt stund → Zacke flyger iväg som en projektil i en båge och ett
nytt nät fäster automatiskt vid nästa fäste. Mål: svinga sig hela vägen till kattungen → firande
("Du räddade kattungen!"). Två kontroller ändrar utfallet: (1) **timing** av släppet (högt i
framåt-bågen = långt kast, i botten = flackt), (2) en **nät-längd-knapp** (📏 Kort 170 / Lång 260)
som ändrar pendelns period och räckvidd. Faller han kort glider ett mjukt moln ☁️ in och bär honom
tillbaka till senast nådda fäste (fniss, inget game over). Idle → auto-släpp i bästa stund + ett
garanterat kast efter upprepade missar.

**Funkar bra:** pendel→projektil→ny pendel-loopen är en riktig liten fysikmotor (gemensam G ger
konsekvent känsla), moln-räddningen är en charmig no-fail-lösning som aldrig skickar bakåt,
nät-längd-knappen ändrar verkligen banan, och Zacke + kattunge + Elvira ger scenen ett tydligt
mål och hjärta. Hustaks-siluetten är fin. Exit-säkert (egen integrator, vaktade moln-tweens).

*(Skärmdump: hustak i rad, röd/blå Zacke på ett räddnings-moln, fäst-knoppar längs toppen, 🐱 + Elvira på mål-taket, 📏 Kort-knapp.)*

## 2. Ursprunglig plan & tankeprocess

Tanken (ur kodhuvudet): ett **timing-/swing-spel** (som en mild, no-fail "spindelhjälte"-gunga)
där barnet lär sig släppa pendeln i rätt stund för ett bra båg-kast. De ≥2 utfalls-ändrande
kontrollerna är släpp-timing + nät-längd (som ändrar både period och räckvidd). No-fail är
genomtänkt: moln bär tillbaka till *senast* nådda fäste (aldrig bakåt), `_ensureAmplitude`
garanterar alltid ett framåt-svep, idle ger auto-släpp och upprepade missar ger ett garanterat
sikt-kast. Zacke är den namngivna hjälten och Elvira den som räddas/jublar (P0); kattungen är ett
djur. Rädda-kattungen-ramen ger en orsak att bry sig.

## 3. Vad gör det lättjefullt / tunt

Mekaniskt rikt, men flera tunna kanter:

- **Släpp-timingen är svår att se.** Hela himlen är en tryck-yta, men det finns ingen visuell
  ledtråd om *när* det är bra att släppa (ingen båg-markör, ingen "släpp nu!"-zon som lyser i
  framåt-svinget). Ett barn trycker slumpvis och låter auto-hjälpen lösa det.
- **Auto-hjälpen tar lätt över.** Vid 8 s idle auto-släpps han i bästa stund, och `_aimAt` ger ett
  *garanterat* kast rakt till nästa fäste. Eftersom moln-räddningen + ensureAmplitude alltid håller
  honom igång kan hela banan klaras genom att vänta — agensen är ömtålig.
- **Zacke är stel i flykten.** Han roterar bara (`rotation += 0.04`) — ingen superhjälte-pose, inga
  utsträckta armar, ingen "fart-streck"-känsla. I svinget lutar han linjärt (`theta*0.5`). Charmig
  figur, men kroppsspråket lever inte.
- **Kattungen och Elvira är passiv dekor till slutet.** 🐱 `breathe`:ar och Elvira står still tills
  målet nås. De reagerar inte när Zacke närmar sig (ingen "nästan framme!"-spänning), bara vid
  finalen (`pop`/`wiggle`).
- **Fästena ser likadana ut.** Alla mellan-fästen är identiska knopp+🕸️; ingen känsla av att
  *närma sig* målet (t.ex. att taken blir högre/finare mot kattungen). Svårt att se "hur långt
  kvar".
- **Nät-längd-effekten är abstrakt.** Kort/Lång ändrar period + räckvidd, men för ett barn är det
  svårt att koppla knappen till "varför nådde jag längre nu" — ingen förklarande visuell skillnad
  utöver trådlängden.
- **Ljudet är generiskt UI.** `whoosh`/`reveal`/`pop`/`flip`/`soft`/`correct`/`celebrate` + TTS
  ("Bra svingat!", "Hoppsan! Molnet fångar dig.", "Du räddade kattungen!"). Inget "thwip"-nätskott,
  inget vind-sus i flykten, ingen jamande katt.

Kort sagt: **en gedigen swing-motor med osynlig timing och en stel hjälte** — och hela banan kan
glida förbi på auto-hjälp utan att barnet känt att det styrde.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Synligt släpp-fönster.** Lys upp en "släpp nu!"-zon (en glödande båge-sektor eller en
  pulsande ⭐ vid Zacke) när han är i det goda framåt-svinget — gör timingen till ett *läsbart*
  val. Behåll auto-släpp, men först efter att barnet fått chansen.
- **[Medium] Belöna bra släpp.** Ett släpp i den bästa zonen ger ett tydligt längre, högre kast +
  extra gnista + "Wii!" — så skillnaden mot ett slumpsläpp känns, och auto-hjälpen skjuts upp när
  barnet lyckas.
- **[Deep] Längd-valet förklarat visuellt.** Vid Kort/Lång: visa kort en spök-båge som visar den
  nya räckvidden, så barnet ser att långt nät når längre — koppla knapp → utfall.

### Variation & överraskning
- **[Quick] Stigande tak / närmare mål.** Låt taken bli högre/finare och fästena gnistra mer ju
  närmare kattungen man kommer — en synlig "snart framme".
- **[Quick] Saker att nudda i flykten:** en fågel, en ballong, ett moln-stjärn som ger pip när
  båg-kastet passerar — gör flykten till en liten skörd.

### Juice
- **[Quick] Superhjälte-pose i flykten.** Sträck ut armarna och böj kroppen i kast-riktningen
  (rotera mot `atan2(vy,vx)`) + fart-streck bakom honom — flykten ska kännas som ett "swoosh".
- **[Quick] Nät-"thwip" + vind-sus.** Ett klistrigt nätskott vid varje fäste och ett sus vars
  tonhöjd följer fart i flykten; en mjuk "boing" när pendeln vänder.
- **[Quick] Kattungen jamar och hoppar** när Zacke närmar sig sista fästet (inte bara vid finalen).

### Progression
- **[Medium] Räddnings-räknare med ansikte.** `svingar` finns redan — visa de räddade kattungarna
  i en liten rad/galleri som växer, så det blir något att samla.
- **[Quick] Elvira reagerar längs vägen** (vinkar ivrigare ju närmare han kommer) i stället för
  bara vid målet.

### Karaktär & berättelse
- **[Deep] Mini-berättelse per nivå.** Kort intro ("kattungen sitter fast på taket!") + Elvira som
  springer fram och kramar Zacke vid räddningen — en spelspecifik vinst-scen i stället för generisk
  konfetti.
- **[Quick] Bobo eller folk i fönstren** som hejar när Zacke svingar förbi (levande stad).

### Ljud
- **[Quick] Riktiga SFX från [[real-audio-sfx]]:** nät-thwip, vind-sus, jamande katt, mjuk
  moln-"pluff" — ersätt syntetblippen; ersätt TTS-fraserna med förgenererade klipp.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan, ersätter gammal bygg-spec). Testat headless
  (errorCount 0), skärmdump läst (visade moln-räddning + mål-tak med 🐱/Elvira). Inga kodändringar.
- Rekommenderad första-omgång: **[Medium] synligt släpp-fönster + belöning för bra timing +
  [Quick] superhjälte-pose & nät-thwip** — gör timing-kontrollen läsbar och flykten saftig, så
  agensen inte drunknar i auto-hjälp.
- 2026-07-01 🔧 **Mönster #1 (auto-hjälp) mjukad [Medium]:** idle-auto-släppet (garanterat
  sikt-kast) skjutet 8→11 s så barnet hinner släppa själv länge först. Ett väl TAJMAT eget släpp
  (högt i framåt-bågen, θ≈0.45–1.05) belönas nu med extra gnistor + "Wii!" så skicklighet känns
  tydligt bättre än auto/slump. Moln-räddning + garanterat kast kvar som no-fail-backstop.
  Städning: oanvänd `ctx`-param bort ur `_buildLevel`. errorCount 0.
- 2026-08-04: **P0 ASSETS.** Nätfästena (var 🕸️), kattungen på taket (var 🐱) och startmolnet
  (var ☁️) ritas nu som riktiga föremål med egen silhuett — nätet med åtta ekrar och två
  spiralringar, kattungen med öron, svans, nos, morrhår och kinder. errorCount 0.
