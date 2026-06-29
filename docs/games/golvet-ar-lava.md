# Golvet är Lava (`golvet-ar-lava`)
> Barnet bygger en egen väg av trampstenar tvärs över en bubblande lavaflod så att Zacke kan hoppa hela vägen till skatten — och misslyckas ALDRIG: är gapet för stort kommer ett snällt litet moln och lyfter över, med fniss. Ren ingenjörsglädje utan risk.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `golvet-ar-lava` | Golvet är Lava | 🌋 | pussel | drag | [3,5] | `golvet-ar-lava` | "Lägg stenar över lavan så hoppar Zacke till skatten!" |

(titleSv MED åäö. `icon` = 🌋. Maskoten/Bobo behövs inte; avbildad människa = **Zacke** (🧒) på udda nivåer, **Alissa** (👧) på jämna — bara dessa namn.)

## Mål & mekanik
Barnet ska få figuren (Zacke/Alissa) över en **lavaflod** till **skatten 💎** på andra sidan.

Kärnloop:
1. Figuren står på vänster klippa. Lavan bubblar mellan klipporna. En **stenbricka** överst håller ett begränsat antal trampstenar (några vanliga + en **studs-sten**).
2. Barnet **drar stenar från brickan** och släpper dem på **slottar** (spöklika cirklar) utspridda över lavan → stenen snäpper fast. Stenar kan flyttas mellan slottar eller dras tillbaka till brickan. **Barnet designar alltså vägen.**
3. Barnet trycker på stora **Gå!**-knappen → figuren **auto-hoppar** i en hoppbåge från klippan till närmaste nåbara landningspunkt, vidare sten för sten, till höger klippa och fram till skatten.
4. **Klart** = figuren når skatten → firande, `ctx.progress.complete()`, ny (bredare) bana laddas efter ~1,6s.

No-fail-garanti (kärnan i charmen):
- Är nästa landningspunkt **inom räckvidd** → vanligt parabel-hopp.
- Är gapet **för stort** (ingen sten inom räckvidd) → ett **moln ☁️ sveper in och lyfter figuren** över gapet till nästa landning (mjuk auto-hjälp + "Hihi!"-fniss + `whoosh`). Figuren **ramlar ALDRIG i lavan.**
- Även med NOLL stenar lyckas barnet (molnet bär hela vägen) — men poängen är att bygga vägen själv, så vi uppmuntrar (se Interaktion).

Två tydliga kontroller som ändrar utfallet:
1. **VAR** stenarna placeras (vilka slottar) → kort eller långt mellan stegen → påverkar om hoppet når eller om molnet behövs.
2. **STUDS-stenen** (🟢 fjäder-sten): står man på den blir nästa hopp mycket längre (räckvidd 460 i st.f. 280) → kan brygga ett stort gap med avsikt i stället för att fylla varje slott.

## Skärm-layout (1280x720)
Designkoordinater 1280×720. GameHost ritar header (hem-/repetera-knapp) överst — rita INGA egna. Håll spelinnehåll under y≈90. Allt nedan ligger i spelets `this._root`.

Lagerordning (botten→topp) i `_root`:
1. `createScene(...)` bakgrund (FÖRSTA barnet) — vulkanhimmel, se Tillgångar.
2. **Klippor** (`_terrain`, Graphics, `eventMode='none'`).
3. **Lava** (`_lavaBase` Graphics + `_lavaSurf` Graphics som ritas om i ticker).
4. **Bubbel-lager** (`_lavaFx` Container, `eventMode='none'`) — stigande lavabubblor.
5. **Slot-lager** (`_slotLayer` Container) — spök-slottar (drop-mål).
6. **Sten-lager** (`_stoneLayer` Container) — placerade + brickans stenar (drag-objekt).
7. **Figur** (`_hero` Container) — Zacke/Alissa.
8. **UI**: stenbricka-panel + **Gå!**-knapp.

