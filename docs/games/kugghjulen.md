# Kugghjulen (`kugghjulen`)
> Barnet bygger en riktig liten maskin: lägg färgglada kugghjul på pinnarna så de greppar i varandra hela vägen från veven till målet, veva runt — och HELA raden snurrar på en gång och hissar Elviras flagga. Ren ingenjörsglädje där allt alltid går att få att fungera.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `kugghjulen` | Kugghjulen | ⚙️ | pussel | drag | [3,5] | `kugghjulen` | "Sätt kugghjulen på pinnarna så de greppar — veva sedan!" |

## Mål & mekanik
Barnet ska koppla en **kedja av kugghjul** från en fast **vev** (vänster) till ett fast **målhjul / vinsch** (höger) som hissar en flagga 🚩. När kedjan greppar och barnet vevar snurrar ALLA meshande hjul samtidigt (granne snurrar åt motsatt håll, snabbare ju mindre hjulet är) och flaggan stiger.

**Kärnloop:**
1. På en pegboard sitter fasta **pinnar** (tomma hål). Veven (fast) och målhjulet (fast) finns redan. En **bricka** längst ner ger kugghjul i tre storlekar (liten/mellan/stor).
2. Barnet **drar** ett hjul från brickan till en pinne → det snäpper på plats. Två hjul **greppar (mesh)** när avståndet mellan deras mittpunkter ≈ summan av deras radier (geometrisk koppling — rätt storlek på rätt pinne avgör om de når varandra).
3. När en obruten kedja går vev → … → målhjul: ett mjukt "snäpp", hjulen **glöder**, röst "Den greppar!". Maskinen är hopkopplad.
4. Barnet **vevar** (drar vevhandtaget runt, eller tappar veven → den vevar själv). Varje hjul i kedjan roterar i takt: `rotation = vevvinkel × (−1)^djup × (rVev / rHjul)` (mellanradierna tar ut varandra → hastighet ∝ 1/radie, riktning växlar per steg). Målhjulet snurrar → vinschen hissar flaggan + Elviras karusell 🎠 snurrar.
5. Flaggan når toppen → firande, `ctx.progress.complete()`, nästa (längre) kedja byggs.

**Två tydliga kontroller som ändrar utfallet:** (a) **VILKA pinnar** du sätter hjul på (du drar kedjans väg), och (b) **VILKEN storlek** hjul du väljer (avgör om gapet överbryggas och hur snabbt målet snurrar). Plus vevandet (drag/tap) som tredje interaktion.

**Aldrig fel / no-fail:** ett hjul som inte greppar snurrar bara **fritt** (löst, drivs ej) + en **glödande spök-kontur** pulsar på nästa pinne som behöver ett hjul, och rätt storlek i brickan vinkar. Efter idle/upprepade missar **auto-hjälp**: rätt hjul flyger själv från brickan till rätt pinne (med "Titta!" + gnistor) tills kedjan når målet. Vevandet hissar flaggan oavsett vevriktning (vinsch-spärr — fram och tillbaka räknas båda som framåt) → barnet lyckas alltid.

## Skärm-layout (1280x720)
GameHost ritar hem-/repetera-knapp i headern (y<90) — rita INGA egna. Allt nedan ligger i spelets `_root` (designkoordinater). Bakgrund FÖRST: `createScene('warm', { ground:false })` (varm verkstadston) som första barn, `eventMode='none'`.

