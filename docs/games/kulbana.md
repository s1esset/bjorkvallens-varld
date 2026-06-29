# Kulbanan (`kulbana`)
> Barnet bygger sin egen lilla kulbana — drar lutande ramper och en studsplatta på plats, vrider dem rätt, trycker SLÄPP och jublar när kulan rullar, studsar och plumsar ner i hinken. Ren ingenjörsglädje à la "Incredible Machine" för småbarn, helt utan risk att misslyckas.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `kulbana` | Kulbanan | 🟡 | pussel | drag | [3,5] | `kulbana` | "Lägg ramperna så kulan rullar ner i hinken! Tryck sedan på släpp." |

> OBS: `category: 'pussel'` ger gul brickfärg i biblioteket (`CATEGORIES.pussel`). Inputtypen är `drag` (drag av delar) men spelet har även rikligt med tap (vrid-knapp, släpp-knapp, tap-tap-flytt).

## Mål & mekanik
Barnet bygger en bana som leder en kula från ett **utsläpp uppe till vänster** ner i en **hink 🪣** nere till höger. Kulan faller **inte** rakt ner i hinken — barnet MÅSTE påverka banan för att lyckas.

**Två (tre) tydliga kontroller som ändrar utfallet:**
1. **Placering (drag):** dra lutande ramper, en tratt och en studsplatta från "Delar"-hyllan ut i banan, var som helst i fältet (fri placering, ej snäpp-till-ruta).
2. **Rotation (tap):** varje ramp/studsplatta har en stor **vrid-knapp ↻**. Tryck → vinkeln kliver 15° i taget inom [−60°, +60°]. Lutningen avgör vart kulan rullar.
3. **Studsplatta (val):** en valbar studsplatta (hög studs) kan skjuta kulan över ett gap — extra påverkan på högre nivåer.

**Kärnloop:**
1. Kulan vilar (frusen) vid utsläppet uppe till vänster.
2. Barnet drar ut ramper, vrider dem, finjusterar tills banan ser rätt ut.
3. Barnet trycker **SLÄPP ⬇** → kulan blir dynamisk (matter.js), faller, rullar längs ramperna, studsar mjukt och far mot hinken.
4. **Kulan i hinken** → firande, `ctx.progress.complete()`, ny (svårare) bana efter ~1,5 s.
5. **Missar är roliga, aldrig fel:** når kulan golvet utan att hamna i hinken, eller blir den stillaliggande, så studsar den mjukt med ett "Hoppsan!", återvänder själv till utsläppet, och barnet får dra om ramperna och trycka släpp igen — **oändligt många försök**.
6. **Mjuk auto-hjälp som GARANTERAR framgång:** efter 3 missar på samma bana lutas/flyttas den ramp som ligger närmast hinken automatiskt en aning rätt (en vänlig "jag hjälper till"); räcker inte det heller glider kulan hela vägen hem av sig själv (gsap) och rundan firas ändå. Ingen "game over", ingen poäng som sjunker, ingen straff-timer.

## Skärm-layout (1280x720)
Designkoordinater 1280×720; `ctx.stage` är redan letterbox-skalad/centrerad. GameHost ritar header (hem-/repetera-knapp) överst — rita INGA egna. Håll spelinnehåll under y≈90. Allt nedan ligger i spelets `this._root`.

