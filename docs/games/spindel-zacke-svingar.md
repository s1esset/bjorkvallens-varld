# Spindel-Zacke Svingar (`spindel-zacke-svingar`)
> Spindel-Zacke hänger i ett nät och svingar som en pendel mellan hustaken — barnet trycker för att släppa i precis rätt stund och se honom flyga vidare i ett härligt båg-kast, alltid framåt mot kattungen, aldrig ett fall som gör ont.

## Metadata
| id | titleSv | icon | category | input | ageRange | bundle | voiceIntro |
|---|---|---|---|---|---|---|---|
| `spindel-zacke-svingar` | Spindel-Zacke Svingar | 🕸️ | fysik | tap | [3,5] | `spindel-zacke-svingar` | "Tryck för att släppa nätet — svinga till kattungen!" |

(titleSv har åäö; `icon` 🕸️; `category` = fysik → grön bricka via `CATEGORIES.fysik`.)

## Mål & mekanik
Spindel-Zacke (ett hjälte-barn, **Zacke**) hänger i ett spindelnät från ett **fäste** högt upp och svingar fram och tillbaka som en **pendel**. Målet är att svinga sig **över hustaken** från fäste till fäste och nå **kattungen 🐱** (och **Elvira** som väntar) längst till höger.

**Kärnloop (en enda enkel handling = tryck):**
1. Zacke pendlar i sitt nät kring det aktiva fästet. Bågen går fram (höger) och tillbaka (vänster).
2. Barnet **trycker var som helst på himlen** → Zacke **släpper nätet** och flyger iväg som en projektil med den fart och riktning han hade i släpp-ögonblicket. **Timingen styr kastet:** släpp när han svingar framåt-uppåt → långt, högt kast; släpp i botten → flackt; släpp för sent → kort. Fönstret är **förlåtande** (se Auto-hjälp).
3. När han når fram till **nästa fäste** skjuter ett nytt nät ut automatiskt, fäster, och han fortsätter pendla där. Gnistor + "swisch".
4. Upprepa fäste för fäste tills han når **mål-fästet** vid kattungen → firande → `ctx.progress.complete()` → nästa (svårare) bana byggs.

**Andra kontrollen — nät-längd.** En stor knapp växlar nätet mellan **kort** (radie 170) och **långt** (radie 260). Längden ändrar **pendelns period och räckvidd**: långt nät = långsammare, större båge, når längre fäste-glapp men kräver tålamod; kort nät = snabbt, pigga små kast. Barnet trimmar utfallet med längden + släpp-timingen → **≥2 kontroller som tydligt ändrar resultatet**.

**Aldrig fel / faller ALDRIG.** Om ett kast blir för kort (Zacke hinner sjunka under taklinjen innan han nått nästa fäste) glider ett **mjukt moln ☁️** in underifrån, fångar honom mjukt (fniss), och lyfter tillbaka honom till **närmaste fäste** där han börjar pendla igen med fin amplitud. Inget "game over", ingen omstart, ingen poäng som sjunker — bara ett skratt och ett nytt försök. Mjuk auto-hjälp (auto-släpp vid idle + generöst fäst-fönster) **garanterar** att han till slut når kattungen.

## Skärm-layout (1280x720)
GameHost ritar header (hem-/repetera-knapp) överst — rita **inga** egna sådana. Allt spelinnehåll ligger i spelets `this._root` (designkoordinater, redan letterbox-skalat av `ctx.stage`).

