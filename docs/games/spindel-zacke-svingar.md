# Spindel-Zacke Svingar (`spindel-zacke-svingar`)
> ⚙️ fysik · tap · 3–5 år · status: ✅ marknadskvalitet

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
- ✅ 2026-08-07 **[Deep] Längd-valet förklarat visuellt.** Vid Kort/Lång: visa kort en spök-båge som visar den
  nya räckvidden, så barnet ser att långt nät når längre — koppla knapp → utfall.

### Variation & överraskning
- **[Quick] Stigande tak / närmare mål.** Låt taken bli högre/finare och fästena gnistra mer ju
  närmare kattungen man kommer — en synlig "snart framme".
- **[Quick] Saker att nudda i flykten:** en fågel, en ballong, ett moln-stjärn som ger pip när
  båg-kastet passerar — gör flykten till en liten skörd.

### Juice
- **[Quick] Superhjälte-pose i flykten.** Sträck ut armarna och böj kroppen i kast-riktningen
  (rotera mot `atan2(vy,vx)`) + fart-streck bakom honom — flykten ska kännas som ett "swoosh".
- 🔶 2026-08-07 **[Quick] Nät-"thwip" + vind-sus.** Ett klistrigt nätskott vid varje fäste och ett sus vars
  tonhöjd följer fart i flykten; en mjuk "boing" när pendeln vänder. *(thwip klart; vind-sus/boing kvar)*
- ✅ 2026-08-07 **[Quick] Kattungen jamar och hoppar** när Zacke närmar sig sista fästet (inte bara vid finalen).

### Progression
- **[Medium] Räddnings-räknare med ansikte.** `svingar` finns redan — visa de räddade kattungarna
  i en liten rad/galleri som växer, så det blir något att samla.
- **[Quick] Elvira reagerar längs vägen** (vinkar ivrigare ju närmare han kommer) i stället för
  bara vid målet.

### Karaktär & berättelse
- ✅ 2026-08-07 **[Deep] Mini-berättelse per nivå.** Kort intro ("kattungen sitter fast på taket!") + Elvira som
  springer fram och kramar Zacke vid räddningen — en spelspecifik vinst-scen i stället för generisk
  konfetti.
- **[Quick] Bobo eller folk i fönstren** som hejar när Zacke svingar förbi (levande stad).

### Ljud
- 🔶 2026-08-07 **[Quick] Riktiga SFX från [[real-audio-sfx]]:** nät-thwip, vind-sus, jamande katt, mjuk
  moln-"pluff" — ersätt syntetblippen; ersätt TTS-fraserna med förgenererade klipp.
  *(thwip + jamande katt + alla repliker som riktiga klipp klart; vind-sus/moln-pluff kvar)*

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
- 2026-08-07 ✅ **Spök-båge + mini-berättelse (spelets sista 🔧-punkter).** 📏-tryck ritar nu en
  prickad spökbana ur SAMMA integrator som flykten (G/L/AMP, dt=1 — förhandsvisningen kan inte
  ljuga) med landnings-ring; sonden mäter Lång maxX 781 vs Kort 676 (+105 px). Nivå-intro:
  "Kattungen sitter fast på taket!" + jam vid mount, "En kattunge till behöver hjälp!" efter varje
  klarad nivå. Egen vinstscen i stället för generisk konfetti: Zacke landar på taket, Elvira
  springer fram i skutt och kramar (❤️ + match), kattungen jamar och hoppar upp i famnen —
  SEDAN delat firande (complete() sist så spelets replik inte klipps). Dessutom: thwip.mp3 vid
  nätfäste, jam vid näst sista fästet, P0-fix tryck-under-flykt → ljud, gsap.delayedCall →
  ctx.later, och en gammal synlig bugg: Elvira "höll i en käpp" — arc() efter fill() utan moveTo
  strokade en implicit linje från origo (samma i Zackes leende). Kattljudets kallstart vaktas
  med pop-fallback. Ny sond `scripts/_svingprobe.mjs` (spelar med riktiga mustryck i
  släpp-fönstret): 7/7 gröna, exit mitt i kramscenen 0 fel. Status → ✅.
- 2026-08-09 ✅ **Spår E runda A4.4 — kamerans första kund (LYFTPLAN C6).** Banan var
  hårdklämd till 920 px av `Math.min(cfg.gap, 920 / (count - 1))`, och eftersom antalet
  fästen växte med nivån blev varje hopp **kortare** ju längre barnet kom (nivå 1: 3 fästen
  à 300 px · nivå 6: 6 à 184). Hela stan syntes dessutom från första svinget, vilket är
  precis §3:s kritik "svårt att se hur långt kvar". Nu: gapet är konstant 300 px — det
  avstånd nivå 1–3 redan bevisat att pendeln klarar — och **nivån lägger till fästen** i
  stället för att trycka ihop dem (3 → 4 → 6 → 8 → 10). Världen är upp till 3400 px och
  kameran följer Zacke genom den.
  Lageruppställning: `createScene('sky', { kamera: { bredd } })` → parallaxband · en
  fjärran stadssiluett på `DJUP.fjarran` · spelplanet på faktor 1 · **ett eget fx-lager i
  världen** (`ctx.fxLayer` är skärmrymd — en gnista vid ett fäste 2000 px in hade dykt upp
  2000 px in på skärmen) · HUD och tryckyta på faktor 0. `kam.moveTo()` vid varje nivåstart,
  eftersom Zacke teleporterar dit från förra målet och kamerans hårda ruta annars rycker
  bilden med. Nytt i `lib/kamera.js`: `setWorld()` — lagren ritas för den bredaste världen
  EN gång, och världsbredden per nivå klämmer bara panoreringen.
  **Mätt** med nya `scripts/_varldprobe.mjs`: nivå 0 = 3 fästen / 1280 px värld (kameran står
  still, exakt som förut) · nivå 8 = 10 fästen / 3320 px, sista fästet på x 2900. Kameran
  1045 px medan fjärranbandet rör sig 188 px (kvot 0,18 = precis lagerfaktorn) och HUD:en
  0 px. Zacke utanför bilden i 0 av 130 prover. `_svingprobe.mjs` fortsatt 7/7 grön, alltså
  spelar spelet likadant som förut på de låga nivåerna.
