# Nätskott på stan (`natskott-pa-stan`)

> fysik · tap · 2–5 · ✅ marknadskvalitet
> Status: ✅ — byggd 2026-08-08 efter spec-ja 2026-08-07, godkänd av spelkritiker efter åtgärder

## 0. Spec (ur `docs/IDEER.md` §3 — alla beslut tagna av ägaren 2026-08-07)

| | |
|---|---|
| **id** | `natskott-pa-stan` |
| **titleSv** | Nätskott på stan |
| **icon** | 🚙 (verifierad unik — biltvätten har 🚗) |
| **kategori** | fysik → flik Fysik |
| **input** | tap (+ stor växelknapp; inga drag alls) |
| **ålder** | [2, 5] |
| **kärnloop** | bilen rullar (parallax stad→förort); tryck var som helst → nät skjuts dit från Spindel-Zackes arm med whoosh + rekyl <100 ms; klibbnät fäster målet där det är, dragnät drar hem det till baksätet |
| **mål** | uppdragsrundor som roterar ("fånga katten" · "fäst paketen" · "hämta 3 ballonger"); rund-final = hemkomsten → progress.complete() |
| **agens** | VAR man skjuter (tap) × VILKET nät (växelknappen) — båda näten gör alltid något roligt på varje mål, inget felval |
| **variation** | kuliss skiftar stad→förort; målpool roterar; sällsynt wow ~1 på 8: guldpaket som regnar stjärnor |
| **mottagare** | baksätet — hemdragna djur/saker landar där och jublar; monster som vinkar ur krossade rutor |
| **finish** | hemkomsten: bilen stannar vid huset, alla insamlade hoppar ur och firar. Klistermärke |

**Fasta ägarbeslut (P0-ram):**
1. Armen/dräkten är **Spindel-Zackes** (röd/blå, svarta nätlinjer — egen design, inte Marvel).
2. **Fönster krossas på riktigt** — tecknat glitter-splitter + glatt "hoppsan"-ljud, rutan
   **självlagas med skimmer efter ~5 s** (världen förblir aldrig trasig = tak), ibland tittar
   ett litet monster ut ur hålet och vinkar.
3. **Inga människor** — mål är djur, monster, föremål (katter, hundar, fåglar, paket,
   blomkrukor, ballonger).
4. Uppdragsrundor som använder **båda** näten; fri lek mellan uppdragen; aldrig fail.
5. Nätval via **stor växelknapp** (≥96 px) med egna ritade ikoner.
6. Bilen är en **antydd ram** — smal dörrkant/fönsterkarm nertill där armen vilar.
7. Fysik: **matter.js** (`PhysicsWorld`); kroppar följer scrollen, städas utanför bild.
   Klibbnät = kroppen statisk i bakgrundslagret (scrollar med). Dragnät = constraint mot
   kameran; kroppen plockas ur fysiken nära bilen → landar i baksätet.
8. **Motgång med tak:** vindby (max 2 lösa samtidigt) + skata som knycker paket (1 åt gången,
   går att näta).

**Röstrepliker (8 literaler)**
```
"Tryck där du vill skjuta nätet!"          (intro vid mount)
"Byt nät med den stora knappen!"           (om-cue / när man aldrig bytt)
"Fånga katten med dragnätet!"              (uppdrag)
"Fäst paketen så de inte blåser iväg!"     (uppdrag)
"Hämta hem tre ballonger!"                 (uppdrag — tillagd vid bygget: beslut 4
                                            kräver replik per uppdrag, ballongen
                                            saknade en i 7-listan)
"Hoppsan! Där rök en ruta!"                (fönsterkross, ibland)
"Titta, baksätet blir fullt med vänner!"   (delmål)
"Nu är vi hemma — vilket äventyr!"         (finish)
```

## 1. Nuläge (sett som spelare)

