# Vändkort (`vandkort`)
> 🧩 minne · tap · 2–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

Ett bräde med snygga, mönstrade kort (lila baksida med prick-mönster, ljus inre platta och ett
litet emblem 🐾/🍃/⭐) på en tema-färgad scen. Jag trycker på ett kort → ring + "flip"-ljud och
en 3D-aktig vändning (skala.x → 0 → byt sida → tillbaka) avslöjar en stor, glansig symbol. Två
kort: matchar de (samma symbol) → kort paus, "match"-ljud, grön glöd + popp + gnistor + en ⭐
som flyter upp, och paret ligger kvar avslöjat. Matchar de inte → vänlig vingel + mjuk ton och
båda vänds tillbaka (aldrig en bestraffning). Alla par hittade → gnist-svep, delat firande
(stjärna + klistermärke) + mjuk skakning, och ett nytt, lite större bräde med *nytt tema*
(djur → frukt → fordon → figurer → havsdjur). Brädet växer 2×2 → 4×4 med nivån. Idle ~6s →
instruktionen upprepas och ett nedvänt kort "andas".

**Funkar bra:** korten är genuint premium (skugga, mönster, glans, emblem), vändningen är
saftig, tema-rotationen ger variation, no-fail intakt och progressionen är mjuk. En polerad,
korrekt minneslek.

*(Skärmdump: 2×2-bräde, ett uppvänt orange ♦-kort, tre nedvända lila kort.)*

## 2. Ursprunglig plan & tankeprocess

Kodens intent: en marknadsmässig minnes-/par-lek där en levande scen och premium-kort med saftig
vändning lyfter en klassisk mekanik. Tema-byte varje runda (djur/frukt/fordon/figurer/havsdjur)
garanterar att inget bräde upprepas, och rutnätet växer gradvis (2 par → 8 par) som mjuk
progression. Strikt felfritt — fel par vänds vänligt tillbaka, ingen timer, inga poäng.

## 3. Vad gör det lättjefullt / tunt

- **Ren läroboks-memory utan twist.** Mekaniken är exakt den man förväntar sig — och inget mer.
  Det enda som händer vid ett par är en grön ram + gnistor; symbolerna *gör* aldrig något.
- **Symbolerna är döda.** Ett djur-tema skriker efter ljud: hittar jag de två 🐶 borde hunden
  *skälla* (riktigt klipp via `audio.sample('djur_…')`), frukten borde "mumsas", fordonet tuta.
  Nu är 🐶 bara en bild som matchar en annan bild. Den största billiga grejen i spelet.
- **Ingen karaktär, ingen publik.** Brädet ligger ensamt på en tapet. Ingen Bobo som tittar på,
  ingen liten figur som jublar när ett par hittas. Belöningen är den generiska konfettin.
- **2-åringen tappas.** Minne 2×2 går, men för de allra yngsta finns ingen mjukare ingång
  (t.ex. en kort "titta-på-alla"-peek först, eller ett rent "vänd & härma"-läge) — bara hitta-
  par direkt. För 5-åringen finns å andra sidan ingen krydda (ingen tidsfri bonus, ingen
  gyllene-kort-överraskning).
- **Inget samlas.** Hittade par firas och försvinner med rundan — ingen "bilderbok"/galleri av
  vad jag matchat, ingen anledning att minnas mellan rundor.
- **Ljudet är tunt.** 'flip'/'match'/'soft' + samma två ljud varje gång. Ingen stigande tonhöjd
  när jag är på väg att tömma brädet, inget tema-specifikt ljud.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Paret *gör* något — temat får mening.** När ett par hittas: djuret spelar sitt
  riktiga läte och studsar fram, frukten blir uppäten med "mums", fordonet kör iväg, havsdjuret
  simmar undan. Det förvandlar "två bilder är lika" till en liten belöningsscen och knyter an
  till det pedagogiska (djurnamn/-ljud) utan att bryta no-fail.

