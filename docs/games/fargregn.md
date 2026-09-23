# Färgregn (`fargregn`)
> 🔤 larande · tap · 2–5 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

En ljus himmelsscen med sol och drivande moln; nedtill en grön markremsa med blå
pölar. Glansiga, tårformade droppar regnar mjukt nedåt med lätt sidledspendling.
Uppe i mitten sitter en cremeskylt med en stor droppe i **målfärgen** (kantfärgen
matchar), och under den en rad tomma prickar = rundans mål. Rösten säger "Tryck på
de röda dropparna!". Jag trycker en droppe → ring på vattenytan + plask/gnistor +
ljud (<100ms). Rätt färg → 'pling', droppen krymper bort, en prick tänds. Fel färg
→ glad vingel + mjukt 'soft', aldrig fel. Ibland faller en **regnbågsdroppe** som
räknas oavsett och sprutar alla färger. Droppar jag missar landar i pölen med ett
litet plask och försvinner. När alla prickar är tända: mjuk skak + firande + stjärna
+ klistermärke, och en ny, lite svårare runda med ny målfärg startar.

**Funkar bra:** dropparna är riktigt vackra (gloss, svans, spekulärprick), målet är
**både talat OCH visuellt** (skylten är en klar förbättring jämfört med klambubblors
osynliga färgmål), no-fail är intakt, idle-recue lyfter en målfärg-droppe, och allt
är exit-säkert. Skylten kan tryckas för att repetera instruktionen.

*(Skärmdump: röda/gula/rosa droppar faller mot pölar; målskylt med röd droppe + 4 prickar.)*

## 2. Ursprunglig plan & tankeprocess

Tänkt (kodkommentar) som det första **färg**-spelet i Lära-fliken: orsak-verkan-tryck
(som klambubblor) men med ett **pedagogiskt lager** — barnet ska koppla det talade
svenska färgordet ("röda", "blåa") till en synlig färg, utan att någonsin straffas.
Regnet ger naturlig rörelse (lätt sikte = mer levande än stillastående mål), målskylten
gör färgordet begripligt även utan ljud, och regnbågsdroppen + växande palett (3→6
färger) ger variation och "en till!"-känsla. NO-FAIL hela vägen; missade droppar
plaskar glatt i pölen istället för att kännas som ett tapp ("inget slut").

## 3. Vad gör det lättjefullt / tunt

- **Lärandet är ren färg-matchning, inte färg-ord.** Målfärgen visas *alltid* som en
  droppe på skylten, så barnet kan lösa hela spelet genom att para skyltens droppe mot
  fallande droppar — utan att någonsin knyta an till ordet "röd". Det talade färgordet
  är dekoration ovanpå en matchningsuppgift, inte något som tränas eller testas.
- **Ingen progression i *vilka* färger som lärs.** Paletten växer i antal (`_levelFor`),
  men det finns ingen fokus/mastery: ingen "idag lär vi oss blå", ingen repetition av en
  svår färg, ingen diskriminering mellan lika nyanser. Svårighet = fler/snabbare droppar,
  aldrig *finare* färgskillnader.
- **Målet ges bort visuellt + ≥50% av dropparna är målfärg** (`Math.random() < 0.5` →
  target). Det blir nästan omöjligt att inte träffa rätt; agensen ("välj rätt färg") är
  tunn när rätt svar regnar tätt.
- **Färgordet förstärks aldrig som text/bild.** Ingen stor färgklick + ord, ingen
  "samla regnbågen"-tavla — samlade droppar blir bara tända prickar och försvinner.
- **Ljudet är tunt och helt syntetiskt.** 'pop'/'pling'/'soft'/'match' — inget riktigt
  regn-plask, inget mjukt "plopp" när en droppe träffar pölen (pölplasket i `_update` är
  *bara* `ripple`+`puff`, helt tyst). Ingen stigande ton vid flera rätt, ingen ambient.
- **Generisk belöning + ingen karaktär.** Himlen är tom; ingen figur/maskot som samlar
  färgerna eller reagerar. Firandet är samma konfetti som överallt.

Kort sagt: *snyggt och korrekt färg-matchning*, men det **lär inte färgord** djupare än
"para ihop med skylten", och regnet är rekvisita utan en värld omkring.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ ~~**[Medium] Lär ut färg-*ordet*, inte bara matchningen.**~~ Redan byggd (ord-runda var 3:e
  runda, droppformen avslöjas efter ~6 s tvekan, `_wordRound` :257; se §5 2026-07-02) —
  uppdagat 2026-09-23.
- ✅ ~~**[Quick] Behåll lätt men gör valet till ett val.**~~ Klar 2026-09-23 (v1.251.0): målfärgens
  droppar pulserar ~1,5 s när de föds (`_spawnDrop`, i konstbarnet — träffytan står still).
  Inte i en ord-runda förrän formen avslöjats, så ordet bär fortfarande ledtråden där.

### Variation & överraskning
- **[Quick] Fler dropptyper:** en "tvilling"-droppe (poppar i två färgstänk), en stor
  "skvätt"-droppe med extra-fett plask, en långsam glittrande droppe. Rotera per nivå.
