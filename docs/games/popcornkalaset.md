# Popcornkalaset (`popcornkalaset`)

> ⚙️ fysik · drag · 3–5 år · ✅
> Status: ✅ byggt v1.263.0 (2026-09-25) · **styrningen omgjord till EN gest v1.264.0 (2026-09-26)**
> · kärnloopen spelad i två hela omgångar med riktiga musdrag (`_popcornspel`) · hällningen mätt
> (`_popcornhall` + `_grytprobe`) · nybörjargreppen mätta (`_popcornnaiv`) · omritningen (`_popcornomrit`)

Ursprung: idélistan 2026-09-25 (`docs/idelista-fysikspel.html`, `docs/IDEER.md` post 6).

## 0. Spec (fylls i av `/spel` innan kod skrivs)

**Ägarens beslut 2026-09-25**, ordagrant: *"ålder 3-5, dra och luta grytan & hälla i själv (hellre
manuella rörelser som baseras på fysik än enkla tryck för att undvika automatiserade händelser),
spisratten skulle kunna fungera som en slider eller att man klickar på ett plus och ett minus med
10 steg, ja brända kan vara kul att ha med, slumpa fram dem samt deras position ifrån en pool av ca
10 djur eller människor vi redan har / kan bygga på. Vi vill att pop ljudet ska vara i ett litet
kort pop så vi inte svämmar över med ljud"*.

| | |
|---|---|
| **id** | `popcornkalaset` |
| **titleSv** | Popcornkalaset |
| **icon** | 🍿 (bara menyikonen — i spelet ritas varje popcorn fristående, P0 ASSETS) |
| **band** | småbarn [3–5] → flik Fysik |
| **kategori** | `fysik` → flik Fysik |
| **input** | `drag` (grytan, majspåsen, värmereglaget) + tap på reglagets − / + |
| **ålder** | [3, 5] |
| **kärnloop** | Greppa majspåsen och luta den → kornen rinner ner i grytan · dra värmereglaget → plattan glöder, fräset växer · kornen blir varma, skakar, POPPAR (slumpad tröskel per korn) → popcornen sväller, trycker upp locket, väller över · greppa grytan, bär den till en skål och LUTA den → popcornen rinner ut av egen tyngd · gästen vid skålen äter |
| **mål** | tre fulla skålar (en sensor per skål räknar popcorn som LIGGER i den, ~12 st) → `progress.complete()` |
| **agens** | VAR barnet greppar grytan avgör hur den hänger och vart den häller (se §4 B1) · värmen avgör takten OCH risken (lågt = lugnt, högt = kaskad + brända) · locket på eller av (av = popcorn flyger ut vid hårda smällar) · vilken skål som fylls först |
| **variation** | slumpad smälltröskel per korn (ordning + takt aldrig lika) · slumpad form per popcorn · sällsynt jättepopcorn · hårda smällar skjuter iväg popcorn · "farmorskorn" som aldrig poppar · **tre gäster slumpade ur en pool på ~10, på slumpade platser** (§4 B6) |
| **motgång** (tak: EN i taget) | brända popcorn vid hög värme (bruna, en liten rökpuff — **aldrig en brandvarnare**, P0) · locket far av och popcorn regnar · spill på golvet (hunden/katten äter det) |
| **hjälp** | **ingen automatik** (ägarens beslut): ingenting häller eller tippar åt barnet. Bara P0-påminnelsen: efter ~6 s stillhet visar en genomskinlig spökhand GESTEN (greppa kanten, luta) + rösten |
| **tap-reserv** (P0) | **ägaren 2026-09-25:** tryck på grytan och sedan på en skål → grytan FLYTTAS dit, men häller aldrig. Hällningen sker bara genom att barnet lutar grytan med ett drag. Ingen tipp-stöt vid tryck |
| **mottagare** | tre gäster i soffan, slumpade ur poolen: `hungrig` medan de väntar, tittar på grytan, `jubel` när deras skål fylls, mumsar (`tugg_knaprig`) |
| **finish** | taklampan dimmas, tv:ns blå sken (utanför bild) lyser upp gästernas ansikten, alla mumsar, ett sista popcorn poppar ur en skål och landar i någons hår |

