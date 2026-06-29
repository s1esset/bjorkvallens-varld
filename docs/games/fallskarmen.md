# Fallskärmen (`fallskarmen`)
> Zacke eller Lova svävar mjukt ner i en stor fallskärm medan vinden vill knuffa dem åt sidan — barnet drar vänster/höger för att styra rakt mot studsmattan och firas med en glad studs. Landningen är ALLTID mjuk, så känslan är ren "jag styrde hem dem!"-stolthet utan en enda krasch.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `fallskarmen` | Fallskärmen | 🪂 | fysik | drag | [3,5] | `fallskarmen` | "Styr fallskärmen till mattan!" |

## Mål & mekanik
Ett barn (Zacke eller Lova) hänger i en stor fallskärm högst upp och **glider sakta nedåt**. På marken står en **studsmatta/mål** 🎯. Barnet ska **styra i sidled** så fallskärmen landar mjukt på målet.

Två tydliga kontroller som ändrar utfallet (krav: ≥2):
1. **Sid-styrning (drag/håll):** håll fingret till vänster/höger om fallskärmen (eller dra åt sidan) → en kontinuerlig sidkraft skjuter den ditåt. Släpp → driften klingar av. Detta är "ratten".
2. **Tyngd-knapp (toggle):** en stor knapp ("Tung" 🪨 / "Lätt" 🪶) växlar mellan två lägen. **Tung** = faller snabbare nedåt OCH får mindre vinddrift (vinden biter mindre) — bra när det blåser hårt. **Lätt** = faller långsammare, mer tid att styra, men vinden knuffar mer. Barnet väljer strategi.

Den tredje "kraften barnet måste läsa": **vindbyar** (`setWind`-känsla via egen sidkraft) som växlar riktning med jämna mellanrum och visas tydligt med **lövpartiklar** 🍃 som blåser åt det hållet + en mjuk vind-pil/banner uppe. Barnet styr KONTRA vinden.

Kärnloop:
1. Fallskärmen släpps högst upp (y≈120) och glider nedåt med luftmotstånd-clamp (konstant, lugn sjunkfart).
2. Barnet håller/drar åt sidan för att styra; vinden knuffar emot; lövpartiklar visar vindriktningen.
3. När fallskärmen når marknivån (y≈ målets y) **landar den alltid mjukt**:
   - Mitt på målet → perfekt: studsmattan studsar barnet 1–2 gånger, jubel, `complete()`.
   - Bredvid målet → ändå mjuk landning på gräset + **mild om-cue** ("Nästan! En gång till?") och en liten auto-glid där barnet halkar in mot mitten av målet om det var nära, annars puffar gräset glatt och ny runda startar. **Aldrig krasch, aldrig game over.**

## Skärm-layout (1280x720)
GameHost ritar hem-/högtalar-knappar i headern — rita INGA egna. Allt nedan ligger i spelets `_root` (designkoordinater). Bakgrund = `createScene('sky', { ground:true, groundH:120 })` som FÖRSTA barn (mjuk blå himmel, sol, drivande moln, grön markremsa).

- **Luftrum (logiskt):** fallskärmen rör sig i x ∈ [120, 1160], y ∈ [120, 560]. Marknivå (landning) vid `GROUND_Y = 560` (markremsans topp ≈ y 600; barnets fötter når mattan vid 560).
- **Fallskärm + barn (`this._chute`, Container):** placeras start x≈640 (mitten), y=120.
  - Kupol: `Graphics` halvcirkel/kupol bredd ~180, ritad som `roundRect(-90,-70,180,90,40)` med rundad topp, fylld i randiga segment ur `PLAYFUL` (t.ex. 3 kilar i `COLORS.red`/`COLORS.yellow`/`COLORS.blue`) + mjuk underkant. Liten vit glansbåge upptill (`alpha 0.25`).
  - Linor: 4 tunna streck (`stroke({width:3, color:COLORS.inkSoft})`) från kupolens hörn ner till barnet.
  - Barn: emoji-Text (🧒 eller 👦/👧) fontSize 70, anchor 0.5, vid y≈+40 under kupolen. (Detta är **Zacke** eller **Lova** — välj per runda, säg namnet i röst.)
  - Mjuk skugga: en mörk ellips (`circle` skalad, `COLORS.shadow alpha 0.12`) som projiceras på marken under fallskärmen (följer x, växer när den närmar sig marken).
