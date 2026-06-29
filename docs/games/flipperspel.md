# Flipperspel (`flipperspel`)
> Ett mjukt, glittrande barn-flipperbord där varje tryck slår en STOR paddel och kulan studsar runt och tänder bumpers som lyser och sjunger toner — ren arkad-glädje där kulan aldrig kan "förloras", bara serveras tillbaka med ett fniss.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `flipperspel` | Flipperspel | ⭐ | fysik | tap | [3,5] | `flipperspel` | "Tryck på sidorna för att slå paddlarna!" |

(titleSv med åäö där det behövs; id/bundle/ljudnycklar är ASCII.)

## Mål & mekanik
Ett upprättstående flipperbord (top-down-vy) sett rakt framifrån. En kula faller nedåt mot **två stora paddlar (flippers)** längst ner. Barnet **tappar vänster skärmhalva** → vänster paddel slår uppåt, **tappar höger skärmhalva** → höger paddel slår uppåt. Paddeln svingar snabbt upp och **fjädrar tillbaka** av sig själv. Kulan studsar mot **bumpers** (runda dynor) som **TÄNDS** och spelar en mjuk ton när de träffas.

- **Mål per runda:** tänd ALLA bumpers (på högre nivåer även ett par extra mål-dynor). När alla lyser → firande + `ctx.progress.complete()` → nästa runda byggs.
- **Kärnloop:** kula serveras mjukt från toppen → faller → barnet slår paddlarna i rätt stund för att hålla kulan uppe och rikta den mot otända bumpers → bumpers tänds en efter en → alla lyser → klart.
- **No-fail (mycket viktigt):** En kula som rinner ut genom drän-springan i mitten räknas ALDRIG som miss. Det finns inga liv, ingen "ball lost", ingen poäng som sjunker. Kulan **serveras mjukt igen** uppifrån efter ~0,6s med ett glatt `pop` + liten gnista. Sker inget framsteg på länge tänds en otänd bumper själv av "magi" (auto-hjälp, se nedan) så barnet ALLTID lyckas.

**Två tydliga kontroller som ändrar utfallet (krav uppfyllt):**
1. **Paddel-timing** — vänster/höger tryck-i-rätt-stund avgör om och vart kulan slås (håller kulan i spel, riktar mot bumpers).
2. **Lutnings-knapp ("Lugnt läge / Snabbt läge")** — en stor knapp som växlar gravitationen (`setGravity`) mellan **mjuk lutning** (långsam, lätt kula — för de minsta) och **vanlig** (piggare studs). Tydlig, omedelbar effekt på kulans fart.

## Skärm-layout (1280x720)
GameHost ritar hem-/högtalar-knappar i headern (y < 90) — rita INGA egna. Allt nedan ligger i spelets `_root` i designkoordinater. Lägg `createScene('night', {width:1280,height:720})` som FÖRSTA barn i `_root` (mörk arkad-känsla, `eventMode='none'`) — bumpernas glöd syns extra fint mot natten.

**Bordsram (logisk spelyta):** ett upprättstående bord centrerat.
- Inre väggar: vänster x = **380**, höger x = **900**, topp y = **120**. Botten är ÖPPEN (drän) under y ≈ **690**.
- Rita bordsplattan: `roundRect(360, 100, 560, 600, 36).fill(COLORS.ink).stroke({width:8, color:COLORS.purple})` som mörk panel, plus en inre ljusram `roundRect(376,116,528,580,28).stroke({width:6,color:0x3a2f6b})`.
- **Statiska väggar (matter):** tre tunna rektangelkroppar (tjocklek 40, `isStatic:true`, `restitution:0.4`, label `'wall'`): vänster (mittlinje x≈360, vertikal, y 110→700), höger (x≈920, vertikal), topp (y≈100, horisontell x 360→920). Bygg dem manuellt — använd INTE PhysicsWorlds auto-väggar (de sitter vid skärmkanten).
- **Inlane-guider (snedställda kroppar) som trattar kulan mot paddlarna:** två snedställda statiska rektanglar nära botten. Vänster guide: från (380, 560) snett inåt-ner mot (470, 660). Höger guide: spegelvänt från (900, 560) mot (810, 660). Rita som tunna `roundRect`-staplar (brun `COLORS.brown`) + matchande matter-rektanglar (rotera kroppen med `angle`).

