# Snöbollen (`snobollen`)
> Barnet rullar en liten snöboll nerför en vinterbacke och ser den växa sig STOR genom snön, välta pingviner och till slut klumpa ihop sig till en glad snögubbe — ren bygg-och-växa-tillfredsställelse, helt utan risk att misslyckas.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `snobollen` | Snöbollen | ⛄ | fysik | drag | [3,5] | `snobollen` | "Dra för att rulla snöbollen nerför backen!" |

## Mål & mekanik
En **snöboll** (⚪) börjar liten överst till vänster på en sluttande **vinterbacke** och rullar av sig själv nedåt-höger (gravitation). Barnet styr den och får den att **växa**.

Kärnloop:
1. Snöbollen ligger högt upp och börjar rulla nedför backen.
2. **Två kontroller som tydligt ändrar utfallet:**
   - **STYR (dra vänster/höger):** barnet drar fingret i sidled för att flytta snöbollen mellan körfält. Styrlinjen avgör **vilka snöfält den rullar igenom** (växt) och **vilka mål den träffar**.
   - **KNUFF (tryck på snöbollen):** varje tryck ger en framåt-fartknuff nedför backen → mer fart och **mer momentum** att välta mål. Fler knuffar = kraftigare smäll.
3. Rullar snöbollen genom ett **snöfält** (vit luddig fläck) växer den: **radie + massa ökar** (`Body.scale` + tyngre massa). Större boll = mer momentum.
4. Möter snöbollen ett **mål** (pingvin 🐧 eller låda 📦) på backen: är bollen stor/snabb nog **välter** målet och flyger undan (firande); är den liten **vinglar** målet bara lekfullt (ingen miss).
5. När snöbollen är **stor nog** OCH når **snögubbe-platsen** längst ned: den klumpar ihop sig till en snögubbe-bas, mage + huvud + hatt byggs ovanpå, stort firande → `ctx.progress.complete()`.

**No-fail-garanti:** Kommer snöbollen fram till snögubbe-platsen men är för liten, kör en mjuk **auto-hjälp**: extra "magisk" snö gnistrar fram och växer bollen till rätt storlek (gnistror + glatt ljud), sedan byggs snögubben ändå. Stannar bollen på vägen (osannolikt på en sluttning, men t.ex. fastnar mot ett mål) får den efter ~2,5 s stilla en mjuk auto-knuff nedför backen. Inget "game over", ingen sjunkande poäng, ingen straff-timer — varje runda slutar med en snögubbe.

## Skärm-layout (1280x720)
Designkoordinater 1280×720. GameHost ritar header (hem-/repetera-knapp) överst — rita INGA egna. Håll spelinnehåll under y≈90.

