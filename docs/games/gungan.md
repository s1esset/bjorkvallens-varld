# Gungan (`gungan`)
> Lova sitter på en gunga och barnet trycker i takt med gungandet för att pumpa henne högre och högre — den underbara rytmkänslan av att "få fart själv", och till slut nuddar hon fågeln högst upp. Hon ramlar aldrig av; varje tryck känns som magi.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `gungan` | Gungan | 🐧 | fysik | tap | [2,4] | `gungan` | "Tryck i takt så gungar Lova högre!" |

(`icon` 🐧 matchar PLAN-2-raden — pingvin-vännen som hejar; figuren på gungan ÄR Lova, ritad programmatiskt.)

## Mål & mekanik
En **pendel-gunga**: Lova sitter på en gunga som hänger i en ställning. Gungan svänger fram och tillbaka som en pendel. Barnet **trycker (pumpar)** för att ge gungan energi — trycker man **i takt** (när hon är nära ytterläget och vänder) växer utslaget snabbt (resonans). Trycker man i "fel" fas händer **inget tråkigt** — gungan tappar aldrig fart av ett tryck, den växer bara långsammare.

Kärnloop:
1. Lova gungar sakta (litet utslag). Högt upp på ena sidan, vid gungans toppläge, sitter ett **mål** (🐦 fågel / 🍎 äpple) på en gren.
2. Barnet trycker var som helst på scenen i takt med gungan. Varje tryck ger en **knuff** vars styrka beror på **timingen** (fas-kvalitet `q`): nära ytterläget → full knuff; nere i botten → liten knuff (men aldrig negativ).
3. Utslaget (amplituden) växer för varje välplacerat tryck tills Lova når **målhöjden** och **nuddar fågeln/äpplet** → fågeln pippar och flaxar / äpplet plockas → firande + `ctx.progress.complete()`.
4. **Faller ALDRIG av.** Slutar barnet trycka bromsar gungan mjukt (lätt dämpning) men Lova sitter kvar. Efter en stunds passivitet hjälper en "mild medvind" till och pumpar automatiskt så hon till sist alltid når målet.

**Två tydliga kontroller som ändrar utfallet (krav ≥2):**
- **(1) TIMING av trycken** — fas-kvaliteten `q` avgör hur mycket varje tryck höjer gungan. Bra rytm = snabb stigning; slumpmässiga tryck = långsam (men garanterad) stigning.
- **(2) "Starkare knuff"-läge** — en stor toggle-knapp (💪) som dubblar knuff-styrkan (lugnt läge vs starkt läge). Barnet ser direkt att gungan tar i mer. (Valfri tredje: en **knuffa-drag**/svep ger en extra-stor knuff proportionell mot svepets längd — se Interaktion.)

Ingen poäng, ingen klocka, inget game-over. Fel fas = ofarligt; för svag pump = mjuk om-cue + auto-hjälp.

## Skärm-layout (1280x720)
Designkoordinater 1280×720. GameHost ritar headern (hem-/repetera-knapp) överst — rita INGA egna. Allt nedan ligger i spelets `_root`.

- **Bakgrund (FÖRSTA barn):** `createScene('meadow', { width: ctx.width, height: ctx.height })` → grön äng + himmel + sol + moln. `eventMode='none'`. Läggs först i `_root`.
- **Gungställning (A-ram):** brun ställning ritad med Pixi Graphics (`COLORS.brown` 0x8a5a3b, kant 0x6f4428).
  - **Toppbalk (pivå-höjd):** horisontell rundad balk, `roundRect(430, 138, 420, 26, 12)`. **Pivåpunkt (upphängning) = (640, 150).**
  - **Vänster benpar:** tjocka streck/rundade rektanglar från (470,150)→(360,612) och (490,150)→(560,612) (lätt A-form). **Höger benpar** speglat: (810,150)→(920,612) och (790,150)→(720,612). Bredd ~22px, rundade ändar.
  - **Markskugga** under ställningen: mörk ellips alpha 0.12.
