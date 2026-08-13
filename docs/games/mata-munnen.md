# Mata Pappa (`mata-munnen`)
> 😋 roligt · drag · 2–5 år · status: ✅ marknadsklar (köket byggt v1.187–1.189)

Första spelet i **ansiktssektionen** (`docs/IDEER.md` post 2). Riggen som bär det ligger i
`src/lib/ansikte.js`, lagren klipps av `npm run ansikte` (`scripts/ansikte.mjs`).

## 0. Spec (godkänd av ägaren 2026-08-13)

`mata-munnen` · **Mata Pappa** · 😋 · Roligt · drag (tap-tap-fallback) · 2–5.
**Kärnloop:** skärbräda med 4–6 matbitar → dra → munnen gapar när maten närmar sig → släpp på
munnen → tugg + smulor → helbilds-grimas per mat (~1,5 s) → mättnadsmätaren fyller.
**Bus:** släpp på ansiktet utanför munnen → fastnar + gegga (tak 6, äldsta ploppar av), fyller
inte mätaren. **Variation:** matpool 20, 4–6 per bräda, sällsynt wow (~1 på 8).
**Finish:** rapfinalen — nöjd-mätt-minen, rap, fniss, smulkonfetti.
**Repliker:** 13 literaler. **Pappas uttrycksljud är samples**, inte narrator.

**Utökad v1.187–1.189 (ägaruppdraget KÖKET, §4):** scenen är ett kök med **12 klickbara
stationer** — kyl · frys · skafferi · micro · ugn · lådor · öns två skåp (öppnas, innehåller
saker att mata med) samt kran · spis · fläkt · fönster (gör något). **54 saker** i `skafferi.js`,
varav de oätliga spottas ut och aldrig mättar. **Tre motorer, alla där de syns:** matter.js för
högen på bänkskivan, SPH-vätska för utspilld saft/mjölk/honung, och `Mjukkropp` för den nyaste
geggans splat. Tak: 2 öppna luckor · 8 lösa saker · 1 mjuk kropp.

~~⚠️ **Ögon-följningen är STRUKEN** (ägarbeslut 2026-08-13): blickserien i 8 riktningar finns
inte i fotomaterialet — alla 129 bilder tittar mot kameran eller blundar.~~
✅ **ÅTERUPPTAGEN 2026-08-13 (v1.200):** ägaren sköt en **ny serie på 158 bilder**
(`s1face2_*`) som innehåller blickriktningarna. Beslutet gällde det GAMLA materialet.
Se §6 — blicken byggs som ögonlappar (~0,07 MB st), inte som miner.

## 1. Nuläge (sett som spelare)

Ett **kök**. Kylskåp till vänster, fönster med utsikt över en grön kulle, diskbänk med kran,
spis med kastrull och stekpanna under en fläktkåpa, ugn, och ett högskåp med micro, skafferi och
lådor till höger. Mitt i rummet står en **köksö**, och bakom den står **pappa** — ett riktigt,
frilagt foto som andas och blinkar av sig självt. Bänkskivans bakkant skär precis under hakan,
så huvudet svävar inte längre: det står bakom en bänk.

På ön ligger en **skärbräda** med fem handritade matbitar som guppar var för sig, och till
vänster står **mättnadsburken** med ett hjärta på locket. Jag tar en bit — **munnen gapar mer och
mer ju närmare jag drar** — och släpper på munnen: biten åker in, käken **tuggar tre gånger**,
smulor i matens egen färg sprutar ut, och så korsbleknar en **hel grimas** in. Burken stiger ett
steg.

Men jag kan också **klicka runt i köket**. Kylen svänger upp och lyser kallt inifrån med tre
saker på hyllorna; skafferiet, mikron, ugnen, lådorna och öns två skåp öppnas var och en på sitt
sätt. Allt jag hittar går att dra till munnen. En ost går ner. En **gaffel gör det inte** — pappa
smakar, grimaserar och **spottar ut den**, och gaffeln flyger i en båge, landar på bänken och
blir liggande bland allt annat skräp. Ett **glas saft** töms över bänkskivan och pölen rinner
runt kastrullen som redan ligger där. Släpper jag maten i pannan i stället **splattar** klicken
ut, vobblar till och blir sittande.

Kranen går att slå på (vattnet rinner), spisen glöder och kokar, fläkten snurrar, och knackar
jag på fönstret landar en fågel på fönsterblecket. När burken är full kommer **rapfinalen** —
sedan torkas ansiktet rent, bänken sopas av och en ny bräda kommer.

**Funkar bra:** ett riktigt ansikte som grimaserar är en helt annan sorts belöning än 72 ritade
spel — grimasen ÄR återkopplingen, utan ett tecken text. Gapet som följer fingret gör målet
självförklarande. Köket gör bus till en egen lek utan att någonsin blockera målet: brädan fyller
på sig själv, och oätliga saker kostar bara tid och en fläck.

*(Skärmdumpar: `.test-shots/mata-munnen.png` grundläget · `_kokprobe-oppen.png` kylen ·
`_kokprobe-on.png` öns luckor · `_kokprobe-hog.png` högen på bänken · `_kokprobe-spill.png`
pölen · `_munprobe-bus.png` gegga i ansiktet.)*

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

### ✅ ÄGARENS EGET UPPDRAG — KÖKET (lagt 2026-08-13, **byggt v1.187–1.189**)

Uppdraget står ordagrant i commit `727cacb`. Allt är byggt: köksmiljön, huvudet mot bänkkanten,
tolv klickbara stationer med innehåll, mat- och busobjekt från de två matspelen, och fysiken
(kollisioner · massa · vätska · mjuka kroppar). Sonden är `scripts/_kokprobe.mjs`.

**Svaren på de sex frågorna som stod här före bygget:**

1. **Nuvarande scen** — `createScene('warm')`, bordet och tallriken är borta. `kok.js` äger nu
   ALL geometri (`ANS` · `KANT_Y` · `BANK_Y` · `PLATSER` · `MATARE` · `BRADA` · `FYSIK`), och
   `index.js` importerar den. **Ansiktet är master:** köksöns bakkant räknas ur fotots halslinje,
   aldrig tvärtom. Munnens släppmål står kvar som en orörlig nod i `_matL` (§2).
2. **Fysikbudget** — `_montageprobe --cpu 4` sätter spelet vid MEDIANEN (16,8 ms mot
   `flipperspel`s 216,9). Vätskevärlden skapas först när något faktiskt spills och rivs när pölen
   torkat; `FluidView.area` är bänkbandet, inte designytan (förvalet kostar 9× mer).
   `test:all` 73/73 med allt inkopplat.
3. **Ett spel, inte två.** Målet är oförändrat: mätta pappa. Köket är SKAFFERIET — att öppna en
   lucka är hur man hittar mat, alltså en väg till samma mål och inte en andra loop.
4. **Taken** (P0 MOTGÅNG): `OPPNA_MAX` 2 öppna luckor · `GEGGA_MAX` 6 fläckar · `LOSA_MAX` 8
   saker i högen på bänken · EN mjuk kropp i taget. Allt sopas i finalen.
5. **Träffytorna ritades före objekten.** 12 stationer, minsta 100 px, inget par närmare än
   24 px — räknat av sonden, inte antaget. Kolumnerna är höjdbudgeterade: vänstra väggen rymmer
   exakt två stationer, högra tre. Två saker föll på just detta och byggdes om: mättnadsburken
   TAKADES till h=190 (en högre burk lade sig över väggskåpets träffyta) och underskåpet under
   diskhon gjordes medvetet DÖTT (burken står framför det).
6. **Monteringen** använder bara cachade gradienter ur `form.js` — noll texturbakningar.

**Det som INTE byggdes, och varför:**

- **Kranens vatten är en ritad stråle, inte SPH.** Diskhon är 112×34 px; en vätskevärld där hade
  kostat samma sprites och filterpass som pölen på bänken för en tiondel av ytan. Vätskan ligger
  i stället där den syns: på bänkskivan.
- **Ingen koppling mellan matter och `Mjukkropp`.** De är två lösare; en kastrull som landar på
  geggan trycker inte ihop den. Geggan vobblar av sitt EGET nedslag, vilket är sant och mätt.