- **Bakgrund:** `createScene('sky', { ground:false })` som FÖRSTA barn i `_root` (dekorativ, `eventMode='none'`). Ljus himmel + drivande moln + sol.
- **Banfält (logiskt):** x ∈ [60, 1220], y ∈ [110, 700]. Fysik-väggar (osynliga) längs vänster (x=60), höger (x=1220) och golv (y≈710) skapas av `PhysicsWorld`.
- **Delar-hylla ("bricka"):** translucent panel nederst `roundRect(48, 612, 1184, 96, 26).fill({color:COLORS.cream, alpha:0.85}).stroke({width:5, color:COLORS.yellow, alpha:0.7})`. Liten etikett-emoji 🧰 + (valfri) text "Delar" uppe i vänstra hörnet. Här vilar delarna vid start; `eventMode='none'` på själva panelen (delarna ovanpå är interaktiva).
- **Utsläpp / chute:** uppe till vänster vid (300, 150). Rita en liten lutande spout: `roundRect(-60,-16,120,32,16).fill(COLORS.brown).stroke({width:5,color:0x6e4429})` roterad ~12°, med en mörk "mynning" i nederkanten. Kulan startar vid (300, 168).
- **Kula 🟡:** glansig gul cirkel (Graphics, INTE emoji för skarp kant): `circle(0,0,26).fill(COLORS.yellow).stroke({width:4,color:COLORS.orangeDark})` + en liten vit högdager `circle(-8,-9,7).fill({color:0xffffff,alpha:0.7})`. Visuell radie 26; fysikradie 26. Container med en mjuk markskugga-ellips under (mörk alpha 0.15).
- **Hink 🪣:** nivåberoende position (se Progression), t.ex. (980, 558) på nivå 0. Rita en hink-kropp: `roundRect(bx-78, by-40, 156, 110, 18).fill(COLORS.blue).stroke({width:6,color:0x2f7fb8})` + en ljusare innerkant + emoji 🪣 (Text, fontSize 96, anchor 0.5) ovanpå för charm. **Mål-mun (logisk):** rektangel x ∈ [bx−66, bx+66], y ∈ [by−54, by−6]. **Fångväggar (fysik):** två tunna statiska rektanglar som hinkkanter (vänster x=bx−72, höger x=bx+72, höjd 100, bredd 14) så en kula som anländer i sidled faktiskt fastnar i hinken i stället för att studsa förbi. En mjuk gul **glödring** `circle(bx, by-30, 86).stroke({width:5,color:COLORS.yellow,alpha:0.5})` markerar målet.
- **Delar (banbitar), nivåberoende antal:** börjar parkerade på hyllan (y≈660), barnet drar upp dem i fältet:
  - **Ramp (planka):** container, visuell `roundRect(-100,-15,200,30,14).fill(COLORS.brown).stroke({width:5,color:0x6e4429})` + ljus ovankant-remsa (alpha 0.25). Fysik = statisk rektangel 200×30. Pivot/anchor i mitten (0,0). Bär en **vrid-knapp** (se nedan) fäst vid högra änden (~x=+120 lokalt).
  - **Studsplatta:** container, `roundRect(-70,-16,140,32,14).fill(COLORS.teal).stroke({width:5,color:0x3f9a96})` + 3 "fjäder"-streck (zigzag, pink alpha 0.6) som signalerar studs. Fysik = statisk rektangel 140×32 med hög restitution. Egen vrid-knapp.
  - **Tratt (endast högre nivåer):** container med två korta plankor i V-form (vänster planka roterad +35°, höger −35°, vardera 120×26), centrerar kulan mot mitten. Fysik = TVÅ statiska rektanglar. Ingen vrid-knapp (flyttas bara).
- **Vrid-knapp ↻ (per roterbar del):** cirkel `circle(0,0,40).fill(COLORS.orange).stroke({width:5,color:COLORS.orangeDark})` + ↻ (Text fontSize 44, anchor 0.5). Sitter en bit ut från delens ände. Visuell radie 40, **osynlig hit-halo radie 70** via `hitArea = new Circle(0,0,70)` (≥96px träffyta). `eventMode='static'`.
- **SLÄPP-knapp ⬇:** stor knapp nere i mitten-vänster, t.ex. (300, 660) ELLER fast vid (640, 60-höjd)? Placera vid (160, 150) intill utsläppet: `roundRect(-86,-52,172,104,28).fill(COLORS.green).stroke({width:6,color:COLORS.greenDark})` + text "SLÄPP" (FONT.display, fontSize 34, vit) + ⬇. Träffyta ≥96px (knappen är 172×104) + hit-halo. Använd gärna `lib/Button.js` om dess API passar; annars bygg som Graphics + `pointertap`.

Marginaler: minst 24 px mellan delar och väggar; på nivå 0 finns alltid en lösning där en enda ramp räcker.