- **Gungan (pendel-container `_swing`):** en Container med origin i **pivåpunkten (640,150)**, `rotation = theta`. Barn ritas hängande rakt ned (lokalt x=0):
  - **Två rep:** två tunna rundade rektanglar/streck från (−34, 0) och (+34, 0) ned till y=`L` (tan/grått 0x7a6657, bredd 8).
  - **Sits:** en rundad planka `roundRect(−54, L−10, 108, 20, 8)` i `COLORS.brown`.
  - **Lova (programmatisk, sittande):** placeras ovanpå sitsen, lokalt centrerad x=0, y≈`L−20`:
    - Ben: två rundade rektanglar nedåt-framåt (byxa `COLORS.blue`), skor 0x4a3526.
    - Kropp/klänning: rundad triangel/`roundRect` i `COLORS.pink` (eller `COLORS.purple`), bredd ~70.
    - Armar: två streck (skinn 0xffd9b3) som "håller i repen".
    - Huvud: cirkel r=30 hudton 0xffd9b3; hår 0x8a5a3b med två tofsar (små cirklar); glada prickögon + leende (liten båge). Valfritt en 😊 som `Text` istället för ritat ansikte.
  - Hela `_swing` roterar kring (640,150) → Lova följer pendelbanan automatiskt (ingen manuell trig behövs för rendering).
- **Mål (🐦 / 🍎):** `Text` emoji fontSize 90 på en liten gren (`roundRect` brun) i **toppläget på vänster sida**, placerad vid bob-positionen för `theta = −THETA_GOAL` (se Fysik). Runt målet en mjuk gul glödring (`circle` stroke `COLORS.yellow` alpha 0.4) som pulsar svagt (`breathe`) för att locka.
- **"Starkare knuff"-toggle:** stor knapp nere till vänster, ~(150, 600), diameter **130px** (träffyta ≥96 + halo), `circle` `COLORS.orange`/grå beroende på läge, emoji 💪 ovanpå. Visar tydligt av/på (skala + glöd när på).
- **Bågspår (valfritt, mjukt):** ett tunt `Graphics` som ritar en svag prickad båge längs gungans väg så barnet ser "hur högt" — fyller i mot målet ju högre hon når. Dekorativt, `eventMode='none'`.
- **Pump-yta:** en osynlig heltäckande `hitArea`-rektangel (0,90 → 1280,720) `eventMode='static'` som fångar tryck var som helst (utom på toggle-knappen).

Marginaler: minst 24px mellan knappar; ingen träffyta under 96px.

## Interaktion
Bara **tryck (tap)** som huvudgest (+ valfri knuffa-drag). Ingen `DragController` behövs.

- **Pumpa (tap):** `pointertap`/`pointerdown` på pump-ytan → kör `_pump(ctx)`. Omedelbar respons <100ms: liten skala-pop på Lova + ljud + `sparkle`. `_pump` injicerar energi i pendeln (se Fysik) skalad med fas-kvaliteten `q`.
- **"Starkare knuff"-toggle:** `pointertap` på 💪-knappen → `this._strong = !this._strong`; knappen poppar (`pop`) och byter färg/glöd; ljud `pling`; röst första gången `voice.say('Nu knuffar vi starkare!')`. Påverkar `_pump`-styrkan (×1.8). Detta är en **spelkontroll, inte en vuxen-inställning** → ingen föräldragrind.
- **Valfri knuffa-drag (rikare kontroll):** lyssna på `pointerdown`→`globalpointermove`→`pointerup` på pump-ytan; om släppet sker efter ett **svep > 60px** ges en **extra-stor knuff** vars styrka skalas av svepets längd (klampad). Ett kort svep/tap räknas som vanlig pump (tap-fallback). Så de minsta klarar sig med rena tryck; den som vill kan "skjuta på" med ett svep.
- **Inget exakt sikte krävs.** Tryck var som helst räknas. Riktningen på knuffen bestäms av pendelns egen fas, inte av var fingret är → omöjligt att "missa".
- **Resolving-skydd:** när Lova nått målet sätts `this._resolving = true`; alla pump-/toggle-callbacks returnerar tidigt tills nästa nivå laddas (inget dubbel-firande).

## Fysik & kalibrering
**Egen pendel-integrator (rekommenderad framför matter.js revolute-constraint)** — ger exakt, förlåtande kontroll över resonans-fönstret och energi-injektionen, är deterministisk och trivialt exit-säker (helt ticker-driven, INGEN GSAP på pendel-objektet). (matter.js-pendel via `PhysicsWorld` + en pinned `Constraint` går också men är överdrivet för en enskild pendel och svårare att göra "förlåtande".)