- **Bakgrund:** `createScene(winterTheme, { width:1280, height:720 })` som FÖRSTA barn i `_root`, där `winterTheme = { top:0xcfe9ff, bottom:0xeaf6ff, ground:0xffffff, groundDark:0xdce8f2, sun:true, clouds:2 }` (snöig himmel + vit markremsa). `eventMode='none'`. Lägg ev. några dekorativa snöflingor (små vita cirklar, alpha 0.8) som sakta faller via en exit-säker {}-proxy-tween — frivilligt.
- **Backen (sluttning):** ett brett avlångt `Graphics`-blad (rundad rektangel, fyll `COLORS.white` med en topp-remsa `0xeaf2fb` för "snö-glans" och en mjuk skugg-kant `0xdce8f2`), roterat ~`0.16 rad` (≈9°) så vänster är högt, höger lågt. Visuellt centrerat ~ (640, 470), bredd ~1480, höjd ~120. Under den en blå-grå skugga. Backen är spelets fysik-golv (statisk kropp, samma transform).
- **Snöboll** (⚪): start överst-vänster, vilande PÅ backen ~ (215, 250). Container = vit glanscirkel (huvudcirkel `0xffffff` + ljus highlight-cirkel uppe-vänster `0xf2f8ff` + tunn kant `0xdfeaf4`) med valfri ⚪/❄ som dekor. Startradie **40px**, max **110px**. Osynlig hit-halo: `hitArea = new Circle(0,0, r+24)` (uppdateras när bollen växer, alltid ≥96px diameter träffyta).
- **Snöfält** (växt-zoner, 4–9 st nivåberoende): luddiga vita fläckar längs backen — `Graphics`, klunga av 3–4 överlappande vita cirklar (r 36–60, alpha 0.95) med ljusblå kant. Logisk zon = cirkel r≈70 runt mitten. `eventMode='none'`. När bollen ätit fältet tonas det bort (blir "uppskrapad mark", ljusgrå fläck).
- **Mål** (1–4 st nivåberoende): pingvin 🐧 och/eller låda 📦 som emoji-`Text` (fontSize 84) på små runda fötter, stående på backen i olika körfält. Varje mål är en lätt dynamisk kropp.
- **Snögubbe-plats (mål-zon):** nederst-höger, markerad med en blek streckad ring (cirkel r≈120, stroke `COLORS.blue` alpha 0.4) runt ~ (1130, 560) och en liten skylt/❄-markör. Logisk mål-zon = cirkel r≈120.
- **Storleks-mätare (valfri, dekorativ):** en liten "tillväxt-ikon" uppe i hörnet (t.ex. en snögubbe-kontur som fylls underifrån när bollen växer) — INGEN siffra, ingen poäng. Bara en glad indikator på hur nära "stor nog" man är.
- **Styrhint:** medan bollen rullar och barnet drar, rita en kort streckad sidledspil (serie små vita cirklar) från boll mot finger-x. Tas bort vid släpp.

Marginaler: körfälten och snöfälten är så placerade att en rak nedåt-rull alltid plockar minst ett snöfält (nivå 0 garanterar växt utan styrning).

## Interaktion
Två kontroller, båda barnvänliga och stora:

**STYR — sidled (drag, med tap-tap-fallback):**
- Gör snöbollen `eventMode='static'`, `cursor='pointer'`, `hitArea = Circle(0,0, r+24)`.
- `pointerdown` på bollen ELLER var som helst på backen: sätt `this._steering=true`, spara finger-x (via `_root.toLocal(e.global)`), ljud `tap`, liten skala-pop.
- `globalpointermove` (registrerad vid down): uppdatera `this._fingerX`, rita styrhint.
- Varje fysik-tick mjukar bollens horisontella hastighet mot finger-x (se Fysik). Bollen följer alltså fingret i sidled medan gravitationen sköter nedförsfarten.
- `pointerup`/`pointerupoutside`: `this._steering=false`, ta bort styrhint.
- **Tap-tap-fallback (för de minsta):** ett kort tap (|drag|<14px) utan att hålla → bollen styr automatiskt mot den tappade x-positionen en kort stund (sätt `this._fingerX` = tappens x och låt mjuk-styrningen jobba i ~0,8 s). Så barnet kan "peka var bollen ska åka" istället för att dra.

**KNUFF — fart (tap på snöbollen):**
- En separat `pointertap` på snöbollen (snabbt tryck) ger en framåt-knuff nedför backen: lägg till hastighet längs sluttningsriktningen (~`+6 x, +1 y`), ljud `whoosh`, `puff` bakom bollen, liten skala-pop. Throttla till max ~var 150:e ms så snabba tryck inte spammar.
- KNUFF och STYR samexisterar: håll-och-dra styr; snabb-tap knuffar. (Långtryck/dubbeltryck används ALDRIG.)

Hit-areor: boll-halo r+24 (alltid ≥96px diameter). Backen är en stor träffyta så även missriktade tryck "tar tag" i leken. Inga små klickytor.

## Fysik & kalibrering
Bygg på `src/lib/physics.js` (`PhysicsWorld`, matter.js, fast 1/60-steg). Spelet använder INGEN sikt-förhandsvisning/`predictTrajectory` och INGEN `AimLauncher` (bollen drivs helt av gravitation + styrning), så ingen pricklinje-kalibrering behövs — men håll allt på det fasta tidssteget.

