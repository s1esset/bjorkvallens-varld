# CLAUDE.md — Björkvallens Värld

Offline-first, installerbar **PWA med minispel för barn 2–5 år**, helt på svenska. Tablet-först.
Ett tunt skal (splash → meny → bibliotek → spel) kör 71 fristående **spelmoduler** med ett delat
kontrakt. Stack: PixiJS v8 · three.js (dynamiskt) · matter.js · p2-es (dynamiskt) · GSAP ·
Vite 5 · vanilla ESM. Motorerna är **verktyg att välja mellan per spel** — se skill **fysik-spel**
för vilken som passar när (egen integrator · matter · p2 · three).

## P0 — icke förhandlingsbart, gäller varje skärm och spel

```
TRÄFFYTA      ≥96px (2cm), avstånd ≥24px, +24px osynlig hit-halo
UPPLÖSNING    1280×720 landskap, Math.min letterbox (contain)
GESTER        JA: tap, enkel drag (snäpp + tap-tap-fallback). NEJ: dubbeltryck, långtryck,
              pinch, rotation, multitouch, snabbsvep-nav
ÅTERKOPPLING  varje pekning → ljud+bild <100 ms. Fel tryck = roligt, aldrig summer, rött kryss
              eller tillsägelse. Belöning = 1–2 s firande + svenskt beröm + klistermärke
MOTGÅNG       hinder och bakslag är TILLÅTNA och gör spelet bättre (något blir smutsigt igen,
              välter, kommer i vägen). De ska gå att anpassa sig runt och som mest SAKTA NER.
              Krav: rolig ton, tydlig orsak, går att åtgärda direkt, TAK på hur mycket som kan
              gå fel samtidigt, lagom takt. Svårighet = eftertanke, aldrig stress eller skam.
ASSETS        spelobjekt ritas FRISTÅENDE — aldrig en emoji/ikon i en ruta, bricka eller box.
              Egen silhuett, egen form, eget liv (vilo-guppning, reaktion vid tryck). Paneler
              och kort får bära TEXT och UI-kontroller, aldrig spelobjekt. En emoji duger som
              detalj ovanpå ett riktigt ritat föremål, aldrig som hela föremålet.
NAVIGATION    ikon-först, noll läsning; talad svensk instruktion + repetera-knapp per skärm
GRIND         tryck-och-håll 2,5 s före inställningar/avsluta/ta bort/nollställ/länkar
ALDRIG        reklam, spårning, analytics, nätanrop vid körning, misslyckande som avslutar
              eller nollställer, "game over", poäng som sjunker, bestraffande timers, FOMO
DATA          endast localStorage JSON, ingen PII lämnar enheten
SVENSKA       å/ä/ö i UI/röst; asciiFold (a/a/o) för id:n, filnamn, ljudnycklar, commits
KARAKTÄRER    avbildade människor heter ENDAST Zacke/Alissa/Elvira/Lova (djur, monster och
              maskoten Bobo undantas) — se lib/theme.js
EXIT-SÄKERT   spelaren kan lämna mitt i en animation → _alive-flagga + feedback.js-hjälparna
```

## Kommandon

| Pipeline | | Verktyg | |
|---|---|---|---|
| `/spel <idé>` | idé → spelbart spel | `npm run dev` | dev-server :5173 |
| `/polera <id>` | lyft ett spel en nivå | `npm run check` | kontrakt + P0 + registry + röst |
| `/felsok <id>` | granska & fixa buggar | `npm run test <id>` | headless + bildkoll, 0 fel krävs |
| `/fixa <id> <fel>` | riktad fix | `npm run test:all` | alla spel parallellt |
| `/testa [id\|alla]` | testkörning | `npm run build` · `serve` | bygge → :4173 (telefon) |
| `/rost` | generera pending röstklipp | `npm run backup` | robocopy → E:\backup |
| `/avsluta` · `/aterta` | avsluta / återuppta session | `npm run voice` · `sfx` | offline-klipp (PowerShell) |

Bild- och balanssonder (kör dem när ett spel *känns* fel men testet är grönt):

| | |
|---|---|
| `node scripts/bildkoll.mjs <bild> [--baslinje <bild>]` | tom scen · heltäckande fält · platt layout · diff |
| `npm run test -- --spara-baslinje` · `-- --baslinje` | spara dagens bilder · jämför mot dem |
| `node scripts/_lastprobe.mjs` · `_exitprobe.mjs` | *spelar* ett spel för balans · lämnar mitt i en finish |
| `node scripts/_idleprobe.mjs <id>` | klarar spelet sig själv utan input? (ska vara 0) |
| `node scripts/kenney-sfx.mjs <Audio-katalog>` | importera CC0-ljud → `public/audio/sfx/` |

## Var kunskapen finns (ladda vid behov — läs inte allt i förväg)