## Interaktion
**Tillåtna gester:** tap + enkel-drag (fri placering) + tap-tap-fallback. INGA dubbeltryck/långtryck/pinch/rotationsgest. (Rotation görs via tap på ↻-knappen — aldrig en vrid-gest.)

**Drag av delar (fri placering — använd EJ DragController, som snäpper till mål):** egen pointer-logik per del-container, samma stil som `spara-linjen`:
- `part.eventMode='static'`, `part.cursor='pointer'`, generös `hitArea` (rektangel något större än delen, minst 96px hög).
- `pointerdown` på delen → `this._dragging = part`, höj z-index, skala-pop 1.08, ljud `audio.sfx('tap')`. Spara greppoffset via `_root.toLocal(e.global)`.
- `globalpointermove` (registrerad på delen vid down) → uppdatera `part.x/part.y` (klampa inom fältet [80,1200]×[120,690]) OCH synka matter-kroppen: `Body.setPosition(part._body, { x: part.x, y: part.y })` (för tratten: sätt båda kropparna relativt). Vrid-knappen följer med eftersom den är barn till containern.
- `pointerup`/`pointerupoutside` → släpp, skala tillbaka, ljud `audio.sfx('soft')` (mjuk "klonk" när delen läggs).
- **Tap-tap-fallback (drag är svårt < 4 år):** ett kort tap (rörelse < 14px) på en del **markerar** den (puls/breathe); nästa tap någonstans i fältet flyttar delen dit (gsap-glid + body-sync). Andra tap på delen avmarkerar.

**Rotation (tap på ↻):**
- `pointertap` på vrid-knappen → `part._angleStep = (part._angleStep + 1)` modulorange; ny vinkel `ang = clamp(baseAngles[step], −60°, +60°)` med 15°-steg (t.ex. stegen [−60,−45,−30,−15,0,15,30,45,60]°, wrappa runt).
- Applicera: `part.rotation = ang` (radianer) MED en kort `pop(part)`; `Body.setAngle(part._body, ang)` (tratten: sätt båda plankornas vinkel relativt sin V-bas). Ljud `audio.sfx('flip')`.
- Vrid-knappen ska behålla sitt eget läge relativt delen (den är barn → roterar med, det är ok; alternativt motrotera knappens grafik så ↻ står rätt).

**SLÄPP-knappen:**
- `pointertap` → om kulan redan faller (`this._falling`) ignorera (eller mjuk wiggle). Annars: `this._falling = true`, lås del-interaktion (sätt delarnas `eventMode='none'`, dämpa dem alpha 0.92), `audio.sfx('whoosh')`, gör kulan dynamisk: `Body.setStatic(this._ballBody, false)`, nollställ hastighet `nudge(this._ballBody, 0, 0)`, sätt position till utsläppet. Gravitationen drar kulan.
- Knappen pulsar lugnt (`breathe`) när banan står stilla och inväntar släpp.

**Hit-areor:** vrid-knapp r=70; SLÄPP-knapp 172×104; delar minst 200×~50 (eller hitArea-utvidgad). Inga små klickytor.

## Fysik & kalibrering
Bygg på `src/lib/physics.js` (`PhysicsWorld`, matter.js, fast 1/60-steg, exit-säker). Spelet använder **ren matter.js-simulering** — ingen sikt-förhandsvisning behövs (kulan släpps, den siktas inte), så `AimLauncher`/`predictTrajectory` används inte här.

