# Loopdjuren (`loopdjuren`)
> Barnet släpper små rörelse- och ljudblock i varje djurs loop-bana och en hel liten låt med dans växer fram av sig själv — oändligt många kombinationer, inget kan bli fel, bara att pyssla och lyssna medan djuren studsar i takt.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `loopdjuren` | Loopdjuren | 🎶 | roligt | drag | [2,5] | `loopdjuren` | "Lägg blocken hos djuren så börjar de dansa!" |

## Mål & mekanik
Loopimal-stil, öppen kreativ musiklek. **Inget kan bli fel** — det finns inget rätt svar, bara att skapa.

- Skärmen visar **3–4 djur** i vågräta rader. Bredvid varje djur ligger en **LOOP-bana** av tomma slots (4–6 st, nivåberoende).
- En **spelhuvud-stapel** (playhead) sveper kontinuerligt över alla banor i synk, vänster→höger, och börjar om (oändlig loop). När den passerar en slot som har ett block i sig, utför **det djuret** blockets rörelse + ljud i takt.
- Barnet **drar block** från en bricka längst ner (hopp, snurr, tut, klapp, **röst**) och släpper dem i slots. Loopen spelar HELA tiden, så varje nytt block hörs direkt nästa varv → en liten melodi + dans byggs fram (emergent).
- **Block-typer** (rörelse + ljud, alla <100ms efter att huvudet når sloten):
  - **hopp** ⬆️ — djuret studsar upp/ner, `audio.sfx('boing')`.
  - **snurr** 🌀 — djuret snurrar ett varv (rotation 2π), `audio.sfx('whoosh')`.
  - **tut** 🎺 — djuret sträcker sig (stretch), `audio.sfx('pling')` (en ljus ton).
  - **klapp** 👏 — djuret gör en snabb dubbel-squash, `audio.sfx('pop')`.
  - **röst** 🎵 — djuret säger SITT eget läte: `audio.sample('djur_<id>')` (riktigt djurklipp; faller tillbaka på `voice.say` med ramsa om klippet saknas).
- **Spelarpåverkan (≥2 kontroller som tydligt ändrar utfallet):**
  1. **Vilka block + i vilken ordning** i varje bana → helt olika melodi/dans.
  2. **Tempo-knapp** (🐢 lugn / 🐇 snabb) växlar loopens hastighet för alla.
  3. **Tappa ett djur** = pausa/aktivera just det djuret (tyst-knapp), så barnet kan sola ut ett djur.
  4. **Tappa en slot** = ta bort/byt blocket där (cyklar block-typ eller tömmer).
- **"Klart"** (öppet, mjukt): första gången huvudet hinner ett HELT varv där **varje aktivt djur** spelat minst ett block → kort firande + klistermärke via `ctx.progress.complete()`. **Leken stannar inte** — loopen rullar vidare och barnet pysslar så länge det vill.

## Skärm-layout (1280x720)
GameHost ritar hem-/högtalar-knapp i headern (y<90) — rita INGA egna. Allt nedan ligger i spelets `_root` (designkoordinater).
- **Bakgrund:** `createScene('candy', { width: ctx.width, height: ctx.height })` som FÖRSTA barn (glad, musikalisk känsla). `eventMode='none'`.
- **Scen-rubrik (dekor):** en liten not-rad/vimpel överst centrerad, valfritt — annars inget (noll läsning).
- **Djurrader (3 default, 4 vid hög nivå):** jämnt fördelade i y ∈ [140, 600].
  - 3 rader: y-center 210 / 370 / 530. 4 rader: 185 / 320 / 455 / 590.
  - Varje rad har en **radpanel** `roundRect(70, yc-66, 1140, 132, 28)` fylld med radens PLAYFUL-färg vid `alpha:0.16`, mjuk kant `stroke({width:4, color:radColor, alpha:0.5})`.
  - **Djuravatar:** Container vid x=130, y=yc. Glansig cirkel-bricka `circle(0,0,58).fill(COLORS.cream).stroke({width:5,color:radColor})` + liten vit glansprick uppe till vänster + emoji-Text (fontSize 84, anchor 0.5). Osynlig hit-halo `hitArea = new Circle(0,0,80)` (≥96px träffyta).
  - **Loop-bana:** slots i en rad från x=232 till x≈1150, y=yc. N slots (nivå), slot-mitt-avstånd `gap = (1150-280)/(N-1)` (start-x 280). Varje slot = `roundRect(-46,-46,92,92,18)` "tomt hål" `fill(COLORS.white, alpha:0.55).stroke({width:3,color:COLORS.inkSoft,alpha:0.4})`, hit-halo `hitArea = new Rectangle(-58,-58,116,116)` (≥96px). Ett block som ligger i sloten ritas ovanpå (samma 92×92, blockfärg + emoji).