**Röstrepliker** (`voice.say`-literaler, läggs i `scripts/voice-phrases.json` när spelet skrivs)
```
"Häll majskornen i grytan!"            intro
"Dra i reglaget så blir spisen varm!"  när kornen ligger i grytan
"Lyssna … nu poppar det!"              första poppen
"Luta grytan över skålen!"             när grytan är full
"Mums, vad gott!"                      en skål full (UTROP — hoppas över om rösten talar)
"Oj, locket flög!"                     locket far av (UTROP)
"Nu börjar filmen!"                    finish, FÖRE complete()
"Greppa grytan och luta den!"          om-cue vid ~6 s stillhet
```

## 1. Nuläge (sett som spelare)

Ett varmt kök och vardagsrum en filmkväll. Barnet tar majspåsen (var som helst på den), bär den
till glasgrytan och trycker den nedåt — påsen lutar och kornen rinner i. Vrider upp värmen med
knoppen eller − / + (plattan glöder, fräset växer), ser kornen darra och höra dem smälla —
slumpat, aldrig i samma ordning, ibland ett jättepopcorn — tar grytan, bär den till en skål och
trycker den nedåt så att den häller. **EN gest för båda kärlen** (sedan 2026-09-26): ta tag var
som helst → kärlet bärs upprätt; över målet vilar det på en osynlig hylla i hällhöjd; tryck vidare
nedåt → det lutar så mycket som fingret trycker; upp → det rätar sig; släpp → det hänger kvar
över målet (en påse som hällt går hem och fylls på). Tre gäster ur en pool
på sex (Bobo, Bobos kusin, katten, ankan, valpen, ett knytt) sitter i soffan på slumpade platser,
tittar på grytan, jublar när deras skål blir full och mumsar. Tre fulla skålar → filmkväll:
lampan dimmas, tv:n lyser, ett sista popcorn flyger i någons hår, och en ny omgång börjar.
Motgång: hög värme bränner (tak ⅓, brända räknas ändå), locket far av vid hårda smällar,
spill blir liggande en stund och försvinner. Tap-reserven flyttar grytan/påsen, häller aldrig.

**Filer:** `index.js` (flöde, input, värme, popp, mål) · `karl.js` (grytan och påsen som fysiska
kärl, punktgreppet) · `konst.js` (all ritning) · `gaster.js` (gästfasaden, B6a) · `matt.js`
(layouten — delad med sonderna) · `fysik.js` (skålarna).
**Sonder:** `_popcornhall` (EN gest: alla grepp × tre skålar × ett drag / parkerad / otålig +
kontrollarmar som INTE får hälla, node, hela rummet; `FORE=…` sveper hällpunkten) ·
`_popcornhallspar <skål> <sida> [park] --bild` (en hällning i text och sex rutor) · `_popcornnaiv`
(nybörjargreppen i webbläsaren: P1–P5 påsen, G1–G7 grytan, `--bild`) · `_popcornspar` (en otålig
vippning bildruta för bildruta i webbläsaren) · `_grytprobe` (den gamla expertgesten, node, sedan
2026-09-26 i hela rummet, `--bild` · `--matris` · `--svep`) · `_popcornomrit`
(B0) · `_popcornspel` (kärnloopen med riktiga musdrag, `--omgangar 2` · `--otalig` · `--spar`) ·
`_popcornkonst` / `_popcorngaster` (förhandsbilder av konsten och gästerna) · `_poppprobe` ·
`_poppdemo`. ⚠️ Harnessens auto-drag träffar aldrig påsen eller grytan (`drag/ratt` = 0) —
`npm run test` mäter bara att spelet monterar; kärnloopen mäts av `_popcornspel`.

## 2. Ursprunglig plan & tankeprocess

Ägaren bad om spel med fysik och slump som "inte är likadant varje gång". Popcorn har slumpen
INBYGGD: ingen vet vilket korn som smäller härnäst, och en kaskad kan aldrig spelas upp två gånger
lika. Spelet använder bara motorer som redan finns och är mätta — `Varmefalt` (värme per korn),
`Mjukkropp` (poppen), matter (grytan, locket, popcornen i skålen), `partiklar.js` — och blev därför
först ut av de tio idéerna. Ägaren styrde det mot MANUELL fysik: barnet ska luta och hälla själv,
aldrig trycka på en knapp som gör det.

