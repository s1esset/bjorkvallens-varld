# Unika Knytt (`unika-knytt`)

> roligt · tap · 2–5 · 📝
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

⬜ **Inte byggt ännu.** Det här är planen som skrivs FÖRE koden (husregeln i `docs/PIPELINE.md`).
Källmaterialet — ägarens Gemini-konversation — ligger kvar orört i
[`_kalla-unika-knytt.md`](_kalla-unika-knytt.md). Den är råmaterial, aldrig plan: dess
gränssnittslager är byggt för en annan produkt (stående telefon, 3–8 år, reglage, gyroskop,
gacha) och tre av dess val fäller `npm run check` med exit 1. Vad som behölls, vad som ströks
och varför står i **§2**.

## 0. Spec (fylls i av `/spel` innan kod skrivs)

| | |
|---|---|
| **id** | `unika-knytt` |
| **titleSv** | Unika Knytt |
| **icon** | 🥚 |
| **kategori** | roligt → flik Roligt |
| **input** | `tap` — **medvetet val, inte en beskrivning.** `mixed`/`drag` ger NOLL autotryck i harnessen (`test-games.mjs`), och då blir hela kärnloopen grön och oprövad. Med `tap` avfyras de nio standardtrycken, och layouten i §1 är ritad så att alla nio landar på en riktig kontroll. Knådningen är ett drag men alltid frivillig. |
| **ålder** | [2, 5] |
| **kärnloop** | Barnet fyller en glaskupa med en liten värld genom att sköta sex ritade maskindelar — varje del GÖR det den ändrar (kranen glugger färg ner i ett glasrör, bälgen blåser upp klumpen, veven öppnar en lucka så vädret ramlar in). Sedan: dra i mässingsspaken → allt sugs in → en degklump som barnet KNÅDAR med fingret → den härdas, lyfter, glöder, skjuter strålar, växer → POP → ägget faller → barnet knackar fram knyttet. |
| **mål** | Ägget kläcks: skalet klyvs, **världen strömmar ut** och vecklar ut sig till en hel miljö, och knyttet föds stående mitt i den. `progress.complete()` + knyttet flyttar in i Knyttboden. |
| **agens** | Sex oberoende val (10 färger × 4 storlekar × 6 mönster × 4 världar × 5 röster × 4 gnistnivåer = **19 200 recept**), var och en synlig i kupan i samma bildruta som trycket. Valen STYR dessutom slumpen: ett snörecept drar mot iskristallöron, ett skogsrecept mot lövöron. |
| **variation** | Fröet härleder både VILKEN del (7 tabeller, 16 200 uppsättningar) och dess PROPORTIONER (22 kontinuerliga drag, §6c) — viktat av barnets val. **8,25 × 10¹³ distinkta individer**; risken att se två identiska på 200 knytt ur samma recept är 0,00046 %. Nya delar låses upp vid 4 / 8 / 12 / 16 kläckta. |
| **mottagare** | Bobo står vid spaken och sköter maskinen (rigg ur `lib/karaktarer.js`), och Knyttboden tar emot: alla tidigare knytt andas, blinkar, kvittrar till varandra och vinkar när barnet kommer tillbaka efter ett dygn. |
| **finish** | Kläckningen: skalet klyvs i två halvor som far iväg med fjäderfysik, världen strömmar ut ur ägget och vecklar ut sig (mark, himmel, fyra rekvisita, partiklar), knyttet reser sig med `bounceIn` och gör tre glädjeskutt, och en ram svänger in BAKOM det. |
| **motgång** | **Ingen i leverans 1 — med flit** (ägarens beslut 2026-08-30). Motgången kräver att barnet DRÖJER i verkstan, och den tiden är omätt. Leverans 1 mäter uppehållstiden; är den >20 s byggs **Skrället** (§4b), är den <12 s byggs ingen alls. Imma-på-glaset är förkastad. |
| **sällsynthet** | Ägarens tal exakt: **guld 2 % · silver 5 % · brons 10 % · vanlig 83 %**, rullat FÖRE spaken dras. Stjärnstoftsburken höjer chansen synligt, med tak +5 pp (17 % → 22 % skimmer; guld bara 2,00 → 2,50 %). Första kläckningen någonsin är garanterat brons. Ingen räknare, ingen procentsats, inga låsta siluetter. Vanliga knytt får något ett skimrande aldrig får. Se §3b. |
| **samling** | **Knyttboden** — en RULLANDE POPUP som bara visar de knytt man FÅTT, aldrig tomma platser. Fyra världshyllor (Skogen · Vattnet · Snölandet · Stjärnnatten) + Skimmerhyllan; hyllplan staplas nedåt, 4 bon per plan, och ett plan finns först när det har ett knytt. Knyttet är större än boet — en fågel i ett bo, aldrig ett föremål i en låda. |

**Röstrepliker**

Alla måste in i `scripts/voice-phrases.json` och genereras med `npm run voice` innan grinden kan bli grön.
Varje rad är en HEL mening och en literal i `voice.say('…')` — inget byggs vid körning.

```
"Här bygger vi en liten värld åt ett nytt knytt!"
"Tryck på maskinen och se vad som händer."
"Dra i spaken när du är klar!"
"Nu blandas allt ihop till en mjuk deg!"
"Knåda degen med fingret så lyser den mer!"
"Titta så ägget lyser och växer!"
"Poff! Nu ramlar ägget ner."
"Ett ägg! Knacka på det!"
"Knacka en gång till på ägget!"
"Titta, hela världen kommer ut!"
"Vilket fint knytt du gjorde!"
"Ditt knytt har fått en liten kompis med sig!"
"Oj, vad det glittrar!"
"Här bor dina knytt."
"Titta, dina knytt har saknat dig!"
"Tryck på ett knytt så vaknar det."
"Nu sover det. Väck det försiktigt!"
"Tryck på spaken igen så gör vi ett nytt knytt!"
```

## 1. Nuläge (sett som spelare) — målbilden

### Verkstan

Ett varmt rum i trä och mässing (`createScene('warm')` + egen maskin i fyra toner, så ingen
enskild kvantiserad yta kan närma sig `bildkoll`s 45 %-tröskel för `heltackande-falt`). Mitt i
rummet står **kupan** — en glasklot på en sockel, med en öppen mässingskrage upptill så det
läser som en PLATS, aldrig som en ram runt en bild. Inuti svävar en liten blobb med två stora
ögon som följer fingret.

Runt kupan sitter **sex ritade maskindelar**. Ingen av dem är en pilknapp — det är
`bygg-en-kompis` vokabulär och den ägs redan. Varje del UTFÖR det den ändrar, i samma bildruta
som trycket:

| | Del | Vad den ändrar | Vad som händer vid ett tryck |
|---|---|---|---|
| T1 | **Färgkranen** | färg (10) | Trähandtaget klackar ett kvarts varv, kranens pip öppnas och en klick färgad knyttgegga glugger ner genom ett synligt **glasrör** och plaskar över blobben, som tvättas om på 0,25 s. |
| T2 | **Stjärnstoftsburken** | gnistor (0–3) | Burken tippar i sin vagga, stjärnstoft rinner ner som en tunn stråle, och EN gnista föds som lägger sig i omloppsbana över receptskenan. Fjärde trycket: tomt skrammel, burken vänder sig upp och ner. Roligt, aldrig ett misslyckande. |
| T3 | **Bälgen** | storlek (4) | Trätrampan slås ner, en synlig luftpuff skjuter genom en slang in i kupan och blobben blåses upp ett steg. Femte trycket: en lång pfffff och blobben tömmer sig tillbaka till minst, med en generad blick. |
| T4 | **Mönsterhjulet** | mönster (6) | Trätrumman ratschar 60° med ett klack, och motivet som rullar upp TRYCKS på blobben av en färgvals som sveper vänster→höger på 0,30 s. |
| T5 | **Väderveven** | värld (4) | En lucka i taket över kupan öppnas och vädret ramlar IN — snö virvlar ner, löv lägger sig, vatten stiger, natten tänds. Kupans himmel, mark och ljus byter tema i samma sekund. **Bestämmer också vilken hylla knyttet hamnar på.** |
| T6 | **Ljudtratten** | röst (5) | Grammofontratten lutas mot kupan och blobben öppnar ett munhål och SJUNGER sin fras — tre stämda toner. Knyttet föds med den rösten. |

Till höger står **skaparspaken** i mässing med en fet röd knopp, och nere till vänster en liten
**bodlucka** där ett knytt kikar ut var åttonde sekund. Bobo står vid spaken och sköter maskinen.

**Vilohjälp i tre steg** (`HINT_S = 7`, modellen är `bygg-en-kompis` och `roliga-snurran`).
Verkstan är den enda skärmen med en icke-uppenbar nästa handling — hela belöningen ligger bakom
att hitta spaken, ett föremål av nio. Den här åldern letar inte av en skärm.
*Steg 1* (7 s stilla, noll val): närmaste maskindel hoppar och spelar sin ton.
*Steg 2* (7 s stilla, ≥1 val): spakens röda knopp studsar med ett ritat handpiktogram över sig
— **samma piktogram som på ägget**, så det är en inlärd symbol redan andra gången.
*Steg 3* (7 s till): samma sak plus en `ripple()` vid knoppen och rösten.
Aldrig ett tjat, aldrig ett automatiskt drag.

**Kupan är inte en lockbete.** Det största, ljusaste, mest animerade föremålet på skärmen får
inte vara det enda som saknar verkan — en 2-årings hand går dit först. Ett tryck på glaset
skakar hela förhandsvisningen: blobben byter **synligt och komiskt** siluett (öron spretar ut
med ett boing, en svans piskar fram), föremålen guppar, `sfx('pop')`. Det är samtidigt
**omrullningen av fröet** — barnets "en till, men annorlunda" — och det gör kupan till spelets
mest tillfredsställande yta i stället för dess största döda.