## 5b. Vad KÖKET mätte (och vad mätningen ändrade)

`node scripts/_kokprobe.mjs` trycker på luckorna — testharnessen rör dem aldrig.

| Mätning | Kontrollarm | Utfall |
|---|---|---|
| Ritar varje katalognyckel något? | reservcirkelns kända mått | 54/54, 52–110 px ✓ |
| Träffytor ≥96 px, ≥24 px isär | räknat par för par | minsta 100 px, 0 för nära ✓ |
| Öppnas kylen med innehåll? | dörrskala i vila = 1 | 1 → 0,16 · insidan tänds · 3 saker ✓ |
| Håller taket 2 öppna? | äldsta ska stängas OCH städas | ✓ |
| Mättar en gaffel? | mätaren före/efter | **oförändrad** ✓ |
| Vilar högen på bänken? | tom bänk vid start = 0 kroppar | 7 kroppar, 7/7 på bänken, 0 utanför ✓ |
| Har högen lugnat sig? | rörelse per 700 ms | 0–3 px ✓ |
| Spills en pöl? | ingen värld före spill | 58 partiklar, bulk 286 px ✓ |
| Torkar pölen upp? | partiklar + världens liv | 58 → 0, världen riven ✓ |
| Vobblar geggan? | **samma kropp utan nedslaget** | 14,3 px mot 0,0 px ✓ |
| Lägger vobbeln sig? | svängning sista 45 stegen | 0,1 px ✓ |

**Fyra fynd som bara mätningen kunde ge:**

- **En cirkel rullar för lätt.** Högen kröp 8,0 px per 700 ms långt efter att sista saken landat
  — alltså aldrig riktigt still (`_stillaprobe`s fråga ställd mot det här spelet). Sjuhörningar:
  0–3 px. Och det är inte bollar som ligger på en bänk.
- **`drain(x, y, w, h)` tar ett CENTRUM, inte ett hörn.** Med hörnet inskickat låg avloppet på
  x −248..632 medan pölen samlats kring 430..830: den torkade bara på vänstra halvan (57 → 29
  partiklar på elva sekunder) och världen levde vidare. Ett tyst enhetsfel utan ett konsolfel.
- **Kontrollarmen välte den första mjuka kroppen.** En RUND kropp som knuffades ut vid nedslaget
  var tillbaka i viloform efter SEX steg (88 → 78 px på 0,1 s) — osynlig. Viloformen är nu redan
  utsplattad och det mjuka är VOBBELN. Utan den oknuffade kontrollarmen hade "kroppen är 78 px
  bred" sett ut som ett resultat.
- **En utspottad sak låg kvar i sitt skåps `_saker`.** När lådan stängdes revs vyn medan
  fysikkroppen fortsatte skriva till den (`Cannot read properties of null (reading 'x')`).

**Och en läxa om sonden själv:** `_kokprobe` mätte en gång sin egen kontrollarm EFTER mätarmen
(1 lös kropp på en "tom" bänk) och drev en lucka ur fas — den klickade en gång för att öppna och
en gång för att stänga varje varv, mot en lucka som redan stod öppen, och öppnade därför aldrig
lådan på tio varv. Samtidigt kom `pointertap` bevisligen fram (down=1 up=1 tap=1). **"Klicket når
inte fram" och "klicket gör tvärtom" ser likadana ut utifrån** — det var händelseräknaren mot
stationens egen `oppen`-flagga som skilde dem åt.

## 5c. Kritikerns runda (v1.190.0)

`spelkritiker` spelade köket som en krävande 3-åring. Fyra av fynden ledde till ändringar:

- **P0-BROTT, och det enda som blockerade:** kylens tre hyllplan låg **120 px** isär medan ett
  dragbart föremåls träffyta är `GRIP_R` 52 — alltså **104 px i diameter**, inte 96. Luften blev
  16 px där P0 kräver 24. Kommentaren i koden hade skrivit 96 och stämde alltså inte med koden.
  Platserna ligger nu 130 px isär och kylen växte 40 px neråt för att rymma rättelsen.
  **Sonden mätte bara STATIONERNAS ytor, aldrig föremålens** — den kontrollen finns nu, och det
  är den som hade fångat det här från början.
- **Kranen ljög.** Den skalade en ritad stråle medan samma fil bar en fungerande vätskemotor 80
  rader längre ner. Den häller nu **riktigt vatten** i diskhon: hon är ett kärl (botten + två
  sidor), avloppet rinner så nivån håller sig, och kranen kan stå på hur länge som helst.
  Uppmätt: 7 partiklar i hon efter 2,6 s, **0 nedanför bänkkanten** (porslinet håller), 0 kvar
  2,6 s efter avstängning. En värld bär alla fyra vätskorna via `FluidView.palette`.
  ⚠️ Det som fick den att inte fungera vid första försöket: `_vatskaTick` kallar
  `clearColliders()` varje bildruta, så kärlet som sattes upp EN gång vid världens födelse var
  borta i nästa ruta — vattnet rann rakt igenom porslinet och sögs bort av avloppet innan det
  hann synas (uppmätt: 0 partiklar i hon efter 2,6 s med kranen bevisat på).
- **En station svalde en pekning tyst under finalen.** `_tryckStation` hade `kvittera()` EFTER
  upptagen-spärren, och en station svarar inte via `_tomtTryck` (den pekningen når aldrig roten).
  Det är P0-brottet `dod-traffyta`, och `_tystprobe` fångade det inte — den letar efter kända
  handlarnamn. Återkopplingen ligger nu före spärren.
- **Kökets egna noder städades aldrig.** `_knapp` tweenar fågeln, strålen, plattorna och
  fläkthjulet, men de ägs av `kok.js` och stod utanför `destroy()`. Nu killade.

Två fynd ledde INTE till ändring, och det är också ett svar:

- **"Bänkhögen kryper 8,0 px/700 ms"** — kritikern läste talet ur en KODKOMMENTAR som beskriver
  det gamla beteendet med cirklar. Den aktuella mätningen är 0–3 px. Kommentaren står kvar för
  att den förklarar varför sjuhörningarna finns.
- **"Pappa har ingen egen röst"** — sant och den enskilt största besvikelsen, men det är ägarens
  egen inspelningsuppgift (§4 Ljud). `harSample()` tar klippen i bruk samma sekund de finns.

Två saker lades till på kritikerns iakttagelse att köket var svårt att upptäcka och att
knapparna aldrig möter varandra:

- **Var tredje vilo-cue pekar på en STÄNGD lucka** i stället för på maten — en ring, ett litet
  skutt på dörren och en fråga. En 2-åring läser inget, och en stängd lucka har bara sitt
  handtag att gå på.
- **Fläkten suger upp ångan från spisen** när båda står på. Det är den billigaste "objekten
  interagerar med varandra" i hela köket, och den enda som syns utan att man rör något.


### Ljud
- ✅ **Pappas egna uttrycksljud** — alla nio inspelade (v1.194–1.195), se loggen.
- ✅ **Tugg/smask följer maten** (v1.199). De tre fasta triangelvågstonerna är borta; `TUGG`
  ger fyra profiler (knaprig · seg · mjuk · dryck) och ljudet ligger på käkens egen takt via
  riggens nya `onTugg`. Sväljning tillagd.
- ✅ **Kontinuerliga stationsljud** (v1.199) — `AudioService.loop/stopLoop/stopAllLoops`.
- ✅ **Alla sju återstående klipp levererade och inlagda** (v1.200.0). Ägarens andra
  inspelningsomgång gav `pappa_gasp` · `pappa_chock` · `pappa_hmm` · `pappa_retas` — plus två
  som INTE var beställda och fick egna händelser: `pappa_huh` (tryck på pappa) och
  `pappa_ehh` (maten lades tillbaka). Sväljningen ligger i högen `svalj` tillsammans med tre
  foley-klipp. Tuggen fick `tugg_knaprig` · `tugg_seg` · `tugg_mjuk`×2 · `klunk`×2, styckade
  ur serieinspelningar (se §5). Nivå −18,4…−18,5 LUFS för rösten.
  ⚠️ **`bottle_blow.mp3` importerades medvetet INTE** — det finns ingen flaska att blåsa i,
  och att bygga en händelse enbart för att ett klipp finns är att sätta svansen först.
  ⚠️ **Kranen, spisen och fläkten** har fortfarande ingen inspelning (`kran` · `koka` ·
  `flakt`). De måste vara **sömlöst loopbara** — den syntetiska bädden (filtrerat brus) är
  fullt duglig och behöver inget klipp.

