# BACKLOG.md — parkerat arbete som INTE är spel

Saker vi har bestämt att göra "senare", och som inte hör hemma i någon av de andra listorna:

| Lista | Innehåll |
|---|---|
| `docs/IDEER.md` | spelidéer som väntar på planering |
| `docs/ATGARDER.md` | rapporterade buggar som väntar på fix |
| `docs/LYFTPLAN.md` | app-breda lyft i delade libb (motor · assets · rendering) |
| **`docs/BACKLOG.md`** | **allt annat: distribution, verktyg, miljö, beslut som väntar på ägaren** |

Nyast överst. Status: ⬜ ej påbörjad · 🟨 pågår · ✅ klar (raden stryks och hamnar i `SESSIONS.md`).

---

## 4. Kits Library — CC0-bildbibliotek som ligger lokalt 🟨

*Inlagt 2026-08-30. Ägaren har bestämt lagringen: **råkittet ligger kvar lokalt i sin katalog
och committas aldrig; det som faktiskt används plockas ut till en egen mapp när det används.**
Raden står som 🟨 för att första uttaget inte är gjort — inte för att något väntar på ett beslut.*

`assets-src/kits-library-assets-main/` · **CC0 1.0** · 547 MB · ospårad via `.gitignore`.

**Vad som finns.** 16 kataloger, ~2 300 PNG+SVG-par. Två är inte kit: `example-worlds/`
(13 webp-kompositioner) och `terrain-kit/`. De övriga:

| | | | |
|---|---|---|---|
| medieval 347 | nature 314 | interior 285 | terrain 227 |
| space 170 | cyberpunk 158 | pirate 146 | halloween 133 |
| city 123 | ruins 106 | food 98 | winter 88 |
| western 85 | dungeon 78 | barbieland 53 | |

**Uttagsvägen.** Plocka ut → skala ner → webp → `public/bilder/<kit>/` → ladda som bundle via
`services/AssetService.js`, med `import.meta.env.BASE_URL` som bas precis som `lib/ansikte.js`
gör (Pages ligger på underväg — en absolut sökväg bryter). Bara det ett spel faktiskt använder
committas.

**Mätt 2026-08-30, inte gissat:**

- **Vikten är inget hinder.** Hela food-kittet (98 föremål) nedskalat till 256 px webp väger
  **680 KB**, median 3 KB per fil. Rå-PNG för samma kit är 6,7 MB. Det som är tungt är
  `city-kit` (119 MB, enstaka filer på 4,5 MB) — skala ALLTID ner, kopiera aldrig rått.
- **Filantalet är den verkliga kostnaden, inte megabyten.** Precachen ligger redan på ~1 900
  filer mot en mätt 4-sekundersgräns för installationen (se minnet *PWA-uppdatering krävde två
  tryck*). `globPatterns` i `vite.config.js:56` fångar webp, så varje uttagen fil hamnar i
  precachen. Håll uttagen små och per spel.
- **Stilkrocken är verklig och riktningsberoende.** Kittet är mjukt skuggat, rundat och matt i
  **3/4-vy med en inbakad markskugga**; appen är platt front-/sidovy. Mat och lösa föremål
  transfererar bra — träd, möbler och byggnader ser ditsatta ut. Skuggan går att stryka: den
  ligger som separata `<ellipse>` + filter i SVG:n.
- **Läsbarheten i småformat är kittets starkaste kort.** Kittets mat mot `pizzabageriet`s
  nuvarande ingredienshylla i samma höjd (86 px) är ingen jämn match — appens egna ikoner
  försvinner (strösslet är nästan osynligt), kittets läser direkt.

**Två fallgropar.**

1. **Varumärken.** CC0 täcker uttryckligen *inte* varumärken, och några assets bär
   varumärkeslika märken — en Coca-Cola-liknande läskburk, en "ROBOTOS"-sirapsflaska, ett
   chokladomslag med "R". De ska sorteras bort vid uttaget.
2. **Food-kittet lutar mot godis.** Munkar, glass, klubbor och läsk dominerar; av riktiga
   råvaror finns bara en handfull (äpple, morot, tomat, jordgubbe, körsbär, majs, kokos).
   Räkna inte med att kittet ensamt kan klä ett spel om att äta riktig mat.

**Var det troligen tjänar mest.** Matspelen — `pizzabageriet`, `hamburgerbygget`,
`mata-munnen`, `mata-monstret` — där vinsten är mätbar och 3/4-projektionen spelar minst roll.
Det vore också appens FÖRSTA `Sprite`/`Texture` i ett spel: `docs/LYFTPLAN.md:21` räknar dem
till **0** idag, allt är procedurell `Graphics`. Vägen är byggd och bevisad (`AssetService` +
`lib/ansikte.js` laddar 33 webp), men den är oprövad i gameplay — och ett sprite-föremål kan
inte deformeras som en `Graphics` kan, vilket flera fysikspel bygger på.