## 3. Risker (det som kan fälla bygget — mät innan du bygger på dem)

1. **Hällningen för en 3-åring är den stora designrisken.** Ett finger, ingen rotationsgest (P0),
   och ändå ska lutningen vara barnets egen och fysisk. Förslaget i B1 måste prototypas och
   MÄTAS (andel i skålen mot spill) innan resten byggs ovanpå.
2. **FYND (mätt): en för snabb popp förstör kroppen FÖR GOTT.** `Mjukkropp.skala()` från korn till
   popcorn på ≤ 8 fasta steg vänder ringen ut och in (fyllnad 0,03–0,08, noll NaN, noll konsolfel).
   Recept som håller över 10–16 punkter × överskjut 1–1,3: **18 steg från ×0,25** eller **10–12
   steg från ×0,35**. `node scripts/_poppprobe.mjs`.
3. **Omritningen är OMÄTT.** Simuleringen kostar ~3,5 µs per kropp och bildruta (gratis). Att rita
   om varje mjukt popcorn varje bildruta kostar okänt — mäts först (B0).
4. **Grytan i rörelse = statiska/drivna kroppar i rörelse.** Driv med fart i `phys.beforeStep()`,
   aldrig `setPosition(…, true)` som lämnas kvar (fartfällan, CLAUDE.md). `fanga-frukten`
   teleporterar sina korgkanter — kopiera INTE det för en gryta full av popcorn som skakas.
5. **Harnessen når bara x ≤ 950 och y < 600.** Grytan, reglaget och minst en skål ska ligga där,
   annars krävs en sond som spelar kärnloopen. `drag/ratt` (= släpp på RÄTT mål) i
   `.test-logs/popcornkalaset.json` säger om testet någonsin hällt i en skål.
6. ~~P0 kräver tap-tap-reserv för drag hos småbarn — ägaren vill undvika automatik.~~ **Löst
   2026-09-25 (ägaren):** tryck på grytan → tryck på en skål = grytan FLYTTAS dit, häller aldrig.
   Förslagets andra halva (en tipp-stöt vid tryck på grytans sida) valdes INTE — bygg den inte.

## 4. Förbättringar & förhöjningar (plan)

Byggordning. Varje steg har ett MÄTT klart-villkor; en grön harness räcker aldrig ensam.

**Layout (förslag):** köksbänk med spis till vänster (grytan på plattan runt x 300–450, y ~380),
lågt soffbord i mitten med tre skålar (x 600–950, y ~470, inom harnessens räckvidd), soffan till
höger med gästerna framifrån. Tv:n står UTANFÖR bild; dess sken syns bara i finishen.
Värmereglaget på spisens front (y ~520). Majspåsen på bänken bredvid spisen.

### Kärnloop
- **[Deep] B0 · Mät omritningen — ✅ MÄTT 2026-09-25 (`_popcornomrit`):** vid CPU ×4 kostar ett
  mjukt popcorn 0,5–0,85 ms per bildruta (8 st +3,9 ms, 16 st +10,2 ms, 24 st +20,6 ms av 16,7;
  barlastarmen 4 ms flyttade mätaren 3,7). `MAX_SAMTIDIGA_POPP = 8`. Mjukkroppen har 16 punkter
  (7 lober behöver ≥ 2 punkter var). Ursprunglig text: Webbläsarsond: N mjuka popcorn som poppar i samma bildruta
  (N = 1, 4, 8, 16) med barlast som kontrollarm (bildrutemått klipps av vsync — CLAUDE.md).
  Svaret sätter taket `MAX_SAMTIDIGA_POPP`; kornen över taket väntar några bildrutor på sin tur
  (osynligt — kaskaden är ändå slumpad).
