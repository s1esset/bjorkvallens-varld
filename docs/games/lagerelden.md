# Lägerelden (`lagerelden`)
> Zacke bygger en lägereld i skymningen — barnet lägger på ved och pumpar bälgen så lågorna dansar högre, och håller en marshmallow över glöden tills den blir gyllene och perfekt. Ren mys, ingen fara: elden blir bara större och gladare ju mer man gör.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `lagerelden` | Lägerelden | 🔥 | roligt | mixed | [2,4] | `lagerelden` | "Lägg på ved och pumpa bälgen — så blir elden stor!" |

## Mål & mekanik
Barnet bygger en mysig lägereld och rostar Zacke's marshmallow till gyllene. Tre kontroller styr utfallet (uppfyller kravet ≥2 påverkanskontroller):

1. **Ved (dra):** 3–5 vedpinnar (🪵) ligger i en "vedhög" nere till vänster. Barnet drar en pinne till bålplatsen → den snäpper på högen, **bränslet (`_fuel`) ökar**. Mer ved → högre/bredare/varaktigare låga och längre brinntid.
2. **Bälg (svep/tryck):** en bälg (handpump) nere till höger. Varje **tryck eller svep** ger en luftpust → `_air` ökar momentant och pyser sedan ut. Mer luft → lågan **växer i höjd, antal partiklar och blir vitare/gulare** (het); när luften lägger sig sjunker den tillbaka till en lugn myslåga.
3. **Marshmallow (dra):** Zacke sitter till höger med en pinne + marshmallow (🍡). Barnet **drar marshmallowen** så den hänger över lågan. Ju **närmare lågans hetaste zon** och ju **hetare elden** (mer luft + ved), desto snabbare stiger `_toast` (rostningsgrad 0→1). Vid `_toast ≥ 1` blir den **gyllene** (aldrig svart/bränd).

**Kärnloop:** lägg på lite ved → pumpa bälgen så lågan flammar upp → håll marshmallowen i värmen → den blir gyllene → **firande** (`ctx.progress.complete()`). Sedan en ny, lite större eld (nästa nivå).

**Mål uppnått** = `_toast` har nått 1.0 (gyllene marshmallow). Det räcker att elden brinner; bälgen och mer ved gör det bara **snabbare och roligare**, aldrig nödvändigt — auto-hjälpen garanterar succé (se nedan).

**ALDRIG "brinner upp" / svart marshmallow / game-over.** För mycket ved eller luft ger bara en **större, gladare** eld och **snabbare** gyllene-rostning. Lågan har ett tak (`_air`/`_fuel` klampas) så den aldrig fyller skärmen.

## Skärm-layout (1280x720)
GameHost ritar hem-/repetera-knappar i headern — rita INGA egna. Allt nedan i spelets `_root` (designkoordinater). Håll innehåll under y≈90.

- **Bakgrund:** `createScene('sunset', { ground:true })` som FÖRSTA barn i `_root` (varm skymningsgradient + mark). `eventMode='none'`. (Alternativt `'night'` på högre nivåer för stämning.)
- **Bålplats (eldstad):** en ring av stenar nederst i mitten kring `FIRE_X=640, FIRE_BASE_Y=560`. Rita 6–7 grå `circle`-stenar (`COLORS.inkSoft` ljusad, r≈26) i en ellipsbåge (rx≈140, ry≈40) → ger känslan av en eldstad. En mörk markskugga-ellips under (`fill({color:COLORS.shadow, alpha:0.18})`).
- **Vedhög (källa):** nere till vänster, container vid `(210, 600)`. Innehåller `_fuelMax` vedpinnar (🪵 Text fontSize 70, lätt roterade) staplade. Varje pinne är ett drag-item med osynlig hit-halo `Circle(0,0,60)` (≥96px träffyta).
- **Vedstaplade på bålet:** när en pinne snäpper på elden läggs en 🪵 (fontSize 64) korslagd vid basen (`FIRE_X` ± jitter, y≈568), svagt roterad, så högen växer synligt.
- **Eld (partikellager):** en dedikerad `this._fireLayer = new Container()` centrerad vid `(FIRE_X, FIRE_BASE_Y)`, `eventMode='none'`, `interactiveChildren=false`. Ligger OVANPÅ veden men UNDER marshmallow + bälg. En mjuk **glödhalo** (`Graphics` cirkel r≈90, `fill({color:COLORS.orange, alpha:0.18})`) andas (`breathe`) bakom partiklarna. Partiklarna är små glansiga `Graphics`-cirklar (se Tillgångar) som integreras i ticker.
- **Bälg (kontroll):** nere till höger vid `(1080, 600)`. Container: en brun träkropp (`roundRect` `COLORS.brown`, glansstreck), en handtags-halva som "trycks ihop" vid pump, och 💨/➡️-pil-hint. Osynlig hit-halo `Circle(0,0,100)`. `eventMode='static'`.
- **Zacke + marshmallow:** Zacke (programmatisk: huvud-cirkel `COLORS.orange`-hud, hår, glada prick-ögon + båge-leende) sitter till höger vid `(1140, 470)`, vänd mot elden. Pinnen är ett tunt `Graphics`-streck från Zacke's hand till marshmallowen. **Marshmallowen** (🍡 Text fontSize 64, eller en glansig vit-beige rundad rektangel som tonar mot gyllene) är ett drag-item med hit-halo `Circle(0,0,64)`. Startposition strax framför Zacke (`~960, 470`).
- **"Het zon"-markör (subtil):** valfri svag genomskinlig gul oval över lågans topp (`~FIRE_X, 470`) som visar var marshmallowen rostar bäst; den lyser starkare när elden är het.

