# Glasstornet (`glasstornet`)
> Barnet bygger ett allt högre, härligt vinglande torn av glasskulor på en strut och kröner det med ett körsbär — varje kula vobblar och lutar som riktig mjukglass, men en kula som ramlar studsar bara glatt på marken och en ny dyker upp, så känslan är ren bygglust utan minsta risk att "förlora".

## Metadata
| Fält | Värde |
|---|---|
| id | `glasstornet` |
| titleSv | Glasstornet |
| icon | 🍦 |
| category | `fysik` |
| input | `drag` |
| ageRange | `[3, 5]` |
| bundle | `glasstornet` |
| voiceIntro | `Stapla glasskulorna! Dra en kula i sidled och släpp den på toppen.` |

## Mål & mekanik
- **Vad barnet gör:** Högst upp svävar en glasskula i en liten "hand". Barnet **drar kulan i sidled** för att välja var den ska hamna och **lyfter fingret (släpp) för att tappa den** — kulan faller och landar mjukt på struten/tornet. Varje kula är en **riktig matter.js-kropp** med hög friktion och nästan ingen studs, så den nestlar sig på kulan under och **vobblar/lutar** lite. Tornet **svajar** hela tiden lugnt fram och tillbaka (lutande gravitation), så *när* man släpper påverkar var kulan landar lika mycket som *var* man siktar.
- **Kärnloop:** en kula visas i handen överst → barnet drar den i sidled + släpper → kulan faller, studsar mjukt till ro och räknas om kulan blev liggande på tornet → en ny kula dyker upp → upprepa tills `goal` kulor ligger kvar → ett **körsbär 🍒** dråsar ner på toppen och tornet firas.
- **Tre kontroller som tydligt ändrar utfallet (≥2 krav uppfyllt):**
  1. **Placering (x):** var i sidled kulan släpps.
  2. **Timing:** tornet svajar — släpp i "rätt" del av svajet så kulan landar mitt på.
  3. **Klister-glass-knapp:** en stor knapp växlar nästa kula mellan vanlig (vinglig) och **klister-glass** (mer friktion, lättare massa → mycket stabilare). Barnet upptäcker att klister-glass gör tornet lättare att bygga högt.
- **No-fail:** En kula som rullar/ramlar ner på marken **studsar mjukt, fnissar (`floatText('Hihi!')`) och tas bort**, och en ny kula ges direkt — oändligt många försök. Endast kulor som blir **liggande på tornet** räknas, och antalet visas aldrig som siffra. Ingen "game over", ingen sjunkande poäng, ingen timer.
- **Klart** = `goal` kulor ligger kvar samtidigt → `ctx.progress.complete()` (delat firande + stjärna + klistermärke), körsbär på toppen, sedan byggs ett nytt (ett snäpp högre) torn. Oändlig lek.

## Skärm-layout (1280x720)
GameHost ritar hem-/högtalarknappen i headern (y<90) — rita **inga** egna. Allt spelinnehåll byggs i `this._root` (barn till `ctx.stage`), i designkoordinater. Bakgrund = `createScene('candy', { width: ctx.width, height: ctx.height, ground: true, groundH: 96 })` som **första** barn (pastell glass-känsla; markens topp hamnar då vid `groundTopY = 624`). Lägg den med `eventMode='none'`.

