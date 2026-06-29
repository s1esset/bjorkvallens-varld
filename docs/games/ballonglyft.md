# Ballonglyft (`ballonglyft`)
> Barnet fäster heliumballonger på Bobos tunga present tills den lyfter precis lagom högt och svävar upp till Elvira på balkongen — varje ballong är ett räknat lyft, och leken belönar känslan "hur många behövs?" med ren triumf, aldrig ett misslyckande.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `ballonglyft` | Ballonglyft | 🎈 | larande | tap | [2,4] | `ballonglyft` | "Fäst ballonger så lyfter paketet upp till Elvira!" |

## Mål & mekanik
En tung **present** (🎁, "Bobos present") står på marken längst ner. Högt upp till höger står **Elvira** på en **balkong**. Barnet ska få presdenten att **sväva upp och stanna i höjd med balkongen** (ett höjd-**fönster**), så Elvira kan ta emot den.

**Kärnloop (räkne-känsla + finjustering):**
1. Barnet **trycker på "Fäst ballong"-knappen** (eller på presenten/heliumtuben). En heliumballong 🎈 dyker upp och knyts med en snörre ovanför presenten. Varje ballong ger **konstant UPP-lyft**, så presenten "vill" vila högre ju fler ballonger den har.
2. **För få** ballonger → presenten orkar inte upp (står kvar på marken / svävar för lågt). **Lagom** → den stiger och **stannar i höjdfönstret vid balkongen**. **För många** → den stiger förbi och **studsar mjukt i taket** (en gnistrig "boing").
3. Barnet **finjusterar** genom att **poppa** en ballong (tryck direkt på en ballong, eller på poppa-knappen) → ett lyft mindre → presenten sjunker lite.
4. När presenten vilar i höjdfönstret en kort stund (lugnt, låg fart) **sträcker Elvira ut armarna och tar emot den** → firande, klistermärke, ny (tyngre) present.

**No-fail:** inget kan gå sönder. För få/för många ger bara rolig respons (vingel, mjuk takstuds, fniss). Om barnet kör fast hjälper en **mjuk auto-justering** (lägger till eller poppar en ballong åt barnet med vänlig röst) tills presenten garanterat hamnar i fönstret. Presenten kan aldrig "tappas" eller falla ner och krascha — den sjunker bara mjukt.

**Två tydliga kontroller som ändrar utfallet:** (1) **antal ballonger** (lägg till) trimmar vilohöjden uppåt — kärnan i räknandet; (2) **poppa** trimmar nedåt för exakt finjustering. Tillsammans låter de barnet "söka" rätt antal.

## Skärm-layout (1280x720)
Designkoordinater 1280×720. GameHost ritar headern (hem-/repetera-knapp) överst — rita INGA egna. Håll spelinnehåll under y≈90. Allt nedan ligger i spelets `_root`.