- **Pegboard-panel:** `roundRect(120, 110, 1040, 470, 30).fill(COLORS.brown alpha 0.16).stroke({width:8, color:COLORS.brown, alpha:0.5})` — träbrun verkstadsskiva. Lägg ett rutmönster av små håldekor-prickar (radie 4, `COLORS.brown` alpha 0.18) var 60:e px för pegboard-känsla (dekor, `eventMode='none'`).
- **Pinnar (fasta hål):** för varje pinne en `circle(0,0,16).fill(COLORS.inkSoft alpha 0.35).stroke({width:4,color:COLORS.inkSoft alpha:0.5})`. En tom pinnes hela träffyta (för drop-snäpp) är radie **70**.
- **Vev (fast, vänster):** centrum `C = (230, 360)`, vevhjul radie `r0 = 66`, färg `COLORS.red`. Ett **vevhandtag**: liten knopp (`circle r=22`, `COLORS.yellow`, vit kant) placerad `0.7·r0 ≈ 46px` ut från centrum. Handtaget är drag-/tap-ytan (osynlig hit-halo radie **70**).
- **Målhjul / vinsch (fast, höger):** centrum `T` i slutet av kedjan (varierar per nivå, se Progression), radie `rT = 66`, färg `COLORS.purple`, med ett litet **kugg-i-kugg-band** runt om. Ovanför `T` reser sig en **flaggstång**: linje x=`T.x`, från `y=T.y-30` upp till `y=140`, `stroke({width:10, color:COLORS.inkSoft})`. En **flagga** 🚩 (emoji-Text fontSize 72) klättrar längs stången; botten = ej hissad, topp (y≈150) = klart.
- **Karusell + Elvira (höger om målet, dekor/belöning):** 🎠 (Text fontSize 96) vid `(T.x+96, T.y+96)` som snurrar när målet drivs; bredvid en glad 👧 (Elvira) vid `(T.x+150, T.y+96)` som studsar/klappar vid firande. Elvira är den enda avbildade människan (namnregel).
- **Bricka (dispensrar) nederst:** trä-hylla `roundRect(120, 612, 1040, 96, 24).fill(COLORS.brown alpha 0.22)`. Tre **dispenser-hjul** centrerade vid `x = 540 (S), 700 (M), 860 (L)`, `y = 660`. Visuell radie = hjulets radie; osynlig hit-halo radie **70** (≥96px träffyta, ≥24px mellanrum). Färg per storlek: **S = COLORS.blue (r=50)**, **M = COLORS.orange (r=66)**, **L = COLORS.green (r=84)** — färg = storlekens "ledtråd".

Allt spelinnehåll mellan y≈110 och 600; brickan 612–708. Inga element under headern (y<90).

## Interaktion
Två interaktionssätt, båda byggda på plattformens primitiver + `lib/DragController.js` för dra-hjul-till-pinne.

**1) Placera hjul (drag, med tap-tap-fallback) — via DragController:**
- `this._drag = new DragController({ space: this._root, services: ctx.services })`.
- Varje **dispenser** är drag-startpunkt: vid `pointerdown` på en dispenser spawnas ett nytt hjul (`_makeGear(size)`) ovanpå dispensern och registreras direkt som DragController-item så samma gest fortsätter som ett drag (eller enklast: dispensern ÄR ett item som vid släpp spawnar en kopia och själv hoppar tillbaka). Hjulet får osynlig hitArea `new Circle(0,0,70)`.
- Varje **pinne** registreras som DragController-target med `addTarget(peg, accepts, { hitRadius: 80 })`. Släpp inom 80px → snäpp till pinnens exakta centrum; släpp utanför alla pinnar → mjuk snäpp-tillbaka till brickan + `puff` (aldrig straff).
- **Tap-tap-fallback** (drag svårt < 4 år): tap på en dispenser → den "väljs" (pulsar); nästa tap på en pinne → hjulet placeras där. DragController ger detta inbyggt.
- **Upptagen pinne:** dra ett nytt hjul till en pinne som redan har ett → det gamla hjulet flyger tillbaka till brickan (`puff`), det nya snäpper på. Max ett hjul per pinne. (Inget separat "ta bort"-läge som kräver gester.)
- Efter varje placering/borttagning: kör `_rebuildMesh()` (se Fysik) → uppdatera vilka hjul som drivs, glöd, spök-hint och om kedjan nått målet.

**2) Veva (drag runt, med tap-fallback):**
- Vevhandtaget: `eventMode='static'`, hitArea `Circle(0,0,70)`. `pointerdown` → `this._cranking=true`, spara `_lastPointerAng = atan2(p.y−C.y, p.x−C.x)`, ljud `tap`, handtag-pop.
- `globalpointermove` (registrerad vid down): nuvarande vinkel `a = atan2(...)`; `Δ = wrapAngle(a − _lastPointerAng)`; `this._crankAngle += Δ`; `_lastPointerAng = a`; ljud `tap` throttlat var ~140ms vid rörelse.
- `pointerup/upoutside` → `this._cranking=false`.
- **Tap-fallback (auto-veva):** ett kort tap på veven (ingen drag-rörelse) → `gsap` snurrar `_crankAngle += 2π` över 1.1s (`ease:'power1.inOut'`), 2 varv i rad. Så de minsta kan bara tappa veven och se maskinen gå.
- Varje frame i ticker driver rotationerna och flagghöjden av `_crankAngle` (se Fysik & kalibrering).

Träffytor: alla hjul/dispensrar/handtag har osynlig hit-radie ≥70 (≥140px diameter). Pinn-drop-radie 80. Inga små klickytor.

