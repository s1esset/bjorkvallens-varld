# Tvätta Djuret (`tvatta-djuret`)
> Ett gladlynt lerigt djur väntar på bad — barnet drar svampen fram och tillbaka och ser leran sudda bort och avtäcka skinande ren päls, sköljer sen med duschen tills djuret skakar, glittrar och nöjt fnissar. Ren omsorg, noll precision, ren stolthet.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `tvatta-djuret` | Tvätta Djuret | 🧽 | motorik | drag | [2,4] | `tvatta-djuret` | "Tvätta djuret rent! Dra svampen över kroppen." |

## Mål & mekanik
Ett gulligt men **lerigt** djur (Alissas ponny / en glad gris / Lovas valp — cyklas per nivå) står mitt på skärmen. Barnet gör det rent i **två steg med två olika verktyg**, och båda krävs för att nå 100 %:

1. **Skrubba (svampen 🧽):** dra svampen över kroppen → lerklumparna under svampen **suddas bort** och avtäcker ren päls undertill. Där en lerklump försvinner lämnas en liten **tvål-skumfläck** kvar (djuret blir inlöddrat).
2. **Skölj (duschen 🚿):** dra duschen över kroppen → **vattendroppar** (egen partikel-integrator) regnar ner, **skum-fläckarna** sköljs bort och den rena, glänsande pälsen träder fram med gnistror.

**Renhets-mätaren** (`renhet`) fylls av båda: `renhet = 0.6 × andel_borttagen_lera + 0.4 × andel_bortsköljt_skum`. När all lera är borta OCH allt skum är sköljt → **100 %** → djuret **skakar av sig vatten**, glittrar, ett klistermärke delas ut och `ctx.progress.complete()` körs. Efter firandet kommer nästa (lerigare/större) djur — oändlig, lugn lek.

**Kärnloop:** ta svampen → skrubba överallt (täckningsgrad räknas, inte ordning) → ta duschen → skölj överallt → fira.

**Aldrig fel, aldrig game-over:** att dra utanför djuret ger bara en liten såpbubbla, aldrig straff. En svag/slarvig insats gör bara att det tar någon sekund längre. **Mjuk auto-hjälp garanterar 100 %** (se Återkoppling & belöning).

## Skärm-layout (1280x720)
GameHost ritar header (hem-/repetera-knapp) överst — rita **INGA** egna sådana. Allt nedan ligger i spelets `this._root` i designkoordinater. Lager-ordning (bakifrån): scen-bakgrund → badbalja/matta → **rent djur** → **lerlager** → **skumlager** → vattenspray-Graphics → verktyg (svamp/dusch) → renhets-mätare.

- **Bakgrund:** `createScene('meadow', { width: 1280, height: 720 })` som **FÖRSTA barn** (mjuk himmel, sol, kullar, mark). `eventMode='none'`.
- **Badplats:** en rundad balja/matta under djuret: `roundRect(360, 470, 560, 150, 60).fill({color: COLORS.blue, alpha: 0.30}).stroke({width:8, color: COLORS.blue, alpha:0.5})` + en ljusare vattenrand högst upp. Dekorativ (`eventMode='none'`).
- **Djurets silhuett (logisk, för både ritning och ler-placering):** en uppsättning ellipser kring centrum **(640, 430)**:
  - kropp: center (640, 440), rx **230**, ry **150**
  - huvud: center (470, 330), rx **115**, ry **115**
  - bakdel-puff: center (820, 410), rx **120**, ry **120**
  En punkt räknas som "på djuret" om den ligger i NÅGON ellips: `(dx/rx)² + (dy/ry)² ≤ 1`. Bounding-box ≈ x∈[355,940], y∈[215,590].
