# Vattenvägen (`vattenvagen`)
> 🧩 pussel · drag · 3–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En mjuk, ljusblå vattenscen. Högst upp en kran 🚰 med en liten pip; under den ett rutnät av
genomskinliga rutor; längst ner en mugg med en streckad gul fyll-linje och ett 🌱 ovanpå. Ur
en rörbricka längst ner drar jag grå rörbitar (rak / böj) och släpper dem i rutorna — varje
nedlagt rör kan jag **trycka för att vrida** 90°. Vissa rör ligger redan på plats; jag fyller
luckorna. Ligger en sten 🪨 i vägen trycker jag bort den (med "💪"). När rören bildar en obruten
kedja från kranen till muggen ropar rösten "Nu rinner det!", gnistror löper längs vägen, och
blå droppar börjar rinna genom rören och fylla muggen. När muggen är full → plantan blommar
(🌸/🌻) + firande + stjärna, och nästa, lite större bana byggs. Rinner vattnet fel läcker det
ut i en mjuk pöl vid sista öppna porten — aldrig en bestraffning. Idle ~6s → en gul ruta glöder
vid nästa rätt cell; ~14s → spelet lägger/vrider biten åt mig.

Funkar bra: rör-vrid-mekaniken är begriplig och taktil, vattnet längs polylinjen är fint,
muggen + blomningen är en mjuk och tydlig belöning, och no-fail (läckage i stället för fail)
är elegant. En gedigen liten "Where's My Water" för småttingar.

**Vattenhjulet (2026-10-03):** ett träskovelhjul hänger i en mässingsstång under kranens rör, strax till höger om strålen. Står kranen stängd står hjulet; vrider barnet på ventilen och strålen kommer snurrar hjulet moturs (~0,6 varv/s), skovlarna delar strålen så det stänker, och när vattnet stängs snurrar det ut på ~3 s. Ett tryck på väggen vid hjulet knuffar det (vänster om navet moturs, höger medurs).

*(Skärmdump: kran upptill, 4×3-rutnät med ett vertikalt rör, mugg + planta nedtill, tom rörbricka.)*

## 2. Ursprunglig plan & tankeprocess

Tanken (ur kodhuvudet): pyssel i Where's My Water-anda men **helt förlåtande** — vattnet ska
till slut hamna rätt oavsett. Pedagogiken är rumslig: barnet ser hur rör-portar måste möta
varandra och vrider tills kedjan sluter sig. Massor av agens lovades: placering + rotation +
lyfta bort sten. Banorna genereras garanterat lösbara (ner i källkolumnen, sidled, ner till
muggen), med förplacerade rör så att bara några luckor är barnets jobb. Elviras törstiga mugg +
blommande planta är den känslomässiga kroken; mjuk auto-hjälp är no-fail-garantin.

## 3. Vad gör det lättjefullt / tunt

- **Den utlovade Elvira finns inte i bilden.** Kodhuvudet och titeln säger "Elviras törstiga
  mugg", men `_buildMug` ritar bara glas + vatten + glans + planta — ingen figur. Den
  känslomässiga mottagaren (hela poängen med "någon blir glad") är frånvarande; muggen står
  ensam. Det är den största tomheten: vi vattnar en anonym mugg, inte en *karaktär*.
- **De förplacerade rören gör det mesta av jobbet.** Banan är en fast L-form (ner, sidled, ner)
  och bara `missing` celler är tomma (2–6 st). Barnet fyller några hål i en redan halvlöst
  ledning — ingen egen ruttdragning, inga grenval, en enda lösning. "Massor av agens" i
  praktiken = lägg 2–6 bitar och vrid dem rätt.
- **Auto-hjälpen löser banan cell för cell.** Glöden vid 6s pekar på exakt rätt ruta, och vid
  14s lägger/vrider `_autoHelp` precis rätt bit. Ett passivt barn får hela ledningen byggd åt
  sig medan det tittar på — agensen rinner bort lika säkert som vattnet.
