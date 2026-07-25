---
description: Återuppta en pipeline-körning som avbröts (krasch, strömavbrott, stängd session)
---

Återuppta den avbrutna körningen.

## 1. Läs checkpointen

```bash
node scripts/korning.mjs visa
```

Finns ingen aktiv körning: säg det, kolla `git status` + `docs/SESSIONS.md` efter halvlandat
arbete, och fråga vad som ska göras. Hitta inte på en körning att fortsätta.

## 2. Lita på verkligheten, inte på filen

Checkpointen säger vad som *påbörjades* — inte vad som hann bli klart innan strömmen gick.
Verifiera varje påstått avklarat steg mot disken **innan** du fortsätter:

| Påstått steg | Verifiera med |
|---|---|
| `plan` | finns `docs/games/<id>.md` och är den ifylld? |
| `bygg` | finns `src/games/<id>/index.js` och är den komplett (inte halvsparad)? |
| `registrera` | importeras spelet i `registry.js` och ligger det i `GAMES`? repliker i `voice-phrases.json`? |
| `kontroll` | `npm run check -- --game <id>` |
| `test` | `npm run test <id>` — kör om, lita inte på ett gammalt resultat |
| `commit` | `git log --oneline -5` — finns commiten? `git status` — är trädet rent? |
| `version` | matchar `package.json` den commit som gjordes? |
| `leverans` | finns `dist/` från efter ändringen? svarar servern på :4173? |

**Stämmer inte filen med verkligheten vinner verkligheten** — uppdatera checkpointen
(`node scripts/korning.mjs steg <verkligt steg>`) och fortsätt därifrån.

## 3. Fortsätt

Läs kommandots egen beskrivning (`.claude/commands/<kommando>.md`) och skill **spel-pipeline**,
och kör resterande steg i ordning. Har grinden (`spec`-steget för `/spel`, `steg 0` för
`/polera`) redan passerats behöver du **inte** fråga igen — godkännandet gäller fortfarande.

Ett halvsparat spel efter en krasch kan ha syntaxfel som slår ut hela dev-bundlen (registret
importerar alla spel). Får du PAGEERROR eller timeout på `window.__barnspel` direkt: kolla
spelets fil för avhuggen kod först.

## 4. Avsluta som vanligt

Kör körningen hela vägen till `logg`-steget och `node scripts/korning.mjs klar`.

Rapportera var körningen stod, vad som visade sig redan vara gjort, och vad du körde om.
