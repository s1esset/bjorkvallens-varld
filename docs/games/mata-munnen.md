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
