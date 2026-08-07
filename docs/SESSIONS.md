# SESSIONS.md — sessionslogg

En post per avslutad session, **nyast överst**. Skrivs av `/avsluta`. Syftet: nästa session
(eller nästa person) ska förstå var projektet står utan att läsa chatthistorik eller git-log.

Format:

```
## ÅÅÅÅ-MM-DD · v<version>
**Byggt:** vad som gjordes, i klartext
**Commits:** <hash> <ämne> · <hash> <ämne>
**Öppet:** vad som återstår / nästa naturliga steg
```

---

## 2026-08-07 · v1.26.0 · 💩 Läckan som bara syntes när alla 71 spelen kördes

**Byggt:** `bajs-och-kiss` V5 — det sista röda i `test:all`. **Sviten är 71/71 igen.**

- **Symptomet var lätt att avfärda:** `pageerror ×112` + `tween-mot-forstort ×3` +
  `tween-lacka ×1`, men BARA i full `test:all`. Ensamt grönt, fyra parallellt grönt, alla 71
  rött — tre fulla körningar i rad. Det är inte flakigt, det är **lastberoende**.
- **Reproducerat utan att köra 71 spel:** ny sond `scripts/_bajsprobe.mjs` stryper CPU:n via
  CDP (`Emulation.setCPUThrottlingRate`) och lämnar spelet vid en rad olika tidpunkter. Det
  återskapar precis det loggen visade före kraschen — `lang-ruta 100 ms` + `fysik/svalt`, alltså
  långa bildrutor där teardown förlorar kapplöpningen. Träffbild före fixen: **~1–2 av 20
  avhopp**. Stacken pekade ut både varianten där en tween *initieras* mot ett rivet mål
  (`_addPropTween` → `get y`) och den där en *löpande* tween skriver (`render` → `set y`).
- **Grundorsak:** `destroy()` dödade tweens objekt för objekt ur en **handhållen lista** över de
  referenser spelet råkade ha kvar. Allt spelet tappat greppet om missades — t.ex. en tidigare
  bajs-vy vars plopp-tween fortfarande gled — och varje `if (!x.destroyed)`-vakt **hoppade över
  städningen i precis det läge då den behövs mest**. Kvar blev en tween som skrev `.y` på ett
  rivet objekt; Pixi v8 nollar `_position` i `destroy()`, så settern kastade varje bildruta.
  **112 konsolfel ur EN läcka.**
- **Fix:** `dodaTrad(this._root)` går igenom hela displayträdet och dödar tweens på varje nod
  (plus `.scale`/`.position`), oavsett om spelet har en referens kvar. De sparade
  proxy-tweenarna och `ctx.later`-timrarna dödas som förut — de sitter på hjälpobjekt, inte i
  trädet. Nettot är dessutom **20 rader kortare** än listan den ersätter.
- **Mätt efter:** 0 fel på 24 strypta avhopp · `npm run test bajs-och-kiss` grönt ·
  **`test:all` 71/71**.

**Commits:** `fb21221` fix(bajs-och-kiss)

**Öppet:**
- Bara **V3 `spara-linjen`** kvar i `docs/ATGARDER.md` (tommaste scenen i repot, 4,3 %
  innehåll). 8 spel kvar med 🔧. Inga öppna ägarrapporter.
- Kvarvarande varningsnivå-ledtrådar i loggen är oförändrade: `saknat-ljudklipp` (MOSS nere),
  `tryck-utan-ljud`, `dod-traffyta`, `sen-aterkoppling`.
- **Metodfynd:** "grönt ensamt, rött i mängd" är ett eget felmönster, inte flakighet. CPU-strypning
  via CDP är ett billigt sätt att framkalla det — och en `if (!x.destroyed)`-vakt före
  `killTweensOf` är alltid fel väg: att döda tweens på ett rivet objekt är ofarligt, att låta bli
  är buggen.

## 2026-08-07 · v1.25.0 · 🥤 Hällningen som aldrig flyttade en droppe

**Byggt:** `saftbaren` V4 — spelets **kärnloop** gjorde bokstavligen ingenting. "Häll ett glas
i ett annat → färgerna blandas" körde hela sekvensen snyggt (glaset åkte till rätt plats, nådde
vinkel 1,02, väntade, åkte hem) men inte en droppe lämnade glaset. Hittades i går genom en
mätning, fixat i dag.

- **Grundorsak: `TILT` och `OFFS` är samma tal sett från två håll och var aldrig mätta mot
  varandra.** Mynningen ligger på `(0, IN_TOP)` i glasets egna koordinater, så vid lutningen θ
  hamnar den `-IN_TOP·sin θ` px åt sidan och `IN_TOP·cos θ` px i höjdled från foten. Vid
  `TILT = 1,05` rad (60°) nådde saften **aldrig över läppen** — och eftersom OFFS var satt för
  den vinkeln kunde ingen av dem ändras ensam.
- **Kalibrerat mot det tal som betyder något** (`scripts/_pourtune.mjs`: fullt källglas,
  riktigt målglas, spelets egen geometri) — partiklar som hamnar **i målet** av ~103:
  `1,05 → 0` · `1,5/205 → 29` · `1,9/205 → 19` · **`2,2/100 → 77`** (spill 7) ·
  `2,4/100 → 81` · `2,6/100 → 86` (spill 13). Att hålla glaset högre mättes också och blev
  **sämre** (längre fall → mer skvätt: 59 i målet, 25–38 spill). Valt **2,2 + 100**: 75 % över,
  minst spill, minst extrem vinkel — glaset tippar förbi vågrätt som en riktig hällning.
- **Tre vägar delade konstanterna och behövde skiljas åt.** Hinken har bred öppning och vill ha
  en fritt fallande stråle → `MOUTH_DX` (178, härledd ur TILT). Bobo *dricker* — hans mun är en
  drain-ruta där saften ska ligga stilla, inte hällas på golvet → egna `SERVE_TILT/SERVE_OFFS`
  (de gamla 1,05/205, som gör exakt det).
- **Fixen skapade en egen bugg, som mätningen fångade direkt.** Ett fullt glas på väg till
  hinken tappade hela innehållet till glas 2 när det gled förbi lågt (52 partiklar blev
  liggande med medel-x 740 ≈ glas 2:s 750). Orsaken var gårdagens djup-ägarregel: den låter det
  **stående** glaset vinna när ett rörligt glas glider lågt förbi, eftersom deras inre överlappar.
  Fix: `SAFE_Y` + `_moveOver()` — ett glas som flyttar sig i sidled lyfts, bärs ovanför
  grannarna och ställs sedan ner. Ser dessutom ut som att glaset lyfts och bärs i stället för
  att glida genom disken, och `_tiltFor` fungerar äntligen för dragna glas.
- **Verifierat via spelets egna vägar** (`scripts/_pourprobe.mjs`): glas→glas **61 partiklar
  över och målet blir GRÖNT, renhet 1,00** (gul i blå — hela poängen med spelet) · glas→hink
  **58 av 58 slukade**, 0 kvar liggande · hela beställningen: Bobo serveras, dricker upp, ny
  beställning kommer.

**Commits:** `5ee202a` fix(saftbaren)

**Öppet:**
- V3 `spara-linjen` (tommaste scenen, 4,3 %). 8 spel kvar med 🔧.
- **V5 `bajs-och-kiss` är nu inringad:** undantaget är `Cannot read properties of null
  (reading 'y')` kastat **inifrån GSAP** — en tween som skriver `.y` på ett mål vars transform
  redan är rivet (`tween-mot-forstort ×3`). Föregås i loggen av `lang-ruta 100 ms` +
  `fysik/svalt steg:5`: under full parallell last blir bildrutorna långa och tweenen hinner
  före teardown. `test:all` står därför kvar på **70/71** (112 konsolfel i den körningen).
- **Metodfynd:** två gånger i rad var det *proben* som var trasig, inte spelet — först en
  hällmätning som siktade fel, sedan en som fyllde glaset med precis den färg Bobo beställt
  (spelet serverade då glaset till honom, helt korrekt). Bägge gångerna räddades av att köra
  om mot HEAD respektive isolerat. En röd sond är ett påstående, inte ett bevis.

## 2026-08-07 · v1.24.0 · 🧲 Magneten som fiskade själv + 🥤 saften som bytte glas

**Byggt:** ägarens fyra rapporterade buggar i `docs/ATGARDER.md` — alla fyra fixade, mätta
före och efter, och båda spelen hade **en gemensam grundorsak per spel**, inte fyra separata fel.

- **`magnet-fiske` #1 + #2 — krafterna var aldrig kalibrerade mot matters enheter.**
  matter räknar `velocity += (force/massa) · steg²` med steg = 16,667 ms, så en acceleration
  `a` ger `a · 277,78` px/steg direkt och `a · 4629,6` px/steg i längden (mätt mot matter-js,
  inte hämtat ur minnet). Spelets konstanter var satta som om force vore hastighet — **~280×
  för starka**.
  - #1: uppmätt **5 av 5 metallsaker fast innan första provet hann tas**, toppfart 79 px/steg,
    saker rakt igenom dammens 40 px väggar. Två fel i ett: fältet var absurt starkt OCH
    påslaget medan magneten hängde **parkerad i luften** 115 px från översta spawn-raden.
    Nu anges krafterna i px/steg (`SPEED_TO_A`) och fältet verkar bara när magneten är
    **doppad** — plask-ögonblicket betyder något. Efter: **0 av 5 efter 8 s utan input**,
    toppfart 2,6, 0 tunnling, `_idleprobe` `idleFramsteg: 0`.
  - #2: fastklistrade kroppar pinnas till sin slot varje bildruta men **krockade** fortfarande
    — slottarna ligger 38 px isär, kropparna har 38 px radie, så solvern sprängde isär klasen
    varje steg och nästa bildruta teleporterades den tillbaka. Uppmätt **53 px svängning,
    47 px hopp mellan bildrutor** med magneten stilla → **0,1 px** efter `isSensor`.
