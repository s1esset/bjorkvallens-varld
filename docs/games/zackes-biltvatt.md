# Zackes Biltvätt (`zackes-biltvatt`)

> roligt · mixed · 2–5 år · ✅
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

## 0. Spec

| | |
|---|---|
| **id** | `zackes-biltvatt` |
| **titleSv** | Zackes Biltvätt |
| **icon** | 🚗 |
| **kategori** | `roligt` → flik 🎉 Roligt |
| **input** | `mixed` (drag med svamp/slang + tap-tap-fallback + tryck på fåglar) |
| **ålder** | [2, 5] |
| **kärnloop** | En smutsig bil rullar in. **Två faser, båda verktygen krävs:** barnet drar **svampen** fram och tillbaka över en fläck tills smutsen lossnat till **skum** — sedan drar det i **munstycket** på den riktiga slangen och **spolar bort löddret**. Först då är ytan ren. `smuts/bajs --svamp--> skum --slang--> ren`. Fåglar flyger förbi och bajsar → nya fläckar (som går samma väg). |
| **mål** | Alla ytor rena (skrubbade OCH spolade) → bilen tutar, kör genom glansbågen, ägaren jublar. `progress.complete()` per bil. |
| **agens** | Verktygen är inte utbytbara — de gör olika saker i en kedja. Svampen skrubbar loss smuts till skum (och gör ingenting på skum). Slangen spolar bort skum (och gör bara smutsen *blöt* — blött smuts lossnar 30 % lättare, en dold vänlighet) och **skrämmer bort fåglar innan de hinner bajsa**. Barnet väljer hela tiden: skrubba vidare, spola rent, eller spola en fågel för att slippa jobb. |
| **variation** | 6 fordon med egna ritade detaljer (glasstrut, blåljusramp, avgasrör, skylt, lastbox) · 4 fågeltyper med olika storlek, bajsnyans och **seghet** (gås = 6 skrubbsteg, sparv = 2) · sällsynt regnbågsfågel som bajsar glitterskum · smutsmönster och skumbubblor slumpas · fler fläckar och tätare fåglar för varje bil |
| **mottagare** | Bilens ägare väntar vid glansbågen (Bobo, annars ett **ritat** djur: hund/ko/gris/kanin). Guppar under tvätten, jublar och åker med. |
| **finish** | Bilen blir blank med en glimt-svep, **tutar** (riktig tvåtons-ton), ägaren hoppar till och vinkar, bilen rullar ut genom glansbågen. Varje **helt ren** yta spelar nästa ton i en pentatonisk skala → en hel bil = en liten melodi. |

**Slangen är riktig fysik.** En vattenpost står fast i scenen; slangen är en **verlet-kedja
(20 punkter × 42 px, gravitation + dämpning, 8 relaxationsiterationer/substeg, 1–3 substeg per
frame)**. Barnet greppar **näst sista punkten** (fingret) och munstycket **dinglar fritt i sista
segmentet** — därför pekar strålen naturligt nedåt när handen står still, och släpar bakåt när
man sveper. Vattnet sprutar så länge man håller i munstycket, längs sista segmentets riktning
(kon: 235 px lång, breddas utåt). Räckvidden är kedjans längd: målpunkten klipps till
`18 × 42 × 0,94 ≈ 710 px` från posten, så slangen **tar mjukt stopp** i stället för att tänjas.
Släpper man faller munstycket mjukt ner mot golvet och blir liggande där. Tap-tap: tryck
munstycket → tryck en yta → greppet ställer sig 205 px ovanför punkten och spolar ner på den
i 1,9 s.

**Skrubbmotstånd.** Ett skrubbsteg kostar ~78 px svamprörelse (+ 0,5 steg/s bara av att hålla
still, som säkerhetsnät — inget kan låsa sig). Smuts = 2–3 steg, bajs = fågelns seghet × 2
(2/2/4/6). Varje steg krymper och bleknar fläcken **och lägger till tre skumbubblor**, så man
ser löddret byggas upp. Tap-tap-fallbacken tar exakt **ett** steg per tryck (svampen blir
otryckbar medan den är ute, annars lägger den sig ovanpå fläcken och äter nästa tryck).

