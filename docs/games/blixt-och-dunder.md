# Blixt och Dunder (`blixt-och-dunder`)
> Barnet drar ihop fluffiga åskmoln över en kvällsby och gnider dem tills de lyser blått — när två laddade moln nuddar varandra ZAP:ar en vänlig blixt ner och tänder en lampa. Ren magi och makt över vädret, utan en gnutta läskighet.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `blixt-och-dunder` | Blixt och Dunder | ⚡ | larande | mixed | [3,5] | `blixt-och-dunder` | "Dra ihop molnen och tryck för att ladda dem!" |

- `input` är **mixed**: kärnan är **dra moln** (placera) + **tryck/gnid moln** (ladda) — två tydliga kontroller som båda ändrar utfallet.
- `category` = `larande` (orsak→verkan: ladda + para ihop → blixt → ljus), tegelfärg via `CATEGORIES.larande` (lila).

## Mål & mekanik
Tänd alla mörka lampor i byn med vänlig blixt. Barnet styr **var** och **när** blixten slår genom två kontroller:

1. **Placering (drag):** dra åskmolnen ☁️ fritt i himlen. Du vill ha två moln ovanför den lampa du vill tända.
2. **Laddning (tryck/gnid):** tryck eller gnid ett moln → dess **laddning** ökar (3 tryck = fullt). Ett fulladdat moln lyser blått och spraka-knastrar lätt.

**Kärnloop:** När **två fulladdade moln** glider ihop så de nuddar varandra → en **blixt ⚡** ritas från kontaktpunkten ner till den **närmaste otända lampan** under/nära molnparet. Lampan tänds (glöder gult 💡), en mjuk **dunder** hörs, och båda molnen **laddar ur** (släpper ett litet skvätt regn) → tomma igen, redo att laddas på nytt och flyttas till nästa lampa.

**Klart** = alla byns lampor lyser → mätaren full → firande + en **regnbåge 🌈** spänner över himlen, `ctx.progress.complete()`, sedan byggs en större by (fler lampor/moln).

**No-fail (viktigt):** Inget kan bli fel.
- Ett **oladdat** moln som trycks ger bara **mjukt regn** + ett litet plingande laddnings-steg — aldrig ett felljud.
- Slår ett laddat par till utan att en lampa råkar vara rakt under → blixten **böjer sig mot närmaste otända lampa ändå** (mjuk auto-sikt) → alltid en tändning.
- **Mjuk auto-hjälp:** efter ~7s utan att en ny lampa tänts driver maskoten Bobo försiktigt ihop de två mest laddade molnen (eller toppar deras laddning) så en blixt garanterat slår och en lampa tänds. Barnet lyckas alltid.

## Skärm-layout (1280x720)
GameHost ritar hem-/högtalar-knapparna i headern (y < 90) — rita INGA egna. Allt nedan ligger i spelets `_root`.

- **Bakgrund (FÖRSTA barn):** `createScene('sunset', { width: ctx.width, height: ctx.height, ground: true })` från `lib/scene.js` — varm skymningshimmel (gul→rosa) med sol och drivande moln, så åskan känns mysig, inte mörk. `eventMode='none'`.
- **Himmel-band (molnens yta, logiskt):** x ∈ [120, 1160], y ∈ [130, 360]. Molnen får bara röra sig inom denna ruta (klampas).
- **Byn (mark, y ≈ 470–680):** 2–5 **hus** ritade programmatiskt: `roundRect(cx-70, baseY-110, 140, 120, 16)` väggkropp i `COLORS.cream`/`COLORS.brown`-toner + ett **tak** som triangel (`poly([cx-82,baseY-110, cx,baseY-180, cx+82,baseY-110])`) i `COLORS.red`/`COLORS.orange`. Husen står på marken (`baseY ≈ 660`), jämnt fördelade i x.
- **Lampor (målen):** en **lampa** sitter ovanför varje hus, position `(cx, baseY-210)` ≈ y 450. Varje lampa = Container med:
  - en mjuk **glödcirkel** (`circle(0,0,46)`, börjar `alpha 0` mörk → tänd: `fill({color:COLORS.yellow, alpha:0.5})`),
  - emoji-Text 💡 (fontSize 64, anchor 0.5) — otänd ritas nedtonad (`tint 0x888888`, `alpha 0.55`), tänd → full färg + `pop`.
  - Vart 3:e mål kan bytas mot 🏮 (Bobos lykta) eller 🌳 (träd som tänds med lyktor) för variation — samma tänd/otänd-logik.
  - Osynlig hit-halo behövs ej (lampor är inte tryckbara mål), men håll dem ≥96px visuellt.
