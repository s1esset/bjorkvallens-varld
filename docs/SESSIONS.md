# SESSIONS.md — sessionslogg

En post per avslutad session, **nyast överst**. Skrivs av `/avsluta`. Syftet: nästa session
(eller nästa person) ska förstå var projektet står utan att läsa chatthistorik eller git-log.

Format:

```
## ÅÅÅÅ-MM-DD · v<version>
**Byggt:** vad som gjordes, i klartext
**Commits:** <hash> <ämne> · <hash> <ämne>
**Öppet:** vad som återstår / nästa naturliga steg
```

---

## 2026-10-02 → 10-03 — Dag- och nattkörning över resten av FYSIKPLAN (D1–D16 + N1 + L) · v1.450.0

**Byggt** (obevakat, en headless Opus-session per fas med Sonnet-byggare, en commit per id, v1.361 → v1.450,
96 id committade): omgång 1 och 1b klara (T2-resten, R1-baslinjen, P2 `vippa` i 7 spel, P4 `landa` i 4);
hela omgång 2 (pekavbrott + pekar-id-vakt K1–K3, kinematiska kroppar R2 + fjädrande ytor P1, R3–R6, O2,
F9-överlägget); omgång 3 (G1 grepp, G2 pekspår, G8 vev, F1 leder, F10 kugghjul med last); omgång 4
(F3 brytbart, P3 högen, O1 mjuk mesh, F4 vind i 9 spel, F5 ytvågor i 3, F6a följ kroppar, F8 inspelning,
G3a skuggvärld, U3 variation i 6 spel, F1-kunderna i 7 spel). **N1:** två nya spel — Bläckfisken Otto
och Vattenballongerna (89 spel). Hela listan: FYSIKPLAN §2 (Byggt-rader) och §3 "Läge efter körningen".

**Mätt:** varje id `natt.mjs prova` + skärmdump + arbetsorderns sond (41 `scripts/_dag-*.mjs`).
Slutgrinden (L): `check` 0 fel · `build` OK · `test:all` 89/89 (en loggvarning: popcornkalaset
`fysik-svalt` ×1). `npm run voice`: 3 nya klipp (D15: 55).

**Skuret** (mätningen fällde premissen): K4 och O3 (M4 utan utslag — <1 pekrörelse per ruta, `Rep.steg`
0 anrop i vila), O2 i zackes-biltvatt (`area` fanns redan). Villkorade ordrar orörda: T5, M5, F2, F6b,
F7, G3b, G3c, G4, G5, G6; omgång 5 (storbarn) byggs inte enligt Ä3.

**Kvot:** veckan 71 → 99 % för D1–D16 + N1 (~207 USD listpris; N1–D16 82 % Sonnet). Per fas av 5h-fönstret:
lib-faser 11–18 procentenheter, spelfaser 10–33 (D9 33, D16 28 — långa byggare med
stora cacheläsningar). Varje fas ≈ 1–3 veckoprocent. D16 stannade på veckotaket och provades i L.

**Läxor:** ⓵ drivarens omstart nollställer `forbrukning.json` — spara den före omstart (eller låt
drivaren lägga till). ⓶ ett veckotak på 97 % lämnar för lite marginal för en slutfas; L fick vänta till
veckans återställning. ⓷ byggda-men-oprovade id överlever en kvotpaus fint: nästa session provar och
committar dem på ~4 min.

**Öppet:** de villkorade ordrarna ovan; doc-drift från D13/D14 (kvarvarande kunder, se FYSIKPLAN §6);
ägarbeslut i project-status oförändrade.

---

## 2026-10-02 (natt) — Nattkörning över FYSIKPLAN: omgång 0 nästan hel, omgång 1 utom tre T2-spel · v1.359.0

**Byggt** (obevakat, 9 faser à en headless Opus-session med Sonnet-byggare, en commit per spel/lib, v1.288 → v1.359):
- **Biblioteken:** `lib/variation.js` (U1: `nastaVariant` · `pase` · `slumpIBand` · `rundprofil`),
  Emitter med luft och vind (P5), `createScene` med opt-in `silhuett`/`forgrund` (L1), `lib/takt.js`
  (T3, fast steg för mjukkroppar/rep), ackumulator-snäpp i PhysicsWorld/FluidWorld (T4: 60 Hz-stegen
  32/34/34 % → 0/98/2 %), `Flytvolym` per fysiksteg (T1), DEV-fällvakter `statisk-fart`/`snurr` (R1).