- **Mål / studsmatta (`this._target`):** på marken vid `GROUND_Y`, x = nivåberoende (t.ex. 800). Rita en studsmatta: `roundRect(-cx, -18, 2*cx, 36, 14)` i `COLORS.purple` med fjäder-streck + 🎯 emoji-Text (fontSize 64) ovanpå. **Målradie (träffmarginal)** `targetR` (halva mattans bredd), nivåberoende 150→90. En mjuk gul glödring (`circle stroke COLORS.yellow alpha 0.5`) markerar landningszonen.
- **Vind-banner (`this._windUi`):** uppe vid y≈90, x≈640: en liten pil 🍃 + text "Vinden blåser →" som pekar åt aktuell vindriktning; pilens längd/alpha skalar med vindstyrkan. Uppdateras vid varje byig växling.
- **Tyngd-knapp (`this._weightBtn`):** nere till vänster, x≈140, y≈640 (säkert avstånd från header). Stor rund knapp ≥120px diameter (träffyta ≥96px + hit-halo), visar 🪶 (Lätt, default) eller 🪨 (Tung). Tap växlar läge + ljud + pop.
- **Styr-zoner (osynliga):** hela luftrummet är drag/håll-yta. Visuell hint: två svaga pil-chevroner ◀ ▶ till vänster/höger om fallskärmen som tänds när barnet håller åt det hållet.

Marginaler: alla träffytor ≥96px med +24px osynlig hit-halo. Tyngd-knapp och styr-yta överlappar inte headern (allt under y≈110, knappen säkert nere).

## Interaktion
**Styrning (kontinuerlig, drag ELLER håll — egen pointer-logik, INTE DragController eftersom detta är en kontinuerlig kraft, inte ett snäpp-föremål):**
- Lägg en transparent `hitArea`-rektangel över luftrummet (eller gör `_root` `eventMode='static'`).
- `pointerdown` → `this._steer.active = true`, spara `this._steer.x = _root.toLocal(e.global).x`, nollställ idle-timer, ljud `tap`, tänd rätt chevron.
- `globalpointermove` (medan aktiv) → uppdatera `this._steer.x`. Styrriktning = tecknet av `(steerX − chute.x)`: finger till höger om fallskärmen → styr höger, vänster → vänster. (Alternativt: ren sida av skärmens mitt — men "relativt fallskärmen" känns mer direkt. Använd en liten dödzon ±20px så den inte vibrerar.)
- `pointerup`/`pointerupoutside` → `this._steer.active = false`, släck chevroner.
- **Tap-tap/enkel-tap-fallback (för de minsta):** ett enkelt tap på vänster/höger halva ger en kort styr-impuls åt det hållet (sätter `_steer.active` i ~0.5s mot den sidan via en liten timer) — så barn som inte kan hålla nere ändå kan putta. Båda lägena driver samma `_steerDir`.

**Tyngd-knapp:** `pointertap` på `_weightBtn` → `this._heavy = !this._heavy`, byt emoji 🪶/🪨, `pop(btn)`, ljud `pling`, `floatText(fxLayer, btn.x, btn.y-60, this._heavy ? 'Tung!' : 'Lätt!')`. Påverkar fysikparametrar direkt (se nedan).

Hit-areor: styr-yta = hela luftrummet (stort). Tyngd-knapp r≈70 (osynlig halo runt visuell r≈60). Inga små klickytor.

## Fysik & kalibrering
**Egen, enkel och exit-säker integrator i ticker** (matter.js behövs inte — rörelsen är en lugn glidning, inte studs/stapling). Kör i `this._tick = (ticker) => this._update(ctx, ticker)`, normalisera `const dt = Math.min(2, ticker.deltaMS / 16.67)` (clamp mot lagg-hopp).

