# PIPELINE.md — från idé till spelbart

Så här går en spelidé från en mening i ett chattfönster till ett spel som barnet kan spela på
plattan. Den maskinläsbara versionen (den Claude följer) ligger i skill
`.claude/skills/spel-pipeline/SKILL.md` — det här dokumentet är för människor.

## Grundidén

> Du skriver en idé på svenska. Du godkänner ett spec-kort. Sedan är du klar —
> nästa gång du hör något är spelet byggt, testat, committat, byggt till PWA och serverat.

Bara **ett** stopp: spec-kortet. Allt annat körs igenom.

## Kommandona

| Kommando | Gör |
|---|---|
| `/spel <idé>` | Ny idé → färdigt spel i biblioteket |
| `/polera <id>` | Lyfter ett befintligt spel en nivå |
| `/felsok <id>` | Granskar efter buggar och fixar det som hittas |
| `/fixa <id> <fel>` | Riktad fix på något du sett när du spelat |
| `/testa [id\|alla]` | Headless-test + skärmdumpar |
| `/rost` | Genererar väntande röstklipp när narratorn är uppe |
| `/avsluta` | Sessionsavslut: docs, minne, backup, inget halvlandat |
| `/aterta` | Fortsätter en körning som avbröts av krasch/strömavbrott |

## Så ser ett `/spel`-varv ut

```
  Du:  /spel Elvira flyger genom moln och plockar stjärnor, man drar för att styra

  ┌─ SPEC ────────────────────────────────────── ✋ enda stoppet
  │  Spec-kort: id, kategori, kärnloop, mål, agens, variation,
  │  mottagare, finish, röstrepliker.  Du säger ja (eller ändra).
  └────────────────────────────────────────────────────────────
       ↓
     PLAN        docs/games/<id>.md skrivs ur mallen
     BYGG        parallella spelbyggare: mekanik · scen+juice · ljud
     REGISTRERA  registry.js + nya repliker i voice-phrases.json
     KONTROLL    npm run check -- --game <id>          (kontrakt + P0)
     TEST        npm run test <id>                     (0 konsolfel)
     KRITIK      spelkritiker spelar som 3-åring
     FIX         åtgärda, testa om
     COMMIT      feat(<id>): …
     VERSION     package.json MINOR++
     LEVERANS    npm run build && npm run serve
     LOGG        SESSIONS.md · index · npm run backup
       ↓
  "✅ Stjärnflykten ⭐ ligger i Roligt. Ladda om appen — leta efter v1.12."
```

## Kvalitetsgrinden — varför nya spel inte får bli 🔧

Biblioteket har redan 69 spel. Ett till som "funkar men är tunt" gör biblioteket sämre, inte
bättre. Därför måste varje nytt eller polerat spel klara sju punkter innan commit:

1. **Agens** — trycket är ett *val* som påverkar utfallet, inte samma animation varje gång.
2. **Variation** — omgång 2 ≠ omgång 1.
3. **Juice** — ljud+bild under 100 ms, squash/stretch, partiklar.
4. **Mottagare** — någon tar emot skapelsen och blir glad.
5. **Riktig ton/SFX** — stämd skala för musik, riktiga klipp där de finns.
6. **Mjuk progression + motstånd** — växer lugnt, alltid nytt att upptäcka. Hinder som går att
   anpassa sig runt hör hit; de får sakta ner, aldrig stoppa, och ska ha ett tak + lagom takt.
7. **Spel-specifik finish** — inte samma konfetti som alla andra.

Plus P0 (`CLAUDE.md`) och exit-säkerhet. `npm run check` bevakar det som går att mäta
maskinellt; `spelkritiker` bevakar resten.

## Om strömmen går

Varje pipeline skriver `.claude/state/korning.json` **före** varje steg — vilket kommando,
vilket spel, vilket steg, vad som är klart, exakt vad som är nästa handling.

- Vid nästa sessionsstart syns den avbrutna körningen automatiskt (SessionStart-hook).
- `/aterta` plockar upp den — men **verifierar mot disken först** (finns filerna? är de hela?
  finns commiten? är testet grönt?) och litar aldrig blint på filen.
- Ingenting går förlorat: det värsta som händer är att ett steg körs om.

## Säkerhet mot dataförlust

| Lager | Vad |
|---|---|
| Git | En commit per spel, lokalt repo, hela historiken |
| `docs/SESSIONS.md` | Vad varje session gjorde — läsbart utan chatthistorik |
| `docs/games/<id>.md` | Per spel: nuläge, plan, vad som gjorts |
| `.claude/state/` | Pågående körning (överlever krasch) |
| `npm run backup` | Robocopy-spegel till `E:\backup\pwagames`, inklusive `.git` |

## Verktygen bakom

```bash
npm run check                  # kontrakt, registry, P0, docs, röst-täckning
npm run check -- --game <id>   # strikt läge för ett spel (varningar = fel)
npm run test <id>              # headless: tryck/dra, skärmdump, exit-cykel
npm run test:all               # alla spel parallellt
npm run backup                 # robocopy → E:\backup\pwagames
npm run dev / build / serve    # utveckling · PWA-bygge · servera till telefon
```
