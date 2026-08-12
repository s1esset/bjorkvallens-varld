# Mata Pappa (`mata-munnen`)
> 😋 roligt · drag · 2–5 år · status: ✅ marknadsklar — ⏸ **ägaruppdrag väntar: KÖKET (§4)**

Första spelet i **ansiktssektionen** (`docs/IDEER.md` post 2). Riggen som bär det ligger i
`src/lib/ansikte.js`, lagren klipps av `npm run ansikte` (`scripts/ansikte.mjs`).

## 0. Spec (godkänd av ägaren 2026-08-13)

`mata-munnen` · **Mata Pappa** · 😋 · Roligt · drag (tap-tap-fallback) · 2–5 · ingen fysikmotor
(DragController + GSAP). **Kärnloop:** tallrik med 4–6 matbitar → dra → munnen gapar när maten
närmar sig → släpp på munnen → tugg + smulor → helbilds-grimas per mat (~1,5 s) →
mättnadsmätaren fyller. **Bus:** släpp på ansiktet utanför munnen → fastnar + gegga (tak 6,
äldsta ploppar av), fyller inte mätaren. **Variation:** matpool 20, 4–6 per tallrik, sällsynt
wow (~1 på 8). **Finish:** rapfinalen — nöjd-mätt-minen, rap, fniss, smulkonfetti.
**Repliker:** 7 literaler, alla med klipp. **Pappas uttrycksljud är samples**, inte narrator.

⚠️ **Ögon-följningen är STRUKEN** (ägarbeslut 2026-08-13): blickserien i 8 riktningar finns inte
i fotomaterialet — alla 129 bilder tittar mot kameran eller blundar. Ansiktet lever på blink,
andning, käkens gap och minerna i stället.

## 1. Nuläge (sett som spelare)

Ett varmt rum med ett brett träbord tvärs nedre tredjedelen. Mitt i bilden sitter **pappa** — ett
riktigt, frilagt foto som andas, blinkar av sig självt och tittar rakt på mig. Till vänster står
en **mättnadsburk** på bordet med ett hjärta på locket; till höger en stor porslinstallrik med
4–6 handritade matbitar som guppar var och en i sin egen takt (citron, chili, kaka, broccoli,
banan …). Jag tar en bit — **munnen gapar mer och mer ju närmare jag drar** — och släpper på
munnen: biten åker in, käken **tuggar tre gånger**, smulor i matens egen färg sprutar ut, och så
korsbleknar en **hel grimas** in: sur av citronen, flämtande het av chilin, lycksalig av kakan,
fundersam av grönsakerna. Burken stiger ett steg. Släpper jag i stället maten i **pannan eller på
kinden fastnar den** med en klet under sig, pappa säger aj eller blir förvånad, och geggan sitter
kvar. När burken är full kommer **rapfinalen**: nöjd-mätt-minen, en djup rap, ett fniss,
smulkonfetti — sedan torkas ansiktet rent och en ny tallrik kommer.

**Funkar bra:** ett riktigt ansikte som grimaserar är en helt annan sorts belöning än 72 ritade
spel — grimasen ÄR återkopplingen, utan ett tecken text. Gapet som följer fingret gör målet
självförklarande. Bus är gratis och roligt, aldrig ett fel.

*(Skärmdumpar: `.test-shots/_munprobe.png` finalen · `-tugg` lycksalig min mitt i tugget ·
`-bus` apelsin fastnad i pannan med aj-min.)*

## 2. Ursprunglig plan & tankeprocess

Sektionens hela poäng: **för ett 2–5-åring slår pappas ansikte varje tecknad figur.** Riggen
byggdes först (v1.185.0) just för att den bär hela sektionen; det här spelet är dess första kund
och skulle bevisa att `gap`/`tugga`/`min`/`liv` räcker för ett helt spel utan mesh-deformation.

Två saker i koden är direkt tvingade av riggen och får inte "städas bort":

- **Munnen som släppmål är en egen, orörlig nod i `_matL`.** Riggen andas (inre containerns
  skala) och `DragController` mäter avståndet till `target.view.x/y` när biten släpps — ett mål
  som är barn till ansiktet hade flyttat sig mitt i släppet (samma fälla som `sortera-skrap`).
- **Min-lagret ligger överst och bär sin egen mun.** Ett tugg bakom en kvarhängande grimas syns
  inte alls, så varje ny bit anropar `slappMin()` innan käken rör sig. Metoden lades till i
  riggen för det här spelet.

## 3. Vad som mättes (och vad mätningen ändrade)

`node scripts/_munprobe.mjs` spelar spelet på riktigt. Den skrevs för att **testharnessen aldrig
rörde en enda matbit** — den drar mellan generiska punkter, så hela kärnloopen var grön och omätt
(loggen: fyra `drag/foremal`, noll `drag/ratt`).