### Variation & överraskning
- **[Quick] "Titta först"-peek för de yngsta** (nivå 0–1): visa alla kort uppvända i ~1,5s, vänd
  ner mjukt, säg "kom ihåg!". Sänker tröskeln för 2-åringen utan att bli svårare.
- ✅ ~~**[Quick] Gyllene kort.**~~ Klar 2026-08-12 (v1.170.0) — men som ett ENSAMT kort, inte ett
  gyllene par. Se §5 för varför den skillnaden är hela poängen.

### Juice
- **[Quick] Stigande tonhöjd ju fler par** (kombo-pling som klättrar mot tomt bräde) + tema-
  specifikt avslöjande-ljud i `_showFace`.
- ✅ ~~**[Quick] Saftigare miss-feedback:**~~ REDAN BYGGD (kontrollerad mot koden 2026-08-12,
  `index.js:254–260`): korten skakar mot varandra + `wiggle` innan de vänds tillbaka.

### Progression
- **[Medium] Par-galleri / bilderbok.** Varje funnet par läggs i en liten samling som fylls över
  tur — något att återkomma till och bläddra (talar djurets namn vid tryck). Ger spelet ett minne.
- **[Quick] Mjuk scen-cross-fade** vid temabyte istället för hård ombyggnad.

### Karaktär & berättelse
- **[Deep] Bobo som medspelare.** En liten figur i hörnet som "tittar bort" medan jag väljer,
  blir glad vid par, och vid tomt bräde springer fram och "samlar in" paren i galleriet — egen
  vinst-animation istället för generisk konfetti.

### Ljud
- **[Quick] Riktiga djur-/temaljud via `audio.sample(...)`** (knyt an till [[real-audio-sfx]]) —
  genomgående [Quick]-vinst som ensam lyfter hela djur-/havstemat.

## 5. Status / loggar

- 2026-08-12 ✨ **Gyllene kort — som ett ENSAMT kort, inte ett par** (v1.170.0, N10 pass 7).
  Punkten kom inte ur docen utan ur en mätning: ny sond `scripts/_stillaprobe.mjs` körde hela
  registret och `vandkort` var **det enda äkta tableauet av 63 spel** — 48 noder rör sig under
  utdelningen och sedan **0** medan barnet studerar brädet. Ett minnesspel är just det spel där
  barnet tittar längst på en stillastående bild.
  **Designbeslutet som docen inte hade:** §4 bad om "ett sällsynt glittrande kort vars par ger
  extra gnistregn". Ett glittrande PAR hade gått att matcha på synintryck — då är minnesleken
  borta för just det paret. Nu är bara **ett** kort gyllene; tvillingen är vanlig. Guldet pekar
  alltså ut ett kort värt att minnas och skapar ett mål, i stället för att lösa uppgiften.
  Aldrig på nivå 0 (två par = fyra kort — ett gyllene vore halva brädet).
  **Och skimret flyttar ingenting.** I ett minnesspel är kortets PLATS informationen; ett kort
  som guppar hade flyttat barnets hållhake — och `hitArea` sitter på kortet (P0). Livet ligger
  därför helt i alfan och i skimmerbandets egen x, klippt mot kortets form.
  **MÄTT** (`scripts/_guldprobe.mjs`, 10/10 mot HEADs 5/10): mest **1** gyllene kort per bräde
  över 120 bräden · **0** bräden med ett gyllene par · **0 av 24** nivå-0-bräden · 43 av 96
  bräden på nivå 1+ = **45 %** · kortets egen rörelse **0,00 px** medan bandet vandrar **372 px**
  och ringens alfa svänger 0,56 · guldfirandet fyrar 1 gång på ett guldpar och **0** på ett
  vanligt · fx-noder som mest 6 mot 4 · 0 tweens efter exit. Ny replik med genererat klipp.
  ⚠️ Raderna 1/2/3/9/10 är gröna på HEAD också (där finns inget guld att bryta mot) — de är
  **vakter, inte bevis**. Bevisen är 4, 5, 6, 7 och 8.
  ⚠️ `sparkle()` har en egen hårdkodad ton — `{ color }` är en **no-op** och togs bort ur
  anropet i stället för att stå kvar och se ut som en färgsättning.
  ⚠️ "Saftigare miss-feedback" i §4 var **redan byggd** (`index.js:254–260`) och är struken.

