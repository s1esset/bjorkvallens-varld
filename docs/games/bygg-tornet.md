# Bygg Tornet (`bygg-tornet`)
> 🧱 fysik · tap · 3–5 år · status: ✅ marknadsklar

## 1. Nuläge (sett som spelare)

En glad himmel med sol och moln. Längst upp åker en kran-tralla på en räls och håller en
färgglad LEGO-aktig kloss i en lina; nere på gräset lyser en pulserande spök-markör DÄR
nästa kloss helst ska landa, och en 🚩-flagga vid mål-höjden visar hur högt jag ska bygga.
Jag trycker var som helst → klossen flyttas till fingret och faller RAKT NER där med riktig
matter.js-fysik. Den landar, lutar och vajar, och får sätta sig. **Fysiken avgör vinsten:**
vilade klossen på stapeln (inom dx/dy/vinkel-tolerans) snäpps den fast (statisk) med
'pling' + gnistor + räkneord ("ett, två, tre…"); tippade den av är det ALDRIG ett fall —
den puffar bort glatt och jag får en ny.

Efter 2 missar på samma våning lägger kranen nästa kloss prydligt på plats själv
("Jag hjälper till!") med en svag centrerings-magnet på fallande klossar, så tornet ALLTID
når flaggan. Mål nått (4–7 klossar) → flaggan hoppar, bigCelebration, "Hurra! Vilket högt
torn!", complete + ny högre runda. Mjuk "klack" vid landning (strypt). Idle ~6s → recue.

**Funkar bra:** klossarna är chunky och fina (rundade, studs-cirklar, skuggrad), fysik-
vajet känns äkta, "tryck var som helst → faller där" är intuitivt, spök-markör + flagga gör
målet tydligt utan läsning, no-fail-trappan (puff → magnet → auto-place) är robust.

*(Skärmdump: kran med orange kloss upptill, gul spök-markör nere vid marken, flagga vid mål.)*

## 2. Ursprunglig plan & tankeprocess

Ett bygg-/fysikspel där FYSIKEN — inte en snäpp-zon — avgör om tornet står: klossar som
verkligen vilar på varandra räknas. Designintentionen (kodhuvudet) är att en kloss som
tippar av aldrig blir ett "fall", bara en glad puff och en ny, och att auto-hjälpen
garanterar att flaggan alltid nås. Räkneorden gör stapeln till en mjuk siffer-övning, och
"tryck var som helst" sänker motorik-kravet för 3-åringar.

## 3. Vad gör det lättjefullt / tunt

- **Auto-hjälpen spelar tornet åt en.** Efter 2 missar lägger kranen klossen perfekt själv,
  och en växande "magnet" drar fallande klossar mot stödpunkten. Ett barn som bara trycker
  random får tornet byggt åt sig — agensen urholkas och utmaningen försvinner.
- **Spök-markören gör valet trivialt.** Den lyser exakt där klossen ska hamna, så "var ska
  jag trycka?" är redan besvarat; det blir att-prick-träffa snarare än att-bedöma-balans.
- **Tornet är abstrakt och tomt.** Färgade rektanglar på en bar gräsremsa. Ingen bor i
  tornet, inget ska UPP dit (ingen katt att rädda, ingen fågel på toppen), ingen figur
  reagerar när det växer. Scenen är tapet + mekanik.
- **Inget visas av vad man bygger.** Det är "en stapel klossar", aldrig ett hus, ett torn
  med fönster, en pepparkaksstapel — ingen form/berättelse växer fram.
- **Ljudet är UI-blipp.** 'pling'/'pop'/'tap'/'whoosh' — ingen tyngd-känsla, ingen träklack,
  ingen stigande ton ju högre tornet blir.
- **Generisk belöning.** Samma bigCelebration + stjärna; tornet rivs direkt och nästa börjar
  — inget sparas, ingen "stad" av byggda torn att återse.
- **Klossarna ser likadana ut.** Olika `PLAYFUL`-färg men identisk form/storlek hela vägen —
  ingen variation i vad man staplar.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- ✅ ~~**[Medium] Dämpa auto-magneten.**~~ Redan byggd (magneten först vid misses≥2 :604,
  kranens hjälp vid ≥3 :402, egen träff firas mer) — uppdagat 2026-09-23.
