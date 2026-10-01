# Vilket Djur Låter Så? (`vilket-djur-later`)
> 🔤 pedagogiskt · tap · 2–5 år · status: 🔧 förbättringar pågår

## 1. Nuläge (sett som spelare)

En solig äng. Uppe i mitten en stor, gul "högtalar/öra"-knapp (🔊) med puls-ring och
markskugga. Nedtill 2–6 gulliga djurkort: en cremebricka med en färgad spotlight-skiva
och en stor djur-emoji som gungar lugnt. Strax efter intron spelas ett **riktigt
djurläte** upp (verifierat: alla 12 djur har egna mp3-klipp i `public/audio/sfx/`,
t.ex. `djur_ko.mp3`) — och om klippet saknas faller rösten tillbaka på onomatopoetik
("Mu! Muu!"). Jag trycker ett kort → 'tap' + studs + ring. Rätt djur → 'correct' +
gnistor + burst + en glad emoji svävar upp, kortet hoppar, och rösten "svarar":
"Det är en ko! Kon säger muu!". Fel → vänlig vingel + 'soft', och lätet spelas snällt
igen. Högtalar-knappen kan tryckas när som helst för att höra lätet på nytt. Antal
kort växer med nivån (2→3→4→6) och fler rätt krävs per stort firande.

**Funkar bra:** att det spelar **riktiga djurläten** (inte bara TTS) är spelets stora
styrka — det är precis det ljud som landar hårdast hos barn. Distraktorer delar aldrig
läte med svaret (groda/anka som båda "kvack" krockar inte), svaret upprepas aldrig två
rundor i rad, repetera-knappen är generös och tydlig, idle-recue lockar med en
andnings-puls på rätt kort, och allt är exit-säkert. Grammatiskt korrekt bekräftelse.

*(Skärmdump: gul högtalarknapp överst, två kort (anka, katt) på äng — nivå 0, 2 kort.)*

## 2. Ursprunglig plan & tankeprocess

Tänkt (kodkommentar) som **ljud→djur**-matchning: barnet kopplar ett läte till rätt
djur och får djuret att "svara" med sitt namn (auditiv diskriminering + ordförråd).
Den uttalade ambitionen var att använda riktiga förinspelade klipp (`audio.sample`)
med TTS-fallback. Svårighet = antal svarsalternativ, växande långsamt; bred djurpool
(12) håller det fräscht. NO-FAIL: fel ger mjuk vingel + repris av lätet, aldrig straff.

## 3. Vad gör det lättjefullt / tunt

- **På nivå 0–1 är det ett myntkast.** Med bara 2 kort (och svaret aldrig samma som
  förra rundan) gissar barnet rätt halva tiden utan att lyssna. De yngsta börjar här, så
  den första upplevelsen tränar knappt diskriminering. Tre kort som golv vore vänligare.
- **Korten är döda — djuret "låter" men *rör sig inte*.** När lätet spelas händer inget
  på korten; det vinnande djuret hoppar först *efter* att man valt rätt. Ingen visuell
  koppling mellan ljudet och djuret som gör det (mun som öppnas, kort som studsar i takt).
- **Ingen fri utforskning.** Barnet kan inte trycka på ett djur bara för att höra vad det
  låter (utan att det räknas som "fel"). För 2-åringar är "tryck → djuret låter" en egen
  glädje; här bestraffas nyfikenhet med en vingel.
- **Enkelriktat: alltid ljud→bild.** Aldrig en vändning (se djuret → välj rätt ljud, eller
  härma lätet). Samma frågetyp varje runda.
- **Övriga ljud är tunna/syntetiska** ('tap'/'pling'/'soft'/'correct') och bekräftelsen är
  TTS. Det riktiga klippet spelas bara som *ledtråd* — inte igen som en stolt "så här låter
  kon!" tillsammans med namnet vid rätt svar.
- **Generisk belöning + statisk äng.** Ingen bondgård, ingen bonde/Bobo som reagerar;
  firandet är samma konfetti+stjärna.