Bibliotekets första förstapersonsspel: du sitter i bilen (antydd röd dörrkant nertill),
Spindel-Zackes arm i webb-skjutar-pose guppar nere i bild, och staden rullar förbi i tre
parallaxdjup som gradvis blir förort. Tap var som helst → nät skjuts dit (thwip + rekyl +
ripple i samma frame). Stor växelknapp (byter färg per läge): **klibbnät** (grönt) fäster
målet där det är med nät-overlay; **dragnät** (blått) drar hem det synligt genom luften —
accelererar, bromsar, arkar ner i baksätet där det blir ett guppande huvud och hela sätet
gör en hoppvåg. Mål: katt, hund, fågel (sprattlar loss ur klibbnät efter 2,3 s — för pigg!),
paket, blomkruka i fönsterbleck, ballong, monster. Fönster krossas i glitter-splitter (max 2,
självlagas ~5 s, ibland vinkar ett monster ur hålet). Uppdragspanel ikon-först (ritad
katt/paket/ballong + nätikon + plupp-räknare). Motgång: vindby (streck förankrade vid
paketen, lossning när strecket når fram, max 2 lösa) + skata (1 åt gången, nätas ner).
Guldpaket ~1/8 regnar stjärnor. Efter 3 uppdrag: hemkomsten — parallaxen bromsar över 1,9 s,
gatan töms (pågående hemdrag får landa), hemmets hus glider fram, alla insamlade hoppar ur
sätet en och en med tonstege och firar framför huset; `complete()` efter spelets egen replik.
(Skärmdumpar: `.test-shots/natskott-pa-stan.png` · `natskott-uppdrag.png` · `natskott-hemkomst.png`
· `natskott-monster.png`.)

**Efter poleringen 2026-08-08:** nätet är ett RIKTIGT REP — en verlet-tråd med tyngd som piskar
ut, hänger i kedjekurva och slaknar. Dragnätet vinschar i vevtag så hemfärden blir
ryck–släpp–ryck (mätt: 0,55–0,9 s och 50 px rep-båge, mot HEAD:s raka streck på 0,38 s).
Monstren är en familj på sex arter — `ludd` (enögd taggpäls) · `goblin` (grön, lila toppmössa) ·
`tenta` (tentakler) · `taggis` (bred med ryggkam) · `flaxis` (vingar) · `sten` (kantig, mossig) —
och arten följer med hela vägen till baksätet och paraden. Monstret som lutar sig ut ur en
krossad ruta är numera ett mål: klibbnät håller kvar det i hålet tills det kryper in igen,
dragnät lyfter ut det och tar hem det. Ny motgång: ett monster smyger fram, lyfter ett paket
över huvudet och kutar iväg — nätar du monstret tappar det bytet direkt.

**Efter omgång 2 (samma kväll, ägarens beställning):** växelknappen är borta. Spelet styrs av
**TRE NÄTHÄNDER** — den aktiva är armen mitt i bild, de två andra ligger och väntar nere i
vardera hörnet; tryck på en väntande hand och den kliver fram. Alla tre har samma pose i
**profil** (framifrån-posen lästes som en kanin fyra försök i rad), och det är dräkten som är
språket: röd med svart väv = dragnät, vit med lila+svart = fästnät, svart med rött+vitt =
**nätboll** som flyger, studsar och snärjer in det den träffar (målet faller, lägger sig ner och
får en vit nätboll runt kroppen så bara huvud och fötter sticker ut — och går fortfarande att
dra hem). Baksätet är en riktig bilinteriör med nackstöd, sömmar, bälten och dörrkort, ritad
före dörrkanten. Monstren är **tolv arter**. Husen är sex **butiksfasader** utöver hyreshus och
villa (~1 av 3 hus). Och gatan svarar: **elva gatusaker** står längs trottoaren — brandpost,
brevlåda, dörr, äppelträd, gatulock, blommor, lyktstolpe, trafikljus, parkerad bil, korvstånd,
cykel — var och en med eget liv i vila och **tre olika reaktioner**, en per nättyp.

## 2. Ursprunglig plan & tankeprocess

Första förstapersonsspelet i biblioteket (alla 71 övriga är sidovy/ovanifrån) — resa-känsla
från bilfönstret. Ett enda gest-verb (tap där du vill) men två utfall via lägesknappen ger
äkta agens utan mer motorik. Skiljer sig från de tre spindelspelen: `spindelhjalten` drar
hjälten, `spindel-zacke-svingar` är pendel-timing, `spindelnatet` fångar fallande — här rör
sig världen och nätet påverkar VÄRLDEN. Rullande bakgrund ger variation/progression utan
fail-nivåer. Uppdragen tvingar fram båda näten så växelknappen inte blir dekor.

## 3. Vad gör det lättjefullt / tunt

Efter poleringsomgången 2026-08-08 (repfysik · monsterfamilj · fångbara fönstermonster ·
pakettjuv) återstår:

- Mottagar-scenen tål mer: paraden är fin men huset självt reagerar inte (inga tända fönster,
  ingen som öppnar dörren). Kritikern sa det rakt ut efter omgång 2 också: *det finns en
  mottagare, men den kunde svara tillbaka mer.*
