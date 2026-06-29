# Enhörningens Glitterbajs (`enhorning-glitterbajs`)
> Barnet matar Elviras enhörning med glittermat, den tuggar, pruttar och **bajsar ett regn av guldglitter** som studsar runt — och barnet flyttar en skattburk för att fånga regnet. Silligt, magiskt och oemotståndligt: ju mer du matar, desto mer glitter, och burken blir alltid full till slut.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `enhorning-glitterbajs` | Enhörningens Glitterbajs | 🦄 | roligt | drag | [2,4] | `enhorning-glitterbajs` | "Mata enhörningen så bajsar den glitter! Fånga glittret i burken!" |

## Mål & mekanik
Elviras enhörning står till vänster och tittar hungrigt. Barnet **drar glittermat till enhörningens mun**; den tuggar (squash-animation), **pruttar** och **bajsar ut ett regn av små glitterpellets** (riktiga matter.js-kroppar, materialet `bouncy`) bakåt-uppåt-höger som studsar på en ramp/marken. Barnet **drar en skattburk** längs botten för att fånga de fallande pelletsen i burkens öppning (sensor-kollision). En **glittermätare** till höger fylls för varje fångad pellet.

Kärnloop:
1. Dra en mat-emoji från brickan nere till vänster upp till enhörningens mun (träffradie runt munnen).
2. Enhörningen tuggar ~0,6 s, pruttar (`whoosh`/`soft`-SFX + 💨), och **spottar ut en sats glitterpellets** ur rumpan (8–14 st beroende på nivå) med en spridning av utåtriktade hastigheter.
3. Pelletsen faller under gravitation, studsar mjukt på rampen/golvet och regnar ner över fångstzonen.
4. Barnet **drar skattburken** i sidled så öppningen står under där glittret faller. Varje pellet som rör burkens sensor räknas, ploppar in med en gnista, och mätaren stiger.
5. När mätaren är full → firande, `ctx.progress.complete()`, ny (rikare) nivå byggs.

**Två tydliga kontroller som ändrar utfallet:**
- **Hur mycket du matar** = hur många pellets som finns att fånga (mata flera gånger → glitterstorm).
- **Var du ställer burken** = hur många pellets du faktiskt fångar (positionering under regnet).

**No-fail:** missade pellets är roliga — de studsar, glittrar och fniss-SFX spelas. Pellets som blir liggande på golvet > 2 s **glider mjukt av sig själv in i burken** (auto-hjälp). På högre nivåer **böjs** fallande pellets svagt mot burken (en liten horisontell kraft mot burkens x) så barnet alltid lyckas. Det finns ingen miss-räknare, ingen timer, inget game-over.

## Skärm-layout (1280x720)
GameHost ritar hem-/repetera-knappar i headern — rita INGA egna. Håll spelinnehåll under y≈90. Allt nedan ligger i spelets `_root` (designkoordinater).

- **Bakgrund:** `createScene('candy', { ground: true, groundH: 120 })` som FÖRSTA barn i `_root` (rosa/lila godishimmel med bokeh; markremsa nere). `eventMode='none'`.
- **Ramp (studsyta):** en mjukt lutande platta. Visuellt `roundRect` ~`(470, 470, 520, 26, 14)` i `COLORS.purple`, roterad ca `-0.06 rad` (lätt lutning ner mot höger så glittret rinner mot fångstzonen). Matchas av en **statisk matter-rektangel** med samma mått/vinkel (restitution 0.5).
- **Enhörningen** (`this._unicorn`, Container vänd åt vänster, ~position `(320, 300)`), helt programmatisk Graphics + emoji:
  - Kropp: vit glansig ellips (`ellipse`-form via `roundRect`/`circle`-kluster) `fill(COLORS.white)`, mjuk skugga (mörk ellips alpha 0.12 under).
  - Huvud framåt-vänster, **mun** vid logisk punkt `MOUTH = (210, 250)` (en liten rosa båge); **horn** = gul triangel (`COLORS.yellow`) ovanför pannan; **man/svans** = remsor i `PLAYFUL`-färger; ett stort vänligt öga (vit cirkel + mörk pupill).
  - **Rumpa/utsläpp** vid logisk punkt `BUTT = (430, 285)` — pelletsen spawnas här; en liten 💨-emoji visas vid prutt.