- **Spelhuvud (playhead):** en lodrät genomskinlig stapel `roundRect(-6, 130, 12, 480, 6).fill(COLORS.yellow, alpha:0.55)` som glider i x över alla banor; toppmarkör liten triangel/cirkel. `eventMode='none'`. Ligger ÖVER radpaneler men UNDER block.
- **Block-bricka (tray):** botten-panel `roundRect(60, 624, 1160, 84, 24).fill(COLORS.white, alpha:0.92).stroke({width:3,color:COLORS.yellow})`. I den: de 5 block-"stämplarna" (hopp/snurr/tut/klapp/röst) som **dra-källor**, var och en 92×92 färgad `roundRect` + emoji, mitt-avstånd ≥120px, hit-halo +24px. Stämplarna töms ALDRIG (oändlig källa — en ny kopia skapas vid varje drag).
- **Tempo-knapp:** stor rund `Button`-liknande bricka uppe till höger i brickan (x≈1150, y=666), emoji 🐢/🐇 som växlar; ≥96px.

## Interaktion
- **Dra block (huvudgest):** använd `lib/DragController.js`. Registrera varje **bricka-stämpel** så att drag-start skapar en *kopia* (proxy) som följer fingret; vid släpp nära en slots mitt (`Math.hypot < 64`) snäpper kopian in i sloten (`_setSlot(row, i, type)`), annars puff bort + mjuk `audio.sfx('soft')` (aldrig straff). Drag har inbyggd **tap-tap-fallback** (tappa stämpel → tappa slot) för de minsta.
- **Tappa slot direkt:** `pointertap` på en slot cyklar dess block-typ (tomt → hopp → snurr → tut → klapp → röst → tomt). Så även ren tap-only-lek bygger loopar utan drag.
- **Tappa djur:** `pointertap` på avataren togglar `row.active`; inaktivt djur dämpas (`alpha 0.5`, grå bricka) och hoppar över sina block. Tap igen återaktiverar (pop + `audio.sfx('pop')`).
- **Tempo-knapp:** `pointertap` växlar `this._beatMs` mellan 640 (🐇 snabb) och 900 (🐢 lugn); spelar `audio.sfx('flip')`, knappen poppar.
- **Loop-timer (ticker-driven, exit-säker — INGEN GSAP på loop-logiken):**
  - I `_tick(ticker)`: `this._t += ticker.deltaMS`. `const beat = Math.floor(this._t / this._beatMs) % this._slots` (this._slots = antal slots).
  - Playhead-x interpoleras mjukt: `const frac = (this._t % (this._beatMs*this._slots)) / (this._beatMs*this._slots)`; `playhead.x = 280 + frac * (1150-280)` (klampa). Detta är en ren positionsuppdatering varje frame, inte fysik.
  - **Beat-trigger:** när `beat !== this._lastBeat` → för varje aktiv rad, läs `row.slot[beat]`; om ifyllt kör `_perform(row, type)`. Sätt `this._lastBeat = beat`. När `beat` wrappat till 0 räknas ett varv (kolla "klart"-villkor).
- Allt bakom `if (!this._alive) return` överst i `_tick`.

## Återkoppling & belöning
- **Varje pekning (<100ms):** drag-start `audio.sfx('tap')` + stämpel-pop; lyckad släpp-i-slot `audio.sfx('pling')` + `bounceIn(blockView)` + liten `sparkle(ctx.fxLayer, slotX, slotY)`; slot-tap-cykel `audio.sfx('pop')`.
- **Block utförs på sin beat (`_perform`):**
  - hopp: `gsap.to(view, {y: yc-26, duration:0.12, yoyo:true, repeat:1, ease:'power2.out'})` + `audio.sfx('boing')`.
  - snurr: `gsap.to(view, {rotation: view.rotation + Math.PI*2, duration:0.4, ease:'power1.inOut'})` + `audio.sfx('whoosh')`.
  - tut: `pop(view, {scale:1.3})` (stretch) + `audio.sfx('pling')`.
  - klapp: `pop(view)` snabbt två gånger + `audio.sfx('pop')`.
  - röst: `pop(view, {scale:1.22})` + `audio.sample('djur_'+row.id)`; om den returnerar `false` → `voice.say(row.cry)` (t.ex. "Mu", "Voff", "Mjau"). Liten `floatText(ctx.fxLayer, view.x, view.y-70, '🎵')`.
  - Tweens körs på den **persistenta** avatar-vyn (dödas i `destroy`), inte på objekt som förstörs av sin egen onComplete → säkert.