- ✅ ~~**[Medium] "Blanda färger"-bonus.**~~ Redan byggd (`MIXES` :33, `_rippleNearestPuddle`
  :623; se §5 2026-08-06) — uppdagat 2026-09-23.

### Juice
- ✅ ~~**[Quick] Stigande kombo-ton + vått plopp.**~~ Redan byggd (`COMBO_LADDER` :40, `_plop`
  :614) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Pölplask med ljud + ringar.**~~ Redan byggd (plopp + krusning :579 + pölen
  studsar) — uppdagat 2026-09-23.

### Progression
- **[Medium] Färg-fokus per runda.** Annonsera en "dagens färg" som återkommer extra ofta
  ett par rundor (mastery), och introducera nya färger en i taget med namnet ("Det här är
  lila!") första gången färgen dyker upp i paletten.
- ✅ ~~**[Quick] Samla regnbågen.**~~ Redan byggd (färgtavlan `_paintSwatch` :187,
  `custom.mastered`) — uppdagat 2026-09-23.

### Karaktär & berättelse
- **[Deep] En liten paraply-figur (Bobo/Elvira) i markremsan** som blir glad när rätt
  färg samlas, håller upp paraplyet och vid rundslut "fångar" regnbågen i en burk. Egen
  vinst-animation istället för generisk konfetti, och en värld kring regnet.

### Ljud
- **[Quick] Riktiga regn/plask-klipp via SFX-pipelinen** ([[real-audio-sfx]]): mjukt
  droppklick, pöl-plopp, regnbågs-kaskad. Lägg en stillsam regn-ambient på låg volym för lugn.
  *(Blockerad 2026-09-23: MOSS nere.)*

## 5. Status / loggar

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): rundans vinstreplik (`done`)
  sades EFTER `complete()` och kapade berömmet — flyttad före, så den står kvar och berömmet
  utgår. Nästa rundas instruktion (1,4 s efter) köar i `ctx.narTyst` med rundtoken. Nytt:
  målfärgens droppar pulserar kort när de föds (ej i ord-rundan). §4: fem punkter var redan
  byggda.

- 2026-06-30: Doc skriven (granskning + plan; gammal byggspec överskriven). Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] pöl-plask med ljud + kombo-ton + "samla regnbågen"-tavla**
  och **[Medium] ord-runda utan droppe-matchning** — störst pedagogiskt lyft för minst risk.
- 2026-07-02: Första-omgång IMPLEMENTERAD (self-test errorCount 0):
  - Pöl-plask hörs nu (mjukt vått `audio.tone`-plopp, strypt mot spam) + syns (krusning
    + närmsta pöl studsar via `pop`).
  - Stigande kombo-ton: rätt droppar i snabb följd (<1,6s) klättrar uppför en dur-
    pentatonisk stege (COMBO_LADDER) via `audio.tone`; nollställs vid rundslut/paus.
  - "Samla regnbågen"-tavla i vänstermarginalen: 6 tomma prickar som fylls med riktig
    färg + `pop`+`sparkle` när en färg bemästras; persistas i `progress.custom.mastered`.
  - [Medium] Ord-runda (var 3:e runda från runda-index 2): skylten visar BARA färgordet
    stort i färgen (ingen droppe att matcha mot). Vid ~6s tvekan avslöjas droppe-formen
    som stödhjul. Fortsatt helt no-fail.
- 2026-08-06: **Röstbugg + [Medium] blanda färger** (poleringsrundan, 🔤 Lära-fliken).
  - **Tre repliker kunde aldrig få ett klipp.** Rundans intro och slutreplik byggdes med
    strängkonkatenering (`'Tryck på de ' + plural + ' dropparna!'`). Klipp-manifestet slår
    upp på exakt text och `check.mjs` matchar bara literaler, så båda föll tillbaka på Web
    Speech. Nu ligger `intro` och `done` som fulla literaler i `COLOR_DEFS` — alla tolv
    fanns redan i `voice-phrases.json`, det var källkoden som gjorde dem onåbara.
  - **[Medium] Färgblandning i pölarna.** Pölarna var ren dekor. Nu bär varje pöl den färg
    som senast landade i den (`_paintPuddle`), och landar en ANNAN grundfärg i samma pöl
    blandas de synligt: gul+blå→grön, röd+blå→lila, röd+gul→orange, med gnistor, en
    stigande ton och rösten som säger vilket ("Gul och blå blir grön!"). Ordningen spelar
    ingen roll (`mixKey` sorterar nycklarna). Eftersom målfärgen dominerar regnet är
    blandningen sällsynt — ett wow-ögonblick, inte en mekanik barnet måste hantera.
    Fortsatt helt no-fail: inget kan bli fel, ingenting krävs.
  - Tre nya repliker tillagda i `scripts/voice-phrases.json` (väntar på `/rost`).
  - Verifierat i en 40-sekunders körning: pölarna färgas löpande, 0 konsolfel.
  - Kvar sedan tidigare: paraply-figur som mottagare ([Deep]), riktiga regn/plask-klipp.