### Förhandsvisningen — separat OCH sammanfattat

Ägarens punkt 2 begär att valen syns *var för sig* och *som en sammanfattad värld*. Kupan gör
båda i samma bild, utan en enda lista och utan läsning:

* **Var för sig** — varje sak som åker in behåller sin egen siluett och sin egen ankarplats:
  regnmolnet driver och regnar faktiskt, solkulan vrider sig, trädet vajar på golvet, stenen
  ligger blick stilla, natten hänger överst och gnistrar. Samma sak två gånger skriver inte
  över — en andra klump växer bredvid den första. "Mer av det" syns som fler föremål, aldrig
  som en siffra.
* **Sammanfattat** — samma val driver fem kontinuerliga världsskalärer (`vatt` · `varm` ·
  `grono` · `sten` · `natt`) som blandas över hela interiören: himlen blir blåare, marken
  våtare, gräset högre, ljuset varmare, stjärnorna tänds. Allt via `lerpColor` och **cachade**
  gradienter ur `form.js` — aldrig en `new FillGradient` per ändring.
* **Blobben ÄR sammanfattningen.** Dess färg är HSL-blandningen av världen, klampad in i en
  sötma-envelopp (S 0,52–0,80 / L 0,56–0,72) så en slumpad varelse alltid blir gullig.

### Ceremonin (~6,5 s) — och den är ALDRIG mörk

Rummet släcks aldrig; kupan dämpas som mest 18 % och strålarna ADDERAR bara ljus.

| Fas | Tid | Vad som händer |
|---|---|---|
| **F0 Spaken** | 0,00–0,35 | Armen svänger ner 62° med ett djupt KA-CHUNK. Kupans lock fälls upp. De sex delarna **viks fysiskt ner i bänken** och blir `eventMode='none'` — ett synligt lås, aldrig en utgråad knapp. |
| **F1 Suget** | 0,35–1,55 | Moln, sol, träd, sten, måne, alla stoftkorn och blobben spiralar in mot mitten, krympande och accelererande. Ljud: EN brus-loop plus en **trappa av korta toner** (330·392·466·554·659 Hz) — en loops frekvens är låst efter start, så ett stigande sug måste byggas så. |
| **F2 Degen** | 1,55–3,60 | En `Mjukkropp` knådas. **Barnet knådar med fingret**: varje beröring ger `knuff(px,py,7,70,{form:true})`, ett squelch-ljud och en färgad puff. Knådningen köper SPEKTAKEL, aldrig framsteg — degen härdas på sin egen klocka oavsett. |
| **F3 Härdning & ljusstorm** | 3,60–5,30 | `mjukhet()` 0,8 → 0 medan viloformen lerpas till en äggprofil över 90 bildrutor. Ägget lyfter, växer 1,00 → 1,35 och skiftar färg. Bakom: 14 strålkilar i EN `Graphics`, **normal alfa 0,18–0,30** (additivt över appens creme vitklipper 74,3 % av pixlarna — uppmätt), roterande, med total täckning under 30 % av duken. |
| **F4 Poppen** | 5,30–5,75 | En vit blomning **bara på ägget** (aldrig helskärmsblixt), `sfx('pop')`, `burst`, `sparkle`, `ripple`. |
| **F5 Fallet** | 5,75–6,50 | Ägget faller ner i ett ritat bo, landar med `landa()` + dammpuff och vaggar ±0,05 rad. **Vaggningen ligger på en BARNNOD** så träffytan aldrig flyttar sig. |

**Vid 4,40–4,60 s** — när harnessen tar sin skärmdump — står spaken orörd (inget av de nio
standardtrycken ligger i dess träffyta, se layouten nedan), så bilden är den ljusa verkstan med
en levande värld i kupan. Och skulle en sond ändå dra spaken vid t≈0 landar 4,45 s mitt i F3:
ett glödande protoägg med roterande strålar över ett fortfarande ljust rum. **Båda fallen är
lagliga bildrutor, med flit.**

**Varje tryck under ceremonin** går till en heltäckande fångare bakom allt: `kvittera()` +
`sfx('tap')` inom 100 ms vid fingret, plus ett stoftkorn som flyger mot degen — och degen
svarar med en liten `knuff()`. Ingen bildruta i hela sekvensen är en död träffyta.

**Trycken skyndar också på.** Varje tryck kortar återstående tidslinje med 0,12 s, tak 1,2 s
totalt. Barnets petande är därmed både en leksak och ett riktigt handtag på takten — och en
5-åring som sett ceremonin tjugo gånger kan skynda på den utan att någonting går förlorat.

**Och den går att hoppa över:** ett ANDRA tryck på spaken slår maskinen i botten med ett stort
KA-CHUNK och hoppar direkt till äggfallet. Utfallet är redan rullat vid spakdraget, så
ingenting står på spel. Det ersätter en tidigare "boing + ångpuff", som var en återvändsgränd
utklädd till återkoppling.

### Kläckningen

Ägget ligger på (640, 470) med `hitArea = Circle(0,0,120)`. Alla andra kontroller är nerfällda
och `eventMode='none'`, så P0-avståndet är uppfyllt genom frånvaro.

**Fyra tryck, fast antal** — ett slumpat 3–5 gör att en kläckning känns längre än en annan utan
synlig orsak; fyra låter en 2-åring bemästra det till andra ägget.

1. Squash, `tone(440)`, en 3-segments spricka ur knyttets EGET frö (sprickmönstret är en del av dess identitet), tre skalflisor puffar av.
2. Squash, `tone(466)`, sprickan växer till 6 segment med en gren, ägget vaggar hårdare.
3. Squash, `tone(494)`, 9 segment och två grenar, och tunna ljuslinjer i världens egen färg börjar läcka ut. Ett lågt brum stiger inne i skalet.
4. **Kläckning.**

En 0,18 s spärr hindrar en snabb knackare från att hoppa över dramatiken — men ett oräknat
tryck är **inte tyst**: det ger squash, en skalflisa och ett litet klickljud. Skillnaden mellan
takt och den uppmätta P0-överträdelsen `dod-traffyta` ligger exakt där. Ingen timer, ingen
gräns, inget sätt att misslyckas. En hand-piktogram studsar över ägget från 1,2 s och igen efter
3 s tystnad.

### Världen kommer ut

Ägarens punkt 6 tagen bokstavligt, och skälet till att det här inte är en varelsemakare med ett
kort påklistrat:

* Skalet klyvs längs sprickvägen i två halvor som far iväg med fjäderfysik (speglade med
  rotationens TECKEN, aldrig `scale.x = -1`).
* **Världen strömmar ut ur ägget** — molnet, solen, trädet, stenen och månen som barnet la in
  åker UT, i en båge, och vecklar ut sig till en hel miljö: mark som växer ut åt sidorna, fyra
  rekvisita som poppar upp med `bounceIn` i 0,12 s förskjutning, partiklar som fyller luften.
* **Först därefter** reser sig knyttet ur skalhalvan med `bounceIn`, gör tre glädjeskutt och
  landar vänt mot barnet, stående på VÄRLDENS mark — inte på ett kort, inte i en ram.
* En ram svänger in BAKOM det. Knyttet står kvar framför.

**Och sedan stänger loopen — i verkstan.** Ceremonin slutar aldrig med att barnet flyttas till
en annan skärm: knyttet klättrar upp på **arbetsbänken**, kör sin glada slinga där, och barnet
skickar hem det genom att trycka på det (det skuttar in genom bodluckan, som svänger upp och
visar stubben). **Verkstan är alltid startskärmen**; boden nås bara medvetet genom luckan.
Utan den regeln måste ett barn känna igen en trälucka som *navigation* i stället för *ännu en
leksak* direkt efter spelets bästa tjugo sekunder — och då stannar loopen.

**Kupan töms av kläckningen**, och det är tematiskt exakt rätt: världen åkte IN i ägget och kom
UT som miljön. När kortet lämnas står rummet med tom kupa, uppfjädrad spak och sex utfällda
maskindelar — redo för nästa recept. (Utan den regeln vore rundan 2 odefinierad, och på den
enklaste läsningen skulle kupan öppna full och det åttonde valet studsa bort — hela
bygg-en-värld-loopen död från spelomgång två.)

### Kortet — en fond, inte en låda

Det här är den enda platsen där P0 `ASSETS` kan brytas: en varelse som står PÅ ett samlarkort är
precis den förbjudna "ikon i en ruta". Lösningen är att kortet **aldrig omsluter**:

* Plattan bär knyttets EGEN värld (himmelsgradient, markband, drivande partiklar) — det är
  sceneri, samma sak som `createScene` ritar, inte ett spelobjekt i en box.
* **Underkanten är öppen.** Knyttet står FRAMFÖR plattans plan med fötterna nedanför dess
  underkant, på bordet, med egen kastskugga.
* Öron, horn, svans och vingar går regelbundet utanför ramen, och när knyttet är glatt hoppar
  det helt ur den.
* En namnplakett i trä nedtill bär knyttets genererade namn. **Det är den enda texten i hela
  spelet**, och den behöver aldrig läsas.

**Folien** (ägarens punkt 8) — ren Pixi, inget filter, ingen three.js: ett **cachat linjärt
flerstoppsband per tier** (modulnivå-Map per färg) sveps diagonalt under en **mask klippt ur
kortets egen ritade geometri** — exakt `vandkort`s mönster. Normal alfa, aldrig additiv.
Knyttet ligger UTANFÖR masken, så folien sveper aldrig över ansiktet: det är ägarens
"foil-mask håller ansiktet matt", löst med geometri i stället för en shader.

Varje tier har dessutom en **fysisk** skillnad, inte bara en ton — brons: en hamrad kopparlist;
silver: regnbågskantljus + tre drivande gnistor; guld: en solkrona av åtta korta strålar bakom
ramen som andas, plus en gloria med eget gupp ovanför knyttets huvud. **Ett guldknytt går att
känna igen på siluetten, inte bara på skimret.**

