# Regnbågsmålaren Elvira (`regnbagsmalaren`)
> Barnet sveper fingret över en gråmulen himmel och Elviras enhörning flyger längs draget och målar en tjock, glänsande regnbågsrand — färg för färg växer en hel regnbåge fram, solen går upp och hela världen blommar. Ren skaparglädje utan ett enda sätt att göra fel.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `regnbagsmalaren` | Regnbågsmålaren Elvira | 🌈 | roligt | drag | [2,4] | `regnbagsmalaren` | "Måla en regnbåge! Dra fingret över himlen." |

## Mål & mekanik
- En **gråmulen himmel** med en **svag grå mall** av en regnbåge (sex tunna, ljusgrå bågar) visar var regnbågen ska bli. Längst ner sex stora **färgburkar** (paletten).
- **Enhörningen 🦄 (Elviras)** följer fingret. När barnet **drar fingret över himlen** målas den **aktiva färgens** båge in som en **tjock rand** (stroke `width:40, cap:'round'`) längs svepets bredd. Ju mer barnet sveper fram och tillbaka, desto mer av bågen fylls.
- **Färg för färg:** den aktiva bågen fylls från där man sveper. När en båge är (nästan) full **snäpper den till full** automatiskt, firar litet, och den **aktiva färgen går vidare** till nästa otomda båge (röd → orange → gul → grön → blå → lila). Barnet kan också **byta färg själv** genom att trycka på en färgburk — så banden kan fyllas i valfri ordning.
- **Kärnloop:** välj/acceptera en färg → svep över himlen tills bågen fylls → nästa färg → … → alla sex bågar fyllda = **hel regnbåge**.
- **Klart** = alla bågar fyllda → den grå himlen ljusnar till en solig äng, **solen går upp**, **blommor poppar** längs marken, konfetti, beröm → `ctx.progress.complete()`. Efter firandet byggs nästa (svårare) regnbåge — oändlig lek.
- **Två tydliga kontroller som ändrar utfallet:** (1) **var och hur mycket du sveper** målar bågarna; (2) **vilken färgburk du valt** bestämmer vilket band som växer (välj fritt, fyll i egen ordning). Inte "tryck och titta" — barnet målar bilden.
- **Inget kan bli fel:** sveper barnet utanför en båge händer inget tråkigt, bara en liten gnista. Inget "game over", ingen poäng, ingen timer som straffar.

## Skärm-layout (1280x720)
GameHost ritar hem-/högtalar-knapparna i headern — rita INTE egna. Allt nedan ligger i spelets `_root` (designkoordinater). Håll spelinnehåll under y≈90.

