# Bobos Bowling (`bowling`)
> Barnet siktar och laddar ett tungt klot, släpper — och ser käglorna spreta åt alla håll i en härlig krasch. Maskoten Bobo hejar, och med bumper-knappen kan ingen boll någonsin "missa", så varje kast slutar i jubel.

## Metadata
| Fält | Värde |
|---|---|
| id | `bowling` |
| titleSv | Bobos Bowling |
| icon | 🎳 |
| category | fysik |
| input | drag |
| ageRange | [3, 5] |
| bundle | `bowling` |
| voiceIntro | Dra klotet bakåt och släpp — slå alla käglor! |

## Mål & mekanik
Top-down bowling. Barnet **siktar (riktning) + laddar (kraft)** genom att dra det tunga klotet bakåt (slangbella) och släppa. Klotet rullar uppför banan och **välter käglorna 🎳** med riktig matter.js-fysik (kollision + momentum). Målet: **slå ALLA käglor** i banan.

Kärnloop:
1. Klotet (⚪/🎳) ligger nederst på banan (vid barnet). Käglor står i en triangel högst upp. En **kägelmätare** visar hur många som står kvar.
2. Barnet drar klotet **bakåt/nedåt** (slangbella) → en prickad bana visar var klotet hamnar. Släpp → klotet skjuts uppåt med fart ∝ dragvektorn (clampad).
3. Klotet rullar upp, krockar med käglorna; de välter (matter.js dynamiska kroppar). Varje vält kägla: `pling` + liten puff, mätaren minskar.
4. När **alla** käglor är nere: firande (`bigCelebration`), Bobo jublar, `ctx.progress.complete()`, auto-reset → ny omgång efter ~1,8s.
5. **Två tydliga kontroller som ändrar utfallet:** (a) sikte+kraft via dragvektorn, (b) en **bumper-knapp** (på = mjuka studsräcken längs kanterna så klotet aldrig hamnar i rännstenen). Bumpern syns visuellt (lysande räcken tänds/släcks) och ändrar hur klotet studsar.

No-fail: klotet kan aldrig "misslyckas". Med bumper PÅ studsar klotet tillbaka in mot käglorna. Med bumper AV finns rännstenar, men om klotet stannar eller passerar käglorna utan att slå alla, kommer **mjuk auto-hjälp**: en liten "vindpust" (`setWind`) + en knuff välter de kvarvarande käglorna med ett fniss. Resultatet är alltid en fullträff att fira.

## Skärm-layout (1280x720)
Designkoordinater 1280×720. GameHost ritar headern (hem-/repetera-knapp) överst — rita INGA egna. Allt spelinnehåll under y≈100.

- **Bakgrund:** `createScene('warm', { ground:false })` som FÖRSTA barn i `_root` (varm bowlinghall-känsla), `eventMode='none'`.
- **Bana (lane):** en ljus, glansig rektangel med rundade hörn. `roundRect(340, 110, 600, 580, 28).fill(COLORS.cream).stroke({width:8, color:COLORS.yellow})`. Mitt-glansstrimma: smal vit `roundRect(620, 120, 40, 560, 20).fill({color:0xffffff, alpha:0.35})`. Inre spelfält = x∈[360, 920], y∈[120, 680].
- **Rännstenar (gutters):** två mörkare kanaler utanför banan: `roundRect(300, 110, 44, 580, 18).fill({color:COLORS.brown, alpha:0.30})` vid vänster (x≈300–344) och spegelvänt vid höger (x≈936–980). Dekorativa; de fysiska väggarna beskrivs i Fysik-sektionen.
- **Bumper-räcken (toggle-visuella):** två lysande rundade staplar precis innanför rännstenarna (vänster x≈352, höger x≈928), `roundRect(346, 130, 14, 540, 7).fill({color:COLORS.blue})` med glöd (alpha-puls). Synliga + `alpha 1` när bumper PÅ; `alpha 0.12` (nedtonade) när AV. Eventmode `none`.
- **Käglor (🎳):** triangel högst upp, apex (huvudkägla) närmast barnet. Varje kägla = Container (mjuk skuggellips + 🎳 emoji-`Text` fontSize 72, anchor 0.5), kopplad till en matter-kropp. Positioner: se Progression (3/6/10 käglor). Triangelns mitt ≈ (640, 235).
- **Klot (⚪):** startposition **x:640, y:600**. Container: vit/blå glansig cirkel `circle(0,0,46).fill(COLORS.blue)` + liten vit högdager `circle(-14,-14,14).fill({color:0xffffff,alpha:0.6})` + tre "fingerhål" (3 små mörka cirklar). Visuell radie 46, **osynlig hit-halo** via `hitArea = new Circle(0,0,90)` (≥96px träffyta). Markskugga (mörk ellips alpha 0.18) under klotet.
- **Kägelmätare:** uppe till vänster under headern, x≈150, y≈140. En rad små 🎳-prickar (en per kägla) som tonas till grå när de välts — INGEN siffra som "sjunker" känslomässigt; bara glada prickar. Alternativt en glad stapel som FYLLS med stjärnor när käglor faller (positiv inramning).
- **Bumper-knapp:** stor barnknapp (`lib/Button.js`) nere till höger, x≈1130, y≈630, minst 120×120 träffyta. Ikon: 🛟 (på) / växlar utseende. Text "Kantstöd". Tryck växlar bumper på/av med ljud + studs.
- **Bobo (maskot):** liten Bobo (`lib/mascot.js`) nere till vänster vid x≈150, y≈620 som hejar vid kast och jublar vid strike.

