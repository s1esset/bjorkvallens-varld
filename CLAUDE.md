# CLAUDE.md — Björkvallens Värld

Offline-first, installerbar **PWA med minispel för barn 2–5 år**, helt på svenska. Tablet-först.
Ett tunt skal (splash → meny → bibliotek → spel) kör 71 fristående **spelmoduler** med ett delat
kontrakt. Stack: PixiJS v8 · three.js (dynamiskt) · matter.js · GSAP · Vite 5 · vanilla ESM.
Motorerna är **verktyg att välja mellan per spel** — se skill **fysik-spel** för vilken som
passar när (egen integrator · matter · SPH-vätska · three).

## P0 — icke förhandlingsbart, gäller varje skärm och spel

```
TRÄFFYTA      ≥96px (2cm), avstånd ≥24px, +24px osynlig hit-halo
UPPLÖSNING    1280×720 landskap, Math.min letterbox (contain)
GESTER        JA: tap, enkel drag (snäpp + tap-tap-fallback). NEJ: dubbeltryck, långtryck,
              pinch, rotation, multitouch, snabbsvep-nav
ÅTERKOPPLING  varje pekning → ljud+bild <100 ms. Fel tryck = roligt, aldrig summer, rött kryss
              eller tillsägelse. Belöning = 1–2 s firande + svenskt beröm + klistermärke
MOTGÅNG       hinder och bakslag är TILLÅTNA och gör spelet bättre (något blir smutsigt igen,
              välter, kommer i vägen). De ska gå att anpassa sig runt och som mest SAKTA NER.
              Krav: rolig ton, tydlig orsak, går att åtgärda direkt, TAK på hur mycket som kan
              gå fel samtidigt, lagom takt. Svårighet = eftertanke, aldrig stress eller skam.
ASSETS        spelobjekt ritas FRISTÅENDE — aldrig en emoji/ikon i en ruta, bricka eller box.
              Egen silhuett, egen form, eget liv (vilo-guppning, reaktion vid tryck). Paneler
              och kort får bära TEXT och UI-kontroller, aldrig spelobjekt. En emoji duger som
              detalj ovanpå ett riktigt ritat föremål, aldrig som hela föremålet.
NAVIGATION    ikon-först, noll läsning; talad svensk instruktion + repetera-knapp per skärm
GRIND         tryck-och-håll 2,5 s före inställningar/avsluta/ta bort/nollställ/länkar
ALDRIG        reklam, spårning, analytics, nätanrop vid körning, misslyckande som avslutar
              eller nollställer, "game over", poäng som sjunker, bestraffande timers, FOMO
DATA          endast localStorage JSON, ingen PII lämnar enheten
SVENSKA       å/ä/ö i UI/röst; asciiFold (a/a/o) för id:n, filnamn, ljudnycklar, commits
KARAKTÄRER    avbildade människor heter ENDAST Zacke/Alissa/Elvira/Lova (djur, monster och
              maskoten Bobo undantas) — se lib/theme.js
EXIT-SÄKERT   spelaren kan lämna mitt i en animation → _alive-flagga + feedback.js-hjälparna
```

## Kommandon

| Pipeline | | Verktyg | |
|---|---|---|---|
| `/spel <idé>` | idé → spelbart spel | `npm run dev` | dev-server :5173 |
| `/polera <id>` | lyft ett spel en nivå | `npm run check` | kontrakt + P0 + registry + röst |
| `/felsok <id>` | granska & fixa buggar | `npm run test <id>` | headless + bildkoll, 0 fel krävs |
| `/fixa <id> <fel>` | riktad fix | `npm run test:all` | alla spel parallellt |
| `/testa [id\|alla]` | testkörning | `npm run build` · `serve` | bygge → :4173 (telefon) |
| `/rost` | generera pending röstklipp | `npm run backup` | robocopy → E:\backup |
| `/avsluta` · `/aterta` | avsluta / återuppta session | `npm run voice` · `sfx` | offline-klipp (PowerShell) |