Tillstånd på fallskärmen: `x, y, vx` (vy är konstant sjunkfart, inte ackumulerad — luftmotstånd-clamp gör fallet lugnt).

Per frame (alla värden i px och px/frame @60fps):
```
// 1. Konstant nedåt-glid (luftmotstånd-clamp ⇒ ingen acceleration, lugnt fall)
const sink = this._heavy ? 2.4 : 1.5            // px/frame; Tung faller snabbare
chute.y += sink * dt

// 2. Sidkrafter: styrning + vind, sedan luftmotstånd (damp)
const steerForce = this._steerDir * 0.45        // -1/0/+1 * styrka
const windFactor = this._heavy ? 0.45 : 1.0     // Tung biter mindre mot vinden
vx += (steerForce + this._wind * windFactor) * dt
vx *= 0.92                                       // luftmotstånd-damp (mjuk inbromsning)
vx = clamp(vx, -6, 6)                            // maxfart i sidled
chute.x += vx * dt
chute.x = clamp(chute.x, 140, 1140)              // mjuka "väggar" (skärmkant), ingen studs-straff
```
- `this._steerDir` ∈ {−1, 0, +1} sätts av styrlogiken (med dödzon).
- `this._wind` = aktuell vindacceleration i px/frame² i sidled (positiv = höger). Byter med jämna mellanrum (se Progression). T.ex. ±0.12 (svag) → ±0.30 (stark). Tung-läget dämpar den med `windFactor`.
- **Lövpartiklar (vind-visualisering, egen integrator, exit-säker):** spawna 🍃-emoji (eller små gröna `Graphics`-blad) i `ctx.fxLayer` med en hastighet i vindens riktning; driv dem i SAMMA ticker (`leaf.x += windDir*speed*dt; leaf.y += sway`), ta bort när de lämnar skärmen (`if(leaf.x<−40||leaf.x>1320){ if(!leaf.destroyed) leaf.destroy() }`). ALDRIG GSAP direkt på dem; ELLER använd `puff`/`floatText`-mönstret. Spawna ~1 löv var 0.4s när det blåser; tätare/snabbare när vinden är stark → barnet ser hur hårt det blåser.

**Landningskoll:** när `chute.y >= GROUND_Y` och inte `_resolving`:
- `const dx = Math.abs(chute.x − target.x)`.
- `dx <= targetR` → **träff** (mjuk studs + firande, se belöning).
- `dx <= targetR*1.8` (nära men bredvid) → **auto-hjälp:** glid fallskärmen mjukt (gsap på en `{}`-proxy → kopiera till `chute.x` om `!chute.destroyed`) mot `target.x` över ~0.5s, sedan räkna som träff. Mild röst "Nästan! Jag hjälper till."
- annars (långt bort) → **mjuk gräslandning:** `puff` i gräset, `wiggle(chute)`, glad neutral `soft`-ljud, röst "Hoppsan! Vi provar igen!", och efter ~1s starta om samma nivå (ingen straff, ingen nivåsänkning).

**Kalibrering / varför dessa tal:** detta är en egen integrator (inte AimLauncher, ingen pricklinje), så CLAUDE.md:s preview-formler gäller inte här — men vi följer samma fixed-step-anda: allt skalas med `dt = deltaMS/16.67` så farten är ramhastighets-oberoende, och `vx`-dampen 0.92 ger ~halverad sidofart på ~8 frames (mjuk, förutsägbar respons). Sink-värdena (1.5/2.4) ger ~3–5s falltid från y120→560 vilket räcker för att hinna styra. Vinden i px/frame² adderas före dampen, så jämviktsdriften ≈ `wind/(1−0.92) = wind*12.5` px/frame innan clamp — välj wind så jämviktsfarten (svag ≈1.5, stark ≈3.75 px/frame) ALLTID går att övervinna med `steerForce 0.45` (jämvikt-styr ≈ 5.6 px/frame), annars blir vinden ostyrbar. Tung-läget halverar vindjämvikten → tydlig nytta vid stark vind.

