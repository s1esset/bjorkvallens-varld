# Magnetfiske (`magnet-fiske`)
> Barnet drar en magnet på ett spö över en glittrande damm och ser metallsakerna sucka sig fram genom vattnet och klicka fast — ankorna bara guppar undan och fnissar. Ren upptäckarglädje: "magneter gillar metall!" utan ett enda felsteg.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `magnet-fiske` | Magnetfiske | 🧲 | drag | drag | [2,4] | `magnet-fiske` | "Dra magneten och fiska upp metallsakerna!" |

(Kategorin `drag` ger en blå bricka — passar dammen. Spelet är ändå ett fysikspel byggt på `lib/physics.js`.)

## Mål & mekanik
Dammen sedd ovanifrån. I vattnet flyter saker och guppar lugnt omkring: **metallsaker** (🐟 plåtfisk, 🔑 nyckel, 🪙 mynt, 🔩 skruv, 🥫 burk) och **icke-metall** (🦆 anka, 🛟 badring, ⛵ träbåt). Barnet drar en **magnet på ett spö** runt över dammen.

**Kärnloop:**
1. Magneten har ett **kraftfält** med radie ~300px. Metallsaker inom fältet dras **radiellt mot magnetpunkten** (acceleration ∝ 1/avstånd → svag och len långt bort, stark och snäpp nära). Icke-metall bryr sig inte alls.
2. När en metallsak når magneten (avstånd < ~46px) **fastnar** den (snäpp-ljud + gnistra) och hänger med under magneten i en liten klase.
3. Barnet drar magneten (med fastklistrade saker) bort till **hinken 🪣** på högra stranden. När magneten kommer in i hinkens zon **släpper** sakerna ner i hinken (plopp + räknas).
4. **Mål:** få upp ALLA metallsaker i hinken → firande + `ctx.progress.complete()` → ny, lite större damm efter ~1,5s.

**Detta lär det ut:** magneter fångar metall men inte trä/gummi. Barnet måste **sikta magneten över rätt sak** (metall, inte anka) → äkta spelarpåverkan.

**No-fail:** ankor och badringar kan ALDRIG fastna. Kommer magneten för nära en anka **knuffas ankan bara mjukt undan** (`Hihi!` + guppning) — aldrig en bestraffning. Når barnet inte fram av egen kraft garanterar mjuk auto-hjälp (ambient ström + idle-vink) att varje sak till slut går att fånga.

## Skärm-layout (1280x720)
Designkoordinater 1280×720. GameHost ritar headern (hem-/repetera-knapp) överst — rita INGA egna. Allt nedan ligger i spelets `_root`.

- **Bakgrund (FÖRSTA barn):** `createScene('water', { width: ctx.width, height: ctx.height })` (mjuk blå vatten-gradient + bokeh). `eventMode='none'`, `interactiveChildren=false`.
- **Damm-panel:** `roundRect(70, 150, 940, 500, 60).fill({color: COLORS.blue, alpha: 0.55}).stroke({width:10, color: COLORS.teal})`. Ovanpå 2–3 ljusa vågremsor (tunna `roundRect` i `COLORS.white` alpha 0.10) för djup. Dekorativ (`eventMode='none'`).
- **Logisk damm-ruta (där saker flyter):** x ∈ [120, 960], y ∈ [200, 610]. Fyra **statiska väggkroppar** byggs längs dessa kanter (se Fysik) så inget driver ut.
- **Hink 🪣:** höger strand, `Text` fontSize 130 vid (1150, 540) med en mjuk skuggellips under. Bakom den en gul **glödring** (`circle(1150, 500, 130).stroke({width:8, color: COLORS.yellow, alpha:0.5})`) som markerar släpp-zonen. Liten räknare-rad av små ⭐/prickar bredvid hinken visar hur många som ligger i (valfritt, ingen siffra som sjunker).
- **Magnet på spö:** en `Container` (`this._magnet`):
  - **Spö:** `Graphics` som varje tick ritar om en lina/stång från en fast pivot uppe i högra hörnet (≈ 1200, 70) till magnetspetsen (`g.clear().moveTo(pivot).lineTo(tip).stroke({width:12, color: COLORS.brown})` + en liten knopp vid pivoten).
  - **Magnethuvud:** 🧲 `Text` fontSize 90, anchor 0.5, vid magnetspetsen. En svag blå halo-cirkel (`circle(0,0,46).fill({color: COLORS.blue, alpha:0.18})`) visar "klister-zonen".
  - **Träffyta:** `hitArea = new Circle(0, 0, 90)` (≥96px diameter + halo) så hela magneten är lätt att greppa.
  - **Startläge:** parkerad strax ovanför dammen, t.ex. (560, 130).