## Interaktion
**Sikta + kraft** sköts av `lib/launcher.js` `AimLauncher` (slangbella). **Bumper-toggle** är en separat knapp. Inga andra gester.

- `this._launcher = new AimLauncher({ target: this._ball, root: this._root, audio: ctx.services.audio, slingshot: true, maxPower: 30, powerScale: 0.16, minPower: 9, hitRadius: 90, getOrigin: () => ({ x:this._ball.x, y:this._ball.y }), previewGravity: 0, previewDamp: 0.99, bounds: this._previewBounds(), defaultAim: () => ({ x: this._pinCenter.x, y: this._pinCenter.y }), trailColor: COLORS.blue, onGrab: () => { this._ball.scale.set(1.1); ctx.services.audio.sfx('tap') }, onAim: () => {}, onLaunch: (v) => this._fire(ctx, v) })`
  - **slangbella:** barnet drar klotet NEDÅT/bakåt → klotet skjuts UPPÅT mot käglorna. Prickad bana visar flykten och studsar mot bumper-/rännstenskanterna (via `bounds.leftX/rightX`).
  - **tap-fallback** (för de minsta): ett litet tryck (drag <16px) skjuter klotet mot `defaultAim` (kägeltriangelns mitt) med ~62% kraft → träffar alltid. Inget barn fastnar.
  - **för svagt** drag clampas upp till `minPower` så klotet alltid når käglorna.
- **`_fire(ctx, v)`:** sätt klotets matter-kropp i rörelse `nudge(this._ballBody, v.vx, v.vy)` (eller `Body.setVelocity`). Spärra nytt sikte tills kastet är klart: `this._launcher.setEnabled(false)`, `this._rolling = true`. Ljud `whoosh` (sköts av launcher). Bobo hejar.
- **Bumper-knapp** (`pointertap`): `this._toggleBumper(ctx)` → växla `this._bumperOn`, lägg till/ta bort de två bumper-väggkropparna (se Fysik), uppdatera räckenas alpha (`gsap` på {}-proxy eller direkt alpha), uppdatera `this._launcher.setPreview({ bounds: this._previewBounds() })` så pricklinjen matchar nya väggar, ljud `pop`, liten `pop(button)`-puls. Får växlas när som helst (även mitt i kast — ofarligt).
- Hit-areor: klot r=90; bumper-knapp ≥120×120. Inga små klickytor. Käglorna är INTE klickbara (bara fysik).

