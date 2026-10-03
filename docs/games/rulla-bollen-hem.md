# Rulla Bollen Hem (`rulla-bollen-hem`)
> ⚽ fysik · drag · 3–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En minigolf-plan ovanifrån: stor grön spelplan med rundade studsväggar, ett 🥅-mål med
andande målring till höger, och en boll med skugga till vänster. Jag greppar bollen och
drar för riktning + kraft — en **prickad bana** visar EXAKT var bollen rullar och stannar
(kalibrerad mot matter: previewDamp = 1−frictionAir) — och släpper. Bollen rullar iväg som
en riktig matter.js-kropp utan gravitation (toppvy), bromsas av ytans friktion, studsar mjukt
mot väggarna och stannar. Nästa skott går från det nya viloläget, precis som riktig minigolf.

Rik variation per bana: **ytor** (gräs/is/sand med olika glid, bytbara via "Byt yta"-knapp
+ synlig overlay), **bollar** (⚽ normal / 🏀 studs / 🎳 tung), **hinder** (träklossar att
rulla runt + 🟠 studsdynor med pinball-pling) och **vind** (vindflöjel + böjd pricklinje från
bana 4). Inget misslyckande: stannar bollen utan mål → puff + vingel; efter 2 stopp ett
nästan-perfekt hjälp-skott, efter 3 en garanterad hemglidning (sensor genom hinder). Mål →
bollen krymper in i nätet, bigCelebration, complete, ny svårare bana. Idle ~6s → recue.

**Funkar bra:** den prickade banan som matchar verkligheten är pedagogiskt lysande (sikte +
kraft blir begripligt), ytorna/bollarna/vinden ger äkta varierad fysik med ärlig
förhandsvisning, studsdynorna är roliga, no-fail-trappan är välbyggd. Ett rikt, smart spel.

*(Skärmdump: grön plan, mål med boll precis hemma till höger, "Byt yta · Gräs"-knapp nere.)*

## 2. Ursprunglig plan & tankeprocess

Ett toppvy-minigolf där sikte + kraft lärs via en ärlig prickad bana (kodhuvudet beskriver
kalibreringen i detalj). Designmålet: ett GOAL-baserat fysikspel med flera kontroller som
påverkar utfallet (yta, boll, vind, studs) men ALDRIG ett fail — missar är roliga och en
snäll upptrappning (fritt försök → hjälp-skott → garanterad glidning) ger alltid mål.
Banorna trappar svårighet (rak → vinkel → hörn/studs → vind → hinder) med no-fail intakt.

## 3. Vad gör det lättjefullt / tunt

- **Hjälp-trappan kan spela banan åt en.** Efter 2 stopp skjuter spelet ett nästan-perfekt
  skott, efter 3 glider bollen hem som spöke rakt genom hinder. Ett barn som inte siktar alls
  får ändå mål inom tre stopp — bra som skyddsnät, men kommer snabbt och kan göra egen sikt
  meningslös.
- **Tap-fallbacket siktar redan mot målet.** `tapPower 0.85` + `defaultAim` mot målet gör att
  ett litet tap nästan rullar hela vägen hem — på de raka tidiga banorna löser ett slumptryck
  banan utan riktning.
- **Stor tom plan.** Mitten är ofta en bar grön yta; hindren är glesa (1–2 på låga banor) och
  hela övre/nedre fältet är dekorativ tapet. Det känns mer som en testbädd än en plats.
- **Inget bor i målet.** 🥅 är bara en emoji + ring; ingen målvakt, ingen publik, ingen figur
  som väntar på bollen och jublar när den kommer hem.
- **Bollen är en puck utan karaktär.** Endast emojin roteras; ingen min, inget uttryck,
  ingen reaktion på studsar utöver en puff.
- **Ljudet är UI-blipp.** 'whoosh'/'pop'/'pling' — ingen riktig rull-rull, ingen mål-jubel
  (publik), ingen yt-specifik klang (is vs sand låter likadant).