### De fem slingorna

En regel styr allt: **varje gest äger sin egen skalär, och EN `_apply()` summerar dem en gång
per bildruta.** Fyra skrivare på en transform = ingen av dem. `feedback.liv()` (äger y+rotation)
och `breathe()` (äger scale) används därför ALDRIG på knyttriggen.

1. **idle** — andning `sin(t·ω)·0,04`, ω seedat 1,4–2,2 och modulerat av världen (sten = trögare, natt = piggare); pupillerna följer fingret; öron och svans släpar 0,5 rad efter kroppen; slumpad blick var 3–5 s; blink var 3,5 s ±1,2.
2. **glad** — vid tryck: tre skutt, `rotation = sin(t·12)·0,12`, ögonen kniper ihop till ∩-bågar, kinderna +40 % alfa, munnen till 1,0, och knyttets **eget fyrtonsmotiv** spelas.
3. **lekfull** — vid drag: kroppen lutar efter fingret med tröghet och fjädrar tillbaka vid släpp; öron och svans piskar ×2,5.
4. **sömnig** — efter 20 s: andningen ×0,5, kroppen sjunker 15 px och plattas, ögonlocken till 70 %, en procedurgäspning var ~8 s.
5. **sover** — efter 12 s till: locken helt slutna som två ⌣, mycket långsam djup andning, och **världens egna partiklar blir sömnkorn** som stiger i sicksack (vattenbubblor, glöder, sporer, stjärnor). Vilket tryck som helst väcker det med en stor förskräckt pop — rolig, aldrig en skräck.

### Knyttboden

En snidad trävägg med fem hängande skyltar, nådd genom bodluckan. Fyra världshyllor +
**Skimmerhyllan**.

**Boden är en RULLANDE POPUP som bara visar det man fått** (ägarens beslut 2026-08-30, och det
är den bästa enskilda ändringen i hela planen). Ett tryck på en skylt öppnar en overlay med
hyllplan staplade nedåt, 4 bon per plan, som rullar. **Det finns inga tomma platser alls** —
ett hyllplan existerar först när det har ett knytt, och listan slutar där samlingen slutar.

Varför det löser mer än det ser ut att göra:
* **FOMO försvinner vid roten.** Tidigare versioner brottades med tomma bon, låsta siluetter
  och "12/50". Visar man bara det man HAR finns ingen frånvaro att visa. P0:s FOMO-förbud blir
  uppfyllt av strukturen i stället för av en regel.
* **8-taket försvinner.** Ingen paginering, inget trävred, ingen vräkning att ens fresta.
  Samlingen växer nedåt så länge det finns knytt (taket 200 står kvar som lagringsgräns, och
  200 × 27 byte = 5,4 KB).
* **Skimmerhyllan blir ärlig.** Guldplanet finns inte förrän du har ett guldknytt — vilket är
  exakt alternativ (c) i den gamla §8-frågan, men lösning i stället för kompromiss.

⚠️ **Rullning under P0.** P0 förbjuder `snabbsvep-nav`, men `DESIGN.md` §8 tillåter mjukt
axellåst drag på en INNEHÅLLSyta. Kopiera `LibraryScreen`: axellås vid ~12 px på
`globalpointermove`, plus en `scrolling()`-vakt som gör att ett drag aldrig kan öppna ett
knytt. **Och en tap-väg måste finnas** (P0 kräver tap-tap-fallback): två 96 px pilknappar
▲ / ▼ som stegar ett hyllplan i taget, för ett barn som inte kan dra.

Ett bo är en oregelbunden halmskål, och **knyttet som står i det är högre och bredare än boet**
med sin siluett väl över kanten — en fågel i ett bo, aldrig ett föremål i en låda.

* **Alla synliga knytt LEVER** — de sju sovande delar en enda andningstidslinje, det framme
  körs med hela femlägesriggen. (`_stillaprobe` kommer att flagga spelet som rörligt i vila.
  Det är korrekt och avsiktligt — skriv in det här så ingen "fixar" det senare, och kör
  `_vilkaprobe` för att bevisa att det som rör sig ÄR knytten.)
* **De pratar med varandra.** Var 5–9:e sekund lutar sig ett grannpar mot varandra och kvittrar
  sina motiv i tur och ordning. Högst en växling åt gången, aldrig medan barnet rör skärmen.
* **Favoriten står framme** och sparas, så nästa gång appen startas står barnets favorit redan
  där och gör sin glada slinga.
* **De har saknat dig — utan skuld.** Har ≥1 dygn gått vänder sig alla framåt och vinkar en
  gång. **Ingenting vissnar, ingen mätare sjunker, frånvaro kostar aldrig något.**
* **Ingenting vräks, ingenting tas bort.** En tidigare version av planen lät det äldsta knyttet
  "vinka hej då och skutta ut i skogen" när en hylla blev full. Det var en **motsägelse mot
  spelets eget löfte** ("bor hos dig") och mot P0 (`ALDRIG … nollställer`, och `GRIND` kräver
  hållgrind före "ta bort"). Det fanns inte heller något lagringsskäl: 200 knytt är ~5,4 KB.
  **Taket är 200.** Hyllan visar de 8 senaste per flik; äldre nås genom ett ritat trävred som
  vrider stubben ett varv (ett TAP som snäpper, aldrig ett svep). Ingen ta bort-knapp finns,
  och därför behövs ingen föräldragrind i det här spelet alls.
* **Första fliken är "Alla"** — de 8 senaste oavsett värld, nyast först. Utan den kan ett barn
  med tre skogsknytt öppna boden på Vattnet och möta en tom hylla, vilket är precis den
  frånvaro planen förbjuder på alla andra ställen. Världsflikarna blir ett filter, inte enda
  vägen in.

## 1b. Layouten — och varför harnessen är inbakad i den

Alla tal i designrymden 1280×720. Skalet äger hem (70,64) och högtalare (1210,64), båda 92×92
med +24 halo → träffytor x 0–140 och x 1140–1280, y −6–134.

| Nod | Centrum | Träffyta | x-span | y-span |
|---|---|---|---|---|
| T1 Färgkranen | (300, 250) | 168×168 | 216–384 | 166–334 |
| T2 Stjärnstoftsburken | (950, 250) | 168×168 | 866–1034 | 166–334 |
| T3 Bälgen | (300, 450) | 168×168 | 216–384 | 366–534 |
| T4 Mönsterhjulet | (950, 450) | 168×168 | 866–1034 | 366–534 |
| T5 Väderveven | (480, 630) | 144×144 | 408–552 | 558–702 |
| T6 Ljudtratten | (800, 630) | 144×144 | 728–872 | 558–702 |
| Kupan | (640, 330) | `Circle(0,0,190)` | 450–830 | 140–520 |
| Spaken | (1160, 350) | `Rect(-100,-120,200,240)` | 1060–1260 | 230–470 |
| Bodluckan | (120, 630) | 144×168 | 48–192 | 546–714 |
| Ägget (bara kläckfasen) | (640, 470) | `Circle(0,0,120)` | 520–760 | 350–590 |

**P0-avstånd (varje par ≥24 px; en lucka på EN axel är en lucka):**
T1–T3 y 32 · T2–T4 y 32 · T1–T2 x 482 · T3–T5 y 24 · T4–T6 y 24 · T5–T6 x 176 ·
T2–spak x 26 · T4–spak x 26 · spak–högtalare y 96 · T1–hem y 32 · T2–högtalare y 32 ·
bodlucka–T5 x 216 · bodlucka–hem y 412.
Kupans cirkel (r 190) till närmaste hörn av varje verktygsyta: T1 256 · T2 226 · T3 258 ·
T4 229 · T5 244 · T6 244 — alltså 36–68 px fri marginal runt hela klotet.

**Harnessens nio standardtryck landar allihop på en riktig kontroll:**
(300,250)→T1 · (640,250)→kupan · (950,250)→T2 · (300,450)→T3 · (640,450)→kupan ·
(950,450)→T4 · (480,600)→T5 · (800,600)→T6 · (640,360)→kupan.
**Inget av dem ligger i spakens träffyta** (min x-avstånd 1060 − 950 = 110). Det är en stående
layout-invariant: **flyttas spaken någonsin, räkna om det här FÖRST**, annars börjar
standardtestet dra spaken och skärmdumpen landar mitt i en ceremoni.

En **heltäckande fångare** ligger underst (`eventMode='static'` + explicit `hitArea`, för en bar
`Container` utan hitArea träfftestar alltid falskt) och svarar varje tryck som inte träffar
något med `kvittera()` + `sfx('soft')`. `dod-traffyta` blir därmed strukturellt omöjligt.

## 2. Ursprunglig plan & tankeprocess

### Vad ägaren faktiskt bad om

Ur ägarens EGNA prompter i `_kalla-unika-knytt.md` (Geminis svar är kommentarer till dem, inte
kravet):

1. Ett spel där man tar fram varelser genom ett UI, med **roliga och söta kontroller som barn förstår**.
2. En **lättare förhandsvisnings-miljö** som visar valen **var för sig** och som en **sammanfattad värld**.
3. En stor **genereringsspak** som startar en animation som **bygger upp spänning**.
4. Allt åker in i en hög → **knådas till en degklump** → trögt flytande → **härdas** → blir ett **ägg**, medan det **lyfter, lyser mer, skjuter strålar, växer och växlar färg**.
5. Klimax → **mjuk explosion med en pop** → ägget **faller ner**.
6. Barnet **kläcker genom att trycka flera gånger** tills det spricker mer och mer — och sedan **kommer VÄRLDEN ut**.
7. Ett interaktivt Pokémon-kort med **idle · happy · playful · sleepy · sleeping**.
8. **Holografisk foil-effekt** på kortet.
9. Ett **bibliotek i flikar per typ**, plus **brons 10 % · silver 5 % · guld 2 %** med **egna flikar**.

