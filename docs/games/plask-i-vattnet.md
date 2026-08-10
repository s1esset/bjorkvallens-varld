# Plask i Vattnet (`plask-i-vattnet`)
> 💧 fysik · drag · 3–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En stor glasvattentank i mitten med halvtransparent vatten, vit rim, en **riktig simulerad
vattenyta** (SPH-skikt, se 2026-08-10 nedan) och små bubblor som driver uppåt. Upptill på en hylla ligger 6 föremål (bara
emoji, generös osynlig cirkel-träffyta): båt, trästock, äpple, sten, nyckel, sked, mynt,
ankare m.fl. Jag drar (eller tap-tap:ar) ett föremål ner i tanken → PLASK: ljud + dubbel
ytring + bubbelpuff, och glad röst NAMNGER vad som händer: "Anden flyter!", "Stenen
sjunker!". Nu är det en **riktig matter.js-värld med flytkraft**: lätta saker gungar och
guppar vid ytan, tunga glider lugnt till botten. Allt är massoberoende kalibrerat
(`floatFactor`), med vattenmotstånd + hastighetstak så inget kan studsa ur tanken. En svag
ban-fjäder sprider sakerna så de inte staplas.

Att trycka direkt på vattnet ger ett litet plask + närliggande flytare guppar till; ett
nytt plask ger ytsvall som får redan flytande saker att gunga. När alla 6 släppts: delat
firande (complete) + en glad fisk hoppar upp ur vattnet, sedan en ny varierad uppsättning
(alltid minst 2 flytare + 2 sjunkare). Idle ~6s → glad röst + en hyllsak puffar.

**Funkar bra:** flytkraften känns äkta och LUGN, namngivningen ("Båten flyter!") är ren
pedagogik, varierad uppsättning per runda, ytsvall + bubblor + fisk ger en sammanhängande
vattenkänsla, drag är förlåtande (tar emot ALLT, snäpper hem). Solitt fysikspel.

*(Skärmdump: glastank med en trästock som flyter vid ytan, 5 föremål kvar på hyllan.)*

## 2. Ursprunglig plan & tankeprocess

En lugn utforskande fysiklek (kodhuvudet): bevisa flytkraft programmatiskt, helt no-fail,
där upptäckten "vad flyter / vad sjunker" är hela poängen. Den talade namngivningen i
bestämd form ("Anden flyter!") knyter ord till fenomen och gör det till mjuk naturkunskap.
Tanken "tar emot allt" och släpp utanför snäpper hem — ingen kan göra fel. Varje runda
garanterar minst 2 av varje så mönstret framträder över tid.

## 3. Vad gör det lättjefullt / tunt

- **Utfallet är förutbestämt, inte upptäckt av barnet.** Varje föremål har fast `floats`-flagga;
  barnet *får veta* svaret av rösten i samma stund det plaskar. Det finns ingen **gissning**,
  ingen "tror du den flyter?" — så det blir att-titta-på snarare än att-tänka.
- **En-utfalls-interaktion.** Drag → plask → flyt/sjunk. Föremålet gör sedan ingenting mer;
  man kan inte trycka ner en flytare och se den studsa upp, inte fiska upp en sjunkare,
  inte stapla.
- **Tom scen utan karaktär.** Bakgrunden är platt `COLORS.bg`. Ingen badar i tanken, ingen
  fisk simmar omkring (fisken syns bara 0,9s vid firandet), ingen Bobo tittar nyfiket på.
- **Ljud-namngivningen är audio-only.** Utan röst ser barnet ingen text/ikon om "flyter vs
  sjunker" — den pedagogiska kärnan vilar helt på TTS. Plask-ljudet faller dessutom ofta
  tillbaka på syntes.
- **Föremålen är livlösa emoji.** Anden har inga ögon, båten ingen segel-vaja, äpplet ingen
  studs — de gungar bara som identiska cirklar med olika emoji ovanpå.
- **Generisk belöning.** Fisken är en trevlig touch, men firandet är annars samma
  konfetti+stjärna; inget samlas ("vad har jag testat?"), ingen logg över flyt/sjunk.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Gissa först (valfritt, no-fail).** Innan släpp kan rösten/en liten tankebubbla
  fråga "flyter eller sjunker?"; två stora ikon-knappar (🔼 flyter / 🔽 sjunker). Rätt
  gissning → extra gnistor + jubel; fel → mjukt "Vi ser efter!" och plasket avslöjar svaret.
  Gör det till *tänkande*, aldrig straff. Kan slås av för de yngsta (ren plask-lek).
