# NATTPASS — tre ansiktsspel på en natt

*Skrivet 2026-08-15 (v1.224.0, master ren). Specarna står i `docs/IDEER.md` post 1.*
*När passet är klart: stryk den här filen och posten, och låt `docs/games/<id>.md` bära allt.*

## Så här startar ägaren passet

```
/aterta
```

…eller, om `.claude/state/korning.json` inte finns än (första starten):

```
Kör nattpasset i docs/NATTPASS.md
```

Ingen annan input behövs. Passet frågar aldrig om något — det landar det som blir klart och
skriver en rapport.

### Mandatet — därför får passet bygga utan att fråga

`/spel`s steg 0 är normalt en hård grind ("vänta på ja"). **Den är redan tagen:** de tre
spec-korten i `docs/IDEER.md` post 1 är fullständiga (id · titel · ikon · flik · input · ålder ·
kärnloop · mål · mottagare · variation · motgång med tak · finish · 7 röstliteraler var), och
**att ägaren startar passet är ja:et**. Passet börjar alltså på steg 1 (`plan`) och grindar
aldrig mot en människa.

Ändrar sig ägaren om en detalj: ändra spec-kortet i IDEER.md **innan** passet startas.

---

## Hårda regler för passet

1. **Ingen `git push`. Ingen `npm run deploy`.** Varje push publicerar sajten publikt på GitHub
   Pages. Allt committas lokalt på `master`; ägaren tittar på bilderna och publicerar själv på
   morgonen. **Ägarens uttryckliga beslut 2026-08-15 — inget undantag.**
2. **Grinden gäller varje spel:** `npm run check` grön + `npm run test <id>` med **0 konsolfel**
   och inga `fel`-nivåfynd — och **öppna skärmdumpen och titta på den själv**. Grönt test betyder
   bara "0 konsolfel"; tre av fyra fel i grävmaskinens polering syntes bara i bilden.
3. **En commit per spel**, explicita sökvägar, aldrig `git add -A`. Ämne på asciiFold-svenska:
   `feat(titt-ut-pappa): …`
4. **Checkpoint före varje steg** i `.claude/state/korning.json` (se skill **spel-pipeline**).
   Aldrig batcha. Dör strömmen mitt i natten ska `/aterta` kunna fortsätta på raden efter.
5. **Högst 3 subagenter samtidigt** (`spelbyggare` × 2–3, sen `spelkritiker`). Inga workflows,
   ingen deep-research — de kräver att ägaren ber om dem.
6. **Aldrig två webbläsarsonder samtidigt**, och aldrig en sond bredvid `npm run test:all`. De
   svälter varandras ticker och förfalskar varandras svar (kostade ett halvt pass en gång).
7. **Kontrollarmen först, alltid.** En ny sond som inte kan skilja två KÄNDA lägen åt säger
   ingenting om det okända. Uppmätt: 630 rader sond mot 459 rader spelkod på ett kvällspass —
   fråga varje gång om mätningen kan göras med en befintlig sond i stället.
8. **Rösten:** nya repliker läggs som literaler i `scripts/voice-phrases.json` (pending) allt
   eftersom, och `npm run voice` körs **en gång** för alla tre i slutet. Blir den röd: spelen
   funkar ändå via Web Speech-fallback, notera det i rapporten och gå vidare.

## Tidsbudget och avbrottsregel

Historiken säger 8–25 min per spel för enkla lyft och 77 min för det värsta. De här är medelstora
(ny konst, ingen fysikmotor): räkna **60–90 min per spel**.

**Avbrottsregeln:** passerar ett spel **2 timmar** utan grön grind — landa det som ÄR grönt,
skriv resten som taggade punkter i `docs/games/<id>.md` §4, committa, och **gå vidare till nästa
spel**. Två färdiga spel är oändligt mycket bättre än tre halva. Samma regel om samma test-fel
återkommer **3 gånger** efter olika fixar: parkera, dokumentera grundorsaken så långt den är
känd, gå vidare.

---

## Körordning — billigast och säkrast först

Ordningen är vald så att en natt som dör klockan tre lämnar färdiga spel efter sig, inte tre
halvbyggda. `flugan-pa-nasan` ligger sist för att den är den enda med en **öppen mätfråga**.

### 1 · `titt-ut-pappa` (🫣) — enklast, sätter mönstret för sektionen

Steg enligt `/spel` 1–11. Särskilt för det här spelet:

- **Konsten är arbetet, inte logiken.** 5–6 gömställen + ~6 överraskningar, alla fristående
  ritade objekt med egen silhuett och eget liv (P0 ASSETS). Använd `artikoner.js` där nyckeln
  finns (katt · anka · ballong) och `form.js`/`scene.js` för möblerna. **Aldrig en emoji i en ruta.**
- **Skvallret måste synas i skärmdumpen.** Bukten i gardinen, ögonen över kanten och skakningen
  är hela spelet — syns de inte i bilden finns de inte. Kör `node scripts/bildkoll.mjs` på
  dumpen och titta själv.
- **Ögonen över kanten:** `blick()` mot barnets senaste tryck. Riggens `view` maskas så bara en
  strimma syns — **maska aldrig genom att flytta `view`**, träffytan mäts mot den (`traffar()`).
- Träffytor: gömställena är möbler, så ≥96 px är gratis — men **kontrollmät ändå**, avstånd ≥24 px.

### 2 · `vakna-pappa` (😴) — riggens två oanvända lägen