## Återkoppling & belöning
Varje pekning < 100ms:
- Styr-start: `audio.sfx('tap')` + chevron tänds + fallskärmen lutar mjukt i styrriktningen (`gsap.to(chute, {rotation: dir*0.15})`, dödas i destroy).
- Tyngd-toggle: `audio.sfx('pling')` + `pop(btn)` + `floatText('Tung!'/'Lätt!')` + barnet/fallskärmen ändrar visuellt fall (Tung = lite ihopdragen kupol).
- Vindbyte: mjukt `whoosh`-ljud + vind-banner pop:ar + en svärm lövpartiklar släpps åt nya hållet.
- **Träff (landning på målet):** `audio.sfx('correct')` direkt + studsmattan trycks ihop och fjädrar (`pop` på mattan), fallskärmen studsar upp 1–2 gånger (liten gsap-hoppsekvens på en proxy), sedan `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})` + `burst(fxLayer, target.x, GROUND_Y, {count:16})`. Kupolen veckar ihop sig glatt. `ctx.progress.complete()`.
- **Bredvid / auto-hjälp:** `soft`-ljud + `voice.say('Nästan! Jag hjälper till.')` + liten `sparkle` längs glidvägen — sedan firas det som en träff (barnet lyckas ALLTID).
- **Långt bredvid:** `soft` + `wiggle(chute)` + `puff` i gräset + `voice.say('Hoppsan! Vi provar igen!')` — mjuk omstart, INGET straff.
- **Idle ~6s** (fallskärmen glider men barnet rör inget på 6s): `voice.replayLast()` (eller `voice.say(this.voiceIntro)`) + chevronerna blinkar en gång som vink + vind-banner pulsar.

Använda sfx: `tap, pling, whoosh, soft, correct, celebrate`. Röst: voiceIntro, `randomFrom(PRAISE)`, 'Nästan! Jag hjälper till.', 'Hoppsan! Vi provar igen!', samt namn-intro ("Hjälp Zacke!"/"Hjälp Lova!").

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init; styr vindstyrka, vind-bytestakt och målets storlek/läge.
- Banor (cykliska, oändlig lek):
  - **Nivå 0–1:** svag vind (±0.12), byter sällan (~6s), stort mål (`targetR=150`), mål nära mitten (x≈700). Lär ut styrningen.
  - **Nivå 2–3:** medelvind (±0.20), byter ~4.5s, `targetR=120`, mål längre ut (x≈840 eller 460, slumpat sida).
  - **Nivå 4–5:** stark vind (±0.28), byter ~3.5s, `targetR=100`, mål nära kanten (x≈980/300). Tung-knappen blir tydligt värdefull.
  - **Nivå 6+:** byig (±0.30, kan byta riktning mitt i fallet ~3s), `targetR=90` (aldrig under 90 px ⇒ träffyta ≥180px), mål-x slumpas. Därefter upprepas mönstren med jitter (±30px mål-x via `Math.random`/`randomFrom`).