**Paddlar (flippers):** två stora avlånga kroppar, längd **125**, tjocklek **28**.
- Vänster pivå: **(500, 600)**. Viloläge-vinkel **+0,55 rad** (≈ +32°, spetsen pekar ner-höger mot mitten); slag-vinkel (uppe) **−0,30 rad**.
- Höger pivå: **(780, 600)**. Viloläge-vinkel **π − 0,55 rad** (spetsen pekar ner-vänster); slag-vinkel **π + 0,30 rad**.
- Rita varje paddel som ett `roundRect(-length/2, -14, length, 28, 14)` i glansig orange (`COLORS.orange`, stroke `COLORS.orangeDark`) med en liten ljusglimt-ellips; `anchor`/pivot i den INRE änden (se Fysik). Spetsarna i viloläge ligger nära mitten med en **drän-springa ≈ 70px** mellan dem (kuldiameter 56 → kulan kan falla igenom när båda paddlar är nere → serveras om).

**Bumpers (mål-dynor):** runda statiska kroppar, radie **46**, hög studs.
- Nivå 1 (3 st): **(640, 300)**, **(540, 420)**, **(740, 420)**.
- Varje bumper ritas som en glansig knapp: yttre glöd-ring `circle(0,0,60).fill({color, alpha:0.18})`, dyna `circle(0,0,46).fill(COLORS.inkSoft).stroke({width:5,color})`, och en liten emoji ⭐ (fontSize 40) i mitten. **Otänd** = grå/dämpad; **tänd** = fylls med sin `PLAYFUL`-färg + glöd-ringen pulsar.

**Serve-punkt:** kulan kommer in uppifrån vid **(640, 150)** med liten slumpmässig horisontell fart (vx ∈ [−2, 2]).

**Lutnings-knapp:** stor rund knapp nere i vänster dekor-marginal vid **(180, 600)**, radie **70** (träffyta ≥96px, +24px hit-halo via `hitArea = new Circle(0,0,94)`). Ikon ☁️ (lugnt) / ⚡ (snabbt) som växlar. Bygg med `lib/Button.js` om praktiskt, annars egen Graphics+Text.

**Kula:** radie **28**, ritas som vit glansig cirkel (`circle(0,0,28).fill(COLORS.white).stroke({width:3,color:COLORS.inkSoft})`) + liten ljusglimt; valfri ⚪/🔮-känsla. Hit-halo behövs inte (kulan är inte tryckbar).

Tryck-zoner: hela **vänster halvan** (x < 640, y > 120) och **höger halvan** (x ≥ 640, y > 120) är osynliga, gigantiska träffytor (vida över 96px) för paddel-slag.

## Interaktion
INGEN `DragController`, INGEN `AimLauncher` (inget sikte) — bara tap.
- Två transparenta `Graphics`-rektanglar (`_leftZone`, `_rightZone`), `eventMode='static'`, som täcker var sin skärmhalva under headern. `pointertap` (eller `pointerdown`) → `_flip('left')` / `_flip('right')`. Använd `pointerdown` för snabbast respons (<100ms).
- `_flip(side)`: sätt `this._press[side] = performance.now()` (eller en räknare `this._pressMs[side] = 140`). Detta gör paddeln "pressad" i ~**140ms**, sedan släpps den och fjädrar tillbaka. Spela `audio.sfx('flip')` direkt + liten `pop()` på paddel-grafiken (omedelbar känsel även om kulan inte träffas).
- **Lutnings-knapp** `pointertap` → växla `this._calm`, kör `this._phys.setGravity(this._calm ? GY_CALM : GY_NORMAL)`, byt ikon, `audio.sfx('reveal')`, `voice.say(this._calm ? 'Lugnt läge.' : 'Snabbt läge!')`. (Knappen ligger UTANFÖR bordsväggarna så den inte stör kul-fysiken.)
- Inget dubbeltryck/långtryck/svep krävs eller tolkas. Snabba upprepade tap på en sida = upprepade slag (helt ok).
- `this._resolving`-flagga: när alla bumpers tänts och firandet kör, ignorera nya paddel-/knapp-tryck tills nästa runda byggs (förhindrar dubbel `complete()`).