Allt nio ligger i planen. Punkt 6:s andra halva — "*världen* kommer ut" — är det som gav spelet
sin ryggrad: **du buteljerar en värld, och ägget ger tillbaka den.** Det är också varför
förhandsvisningen är en kupa och inte en varelseförhandsvisning, och varför kortet är en fond
och inte en låda.

### Vad som behölls ur Gemini-dumpen

* **Det deterministiska DNA:t med ett frö** — hela poängen: posten kan vara pytteliten och kortet återskapas exakt vid visning.
* **Neoteni-spärrarna** (stora, lågt satta ögon, brett isär, stora pupiller, blänk, kindrodnad) som HÅRDA klamp, så en slumpad varelse alltid blir söt.
* **De fem animationsslingorna** och idén att morfologi och element modulerar dem (tung sten = trög, blixt = ryckig).
* **Fyrfasstrukturen** i födelsen, äggmatematiken (brusamplitud → 0, taper) och tap-to-hatch.
* **Sällsynthetstalen** och tanken att folien maskas så ansiktet förblir matt.

### Vad som ströks, och varför

| Ur källan | Varför det inte går | Vad som gjordes i stället |
|---|---|---|
| Stående telefon, 3–8 år | `ageRange` utanför [1,6] **felar `npm run check` med exit 1**. Appen låser dessutom landskap i manifestet. | 1280×720 landskap, `[2, 5]`, och 60+ parametrar kokade ner till 6 barnvända val. |
| Reglage ("stora sliders") | 64×64-ytor mot P0:s ≥96 px, och ett reglage är ett kontinuerligt drag utan snäpp och utan tap-tap-fallback. Huset har redan avvisat reglage en gång (`roliga-snurran`) och skrivit ner varför. | Sex maskindelar som cyklar diskreta steg vid TAP. Tre steg läser som ett val; ett kontinuerligt värde gör det inte. |
| Gyroskop för folien | Inte i P0:s gestlista, noll användning i `src/`, plattan ligger på ett bord och pekar ingenstans, och iOS kastar upp en vuxen-dialog mitt i ett barnflöde. | Folien drivs av fingret plus en långsam egen svepning, så den lever även när ingen rör skärmen. |
| Emoji-knappar för elementen | P0 `ASSETS`: spelobjekt får aldrig vara en emoji i en ruta. Och `artikoner.js` har **noll** varelse-, ägg- eller monsternycklar — en felstavad nyckel ritar en tyst grå cirkel. | Varje maskindel är ett ritat föremål med egen siluett, egen skugga och eget vilo-liv. Allt ritas med `Graphics`. |
| Räknare, "24/150 upplåsta", låsta ❓-siluetter | P0 `NAVIGATION` (noll läsning) och P0 `ALDRIG` (FOMO). En låst siluett finns bara för att visa vad barnet INTE har. | Fyllda bon finns, tomma bon har en sovande eldfluga. En flik existerar först när den har ett knytt — den VÄXER fram, som belöning i stället för brist. |
| Dela / exportera seed-koden | `fetch(` felar grinden; P0 förbjuder nätanrop och P0 `GRIND` kräver hållgrind före länkar. | Struket helt. Fröet behöver ingen transport — det bor redan i `progress.setCustom`. |
| Full DNA per sparad varelse | Uppmätt: 150 poster med fullt DNA = 1,04 MB dokument / 2,07 MB på disk vid fyra profiler — **på kvottaket**, och kvotfel är TYST (ett `console.error` som gör testet rött). | En array på 8 tal per knytt, ~27 byte. 32 knytt = under 1 KB. Se §6. |
| "Kontrollerna låses" i 5,5 s | En upptagen-flagga som returnerar tyst ÄR den uppmätta P0-överträdelsen `dod-traffyta`. | Ceremonin är 6,5 s men **degfasen är interaktiv** och varje tryck någonstans ger kvitto inom 100 ms. |
| Kraftig skärmskak + vit pulsering | Kvalitetsgrindens punkt 7: inga blinkande/stressande element. Ögats flimmergräns ligger runt 3 ändringar/s. | En mjuk vit blomning **bara på ägget**, låg skak på ägget, svep långt under 3 Hz. |
| All kod (Pixi v7) | `new PIXI.Filter(undefined, …)`, `beginFill`, `lineStyle`, `BLEND_MODES`, `SimpleRope`, `utils.hsl2rgb` — **noll förekomster i repot**, allt är v8. | Allt skrivs om. Folien blir cachade gradienter + mask i stället för ett filter (`DESIGN.md` förbjuder dessutom filter för djup). |
| `drawCracks` med `Math.random()` | Ritas om vid varje tryck → sprickorna hoppar runt. En riktig bugg i källan. | Sprickvägen byggs EN gång per steg ur knyttets eget frö och sparas. |
| Fjädern `scaleX += (1−scaleX)·k` | Utan hastighetsterm är det ingen fjäder utan en exponentiell easing — den kan inte översvänga, alltså ingen studs. `spring.vy` sätts i källan och används aldrig. | `feedback.squash()`/`landa()` som redan har rätt kurva, och `Mjukkropp` där det behövs riktig deformation. |

### Varför det inte är en omskinnad `bygg-en-kompis`

Det är den viktigaste designfrågan, eftersom repot redan HAR en procedurell varelsegenerator
(1834 rader, sex axlar, pilpar, galleri på väggen). Skillnaderna är avsiktliga och strukturella:

* **Verbet.** `bygg-en-kompis` är att *välja delar*. Unika Knytt är att *hälla saker i en plats
  och se väder, mark, ljus och en invånare reagera av sig själva*. Förhandsvisningen lever
  mellan trycken i stället för att stå frusen tills en pil trycks.
* **Barnet ritar aldrig varelsen.** Det finns ingen kroppsaxel, ingen ögonaxel, ingen munaxel.
  Barnet sätter ett RECEPT; fröet härleder varelsen. Det är därför en andra dragning är värd
  att göra — och varför spelet heter *Unika* Knytt.
* **Ingen pilknapp existerar.** Sex maskindelar med sex olika rörelser mot tolv identiska pilar.
* **Hela andra halvan saknar motsvarighet i repots 85 spel:** en mjukkropp som knådas av ett
  finger och morfas till ett ägg, en pop, ett fall, en knackkläckning, och en värld som
  strömmar ut. `bygg-en-kompis` slutar med en kamerablixt.
* **Mottagaren.** Ett foto i en ram på en vägg (en varelse i en låda — precis den P0-läsning som
  inte får upprepas) mot knytt som står fritt i öppna bon och kvittrar till varandra.
* **Persistensen.** Sex heltalskonfigurationer mot ett frö som återskapar allt vid ritning.

## 3. Vad som riskerar att bli lättjefullt / tunt

Ärlig kritik i förväg — det här är var spelet kan landa platt om något genas:

* **Ceremonin kan bli en film man tittar på.** 6,5 sekunder är länge för en 2-åring. Om
  degfasen inte faktiskt SVARAR på fingret blir hela sekvensen passiv, och då är spelet
  "tryck på spaken → se en film" en gång i timmen. Knådningen är inte juice, den är kravet.
* **Sex maskindelar kan bli sex knappar.** Om en del bara byter ett index utan att dess egen
  rörelse syns i kupan i samma bildruta, faller hela premissen och det ÄR pilar med annan
  grafik. Varje del måste ha en synlig kanal in i kupan (rör, slang, lucka, stråle).
* **Varelsen kan bli en klump med ögon.** Om delvokabulären är för liten (t.ex. tre kroppar,
  tre öron) syns fröets variation inte, och alla knytt läser lika. Det är den vanligaste
  formen av tunnhet i ett generatorspel.
* **Boden kan bli ett rutnät.** Åtta bon i två rader ÄR ett rutnät om knytten inte sticker upp
  ur bona och rör sig. Då är det ett bibliotek, inte ett hem.
* **Skimret kan bli det enda som betyder något.** Om ett vanligt knytt får mindre firande än ett
  bronsknytt har spelet blivit en enarmad bandit, oavsett vad oddsen säger.
* **Kortet är ett P0-minfält.** Ritas knyttet någon gång HELT innanför ramen läser det som en
  ikon i en box. Kravet (fötter under underkanten, öron över överkanten) måste kontrolleras i
  en riktig skärmdump **per kroppsform**, inte antas.
* **Namnen.** Ett genererat namn kan aldrig få ett röstklipp (`check.mjs` läser bara literaler).
  Narratorn får därför aldrig säga namnet — det står på plaketten, för förälderns skull.

## 3c. Vad granskningen fällde (och som redan är rättat ovan)

Åtta oberoende granskare läste designerna genom två linser — *ett barn som faktiskt spelar* och
*P0 + byggrindarna*. Ingen design fick över 6,5 av 10 i första rundan. Det här är fynden som
ändrade planen, bevarade så att ingen bygger tillbaka dem:

| Fynd | Varför det var allvarligt | Rättat |
|---|---|---|
| **`skala()` raderar äggprofilen** | `Mjukkropp.skala()` räknar om `_kant`/`_eker` ur de orörda byggmåtten. Att både växa och lerpa i F3 ger en klump som aldrig blir ett ägg — utan ett enda konsolfel. | §6: väx display-nodens `scale`, aldrig `Mjukkropp.skala()`. |
| **Vräkningen bröt spelets eget löfte** | "Bor hos dig" i samma stycke som en oåterkallelig radering utan grind. Och det fanns inget lagringsskäl. | §1: taket är 200, hyllan paginerar, ingenting tas bort. |
| **Ingen vilohjälp i verkstan** | Hela belöningen ligger bakom att hitta spaken. Den här åldern letar inte av en skärm. | §1: tre stegs vilohjälp med samma handpiktogram som på ägget. |
| **Loopen stängdes aldrig** | Ceremonin slutade på en annan skärm; barnet skulle känna igen en trälucka som *navigation* direkt efter spelets bästa 20 sekunder. | §1: knyttet klättrar upp på bänken, verkstan är alltid startskärmen. |
| **Kupans tillstånd efter kläckning odefinierat** | På den enklaste läsningen öppnar runda 2 med full kupa → inget nytt kan läggas i → hela loopen död från spelomgång två. | §1: kläckningen tömmer kupan (världen åkte ju ut). |
| **Kupan var ett lockbete** | Skärmens största, ljusaste föremål saknade verkan. En 2-årings hand går dit först. | §1: ett tryck på glaset rullar om fröet, synligt och komiskt. |
| **Boden kunde öppna tom** | Fem flikar utan angivet förval: tre skogsknytt + fliken Vattnet = en tom sida. Exakt den frånvaro planen förbjuder överallt annars. | §1: "Alla" är första fliken och förval. |
| **Ceremonin identisk och oavbrytbar** | Byte-identisk på kläckning 1 och 20; ett andra spaktryck gav en återvändsgränd. | §1: tryck kortar tidslinjen (tak 1,2 s), andra spaktrycket hoppar till äggfallet. |
| **Skalan** | 3 500–4 500 rader mot `bygg-en-kompis` 1 834 för något enklare. Ryms inte i ett pass, och halvbyggt landar som 🔧. | §4: två leveranser, båda hela spel för ett barn. |
| **Delvokabulären odesignad** | Åtta härledda axlar angivna som heltalsantal, utan en enda del beskriven. En byggare kan inte börja. | Kvarstår som **den största specluckan** — se §8 sista punkten. |

Två fynd som blev förbättringar snarare än rättelser:

* **Knyttets namn KAN sägas.** Planen antog att ett genererat namn aldrig kan få ett röstklipp.
  Det stämmer för fritt genererad text — men en **fast tabell på 24 tvåstaviga namn** valda med
  fröet är 24 literaler, och de kan alla ligga i `voice-phrases.json`. `VoiceService` slår upp
  klipp på exakt text vid körning, och filen bär redan enordsposter. Alltså: `voice.say(NAMN[i])`
  vid avtäckningen — barnet får **höra** vad det heter.
* **Sömnen ska gå att orsaka.** Två osynliga timers (20 s + 12 s) är ingen mekanik. Kortare
  (12 s + 8 s) och ett barnvänt handtag: ett tryck på nattmånen i kortets fond får knyttet att
  gäspa och somna direkt; vilket tryck som helst väcker det.

## 3b. Sällsynthet — ägarens tal, husets etik

Ägarens siffror ligger kvar exakt. Leveransen kopierar `roliga-snurran`s uttryckligen
dokumenterade och uppmätta anti-bandit-design.

* **Grundrullning per spakdrag:** guld 2 % · silver 5 % · brons 10 % · vanlig 83 %.
* **Utfallet avgörs FÖRE draget.** Frö och tier rullas i samma ögonblick som spaken trycks,
  innan en enda bildruta av ceremonin ritas. Inget barnet gör under animationen kan ändra det.
  Ceremonin är därmed en **avtäckning, inte en snurr** — och ett guldägg får glöda guld redan i
  F3, ärligt.
* **Burken är ratten — med ett tak på +5 procentenheter** (ägarens beslut 2026-08-30).
  Varje gnista ger **+1,0 pp brons · +0,5 pp silver · +0,17 pp guld**. Tre gnistor är taket och
  ger exakt **+5,0 pp** (3,0 + 1,5 + 0,5).

  | Gnistor | Guld | Silver | Brons | Skimmer totalt |
  |---|---|---|---|---|
  | 0 | 2,00 % | 5,00 % | 10,00 % | **17,0 %** |
  | 1 | 2,17 % | 5,50 % | 11,00 % | 18,7 % |
  | 2 | 2,33 % | 6,00 % | 12,00 % | 20,3 % |
  | 3 | 2,50 % | 6,50 % | 13,00 % | **22,0 %** |

  **Sannolikheten är ett fysiskt föremål barnet kan se och räkna**, inte ett dolt tal — men
  burken är en krydda, inte en genväg. Guld rör sig 2,00 → 2,50 %, alltså förblir guld
  genuint sällsynt oavsett hur mycket stjärnstoft barnet häller i. Det är skillnaden mellan
  en generator och en gacha, och taket är det som håller den skillnaden.
* **Garantier i stället för jakt:** allra första kläckningen på en profil är garanterat minst
  brons (barnet ska få se vad skimmer ÄR på ägg ett). En torkräknare ger garanterat minst brons
  efter 6 vanliga i rad. Räknarna sparas men **renderas aldrig, sägs aldrig, syftas aldrig på**.
* **Vanlig är inte en frånvaro.** Varje kläckning får samma fulla firande — samma pop, samma
  värld som strömmar ut, samma `complete()`. Ett skimrande får ETT tillägg (foliesvepet, en
  metallklang, metallflingor). Ett vanligt får något ett skimrande **aldrig** får: det kommer
  med **en liten kompis** — en skalbagge, en småfisk, en snösparv eller en nattfjäril som
  flyger in och sätter sig på huvudet. Vanlig är en annan gåva, inte en mindre.
* **Ingen banditgrammatik:** inga hjul som stannar ett i taget, inga nära-missar, ingen räknare,
  ingen svit att förlora, inga dagliga gränser, ingen valuta, ingen omrullningsknapp. Spaken är
  alltid tillgänglig och kostar ingenting.

**Flikarna:** ägaren bad om egna flikar för de tre tierna. Planen ger dem en egen **Skimmerhylla**
med tre metallpiedestaler (brons/silver/guld) i stället för tre separata flikar — se §8 fråga 1,
där valet läggs fram för ägaren. Ett skimrande knytt syns i BÅDA sin världshylla och där, för ett
gyllene snöknytt är fortfarande ett snöknytt och barnet letar där det bor.

## 4. Byggplan

Repots regel: **nya spel landar som ✅, aldrig 🔧.** V1 måste alltså passera hela kvalitetsgrinden
(åtta punkter, `docs/games/README.md`) på egen hand.

🚨 **Skalan är den största risken i hela planen.** Mätt mot `bygg-en-kompis` (1834 rader för en
STRIKT enklare generator) landar allt nedan på **3 500–4 500 rader** plus en egen sond med sex
påståendefamiljer som var och en kräver en kontrollarm först. Det ryms inte i ett pass, och ett
spel som byggs halvt landar som 🔧 — vilket huset inte tillåter för ett nytt spel.

**Därför byggs det i två leveranser, och båda är hela spel för ett barn:**

**LEVERANS 1 — verkstan och födelsen (~1 400 rader).** Rummet, den levande kupan, de sex
maskindelarna, spaken, hela ceremonin F0–F5, fyrknacks-kläckningen, "världen
kommer ut", knyttet med alla fem slingorna stående i sin värld, loopstängningen tillbaka till
bänken, och en **hylla med de tre senaste knytten** i verkstan. Persistens av postlistan.
**Ingen sällsynthet, ingen foil, ingen bod** — kortet får en enkel gloss.
Det här är barnets hela loop: bygg → dra → knåda → knacka → möt ditt knytt. Det kan landa ✅.

**LEVERANS 2 — samlingen och skimret (~1 200 rader).** Knyttboden med Alla-fliken, de fyra
världshyllorna och Skimmerhyllan, det levande hyllivet (grannkvitter, favoriten framme,
dygnshälsningen), sällsynthetsrullningen med garantierna, foliegradienterna och tier-skillnaderna.

Skälet till ordningen: samlingen designas då mot ett KÄNT knytt-utseende i stället för mot ett
antaget, och sällsyntheten läggs ovanpå en loop som redan bevisat sig rolig utan den.

### Leverans 1 — måste finnas för att spelet ska få landa

**Kärnloop**
* [Deep] `dna.js`: `mulberry32` (repot har **ingen** seedad PRNG), en billig värde-brusfunktion ur samma ström, `hslHex()` (repot har **ingen** HSL-hjälpare), `dnaFromSeed(seed, val)`, namngenerator, motivgenerator.
* [Deep] `knytt.js`: `byggKnytt(dna)` med fästpunktspost per kropp (`m = {topY, faceY, munY, bredd, axelY, svansY}`) — det är den mekanism som gör kombinationsexplosionen gratis. Sex kroppar, sex öron/horn, fem svansar, fem munnar, sex ögonformer, tre bentyper, sex mönster. Plus `stadKnytt(nod)`.
* [Deep] `kupan.js`: dioramat, de fem världsskalärerna, blobben, de sex maskindelarna, spaken.
* [Deep] Ceremonin F0–F5 med `Mjukkropp` (se §6), interaktiv knådning.
* [Deep] Kläckningen: fyra knackningar, seedad sprickväg, ljus genom sprickorna.
* [Deep] "Världen kommer ut": marken växer ut, fyra rekvisita per värld, partiklar, knyttet reser sig.

**Karaktär**
* [Deep] Femlägesmaskinen med EN `_apply()` som summerar skalärer.
* [Medium] Bobo vid spaken (`lib/karaktarer.js`), nyfiken under ceremonin, jubel vid kläckning.
* [Medium] Knyttets eget fyrtonsmotiv ur fröet — varje knytt har sin egen röst.

**Progression & samling**
* [Deep] `boden.js`: fem hyllor, 4×2 bon, levande knytt, grannkvitter, favoriten framme, dygnshälsningen, synlig och vänlig vräkning.
* [Medium] Sparmodellen (§6) med kopia vid läsning OCH skrivning och fältvis sanering.
* [Quick] Upplåsningar vid 4 / 8 / 12 / 16 kläckta (ny värld, två mönster, två färger, en röst).

**Juice**
* [Deep] `kort.js`: fonden, den öppna underkanten, de cachade foliegradienterna per tier, svepet under masken, de tre fysiska tier-skillnaderna.
* [Medium] Ljusstormen i normal alfa med täckningstak.
* [Quick] **Uppehållsmätning:** logga tiden från mount till spaktryck, och mellan spaktryck, via `gamelog`. Det är underlaget för motgångsbeslutet i §4b — utan det byggs Skrället mot ett antagande.