- **[Deep] B1 · Grytan och hällningen — ✅ BYGGD OCH MÄTT 2026-09-25 (`_grytprobe`, grön).**
  ⚠️ **Styrningen omgjord 2026-09-26 (ägarens rapport, se §5): EN gest.** Allt nedan om
  "greppa bygeln / släpp / greppa SIDAN" är historik — nu bärs kärlet upprätt var man än tar, och
  ett tryck nedåt över målet lutar det. Vippningens fysik (pipen som vridpunkt, sänkningen,
  hällpunkten före mitten, halt kärl med utfall) står kvar och är mätt igen i `_popcornhall`.
  ⚠️ **Premissen föll** och posten är omskriven till det som byggdes. Det ursprungliga förslaget
  ("greppa kanten → grytan hänger från greppet → den motsatta kanten sjunker → det rinner ut")
  mättes och höll inte i tre led:
  ⓵ en FRI pendel ur ett sidogrepp når bara 55–60°, och med raka väggar lutar innerväggen då
  fortfarande UPPÅT mot kanten — popcornen blev liggande i fickan (38 % i skålen);
  ⓶ greppar barnet kanten medan grytan står på spisen häller den LÄNGS VÄGEN, inte i skålen;
  ⓷ en hink som hänger fritt i bygeln lutar atan(a/g) mot varje acceleration, och matters g är
  bara 0,278 px/steg² — ett fingerryck tömde grytan på golvet (10 % kvar vid 500 px/s).
  Dessutom: **matter `Constraint` går inte att använda som grepp.** Den räknar vridningen utan
  r²-termen i den effektiva massan och skjuter över när greppet sitter utanför tröghetsradien
  (här r²·m/I = 3,0) — grytan snurrade 166 000° utan ett konsolfel. `karl.js` har ett eget
  punktgrepp (`drivPunkt`) som löser 2×2-systemet med rätt effektiv massa.
  **Det som byggdes** (`karl.js`, `Karl` — samma klass för grytan och påsen):
  · greppa **bygeln** → grytan bärs vågrät (en handled håller emot); innehållet får grytans
    fartändring (`barAndel` 0,85, som `saftbarens` `_carryAll`) så det inte skvimpar ut
  · **släpp** över en skål → den osynliga handen håller grytan vågrät ovanför skålen (samma läge
    som tap-reserven ger); släpp någon annanstans → grytan glider hem till plattan
  · greppa **sidan på en grytan som hänger över en skål** → den VIPPAR runt pipen: lutningen =
    fingrets lodräta drag / 90 px per radian, tak 120° (över det vänder mynningen nedåt och
    strålen blir 170 px bred), pipen sänks upp till 140 px mot skålen och står 60 px FÖRE
    skålens mitt (vid ~105° vänder mynningen sig åt sidan och popcornen trillar ut med fart bort
    från pipen). Ett kort drag häller lite, ett långt tömmer — lutningen är barnets.
  · greppa sidan på en grytan på SPISEN → den hänger från greppet och spiller längs vägen
    (motgång: hunden äter spillet)
  · grytan är hal (oljad metall, friktion 0,12) med 15° utåtlutade väggar: hällvinkeln är
    90° − utfall + friktionsvinkeln, och med raka väggar och friktion 0,5 började det rinna
    först vid ~117°.
  **Mätt (`node scripts/_grytprobe.mjs`, `--bild` ritar en hällning i sex rutor):** bygelgrepp
  häller 0 % · parkeringen spiller 0 % · av det som hälls landar 86 % i skålen (sämst 64 %) · ett
  långt drag häller 71 % av en skålfull i skålen · ett kort drag 0 % · bygelbärning i 500 /
  1000 / 1800 px/s spiller ≤ 5 %. Skålen är byggd med bottnen IN UNDER väggarnas fötter
  (`fysik.js`) — kant mot kant lämnade en glipa i vart hörn som popcornen rann igenom.
  **Tap-reserven (P0, ägarens val):** tryck på grytan (den lyfts en aning och glöder = vald) →
  tryck på en skål → grytan glider dit och stannar VÅGRÄT ovanför skålen. Den häller aldrig
  själv; barnet greppar sedan kanten. Förflyttningen drivs med fart i `beforeStep` (inte
  teleport), så popcornen i grytan följer med och kan skvimpa lite. Ett tryck någon annanstans
  släpper valet. `DragController` har redan ett tap-tap-läge — pröva om det räcker innan du
  skriver ett eget.