- **Elvira** (avbildad människa — endast godkänt namn): liten programmatisk figur som står bredvid enhörningen vid ~`(150, 470)` (rund kropp, prick-ögon, glad mun, hårtofs). Hoppar glatt (`pop`) när enhörningen pruttar. Dekorativ, `eventMode='none'`.
- **Matbricka:** panel nere till vänster `roundRect(60, 560, 360, 130, 28).fill(COLORS.cream).stroke({width:6, color:COLORS.pink})` med 3 mat-slottar. Mat-emojis (🍓 🧁 🍪) som `Text` fontSize 76, var och en i en Container med osynlig `hitArea` (Circle r=64 → ≥96px träffyta). Matbricka fylls på automatiskt (oändlig mat).
- **Skattburk** (`this._chest`, draggbar), position start `(820, 600)`, draggbar i x ∈ `[540, 1150]`, fast y=600:
  - Visuellt: glansig kista `roundRect(-90,-60,180,120,18).fill(COLORS.brown).stroke({width:6,color:COLORS.ink})`, gult lock-band, en **öppning** upptill (mörk ellips) och en gul glödkant runt öppningen som markerar fångstzonen.
  - Osynlig drag-hit-halo: `hitArea = new Rectangle(-110,-90,220,180)` (rejält ≥96px).
  - **Sensor-kropp** (matter): en `isSensor`-rektangel ~`160×40` placerad vid burkens öppning (`chest.y - 50`), label `'burk'`. Flyttas med `Body.setPosition` när burken dras.
- **Glittermätare** (`this._meter`, höger kant ~x=1200): en lodrät tub `roundRect(1180,140,40,440,20)` med en stigande guldfyllning underifrån + en ⭐ ovanpå. Fylls i takt med `caught / goal`. Ingen siffra, ingen sjunkande poäng.

Marginaler: minst 24px mellan brickor/burk och skärmkant; munnen och fångstzonen har fri bana så en matning alltid ger fångbart glitter.

## Interaktion
- **Mata (drag):** mat-emojin dras via `lib/DragController.js` (`this._drag.addItem(foodView, {}, hooks)`), eller egen pointer-logik med samma snäll-principer:
  - `pointerdown` på maten → lyft (skala 1.12), ljud `tap`, följ fingret via `globalpointermove` (toLocal mot `_root`).
  - `pointerup`/`pointerupoutside`: om släpp-punkten är inom `Math.hypot(p - MOUTH) < 120` (rejäl mun-träffyta) → **matning lyckas**: maten "äts" (krymper in i munnen via {}-proxy-tween), kör `_chew()`. Annars: maten **snäpper mjukt tillbaka** till sin bricka-slott (`wiggle` + `soft`-ljud) — aldrig fel, bara "den missade munnen, försök igen".
  - **Tap-tap-fallback (för de minsta):** ett tap på maten markerar den (puls); nästa tap på enhörningen/munnen matar den direkt. Båda vägar kallar samma `_chew()`.
- **Flytta burken (drag):** `this._chest.eventMode='static'`, egen `pointerdown` → `this._dragChest=true`; `globalpointermove` → sätt `chest.x = clamp(localX, 540, 1150)` och `Body.setPosition(sensorBody, {x: chest.x, y: chest.y-50})`; `pointerup` → `this._dragChest=false`. Liten `tap` på burken pulsar den (feedback) men flyttar inget.
  - **Tap-tap-fallback för burken:** tap på en punkt längs botten-bandet → burken glider (kort `gsap.to`) dit, för barn som inte kan dra.
- Allt drag överlever att fingret lämnar objektet (lyssna på `globalpointermove`, ej `pointermove`).
- Skydd mot dubbeltryck under firande: `this._resolving=true` → alla mat-/burk-callbacks returnerar tidigt tills nästa nivå byggs.

## Fysik & kalibrering
Spelet använder **matter.js** via `src/lib/physics.js` (`PhysicsWorld`). Vi använder INTE `AimLauncher`/`predictTrajectory` (ingen sikt-pricklinje behövs — pelletsen är riktiga kroppar). Kalibreringen handlar om att regnet känns "glittrigt och studsigt" men lugnt nog att fånga.

