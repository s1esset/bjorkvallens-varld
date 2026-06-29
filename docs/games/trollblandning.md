# Trollkarlens Blandning (`trollblandning`)
> Barnet drar ihop två glödande element-droppar i trollkarlens kittel och ser dem pysa ihop till något HELT nytt — eld + vatten blir ånga, eld + jord blir lava — varje upptäckt fyller en magisk receptbok, så det är ren upptäckar-glädje utan ett enda felsteg.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `trollblandning` | Trollkarlens Blandning | 🧪 | pussel | drag | [3,5] | `trollblandning` | "Dra två droppar i kitteln och se vad som händer!" |

(`titleSv` MED åäö. `id`/bundle ASCII. Maskoten Bobo bär trollkarlshatt — han är maskot, alltså INTE namngiven som människa; inga avbildade människor finns i detta spel.)

## Mål & mekanik
En **kittel** står mitt på skärmen. Längs en **hylla** nederst ligger glansiga **element-droppar** (start: 🔥 Eld, 💧 Vatten, 🌱 Jord, 🌬️ Luft, ❄️ Is). Till höger ligger en **Receptbok** 📖 med några tomma rader (❓ + ❓ = ❓) — rundans mål.

**Kärnloop (dra två droppar ihop → reaktion):**
1. Barnet drar en droppe in i kitteln (eller tappar droppen → tappar kitteln). Droppens *källa* på hyllan är oändlig (snäpper tillbaka hem), men en **ingrediens** läggs i kitteln. Två små ingrediens-platser ovanför kitteln visar vad som ligger i.
2. När **två** ingredienser ligger i kitteln rör trollkarlen om (~0,4s) och de **reagerar**:
   - **Recept finns** → kitteln pyser (partikel-burst + stigande resultat-emoji), brygd-ytan byter färg, en **ny droppe** bounce:ar in på hyllan, och om receptet är ett av rundans mål-recept fylls en rad i Receptboken (❓→resultat) med gnistor. Trollkarlen studsar och säger resultatets namn.
   - **Recept saknas** (två giltiga droppar utan reaktion) → INGEN bestraffning: en mjuk grå puff + `voice.say('Hmm... prova en annan!')`, kitteln vinglar vänligt och de två ingredienserna **studsar ut igen** (inget förbrukas). Barnet provar bara vidare.
3. **Kedje-reaktioner:** upptäckta resultat-droppar (Lava, Lera, Moln, Sol …) blir egna draggbara droppar på hyllan → kan dras tillbaka in (Lava+Vatten=Sten, Lera+Eld=Kruka, Sol+Vatten=Regnbåge).
4. **Klart** = alla rader i Receptboken är ifyllda → kitteln kokar över i en lysande **Trolldryck** 🧪, stort firande, `ctx.progress.complete()`, sedan byggs nästa (rikare) runda.

**No-fail-garanti:** man kan aldrig "fastna". En idle-timer låter trollkarlen ge allt tydligare ledtrådar (lyser upp de två droppar som hör ihop, ritar en mjuk prick-linje mellan dem, säger "Prova Eld och Vatten!") och efter några ledtrådar **utför han kombinationen själv** så ett nytt recept ALLTID hittas. Inga poäng, ingen timer-press, inget rätt/fel-ljud.

## Skärm-layout (1280x720)
GameHost ritar hem-/repetera-knappar i headern — rita INGA egna. Allt nedan ligger i spelets `_root` (designkoordinater). Bakgrund = `createScene('night', {width:1280,height:720})` som FÖRSTA barn (mörkblå stjärnhimmel = magisk lab-känsla).

