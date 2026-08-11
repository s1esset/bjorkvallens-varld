# Trollkarlens Blandning (`trollblandning`)
> 🧩 pussel · drag · 3–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En magisk natthimmel med stjärnor. Trollkarlen Bobo (maskoten med egenritad lila spetshatt +
stjärna) står uppe till vänster, en svart kittel puttrar i mitten med bubblor och en
glödande brygd-yta, och till höger en **receptbok** ("📖 Receptbok 0/4") med rader som
🔥+💧=❓. Längst ner en hylla med element-droppar (eld, vatten, jord, luft…). Jag drar två
droppar i kitteln → ~0,4s omrörning → de **reagerar**: eld+vatten blir 💨 ånga, eld+jord blir
🌋 lava, osv. Brygden byter färg, partiklar pyser, resultat-emojin flyter upp, och en ny
draggbar resultat-droppe dyker upp på hyllan. Är paret ett bok-mål fylls den raden (❓→emoji).
Finns inget recept blir det en mjuk grå puff + "Hmm... prova en annan!" och ingredienserna
studsar ut igen (inget förbrukas). En 🌀-knapp tömmer kitteln. Fyll alla bok-rader → kitteln
kokar över i en 🧪 Trolldryck + firande + stjärna, sedan en rikare runda. Idle ~6s → trollkarlen
lyser upp de två droppar som hör ihop + prick-linje + "Prova Eld och Vatten!"; efter några
ledtrådar gör han kombon själv.

Funkar bra: detta är den rikaste av de fyra. Upptäckar-loopen (kombinera → nytt element →
kombinera vidare) är genuint lockande, receptboken ger ett tydligt mål, oändliga hyll-källor +
töm-knapp ger trygg utforskning, och no-fail (inget förbrukas, "Hmm prova en annan") är perfekt.

*(Skärmdump: natthimmel, Bobo i spetshatt, kittel med eld i, receptbok 0/4 till höger, hylla med fyra baser.)*

## 2. Ursprunglig plan & tankeprocess

Tanken (ur kodhuvudet): **ren upptäckar-glädje utan ett enda felsteg** — Little Alchemy för
2–5-åringar. Pedagogiken är kombinatorisk: två saker blir en tredje, och kedjor av upptäckter
(lava → sten, lera → kruka) bygger en värld. Paren är ordnings-oberoende (sorterad nyckel),
hyll-dropparna oändliga, upptäckta resultat blir nya draggbara element. Receptboken är både mål
och minne. No-fail-garantin är en eskalerande idle-hjälp: tydligare ledtrådar → trollkarlen
utför kombon själv, så ett nytt recept hittas alltid. Trollkarl Bobo bär det magiska temat.

## 3. Vad gör det lättjefullt / tunt

Stark loop — men även här finns billiga drag:

- **Varje reaktion spelar samma rutin.** Oavsett vad som blandas är utfallet samma
  färg-tween + `burst`/`puff` + uppflytande emoji. Ånga billowar inte, lava droppar inte glöd,
  is spricker inte — elementet byts men *föreställningen* är identisk. Upptäckt nr 13 ser ut som
  upptäckt nr 1. (Det är den klassiska "en-utfalls-interaktionen" i förklädnad: olika resultat,
  samma show.)
- **Auto-hjälpen fyller boken åt barnet.** Vid idle lyser rätt par + prick-linje, och efter 3
  upprepade ledtrådar `_autoCombine`:ar trollkarlen ihop dem själv. Ett passivt barn får hela
  receptboken fylld medan det tittar på. (Eskaleringen är bättre än de andra spelens direkta
  hjälp — men slutpunkten är fortfarande "spelet löser det".)
- **Trollkarlen är nästan ren dekor.** Bobo bara `pop`:ar vid reaktioner; ingen min, ingen
  gest mot kitteln, inga egna repliker utöver TTS som läser elementnamn. Han känns som en
  bakgrundsbild snarare än en figur som leder leken.
- **"Fel"-svaret är platt.** Saknat recept = grå puff + samma "Hmm... prova en annan!". Det
  skulle kunna vara lekfullt (kitteln fräser/ryker, trollkarlen rycker på axlarna, en komisk
  blöt-fis-ton) — i stället är det en neutral icke-händelse.