- **Generisk belöning + ingen samling.** Samma bigCelebration; banorna räknas internt men
  inget visas (ingen banräknare/karta), inget sparas att återse.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Senarelägg/mjuka hjälpen.** Låt fler fria försök innan auto-skott, och låt
  hjälp-skottet bara sikta (inte garantera) tidigare — glide-home som absolut sista utväg.
  Behåll no-fail men låt barnets egna skott betyda mer.
- ✅ ~~**[Quick] Tap-fallback mindre perfekt.** Sänk `tapPower`/sprid `defaultAim` lite så ett tap
  ger en lekfull knuff snarare än ett facit-skott — drag belönas tydligare.~~ Redan gjord
  (`tapPower: 0.62`, 2026-07-01) — uppdagat 2026-10-02.

### Variation & överraskning
- **[Quick] Rikare banor.** Fler/varierade hinder (svängande grind, rörlig studsdyna, en
  tunnel/ramp) och en "samla stjärnor på vägen"-variant så planen blir en bana, inte ett
  fält. Behåll fri start/målinfart-filtret.
- **[Medium] Bonusmål.** Ibland en extra ⭐ eller en vän att rulla förbi på vägen hem för extra
  gnistor — wow utan svårighet.

### Juice
- **[Quick] Riktigt rull + mål-jubel.** Rullande boll-ljud som skalar med fart, yt-specifika
  studsklang (is = ljust, sand = dovt) via SFX-pipelinen ([[real-audio-sfx]]); en liten publik-
  jubel-sample vid mål. *(Blockerad 2026-09-23: rull- och jubelklippen finns inte — MOSS nere.
  Målvaktens stämda C-dur-jubel i `_keeperCatch` :932 täcker målögonblicket tills vidare.)*
- ✅ ~~**[Quick] Spårlinje efter bollen.** Ett bleknande hjul-/gräsavtryck där bollen rullat så
  skottet får ett synligt efterspel.~~ Redan byggd (`_trail` :335–339, ritas i tickern :759) —
  uppdagat 2026-09-23.

### Progression
- ✅ ~~**[Medium] Synlig bankarta/räknare.** En liten "hål 1, 2, 3…"-rad eller stig som fylls per
  klarad bana — konkret framsteg och en anledning att fortsätta.~~ Redan byggd (hål-raden
  upptill, `_drawHoleRow` :957) — uppdagat 2026-09-23.
- **[Quick] Tydligare yt-/vind-tema.** Låt banans tema (vinter-is, strand-sand) prägla hela
  scenen mjukt, inte bara en overlay.

### Karaktär & berättelse
- ✅ ~~**[Deep] En målvakt/vän vid målet.** En figur (Bobo/valp) som står i målet, vinkar, fångar
  bollen och jublar — ger målet liv och en egen vinst-animation. Bollen kan få ögon och en
  glad min när den rullar hem.~~ Redan byggd (`makeKeeper` :126 med vilo-gång, `_keeperCatch`
  :932 hopp + armar + jubel, bollens ansikte :108) — uppdagat 2026-09-23.

### Ljud
- **[Quick] Lugn utomhus-ambient** + varierat berömsting; säkerställ yt-röstledtrådarna inte
  tjattrar vid snabba byten. *(2026-09-23: berömstinget är varierat — `WIN_CUES` slumpas och
  vinstljudet varieras i `AudioService._celebrate`; yt-repliken ersätter den förra vid varje
  byte i stället för att staplas. Ambienten är blockerad: kräver ett nytt klipp, MOSS nere.)*

- [Lätt] När bollen VILAR i en zon släpps `forhandsStopp`, så pricklinjen går rakt ut ur gropen fast kraften drar tillbaka — ett svagt skott kan "ljuga" (kritik D14).
- [Lätt] Bana 3–4: kullen ligger på y 260/540 och en rak linje på y≈400 har bara 10–20 px marginal — kullen märks bara om man siktar mot den (kritik D14).