## Fysik & kalibrering
`src/lib/physics.js` `PhysicsWorld` (matter.js), **top-down** → `gravityY: 0`. Skapa UTAN standardväggar och bygg egna lane-väggar:
- `this._phys = new PhysicsWorld({ gravityY: 0, gravityX: 0, walls: [] })`.
- **Klot:** `this._ballBody = this._phys.circle(640, 600, 46, { ...MATERIALS.heavy, frictionAir: 0.012, label:'ball' })`. Tungt → mycket momentum genom käglorna, men `frictionAir 0.012` bromsar mjukt så det inte studsar i evighet. `this._phys.link(this._ballBody, this._ball)`.
- **Käglor:** `MATERIALS.light` (lätta → välter lätt), liten radie-kropp `circle(px, py, 26, { ...MATERIALS.light, frictionAir: 0.02, label:'pin' })`, länkad till sin Container. Lätt friktion mot banan så de glider/snurrar iväg snyggt och stannar.
- **Lane-väggar (alltid på):** två statiska kroppar som banans yttergräns (rännstenens utsida): `this._phys.rectangle(312, 400, 24, 580, { isStatic:true, restitution:0.2, label:'wall' })` (vänster, x≈312) och spegel höger (x≈968). Topp- och bottenvägg behövs inte (klotet plockas bort när det passerar toppen, se nedan).
- **Bumper-väggar (toggle):** två statiska, **studsiga** kroppar precis innanför rännstenarna: vänster `rectangle(360, 400, 16, 540, { isStatic:true, restitution:0.75, label:'bumper' })`, höger spegel (x≈920). Skapa via `this._phys.rectangle(...)` när bumper slås PÅ, ta bort med `this._phys.removeBody(b)` när AV. När PÅ smalnar spelfältet (klotet studsar in mot käglorna → garanterad träff). När AV kan klotet rulla ut i rännstenen (men auto-hjälpen räddar).
- **Vält-detektion:** i ticker, för varje stående kägla, om `Math.hypot(body.position.x - startX, body.position.y - startY) > 38` ELLER `body.speed` hög → markera `pin._down = true`, ta bort från `this._standing`, spela `pling` + `puff(ctx.fxLayer, view.x, view.y, {count:6, color:COLORS.yellow})`, uppdatera mätaren. (Alternativt `this._phys.onCollision` som matchar `ball`↔`pin` för ljudet, men positionsförskjutning är robustast för "räknas som vält".)
- **Kast klart:** klotet "klart" när (a) det passerar käglelinjen och fortsätter upp förbi y<120, eller (b) `this._ballBody.speed < 0.4` i ~0,6s (stannat). Då: kolla om alla käglor nere → strike-firande; annars **auto-hjälp** (se nedan), sedan återställ klot till start, `this._launcher.setEnabled(true)`, `this._rolling=false`.

**Kalibrering (pricklinjen måste matcha flykten):** `gravityY = 0` → `previewGravity = 0.2778 × 0 = 0` (ingen nedåtkurva, top-down). Luftbroms: klotets `frictionAir = 0.012` → `previewDamp = 1 − 0.012 = 0.988` (avrunda 0.99). `previewWind = 0` (ingen vind under kast). `bounds`-väggar i `predict` = inre spelfältets kanter beroende på bumper: `_previewBounds()` returnerar `{ leftX: this._bumperOn ? 376 : 324, rightX: this._bumperOn ? 904 : 956, restitution: this._bumperOn ? 0.75 : 0.2 }` (matchar väggkropparnas inneryta + klotradie). Uppdatera via `setPreview({ bounds })` vid varje bumper-växling. **Ingen `floorY`** (top-down). Detta gör att pricklinjen följer klotets verkliga, raka, lätt-bromsande studsbana till ~några px.

**Auto-hjälp (vind):** om kastet är klart och käglor står kvar: `this._phys.setWind(0.0006 * dir, -0.0004)` en kort stund (riktad mot de kvarvarande käglorna) + en direkt `nudge` på varje kvarvarande kägla mot kameran-bort så de tippar, `voice.say('Nästan! Pust — där föll de!')`, `audio.sfx('soft')`, små `sparkle`. Nollställ vinden (`setWind(0,0)`) när alla nere. Garanterar strike utan att kännas som fusk (det ser ut som en rolig vindpust).