## Fysik & kalibrering
Bygger på `src/lib/physics.js` (`PhysicsWorld`, matter.js, fast 1/60-steg, exit-säker). Re-exporterad `Matter` används för `Matter.Constraint`.

- **Värld:** `this._phys = new PhysicsWorld({ gravityY: GY_NORMAL, walls: [] })`. Egna statiska väggar/guider byggs manuellt (auto-väggarna stängs av med `walls:[]`). Inget golv → kulan kan falla ut i drän-springan och fångas av en sensor.
- **Gravitation:** `GY_NORMAL = 1.1`, `GY_CALM = 0.5`. Lutnings-knappen växlar via `setGravity(y)`. (Upprättstående bord = ren nedåtgravitation; ingen sidlutning behövs.)
- **Kula:** `this._phys.circle(640,150,28, { ...MATERIALS.bouncy, label:'ball' })` (restitution 0.86 → livlig men inte vild studs). Klampa kulans fart varje steg (se nedan) så den aldrig skjuts ut.
- **Bumpers:** `this._phys.circle(bx,by,46, { isStatic:true, restitution:1.0, label:'bumper', plugin:{idx} })`. Hög restitution = pigg studs-effekt. Vid kollision ger vi dessutom en liten EXTRA impuls bort från bumpern (`nudge`/`Body.setVelocity`) så det känns "studsigt" och kulan alltid kommer loss (ingen fastnar-loop).
- **Paddlar (revolute + kinematisk fjäder):** detta är det robusta receptet — pinna paddeln i sin inre ände och DRIV rotationen via vinkelhastighet varje steg (gravitationsdropp överröstas, och eftersom kroppen har vinkelhastighet sparkar den kulan vid kontakt):
  1. Skapa paddel-kropp: `const body = this._phys.rectangle(pivotX + (length/2)*Math.cos(restAngle), pivotY + (length/2)*Math.sin(restAngle), length, 28, { density: 0.02, friction: 0.4, restitution: 0.25, label: 'flipper' })` (hög density → kulan rubbar den inte).
  2. Pinna inre änden vid pivån: `const pin = Matter.Constraint.create({ pointA: {x:pivotX,y:pivotY}, bodyB: body, pointB: {x:-length/2, y:0}, stiffness: 1, length: 0 })`; lägg till med `this._phys.add(pin)`.
  3. Länka grafik: `this._phys.link(body, paddelView)` (paddel-grafikens pivot satt i inre änden via `roundRect(-length/2,...)`).
  4. **Per steg (i ticker, FÖRE `phys.update`):** beräkna måL-vinkel `desired = pressedNow ? upAngle : restAngle`. Sätt vinkelhastighet mot målet med en fjäder: `let av = (desired - body.angle) * 0.35; av = clamp(av, -0.8, 0.8); Matter.Body.setAngularVelocity(body, av)`. Detta ger snabb upp-sving vid tryck och mjuk fjäder-retur — och den verkliga vinkelhastigheten gör att kulan KICKAS vid kontakt (äkta flipper-känsla).
  5. Klampa vinkeln vid gränserna (`Math.min/max` mot rest-/up-vinkel) med `Body.setAngle` om den skjuter över, så paddeln aldrig snurrar runt.
- **Fast tidssteg / no-fail-klamp:** `PhysicsWorld.update(deltaMS)` kör fasta 1/60-steg internt. I `link`-ens `onUpdate` (eller en egen post-step) klampa kulans hastighet: `const sp = Math.hypot(b.velocity.x,b.velocity.y); if (sp>26) Body.setVelocity(b, {x:b.velocity.x*26/sp, y:b.velocity.y*26/sp})` → kulan kan aldrig "teleportera" genom en vägg.
- **Drän-detektering:** ingen sensor-kropp behövs — kontrollera i ticker `if (ball.position.y > 760) serveBall()`. `serveBall()`: `Body.setPosition(ball,{x:640,y:150}); Body.setVelocity(ball,{x:rand(-2,2),y:0})`, `audio.sfx('pop')`, liten `puff(ctx.fxLayer,640,150)`. Mjukt, glatt, aldrig en miss.