- **Bakgrund (FÖRSTA barn):** `createScene(...)` från `lib/scene.js` med ett eget **gråmulet** tema-objekt: `{ top: 0xb8c2cc, bottom: 0xd8dde2, ground: 0x86d27a, groundDark: 0x5bbf6a, clouds: 3 }` (`opts: { ground: true, groundH: 96 }`). `eventMode='none'`. Detta är `this._graySky`.
- **Ljus himmel (firande, dold):** ett andra `createScene('meadow', { ground:true })` lagt OVANPÅ den grå men `alpha = 0`; tweenas till `1` vid klart (`this._brightSky`). Sol ritas av meadow-temat (uppe till vänster) — vid klart kan en egen sol-Graphics dessutom resa sig (se Återkoppling).
- **Regnbåge-rymd:** centrum **cx=640, cy=600** (precis ovanför marken). Bågarna är **övre halvcirklar**. En punkt på båge med radie R och parametervinkel φ∈[π, 2π] ligger på `(cx + R·cos φ, cy + R·sin φ)` → φ=π är vänster fäste `(cx−R, cy)`, φ=1.5π är toppen `(cx, cy−R)`, φ=2π är höger fäste `(cx+R, cy)`.
- **Sex bågar (yttersta = röd, störst):** radier `Rred=410, Rorange=366, Ryellow=322, Rgreen=278, Rblue=234, Rpurple=190` (44px mellan centrumlinjerna; bandtjocklek 40). `Rmax=410`. Topp på röda bågen ligger vid `y = 600−410 = 190` (under headern ✓). Färger ur `COLORS`: röd `0xff6b6b`, orange `0xff8a3d`, gul `0xffd35c`, grön `0x5bbf6a`, blå `0x4aa3df`, lila `0xa78bfa`.
- **Grå mall:** för varje båge en svag hel halvcirkel: `g.arc(cx, cy, Ri, π, 2π).stroke({ width: 40, color: 0xaab2ba, alpha: 0.28, cap:'round' })`. Ligger underst i `this._rainbow`.
- **Målade band:** ett dedikerat `Graphics` per båge (`this._bandG[i]`) ovanpå mallen, ritar den fyllda delen som en arc-stroke i bandets färg (se Interaktion). Lager: grå mall → `this._bandG[0..5]` → enhörning.
- **Enhörningen 🦄:** `Container` med en mjuk vit skuggcirkel (`circle(0,0,38).fill({color:0xffffff, alpha:0.5})`) + emoji-Text `🦄` `fontSize:72`, `anchor 0.5`. Startar vid toppen `(cx, cy−Rmax−10)` och **följer fingret** under drag.
- **Färgpalett (paletten):** sex **färgburkar** i en rad nära botten, `y=668`, x jämnt centrerat: x = `400, 496, 592, 688, 784, 880`? → använd 6 burkar centrerade kring 640 med pitch 116: x = `350, 466, 582, 698, 814, 930`. Varje burk: rundad "färgklick" `circle(0,0,40).fill(bandFärg).stroke({width:5,color:0xffffff})` + osynlig hit-halo `hitArea = new Circle(0,0,60)` (diameter 120 ≥96px ✓). Den **aktiva** burken får en glödring + lugn `breathe(...)`. En fylld båges burk får en liten ✓-känsla (skala-pop, bock-emoji ⭐ valfritt).
- **Marginaler:** burkar ≥24px isär (pitch 116, diameter 80 → 36px luft ✓). Inga små klickytor.

## Interaktion
Detta spel använder INTE `DragController`. En egen spårnings-lyssnare på himlen (samma mönster som `spara-linjen`):

- En transparent **hit-rektangel** `this._sky` täcker spelytan: `rect(0, 90, 1280, 540)` (`fill({color:0x000000, alpha:0})`), `eventMode='static'`, ligger UNDER paletten men ÖVER bakgrunden. (Burkar fångar sina egna tap.)
- `pointerdown` på `_sky` → `this._painting = true`, `this._idle = 0`, kör `_paintAt(local)` och flytta enhörningen dit (`audio.sfx('whoosh')` en gång).
- `globalpointermove` (registrerad så draget överlever att fingret lämnar ytan) → om `_painting`: `const p = this._root.toLocal(e.global)`, `_paintAt(p)`, flytta enhörningen till `p` (direkt `position.set`, ev. liten `gsap.to` med `duration:0.06` för mjukhet — döda i destroy).
- `pointerup`/`pointerupoutside` → `this._painting = false`. Om gesten var ett **tap** (rörelse < 14px) → behandla som tap-måla (se nedan).

**`_paintAt(p)` — målning:**
1. `this._idle = 0`.
2. Räkna **svep-fraktionen** `f = clamp((p.x − (cx − Rmax)) / (2·Rmax), 0, 1)` (vänster kant → 0, höger kant → 1). Detta gör att även ett **plant vågrätt svep** fyller bågen (förlåtande för de minsta).
3. Aktiv båge `b = this._active`. Dela `f`-intervallet i **K=24 celler**; cell = `Math.min(K−1, Math.floor(f·K))`. Lägg `cell` (och `cell±1` för bredd/förlåtelse) i `this._covered[b]` (ett Set).
4. Uppdatera bandets fyllda spann: `fMin = min(covered)/K`, `fMax = (max(covered)+1)/K`. Rita om: `this._bandG[b].clear().arc(cx, cy, Ri, π + fMin·π, π + fMax·π).stroke({ width:40, color: bandFärg[b], cap:'round' })`.
5. **Juice (<100ms):** vid varje NY cell → `sparkle(ctx.fxLayer, p.x, p.y, {count:4})` och `audio.sfx('pling')` (throttlat ~110ms via `this._lastTick`). Strök-ljud `audio.sfx('soft')` throttlat ~140ms medan man drar.
6. **Snäpp till full:** `coverage = covered.size / K`. Om `coverage ≥ 0.9` och bågen ej redan klar → `_snapBand(b)`.
7. Sveper man i **fel radie/utanför bågarna** (t.ex. långt under): inget straff — valfri pytteliten `sparkle` vid fingret. ALDRIG buzzer.