**Ljud**
* [Medium] Sugets brus-loop + tontrappa, degens squelch, den stigande knacktrappan, metallklangen per tier.
* [Quick] Alla 19 repliker i `voice-phrases.json` + `npm run voice`. `_narTyst`-mönstret så ingen replik kapas.

### 4b. Skrället — motgången, byggklar men GRINDAD på en mätning

**Ägarens beslut 2026-08-30: bygg den inte i leverans 1, men ha den färdigspecad.**

Skälet är inte tvekan om idén — den är den roligare av de två — utan att **båda**
motgångsalternativen förutsätter att barnet DRÖJER i verkstan, och den tiden är omätt. Trycker
ett barn fyra gånger och drar i spaken på åtta sekunder hinner ingen motgång existera: Skrället
hinner inte ens klättra upp. Då hade vi byggt ~200 rader som aldrig syns, mot ett antagande om
beteende i stället för mot en mätning — repots dyraste återkommande misstag.

**Grinden:** leverans 1 loggar tid mount → spaktryck och mellan spaktryck.
* **> 20 s** → bygg Skrället enligt specen nedan.
* **12–20 s** → bygg den med halverad takt (44 s mellan besök).
* **< 12 s** → bygg ingen motgång alls; lägg budgeten på verkstadens vilo-liv i stället.

**Imma-på-glaset är förkastad** och ska inte återuppstå: den klarar P0 men är en städsyssla som
aktivt försämrar spelets vackraste yta.

**Specen (klar att bygga när grinden öppnar):**

En liten rufsig busvätte med **egen ritad siluett** (aldrig en emoji) klättrar upp på kupans
kant, **snor ett föremål ur världen** och sitter och tuggar på det med ett fräckt flin.

* **Tydlig orsak:** man SER den ta saken. Zonen den tömde blir tom i kupan och valet går
  tillbaka ett steg. Ingen text behövs.
* **Rolig ton:** den hickar, fnissar och håller upp saken som en trofé.
* **Åtgärdas direkt:** ETT tryck. Den hickar till, tappar tillbaka föremålet (som `pop`:ar
  tillbaka på plats) och kilar iväg skrattande. Kostnad ~2 sekunder.
* **Taket, femdelat:** högst EN åt gången · håller högst ETT föremål · rör **aldrig**
  världsvalet (det som bestämmer hyllan) · aldrig under ceremonin, kläckningen, boden eller de
  första 12 sekunderna · minst 22 s mellan besök, aldrig två gånger i rad på samma axel.
* **Läker sig själv:** ignorerad i 7 s blir den uttråkad, lägger tillbaka saken och går.
  **Den kan alltså aldrig blockera spaken.**
* **Och det bästa:** drar barnet i spaken medan den håller något, **sugs Skrället med in i
  degen** — knyttet får en tofs av dess päls och ett vikt öra. Rent kosmetiskt, påverkar aldrig
  tier. Det är den bästa möjliga versionen av ett bakslag: det förvägrar ingenting, det gör
  utfallet roligare.
* **Träffyta:** nod (620, 210), `hitArea = Rectangle(-72,-72,144,144)` → x 548–692, y 138–282.
  Kupan sätts till `eventMode='none'` medan Skrället sitter där, så det finns ingen konkurrens
  om trycket alls.
* **Repliker** (måste in i `voice-phrases.json` när den byggs — de ligger INTE där nu):
  `'Oj, Skrället tog en sak! Peta på den.'` · `'Bra jobbat, Skrället lämnade tillbaka den.'`

### Senare (V2+)

* [Medium] Fler världar (Öknen, Grottan) och de hyllor de för med sig — modellen har redan plats.
* [Medium] Två knytt på samma hylla blir VÄNNER efter tillräckligt många duetter och delar bo.
* [Medium] Dra ut ett knytt ur boet och ner på golvet, där det springer runt en stund.
* [Medium] Lägg ett bär framför ett knytt på hyllan → det äter, squashar av glädje och rapar en gnista.
* [Deep] Kamera-parallax i boden via `lib/kamera.js` när flikraden växer förbi fem.

## 5. Status / loggar

`2026-08-30 · plan skriven. Källan (Geminis konversation) flyttad till
docs/games/_kalla-unika-knytt.md och behandlad som råmaterial. Underlaget: 13 parallella
recon-agenter över kontrakt · ritverktyg · persistens · figurriggar · ljud/röst ·
flerskärmsstruktur · shaders/foil · grindar · mjukkropp · kontroller · dokformat · tokens ·
P0-krock, plus fyra oberoende helhetsdesigner (maskin-först · värld-först · ceremoni-först ·
samling-först). Planen är en syntes: maskinvokabulären ur den första, kupans världssemantik och
sällsynthetsetiken ur den andra, den INTERAKTIVA degfasen ur den tredje, den levande hyllan ur
den fjärde. Ingen kod skriven.`

⬜ **Inte byggt. Inte testat. Aldrig speltestat av ett barn.**

## 6. Teknisk ritning

### Filer

Tio spel i repot är redan flerfils, så det här är inget nytt mönster. Alla filer under
`src/games/unika-knytt/`:

| Fil | Ansvar | Grov storlek |
|---|---|---|
| `index.js` | `GameModule`, fasmaskin, layout, **alla `voice.say()`** | ~700 |
| `dna.js` | PRNG, brus, HSL, `dnaFromSeed`, namn, motiv | ~220 |
| `knytt.js` | `byggKnytt` · `stadKnytt` · femlägesmaskinen | ~650 |
| `kupan.js` | diorama, maskindelar, spak, ceremonin F0–F5 | ~700 |
| `kort.js` | fonden, foliegradienter, svepet, tier-skillnader | ~300 |
| `boden.js` | hyllor, bon, levande samling, vräkning | ~450 |

⚠️ **`check.mjs` läser BARA `src/games/<id>/index.js`.** Varje `voice.say('literal')` måste
därför ligga i `index.js`, annars ser grinden dem aldrig — och en osynlig replik faller tyst
till robotrösten. Samma sak gäller varje förbjudet API i en undermodul: statiska granskningen
är blind för det, bara en testkörning fångar det.

### Fasmaskin

Ett `GameModule`-objekt, en `_fas`-sträng, ingen intern router (repot har aldrig behövt en):
`'bygga' → 'ceremoni' → 'klacka' → 'kort' → 'boden'`. Exakt en träffyte-regim är levande åt
gången, så ingen korsregim-överlappning kan existera.

⚠️ **Modulen är en singleton** — `this` överlever mellan omgångar. Varje räknare, array,
nodhandtag och boolean måste nollställas överst i `init()`.

⚠️ **Bygg en synlig grundscen SYNKRONT i `init()` före varje `await`.** `tom-scen`-vakten
startar 1000 ms efter mount och är ett fynd på nivå **fel**.

### DNA och sparmodell

**Barnet väljer 6 fält:** `f` färg 0–9 · `z` storlek 0–3 · `m` mönster 0–5 · `v` värld 0–3 ·
`r` röst 0–4 · `g` gnistor 0–3 → **19 200 recept**.

**Fröet härleder** (viktat av valen): kroppsform · öron · svans · ben · ögonform · ögonantal ·
mun · horn · vingar · mönsterjitter · namn · motiv.

**Sparposten är en ARRAY, inte ett objekt** — billigare och snabbare att sanera:

```
[seed, f, z, m, v, r, g, t]      →  [1846231095,3,2,4,1,0,2,2]  = 26 tecken
```

* Tak **8 per hylla × 4 världshyllor = 32 knytt** → 32 × 27 ≈ **864 tecken ≈ 0,9 KB**.
* Fyra profiler ≈ 3,5 KB i dokumentet, 7 KB på disk (dokumentet skrivs **två gånger**).
* Mätt referens: 150 poster med fullt DNA = 1,04 MB / 2,07 MB, **på taket**. Det här ligger på
  ~0,3 % av det. Det finns ingen väg härifrån till en kvotspräckning.

Nycklar: `progress.setCustom('knytt', {v:1, lista:[…]})` · `setCustom('bok', {fram, dag, torka, klackta})`.

⚠️ **`progress.get()` returnerar en LEVANDE referens och `setCustom` sparar referensen utan
kopia.** Alltså: kopiera vid läsning, kopiera vid skrivning, sanera fält för fält vid inladdning
(`Array.isArray`-vakt, exakt 8 ändliga tal, `seed >>> 0`, varje index klampat mot sin tabell,
kasta allt trasigt). Mönstret finns i `bygg-en-kompis._rensaCfg`.

⚠️ **Aldrig ordet `localStorage` i filen** — `check.mjs` felar på det, exit 1.

### Degen → ägget

```js
// Fast tidssteg — kopiera stegBulle (hamburgerbygget/bulle.js:116-131).
// steg() klampar dtF till [0.2, 2]: en naiv rest på 0.05 simuleras som 0.2,
// alltså fyra gånger för mycket tid, varje bildruta.
this._ack += dms
while (this._ack >= MS) { deg.steg(1); deg.flyttaTill(640, ankarY); this._ack -= MS }
```

⚠️ **`flyttaTill()` efter VARJE steg är obligatoriskt.** Uppmätt: en kropp med en asymmetrisk
`form` driver **+2257 px på 300 steg** med noll gravitation och noll krafter — ekrarnas
vilolängder mäts från nominella (x,y) medan `steg()` sätter om mittpunkten i ringens tyngdpunkt
varje bildruta. Ett ägg ÄR asymmetriskt, alltså är det precis det fall `Mjukkropp` får fel.