- **"Fel" finns inte:** släpp utanför slot → blockkopian `puff(ctx.fxLayer, x, y)` + `audio.sfx('soft')` och försvinner snällt; tomma banor är helt ok.
- **"Klart"-firande (mjukt, leken fortsätter):** när första hela varvet där alla aktiva djur spelat ≥1 block fullbordas → `this._celebrated = true`, `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})`, `ctx.progress.complete()` (klistermärke). Loopen pausas INTE.

## Progression & nivåer
- `const level = Math.min(ctx.progress.get().highestLevel || 1, 3)` styr storleken:
  1. **3 djur, 4 slots** (ko 🐮, hund 🐶, katt 🐱).
  2. **3 djur, 5 slots**.
  3. **4 djur, 6 slots** (lägg till gris 🐷; vid behov anka 🦆/groda 🐸/häst 🐴 från sampel-listan).
- Djur-id ↔ sampel: `ko→djur_ko`, `hund→djur_hund`, `katt→djur_katt`, `gris→djur_gris`, `anka→djur_anka`, `groda→djur_groda`, `hast→djur_hast`, `far→djur_far` (alla finns i `public/audio/sfx/manifest.json`). `row.cry` = svensk ramsa-fallback (Mu/Voff/Mjau/Nöff/Kvack/Kvack/Gnägg/Bä).
- Efter första "klart": `ctx.progress.setLevel((ctx.progress.get().highestLevel||1)+1)` så nästa besök får fler slots/djur. `setCustom('arrangemang', n+1)` räknar skapade loopar (oändligt, aldrig sjunkande).
- Öppet slut: barnet kan fortsätta pyssla hur länge som helst; nya milstolpar (fyller ALLA slots i alla banor) ger extra `sparkle`/`floatText('⭐')` men spammar inte `complete()` (guarda med `this._celebrated`; nollställs om nivån växer).

## Tillgångar (programmatiskt)
- **Emoji (Text):** djur 🐮🐶🐱🐷🦆🐸🐴🐑; block ⬆️ 🌀 🎺 👏 🎵; tempo 🐢/🐇; firande sköts av `bigCelebration`.
- **Pixi Graphics:** scene.js-bakgrund (candy), radpaneler (`roundRect` + alpha), djurbrickor (`circle` + glansprick), slots ("tomt hål" `roundRect`), block-brickor (färgad `roundRect`), playhead-stapel, tray-panel. Glansiga former + mjuka skuggor (halvtransparent `circle`/`roundRect` under objekt), INGA filter.
- **Ljud:** `audio.sfx('boing'|'whoosh'|'pling'|'pop'|'tap'|'flip'|'soft'|'celebrate')` + `audio.sample('djur_*')`. **Inga externa bild-/ljud-/fontfiler.**