### Kärnloop & agens
- ✅ **Maten syns i munnen ett ögonblick** (v1.198). `_skymt`: en färgad glimt mellan tänderna
  som kläms i tuggtakten (0,22 s) och sväljs med sista tugget. Proxy-tween med destroyed-vakt.
- **[Medium] Fler roller.** Riggen tar redan vilken person som helst (`laddaAnsikte(person)`);
  `theme.js` bär `ROLLER = ['Pappa','Mamma']`. En väljare kräver bara ett andra fotoset.

### Variation
- ✅ **Fler starka matbitar** (v1.198). Katalogen är nu 64: saltgurka (`acklad`) och sylta
  (`forvanad`) ger de två minerna egna orsaker; senapen är `het` men på sitt EGET sätt
  (rodnad 0,55, två ångpuffar, egen replik — chilin behåller sin fulla reaktion). Plus glass,
  räka, ketchup (hällbar + bus), paj, popcorn, pepparkaka, leksaksbil.
- ✅ **Geggan påverkar minerna** (v1.198). Trappan: från femte fläcken ger pappa upp och
  fnissar (`skratt`, större skak, egen replik) i stället för platsvalets min.

### Juice
- ✅ **Burken bågnar när den fylls** (v1.198) — squash från foten per tugga (pivot i burkens
  fot; burken är dekor så ingen träffyta flyttas).
- ✅ **Geggan glider en aning** innan den fastnar (v1.198) — ankaret + biten tweenas ihop
  0,55 s; hårda saker sitter fastkilade direkt.

## 5d. Ansiktet fick fler uttryck och maten fick en röst (v1.199)

Ägaruppdrag: *"kör allt du kan"* på fler miner och mer ljud.