Kort sagt: kärnan (riktiga läten + ren matchning) är stark, men **korten lever inte med
ljudet**, det går inte att utforska fritt, och de lägsta nivåerna är för lätta att gissa.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ ~~**[Quick] Höj golvet till 3 kort**~~ Redan byggd 2026-07-02 (`index.js:44`, `MIN_CARDS`) —
  uppdagat 2026-09-23.
- ✅ ~~**[Medium] Lägg till ett fri-utforska-läge / "smek"-tap.**~~ Redan byggd 2026-07-02
  (`index.js:354`, `_listen` via öron-ikonen per kort) — uppdagat 2026-09-23.

### Variation & överraskning
- ✅ ~~**[Medium] Vänd ibland på det**~~ Byggd 2026-10-01: var fjärde runda visar ETT stort djur
  ("Hur låter kon? Säg muu!"); trycket spelar djurets eget läte som eko + gest + kort beröm, inget
  fel svar. (Varianten "spela två läten, välj ljudet" är inte byggd.)
- ~~**[Quick] Fler djur i poolen syns** genom att rotera vilka 12 som kan dyka upp per session~~
  Premissen föll: poolen ÄR alla 12 djur, varje runda slumpar ur hela `DJUR` (svaret aldrig
  samma två rundor i rad) — det finns ingen delmängd att rotera (SNABBVINSTER D, 2026-09-23).

### Juice
- ✅ ~~**[Medium] Låt djuret *göra* lätet visuellt**~~ Redan byggd 2026-07-02 (`index.js:371`,
  `_speak` + `_noteTo`) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Vinnardjuret gör en egen liten gest** (kon vickar på huvudet, hönan picker)~~ Klar
  2026-09-23 (v1.251.0): tabellen `GEST` ger alla 12 djur en egen rörelse på ANSIKTET (kon vickar,
  hunden viftar, hönan picker, grodan hoppar, ugglan vrider på huvudet …) i stället för samma
  vickning; kortets hopp och träffyta är orörda.

### Progression
- ✅ ~~**[Quick] Mild kategori-tematik**~~ Byggd 2026-10-01: bondgården först, sedan dammen/skogen
  (groda/anka/bi/uggla), växlar vid varje milstolpe med egen kuliss och en talad intro.

### Karaktär & berättelse
- **[Deep] En bondgård + en bonde/Bobo** (själva gården finns sedan 2026-10-01 och fick tråg, hö och glänta 2026-10-02 — kvar är en bonde/Bobo) som reagerar ("Ja! Det är kon!"), så scenen är en
  värld och firandet en plats-specifik glädje istället för generisk konfetti.

### Ljud
- ✅ ~~**[Quick] Spela det riktiga klippet IGEN vid rätt svar**~~ Redan byggd 2026-07-02
  (`index.js:459`) — uppdagat 2026-09-23.

### Kvar efter nattpoleringen 2026-10-01 (spelkritikern)
- **[Deep] Egen kroppssilhuett per djur.** Alla djur delar `ritaKropp` (samma ellips, bara färg
  och fläckar skiljer) — huvudet bär hela identiteten, och grodan läses som en grön nalle.
  Delas med `djurorkester/konst.js`, så bygg det där och låt båda spelen ärva.
- ✅ ~~**[Quick] Örat överlappar djurets träffyta ~37 px.**~~ Klar 2026-10-02 (L1/B3): djurets
  `HIT` ±70 → ±55 (kroppens egen halvbredd), örats träffyta 96 px (r 48) på HIT_HALV·skala + 24 + 48
  från djurets mitt. Uppmätt i Node (`scripts/_natt-b3-scene.mjs`): öra→träffyta **−31,8 px → 24,0 px**
  för 2/3/4/6 djur; smalaste djurträffyta 104,5 px (6 djur) — alltså P0:s 96 px + 24 px avstånd.

- **[Quick] Fyra djur: sista örat vid skärmkanten (kritiken 2026-10-02).** Pitch 300 för n=4 lägger örats träffyta på x≈1281; pitch 290 räcker.

