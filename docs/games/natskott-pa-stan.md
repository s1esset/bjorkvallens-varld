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

**Efter poleringen 2026-10-01 (resan in i kvällen):** varje varv är nu en **eftermiddag som
blir kväll** i takt med de tre uppdragen (`kvall.js`): himlen går från blå via solnedgångens
orange och rosa till mörkblå, solen sjunker bakom husen, gatan mörknar (lagren tintas) medan
fönstren **tänds ett efter ett** med gardiner, lampor och krukväxter innanför, skyltfönstren
lyser, och vid hemkomsten står **månskäran och stjärnorna** framme — med ett stjärnfall över
hemmet. När bilen kör ut igen går solen upp. **Varannan runda regnar det** (vädret följer
nivån): grå himmel, regnmoln, streck och plask, en mjuk regnslinga — djuren på trottoaren bär
**paraply**, och ett nät blåser paraplyet ur tassen. Regnet klarnar i skymningen.
**Sex uppdragssorter** i stället för tre: utöver katt/paket/ballong även **"snärj in saker med
nätbollen"**, **"fånga monstret i fönstret"** (ett monster öppnar själv en ruta längre fram,
alla tre händerna fungerar — även nätbollen) och **"tänd lyktorna"** (alltid tredje uppdraget,
i skymningen; en tänd lykta får sken, ljuskägla och en nattfjäril). Panelen visar uppdragets
mål plus den **hand** som behövs, i dess egen dräkt och färg — den gamla nätikonen syftade på
en växelknapp som inte finns längre. Nätbollen träffar nu det man siktar på (passerar
gatusakerna bakom djuren). **Hemmet** är ett eget hus med trädgård, staket, hjärta över
dörren och en lampa vid trappan, och det står **ovanpå** gatan (gatusaker framför dörren går
hem). I dörren väntar **någon**: varannan runda barnets eget knytt eller kompis (Spår F,
`lib/egnafigurer.js`), annars ett av spelets egna monster. Den vinkar, hejar på varje vän som
hoppar ur och jublar — och sedan går vännerna in genom dörren och **tänder lamporna i huset**,
en i taget. Figuren vinkar hej då när bilen kör vidare och följer med huset ut ur bild.
(Skärmdumpar: `.test-shots/_natkvall/` · `.test-shots/_nathem/` · `.test-shots/_natspel/`.)

## 2. Ursprunglig plan & tankeprocess

Första förstapersonsspelet i biblioteket (alla 71 övriga är sidovy/ovanifrån) — resa-känsla
från bilfönstret. Ett enda gest-verb (tap där du vill) men två utfall via lägesknappen ger
äkta agens utan mer motorik. Skiljer sig från de tre spindelspelen: `spindelhjalten` drar
hjälten, `spindel-zacke-svingar` är pendel-timing, `spindelnatet` fångar fallande — här rör
sig världen och nätet påverkar VÄRLDEN. Rullande bakgrund ger variation/progression utan
fail-nivåer. Uppdragen tvingar fram båda näten så växelknappen inte blir dekor.

## 3. Vad gör det lättjefullt / tunt

Efter poleringen 2026-10-01 (kvällen · sex uppdrag · någon i dörren) återstår:

- Tjuven springer alltid åt höger i rak linje (se §4).
- Bara EN gatusak (lyktstolpen) har ett uppdrag; brandposten, brevlådan, äppelträdet … svarar
  på nät men räknas aldrig.
- Höger hörn-hand ligger mot baksätets täta textur och är mer visuellt konkurrensutsatt än
  vänster (mildrat med en mjuk platta bakom båda händerna, inte helt löst).
- På en BRED telefon (952×428) slutar bilens röda dörrkant vid x 0/1280 — bleed-zonerna visar
  gatan under den (sett i `.test-shots/_natkvall-telefon/`, finns också på HEAD).
- Dörrfiguren tar emot men gör inget barnet kan påverka — man kan inte trycka på den.

## 4. Förbättringar & förhöjningar (plan)

- ~~**[Quick] Hand-posen:** vinkla mellanfingrarna in tydligare så webb-posen läses.~~
  **GJORT 2026-08-08** — vikta fingrar med veck + tumme tvärs över + nätskjutardosa på handleden.
- ~~**[Quick] Dubbelkrediten:** kreditera bara första klibbningen per paket.~~
  **GJORT 2026-08-08** — `rec.credited` sätts vid första klibbningen.
- ✅ ~~**[Quick] Hemkomst-huset lever:** dörren öppnas / fönster tänds när paraden står klar.~~
  Klar 2026-09-23 (v1.251.0): dörren är en egen nod som svänger upp (ding-dong) när bilen står
  still, och fönstren tänds med ljus på väggen när sista vännen landat (`_homeWelcome` :5829).