- **Rent djur (`this._clean`, Graphics + emoji):** ritas EN gång i nivåns rena färg (ponny: ljus sand `0xe9d2a8`; gris: `COLORS.pink`; valp: `0xcaa472`). Fyll silhuett-ellipserna, lägg på: glansig högdager (`circle(...).fill({color:0xffffff, alpha:0.18})` uppe-vänster på kroppen), öga (vit cirkel r12 + svart pupill r6 vid (445,315)), leende båge, öra/man/svans i nivåfärgens mörkare ton, fyra ben (`roundRect`) och hovar. Lägg ett litet ansikts-emoji som accent (🐴/🐷/🐶, fontSize ~120, anchor 0.5) vid huvudet för karaktär. Lätt droppskugga under djuret (mörk ellips alpha 0.18).
- **Lerlager (`this._mudLayer`, Container):** ~55–110 **lerklumpar** (nivåberoende) placerade på ett **jittrat rutnät** över silhuett-bbox, steg **38px** (mindre steg = fler klumpar på högre nivå), jitter ±10px, men endast där punkten är "på djuret". Varje klump = `Graphics` rundad blob radie **24–30** i `COLORS.brown` (0x8a5a3b) med 2–3 mörkare prickar (`0x6b4429`) för lera-textur; lätt slumpvinkel. Lerlagret täcker djuret nästan helt vid start.
- **Skumlager (`this._foamLayer`, Container):** tomt vid start. När en lerklump suddas spawnas en **skumfläck** på samma plats: ljus blå-vit blob (`0xeaf6ff`, alpha 0.9, radie ~22) med ett par små bubbel-cirklar. Dessa sköljs bort i steg 2.
- **Vattenspray (`this._spray`, Graphics):** ett enda Graphics som **ritas om varje tick** med alla aktiva vattendroppar (inga per-droppe Pixi-objekt). Ligger ovanför djuret, `eventMode='none'`.
- **Verktygsbricka (nederst):**
  - **Svampen 🧽:** Container (rundad gul-grön svamp-`roundRect` 96×72 + emoji 🧽 fontSize 84), parkeras vid **(165, 630)**. `eventMode='static'`, `cursor='pointer'`, `hitArea = new Circle(0,0,72)` (≥96px träffyta). Lugn `breathe`-puls när den är "ledig".
  - **Duschen 🚿:** Container (emoji 🚿 fontSize 96 + liten Graphics-strut), parkeras vid **(1115, 630)**, samma hit-halo. **Inaktiv/halvtransparent (alpha 0.45)** tills leran är ~mestadels borta (`scrubFrac ≥ 0.7`), då tonas den in och `breathe`-pulsar som "nästa steg".
- **Renhets-mätare (`this._gauge`):** överst, x∈[470,810], y≈98: en rundad bakgrundsstav (`roundRect(470,90,340,28,14).fill({color:0x000000, alpha:0.12})`) + en fyllnadsstav vars bredd = `340 × renhet`, fyll `COLORS.green`, med ett 🧼-emoji till vänster. Inga siffror. Fylls mjukt (`gsap.to` på en `{w}`-proxy → rita om staven) — aldrig nedåt.

Marginaler: svamp/dusch ≥24px från kant; alla träffytor ≥96px diameter via osynliga `hitArea`-cirklar.

## Interaktion
Två dragbara verktyg. Använd **egen pekspårning** (som `spara-linjen`), inte `DragController` (verktyget ska **följa fingret kontinuerligt** och skrubba längs vägen, inte snäppa till ett mål). Tap-tap-fallback byggs in för de minsta.

**Greppa & dra ett verktyg** (svamp och dusch delar samma mönster, `this._held` = aktivt verktyg):
- `pointerdown` på verktyget → `this._held = tool`, döda dess `breathe`, `pop(tool)` (lyft-puls), `audio.sfx('tap')`, registrera draget. Spara fingrets offset så verktyget inte "hoppar".
- `globalpointermove` (lyssnare på `this._root`/scenen, registreras vid down så draget överlever att fingret lämnar verktyget) → om `this._held`: `const p = this._root.toLocal(e.global)`; flytta verktyget till `p` (klampat inom scenen); kör verktygets verkan längs vägen: svamp → `_scrubAt(p)`, dusch → `_rinseAt(p)` (öppnar sprayen vid `p`).
- `pointerup`/`pointerupoutside` → verktyget glider mjukt tillbaka till sin bricka (`gsap.to` med liten studs), `this._held = null`, stäng av duschens spray. Återuppta `breathe` på lediga verktyg.