- Efter `complete()`: `ctx.progress.setLevel(this._level + 1)`, vänta ~1.5s (`gsap.delayedCall`, kollar `_alive`), `_loadLevel(ctx, ++this._level)` återanvänder samma noder (flytta fallskärm till start y120 + slumpad x, ny målposition/-storlek, nya vindparametrar, `_resolving=false`). Oändligt.
- `setCustom('landningar', n)` räknar mjuka landningar (frivilligt, växer aldrig nedåt). Ingen synlig poäng, ingen timer.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics` + `scene.js`-bakgrund. Inga externa fil-/ljud-/font-tillgångar.
- Emoji: 🪂 (brickikon), 🧒/👦/👧 (Zacke/Lova i selen), 🎯 (mål), 🍃 (lövpartiklar/vind), 🪶/🪨 (tyngd-knapp), valfri ⭐ i firandet.
- Graphics: fallskärmskupol (randiga kilar + glansbåge), linor (streck), studsmatta (`roundRect` + fjäder-streck), målets glödring (`circle stroke`), markskugga (ellips alpha), chevron-pilar, vind-banner-pil, tyngd-knappens runda platta (glansig `circle` + stroke).
- Färger ur `theme.js`: kupol `COLORS.red/yellow/blue`, mål `COLORS.purple`, glödring `COLORS.yellow`, knapp `COLORS.teal`, lövblad `COLORS.green`. Partiklar/firande via `PLAYFUL`.

## Återanvänd dessa
- `lib/scene.js`: `createScene('sky', {...})` som första barn.
- `lib/feedback.js`: `bounceIn`, `pop`, `wiggle`, `puff`, `sparkle`, `burst`, `bigCelebration`, `floatText`, `breathe` (idle-puls på chevron). Alla exit-säkra.
- `lib/theme.js`: `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`, `DESIGN_W/H`, `CHARACTERS` (Zacke/Lova).
- `lib/swedish.js`: `randomFrom` (välj barn, mål-sida, beröm), `shuffle`.
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast/cancel`.
- `ctx.progress`: `get`, `setLevel`, `complete`, `setCustom`.
- `ctx.ticker` (egen integrator-loop, läs `deltaMS`), `ctx.fxLayer` (löv/konfetti), `gsap` (lutning, auto-glid, studs — alltid på `{}`-proxy eller på objekt som dödas i destroy).
- INTE `DragController` (kontinuerlig styrkraft, ej snäpp-föremål) och INTE `AimLauncher`/`predictTrajectory` (ingen sikt-pricklinje här).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`onComplete`/auto-glid-callbacks samt ticker-loopen kollar `if (!this._alive) return` tidigt.
- **`_resolving`-skydd:** sätt `this._resolving = true` så fort en landning registreras (träff ELLER auto-hjälp ELLER omstart) → ticker-fysik och pointer-styrning ignoreras tills nästa runda laddas. Hindrar att `complete()` triggas två gånger eller att en landning räknas dubbelt.
- Clamp `chute.x` till [140,1140] varje frame så fallskärmen aldrig glider ut ur skärmen (mjuk "vägg", ingen studs-straff, ingen krasch).
- Lövpartiklar: ta bort när de lämnar skärmen och i destroy; spawn-räknaren stoppas när `!_alive`/`_resolving`.
- Idle-timer nollställs vid varje pointerdown/move och varje tyngd-toggle.
- Vind-byt-timern (en ackumulator i ticker, ej `setInterval`) nollställs/stoppas i destroy via `_alive`-flaggan.
- `destroy(ctx)`: `this._alive = false`; `ctx.ticker.remove(this._tick)`; avregistrera pointer-lyssnare (styr-yta + knapp); `gsap.killTweensOf(this._chute)`, `gsap.killTweensOf(this._chute?.scale)`, döda lutnings-/studs-/idle-tweens; `this._root?.destroy({ children:true })`. Eventuella kvarvarande lövpartiklar i `fxLayer` är exit-säkra (de dör på sin egen `destroyed`-koll) men rensa gärna en egen `this._leaves`-lista.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/fallskarmen/index.js`. Importera `Container, Graphics, Text, Rectangle` från `pixi.js`, `gsap`, `createScene` från `lib/scene.js`, feedback-hjälpare från `lib/feedback.js`, `COLORS, PLAYFUL, FONT, PRAISE` från `lib/theme.js`, `randomFrom` från `lib/swedish.js`.
2. `export default { id:'fallskarmen', titleSv:'Fallskärmen', icon:'🪂', category:'fysik', input:'drag', ageRange:[3,5], bundle:'fallskarmen', voiceIntro:'Styr fallskärmen till mattan!', ... }`.
3. `init(ctx)`: `this._alive = true`; `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Lägg `createScene('sky',{ground:true,groundH:120})` som första barn. Bygg `_makeChute()` (kupol + linor + barn + skugga), `_makeTarget()`, vind-banner, tyngd-knapp, chevroner. Sätt styr-state (`this._steer={active:false,x:0}`, `this._steerDir=0`, `this._heavy=false`, `this._wind=0`, `this._windTimer=0`, `this._idle=0`). Läs `this._level` och `_loadLevel(ctx, this._level)`. Registrera pointer-lyssnare för styrning + tap-fallback + tyngd-knapp.
4. `_loadLevel(ctx, level)`: sätt vindstyrka/bytestakt/`targetR`/mål-x enligt nivå, placera mål, nollställ fallskärm till start (x slumpad nära mitten, y=120, vx=0), `_resolving=false`, starta första vindbyn (`_setWind(±styrka)` + lövsvärm), `bounceIn(this._chute)`.
5. Lägg integratorn: `this._tick = (ticker)=> this._update(ctx, ticker)`, `ctx.ticker.add(this._tick)`. I `_update`: om `!_alive||_resolving` return; integrera sink/vx/x enligt **Fysik & kalibrering**, uppdatera skugga + kupol-lutning, ticka vind-byt-timern (växla `_wind` + spawna lövsvärm + uppdatera banner när den löper ut), spawna driv-löv löpande, driv befintliga löv + städa dem, tick idle-timer (≥6s → om-cue), och kör landningskoll vid `chute.y>=GROUND_Y`.
6. Skriv `_land(ctx, dx)`: sätt `_resolving=true`, välj träff / auto-hjälp / mjuk-omstart enligt reglerna; vid (auto)träff → studs + firande + `setLevel` + `complete` + `gsap.delayedCall(1.5, ()=> _alive && _loadLevel(ctx, ++this._level))`; vid mjuk omstart → puff/wiggle + `gsap.delayedCall(1.0, ()=> _alive && _loadLevel(ctx, this._level))`.
7. `mount(ctx)`: `const namn = randomFrom(['Zacke','Lova']); this._kidName = namn; ctx.services.voice.say(this.voiceIntro)` (och ev. `'Hjälp '+namn+'!'`).
8. `destroy(ctx)`: enligt "Edge-cases & städning".
9. Registrera i `src/games/registry.js`: `import fallskarmen from './fallskarmen/index.js'` och lägg `fallskarmen` i `GAMES`-arrayen.
10. `npm run build` måste passera. Sedan `npm run dev`, öppna biblioteket, spela: verifiera styrning, vindbyar + löv, tyngd-toggle, mjuk landning + firande på målet, auto-hjälp bredvid, mjuk omstart långt bort, hem-knapp, röst-repris, och att `highestLevel` ökar och kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera till biblioteket → välj "Fallskärmen"). Canvas finns; inga uncaught errors/warnings i `browser_console_messages`.
- Vid mount är `voiceIntro` satt och en svensk röstinstruktion spelas (`"Styr fallskärmen till mattan!"`).
- Fallskärmen glider nedåt av sig själv över tid (chute.y ökar i ticker utan input) — verifierbart via exponerat teststate (t.ex. `window.__barnspel`/`_chute.y`) eller snapshot-skillnad.
- Styrning fungerar: en `pointerdown`+`globalpointermove` åt höger om fallskärmen ger positiv `vx`/ökande `chute.x`; åt vänster ger negativ. Släpp → driften klingar av (vx → 0).
- Tyngd-knappen växlar läge: tap byter 🪶↔🪨 och ändrar sink-/vindfaktor (Tung faller snabbare, mindre vinddrift) — verifierbart via state.
- Vinden byts över tid (state `_wind` ändras) och lövpartiklar spawnas i `fxLayer`; vinden är alltid övervinnbar med styrning (fallskärmen kan nå målet på alla nivåer).
- Landning på målet (`dx<=targetR`) triggar firande (konfetti i fxLayer) och `progress.complete()` anropas **exakt en gång** (ingen dubbeltrigg via `_resolving` vid snabba upprepade landningar/tryck).
- Ingen fail-state: en landning bredvid målet ger ALDRIG felljud/buzzer/rött/"game over" — istället mjuk auto-hjälp (nära) eller glad omstart (långt bort); barnet lyckas alltid till slut.
- Fallskärmen lämnar aldrig skärmen (x hålls i [140,1140] efter styrning/vind).
- Progress sparas: efter en avklarad runda är `highestLevel` ökat och kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- Städning: vid retur till biblioteket (hem-knapp) tas ticker-loopen bort och inga tweens/timeouts/lövpartiklar fortsätter logga eller kasta fel (`destroy` lämnar inga kvarvarande tickers/tweens).
</content>
</invoke>