## 5. Status / loggar

- 2026-10-03 · **Kullar och gropar som kraftzoner (F4, D14 kluster B1)** — ej provkört i webbläsare (bara `check` +
  Node-mätning; orkestreraren testar). ⚠️ **Premissen höll inte:** orderns "backar och gropar … synliga i trädgården
  från natten" fanns INTE — `tradgard.js` är bara dekor (häck, hus, träd, rabatt) och planen hade inga zoner alls.
  Byggt i stället (litet, nya filer `zoner.js` + `zonbild.js`, ritade som riktiga föremål ovanifrån: kullen en ljus
  gräskupol med skuggad kant och blommor, gropen en jordskål med stenar; vilo-andning med egen fas, hopp när bollen
  kommer in): **kulle** = en mjuk lutning UT från mitten (`a = 0,12 · sin(π·d/r)` px/steg², cosinuskulle, noll i mitten
  och vid kanten), **grop** = samma form IN mot mitten (A 0,07 — sänkt från 0,10 efter kritiken: på sand höll 0,10 kvar minsta skottet); r = 130 px; kraften verkar per fast fysiksteg i
  `beforeStep` (`massa · a / STEP2`), BARA medan bollen rullar och inte under hjälp-skottet (det siktar rakt och ska
  hålla sitt löfte; glid-hem går över allt). Bana 3–4: en kulle; bana 5–6: kulle + grop; bana 7+: 1–2 slumpade
  (två från bana 10) — alltid fria från start (≥ r+106), mål (≥ målradie+r+40), hinder och väggar. Stämd ton vid
  inträde (kulle upp G4→C5, grop ner G4→C4) + gnistor; nya tipsrepliker (se rapport).
  **Förhandsbanan (G3a):** skuggvärlden stegar ingen lutning, så varje zon är också en statisk SENSOR med
  `forhandsStopp = true` (radie = r − bollens radie, så provkulan nuddar den exakt när bollens MITT kommer in där
  kraften börjar) och `filter` släpper nu in `'wall' || forhandsStopp`. Pricklinjen SLUTAR alltså vid zonens kant —
  hellre en kort ärlig bana än en som ljuger. Ligger bollen redan inne i en zon (den kan stanna i en grop) tas flaggan
  av så länge, annars blev pricklinjen en enda prick; linjen räknar då inte med lutningen de få första stegen.
  **MÄTT** (Node, `PhysicsWorld` + samma `zonAcc`/`beforeStep` som spelet): bollen mitt i en grop kommer ur den med
  det minsta skottet (fart 8) i alla 8 riktningar — minsta största avstånd 219 px mot zonradien 130; en boll som
  rullar in med fart 3 fångas av gropen och vilar nära mitten (rolig, inte stopp); en kulle vänder fart 3–8 och släpper
  igenom fart 15 (x 872 från start 300, mitt 640); förhandsbanan med fart 25 mot en kulle på (660, 400) slutar på
  **x 532 = avstånd 127,7** från mitten (zonradie 130), kontrollen utan flaggan går till x 927; 400 slumpade banor 6–15:
  **0** zoner över start/mål/vägg, inga tomma layouter. Målet är kvar nåbart: på bana 2–12 finns alltid träffbara
  skott (9–34 av 1 000 provade fart/vinkel-par, med zoner jämförbart med utan: 34 → 34 bana 2–3, 13 → 9 bana 4–5).
  ⚠️ Probens "träffar" är låga på alla banor inklusive HEAD — maxkraften 26 räcker knappt över planen (~910 px)
  och sonden provar utan hinder; det är jämförelsen mellan armarna som gäller.
