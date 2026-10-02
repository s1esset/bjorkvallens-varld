# CLAUDE.md — Björkvallens Värld

Offline-first, installerbar **PWA med minispel i två åldersband** — **småbarn 2–5 år** och
**storbarn 6–12 år** — helt på svenska. Tablet-först. Ett tunt skal (splash → meny → bibliotek →
spel) kör fristående **spelmoduler** med ett delat kontrakt. Stack: PixiJS v8 · three.js
(dynamiskt) · matter.js · GSAP · Vite 5 · vanilla ESM. Motorerna är **verktyg att välja mellan
per spel** — se skill **fysik-spel** för vilken som passar när (egen integrator · matter ·
SPH-vätska · three).

## P0 — grundlag: gäller varje skärm och spel, i BÅDA åldersbanden

```
UPPLÖSNING    1280×720 landskap, Math.min letterbox (contain)
ÅTERKOPPLING  varje pekning → ljud+bild <100 ms. Aldrig summer, rött kryss, skam eller
              tillsägelse — ett misstag får SYNAS, aldrig straffa barnet som person
ASSETS        spelobjekt ritas FRISTÅENDE — aldrig en emoji/ikon i en ruta, bricka eller box.
              Egen silhuett, egen form, eget liv (vilo-guppning, reaktion vid tryck). Paneler
              och kort får bära TEXT och UI-kontroller, aldrig spelobjekt. En emoji duger som
              detalj ovanpå ett riktigt ritat föremål, aldrig som hela föremålet.
NAVIGATION    ikon-först; talad svensk instruktion + repetera-knapp per skärm. Hem/avsluta är
              alltid ETT tryck — aldrig en gest
GRIND         tryck-och-håll 2,5 s före inställningar/avsluta/ta bort/nollställ/länkar
ALDRIG        reklam, spårning, analytics, nätanrop vid körning, köp, FOMO — och att SPARADE
              framsteg (upplåsta banor, klistermärken, rekord) går förlorade
DATA          endast localStorage JSON, ingen PII lämnar enheten
SVENSKA       å/ä/ö i UI/röst; asciiFold (a/a/o) för id:n, filnamn, ljudnycklar, commits
KARAKTÄRER    avbildade människor heter ENDAST Zacke/Alissa/Elvira/Lova (djur, monster och
              maskoten Bobo undantas). FOTOkaraktärer heter en ROLL: Pappa/Mamma — se
              lib/theme.js (CHARACTERS · ROLLER)
EXIT-SÄKERT   spelaren kan lämna mitt i en animation → _alive-flagga + feedback.js-hjälparna
```

## P0 per åldersband — spelets `ageRange` avgör vilket som gäller

Ett spel tillhör **ETT** band: `ageRange[0] ≥ 6` = storbarn (`bandFor()` i `lib/theme.js`, i
spelet `ctx.band` = `'sma'` | `'stor'`). `check.mjs` vägrar ett ageRange som går över 6.
Storbarnsspel syns **bara** i fliken **Utmaning** 🏆 (dold tills det första finns). Ett
**storbarnsläge av ett befintligt spel** byggs bara när ägaren ber om det — kommandot
**`/storbarn <id>`** (en variantmodul, basspelets småbarnsläge rörs inte).

### SMÅBARN 2–5 år — flikarna Roligt · Fysik · Pussel · Lära