- **Värld:** `new PhysicsWorld({ gravityY: 1.0, walls: ['floor','left','right'] })`. Lugn gravitation så regnet faller fångbart långsamt; sidoväggar hindrar att glitter åker ut, golvet (utanför burken) fångar upp överskott för auto-hjälpen. (`PhysicsWorld` kör fast 1/60-steg internt — stega med `this._phys.update(t.deltaMS)`.)
- **Ramp:** statisk rektangel via `this._phys.rectangle(730, 483, 520, 26, { isStatic: true, angle: -0.06, restitution: 0.5, friction: 0.3, label: 'ramp' })`. Lutningen rinner glittret mot fångstzonen (höger).
- **Pellets:** `this._phys.circle(BUTT.x, BUTT.y, 11, { ...MATERIALS.bouncy, label: 'pellet' })` (radie 11, `bouncy` → restitution 0.86, lätt). Visuell vy: liten glansig guldcirkel (`circle(0,0,11).fill(COLORS.yellow).stroke({width:2,color:COLORS.orange})`) + ev. en ✨ för en bråkdel; `this._phys.link(body, view)`.
- **Utskjutning vid prutt:** för varje pellet sätt en starthastighet **utåt-uppåt-höger** med spridning:
  `nudge(body, 3 + Math.random()*4, -(2 + Math.random()*4))` (px/steg; `nudge` = `Body.setVelocity`). Detta kastar glittret i en båge bakåt från rumpan, det studsar på rampen och regnar ner över x≈600–1100 där burken brukar stå.
- **Sensor-fångst:** burkens sensor-kropp (`isSensor:true`, label `'burk'`) ger ingen fysisk studs men triggar `onCollision`. I `this._phys.onCollision(pairs...)`: matcha par där en kropp har label `'pellet'` och den andra `'burk'` → `_catch(pelletBody)`: ta bort kroppen (`this._phys.removeBody`), animera vyn in i burken (puff/sparkle), öka `this._caught`, höj mätaren.
- **Auto-hjälp (no-fail), nivåberoende "böjning":** i fysik-tickern, för varje levande pellet med `body.position.y > 300` (på väg ner), applicera en liten horisontell kraft mot burken:
  `applyForce(body, body.mass * BEND * Math.sign(chest.x - body.position.x), 0)` där `BEND` ökar med nivån (`0` på nivå 0, upp till `~0.0004` på högre nivåer). Det böjer regnet mjukt mot burken så fångst nästan alltid sker — men ser ut som magi, inte styrning.
- **Golv-uppstädning (garanterad framgång):** pellets som ligger nästan stilla på golvet (`|velocity| < 0.4` och `y > 560`) i > 2 s → ta bort matter-kroppen och låt vyn **glida in i burken** med en exit-säker {}-proxy-tween (kopiera till vyn endast `if (!view.destroyed)`), räkna som fångad. Så all utmatad glitter hamnar till slut i burken; mätaren kan alltid bli full.

Notera: eftersom pelletsen är riktiga matter-kroppar är "förhandsvisning vs flykt"-kalibreringen i CLAUDE.md inte tillämplig här (den gäller `predictTrajectory`/`AimLauncher`). De värden som spelar roll är `gravityY`, `MATERIALS.bouncy` och utskjutningshastigheten ovan — håll gravitationen låg (~1.0) så regnet är fångbart för en 2–4-åring.