- 2026-08-10 🎨 **D1 (repo-brett svep): platt yta fick ljus** (`8809aa0`, v1.117.0).
  `_plattprobe --medbakgrund` mätte **131 796 px = 14 % av skärmen** i EN ton.
  Scenen bakom var redan tonad; det var KORTEN som var platta, och de är spelets
  huvudobjekt. Ytterplattan fick `topLightFill`, innerplattans glans `verticalFillAlpha` (den
  ritas halvgenomskinlig) och framsidan en svag lodrät toning — spannet med FLIT litet, ett
  spelkorts framsida ska vara ljus och får inte tävla med symbolen. **Mätningen gick i två
  steg av en anledning värd att minnas:** efter ryggarna låg toppfältet på 70 248 px i creme,
  och det var de UPPVÄNDA kortens framsidor — ett fält som bara finns när något är vänt upp,
  alltså osynligt i den första bilden.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **131 796 → 8 058 px** (14 % → 0,9 %).

- 2026-06-30: Doc skriven (granskning + plan). Inga kodändringar. Testkörning ren (errorCount 0),
  skärmdump verifierad (2×2, premium-kort, vändning).
- Rekommenderad första-omgång: **[Medium] paret spelar tema-belöning (djurläte/mums) + [Quick]
  titta-först-peek + [Quick] stigande kombo-ljud** — ger temat mening och gör minnesleken till
  en belöningsscen.
- 2026-07-02: Första-omgång implementerad (index.js).
  - **Tema-belöning (`_rewardPair`)**: varje SET fick `kind` (`animal`/`fruit`/`vehicle`/`figure`/
    `sea`). När ett par hittas gör symbolen något: djur spelar riktigt offline-klipp via
    `audio.sample()` (nya emoji→nyckel-mappen `ANIMAL_SOUND`: 🐶→djur_hund, 🐱→katt, 🐮→ko,
    🐷→gris, 🐸→groda), övriga djur talas via `ANIMAL_NAME`; havsdjur talas via `SEA_NAME`
    (sample saknas → röst); frukt säger "Mums!"; fordon `sfx('whoosh')`; figurer `sfx('reveal')`.
    Båda korten gör dessutom ett litet glädjeskutt (yoyo på y, exit-säkert via `killTweensOf` i
    `destroy`). `this._set` sparas i `_build` så belöningen känner aktivt tema.
  - **Titta-först-peek (`_peekBoard`)**: på nivå 0–1 vänds alla kort upp ~1,5s efter utdelning
    ("Titta noga på korten!"), vänds sedan ner ("Kom ihåg!"). `_busy` blockerar tryck under
    tiden (inget negativt). Alla delayedCalls guardade med `_alive`/`_cleared`.
  - **Stigande kombo-pling**: `sfx('match')` ersatt av `audio.tone({freq, slideTo})` där freq
    klättrar `440 + (matched-1)*90` per funnet par mot tomt bräde.
  - **Saftigare miss** (bonus [Quick] från §4): de två icke-paren "skakar nej" mot varandra
    (yoyo x mot mitten, repeat:3 → tillbaka exakt) utöver den befintliga vänliga vingeln.
  - Test: `node scripts/test-game.mjs vandkort --url http://localhost:5173 --taps "430,400;640,400;430,400;850,400"` → errorCount 0; skärmdump verifierad (2×2 figurer-bräde, fyra stora premiumkort, inga strökrängar).
  - Deferred: [Deep] Bobo-medspelare, [Medium] par-galleri/bilderbok, [Quick] gyllene kort,
    [Quick] mjuk scen-cross-fade vid temabyte, tema-specifikt avslöjande-ljud i `_showFace`.
