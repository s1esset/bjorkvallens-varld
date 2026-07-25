# <Titel> (`<id>`)

> <kategori> · <input> · <ålder> · <status-emoji>
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

## 0. Spec (fylls i av `/spel` innan kod skrivs)

| | |
|---|---|
| **id** | `<asciiFold, == mappnamn>` |
| **titleSv** | <med å/ä/ö> |
| **icon** | <emoji> |
| **kategori** | <ur CATEGORIES> → flik <ur TAB_GROUPS> |
| **input** | tap \| drag \| mixed |
| **ålder** | [n, m] |
| **kärnloop** | <vad barnet gör, om och om igen> |
| **mål** | <det tillfredsställande "klart" som utlöser progress.complete()> |
| **agens** | <vilket VAL barnet gör som ändrar utfallet> |
| **variation** | <vad som skiljer omgång 2 från omgång 1> |
| **mottagare** | <vem som tar emot/jublar> |
| **finish** | <den spel-SPECIFIKA belöningen> |

**Röstrepliker**
```
"<intro — sägs vid mount>"
"<uppmuntran mitt i>"
"<beröm vid delmål>"
"<om-cue vid ~6s inaktivitet>"
```

## 1. Nuläge (sett som spelare)

Vad möter spelaren? Kärnloop, kontroller, visuellt, ljud, progression. Vad funkar.
(+ skärmdumpsreferens `.test-shots/<id>.png`)

## 2. Ursprunglig plan & tankeprocess

Designintentionen: det pedagogiska/lek-målet, varför just den här mekaniken.

## 3. Vad gör det lättjefullt / tunt

Ärlig spelarkritik: var det är en minimal MVP, var loopen är grund, saknad juice/variation/
djup/karaktär, repetition, billiga lösningar.

## 4. Förbättringar & förhöjningar (plan)

Prioriterad, taggad lista — **[Quick]** (timmar) · **[Medium]** (en pass) · **[Deep]**
(omdesign). Grupperad: Kärnloop · Variation · Juice · Progression · Karaktär · Ljud.

## 5. Status / loggar

Klart-bockar och commits när förbättringar genomförs. En rad per omgång:
`2026-07-25 · <vad som gjordes> · <commit-hash>`