## 5. Status / loggar

- 2026-10-02 🌳 **Ängen får djup och en mitt** (nattkörning, FYSIKPLAN L1, kluster B3). Bild C:
  halva bilden var platt grön yta. (1) `createScene('meadow', { groundH: 360, silhuett: 'skog',
  forgrund: true })` — trädlinje på fjärran- och mellanbandet och strån + blomtuvor längst ned.
  (2) Mitten ritas nu: **slåttränder** (svag ljusning i tre band med växande höjd), **tusenskönor**
  utströdda över ängen och — i bondgården — ett **vattentråg** och en **hink** framför stängslet,
  en andra **höbal** ovanpå den första och blommor längs stängslets fot; i dammen/skogen en
  **mossig glänta** med stenar, **flugsvampar** och vilda blommor. Stängslet och ängsdekoren går nu ut i
  bleed-zonen (förut slutade de vid 1280). Dekoren är med flit LÅG i kontrast: ko/anka/höna/får är nästan
  vita och hund/häst/tupp bruna, och ingen mark- eller jordplatta får tära på deras silhuett (därför
  ingen ljus gårdsplan under djuren). Allt är ritat, ingen emoji. (3) Öra-överlappet (§4) är åtgärdat.
  **Mätt i Node** (`scripts/_natt-b3-scene.mjs`, 26/26): 0 texturbakningar vid montering, L1 drar inga
  extra `Math.random`, samma `fro` = samma geometri, knappzonen (x<230) ≥ y 170. **Omätt i webbläsare**
  (orkestreraren): skärmdump, `npm run test vilket-djur-later`, `scripts/_natt-vilket-djur-later.mjs`.

- 2026-10-01 🐄 **Djuren kliver ut ur korten** (nattkörning). P0 ASSETS: korten (cremebricka + skiva +
  ikon) är borta — varje djur står FRITT på ängen med djurorkesterns kropp (`ritaKropp`/`ritaHander`
  importerade ur `../djurorkester/konst.js`), markskugga, vilo-guppning (`liv`, egen fas) och
  reaktion vid tryck (squash + hopp, huvud nickar, eget läte-"prat"). Träffytan sitter på en
  behållare som aldrig rör sig; allt animeras i barn. 👂 står kvar som en liten UI-kontroll bredvid
  djuret (syskon i ett eget lager, eftersom en hitArea släpper inget igenom) och 🔊 som förut.
  Layout: 2–4 djur i en rad (skala 1,3), 6 djur 3×2 (skala 0,95, träffyta 133×158 px, 28 px
  mellan raderna). **Tema:** rundorna har bondgård (lada + stängsel) först, sedan damm/skog
  (damm + träd), byts vid varje milstolpe; distraktorer tas i första hand ur samma tema.
  **Vända-rundan** (var fjärde vinst): "Hur låter kon? Säg muu!" — ett stort djur, tryck spelar
  djurets klipp som eko. Omätt i webbläsare (orkestreraren testar).

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): vinnardjurets egen gest (se §4).
  Dubbelfirandet: spelet firade redan inte själv, men nästa rundas fråga kom 1,6 s efter
  milstolpens `complete()` och kapade berömmet. Frågan köas nu i `ctx.narTyst` och lätet följer
  1,1 s efter FRÅGAN som förut; den tappas om barnet redan svarat. I vanliga rundor är rösten
  tyst och allt sker som förut. Omätt i webbläsare (koordinatorn testar).

- 2026-08-10 🎨 **D1: brickorna fick ljus** (`5613a7b`, v1.124.0).
  Brickorna låg tillsammans på **66 327 px i EN ton** — spelets största fält. Kort FÅR bära text
  och UI enligt P0, men de behöver inte vara platta: `vandkort` fick samma lyft i `8809aa0`.
  Bara nedåt, ingen ljus topp (`light: 0`): crèmen är redan nästan vit så en tint gör ingenting,
  och toppen bär dessutom redan en vit sheen.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **66 327 → 15 870 px.**

