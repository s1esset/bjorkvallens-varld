# Pruttbubbelbad (`pruttbad`)
> Zacke sitter i ett skummande bubbelbad — barnet trycker på magen, det säger PRRRT, och en luftbubbla stiger gungande genom vattnet och poppar vid ytan med ett fniss. Ren fnitter-magi: ju hårdare man håller, desto större bubbla, och en gul gummianka man kan flytta gör att bubblorna studsar åt nya håll.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `pruttbad` | Pruttbubbelbad | 🛁 | roligt | tap | [2,4] | `pruttbad` | "Tryck på Zackes mage så pruttar det bubblor!" |

(`titleSv` har åäö; `id`/`bundle` är ASCII enligt `asciiFold`.)

## Mål & mekanik
- **Zacke** sitter nedsänkt i ett badkar fyllt med vatten. Hans **mage** (en glansig, pulserande träffyta under vattenytan) är huvudknappen.
- **Kärnloop:** barnet trycker (eller håller) på magen → **prutt-SFX** + en **luftbubbla** föds vid tryckpunkten och **stiger** genom vattnet (lyftkraft), vobblar i sidled på vägen upp, och **poppar vid ytan** med ett fniss + litet skumplask. Varje pop lägger till **skum** på vattenytan.
- **Två tydliga kontroller som ändrar utfallet:**
  1. **Var du trycker** — bubblan föds vid den x-position på magen/kroppen du pekar på, så du kan styra var bubblorna stiger upp (vänster/höger om ankan).
  2. **Hur länge du håller** — ett snabbt tryck ger en lagom bubbla med en gång; **håller** du kvar fingret *blåser bubblan upp sig* (växer synligt) och när du släpper stiger den **snabbare** och poppar **högre** (större skumplask). En tredje, flyttbar kontroll: en **gul gummianka 🦆** du kan **dra** runt i vattnet; stigande bubblor **studsar** mot ankan så du kan leda dem.
- **Mål:** poppa bubblor tills **skummet fyller badet upp till skumlinjen** (en prickad mållinje en bit ovanför vattenytan). När skummet når linjen → firande + nytt, lite högre mål (oändlig lek).
- **No-fail:** tomma tryck finns inte — tryck på vattnet ger ett litet plopp + ring, tryck på magen ger alltid en bubbla. Varje pop ökar skummet monotont, så barnet kan ALDRIG fastna; vid idle pruttar Zacke själv (auto-hjälp) tills badet fylls.

## Skärm-layout (1280x720)
GameHost ritar header (hem-/repetera-knapp) överst — rita INGA egna. Allt spelinnehåll ligger i spelets `_root` (designkoordinater), under y≈90.

- **Bakgrund (FÖRSTA barn):** `createScene('water', { ground:false })` ur `lib/scene.js` (mjuk blå-teal "badrums"-gradient + bokeh). `eventMode='none'`.
- **Badkar (porslin):** `roundRect(170, 250, 940, 430, 90).fill(COLORS.white).stroke({width:12, color:COLORS.teal})`. En ljusare glansremsa upptill (`roundRect(190, 262, 900, 40, 30).fill({color:0xffffff, alpha:0.6})`).
- **Vatten:** `roundRect(200, 330, 880, 340, 60)` fylld blå `{color:COLORS.blue, alpha:0.55}`. **Vattenytan `SURFACE_Y = 330`** = bubblornas pop-linje och lyftkraftens nollinje.
- **Logiska väggar (bubbel-studs):** `WALL_L = 230`, `WALL_R = 1050`, `FLOOR = 650`.
- **Skum-mållinje:** prickad vågrät linje vid `GOAL_Y` (start `300`, sjunker = höjs som krav per nivå, se Progression), ritad som en rad små cirklar `{color:COLORS.white, alpha:0.8}` + en liten `🫧`-emoji (Text 40) i höger kant som markör.
- **Skum-lager (`this._foam`, Graphics):** ligger ÖVER vattnet men UNDER bubblorna; ritas om varje gång skummet växer som en rad överlappande vita cirklar vars översta kant = `foamTopY` (börjar vid `SURFACE_Y`, kryper uppåt mot `GOAL_Y`).
- **Zacke:** programmatisk figur centrerad vid x≈430, nedsänkt i karet. Rund kropp (`circle(0,0,120).fill(COLORS.orange)`) med synlig **mage**-glansyta (ljusare cirkel `circle(0, 20, 70)`), ett gladt ansikte (😊-stil: två ögon + leende båge) som sticker upp ovanför ytan vid y≈300, och en mjuk skugga. **Magens träffyta:** osynlig `hitArea = new Circle(0, 20, 92)` på Zacke-containern (visuell glanscirkel r≈70 → träffyta-diameter ≥184px ≫ 96px).
- **Gummianka:** Container med vit skuggellips + `🦆`-emoji (Text fontSize 84), startposition mitt i vattnet (x≈760, y≈430), `hitArea = new Circle(0,0,80)` (träffyta ≥160px). Kollisionsradie `DUCK_R = 66`.