```
TRÄFFYTA      ≥96px (2cm), avstånd ≥24px, +24px osynlig hit-halo
GESTER        JA: tap, enkel drag (snäpp + tap-tap-fallback). NEJ: dubbeltryck, långtryck,
              pinch, rotation, multitouch, snabbsvep-nav
LÄSNING       noll — ikon, form, färg och röst bär allt
FEL TRYCK     alltid ROLIGT (wiggle + mjukt neutralt ljud), aldrig ett "fel"
MOTGÅNG       hinder och bakslag är TILLÅTNA och gör spelet bättre (något blir smutsigt igen,
              välter, kommer i vägen). De ska gå att anpassa sig runt och som mest SAKTA NER.
              Krav: rolig ton, tydlig orsak, går att åtgärda direkt, TAK på hur mycket som kan
              gå fel samtidigt, lagom takt. Svårighet = eftertanke, aldrig stress eller skam.
MÅL           ingen synlig poäng, ingen tidspress, inget misslyckande som avslutar eller
              nollställer, ingen "game over". Belöning = 1–2 s firande + svenskt beröm + klistermärke
HJÄLP         får komma av sig själv — SENT och SYNLIGT ("Jag hjälper till!"). Skicklighet ska
              kännas, aldrig krävas
PÅMINNELSE    mjuk om-cue vid ~6 s inaktivitet
```

### STORBARN 6–12 år — fliken Utmaning

```
TRÄFFYTA      ≥72px, avstånd ≥16px, +24px osynlig hit-halo. Kontroller man trycker BLINT på
              om och om igen (hoppa, styra, skjuta) ≥96px
GESTER        allt som ger bättre kontroll: håll inne (ladda, gasa), dubbeltryck, svep som
              SPELHANDLING, multitouch (två tummar: styr + hoppa), pinch/rotation som mekanik.
              Tap-tap-fallback är valfri. Aldrig en gest som enda väg till navigation
VÄRLD         får vara större än skärmen — sidoscroll, plattformsspel, top-down-värld
              (`lib/kamera.js`). UI och kontroller sitter fast i skärmen
LÄSNING       tillåten som stöd (siffror, poäng, korta ord) — men ikon först, rösten kvar
MOTGÅNG       på riktigt: ett försök kan misslyckas, liv kan ta slut, banan börjar om från en
              checkpoint. Svårighet får KRÄVA skicklighet och eftertanke. Krav: tydlig orsak,
              snabb omstart (<2 s till nytt försök), rimlig kurva. Tonen är rak och sportslig
              — inte inramad, ombonad eller barnslig
MÅL           synlig poäng, stjärnor per bana, rekord per profil och tidslopp är TILLÅTNA. En
              runda får ta slut ("försök igen"), men barnet kastas aldrig ut ur spelet
HJÄLP         ALDRIG automatisk hjälp som siktar, drar eller lyckas åt barnet. Bara ett ENKELT
              TIPS när det behövs — efter upprepade misslyckanden på samma ställe, eller på
              en tipsknapp
PÅMINNELSE    inga om-cues vid tystnad — barnet får tänka ifred
BERÖM         `complete()` väljer ur `PRAISE_STOR` ("Snyggt!", "Grymt!"); spelets egna
              repliker håller samma ton — aldrig "Vad duktig du är!"
TEST          harnessens autotryck provar varken håll, multitouch eller en värld bortom
              skärmen — spelet är inte testat förrän en sond har spelat dess HUVUDKONTROLL
```

## Kommandon

| Verktyg | |
|---|---|
| `npm run dev` | dev-server :5173 |
| `npm run check` | kontrakt + P0 + registry + röst |
| `npm run test <id>` | headless + bildkoll, 0 fel krävs |
| `npm run test:all` | alla spel parallellt |
| `npm run build` · `serve` | bygge → :4173 (bara lokalt) |
| `npm run backup` | robocopy → E:\backup |
| `npm run voice` · `sfx` | offline-klipp (PowerShell) |
| `npm run deploy` | grind → push → **GitHub Pages** |

Appen ligger publikt på **<https://s1esset.github.io/bjorkvallens-varld/>** (repo `s1esset/bjorkvallens-varld`).
Varje push till `master` publicerar via `.github/workflows/deploy.yml` — kör `npm run deploy`, som
vägrar publicera med ocommittat arbete, röd `check` eller fel gren. Föräldrarnas installationssida
är `public/start.html`. PWA-flödet (service worker, precache, uppdatering) går att mäta på
`localhost`: `npm run build && npx vite preview --port 4173` (`_uppdatprobe.mjs`) — bara
install-prompten kräver HTTPS. `npm run serve` startas från **PowerShell** (via Bash faller
`start.ps1` på teckenkodningen).