- **Flytande saker:** varje sak = `Container` med en mjuk skuggellips (`ellipse` i `COLORS.shadow` alpha 0.12) + emoji-`Text` fontSize 72, anchor 0.5. Placeras jämnt utspridda i damm-rutan med ≥110px lucka. Metall får `body.label='metal'`, icke-metall `body.label='kork'`.

Marginaler: magneten kan dras över HELA dammen + fram till hinken, så varje sak är alltid nåbar. Hinken och magnetens parkering har fri sikt.

## Interaktion
Indata = **drag** (med tap-tap-fallback). Magneten är det enda barnet rör; den styr allt.

**Drag (sikta magneten):**
- `this._magnet.eventMode = 'static'`, `cursor='pointer'`, `hitArea = new Circle(0,0,90)`.
- `pointerdown` på magneten → `this._dragging = true`, spara greppoffset `off = magnet.pos − _root.toLocal(e.global)`, ljud `audio.sfx('tap')`, liten skala-pop, nollställ idle-timer.
- `globalpointermove` (registrerad på magneten) → om `_dragging`: sätt `magnet`-målläge = `_root.toLocal(e.global) + off`, **klampat** till rörelse-rutan x ∈ [120, 1210], y ∈ [110, 620] (täcker damm + hink). Magneten följer fingret direkt (lerp i ticker, faktor ~0.5, så det känns följsamt men inte hoppigt).
- `pointerup`/`pointerupoutside` → `_dragging = false`.
- Kraftfältet är ALLTID aktivt (även när barnet inte drar), så saker fortsätter sucka mot en stillastående magnet — men barnet styr utfallet genom VAR magneten står.

**Tap-tap-fallback (för de minsta, drag är svårt <4 år):**
- Varje **metallsak** är `eventMode='static'` med `pointertap` → sätt magnetens **auto-mål** till den sakens position; magneten glider dit i ticker (ease), fångar den, och glider sedan vidare. Tappa **hinken** → auto-mål = hinken, magneten åker dit och släpper lasten.
- Tappa en **anka** → `wiggle(anka)` + `floatText(ctx.fxLayer, x, y, 'Hihi!')` + `audio.sfx('soft')` (ingen fastnar — lekfullt).
- Drag och tap-tap driver SAMMA magnet-mållogik (`this._target`), så lägena blandas fritt.

**Två tydliga kontroller som ändrar utfallet:** (1) **var** barnet placerar/drar magneten (vilka saker som dras in och i vilken ordning), och (2) **selektiviteten** — bara metall fastnar, så barnet måste sikta över metall och undvika att bara stöta i ankor. (3) bonus: det medvetna **lyftet till hinken** (släpp sker bara i hink-zonen).

## Fysik & kalibrering
Byggt på `lib/physics.js` (`PhysicsWorld`, matter.js, fast 1/60-steg). **Ingen gravitation** — ovanifrån-damm, saker flyter.

- `this._phys = new PhysicsWorld({ gravityY: 0, gravityX: 0, walls: [] })` — INGA skärmväggar; bygg egna pondväggar.
- **Pondväggar:** fyra statiska rektanglar längs logiska damm-rutan [120,960]×[200,610], t.ex. `this._phys.rectangle(540, 180, 900, 40, {isStatic:true, restitution:0.3, label:'wall'})` (topp) och motsvarande för botten/vänster/höger. Saker studsar mjukt mot kanterna istället för att försvinna.
- **Sak-kroppar:** `this._phys.circle(x, y, 38, { restitution: 0.2, friction: 0.1, frictionAir: 0.06, density: 0.0012, label })` (≈ `MATERIALS.light` men med vatten-luftmotstånd 0.06). `this._phys.link(body, view)` (kom ihåg `view`/emoji anchor 0.5). Ge varje sak en liten slumpad starthastighet (`nudge(body, ±0.3, ±0.3)`) för levande guppande.

**Radiell magnet-attraktion (per tick, EGEN kraft — inte `setWind`, eftersom riktningen ändras per kropp och tick):**
För varje metall-kropp som varken är fastklistrad eller redan i hinken, varje fysiksteg:
```
dx = magnetTip.x − body.position.x
dy = magnetTip.y − body.position.y
dist = Math.hypot(dx, dy)
if (dist < R_FIELD) {                      // R_FIELD = 300
  a = Math.min(STRENGTH / Math.max(dist, R_MIN), A_MAX)   // accel mot magneten
  Body.applyForce(body, body.position, { x: body.mass * a * dx/dist,
                                         y: body.mass * a * dy/dist })
}
```
Starttal: `STRENGTH = 12`, `R_MIN = 28`, `A_MAX = 10`. Multiplikationen med `body.mass` gör att alla metallsaker accelererar lika (force = massa × acceleration), precis som `setWind` i `physics.js`.