- **`saftbaren` #3 + #4 — två tillstånd som satt på fel objekt.**
  - #3: `_lastMix` satt på SPELET i stället för på glaset, så två glas med var sin blandfärg
    pingpongade värdet var 12:e bildruta och varje växling utlöste både `reveal` och en
    röstreplik. Uppmätt **48 ljud + 48 repliker på 5 s helt utan input** → **1 + 1**.
  - #4: ägarregeln `it.g.y > own.y` ("lägsta glaset vinner") kan aldrig utse en vinnare mellan
    två glas i **samma** höjd — och ett draget glas låg kvar på disken. Jämförelsen blev falsk
    varje gång och ägarskapet föll tillbaka på ordningen i `_glasses`: glas 0 draget förbi
    glas 2 tog **hela innehållet, 56 av 56**. Hållna glas lyfts nu (`HALL_Y`) och ägaren är
    det glas partikeln ligger **djupast** inne i → **0 stulna**. Lyftet rättade en tyst bugg
    till: `_tiltFor` kräver `g.y < o.y - 120`, så ett draget glas lutade sig **aldrig** förut.

**Commits:** `1e3f20a` fix(magnet-fiske) · `dd6b3aa` fix(saftbaren)

**Öppet:**
- **NYTT: `saftbaren` V4 — hällningen flyttar noll vätska.** Spelets kärnloop gör ingenting:
  hela sekvensen körs snyggt (rätt plats, vinkel 1,02, väntan, hem igen) men inte en droppe
  lämnar glaset. `TILT = 1,05 rad` ligger under tröskeln för glasets geometri —
  `scripts/_tiltprobe.mjs` på 103 partiklar: **1,05 → 0 rann ur**, 1,2 → 1, **1,35 → 19**,
  1,5 → 23. Verifierat på HEAD, alltså inget nytt fel, och medvetet **inte** fixat här
  (utanför `/fixa`-uppdraget). En större `TILT` kräver att `OFFS = 205` mäts om samtidigt.
- **NYTT: `bajs-och-kiss` (V5) faller bara i FULL `test:all`** — `pageerror ×3` +
  `tween-lacka ×2` + `tween-mot-forstort ×2`. Ensamt grönt, fyra parallellt grönt, alla 71
  rött i två körningar i rad → last-/timingberoende i exit-cykeln, inte slumpflak. Orört av
  dagens commits (de rör bara `magnet-fiske` + `saftbaren`). **`test:all` står alltså på
  70/71**, inte 71/71 som efter v1.22.0.
- Oförändrat: V3 `spara-linjen` (tommaste scenen), 8 spel kvar med 🔧 (`pruttbad` ·
  `vippbradan` · `domino` · `spindelhjalten` · `enhorningen-elvira` · `tvatta-djuret` ·
  `spindel-zacke-svingar` · `glittergrottan`).
- **Metodfynd, tredje gången på tre sessioner:** inget av dagens fyra fel syntes i konsolen
  eller på skärmdumpen. Alla fyra föll ut ur en **sond som spelade spelet och läste siffror**
  (`_magnetprobe`, `_saftprobe`, `_tiltprobe`, `_idleprobe`). Två av ATGARDERs fyra "första
  spår" pekade dessutom fel — reproduktionskravet i `/fixa` gjorde nytta.

## 2026-08-07 · v1.23.0 · ❄️ Snöfälten som aldrig gick att se

**Byggt:**
- **`snobollen` 🔧 → ✅.** Frågan var om spelet bara saknade sin ✅-rad i indexet (det
  polerades i `13a8cbd`). Svaret: nej — dess **enda sätt att växa var osynligt**.
- Snöfälten renderades med **vågrät skala i tusental** och en skjuvning på hundratals, så de
  smetades ut till en blek hinna över backen i stället för vita fläckar att styra mot. Uppmätt
  `worldTransform` på ett fält: **a = 3660 (fältets världs-x!), c = 591 (fältets y!)** — trots
  `scale.x = 1` i hela föräldrakedjan.
- **Rotorsak: ett namn.** `_addField` sparade världspositionen i `f._cx` / `f._cy`. Det är Pixi
  v8:s **egna** fält i `Container` — den cachade cosinus/sinus för rotationen — och
  `updateLocalTransform()` räknar `lt.a = _cx * scale.x`. Spelet skrev rakt in i renderarens
  transform-cache. Ingen krasch, inget konsolfel, grönt test: bara osynliga spelobjekt.
  Omgången 2026-07-30 fixade *symptomet* (bakade in världspositionen i geometrin) men lämnade
  namnkrocken kvar — därav den återkommande "slät vit platta"-känslan.
- Efter fixen (`_wx`/`_wy`): `worldTransform` a=1, c=0; ett fälts bounds **126×101 px** (var
  579 048 px brett), `_fieldLayer` 4 084 px (var 20 395 341), `_root` 5 669 = banans längd.
- **Klassfix:** `check.mjs` felar nu på varje `<objekt>._cx/_cy/_sx/_sy/_position/_scale/_pivot/
  _origin/_skew/_rotation/_updateFlags/_worldTransform/_maskEffect/_filterEffect =` i ett spel.
  Verifierat åt båda håll: regeln faller på den gamla koden, är tyst på den nya. Hela repot är
  rent — snöbollen var enda träffen.

**Commits:** `8d6d579` fix(snobollen): snofalten var osynliga

**Öppet:**
- Kvar med 🔧: `pruttbad` · `vippbradan` · `domino` · `spindelhjalten` · `enhorningen-elvira` ·
  `tvatta-djuret` · `spindel-zacke-svingar` · `glittergrottan` (8 st).
- Oförändrat: ägarens fyra buggar i `magnet-fiske`/`saftbaren`, V3 `spara-linjen`.
- **Metodfynd:** två av dagens tre buggar (NaN-kropparna och snöfälten) var osynliga för både
  konsolen och skärmdumpen men uppenbara i en **bounds-/transform-mätning**. Överväg att lägga
  en `utanfor-rimligt`-kontroll i `gamelog` (ett objekt vars bounds är tiotusentals px brett).

## 2026-08-07 · v1.22.0 · 🧱 Klossarna som försvann i tomma intet

**Byggt:**
- **`bygg-tornet` gick inte att spela klart** — diagnostikloggen visade `nan-kropp ×5` och
  `nan-transform ×6` per körning, helt utan konsolfel, och harnessen sa grönt hela tiden.
- **Grundorsaken låg i det delade fysikbiblioteket, inte i spelet.** En matter-kropp som
  *skapas* med `{ isStatic: true }` i sina options får flaggan satt som en vanlig egenskap —
  `Body.setStatic()` körs aldrig, så `_original` (massa · tröghet · densitet) fångas **aldrig**.
  Ett senare `Body.setStatic(kropp, false)` hittar då inget att återställa: kroppen blir
  dynamisk med massa OCH tröghet kvar på `Infinity`, och första simsteget räknar
  `Infinity/Infinity` = NaN. Kroppen teleporteras till NaN, dess länkade Pixi-vy följer med.
- I spelet betydde det att **varje kloss försvann i släppet**: `_settleActive` jämförde NaN mot
  tröskeln, alla jämförelser blev falska, klossen räknades som en miss — tornet kunde aldrig
  växa. Ett barn hade sett en kloss lyftas upp av kranen och sedan bara upphöra.
- `PhysicsWorld.rectangle/circle/polygon` skapar nu alltid kroppen dynamisk och sätter
  `isStatic` **efteråt**. Sex spel skapar statiska kroppar och väcker dem senare:
  `bygg-tornet` · `flipperspel` · `knuffa-tornet` · `kulbana` · `snobollen` · `studsmatta`.
- Ny sond: `scripts/_nanprobe.mjs` spelar ett spel med riktiga tryck och läser spelets **egna
  fält** var 100:e ms — första bildrutan där något blir NaN skrivs ut med hela tillståndet
  runtomkring. Den pekade ut exakt bildruta och fält på under en minut.

**Commits:** `fe45a2f` fix(fysik): kroppar som skapas statiska gick aldrig att vacka

**Öppet:**
- Samma som v1.21.0 (hög 3 med 9 🔧-spel, ägarens fyra buggar i `magnet-fiske`/`saftbaren`,
  V3 `spara-linjen`), minus NaN-fyndet. **Repot har nu 0 fel-nivåfynd i hela `test:all`.**
- Kvarvarande varningsnivå-ledtrådar i loggen: `tryck-utan-ljud` (9 spel), `dod-traffyta` (4),
  `sen-aterkoppling` (6), `saknat-ljudklipp` (5, MOSS-pipelinen ligger nere).

## 2026-08-07 · v1.21.0 · 🔊 Röstklippen som aldrig spelades + 💥 Knuffa Tornet får sitt pussel

**Byggt:**
- **V1 — introt talades av robotrösten fast klippet fanns.** `VoiceService` hämtar manifestet
  asynkront i konstruktorn medan spelen säger sin `voiceIntro` vid mount: ett spel som startade
  under de första millisekunderna föll därför ALLTID till Web Speech. `say()` skjuter nu upp
  repliken tills manifestet landat (tak 1500 ms så en hängande fetch aldrig tystar appen), och
  `cancel()` ogiltigförklarar en väntande replik så inget börjar tala efter att spelet lämnats.
  `gamelog` dömde likadant i blindo — loggraden skrivs i tid, fyndet väntar in manifestet.
  **Mätt: 16 spel / 17 träffar `rost-utan-klipp` → 0 av 71.**
- **V2 — repliker som byggs vid körning var osynliga för kontrollen.** Template-repliker
  (en `voice.say` med backtick och `${...}` i) kan omöjligt slås upp statiskt; de räknas nu
  bara (27 st) och
  verifieras där sanningen finns: `check.mjs` läser `rost-utan-klipp` ur `.test-logs/<id>.json`
  och varnar för den EXAKTA text körningen sa. Backtick utan `${}` läses som vanlig literal
  (var helt osynlig förut). Första körningen: **4 äkta luckor, noll falska** — "Lätt vikt!" +
  "Tung vikt!" (`vippbradan`, där `voice-phrases.json` hade Liten/Stor medan etiketterna heter
  Lätt/Tung), "Nästan!" (`bygg-tornet`) och "en" (`ballonglyft`). Alla fyra har klipp nu.
