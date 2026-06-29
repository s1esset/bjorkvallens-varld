# Byggplan 2 — 25 NYA spel (vågen efter de 41 första)

Mål: **25 helt nya, mer polerade spel med bättre fysik och mer spelarpåverkan** (hur mycket
barnet kan ändra utfallet). Inga dubbletter mot de 41 befintliga. Teman som ska återkomma:
**element** (eld/vatten/jord/luft/blixt/is), **bajs & kiss** (glatt, snällt), **spindel-hjälte**
(egna, EJ Marvel) och **enhörningar/Elvira**. Avbildade människor heter ENDAST
**Zacke / Elvira / Alissa / Lova** (se `lib/theme.js`, [[character-names]]).

Allt enligt `CLAUDE.md` (P0-regler: 96px träffytor, 1280×720, endast positiv feedback, inget
"game over", talad svenska + repris, exit-säkra partiklar). Fysikspel bygger på
`src/lib/physics.js` (matter.js), `src/lib/launcher.js` (AimLauncher m. kalibrerad förhandsvisning),
`src/lib/scene.js` (bakgrunder) och `src/lib/feedback.js` (juice). Varje spel har en egen full
byggspec i `docs/games/<id>.md`. Status spåras i `game-progress.md` (rot).

## Designprinciper för DENNA våg (höjd ribba)

- **Mer spelarpåverkan:** varje spel ska ha ≥2 kontroller som tydligt ändrar utfallet
  (t.ex. placering + vikt, sikte + vind, timing + kraft). Inte bara "tryck och titta".
- **Riktig fysik där det går:** matter.js för rull/studs/stapling/pendel; egna men *kalibrerade*
  integratorer för partiklar (eld, sand, glitter, bubblor) — förhandsvisning ska matcha flykten.
- **Polerad känsla:** scene.js-bakgrund som FÖRSTA barn, mjuka skuggor via Graphics (ej filter),
  konsekvent juice (bounceIn/pop/sparkle/burst), 1–2s firande, klistermärke.
- **Aldrig fel:** missar är roliga (wiggle/puff/fniss) + mjuk auto-hjälp garanterar att barnet lyckas.

## De 25 spelen (byggs uppifrån och ner; yngre/enklare först inom varje grupp)