**`_scrubAt(p)` (svampen):** för varje **oren** lerklump inom radie **70** från `p`: markera `flake._clean = true`, sudda ut den (exit-säkert: tweena `{a:1,s:1}`-proxy → alpha 0, scale 0.4, kopiera till `flake.view` bara `if(!view.destroyed)`, `onComplete` → `view.destroy()` om ej destroyed), spawna en **skumfläck** på platsen, `puff(this.fxLayer, x, y, {count:4, color:0xffffff})`, throttlad `audio.sfx('soft')` (max var ~140ms). Uppdatera `this._scrubFrac` och mätaren. Vid `scrubFrac ≥ 0.7` → tona in duschen (`gsap` alpha→1) + `voice.say('Bra! Ta duschen och skölj.')` (en gång).
- Svampen lämnar en liten **våt-glans-strimma** på pälsen (valfritt: ljus alpha-rand i en `this._wet` Graphics) för känslan av att man "torkar rent".

**`_rinseAt(p)` (duschen):** sätt sprayens källa = strax under duschmunstycket, spawna 2–3 nya **vattendroppar** per tick medan duschen hålls (se Fysik). För varje **oskljd** skumfläck inom radie **80** från `p` (eller som en droppe träffar): markera sköljd, fada bort den (samma exit-säkra proxy-mönster), `sparkle(this.fxLayer, x, y)`, liten 🫧-`floatText` ibland. Uppdatera `this._rinseFrac` + mätaren. Throttlad `audio.sfx('whoosh')`/`'pop'` för plask.

**Tap-tap-fallback (drag är svårt <4 år):** ett **tap på ett verktyg** "väljer" det (puls + `breathe`); nästa **tap på djuret** kör verktygets verkan i en **större radie (110)** kring tappunkten (skrubbar/sköljer en hel fläck på en gång). Så barnet kan **tappa runt på djuret** istället för att dra och ändå göra rent allt. Båda lägen driver samma `_scrubAt`/`_rinseAt`.

**Skydd mot dubbeltryck:** när `renhet` når 100 % sätts `this._resolving = true`; alla pekar-callbacks returnerar tidigt tills nästa djur byggs.

## Fysik & kalibrering
Ingen matter.js — bara en **egen, exit-säker vattendroppe-integrator** i tickern (ingen GSAP på Pixi-objekt; allt ritas i `this._spray`).

- Tillstånd: `this._drops = []` med `{x, y, vx, vy, r, life}`.
- **Spawn** (medan duschen hålls och rör sig): per tick lägg 2–3 droppar vid munstycket: `x = nozzle.x + (Math.random()*40-20)`, `y = nozzle.y`, `vx = (Math.random()*2-1)*1.5`, `vy = 4 + Math.random()*2`, `r = 3 + Math.random()*3`, `life = 1`.
- **Integration per tick** (`const dt = ctx.ticker.deltaMS / 16.67`):
  - `d.vy += 0.6 * dt` (tyngdkraft, px/tick²)
  - `d.x += d.vx * dt; d.y += d.vy * dt`
  - om droppen når djurets yta (punkt "på djuret", se silhuett) eller `d.y > 600` → kör en `_rinseAt({x:d.x,y:d.y})`-träff (sköljer närmaste skum), spawna en liten `puff`/stänk, ta bort droppen.
- **Rita:** `this._spray.clear()`; för varje droppe `this._spray.circle(d.x, d.y, d.r).fill({color: 0x9ed8f5, alpha: 0.8})` + en liten ljus topp. Tak: max ~120 droppar (släng äldsta).
- **Exit-säkert:** integratorn lever i `this._tick`; i `destroy` tas tickern bort och `this._drops` nollställs — inga frikopplade objekt kan krascha. Vattendropparna är inte GSAP-styrda.

(Spelet använder INTE AimLauncher/predictTrajectory, så ingen siktlinje-kalibrering behövs. Hade en sådan funnits gäller CLAUDE.md: `previewGravity = 0.2778×gravityY`, `previewDamp = 1−frictionAir`, vind `ax = previewWind/277.8`.)