## Var kunskapen finns (ladda vid behov — läs inte allt i förväg)

| Ska du… | Skill / dok |
|---|---|
| skriva eller ändra ett spel | skill **spelkontrakt** |
| ge ett befintligt spel ett storbarnsläge (bara på ägarens begäran) | kommando **`/storbarn <id>`** |
| köra en pipeline, avsluta/återuppta | skill **spel-pipeline** · `docs/PIPELINE.md` |
| fysik, sikte, banförhandsvisning | skill **fysik-spel** |
| ljud, musik, röst, klipp-generering | skill **ljud-och-rost** |
| skal, skärmar, spardata, PWA, telefon | skill **skal-och-data** |
| 3D / shaders | skill **threejs-games** · **threejs-shaders** |
| UI-design, tokens, versionspill | `docs/DESIGN.md` |
| ett specifikt spels nuläge + plan | `docs/games/<id>.md` (index: `docs/games/README.md`) |
| rapporterade buggar som väntar på fix | `docs/ATGARDER.md` |
| parkerat arbete som inte är spel (distribution, miljö, beslut) | `docs/BACKLOG.md` |
| se vad ett spel FAKTISKT gör (input·fysik·render·fel) | `src/lib/gamelog.js` → `.test-logs/<id>.json` |
| MÄTA något (balans · bild · fysik · stillhet · tweens · exit · PWA) | skill **sonder** — hela sondkatalogen |
| vad bilden avslöjar (trösklar + kalibrering) | `scripts/bildkoll.mjs` |
| vad som hände senast | `docs/SESSIONS.md` (äldre sessioner och avklarade åtgärder: `docs/arkiv/`) |
| spelidéer som väntar på planering | `docs/IDEER.md` |
| app-breda lyft (motor · assets · rendering) | `docs/LYFTPLAN.md` |
| fysikbibliotekens plan (bildtakt · kontroller · nya features) | `docs/FYSIKPLAN.md` |

## Tysta fällor — kostade tid på riktigt, gissa inte om dem

En rad per fälla. Hela berättelsen (mätningar, spel, sonder) står i skillen inom parentes, under
rubriken **Tysta fällor** sist i filen. Läs den innan du rör ämnet.

**Planering** (skill spel-pipeline): docens §4 kan vara inaktuell, så läs `index.js` först och
pröva köpostens PREMISS mot koden. Faller den, skriv om posten och bygg inte något större ·
`korning.mjs` har egna verb (`steg`, `notis`).

**Test och mätning** (skill sonder): grönt test = bara "0 konsolfel". Auto-draget träffar inte
föremålen (`drag/ratt` 0), autotrycken når inte bortom x 950 / y 600, och bildrutemått mättas av
vsync. Spela ≥2 rundor otåligt · redigera aldrig `src/` medan en sond kör · aldrig två
webbläsarsonder samtidigt · kontrollarm (HEAD eller känd barlast) FÖRST · flaky svit attribueras
bara med `_ab.sh` · isolera en effekt genom att dölja allt UTOM dess lager, mät i en ruta, läs
svängning · pixelantal = yta, styrkan bor i alfan · färgskillnad mäts inte i luminans · tona in
ur genomskinligt (`fadeTopFill`) i stället för att matcha en glidande bakgrund · `sparkle`/`puff`
= ett `ParticleContainer` · ett antal säger inget om identitet (`_vilkaprobe`) · mät den RITADE
geometrin · sonder ligger i `scripts/` · lista `scripts/_*probe*` innan du döper en ny.

