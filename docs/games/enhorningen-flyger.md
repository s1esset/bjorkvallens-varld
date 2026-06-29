# Enhörningen Flyger (`enhorningen-flyger`)
> Barnet drar fingret upp och ner och låter Elviras enhörning glida fram över en rullande himmel — hon glider mjukt som på en sky, flyger genom glittrande ringar och samlar stjärnor, och kommer alltid i mål utan att kunna krascha. Ren flyglycka.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `enhorningen-flyger` | Enhörningen Flyger | ✨ | fysik | drag | [3,5] | `enhorningen-flyger` | "Dra för att flyga genom ringarna!" |

(`titleSv` MED åäö. Avbildad människa = **Elvira** — enhörningen är hennes, men själva enhörningen är ett djur och behöver inget namn.)

## Mål & mekanik
- En **enhörning (Elvira)** flyger på en fast x-position till vänster medan **himlen scrollar** mot vänster. Barnet styr bara hennes **höjd** (upp/ner) genom att dra vertikalt — hon **glider med momentum** (följer fingret med en mjuk fjäder + dämpning, snäpper ALDRIG hårt).
- Längs banan kommer **svävande ringar** (glansiga hoops) och **stjärnor ⭐**. Flyger hon **genom** en rings öppning räknas ringen som klar; rör hon en stjärna samlas den.
- **Kärnloop:** dra upp/ner → enhörningen glider mot fingret → tajma höjden så hon passerar mitt i nästa ring → ring "tänds" (pling + gnistor) och en pip i topp-raden fylls. Fortsätt tills alla ringar är passerade.
- **Två tydliga kontroller som ändrar utfallet:**
  1. **Kontinuerlig höjd-styrning** (drag) — momentum gör det skickligt men förlåtande; du bestämmer exakt var hon flyger.
  2. **"Långsammare"-knapp** (toggle, nere till vänster) — halverar scroll-farten och ger lugnare glid, så de minsta hinner sikta. Sparas per profil.
- **Mål** = passera **alla ringar** på banan (`target` ringar) → stort firande → `ctx.progress.complete()` → nästa nivå.
- **No-fail (viktigt):** banan **tar aldrig slut** förrän målet nås — ringar fortsätter komma. Missad ring = bara mjuk **studs/gnista + fniss**, ringen driver vidare, och en ny ring köas så målet alltid är nåbart. Ringar och moln är **mjuka**: nudd = studs, aldrig krasch, aldrig "game over". Mjuk **auto-magnet** drar enhörningen lätt mot nästa rings mitt när den närmar sig, och efter ett par missar centreras nästa ring så barnet garanterat lyckas.

## Skärm-layout (1280x720)
GameHost ritar hem-/repetera-knappar i headern (y<90) — rita INGA egna. Allt nedan i spelets `_root` (designkoordinater).

- **Bakgrund:** `createScene('sky', { ground: false })` som FÖRSTA barn (mjuk blå gradient + sol + drivande moln, allt `eventMode:'none'`). Lägg en egen **parallax-molnremsa** (`this._parallax`, Container) med 4–5 extra `makeCloud`-liknande moln (eller enkla vita `roundRect`-puffar) som scrollar lite **långsammare** än ringarna för djup.
- **Logisk flygruta (vertikal):** y ∈ **[170, 620]** (enhörningens centrum hålls här). x för enhörningen är fast = **300**.
- **Enhörning (Elvira):** Container på (300, 360). Innehåll: mjuk skuggellips under (`circle`/`ellipse` `COLORS.shadow` alpha 0.12), emoji 🦄 (Text, fontSize **110**, anchor 0.5), och en liten **glitter-svans** (2–3 `sparkle`-pip bakom var ~250ms när hon rör sig). Osynlig hit-halo behövs ej för enhörningen (man drar var som helst), men kollisionsradie mot ringar/stjärnor = **52px**.
- **Ringar (hoops):** programmatiska glansiga hoops, INTE emoji. Container per ring: yttre `circle(0,0,R+16).stroke({width:18, color})` i en `PLAYFUL`-färg + inre highlight `circle(0,0,R+16).stroke({width:6, color:0xffffff, alpha:0.5})`, där **R = öppningens radie** (nivåberoende 90→60). En liten ✨-Text överst på ringen som accent. Ringen spawnas vid x=**1380**, ry ∈ [240, 540].
- **Stjärnor:** ⭐ emoji (Text, fontSize **56**), spawnas mellan ringar, samlingsradie **60px**.
- **Progress-pips (topp-mitt):** en rad med `target` små otända hoop-ikoner centrerad runt x=640, y=120 (varje ~40px, avstånd 50px). Varje passerad ring **tänder** nästa pip (fyller den med färg + `pop`). Detta är ren samlings-progress (stiger bara) — INGEN poäng som sjunker.
- **"Långsammare"-knapp:** stor rund knapp nere till vänster, centrum ~(120, 650), diameter **110px** (+24px hit-halo). Visar 🐢 (långsam) / 🐇 (normal) som tillstånd + liten svensk etikett. Tryck togglar `this._slow`.