## Återkoppling & belöning
Varje pekning → ljud+bild <100ms:
- Greppa klot: `audio.sfx('tap')` + skala-pop (1.1) (via `onGrab`).
- Sikta: prickad blå bana ritas live (launcher).
- Släpp/kast: `audio.sfx('whoosh')` (launcher) + Bobo hejar (`bounceIn`/`pop` på mascot).
- Kägla välter: `audio.sfx('pling')` (var 3:e `'pop'` för variation) + `puff(ctx.fxLayer, x, y, {count:6, color:COLORS.yellow})` + kägel-Container snurrar/glider via matter.
- Bumper-växling: `audio.sfx('pop')` + räckena tänds/släcks (alpha-tween) + `pop(button)`.
- **Strike (alla nere):** `audio.sfx('correct')` direkt + `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE) + ' Alla käglor!')`, `feedback.bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})` + `burst(ctx.fxLayer, 640, 300, {count:18})`, Bobo hoppar.
- **Idle-recue:** ingen interaktion på ~6s med klotet stilla → `voice.replayLast()` (eller `voice.say(this.voiceIntro)`) + klotet pulserar en gång (`pop`) som vink om att dra.
- **Aldrig** buzzer, rött, "miss" eller game over. En klen knuff eller rännstens-rull leder bara till den glada auto-pusten.

Använda sfx: `tap, whoosh, pling, pop, soft, correct, celebrate`. Voice: voiceIntro, `randomFrom(PRAISE)+' Alla käglor!'`, `'Nästan! Pust — där föll de!'`.

`ctx.progress.complete()` anropas EN gång per strike (skyddat av `this._resolving`). Direkt efter: `ctx.progress.setLevel(this._level + 1)` och `setCustom('strikes', n+1)`.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init; styr antal käglor + banbredd.
- Kägel-layouter (triangel, apex nedåt mot barnet, mitt ≈640):
  - **Nivå 0–1:** **3 käglor** i triangel (apex (640,300), bak-rad (596,236) & (684,236)). Bred bana, bumper default **PÅ**. Lär ut kastet.
  - **Nivå 2–3:** **6 käglor** (rader 1+2+3: apex (640,310); (608,250),(672,250); (576,190),(640,190),(704,190)). Bumper default PÅ.
  - **Nivå 4–5:** **10 käglor** (full triangel 1+2+3+4, radavstånd 60px, kägelavstånd 64px, centrerad på x=640, främsta y≈330). Bumper default AV (men knappen finns).
  - **Nivå 6+:** 10 käglor + något smalare bana (flytta lane-/bumper-väggar 30px inåt, aldrig så smalt att klotet inte får plats: min spelfältsbredd ≈ klotdiameter×3). Variation via liten jitter (±10px) med `randomFrom`/Math.random. Därefter upprepas mönstren.