- **Sonder:** `_fysikbank.mjs` (M1), `_taktprobe.mjs` (M2), `_variationprobe.mjs` + `_variationtest`.
- **Spelen:** variation i alla 18 U2-spel + bygg-tornet; 27 av 30 enkla vinster (§5.4) — bl.a. ankan
  rider på vågen, pysballongen, plantera-frons ritade blomma, Bobo med kropp, barnets figur i
  golvet-ar-lava; 20 bildlyft (L2) med egna platser i stället för tvåtonsgradienter; T3 i nio spel
  och T2 i fyra. Hela listan per spel: `.claude/state/natt/fysikplan-klart.md`, och FYSIKPLAN §2/§3/§5.4.
- **Grind:** varje spel `natt.mjs prova` (check + test + gamelogg) + skärmdump granskad; slutfasen
  `check` 0 fel · `build` OK · `test:all` (se morgonrapporten).

**Mätt:** kvotmätaren (rate_limit_event → `kvot.json`) höll. Per fas av 5h-fönstret: lib-faser med 3
byggare 5–7 procentenheter, spelfaser med 4 byggare + kritiker 13–15. Veckan gick 60 → 67 % över
hela natten (~73 USD API-ekvivalent, 2/3 Sonnet). F2 stod 48 min (11 spel), övriga 14–28 min.

**Skuret / kvar:** §5.4 bygg-tornet, bygg-en-kompis och hamburgerbygget (alla P2 → omgång 1b);
T2 för studsbollar, enhorning-glitterbajs, glasstornet. Omgång 2–4 orörda.

**Läxor:** ⓵ `run_in_background: false` för byggare i headless-läge (bakgrundsagenter dör 600 s
efter turen). ⓶ En spelfas med fyra parallella byggare kostar ~2× en lib-fas i kvot — budgetera per
byggare, inte per fas. ⓷ Leveransfasen ska skrivas klart medan `test:all` kör; bara `src/lib/nyheter.js`
måste vänta (den laddar om sviten).

**Öppet:** nästa natts början står i FYSIKPLAN §3 (T2-resten → R1-baslinje i `test:all` → omgång 1b).

---

## 2026-10-01 (kväll) — Spår F omgång 2 (16 spel), Nätskott i kvällen, fysikplanen · v1.288.0

**Byggt:**
- **Spår F omgång 2 (v1.287.0):** barnets egna och MÖTTA knytt/kompisar i 16 spel till — saftbaren
  · lagerelden · studsmatta · hamburgerbygget · stor-liten · fanga-frukten (äter) · poppa-ballonger
  · klappa-mullvaden · vart-tog-det-vagen · skattjakt-i-morkret · blixt-och-dunder · bygg-tornet
  (hittas/räddas) · folj-sparet · siffertaget · zackes-biltvatt · bowling (leker/publik). Sex
  Sonnet-byggare parallellt i samma träd (arbetsorder `.claude/state/sparf-omgang2.md`), tre
  replikvarianter per roll (ditt knytt / din kompis / ett knytt), 77 repliker med klipp.
  F3-premissen föll i 5 av 16 och skrevs om (LYFTPLAN F7 har tabellen).
- **Bugg i grunden, rättad:** `presentera` fyrade under `mount()` och spelets intro kapade raden
  efter **0 ms** — barnet hörde bara knyttets namn (även omgång 1:s vippbrädan, glasstornet,
  studsbollar). Nu `ctx.later(0.15)` först; kontrollarm utan fixen röd, med fixen grön.
- **Ny sond `scripts/_egnakund.mjs`** (generisk per kund, `levandeFigurer()` i lib) och
  **`scripts/_vite-nohmr.mjs`** — dev-server :5174 utan HMR så parallella agenters sparningar
  inte river varandras testsidor (mätt: `_nohmrprobe.mjs`).
- **Nätskott på stan (v1.288.0, Opus-agent + kritiker):** resan in i kvällen (`kvall.js` —
  solnedgång, måne, fönster som tänds, lyktor, regn med paraplyer varannan runda), sex
  uppdragssorter (nya: snärj med nätbollen · fönstermonstret · tänd lyktorna), eget hem där
  barnets figur (eller ett monster) väntar i dörren och tänder lamporna. Nätbollen fastnar inte
  på gatusaker (31/32 träffar mot HEAD:s 10–14), husen byggs inte längre ovanpå varandra.
  Bildrutekostnad oförändrad. Kritikern: inga blockerare.
