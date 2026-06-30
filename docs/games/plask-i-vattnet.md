# Plask i Vattnet (`plask-i-vattnet`)
> 💧 fysik · drag · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

En stor glasvattentank i mitten med halvtransparent vatten, vit rim, en mjukt guppande
ytlinje och små bubblor som driver uppåt. Upptill på en hylla ligger 6 föremål (bara
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

- 2026-06-30: Doc skriven (granskning + plan), ersätter gammal build-spec. Inga kodändringar.
  Spelet testat (errorCount 0; drag av föremål → trästock flyter vid ytan, korrekt).
- Rekommenderad första-omgång: **[Medium] valfri gissa-först + [Medium] synlig flyt/sjunk-logg
  + [Quick] riktigt plask** — lyfter spelet från titta-på till tänka-och-samla.
