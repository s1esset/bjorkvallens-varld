# Vakna, pappa! (`vakna-pappa`)

> roligt · tap · 2–5 · ✅
> Status: ⬜ ej granskat · 📝 doc skriven (plan klar) · 🔧 förbättringar pågår · ✅ marknadsklar

*Spel 2 av 3 i nattpasset 2026-08-16 (v1.225.0, se `docs/SESSIONS.md`). Körplanen
`docs/NATTPASS.md` är struken — passet är kört, och spec-kortet ur `docs/IDEER.md` post 2 ⓶
bor numera här nedan.*

## 0. Spec

| | |
|---|---|
| **id** | `vakna-pappa` |
| **titleSv** | Vakna, pappa! |
| **icon** | 😴 |
| **kategori** | `roligt` → flik **Roligt** |
| **input** | mixed (tryck + enkelt drag med snäpp + tap-tap-fallback) |
| **ålder** | [2, 5] |
| **kärnloop** | Pappa vill bara SOVA, och barnet vill busa. En sömnmätare (andningstakten, plus måne/sol) **sjunker av ljud och kryper tillbaka upp av tystnad**, så barnet måste kedja ihop sina tryck. **Tolv saker**, en per busskategori, var och en med sin egen mekanism och sin egen min. |
| **mål** | Fem vakenlägen uppnådda → gäspningen och soluppgången → `progress.complete()` |
| **agens** | VILKEN sak, VAR man släpper den, och i vilken ordning. **Tre vägar in:** ⓐ välj sak + tryck på stora VÄCK-knappen, ⓑ dra saken på honom (ansikte · täcke · bar fot ger olika utfall), ⓒ tryck på saker i rummet (fönstret, hyllan, tavlan, täcket, honom själv). Kaffet biter bara från läge 2; rullgardinen ger ±0 men **dubblar allt annat**; väckarklockan är starkast men får filten över huvudet. Inget verktyg är fel. |
| **variation** | Verktygsuppsättning och ordning roterar; sällsynt wow (~1 på 8): han sätter sig upp och **snarkar vidare sittande**. |
| **mottagare** | Väckarklockan, katten och trumpeten hoppar och jublar i finalen. |
| **finish** | Han sätter sig upp, gäspar stort, sträcker på sig, solen far upp — och sen: "en gång till?" → han dimper ner och börjar snarka igen, vilket **är** slutklämmen. |

**De fem vakenlägena — riggfunktioner ingen annan använder**

| Läge | Ansiktet | Riggen |
|---|---|---|
| 1 djupsömn | båda ögonen igen, långa andetag | `liv(true, { takt: 3.4 })` + snarkning |
| 2 rör sig | mumlar, vänder på huvudet | `tveka()` · `liv(2.4)` · `pappa_hmm` |
| 3 **ett öga** | ena ögat öppnas och tittar på det som lät | `ogon_h` släckt ensam + `blick()` mot ljudkällan |
| 4 förvirrad | båda ögonen, vet inte var han är | `min('forvanad')` · `nick()` · `pappa_ehh` |
| 5 vaken | **gäspning** — långsamt gap 1,2 s med blink i toppen | `gap()` mjukt + `pappa_aaah` · `min('nojd')` |

Läge 3 och 5 finns ingen annanstans i appen: **ett öga i taget** och ett **långsamt** gap
(allt `mata-munnen` gör är snabba tuggap). Gäspningen ensam är värd spelet.

**De tolv sakerna — en per busskategori (ägaruppdraget 2026-08-16)**

| Sak | Kategori | Lägen | Mekanismen · skämtet |
|---|---|---|---|
| väckarklockan | ljud (skarpt) | +2 | starkast — men han drar **filten över huvudet**, och då HALVERAS nästa saks verkan tills barnet trycker bort den |
| trumpeten | ljud (fanfar) | +1 | G4 → C5, en ren kvart; luggen flyger rakt upp |
| ballongen | slag / smäll | +2 | `pop` + samplat slag + en basstöt 120 → 52 Hz, konfetti, täcket fladdrar |
| kaffekoppen | lukt (god) | +2 | **bara från läge 2**; doften driver som en synlig slinga mot näsan, `blick()` följer den, han snusar |
| strumpan | lukt (äcklig) | +2 | gröna stinkslingor — han **vänder bort huvudet** |
| ficklampan | ljus | +1 | ritad ljuskägla mot ansiktet; han kisar (`blunda` båda) |
| rullgardinen | ljus (dagsljus) | ±0 | **dubblar allt annat** — den listiga vägen, och den enda saken som med flit inte höjer något själv |
| vattensprutan | blött | +2 | droppar + ringar i ansiktet, `kyla`, huttring |
| fläkten | vind | +1 (+1) | vindbågar över sängen; **blåser av filten** om den ligger över huvudet |
| fjädern | insekt som kryper | +1 | **tre nedslag längs en sträcka**, 0,42 s isär, stämd stege 660/784/988 — min per zon via `traffar()` |
| katten | djur som sätter sig | +1 | hon GÅR på hans ansikte och **stannar** på kudden; nästa tryck är en klapp |
| hundvalpen | djur som pruttar | +2 | skäller, **vänder rumpan till**, ett grönt moln driver mot näsan |