**Motgångsdesign (P0 `MOTGÅNG`)**

- **Tak: max 3 bajsfläckar på bilen samtidigt.** Är det redan 3 missar alla andra fåglar bilen —
  bajset plaskar bredvid på marken (roligt `plopp` + "Puh! Den missade bilen!").
- **Lagom takt:** fågel var ~9 s på första bilen, ner mot ~6 s på senare. Aldrig tätare än att
  barnet hinner ifatt.
- **Ursprungssmutsen kommer aldrig tillbaka** — bara fågelbajs tillkommer. Arbetet kan alltså
  bara *sakta ner*, aldrig växa ifrån barnet. Ingen timer, ingen poäng, inget misslyckande.

**Fristående objekt (P0 `ASSETS` / DESIGN.md §8.1).** Inget spelobjekt bor i en bricka och ingen
emoji utgör ett föremål. Svampen är en ritad disksvamp (gul kropp med porer, grön skursida, mjuk
skugga), munstycket ett ritat sprutmunstycke (grepp, avtryckare, metallpip, gummikrage), slangen
en ritad slang, vattenposten en ritad hydrant, hinken en ritad hink med lödder, ägarna ritade
djur. Träffytorna är osynliga `hitArea`-halon (svamp 152×136, munstycke 132×120). Enda emoji som
finns kvar är transienta feedback-partiklar (`floatText` 💦 💨 🎉 ✨) och regnbågsdetaljen 🌈
ovanpå den ritade regnbågsfågeln.

**Röstrepliker**
```
"Zacke tvättar bilar! Skrubba med svampen och spola sedan bort skummet."   (voiceIntro, NY)
"Titta! Smutsen blev skum. Ta slangen och spola bort det!"                 (NY)
"Ta slangen och spola bort skummet!"                                       (NY)
"Skrubba med svampen först, sedan spolar du!"                              (NY)
"Dra i munstycket så sprutar vattnet!"                                     (NY)
"Skrubba smutsen med svampen!"
"Skrubba bort bajset med svampen!"
"Ta svampen och skrubba!"
"Spola med slangen!"
"Spola på fågeln så flyger den iväg!"
"Bra spolat! Den hann inte bajsa."
"Akta! Fågeln bajsade på bilen!"
"Puh! Den missade bilen!"
"En regnbågsfågel! Den bajsade glitter!"
"Här kommer bilen/bussen/brandbilen/traktorn/glassbilen/lastbilen! Tvätta den ren."
"Bilen är skinande ren! Bra jobbat!"
```

## 1. Nuläge (sett som spelare)

Byggd 2026-07-25, byggd om 2026-07-25 (tvåfas-loop + riktig slangfysik + fristående objekt).

Scenen är en tvätthall på en äng: bilen mitt i bilden, Zacke till vänster, en **vattenpost** i
nedre vänstra hörnet med en lång slang som ringlar över golvet fram till munstycket, en **hink**
med tvålvatten där **svampen** ligger och guppar, och ägaren som väntar till höger vid
glansbågen. Fåglar korsar himlen.

Barnet tar svampen och gnuggar. Fläcken ger motstånd — den krymper, bleknar och får fler och
fler skumbubblor för varje drag, tills den plötsligt *poppar* om till en riktig lödderklick av
tjugotalet överlappande halvgenomskinliga bubblor med glansprickar. Bilen är nu skummig men inte
ren. Barnet greppar munstycket, slangen släpar efter som ett rep, vattnet sprutar och skummet
sköljs bort i klungor med små plopp — tills plåten är blank och en pentatonisk ton klingar.
Drar man för långt tar slangen mjukt stopp. Träffas en fågel av strålen flyr den utan att hinna
bajsa; trycker man på den missar den bilen.

