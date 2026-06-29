# Spindelnätet (`spindelnatet`)
> Godis och små krypljus regnar ner från natthimlen och en gosig liten spindel skjuter klibbiga nättrådar för att fånga dem — barnet trycker, en tråd flyger ut med ett "tjong", och fångsten åker glidande in i nätet. Ren skördarglädje utan minsta risk att misslyckas: missar studsar mjukt och kan fångas igen.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `spindelnatet` | Spindelnätet | 🕷️ | motorik | tap | [2,4] | `spindelnatet` | "Tryck nära godiset så fångar spindeln det!" |

(titleSv MED åäö. Kategori `motorik` ger röd brickfärg via `CATEGORIES`. `input: 'tap'`.)

## Mål & mekanik
Barnet hjälper en söt spindel att **fånga fallande godis/insekter** i sitt nät och fylla en mätare.

Kärnloop:
1. Föremål (🍬 🍭 🐛 🪲 🍫) **faller uppifrån** med matter.js-gravitation (slumpad start-x, lite slumpad sidofart och rotation).
2. Barnet **trycker nära ett fallande föremål**. En **nättråd** (vit linje) skjuts från nätets mittpunkt ut till föremålet (kort "skjut ut"-animation ~150 ms), **fångar** det (matter-kroppen tas bort), och drar in det **glidande mot nätet** (tween). Nät-mätaren tickar upp ett steg och ett 🍬 läggs i nätet.
3. **Påverkan (minst två kontroller som tydligt ändrar utfallet):**
   - **A. Sikte + timing** — VAR och NÄR barnet trycker avgör vilket föremål som fångas (närmaste föremål inom fångstradien) och om man hinner före marken. Detta är kärnkontrollen.
   - **B. "Bredare nät"-knapp** (stor toggle nere till höger) — när den är aktiv blir fångstradien mycket större OCH **ett enda tryck fångar ALLA föremål inom radien samtidigt** (en hel sköra på en gång). Laddar långsamt om (en liten ring runt knappen fylls), så barnet väljer *när* det stora svepet ska användas.
   - **C. Flytta spindeln** (bonus-kontroll) — spindeln/nätet kan **dras i sidled längs bottenremsan**. Närmare ett föremål = kortare tråd = snabbare fångst innan det når marken, och bättre vinkel på den breda fångsten.
4. **Mål:** samla **X godis** i nätet (X = nivåberoende, se Progression). När mätaren är full → firande → `ctx.progress.complete()` → ny, lite svårare omgång.
5. **Inget kan misslyckas:** ett föremål som når marken **studsar mjukt** (matter restitution) och blir liggande/krypande på golvet — det är **fortfarande fångbart** (tryck nära det → tråd ut, in i nätet). Mjuk **auto-hjälp** garanterar framgång (se Återkoppling).

## Skärm-layout (1280x720)
Designkoordinater 1280×720. GameHost ritar headern (hem-/repetera-knapp) överst — rita INGA egna. Håll spelinnehåll under y≈90. Allt nedan ligger i spelets `_root`.