⚠️ **`knuff()` är en HASTIGHET, inte en förflyttning.** På en kropp utan pinnar, golv eller
gravitation translaterar hela klumpen i stället för att deformeras (uppmätt 62 px permanent
drift i ett annat spel). Använd `knuff(..., {form: true})` **och** `flyttaTill()`. För en
ihållande kraft: `falt()`, aldrig `skjut()` per bildruta.

**Morfen till ägg:** det finns ingen publik väg att ändra viloform — `form(a)` är
konstruktor-only med flit. Lerpa de privata `_kant`, `_eker`, `_viloArea` (och `_kant0`,
`_eker0`, `_viloArea0` om `skala()` ska fortsätta fungera) över 90 bildrutor. Uppmätt landar det
inom **0,69 px** från en kropp byggd som ägget direkt. Wrappa det i EN namngiven hjälpare —
det är privatpillande och ska bo på ett ställe.

🚨 **`skala()` och lerpen slåss om samma fält — och skala() vinner varje bildruta.**
`Mjukkropp.skala(s)` räknar om `_kant[i] = _kant0[i] * s` och `_eker[i] = _eker0[i] * s` ur de
**orörda byggmåtten** vid varje anrop där `s` ändras. F3 ska både växa ägget 1,00 → 1,35 OCH
lerpa `_kant`/`_eker` mot äggprofilen — kör man båda i samma fas **raderas äggprofilen varje
bildruta** och klumpen förblir rund. Ägget skulle aldrig bli ett ägg, utan ett enda konsolfel.
**Rätt väg: väx DISPLAY-nodens `scale`, aldrig `Mjukkropp.skala()`, under hela morfen.**
Sonden ska hävda att viloarrayerna fortfarande bär äggprofilen när härdningen är klar.

**Reservväg som ska prövas med `_mjukprobe` INNAN bygget:** degen som ett vanligt `Graphics`
med seedad värde-brusradie. Skillnaden under 2 sekunder är liten och risken blir noll.
**Beslutet tas med en sond, inte med en åsikt.**

### Folien

```
En cachad linjär flerstoppsgradient PER TIER, på MODULNIVÅ (Map per färg).
Bandet sveps under en mask klippt ur kortets EGNA ritade geometri.
Normal alfa. Aldrig additiv. Aldrig radiell. Aldrig ett filter.
mask = null INNAN den maskade noden destrueras.
```

⚠️ En `new FillGradient` per montering destabiliserar **hela 84-spelssviten** — uppmätt
`tom-scen` i 1 av 3 rundor mot 0 av 3 på HEAD. `renderer.generateTexture()` är förbjudet rakt
av (5 av 7 tomma skärmdumpar). Måste något bakas: rita det med Canvas2D som `glod.js` gör.

⚠️ En radiell gradient kostar **256×** en linjär och kan aldrig ha genomskinlig mitt — alltså
ingen radiell vinjett kring ägget och ingen radiell gloria.

⚠️ Additiv glöd har TVÅ uppmätta villkor: takhöjd i kanalerna OCH en botten i MITTEN av
skalan. Appens creme (0xFFFDF7) vitklipper 74,3 %. Kör `node scripts/_glodkandidat.mjs` innan
strålarna eller folien tas för givna.

### 6b. Delvokabulären — de faktiska delarna

Granskningen fällde planen på att åtta härledda axlar angavs som heltalsantal utan att en enda
del var beskriven ("en byggare kan inte börja"). Här är tabellerna. Varje del är en ren
ritfunktion `rita(g, p, m, look)` där `p` är palettobjektet ur `palett(farg)` och `m` är
kroppens fästpunktspost. **Alla delar ritas fristående med egen siluett — aldrig en ikon.**

**Fästpunktspost.** Varje kropp bär `m = { topY, faceY, munY, bredd, axelY, svansY, fotY }`.
Det är mekanismen som gör kombinationsexplosionen gratis: en ny kropp kräver noll ändringar
någon annanstans.

**KROPPAR (6)** — `m` inom parentes är den som skiljer dem åt:
| # | Namn | Form | Läser som |
|---|---|---|---|
| 0 | `klot` | cirkel, lätt tillplattad nedtill | rund kompis, mest neutral |
| 1 | `paron` | smal topp, bred bas, `body_taper 0.35` | knubbig, babyaktig |
| 2 | `bona` | böjd kapsel, lätt s-kurva | mjuk, sladdrig |
| 3 | `droppe` | spetsig topp, rund botten | vattnig, elegant |
| 4 | `kloss` | rundad kvadrat, `RADIUS.card` | tung, stenig |
| 5 | `larv` | tre lober i rad (ritade som EN form med en mörkare kopia bakom — **aldrig konturlinjer**, de drar streck tvärs över silhuetten) | krypande, insekt |

**ÖRON / HORN (6):** `inga` · `runda` (björn) · `spetsiga` (katt) · `hang` (beagle, `ear_droop 0.7`) · `horn` (två koniska, `horn_curl 0.3`) · `antenner` (två fjädrande med kula på — egen `_wPhase` per sida).

**SVANSAR (5):** `ingen` · `tofs` (kort, boll på) · `lang` (verlet-kedja, 4 segment, släpar 0,5 rad efter kroppen) · `fena` (bred, vattnig) · `blixt` (sicksack, stel).

**BEN (3):** `inga` (svävar, guppar högre) · `stubbar` (två korta klumpar) · `langa` (två med en led, gungar i takt vid glädjeskutt).

**ÖGONFORMER (6):** `runda` · `stora` (neoteni-max) · `smala` · `stjarna` · `spiral` · `tre` (tredje ögat mitt i pannan). Alla bär vit botten + pupill + **1–2 blänk**; pupillen rör sig som en klampad VEKTOR så den aldrig kryper ut ur ögat.

**MUNNAR (5):** `leende` (båge) · `katt` (3-form) · `nabb` · `glipa` (två tänder) · `prick` (liten o).

**MÖNSTER (6):** `enfarg` · `prickar` · `ranger` · `mage` (ljusare buk) · `flackar` (dalmatin) · `stjarnor`.
⚠️ Mönstret ritas i kroppens **statiska** `Graphics`, mätt mot `m.bredd` — aldrig ovanpå en
deformerande `Mjukkropp`. Förhandsvisningens blobb är därför ett vanligt `Graphics`;
`Mjukkropp` existerar **bara** under ceremonins F2–F3.

**Världsviktning** — det som gör "ett snörecept drar mot iskristallöron" sant. Varje värld bär
en viktvektor per axel; fröet drar ur den viktade fördelningen, inte ur en jämn:

| Värld | Kropp | Öron | Svans | Nyansfamilj |
|---|---|---|---|---|
| Skogen | `paron`·`larv` ×3 | `runda`·`hang` ×3 | `tofs` ×3 | 96–130° |
| Vattnet | `droppe`·`bona` ×3 | `inga`·`hang` ×3 | `fena` ×4 | 186–210° |
| Snölandet | `klot`·`kloss` ×3 | `spetsiga`·`horn` ×3 | `tofs`·`ingen` ×3 | 190–215°, låg mättnad |
| Stjärnnatten | `klot`·`droppe` ×3 | `antenner` ×4 | `lang` ×3 | 258–286° |

⚠️ **Nyansjittret klampas till ±8°** (inte ±18 som först skrivet) så världens färgfamilj är
omisskännlig. Två axlar måste vara lärbara för ett barn: **färgen** och **storleken**, och båda
syns redan på blobben i kupan innan spaken dras. Det är regeln som gör "blå flaska ger blå
kompis" sann, och den är bärande — inte kosmetisk.

**Kombinationer av DELVAL:** 6 × 6 × 5 × 3 × 6 × 5 = **16 200** kroppsuppsättningar.

### 6c. Proportionslagret — det som gör namnet sant

🚨 **Deltabellerna ensamma räcker inte, och det är räknat.** Med bara 16 200 diskreta
uppsättningar har ett barn som gör 200 knytt ur sitt favoritrecept **70,7 % risk att se två
identiska** (födelsedagsparadoxen). Det är precis det barn som älskar spelet mest som först
upptäcker att knytten tar slut — och ett spel som heter *Unika* Knytt får inte ha den
egenskapen. Ägarens ursprungliga parameterkatalog var kontinuerlig av exakt det skälet.

**Lösningen kostar ingenting.** Barnets kontroller måste vara diskreta (P0 förbjuder reglage) —
men **de frö-härledda dragen behöver inte vara det.** De syns aldrig i något UI, barnet ställer
dem aldrig, och de lagras aldrig: de härleds ur fröet vid ritning. Deltabellen väljer alltså
vilken FORM en del har; fröet sätter dess PROPORTIONER, kontinuerligt.

**22 kontinuerliga drag, alla klampade innanför sötma-envelopen (ägarens "neoteni-spärrar"):**

| Del | Drag och spann |
|---|---|
| Kropp | `bredd` 0,82–1,18 · `hojd` 0,85–1,15 · `taper` 0,00–0,40 · `asymmetri` 0,00–0,06 · `brusAmp` 0–5 px · `brusFrek` 2,0–4,0 |
| Ögon | `skala` 0,78–1,30 · `avstand` 0,80–1,25 · `hojdlage` −0,06…+0,14 (**lägre = sötare**) · `pupill` 0,55–0,85 · `blank` 1–2 |
| Öron | `langd` 0,70–1,40 · `lutning` −0,35…+0,35 · `hang` 0,00–0,80 |
| Svans | `langd` 0,70–1,50 · `tjocklek` 0,70–1,30 |
| Ben | `langd` 0,70–1,30 · `tjocklek` 0,80–1,20 |
| Mun | `bredd` 0,80–1,25 · `bage` 0,30–1,00 |
| Kinder | `alfa` 0,25–0,60 · `radie` 0,80–1,30 |

Vilorörelsen får sina egna: `andningstakt` 1,4–2,2 · `guppamplitud` 3–7 px · en egen
fasförskjutning per del. **Två knytt rör sig alltså inte likadant heller.**

