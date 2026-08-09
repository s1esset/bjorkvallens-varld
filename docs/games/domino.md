# Domino (`domino`)
> ⚙️ fysik · mixed · 2–5 år · status: ✅ marknadsklar (2026-08-07)

## 1. Nuläge (sett som spelare)

En rad domino-brickor står på marken och leder från vänster fram till en **ritad klocka** på en
stolpe längst till höger, där **Bobo** väntar. Hela raden är en **regnbågsgradient** — varje
plats i kedjan har sin egen färg, mjukt övergående från röd till lila (varannan nivå åt andra
hållet). I raden finns **luckor**: bleka spök-brickor **i den färg som söks**, med ett mättat
färgklick ovanför. Uppe ligger ett brickfack med reserv-brickor i just de färgerna, i blandad
ordning. **Färgen bestämmer vart brickan ska** — jag DRAR brickan till luckan med samma färg
(förlåtande snäpp inom 135px; rätt lucka lyser upp och de andra bleknar redan under draget, och
den "klickar till" när jag är inom snäpp-radien).

Släpper jag vid FEL lucka glider brickan snällt hem igen med ett vänligt tvåtonsljud, rätt
lucka pulserar och gnistrar — ingen summer, inget rött kryss. När sista luckan är fylld spelar
hela regnbågen en liten fanfar (gnistvåg vänster→höger med stigande pentatonisk skala). Sedan
TRYCKER jag på den första brickan (gul startglöd, stor träffyta): kedjan ramlar bricka för
bricka åt höger och varje bricka spelar sin ton i skalan — raset blir en melodi.

Vid en TOM lucka stannar raset där ("Lägg en bricka till!") — inget misslyckande; lägger jag i
brickan fortsätter raset av sig självt. Når raset ända fram **svingar och ringer klockan**,
Bobo hoppar av glädje → firande + stjärna + klistermärke + ny, längre bana (fler brickor/luckor,
bredare gluggar från nivå 5). Tryck utanför start ger bara en mjuk gnista. Idle ~6s → **färg-
ledtråd** (brickan vinkar, dess lucka pulserar, gnist-spår pekar dit); idle igen → auto-fyllning,
och om vägen redan är hel puttar spelet åt dig.

**Funkar bra:** bygg-sedan-vält-loopen är begriplig och tillfredsställande, färgmatchningen ger
ett riktigt val utan att kunna läsa, drag-snäppet är förlåtande, stall-vid-lucka är en smart
no-fail-mekanik, klock-svinget + Bobo är en fin målbelöning, exit-säkert.