Marginaler: enhörningens x=300 ger gott om sikt-tid (ringen färdas 1080px innan kollisionen). Inga små klickytor; allt ≥96px.

## Interaktion
Ingen `DragController` (den är till dra-föremål-till-mål). Egen vertikal styrning på en heltäckande, osynlig **drag-yta** över flygrutan:
- En transparent `hitArea`-rektangel (eller `_root` med `eventMode:'static'`, `hitArea = new Rectangle(0,90,1280,630)`).
- `pointerdown` → `this._steering = true`, spara `this._fingerY = _root.toLocal(e.global).y` (klampad till [170,620]); nollställ idle-timer; ljud `tap` (mjukt).
- `globalpointermove` (på dragytan) → om `_steering`: uppdatera `this._fingerY`. Fysiken (i ticker) glider enhörningen mot `_fingerY` — vi sätter ALDRIG positionen direkt här (momentum sköts i integratorn).
- `pointerup`/`pointerupoutside` → `this._steering = false`. Hennes `vy` finns kvar → hon **glider ut** mjukt (momentum), inget snäpp.
- **Tap-tap-/tapp-fallback (för de minsta som inte kan dra):** ett enstaka tap i **övre halvan** av flygrutan ger en mild höjd-impuls uppåt (`vy -= 6`), tap i **nedre halvan** en impuls nedåt (`vy += 6`). Så barnet kan "klicka sig" upp/ner utan att hålla och dra. Samma `vy` driver samma integrator.
- **"Långsammare"-knappen:** `pointertap` → `this._slow = !this._slow`, byt emoji 🐢/🐇, `pop(btn)`, `audio.sfx('pop')`, `progress.setCustom('slow', this._slow)`. (Gameplay-kontroll → ingen föräldragrind.)

## Fysik & kalibrering
**Egen vertikal integrator** (matter.js behövs ej — rörelsen är 1-dimensionell). Allt körs i `ctx.ticker`, exit-säkert (ticker-drivet; INGEN GSAP på enhörningens position under flykt). Normalisera tiden: `const dt = Math.min(2, ctx.ticker.deltaMS / 16.67)`.

Per tick:
1. **Styr-input (fjäder mot fingret):** om `_steering` → `vy += (clamp(_fingerY,170,620) - uni.y) * STEER * dt`. `STEER = 0.030`.
2. **Dämpning (glid-momentum):** `vy *= Math.pow(DAMP, dt)`, `DAMP = 0.90`. (Ger mjuk utglidning när fingret släpps — "hon glider, snäpper inte".)
3. **Mjuk auto-magnet (förlåtande sikte):** låt `ring` = nästa opassade ring; om `0 < ring.x - 300 < 160` → `vy += (ring.ry - uni.y) * ASSIST * dt`, `ASSIST = 0.006`. Efter `_missStreak >= 2` höj till `ASSIST = 0.018` för nästa ring → garanterad genompassage.
4. **Hastighetstak:** `vy = clamp(vy, -MAXV, MAXV)`, `MAXV = 18`.
5. **Integrera:** `uni.y += vy * dt`.
6. **Mjuka gränser (studs vid nudd):** om `uni.y < 170` → `uni.y = 170; vy *= -0.4` (mjuk studs neråt) + `audio.sfx('soft')` (throttlat) + liten `puff`. Spegelvänt vid `uni.y > 620`. Aldrig en bestraffning — bara en lekfull studs.
7. **Världs-scroll:** `const speed = (this._slow ? 1.5 : 2.6) * dt`. Flytta varje ring/stjärna `obj.x -= speed`; parallax-moln `cloud.x -= speed * 0.45`. Recykla moln som passerar x<-150 till x=1430.
8. **Vinge-bob (kosmetiskt):** rotera 🦄 lätt mot `vy` (`uni.rotation = clamp(vy*0.012, -0.18, 0.18)`) för flyg-känsla.