- **Trollkarl Bobo (maskot):** `makeMascot(80)` placerad i en Container vid **(180, 210)**. Ovanpå huvudet en egenritad **spetshatt**: `Graphics().poly([0,-150, -70,-30, 70,-30]).fill(COLORS.purple).stroke({width:6,color:0x6b4fc4})` + brätte `ellipse(0,-26,82,18)` + en ⭐ (Text, fontSize 40) på hatten. Han reagerar (`pop`) vid varje reaktion.
- **Kittel:** centrum `cx=560, cy=400`.
  - Skugga: `ellipse(cx, cy+92, 150, 28).fill({color:0x000000, alpha:0.18})`.
  - Kropp: `ellipse(cx, cy, 140, 96).fill(0x2f2a4a).stroke({width:8, color:0x1c1830})`; två små ben `roundRect` under.
  - Rim: `ellipse(cx, cy-70, 146, 36).fill(0x423a66).stroke({width:6, color:0x6b4fc4})`.
  - **Brygd-yta** (egen Graphics `this._brew`): `ellipse(cx, cy-70, 120, 28).fill(this._brewColor)` + en liten ljus glansfläck. Färgen tweenas till senaste resultat (se Fysik).
  - **Ingrediens-platser:** två cirklar vid **(cx-52, cy-118)** och **(cx+52, cy-118)**, radie 34; tom = prickad ring (alpha 0.25), fylld = liten droppe-kopia + emoji.
  - **Drop-mål (logiskt):** cirkel radie **150** runt **(cx, cy-70)** (generös; ≥96px träffyta med marginal).
- **Hylla (palett):** `roundRect(60, 596, 840, 104, 30).fill(COLORS.brown).stroke({width:6, color:0x6b4027})`. Droppar centreras på **y=648**, jämnt fördelade från **x=150** med **120px** mellanrum (plats för bases + upptäckta resultat; radbryt till en andra rad y=648 / staplad om >7 — eller skala ner avstånd till 104px).
- **Receptbok 📖:** panel `roundRect(936, 96, 308, 470, 24).fill(COLORS.cream).stroke({width:6, color:COLORS.brown})` + en brun "rygg"-remsa till vänster. Rubrik (Text) "Receptbok". Under den en rad per mål-recept: två små droppe-ikoner + "=" + resultat-platshållare ❓ (Text, fontSize 44). Upptäckt → ❓ ersätts av resultat-emoji med `pop`+`sparkle`. En liten räknare-text "3 / 5" längst ner (frivillig, ingen "poäng").
- **Töm-knapp:** liten rund knapp vid **(740, 470)**, radie 48 (hit-halo 60 → ≥96px), emoji ↩️/🌀, tap → tömmer kittelns ingredienser tillbaka till hyllan (mjuk puff, `audio.sfx('soft')`). Detta är en barnvänlig kontroll, INTE bakom föräldra-grind.

**Droppe-utseende (alla droppar):** Container med en glansig droppe ritad i `Graphics` — `circle(0,0,52).fill(elementColor).stroke({width:5, color:white, alpha:0.5})` + en liten vit glansprick uppe-vänster (`circle(-18,-18,12).fill({color:white, alpha:0.6})`) — plus elementets **emoji** (Text, fontSize 60, anchor 0.5) ovanpå. Osynlig `hitArea = new Circle(0,0,80)` (≥160px träffyta). Mjuk skugg-ellips under.

## Interaktion
Enbart **drag** med inbyggd **tap-tap-fallback** via `lib/DragController.js` (snäpp/tap-tap är gjort för <4 år).

- `this._drag = new DragController({ space: this._root, services: ctx.services })`.
- Varje hyll-droppe: `this._drag.addItem(view, { elem: id }, hooks)`. Hyll-dropparna är **oändliga källor** — de ska INTE förbrukas eller låsas. Lägg därför i `hooks.onCorrect(rec, target)`:
  1. registrera ingrediensen: `this._addToCauldron(ctx, rec.data.elem)`,
  2. återställ droppen som källa: `rec.placed = false; rec.view.eventMode = 'static'`,
  3. snäpp hem: `gsap.to(rec.view, { x: rec.home.x, y: rec.home.y, duration: 0.25, ease:'back.out(1.4)' })`.
  (DragController sätter `placed=true`/`eventMode='none'` vid korrekt drop — vi nollställer det direkt så källan lever vidare.)