**Tillstånd:** `theta` (rad, 0 = rakt ned), `omega` (rad/s vinkelhastighet). Konstanter:
```
const OMEGA0 = 2.5     // rad/s naturlig vinkelfrekvens → period 2π/OMEGA0 ≈ 2.5 s (lugn, lärbar rytm)
const DAMP   = 0.22    // 1/s lätt dämpning → bromsar mjukt utan pumpning (skäl att fortsätta), faller aldrig av
const THETA_MAX  = 1.45  // ~83°, hård spärr — går ALDRIG runt/över toppen
let   THETA_GOAL = 1.00  // målutslag (sätts per nivå, se Progression)
let   L = 330          // replängd i px (sätts per nivå)
```
**Integration per tick** (`this._tick = (t)=> this._update(ctx, t)`), läs `ctx.ticker.deltaMS`:
```
let dt = Math.min(ticker.deltaMS / 1000, 0.05)   // klampa flik-byte-hopp
const SUB = 2, h = dt / SUB                        // 2 delsteg för stabilitet
for (let i = 0; i < SUB; i++) {
  const alpha = -(OMEGA0 * OMEGA0) * Math.sin(theta) - DAMP * omega
  omega += alpha * h
  theta += omega * h
}
// hård men mjuk spärr så hon aldrig går över toppen:
if (Math.abs(theta) > THETA_MAX) { theta = Math.sign(theta) * THETA_MAX; omega *= -0.4 }
this._swing.rotation = theta                       // rendering: container roterar kring pivån
```
**Pump (energi-injektion) i `_pump()`:**
```
// knuff-riktning = pendelns kommande rörelse: i farten → med farten; i ytterläget → in mot mitten
const dir = Math.abs(omega) > 0.15 ? Math.sign(omega) : -Math.sign(theta || 1)
// fas-kvalitet: FÖRLÅTANDE — nära ytterläget q→1 (bästa fas), i botten q→0.35 (golv → alltid lite framåt)
const q = clamp(Math.abs(theta) / 0.5, 0.35, 1)
const base = this._strong ? 0.9 : 0.5             // "starkare knuff"-läge ×~1.8
omega += dir * q * base                            // adderar ALLTID energi i samma riktning som rörelsen → ΔE ≥ 0
omega = clamp(omega, -3.2, 3.2)                    // tak så hon aldrig skjuts över THETA_MAX
```
Detta gör att **timing styr stigningen** (golvet 0.35 garanterar framgång även vid kaostryck — no-fail) och att **fel fas "gör inget illa"** (knuffen är alltid med rörelsen, aldrig bromsande). Knuffa-drag-svepet skalar `base` med svepets längd (klampat ≤ 1.6).

**Mål-/nuddningskoll** (varje frame, om ej `_resolving`): målet sitter på vänster sida (`theta < 0`). Trigga catch när `theta <= -THETA_GOAL` (Lova är vid målets höjd på rätt sida). Alternativt geometriskt: räkna bob-världspos `bx = pivot.x + L*Math.sin(theta)`, `by = pivot.y + L*Math.cos(theta)` och trigga när `Math.hypot(bx-birdX, by-birdY) < 70`. Placera målet vid `theta = -THETA_GOAL`: `birdX = 640 + L*Math.sin(-THETA_GOAL)`, `birdY = 150 + L*Math.cos(THETA_GOAL)` (+ liten offset uppåt så hon precis når).

**Kalibreringsnot:** ingen `AimLauncher`/`predictTrajectory`/`setWind` används, så CLAUDE.md:s preview-kalibrering (previewGravity/previewDamp/vind) är inte tillämplig här. Pendel-rytmen styrs enbart av `OMEGA0` (period ≈ 2.5 s) och hålls **konstant oberoende av `L`** (längre rep på högre nivå = visuellt längre men samma takt → barnet behöver inte lära om rytmen). Allt är px/sekund i en egen, ticker-driven integrator.