Bild- och balanssonder (kör dem när ett spel *känns* fel men testet är grönt):

| | |
|---|---|
| `node scripts/bildkoll.mjs <bild> [--baslinje <bild>]` | tom scen · heltäckande fält · platt layout · diff |
| `npm run test -- --spara-baslinje` · `-- --baslinje` | spara dagens bilder · jämför mot dem |
| `node scripts/_lastprobe.mjs` · `_exitprobe.mjs` | *spelar* ett spel för balans · lämnar mitt i en finish |
| `node scripts/_idleprobe.mjs <id>` | klarar spelet sig själv utan input? (ska vara 0) |
| `node scripts/_partikelprobe.mjs [id]` | tas partikelvägen på riktigt? (fält · antal · pixlar · läckage) |
| `node scripts/_fpsprobe.mjs --cpu 6` | kostnadskurva för rendering — **kräver CPU-strypning** |
| `node scripts/_montageprobe.mjs --cpu 4 --varv 3` | vad en MONTERING kostar per spel (blockerande ruta + tid till lugn) — rangordnat |
| `node scripts/_vatskeprobe.mjs <id> [--losa]` | vätskan: antal · ytans höjd · målade pixlar · FPS · exit |
| `node scripts/_plaskprobe.mjs` | plask-i-vattnet: stänk över ytan · undanträngd volym · taket · konstant volym |
| `node scripts/_plattprobe.mjs` | vilka spel ritar stora ytor i EN platt ton? (rankat) |
| `node scripts/_bbox.mjs <bild> "#rrggbb"` | **VAR** ligger fältet? antal + bbox. `_plattprobe` säger bara VILKEN ton |
| `bash scripts/_ab.sh <fil>… [--rundor N]` | HEAD mot ändringen **växelvis** över hela sviten (flake-attribution) |
| `node scripts/_ikoner.mjs "🐶,🐱"` · `_ikonkostnad.mjs` | ikonark för ögat · vad gradienterna kostar i GPU-minne |
| `node scripts/_scenbild.mjs <tema>… [--tider …]` | `createScene` i rutnät utan att gå via ett spel |
| `node scripts/_kamerabild.mjs <tema> --lagen 0,0.5,1` | ett kameraläge per ruta + offset per lager (`--fps` mäter kostnaden) |
| `node scripts/_kameraprobe.mjs` | kamerans beteende i tal (dödzon · ruta · skak · zoom · exit) — **utan webbläsare** |
| `node scripts/_slagprobe.mjs` | anslagsljudet: fart → volym + tonhöjd · materialens röster · taket · exit — **utan webbläsare** |
| `node scripts/_tystprobe.mjs` | pekhanterare som bortar tyst på en upptagen-flagga (P0-brottet `dod-traffyta`) |
| `node scripts/_karaktarbild.mjs [--reaktion jubel]` | karaktärsriggens alla humör i ett rutnät + exit-koll |
| `node scripts/_dragprobe.mjs <id>` | tyngden i draget: eftersläpning · lutning · skugga · städning · exit mitt i drag |
| `node scripts/_livprobe.mjs <id>` | vilorörelsen: amplitud · fasspridning (lås?) · tickar något efter exit? |
| `node scripts/_navprobe.mjs [BxH]` | skärmbyten: riktning · cremeblänk mitt i övergången · fastnar routern? |
| `node scripts/_perspektivprobe.mjs` | läses badet som en SIDOVY? ytlinje · golv under karet · fötter mot golvet · ankan i ytan · vattnet innanför porslinet |
| `node scripts/_repprobe.mjs` | verlet-repet: vilolängd · fästpunkt · mjukt stopp · golv · spänd lina — **utan webbläsare** |
| `node scripts/_mjukprobe.mjs` | mjuka kroppar: håller formen · sjunker när de mjuknar · knuff · exit — **utan webbläsare** |
| `node scripts/_vobbelprobe.mjs` | vobbeln i ett spel: utslag vid landning · lugnar den sig · tappad volym · exit |
| `node scripts/_bullprobe.mjs` · `_stapelprobe.mjs` | hamburgerbullen som mjuk kropp: viloform mot den gamla `roundRect` · sammantryckning · tappade bildrutor — **utan webbläsare** (och samma bulle under en riktig stapel) |
| `node scripts/_natlinaprobe.mjs` · `_linabild.mjs` | nätlinan mot spelets GAMLA solver (sonden bär den som referens) — **utan webbläsare** · och samma lina skjuten i det levande spelet |
| `node scripts/_flaktprobe.mjs [N]` | fläktens verkan i FICKOR (släpper N mynt per sida och mäter var de landar) |
| `node scripts/_fjaderprobe.mjs` · `_fjaderbild.mjs` | fjäderbrädan: djup per anslag · utkast mot styv platta · tak · vridning · pump — **utan webbläsare** (och samma bräda i bild) |
| `node scripts/_flytprobe.mjs` | vätskevolymen: jämvikt per `flyt` · massoberoende · botten · fartspärr · exit — **utan webbläsare** |
| `node scripts/_faltprobe.mjs` | kraftfältet: px/steg-kalibrering · 1/r · tak · knuff · fångsttid · exit — **utan webbläsare** |
| `node scripts/_varmeprobe.mjs` · `_rostprobe.mjs` | värme vs gradning: balans · P0 · avsvalning · (och i spelet: mjuknar/stelnar) |
| `node scripts/_glodkandidat.mjs [--spara]` | tjänar additiv glöd spelet? `glod()` på spelets EGEN botten, växelvis add/normal (vinst · vitklippning · kroma), med två kända fall som kontrollrader |
| `node scripts/_textprobe.mjs` | skriver något spel om en `Text` varje bildruta? (BitmapText-kandidater — svaret var noll) |
| `node scripts/_installningsbild.mjs` | skärmdump av inställningsskärmen — **ingen testkörning öppnar den**, så panelgeometri syns bara här |
| `node scripts/kenney-sfx.mjs <Audio-katalog>` | importera CC0-ljud → `public/audio/sfx/` |

