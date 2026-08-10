# Studsa Ner (`studsa-ner`)
> ⚙️ fysik · mixed · 2–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

Ett plinko-bräde: en stor ljus spelyta full av vita pinnar (en förskjuten triangel) och
nederst en rad färgglada fickor. Högst upp följer ett glansigt mynt mitt finger — jag DRAR
det i sidled (en prickad linje + kolumn-highlight visar var det "lutar åt") och SLÄPPER.
Myntet faller helt naturligt under tyngdkraften, pingar livligt mot pinnarna och landar i
en ficka. En ficka **LYSER** (en utropad färg, "Släpp i den gröna fickan!") och myntet har
samma färg — landar det i den lysande fickan fylls en mätare (3 prickar uppe till höger).

Full mätare → firande + stjärna + klistermärke, och en ny nivå (fler fickor, målet flyttar,
fler pinnar). "Fel" ficka ger ett glatt plopp och en liten puff — ingen poäng, aldrig straff.
Vid mount släpps ett demo-mynt mot målet; idle ~6s → röst + ett hjälp-släpp ovanför målfickan;
ett mynt som kilar fast får en mjuk slumpknuff loss.

**Funkar bra:** fallet är livligt och tillfredsställande, no-fail är intakt, den talade
färginstruktionen sår ett pedagogiskt frö (färgord), mätare + nivåstegring finns, exit-säkert.

*(Skärmdump: stort ljust pinnbräde, 4 färgfickor nederst, droppar-mynt med pil högst upp,
ett mynt mitt på brädet, mätare uppe till höger.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet vill lyfta klassisk plinko från "släpp och titta" till en **lek med mål**: en
lysande målficka + ett färgmatchat mynt + en sidleds-drag-kontroll innan släpp. Avsikten var
agens (du *väljer* var myntet faller) utan att fuska bort fysiken — ingen magnetisk styrning,
myntet faller "precis som ett riktigt plinko-mynt" (bara en pytteliten slumpfart i sidled).
Färgmålet ger igenkänning och svenska färgord; anti-fastnar-knuffen och hjälp-släppet
garanterar att det alltid lyckas.

## 3. Vad gör det lättjefullt / tunt

Här bor den ärliga kritiken — för just plinko gör designvalet "ingen styrning" att
kärnkontrollen knappt betyder något:

- **Drag-kontrollen är nästan en illusion.** Eftersom myntet faller helt naturligt och
  pingar slumpmässigt mot pinnarna har drop-x:et väldigt liten påverkan på vilken ficka det
  hamnar i — utfallet är i praktiken **tur**. Den prickade linjen pekar rakt ner, men myntet
  studsar bort från den. Barnet "siktar" men ser ingen tydlig orsak→verkan. Det är raka
  motsatsen till en kärnloop med agens.
- **Auto-hjälpen gör jobbet.** Demo-myntet, idle-släppet (rakt över målfickan) och
  anti-stall-knuffen betyder att en passiv spelare ändå fyller mätaren. Snällt, men tunt.
- **Pinnarna är döda prickar.** De lyser inte, studsar inte, låter olika — de är bara vita
  cirklar. Hela övre brädet är en stor tom cremefärgad yta utan liv.
- **Fickorna har ingen personlighet.** Platta färgade rektanglar; inget "gap" som slukar,
  ingen hög av insamlade mynt, ingen reaktion utöver en puff. Det man "samlar" försvinner.
- **Ingen karaktär/berättelse.** Inget ansikte, ingen maskot, ingen anledning bortom mätaren.
- **Ljudet är sparsmakat.** `tap` på pinnar (hårt strypt), `pop`/`correct`/`pling`. Ingen
  stigande pinn-melodi när myntet rasslar ner, inget "jackpott"-ljud i målfickan.

Kort sagt: *vacker rörelse, men spelaren styr knappt utfallet* — och brädet + fickorna är
livlös rekvisita.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Deep] Ge drop-läget verklig betydelse.** Inför element som gör placeringen avgörande utan
  att bli "magnetisk": en **flyttbar tratt/ränna** överst som barnet siktar med, eller 2–3
  pinnar som barnet kan *dra* åt sidan för att öppna en väg mot målfickan. Då blir "var släpper
  jag?" ett riktigt val (och fysiken är fortfarande äkta).
