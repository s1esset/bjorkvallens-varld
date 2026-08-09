# LYFTPLAN.md — motor, assets och rendering

Tre spår som lyfter **många spel åt gången** genom delade filer, i stället för ett spel i taget.
Poleringsrundan (`docs/POLERINGSRUNDA.md`) är klar — 72/72 spel är genomgångna individuellt.
Det som återstår är **systemskuld**: verktyg som är byggda men inte används, ritkod som bor i
72 kopior, och Pixi-förmågor appen aldrig rört.

> Uppmätt 2026-08-08 mot `HEAD` (v1.38.0, `08a4de7`) med grep/AST-svep över `src/`, `dist/`
> och `node_modules/pixi.js@8.19.0`. Siffrorna nedan är **räknade, inte uppskattade**.
> Taggar: **[Quick]** timmar · **[Medium]** en pass · **[Deep]** nytt system.

---

## 0. Sammanfattning — vad mätningen visade

| Fynd | Siffra |
|---|---|
| Spelmoduler | 72 |
| Delade libs | 21 filer, 4805 rader |
| `new Graphics()`-anropsställen i spel | 1461 |
| `Sprite`/`Texture` i spel | **0** |
| `FillGradient` i hela appen | **0** |
| `ParticleContainer` i hela appen | **0** |
| `generateTexture` / `RenderTexture` / `cacheAsTexture` | **0** |
| `Mesh` / `MeshRope` / `TilingSprite` / `BitmapText` | **0** |
| `blendMode` | 1 spel (`fyrverkeri`) |
| Filter | 1 fil (`vatska.js` metabollpasset) |
| Lokala rit-funktioner i spelfiler (`rita*`/`make*`/`draw*`) | **205 unika** |
| Exporterade rit-hjälpare i `src/lib` | **8** |
| `PhysicsWorld`-spel | 24 / 72 |
| `Constraint`-spel | 2 |
| `Composites` (mjuka kroppar, kedjor, tyg) | **0** |
| `FluidWorld`-spel | **1** (`saftbaren`) |
| Spel med kamera/parallax | 5 (alla handrullade) |

---

## 1. Spår A — knyt ihop det som redan finns

### A1. `p2-es` är en död dependency **[Quick]** — ✅ BORTTAGEN 2026-08-09 (v1.49.0)

Noll importer i `src/` och `scripts/`. Ändå stod den som låst teknikval i `CLAUDE.md` och
skill `fysik-spel` — dokumenten lovade fyra motorer, appen körde två (matter + three).

**Beslutet:** beroendet är **borttaget** (`npm uninstall p2-es`) och påståendet struket.
Alternativet — att bygga ett spel enbart för att rättfärdiga en dependency — är att låta
verktygslådan bestämma spellistan. Skill `fysik-spel` bär nu vägen tillbaka: matters egen
`Constraint` först, egen verlet-lösare i `src/lib/` sedan, och p2-es återinförs bara **i samma
commit som det spel som importerar den**.

⚠️ **Docen var inaktuell på en punkt** (samma fälla som CLAUDE.md varnar för): `ARCHITECTURE.md`
nämnde aldrig p2-es. Den hade redan bara matter + three i sin teknikvalstabell. Kopiera inte
raden ovan rakt av nästa gång — greppa först.

### A2. Ritkoden bor i 205 kopior **[Deep]** — 🟨 PÅBÖRJAD 2026-08-09

203 unika lokala rit-funktioner i spelfilerna (218 definitioner) mot 8 exporterade i `src/lib`.
Mätbara dubbletter: `makeBall` ×5 · `makeStar` ×3 · `makeBasket` ×3 · `makeElvira` ×2 (en i
`figurer.js` **och** en lokal) · `makeKitten`/`makeKid`/`makeCrown`/`makeBumper`/`makeThing`/
`makeUnicorn` ×2. Bara 4 spel har brutit ut assets till egen modul (`ingredienser.js` ×2,
`food.js`, `overraskningar.js`).

**Grepp:** utöka `artikoner.js`-mönstret (parametrisk mall + tabell) till fler domäner och
flytta upp dubbletterna. Inte allt — en unik figur hör hemma i sitt spel.

✅ **`src/lib/foremal.js` byggd (v1.47.0):** `makeBoll` (5 spel) + `makeStjarna` (3 spel), båda
med `form.js`-fyllningar, alltså A2 och C1.3 i samma ändring. 10 definitioner blev 2.

⚠️ **Läsningen ändrade listan — kopiera den inte rakt av.** Docen antog att korgar och kronor
"ska finnas en gång". Koden sa något annat:

| Föremål | Utfall efter läsning |
|---|---|
| `makeBall` ×5 | **Samma föremål** — cirkel + platt fyllning + handritad vit glansellips. Delad. |
| `makeStar` ×3 | **Samma föremål** — 10-punkts poly, samma gula, samma mörka kontur, samma glansprick. Delad. |
| `makeBasket` ×3 | **Tre olika korgar** (proportioner, flätmönster, handtag, färger). Att slå ihop dem hade tagit bort variation, inte en dubblett. Kvar i sina spel, med `form.js`-fyllning på plats. |
| `makeBumper` ×2 | **Två olika** (flipperns ring med motiv vs. spindelhjältens tvåringade stjärnbumper). Samma sak. |
| `makeCrown` ×2 | Nästan identiska, men olika proportioner — en delad version hade krävt sex parametrar för att bevara båda. Fick gradienten på plats i stället. |

En dubblett i en grep-räkning är inte samma sak som en dubblett i bilden. Läs alla kopiorna
innan du slår ihop dem.

### A3. Karaktärssystemet är ett ansikte, inte en karaktär **[Medium]** — ✅ BYGGT 2026-08-09 (v1.55.0)

Bobo förekommer i **29** spel, Elvira i 12, Zacke i 11. `makeMascot()` är ett statiskt huvud
utan uttrycks-API, så alla 29 spel handrullar sina reaktioner. `figurer.js` har fyra figurer.

Det här **är** det app-breda mönstret "ingen mottagare/publik" i `docs/games/README.md` — det
är inte ett per-spel-problem, det är en saknad delad rigg.

✅ **`src/lib/karaktarer.js` byggd.** `makeKaraktar({ r, kropp, palett, idle })` ger en rigg där
huvud · ögon · pupiller · bryn · mun · armar är EGNA noder, så ett humörbyte är en tween på
några transformer i stället för `clear()` + ny geometri. API: `setMood(namn)` (sju humör:
`glad · stolt · forvanad · nyfiken · hungrig · ledsen · somnig`) · `react(handelse)`
(`jubel · hoppsan · nyfiken · hej · nam` — kort reaktion som ÅTERGÅR till humöret) ·
`look(x, y)` (pupillerna följer det barnet drar) · `blink()` · `idle(på/av)` (andning +
slumpade blinkningar) · `destroy()`.

Humören är **ren data** i `MOODS`, inte ritgrenar: en ny min är fem tal i en tabell.

**Två fel som bara BILDEN hittade — tabellen såg rimlig ut i båda fallen:**

1. **Brynens tecken avgör om figuren ler eller läxar upp.** Ett negativt `brynLut` sänker den
   inre änden = den arga brynryggen. Första utkastet hade `ledsen: −0.3` och `forvanad: −0.22`,
   och i skärmdumpen stod Bobo och såg **arg** ut — alltså en tillsägelse, precis det P0
   MOTGÅNG förbjuder.
2. **Spegla aldrig ett bryn med `scale.x = −1`.** Ett negativt x-skalvärde vänder också
   rotationens visuella riktning, så samma `rotation` gav ett ledset bryn på ena sidan och ett
   argt på den andra. Formen är en symmetrisk rak linje: spegla med rotationens TECKEN.

Dessutom: `sphereFill` med standardvärden (`dark 0.32`) tog grädden ner i grått och gjorde
huvudet till ett silverägg. Volym ja, färgbyte nej — `{ dark: 0.1, highlight: 0.2 }`.

**Verktyg: `scripts/_karaktarbild.mjs`** ritar alla humör i ett rutnät, kan frysa mitt i en
reaktion (`--reaktion jubel`) och river alla riggar i samma körning för att bevisa
exit-säkerheten. ⚠️ Notera: en **bar modulspecifier** (`import('pixi.js')`) går inte att använda
i en sådan sond — Vite resolvar bara i modulgrafen, inte i webbläsarens `import()`. Importera
projektets egna sökvägar (`/src/lib/...`).

**Första kund: `harma-melodin`** — tre handritade Graphics och en egen `_setMood`/`_drawMouth`
ersatta av riggen. Koden blev **kortare**, och Bobo jublar nu när hela sekvensen sitter i
stället för att bara byta mun. `kropp: false` med flit: plattorna nedtill spänner y 310–590 och
en hel kropp hade lagt sig över dem — riggen ska ersätta det som fanns, inte smyga in en
layoutändring.

**Utrullning omgång 1 (2026-08-09, v1.63.0): `trollblandning` · `gungan` · `bowling`.**
Tre olika sorters kund, med flit: ett spel som bara vill byta HUVUD på en egen figur
(trollkarlens mantel, armar och stav står kvar, `kropp: false`), ett som byter hel figur
(`makeBobo` → riggen, samma origo och samma 2,36·r till fötterna, alltså oförändrad
placering) och ett som byter huvud **plus** en handritad kropp som var en kopia av
`figurer.js:makeBoboBody` med egna tal.

**Tre saker utrullningen mätte fram — ingen av dem syntes i lib-koden:**

1. **`destroy()` dödade aldrig pupillerna.** Nodlistan hade ögon, mun, huvud, bål, armar
   och bryn, men inte `pupiller` — och `look()` är det enda som rör dem. Så länge ingen kund
   använde `look()` fanns hålet utan att synas. Ett spel som följer ett RÖRLIGT mål anropar
   `look()` varje bildruta: 120 nya tweens i sekunden på två Graphics, `_track` slängde de
   äldsta ur `_tw`, och sedan skrev en tween `.y` på en riven Graphics varje bildruta efter
   exit. Uppmätt i `gungan`: **7 pageerror + 1 `tween-lacka` → 0.** `look()` hoppar nu också
   över rörelser under 0,3 px och tweenar med `overwrite`.
2. **En armgest måste svinga UTÅT, aldrig uppåt.** Tassen står i vila på `sida·1.04r` medan
   huvudet når `0.97r` på den höjden — marginalen är 0,07·r. En rotation uppåt (redan vid
   0,62 rad) drar in tassen bakom huvudsilhuetten och Bobo står med **armarna borta**. Både
   `−sida` och `+sida` ser lika rimliga ut i koden; bara `_karaktarbild.mjs` skiljer dem.
3. **Ny reaktion `heja`** (halva `jubel`s utslag, inget hopp). En upprepad handling — en knuff
   i gungan, ett kast i bowlingen — som firas med `jubel` gör firandet till bakgrundsljud, och
   då finns ingenting kvar som markerar att målet faktiskt nåddes.

Och en ordningsregel för spel som redan tweenar sin maskot: `gsap.killTweensOf(bobo)` träffar
även riggens egen hopp-tween på `view.y`, så en `react()` **före** rensningen dödas direkt.
Skalan är dessutom upptagen av riggens andning — ett `pop()` på samma nod blir hackigt.

**Utrullning omgång 2 (v1.64.0): `studsmatta` · `poppa-ballonger` · `glasstornet` ·
`klambubblor`.** Omgången handlade mindre om att byta figur och mer om **vem som äger vilken
egenskap** när riggen flyttar in i ett spel som redan animerar sin maskot:

| Egenskap | Ägare efter bytet |
|---|---|
| `view.scale` | ALLTID riggens andning. Ett `pop()` på samma nod blir hackigt — flytta det till den yttre containern eller byt mot en `react()`. |
| `view.y` | Den som har den STÖRSTA gesten. `klambubblor` har fyra hopp på 40 px och behöll dem; då blir firandet `setMood('stolt')`, inte `react('jubel')`, som hade tweenat samma `y`. |
| `rotation` | Fri — riggen rör den aldrig utom via `huvud`. `bowling` lutar hela figuren efter klotet. |

Och en placeringsregel: `makeBobo`/riggen har samma origo (huvudets centrum) och samma 2,36·r
till skuggan, så de byts rakt av. En **handritad** kropp har det inte — `glasstornet`s låg på
158 px, alltså 26 px längre ner, och origo måste flyttas lika mycket för att fötterna ska stå
kvar på golvlinjen. Räkna den skillnaden, gissa den inte.