- **Tunn rör-vokabulär.** `pipeForPorts` använder bara `rak` + `boj`; tratten/T-röret som finns
  i `BASE` ritas aldrig i en lösning. Inga korsningar, inga ventiler, inga grenar — så banorna
  ser likadana ut nivå efter nivå (bara fler celler).
- **Vattnet och dropparna saknar karaktär.** Dropparna är enfärgade cirklar; "läckaget" är en
  diskret `puff` + `soft` som ett barn knappast kopplar till "vattnet fastnade här". Inget
  porlande, inget skvätt, ingen nivå-höjning man hör.
- **Belöningen är nästan generisk.** Blomningen (🌱→🌸) är spel-specifik och fin — men sen tar
  delad `bigCelebration` + stjärna över. Ingen som *dricker*, ingen som tackar.
- **Ljudet är syntetiskt och sparsamt.** `flip`/`pop`/`reveal`/`soft`. Ingen rör-klonk vid
  vridning som låter som metall, ingen rinnande vatten-ambient, inget "glugg-glugg" när muggen
  fylls.

Kort sagt: en korrekt och snäll rör-pusslare vars **utlovade karaktär saknas, vars banor är
en enda förplacerad linje, och vars auto-hjälp gärna spelar klart åt barnet.**

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ ~~**[Quick] Visa Elvira vid muggen.** Rita Elvira (eller maskoten) bredvid muggen som väntar
  törstig, sträcker sig mot vattnet och *dricker* när muggen fylls. Direkt blir hela spelet
  "hjälp Elvira" i stället för "fyll en mugg". Liten kod, stor mening.~~ Redan byggd 2026-07-02
  (`makeElvira` :401, hoppar när vattnet rinner och när muggen är full) — uppdagat 2026-09-23.
- ✅ ~~**[Medium] Fler tomma celler, färre förplacerade.** Låt barnet bygga en större del av vägen
  själv (behåll bara käll-/mugg-bitarna fasta) så pusslet känns som *barnets* ledning.~~ Redan
  byggd 2026-07-02 (bara käll- och muggbiten förplaceras, :336) — uppdagat 2026-09-23.
- ✅ ~~**[Medium] Mjuka upp auto-hjälpen.** Behåll glöd-hinten, men låt 14s-hjälpen bara lägga *en*
  bit och sedan vänta igen — och visa tydligt "Jag hjälper lite!" så barnet ser skillnaden
  mellan sitt eget bygge och hjälpen.~~ Hjälpen la redan EN bit åt gången; nu säger den också
  "Jag hjälper till!" (om inget annat talar) och gnistrar på biten — 2026-10-01.

### Variation & överraskning
- ✅ ~~**[Medium] Inför fler rörtyper på högre nivåer.** Aktivera T-röret/korsningen (finns redan i
  `BASE.tratt`) och låt vägen förgrenas till två muggar/plantor → äkta val, inte en linje.~~
  Byggd 2026-10-01: bana 5, 7, 9 … har ett T-rör som delar vattnet åt två muggar (se §5).
  Korsning (fyra portar) byggdes inte — T-röret räcker för en förgrening.
- ✅ ~~**[Quick] Ventil/kran-bit barnet får öppna** som sista steg ("vrid på kranen!") — ett litet
  klimax-moment innan vattnet släpps på.~~ Byggd 2026-10-02 (G8, `lib/vev.js`): se §5.

### Juice
- ✅ ~~**[Quick] Rör som fylls synligt.** Låt innerkanalen färgas blå allteftersom vattnet passerar
  (en löpande fyllning), inte bara fristående droppar — då *ser* barnet flödet hitta vägen.~~
  Redan byggd 2026-07-02 (`_paintFlow` :798) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Mugg-fyllning med liv.** Stigande vattenyta med liten våg + bubblor + ett "glugg"-
  ljud per nivå-höjning~~ Redan byggd i det väsentliga — uppdagat 2026-09-23: ytan är riktig
  vätska sedan 2026-08-09 (vågen kommer på köpet) och "glugg" spelas per femtedel som en stigande
  pentatonisk ton (:969). Bubblorna byggdes aldrig — en riktig vätskeyta rör sig redan själv.