- Kitteln: `this._drag.addTarget(cauldronView, () => true, { hitRadius: 150 })`. `accepts` returnerar alltid `true` (allt får läggas i — reaktionen avgör utfallet, aldrig drag-controllern).
- **Tap-tap-fallback:** ingår gratis — tap på droppe (väljs, pulsar via DragControllerns `_pulse`), tap på kitteln → ingrediensen läggs i. Inget exakt drag krävs.
- **`_addToCauldron(elem)`:** lägg `elem` i `this._inCauldron` (max 2), uppdatera ingrediens-platserna, `audio.sfx('pop')`, liten `sparkle` vid kitteln, nollställ idle-timer. När `this._inCauldron.length === 2` → `gsap.delayedCall(0.4, () => this._alive && this._react(ctx))` (kort "omrörning"; sätt `this._resolving=true` under tiden så inget tredje läggs i).
- **`_react(ctx)`:** sortera paret → slå upp i `RECIPES`. Träff → `_onRecipe(ctx, resultId, isGoal)`. Ingen träff → `_onNoRecipe(ctx)`. Töm `this._inCauldron`, `this._resolving=false`.

## Fysik & kalibrering
Ingen matter.js behövs — "fysiken" är (a) exit-säkra reaktions-partiklar via `lib/feedback.js` och (b) en egen **ticker-driven bubbel-emitter** i kitteln (bobblande "pys"). INGEN GSAP på dessa Pixi-objekt (de kan förstöras av exit).

- **Bubbel-emitter (per tick, exit-säker):** `this._bubbles = []`. I ticker-callbacken (`deltaMS`, `const dt = deltaMS/16.67`):
  - Spawn: `this._bubT += deltaMS`; var ~380ms (och om `_bubbles.length < 8`) skapa en bubbla: liten `Graphics().circle(0,0, 4 + Math.random()*6).fill({color:this._brewColor, alpha:0.6})` vid `x = cx + (Math.random()*2-1)*90`, `y = cy-70`, `vy = -(0.4 + Math.random()*0.5)` px/frame, `life = 900` ms. `eventMode='none'`, läggs i kitteln-lagret (klippt av rim:en visuellt).
  - Integrera varje bubbla: `b.g.y += b.vy*dt; b.life -= deltaMS; b.g.alpha = Math.max(0, b.life/900)*0.6`. När `life<=0` eller `b.g.y < cy-150`: `if(!b.g.destroyed) b.g.destroy()`, ta bort ur arrayen.
  - I `destroy`: loopa `_bubbles` och `b.g.destroy()`; töm arrayen.
- **Brygd-färg-tween (exit-säker {}-proxy):** vid reaktion `lerpColor` (exporterad från `lib/scene.js`) från nuvarande till resultatfärg över 0.5s: tweena `{ t: 0 }`, i `onUpdate` `if(!this._brew.destroyed) this._brew.clear().ellipse(cx,cy-70,120,28).fill(lerpColor(from,to,st.t))...`. ALDRIG tweena `_brew` direkt.
- **Reaktions-pys:** `burst(ctx.fxLayer, cx, cy-70, {count:16, power:1.1})` + `puff(ctx.fxLayer, cx, cy-70, {count:10, color: resultColor})` + en `floatText(ctx.fxLayer, cx, cy-90, resultEmoji, {fontSize:80, rise:140})` (stiger som "ånga"). Alla redan exit-säkra.

