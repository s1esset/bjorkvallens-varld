# Domino (`domino`)
> ⚙️ fysik · mixed · 2–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En rad färgglada domino-brickor står på marken och leder från vänster fram till en **klocka**
🔔 på en stolpe längst till höger. I raden finns **luckor** (genomskinliga spök-brickor med
nedåtpil). Uppe ligger ett brickfack med reserv-brickor som jag DRAR (eller tap-tap) ner i
luckorna — förlåtande snäpp inom 135px — för att bygga vägen HEL. Sedan TRYCKER jag på den
första brickan (gul startglöd, stor träffyta): kedjan ramlar bricka för bricka åt höger.

Vid en TOM lucka stannar raset där ("Lägg en bricka till!", ⬇️) — inget misslyckande; lägger
jag i brickan fortsätter raset av sig självt. Når raset ända fram **svingar och ringer
klockan** → firande + stjärna + klistermärke + ny, längre bana (fler brickor/luckor, bredare
gluggar från nivå 5). Tryck utanför start ger bara en mjuk gnista. Idle ~6s → mjuk auto-hjälp:
en reserv-bricka flyger ner i nästa lucka, och om vägen redan är hel puttar spelet åt dig.

**Funkar bra:** bygg-sedan-vält-loopen är begriplig och tillfredsställande, drag-snäppet är
förlåtande, stall-vid-lucka är en smart no-fail-mekanik, klock-svinget är en fin målbelöning,
exit-säkert.

*(Skärmdump: ängsscen, rad av färgbrickor med en spök-lucka i mitten, gul startglöd på första
brickan, en lös bricka uppe vid molnen, klocka på stolpe till höger.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet vill ge två handlingar med mening: **bygg** (dra brickor i luckor) + **utlös**
(putta första brickan), med klockan som tydligt mål. Stall-vid-tom-lucka var designgreppet för
att göra det no-fail *och* lärorikt ("åh, det fattades en bricka där") utan game-over. Den mjuka
auto-hjälpen garanterar att även en passiv lekare når klockan. SPACING (80px) är satt så en
fallande bricka når nästa vid ~35°.

## 3. Vad gör det lättjefullt / tunt

Loopen är bra, men "fysiken" är delvis fasad och världen är tunn:

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
- **[Deep] Gör raset till en riktig kedjereaktion.** Putta bara FÖRSTA brickan; låt
  matter-kollisionen fälla nästa (brickorna är redan fysik-kroppar). Vid en tom lucka stannar
  raset *naturligt* (ingen efterföljande kropp att träffa) — samma no-fail, men nu äkta, och
  barnet ser att en bricka fäller en bricka. (Behåll en mjuk "knuff-garanti" om en bricka råkar
  stanna i en vinkel.)
- **[Medium] Bygg-val.** Låt barnet välja VAR vissa brickor ska stå (fler luckor, eller en
  förgrening där brickan kan styra raset mot klockan vs en rolig bonus-leksak). Ger mer agens.

### Variation & överraskning
- **[Quick] Objekt längs banan.** Strö in en kula som rullar, en liten gunga eller en flagga
  som brickorna slår igång — varje ras blir en liten Rube-Goldberg-show.
- **[Quick] Temabrickor.** Brickor som ser ut som djur/klossar/tårtbitar, så raset blir en
  rolig parad, inte sju färgade staplar.

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
- **[Deep] Någon vid klockan.** Maskoten Bobo (eller ett djur) väntar vid klockan, hejar medan
  raset rullar mot den och hoppar av glädje när den ringer — egen finish i stället för
  generisk konfetti.

### Ljud
- **[Quick] Riktiga SFX** (trä-klick, klock-pling) via SFX-pipelinen ([[real-audio-sfx]]);
  variera vinst-stinget.

## 5. Status / loggar

- 2026-06-30: Doc skriven (granskning + plan). Spelet testat (errorCount 0, skärmdump sedd).
  Nyligen fixat (drag-snäpp, stall-vid-lucka) — bygg-loopen är solid; rasfysiken är dock fasad.
- Rekommenderad första-omgång: **[Deep] riktig kedjereaktion** (gör fysiken ärlig) +
  **[Quick] accelererande ras-ljud + objekt längs banan** för show och själ.