- **Molnen ☁️:** Container, **radie ≈ 70px** (visuell), **hit-halo via `hitArea = new Circle(0,0,96)`** (≥192px träffyta). Innehåll: en vit moln-`Graphics` (samma stil som `scene.js makeCloud`, men större) + en **laddnings-glöd** ovanpå (`circle(0,0,72)`, blå `COLORS.blue`, `alpha = charge*0.6`) + valfri ⚡-emoji som tonar in vid full laddning. Startpositioner sprids i himmel-bandet.
- **Mätare (uppe, under headern):** en rad små 💡-ikoner (Text fontSize 40) centrerade vid y≈110, en per lampa; fylls (tonas från grå → gul) när motsvarande lampa tänds. Eller en enkel text-fri "X av Y lyser" som ikon-rad — INGEN siffra krävs (ikon-först).
- **Bobo (maskot):** `makeBobo()` från `lib/mascot.js` nere i ett hörn (x≈90, y≈600) som vinkar och pekar vid auto-hjälp.

Marginaler: minst 24px mellan moln-starter; lampor har fri himmel rakt ovanför så ett par moln alltid kan placeras över dem.

## Interaktion
Två kontroller, båda barnvänliga och med tap-tap-tålig fallback. **Använd INTE `DragController`** (den snäpper föremål till mål; här vill vi fri placering + tryck-laddning) — egen lättviktig peklogik per moln:

- Varje moln: `eventMode='static'`, `cursor='pointer'`, `hitArea = new Circle(0,0,96)`.
- **`pointerdown` på moln:** spara `grabDX/DY = cloud.pos − _root.toLocal(e.global)`, sätt `this._activeCloud = cloud`, `cloud._moved = false`, lyft-skala `pop`/scala 1.08, ljud `audio.sfx('tap')` (<100ms). Registrera `globalpointermove`.
- **`globalpointermove` (medan nere):** flytta molnet med fingret (klampa i himmel-bandet). Om förflyttningen sedan down > 14px → `cloud._moved = true` (det var ett **drag**). Medan fingret rör sig över ett ännu icke-fullt moln läggs en liten **gnid-laddning** på (`charge += 0.012 per move-event`, throttlat) → "gnugga molnet"-känsla.
- **`pointerup`/`pointerupoutside`:** om `!cloud._moved` → det var ett **tryck** → `_chargeTap(cloud)` (lägg `charge += 0.34`). Om `_moved` → bara släpp (placering klar). Återställ skala. Avregistrera move-lyssnaren. `this._activeCloud = null`.
- **`_chargeTap(cloud)`:** öka laddning ett steg; om molnet INTE blev fullt → mjukt **regn** (se Återkoppling) + `audio.sfx('soft')` (aldrig fel!). Om det blev fullt (`charge >= 1`) → klampa till 1, blå glöd full, ⚡ tonar in, `audio.sfx('pling')` + `sparkle`.
- **Tap-tap-fallback för placering (de minsta):** ett moln kan också flyttas utan kontinuerligt drag — om barnet bara trycker laddar det på plats; för att flytta räcker korta drag (tröskel 14px). Eftersom blixten auto-siktar mot närmaste lampa behöver barnet aldrig pricka exakt; "tryck två moln fulla så blixtar det" funkar även helt utan drag (auto-hjälp parar ihop dem).
- **Laddning är icke-bestraffande:** ingen laddnings-decay som straffar (default: laddning ligger kvar tills den används i en blixt). Vid behov en mycket långsam "lugn" decay (≤0.03/s) BARA för att uppmuntra tryck — håll den förlåtande.

Kollision (i ticker): två moln "nuddar" när `Math.hypot(dx,dy) < r1 + r2 - 20` (lite överlapp krävs). Om **båda** `charge >= 1` och spelet inte just `_resolving` en blixt → `_strike(a, b)`.