INGEN `predictTrajectory`/`AimLauncher` används → ingen pricklinje att kalibrera. (Kalibreringsreglerna i CLAUDE.md gäller bara sikt-förhandsvisningar; här är all rörelse äkta matter-simulering vid fast 1/60.)

## Återkoppling & belöning
Varje tryck (<100ms): paddel-tap → `audio.sfx('flip')` + `pop(paddelView)` direkt (även utan kul-kontakt). Lutnings-knapp → `audio.sfx('reveal')` + knapp-`pop` + röst.

Bumper träffas (i `onCollision`, matcha `pair.bodyA/B.label === 'bumper'`):
- Om redan tänd → bara liten `pop` på dynan + mjukt `audio.sfx('pop')` (kul att studsa på en lyst bumper, men räknas inte igen).
- Om otänd → **tänd den:** fyll med dess `PLAYFUL`-färg, glöd-ringen pulsar (`pop`/`breathe` kort), `sparkle(ctx.fxLayer, bx, by)`, och spela en **ton ur en liten "skala"** genom att cykla bland behagliga sfx-nycklar: `const NOTES=['pling','reveal','match','flip','pop']; audio.sfx(NOTES[this._litCount % NOTES.length])` (ger en stigande "pling-skala"-känsla utan egen tonhöjds-motor). Öka `this._litCount`. Liten extra studs-impuls bort från bumpern.
- Första bumpern i rundan: `voice.say('Titta, den lyser!')`; annars tyst för att inte tjattra.

Drän (kula ut): `audio.sfx('pop')` + `puff` vid serve-punkten + (sällan) `floatText(ctx.fxLayer, 640, 200, '😄')`. ALDRIG buzzer, rött, "miss" eller nedräkning.

**Klart-firande** (alla bumpers tända): `this._resolving = true` → bumpers pulsar i tur och ordning, `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})`, `ctx.progress.complete()`. Efter ~1,5s (`gsap.delayedCall`, vakta `this._alive`) → `ctx.progress.setLevel(this._level+1)` och `_buildRound`.

**Auto-hjälp (garanterad framgång):** håll `this._sinceLit` (ms sedan senaste nytändning, nollställs vid varje nytändning OCH varje paddel-tryck). Om `this._sinceLit > 12000` och det finns otända bumpers kvar → tänd en otänd bumper "av magi": flyg en liten ⭐ (eller `sparkle` + `floatText`) till den, kör samma tänd-logik (ton + räkning), nollställ timern. Så även ett barn som inte träffar någon bumper får alla tända till slut → firande. Ren uppmuntran, aldrig en tillrättavisning.

## Progression & nivåer
- `this._level = Math.max(1, ctx.progress.get().highestLevel | 0)` i `init`; styr antal bumpers/mål.
- Banor (cykliska, oändlig lek):
  - **Nivå 1–2:** 3 bumpers (positionerna ovan). Lär ut paddel-slaget.
  - **Nivå 3–4:** 4 bumpers (lägg till **(640, 470)**), något tätare.
  - **Nivå 5–6:** 5 bumpers (lägg till **(440, 300)** & **(840, 300)**, ta ev. bort en mittersta) + 1 "mål-dyna" med annan emoji 🎯 som också ska tändas.
  - **Nivå 7+:** 5–6 bumpers i lätt varierat mönster (jitter ±20px via `randomFrom`/`Math.random`), mönstren upprepas/varieras. ALDRIG svårare drän, ALDRIG snabbare straff — bara fler glada mål.
- `_buildRound(ctx)`: rensa gamla bumper-kroppar (`this._phys.removeBody`) + grafik, bygg nya enligt nivå, nollställ `this._litCount = 0`, `this._resolving = false`, `this._sinceLit = 0`, serva kulan. `bounceIn` på varje ny bumper.
- `setCustom('rundor', n+1)` räknar avklarade rundor (frivilligt, växer bara). Inga synliga poäng, inget som sjunker.