## Återkoppling & belöning
Varje pekning → ljud+bild < 100ms, ENDAST positivt.
- **Greppa verktyg:** `audio.sfx('tap')` + `pop`.
- **Skrubba bort lera:** klumpen suddas, `puff` (vita skumbubblor), throttlat `audio.sfx('soft')` (skrubb-ljud). Var ~6:e klump: `audio.sfx('pop')` + en liten 🫧-`floatText` för variation. Mätaren tickar upp.
- **Skölja skum:** vattendroppar + `sparkle`, throttlat `audio.sfx('whoosh')`/`'pop'` (plask), pälsen "glänser" (kort `pop` på en glans-cirkel).
- **Dra utanför djuret:** ingen straff — en pytteliten `puff`/såpbubbla där fingret är (valfritt) + tystnad. ALDRIG buzzer/rött/omstart.
- **Steg-byte:** vid `scrubFrac ≥ 0.7` tonas duschen in + `voice.say('Bra! Ta duschen och skölj.')`.
- **Röst:** sparsamt så det inte tjattrar. Vid första skrubbningen `voice.say('Så ja, gnugga gnugga!')`. Vid första sköljningen `voice.say('Skölj rent!')`.

**Klart-firande (renhet = 100 %):** `this._resolving = true` →
- Djuret **skakar av sig vatten:** `shake(this._clean, {intensity:10, duration:0.5})` + en ring vattendroppar (`burst(this.fxLayer, 640, 430, {count:18, colors:[0x9ed8f5,0xeaf6ff]})`).
- `audio.sfx('celebrate')`, glansig `sparkle`/`burst` glitter över pälsen, `voice.say(randomFrom(PRAISE))` + valfritt ett djurläte via `audio.sample('djur_...')` (faller tyst tillbaka om klippet saknas).
- `bigCelebration(this.fxLayer, { width: ctx.width, height: ctx.height })`.
- `ctx.progress.complete()` (delat firande + klistermärke) anropas **exakt en gång**.
- Efter ~1.6s (`gsap.delayedCall`, vakta `this._alive`): höj nivå och bygg nästa djur.

**Mjuk auto-hjälp (garanterar 100 %, ingen fail):**
- Idle ~6s mitt i en uppgift → nollställ idle, `voice.say(this.voiceIntro)` (eller `'Ta duschen och skölj!'` i steg 2) + den närmaste kvarvarande ler-/skumfläcken `wiggle`/`breathe`:ar som vänlig vink, och det rekommenderade verktyget `pop`:ar i brickan.
- Om bara **få fläckar** återstår länge (t.ex. <6 kvar och ~10s utan framsteg): de sista städas bort av sig själva en och en (liten `sparkle` + `soft`) så barnet ALLTID når firandet. Aldrig en återvändsgränd.

Använda sfx: `tap, soft, pop, whoosh, correct, celebrate`. Voice: voiceIntro, 'Så ja, gnugga gnugga!', 'Bra! Ta duschen och skölj.', 'Skölj rent!', PRAISE-fras.

## Progression & nivåer
- Läs `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` i `init`.
- Nivån styr **lerighet, djur-storlek och djurtyp** (cykliskt, oändlig lek):
  - **Nivå 0–1:** ponny, glest lerlager (rutnäts-steg 44 → ~45 klumpar). Lär ut skrubb + skölj.
  - **Nivå 2–3:** gris, tätare lera (steg 38 → ~70 klumpar), något större silhuett (rx/ry ×1.05).
  - **Nivå 4–5:** valp, mycket lerig (steg 32 → ~100 klumpar) + några **dubbel-lager-klumpar** (kräver två svamp-pass: först blir mörk lera ljusare, andra passet suddar — bara mer skrubb, aldrig "fel").
  - **Nivå 6+:** mönstren upprepas med slumpat djur/färg och jitter (±lerighet) via `randomFrom`/`Math.random`.