- **💥 Knuffa Tornet, hög 2 (variation & agens) — 🔧 → ✅.** Hjälpen **bjuder in** i stället för
  att spela klart: efter två missar ställs kulan i perfekt läge med kranen siktad på närmaste
  kvarvarande kloss och blinkar i en gul ring; spelet svingar själv först efter 7 s. Fem
  tornformer roterar per nivå (torn · trappa · port · pyramid · dubbel). Tre specialklossar —
  sten, gummi, glas — gör valet av tyngd och rep till ett pussel, och står bara sten kvar
  pekar spelet på tyngdknappen i stället för att ta över. Mätaren är en prick per kloss
  (kronan sist). Finishen är spelets egen: dammoln längs avsatsen → flagga hissas till en
  durtreklang → Bobo jublar → konfetti.

**Fem balansfynd som inget grönt test hade visat** (`scripts/_tornprobe.mjs` spelar varje nivå):
1. **Repets längd var hela balansen.** 330 px lade kulans underkant 24 px OVANFÖR understa
   klossraden — ett fullt sving nöp bara toppen. 348 halverade antalet svingar per nivå.
2. **Friktion 0,7/1,4 limmade ihop stapeln** så tornet gled 80 px i sidled per sving i stället
   för att rasa.
3. **Springan mellan avsatsen och skärmkanten var exakt en kloss bred** — en kloss kilade fast
   där och räknades aldrig som nere. Målet mäts nu i x ("av avsatsen"), inte bara i fallhöjd.
4. **En hjälp som siktar på den bortersta klossen flyttar kranen och lämnar den där** (nivå 1
   gick 4 → 8 svingar). Sikta på den närmaste.
5. **`_drawChain` måste ritas sist i bildrutan** — `_freezeBall` teleporterar kulan efter att
   repet ritats, vilket frös fast på varje skärmdump som ett rep hängande bredvid kulan.

**Commits:** `ec21e80` fix(rost): vanta in klippmanifestet fore say() · `a7edc8c` docs: V1+V2
till Avklarat · `52bd308` feat(knuffa-tornet): variation och agens

**Öppet:**
- **Poleringskampanjen fortsätter.** Hög 2 är klar (6/6). Indexet visar fortfarande **9 spel
  med 🔧**: `pruttbad` · `vippbradan` · `domino` · `spindelhjalten` · `enhorningen-elvira` ·
  `tvatta-djuret` · `spindel-zacke-svingar` · `snobollen` · `glittergrottan`. Notera att
  **snobollen redan polerats** (13a8cbd) — antingen missades indexraden eller så saknas en
  grindpunkt; kolla dess doc §5 innan den köas om.
- `docs/ATGARDER.md`: V3 (`spara-linjen`, tommaste scenen i repot) är kvar, plus ägarens fyra
  rapporterade buggar i `magnet-fiske` och `saftbaren`.
- Knuffa Tornet flaggar ibland `tween-per-ruta` (~125) i bildrutan där vinsten infaller. Det är
  firandets engångsskur, inte en tween per bildruta.

## 2026-08-06 · v1.18.0 · 🚜 Grävmaskinen: fem laster, och två mätare som ljög (polerings-hög 2, 5/6)

**Byggt:**
- **Fem laster i stället för en** — sand · grus · snö · småsten · godisströssel turas om per
  nivå. Varje last har egen palett (**även högen man gräver ur byter färg** — snönivån har en
  snöhög, godisnivån en regnbågshög), egen kornform, egna skatter, egna ljud och egna
  repliker. Sandens fyra repliker är oförändrade strängar eftersom de redan hade klipp.
- **Egen rasvinkel per last.** Branta laster (snö, småsten) kräver **två cellers fall** för
  att glida i sidled och bygger spetsiga koner; lösa laster lägger sig platt. Regeln är
  deterministisk med flit — en *sannolikhet* hade bara fördröjt utplaningen, eftersom ett
  vilande korn får ett nytt tärningskast varje simsteg.
- **Auto-hjälpen mjukad + tap-fusket borta.** Triggern "4 tippningar" sköt in magi mitt i
  aktivt spel och är borttagen; kvar är 14 s **helt** utan handling **och** lasten minst 55 %
  färdig → högst 14 korn, målet sänks aldrig. Tap vid högen gräver nu på riktigt.
- **Agens i gesten:** fyllnaden skalar med svepets längd *och* djupet (djupt tag ≈ 3× ett
  ytskrap); lugn hand vid släpp ger tät stråle, ryck ger bred spridning — aldrig en
  tillsägelse när det blir slarvigt.
- **Ny finish + mottagare:** fylld dumper kör iväg med lasten, en tom **backar in från höger**
  (från vänster hade den kört rakt genom grävmaskinen), Bobo vinkar från hytten. Bommen är nu
  bom + knäled + sticka med hydraulcylinder som sjunker med lastens vikt; Zacke andas och
  lutar sig mot grävtaget. Grävmaskinen 🔧 → ✅.

**Fyra fynd som gröna tester aldrig hade visat:**
1. **Fyllnadslinjen ljög.** Målet var 55 korn ≈ 2,4 rader medan linjen satt 6 rader upp —
   `total >= target` slog alltid först och linjen var ren dekoration. Linjen härleds nu ur
   målet.
2. **"Full last" räknade korn i LUFTEN.** `_countFill` räknade fallande korn, så en enda hög
   tippning kunde klara nivån direkt — harnessen klarade nivå 0 på **3,4 sekunder** och
   rapporterade ändå grönt. Nu räknas bara korn som vilar.
3. **Mätaren var osynlig på snönivån** — den ärvde lastens färg, och vitt på gräddvitt syns
   inte. Hittad i skärmdumpen, inte i något test.
4. **Mätaren stod på 45 % när spelet sa "full last"** — två indikatorer som säger olika saker
   är värre än en som ljuger. Den visar nu den av de två vägarna till full last som kommit
   längst.

**Metod:** `scripts/_lastprobe.mjs` (sond som *spelar*: gräver, kör över flaket, släpper) gav
balansen sand 4 lass · grus 4 · snö 3 · småsten 3 · godis 6, och en bild per last.
`scripts/_exitprobe.mjs` testar det harnessens standardcykel aldrig hinner till: att lämna
spelet **mitt i** den 3 s långa leveransen (rent i alla tre faser).

**Commits:** 6f2195d feat(gravmaskinen) · a0d538c chore(rost): 48 röstklipp genererade

**Öppet:** hög 2 har **1 kvar: knuffa-tornet**. Därefter hög 3 (finish, ~3 spel). Rapporterade
buggar i `docs/ATGARDER.md` väntar fortfarande (magnet-fiske, saftbaren).

---

## 2026-08-06 · v1.17.0 · 🍦 Glasstornet: kärlet byter per nivå (polerings-hög 2, 4/6)

**Byggt:**
- **Kärl-cykel per nivå** — våffelstrut → bägare → skål. Skillnaden är **fysik**, inte bara
  utseende: skålen har jättebred mynning men låg kant (nästan omöjligt att missa, men hela
  tornet står i blåsten), bägaren smalare mynning men höga raka väggar som håller de två
  nedersta kulorna stilla. `_buildVessel()` river och bygger om de statiska kropparna per
  torn; `mouthR`/`columnMax` följer med så siktguiden alltid talar sanning. Rösten säger
  vilket kärl som står framme. Verifierat hela vägen: strut(3) → bägare(4) → skål(4).
- **Topping-överraskningar** — sällsynt **regnbågskula** (~1/9, egen Graphics per band) som
  glittrar medan den bärs och smäller av i färgexplosion + treklang; annars ibland
  **strössel** eller **såsdrypning** som ligger KVAR på kulan. Tak: en per kula.
  **Strösselregn** över den färdiga glassen — finishen är glass-egen.
- **Hjälpen delad i två steg (docens hög-2-punkt).** Tre bortblåsta i rad ger bara
  **klister**; **magneten går bara till den sista kulan** och är kapad. Efter två bortblåsta
  **blinkar honungsburken** och rösten berättar vad den gör — hjälp som *lär ut kontrollen*
  i stället för att bygga tornet. Glasstornet 🔧 → ✅ (alla 8 grindpunkter).

**Tre fynd som gröna tester aldrig hade visat** (hittade med en Playwright-sond som spelar
med spelets **egen** `_predictLanding` och mäter mot en HEAD-baseline):
1. **`frictionStatic` (matter-default 0,5) är det som håller en kula kvar på en slänt** —
   låg `friction` ensamt räcker inte. Skålens grunda slänt parkerade kulorna så att två
   hamnade **i bredd**, vilket bryter hela "ETT torn"-idén.
2. **En kula som kilar fast på en annans axel** (dy≈63 i stället för 84) låser tornet snett,
   och sedan finns **ingen giltig plats kvar** för nästa kula. Bygget blev obyggbart utan
   att något såg trasigt ut — testet var grönt hela tiden. Sådana landningar glider nu av.
3. **`frictionAir` EFTER nedslaget avgör om kulan stannar**, inte friktionen mot underlaget:
   det är farten kulan har kvar (plus vinden) som rullar av den. `SCOOP_STICKY` 0,02 →
   **0,055** gjorde honungen till spelets verkliga lösning. Med honung tar ett torn 5–6
   släpp (strut 5 · bägare 5 · skål 6) mot HEAD-baselinens 6 för *tre* kulor — alltså
   snällare än förut, trots att den automatiska magneten dragits tillbaka.

**Metod värd att återanvända:** när en balansändring ska bedömas, **mät mot HEAD**. Första
versionen av den mjukare hjälpen kändes rimlig i koden men tog 14 släpp utan att bli klar —
det syntes bara genom att köra samma sond mot `git show HEAD:...`.

**Även i denna session (utanför poleringskörningen):**
- **Agentregeln ändrad** — det tidigare totalförbudet mot att starta subagenter oombett är
  ersatt av **upp till 3 subagenter**; fler kräver att ägaren frågas. Workflows och
  deep-research kräver fortfarande en förfrågan. Regeln står nu i `CLAUDE.md` (Arbetsregler).
  Obs: originalformuleringen ligger inte i någon fil i repot eller i `~/.claude/settings.json`
  — den injiceras av harnessen vid start, så den kan dyka upp igen; `CLAUDE.md` går före.