**`_snapBand(b)`:** markera `this._bandDone[b]=true`; animera fyllningen till hel båge (tween en `{f:fMax}` → 1 och rita arc `π → 2π` på vägen, exit-säkert via `if(!destroyed)`-kopiering eller rita i ticker); `audio.sfx('reveal')` + `audio.sfx('match')`; `sparkle` längs bågen; burkens ✓-pop; ibland `voice.say(randomFrom(['Så fint!','En till färg!','Titta vad fin!']))`. Sätt `this._active` till nästa `i` där `!_bandDone[i]` (uppdatera glödring/`breathe`). Om alla `_bandDone` → `_onComplete(ctx)`.

**Färgval (kontroll 2):** varje burk `eventMode='static'`, `pointertap` → om bandet ej klart: `this._active = i`, flytta glödring/`breathe`, `audio.sfx('tap')`, `pop(burk)`. (Tryck på en redan klar burk: vänlig `pop`, ingen effekt — aldrig fel.)

**Tap-måla / tap-tap-fallback (för de minsta, drag är svårt <4 år):**
- Ett **tap i himlen** (utan drag) målar en **rejäl klick** av den aktiva bågen kring tap-vinkeln: lägg ~6 celler runt `cell` i `_covered[b]` → bågen växer märkbart per tap. Upprepade tap fyller hela bågen → snäpp. Stor träffyta (hela himlen), inga små mål.
- Alternativ: tryck på en **färgburk** väljer färgen; nästa tap i himlen målar den. Så barnet kan **tappa sig fram** helt utan att dra.

Skydd mot dubbeltryck under firande: när regnbågen är klar sätts `this._resolving = true`; alla pointer/tap-callbacks returnerar tidigt tills nästa runda byggts.

## Återkoppling & belöning
Varje pekning ger ljud+bild < 100ms och ENDAST positivt:
- **Drag/måla:** `sparkle` vid enhörningen + `audio.sfx('pling')` per ny cell (throttlat), `audio.sfx('soft')`-strök throttlat. Enhörningen lutar lätt mot rörelseriktningen (liten `rotation`, valfritt).
- **Färgbyte:** `audio.sfx('tap')` + `pop(burk)` + glödring flyttas, `breathe` på aktiv burk.
- **Båge klar:** `audio.sfx('reveal')`+`'match'`, `burst(ctx.fxLayer, cx, cy−Ri, {count:12, colors:[färg]})` valfritt, kort `voice.say(...)` ibland (inte varje gång — tjattra inte).
- **Utanför/tomt svep:** liten `sparkle` vid fingret, annars ingenting. ALDRIG rött/buzzer/omstart.
- **Klart-firande (`_onComplete`):** `this._resolving = true` →
  - `gsap.to(this._brightSky, { alpha: 1, duration: 1.0 })` (grå himmel ljusnar till solig äng).
  - **Solen går upp:** en sol-Graphics (gul halo `circle(0,0,120).fill({color:0xffe27a,alpha:0.2})` + skiva `circle(0,0,60).fill(0xffd35c)`) tweenas från `y=720` upp till `y=150` med `ease:'back.out(1.2)'`, samtidigt liten skala-puls.
  - **Blommor poppar:** 6–8 emoji `🌸/🌷/🌼` placeras längs marken (y≈640, x utspritt) med `bounceIn` + `floatText`/`sparkle`.
  - `audio.sfx('correct')` direkt + `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, { width: ctx.width, height: ctx.height })`.
  - `ctx.progress.complete()` (EN gång), `ctx.progress.setLevel(this._level + 1)`, `ctx.progress.setCustom('regnbagar', n+1)`.
  - `gsap.delayedCall(1.8, () => this._alive && this._buildRound(ctx))`.
- **Idle-recue:** i ticker, om `this._idle > 6s` och ej klar → `voice.replayLast()` (eller `voice.say(this.voiceIntro)`) + `breathe`/`pop` på aktiv burk OCH en **mjuk auto-hjälp**: enhörningen gör ett litet auto-svep som lägger ~4 celler i aktiva bågen (garanterar framsteg). Nollställ `this._idle`.