- 2026-10-02 · **Pricklinjen går genom en skuggvärld (FYSIKPLAN G3a)** — bara förhandsbanan. `skuggvarld: { varld:
  this._phys, kula: this._ballBody, filter: b => b.label === 'wall', vindMinFart: WIND_CUTOFF }`: planens fyra
  väggar och bollens egna tal (yta/studs/luftmotstånd läses live ur bollkroppen, så `_applyMaterials` inte behöver
  mata linjen) i en egen matter-motor. Handtrimningen `Math.max(ball.rest, WALL_REST)` mot väggens nollade tal är
  inte längre vad som ritar (`PREVIEW_BOUNDS`/damp finns kvar som reserv). **Hindren är medvetet INTE med** (header:
  "det är banans utmaning") — `filter` släpper bara in 'wall'; vill man någon gång visa dem är det en rad (uppmätt:
  med hinder 0,0 px fel, utan 504 px). Vinden verkar som i spelet — bara medan farten ≥ `WIND_CUTOFF` (4).
  **MÄTT** (`node scripts/_skuggprobe.mjs`, 6 yta/boll/vind-varianter × 6 skott, läge per fast steg över 64 steg):
  största fel **HEAD 1 072 px → (a) 0,0 px** (HEAD: studs/ceiling saknas — predict har ingen takvägg — och
  heavy-bollens 0,4 mot handtrimmade 0,55; skotten som bara möter golv/höger vägg låg redan på 0–8 px).
  Negativ kontroll: (a) med FEL kula (studs 0,1) avviker 95 px, så 0,0 är inte en blind mätare. 0,029 ms per
  omritning (budget 0,5).
- 2026-10-02 🎨 **L2: banan ligger i en trädgård** (`tradgard.js`, ny fil). Planen var en platt grön
  yta på en platt grön yta. Nu: en rest vedkant runt banan (skugga, undersida, ljus kant,
  träådring, skruvar), en tät häck i två djupled (bakre mörk rad + främre ljus rad uppe, två
  kolumner på sidorna, blommor i häcken, fylld ut i bleed så en bred telefon inte får kala kanter),
  ett litet hus med skorsten och rök bakom målet (där bollen ska "hem"), ett äppelträd som
  vajar, en blomsterrabatt längst ned (tre rader som vajar i var sin takt) och en fjäril som
  fladdrar över häcken. Allt är ren dekor bakom planen (`eventMode 'none'`, tap går igenom till
  `_bg`), platta fyllningar — NOLL texturbakningar — och tweens samlas i en lista som dödas i
  `destroy()`. Inget högt bakom skalets knappar (bara häck x < 200). Regler, kroppar, träffytor,
  kontroller och planens egen ritning är orörda. Grind (F1) och dyna (R2) ingår inte. Osedd i
  webbläsare av byggaren (nattregel: inga sonder) — orkestratorn kollar skärmdumpen.
- 2026-09-23 ✅ **Dubbelfirandet + snabbvinstsvepet** (v1.251.0): spelets egna
  `sfx('celebrate')` och `bigCelebration` i `_reachGoal` strukna — `complete()` gör båda;
  vinstraden (`WIN_CUES`, 2,2–2,5 s) sägs före `complete()` och står kvar. Banans ledtråd låg
  på en fast 0,6 s efter att banan laddats — alltså 2,5 s efter målet — och kapade vinstraden
  (och introt vid start); nu köar den via `ctx.narTyst` med en nivå-token. SNABBVINSTER hade
  ingen A-rad här; tre punkter (spårlinjen, hål-raden, målvakten) visade sig redan byggda.
  Kvar att se: idle-påminnelsen (6 s) kan kapa den 6,4 s långa vindledtråden.