- ✅ ~~**[Quick] Markör som vägledning, inte facit.**~~ Redan byggd (bred trygg zon
  1,7 × ACCEPT_DX i `_moveGhost` :454) — uppdagat 2026-09-23.

### Variation & överraskning
- ✅ ~~**[Quick] Varierade klossar.**~~ Redan byggd (`SPECS` kloss/planka/smal/tunna :60) —
  uppdagat 2026-09-23.
- ✅ ~~**[Medium] Topp-belöning.**~~ Redan byggd (kattungen på flaggans avsats,
  `_rescueKitten` :504) — uppdagat 2026-09-23.

### Juice
- ✅ ~~**[Quick] Tyngd-ljud.**~~ Redan byggd som stämda toner: låg duns + en pentatonisk ton
  per våning i `_lockActive` (:366–367) — uppdagat 2026-09-23. Ett inspelat träklack-klipp
  kräver SFX-pipelinen (MOSS nere) och behövs inte för poängen.
- ✅ ~~**[Quick] Vaj-juice.**~~ Klar 2026-09-23 (v1.251.0): dammpuffen och `pop` fanns redan.
  Nu skakar `_root` när en tung kloss sätter sig: vanlig kloss 1,5 px, planka 4 px (:373).
  Smal och tunna skakar inte.

### Progression
- ✅ ~~**[Medium] Bestående bygge.**~~ Redan byggd (skyline `custom.torn`, `_drawSkyline`
  :694) — uppdagat 2026-09-23.
- **[Quick] Tema per runda.** Klossfärg/bakgrund byter mjukt (dag → kväll, stad → slott) så
  varje torn känns som en ny plats.

### Karaktär & berättelse
- ✅ ~~**[Deep] Någon som bor/klättrar.**~~ Redan byggd: kattungen räddas via tornet och
  byggaren Bobo hejar (2026-08-04) — uppdagat 2026-09-23.

### Ljud
- **[Quick] Kran-ambient** (mjukt gnissel/motor) medan klossen bärs + varierat berömsting.

## 5. Status / loggar

- 2026-09-23 ✅ **Snabbvinster + dubbelfirandet** (v1.251.0): När kattungen landade, 1,8–2,7 s
  efter `complete()`, kom ett andra `celebrate` + `bigCelebration`. Det låg utanför värdets
  1,5 s-spärr, så barnet fick dubbelt firande. Nu blir det en kort stämd durtreklang (C–E–G–C)
  ovanpå katt-samplet och det lokala glittret. "Tack för hjälpen!" kapade "Hurra! Nu kan
  kattungen komma ner!" (3,5 s) och köas nu med `ctx.narTyst`. Snabbvinst: mikroskak för tunga
  klossar. Öppna [Quick] kvar: tema per runda och kran-ambient.
- 2026-08-10 🎨 **D1 (delat mönster): marken fick ljus från horisonten** (`b3cde53`, v1.119.0).
  Gruset låg på **94 613 px i EN ton** (`_plattprobe --medbakgrund`) — spelets största fält.
  Fyndet togs inte som ett engångsfall: `#8a5a3b` (`COLORS.brown`) var största fältet i TRE
  av D1-nivåns kvarvarande spel och näst största i ett fjärde, alltid samma konstruktion —
  en stor vågrät yta ritad som en platt rect. Mönstret fanns dessutom redan handskrivet på
  åtta ställen i repot. Det blev därför `groundFill()` i `lib/form.js`: ljuset kommer från
  horisonten, så marken är ljusast vid gräskanten och mörknar mot betraktaren.
  **MÄTT** (största enskilda fältet, bakgrunden medräknad): **94 613 → 18 796 px**, och brunt
  är helt ute ur topp-3.

- 2026-06-30: Doc skriven (granskning + plan), ersätter gammal build-spec. Inga kodändringar.
  Spelet testat (errorCount 0; kran + kloss + spök-markör + flagga renderar korrekt).
- Rekommenderad första-omgång: **[Quick] varierade klossar + tyngd-ljud + bredare (icke-facit)
  markör** — återinför lite bedömning och taktil tyngd för minst risk.