**Utrullning omgång 3 (v1.65.0): `blixt-och-dunder` · `fallskarmen` · `saftbaren` ·
`tarta-i-ansiktet`.** Två av de fyra ursprungligen påtänkta ströks efter läsning — de är
**dokumenterade undantag**, inte glömska:

| Spel | Varför riggen inte hör hemma |
|---|---|
| `gravmaskinen` | `makeMascot(11)`. Vid r 11 är ögonen 1,7 px och brynen 0,8 px breda — en min kan inte läsas, och riggen hade lagt en andnings-tween per bildruta på något osynligt. |
| `bajs-och-kiss` | Använder en **lokal** `makeMascotHead(38)` för en gäst som snurrar fritt i virveln. Kommentaren i koden säger rakt ut varför den ritas lokalt; en rigg med vilo-andning på ett föremål som spolas ner är fel verktyg. |

**Det som omgången lade till kunskapsmässigt:**

1. **En YTTRE container är svaret när spelet speglar figuren.** `fallskarmen` sätter
   `scale.x = ±1` för att vända Bobo mot mattan. Riggens andning tweenar `view.scale` till
   0,988 — den hade **raderat spegelvändningen** och vänt honom åt fel håll, utöver att hacka.
   Med riggen i en egen container äger spelet spegling + rotation och riggen sin egen skala.
   Bonus: `toLocal` går genom `scale.x`, så `look()` pekar rätt utan en enda specialrad.
2. **Häng reaktionen på mätningen, inte på en timer.** `saftbaren` tuggar (`nam`) bara när
   `drain()` faktiskt returnerade partiklar — munnen rör sig när det rinner i den, inte när
   klockan säger till.

⬜ Kvar (räknat på faktiska importer, inte på ordet i en kommentar — `grep -l 'makeMascot }|makeBobo }'`):
**11 spel** importerar fortfarande det statiska huvudet — `domino` · `flipperspel` ·
`gravmaskinen` · `hamburgerbygget` · `knuffa-tornet` · `kulbana` · `lagerelden` ·
`pizzabageriet` · `sapbubblor` · `vippbradan` · `zackes-biltvatt`. Med `gravmaskinen` struket
ovan är **10** verkliga kandidater. `bajs-och-kiss` står inte i listan alls: den ritar sitt
huvud lokalt. Dessutom de fyra med egen mimik (`kittla-figuren` · `mata-monstret` ·
`peka-pa-kroppen` · `pruttbad`).

### A4. Delade libs som inte nått ut **[Quick]** per spel

| Lib | Används av | Bör användas av |
|---|--:|---|
| `scene.js` | 57 | +15 (se A5) |
| `mascot.js` | 17 | de 29 som har Bobo |
| `artikoner.js` | 13 | fler pussel-/lära-spel |
| `vatska.js` | **1** | se B1 |
| `three3d.js` | **1** | se C9 |

### A5. Femton spel ritar egen bakgrund **[Quick]**

`enkelt-pussel` · `folj-sparet` · `fyrverkeri` · `glittergrottan` · `hamburgerbygget` ·
`harma-melodin` · `kla-efter-vadret` · `plantera-fron` · `rulla-bollen-hem` · `saftbaren` ·
`siffertaget` · `spara-linjen` · `tarta-i-ansiktet` · `vad-forsvann` · `vart-tog-det-vagen`

Flera har goda skäl (inomhusmiljö, 3D-backdrop). Men de som bara har en platt färg ska ärva
`createScene` — särskilt efter C7 nedan, som gör den mycket rikare.

---

## 2. Spår B — fysik, kollisioner, kroppar och egenskaper

### B1. SPH-vätskan är byggd och oanvänd **[Medium]** per spel — ✅ TRE SPEL 2026-08-09

`src/lib/vatska.js` är 739 rader: en double-density-relaxation-solver med spatial hash, sex
materialförval (`vatten` · `saft` · `gegga` · `honung` · `choklad` · `tval`) och metaboll-
rendering. Vid mätningen använde **ett** spel den; nu tre.

| Spel | Fejkar vätska idag | Förval | Status |
|---|---|---|---|
| `saftbaren` | — (var enda kunden) | `saft` | ✅ sedan tidigare |
| `vattenvagen` | headern sa rakt ut "droppar längs en beräknad väg" | `vatten` | ✅ v1.45.0 |
| `golvet-ar-lava` | bubblande lavaflod, ritad | `choklad` | ✅ v1.46.0 |
| `zackes-biltvatt` | skum + spolning som partikelfläckar | `tval` | ⬜ |
| `tvatta-djuret` | skum-fläckar, regndroppar | `tval` | ⬜ |
| `pruttbad` | badvatten + skumlinje | `tval` | ⬜ |
| `trollblandning` | kitteln pyser, inget rinner | `gegga` | ⬜ |
| `plask-i-vattnet` | plask-ringar | `vatten` | ⬜ |
| `pizzabageriet` | sås | `saft` | ⬜ |

**Tre lärdomar ur de två första bytena — läs dem före nästa spel:**

1. **Simulera bara där vätskan SYNS.** `vattenvagen` simulerar kranens stråle, läckan och
   muggen; inuti de ogenomskinliga rören (26 px kanal) simuleras ingenting — vattnet sugs in
   i mynningen och kommer ut i andra änden efter en restid. `golvet-ar-lava` simulerar bara
   flodens översta 46 px; djupet är samma ritade berg som förut. Att simulera hela volymen
   hade kostat allt och synts noll.
2. **En stråle är inte ett glas.** Saftbarens värden (takt 145 ms, tröskel 0.42, blur 9) är
   satta för fyllda kärl. En fallande droppe rör sig ~480 px/s, så med den takten hamnar
   dropparna **70 px isär** mot en 55 px klick — de överlappar aldrig, når aldrig
   metaboll-tröskeln och ritas i KANTfärgen (nästan vit). Uppmätt: 49 partiklar, noll synliga
   pixlar, noll konsolfel. Räkna takten ur fallhastigheten och sänk tröskeln för strålar.
3. **Vätska är volym — och volym flyttar sig.** Fyra stenar i lavan trängde undan så mycket
   att ytan steg 35 px och nådde klippkanten. Fyllnadsmängden måste skalas med kärlets bredd,
   och undanträngning måste mätas, inte antas.

4. **Ett flaky-larm är inte en regression förrän HEAD mätts lika länge.** Lavan gav först
   ändringen 2 flakiga rundor av 8 mot HEAD 0 — samma signatur som `generateTexture`-fällan.
   I tredje körningen flakade **HEAD självt** med `golvet-ar-lava:tom-scen`. Slutläge över 11
   växelvisa rundor: HEAD 1, ändringen 2, alltså inte skiljbart. Kör fler rundor innan du
   dömer, och kontrollera mekanismen i Pixis källa innan du skriver ner den: påståendet
   "`Filter.from` kompilerar per anrop" var fel — `GlProgram.from` cachar per källkod.

Verktyg: **`scripts/_vatskeprobe.mjs`** (antal · ytans höjd · målade pixlar mot vätskans egen
färg · FPS med CPU-strypning · exit + återinträde). Den hittar vätskan på FORM, inte på
fältnamn, så den fungerar på vilket spel som helst.

⚠️ Kostnaden ligger i metaboll-filtret (halv upplösning). Uppmätt vid CPU 6× strypt:
**56,7–56,9 FPS** i båda spelen, oförändrat mot tom scen — men mät på plattan innan fler än
två spel till byter, och lägg ett partikeltak per spel. Två billiga knappar finns nu i
`FluidView`: **`area`** (kör filtret bara över den yta vätskan kan nå — lavan blev 9× färre
pixlar) och ett **delat filter per sida** i stället för ett per montering.

### B2. Mjuka kroppar: noll **[Deep]** — ✅ BYGGT 2026-08-09 (v1.57.0)

`Composites.softBody` / partikelnät med avståndsvillkor finns i matter och används inte alls.

| Spel | Varför mjuk kropp hör hemma |
|---|---|
| `lagerelden` | **marshmallowen som sjunker ihop när den blir varm ÄR spelets mekanik** — idag byter den bara färg |
| `sapbubblor` | bubblor ska deformeras av vind och tryck, inte vara stela cirklar |
| `glasstornet` | kulorna ska wobbla när tornet svajar |
| `mata-monstret` | tuggbar mat |
| `hamburgerbygget` | brödet ska ge efter under stapeln |
| `pruttbad` | bubblor som pressas ihop mot ytan innan de poppar |

✅ **`src/lib/mjukkropp.js` byggd.** En ring av punkter + en mittpunkt, hållna av
avståndsvillkor (kant + ekrar) och ett **tryckvillkor**. `mjukhet(0..1)` · `fast/losa` ·
`knuff(x, y, kraft, radie)` · `flytta` · `fyllnad()` · `path(g)` (sluten mjuk kurva) ·
`steg(dtF)` · `destroy()`. Rena tal, ingen Pixi i solvern.

**Tre saker mätningen tvingade fram — alla tre var osynliga i koden:**

1. **Trycket måste verka längs KANTENS NORMALER, inte längs radien.** En radiell puff är
   inget tryck utan en *formåterställare*: den drar polygonen mot en cirkel och håller emot
   precis den tillplattning mjukheten ska ge. Uppmätt: en helt mjuk kropp blev **38,4 px bred
   mot den hårdas 39,0** — alltså smalare, tvärtemot vad en varm marshmallow gör.
2. **Både omkrets och area måste släppa.** En sluten kurva med fast omkrets OCH fast area är
   i praktiken stel (isoperimetri). Med bara sänkt styvhet sjönk en "helt mjuk" kropp
   **0,7 px** — mätbart, men osynligt, och det är synligheten som ÄR mekaniken. Nu tappar en
   varm kropp också en del av sitt inre tryck. Uppmätt efter: ovansidan plattas **9 px**,
   bredden växer **6 px**, massan lägger sig **8 px under pinnen**.
3. **En spikad mittpunkt fick inte räknas om till tyngdpunkten.** `steg()` satte alltid mitten
   till ringens centroid, vilket gjorde `fast(m.mitt, …)` till en tyst nullhandling — och en
   pinne som går rakt IGENOM marshmallowen är just en fast mittpunkt.

⚠️ **Sonden hade fel två gånger innan koden hade det.** Först mätte den en kropp som bara var
spikad i toppen och underkände att den blev *högre* — men ett hängande mjukt föremål ska töjas
ut; fallet var fel, inte fysiken. Sedan mätte den underkantens absoluta läge, vilket blandar
ihop hoptryckningen (drar upp) med droppet (drar ner) och därför inte säger något om
gravitationen alls. Det entydiga måttet är **var massan ligger i förhållande till pinnen**.

**Första kund: `lagerelden`** — marshmallowen var en `roundRect` som bytte färg och växte 14 %.
Nu sjunker sockret ihop runt pinnen medan det rostas. Färgtrappan och rostfläckarna är
oförändrade; det enda som bytts är att formen kommer från fysiken. Korv, majs och äpple är
fasta saker och ritas som förut.

**Verktyg: `scripts/_mjukprobe.mjs`** (Node) — hård form hålls · varm kropp plattas/breder ut
sig/massan sjunker · knuff syns direkt och studsar tillbaka · fästpunkt · förflyttning · exit.

✅ **Andra kund: `glasstornet` (v1.82.0, spår 3 runda P1).** Varje landad glasskula är en mjuk
kropp som VOBBLAR — och vobbeln är fysik, inte en tween: ringen släpar efter matter-kroppens
egen fartändring, så en kula som landar hårt skakar mer än en som sätter sig mjukt, och en
vindstöt eller en ny kula ovanpå syns i hela tornet. Uppmätt (`node scripts/_vobbelprobe.mjs`):
**4,57 px utslag** på en 44 px radie vid landning, tillbaka till **0,00 px** i vila, fyllnaden
kvar på 1,00 (ingen kula tappar volym), och ringrörelsen faller under rittröskeln så en kula
som lagt sig kostar **noll** per bildruta.

**Tre saker som gjorde det till en riktig integration och inte en effekt ovanpå:**