- Kulissen har fortfarande bara ETT väder och en tid på dygnet.
- Uppdragstyperna är tre och rör bara fånga/fästa/hämta — inget uppdrag använder
  fönstermonstren, tjuven, nätbollarna eller de elva gatusakerna.
- Höger hörn-hand ligger mot baksätets täta textur och är mer visuellt konkurrensutsatt än
  vänster (mildrat med en mjuk platta bakom båda händerna, inte helt löst).

## 4. Förbättringar & förhöjningar (plan)

- ~~**[Quick] Hand-posen:** vinkla mellanfingrarna in tydligare så webb-posen läses.~~
  **GJORT 2026-08-08** — vikta fingrar med veck + tumme tvärs över + nätskjutardosa på handleden.
- ~~**[Quick] Dubbelkrediten:** kreditera bara första klibbningen per paket.~~
  **GJORT 2026-08-08** — `rec.credited` sätts vid första klibbningen.
- **[Quick] Hemkomst-huset lever:** dörren öppnas / fönster tänds när paraden står klar.
- **[Medium] Fler kulisser:** natt-läge med lysande fönster, regnväder med paraplyer.
- **[Medium] Uppdrag som använder de NYA systemen:** "snärj in tre saker med nätbollen" ·
  "fånga monstret i fönstret" · "spruta brandposten" — i dag rör alla tre uppdragen bara
  fånga/fästa/hämta, och nätbollen ger ingen uppdragskredit alls.
- **[Medium] Fler tjuvbeteenden:** tjuven springer alltid åt höger i rak linje — den skulle
  kunna gömma sig bakom ett hus eller kasta paketet till en kompis.
- **[Quick] Krossbara skyltfönster:** butikernas stora skyltfönster är dekor, för `_drawWindow`
  fyller rutan med ogenomskinligt glas och skulle radera de ritade varorna. Kräver ett
  genomskinligt läge i `_drawWindow` först.
- **[Quick] `thwip`-klippet:** signaturljudet för VARJE skott är oinspelat och faller tillbaka
  på `whoosh`. Kör sfx-pipen när MOSS är uppe.

## 5. Status / loggar

- 2026-08-10 🎨 **D1: himlen blev en riktig toning i stället för åtta band** (`5267b0e`, v1.124.0).
  Himlen ritades som ÅTTA handrullade band à 60 px (`_buildSky`). Varje band var 1280×62
  ≈ 79 000 px i EN exakt ton, så himlen var spelets största platta fält (**71 095 px**) trots
  att den REDAN var tänkt som en toning — 8 steg är bara för grovt. En cachad `verticalFill`
  ger samma färgresa mjukt, i EN ritinstruktion i stället för åtta.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **71 095 → 57 169 px**, himlen ute
  ur topp-3. Spelets topp är nu markisens rött.

- 2026-08-10 🎨 **D1 (mönster B): husen fick ljus uppifrån** (`a4fb24e`, v1.121.0).
  Hyreshusen delade EN platt ton per väggfärg. `CITY_WALLS[0]` (`0x9aa3b5`) ensam låg på
  **105 360 px** — spelets största fält (`_plattprobe --medbakgrund` mätte `#9ba3b5`, en etta
  ifrån, eftersom biom-tinten ligger ovanpå).
  Detta är D1-nivåns ANDRA klass av platthet: inte en stor vågrät plan utan MÅNGA föremål som
  delar en ton. En fasad är ett föremål belyst uppifrån, så `topLightFill` — och den cachar per
  färg, så alla hus med samma väggton kostar EN gradient, inte en per hus. Både stads- och
  förortshusen fick den, så förorten inte bara ärver toppplatsen.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **105 360 → 71 816 px**, fasaderna
  ute ur topp-3. Spelets topp är nu himlens `#a6d8f2`, som är ett eget mål.