## Fysik & kalibrering
Ingen matter.js — **ren geometrisk rotationskoppling** (deterministisk, exit-säker, körs i ticker).

**Mesh-graf (`_rebuildMesh()`), körs vid varje placering/borttagning:**
- Noder = `[ vev(C, r0, fast), ...placerade hjul(x,y,r), målhjul(T, rT, fast) ]`.
- Kant mellan två noder om `Math.abs(dist − (rA + rB)) < MESH_TOL`, med `MESH_TOL = 14`. (Tight nog att FEL storlek inte greppar → storleksvalet betyder något; auto-hjälpen, inte lös tolerans, garanterar framgång.)
- **BFS från veven** (djup 0). För varje nådd nod: `depth`, och `factor = ((depth % 2) ? -1 : 1) × (r0 / rNod)`. Markera `driven=true`. (Härledning: i en kedja vev(r0)→g1(r1)→g2(r2) blir ω1=−ω0·r0/r1, ω2=+ω0·r0/r2 — mellanradierna kancellerar, så `factor_i = (−1)^djup · r0/r_i`. Detta ger exakt "granne motsatt håll" + "hastighet ∝ 1/radie".)
- `this._chainComplete = (målhjul.driven === true)`.

**Rotation per frame (ticker, `dt = ticker.deltaMS/16.67`):**
- Drivna hjul: `gear.view.rotation = this._crankAngle * gear.factor` (sätt direkt — deterministiskt, ingen integration som driver iväg). Veven själv: `vevView.rotation = this._crankAngle`.
- **Fria (ej drivna) hjul:** ett placerat hjul utan koppling till veven snurrar inte av vevandet. Tappar barnet på ett fritt hjul → ge det en liten egen `freeSpin`-impuls (`gear.freeVel += 0.25`), och varje frame `gear.freeAngle += gear.freeVel*dt; gear.freeVel *= 0.94` (mjuk utklingning), `gear.view.rotation = gear.freeAngle`. Visar tydligt "det här greppar inte (ännu)".
- **Vinsch / flagga (forgiving spärr):** om `_chainComplete`, beräkna målhjulets vinkel `ta = _crankAngle * målfactor`; lägg till `this._flagProgress += Math.abs(ta − this._prevTargetAngle)` (absolut delta → fram OCH tillbaka hissar = förlåtande); `this._prevTargetAngle = ta`. Flaggans y interpoleras: `flag.y = lerp(yBottom=T.y−40, yTop=150, clamp(_flagProgress / FULL, 0, 1))` med `FULL = 6π` (≈3 varv). Karusellen: `karusell.rotation = ta` när driven.
- Når `_flagProgress ≥ FULL` (och ej redan klar) → `_onComplete(ctx)`.

Ingen krock-/studsfysik behövs. Allt är ren trigonometri → inga partikel-integratorer att kalibrera. (Om någon vill: spök-trajektoria/AimLauncher används INTE här.)

**Hjul-/pinngeometri (så touchande hjul greppar inom MESH_TOL):** radier `S=50, M=66, L=84`, vev/mål `=66`. Kedjans pinnar marscheras: starta vid `C`, för varje nästa hjul flytta `(r_prev + r_cur)` px längs en mestadels +x-riktning med liten lodrät sinus (amplitud ≤6, vilket håller avståndsdiffen < MESH_TOL). Sista hjulet placeras så `dist(sista, T) = r_sista + 66`. Se Progression för storleksmönster per nivå.

## Återkoppling & belöning
Varje pekning ger ljud+bild < 100ms; ENDAST positivt.
- **Placera hjul (snäpp):** `audio.sfx('pop')` + `bounceIn`/`pop(gear.view)` + liten `sparkle(ctx.fxLayer, peg.x, peg.y)`.
- **Snäpp-tillbaka (släpp utanför):** `audio.sfx('soft')` + `puff(ctx.fxLayer, x, y)` — mjukt, aldrig fel-ljud.
- **Kedjan greppar (målhjul blir drivet första gången):** `audio.sfx('match')` + `audio.sfx('reveal')`, alla drivna hjul får en **glödpuls** (`pop` i följd längs kedjan), `voice.say('Den greppar! Veva nu!')`.
- **Veva:** `audio.sfx('tap')` throttlat vid rörelse; vid auto-veva-tap `audio.sfx('whoosh')`.
- **Fritt hjul (greppar ej) som tappas:** `audio.sfx('soft')` + `wiggle(gear.view)` + spök-konturen på rätt nästa pinne pulsar (`pop`/glödökning) som vänlig vink. ALDRIG buzzer/rött/omstart.
- **Flaggan stiger:** liten `sparkle` vid flaggan var ~120px den klättrar (throttlat).
- **Klart-firande:** `this._resolving = true`; flaggan studsar i topp (`pop`), Elvira 👧 hoppar/klappar (`pop` x2), karusellen snurrar fort en stund, `audio.sfx('celebrate')` + `audio.sfx('correct')`, `voice.say(randomFrom(PRAISE))`, `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})` + `burst(ctx.fxLayer, T.x, 170)`. Sedan `ctx.progress.complete()`. Efter ~1.6s (`gsap.delayedCall`, vakta `_alive`) byggs nästa nivå.