| # | id | Titel | Ikon | Kategori | Input | Ålder | Tema | Fysik | Kärnmekanik & spelarpåverkan (mål) |
|---|----|-------|------|----------|-------|-------|------|-------|-------------------------------------|
| 1 | `regnbagsmalaren` | Regnbågsmålaren Elvira | 🌈 | roligt | drag | 2–4 | enhörning/ljus | egen (måleri-mask) | Dra fingret → Elviras enhörning flyger och målar en tjock regnbågsrand; sveps fram/tillbaka fyller banden färg för färg. **Påverkan:** dina streck målar den. **Mål:** hel regnbåge → solen går upp, världen blommar. |
| 2 | `pruttbad` | Pruttbubbelbad | 🛁 | roligt | tap | 2–4 | bajs/kiss | buoyancy (plask-toolkit) | Zacke i bubbelbad; tryck på magen → en prutt släpper bubblor som stiger (lyftkraft) och poppar med fniss; hårdare tryck = större bubbla. **Påverkan:** var/hur du trycker = bubblors storlek & fart. **Mål:** poppa X bubblor / fyll badet. |
| 3 | `valpens-bajs` | Valpens Bajs | 🐶 | motorik | tap | 2–4 | bajs | enkel gång + plopp | Gå Lovas valp i parken (tryck dit den ska gå); ibland sätter den sig och bajsar; dra/tryck bajstången för att skyffla bajset i tunnan innan flugorna kommer (flugor = bara roliga, aldrig straff). **Påverkan:** styr hunden + tajma skyffeln. **Mål:** håll parken ren / fyll tunnan. |
| 4 | `enhorning-glitterbajs` | Enhörningens Glitterbajs | 🦄 | roligt | drag | 2–4 | enhörning+bajs | matter.js (studsande pellets) | Mata Elviras enhörning glittermat (dra), den tuggar och **prutt-bajsar** ett regn av glitterpellets som studsar; samla dem i en skattburk. **Påverkan:** hur mycket du matar = hur mycket glitter. **Mål:** fyll burken. Prutt/plopp-SFX + gnistor. |
| 5 | `tvatta-djuret` | Tvätta Djuret | 🧽 | motorik | drag | 2–4 | omsorg | egen (lera-mask + droppar) | Ett lerigt djur (Alissas ponny / en gris); dra svampen för att skrubba bort lera (avtäck ren päls), dra duschen för att skölja → bubblor, sen skakar djuret & glittrar. **Påverkan:** skrubba överallt + skölj. **Mål:** helt rent. |
| 6 | `ballonglyft` | Ballonglyft | 🎈 | larande | tap | 2–4 | fysik | lyftkraft + räkning | En tung låda (Bobos present) ska upp till Elvira på balkongen; tryck för att fästa heliumballonger — varje ger lyft; för få = stannar, lagom = svävar upp, poppa en = sjunk. **Påverkan:** antal ballonger trimmar höjden. **Mål:** sväva lådan till plattformen. |
| 7 | `gungan` | Gungan | 🐧 | fysik | tap | 2–4 | fysik/pendel | matter-pendel/resonans | Lova på en gunga; tryck i takt med gungan för att pumpa högre (resonans — knuff i rätt fas ger energi); nå högt nog att nudda fågeln / ta äpplet. **Påverkan:** timing av knuffar. **Mål:** nå målhöjden. Förlåtande fönster; faller aldrig av. |
| 8 | `lagerelden` | Lägerelden | 🔥 | roligt | mixed | 2–4 | eld+luft | egen (eld-partiklar ∝ luft) | Bygg en lägereld: dra vedpinnar på högen, svep/tryck bälgen för att blåsa luft → lågorna växer (eld-partiklar reagerar på luft), rosta marshmallow som Zacke håller. **Påverkan:** luftmängd + ved styr lågan. **Mål:** lagom stor eld → marshmallowen blir gyllene. Aldrig "brinner upp". |
| 9 | `spindelnatet` | Spindelnätet | 🕷️ | motorik | tap | 2–4 | spindel | matter.js (fallande objekt) | Godis/insekter faller uppifrån; tryck för att skjuta en nättråd som fångar det fallande och drar in det till nätet i mitten. **Påverkan:** sikte/timing på nät-skotten. **Mål:** samla X godis i nätet. Missar studsar mjukt. |
| 10 | `magnet-fiske` | Magnetfiske | 🧲 | drag | drag | 2–4 | fysik/magnet | radiell dragkraft | Dra en magnet på ett spö över en damm; metallfiskar/nycklar/mynt dras mot den (attraktion) och fastnar, lyft upp dem till hinken. **Påverkan:** magnetens läge; bara metall fastnar (trä-ankor inte). **Mål:** fånga metallsakerna. |
| 11 | `fallskarmen` | Fallskärmen | 🪂 | fysik | drag | 3–5 | luft | luftmotstånd + vind | Zacke/Lova svävar ner i fallskärm; dra vänster/höger för att styra genom brisen (vindbyar knuffar), sikta på studsmattan/målet. **Påverkan:** styrning kontra vind. **Mål:** landa mjukt på målet. Ingen krasch — alltid mjuk landning. |
| 12 | `enhorningen-flyger` | Enhörningen Flyger | ✨ | fysik | drag | 3–5 | enhörning | glid-momentum | Styr flygande Elvira-enhörning upp/ner (dra, mjuk glidning) genom svävande ringar och samla stjärnor; lätt momentum (hon glider, snäpper inte). **Påverkan:** kontinuerlig styrning. **Mål:** flyg genom alla ringar / samla stjärnorna. Mjuka moln, bara studs vid nudd. |
| 13 | `spindel-zacke-svingar` | Spindel-Zacke Svingar | 🕸️ | fysik | tap | 3–5 | spindel/pendel | matter-pendel | Spindel-Zacke hänger i ett nät som en pendel; tryck för att skjuta nytt nät till nästa fäste och svinga framåt (släpp-i-rätt-stund-timing, förlåtande). **Påverkan:** timing av nät-släpp styr landningen. **Mål:** svinga över taken och rädda kattungen / nå Elvira. Auto-hjälp: faller aldrig (ett moln fångar, fniss). |
| 14 | `bowling` | Bobos Bowling | 🎳 | fysik | drag | 3–5 | fysik | matter.js (käglor) | Sikta + kraft (AimLauncher) → rulla klotet i banan och slå käglorna; käglor välter med matter.js. **Påverkan:** sikte + kraft, valbar kant-bumper. **Mål:** slå alla käglor (auto-reset, ingen rännstens-miss — bumpers puffar). |
| 15 | `flipperspel` | Flipperspel | ⭐ | fysik | tap | 3–5 | fysik | matter.js (kula+flippers) | Barn-flipper: tryck vänster/höger för att slå stora paddlar, håll kulan studsande mot bumpers som tänds och spelar toner; en kula som rinner ut serveras mjukt igen (ingen miss). **Påverkan:** flipper-timing. **Mål:** tänd alla bumpers / träffa målen. |
| 16 | `kulbana` | Kulbanan | 🟡 | pussel | drag | 3–5 | fysik | matter.js (rull) | En kula släpps uppifrån; dra/rotera lutande ramper och trattar på plats så kulan rullar ner och landar i hinken. **Påverkan:** placera ramper före/under släppet; släpp om för nytt försök. **Mål:** kulan når målhinken. |
| 17 | `snobollen` | Snöbollen | ⛄ | fysik | drag | 3–5 | fysik/vinter | matter.js (växande massa) | Rulla en snöboll nerför backen (dra för att styra); den växer (massa + radie) i snön och får fart att välta mål / klumpa ihop till en snögubbe. **Påverkan:** styrlinjen plockar snö & träffar mål. **Mål:** bli stor nog + nå snögubbe-basen. |
| 18 | `glasstornet` | Glasstornet | 🍦 | fysik | drag | 3–5 | fysik/balans | matter.js (mjuk stapling) | Stapla vingliga glasskulor på en strut; varje kula är en mjuk matter-kropp som vinglar och kan luta; placera varsamt för ett högt torn. **Påverkan:** släpp-timing/placering = balans. **Mål:** stapla N kulor. En tappad kula studsar och du försöker igen — aldrig game-over. |
| 19 | `golvet-ar-lava` | Golvet är Lava | 🌋 | pussel | drag | 3–5 | jord/eld | matter (gång) + lava-partiklar | Placera trampstenar/plattformar över bubblande lava så Zacke (eller Alissa) hoppar över till andra sidan. **Påverkan:** var stenarna placeras (dra från bricka), avstånd. Figuren auto-hoppar till nästa nåbara sten. **Mål:** nå andra sidan / skatten. Lavabubblor. För stort gap → ett snällt moln lyfter. |
| 20 | `vattenvagen` | Vattenvägen | 💧 | pussel | drag | 3–5 | vatten | egen (vatten-partiklar/celler) | Led vattnet: dra/rotera rörsegment eller gräv jord så det rinnande vattnet når den törstiga plantan / Elviras mugg. **Påverkan:** placera kanaler. **Mål:** fyll muggen. (Inspirerat av Where's My Water, småbarnsversion.) |
| 21 | `blixt-och-dunder` | Blixt och Dunder | ⚡ | larande | tap | 3–5 | blixt/luft | egen (laddning + båge) | Dra ihop åskmoln; när två laddade moln nuddar → en blixt slår ner och tänder ett mål (lampa, träd). **Påverkan:** molnens läge + ladda genom tryck. **Mål:** tänd alla lampor i byn. Vänlig åska, ej läskig. |
| 22 | `kugghjulen` | Kugghjulen | ⚙️ | pussel | drag | 3–5 | fysik/mekanik | geometrisk rotationskoppling | Placera färgglada kugghjul på pinnar så de greppar i en kedja; veva (dra) → alla snurrar → sista hjulet hissar en flagga / snurrar Elviras karusell. **Påverkan:** vilka pinnar, greppning. **Mål:** koppla vev → mål. |
| 23 | `gravmaskinen` | Grävmaskinen | 🚜 | fysik | drag | 3–5 | jord/sand | granulär sand (celler) | Kör en grävmaskin: dra skopan för att gräva fallande sand från en hög, sväng över och tippa i dumpern tills den är full. **Påverkan:** var du gräver, hur du tippar. **Mål:** fyll lastbilen. Sand faller/lägger sig realistiskt. Zacke kör. |
| 24 | `trollblandning` | Trollkarlens Blandning | 🧪 | pussel | drag | 3–5 | element (alla) | partikel-reaktioner | Dra ihop två element-droppar (eld, vatten, jord, luft, is) → de reagerar till något nytt (eld+vatten=ånga, jord+vatten=lera, eld+jord=lava, vatten+is=snö...). **Påverkan:** vilka kombos du gör; upptäck alla. **Mål:** fyll receptboken / gör trolldrycken. |
| 25 | `loopdjuren` | Loopdjuren | 🎶 | roligt | drag | 2–5 | musik | sekvens-loop | Släpp rörelse-/ljudblock i en loop-bana under varje djur (Loopimal-stil); loopen spelas hela tiden och varje djur dansar/låter efter sina block, en liten låt växer fram. **Påverkan:** vilka block & ordning → ny musik+dans. **Mål:** öppet; "klart" när en hel loop med alla djur spelas. |

## Bygg-loop per fas (autonom, 1 spel/fas)

Varje fas = **färsk session/agent** med endast `docs/games/<id>.md` + `CLAUDE.md` + verktygsbiblioteken:

1. **Bygg:** skapa `src/games/<id>/index.js` (+ ev. hjälpfiler) enligt specen, registrera i
   `src/games/registry.js`. `npm run build` MÅSTE passera (0 fel).
2. **Förenkla:** `/simplify` (eller en simplify-agent) över den nya kodens diff — endast
   återanvändning/dup/död-kod, beteendebevarande. Applicera säkra fixar.
3. **Testa:** `node scripts/test-game.mjs <id> [--drag ...]` mot dev-servern (5173) → 0 konsolfel +
   skärmdump + exit-cykel. Vid behov Claude-in-Chrome/Playwright för UI/grafik-koll.
4. **Fixa:** buggar + UI/grafik-problem → fixa → testa om tills rent.
5. **Spara state:** uppdatera `game-progress.md` (klar + vad som byggdes/fixades), lägg ev. nya
   svenska röstrader i `scripts/voice-phrases.json`, committa fasen. Starta nästa fas.

Loopen körs autonomt tills alla 25 är klara. Verktyg: [[headless-test-harness]],
[[phased-agent-upgrade-loop]], [[advanced-physics-toolkit]], [[real-audio-sfx]],
[[neural-voice-pipeline]].