- **[Quick] Trycka ner en flytare.** Låt ett tryck på en flytande sak doppa den (extra
  nedåt-impuls) så den studsar upp igen med ett plask — leksam agens på det som redan flyter.
- **[Deep] Fiska upp.** En liten håv/krok-knapp som lyfter en sjunkare till hyllan igen →
  barnet kan experimentera om och om.

### Variation & överraskning
- **[Quick] Överraskningsföremål.** Ibland en sak som gör något extra: tvål (skummar),
  badanka (pip + simmar lite själv), is (smälter långsamt och börjar flyta lägre). Rotera in.
- **[Medium] Olika vätskor/nivåer.** En runda med "tjockt" honungsvatten (allt sjunker
  långsammare) eller högre/lägre vattennivå — samma fysik, ny känsla.

### Juice
- **[Quick] Riktigt plask + plopp.** Knyt 'splash' till inspelade vattenplask via
  SFX-pipelinen ([[real-audio-sfx]]) i två varianter (lätt plask för flytare, djup plopp för
  sjunkare) i stället för syntes.
- **[Quick] Levande föremål.** Ge båten en liten segel-vaja, anden ögon + ett "kvack" vid
  plask, äpplet en studs vid ytan — billig per-objekt-personlighet.

### Progression
- **[Medium] Synlig upptäckts-logg.** Två små hyllor vid sidan ("Flyter" / "Sjunker") där en
  miniatyr av varje testat föremål landar och *stannar* över rundor — visuellt mönster utan
  ljud, något att fylla.
- **[Quick] Mjuk svårighetsväxling.** Inför "kluriga" föremål (apelsin med/utan skal-känsla,
  flaska med lock) på högre nivåer som retar förväntan — fortfarande no-fail.

### Karaktär & berättelse
- **[Deep] En invånare i tanken.** En liten fisk/groda (Bobo som dykare?) som bor i vattnet,
  simmar undan när något plaskar, nyfiket nosar på det som sjunker och firar vid runda klar
  — ger scenen liv och en egen vinst-animation.

### Ljud
- **[Quick] Lugn vatten-ambient-loop** (mjukt porlande) + varierat berömsting; säkerställ att
  namngivnings-frasen alltid hörs innan firandet.

## 5. Status / loggar

- 2026-08-10 🎨 **D1: golvet fick ljus från horisonten** (`65556d9`, v1.125.0).
  Golvet låg på **57 525 px i EN ton** — spelets största fält sedan vattnet tonades.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **57 525 → 30 283 px.**

- 2026-08-10 🎨 **D1: vattnet mörknar med djupet** (`59e0778`, v1.123.0).
  Vattenkroppen låg på **80 950 px i EN ton** (`_plattprobe --medbakgrund`) — spelets största
  fält. Här är toningen inte bara mot platthet utan FYSIKALISKT rätt: vatten mörknar med
  djupet, så ljust vid ytan och mörkare mot botten är precis vad ögat väntar sig av en tank.
  Rampen får därför vara tydligare än på en torr yta (0,14/0,34). Alpha-vägen, eftersom
  vattnet måste fortsätta släppa igenom fisken och föremålen bakom. SPH-ytan ovanpå störs inte.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **80 950 → 57 525 px.** Spelets topp
  är nu hyllplanet (`#e6d3ae`), ett annat fält.

- 2026-06-30: Doc skriven (granskning + plan), ersätter gammal build-spec. Inga kodändringar.
  Spelet testat (errorCount 0; drag av föremål → trästock flyter vid ytan, korrekt).