- ✅ ~~**[Quick] Plantan vippar glatt när den får vatten** (utbruten ur punkten ovan 2026-09-23 — den
  enda halvan som inte fanns): en liten gungning på plantan vid varje glugg-steg.~~ Byggd
  2026-10-01 (`_plantGrow`: klämning + sträckning + gnistr per glugg, vilo-guppning däremellan).

### Progression
- **[Quick] Receptbok/karta över klarade ledningar** eller en liten trädgård som får en ny
  blomma per klarad bana — något att återkomma till och se växa.

### Karaktär & berättelse
- **[Deep] En liten vattenvärld.** Kranen får ett ansikte, en fisk simmar i muggen, plantan
  växer steg för steg över flera banor (planta → knopp → blomma → frukt). Ger en anledning att
  spela "en till".

### Ljud
- **[Quick] Riktiga vatten-SFX via MOSS-pipelinen** ([[real-audio-sfx]]): rinnande porl, droppe-
  plopp, mugg-glugg, plus en mjuk vatten-ambient. Rör-vridningen får en taktil klonk.
  *Blockerad så länge MOSS är nere (glugget finns som stämd ton, :969).*

## 5. Status / loggar

- 2026-10-03 · **Vattenhjul som snurrar av strålen (FYSIKPLAN F6a, kund 2, D16 B1).** Ny fil `src/games/vattenvagen/hjul.js` (ren fysik, samma kod körs i Node) + vy/ljud i `index.js`. Ventilen (D9) är orörd.
  **Premissen "gångjärn" prövad:** spelet hade ingen `PhysicsWorld` (ventilen är en egen integrator, G8). Hjulet får en liten egen: en matter-kropp (cirkel i navet, `isSensor`, ingen tyngd, inga väggar) fastnålad med `phys.gangjarn`, `frictionAir` 0,02 som lager — en värld per bana, rivs vid banbyte/exit. Skovlarna (6 lådor 20×8 på radie 13–33 + nav) är kolliderare i vätskan via `fluid.foljKroppar(phys, …)` (F6a), och `clearColliders()` vid banbyte lägger tillbaka dem på sig själv.
  **Vad som SAKNAS i libbet och därför bor lokalt:** vätskan knuffar aldrig en kropp (F6b är inte byggd), så det som får hjulet att gå är `_koppla()` i `hjul.js`: i `phys.beforeStep` läser den partiklarnas fart (`fluid.vx/vy`) i skovelringen och lägger ett vridmoment (Δω → `body.torque = Δω / (invTröghet · STEG2)`). Motstånd mot RELATIV fart (partikel minus skovelns egen fart där den ligger) — samma tal driver hjulet och bromsar det när det går fortare än vattnet; instabilt över ~0,5 i koppling (K 3,0 gav pumpning), vilket är skälet till K = 0,2. **Förslag: lyft till `lib/vatska.js` som F6b om fler spel vill ha det.**
  **Två fällor mätta:** (1) navet 24 px från strålen dämde upp vatten på en vågrät skovel (pool 1,7 partiklar), och en vattenpelare i vila ger noll moment i ett rent fartmått → hjulet stannade med vatten på sig 3 av 8 körningar. Därför `VIKT`: vatten som ligger på en skovel (fart < 1,2 px/steg) väger — 8 av 8 körningar går nu hela vägen. (2) 38 px (spetsarna 5 px in i strålen som syns ±12 px bred) ger 0,5–0,7 varv/s och 96–100 % av dropparna kvar till källrörets mynning; ≥ 42 px når strålen inte skovlarna.
  **Mått:** `node scripts/_dag-vattenvagen-hjul.mjs` (Node, 5 sektioner med kontrollrader, 6 helkörningar gröna). Webbläsarsonden `_dag-vattenvagen.mjs`/`_natt-vattenvagen.mjs` är inte körda av byggaren (orkestreraren gör det) — hjulet ligger över rutnätet (y 75–141, brunnarna börjar på 142) och ändrar inget i brädet.
  **Begränsning:** hjulet är ingen träffyta (ett 96 px-mål 38 px från strålen skulle överlappa den översta radens brunnar och ventilen — P0-avståndet håller inte). Knuffen går via väggfångaren som redan svarar på varje tryck. Inga nya repliker.

