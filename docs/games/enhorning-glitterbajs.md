# Enhörningens Glitterbajs (`enhorning-glitterbajs`)
> 🎉 roligt · drag · 2–4 år · status: ✅ klar

## 1. Nuläge (sett som spelare)

En rosa-lila godishimmel med bokeh. Till vänster står en söt enhörning (vänd åt vänster, med
fest-horn, regnbågsman och -svans) och Elvira bredvid. Nere i vänstra hörnet en bricka med tre
maträtter 🍓🧁🍪. Jag **drar mat till enhörningens mun** (eller tap-tappar: tryck mat → tryck
enhörning) → den tuggar, och efter ~0,6 s **PRUTTAR** den ut ett regn av små guldglitter-pellets
(riktiga matter.js-`bouncy`-kroppar) bakåt-uppåt-höger. Pelletsen studsar på 1–3 **slumpade
plattformar** (olika antal/läge/vinkel varje nivå) och regnar ner. Jag **drar en skattkista** i
sidled (eller tap-tappar botten-remsan) för att fånga glittret i öppningen (sensor-kollision).
En guldmätare med ⭐ till höger fylls per fångad pellet. Full mätare → konfetti, beröm,
"Mer glitter!", nästa nivå (mer mål, mer glitter, svag auto-böjning mot kistan).

Två kontroller styr utfallet: **hur mycket du matar** (mer mat = fler pellets) och **var du
ställer kistan**. No-fail är robust: missade pellets studsar glatt, pellets som blir liggande
> 2 s eller är > 10 s gamla glider mjukt in i kistan själva, och från nivå 2 böjs regnet svagt
mot kistan. Pellet-tak (48) och fallfarts-tak håller prestanda + fångbarhet.

**Funkar bra:** detta är en av de mer polerade i fliken. Enhörnings-konsten är genuint fin
(spiralhorn, regnbågsman, glittrigt öga), de slumpade plattformarna ger äkta rund-variation,
fysiken är fångbar och kalibrerad, och dubbel-kontrollen (matmängd + kistplacering) ger verklig
agens. Allt exit-säkert (proxy-tweens, `_clearPellets`, sensor synkad till kistan).

*(Skärmdump: enhörning + Elvira till vänster, mat-bricka 🍓🧁🍪, lila plattform, fallande
guldpellets, skattkista, guldmätare till höger.)*

## 2. Ursprunglig plan & tankeprocess

Silly toaletthumor mött med riktig fysik: mata → prutt → glitterregn → fånga. Den absurda,
magiska premissen (en enhörning som bajsar glitter) är i sig dragplåstret, och de slumpade
plattformarna + fri kistplacering ger en liten "lös pusslet med studsbanan"-känsla utan att
någonsin kunna misslyckas. Auto-glid + böjning garanterar att glittret alltid hamnar i kistan.
Mätaren ger ett tydligt, läsfritt mål och `complete()` ger den delade belöningen.

## 3. Vad gör det lättjefullt / tunt

Polerad grund — men kärnvalet och samlandet är förvånansvärt tomma:

- **De tre maträtterna är rent kosmetiska.** 🍓, 🧁 och 🍪 gör *exakt samma sak* — varje matning
  sprutar samma batch identiska guldpellets. Det finns ingen anledning att välja den ena framför
  den andra; "vilken mat" ser ut som ett val men är det inte. Detta är spelets tydligaste
  lättjefulla drag: tre knappar, ett utfall.
- **Allt glitter är identiska gula prickar.** Ingen sällsynt regnbågspellet, inget hjärt-glitter,
  ingen variation i vad som regnar. Samma `makePelletView` (gul cirkel + ev. ✨) varje gång.
- **Kistan samlar ett osynligt antal.** Fångat glitter tuckas in och förstörs — inuti kistan
  syns *ingenting*. Det enda spåret är mätaren. Precis som klämbubblors gömda emoji: man samlar,
  men det blir inget att se eller minnas (ingen glittrig hög, inget galleri).