Lager-ordning i `_root` (bakifrån och fram):
- **Bakgrund (FÖRSTA barn):** `createScene('sky', { width: ctx.width, height: ctx.height })` (mjuk blå gradient-himmel + sol + drivande moln). `eventMode='none'`. Höjer känslan direkt.
- **Hustaks-siluett (`this._roofs`, Graphics, dekorativ):** en rad hus längs nederkanten. Taklinje (catch-golv) vid **y = 520**. Rita 5–7 hus som `roundRect`/trianglar i dämpade färger (`COLORS.brown 0x8a5a3b` väggar, `COLORS.red 0xff6b6b` / `COLORS.teal 0x57c8c3` tak), någon skorsten, fönster (gula `roundRect`). Husen fyller y≈520→720. `eventMode='none'`.
- **Trycky-yta (`this._sky`, Graphics, osynlig hit-rektangel):** `rect(0, 90, 1280, 430).fill({color:0xffffff, alpha:0.001})`, `eventMode='static'`. Täcker hela svingnings-rymden så **hela övre skärmen** är en gigantisk träffyta för släpp-trycket (inga små knappar att pricka).
- **Fästen (`this._anchorLayer`, Container):** varje fäste = liten knopp vid y≈180–230: `circle(0,0,16).fill(COLORS.inkSoft).stroke({width:4,color:COLORS.white})` + en pytte-🕸️ (Text fontSize 30) ovanpå. Dekorativa (`eventMode='none'`); fäst-fångst sker logiskt via avstånd, inte tryck. Mål-fästet (sista) bär **🐱** (Text fontSize 96) sittande ovanpå taket strax under, och **Elvira** (programmatisk figur, se Tillgångar) vinkar bredvid.
- **Nät-grafik (`this._web`, Graphics):** ritas om varje tick — en vit lina (`stroke({width:6, color:0xffffff, alpha:0.9})`) från aktivt fäste till Zacke, med en lätt zig-zag (3 mellanpunkter) för "spindeltråd"-känsla. Ligger under Zacke.
- **Zacke (`this._zacke`, Container):** hjälte-figur ~70px (programmatisk, se Tillgångar), `anchor`/pivot centrerad. Hänger i nätets nedre ände. Liten mjuk skugg-ellips ritas EJ (han är i luften) — istället en svag glød-ring runt honom.
- **Nät-längd-knapp (`this._lenBtn`):** nere till **vänster**, center (130, 650), en `lib/Button.js`-knapp ~140×120 (träffyta ≫96px + inbyggd hit-halo) med 📏-emoji och text "Kort"/"Lång" som växlar. Tryck → byt `this._ropeLen`, mjuk `pop` + `audio.sfx('flip')`.
- **fxLayer:** `ctx.fxLayer` används för konfetti/gnistor/moln ovanpå allt.

Marginaler: alla fästen ligger inom x ∈ [200, 1120], y ∈ [180, 240]; granne-glapp 280–360px (nivåberoende). Mål-fästet längst till höger. Allt med fri båge-väg så ett välmtimat kast alltid kan nå nästa fäste.

## Interaktion
Detta spel använder **INTE** `DragController` (ingen dra-till-mål-gest). Endast **enkla tryck**, byggda på plattformens primitiver:

- **Släpp-tryck (kärnan):** `this._sky.on('pointertap', () => this._release())`. Om Zacke pendlar (`state==='swing'`) → släpp nätet nu. Om han redan flyger (`state==='flight'`) eller firande pågår (`_resolving`) → tryck ignoreras mjukt (valfri liten `sparkle` där fingret är, aldrig straff). Reaktion < 100ms: `audio.sfx('whoosh')` + nätet "snäpper" bort (kort `_web`-fade) + Zacke får sin projektil-hastighet.
- **Nät-längd-knapp:** `this._lenBtn` via `lib/Button.js` (`pointertap`) → växla `this._ropeLen` mellan `SHORT=170` och `LONG=260`, uppdatera etikett, `pop(this._lenBtn)`, `audio.sfx('flip')`, `voice.say('Långt nät!' / 'Kort nät!')`. Vid pendling justeras nätet mjukt (lerp `L` mot `_ropeLen` över ~0.4s) så bytet känns levande utan att rycka.
- **Tap-tap-vänligt:** eftersom hela himlen är en träffyta och knappen är stor finns inget precisionskrav — vilket tryck som helst på himlen släpper. Det är den enklaste tänkbara gesten för 3-åringar.
- **Idle-vink (~6s utan tryck):** mjuk om-cue: `voice.replayLast()` (eller `voice.say(this.voiceIntro)`) + `pop`/`breathe` på Zacke + en `floatText(fxLayer, zacke.x, zacke.y-60, '👆')`. Om idle fortsätter ytterligare ~2s **auto-släpper** spelet vid nästa optimala stund (toppen av framåt-bågen) så barnet ändå ser framsteg.
- Allt tryck-läge skyddat av `if (!this._alive || this._resolving) return`.

## Fysik & kalibrering
**Egen pendel-/projektil-integrator** (ticker-driven, **inga GSAP-tweens på fysik-objekt**). Vald framför matter.js-constraint för att timing-fönstret och no-fail-garantin ska vara exakt styrbara; den är **kalibrerad av konstruktion** (samma `g` i pendel och projektil → ingen pricklinje att synka). `lib/physics.js` behövs alltså inte här (men `Matter.Constraint` är ett giltigt alternativ om man hellre vill — då länka kropp→Zacke och applicera samma no-fail-fångst).