## Fysik & kalibrering
Egen, enkel **tick-driven** integrator (ingen matter.js, ingen GSAP på Pixi-objekt i loopen) — allt exit-säkert.

- **Molnens drift:** moln som inte hålls glider mycket sakta mot varandra-neutralt; ge varje moln en pytte-`vx` (±0.15 px/frame) som studsar mjukt mot himmel-bandets kanter (`x ∈ [120,1160]`, `y ∈ [130,360]`), så det "lever". Det moln som hålls (`_activeCloud`) följer fingret och har `vx=vy=0`. Normalisera med `dt = ticker.deltaMS/16.67`.
- **Laddnings-integration:** `charge` är 0..1, ändras bara av tryck/gnid (diskret), ev. långsam decay i ticker (`charge -= 0.0005*dt` om aktiverad). Glöd-alpha och ⚡-alpha sätts varje frame `= charge`.
- **Blixt-båge (`_strike(a,b)`):** geometrisk + animerad, INTE matter.
  - Startpunkt `p0` = mittpunkten mellan molnen. Mål = `_nearestUnlitLamp(p0)` (minsta avstånd, helst den under molnparet). Slutpunkt `p1` = lampans glödcirkel.
  - Bygg en **jagged polyline**: dela sträckan i `n = 7` segment; vid varje inre punkt offsetta vinkelrätt mot linjen med `(Math.random()*2-1)*22` px (sicksack). Rita i ett dedikerat `this._bolt` Graphics: först en bred **glow**-stroke (`width:18, color:0xbfe3ff, alpha:0.5`) sedan en skarp kärna (`width:6, color:0xffffff`) ovanpå.
  - **Animera flashen exit-säkert:** tweena en `{}`-proxy `{a:1}` → `{a:0}` på 0.35s; i `onUpdate` (om `!this._bolt.destroyed`) rita om bågen med `alpha = st.a` och re-jittra var ~3:e frame för "flimmer". I `onComplete` `this._bolt.clear()`. ALDRIG tweena `_bolt` direkt.
  - **Vänlig ljusblixt:** en kort, MJUK helskärms-flash: en vit `Graphics`-rect i `ctx.fxLayer`, `alpha 0→0.25→0` via `{}`-proxy (≤0.25s). Aldrig stroboskop/hårt — en enda mjuk puls. Valfri liten `shake(this._root, {intensity:5, duration:0.25})` (mjuk).
- **Regn (oladdat tryck):** spruta 5–7 små regndroppar från molnets botten: korta blå streck (`roundRect` 4×16, `COLORS.blue`, alpha 0.7) som faller `vy ≈ 6 px/frame` och tonar bort. Implementera som exit-säkra partiklar i `ctx.fxLayer` med `{}`-proxy-mönstret (kopiera till Pixi bara `if(!p.destroyed)`), eller som korta GSAP-på-proxy. Stäng självt efter ~0.6s.

> Inga `predictTrajectory`/`AimLauncher`-kalibreringsvärden behövs (ingen ballistik). Den enda "fysiken" är jitter-geometri + alpha-flash; håll all rörelse i `ctx.ticker` och alla partiklar i de exit-säkra mönstren.