- **`docs/FYSIKPLAN.md`** (Opus 5.5, effort max — agenttypen `fysikplanerare`): 40 arbetsordrar.
  Störst: fysiken beror på BILDTAKTEN (kraft per bildruta i stället för per steg — flytjämvikt
  0,637 vid 60 Hz, sjunker vid 30; 15 spel), `pointercancel` når aldrig spelen, andra fingret
  kapar draget (30 spel). Tio ägarbeslut (Ä1–Ä10) väntar.
**Mätt:** `_egnakund` 16/16 gröna i en oberoende omkörning, `_egnafigurprobe` grön,
`npm run test:all` **87/87**, `check` 0/0. E1-bilderna granskade i kontaktark — rättat:
lagereldens figur lyftes ut ur bild i vinsthoppet.
**Commits:** cb4d9e0 feat(egnafigurer) · 8c02a24…3c3ffd0 sexton spel (ett per spel) · 2194667
docs(fysikplan) · 980cc70 feat(natskott-pa-stan) · + denna bokföring. Publicerat.
**Öppet:**
- Ägaren provar: omgång 1–2 av Spår F (gör ett knytt i Unika Knytt och gå sedan runt i spelen),
  och Nätskott på stan ett helt varv till hemkomsten.
- **FYSIKPLAN Ä1–Ä10** — ägarens beslut (enheter, 60 fps-taket, första storbarnsspelet …), sedan
  omgång 1 (T1–T4 bildtakten + K1/K2 pekare + M1/M2 mätstickan).
- Spår F omgång 3 (nya mekaniker: kittla-figuren, loopdjuren, harma-melodin, enkelt-pussel,
  mata-monstret, vad-forsvann, vandkort).
- Nätskott §4: snärj-panelen, dörrfiguren byggd i förväg, mittenhanden som skymmer.

## 2026-10-01 — Barnets egna knytt och kompisar i andra spel (Spår F, omgång 1) · v1.285.0

**Byggt:**
- **Inventering av alla 84 spel med figurer** (tre läsagenter + stickprov mot koden) — vilka som
  kan låna barnets knytt ur `unika-knytt` och kompisar ur `bygg-en-kompis`. Resultatet står i
  `docs/LYFTPLAN.md` **§10 Spår F**: 26 starka (sorterade per roll: äter · hittas · leker ·
  publik), 41 möjliga, 16 svaga/nej + skälen, och utrullningen i tre omgångar.
- **Ägarbeslut (F5):** bara SNÄLLA roller (aldrig hinder/bortspolad) · reserven är spelets egen
  figur (utom soffan, där ett nyslumpat knytt är poängen) · det nyss skapade först i varje spel,
  sedan varannan omgång.
- **Grunden:** `src/lib/egnafigurer.js` — `lasEgna` (aktiva profilens samlingar, källspelens
  sanering) · `minns` (sessionsminne per PROFIL-id, anropas av källspelen) · `valjEgna` (takten)
  · fasaden `EgenFigur` (Karaktar-kompatibel `look/react/setMood`, `{ r }` = samma rum som
  `makeKaraktar`, tickar själv och städar själv om vyn rivs) · `figurForOmgang` · `presentera`.
  `bygg-en-kompis/varelse.js` (ny): ritningen, tabellerna, melodin och saneringen utflyttade ur
  index.js + en tweenfri rigg `Kompis`. `rensaPost` → `unika-knytt/dna.js`; `somnar: false` i
  `knytt.js`.
- **Sex kunder:** popcornkalaset (soffgästen) · ballonglyft (presenten) · glasstornet (kunden) ·
  vippbrädan + studsbollar (vid korgen) · titt ut, pappa! (ett gömt fynd). 12 nya repliker med
  klipp (`npm run voice`, 12/12); knyttnamnen hade redan klipp.
- **Mätt:** `scripts/_egnafigurprobe.mjs` 41/41, kontrollarmen K0 (tom profil → reserven) först.
  `npm run test` 8/8 för de berörda spelen. Skärmdumparna granskade (`--bild`).

**Commits:** `f7c9d54` feat(egnafigurer) grunden · `2a2e086` popcornkalaset · `dbdae6b` ballonglyft
· `a774f6e` glasstornet · `a01bbc3` vippbradan · `c94bee4` studsbollar · `3a549ff` titt-ut-pappa

**Öppet:**
- **Omgång 2 (LYFTPLAN F4):** de övriga starka på S–M — fanga-frukten, studsmatta, lagerelden,
  saftbaren, poppa-ballonger, vart-tog-det-vagen, klappa-mullvaden, skattjakt-i-morkret,
  blixt-och-dunder, bygg-tornet, folj-sparet, siffertaget, zackes-biltvatt, bowling, stor-liten.