- **Värld:** `new PhysicsWorld({ gravityY: 1.1, walls: ['floor','left','right'] })`. Väggarna fångar bollen så den aldrig lämnar banan.
- **Backen (sluttning):** statisk kropp `phys.rectangle(640, 470, 1480, 120, { isStatic:true, angle: 0.16, friction: 0.4, label:'hill' })`. `angle` lutar ytan så bollen rullar nedåt-höger. Lägg backens `Graphics` med samma `rotation = 0.16` och position så bild och kropp matchar.
- **Snöboll:** `phys.circle(215, 250, 40, { restitution: 0.1, friction: 0.06, frictionAir: 0.012, density: 0.0016, label:'snowball' })`. Låg friktion = den glider/rullar lätt; låg studs = den klistrar mot backen. `phys.link(body, ballView, (v,b)=>{ v.scale.set(this._r / 40) })` så bilden alltid speglar fysikradien. (Sätt `ballView`-grafiken ritad för basradie 40 och skala via `_r`.)
- **Växt (radie + massa):** håll `this._r` (40→110). När bollen går in i ett ofångat snöfält:
  - `this._r = Math.min(110, this._r + 12)`.
  - `const f = this._r / prevR; Matter.Body.scale(body, f, f)` (skalar kroppen; matter uppdaterar massan från density automatiskt). Vill du betona momentum extra: `Matter.Body.setMass(body, body.mass * 1.15)`.
  - Uppdatera `hitArea`-radien till `_r+24`. Ljud `reveal`/`pling`, `sparkle` på bollen, fältet tonas bort (`gsap` på fältets alpha via {}-proxy om fältet kan förstöras vid exit — annars killTweensOf i destroy).
- **Styrning (mjuk sidled):** varje tick, om `this._steering` (eller tap-tap-fönstret aktivt):
  ```
  const desired = clamp((this._fingerX - body.position.x) * 0.09, -9, 9)
  const vx = body.velocity.x
  Matter.Body.setVelocity(body, { x: vx + (desired - vx) * 0.25, y: body.velocity.y })
  ```
  Gravitationen lämnas orörd i y, så bollen fortsätter nedför medan den glider i sidled.
- **Knuff (fart):** vid tap på bollen: `Matter.Body.setVelocity(body, { x: body.velocity.x + 6, y: body.velocity.y + 1 })` (riktning ned-höger längs backen).
- **Mål (pingvin/låda):** lätta dynamiska kroppar `phys.rectangle(tx, ty, 78, 90, { ...MATERIALS.light, label:'target' })`, länkade till sina emoji-vyer. De står på backen. Kollision boll↔mål hanteras av matter naturligt: en stor/snabb boll (hög `mass·hastighet`) skickar målet flygande; en liten boll knuffar nätt och jämnt. Förstärk känslan i `onCollision` (se nedan) men låt fysiken göra vältandet.
- **Tidssteg:** `ctx.ticker.add(this._tick = (t)=>{ this._phys.update(t.deltaMS); this._gameTick(t) })`. `_gameTick` kör styrning, snöfälts-koll, mål-zon-koll, idle/auto-hjälp-timers. Allt bakom `if (!this._alive || this._resolving) return` där relevant.
- **Rotation:** bollens rull-känsla kommer gratis från `link` (matter roterar kroppen, vyn följer). Lägg gärna en liten dekor-prick på bollen så rotationen syns.

## Återkoppling & belöning
Varje pekning → ljud+bild <100ms, ENDAST positivt:
- Ta tag/styra: `audio.sfx('tap')` + skala-pop + styrhint.
- Knuff: `audio.sfx('whoosh')` + `puff(ctx.fxLayer, ball.x, ball.y, {count:8, color:0xffffff})`.
- Växer (snöfält): `audio.sfx('reveal')` (eller `'pling'`) + `sparkle(ctx.fxLayer, ball.x, ball.y)` + kort skala-pop på bollen; mätaren fylls lite; valfri `floatText(ctx.fxLayer, ball.x, ball.y-60, '❄', {fontSize:48})`.
- Väller ett mål (`onCollision` ball↔target med tillräcklig fart): `audio.sfx('pop')` + `audio.sfx('soft')`, målet snurrar/flyger (matter), `puff` i målets färg, `floatText(... 'Oj!'/'Hihi!' ...)`, räkna `this._toppled++`. Är bollen för liten vid kontakt: bara `wiggle` på målet + mjukt `soft`-ljud (ingen miss, ingen straff).
- Väggstuds: throttlat `audio.sfx('pop')`.
- Snögubbe byggd (mål uppnått): `audio.sfx('correct')` → `audio.sfx('celebrate')`, `voice.say('Titta — en snögubbe! Bravo!')`, snögubben byggs (bas=bollen, mage + huvud-emoji ⛄/☃ + hatt 🎩 + 🥕-näsa pop:ar in), `feedback.bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})` + `burst(ctx.fxLayer, base.x, base.y, {count:16})`.