## Återkoppling & belöning
Varje pekning ger ljud+bild < 100 ms:
- **Ta tag i mat:** `audio.sfx('tap')` + `pop(food)`.
- **Matning lyckas (tugg):** enhörningen squashar (`pop`/scale-yoyo på `_unicorn`), `audio.sfx('soft')`; efter ~0,6 s **prutt:** `audio.sfx('whoosh')` (fallback `soft`), 💨-emoji `floatText(ctx.fxLayer, BUTT.x+30, BUTT.y, '💨')`, Elvira hoppar (`pop`), och pellets-satsen spawnas med `audio.sfx('pling')` + `sparkle(ctx.fxLayer, BUTT.x, BUTT.y)`. `voice.say('Pruttbajs! Massa glitter!')` (sparsamt — inte varje gång).
- **Mat missar munnen:** maten snäpper tillbaka, `wiggle(food)` + `audio.sfx('soft')`. Aldrig buzzer/rött.
- **Pellet fångas i burk:** `audio.sfx('pop')` (throttlat så regn inte spammar — t.ex. max var ~90 ms), liten `sparkle`/`puff(ctx.fxLayer, chest.x, chest.y-40, {count:4, color:COLORS.yellow})`, mätaren stiger ett steg med en mjuk tween, burken `pop`:ar lätt.
- **Pellet studsar/missar:** mjuk `audio.sfx('soft')` (kraftigt throttlat), glittret bara studsar vidare — roligt, ingen påföljd.
- **Klart-firande:** när `this._caught >= this._goal` → `this._resolving=true`; `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})` + `burst(ctx.fxLayer, chest.x, chest.y-40, {count:18, colors:[COLORS.yellow,COLORS.orange,COLORS.pink]})`, burken öppnas och strålar guld, `ctx.progress.complete()`. Efter ~1,5 s (`gsap.delayedCall`, kollar `_alive`) byggs nästa nivå.

Idle-recue: om ingen interaktion ~6 s → `voice.replayLast()` (eller `voice.say(this.voiceIntro)`) + en `breathe`/`pop`-puls på nästa mat-emoji som vänlig vink. Nollställ idle-timern vid varje interaktion.

Använda sfx: `tap, soft, whoosh, pling, pop, celebrate`. Voice: `voiceIntro`, `'Pruttbajs! Massa glitter!'`, `randomFrom(PRAISE)`.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init styr glittermängd, mål och bana.
- **Mål per nivå:** `this._goal = 8 + this._level * 4` pellets fångade (mjukt stigande; auto-hjälpen garanterar att det alltid nås).
- **Pellets per matning:** `batch = 6 + this._level` (mer glitter ju högre nivå).
- **Bana per nivå (cykliskt, oändlig lek):**
  - **Nivå 0–1:** ramp nästan plan (`angle ≈ -0.04`), mål 8–12, ingen böjning behövs (`BEND=0`), burken lätt att placera.
  - **Nivå 2–3:** rampen lutar mer (`angle ≈ -0.08`), mer glitter, lätt böjning (`BEND≈0.0002`) så regnet driver mot burken.
  - **Nivå 4+:** brantare/lekfullt lutande mark, två studs-knubbar (extra statiska rundade hinder som glittret studsar på), full böjning (`BEND≈0.0004`), mål upp till ~24. Mönstren upprepas med slumpad jitter (`randomFrom`/`Math.random`) på rampvinkel ±0.02 och knubb-position ±40px.