Marginaler: anka, Zacke och skumlinje har minst 24px fri yta runt sig; bubblor föds alltid innanför `WALL_L+r … WALL_R−r`.

## Interaktion
Två oberoende kontroller + ett mjukt vatten-tryck. Allt via plattformens primitiver — **inte** AimLauncher (inga kast här).

**1) Magen (tryck/håll → bubbla):**
- Zacke-containern `eventMode='static'`, `cursor='pointer'`, `hitArea` enligt ovan.
- `pointerdown` på magen: `audio.sample('fart') || audio.sfx('soft')` (<100ms), spara `down = _root.toLocal(e.global)`, starta en **laddnings-bubbla** vid `down.x` (klampad till väggarna) på y≈`FLOOR-30`: `this._charging = { x, r: 26 }`, rita en växande glansbubbla, `pop(zackeMage)`. Sätt `this._held = true`.
- Medan nere (i ticker): om `this._held`, väx `_charging.r += 26 * dt/60`-takt upp till `R_MAX = 70`; den växande bubblan följer med + en svag stigande "väsljud"-känsla (valfri throttlad `sfx('soft')`). Direkt visuell tillväxt = ingen dold "långtryck"-gest, bara direktmanipulation.
- `pointerup`/`pointerupoutside`: **släpp bubblan** → `_spawnBubble(x, r)` med `r = _charging.r` (ett snabbt tryck < ~120ms ger ändå `r≈30`, alltid en rolig bubbla). Nollställ `_charging`/`_held`. Ljud `audio.sample('fart')` redan spelat vid down; vid release en kort `sfx('whoosh')`.
- **Tap-tap är gratis:** ett rent tryck UTAN håll ger omedelbart en medelstor bubbla — håll krävs ALDRIG (tillgängligt för 2-åringen).

**2) Ankan (dra → flytta studshindret):**
- Använd `lib/DragController.js`: `this._drag = new DragController({ space:_root, services:ctx.services })`, `this._drag.addItem(duckView, { snapBack:false }, hooks)` så ankan stannar där den släpps (med tap-tap-fallback: tap anka → tap ny plats → ankan glider dit). Klampa ankans position till vattnet (`WALL_L+DUCK_R … WALL_R−DUCK_R`, `SURFACE_Y+20 … FLOOR−DUCK_R`).
- Vid flytt: `audio.sample('djur_anka')` (kvack) throttlat + `pop(duck)`. Ankan guppar lätt på ytan (liten sinus i ticker).

**3) Vatten-tryck (alltid kul):** en transparent `hitArea`-rektangel över vattenytan, `pointertap` → `ripple(ctx.fxLayer, x, y, {color:COLORS.white})` + `audio.sample('plopp') || audio.sfx('pop')` + närliggande bubblor får en liten knuff. Ger aldrig "ingenting".

Hit-areor: mage ≥184px, anka ≥160px, inga små klickytor. `globalpointermove` används av DragController; magens håll-tillväxt drivs i ticker (inget eget move-beroende).

## Fysik & kalibrering
**Egen per-tick bubbel-integrator** (ticker-driven, exit-säker — INGEN matter.js, INGEN GSAP på bubbel-Pixi-objekt). `dt = Math.min(2.5, ctx.ticker.deltaMS / 16.67)`.