Använd sfx: `whoosh, pling, soft, tap, reveal, match, correct, celebrate`. Voice: voiceIntro + korta beröm/`PRAISE`.

## Progression & nivåer
- `this._level = Math.max(1, ctx.progress.get().highestLevel | 0)` vid init.
- Svårighet = **antal bågar / krökar** (oändlig, cyklisk lek):
  1. **Nivå 1:** standardregnbåge, **6 bågar** (som ovan). Stort, lätt.
  2. **Nivå 2:** **dubbel regnbåge** — en andra, ljusare och tunnare uppsättning innanför (radier `170…126`, omvänd färgordning), totalt fler band att fylla. Paletten visar samma 6 färger; inre bågen delar färg-aktivering.
  3. **Nivå 3+:** dubbel regnbåge + ett par **moln att måla bort/igenom** (svepa över ett grått moln gör det vitt och pufft) som extra mål, samt något fler celler (K=28) för en längre svep. Därefter upprepas mönstren med ny startfärg.
- Efter varje klarad regnbåge: `setLevel(this._level+1)`, `setCustom('regnbagar', n+1)`, bygg nästa via `_buildRound`. Allt återanvänder samma noder (rensa band-Graphics + Set, ny geometri). Inga sjunkande värden, ingen synlig poäng.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics`. Inga externa bild-/ljud-/fontfiler.
- Emoji: 🦄 (enhörning/Elviras), 🌸🌷🌼 (blommor i firandet), valfritt ⭐/✨.
- Graphics: grå+ljus himmel via `createScene` (scene.js), grå regnbågsmall (arc-stroke låg alpha), målade band (arc-stroke per båge), färgburkar (cirkel + vit stroke + glödring), enhörningens skuggcirkel, sol (halo + skiva), transparent himmel-hit-rektangel.
- Firande via `bigCelebration`/`burst`/`sparkle`/`floatText` (konfetti/gnistor i `ctx.fxLayer`). Ljud via `audio.sfx`, röst via `voice.say`.

## Återanvänd dessa
- `lib/scene.js`: `createScene(temaObj|'meadow', opts)` — grå himmel + ljus firande-himmel.
- `lib/feedback.js`: `sparkle`, `pop`, `breathe`, `burst`, `bounceIn`, `floatText`, `bigCelebration`, `wiggle`.
- `lib/theme.js`: `COLORS`, `PLAYFUL`, `PRAISE`, `FONT`, `DESIGN_W`, `DESIGN_H`.
- `lib/swedish.js`: `randomFrom`.
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast/cancel`.
- `ctx.progress`: `get`, `setLevel`, `complete`, `setCustom`.
- `ctx.ticker` (idle-timer), `ctx.fxLayer` (firande), `gsap` (tweens/snäpp/auto-hjälp).
- INTE `DragController` (egen spårning + tap-tap byggs manuellt enligt ovan).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`onComplete`-callbacks (snäpp, firande, auto-hjälp, bygg nästa runda) tidigt-returnerar om `!this._alive`.
- `this._resolving = true` när regnbågen blir klar; alla pointer/tap-callbacks returnerar om `_resolving || !_alive` → inget dubbeltryck startar två firanden / dubbel `complete()`.
- Skydda mot att en båge snäpps två gånger (`if (this._bandDone[b]) return`).
- **Exit-säkra partiklar/tweens:** använd alltid `lib/feedback.js`-hjälparna (redan exit-säkra). Snäpp-animationen som ritar arc i band-Graphics ska antingen drivas i `ticker` ELLER tweena en `{f}`-proxy och rita `if (!this._bandG[b].destroyed)` (ALDRIG tweena Pixi-objektet direkt så att exit mitt i krockar med null-transform). Enhörnings-`gsap.to` på position: `gsap.killTweensOf(this._unicorn)` i destroy.
- Idle-timer i ticker: `this._idle += ticker.deltaMS`; nollställs vid varje interaktion.
- `destroy(ctx)`: `this._alive = false`; `ctx.ticker.remove(this._tick)`; avregistrera `pointerdown/globalpointermove/pointerup/pointerupoutside` på `_sky` och `pointertap` på burkar; `gsap.killTweensOf(...)` för enhörning, burkar (`breathe`-tweens), band-proxies, sol, `_brightSky`; `this._root?.destroy({ children: true })`.
- Avbildad människa: enbart **Elvira** nämns (i röst/namn). Enhörningen är ett djur (undantaget namnregeln).

