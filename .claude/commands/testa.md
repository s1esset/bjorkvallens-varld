---
description: Kör headless-test (ett spel, flera eller alla) och rapportera läget
argument-hint: [spel-id | alla]  (tomt = alla)
---

Testa: **$ARGUMENTS**

## Förutsättning

Harnessen driver appen via `window.__barnspel`, som är **DEV-only** → den kräver dev-servern
på 5173 och funkar **inte** mot preview-bygget (4173). Kolla att dev-servern kör; starta den
annars (`npm run dev` i bakgrunden). Håller något annat porten 5173 väljer Vite nästa lediga
port — läs utskriften och skicka `--url http://localhost:<port>`.

## Kör

```bash
npm run check                 # kontrakt, registry, P0, docs, röst-täckning
npm run test <id>             # ett spel   (dragspel får automatiska musdrag)
npm run test:all              # alla spel parallellt
```

Varje körning gör: gå in i spelet → tryck/dra brett → skärmdump → **exit-cykel**
(spel → bibliotek → spel → meny) mitt i eventuella animationer → rapportera konsolfel.

## Bedöm

- **Konsolfel = fel.** Ett spel med fel är inte klart, oavsett hur det ser ut.
- **Titta på skärmdumpen** i `.test-shots/<id>.png`. Ett grönt test med en tom eller trasig
  scen betyder att testet missade kärnloopen — säg det i stället för att rapportera "grönt".
- Ett PAGEERROR som nämner symboler från ett **annat** spel är en transient sidoeffekt av att
  registret importerar alla spel (t.ex. mitt i en redigering) — kör om.
- WebGL `CONTEXT_LOST`-varningar headless är en GPU-artefakt, inte en bugg.

## Rapportera

En kort tabell: spel · grön/fel · antal fel. För varje fel: filen, den troliga orsaken och om
det är ett riktigt fel eller ett harness-artefakt. Föreslå `/fixa <id> <problem>` för det som
behöver åtgärdas — men **fixa inget** i den här körningen om användaren inte ber om det.