## Var kunskapen finns (ladda vid behov — läs inte allt i förväg)

| Ska du… | Skill / dok |
|---|---|
| skriva eller ändra ett spel | skill **spelkontrakt** |
| köra en pipeline, avsluta/återuppta | skill **spel-pipeline** · `docs/PIPELINE.md` |
| fysik, sikte, banförhandsvisning | skill **fysik-spel** |
| ljud, musik, röst, klipp-generering | skill **ljud-och-rost** |
| skal, skärmar, spardata, PWA, telefon | skill **skal-och-data** |
| 3D / shaders | skill **threejs-games** · **threejs-shaders** |
| UI-design, tokens, versionspill | `docs/DESIGN.md` |
| ett specifikt spels nuläge + plan | `docs/games/<id>.md` (index: `docs/games/README.md`) |
| rapporterade buggar som väntar på fix | `docs/ATGARDER.md` |
| parkerat arbete som inte är spel (distribution, miljö, beslut) | `docs/BACKLOG.md` |
| se vad ett spel FAKTISKT gör (input·fysik·render·fel) | `src/lib/gamelog.js` → `.test-logs/<id>.json` |
| vad bilden avslöjar (trösklar + kalibrering) | `scripts/bildkoll.mjs` |
| vad som hände senast | `docs/SESSIONS.md` |
| spelidéer som väntar på planering | `docs/IDEER.md` |
| app-breda lyft (motor · assets · rendering) | `docs/LYFTPLAN.md` |

## Tysta fällor — kostade tid på riktigt, gissa inte om dem

- **Docens §4 kan vara inaktuell.** Läs `src/games/<id>/index.js` **före** planen. Två gånger har
  en köad punkt redan varit gjord, och båda gångerna bar koden på fel ingen doc kände till.