**Kalibrering (så pullen känns rätt, mätt mot matters fasta 1/60-steg):** en accelerationsfält-`a` ger hastighetsökning ≈ `0.2778 × a` px/steg (samma relation som `previewGravity = 0.2778×gravityY` i CLAUDE.md). Med luftmotstånd `frictionAir = 0.06` blir **terminalhastigheten** `v_term ≈ 0.2778 × a / frictionAir`. Med talen ovan: långt bort (dist 300) → `a≈0.04` → `v_term≈0.19` px/steg ≈ 11 px/s (len drift); nära (dist 40) → `a=0.3` → `v_term≈1.4` px/steg ≈ 83 px/s (snabb snäpp). Det ger exakt den önskade "1/avstånd"-känslan. Tuna `STRENGTH`/`frictionAir` mot denna relation om pullen känns trög eller skenar.

**Fastna (klister):** när `dist < STICK_R = 46` → markera `body._stuck = true`. Sluta applicera fältkraft; varje tick istället: `Body.setVelocity(body, {x:0,y:0})` och `Body.setPosition(body, magnetTip + slotOffset)` där `slotOffset` är en liten solfjäder under magneten: `[ {0,48}, {-36,60}, {36,60}, {0,76}, {-30,86} ]` indexerat på fångst-ordning. (Alternativt en matter-`Constraint` mot en osynlig magnet-kropp — men direkt position-styrning är enklast och exit-säkert.)

**Ankor / icke-metall (no-fail-knuff):** ingen attraktion. Om en `kork`-kropp kommer inom `DUCK_PUSH_R = 80` av magneten → `Body.applyForce(duck, pos, { x: duck.mass * 0.25 * (−dx/dist), y: duck.mass * 0.25 * (−dy/dist) })` (mjuk knuff BORT) + throttlad `wiggle`/`floatText('Hihi!')` (max var ~600ms). Ankan kan aldrig fastna.

**Släpp i hinken:** när magnetspetsen är inom hink-zonen (`Math.hypot(tip − bucket) < 130`) och har fastklistrade saker → för varje fastklistrad: `this._phys.removeBody(body)`, animera vyn ner i hinken (tweena en `{}`-proxy → kopiera till vyn bara `if(!view.destroyed)`, krymp + `onComplete` `view.destroy()`), `audio.sfx('pling')`, `puff(ctx.fxLayer, bucket.x, bucket.y, {color: COLORS.yellow})`, öka `this._caught`.

## Återkoppling & belöning
Varje pekning → ljud+bild < 100ms:
- **Greppa magnet:** `audio.sfx('tap')` + skala-pop på magneten.
- **Sak fastnar:** `audio.sfx('match')` (saknas → `'reveal'`/`'pling'`) + `sparkle(ctx.fxLayer, item.x, item.y)` + `pop(itemView)` + valfri `floatText(ctx.fxLayer, x, y, '✨')`. Första fångsten: `voice.say('Den fastnar! Metall!')`.
- **Anka knuffas:** `audio.sfx('soft')` + `wiggle(duckView)` + `floatText(ctx.fxLayer, x, y, 'Hihi!')` (throttlat). ALDRIG buzzer/rött.
- **Släpp i hink:** `audio.sfx('pling')` per sak + `puff` (gul) + en liten ⭐ läggs till i räknar-raden.
- **Allt fångat (klart):** `this._resolving = true` → `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, {width: ctx.width, height: ctx.height})`, hinken `pop`:ar, sedan `ctx.progress.complete()`. Efter ~1,5s (`gsap.delayedCall`) byggs nästa damm.
- **Idle-vink (~6s):** `voice.replayLast()` (eller `voiceIntro`) + den närmaste ofångade metallsaken får `sparkle` + en mjuk `breathe`-puls som vink om var man ska fiska.

Använda sfx: `tap, match, reveal, pling, soft, celebrate`. Röst: `voiceIntro`, 'Den fastnar! Metall!', `PRAISE`.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init; styr antal saker och blandning.
- Banor (cykliska, oändlig lek) — antal **metall (mål)** + **icke-metall (avledare)**:
  - **Nivå 0:** 2 metall, 1 anka. (Lär ut: dra magnet → fastnar → till hink.)
  - **Nivå 1:** 3 metall, 1 anka.
  - **Nivå 2:** 4 metall, 2 icke-metall (anka + badring).
  - **Nivå 3+:** 5 metall, 3 icke-metall, och en svag **ambient ström** (`this._phys.setGravity(0,0)` kvar, men ge varje tick en liten gemensam drift via `setWind(0.004, 0)` så sakerna rör sig långsamt → lite mer sikte krävs). Cap på 5 metall / 3 icke-metall; därefter varieras positioner/emoji-mix med jitter.