- **Bakgrund:** `createScene('night', { width: ctx.width, height: ctx.height })` som FÖRSTA barn i `_root` (stjärnhimmel passar ett nät i natten). `eventMode='none'`. Lägg en mörk **markremsa** nederst: `roundRect(-40, 648, 1360, 140, 50).fill(COLORS.brown)` med en ljusare topplinje (`rect(-40,648,1360,12).fill({color:0x000000,alpha:0.18})`).
- **Spindelväv (nätet):** ett dekorativt `Graphics` `this._web` centrerat på **nät-basen** (start `x:640, y:600`). Rita radiella ekrar (8 st, längd ~150) + 3 koncentriska "spiral"-ringar i `0xffffff` alpha 0.35, `stroke({width:3})`. Webben följer spindelns x när den dras.
- **Spindeln:** en `Container` `this._spider` vid nät-basen. Programmatisk + emoji: en glansig kropp `circle(0,0,40).fill(COLORS.ink)` + liten höjdljus-prick (`circle(-12,-12,12).fill({color:COLORS.white, alpha:0.25})`), två ögon (vita cirklar r6 + svarta pupiller r3), 8 ben (tunna `moveTo/lineTo`-streck, `stroke({width:5, color:COLORS.ink})`). Ovanpå valfri 🕷️-emoji (Text fontSize 48) eller helt programmatiskt. **Drag-halo:** osynlig `hitArea = new Circle(0,0,90)`.
- **Fångstzon (logisk):** fallande föremål lever i hela ytan x∈[60,1220], y∈[-40,640]. Marken (studsgolv) ligger vid y≈630.
- **Föremål:** varje fångbart föremål = `Container` (mjuk skuggcirkel `circle(0,8,30).fill({color:0x000000,alpha:0.12})` + emoji-Text fontSize 64, anchor 0.5), länkad till en matter-cirkelkropp r≈34. Hit via avståndskoll (ingen egen pekyta behövs — se Interaktion).
- **Nät-mätare:** uppe till vänster (under headern, x≈120, y≈110) en rad **slots** (tomma ringar `circle(0,0,22).stroke(...)`), en per mål-godis; varje fångst fyller nästa slot med ett litet 🍬. Alternativt en burk 🫙 som fylls — välj slot-raden (tydligast för 2–4-åringar). Max ~8 synliga slots; fler räknas men visas komprimerat.
- **"Bredare nät"-knapp:** stor rund knapp nere till höger `x:1150, y:600`, radie **70px** (≥96px diameter träffyta + 24px osynlig halo via `hitArea = new Circle(0,0,94)`). Glansig cirkel i `COLORS.purple`, ikon 🕸️ (Text fontSize 56). En **laddnings-ring** runt om (`Graphics`, ritas om varje frame) visar återladdning; full ring = redo.
- **Marginaler:** minst 24px mellan knapp, mätare och kanter. Inga små klickytor.

## Interaktion
Bara **tap** + **enkel drag** (spindeln). Ingen `DragController` behövs — egen lättviktig peklogik på en heltäckande osynlig fångst-yta passar bäst.

- **Fångst-yta:** en transparent `hitArea`-rektangel (eller `_root` självt) som täcker spelytan, `eventMode='static'`. Lyssna på `pointertap`.
- **`_onTap(e)`:** konvertera `p = _root.toLocal(e.global)`. Kör `_shootAt(p)`.
- **`_shootAt(p)`** (normal-läge):
  1. Hitta **närmaste fångbara föremål** vars vy-position ligger inom **fångstradien `R = 90`** av `p` (`Math.hypot`).
  2. Finns ett → `_capture(obj)`. Inget inom radien → mjuk miss-feedback (liten `sparkle(ctx.fxLayer, p.x, p.y)` + `audio.sfx('soft')`), ALDRIG straff.
- **`_capture(obj)`:**
  1. Spärr: `if (obj._caught) return; obj._caught = true`.
  2. `audio.sfx('whoosh')` direkt (<100 ms), rita **tråd** i `this._thread` (Graphics): linje från nät-basen (`this._spider.x, 600`) till `obj.view`-position, animera "skjut ut" genom att tweena en `{t:0→1}`-proxy och rita `moveTo(base) → lineTo(lerp(base,obj,t))` varje update (exit-säkert; rör inga Pixi-objekt direkt).
  3. Ta bort matter-kroppen: `this._phys.removeBody(obj.body)` (slutar synka — vyn fryser).
  4. **Dra in:** tweena en `{x,y}`-proxy från föremålets nuläge till nät-basen och kopiera till `obj.view` bara `if (!obj.view.destroyed)`; `onComplete` → lägg i nätet (`_landInNet(obj)`), fade ut tråden.
  5. `_addToMeter()` (fyll nästa slot, `pop` på sloten), `audio.sfx('pling')`, valfri `floatText(ctx.fxLayer, base.x, base.y-60, '🍬')`.