- 2026-08-07: Spec-ja från ägaren. Doc skriven, bygge startat (`/spel`-körning).
- 2026-08-08 ✅ **Byggd och godkänd.** `spelbyggare` byggde hela modulen (~1900 rader,
  matter.js + tre parallaxdjup + två nätlägen + uppdragsrotation + hemkomstparad).
  `spelkritiker` verifierade alla 7 grindpunkter live (dragnätet mätt genom fem skärmdumpar —
  ingen teleport; taken bekräftade genom hookade `_gust`/`_spawnSkata`) och fann en blockerare:
  0 av 8 röstklipp inspelade → `npm run voice` körde (8 klipp). Åtgärdat ur kritiken: gatan
  töms vid hemkomst (strövare stod bredvid paradfigurerna), vindby-strecken förankras vid
  paketen + lossning när strecket når fram (orsak → verkan), sondens döda `seen.gust`-fält
  mäter nu spelets `loosened`-flagga, docens replik-lista kompletterad till 8. Sond
  `scripts/_natprobe.mjs`: full runda 40–43 s, exit mitt i finalen + återinträde, 0 konsolfel;
  `_idleprobe` 0 självframsteg. `npm run check` 0/0.
- 2026-08-08 (kväll) 🔧→✅ **Poleringsomgång på ägarens beställning** — repfysik, elastisk
  indragning, monsterfamilj, fångbara fönstermonster, pakettjuv. `spelkritiker`: **inga
  blockerare**, alla 7 grindpunkter håller.
  - **Repet är en verlet-tråd** (`mkRope`/`stepRope`/`strokeRope`): 12 punkter med tyngd,
    avståndsvillkor i 3 varv, ändarna spända i handen och träffpunkten. Skottet piskar ut
    (sag 0,98), missnätet hänger allt slakare medan det tonar bort, och dragnätets lina
    hänger i kedjekurva. Mätt båge 41–65 px — aldrig ett rakt streck.
  - **Elastisk indragning i vevtag.** Fyra mätrundor med `scripts/_repprobe.mjs` innan den
    satt: (1) jämn indragning = 0 ryck, kroppen sprang ifrån vinschen; (2) snabbare vev =
    repet spänt hela vägen i stället, fortfarande 0 ryck; (3) slumpad vevfas ur `rec.seed`
    gjorde att SAMMA avstånd gav 0 eller 2 ryck olika gånger → egen vevklocka per fångst som
    startar mitt i ett tag; (4) ett vevtag räckte hela vägen hem på nära mål → farttaket
    skalas mot avståndet så taget bara tar ~42 % av sträckan. **Slutmätning: 0,4–1,0 s hemtid,
    1 ryck och 25–40 % slakt-rutor på drag över ~300 px, 0 ryck på mål som redan hänger nära
    handen.** Kodkommentaren säger exakt det och inget mer — kritikern fällde ett tidigare
    utkast som lovade "2–3 ryck".
  - **Monsterfamilj: 6 arter** (`MONSTER_ARTER`) byggd av en `spelbyggare`-agent —
    `ludd` · **`goblin` (grön kropp, lila toppmössa — ägarens beställning)** · `tenta` ·
    `taggis` · `flaxis` · `sten`. Verifierade i riktig Pixi med `scripts/_monsterbild.mjs`
    (`.test-shots/natskott-monster.png`), inte bara i agentens egen stubb. Arten följer nu
    med hela vägen: gata → baksäte → hemkomstparad (`_seatList` bär `{kind, golden, art}`).
    Varje art har egen tonhöjd vid fångst. Flaxis vingar breddades 24 % efter skärmdumpen —
    de stack bara ut 13 px förbi öronen.
  - **Fönstermonstren är mål.** `_windowMonsterAt` + `_catchWindowMonster`: klibbnät = fast i
    hålet, sprattlar, kryper in igen efter 2,5 s; dragnät = lyfts ut och vinschas hem som ny
    vän. Rutan självlagar inte mitt i en fångst (`brokenAt` skjuts fram 3,2 s). Andelen rutor
    med monster höjd 0,34 → 0,55 nu när de går att göra något med.
  - **Pakettjuven** (`_monsterHeist`/`_updateThief`/`_dropLoot`): ett monster smyger fram,
    lyfter ett paket över huvudet och kutar iväg. Nätat monster tappar bytet på fläcken.
    P0-tak: EN tjuv, aldrig samtidigt som skatan, vindbyn pausas medan tjuven är i gång.
    Redan given uppdragskredit kan aldrig försvinna → motgången kan bara sakta ner.
  - **Två [Quick] ur §4 avklarade:** handposen (kritikern fällde första omtaget som ett
    fredstecken — lillfingret pekar nu nästan vinkelrätt ut, plus nätskjutardosa på handleden)
    och dubbelkrediten (`rec.credited`).
  - **Prestanda oförändrad:** 17,97 ms snittruta och fps 55 både före och efter (baslinjen
    sparad i `.test-logs/_natskott-HEAD-baslinje.txt` innan omgången började).
  - **Kontroll:** `npm run check` 0/0 · `npm run test natskott-pa-stan` grön ·
    `npm run test:all` **72/72** · `_natprobe` full runda + exit mitt i finalen, 0 konsolfel ·
    `_idleprobe` 0 självframsteg. Ny replik "Monstret tog ett paket!" har klipp.