## Återkoppling & belöning
Per tryck (<100ms):
- **Ljud:** `audio.sfx('whoosh')` vid bra fas (q ≥ 0.7), annars `audio.sfx('soft')` vid svag fas (q < 0.7). Toggle: `audio.sfx('pling')`.
- **Bild:** liten `pop(this._lova)` (eller `pop(_swing)`-puls), `sparkle(ctx.fxLayer, bx, by)` vid Lovas position. Vid riktigt bra fas en `floatText(ctx.fxLayer, bx, by-60, '⭐')` eller `'Höögre!'`. Bågspåret fylls på lite mot målet.
- **Röst:** sparsamt (inte tjattra): vid första lyckade pumpen `voice.say('Just så — tryck i takt!')`; annars tyst.
- **Fågeln/äpplet "lockar":** glödringen `breathe`-pulsar; när Lova närmar sig (|theta| > 0.7·THETA_GOAL) pippar fågeln lätt (`audio.sfx('reveal')` throttlat) / äpplet glittrar (`sparkle`).
- **Fel/svag fas finns INTE som straff.** Ett tryck i botten ger bara en liten knuff + mjukt `soft`-ljud + pytte-`sparkle`. Aldrig buzzer, rött, eller tappad fart.

**Mål nått (catch):** sätt `this._resolving = true` →
- `audio.sfx('correct')` direkt + `audio.sfx('celebrate')`.
- Fågeln flaxar iväg / äpplet hoppar i Lovas hand (`pop` + `floatText('🐦'/'🍎')`).
- `voice.say(randomFrom(PRAISE))` (t.ex. "Hurra!").
- `bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })` + `burst(ctx.fxLayer, bx, by, { count: 16 })`.
- `ctx.progress.complete()` (delat firande + klistermärke) **exakt en gång**.
- `ctx.progress.setLevel(this._level + 1)` och `setCustom('gungor', n+1)`.
- Efter ~1.6s (`gsap.delayedCall`, vakta `this._alive`) → `_loadLevel(ctx, ++this._level)` (nytt mål, längre rep). Oändlig lek.

**Idle-om-cue & auto-hjälp (no-fail-garanti):**
- Räkna `this._sinceTap` i ticker (sekunder sedan senaste pump). Nollställ vid varje pump/toggle.
- **~6s idle, ej nått mål:** `voice.say(this.voiceIntro)` (eller `replayLast()`) + `wiggle`/`pop` på 💪-knappen och en `sparkle` vid Lova som vink.
- **~5s utan tillräcklig stigning:** en **mild medvind** börjar auto-pumpa: i `_update`, om `_sinceTap > 5` lägg en liten auto-knuff i rätt fas varje gång `omega` passerar noll (samma `_pump`-logik med `base=0.35`), med mjukt `soft`-ljud och liten `sparkle` → gungan stiger sakta av sig själv.
- **Efter ~12s / flera cykler utan mål:** öka auto-knuffen (`base=0.7`) så målet garanterat nås inom ett par svängningar → catch firas precis som om barnet gjort det. **Alltid framgång.**

Använda sfx: `whoosh, soft, pling, reveal, correct, celebrate`. Voice: `voiceIntro`, 'Just så — tryck i takt!', 'Nu knuffar vi starkare!', `PRAISE`.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init.
- Svårighet = **målutslag `THETA_GOAL` + replängd `L`** (rytmen `OMEGA0` hålls konstant):
  - **Nivå 0–1:** `L=300`, `THETA_GOAL=0.85` (~49°) — mål nära, lär ut takten. Mål = 🐦 lågt.
  - **Nivå 2–3:** `L=330`, `THETA_GOAL=1.00` (~57°).
  - **Nivå 4–5:** `L=360`, `THETA_GOAL=1.15` (~66°) — längre rep, högre mål.
  - **Nivå 6+:** `L=390`, `THETA_GOAL=1.30` (~74°, < THETA_MAX). Därefter upprepas/varieras med liten jitter (`randomFrom`); målet kan byta sida (spegla `theta`-tecknet) och växla 🐦/🍎/🎈 för variation.