- Ingenting av omgång 1 är provat av ägaren eller ett barn än.
- **Tillägg samma dag, v1.286.0:** F5.4 avgjord — "så mycket variation som möjligt": soffans
  slumpade knytt minns i sessionen (`minnsMott`) och dyker upp i de andra fem spelen (aldrig med
  förtur, aldrig "ditt"). Sonden 47/47.
- `bygg-en-kompis`s testskärmdump är urblekt — **samma på HEAD**, alltså äldre; inte utrett.

## 2026-09-30 (sen kväll) — Appen uppdaterar sig själv, Nyheter-ruta, fyra spel polerade · v1.284.0

**Byggt:**
- **Automatisk uppdatering (v1.279):** `checkForUpdate()` i `lib/pwa.js` kör `reg.update()` när
  menyn monteras (appstart + varje gång man backar ut dit) och vid `visibilitychange → visible`,
  spärrat till en koll per 30 s. En installerad app som väcks ur bakgrunden navigerar aldrig —
  därför kom en ny version förut bara via knappen. Menyn anmäler sig med `onUpdateReady()` och
  byter efter en 1,4 s-avi, aldrig i bibliotek/spel; `aktivera()` högst en gång per sidliv.
  Versionspillret står kvar. Mätt med nya `_autouppdatprobe.mjs` mot riktigt bygge
  (`vite preview`): **8/8, HEAD 2/6** (utan ändringen hittas versionen aldrig utan knapp).
- **Nyheter-ruta (v1.279):** ✨-pill bredvid versionspillret → DOM-ruta (`domModal.showNews`) med
  data i `src/lib/nyheter.js` (förälderns språk, nyast först). Prick tills senaste posten lästs,
  "Uppdaterad till vM.NN" en gång efter ett byte (`localStorage pwagames.nyheter`).
  `npm run check` varnar när den aktuella versionen saknar en post — regeln står i CLAUDE.md,
  skill spel-pipeline (steg 9) och skal-och-data. `_nyhetprobe.mjs` 14/14 i båda måtten.
- **Fyra nya poleringskandidater** (ägaren: "hitta 4 nya"), valda ur ett kontaktark över alla 87
  skärmdumpar: de med svagast bild som inte rördes i natt. Opus orkestrerade, Sonnet byggde
  (`.claude/state/polera-2026-09-30.md` = arbetsordrarna), en kritiker före ett samlat fixvarv:
  - `enhorningen-flyger` (v1.280) — himmel per nivå (dag/skymning/kväll med måne/morgon) med
    kullar, enhörningen 25 % större med regnbågssvans, fyra ringtyper, regnbågsport som mål,
    stjärnsäck. 🔧 → ✅.
  - `fargregn` (v1.281) — målfärgs-skylten (droppe i vit ruta, P0 ASSETS) ersatt av Bobo med
    paraply/hink i målfärgen som fångar; regn ur moln, hus och träd, regnbåge på himlen band för
    band, tre nya dropptyper. 🔧 → ✅.
  - `skuggmatchning` (v1.283) — picknick i parken: sakerna står på en bänk med kontaktskugga,
    silhuetterna ligger som skuggor på filten, vilo-liv (P0), större saker vid 2–3 föremål.
  - `peka-pa-kroppen` (v1.284) — Zackes egen pratbubbla med kroppsdelen RITAD i figurens färger
    (frågekortet med emoji var P0 ASSETS), lekplats, volym, pekhjälp i steg, dans per skepnad,
    "Vad är det här?"-vändning (12 nya repliker, klipp genererade). 🔧 → ✅.