- Efter strike: `setLevel(this._level+1)`, vänta ~1,8s (`gsap.delayedCall`, vakta `this._alive`), `_loadLevel(ctx, ++this._level)` återanvänder noder (återställ klot, bygg ny kägel-layout, nollställ mätare). Oändlig lek.
- `setCustom('strikes', n)` räknar totala strikes (frivilligt). INGEN synlig poäng som kan sjunka, ingen timer.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics` + delade lib-helpers. Inga externa bild-/ljudfiler.
- Emoji: 🎳 (käglor + brick-ikon), 🛟 (bumper-knapp), valfri ⭐/🎉 i firande (annars sköter `bigCelebration`/`burst`).
- Graphics: `createScene('warm')`-bakgrund; bana (glansig `roundRect` + mittstrimma); rännstenar (mörka `roundRect`); lysande bumper-räcken (`roundRect` + alpha-puls); klotet (glansig blå cirkel + vit högdager + 3 fingerhål + markskugga); kägelmätarens prickar; mjuka skuggellipser under käglor/klot.
- Ljud via `ctx.services.audio.sfx`, röst via `ctx.services.voice.say`. Firande via `feedback.bigCelebration/burst/puff/sparkle`.

## Återanvänd dessa
- `lib/launcher.js` `AimLauncher` (slangbella, sikte+kraft, prickad bana, tap-fallback) — KALIBRERAD: `previewGravity:0`, `previewDamp:0.99`, dynamiska `bounds` via `setPreview`.
- `lib/physics.js` `PhysicsWorld` (`circle/rectangle`, `MATERIALS.heavy/light`, `removeBody`, `setWind`, `link`, `update`, exit-säker `destroy`) + `nudge`/`Body.setVelocity`.
- `lib/scene.js` `createScene('warm')` (bakgrund som första barn).
- `lib/feedback.js` — `bigCelebration`, `burst`, `puff`, `sparkle`, `pop`, `wiggle`, `bounceIn`.
- `lib/Button.js` — bumper-knapp (hit-halo, studs, ljud).
- `lib/mascot.js` — Bobo.
- `lib/theme.js` — `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`, `DESIGN_W/H`.
- `lib/swedish.js` — `randomFrom` (beröm + jitter).
- `ctx.services.audio.sfx`, `ctx.services.voice.say/replayLast`, `ctx.progress` (`get/setLevel/complete/setCustom`), `ctx.ticker`, `ctx.fxLayer`, `gsap`.

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`setTimeout`/auto-hjälp-callbacks och ticker-loopen tidig-returnerar `if (!this._alive) return`.
- **`this._resolving`-skydd:** sätt `true` när en strike registreras → ignorera ny vält-räkning och blockera dubbel `complete()` tills nästa nivå laddas. `this._rolling` blockerar nytt sikte medan klotet är i rörelse (`launcher.setEnabled(false)`).
- Klotet får aldrig lämna banan permanent: när det passerar toppen (y<110) eller stannar → kasträkning + återställ till (640,600) med `Body.setPosition`/`Body.setVelocity(0,0)`. Clampa även max-fart vid `_fire` om nödvändigt.
- Bumper-väggar: håll referenser (`this._bumperBodies`) så de kan tas bort exakt; växla aldrig så att väggar dubbleras (vakta `this._bumperOn`).
- Throttla studs-/vält-ljud (max ~120ms) så en kaskad av käglor inte spammar audio.
- Nollställ auto-hjälp/vind (`setWind(0,0)`) vid varje nytt kast och i `destroy`.
- `destroy(ctx)`: `this._alive=false; ctx.ticker.remove(this._tick); this._launcher?.destroy(); this._phys?.destroy(); gsap.killTweensOf(this._ball); gsap.killTweensOf(this._root); kill tweens på käglor/räcken/knapp/mascot; this._root?.destroy({children:true})`. Spara tick-referensen (`this._tick`).

## Steg-för-steg bygginstruktion
1. Skapa `src/games/bowling/index.js`. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `PhysicsWorld, MATERIALS, nudge, Body` från `../../lib/physics.js`, `AimLauncher` från `../../lib/launcher.js`, `createScene` från `../../lib/scene.js`, `bigCelebration, burst, puff, sparkle, pop, wiggle, bounceIn` från `../../lib/feedback.js`, `Button` från `../../lib/Button.js`, `makeMascot` (Bobo) från `../../lib/mascot.js`, `COLORS, FONT, PRAISE` från `../../lib/theme.js`, `randomFrom` från `../../lib/swedish.js`.
2. `export default { id:'bowling', titleSv:'Bobos Bowling', icon:'🎳', category:'fysik', input:'drag', ageRange:[3,5], bundle:'bowling', voiceIntro:'Dra klotet bakåt och släpp — slå alla käglor!', init, mount, destroy }`.
3. `init(ctx)`: `this._alive=true`; `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Lägg `createScene('warm', {ground:false})` som första barn. Rita bana, rännstenar, bumper-räcken, kägelmätare. Skapa klot-Container (`_makeBall`) med markskugga. Skapa `this._phys = new PhysicsWorld({ gravityY:0, walls:[] })`, bygg lane-väggar, koppla klot-kroppen. Skapa bumper-knapp (`Button`) med `_toggleBumper`. Skapa Bobo. Läs `this._level`. Anropa `_loadLevel(ctx, this._level)` (bygger käglor + sätter bumper-default). Skapa `this._launcher` (se Interaktion). Lägg ticker: `this._tick=(t)=>this._update(ctx,t)`, `ctx.ticker.add(this._tick)`.
4. `_loadLevel(ctx, level)`: rensa gamla kägel-kroppar+vyer, bygg ny triangel (positioner per nivå), spara `this._standing` + start-positioner, sätt `this._pinCenter`, återställ klot till (640,600) och kropp-fart 0, nollställ mätare, `this._resolving=false`, `this._rolling=false`, `this._launcher?.setEnabled(true)`, sätt bumper-default och `setPreview({bounds:_previewBounds()})`.
5. `_makeBall()`: glansig blå cirkel + högdager + 3 fingerhål + skugga; `hitArea = new Circle(0,0,90)`. (AimLauncher sätter eventMode/pointerdown.)
6. `_fire(ctx, v)`: `nudge(this._ballBody, v.vx, v.vy)`, `this._rolling=true`, `this._launcher.setEnabled(false)`, Bobo hejar, nollställ idle-timer.
7. `_toggleBumper(ctx)`: växla `_bumperOn`; lägg till/ta bort bumper-väggkroppar; tweena räckenas alpha; `this._launcher.setPreview({bounds:_previewBounds()})`; `audio.sfx('pop')`; `pop(button)`.
8. `_update(ctx, t)`: `this._phys.update(t.deltaMS)`; vält-detektion (positionsförskjutning) → `pling`+puff+mätare; kollkast-klart (klot passerat toppen ELLER stannat) → om alla nere `_strike(ctx)`, annars `_autoHelp(ctx)` sedan återställ klot+`setEnabled(true)`; idle-timer (>6s stilla → recue). Allt bakom `if(!this._alive) return`.
9. `_strike(ctx)`: `this._resolving=true`; ljud+voice; `bigCelebration`+`burst`; `ctx.progress.setLevel(this._level+1)`; `ctx.progress.setCustom('strikes', n+1)`; `ctx.progress.complete()`; `gsap.delayedCall(1.8, ()=> this._alive && _loadLevel(ctx, ++this._level))`.
10. `_autoHelp(ctx)`: rikta `setWind` + `nudge` kvarvarande käglor, `voice.say('Nästan! Pust — där föll de!')`, `soft`+`sparkle`; nollställ vind när alla nere (nästa tick fångar dem → leder ändå till `_strike`).
11. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
12. `destroy(ctx)`: enligt städnings-checklistan.
13. Registrera i `src/games/registry.js`: `import bowling from './bowling/index.js'` + lägg `bowling` i `GAMES`.
14. `npm run dev`, öppna biblioteket, spela: verifiera sikte+kraft, prickad bana matchar flykten, käglor välter, bumper-knappen ändrar studsen, strike-firande, auto-pust när käglor står kvar, tap-fallback, hem-knapp, röst-repris, och att `highestLevel`/`strikes` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera bibliotek → "Bobos Bowling"). Canvas finns; inga uncaught errors/warnings i `browser_console_messages`.
- `voiceIntro` är satt och en svensk röstinstruktion triggas vid mount.
- Klotet reagerar på drag: en pointer down→move→up (slangbella bakåt) på klotets position skjuter klotet uppåt — klotkroppens y minskar märkbart efter släpp (verifiera via exponerat teststate eller snapshot-skillnad).
- Käglor välter: efter ett kast mot triangeln minskar antalet stående käglor (`this._standing.length` minskar / mätaren tonar prickar).
- Bumper-knapp ändrar utfallet: med bumper PÅ studsar ett snett kast tillbaka in i banan (klotet stannar inom spelfältet); knappen växlar `_bumperOn` och pricklinjens `bounds` uppdateras.
- Pricklinje matchar flykt (kalibrering): med `previewGravity:0`/`previewDamp:0.99` följer den prickade banan klotets verkliga (raka, lätt-bromsande) väg och dess studs mot bumpern — inga uppenbara avvikelser.
- Tap-fallback: ett kort tryck på klotet (drag <16px) skjuter mot kägeltriangelns mitt och slår käglor — inget barn fastnar.
- No-fail: ett mycket svagt eller snett kast leder ALDRIG till felljud/buzzer; om käglor står kvar kommer auto-pusten och alla faller → strike firas ändå.
- Strike: när alla käglor är nere triggas firande (konfetti i fxLayer) och `progress.complete()` anropas exakt EN gång (ingen dubbeltrigg via `_resolving` vid snabba tryck).
- Progress sparas: efter en strike är `highestLevel` ökat och `custom.strikes` finns kvar i localStorage (`pwagames.save.v1`) efter sidladdning.
- Städning: vid retur till biblioteket (hem-knapp) tas ticker bort, `_phys.destroy()`/`_launcher.destroy()` körs, inga tweens/timeouts fortsätter logga eller kasta fel.