- **Grönt test betyder bara "0 konsolfel".** Det säger ingenting om målet går att nå, om mätaren
  syns eller om scenen är tom. Grävmaskinen klarade en nivå på 3,4 s och rapporterade grönt.
  `npm run test` kör därför `bildkoll.mjs` på skärmdumpen — **och titta på bilden själv ändå.**
- **Repliker som inte står som `voice.say('literal')` får aldrig ett klipp.** `check.mjs` kan bara
  läsa literaler; byggs texten vid körning (template literal, tabelluppslag) syns den inte statiskt.
  Backstoppen är mätt, inte gissad: `check.mjs` läser `rost-utan-klipp` ur `.test-logs/<id>.json`
  och varnar för den **exakta** text körningen sa. Den kontrollen kräver alltså att spelet har
  körts — `npm run check` ensam ser dem fortfarande inte. Lägg in frasen i
  `scripts/voice-phrases.json` för hand och kör `npm run voice`.
- **Egna fält på ett Pixi-objekt får inte heta som Pixis egna.** `f._cx = x` såg ofarligt ut,
  men `_cx`/`_cy`/`_sx`/`_sy` är Container-transformens interna cache: `lt.a = _cx * scale.x`.
  Snöbollens snöfält renderades därför med vågrät skala 3660 — osynliga, utan ett enda
  konsolfel. `check.mjs` felar numera på hela namnlistan; använd ett eget prefix (`_wx`).
- **`renderer.generateTexture()` fäller hela testsviten, inte spelet.** Att baka en form till en
  textur byter rendermål mitt i en bildruta. Ensamt syns inget; i `npm run test:all` (72 spel,
  fyra parallella webbläsare) gav det **`tom-scen` i 5 av 7 körningar mot 0 av 7 på HEAD**, plus
  "WebGL context could not be created" i `glittergrottan`. Att baka tidigt vid uppstart hjälpte
  inte. **Rita formen med Canvas2D i stället** — det rör inte GL-tillståndet och behöver ingen
  renderare. Samma regel gäller nästa gång något vill baka: fråga först om Pixi behövs alls.
- **Ett vilande `ParticleContainer` på `fxLayer` dör aldrig.** `fxLayer` lever hela appens
  livstid, så ett fält som cachas där behåller sina GPU-buffertar för alltid. Med kvarliggande
  fält flakade sviten 1 av 3; med `stad()` som river tomma fält: 0 av 4. Allt som cachas på ett
  app-långlivat lager måste kunna rivas när det är tomt.
- **Sekventiellt före/efter duger inte för att döma en flaky svit.** Maskinen driver (termik,
  ackumulerade Chrome-processer), och en delmängd på 8 spel var ren medan hela 72-svitens last
  flakade. `scripts/_ab.sh` kör HEAD och ändringen **växelvis** i full skala — det är den enda
  mätning som faktiskt attribuerar. **Läs båda armarna:** HEAD flakade själv 1 av 3 i en av
  körningarna, så "min ändring flakade en gång" betyder ingenting utan HEADs egen frekvens
  bredvid sig.
- **En `new FillGradient` per scen/objekt destabiliserar sviten precis som `generateTexture`.**
  Varje gradient bakar en egen duk och laddar upp en textur — sker det vid varje montering
  gav det `tom-scen` i 1 av 3 rundor mot 0 av 3 på HEAD. **Cacha varje gradient per färg**
  (`lib/form.js`, `scene.js`); en scen ska göra NOLL texturbakningar när den monteras.
- **En radiell gradient kan inte ha genomskinlig mitt.** `buildRadialGradient` fyller först
  HELA duken med sista färgstoppet och ritar gradienten ovanpå — en genomskinlig källa raderar
  ingenting i source-over. En vinjett byggd så blir en **jämn** mörkning över hela ytan
  (uppmätt: himlens mitt [176,227,250] → [146,189,208], samma faktor överallt). `buildLinear-
  Gradient` har ingen sådan förifyllning: bygg kanttoningar av **linjära** gradienter.