**Mätt:** varje spel `natt.mjs prova` (0 fel) + en egen sond `scripts/_polera-<id>.mjs` som
spelar huvudkontrollen med riktiga klick/drag (harnessen hade `drag/ratt 0` i alla fyra) —
före och efter fixvarvet. `test:all` 87/87. Publicerat.
**Läxor:** ⓵ `git add public/audio/voice/*.mp3` expanderar till alla ~1 935 klipp →
"Argument list too long"; ta bara de ospårade: `$(git ls-files --others --exclude-standard
public/audio/voice)`. Committen föll, så peka-pa-kroppen fick v1.284 och skuggmatchning v1.283
(ingen v1.282). ⓶ `Input.synthesizeScrollGesture` scrollar ingenting i headless Chrome — en
fingerscroll mäts med råa `dispatchTouchEvent` (kontrollarm i `_nyhetprobe`).
**Commits:** ccb8dc5 feat(skal) v1.279 · 963c15c enhorningen-flyger v1.280 · 5bee8d8 fargregn
v1.281 · ac0e494 skuggmatchning v1.283 · bc68d26 peka-pa-kroppen v1.284 · + denna bokföring.
**Öppet:** ägaren provar de fyra spelen + auto-uppdateringen på telefonen (första riktiga
provet: nästa version efter v1.284 ska komma utan knapptryck) · nästa kandidater: plantera-fron ·
stor-liten · rakna-applen · ballonglyft · valpens-bajs · fallskarmen · kritikens [Medium] kvar i
skuggmatchning §4 (tom bänk efter sista matchen) · nattens tolv spel fortfarande oprovade av ägaren.

## 2026-09-30 (kväll) — Efter nattkörningen: tre ägarbeslut och två drivarbuggar · v1.278.0

**Byggt:**
- **Standardsolen flyttad** (`lib/scene.js`): `createScene`s sol stod på (150,130) och halon
  (r 120) låg bakom skalets hemknapp (70,64) som en gul klump i ~40 spel. Nu (270,135): halon går
  fri från knappens hörn med ~36 px och skivan ligger under HUD-remsan högst upp. Spel med egen
  `sunX/sunY` (kulbana, folj-sparet, harma-melodin, grodan-slurp) är orörda. Mätt med före/efter-
  ark över de 39 spelen med standardsolen (nattens skärmdumpar som före-arm) + `test:all` 87/87.
- **Drivaren (`scripts/nattkorning.ps1`):** ⓵ morgonrapportens lägestabell var mojibake
  (`L├ñra ┬À`) — node/git-utdata avkodades i konsolens OEM 850 när uppgiften startar drivaren;
  nu `[Console]::OutputEncoding` = UTF-8 (kontrollarm under `chcp 850` reproducerade felet, fixen
  gav `Lära`). ⓶ en omstart efter kvotväggen fick SAMMA sessionsnamn (`F3-1` två gånger) eftersom
  namnet följde försöket, som räknas ned vid en kvotvägg — och den andra sessionens loggar skrev
  över den förstas. Sessionsnumret räknas nu för sig; en session som slog i väggen märks
  `kvotvagg` i `forbrukning.json` och i rapportraden. Nattens egen MORGONRAPPORT-tabell skrevs om.
- **Ägarbeslut bokförda:** spindelnätets hjälte får vara kvar (`docs/games/spindelnatet.md` §5),
  glittergrottans shader parkerad till en bevakad omgång (`docs/games/glittergrottan.md` §4).
- **Rättelse till nattens post nedan:** backupens robocopy-kod 9 i F2–F4 var INTE dev-servern —
  F5 visade att det bara var fasens egna öppna loggfiler (`loggar/F?-?.jsonl`, delningsfel 32).
**Commits:** 38b64ab fix(natt) · 31b4c0d fix(scene) v1.278.0 · + denna bokföring. Publicerat.
**Öppet:** ägaren provar nattens tolv spel (`.claude/state/natt/MORGONRAPPORT.md`) ·
glittergrottans shader (bevakad omgång) · R1/R2-reservspelen står kvar · tre 🔧 med en [Deep]
kvar: kla-efter-vadret, siffertaget, vilket-djur-later · varningen `snal-snappyta` i
kla-efter-vadret (15 px utanför, inget fel).

## 2026-10-01 — Nattkörningen: tolv spel polerade i fyra faser · v1.277.0

**Uppdraget (ägaren 2026-09-30):** välj minst tio spel med störst potential eller trasigast bild,
polera dem i en obevakad nattkörning i faser (Opus orkestrerar, Sonnet bygger), spara och
publicera allt till morgonen. Drivare: `scripts/nattkorning.ps1` + `scripts/natt.mjs`; plan och
fasfiler i `.claude/state/natt/`. R1/R2 (sju reservspel) ströks av ägaren för veckokvotens skull.
**Byggt (ett commit per spel, varje spel har en §5-rad daterad 2026-10-01 i sin doc):**
- F1 Lära — `djurorkester` (djuren står fritt på en scen, dirigent-Bobo, notlinje, nya djur per
  konsert) · `kla-efter-vadret` (kläderna hänger på ett klädstreck i ett rum med fönster, ny Elvira,
  blåsigt väder) · `siffertaget` (rösten frågar per vagn, glöden kommer sent, tågvärld med station,
  nytt lucka-läge).
