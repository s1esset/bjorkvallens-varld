---
description: Avsluta sessionen ordentligt — inget arbete, ingen kunskap går förlorad
---

Avsluta sessionen. Målet: nästa session (eller nästa person) ska kunna fortsätta utan att
gräva i historiken, och ingenting ska ligga okommitterat eller osäkrat.

Gå igenom **allt** nedan. Hoppa inte över ett steg för att det "nog är okej" — säg i så fall
uttryckligen varför.

## 1. Ingenting halvlandat

```bash
git status --porcelain
npm run check
```

- Okommitterade ändringar: committa dem med rätt scope (`feat(<id>)` / `fix(<id>)` /
  `docs(...)` / `chore(...)`), eller redovisa uttryckligen varför de lämnas.
- `npm run check` ska vara grön (0 fel). Är den inte det: fixa, eller skriv ner exakt vad som
  återstår.
- Ändrade spel som inte testats sedan senaste ändringen: `npm run test <id>`.

## 2. Dokumentationen i takt med verkligheten

- `docs/SESSIONS.md` — lägg till en post **överst** i sessionslistan:
  datum · version · vad som byggdes/ändrades · commits (kortformat) · öppna trådar.
  Skriv den så att den går att förstå utan den här konversationen.
- `docs/games/README.md` — indexstatus (⬜/📝/🔧/✅) för spel du rört.
- `docs/games/<id>.md` §5 för spel du rört.
- Har du ändrat arbetssättet (pipeline, verktyg, konventioner): uppdatera rätt
  skill i `.claude/skills/` eller `docs/PIPELINE.md` — inte bara sessionsloggen.

## 3. Minnet

Uppdatera minnesfilen `project-status.md` så den beskriver **nuläget**, inte historiken:
version, senaste commit, vad som pågår, vad som är nästa naturliga steg. Ta bort det som
inte längre är sant. Lägg till en ny minnesfil bara om något genuint nytt och varaktigt
lärdes den här sessionen.

## 4. Säkra

```bash
npm run backup          # robocopy → E:\backup\pwagames (hoppar tyst över om disken saknas)
```

## 5. Städa körningsläget

```bash
node scripts/korning.mjs visa      # finns en oavslutad körning?
node scripts/korning.mjs klar      # bara om den verkligen är klar
```

Är en körning **inte** klar: lämna checkpointen kvar och skriv i sessionsloggen exakt var den
står — den plockas upp med `/aterta`.

## 6. Rapportera

En kort avslutning till användaren:

```
Sessionen är avslutad.
  Byggt      <vad>
  Commits    <n stycken, senaste hash>
  Version    v1.NN  (byggd och serverad / inte byggd)
  Kvar       <öppna trådar, eller "inget">
  Backup     <klar / hoppades över, varför>
```

Ljug aldrig ihop den här listan. Blev något inte gjort ska det stå i "Kvar".
