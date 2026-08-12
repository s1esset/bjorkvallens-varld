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
- ✅ 2026-08-09 **[Quick] Tema-variation per nivå.** Ett dygn går mellan räddningarna —
  `dag → morgon → skymning → kväll → natt`, sedan om (`STAMNINGAR`, `nivå % 5`). Husens kropp
  mörknar medan fönstren tänds (två separata tints; en enda hade släckt fönstren i samma
  andetag som väggen mörknade). Nivå 0 är oförändrad. Se §5.
- ✅ 2026-08-09 **[Deep] En värld bredare än rutan.** 920-klämman borta, kameran följer Zacke
  genom upp till 3400 px stad. Se §5.
- ✅ 2026-08-09 **[Quick] Stigande tak / närmare mål.** Stadsdelen blir tätare och mer påkostad
  åt höger (fler upplysta fönster → balkongräcken → spira på taket), och fästena glöder starkare
  ju närmare kattungen de sitter. **Höjden rörs medvetet INTE:** `ROOF_Y` är fångstgolv och
  kattungen sitter på `ROOF_Y − 46`, så högre hus mot målet hade lagt takåsen över både
  fångstlinjen och hennes fötter. Se §5.
- ✅ 2026-08-09 **[Quick] Saker att nudda i flykten.** Fågel, ballong och stjärna hänger mellan
  fästena och ger ett pling ur en pentatonisk stege. Se §5.

### Juice
- ✅ 2026-08-09 **[Quick] Superhjälte-pose i flykten.** Kroppen ritas om till flygpose vid släpp
  (armarna rakt fram förbi huvudet, benen ihop bakåt) och vrids mot `atan2(vy,vx) + π/2`, med
  fart-streck vars längd följer farten. Se §5.
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

- 2026-08-10 🎨 **D1 (repo-brett svep): platt yta fick ljus** (`00f3c1b`, v1.113.0).
  `_plattprobe --medbakgrund` mätte **185 601 px = 20 % av skärmen** i EN ton.
  Stadens alla husväggar delade exakt samma brun, så kvarteret läste som en vägg av block.
  Husen ritas med alpha — fjärranbandet tonas mot himlen med genomskinlighet i stället för en
  egen palett — så `verticalFillAlpha` krävdes: toningen bär både ljuset OCH alfan, och
  fjärrandiset är bevisat orört. Per-form-normaliseringen ger varje hus sitt eget ljus ur en
  enda delad gradientinstans.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **185 601 → 20 329 px** (20 % → 2,2 %).

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
- 2026-08-09 ✅ **[Quick] Tema-variation per nivå** (Variation & överraskning). Spelet är en
  slinga — rädda en kattunge, rädda en till — och utan något som förändras mellan varven blir
  den femte räddningen identisk med den första. Nu går ett DYGN: `dag → morgon → skymning →
  kväll → natt`, och sedan börjar det om (`STAMNINGAR`, index `nivå % 5`). Nivå 0 är
  fortfarande `sky`/dag, alltså exakt den bild spelet hade förut. Byggt på `createScene`s
  befintliga `tid`-tonning plus `night`-temat — ingen ny scenkod.
  **Husen tintas i två delar**, och det är poängen: en enda tint över hela huset hade släckt
  fönstren i samma andetag som den mörknade väggen, och ett mörkt hus med mörka fönster läser
  som en kuliss. Kroppen går mot blått (`0xffffff → 0x6f77ad`) medan fönstren går åt andra
  hållet och tänds (`0xfff6d0 → 0xffd95c`). Fjärranbandet mörknas extra på natten, annars ser
  de bortre husen närmare ut än de främre och djupet vänder.
  Nytt i `lib/kamera.js`: **`byteScen()`** — scenens band ÄR kamerans understa lager och ligger
  i `_layers`, så ett spel som byter stämning kan inte bara rita om scenen. `adopt()` lägger
  numera in dem med `addChildAt` (kontraktet sa redan "understa"; det råkade stämma bara så
  länge adopt var första anropet).
  **Mätt** (`_varldprobe.mjs`, nu 11/11): stämningarna cyklar
  `sky/dag · sky/morgon · sunset/skymning · sky/kvall · night/dag · sky/dag`, och över sex
  nivåbyten står lagerantalet still på **14** (inget läckage). `_svingprobe.mjs` fortsatt 7/7.