- 2026-08-08 (sen kväll) ✅ **Omgång 2 — ägarens sex beställningar.** `spelkritiker`: **inga
  blockerare i spelet**, alla 7 grindpunkter håller. Tre `spelbyggare`-agenter parallellt
  (monsterarter · butiksfasader · gatuobjekt) medan jag byggde styrningen.
  - **Tre händer i stället för växelknapp** (`NAT_TYPER`, `_buildHands`, `_bytHand`). Aktiv hand
    i mitten, två väntande i hörnen. Mätt: handbyte 3/3, träffytor **130×180 skärmpixlar**.
    Kritikern fällde min första kommentar som räknade i LOKALA tal (236×320) — `hitArea` skalas
    av containerns `SIDO_SKALA`, så den verkliga ytan var 118×160 med bara 22 px marginal.
    Sonden mäter numera i skärmpixlar.
  - **Nätbollar** (`_shootBall`/`_updateBalls`/`_snarjIn`): matter-kropp som flyger och studsar
    (mätt: 652 px, **3 studsar**, tak 3 i luften), träffat mål snärjs in och läggs ner.
  - **Handposen i PROFIL.** Framifrån lästes som en kanin fyra försök i rad — en lodrät
    spegelaxel plus två utstickande delar blir alltid ett ansikte. Alla tre kameravinklar finns
    kvar bakom `HAND_VINKEL`; jämförelsebilden är `.test-shots/natskott-handval.png`.
  - **Baksätet** ombyggt och flyttat BAKOM dörrkanten (ritordningen var hela skillnaden — ovanpå
    bilen läste samma former som en soffa parkerad på trottoaren).
  - **12 monsterarter** (+snigel, mätarlarv, svamp, groda, spöke, robot).
  - **6 butiksfasader** (`HUSTYPER`), ~1 av 3 hus, alla med krossbara rutor i övervåningen.
  - **11 gatusaker** (`GATUSAKER` + `PROP_SVAR`): 33 reaktioner, tre per sak. Alla träffytor
    ≥96 px, verifierat live.
  - **Tre buggar sonderna hittade som gröna test aldrig sett:** (1) `_phys.link` skriver
    `view.rotation = body.angle` varje bildruta, så tweenen på det liggande insnärjda målet
    nollades tyst → rotationen ligger nu på `inner`; (2) nätbollen snärjde in det som råkade gå
    förbi framför bilen i födelseögonblicket i stället för det man siktade på → spärr tills
    bollen lämnat handen; (3) butiks- och gatublocket deklarerade **båda** `ritaCykel`
    (dubbeldeklaration hade dödat hela modulen) → omdöpt vid integrationen.
  - **Kritikerns blockerare:** `scripts/_natprobe.mjs` tryckte fortfarande på växelknappens
    borttagna koordinat `(168, 648)` och trodde i 150 s att spelet vägrade byta nät. Sonden
    läser numera handpositionerna ur spelet. Efter fixen: full runda 60 s, hemkomst nådd,
    vindby + skata sedda, exit mitt i firandet, **0 konsolfel**.
  - **Prestanda oförändrad:** 17,97 ms snittruta och fps 56 — exakt samma som baslinjen före
    omgång 1, trots att modulen växt 2 063 → 6 200 rader och nodantalet 104 → 173.
  - **Kontroll:** `npm run check` 0/0 · `npm run test:all` **72/72** · `_bollprobe`,
    `_gatuprobe`, `_repprobe`, `_natprobe`, `_idleprobe` alla gröna.
- 2026-08-09 ✅ **Full bleed [Quick]** (v1.68.0): staden fyller hela telefonskärmen: himmelsband/gatuband/trottoar/biomton ±BLEED, lagersådd+återvinning täcker bleed-zonen (segment revs annars med 160 px kvar i bild), fartstreck över synlig bredd, tryckytan fångar kantremsorna, mål-spawn (default `ctx.view.right+100`, var 1380=synligt) och läkningsgnistor mot `ctx.view`. Testad båda viewports: 0 fel.