**Spök-hint (alltid på, mjuk guide):** den första ofyllda pinnen i lösningsordningen (frontier) ritar en pulsande **spök-kugg** (kugg-kontur i låg alpha, `breathe`) i den storlek den ska ha, och motsvarande dispenser i brickan får en lugn `breathe`-puls. Så barnet ser var nästa hjul ska och vilken storlek — utan text.

**Idle-recue (~6s utan interaktion, ej klart):** `voice.replayLast()` (annars `say(voiceIntro)`) + spök-konturen pulsar starkare + rätt dispenser `pop`:ar. Nollställ idle-timern vid varje interaktion.

**Auto-hjälp (garanterar framgång):** efter ~14s idle ELLER 3 placeringar som inte för kedjan framåt → ett korrekt hjul (rätt storlek) **flyger själv** från sin dispenser till frontier-pinnen: `floatText(ctx.fxLayer, dispenser.x, dispenser.y, 'Titta!')`, hjulet animeras (tweena `{}`-proxy → kopiera till hjul-view om `!destroyed`), snäpper på, `audio.sfx('match')`, `_rebuildMesh()`. Upprepas tills kedjan når målet. Barnet behöver sedan bara veva (eller tappa veven) — och vevandet hissar alltid.

sfx som används: `pop, soft, match, reveal, tap, whoosh, celebrate, correct`. Voice: voiceIntro, 'Den greppar! Veva nu!', PRAISE.

## Progression & nivåer
- `this._level = Math.min(Math.max(1, (ctx.progress.get().highestLevel|0) || 1), 5)` vid init; vid varje `complete()` → `ctx.progress.setLevel(this._level + 1)` och `setCustom('rundor', n+1)`. Längre kedja = svårare. Oändlig lek (cyklar med jitter efter nivå 5).
- **Storleksmönster för kedjans hjul** (radier mellan vev=66 och mål=66; varje par grannar greppar då summan = avståndet):
  1. `[M]` — ett mellanhjul. Kort, lär ut greppet.
  2. `[M, L]` — två hjul, blandade storlekar (storlek börjar spela roll).
  3. `[L, M, L]` — tre hjul.
  4. `[M, L, S, M]` — fyra hjul + **1 lock-pinne (decoy)** bredvid (en extra tom pinne som INTE leder till målet → barnet väljer rätt väg). Hjul på decoy snurrar fritt, ingen påföljd.
  5. `[M, L, M, L, M]` — fem hjul + **2 decoy-pinnar**. Längsta kedjan.
  6+. Återanvänd mönster 3–5 med slumpad lodrät jitter (±6) och slumpad färgad sortering via `randomFrom`.