- **`docs/ATGARDER.md` — ny stående åtgärdslista** för buggar ägaren rapporterar när hen
  spelar (återupptar formatet från den avbetade `bugfixes-progress.md`). Fyra öppna rader:
  `magnet-fiske` (allt sitter redan fast i magneten vid start · fastklistrade saker skakar)
  och `saftbaren` (ljudet hakar upp sig efter färgbyte · vätskan följer med glas som dras
  förbi). Varje rad har ett **första spår** från kodläsning, märkt som ledtråd och inte som
  diagnos — `/fixa` ska reproducera i harnessen först. Två observationer värda att spara:
  magnetfiskets spawn-ruta ligger *långt* utanför fastna-radien, så startbuggen är troligen
  inte överlapp; och saftbarens `_carryAll()` har redan en ägarregel vars egen kommentar
  säger att den ska hindra exakt det som händer — det är en **trasig** fix, inte en saknad.

**Commits:** a3628ec feat(glasstornet) · 9031c0c docs v1.17.0 · 4c91f11 sessionslogg ·
f71dbba docs agentregel · cb622fc docs åtgärdslista
**Öppet:** hög 2 har 2 kvar (`gravmaskinen`, `knuffa-tornet`), sedan hög 3 (finish, ~3 spel).
Glasstornets kvarvarande §4: [Deep] smak-staplings-mål, [Medium] kund-kö, [Quick] ambient.
De fyra raderna i `docs/ATGARDER.md` är ett naturligt `/fixa`-pass när som helst.
6 repliker väntar på klipp — kör `/rost` när narratorn är uppe.

---

## 2026-08-06 · v1.16.0 · 🔍 Diagnostiklogg + snöbollens banvariation (polerings-hög 2, 3/6)

**Byggt:**
- **Diagnostiklogg (`src/lib/gamelog.js`) — ny, DEV-only.** Spelar in input, utdata, fysik,
  rendering, motorernas interna läge (matter · Pixi · GSAP · three) och fel, kopplad på de
  **delade chokepoints** så att inget av de 71 spelen behövde ändras: GameHost (livscykel,
  progress, timers), en global pointer-capture på `window` (fångstfas — Pixis egen lyssnare
  ligger på canvasen och kör annars FÖRE oss, vilket förskjuter varje svarstid ett helt
  tryck), `PhysicsWorld`, `DragController`, `drawIcon`, `AimLauncher`, `ThreeLayer`
  (`renderer.info`) och en patch på `gsap.to/from/fromTo/timeline/delayedCall`.
  Ovanpå råloggen ligger **16 härledda fynd**: `dod-traffyta`, `tryck-utan-ljud`,
  `sen-aterkoppling`, `saknad-ikon`, `rost-utan-klipp`, `saknat-ljudklipp`, `tween-lacka`
  (animation som lever efter destroy), `forstort-i-scen`, `nan-transform`, `utanfor-bild`,
  `tom-scen`, `snal-snappyta`, `kropp-rymde`, `fysik-svalt`, `tween-per-ruta`, `scen-svall`.
  Harnessen hämtar loggen efter varje körning → `.test-logs/<id>.json`, och `npm run test`
  listar fynden per spel. **Noll kostnad i produktion:** `import.meta.env.DEV` foldas till
  `false` och minifieraren slänger kroppen — grep efter diagnostiksträngar i `dist/assets`
  ger noll träffar. Inga nätanrop, inget till localStorage (P0 "ingen spårning").
- **Första skörden (71/71 gröna, alltså osynligt för konsolfel):** 15 spel med
  `rost-utan-klipp`, `sapbubblor` 9× `saknat-ljudklipp`, 10 spel med `tryck-utan-ljud`,
  3 med `dod-traffyta`, `fallskarmen` 175 nya tweens/500 ms.
- **`vandkort` — tyst tryck fixat.** `_flip()` bortade tidigt på `_busy`/`_flipped`/`_done`
  **före** ripple och flip-ljudet: under jämförelsepausen och på redan vända/färdiga kort
  gav ett tryck ingenting alls (P0-brott). Nu svarar kortet med `wiggle` + mjuk ton, och
  ett glatt pling på ett färdigt par.
- **`snobollen` — banvariation + rotorsaken till den vita backen.** Varje bana lottar väder
  (sol/snöyra/kvällsljus/gryning) och layoutprofil (jämn/myllrande/öppen/snörik), aldrig
  samma två i rad. **Och:** backens djupgradient har aldrig synts — inte för att den
  saknades, utan för att **snöfälten var upp till 476 000 px breda** (naken `Graphics`
  ritad kring origo + stor `.position`, samma fälla som minnesnotisen
  `pixi-graphics-position-bar-bug`) och lade en vit matta över hela skärmen; dessutom
  ritades de fem djupbanden i EN `Graphics`, vilket gav hela backen det första bandets färg.
  Båda fixade. Snöfältets `sparkle` bytt mot en snö-virvel som sugs in i bollen.

**Commits:** dfa5189 diagnostiklogg · 6587680 vandkort-fix · 13a8cbd snobollen banvariation ·
ecb6f97 docs v1.16.0

**Öppet:**
- Polerings-hög 2 fortsätter: **4/6 glasstornet**, sedan gravmaskinen och knuffa-tornet
  (alla "mjuka upp auto-hjälpen + nivåvariation" — kontrollera först mot koden, snöbollens
  auto-hjälp visade sig redan vara gjord och docens §1/§3 var inaktuell).
- Loggens fynd är **inte** åtgärdade: `tryck-utan-ljud` i 10 spel och `dod-traffyta` i
  `harma-melodin`, `vad-forsvann`, `vilket-djur-later` är obekräftade ledtrådar som behöver
  läsas mot koden (vandkort-fyndet visade sig vara äkta).
- `sapbubblor` spelar `audio.sample()` utan klipp 9 gånger → helt tyst; kör `/rost`.
- `spelkritiker`-steget hoppades över i den här omgången (subagent ej körd) — kör det gärna
  på `snobollen` innan hög 2 fortsätter.

## 2026-08-06 · v1.14.0 · 🎰 Flipperspelet fick en bana (polerings-hög 2, 2/6)

**Byggt:**
- **Återupptagen körning.** 17 okommitterade filer visade sig vara en **`FONT`/`Text`-
  importrensning** i 15 spel (uppföljning på lärdomen att `FONT` är ett *objekt*, så en
  kvarglömd import lockar till `fontFamily: FONT` som kraschar `Text` först vid rendering)
  plus två riktiga layoutfixar: **knuffa-tornet** (kranens mast slutade i luften på y≈492)
  och **saftbaren** (ytterflaskorna låg bakom hem-/ljudknappen, flaskhalsarna kapades av
  skärmkanten). Allt verifierat och committat.
- **`flipperspel` — 🔧 → ✅.** Bordet var ett platt fält av identiska stjärndynor; nu är det
  en bana: **snurra** ovanför dränet, **två studsfenor** i det döda bandet, **tunnel** (två
  hål i sidoväggarna), **tre ritade dynetyper** (stjärna/klocka/blomma med egen silhuett,
  studs och klangfärg) och ett **eget showläge** som finish — kulan lyfts ur banan upp till
  Bobo som fångar den och kastar konfettin. `bigCelebration` är borta.
- **Buggar hittade på vägen:** `_toggleTilt` satte `.text` på `_tiltIcon`, som blev en
  `Graphics` 2026-08-04 — en no-op, så Lugnt-läget visade en blixt. Och `sfx('flip')` /
  `sfx('pling')` fanns aldrig i ljudmanifestet; nu används de riktiga klippen `thwip`,
  `boing` och `whoosh` som redan låg oanvända.

**Lärdomar (fysik med banelement):**
- Tunnelmynningar på **samma höjd** gör tunneln till en loop — den utspottade kulan flyger
  tvärs över rakt in i den andra. 17 tunnelresor och **noll** paddelkickar på 40 s.
- En **svag** studsfena är värre än ingen: 9,5 i kick lyfte kulan ~50 px och den föll rakt
  ner på samma fena igen. Fenan måste nå upp i dyn-fältet (17).
- Placeringsregeln allt vilar på: inget par av ytor får bilda en **nedåt smalnande kil**.
  Varje passage ska vara bredare än 100 px hela vägen eller helt tätad (< 56 px = kulans
  bredd). Mellanlägen klämmer fast kulan.
- **Sond-gotcha:** `import('/src/games/<id>/index.js')` i webbläsaren ger en EGEN
  modulinstans i Vite dev. Den levande hämtas via
  `(await import('/src/games/registry.js')).getGame(id)`.

**Commits:** `80fa204` fix(knuffa-tornet) · `23ee542` fix(saftbaren) · `c68113c` chore:
FONT/Text-rensning i 15 spel · `bafa0a0` feat(flipperspel) · `1c4be18` docs(flipperspel) ·
`97913e5` chore: v1.14.0

**Öppet:** Polerings-hög 2 fortsätter — kvar: **snobollen, glasstornet, gravmaskinen,
knuffa-tornet** (alla har "mjuka upp auto-hjälpen" + nivåvariation i sin doc §4). Sedan
hög 3 (finish, ~3 spel). `.claude/settings.json` är ändrad (plugin-konfig) men medvetet
inte committad. 29 röstrepliker väntar på `/rost`.

---

## 2026-08-06 · v1.13.0 · 💧 Vätskemotor + Saftbaren (spel 71)

**Byggt:**
- **`src/lib/vatska.js`** — ny vätskemotor. Partikelvätska (double density relaxation) i
  px/steg med fast 1/60-steg, spatial hash, typade arrayer, roterbara låd-kollidrar och
  metaboll-rendering (mjuka klickar → sudd → tröskelfilter). Uppmätt i riktig Chrome:
  0,25 ms/bildruta vid 200 partiklar · 0,54 vid 400 · 1,12 vid 800 · 5,3 vid 3000, full
  60 fps hela vägen. Ingen befintlig motor kunde detta (matter/p2 är stelkroppar, three har
  bara ytshaders, liquidfun är övergivet).
- **`saftbaren`** (spel 71, Fysik-fliken) — fyra glas, kran på skena, färgspak, hink och Bobo
  som beställer. Häll mellan glasen → färgerna späds i vätskan: gul + blå blir grön. Bobo
  dricker upp den beställda färgen (partikel för partikel, stigande ton) och rapar en färgad
  bubbla. Droppstorleks-toggel för lek.