*(Skärmdump: ängsscen, regnbågsrad av brickor med bleka färgade spök-luckor, gul startglöd på
första brickan, lösa brickor uppe vid molnen, ritad klocka på stolpe och Bobo till höger.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet vill ge två handlingar med mening: **bygg** (dra brickor i luckor) + **utlös**
(putta första brickan), med klockan som tydligt mål. Stall-vid-tom-lucka var designgreppet för
att göra det no-fail *och* lärorikt ("åh, det fattades en bricka där") utan game-over. Den mjuka
auto-hjälpen garanterar att även en passiv lekare når klockan. SPACING (80px) är satt så en
fallande bricka når nästa vid ~35°.

## 3. Vad gör det lättjefullt / tunt

Loopen är bra, men "fysiken" är delvis fasad och världen är tunn:

> **Ögonblicksbild 2026-06-30.** Första och andra punkten nedan är ÅTGÄRDADE sedan 2026-07-01 —
> kedjan är äkta fysik i dag (se §1 och §4). Kritiken står kvar som historik, inte som nuläge.

- **Kedjan är skriptad, inte en riktig kettingreaktion.** `_cascadeFrom` puttar VARJE bricka
  med `Body.setAngularVelocity(PUSH_AV)` på en fast timer (`CASCADE_STEP` 0.12s) — oavsett om
  den föregående brickan faktiskt slog i den. Brickorna välter alltså i takt med en klocka, inte
  för att de knuffar varandra. För ett domino-spel är det själva *poängen* (en bricka fäller
  nästa) som fattas; det syns om man tittar noga (en glipa stoppar inte raset rent fysiskt).
- **Auto-hjälpen kan spela hela banan.** Idle fyller luckor OCH puttar första brickan — väntar
  man bara når klockan ändå.
- **Brickorna är generiska.** Färgade staplar med två vita prickar; ingen koppling till tema
  eller berättelse, inga objekt längs vägen som reagerar (klossar, en kula, en gunga).
- **Klockan är den enda karaktären.** Ingen som väntar vid klockan, ingen publik längs banan.
  Scenen är tom äng med sol/moln.
- **Ljudet stiger inte med raset.** Varje träff är ett strypt `tap`; ett riktigt dominoras vill
  ha ett accelererande "klick-klick-klickklickklick"-crescendo. Klockan får `pling`/`celebrate`.
- **Belöningen är delvis generisk.** Klock-svinget är spel-specifikt (bra!), men sen är det
  standard `bigCelebration` som alla spel.

Kort sagt: *en fin pyssel-loop med en fejkad rasfysik*, generiska brickor och en folktom bana.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ~~**[Deep] Gör raset till en riktig kedjereaktion.**~~ ✅ 2026-08-07 (verifierad i kod, gjord
  redan 2026-07-01). Bara första brickan puttas; `_stepCascade` bevakar kedjan i tickern, tom
  lucka stoppar raset naturligt och `FALL_GUARANTEE` ger en mjuk knuff åt en bricka som stannat
  i en vinkel — `index.js:794-834`, konstanterna på `:35-36`. Punkten stod kvar som öppen i den
  här planen i fem veckor efter att den byggts (§5 loggade den, §4 ströks aldrig); det var enda
  skälet till att spelet fortfarande bar 🔧.
- **[Medium] Bygg-val.** Låt barnet välja VAR vissa brickor ska stå (fler luckor, eller en
  förgrening där brickan kan styra raset mot klockan vs en rolig bonus-leksak). Ger mer agens.

### Variation & överraskning
- **[Quick] ~~Objekt längs banan.~~** ✅ flagga som flaxar när raset passerar.
- **[Quick] Temabrickor.** Brickor som ser ut som djur/klossar/tårtbitar, så raset blir en
  rolig parad, inte sju färgade staplar. *(Delvis löst: regnbågsgradienten ger raden identitet
  och en regel — men brickorna är fortfarande brickor.)*
- **[Medium] Fler objekt att slå omkull** (en kula som rullar iväg, en gunga, en klosshög) —
  bara flaggan finns i dag.

### Juice
- **[Quick] Accelererande ras-ljud.** Låt klick-ljudet stiga i tonhöjd/tempo medan kedjan
  rullar (ett crescendo) i stället för enstaka strypta `tap`. Liten skärm-mikroskak när
  klockan ringer.
- **[Quick] Damm & studs.** Liten dammpuff där varje bricka slår i golvet; sista brickan
  träffar klock-snöret med en extra gnista.

### Progression
- **[Quick] Banan känns längre/rikare** visuellt (en slingrande väg, en liten kulle) i stället
  för en spikrak rad — så nivåhöjningen syns.

### Karaktär & berättelse
- **[Deep] ~~Någon vid klockan.~~** ✅ Bobo väntar under klockan, andas i vila och hoppar två
  gånger av glädje när klockan ringer. *Kvar:* låt honom heja MEDAN raset rullar mot honom
  (t.ex. titta åt vänster / studsa i takt med brickorna).

### Ljud
- **[Quick] Riktiga SFX** (trä-klick, klock-pling) via SFX-pipelinen ([[real-audio-sfx]]);
  variera vinst-stinget.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan). Spelet testat (errorCount 0, skärmdump sedd).
  Nyligen fixat (drag-snäpp, stall-vid-lucka) — bygg-loopen är solid; rasfysiken är dock fasad.
- Rekommenderad första-omgång: **[Deep] riktig kedjereaktion** (gör fysiken ärlig) +
  **[Quick] accelererande ras-ljud + objekt längs banan** för show och själ.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). (1) **Äkta kedjereaktion** — det
  skriptade tim-raset (`_cascadeFrom` med fast `CASCADE_STEP`) borta; nu puttas BARA första
  brickan och matter-fysiken fäller resten. Kedjan bevakas i tickern (`_stepCascade`): när
  brickan efter fronten passerat `STAND_ANGLE` räknas den in, tom lucka framför stoppar raset
  naturligt (ingen kropp att träffa → samma no-fail), och en mjuk knuff-garanti (`FALL_GUARANTEE`)
  puttar en bricka som råkat stanna i en vinkel/glipa. (2) **Accelererande ras-ljud** — varje
  fallen bricka ger en `audio.tone` som stiger i tonhöjd med rasets längd (klick-klick-klickklick
  crescendo) i stället för strypta `tap`; kollisions-SFX-spammet (`_onCollision`) borttaget. Liten
  skärm-mikroskak (`shake`) när klockan ringer + dammpuff vid varje bricka som slår i marken.
  (3) **Objekt längs banan** — en liten flagga mitt på vägen som flaxar (`wiggle`) när raset
  passerar den. Exit-säkert: flagg-tweens dödas före destroy, alla nya callbacks `_alive`-vaktade.