- **Receptboken är en stillsam liggare.** Att fylla en rad är ett `pop` på en emoji. Ingen
  bläddrar, ingen bock-stämpel, inget "boken lyser upp när den är klar". Den firar inte.
- **Hyllan trängs på höga nivåer.** Upptäckta element läggs till (upp mot ~15 droppar) och
  `_layoutShelf` pressar ihop dem (min-spacing 116 över 700px) → överlapp och svårt att peka
  rätt för små fingrar.
- **Ljudet är helt syntetiskt.** `pop`/`match`/`reveal`/`celebrate`/`pling`. Ingen bubblande
  kittel-ambient, ingen element-specifik klang (eld-spräck, vatten-plask, is-knäpp) som skulle
  göra varje reaktion unik på örat.

Kort sagt: en genuint bra upptäckar-loop vars **reaktioner alla ser likadana ut, vars trollkarl
inte spelar någon roll, och vars hjälp gärna fyller boken åt barnet.**

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Senare, en-stegs auto-hjälp.** Behåll de lysande ledtrådarna, men låt trollkarlen
  som mest blanda EN kombo själv och sedan vänta — och bara efter en längre tystnad. Boken ska
  fyllas av barnets upptäckter, inte av trollkarlens.
- **[Quick] Låt barnet välja "smak" på en upptäckt.** För resultat med flera möjliga vägar
  (t.ex. snö via is+vatten *eller* moln+is), fira att barnet hittade en *annan* väg ("En till
  väg till snö!") — belönar experiment, inte bara den första lösningen.

### Variation & överraskning
- **[Deep] Per-element-reaktioner.** Ge varje resultat sin egen lilla föreställning: ånga
  billowar uppåt och immar skärmen lite, lava bubblar trögt och glöder, is fryser kitteln-
  kanten, regnbåge spänner en båge över kitteln. Då blir varje upptäckt ett eget "wow".
- **[Quick] Sällsynt hemligt recept.** Ett gömt par (t.ex. sol+regnbåge=enhörning 🦄) som inte
  står i boken och ger en extra-stor överraskning — skapar "en till!"-jakt.

### Juice
- **[Quick] Lekfullt "fel"-svar.** Saknat recept: kitteln ryker grått, trollkarlen rycker på
  axlarna/kliar hatten, en mjuk komisk "plopp" — fortfarande positivt, men roligt i stället
  för neutralt.
- **[Quick] Boken firar.** Rad som fylls får en bock-stämpel + kort gyllene lyse, och hela boken
  glöder/blänker när sista raden klaras (innan över-kok-firandet).

### Progression
- **[Medium] Bestående receptbok mellan rundor.** `custom.recept` sparas redan — visa en
  *samling* upptäckta element (ett galleri/encyklopedi bakom föräldra-grind eller på menyn) som
  växer över tid. Ger en anledning att minnas och återkomma.
- **[Quick] Fixa hyll-trängseln.** Scrolla/sidindela hyllan eller flytta upptäckta element till
  en egen "låda" så bas-dropparna alltid är lätta att peka på.

### Karaktär & berättelse
- **[Medium] Levande trollkarl.** Bobo lutar sig mot kitteln, blåser i den, höjer staven när
  något lyckas, och pekar uppmuntrande mot hyllan vid ledtråd — gester i stället för `pop`. Gör
  honom till lekledaren, inte tapeten.

### Ljud
- **[Quick] Riktig kittel- och element-ljudbild via MOSS-pipelinen** ([[real-audio-sfx]]): en
  låg bubblande ambient, plus korta element-läten (eld-spräck, vatten-plask, is-knäpp, magisk
  shimmer) per reaktion så örat hör skillnad på upptäckterna.

## 5. Status / loggar

- 2026-08-11 🪜 **Hyllan är tvåradig — träffytorna klarar P0 igen** (v1.143.0).
  Ägaren godkände förslaget ur ÅTGÄRDER #5:s efterhand ("tvåradig hylla blir bra"). Det som
  låg kvar efter ikonfixen var inte utseendet utan **träffytorna**: en rad rymmer bara så
  många mål innan de börjar överlappa, och överlappande träffytor betyder att barnet trycker
  på en sak och får en annan.
  - **Räkningen som avgör allt:** P0 kräver **≥96 px träffyta** OCH **≥24 px mellan två
    träffytor**, alltså minst **120 px per plats**. Hyllans 1030 px rymmer **9**. Det tionde
    elementet kan inte läggas på samma rad — och spelet kan nå **13 redan på nivå 1**.
    Därför: en rad upp till 9, **två rader** därefter (18 platser räcker för spelets 15).
  - **Byggt:** `_platser(n)` räknar ut rad, plats, träffyteradie och skala i ett svep. Varje
    rad **centreras** (en halvfull andrarad som börjar till vänster läser som ett fel).
    Träffytan krymper mjukt från 80 till P0-golvet 48 och aldrig under. Brädan växer **uppåt**
    till en hel bricka med en skiljelist — två separata plankor provades först och lästes som
    två hyllor med ett tomrum emellan.
  - ⚠️ **Layoutkedjan som följde med, och som är hela risken i punkten:** den övre raden måste
    ligga på y 540 (undre 660 + P0:s 120), och där stod **kittelns eld**. Kitteln flyttades
    därför upp **400 → 352**. Allt kittelrelaterat är härlett ur `CY` (brygd-yta, hällpose,
    eldens läge, vätskans `bounds`), så flytten är en rad — **utom töm-knappen, som satt på
    ett fast tal och hamnade ovanpå hyllan.** Den följer nu `CY` också. Receptboken kortades
    470 → 380 px av samma skäl.
  - **MÄTT** (`_hyllprobe.mjs`): vid 13 element ligger hyllan på **2 rader**, minsta avstånd
    mellan två föremål **120,0 px**, träffyta **96,0 px**, avstånd mellan två träffytor
    **24,0 px** — alla precis på P0-kravet, inget under. Överlapp 0,0 px, högerkant 1075 px,
    övre radens överkant 490 px (fri från kitteln). Exit mitt i en hällning: 0 konsolfel.
  - ⚠️ **Sonden var endimensionell och dömde den tvåradiga hyllan som trasig.** Den sorterade
    x-värdena och mätte avståndet mellan grannar — men två föremål med samma x ligger 120 px
    isär i **y**, inte 0 px isär. Den mäter nu i två dimensioner, och kontrollerar P0-måtten
    direkt i stället för att gissa dem ur bredden.

- 2026-08-11 🐛 **ÅTGÄRDER #5 (ägarrapport): en nyupptäckt ikon hamnade över en annan** (v1.136.0).
  Rapporten var en bild, och bakom den satt **två oberoende fel**. Ny sond `scripts/_hyllprobe.mjs`
  mäter dem var för sig — den poängen är hela lärdomen: hade bara det ena lagats hade ägaren sett
  exakt samma sak igen.
  - **(A) Kapplöpningen — 16,0 px.** Hällningens hemtween startar 0,82 s och varar 0,30 s; `_react`
    föder det nya hyllelementet vid **1,04 s**, alltså 0,22 s in i hemresan. `_layoutShelf` hoppar
    över en droppe som fortfarande häller, och gsap hade redan låst målvärdet — `x: () => rec.home.x`
    läses vid tweenens **start**, inte per bildruta. Droppen flög hem till sin gamla plats.
    Rättas nu i timelinens `onComplete`. ⚠️ Felet växer med index: den andra ingrediensen råkade
    ligga på plats 1 i mätningen (16 px), på plats 6 hade det varit 96 px — rakt ovanpå grannen.
  - **(B) Packningen — 22,3 px överlapp, och det var den ägaren såg.** `spacing = min(116,
    700/(n−1))` slutade vara cappad vid n = 8 och krympte sedan monotont, medan föremålet är ritat
    100 px brett. **Räkna om hur många element hyllan egentligen kan få:** 4 baser + 9 nåbara
    resultat = **13 redan på nivå 1** (`sten`, `kruka`, `regnbage` och hemliga `enhorning` kräver
    ingen `is`). Hyllan var dimensionerad för 7. Nu: spannet går ut till 1180 (ytan under
    receptboken stod tom), föremålet **krymper** när packningen blir tätare än dess egen bredd
    (golv 0,6) och **brädan växer med samlingen** — fyra baser på en tom 1180 px-planka såg
    övergiven ut, och en bräda som växer är dessutom ett kvitto på vad barnet upptäckt.
  - **Träffytan rörs INTE.** `hitArea` är `Circle(0,0,80)` på behållaren och skalas inte med
    bilden: P0 kräver ≥96 px, och en ikon som krymper får inte ta träffytan med sig.
  - **MÄTT** (`_hyllprobe.mjs`, 8 kontroller): avvikelse från hemmaplatsen **16,0 → 0,0 px** ·
    överlapp vid 13 element **22,3 → 0,0 px** (skala 0,858) · högerkant 1222,9 px · 0 konsolfel vid
    exit mitt i en hällning · startbilden med bara baserna **oförändrad**.
  - ⚠️ **Kvar, och det är en layoutfråga, inte en bugg:** träffytorna (160 px breda) ligger tätare
    än P0:s ≥24 px separation redan från 7 element, och det gjorde de även före den här fixen. En
    rad på 1030 px rymmer som mest 8 P0-korrekta mål. Ska det lösas krävs **två rader** — eget pass,
    eget ägarbeslut.

- 2026-08-10 💤 **NATTKÖ N1: spelet hade ingen vilorörelse alls** (`eceb5bf`, v1.131.0).
  `_livprobe` rapporterade **0 föremål med liv** — äkta fynd, inte ett sondfel (sonden
  verifierades först mot `loopdjuren`: 3 objekt, 9,4 px, spridning 0,47).
  Båda målen har någon **annan** som äger `y`, så rörelsen ligger på en **inre behållare**:
  `liv()` tweenar en proxy och skriver `target.y` i sin `onUpdate`, så `killTweensOf(w)` når
  den inte och de två hade skrivit över varandra bildruta för bildruta.
  - **Trollkarlen:** `_wizardGesture` äger `w.y`/`w.rotation` (cheer/lean/shrug/point). All
    grafik ligger nu i en inre `krop` — ordningsidentisk (enda barnet till `w`, samma fyra
    `addChild` i samma följd). Andetaget är grundare och långsammare än hyllans
    (`bob 3,5` / `3,4 s`): en trollkarl som guppar som en ingrediens läses som ett föremål.
  - **Hyllans element:** DragController, `_layoutShelf` och hällningens timeline äger
    `view.y`. Kroppen i en inre behållare, men **skuggan stannar kvar på `view`** — en skugga
    som guppar med föremålet slutar läsa som mark. Egen fas per föremål → aldrig i lås.
  - **MÄTT:** `_livprobe` **0 → 5 objekt**, amplitud 6,8 px (minsta 4,7), fasspridning **0,45**,
    0 tickar efter exit. `_dragprobe` grön. Skärmdumpen granskad — trollkarlen hel.
- ⬜ **Lämnad stilla med flit: kitteln.** `_brew` är barn till kitteln, medan vätskans partiklar
  lever i **designkoordinater** (`FluidView.area`). En guppande kittel hade lossat brygdytan
  från simuleringen. Slotsen (prickringarna) är dropp-**mål** och ska också stå still.
- 2026-08-10 🎨 **D1 (delat mönster): hyllan fick ljus** (`b3cde53`, v1.119.0).
  Hyllan låg på **70 560 px i EN ton** (`_plattprobe --medbakgrund`) och delade konstruktion
  med tre andra spel, därför den delade `groundFill()` i `lib/form.js`.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **70 560 → 24 148 px** (resten är
  bokryggen, som är en annan form).
- ⬜ **Lämnad platt med flit:** receptbokens crèmesida är spelets största fält (115 403 px)
  och rörs inte. Den är en PANEL med text, och `_plattprobe`s eget filhuvud varnar uttryckligen
  för att "fixa" panelen, ritpappret och fotbollsplanen — en lugn sida är rätt här.

- 2026-06-30: Doc skriven (granskning + plan). Speltest grönt (errorCount 0), skärmdump läst.
  Inga kodändringar ännu. (Spelets starkaste loop av de fyra Pussel-granskade.)
- Rekommenderad första-omgång: **[Deep/Quick uppdelat] per-element-reaktioner (börja med 3–4
  signatur-element) + [Quick] lekfullt fel-svar + [Medium] levande trollkarl** — gör varje
  upptäckt unik och ger figuren en roll.
- 2026-07-02: Första-omgång IMPLEMENTERAD (speltest grönt, errorCount 0, skärmdump läst).
  - **Per-element-reaktioner** (`_reactShow` → `_signatureReact`): varje reaktion väljer nu en
    signatur-show, annars den generiska pysningen. Signaturer: **ånga/moln** bolmar uppåt i tre
    staplade vita puffar + stigande shimmer-ton; **lava** bubblar trögt med varma `burst`-toner +
    uppbubblande 🫧 + låg sågtands-ton; **is/snö** fryser kittelkanten via en kristall-ring
    (`_frostRim`, mitten bakad i geometrin per PIXI-gotcha, exit-säker {}-proxy) + hög triangel-ton;
    **regnbåge** spänner en färgbåge över kitteln (`_rainbowArc`, samma exit-säkra mönster).
  - **Levande trollkarl** (`_wizardGesture` med 4 poser: `cheer`/`lean`/`shrug`/`point`):
    lutar sig mot kitteln när barnet rör om (`_addToCauldron`), höjer staven + studsar
    stjärnan vid lyckad upptäckt (`_onRecipe`, `_checkComplete`), rycker på axlarna vid
    saknat recept (`_onNoRecipe`), pekar mot hyllan vid ledtråd (`_hint`/`_autoCombine`).
    `_wizStar` + `_wizardBase` sparade i `init`; tweens dödas i `destroy`.
  - **Lekfullt fel-svar** (`_onNoRecipe`): grå rök bolmar upp (3 staplade 💨 via `_fxDelay`),
    trollkarlen rycker på axlarna, en mjuk komisk nedåt-`tone`-plopp, roterande replik
    (`randomFrom` av tre snälla fraser). Fortfarande enbart positivt.
  - **Boken firar** (`_fillRow`): gyllene `ripple`-ring + grön ✅ bock-stämpel som studsar upp
    per fylld rad; hela boken lyser (stor `ripple`+`sparkle` vid 1090,330) i `_checkComplete`.
  - **[Quick] Hemligt recept**: `sol`+`regnbåge`=`enhorning` 🦄 (ej i boken) → extra `bigCelebration`
    + egen replik. **[Quick] Alternativ väg**: `_paths`-Map spårar par per resultat; en NY väg till
    ett redan upptäckt element firas med "En till väg till X!" (belönar experiment).
  - Nya exit-säkra hjälpare: `_fxDelay` (spårad delayedCall, vaktad av `_alive`, dödas i
    `destroy`/`_buildRound` via `_fxCalls`). Ingen gsap direkt på transienta partiklar.
  - Deferred: [Deep] fullt immande/glödande skärm-shaders per element; [Medium] bestående
    encyklopedi-galleri över upptäckta element på menyn; [Quick] riktig MOSS-ljudbild (bubblande
    ambient + element-läten) — kräver MOSS-pipelinen; [Quick] hyll-sidindelning vid många element
    (nuvarande min-spacing räcker för första-omgångens nivåer).
</content>
- 2026-08-10 ✅ **Spår 3 P3 (B2) — hällningen och elden: två system som möts.**
  Kön bad om `FLUIDS.gegga` + `Varmefalt`. Koden lästes före planen och geometrin sa nej
  till den bokstavliga formen: kitteln har ingen vätskepelare sedd från sidan — brygden är
  en **ellips sedd uppifrån** — så en `FluidWorld` i kitteln hade fallit till botten av en
  osynlig låda. Valda vägen blev **(b) SPH bara i hällningen + (c) värme**, alltså "simulera
  bara där vätskan syns".
  - **Hällningen.** Släpper barnet en droppe över kitteln flyger den upp till en hällpose,
    **tippar** och en stråle SPH-vätska (`radius 16`, geggans viskositet, `max 130`) rinner
    ned i mynningen och absorberas i ytan. Filterytan är låst till bandet mellan hällpose
    och yta (420×286), inte hela designytan.
  - **Brygden är en äkta BLANDNING.** Varje absorberad partikel räknas per element; färgen
    är det mass-viktade medelvärdet tonat mot rundans bottenfärg efter hur full kitteln är.
    **Mätt:** en hällning ger 43 partiklar → 53 % av vägen mot vattnets färg; två olika
    ingredienser ger `#3b6896 + eld → #9b88a9`, **0,2 kanalsteg** från den uträknade
    blandningen och 100 steg från ren eld (alltså inte "sista färgen vinner").
  - **Elden + `Varmefalt`.** Elden under kitteln håller brygden vid kok (temp 0,92).
    Temperaturen driver **bubbeltakt, kokglöd, ånga** — aldrig målet: en kall kittel
    blockerar inget recept. **Systemen möts i absorptionen:** varje partikel blandar in sin
    egen värme, mass-viktat. **Mätt:** vatten i en kokande kittel ger 0,93 → 0,40, bubbel-
    takten 12,1 → 2,8/s, och elden tar tillbaka den på 1,2 s till 80 % av kok.
  - **Nytt i delad kod:** `Varmefalt.knuff(namn, delta)` — en skvätt kallt rakt i något.
    Rör bara `temp`, aldrig `grad` (P0: det barnet hunnit göra får inte rinna tillbaka).
    Sex nya mått i `_varmeprobe`; `lagerelden` orörd.
  - **Bilden ändrade koden fyra gånger, och inget grönt mått hade fångat något av det:**
    elden låg först på y=96 och försvann *helt* bakom grytkroppen (som slutar där);
    kokglöden sköljde bort brygdfärgen till en grumlig brun; markglöden läste som en platt
    lila matta; och två av fem lågor stod exakt bakom benen (som täcker |x| 40–78).
  - **Sonden hade fel två gånger, båda upptäckta för att talet var *för* snyggt:** ett
    `waitForFunction` på "hällningen är slut" returnerade omedelbart (den börjar först efter
    droppens 0,2 s uppflygning), så blandningsmåttet jämförde vattnets färg med en
    förutsägelse räknad ur samma vatten — grönt utan att eld runnit. Och ett mått påstod att
    blått måste *sjunka* när eld hälls i; medelvärdet av vattnets 223 och eldens 107 är 165,
    alltså **högre** än det halvmättade vattnets 150. `_kittelprobe.mjs`, 14 mått.
  - **Egen kritikergranskning gav tre fynd, alla åtgärdade:** den upptagna fasen växte från
    0,4 s till 1,04 s (hällningen ska landa före reaktionen), alltså 2,6× längre fönster där
    ett tryck kan kännas dött → `kvittera()` (V9-mönstret); trollkarlens auto-kombo
    teleporterade in ingredienser medan barnets hälldes → `_addOchHall` ger båda samma
    visuella språk; och en droppe som greps MITT i hällningen hade två ägare till sin
    position (draget + tidslinjen) → fingret vinner, strålen stängs av.
  - Kvar ur §4: [Medium] senare en-stegs auto-hjälp · [Deep] fler per-element-shower ·
    [Quick] hyll-sidindelning · [Quick] MOSS-ljudbild. Sidofynd: `_livprobe` är röd på
    spelet (noll objekt med vilorörelse) — det är en **egen** [Quick]-punkt, inte en
    regression från den här rundan.
- 2026-08-09 ✅ **Spår E runda A4 — kitteln puttrar ur en Emitter.** Bubblorna kom ur ~30 rader
  i tickern som allokerade en ny `Graphics` per bubbla och förstörde den igen, med ett tak på
  ÅTTA och 380 ms mellan varje — kitteln puttrade alltså glest och räkningsbart. Nu en `Emitter`
  ur `lib/partiklar.js` (LYFTPLAN A4.2): jämn takt ur en återanvänd pool, noll allokering när
  flödet gått igång, en enda `destroy()`. Livet och farten är satta så att bubblan hinner upp
  till ytan och spricker där (stigning = `speed·life + ½|gravity|·life²` ≈ 26 px, inom kittelns
  mynning) — första försöket lät dem fortsätta ut i natthimlen. Bubblorna är **inte** additiva:
  brygdfärgerna är mörka (0x2a2342 m.fl.) och additivt ljus kan bara addera, så de hade blivit
  nära osynliga. De ritas i stället i en ljusare ton än brygden (`tint 0.62`) och färgen följer
  med i brygdens övergångstween.