- 2026-08-10 🎨 **D1: planen fick klipparränder som faktiskt syns** (`0c03928`, v1.95.0).
  `_plattprobe` rankade spelet som appens plattaste: **443 000 px (48 % av skärmen) i två
  gröna som skiljer 3/2/3 i RGB**. Orsaken var inte att ränderna saknades — de ritades
  redan (`0x86cf56` @ alpha 0.35 över `0x8fd65e`), men kontrasten låg under ögats tröskel.
  Gräsmattans botten är nu en cachad linjär `verticalFill`, ränderna en mörkare ton med
  lägre alpha (19/17/13 i planens ljusa ände, 13/13/7 i den mörka — gradientens spann är
  medvetet litet just för att ränderna ska överleva i den mörka änden). Is och sand fick
  samma toning: overlayerna är ogenomskinliga, så utan det hade två av spelets TRE ytor
  fortfarande varit en enda ton — och skärmdumpen sonden läser är alltid gräs.
  **Mätt:** största enskilda fältet **236 489 → 44 727 px** (26 % → 4,9 %); de tre största
  tonerna gick från 74 % av skärmen till 13 %.
  **Sonden fick en flagga av det här, och den räddade fixen:** `_plattprobe` räknar bort
  exakt EN ton som bakgrund, så när jag tonade just den ytan (den yttre gräskanten) krympte
  avdraget och talet STEG, 29 317 → 38 718 — en falsk regression jag var nära att backa.
  Med `--medbakgrund` föll samma yta 258 619 → 38 718.
- 2026-06-30: Doc skriven (granskning + plan), ersätter gammal build-spec. Inga kodändringar.
  Spelet testat (errorCount 0; drag rullade bollen ända in i målet — fysik + sikte fungerar).
- Rekommenderad första-omgång: **[Quick] mindre perfekt tap-fallback + rikare banor + riktigt
  rull/mål-jubel** — återinför sikt-agens och fyller den tomma planen för låg risk.
- 2026-07-01 🔧 **Mönster #1 (auto-hjälp) mjukad [Medium+Quick]:** hjälp-trappan skjuten senare
  — aim-hjälp (nästan-perfekt skott) vid 3 stopp (var 2), garanterad glid-hem först vid 4 (var 3);
  barnet får fler egna skott. tapPower sänkt 0.85→0.62 så ett tap ger en lekfull knuff (faller
  kort på längre banor → dra för kraft) i stället för ett facit-skott. No-fail intakt (glide kvar
  som sista utväg). Verifierat: aim-drag rullade bollen hem, errorCount 0.
- 2026-08-04: **Andra omgången** (errorCount 0) — planen blev en riktig plan och målet fick liv.
  - **Målvakten Bobo bor i målet** (§4 [Deep]): ritad målvakt i grön matchtröja och gula
    handskar som vaggar i väntan, och som **kastar upp armarna, hoppar och jublar** när bollen
    kommer hem — med en stigande treklang. Gate-punkt 4 (mottagare) + 7 (egen finish).
  - **P0 ASSETS:** målet ritas nu med stolpar, ribba och nät (var 🥅-emoji i en vit ruta —
    exakt det regeln förbjuder). Bollarna ritas: fotboll, studsboll och tung klotboll, var
    och en med **eget ansikte som hålls upprätt medan mönstret rullar** — bollen är en figur,
    inte en puck.
  - **Planen fylld** (§3 "stor tom plan"): klippta gräsränder, mittlinje, mittcirkel,
    straffområden och hörnbågar. Det ser ut som en fotbollsplan, inte en grön platta.
  - **Spårlinje efter bollen** (§4 [Quick]): ett bleknande gräsavtryck visar var skottet gick.
  - **Synlig bankarta** (§4 [Medium]): en rad hål-pluppar upptill fylls per klarad bana.
  - **Layoutbugg:** "Byt yta"-knappen låg på y=650 med höjd 108 → nederkanten hamnade utanför
    designytan och klipptes. Flyttad till 616 (etiketten till 534).
  - **Bugg:** båda `gsap.delayedCall` → `ctx.later()`.
- 2026-08-09 ✅ **Full bleed [Quick]** (v1.68.0): gräset breddat åt alla håll och fångar nu tryck i kantremsorna. Testad båda viewports: 0 fel.