- Motorn utökades under bygget med **färg per partikel** (`world.pal` + `FluidView.palette`),
  **ingrediens-kanaler** (`setChannels` — riktig utspädning, mängden bevaras) och
  **roterade kärlväggar** (`addBox(..., angle)`).

**Tre buggar som kostade tid (nu dokumenterade i skill fysik-spel):**
1. `Filter.from` fyller inte i någon vertex-shader — skicka `defaultFilterVert`.
2. En skenande partikel som blir `NaN` spränger filtrets renderingstextur → 0,5 fps.
   Fix: hastighetstak, tak på viskositetens kvadratterm, `Number.isFinite`-vakt, låst
   `boundsArea`.
3. Ett kärl som flyttas måste **bära med sig sin vätska** (annars står saften kvar i luften),
   och varje partikel behöver EN ägare — annars stjäl ett glas som flyger förbi innehållet ur
   ett som står stilla.

**Öppet:**
- Röstklipp: 11 nya repliker väntar → kör `/rost` när narratorn är uppe (Web Speech täcker upp).
- `docs/IDEER.md` har två oplanerade idéer: ansiktssektionen (foton som spelfigur) och
  nätskott från bilfönstret.
- Oavslutad `/polera figurer`-körning ligger kvar i `.claude/state/korning.json`.

## 2026-08-06 · v1.12.0 · ⚙️ Mottagar-högen — 8 spel fick någon som bryr sig

**Byggt:** start på kvalitetsspåret "20 spel från 🔧 till ✅". De 20 spelen visade sig falla i
tre arbetshögar i stället för att vara 20 separata jobb; **hög 1 (mottagare) är nu klar** och
lyfte 6 spel hela vägen till ✅ kvalitet.

- **Nytt delat `src/lib/figurer.js`.** `makeMascot()` ger bara ett HUVUD, så fem spel hade
  hunnit rita var sin Bobo-kropp med nästan samma geometri. Biblioteket har nu `makeBobo`
  (proportioner tagna ur vippbradans kropp, den renaste av dem), `makeElvira` och
  `makeSquirrel`. De fyra äldre spelen migrerades medvetet INTE — deras kroppar är handtrimmade
  mot sin scen och en omskrivning riskerar regression utan vinst för spelaren.
- **Åtta spel fick en mottagare eller en egen reaktion:** Bobo som puttar gungan och mål som
  *hoppar* när Lova närmar sig (`gungan`) · Bobo som vinkar in föraren och fångar, och som
  följer mattan när den flyttar sig per nivå (`fallskarmen`) · parkgrind + Lova som hejar
  (`valpens-bajs`) · picknick där varje fångad morot flyger till korgen som fylls synligt
  (`studsmatta`) · arbetar-Bobo med bygghjälm (`knuffa-tornet`) · kryp som kryper mot en
  spricka i stället för att rycka slumpmässigt, plus hjälten som hoppar i nätet
  (`spindelnatet`) · Elvira som RIDER enhörningen och ringar som brister i sin egen färg
  (`enhorningen-flyger`) · "Uff!" vid väggstuds och en hjälte som hänger upp-och-ner i sin
  egen tråd vid vinst (`spindelhjalten`).
- **Skärmdumpen fångade tre placeringsfel** som ett grönt test aldrig ser: figuren hamnade
  bakom "starkare knuff"-knappen (`gungan`), helt bakom "Tyngd"-knappen (`knuffa-tornet`) och
  ovanpå kraftmätaren (`studsmatta`). Efter de två första blev det rutin att slå upp
  UI-knapparnas koordinater INNAN figuren placeras.
- **Två doc-punkter var redan gjorda** och ströks i stället för att byggas om: `fallskarmen`s
  "[Quick] föraren får en kropp" (`makeKid` ritade redan hela figuren) och `flipperspel`s
  "[Deep] maskot bor i maskinen". Verkligheten vinner över dokumentet.
- **P0-fynd på köpet:** `gungan`s mål (🐦🍎🎈🦋🌟🍏) var emoji-Text trots att de är spelobjekt
  → `drawIcon`; 🍏 saknades i ikonbiblioteket.

**Commits:** `b2d8b64` figurer.js · `0e9f3ab` gungan · `f6dc893` fallskarmen · `e5be0a8`
valpens-bajs · `8644e4b` studsmatta · `7257aa2` knuffa-tornet · `0d3b52e` spindelnatet ·
`9963161` enhorningen-flyger · `d5b273d` spindelhjalten
**Kontroll:** `npm run check` 0 fel · 0 varningar · `npm run test:all --jobs 2` **70/70 gröna**
· bygge rent.
**Öppet:** kvalitetsspåret fortsätter med **hög 2 — variation & agens** (bowling specialkäglor,
flipperspel banelement, snobollen gömda fynd, glasstornet smak-mål, knuffa-tornet
specialklossar, tvatta-djuret smutszoner, ~2,5 tim) och **hög 3 — egen finish**
(tvatta-djuret, enhorningen-elvira, ~1 tim). `gravmaskinen` och `pruttbad` har inga
[Deep]-punkter kvar alls och behöver troligen bara omgraderas. 15 repliker väntar på `/rost`.

---

## 2026-08-06 · v1.11.0 · 🔤 Lära-fliken polerad — **poleringsrundan 70/70 KLAR**

**Byggt:** hela 🔤 Lära-kön (9 spel) körd i ett svep med checkpoint mellan varje. Därmed är
**hela poleringsrundan avslutad**: alla 70 spel är genomgångna (🎉 15 · ⚙️ 27 · 🧩 19 · 🔤 9).

- **P0 ASSETS i sex av nio spel.** `vilket-djur-later` (12 djur), `kla-efter-vadret` (13 plagg
  + vädertecknet), `ballonglyft` (Elvira, presenten, 8 överraskningar), `siffertaget`
  (vagnslasten), `blixt-och-dunder` (lamporna + mätaren) och `djurorkester` (6 djur) ritade
  emoji som spelobjekt. Greppet från Pussel-rundan höll: **behåll emoji-strängen som NYCKEL**,
  byt bara renderingen.
- **`artikoner.js` växte med 25 nycklar.** Fem bondgårdsdjur (får · häst · anka · höna · tupp),
  kyckling, en helt ny `wear`-mall med 17 plagg i 12 former, och två vädertecken (regnmoln,
  snöflinga). **🐮 kon ritades om** från grunden — den gamla var en vit cirkel med runda öron
  och läste som isbjörn; nu horn, breda öron, fläck och mule. Den syns i fem spel.
- **Nytt verktyg `scripts/_ikoner.mjs`** — ritar valda nycklar i ett rutnät och skärmdumpar.
  Det var det som avslöjade att kon, hästmanen, hönskammen, ankan, regnhatten, regnjackan,
  sandalen och halsduken var svaga. Sandalen fick tre försök innan den slutade läsa som en
  bänk; lösningen blev att rita den **ovanifrån** medan övriga skor är sidovy.
- **Fyra äkta spelbuggar** som gröna test aldrig sett, alla hittade i skärmdumpen:
  - `kla-efter-vadret`: ett plagg spawnade alltid på x=640 — ovanpå Elvira OCH inuti
    fot-zonens Ø260 träffyta. En liten knuff kunde räknas som en placering barnet aldrig gjort.
  - `ballonglyft`: en ballong spawnade bakom presenten och gick inte att hitta — rundan kunde
    då bara lösas av auto-hjälpen. Dessutom klipptes ballongsnörena av nederkanten.
  - `rakna-applen`: två frukter hängde i ren himmel, 192 px från närmaste lövboll (radie 156).
  - `blixt-och-dunder`: Bobos fötter hamnade på y=731 — utanför 720-skärmen.
- **Bobo var ett svävande huvud** i `blixt-och-dunder` (`makeMascot()` ger bara ett huvud —
  samma fynd som i fem Pussel-spel). Ny `makeBoboBody()`.
- **Två mottagare tillagda** (gate-punkt 4): en ritad **ekorre** i `rakna-applen` vars kinder
  rodnar gradvis mot antalet i korgen, och en ritad **Elvira med kropp** i `ballonglyft`.
- **Röstbuggarna borta — repo-kontrollen är 0 fel och 0 varningar för första gången.**
  `peka-pa-kroppen` byggde alla sina frågor med `.replace()` på mallsträngar och `fargregn`
  med strängkonkatenering; klipp-manifestet slår upp på exakt text, så spelens KÄRNREPLIKER
  föll tillbaka på Web Speech. **Alla 100 fanns redan i `voice-phrases.json`** — det var
  källkoden som gjorde dem onåbara. Nu fulla literaler i uppslagstabeller. 11 → 0 varningar.
- **`fargregn` fick sin [Medium]-punkt:** pölarna bär nu färgen som landade i dem, och två
  OLIKA grundfärger i samma pöl blandas synligt (gul+blå→grön, röd+blå→lila, röd+gul→orange)
  med gnistor, stigande ton och talad förklaring. Sällsynt eftersom målfärgen dominerar regnet
  — ett wow-ögonblick, inte en mekanik barnet måste hantera.

**Commits:** `35bf5ab` vilket-djur-later · `208e6fe` kla-efter-vadret · `ef49053` ballonglyft ·
`e6d75a8` siffertaget · `fee4f68` blixt-och-dunder · `17cd80e` djurorkester · `a39c26a`
rakna-applen · `a6b0d75` peka-pa-kroppen · `81b1b7f` fargregn
**Kontroll:** `npm run check` **0 fel · 0 varningar** · `npm run test:all --jobs 2` **70/70
gröna** · bygge rent.
**Öppet:** 15 repliker väntar på `/rost` (12 sedan tidigare + 3 nya färgblandnings-repliker).
Fyra `sfx`-prompter väntar fortfarande på att MOSS är uppe. `ballonglyft`s
`_attachLoose(ctx, b, opts)` tar emot `{ auto: true }` men läser aldrig `opts` — auto-hjälpens
fäste går inte att skilja från barnets eget tryck; noterat i spelets doc §4, inte ändrat.

---

## 2026-08-06 · v1.10.0 · 🧩 Pussel-fliken polerad — 19 spel, ett delat ikonbibliotek

**Byggt:** hela 🧩 Pussel-kön körd i ett svep, ett spel i taget med checkpoint mellan varje.
Poleringsrundan är därmed **61/70** — bara 🔤 Lära (9) återstår.