## Återanvänd dessa
- `lib/scene.js`: `createScene('candy', ...)` — bakgrund som första barn.
- `lib/DragController.js`: drag av block + tap-tap-fallback (källa→slot, snäpp/snäpp-tillbaka).
- `lib/feedback.js`: `bounceIn`, `pop`, `wiggle`, `puff`, `sparkle`, `floatText`, `bigCelebration` (alla exit-säkra).
- `lib/theme.js`: `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`.
- `lib/swedish.js`: `randomFrom`, `shuffle`.
- `ctx.services.audio` (`sfx`/`sample`), `ctx.services.voice` (`say`/`replayLast`).
- `ctx.progress`: `get`, `setLevel`, `setCustom`, `complete`.
- `ctx.ticker` (loop-timern + idle), `ctx.fxLayer` (gnistor/konfetti), `gsap` (block-rörelser + idle, dödas i destroy).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. `_tick`, alla `gsap.delayedCall`/`onComplete` och DragController-hooks tidig-returnerar om `!this._alive`.
- **Loop-state:** håll `this._rows` (varje: `{ id, view, slots:[type|null], active, cry }`), `this._slots`, `this._beatMs`, `this._t`, `this._lastBeat`, `this._celebrated`.
- **Dubbel-`complete()`-skydd:** `this._celebrated` gör att firandet/`complete()` bara körs en gång per arrangemang (nollställs när nivån växer). Inga snabba dubbeltryck kan trigga två firanden.
- Throttla djur-läten så ett snabbt tempo + många röst-block inte spammar (t.ex. min 120ms mellan samma rads `sample`).
- **Idle-recue:** i `_tick`, om `this._idle > 6s` utan interaktion OCH inga block placerade → `voice.say(this.voiceIntro)` + `wiggle` på första tomma sloten/första stämpeln som vink; nollställ `_idle` vid varje pekning. (Om block redan finns, var tyst — musiken talar för sig själv.)
- `destroy(ctx)`: `this._alive=false`; `ctx.ticker.remove(this._tick)`; `this._drag?.destroy()`; avregistrera pointer-lyssnare (djur/slots/tempo); `gsap.killTweensOf(...)` för varje djur-vy, playhead och blockvyer; `this._root?.destroy({children:true})`.
- Skydda mot block-kopia som förstörs mitt i snäpp-tween: tweena `{}`-proxy eller använd `bounceIn` på den nyligen tillagda (persistenta) slot-blockvyn, inte på den temporära drag-kopian.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/loopdjuren/index.js`, default-exportera GameModule med metadatan ovan. Importera `Container, Graphics, Text, Circle, Rectangle` från `pixi.js`, `gsap`, `DragController`, feedback-hjälpare, `createScene`, `COLORS/PLAYFUL/FONT/PRAISE`, `randomFrom`.
2. `init(ctx)`: `this._alive=true`; `this._root = new Container()`, `ctx.stage.addChild(this._root)`; lägg `createScene('candy',{width,height})` först. Läs `level` ur `ctx.progress.get().highestLevel`; sätt `this._slots`/djurlista enligt nivå. `this._beatMs=900`, `this._t=0`, `this._lastBeat=-1`, `this._celebrated=false`, `this._idle=0`.
3. Bygg radpaneler + djuravatarer (`_makeAnimal(id,emoji,yc,color)`), loop-banor (`_makeSlots(row)`), playhead, tray med 5 block-stämplar (`_makeStamp(type)`), tempo-knapp. `this._drag = new DragController({ space:this._root, services:ctx.services })`.
4. Implementera `_setSlot(row,i,type)` (rita/ersätt blockvy i sloten, `bounceIn`+`sparkle`), slot-`pointertap` (cykla typ), djur-`pointertap` (toggla `active`), tempo-tap (växla `_beatMs`).
5. Drag: registrera varje stämpel i DragController så drag skapar en följ-kopia; on-drop nära slot → `_setSlot`, annars `puff`+`soft`. Säkerställ tap-tap-fallback.
6. `_perform(row,type)`: kör rörelse + ljud enligt "Återkoppling". `_tick(ticker)`: uppdatera `_t`, playhead-x, beat-trigger, varv-räkning, idle. `ctx.ticker.add(this._tick = (t)=>this._tick_impl(t,ctx))`.
7. Varv-klart-koll: om alla aktiva djur spelat ≥1 block under varvet och `!_celebrated` → firande + `complete()` + `setLevel`/`setCustom` (se Progression).
8. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
9. `destroy(ctx)`: städa enligt checklistan.
10. Registrera i `src/games/registry.js`: `import loopdjuren from './loopdjuren/index.js'` + lägg `loopdjuren` i `GAMES`.
11. `npm run dev`, öppna biblioteket, spela: dra block, hör loopen dansa, växla tempo, tysta ett djur, verifiera hem-knapp, röst-repris, firande vid full loop, och att `arrangemang`/`highestLevel` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (canvas finns, inga uncaught errors); `voiceIntro` är satt ("Lägg blocken hos djuren så börjar de dansa!") och sägs vid mount.
- Loopen rullar: playhead-x ökar över tid och wrappar (testbart via exponerad teststate `_t`/playhead.x ändras mellan frames).
- Att placera ett block (drag stämpel→slot, eller slot-tap-cykel) fyller slotens state (`_rows[r].slots[i]` blir en typ) och blockvyn syns.
- När playhead passerar en ifylld slot utförs djurets rörelse + ljud (verifiera via exponerad räknare för `_perform`-anrop eller djur-vyns scale/rotation ändras).
- Tempo-knappen växlar `_beatMs` mellan två värden; tap på djur togglar `active` (skip av blocken).
- Inget kan bli fel: släpp av block utanför en slot ger mjuk respons (`soft`/puff) och INGET felljud/buzzer, ingen omstart, ingen poängsänkning.
- Vid första hela varvet där alla aktiva djur spelat ≥1 block körs firande och `ctx.progress.complete()` anropas exakt EN gång (guardas av `_celebrated`, ingen dubbeltrigg).
- Öppet slut: efter firandet fortsätter loopen spela (ingen game-over, ingen paus); `custom.arrangemang`/`highestLevel` kvarstår i localStorage efter omladdning.
- `destroy` lämnar inga kvarvarande tickers/tweens (inga konsolfel efter att man lämnar spelet mitt i en animation).