- 2026-10-02 **Ventilen efter webbläsarsonden + kritiken (D9).** `_dag-vattenvagen` 30/30, 0 konsolfel.
  Fyra rättningar: ⓵ pilen vid ventilen släcktes av samma tryck som fullbordade vägen (`_resetIdle`
  kom efter tändningen) — den står nu kvar så länge vägen är hel och kranen stängd; ⓶ kranen i
  sjätte kolumnen gav x 1090, inom P0-avståndet från ljudknappen — ventilen sitter då till VÄNSTER
  (`VENTIL_MAX_X` 1040, röret speglas); ⓷ båda vridhållen räknas (en treåring skruvar åt båda);
  ⓸ tröskeln för vattnet 0,25 i stället för 0,3, så FÖRSTA trycket (ett kvarts varv = 0,278) ger
  vatten. Auto-hjälpen vid 14 s är omätt i sonden (de otåliga trycken på bana 3 öppnar ventilen först).
- 2026-10-02 ✅ **Ventilen — sista steget (G8, `lib/vev.js`)** (ej körd i webbläsare — bara `check` +
  `_vevlibprobe` i Node; orkestreraren kör `scripts/_dag-vattenvagen.mjs`).
  - **Premissen prövad mot koden.** "Ventilen barnet vrider som sista steg" förutsatte att kranen
    kunde vara STÄNGD, men strålen rann alltid (den är det som gör pusslet begripligt, §5 2026-08-09).
    Spelet har ingen `PhysicsWorld` — ventilen är alltså en egen vinkel+vinkelfart-integrator
    (`Vev`, ingen matter), inte ett `phys.gangjarn`. Kranen rinner nu bara när ventilen är öppen:
    spawn-takten är `dt · _oppen` (0 = ingen stråle, 1 = som förut, 70 ms mellan dropparna).
  - **Ventilen.** Ett RITAT rött handhjul (ring, fyra ekrar, fyra handtag — ett gult så man ser att det
    snurrar) på ett mässingsrör mot kranen, 150 px åt höger om pipen (x = kranens x + 150, y = 56).
    Träffcirkel radie 60 (120 px), 24 px till närmaste brunn (mätt per bana i sonden). Vilo-guppning
    (`liv` på ett barn); träffytan sitter på en egen `yta` (K3), så den inte guppar med bilden.
  - **Två vägar, samma resultat.** Drag runt hjulet ger vinkelfart (moment ur fingrets tangentialfart,
    tak: 0,01 rad/steg² och 2,39 varv/s); ett tryck är en knuff på ett kvarts varv, fyra tryck = ett
    helt varv (Node: 10 tryck à 250 ms når 1,25 varv/s mot dragets 1,0). Kranen är helt öppen efter
    0,9 varv rotation (summerad, åt båda hållen — se rättningen ovan). Ljud + kläm
    vid själva nedtrycket, spärrhjulsklick var 45:e grad.
  - **Flödet.** Sitter alla rör säger rösten "Rören sitter! Vrid på ventilen!" och en gul pil visas runt
    hjulet; vid 30 % öppet kommer "Nu rinner det!" + gnistorna längs vägen + Elviras hopp, och strålen
    växer med hjulet. Öppnas ventilen FÖRE vägen är hel faller strålen rakt igenom som förut.
  - **Hjälpen (P0: sent och synligt).** 6 s utan tryck: pilen + "Vrid på ventilen!"; 14 s: "Jag hjälper
    till!" och hjulet vrids ett helt varv av sig självt. Tomgången nollas medan hjulet rör sig.
  - **Nya repliker (saknar klipp tills `npm run voice` körts):** "Rören sitter! Vrid på ventilen!" ·
    "Vrid på ventilen!".
  - **Att mäta (webbläsare):** `node scripts/_dag-vattenvagen.mjs` — stängd ventil = 0 partiklar även
    med hel väg, moturs öppnar inte, drag-armen, tap-armen, taket (8 varv/s), halo (55 px träffar,
    72 gör det inte), finger hållet över banbytet, auto-hjälpen, exit mitt i en snurr. ⚠️ Harnessens
    autotryck når bara x ≤ 950: ventilen ligger från kranen i kolumn 4 (x > 950) utanför det, och
    ingen autokörning öppnar den — först auto-hjälpen vid 14 s gör det.