**Pixi och spelkod** (skill spelkontrakt): ett släpp bubblar aldrig till ett syskon, så
`pointerup` ska sitta på gemensam förälder med `eventMode='static'` · egna fält får inte heta
`_cx/_cy/_sx/_sy` · `arc()` fortsätter en öppen väg, så använd `bage()` ur `lib/form.js` och kör
`_bagprobe` efter Pixi-uppgradering · aldrig `generateTexture`, och ingen ny `FillGradient` per
montering (cacha per färg) · en radiell gradient kan inte ha genomskinlig mitt och kostar 256×
linjär · ett vilande `ParticleContainer` på `fxLayer` måste kunna rivas · animera aldrig
`addTarget`-containern, animera ett barn · tween-listor: rensa FÄRDIGA (`tw.parent`), skydda
`repeat: -1` · `killTweensOf(rot)` når inte barnbarnen · konst och träffyta är två budgetar,
så mät mot grannens `hitArea`.

**Fysik** (skill fysik-spel): `restitution` på en statisk kropp nollas, använd `studs` ·
`setPosition(…, true)` på en statisk kropp lämnar en evig fart · leddämpning bromsar stelt snurr
· `Flytvolym` verkar även ovanför ytan · `Mjukkropp` stegar med FAST tidssteg (ackumulator) ·
`Mjukkropp.path()` är ingen polygon.

**three.js** (skill threejs-games): biblioteket loggar konsolfel innan ditt `catch`, så hämta
contexten själv · "context loss … blocked" är en spärr, spelet måste klara sig utan resursen.

**Ljud och röst** (skill ljud-och-rost): bara `voice.say('literal')` får ett klipp ·
`voice.say()` kapar förra repliken, så köa med `ctx.narTyst` och hoppa över utrop med
`if (!voice.talar)` · töm röstkön med `npm run voice` · loopar tystas av
`audio.stopAllLoops()` · stämda ljud (`correct`/`match`/`pling`) byts aldrig mot samplade.

## Arbetsregler

- **`old/` är arkiverat skräp** — läs, greppa eller citera aldrig något därunder.
- **Grind före commit:** `npm run check` grön + `npm run test <id>` med 0 konsolfel och inga
  `fel`-nivåfynd. En commit per spel, explicita sökvägar, aldrig `git add -A`.
  Commit-ämnen på asciiFold-svenska. **`git push` bara till `origin master`** (publikt repo
  `bjorkvallens-varld`) — varje push publicerar sajten via GitHub Actions, så grinden måste
  vara grön FÖRE pushen. Aldrig push till någon annan remote eller gren.
- **Bumpa MINOR i `package.json`** per ändringsomgång; versionspillret är förälderns kvitto.
  Skriv omgångens post i **`src/lib/nyheter.js`** (menyns Nyheter-ruta, på förälderns språk —
  vad barnet märker, inga filnamn). `npm run check` varnar när den aktuella versionen saknar en.
- **Nya spel landar som ✅, aldrig 🔧** — kvalitetsgrindens 8 punkter i skill **spel-pipeline**.
- **Mät, resonera inte.** Balans, trösklar och "känns det rätt?" avgörs med en sond som spelar
  spelet och jämförs mot HEAD — aldrig med ett antagande i huvudet.
- **Webbläsare:** använd node-harnessen (`npm run test`) i första hand. Behövs en *levande*
  webbläsare: claude-in-chrome. Playwright-MCP endast som fallback — kör aldrig båda i samma uppgift.
- **Agenter:** upp till **3 subagenter** får startas oombett när uppgiften tjänar på det
  (pipelinens `spelbyggare` · `spelkritiker` · `felsokare`). Fler än 3 — fråga först.
  Workflows och deep-research kräver alltid att ägaren ber om det.
- **Assets utifrån:** bara CC0 (Kenney m.fl.), aldrig CC-BY — appen har ingen credits-yta.
  Allt bäddas in offline. Lokalt CC0-bibliotek (Kits Library, 547 MB, committas aldrig):
  `assets-src/kits-library-assets-main/` — plocka ut, skala till webp under `public/bilder/<kit>/`;
  stilkrocken och märkena som ska sorteras bort står i `docs/BACKLOG.md` #4.