1. **En kropp, alla lager.** En glasskula är skugga + färgklot (eller fem regnbågsband) +
   dekor. Ritas de var för sig glider de isär i vobbeln. `path(g, skala)` (ny) krymper samma
   kurva mot mittpunkten, så alla silhuett-lager deformeras av EN kropp. Dekor och glansprick
   står medvetet utanför — de sitter PÅ kulan, de är inte kulans kant.
2. **Vilo-formen måste ärvas, annars syns bytet.** Kopan är vågig (`1 + 0,05·sin(5θ)`), och
   en mjuk kropp byggd som ellips hade poppat till en slät cirkel i samma sekund som barnet
   släppte. Ny konstruktorparameter `form(vinkel)` bygger vilo-ringen ur spelets egen
   silhuett — rest-längderna mäts ur den byggda formen, så vågen går inte att knuffa dit
   efteråt utan att kroppen "glömmer" hur den ska se ut.
3. **Trögheten måste räknas i kulans EGNA koordinater.** Vyn roterar med matter-kroppen, så
   en vobbel i världskoordinater pekar åt fel håll så fort kulan rullat ett kvarts varv.
   Ny `skjut(dx, dy)` i libbet: förskjuter allt som inte är spikat, vilket verlet läser som
   fart — alltså eftersläpning utan att någon behöver leta reda på var träffen skedde.

**Kostnaden är mätt, inte antagen:** växelvis mot HEAD, tre körningar per arm —
17,52 / 17,48 / 17,42 ms per bildruta med vobbeln mot **17,48 / 17,53 / 17,38** utan. Inte
skiljbart. (En `fysik-svalt`-varning sågs i 1 av 4 körningar med ändringen och 0 av 3 på HEAD,
men bildrutetiderna är identiska på tiondelen — det är en maskinhicka, inte en kostnad.)

⬜ Kvar: `sapbubblor` · `mata-monstret` · `hamburgerbygget` · `pruttbad`.

### B3. Rep/kedja är omskrivet fyra gånger **[Medium]** — ✅ SOLVERN BYGGD 2026-08-09 (v1.56.0)

| Var | Implementation |
|---|---|
| `zackes-biltvatt` | verlet-kedja, 20 punkter, avståndsvillkor + gravitation + dämpning |
| `knuffa-tornet` | matter `Constraint` (pendel) |
| `vippbradan` | matter `Constraint` |
| `spindel-zacke-svingar` | handrullad pendel-integrator |
| `natskott-pa-stan` | egen repfysik |
| `spindelnatet` | nät av linjer |

✅ **`src/lib/rep.js` byggd.** `class Rep` = Position Based Dynamics i miniatyr, med båda de
lägen spelen faktiskt behövde: **fast segmentlängd** (slang/kedja med egen längd) och **spänd
mellan två punkter** (`spann(ax, ay, bx, by, sag)` — `sag < 1` spänt, `> 1` slakt). Dessutom
`fast/losa` (spika vilken punkt som helst), `dra` (grepp som följer fingret), `tyngd` (tungt
munstycke som dinglar), `rackvidd` (mjukt stopp), golv med friktion och fartspärr.

**Det som gjorde modulen KORREKT och inte bara delad — mätt, inte antaget:**

Jakobsen-relaxation fortplantar sig bara `iter` länkar per bildruta. En 20-punkterskedja med
vilolängd 760 px som rycktes i blev **2870 px lång** — den tänjdes som ett gummiband. Ett tak
på hur långt `dra()` får flytta en punkt per bildruta tog den till 926 px: bättre, fortfarande
fel. Lösningen är ett **strikt längdpass i två riktningar (FABRIK)** efter relaxationen: bakåt
från änden, sedan framåt från fästpunkten. Ett ENKELRIKTAT svep räckte inte — det bevarar den
hängande formen och ångrar i praktiken draget (änden nådde bara 546 av 760 px, alltså tog
slangen stopp långt innan den var utsträckt). Med båda passen: **756 px av 760 möjliga**, och
kedjan kan aldrig tänjas hur hårt man än drar.

**Första kund: `zackes-biltvatt`** — 59 rader egen verlet-kedja borta, samma tal (punkter,
segment, gravitation, dämpning, golv, fartspärr) så slangen beter sig som förut. Verifierat
mot skärmdump före/efter: hosans form och munstyckets läge oförändrade.

**Verktyg: `scripts/_repprobe.mjs`** (Node, ingen webbläsare) — vilolängd, fästpunkt som står
still under ryck, mjukt stopp, golv, spänd/slak lina, tung ände som dinglar, exit.

⬜ Kvar: `natskott-pa-stan` (`mkRope`/`stepRope`/`strokeRope`), `spindel-zacke-svingar`,
`spindelnatet`. Och **`MeshRope` (C5) är INTE byggd** — den kräver en textur, och
`generateTexture()` är den kända destabiliseraren (se C2/C3). Vägen är Canvas2D-bakning som i
`partiklar.js`; tills dess ritar `ritaRep()` repet som ett material med tre drag (mörk botten,
bärande lina, dager) i stället för ett enfärgat streck.

### B4. Material är fyra tal, inte material **[Medium]** — ✅ BYGGT 2026-08-09 (v1.52.0)

`MATERIALS` i `physics.js` har fem förval (`bouncy`/`normal`/`heavy`/`light`/`sticky`), var och
en `{restitution, friction, frictionAir, density}`. Ett material bär idag **ingen** ljudsignatur,
**ingen** partikelsignatur och **ingen** deformation.

**Grepp:** utöka posten till `{fysik, ljud, traff, spar}`:

```
tra:    { fysik: {...}, ljud: 'knack',  traff: 'flisor',  spar: 0x8a5a3b }
metall: { fysik: {...}, ljud: 'klang',  traff: 'gnistor', spar: 0xc3ccd4 }
sten:   { fysik: {...}, ljud: 'duns',   traff: 'damm',    spar: 0x9aa4b0 }
gummi:  { fysik: {...}, ljud: 'studs',  traff: 'inget',   spar: null }
glas:   { fysik: {...}, ljud: 'klirr',  traff: 'skarvor', spar: 0xbfe6ff }
```

Det är detta ägaren menar med "element och egenskaper": material ska **låta** och **lämna spår**,
inte bara studsa olika. Kopplar direkt till B5 och C3.

✅ **Byggt som `MATERIAL` + `mat(namn, extra)` i `physics.js`** — fem poster (`tra` · `metall` ·
`sten` · `gummi` · `glas`), var och en `{ fysik, ton, typ, dur, glid, traff }`.

Tre beslut som mätningen tvingade fram:

1. **Rösten är syntes, inte klipp.** Repot har inga klipp som heter `knack`/`klang`/`duns`/
   `studs`/`klirr` (tillgängliga namn: `boing · celebrate · correct · djur_* · fart · flip ·
   kristall_klirr · magi · match · plopp · pling · pop · reveal · soft · tap · thwip · whoosh`).
   Och ett klipp har EN dynamik — det kan inte bli mjukare när träffen är mjuk, vilket är hela
   poängen med B5. Samma skäl som CLAUDE.md ger för att `correct`/`match`/`pling` är stämda.
2. **Signaturen ligger under EN nyckel (`mat`) på kroppen.** matter kopierar okända options rakt
   på kroppen, så `ljud`/`spar` hade fungerat — men matter äger namnrymden. Samma fälla som
   Pixis `_cx`/`_sx`, en våning ned.
3. **`mat()` lägger spelets egna tal SIST.** `mat('tra', { friction: 0.4 })` behåller 0.4.
   Ett material får aldrig tuna om ett fungerande spel bakvägen — `domino` och `bygg-tornet`
   är handtrimmade och skulle ha ändrat beteende av en rakt påtvingad materialtabell.

`MATERIALS` (bouncy/normal/heavy/light/sticky) står kvar orörd — 9 spel sprider den, och den
beskriver *rörelse*, inte *ämne*. De två tabellerna svarar på olika frågor.

**Tredje kund: `knuffa-tornet` (v1.80.0, spår 3 runda P1).** Spelet hade redan fyra klosstyper
med skilda fysiktal (`KINDS`: sten · trä · gummi · glas) och en kraftskalad smäll — men hela
tornet lät som EN träklots oavsett vad kulan träffade, och det är just skillnaden mellan
typerna som ska göra tyngd- och repvalet begripligt. Nu bär varje kloss en materialnyckel och
talar med dess röst: **120 · 240 · 320 · 760 · 1180 Hz** (sten · trä · gummi · krona i metall ·
glas), med tonhöjd OCH volym stigande med slagfarten.

⚠️ **`mat()` sprider materialets fysik — även de tal spelet aldrig satt.** Det är hela
skillnaden mellan "ger en röst" och "tunar om ett handtrimmat spel bakvägen". `knuffa-tornet`
satte aldrig `frictionAir`, alltså gällde matters standard 0,01 — men materialtabellen bär ett
eget värde per ämne (trä 0,012 · metall 0,006 · glas 0,005), och de hade tyst tagit över utan
att ett enda test blivit rött. Lösningen är att skriva ut även de tal man vill BEHÅLLA. Regeln
generellt: lista alla fyra fysikfälten i extras när ett fungerande spel adopterar ett material.
`scripts/_tornprobe.mjs` vaktar båda halvorna (rätt röst per typ · noll fysikavvikelser).

⚠️ **Docens §4 var inaktuell igen** (tredje gången, precis som CLAUDE.md varnar för): den
beställde både "special-klossar som gör tyngd/rep meningsfullt [Deep]" och "ge tillbaka en
snäll smäll [Quick]" — båda var redan byggda i en senare poleringsrunda, och kodhuvudet
påstod dessutom fortfarande att "krock-ljud är borttagna, slag är tysta". Läs koden först.

### B5. Kollisionshändelser driver nästan ingen spelmekanik **[Quick]** per spel — ✅ BYGGT 2026-08-09 (v1.52.0)

`PhysicsWorld.onCollision()` fanns; de flesta spel pollade positioner i stället. Inget av de 23
fysikspelen mappade **anslagshastighet → volym och tonhöjd**.

✅ **`onImpact(handler, { minSpeed, hardSpeed, maxPerFrame })`** ger `{ a, b, speed, styrka, x, y,
material, traff }` — kontaktpunkten kommer ur matters `supports`, `styrka` är redan klämd till
0–1. **`impactAudio(audio, opts)`** är enradaren: hårdare anslag blir högre OCH ljusare (bara
volym räcker inte — örat läser tonhöjd som kraft; samma volymskillnad utan tonhöjdsskillnad
låter som samma träff på olika *avstånd*).

**Taket är inte valfritt.** En rasande hög ger tiotals par i EN bildruta. Två spärrar: max 3
anslag per bildruta, och 28 ms mellan toner. Den andra går på **väggklockan**, inte bildrutor —
vid 30 fps hade ett bildrutebaserat golv blivit dubbelt så långt i verklig tid, alltså tystare
juice på svagare enheter, precis tvärtom mot vad man vill.

Första kunder: **`domino`** (kedjan hörs — en kedja som just kommit igång viskar, en som rusar
smäller) och **`bygg-tornet`** (`_lockActive` hade redan en duns, men bara på klossen barnet
just la, och alltid lika hård).

**Verktyg: `scripts/_slagprobe.mjs`** (Node, ingen webbläsare — som `_kameraprobe.mjs`).
Uppmätt: mjukt fall vol 0.086 / 213 Hz → hårt fall 0.240 / 288 Hz · fem material, fem skilda
tonhöjder (144–1416 Hz) · en studsande gummiboll ger **9 anslag med avtagande fart**
(16,9 → 1,7 px/steg) · en hög på 40 stenar ger 30 anslag med **aldrig mer än 3 per bildruta** ·
noll toner efter `destroy()`.

⚠️ **En grön mätning kan ljuga precis som en röd.** Sondens första version mätte `impactAudio`
på högen och rapporterade "1 ton på 3 s" — grönt mot taket, och helt meningslöst: 180 bildrutor
simuleras på ~40 ms verklig tid, så väggklocke-spärren släppte igenom exakt en ton oavsett vad
som hände. Taket mäts nu via `onImpact` (bildruteräkning), och sonden säger i klartext varför.

### Runda P1 efter mätning: ljudhalvan var redan byggd, mekanikhalvan är kvar