**Ring-kollision (passage):** för varje opassad ring, när den korsar enhörningens x (dvs `ring.x` gick från `>300` till `<=300` detta tick, eller `Math.abs(ring.x-300) < speed`): mät `d = Math.abs(uni.y - ring.ry)`.
- `d < R` (öppningens radie) → **passage!** markera `ring.passed = true`, tänd nästa progress-pip, `audio.sfx('pling')` + `sparkle(fxLayer, 300, uni.y)` + `floatText(fxLayer, 300, uni.y-60, '⭐')`, nollställ `_missStreak`, öka `_ringsDone`.
- annars → **miss (rolig):** `wiggle(ring)` + `puff(fxLayer, ring.x, ring.ry, {count:8})` + `audio.sfx('soft')` + valfritt `voice.say('Hoppsan!')` (throttlat), `_missStreak++`, och **köa en extra ring** så `target` alltid är nåbart. Ringen driver vidare av sig själv (ingen straff).

**Stjärn-kollision:** om `Math.hypot(uni.x-star.x, uni.y-star.y) < 60` → samla: `audio.sfx('pling')` (eller `'pop'`), `sparkle` + `pop(star)` följt av exit-säker bort-tween (proxy `{}`), `_starsDone++`.

> Detta är en egen integrator — inga `previewGravity`/`AimLauncher`-värden gäller. Inga externa fysikkrafter; ingen gravitation (hon "svävar"), bara fjäder + dämpning, så känslan blir luftig och förlåtande.

## Återkoppling & belöning
Varje pekning → ljud+bild <100ms:
- **Drag-start:** mjukt `audio.sfx('tap')`, glitter-svans tänds.
- **Ring passerad:** `audio.sfx('pling')` + `sparkle` + pip tänds med `pop`. Var 3:e ring även `'reveal'`/`'correct'` för variation + `voice.say(randomFrom(['Wow!','Bra fluget!','Hurra!']))` (sparsamt, ej tjat).
- **Stjärna samlad:** `audio.sfx('pop')` + `sparkle` + `floatText('⭐')`.
- **Kant-nudd:** `audio.sfx('soft')` (throttlat ~180ms) + liten `puff`. Aldrig buzzer/rött.
- **Miss av ring:** `wiggle` + `puff` + `soft` — en lekfull "hoppsan", aldrig straff.
- **Slow-toggle:** `pop(btn)` + `audio.sfx('pop')`.
- **Mål (alla ringar):** `this._resolving = true`; `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, enhörningen gör en glad loop/`pop`, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})` + `burst(fxLayer, 300, uni.y)`, `ctx.progress.complete()`, sedan `gsap.delayedCall(1.6, ()=> this._alive && this._nextLevel(ctx))`.
- **Idle-recue:** ingen interaktion ~6s → `voice.replayLast()` (eller `voiceIntro`) + `breathe`-puls på enhörningen en gång + mjuk vink uppåt/neråt. Nollställ idle vid varje pekning.

Sfx som används: `tap, pop, pling, soft, reveal/correct, celebrate`. Voice: `voiceIntro`, kort beröm, 'Hoppsan!'.

## Progression & nivåer
- Läs `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` i `init`. `this._slow = !!progress.get().custom?.slow`.
- Nivåtabell (cyklisk, oändlig lek) — styr `target` (ringar att passera), ring-radie **R**, och ringarnas vertikala **bobbning**:
  1. **Nivå 0–1:** `target=3`, `R=90`, ringar stilla. Lär ut glidet.
  2. **Nivå 2–3:** `target=4`, `R=80`, ringar bobbar långsamt ±20px (sin).
  3. **Nivå 4–5:** `target=5`, `R=70`, bobb ±35px, fler stjärnor mellan ringar.
  4. **Nivå 6+:** `target=6`, `R=60`, bobb ±50px, ringarnas ry mer spridd. Därefter upprepas mönstret med ny `randomFrom(PLAYFUL)`-färgsättning och lätt jitter.