- 2026-08-09 ✅ **[Quick] Stigande tak + [Quick] saker att nudda i flykten** — Variation &
  överraskning är därmed helt avbockad.
  **Snart framme, på två nivåer.** Stadsdelen blir finare åt höger (`narhet = x / bredd`):
  fler upplysta fönster vid 0,34 och 0,52, balkongräcke vid 0,62, spira med kula vid 0,78.
  Eftersom kattungen alltid sitter längst till höger i banan och världen klipps strax bakom
  henne betyder "längre åt höger" alltid "närmare målet", på varje nivå. HÖJDEN rörs inte:
  `ROOF_Y` (520) är fångstgolvet och kattungen sitter på `ROOF_Y − 46`, så högre hus mot målet
  hade lagt takåsen ÖVER både fångstlinjen och hennes fötter — hon hade svävat framför en gavel
  och Zacke flugit rakt genom ett tak innan molnet hann fånga honom. Stadens gradient är statisk
  (den är en *plats*); det per-nivå-rörliga signalen bär i stället **fästenas glöd**, som växer
  med `i / (count − 1)`. Glöden är additiv (`lib/glod.js`) och skalas med stämningen — dagen får
  en antydan, natten den riktiga glöden, enligt A4:s tvåvillkorsregel.
  **Skörden i flykten.** Fågel, ballong och stjärna (alla ritade, P0 ASSETS) i varannan lucka,
  med `liv()` som vilorörelse. Nudd → pling ur en **pentatonisk** stege (vilken delmängd som
  helst låter bra ihop, så en skörd på två är lika musikalisk som en på fem), gnista, och saken
  far uppåt och tonar bort. Aldrig ett krav, ingen räknare som kan sjunka.
  **Sonden hittade en riktig brist.** Första placeringen satte dem i ett höjdband på känsla
  (y 246–330) — `_varldprobe.mjs` visade att **1 av 2 passerade saker aldrig plockades**.
  Flykten stiger bara ~22 px med kort nät (vt ≈ 5,8 px/bildruta, varav 3,9 uppåt mot G 0,35),
  så toppen ligger runt y 302 och en sak på y 250 hänger 50 px ovanför allt barnet kan nå.
  Nu simuleras BÅDA nätlängdernas banor med samma integrator som spök-bågen, och saken hamnar
  mitt emellan deras närmaste punkter — inom nudd-radien för både kort och långt nät, av
  konstruktion. Efter fixen: **2 av 2 passerade plockade.**
  `_varldprobe.mjs` nu 13/13, inklusive att `liv()`-tweenarna (repeat:-1, dör aldrig själva)
  slutar TICKA efter exit — 0 av 5 rörde sig 0,6 s efteråt. `_svingprobe.mjs` fortsatt 7/7.
- 2026-08-09 ✅ **[Quick] Superhjälte-pose i flykten** (Juice). Zacke snurrade förut bara
  (`rotation += 0.04`), vilket läser som att han tappat kontrollen — en hjälte STYR sin flykt.
  Nu: kroppen ritas om till en **flygpose** vid släpp (båda armarna rakt fram förbi huvudet,
  benen ihop och bakåt, strömlinjeformad silhuett) och tillbaka till hängande pose vid fäste,
  molnräddning och nivåstart. Ritas om vid POSESKIFTE, inte per bildruta — ett Graphics-anrop
  per släpp, inte 60 i sekunden.
  **Vinkeln är härledd, inte inpetad.** Figuren är ritad stående, så hans lokala "upp" är
  (0, −1); ska det sammanfalla med farten (cos a, sin a) krävs rotationen `a + π/2`
  (`sin(a+π/2) = cos a` och `−cos(a+π/2) = sin a`). Målvinkeln kläms till [0,42; 1,85] rad —
  utan taket dyker han mot 135° i slutet av bågen och läser som att han störtar — och följs
  mjukt, så han glider in i posen från svingets `theta · 0.5` i stället för att snäppa.
  **Fart-strecken bor i Zackes egna koordinater**, bakom kroppen. Det är hela tricket: när
  kroppen vrids mot färdriktningen följer strecken med gratis och pekar alltid rakt bakåt,
  utan en enda vinkelberäkning. Längd och alpha skalar med farten, så ett välträffat släpp
  syns som ett kraftigare swoosh — juicen belönar samma sak som mekaniken.
  **Mätt:** ny bild mitt i flykten via `_varldprobe.mjs --shot-flykt`
  (`.test-shots/_flykt-spindel-zacke-svingar.png`) — testsvitens skärmdump fångar aldrig
  flyktposen. `_svingprobe.mjs` 7/7, `_varldprobe.mjs` 13/13.
  **En falsk röd flagga:** körningen visade `saknat-ljudklipp` för `djur_katt` (som FINNS på
  disk) vid t=381 ms. Växelvis mätt: 0 av 3 med ändringen, 0 av 3 utan — en tajmingflake där
  `sample()` hinner före avkodningen, inte något den här omgången orsakade.

- 2026-08-12 (natt VI, **N5 · LYFTPLAN B3**): **STRUKEN som `rep.js`-kandidat — med mätning.**
  Raden listade spelet som "handrullad pendel" och alltså en dubblett att porta. Premissen
  håller inte, och det är mätt i det levande spelet (`scripts/_pendelprobe.mjs`, 5/5):
  - **Nätet är SPÄNT varje bildruta: 0,0000 px slack över 433 sving-rutor.** Zacke hänger per
    konstruktion på exakt `_L` från fästet (`z.x = anchor.x + L·sin θ`), så den räta linjen
    **är** den korrekta formen för en otöjbar tråd. Ett verlet-rep löser slack — här finns
    ingen. Det skulle kosta en full omritning per bildruta och ge en identisk bild.
  - **Ingen tråd utanför svinget** (0 av 27 rutor i flykt/moln) — det finns inget fritt
    piskande skede att fysikalisera heller.
  - **Längden är SPELMEKANIK i sluten form, inte en ritad kurva.** Nät-längd-knappen lovar
    "långt nät = långsammare", och det är analytiskt: perioden gick **2,50 → 3,05 s = 1,22×**
    mot 2π√(L/G):s **1,24×**. Samma `_L` bär spök-bågen (`_svingprobe` rad 1–3).
  - **No-fail-garantin räknas ur `G/L`.** `_ensureAmplitude` sätter ett GOLV på framåt-
    amplituden (AMP 1,10 rad; uppmätt max θ **1,10–1,11**). Med en kedja punkter finns ingen
    längd att sätta in i den formeln — garantin skulle behöva mätas fram i stället för att
    gälla, och det är hela spelets "faller aldrig".
  **Kvar som en riktig [Quick]-idé, men det är ett NYTT moment, inte en portning:** nätet
  fäster i dag ögonblickligen vid `_attach`. Ett nät som skjuts ut mot fästet under flykten
  (som `spindelnatet`s tråd, v1.183.0) vore synlig juice — men det bygger ett skede som inte
  finns, i stället för att byta lösare under ett som finns.