- **Bred fångst (`_shootWide`)** — när "Bredare nät"-knappen trycks och är laddad: fångstradie `R = 200` från **nät-basen**, fånga ALLA fångbara föremål inom radien i följd (liten stagger 60 ms via `gsap.delayedCall`, alla bakom `this._alive`), `audio.sfx('match')` + `burst(ctx.fxLayer, base.x, base.y, {count:18})`. Starta återladdning (`this._wideCooldown = 1` → räknas ner i ticker, knappen dimmas tills 0).
- **Drag spindeln:** `this._spider.eventMode='static'`, `hitArea = Circle(0,0,90)`. `pointerdown` → `this._dragSpider=true`, lyft-skala 1.08, `audio.sfx('tap')`. `globalpointermove` → klampa x till [200,1080], flytta `_spider` + `_web` + bas-x. `pointerup/upoutside` → släpp, återställ skala. (Spindeln fångar inte vid drag — bara omplacering.)
- **Golv-föremål:** ett föremål som nått marken får `obj._onGround = true` men förblir fångbart med samma `_shootAt`-radie; ge det en liten "krypa i sidled"-rörelse via matter (låg sidofart) så det lever lite.
- **Resolving-skydd:** när mätaren blir full sätt `this._resolving = true`; alla tap/knapp-callbacks returnerar tidigt tills nästa omgång byggs (inget dubbel-firande).

## Fysik & kalibrering
matter.js via `src/lib/physics.js` (`PhysicsWorld`). **Ingen sikt-/pricklinje används** (fångst sker mot ett föremåls *nuvarande* position vid tryck), så **ingen `predictTrajectory`/`previewGravity`-kalibrering behövs** — pricklinje-kalibreringen i CLAUDE.md är inte tillämplig här.

- **Värld:** `this._phys = new PhysicsWorld({ gravityY: 0.9, walls: ['floor','left','right'] })`. Golvet ger den mjuka studsen; vänster/höger håller föremål inne. Sätt golvet visuellt vid y≈630 (matter-golvet ligger strax under skärmkant via `wallThickness` — komplettera med en egen statisk markkropp vid y≈645 om du vill ha studs högre upp: `this._phys.rectangle(640, 660, 1400, 60, { isStatic:true, restitution:0.5, label:'ground' })`).
- **Föremål:** spawnas vid `y:-40`, slump-x∈[120,1160], skapas med `this._phys.circle(x, -40, 34, { ...MATERIALS.light, label:'treat' })`. `MATERIALS.light` (restitution 0.5, frictionAir 0.05) ger ett mjukt, lite svävande fall — lagom långsamt för små barn att hinna trycka. Ge en liten startfart: `Body.setVelocity(body, { x: (Math.random()*2-1)*1.5, y: 0 })` och liten `Body.setAngularVelocity` för charm.
- **Länkning:** `this._phys.link(body, obj.view)` så emojin följer kroppens position+rotation. Vid fångst → `removeBody` (frys) → GSAP-indragning tar över.
- **Stega motorn i tickern:** `this._phys.update(ctx.ticker.deltaMS)` i `_update`. Klamp/skydd sköts av PhysicsWorld (fast 1/60-steg, max 5/frame).
- **Fallhastighet vs. svårighet:** höj `gravityY` (0.9 → 1.2 → 1.5) och spawn-frekvens per nivå för "snabbare/fler". Aldrig så snabbt att det blir stressande — det finns ingen straff och golv-föremål är fortfarande fångbara.
- **Inga `setWind`/lutning** i grundspelet; om du vill ha en lekfull "bris" som driver godiset i sidled, använd `this._phys.setWind(ax)` med litet `ax` (~0.0005) — rent kosmetiskt, ingen pricklinje att matcha.

