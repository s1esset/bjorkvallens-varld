---
description: Fixa ett specifikt problem du sett i ett spel
argument-hint: <spel-id> <beskrivning av problemet>
---

Åtgärda det rapporterade problemet: **$ARGUMENTS**

Läs skill **spelkontrakt**. Ladda **fysik-spel** / **ljud-och-rost** / **skal-och-data** bara om
problemet ligger där.

Checkpoint: `node scripts/korning.mjs start fixa <id> --notis "<problemet>"`

## 1. Förstå rapporten

Beskrivningen kommer från någon som **spelat** spelet, inte läst koden ("bollen fastnar i
kanten", "hon säger fel sak när man vinner", "inget händer om man trycker snabbt"). Översätt
den till ett tekniskt påstående och säg vilket du tror det är innan du gräver.

## 2. Reproducera

Kör `npm run test <id>` med **riktade** `--taps`/`--drag` som återskapar situationen
(designkoordinater ≈ skärmpixlar vid 1280×720). Läs skärmdumpen. Går det inte att reproducera
headless: säg det, beskriv vad du testade, och be om ett förtydligande (vilken skärm, vilket
moment, varje gång eller ibland) hellre än att gissa fram en ändring.

## 3. Grundorsak, inte symptom

Hitta *varför*. En fix som döljer symptomet (extra vakt, timeout, magisk konstant) är bara
acceptabel om du säger rakt ut att det är en lindring och varför grundorsaken lämnas.

## 4. Minsta möjliga ändring

Rör bara det som behövs. Ser du annat som är trasigt eller tunt: **fixa det inte oombett** —
notera i `docs/games/<id>.md` §4 och nämn det i rapporten.

## 5. Verifiera och landa

- Samma reproduktionskörning — nu utan felet.
- `npm run check -- --game <id>` + `npm run test <id>` gröna (inkl. exit-cykeln).
- `fix(<id>): <vad som var fel>`, explicita sökvägar. Bumpa MINOR.
- `npm run build` && `npm run serve` → säg vilken version som ska laddas om.
- `docs/SESSIONS.md`, `npm run backup`, `node scripts/korning.mjs klar`.

Rapportera i en mening vad som var fel och vad som händer nu i stället — på spelarens språk,
inte kodens.
