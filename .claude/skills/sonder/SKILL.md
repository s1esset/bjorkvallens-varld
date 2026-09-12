---
name: sonder
description: "Use when you need to MÄTA något i det här repot i stället för att gissa - balans, bild, fysik, vätska, partiklar, kamera, ljud, ansiktsrigg, träffytor, stillhet, tweens, bildrutekostnad, exit-säkerhet eller PWA-uppdatering. Innehåller hela katalogen över scripts/_*probe*.mjs och bildsonderna: vilken sond som svarar på vilken fråga. Ladda den innan du bygger en ny sond - den finns nästan alltid redan. Triggers on - sond, probe, mät, mäta, mätning, bildkoll, baslinje, balans, känns fel men testet är grönt, _lastprobe, _idleprobe, _partikelprobe, _fpsprobe, _vatskeprobe, _plattprobe, _bbox, _dragprobe, _livprobe, _stillaprobe, _vilkaprobe, _navprobe, _tweenprobe, _riggprobe, _kameraprobe, _grindprobe, _uppdatprobe, _ab.sh."
---

# Sonder — mät, resonera inte

Grönt `npm run test` betyder bara "0 konsolfel". Det säger ingenting om målet går att nå, om
mätaren syns eller om scenen är tom. Det här är katalogen över allt som faktiskt MÄTER.

**Innan du skriver en ny sond:** kör `ls scripts/_*probe*` och läs tabellen nedan — den finns
nästan alltid redan. En ny sond kostar i snitt mer rader än speländringen den mäter, och en
mätare som är fel kostar mer tid än hela ändringen. Ordningen är alltid: **kontrollarm (HEAD,
eller en barlast med känt utslag) → se att talet RÖR SIG → först då mätarmen.**

⚠️ **Kör aldrig två webbläsarsonder samtidigt** — de svälter varandras ticker och förfalskar
varandras svar. Samma regel gäller sond bredvid `npm run test:all`.

Bild- och balanssonder (kör dem när ett spel *känns* fel men testet är grönt):