När sista ytan är ren svepar en glans över lacken, bilen tutar tvåtonigt, ägaren hoppar till och
de rullar ut genom bågen.

(+ skärmdump: `.test-shots/zackes-biltvatt.png`)

## 2. Ursprunglig plan & tankeprocess

Ägarens idé: *"Zacke tvättar varierande bilar som kommer in smutsiga med svamp och slang medans
olika typer av fåglar flyger över och bajsar på bilen (olika fåglar har olika storlekar och
nyanser av bajs)."*

Det pedagogiska/lek-målet är **orsak–verkan med ett val**: att göra rent är i sig
tillfredsställande för 2–5-åringar (samma kärna som `tvatta-djuret`), men här finns ett andra
lager — man kan **förebygga** i stället för att bara städa. Det ger spelet en tanke utan att
kräva skicklighet: barnet upptäcker själv att slangen på fågeln sparar jobb.

Fågelbajset var designriskens kärna: det är ett **bakslag**, och P0 förbjöd länge all motgång.
Ägaren lättade regeln (se `MOTGÅNG` i `CLAUDE.md`) — motgång får finnas, men måste ha ett tak
och gå att anpassa sig runt. Därav 3-fläckars-taket och den lugna takten: bakslaget känns, men
kan aldrig springa ifrån barnet.

## 3. Vad gör det lättjefullt / tunt

Ägarens fyra krav efter första speltestet (2026-07-25) är åtgärdade: verktygen krävs **båda**
(tvåfas-loop), svampen har **motstånd**, slangen är **riktig repfysik från en vattenpost**, och
inga spelobjekt är emoji-i-en-ruta längre. Kvarstående risker:

- Slangens vilo-läge bestäms av fysiken; munstycket blir liggande där barnet släppte det. Det är
  realistiskt men kan hamna undanskymt (t.ex. bakom bilen) — det syns alltid, men en mjuk
  "krypa hem"-kraft efter ~15 s vila vore vänligare.
- Skummet på tjock gåsbajs kräver en hel del gnuggande. Taket (3 bajsfläckar) håller det i
  schack, men på bil 5–6 kan det bli mycket arbete samtidigt.
- 6 fordon räcker en stund men blir förutsägbart; fler karosser/färger är en billig påfyllning.
- Ägaren reagerar men deltar inte — hen skulle kunna peka på en missad fläck.
- Strålens ljud är fortfarande upprepade `whoosh` — ett loopande vattenljud saknas.

## 4. Förbättringar & förhöjningar (plan)

**Kärnloop**
- [Medium] Låt ägaren peka på en fläck barnet missat efter lång inaktivitet (mjuk, positiv hjälp).
- [Deep] Vaxning som valfritt sista steg: blank vs matt lack ger synligt olika glansfinish.

**Variation**
- [Quick] Fler karossfärger + fler fordon (brandbil finns; lägg till polisbil, sopbil, husbil).
- [Medium] Väder: regnskur som sköljer bilen halvvägs (gratis hjälp) eller lera som stänker upp.

**Juice**
- ~~[Quick] Skum som byggs upp där svampen gnuggat och sköljs bort av slangen.~~ **GJORT** — det
  är numera hela kärnloopen.
- [Medium] Vattenpöl som växer under bilen medan man spolar.
- [Quick] Munstycket kryper långsamt hem mot posten efter lång vila.

**Progression**
- [Medium] Låt fordonstypen avgöra tvättytan (buss = större yta, fler fläckar men lugnare fåglar).

**Karaktär**
- [Quick] Zacke reagerar mer: torkar pannan, tummen upp när en fläck försvinner.
- [Medium] Återkommande stamkund som kommer tillbaka med samma bil och känner igen barnet.

**Ljud**
- [Quick] Riktigt måsläte via MOSS när tjänsten är uppe (nu återanvänds `djur_anka`/`djur_tupp`).
- [Medium] Vattenstråle som loopande ljud i stället för upprepade `whoosh`.