- **Bakgrund:** `createScene('meadow', { width: ctx.width, height: ctx.height })` som FÖRSTA barn i `_root` (gradient-himmel + sol + moln + grön mark). `eventMode='none'`. Marken ligger nederst (~y 624–720).
- **Lyft-schakt (logiskt):** presenten rör sig **lodrätt** i kolumnen kring **x ≈ 860**. `groundBoxY = 590` (presentens center när den vilar på marken), `ceilingY = 150` (mjukt "tak" där ballonger bonkar).
- **Present (🎁):** Container vid start `(860, 590)`. Innehåll: mjuk markskugga (ellips/cirkel `fill({color:COLORS.shadow, alpha:0.18})` under), en glansig låd-platta `roundRect(-70,-70,140,140,22).fill(COLORS.red).stroke({width:6,color:COLORS.orangeDark})` med ett ljust glansband upptill (`roundRect`, vit alpha 0.18) och rosett, samt 🎁-emoji (`Text`, fontSize 110, anchor 0.5) ovanpå. Hela presenten är en tap-yta (lägg till en ballong vid tryck) med osynlig `hitArea = new Rectangle(-80,-90,160,180)` (≥96px).
- **Balkong + Elvira (höger, upptill):** en balkongplatta `roundRect(740, 300, 320, 34, 14).fill(COLORS.brown).stroke({width:6,color:0x6f4630})` med ett par räckes-stolpar. **Elvira** = 🧒-emoji (`Text`, fontSize 96, anchor (0.5,1)) stående på balkongen vid `(820, 300)`, plus en liten namnskylt/Text "Elvira" (FONT.title) valfritt.
- **Höjdfönster (mål-zon):** en glödande landnings-band ovanför presentens kolumn, ritat som `roundRect(770, windowLo, 200, windowHi-windowLo, 18)` i `fill({color:COLORS.yellow, alpha:0.22})` med `stroke({width:4,color:COLORS.yellow, alpha:0.6})`, samt två små pilar "⟷"/✨ i kanten. Standard `windowLo=205, windowHi=300` (nivåberoende, se Progression). Bandet pulsar lugnt (`breathe`) som inbjudan.
- **Snörren:** ett `Graphics` (`this._strings`, UNDER ballongerna, ÖVER bakgrunden) som varje frame ritar tunna linjer (`stroke({width:3, color:0x8a7766, alpha:0.7})`) från presentens topp (`box.x, box.y-70`) ut till varje ballongs nedre fäste.
- **Ballonger:** 🎈-emoji (`Text`, fontSize 72, anchor (0.5,1)) som fästs i en **solfjäder** ovanför presenten (se Interaktion). Varje ballong är tappbar för att poppas (osynlig `hitArea = new Circle(0,-28,52)`, ≥96px träff).
- **Kontrollpanel (nere till vänster, stora knappar):** två `lib/Button.js`-knappar i en rad vid y≈650:
  - **"Fäst ballong"** `🎈` — grön (`COLORS.green`), `width:300, height:120` vid `(230,650)`. Lägger till en ballong.
  - **"Poppa"** `💥` — orange/röd (`COLORS.orange`), `width:240, height:120` vid `(560,650)`. Poppar den senast tillagda ballongen.
- **Räknare:** en stor siffer-bricka uppe till vänster, `(180,150)`: en `roundRect`-platta + `Text` som visar antalet ballonger (`String(this._n)`, FONT.display, fontSize 96, fill COLORS.ink). Pulsar (`pop`) vid varje ändring — visualiserar räkningen.

Marginaler: knappar ≥24px isär; höjdfönstret och presentens startläge ligger i samma x-kolumn så en rak uppstigning alltid är möjlig.

## Interaktion
Endast **tap** (inga drag, inga gester). Tre tap-ytor, alla med ≥96px träff + osynlig hit-halo:

1. **Lägg till ballong** — tryck på **"Fäst ballong"-knappen** ELLER direkt på **presenten**. → `_addBalloon()`: `this._n++` (cappas vid `this._maxN`), skapa en ny 🎈 (`bounceIn`), placera in den i solfjädern, uppdatera räknaren (`pop`), ljud `audio.sfx('pop')` (+ ibland `'pling'`), och **räkna högt** med `voice.say(SVENSKA_TAL[this._n])` (se nedan) — varannan gång för att inte tjattra.
2. **Poppa ballong** — tryck direkt på en **ballong** ELLER på **"Poppa"-knappen** (poppar översta/senaste). → `_popBalloon(i)`: ta bort ballongen, `this._n--` (lägst 0), `puff(ctx.fxLayer, b.x, b.y, {count:8, color:COLORS.red})`, ljud `audio.sfx('soft')`, uppdatera räknaren, ev. liten `floatText(ctx.fxLayer, b.x, b.y, '💨')`.
3. Varje tap ger ljud+bild **<100ms** (knappen studsar själv via `lib/Button.js`; present/ballong får `pop`/`puff`).

