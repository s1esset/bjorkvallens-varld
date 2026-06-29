# Vattenvägen (`vattenvagen`)
> Barnet drar och vrider rörbitar på ett rutnät så vattnet från kranen hittar hela vägen ner till Elviras törstiga mugg och plantan blommar — en pyssel-känsla i Where's My Water-anda men helt förlåtande, där varje droppe till slut hamnar rätt.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `vattenvagen` | Vattenvägen | 💧 | pussel | drag | [3,5] | `vattenvagen` | "Lägg rören så vattnet rinner ner till muggen!" |

## Mål & mekanik
Vatten rinner från en **kran** högst upp. Barnet bygger en väg av **rörbitar** på ett rutnät så att vattnet leds ner till **Elviras mugg** (med en planta) nederst. När muggen är fylld till linjen → plantan blommar och firande.

**Kärnloop:**
1. Kranen droppar/rinner vatten ner i den översta rutan (alltid samma kolumn på varje nivå).
2. Barnet **drar rörbitar** från en bricka (tray) till tomma rutor på rutnätet, och **trycker på en lagd rörbit för att vrida den** 90° (så in-/utgångar matchar grannrutan nedanför/bredvid).
3. Dessutom finns nivåberoende **hinder** (en sten 🪨) som blockerar en ruta — barnet **trycker-och-lyfter bort stenen** (tap → den studsar undan) för att frigöra rutan.
4. När en sammanhängande väg av rör når från kranrutan ner till mugg-rutan börjar **vattnet strömma** längs vägen (partikeldroppar) och fyller muggen.
5. Muggen fylld till linjen → **plantan blommar**, `ctx.progress.complete()`, ny (längre) bana efter ~1,6s.

**Spelarpåverkan (≥2 kontroller som ändrar utfallet):**
- **Placering** av rörbitar (vilka rutor).
- **Rotation** av varje lagd rörbit (tryck → 90°-vridning) → bestämmer om vägen kopplar.
- **Ta-bort-hinder** (tryck på sten → lyft undan) → frigör en ruta så vägen kan dras.

**No-fail / auto-hjälp:** Det finns inget "fel". Lägger barnet ett rör som inte kopplar händer inget hårt — röret bara sitter där. Läcker vattnet ut ur ett öppet rör → det bildas en liten **pöl** (puff + "plask") och vattnet "väntar" tills vägen byggs klart, ingen omstart. Vid ~6 s utan att vägen är klar lyser **nästa rätta ruta** upp (mjuk glöd) och rösten säger "Prova ett rör här!" — och vid ~14 s lägger spelet själv den saknade biten (auto-fyll) så barnet alltid lyckas.

## Skärm-layout (1280x720)
GameHost ritar header (hem-/repetera-knapp) överst — rita INGA egna sådana. Allt nedan ligger i spelets `_root` (designkoordinater 1280×720). Använd `createScene('water', { ground:false })` som FÖRSTA barn (mjuk vattenblå gradient + bokeh).

- **Bakgrund:** `createScene('water', { width:1280, height:720, ground:false })` (eventMode 'none').
- **Rutnät (grid):** centrerat pysselområde. Cellstorlek **120×120 px**. Rutnätets origo (övre vänstra cellens center) vid `gridX0 = 470`, `gridY0 = 200`. Cellcenter för (col,row): `x = gridX0 + col*120`, `y = gridY0 + row*120`. Standardstorlek **4 kolumner × 3 rader** (nivå 1) → upp till **5×4** (högre nivåer). Rita varje ruta som `roundRect(cx-56, cy-56, 112, 112, 18).fill({color:COLORS.white, alpha:0.10}).stroke({width:3, color:COLORS.white, alpha:0.35})` (svaga "brunnsrutor").
- **Kran (källa):** emoji 🚰 (Text fontSize 96) ovanför rutnätets toppcell i source-kolumnen, vid `y = gridY0 - 110`. En kort vit "vattenpip" (`roundRect`) leder ner i toppcellen. Vatten matas alltid in i cellen (sourceCol, 0).
- **Mugg + planta (mål):** under rutnätets bottencell i mål-kolumnen, vid `y = gridY0 + (rows-1)*120 + 130`. Rita en glasmugg programmatiskt: `roundRect` ljusblå glasbåge `0xbfe9ff alpha 0.5` + vit glansstrimma; bredd 150, höjd 170. En **fyll-linje** (streckad gul `COLORS.yellow`) vid 80 % av muggens höjd = målnivån. Ovanpå muggens kant en liten 🌱-emoji (Text 64) som byts till 🌸/🌻 när den blommar. Vattennivån i muggen ritas som en stigande `roundRect` i `COLORS.blue alpha 0.8` (klippt mot mugg-formen via en mask eller via clamp på höjden).
- **Rörbricka (tray):** nederkant, `roundRect(120, 600, 1040, 96, 28).fill({color:COLORS.cream, alpha:0.85})`. Här ligger 2–3 **rörbit-stämplar** att dra ifrån (de återskapas när en dras ut, oändlig tillgång): rak ┃, böjd ┗, och trattar/T vid behov. Varje stämpel-ikon ≥96px, hit-halo 120px.
- **Hinder (sten):** 🪨-emoji (Text 80) i en cell på vissa nivåer; en mjuk skugg-ellips under. Tryckyta = osynlig `Circle(0,0,70)` hitArea (≥96px diameter).