- F2 Pussel — `harma-melodin` (fyra sjungande varelser på en konsertscen, dirigent-Bobo, temabyte) ·
  `magnet-fiske` (dammen med strand och näckrosor, sällsynta fångster, mjukt nivåbyte) · `kulbana`
  (SLÄPP-knappen ut ur hemknappens yta — P0-bugg —, liv på himlen, propeller-del).
- F3 — `vattenvagen` (kaklat badrum, fristående rör på hylla, levande planta, T-rör till två muggar) ·
  `folj-sparet` (hel äng med slingrande stig, nedtrampade tassar, husfinal, tema per runda) ·
  `vilket-djur-later` (djuren kliver ut ur korten och står fritt, bondgård → damm/skog, vända-runda).
- F4 — `vad-forsvann` (ett barnrum, filten är tyg, svaren står fritt på mattan) ·
  `vart-tog-det-vagen` (trolleriföreställning: ridå, spotlight, trollkarls-Bobo, hylla med fynd) ·
  `tvatta-djuret` (flikiga lerstänk, svampen blir smutsig och sköljs, skum där man gnuggar).
- F5 — bokföringen: README-indexets kvalitetskolumn speglade inte statusraderna för 14 spel (12
  sattes till 🔧 som docen säger; `studsmatta` och `gungan` prövades mot koden och blev ✅).
**Mätt:** varje spel gick genom `natt.mjs prova` (check + test + gamelogg, 0 konsolfel) och en
egen sond som spelade huvudkontrollen med riktiga klick/drag där harnessen inte når; en
`spelkritiker` per fas, vars billiga fynd åtgärdades och resten står i spelens §4.
**Läxor:** ⓵ headless-läget dödar bakgrundsagenter 600 s efter att orkestrerarens svar tagit
slut (F1 försök 1) — byggare startas i förgrunden, parallellt i samma meddelande ⓶ `npm run
backup` gav robocopy-kod 9/11 i F2–F4 medan dev-servern körde (låsta filer); arbetet låg ändå
committat ⓷ fem av de tolv spelen fick §4-poster "kvar efter kritiken" — kritikern före fixvarvet
gav ett samlat meddelande per byggare.
**Commits:** 0e88fce · 85b2e02 · 6521611 · c2915b6 · 57fae9d · 33a3c60 · 0b54bb3 · f07f4b8 ·
7e1e0e3 · 84c9899 · 01f5928 · c876663 + röst + denna bokföring.
**Öppet:** ägaren provar spelen (MORGONRAPPORT) · tre ägarbeslut: spindelnätets hjälte,
`createScene`s standardsol bakom hemknappen, glittergrottans shader · R1/R2-spelen står kvar.

---

## 2026-09-26 (forts.) — Popcornkalaset: grytan får sidohandtag, inga osynliga spärrar · v1.265.0

**Uppdraget (ägaren):** "Popcorn påsen är bättre men kastrullen / grytan buggar fortfarande, de
osynliga barriärerna gör att när man drar grytan mot och över gästerna flyger den iväg utanför
skärmen, kan vi komma på ett bättre sätt att luta / hälla?" — ägaren valde en egen design:
sidohandtag, stabil i kroppen, tippar i handtaget, inga spärrar, ställ ned på skålarna.
**Gjort:** buggen reproducerad (`_popcorngast`: grytan genom golvet i 2 av 5 banor, 32–56 px/steg).
`karl.js` fick läget `hang` (sidohandtag) och krafttak på greppet; grytan har ingen hylla, släpps
där den är, lyfts jämnt och tippar i handtaget, går hem när den är tom eller vält. Ny ritning med
två röda gummigrepp. Sonder: `_popcornhandtag` + `_popcornhandtagbild` (nya), `_popcornnaiv` och
`_popcornspel` omskrivna; `_grytprobe`, `_popcornhallspar`, `_popcornspar` borttagna.
**Mätt:** ägarens flöde 92–100 % i skålen (5 av 6), grytan i bild och ≤ 21 px/steg i alla banor,
två hela omgångar 0 konsolfel, påsen oförändrad.
**Fällor (nya):** en premiss om VART det rinner ("under handtaget") föll på första bilden — rita
innan du bygger vidare på en geometrisk gissning · ett stelt grepp mot statiska kroppar = obegränsad
impuls = genom golvet; ge greppet krafttak · korrigera aldrig en ANNAN källas snurr via vridpunkten.
**Commits:** se git log (fix(popcornkalaset) v1.265.0)
**Öppet:** B6b · B7 · lockets skrammelton · ägaren provar handtagen.