- **[Medium] B2 · Majspåsen.** Samma gest som grytan (greppa, luta, kornen rinner ut) — barnet lär
  sig EN rörelse och använder den två gånger. Kornen är små matter-cirklar (r ~5) som faller i
  grytan. 30–40 korn per omgång; påsen fylls på mellan omgångarna.
- **[Medium] B3 · Värme per korn och poppen.** `Varmefalt`: plattan är en källa med `styrka` =
  reglagets steg; varje korn en namngiven sak. **`temp`** driver bilden (kornet darrar mer ju
  varmare, ånga), **`grad`** (sjunker aldrig) mot en slumpad tröskel per korn avgör smällen.
  Poppen: kornets stela bild försvinner i en puff (`partiklar.js`) och en `Mjukkropp` föds på
  ×0,35 och växer till 1 på 10–12 fasta steg (recept ur `_poppprobe`), med en uppåtriktad
  impuls ur slumpen. Mjuk BARA under poppen (`pruttbad`-regeln) — sedan en stel matter-kropp
  (2–3 överlappande cirklar = bulig silhuett) med en färdigritad bild. Stega med en ackumulator
  på exakt `dtF = 1` (mjukkropp-regeln). Sällsynt jättepopcorn (~1 av 40) · 1–2 farmorskorn.
- **[Medium] B4 · Värmereglaget — 10 steg.** Ett vågrätt reglage på spisens front med 10 hack
  (prickar som går blått → orange → rött) och en greppknopp som snäpper till närmaste hack, PLUS
  stora − och + i ändarna (≥ 96 px, ett tryck = ett hack). Båda vägarna — ägaren nämnde båda, och
  − / + är dessutom reglagets tap-reserv. Steget styr: plattans glöd, fräsets volym, `Varmefalt`s
  styrka. Lågt = få, lugna popp; högt = kaskad och risk för bränt.
- **[Medium] B5 · Locket.** En egen dynamisk kropp. Popcornens volym lyfter det av sig själv;
  barnet kan dra av det och lägga på det. Utan lock flyger popcorn ut vid hårda smällar.
- **[Medium] B8 · Skålarna och målet.** Tre skålar med en sensor var som räknar popcorn som
  LIGGER STILLA i skålen (inte sådana som studsar förbi). En full skål: gästen jublar, skålen
  glittrar kort. Tre fulla → finish.

### Variation
- **[Medium] B6 · Gästerna — tre ur en pool på ~10, på slumpade platser.** Varje omgång dras tre
  gäster och tre platser (soffans tre sitsar, armstödet, en golvkudde). Poolen och varje figurs
  ursprung: se tabellen nedan. Varje gäst behöver: sittande pose, `hungrig` (tittar på grytan),
  `jubel`, mums-rörelse. Den som sitter närmast en skål äger den.
- **[Quick] B7 · Slumpade händelser** (tak: EN i taget, var ~15–20 s, först efter första skålen):
  katten hoppar upp på bänken och vill smaka · hunden under bordet fångar spill i luften · ett
  jättepopcorn · ett popcorn som smäller så hårt att det landar i en gästs hår.

### Motgång
- **[Medium] B9 · Brända popcorn.** Popcorn som ligger kvar i grytan på steg ≥ 8 fortsätter att
  gradas: guldbrun → brun → mörk, och en liten rökpuff. Tak: högst ~⅓ av en omgång kan bli mörk.
  Brända räknas ändå i skålen (P0: inget misslyckande) och en gäst ÄLSKAR dem ("knaprigt!").
  Sänkt värme stoppar brynandet direkt — barnet lär sig själv att hög värme går fort men bränner.
  **Aldrig en brandvarnare** — P0 ALDRIG summer.

### Ljud
- **[Quick] B10 · Poppljudet — KLART 2026-09-25.** Syntetiserat (`scripts/gen-popp.mjs`, seedat,
  egen licens): sex varianter `popp_1…6`, **75 ms** var, grundton 390–880 Hz, RMS −24 dB (tystare än
  `plopp` −21,6, högre än `tap` −28,5), topp −4…−8 dB. `audio.sample('popp')` slumpar variant av
  sig själv. Det gamla `pop.mp3` är ett bubbelplopp på 1,05 s — och dessutom en SERIE om flera
  plopp, inte ett — rör det inte, det används av andra spel. **Ägaren 2026-09-25: "poppen låter
  bra"** — godkänd.