- Rekommenderad första-omgång: **[Medium] valfri gissa-först + [Medium] synlig flyt/sjunk-logg
  + [Quick] riktigt plask** — lyfter spelet från titta-på till tänka-och-samla.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0). Alla tre rekommenderade lyft byggda,
  ingen omskrivning (fokuserad ändring):
  - **[Medium] Valfri gissa-först (no-fail).** Tap-markering av ett föremål fäller upp en
    tankebubbla "Flyter eller sjunker?" + två stora ikon-knappar (🔼 flyter / 🔽 sjunker,
    Ø120 ≥ 96px) i den fria mitt-toppen. Rätt gissning → extra gnistor + `sfx('correct')`
    + "Ja! Anden flyter!"; fel → mjukt `sfx('soft')` + "Vi ser efter! Stenen sjunker!" (aldrig
    straff). onSelect fires ENDAST vid tap (inte vid drag) → den som bara drar-och-släpper
    ser aldrig knapparna = ren plask-lek för de yngsta (kravet "kan slås av" uppfyllt utan
    inställning). Bubblan göms vid släpp/avmarkering/ny runda; exit-säkra tweens.
  - **[Medium] Synlig upptäckts-logg.** Två sidohyllor "Flyter" (v.) / "Sjunker" (h.); varje
    testat föremål lägger EN miniatyr (dedupe på emoji) som STANNAR över rundor OCH sessioner
    (`progress.setCustom('floatLog'/'sinkLog')`) → ett växande ordlöst mönster, max 8/hylla.
  - **[Quick] Riktigt plask + plopp.** `splash`-syntesen ersatt med inspelade vatten-klipp via
    SFX-pipelinen: lätt `sample('pop')` för flytare (+ ljus stänk-topp), djup `sample('plopp')`
    för sjunkare; mjuk ton-fallback om klippet ännu inte avkodats.
  - Testat drag (6 släpp → firande) + tap-tap-gissning; båda errorCount 0, skärmdumpar
    bekräftar flyt/sjunk, ifyllda loggar (även efter sessions-omstart) och gissningsbubblan.
- 2026-08-04: **Andra omgången** (errorCount 0) — spelet såg ut som en emoji-hylla; nu är det
  en riktig scen med riktiga föremål.
  - **P0 ASSETS — alla 16 föremål ritas** (`makeThing`): gummianka med öga och näbb, löv med
    nerver, trästock med årsringar, livboj, segelbåt med skrov/mast/två segel, äpple, kork,
    fotboll · sten, nyckel, sked, mynt, ankare, skruv, hammare, kugghjul. Även upptäckts-loggens
    miniatyrer och gissningsknapparnas pilar är ritade. **Noll emoji-rekvisita kvar.**
    Sparformatet bytte från emoji till ascii-`kind`; gamla sparposter filtreras bort tyst.
  - **Riktig miljö** i stället för platt cremeplatta: ljus rumsbakgrund med fönstervy,
    **trähyllor** som sakerna faktiskt ligger på (de svävade förut i luften), och ett **bord**
    som tanken står på.
  - **En invånare i tanken** (§4 [Deep]): en ritad fisk som simmar omkring, **flyr undan när
    något plaskar i**, och nosar nyfiket på det som sjunkit till botten. Den ersätter också
    firandets emoji-fisk — nu är det tankens EGEN fisk som hoppar i en båge upp ur vattnet
    och plaskar ner (spelspecifik finish).
  - **Trycka ner en flytare** (§4 [Quick]): ett tryck rakt på något som flyter trycker ner det
    under ytan så det studsar upp igen med plask och ringar — agens på det som redan flyter.
  - **Bugg:** `gsap.delayedCall` för nästa runda → `ctx.later()`; `_logIcons` nollställs i
    `destroy` så listan inte växer över spelomgångar.
- 2026-08-09 ✅ **Tyngd i draget [Quick]** (v1.69.0): föremålet följer fingret med en liten eftersläpning, lutar åt dragets håll och landar med en tryckning i målet (delat i `DragController`). Här tändes dessutom lyft-skuggan (`skugga: true`) — spelet ritar ingen egen. Mätt med `_dragprobe`: 16 px släp, 0,131 rad lutning, skuggan borta och lagret tillbaka efter släpp, 0 konsolfel vid exit mitt i drag.
- 2026-08-09 ✅ **Vattnet blev en delad VÄTSKEVOLYM** (v1.77.0, LYFTPLAN B6 / spår 3 runda P0).
  De 34 raderna handrullad `_applyBuoyancy` är borta; tanken är nu en `Flytvolym` ur
  `src/lib/flytkraft.js` som äger lyftkraft, vattenmotstånd, fartspärr, bottenlugn,
  banfjäder och gupp/vaggning. Alla tal är oförändrade — **verifierat identiska banor,
  största avvikelse 0 px över 900 steg mot den gamla koden** (`node scripts/_flytprobe.mjs`).
  Två saker blev bättre på köpet: flytkraftens bas läses ur världens gravitation varje
  steg i stället för ur en hårdkopierad konstant (`BUOY_BASE`), och vattnet är en
  **rektangel** (414–866) i stället för en oändlig ytlinje, så inget utanför tanken kan
  lyftas av osynligt vatten. Skarp körning med fem riktiga drag: äpple och boll guppar
  vid ytan, skruv/sked/nyckel ligger stilla på botten.
