---
description: Ny spelidé → färdigt, testat, spelbart spel i biblioteket
argument-hint: <fri svensk beskrivning av spelidén>
---

Bygg ett nytt spel ur idén: **$ARGUMENTS**

Läs skill **spel-pipeline** (stegen, kvalitetsgrinden, checkpoint-protokollet) och skill
**spelkontrakt** (GameModule-kontraktet) innan du börjar. Ladda **fysik-spel**, **ljud-och-rost**
eller **threejs-games** bara om idén kräver det.

## Steg 0 — spec-kortet (ENDA grinden)

Härled ur idén och visa ett kompakt spec-kort:

```
🎈 <TitleSv>  <ikon>
id           <asciiFold, matchar mappnamn>
kategori     <ur CATEGORIES>  → flik <ur TAB_GROUPS>
input        tap | drag | mixed          ålder  [n,m]
kärnloop     vad barnet gör, om och om igen
mål          det tillfredsställande "klart" som utlöser progress.complete()
agens        vilket VAL barnet gör som ändrar utfallet
variation    vad som skiljer omgång 2 från omgång 1
mottagare    vem som tar emot/jublar (Bobo/Elvira/figur)
finish       den spel-SPECIFIKA belöningen (inte generisk konfetti)
repliker     4–8 svenska meningar (intro, uppmuntran, beröm, om-cue)
```

Ställ bara en fråga om något är genuint tvetydigt — annars välj det rimligaste och notera
valet på kortet. **Vänta på användarens ja innan du går vidare.** Vid ändringsönskemål:
uppdatera kortet och fråga igen.

Skriv checkpoint innan du fortsätter:
`node scripts/korning.mjs start spel <id> --titel "<TitleSv>"`

## Steg 1–11 — kör utan fler stopp

Uppdatera checkpointen före varje steg (`node scripts/korning.mjs steg <namn> --nasta "..."`).

1. **plan** — `docs/games/<id>.md` ur `docs/games/_MALL.md`, ifylld med spec-kortet + plan.
2. **bygg** — implementera. Vid ett rikt spel: parallella `spelbyggare`-agenter
   (mekanik+mål · scen+juice+mottagare · ljud+röst) där EN äger filen och övriga levererar
   block. Vid ett enkelt spel: bygg själv. Kopiera närmaste mall (`klambubblor` tap,
   `rulla-bollen-hem` fysik, `glittergrottan` 3D).
3. **registrera** — import + rad i `src/games/registry.js`; nya repliker in i
   `scripts/voice-phrases.json`.
4. **kontroll** — `npm run check -- --game <id>` (strikt). Måste vara grön.
5. **test** — `npm run test <id>`. **0 konsolfel**, inklusive exit-mitt-i-animation-cykeln.
   Loopa fix → test tills grönt. Titta på skärmdumpen i `.test-shots/<id>.png` — ser scenen
   tom eller trasig ut är den inte klar även om testet är grönt.
6. **kritik** — `spelkritiker`-agent mot koden + skärmdumpen. Den svarar mot kvalitetsgrindens
   7 punkter.
7. **fix** — åtgärda kritiken, om-testa (`check` + `test` igen).
8. **commit** — `feat(<id>): <kort svensk beskrivning>` med explicita sökvägar.
9. **version** — bumpa MINOR i `package.json`, committa som del av samma omgång.
10. **leverans** — `npm run build` && `npm run serve`.
11. **logg** — post i `docs/SESSIONS.md`, rad i `docs/games/README.md`-indexet (status ✅),
    `npm run backup`, sedan `node scripts/korning.mjs klar`.

## Rapportera till slut

```
✅ <TitleSv> <ikon> ligger nu i fliken <flik>.
   Ladda om appen på plattan — leta efter v1.NN i versionspillret.
   <en rad om vad som gör spelet roligt>
   <ev. pending röstklipp — Web Speech täcker upp tills /rost körs>
```

Stannar något (test som inte blir grönt, blockerande tvetydighet): lämna checkpointen
uppdaterad, säg exakt var det står och vad som återstår. Hitta aldrig på att något är klart.