- Efter `complete()`: `setLevel(this._level+1)`, vänta ~1.6s, `_loadLevel(ctx, this._level)` återanvänder samma noder — bygg om `_swing`-repens längd till nytt `L`, flytta målet, nollställ `theta` till ett litet startutslag (≈0.25 rad) och `omega=0`, `_resolving=false`. Oändligt.
- `setCustom('gungor', n)` räknar totalt antal nådda mål (frivilligt, sjunker aldrig). Ingen synlig poäng.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics` + `createScene`. Inga externa bild-/ljud-/fontfiler.
- **Emoji (Text):** 🐦 / 🍎 / 🎈 (mål), valfritt 😊 (Lovas ansikte), ⭐ (`floatText` vid bra fas), 💪 (toggle-knapp).
- **Graphics:** ängs-bakgrund via `createScene('meadow')`; A-ram (rundade rektanglar/streck, brun + kant); rep (tunna streck); sits (roundRect); Lova (cirkel-huvud + hår-tofsar + klännings-form + ben/armar/skor); målets gren + gul glödring (circle stroke); 💪-togglens cirkel + glöd; valfritt prickat bågspår; markskuggor (ellips alpha).
- **Ljud:** `audio.sfx(...)`. **Röst:** `voice.say(...)`. Inget eget ljud-/asset-system.

## Återanvänd dessa
- `lib/scene.js`: `createScene('meadow', { width, height })` — bakgrund som FÖRSTA barn.
- `lib/feedback.js`: `pop`, `wiggle`, `sparkle`, `floatText`, `burst`, `bigCelebration`, `breathe` (glödring/lock-puls). Alla exit-säkra.
- `lib/theme.js`: `COLORS` (brown, pink, purple, blue, yellow, orange), `PLAYFUL`, `PRAISE`, `FONT`, `DESIGN_W/H`.
- `lib/swedish.js`: `randomFrom` (mål-/sido-variation, jitter), `clamp` om den finns (annars egen liten `clamp`).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast/cancel`.
- `ctx.progress`: `get`, `setLevel`, `complete`, `setCustom`.
- `ctx.ticker` (pendel-integratorn + idle/auto-hjälp-timers), `ctx.fxLayer` (gnistror/konfetti), `gsap` ENDAST för knappar/emoji/firande-tweens — **ALDRIG på `_swing`/pendeln** (den drivs av tickern).
- INTE `DragController`, INTE `AimLauncher`/`predictTrajectory` (egen pendel-integrator passar bättre).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/auto-hjälp-callbacks och hela `_update` returnerar tidigt vid `!this._alive`.
- **Resolving-skydd:** `this._resolving = true` vid catch → pump/toggle/auto-hjälp ignoreras tills nästa nivå laddas → `complete()` kan bara triggas en gång (även vid snabba dubbeltryck).
- **Amplitud-spärr:** `THETA_MAX`-klampen + `omega`-klampen garanterar att Lova aldrig "går runt" eller skjuts av — pendeln är alltid väluppfostrad.
- **Pendeln drivs ENBART av tickern.** Sätt aldrig en GSAP-tween på `_swing.rotation`/`theta` (skulle krocka med integratorn och kunna skriva på ett förstört objekt vid exit). Partiklar/firande sker via `ctx.fxLayer` med de exit-säkra `feedback`-hjälparna.
- **Idle-/auto-hjälp-timern** nollställs vid varje barn-interaktion så hjälpen aldrig "tar över" mitt i barnets egen rytm.
- Throttla `soft`/`reveal`-ljud (t.ex. max var ~150ms) så snabba tryck inte spammar audio.
- `destroy(ctx)`: `this._alive = false`; `ctx.ticker.remove(this._tick)`; avregistrera pump-ytans och togglens pekarlyssnare; `gsap.killTweensOf(...)` för Lova/knapp/mål/glödring och alla firande-tweens; döda `breathe`-tween på glödringen; `this._root?.destroy({ children: true })`.
- Robust mot `theta`/`omega` = NaN: om något blir NaN (t.ex. extremt dt), nollställ till litet startutslag.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/gungan/index.js`. Importera `Container, Graphics, Text` från `pixi.js`, `gsap`, `createScene` från `lib/scene.js`, hjälpare från `lib/feedback.js`, `COLORS, FONT` från `lib/theme.js`, `randomFrom` från `lib/swedish.js`. Default-exportera GameModule med metadatan ovan.
2. `init(ctx)`: `this._alive = true`; `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Lägg `createScene('meadow', { width: ctx.width, height: ctx.height })` som FÖRSTA barn. Bygg A-ramen (Graphics). Skapa `this._swing = new Container()` med position (640,150). Läs `this._level` och anropa `_loadLevel(ctx, this._level)`.
3. `_buildSwing(ctx, L)`: rensa gamla `_swing`-barn; rita rep, sits och Lova (lokalt, hängande ned till längd `L`); spara `this._lova`. Sätt start-`theta = 0.25`, `omega = 0`.
4. `_loadLevel(ctx, level)`: bestäm `L` + `THETA_GOAL` (nivåtabell); bygg/uppdatera `_swing` med rätt `L`; placera mål (🐦/🍎) + glödring vid `theta=-THETA_GOAL` och starta `breathe` på ringen; `this._resolving=false`, `this._sinceTap=0`, `this._idle=0`; nollställ bågspåret.
5. Skapa pump-ytan (osynlig hitArea-rektangel, `eventMode='static'`) och 💪-toggle-knappen; koppla `pointertap`/`pointerdown`+`globalpointermove`+`pointerup` (för pump + valfritt knuffa-drag) och togglens `pointertap`.
6. `_pump(ctx, strengthScale=1)`: räkna `dir`, `q`, `base` enligt Fysik, uppdatera `omega` (klampa), ge omedelbar feedback (pop/sparkle/sfx), nollställ idle-timers.
7. Lägg integratorn: `this._tick = (t)=> this._update(ctx, t)`, `ctx.ticker.add(this._tick)`. I `_update`: integrera pendeln (SUB-steg), `_swing.rotation = theta`, uppdatera bågspår, kör idle-/auto-hjälp-logik, och mål-/nuddningskoll → `_win(ctx)`. Allt bakom `if (!this._alive) return` och hoppa pump/auto vid `_resolving`.
8. `_win(ctx)`: `_resolving=true`; ljud+röst; fågel-/äpple-animation; `bigCelebration`+`burst`; `ctx.progress.complete()`; `setLevel`/`setCustom`; `gsap.delayedCall(1.6, ()=> this._alive && _loadLevel(ctx, ++this._level))`.
9. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
10. `destroy(ctx)`: enligt "Edge-cases & städning".
11. Registrera i `src/games/registry.js`: `import gungan from './gungan/index.js'` och lägg `gungan` i `GAMES`-arrayen.
12. `npm run dev`, öppna biblioteket, spela: verifiera att tryck i takt höjer gungan, att 💪-läget tar i mer, att fågeln/äpplet nuddas och firas, att auto-hjälpen räddar passivt spel, hem-knapp, röst-repris, och att `highestLevel`/`gungor` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera biblioteket → "Gungan"; canvas finns, inga uncaught errors/warnings i `browser_console_messages`).
- `voiceIntro` är satt och en svensk röstinstruktion spelas vid mount (`"Tryck i takt så gungar Lova högre!"`).
- **Pumpning ökar amplituden:** upprepade tryck (simulerade `pointertap`/pointer-events, eller via exponerat dev-state) får `Math.abs(theta)`-toppen / amplituden att växa över tid.
- **Timing styr utfallet:** tryck nära ytterläget (hög `q`) höjer mer per tryck än tryck i botten (verifierbart via exponerat `_lastQ`/amplitudökning). Inget tryck minskar amplituden (`ΔE ≥ 0`).
- **"Starkare knuff"-toggle ändrar utfallet:** med `_strong=true` växer amplituden snabbare per tryck än med `_strong=false`.
- **Mål nått → firande:** när `Math.abs(theta) ≥ THETA_GOAL` på rätt sida triggas firande (konfetti i `fxLayer`) och `ctx.progress.complete()` anropas **exakt en gång** (inget dubbel-trigg vid snabba tryck under `_resolving`).
- **No-fail / auto-hjälp:** om inga tryck görs faller Lova ALDRIG av (`Math.abs(theta) ≤ THETA_MAX` alltid), och efter idle-timern börjar auto-pumpen så att målet till slut nås och firas ändå. Inga buzzer-/röd-/"game over"-element, ingen sjunkande poäng.
- **Progression sparas:** efter en avklarad runda är `highestLevel` ökat och `custom.gungor` finns; värdena kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- **Städning:** vid retur till biblioteket (hem-knapp) tas tickern bort och inga tweens/timeouts fortsätter logga eller kasta fel (ingen GSAP körs på `_swing`).