- **[Medium] Sikt-fönster.** Visa en mjuk, ärlig sannolikhets-tratt (var myntet *troligen*
  landar givet drop-x) i stället för en rak pricklinje som ljuger. Hjälper barnet koppla
  handling till utfall.

### Variation & överraskning
- **[Quick] Special-mynt & special-fickor.** Ibland en gyllene "stjärnficka" som ger två
  mätar-platser, eller ett "studsmynt" som pingar extra. Rotera per nivå.
- **[Quick] Rörliga pinnar/snurror.** Någon enstaka liten snurrande pinne eller en vimpel som
  myntet studsar mot — ger banan karaktär och varierar varje fall.

### Juice
- **[Quick] Pinn-melodi.** Låt varje pinn-träff spela en ton ur en stigande skala medan myntet
  faller (mjukt, strypt) — ett litet "plink-plink-plong" som klättrar. Jackpott-ljud i målet.
- **[Quick] Fickan slukar.** Målfickan "gapar" och svälter myntet (öppningen squashar), och
  fyllda mynt staplas synligt i en glaskruka bredvid mätaren.

### Progression
- **[Quick] Synlig myntsamling** (krukan ovan) som växer över nivåer — något att återkomma till.

### Karaktär & berättelse
- **[Deep] En figur under fickorna.** Maskoten Bobo (eller ett djur med öppen mun per ficka)
  som hejar när myntet rasslar och gör en glädjeskutt när rätt ficka träffas — egen
  vinst-animation i stället för generisk konfetti.

### Ljud
- **[Quick] Riktiga SFX** (trä-plink, mynt-plopp) via SFX-pipelinen ([[real-audio-sfx]]);
  variera vinst-stinget.

## 5. Status / loggar

- 2026-08-10 🎨 **D1: spelbrädan fick ljus uppifrån** (`054e424`, v1.123.0).
  Brädan låg på **115 361 px i EN ton** (`_plattprobe --medbakgrund`) — appens största
  kvarvarande platta fält och 16 % av skärmen. Den är ingen textpanel utan själva spelytan
  sedd rakt framifrån, så den tål ljus uppifrån. Dämpad ramp (0,04/0,10): crèmen är nästan
  vit och kulorna måste fortsätta läsa mot den. Alpha-vägen i `groundFill`, eftersom brädan
  ligger på 0,78 och ska fortsätta släppa igenom bakgrunden.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **115 361 → 12 739 px.**

- 2026-06-30: Doc skriven (granskning + plan). Spelet testat (errorCount 0, skärmdump sedd).
  Inga kodändringar.
- Rekommenderad första-omgång: **[Deep] ge drop-läget verklig betydelse** (annars är agensen
  illusorisk) + **[Quick] pinn-melodi + slukande fickor** för känslan.
