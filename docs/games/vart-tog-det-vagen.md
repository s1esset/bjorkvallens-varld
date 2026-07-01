# Vart Tog Det Vägen? (`vart-tog-det-vagen`)
> 🥤 minne · tap · 3–5 år · status: 📝 plan klar

## 1. Nuläge (sett som spelare)

Det klassiska kopp-spelet på ett varmt träbord. 3–5 stora, programritade koppar
(trapets-kropp, rundad topp, glansremsa, vit kontur) står i en jämn rad med mjuka skuggor.
Spelet visar: alla koppar lyfts (`LIFT_Y`), en leksak-emoji (🐥⭐🍓…) syns under en av dem
med en `pop`. Kopparna sänks och **blandar** sig: `params.swaps` sekventiella parbyten med
lugna svep (`power1.inOut`), där koppen som flyttar bågar lätt över den andra och leksaken
**följer med sin kopp** (identitet via `_prizeCup`, inte slot). Sedan blir kopparna tryckbara
("Var tog den vägen?"). Rätt kopp → lyfts, leksaken hoppar fram, "correct" + gnistror + beröm.
Fel kopp → lyfts ~60px och visar tom plats, vinglar, sänks igen, "Kika igen!" — aldrig ett fel.

Svårighet (var 3:e lyckad runda, `ROUNDS_PER_LEVEL`): **fler koppar** (3 → max 5), **fler/
snabbare byten** (`swaps` 2→7, `swapDur` 0.7→0.36), och från nivå 3 blir **alla koppar samma
röda** så man måste följa rörelsen, inte färgen. Idle 6s → upprepad uppmaning; andra idle →
auto-hjälp som lyfter rätt kopp en stund.

**Funkar bra:** detta är genuint spännande på rätt sätt för åldern — blandnings-animationen är
tydlig och lugn, leksaken följer sin kopp korrekt (äkta minne/blickföljning), fel är helt
ofarligt ("kika igen"), och svårighetstrappan är genomtänkt och *meningsfull* (samma-färg-
vridningen från nivå 3 är riktigt smart). Koppgrafiken är fin, träffytorna stora (230×280).
Auto-hjälpen garanterar att ingen fastnar. En stark, komplett liten loop.

*(Skärmdump: tre koppar — gul, röd, blå — på träbordet, nedsänkta, redo att blandas/gissas.)*

## 2. Ursprunglig plan & tankeprocess

Kodhuvudet beskriver "hitta bollen"-spelet med uttrycklig no-fail-design: fel kopp visar bara
en tom plats och får trycka igen, idle ger auto-hjälp. Den pedagogiska kärnan är **arbetsminne
och visuell uppmärksamhet** — att hålla en plats i huvudet medan den rör sig. Svårigheten
designades att växa på *rätt* axlar: fler objekt, fler/snabbare byten, och borttagen färg-ledtråd
(nivå 3+) så att barnet tvingas från "följ den röda" till "följ rörelsen" — en verklig kognitiv
progression. Leksak-följer-kopp-via-identitet är medvetet (rör sig MED koppen).

## 3. Vad gör det lättjefullt / tunt

- **Den enda interaktionen är ett enda tryck per runda.** Barnet är passivt åskådare under
  visa- och blanda-faserna (kan inte röra, snurra, peta) och gör sedan *ett* tap. Det är
  spelets natur, men det betyder att agensen är minimal — ingen möjlighet att t.ex. själv lyfta
  en kopp och kika, sakta ner blandningen, eller välja svårighet.
- **Kopparna och leksakerna är utbytbar rekvisita.** Leksaken (`PRIZES`) slumpas men *gör*
  inget — den hoppar fram och försvinner. Ingen leksak har en egen reaktion (anka som kvackar,
  boll som studsar), ingen samlas, ingen kommer ihåg. Kopparna är rena geometriska former utan
  personlighet.
- **Blandningen är visuellt enformig.** Varje byte är samma `power1.inOut`-svep med samma
  båge. Ingen variation i bana (cirkulär virvel, korsande, falsk-rörelse-fint), inget tempo-
  crescendo inom en blandning, ingen "nästan-tappa"-fint. Svårare nivåer = bara fler likadana
  byten, snabbare.
- **Auto-hjälpen kan spela åt barnet ganska lätt.** Två idle-cykler (≈12s utan tryck) lyfter
  rätt kopp och pekar ut svaret. Rimligt som skyddsnät, men tröskeln + tydligheten gör att ett
  obeslutsamt barn snabbt får facit i stället för att uppmuntras att gissa.
- **Ljudet är tunt och generiskt.** 'pling'/'whoosh'/'reveal'/'correct'/'soft' + TTS-fraser.
  Inget kopp-mot-bord-"tock" vid sänkning, inget glids-ljud under blandningen, inget
  leksaks-specifikt ljud när den hittas (anka → kvack). Whoosh per byte blir monotont vid 7 byten.
- **Tom scen, ingen karaktär.** Bord på enfärgad bakgrund. Ingen figur som blandar kopparna
  (en gycklare/Bobo), ingen publik, ingen mottagare. Finalen är generisk konfetti.

## 4. Förbättringar & förhöjningar (plan)

### Kärnloop & agens
- **[Medium] Låt barnet "kika" före blandning.** En kort fas där barnet själv får trycka för
  att lyfta-och-titta på leksaken innan den göms — ger en aktiv handling i den annars passiva
  upptakten och förstärker minnesförankringen.
- **[Quick] Barn-styrt tempo.** En liten "Blanda igen / sakta"-känsla: t.ex. tryck-och-håll på
  bordet under blandningen saktar svepen lite (rent visuellt) — en mjuk agens utan att bryta no-fail.