- 2026-07-25: **Buggfix + färgregel + fristående objekt** (check grön, `npm run test domino`
  errorCount 0, riktade drag-tester körda).
  1. **GRUNDORSAK till att inget snäppte:** slot-objekten skapades utan `y`-fält
     (`{ x, index, isGap, filled, tile, ghost }`), så `_nearestGap(x, y)` räknade
     `Math.hypot(x - s.x, y - undefined)` → **NaN**, och `NaN < bestD` är alltid falskt →
     funktionen returnerade **alltid `null`**. Därför gled varje bricka tillbaka till facket
     trots `SNAP_R = 135`, och spök-markeringen under draget tändes aldrig (samma anrop).
     **Fix:** slots får `y: TILE_Y` vid skapandet, och all avståndsmätning går via en enda
     hjälpare `dist(view, slot)` så samma miss inte kan uppstå igen.
  2. **Färgen bestämmer placeringen.** Varje plats i kedjan får sin färg ur en regnbågs-
     gradient (`lerpColor` mellan 7 hållpunkter röd→lila) plus ett ±8 % ljus/mörk-sicksack så
     att två grannar alltid går att skilja åt. Fackbrickorna bär sin målfärg och ligger
     blandade; luckans spöke visar **den sökta färgen** (blek fyllning + mättat färgklick
     ovanför) → lösbart utan läsning eller minne. Fel lucka = mjuk hemglidning + vänligt
     tvåtonsljud + rätt lucka pulsar/gnistrar (aldrig en summer). Idle ger först en färg-
     ledtråd, sedan auto-fyllning. Regnbågen vänder håll varannan nivå (variation).
  3. **P0 fristående objekt:** 🔔-emojin (Text) ersatt av en **ritad mässingsklocka** (ögla,
     kupa, rand, kläpp, ljusreflex) som svingar i sin ögla; ⬇️-floatTexten borta till förmån
     för färgad `ripple` + gnistor; brickorna har fått volym (ljusstrimma, mörk fot) och
     fackbrickorna guppar mjukt i vila.
  4. **Ljud:** raset spelar en **stämd pentatonisk skala** (varje plats har sin ton) i stället
     för en linjär frekvensrampa; full regnbåge ger en gnistvåg + fanfar; klockan får en ren
     treklang ovanpå `pling`/`celebrate`.
- **Nya röstrepliker** (ska läggas i `scripts/voice-phrases.json` + genereras med `npm run voice`):
  `Lägg varje bricka i luckan med samma färg!` · `Och vidare!` · `Lägg en bricka till!` ·
  `Putta den första brickan!` · `Titta, en hel regnbåge!` ·
  `Nästan! Leta efter luckan med samma färg.` · `Den luckan har en annan färg — prova igen!` ·
  `Titta på färgen — där ska brickan stå!` · `Vilken lucka har samma färg som brickan?`
  (Alla repliker bor i `SAY`/ord-listor högst upp i `index.js`.)
- 2026-08-04: **Scen och mottagare.** (1) Banan låg tidigare i en tom himmel med en grön remsa;
  nu finns kullar, tre träd, ett staket i fjärran och grässtrån — banan har en plats.
  (2) Bobo var bara ett svävande huvud, dessutom halvt utanför högerkanten (x=1222); han har
  nu ritad kropp med fötter och utsträckta armar och står intill klockstället och väntar på
  att raset ska nå fram. errorCount 0.
- 2026-08-07: **Doc-avstämning mot koden (ingen kodändring).** Planens enda [Deep]-punkt
  ("riktig kedjereaktion") byggdes 2026-07-01 och loggades i §5 — men ströks aldrig i §4, så
  spelet bar 🔧 i fem veckor på en punkt som var klar. Verifierat: `_stepCascade` +
  `FALL_GUARANTEE` i `index.js:794-834`, konstanter `:35-36`; bara första brickan puttas.
  **Kvalitet 🔧 → ✅.** Kvar i §4: bara [Quick]/[Medium].
- 2026-08-09 ✅ **Karaktärsrigg [Medium]** (v1.71.0): Bobo är en RIGG (`lib/karaktarer.js`), inte en stillbild — kroppen under honom var handritad men hade exakt riggens proportioner vid r 40 (skugga 2,35·r, fötter 2,15·r, bål 1,35·r) — rakt byte utan flyttat origo. Spelets 52 px hopp vid raset behålls (större än riggens `jubel` 20 px), riggen bidrar med `setMood('stolt')`. Yttre containern är spelets (läge, hopp, träffyta), riggen äger sin egen skala.