- **Marken (visuell):** scenens `candy`-ground (rosa) ligger nederst; tornet står på den. En mjuk mörk skugg-ellips ritas under struten.
- **Struten (🍦-cone, statisk):** ritas programmatiskt som en brun triangel med spets nedåt: spets `(640, 624)`, övre vänstra hörn `(548, 486)`, övre högra `(732, 486)`, `fill(COLORS.brown).stroke({width:5,color:0x6e4326})` + ett par ljusa diagonala "våffel"-linjer (alpha 0.25). Struten är en **statisk** matter-kropp (se Fysik). En liten **kopp** överst (två statiska "läpp"-kroppar vid rim-hörnen) cradlar första kulan så tornet sällan rasar helt.
- **Glasskulor (scoops):** glansiga cirklar, visuell radie **48px**, matter-radie **46px**. Container med: skugg-cirkel (mörk alpha 0.18, lite nedåt), huvudcirkel i en "glass-smak"-färg, en liten vit glansfläck uppe till vänster (`circle(-16,-16,12).fill({color:0xffffff,alpha:0.6})`). Smaker plockas ur en pastellpalett (se Tillgångar). **Hit-halo:** osynlig `hitArea = new Circle(0,0,66)` (≥96px träffyta) på den kula som hålls i handen.
- **Handen/spawnern (carrier):** den väntande kulan svävar vid fast `(640, 120)` (centrerad, under headerns hörnknappar). En liten "kläm-hand" eller skopa ritas runt den (enkel `roundRect` i COLORS.orange). Under kulan ritas en **prickad lodlinje** (serie små cirklar `0xffffff alpha 0.6`) ner mot tornets topp + en **landningsring** (cirkel-stroke `COLORS.yellow alpha 0.6`, r=40) på den förutsagda landningspunkten (som skiftar i sidled med svajet, se Fysik).
- **Nominella stapelhöjder (kul-centra, fysiken sätter dem exakt):** `472, 390, 308, 226, 144` (spacing ≈82px, nestling). Första kulan vilar i strut-koppen vid y≈472.
- **Klister-glass-knapp:** stor rund knapp radie **60** vid `(150, 590)`, emoji 🍯 (klister på) / 💧 (av) som Text fontSize 56, med en glödring när aktiv. Detta är en **barn-kontroll** (ingen föräldragrind — det är en lek-toggle, tillåtet).
- **Mål-indikator (körsbär):** ett blekt 🍒 (Text fontSize 48, alpha 0.5) svävar vid sidan på höjden för `goal`:te kulan (t.ex. `(820, 144)` för goal 5) och visar "så här högt". När tornet når dit dråsar ett riktigt körsbär ner på toppen.

Marginaler: knapp, strut och handen står tydligt isär (>24px). Allt spelinnehåll hålls y>96.

## Interaktion
Ingen `DragController` här (den snäpper föremål till mål; vi vill fri sidledsplacering + släpp-för-tapp). Egen, snäll peklogik på carrier-kulan + en bak-platta:

- **Carrier-kula** `eventMode='static'`, `cursor='pointer'`, `hitArea = new Circle(0,0,66)`.
- `pointerdown` på kulan: `this._dragging=true`, spara `pointerId`, lyft skala 1.12, `audio.sfx('tap')`, nollställ idle-timer.
- `globalpointermove` (registrerad på kulan): `const p = this._root.toLocal(e.global)`; sätt `carrier.x = clamp(p.x, 130, 1150)` (endast x — y låst på 120). Uppdatera prickad lodlinje + landningsring live.
- `pointerup` / `pointerupoutside`: **släpp = tappa**. Anropa `_dropScoop(carrier.x)`. Återställ skala, ta bort lodlinje/ring.
- **Tap-tap-fallback (för de minsta, drag är svårt <4 år):** en heltäckande osynlig bak-`hitArea`-platta (`eventMode='static'`, `'pointertap'`) längst bak: tap på rälsen → carrier-kulan **glider** (`gsap.to`, 0.25s) till den tappade x:et + `audio.sfx('soft')` + liten ripple. Tap **direkt på carrier-kulan** → `_dropScoop` rakt ner. Så barnet kan: tappa var den ska stå → tappa kulan för att släppa. Båda lägena driver samma `_dropScoop`.
- **`_dropScoop(x)`:** guarda `this._alive && !this._resolving && !this._falling`; skapa matter-kropp för kulan vid `(x, 120)` med liten nedåthastighet 0, ge den nuvarande material (`_sticky ? SCOOP_STICKY : SCOOP_NORMAL`), `link(body, scoopView)`, lägg i `this._live[]`, `audio.sfx('whoosh')`, sätt `this._falling=true` och starta settle-bevakning. Spawna INTE ny carrier-kula förrän settle är klar.
- **Klister-glass-knapp:** `pointertap` → `this._sticky = !this._sticky`; uppdatera glödring + ikon; `audio.sfx('tap')` + `pop(knapp)`; ev. färga carrier-kulan med en glittrig "klister"-ton så barnet ser skillnaden. (Ändrar materialet på *nästa* släppta kula.)

Hit-areor: carrier-halo r=66, knapp r=60, bak-platta täcker hela ytan. Inga små klickytor.

## Fysik & kalibrering
Riktig **matter.js** via `lib/physics.js` (`PhysicsWorld`). **Ingen `AimLauncher`/`predictTrajectory`** används — fallet är nästan lodrätt, så vi ritar en enkel lodlinje + landningsring (se nedan för dess kalibrering).

