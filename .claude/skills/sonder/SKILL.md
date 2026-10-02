---
name: sonder
description: "Use when you need to MÄTA något i det här repot i stället för att gissa - balans, bild, fysik, vätska, partiklar, kamera, ljud, ansiktsrigg, träffytor, stillhet, tweens, bildrutekostnad, exit-säkerhet eller PWA-uppdatering. Innehåller hela katalogen över scripts/_*probe*.mjs och bildsonderna: vilken sond som svarar på vilken fråga. Ladda den innan du bygger en ny sond - den finns nästan alltid redan. Triggers on - sond, probe, mät, mäta, mätning, bildkoll, baslinje, balans, känns fel men testet är grönt, _lastprobe, _idleprobe, _partikelprobe, _fpsprobe, _vatskeprobe, _plattprobe, _bbox, _dragprobe, _livprobe, _stillaprobe, _vilkaprobe, _navprobe, _tweenprobe, _riggprobe, _kameraprobe, _grindprobe, _uppdatprobe, _autouppdatprobe, _nyhetprobe, _ab.sh."
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
| `node scripts/_grodprobe.mjs [arm]` · `_superhoppprobe.mjs [arm]` | `grodan-slurp`s ragdoll i Node: sittpose, hopp, tunga mot Newton · superhoppets höjd/längd/volt/stjärnpose (med kontrollarm) och klibbrepet. `_superhoppprobe` kör med spelets FLYTVOLYM — utan den mäter den en snällare värld (`--utan-flyt`) — **utan webbläsare** |
| `node scripts/_grodspelprobe.mjs` · `_superspelprobe.mjs [--bilder]` · `_superbild.mjs` | `grodan-slurp` spelat i Chrome: ätna/min mot en blind arm · superhoppet hela vägen (sats → volt → stjärna → rep → vakna → slurp), grodkörens håll, exit med repet ute · närbilder 2× |
| `node scripts/_bajsloopprobe.mjs [--rundor 5] [--bilder]` · `_bajssuperprobe.mjs` · `_bajsbildprobe.mjs` | `grodan-slurp`s BAJSLOOP spelad hela vägen (äta → bajsa → hämta → bära → kasta ×3): tid till första korven, per korv, per runda, exit mitt i kast/krystning/korv-på-tungan, och en ögonblicksbild (senaste händelserna) när inget händer på 30 s · superhopp MED korv i munnen (korven kvar, repet fångar inget) · bilder av lägen en spelsond aldrig hinner fota (fri korv, bär, kast, matade ungar) |
| `node scripts/_klatterprobe.mjs [--varv 4]` · `_varldbildprobe.mjs` | `grodan-slurp` L4 (värld större än skärmen): KLÄTTRA gren för gren med riktiga tryck — når grodan alla grenar, följer kameran med upp, kommer den ned igen, lämnar den aldrig bilden · bilder från sju kameralägen (stränder, kronor, kören, mitten uppe) + parallaxen som TAL (fjärranbandet ska flytta 0,3 × kameran, himmel/HUD 0). Engångsdiagnoser bredvid: `_grendiag` (vad grodans delar rör vid), `_stubbdiag` (tungans `_undanta`), `_klatterdiag`, `_startbladdiag` |
| `node scripts/_svampprobe.mjs` · `_bajsloopprobe --biom is\|fors\|skog\|damm` · `_varldbildprobe --biom X` | `grodan-slurp` L5 (biomerna): landar grodan på en studsig ENVÄGSsvamp i superhoppsfart (studs / landning / igenom) + ett riktigt superhopp intill · hela bajsloopen i en tvingad biom · bilder av en tvingad biom. ⚠️ Biomen byts vid VARJE start (progress `biomNasta`) — en sond som öppnar spelet flera gånger hamnar i olika biomer; tvinga med `g._tvingaBiom` + `_rivVarld()`/`_byggVarld()` (så gör `_vassfalleprobe`, som behöver dammens stubbe) |
| `node scripts/_siktprobe.mjs [--bilder]` | `grodan-slurp` v1.260.0: SIKT-PILEN i superhoppet — håller och DRAR med riktiga muspekningar, läser pilens egen bana i sista bildrutan före släppet och spelar in grodans tyngdpunkt VARJE fysiksteg (`phys.beforeStep`): fel mellan pilens punkt k och steg k, topp, landning, kontaktloggen (vad benen slog i). Plus kort drag = superhopp, kort tryck = vanligt hopp, vändknappen (vänder, ingen tunga, halon träffar, inte i stjärnläget), exit mitt i ett drag. ⚠️ Rikta in inspelningen på SLÄPPET (första steget med fart > 5) — ett steg före släppet och lättningens 4 px förskjuter annars allt ett steg |
| `node scripts/_biomrokprobe.mjs [--biom a,b] [--hinder] [--bilder]` · `_biommekprobe.mjs` · `_vagdiag.mjs` | `grodan-slurp` L6/L7: RÖKTEST per biom (byggs världen, sitter grodan, startar varje hinder i poolen, konsolfel med stack) · varje biomegenskap mot en KONTROLLARM (het sand mot skogen, halt kakel mot vanligt, träskvatten mot dammen) · vågorna mätta på en FLYTANDE GRODA (stocken fastnar mot stenar och ljuger). ⚠️ `_bajsloopprobe --biom X --rundor 1` gjorde 0 tryck före 2026-09-24 (ombyggnaden räknade upp rundan) — ett "grönt" resultat utan tryck har inte spelat |
| `node scripts/_tumlaprobe.mjs [--biom a,b] [--hopp 12] [--arm tapp,sats,max] [--debug]` · `_grodvisprobe.mjs --biom X --tid natt [--sats] [--kor]` | `grodan-slurp` v1.262.0: hur ofta TUMLAR grodan på vanliga hopp (tapp · sats-hopp under full sats · maxfart) — riktiga muspekningar på grodans läge, hakar på spelets `_small` och räknar tummel per kroppsdel → mot vad, och om grodan landade på benen. HEAD 2026-09-25: tapp 4/60 → 1/60 · sats 18/60 (superhopp) → 0/60. ⚠️ En "landade inte" med `lamnade false` är ett tryck som aldrig startade (grodan studsade på en svamp/soffa när sonden tryckte) — inget spelfel · bilder av en tvingad biom × tid, maxfartens röda pil och glitter, och kören på land i de torra världarna. ⚠️ Röda pixlar kan INTE räknas ur canvasen med `drawImage` (WebGL utan `preserveDrawingBuffer` läses tom — kontrollarmen gav 0 också): titta på skärmdumpen |
| `node scripts/_konst-ute.mjs` · `_konst-inne.mjs` · `_konst-djur.mjs` | Förhandsbilder av RITFUNKTIONER (konst-ute/konst-inne/djur.js) på en egen Pixi-duk, med kropparnas mått som röda ramar. De två första laddar en rå JS-fil från dev-servern i stället för appen — sidan har ingen HMR-klient och laddas inte om när någon annan sparar i `src/` (så kunde tre hjälpare rita parallellt) |
| `node scripts/_vassfalleprobe.mjs [--falla vass\|stubbe]` · `_grodfastprobe.mjs` | Fastnar grodan? `_vassfalleprobe` STÄLLER grodan i vassen vid kanten vänd mot väggen i varje pass (samma läge i båda armarna) och räknar kom-loss/ätna/skott-i-vassen — kontrollarmen fastnade 2/6, rättelsen 6/6 loss · `_grodfastprobe` är det envisa barnet (alltid närmaste insekt) med ögonblicksbild vid 25 s utan att äta. Går att köra mot HEAD före bajsloopen |
| `node scripts/_satsprobe.mjs` | **syns ett tryck inom 100 ms (P0)?** pixelsvängning i en figurs EGNA lager 90 ms efter trycket, mot kontroll (inget tryck) och HEAD-arm. Frys figurens egna ögonblick först (blink, blick, kvack) — annars 200–4 200 px brus som dränker svaret. Mall för samma fråga i andra spel |
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
| `node scripts/_tomgangprobe.mjs [id…] [--eget] [--kontroll]` | **kapar spelet en replik som talar?** Standardläget säger en 8,99 s-replik och räknar allt som kapar den (V21: påminnelser). `--eget` säger INGENTING själv och räknar varje replik som kapar en annan av spelets egna, med hur långt den hann (V24) — det enda läget som ser repliker före 0,9 s och `folj-sparet` (vars intro ÄR sondens långa replik). Kontrollarm för `--eget`: `domino` på koden före V24 |
| `node scripts/_klipplangd.mjs "replik" …` | röstklippets längd (ffprobe) för en EXAKT replik — jämför mot spelets fasta fördröjningar |
| `node scripts/_bagprobe.mjs [id…] [--noll]` | **drar en `arc()` ett streck?** (V23) hakar på appens GraphicsContext och mäter penna → bågens start per båge: sådden efter fill/stroke ('sadd'), kedjade bågar ('vag'), uttryckligt moveTo för sig ('moveTo' — `bage()` ska stå på 0,0 px, tårtbitar på radien). Tre kontrollarmar körs först. Når bara det som ritas vid montering — `_bagscan.mjs` är läslistan för resten. **Kör efter varje Pixi-uppgradering** |
| `node scripts/_bagnanprobe.mjs` | vad en NaN-sådd (båge direkt efter båge) ritar i BILD — i dag samma pixlar som en ren båge, med sådd-i-origo som kontrollarm |
| `node scripts/_lampprobe.mjs` | släpps draget på BÅDA greppytorna? (`_drar`/`_pekId` efter släpp + flyttar en NY pekare något) — två finger-id, kontrollarm före mätarm |
| `node scripts/_pekavbrottprobe.mjs [id…] [--url http://localhost:5174] [--n 40]` | **FYSIKPLAN M3 — vad händer när fingret AVBRYTS?** (sortera-skrap · spindelhjalten · popcornkalaset · knuffa-tornet · studsa-ner · fanga-frukten, riktiga CDP-pekningar, färsk sida per arm). Arm 0 kontroll (`touchEnd`, ett NYTT grepp efteråt — lyckas inte armen är raden OMÄTT) · 0b räknar DOM-`pointercancel` på window (0 → sonden skickar ett eget) · A `touchCancel` mitt i draget, sedan ett nytt finger-id (sortera: ett ANNAT föremål, annars kapar det fastnade greppet samma föremål och ser ut som ett lyckat) · B två fingrar: dras föremålet av finger 2? följer det finger 1 klart? Pixi 8 binder aldrig `pointercancel`, så en avbruten pekning ger aldrig `pointerup`. Standard-URL **:5174** (dev utan HMR) |
| `node scripts/_fysikkostnad.mjs <id…> [--cpu 4] [--varv 3] [--sek 2.5] [--utan-drag] [--egen _metod,…]` | **FYSIKPLAN M4 — hur stor del av bildrutan är fysik?** `_popcornomrit`s ticker-stämplar (före spelet / efter Pixis render) + tidtagning inuti `PhysicsWorld.update`, `Rep.steg` och spelets egna fysikmetoder (exklusivt, via prototyp-hakar på modulens EGEN instans) → total · fysik · resten, median/p95/**medel** (timern är kvantiserad till 0,1 ms — andelen bor i medelvärdet). Två kontrollarmar före allt: barlast 4 ms utanför fysiken (K1) och inne i den (K2) måste flytta rätt kolumn ≈ 4 ms. `spindelhjalten` mäts även under ett pågående sikte-drag. Standard-URL **:5174** |
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
| `node scripts/_fallvaktprobe.mjs` | **Fällvakterna `statisk-fart` / `snurr`** i `PhysicsWorld._diagSample` (FYSIKPLAN R1): laddar libbet via Vites `ssrLoadModule` så att gamelog är PÅ i Node och den riktiga vakten körs. 5 kontrollarmar (driv-drag+paus MÅSTE flagga · flytta/kinematisk/rullande klot får inte · Constraint-grepp r²m/I=3 MÅSTE flagga snurr). I `.test-logs/<id>.json` är det två `varning`-fynd — aldrig `fel` — läs `label` + talet och leta identiteten (`_vilkaprobe`-mentalitet). `grodan-slurp`s hinder drivs med `setPosition(…, true)` med flit: en träff medan hindret STÅR STILL är äkta |
| `node scripts/_navprobe.mjs [BxH]` | skärmbyten: riktning · cremeblänk mitt i övergången · fastnar routern? |
| `node scripts/_flikprobe.mjs [--stor id] [--sma id]` | **åldersbanden i skalet:** syns Utmaning bara när ett storbarnsspel finns · hamnar det BARA där · rätt `ctx.band` · `complete()` berömmer ur `PRAISE_STOR` — varje fråga med småbarnsspelet som kontrollarm. Utan storbarnsspel i registret är "Utmaning dold" rätt svar |
| `node scripts/_bytprobe.mjs [--spel id]` | hur länge lever det gamla spelet in i nästa skärm? (tryck → monterad → riven, med `voice.say/cancel` + `stopAllLoops` i fönstret) |
| `node scripts/_perspektivprobe.mjs` | läses badet som en SIDOVY? ytlinje · golv under karet · fötter mot golvet · ankan i ytan · vattnet innanför porslinet |
| `node scripts/_repprobe.mjs` | verlet-repet: vilolängd · fästpunkt · mjukt stopp · golv · spänd lina — **utan webbläsare** |
| `node scripts/_mjukprobe.mjs` | mjuka kroppar: håller formen · sjunker när de mjuknar · knuff · exit — **utan webbläsare** |
| `node scripts/_poppprobe.mjs` | kan en mjuk kropp VÄXA fort (popp ×4) utan att vända sig ut och in FÖR GOTT? gräns per steg · recept över punkter × överskjut · kostnad per kropp — **utan webbläsare** (inför `popcornkalaset`) |
| `node scripts/_poppdemo.mjs [ut.mp3] [--gap 80]` | LYSSNA på en popcornkaskad (38 korn) — standard UTAN spärr (ägarens val, facit för `popcornkalaset`), `--gap` ger en spärrad variant; skriver en mp3 att ge ägaren |
| `node scripts/_popcornnaiv.mjs [--fall P1,G3] [--bild]` | går kärlen att styra för en NYBÖRJARE? P1–P5 påsen, G1–G8 grytan (ställ ned, handtag, otålig, skaka, över gästerna, tryck i bordet) mot dev-servern; vart innehållet tog vägen + om grytan någonsin var utanför bild. Byggarens egen sond spelar bara expertvägen |
| `node scripts/_popcornhandtag.mjs [--fall H2] [--spar]` (`TIPP=1.7,0.022`) | popcornkalasets GRYTA med sidohandtag — bära stadigt, tryck i bordet, banor över gästerna (flyger den?), ägarens flöde "ställ på skål, ta handtaget, håll" över alla skålar × båda handtagen — **utan webbläsare** |
| `node scripts/_popcornhandtagbild.mjs <skål> <sida>` | EN hällning i sidohandtaget i sex rutor — visade att det rinner ut på den BORTRE sidan, inte under handtaget |
| `node scripts/_popcornhall.mjs [--golv]` | popcornkalasets PÅSE med en gest (bär, tryck nedåt över grytan) — varje grepp + kontrollarm som INTE får hälla — **utan webbläsare** |
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
| `node scripts/_autouppdatprobe.mjs [--bara a|b]` | **hämtar appen en ny version SJÄLV?** Samma riktiga bygge + `vite preview`. Kontroll (ingen ny version → ingen omladdning) · A: ny version medan barnet är i biblioteket → laddas ner men byts FÖRST på menyn · B: ny version medan menyn visas → byts utan knapp. 8/8 med v1.279, 2/6 på HEAD |
| `node scripts/_nyhetprobe.mjs` | menyns Nyheter-ruta i 1280×720 och 952×428: öppnas, ryms, **scrollar med fingret**, stängs med ✖ och utanför. ⚠️ `Input.synthesizeScrollGesture` scrollar ingenting i headless (0 px även med touch-action auto) — råa `dispatchTouchEvent` skiljer lägena (285 px mot 0 px med `touch-action: none`) |
| `node scripts/kenney-sfx.mjs <Audio-katalog>` | importera CC0-ljud → `public/audio/sfx/` |

Fysikbänken (FYSIKPLAN M1, **utan webbläsare**, ~1 s):

| | |
|---|---|
| `node scripts/_fysikbank.mjs [--bara S6,S7,S8] [--json] [--start ms]` | **S6 takt** (Pixis riktiga `Ticker`, `maxFPS 60`, stämplar à 0,1 ms vid 30–120 Hz → andel rutor med 0/1/2/3+ steg + flytjämvikt `flyt 1,6`, rätt 0,625) · **S7 kostnad** (Engine.update N=0…120 med/utan sömn · FluidWorld 200–800 · Mjukkropp) · **S8 kinematik** (vägg dras in i boll: teleport per ruta mot fart per steg). Varje scen har kontrollrader som måste hålla innan mätraderna skrivs (S6: 60,000 Hz exakt → 1 steg/ruta och 0,625 · S7: växer med N · S8: vägg i vila → bollen orörd); faller de skrivs inga mätrader och exit-kod är 1 |
| armarna i S6 | `ref` = DAGENS ackumulator + flytkraft per bildruta, inbäddad i sonden (oberoende av lib-filerna) · `ref-T` = snäpp 0,5 ms + kraft per steg (målläget) · `lib*` = `physics.js`/`flytkraft.js` som de står, med självstegning DETEKTERAD (volymen la en `beforeUpdate`-lyssnare → bänken anropar inte `steg(t)`). `lib` ska likna `ref` före T1/T4 och `ref-T` efter. ⚠️ Okvantiserade stämplar går inte att tro på genom tickern (flyttalsbrus → 33/33/33 %), därför är kontrollen en direkt `deltaMS = 1000/60`. S1–S5 och S9 är TODO i filhuvudet |

Takt-sonden (FYSIKPLAN M2, **webbläsare**):

| | |
|---|---|
| `node scripts/_taktprobe.mjs <id> --expr "namn=g._balls[0]?.body.position.x" [--hz 30,45,57,60] [--seed 7] [--sek 8] [--tryck "1.5:640,60"] [--drag "2:300,400>900,400:0.6"] [--riktig-klocka]` | **vad GÖR en bildruta?** Samma värld vid olika Hz: seedad `Math.random`, tickern stoppad (`autoStart=false`, `maxFPS=0`) och driven med `ticker.update(t += 1000/hz)`, `performance.now`/`Date.now`/gsap virtualiserade och drivna av sonden, tryck på samma SIMULERADE tid (sek eller `Nt` = tick) som riktiga PointerEvent. Uttrycket körs med `g` (spelet) · `ctx` · `S` · `t` · `k` · `hz`; förval = `g._phys.engine.timing.timestamp` (fysiksteg, ska vara lika vid alla Hz). Tabell per uttryck + max−min över armarna |
| kontrollarm FÖRST | `--hz 60,60` → ska säga IDENTISK (annars är armen inte deterministisk: röst/ljud på väggklocka, I/O under montering — jämför inget). Sedan `--hz 30,60`: per-bildruta-kod ska SKILJA, en fix per fysiksteg ska inte. Tusen tick = ~4–6 s per arm. Kör aldrig bredvid en annan webbläsarsond |

## Tysta fällor (flyttade hit ur CLAUDE.md 2026-10-02 — indexet står kvar där)

- **Grönt test betyder bara "0 konsolfel".** Det säger ingenting om målet går att nå, om mätaren
  syns eller om scenen är tom. Grävmaskinen klarade en nivå på 3,4 s och rapporterade grönt.
  `npm run test` kör därför `bildkoll.mjs` på skärmdumpen — **och titta på bilden själv ändå.**
  **Och harnessens auto-drag drar mellan GENERISKA punkter** — den träffade inte en enda matbit
  i `mata-munnen` (loggen: fyra `drag/foremal`, noll `drag/ratt`), så hela kärnloopen var grön
  och omätt. Läs `drag/ratt` i `.test-logs/<id>.json`: står den på 0 har testet aldrig spelat
  spelet, och en sond som drar från föremålets FAKTISKA läge till målet är enda mätningen.
  **Samma hål finns för TRYCK, och det är geometriskt:** de nio autotrycken är ett fast rutnät
  vars högsta x är **950** och lägsta y **600** (`test-game.mjs:51-53`) på en 1280×720-duk —
  allt bortom det är ONÅBART för varje automatisk körning. `unika-knytt`s spak står på 1160, så
  ceremonin, ägget, kläckningen, knyttet och hyllan hade aldrig körts en enda gång (bekräftat
  två vägar: geometrin, och **noll `takt/spak`** i båda loggarna). Det kan vara AVSIKTLIGT —
  där är det en dokumenterad layout-invariant så skärmdumpen inte landar mitt i en ceremoni —
  men följden är densamma: grönt betyder bara att den nåbara halvan monterar. **Kolla var
  spelets primära kontroll sitter innan du litar på en grön körning.**
  **Och en sond som mäter bildrutetid kan vara MÄTTAD utan att säga det.** rAF-intervallet
  klipps av vsync, så tre helt olika faser rapporterade alla 17,4 ms (headless Chromes ~57 fps)
  — ett mättat mått kan inte skilja "billig fas" från "trasig mätare", och de tre gröna talen
  var värdelösa tills en barlast som bränner 25 ms per bildruta flyttade samma mätare till
  26,2. Ett bildrutemått svarar på "spräcker det budgeten?", aldrig på "vad kostar den här
  raden?" — den andra frågan kräver en profilerare.
  **Och spela minst TVÅ rundor, och tryck så fort spelet tillåter i stället för att vänta
  artigt.** Den otåliga vägen är barnets väg, och det är där rivningskapplöpningarna bor: i
  `unika-knytt` levde en 0,9 s-tween kvar när nästa tryck rev dess mål, och gsap skrev på en
  död nod **varje bildruta resten av rundan** (22 konsolfel på kod som passerat varje grind i
  två dygn). `destroy()` gjorde redan rätt — **exit-säkerhet och ÅTERSPELS-säkerhet är olika
  egenskaper**, och en sond som bara mäter exit rapporterar allt-klart.
- **Redigera aldrig `src/` medan en sond kör mot dev-servern.** Vite laddar om sidan vid varje
  sparad modul i appens graf, och sondens hakar (lappade prototyper, räknare på `window`) försvinner
  med den gamla sidan. `_graflackprobe`s tredje arm dog så 2026-09-12 — mitt i den ändrade jag sju
  spelfiler. Den gången blev det en krasch; en sond som bara läser tal efter omladdningen hade i
  stället rapporterat en helt ny sidas nollor som ett mätresultat.
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
- **Sekventiellt före/efter duger inte för att döma en flaky svit.** Maskinen driver (termik,
  ackumulerade Chrome-processer), och en delmängd på 8 spel var ren medan hela 72-svitens last
  flakade. `scripts/_ab.sh` kör HEAD och ändringen **växelvis** i full skala — det är den enda
  mätning som faktiskt attribuerar. **Läs båda armarna:** HEAD flakade själv 1 av 3 i en av
  körningarna, så "min ändring flakade en gång" betyder ingenting utan HEADs egen frekvens
  bredvid sig.
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
- **Ingen FAST TON kan matcha en bakgrund som ytan GLIDER över — och luminans är blind på en
  färgad kropp.** `unika-knytt`s ögonlock är kroppsfärgat och sänks med `scale.y` över ett
  `sphereFill`-tonat ansikte. Kalibrerad mot PANNAN (`tint(bas, 0.23)` träffade dess uppmätta
  241,229,126 på pricken) försvann överkanten helt stängd (16 → 2 kanalsteg) — men gradienten är
  bakad i lockets EGET rum, så vid halvstängt tryckte `scale.y` ner den ljusa toppen över ögat där
  kroppen är mörkare, och locken lyste som två ljusa lådor. Kalibrerad mot ögonhöjd i stället:
  halvläget rätt, överkanten **18**, alltså SÄMRE än den platta. Svaret är att kanten inte ska
  finnas — tona in ur genomskinligt (`lib/form.js:fadeTopFill`), då finns ingen kant i något läge.
  ⚠️ Och intoningen måste vara FÄRDIG innan den når det som ska döljas: ett fade som nådde ner
  över ögat lät ögat lysa igenom och mätte **37**, då på ÖGATS kant och inte på lockets.
  ⚠️ **Mät inte en färgskillnad i luminans.** Locket och ansiktet skilde bara −8,5 lum men **−37 i
  BLÅ** — på en gul kropp bär blå-kanalen hela mättnadsskillnaden, och ögat ser mättnad. Ett
  luminansmått gav 1,1–1,3 och sa "ingen kant" om en kant som syns tydligt i bilden.
- **Räkna pixlar mäter YTA — styrkan bor i ALFAN.** Ett band täcker ungefär samma bana oavsett
  hur starkt det är, så pixelantalet växte 1 011 → 1 587 medan summan av avvikelserna gick
  **33k → 205k**. Ska du visa att något blev *starkare*: summera skillnaden, tröskla den inte.
  Och en effekt kan passera varje tal du satt och ändå vara osynlig — röken i
  `blixt-och-dunder` mätte 655 målade pixlar av 7 200 och syntes inte i bilden.
- **`sparkle`/`puff` går genom `ParticleContainer`.** Räkna aldrig `fxLayer.children` för att
  se om partiklar föddes — fältet är ETT återanvänt objekt och innehållet ligger i
  `particleChildren`. Mätningen såg "1 ny fx-nod" och lästes som att glittret var trasigt.
- **Sonder måste ligga i repot.** Scratchpad-katalogen kan inte lösa `playwright`; lägg
  engångsskript som `scripts/_*.mjs`.
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