## Återkoppling & belöning
Varje pekning → ljud+bild <100ms:
- Droppe tas/tappas: `audio.sfx('tap')` + skala-pop (DragController sköter lyft-skalan).
- Ingrediens läggs i kitteln: `audio.sfx('pop')` + `sparkle(ctx.fxLayer, cx, cy-70)`.
- **Nytt recept (mål):** `audio.sfx('reveal')` → kort därefter `audio.sfx('celebrate')`; brygd-färg-tween + reaktions-pys (ovan); ny droppe `bounceIn` på hyllan; receptbok-raden fylls (`pop`+`sparkle`); `pop(mascot)` + `voice.say('${resultNamn}! Vad fint!')`.
- **Nytt recept (ej i mål-listan):** samma pys men lugnare: `audio.sfx('match')` + `voice.say('${resultNamn}!')` (ändå en glädje, bara mindre fanfar).
- **Redan upptäckt recept igen:** `audio.sfx('pling')` + liten `sparkle` (alltid positivt, aldrig "fel").
- **Recept saknas:** `audio.sfx('soft')` + grå `puff(ctx.fxLayer, cx, cy-70, {count:8, color:0xb9b2c9})` + `wiggle(this._cauldron)` + ingredienserna studsar ut till hyllan + `voice.say('Hmm... prova en annan!')`. ALDRIG buzzer/rött/omstart.
- **Klart (boken full):** `this._resolving=true`; Trolldryck 🧪 stiger ur kitteln (`floatText` stor), `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})`, `ctx.progress.complete()`. Efter ~1.6s (`gsap.delayedCall`) `this._buildRound(ctx)` (nästa nivå).
- **Idle-ledtrådar (mjuk auto-hjälp, eskalerande):** se nedan — alltid uppmuntrande, aldrig stressande.

## Progression & nivåer
- `const level = Math.min(ctx.progress.get().highestLevel || 0, 3)` styr tillgängliga element + mål-recept. `setCustom('recept', [...])` sparar upptäckta recept-id; `setLevel(level+1)` höjer vid klar runda; `setCustom('rundor', n+1)` räknar rundor (oändligt).
- **Element- & receptregister** (paren är ordnings-oberoende; nyckel = sorterade id:n):
  - Bas: `eld🔥`(0xff6b6b) `vatten💧`(0x4aa3df) `jord🌱`(0x5bbf6a) `luft🌬️`(0x57c8c3) `is❄️`(0xbdeefa).
  - Resultat: `anga💨`(0xd8e6ee) `lera🟤`(0x8a5a3b) `lava🌋`(0xf5731e) `sno☃️`(0xffffff) `moln☁️`(0xe8eef2) `sol☀️`(0xffd35c) `regn🌧️`(0x6fa8d6) `sten🪨`(0x9b9088) `kruka🏺`(0xc77c4a) `regnbage🌈`(0xa78bfa).
  - RECIPES: `eld+vatten→anga`, `jord+vatten→lera`, `eld+jord→lava`, `is+vatten→sno`, `luft+vatten→moln`, `eld+luft→sol`, `eld+is→vatten` (smälter), `lava+vatten→sten`, `lava+is→sten`, `eld+lera→kruka`, `sol+vatten→regnbage`, `moln+is→sno`, `sol+sno→vatten`.
- **Nivåer (mål-recept = receptbokens rader):**
  1. **Nivå 0–1:** 4 baser (eld, vatten, jord, luft). Mål: `anga, lera, lava, moln` (4 rader). Alla nås direkt från baser.
  2. **Nivå 2:** lägg till `is`. Mål: + `sno, sol` (5 rader).
  3. **Nivå 3:** resultat-droppar blir draggbara. Mål: en kedja — `lava, regnbage, kruka` plus 2 baser-recept (6 rader). Kräver att man dragit resultat tillbaka in.
  4. **Nivå 4+:** hela registret tillgängligt; mål varieras (slumpa 6–7 recept med `shuffle`, alltid nåbara från baserna). Loopar med ny slumpfärgad brygd-start.
- Upptäckta resultat-droppar ligger kvar på hyllan inom rundan (oändlig källa). Mellan rundor återanvänd noderna: töm hyllan ner till nivåns baser, rensa bok-rader, bygg nya. Aldrig sjunkande värden.