- 2026-10-01 ✅ **Kontrastpass, fristående rörbitar, levande planta, T-rör** (ej körd i webbläsare —
  bara `check`; orkestreraren testar). Allt var urblekt (vita brunnar alfa 0,1 på ljusblå himmel,
  grå rör 0xc3ccd4, muggen alfa 0,22) och rörbitarna låg i vita cirkelhalor på en kräm-panel.
  - **Scenen.** Kaklat badrum (mättad blågrön vägg via `createScene`-temaobjekt + halvstens-kakel
    med svaga fogar, takskugga, mörkare vägg vid hyllan) och en trähylla som rör och muggar står
    på. Full bleed (ritat över ±240/±160). Kranen är mässing med rött vred.
  - **Brunnar.** Nedsänkta: ljus ram, mörk botten, skugga från överkanten, ljus underläpp.
  - **Rören.** Ett färgat plaströr per typ (rak orange, böj gul, T lila) med `cylinderFill`, mörk
    kontur, kopplingsringar och en mörk skåra som det blå vattnet fyller. Bitens struktur är nu
    `view → body (vrids) → [skugga, rör, vatten]`; skuggan motroteras (`_shadowFix`) så den alltid
    faller rakt ned. `_turns` räknar varv uppåt — förr tweenades 270° → 0° hela vägen tillbaka
    när en bit vreds från rot 3 till 0.
  - **[P0] Fristående bitar.** Panelen och halon är borta. Lådans bitar står på hyllan med egen
    skugga och egen guppning (`liv` på ett BARN — stämpeln är drag-mål), träffyta 112 px. Lådans
    läge söks fram (`_trayXs`) så den aldrig hamnar bakom mugg eller Elvira. Placerade bitar har
    hela cellen (120 px) som träffyta (var en cirkel 140 px som överlappade grannarna).
  - **Muggen.** Riktig glasmugg: mörk insida bakom vätskan, vit kontur, tjock botten, röd läpp,
    handtag. Plantan är en stickling i glaset (stam + två blad + knopp) som lutar ut mot glasväggen
    så den aldrig skymmer strålen, och slår ut till en blomma när muggen är full.
  - **Plantan lever.** `liv` (vipp + guppning) hela tiden; vid varje glugg-steg klämmer den ihop
    sig, sträcker sig ett snäpp högre och gnistrar; vid "Nu rinner det!" sträcker den på sig.
  - **T-rör och två plantor.** Premissen höll delvis: `BASE.tratt` fanns och ritades, men
    `pipeForPorts` gav bara rak/böj, och hela spelet antog ETT utlopp (`_exit`) och EN mugg
    (`_mugX`). Byggt om: lösningen är ett träd (portar härleds ur kanter, T-röret får tre av sig
    själv), `_traverse` är en flödesfyllning i bredd som samlar nådda muggar + öppna portar (läckor,
    tak 3), `_mugs[]` bär fyllnad/planta/klar per mugg, `_exits[]` ersätter `_exit`. Varje insugen
    droppe kommer ut ur ALLA utlopp, så varje mugg fylls lika fort som i en enkel bana; en full
    mugg slutar ta emot. Banan är klar när båda blommar. Bana 5, 7, 9 … förgrenas (muggarna i de
    yttersta kolumnerna, annars får lådan inte plats); 6, 8 … är enkla som förut. Partikeltaket
    340 → 480, muggen smalare (halvbredd 50) i tvåmuggsbanan.
  - **Auto-hjälpen** säger nu "Jag hjälper till!" och gnistrar på biten (P0: sent OCH synligt).
  - **Att mäta:** FPS/partikelantal på bana 5 (taket 480 är ett antagande), att en drag-bit från sitt
    faktiska läge når en brunn och bygger hela T-vägen, lådan vs mugg/Elvira på bana 5 och 7,
    `_plattprobe --medbakgrund` före/efter.

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): inga A-rader för spelet; passet var
  firandet. `_bloom` firade bara via `complete()` (rent), men nästa banas `voiceIntro` sades 2,1 s
  efter (bygget 1,6 s + 0,5 s), mitt i berömmet, och kapade det. Den köar nu i `ctx.narTyst` och
  sägs bara om det fortfarande är samma bana och vattnet inte redan hittat fram (:483). Banan syns
  genast. §4 städad: Elvira, de tomma cellerna, rörflödet och glugget var redan byggda; plantans
  vipp bröts ut som egen punkt. Grind: `check --game vattenvagen` 0/0.