**Auto-hjälp (no-fail):**
- För liten vid snögubbe-platsen: `voice.say('Lite mer snö!')`, gnistor + `audio.sfx('reveal')`, väx `this._r` i mjuka steg tills "stor nog", bygg sedan snögubben. Garanterad framgång.
- Stillastående >2,5 s (ej i mål): `voice.say('Jag hjälper till!')` + mjuk auto-knuff nedför backen. Nollställ timern vid varje interaktion.

`ctx.progress.complete()` anropas EXAKT en gång när snögubben börjar byggas (oavsett om barnet eller auto-hjälpen fick bollen stor nog). Direkt efter: `ctx.progress.setLevel(this._level + 1)` och `setCustom('snogubbar', n+1)` (valfri räknare, ökar bara).

Idle-recue: ingen interaktion på ~6 s medan bollen lever → `voice.replayLast()` (eller `voice.say(this.voiceIntro)`) + bollen pulsar en gång + en pil mot närmaste snöfält.

Använda sfx: `tap, whoosh, reveal, pling, pop, soft, correct, celebrate`. Voice: voiceIntro + 'Titta — en snögubbe! Bravo!', 'Lite mer snö!', 'Jag hjälper till!'.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init; styr backens längd/lutning, antal snöfält, antal mål och "stor nog"-tröskeln.
- Banor (cykliska, oändlig lek):
  - **Nivå 0–1:** kort/brant backe, 4–5 snöfält rakt i bollens väg (växt garanterad utan styrning), 1 mål. "Stor nog" = r≥80. Lär ut rull + växt.
  - **Nivå 2–3:** snöfälten sprids över 2–3 körfält (styrning lönar sig), 2 mål, "stor nog" = r≥90.
  - **Nivå 4–5:** längre backe, snöfält i slalom-mönster, 3 mål, "stor nog" = r≥95.
  - **Nivå 6+:** längst backe, 8–9 snöfält, 4 mål, "stor nog" = r≥100 (aldrig över 105 så det alltid hinns). Därefter upprepas mönstren med slumpad jitter (±30px via `randomFrom`/`Math.random`).
- Efter `complete()`: `setLevel(this._level+1)`, vänta ~1,6 s (`gsap.delayedCall`), `_loadLevel(ctx, ++this._level)` återanvänder noderna (återställ boll till start, ny snöfälts-/mål-layout). Oändligt.
- Ju längre backe + fler mål desto roligare; ingenting blir svårare på ett bestraffande sätt och inget värde sjunker.

## Tillgångar (programmatiskt)
Endast emoji (renderas som `Text`) + Pixi `Graphics` + `lib/scene.js`. Inga externa filer.
- Emoji: ⚪ (boll-dekor, valfri), ❄ (snö/gnista), 🐧 + 📦 (mål), ⛄/☃ (snögubbe-huvud), 🎩 (hatt), 🥕 (näsa), valfri ⭐ vid firande.
- Graphics: vinterbakgrund via `createScene(winterTheme)`; backen (roterad rundad rektangel med glans-remsa + skugg-kant); snöfält (klungor av vita cirklar med ljusblå kant); snöbollens glanscirkel + highlight + kant; mål-zonens streckade ring; storleks-mätaren (kontur som fylls); styrhint (serie små vita cirklar); markskugga under boll/mål (mörk ellips, låg alpha).
- Partiklar/firande via `lib/feedback.js`: `puff`, `sparkle`, `burst`, `bigCelebration`, `floatText`, `pop`, `wiggle` (alla exit-säkra).