- **[Quick] B11 · INGEN ljudspärr — varje popp hörs.** Ägaren lyssnade på båda demona
  2026-09-25: *"utan spärr lät bäst, poppen låter bra"*. Tätheten begränsas ändå av antalet korn
  (30–40 per omgång, varje korn poppar en gång), precis som i demon: 38 popp, som tätast 24 på
  en sekund. ⚠️ **Spela med `audio.sample('popp')`, INTE `audio.sfx('popp')`.** `sfx()` har ett
  anti-loop-golv på 30 ms per namn, och i den godkända demon låg **17 av 37 mellanrum under
  30 ms** — `sfx()` hade tystat nästan hälften av poppen och låtit som något ägaren inte valde.
  `sample()` har inget golv. Facit att lyssna mot: `node scripts/_poppdemo.mjs` (standard nu
  utan spärr; `--gap 80` ger den förkastade varianten). **Håll koll på toppen:** överlappande
  popp summerar till −1,7 dBFS i demon (med `masterVolume` 0,8 ≈ −3,6 dB). Fräset och rösten
  ovanpå äter marginalen — lyssna efter klipp i den tätaste sekunden när B12 är på plats.
- **[Quick] B12 · Övriga ljud.** Fräset: `audio.loop()` med brusbädd, volym = reglagets steg
  (rampas, tystas av `GameHost`). Locket som skramlar: en kort stämd ton, inget klipp. Gästerna
  mumsar med `tugg_knaprig`; djurgäster får sitt `djur_*`-läte vid jubel. Kornen som rinner ner i
  grytan: `physics.impactAudio` med ett mjukt golv.

### Finish
- **[Medium] B13 · Filmkvällen.** Lampan dimmas (en mörk overlay med ett mjukt hål runt soffan),
  tv:ns blå sken fladdrar över ansiktena, alla mumsar i otakt, ett sista popcorn poppar ur en skål.
  Spelets egen rad FÖRE `complete()` ("Nu börjar filmen!"), vänta in rösten (`ctx.narTyst`).

### Sonder som hör till spelet
`_poppprobe` (finns: popp-recepten) · `_poppdemo` (finns: lyssna på spärren) · `_grytprobe`
(ny, B1: andel i skålen per grepp) · omritningssonden (ny, B0) · `npm run test popcornkalaset`
+ skärmdumpen + `drag/ratt` i loggen · spela TVÅ omgångar och tryck så fort spelet tillåter
(återspelssäkerhet, CLAUDE.md).

### Gästpoolen (B6)

Inventerad 2026-09-25 över `src/lib/` och alla 86 spel (varje rad verifierad mot koden). Tre gäster
dras per omgång, och tre av fem platser: soffans **tre sitsar**, **armstödet** och en **golvkudde**
framför soffan. Stående figurer fungerar sittande: soffans sitsfront döljer underkroppen.

| # | Gäst | Källa | Arbete | Liv som redan finns |
|---|---|---|---|---|
| 1 | Bobo | `makeKaraktar()` · `lib/karaktarer.js:419` | inget | andas, blinkar, `setMood` (7), `react('jubel'\|'nam'…)`, `look()` |
| 2 | Bobos kusin (ny färg per omgång) | `makeKaraktar({ palett })` — inget spel använder `palett` än | inget | som Bobo |
| 3 | Katten | `makeKompis('katt')` · `titt-ut-pappa/kompisar.js:495` (exporterad) | import | `reagera` · `jubla` · `liv` |
| 4 | Ankan | `makeKompis('anka')` · samma fil | import | som katten |
| 5 | Valpen (ritad SITTANDE) | `makeVerktyg('hund')` · `vakna-pappa/verktyg.js:1341` (exporterad) | import | ja |
| 6 | Ett knytt — **ett nytt varje gång** | `byggKnytt(dnaFromSeed(seed))` · `unika-knytt/knytt.js:1726` | import + `tick()` varje bildruta | `setLage` glad/lekfull/sömnig · `hoppa` · `sjung` |
| 7 | Elvira | `makeKid('elvira')` + `drawKidFace` · `bajs-och-kiss/index.js:1612` (ej exporterad) | bryts ut | fyra miner: glad · wow · jubel · fniss |
| 8 | Zacke | `makeKid('zacke')` · samma | bryts ut | som Elvira |
| 9 | Lova (appens enda SITTANDE person) | `_buildLova()` · `gungan/index.js:320` (metod) | bryts ut | håret rör sig |
| 10 | Grisen / kaninen (påklädda) | `_makeAnimal(a)` + `OWNERS` · `zackes-biltvatt/index.js:1046` (metod utan `this`) | bryts ut | statisk → `feedback.liv()` |
| — | reserver | Alissa (`golvet-ar-lava/index.js:281`), sittande katt (`bajs-och-kiss/index.js:1392`), kon/hunden ur `OWNERS` | bryts ut | — |