**Solfjäder-placering:** ballong `i` (0-indexerad) får en mål-offset relativt presentens topp: `angle = -Math.PI/2 + (i - (n-1)/2) * 0.28` (radianer), `radius = 96`, så `bx = box.x + Math.cos(angle)*radius`, `by = box.y - 96 + Math.sin(angle)*radius`. Ballongerna **bobbar** mjukt: lägg till `by += Math.sin(now*0.003 + i)*6` i ticker-uppdateringen. Snörren ritas om varje frame mot dessa lägen.

**Tap-tap-vänligt / robusthet:** allt är enkeltryck. Snabba upprepade tryck på "Fäst ballong" är helt ok (lägger till en i taget tills `maxN`). När presenten tagits emot (`_resolving`) ignorerar alla tap-callbacks tidigt så inget dubbelfirande sker.

## Fysik & kalibrering
**Egen vertikal integrator** (ingen matter.js, ingen AimLauncher — rörelsen är 1D och drivs helt i `ctx.ticker`). Detta är en **dämpad buoyancy-fjäder mot en vilohöjd** som beror på antalet ballonger → den **stabiliserar sig själv** (garanterar att presenten kan stanna i fönstret), till skillnad från en konstant kraft som bara skulle driva förbi.

Per tick (läs `ctx.ticker.deltaMS`, normalisera `const dt = Math.min(2, ctx.ticker.deltaMS/16.67)`):
```
eqY   = groundBoxY - n * riseStep        // vilohöjd: +1 ballong = riseStep px högre upp
a     = K * (eqY - box.y)                 // fjäder mot vilohöjden (y nedåt-positiv)
vy   += a * dt
vy   *= Math.pow(DAMP, dt)                // luftmotstånd / dämpning
box.y += vy * dt
```
Konstanter (nivå 1): `groundBoxY = 590`, `riseStep = 75`, `K = 0.018`, `DAMP = 0.90`.
- **Mjukt tak:** `if (box.y < ceilingY) { box.y = ceilingY; vy = Math.abs(vy) * 0.4; sfx('pop'); sparkle(...) }` → "för många ballonger" studsar mjukt i taket (ceilingY=150).
- **Mark:** `if (box.y > groundBoxY) { box.y = groundBoxY; if (vy>0) vy = 0 }` → presenten kan aldrig falla genom marken; med för få ballonger vilar den lugnt på marken.
- `eqY` cappas INTE uppåt — många ballonger ger `eqY` ovanför taket så presenten pressas upp och bonkar taket (avsiktligt "för högt"-svar).

**Räkne-kalibrering (vilket antal är "lagom"):** önskat antal `targetN = Math.round((groundBoxY - windowCenter) / riseStep)`. Med nivå 1 (`windowCenter≈250`): `targetN ≈ (590-250)/75 ≈ 4–5`. Höjdfönstret `[205,300]` rymmer **både** `n=4` (`eqY=290`) och `n=5` (`eqY=215`) → förlåtande för småbarn, men `n=3` (`eqY=365`) är för lågt och `n=6` (`eqY=140`) bonkar taket. Sätt `riseStep`, `windowLo/Hi` per nivå så `targetN` växer med svårigheten (räkna högre).

**Mål-/stabilitetsdetektion:** i ticker, om `box.y >= windowLo && box.y <= windowHi && Math.abs(vy) < 0.4` → öka `this._dwellMs += deltaMS`; annars `this._dwellMs = 0`. När `this._dwellMs >= 700` och inte `_resolving` → `_succeed(ctx)` (Elvira tar emot). Annars ingenting (presenten bobbar vidare).

**Exit-säkerhet:** all rörelse sker i ticker-callbacken (ingen GSAP på själva present-/ballong-objekten för fysiken). GSAP används bara via de exit-säkra `feedback.js`-hjälparna (`pop`/`puff`/`sparkle`/`bigCelebration`) och på `{}`-proxys. Ticker-loopen returnerar tidigt om `!this._alive`.

