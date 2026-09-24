---
description: Ge ett befintligt spel ett storbarnsläge (6–12 år) i fliken Utmaning
argument-hint: <spel-id> [valfritt: vad som ska bli svårare/djupare]
---

Ge spelet ett storbarnsläge: **$ARGUMENTS**

Körs **bara** när ägaren ber om det för ett namngivet spel — föreslå det aldrig oombett som
del av en annan uppgift.

Läs först: `CLAUDE.md` avsnitten **"P0 — grundlag"** och **"P0 per åldersband"** (storbarn),
skill **spelkontrakt** (avsnittet *Storbarnsläge av ett befintligt spel = en variantmodul*) och
skill **spel-pipeline** (grinden, med storbarnsraderna). Ladda **fysik-spel** / **sonder** /
**ljud-och-rost** vid behov.

## Så är ett storbarnsläge byggt

- **Varianten är ett eget spel:** `src/games/<id>-stor/index.js` sprider basspelet
  (`...bas`) och skriver om metadatan som literaler — `id: '<id>-stor'`, egen `titleSv`, samma
  eller ny `icon`, `category`, `input`, **`ageRange: [6, 12]`**, egen `voiceIntro`. Den får egen
  bricka i fliken **Utmaning**, egen progress, eget klistermärke och eget test. Mall:
  skill **spelkontrakt**.
- **Skillnaderna bor i BASSPELETS fil** bakom `ctx.band === 'stor'` (sätts av GameHost ur
  varianten ageRange). Läs flaggan i `init`/`mount`, lägg den i ett fält (`this._stor`) och
  förgrena där beteendet ska skilja sig.
- **Invariant: småbarnsläget är oförändrat.** Varje ändring i basspelet måste vara inert när
  `ctx.band === 'sma'`. Det är den enda regeln som inte får brytas här — basspelet är redan ✅.

## Steg 0 — storbarnskortet (ENDA grinden)

1. Läs `docs/games/<id>.md` och `src/games/<id>/index.js` (koden före docen — §4 kan vara
   inaktuell). Kör `npm run test <id>` och titta på `.test-shots/<id>.png`.
2. Leta upp det som gör spelet **för lätt eller barnsligt** för en 9-åring. Typiska ställen:
   auto-hjälp (`_autoHelp`, magneter, garanterade träffar, sikte som rättar sig), om-cues vid
   tystnad (~6 s), hinder med tak som bara saktar ner, bebisberöm i spelets egna repliker,
   tap-tap-fallback som gör precision onödig, en scen som är en skärm stor.
3. Visa kortet:

```
🏆 <Titel> Proffs — storbarnsläge av <id>
svårare      vad som nu KRÄVER skicklighet (och vilken hjälp som tas bort)
motgång      vad som kan gå fel, vad det kostar (liv · försök · checkpoint) — omstart <2 s
mål/poäng    vad som räknas och syns (poäng · stjärnor · rekord · tid) och var det sparas
kontroller   nya gester (håll · svep · två tummar) — eller "samma som bas"
värld        större än skärmen (kamera)? — eller "samma som bas"
tips         när ett enkelt tips visas (efter N missar på samma ställe / tipsknapp)
bort         om-cues · auto-hjälp · bebisberöm · …
repliker     intro + 3–6 rader i rak, sportslig ton
risk         vad i basspelet som kan påverkas (och hur småbarnsläget skyddas)
```

Har ägaren sagt vad som ska bli svårare: respektera det. **Vänta på ja.**

Checkpoint: `node scripts/korning.mjs start storbarn <id>-stor --titel "<Titel> Proffs"`

## Sedan — utan fler stopp

Uppdatera checkpointen före varje steg (`node scripts/korning.mjs steg <namn> --nasta "..."`).

1. **baslinje** — spara basspelets nuläge att jämföra mot: kör `npm run test <id>` och kopiera
   `.test-logs/<id>.json` + `.test-shots/<id>.png` till scratchpad. Finns det sonder för
   spelet (skill **sonder**, `scripts/_*probe*.mjs`): kör dem och spara talen.
2. **bygg** — förgreningarna i basspelet bakom `ctx.band === 'stor'`, sedan variantmappen.
   Poäng/rekord via `ctx.progress.setCustom` (ett misslyckat försök skriver aldrig över
   ett rekord). Nya repliker → `scripts/voice-phrases.json`.
3. **registrera** — import + rad i `src/games/registry.js` (varianten efter basspelet i
   GAMES-arrayen är inte nödvändigt; sist är bra — "Nyast" visar den först).
4. **kontroll** — `npm run check -- --game <id>` OCH `npm run check -- --game <id>-stor`, båda
   gröna. Skriv `docs/games/<id>-stor.md` (kort: §0 storbarnskortet, länk till basens doc för
   resten, §5 logg) — strikt check kräver den.
5. **test** — `npm run test <id>` (basen: jämför med baslinjen — samma fynd, samma bild) och
   `npm run test <id>-stor`. 0 konsolfel båda. Kör basens sonder igen: talen ska vara
   oförändrade. **Sond för storbarnsläget:** spela huvudkontrollen, låt ett försök misslyckas,
   mät omstarten (<2 s) och att rekordet står kvar. `scripts/_flikprobe.mjs --stor <id>-stor
   --sma <id>` bekräftar flik, `ctx.band` och berömlistan.
6. **kritik** — `spelkritiker` på `<id>-stor` (den spelar som 9-åring) och en snabb på `<id>`
   (småbarnsläget får inte ha blivit sämre). Åtgärda det som är rimligt, om-testa.
7. **commit** — `feat(<id>-stor): storbarnslage av <asciiFold-titel>` med explicita sökvägar
   (basspelets fil, variantmappen, registry, voice-phrases, docs).
8. **version** — bumpa MINOR i `package.json`.
9. **logg** — post i `docs/SESSIONS.md`; rad under **🏆 Utmaning** i `docs/games/README.md`;
   rad i basspelets doc §5 ("fick ett storbarnsläge, se `<id>-stor.md`"). `npm run backup`,
   sedan `node scripts/korning.mjs klar`.

## Rapportera till slut

```
🏆 <Titel> Proffs ligger nu i fliken Utmaning.
   <vad som känns annorlunda för en 9-åring — svårare hur, vad man jagar>
   Småbarnsläget i <flik> är oförändrat (<hur det mättes>).
   <ev. pending röstklipp — Web Speech täcker upp tills /rost körs>
```

Publicering (`npm run deploy`) sker bara när ägaren ber om det.
