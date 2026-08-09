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
- **[Quick] Tap-fallback mindre perfekt.** Sänk `tapPower`/sprid `defaultAim` lite så ett tap
  ger en lekfull knuff snarare än ett facit-skott — drag belönas tydligare.

### Variation & överraskning
- **[Quick] Rikare banor.** Fler/varierade hinder (svängande grind, rörlig studsdyna, en
  tunnel/ramp) och en "samla stjärnor på vägen"-variant så planen blir en bana, inte ett
  fält. Behåll fri start/målinfart-filtret.
- **[Medium] Bonusmål.** Ibland en extra ⭐ eller en vän att rulla förbi på vägen hem för extra
  gnistor — wow utan svårighet.

### Juice
- **[Quick] Riktigt rull + mål-jubel.** Rullande boll-ljud som skalar med fart, yt-specifika
  studsklang (is = ljust, sand = dovt) via SFX-pipelinen ([[real-audio-sfx]]); en liten publik-
  jubel-sample vid mål.
- **[Quick] Spårlinje efter bollen.** Ett bleknande hjul-/gräsavtryck där bollen rullat så
  skottet får ett synligt efterspel.

### Progression
- **[Medium] Synlig bankarta/räknare.** En liten "hål 1, 2, 3…"-rad eller stig som fylls per
  klarad bana — konkret framsteg och en anledning att fortsätta.
- **[Quick] Tydligare yt-/vind-tema.** Låt banans tema (vinter-is, strand-sand) prägla hela
  scenen mjukt, inte bara en overlay.

### Karaktär & berättelse
- **[Deep] En målvakt/vän vid målet.** En figur (Bobo/valp) som står i målet, vinkar, fångar
  bollen och jublar — ger målet liv och en egen vinst-animation. Bollen kan få ögon och en
  glad min när den rullar hem.

### Ljud
- **[Quick] Lugn utomhus-ambient** + varierat berömsting; säkerställ yt-röstledtrådarna inte
  tjattrar vid snabba byten.

## 5. Status / loggar

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