- 2026-06-30: Doc skriven (granskning + plan). Speltest grönt (errorCount 0), skärmdump läst.
  Notering: utlovade Elvira renderas inte i nuläget. Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Quick] visa & drickande Elvira + [Quick] synligt rör-flöde +
  [Medium] fler tomma celler** — ger karaktär, tydligt flöde och äkta agens till låg risk.
- 2026-07-02: Första-omgången implementerad (errorCount 0 i två speltest: enbart-load + drag).
  - **Elvira-buggen (rot-orsak + fix).** Elvira "fanns" bara i kodhuvudet, titeln och
    `voiceIntro` — hon ritades ALDRIG. `_buildMug` skapade enbart glas/vatten/glans/fyll-linje/
    planta; ingen figur lades någonsin till scengrafen. Fix: ny modul-funktion `makeElvira()`
    (speglar `makeKid('elvira')` i bajs-och-kiss — blond med röd rosett, rosa klänning, armar som
    sträcker sig mot muggen, helt Pixi Graphics). I `_buildLevel` skapas `this._elvira` efter
    `_buildMug()`, placeras BREDVID muggen (`ex = mugX ± 150` mot närmaste skärmkant så hon inte
    skymmer rutnätet, `ey = min(mugY, 560)`, `scale 0.78`) i `_propLayer`, och får en lugn
    "andning" via `breathe()` (`this._elviraBreath`). Bekräftat visuell i båda skärmdumparna.
  - **Levande & drickande Elvira.** `_cheerElvira(ctx, drink)` gör ett glatt litet hopp (tween på
    `e.y` — krockar ej med skal-andningen) + `floatText` (💧 när vattnet börjar rinna, 💗/😋/🥰 när
    muggen är full). Anropas från `_recomputePath` vid nyss-kopplad väg och från `_bloom` (drick).
  - **Synligt rör-flöde.** Ny `drawPipeWet()` ritar en vattenblå kanal-overlay; `_makePipe` lägger
    den som `view._wet` (alpha 0). `_placePipeInCell` sätter `view._cell`. Nya `_paintFlow(cells)`
    (anropad i `_recomputePath` med `_traverse().cells`) tonar in overlayen per rör som vattnet
    nått — med `delay` per steg → en löpande fyllning som följer flödet ner mot muggen (syns även
    när banan läcker/är ofullständig, från källan så långt vattnet når). Verifierat i drag-testet:
    hela kolumnen fylls blå.
  - **Fler tomma celler (mer agens).** `_buildLevel` förplacerar nu BARA käll-biten (index 0) +
    mugg-biten (sista); alla mellanceller är tomma och barnet bygger hela resten själv (ersatte
    den shuffle-baserade `missingCount`-logiken; `plan.missing` numera oanvänt men kvar).
  - **Exit-säkerhet.** `_killViewTweens` dödar nu även `v._wet`-tweens; `_buildLevel`-städningen
    och `destroy` dödar `_elviraBreath` + Elviras egna tweens innan brädet förstörs.