| Mätning | Kontrollarm | Utfall |
|---|---|---|
| Gapar munnen vid maten? | samma bit, samma drag, punkt långt bort | **0,00 → 1,00** |
| Stiger mätaren en tugga? | väntat steg `1/antal` | 0 → 0,25 vid antal 4 ✓ |
| Kommer rätt min? | mat→min-tabellen | `lycksalig` för kaka, `sur` för citron, `aj` för bus ✓ |
| Mättar bus? | mätaren före/efter ett busläpp | **oförändrad** ✓ |
| Når finalen? | mätaren, minen, nästa tallrik | 1,0 · `nojd` · ny tallrik ✓ |
| Exit mitt i tugget | — | 0 konsolfel |

**Sonden hittade en riktig återvändsgränd.** Första körningen: `mätare 0,833 · äten 5/6` och
tallriken tom. Busad mat lämnade tallriken men räknades ändå in i målet, så ett barn som busar
EN bit av sex kan tömma tallriken utan att finalen någonsin kan komma — precis det P0 förbjuder
("inget misslyckande som avslutar"). Tallriken **fyller nu på sig själv** (`_paFyllning`) så
länge magen inte är full: bus kostar tid och en fläck, aldrig omgången.

**Skärmdumpen hittade två till** som inget grönt tal såg: maten låg på tallrikens KANT (läste som
utspilld) och bordsskivan slutade mitt i luften medan tallriken svävade ovanför den. Platserna
ligger nu med hela matbilden (±50 px) innanför ellipsen och bordskanten skär tallriken.

**Öppen tråd:** gap-mätningen gav en gång 0,00 vid munnen med draget bevisat levande
(`dragging: true`, `tx/ty` rätt) — 1 av 5 körningar, inte reproducerad i de fyra följande.
Mätfönstret låg på 160 ms, alltså i samma storleksordning som en lång bildruta; det är nu 300 ms.
Om det återkommer är den läsningen fel.

## 4. Förbättringar & förhöjningar (plan)

### ⏸ ÄGARENS EGET UPPDRAG — KÖKET (lagt 2026-08-13, **ej påbörjat**)

**Detta går före allt annat i §4.** Beskrivet av ägaren, ordagrant sammanfattat:

> Skapa ett **kök** som miljö/scen för spelet. Sätt **nedre kanten av huvudet mot bordskanten
> på en köksö mitt i köket**, som att karaktären står bakom köksön — så huvudet inte är så
> separerat/svävande i luften. Fyll köket med saker och mat: **kastruller, stekpannor, fat,
> glas med vätskor, kylskåp, köksskåp, ett fönster, micro, ugn, skafferi, bestick, muggar,
> köksredskap, spis.** Använd **mat-/objekt-assets från `pizzabageriet` och
> `hamburgerbygget`** och fyll köket med sådant vi kan mata karaktären med, **samt busa** med
> — kasta, smeta, kladda, mata den med konstiga saker. Objekten ska **interagera med
> varandra**: vätska, kollisioner, mjuka kroppar, massa. Och köket ska gå att **klicka runt
> i** — trycker man på kylen öppnar den sig och där ligger mer saker/mat; likaså köksskåp,
> ugn, micro, lådor, kran, spis, fläkt.

**Vad som redan finns och inte ska byggas om** (kontrollerat i koden 2026-08-13):

- **128 färdiga ritningar** att hämta: `src/games/pizzabageriet/ingredienser.js` (65) och
  `src/games/hamburgerbygget/ingredienser.js` (63, plus `ITEMS` + `makeItemView`). Båda
  exporterar en `DRAW`-tabell. **Busregistret finns redan där:** `bajs` · `strumpa` ·
  `smutsig_strumpa` · `spindel` · `snigel` · `tandborste` · `kackerlacka` · `kalsonger` ·
  `toapapper` · `mask` · `mygga` · `daggmask` · `disksvamp` · `prutt` · `snor` · `fiskben` ·
  `lera` · `mogelost` · `groda` · `fluga`. Ingen ny ritning behövs för att komma igång.
- **Mjuka kroppar:** `src/lib/mjukkropp.js` + `hamburgerbygget/bulle.js` (`makeBullkropp` ·
  `stegBulle` · `sattVikt`). ⚠️ Fast tidssteg är ett KRAV — se CLAUDE.md.
- **Vätska:** SPH-vätskan (`vattenvagen`, `golvet-ar-lava`, `saftbaren`) + `_vatskeprobe.mjs`.
  ⚠️ Simulera bara där vätskan syns.
- **Kollisioner/massa:** `src/lib/physics.js` (matter.js). ⚠️ `restitution` på en STATISK
  kropp gör ingenting — `{ isStatic: true, studs: 0.75 }`.