**Rörbitar (programmatiska former):** Varje rörbit är en `Container` ritad med `Graphics` (ingen extern asset): en grå "rörkropp" (`roundRect`/segment, fyll `0xb8c4cc`, stroke `0x8a99a3`) med en ljusblå innerkanal (`0xbfe9ff`) som visar var vatten kan rinna. Typer (med "portar" = vilka sidor som är öppna: T=topp, B=botten, L=vänster, R=höger):
- **Rak vertikal** `|` : portar {T,B}. Vid rotation → **rak horisontell** `—` : portar {L,R}.
- **Böj** `L` : 4 rotationer {T,R}, {R,B}, {B,L}, {L,T}.
- **(Nivå 4+) T-bit / tratt:** portar {L,R,B} — låter vattnet förgrena (visuellt roligt, valfritt).
Rörets `rotation`-state lagras som heltal 0–3 (90°-steg); `portsFor(type, rot)` ger aktuella portar.

## Interaktion
Bara **drag** + **tap** (inga förbjudna gester). Drag av rörbitar via `lib/DragController.js`; rotation och hinder-borttagning via egna `pointertap`.

- **Dra ut en rörbit:** varje tray-stämpel registreras som `DragController.addItem`. Varje tom grid-cell registreras som `DragController.addTarget(cell, accepts, { hitRadius:110 })`. Vid släpp i en cell snäpper röret till cellcenter och blir "lagt" (`placed`). En ny stämpel återskapas i trayen (oändlig tillgång). **Tap-tap-fallback** (inbyggt i DragController): tryck på stämpel → tryck på cell → röret hamnar där. Detta täcker barn som inte klarar drag.
- **Vrid ett lagt rör:** lagt rör får `eventMode='static'`, `hitArea = new Circle(0,0,70)`, `pointertap` → `rot = (rot+1)%4`, animera `gsap.to(view, { rotation: rot*Math.PI/2, duration:0.18, ease:'back.out(2)'} )`, ljud `audio.sfx('flip')`, kör `_recomputePath()`. (Lagt rör går inte att dra igen — håll det enkelt; vill barnet flytta får det bara lägga ett nytt ovanpå / vrida.)
- **Ta bort sten:** sten har `pointertap` → `pop(stone)` + `wiggle`, sedan `puff(ctx.fxLayer, x, y, {color:0xb8b8b8})`, ljud `audio.sfx('soft')`, `floatText(ctx.fxLayer, x, y, '💪')`, stenen tonas/skalas bort (`{}`-proxy eller `gsap.to` på egen container med `onComplete` som `destroy` endast `if(!destroyed)`), cellen blir ledig target. Tryck-och-håll-grind krävs INTE (det är ingen vuxenåtgärd).
- Alla träffytor ≥96px; rör/cell-halo 110–120px radie. Varje pekning → ljud+bild < 100ms (`audio.sfx('tap')` + liten `pop` vid varje grepp/rotation).

## Fysik & kalibrering
Ingen matter.js behövs — vatten simuleras som **droppar längs en beräknad väg** (billigt, robust, exit-säkert, ticker-drivet).

**Vägberäkning (`_recomputePath`):** kör vid varje placering/rotation/sten-borttagning. Börja i källcellen (sourceCol, 0); en cell är "genomflödbar nedåt" om den har ett rör vars portar kopplar till grannens portar (port B i cell matchar port T i cellen under; sidoportar L/R matchar grannens motsatta port). Gör en enkel graf-traversering (BFS/DFS) från källan: följ rör-port-kopplingar cell→cell. Om traverseringen når mål-cellen (målCol, rows−1) **och** det rörets botten-port (B) är öppen mot muggen → `this._connected = true` och spara `this._path` = ordnad lista av cell-center-punkter (källa → … → mugg). Annars `this._connected = false`.