- 2026-08-10 ✅ **Vattnet blev VÅTT** (v1.85.0, spår 3 runda P2 — första kunden). Tanken har
  ett riktigt SPH-skikt ur `lib/vatska.js`: ytan svallar när något slår igenom den, nivån
  STIGER av undanträngd volym och vattnet slår ihop bakom det som sjunker.
  - **Bara ytskiktet simuleras** (330–400, 416 partiklar). Hela vattenkroppen hade kostat
    allt och synts nästan noll — det är vid ytan vattnet rör sig. Djupet är samma ritade
    kropp som förut; skarven döljs av en påfyllning som tar djupet till exakt skiktets ton.
    Samma grepp som `golvet-ar-lava`.
  - **Vilopackningen är MÄTT, inte gissad.** Första fyllningen (15 px-rutnät) sjönk ihop till
    en 42 px hög sträng — 73 px² per partikel i vila — och ytan hamnade på y=428, alltså
    98 px UNDER flytkraftens nollinje: en lysande blå stapel som svävade mitt i tanken.
    Fyllningen räknas nu ur den siffran och vattnet står stilla på rätt nivå från första
    bildrutan.
  - **Nedslagspunkten låg på fel sida om ytan.** Föremålet föddes på tankens mitt — 140 px
    under vattenytan — medan "plasket" var en ritad ring vid ytan. Med riktigt vatten blev
    det direkt synligt: en sten som föds under ytan rör inte en enda partikel. Draget snäpper
    nu till strax ovanför ytan (`DROP_Y`), och drag-målets träffyta blev en REKTANGEL över
    hela tanken (läget och hitytan behöver inte vara samma sak).
  - **Undanträngningen är kalibrerad i sonden:** radie 24 px i vätskan → 3,4 px lyft per
    flytare (knappt synligt), 34 px → 7,7 px (valt). **Mer fart ger inte större plask** —
    5,4–7,0 px/steg gav LÄGRE stänk (20 mot 23 px) och föremålet dök rakt igenom skiktet så
    undanträngningen försvann med det. Farten trycker undan vatten i sidled, den kastar det
    inte uppåt.
  - **Ljusranden vid hyllan bortmaskad.** Metabollens kant hänger ner under skiktets osynliga
    hylla och lyste igenom påfyllningen: uppmätt 125,189,228 mot vattnets 112,182,225 i ett
    band y≈410–425, en tunn vågrät linje tvärs tanken. En mask som slutar vid hyllan tar bort
    överhänget — snittet självt syns inte (kroppen och påfyllningen skiljer 1 enhet). Efter:
    112,182,225 rakt igenom, 0 kostnad i FPS. (Mask och inte `boundsArea`: filtrets rendermål
    växer med suddets padding, så klickar strax utanför ytan ritas ändå.)
  - Den dekorativa guppande ytlinjen är borta — två ytor på olika höjd läser som en glitch.
  - **Uppmätt** (`node scripts/_plaskprobe.mjs`, 12 mått): stänk **24–34 px över ytan**,
    undanträngning **8–13 px på tre flytare**, värsta fallet (allt i tanken) **36–40 px kvar
    till rimmen**, volymen konstant **416 → 416**, **0 partiklar utanför tanken**, rivet vid
    exit. `_vatskeprobe`: **58,9 FPS**, 167 k vätskepixlar, 0 konsolfel.
  - Nya/ändrade verktyg: `scripts/_plaskprobe.mjs` (stänk · undanträngning · tak · volym ·
    exit) och `_vatskeprobe.mjs` som känner igen släpp-spel och tömmer hyllan i tanken.
