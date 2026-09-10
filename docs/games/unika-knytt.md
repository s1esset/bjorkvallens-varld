# Unika Knytt (`unika-knytt`)

> roligt · tap · 2–5 · 📝
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

✅ **Leverans 1 byggd 2026-08-30 (v1.237.0).** Verkstan, kupan, de fem maskindelarna, spaken,
ceremonin F0–F5, fyrknacks-kläckningen, "världen kommer ut", knyttet med femlägesriggen, hyllan
med de tre senaste och persistensen ligger i koden. **Leverans 2** (sällsynthet · folie · Knyttboden
· variation) byggdes 2026-09-05, och **poleringsrundan 2026-09-10** (ägarens sex steg) står i
§9 G. Planen nedan står kvar som skriven; §5 bär vad som faktiskt hände.
👉 **Ska du plocka upp spelet? Börja i [§9 Kvar att göra](#9-kvar-att-göra)** — allt som återstår,
sorterat, med storlek per post och med det som är verifierat i koden märkt som sådant.
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
| **kärnloop** | Barnet fyller en glaskupa med en liten värld genom att sköta fem ritade maskindelar — varje del GÖR det den ändrar (kranen glugger färg ner i ett glasrör, bälgen blåser upp klumpen, veven öppnar en lucka så vädret ramlar in). Sedan: dra i mässingsspaken → allt sugs in → en degklump som barnet KNÅDAR med fingret → den härdas, lyfter, glöder, skjuter strålar, växer → POP → ägget faller → barnet knackar fram knyttet. |
| **mål** | Ägget kläcks: skalet klyvs, **världen strömmar ut** och vecklar ut sig till en hel miljö, och knyttet föds stående mitt i den. `progress.complete()` + knyttet flyttar in i Knyttboden. |
| **agens** | Sex oberoende val (10 färger × 4 storlekar × 6 mönster × 6 världar × 4 gnistnivåer × 5 melodier = **28 800 recept**), var och en synlig — eller hörbar — i kupan i samma bildruta som trycket. *(Fem val och 3 840 recept tills Ljudtratten byggdes 2026-09-10, och fyra världar tills leverans 2.)* Valen STYR dessutom slumpen: ett snörecept drar mot iskristallöron, ett skogsrecept mot lövöron. |
| **variation** | Fröet härleder både VILKEN del (7 tabeller, 16 200 uppsättningar) och dess PROPORTIONER (22 kontinuerliga drag, §6c) — viktat av barnets val. **1,65 × 10¹³ distinkta individer**; risken att se två identiska på 200 knytt ur samma recept är 0,00046 %. Verkstan **växer**: startläget är 8 färger · 4 mönster · 3 världar · 3 storlekar, och nya delar låses upp vid 4 → två färger · 8 → två mönster · 12 → Stjärnnatten · 16 → största bälgsteget (byggt 2026-09-01, §5). **Steg 4 (2026-09-05): 20 → Öknen · 24 → Grottan, och rekvisitapoolen är 7 per värld — fröet drar 4, så samma värld ger olika finaler.** |
| **mottagare** | Bobo står vid spaken och sköter maskinen (rigg ur `lib/karaktarer.js`), och Knyttboden tar emot: alla tidigare knytt andas, blinkar, kvittrar till varandra och vinkar när barnet kommer tillbaka efter ett dygn. |
| **finish** | Kläckningen: skalet klyvs i två halvor som far iväg med fjäderfysik, världen strömmar ut ur ägget och vecklar ut sig (mark, himmel, fyra rekvisita, partiklar), knyttet reser sig med `bounceIn` och gör tre glädjeskutt, och en ram svänger in BAKOM det. |
| **motgång** | **Skrället** (§4b), byggt 2026-09-10 i poleringsrundan — utan uppehållsmätningen, efter ägarens beslut. *Historik:* **Ingen i leverans 1 — med flit** (ägarens beslut 2026-08-30). Motgången kräver att barnet DRÖJER i verkstan, och den tiden är omätt. Leverans 1 mäter uppehållstiden; är den >20 s byggs **Skrället** (§4b), är den <12 s byggs ingen alls. Imma-på-glaset är förkastad. |
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

Runt kupan sitter **sex ritade maskindelar** (den sjätte, Ljudtratten, byggdes 2026-09-10 — §4c). Ingen av dem är en pilknapp — det är
`bygg-en-kompis` vokabulär och den ägs redan. Varje del UTFÖR det den ändrar, i samma bildruta
som trycket:

| | Del | Vad den ändrar | Vad som händer vid ett tryck |
|---|---|---|---|
| T1 | **Färgkranen** | färg (10) | Trähandtaget klackar ett kvarts varv, kranens pip öppnas och en klick färgad knyttgegga glugger ner genom ett synligt **glasrör** och plaskar över blobben, som tvättas om på 0,25 s. |
| T2 | **Stjärnstoftsburken** | gnistor (0–3) | Burken tippar i sin vagga, stjärnstoft rinner ner som en tunn stråle, och EN gnista föds som lägger sig i omloppsbana över receptskenan. Fjärde trycket: tomt skrammel, burken vänder sig upp och ner. Roligt, aldrig ett misslyckande. |
| T3 | **Bälgen** | storlek (4) | Trätrampan slås ner, en synlig luftpuff skjuter genom en slang in i kupan och blobben blåses upp ett steg. Femte trycket: en lång pfffff och blobben tömmer sig tillbaka till minst, med en generad blick. |
| T4 | **Mönsterhjulet** | mönster (6) | Trätrumman ratschar 60° med ett klack, och motivet som rullar upp TRYCKS på blobben av en färgvals som sveper vänster→höger på 0,30 s. |
| T5 | **Väderveven** | värld (4) | En lucka i taket över kupan öppnas och vädret ramlar IN — snö virvlar ner, löv lägger sig, vatten stiger, natten tänds. Kupans himmel, mark och ljus byter tema i samma sekund. **Bestämmer också vilken hylla knyttet hamnar på.** |
| T6 | **Ljudtratten** | melodi (5) | Veven snurrar ett varv och trattens klocka studsar; fyra noter flyger ur mynningen in genom glaset. Varje not SPELAS när den lämnar tratten (den första i samma bildruta som trycket) och blobben svarar en oktav upp, med öppen mun, när den landar. Melodin är exakt den knyttet sedan sjunger — tonarten är fröets, så glaset byter den. *(Uppskjuten 2026-08-30, byggd 2026-09-10.)* |

Till höger står **skaparspaken** i mässing med en fet röd knopp, och nere till höger, under spaken,
en liten **bodlucka** (en stuga med rött tak) där ett par ögon kikar ut var åttonde sekund. Bobo
står bredvid stugan och sköter maskinen. *(Luckan stod först nere till vänster i planen; hyllan
med de tre senaste tog den platsen i leverans 1, så luckan bor till höger sedan 2026-09-05.)*

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
4. **sömnig** — efter 12 s: andningen ×0,5, kroppen sjunker 15 px och plattas, ögonlocken till 70 %, en procedurgäspning var ~8 s.
5. **sover** — efter 8 s till (alltså 20 s stillhet): locken helt slutna som två ⌣, mycket långsam djup andning, och **världens egna partiklar blir sömnkorn** som stiger i sicksack (vattenbubblor, glöder, sporer, stjärnor). Vilket tryck som helst väcker det med en stor förskräckt pop — rolig, aldrig en skräck.

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
| T6 Ljudtratten (sedan 2026-09-10) | (800, 630) | 144×144 | 728–872 | 558–702 |
| Skrället (BARA medan det sitter, sedan 2026-09-10) | (620, 210) | 144×144 | 548–692 | 138–282 |
| Kupan | (640, 330) | `Circle(0,0,190)` | 450–830 | 140–520 |
| Spaken | (1160, 350) | `Rect(-100,-120,200,240)` | 1060–1260 | 230–470 |
| Bodluckan (flyttad 2026-09-05: hyllan tog vänsterhörnet) | (1160, 612) | 144×168 | 1088–1232 | 528–696 |
| Bobo (ingen träffyta, flyttad från 1120,572) | (1000, 600) | — | — | — |
| Ägget (bara kläckfasen) | (640, 470) | `Circle(0,0,120)` | 520–760 | 350–590 |

**P0-avstånd (varje par ≥24 px; en lucka på EN axel är en lucka):**
T1–T3 y 32 · T2–T4 y 32 · T1–T2 x 482 · T3–T5 y 24 ·
T2–spak x 26 · T4–spak x 26 · spak–högtalare y 96 · T1–hem y 32 · T2–högtalare y 32 ·
bodlucka–spak y 58 · bodlucka–T4 x 54 · hyllbon–T5 x 30 · T6–T4 y 24 · T6–T5 x 176 ·
T6–bodlucka x 216 · T6–bänkknyttet (cirkel r 62 kring (800, 432)) y 64 · Skrället–T1 x 164 ·
Skrället–T2 x 174. **Skrällets yta ligger MED FLIT ovanpå kupans cirkel:** den är 'static' bara
medan Skrället sitter på kragen, och den ligger ovanför kupan i z-ordningen — ett tryck på figuren
når figuren, ett tryck bredvid rullar fortfarande om kupan (§4b ⓵).
**Bodens overlay** (boden.js): skyltar y 206 (träffyta 104×96, x från 150 i steg om 130) — 24 px
under skalets knappar (slutar 134 → 158) · pilarna (1160, 340) och (1160, 484) · dörren (1160, 628),
alla 120×120 → y 280–400 · 424–544 · 568–688, alltså 24 px isär och 26 px under skyltradens
underkant (254); bon 100×120 på x 280/500/720/940, plan var 200:e px. *(Stod på 330/490/630 fram
till 2026-09-10: pil ▼–dörren 20 px, och den ÅTTONDE skylten — Alla + sex världar + Skimmer, x
1008–1112 — 16 px ovanför pil ▲. `_knyttlyftprobe` B9 mäter hela overlayn med åtta skyltar.)* Overlayn har egen heltäckande
träffyta, så inget under den kan nås medan den är öppen.
Kupans cirkel (r 190) till närmaste hörn av varje verktygsyta: T1 256 · T2 226 · T3 258 ·
T4 229 · T5 244 · T6 244 — alltså 36–68 px fri marginal runt hela klotet.

**Harnessens nio standardtryck landar allihop på en riktig kontroll:**
(300,250)→T1 · (640,250)→kupan · (950,250)→T2 · (300,450)→T3 · (640,450)→kupan ·
(950,450)→T4 · (480,600)→T5 · (800,600)→**T6 Ljudtratten** · (640,360)→kupan. *(Punkten (800,600)
träffade bakgrundsfångaren medan tratten var uppskjuten; sedan 2026-09-10 vevar standardtestet
den — `_knyttlyftprobe` R5 mäter att det gör det.)*
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

## 4. Byggplan

Repots regel: **nya spel landar som ✅, aldrig 🔧.** V1 måste alltså passera hela kvalitetsgrinden
(åtta punkter, `docs/games/README.md`) på egen hand.

🚨 **Skalan är den största risken i hela planen.** Mätt mot `bygg-en-kompis` (1834 rader för en
STRIKT enklare generator) landar allt nedan på **3 500–4 500 rader** plus en egen sond med sex
påståendefamiljer som var och en kräver en kontrollarm först. Det ryms inte i ett pass, och ett
spel som byggs halvt landar som 🔧 — vilket huset inte tillåter för ett nytt spel.

**Därför byggs det i två leveranser, och båda är hela spel för ett barn:**

**LEVERANS 1 — verkstan och födelsen (~1 400 rader).** Rummet, den levande kupan, de fem
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
* [Deep] `kupan.js`: dioramat, de fem världsskalärerna, blobben, de fem maskindelarna, spaken.
* [Deep] Ceremonin F0–F5 med `Mjukkropp` (se §6), interaktiv knådning.
* [Deep] Kläckningen: fyra knackningar, seedad sprickväg, ljus genom sprickorna.
* [Deep] "Världen kommer ut": marken växer ut, fyra rekvisita per värld, partiklar, knyttet reser sig.

**Karaktär**
* [Deep] Femlägesmaskinen med EN `_apply()` som summerar skalärer.
* [Medium] Bobo vid spaken (`lib/karaktarer.js`), nyfiken under ceremonin, jubel vid kläckning.
* [Medium] Knyttets eget fyrtonsmotiv **ur fröet** — varje knytt har sin egen röst, även utan Ljudtratten.

**Progression & samling**
* [Deep] `boden.js`: fem hyllor, 4×2 bon, levande knytt, grannkvitter, favoriten framme, dygnshälsningen, synlig och vänlig vräkning.
* [Medium] Sparmodellen (§6) med kopia vid läsning OCH skrivning och fältvis sanering.
* [Quick] ✅ **BYGGD 2026-09-01.** Upplåsningar vid 4 / 8 / 12 / 16 kläckta. ⚠️ Den fjärde stod som "en röst" — den finns inte att låsa upp sedan Ljudtratten sköts upp (§4c) och rösten härleds ur fröet, så posten är omskriven till bälgens fjärde steg. Ägarens ordning (2026-09-01): två färger → två mönster → Stjärnnatten → största storleken, alltså växande spänning i stället för spec-radens egen ordning.

**Juice**
* [Deep] `kort.js`: fonden, den öppna underkanten, de cachade foliegradienterna per tier, svepet under masken, de tre fysiska tier-skillnaderna.
* [Medium] Ljusstormen i normal alfa med täckningstak.
* [Quick] **Uppehållsmätning:** logga tiden från mount till spaktryck, och mellan spaktryck, via `gamelog`. Det är underlaget för motgångsbeslutet i §4b — utan det byggs Skrället mot ett antagande.

**Ljud**
* [Medium] Sugets brus-loop + tontrappa, degens squelch, den stigande knacktrappan, metallklangen per tier.
* [Quick] Alla 19 repliker i `voice-phrases.json` + `npm run voice`. `_narTyst`-mönstret så ingen replik kapas.

### 4b. Skrället — motgången, byggklar men GRINDAD på en mätning

✅ **BYGGD 2026-09-10** (poleringsrundan steg 3, `skrallet.js`) — **UTAN uppehållsmätningen
grinden nedan väntade på, efter ägarens uttryckliga beslut samma dag.** Uppehållstiden är alltså
fortfarande omätt, och specens egna spärrar (12 s · 22 s · 7 s) är enda bromsen. Avvikelser från
specen, alla med skäl: ⓵ **kupan behåller sin träffyta** — Skrällets nod ligger ovanpå i
z-ordningen, så ett tryck på Skrället når Skrället och ett tryck bredvid rullar fortfarande om
kupan; att stänga av skärmens största föremål vore en död yta. ⓶ De två **axlarna** är det kupan
har som FÖREMÅL: en rekvisita eller en gnista — aldrig färg, mönster eller storlek, som inte är
saker man kan bära. ⓷ En snodd **gnista går tillbaka i receptet innan tiern rullas** när Skrället
sugs in — annars hade det sänkt oddsen, och specen säger "påverkar aldrig tier". ⓸ En tredje
replik, **"Oj! Skrället åkte med in i degen!"** — tofsen ska ha en orsak barnet hör. ⓹ Det kommer
in längs **takbjälken**, inte ur tomma intet, så barnet ser det komma. Resten står nedan som
specat. Mätt: `_knyttlyftprobe` S (§5).

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

### 4c. Ljudtratten — uppskjuten, men motivet lever kvar

✅ **BYGGD 2026-09-10** (poleringsrundan steg 2 — §5 och §9 G). Texten nedan är beslutet från
2026-08-30 och står kvar som historik. Två av dess "följder" är nu omvända: harnesstrycket
(800,600) träffar tratten igen, och bänkplatsens stilleben är borttaget — tratten står där.
Och löftet "noll migrering" höll bara till hälften: plats 5 bar fröets motiv (före v1.243
`_fro % 5`), så en post måste veta OM dess plats 5 är ett val. Därför fick posten ett nionde
fält, flaggorna, med generationen — en post utan det är generation 0 och läses som förut.

**Ägarens beslut 2026-08-30: verkstan har FEM verktyg i leverans 1.** Ljudtratten var den
kontroll som gav minst synlig skillnad på varelsen — barnet valde en röst men såg ingenting nytt
i kupan, vilket bryter mot maskinens egen premiss ("varje del GÖR det den ändrar").

**Motivet stryks INTE.** Varje knytt har fortfarande sina fyra stämda toner — de spelas när det
är glatt, när det föds och i grannduetterna på hyllan. Skillnaden är bara att motivet **härleds
ur fröet** i stället för att väljas. Det är dessutom en förbättring: rösten blir en del av
individens identitet, precis som sprickmönstret och namnet, i stället för en inställning.

**Sparposten ändras inte.** Fältet `r` finns kvar i den åttaställiga arrayen och skrivs i
leverans 1 med det frö-härledda motivindexet. När Ljudtratten byggs senare sätter barnet samma
fält — **noll migrering, ingen versionsbump i spardatan.** Det är därför fältet får kosta sina
två tecken redan nu.

**Följder som måste hanteras i bygget:**

* **Recepten går från 19 200 till 3 840**, och individerna från 8,25 × 10¹³ till
  **1,65 × 10¹³**. Fröet är fortfarande den bindande gränsen och dubblettrisken är oförändrad
  (0,00046 % på 200 knytt ur samma recept) — det är antalet *inställningar* som minskar, inte
  variationen.
* **Harnesstrycket (800,600) träffar nu bakgrundsfångaren** i stället för ett verktyg. Det är
  fortfarande ett lagligt svar (ripple + `sfx('soft')` inom 100 ms), men en kontroll färre
  motioneras av standardtestet. `_knyttprobe` måste därför peka på alla fem verktygen
  explicit — förlita dig inte på standardtrycken.
* **Bänkplatsen vid (800, 630) blir ledig.** Fyll den med rekvisita (`eventMode='none'`) — en
  burk penslar, en trave brickor, en oljekanna. Det är inte dekoration för dekorationens skull:
  `bildkoll` fäller `heltackande-falt` på 45 % av duken i EN kvantiserad ton, och en tom
  bänkskiva i en träton är precis den risken. **Lämna den inte tom.**

### Senare (V2+)

* ✅ **BYGGT 2026-09-10 (poleringsrundan steg 2):** Ljudtratten (T6) på bänkplatsen (800, 630). Barnet väljer motivet i stället för fröet. ⚠️ "Ingen migrering behövs" höll inte: plats 5 bar fröets motiv, så posten fick ett nionde fält med generationen (se §4c). Harnesstrycket (800,600) i §1b återställt.
* ✅ **BYGGT 2026-09-05 (leverans 2 steg 4):** Fler världar (Öknen, Grottan) och de hyllor de för med sig — låses upp vid 20 och 24.
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

`2026-08-30 · LEVERANS 1 BYGGD (v1.237.0), 5 201 rader över fem filer: index.js 780 ·
dna.js 426 · knytt.js 1218 · kupan.js 1282 · ceremoni.js 1495. Fyra parallella byggare mot ett
i förväg spikat exportkontrakt, en ägare per fil; index.js skrevs av orkestratorn eftersom
check.mjs bara läser den och alla grindregler biter där.
**Grind:** check --game strikt 0 fel/0 varningar · test 0 konsolfel, 0 fynd, bildkoll ren.
**Hela loopen körd med egna tryck** (harnessens nio rör aldrig spaken — layout-invarianten i
§1b höll): spak → ceremoni → ägg vid 11,4 s → fyra knackningar → kläckning 14,2 s → setCustom
+ complete + stjärna 15,9 s → namnet "Flisa" sagt 18,0 s. 0 fel.
**Mätt:** morfen deg→ägg landar 0,09 px från en Mjukkropp byggd direkt på äggformen;
kontrollarmen utan `_kant` gav kvot 1,01 (nästan rund) — specen bekräftad. Städhjälparen:
18 levande tweens på barnbarn efter killTweensOf(roten)+destroy → 0 med stadKnytt.
dna._sanity(): 500 frön ur samma recept → 500 unika, 0 kollisioner.
**Fyra fel som bara bilden/loggen hittade, alla rättade:** spakens kvadrantplåt lästes som ett
LIEBLAD (tunn skära i järnton → fylld mässingssektor) · takbjälken slutade i luften (konsoler +
genomgående bjälke) · skalhalvorna ritades i äggets fulla 390 px mot ett 110 px knytt (0,72×) ·
en KÖAD replik ("Knacka en gång till") fyrade EFTER kläckningen och trängde undan belöningsraden
(`_sag` tar nu en fas-vakt och kastar repliken om spelet gått vidare).
**Uppehållsmätningen är igång** (`takt/spak` i .test-logs) — underlaget för §4b-beslutet om
Skrället. Harnessens egen rytm gav 2,55 s, vilket är HARNESSENS tidtabell och inte ett barns:
talet måste läsas ur ägarens eget speltest innan Skrället byggs eller avfärdas.
**Öppet:** V19 i docs/ATGARDER.md (`Mjukkropp.tyngdpunkt` är inte en tyngdpunkt — ceremoni.js
går runt den, `lib/` är orört). Aldrig speltestat av ett barn.`

`2026-08-30 · /felsok — tio fel hittade och rättade, alla verifierade före fix. Två sonder
byggda (`_pekprobe.mjs` · `_spakprobe.mjs`) plus `_knyttbild.mjs` för födelsebilderna.
Genomgående mönster: **fyra parallella byggare byggde varsin halva av samma mekanism och
ingen kopplade ihop dem.**

**1. Fingret nådde aldrig fram (index.js).** `this._pekare` sattes till null i `init()` och
skrevs sedan aldrig, medan TRE moduler läser den varje bildruta: kupans blobb följer fingret
med blicken, knyttet räknar fingerrörelse som liv, ceremonin räknar om koordinaten åt knyttet
den håller. Hela vägen fanns byggd och omatad. Uppmätt med `_pekprobe`: pupillsvängning
**0,00 px** och `_pekare` satt i **0/48** prov → efter fixen **8,04 px** av ett tak på 9,2,
med den stillastående musen kvar på 0,00 som kontrollarm. Följdfälla som `felsokare` fångade
i tid: `knytt._blicka` gör `toLocal(p, view.parent)`, och efter `_tillBanken` bor knyttet i
`bar` på (800,470) — en rå designkoordinat hade låst blicken i ett hörn. `_knyttPekare()`
räknar därför om per förälder; ceremonin gjorde redan rätt åt sitt håll.

**2. Spaken var en tyst, verkningslös träffyta i två faser (index.js).** `byggSpak.onTap` har
ingen egen återkoppling alls — allt ljud och all rörelse ligger i `dra()` — men träffytan står
`static` i ALLA faser. I `klacka` och `avtack` returnerade `_spakTryckt` bara. Värst i
`avtack`, för där SÄGER spelet högt "Tryck på spaken igen så gör vi ett nytt knytt!". Uppmätt
med `_spakprobe` (varje tal har en kontrollrad bredvid sig): trycket LANDADE på spaken
(egen lyssnare, träff 1) men gav **0 ljud över tomgången, armrörelse 0,000 och oförändrad fas**
— medan ett tryck på BAR GOLV i samma fas kvitterade. Nu: `avtack` stänger rundan som rösten
lovar, `klacka` kvitterar och pekar tillbaka på ägget. ⚠️ Första försöket införde en egen bugg
som sonden fångade: `avtack` börjar redan vid kläckningen, och att nollställa där (före
`_tillBanken`, 2,6 s efter 'klar') **kastade bort knyttet barnet just gjort**. Rundan stängs
därför bara när knyttet faktiskt står på bänken.

**3. Dammpuffen yrde vid fel bo (index.js).** Flygturen gick till `BO_X[antal − 1]`, puffen
till `BO_X[HYLLA_MAX − 1]` — de två första knytten landade tyst i ett bo medan dammet yrde
240 px bort, vid ett tomt.

**4. `locka()` fanns aldrig (kupan.js).** `this._spak?.locka?.()` i vilohjälpens steg 2–3
anropade en metod `byggSpak` aldrig exporterat; `?.` svalde den tyst. Handpiktogrammet svävade
över en spak som stod blick stilla, precis när barnet fastnat.
⚠️ **RÄTTELSE 2026-09-01:** fixen landade bara till hälften. Funktionen skrevs, men lades
aldrig till i `byggSpak`s returobjekt (`return { view, dra, aterstall, destroy }`), så `?.` fortsatte
svälja anropet och spaken stod still i ytterligare två dygn. Två oberoende granskare hittade det
i `/simplify`-passet. Nu returnerad. **Lärdomen är generell:** en fix som består i att SKRIVA en
funktion är inte klar förrän anroparen bevisligen når den — `?.()` mot en icke-exporterad medlem
är tyst i båda ändar, och grönt test ser den aldrig.

**5. Föremål ramlade ner i den TÖMDA kupan (kupan.js).** `laggIn('varld')`s callback på 0,34 s
hade bara en `dod`-vakt. Trycker barnet på spaken inom 0,34 s har `tomma()` redan nollat
`antal` — callbacken lade då tillbaka ett träd i den kupa barnet just sett tömmas, och
eftersom `_aterstall` anropar `setVal` med OFÖRÄNDRAD värld byggs props aldrig om: föremålet
stod kvar hela nästa omgång. `tomKupa`-vakt tillagd i både callbacken och `nyttKorn`.

**6. Vädret slocknade mitt i luften (kupan.js).** Löv/snö/gnista faller 34–60 px/s och behöver
248–278 px till marken, men `liv: 4` räcker till högst 240 — **inget** korn nådde någonsin
marklinjen. Alla 14 försvann i SAMMA bildruta (samma liv, samma dt) vid full opacitet. Bara
regnet (150–210 px/s) fungerade. Kornen tonar nu ut sista 0,4 s. Att i stället låta dem landa
prövades och valdes bort: `liv: 9` driver antalet i luften över taket 64 när två snömoln matar
samtidigt, och då hade en vevvridning kunnat ge INGET väder alls — sämre än en mjuk uttoning.

**7. Fisken poppade upp i stället för att ramla in (kupan.js).** Infallstweenen skriver
`nod.y`, men `tick()` äger `nod.x/y` för rörelsen 'simmar' och skrev över den varje bildruta.
En `faller`-flagga pausar tickens skrivning under tweenens halvsekund.

**8. Knyttet fick två skuggor, och lämnade en kvar (ceremoni.js).** `foderKnytt` ritade en
skugga i `knyttHall` medan `Knytt` redan ritar sin egen i `view`. `_tillBanken` flyttar
`knytt.view` till bänken — och lämnade ceremonins skugga kvar som en mörk fläck på världens
gräs tills barnet tryckt hem knyttet. Verifierat i bild (`_knyttbild.mjs`): en skugga vid
födelsen, ingen kvarlämnad vid bänken.

**9. Storleken räknades TVÅ gånger (ceremoni.js).** `r = 92 · storlek` skickades till en rigg
som skalar med `storlek` själv (`_bas` → `_skala.scale.set`), alltså 92·s². Barnet ställde in
storlek på bälgen och fick ett annat knytt än förhandsvisningen visade. `index.js:_ritaHylla`
skickade redan `r: 40` utan faktor — anropsställena var oense, och hyllan hade rätt. Mätt
ISOLERAT (samma dna, bara storlek varierad — höjden mellan levande varv är inte jämförbar,
nytt frö ger andra öron och horn): `höjd/storlek` konstant inom **0,2 %** och spannet
**1,62×**, exakt vad kupans blobb lovar. Före fixen hade spannet varit 2,63×.

**10. Andra spaktrycket var ljud utan bild (ceremoni.js).** Efter FAS[4] (5,3 s) gör
`hoppaTillFall()` bara `kachunk()` — ren ljudkod — och hoppar inte i tidslinjen. Trycket på
skärmens största röda föremål gav ett ljud och noll bild i över en sekund (P0 ÅTERKOPPLING).
Kvittot i bild är nu ovillkorligt, av samma skäl som `skynda()` puffar även när taket är slut.

**Plus:** knyttets fyrtonsmotiv låg på `tone({ delay })`, alltså på ljudmotorns EGEN klocka,
som varken `destroy()`, `stadKnytt()` eller `stopAllLoops()` når — tryck på ett knytt i ett bo
och sedan hem-knappen spelade upp till 0,5 s vidare på menyn. Går nu via `_senare` (`ctx.later`),
med första tonen kvar direkt för P0:s 100 ms. Två per-bildruta-kostnader borta: `malaKorn()`
gjorde `clear()` + omritning varje bildruta även med tom lista (Pixis `GraphicsContext.clear()`
har ingen tom-vakt), och `[ogonV, ogonH]` allokerade en array per bildruta.

**Grind:** `check` (hela appen) 0 fel/0 varningar · `test unika-knytt` 0 konsolfel · exit mitt
i ceremonin 0 konsolfel · `_idleprobe` 0 (spelet klarar sig inte självt).

**MEDVETET INTE ÅTGÄRDAT — kandidater för `/polera`:**
- **Hornvarianten `krona` kan aldrig ritas.** `knytt.js` har fyra horn, `dna.js:318` kan bara
  producera 0–2. Reproducerat oberoende över 20 000 frön: `[12367, 4834, 2799, 0]` (vingarna
  når alla tre). Inte rättat här: att tända en ritväg som ALDRIG renderats är innehåll, inte
  en buggfix, och den behöver en bildgranskning först. `dna.js:120-126` äger ordningen på de
  övriga deltabellerna men listar varken HORN eller VINGAR — det är därför de kunde glida isär.
- **`VARLDAR[].rekvisita` i `dna.js` listar fem id:n som inte finns i `kupan.js` REKVISITA**,
  och fältet läses av ingen (`kupan.js` och `ceremoni.js` slår båda upp via världsnyckeln).
  Dött fält med fel innehåll — en fälla för nästa ändring, ingen körningseffekt idag.
- **`dna.js:200`s doc-rad säger att `val.r` väljer motivform**, men `dnaFromSeed` läser aldrig
  `val.r` — `r` härleds ur fröet. Sparpostens plats 5 bär ett tal ingen läser. Ingen
  körningseffekt (individen återskapas rätt ändå).
- ✅ **Sömntrösklarna — BESVARAT 2026-09-01 (ägaren): KODEN gäller** (12 s → sömnig, 8 s till →
  sover). §1 "De fem slingorna" var den inaktuella halvan och är rättad: §3c hade redan kortat
  trösklarna från 20+12 med motiveringen "två osynliga timers är ingen mekanik", och §1 följde
  aldrig med. Ingen kodändring — det var en doc-rättning hela tiden.
- **`ritaDeg()` allokerar ~75 objekt per bildruta** under F2+F3 (~225 bildrutor). Omätt —
  `.test-logs` når aldrig ceremonin. Mät med `_fpsprobe --cpu 6` innan något ändras.
- **Dött tillstånd** i ceremoni.js (`morf`, `halvor`, `ur`/`sistKnack`, getterna `fas`/`lage`)
  och knytt.js (`this.bredd`/`this.hojd`, som kostar en `getLocalBounds()` per bygge inklusive
  hyllans tre vid varje `_ritaHylla`). Städning, inte fel — hör till `/simplify`.
- **Läget `'lekfull'` nås aldrig** — `setLage('lekfull')` anropas från ingenstans, så kroppen
  som lutar efter fingret och öron/svans ×2,5 kan inte inträffa. Byggd men aldrig kopplad, som
  fynd 1 — men att koppla in den är ett designval om NÄR den ska gälla, inte en buggfix.`

`2026-09-01 · /simplify KÖRD (v1.239.0), 5 476 → 5 310 rader; lib +43. Två granskare, fyra
linser, högst 2 agenter enligt ägaren. Kvalitet, inte buggjakt — grinden var grön före och efter.
**Slaget ihop:** `stadTrad` · `stadNod` · `stadKnytt` var samma mekanism i tre stavningar, var och
en med en egenskap de andra två saknade (flaggnollning · `position` som eget gsap-mål · djuptak).
Nu **`stadFx()` i `lib/feedback.js`** — rätt höjd, eftersom den modulen äger de `_fx*`-handtag som
städas; ceremonins egna `_wPuls` deklareras vid anropet via `extra`. 79 rader duplicering borta.
**Rättat:** `locka()` returneras nu (se rättelsen i fynd 4 ovan). **Per bildruta:** `mjukKurva`
allokeringsfri (−45 objekt/ruta i degfasen), `_pekPrev` → skalärer. **Borttaget dött:** fyra
namnlistor i dna.js som ingen läste, `_hylla`, `_eviga`, `post.slot/wr`, `skalarer`/`rullaOm` ur
kupans publika API, `* s * s` med `s === 1`.
**Mätt, inte antaget:** `scripts/_stadprobe.mjs` river i SAMMA evaluate som mätningen och läser
`_fx*`-handtagens `tw.parent` — barlast (stadFx urkopplad) **9 → 7 levande**, riktig kod **9 → 0**.
Två tidigare versioner av sonden gav samma svar i BÅDA armarna och mätte alltså ingenting; se
sessionsloggen.
**Sex fynd togs medvetet INTE** och är `/polera`-material: palettformeln skiljer mellan `satPalett`
och `dnaFromSeed` (förhandsvisningen lovar fel färg) · frö-härledda nyanser bakar en `FillGradient`
per kläckning i en cache utan eviction (~40–70 KB GPU/kläckning) · `ritaDeg` ritar en geometri tre
gånger per bildruta (`degLjus` är bevisligen `scale(0,62)` + offset) · rekvisitan rör sig olika inne
i kupan och ute i världen (solen 11,4 s mot 24 s per varv) · `AXEL.steg` hårdkodar tabellängder ·
och vilohjälpen spelar fel ton (392 mot 523 Hz) och når in med `view.children[0]` i stället för
`tryck()` — den sista är en BUGG och hör till `/felsok`.`

`2026-09-01 · **DEN OBEROENDE KVALITETSKRITIKEN ÄR KÖRD.** Tre `spelkritiker` med var sin lins
(verkstan · ceremonin · återkomsten), alla fynd verifierade i koden av orkestratorn innan de
skrevs in. Tre buggar rättade, fyra frågor lyfta till ägaren. `_knyttprobe.mjs` — sonden §7
kallar obligatorisk — är byggd i samma pass.

**Vad granskarna INTE hittade är värt lika mycket:** verkstadens fem delar UTFÖR verkligen det de
ändrar (blobben målas om när paketet FYSISKT når den, `kupan.js:800`, inte när variabeln ändras),
varje del har egen ton OCH eget sfx, knackfasen är äkta obligatorisk agens (`_idleprobe` = 0),
exit-säkerheten är ovanligt grundlig (varje `onUpdate` har egen `destroyed`-vakt ovanpå
tween-dödandet), och "världen kommer ut" är en riktig händelse med fyra ritade rekvisita, inte ett
bakgrundsbyte. Ingen P0-överträdelse hittades av någon av de tre.

**Tre buggar rättade, alla mätta mot HEAD med `_knyttprobe.mjs`** (två kontrollarmar; HEAD faller
på alla fem mätarmar och klarar båda kontrollerna):
- **`_narTyst`s tak var kortare än spelets egna klipp.** Taket stod på 10 varv à 0,35 s = **3,5 s**
  och fyrade sedan OVILLKORLIGT. Uppmätt med `ffprobe` på spelets elva klipp: spannet är
  **2,60–5,12 s**, och **fem av elva** är längre än taket ("Tryck på spaken igen…" 5,12 ·
  "Knåda degen…" 4,49 · "Tryck på maskinen…" 4,38 · "Nu blandas allt ihop…" 3,97 · "Titta så
  ägget lyser…" 3,54). Mekanismen som byggdes för att hindra kapning orsakade den alltså själv.
  Kommentaren intill sa dessutom "klippen är 2,3–4,1 s" — fel i båda ändar. Taket är nu 20 varv
  (7,0 s) i konstanten `NAR_TYST_TAK`.
- **Vilohjälpen lärde ut EN av fem delar och skyndade sedan mot spaken.** `_viloHjalp`
  highlightade **hårdkodat** `_verktyg.farg` (kommentaren intill sa "Närmaste maskindel" men
  ingen närhet räknades någonsin ut), och steg 2–3 pekade mot spaken **utan att läsa
  `_valGjorda`** — ett barn som provat en enda del fick "dra i spaken" som nästa ledtråd. I det
  spel vars hela premiss är fem oberoende val drog alltså assistmekaniken mot avslut i stället
  för mot upptäckt. Nu roterar hjälpen över de OPROVADE delarna (`_rorda`-mängden; `_valGjorda`
  är bara ett antal och kan inte säga vilken del som är oprovad) och når spaken först vid ≥2 val.
  Samma ändring stänger fyndet ⓺ nedan: delarna har fått ett `locka()` i `kupan.js` som gör
  delens EGEN rörelse och spelar dess EGEN ton, i stället för att index.js nådde
  `squash(view.children[0])` förbi modulen och spelade 392 Hz (`storlek`s ton) för varje del.
  Uppmätt: HEAD `- → SPAK → SPAK → SPAK` (0 unika delar, ton 392) mot `farg → gnista → storlek →
  monster` (4 unika, 523/659/392/587 — var och en sin egen).
- **Knådningen svarade bara på släpp, aldrig på att gnugga.** Rösten säger "Knåda degen med
  fingret så lyser den mer!" (4,49 s — spelets näst längsta klipp), men `knada()` nåddes bara via
  `_skynda`, som hänger på `pointertap`. Ett barn som höll fingret nere och gnuggade fick **EN**
  knuff, vid släppet. Nu knådar draget, trottlat på 70 ms. Uppmätt över 12 pekarflyttar:
  **HEAD 1 knådning (bara den avslutande tappen) → 8–9 med fixen**, kontrollarm med knappen UPPE
  **0 i båda**. `skynda()` följer avsiktligt INTE draget (den kortar tidslinjen 0,12 s per anrop
  och hade bränt hela taket 1,2 s på ett drag): uppmätt 1 mot 8. Pekar-nere-flaggan sitter på
  `_rot` med `eventMode='static'`, för båda släppvägarna går uppför en föräldrakedja och aldrig
  i sidled — och en bar `Container` utan `hitArea` träfftestar aldrig själv, så roten stjäl inga
  tryck (verifierat: 9/9 tryck svarar, alla fem verktyg nås, 0 svar över 100 ms).

**⚠️ Sonderna var själva fel FYRA gånger i det här passet — alla fyra fångade av kontrollarmar:**
⓵ `_variantprobe` v1 räknade hur ofta två knytt var IDENTISKA och fick 0,00 % i BÅDA armarna
(15 843 unika siluetter på 20 000) — sant, men fel fråga, och armarna kunde inte skiljas åt.
⓶ `_knyttprobe` läste `toner[0]` och fick delens MEKANISKA ljud (färgkranens trähandtag 300 Hz,
mönsterhjulets ratsch 220 Hz) i stället för identitetstonen som kommer strax efter.
⓷ `_knyttprobe` krävde `skynda === 0` av ett drag — men ett drag avslutas med en `pointertap` i
Pixi, och den tappen FÅR korta tidslinjen; rätt fråga är om `skynda` skalar med rörelsen.
⓸ Två armar var gröna på HEAD utan att mäta något: `knad > 0` passerade på den avslutande tappen
ensam, och tonkontrollen var **vakuöst** sann eftersom ingen del någonsin lockades på HEAD.
Båda är nu skärpta (`knad >= 3`, och tonarmen kräver `unika.size > 0`). En arm som är grön för
att den inte mätte får inte räknas som grön. **Och `B0` var felmärkt som kontrollarm** — den
faller på HEAD, alltså är den en mätarm; en riktig kontroll (ingen vilostund → inget lockas) står
nu i dess ställe.

**Fyra frågor lyftes till ägaren i stället för att avgöras här** — ÅTGÄRDER U1–U4. Ägaren
svarade samma dag: **U1 och U2 byggda** (se nedan), **U3 och U4 ligger kvar** som egna pass.

`2026-09-01 (samma pass, andra halvan) · U1 + U2 byggda, och den HELA RUNDAN avslöjade en
krasch ingen test kunnat se.` Sonden fick två armar till (`C` recept, `D` röstutrymme) och
spelar nu hela §7-kedjan: spak → ceremoni → fyra knackningar → knyttet på bänken → spaken igen
→ ny runda.

- **U1 — receptet cyklas bara när barnet inte rört något.** `_aterstall` stegar `f`/`m`/`v` när
  `_rorda.size === 0`; rörde barnet en del gäller dess val fullt ut. Delarnas egna räknare
  synkas med `satSteg`, annars står de kvar på gamla steg och nästa tryck hoppar tillbaka.
  Uppmätt i det LEVANDE spelet: orört recept `f 0→1 · m 0→1 · v 0→1`, kontrollarm med ett tryck
  på färgkranen `f 1 → 2` (ett steg, inte två — `_aterstall` rör den inte).
- **U2 — `pa('klar')` 1,5 → 2,15 s.** Uppmätt avstånd `avtack`→`_klar`: **2,64 s → 3,31 s**, mot
  taglinens 3,232 s. Talet är satt av RÖSTEN, inte av rytmen; kommentaren i koden säger det så
  nästa läsare inte trimmar tillbaka det.
- **⚠️ Spöktweenen (ÅTGÄRDER U5) — den dyraste buggen i hela passet, och den hittades bara för
  att sonden spelade en ANDRA runda.** `_tillBanken` tweenar knyttets bärare mot bänken i 0,9 s,
  och träffytan barnet ska trycka på föds i samma andetag. Ett otåligt barn trycker direkt →
  `_hemTillBoet` startade en andra tween på samma nod (gsap överskriver inte per automatik) och
  rev noden via `_aterstall` medan flygturen hade tid kvar. Sedan skrev den döda tweenen `.y` på
  en riven nod **varje bildruta resten av rundan**, och ett gsap-fel kortsluter bildrutan — så
  tryck EFTER det tappades tyst. Uppmätt: **22 konsolfel på ursprungskoden `1c3f9ab` → 0**, och
  levande tweens mot rivna noder **1 → 0**. `destroy()` gjorde redan rätt, alltså var EXIT säkert
  hela tiden; det var ÅTERSPELET som brann. Ägaren till tweenen namngavs genom att haka på
  **appens egen** `gsap.to` och spara skapelse-stacken — en nyimporterad kopia har egen global
  tidslinje och rapporterar 0 oavsett vad som pågår.

**⚠️ Och sonden var fel ytterligare två gånger, båda gångerna för att SPELET hade rätt:**
⓹ den väntade på att fasen skulle gå tillbaka till `'bygga'` av sig själv och hängde i 20 s —
men rundan återställs med flit inte automatiskt: knyttet står kvar tills barnet skickar hem det,
precis som repliken lovar. ⓺ den tryckte sedan på spaken 400 ms efter `_klar` och hängde igen —
`_spakTryckt`s `'avtack'`-gren kräver `_knyttYta`, och trycks spaken tidigare **vägrar den med
flit** att nollställa, eftersom fasen börjar redan vid kläckningen och en nollställning där hade
kastat bort knyttet barnet just gjort. Båda gångerna var svaret att läsa spelets egen garde och
mäta efter den. Sammanlagt var mätaren fel **sex gånger** i det här passet mot tre kodfixar +
två ägarbeslut — och exakt det är varför en ny sond kostar mer än speländringen.`

`2026-09-01 (kväll) · **UPPLÅSNINGARNA BYGGDA — ÅTGÄRDER U3 + U4 stängda** (v1.242.0).
Spelets enda tänkta SAMLINGS-krok fanns i spec §0 och i byggplanen, men inte i koden. Nu gör den
det, och verkstan är därmed det första i spelet som VÄXER.

**Premissen prövades mot koden först, och föll till en fjärdedel.** Spec-radens fyra belöningar
var "ny värld, två mönster, två färger, en röst" — men rösten går inte att låsa upp: Ljudtratten
sköts upp 2026-08-30 (§4c) och motivet härleds sedan dess ur fröet. Posten är därför OMSKRIVEN
till bälgens fjärde steg, inte räddad med en uppfunnen kontroll. **Ägarens beslut samma dag:**
växande spänning — 4 → två färger (rosa + sand) · 8 → två mönster (fläckar + stjärnor) ·
12 → **Stjärnnatten** · 16 → största bälgsteget. Startverkstan är alltså 8 · 4 · 3 · 3.

**Mekanismen.** `START_TAK` · `MILSTOLPAR` · `takFor()` · `antalFranPoster()` ligger i `dna.js`
(ren logik, inget Pixi — det är det som gör dem mätbara utan webbläsare). Verktyget fick
`satTak()`; `onTap` cyklar mot taket i stället för mot `spec.steg`. Tabellerna rör sig ALDRIG —
index sparas — så en upplåsning kan bara lägga till i slutet av en tabell.

🚨 **`_tak` var först ett fält, och det var fel.** `_provaUpplasning` glömde uppdatera det, och
firandet ställde då receptet på ett läge vars tak inte hade växt. Det är samma familj som varje
"två sanningar om samma axel" i den här filen. `_tak` är nu en **getter härledd ur `_antal`** —
det finns ingen andra plats att glömma. Sonden hittade det; jag hade inte sett det själv.

**Firandet är i verkstan, aldrig i ceremonin.** Sist i `_aterstall`, efter att knyttet flyttat
hem: receptet ställs på det FÖRSTA nya läget, `laggIn(axel)` kör in det i kupan (samma väg som ett
vanligt tryck — premissen "varje del GÖR det den ändrar" gäller även här), delen `locka()`:r,
Bobo jublar, handen pekar, och narratorn säger vad som hänt. Bilden kommer genast, bara orden
köar (`_narTyst`). Lämnar barnet spelet mitt emellan står `firad` kvar och avtäckningen kommer i
slutet av nästa runda — delarna är redan barnets, det är bara ceremonin som är skjuten.
**Ingen räknare, ingen procentsats, ingen låst siluett syns någonstans** (P0 FOMO): det enda
barnet möter är att något NYTT dyker upp.

**Gamla sparposter förlorar aldrig något.** `antalFranPoster()` härleder antalet ur vad barnet
REDAN gjort — har hyllan ett stjärnnattsknytt är milstolpe 12 passerad. Utan den hade en spelare
vaknat till en verkstad där en värld hen använt var borta. Sparblobben är `v: 2` med `n`, `firad`
och `dag`; **en enda skrivare** (`_spara`) äger den, för två hade tappat varandras fält.

**U4 i samma andetag:** `dag` (dygnstal, aldrig klockslag) gör att det betalda men aldrig anropade
klippet "Titta, dina knytt har saknat dig!" nu spelas — men bara när hyllan har knytt OCH besöket
är en annan dag.

**Mätt, två sonder, kontrollarm före mätarm hela vägen.** `scripts/_upplasprobe.mjs` (ny,
node-only, 11 armar) tar den rena logiken: startverkstan smalare, exakt EN axel per milstolpe,
inget tak som krymper, migreringens fem fall, och `falt` läst UR `_sparaKnytt` i stället för
antaget. `_knyttprobe.mjs` fick armarna **U0–U2 + D0–D2**: tolv tryck på färgkranen når
**7 mot barlastens 9**, en kläckning tar taket **8 → 10**, alla fyra firandena tända ger
**0 konsolfel** (världen bygger om dioramat och bälgen skalar blobben — helt andra vägar än
färgen, och U1 rör dem aldrig), och dagshälsningen har två kontrollarmar mot en mätarm.

⚠️ **Barlasten (START_TAK = hela tabellen = HEAD) avslöjade ett mätfel i min egen sond:**
U1 läste bara slutvärdet `tak === 10` och var därför **grön på HEAD**, där taket är 10 hela tiden.
Den kräver nu att taket VÄXTE under rundan. En arm som inte kan skilja två KÄNDA lägen åt mäter
ingenting — och den här hade jag skrivit och trott på utan barlasten.

**Grind:** `check` 0 fel/0 varningar · `test unika-knytt` 0 konsolfel, bildkoll ren ·
`_upplasprobe` 11/11 · `_knyttprobe` 26/26 (alla gamla armar orörda och gröna).
De fyra nya replikerna är genererade offline med F5-TTS (3,43–4,49 s, alla under `_narTyst`-taket).

**Öppet:** spelet är fortfarande **aldrig speltestat av ett barn**, och §4b:s uppehållsmätning
väntar fortfarande på ägarens eget speltest (harnessens 2,55 s är harnessens tidtabell). Kvar
sedan tidigare: leverans 2 (sällsynthet · folie · Knyttboden) och V19.`

`2026-09-01 (dag) · /simplify + ÅTGÄRDER U6 (v1.245.0 → v1.246.0).
**/simplify** kördes med ägarens tak på HÖGST 2 agenter (fyra granskningsvinklar, två och två).
9 fynd applicerade: `rort` var härledbar ur `flytt` · `_lutMal` var ett instansfält som bara lästes
på raden efter att det skrevs · lekzonens tre produkter räknades om varje bildruta trots att `_r`
sätts en gång (städning, inte mätbart — hyllans knytt kortsluter på `!!pekare`) · `_val.r` var ett
spökfält (`_val` är barnets UI-val, `r` är genetikhärlett; `_sparaKnytt` skriver `_dna.val.r`
direkt, identiska bytes på disk) · `g.eventMode='none'` i `_ritaPrylar` var en no-op · L-familjen
i `_knyttprobe` byggde om `rundan()`s kropp rad för rad (nu `stannaPaBanken`, och L får tillbaka
`_klar`-väntan den saknade) · `_knyttbild` hade duk-mappningen inlinad på fyra ställen och två
`page.evaluate` med identiskt ställningsverk · och den rapporterade `e` från SISTA ögat medan
`over` var maximum över alla. Fyra fynd lämnades med flit, motiven står i commit `04b8e99`.

**§9 A:s första fråga besvarad av ägaren: KODEN gäller** (12 s → sömnig, 8 s till → sover). Det
var en ren doc-rättning — §3c hade redan kortat trösklarna från 20+12 med motiveringen "två
osynliga timers är ingen mekanik", och §1 följde aldrig med.

**ÅTGÄRDER U6 stängd.** Ögonlocket var en flat `p.bas`-lucka med rak överkant över ett
`sphereFill`-tonat ansikte, och de två locken MÖTTES (ögonen 2,93e isär, locken 3e breda) till ett
band tvärs över hela ansiktet. Ny sond **`scripts/_lockbild.mjs`** (en blink varar 0,2 s och går
inte att fånga på måfå — locken tvingas till kända lägen, sex `ogonform` sida vid sida).
⚠️ **Mätaren var fel fyra gånger**, varje gång fångad av en kontrollarm: provpunkterna lästes ur
`getGlobalPosition()` FÖRE första renderingen · referensen 2,2e åt sidan landade i GRANNÖGATS lock
· kantsvepet mätte ⌣-bågens mörka streck · och **luminans är blind på en gul kropp** (−8,5 lum men
−37 i BLÅ).
⚠️ **Fixen tog tre försök, och de två första är lärdomen: ingen FAST TON kan matcha en bakgrund som
ytan GLIDER över.** Kalibrerad mot pannan (`tint(bas, 0.23)` = dess uppmätta 241,229,126 på
pricken) försvann överkanten helt stängd (16 → 2), men gradienten är bakad i lockets EGET rum, så
vid `somnig` (0,7) trycker `scale.y` ner den ljusa toppen över ögat och locken lyste som två ljusa
lådor. Kalibrerad mot ögonhöjd: halvläget rätt, överkanten **18** — sämre än den platta. Locket
tonar därför in ur genomskinligt (**`fadeTopFill`, ny i `lib/form.js`** — ny export, ingen
befintlig anropare rörd), och intoningen måste vara FÄRDIG ovanför ögat: första fadet nådde ner
över ögat som lyste igenom och mätte **37**, då på ÖGATS kant och inte på lockets.
Formen är nu en mandel: smalast vid brynet (±1,31e → 2,61e < 2,93e, locken möts inte längre) och
bredast rakt över ögat (±1,53e, täcker `stjarna`s 1,34e), med bryn-båge och en mörkare lockkant.
**Uppmätt: överkanten 16 → 4–5 kanalsteg · sidokanten 5 → 5 · locket fortfarande innanför kroppen
(värsta −6,1 px).**

**Grind:** `check` 0/0 · `test unika-knytt` 0 konsolfel, bildkoll ren · **`test:all` 85/85** (delad
`lib/form.js` rörd) · `_knyttprobe` 36/36 · `_upplasprobe` 11/11 · `_variantprobe` · `_knyttbild`
0 konsolfel · `_idleprobe` 0.

**Öppet:** spelet är fortfarande **aldrig speltestat av ett barn**. §9 A har två frågor kvar och
båda väntar på samma sak — ägarens eget speltest: Skrället (§4b) och upplåsningarnas takt.
Därefter leverans 2 (sällsynthet · folie · Knyttboden), och V19/V16 i delad kod.`

`2026-09-05 · LEVERANS 2 påbörjad (v1.247.0). Ägarens speltest är gjort ("bra"), och ägarens
riktning är variation + de saknade funktionerna. Ordning vald av ägaren: persistens →
sällsynthet+folie+kompis → Knyttboden → variation (större rekvisitapool per värld + två nya
världar, Öknen och Grottan). En commit per steg.

**Steg 1 — persistens (`c7ccc63`).** Hela samlingen sparas (`_alla`, tak 200); hyllan visar
`_alla.slice(-3)`. Före det sparades BARA hyllans tre, och varje fjärde kläckning kastade det
äldsta knyttet för gott — boden kan bara visa det som finns på disk, så det här kom först.
Uppmätt med `_knyttprobe` S0/S1: fem poster + en runda gav **3 på disk på HEAD, 6 nu**.

**Steg 2 — sällsyntheten, folien, tier-skillnaderna och kompisen.** Ägarens tal exakt
(`dna.js:rullaTier` · `tierOdds`): guld 2 % · silver 5 % · brons 10 %, burken +1/6 · +0,5 ·
+1,0 pp per gnista med tak +5 pp, första kläckningen och sex vanliga i rad ger minst brons.
Rullas i `_startaCeremoni` ur ETT slumptal FÖRE en bildruta ritats; sparas på plats 7 i posten
(`_rensaPost` klampade den redan mot 4). Tiern läser inget ur fröströmmen — samma frö ger samma
individ oavsett tier (uppmätt: `_tierprobe` T4). **Avtäckningen:** ägget glöder i sin metall
redan i F3 (`aggMal` dras mot `TIER_FARG`), ljusstormen tar metallen, metallklang (784 · 1047 ·
1319 Hz med oktav) + metallflingor vid kläckningen. **Folien** (`ceremoni.js:byggSkimmer`): ett
cachat linjärt flerstoppsband per tier (modulnivå-`Map`) sveper under en mask klippt ur fondens
egna `roundRect`, normal alfa; `mask = null` innan noden rivs. **Fysiska tier-skillnader:**
brons hamrad kopparlist (26 gropar med ljus kant) · silver regnbågskantljus (stroke med
gradient-`fill`) + tre drivande gnistor · guld bred guldram + solkrona (8 strålar i `bak`,
andas i egen tidslinje) + **gloria på knyttet självt** (`knytt.js`, guppar i egen takt, sjunker i
sömnen — syns på hyllan vid r 40). **Kompisen** (vanliga knytt, det ett skimrande aldrig får):
`KOMPISAR` i `knytt.js`, en per värld (skalbagge · småfisk · snösparv · nattfjäril; gräshoppa och
fladdermus ligger klara för Öknen/Grottan), ritad fristående med foten i origo, sitter på
hjässan i `_liv` — hållaren bär platsen och flygturen (`kompisIn()`, tween på hållaren), bilden
fladdrar per bildruta i `_apply`. Ceremonin flyger in den 1,5 s efter födseln; hyllan får den
sittande. Narratorn: "Oj, vad det glittrar!" eller "Ditt knytt har fått en liten kompis med
sig!" DIREKT efter namnet, kedjat via `_narTyst` (båda klippen fanns redan, betalda 2026-08-30
och aldrig anropade). `torka` bor i samma sparblob som `n`/`firad`/`dag` — en skrivare.

**Mätt:** `_tierprobe.mjs` (ny, node-only, 12 armar, u ur ett jämnt rutnät så andelarna är
exakta): tabellen på hundradelen (g0 2,00/5,00/10,00 = 17,00 … g3 2,50/6,50/13,00 = 22,00), taket
(g7 = g3), garantierna (första · torka 6 → 0,00 % vanlig; torka 5 → 83,00 %, kontrollarm),
genetiken orörd, en kompis per värld, plats 7 läst UR `_sparaKnytt`. `_knyttprobe` T0/T3
(`_tvingaTier`, DEV-krok nollad i `init`): vanlig → kompis sitter, ingen gloria, ingen folie,
disk t=0; guld → gloria + folie, ingen kompis, disk t=3, hyllans knytt bär glorian.
`_skimmerbild.mjs` (ny): en runda per tier, fyra bilder + hyllan — och det var BILDEN som
hittade att knackhandens 1,2 s-timer visade handen ovanpå den nyfödda världen när barnet
knackat färdigt på under 1,2 s (vaktad på `_fas === 'klacka'` nu).

⚠️ **Sondens `start()` rensade aldrig.** `localStorage.removeItem` + `reload` nollställer
ingenting: `SaveService` flushar det levande dokumentet vid `pagehide`, alltså EFTER
rensningen — varje familj ärvde förra familjens sparpost. Det syntes först när T0 fick
`torka 2` efter EN runda. U0 ("startverkstan har 8 färger") var grön bara för att de läckta
rundorna stannade under milstolpe 4. `save.resetAll()` var fel väg (ett dokument utan profil,
GameHost kraschar tyst i `ensure` och varje `setCustom` kastar); rätt väg är spelets egen
sparblob via `ctx.progress.setCustom` + in i spelet en gång till, som `besok` redan gjorde.

**Steg 3 — Knyttboden (`boden.js`, ny, ~570 rader).** En rullande popup som bara visar det
man FÅTT: en skylt bara för världar som HAR knytt (Alla alltid först, Skimmer när något
skimrar), ett hyllplan bara där det finns knytt, fyra bon per plan. Riggarna (r 44) byggs LAT
för raderna i bild (±1) och rivs utanför, så 200 knytt kostar som åtta. Rullning: axellåst
drag på innehållsytan med `scrolling()`-vakt (LibraryScreen-mönstret) + två 96 px pilar som
stegar ett plan, snäpp till närmaste plan. Favoriten = det knytt barnet senast tryckte på
(fröet i `fram`, samma sparblob, samma skrivare), står FÖRST i Alla och gör sin glada slinga
vid öppning; är besöket "en annan dag" hoppar alla i bild till, ett i taget. Grannprat var
5–9 s: ett grannpar lutar sig mot varandra och kvittrar sina motiv i tur (`Knytt.sjung()`, ny),
högst ett åt gången och aldrig medan barnet rör skärmen. Skimrande knytt får en list i sin
metall runt boet i ALLA flikar. Bodluckan är en stuga under spaken (1160, 612) där ett par
ögon kikar ut var åttonde sekund; ett tryck öppnar boden. **Tom samling → luckan är en
leksak** (ögonen kikar, en ton, handen pekar mot spaken), aldrig ett tomt rum. Repliker i
index.js: "Här bor dina knytt." vid öppning · "Tryck på ett knytt så vaknar det." efter 7 s
stillhet · "Nu sover det. Väck det försiktigt!" när det första synliga somnar. Bobo flyttade
till (1000, 600). §1b har luckans och overlayns träffytor.
**Mätt:** `_bodprobe.mjs` (ny, 11 armar): K0 tom samling öppnar INTE · B0 luckan öppnar
(fas `boden`, kupan `none`) · B1 flikar = Alla + skog + vatten + natt + skimmer (ingen snö,
ingen sno-skylt) · B2 11 poster, 8 i bild, rullbar · B3 pilen −200 och tredje raden byggd ·
B4 drag på ett bo rullar utan att något blir glatt · B5 tryck → glatt + `fram` sparat ·
B6 världs- och skimmerflik filtrerar · B7 dörren → `bygga`, kupan `static` · B8 favoriten
först · exit med boden öppen 0 fel. Bilder: `.test-shots/knytt-bod-alla.png` ·
`knytt-bod-skimmer.png`.
⚠️ **`innehall.eventMode = 'none'` gjorde varje bo till en död träffyta utan konsolfel** —
`'none'` ignorerar händelser även på BARNEN (till skillnad från `passive`). B5 hittade det;
B0–B4 var gröna för de aldrig tryckte på ett bo.

**Steg 4 — variation (ägarens två val).** ⓐ **Rekvisitapoolen är 7 per värld** (var 4):
skog +stubbe/blomma/moln · vatten +bubbla/sjöstjärna/näckros · snö +snögubbe/istapp/snöflinga ·
natt +stjärna/uggla/lykta. Fröet permuterar poolen (`kupan.js:rekvisitaOrdning`, Fisher–Yates
ur `mulberry32(fro ^ …)`); kupan visar de första `antal` i den ordningen och ceremonin de fyra
första — SAMMA ordning, så förhandsvisningen och finalen är samma värld. Fröet rullas därför
redan i `init`/`_aterstall` (inte först vid spaken), och glaset rullar om det: `kupa.setFro()`
byter föremålen på plats med en squash, barnet SER att glaset gav nya saker. Ceremonin fick
två himla- och två mellanplatser (poolen kan ge två luftföremål; med EN plats hade de
staplats). ⓑ **Två världar:** **Öknen** (nyans 22–52°, kloss+larv, spetsiga öron, blixtsvans,
sand som driver i sidled genom taket, kompis gräshoppa) och **Grottan** (296–324°, droppe+böna,
hängöron+antenner, lång svans, glödande sporer som dalar, kompis fladdermus), sju föremål var,
egna toner i kupan (`VARLDSTON`) och i fonden. Låses upp vid **20 → Öknen · 24 → Grottan**.
`MILSTOLPAR` bär nu `fran` per milstolpe (världen växer i TRE steg, så `START_TAK` räckte inte
som migreringströskel; `antalFranPoster` och `_firaUpplasning` läser `fran`), och
`UPPLAS_REPLIK` nycklas på `vid`. Två nya repliker i `voice-phrases.json`, väntar på
`npm run voice`. Bodens skyltar för de två världarna fanns redan ritade (steg 3).
**Mätt:** `_upplasprobe` 12/12 (nya fall: v 4 → 20, v 5 → 24, ett grottknytt lyfter förbi alla
tre världsmilstolpar) · `_tierprobe` 12/12 · `test` 0 fel · `_knyttprobe` U2 med milstolpe 20
och 24 · bilder `.test-shots/knytt-tier0-varld4.png` (öknen) · `knytt-tier2-varld5.png`
(grottan) · `_bodprobe` 11/11.`

`2026-09-10 · POLERINGSRUNDAN (ägarens sex steg) — STEG 1, RÄTTELSERNA. Förslaget lades fram
förmiddagen 2026-09-10 och godkändes samma dag ("ja, kör alla sex steg"); det fanns bara i
chatten och står nu i §9 G. Ny sond för hela rundan: `scripts/_knyttlyftprobe.mjs`, där varje
familj körs mot koden FÖRE sin ändring innan den räknas som bevis.

**Bodens P0-avstånd.** Pilkolumnen stod på 330/490/630: pil ▼ och dörren 20 px isär, och den
ÅTTONDE skylten (Alla + sex världar + Skimmer, x 1008–1112) 16 px ovanför pil ▲. Ingen sond hade
mätt bodens avstånd, och åtta skyltar kräver knytt i alla sex världar — felet fanns sedan Öknen
och Grottan kom (leverans 2 steg 4) men hade aldrig körts. Pilkolumnen står nu på 340/484/628.
**B9b: 16 → 24 px** (minsta paret är nu pil ▲ ↔ pil ▼, exakt på gränsen).

**Kupans färglöfte.** Kupan räknade en EGEN palett (`h + vinkelDiff·0,2` utan klamp, egen
mättnadstabell `VARLDSTON.hy/.matt`) medan dna.js klampar nyansen ±8°. Nu delar båda
`dna.js:palettFran`; `dnaFromSeed` drar fortfarande exakt tre tal ur strömmen i samma ordning.
**K1: värsta avvikelsen 22,7° → 3,4°** (gul/vatten 22,7 → 0,6 · röd/natt 10,5 → 0,5 · lila/öken
18,1 → 0,5). Kontrollarmen K0 (grön i skogen, där formlerna redan var ense) 4° → 3°.
**Identitetsarmen I1: 0 olika av 12 000 individer mot `0da98f6`** — inget sparat knytt har bytt
utseende, och I0 visar att jämförelsen kan se en skillnad (grannfröet: 12 000 av 12 000 olika).
Harnessens eget recept (orange i vattenvärlden) visade en GUL blobb i kupan före ändringen; nu
orange, som knyttet.
Döda fält borttagna: `VARLDAR[].rekvisita` (sex listor med fem id:n som inte fanns, lästa av
ingen — §5-fyndet från 2026-08-30) och kupans `VARLDSTON.hy/.matt`.

**Solen** varvade 11,4 s i kupan och 24 s ute i världen. Nu `SNURR_VARV_S` = 12 s, en konstant i
kupan.js som ceremoni.js importerar. Inte vinkelmätt — det är samma tal på båda ställena.

**Knackhanden** i ny bild (`.test-shots/knytt-tier0.png`): ingen hand över den nyfödda världen,
leverans 2:s vakt (`_fas === 'klacka'`) håller.

**Grind:** check 0/0 · test 0 fel · `_knyttlyftprobe` 7/7 (B9b och K1 RÖDA mot koden före
ändringen) · `_bodprobe` 11/11 · `_upplasprobe` · `_tierprobe`.`

`2026-09-10 · STEG 2 — LJUDTRATTEN (T6).` Uppskjuten 2026-08-30, byggd nu på bänkplatsen (800, 630)
som hållits åt den. En speldosa i trä med en mässingstratt mot kupan och en vev: varje tryck vevar
fram nästa av fem melodier, fyra noter flyger ur mynningen in genom glaset, varje not SPELAS när den
lämnar tratten (första tonen i samma bildruta som trycket) och blobben svarar en oktav upp, med öppen
mun, när den landar. Melodin är exakt den knyttet sedan sjunger — tonarten är fröets, så glaset
byter den.

**Premissen "noll migrering" (§4c) föll till hälften.** Plats 5 var reserverad åt tratten men bar
fröets motiv — och före v1.243 `_fro % 5`. Läser spelet plats 5 för alla poster byter gamla knytt
melodi. Posten fick därför ett NIONDE fält, flaggorna (generation bit 0–3, Skrällets tofs bit 4), och
en generation är ett löfte: en post läses alltid under regeln den skrevs med. Generation 0 (åtta
fält) läser aldrig plats 5 och kan aldrig få kronan; generation 1 läser båda. `dnaFromSeed` drar samma
tal ur strömmen i båda — generationen ändrar vad talen BETYDER, inte vilka som dras. `dnaFranPost` är
nu den enda avkodningen; hyllan och boden hade var sin kopia av platsordningen.

**Kronan tändes — och bildgranskningen §5 krävde fällde den första ritningen.** Tre 7 px-taggar i
mönsterfärgen, BAKOM kroppen, just där kompisen sitter: osynlig på hyllan (r 40). Nu ett band med fem
uddar och stenar som sitter PÅ hjässan, i knyttets egen palett (aldrig guld — guld är sällsynthetens
färg), och kompisen sätter sig på kronan. Samma granskning fann noterna för små (8×6 px-huvud som
krympte hela vägen): nu 1,7× med vit kontur och full storlek 70 % av vägen. Bilder:
`.test-shots/knytt-tratt.png` · `knytt-krona.png` · `knytt-krona-bod.png` · `knytt-krona-stor.png`
(ny sond för rundans bilder: `scripts/_lyftbild.mjs`).

**Stillebenet är borttaget** — tratten står där — och harnessens (800,600) når tratten igen (§1b).
`AXEL.steg` läser tabellernas längder i stället för handskrivna tal (fyndet från /simplify 2026-09-01).

**Mätt, `_knyttlyftprobe` R (alla mätarmar RÖDA mot koden före ändringen):** R0 0 av 3 000
åttafältsposter olika · R6 en åttafältspost migreras till nio, flagga 0 · R5 (800,600) når tratten ·
R1 fem tryck = fem olika melodier, 5/5 exakt knyttets motiv · R3 20 noter framme · R2 knyttet föds med
barnets melodi (587-523-392-330; fröets hade varit 440-330-440-587), posten bär r 1 + generation 1 ·
R4 kronan 0 i generation 0 (kontroll), 7,8 % i generation 1. Två äldre sonder fick tratten:
`_knyttprobe` T_LAGE/TONER (annars lockar B2 den oprovade tratten i stället för spaken) och
`_tierprobe` T6b, som läser plats 7 i taklistan i stället för det sista värdet.

**Grind:** check 0/0 · test 0 fel · `_knyttlyftprobe` 15/15 · `_knyttprobe` 44/44 · `_bodprobe`
11/11 · `_upplasprobe` 11/11 · `_tierprobe` 12/12 · `_lyftbild` 0 konsolfel.`

`2026-09-10 · STEG 3 — SKRÄLLET (§4b), byggt UTAN uppehållsmätningen efter ägarens beslut.` Ny fil
`skrallet.js`. En lila rufsig busvätte springer in längs takbjälken, hoppar ner på kupans krage och
snor den SENASTE rekvisitan eller en gnista — den flyger upp ur glaset till handen — och sitter och
fnissar och hickar med den som en trofé. **Ett tryck** på den: den hickar, saken faller tillbaka in
genom kragen (samma väg som vädret), Bobo jublar och narratorn berömmer. **Ignorerad i 7 s:** den
gäspar, lämnar tillbaka saken och går. **Spaken medan den håller något:** den sugs i en spiral in i
degen, och knyttet föds med en tofs av dess päls och ett vikt öra (flaggfältets bit 4) — en snodd
gnista går tillbaka i receptet innan tiern rullas, så Skrället rör aldrig sällsyntheten.

**Tidtabellen står på ETT ställe** (`index.js:_skrallForsok`): bara i verkstan, 12 s nåd vid montering
och efter varje ny runda, minst 22 s mellan besök, aldrig samma axel två gånger i rad, aldrig inom
1,5 s efter ett verktygstryck (saken barnet just lade in ska hinna landa), och de enda axlarna är
rekvisita och gnistor — världsvalet rörs aldrig. Vilohjälpen tiger medan det är på besök. Öppnas
boden mitt i ett besök lämnar det tillbaka saken och går. Avvikelserna från specen står i §4b.

**Mätt, `_knyttlyftprobe` S — och kontrollkörningen fällde två av MINA armar.** Mot koden utan Skrället
var S2 ("props −1 = −1") och S4 ("g 1 = 1") gröna: armar som var gröna för att de inte mätte. Båda
kräver nu att stölden faktiskt skedde. Efter bygget: S8 nåden 10,5 s kvar vid första läsningen · S0
inget att sno → ingen kommer · S1 snor ett föremål (1 → 0), världen står kvar · S1b + S2b repliken och
berömmet sägs · S2 petad → föremålet tillbaka · S3 nästa besök tar gnistan (förra: föremål) · S4
ignorerad → gnistan tillbaka själv · S6 under ceremonin kommer ingen · S5 insugen → `dna.tofs` 1, riggen
bär tofsen, posten bär flagga 17 (generation 1 + tofs) · S7 exit mitt i ett besök, 0 konsolfel.
Tre nya repliker genererade offline (`npm run voice`: 3 gjorda, 0 misslyckade). Bilder:
`.test-shots/knytt-skralle-bjalke.png` · `knytt-skralle.png` · `knytt-tofs-bank.png`.

🚨 **Bildgranskningen hittade ett fel som inte var Skrällets:** det nyfödda knyttet stod på bänken med två
VITA ögon utan pupill. `_blick` var NaN — ceremonin studsar in knyttets hållare med `bounceIn`, som
sätter scale 0, och `toLocal` genom en förälder med skala 0 ger NaN, som `naerma()` bär vidare för
alltid. Koden bakom (`bounceIn(knyttHall)` + `_blicka`) är orörd sedan leverans 1; felet syns bara när
fingret är över skärmen under födseln och döljs av de glada ∩-ögonen de första sekunderna. Mätt med
`_knyttlyftprobe` O innan något rättades: **O0 (hyllknytt) blick 0,0 · O1 (nyfött) blick NaN, NaN.**
Rättat i en egen commit (nästa post) — steg 3 committades med felet kvar, som det alltid legat.

**Grind:** check 0/0 · test 0 fel · `_knyttlyftprobe` S 12/12 · `_knyttprobe` 44/44 · `_upplasprobe`
11/11 · `_tierprobe` 12/12 · I 0 av 12 000 olika.`


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

**Barnet väljer 6 fält:** `f` färg 0–9 · `z` storlek 0–3 · `m` mönster 0–5 · `v` värld 0–5 ·
`g` gnistor 0–3 · `r` melodi 0–4 (Ljudtratten, sedan 2026-09-10) → **28 800 recept**.

**Fröet härleder** (viktat av valen): kroppsform · öron · svans · ben · ögonform · ögonantal ·
mun · horn · vingar · mönsterjitter · namn · motivets tonart (och i generation 0 även motivets form).

**Sparposten är en ARRAY, inte ett objekt** — billigare och snabbare att sanera:

```
[seed, f, z, m, v, r, g, t, flaggor]  →  [1846231095,3,2,4,1,0,2,2,1]  = 28 tecken
flaggor: bit 0–3 generation · bit 4 Skrällets tofs (steg 3)
```

**Generationen** (sedan steg 2) är ett löfte: en post läses alltid under regeln den skrevs med.
Generation 0 (poster med ÅTTA fält, skrivna före 2026-09-10) läser aldrig plats 5 — den bar
fröets motiv, före v1.243 `_fro % 5` — och kan aldrig få hornet `krona`. Generation 1 läser
plats 5 som barnets melodival och kan få kronan (~8 %). `dnaFromSeed` drar samma tal ur
strömmen i båda; generationen ändrar vad några av dem BETYDER. `dnaFranPost(post)` är den enda
avkodningen (hyllan och boden delar den). Mätt: `_knyttlyftprobe` I1 (0 av 12 000 olika mot
`0da98f6`) och R0 (0 av 3 000 åttafältsposter olika).

* **Hela samlingen sparas, tak 200** (`ALLA_MAX`, leverans 2 steg 1, 2026-09-05) → 200 × 27 ≈
  **5,4 KB**. Hyllan i verkstan visar `_alla.slice(-3)`; Knyttboden visar allt. ⚠️ Före det
  sparades BARA hyllans tre, och varje fjärde kläckning kastade det äldsta knyttet för gott —
  uppmätt med `_knyttprobe` S0/S1: fem poster + en runda gav **3 på disk på HEAD, 6 nu**.
* Fyra profiler ≈ 22 KB i dokumentet vid fullt tak (dokumentet skrivs **två gånger**).
* Mätt referens: 150 poster med fullt DNA = 1,04 MB / 2,07 MB, **på taket**. Det här ligger på
  ~2 % av det. Det finns ingen väg härifrån till en kvotspräckning.

Nyckel: `progress.setCustom('knytt', { v: 2, lista, n, firad, dag, torka, fram })` — EN skrivare
(`_spara`) för hela blobben; två skrivare hade tappat varandras fält.

⚠️ **`progress.get()` returnerar en LEVANDE referens och `setCustom` sparar referensen utan
kopia.** Alltså: kopiera vid läsning, kopiera vid skrivning, sanera fält för fält vid inladdning
(`Array.isArray`-vakt, 8 eller 9 ändliga tal — åtta får flaggorna 0 —, `seed >>> 0`, varje index
klampat mot sin tabell, kasta allt trasigt). Mönstret finns i `bygg-en-kompis._rensaCfg`.

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
| Öknen (steg 4, låses upp vid 20) | `kloss`·`larv` ×3 | `spetsiga` ×3 | `blixt` ×3 | 22–52° |
| Grottan (steg 4, låses upp vid 24) | `droppe` ×3·`bona` ×2 | `hang` ×3·`antenner` ×2 | `lang` ×3 | 296–324° |

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
| Recept barnet kan ställa in | **3 840** |
| Frö-rymd per recept (`mulberry32`, uint32) | **4 294 967 296** |
| Distinkta individer totalt | **≈ 1,65 × 10¹³** (16 biljoner) |
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

**Leverans 2:s egna sonder (2026-09-05):** `_tierprobe.mjs` (node-only — oddsen, taket,
garantierna, att tiern inte rör genetiken, plats 7 läst ur `_sparaKnytt`) · `_knyttprobe`
S-familjen (samlingen överlever hyllan) och T-familjen (`_tvingaTier`: vanlig → kompis, guld →
gloria + folie, sparposten) · `_skimmerbild.mjs` (en runda per tier i BILD — folie, ram, krona,
gloria, kompis; det var den som såg knackhanden ovanpå den nyfödda världen) · `_bodprobe.mjs`
(Knyttboden: luckan, flikarna, rullningen med pil och drag, trycket, favoriten, dörren, exit).

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

## 8. Ägarens beslut — alla tagna 2026-08-30

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

**✅ 4. AVGJORD 2026-08-30 — Ljudtratten skjuts upp.** Verkstan har fem verktyg i leverans 1.
Motivet är inte struket, bara flyttat till fröet. Detaljerna i **§4c**.


## 9. Kvar att göra

*Skriven 2026-09-01 (natt) efter U3+U4, **uppdaterad 2026-09-01 (sen natt) sedan B2–B5, C och E
landat (v1.243.0)**. Husets regel gäller: läs `src/games/unika-knytt/*.js` innan du bygger på
någon post. En köpost vars premiss har fallit ska SKRIVAS OM till det som går att bygga, aldrig
ersättas med något större — det hände C:s första punkt, se den.*

**Grönt i dag, rör inte:** `npm run check` 0/0 · `npm run test unika-knytt` 0 konsolfel, bildkoll
ren · `_knyttprobe` 36/36 · `_upplasprobe` 11/11 · `_variantprobe` · `_idleprobe` 0 · `_tystprobe`
utan kandidat · `_montageprobe` 24–28 ms · `_knyttbild` utan konsolfel · noll väntande röstklipp.
Inget nedan är en trasig sak — det är beslut, obyggt, eller omätt.

### A. Blockerat på ägaren (fråga, bygg inte förbi)

| | |
|---|---|
| ~~**Sömntrösklarna**~~ | ✅ **BESVARAT 2026-09-01: koden gäller** (12 s → `somnig`, 8 s till → `sover`). §1 rättad — den hade inte följt med när §3c kortade trösklarna från 20+12. Ingen kodändring. |
| **§4b Skrället** | ✅ **BYGGT 2026-09-10 utan mätningen** — ägarens beslut i poleringsrundan (§9 G steg 3). Frågan som återstår är TAKTEN: uppehållstiden är fortfarande omätt, så om 12 s nåd · 22 s mellan besök · 7 s till uttråkad är rätt för ett riktigt barn kan bara ett speltest svara på. Loggen har underlaget: `takt/spak` (ms i verkstan) och `takt/skrall` (varje besök). |
| **Upplåsningarnas takt** | Nytt 2026-09-01: är 16 kläckningar till sista milstolpen rimligt eller för långt för ett barn? **Speltestet 2026-09-05 sa "bra" utan invändning**; ägarens riktning blev MER variation (leverans 2 steg 4 lägger två världar och två milstolpar till efter 16). |

### B. Byggt men aldrig inkopplat, eller dött (allt verifierat i koden 2026-09-01)

**B2–B5 är STÄNGDA 2026-09-01 (sen natt).** `morf` (skrivbar-bara, fem skrivningar — `satMorf`
var hela mekanismen) och `halvor` (fylldes, itererades aldrig; svepet över
`scen.removeChildren()` gör städningen) är borta. `Knytt.bredd`/`.hojd` är borta med sin
`getLocalBounds()`, alltså också hyllans tre per `_ritaHylla`. Minan i B5 är avväpnad:
sparpostens plats 5 skrivs nu ur `this._dna.val.r` i stället för det härledda `_fro % 5` —
`dnaFromSeed` läser aldrig `val.r`, den drar motivet ur fröströmmen, så de två talen var olika
och en framtida läsare hade fått tyst fel motiv. Platsen är fortfarande reserverad åt
Ljudtratten och migreringen fortfarande noll.

* ✅ **Läget `lekfull` — STÄNGT 2026-09-01 (sen natt).** Designvalet behövde inte hittas på:
  **två av lägets fyra effekter (kroppens lutning och sidoförflyttningen) står och faller med
  att `pekare` finns alls**, så läget handlar om fingret och ingenting annat. Villkoret är
  därför "fingret LEVER nära mig" — inom `LEK_R` (2,5 knyttradier ≈ 230 px) och med rörelse,
  med `LEK_SLAPP` 0,45 s efterglöd. Egen rörelsetröskel (0,5 px) i stället för sömnlogikens
  6 px: den senare hade läst ett långsamt AVSIKTLIGT drag som stillastående och fått läget att
  blinka. Bara från `idle`, så `glad` aldrig kapas och en sovande inte väcks av ett finger som
  svävar förbi. Hyllans knytt får `tick(dt, null)` och kan aldrig gå in i läget — rätt, de har
  inget finger att luta sig mot.
  **Samtidigt rättat:** lutningen mättade på `_r * 4` (368 px) medan lekzonen är 230, så
  kroppen kunde aldrig nå mer än 62 % av den amplitud någon en gång valde — ett värde skrivet
  men oåtkomligt, samma klass som hornet `krona`. Mättnaden är nu zonen själv (0,086 → 0,138 rad
  vid samma fingerläge; full 0,24 rad = 13,8° vid zonens kant).
  **Mätt** med `_knyttprobe` L0–L5, och §9:s egen varning ("de fyra andra lägena måste finnas
  kvar") är en arm: `idle` L0/L2 · `lekfull` L1 · `glad` L3 · `somnig`+`sover` L4. L5 läser
  EFFEKTEN och inte flaggan — lutningen är signerad, så samma rörelse på andra sidan måste ge
  motsatt tecken (+0,138 / −0,140 rad, +4,1 / −4,1 px). **Barlast körd:** med `LEK_R = 0`
  (= HEAD:s beteende) faller L1 och L3 medan L0, L2 och L4 står kvar gröna, alltså mäter
  familjen ändringen och inget annat.

*De fyra [Quick]-posterna som stod här (`morf` skrivbar-bara · `halvor` itereras aldrig ·
`bredd`/`hojd` läses av ingen · sparpostens plats 5) är **strukna 2026-09-05** — de var
redan gjorda i v1.243.0 och beskrivs i stycket ovan, men listan under det stod kvar och
läste som fyra öppna punkter. Verifierat mot koden: `grep` på `morf`/`halvor` ger bara
löpande text, inga fält; `this.bredd`/`this.hojd` finns inte; `index.js:622` skriver
`this._dna?.val.r ?? 0` och inte `_fro % 5`. Samma bokföringsfälla som §4 i spel-docerna:
**stryk punkten i samma commit som du bygger den.***

### C. Omätt

**Alla tre sonderna är körda 2026-09-01 (sen natt) — och en av dem visade sig vara fel sond.**

* ✅ **`_tystprobe`: ingen kandidat i `unika-knytt`.** Med förbehållet att sondens flaggordlista
  (`_busy` · `_resolving` · `_locked` …) inte är spelets idiom — spelet styr på `_fas`. Därför
  lästes alla sju pekhanterare för hand samma pass, och var och en av dem svarar eller är inget
  träffmål: `_aggTryck`s takt-spärr kvitterar med `tap` + en knack-animation · `_boTryck`
  kvitterar på ett tomt bo · `byggVerktyg`s `if (dod || last)` är onåbar, för `satLast(true)`
  sätter `eventMode = 'none'` och trycket faller igenom till bakgrundsfångaren, som kvitterar.
* ✅ **`_montageprobe --cpu 4 --varv 3`: 24,2 och 28,3 ms över två körningar.** Kontrollarmar i
  samma körningar: `pizzabageriet` 51,9/52,4 mot V14b:s uppmätta 50,0 — maskinen är alltså
  kalibrerad; `golvet-ar-lava` 31,2/41,7, mycket brusigare än sina historiska 16,8. Spelet är
  det BILLIGASTE av de tre, ungefär halva `pizzabageriet`, och ligger inom det vanliga bandet
  mot V14b:s svitmedian 16,9 ms. Monteringskostnaden är inte ett problem.
* 🚨 **`_fpsprobe --cpu 6` var FEL SOND — premissen föll.** Den navigerar till MENYN och sprutar
  partiklar i `fxLayer` för att jämföra de två partikelvägarna mot varandra; den öppnar aldrig
  ett spel och kan alltså omöjligt se `ritaDeg()`. Posten är omskriven till den fråga som går
  att svara på: **spräcker degfasen bildrutebudgeten?** Mätt med fyra nya armar i `_knyttprobe`
  (`P0`–`P3`, tre fönster i SAMMA runda så maskinens dagsform inte kan förväxlas med fasens
  kostnad): verkstan i vila **17,4 ms** · degfasen F2+F3 **17,4 ms** · knackfasen **17,6 ms**,
  alltså **0,0 ms extra** för degfasen — och samma svar vid 12× strypning.
  ⚠️ **De tre talen var värdelösa tills `P3` fanns.** Alla tre landade på 17,4 ms, vilket ÄR
  headless Chromes vsync-intervall, och ett MÄTTAT mått kan inte skilja "billig fas" från
  "trasig mätare". `P3` bränner 25 ms per bildruta och flyttar samma mätare till **26,2 ms
  (+8,8)** — först då betyder de gröna talen något. Och mätaren är per konstruktion blind för
  allt som ryms innanför budgeten: den svarar på "spräcker det budgeten?", aldrig på "vad kostar
  `ritaDeg`?". Den andra frågan kräver en profilerare och är inte värd ett pass förrän den
  första ger fel svar.
* (`_idleprobe` 0 ✓, `_mjukprobe` ✓, `bildkoll` ✓, `_knyttprobe` ✓, `_variantprobe` ✓,
  `_upplasprobe` ✓. `_vilkaprobe` och `_glodkandidat` väntar på boden respektive folien, alltså
  på leverans 2.) ⚠️ Kör aldrig två webbläsarsonder samtidigt, och aldrig en bredvid `test:all`.
* **Spelet är aldrig speltestat av ett barn.** Det är fortfarande den största omätta saken i
  hela spelet, och ingen sond ersätter den.

### D. Leverans 2 — samlingen och skimret (~1 200 rader)

**Pågår 2026-09-05 (v1.247.0), ägarens ordning:** ① persistens ✅ `c7ccc63` · ② sällsynthet +
folie + tier-skillnader + kompisen ✅ `ce25322` · ③ Knyttboden ✅ `f7f8550` · ④ variation ✅ (större rekvisitapool
per värld, den seedade dragningen väljer 4, + två nya världar Öknen och Grottan med egna
milstolpar efter 16). Se §5 2026-09-05.

Ett eget, stort pass. Innehållet står redan i **§4** (Knyttboden som rullande popup ·
sällsynthetsrullningen med garantierna · folien och de tre fysiska tier-skillnaderna ·
`kort.js` · det levande hyllivet) och besluten som styr det i **§8** — de listorna kopieras
medvetet INTE hit. Två lokala listor om samma sak driver isär; det är precis den glidning som
gjorde hornet `krona` onåbart.

### E. Kosmetik

* ✅ **Ögonlocket (ÅTGÄRDER U6) — STÄNGT 2026-09-01.** Locket var en flat `p.bas`-lucka med rak
  överkant, och de två locken MÖTTES (ögonen står 2,93e isär, locken var 3e breda) till ett band
  tvärs över ansiktet. Nu en mandel som tonar in ur genomskinligt (`fadeTopFill`, ny i
  `lib/form.js`), smalast vid brynet (2,61e < 2,93e — de möts inte längre) och bredast över ögat.
  **Uppmätt med `scripts/_lockbild.mjs` (ny): överkanten 16 → 4–5 kanalsteg.**
  ⚠️ Två saker som kostade tid och står i ÅTGÄRDER: **ingen fast ton kan matcha en bakgrund som
  ytan GLIDER över** (en ton kalibrerad mot pannan tog överkanten 16 → 2 helt stängd men lyste som
  två ljusa lådor vid `somnig` 0,7, och en kalibrerad mot ögonhöjd gav 18 — sämre än den platta),
  och **luminans är blind på en gul kropp** (−8,5 lum men −37 i blå).

* ✅ **Bänkplatsen (800, 630) — STÄNGD 2026-09-01 (sen natt).** §4c:s tre föreslagna föremål är
  ritade som ett stilleben på golvet: burk med penslar · trave brickor · oljekanna
  (`index.js._ritaPrylar`). De bor i `_rum`, som är `eventMode = 'none'` med
  `interactiveChildren = false`, så harnessens tryck på (800, 600) faller igenom till
  bakgrundsfångaren precis som förut. Inget ritas ovanför y 544 — knyttets träffyta på bänken
  är en cirkel r=62 kring (800, 432) och slutar vid y 494; konstens utbredning och träffytans
  utbredning är två olika budgetar. Det var en TRIVSELFRÅGA hela tiden och såldes inte in som
  annat: `bildkoll` fällde aldrig `heltackande-falt`, golvet är redan en gradient.

### F. Delad kod som rör spelet

~~**V19**~~ **är rättad 2026-09-05 (v1.248.0)** — `Mjukkropp.tyngdpunkt` delar nu med
`pts.length` och `flyttaTill()` läser gettern. Ceremonin påverkas inte: den förankrar mot
värdet den läste vid födseln och RITAR mot ringens egen mitt, som den räknar själv (den
kommentaren är omskriven — den beskrev buggen som om den stod kvar). `_knyttprobe` 44/44
efter ändringen.

**V16** (`destroy({ children: true })` river inte `GraphicsContext`, repo-brett) står kvar i
`docs/ATGARDER.md` med sitt mätkrav: delad kod som hela sviten går igenom — mät blastradien
i GPU-minne före ändring.

### G. Poleringsrundan 2026-09-10 — ägarens sex steg

*Förslaget lades fram förmiddagen 2026-09-10 och godkändes samma dag: "ja, kör alla sex steg".
Det fanns bara i chatten tills det skrevs hit — en plan som bara bor i en session försvinner med
den, och den här var nära att göra det. En commit per steg; sonden är `_knyttlyftprobe.mjs`.*

| steg | innehåll | status |
|---|---|---|
| 1 | Rättelser: bodens P0-avstånd med åtta skyltar · kupans färglöfte · döda `rekvisita` · solens varvtid · knackhanden i bild | ✅ 2026-09-10 |
| 2 | **Ljudtratten (T6)** på bänkplatsen (800, 630): en speldosa, varje tryck vrider fram en ny melodi, noterna flyger in i kupan och blobben sjunger med. Knyttets motiv blir barnets val. | ✅ 2026-09-10 |
| 3 | **Skrället** (§4b, som specat). ⚠️ Byggs UTAN uppehållsmätningen §4b väntade på — ägarens beslut 2026-09-10. Specens spärrar (12 s · 22 s · 7 s) är enda bromsen. | ✅ 2026-09-10 |
| 4 | **Knyttet efter födseln:** namnplakett i trä (namnet sägs samtidigt) · tryck på solen i fonden → den går ner, knyttet gäspar och somnar · sömnkorn av världens egna partiklar · folien följer fingret | ⬜ |
| 5 | **Verkstadshyllan lever:** en bärskål — dra ett bär till ett knytt, det äter och rapar en gnista · dra ut ett knytt på golvet, där det springer runt och sedan går hem (tryck-sedan-tryck också) | ⬜ |
| 6 | **Vänner i boden:** tre duetter mellan samma grannar → de blir vänner och delar bo | ⬜ |

Sparposten får ett **nionde fält** (generation + tofs). Hornet `krona` (onåbart i dag) och barnets
melodi gäller bara knytt som föds efter steg 2 — inget sparat knytt byter utseende eller melodi.
**Medvetet utanför:** speltest med barn · gradientcachen i `lib/form.js` som växer med varje unik
knyttfärg (delad kod, samma GPU-mätkrav som V16) · kamera-parallax i boden (premissen föll: högst
åtta skyltar, och de ryms) · `ritaDeg` (uppmätt inom budget) · bälgen som läser som en trave
plankor (en egen fråga).

### Senare (V2+)

Står i **§4** sist (Ljudtratten som sjätte verktyg · fler världar · vänner som delar bo · dra ut
ett knytt på golvet · mata ett bär · kamera-parallax). Inget av det är kvalitetsgäld.

### Om du bara har ett kort pass

*Hela B, C och E är gjorda (v1.243.0 · v1.244.0). Kvar, i ordning:*

1. **A** — de tre frågorna till ägaren. Ingen av dem går att bygga förbi, och två av dem
   (Skrället, upplåsningarnas takt) väntar på samma sak: ett riktigt speltest.
2. **D (leverans 2)** — planera in ett eget pass. Börja inte på det i slutet av ett annat.
3. **F** — V16 i `docs/ATGARDER.md`, delad kod: mät blastradien före ändring. (V19 är
   stängd 2026-09-05.)

*(ÅTGÄRDER U6, ögonlocket, är stängt 2026-09-01 — se E.)*