## Återkoppling & belöning
Varje interaktion <100ms:
- **Lägg till:** `audio.sfx('pop')`, ballong `bounceIn`, räknaren `pop`, och **räkning på svenska** `voice.say(SVENSKA_TAL[n])` där `SVENSKA_TAL = ['noll','en','två','tre','fyra','fem','sex','sju','åtta','nio']` (säg varannan gång). Presenten gör ett litet `pop` när den börjar lätta från marken.
- **Poppa:** `audio.sfx('soft')`, `puff(ctx.fxLayer, b.x, b.y, {color:COLORS.red})`, `floatText(ctx.fxLayer, b.x, b.y, '💨')`, räknaren `pop`.
- **Takstuds (för många):** `audio.sfx('pop')` (throttlat ~180ms), `sparkle(ctx.fxLayer, box.x, ceilingY)`, `wiggle(box)` + valfri `floatText('boing!')`. Lekfullt, aldrig bestraffande.
- **Stiger i fönstret:** lugn `sparkle` runt höjdfönstret och en mjuk `pling` när presenten först kommer in i zonen → bekräftar "här är rätt höjd".
- **Mottagning (klart):** Elvira `pop`/sträcker armarna, presenten glider de sista pixlarna in i hennes famn (`gsap` på en `{}`-proxy eller direkt eftersom `_resolving` hindrar exit-tap), `audio.sfx('correct')` + `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})` + `burst(ctx.fxLayer, box.x, box.y, {power:1.2})`, sedan `ctx.progress.complete()`.

**Mjuk auto-hjälp (garanterar framgång, ingen fail):** håll `this._idleMs` (nollställs vid varje tap). I ticker, om `this._idleMs > 7000` och inte i fönstret och inte `_resolving`:
- Räkna `eqY` mot `windowCenter`: om presenten vilar **för lågt** (`eqY > windowHi`, för få) → `voice.say('Vi provar en ballong till!')` + `_addBalloon()`. Om **för högt** (`eqY < windowLo`, för många) → `voice.say('Vi poppar en ballong.')` + `_popBalloon()`. Nollställ `_idleMs`, vänta ~2,5s innan nästa auto-steg. Detta konvergerar garanterat mot `targetN` → presenten hamnar i fönstret → mottagning. Ingen buzzer, inget rött, ingen omstart.

Idle-recue (lättare nudge): vid `_idleMs > 6000` (innan auto-hjälpen tar över) → `voice.replayLast()` eller `voice.say(this.voiceIntro)` + `pop` på "Fäst ballong"-knappen.

Använd: sfx `pop, pling, soft, correct, celebrate`. Voice: voiceIntro, svenska tal, 'Vi provar en ballong till!', 'Vi poppar en ballong.', `PRAISE`.

## Progression & nivåer
- Läs `this._level = Math.max(1, (ctx.progress.get().highestLevel|0) || 1)` i `init`. Styr **presentens tyngd** (= `riseStep`, mindre lyft per ballong) och **balkongens höjd** (= höjdfönstrets läge) → kräver att räkna **fler** ballonger.
- Nivåer (cykliska, oändlig lek; `targetN ≈ (590-windowCenter)/riseStep`):
  - **Nivå 1:** `riseStep=75`, fönster `[205,300]` (center 250) → `targetN ≈ 4–5`. Liten present.
  - **Nivå 2:** `riseStep=66`, fönster `[195,275]` (center 235) → `targetN ≈ 5–6`. Lite större/tyngre present (visuellt + en extra rosett).
  - **Nivå 3:** `riseStep=58`, fönster `[180,255]` (center 218) → `targetN ≈ 6–7`. Hög balkong.
  - **Nivå 4+:** `riseStep=52`, fönster `[170,240]` → `targetN ≈ 7–8`; därefter upprepas mönstren med liten jitter. `maxN = targetN + 3` (cappa ~9) så räkningen håller sig i småbarnsintervall och skärmen inte fylls.