Arbeta i **px per frame** med `const dt = Math.min(ticker.deltaMS/16.67, 2)` (klampa flikbyte). Konstanter:
- `G = 0.35` (px/frame², gemensam gravitation för pendel och projektil → konsekvent känsla).
- `SHORT = 170`, `LONG = 260` (nät-radie). Pendelperiod ≈ `2π·√(L/G)` frames → ≈ 2.2 s (kort) / 2.7 s (lång) vid 60 fps. Längre nät = lugnare, längre svep.
- `roofY = 520` (fångst-golv), `anchorY ≈ 200`.

**Pendel-läge (`state==='swing'`):** tillstånd `theta` (rad från lodrät nedåt) och `omega` (rad/frame). Per tick:
```
alpha = -(G / L) * Math.sin(theta)      // vinkelacceleration
omega += alpha * dt
omega *= 0.999                           // pyttenliten dämpning (ej nödvändig, mjukar av)
theta += omega * dt
zacke.x = anchor.x + L * Math.sin(theta) // nedåt-vinkel: x = +L sinθ
zacke.y = anchor.y + L * Math.cos(theta) // y = +L cosθ (nedåt positivt)
zacke.rotation = theta * 0.5             // luta kroppen lite i färdriktningen
```
Säkerställ alltid **tillräcklig amplitud** så han kan nå framåt: när han fäster vid ett nytt fäste, ge `omega` ett litet golv så han garanterat svingar förbi ~35–45° framåt (annars stillastående). `L` lerpas mot `this._ropeLen` (`L += (ropeLen - L) * 0.12`).

**Släpp → projektil (`_release()`):** tangentiell fart `vt = omega * L` (px/frame). Tangentriktningen (mot ökande θ) = `(cosθ, -sinθ)`:
```
this.vx = vt * Math.cos(theta)
this.vy = vt * -Math.sin(theta)
state = 'flight'
```
**Projektil-läge (`state==='flight'`):** per tick:
```
this.vy += G * dt
zacke.x += this.vx * dt
zacke.y += this.vy * dt
zacke.rotation += 0.04 * dt              // liten frisk rotation i flykten
```
Nätet (`this._web`) göms i flykten (eller ritas bara som en liten "avskjuten" stump som tonar).

**Fäst-fångst (förlåtande fönster):** låt `next = anchors[a+1]`. Fäst när Zacke nått fram horisontellt utan att ha sjunkit för lågt:
```
if (zacke.x >= next.x - 30 && zacke.y < roofY - 30) → _attach(a+1)
```
`_attach(i)`: sätt `anchor = anchors[i]`, `a = i`. Beräkna ny pendel ur nuvarande läge + fart:
```
dx = zacke.x - anchor.x;  dy = zacke.y - anchor.y
theta = Math.atan2(dx, dy)                       // från lodrät nedåt
L = Math.hypot(dx, dy)                            // snäpps sen mjukt mot ropeLen
omega = (this.vx*Math.cos(theta) - this.vy*Math.sin(theta)) / L   // tangentiell → vinkelfart
state = 'swing'
```
Ge `omega` ett framåt-golv (t.ex. `omega = Math.max(omega, 0.012)`). `audio.sfx('reveal')` + `sparkle(fxLayer, anchor.x, anchor.y)` + `floatText(fxLayer, zacke.x, zacke.y-70, randomFrom(['Wii!','Hihi!','Sväva!']))`.

**No-fail moln-fångst:** om Zacke i flykt sjunker till `zacke.y > roofY` **innan** fäst-fångst skett → `_cloudRescue()`: skapa ☁️ (`floatText`/egen Text) under honom, glid honom (proxy-tween, se städning) mjukt upp till **närmaste fäste framför eller där han var**, `audio.sfx('soft')`, `voice.say('Hoppsan! Molnet fångar dig.')`, fniss-`floatText('😄')`, sätt sedan `_attach(nearestIndex)` med fin startamplitud. Han **förlorar aldrig** progress (placeras på det fäste han senast klarade, inte tillbaka till start).