- **P0 ASSETS var skulden, och den var värre än mätt.** 18 av 19 spel hade emoji som
  spelobjekt, oftast som *emoji-Text ovanpå en opak vit skiva* — dubbelt brott mot regeln.
  Rensat i samtliga: 60 kortsymboler (`vandkort`), 44 figurer (`skuggmatchning`), 32 sopor
  (`sortera-skrap`), 23 plagg (`kla-pa-nallen`), 16 element (`trollblandning`), 16 motiv
  (`vad-forsvann`), 33 figurer (`stor-liten`), hela sakkatalogen i `magnet-fiske`, m.fl.
  Greppet som funkade genomgående: **behåll emoji-strängen som NYCKEL** — spelen slår upp
  namn, djurläten och kategori på den — och byt bara renderingen.
- **Nytt delat bibliotek `src/lib/artikoner.js`.** Efter tre spel med överlappande figurer
  bröts ritmotorn ut ur `vandkort`: `drawIcon(key, size)` med parametriska mallar (djur ·
  frukt · fordon · form · havsdjur · verktyg) drivna av en tabell, ~110 nycklar. Fem spel
  använder den. En genomsökning verifierar att varje nyckel spelen slår upp finns i tabellen
  — saknade nycklar faller igenom till en grå cirkel som ser ut som ett medvetet designval
  i skärmdumpen. Fjäril, regnbåge och fotboll hann göra just det.
- **Fem svävande huvuden fick kroppar:** trollkarlen (`trollblandning`), Elvira
  (`kugghjulen`), de fyra djuren (`folj-sparet`), Zacke/Alissa (`golvet-ar-lava`) och Bobo
  (`kulbana`). `makeMascot()` ger BARA ett huvud. I `trollblandning` ritades kroppen redan
  men syntes aldrig: faceR 80 ger en 160 px bred ansiktscirkel som täckte hela bålen.
- **Tre spel fick en mottagare** (gate-punkt 4): draken vid skatten (`golvet-ar-lava`), Bobo
  vid hinken (`kulbana`) och katten vid hinken (`magnet-fiske`).
- **`golvet-ar-lava` fick sin [Deep]-punkt:** en prickad förhandsvisning av hoppbanan som
  ritas om vid varje stenflytt. `_buildSeq()` och `_arcHeightFor()` delas av förhandsvisningen
  OCH det verkliga hoppet, så de kan aldrig säga olika saker. Vit bana = figuren klarar det
  själv, blek blå + molnmarkör = hjälpmolnet får bära.
- **Sju layoutfel som bara syntes i skärmdumpen:** Gå!-knappen mitt i lavafloden; magnetspöets
  pivot rakt under ljudknappen (spöet drogs tvärs igenom den); L-kugghjulet klippt av
  skärmkanten; hinkens botten bakom Delar-hyllan; Bobos armar ritade före bålen så de doldes
  helt; 3D-mottagaren halvt utanför vänsterkanten; och ett sista kliv som gick **bakåt** på
  breda banor i `golvet-ar-lava` (`treasureNodeX` kunde hamna vänster om `rightLandingX`).
- **Fem röstbuggar** där repliker aldrig kunde få klipp: `voiceIntro` som pekade på en konstant
  i stället för att stå skriven på plats (`sortera-skrap`, `stor-liten`) och konkatenerade
  strängar (`folj-sparet`, `enkelt-pussel`, `mata-monstret`). check.mjs matchar **bara
  literaler**. Repo-varningarna gick från 16 → 11.

**Sidospår på begäran:** `p2-es` tillagd som tredje fysikmotor — verifierad funktionellt
(låda faller och landar i ett röktest) och bundlar till 66 KB, dynamiskt importerad så bygget
är oförändrat. Skill **fysik-spel** har fått en motorvalstabell först i dokumentet: egen
ticker-integrator · matter · p2 · three, plus regeln en motor per spel. Spelindexet städat —
`kvalitet` och `polerad` är nu **två** kolumner i stället för en överlastad emoji, och 42
spel-docs synkade mot indexet. Ny idébank `docs/IDEER.md` med förstapersons-nätskottsidén.

**Commits:** 19 spel-commits · `a9fd079` idébank · `dbd506a` index · `936c8c3` p2-es
**Kontroll:** `npm run check` 0 fel · 11 varningar · `npm run test:all --jobs 2` **70/70
gröna** · `test:fx` grön · bygge rent.
**Obs för nästa körning:** med `--jobs 4` faller `glittergrottan` på slut på WebGL-kontexter —
det är harnessen, inte spelet. 3D-spelet behöver ~13 s innan det renderar, så en tom skärmdump
betyder inte att något är fel.
**Öppet:** 🔤 Lära-fliken (9 spel) är sista kön i poleringsrundan. 12 repliker väntar på
`/rost`. Fyra nya `sfx`-prompter (`duns` m.fl.) väntar på att MOSS är uppe.

---

## 2026-08-05 · v1.9.0 · 🔊 Röstkön tömd — 343 nya klipp

**Byggt:** `/rost` körd skarpt. Hela kön av svenska repliker har nu riktiga F5-TTS-klipp.

- **Var pipelinen faktiskt finns.** Utgångsfrågan var om Holodeck-projektet har en F5-pipeline
  vi kan låna på psai3. Det har det **inte**: Holodecks TTS är **Chatterbox** (devnen-servern,
  Turbo-engine) på **PC 2 "andreas-hem"** `192.168.1.125:8004`, och V3 är **engelska only** sedan
  2026-06-26. `HoloDeck_V2/TTS_RESEARCH_2026-06-26.md` utvärderade F5-TTS och valde bort det.
  psai3 förekommer bara som filutdelning i de dokumenten. **Den svenska F5-pipelinen låg redan
  där `npm run voice` pekade**: storygen-narratorns venv här på psai1 (torch 2.6.0+cu124, RTX
  4090, `EkhoCollective/f5-tts-swedish` 3,2 GB i HF-cachen — inget nätanrop behövs).
- **72 repliker som spelen säger** men som saknades i `voice-phrases.json` lades till först, så
  de kom med i samma körning. Resultat: **351 gjorda, 1051 överhoppade, 0 misslyckade.**
- **Skräp rensat.** `_addphrases.mjs` lägger till precis vad `check` rapporterar — även bitar av
  mall-strängar (`" dropparna!"`, `"Hurra! "`) och rena **platshållare** (`"Hitta {d}!"` från
  `peka-pa-kroppen`). Åtta platshållare hann få klipp där rösten läser upp `{d}` högt innan de
  upptäcktes. Klipp, manifest-poster och repliker borttagna; fällan dokumenterad i
  `docs/POLERINGSRUNDA.md` intill verktyget.
- **Kvalitetskontroll:** alla 351 nya klipp mätta med `ffprobe` — 0,98–8,47 s, median 2,60 s,
  inga avhuggna eller skenande, 0 manifest-poster utan fil. Täckning nu **1394 repliker /
  1395 klipp, 0 utan klipp**.

**Buggfix i verktygskedjan:** `npm run voice` och `npm run sfx` var **trasiga på Windows**. npm
kör sina scripts genom cmd.exe, och cmd klarar inte en kommandorad som *börjar* med en citerad
sökväg och sedan har fler citerade argument — den svarade "Felaktig syntax för filnamn,
katalognamn eller volymetikett" och körde aldrig något. Varken snedstreck eller bakstreck
hjälpte (skill-dokumentationens råd "kör från PowerShell" räckte alltså inte). Ersatta med
`scripts/run-tts.mjs`, som spawnar python med en riktig **argv-array** — ingen shell-citering
alls. Fungerar nu från både PowerShell och git-bash, kör `python -u` så framstegsraderna
strömmar live i stället för att buffras till slutet, och ger ett begripligt fel om venven saknas.

**Commits:** `b6f1d8a` feat(voice) · `11f4de9` chore v1.9.0
**Kontroll:** `npm run check` 0 fel · 16 varningar · bygge rent (precache 1450 poster, 25 MB,
1395 röstklipp i `dist/`).

**Öppet:**
- De 16 varningarna är **läcka #4-skuld i opolerade spel**: `fargregn`, `enkelt-pussel`,
  `folj-sparet`, `mata-monstret` och `peka-pa-kroppen` bygger repliker ur mall-strängar, och
  `sortera-skrap` + `stor-liten` saknar `voiceIntro`. Fixas i respektive spels poleringsomgång
  (Kö 2 🧩 Pussel och Kö 3 🔤 Lära, 28 spel kvar) — inte genom att lägga fragment i röstlistan.
- MOSS-SoundEffect (:8003) är fortfarande nere → 21 sfx-klipp, `npm run sfx` väntar. Modellen
  ligger cachad lokalt, så det är bara tjänsten som behöver startas.
- Referensrösten är fortfarande `narrator_default.wav` med ett **engelskt** transkript. Det har
  gett 1395 dugliga svenska klipp, men en svensk referens är den enda kvarvarande kvalitetsspaken
  — och den kräver att **alla** klipp görs om, inte bara nya.

## 2026-08-05 · v1.8.0 · 🎉 **Roligt-fliken KLAR** (14/14)

**Byggt:** poleringsrundans Kö 1 färdig — de nio återstående spelen i 🎉 Roligt, ett i taget med
skärmdumpsgranskning, `_idleprobe` och egen commit. Rundans genomgående fynd:

- **P0 `ASSETS` läckte i sex av nio spel, och alltid på samma sätt:** ett spelobjekt var en emoji
  i en ruta, cirkel eller bricka. `lagerelden` (🪵-ved), `enhorning-glitterbajs` (🍓🧁🍪 i en vit
  panel), `loopdjuren` (fyra djur i cirklar + fem block i fyrkanter), `regnbagsmalaren` (🦄 som
  pensel + 🌸🌷🌼), `fyrverkeri` (✨/⭐ som målstjärnor) och `tryck-och-forvandla` (**alla 25
  förvandlingssteg**). Allt är nu ritat med egen silhuett. Inga `Text`-noder kvar i något av de
  nio spelen.
- **Elfte läckan — "loggen ljuger".** `enhorning-glitterbajs` doc §5 påstod sedan 2026-07-01 att
  maten ger olika glitter. Men `makePelletView()` **tog inget argument** och ignorerade
  `_glitterKind`, så alla tre maträtterna gav identiska gula prickar. Ett grönt test och en
  nöjd logg-rad räcker inte: *verifiera att den påstådda kopplingen faktiskt går hela vägen
  fram till pixlarna.*