**Två steg:** **B6a** — gäst 1–6 är redan exporterade (`mata-munnen` importerar på samma sätt från
`hamburgerbygget` och `pizzabageriet`), så spelet kan starta med sex gäster utan att röra ett
annat spel. **B6b** — gäst 7–10 bryts ut till `lib/figurer.js`, och originalspelet importerar
därifrån: en commit per spel, `npm run test <id>` + skärmdump före och efter (samma bild).
Alla ritade människor heter Zacke, Alissa, Elvira eller Lova (`theme.js` CHARACTERS).
Varje gäst behöver en gemensam fasad i spelet (`gast.hungrig()` · `gast.jubla()` · `gast.mumsa()`
· `gast.titta(x, y)`) — figurerna har olika API:er, spelet ska inte veta vilken det har fått.
**Soffan finns redan:** `ritaSoffa(R, it)` · `grodan-slurp/djur.js:1068` (framifrån, golv y 528) —
utgångspunkt, anpassas till spelets rum. `makeKompis('nalle')` är ikonen 🧸 och är INTE med
(P0 ASSETS). Poolen får växa: varje ny gäst är en rad här och en fasad.

## 5. Status / loggar

- 2026-09-26 · **v1.264.0 — styrningen omgjord till EN gest (`/fixa`).** Ägaren: *"popcornpåsen är
  jättesvår att styra / hälla popcorn från, grytan är likadan, otroligt svårstyrda och buggar /
  fastnar, spiller, vägrar luta ibland"*. `_popcornspel` var grön hela tiden — den spelar
  expertvägen (bär i bygeln → släpp → vänta → greppa SIDAN → dra lodrätt). `_popcornnaiv` provade
  vad en nybörjare gör: **5 av 10 grepp misslyckades**, två katastrofalt. Orsakerna, var för sig:
  ⓵ bygeln + nedåt på en parkerad gryta pressade ned den i skålen och krossade ut 29 av 30 popcorn
  (G3) — ingenting hindrade kärlet att drivas genom skålen; ⓶ ett grepp i sidan direkt efter
  släppet (grytan gled fortfarande) sköt pipen 160 px i sidled med full fart, grytan vred sig
  moturs av ryckningen och doppade hörnet i köksbänken — lutningen fastnade på 27° och 26 av 30
  hamnade på spisen, och ibland skrapade den förbi (= "vägrar luta ibland", G4, `_popcornspar`);
  ⓷ att luta medan man bär gick inte alls (0–17°, P1/G2), inte heller i sidled (P3); ⓸ ett tryck
  mitt på en påse över grytan tog GRYTANS bygel bakom den (P4 — fanns redan före); ⓹ ett grepp i
  kroppen på spisen hängde fritt och spillde.
  **Nu:** `karl.js` har en regel — bär upprätt, vila på en hylla över målet (`fysik.js`
  `grytHylla`/`paseHylla`, kärlet går aldrig att pressa igenom), tryck nedåt = luta. Pipen glider
  till hällpunkten i takt med fingrets målvinkel och SÄNKS före vridningen (följde den den
  faktiska vinkeln blev grytan en katapult: popcornen kastades upp vid −20° och landade 290 px
  bort). Kärlet tippar först när det står stilla över målet (farten från bärningen slog annars
  grytans kant i högerväggen vid skål 2). Handen ärver kärlets fart vid varje grepp. Sidan barnet
  håller i sänks där målet tillåter det (skål 0 och 2 bara höger: vänster spillde på bänken
  respektive slog i väggen). `vippaFore` 60 → 70 (svept 60…130 i båda sonderna), påsens
  `vippaPx` 80 → 60 (den trycks först ned TILL hyllan). Kärlet fingret faktiskt RÖR vinner
  träffen (`avstand`), och en påse som hällt går hem (den täckte grytans bygel).
  **Mätt:** `_popcornhall` alla villkor gröna — 19 hällningar (alla grepp × tre skålar × ett drag /
  parkerad / otålig) 75 % i målskålen, 6 % spill; kontrollarmarna (håll still, bär in underifrån,
  bär i 480–1800 px/s, tryck nedåt över bänken) 0 % ut; påsen 91–94 %. `_grytprobe` (gamla gesten,
  nu i hela rummet) 98 % av det hällda i skålen. `_popcornnaiv` i webbläsaren: G3 1 → 23 i skålen,
  G4 3 → 25, G2 0 → 18, P4 0 → 29 korn i grytan, P3 17 spillda → 0, kontrollarmarna P5/G5
  oförändrade (32 / 25–28). `_popcornspel --omgangar 2` två hela omgångar, 0 konsolfel.
  **Prövat och förkastat (mätt):** mjuk vridning med fart- och accelerationstak (medel 71 % mot
  79 %) · lutningen spärrad tills pipen hunnit fram (fastnade på 59° resp. 101°).
  **Kvar (inte gjort, bara noterat):** i `--otalig` släpper sonden påsen efter 0,9 s och bara
  ~9 korn hinner rinna — barnet bär den igen (samma gest). Spökhanden visar nu hela gesten (dit +
  nedåt). Mellan bänken (x 520) och bordet (x 596) finns ett glapp där det sista som droppar
  från pipen över skål 0 kan falla på golvet — en layoutfråga, inte styrning.