- **Värld:** `this._phys = new PhysicsWorld({ gravityY: 1.0, walls: ['floor','left','right'], wallThickness: 120, wallExtra: 200 })`. Mjuk gravitation = lugnt fall, lätt att hinna se.
- **Struten + kopp (statiska):** `this._phys.rectangle(640, 600, 150, 70, { isStatic: true, friction: 0.9, label: 'cone' })` som bärande sockel under spetsen, plus två små statiska "läpp"-kroppar vid `(556, 470, 18, 48)` och `(724, 470, 18, 48)` (`isStatic`, `label:'lip'`) som cradlar första kulan. (Visuella triangeln är bara grafik.)
- **Material (kropp-opts, egna blandningar — inte magiska tal):**
  - `SCOOP_NORMAL = { restitution: 0.10, friction: 0.70, frictionAir: 0.012, density: 0.0016, label: 'scoop' }` — knappt studs, gott grepp, lite vobbel.
  - `SCOOP_STICKY = { restitution: 0.02, friction: 0.95, frictionAir: 0.02, density: 0.0010, label: 'scoop' }` — klister-glass: griper hårt + **lättare** (mindre massa → mindre vältmoment) = mycket stabilare torn.
- **Svaj (tornet vajar):** i tickern oscilleras **gravitationens x-komponent** så hela tornet lutar lugnt fram och tillbaka:
  ```
  this._swayT += ctx.ticker.deltaMS
  const amp  = Math.min(0.10 + 0.02 * this._count, 0.20)   // högre torn lutar mer
  this._lean = amp * Math.sin(this._swayT * (2*Math.PI) / 2600)   // period 2,6 s
  this._phys.setGravity(1.0, this._lean)
  ```
  Struten står still (statisk), men kulorna lutar → barnet ser tornet "andas". Större `amp` på högre nivåer ger mild spänning, aldrig kollaps (hög friktion + koppen håller botten).
- **Settle-bevakning efter ett släpp:** sätt `this._falling=true`; ackumulera `this._settle += deltaMS`. Räkna kulan som "till ro" när den nyaste kroppens fart `Math.hypot(body.velocity.x, body.velocity.y) < 0.6` i ≥350ms, ELLER när `this._settle > 1600ms`. Då → `_evaluate()`.
- **`_evaluate()`:** för varje levande scoop-kropp:
  - **Ligger på tornet** om `body.position.y < 600` (ovanför markzonen). Räkna dessa → `this._count`.
  - **Ramlade** om `body.position.y >= 600` (nådde marken): ta bort kroppen (`_phys.removeBody`), `puff` + `floatText(ctx.fxLayer, x, y, randomFrom(['Hihi!','Hoppsan!']))`, `audio.sfx('soft')`, förstör dess view. Räknas inte (var aldrig med).
  - Om `this._count >= goal` → `_finishTower()`. Annars `this._falling=false`, spawna ny carrier-kula.
- **Landningsring-kalibrering (så ringen matchar var kulan faktiskt landar trots lutet):** matter ger per-steg horisontell acceleration `≈ 0.2778 × gravityX` px/steg² (samma 0.2778-faktor som för fall, enligt CLAUDE.md). Fall-tiden i steg från `y=120` till tornets topp `yTop` är `steps = sqrt(2*(yTop-120) / (0.2778*gravityY))`. Sidodriften blir då `driftX ≈ 0.5 * (0.2778 * this._lean) * steps²`. Rita landningsringen på `carrier.x + driftX` (och lodlinjen lätt lutande mot den punkten). Exempel: `yTop≈472`, `gravityY=1` → `steps≈48.7`; vid `lean=0.14` → `driftX≈46px`. Det gör att timing-kontrollen *syns* (ringen vandrar tiotals px med svajet) och förblir ärlig.

Alla väggar är studsväggar (golvet ligger utanför skärmen så marken visuellt är scenens ground vid 624; `body.position.y >= 600` används som "på marken"-tröskel).