Varje bubbla = `{ view, x, y, r, vx, vy, phase, age }`. `view` = Container med glansig cirkel (`circle(0,0,r).fill({color:0xbfefff, alpha:0.5}).stroke({width:3,color:0xffffff,alpha:0.8})` + liten vit glansprick uppe-vänster). Per tick:
- **Lyftkraft (∝ radie):** terminalfart uppåt `vyT = -(0.11 * r)` px/frame → större bubbla stiger snabbare. Ease mot terminal: `vy += (vyT - vy) * 0.08 * dt`.
- **Vattenmotstånd (drag):** `vy *= 0.97`, `vx *= 0.92` per frame → lugn, aldrig studsig rörelse.
- **Sidledsvobbel (sinus):** `phase += 0.12 * dt`; `vx += Math.sin(phase) * 0.5 * dt` → den lata vänster-höger-gungningen på vägen upp.
- **Integrera:** `x += vx * dt; y += vy * dt; age += dt`.
- **Väggstuds:** klampa `x` till `[WALL_L+r, WALL_R−r]`, invertera `vx *= -0.5` vid träff (mjukt).
- **Anka-kollision (kontroll 2):** `d = hypot(x-duck.x, y-duck.y)`; om `d < r + DUCK_R` → skjut ut bubblan längs normalen och spegla farten (`vx,vy` reflekteras ×0.6), `audio.sample('boing') || audio.sfx('soft')` (throttlat ~150ms), `wiggle(duck)`. Så ankans placering ändrar vart bubblorna tar vägen.
- **Pop vid ytan:** när `y - r <= SURFACE_Y` (bubblans topp når ytan) → `_popBubble(b)`: ta bort från listan, `b.view.destroy()`, `puff(ctx.fxLayer, x, SURFACE_Y, {count: 6 + (r/10|0), color:0xffffff})`, `sparkle(ctx.fxLayer, x, SURFACE_Y)`, `audio.sample('plopp') || audio.sfx('pop')`, ibland `floatText(ctx.fxLayer, x, SURFACE_Y-10, randomFrom(['Hihi!','Pluff!','😄','🫧']))`. **Större bubbla poppar högre:** skumtillskott och plask-höjd ∝ `r` (en kort vit plask-cirkel som stiger `r*1.4`px).
- **Skum-tillskott:** `this._foam.level += r * FOAM_K` (`FOAM_K ≈ 0.9`); rita om skumbandet så `foamTopY = SURFACE_Y - this._foam.level` (klampad ≥ `GOAL_Y`). När `foamTopY <= GOAL_Y` → `_onComplete()`.
- **Max-livslängd (anti-fastna):** om `age > 360` (≈6s, t.ex. fångad mot ankan) → auto-poppa bubblan ändå. Hastighetstak `MAX_V = 14` så inget kan skjuta ur karet.

(Detta är en självständig integrator vid 60fps — ingen AimLauncher-pricklinje, så ingen `previewGravity`/`previewWind`-kalibrering behövs. Bubblorna är vanliga Pixi-objekt som ENDAST rörs av ticker-loopen; de tweenas aldrig med GSAP, så de är exit-säkra utan extra skydd. Partiklar/plask går via `lib/feedback.js` som redan är exit-säkra.)