## Tillgångar (programmatiskt)
- **Emoji (Text):** ⭐ (bumper-mitt + appikon), 🎯 (mål-dyna högre nivå), ☁️/⚡ (lutnings-knapp), valfritt 😄/🎉 i firandet.
- **Pixi Graphics:** bordspanel (`roundRect`), tre statiska väggar + två inlane-guider, två paddlar (glansig `roundRect` + ljusglimt), bumpers (glöd-ring + dyna + stroke), kula (vit cirkel + glimt), tryck-zoner (transparenta rektanglar), lutnings-knapp.
- **Bakgrund:** `lib/scene.js` `createScene('night', ...)` som första barn.
- Inga externa bild-/ljud-/fontfiler. Ljud via `ctx.services.audio.sfx`, röst via `ctx.services.voice.say`.

## Återanvänd dessa
- `lib/physics.js`: `PhysicsWorld` (`circle`, `rectangle`, `removeBody`, `link`, `onCollision`, `setGravity`, `update`, `add`, `destroy`), `MATERIALS.bouncy`, `nudge`, samt re-exporterade `Matter`/`Body` för `Matter.Constraint` & `Body.setAngularVelocity/setVelocity/setPosition/setAngle`.
- `lib/feedback.js`: `pop`, `bounceIn`, `breathe`, `sparkle`, `puff`, `floatText`, `bigCelebration`, `wiggle`.
- `lib/theme.js`: `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`, `DESIGN_W/H`.
- `lib/scene.js`: `createScene('night')`.
- `lib/swedish.js`: `randomFrom`, `shuffle` (bumper-jitter/ton-val).
- `lib/Button.js` (valfritt) för lutnings-knappen.
- `ctx.progress`: `get`, `setLevel`, `complete`, `setCustom`. `ctx.fxLayer` för partiklar. `ctx.ticker` för fysik- & idle-loop.
- INTE `AimLauncher`/`predictTrajectory` (inget sikte), INTE `DragController` (ingen drag).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`onComplete` (firande, nästa runda, magi-hjälp) tidig-returnerar om `!this._alive`.
- `this._resolving = true` vid full bana; alla paddel-/knapp-/kollisions-callbacks returnerar tidigt tills `_buildRound` → ingen dubbel `complete()`.
- Skydda mot dubbel-tändning: `if (bumper._lit) return` i tänd-logiken; räkna `_litCount` bara på faktisk nytändning.
- Klampa kulans fart varje steg (max 26 px/steg) så den aldrig passerar genom en vägg; kontrollera drän (`y>760`) och serva om mjukt.
- Throttla studs-/pop-ljud (t.ex. max var ~120ms) så snabba multistudsar inte spammar audio.
- Paddel-vinkel klampas vid gränserna (rest/up) så den aldrig snurrar runt; `setAngularVelocity` nollställs vid gräns.
- Idle-recue: om `this._sinceTap > 6000` (ingen paddel rörd) och rundan ej klar → `voice.replayLast()` (eller `voice.say(this.voiceIntro)`) + `breathe`/`pop` på en otänd bumper som vänlig vink. Nollställ vid varje tryck.
- `destroy(ctx)`: `this._alive=false`; `ctx.ticker.remove(this._tick)`; avregistrera zon-/knapp-lyssnare; `this._offCollision?.()`; `gsap.killTweensOf(...)` för paddlar, bumpers, kula, knapp; döda `breathe`-tweens; `this._phys?.destroy()`; `this._root?.destroy({children:true})`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/flipperspel/index.js` och default-exportera GameModule-objektet med metadatan ovan. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `{ PhysicsWorld, MATERIALS, Matter, Body, nudge }` från `../../lib/physics.js`, `createScene` från `../../lib/scene.js`, feedback-hjälpare, `COLORS, PLAYFUL, FONT, PRAISE` från theme, `randomFrom` från swedish.
2. `init(ctx)`: `this._alive=true`; `this._root=new Container()`, `ctx.stage.addChild(this._root)`; lägg `createScene('night')` först. Skapa `this._phys = new PhysicsWorld({ gravityY: GY_NORMAL, walls: [] })`. Läs `this._level`. Bygg bordspanel-grafik, statiska väggar + inlane-guider (kropp + grafik), paddlar (kropp + pin-constraint + grafik + `link`), lutnings-knapp, tryck-zoner. Anropa `_buildRound(ctx)`. Registrera `this._offCollision = this._phys.onCollision(this._onHit)`.
3. `_buildRound(ctx)`: välj layout via `this._level`, rensa gamla bumpers, bygg nya (kropp `isStatic`+`restitution:1`+`label:'bumper'`+`plugin.idx`, grafik med glöd-ring/dyna/⭐, `bounceIn`), nollställ `_litCount/_resolving/_sinceLit`, serva kulan.
4. `_flip(side)`: sätt press-timer (~140ms), `audio.sfx('flip')`, `pop(paddel)`, nollställ `_sinceTap`/`_sinceLit`.
5. Ticker `this._tick=(t)=>this._update(ctx,t)`, `ctx.ticker.add(this._tick)`. I `_update`: minska press-timers; sätt paddlarnas `desired`-vinkel + fjäder-`setAngularVelocity` (klampad); klampa paddel-vinkel; `this._phys.update(t.deltaMS)`; klampa kul-fart; drän-koll → `serveBall`; öka `_sinceLit/_sinceTap` → idle-recue & auto-hjälp.
6. `_onHit(e)`: för varje `pair`, om en kropp är `bumper` och andra är `ball` → tänd-logik (om otänd): färg, `sparkle`, ton ur NOTES, `_litCount++`, extra studs-impuls; om `_litCount === totalMål` → `_celebrate(ctx)`.
7. `_celebrate(ctx)`: `_resolving=true`, ljud+röst+`bigCelebration`, `ctx.progress.complete()`, `gsap.delayedCall(1.5, ()=> this._alive && (ctx.progress.setLevel(this._level+1), this._level++, ctx.progress.setCustom('rundor',(ctx.progress.get().custom?.rundor||0)+1), this._buildRound(ctx)))`.
8. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
9. `destroy(ctx)`: enligt "Edge-cases & städning".
10. Registrera i `src/games/registry.js`: `import flipperspel from './flipperspel/index.js'` och lägg `flipperspel` i `GAMES`-arrayen.
11. `npm run dev`, öppna biblioteket, spela: verifiera att vänster/höger tap slår rätt paddel (<100ms), att kulan studsar och tänder bumpers med toner, att en utrunnen kula serveras om utan miss, att lutnings-knappen ändrar farten, firande + klistermärke vid alla tända, hem-knapp, röst-repris, och att `highestLevel`/`rundor` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (canvas finns, inga uncaught errors; navigera bibliotek → "Flipperspel").
- `voiceIntro` är satt och en svensk röstinstruktion spelas vid mount (`"Tryck på sidorna för att slå paddlarna!"`).
- Tap i vänster halva svingar vänster paddel uppåt och tap i höger halva höger paddel (verifierbart via exponerat teststate, t.ex. paddel-vinkel/`_press`, eller snapshot-skillnad) — svar < 100ms (ljud+bild).
- En kula som passerar drän (y>760) **serveras om** automatiskt (kulans position återställs nära serve-punkten) UTAN något "miss"/"game over"-element och utan poängsänkning.
- När en otänd bumper träffas tänds den (state `_litCount` ökar, färg ändras) och en ton spelas; en redan tänd bumper räknas inte igen (`_litCount` ökar ej).
- Lutnings-knappen växlar gravitationen (`setGravity` anropas; `GY_CALM` vs `GY_NORMAL`) och påverkar kulans fart synligt — en av minst två kontroller som ändrar utfallet.
- Auto-hjälp: utan att barnet träffar något tänds otända bumpers själva efter idle-tröskeln så rundan ALLTID kan bli klar (testbart genom att snabba upp/forcera `_sinceLit`).
- När alla mål är tända körs firande (konfetti i `ctx.fxLayer`) och `ctx.progress.complete()` anropas exakt EN gång (inget dubbel-firande via `_resolving`-skydd vid snabba tryck).
- Efter firandet byggs en ny runda (oändlig lek), `highestLevel` ökat och `custom.rundor` ökat; värdena kvarstår i localStorage (`pwagames.save.v1`) efter omladdning.
- `destroy` lämnar inga kvarvarande tickers/tweens/constraints (inga konsolfel efter att man lämnar spelet mitt i en animation; `this._phys.destroy()` körd).