| | |
|---|---|
| `node scripts/bildkoll.mjs <bild> [--baslinje <bild>]` | tom scen · heltäckande fält · platt layout · diff |
| `npm run test -- --spara-baslinje` · `-- --baslinje` | spara dagens bilder · jämför mot dem |
| `node scripts/_lastprobe.mjs` · `_exitprobe.mjs` | *spelar* ett spel för balans · lämnar mitt i en finish |
| `node scripts/_idleprobe.mjs <id>` | klarar spelet sig själv utan input? (ska vara 0) |
| `node scripts/_partikelprobe.mjs [id]` | tas partikelvägen på riktigt? (fält · antal · pixlar · läckage) |
| `node scripts/_fpsprobe.mjs --cpu 6` | partikelvägarnas kostnadskurva, mätt på MENYN — **öppnar aldrig ett spel**, kräver CPU-strypning |
| `node scripts/_montageprobe.mjs --cpu 4 --varv 3` | vad en MONTERING kostar per spel (blockerande ruta + tid till lugn) — rangordnat |
| `node scripts/_graflackprobe.mjs [--arm head,fix,utanGC] [--vila 120]` | **vad blir KVAR efter spelbyten?** (ÅTGÄRDER V16) föräldralösa GraphicsContexts · deras geometri · GL-buffertar · heap, efter tolv spelbyten och under vila. `utanGC` är barlasten (renderarens GC av). ⚠️ Redigera ingen `src/` medan den kör — Vite laddar om sidan och hakarna försvinner |
| `node scripts/_studsprobe.mjs` | statisk restitution och `studs` (V10) i naken fysik, plus §7 `bowling`s kantstöd: pricklinjen mot klotet vid käglornas rader i tre armar — **utan webbläsare** |
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
| `node scripts/_knyttprobe.mjs` | `unika-knytt`s HELA runda — spak → ceremoni → fyra knackningar → bänken → spaken igen → ny runda. Harnessens nio tryck maxar på **x 950** och spaken står på **1160**, så halva spelet nås bara här. Sedan 2026-09-01 även **upplåsningarna** (U0-U2: taket växer, alla fyra firandena tanda), **återkomsthälsningen** (D0-D2) och **degfasens bildrutebudget** (P0-P3, `--cpu 4`; P3 är barlasten som bevisar att mätaren kan röra sig — utan den är P0-P2 mättade vid vsync och säger ingenting) och **lekfulla läget** (L0-L5: alla fem lägen nås, och L5 läser lutningens TECKEN, inte flaggan). 36 armar; U-familjens kontroll ar en BARLAST (satt `START_TAK` till hela tabellen = HEAD och kor om) |
| `node scripts/_lockbild.mjs [--lock 0,0.55,1] [--bara …] [--r N]` | `unika-knytt`s ÖGONLOCK i bild + tal (ÅTGÄRDER U6). En blink varar 0,2 s och går inte att fånga på måfå — locken tvingas till kända lägen, sex `ogonform` sida vid sida, med ton · sidokant · överkant och en kontrollarm på mätaren själv |
| `node scripts/_knyttlyftprobe.mjs [--bara I,B9,K,R,S,O,N,H,V,G]` | `unika-knytt`s POLERINGSRUNDA 2026-09-10, en familj per steg, varje familj körd mot koden FÖRE sin ändring: **I** `dnaFromSeed` byte-identisk mot utgångsläget `0da98f6` (node, mot `git show`) · **B9** bodens träffytor med åtta skyltar · **K** kupans färglöfte mot knyttets över 40 frön · **R** Ljudtratten + sparpostens generation (en åttafältspost läses som förut) · **S** Skrället — besöken tvingas med spelets egen `_skrallT` · **O** ögonen efter födseln (NaN-blicken ur `bounceIn`s skala 0) · **N** knyttet efter födseln (namnskylten, solen som söver, sömnkornen, folien som följer fingret) · **H** verkstadshyllan (bärskålen med drag och tap-tap, knytt på golvet) · **V** vänner i boden (reglerna i node; duetterna tvingas med bodens DEV-krok `skvallraNu()`) · **G** golvknyttets grannar — träffytorna läses ur den LEVANDE scenen, och om ett tryck når ett bo mäts genom att linda om spelets egen `_boTryck` (lyssnaren slår upp metoden via `this` vid varje tryck). ⚠️ Två S-armar var gröna mot koden UTAN Skrället tills de krävde att stölden skett — samma fälla fällde H5/H7 |
| `node scripts/_lyftbild.mjs [--bara tratt,krona,krona-stor,skralle,tofs,…]` | Rundans BILDER — det mätningen inte ser: noter i flykten, kronan på r 40 och r 92, Skrället på bjälken och kragen, tofsknyttet på bänken med närbild av ansiktet. Det var bilden som fällde kronans första ritning och hittade de pupillösa ögonen |
| `node scripts/_knyttbild.mjs [--storlek 0-3]` | `unika-knytt`s FÖDELSE i bild — det enda stället där knyttets storlek och skuggor går att bedöma. Skriver även lekfulla lägets tre rutor (höger · vila · vänster) och mäter ögonlocket mot kroppens kant |
| `node scripts/_variantprobe.mjs` | **syns unikheten?** hur många av fyra HÖGSALIENTA axlar (kulör · värld · mönster · siluett) som faktiskt skiljer två knytt i rad — utan webbläsare, med fryst mot cyklat recept som armar |
| `node scripts/_upplasprobe.mjs` | **upplåsningarna** i `unika-knytt` (ÅTGÄRDER U3): startverkstans tak · en axel per milstolpe · migrering av en sparpost skriven före räknaren fanns · att `falt` läses UR `_sparaKnytt` — utan webbläsare, med barlast = HEAD som kontrollarm |
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
| `node scripts/_grindprobe.mjs` | föräldragrindens utvägar i tal OCH bild: avbryt-ytan ur `getBounds()` mot P0 · tryck utanför/på kortet · att hållkravet inte försvagats · versionspillens grind |
| `node scripts/_uppdatprobe.mjs --arm head\|fix` | **hur många RUNDOR tills appen hämtar en ny version?** Kräver ett riktigt bygge + `vite preview` — dev-servern har ingen service worker. Bygger om mitt i körningen och läser entry-chunkens namn |
| `node scripts/kenney-sfx.mjs <Audio-katalog>` | importera CC0-ljud → `public/audio/sfx/` |