### Variation & överraskning
- **[Medium] Varierade blandningsbanor.** Inför cirkulär virvel, korsande byten och en
  ofarlig "fint" (en kopp gör en falsk rörelse) så att ingen blandning ser exakt likadan ut.
  Skala upp variationen med nivån i stället för bara antal/tempo.
- **[Quick] Leksaks-reaktion vid fynd.** Låt den hittade leksaken göra sitt eget: ankan kvackar
  och vaggar, bollen studsar iväg, stjärnan snurrar och gnistrar. Tabell `prize → effekt`.

### Juice
- **[Quick] Riktiga ljud.** Ett mjukt "tock" när en kopp sänks mot bordet, ett lågt glids-/svisch
  under varje byte (varieras i tonhöjd), och ett leksaks-specifikt ljud vid fynd
  ([[real-audio-sfx]]). Stigande spännings-ton ju snabbare blandningen går.
- **[Quick] Spännings-känsla.** En lätt "trumvirvel"/andetag precis innan gissa-fasen, och en
  liten kamera-/scenfokus på kopparna under blandningen (mild). Gör ögonblicket innan tryck
  laddat.

### Progression
- **[Quick] Mjuka upp auto-hjälpen.** Låt första auto-hjälpen vara *delvis* (en kopp vippar
  bara lite, eller alla vippar snabbt så man får en repris) innan den lyfter och pekar ut rätt —
  så att gissandet uppmuntras längre innan facit ges.
- **[Medium] En synlig "skattkista".** Samla hittade leksaker i en liten hylla/kista mellan
  rundor — en konkret behållning som växer, en anledning att fortsätta.

### Karaktär & berättelse
- **[Deep] En gycklare/Bobo som blandar.** En figur med händer som faktiskt lyfter, blandar och
  avslöjar kopparna, reagerar finurligt ("Var är den nu?") och firar med barnet. Ger spelet en
  värd och förvandlar den passiva blandningen till en föreställning.

### Ljud
- **[Quick] Verifiera varierat vinst-sting** vid `complete()` och lägg en lågmäld, lite spänd
  bakgrunds-ambient som passar "magi-show"-tonen.

## 5. Status / loggar

- 2026-06-30: Doc skriven efter kodläsning + huvudlöst speltest (errorCount 0; 3 koppar i färg,
  blandning/gissa-loop verifierad). Inga kodändringar ännu.
- Rekommenderad första-omgång: **[Medium] varierade blandningsbanor + [Quick] leksaks-reaktion
  & riktiga kopp-/glids-ljud** — angriper den största tunnheten (enformig blandning + inert
  rekvisita) och gör varje runda visuellt och ljudmässigt distinkt.

- 2026-07-02: **Första-omgång implementerad** (rekommendationen ovan, hela paketet).
  - **Varierade blandningsbanor.** `_shuffle` bygger inte längre likadana par-byten i loop utan
    kallar `planMoves(count, n, level)` som planerar en lista av VARIERADE drag; varje drag läggs
    till tidslinjen av nya `_addMove`. Stilar: `over`/`under`/`cross` (vem som bågar framför),
    cyklisk `swirl` (tre koppar roterar ett steg, `fwd`/baklänges), samt ofarlig `feint` (falsk
    delrörelse). Variationen VÄXER med nivån (nivå 0 bara `over`; 1 lägger `under`; 2 `cross` +
    virvel om ≥3 koppar; 3 finter) i stället för bara fler/snabbare byten. Leksaken följer fortsatt
    sin kopp via identitet (`_prizeCup`) i alla drag; `order[]`/`_slot`/`_prizeSlot` uppdateras per
    drag som förr. Anti-upprepning av exakt samma par behållen (nu via `prevKey`-sträng).
  - **Leksaks-reaktion vid fynd.** Nytt `_reactPrize(ctx)` anropas i `_onTap`s rätt-gren (ersätter
    den gamla `pop(this._prize)`): `switch` på emoji ger eget nummer + eget ljud — 🐥 vaggar+kvackar,
    🐸 hoppar med boing, 🚗 kör iväg+vroom, 🎈 guppar upp+pip, 🐱 jamar, 🦋 fladdrar+gnistror,
    ⭐/🌟 snurrar ett varv+skimmer, 🍓/🍎 saftig kläm-puls, default puls+gnistror. Alla toner är
    `audio.tone(...)` (fire-and-forget); `this._prize` är persistent (gsap direkt ok, dödas i
    `destroy`); `_newRound` nollställer nu även `this._prize.rotation`.
  - **Riktiga kopp-/glids-ljud.** Nytt `_tock(ctx, vol)` (mjuk 150→90 Hz sinus) spelas när kopparna
    sänks efter reveal och när de "landar" i `_beginGuess`. Glid-ljudet per drag bytt från monoton
    `sfx('whoosh')` till `audio.tone` med tonhöjd som STIGER med `prog` (0..1 genom blandningen) —
    en mjuk spännings-crescendo i stället för samma svisch × 7.
  - Test: `node scripts/test-game.mjs vart-tog-det-vagen --url http://localhost:5173` samt med
    `--taps "640,400;400,400;880,400"` → **errorCount 0** i båda. Skärmdumpar bekräftar reveal
    (koppar lyfta, 🐥 syns) och pågående korsande byte (gul kopp bågar över blå) — inga stray-bars.
  - Deferred: [Medium] kika-före-blandning + barn-styrt tempo (agens), [Medium] skattkista-hylla,
    [Quick] mjukare tvåstegs-auto-hjälp, [Quick] trumvirvel/ambient före gissa-fas, [Deep] gycklare/
    Bobo som blandar (värd/föreställning), samt leksaks-specifika sample-klipp (kvack) om MOSS-SFX.
</content>
