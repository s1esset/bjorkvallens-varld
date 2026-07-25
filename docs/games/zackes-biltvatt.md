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
| **kärnloop** | En smutsig bil rullar in. Barnet drar **svampen** över fläckar (skrubbar) eller **slangen** (spolar rent + skrämmer fåglar). Fåglar flyger förbi och bajsar → nya fläckar. Allt rent → bilen glänser och kör iväg. |
| **mål** | Alla fläckar borta → bilen tutar, kör genom glansbågen, ägaren vinkar. `progress.complete()` per bil. |
| **agens** | Två verktyg med olika styrka. Svampen tar tjock smuts och stora klickar snabbt; slangen sköljer brett, är svagare på tjockt — men **skrämmer bort fåglar innan de hinner bajsa**. Barnet väljer hela tiden: förebygga eller städa efter. |
| **variation** | 6 fordon (bil, buss, brandbil, traktor, glassbil, lastbil) · 4 fågeltyper med olika storlek och bajsnyans · sällsynt regnbågsfågel som bajsar glitter · smutsmönster slumpas · fler fläckar och tätare fåglar för varje bil |
| **mottagare** | Bilens ägare väntar vid glansbågen (Bobo, ibland ett djur). Hejar under tvätten, inspekterar, jublar och åker med. |
| **finish** | Bilen blir blank med en glimt-svep, **tutar** (riktig tvåtons-ton), ägaren hoppar in och vinkar, bilen rullar ut genom glansbågen. Varje ren fläck spelar nästa ton i en pentatonisk skala → en hel bil = en liten melodi. |

**Motgångsdesign (P0 `MOTGÅNG`)**

- **Tak: max 3 bajsfläckar på bilen samtidigt.** Är det redan 3 missar alla andra fåglar bilen —
  bajset plaskar bredvid på marken (roligt `plopp` + "Puh! Den missade bilen!").
- **Lagom takt:** fågel var ~9 s på första bilen, ner mot ~6 s på senare. Aldrig tätare än att
  barnet hinner ifatt.
- **Ursprungssmutsen kommer aldrig tillbaka** — bara fågelbajs tillkommer. Arbetet kan alltså
  bara *sakta ner*, aldrig växa ifrån barnet. Ingen timer, ingen poäng, inget misslyckande.

**Röstrepliker**
```
"Zacke tvättar bilar! Ta svampen och skrubba bort smutsen."
"Spola med slangen!"
"Akta! Fågeln bajsade på bilen!"
"Spola på fågeln så flyger den iväg!"
"Puh! Den missade bilen!"
"Titta så blank den blir!"
"Bilen är skinande ren! Bra jobbat!"
"En regnbågsfågel! Den bajsade glitter!"
```

## 1. Nuläge (sett som spelare)

Byggd 2026-07-25 direkt mot kvalitetsgrinden. Scenen är en tvätthall på en äng: bilen står mitt
i bilden, verktygsstället (svamp + slang) längst ner, ägaren väntar till höger vid glansbågen,
Zacke står till vänster och hejar. Fåglar korsar himlen uppe.

Barnet drar svampen över bilen — fläckar bleknar i lager och poppar bort med en stigande ton.
Slangen sprutar en vattenstråle: mildare på tjock smuts men träffar brett, och en fågel som
träffas av strålen flyger iväg skräckslaget kacklande utan att hinna bajsa. Trycker man på en
fågel flaxar den till och skyndar på. När sista fläcken är borta svepar en glans över lacken,
bilen tutar, ägaren jublar och de rullar ut genom bågen.

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

Nyskrivet — den här sektionen fylls när spelet har spelats av riktiga barn. Kända risker att
hålla ögonen på:

- Slangens roll kan bli otydlig om barnet aldrig råkar spola en fågel — den upptäcks kanske
  inte utan röst-cue.
- 6 fordon räcker en stund men blir förutsägbart; fler karosser/färger är en billig påfyllning.
- Ägaren reagerar men deltar inte — hen skulle kunna räcka över en trasa eller peka på en missad
  fläck.

## 4. Förbättringar & förhöjningar (plan)

**Kärnloop**
- [Medium] Låt ägaren peka på en fläck barnet missat efter lång inaktivitet (mjuk, positiv hjälp).
- [Deep] Vaxning som valfritt sista steg: blank vs matt lack ger synligt olika glansfinish.

**Variation**
- [Quick] Fler karossfärger + fler fordon (brandbil finns; lägg till polisbil, sopbil, husbil).
- [Medium] Väder: regnskur som sköljer bilen halvvägs (gratis hjälp) eller lera som stänker upp.

**Juice**
- [Quick] Skum som byggs upp där svampen gnuggat och sköljs bort av slangen.
- [Medium] Vattenpöl som växer under bilen medan man spolar.

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