- 2026-07-01 🔧 **Mönster #1 (auto-hjälp) mjukad:** centrerings-magneten träder in senare
  (från misses≥2, inte ≥1) och svagare (0.0006·(m−1)); kranens auto-placering först vid
  misses≥3 (inte ≥2) → barnet får sikta helt själv de två första försöken. Barnets egen träff
  firas nu tydligt mer än en hjälpt (12 vs 5–7 gnistor; ren förstaträff = extra). errorCount 0.
- 2026-08-04: **Andra omgången** (errorCount 0) — bygget fick ett syfte, en plats och en tyngd.
  - **Kattungen som ska räddas** (§4 [Deep]/[Medium]): en ritad kattunge sitter på flaggans
    avsats vid mål-höjden. När tornet når upp **hoppar den över till toppen, klättrar ner
    våning för våning och landar hos Bobo** med riktigt kattläte (`sample('djur_katt')`).
    Det är spelets egen slutscen — inte generisk konfetti — och ger bygget en anledning.
  - **Byggaren Bobo** står vid foten med hjälm, hejar med armarna vid varje våning och
    jublar extra vid räddningen. Gate-punkt 4 (mottagare) + 5 (karaktär).
  - **Bestående stad** (§4 [Medium]): varje färdigt torn lägger till en siluett i
    horisontens skyline (`custom.torn`, tak 14) — man river inte bara sitt bygge längre,
    man bygger en stad som växer över omgångar.
  - **Varierade klossar** (§4 [Quick]): `SPECS` ger fyra typer — vanlig kloss, bred **planka**
    (250 px, träådring), **smal** (140 px) och en **trätunna** med lägre friktion som kan glida
    en aning. Balansen blir ett riktigt val; höjden är konstant så toleranserna är oförändrade.
  - **Tyngd-ljud + hörbar höjd** (§4 [Quick]): en låg duns vid varje landning plus en ton per
    våning som klättrar uppför en pentatonik — man hör hur högt tornet är. Dammpuff när
    klossen sätter sig.
  - **Markören är vägledning, inte facit** (§4 [Quick]): spökrutan visar nu den **breda trygga
    zonen** (1,7 × ACCEPT_DX) i stället för en exakt klossruta.
  - **Byggarbetsplats** i stället för tom brun platta: grus, gräskant, gul-svart avspärrning
    och en verktygslåda. Mål-flaggan är **ritad** (P0 ASSETS) i stället för 🚩-emoji.
  - **Bugg:** alla tre `gsap.delayedCall` → `ctx.later()`. Hjälmen ritades först som en `arc()`
    i samma Graphics som ansiktet — fyllningen drog en kil från förra punkten och täckte hela
    ansiktet; hjälmen ligger nu i en egen Graphics.
- 2026-08-07: **Fix — klossarna försvann i tomma intet** (diagnostikloggen: `nan-kropp ×5`
  + `nan-transform ×6` per körning, helt utan konsolfel). Grundorsaken låg i det delade
  biblioteket: en matter-kropp som **skapas** med `{ isStatic: true }` i sina options får
  flaggan satt som en vanlig egenskap — `Body.setStatic()` körs aldrig, så `_original`
  (massa · tröghet · densitet) fångas ALDRIG. När klossen sedan släpps
  (`Body.setStatic(kropp, false)`) finns inget att återställa: den blir dynamisk med massa
  och tröghet kvar på `Infinity`, och första simsteget räknar `Infinity/Infinity` = NaN.
  Klossen teleporterades till NaN, dess Pixi-vy följde med, och `_settleActive` jämförde
  NaN mot tröskeln → varje kloss "missade" → tornet kunde aldrig växa.
  `PhysicsWorld.rectangle/circle/polygon` skapar nu alltid kroppen dynamisk och sätter
  `isStatic` **efteråt**, så en kropp alltid går att väcka. Mätt med `scripts/_nanprobe.mjs`
  (spelar spelet och läser spelets egna fält varje 100 ms): NaN vid första trycket före
  fixen, inget efter. Hela repot: 0 fel-nivåfynd i `test:all`.