- 2026-06-30: Doc skriven (granskning + plan; gammal byggspec överskriven). Verifierat: alla
  12 djurläten finns som mp3 i `public/audio/sfx/` + manifest. Inga kodändringar.
- Rekommenderad första-omgång: **[Quick] 3-korts-golv + spela riktiga klippet igen vid rätt**
  och **[Medium] djuret rör sig med ljudet + fri-lyssna-ikon** — störst lyft för minst risk.
- 2026-07-02: ✅ FÖRSTA-OMGÅNG BYGGD (self-test errorCount 0).
  - **[Quick] 3-korts-golv:** `MIN_CARDS = 3`; antal kort = `Math.max(3, LEVELS[level])` utom
    allra första rundan i sessionen som får vara 2 (mjuk start). Valet kräver nu lyssning.
  - **[Quick] Riktiga klippet spelas IGEN vid rätt** + namnet: rösten säger "Det är en ko!",
    sedan (0,85 s) `audio.sample('djur_<id>')` (fallback: "Kon säger muu!"). Multisensoriskt.
  - **[Medium] Djuret rör sig med ljudet** (`_speak`): ansikte/spotlight-skiva pulsar (mun
    öppnas) + kort-studs i takt + ljudvågs-ring ut från kortet. Körs vid rätt svar, vid
    fri-lyssna, och som riktade "ljudvågor" (`_noteTo`) från knappen mot rätt kort i idle-hinten
    (då rätt kort redan avslöjas av andnings-pulsen — inget läckage under vanligt spel).
  - **[Medium] Fri-lyssna-ikon (👂) per kort:** tydligt skild från kort-trycket (tap = svara,
    öra = lyssna via `stopPropagation`). Spelar djurets läte utan att räknas som svar, ALDRIG
    en vingel (nyfikenhet belönas). 100px träffyta.
  - Exit-säkert: alla nya tweens (`face.scale`/`disc.scale`/öra) samlas i `_killCardTweens`,
    fördröjda anrop är `_alive`-vaktade och proxy-tweens rör Pixi-objekt bara om `!destroyed`.
- 2026-08-06: **P0 ASSETS — alla 12 djur ritas nu** (poleringsrundan, 🔤 Lära-fliken).
  - **Emoji-Text ersatt med `drawIcon`** ur `src/lib/artikoner.js`. Emoji-strängen är
    fortfarande NYCKELN (namn, läte, `djur_<id>`-klipp och distraktor-filtret slår upp på
    den) — bara renderingen bytte. `faceSize` höjd 120→148 / 100→124 eftersom en ritad
    figur är smalare än en emoji-glyf.
  - **Fem nya nycklar i ikonbiblioteket:** 🐑 får (ullkrans + hängöron), 🐴 häst (lång nos,
    man ritad OVANPÅ huvudet, näsborrar), 🦆 anka (platt bred näbb + tofs), 🐔 höna och
    🐓 tupp (sammanhängande röd kam, tuppens högre; näbb + slör). Utan dem hade fem av
    tolv djur fallit igenom till `drawIcon`s grå cirkel.
  - **🐮 kon ritades om** (`round` → egen `cow`-mall): horn, breda öron rakt ut, mörk fläck
    och stor rosa mule med näsborrar. Den gamla kon var en vit cirkel med runda öron —
    den läste som isbjörn. Ändringen syns även i vandkort/skuggmatchning/stor-liten.
  - **Skivan bakom djuret bleks** (`lerpColor(färg, vitt, 0.66)` + 7px färgad ring) i
    stället för full färg. Grön groda på grön skiva föll ihop med sin egen platta —
    samma fel som harma-melodin hade.
  - Nytt verktyg `scripts/_ikoner.mjs` — ritar valda nycklar i ett rutnät och tar en
    skärmdump. Det var det som avslöjade att kon, hästmanen, kammen och ankan var svaga.
  - `npm run test` 0 fel; de sju andra artikoner-spelen omtestade gröna efter ko-ändringen.