- **Radiella gradienter kostar 256× linjära.** Pixi bakar en linjär till `256×1` (~1 KB) och en
  radiell till `256×256` (~256 KB). Ikonbiblioteket låg på 15,3 MB innan `textureSize: 64`
  tog ner det till 1,0 MB — utan synlig banding ens på 300px. Mät med `_ikonkostnad.mjs`.
- **`restitution` på en STATISK kropp gör INGENTING.** `PhysicsWorld._make` skapar kroppen
  dynamisk och sätter den statisk efteråt (NaN-fixen), och matters `Body.setStatic` nollar då
  `restitution` och sätter `friction` till 1 (originalen hamnar i `body._original`). Studsen blir
  alltså alltid den DYNAMISKA kroppens egen. `kulbana`s studsplatta stod på `0.95` och studsade
  exakt som en ramp — uppmätt: plattans 0,02 och 0,95 ger identiskt studshopp. **Vill du ha en
  studsande statisk yta: `{ isStatic: true, studs: 0.75 }`** (opt-in, sätts efter `setStatic`,
  uppmätt +139 px mot samma yta utan den). Eller `lib/fjader.js` (`Fjaderbrada`) när ytan ska
  kasta iväg något. De 50 gamla `restitution`-talen på statiska kroppar är fortfarande nollade
  med flit — `npm run check -- --studs` listar dem. → ÅTGÄRDER V10/V10b.
- **En förflyttning av en statisk kropp kan bli en fart som ligger kvar för alltid.**
  `Body.setPosition(body, p, true)` sätter farten till förflyttningen, och matter räknar aldrig om
  hastigheten på en statisk kropp. Ett drag på 230 px gav (−651, −230) i hela byggfasen, och
  lösaren läste sedan kontakten som **separerande** → ingen impuls → kulan föll rakt genom
  plankan, utan konsolfel. Driv med fart bara i `phys.beforeStep()`; bär med fart = 0.
- **En mjuk kropp måste stega med FAST tidssteg.** `Mjukkropp` (som `PhysicsWorld`) räknar `damp`
  och villkorsstyvhet per STEG men kraftfält per `f²`. Ett för stort steg fyrdubblar tyngden utan
  att lösaren får mer att säga till om (`dtF` 2 = en tappad bildruta vek ihop hamburgerbullen
  **34,9 px av 50**, för gott); ett för litet ger en helt annan JÄMVIKT (3,1 px i spelet mot 7,0 i
  sonden — Chrome gick på 58 fps och `dtF` blev 1,03). Använd en ackumulator som alltid stegar
  med exakt 1, annars mäter sonden aldrig samma sak som spelet gör.
- **Ett bibliotek kan skriva konsolfel INNAN du hinner fånga felet.** three.js lyssnar på
  `webglcontextcreationerror` och gör `console.error` i lyssnaren; konstruktorn kastar först
  efteråt. `glittergrottan`s reservläge var alltså helt korrekt — full bild, rätt beteende —
  och testet ändå **rött av 8 konsolfel**. Hämta resursen själv där det går (`getContext`
  utan lyssnare är tyst) och lämna den färdig till biblioteket: `new WebGLRenderer({ canvas,
  context })`. Samma fråga gäller nästa bibliotek: loggar det något innan mitt `catch` körs?
- **`Web page caused context loss and was blocked` är en SPÄRR för sidan, inte en transient.**
  Omtagningar hjälper inte — uppmätt 0 räddningar av 2 fall över 15 körningar. Det som räddar
  bilden är att spelet kan köra UTAN resursen. → ÅTGÄRDER V15.