**Droppar (partiklar, egen integrator i ticker):**
- Medan `_connected`: spawna en droppe var ~280 ms vid kranen. Varje droppe är en liten `Graphics`-cirkel (r 7–10, `COLORS.blue`/`0x9fdcf5`) i en dedikerad `this._dropLayer` (under rören? nej — ovanpå rörens innerkanal, så de syns i kanalen).
- Varje droppe följer `this._path`-polylinjen: håll `seg`-index + `tprog` (0..1 längs aktuellt segment). Per tick: `tprog += speed * dt` där `dt = ticker.deltaMS/16.67` och `speed ≈ 0.06 / segmentLängdInRutor` (justera så en droppe tar ~1,2 s genom 3 rutor — lugnt och tydligt). Position = lerp mellan segmentets ändpunkter. Liten sinus-wobble i sidled (±3px) för "rinn"-känsla.
- När en droppe når sista punkten (muggen): `this._fill += 0.012` (clamp 0..1), droppe destrueras (`if(!destroyed) destroy()`), liten `ripple(ctx.fxLayer, mugg.x, vattenY)` + sällan `audio.sfx('soft')` (throttlat ~1/400ms så det inte spammar).
- **Läckage (no-fail visuellt):** Om `!_connected` men det finns rör vid källan, låt droppar rinna så långt vägen räcker och sedan "falla av" sista öppna porten → en liten `puff` (pöl) på cellgolvet + svag `audio.sfx('soft')` (mycket sparsamt). Aldrig straff; bara en signal "leta vidare".
- **Muggnivå:** rita varje frame en stigande vattenrekt i muggen vars topp = `muggBottenY - _fill * muggInnerH`. Vid `_fill >= 1` (linjen nådd) → `_bloom()`.

Allt detta är **GSAP-fritt på Pixi-objekt för droppar** — dropparna rörs i ticker-loopen och destrueras med `if(!destroyed) destroy()`. (`ripple`/`puff` från feedback.js är redan exit-säkra.)

## Återkoppling & belöning
Per pekning (<100ms):
- Greppa/släppa rör: `audio.sfx('tap')` vid grepp, `audio.sfx('pop')` + `pop(view)` vid snäpp i cell.
- Vrida rör: `audio.sfx('flip')` + liten `pop`.
- Ta bort sten: `audio.sfx('soft')` + `puff` + `floatText('💪')`.
- **När vägen kopplar (`_connected` blir sant):** `audio.sfx('reveal')`, `voice.say('Nu rinner det!')`, en `sparkle` löper längs vägen (gnistor på varje cellcenter i tur via `gsap.delayedCall`-stege, vakta med `_alive`).
- **Plantan blommar (`_bloom`):** `this._resolving = true`; byt 🌱→🌸, `pop`/`bounceIn` på blomman, `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})`, `burst(ctx.fxLayer, mugg.x, mugg.y, {count:16})`, sedan `ctx.progress.complete()`. Efter ~1,6s (`gsap.delayedCall`, `_alive`-vaktad) → nästa bana.
- **Aldrig** buzzer, rött kryss, "fel", poängtapp eller timer-press. Missar = pöl-puff + mjukt ljud.
- **Idle-recue:** ticker-räknad `_idle`; vid ~6s utan interaktion och ej klar → glöd på nästa rätta cell (`breathe` på en svag highlight-`Graphics`) + `voice.say('Prova ett rör här!')`. Vid ~14s → **auto-hjälp**: lägg automatiskt den enskilt felande rörbiten på rätt plats med rätt rotation (`bounceIn`), så vägen garanteras kopplas. Nollställ `_idle` vid varje interaktion.

Använd sfx: `tap, pop, flip, soft, reveal, celebrate`. Voice: voiceIntro samt 'Nu rinner det!', 'Prova ett rör här!', PRAISE.

## Progression & nivåer
- `this._level = Math.max(1, ctx.progress.get().highestLevel | 0)` vid init; styr rutnätsstorlek, väglängd, antal hinder och rörtyper.
- Banor (cykliska, oändlig lek; vägen genereras programmatiskt och är ALLTID lösbar — generera en giltig väg först, lägg sedan ut några rätta rör och låt resten saknas):
  1. **Nivå 1:** 4×3 grid, rak väg (källa rakt ner), 2 rör att lägga, 0 hinder. Bara raka rör.
  2. **Nivå 2:** 4×3, en böj (källa ner → sväng → mugg), 3 rör, 0 hinder. Inför böj-rotation.
  3. **Nivå 3:** 4×4, två svängar, 4 rör, 1 sten att lyfta bort.
  4. **Nivå 4–5:** 5×4, längre slingrande väg, 5–6 rör, 1–2 stenar, ev. en T-bit/tratt.
  5. **Nivå 6+:** 5×4 med lite längre väg och en extra sten; därefter upprepas mönstren med slumpad startkolumn/böjar (`randomFrom`/`Math.random` jitter), så det aldrig tar slut.