Zonen ändrar utfallet: **ansikte** full verkan · **täcke** −1 (aldrig under 1) · **fot** +1 för
fjädern och sprutan, annars −1.

**Slumpade kryddor** (tak: en i taget, ≥8 s emellan, 30 % chans, alla hjälpsamma): katten
pruttar · en bok ramlar ner · åska med blixt (bara när det regnar; ljudet 0,35 s efter
ljuset) · han drömmer och ler.

**Röstrepliker (18 literaler)**
```
"Pappa sover! Välj en sak och busa med honom."   ← voiceIntro
"Tryck på den stora knappen, eller dra saken på pappa."
"Välj en sak på bordet först!"
"Tryck på pilarna, det finns fler saker."
"Titta, han rör på sig!"          "Ett öga är öppet! Fortsätt."
"Oj, han somnade om igen. Prova igen!"   "Dra av filten så han hör dig."
"God morgon, pappa!"              "Vill du väcka honom en gång till?"
"Usch, vad strumpan luktar!"      "Hundvalpen pruttade på pappa!"
"Katten sitter kvar på kudden."   "Nu regnar det ute."
"Åska! Vilket dunder!"            "Boken ramlade ner på pappa."
"Nu ligger pappa utan täcke. Brrr!"
```

## 1. Nuläge (sett som spelare)

Ett sovrum i sidovy. Pappa ligger med huvudet i kuddens dell, filten tuckad över halsen, och
snarkar — en procedurell snarkning på andningens egen klocka. Genom fönstret syns månen högt
och stjärnor; rullgardinen är halvvägs ner. På nattduksbordet står sex verktyg. Varje tryck
höjer honom mot ytan, tystnaden drar honom tillbaka, och andningstakten (3,4 → 1,1 s) är
mätaren man **hör** medan månen som sjunker och solen som stiger är den man **ser**.

Skärmdumpar: `.test-shots/vakna-pappa.png` och de fem vakenlägena ett och ett i
`.test-shots/somn/lage-1..5.png` (`node scripts/_somnprobe.mjs`).

### Vad sonden mätte

`scripts/_somnprobe.mjs` svarar på de två frågor §2 pekade ut i förväg, och den ersätter
`_frysprobe.mjs` för det här spelet (den är hårdkodad mot `mata-munnen`).

**⓵ Ringbufferten växer inte.** Efter **40 lägesbyten**, alltså 40 anrop till `liv()`:

| | uppmätt | taket / förväntat |
|---|---|---|
| `_tw.length` | 20 | 24 |
| eviga tweens | 2 | 1 levande andetag |
| levande eviga | 1 | ≥1 |
| spökminer | 0 | 0 |
| blinkslingan lever | ja | ja |

Kontrollarmen kördes först: sonden dödar tre spårade tweens med flit och kräver att
döda-räknaren stiger (3 → 6). Utan den raden hade ett lågt tal inte betytt någonting.
Läckan i `mata-munnen` (+1 död evig tween per tugga) reproducerar alltså **inte** — `_track`s
`tw.parent`-filter håller även under det här spelets mycket högre anropstakt.

**⓶ Ett öga i taget läser i bild.** `lage-3.png`: vänster öga slutet, höger öppet. Det är
riggfunktionen som aldrig använts i appen, och den fungerar.

**⓷ Återinsomnandet hade en klippkant, och den var ett P0-brott.** Koden påstod att "kittla
ensam tar honom hela vägen" — resonerat, aldrig mätt. `--takt` driver spelets EGNA `_update`
och `_verkan` med syntetisk tid (aldrig en omskrivning av reglerna i sonden) och mätte:

