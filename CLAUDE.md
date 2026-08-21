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
              maskoten Bobo undantas). FOTOkaraktärer heter en ROLL: Pappa/Mamma — se
              lib/theme.js (CHARACTERS · ROLLER)
EXIT-SÄKERT   spelaren kan lämna mitt i en animation → _alive-flagga + feedback.js-hjälparna
```

## Kommandon

| Pipeline | | Verktyg | |
|---|---|---|---|
| `/spel <idé>` | idé → spelbart spel | `npm run dev` | dev-server :5173 |
| `/polera <id>` | lyft ett spel en nivå | `npm run check` | kontrakt + P0 + registry + röst |
| `/felsok <id>` | granska & fixa buggar | `npm run test <id>` | headless + bildkoll, 0 fel krävs |
| `/fixa <id> <fel>` | riktad fix | `npm run test:all` | alla spel parallellt |
| `/testa [id\|alla]` | testkörning | `npm run build` · `serve` | bygge → :4173 (bara lokalt) |
| `/rost` | generera pending röstklipp | `npm run backup` | robocopy → E:\backup |
| `/avsluta` · `/aterta` | avsluta / återuppta session | `npm run voice` · `sfx` | offline-klipp (PowerShell) |
| | | `npm run deploy` | grind → push → **GitHub Pages** |

Appen ligger publikt på **<https://s1esset.github.io/bjorkvallens-varld/>** (repo `s1esset/bjorkvallens-varld`).
Varje push till `master` publicerar via `.github/workflows/deploy.yml` — kör `npm run deploy`, som
vägrar publicera med ocommittat arbete, röd `check` eller fel gren. Föräldrarnas installationssida
är `public/start.html` → `…/start.html`. `npm run serve` är **bara lokalt** — utan HTTPS finns
ingen PWA-install, ingen service worker och inget uppdateringsflöde att prova. (Tailscale-vägen
togs bort 2026-08-15.)

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
| `node scripts/_lampprobe.mjs` | släpps draget på BÅDA greppytorna? (`_drar`/`_pekId` efter släpp + flyttar en NY pekare något) — två finger-id, kontrollarm före mätarm |
| `node scripts/_onskeprobe.mjs` | `mata-munnen`s ÖNSKAN (ring · blick · replik · att mätarsteget är IDENTISKT för fel bit) + kyldörrens klistermärken över en OMLADDNING · att narratorn får tala till punkt (gamla schemat kortslutet som kontrollarm) |
| `node scripts/_vinstprobe.mjs [--snurr 8]` | `roliga-snurran`s lägesväljare · autoläget · vinstgarantin (aldrig >3 snurr utan vinst) · ceremonins lager/storlek/rotation/glans · trofehyllan över en OMLADDNING · exit mitt i firandet |
| `node scripts/_kompisbild.mjs [--kittel] [--galleri N] [--exitvid S]` | `bygg-en-kompis` i bild per delval + `--kittel`: kittelytan med RIKTIGA muspekningar (kontrollarm på tomt golv först) · träffordningen fjäril-över-kittel · vingspetsen ur `getBounds()` per storlek mot P0-avståndet till kameran · **levande tweens på innernoder före/efter `destroy()`** |
| `node scripts/_ansiktebild.mjs [--bara "vila,wink h"]` | fotoriggens alla lägen i ett rutnät (vila · gap · blink · wink · hetta/kyla · gester · 13 miner) + **andas den efter 40 gester?** + exit-koll — **ett ansikte går inte att bedöma i tal**, och `--bara` gör rutorna stora nog för en wink |
| `node scripts/_munprobe.mjs [--trace]` | *spelar* `mata-munnen`: gapar munnen vid maten (mot kontrollarm långt bort) · lutar han sig mot den · **antal sammanbitningar mot spelets egen tuggprofil** · mätaren per tugga · rätt min · mättar bus (ska INTE) · **ljudslingan följer stationen och dör vid exit** · finalen. `--trace` skriver ut den råa gapkurvan — den förklarar en felräknad tugga på ett sätt inget tal gör |
| `node scripts/_kastprobe.mjs` | `mata-munnen`s KAST: tröskel · åldersspärr · ansats · träffandel · svep utan tunnling · exit mitt i flykten — 4 kontrollarmar före mätarmarna |
| `node scripts/_frysprobe.mjs [--tuggor 60]` | **fastnar ansiktet?** matar pappa N gånger och läser riggens tillstånd: SPÖKMIN (synlig lapp som inte är `_aktivMin`) · eviga tweens som läcker · blinkar han fortfarande · matade dragen honom alls. Kräver ≥40 tuggor för att nå mättnaden |
| `node scripts/_tweenprobe.mjs` | vad `tween.parent` betyder i gsap (levande · väntande · färdig · dödad) — **utan webbläsare**. Hela ringbuffertens filter vilar på den |
| `node scripts/_riggprobe.mjs [--sek N]` | bär `Karaktar._tw` taket 48 i verklig lek? (max · komprimeringar · **väntande tweens som HEADs mätare tappade**) — skugglista med båda predikaten på SAMMA tween-ström |
| `node scripts/_silprobe.mjs [--bild]` | ansiktets träffyta mot fotots kontur: **falsk yta OCH missat ansikte** (ett mått åt bara ett håll rankar en oändligt liten yta som bäst) |
| `node scripts/silhuett.mjs [--person]` | skriver konturen rad för rad till `manifest.geometri.silhuett` (körs av `ansikte.mjs`; fristående för ett redan klippt manifest) |
| `node scripts/_minprobe.mjs [--bild]` | vad KOSTAR en min, och hur mycket av lappen bär information? (skillnad mot referensen per tröskel + bbox + GPU-tal). Svaret var **12 %** — diff-beskärning är ingen besparing |
| `node scripts/_vaxelprobe.mjs` | `mata-munnen`s VÄXLAR: fönsterrotationen (fågel→fjäril→regnbåge) · kokar-över-räknaren · skymten i tugget · gegga-trappan — läser TILLSTÅND (visible/räknare/aktiv min), kontrollarmar först |
| `node scripts/_karaktarbild.mjs [--reaktion jubel]` | karaktärsriggens alla humör i ett rutnät + exit-koll |
| `node scripts/_dragprobe.mjs <id>` | tyngden i draget: eftersläpning · lutning · skugga · städning · exit mitt i drag |
| `node scripts/_livprobe.mjs <id>` | vilorörelsen: amplitud · fasspridning (lås?) · tickar något efter exit? — mäter MEKANISMEN (`feedback.liv()`), inte om scenen lever |
| `node scripts/_stillaprobe.mjs [id…]` | **står spelet stilla när barnet inte gör något?** urvalssåll över hela registret. Kör i TRE svep — bara tal som håller i alla tre är ett fynd |
| `node scripts/_vilkaprobe.mjs <id>` | **VILKA noder rör sig** (storlek · typ · väg). `_stillaprobe` säger bara HUR MÅNGA — kör den här innan du bygger något på ett stillhetstal |
| `node scripts/_navprobe.mjs [BxH]` | skärmbyten: riktning · cremeblänk mitt i övergången · fastnar routern? |
| `node scripts/_bytprobe.mjs [--spel id]` | hur länge lever det gamla spelet in i nästa skärm? (tryck → monterad → riven, med `voice.say/cancel` + `stopAllLoops` i fönstret) |
| `node scripts/_perspektivprobe.mjs` | läses badet som en SIDOVY? ytlinje · golv under karet · fötter mot golvet · ankan i ytan · vattnet innanför porslinet |
| `node scripts/_repprobe.mjs` | verlet-repet: vilolängd · fästpunkt · mjukt stopp · golv · spänd lina — **utan webbläsare** |
| `node scripts/_mjukprobe.mjs` | mjuka kroppar: håller formen · sjunker när de mjuknar · knuff · exit — **utan webbläsare** |
| `node scripts/_vobbelprobe.mjs` | vobbeln i ett spel: utslag vid landning · lugnar den sig · tappad volym · exit |
| `node scripts/_pressprobe.mjs [--takt]` | `pruttbad`s bubbla mot ytan: finns skedet · plattas hinnan · är det YTAN som gör det · tempot mot HEAD |
| `node scripts/_tuggprobe.mjs [--bara-exit\|--kostnad]` | tuggan + magen i `mata-monstret`: käkens gap trycker maten · buktar den ut · syns den (isolerat lager + kontroll) · växer magen vid SVÄLJET · exit |
| `node scripts/_bullprobe.mjs` · `_stapelprobe.mjs` | hamburgerbullen som mjuk kropp: viloform mot den gamla `roundRect` · sammantryckning · tappade bildrutor — **utan webbläsare** (och samma bulle under en riktig stapel) |
| `node scripts/_tradprobe.mjs [--bild]` | `spindelnatet`s nättråd: bågen mot kordan ut/in · ändpunkter · sprängning · exit — **mäter den RITADE vägen** (hakar på path-metoderna), så den fungerar i båda armarna |
| `node scripts/_pendelprobe.mjs` | `spindel-zacke-svingar`: är nätet spänt (finns slack att lösa)? · no-fail-golvet · periodens 2π√(L/G) |
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
  **Och pröva köpostens PREMISS mot koden innan något byggs** — den faller ofta: "tuggbar mat"
  gick inte att göra som en deformation (`food.js` = 5–7 lagrade `Graphics` × 18 varianter, ingen
  silhuett att töja, och `generateTexture` är förbjuden), `pruttbad`s bubbla poppade i SAMMA
  bildruta som ytan bröts (inget liggande skede att fysikalisera), `pizzabageriet`s sås var en
  fylld cirkel i bottnens ritning. Faller premissen: **skriv om posten till det som faktiskt går
  att bygga** — bygg inte en större sak i stället för att rädda formuleringen.
- **Grönt test betyder bara "0 konsolfel".** Det säger ingenting om målet går att nå, om mätaren
  syns eller om scenen är tom. Grävmaskinen klarade en nivå på 3,4 s och rapporterade grönt.
  `npm run test` kör därför `bildkoll.mjs` på skärmdumpen — **och titta på bilden själv ändå.**
  **Och harnessens auto-drag drar mellan GENERISKA punkter** — den träffade inte en enda matbit
  i `mata-munnen` (loggen: fyra `drag/foremal`, noll `drag/ratt`), så hela kärnloopen var grön
  och omätt. Läs `drag/ratt` i `.test-logs/<id>.json`: står den på 0 har testet aldrig spelat
  spelet, och en sond som drar från föremålets FAKTISKA läge till målet är enda mätningen.
- **Repliker som inte står som `voice.say('literal')` får aldrig ett klipp.** `check.mjs` kan bara
  läsa literaler; byggs texten vid körning (template literal, tabelluppslag) syns den inte statiskt.
  Backstoppen är mätt, inte gissad: `check.mjs` läser `rost-utan-klipp` ur `.test-logs/<id>.json`
  och varnar för den **exakta** text körningen sa. Den kontrollen kräver alltså att spelet har
  körts — `npm run check` ensam ser dem fortfarande inte. Lägg in frasen i
  `scripts/voice-phrases.json` för hand och kör `npm run voice`.
- **Kör ALDRIG två webbläsarsonder samtidigt — de förfalskar varandras svar.** `_elementprobe`
  och `_snurrprobe` startade i samma tool-block mot samma dev-server, och `_elementprobe`
  rapporterade då att `jord+vatten` gav **noll lera**: en av spelets sex reaktioner såg
  stendöd ut. Den var det inte. Ensam kör samma sond `lera=24` och tänder rutan. Sonderna
  väntar i fasta fönster (260 ms för att materialet ska lägga sig, 1800 ms mätning) och två
  headless Chrome svälter varandras ticker tills fönstren mäter fel skede. Kostnaden blev
  två engångssonder och ett halvt pass jagande av en bugg som aldrig fanns. Samma regel
  gäller sond bredvid `npm run test:all`. **Och kontrollarmen först, alltid:** min egen
  node-arm lade elden med en rads lucka till jorden, glöden nådde aldrig fram, och armen
  var död utan att säga det — hade jag läst lera-talet bredvid den hade jag trott på fel svar.
- **Ett släpp når ALDRIG ett syskon — och en bubblande förälder måste vara `static`.** Har ett
  spel TVÅ greppytor måste `pointerup`/`pointerupoutside` sitta på deras gemensamma FÖRÄLDER.
  Pixis båda släppvägar går uppför en föräldrakedja, aldrig i sidled: `mapPointerUp` bubblar
  längs SLÄPP-MÅLETS kedja och `mapPointerUpOutside` bara uppför **pressTargets egen**
  (`EventBoundary.mjs:559,634`). `skattjakt-i-morkret` lyssnade på `_catcher` medan ficklampan
  bodde i `_front` — ett syskon — så greppet på lampan släpptes aldrig: `_drar` stod kvar `true`
  och `_pekId` på ett dött finger-id, och eftersom varje ny fingerpekning får ett **nytt**
  pointerId avvisades allt därefter som "andra fingret". **Permanent död träffyta utan ett enda
  konsolfel**, grönt test hela tiden — bara en pekare med två olika id:n hittar den.
  ⚠️ Andra halvan var inte gratis: `notifyTarget` (`:370`) bortar tyst på allt som inte är
  `static`/`dynamic`, så en bubblande förälder på default `'passive'` får **ingenting** — utan
  `eventMode = 'static'` fastnade även kontrollarmen. En bar `Container` utan `hitArea`
  träfftestar ändå alltid falskt, så roten blir inte själv ett träffmål av raden.
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
- **`Mjukkropp.path()` är INTE en polygon — invändningen "en tiohörning läser som en kantig
  klump" gäller den inte.** Kurvan lägger kvadratiska mellansteg genom kantmittpunkterna och
  avviker **0,01–0,12 px** från en perfekt cirkel för 10–16 punkter över hela spannet 17–100 px
  radie; den råa polygonen ligger på 0,33–4,89, alltså 40× mer. Formhalvan av `sapbubblor`s
  strykning var ett antagande om renderingen. **Kostnadshalvan står kvar** (en full omritning
  per kropp och bildruta), så svaret är att göra bara de kroppar mjuka som faktiskt deformeras
  just nu — i `pruttbad` bara bubblorna vid ytan, uppmätt högst 3 samtidigt.
- **Ett bibliotek kan skriva konsolfel INNAN du hinner fånga felet.** three.js lyssnar på
  `webglcontextcreationerror` och gör `console.error` i lyssnaren; konstruktorn kastar först
  efteråt. `glittergrottan`s reservläge var alltså helt korrekt — full bild, rätt beteende —
  och testet ändå **rött av 8 konsolfel**. Hämta resursen själv där det går (`getContext`
  utan lyssnare är tyst) och lämna den färdig till biblioteket: `new WebGLRenderer({ canvas,
  context })`. Samma fråga gäller nästa bibliotek: loggar det något innan mitt `catch` körs?
- **`Web page caused context loss and was blocked` är en SPÄRR för sidan, inte en transient.**
  Omtagningar hjälper inte — uppmätt 0 räddningar av 2 fall över 15 körningar. Det som räddar
  bilden är att spelet kan köra UTAN resursen. → ÅTGÄRDER V15.
- **Animera aldrig containern som `addTarget` fick — det flyttar snäppytan.** `DragController`
  mäter avståndet till `target.view.x/y` **när saken släpps**. `sortera-skrap`s tunnor fick en
  tyngdkänsla som sänkte dem upp till 13 px i guppet, och då flyttade målet undan sig självt
  mitt i ett släpp: loggfyndet `snal-snappyta` (släpp **2 px** utanför radien). Samma sak gäller
  `hitArea`, som sitter på samma nod. **Animera i ett BARN** — då står både släppmål och
  träffyta still medan bilden rör sig. Sonden såg det inte; `test:all`-loggen gjorde det.
- **Ett GRÖNT pixeltal kan mäta allt utom din effekt — kör sonden mot HEAD innan du tror på
  den.** Fem gröna tal i ett och samma pass mätte ingenting, alla gröna även på HEAD där
  effekten inte fanns: ⓵ en isolering som stannar före roten mäter **skalets bakknapp**
  (16 320 px i båda armarna); ⓶ en isolering som MISSLYCKAS ger en skärmdump av hela scenen —
  räkna den som 0, aldrig som en mätning; ⓷ en livslängd mätt från fel nollpunkt blir
  `performance.now()` = 15 116 ms när ingenting föddes; ⓸ spelets **egen idle-hjälp** målar i
  samma `fxLayer` efter 6–9 s stillhet (nollställ räknarna genom hela fönstret); ⓹ `fxLayer` är
  **delat** — badets bubblor i `tvatta-djuret` målar där varje bildruta, och fältet bär
  parkerade partiklar (1 988 px utan någon effekt alls). Mät i en RUTA runt effekten, och läs
  **svängningen** (max − min), inte nivån.
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
- **När en sond rapporterar ett ANTAL är identiteten på det den räknade fortfarande OMÄTT.**
  `_stillaprobe` gav nästan identiska tal åt två spel och rätt svar var motsatt: `kla-efter-vadret`
  4,2 px / 3 av 84 noder var ett **äkta** fynd (de tre var en dekorativ vädersymbols glow-puls
  medan spelets enda karaktär stod stilla), `folj-sparet` 4,6 px / 2 av 30 ett **falskt** (de två
  ÄR figuren — container + dess Graphics, samma sak räknad två gånger — och rörelsen är
  `_lookEager` som fungerar). Jag gissade identiteten på de tre ("snöflingorna"), skrev det som
  om det vore mätt, och hann få in det i ett commit-meddelande, två dokument och ett sondhuvud
  innan `_vilkaprobe.mjs` visade att det var vädersymbolen. **Kör `_vilkaprobe` innan du bygger
  något på ett stillhetstal.** En summerad RÖRLIG YTA prövades som skiljelinje och **förkastades
  med mätning** — den rankar det döda spelet (53 482 px², stor glow-cirkel) före det levande
  (10 969 px², liten figur). Frågan "lever scenen?" har inget skalärt svar.
- **En ny sond kostar mer än speländringen — kör kontrollarmen FÖRST.** Uppmätt över kvällspasset
  2026-08-12 (v1.181–1.182): **630 rader sond mot 459 rader spelkod**, och `_tuggprobe` ensam
  (413 rader) var större än ändringen den mätte. Posten tog **77 min mot dagens 8–25 min per spel**
  — inte för att spelet var svårt, utan för att MÄTAREN var fel fyra gånger innan den var rätt:
  magens `rorelse` gav 27 → 217 mellan två körningar av samma sak · "duken är svart när allt är
  dolt" räknade 921 600 av 921 600 ljusa pixlar i BÅDA armarna · skumnivån nollställs när målet nås
  · en CPU-strypning som inte bet ens vid ×20. Alla fyra hade fallit direkt på en körning mot HEAD
  eller mot en känd barlast. **Ordningen är: kontrollarm (HEAD, eller barlast med känt utslag) →
  se att talet RÖR SIG → först då mätarm.** En mätning som inte kan skilja två KÄNDA lägen åt
  säger ingenting om det okända — och en sond som mäter fel kostar mer tid än hela speländringen.
  **Och lista `scripts/_*probe*` innan du döper en ny** — `_svingprobe.mjs` fanns redan (7/7,
  spök-bågen) och skrevs över av en ny sond med samma namn 2026-08-12.
- **Mät den RITADE geometrin när de två armarna inte delar tillstånd.** HEAD har inget rep att
  läsa när ändringen är "tråden blir ett rep" — men båda armarna RITAR en väg. `_tradprobe`
  hakar på `_thread`s egna `moveTo/lineTo/quadraticCurveTo` och mäter den; då finns ett tal i
  båda armarna (bågen 0,0 % mot 13,4 % av kordan). Samma pass bar två klassiska mätfel: ett
  läge avläst i FEL bildruta mätte skjut-armens flax (29,3 px), och en kvot vars **nämnare
  flyttar sig** (kordan är ~0 px när skottet börjar) gav 2,46× utan att en pixel var fel.
- **En ringbuffert av tweens dödar den EVIGA tweenen först.** `Ansikte._track` höll 24 tweens
  och kastade den ÄLDSTA när listan blev full — och den äldsta är `liv()`s oändliga andetag,
  som registreras vid uppstart och aldrig tar slut av sig självt. Med bara tugg och miner
  räckte 24 platser länge; med huvudgester (en nick per min, ett ryck per bus) fylls de på en
  halv minut, och ansiktet slutar andas **utan ett konsolfel**. Uppmätt med den gamla koden
  inlagd som kontrollarm: **1,66 ‰ svängning före 40 gester → 0 ‰ efter**. Rensa FÄRDIGA
  tweens i stället för de äldsta, och skydda `repeat: -1`. Samma fråga gäller varje tak på en
  lista av levande saker: är det yngsta eller det VIKTIGASTE som ryker?
  — **och den rättningen läckte i sin tur.** `isActive() || totalProgress() < 1` kan inte
  skilja LEVANDE från DÖDAD: en dödad `repeat: -1`-tween ger `isActive() === false` men
  `totalProgress() === 0`, alltså < 1, och slapp igenom filtret — medan while-loopen hoppade
  över allt evigt och aldrig kunde vräka den. `liv()` anropas en gång per tugga, så listan
  växte med **en permanent död post per tugga** (uppmätt 1 → 33 över 60 tuggor). Vid mättnad
  dödades LEVANDE tweens: en hel grimaslapp frös på alfa 1 med `visible: true` medan en annan
  min var aktiv — **två ansikten på en gång, permanent, med noll konsolfel**. Måttet som
  faktiskt svarar är **`tw.parent`** (sann för löpande OCH väntande, falsk för både färdiga
  och dödade — `_tweenprobe.mjs` prövar alla lägena). Och samma fråga gäller varje flagga som
  betyder "lever": `if (this._blinkTimer)` frågade om fältet var SATT, inte om timern LEVDE.
- **`voice.say()` KAPAR den förra repliken — schemalägg aldrig tal på ett fast tal.** Den
  anropar `cancel()` som första sak, och de F5-genererade klippen är **2,3–4,1 s** medan
  spelens `ctx.later(...)` nästan alltid står på 2–3 s. Uppmätt i `mata-munnen`: introt
  (3,65 s) kapades av nästa replik och belöningsraden (2,71 s) hann höras till **54 %** —
  ett barn hör att någon blev avbruten mitt i meningen. Samma familj som "två röster
  samtidigt" (v1.194), fast åt andra hållet, och den fanns i ett spel som redan hade rättat
  den andra halvan. Vänta in **`voice.kvar` / `voice.talar`** (narratorn) OCH
  `audio.sampleDuration()` (figurens eget klipp) — mönstret heter `_narTyst`. **Bilden
  väntar inte:** ring, gest och glitter kommer genast, bara orden köar.
- **`killTweensOf(figuren)` når BARA figurens rot — barnbarnen städas aldrig.** Armar som
  vinkar, ögon som kisar och en del som studsar in ligger en nivå längre in, och en rivning
  som bara tar roten lämnar dem levande. I `bygg-en-kompis` hann en vinkning (0,72 s) nästan
  alltid vara igång när nästa knapp rev figuren; harnessen larmade `tween-mot-forstort`, men
  **sonden var helt tyst** — gsap skriver bara på en nollad transform och Pixi v8 kastar
  ingenting. "0 konsolfel efter exit" är alltså blind för precis den här läckan (fyra
  exit-tider gav 0 fel i BÅDA armarna). Ge sammansatta figurer en städhjälpare som tar alla
  animerade innernoder och kalla den före varje rivning — även för kopior i ett galleri.
  **Mät den:** plocka undan innernoderna i en array FÖRE `destroy()` och räkna
  `gsap.isTweening` efteråt (uppmätt **2 → 0**). Sonden måste använda SPELETS gsap — en
  nyimporterad kopia har en egen global tidslinje och rapporterar 0 oavsett vad som pågår
  (hämta url:en ur `performance.getEntriesByType('resource')`).
- **Konstens utbredning och träffytans utbredning är två olika budgetar.** `bygg-en-kompis`
  vingar var måttade mot kamerans synliga STATIV — men kamerans `hitArea` börjar 100 px till
  vänster om benen, så vingspetsen låg **inne i kameraknappen** och ett tryck på den tog
  kortet i stället för att kittla. Ingen skärmdump visar det, `check.mjs` mäter ingen geometri
  och en `hitArea` ritas aldrig. Ritar du nära en knapp: mät mot grannens **hitArea**, läs
  spetsen ur den RITADE geometrin (`getBounds()`, inte ett tal i sonden — en hårdkodad spets
  rapporterade samma tal efter att vingen krympts) och peka med riktiga muspekningar i varje
  skalläge. Och P0-avståndet vinner: rätt fix var att krympa vingen, inte att vidga ytan.
- **Ett kontinuerligt ljud överlever allt utom att någon stoppar källan.** En tween dör med
  spelet, en `AudioBufferSourceNode` med `loop = true` gör det inte — den låter vidare på
  menyn, utan bild, och går inte att stänga av. Slingor tystas därför av `GameHost.destroy`
  (`audio.stopAllLoops()`) och inte bara av spelets egen `destroy`, av samma skäl som
  `timers`: skalet får inte lita på att spelet gjorde rätt.
- **Byt inte ut stämda ljud mot samplade.** `correct` (660→880 = kvint), `match` (durtreklang) och
  `pling` är musik, inte blipp — ett generiskt UI-klick vore ett brott mot grindens punkt 5.

## Arbetsregler

- **`old/` är arkiverat skräp** — läs, greppa eller citera aldrig något därunder.
- **Grind före commit:** `npm run check` grön + `npm run test <id>` med 0 konsolfel och inga
  `fel`-nivåfynd. En commit per spel, explicita sökvägar, aldrig `git add -A`.
  Commit-ämnen på asciiFold-svenska. **`git push` bara till `origin master`** (publikt repo
  `bjorkvallens-varld`) — varje push publicerar sajten via GitHub Actions, så grinden måste
  vara grön FÖRE pushen. Aldrig push till någon annan remote eller gren.
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