## Tillgångar (programmatiskt)
- **Emoji (Text):** element-/resultat-emoji enligt registret ovan; ⭐ på hatten; 🧪 Trolldryck; ↩️ töm-knapp; 📖 i bokrubriken (valfritt).
- **Pixi Graphics:** stjärnhimmel via `createScene('night')`; trollkarlshatt (poly + ellipse); kittel (ellipser + rim + ben + brygd-yta + glans); glansiga droppar (circle + glansprick + skugg-ellips); hylla & receptbok-panel (roundRect + stroke); ingrediens-platser (prickade ringar); bubblor (små circles).
- **Inga externa bild-/ljud-/fontfiler.** Ljud via `ctx.services.audio.sfx(...)`, röst via `ctx.services.voice.say(...)`.

## Återanvänd dessa
- `lib/scene.js`: `createScene('night', ...)` (bakgrund, FÖRSTA barn) + `lerpColor` (brygd-färg-tween).
- `lib/mascot.js`: `makeMascot(80)` (trollkarl Bobo) + egen hatt-Graphics.
- `lib/DragController.js`: drag + tap-tap + snäpp (oändliga källor enligt Interaktion).
- `lib/feedback.js`: `bounceIn, pop, wiggle, puff, sparkle, burst, floatText, breathe, bigCelebration`.
- `lib/theme.js`: `COLORS, PLAYFUL, FONT, PRAISE`.
- `lib/swedish.js`: `randomFrom, shuffle` (mål-val, hint-val, brygd-startfärg).
- `ctx.progress`: `get, complete, setLevel, setCustom`. `ctx.fxLayer` (partiklar), `ctx.ticker` (bubblor + idle/hint), `gsap`.

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. ALLA `gsap.delayedCall`/`onComplete`/hint-callbacks tidig-returnerar om `!this._alive`.
- **`this._resolving`-skydd:** sätt `true` under reaktions-fördröjningen och under klart-firandet; pointer/tap- och `_addToCauldron`-callbacks returnerar tidigt → ingen dubbel-reaktion eller dubbelt `complete()`.
- Kitteln tar max 2 ingredienser; ignorera fler tills reaktionen körts. Töm-knappen avbryter en pågående reaktions-`delayedCall` (spara referensen och `.kill()`).
- **Idle/hint-timer i ticker:** `this._idle += deltaMS`. Vid `>6000` och rundan ej klar → `_hint()`: välj första oupptäckta mål-receptet vars båda ingredienser finns på hyllan; `breathe`/`pop` på de två dropparna, rita en mjuk prick-linje (`this._hintLine` Graphics) mellan dem, `voice.say('Prova ${A.namn} och ${B.namn}!')`. Räkna `this._hintCount`; vid `>=3` på samma recept → **auto-utför** kombon (`_addToCauldron` båda) så ett recept ALLTID hittas. Nollställ `_idle`/`_hintCount`/`_hintLine` vid varje interaktion.
- `destroy(ctx)`: `this._alive=false`; `ctx.ticker.remove(this._tick)`; `this._drag?.destroy()`; döda bubblor (`_bubbles.forEach(b=>!b.g.destroyed && b.g.destroy())`); `gsap.killTweensOf` för mascot, `_brew`, `_hintLine`, droppar; rensa `_hintLine`; `this._reactCall?.kill()`; `this._root?.destroy({children:true})`.
- Skydda mot att en bok-rad fylls två gånger (`if (row._done) return`).