## Återkoppling & belöning
Varje pekning → ljud+bild <100ms:
- **Ta tag i kula / tap:** `audio.sfx('tap')` + skala-puls.
- **Flytta carrier (tap-räls):** `audio.sfx('soft')` + liten `ripple(ctx.fxLayer, x, 120)`.
- **Släpp/tappa:** `audio.sfx('whoosh')`, lodlinje/ring försvinner.
- **Kula landar och blir liggande:** `audio.sfx('pling')` (var 3:e gång `'pop'`), `pop(scoopView)`, `sparkle(ctx.fxLayer, x, y)`, ibland `voice.say(randomFrom(['En till!','Så fint!','Pling!']))`.
- **Klister-knapp:** `audio.sfx('tap')` + `pop(knapp)` + glödring tänds/släcks.
- **Kula ramlar av (no-fail):** `audio.sfx('soft')` + `puff` + `floatText('Hihi!')` — lekfullt, ALDRIG buzzer/rött/tillrättavisning. Ny kula ges direkt.
- **Tornet klart:** ett riktigt 🍒 dråsar ner på toppen (kort `gsap`/eller liten matter-kropp), `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })` + `burst` runt toppen. Sedan ett nytt torn.
- **Mjuk auto-hjälp (garanterar framgång):**
  - Efter **3 ramlade kulor i rad** ELLER när tornet stått ett steg från `goal` i >8s: nästa kula blir **automatiskt klister-glass** och får en mild "magnet" vid landning (dämpa dess `velocity.x` och nudga x mot tornets centrum) så den fastnar.
  - Idle-recue: ingen interaktion på ~6s → `voice.replayLast()` (eller `voiceIntro`) + carrier-kulan `breathe`/pulserar en gång.

Använda sfx: `tap, soft, whoosh, pling, pop, celebrate`. Voice: voiceIntro + 'En till!'/'Så fint!'/'Pling!' (sparsamt), PRAISE vid klart, 'Hoppsan!'/'Hihi!' (sällan, via floatText är text).

## Progression & nivåer
- **Läs nivå:** `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)`.
- **Mål:** `const goal = Math.min(3 + this._level, 5)` kulor som ska ligga kvar samtidigt.
- **Svårighet växer mjukt:** högre `goal` + större svaj-amplitud (`amp` ovan, ∝ `this._count`, kapad 0.20) + från nivå ~3 något snabbare svaj-period (sänk 2600ms mot min 2000ms). Kul-storlek och hit-halo hålls konstant stora. Inget blir någonsin "för svårt": klister-glass + auto-hjälp garanterar att tornet kan byggas klart.
- **Vid klart torn:** `ctx.progress.setLevel(this._level + 1)`, höj `this._level`, `ctx.progress.setCustom('torn', (ctx.progress.get().custom?.torn || 0) + 1)`, `ctx.progress.complete()` (exakt en gång per fullbyggt torn).
- **Oändlig lek:** efter firandet `gsap.delayedCall(1.5, () => this._alive && this._newTower(ctx))` — nästa torn, ett snäpp högre/halare. Inget slut, ingen game over, ingen synlig poäng.

## Tillgångar (programmatiskt)
Inga externa bild-/ljud-/fontfiler. Allt ritas i Pixi v8 + systememoji som `Text`; ljud via `ctx.services.audio.sfx`, röst via `ctx.services.voice.say`.
- **Scen:** `lib/scene.js` `createScene('candy', …)` som första barn.
- **Strut:** brun triangel (`Graphics().moveTo/lineTo/fill/stroke`) + våffel-linjer + skugg-ellips.
- **Glasskulor:** glansiga cirklar (skuggcirkel + färgcirkel + vit glansfläck). Smak-palett (pastell, ur theme): `[COLORS.pink, COLORS.yellow, COLORS.teal, COLORS.purple, COLORS.orange, COLORS.green]` — välj per kula via `randomFrom`/index.
- **Carrier-hand:** liten `roundRect`-skopa i `COLORS.orange`; prickad lodlinje (serie små vita cirklar); landningsring (`circle`-stroke i `COLORS.yellow`).
- **Klister-knapp:** `circle`-fyllning i `COLORS.cream` + stroke, emoji 🍯/💧, glödring (`circle`-stroke) när aktiv.
- **Körsbär/mål:** emoji 🍒 som `new Text({ text:'🍒', style:{ fontFamily: FONT.body, fontSize: 48 } })`.
- **Partiklar/firande:** `puff, sparkle, ripple, burst, bigCelebration, floatText` ur `lib/feedback.js`.