**Fyra nya miner ur fotoserien — och tre som förkastades i bild innan de kostade något.**
Av shootens 129 bilder var 84 oanvända (de låg kvar i `ComfyUI/output`, bara kandidaterna
hade kopierats till `assets-src/`). Kontaktkartor gjordes över alla 84, och de nya rollerna
valdes mot ett krav: **minen måste vara distinkt mot de nio befintliga**, inte bara ha ett
eget namn. `blas` (#115) föll — det är samma pluta som `sur` redan bär. `gapskratt` (#101)
föll — samma vidöppna mun med slutna ögon som `het`. `mums` (#98) föll — samma leende med
slutna ögon som `nojd` och `lycksalig`. Kvar blev fyra som täcker var sitt hål:

| min | foto | hålet den fyller | används |
|---|---|---|---|
| `gasp` | #124 | öppen mun med ÖPPNA ögon | gäspning i vilo-cue:n |
| `chock` | #129 | vidöppna ögon OCH mun | hårda saker i ansiktet · isbiten |
| `skeptisk` | #7 | hopknipna ögon | hälften av all `fundersam`-mat |
| `retas` | #15 | tunga ut med ÖPPNA ögon | bus under ögonlinjen |

Inriktningen: rest **0,015–0,024**, alltså bättre än de nios median (0,024), och kalibreringen
(referensen mot sig själv) står på skala 1,000 · vinkel 0° · rest 0. De gamla rollerna fick
exakt samma foton som förut. Kostnad **+4,2 MB GPU** (varje min är 423×641 RGBA ≈ 1,04 MB) —
disken är inte gränsen (799 kB av 3072), GPU-minnet är.

**Winken byggdes INTE som en min.** Materialet har fem foton där han blinkar med ett öga, men
de är hela miner: de bär sin egen mun, så en wink hade uteslutit alla andra munlägen och kostat
1,04 MB. Samma blund-bild maskad till **en mjuk oval per öga** (`ogon_v` · `ogon_h`, 0,12 MB)
går i stället att kombinera med gap, tugg och vilken min som helst. Ögonlägena är avlästa i
`ogon.webp` (y 346, mitt 369, ±76), inte gissade ur lappens ram — lappen är 14 px
högerförskjuten mot ansiktets mittlinje.

**Riggen fick huvudet.** `nick` · `tveka` · `ryck` · `lutaMot`, alla på en ny nod `_gest`
mellan spelets `view` och andningens `_inre`, roterande kring **halsen** (en rotation kring
bildmitten svänger huvudet i sidled — samma mätning som en gång sa att käken måste
translateras). Varje gest äger ett eget fält i `_g` och en enda funktion lägger ihop dem:
två skrivare på samma transform tar ut varandra på ett sätt som bara ser ut som att gesten
"ibland inte tar". Plus `kyla()` (motsatsen till `hetta()`) och `liv(pa, { takt })`.

**⚠️ Gesterna hade dödat andningen, och det var mätt innan det byggdes fast.** `_track` höll
24 tweens och kastade den ÄLDSTA när listan blev full — och den äldsta är `liv()`s eviga
andetag. Med en nick per min och ett ryck per bus fylls listan på en halv minut.
Kontrollarmen körd med den GAMLA `_track` inlagd: **1,66 ‰ före 40 gester → 0 ‰ efter**
(andningen död). Med rensning av färdiga tweens och skydd för eviga: **1,66 → 1,66 ‰**.

### Vad som mättes

| Mätning | Kontrollarm | Utfall |
|---|---|---|
| Andas ansiktet efter 40 gester? | samma mätning FÖRE gesterna + gamla `_track` | 1,66 → 1,66 ‰ (gamla: → 0) ✓ |
| Lutar han sig mot maten? | läget efter släppet | 0,007 rad → 0,000 ✓ |
| Tuggar han olika på olika mat? | spelets egen `tuggProfil`, importerad | mjuk 3/3 · seg 2/2 ✓ |
| Följer fläktljudet stationen? | tjänstens källor FÖRE tryck | 0 → 1 → 0 ✓ |
| Överlever ett ljud att man lämnar? | fläkten PÅ vid exit | 1 → 0 ✓ |
| Winken: ett öga, ingen skarv | `blink` (båda) i samma rutnät | avläst i bild ✓ |

**Två sondläxor, båda av samma familj som §3:s:**

- **Mätfönstret låg före släppet.** Tuggräknaren startade innan maten släpptes, och gapet
  följer fingret ända till 1,00 vid munnen — den flanken är inte en tugga. Rättat till att
  fönstret börjar efter `mouse.up`.
- **Och även då räknade den en stängning för mycket.** Den råa gapkurvan (`--trace`) visade
  varför: `9876432111111 | 13677751577774267876` — den första nedgången är DRAGET som slutar
  (gapet räknas ner ~200 ms innan `onCorrect` ens fyrar), inte ett tugg. Räknaren hoppar nu
  över allt fram till första gången munnen är stängd. **Utan kurvan hade "4 mot väntat 3"
  lika gärna kunnat läsas som en bugg i spelet** — och den första rättelsen jag skrev i
  koden (`_gapNu = 0` i `_ata`) visade sig vid mätning INTE fixa något observerat: de två
  skrivarna hinner precis inte överlappa. Raden står kvar som en spärr, med en kommentar som
  säger just det.

## 6. Ägaruppdrag 2 — ljud, kast, blick och hals (godkänd plan, 2 av 6 steg byggda)

Ägaren gav fyra punkter och levererade materialet: **33 ljudfiler**
(`ComfyUI/input/s1face2/ljud`, alla importerade) och en **ny fotoshoot på 158 bilder**
(`ComfyUI/output/s1face2__000NN_.png`, ännu inte tagen i bruk).

| # | steg | läge |
|---|---|---|
| 1 | ljud: slumpade varianter + 34 klipp | ✅ v1.200.0 |
| 3 | nya händelser (Huh · Ehh · prutt · lucka · plopp · svälj) | ✅ v1.200.0 |
| 4 | **kasta** mat på ansiktet | ✅ v1.201.0 |
| 0+2 | riggen: variantminer · ~~diff-beskärning~~ · **blick** | ⬜ (premissen omskriven, se nedan) |
| 5 | front-on kök + **hals** | ⬜ |

**Steg 0+2 — riggen.** Kontaktkartorna över de 158 är gjorda och lästa. Blickserien finns i
**åtta riktningar**: block **94–104** har neutral mun (det är den som ska bära ögonlapparna),
**139–158** samma sak med vidöppen "oh"-mun, och **85–93 / 106–114** med leende/öppen mun.
⚠️ **§0:s beslut att ögonföljningen är STRUKEN gäller inte längre** — materialet finns nu.
Kvar att bygga: ny `roller.json` (`kalla: "s1face2__#####_.png"`) där kandidatlistan blir
**varianter som slumpas** i stället för ett pose-urval, `Ansikte.min()` som slumpar variant,
blicklappar `blick_<riktning>.webp` klippta ur ögonrutan (~0,07 MB st, som `ogon_v`/`ogon_h`)
och ett nytt `blick(dx, dy)`. Den självklara kunden: **pappa följer maten med blicken medan
den dras** — gapet gör det redan (0,00 → 1,00, mätt).
⚠️ **GPU-budgeten avgör hur många varianter som får plats.** Idag: 13 miner à 423×641 RGBA =
**13,5 MB**, basen 3,2 MB, summa ~16,7 MB (836 kB på disk — disken är inte gränsen). Tre
varianter × 16 roller vore 50 MB, alltså 3× hela riggen.

❌ **DIFF-BESKÄRNINGEN ÄR MÄTT OCH FÖRKASTAD (2026-08-13, `scripts/_minprobe.mjs`).** Posten
antog att "bara mun- och ögonpartiet rör sig". Det gör det inte. Varje min ger **50 700–
70 600 px** över Δ≥18 inne i lappen, medan kontrollarmen *hela huvudet flyttat 6 px* ger
**26 000** — en min skiljer sig alltså 2–3× MER från referensen än en förskjutning av hela
huvudet gör. Skillnadskartan lägger informationen i bryn, kinder, nasolabialveck, skäggkant
och **hela silhuettkanten**; bbox:en blir 351–388 × 439–488 px, alltså i praktiken hela ovalen.
Föreslagen beskärning sparar **12 %** (13,5 → 11,8 MB) och räcker till EN extra min-lapp.
Kalibrering: referensen mot sig själv ger 0 px på alla trösklar.
**Vägen till varianter är därför en annan:** manifestet får bära en LISTA per roll (samma
mönster som ljudets `_sampleUrls`) och `laddaAnsikte()` väljer EN variant per roll vid
inläsning. GPU-kostnaden står då still, disken växer med ~50 kB per variant (budget 3072 kB),
och priset är att varianten är låst per app-session i stället för per anrop.

**Steg 4 — kastet.** ✅ **BYGGT v1.201.0.** Opt-in `onKast` i `DragController` (ringbuffert av
de senaste 6 `(t, x, y)` i `_onMove`, släppfart i `_onUp`); returnerar kroken `true` görs
varken `_snapHome` eller `_resolveDrop` och spelet äger vyn. Kroken ropas **efter**
målsökningen — släpps något ovanpå munnen är det ett släpp, hur fort handen än rörde sig dit —
och bara när spelet har bett om den, så de 72 andra spelen är byte för byte oförändrade.
`_kasta()` lämnar över till `_gorLos(ctx, rec, {vx, vy})` (px/ms → px/steg ×16,67, tak 26).
Ljuden: `kast` vid släppet, `traff_mjuk`/`traff_hard` vid träffen; `_miss` väljer redan
`chock` för hårda saker och `retas` för mjuka.

Fem saker som mätningen (`scripts/_kastprobe.mjs`, 4 kontrollarmar + 4 mätarmar) avgjorde:
- **Släppfartens fönster får inte hämta ett prov utanför sig.** Sökningen bakåt stannar på
  första provet ÄLDRE än 90 ms — och pausar handen mitt i draget ligger det provet 220 ms
  bort. Farten räknades då över 270 ms i stället för 50 och gav **0,29 px/ms för en snärt som
  var ~1,9**, alltså ett kast som tyst blev ett släpp. Ligger provet mer än två fönster bort
  används det yngre. Fyra av åtta kast föll på det innan det var mätt.
- **Åldersspärren är inte valfri.** Prov läggs bara vid `pointermove`; ett snabbt drag som
  STÅR STILL en halv sekund före släppet bär annars full fart i sitt sista prov. Uppmätt som
  egen kontrollarm: 420 ms stillastående → inget kast.
- **RAKT UNDER ANSIKTET FINNS INGEN ANSATS.** Bänken ligger 452–558 och munnen på 350, alltså
  ~180 px lodrätt: från 6 av 8 brädplatser går det inte att ta sats mot munnen utan att
  släpppunkten hamnar inne i snäppradien (130 px). Därifrån SLÄPPER man maten. Kastet är en
  rörelse åt sidan — och det är precis vad P0 kräver av en bonus: den blockerar ingenting.
- **`lyft` (82 % av tyngdkraften bort under flykten) är det som gör kastet lärbart.** Med full
  gravitation är banan en parabel, och att sikta en parabel går inte att lära sig av att se
  den en gång. Med lyftet är regeln "den flyger dit du pekar" — uppmätt **7/7 träff**. Så fort
  biten stannar, träffar eller når taket (150 steg) faller den som allt annat.
- **Svept segmenttest, inte punkttest** (var 14:e px längs steget): vid taket flyttar sig en
  bit 26 px per steg. Uppmätt vid 2,98 px/ms utan tunnling, med kontrollarmen "vågrätt kast
  under ansiktet träffar ingenting" bredvid sig.

**Steg 5 — köket och halsen.** Ägarens egen metod: ändra **perspektivet** på köksön,
diskbänken och spisen mer **framifrån** än uppifrån. Då försvinner yta nertill (köksöns
toppyta 395→566 blir grundare, bakkanten går ner mot ~445) och halsen får plats, samtidigt
som kranen och spisen ser bättre ut. `KANT_Y` delas i två tal: `HALS_Y` (fotots halslinje) och
`KANT_Y` (öns bakkant).
✅ **UPPMÄTT 2026-08-13 — halsen finns REDAN i det gamla neutralfotot, och det ändrar planen.**
`s1face__00001_.png` (referensen, alltså källan till `bas`/`ovre`/`undre`) bär hals OCH axlar.
Avläst i utrutans koordinater med linjal (`.tmp-ansikte/_halslinjal.png`, skala 1,2903 som
i dag):

| | ruta-y | design-y (dagens `ANS`) |
|---|---|---|
| hakans/skäggets underkant | ~695 | 441 |
| halsen | 700–785 | 444–494 |
| tröjkragen | ~785 | 494 |
| axlar, ut till bildkanten | 785–1000 | 494–621 |
| **`G.hakaTon` suddar i dag** | **636→700** | **407–444** |
| **köksöns bakkant `KANT_Y`** | **616** | **395** |

Två slutsatser:
1. **Det som döljer halsen i dag är inte fotot, det är två tal.** `hakaTon` tonar bort allt
   under 636, och `KANT_Y` skär vid 616 — alltså mitt i skägget. Att flytta dem är en
   mycket mindre ändring än att migrera riggen till den nya shooten.
2. **Utrymmet nertill är TAKAT av brädan, inte av fotot.** Kragen ligger på design-y 494 och
   bänkskivans framkant (`BANK_Y`) på 566 — en bakkant vid 494 lämnar 72 px bänk, medan
   skärbrädan är 106 px djup (452–558). `KANT_Y` kan alltså flyttas till **~440** utan att
   röra något annat (12 px marginal till brädan), och det räcker till **hela hakan + halsens
   översta rand**. Mer än så kräver ägarens front-on-perspektiv: brädan måste bli grundare
   eller flytta ner först.

⚠️ **Och därför räcker det INTE att bara flytta två tal.** `kok.js` bär en tidigare mätning som
drar åt motsatt håll: bänkdjupet 171 px är det som får huvudet att stå *bakom* en bänk, och vid
146 px "läste skarven som ett fat". En bakkant vid 440 ger **128 px** djup — under det talet.
Halsen ovanför kanten ändrar visserligen läsningen (en hals som försvinner bakom en bänk ÄR en
person, inte ett huvud på ett fat), men brädan är 106 px djup och lämnar då bara 22 px marginal
totalt. Det är precis den knuten ägarens egen metod löser: **köksön, diskbänken och spisen mer
framifrån** gör toppytan grundare *med avsikt* i stället för att klämma ihop den. Nästa post är
alltså en ritningsändring i `byggKok` (ön · brädan · burken · spisen) med omräknade träffytor,
inte en justering av `HALS`.

⚠️ **Om rutan utökas nedåt (`RUTA.h` → 1,0, `HOJD` → 1000 ger IDENTISK skala 1,2903):** gör det
med en EGEN `hUt` och rör inte `RUTA.h` — inriktningssökningen använder samma tal (`uppstallning`
sätter posebandet till 0,72 × rutans höjd), och en ändrad ruta väljer om kandidatfoton åt varje
roll. Då byter de 13 befintliga minerna ansikte utan att någon bett om det. Och `undre` (käken)
får inte bära halsen — den ÅKER NER 40 px vid gap. Halsen hör hemma i det statiska `bas`.

**Halsen kan FOTOGRAFERAS, inte ritas:** nya shooten har hals och axlar i bild, och tröjan är
en enda genom hela serien (uppmätt på 17 bilder över hela spannet: 49,7–58,9 % neutralgrå,
inget tryck — ⚠️ en indikation, inte ett bevis; mätpunkten skiljer ton från ton, inte tryck
från enfärgat). Håller den räcker det att utöka `RUTA.h` i `ansikte.mjs` nedåt. Faller den:
rita halsen i en hudton **samplad ur `bas.webp`**, i ett lager BAKOM fotot så fotots undre
fade blandar sig in.
⚠️ Flyttas `KANT_Y` måste allt som härleds ur den räknas om: `BRADA`, `PLATSER`, `MATARE`,
`FYSIK.golv`, `BUS.ryNer`, lagerdelningen `st.yta.y > KANT_Y`, `hakskugga`, `bankX()`, och
`HO` (SPH-vattnets kärl) om diskhon byggs om. Träffytorna räknas om par för par — **även
föremålens** `GRIP_R` 52 (= 104 px diameter), som var det enda P0-brott kritikern hittade.

## 7b. ARBETSORDERN ÄR KÖRD (2026-08-13, v1.204.0) — A1 · A2 · A3 klara

Alla tre posterna i §7 är byggda, mätta och committade. Det som §7 sa skulle byggas stämde
i två fall av tre; den tredje bytte metod efter en mätning, och det är den intressanta.

| | posten | utfall |
|---|---|---|
| A1 | blicken | ✅ `blick_v` · `blick_h` · `blick_ner`, 0,12 MB GPU/riktning |
| A2 | variantminer | ✅ 7 roller med 2–3 foton, 10 extra lappar, GPU oförändrat |
| A3 | köket + halsen | ✅ halsen syns — men **inte** genom en front-on-ritning, se nedan |

**Den återkommande läxan, tre gånger i samma pass: POSE-MÅTTET ÄR BLINT FÖR MIMIK.**
`rest` (silhuett-IoU) är byggt för att ignorera minen, och därför kan det aldrig avgöra
vilket foto som ska väljas när kandidaterna delar pose. Tre gånger gav det två kandidater
IDENTISKA tal och rätt svar avgjordes i bild: `blick_h` (#95 mot #98 — båda 0,025, men #95
drar ner brynet och läser som misstänksam), `variant_bort` (fyra kandidater under rest-taket
som läser som fel min), och `fundersam` (hela restlistan är samma sömniga bild). **Ett foto
som ska bära ett UTTRYCK måste dömas i ögonzoomen/rutnätet, aldrig på ett rest-tal.**

**A3 bytte metod, och premissen föll på en mätning.** §7 sa: rita om köksön, diskbänken och
spisen mer framifrån så toppytan blir grundare med avsikt, sedan flytta `G.hakaTon`. Båda
halvorna visade sig vara fel:

1. **`hakaTon` kan inte lösa halsen alls.** Avläst i `neutral.png`: AXELSÖMMEN börjar på
   ruta-y ~614, alltså OVANFÖR hakan (683). En vågrät ton kan därför per definition inte
   skilja hals från tröja — den sänkta tonen gav en bred halvgenomskinlig sjok tvärs över
   halsen. ⚠️ Och nästa idé, "nyckla på LJUSHET", såg bevisad ut på två stickprov (tröja 21,
   mörkaste skägg 101) men föll när ytorna mättes som SPANN: skägget går ner till **19** och
   tröjans veck upp till **152** — spannen överlappar helt, och den enda pixelns marginal
   gav ett 11 % genomskinligt spöke av hela axelpartiet. Det som faktiskt skiljer dem är
   POSITION, profilerad rad för rad (hud x 245–520 vid y 660, 258–510 vid 730) → en
   avsmalnande pelare i masken.
2. **Front-on-ritningen behövdes inte.** Den var §7:s lösning på en knut som en billigare
   ändring löser helt: `ANS` 268/470 → **250/460** (ansiktet upp 18 px, ner 2 % i storlek).
   Då hamnar skärlinjen i halsen (ruta 730) i stället för i skägget (616) utan att bräda,
   mat, fysik eller öns front rörs — och de tre är alla fullt budgeterade (luckorna slutar
   på 706 av skärmens 720, brädan på 558 av bänkkantens 566). Bänkdjupet blir 126 px, under
   det gamla "146 läser som ett fat", men det talet mättes UTAN hals: en hals som försvinner
   bakom en bänk ÄR en person. Verifierat i bild.

**Två tysta passagerare hittades när `KANT_Y` flyttades — båda hade gått igenom `check`:**
- `BUS.ryNer = KANT_Y − ANS.y` växte 127 → 190 utan att någon rört buset, och `_kasta`
  läste därmed VARJE kast som bus: **0 av 8 kast nådde pappa**, noll konsolfel. Ellipsen
  räknas nu ur fotot (`BUS_NER`), och kastet är tillbaka på 7/7.
- Lagerdelningen `st.yta.y > KANT_Y` hade flyttat `lador` (y 438) från framgrund till
  bakgrund av sig själv. Ingen skillnad i bild (lådan står på x 1078, ön slutar 1064), men
  villkoret är nu en tillhörighetsflagga (`pa: 'on'`) i stället för en höjdjämförelse.

**Kvar (inget av det blockerar något):**
- Ägarens ursprungliga front-on-önskan om **kranen och spisen** ("ser bättre ut") är
  fortfarande ogjord — den var motiverad av utrymmet, och utrymmet löstes på annat sätt.
  Ta den som en ren utseendepost om ägaren vill ha den.
- Tuggklippens och klunkens snittpunkter är fortfarande valda på ljudstruktur, inte gehör.
- 147 bilder ur shoot 2 ligger bara i `ComfyUI/output`.

---

## 7. ARBETSORDER — allt som är kvar på Mata Pappa (skriven 2026-08-13, v1.201.0) ✅ KÖRD

Läs `docs/SESSIONS.md` och §6 först. **Två av de tre kvarvarande posternas premisser är nu
mätta**, så det här är körbart utan att något behöver undersökas om.

**Ägarens tolerans (uttalad 2026-08-13):** hudton, hår, ljus och exakt storlek/läge på
ansiktet behöver INTE vara perfekta — karaktären får tummas på i delar. Det är den regel som
gör A1 nedan billig: material ur den andra fotoshooten får blandas in i den befintliga riggen.

**Redan på plats (v1.201.0), gjort som förberedelse:**
- `scripts/ansikte.mjs` tar `kallor: { "<roll>": "<mönster>" }` i `roller.json` — en roll får
  peka på en ANNAN fotoserie än referensens.
- `tagna`-nyckeln bär numera KÄLLAN, inte bara numret (shoot 1:s #97 och shoot 2:s #97 är
  olika bilder; utan det kraschade körningen med `vald` = undefined).
- Blickblocket **94–104 ligger i `assets-src/ansikte/pappa/`** som `s1face2__000NN_.png`.
  Övriga 147 bilder finns bara i `C:epos\ComfyUI_Windows_portable\ComfyUI\output`.

---

### A1 · Blicken — pappa följer maten med ögonen  ⏱ liten

✅ **Mätt och klart att bygga.** En blicklapp ur shoot 2 lagd på shoot 1:s rigg:
- **Posen går att rätta:** de fyra provade blickbilderna riktade in sig på `rest`
  **0,023–0,025**, mitt i de 16 befintliga rollernas spann (0,013–0,034, median 0,024).
  Skala ~1,02, vinkel 0–1°.
- **Sömmen syns inte.** Lappen klippt med samma ovala mask som `ogon` och lagd på
  neutralansiktet: ingen synlig kant, ingen tonskarv (`.tmp-ansikte/_blickzoom2.png`).
- ⚠️ **Välj bilder med STARK avvikelse.** Första urvalet (#94 · #97 · #98 · #102) gav en
  irisförskjutning på några få px — knappt läsbar mot kontrollen. **#95 · #96 · #99** läser
  tydligt åt sidan och **#100 · #102 · #103** tydligt nedåt. Kontaktkartan räcker inte:
  döm i ögon-zoomen med "rakt fram" som kontrollrad bredvid.

Att göra:
1. `roller.json`: `kallor` för blickrollerna → `"s1face2__#####_.png"`, plus roller
   `blick_v` · `blick_h` · `blick_upp` · `blick_ner` (fler riktningar bara om de behövs —
   kunden är ett drag, alltså mest vågrätt).
2. `scripts/ansikte.mjs`: klipp lapparna ur **samma ruta som `G.ogon`** (243, 286, 280×108)
   med samma mjuka ellips, skriv `blick-<riktning>.webp` och lägg dem i `manifest.lager`.
   Kostnad: 280×108×4 ≈ **0,12 MB per riktning** i GPU (4 st = 0,5 MB).
3. `src/lib/ansikte.js`: `blick(dx, dy)` som korsbleknar in den lapp vars riktning ligger
   närmast, som `ogon` gör. **Lagerordning: `ovre` → blick → `ogon`/`ogon_v`/`ogon_h` →
   miner.** Blinkningen måste ligga ÖVER blicken (annars blinkar han med öppna ögon), och
   minerna över allt (de bär sina egna ögon).
4. Kunden: i `_update` när något dras — `blick((rec.tx − ANS.x)/300, (rec.ty − _munY)/200)`,
   klämt till ±1, och `blick(0, 0)` när inget dras. Gapet och `lutaMot` gör redan exakt det,
   så talen kan kopieras därifrån.
5. Verifiera i `node scripts/_ansiktebild.mjs --bara "vila,blick v,blick h,blick ner"` —
   **ett ansikte går inte att bedöma i tal.**

### A2 · Variantminer — samma min, olika foto  ⏱ liten

❌ Diff-beskärningen är mätt och förkastad (§6 + `scripts/_minprobe.mjs`) — den sparar 12 %.
Vägen är i stället **en lista i manifestet, val vid inläsning**, exakt som ljudets
`_sampleUrls`:
1. `ansikte.mjs`: en roll får skriva flera lappar (`min-sur.webp`, `min-sur-2.webp`), och
   `manifest.miner[roll]` blir ett FÄLT när det finns mer än en.
2. `laddaAnsikte()`: läs fältet, **välj EN variant per roll** och ladda bara den. GPU-kostnaden
   står då still (13,5 MB), disken växer ~50 kB per variant (budget 3072 kB, 799 kB använt).
3. Priset som ska stå i koden: varianten är låst per app-session (`_cache` lever appens
   livstid), inte per anrop. Det är avsiktligt — alternativet är 3× hela riggen i GPU.
4. Kandidaterna finns redan: `roller.json` listar 4 per roll och skriptet väljer i dag 1.

### A3 · Köket front-on + halsen  ⏱ STÖRST — gör den sist och ensam

Alla tal står i §6. Kort: **halsen finns redan i det gamla neutralfotot** (hakan slutar
ruta-y 695, halsen 700–785, kragen 785, axlar därunder), och det som döljer den är
`G.hakaTon` [636,700] + `KANT_Y` 616. Men bänkdjupet är taket — 171 px läser som "bakom en
bänk", 146 px läste som "ett fat", och en bakkant vid 440 ger 128 px med en 106 px djup bräda.
**Därför är posten en ritningsändring, inte en justering av `HALS`.**

Ordning som håller:
1. Rita om i `kok.js` `byggKok`: köksön (polygonen ~rad 530), diskbänken och spisen **mer
   framifrån** så toppytan blir grundare med avsikt. Brädan får bli grundare eller flytta ner.
2. Flytta `G.hakaTon` nedåt i `ansikte.mjs` (t.ex. [700, 780]) och kör `npm run ansikte`.
   ⚠️ `undre` (käken) ÅKER NER 40 px vid gap — halsen måste hamna i det statiska `bas`, inte
   i `undre`. Utökas rutan nedåt: gör det med en EGEN `hUt`, rör inte `RUTA.h` (se §6).
3. Räkna om ALLT som härleds ur `KANT_Y`: `BUS.ryNer` · `BRADA` · `PLATSER` · `MATARE` ·
   `bankX()` · lagerdelningen `st.yta.y > KANT_Y` · `hakskugga` · dräneringsrutan i
   `_vatskaTick` · puffen på rad ~1358. `FYSIK.golv` och `HO` ligger utanför.
4. **Träffytorna par för par** (P0 ≥96 px, ≥24 px mellan) — `npm run check` fångar inte det.
   Vänstra väggen rymmer exakt tre stationer på sina 404 px.
5. Verifiera: `node scripts/_kokprobe.mjs` · `_munprobe.mjs` · `_kastprobe.mjs` (kastet
   bygger på `BUS`-ellipsen och på att brädan har ansats åt sidan) · skärmdump.

### Grind innan commit
`npm run check` grön · `npm run test mata-munnen` 0 konsolfel · `_munprobe` · `_vaxelprobe` ·
`_handelseprobe` · `_kastprobe` · `_ansiktebild`. `test:all` om `src/lib/` rörts.
Bumpa MINOR, en commit per post, aldrig `git add -A`.

## 5. Status / loggar

- 2026-08-13 👁️ **Arbetsordern §7 KÖRD — blick, variantminer och hals** (`aecb18c` · `d60e5c4`
  · `94aecb3`, v1.202–1.204). Sammanfattningen med alla tal står i **§7b**. I korthet:
  pappa följer maten med ÖGONEN (`blick_v/h/ner`, 0,12 MB GPU per riktning, lappen på-eller-av
  eftersom halv alfa ger två irisar i samma öga); sju miner bär 2–3 foton med varianten låst
  per app-session (GPU oförändrat 13,5 MB); och han har fått en HALS — köksön skar förut mitt
  i skägget.
  ⚠️ Tre fynd som inte fanns i planen: **pose-måttet är blint för mimik** (tre gånger gav det
  identiska rest-tal åt kandidater som läser som olika miner — valet måste göras i bild),
  **två stickprov är inte ett spann** (hudnyckeln på ljushet såg bevisad ut på två punkter men
  tröjans veck når 152 och skägget 19, alltså total överlappning), och **`BUS.ryNer` var en
  tyst passagerare på bänkkanten** — den växte 127 → 190 när kanten flyttades och gjorde varje
  kast till bus: 0 av 8 kast nådde fram, utan ett konsolfel och med `check` grön.
  Sonder: `_kokprobe` +3 rader som låser skärlinjen mot hakan/halsen/brädan · `_munprobe` läser
  blicken med sidorna som varandras kontrollarmar · `_ansiktebild` mäter variantvalet över 12
  omladdningar med enlappsrollerna som kontroll. Statusen ✅/✅ oförändrad.

- 2026-08-13 🔊 **Ägarens ljudleverans: 34 klipp, slumpade varianter, tre nya händelser**
  (`20feffa` + `d3a0c64`, v1.200.0). Se §6 för resten av uppdraget.
  **Slumpen ligger i tjänsten:** ett manifest-värde får vara ett fält, `sample()` väljer bland
  de färdigavkodade och `_senast` minns valet så `sampleDuration()` svarar för det som just
  spelades. 18 nycklar, 6 med varianter (`pappa_prutt`×5 · `traff_hard`×5 · `traff_mjuk`×4 ·
  `svalj`×4 · `tugg_mjuk`×2 · `klunk`×2). §4:s väntelista är därmed tom — alla sju
  röstklipp och alla tuggklipp finns.
  **Nya händelser:** tryck på pappa (`pappa_huh`), maten tillbaka (`pappa_ehh`), prutten
  (`bonor` + `kal` alltid, fyra saker ibland). Lucka, gegga-plopp och sväljning fick klipp.
  ⚠️ **P0-fynd: `_mun` täckte ansiktet.** Släppmålet är en `static` nod med 130 px radie mitt
  över pappa, så ett tryck rakt på honom hade `e.target === _mun` och `_tomtTryck` bailade —
  den mest lockande ytan i bilden svarade inte på en pekning (`dod-traffyta`). Nu accepteras
  munnoden när inget är valt; håller barnet en bit är samma tryck tap-tap-matning.
  ⚠️ **Tre mätfällor i ljudimporten:** tuggklippen är SERIER och måste styckas (7,15 s ≈ 8–12
  tuggor mot spelets 3 per bit) · reservmåttet för klipp under 0,45 s får inte vara TOPPEN
  (gav +16,6 dB på en knapring som redan låg i nivå — nu RMS mot −19 dB) · avslutande tystnad
  är den som når filens SLUT, inte den sista som hittades (`cabinet_open` 1,77 s → 0,29 s).
  **Sonder:** `_klippprobe` 14/14 med kontrollarm före mätarmen (`kast` = en fil ger 1 unik
  längd över 40 spelningar; `klunk` utelämnad — båda varianterna är 0,38 s och längden kan
  inte skilja dem åt), ny `_handelseprobe` 8/8, ny `_matbild`.
  ⚠️ **Prutt-nycklarna heter `pappa_prutt`, inte `prutt`.** `bajs-och-kiss` rad 859 anropar
  redan `sample('prutt')` som knip-signal och faller på en ton (0,14 s, vol 0,08); hette
  klippen `prutt` hade den tysta signalen bytts mot en 2,3 s inspelning i ett spel som inte
  bett om något. Manifestet är app-brett — pröva alltid ett nytt klippnamn mot
  `grep -rn "sample?\.('<namn>')" src/`.
  ⚠️ **Två sondläxor:** `_matbild` visade att kålen var en **sköldpadda** (fyra symmetriska
  bladflikar läste som öron och fötter), och `_handelseprobe` läste `_ans._minNamn` — ett
  fält som inte finns — och skrev ut `null` bredvid ett grönt kryss.

- 2026-08-13 😀 **Fler miner, huvudgester och ljud som följer maten** (v1.199.0). Se §5d.
  Fyra nya miner (`gasp` · `chock` · `skeptisk` · `retas`) ur shootens oanvända 84 bilder,
  wink via halverat ögonlager, huvudgester i riggen (`nick` · `tveka` · `ryck` · `lutaMot`),
  `kyla()`, andningstakt som följer mättnaden, materialdriven tuggning i fyra profiler med
  ljud på käkens egen takt, sväljning, och kontinuerliga stationsljud
  (`AudioService.loop`, städat av `GameHost` som yttersta säkring).
  **Sonderna:** `_ansiktebild` fick andningsmätningen, gest-rutorna och `--bara`;
  `_munprobe` fick LUTA · TUGG · LJUD · EXIT-raderna (och `--trace`). `_vaxelprobe` 15/15,
  `_kokprobe` grön isolerat, `check` 0/0, `test:all` **73/73**, röstkön tömd (6 klipp).

- 2026-08-13 ✨ **Kökslyft 2 — ägarens polera-uppdrag** (`d709ca8`, v1.198.0). Tre delar:
  **volympass på allt ritat** (skafferiets 13 prylar, brädmaten 19/20, hamburgerbyggets 48/63,
  pizzabageriets 49/65 — allt via form.js-cacherna, silhuetter/API orört, alla fyra spelen
  testade gröna), **köket i högre detalj** (gardiner, moln, klocka, barnteckning, ugnsgaller,
  kryddhylla, krukväxt, ljusband; dörrdetaljerna ritas PÅ dörrarna så de följer med öppningen
  — och solen visade sig ha legat begravd bakom glasfyllningen sedan bygget), och **variation
  som växlar** (fönstret roterar fågel→fjäril→regnbåge · kastrullen kokar över efter ~9 s och
  läker sig själv · micron plingar · ketchup+senap hällbara · gegga-trappan · burk-bågning ·
  glid · skymten i tugget). Katalogen 54 → **64 saker**.
  **Kritikerns runda gav fem fynd, alla åtgärdade:** ⓵ skräpet på bänken kunde STJÄLA fingret
  från en aktiv matbit (högen landar i samma x-band som `PLATSER`, senare barn pekas först) —
  lösa vyer läggs nu under maten i pekordningen (`setChildIndex` strax över munnoden);
  ⓶ kryddhyllan och krukväxten låg bakom skalets ALLTID synliga hem/ljud-knappar — koden hade
  mätt mot spelets egna stationer men aldrig mot skalet; ⓷ senapen såg ut som ketchupen men
  gick inte att hälla (bruten orsak-verkan — nu i `VATSKOR`); ⓸ senap var en chili-repris —
  nu egen styrka + replik; ⓹ fjärilen var en prick — 1,35×.
  **Ny sond `scripts/_vaxelprobe.mjs` 15/15** med kontrollarmar FÖRST (allt släckt före tryck ·
  spis-av ackumulerar inte · ingen skymt före tugget · tidig fläck ger platsvalets min):
  rotationens tre utfall, vingslagen, kokar-över-räknarens laddning och nollning, skymtens
  födelse och städning, gegga-trappan, exit mitt i allt.
  ⚠️ Två sondläxor: en kontrollarm som läser på fast VARVINDEX missar när ett grepp
  misslyckas emellan (min-hållet på 1,3 s hann gå ut → `min null` utan att något var fel) —
  läs direkt efter varje LYCKAD händelse i stället. Och `_kokprobe`s mjuk-rad flakade 1 gång
  när tre sonder + test kördes i följd (2/2 grön isolerat) — samma lasttransient som §3 redan
  beskriver, ingen regression.

- 2026-08-13 🐞 **Ägarens speltest: fem punkter, fyra mekanismer ingen gissning hade hittat**
  (`a50d738` + `f36bef0`, v1.196–1.197). ÅTGÄRDER #8–#12, alla stängda. Sonder: `_busprobe`
  (8/8), `_hettaprobe` (7/7), `_hallprobe` (6/6).
  - **#8 "spottas ut … annan storlek och går ej att ta upp igen" var TVÅ fel med olika rot.**
    Munnen accepterar allt, så `DragController._resolveDrop` låste även en utspottad gaffel
    (`placed = true` **och** `eventMode = 'none'`; `_onDown` bailar dessutom på `placed`). Ett
    tryck på gaffeln greppade då en ANNAN sak. Ny `DragController.aterstall(view)`. Den andra
    halvan satt i `_ploppa`, som skickade geggans **miniatyr** (0,62) till bänken via en
    syntetisk `rec` som aldrig fanns i dragets register. ⚠️ **Skalan i spott-vägen var aldrig
    fel** (1 → 1) — halva rapporten hade en helt annan orsak än den såg ut att ha.
  - **#9 "flytande skugga": det fanns ingen skugga.** `Mjukkropp.knuff` flyttar `p.x/p.y` men
    inte `p.px/p.py`, och i verlet ÄR det en fart. Med `grav: 0`, inga pinnar och inget golv
    gled kleten **62 px rakt ner** från sin matbit och blev en fristående oval under den.
    `knuff(…, { form: true })` + `flyttaTill()` som förankring: **0,0 px mot 62,1** i
    kontrollarmen, viloformens höjd orörd.
  - **#10 sekundärt utseende** — premissen prövad först och den höll: maten går INTE att
    deformera (4–7 lagrade `Graphics` per rätt, ingen silhuett, `generateTexture` förbjudet).
    Byggt som en **behandling**: kladdiga saker trycks ihop mot huden (1,14 × 0,78) och får
    rinnmärken som växer över 0,7 s; hårda saker (köksprylar + sex busdjur, ny `hard`-flagga)
    kilas fast i en större vinkel och får en kontaktfläck i stället för en pöl.
  - **#11 vätskan går att hälla.** Regeln är den enklaste en tvååring hittar själv: håller du
    den lutad över något, rinner det. ⚠️ Lutningen skrivs på `rec.restRot`, aldrig på
    `view.rotation` — `_dragTick` skriver det fältet varje bildruta.
  - **#12 chilin** — riggen fick `hetta(t)` (tint på alla 14 lager) och `oron()`.
  - **#13, hittat på vägen och inte rapporterat:** bus-ellipsen nådde y=518, alltså ut på
    skärbrädan (maten ligger på y=505). Mat som lades TILLBAKA klassades som ansiktsträff och
    ritades bakom öns förgrund — den bara försvann. Nedre halvan slutar nu vid `KANT_Y`.
  ⚠️ **Sonderna var fel tre gånger innan koden var det:** en drift mätt mot fel nollpunkt
  (kroppens tyngdpunkt ligger 15 px från det `(x, y)` man ber om), ett prylfilter som var en
  namnlista i stället för `atbar`, och ett symmetrikrav kring fotorutans mitt när huvudet
  ligger 3 px höger i den.

- 2026-08-13 🔊 **Citronen fick sin egen röst — och berättaren slutade prata över pappa**
  (`1e2b630`, v1.195.0). Ägaren spelade in det nionde klippet, så `sur` delar inte längre röst
  med `fundersam`. Punkten under är därmed stängd.
  Klippet är **1,90 s — det längsta av de nio** — och består av tre ljudpartier med pauser
  emellan. Alla tre ligger **inom 4 dB** av varandra, alltså är det röst hela vägen och det finns
  inget andetag att kapa (till skillnad från fem av de åtta förra). Nivå −18,5 LUFS, i linje med
  de övriga, 1,0 dB begränsning.
  ⚠️ **Längden avslöjade två fel av samma familj som finalens tidtabell.** Båda är fall av att en
  schemaläggning som stämmer mot en 0,3 s stämd reserv **inte är prövad** mot klippet som ska
  ersätta den:
  1. `_sag` och `_replikEfterMin` startade i **samma ögonblick**, och för `sur` är
     berättarrepliken ovillkorlig (*"Oj! Vad surt det var!"*). Med en ton var det ofarligt; med
     1,90 s inspelning är det **två svenska röster samtidigt** för ett barn som ska förstå vem
     som pratar. Repliken väntar nu ut pappa.
  2. Minen hölls 1,4 s medan klippet är 1,90 s — ansiktet hann bli **neutralt mitt i hans egen
     sura reaktion**. Hållet har nu ett golv på klippets längd.
  Båda talen kommer från nya **`AudioService.sampleDuration(namn)`**, som läser den avkodade
  buffertens längd. Ett hårdkodat tal hade drivit isär från filen vid nästa omtagning.
  **`_klippprobe` 8/8** (9/9 i `harSample`, 9/9 `sample()` = true, **0 tone-fallback**,
  `sampleDuration` 9/9 > 0,3 s) med kontrollarm åt båda hållen. `_munprobe` grönt · `test:all`
  73/73.
  ⚠️ Första svepet gav 72/73 (`golvet-ar-lava` + `glittergrottan`, båda med *"WebGL context may
  be lost"* = ÅTGÄRDER V14b/V15:s kända signatur). **Inte attribuerbart:** båda gröna ensamma,
  andra fulla svepet 73/73 med samma kod, och svepet FÖRE ändringen bar redan åtta av de nio
  klippen.

- 2026-08-13 🔊 **Pappa har fått sin egen röst — åtta inspelade klipp** (`9bb3400`, v1.194.0).
  Ägaren spelade in alla åtta på telefonen (sju `.m4a`, rapen `.mp3`). Konverterade till appens
  format (mono 24 kHz 96 kbps mp3) och inlagda i `public/audio/sfx/manifest.json`. Den stämda
  reserven i `ROST` ligger kvar orörd — den är vad någon utan filerna hör.
  **Klippunkterna är mätta per fil**, inte satta av en regel: fem filer bar ett andetag
  **23–30 dB under rösten** före själva ljudet, medan `Fniss` tvärtom bar sitt **starkaste**
  skratt först (−9,9 dB) med svagare fniss efter. En regel som "hoppa fram till det ljudstarka
  partiet" hade alltså kapat just den filens skratt. Längder efter klipp: **0,72–1,28 s**, alla
  inom minens fönster (0,12 + `hall` + 0,22 ≈ 1,64 s).
  **Nivån tog tre försök och de två första var mätbart sämre.** ⓵ `loudnorm` i dynamiskt läge
  komprimerar rösten själv på ett 0,7 s klipp, och lade ändå tre klipp på 0,0 dB topp (dess
  −1 dBTP mäts FÖRE mp3-kodningen; lame skjuter över). ⓶ Fast förstärkning med hårt topptak gav
  ingen kompression men **topp-begränsade fyra klipp**: `pappa_aaah` (chilin) och `pappa_aj`
  landade **4,6 dB under** det neutrala `pappa_ohh` — tvärtemot avsikten, för vassa transienter
  äter takhöjden. ⓷ Fast förstärkning till målet + en mjuk begränsare: **alla åtta inom 0,4 dB**
  (−18,4…−18,8 LUFS), begränsning 0–2,6 dB, toppar −2,4…−9,6 dB. Ursprungsspridningen var **17 dB**.
  Målet −18 LUFS är `djur_hund.mp3`s nivå — appens enda andra INSPELADE klipp. (Appen
  normaliserar inte per klipp: `_playSample` sätter `gain = masterVolume` rakt av.)
  ⚠️ **Finalens tidtabell var byggd för toner och gick sönder av riktiga klipp.** Extrarapen och
  skrattet startade i **samma ögonblick** — `ctx.later(0.5)` + `later(0.7)` = 1,2 s, och skrattet
  stod på 1,2 s. Med 0,3 s stämda toner lät det som ett ackord; med `pappa_rap` (1,10 s) och
  `pappa_fniss` (1,26 s) lät det som två pappor. Avstånden är nu **klippens längd** (1,15 s) och
  skrattet väntar tills rapandet är slut — en rap eller två.
  **Verifierat med `scripts/_klippprobe.mjs`, 6/6 gröna med kontrollarm åt båda hållen:** 8/8 i
  `harSample()`, 8/8 `sample()` = true, **0 tone-fallback**, och en okänd nyckel både nekas och
  går inte att spela. Utan den sista raden hade "alla åtta finns" lika gärna kunnat betyda att
  `harSample` svarar ja på vad som helst.
  ~~⬜ **Kvar (ägarbeslut):** `pappa_ohh` bär fortfarande BÅDA minerna `sur` och `fundersam`.~~
  ✅ **LÖST samma dag** — ägaren spelade in `pappa_surt`, se raden ovan (v1.195.0).

- 2026-08-13 🆕 **Byggt och mätt** (v1.186.0). Se §3. Delad kod som följde med:
  `games/mata-monstret/food.js` → **`src/lib/mat.js`** (andra kunden), med `lemon` och `chili`
  som nya ritningar i `MAT_STARK` — medvetet UTANFÖR `FOODS`, eftersom `mata-monstret` väljer
  favoritkategori ur den listan och en fjärde kategori tyst hade ändrat balansen i ett spel som
  inte bad om något. Nytt i riggen: `Ansikte.slappMin()`. Nytt i tjänsten:
  `AudioService.harSample(namn)` — utan den hade varje tugg flaggat `saknat-ljudklipp` i
  testloggen och dränkt de fynd som är riktiga.