- **Tolfte läckan — framsteg vid INGÅNG.** `tryck-och-forvandla` anropade `progress.setLevel()`
  i `init`, före första trycket, så `_idleprobe` gav `idleFramsteg: 1` utan en enda beröring.
  Regel: progress skrivs när barnet klarat något, aldrig när spelet startar.
- **Läcka #6 (`arc()` efter `fill()`) igen, två gånger.** I `enhorning-glitterbajs` drog den ett
  långt streck från containerns origo tvärs över hela enhörningen (syns tydligt i skärmdumpen);
  i `tarta-i-ansiktet` fanns samma fel latent i clownens mun men doldes av näscirkeln som ritas
  efter. Leta efter `.arc(` som första vägkommando efter `.clear()` eller `.fill()`.
- **Läcka #4 (konkatenerade repliker) i tre spel** — `tryck-och-forvandla`
  (`` `${st.a} ${st.n}!` `` för alla tio resultat), `kittla-figuren` och `lagerelden`. Alla
  omskrivna som hela literaler så `/rost` kan generera klipp.
- **Element bakom skalets hörnknappar, två fall:** `enhorning-glitterbajs` mätarstjärna på y 116
  och `fyrverkeri` vindflagga på (96, 96) — båda delvis under knapparna som når y ~112.
- **Scener som svävade:** `lagerelden` hade hela lägerplatsen 64 px ovanför marklinjen
  (`createScene` ger 96 px mark), och Elvira i `enhorning-glitterbajs` stod 80 px över marken.

**Utöver P0** fick varje spel ett riktigt lyft: lägerplats med tält och eldflugor och fyra sorters
mat att rosta; äkta glitterskillnad per mat; stämda instrumentblock med ritade djur; överraskningar
som flyger ur varje färdig regnbågsbåge; måne, stadssiluett och en publik som ropar "Oooh!" i
fyrverkeriet; levande, driftande bubblor med Bobo som samlar fångsten i en burk; kittel-ledtråd i
fritt läge och skrattårar; och en riktig cirkusscen med ridåer, publik och fyra tårtsorter.

**Commits:** `5909607` lagerelden · `ce7d4cc` enhorning-glitterbajs · `4d5fb57` loopdjuren ·
`2d7bc14` regnbagsmalaren · `ecdd289` fyrverkeri · `1494b6c` tryck-och-forvandla ·
`b0df504` klambubblor · `ea0d70e` kittla-figuren · `67830b9` tarta-i-ansiktet

**Kontroll:** `npm run check` 0 fel · `npm run test:all` **70/70 gröna** · `_idleprobe` på alla
nio: `idleFramsteg: 0`.

**Öppet:**
- Poleringsrundan fortsätter med **🧩 Pussel (19 spel)** och **🔤 Lära (9 spel)** = 28 kvar.
  Tabellerna i `docs/POLERINGSRUNDA.md` är avbockade för hela Kö 1.
- **199 repliker väntar på röstklipp** (upp från 136) — kör `/rost` när F5-TTS-narratorn är uppe.
  76 av `npm run check`-varningarna är den kön, samtliga i spel som ännu inte polerats.

## 2026-08-05 · v1.7.0 (pågående) · 🎉 Roligt-fliken, spel 4 av 14

**Byggt:** `sapbubblor` polerad — fjärde spelet i poleringsrundans Kö 1. Rundans stora fynd den
här gången är inte ett assets-brott utan ett **designfel som gröna tester aldrig ser: spelet
spelade sig självt**. Kritiker-agenten lät spelet stå orört i 60 sekunder och mätte en hel nivå
klar efter 10 s, utan ett enda tryck. Orsaken var två samverkande saker som är osynliga både i
koden och i skärmdumpen: var tredje bubbla föddes i ringens lodräta korridor, och "suget" mot
ringen hade en radie som var bredare än den ser ut. No-fail hade glidit över i att barnets input
är dekoration. Nytt verktyg `scripts/_idleprobe.mjs` mäter det: nollställer progress, rör inget
i N sekunder, spelar sedan riktat. Efter fixen: **20 s utan input = 0 framsteg**, 30 s riktat
spel = full ring, och no-fail-ventilen kliver in först runt 40–50 s.

Själva omgången: blåset är **riktat** (tryck i himlen → närmaste fläkt vrider sig dit och föder
en vindpuff som färdas längs siktlinjen och knuffar bubblor i båda axlarna, kraft delad med
massan), **Bobo håller ringen** och gapar/sväljer/hoppar, en **poppad bubbla släpper en
barnbubbla** så leksaken och målet hänger ihop, och alla emoji-spelobjekt är ritade — inklusive
åtta överraskningsfigurer i `overraskningar.js`. Dessutom sjätte läckan igen (glans-bågar utan
`moveTo` drog streck tvärs över varje bubbla), sjunde läckan (bubblor osynliga mot ljus himmel),
avklippta fläktstativ, träffyta 80–96 px på barnbubblor, och en arm som lossnade när Bobo hoppade.

**Commits:** 3d88ede feat(sapbubblor): riktat blås, Bobo håller ringen, 8 ritade överraskningar

**Öppet:** Kö 1 fortsätter med `pruttbad` (skuld 10) → `lagerelden` → … 10 spel kvar i Roligt,
sedan Pussel (19) och Lära (9) = **38 av 70 kvar**. Versionsbump, `npm run build`/`serve` och
`npm run backup` sker när hela Roligt-fliken är klar (se `docs/POLERINGSRUNDA.md`). Två nya
röstrepliker väntar på klipp — kör `/rost` när F5-TTS-narratorn är uppe.

---

## 2026-08-04 · v1.7.0

**Byggt:** **Hela ⚙️ Fysik-fliken poleras spel för spel** — alla 27 spel gicks igenom med
`/polera`-kedjan (läs doc §3/§4 → skärmdump som spelare → bygg → `check` → `test` → commit
→ doc §5). En commit per spel.

- **P0 ASSETS var den genomgående skulden.** 20 av 27 spel hade emoji som HELA spelobjekt,
  ofta i en ruta eller cirkel — precis det regeln förbjuder. Nu ritas bl.a. 16 flyt/sjunk-
  föremål (`plask-i-vattnet`), 6 frukter (`fanga-frukten`), 5 byten (`spindelnatet`), tre
  bollar med eget ansikte (`rulla-bollen-hem`), bowlingkäglor (🎳-emojin visade en boll OCH
  käglor i varje "kägla"), grävmaskin + dumper + Zacke i hytten (`gravmaskinen`), kanin,
  groda, kattungar, ekorre, djuransikten per art, penna, mål, vikter, ikoner och mätardetaljer.
- **Fyra spel fick en mottagare** (gate-punkt 4): Bobo på ängen (`poppa-ballonger`), målvakten
  i målet (`rulla-bollen-hem`), Bobo vid korgen (`studsbollar`) och fickor med ansikte som
  gapar hungrigt (`studsa-ner`). Fem spel fick Bobo en **kropp** — han var ett svävande huvud.
- **Tre spel fick ett nytt syfte:** kattungen som ska räddas ner för tornet (`bygg-tornet`),
  den hungriga ekorren som önskar sig en fruktsort (`fanga-frukten`), och — störst —
  **`spara-linjen` där prickarna nu bildar en BILD**: åtta motiv (berg, hus, moln, fisk,
  hjärta, katt, stjärna, blomma) som fylls med färg, får ögon och ett leende när linjen sluts.
- **Progression som består:** gömda kompisar i ballongerna, vänbok över klappade arter,
  skyline av byggda torn, myntkruka, hål-rad, upptäckts-logg — allt sparat i `custom`.
- **Sex layout-/synlighetsbuggar** hittade i skärmdumpsgranskningen som gröna tester aldrig
  ser: mätaren under ljudknappen (`studsa-ner`), mätaren bakom avsatsen + oläsbara etiketter
  (`knuffa-tornet`), knapp klippt av nederkanten (`rulla-bollen-hem`, `fallskarmen`), tom
  vikt-ikon tills första trycket (`fallskarmen`), enhörningen vänd bakåt (`enhorningen-flyger`),
  upp-och-nedvänd kanin (`studsmatta`), och `floatText` som skrev ut ordet "gem" över scenen
  (`enhorningen-elvira`).
- **Kodbuggar:** ~15 `gsap.delayedCall` → `ctx.later()`; `_calls` som växte obegränsat under
  en lång session (`klappa-mullvaden`); oändliga tweens mot Pixi-objekt som kan förstöras
  (proxy-mönstret); tre konkatenerade röstrepliker som `check.mjs` aldrig kunde hitta och
  `/rost` därför aldrig kunde klippa.
- **Scener:** 12 spel fick en riktig plats i stället för tapet — staket, träd, vimplar,
  fotbollsplan med linjer, byggarbetsplats, glasskiosk, lekplats, snödrivor, ängsdekor.

**Commits:** `76d591e` poppa-ballonger · `291a5fc` klappa-mullvaden · `a3552b4` plask-i-vattnet ·
`1e08672` bygg-tornet · `18741d5` rulla-bollen-hem · `eec5eba` spara-linjen · `b62fb42` studsbollar ·
`60ee318` studsa-ner · `c860c6f` fanga-frukten · `a50464e` vippbradan · `310cf20` domino ·
`a7d44c2` studsmatta · `aac5fe5` knuffa-tornet · `b13e5de` spindelhjalten · `1409056` enhorningen-elvira ·
`72ba7b2` valpens-bajs · `bca8995` tvatta-djuret · `3356281` gungan · `86b557c` spindelnatet ·
`3af8567` fallskarmen · `4c145f6` enhorningen-flyger · `56cdfc7` spindel-zacke-svingar ·
`8e179cb` bowling · `3337304` flipperspel · `34b8cbe` snobollen · `b239f4f` glasstornet ·
`9e8dc5a` gravmaskinen
**Kontroll:** `npm run check` 0 fel · `npm run test:all` **70/70 gröna** · `npm run test:fx` grön.
**Öppet:** 136 repliker väntar på klipp (`/rost`) — 83 nya från den här omgången. Nio spel
markerade ✅ i indexet (hel omgång: mottagare + assets + variation); de övriga 18 fick
assets-/scen-/buggrundor och står kvar som 🔧 med kvarvarande [Deep]-punkter i sin doc §4
(bl.a. riktiga SFX-klipp, mjukare auto-hjälp i några spel, och samlingar som består).

