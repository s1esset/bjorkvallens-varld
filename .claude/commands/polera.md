---
description: Lyft ett befintligt spel en nivå (upgrade/förbättra/fördjupa)
argument-hint: <spel-id> [valfritt: vad du vill lyfta]
---

Lyft spelet: **$ARGUMENTS**

Läs skill **spel-pipeline** (kvalitetsgrinden + checkpoint-protokollet) och skill
**spelkontrakt**. Ladda **fysik-spel** / **ljud-och-rost** / **threejs-games** vid behov.

## Steg 0 — vad som lyfts (ENDA grinden)

1. Läs `docs/games/<id>.md` — särskilt **§3 (vad som är tunt)** och **§4 (förbättringsplanen,
   taggad [Quick]/[Medium]/[Deep])** och **§5 (vad som redan gjorts)**.
2. Läs spelets `src/games/<id>/index.js` så förslagen matchar verkligheten, inte docen.
3. Kör `npm run test <id>` och titta på `.test-shots/<id>.png` — bedöm spelet som spelare.
4. Föreslå **den omgång som ger störst lyft nu**, mätt mot kvalitetsgrindens 7 punkter:

```
🔧 <TitleSv> — föreslagen omgång
nuläge     <en ärlig mening om var spelet står>
tar nu     • <punkt>  [Quick]
           • <punkt>  [Medium]
lämnar     <vad som medvetet sparas till senare och varför>
risk       <vad som kan gå sönder — mekanik/kontrakt/prestanda>
```

Har användaren angett vad de vill ha lyft: respektera det, och lägg bara till egna förslag om
de är billiga och uppenbara. **Vänta på ja.**

Checkpoint: `node scripts/korning.mjs start polera <id>`

## Sedan — utan fler stopp

1. **bygg** — genomför omgången. Bevara mekanik, kontrakt och exit-säkerhet. Bryt inte
   sparad progress (`ctx.progress`-nycklar i `custom` måste överleva).
2. **kontroll** — `npm run check -- --game <id>` grön.
3. **test** — `npm run test <id>`, 0 fel, inklusive exit-cykeln. Jämför skärmdumpen mot före.
4. **kritik** — `spelkritiker`-agent. Åtgärda det som är rimligt, om-testa.
5. **commit** — `feat(<id>): <vad som lyftes>`, explicita sökvägar.
6. **doc** — uppdatera `docs/games/<id>.md` **§5 Status/loggar** (vad som gjordes + commit) och
   bocka av de punkter i §4 som nu är gjorda. Är alla 7 grindpunkter uppfyllda: sätt spelets
   status till ✅ i `docs/games/README.md`-indexet.
7. **version + leverans** — bumpa MINOR, `npm run build` && `npm run serve`.
8. **logg** — `docs/SESSIONS.md`, `npm run backup`, `node scripts/korning.mjs klar`.

Rapportera vad som konkret känns annorlunda att spela nu — inte vilka filer som ändrades.
