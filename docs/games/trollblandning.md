# Trollkarlens Blandning (`trollblandning`)
> 🧩 pussel · drag · 3–5 år · status: 📝 plan klar

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