Konkreta mått:
- **Vänster klippa:** `roundRect(-60, 400, 300, 380, 40)` fyll `COLORS.brown` (0x8a5a3b) med grästopp `roundRect(-60, 400, 300, 26, 40).fill(COLORS.green)`. Logisk ytkant (figurens fötter) **y=400**; figurens startpunkt **(x:120, y:400)**.
- **Höger klippa:** `roundRect(1040, 400, 320, 380, 40)` samma stil. Landningspunkt på höger klippa **(x:1100, y:400)**.
- **Lavaflod:** mellan klippkanterna. `lavaLeft=240`, `lavaRight=1040`, **ytlinje `surfaceY=438`**. `_lavaBase`: `rect(240,438,800,300).fill(0x7a1500)` + ett ljusare lager `rect(240,438,800,40).fill(0xff5a1e)`. `_lavaSurf` ritas om varje tick som en vågig glödremsa (sinus, se Fysik).
- **Slottar (drop-mål):** spöklika cirklar radie **40**, `circle(0,0,40).fill({color:0xffffff,alpha:0.12}).stroke({width:5,color:0xffd35c,alpha:0.6})` (prickad/streckad känsla). Centrum-y **460**. Slot-x beror på nivå (se Progression); nivå 1: x ∈ {320, 470, 620, 770, 920} (5 slottar, 150px isär). Träffradie för drop **120**.
- **Trampsten (placerad/i bricka):** Container, radie **48** (visuell), osynlig hit-halo `hitArea = new Circle(0,0,72)` (≥96px träffyta). Vanlig sten: `circle(0,6,48).fill(0x000000,0.18)` skugga + `circle(0,0,46).fill(0x9a8474).stroke({width:5,color:0x6f5d4e})` + ett par ljusa fläckar. **Studs-sten:** samma men `0x5bbf6a`/grön + en liten fjäder-glans (`roundRect`) och 🟢-känsla; bär flaggan `isBounce=true`.
- **Stenbricka (UI-panel):** `roundRect(290, 100, 700, 80, 24).fill(COLORS.cream).stroke({width:5,color:COLORS.brown})` med liten "Lägg ut mig"-känsla. 4 hemplatser för stenar vid y=140, x ∈ {360, 540, 720, 860} (3 vanliga + 1 studs-sten längst till höger).
- **Gå!-knapp:** stor rund knapp **(x:640, y:662)**, radie **58** (+ hit-halo 84), grön `COLORS.green`/`greenDark`, emoji **👣** + text "Gå!" (FONT.display, 34, vit). Ligger på en liten "skylt"-panel ovanför lavan så den läses tydligt. Inaktiveras (gråtonas, `eventMode='none'`) under gång.
- **Skatt:** en kista-form (`roundRect`, brun + gult lock) på höger klippa vid (x:1180, y:360) med emoji **💎** (Text, fontSize 96) ovanpå + svag gul glödring. Detta är målet.
- **Figur (Zacke/Alissa):** Container vid feet-punkt; emoji **🧒** (Zacke) / **👧** (Alissa) Text fontSize 96, anchor (0.5, 1) så ankaret är vid fötterna. Liten mjuk skuggellips under.

Marginaler: alla träffytor ≥96px diameter (stenar halo 72-radie = 144, slottar drop-radie 120, Gå-knapp halo 84-radie). Brickans stenar ≥24px isär.

## Interaktion
Två gester, båda förlåtande: **dra sten → slot** (med tap-tap-fallback) och **tap på Gå!-knappen**.

Stenplacering via `lib/DragController.js` (den har snäpp/snäpp-tillbaka + tap-tap inbyggt):
- `this._drag = new DragController({ space: this._stoneLayer, services: ctx.services })`.
- Varje sten: `this._drag.addItem(stoneView, { isBounce }, hooks)`. `home` = brickans plats.
- Varje slot: `this._drag.addTarget(slotView, () => true, { hitRadius: 120 })`. Alla slottar accepterar alla stenar.
- `hooks.onCorrect(rec, target)`: markera `target.stone = rec`, `rec.slot = target`, spela `audio.sfx('pop')`, `pop(stoneView)`, `sparkle(fxLayer, target.view.x, target.view.y)`. Om en annan sten redan låg i den sloten → knuffa ut den mjukt tillbaka till sin bricka-hemplats (`wiggle` + snäpp hem), aldrig ett fel.
- Stenar förblir drag-bara efter placering (barnet kan ändra vägen): vid ny `onDown` på en placerad sten, frigör dess gamla slot (`slot.stone=null`).
- **Tap-tap-fallback:** DragController ger gratis: tap på sten (pulsar, vald) → tap på slot (snäpper dit). Funkar för de minsta.
- Släpp utanför alla slottar → DragController snäpper stenen hem till brickan (ingen bestraffning).