- **Värld:** `this._phys = new PhysicsWorld({ gravityY: 1.1, walls: ['left','right','floor'], wallThickness: 120 })`. Lagom mjukt fall som är lätt att följa med ögat.
- **Kula (dynamisk):** `this._ballBody = this._phys.circle(300, 168, 26, { restitution: 0.42, friction: 0.03, frictionAir: 0.006, density: 0.0013, label: 'ball', isStatic: true })`. Startar `isStatic:true` (fryst på utsläppet); SLÄPP sätter `Body.setStatic(body,false)`. `this._phys.link(this._ballBody, this._ballView)` så kulans grafik följer (och roterar → rull-känsla). Låg friktion = den rullar fint på ramperna; måttlig restitution = mjuka studsar.
- **Ramp (statisk):** `phys.rectangle(x, y, 200, 30, { isStatic:true, friction:0.06, restitution:0.2, label:'ramp' })`. Låg friktion → kulan rullar nedför. Länka EJ via `link` (statisk; vi sätter `view` och `body` manuellt vid drag/rotation och håller dem i synk).
- **Studsplatta (statisk):** `phys.rectangle(x, y, 140, 32, { isStatic:true, friction:0.04, restitution:0.95, label:'bounce' })`. Hög restitution → kulan studsar uppåt/över ett gap.
- **Tratt:** två statiska rektanglar (120×26) i V (±35°) som styr kulan mot mitten; `restitution:0.2`.
- **Hinkens fångväggar:** två tunna statiska rektanglar (14×100) vid hinkkanterna (`label:'bucketwall'`, `restitution:0.1`) så kulan stannar i hinken.
- **Stega motorn:** `this._tick = (t) => this._update(ctx, t)`, `ctx.ticker.add(this._tick)`. I `_update`: `this._phys.update(t.deltaMS)` (fast 1/60-steg internt). Sedan: målkoll, miss/idle-timers, rull-rotation (görs redan av `link`).
- **Målkoll (varje frame, en gång):** läs `this._ballBody.position`. Om x ∈ [bx−66, bx+66] OCH y ∈ [by−54, by−6] OCH `!this._resolving` → **mål!**. (Fångväggarna ser till att kulan faktiskt är i hinken, inte bara passerar mun-zonen.)
- **Miss-koll:** kulan räknas som "stilla/missad" om dess fart `Math.hypot(vx,vy) < 0.4` i > ~1,2 s ELLER om `y > 690` (nått golvet) utan mål → starta mjuk retur (se Auto-hjälp).
- **Kalibrerings-notis (om du LÄGGER TILL en valfri prick-guide):** skulle du vilja rita en pricklinje för kulans fall, sätt `predictTrajectory({ gy: 0.2778 × gravityY ≈ 0.306, damp: 1 − frictionAir = 0.994, ... })` enligt CLAUDE.md så linjen matchar matters verkliga fall. Standard-spelet behöver den INTE (ingen siktning) och bör hoppa över den för enkelhet.