- **Enhörningen pruttar likadant varje gång.** Samma `whoosh` + `floatText('💨')` + sparkle. För
  ett spel som *handlar* om magiskt bajs finns ingen variation i själva prutten/bajset.
- **Elvira är statisk.** Hon står still och `pop`:ar ibland; inget uttryck, ingen reaktion på
  matning eller fångst.
- **Plattformarna är dekorativa lila plattor.** De varierar (bra!), men har ingen egen juice —
  ingen studs-squash, inget "boing", inga svamp-/moln-plattformar med karaktär.
- **Belöningen är generisk.** `bigCelebration` + `burst`; ingen egen glitter-vinst (kistan som
  svämmar över, ett glitter-fyrverkeri ur kistan).
- **Ingen riktig prutt i ljudet.** Trots temat används `whoosh` för prutten — `fart`-samplet
  (som bajs-och-kiss använder) skulle vara både roligare och mer rätt.

Kort sagt: *snyggt och tekniskt välbyggt, men "vilken mat"-valet är en illusion och det fångade
glittret blir ett osynligt nummer* — agensen och samlandet är tunnare än det ser ut.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ ~~**[Medium] Gör maten till ett verkligt val.**~~ Redan byggd (`FOODS` :63 + `makePelletView(kind)` :1211 —
  hjärtan/strössel/mynt) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Visa matmängdens effekt.**~~ Klar 2026-09-23 (v1.251.0): portioner som äts innan prutten
  kommit staplas (tak 3) till EN större prutt — längre stråle i skurar, större puff, djupare ton
  (`_feed` :468, `_fart` :536).

### Variation & överraskning
- ✅ ~~**[Quick] Sällsynt jackpot-pellet.**~~ Klar 2026-09-23 (v1.251.0): var 12:e prutt (i snitt) bär en ritad
  regnbågsstjärna som glimmar; fångad fyller den tre mätarsteg (aldrig förbi målet) med eget
  arpeggio och burst (`makeJackpotView` :1250, `_catch` :650).
- ✅ ~~**[Medium] Karaktärsfulla plattformar.**~~ Redan byggd (`makePlatform` :1149 randiga godisbitar
  med studsknoppar, `pop` + ljud vid träff :608) — uppdagat 2026-09-23.

### Juice
- ✅ ~~**[Quick] Riktig prutt + saftigare bajs.**~~ Redan byggd (`_fart` :542 fart-sampel/synt-prutt,
  rök-puff, enhörnings-skutt) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Synlig kista som fylls.**~~ Redan byggd (`_drawChestFill` :664) — uppdagat 2026-09-23.
  Överflödet vid full mätare är inte byggt.

### Progression
- **[Quick] Lås upp glitter-färger/teman över nivåer** som ett mjukt samlarspår (sparas i
  `custom`), så återkomst känns meningsfull.

### Karaktär & berättelse
- **[Medium] Reaktiv enhörning + Elvira.** Ge enhörningen en glad tugg-/prutt-animation och
  byt-min-öga, och låt Elvira jubla/klappa när kistan fylls. Använd bara godkända namn
  (Elvira/Zacke/Alissa/Lova).
- **[Deep] Glitter-galleri.** En liten "skattkammare" man kan titta i (bakom grind) som visar
  allt insamlat glitter över tid — ger en anledning att bry sig om varje fångst.

### Ljud
- ✅ ~~**[Quick] Eget fångst-pling som stiger**~~ Klar 2026-09-23 (v1.251.0): plinget klättrar C-dur pentatonik så
  länge glittret kommer tätt, börjar om efter 1,5 s paus (strypt 90 ms, vol 0,07) (`_catch` :642).
  Vinst-stinget varieras redan av `complete()`. Godishimmel-ambient kräver ett SFX-klipp (MOSS
  nere) — öppen.