## Steg-för-steg bygginstruktion
1. Skapa `src/games/trollblandning/index.js`; default-exportera GameModule-objektet med metadatan ovan. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `DragController`, `createScene, lerpColor`, `makeMascot`, feedback-hjälparna, `COLORS, PLAYFUL, FONT, PRAISE`, `randomFrom, shuffle`.
2. Definiera modul-konstanter: `ELEMENTS` (id→{emoji, color, namn}) och `RECIPES` (sorterad-par-nyckel→resultId) och `LEVELS` (per nivå: tillgängliga element-id + mål-recept-id) enligt Progression.
3. `init(ctx)`: `this._alive=true`; `this._root=new Container()`, `ctx.stage.addChild(this._root)`. Lägg `createScene('night')` FÖRST. Bygg kittel (med `this._brew`, `this._cauldron`, ingrediens-platser), trollkarl+hatt, receptbok-panel, hylla, töm-knapp. Skapa `this._drag`. Läs `this._level`. Anropa `this._buildRound(ctx)`.
4. `_buildRound(ctx)`: bestäm nivå/element/mål; rensa gammalt (hylla-droppar, bok-rader, `_inCauldron=[]`, `_brewColor` = mörk start); skapa bas-droppar på hyllan (`_drag.addItem` + `bounceIn`); bygg bok-rader (❓-platshållare); `this._resolving=false`; nollställ idle/hint.
5. Skriv `_makeDrop(elem)`, `_addToCauldron(ctx, elem)`, `_react(ctx)`, `_onRecipe(ctx, resId, isGoal)` (pys + ny droppe + bok-rad + ev. `_checkComplete`), `_onNoRecipe(ctx)`, `_emptyCauldron(ctx)`, `_hint(ctx)`, `_checkComplete(ctx)` (alla rader klara → firande + `progress.complete()` + `setLevel` + `gsap.delayedCall(1.6, ()=> this._alive && this._buildRound(ctx))`).
6. Lägg ticker: `this._tick=(tk)=>this._update(ctx, tk)`, `ctx.ticker.add(this._tick)` — bubbel-emitter + idle/hint.
7. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
8. `destroy(ctx)`: enligt "Edge-cases & städning".
9. Registrera i `src/games/registry.js`: `import trollblandning from './trollblandning/index.js'` och lägg `trollblandning` i `GAMES`.
10. `npm run dev`, öppna biblioteket, spela: verifiera drag OCH tap-tap, reaktion + pys + bok-ifyllning, "recept saknas" = mjuk puff (ingen straff), kedje-reaktion på nivå 3, hem-knapp, röst-repris, firande vid full bok, och att `highestLevel`/`recept`/`rundor` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (canvas finns; inga uncaught errors i `browser_console_messages`).
- Vid mount är `voiceIntro` satt / svensk röst spelas ("Dra två droppar i kitteln och se vad som händer!").
- Att lägga två droppar med ett recept (t.ex. eld+vatten) i kitteln ger en reaktion: en ny resultat-droppe (Ånga) dyker upp på hyllan och en receptbok-rad fylls (verifierbart via exponerad teststate, t.ex. `_discovered`/`_inCauldron`, eller pixel/snapshot-skillnad).
- **Tap-tap-fallback:** tap på droppe → tap på kittel lägger i ingrediensen utan exakt drag.
- **Recept saknas:** två droppar utan reaktion ger mjuk respons (`soft`/puff/`wiggle`) + ingredienserna återgår till hyllan; INGET felljud, INGEN omstart, ingen sjunkande poäng.
- **Töm-knappen** tömmer kittelns ingredienser tillbaka till hyllan.
- När alla bok-rader är ifyllda körs firande (konfetti i `ctx.fxLayer`) och `ctx.progress.complete()` anropas exakt EN gång (inget dubbel-trigg via `_resolving`-skydd vid snabba tryck).
- **Auto-hjälp:** efter idle (~6s, snabbas i test) ger trollkarlen ledtrådar och efter upprepade ledtrådar utförs en kombination automatiskt → ett nytt recept hittas alltid (rundan kan aldrig fastna).
- Efter firandet byggs nästa runda (oändlig lek) och `custom.rundor` har ökat.
- Progress sparas: efter `complete()` finns `highestLevel`/`stars`/`custom.recept`/`custom.rundor` kvar i localStorage (`pwagames.save.v1`) efter omladdning.
- Städning: vid retur till biblioteket (hem-knapp) tas ticker bort, bubblor/tweens dör, och inga fel loggas efter exit mitt i en reaktion.