Marginaler: ved, bälg och marshmallow har var sin frizon (≥24px) så träffytorna aldrig överlappar.

## Interaktion
Blandad input (`mixed`):

- **Ved → bål (drag, via `lib/DragController.js`):** `this._drag = new DragController({ space:this._root, services:ctx.services })`. Varje vedpinne = `addItem(stickView, {kind:'ved'}, hooks)`; bålet = `addTarget(fireDropZone, ['ved'], {hitRadius:160})`. `fireDropZone` är en osynlig stor cirkel kring elden. Vid lyckad drop: kör `_addFuel()` (öka `_fuel`, lägg en korslagd 🪵 på högen, `audio.sfx('soft')` + liten `puff` av gnistor). **Tap-tap-fallback** följer gratis med DragController (tryck pinne → tryck bål). Efter drop återskapas/efterfylls en ny pinne i vedhögen så det aldrig tar slut.
- **Bälg (tryck + svep):** `bellows.on('pointerdown', ...)` registrerar `pointertap` → en pust (`_pump(strength≈1)`). För **svep**: vid `pointerdown` spara `e.global`, lyssna `globalpointermove`, mät svep-sträcka; vid `pointerup`/`pointerupoutside` → pust med `strength = clamp(sträcka/120, 0.4, 1.6)`. Alltså: ett litet tryck = liten pust, ett stort svep = stor pust. Varje pust: `this._air = Math.min(AIR_MAX, this._air + 0.5*strength)`, animera bälg-handtaget (squash), `audio.sfx('whoosh')`, och spruta upp några extra eldpartiklar direkt (<100ms respons).
- **Marshmallow (drag):** eget pekar-grepp (inte DragController-snäpp, för den ska kunna hänga fritt över elden): `marsh.eventMode='static'`, hit-halo `Circle(0,0,64)`. `pointerdown` → `this._holding=true`, skala 1.1, `audio.sfx('tap')`. `globalpointermove` → flytta marshmallow (klampad inom spelytan, pinnen ritas om från Zacke's hand till marshmallowen). `pointerup`/`pointerupoutside` → `this._holding=false`, mjuk återgång om man släpper (den glider mjukt tillbaka mot en viloposition framför Zacke via gsap, men `_toast` behålls). Marshmallowen kan också **släppas och lämnas hängande** över elden om barnet drar den dit och släpper nära den heta zonen (snäpp till en "håll-punkt" där den stannar och fortsätter rostas).

Alla träffytor ≥96px diameter via osynliga hit-halos. Inga små klickytor, inga förbjudna gester (ingen pinch/dubbeltryck/långtryck).

## Fysik & kalibrering
Ingen matter.js — en **egen, ticker-driven eld-partikel-integrator** (exit-säker, ingen GSAP på Pixi-partiklarna). Allt i `_update(ctx, ticker)` med `const dt = ticker.deltaMS/16.67` (normaliserad till 60 fps).

**Tillstånd:**
- `this._fuel` ∈ [0, FUEL_MAX=6] — antal vedpinnar på elden. Sjunker mycket långsamt (`_fuel -= 0.0008*dt`, klampat ≥ basnivå 0.6 så elden aldrig dör helt → ingen fail). Mer ved = högre `flameTarget`.
- `this._air` ∈ [0, AIR_MAX=3] — momentan luftladdning. Pyser ut varje frame: `this._air *= Math.pow(0.96, dt)` (mjuk decay, ~halveras på ~0.3s). Bälg-pust adderar.
- `this._heat` (härledd) = `BASE_HEAT + this._fuel*0.12 + this._air*0.5` → styr partiklarnas spawn-rate, starthastighet (höjd) och färg.

**Partikel-integrator (per partikel, per frame):**
- Spawn: varje frame skapa `spawn = round((1.4 + this._heat*2.2) * dt)` nya partiklar (klampa total ≤ ~90 för perf). Startposition: nära basen, `x = ±(8..40)` kring 0 (jitter smalnar mot toppen), `y = 0`.
- Hastighet uppåt: `vy = -(1.6 + this._heat*1.4 + Math.random()*0.8)` px/frame; liten sidodrift `vx = (Math.random()*2-1)*0.5` som påverkas av senaste bälg-pust (luft kan luta lågan en aning).
- Integrera: `p.x += p.vx*dt; p.y += p.vy*dt; p.vy *= Math.pow(0.985, dt)` (lätt uppåt-dämpning); livslängd `p.life += dt; p.t = p.life/p.maxLife`.
- Storlek krymper med livet: `r = p.r0 * (1 - 0.7*p.t)`; alpha tonar: `alpha = 1 - p.t`.
- **Färg gul→orange→rök:** interpolera med `lerpColor` (från `lib/scene.js`): tidig/het = gul `0xffe27a` → orange `COLORS.orange (0xff8a3d)` → röd `COLORS.red` → toppen tonar mot grårök `0x9a8b7a` med låg alpha. Hetare eld (`_heat` hög) → fler partiklar håller sig gula/vita längre (förskjut färgkurvan mot `0xfff3b0`).
- Dödas när `p.t ≥ 1` eller `p.y < -lågHöjd`: ta bort ur lager (`p.destroy()`), återanvänd gärna ur en pool. **All partikelrörelse sker i ticker — ALDRIG `gsap.to` på en partikel** (exit-säkert; vid `destroy` rensas hela `_fireLayer`).
- **Lågans topp/höjd** (`flameTopY`) följer `_heat` (lerpad mjukt mot `flameTarget` så den inte hoppar): används både visuellt och för marshmallow-rostningen.

**Marshmallow-rostning (utfall):**
- Varje frame, om marshmallowen är inom den heta zonen (avstånd från lågans hetcentrum `(FIRE_X, flameTopY+20)` < `HOT_R≈150`):
  `this._toast += (0.10 + this._heat*0.18) * proximity * dt/60`, där `proximity = 1 - dist/HOT_R` (0..1).
- `_toast` klampas [0,1]. Marshmallowens färg tonar **vit→gyllene** (`lerpColor(0xfff7e6, 0xE8A93C, _toast)`), aldrig svart. Vid `_toast ≥ 1` → mål uppnått (en gång).
- Är marshmallowen utanför zonen sker ingen rostning (men `_toast` sjunker ALDRIG — ingen bestraffning).

Inga kalibrerade preview-värden behövs (ingen AimLauncher/predictTrajectory används; egen integrator är exakt av konstruktion).

## Återkoppling & belöning
Varje pekning → ljud+bild < 100ms, ENDAST positivt:
- **Ved läggs på:** `audio.sfx('soft')` + en kort gnist-`puff(ctx.fxLayer, FIRE_X, 560, {count:8, color:COLORS.orange})` + lågan hoppar till (höj `flameTarget`). Första veden: `voice.say('Mer ved gör elden stor!')`.
- **Bälg-pust:** `audio.sfx('whoosh')` + bälg-handtaget squashar (`pop`) + ett svall av gnistor uppåt + lågan flammar upp synligt. Första pusten: `voice.say('Blås på elden — titta så den växer!')`.
- **Marshmallow tas/hålls:** `audio.sfx('tap')` vid grepp; medan den rostas ett mjukt sus och en svag glöd-`sparkle` då och då runt marshmallowen; vid `_toast` ~0.5 `voice.say('Snart är den klar!')`.
- **Tom/"fel" pekning** (drar ved utanför bålet, släpper marshmallow i tomma luften): mjuk respons — `wiggle` på objektet + `audio.sfx('soft')`, DragController snäpper veden tillbaka till högen. ALDRIG buzzer/rött/omstart.
- **Klart-firande (gyllene marshmallow):** sätt `this._resolving = true` → `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))` + en extra rad "Gyllene och god! Smaskigt!", marshmallowen pulsar (`pop`) och glittrar (`burst(ctx.fxLayer, marsh.x, marsh.y, {count:16})`), `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})`, en glad 😋 via `floatText`. Sedan `ctx.progress.complete()` (delat firande + klistermärke). Efter ~1.6s (`gsap.delayedCall`, vakta `_alive`) → `_nextFire(ctx)` (nästa nivå).

**Mjuk auto-hjälp (garanterar succé, ingen fail):**
- Om barnet inte gjort något på ~6s (idle): `voice.replayLast()`/`voice.say(this.voiceIntro)` + den mest relevanta kontrollen vinkar (`wiggle`/`breathe` på närmaste vedpinne eller bälgen, eller marshmallowen pulsar).
- Om marshmallowen hålls i värmen men elden är svag, värmer auto-basvärmen (`BASE_HEAT`) ändå långsamt upp `_toast` så den till slut blir gyllene även utan bälg.
- Om barnet håller marshmallowen rätt länge utan att nå mål (`~25s`): höj basvärmen tillfälligt + extra gnistor ("elden tar fart av sig själv") så `_toast` garanterat når 1 inom kort. Inget straff, bara hjälp.

Använda sfx: `tap, soft, whoosh, pop, sparkle/celebrate, correct`. Voice: voiceIntro + 'Mer ved gör elden stor!', 'Blås på elden — titta så den växer!', 'Snart är den klar!', 'Gyllene och god! Smaskigt!', `randomFrom(PRAISE)`.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init.
- Nivåskalning (cyklisk, oändlig lek) — "mer ved / större eld":
  - **Nivå 0–1:** liten eldstad, `FUEL_MAX=4`, en marshmallow. Lär ut ved + bälg + håll.
  - **Nivå 2–3:** större eldstad (bredare stenring), `FUEL_MAX=6`, lite högre `HOT_R`, bakgrund kan växla `'sunset'→'night'` för mys. Lågan kan bli högre.
  - **Nivå 4+:** stor brasa, `FUEL_MAX=6` + två marshmallows att rosta (eller en extra kompis-marshmallow för Elvira) innan firande. Mönstren upprepas med variation.
- Efter `complete()`: `ctx.progress.setLevel(this._level+1)`; `setCustom('marshmallows', n+1)` räknar totalt rostade (frivilligt, ökar bara). Vänta ~1.6s → `_nextFire(ctx)` återanvänder noder (nollställ `_toast=0`, `_fuel=bas`, ny marshmallow vit igen, ev. ny bakgrund/eldstadstorlek). Inga sjunkande värden, ingen synlig poäng.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics` + `lib/scene.js`-bakgrund. Inga externa bild-/ljud-/fontfiler.
- **Emoji (Text):** 🪵 ved, 🍡 marshmallow (eller egenritad glansig rundad rektangel), 💨/➡️ bälg-hint, 😋/⭐/🔥 i firandet.
- **Eldpartiklar:** små glansiga `Graphics`-cirklar (`circle(0,0,r).fill(color)`), färg via `lerpColor` gul→orange→röd→rök; valfri ljus kärna (mindre vit cirkel med låg alpha) för "glans". Glödhalo = stor halvtransparent orange cirkel som `breathe`:ar.
- **Eldstad:** grå sten-`circle`:ar i ellipsbåge + mörk markskugge-ellips (`alpha`).
- **Bälg:** `roundRect` brun träkropp + ljusare glansstreck + rörlig handtagshalva (squash vid pump).
- **Zacke:** `Graphics` cirkel-huvud (hudton), hår, prick-ögon, båg-leende; pinne = tunt `Graphics`-streck (ritas om varje frame mot marshmallow-positionen).
- Bakgrund: `createScene('sunset' | 'night', { ground:true })`.
- Färger ur `theme.js`: `COLORS.orange/orangeDark/red/yellow/brown/inkSoft/cream/shadow`, `PLAYFUL`, samt `lerpColor` från `scene.js`. Firande via `feedback.js`.

## Återanvänd dessa
- `lib/scene.js`: `createScene('sunset'|'night', {...})`, `lerpColor(a,b,t)` (eldfärg + marshmallow-toning).
- `lib/DragController.js`: ved → bål (drag + tap-tap-fallback inbyggt).
- `lib/feedback.js`: `puff`, `sparkle`, `burst`, `pop`, `wiggle`, `breathe`, `floatText`, `bigCelebration` (alla exit-säkra).
- `lib/theme.js`: `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`, `DESIGN_W/H`.
- `lib/swedish.js`: `randomFrom` (beröm/jitter).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress`: `get`, `setLevel`, `setCustom`, `complete`.
- `ctx.ticker` (eld-integrator + idle-timer), `ctx.fxLayer` (firande/gnistor), `gsap` (bälg-squash, idle-vink, fördröjd nivåväxling — ALDRIG på eldpartiklar).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`onComplete`-callbacks (nivåväxling, firande) tidig-returnerar om `!this._alive`.
- `this._resolving = true` när marshmallowen blivit gyllene → ignorera nya pump/drag och stäng av rostning tills `_nextFire`. Förhindrar att `complete()` triggas flera gånger.
- **Eldpartiklar är ticker-drivna, ALDRIG GSAP** → kan aldrig krascha på exit (de lever/dör i `_update`; `destroy` rensar hela `_fireLayer`). Använd en partikelpool/cap (≤~90) så perf håller.
- Klampa `_air ≤ AIR_MAX` och `_fuel ≤ FUEL_MAX` så lågan aldrig fyller skärmen ("aldrig brinner upp"). `_fuel` faller aldrig under basnivå → elden dör aldrig (ingen fail).
- `_toast` sjunker aldrig (marshmallowen kan inte "bli sämre"); blir aldrig svart (färgmål = gyllene).
- Marshmallow släppt i tomma luften → mjuk gsap-återgång mot viloposition; pinnen ritas alltid om mot aktuell position (ingen null-ref).
- Idle-timer i ticker: `this._idle += deltaMS`; vid >6000 ms och ej `_resolving` → röst-repris + vink; nollställ vid varje interaktion (ved/pump/grepp).
- Throttla bälg-/gnistljud (max ~var 120ms) så snabbt pumpande inte spammar audio.
- `destroy(ctx)`: `this._alive=false`; `ctx.ticker.remove(this._tick)`; `gsap.killTweensOf(...)` för bälg, marshmallow, glödhalo, Zacke-pinne, idle-vinkar; avregistrera pekar-lyssnare (bälg + marshmallow); `this._drag?.destroy()`; `this._fireLayer.removeChildren().forEach(p=>p.destroy())`; `this._root?.destroy({children:true})`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/lagerelden/index.js`. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `DragController`, `createScene, lerpColor` från `lib/scene.js`, `puff, sparkle, burst, pop, wiggle, breathe, floatText, bigCelebration` från `lib/feedback.js`, `COLORS, PLAYFUL, FONT, PRAISE` från `lib/theme.js`, `randomFrom` från `lib/swedish.js`.
2. `export default { id:'lagerelden', titleSv:'Lägerelden', icon:'🔥', category:'roligt', input:'mixed', ageRange:[2,4], bundle:'lagerelden', voiceIntro:'Lägg på ved och pumpa bälgen — så blir elden stor!', init, mount, destroy }`.
3. `init(ctx)`: `this._alive=true`; `this._root=new Container()`, `ctx.stage.addChild(this._root)`. Lägg `createScene('sunset',{ground:true})` som första barn. Initiera tillstånd: `_fuel=0.6, _air=0, _toast=0, _idle=0, _resolving=false, _parts=[]`. Läs `this._level`. Bygg eldstad (stenring + markskugga), `this._fireLayer` (centrerad vid `FIRE_X,FIRE_BASE_Y`), glödhalo (+`breathe`), vedhög, bälg, Zacke + marshmallow. Skapa `this._drag = new DragController({space:this._root, services:ctx.services})`; registrera vedpinnar som items och en osynlig bål-drop-zon som target. Koppla bälg- och marshmallow-pekarlogik (`_pump`, `_holding`).
4. Skriv `_addFuel()` (öka `_fuel`, lägg korslagd 🪵, ljud+puff, höj `flameTarget`), `_pump(strength)` (öka `_air`, squash-bälg, whoosh, extra partiklar), `_spawnParticle()`/partikelpool.
5. Skriv `_update(ctx, ticker)`: `dt`-normalisera; decay `_air`/`_fuel`; beräkna `_heat`; lerpa `flameTopY`; spawna + integrera + döda partiklar (rita om varje via `g.clear().circle(...).fill(lerpColor(...))`); uppdatera glödhalo/het-zon; rosta marshmallow (proximity), färga vit→gyllene; rita om Zacke's pinne; idle-timer + auto-hjälp; målkoll (`_toast≥1 && !_resolving → _onGolden(ctx)`).
6. `_onGolden(ctx)`: `_resolving=true`; firande (celebrate-ljud, burst, bigCelebration, floatText 😋, beröm-röst); `ctx.progress.setLevel(this._level+1)`; `ctx.progress.setCustom('marshmallows', (…|0)+1)`; `ctx.progress.complete()`; `gsap.delayedCall(1.6, ()=> this._alive && this._nextFire(ctx))`.
7. `_nextFire(ctx)`: höj `this._level`, nollställ `_toast=0`, `_fuel=bas`, ny vit marshmallow, ev. ny bakgrund/eldstadstorlek/`FUEL_MAX`; `_resolving=false`.
8. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`. Lägg `this._tick=(t)=>this._update(ctx,t)`, `ctx.ticker.add(this._tick)`.
9. `destroy(ctx)`: enligt "Edge-cases & städning".
10. Registrera i `src/games/registry.js`: `import lagerelden from './lagerelden/index.js'` och lägg `lagerelden` i `GAMES`.
11. `npm run dev`, öppna biblioteket, spela: verifiera att ved höjer lågan, bälgen flammar upp elden, marshmallowen blir gyllene (aldrig svart), firande + sticker, hem-knapp, röst-repris, och att `highestLevel`/`marshmallows` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera till biblioteket → "Lägerelden"). Canvas finns, inga uncaught errors.
- `voiceIntro` är satt och en svensk röstinstruktion spelas vid mount.
- **Ved påverkar lågan:** en `browser_drag` (eller pointer down→move→up) av en vedpinne till bålet ökar `_fuel` och antal partiklar/lågans höjd (verifiera via exponerat teststate, t.ex. `window.__barnspel`-hook eller `_fuel`/`_parts.length`).
- **Bälg påverkar lågan:** ett tryck/svep på bälgen ökar `_air` momentant och ger fler/högre/gulare partiklar (`_air > 0` direkt efter; partikelantal ökar).
- **Marshmallow rostar mot mål:** när marshmallowen hålls i den heta zonen stiger `_toast` mot 1 och dess färg tonar mot gyllene; utanför zonen stiger den inte (men sjunker aldrig).
- **Tap-tap-fallback:** tap på vedpinne → tap på bålet lägger på ved utan drag.
- **Ingen fail-state:** ingen mängd ved/luft ger svart marshmallow, "brinner upp", buzzer, rött eller game-over; lågan klampas (fyller aldrig skärmen) och dör aldrig (`_fuel ≥ bas`).
- **Auto-hjälp:** håller man marshmallowen länge når `_toast` 1 även utan bälg (basvärme), och rundan firas.
- **Firande exakt en gång:** vid `_toast≥1` körs firande + `ctx.progress.complete()` precis en gång (skyddat av `_resolving`, även vid snabba upprepade tryck).
- **Progression sparas:** efter en gyllene marshmallow är `highestLevel` ökat och `custom.marshmallows` ökat; värdena kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- **Städning:** vid retur till biblioteket (hem-knapp) tas ticker bort, eldpartiklarna förstörs och inga tweens/timeouts fortsätter logga eller kasta fel (exit mitt under firande/animation kraschar inte).