| mellan tryck | före taket | efter taket |
|---|---|---|
| 12 s | klarar, 4 tryck | klarar, 4 tryck |
| **15 s** | **fastnar för alltid** — 16 tryck, aldrig förbi läge 1 | klarar, 7 tryck |
| 60 s | fastnar | klarar, 6 tryck |
| inga tryck | — | vaknar aldrig (kontrollarm) |

Ett tryck gav +1 och tystnaden tog −1: nettoframsteg noll i all oändlighet, alltså ett hinder
som **stoppar**, och P0 MOTGÅNG tillåter bara att hinder saktar ner. Att höja `ATER` flyttar
bara kanten — så länge förlusten per trycklucka kan bli lika stor som vinsten finns det
alltid en långsam takt som står still. Taket i `_hoj` (**högst ett läge per tryck, och bara
varannan gång**) ger netto minst +0,5 per tryck oavsett takt. Skämtet är kvar: vid 15 s kostar
återinsomnandet tre extra tryck i stället för allt.

**Två mätfel i sonden själv, båda värda att minnas:**
- **Sondens steg måste vara ≤ spelets egen `dt`-klämma.** `_update` gör
  `Math.min(0.05, dtMS/1000)`, så sondens 0,25-steg gav spelet 0,05: klockan i sonden gick
  **fem gånger fortare** än i spelet, och 60 s mättes som 12. Kontrollarmen föll på sondens
  fel, inte spelets.
- **Ett kontrollfall måste vara negativt av DEFINITION.** Sonden hade först raden "60 s ska
  aldrig klara det" — rätt mot den trasiga koden, men den kodifierade buggen som ett krav.
  Det kända negativa är "inga tryck alls".

**Två fel som bara bilden hittade:**
1. **Djupsömnen visade en `forvanad`-min med vidöppna ögon.** Min-lagret ligger överst och
   bär sina egna ögon, så `blunda()` skrev på ett lager ingen kunde se. `_satLage` släpper nu
   minen för läge ≤3 — annars är sovlägena inte deterministiska.
2. **Filtens viloläge lämnade fotokanten synlig.** 440 låg 8 px under hakan (432), men
   fotorutan slutar först på 450 och dess nedersta band är en uttonad hals: kvar blev ett
   ljust streck med rak underkant. 424 lägger filtkanten ovanför hakan, så tygets egen kontur
   skär halsen — det är det enda som döljer klippet.

## 2. Ursprunglig plan & tankeprocess

**Motgången ÄR skämtet.** Att han somnar om är inte ett misslyckande — det är poängen, och
kedjan är den enda "svårighet" spelet har. Taket: återinsomnandet går ett läge i taget, är
pausat i 3 s efter varje framsteg, filten kan bara komma **en gång per runda**, och barnet kan
aldrig hamna under läge 1. Ingen timer, ingen nedräkning, ingen siffra.

**Ljudluckan är känd och blockerar inte.** Det finns **ingen snarkning** i sfx-manifestet
(51 klipp, inget `snark`). Spelet bygger en procedurell reserv — låg ton + långsam LFO + ett
mjukt "puh" på utandningen via `audio.tone()` — och `snark` · `god-morgon` · `gaspning` läggs
på ägarens inspelningslista. Spelet ska vara klart och grönt utan dem.

**Två mätfrågor som nattpasset pekade ut i förväg:**
1. `liv()` anropas **en gång per lägesbyte**, och det var precis så `mata-munnen` läckte en död
   tween per tugga in i riggens ringbuffert (`_track`). Rättningen finns (`tw.parent`), men att
   listan inte växer måste **mätas**: `node scripts/_frysprobe.mjs` läser exakt det.
2. Ett öga i taget går inte att bedöma i tal — `node scripts/_ansiktebild.mjs --bara "vila,wink h"`.

## 3. Vad gör det lättjefullt / tunt

*(fylls i av `spelkritiker` efter bygget)*

## 3b. Ombyggnaden 2026-08-16 (ägaruppdrag) — tolv sätt att busa

Ägaren gav två punkter: ⓵ pappa vill bara sova och spelaren ska BUSA med valda saker, via
en väck-knapp ELLER genom att dra saker på honom ELLER genom att klicka på saker i rummet;
⓶ sakerna ska väcka honom på OLIKA sätt (lukt · ljud · ljus · slag · blött · vind · djur som
sätter sig · insekt som kryper · djur som pruttar · täcket av · saker som ramlar · väder ·
slumpade händelser), och han ska bli irriterad och vilja somna om.