## Återkoppling & belöning
Varje pekning < 100ms:
- **Mage tryck:** `audio.sample('fart')` (riktig prutt) eller fallback `sfx('soft')` + `pop(mage)` + bubblan föds direkt.
- **Håll:** bubblan växer synligt + svag väs-känsla → direkt, kontinuerlig återkoppling.
- **Bubbel-pop:** `plopp`/`pop`-ljud + `puff` + `sparkle` + ibland fniss-`floatText`. Större bubbla = större puff + högre plask.
- **Anka:** `djur_anka`-kvack + `pop`; bubbel-studs mot anka = `boing` + `wiggle(duck)`.
- **Vatten-tryck:** `ripple` + `plopp`.
- **"Fel" finns inte:** tryck utanför allt → liten `sparkle` där fingret är. ALDRIG buzzer/rött/omstart.
- **Klart-firande:** när skummet når mållinjen → `this._resolving = true`, `audio.sfx('celebrate')`, `voice.say(randomFrom(PRAISE))`, Zacke `pop`:ar och en svärm bubblor pruttar upp på en gång, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})`, sedan `ctx.progress.complete()` (delat firande + klistermärke).
- **Röst:** `voiceIntro` på mount; vid första pruttet `voice.say('Pruttbubblor!')`; annars sparsamt så det inte tjattrar.

Använd-sfx/sample: `fart, plopp, pop, boing, djur_anka, whoosh, soft, celebrate`. Voice: `voiceIntro`, 'Pruttbubblor!', idle-cue + `PRAISE`.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` vid init.
- **Skum-mål skalar mjukt:** `goalFoam = 70 + this._level * 18` (skumlinjen `GOAL_Y` sätts en bit högre per nivå, men aldrig högre än y≈220). För att hålla det lätt: vid högre nivå föds bubblorna **lite större som standard** och ett pop kan ge en **dubbel-prutt** (2 bubblor) ibland → mer skum per tryck, så fler-och-snabbare INTE betyder svårare.
- Efter `_onComplete()`: `ctx.progress.complete()`, `ctx.progress.setLevel(this._level + 1)`, `setCustom('bad', n+1)` (räknar avklarade bad, oändligt). Efter ~1.5s (`gsap.delayedCall`, vakta `_alive`): `_newRound()` — töm skummet (`foam.level=0`, animera ner), höj `GOAL_Y` enligt nästa nivå, nollställ `_resolving=false`. Inga sjunkande värden, ingen synlig poäng.
- **Auto-hjälp (garanterar framgång):** idle-timer i ticker; om ingen interaktion på ~6s och badet ej fyllt → `voice.replayLast()` + Zackes mage `breathe`/`pop` + Zacke pruttar SJÄLV en bubbla (`_spawnBubble` med slumpad x/r). Fortsätter med jämna mellanrum så skummet alltid till slut når linjen utan att barnet behöver lyckas precist.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics`. Inga externa bild-/font-filer; ljud via `audio.sfx`/`audio.sample`, röst via `voice.say`.
- Emoji: 🛁 (bricka), 🦆 (anka), 🫧 (skumlinje-markör), valfria fniss-emoji (😄/🫧) i `floatText`.
- Graphics: scen-bakgrund (`scene.js`), badkar (`roundRect` + glansremsa), vatten (`roundRect` alpha), skum-band (rad vita cirklar), skum-mållinje (prickrad), Zacke (cirkel-kropp + mage-glans + ansikte), bubblor (glansig cirkel + glansprick), ankans skuggellips.
- Firande/partiklar via `lib/feedback.js` (`puff`, `sparkle`, `ripple`, `floatText`, `bigCelebration`, `pop`, `wiggle`, `breathe`).

## Återanvänd dessa
- `lib/scene.js` — `createScene('water', { ground:false })` som första barn.
- `lib/feedback.js` — `puff`, `sparkle`, `ripple`, `floatText`, `pop`, `wiggle`, `breathe`, `bigCelebration`.
- `lib/DragController.js` — ankans drag + tap-tap-fallback (`snapBack:false`).
- `lib/theme.js` — `COLORS`, `FONT`, `PRAISE`, `DESIGN_W/H`.
- `lib/swedish.js` — `randomFrom`, `shuffle` (variation i fniss/bubbelstorlek).
- `ctx.services.audio.sample('fart'|'plopp'|'boing'|'djur_anka')` (riktiga klipp, returnerar `false` → falla tillbaka på `sfx`), `audio.sfx('soft'|'pop'|'whoosh'|'celebrate')`, `voice.say/replayLast`.
- `ctx.progress` — `get`, `setLevel`, `complete`, `setCustom`. `ctx.ticker` (bubbel-integrator + idle/auto-hjälp), `ctx.fxLayer` (partiklar/konfetti), `gsap` (endast på Zacke/anka/skum-Graphics + `delayedCall`, ALDRIG på bubbel-objekt).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/auto-hjälp/`_newRound`-callbacks och ticker-loopen kollar `if (!this._alive) return` tidigt.
- **`_resolving`-skydd:** sätt `true` när skummet når linjen → ignorera nya mage-/vatten-tryck och stäng av nya bubblor + `complete()`-trigg tills `_newRound`. Förhindrar dubbel-firande vid snabba tryck.
- Bubblor är ENDAST ticker-styrda Pixi-objekt (inga GSAP-tweens) → vid spel-exit räcker `view.destroy()` i en loop; partiklar via exit-säkra feedback-helpers.
- Throttla anka-kvack och boing-studsljud (~150ms) så multistudsar inte spammar audio. Klampa bubbelhastighet (`MAX_V`) och position varje frame så inget lämnar karet.
- Håll-laddning: om fingret släpps utanför (`pointerupoutside`) → släpp ändå bubblan; om spelet förstörs mitt i laddning, nollställ `_charging`/`_held` i destroy.
- Idle-timer nollställs vid varje interaktion så auto-hjälpen inte pruttar mitt under att barnet leker.
- `destroy(ctx)`: `this._alive=false; ctx.ticker.remove(this._tick);` ta bort pointer-lyssnare på Zacke/vatten-hitArea; `this._bubbles.forEach(b => b.view.destroy()); this._bubbles.length = 0;` `this._drag?.destroy();` `gsap.killTweensOf(this._zacke); gsap.killTweensOf(this._duck); gsap.killTweensOf(this._foam);` `this._root?.destroy({children:true})`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/pruttbad/index.js`. Importera `Container, Graphics, Text, Circle, Rectangle` från `pixi.js`, `gsap`, `DragController`, feedback-helpers, `createScene` från scene, `COLORS, FONT, PRAISE` från theme, `randomFrom` från swedish.
2. Default-exportera GameModule med metadatan i tabellen ovan.
3. `init(ctx)`: `this._alive = true; this._bubbles = []; this._foam = { level: 0 };` skapa `this._root = new Container()` → `ctx.stage.addChild(_root)`. Lägg `createScene('water',{ground:false})` som första barn. Bygg badkar, vatten, skum-mållinje, `this._foamGfx` (Graphics), Zacke, anka. Läs `this._level` från progress. Skapa `this._drag` och registrera ankan. Sätt mage- och vatten-`hitArea` + pointer-lyssnare.
4. Skriv `_spawnBubble(x, r)`: skapa bubbel-view, lägg i `this._root` (under header), pusha `{view,x,y:FLOOR-30,r,vx:0,vy:0,phase:Math.random()*6,age:0}` till `this._bubbles`.
5. Skriv `_popBubble(b)`, `_addFoam(r)` (rita om `_foamGfx`, kolla mållinje → `_onComplete`).
6. Lägg fysik/idle i ticker: `this._tick = (tk) => this._update(ctx, tk)`, `ctx.ticker.add(this._tick)`. I `_update`: håll-laddningstillväxt, för varje bubbla kör integratorn (lyft, drag, vobbel, väggar, anka, pop), anka-gupp, idle/auto-hjälp-timer. Allt bakom `if (!this._alive) return` och bubbel-spawn bakom `if (this._resolving) return`.
7. `_onComplete()`: `_resolving=true`, firande + `ctx.progress.complete()` + `setLevel(_level+1)` + `setCustom('bad', …)`, `gsap.delayedCall(1.5, () => this._alive && this._newRound())`.
8. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
9. `destroy(ctx)`: enligt "Edge-cases & städning".
10. Registrera i `src/games/registry.js`: `import pruttbad from './pruttbad/index.js'` och lägg `pruttbad` i `GAMES`-arrayen.
11. `npm run dev`, öppna biblioteket, spela: verifiera prutt-ljud + bubbla vid tryck, håll→större→poppar högre, ankan studsar bubblor, skummet fyller mot linjen → firande, auto-hjälp vid idle, hem-knapp, röst-repris, och att `highestLevel`/`bad` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera bibliotek → "Pruttbubbelbad"; canvas finns, inga uncaught errors i `browser_console_messages`).
- `voiceIntro` är satt ("Tryck på Zackes mage så pruttar det bubblor!") och en svensk röstinstruktion spelas på mount.
- Tryck på Zackes mage (pointer down→up via `browser_run_code_unsafe`/exponerat teststate) föder en bubbla: `this._bubbles.length` ökar och bubblans `y` minskar (stiger) över efterföljande tickar.
- **Håll ger större bubbla:** ett längre håll (down, vänta, up) föder en bubbla med större `r` än ett snabbt tap (verifiera via exponerat state).
- **Ankan är en kontroll:** att dra ankan ändrar dess position; en bubbla som når ankan studsar (riktning på `vx`/`vy` ändras) utan fel/buzzer.
- Bubblor poppar vid ytan: när `y - r <= SURFACE_Y` tas bubblan bort, skum-nivån (`this._foam.level`) ökar och en `plopp`/`pop` + puff spelas.
- **Mål:** när skummet når mållinjen körs firande (konfetti i fxLayer) och `ctx.progress.complete()` anropas exakt EN gång (inget dubbel-firande vid snabba tryck under `_resolving`).
- **No-fail / auto-hjälp:** inga "game over"-element, ingen poäng som sjunker; vid idle pruttar Zacke själv tills badet fylls — rundan firas ändå. Bubblor lämnar aldrig karet (position inom väggarna efter studs).
- Efter en avklarad runda byggs ett nytt bad (oändlig lek), `highestLevel` ökat och `custom.bad` ökat; värdena kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- `destroy` (hem-knapp mitt i animation) tar bort ticker + alla bubblor + tweens; inga kvarvarande loggar/fel.