Gå!-knappen (`pointertap`):
- Om `this._walking` eller `this._resolving` → ignorera (dubbeltrycks-skydd).
- Annars: bygg landnings-sekvensen och starta gång-loopen (se Mål & mekanik / Fysik). `audio.sfx('whoosh')`, knapp-`pop`.
- **Mjuk uppmuntran (inte krav):** trycks Gå! med 0 placerade stenar → `voice.say('Lägg några stenar först, så hoppar Zacke!')` + `wiggle` på brickans stenar, MEN starta ändå inte automatiskt (vänta på en sten). Har barnet lagt ≥1 sten startar gången direkt. (Molnet räddar resten — aldrig fail.)

Idle-recue (ticker): ingen interaktion på ~6s och ej igång → `voice.replayLast()` (annars `voice.say(this.voiceIntro)`) + `breathe`/`pop` på en ledig sten i brickan eller på Gå!-knappen som vink. Nollställ idle-timern vid varje pointer-event.

Hit-areor: sten-halo r=72, slot-drop r=120, Gå!-knapp halo r=84. Inga små klickytor.

## Fysik & kalibrering
Spelet använder INTE matter.js eller AimLauncher (ingen sikt-förhandsvisning) — alltså **inga `previewGravity`/`previewDamp`/vind-konstanter behövs**. Två egna, ticker-drivna, exit-säkra integratorer:

**1) Hoppbågen (parametrisk parabel, per-tick).** Drivs i `_update(ctx, t)` med `const dt = t.deltaMS/1000`.
- Sekvens av landningspunkter (vänster→höger): `[ {x:210,y:400}  (vänster klippkant), ...placerade stenar sorterade på x med feet-y = slot.y-46 ≈ 414, {isBounce}..., {x:1100,y:400} (höger klippkant) ]`. Skatten nås från höger klippa med en sista kort gångförflyttning.
- Räckvidd från nuvarande punkt: `reach = cur.isBounce ? 460 : 280` (px horisontellt).
- För steg `cur → next`: `gap = next.x - cur.x`.
  - `gap <= reach` → **vanligt hopp:** `duration = clamp(0.38 + gap/1400, 0.4, 0.8)` s; bågtopp `H = clamp(70 + gap*0.35, 90, 210) + (cur.isBounce ? 90 : 0)`. Per tick: `hopT += dt/duration` (klamp 1). Position: `x = cur.x + (next.x-cur.x)*hopT`; `y = cur.y + (next.y-cur.y)*hopT - 4*H*hopT*(1-hopT)` (parabel, topp vid hopT=0,5). Liten squash vid avstamp/landning (skala). Vid `hopT>=1`: landa → `audio.sfx('pop')`, liten dammpuff `puff(fxLayer, x, y, {count:5, color:0xcdbfae})`, `pop(_hero)`, sätt `cur=next`, nästa steg (eller skatt).
  - `gap > reach` → **moln-hjälp:** spawna `☁️` (Text 90) vid figuren; lyft figuren i en mjuk båge till `next` via en `{}`-proxy-tween (kopiera till `_hero` endast `if(!_hero.destroyed)`), `H_cloud = 150`, duration `clamp(0.5+gap/1600,0.55,0.95)`. `audio.sfx('whoosh')`, `floatText(fxLayer, x, y-60, 'Hihi!')`. Molnet puffar bort (exit-säkert) efteråt. Sätt `cur=next`, fortsätt.
- Allt bakom `if(!this._alive) return`; figuren rörs bara om `!_hero.destroyed`.