- Efter `_bloom`: `ctx.progress.setLevel(this._level + 1)`, `ctx.progress.setCustom('banor', (custom.banor|0)+1)`, vänta ~1,6s, `_buildLevel(ctx, ++this._level)` återanvänder samma rutnät/noder (rensa rör, ny layout). Inga synliga poäng, inga sjunkande värden.

## Tillgångar (programmatiskt)
Endast emoji (renderade som `Text`) + Pixi `Graphics` + `createScene`. Inga externa bild-/ljud-/fontfiler.
- Emoji: 🚰 (kran), 🌱→🌸/🌻 (planta/blomning), 🪨 (sten/hinder), 💧 (ikon), 💪 (sten borta), ev. 🎉 i firandet (annars sköter `bigCelebration`).
- Graphics: vattenblå scen-gradient (via `scene.js`), grid-rutor (`roundRect` svag fyll+stroke), rörbitar (grå rörkropp + ljusblå innerkanal, glansstrimma), glasmugg (`roundRect` halvtransparent + glans + gul streckad fyll-linje), stigande vattenrekt, droppar (små cirklar), pöl-puffar, skugg-ellipser under kran/mugg/sten.
- Firande via `feedback.bigCelebration` + `burst`/`sparkle`/`ripple` i `ctx.fxLayer`.