## Återkoppling & belöning
Varje pekning → ljud+bild <100 ms, ENDAST positivt.
- **Tråd skjuts/fångst:** `audio.sfx('whoosh')` + tråd-linje + föremålet glider in. När det landar i nätet: `audio.sfx('pling')` (var 3:e fångst `'pop'` för variation), `pop` på spindeln (glad rycka), `sparkle(ctx.fxLayer, base.x, base.y)`, mätar-slot fylls med `pop`.
- **Bred fångst:** `audio.sfx('match')` + `burst(ctx.fxLayer, base.x, base.y, {count:18})` + spindeln `pop`. Knappens laddnings-ring töms och fylls sedan igen.
- **Miss (tomt tryck / inget inom radie):** `audio.sfx('soft')` + en pytteliten `sparkle` där fingret är + spindeln gör en glad `wiggle` ("oj!"). ALDRIG buzzer/rött/omstart.
- **Föremål studsar i marken:** mjukt `audio.sfx('soft')` (throttlat ~180 ms) + en `floatText(ctx.fxLayer, x, y, '😄')` ibland — en miss är ROLIG, inte fel.
- **Röst:** `voice.say(voiceIntro)` på mount; vid första fångsten `voice.say('Bra fångat!')`; annars sparsamt för att inte tjattra.
- **Mjuk auto-hjälp (garanterar framgång):**
  - Om **~6 s** utan att en enda fångst skett OCH föremål finns på/nära marken → spindeln **skjuter själv** en tråd och fångar ett föremål (`voice.say('Titta, jag hjälper till!')`, `audio.sfx('reveal')`), mätaren tickar.
  - Om föremål är ovanligt få på skärmen (svårt att träffa) → spawna ett extra direkt.
  - Säkerställ alltid att minst ~3 fångbara föremål finns (golv + luft) så barnet aldrig "tar slut" på mål.
- **Klart-firande:** när mätaren blir full → `this._resolving = true`; spindeln dansar (`pop` ×2), nätet glittrar, `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})`, sedan `ctx.progress.complete()`. Efter ~1.5 s (`gsap.delayedCall`, bakom `this._alive`) byggs nästa omgång.

Använda sfx: `whoosh, pling, pop, match, soft, reveal, celebrate, tap`. Voice: `voiceIntro`, `'Bra fångat!'`, `'Titta, jag hjälper till!'`, `randomFrom(PRAISE)`.

## Progression & nivåer
- `this._level = Math.max(1, ctx.progress.get().highestLevel || 1)` vid init.
- **Mål-antal & tempo (cykliskt, oändlig lek):**
  - **Nivå 1:** mål **4** godis, `gravityY 0.9`, spawn var ~1.6 s, max 4 föremål på skärmen samtidigt.
  - **Nivå 2:** mål **5**, `gravityY 1.1`, spawn ~1.3 s, max 5.
  - **Nivå 3:** mål **6**, `gravityY 1.3`, spawn ~1.1 s, max 6.
  - **Nivå 4+:** mål **7–8**, `gravityY 1.5` (tak), spawn ~0.9 s, max 7; därefter upprepas mönstren med liten slump-jitter (`randomFrom`/`Math.random`) i spawn-takt och föremåls-mix.