- Ring-bobbning (per ring, kosmetisk + påverkar sikte): `ring.ry = ring.ry0 + Math.sin(t*ring.bobSpeed + ring.phase) * bobAmp` — uppdateras i ticker så auto-magneten siktar på den aktuella `ry`.
- Vid `complete()`: `ctx.progress.setLevel(this._level + 1)`, `setCustom('rundor', n+1)` (oändlig räknare), vänta ~1,6s, `_nextLevel(ctx)` återanvänder samma noder (töm ringar/stjärnor, nollställ `_ringsDone=0`, `_missStreak=0`, enhörning till y=360 vy=0, bygg ny spawn-kö). Inga sjunkande värden, ingen synlig poäng.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics` + `lib/scene.js`. Inga externa bild-/ljud-/fontfiler.
- Emoji: 🦄 (enhörning/Elvira), ⭐ (stjärnor + svans-/firande-pip), ✨ (ring-accent), 🐢/🐇 (slow-knapp).
- Graphics: glansiga ring-hoops (dubbla `circle().stroke()` + vit highlight), progress-pips (små hoops), enhörningens skuggellips, parallax-moln (vita `roundRect`/`circle`-puffar), slow-knappens platta (`circle().fill().stroke()`).
- Bakgrund: `createScene('sky', { ground:false })`. Firande via `bigCelebration`/`burst`/`sparkle` i `ctx.fxLayer`.

## Återanvänd dessa
- `lib/scene.js`: `createScene('sky', { ground:false })` (+ ev. `makeCloud`-stil för egna parallax-moln).
- `lib/feedback.js`: `sparkle`, `puff`, `wiggle`, `pop`, `bounceIn`, `breathe`, `floatText`, `burst`, `bigCelebration`. (Alla exit-säkra.)
- `lib/theme.js`: `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`, `DESIGN_W/H`.
- `lib/swedish.js`: `randomFrom`, `shuffle`.
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast/cancel`.
- `ctx.progress`: `get`, `setLevel`, `setCustom`, `complete`.
- `ctx.ticker` (integrator + scroll + idle), `ctx.fxLayer` (firande/gnistor), `gsap` (knapp-pop, firande-loop, exit-säkra proxy-tweens).
- INTE `DragController`, INTE `physics.js`/`AimLauncher` (egen 1D-integrator passar bättre).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`onComplete`/`_nextLevel`-callbacks tidigt-returnerar om `!this._alive`.
- `this._resolving = true` när målet nås → ticker-integratorn och pointer-callbacks returnerar tidigt tills nästa nivå byggs → `complete()` kan ALDRIG triggas två gånger (snabb-tryck-skydd).
- Klampa `vy` och `uni.y` varje tick så enhörningen aldrig skjuts ut ur rutan; klampa `dt` (≤2) så ett hack/flikbyte inte teleporterar henne.
- Throttla kant-/miss-ljud (~180ms) så multistudsar inte spammar audio.
- Recykla ringar/stjärnor som passerar x<-120 (destroy + ta bort ur listan, eller pool-återanvänd) så listorna inte växer oändligt.
- Exit-säkra partiklar: använd ENBART `lib/feedback.js`-hjälparna eller `{}`-proxy-mönstret; tweena ALDRIG en ring/stjärna/enhörning direkt på en `onComplete` som även kan trigga vid exit. Enhörningens position rörs bara av integratorn (ticker), aldrig av en kvardröjande GSAP-tween.
- Idle-timer i ticker nollställs vid varje pekning; recue bara om `!_resolving && _alive`.
- `destroy(ctx)`: `this._alive=false`; `ctx.ticker.remove(this._tick)`; avregistrera pointer-lyssnare på dragytan/slow-knapp; `gsap.killTweensOf(...)` för enhörning, knapp, pips och alla ringar/stjärnor; döda `breathe`/svans-tweens; `this._root?.destroy({children:true})`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/enhorningen-flyger/index.js`. Importera `Container, Graphics, Text, Rectangle` från `pixi.js`, `gsap`, `createScene` från `lib/scene.js`, hjälpare från `lib/feedback.js`, `COLORS, PLAYFUL, FONT, PRAISE` från `lib/theme.js`, `randomFrom` från `lib/swedish.js`.
2. Default-exportera GameModule-objektet med metadatan i tabellen ovan.
3. `init(ctx)`: `this._alive = true`; `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Lägg `createScene('sky',{ground:false})` som första barn. Skapa lager: `_parallax` (moln) → `_field` (ringar+stjärnor) → enhörning → `_pips` (topp) → slow-knapp. Skapa transparent dragyta (`eventMode:'static'`, `hitArea = new Rectangle(0,90,1280,630)`) och koppla `pointerdown`/`globalpointermove`/`pointerup`/`pointerupoutside` + tap-fallback. Läs `_level`/`_slow` från `ctx.progress`.
4. `_makeUnicorn()`: container (skuggellips + 🦄-Text + svans-hook). Placera (300,360), `vy=0`.
5. `_buildLevel(ctx)`: sätt `target/R/bobAmp` från `_level`; töm `_field`; nollställ `_ringsDone=0, _missStreak=0, _resolving=false`; bygg en **spawn-kö** (ringar var ~520px + stjärnor emellan) och en spawn-pekare; bygg/uppdatera progress-pips (otända); `bounceIn` på enhörningen.
6. `_spawn(ctx)`: lägg in nästa ring/stjärna vid x=1380 när föregående kommit tillräckligt långt; ge ring `ry0`, `bobSpeed`, `phase`, `passed=false`.
7. Lägg integratorn: `this._tick = (tk)=> this._update(ctx, tk)`, `ctx.ticker.add(this._tick)`. `_update`: beräkna `dt`, kör fjäder+dämpning+auto-magnet+klamp+integrera+gränsstuds (Fysik-sektionen), scrolla värld+parallax, uppdatera ring-bobb, kör ring-/stjärn-kollision, recykla off-screen-objekt, hantera idle-timer. Allt bakom `if(!this._alive||this._resolving) return` där relevant.
8. `_onRingPassed()` / `_onStar()` ger ljud+gnistor+pip; när `_ringsDone >= target` → `_win(ctx)`.
9. `_win(ctx)`: `_resolving=true`, firande + `voice.say(randomFrom(PRAISE))` + `bigCelebration` + `burst`, `ctx.progress.setLevel(_level+1)`, `setCustom('rundor', ...)`, `ctx.progress.complete()`, `gsap.delayedCall(1.6, ()=> this._alive && this._nextLevel(ctx))`.
10. `_nextLevel(ctx)`: `this._level++`, återställ enhörning (y=360, vy=0), `_buildLevel(ctx)`.
11. Slow-knapp: `pointertap` togglar `_slow`, byter 🐢/🐇, `pop`, `audio.sfx('pop')`, `setCustom('slow', _slow)`.
12. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
13. `destroy(ctx)`: enligt "Edge-cases & städning".
14. Registrera i `src/games/registry.js`: `import enhorningenFlyger from './enhorningen-flyger/index.js'` + lägg i `GAMES`.
15. `npm run dev`: spela — verifiera mjuk glidning/momentum, ring-passage tänder pips, miss = rolig studs, slow-knapp ändrar fart, mål-firande, hem-knapp, röst-repris, samt att `highestLevel`/`custom.slow`/`custom.rundor` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (canvas finns; inga uncaught errors i `browser_console_messages`).
- `voiceIntro` är satt (`"Dra för att flyga genom ringarna!"`) och spelas på mount.
- **Styrning fungerar:** en `pointerdown` högt upp följt av `globalpointermove` nedåt får enhörningens `y` att glida nedåt (verifiera via exponerat teststate, t.ex. `window.__barnspel` → `uni.y`/`vy`), och hon **fortsätter glida en bit efter `pointerup`** (momentum, inte snäpp).
- **Tap-fallback:** ett tap i övre halvan ger uppåt-impuls (`vy<0`), ett i nedre halvan nedåt (`vy>0`).
- **Andra kontrollen ändrar utfallet:** tryck på slow-knappen togglar `_slow` och **scroll-farten halveras** (mätbart: ringarnas x-förflyttning per tick minskar).
- **Ring-passage:** när enhörningens y är inom `R` av en rings `ry` vid korsning räknas ringen, en progress-pip tänds och `_ringsDone` ökar.
- **No-fail:** en avsiktlig miss ger mjuk respons (`soft`/`wiggle`/`puff`) — INGET felljud/buzzer, ingen omstart, ingen poängsänkning; banan fortsätter och en extra ring köas så `target` förblir nåbart.
- **Auto-hjälp:** efter upprepade missar (`_missStreak>=2`) centreras nästa ring (höjd `ASSIST`) så passagen garanteras.
- **Mål:** när `_ringsDone >= target` körs firande (konfetti i `fxLayer`) och `ctx.progress.complete()` anropas **exakt en gång** (inget dubbeltrigg via `_resolving`).
- **Progress sparas:** efter en avklarad nivå är `highestLevel` ökat och `custom.slow`/`custom.rundor` kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- **Städning:** vid retur till biblioteket (hem-knapp) tas ticker-integratorn bort och inga tweens/timeouts loggar eller kastar fel.