- **Pinn-generering (`_buildChainPegs(level)`):** marschera från `C=(230,360)`: för varje storlek i mönstret, nästa centrum = föregående centrum + `(r_prev + r_cur)` i riktning ~+x med liten sinus-y (amplitud 6). Lösningens pinnar = dessa centrum. Sätt `T` (målhjul) så `dist(sista hjul, T) = r_sista + 66`; rita flaggstång + karusell + Elvira relativt `T`. Lägg sedan ev. decoy-pinnar 110–150px från en lösningspinne men > MESH_TOL från att greppa något (så de garanterat inte råkar koppla). Hela layouten ska rymmas i x∈[180,1150], y∈[200,560]; nivå 5 (6 gap × ~140) landar `T.x≈1090` — inom panelen.
- Brickan (3 dispensrar S/M/L) är oändlig — barnet kan ta hur många hjul som helst; bara rätt storlek på rätt pinne greppar.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics`. Inga externa bild-/ljud-/fontfiler. Ljud via `ctx.services.audio.sfx`, röst via `ctx.services.voice.say`.
- Emoji: 🚩 (flagga), 🎠 (karusell), 👧 (Elvira), valfri ⚙️/✨ i firandet.
- **Kugghjul (`_makeGear(r, color)`):** en `Container` med (a) kropp `circle(0,0,r).fill(color).stroke({width:4, color: mörkare nyans})`; (b) **kuggar:** `n = Math.round(r/7)` små rundade rektanglar (`roundRect`, bredd ~r·0.34, höjd ~r·0.22, samma färg) jämnt utlagda runt omkretsen vid radie `r` (rotera var och en `i/n·2π`); (c) **glans:** en ljusare `circle(−r·0.25, −r·0.25, r·0.5).fill({color:white, alpha:0.18})`; (d) **nav:** `circle(0,0,r·0.32).fill(cream).stroke(...)` + 3–4 små "ekrar". Hela hjulet roteras som en enhet (kuggarna ritas en gång, vi roterar containern). Pivot i centrum (anchor via att rita runt 0,0).
- Vev = kugghjul (röd) + gult handtag (knopp). Målhjul = kugghjul (lila). Pinnar = små hål-cirklar. Spök-kugg = kugg-kontur i låg alpha (samma `_makeGear` men `alpha 0.3`, ingen fyllning / streckad känsla).
- Pegboard-panel, träbrickan, flaggstång = `Graphics`. Bakgrund = `createScene('warm')`.
- Firande via `feedback.bigCelebration` + `burst`/`sparkle`/`puff` i `ctx.fxLayer`.

## Återanvänd dessa
- `lib/scene.js`: `createScene('warm', {ground:false})` (bakgrund som FÖRSTA barn).
- `lib/DragController.js`: dra hjul → pinne, snäpp/snäpp-tillbaka, tap-tap-fallback (`addItem`/`addTarget`).
- `lib/feedback.js`: `bounceIn, pop, wiggle, puff, sparkle, burst, breathe, bigCelebration, floatText`.
- `lib/theme.js`: `COLORS, FONT, PLAYFUL, PRAISE`. `lib/swedish.js`: `randomFrom, shuffle`.
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast`.
- `ctx.progress`: `get, setLevel, complete, setCustom`. `ctx.ticker` (rotationsloop + idle/auto-hjälp-timers), `ctx.fxLayer` (firande), `gsap` (auto-veva, auto-hjälp-flyg, tweens).
- INTE matter.js / AimLauncher (ren geometrisk koppling räcker och är exakt).

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. ALLA `gsap.delayedCall`/`onComplete`/auto-hjälp-/auto-veva-callbacks och ticker-loopen tidig-returnerar vid `!this._alive`.
- **Resolving-skydd:** sätt `this._resolving = true` när flaggan nått toppen → ignorera nya placeringar/veving och stäng av flagg-ökning tills nästa nivå byggs → `complete()` triggas exakt EN gång (inget dubbeltryck startar två firanden).
- Exit-säkra partiklar: använd ENBART `lib/feedback.js`-hjälparna (alla `{}`-proxy/`if(!destroyed)`-skyddade). Auto-hjälp-flyget tweenar en `{}`-proxy och kopierar till hjul-view bara `if (!view.destroyed)`; `onComplete` förstör inget som redan är borta.
- `wrapAngle(d)`: håll vinkeldeltat i (−π, π] så vevandet inte hoppar vid ±π-passage.
- Snabbt upprepade placeringar: `_rebuildMesh()` är idempotent (bygger om grafen från grunden varje gång) → ingen läckande state.
- Upptagen pinne / dubbelplacering: säkerställ max ett hjul per pinne (ersätt gammalt, returnera det till brickan med `puff`).
- Idle-timer i ticker; nollställ vid varje pointer-interaktion (placering, vev, tap).
- `destroy(ctx)`: `this._alive = false`; `ctx.ticker.remove(this._tick)`; `this._drag?.destroy()`; avregistrera vev-pekarlyssnare (`pointerdown/globalpointermove/pointerup/upoutside`); `gsap.killTweensOf(...)` för veven, alla hjul-views, flaggan, karusellen, Elvira och alla aktiva auto-hjälp-tweens; döda `breathe`-tweens på spök-hint/dispensrar; `this._root?.destroy({children:true})`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/kugghjulen/index.js`, default-exportera GameModule med metadatan ovan. Importera `Container, Graphics, Text, Circle` från `pixi.js`, `gsap`, `DragController`, feedback-hjälpare, `createScene`, `COLORS, FONT, PLAYFUL, PRAISE`, `randomFrom`.
2. `init(ctx)`: `this._alive = true`; `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Lägg `createScene('warm',{ground:false})` FÖRST, sedan pegboard-panel, lager för pinnar, lager för hjul, lager för flaggstång/karusell/Elvira, sist brickan. Skapa `this._drag = new DragController({ space:this._root, services:ctx.services })`. Läs `this._level`. Anropa `_buildLevel(ctx, this._level)`.
3. `_buildLevel(ctx, level)`: rensa gammalt (hjul/pinnar/decoys, `_drag` items/targets, `gsap.killTweensOf`); `_buildChainPegs(level)` → pinnar (+ decoys), placera vev (fast) + målhjul (fast) + flaggstång + karusell + Elvira; nollställ `_crankAngle=0, _flagProgress=0, _prevTargetAngle=0, _resolving=false`; registrera pinnar som DragController-targets och dispensrar som drag-källor; kör `_rebuildMesh()` (ritar spök-hint på frontier).
4. `_makeGear(r, color)` enligt Tillgångar; `_makeCrank()` (röd + handtag, koppla vev-pekarlyssnare för drag-veva + tap-auto-veva); målhjul (lila).
5. `_rebuildMesh()`: bygg nodlista, kanter via `|dist−(rA+rB)|<14`, BFS från veven, sätt `driven/depth/factor`, `_chainComplete`, uppdatera glöd + frontier-spök-hint + auto-hjälp-räknare.
6. Drop-hook på pinne: placera/ersätt hjul, `audio.sfx('pop')`, `_rebuildMesh()`; om kedjan precis blev komplett → "greppar"-feedback.
7. Ticker: `this._tick = (t) => this._update(ctx, t)`, `ctx.ticker.add(this._tick)`. I `_update`: sätt drivna hjuls `rotation = _crankAngle*factor`, fria hjuls `freeSpin`, vinsch/flagg-progress (förlåtande absolut-delta), kolla `_flagProgress≥FULL` → `_onComplete`; idle- och auto-hjälp-timers.
8. `_onComplete(ctx)`: `_resolving=true`, firande (se Återkoppling), `ctx.progress.setLevel(this._level+1)`, `ctx.progress.setCustom('rundor', …)`, `ctx.progress.complete()`, `gsap.delayedCall(1.6, () => this._alive && _buildLevel(ctx, ++this._level))`.
9. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
10. `destroy(ctx)`: enligt "Edge-cases & städning".
11. Registrera i `src/games/registry.js`: `import kugghjulen from './kugghjulen/index.js'` + lägg `kugghjulen` i `GAMES`.
12. `npm run build` (0 fel), sedan `npm run dev`: dra hjul till pinnar, verifiera grepp/glöd, veva (drag + tap-auto), flagg-hiss, firande, tap-tap-fallback, spök-hint, auto-hjälp, hem-knapp, röst-repris, och att `highestLevel`/`rundor` kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera bibliotek → "Kugghjulen"; canvas finns, inga uncaught errors i `browser_console_messages`).
- `voiceIntro` är satt och en svensk röstinstruktion spelas vid mount.
- Att dra (eller tap-tap) ett **rätt storlek**-hjul till frontier-pinnen får hjulet att snäppa på plats och, när kedjan når målhjulet, markeras `_chainComplete=true` (testbart via exponerad teststate) + "greppar"-ljud/röst.
- Att placera **fel storlek** ger ingen påföljd: hjulet snurrar fritt (greppar ej), mjukt `soft`/`wiggle`, spök-hint pulsar — INGET felmeddelande, ingen omstart, ingen poängsänkning.
- Veva (drag runt veven ELLER tap → auto-veva) när kedjan är komplett ökar `_flagProgress` och hissar flaggan; vevning fram OCH tillbaka ökar progress (förlåtande spärr).
- När `_flagProgress ≥ FULL` körs firande (konfetti i fxLayer) och `ctx.progress.complete()` anropas exakt EN gång (inget dubbel-firande via `_resolving`-skydd vid snabba tryck).
- No-fail/auto-hjälp: efter idle-timern flyger ett korrekt hjul själv till frontier-pinnen och kedjan blir komplett utan barnets hjälp; inga "game over"-element finns.
- Efter avklarad nivå byggs en längre kedja (oändlig lek); `highestLevel` ökat och `custom.rundor` ökat — värden kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- `destroy` (hem-knapp mitt i veva/auto-hjälp-animation) lämnar inga kvarvarande tickers/tweens och inga konsolfel.
</content>
</invoke>