- Vid `complete()`: `ctx.progress.setLevel(this._level + 1)`; `ctx.progress.setCustom('skordar', (custom.skordar||0)+1)` räknar avklarade omgångar (frivilligt). Inga sjunkande värden, ingen synlig poäng.
- Efter firandet: `_buildRound(ctx)` återanvänder noder (rensa kvarvarande föremål, nollställ mätare/slots, ny mål-siffra, ny `gravityY`/spawn-takt). Spindelns x-position behålls.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics` + `scene.js`-bakgrund. Inga externa bild-/ljud-/fontfiler.
- **Emoji:** 🍬 🍭 🍫 🐛 🪲 (fallande godis/krypljus), 🕸️ (knapp-ikon), valfri 🕷️ (spindel-överlägg), 😄/🍬 i `floatText`, firande sköts av `bigCelebration`.
- **Graphics:** natt-scen (`createScene('night')`), markremsa (`roundRect`), spindelväv (radiella ekrar + spiralringar, vit alpha-stroke), spindelkropp (glansig cirkel + höjdljus + ögon + 8 ben-streck), föremåls-skuggcirklar, tråd-linje (`this._thread`, `moveTo/lineTo`, `stroke({width:5, color:0xffffff, cap:'round'})`), mätar-slots (ring-cirklar), bred-knapp (glansig cirkel `COLORS.purple` + laddnings-ring).
- **Färger** ur `theme.js`: `COLORS.ink` (spindel), `COLORS.brown` (mark), `COLORS.purple` (knapp), `COLORS.white` (väv/tråd), `PLAYFUL` (partiklar via feedback-helpers).

## Återanvänd dessa
- `lib/scene.js`: `createScene('night', {width,height})` — bakgrund som FÖRSTA barn.
- `lib/physics.js`: `PhysicsWorld` (`circle`, `link`, `removeBody`, `update`, `setWind`, `destroy`), `MATERIALS.light`, re-exporterad `Body` (`setVelocity`/`setAngularVelocity`).
- `lib/feedback.js`: `pop`, `wiggle`, `sparkle`, `burst`, `floatText`, `bigCelebration`, `bounceIn` (föremåls-intro), `breathe` (lockande puls på nästa föremål vid idle).
- `lib/theme.js`: `COLORS`, `PLAYFUL`, `PRAISE`, `FONT`, `DESIGN_W/H`.
- `lib/swedish.js`: `randomFrom`, `shuffle` (föremåls-mix, jitter).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress`: `get`, `setLevel`, `setCustom`, `complete`.
- `ctx.ticker` (fysik + spawn-timer + idle/auto-hjälp), `ctx.fxLayer` (partiklar/konfetti), `gsap`.
- INTE `DragController` (egen pek-/draglogik passar bättre), INTE `AimLauncher`/`predictTrajectory` (ingen pricklinje).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. ALLA `gsap.delayedCall`/`onComplete`/spawn-/auto-hjälp-callbacks och ticker-loopen returnerar tidigt om `!this._alive`.
- **Resolving-skydd:** sätt `this._resolving = true` när mätaren blir full → alla tap/knapp/drag-callbacks returnerar tills nästa omgång → `complete()` triggas exakt en gång.
- **Fångst-spärr:** `obj._caught`-flagga; `removeBody` körs en gång per föremål; en redan fångad kropp re-trycks inte.
- **Bred-knapp cooldown:** ignorera tryck när `this._wideCooldown > 0`; dimma knappen så barnet ser att den laddar.
- **Spawn-tak:** spawna aldrig fler än nivåns `maxOnScreen`; rensa föremål som länge legat på golvet utan att fångas (fade ut + spawna nytt) så ytan inte blir rörig.
- **Föremåls-vyer:** vid fångst tweenas en `{}`-proxy och kopieras till `obj.view` bara `if (!obj.view.destroyed)`; `onComplete` förstör vyn `if (!obj.view.destroyed)`. Tråd-linjen ritas på `this._thread` (lever hela spelet) — clear/redraw, aldrig direkt-tween på ett föremål som kan exit-förstöras.
- **destroy(ctx):** `this._alive = false`; `ctx.ticker.remove(this._tick)`; `this._phys?.destroy()`; avregistrera pek-lyssnare (fångst-yta, spindel, bred-knapp); `gsap.killTweensOf(...)` för spindel, slots, proxies och tråd; döda ev. `breathe`/`pop`-tweens; `this._root?.destroy({children:true})`.
- Throttla studs-/miss-ljud (~180 ms) så multistudsar inte spammar audio.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/spindelnatet/index.js`. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `PhysicsWorld, MATERIALS, Body` från `../../lib/physics.js`, `createScene` från `../../lib/scene.js`, feedback-helpers, `COLORS, PLAYFUL, PRAISE, FONT` från theme, `randomFrom` från swedish.
2. Default-exportera GameModule-objektet med metadatan i tabellen ovan.
3. `init(ctx)`: `this._alive = true`; skapa `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Lägg `createScene('night', {width:ctx.width, height:ctx.height})` först, sedan markremsa. Skapa `this._phys = new PhysicsWorld({ gravityY:0.9, walls:['floor','left','right'] })` (+ ev. egen markkropp). Bygg `this._web`, `this._spider` (drag-lyssnare), `this._thread` (tom Graphics), mätar-container, bred-knappen (med cooldown-ring + `pointertap → _shootWide`). Lägg fångst-yta (`eventMode='static'`, `pointertap → _onTap`). Läs `this._level`, kör `_buildRound(ctx)`. Lägg `this._tick = (t)=> this._update(ctx, t)`, `ctx.ticker.add(this._tick)`.
4. `_buildRound(ctx)`: sätt mål-antal/`gravityY`/spawn-takt från `this._level`, nollställ `this._caughtCount = 0`, bygg mätar-slots, `this._resolving = false`, nollställ idle-timer. (Spindelns x behålls.)
5. `_spawn()`: skapa föremåls-`Container` (skugga + slump-emoji) vid `y:-40`, matter-`circle(...MATERIALS.light, label:'treat')`, liten startfart/rotation, `this._phys.link(body, view)`, `bounceIn(view)`, pusha till `this._items`.
6. `_onTap(e)` → `_shootAt(_root.toLocal(e.global))`: hitta närmaste `item` inom `R=90`, annars mjuk miss. `_capture(item)`: spärr, `whoosh`, rita+animera tråd, `removeBody`, dra in vyn (proxy-tween), `_landInNet`, `_addToMeter`, kolla mål.
7. `_shootWide()`: om laddad → fånga alla inom `R=200` från nät-basen (staggrad), `match`+`burst`, starta cooldown.
8. `_addToMeter()`: fyll nästa slot (`pop`), öka `this._caughtCount`; om `>= mål` → `_onComplete(ctx)`.
9. `_onComplete(ctx)`: `this._resolving = true`, firande (`celebrate`, `bigCelebration`, voice), `ctx.progress.setLevel(this._level+1)`, `ctx.progress.setCustom('skordar', ...)`, `ctx.progress.complete()`, `gsap.delayedCall(1.5, ()=> this._alive && (this._level++, this._buildRound(ctx)))`.
10. `_update(ctx, t)`: `if(!this._alive) return`; `this._phys.update(t.deltaMS)`; spawn-timer (respektera `maxOnScreen`, ej under `_resolving`); markera golv-föremål; cooldown-nedräkning + rita knapp-ring; idle/auto-hjälp-timer (~6 s utan fångst → `_autoHelp()`); `breathe`-lockning på ett föremål vid idle.
11. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
12. `destroy(ctx)`: enligt "Edge-cases & städning".
13. Registrera i `src/games/registry.js`: `import spindelnatet from './spindelnatet/index.js'` och lägg `spindelnatet` i `GAMES`.
14. `npm run dev`, öppna biblioteket, spela: verifiera fångst-tråd, mätar-fyllning, bred-knappen (fångar flera), spindel-drag, golv-studs + om-fångst, auto-hjälp, firande, hem-knapp, röst-repris och att `highestLevel`/`custom.skordar` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera till biblioteket → välj "Spindelnätet"). Canvas finns; inga uncaught errors i `browser_console_messages`.
- Vid mount är `voiceIntro` satt/talas (`"Tryck nära godiset så fångar spindeln det!"`).
- Föremål faller: efter spawn ökar ett fallande föremåls y över tid (matter-gravitation; verifiera via exponerat teststate `__barnspel`/`this._items` eller snapshot-skillnad).
- **Fångst:** en `pointertap` nära ett fallande föremåls position skjuter en tråd, tar bort matter-kroppen och fyller en mätar-slot (`_caughtCount` ökar med 1; föremålet glider mot nät-basen).
- **Kontroll B (bredare nät):** tryck på bred-knappen när laddad fångar FLERA föremål inom radien i ett svep; därefter är knappen i cooldown och ignorerar tryck tills laddad.
- **Kontroll C (flytta spindel):** drag på spindeln flyttar `_spider.x` (klampat [200,1080]) och nätet/bas-x följer med; spindeln fångar inte under drag.
- **Miss är ofarlig:** ett tomt tryck (inget föremål inom radie) ger `soft`/`sparkle`/`wiggle` och ALDRIG felljud/buzzer/omstart/poängsänkning.
- **No-fail golv:** ett föremål som når marken studsar mjukt och förblir fångbart (tap nära det fångar det); inget "game over"-element existerar.
- **Auto-hjälp:** efter idle-perioden utan fångst fångar spindeln själv ett föremål så att mätaren kan fyllas — barnet kan aldrig fastna.
- **Klart:** när mätaren fylls körs firande (konfetti i `fxLayer`) och `ctx.progress.complete()` anropas exakt EN gång (inget dubbel-firande vid snabba upprepade tryck under `_resolving`).
- **Progression:** efter en avklarad omgång är `highestLevel` ökat och nästa omgång har högre mål/`gravityY`; värdena kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- **Städning:** vid retur till biblioteket (hem-knapp) tas tickern och fysikvärlden bort (`_phys.destroy`), inga tweens/timeouts fortsätter logga eller kasta fel.