- ✅ ~~**[Medium] Fler kulisser:** natt-läge med lysande fönster, regnväder med paraplyer.~~
  Klar 2026-10-01: eftermiddag → solnedgång → kväll per varv (`kvall.js`), soluppgång vid ny
  runda, regn varannan runda med paraplyer som nätet blåser av. Se §5.
- ✅ ~~**[Medium] Uppdrag som använder de NYA systemen:** "snärj in tre saker med nätbollen" ·
  "fånga monstret i fönstret" · "spruta brandposten".~~ Klar 2026-10-01 med snärj/fönster/
  **lyktor** i stället för brandposten (lyktan hör ihop med kvällen; brandposten står kvar
  som idé nedan). Se §5.
- **[Medium] Ett uppdrag per gatusak till:** "spruta brandposten", "skaka ner äpplen",
  "posta brev" — `_hitProp` returnerar redan en reaktionstagg per nät; ett uppdrag är en rad
  i `UPPDRAG` + ett `_credit(ctx, '<tagg>', …)` i `_hitProp` + panelsymbol + replik.
- **[Quick] Tryck på dörrfiguren:** den i dörren (`_hemFig`) svarar på tryck med `react('hej')`
  — i dag kan barnet bara titta. Kräver en träffyta i hemlagret (ingen finns där i dag).
- **[Quick] Bilens dörrkant över bleed:** `_buildCar` ritar dörrkanten 0..1280; på en bred
  telefon syns gatan under den i kanterna.
- **[Quick] Snärj-panelen** (kritiker 2026-10-01): svagaste panelen utan text — katten i nätet
  är ~45 px och grå mot ballong/katt-panelernas ~65 px (`_natspel/uppdrag-snarj.png`). Samma
  storlek som de andra och orange katt.
- **[Quick] Bygg dörrfiguren i förväg** (kritiker 2026-10-01): EN bildruta på 87,3 ms av 612 i
  fasen `arrive/kkvall` — troligen `byggEgenFigur` när hemmet kommer. Bygg den under
  inbromsningen. Osynligt i skärmdumparna.
- **[Quick] Mittenhanden skymmer** mål som passerar bakom den vid x 420–540 (fanns före
  poleringen) — lägre eller lite genomskinlig i vila.
- **[Medium] Fler tjuvbeteenden:** tjuven springer alltid åt höger i rak linje — den skulle
  kunna gömma sig bakom ett hus eller kasta paketet till en kompis.
- **[Quick] Krossbara skyltfönster:** butikernas stora skyltfönster är dekor, för `_drawWindow`
  fyller rutan med ogenomskinligt glas och skulle radera de ritade varorna. Kräver ett
  genomskinligt läge i `_drawWindow` först.
- ✅ ~~**[Quick] `thwip`-klippet:** signaturljudet för VARJE skott är oinspelat och faller tillbaka
  på `whoosh`. Kör sfx-pipen när MOSS är uppe.~~ Redan byggd (`sample('thwip')` :4830, och
  `thwip.mp3` har legat i sfx-manifestet sedan 2026-06-29) — uppdagat 2026-09-23.

## 5. Status / loggar