Spår 3:s runda P1 skrevs ur en **räkning** (hur många spel som anropar `impactAudio`), inte ur
en läsning. Räkningen stämde — 21 av 23 anropar den inte — men slutsatsen ("anslagen är stumma
eller platta") höll bara i ett av fyra fall. Uppmätt spel för spel 2026-08-09:

| spel | planens P1-punkt | verkligt läge efter läsning |
|---|---|---|
| `knuffa-tornet` | MATERIAL-klossar + `impactAudio` | Klosstyperna med skild fysik fanns REDAN. Det som saknades var **rösten** → byggt (v1.80.0). |
| `kulbana` | ytmaterial + `impactAudio` | Ytorna lät redan olika, men **alltid lika hårt** → kraftskala byggd (v1.81.0). Fjäderbrädan (`mjukkropp`) kvar. |
| `studsa-ner` | per-pinne MATERIAL (studs + röst) + fläkt | **Rösten byggdes INTE** (pinnarna spelar en stigande skala som är spelets musikaliska signatur, och studs-variation ökar slumpen i ett spel vars poäng är att sikta). **Fläkten ✅ byggd** (v1.83.0): uppmätt 0,72 fickors verkan. |
| `glasstornet` | `mjukkropp`-wobble på kopan | ✅ byggt (v1.82.0). Sömmen var `_scoopPath` → `_ritaScoop` ritar nu alla silhuett-lager ur EN mjuk kropp; matter-kroppen som bär stapeln är orörd. |

**Slutsatsen att ta med sig:** det som återstod i P1 var **mekaniken** (wobble · fläkt ·
fjäderbräda), inte ljudet. Wobbeln och fläkten är byggda; kvar är `kulbana`s fjäderbräda.

⚠️ **En kraft som verkar under en kort passage kan inte dimensioneras i px/steg-terminalfart
ensam.** `speedToAccel` ger den acceleration som ger en viss SLUTHASTIGHET — men ett mynt är i
fläktströmmen ~0,3 s och når aldrig dit. Det som avgör utfallet är accelerationen gånger tiden
i strömmen, plus den fart myntet BÄR MED SIG resten av fallet. Första försöket (räckvidd 560 px
med linjärt avtagande) lämnade 6 % av kraften kvar där mynten faktiskt faller: uppmätt verkan
**8 px**. Räkna aldrig ut en sådan konstant i huvudet — släpp föremål och mät var de landar. En adoptionsräkning säger vad ett spel INTE importerar — aldrig vad
det redan gör med egen kod.

⚠️ **Utrullningen är INTE en mekanisk våg — läs varje spel först** (2026-08-09). 21 av 23
fysikspel saknar `impactAudio`, och det såg ut som en enradare per spel. Men fem av
kandidaterna (`vippbradan` · `mata-monstret` · `studsbollar` · `kulbana` · `flipperspel`)
har redan egna `onCollision`-handlare med tonade svar, och `bowling` — som stod först i
listan — har en **stämd pentatonisk kombo-stege** på fallande käglor plus en sågtands-duns,
strypt till 70 ms. Att lägga ett träknack ovanpå den gör ljudbilden grumligare, inte
tydligare, och krockar med CLAUDE.md-regeln om stämda ljud. Kriteriet ett spel måste
uppfylla: (1) anslagen låter **inget** i dag eller alltid **lika hårt**, (2) anslagen varierar
i kraft, (3) ingen redan tonsatt respons upptar platsen. `bowling` klarar det bara för
**ball mot vägg och studsare**, som är helt tysta — och då är svaret `onImpact` med ett
etikettfilter, inte `impactAudio` rakt av. Samma sorts lista som C4:s glödkandidater.

### B6. Ingen återanvändbar lyftkraft eller motståndsvolym **[Medium]** — ✅ BYGGD 2026-08-09 (v1.77.0)

`setWind` är global. Det fanns inget "vätskevolym"-begrepp som ger lyftkraft + motstånd inuti en
rektangel. `poppa-ballonger`, `ballonglyft`, `fallskarmen` och `plask-i-vattnet` vill alla ha det —
flytandet var scriptat.

✅ **`src/lib/flytkraft.js` byggd.** `class Flytvolym` = en rektangel med en yta: `lagg(body,
{ flyt, hemX, liv })` · `steg(t)` (FÖRE `varld.update()`) · `nedsankning(body)` · `ta` · `rensa`
· `destroy`. Volymen äger lyftkraft, vätskemotstånd, fartspärr, bottenlugn, banfjäder och
gupp/vaggning. **Första kund: `plask-i-vattnet`** — 34 rader handrullad `_applyBuoyancy` borta.

**Tre saker som gör den till en primitiv och inte bara en utflyttning:**

1. **EN knapp bestämmer flythöjden.** `flyt > 1` flyter, `< 1` sjunker, och jämvikten ligger
   exakt vid nedsänkningen `1/flyt` — uppmätt 0,833 / 0,625 / 0,400 för flyt 1,2 / 1,6 / 2,5.
   Ett spel behöver alltså aldrig tuna densitet och radie mot varandra för att få en anka att
   ligga högre än en båt.
2. **Basen läses ur världens gravitation VARJE steg**, inte ur en konstant vid uppstart.
   `plask-i-vattnet` hade `BUOY_BASE = GRAV_Y * 0.001` hårdkopierad; ett `setGravity()` mitt i
   leken hade tyst gjort allt som flöt till sjunkare. Uppmätt: jämvikten står still (0,625 →
   0,625) när gravitationen dubblas mitt i körningen.
3. **Volymen är en rektangel, inte en oändlig ytlinje.** `vanster`/`hoger` gör att en tank, en
   pöl eller en hink kan ligga var som helst i bilden utan att kroppar utanför lyfts av
   osynligt vatten (uppmätt: kroppen inne stiger till ytan, kroppen bredvid faller fritt).

**Portens garanti är mätt, inte påstådd.** `_flytprobe.mjs` kör den gamla koden ordagrant i en
tank och biblioteket i en identisk tank, sida vid sida i 900 steg med tre kroppar: **största
avvikelse 0 px**. Det är den enda mätning som får en utflyttning att räknas som klar — samma
grepp som `rep.js` mot `zackes-biltvatt`.

**Verktyg: `scripts/_flytprobe.mjs`** (Node, ingen webbläsare) — jämvikt per `flyt` ·
massoberoende över tre tätheter · sjunkare når botten och LIGGER still · fartspärr ·
rektangelgräns · gravitationsbyte · portekvivalens · exit.

⬜ Kvar (rundorna P2/P3): `fallskarmen` (luftmotståndsvolym — dess fall är scriptat i px/s och
äger ingen matter-värld), `ballonglyft` (räknar ballonger, ingen fysik alls i dag),
`poppa-ballonger`, `sapbubblor`. De tre sista kräver att spelet först FÅR en fysikvärld — det
är ett spelbyte, inte en portering, och hör därför hemma i sin egen runda.

### B6b. Kraftfält som delat begrepp **[Medium]** — ✅ BYGGD 2026-08-09 (v1.78.0)

Ett kraftfält är inte magnetens privatsak: en dammsugare, en virvel, en gubbe som lockar med
mat och en magnet är samma tre tal (radie · styrka · avtagande) med olika bild ovanpå. Appen
hade EN sådan implementation, inbakad i `magnet-fiske` — och den bar dessutom repots
viktigaste fysikkalibrering i en lokal konstant.

✅ **`src/lib/magnet.js` byggd.** `class Magnetfalt`: `flytta(x, y)` · `aktiv` ·
`dra(body, opts)` · `knuff(body, opts)` · `avstand(body)` · `destroy()`. Två avtaganden,
båda med kund i första spelet: `'invers'` (styrka/avstånd — len drift långt bort, snabb
snäpp nära) och `'jamn'` (lika hårt i hela radien — den mjuka knuffen bort).

✅ **`speedToAccel(pxPerStep, frictionAir)` i `physics.js`** — px/steg → matters kraftenheter,
med hela härledningen (`v∞ = a · 277,78 / frictionAir`) på ETT ställe. Det var den här
omräkningen som saknades den gången hela dammen sögs in i den parkerade magneten på under en
sekund. Fältet räknar den **per kropp** ur kroppens egen `frictionAir`, så två saker med olika
luftmotstånd i samma damm dras ändå lika fort.

**Returvärdet är närhetsvillkoret.** `dra()`/`knuff()` returnerar den fart (px/steg) fältet
lade på, och 0 när kroppen är utanför radien eller fältet är avstängt. `magnet-fiske`s
ank-knuff blev därför `else if (falt.knuff(...)) { fniss }` — spelet räknar inte avståndet
en andra gång bara för att veta om något hände.

⚠️ **Porten är INTE bit-identisk, och ska inte vara det — men då måste rätt sak mätas.**
Två avsiktliga skillnader: dt² är exakt (277,7778) mot spelets avrundade literal `277.78`,
och fältkanten är inklusiv (`d ≤ radie`) mot spelets `dist < R_FIELD`. Skillnaden är 8·10⁻⁵
relativt — men matter med kollisioner är kaotiskt, så en sådan ulp driver isär banorna
**39,9 px över 900 steg**. Sondens första version dömde det som en regression. Det
spelrelevanta måttet är i stället **fångsttiden**: hur många steg det tar innan en sak
snäpper fast. Den är identisk steg för steg (80 px: 15 · 150 px: 41 · 220 px: 74 · 290 px:
116), och banorna sammanfaller inom 2·10⁻⁴ px över 2 sekunders lek.

**Verktyg: `scripts/_faltprobe.mjs`** (Node, ingen webbläsare) — kalibrering mot utlovad
px/steg-fart · 1/r-lagen · tak och golv · radie/avstängning/statiska · knuff bort · portens
fångsttider · exit. Spelsonden `_magnetprobe.mjs` (webbläsare) står kvar och mäter spelet.

⬜ Kvar: **poler** (samma pol stöter bort, motsatt drar) väntar på sin kund i runda P3, där
`magnet-fiske` självt ska få dem. En polaritet utan ett spel som visar den är dekoration.

### B6c. Värme fanns inte som begrepp **[Medium]** — ✅ BYGGD 2026-08-09 (v1.79.0)

Noll representation i hela appen. `lagerelden` räknade EN skalär (`_toast`) som fick göra
tre jobb: färgen, mjukheten och målet.

✅ **`src/lib/varme.js` byggd.** `class Varmefalt`: `kalla(namn, {x, y, radie, styrka})` (källor
sätts om varje bildruta — en eld som svajar i vinden är samma källa på en ny plats) ·
`lagg/flytta/ta/nollstall` · `steg(dtF)` · `temp(namn)` · `grad(namn)` · `narhet(namn)`.

**TVÅ TAL, INTE ETT — det är hela modulen:**

| | |
|---|---|
| `temp` | hur varmt föremålet är NU. Stiger mot fältet, faller mot omgivningen. Driver utseende och känsla. |
| `grad` | hur färdigt det hunnit bli. **SJUNKER ALDRIG.** Driver målet. |

Att låta `temp` styra målet vore ett P0-brott: barnet som lyfter upp maten för att titta
skulle se sitt arbete rinna tillbaka. Att låta `grad` styra utseendet är felet som fanns.

**Gradningen räknas på NÄRHETEN, inte på temperaturen.** Det ser bakvänt ut, men en
uppvärmningskurva mellan fältet och gradningen hade tyst gjort varje redan trimmat spel
långsammare. Uppmätt: gradningen är **bit för bit identisk** (avvikelse 0,0e+0 över 900 steg
med varierande bildrutetid) med lagereldens gamla formel.

**Första kund: `lagerelden`.** Mjukheten (`mjukkropp.mjukhet()`) hänger nu på temperaturen.
Uppmätt i spelet (`_rostprobe.mjs`): styvhet **1,000 → 0,175** i lågan, och **tillbaka till
0,995** efter 3 s ur elden — före bytet frös den på ~0,21 för alltid — medan gradningen står
kvar på 0,58.

⚠️ **Mät inte hoptryckningen med en bounding box.** Marshmallowen sitter på en pinne genom
mitten och **vrider sig** långsamt runt den medan man drar: höjden faller och bredden växer
lika mycket medan `fyllnad()` står kvar på 1,00. Sondens första version läste vridningen som
"stelnar inte" och blev röd på kod som gjorde precis rätt. Kontrollmätning på HEAD visade
samma vridning — den är inte införd av bytet.

**Verktyg:** `scripts/_varmeprobe.mjs` (Node — portekvivalens · P0-garantin · bildrutefritt
svalnande med halveringstid · flera eldar · exit) och `scripts/_rostprobe.mjs` (webbläsare —
mäter värmen i det riktiga spelet).

⬜ Kvar: `trollblandning` (kok-bubblor ur `Emitter`, runda P3) · `pizzabageriet` · koppling
till `vatska` (kokning). `farg`-ramp byggs först när ett spel behöver en som inte redan
har sin egen färgtrappa — `lagerelden`s `drawRoast` har det.

### B7. `kugghjulen` är ren geometri **[Deep]**

Rotationskopplingen är BFS över mittavstånd, inga kroppar. Ett riktigt kuggverk med last och
tröghet (matter revolute-constraints) gör att veven **tar emot** — och motstånd som går att
känna är precis den sortens motgång P0 tillåter och uppmuntrar.

---

## 3. Spår C — grafik, detaljnivå, kamera och scen

Belägget finns i repots egna skärmdumpar: `snobollen` — enda spelet med riktiga parallax-lager —
ser markant bättre ut än `kulbana`, som är platt himmel, två moln och en stor tom mitt.
Samma motor, samma budget, samma regler.

### C1. Gradientfyllningar — störst utseende per rad **[Quick]** — ✅ DELVIS BYGGD 2026-08-08

Före: `FillGradient` (linjär **och** radiell) fanns i Pixi 8.19 och användes **noll** gånger.
`scene.js:paintVGradient` staplade **48 rektanglar** per himmel.

1. ✅ `paintVGradient` är nu en `FillGradient` → jämn himmel, 1 rit-operation i stället för 48.
   Automatisk vinst för alla 57 scener som använder `createScene()`.
2. ✅ Ny `src/lib/form.js`: `sphereFill` (klot) · `cylinderFill` (rör, `axis: 'y'|'x'`) ·
   `topLightFill` (belyst uppifrån — allt annat) · `rimLight(r)` · `setDetaljniva`.
   Första kunden: molnen i `scene.js` (delad `FillGradient`-instans, byggd en gång,
   `moln → klot med mjuk skugga` i stället för platta vita klumpar).
3. 🟨 **PÅBÖRJAD (v1.47.0):** applicera dem på de 203 lokala rit-funktionerna i spelfilerna
   — det är skillnaden mellan clipart och Sago Mini för själva SPELOBJEKTEN, inte bara scenens
   dekor. `artikoner.js` (rad 10) är **klar** och är mallen att följa: gradient på huvudformen,
   platt på smådetaljer, handrullade glans-ellipser borttagna.
   **Klart hittills:** bollarna i 5 spel + stjärnorna i 3 (via `foremal.js`, se A2), kronorna i
   `klappa-mullvaden`/`knuffa-tornet` och spindelhjältens bumper — 10 föremål i 8 spel. Sedan,
   efter mätning med **`scripts/_plattprobe.mjs`** (nytt), de STORA ytorna där platt var fel:
   mullvadens gräsmatta (215 742 px i en ton), `plantera-fron`s jordprofil (301 300),
   lavaspelets klippor (135 828), `fanga-frukten`s lövverk och fyrverkeriets natthimmel.

   **Sortera efter mätningen, inte efter magkänsla.** Sonden rankar skärmdumparna på det
   STÖRSTA ENSKILDA enfärgade fältet. Två saker den lärde ut:
   - **Fyrverkeriets natthimmel var 48 staplade rektanglar** — exakt mönstret `scene.js`
     lämnade i den här raden, men i en spelfil. Ny `verticalFill(top, bottom)` i `form.js`:
     en rit-operation i stället för 48, och banden borta.
   - **Platt är ibland RÄTT.** `spara-linjen` (vitt ritpapper), `folj-sparet` (spårpapper) och
     `rulla-bollen-hem` (fotbollsplan uppifrån) toppar listan och ska göra det. Sonden är en
     ledtråd; bilden avgör.

   **Kvar:** `tarta-i-ansiktet` · `hamburgerbygget` · `enkelt-pussel` · `vart-tog-det-vagen`
   ligger nu överst bland de *tveksamma*. Och: en gradient på en 11px-stjärna syns inte, en
   på ett 90px-klot bär hela bilden — storleken avgör om det är värt en ändring.
   `rimLight` väntar fortfarande på sin första kund — den är till för figurer som byggs som en
   **container av flera Graphics**, vilket varken `artikoner.js` eller `foremal.js` (en enda
   Graphics per föremål) är.

`DESIGN.md §4` fick tillägget att gradienter är **fyllningar**, inte filter — ingen konflikt
med lip-tricket, som fortfarande äger allt tryckbart i skalet.

### C2. `lib/atlas.js` — baka en gång, återanvänd **[Medium]** — ⬜ ÖPPEN

`renderer.generateTexture(graphics)` per distinkt föremål → `Sprite`. Ger tint-varianter gratis
och slipper omtesselering. Målgrupp: upprepad dekor (moln, träd, stenar, snöflingor).

> **Byggdes och revs igen 2026-08-08.** Den var tänkt som förutsättning för C3, men C3 behövde
> den inte — och `generateTexture()` visade sig kosta stabilitet: se mätningen i C3. Filen är
> borttagen i stället för att ligga kvar oanvänd (samma regel som `p2-es` i A1). Bygg den när
> ett spel faktiskt ska baka Pixi-grafik, och **använd Canvas2D om formen går att rita där**.

### C3. `lib/partiklar.js` på `ParticleContainer` **[Deep]** — ✅ BYGGD 2026-08-08

Före: varje partikel = en `Graphics` + en egen GSAP-tween (`bigCelebration` = 60 Graphics +
60 tweens). Efter: ett litet Canvas2D-atlasark, EN `ParticleContainer` per lager, EN tween per
svärm, analytisk rörelse. `feedback.js` (`puff` · `burst` · `sparkle` · `bigCelebration`) går
den vägen och behåller Graphics-vägen som fallback. **Alla 72 spel** fick 3× partikeltäthet
utan att ett enda spel ändrades.

**Uppmätt kostnad** (`scripts/_fpsprobe.mjs`, CPU 6× strypt):

| levande partiklar | ParticleContainer | Graphics (gamla vägen) |
|---|---|---|
| ~500 | 57,6 FPS | 57,2 FPS |
| ~2 100 | 57,7 FPS | 43,5 FPS |
| ~4 200 | 57,4 FPS | 22,7 FPS |
| ~21 800 | 56,5 FPS | — |

**Två fällor som kostade tid — läs innan nästa renderingsändring:**

1. **`generateTexture()` mitt i lek destabiliserade hela sviten.** Första versionen bakade
   arket med Pixi Graphics + `renderer.generateTexture()`. `npm run test:all` gav då
   `tom-scen`-fynd i **5 av 7 körningar** (mot 0 av 7 på HEAD), och en gång
   "WebGL context could not be created" i `glittergrottan`. Att baka tidigt i stället för lat
   hjälpte inte. Canvas2D rör inte GL-tillståndet alls — och partikelformer behöver ingen Pixi.
2. **Ett vilande fält måste rivas.** `fxLayer` lever hela appens livstid, så ett cachat
   `ParticleContainer` där låg kvar med sina buffertar för alltid. Med Canvas2D men kvarliggande
   fält: fynd i 1 av 3 körningar. Med `stad()` som river tomma fält: **0 av 4**. Mellan
   effekterna har appen exakt samma avtryck som före systemet.

Verifieras av `scripts/_partikelprobe.mjs` (fält, antal, pixelfärger, läckage, exit).
`scripts/_ab.sh` kör HEAD mot ändringen växelvis när en ändring misstänks stöka i sviten.

### C4. Additiv glöd som delat idiom **[Quick]**

`blendMode: 'add'` kostar ingenting och används av ett spel. Vill ha det: `lagerelden` (eld) ·
`enhorning-glitterbajs` + `glittergrottan` (glitter) · `blixt-och-dunder` (blixt) ·
`trollblandning` (magi) · `golvet-ar-lava` (lava) · `natskott-pa-stan` (neon).

### C5. `MeshRope` för allt långt och böjligt **[Medium]**

Slangen (`zackes-biltvatt`) · nättrådar (`spindelnatet`, `spindel-zacke-svingar`,
`natskott-pa-stan`) · vattenstrålar · tåg-/ormspår (`siffertaget`, `loopdjuren`) · regnbågen
(`regnbagsmalaren`). Ett texturerat rep läses som ett **material**; en polyline läses som en linje.

### C6. `lib/kamera.js` **[Deep]** — ✅ BYGGD 2026-08-08

`class Camera` äger INGA spelobjekt, bara **lager**: `parallax(faktor)` ger en Container vars
faktor är 0 (fastspikad i skärmen — vinjett, HUD), 1 (spelarens plan) eller något däremellan.
Spelet bygger i faktor 1 och tänker i världskoordinater; kameran flyttar lagren, aldrig
innehållet. `follow(mal, {lead, deadzone})` · `moveTo` · `panTo` · `shake(amp, dur)` ·
`zoomTo(s, {x, y})` · `attach(ticker)` · `destroy()`. Pekpunkter behöver ingen omräkning:
lagren är riktiga Pixi-containrar, så `varld.toLocal(e.global)` räcker.

**Lagerformeln är exakt, inte ungefärlig.** Ett lager med faktor f står på `-vänsterkant·f·s`.
Kameran startar i världens vänsterkant, så ett lager förskjuts bara ÅT VÄNSTER — och då är
`lagerBredd(f) = vy + f·(värld − vy)` precis den bredd som behövs för att aldrig visa en tom
kant. Vid världens högerkant landar lagrets högra kant på pixeln (uppmätt: f 0.02 → bredd
1318, offset −38, kant 1280).

**P0 i kod, inte bara i kommentar:** ingen rotation exponeras eller sätts · exponentiell
utjämning (bildrutefri: 60 och 30 FPS hamnar inom 1 px efter en sekund) · dödzon · fartsspärr ·
zoom klämd till [minZoom, maxZoom] med **golv 0,5 s** på varje zoom · skak med tak (10 px),
kvadratisk avklingning och två sinusvågor i stället för brus (per-bildruta-slump känns hårt) ·
faktor-0-lager skakar aldrig, så vinjett och HUD står stilla.

**Ett mätvärde ändrade designen.** `hardBox` (hur långt målet får ligga från mitten innan
kameran tvingas efter) sattes först till 0.42 av halva vyn = 269 px. Sonden visade att rutan
då klämmer mot målets läge varje bildruta och därmed sätter **dödzon, lead och fartsspärr ur
spel** — de får bara verka inne i rutan, och kameran blir klistrad vid figuren. 0.75 (480 px,
drygt 160 px in från kanten) låter utjämningen göra jobbet och lämnar rutan som sista utväg.
Priset är mätt och dokumenterat: en **teleport** rycker bilden med (3880 px på en bildruta i
sonden), eftersom rutan klämmer mot målets nuvarande läge. Ett spel som flyttar sin figur
långt på en bildruta ska flytta kameran själv med `moveTo()` i samma andetag.

**Zoomen skalade först varje lager med sin egen faktor** (`1 + (zoom−1)·f`). Det lät
fysikaliskt — ett avlägset berg ändras mindre av en kamerakörning — och var fel: vid zoom 1.4
hamnade markens horisont på skärm-y 874 och fjärranbandets på 673, alltså gled scenen isär i
höjdled. En zoom ändrar **brännvidd**; den flyttar inte lagren i förhållande till varandra.
Det gör bara PANORERINGEN, och den bär faktorn. Zoomen är nu uniform och skalar kring vyns
mitt. `_kameraprobe.mjs` har en egen regressionsvakt för just det.

**Kostnad: ingen mätbar.** `_kamerabild.mjs --fps --cpu 6`: scen utan kamera **56,6 FPS**,
samma scen i 10 parallaxlager med följning i rörelse **56,6 FPS**.

⚠️ **Scenens lager är låsta i höjdled.** Har världen vertikalt utrymme panorerar spelets eget
faktor-1-lager i höjd medan scenens mark står kvar — figuren glider av marken. Det syns bara
i rörelse, aldrig i en stillbild, så `adopt()` **varnar i DEV** när `worldH > vyns höjd` i
stället för att vara tyst. Vertikal parallax i scenen kräver att banden ankras mot ett
kameraläge, och det är inte byggt.

Nya verktyg: **`scripts/_kamerabild.mjs`** (ett kameraläge per ruta, maskad — parallax går
inte att bedöma i en stillbild av EN position; skriver också ut `f<faktor>:x<offset>` per
lager, för en fin bild kan mycket väl ha noll parallax) och **`scripts/_kameraprobe.mjs`**
(beteendet i tal: dödzon, hård ruta, spärr, skak, zoom, klämning, exit — kör i **Node utan
webbläsare**, eftersom kameran bara rör `.position`/`.scale` och Pixis Container laddar där).

⬜ Kvar: kameran har ännu **ingen kund bland de 72 spelen**. Ingen befintlig `createScene`-scen
rullar i sidled, och de två spel som har egen kamera (`snobollen`, `natskott-pa-stan`) vill ha
något kameran med flit inte gör — snöbollen härleder kamerans **höjd ur backens yta**
(`camY = surfaceY(camX + LEAD)`) i stället för att följa bollen, med backen ritad i skärmrymd.
Att byta den mot generisk följning vore att tuna om ett fungerande spel utan synlig vinst.
Första riktiga kunden blir därför ett **nytt** spel byggt för en värld bredare än rutan, eller
en `/polera`-runda som medvetet ger ett spel en sådan värld.

### C7. Fördjupa `scene.js` — lyfter 55 spel på en gång **[Medium]** — ✅ BYGGD 2026-08-08

Före: himmel + sol + moln + en markremsa. Nu, allt bakom en egen flagga (`djup` · `dis` ·
`markstruktur` · `vinjett` · `tid`) och allt i scenroten, alltså **bakom spelytan**:

- **Tre avståndsband** i stället för `TilingSprite`. Varje band är lägre, mörkare och tätare
  kuperat än det bakom — de tre signalerna ögat läser som avstånd. Ingen textur behövde
  bakas, så `TilingSprite`-vägen (och dess `generateTexture`-risk, se C2) föll bort.
  Ersätter gamla `hills`: två cirklar med radie 220–280 som läste som bleka bubblor.
- **Disband** vid horisonten, ritat **mellan** band 1 och 2. Ordningen ÄR effekten — det är
  därför fjärran bandet ser avlägset ut trots att det bara är en aning ljusare.
- **Markstruktur** i två lager: en tät rad strån längs markens överkant + glesa strån under.
  Bara det glesa lagret läste som prickar av smuts. Nytt temafält **`gras`** avgör strån
  eller prickar — strån på `water` såg ut som skräp i sjön (bara skärmdumpen visade det),
  medan sand (`warm`) bär dem fint som torrt strå.
- **Vinjett** som **fyra linjära kanttoningar**, INTE en radiell gradient — se fällan nedan.
- **`tid`** (`morgon` · `skymning` · `kvall`) som en nyansparameter. `topp` och `botten`
  lerpas olika mycket och åt olika håll: en skymning glöder vid horisonten och är djup
  ovanför, en kväll är tvärtom. En enda faktor över hela himlen gav en **grå** skymning.

**Fälla 1 — en radiell gradient kan inte ha genomskinlig mitt.** `buildRadialGradient` i Pixi
fyller först HELA duken med sista färgstoppet och ritar gradienten ovanpå; en genomskinlig
källa raderar ingenting i source-over. En vinjett med genomskinlig mitt blir därför en JÄMN
mörkning över hela ytan. Uppmätt på pixlarna: himlens mitt gick [176,227,250] → [146,189,208],
samma 0.83-multiplikation överallt. `buildLinearGradient` har ingen förifyllning, så fyra
linjära kanttoningar (delade instanser, ~4 KB) gör jobbet — och mitten är nu pixelidentisk
med baslinjen medan hörnen mörknar 57 steg.

**Fälla 2 — en gradient per scen destabiliserade sviten.** Disbandets `FillGradient` byggdes
först inne i `createScene`, alltså en ny duk + texturuppladdning vid **varje** spelmontering.
Interleaved A/B (`scripts/_ab.sh src/lib/scene.js`): HEAD `rent` 3/3, ändringen `tom-scen` i
1 av 3 rundor (tre spel samtidigt) — plus en full körning som fällde ett fjärde spel. Samma
signatur som `generateTexture`-fällan i C3. Efter cache av både dis- OCH himmelsgradienten
(den senare bakades om per montering redan före den här raden): HEAD 1/3 flaky,
ändringen **0/3**. En scen gör nu noll texturbakningar vid montering — färre än HEAD.

Nytt verktyg: **`scripts/_scenbild.mjs`** ritar `createScene` i ett rutnät utan att gå via
ett spel (`node scripts/_scenbild.mjs meadow --tider dag,morgon,skymning,kvall`). Scenen delas
av 55 spel, så ett temabyte måste gå att se utan att först hitta ett spel med rätt tema.
`scripts/_ab.sh` tar numera filer som argument i stället för att vara hårdkodad till
partiklar/feedback.

✅ **Banden är parallax sedan 2026-08-08** (rad 5). `createScene(tema, { kamera: { bredd } })`
lägger varje element i ett eget lager med en faktor ur `DJUP` (himmel 0 · sol 0.02 · stjärnor
och bokeh 0.05 · moln 0.12 · fjärran 0.18 · dis 0.22 · mellan 0.34 · nära 0.52 · mark 1 ·
vinjett 0 överst), och ritar varje lager exakt så brett som dess faktor kräver. Roten får
`_kamLager` som `Camera.adopt()` plockar upp. **Utan flaggan är utfallet oförändrat** — samma
container, samma ritordning, samma bild (verifierat mot `_scenbild.mjs`-baslinjen).

Två saker som bara syns när lagren är på: molnen ritas sist i koden men **hör hemma bakom
marken**, så lagren skapas i en egen, uttalad bakifrån-och-fram-ordning i stället för där
innehållet råkar ritas. Och kupolantalet i ett band skalas med lagrets bredd — behåller man
antalet och breddar geometrin blir kullarna utdragna och bandet läser som en **våg** i
stället för ett landskap.

### C8. Detaljnivå i `artikoner.js` — lyfter 13 spel på en gång **[Medium]** — ✅ BYGGD 2026-08-08

121 nycklar, 720 rader. Alla mallgrenar fyller nu sin **huvudform** med en gradient ur
`lib/form.js` efter en enda regel, i stället för per-form-smak:

| Form | Fyllning |
|---|---|
| runda kroppar (huvuden, frukt, bollar, klot, moln-puffar) | `sphereFill` |
| rör och stavar (raketkropp, stam, morot, skaft, banan) | `cylinderFill` — ny `axis`-parameter |
| allt annat (karosser, kläder, verktyg, polygoner) | `topLightFill` — **ny** i `form.js` |

Smådetaljer (öron, fenor, nycklars kammar) lämnas platta med flit: ögat läser volymen på den
stora formen, och varje distinkt gradient är en egen textur att binda. Där en mall hade en
handrullad glans-ellips bredvid en platt fyllning är den **borttagen**, inte kvarlämnad —
det var samma dubblett som gradienten ersätter (🎈 💧 🪐 🌳 🍬).

**Kostnaden mättes, och var värd att mäta** (`scripts/_ikonkostnad.mjs`, nytt): Pixi bakar en
**linjär** gradient till en `256×1`-duk (~1 KB) men en **radiell** till `256×256` (~256 KB).
Hela ikonbiblioteket landade därför först på **15,30 MB** GPU-textur — 61 radiella à 256 KB.
Med `textureSize: 64` på `sphereFill` är samma bibliotek **1,00 MB**, och ingen banding syns
ens på en 300px-ikon. Probet mäter de **bakade texturerna på ritinstruktionerna**, inte
modulens cache-räknare: en `import('/src/lib/form.js')` i ett probe är en annan modulinstans
än den `artikoner.js` fått av Vite, så dess `Map`:ar står på 0 hur många ikoner som än ritats.

**Detaljnivå:** `setDetaljniva(0|1|2)` i `form.js`. Nivå 0 får fyllningsfunktionerna att
returnera **råfärgen** i stället för en gradient — `.fill(0x4aa3df)` är lika giltigt som
`.fill(gradient)`, så ingen ritgren behöver en egen if-sats och nivå 0 ger exakt utseendet
före `form.js` (verifierat: 0 bakade gradienter, 0 MB, alla former hela). Nivån läses
app-brett och **inte** per `drawIcon`-anrop: gradienterna avgörs inne i `form.js`, så en
anropsflagga hade släckt accenterna men inte gradienterna. Accenter har dessutom en
storleksgrind (≥64px) — under den är de brus. ⬜ Kvar: koppla `setDetaljniva` till en
inställning i skalet (i dag är 2 hårdkodat).

**Två saker ströks efter granskning i skärmdump — de är resultat, inte glömska:**

1. **Pälstofsar** (cirklar som stack ut ur huvudets silhuett) läste som kindpäls på räv och
   hund, men som bubblor med egen kontur på kanin, panda och pingvin.
2. **Kantdager som ljus båge** innanför konturen såg mjuk ut vid 130px och var ett hårt
   streck tvärs över pannan vid 300px. En dager med hård kant är per definition inte en
   dager — den hör hemma i gradienten, inte i ett stroke.

Kvar av de accenter som föreslogs: fruktporer, metalldager på hammaren, barkådror på trädet.
Ocklusion byggdes **inte separat** — `sphereFill`/`topLightFill` mörknar redan mot underkanten,
så ett extra ocklusionsdrag hade lagts ovanpå något som redan fanns.

**Två buggar hittades på vägen, båda osynliga för ett grönt test:**

- 🌙 ritade en **cream-cirkel ovanpå** en hel måne för att få skäran. Den var osynlig bara mot
  cream bakgrund — mot alla andra satt en beige klump i månen. `.cut()` provades som fix och
  **fungerar inte här**: `GraphicsContext.cut()` bryter efter första instruktionen som saknar
  hål, så med `.fill().stroke()` fastnar hålet på konturen och fyllningen förblir hel
  (en ring ovanpå en solid disk). Skäran är nu ett eget slutet drag.
- 🍐 var en cirkel **plus** en ellips, båda stroke:ade. Sömmen där de möttes syntes och päronet
  läste som en snögubbe. Nu ett enda slutet drag, med stjälk och blad.

### C9. 3D-lagret används av ett spel **[Deep]**

`three3d.js` + `three-shaders.js` = 567 rader med `ThreeLayer`, delad renderer, toon-material,
sju backdrop-shaders. `glittergrottan` är enda kunden. Antingen bygg fler 3D-spel eller använd
`makeBackdrop` som **bakgrund** i 2D-spel (3D-canvasen ligger redan bakom Pixi och all input går
via Pixi ändå).

### C10. Småpengar **[Quick]**

- 75 `new Text` rasteras via canvas. `BitmapText` för allt som ändras varje bildruta (räknare).
- `roundPixels` på bakade sprites.
- `CullerPlugin` när kameran (C6) landar.
- Renderarkonfigen i `App.js` är redan rätt (`resolution` ≤2, `antialias`, `maxFPS 60`) — rör den inte.

---

## 4. Arbetsordning

Störst lyft per risk först. Varje rad är en egen commit + MINOR-bump.

| # | Vad | Spår | Lyfter | Status |
|--:|---|:--:|---|:--:|
| 1 | `lib/partiklar.js` + `feedback.js` internt, 3× täthet | C3 | **alla 72 spel** | ✅ v1.39.0 |
| 2 | `lib/atlas.js` — bakning av Pixi-grafik till textur | C2 | repeterad dekor | ⬜ *(revs, se C2)* |
| 3 | `FillGradient` i `scene.js` + `lib/form.js` | C1 | 57 scener + moln | ✅ v1.40.0 *(delvis — se C1)* |
| 4 | Fördjupad `scene.js` (djupband, dis, vinjett, tid) | C7 | 55 spel | ✅ v1.43.0 |
| 5 | `lib/kamera.js` | C6 | nya spel; scenens djupband blir parallax | ✅ v1.44.0 |
| 6 | `FluidWorld` → `vattenvagen` + `golvet-ar-lava` | B1 | 2 spel, sedan 6 till | ✅ v1.45–46.0 |
| 7 | `lib/rep.js` (verlet + `MeshRope`) | B3+C5 | ersätter 4 kopior | ✅ v1.56.0 *(solvern + 1 kund; `MeshRope` kvar)* |
| 8 | Material med ljud/partikel/spår | B4+B5 | 23 fysikspel | ✅ v1.52.0 |
| 9 | `lib/karaktarer.js` (mood-rigg) | A3 | 29 Bobo-spel | ✅ v1.55.0 *(16 kunder, 6 kvar + 2 strukna)* |
| 10 | Detaljnivå i `artikoner.js` | C8 | 13 spel | ✅ v1.42.0 |
| 11 | `lib/mjukkropp.js` | B2 | 6 spel | ✅ v1.57.0 *(1 kund, 5 kvar)* |
| 12 | Beslut om `p2-es` | A1 | dokumenten | ✅ v1.49.0 *(borttagen)* |
| 13 | **Full bleed** — `lib/view.js` + scenbleed + `ctx.view` | D | **alla 72 spel på telefon** | ✅ v1.67–68.0 |

**Grind per rad:** `npm run check` grön · `npm run test:all` 72/72 med 0 konsolfel · skärmdump
granskad med ögat · FPS mätt på plattan när raden rör rendering eller partiklar.

## 5. Spår D — skärmen utanför 16:9 (full bleed) ✅ v1.67–68.0

Contain-letterboxen lämnade creme-lister på telefoner bredare än 16:9 (Pixel 10 Pro visar
design-x ≈ −163..1443) och spelobjekt "parkerade utanför skärmen" stod fullt synliga i
listerna. Åtgärdat i tre lager:

- **`lib/view.js`** — `VIEW` (synlig designyta, muteras på plats av Scaler), `BLEED_X 240` /
  `BLEED_Y 160` (tak: 21:9 behöver ±200, 4:3 ±120), `onViewChange`. Spel läser **`ctx.view`
  vid användning** — cachea aldrig, mutera aldrig. Vid 16:9 är VIEW = designrektangeln.
- **`scene.js`** ritar full bleed med *platta kjolar/remsor utanför 16:9* — deterministisk
  geometri i synlig bild orörd → inga ombaslinjeringar. Vinjetten är enda responsiva lagret
  (VIEW-kanter, `onViewChange` + `'destroyed'`-avregistrering). OBS himmelsgradienten: bredda
  BARA i sidled (bbox-höjden styr mappningen); topp/botten-bleed = helfärgade remsor i egen
  Graphics.
- **Per spel** (16 st + natskott): egna bakgrunder breddade; spawn/wrap/cull/parkering mot
  `ctx.view`-kanter. **Fällan:** spel med `COLORS.bg` som egen bakgrund kan aldrig passera
  kant-cream-kollen (färgen ÄR letterboxen) — använd varm ton `0xfff0d6` (bildkolls
  dokumenterade "legitim scen"-gräns går vid Manhattan ≤10).

**Mätning:** `npm run test -- --all --viewport 952x428` sveper alla spel i telefonform;
`bildkoll.mjs` `kant-cream` mäter värsta ZONHALVAN (en obredda himmel ger creme bara ovanför
horisonten) med två design-undantag (innehållsyta ≥35 % creme = medvetet bord/panel;
ramremsa ≥60 % creme = medveten ram, t.ex. folj-sparet). Tryck/drag i `test-game.mjs`
mappas genom letterboxen — samma designkoordinater träffar rätt i alla viewports.

**Kvar (medvetet):** `PhysicsWorld` har `bounds`-param men ingen kund (opt-in med flit —
testad fysik får inte tyst avvika per enhet). saftbarens `FluidView.area` klipper spill
~40 px före kanten på de bredaste telefonerna (breddning = större filteryta, mät med
`_vatskeprobe` först). Manuell telefonkoll (build → preview → Tailscale, rotera mitt i
spel) är sista grinden.

## 6. Spår E — animation & rörelse, runda A1 (tokens · squash · tyngd i draget) ✅ v1.69.0

Census:en inför spåret hittade tre systemfel: **`ANIM` i theme.js hade noll konsumenter**
(värdena handkopierade med drift till fem filer — fade 0,16/0,18/0,2/0,25), **ingen delad
squash-and-stretch** (16 spel med var sin kopia av samma recept) och **ett drag utan tyngd**
(föremålet satt limmat vid fingret, vågrätt, och stannade dött i målet).

- **Tokens** — `Button`, `Nav`, `LibraryScreen`, `MenuScreen` läser `ANIM` i stället för
  egna tal. `ANIM` fick `settle` (återgång med översläng), `lift` (lyft i handen) och
  `squash` (de tre takterna). Nästa steg kan `check.mjs` flagga handkopior.
- **`feedback.js`** — `squash(t,{intensity,hop})` (djurorkesters `_hop` befordrat; spelet
  anropar nu lib-versionen och blev 18 rader kortare), `landa(t,{base})` (landningstryckning
  — `base` för den som själv håller vilo-skalan) och `stegra(list, fx)` (förskjuten start via
  `ANIM.stagger`). Alla tre följer vilolägesregeln och är exit-säkra.
- **`DragController`** — eftersläpning (`gsap.quickTo`, 0,1 s), lutning ur eftersläpningen
  (0,008 rad/px, tak 0,22 — blir automatiskt proportionell mot farten utan hastighetsmätning),
  översläng + `landa()` i målet, och en mjuk lyft-skugga. **Eftersläpningen är bara visuell:**
  träffprövningen använder fingrets position (`rec.tx/ty`), aldrig den släpande bilden, så
  inget mål blev svårare att träffa (uppmätt mot HEAD: samma träffutfall i harnessens
  autodrag).

**Två fällor, båda uppmätta:**
1. **Lyftet måste pinna både vilo-skala och vilo-rotation** (`_fxRestScale`/`_fxRestRot`).
   sortera-skrap anropar `wiggle()` vid fel släpp — wiggle läste då LUTNINGEN som föremålets
   vilovinkel och lämnade det 0,15 rad snett. Samma fälla som `pop`-inflationen i feedback.js,
   fast för rotation.
2. **Skuggan är opt-in, inte automatisk.** Ungefär hälften av dragspelen ritar redan en egen
   skugga under sina föremål; två skuggor som glider isär under ett snabbt drag syns direkt.
   Tänd i de fem som saknade en (enkelt-pussel, kla-efter-vadret, kugghjulen, plask-i-vattnet,
   siffertaget). Eftersläpning, lutning och landning ärvs däremot av alla 23 dragspel.

**Mätning:** ny sond `scripts/_dragprobe.mjs <id>` — eftersläpning i px, lutning i rad under
farten och efter släpp (mot föremålets EGEN vilovinkel), skuggan tänd/städad, barnantalet i
lagret före/under/efter, samt exit mitt i ett drag. Sju spel mätta: 12–16 px släp, 0,10–0,13 rad
lutning, allt städat, 0 konsolfel. **Sondens egen fälla:** en `page.screenshot()` tar ~100 ms —
mät FÖRE fotot, annars har bilden hunnit i kapp fingret och eftersläpningen mäts till 0.

**Kvar i spåret:** A2 (riktningsmedvetna Nav-övergångar + `liv()`-idle), A3 (riggens sista 6
spel), A4 (add-glow, kontinuerliga emitters, MeshRope via Canvas2D, kamerans första kund).

## 7. Spår E runda A2 — övergångar med riktning + vilorörelse ✅ v1.70.0

- **`Nav.js`** — den nya skärmen läggs **underst och full direkt**; det är den GAMLA som
  glider undan och tonar bort ovanpå (vänster djupare in, höger tillbaka, `DJUP`-tabellen).
  Ordningen ger både riktningen och frihet från cremeblänk: med en korstoning är båda
  skärmarna halvgenomskinliga en stund och skalets creme lyser igenom. `_busy` hålls tills
  övergången är klar (släpptes förut synkront, så ett andra tryck kunde starta nästa skärm
  mitt i den pågående).
- **`GameHost`** — ankomst-takt: spelet sätter sig på plats från skala **1.06 ned mot 1**.
  Aldrig under 1 — en scale-in underifrån visar skalets creme runt kanterna en halv sekund,
  och full bleed finns just för att slippa det.
- **`feedback.liv(t,{bob,sway,duration,phase})`** — gupp i höjdled + vaggning med **egen fas
  per föremål**. `breathe` var skal-bara och synkron: tio föremål i takt läses som en enda
  pulserande yta. Tänd i sex spel som saknade vilorörelse helt (loopdjuren, hamburgerbygget,
  enkelt-pussel, vart-tog-det-vagen, fyrverkeri, gravmaskinen).
  **Mönstret som gör det ofarligt:** lägg rörelsen på en INRE behållare när det yttre objektet
  ägs av någon annan (DragController, hyllans svep, spelets egen blandning) — annars slåss de
  om samma `y`.

**Mätning:** `scripts/_navprobe.mjs` (riktning, creme mitt i bytet, routerlås) och
`scripts/_livprobe.mjs <id>` (amplitud, fasspridning, tickar något efter exit).
Uppmätt: på väg ut ur ett spel **32,5 % creme med korstoningen mot 0,9 %** med den nya
ordningen; liv-amplitud 4,0–9,5 px, fasspridning 0,14–0,44, 0 tweens kvar efter exit.

**Två lärdomar:**
1. **`isActive()` ljuger om en tween som dödat sig själv inifrån `onUpdate`** — den fryser sin
   `totalTime` men rapporterar fortfarande aktiv. Mät att den slutar **ticka**.
2. **Ändrad övergångstiming gör latenta exit-buggar deterministiska.** studsbollar tweenade
   målgjorda bollar 0,2 s ner i korgen; de hade redan lämnat `_balls`/`_shot` så `destroy`
   hittade dem inte. Rött 3 av 3 med A2-skalet, grönt 3 av 3 utan (växelvis mätt) — buggen
   var gammal, A2 gjorde den synlig. Fixad med en `_malflykt`-mängd.

## 8. Spår E runda A3 — karaktärsriggens utrullning KLAR (22/22) ✅ v1.71.0

De sista sex spelen bytte från stillbild till `lib/karaktarer.js`: `domino`, `flipperspel`,
`hamburgerbygget`, `kulbana`, `sapbubblor` och `knuffa-tornet` (det sista från `figurer.js`).
**`mascot.js` har nu en enda kund kvar: `gravmaskinen`** — det dokumenterade undantaget
(r 11 ⇒ ögonen blir 1,7 px och en min går inte att läsa).

Mönstret satt redan från omgång 1–4 och höll hela vägen:

| Egenskap | Ägare |
|---|---|
| `view.scale` | ALLTID riggens andning. Spelets egen andnings-tween tas bort (knuffa-tornet hade en på `w.scale`). Ett `pop()` flyttas till den YTTRE containern. |
| `view.y` | Den med STÖRSTA gesten. domino 52 px, sapbubblor 34, kulbana 26 — alla större än `jubel` (0,5·r), så spelen behöll sina hopp och riggen bidrar med `setMood('stolt')`. |
| `kropp` | `false` när den ritade kroppen ÄR rollen: flipperspels Bobo bakom maskinen, grillmästarens förkläde, kulbanans blå byxor, såpbubblornas svävande kulkropp. |

**`look()` är fortfarande den billigaste stora vinsten** — flipperspel följer kulan,
hamburgerbygget det barnet drar (annars bygget), kulbana kulan hela vägen ner. Alla via
`outer.toLocal(mål.getGlobalPosition())`, som räknar bort den yttre containerns läge gratis.

**Två fynd:**
1. **Bygghjälmen i knuffa-tornet täckte hela ansiktet.** Brättet låg på `y = 0` och riggens
   ögon ligger på −0,12·r; `makeBobo` hade dem lägre. Hittat i en **närbild** — testet var
   grönt hela tiden. Lyft till −0,46·r så både ögon och bryn syns under brättet.
2. **Riggen som byggs om under spelets gång måste `destroy()`:as** (kulbanas mottagare byggs
   per bana). Uppmätt: 10 ombyggnader → 0 gamla riggar lever, 0 aktiva tweens kvar.

Kvar i spåret: A4 (add-glow, kontinuerliga emitters, MeshRope via Canvas2D, kamerans
första kund).

## 9. Spår E runda A4 — additiv glöd, kontinuerliga emitters, MeshRope ✅ v1.72.0

Tre av rundans fyra punkter är byggda och har varsin verklig kund. Den fjärde (kamerans
första kund) är utredd men inte byggd — se längst ner.

**`lib/glod.js` (nytt).** Ett Canvas2D-bakat atlasark med två former (`prick`, `stjarna`),
EN vit textur för hela appen som färgas med `tint`. `glod()` ger en additiv `Sprite`,
`glodBakom()` lägger den under ett föremål. Inga tweens, inga timers — exit-säker av
konstruktion, precis som `rep.js`. Canvas2D och inte `generateTexture()`, av samma mätta
skäl som `partiklar.js`.

**`blend: 'add'` i `partiklar.js`.** Blandningen sitter på CONTAINERN, inte på partikeln
(Pixi packar hela fältet i ett anrop), så additiva partiklar får ett eget fält
(`_fxFieldAdd`) som rivs enligt samma regel som det vanliga.

**`Emitter` i `partiklar.js`.** `spray()`/`rain()` är engångshändelser; allt som PÅGÅR
gick bara att bygga genom att anropa `spray()` varje bildruta, med en ny tween per anrop
och ett pulserande flöde som följd. `emitter(lager, {rate, ...})` föder i jämn takt ur EN
ticker-callback. Döda partiklar återuppstår PÅ PLATS, så ett jämnt flöde gör noll
add/remove efter uppstarten. Formen byts aldrig vid återanvändning: fältet har
`uvs: false`, så en ny textur hade ändrats i modellen men inte i bufferten — partikeln
skulle ritat fel bild utan ett enda felmeddelande.

**`repMesh()` i `rep.js`.** `repTextur(färg, profil)` bakar ett tvärsnitt med Canvas2D
(64×32, tvåpotenser med flit — `textureScale > 0` sätter `addressMode: 'repeat'` och en
del WebGL-drivrutiner klämmer i stället för att wrappa annars). Tre profiler: `'rep'`
(snedställda kardeler), `'slang'` (ribbor tvärs + blank dager längs), `'slat'`. En
MeshRope böjer sig BARA i sina punkter, så `repMesh` klipper in mellansteg ur **samma**
kvadratiska kurva som `repPath` ritar — mesh och stroke följer exakt samma linje.

| Kund | Vad som ändrades |
|---|---|
| `lagerelden` | platt orange skiva (alpha 0.18) → additiv halo som växer med värmen |
| `trollblandning` | ~30 raders handrullad bubbelloop (tak 8, ny Graphics per bubbla) → `Emitter` |
| `zackes-biltvatt` | slangens tre strokes → `MeshRope` med ribbad gummitextur |

**Mätning:** `scripts/_glodprobe.mjs` (ny). Röd additiv glöd på grå botten ger `255,60,60`
— grönkanalen KVAR på bottennivån — mot normalarmens `247,2,2`. Jämvikt 121 mot väntade
120, poolen `122 → 122` över två sekunder (noll allokering i jämvikt), 0 fält kvar efter
både `stop()` och `destroy()`. `_repprobe.mjs` fortsatt helgrön efter att `rep.js` börjat
importera pixi.js.

**Tre lärdomar, alla uppmätta:**

1. **Additivt ljus kräver TVÅ saker, och C4-listan tänkte bara på det ena:** en mörk botten
   ATT lysa upp, och en källa med TAKHÖJD KVAR. Lägereldens lågtungor ligger med flit 5–10
   djupt och `_flameColor` startar på nära vitt — summan av tio nästan vita skivor är vit
   oavsett bakgrund, så elden blev en vit klump i BÅDA stämningarna. Trollblandningens
   bubblor faller på det omvända: brygdfärgerna är mörka (0x2a2342), och en mörk källa
   adderar nästan ingenting. **Kandidatlistan i C4 ska läsas om mot båda villkoren innan
   fler spel rullas ut** — flera av de sju namnen klarar sannolikt inte testet.
2. **En stoppad emitter återskapade sitt tomma fält varje bildruta.** `_falt()` bygger ett
   fält om det saknas, och anropades först i `steg()` — alltså direkt efter att städningen
   rivit föregående. Exakt det vilande fältet på ett app-långlivat lager som CLAUDE.md
   varnar för, byggt på nytt 60 ggr/s. Fixen är att inte röra fältet alls när det inte
   finns något att göra.
3. **`npm run test` visar alltid nivå 0.** Allt som byter stämning med nivån var därmed
   osynligt för sviten — lägereldens `sunset → night` vid nivå 2 syntes först i den nya
   `scripts/_nivabild.mjs`. Sonden skriver genom appens EGEN `SaveService`; att peta i
   localStorage direkt träffar ett tomt dokument i en färsk kontext, och `profiles` är en
   array, inte en uppslagstabell.

### ✅ A4.4 — kamerans första kund: `spindel-zacke-svingar` (v1.73–76)

Kameran hade noll kunder bland de 72 spelen. Nu har den en, och `lib/kamera.js` är därmed
verifierad mot ett riktigt spel i stället för bara mot `_kameraprobe.mjs`.

**Vad som ändrades.** Gapet mellan fästena är konstant 300 px — det avstånd nivå 1–3 redan
bevisat att pendeln klarar — och nivån lägger till FÄSTEN i stället för att trycka ihop dem
(3 → 4 → 6 → 8 → 10). Världen är upp till 3400 px.

| Lager | Faktor | Innehåll |
|---|--:|---|
| `createScene('sky', { kamera: { bredd } })` | scenens band | himmel · sol · moln |
| fjärran stadssiluett | `DJUP.fjarran` (0.18) | mindre, blekare hus |
| spelplanet | 1 | tak · fästen · nät · Zacke |
| **eget fx-lager i världen** | 1 | gnistor, ord, räddningsmolnet |
| HUD | 0 | tryckytan · nätlängdsknappen |

**Fx-lagret är inte kosmetik.** `ctx.fxLayer` är skärmrymd: en `sparkle()` vid ett fäste
2000 px in i världen hade dykt upp 2000 px in på SKÄRMEN, alltså utanför bilden. Kvar på
`ctx.fxLayer` ligger bara det som hör till FINGRET (kvitteringen vid ett dött tryck).

**`kam.moveTo()` vid varje nivåstart.** Zacke teleporterar dit från förra nivåns mål, och
kamerans hårda ruta klämmer mot målets nuvarande läge — utan flytten rycker bilden med.
Det stod redan dokumenterat i `kamera.js`; det här är första gången ett spel behövde det.

**Nytt i `kamera.js`: `setWorld(w, h)`.** Lagren ritas för den bredaste världen EN gång —
att rita om dem per nivå vore att baka nya texturer mitt i leken. `setWorld` klämmer bara
hur långt kameran får panorera, så en kort bana aldrig visar tom stad till höger om målet.
Nivå 0 får därmed en 1280 px värld och en kamera som står helt stilla: **exakt samma bild
som före ändringen.**

**Mätt** med nya `scripts/_varldprobe.mjs` — parallax går per definition inte att bedöma i
EN stillbild, två lager som står still ser likadana ut som två som rör sig olika fort:

| | nivå 0 | nivå 8 |
|---|--:|--:|
| fästen | 3 | 10 |
| världsbredd | 1280 px | 3320 px |
| sista fästet | x 800 | **x 2900** |
| gap | 300 px | 300 px |

Under fem hopp rörde sig kameran 1045 px medan fjärranbandet rörde sig 188 px — **kvot
0,18, precis lagerfaktorn** — och HUD:en 0 px. Zacke låg utanför bilden i **0 av 130
prover** (hårda rutan). `_svingprobe.mjs` fortsatt 7/7 grön, alltså spelar spelet likadant
som förut på de låga nivåerna.

**Och ett dygn ovanpå det (v1.74.0).** Stämningen följer nivån — `dag → morgon → skymning →
kväll → natt`, sedan om (`nivå % 5`) — byggd på `createScene`s befintliga `tid`-tonning plus
`night`. Husens kropp och deras fönster tintas SEPARAT och åt motsatta håll
(`0xffffff → 0x6f77ad` mot `0xfff6d0 → 0xffd95c`): en enda tint hade släckt fönstren i samma
andetag som väggen mörknade. Nytt i `kamera.js`: **`byteScen()`**, eftersom scenens band ÄR
kamerans understa lager och ligger i `_layers` — de gamla måste plockas ur listan, annars
flyttar kameran osynliga containrar varje bildruta. `adopt()` lägger numera in dem med
`addChildAt`; kontraktet sa redan "understa", men det råkade stämma bara så länge `adopt`
var det första anropet. Uppmätt: lagerantalet står still på **14 över sex nivåbyten**.

**Och spelets hela Variation-sektion avbockad (v1.75.0).** Stadsdelen blir finare åt höger
(fönster → balkongräcken → spira vid `narhet` 0,34 / 0,52 / 0,62 / 0,78) och fästena glöder
starkare mot kattungen (`i / (count − 1)`, additivt och skalat med stämningen). Höjden rörs
inte: `ROOF_Y` är fångstgolv och kattungen sitter på `ROOF_Y − 46`. Fågel, ballong och stjärna
hänger mellan fästena och ger ett pling ur en pentatonisk stege.
**Sonden fällde den första placeringen:** ett höjdband satt på känsla (y 246–330) gjorde att
1 av 2 PASSERADE saker aldrig kunde plockas — flykten stiger bara ~22 px med kort nät, så
toppen ligger kring y 302. Nu simuleras båda nätlängdernas banor med samma integrator som
spök-bågen och saken hamnar mitt emellan deras närmaste punkter: räckbar av konstruktion.
`_varldprobe.mjs` är nu 13/13, och tar också en bild MITT I FLYKTEN — posen och fart-strecken
finns bara där, och testsvitens skärmdump fångar dem aldrig.

**Juice-punkten med (v1.76.0):** flygposen ritas om vid släpp (armarna fram, benen ihop) och
kroppen vrids mot `atan2(vy,vx) + π/2`, klämt så han aldrig dyker som om han störtade.
Fart-strecken bor i figurens EGNA koordinater och följer därför vridningen gratis.

<details>
<summary>De övriga kandidaterna (utredda, inte byggda)</summary>

Kandidaterna genomgångna (18 spel lästa mot C6:s begränsning att lagren är låsta i
höjdled). Rangordning:

1. **`spindel-zacke-svingar` — klart starkast.** Rad 181–182 klämmer banan till
   `Math.min(cfg.gap, 920 / (count - 1))`: världen är hårdklämd till 920 px, och
   progressionen gör banan **kortare per hopp** (nivå 1 = 3 fästen à 300 px, nivå 6 = 6 à
   184). Barnet ser kattungen redan från första svinget. Allt vertikalt ligger i ett smalt
   band (fästen 180–240, tak 540–720), alltså ingen vertikal panorering. Tre av spelets
   egna öppna [Quick]-punkter (tak som blir finare mot målet, folk som hejar i fönstren,
   saker att nudda i flykten) blir gratis i en bred värld, och `_svingprobe.mjs` finns
   redan som regressionsnät. Största mekaniska jobbet: ~12 `ctx.fxLayer`-anrop med
   världskoordinater behöver ett eget fx-lager i världen.
2. `domino` — `nSlots = Math.min(7 + level, 13)` av rena skärmbreddsskäl; från nivå 6
   slutar spelet växa. Ett ras är helt en längd-fantasi. Men bricktråget förutsätter att
   tråg och lucka syns samtidigt → kräver ett designbeslut, inte en ren port.
3. `siffertaget` — lägst risk, docen har redan beställt det ([Quick] "Rälsen rullar").
   Ärligt: en **cutscene-kamera**, inte spelmekanik. Barnet tittar, det kör inte.
4. `golvet-ar-lava` — svag. Spelets kärna är planering, och ett gap du inte kan se kan du
   inte planera för.

Avfärdade med skäl: `enhorningen-flyger` (fejkar oändlig scroll kring en fastspikad figur
— inget ändligt mål att `follow()`), `folj-sparet` (minnesspel, off-screen-steg bryter
kärnan), `rulla-bollen-hem` (toppvy, parallax har inget att göra där), `valpens-bajs`
(förvandlar ett 1-sekundersdrag till ett ärende), samt arbetsytespelen `gravmaskinen`,
`magnet-fiske`, `kulbana`, `bowling`, `vattenvagen`.

`spindel-zacke-svingar` byggdes (se ovan). De tre övriga står kvar som möjliga nästa
kunder — `domino` är den starkaste av dem, men kräver ett designbeslut om bricktråget.

</details>