## Återkoppling & belöning
Varje pekning → ljud+bild < 100ms, ENDAST positivt:
- **Ta tag i moln:** `audio.sfx('tap')` + liten skal-`pop`.
- **Laddnings-tryck (ej fullt):** mjukt **regn** under molnet + `audio.sfx('soft')` + glöden växer ett snäpp. (Detta är "missen" — och den är rolig, aldrig fel.)
- **Moln blir fullt:** blå glöd full, ⚡ tonar in, `audio.sfx('pling')` + `sparkle(ctx.fxLayer, cloud.x, cloud.y)` + ett lätt knaster.
- **Blixt slår + lampa tänds:** `audio.sfx('whoosh')` direkt följt av `audio.sfx('pop')` (dunder-känsla), `audio.sfx('correct')` när lampan tänds; lampan `pop` + glöd `alpha 0→0.5`, `burst(ctx.fxLayer, lampa.x, lampa.y, {colors:[COLORS.yellow,0xffffff]})`, `floatText(ctx.fxLayer, lampa.x, lampa.y-50, '💡')`, mätar-ikonen tonar till gul. `voice.say('Blixten tände lampan!')` (variera, inte varje gång → ej tjat).
- **Alla lampor lyser (klart):** `this._resolving=true`; `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, en **regnbåge 🌈** ritas (3–5 färgade `arc`-stroke i himlen, eller emoji-Text 🌈 fontSize 200 som tonar/skalar in), `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})`, alla lampor pulsar i tur, sedan `ctx.progress.complete()`.
- **Idle-recue (~6s utan interaktion):** `voice.replayLast()` (eller `voice.say(this.voiceIntro)`) + Bobo vinkar + det mest laddade molnet `breathe`/pulsar en gång som vink.
- **Auto-hjälp (~7s utan ny tändning):** Bobo pekar, de två mest laddade molnen toppas till fullt och glider mjukt ihop (tween på molnens `vx` eller en kort guidad förflyttning) → blixt slår → lampa tänds. Garanterad framgång.

Använda sfx: `tap, soft, pling, whoosh, pop, correct, celebrate`. Voice: voiceIntro, 'Blixten tände lampan!', beröm ur `PRAISE`.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init.
- Byn växer (cyklisk, oändlig lek):
  - **Nivå 0–1:** 2 lampor (hus i x≈430 och 850), **2 moln**. Lär ut ladda+para.
  - **Nivå 2–3:** 3 lampor (x≈320/640/960), **3 moln**.
  - **Nivå 4–5:** 4 lampor, **3–4 moln**, lamporna lite mer spridda.
  - **Nivå 6+:** 5 lampor, **4 moln**; därefter upprepas mönstren med liten slump-jitter (±30px) via `randomFrom`/`Math.random`. Antal moln alltid ≥2 (krävs för blixt) och ≥ antal lampor är **inte** nödvändigt (moln laddar ur och återanvänds).
- Efter `complete()`: `ctx.progress.setLevel(this._level+1)`, vänta ~1.6s (`gsap.delayedCall`, vakta `_alive`), `_buildVillage(ctx, ++this._level)` — återanvänd noder där möjligt (flytta/återställ lampor & moln). `setCustom('byar', n+1)` räknar avklarade byar (frivilligt). Inga sjunkande värden, ingen synlig poäng.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics` + `lib/scene.js`-bakgrund. Inga externa bild-/ljud-/fontfiler.
- **Emoji:** ☁️ (moln), ⚡ (laddat-moln-markör + ikon), 💡 (lampa), 🏮/🌳 (varianter), 🌈 (firande), valfri 🌟.
- **Graphics:** skymningsscen (via `createScene`), hus (`roundRect` väggar + `poly` tak + stroke), lampornas glödcirklar, molnens vita kropp (à la `scene.js makeCloud`, skalad) + blå laddnings-glöd, blixtbågen (`moveTo/lineTo` jagged polyline, dubbel stroke glow+kärna), regndroppar (`roundRect`), mätar-ikoner, mjuk helskärms-flash-rect.
- **Mascot:** `lib/mascot.js` `makeBobo()`.
- Firande via `feedback.bigCelebration` + `burst`/`sparkle`/`floatText` (allt i `ctx.fxLayer`).