- Efter `complete()`: `ctx.progress.setLevel(this._level + 1)`, vänta ~1,5 s, `_loadLevel(ctx, ++this._level)` (flytta enhörning/burk till start, rensa pellets, ny ramp/mål). `setCustom('glitterrundor', n+1)` räknar rundor (frivilligt). Inga sjunkande värden, ingen synlig poäng.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics`. Inga externa bild-/ljud-/fontfiler.
- **Emoji:** 🍓 🧁 🍪 (mat), 💨 (prutt), ✨/⭐ (glitter/mätare), valfri 🦄 som ikon. Allt övrigt ritas.
- **Graphics:** scene.js-bakgrund (`candy`); enhörning (vit glansig kropp via cirkel/ellips-kluster, gult horn, `PLAYFUL`-man, öga, mjuk skugg-ellips alpha 0.12); Elvira (programmatisk figur); matbricka-panel (`roundRect` cream + rosa stroke); skattburk (`roundRect` brun + ink-stroke, gult lock, mörk öppnings-ellips, gul glödkant); glitterpellets (gul glanscirkel + orange stroke); ramp/knubbar (lila `roundRect`); glittermätare (tub `roundRect` + stigande guldfyllning + ⭐).
- **Färger ur `theme.js`:** `COLORS.white/yellow/orange/brown/ink/purple/pink/cream`, `PLAYFUL` för man/glitter-variation.
- Firande via `feedback.bigCelebration`/`burst`/`sparkle`/`puff` i `ctx.fxLayer`.

## Återanvänd dessa
- `lib/physics.js` — `PhysicsWorld` (matter.js: `circle`/`rectangle`, `MATERIALS.bouncy`, `link`, `removeBody`, `onCollision`, `update`, exit-säker `destroy`), `nudge`, `applyForce`.
- `lib/scene.js` — `createScene('candy', ...)` (bakgrund som första barn).
- `lib/feedback.js` — `pop`, `wiggle`, `breathe`, `puff`, `sparkle`, `burst`, `bigCelebration`, `floatText`.
- `lib/DragController.js` — mat-drag + tap-tap-fallback (eller egen pointer-logik med samma snäll-principer).
- `lib/theme.js` — `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`, `DESIGN_W/H`.
- `lib/swedish.js` — `randomFrom`, `shuffle` (mat-val, bana-jitter).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress` — `get`, `setLevel`, `setCustom`, `complete`.
- `ctx.ticker` (fysik + idle/uppstädnings-timers), `ctx.fxLayer` (firande), `gsap`.

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`onComplete`/timer-callbacks (prutt-fördröjning, nästa nivå, auto-glid) returnerar tidigt om `!this._alive`.
- **`_resolving`-skydd:** sätt `true` när mätaren blir full → mat-/burk-callbacks och pellet-spawn returnerar tills nästa nivå byggs (förhindrar dubbel `complete()` vid snabba tryck).
- **Exit-säkra partiklar:** all transient grafik (glitter som glider in i burken, 💨, mat som krymper in i munnen) använder `lib/feedback.js`-helpers ELLER {}-proxy-mönstret (`gsap.to({...}, {onUpdate: () => { if (!view.destroyed) {...} }, onComplete: () => { if (!view.destroyed) view.destroy() }})`). ALDRIG tweena en Pixi-pellet/vy direkt om den kan förstöras av sin egen `onComplete` eller av spel-exit.
- **Pellet-livscykel:** håll `this._pellets = []` (par `{body, view}`). Vid fångst/uppstädning: `this._phys.removeBody(body)`, ta bort ur arrayen, destroy vyn säkert. Cap antal levande pellets (t.ex. ≤ 60) så snabbmatande barn inte spränger fysiken — extra matningar köas/ignoreras mjukt.
- Throttla fångst- och studs-ljud så regnet inte spammar audio.
- Klampa burkens x till `[540, 1150]` och synka sensor-kroppen varje drag-frame.
- **`destroy(ctx)`:** `this._alive = false`; `ctx.ticker.remove(this._tick)`; `this._phys?.destroy()`; avregistrera alla pointer-lyssnare (mat, burk); `gsap.killTweensOf(...)` för enhörning, burk, mat, mätare och varje pellet-vy; döda idle/auto-glid-timers; `this._drag?.destroy()`; `this._root?.destroy({ children: true })`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/enhorning-glitterbajs/index.js`. Importera `Container, Graphics, Text, Circle, Rectangle` från `pixi.js`, `gsap`, `PhysicsWorld, MATERIALS, nudge, applyForce` från `lib/physics.js`, `createScene` från `lib/scene.js`, feedback-helpers, `DragController`, `COLORS, PLAYFUL, FONT, PRAISE` från `lib/theme.js`, `randomFrom` från `lib/swedish.js`.
2. Default-exportera GameModule med metadatan ovan (`id:'enhorning-glitterbajs'`, `category:'roligt'`, `input:'drag'`, `ageRange:[2,4]`, voiceIntro).
3. `init(ctx)`: `this._alive=true`; `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Lägg `createScene('candy', {ground:true, groundH:120})` som FÖRSTA barn. Skapa `this._phys = new PhysicsWorld({ gravityY:1.0 })`. Bygg enhörning (+ `MOUTH`/`BUTT`-punkter), Elvira, matbricka + mat, skattburk + sensor-kropp, glittermätare, ramp (visuell + statisk kropp). `this._drag = new DragController({ space:this._root, services:ctx.services })`. Läs `this._level` ur `ctx.progress.get().highestLevel`. Registrera `this._phys.onCollision(...)` för pellet↔burk. Anropa `_loadLevel(ctx, this._level)`.
4. `_loadLevel(ctx, level)`: rensa pellets, sätt ramp-vinkel/knubbar/`BEND`/`batch`/`goal` ur nivån, nollställ `this._caught=0` + mätaren, placera burk/enhörning på start, `this._resolving=false`, starta idle-timer.
5. `_feed(foodView)` (efter lyckad munträff/tap-tap): krymp mat in i munnen (exit-säkert), `pop(_unicorn)`, `audio.sfx('soft')`, `gsap.delayedCall(0.6, () => this._alive && !this._resolving && this._fart(ctx))`. Fyll på mat-slotten igen.
6. `_fart(ctx)`: `audio.sfx('whoosh')`, 💨 via `floatText`, Elvira `pop`, spawna `batch` pellets vid `BUTT` med utskjutnings-`nudge` (se Fysik), `audio.sfx('pling')` + `sparkle`. Respektera pellet-cap.
7. Fysik-/spel-tick `this._tick = (t) => this._update(ctx, t)`, `ctx.ticker.add(this._tick)`. I `_update`: `if(!this._alive) return`; `this._phys.update(t.deltaMS)`; applicera nivå-`BEND` mot burken på fallande pellets; uppdatera burk-sensorns position; kör golv-uppstädnings-timer (auto-glid in i burken); kör idle-recue-timer.
8. `_catch(pelletBody)` (från `onCollision` + från auto-glid): ta bort kropp, animera vy in i burken (exit-säkert), `this._caught++`, höj mätaren, `audio.sfx('pop')` (throttlat) + `puff`. Om `this._caught >= this._goal` → `_onComplete(ctx)`.
9. `_onComplete(ctx)`: `this._resolving=true`, firande (`celebrate`-ljud, röst, `bigCelebration`+`burst`, burk öppnas), `ctx.progress.setLevel(this._level+1)`, `ctx.progress.complete()`, `setCustom('glitterrundor', ...)`, `gsap.delayedCall(1.5, () => this._alive && _loadLevel(ctx, ++this._level))`.
10. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
11. `destroy(ctx)`: enligt "Edge-cases & städning".
12. Registrera i `src/games/registry.js`: `import enhorningGlitterbajs from './enhorning-glitterbajs/index.js'` och lägg `enhorningGlitterbajs` i `GAMES`-arrayen.
13. `npm run build` (0 fel) → `npm run dev`, öppna biblioteket, spela: verifiera matning (drag + tap-tap), tugg→prutt→glitterregn, burk-drag som fångar, mätare fylls, firande vid full mätare, auto-hjälp (lämna glitter → glider in i burken), hem-knapp, röst-repris, och att `highestLevel` ökar och kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera till biblioteket → välj "Enhörningens Glitterbajs"). Canvas finns; inga uncaught errors i `browser_console_messages`.
- Vid mount är `voiceIntro` satt/uppspelad (`"Mata enhörningen så bajsar den glitter! Fånga glittret i burken!"`).
- Matning fungerar: ett drag (eller tap-tap) av en mat-emoji till enhörningens mun triggar tugg + prutt och **spawnar pellets** (verifierbart via exponerat teststate, t.ex. `this._pellets.length` ökar, eller pixel/snapshot-skillnad i fångstzonen).
- Burken är flyttbar: ett drag på burken ändrar dess x (och sensor-kroppens x) inom `[540,1150]`; den lämnar aldrig banan.
- Fångst räknas: pellets som rör burkens sensor ökar `this._caught` och höjer mätaren.
- No-fail: en mat som släpps utanför munnen snäpper tillbaka med `soft`/`wiggle` (INGEN buzzer, inget rött, ingen omstart). Pellets som missar burken studsar och glider efter ~2 s ändå in i burken (auto-hjälp).
- Korrekt resultat: när `this._caught >= this._goal` triggas firande (konfetti i fxLayer) och `ctx.progress.complete()` anropas **exakt en gång** (inget dubbeltrigg via `_resolving` vid snabba upprepade tryck).
- Progression: efter en avklarad runda är `highestLevel` ökat; värdet (och ev. `custom.glitterrundor`) kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- Städning: vid retur till biblioteket (hem-knapp) tas ticker-loopen + fysikvärlden bort och inga tweens/timers fortsätter logga eller kasta fel (`this._phys.destroy()` körd, inga kvarvarande pellets-tweens).