## 5. Status / loggar

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): `_onComplete` spelade eget vinstljud, eget
  PRAISE och eget konfettiregn i samma tick som `complete()` — strukna. "Mer glitter!" kapade
  berömmet efter 1,5 s och köas nu med `ctx.narTyst` (nivå-token). Nytt: matmängden syns (staplade
  portioner = en större prutt i skurar), stigande fångst-pling, och en sällsynt jackpot-stjärna
  (+3 mätarsteg). `check` 0/0.
- 2026-06-30: Doc skriven (granskad i spelet, errorCount 0). Inga kodändringar ännu. (Ersatte den
  äldre bygg-specen i samma fil med review-format enligt mallen.)
- Rekommenderad första-omgång: **[Medium] mat → olika glitter + [Quick] synlig kista som fylls +
  riktig prutt-sfx** — gör det illusoriska matvalet äkta och samlandet synligt, där spelet är som
  tunnast trots sin polish.
- 2026-07-01 🔧 **Första-omgången byggd (alla tre):** (1) **Mat → olika glitter [Medium]** —
  `FOOD_GLITTER` (🍓→hjärtan/rosa, 🧁→regnbågs-strössel, 🍪→guldmynt); `_feed` sätter
  `_glitterKind`, `makePelletView(kind)` färgar/emojar pelletsen → matvalet är nu ett verkligt val.
  (2) **Synlig kista [Quick]** — `_chestFill` ritar en färgglad glitter-hög som växer inuti kistan
  per fångst (`_drawChestFill`). (3) **Riktig prutt [Quick]** — synt-sawtooth-prutt (`audio.tone`)
  med `sample('fart')`-hook, + rök-puff och en enhörnings-skutt. Städning: oanvända `ctx`-params
  bort ur `_loadLevel`/`_chestDown`. Verifierat: mata→prutt→glitterregn→fångst med synlig hög,
  errorCount 0.
- 2026-08-05 ✅ **Andra omgången (poleringsrundan, Roligt-fliken).**
  - **P0 ASSETS:** 🍓/🧁/🍪 låg som emoji-`Text` i en vit ruta — exakt det regeln förbjuder.
    Nu ritade (jordgubbe med blast och frön, muffins med pappersform, strössel och körsbär,
    chokladkaka med chips) på en ritad träbricka. `✨`-detaljen på pelletsen är också ritad;
    spelet har inga `Text`-noder kvar.
  - **Matvalet var fortfarande en illusion.** Loggen från 2026-07-01 påstod att maten ger olika
    glitter, men `makePelletView()` tog **inget argument** och ignorerade `_glitterKind` — alla
    tre gav identiska gula prickar. Nu ritas rosa hjärtan / regnbågsströssel (slumpad färg och
    rotation) / guldmynt beroende på maten.
  - **Mätaren låg delvis bakom ljudknappen:** `⭐` på y 116 mot knappens hörnruta som når y 112.
    Stjärnan är nu ritad Graphics på y 166 och tuben börjar på y 196.
  - **Läcka #6 igen, i enhörningens ansikte:** `face.arc(...)` utan föregående `moveTo` ritade
    ett långt streck från containerns origo ut till nosen — tvärs över hela enhörningen. Samma
    fel i Elviras mun. Båda fixade med `moveTo` till bågens startpunkt.
  - **Elvira svävade** ~80 px ovanför marklinjen; hon står nu på marken, och brickan flyttades
    höger så hon inte döljs av den.
  - **Enhörningen** fick chibi-proportioner (mindre kropp, större huvud), kraftigare kontur som
    syns mot godishimlen, magskugga, och manen ligger nu BAKOM huvudet — kulorna bildade förut
    en mur mellan huvud och kropp.
  - **Studsdynorna** är randiga godisbitar med studsknoppar och `pop`:ar när glittret träffar.
  - **Grind:** `npm run check --game enhorning-glitterbajs` 0 fel · `npm run test` grönt ·
    `_idleprobe 30s` → `idleFramsteg: 0`.