- 2026-07-01: **Första-omgång genomförd** (errorCount 0, skärmdump sedd — mynt faller & lägger
  sig, ingen jam). Implementerat:
  - **[Deep] Verklig betydelse via flyttbar tratt/ränna.** En fysisk ∨-tratt (två sluttande
    statiska väggar + trä-grafik) sitter överst och FÖLJER siktdraget; myntet faller *in* i
    tratten och styrs rent ner till spouten precis ovanför första pinnraden. Nu börjar fallet
    exakt under fingret (i stället för efter en lång slumpartad rutsch) — sikten är ett synligt,
    fysiskt val, fortfarande äkta plink (ingen magnetisk styrning). Spout-gapet (68px) är rejält
    större än myntet (40px) → kan aldrig fastna; anti-stall-knuffen täcker även trattzonen.
  - **[Quick] Pinn-melodi.** Varje pinn-träff klättrar uppför en pentaton-skala (`PEG_SCALE`,
    per-mynt `_pegHits`) via `audio.tone` — mjukt "plink-plink-plong" — plus en stigande
    jackpott-flärp när myntet når målfickan (skild från pinn-melodin).
  - **[Quick] Slukande fickor.** Fickorna är nu botten-ankrade och gör en snabb squash-"gulp"
    när ett mynt landar (`_gulpBin`): stor glad gulp i målfickan, liten i en "fel" ficka —
    per-ficka-reaktion i stället för en enda utgång.
  - **[Pattern #1] Mjukare auto-hjälp.** Idle ger nu bara en vänlig röst-vink vid ~6s;
    hjälp-släppet kommer först efter ~12s (och nollställs vid minsta beröring) så barnets egen
    sikt hinner betyda något. Demo-släppet vid mount kvar (engångs, instruktivt).
  - FOKUSERAT, inga delade filer rörda. Exit-säkert: trattväggar städas av `phys.destroy()`,
    fick-squash-tweens dödas vid rebuild/destroy, alla callbacks `_alive`-vaktade.
- 2026-08-04: **Tredje omgången** (errorCount 0) — mottagare, levande bräde och en layoutbugg.
  - **Layoutbugg (allvarlig):** mätaren låg på `y=56, x = width-56-i*64` → platserna på x 1224
    och 1160 hamnade **rakt under ljudknappen** (1164–1256) och var helt dolda. Mätaren är nu
    en lodrät kolumn längs vänsterkanten (x 36, y 200/274/348) och alla tre platser syns.
  - **Fickorna är varelser** (§4 [Deep], "en figur under fickorna"): varje ficka har ögon och
    mun. **Målfickan gapar hungrigt** (öppen mun + tunga) medan de andra ler lugnt — mottagaren
    som scenen saknade, utan att ta någon extra plats. Gulpen läser nu som att den äter myntet.
  - **Pinnarna tänds** (§3 "döda prickar"): varje pinnträff blixtrar gult, pulsar upp och
    slocknar igen. Brädet lever medan myntet rasslar ner.
  - **Myntkruka** (§4 [Quick] "synlig myntsamling"): en glasburk längs högerkanten där varje
    insamlat mynt stannar kvar — också mellan spelomgångar (`custom.mynt`, 40 syns).
  - **Bugg:** alla tre `gsap.delayedCall` → `ctx.later()`; pinn-vyerna och krukans tweens
    dödas i `destroy` och vid nivåbyte.
- 2026-08-09: **LYFTPLAN rad 3 / A2** (v1.47–48.0, `62b91db` + `bce776d`): bollarna ritas av delade `makeBoll` (`lib/foremal.js`) — hela den lokala funktionen blev en rad.
  Kontroll: `check` 0 fel · `test:all` 72/72 · skärmdump granskad. Inga spelregler eller layout rörda.
- 2026-08-09 ✅ **Fläkten — agens i stället för plinko-tur** (v1.83.0, spår 3 runda P1). En
  ritad fläkt står på en räls längs brädets innerkant och blåser inåt. Barnet drar den
  upp/ner för att välja på vilken höjd luften tar tag i myntet, eller över brädets mitt för
  att flytta den till andra sidan — **två rälsar, ETT föremål**, så riktningen behöver inget
  ord: den syns på vilken sida fläkten står. Strömmen ritas alltid (fyra bågar som vandrar
  utåt), så kontrollen är upptäckbar utan instruktion.
  **Styrkan är mätt, inte satt på känsla** (`node scripts/_flaktprobe.mjs 10`): tio mynt
  släppta från exakt samma punkt med fläkten åt höger respektive vänster landar **231 px**
  isär = **0,72 fickor**. Nog för att vända en nära-miss till en träff, för lite för att göra
  siktet meningslöst. Kraften går via `speedToAccel()` (px/steg → matter), samma kalibrering
  som magnetfältet.
  ⚠️ **Tre fel som mätningen fångade, alla osynliga i koden:**
  1. Första räckvidden (560 px) lämnade 6 % av kraften kvar i mitten där mynten faktiskt
     faller. Uppmätt verkan: 8 px. En kontroll som inte gör något är en lögn mot barnet.
  2. Sonden mätte sedan en **avstängd** fläkt: den släppte mynt medan demomyntet ännu var i
     luften, och fläkten pausar då med flit. Två mätningar i rad sa 8 och 10 px — båda sanna,
     om en fläkt som inte blåste. Sonden väntar nu på att fläkten blåser.
  3. Strömmen var **vit på ett cremevitt bräde** och syntes inte alls i skärmdumpen. Nu är
     den i fläktens egen blå.
  `_idleprobe` ger 1 framsteg i 2 av 3 körningar — **oförändrat mot HEAD** (2 av 3): det är
  hjälp-släppets egen pinnslump, inte fläkten.