Sömnmätaren (andningstakten per läge), återinsomnandet, taken och gäspningsfinalen står
**oförändrade** — allt nytt är byggt ovanpå.

### Vad sonden mätte (`node scripts/_busprobe.mjs`)

Kontrollarmen först: ett tryck på VÄCK-knappen UTAN vald sak.

| arm | tal |
|---|---|
| KONTROLL — VÄCK utan vald sak | **+0** (och hyllan hoppar — knappen är aldrig en död yta) |
| de tolv sakerna, en i taget, isolerade | **11 av 12 höjer**; `gardin` ±0 **med flit** (den dubblar allt annat) |
| olika miner över uppsättningen | 5 (`aj` `forvanad` `lycksalig` `nojd` `skeptisk`) |
| tid till verkan | 0,50 s för elva · **6,00 s för katten** — hon GÅR dit, och vägen är showen |
| tryck på täcket | `false → true`, täcket åker ner |
| exit mitt i en väckning | rent, 0 konsolfel |

⚠️ **Tre fällor gjorde mätaren fel innan den var rätt, och alla tre gav FALSKA NOLLOR.**
⓵ Verktygsplatserna gissades (`sida = index/4`) — 11 av 12 saker valdes då aldrig, och deras
"+1/+2" var den FÖRRA sakens verkan som låg kvar vald. Alla tolv talen såg rimliga ut. Läs
`g._verktyg` ur spelet i stället. ⓶ `_filtPa` nollställdes inte: väckarklockan drar filten
över hans huvud, och då halveras nästa saks verkan (`Math.floor(n/2)`), så ett +1 blev +0 —
tre saker efter klockan såg stumma ut i två körningar i rad. ⓷ Baslinjen 0: kaffet doftar
först från läge 2, alltså är en nolla där spelets REGEL och inte sakens verkan. Baslinjen är
nu 1. Och fönstret var 5,5 s, vilket är kortare än kattens promenad.

## 4. Förbättringar & förhöjningar (plan)

**Juice**
- **[Quick] "Ett öga"-effekten är subtil i bild.** Den finns och läser (`lage-3.png`), men den
  är lätt att missa i en snabb blick. Den bärs upp av repliken och av att blicken följer
  ljudkällan, alltså är den inte ensam bärare — men ska den vara en höjdpunkt kan
  closure-deltat ökas (håll det slutna ögat något mer slutet).
- **[Quick] `kittla` och `kaffe` delar fortfarande `audio.sfx('soft')`.** Filten fick eget
  ljud (`flip` på, `whoosh` av), de två andra står kvar.

**Variation**
- **[Medium] Sömnstegen 1→5 spelas identiskt varje omgång** — samma repliker, samma miner i
  samma ordning. Verktygsordningen och wow-läget är den enda variationen som finns.

**Karaktär**
- **[Quick] Trumpetens "luggen flyger rakt upp" är approximerad.** Spec-kortet vill ha håret
  som far upp och ramlar ner; riggen har inget hårlager, så det är ett `ryck()` plus en puff
  ovanför hjässan. En egen lugg-nod i `ansikte.js` vore det riktiga.
- **[Quick] Verktygskatten på nattduksbordet och den gående katten på kudden reagerar
  samtidigt** — kan läsa som två katter första gången. Behöver ses i verkligt spel innan
  något ändras.

**Ljud**
- **[Quick] Ägarens inspelningslista** — `snark` · `god-morgon` · `gaspning`. Spelet är klart
  och grönt utan dem (procedurell snarkning + stämda reserver), och `harSample()` tar klippen
  i bruk samma dag de läggs i `public/audio/sfx/`.

## 5. Status / loggar

`2026-08-16 · doc skriven, spec flyttad hit ur IDEER post 2 ⓶ · (bygget följer)`

`2026-08-16 · ägaruppdrag: tolv saker på tre bläddringsbara sidor, VÄCK-knapp + drag + sju
klickbara rumssaker, slumpade kryddor. Mätt med scripts/_busprobe.mjs (kontrollarm +0,
11 av 12 höjer). Rättat efter skärmdumpen: bläddringspilarnas spetsar pekade ÅT FEL HÅLL,
och VÄCK-knappens hand pekade ut ur bild i stället för mot pappa.`