| Ska du… | Skill / dok |
|---|---|
| skriva eller ändra ett spel | skill **spelkontrakt** |
| köra en pipeline, avsluta/återuppta | skill **spel-pipeline** · `docs/PIPELINE.md` |
| fysik, sikte, banförhandsvisning | skill **fysik-spel** |
| ljud, musik, röst, klipp-generering | skill **ljud-och-rost** |
| skal, skärmar, spardata, PWA, telefon | skill **skal-och-data** |
| 3D / shaders | skill **threejs-games** · **threejs-shaders** |
| UI-design, tokens, versionspill | `docs/DESIGN.md` |
| ett specifikt spels nuläge + plan | `docs/games/<id>.md` (index: `docs/games/README.md`) |
| rapporterade buggar som väntar på fix | `docs/ATGARDER.md` |
| se vad ett spel FAKTISKT gör (input·fysik·render·fel) | `src/lib/gamelog.js` → `.test-logs/<id>.json` |
| vad bilden avslöjar (trösklar + kalibrering) | `scripts/bildkoll.mjs` |
| vad som hände senast | `docs/SESSIONS.md` |
| spelidéer som väntar på planering | `docs/IDEER.md` |

## Tysta fällor — kostade tid på riktigt, gissa inte om dem

- **Docens §4 kan vara inaktuell.** Läs `src/games/<id>/index.js` **före** planen. Två gånger har
  en köad punkt redan varit gjord, och båda gångerna bar koden på fel ingen doc kände till.
- **Grönt test betyder bara "0 konsolfel".** Det säger ingenting om målet går att nå, om mätaren
  syns eller om scenen är tom. Grävmaskinen klarade en nivå på 3,4 s och rapporterade grönt.
  `npm run test` kör därför `bildkoll.mjs` på skärmdumpen — **och titta på bilden själv ändå.**
- **Repliker som inte står som `voice.say('literal')` får aldrig ett klipp.** `check.mjs` kan bara
  läsa literaler; byggs texten vid körning (template literal, tabelluppslag) syns den inte statiskt.
  Backstoppen är mätt, inte gissad: `check.mjs` läser `rost-utan-klipp` ur `.test-logs/<id>.json`
  och varnar för den **exakta** text körningen sa. Den kontrollen kräver alltså att spelet har
  körts — `npm run check` ensam ser dem fortfarande inte. Lägg in frasen i
  `scripts/voice-phrases.json` för hand och kör `npm run voice`.
- **Röstkön är inte permanent.** `npm run voice` fungerar (F5-TTS i `C:\repos\storygen`) — töm kön
  i stället för att lämna repliker på Web Speech.
- **Sonder måste ligga i repot.** Scratchpad-katalogen kan inte lösa `playwright`; lägg
  engångsskript som `scripts/_*.mjs`.
- **`korning.mjs` har egna verb:** `steg <namn> --nasta "…"` och `notis "…"`. Det finns inget
  `nasta`- eller `anteckning`-kommando.
- **Byt inte ut stämda ljud mot samplade.** `correct` (660→880 = kvint), `match` (durtreklang) och
  `pling` är musik, inte blipp — ett generiskt UI-klick vore ett brott mot grindens punkt 5.

## Arbetsregler

- **`old/` är arkiverat skräp** — läs, greppa eller citera aldrig något därunder.
- **Grind före commit:** `npm run check` grön + `npm run test <id>` med 0 konsolfel och inga
  `fel`-nivåfynd. En commit per spel, explicita sökvägar, aldrig `git add -A`.
  Commit-ämnen på asciiFold-svenska. Repot är lokalt — aldrig `git push`.
- **Bumpa MINOR i `package.json`** per ändringsomgång; versionspillret är förälderns kvitto.
- **Nya spel landar som ✅, aldrig 🔧** — kvalitetsgrindens 7 punkter i skill **spel-pipeline**.
- **Mät, resonera inte.** Balans, trösklar och "känns det rätt?" avgörs med en sond som spelar
  spelet och jämförs mot HEAD — aldrig med ett antagande i huvudet.
- **Webbläsare:** använd node-harnessen (`npm run test`) i första hand. Behövs en *levande*
  webbläsare: claude-in-chrome. Playwright-MCP endast som fallback — kör aldrig båda i samma uppgift.
- **Agenter:** upp till **3 subagenter** får startas oombett när uppgiften tjänar på det
  (pipelinens `spelbyggare` · `spelkritiker` · `felsokare`). Fler än 3 — fråga först.
  Workflows och deep-research kräver alltid att ägaren ber om det.
- **Assets utifrån:** bara CC0 (Kenney m.fl.), aldrig CC-BY — appen har ingen credits-yta.
  Allt bäddas in offline; P0 ALDRIG gäller nätanrop vid körning.