- 2026-10-02 ✅ **T3: fast 60 Hz-steg via lib/takt.js — 57 fps-fysiken blir 60 Hz-fysik** (Ä10). `stepRope` stegade nätlinan med `rope.steg(dtF)` (variabelt); nu `rope.uppdatera(dtMS)` — Rep:ens inbyggda Takt, exakt 1 per steg. Bara stegraden rörd. `_linabild` mot HEAD: största lina/korda 1,65× → 1,60×, flykten 1,53× → 1,54× vid ~375 px korda — samma lina.
- 2026-10-01 🌙 **Poleringsomgång: resan in i kvällen, sex uppdrag, någon i dörren.**
  Valt efter att ha spelat två varv och tittat på bilderna (`.test-shots/_natbas/`): staden
  var alltid samma bleka dag, panelen visade växelknappens gamla nätikon (pil/droppe) som inte
  längre fanns i bild, nätbollen gav ingen uppdragskredit, och **hemkomstens finalbild var
  rörig** — ett korvstånd och en lyktstolpe stod mitt framför hemmets dörr, och hemmet såg ut
  som vilket förortshus som helst.
  - **Kvällen** (`src/games/natskott-pa-stan/kvall.js`, ny fil): ett tal `k` (0 eftermiddag ·
    0,5 solnedgång · 1 kväll) följer uppdragen (`_kvallMalNu`: tre uppdrag = 0,84, hemkomsten
    = 1) med en långsam tidsdrift. Fyra himlar tonas över varandra (dag · regn · solnedgång ·
    kväll), alla `verticalFill` cachade per färgpar — noll bakningar vid en andra montering,
    ingen radiell gradient. Mörkret är `Container.tint` på lagren (gata/hus mörknar på
    riktigt, mål och gatusaker bara lite), så det som LYSER ligger i otintade lager:
    `_glowLayer` (fönster, skyltfönster, fönstermonster), `_propLjusLayer` (lyktans
    sken/kägla/glas — lyktan fick en egen ljusbehållare `c._wxLjus`) och `_hemLayer`. Fönstren
    tänds vid var sitt `tandAt` (0,3–0,9; var femte förblir mörk) med ett mycket tyst pling,
    strypt till 0,45 s. Månen är en polygon (`skara()`) — `cut()` gav en full skiva med ett
    mörkt streck.
  - **Regn varannan runda** (`_vader` följer nivån, så det växlar även mellan besök):
    förritade streckmönster som glider (ingen omritning), plask, brusslinga (`audio.loop`,
    stoppas i `destroy` och av GameHost), paraplyer på katt/hund/monster (`ritaParaply`) som
    blåser av vid träff (`_tappaParaply`, flyger i spelets eget lager) och fälls ihop när
    regnet slutar.
  - **Sex uppdrag** (`UPPDRAG`, `_planeraRunda`): förra varvets uppdrag sorteras sist,
    katt+ballong paras aldrig, "tänd lyktorna" bara som tredje (skymning; lyktor kommer tätt
    under det uppdraget och skymningen faller lite fortare). `_credit(handelse, kind)` räknar
    nu `'snarj'` (`_snarjIn`), `'fonster'` (`_catchWindowMonster`, vilket nät som helst — även
    nätbollen, ny) och `'lykta'` (`_hitProp`). Fönstermonstren **öppnar själva** en ruta
    längre fram (`_oppnaFonster`, nytt läge `'open'`, tak 2 som tittar ut). Lyktans huvud fick
    en extra träffcirkel (r 66) — mitthöjden satt 100 px under lyktan, så ett tryck PÅ lyktan
    missade. Hjälpen (24 s) och påminnelsen (6 s) pekar på något uppdraget räknar
    (`_uppdragsMalIBild`) — inte på första bästa katt.
  - **Panelen** visar den hand uppdraget vill ha (`ritaNathand(…, { kort: true })`) i
    handens muddfärg; fria uppdrag (fönster, lyktor) har ingen hand och varm orange kant.
  - **Nätbollen träffar det man siktar på:** den passerar gatusakerna bakom djuren tills den
    studsat två gånger, om man inte siktade PÅ gatusaken (`sikteProp`, samma prioritet som
    nätet).
  - **Hemmet:** eget hus (trädgård, staket, hjärta, trapplampa, rök) i `_hemLayer` ovanpå
    grannhusens ljus (första kvällsbilden visade ett grannfönster och ett fönstermonster rakt
    genom hemmets vägg). Gatusaker som skulle stanna framför hemmet går hem. **Figuren i
    dörren:** `valjEgna(…, 'natskott-pa-stan')` en gång per hemkomst → `byggEgenFigur({ hojd:
    118 })`, annars `_hemReserv()` (ett av spelets tolv monster i dörrstorlek, F5.2). Vinkar,
    hejar på varje landning, jublar efter fanfaren, tar emot vännerna som går in och **tänder
    en lampa per vän** (`_hopIn`, `_tandHem`), vinkar hej då och följer med huset ut
    (`seg.fig`, rivs i `_rivSeg`). Repliken köas bakom hemrepliken, tre varianter + knyttets
    namn som eget klipp.
  - **Två gamla brister på vägen:** nya hus byggdes från det SISTA segmentet i `_mid` — och
    hemmet lades sist fast det stod mitt i bild, så hus ritades ovanpå varandra till höger
    efter varje hemkomst (syns i baslinjens `runda2-start.png`). `_mid` hålls nu sorterat och
    nästa hus räknas från den högsta högerkanten. Stadens fasader var fem nästan grå toner —
    nu sex färger med skuggsida och gesimsband.
  - **MÄTT:**
    - `scripts/_natspel.mjs` (ny; spelar som ett otåligt barn, alla sex uppdragssorterna):
      tre varv i rad, alla sex uppdragen sedda, exit mitt i sista hemkomsten + in + snabba
      tryck + ut, **0 konsolfel**.
    - `scripts/_nathem.mjs` (ny): hemkomsten med reserv / barnets knytt / kompis / mött
      knytt — rätt figur i varje arm (`arEgen`), 3/3 lampor tänds, `levandeFigurer()` = **0**
      efter exit mitt i finalen i alla fyra armarna; i nästa runda följer figuren med huset (1
      levande) och är **0** när huset scrollat ut. 0 konsolfel.
    - `scripts/_natsikte.mjs` (ny, HEAD som kontrollarm via `_natHEAD.mjs`): ett tryck på en
      katt med nätbollen, 32 skott per arm — **HEAD 10–14 träffar (18–22 uppätna av en
      gatusak) → 31 träffar (1 uppäten)**. Blind arm (tryck i himlen ovanför): 1/16 i båda —
      sonden mäter siktet, inte slumpen.
    - `scripts/_natram.mjs` (ny, CPU ×4, tre växelvisa varv mot HEAD): bildrutan **17,57 →
      17,54 ms** (mättad av vsync i alla lägen, även strypt); spelets `_update` + `render()`
      på CPU: HEAD **2,13 ms** · dag **2,16** · kväll **2,23** · regn **2,18**. Kontrollarm
      för mätaren: 12 ms barlast flyttade `_update` 0,6 → 12,5 ms.
    - `scripts/_natkvall.mjs` (ny): bild per kvällsläge och väder, även 952×428.
    - `npm run test natskott-pa-stan` grön (0 fel, inga fynd, 18,07 ms snitt — mättat; HEAD
      samma dag 17,98). `npm run check`: 0 fel, 9–10 varningar = de nya replikerna nedan som
      väntar på klipp (med `--game` räknas de som fel tills de ligger i `voice-phrases.json`).
  - **Nya repliker** (literaler, väntar på `voice-phrases.json` + `npm run voice`):
    "Snärj in tre saker med nätbollen!" · "Snärj in två saker med nätbollen!" ·
    "Fånga monstret som tittar ut genom fönstret!" · "Fånga monstren som tittar ut genom
    fönstren!" · "Det blir mörkt! Tänd lyktorna med nätet!" · "Titta, solen går ner!" ·
    "Titta, nu blir det kväll!" · "Titta, ditt knytt väntar på oss!" · "Titta, din kompis
    väntar på oss!" · "Titta, ett knytt väntar på oss!"
  - ⚠️ `scripts/_natprobe.mjs` känner bara de tre gamla uppdragen och fastnar på de nya —
    använd `_natspel.mjs`.

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): hemkomsthuset lever — dörren
  (egen nod, gångjärn i vänsterkanten) svänger upp med en ding-dong (G5→E5) när bilen stannat,
  och de blekta fönstren tänds med tre ljusringar på väggen när paraden står klar (proxy-tweens
  i `_tws`). Dubbelfirandet: spelet var redan rent — hemrepliken (3,75 s) talar när
  `complete()` kommer vid 3,9 s, så berömmet hoppas över; den inaktuella kommentaren vid
  `complete()` är omskriven. `thwip`-posten var redan byggd.