- 2026-09-25 · idén i idélistan; premissen prövad mot koden; `_poppprobe` (popp-fyndet) · `f46ae31`
- 2026-09-25 · spec beslutad av ägaren; poppljudet syntetiserat (`popp_1…6`, `gen-popp.mjs`) och
  ljudspärren demonstrerad (`_poppdemo`); gästpoolen inventerad; plan skriven · `a121aaa`
- 2026-09-25 · ägaren efter lyssning: poppen godkänd, INGEN spärr (spela med `sample`, inte
  `sfx` — 30 ms-golvet hade tystat 17 av 37 popp); tap-reserven vald (flytta, aldrig hälla)
- 2026-09-25 kväll · **BYGGT v1.263.0 (✅).** B0 · B1 · B2 · B3 · B4 · B5 · B6a · B8 · B9 · B10 · B11 ·
  B12 (fräset som slinga, stämda grepp-/reglagetoner, `impactAudio`) · B13. Premissen i B1 föll och är
  omskriven (se §4). Fynd på vägen: matter `Constraint` går inte att använda som grepp (skjuter
  över utanför tröghetsradien) · en buren påse är en murbräcka (knuffade ner grytan — kärlen
  kolliderar inte med varandra) · ett statiskt lock på kroken skrapade av kornen ur påsen (lock på
  kroken kolliderar med ingenting) · en påse som vippats 149° hann hem före sin uppresning, föll på
  sidan och fylldes på liggande · regeln "fyll under 3 korn" lät en påse med 4 kvar stå över grytan
  för alltid · spill som blir liggande måste städas, annars når påfyllningens tak. Kritik: "klar
  att committa", inga P0-brott; åtgärdat: gästen som jublar kliver fram framför grytan.
  **Kvar i planen:** B6b (Elvira/Zacke/Lova/grisen ur andra spel till `lib/figurer.js`) · B7
  (slumpade händelser — hunden som äter spillet i stället för puffen, katten på bänken) · locket
  som skramlar med en egen ton (B12). Golvkudden ströks ur `PLATSER` (skymde skål 0).