## Återkoppling & belöning
Varje handling ger ljud+bild < 100ms, **endast positivt**:
- **Släpp-tryck:** `audio.sfx('whoosh')` + nät snäpper bort + liten `sparkle` vid fästet.
- **Nät fäster vid nästa fäste:** `audio.sfx('reveal')` (var 2:a gång `'pop'`) + `sparkle` + glad `floatText` (Wii/Hihi). Första lyckade svinget: `voice.say('Bra svingat!')`.
- **Nät-längd-knapp:** `audio.sfx('flip')` + `pop(lenBtn)` + kort röst ("Långt nät!"/"Kort nät!").
- **Moln-fångst (miss):** `audio.sfx('soft')` + fniss-emoji + mjuk röst — **aldrig** buzzer, rött kryss eller omstart. Missen är **rolig**.
- **Mål nått (kattungen):** Zacke landar vid 🐱 → `audio.sfx('correct')` direkt + `audio.sfx('celebrate')`, kattungen hoppar/`pop`, Elvira vinkar (`wiggle`), `voice.say(randomFrom(PRAISE))` + "Du räddade kattungen!", `bigCelebration(ctx.fxLayer, {width:ctx.width, height:ctx.height})` + `burst(fxLayer, zacke.x, zacke.y)`. Sedan `ctx.progress.complete()`.
- **Idle-vink:** mjuk `breathe`/`pop` på Zacke + 👆-`floatText` + röst-repris.

Använda sfx-nycklar: `whoosh, reveal, pop, flip, soft, correct, celebrate`. Voice: `voiceIntro`, 'Bra svingat!', 'Långt nät!', 'Kort nät!', 'Hoppsan! Molnet fångar dig.', 'Du räddade kattungen!', samt `PRAISE`.

## Progression & nivåer
- `this._level = Math.max(0, ctx.progress.get().highestLevel | 0)` i `init`; styr **antal fästen, glapp-bredd och höjdvariation**.
- Banor (cykliska → oändlig lek), `_buildLevel(ctx, level)`:
  - **Nivå 0–1:** 3 fästen, jämna glapp ~300px, samma höjd (y=200). Mål-kattungen vid fäste 3. Lär ut släpp-timingen.
  - **Nivå 2–3:** 4 fästen, glapp ~330px, lätt höjdvariation (±25px).
  - **Nivå 4–5:** 5 fästen, glapp ~350px, fästen i sicksack-höjd (180/230), mål högre upp.
  - **Nivå 6+:** 6 fästen, glapp upp till 360px, mer höjdskillnad. Därefter upprepas mönstren med liten slump-jitter (±20px via `randomFrom`/`Math.random`).
- "Klart" = Zacke fäster vid / landar på **mål-fästet** → firande → `ctx.progress.setLevel(this._level + 1)` + `ctx.progress.complete()` (delat firande + klistermärke). Efter ~1.6s (`gsap.delayedCall`, vakta `_alive`) → `_buildLevel(ctx, ++this._level)` (oändligt, lite svårare). `setCustom('svingar', n+1)` kan räkna totala mål (frivilligt, aldrig sjunkande).
- Ingen synlig poäng, ingen timer, ingen förlust.

## Tillgångar (programmatiskt)
Endast emoji (`Text`) + Pixi `Graphics` + `lib/scene.js`. **Inga externa bild-/ljud-/fontfiler.**
- **Bakgrund:** `createScene('sky', …)`.
- **Hustak:** `Graphics` — `roundRect` väggar (`COLORS.brown`), triangel/`roundRect` tak (`COLORS.red`/`COLORS.teal`), gula fönster, skorsten.
- **Fästen:** små `circle`-knoppar + 🕸️-emoji (`Text` 30).
- **Zacke (Spindel-Zacke, hjälte-barn — programmatisk):** Container: huvud `circle(0,0,22).fill(0xffe0bd)` (hudton), enkel **röd domino-mask** (`roundRect`/två `circle` i `COLORS.red` med vita ögon-prickar), kropp `roundRect` i `COLORS.blue`/`COLORS.red` (hjälte-dräkt), små armar/ben (`roundRect`). Svag glöd-ring `circle(0,0,40).stroke({color:0xffffff,alpha:0.25,width:4})`. Pivot i mitten så `rotation` ser naturlig ut. (Heter **Zacke** — avbildad människa, enligt CHARACTERS.)
- **Elvira (vid målet — programmatisk):** liknande liten figur (huvud + klänning i `COLORS.pink`/`COLORS.purple`, hårtofs) som vinkar. (Heter **Elvira**.)
- **Kattunge:** 🐱 (`Text` 96). **Moln:** ☁️ (`Text` ~110) i no-fail-fångst.
- **Nät:** `Graphics`-lina (vit, zig-zag) ritad varje tick.
- **Firande:** `bigCelebration` + `burst`/`sparkle` (konfetti i `ctx.fxLayer`).