## Återanvänd dessa
- `lib/physics.js` — `PhysicsWorld` (`circle`, `rectangle`, `link`, `onCollision`, `update`, `destroy`), `MATERIALS.light`, samt re-exporterade `Matter`/`Body` för `Body.scale`/`setVelocity`/`setMass`.
- `lib/scene.js` — `createScene(winterTheme, {...})` för bakgrunden (FÖRSTA barn).
- `lib/feedback.js` — `puff`, `sparkle`, `burst`, `bigCelebration`, `floatText`, `pop`, `wiggle`, `breathe`.
- `lib/theme.js` — `COLORS`, `FONT`, `DESIGN_W`, `DESIGN_H`, `PRAISE`.
- `lib/swedish.js` — `randomFrom`, `shuffle` (banval/jitter).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress` — `get`, `setLevel`, `complete`, `setCustom`. `ctx.fxLayer` (firande), `ctx.ticker` (fysik+spel-loop), `gsap` (tweens/auto-hjälp).
- (INTE `AimLauncher`/`predictTrajectory` — ingen sikt-förhandsvisning i detta spel.)

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`setTimeout`/auto-hjälp-callbacks samt fysik-/spel-tick:en kollar `if (!this._alive) return`.
- **`_resolving`-skydd:** när snögubben börjar byggas, sätt `this._resolving = true` → ignorera nya pointerdown/tap och stäng av styrning/knuff/auto-hjälp tills nästa bana laddas. Förhindrar dubbla `complete()`.
- Uppdatera `hitArea`-radien (`r+24`) varje gång `_r` ändras, annars blir träffytan fel när bollen växt.
- Snöfälts-koll: markera fält `_eaten=true` direkt vid första överlapp så samma fält inte växer bollen varje frame.
- Begränsa bollens maxhastighet (clamp i x och y per tick) så den aldrig skjuts genom en vägg på en bildruta.
- Throttla studs-/växt-ljud så snabba händelser inte spammar audio.
- Auto-hjälp-timern nollställs vid varje interaktion (så hjälpen inte triggas mitt under en aktiv knuff/styrning).
- `destroy(ctx)`: `this._alive=false; ctx.ticker.remove(this._tick); gsap.killTweensOf(this._ball); gsap.killTweensOf(this._ball.scale); gsap.killTweensOf(this._root); this._phys?.destroy(); this._root?.destroy({children:true})`. `_phys.destroy()` rensar matter-världen och collision-lyssnaren; avregistrera bollens/backens pointer-lyssnare.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/snobollen/index.js`. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `PhysicsWorld`/`MATERIALS`/`Matter` (eller `Body`) från `lib/physics.js`, `createScene` från `lib/scene.js`, feedback-hjälpare, `COLORS, FONT, DESIGN_W, DESIGN_H` från theme, `randomFrom` från swedish.
2. `export default { id:'snobollen', titleSv:'Snöbollen', icon:'⛄', category:'fysik', input:'drag', ageRange:[3,5], bundle:'snobollen', voiceIntro:'Dra för att rulla snöbollen nerför backen!', ... }`.
3. `init(ctx)`: `this._alive=true`; skapa `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Lägg `createScene(winterTheme)` som första barn. Skapa `this._phys = new PhysicsWorld({ gravityY:1.1, walls:['floor','left','right'] })`. Skapa backens `Graphics` + statiska kropp (samma rotation/position). Läs `this._level` ur `ctx.progress.get().highestLevel`. Anropa `this._loadLevel(ctx, this._level)`.
4. `_loadLevel(ctx, level)`: rensa gamla snöfält/mål/snögubbe-delar; bygg snöfält + mål + mål-zon enligt nivå (jitter); skapa/återställ snöbollen vid start, `this._r=40`, nollställ hastighet, `this._resolving=false`, `this._toppled=0`, nollställ timers.
5. `_makeBall()`: container (glanscirkel + highlight + kant + dekor-prick), `phys.circle(215,250,40,{...})`, `phys.link(body, view, (v)=>v.scale.set(this._r/40))`, `hitArea=Circle(0,0,r+24)`, `eventMode='static'`. Koppla `pointerdown`/`globalpointermove`/`pointerup` (styrning) och `pointertap` (knuff). Lägg även backens stora `hitArea` för styrning var som helst.
6. Lägg ticker: `this._tick = (t)=>{ if(!this._alive) return; this._phys.update(t.deltaMS); this._gameTick(ctx, t) }`, `ctx.ticker.add(this._tick)`. I `_gameTick`: mjuk styrning mot `_fingerX`, snöfälts-överlapp→växt, mål-zon-koll, hastighets-clamp, idle/auto-hjälp-timers (allt med `_resolving`-vakt).
7. `phys.onCollision(pairs => …)`: matcha `label`-par `snowball`+`target` → väll (om stor/snabb nog) ljud+puff+floatText+`_toppled++`, annars `wiggle`.
8. Mål-zon nådd: om `_r ≥ stor-nog` → `_buildSnowman(ctx)`; annars auto-hjälp-växt först, sedan `_buildSnowman`. `_buildSnowman`: `_resolving=true`, fäst bollen som bas, pop:a in mage/huvud/hatt/näsa, ljud+voice, `bigCelebration`+`burst`, `ctx.progress.setLevel(_level+1)`, `ctx.progress.complete()`, `setCustom('snogubbar', …)`, `gsap.delayedCall(1.6, ()=> this._alive && this._loadLevel(ctx, this._level))`.
9. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
10. `destroy(ctx)`: städa enligt "Edge-cases & städning".
11. Registrera i `src/games/registry.js`: `import snobollen from './snobollen/index.js'` och lägg `snobollen` i `GAMES`-arrayen.
12. `npm run dev`, öppna biblioteket, spela: verifiera att bollen rullar nedför, styrs i sidled, knuffas vid tap, växer i snöfält, väller mål, bygger snögubbe + firar, att auto-hjälpen garanterar framgång när bollen är liten, hem-knapp, röst-repris, och att `highestLevel` ökar och kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera till biblioteket → välj "Snöbollen"). Canvas finns; inga uncaught errors/warnings i `browser_console_messages`.
- Vid mount är `voiceIntro` satt/uttalad (`"Dra för att rulla snöbollen nerför backen!"`).
- Snöbollen rullar nedför av sig själv (utan input ändras dess y/x nedåt-höger över tid — verifiera via exponerad teststate `window.__barnspel`/`_r`/bollposition eller snapshot-skillnad).
- **Styrning ändrar utfallet:** en `pointerdown`+`globalpointermove` åt vänster/höger flyttar bollens x i den riktningen (mätbart) — en av två kontroller.
- **Knuff ändrar utfallet:** ett `pointertap` på bollen ökar dess fart nedför (hastighet/position rör sig snabbare jämfört med utan tap) — andra kontrollen.
- **Växt:** när bollen passerar ett snöfält ökar `_r` (radie/skala växer); minst ett snöfält på nivå 0 ligger i rak väg så växt sker utan styrning.
- **Mål uppnått:** när bollen är stor nog och når snögubbe-zonen byggs en snögubbe, firande (konfetti i fxLayer) körs och `progress.complete()` anropas exakt en gång (ingen dubbeltrigg vid snabba upprepade tryck under `_resolving`).
- **No-fail/auto-hjälp:** en liten boll som når zonen leder ALDRIG till felljud/buzzer/"game over"; auto-hjälpen växer den och snögubben byggs ändå. En kort/utebliven input ger aldrig en bestraffning; efter idle-timern auto-knuffas bollen.
- **Ingen fail-state:** inga "game over"-element, ingen synlig poäng som sjunker; bollen lämnar aldrig banan (positionen håller sig inom väggarna efter studsar).
- **Progress sparas:** efter en avklarad runda är `highestLevel` ökat och `custom.snogubbar` finns; värdena kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- **Städning:** vid retur till biblioteket (hem-knapp) tas ticker-loopen bort, `_phys.destroy()` körs och inga tweens/timeouts fortsätter logga eller kasta fel.