- **Att mäta en visuell effekt: bara EN av tre metoder svarar på frågan.** Uppmätt på samma
  effekt (`kulbana`s fartsvans), tre pass i rad med samma slutsats. ⓵ **Jämför mot en
  referensbild** → du mäter det som RÖRT SIG mest, inte din effekt: kulan stod på olika plats i
  varje arm och gav "energi 1 523k mot 1 715k", alltså ingen skillnad i något som i själva
  verket skiljer 6×. ⓶ **Växla bara effektens `visible`** → de två bilderna tas ~60 ms isär och
  allt annat i scenen hinner röra sig: **1 132 px "från ett lager"** vars buffert var bevisat
  tom. ⓷ **Dölj hela scenen UTOM effektens lager** (och `ctx.fxLayer`) → 0 px när det är tomt,
  och tal som faktiskt är effektens. Använd ⓷. Och frys förloppet: pinna läget **varje**
  bildruta, `positionPrev` med (matter härleder farten ur skillnaden), annars mäter du loopens
  egen reaktion i stället för din variabel.
- **Räkna pixlar mäter YTA — styrkan bor i ALFAN.** Ett band täcker ungefär samma bana oavsett
  hur starkt det är, så pixelantalet växte 1 011 → 1 587 medan summan av avvikelserna gick
  **33k → 205k**. Ska du visa att något blev *starkare*: summera skillnaden, tröskla den inte.
  Och en effekt kan passera varje tal du satt och ändå vara osynlig — röken i
  `blixt-och-dunder` mätte 655 målade pixlar av 7 200 och syntes inte i bilden.
- **`sparkle`/`puff` går genom `ParticleContainer`.** Räkna aldrig `fxLayer.children` för att
  se om partiklar föddes — fältet är ETT återanvänt objekt och innehållet ligger i
  `particleChildren`. Mätningen såg "1 ny fx-nod" och lästes som att glittret var trasigt.
- **Röstkön är inte permanent.** `npm run voice` fungerar (F5-TTS i `C:\repos\storygen`) — töm kön
  i stället för att lämna repliker på Web Speech.
- **Sonder måste ligga i repot.** Scratchpad-katalogen kan inte lösa `playwright`; lägg
  engångsskript som `scripts/_*.mjs`.
- **`korning.mjs` har egna verb:** `steg <namn> --nasta "…"` och `notis "…"`. Det finns inget
  `nasta`- eller `anteckning`-kommando.
- **Byt inte ut stämda ljud mot samplade.** `correct` (660→880 = kvint), `match` (durtreklang) och
  `pling` är musik, inte blipp — ett generiskt UI-klick vore ett brott mot grindens punkt 5.

## Arbetsregler

- **`old/` är arkiverat skräp** — läs, greppa eller citera aldrig något därunder.
- **Grind före commit:** `npm run check` grön + `npm run test <id>` med 0 konsolfel och inga
  `fel`-nivåfynd. En commit per spel, explicita sökvägar, aldrig `git add -A`.
  Commit-ämnen på asciiFold-svenska. Repot är lokalt — aldrig `git push`.
- **Bumpa MINOR i `package.json`** per ändringsomgång; versionspillret är förälderns kvitto.
- **Nya spel landar som ✅, aldrig 🔧** — kvalitetsgrindens 7 punkter i skill **spel-pipeline**.
- **Mät, resonera inte.** Balans, trösklar och "känns det rätt?" avgörs med en sond som spelar
  spelet och jämförs mot HEAD — aldrig med ett antagande i huvudet.
- **Webbläsare:** använd node-harnessen (`npm run test`) i första hand. Behövs en *levande*
  webbläsare: claude-in-chrome. Playwright-MCP endast som fallback — kör aldrig båda i samma uppgift.
- **Agenter:** upp till **3 subagenter** får startas oombett när uppgiften tjänar på det
  (pipelinens `spelbyggare` · `spelkritiker` · `felsokare`). Fler än 3 — fråga först.
  Workflows och deep-research kräver alltid att ägaren ber om det.
- **Assets utifrån:** bara CC0 (Kenney m.fl.), aldrig CC-BY — appen har ingen credits-yta.
  Allt bäddas in offline; P0 ALDRIG gäller nätanrop vid körning.