## Återanvänd dessa
- `lib/scene.js`: `createScene('sky', …)` — bakgrund som FÖRSTA barn.
- `lib/feedback.js`: `pop`, `wiggle`, `breathe`, `sparkle`, `burst`, `floatText`, `bigCelebration` (alla exit-säkra).
- `lib/Button.js`: nät-längd-knappen (stor träffyta + hit-halo + ljud/studs inbyggt).
- `lib/theme.js`: `COLORS`, `PLAYFUL`, `FONT`, `PRAISE`, `DESIGN_W/H`.
- `lib/swedish.js`: `randomFrom`, `shuffle` (bana-/röstvariation, jitter).
- `ctx.services.audio.sfx(...)`, `ctx.services.voice.say/replayLast/cancel`.
- `ctx.progress`: `get`, `setLevel`, `complete`, `setCustom`.
- `ctx.ticker` (egen pendel/projektil-loop, läs `deltaMS`), `ctx.fxLayer` (firande/moln), `gsap` (UI-tweens & proxy-tweens — ALDRIG direkt på fysik-styrda objekt).
- **INTE** `DragController` (endast tryck). `lib/physics.js`/`launcher.js` behövs ej (egen kalibrerad integrator); `Matter.Constraint` är ett valfritt alternativ.

## Edge-cases & städning
- `this._alive = true` i `init`, `false` i `destroy`. Alla `gsap.delayedCall`/`onComplete`/auto-släpp-callbacks samt ticker-loopen tidig-returnerar vid `!this._alive`.
- **`_resolving`-skydd:** sätt `this._resolving = true` när mål-fästet nås → ignorera nya tryck och frys fysik-progress tills nästa bana byggs → `complete()` kan **aldrig** triggas dubbelt (även vid snabba dubbeltryck).
- **Exit-säkra partiklar/moln:** använd `lib/feedback.js`-hjälparna (redan exit-säkra). Moln-glidet och varje egen rörelse som kan dödas av exit ska tweena en `{}`-proxy och kopiera till Pixi-objektet **endast** `if (!obj.destroyed)`, med `onComplete: () => { if (!obj.destroyed) obj.destroy() }`. **Aldrig** `gsap.to(pixiObj, …)` direkt på något som kan förstöras av sin egen `onComplete` eller av spel-exit.
- Klampa `dt` (`Math.min(deltaMS/16.67, 2)`) så ett flikbyte inte slungar Zacke utanför banan i ett steg.
- Håll Zacke inom rimliga gränser i flykt: om `zacke.x > 1240` utan fäste (översköt) → behandla som moln-fångst (placera på sista nådda fästet) — han lämnar aldrig skärmen.
- Idle-timer (`this._idle` ackumuleras i ticker, nollställs vid varje tryck/knapp) styr om-cue + auto-släpp.
- `destroy(ctx)`: `this._alive = false`; `ctx.ticker.remove(this._tick)`; `this._sky.off('pointertap')` + avregistrera knapp-lyssnare; `gsap.killTweensOf(this._zacke)`, `killTweensOf(this._zacke.scale)`, `killTweensOf(this._lenBtn?.scale)`, döda ev. `_breathe`-tween; `this._root?.destroy({ children: true })`.