- 2026-08-09: **Riktig vätska** (LYFTPLAN rad 6 / B1). `lib/vatska.js` (SPH + metabollar) driver
  nu vattnet på de tre ställen där det SYNS, och den gamla "droppar längs en polylinje"-vägen
  (`pointAt`, `_drops`, `_spawnDrop`, `_drawMugWater`) är borta.
  - **Var vätskan simuleras.** Kranens stråle · läckan ur sista öppna porten · muggen. Inuti
    rören simuleras ingenting: kanalen är 26 px, röret ogenomskinligt, och en simulering där
    hade kostat allt och synts noll. Vattnet SUGS in i källrörets mynning (`drain`) och kommer
    ut i andra änden efter `140 + celler·95` ms; kanal-overlayen visar färden som förut.
  - **Målet läses ur vätskan.** `_readMug` tar vattenYTAN (tredje lägsta droppen) i stället för
    en uppräknad siffra. Tre filter behövdes, och mätningen visade varför: utan hastighetsfiltret
    rapporterade en droppe som bara PASSERADE mätfönstret muggen full (fyllnad hoppade
    0.43 → 1 → 0.58), och utan `pal`-filtret räknades stänk som aldrig gått genom ledningen.
  - **Tre mätta fel som koden inte kunde avslöja** (`scripts/_vatskeprobe.mjs`, nytt):
    1. *Strålen var osynlig.* 49 partiklar fanns, noll syntes. En droppe faller ~480 px/s och
       klicken är 55 px — med saftbarens takt (145 ms) hamnar de **70 px isär**, når aldrig
       metaboll-tröskeln och ritas i KANTfärgen (nästan vit) mot en ljusblå himmel. Takten är
       nu räknad ur fallhastigheten (70 ms), tröskeln 0.34 och suddningen 6.
    2. *Banan löste sig själv.* Muggen låg i kranens kolumn på nivå 1, så läckan från översta
       röret föll rakt ner i mål utan ett enda tryck. Muggen ligger nu ALDRIG i källkolumnen.
    3. *Spillet åt budgeten.* Läckvatten samlades i muggen (såg fullt ut, räknades inte):
       132 partiklar efter 6 s och stigande. `drain(..., { pal: 0 })` — ny parameter i
       `vatska.js` — låter spill rinna utanför. Stabilt på 11–16 partiklar när det läcker.
  - **Banorna växer i BREDD, inte höjd.** Fyra rader tryckte muggen till y≈690, bakom brickan
    och delvis ur bild — den buggen fanns i alla banor från nivå 3 och syntes bara i en
    skärmdump. Nu alltid 3 rader, 4→6 kolumner, rutnätet centreras efter kolumnantal.
    Brickans panel flyttad bakom muggen, och brickans rör flyttas i sidled när muggen krockar.
  - **Plantan blommade aldrig.** `this._plant.text = '🌸'` på en **Graphics** gjorde ingenting.
    Ny `_bloomPlant()` ritar kronblad + pistill. Verifierad i vinst-skärmdumpen.
  - **Exit-säkerhet:** `gsap.delayedCall` → `ctx.later()` (modulen är en singleton — se
    spelkontraktet), `FluidView`/`FluidWorld` rivs i `destroy`. Sonden lämnar mitt i strömmen
    och går in igen: 12 partiklar, 0 fel.
  - Kontroll: `check` 0 fel · `test:all` 72/72 · FPS **56,8 vid CPU 6× strypt** (oförändrat mot
    tom scen) · muggen full på ~9 s · `_idleprobe 12` = 0 framsteg utan tryck.
  - Deferred: [Medium] mjukare auto-hjälp (visa "Jag hjälper lite!"), [Medium] T-rör/grenval till
    två muggar, [Quick] ventil/kran-klimax, [Quick] mugg-fyllning med våg/bubblor + "glugg"-ljud,
    [Quick] trädgård/karta-progression, [Quick] riktiga vatten-SFX (MOSS), [Deep] växande planta
    över banor. Not: för höga banor (rows=4) hamnar muggen lågt (mugY≈690) och beskärs något i
    nederkant — pre-existerande, ej rört här (skulle bryta nedförs-flödet om muggen lyfts).