- Efter `complete()`: `ctx.progress.setLevel(this._level + 1)`, `ctx.progress.setCustom('badade', n+1)` (räknar avklarade bad, oändligt — aldrig synligt, aldrig sjunkande), sedan `_buildAnimal(ctx)` bygger nästa djur på samma noder (rensa ler-/skum-/spray-lager, rita nytt rent djur, nytt lerlager, nollställ `scrubFrac/rinseFrac/renhet`, `_resolving=false`).

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics` + scen-bakgrund. **Inga externa bild-/ljud-/fontfiler.** Ljud via `ctx.services.audio.sfx`, röst via `ctx.services.voice.say`.
- Emoji: 🧽 (svamp), 🚿 (dusch), djuransikte 🐴/🐷/🐶, 🫧 (bubblor i firande/variation), 🧼 (mätar-ikon).
- Graphics: scen via `createScene('meadow')`; badbalja (`roundRect`, halvtransparent blå); rent djur (silhuett-ellipser + glans + öga/leende/ben/hovar/man/svans); lerklumpar (rundade bruna blobbar + mörka prickar); skumfläckar (ljusblå-vita blobbar); vattendroppar (cirklar i `this._spray`); renhets-mätare (bakgrundsstav + grön fyllnadsstav); droppskugga (mörk ellips alpha).
- Färger ur `theme.js`: `COLORS.brown` (lera), `COLORS.green` (mätare), `COLORS.blue` (vatten/balja), `COLORS.pink` (gris), `PLAYFUL`/`0x9ed8f5`/`0xeaf6ff` (skum/stänk/glitter).

## Återanvänd dessa
- `lib/scene.js`: `createScene('meadow', {...})` som första barn.
- `lib/feedback.js`: `puff`, `sparkle`, `burst`, `pop`, `wiggle`, `breathe`, `floatText`, `shake`, `bigCelebration` (alla exit-säkra — använd dem för partiklar/firande, tweena ALDRIG ett Pixi-objekt direkt som kan förstöras av exit).
- `lib/theme.js`: `COLORS`, `PLAYFUL`, `PRAISE`, `FONT`, `DESIGN_W`, `DESIGN_H`.
- `lib/swedish.js`: `randomFrom`, `shuffle` (djurval, jitter).
- `ctx.services.audio.sfx(...)` / `audio.sample('djur_...')`, `ctx.services.voice.say(...)` / `replayLast()`.
- `ctx.progress`: `get`, `setLevel`, `setCustom`, `complete`.
- `ctx.ticker` (vattendroppe-integrator + idle/auto-hjälp-timer), `ctx.fxLayer` (firande/partiklar), `gsap` (sudd-/inton-/återgångs-tweens via proxy-mönster).
- INTE `DragController` (egen kontinuerlig pekspårning + tap-tap passar bättre — se Interaktion); INTE `physics.js`/`launcher.js` (egen droppe-integrator räcker).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`onComplete`/timer-callbacks (nästa djur, auto-hjälp, firande) tidig-returnerar om `!this._alive`.
- `this._resolving = true` när `renhet` når 100 %; alla pekar/tap-callbacks och verktygsverkan returnerar om `_resolving || !_alive` → endast ETT firande, ETT `complete()`, ingen dubbeltrigg vid snabbtryck.
- **Exit-säkra partiklar:** lerklumpar/skumfläckar som suddas med egen `onComplete`-`destroy` får ALDRIG tweenas direkt — tweena `{a,s}`-proxy och kopiera till `view` bara `if(!view.destroyed)`, `onComplete: () => { if(!view.destroyed) view.destroy() }`. Vattendroppar är ticker-integrerade (ingen GSAP). Konfetti/puff/sparkle via `feedback.js`.
- Skydda mot dubbel-städning: `if (flake._clean) return` / `if (foam._rinsed) return`.
- Throttla skrubb-/plask-ljud (tidsstämpel) så snabb dragning inte spammar audio.
- Klampa verktygens position inom scenen så de aldrig dras utanför 1280×720.
- Idle-timern (i `this._tick`) nollställs vid varje pekning; auto-hjälpen "städar sista" bara när framsteg uteblivit (förhindra att den hjälper mitt under aktivt skrubbande).
- `destroy(ctx)`: `this._alive = false`; `ctx.ticker.remove(this._tick)`; avregistrera `pointerdown/globalpointermove/pointerup/pointerupoutside`-lyssnare; `gsap.killTweensOf(...)` för svamp, dusch, mätar-proxy, `this._clean` och alla levande klumpar/skum; döda `breathe`-tweens; `this._drops.length = 0`; `this._root?.destroy({ children: true })`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/tvatta-djuret/index.js` och default-exportera GameModule-objektet med metadatan ovan (importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `createScene`, feedback-hjälpare, `COLORS, PLAYFUL, PRAISE, FONT` från theme, `randomFrom` från swedish).
2. `init(ctx)`: `this._alive = true`; `this._root = new Container()`, `ctx.stage.addChild(this._root)`; lägg `createScene('meadow')` som första barn; bygg badbaljan. Skapa lager-containrar i ordning: `this._clean`, `this._mudLayer`, `this._foamLayer`, `this._spray` (Graphics), verktygsbrickan, `this._gauge`. Läs `this._level`. Anropa `this._buildAnimal(ctx)`. Registrera pekspårnings-lyssnare (se Interaktion) på verktygen + `this._root`.
3. `_buildAnimal(ctx)`: välj djurtyp/färg/lerighet från `this._level`; rensa `_mudLayer`/`_foamLayer`/`_spray`; rita rent djur i `this._clean` (silhuett-ellipser + detaljer + ansikts-emoji); generera lerklumpar på jittrat rutnät inom silhuetten (`bounceIn`-intro), spara i `this._flakes`; nollställ `this._scrubFrac=0`, `this._rinseFrac=0`, `this._renhet=0`, `this._foam=[]`, `this._resolving=false`; sätt duschen halvtransparent/inaktiv; uppdatera mätaren till 0.
4. Skriv `_scrubAt(p)`, `_rinseAt(p)` (med spray-spawn), `_updateGauge()` (`renhet = 0.6*scrubFrac + 0.4*rinseFrac`, tweena fyllnadsstaven), och `_onComplete(ctx)` (firande + `progress.complete()` + `setLevel`/`setCustom('badade', …)` + `gsap.delayedCall(1.6, () => this._alive && this._buildAnimal(ctx))`).
5. Skriv tap-tap-fallback: tap på verktyg väljer det (`breathe`), tap på djuret kör verktyget i radie 110.
6. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
7. Lägg ticker: `this._tick = (t) => this._update(ctx, t)`, `ctx.ticker.add(this._tick)`. I `_update`: integrera vattendroppar (om duschen hålls), rita `this._spray`, kör idle/auto-hjälp-timers. Allt bakom `if (!this._alive) return` (och hoppa droppar/auto-hjälp om `this._resolving`).
8. `destroy(ctx)`: städa enligt "Edge-cases & städning".
9. Registrera i `src/games/registry.js`: `import tvattaDjuret from './tvatta-djuret/index.js'` och lägg `tvattaDjuret` i `GAMES`-arrayen.
10. `npm run build` (0 fel). `npm run dev`, öppna biblioteket, spela: verifiera hem-knapp, röst-repris, att lera suddas vid svamp-drag OCH tap-tap, att duschen sköljer skum, mätaren fyller, firande + djurskakning vid 100 %, samt att `highestLevel`/`badade` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera till biblioteket → "Tvätta Djuret"; canvas finns; inga uncaught errors i `browser_console_messages`).
- Vid mount är `voiceIntro` satt/spelas ("Tvätta djuret rent! Dra svampen över kroppen.").
- **Svampen skrubbar:** `pointerdown` på svampen följt av `globalpointermove` över djuret minskar antalet orena lerklumpar / höjer `this._scrubFrac` (testbart via exponerat state) och spawnar skumfläckar.
- **Tap-tap-fallback:** tap på svampen, sedan tap på djuret, skrubbar en fläck utan drag.
- **Duschen sköljer:** efter att leran är borta sköljer dusch-drag bort skum (`this._rinseFrac` ökar) och vattendroppar spawnas/renderas i `this._spray`.
- **Två kontroller krävs:** `renhet` når 100 % först när BÅDE all lera är borttagen OCH allt skum sköljt (varken enbart skrubb eller enbart skölj räcker).
- **Korrekt resultat:** vid 100 % körs firande (konfetti i fxLayer, djurskakning) och `ctx.progress.complete()` anropas exakt en gång (ingen dubbeltrigg via `_resolving`-skydd vid snabba tryck).
- **Ingen fail-state:** att dra/tappa utanför djuret ger ALDRIG felljud/buzzer/rött/omstart — bara mjuk respons; mätaren sjunker aldrig.
- **Auto-hjälp:** efter idle (eller när få fläckar dröjt) städas de sista av sig själva så 100 % alltid nås; ingen återvändsgränd.
- **Oändlig lek:** efter firandet byggs nästa (lerigare/annat) djur och `custom.badade` har ökat.
- **Progress sparas:** efter `complete()` finns `highestLevel`/`stars`/`custom.badade` kvar i localStorage (`pwagames.save.v1`) efter omladdning.
- **Städning:** vid retur till biblioteket (hem-knapp) tas tickern bort och inga tweens/timeouts/droppar fortsätter logga eller kasta fel (inga konsolfel efter exit mitt i en animation).