**2) Lavabubblor (egen partikel-integrator, ticker-driven).** Pool på ~14 Graphics i `_lavaFx`.
- Varje bubbla `b = {g, x, y, vy, r}`: spawn `x = lavaLeft+20 + rand*(lavaWidth-40)`, `y = surfaceY + 40 + rand*240` (under ytan), `vy = 18 + rand*22` (px/s uppåt), `r = 6 + rand*10`.
- Per tick: `b.y -= b.vy*dt; b.r += 5*dt`. När `b.y <= surfaceY` → "poppar": `puff(_lavaFx, b.x, surfaceY, {count:3, color:0xff7a2e})`, kasta tärning för (throttlad ≥220ms) `audio.sfx('soft')` mjukt blubb, respawna bubblan längst ner. Rita `b.g.clear().circle(b.x, b.y, b.r).fill({color:0xff8a3d, alpha:0.55}).stroke({width:2,color:0xffd35c,alpha:0.5})`.
- **Lava-yta `_lavaSurf`:** rita om varje tick som en vågig glödremsa: `clear()`, gå x från lavaLeft→lavaRight i steg om 20 och rita en `moveTo/lineTo`-fylld form vars övre y = `surfaceY + Math.sin(x*0.02 + this._t*2)*5`; fyll `0xff5a1e` med ljus topplinje `0xffd35c`. `this._t += dt`. Billigt, inga filter.
- Exit-säkert: ALLT ovan lever i tickern och i `_lavaFx`/`_lavaSurf` (förstörs via `destroy({children:true})`). Ingen GSAP körs direkt på dessa Pixi-objekt; `puff`/`floatText` är redan exit-säkra.

## Återkoppling & belöning
Varje pekning < 100ms ger ljud + bild:
- Ta tag i sten: `audio.sfx('tap')` + skala-pop (DragController sköter lyft).
- Sten snäpper i slot: `audio.sfx('pop')` + `pop(sten)` + `sparkle(fxLayer, slot.x, slot.y)`.
- Sten snäpper hem (miss-släpp): mjukt, tyst eller `audio.sfx('soft')`, `wiggle` — ALDRIG buzzer/rött.
- Gå!: `audio.sfx('whoosh')` + knapp-`pop`; `voice.say('Hej hopp!')` vid start.
- Varje landning: `audio.sfx('pop')` + dammpuff + figurens `pop`.
- Moln-hjälp: `audio.sfx('whoosh')` + `floatText(fxLayer, x, y-60, 'Hihi!')` (fniss). Positivt, aldrig "du missade".
- **Skatt nådd (klart):** `this._resolving=true`; figuren `pop`/`bounceIn`, `audio.sfx('correct')` direkt + `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})` + `burst(ctx.fxLayer, 1180, 360, {count:18})` runt skatten, 💎 glittrar (`sparkle`). Sedan `ctx.progress.complete()` EN gång. `gsap.delayedCall(1.6, () => this._alive && this._buildLevel(ctx, ++this._level))`.

Fel-/missläge finns inte som straff. För litet gap löses av molnet (kul). Tomt drag gör inget störande.