## Återanvänd dessa
- `lib/scene.js`: `createScene('sunset', {...})` — bakgrund som FÖRSTA barn.
- `lib/feedback.js`: `pop`, `wiggle`, `sparkle`, `burst`, `floatText`, `bigCelebration`, `shake`, `breathe`, `puff`.
- `lib/theme.js`: `COLORS` (blue, yellow, red, orange, brown, cream), `PLAYFUL`, `PRAISE`, `FONT`, `CATEGORIES`.
- `lib/mascot.js`: `makeBobo()`.
- `lib/swedish.js`: `randomFrom`, `shuffle` (jitter/variation, ej upprepa beröm).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress`: `get`, `setLevel`, `complete`, `setCustom`.
- `ctx.ticker` (drift + laddning + kollision + idle/auto-hjälp-timers), `ctx.fxLayer` (blixt-flash, partiklar, konfetti), `gsap` (tweens — ALDRIG direkt på Pixi-objekt som kan förstöras av exit/onComplete; använd `{}`-proxy).
- Pixi v8: `import { Container, Graphics, Text, Circle } from 'pixi.js'`. Kollisions-/hit via `Circle`-`hitArea`.
- INTE `DragController` (fri placering + tryck-laddning byggs med egen lättviktig peklogik enligt Interaktion).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`onComplete`/auto-hjälp-/idle-callbacks och ticker-loopen tidig-returnerar `if (!this._alive) return`.
- **`_resolving`-skydd:** under en pågående blixt-flash och under klart-firandet, sätt `this._resolving = true` → kollisions-loopen startar ingen ny blixt och pointer-callbacks som tänder ignoreras → `complete()` kan bara triggas en gång. Nollställ när nästa par är redo.
- **En blixt åt gången:** sätt en kort `this._strikeCooldown` (t.ex. 0.4s) efter varje blixt så två överlappande moln inte spammar blixtar varje frame. Båda molnen sätts `charge = 0` direkt i `_strike` så paret inte återutlöser.
- **Skydda lampor mot dubbel-tändning:** `if (lamp._lit) return` i tänd-logiken; auto-sikt väljer bara bland otända.
- **Klamp moln** i himmel-bandet efter varje positionsuppdatering (drift + drag), så inget moln glider in i headern eller bakom byn.
- **Exit-säkra partiklar:** blixt-flash, regn, konfetti, burst — använd `lib/feedback.js`-hjälparna eller `{}`-proxy + `if(!obj.destroyed)`-kopiering + `onComplete: ()=>{ if(!obj.destroyed) obj.destroy() }`. ALDRIG `gsap.to(pixiObj, …)` på något som kan förstöras av sin egen onComplete eller av spel-exit.
- **`destroy(ctx)`:** `this._alive=false`; `ctx.ticker.remove(this._tick)`; avregistrera alla moln-peklyssnare (`pointerdown` + ev. kvarvarande `globalpointermove`); `gsap.killTweensOf(...)` för moln, lampor, `_bolt`, Bobo och `_root`; döda ev. `breathe`-tweens; `this._bolt?.clear()`; `this._root?.destroy({children:true})`. Spara tick-referensen i `this._tick`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/blixt-och-dunder/index.js` och default-exportera GameModule-objektet med metadatan ovan. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `createScene` från `lib/scene.js`, hjälpare från `lib/feedback.js`, `COLORS, PLAYFUL, PRAISE, FONT` från `lib/theme.js`, `makeBobo` från `lib/mascot.js`, `randomFrom` från `lib/swedish.js`.
2. `init(ctx)`: `this._alive = true`; `this._root = new Container()`; `ctx.stage.addChild(this._root)`. Lägg `createScene('sunset', {width:ctx.width, height:ctx.height, ground:true})` som FÖRSTA barn. Skapa lager-ordning: scen → byn (`_village` Container) → `this._bolt = new Graphics()` (blixt, ovanför byn) → `_cloudLayer` (Container, moln överst) → mätare → Bobo. Läs `this._level`. Anropa `_buildVillage(ctx, this._level)`.
3. `_buildVillage(ctx, level)`: rensa gamla hus/lampor/moln (`removeChildren().forEach(d=>d.destroy())`, `_bolt.clear()`). Bestäm antal lampor/moln ur `level`. Bygg hus + lampor (otänd stil), bygg mätar-ikoner, skapa moln (`_makeCloud`) på spridda positioner i himmel-bandet med liten `vx`, `charge=0`. Sätt `this._lamps`, `this._clouds`, `this._litCount=0`, `this._resolving=false`, `this._idle=0`, `this._sinceLight=0`. `bounceIn` på lampor/moln.
4. `_makeCloud(x,y)`: Container med vit moln-`Graphics`, blå glöd-`Graphics` (uppdateras per frame), ⚡-Text (alpha=charge), `hitArea=new Circle(0,0,96)`, `eventMode='static'`. Koppla `pointerdown` (spara grab-offset, registrera `globalpointermove`, `audio.sfx('tap')`, pop) / `globalpointermove` (flytta+klamp, sätt `_moved`, gnid-laddning) / `pointerup`+`pointerupoutside` (om `!_moved` → `_chargeTap`, annars släpp; avregistrera move).
5. `_chargeTap(cloud)`: `cloud.charge = Math.min(1, cloud.charge + 0.34)`; om < 1 → regn-partiklar + `audio.sfx('soft')`; om = 1 → full glöd + `audio.sfx('pling')` + `sparkle`.
6. Lägg fysik/loop i ticker: `this._tick = (t) => this._update(ctx, t)`, `ctx.ticker.add(this._tick)`. I `_update(ctx, ticker)` (allt bakom `if(!this._alive) return`): driva molnens `vx`/klamp, sätt glöd/⚡-alpha = charge, räkna `_idle`/`_sinceLight` upp (deltaMS), kolla par-kollision (`if(!this._resolving && !cooldown)` → `_strike`), idle-recue vid 6s, auto-hjälp vid 7s utan tändning.
7. `_strike(ctx, a, b)`: `this._resolving=true` kortvarigt; `a.charge=b.charge=0`; välj `_nearestUnlitLamp(midpoint)`; rita jagged båge i `_bolt` + animera flash (proxy), mjuk helskärms-flash i `fxLayer`; tänd lampan (`_lightLamp`), ljud/voice/partiklar; sätt cooldown; nollställ `_sinceLight`; om alla lampor tända → `_onComplete(ctx)`.
8. `_lightLamp(lamp)`: `if(lamp._lit)return`; `lamp._lit=true`; glöd-alpha till 0.5, full emoji-färg, `pop`, mätar-ikon → gul, `this._litCount++`.
9. `_onComplete(ctx)`: `this._resolving=true`; regnbåge + `bigCelebration` + `celebrate`-ljud + beröm; `ctx.progress.setLevel(this._level+1)`; `ctx.progress.setCustom('byar', (get().custom?.byar||0)+1)`; `ctx.progress.complete()`; `gsap.delayedCall(1.6, ()=> this._alive && this._buildVillage(ctx, ++this._level))`.
10. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
11. `destroy(ctx)`: enligt "Edge-cases & städning".
12. Registrera i `src/games/registry.js`: `import blixtOchDunder from './blixt-och-dunder/index.js'` och lägg `blixtOchDunder` i `GAMES`-arrayen.
13. `npm run dev`, öppna biblioteket, spela: verifiera drag-placering, tryck-laddning (3 tryck → blå glöd), att två fulladdade moln som nuddar ger en blixt som tänder närmaste lampa, mätaren fylls, firande+regnbåge vid alla tända, hem-knapp, röst-repris, samt att `highestLevel`/`byar` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera till biblioteket → välj "Blixt och Dunder"). Canvas finns; inga uncaught errors i `browser_console_messages`.
- Vid mount är `voiceIntro` satt/spelas ("Dra ihop molnen och tryck för att ladda dem!").
- **Laddning:** tre tryck (pointertap) på samma moln höjer dess `charge` till 1 (testbart via exponerad teststate, t.ex. `window.__barnspel`/`_clouds[i].charge`), och molnets blå glöd blir synlig.
- **Placering:** ett `pointerdown→move→up`-drag på ett moln flyttar dess position inom himmel-bandet (x/y ändras, klampat inom [120,1160]×[130,360]).
- **Blixt + tändning:** när två moln är fulladdade och förs ihop tills de nuddar tänds närmaste otända lampa (en `_lamps[i]._lit` blir true, `_litCount` ökar) och blixt-flash + dunder-ljud spelas. Molnen laddar ur (`charge` → 0).
- **No-fail:** ett tryck på ett oladdat moln ger regn + mjukt ljud, ALDRIG felljud/buzzer/rött/omstart. Ett laddat par som slår utan lampa rakt under tänder ändå närmaste lampa (auto-sikt).
- **Auto-hjälp:** utan interaktion tänds till slut en lampa av sig själv (mätaren rör sig framåt) — spelet kan inte fastna.
- **Klart:** när alla lampor lyser körs firande (regnbåge + konfetti i fxLayer) och `ctx.progress.complete()` anropas exakt EN gång (inget dubbeltrigg via `_resolving`/cooldown vid snabba upprepade blixtar).
- **Progression:** efter en avklarad by är `highestLevel` ökat och `custom.byar` finns; värdena kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- **Städning:** vid retur till biblioteket (hem-knapp) tas ticker-loopen bort och inga tweens/timeouts/partiklar fortsätter logga eller kasta fel (exit mitt under en blixt-flash kraschar inte).