## Steg-för-steg bygginstruktion
1. Skapa `src/games/spindel-zacke-svingar/index.js`. Importera `Container, Graphics, Text` från `pixi.js`, `gsap`, `createScene` från `lib/scene.js`, feedback-hjälpare, `Button` från `lib/Button.js`, `COLORS, PLAYFUL, FONT, PRAISE` från `lib/theme.js`, `randomFrom` från `lib/swedish.js`.
2. Default-exportera GameModule med metadatan i tabellen ovan.
3. `init(ctx)`: `this._alive = true`; `this._root = new Container()`, `ctx.stage.addChild(this._root)`. Lägg `createScene('sky', {width:ctx.width, height:ctx.height})` som FÖRSTA barn. Bygg `_roofs`, `_anchorLayer`, `_web` (Graphics), `_zacke` (hjälte-Container), `_sky` (osynlig hit-rektangel `eventMode='static'`), och `_lenBtn` (Button). Läs `this._level`; sätt `this._ropeLen = SHORT`. Koppla `_sky.on('pointertap', …→ _release())` och knapp-tap (växla längd). Anropa `_buildLevel(ctx, this._level)`.
4. `_buildLevel(ctx, level)`: rensa gamla fästen/mål; generera `this._anchors` (array `{x,y}`) + mål-fäste med 🐱/Elvira enligt Progression; sätt `this._a = 0`, fäst Zacke vid fäste 0 (`state='swing'`, lagom `theta≈-0.5`, `omega≈0.02`), `this._resolving = false`, `this._idle = 0`; `bounceIn` på fästen/Zacke.
5. Skriv `_release()` (swing→flight, beräkna `vx,vy`, ljud/gnista), `_attach(i)` (flight→swing, ny `theta/omega/L`, golv på `omega`, ljud/gnista/floatText), `_cloudRescue()` (no-fail moln → närmaste fäste), och `_reachGoal(ctx)` (`_resolving=true`, firande, `setLevel`, `complete()`, `gsap.delayedCall(1.6, ()=> _alive && _buildLevel(ctx, ++this._level))`).
6. `this._tick = (t) => this._update(ctx, t)`, `ctx.ticker.add(this._tick)`. I `_update`: `dt`-klamp; om `swing` → pendel-integration + lerpa `L` mot `ropeLen`; om `flight` → projektil-integration + fäst-fångst-koll + roofY-miss→`_cloudRescue` + mål-fäste→`_reachGoal`; rita om `_web`; idle-timer (om-cue/auto-släpp). Allt bakom `if(!this._alive||this._resolving) return` där relevant.
7. `mount(ctx)`: `ctx.services.voice.say(this.voiceIntro)`.
8. `destroy(ctx)`: enligt "Edge-cases & städning".
9. Registrera i `src/games/registry.js`: `import spindelZackeSvingar from './spindel-zacke-svingar/index.js'` och lägg i `GAMES`.
10. `npm run build` (0 fel), sedan `npm run dev`: öppna biblioteket, spela — verifiera pendel-sving, släpp-kast, nät-fäste vid nästa, nät-längd-knappen ändrar bågen, moln-fångst vid kort kast, mål-firande, hem-knapp, röst-repris, och att `highestLevel` ökar och kvarstår efter omladdning.

## Acceptanskriterier (Playwright-test)
- Spelet monteras och renderar utan konsolfel (navigera till biblioteket → välj "Spindel-Zacke Svingar"; canvas finns; inga uncaught errors i `browser_console_messages`).
- Vid mount är `voiceIntro` satt/spelas ("Tryck för att släppa nätet — svinga till kattungen!").
- **Pendel rör sig:** utan input ändras Zackes x/y över tid (pendelsving) — verifierbart via exponerat teststate (`window.__barnspel`) eller skärmdumps-skillnad.
- **Släpp-tryck fungerar:** ett `pointertap` på himlen (övre skärmen) växlar `state` från `swing` till `flight` och Zacke flyger framåt (x ökar) — sedan fäster ett nytt nät (`state` tillbaka till `swing`, `_a` ökat).
- **Andra kontrollen påverkar:** tryck på nät-längd-knappen växlar `_ropeLen` mellan kort/lång (verifierbart via state) och bågens storlek ändras.
- **No-fail:** ett medvetet dåligt/kort kast leder ALDRIG till felljud/buzzer/omstart; moln-fångsten placerar Zacke på närmaste fäste och leken fortsätter; `_a` minskar aldrig under senast nådda fäste.
- **Mål → firande:** när Zacke når mål-fästet triggas konfetti i `fxLayer` och `progress.complete()` anropas **exakt en gång** (ingen dubbeltrigg vid snabba upprepade tryck under `_resolving`).
- **Ingen fail-state:** inga "game over"-element; Zacke lämnar aldrig skärmen (position hålls inom banan även efter överskjutning).
- **Progress sparas:** efter en avklarad bana är `highestLevel` ökat och kvarstår efter sidladdning (localStorage `pwagames.save.v1`).
- **Städning:** vid retur till biblioteket (hem-knapp) tas ticker-loopen och alla tweens bort; inga tweens/timeouts fortsätter logga eller kasta fel efter exit mitt i en sving/flykt.