## 5. Status / loggar

- `2026-07-25` · byggd från spec via `/spel`, första körningen av pipelinen. Kvalitetsgrindens
  7 punkter genomgångna, `npm run check --game` grön, headless-test 0 fel inkl. exit-cykel.
- `2026-07-25` · **ombyggd efter ägarens speltest** (fyra krav):
  1. **Tvåfas-loop** — svampen skrubbar smuts/bajs till **skum**, slangen spolar bort skummet.
     Båda verktygen krävs, i ordning. Fel verktyg ger rolig reaktion + röst-cue, aldrig ett stopp
     (svamp på skum = bubblorna guppar; vatten på smuts = den blir blöt och lossnar 30 % lättare).
  2. **Skrubbmotstånd** — arbete mäts i svamprörelse (~78 px/steg). Smuts 2–3 steg, bajs 2–6 steg
     efter fågelns storlek. Fläcken krymper, bleknar och samlar skumbubblor för varje steg.
     Tap-tap ger exakt ett steg per tryck.
  3. **Riktig slang** — vattenpost + verlet-kedja (20 punkter × 42 px, gravitation, dämpning,
     8 relaxationsiterationer). Barnet greppar strax bakom munstycket, som dinglar fritt →
     strålen pekar dit man siktar. Räckviddsstopp via målklippning (~710 px), munstycket faller
     mjukt till golvet när man släpper. Tap-tap spolar en punkt i 1,9 s.
  4. **Fristående objekt** — svamp, munstycke, slang, vattenpost, hink, ägardjur och
     fordonsdetaljer är nu ritade föremål med osynliga hitArea-halon; verktygsbrickorna med
     🧽/🚿 och ägarens emoji-huvud är borta.
  Även: hela input-hanteringen går via en osynlig helskärms-träffyta (tap-tap fungerar överallt),
  fläckarnas skala lerpas i tickern i stället för per-fläck-tweens (färre tweens att döda), och
  slangfysiken nollställs explicit i `destroy`. `npm run check --game` grön, `npm run test`
  0 konsolfel inkl. exit-cykel; extra manuella Playwright-körningar för drag, tap-tap,
  räckviddsstopp och exit mitt i sprutandet.
- 2026-08-09: **Ägaren blev en rigg** (`lib/karaktarer.js`, utrullningens omgång 4).
  `makeMascot(52)` → `makeKaraktar({ r: 52, kropp: false })` — `kropp: false` för att den lila
  jackan är **ägarens**; en björnkropp i cream hade gjort honom till maskoten i stället för
  till bilens ägare. `look()` följer det verktyg barnet håller i (svampen när den skrubbar,
  munstycket när det spolar, annars bilen) — uppmätt i närbild: båda pupillerna står 14
  bildpunkter till vänster om sin ögonmitt, mot bilen på x=560. Ny bil → `nyfiken`, ren yta →
  `react('heja')` (upp till 8 fläckar per bil, därför inte `jubel`), bilen ren →
  `setMood('stolt')` medan spelets hopp på 46 px äger `y`.
  **Ägarbytet är spelets egen fälla, och den är mätt:** `_makeOwner` river displayträdet med
  `removeChildren().destroy()` en gång per bil, men det rör inte gsap — en rigg utan `destroy()`
  lämnar två odödliga tweens (andningen på `view.scale` + den självbokande blinkningen). Ny sond
  `scripts/_agarprobe.mjs` kör 12 ägarbyten och läser levande tweens ur gamelogs `render/prov`:
  **utan `_kar.destroy()` 10 → 18 (+8 på 4 Bobo-bilar), med den 10 → 8.** gamelogs egen
  `tween-lacka` sa **0 i båda armarna** — den dömer bara tweens vars mål har `.destroyed`, och
  andningens mål är `view.scale`, en ObservablePoint utan den flaggan. `npm run test` grön,
  `check` 0/0. Commit `cc3ccbf`.