---

## 2026-09-26 — Popcornkalaset: påsen och grytan styrs med EN gest (/fixa) · v1.264.0

**Uppdraget (ägaren):** "popcornpåsen är jättesvår att styra / hälla popcorn från, grytan är likadan,
otroligt svårstyrda och buggar / fastnar, spiller, vägrar luta ibland" — och sedan: deploya, spara
och uppdatera så att sessionen kan avslutas.
**Gjort:** ny sond `_popcornnaiv` spelade nybörjargreppen (inte expertvägen som `_popcornspel`):
5 av 10 misslyckades, två tappade 26–29 av 30 popcorn. Styrningen i `karl.js` omgjord till en gest
(bär upprätt var man än tar · vila på en hylla över målet · tryck nedåt = luta · upp = räta) med
hyllor i `fysik.js`, stillhetsgrind före tippningen, handen som ärver kärlets fart, pipen som sänks
före vridningen (annars katapult), träff efter vad fingret faktiskt rör. Allt i
`docs/games/popcornkalaset.md` §5.
**Mätt:** `_popcornhall` (ny, node, hela rummet) alla villkor gröna · `_grytprobe` grön ·
`_popcornnaiv` G3 1 → 23, G4 3 → 25, P4 0 → 29 · `_popcornspel --omgangar 2` två omgångar, 0 fel.
**Fällor (nya):** en sond som byggaren skrev spelar byggarens egen väg — grön i två dygn medan
hälften av nybörjargreppen var trasiga · en vippning runt kärlets KANT är en katapult om pipen inte
sjunker FÖRE vridningen · två kärl vars zoner överlappar: fast ordning blir fel åt ena hållet, välj
det kärl fingret faktiskt rör · en flyttalsjämförelse (`===`) mot ett mål som räknas om ur ett
levande läge avbröt hällningen efter 11°.
**Commits:** se git log (fix(popcornkalaset) v1.264.0)
**Öppet:** B6b · B7 · lockets skrammelton (oförändrat) · glappet bänk–bord under skål 0:s pipe.

---

## 2026-09-25 kväll — Popcornkalaset byggt (/spel, återupptaget med /aterta) · v1.263.0

**Uppdraget (ägaren):** återuppta den avbrutna körningen `/spel popcornkalaset` (stod på `bygg`,
spec + plan klara) och när spelet är klart: wrap and ship — deploya och gör sessionen redo att stänga.

**Byggt:** spel nr 87, `popcornkalaset` (småbarn 3–5, fliken Fysik). Barnet häller själv med fysik:
grytan och påsen är kroppar som hänger där fingret håller (`karl.js`); bygeln bär vågrätt, sidan
på ett kärl som hänger över sitt mål vippar det så långt fingret drar. Värmefält → slumpad popp →
mjuk kropp på 11 fasta steg → stelt popcorn; brända med tak; locket; tre gäster ur sex (B6a,
`gaster.js` av en spelbyggare) som jublar och mumsar; filmkväll som finish. Konsten (`konst.js`)
av en spelbyggare parallellt. 8 röstklipp genererade (`npm run voice`).
**Mätt:** `_grytprobe` (hällningen: 86 % av det hällda i skålen, bygelgrepp 0 %, bärning spiller
≤ 5 %, påsen 32/32 korn i grytan) · `_popcornomrit` (B0: 0,5–0,85 ms per mjukt popcorn vid CPU ×4 →
tak 8) · `_popcornspel` (två hela omgångar med riktiga musdrag, 0 konsolfel; `--otalig` 0 konsolfel).
**Fällor (nya):** matter `Constraint` som grepp skjuter över när greppet sitter utanför kroppens
tröghetsradie (r²·m/I = 3 → 166 000° snurr, noll konsolfel) — eget punktgrepp `drivPunkt`; en
driven kropp är en murbräcka mot allt den bär förbi; `_hallprobe.mjs` fanns redan (mata-munnen)
och skrevs nästan över — återställd, den nya heter `_grytprobe`.
**Commits:** se git log (feat(popcornkalaset) v1.263.0)
**Öppet:** B6b (fler gäster ur andra spel) · B7 (hunden äter spillet, katten på bänken) · lockets
egen skrammelton. Allt står i `docs/games/popcornkalaset.md` §5.

---