**Frågor en planerare måste svara på FÖRST — uppdraget är för stort för ett svep:**

1. **Vad händer med `mata-munnen`s nuvarande scen?** Köket ersätter `createScene('warm')` +
   bordet + tallriken. Mätaren och tallriken måste få nya platser i köksbilden, och munnens
   släppmål måste stå kvar som en **orörlig nod** (se §2). Ansiktets `ANS.y`/`_munY` styr
   köksöns kanthöjd — eller tvärtom; bestäm vilket som är master.
2. **Hur mycket fysik tål bilden?** `_montageprobe`/`_fpsprobe` med CPU-strypning innan
   vätska + mjuka kroppar + kollisioner läggs i samma scen. Ett kök där allt simuleras
   samtidigt är inte samma sak som ett kök som ser ut så.
3. **Är det ETT spel eller två?** "Mata pappa" (mål: mätta) och "utforska köket" (mål: öppna
   allt) är olika loopar. Ett gemensamt kök kan bära båda, men P0 kräver ETT tydligt mål per
   skärm för en 2-åring.
4. **P0 GRIND:** öppningsbara luckor är fri lek, inte inställningar — ingen grind. Men
   **taket** gäller: hur många öppnade luckor och utspillda saker samtidigt innan det blir
   kaos? (`GEGGA_MAX` är motsvarigheten idag: 6.)
5. **P0 TRÄFFYTA** för luckor, lådor, kran och vred: ≥96 px och ≥24 px mellan dem — ett kök
   med tjugo klickbara ytor blir trångt fort. Rita ytorna innan objekten.
6. **Bildbudget och montering:** en scen med tjugo objekt får göra **noll** texturbakningar
   vid montering (gradienter cachas per färg — se CLAUDE.md om `FillGradient`).

**Föreslagen ordning** (varje steg testbart för sig): ① köket som stillbild + köksön med
ansiktet i rätt höjd → ② maten flyttas från tallrik till köksö, spelet fungerar som förut →
③ klickbara luckor med innehåll (ingen fysik) → ④ fysik/vätska på de få ställen där den
faktiskt syns → ⑤ bus-objekten från de två matspelen.


### Ljud
- **[Quick] Pappas egna uttrycksljud.** Hela kopplingen finns: `ROST`-tabellen bär klippnamnen
  (`pappa_mmm` · `pappa_blaa` · `pappa_aj` · `pappa_oj` · `pappa_ohh` · `pappa_aaah` ·
  `pappa_rap` · `pappa_fniss`) och `audio.harSample()` frågar först, så klippen tas i bruk i
  samma sekund de läggs i `public/audio/sfx/`. Tills dess spelar varje min sin stämda reserv.
  **Ägarens inspelningsuppgift** — tyst rum, ett uttryck per fil.
- **[Quick] Tugg/smask** som riktigt klipp i stället för tre triangelvågstoner.

### Kärnloop & agens
- **[Medium] Maten syns i munnen ett ögonblick.** Biten krymper och släcks; en kort skymt av
  matens färg mellan tänderna (som `mata-monstret`s tugga) skulle knyta ihop tugget.
- **[Medium] Fler roller.** Riggen tar redan vilken person som helst (`laddaAnsikte(person)`);
  `theme.js` bär `ROLLER = ['Pappa','Mamma']`. En väljare kräver bara ett andra fotoset.

### Variation
- **[Quick] Fler starka matbitar.** `MAT_STARK` har två (citron, chili). En sylta/pepparkaka/
  saltgurka till skulle ge minerna `acklad` och `forvanad` egna orsaker i stället för att låna
  broccolins.
- **[Medium] Geggan påverkar minerna.** Just nu väljs bus-minen på höjdled (över ögonlinjen =
  aj/skratt, under = förvånad). Att den femte fläcken ger en annan reaktion än den första vore
  billig progression.

### Juice
- **[Quick] Burken bågnar när den fylls** (kort skalpuls per steg) — nu stiger vätskan bara.
- **[Quick] Geggan glider en aning** innan den fastnar, i stället för att sitta still direkt.

## 5. Status / loggar

- 2026-08-13 🆕 **Byggt och mätt** (v1.186.0). Se §3. Delad kod som följde med:
  `games/mata-monstret/food.js` → **`src/lib/mat.js`** (andra kunden), med `lemon` och `chili`
  som nya ritningar i `MAT_STARK` — medvetet UTANFÖR `FOODS`, eftersom `mata-monstret` väljer
  favoritkategori ur den listan och en fjärde kategori tyst hade ändrat balansen i ett spel som
  inte bad om något. Nytt i riggen: `Ansikte.slappMin()`. Nytt i tjänsten:
  `AudioService.harSample(namn)` — utan den hade varje tugg flaggat `saknat-ljudklipp` i
  testloggen och dränkt de fynd som är riktiga.