- 2026-08-11 🕸️ **LYFTPLAN B3: nätlinans egen solver borta** (natt VI N5).
  Spelet bar 59 rader verlet som var `lib/rep.js` i kopia — `stepRope` ÄR `Rep.spann()`
  (båda ändar spikade, vilolängd = avståndet gånger `sag`). Konstanterna skickas in
  (`n: 12`, `grav: 0.5`, `damp: 0.93`, `iter: 3`); lib:ens standardvärden ger en annan lina.
  `strokeRope` är KVAR — den bärande linan plus medlöparen som viker av åt sidan är spelets
  egen bild, och den går inte att uttrycka i en `MeshRope`.
  **MÄTT mot den gamla solvern** (`scripts/_natlinaprobe.mjs`, som bär den gamla koden som
  referens): settlade lägen skiljer **1,2 px** (slak) och **2,4 px** (vinschad); piskans
  sag-kurva ≤ **8,3 px** genom flygningen; spänt läge **7,4 px** (`Rep` håller en spänd lina
  stramare — 0,8 % av linans längd, mindre än dubbla dess ritade bredd).
  **I det levande spelet** (`scripts/_linabild.mjs`, sex bilder med lina i bild): största
  lina/korda **1,75× → 1,70×**, bilden oförändrad.
  ⚠️ **Bytet tog bort en latent sprängning.** Den gamla kopian saknade fartspärr: ett hopp i
  spetsen (en monsterdel som byter läge) plus en tappad bildruta gav **110 450 px lina för en
  korda på 1 300** — en vit klotterblixt över hela skärmen i EN bildruta, utan konsolfel.
  Samma ryck ger nu 1,68× kordan. Den döda `freeTail`-grenen (aldrig anropad) är borta.
  ⚠️ Sonden larmade falskt först: den mätte största avvikelse under ett förlopp där vilolängden
  ändrades varje bildruta och fick 158 px. Solvrarna konvergerar olika fort mot SAMMA form —
  jämför settlade lägen, och mät förloppet med sag-kurvan i stället.
  `npm run check` grön · `npm run test:all` 72/72.

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