Använda sfx: `tap, pop, soft, whoosh, correct, celebrate`. Röst: voiceIntro, 'Hej hopp!', 'Lägg några stenar först, så hoppar Zacke!', `PRAISE`. (På jämna nivåer säg "Alissa" i stället för "Zacke" där namnet nämns.)

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` i `init`; efter klar `ctx.progress.setLevel(this._level+1)` (höjer highestLevel). Valfritt `setCustom('rundor', n+1)`.
- **Bredare flod / färre stenar** för varje nivå (men molnet garanterar alltid framgång):
  - **Nivå 0–1:** lava 240→1040 (800px). 5 slottar {320,470,620,770,920}. **4 stenar** (3 vanliga + 1 studs). Lätt: fyll varannan så hoppen når.
  - **Nivå 2–3:** lava 220→1060 (840px). 6 slottar jämnt fördelade. **4 stenar** (2 vanliga + 1 studs + 1 vanlig). Mer planering; studs-stenen bryggar långt.
  - **Nivå 4–5:** lava 200→1080. 7 slottar. **4 stenar** (1 studs + 3 vanliga). Molnet behövs oftare → mer fniss; fortfarande no-fail.
  - **Nivå 6+:** mönstren upprepas med slumpad slot-jitter ±20px (`Math.random`/`randomFrom`) och växlande figur (Zacke/Alissa). Oändlig lek.
- Klippkanterna och skattens position justeras med lavabredden. Figur väljs på paritet: `this._level % 2 === 0 ? Alissa(👧) : Zacke(🧒)`.
- `_buildLevel(ctx, level)` återanvänder noder: flytta klippor/lava/skatt, rensa `_slotLayer`/`_stoneLayer`, generera nya slottar + bricka-stenar, ställ figuren på vänster klippa, `this._walking=false`, `this._resolving=false`.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics`. Inga externa bild-/ljud-/fontfiler. Ljud via `audio.sfx`, röst via `voice.say`.
- **Bakgrund:** `createScene({ top:0xffd9a0, bottom:0xff8a3d, ground:0x8a5a3b, groundDark:0x6f4a2e, sun:0xffe6a8, clouds:2 }, { width:ctx.width, height:ctx.height, ground:false })` (vulkanhimmel) — FÖRSTA barnet i `_root`. (Marken ritar vi själva som klippor, så `ground:false`.)
- **Emoji:** 🌋 (bricka/ikon), 🧒 Zacke / 👧 Alissa (figur), 💎 (skatt), ☁️ (auto-hjälp-moln), 👣 (Gå!-knapp). Firande via `bigCelebration`/`burst` (inga extra emoji krävs).
- **Graphics:** klippor (roundRect brun + grästopp), lavabas + vågig glödyta (ritas om i ticker), lavabubblor (circle, ljust orange, ritas i ticker), slottar (circle, låg alpha, gul streckkant), stenar (skugga + circle + fläckar; studs-sten grön m. fjäder-glans), stenbricka (roundRect cream), Gå!-knapp (circle grön + text), skattkista (roundRect) + glödring, figurens skuggellips.