## Återanvänd dessa
- `lib/physics.js` — `PhysicsWorld` (`circle`, `rectangle`, `link`, `removeBody`, `setGravity`, `update`, exit-säker `destroy`), egna material-blandningar (inspirerade av `MATERIALS.sticky/normal`).
- `lib/scene.js` — `createScene('candy', …)`.
- `lib/feedback.js` — `pop`, `wiggle`, `puff`, `sparkle`, `ripple`, `burst`, `bigCelebration`, `floatText`, `breathe`.
- `lib/theme.js` — `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`, `DESIGN_W/H`.
- `lib/swedish.js` — `randomFrom`, `shuffle`.
- `ctx.services.audio.sfx(…)`, `ctx.services.voice.say()/replayLast()`.
- `ctx.progress` — `get`, `setLevel`, `complete`, `setCustom` (rör ALDRIG `localStorage`).
- `ctx.fxLayer` (firande ovanpå), `ctx.ticker` (fysiksteg + svaj + settle + idle), `gsap`.
- **INTE** `DragController` eller `AimLauncher` (egen sidledspeklogik passar bättre).

## Edge-cases & städning
- **`this._alive`-skydd:** `true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`setTimeout`/ticker-/settle-callbacks och spawn returnerar tidigt om `!this._alive`.
- **`this._resolving`:** sätt `true` när `goal` nås (firande pågår) → alla pekar-callbacks och `_dropScoop` returnerar tidigt → `complete()` kan aldrig dubbeltriggas vid snabba tryck.
- **`this._falling`:** medan en släppt kula faller/settlar → blockera nytt släpp (ingen carrier-kula finns), så två kulor aldrig faller samtidigt.
- **Exit-säkra partiklar:** använd ENBART `lib/feedback.js`-hjälparna (de tweenar `{}`-proxy och rör Pixi-objektet bara `if (!obj.destroyed)`). Tweena ALDRIG en scoop-view eller carrier direkt på ett sätt som kan krocka med exit/`onComplete`.
- **Matter↔Pixi-synk:** `_phys.link(body, view)` synkar position+rotation. Vid borttagning av ramlad kula: `_phys.removeBody(body)` FÖRST, sedan `view.destroy()` (eller tween en `{}`-proxy och förstör i `onComplete` om den lever).
- **Klister-toggle påverkar bara nästa kula** — befintliga kroppars material ändras inte (undvik att röra liggande torn).
- **Settle-timeout:** även om en kula aldrig riktigt stannar (evig mild vobbel) tvingar `_settle > 1600ms` fram en `_evaluate`, så spelet aldrig "hänger".
- **`destroy(ctx)`:**
  - `this._alive = false`
  - `ctx.ticker.remove(this._tick)`
  - `gsap.killTweensOf(this._carrier)`, `killTweensOf` på knapp/markörer, döda ev. `breathe`-tween
  - avregistrera carrier-pekarlyssnare + bak-platta + knapp
  - `this._phys?.destroy()` (matter rensas)
  - `this._root?.destroy({ children: true })`
- **Nivå-reset vid nytt torn:** ta bort alla levande kroppar + views, nollställ `this._count`, `this._falling`, `this._resolving`, `this._fallStreak`, innan `_newTower` bygger struten/koppen på nytt.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/glasstornet/index.js` och `export default { id:'glasstornet', titleSv:'Glasstornet', icon:'🍦', category:'fysik', input:'drag', ageRange:[3,5], bundle:'glasstornet', voiceIntro:'Stapla glasskulorna! Dra en kula i sidled och släpp den på toppen.', init, mount, destroy }`.
2. `init(ctx)`: `this._alive = true`; `this._root = new Container()`, `ctx.stage.addChild(this._root)`; lägg `createScene('candy', …)` som första barn (`eventMode='none'`); skapa bak-`hitArea`-platta (soft-tap + tap-räls); skapa `this._fxAnchor`-referenser. Läs `this._level`, beräkna `goal`. Skapa `this._phys = new PhysicsWorld({ gravityY:1.0, walls:['floor','left','right'] })`. Definiera `SCOOP_NORMAL`/`SCOOP_STICKY`. Init `this._sticky=false`, `this._count=0`, `this._fallStreak=0`, `this._swayT=0`.
3. Skriv `_newTower(ctx)`: rensa gamla kroppar/views; rita strut-grafik + skapa statisk strut-/koll-kroppar (sockel + två läppar); rita mål-körsbär på `goal`-höjd; nollställ flaggor; `_spawnCarrier(ctx)`.
4. Skriv `_spawnCarrier(ctx)`: skapa carrier-kul-view vid `(640,120)` (smak-färg, ev. klister-ton om `_sticky`), `bounceIn`, sätt `hitArea` r=66, registrera `pointerdown`/`globalpointermove`/`pointerup`/`pointerupoutside` (sidledsdrag + släpp=tapp), rita prickad lodlinje + landningsring (uppdatera i move).
5. Skriv `_dropScoop(x)`: guarda flaggor; skapa matter-`circle(x,120,46, material)`; `link(body, view)`; pusha `{body,view}` till `this._live`; `audio.sfx('whoosh')`; `this._falling=true`, `this._settle=0`; ta bort lodlinje/ring.
6. Skriv klister-knappen (`pointertap` → toggla `_sticky`, uppdatera ikon/glödring, `audio.sfx('tap')`, `pop`).
7. Lägg fysik-/logik-tick: `this._tick = (t) => this._update(ctx, t)`, `ctx.ticker.add(this._tick)`. I `_update`: `if(!this._alive) return`; `this._phys.update(t.deltaMS)`; uppdatera svaj (`setGravity(1.0, lean)`); om `_falling` → ackumulera `_settle`, kolla farttröskel → `_evaluate(ctx)`; uppdatera landningsring (driftX-kalibrering) medan barnet drar; idle-timer (>6s → recue).
8. `_evaluate(ctx)`: räkna liggande (`y<600`) → `this._count`; ta bort ramlade (`y>=600`) med `puff`/`floatText`/`soft`, öka/nollställ `_fallStreak`, applicera auto-hjälp-regler; om `_count>=goal` → `_finishTower(ctx)`, annars `_falling=false` + `_spawnCarrier`.
9. `_finishTower(ctx)`: `this._resolving=true`; körsbär ner på toppen; `audio.sfx('celebrate')`; `voice.say(randomFrom(PRAISE))`; `bigCelebration(ctx.fxLayer,{width:ctx.width,height:ctx.height})` + `burst`; `ctx.progress.setLevel(this._level+1)`; `ctx.progress.setCustom('torn', …)`; `ctx.progress.complete()`; `gsap.delayedCall(1.5, ()=> this._alive && this._newTower(ctx))`.
10. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
11. `destroy(ctx)`: enligt "Edge-cases & städning".
12. Registrera i `src/games/registry.js`: `import glasstornet from './glasstornet/index.js'` och lägg `glasstornet` i `GAMES`-arrayen.
13. `npm run dev`, öppna biblioteket, spela: verifiera sidledsdrag+släpp, tap-tap-räls, klister-toggle, mjuk vobbel/svaj, att ramlade kulor fnissar och ersätts, körsbär+firande vid `goal`, hem-knapp, röst-repris, och att `highestLevel`/`custom.torn` ökar och kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (canvas finns; inga uncaught errors/Pixi-varningar om förstörda objekt) när man navigerar bibliotek → "Glasstornet".
- `voiceIntro` (eller fallback) triggas vid mount; idle-recue sker efter ~6s utan interaktion.
- En carrier-kula syns överst; klister-glass-knappen syns nere till vänster.
- **Drag + släpp:** ett `pointerdown` på carrier → `globalpointermove` i sidled → `pointerup` skapar en fallande matter-kropp; kulan rör sig nedåt och kommer till ro (verifiera via exponerat teststate, t.ex. `window.__barnspel`/`this._count`/`this._live`, eller snapshot-skillnad).
- **Tap-tap-fallback:** tap på bakgrundsrälsen flyttar carrier i sidled; tap på carrier släpper den — likvärdigt med drag.
- **Två+ kontroller ändrar utfallet:** olika släpp-x och påslagen klister-glass ger mätbart olika resultat (klister-glass → fler liggande kulor / stabilare torn) i upprepade släpp.
- **No-fail:** en kula som hamnar på marken (`y>=600`) ger `soft`-ljud + puff/fniss och tas bort, och en NY carrier-kula ges — ALDRIG buzzer/rött/omstart, ingen synlig poäng som sjunker.
- **Klart:** när `goal` kulor ligger kvar körs firande (konfetti i `fxLayer`) och `ctx.progress.complete()` exakt en gång (inget dubbeltrigg vid snabba tryck tack vare `_resolving`).
- **Persistens:** efter ett fullbyggt torn har `highestLevel` (och `custom.torn`) ökat och kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- **Städning:** vid hem-knapp/`destroy` tas ticker bort, `_phys.destroy()` körs, tweens dödas och inga lyssnare/animationer fortsätter logga eller kasta fel.