- **Sömnmätaren är `liv({ takt })`.** Ett läge = en takt (3,4 → 2,4 → 1,8 → 1,4 → normal).
  ⚠️ `liv()` anropas en gång per lägesbyte — och det var precis så `mata-munnen` läckte en död
  tween per tugga in i ringbufferten. Rättningen finns i `_track()` (`tw.parent`), men **mät att
  listan inte växer**: `node scripts/_frysprobe.mjs` läser exakt det (spökmin · eviga tweens ·
  blinkar han fortfarande). Kör den mot det nya spelet innan commit.
- **Ett öga i taget:** `ogon_h` släckt medan `ogon_v` ligger kvar. Verifiera i bild med
  `node scripts/_ansiktebild.mjs --bara "vila,wink h"` — ett ansikte går inte att bedöma i tal.
- **Gäspningen:** långsamt `gap()` över ~1,2 s med `blink()` i toppen. Taket är 40 px käkfall;
  över det glider konturen utanför basen.
- **Snarkningen finns inte som klipp.** Bygg den procedurellt (`audio.tone()`: låg ton + långsam
  LFO + mjukt "puh" på utandningen) och lägg `snark` · `god-morgon` på ägarens inspelningslista
  i rapporten. **Blockerar inte.**
- **Rösten får aldrig kapas:** `voice.say()` kallar `cancel()` först, och klippen är 2,3–4,1 s
  medan `ctx.later()` oftast står på 2–3 s. Använd `_narTyst`-mönstret (`voice.kvar`/`voice.talar`
  + `audio.sampleDuration()`). Bilden kommer genast, orden köar.

### 3 · `flugan-pa-nasan` (🪰) — mät FÖRST, bygg sen

- **Steg 3a, före allt annat: blickflimret.** `blick()`s hysteres är inställd på en långsamt
  dragen matbit. Mät **lappbyten per sekund** när målet är en fluga, med en **långsam kontrollarm**
  (samma bana, 1/5 farten) bredvid i samma körning. Går det över ~3 byten/s läser det som ett
  ögonflimmer, inte som en blick.
  - Mät riggens EGET beteende, inte spelets: haka på `_blickTill()` eller läs `_blickNamn` per
    bildruta. Räkna **byten**, inte alfa.
  - **Känd reserv om talet är rött:** lågpassfiltrera flugans läge innan det matas till `blick()`.
    **Ändra inte riggens konstanter** — `mata-munnen` läser samma.
  - Finns talet inte att få billigt: bygg spelet med lågpassfiltret **på** från början och notera
    mätningen som ogjord i doc §4. Ett filter som kanske är onödigt är billigare än en natt i
    en sond.
- **Zonerna kommer ur `traffar()`**, inte ur en handstämd ellips. Den vägen är redan prövad och
  mätt som fel åt båda hållen samtidigt (32 % falsk yta, 19 % missat ansikte).
- **`blick_ner` när flugan sitter på näsan** — lappen finns, ingen har använt den så.
- Sylten dras med `DragController` (snäpp + tap-tap-fallback). ⚠️ Animera **aldrig** containern
  som `addTarget` fick — animera i ett barn, annars flyttar sig snäppytan mitt i ett släpp.
- Mottagaren är **Bobo** (maskoten) som stänger fönstret. Utan mottagare faller grind 4.

---

## Avslutning när alla tre är landade (eller natten är slut)

1. `npm run check` — grön.
2. `npm run voice` — töm röstkön för alla tre i klump. Röd? Notera, gå vidare.
3. `npm run test:all` — **ensamt, ingen sond igång**. Jämför flakighet mot HEAD innan något
   kallas ett fel; sviten flakar själv ibland.
4. Bumpa **MINOR** i `package.json` (versionspillret är förälderns kvitto).
5. `docs/SESSIONS.md`: en post — datum, version, vad som byggdes, commits, öppna trådar.
6. `docs/games/README.md`: en indexrad per nytt spel (status ✅ — nya spel landar aldrig som 🔧).
7. `docs/IDEER.md`: stryk post 1, flytta specarna till respektive `docs/games/<id>.md` §0.
8. `npm run backup` (robocopy → `E:\backup\pwagames`).
9. `.claude/state/korning.json` → `"steg": "klar"`, radera filen.
10. **Ingen push.** Se regel 1.

## Rapporten ägaren ska vakna till

Kort, ärlig, inga hedgningar. Exakt det här:

- **Vad som är klart och grönt** — per spel: titel, ikon, flik, commit-hash, versionspill att leta
  efter i appen.
- **Vad som INTE blev klart** och exakt varför (avbrottsregeln, en röd mätning, en trasig tjänst).
- **Vad ägaren ska titta på först** — en skärmdump per spel, och den enda fråga som faktiskt
  behöver ett mänskligt öga (t.ex. "flimrar blicken när flugan far?").
- **Ägarens inspelningslista** om den växte (`snark` · `god-morgon` · ev. fler).
- **Ett kommando att köra själv:** `npm run deploy` om allt ser bra ut.

## Om något går riktigt fel

| Symptom | Gör så här |
|---|---|
| `registry.js` trasig efter parallella agenter | verifiera **efter** att hela batchen landat; PAGEERROR som nämner symboler utanför den egna filen är transient |
| `npm run test` rött men bilden ser rätt ut | läs `.test-logs/<id>.json`; står `drag/ratt` på 0 har testet aldrig spelat spelet |
| samma fel 3 gånger efter olika fixar | parkera spelet, dokumentera i §4, gå vidare (avbrottsregeln) |
| en sond ger ett tal som verkar för bra | kör den mot **HEAD**. Röda sonder har varit den trasiga saken 7 gånger nu, och gröna kan mäta allt utom effekten |
| natten tar slut mitt i ett spel | committa det gröna, skriv §4, uppdatera `korning.json`, skriv rapporten ändå |