**➡️ NÄSTA SESSION:** samma omgång ska köras för de tre återstående flikarna —
🎉 Roligt (14) → 🧩 Pussel (19) → 🔤 Lära (9) = **42 spel kvar av 70**.
Metod, de fem läckorna, verktyg och en **ordnad kö sorterad efter uppmätt asset-skuld**
ligger i **`docs/POLERINGSRUNDA.md`**. En checkpoint i `.claude/state/korning.json` gör att
SessionStart-hooken lyfter det automatiskt — kör **`/aterta`** för att fortsätta.
Kö 2 (Pussel) är märkt ✅ i indexet, men den bedömningen gjordes 2026-07-02, **innan P0-regeln
`ASSETS` fanns** (2026-07-25) — skulden är uppmätt och verklig, så kör dem ändå.

---

## 2026-07-25 · v1.4.0

**Byggt:** Ägarens speltest-runda: en ny P0-regel, **två systemiska buggar i delad kod**, och
sju spel åtgärdade av fem parallella agenter.

- **Ny P0-regel `ASSETS`** — spelobjekt ritas fristående med egen silhuett och eget liv;
  aldrig en emoji i en ruta eller bricka. Kort och paneler är för text och UI. Inskriven i
  `CLAUDE.md`, `docs/DESIGN.md §8.1`, kvalitetsgrinden (punkt 8), skill `spelkontrakt` och
  båda bygg-/kritiker-agenterna. Heuristik: 22 av 70 spel har kvarvarande skuld (ej åtgärdad).
- **Systemisk bugg 1 — objekt växte vid upprepade tryck.** `pop()` läste sitt eget pågående
  läge som bas → 1.18, 1.39, 1.64 … utan tak. Samma felklass i `wiggle` och `shake`.
  `pop()` används i **64 av 70 spel, 291 ställen**. Första fixen räckte inte (4.11× kvar på
  12 tryck) — `gsap.killTweensOf()` dödar timelinens barn-tweens men inte timelinen, vars
  `onComplete` nollställde flaggan mitt i nästa puls. Nytt regressionstest `npm run test:fx`.
- **Systemisk bugg 2 — fördröjda anrop läckte mellan spelomgångar.** Modulerna är singletons,
  så en `gsap.delayedCall` överlever `destroy`; vid nästa start är `_alive` åter `true` och
  vakten släpper igenom den gamla callbacken. **69 av 70 spel** använder `delayedCall`.
  Nytt `ctx.later(sekunder, fn)` i `GameHost` knyter fördröjda anrop till spelomgången.
- **Sju spel:** `zackes-biltvatt` (tvåfas-loop svamp→skum→slang, skrubbmotstånd, verlet-slang
  från hydrant, fristående objekt) · `domino` (snäppet returnerade **alltid `null`** pga `NaN`
  i avståndet — ingen bricka har någonsin kunnat fastna; + regnbågsgradient styr placeringen) ·
  `siffertaget` (tåget backade iväg; sättet ompositionerat) · `flipperspel` (`Body.setAngle`
  roterade kring masscentrum → 30–90 px paddeldrift; kulan nådde dessutom aldrig ner till
  paddlarna; +42 % bordsbredd) · `snobollen` (banan var **matematiskt omöjlig** att klara —
  uppmätt x=656 mot mål 1085; hindren välter nu) · `glasstornet` (körsbäret och pendeln hade
  ingen begriplig roll — nu mål respektive vind; layout rättad) · `glittergrottan`
  (teknikdemo → ordningsspel med sex regler och facit-rad).
- **`check.mjs`** hittade inte repliker som ligger i konstant-banker → 199 saknade repliker
  upptäckta mot tidigare 50 (189 efter att speltitlar undantagits).

**Commits:** `80a4a6d` lib-fixar · `4e03f80` ASSETS-regel · `839abd0` check · `54431b9`
biltvätt · `c92f751` domino · `6c31558` siffertåget · `e58ec67` flipper · `09bcead` snöbollen ·
`8effc24` glasstornet · `623ed87` glittergrottan · `a6ac26a` röst
**Kontroll:** `npm run check` 0 fel · `npm run test:all` **70/70 gröna** · `npm run test:fx`
grön · bygge rent.
**Öppet:** 189 repliker väntar på klipp (`/rost`). ASSETS-skulden i 22 spel. Retroanpassning
av `ctx.later()` i de 69 spel som fortfarande använder `delayedCall` direkt. Snöbollens banor
är nu snabba (~2 s för en van spelare), och `glittergrottan` hör mekaniskt hemma i
Pussel-fliken snarare än Roligt.

---

## 2026-07-25 · v1.3.0

**Byggt:** **Zackes Biltvätt** (`zackes-biltvatt`, 70:e spelet) — pipelinens första skarpa
körning — plus en **lättad P0-regel om motgång**.

- **Regeländring (ägarbeslut):** motgång var tidigare i praktiken förbjuden
  (`FEEDBACK = … ENDAST positivt`). Nu finns en egen P0-rad **`MOTGÅNG`**: hinder och bakslag
  är tillåtna och önskvärda, ska gå att anpassa sig runt, som mest sakta ner, och måste ha ett
  **tak** + lagom takt. Fortfarande förbjudet: misslyckande som avslutar/nollställer,
  "game over", sjunkande poäng, bestraffande timers. Uppdaterad på 11 ställen (CLAUDE.md,
  skills, agenter, README, ARCHITECTURE, PIPELINE, docs/games/README). `spelkritiker` flaggar
  numera även **för lite** motstånd.
- **Spelet:** två verktyg med olika styrka (svamp skrubbar tjockt, slang sköljer brett och
  skrämmer bort fåglar innan de bajsar) → ett äkta val. Tak: max 3 bajsfläckar samtidigt,
  därefter missar fåglarna. 6 fordon, 4 fågeltyper + sällsynt regnbågsfågel. Finish: glans-svep,
  tvåtons-tuta, ägaren jublar och åker med ut genom glansbågen; pentatonisk ton per ren fläck.
- **Pipelinen fungerade.** `spelkritiker` hittade två äkta blockerare som jag missat: slangens
  syfte var oupptäckbart (tipset kom först *efter* en lyckad träff), och `progress.complete()`
  klippte den spelspecifika slutrepliken (`voice.say` anropar alltid `cancel()`). Skärmdumps-
  granskningen fångade tre visuella buggar som ett grönt test aldrig sett: streck över Zackes
  ansikte (`.arc()` i delad Graphics), svävande ägare, fläckar utanför karossen.
- **Bugg i leveranssteget hittad och fixad:** `scripts/start.ps1` + `stop.ps1` var UTF-8 **utan
  BOM** med å/ä/ö → Windows PowerShell 5.1 (som `npm run serve` startar) läste dem som ANSI och
  gav parse-fel. BOM tillagd; `npm run serve` fungerar igen. `scripts/backup.ps1` skrevs
  ASCII-rent av samma skäl.

**Commits:** `b903562` feat(zackes-biltvatt) · `d610505` feat(pipeline)
**Kontroll:** `npm run check` 0 fel · `npm run test:all` **70/70 gröna** · bygge rent · serverad
på :4173 (Tailscale 8445).
**Öppet:** 8 nya repliker väntar på röstklipp (`/rost` när narratorn är uppe). Fågelljuden lånar
fel djur (`djur_hona/uggla/anka/tupp`) tills MOSS kan generera riktiga mås/gås-läten.

---

## 2026-07-25 · v1.2.0

**Byggt:** Projektet fick en riktig pipeline. Kunskapen som tidigare låg som prosa i en
261-raders `CLAUDE.md` (och i minnesfiler) är nu **körbara verktyg och laddas-vid-behov-skills**.

- **`CLAUDE.md` 261 → 59 rader** — bara P0-reglerna, kommandoytan och en routingtabell.
  Allt djup flyttat till fem nya skills: `spelkontrakt`, `spel-pipeline`, `fysik-spel`,
  `ljud-och-rost`, `skal-och-data` (plus de befintliga `threejs-*`).
- **8 svenska slash-kommandon** — `/spel` `/polera` `/felsok` `/fixa` `/testa` `/rost`
  `/avsluta` `/aterta`.
- **3 subagenter** — `spelbyggare` (bygger en slice), `spelkritiker` (spelar som 3-åring,
  kvalitetsgrind), `felsokare` (buggjakt med adversariell verifiering).
- **`npm run check`** (`scripts/check.mjs`) — validerar kontrakt, registret åt båda hållen,
  P0-brott, docs och röst-täckning. Strikt läge per spel. Hittade 52 verkliga varningar:
  50 repliker som aldrig kan få ett röstklipp + 2 spel utan `voiceIntro`.
- **`npm run test` / `test:all`** (`scripts/test-games.mjs`) — parallell headless-körning över
  ett/flera/alla spel, med automatiska musdrag för dragspel. **Baslinje: 69/69 gröna.**
- **Krasch-återhämtning** — `.claude/state/korning.json` (checkpoint före varje steg) +
  `scripts/session-start.mjs` som lyfter avbrutna körningar vid sessionsstart + `/aterta`
  som verifierar mot disken innan den fortsätter.
- **`npm run backup`** — robocopy-spegel till `E:\backup\pwagames` (inkl. `.git`, exkl.
  `node_modules`/`dist`). Hoppar tyst över om disken saknas.
- **Docs:** `docs/PIPELINE.md` (människoläsbar pipeline), den här loggen,
  `docs/games/_MALL.md` (spec-mall), omskriven `README.md`, `ARCHITECTURE.md` trimmad till
  levande beslut med forskningen arkiverad i `docs/arkiv/`.

**Öppet:**
- 50 röstrepliker saknas i `scripts/voice-phrases.json` → kör `/rost` när narratorn är uppe.
- 2 spel saknar `voiceIntro` (`npm run check` pekar ut dem).
- Pipelinen är byggd men ännu inte körd skarpt — första riktiga testet är nästa `/spel`.