- Efter `_succeed`: `ctx.progress.setLevel(this._level + 1)`, valfritt `ctx.progress.setCustom('leveranser', n+1)` (oändlig räknare, aldrig sjunkande), vänta ~1,6s (`gsap.delayedCall`) → `_loadLevel(ctx, ++this._level)` återanvänder noderna (ny present på marken, balkong/fönster flyttas, ballonger nollställs). Inga synliga poäng, inga sjunkande värden.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics` + `lib/scene.js`-bakgrund. Inga externa bild-/ljud-/fontfiler.
- Emoji: 🎁 (present), 🎈 (ballong), 🧒 (Elvira), 💥/💨 (poppa), ✨/🎉 (firande, annars sköter `bigCelebration` det).
- Graphics: scen-bakgrund (`createScene('meadow')`), present-låda (`roundRect` + glansband + skugg-ellips), balkong (`roundRect` + stolpar), höjdfönster (glödande `roundRect`), snörren (`stroke`-linjer), räknar-bricka (`roundRect`), knappar (`lib/Button.js`).
- Ljud via `ctx.services.audio.sfx`, röst via `ctx.services.voice.say`.

## Återanvänd dessa
- `lib/scene.js`: `createScene('meadow', {width, height})` — bakgrund som första barn.
- `lib/Button.js`: `Button` — "Fäst ballong"- och "Poppa"-knapparna (hit-halo, studs, ljud inbyggt).
- `lib/feedback.js`: `bounceIn`, `pop`, `wiggle`, `puff`, `sparkle`, `burst`, `floatText`, `breathe`, `bigCelebration`.
- `lib/theme.js`: `COLORS`, `FONT`, `PRAISE`, `DESIGN_W/H`.
- `lib/swedish.js`: `randomFrom` (PRAISE/jitter).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress`: `get`, `setLevel`, `setCustom`, `complete`.
- `ctx.ticker` (fysik-/idle-loop, `deltaMS`), `ctx.fxLayer` (firande/partiklar).
- INTE `DragController`, INTE `physics.js`/`launcher.js` (rörelsen är 1D och drivs av den egna integratorn ovan).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Ticker-loopen och alla `gsap.delayedCall`/auto-hjälp-callbacks returnerar tidigt om `!this._alive`.
- **`_resolving`-skydd:** sätt `true` när presenten tas emot → alla tap-callbacks (knappar, present, ballonger) och mål-/auto-hjälp-logik returnerar tidigt tills nästa nivå laddas → `complete()` kan bara triggas EN gång (inget dubbelfirande vid snabba tryck).
- Cappa `this._n` i `[0, maxN]`; "Poppa" på 0 ballonger gör inget störande (ev. liten `wiggle` på presenten + `soft`).
- Throttla takstuds-ljudet (`this._lastBonk`) så snabba multistudsar inte spammar audio.
- Clampa `dt` (`Math.min(2, deltaMS/16.67)`) så en hängd flik inte slungar presenten genom taket.
- Nollställ `this._idleMs` och `this._dwellMs` vid varje tap och vid `_loadLevel`.
- `destroy(ctx)`: `this._alive=false`; `ctx.ticker.remove(this._tick)`; `gsap.killTweensOf(...)` för present, räknare, höjdfönstrets `breathe`-tween och alla ballonger; döda eventuella per-objekt-tweens; avregistrera knapp-/present-/ballong-lyssnare (eller förlita på `destroy({children:true})`); `this._root?.destroy({children:true})`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/ballonglyft/index.js`, default-exportera GameModule-objektet med metadatan ovan. Importera `Container, Graphics, Text, Rectangle, Circle` från `pixi.js`, `gsap`, `createScene`, `Button`, feedback-hjälpare, `COLORS, FONT` och `randomFrom`.
2. `init(ctx)`: `this._alive=true`; `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Lägg `createScene('meadow', {width:ctx.width, height:ctx.height})` som första barn. Skapa lager-ordning: bakgrund → balkong+Elvira → höjdfönster (`breathe`) → `this._strings` (Graphics) → ballong-lager (Container) → present → räknar-bricka → knappar. Läs `this._level`.
3. `_loadLevel(ctx, level)`: sätt `riseStep/windowLo/windowHi/windowCenter/maxN` per nivå; nollställ `this._n=0, vy=0, _dwellMs=0, _idleMs=0, _resolving=false`; placera present på `(860,590)`; töm ballong-lagret; flytta balkong/Elvira/höjdfönster till nivåns höjd.
4. Bygg present-Container (`_makeBox`) med `hitArea` + `pointertap` → `_addBalloon`. Bygg de två `Button`-knapparna med `onTap` → `_addBalloon` / `_popBalloon`.
5. `_addBalloon()` / `_popBalloon(i?)`: uppdatera `this._n`, skapa/ta bort 🎈 (med tap-hitArea för poppa), placera i solfjädern, uppdatera räknaren, spela ljud/röst/partiklar, nollställ `_idleMs`.
6. Lägg fysik-/idle-loop: `this._tick = () => this._update(ctx)`, `ctx.ticker.add(this._tick)`. I `_update`: kör integratorn (eqY-fjäder, dämpning, tak/mark-clamp), bobba ballonger + rita om snörren, mål-/dwell-detektion → `_succeed`, idle-recue + auto-hjälp. Allt bakom `if(!this._alive||this._resolving) return` där relevant.
7. `_succeed(ctx)`: `_resolving=true`; Elvira-mottagning + ljud/röst/`bigCelebration`/`burst`; `ctx.progress.setLevel(this._level+1)`; `ctx.progress.setCustom('leveranser', ...)`; `ctx.progress.complete()`; `gsap.delayedCall(1.6, ()=> this._alive && this._loadLevel(ctx, ++this._level))`.
8. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
9. `destroy(ctx)`: enligt "Edge-cases & städning".
10. Registrera i `src/games/registry.js`: `import ballonglyft from './ballonglyft/index.js'` och lägg `ballonglyft` i `GAMES`-arrayen.
11. `npm run dev`, öppna biblioteket, spela: verifiera att ballonger läggs till/poppas, att presenten stiger och **stannar i fönstret**, takstuds vid för många, mottagning + firande, auto-hjälp vid idle, hem-knapp, röst-repris, och att `highestLevel` ökar och kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera till biblioteket → välj "Ballonglyft"). Canvas finns; inga uncaught errors i `browser_console_messages`.
- Vid mount är `voiceIntro` satt/uttalad ("Fäst ballonger så lyfter paketet upp till Elvira!").
- **Lägg till-kontrollen ändrar utfallet:** tap på "Fäst ballong" ökar ballong-antalet (verifierbart via exponerat `_n`) och presenten börjar stiga (box.y minskar över några frames).
- **Poppa-kontrollen ändrar utfallet:** tap på "Poppa"/på en ballong minskar `_n` och presenten sjunker — två oberoende kontroller som påverkar höjden.
- **Stabilisering:** med rätt antal ballonger stannar presenten i höjdfönstret (`windowLo ≤ box.y ≤ windowHi`, `|vy|` litet) och `_dwellMs` ackumulerar → `_succeed` körs.
- **Korrekt resultat:** mottagning triggar firande (konfetti i `fxLayer`) och `ctx.progress.complete()` anropas exakt EN gång (inget dubbeltrigg under `_resolving` vid snabba tryck).
- **Ingen fail-state:** för få ballonger → presenten vilar lugnt på marken (faller aldrig igenom); för många → mjuk takstuds, inget felljud/buzzer/rött/"game over"; presenten lämnar aldrig schaktet.
- **Auto-hjälp:** efter idle-timern (förkortbar i test) justeras antalet automatiskt mot rätt och rundan firas ändå — framgång garanteras utan barnets perfekta räkning.
- **Progress sparas:** efter en avklarad runda är `highestLevel` ökat och kvarstår efter sidladdning (localStorage `pwagames.save.v1`); ev. `custom.leveranser` har ökat.
- **Städning:** vid retur till biblioteket (hem-knapp) tas ticker-loopen bort och inga tweens/timeouts fortsätter logga eller kasta fel.