- Endast metall räknas mot målet (`this._needed = antalMetall`). När `this._caught === this._needed` → klart.
- Efter `complete()`: `ctx.progress.setLevel(this._level + 1)`, `ctx.progress.setCustom('rundor', (custom.rundor||0)+1)`, vänta ~1,5s, bygg nästa damm. Inga synliga poäng, inget som sjunker.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics` + `createScene`. Inga externa bild-/ljud-/fontfiler.
- **Emoji:** 🧲 magnet, 🪣 hink; metall 🐟 🔑 🪙 🔩 🥫; icke-metall 🦆 🛟 ⛵; valfri ✨/⭐ i firande.
- **Graphics:** damm-panel (`roundRect` blå + teal stroke), vågremsor, pondväggar (osynliga/dekor), spö-linje (`moveTo/lineTo` + brun stroke), magnetens blå klister-halo, hinkens gula glödring, sak-skuggellipser, räknar-prickar.
- **Ljud** via `audio.sfx`, **röst** via `voice.say`. Firande via `bigCelebration`/`puff`/`sparkle` i `ctx.fxLayer`.

## Återanvänd dessa
- `lib/physics.js` — `PhysicsWorld` (gravityY:0, egna väggar), `circle`/`rectangle`, `link`, `removeBody`, `Body` (`applyForce`/`setVelocity`/`setPosition`), `nudge`, `setWind` (ambient ström på högre nivåer). Stega på `ctx.ticker` med `this._phys.update(t.deltaMS)`.
- `lib/scene.js` — `createScene('water', {...})` som första barn.
- `lib/feedback.js` — `sparkle`, `pop`, `wiggle`, `puff`, `floatText`, `breathe`, `bigCelebration`.
- `lib/theme.js` — `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`.
- `lib/swedish.js` — `randomFrom`, `shuffle` (mix av emoji/positioner).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress` — `get`, `setLevel`, `setCustom`, `complete`.
- `ctx.fxLayer` (firande), `ctx.ticker` (fysik + idle-timer).
- INTE `AimLauncher`/`predictTrajectory` (ingen kastbana här) och INTE `DragController` (egen magnet-pekarlogik + tap-tap passar bättre).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`onComplete`/auto-mål-callbacks samt ticker-loopen kollar `if (!this._alive) return`.
- **Resolving-skydd:** sätt `this._resolving = true` när sista saken hamnar i hinken → ignorera nya pointer/tap och stoppa nya fångster tills nästa damm byggs, så `complete()` aldrig triggas två gånger.
- Markera `body._stuck` så en sak aldrig fångas/räknas dubbelt; markera levererade saker som borttagna (`removeBody`) innan de räknas.
- Throttla anka-knuff och studsljud (tidsstämpel) så snabba upprepningar inte spammar audio.
- **Exit-säkra partiklar:** använd ENBART `lib/feedback.js`-hjälparna eller `{}`-proxy-mönstret (kopiera till Pixi-objekt bara `if(!view.destroyed)`, `onComplete: () => { if(!view.destroyed) view.destroy() }`). Tweena ALDRIG en emoji-`Text`/`Container` direkt om den kan förstöras av exit eller av sin egen `onComplete`.
- Klampa magnetens position till rörelse-rutan varje tick så spöet aldrig hamnar utanför skärmen.
- Garanterad framgång: magnetens fält når hela dammen, så varje sak är nåbar; idle-vinken + ambient ström på höga nivåer säkrar att inget fastnar i ett hörn för evigt. Aldrig en fail-state.
- `destroy(ctx)`: `this._alive=false`; `ctx.ticker.remove(this._tick)`; `this._phys?.destroy()`; avregistrera magnetens pekarlyssnare; `gsap.killTweensOf(...)` för magnet, spö och alla sak-vyer; `this._root?.destroy({children:true})`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/magnet-fiske/index.js`. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `PhysicsWorld`, `{ Body, nudge }` från `lib/physics.js`, `createScene` från `lib/scene.js`, feedback-hjälpare, `COLORS, PLAYFUL, FONT, PRAISE` från theme, `randomFrom, shuffle` från swedish.
2. Default-exportera GameModule-objektet med metadatan i tabellen ovan.
3. `init(ctx)`: `this._alive=true`; `this._root = new Container()`; `ctx.stage.addChild(this._root)`. Lägg `createScene('water', {width:ctx.width,height:ctx.height})` som första barn. Bygg damm-panel, hink + glödring, räknar-rad. Skapa `this._phys = new PhysicsWorld({gravityY:0, gravityX:0, walls:[]})` och fyra pondväggar. Skapa `this._magnet` (spö-Graphics + 🧲 + halo + hitArea) och koppla pekarlyssnare (`pointerdown`/`globalpointermove`/`pointerup`/`pointerupoutside`). Läs `this._level` ur `ctx.progress.get().highestLevel`. Anropa `this._buildPond(ctx)`.
4. `_buildPond(ctx)`: bestäm metall/icke-metall-antal från nivå, rensa gamla saker (`removeBody` + förstör vyer), skapa nya `Container`-vyer + kroppar (`circle`, label, liten `nudge`), `link`, sätt `this._items`, `this._needed`, `this._caught=0`, `this._stuck=[]`, `this._resolving=false`, parkera magneten, ev. `setWind` för ambient ström. Lägg `pointertap` per sak (tap-tap-mål; ankor → wiggle/fniss).
5. Lägg ticker: `this._tick = (t) => this._update(ctx, t)`, `ctx.ticker.add(this._tick)`. I `_update`: lerpa magneten mot `_target` (drag eller tap-mål), rita om spöet, kör `this._phys.update(t.deltaMS)`, applicera radiell attraktion på metall, styr fastklistrade saker till magnet-slots, knuffa närgångna ankor, kolla stick-radie (fastna), kolla hink-zon (släpp + räkna), uppdatera idle-timer. Allt bakom `if(!this._alive) return` och hoppa fångst-logik om `this._resolving`.
6. `_deliver(ctx, body, view)`: ta bort kropp, animera vyn ner i hinken (proxy-tween), ljud/puff, `this._caught++`; om `this._caught===this._needed` → `_onComplete(ctx)`.
7. `_onComplete(ctx)`: `this._resolving=true`, firande (`celebrate`+voice+`bigCelebration`), `ctx.progress.setLevel(this._level+1)`, `ctx.progress.setCustom('rundor', …)`, `ctx.progress.complete()`, `gsap.delayedCall(1.5, ()=> this._alive && this._buildPond(ctx))` med `this._level++`.
8. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
9. `destroy(ctx)`: enligt "Edge-cases & städning".
10. Registrera i `src/games/registry.js`: `import magnetFiske from './magnet-fiske/index.js'` och lägg `magnetFiske` i `GAMES`-arrayen.
11. `npm run dev`, öppna biblioteket, spela: verifiera att metall dras in och fastnar men ankor knuffas undan med fniss, att lyft till hinken släpper sakerna, firande vid full hink, tap-tap-läget, hem-knapp, röst-repris och att `highestLevel`/`rundor` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera bibliotek → "Magnetfiske"; canvas finns, inga uncaught errors).
- `voiceIntro` är satt och en svensk röstinstruktion spelas vid mount (`"Dra magneten och fiska upp metallsakerna!"`).
- Drag av magneten över en metallsak gör att sakens kropp dras mot magneten och fastnar (verifierbart via exponerat teststate: `body._stuck` blir true / `this._caught` ökar efter leverans, eller positionsskillnad).
- En **anka/icke-metall fastnar ALDRIG**: magneten dras över den → den knuffas undan, `_stuck` förblir false, ingen ökning av `_caught`, mjuk respons (`soft`/`Hihi!`), inget felljud.
- Tap-tap-fallback: tap på en metallsak → magneten glider dit och fångar; tap på hinken → sakerna släpps i hinken.
- Mål: när alla metallsaker levererats till hinken triggas firande (konfetti i fxLayer) och `ctx.progress.complete()` anropas exakt EN gång (inget dubbeltrigg under `_resolving` vid snabba tryck).
- Ingen fail-state: inga "game over"-element, ingen sjunkande poäng, ingen straff-timer; saker lämnar aldrig dammen (positioner håller sig inom pondväggarna).
- Efter en avklarad runda byggs en ny, lite större damm (oändlig lek) och `custom.rundor` har ökat.
- Progress sparas: `highestLevel`/`stars`/`custom.rundor` kvarstår i localStorage (`pwagames.save.v1`) efter sidladdning.
- Städning: vid retur till biblioteket (hem-knapp) tas ticker bort, `this._phys.destroy()` körs, och inga tweens/timers fortsätter logga eller kasta fel mitt i en animation.