## Återanvänd dessa
- `lib/DragController.js` — dra rörbitar från tray till grid-celler (med inbyggd tap-tap-fallback + snäpp/snäpp-tillbaka).
- `lib/scene.js` — `createScene('water', { ground:false })` som första barn.
- `lib/feedback.js` — `bounceIn, pop, wiggle, puff, sparkle, ripple, burst, floatText, bigCelebration, breathe`.
- `lib/theme.js` — `COLORS, FONT, PLAYFUL, PRAISE, DESIGN_W, DESIGN_H`.
- `lib/swedish.js` — `randomFrom, shuffle` (banval/jitter/rörval i tray).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress` — `get, setLevel, complete, setCustom`.
- `ctx.ticker` (vatten-droppar + idle-timers, läs `deltaMS`), `ctx.fxLayer` (firande/partiklar), `gsap` (snäpp/rotation/auto-hjälp).
- INTE matter.js (vattnet är en egen, billigare väg-/droppe-simulering).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/auto-hjälp/firande-callbacks samt ticker-loopen kollar `if (!this._alive) return` tidigt.
- **Dubbeltryck/"resolving"-skydd:** vid `_bloom` sätt `this._resolving = true` → ignorera nya drag/tap och stoppa droppe-spawn tills nästa bana laddas. Förhindrar att `complete()` triggas flera gånger.
- Droppar: rörs ENBART i ticker; destrueras med `if (!d.destroyed) d.destroy()`. Töm `this._drops` och destruera alla i `_buildLevel`/`destroy`. Aldrig `gsap.to` direkt på en droppe.
- Auto-hjälp-timer nollställs vid varje interaktion så spelet inte "hjälper" mitt i att barnet bygger.
- Snäpp-tillbaka om ett rör släpps utanför alla celler (DragController sköter det) → ingen straff.
- Skydda mot att lägga rör i en upptagen/blockerad (sten) cell: target accepterar bara om cellen är tom och stenfri.
- `destroy(ctx)`: `this._alive=false; ctx.ticker.remove(this._tick); this._drag?.destroy(); gsap.killTweensOf(...)` för rör, mugg-blomma, highlight och alla aktiva drop-tweens (det finns inga om reglerna följs); destruera alla droppar; `this._root?.destroy({children:true})`. Spara tick-funktionen som `this._tick`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/vattenvagen/index.js`. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `DragController`, feedback-hjälpare, `createScene`, `COLORS, FONT, PLAYFUL, PRAISE`, `randomFrom` från swedish.
2. `export default { id:'vattenvagen', titleSv:'Vattenvägen', icon:'💧', category:'pussel', input:'drag', ageRange:[3,5], bundle:'vattenvagen', voiceIntro:'Lägg rören så vattnet rinner ner till muggen!', init, mount, destroy }`.
3. `init(ctx)`: `this._alive=true`; skapa `this._root = new Container()`, `ctx.stage.addChild(this._root)`; lägg `createScene('water',{ground:false})` som första barn. Skapa lager-ordning: scen → `this._gridLayer` (rutor) → `this._pipeLayer` (lagda rör) → `this._dropLayer` (vatten) → mugg/kran/sten → `this._trayLayer`. Skapa `this._drag = new DragController({ space:this._root, services:ctx.services })`. Läs `this._level`. Anropa `this._buildLevel(ctx, this._level)`.
4. `_buildLevel(ctx, level)`: rensa rör/droppar/stenar; bestäm grid-storlek, generera en garanterat lösbar väg (källcell → mugg), välj vilka rör som redan ligger vs. ska läggas, placera kran + mugg + ev. stenar; fyll trayen med rätt rörtyper; registrera celler som DragController-targets; nollställ `_fill=0, _connected=false, _resolving=false, _idle=0`; kör `_recomputePath()`.
5. Implementera rörmodell: `makePipe(type, rot)` (Graphics-form + state), `portsFor(type, rot)`, `placePipe(cell, pipe)` (snäpp, `pointertap` för rotation), `rotatePipe(pipe)` (rot+1, animera, `_recomputePath`).
6. `_recomputePath()`: traversera port-kopplingar från källa; sätt `this._connected` + `this._path` (cell-center-polylinje källa→mugg). Vid nyss-kopplat: spela `reveal`/voice/sparkle-stege.
7. Vatten i ticker: `this._tick = (t)=> this._update(ctx, t)`, `ctx.ticker.add(this._tick)`. I `_update`: om `_connected && !_resolving` spawna droppar (timer), flytta varje droppe längs `_path`, fyll muggen, uppdatera vattenrekt; hantera läckage-pöl; kör idle-recue/auto-hjälp-timers. Allt bakom `if(!this._alive) return`.
8. `_bloom(ctx)`: `_resolving=true`, blomning + `celebrate`/voice/`bigCelebration`/`burst`, `progress.setLevel`/`setCustom`/`complete`, `gsap.delayedCall(1.6, ()=> this._alive && this._buildLevel(ctx, ++this._level))`.
9. Sten-borttagning: `pointertap` → puff/floatText/soft + ta bort sten + gör cellen till giltig target.
10. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
11. `destroy(ctx)`: enligt "Edge-cases & städning".
12. Registrera i `src/games/registry.js`: `import vattenvagen from './vattenvagen/index.js'` och lägg `vattenvagen` i `GAMES`-arrayen.
13. `npm run build` (0 fel), sedan `npm run dev`: spela och verifiera drag, rotation, sten-borttagning, vattenström, blomning, auto-hjälp, hem-knapp, röst-repris och att `highestLevel`/`banor` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera till biblioteket → välj "Vattenvägen"). Canvas finns; inga uncaught errors i `browser_console_messages`.
- Vid mount är `voiceIntro` satt/uttalad ("Lägg rören så vattnet rinner ner till muggen!").
- Drag av en rörbit från trayen till en tom grid-cell placerar röret där (snäpp); en ny stämpel återskapas i trayen. Tap-tap-fallback fungerar lika (tap stämpel → tap cell).
- Tryck på ett lagt rör vrider det 90° (`rot`-state ökar mod 4; `view.rotation` ändras) med ljud, utan fel.
- Tryck på en sten lyfter bort den (sten försvinner, puff/ljud) och frigör cellen — ingen tryck-och-håll krävs, ingen straff.
- När en sammanhängande väg källa→mugg byggs sätts `_connected=true`, vatten-droppar börjar flöda och muggens `_fill` ökar (verifiera via exponerat teststate).
- När `_fill` når linjen triggas blomning + `bigCelebration` och `progress.complete()` anropas EXAKT en gång (inget dubbeltrigg under `_resolving` vid snabba tryck).
- Ingen fail-state: ett icke-kopplande rör eller läckage ger bara en pöl-puff/mjukt ljud, ALDRIG buzzer/rött/omstart; efter idle-timern lägger auto-hjälpen den felande biten och banan klaras ändå.
- Progress sparas: efter en avklarad bana är `highestLevel` ökat och `custom.banor` ökat; värdena kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- Städning: vid retur till biblioteket (hem-knapp) tas ticker-loopen bort, alla droppar destrueras och inga tweens/timeouts fortsätter logga eller kasta fel.