**Följden — och det här är svaret på "hur många":**

| | |
|---|---|
| Recept barnet kan ställa in | **19 200** |
| Frö-rymd per recept (`mulberry32`, uint32) | **4 294 967 296** |
| Distinkta individer totalt | **≈ 8,25 × 10¹³** (82 biljoner) |
| Risk för två identiska på 200 knytt ur SAMMA recept | **0,00046 %** |

Fröet blir den bindande gränsen i stället för tabellerna — vilket är rätt ordning. Och
sparposten är oförändrad: **ett enda heltal** bär hela individen.

⚠️ **Vad det kostar:** varje ritfunktion måste ta emot och tillämpa sina proportioner
(`rita(g, p, m, prop, look)`) i stället för att rita fasta tal. Det är mer arbete per del än en
fast tabell, och det är den enda platsen i planen där jag medvetet köper komplexitet — men det
är det som gör spelets namn sant.

⚠️ **Fästpunktsposten `m` måste skalas med kroppens proportioner**, annars hamnar ögon, mun och
svans fel så fort `bredd`/`hojd` avviker från 1,0. `m` beräknas alltså EFTER att kroppens
proportioner är dragna, aldrig som konstanter i kroppstabellen.

⚠️ **Klampen är inte kosmetisk.** Utan den ger slumpen smala ögon högt upp på en avlång kropp —
en varelse som läser som obehaglig i stället för söt. Spannen ovan ÄR sötma-regelverket, och de
ska verifieras i bild med `_scenbild`-liknande rutnät över ~24 slumpade frön innan något annat
byggs ovanpå.

**NAMN (24, fast tabell):** Bubbel · Glimma · Knoppe · Lurvi · Snöfnatt · Gnista · Mossa ·
Droppe · Stjärne · Vippa · Dunge · Frosta · Blicka · Pyre · Skimra · Tussa · Kvista · Rimma ·
Flisa · Bolla · Nypon · Skugga · Tindra · Vinter.
Fast tabell just för att den kan få **riktiga röstklipp** — alla 24 ligger redan i
`scripts/voice-phrases.json`. `voice.say(NAMN[i])` vid avtäckningen.

### Riggens fällor (alla uppmätta, alla tysta)

* `killTweensOf(roten)` når **bara roten**. Öron, svans, ögon och vingar är barnbarn och
  överlever `destroy()` helt tyst — gsap skriver på en nollad transform och Pixi v8 kastar
  ingenting. `stadKnytt()` måste gå igenom **alla** animerade innernoder och deras `.scale`,
  och kallas före varje ombyggnad, varje `destroy()` och varje hyllkopia.
* En tween-ringbuffert komprimeras på **`tw.parent`**, aldrig på `isActive()`/`totalProgress()`
  — en dödad `repeat:-1` rapporterar `isActive()===false` och `totalProgress()===0` och slipper
  igenom filtret för alltid. Och vräk aldrig den äldsta: den är alltid andningen.
* Animera **aldrig** noden som bär en `hitArea`. Vaggningen, guppet och squashen ligger på en
  BARNNOD.
* Konstens utbredning och träffytans utbredning är **två budgetar**. Ett horn eller en vingspets
  ritad nära en granne kan sitta inne i grannens osynliga `hitArea`. Läs spetsen ur
  `getBounds()`, peka med riktiga muspekningar, och **krymp konsten** — P0-avståndet vinner.
* Spegla delar med rotationens **TECKEN**, aldrig `scale.x = -1` (det vänder även rotationens
  synliga riktning → ett ledset och ett argt ögonbryn).
* Egna fält får aldrig heta `_cx`/`_cy`/`_sx`/`_sy` m.fl. — Containers interna transformcache.
  `check.mjs` felar på hela namnlistan. Använd `_wx`-prefix.

### Röst

* Repliker som byggs vid körning får **aldrig** ett klipp. Alla 19 rader ovan är fasta
  meningar. `VoiceService` spelar ett klipp per mening om varje mening finns var för sig, så
  "Titta, hela världen kommer ut!" + "Vilket fint knytt du gjorde!" fungerar utan
  kombinatorisk explosion.
* ⚠️ `looksSpoken` i `check.mjs` sveper **varje enkelciterad literal** i `index.js` som är
  10–160 tecken, har ett mellanslag och innehåller åäö eller slutar på `.!?`. Delnamn måste
  därför vara **korta nycklar utan mellanslag** (`'gron'`, inte `'Lurvig päls med prickar'`).
  I `--game`-läge blir varje sådan varning ett **fel**.
* `voice.say()` kallar `cancel()` som första sak och klippen är 2,3–4,1 s. Ceremonin får
  **aldrig** schemalägga tal på ett fast `ctx.later(2)`. Vänta in `voice.kvar`/`voice.talar`
  (`_narTyst`) — **men låt bilden gå genast.**
* `progress.complete()` spelar SJÄLV celebrate + en slumpad berömreplik. Lägg det sist.
* Genererade namn sägs aldrig.

### Exit-säkerhet

`_alive`-flagga, allt fördröjt via `ctx.later` (aldrig `setTimeout`), `Mjukkropp` destrueras,
alla ljudslingor stoppas (en `AudioBufferSourceNode` med `loop = true` överlever spelets egen
`destroy` och låter vidare på menyn), foliemasken kopplas loss, partikelfält rivs när de är
tomma (ett vilande `ParticleContainer` på det app-långlivade `fxLayer` dör aldrig), och
`stadKnytt()` går igenom varje animerad innernod före varje rivning.

## 7. Grindar och mätning

`npm run check` grön · `npm run test unika-knytt` med **0 konsolfel** och inga `fel`-nivåfynd ·
`bildkoll` ren · sedan en egen sond.

**Egen sond `scripts/_knyttprobe.mjs` är obligatorisk.** Harnessens nio generiska tryck rör
verktygen och kupan men drar aldrig spaken, knackar aldrig på ägget och öppnar aldrig boden —
utan en egen sond är hela andra halvan av spelet grön och omätt (exakt så var `mata-munnen`s
kärnloop grön med `drag/ratt` på 0).

**Kontrollarm FÖRST, alltid** — repot har betalat för den regeln flera gånger:
1. Tryck på tomt golv → ingen fasändring (bevisar att sonden kan skilja två kända lägen åt).
2. Samma sond **utan** spaktrycket → fasläsaren måste rapportera `'bygga'` vid 4,5 s.

Först därefter mätarmarna: sex val → spak → läs fas vid 4,5 s → fyra äggtryck → läs
`custom.knytt` → ladda om → knyttet kvar → tryck → femlägesmaskinen går vidare → **exit mitt i
ceremonin** och räkna `gsap.isTweening` på innernoder som plockats undan **före** `destroy()`
(med **spelets** gsap-instans — en nyimporterad kopia har en egen global tidslinje och
rapporterar 0 oavsett vad som pågår).

Befintliga sonder som ska köras: `_idleprobe` (**ska vara 0** — spelet får aldrig klara sig
själv), `_mjukprobe` (degen), `_vilkaprobe` (bevisa att det som rör sig i boden ÄR knytten),
`_fpsprobe --cpu 6` och `_montageprobe --cpu 4 --varv 3` (boden med åtta levande knytt),
`_tystprobe` (inga tysta upptagen-returer), `_glodkandidat` (strålarna och folien).

⚠️ **Kör aldrig två webbläsarsonder samtidigt**, och aldrig en sond bredvid `npm run test:all`
— två headless Chrome svälter varandras ticker och förfalskar varandras svar.
⚠️ **Lista `scripts/_*probe*` innan `_knyttprobe.mjs` döps** — ett namnkrock har redan skrivit
över en befintlig sond en gång.
⚠️ **Bygg inte sonden före spelet.** Uppmätt har en sond kostat fler rader än ändringen den
mätte, och varit fel fyra gånger innan den var rätt.

## 8. Beslut som ägaren ska ta innan bygget

**✅ 1. AVGJORD 2026-08-30 — boden blir en rullande popup som bara visar det man fått.**
Ägarens svar löste frågan i stället för att välja mellan alternativen: hyllplan staplas nedåt
och rullar, ett plan existerar först när det har ett knytt, och tomma platser finns inte alls.
Därmed blir guldplanet ärligt (det finns inte förrän du har ett guldknytt), 8-taket och
vräkningen försvinner, och FOMO-förbudet uppfylls av strukturen i stället för av en regel.
Detaljerna i §1 "Knyttboden". Kvar att bevaka: rullningen måste vara mjukt axellåst drag med
`scrolling()`-vakt **plus** två 96 px pilknappar som tap-väg.

**✅ 2. AVGJORD 2026-08-30 — burken får höja med högst +5 procentenheter.**
Varje gnista ger +1,0 pp brons · +0,5 pp silver · +0,17 pp guld; tre gnistor är taket och ger
exakt +5,0 pp (17 % → 22 % skimmer). Guld rör sig 2,00 → 2,50 % och förblir alltså genuint
sällsynt oavsett hur mycket stjärnstoft barnet häller i. Tabellen i §3b.

**✅ 3. AVGJORD 2026-08-30 — Skrället, men INTE i leverans 1.**
Imma-på-glaset är förkastad. Skrället är färdigspecad i **§4b** och byggs när uppehållstiden är
mätt: >20 s → bygg den · 12–20 s → halverad takt · <12 s → ingen motgång alls. Leverans 1
loggar tiden. Skälet till grinden är att motgången kräver att barnet dröjer i verkstan, och
den tiden är omätt — bygger vi mot ett antagande blir det ~200 rader som kanske aldrig syns.

**Alla tre besluten är därmed tagna. Inget blockerar bygget.**

Ett fjärde, mindre val som ägaren inte svarat på: **Ljudtratten (T6)** är den kontroll som ger
minst synlig skillnad på varelsen. Arbetsordern säger åt nästa session att bygga den **sist av
de sex**, så den är billig att stryka om den känns överflödig.