## 2026-09-25 eftermiddag — Tio nya fysikspel (idélista) + Popcornkalaset förberett · v1.262.0

**Uppdraget (ägaren):** en lista på tio roliga spelidéer som vi inte har — helst fysik, slumpade
händelser, aldrig likadant två gånger, gärna ragdolls och mjuka kroppar — sparad som fristående
html; sedan "förbered nästa session att starta på popcorn kalaset".

**Byggt:** `docs/idelista-fysikspel.html` (fristående, ljust/mörkt, filter per åldersband): tio
idéer prövade mot alla 86 spel och mot IDEER post 1 — sju småbarn (popcornkalaset,
nallens-stuntshow, blackfisken-otto, vattenballongerna, slajmlabbet, tvattstugan, sandslottet) och
tre storbarn (bobo-i-rymden, gelebilen, brobyggarna — appens första, öppnar Utmaning). Varje kort:
kärnloop, slump, fysik (befintlig motor mot nytt bygge), motgång/mål och vad som ska mätas först.
`docs/IDEER.md` **post 6** bär listan och ett fullt underlag till Popcornkalasets spec-kort
(utkast, sju fakta prövade mot koden, sex öppna frågor). Checkpoint `/spel popcornkalaset` steg
`spec` i `.claude/state/korning.json` — sessionsstarten lyfter den.

**Mätt:** `scripts/_poppprobe.mjs` (ny, utan webbläsare): en `Mjukkropp` som `skala()`s från korn
(×0,25) till popcorn på ≤ 8 fasta steg vänder sig ut och in **för gott** (fyllnad 0,03–0,08 även
90 steg senare, noll NaN = noll konsolfel); fler lösarvarv hjälper inte. Mitt första recept
(12 steg) höll bara för 12 punkter och föll på 14/1,3 · 16/1,15 · 16/1,3 — sonden prövar därför
hela spannet och har det kända felreceptet som kontrollarm. Håller: 18 steg från ×0,25, eller
10–12 steg från ×0,35. Simuleringen kostar ~3,5 µs per kropp och bildruta.

**Spec beslutad (ägaren, samma eftermiddag):** ålder 3–5 · barnet lutar och häller SJÄLV med
fysik, ingen automatik · värmereglage med 10 steg (reglage + − / +) · brända popcorn med · tre
gäster slumpade ur en pool på ~10 på slumpade platser · ett litet kort poppljud. → Plan i
**`docs/games/popcornkalaset.md`** (spec, sex risker, byggordning B0–B13, gästpoolen); IDEER post 6
pekar dit. Hällningen föreslås som "där du greppar är där den hänger" (handtaget bär vågrätt,
kanten låter grytan svänga och hälla) — prototypas och mäts först (`_hallprobe`).

**Poppljudet skapat:** MOSS var nere och det enda popp-klippet (`pop.mp3`) är ett bubbelplopp på
1,05 s som dessutom är en SERIE — så `scripts/gen-popp.mjs` syntetiserar sex varianter
`popp_1…6` (75 ms, klick + glidande pok + delton + fjun, RMS −24 dB, topp −4…−8 dB, seedat, egen
licens) och lägger variantserien `popp` i manifestet (prövad mot literala och dynamiska
`sample`/`sfx` — ingen annan användare). `scripts/_poppdemo.mjs` gör en lyssningsdemo av en kaskad:
med spärren 80 ms hörs 18 av 38 popp. Gästpoolen inventerad (subagent, verifierad mot koden):
sex gäster är redan exporterade, fyra måste brytas ut till `lib/figurer.js`.

**Ägaren efter lyssning:** poppen godkänd, och **utan spärr lät bäst** → ingen ljudspärr. Det gav
ett fynd: i den godkända kaskaden låg 17 av 37 mellanrum under 30 ms, och `audio.sfx()`s
anti-loop-golv hade tystat dem — spelet måste spela poppen med `audio.sample('popp')`
(planen B11, ljudskillen). Tap-reserven vald: tryck på grytan → tryck på en skål = grytan flyttas
dit men häller aldrig (tipp-stöten valdes bort).

**Öppet:** inga ägarfrågor kvar. Nästa session bygger: B0 omritningen i webbläsaren, B1
hällningen med `_hallprobe` och tap-reserven.

---

*Äldre poster (133 st, juni → 2026-09-25) står i [`docs/arkiv/SESSIONS-arkiv.md`](arkiv/SESSIONS-arkiv.md). Läs dem bara när du letar efter något bestämt.*