---

## 1. Publicera appen via GitHub så telefonen slipper min dator ✅

*Inlagd 2026-08-09, **klar 2026-08-15**. Ägaren sa ja till publikt repo med öppna ögon om
att appen namnger och avbildar familjen. Sajten: <https://s1esset.github.io/bjorkvallens-varld/>
· repo: `s1esset/bjorkvallens-varld` (publikt) · workflow: `.github/workflows/deploy.yml`.
Utfallet står i `SESSIONS.md` v1.217.0. Kvar av utredningen nedan som referens.*

**Frågan som ställdes:** kan PWA:n uppdateras genom ett GitHub-repo, eller krävs en server
som körs?

**Svaret, utrett 2026-08-09:** GitHub Pages räcker, och ägaren behöver inte driva någon
server. Men "ingen server alls" stämmer inte — en PWA måste hämta `index.html` och `sw.js`
från ett HTTPS-ursprung. Pages **är** den servern. Repot i sig duger inte:
`raw.githubusercontent.com` skickar fel content-type och ger ingen service worker-scope.

Flödet: `git push` → GitHub Actions kör `npm run build` → publicerar `dist/` → telefonen
öppnar `https://<användare>.github.io/<repo>/`.

**Projektet är redan förberett — noll kodändringar behövs** (verifierat mot `vite.config.js`
2026-08-09):

| Sak | Läge |
|---|---|
| `base: './'` | relativ → fungerar på underväg (`/<repo>/`) utan omskrivning |
| `start_url` + `scope` `'./'` | samma sak |
| Nätanrop vid körning | noll (P0) → helt offline efter första besöket |
| Uppdatering | redan menygrindad (`registerType: 'prompt'` + `skipWaiting: false`) |
| Storlek | 28 MB ljud + bygge; Pages tål 1 GB sajt och 100 GB trafik/månad |

**Tre saker som är ägarens beslut, inte tekniska hinder:**

1. **Sajten blir PUBLIK.** GitHub Pages kan inte vara privat på gratiskonto (kräver
   Enterprise). Appen namnger och avbildar ägarens barn — Zacke, Alissa, Elvira, Lova
   (se `lib/theme.js` och P0 KARAKTÄRER). Det här är den enda punkt jag skulle tveka på.
2. **`CLAUDE.md` säger uttryckligen "Repot är lokalt — aldrig `git push`".** Att lägga upp
   projektet ÄR en ändring av den regeln och måste komma från ägaren.
3. **Alternativ med samma bekvämlighet men utan publik sajt:** Cloudflare Pages eller
   Netlify kan låsa bakom inloggning på gratisnivå. Tailscale (dagens lösning) är mest
   privat, men kräver att datorn är påslagen.

**Praktisk skillnad mot idag:** Tailscale-servern kör bara när `scripts/start.ps1` har
körts; Pages ligger uppe alltid.

**Om det blir ja — vad som ska göras:**
1. Skapa repot (publikt eller privat + Pages-plan) och lägg till remote.
2. `.github/workflows/deploy.yml`: `npm ci` → `npm run build` → `actions/deploy-pages` med
   `dist/` som artefakt.
3. Verifiera på telefonen att `index.html`, `sw.js` och `manifest.webmanifest` svarar 200
   (samma kontroll som görs för Tailscale-URL:en idag).
4. Uppdatera `CLAUDE.md`-raden om "aldrig git push" så dokumentet inte ljuger om appen.

---

## 2. Miljöstädning: två dev-servrar och en död `.server.pid` ⬜

*Inlagd 2026-08-09 (upptäckt i nattpasset, se `SESSIONS.md` v1.62.0). Ingen har rörts —
jag dödar inga processer på ägarens maskin utan att bli ombedd.*

Två `npm run dev`/vite-instanser kör mot samma repo (en äger 5173, en är föräldralös) och
`.server.pid` pekar på en död PID. `scripts/stop.ps1` rör bara projektets egen
preview-server (4173) och löser alltså inte det här.

⚠️ Testharnessen använder **5173**. Döda inte den instansen mitt i en `npm run test`-körning.

---

## 3. `npm run sfx` är skyldig tre spel sina klipp ⬜

*Inlagd 2026-08-09. Blockerad av att MOSS-SoundEffect är nere.*

`saknat-ljudklipp` i `test:all`: `sapbubblor` ×9 · `bajs-och-kiss` ×3 · `kittla-figuren` ×1.
Det är klipp som saknas i manifestet, **inte** ett kallstarts-race (den buggen är fixad, se
`ATGARDER.md` V8). Kör `npm run sfx` när tjänsten är uppe igen.
