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

⚠️ **Ögon-följningen är STRUKEN** (ägarbeslut 2026-08-13): blickserien i 8 riktningar finns inte
i fotomaterialet — alla 129 bilder tittar mot kameran eller blundar. Ansiktet lever på blink,
andning, käkens gap och minerna i stället.

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
- ⬜ **VÄNTAR PÅ ÄGAREN — sju klipp till.** Namnen finns redan i koden och `harSample()`
  frågar först, så varje fil tas i bruk i samma sekund den ligger i `public/audio/sfx/`
  (lägg till den i `manifest.json` på samma sätt som de nio första). Tills dess låter den
  stämda reserven. Tyst rum, ett uttryck per fil, samma avstånd till mikrofonen som förra
  gången (målet är −18 LUFS, samma som de nio befintliga):

  | fil | vad | används när |
  |---|---|---|
  | `pappa_gasp.mp3` | en gäspning, gärna med ett litet ljud på slutet | vilo-cue:n var åttonde gång |
  | `pappa_chock.mp3` | ett kort "AAH!" av förvåning | något hårt landar i ansiktet |
  | `pappa_hmm.mp3` | tveksamt "hmmm…" | okänd mat (`skeptisk`) |
  | `pappa_retas.mp3` | busigt "bläää" med skratt i | bus under ögonlinjen (`retas`) |
  | `pappa_svalj.mp3` | en tydlig sväljning | efter sista tuggan, varje bit |
  | `tugg_knaprig.mp3` | ETT knaprigt tuggljud (morot/chips) | spelas 5× per knaprig bit |
  | `tugg_seg.mp3` | ETT segt smaskljud (kola/ost) | spelas 2× per seg bit |
  | `tugg_mjuk.mp3` | ETT mjukt tuggljud | spelas 3× per vanlig bit |
  | `klunk.mp3` | en klunk | saft, mjölk, ketchup, senap |

  ⚠️ **Tuggklippen ska vara ETT tuggljud var, inte en serie.** Spelet spelar dem en gång per
  sammanbitning på käkens takt (mätt: 3 sammanbitningar för mjuk mat, 2 för seg). Ett klipp
  med tre tuggor i hade gett nio.
  ⚠️ **Kranen, spisen och fläkten kan också få klipp** (`kran` · `koka` · `flakt`) — de måste
  då vara **sömlöst loopbara**, för de spelas som en oändlig slinga. Den syntetiska bädden
  (filtrerat brus) är fullt duglig och behöver inget klipp.

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

## 5. Status / loggar

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