## Återanvänd dessa
- `lib/scene.js` — `createScene(themeObj, opts)` (vulkanbakgrund som FÖRSTA barn).
- `lib/DragController.js` — sten→slot drag + snäpp-tillbaka + tap-tap-fallback (återuppfinn INTE).
- `lib/feedback.js` — `bounceIn`, `pop`, `wiggle`, `puff`, `sparkle`, `burst`, `bigCelebration`, `floatText`, `breathe`.
- `lib/theme.js` — `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`, `CHARACTERS`.
- `lib/swedish.js` — `randomFrom`, `shuffle` (figurnamn/jitter).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress` — `get`, `setLevel`, `complete`, `setCustom`. `ctx.ticker` (båda integratorerna), `ctx.fxLayer` (firande/puffar), `gsap` (endast på `{}`-proxys / via feedback-hjälpare).
- INTE `physics.js`/`launcher.js` (egen parabel + bubbel-integrator passar bättre och slipper preview-kalibrering).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/proxy-`onComplete`/ticker-callbacks tidig-returnerar om `!this._alive`.
- `this._resolving`/`this._walking`-skydd: under gång och under skatt-firande ignoreras nya Gå!-tryck och stenflytt (sten-`eventMode` kan stängas av under gång) → `ctx.progress.complete()` kan ALDRIG dubbel-triggas.
- Figuren rörs bara `if(!this._hero.destroyed)`; moln-/hopp-tweens skriver via `{}`-proxy och kopierar villkorat (exit-säkert).
- Lavabubblor och `_lavaSurf` lever helt i tickern (ingen GSAP på dem) → exit-säkra via container-destroy.
- Throttla bubbel-`soft`-ljud (≥220ms) så inte ljudet spammas.
- Sten kan inte ligga i två slottar: vid drop frigörs ev. gammal slot; trängs en sten ut snäpps den hem (ingen sten "försvinner").
- Idle-timer nollställs vid varje interaktion och pausas under gång.
- `destroy(ctx)`: `this._alive=false`; `ctx.ticker.remove(this._tick)`; `this._drag?.destroy()`; `gsap.killTweensOf(this._hero)` + döda ev. proxy-/breathe-tweens; `gsap.killTweensOf` på Gå!-knapp/stenar; `this._root?.destroy({children:true})`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/golvet-ar-lava/index.js`; importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `DragController`, feedback-hjälpare, `createScene`, `COLORS/FONT/PLAYFUL/PRAISE` från theme, `randomFrom` från swedish.
2. Default-exportera GameModule med metadatan i tabellen ovan (id ASCII = mappnamn).
3. `init(ctx)`: `this._alive=true`; `this._root=new Container()`, `ctx.stage.addChild(this._root)`; lägg `createScene(...)` som första barn; skapa lagren (`_terrain, _lavaBase, _lavaSurf, _lavaFx, _slotLayer, _stoneLayer, _hero`, UI). Läs `this._level`. Skapa bubbel-poolen. Anropa `this._buildLevel(ctx, this._level)`. Lägg ticker: `this._tick=(t)=>this._update(ctx,t)`, `ctx.ticker.add(this._tick)`.
4. `_buildLevel(ctx, level)`: räkna lavabredd/slottar/stenantal från nivå; rita/flytta klippor, lava, skatt; rensa `_slotLayer`/`_stoneLayer` (destroy barn); skapa slottar (`_drag.addTarget`); skapa bricka-stenar (vanliga + 1 studs) med `bounceIn` och `_drag.addItem`; placera figuren (Zacke/Alissa) på vänster klippa; nollställ `_walking/_resolving`.
5. Bygg Gå!-knappen (en gång i init, behåll mellan nivåer) med `pointertap` → `_startWalk(ctx)`.
6. `_startWalk(ctx)`: bygg landnings-sekvensen (klippkant + sorterade placerade stenar + höger klippkant); `this._walking=true`; `this._seq`, `this._segIndex=0`; starta första hopp/moln-steget. `voice.say('Hej hopp!')`.
7. `_update(ctx,t)`: kör (a) lava-ytans omritning + bubbel-integratorn alltid; (b) om `_walking`: avancera aktuellt hopp/moln-steg (parabel-math ovan), vid stegets slut gå till nästa segment, vid sista → `_onWin(ctx)`; (c) idle-timer när ej `_walking`.
8. `_onWin(ctx)`: `this._resolving=true`; firande + `ctx.progress.complete()` + `setLevel(this._level+1)` + `gsap.delayedCall(1.6, ()=> this._alive && this._buildLevel(ctx, ++this._level))`.
9. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
10. `destroy(ctx)`: enligt "Edge-cases & städning".
11. Registrera i `src/games/registry.js`: `import golvetArLava from './golvet-ar-lava/index.js'` och lägg `golvetArLava` i `GAMES`.
12. `npm run build` (0 fel), `npm run dev`, spela: dra stenar, tryck Gå!, se hopp + moln-hjälp + firande; verifiera hem-knapp, röst-repris, `highestLevel` kvar efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera bibliotek → "Golvet är Lava"; canvas finns; inga uncaught errors i `browser_console_messages`).
- Vid mount är `voiceIntro` satt/uttalas ("Lägg stenar över lavan så hoppar Zacke till skatten!").
- En `browser_drag` (eller pointer down→move→up) av en sten från brickan till en slot fäster stenen (snäpp + `pop`); stenens position hamnar vid slotens (verifierbart via exponerat teststate eller pixel/snapshot-skillnad).
- Tap-tap-fallback: tap på sten → tap på slot placerar stenen utan drag.
- Tryck på Gå! startar gång-sekvensen: figuren förflyttas i hoppbågar och når höger sida (figurens x ökar över tid; verifierbart via teststate).
- **No-fail / auto-hjälp:** med ett för stort gap (eller 0 stenar efter att minst en lagts och flyttats bort) når figuren ändå skatten via moln-hjälp — INGET game-over, ingen buzzer, figuren hamnar aldrig i lavan.
- Vid skatt: firande (konfetti i fxLayer) och `ctx.progress.complete()` anropas exakt EN gång (inget dubbel-trigg vid snabba upprepade Gå!-tryck under `_resolving/_walking`).
- Efter klar runda byggs en bredare bana; `highestLevel` ökat och kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- Lavabubblor animeras (ticker-driven) utan att kasta fel; mjuk respons på alla pekningar < 100ms.
- Städning: vid hem-knapp tas tickern bort, `_drag.destroy()` körs och inga tweens/timeouts fortsätter logga eller krascha (exit mitt i ett hopp är säkert).
</content>
</invoke>