## Återkoppling & belöning
Varje pekning → ljud+bild < 100 ms, ENDAST positivt.
- **Ta tag i del:** `audio.sfx('tap')` + skala-pop. **Lägg ner del:** `audio.sfx('soft')` (mjuk klonk).
- **Vrid ↻:** `audio.sfx('flip')` + `pop(part)`; en liten `sparkle(ctx.fxLayer, knapp.x, knapp.y, {count:4})`.
- **SLÄPP:** `audio.sfx('whoosh')`, delarna dämpas lätt, kulan tappar fart-pop.
- **Kulan studsar mot ramp/vägg:** `audio.sfx('pop')` (throttlat, max var ~160 ms). **Studsplatta:** `audio.sfx('pling')` + liten `sparkle` vid träffpunkten (kort "boing"-känsla).
- **Mål (kula i hinken):** `this._resolving = true`; `audio.sfx('correct')` direkt + `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, kulan "plumsar" ner i hinken (kort gsap-skala/studs), `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})` + `burst(ctx.fxLayer, bx, by-30, {count:16})` + `floatText(ctx.fxLayer, bx, by-90, '🎉')`. Sedan `ctx.progress.complete()`, `ctx.progress.setLevel(this._level+1)`, och `gsap.delayedCall(1.5, ()=> this._alive && this._loadLevel(ctx, ++this._level))`.
- **Miss = roligt, aldrig straff:** kulan når golvet/blir stilla → `audio.sfx('soft')` + `floatText(ctx.fxLayer, ball.x, ball.y, 'Hoppsan!')` + mjuk `puff`. Ingen buzzer, inget rött, ingen omstart av spelet — bara en glad retur till utsläppet.
- **Idle-recue (~6 s utan interaktion, banan väntar på släpp):** `voice.replayLast()` (eller `voice.say(this.voiceIntro)`) + `breathe`/`wiggle` på en ramp och på SLÄPP-knappen som vänlig vink. Nollställ idle-timern vid varje pekning.

Använda sfx: `tap, soft, flip, whoosh, pop, pling, correct, celebrate`. Voice: `voiceIntro`, `PRAISE`, 'Nästan! Jag hjälper till.'.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid `init`.
- Banor (cykliska, oändlig lek) — längre väg, fler hinder, fler/andra delar uppåt:
  - **Nivå 0–1:** hink nära (≈ (820, 558)), **2 ramper**, inga hinder. En enda lutande ramp räcker → lär ut placering+rotation.
  - **Nivå 2–3:** hink längre bort (≈ (980, 580)), **2 ramper + 1 studsplatta**, 1 statiskt hinder (en pelare/kloss mitt i fältet, `roundRect` brun, statisk kropp) att rulla runt.
  - **Nivå 4–5:** hink i högra hörnet (≈ (1080, 590)), **3 ramper + studsplatta + tratt**, 2 hinder + ett litet "gap" där studsplattan/tratten behövs.
  - **Nivå 6+:** som 4–5 men hinder/hink jittras (±30 px via `randomFrom`/`Math.random`) och en extra ramp; mönstren upprepas/varieras. Mål-mun aldrig smalare än 120 px bred.
- Efter `complete()`: `setLevel(this._level+1)`, vänta ~1,5 s, `_loadLevel(ctx, this._level)` återanvänder noderna (flytta hink, lägg delar tillbaka på hyllan, frys kulan på utsläppet, nollställ `_resolving/_falling/_attempts`). Oändligt.
- `setCustom('banor', n)` kan räkna totalt antal klarade banor (frivilligt, växer bara). Ingen synlig poäng, inga sjunkande värden.

## Tillgångar (programmatiskt)
Endast Pixi `Graphics` + någon emoji-`Text`. Inga externa bild-/ljud-/fontfiler. Ljud via `ctx.services.audio.sfx`, röst via `ctx.services.voice.say`.
- **Graphics:** glansig gul kula (cirkel + högdager + skugga), utsläpps-spout (roundRect, roterad), hink (roundRect-kropp + glödring + fångväggar), ramper/studsplatta (roundRect brun/teal + ljusremsor + fjäder-zigzag), tratt (två plankor), vrid-knapp (cirkel + ↻), SLÄPP-knapp (roundRect grön + text), Delar-hyllan (roundRect cream alpha), hinder/pelare (roundRect brun).
- **Emoji (Text):** 🪣 (hinken, dekor ovanpå kroppen), 🧰 (hyll-etikett), 🎉 (firande-floatText). Färger ur `theme.js` `COLORS`/`PLAYFUL`.
- **Bakgrund:** `createScene('sky', { ground:false })`.

## Återanvänd dessa
- `lib/physics.js`: `PhysicsWorld` (gravityY, walls, `circle`/`rectangle`, `link`, `update`, exit-säker `destroy`), `MATERIALS` (referens), `nudge`, samt `Body`/`Composite` (re-exporterade) för `Body.setStatic/setPosition/setAngle/setVelocity`.
- `lib/scene.js`: `createScene('sky', {ground:false})`.
- `lib/feedback.js`: `pop`, `wiggle`, `breathe`, `sparkle`, `puff`, `burst`, `bigCelebration`, `floatText`.
- `lib/theme.js`: `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`, `DESIGN_W/H`.
- `lib/swedish.js`: `randomFrom`, `shuffle` (hinder-/hinkjitter).
- (Valfritt) `lib/Button.js` för SLÄPP-knappen om dess API passar; annars egen Graphics + `pointertap`.
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress`: `get`, `setLevel`, `complete`, `setCustom`. `ctx.fxLayer` (firande), `ctx.ticker` (fysikloop), `gsap` (tweens/auto-hjälp).
- **EJ** `DragController` (den snäpper till diskreta mål; här är placeringen fri — egen pointer-drag + tap-tap byggs in enligt Interaktion).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`setTimeout`/auto-hjälp-callbacks och ticker-loopen tidig-returnerar `if (!this._alive) return`.
- **`_resolving`-skydd:** sätt `true` när kulan når hinken → ignorera vidare målkollar, frys släpp/drag tills nästa bana laddas, så `complete()` ALDRIG triggas två gånger (skydd mot snabba dubbeltryck på SLÄPP).
- **`_falling`-lås:** medan kulan faller är del-drag/rotation låst (`eventMode='none'`); låses upp igen vid retur/miss eller ny bana.
- **Body-synk:** vid varje drag-move OCH varje rotation måste matter-kroppen uppdateras (`Body.setPosition`/`Body.setAngle`), annars "studsar" grafiken tillbaka till kroppen vid nästa fysiksteg. Tratten har TVÅ kroppar — uppdatera båda relativt containern.
- **Klamp:** klampa delarnas position inom fältet och kulans fart vid behov; väggar (left/right/floor) hindrar kulan från att lämna banan.
- **Throttla studsljud** så snabba multistudsar inte spammar audio (spara `this._lastBounceAt`).
- **Auto-hjälp-timer** nollställs så fort barnet rör en del eller trycker SLÄPP (hjälpen ska aldrig peta mitt i en pågående bygg-/falländring). Räkna `this._attempts`; vid 3 → luta närmaste ramp mot hinken; vid nästa miss → glid kulan hem via gsap (`{}`-proxy om kulvyn kan förstöras) och fira ändå.
- **Exit-säkra partiklar:** använd ENDAST `lib/feedback.js`-hjälparna (de tweenar `{}`-proxy och rör Pixi-objektet bara om det lever) — tweena ALDRIG ett Pixi-objekt direkt som kan förstöras av sin egen `onComplete` eller av spel-exit. Auto-hjälpens "kula glider hem"-gsap ska tweena en proxy och kopiera till kulvyn `if (!view.destroyed)`, samt `onComplete: () => { ... }` med `_alive`-vakt.
- `destroy(ctx)`: `this._alive=false`; `ctx.ticker.remove(this._tick)`; avregistrera ALLA pointer-lyssnare (delar, vrid-knappar, SLÄPP, fält); `gsap.killTweensOf(...)` för kula, delar, knappar; döda `breathe`/`_pulse`-tweens; `this._phys?.destroy()` (rensar matter-världen); `this._root?.destroy({children:true})`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/kulbana/index.js`. Importera `Container, Graphics, Text, Circle, Rectangle` från `pixi.js`, `gsap`, `PhysicsWorld, Body, nudge` från `../../lib/physics.js`, `createScene` från `../../lib/scene.js`, feedback-hjälpare, `COLORS, FONT, PLAYFUL, PRAISE` från theme, `randomFrom` från swedish.
2. Default-exportera GameModule-objektet med metadatan ovan (`id:'kulbana'`, `category:'pussel'`, `input:'drag'`, `ageRange:[3,5]`, `voiceIntro` enligt tabellen).
3. `init(ctx)`: `this._alive=true`; `this._root=new Container()`, `ctx.stage.addChild(this._root)`; lägg `createScene('sky',{ground:false})` FÖRST. Skapa `this._phys = new PhysicsWorld({gravityY:1.1, walls:['left','right','floor']})`. Bygg Delar-hyllan, SLÄPP-knappen, kul-vyn + kul-kroppen (statisk, länkad). Läs `this._level`. Anropa `this._loadLevel(ctx, this._level)`. Lägg ticker: `this._tick=(t)=>this._update(ctx,t)`, `ctx.ticker.add(this._tick)`.
4. `_loadLevel(ctx, level)`: rensa gamla delar/hinder (ta bort kroppar via `phys.removeBody`, förstör vyer), placera hink + fångväggar + glödring enligt nivå, skapa hinder (statiska), skapa delar (ramper/studsplatta/tratt) parkerade på hyllan med `bounceIn`-intro, frys kulan på utsläppet (`Body.setStatic(true)`, position (300,168)), nollställ `this._falling=false; this._resolving=false; this._attempts=0; this._idle=0`.
5. `_makePart(kind, x, y)`: bygg container (grafik), skapa matter-kropp(ar), registrera fri-drag (pointerdown/globalpointermove/up + tap-tap) som syncar `Body.setPosition`; för roterbara delar lägg vrid-knapp med `pointertap` → stega vinkel, `Body.setAngle`, `pop`, `audio.sfx('flip')`.
6. SLÄPP-knapp `pointertap` → om ej `_falling/_resolving`: lås delar, `Body.setStatic(ball,false)`, `nudge(ball,0,0)`, position till utsläpp, `audio.sfx('whoosh')`, `this._falling=true`.
7. `_update(ctx,t)`: `if(!this._alive) return`; `this._phys.update(t.deltaMS)`; om `_falling && !_resolving`: målkoll (→ `_win`), miss/stillakoll (→ `_returnBall` + `_attempts++` + ev. auto-hjälp), throttlade studsljud; uppdatera idle-timer (recue vid 6 s när banan väntar på släpp).
8. `_win(ctx)`: `this._resolving=true`; ljud+voice+firande; `ctx.progress.complete()`; `ctx.progress.setLevel(this._level+1)`; `gsap.delayedCall(1.5, ()=> this._alive && this._loadLevel(ctx, ++this._level))`.
9. `_returnBall(ctx)`: `audio.sfx('soft')` + `floatText('Hoppsan!')`; `Body.setStatic(ball,true)`, position tillbaka till utsläpp, `nudge(ball,0,0)`; lås upp delarna (`eventMode='static'`, alpha 1); `this._falling=false`. Vid `_attempts>=3`: luta närmaste ramp mot hinken; vid fortsatt miss: glid kulan hem (proxy-gsap) och kör `_win`.
10. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
11. `destroy(ctx)`: enligt "Edge-cases & städning".
12. Registrera i `src/games/registry.js`: `import kulbana from './kulbana/index.js'` och lägg `kulbana` i `GAMES`-arrayen.
13. `npm run build` (0 fel), sedan `npm run dev`: öppna biblioteket, spela. Verifiera: drag flyttar både grafik OCH fysikkropp, ↻ lutar rampen, SLÄPP släpper kulan, kulan rullar/studsar och hamnar i hinken → firande, miss ger mjuk retur + oändliga försök, auto-hjälp efter 3 missar, tap-tap-flytt, hem-knapp, röst-repris, och att `highestLevel`/`custom.banor` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera till biblioteket → välj "Kulbanan"); canvas finns, inga uncaught errors/warnings i `browser_console_messages`.
- Vid mount är `voiceIntro` satt och en svensk röstinstruktion spelas ("Lägg ramperna så kulan rullar ner i hinken! Tryck sedan på släpp.").
- **Drag flyttar både vy och fysik:** en `pointerdown`→`globalpointermove`→`pointerup` (eller `browser_drag`) på en ramp ändrar dess `x/y` OCH dess matter-kropps position (verifierbart via exponerad teststate, t.ex. `window.__barnspel`/`_parts`).
- **Rotation:** tap på en ramps ↻-knapp ändrar rampens `rotation` i 15°-steg och dess matter-kropps `angle` följer med; ljud `flip` + `pop` spelas, inga fel.
- **Släpp + mål:** efter att en ramp lutats mot hinken och SLÄPP trycks rör sig kulan (matter), och när den når hinkzonen triggas firande (konfetti i `fxLayer`) och `ctx.progress.complete()` anropas **exakt en gång** (ingen dubbeltrigg vid snabba upprepade SLÄPP/`_resolving`-skydd).
- **No-fail:** en bana där kulan missar leder ALDRIG till felljud/buzzer/"game over"; kulan återvänder mjukt till utsläppet och barnet kan trycka SLÄPP igen (oändliga försök). Efter 3 missar lutas en ramp automatiskt / kulan glider hem och rundan firas ändå.
- **Ingen fail-state:** inga "game over"-element; kulan lämnar aldrig banan (positionen håller sig inom väggarna efter studsar).
- **Tap-tap-fallback:** tap på en del + tap i fältet flyttar delen utan drag.
- **Progress sparas:** efter en avklarad bana är `highestLevel` ökat och `custom.banor` finns; värdena kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- **Städning:** vid retur till biblioteket (hem-knapp) tas ticker-loopen + matter-världen bort och inga tweens/timeouts fortsätter logga eller kasta fel (inga konsolfel efter exit mitt i en animation).