## Steg-för-steg bygginstruktion
1. Skapa `src/games/regnbagsmalaren/index.js`, default-exportera GameModule med metadatan ovan. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `createScene` (scene.js), feedback-hjälpare, `COLORS, FONT, PRAISE, DESIGN_W, DESIGN_H` (theme.js), `randomFrom` (swedish.js).
2. `init(ctx)`: `this._alive = true`; `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Lägg `this._graySky = createScene(gråTema,{ground:true})` (först), `this._brightSky = createScene('meadow',{ground:true})` med `alpha=0`. Läs `this._level`. Definiera bågedata (radier/färger). Anropa `this._buildRound(ctx)`.
3. `_buildRound(ctx)`: rensa ev. gammalt (`_rainbow.removeChildren()`, nollställ `_covered`/`_bandDone`), beräkna geometri för aktuell nivå, rita grå mall + skapa `this._bandG[i]` (tomma Graphics), bygg paletten (burkar med hit-halo + `pointertap`), skapa/återställ enhörningen, skapa transparent `this._sky`-hit-rektangel med pointer-lyssnarna, sätt `this._active = 0`, `this._resolving = false`, `this._idle = 0`. `bounceIn` på burkar/enhörning.
4. Skriv `_paintAt(p)`, `_snapBand(b)` och `_onComplete(ctx)` enligt Interaktion/Återkoppling.
5. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
6. Lägg idle-tick: `this._tick = (t) => { if(!this._alive||this._resolving) return; this._idle += t.deltaMS; if(this._idle>6000) this._idleHelp(ctx) }`, `ctx.ticker.add(this._tick)`.
7. `destroy(ctx)`: enligt "Edge-cases & städning".
8. Registrera i `src/games/registry.js`: `import regnbagsmalaren from './regnbagsmalaren/index.js'` och lägg `regnbagsmalaren` i `GAMES`-arrayen.
9. `npm run build` (0 fel). `npm run dev`, öppna biblioteket, spela: verifiera att svep målar bågarna, att färgburk byter aktiv färg, snäpp vid ~90%, tap-tap fyller, firande (ljus himmel + sol + blommor) vid hel regnbåge, hem-knapp, röst-repris, och att `highestLevel`/`regnbagar` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (canvas finns; inga uncaught errors i `browser_console_messages`).
- Vid mount är `voiceIntro` satt/uttalat (`"Måla en regnbåge! Dra fingret över himlen."`).
- En `pointerdown` följt av `globalpointermove` över himlen fyller den aktiva bågen: bandets fyllda spann/`_covered`-storlek ökar och en arc-stroke ritas (verifierbart via exponerat teststate, t.ex. `_covered[active].size` eller `_bandDone`).
- Färgval ändrar utfallet: `pointertap` på en färgburk sätter `_active` till den färgen och efterföljande svep växer DEN bågen.
- Tap-tap-fallback: upprepade tap i himlen (utan drag) fyller den aktiva bågen tills den snäpper — inga små klickytor, ingen drag krävs.
- Snäpp: när en båges coverage ≥0.9 fylls den helt automatiskt och `_active` går vidare till nästa otomda båge.
- Aldrig fel: svep utanför bågarna ger ALDRIG buzzer/rött/omstart/poängsänkning; bara mjuk gnista. Idle >6s ger röst-recue + mjuk auto-hjälp som garanterat lägger till täckning.
- Klart: när alla bågar är fyllda körs firande (ljus himmel-tween, sol, blommor, konfetti i fxLayer) och `ctx.progress.complete()` anropas exakt EN gång (ingen dubbel via `_resolving` vid snabba tryck).
- Efter firandet byggs nästa runda (oändlig lek) och `custom.regnbagar` har ökat; `highestLevel` ökat.
- Progress sparas: efter `complete()` finns `highestLevel`/`stars`/`custom.regnbagar` kvar i localStorage (`pwagames.save.v1`) efter omladdning.
- Städning: vid retur till biblioteket (hem-knapp mitt i en animation) tas ticker bort, tweens dödas, inga kvarvarande tweens/timeouts loggar eller kastar fel.
