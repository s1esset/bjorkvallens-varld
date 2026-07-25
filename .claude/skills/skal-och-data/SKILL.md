---
name: skal-och-data
description: Use when changing the app shell rather than a game - splash/menu/settings/library screens, navigation, the Pixi Application and layers, services, the localStorage save schema and migrations, profiles, the parental gate, PWA/service-worker update flow, version pill, design tokens, or serving the build to a phone. Triggers on - shell, skal, App.js, Nav, router, skärm, screen, MenuScreen, LibraryScreen, SettingsScreen, SplashScreen, GameHost, save, SaveService, localStorage, schema, migration, profil, profile, ParentalGate, grind, PWA, service worker, manifest, version, versionspill, DESIGN.md, tokens, SPACING, RADIUS, ANIM, preview, Tailscale, telefon, phone.
---

# Skalet, data & leverans

Skalet är tunt och äger allt spelen inte får röra. Ett spel vet ingenting om skalet.

## Struktur

```
src/main.js            bootstrap: Pixi-app, tjänster, router, splash
src/styles.css         låser webbläsargester (touch-action:none) + @font-face
src/shell/App.js       äger Pixi Application + lager (bg/world/screenHolder/fxLayer/gateLayer)
src/shell/Nav.js       skärm-router (state machine + fade)
src/shell/screens/     SplashScreen · MenuScreen · SettingsScreen · LibraryScreen · GameHost
src/services/          Scaler · SaveService · ProfileService · AudioService · VoiceService
                       AssetService · StickerService · ParentalGate
```

**Skärmflöde:** `splash → meny → (bibliotek → spel)` · `meny → grind → inställningar` ·
`meny → grind → bekräfta → avsluta`. Alla vuxenhandlingar bakom `services.gate.open()`
(tryck-och-håll 2,5 s). En väntande service worker-uppdatering appliceras **bara vid menyn**
(`applyPendingUpdateAtMenu`) — aldrig mitt i ett spel.

**Bibliotek:** fyra flikar ur `TAB_GROUPS` (`lib/theme.js`) + Nyast/A–Ö-sortering, båda
persisterade i `localStorage` under `pwagames.library.ui`. Horisontell svep byter flik
(axellåst mot vertikal scroll).

## Designsystemet

`docs/DESIGN.md` är appens globala UI-designsystem (spacing, färgroller, typografi, radier,
rörelse, komponenter). Tokens bor i `src/lib/theme.js`: `SPACING · RADIUS · ANIM · COLORS ·
FONT · shade() · tint()`. **Hårdkoda aldrig ett värde som har en token.**

## Versionsnummer

Menyns uppdateringsknapp är ett litet pill vars etikett **är** versionen `vM.NN` (MINOR
zero-paddad, via `appVersion()` i `lib/pwa.js`, källa `package.json`). Bumpa MINOR vid varje
hopslagen ändringsomgång — annars kan föräldern inte se att uppdateringen slog igenom.
Se `docs/DESIGN.md §9`.

## Spardata

`localStorage`-nyckel `pwagames.save.v1`, backup `pwagames.save.bak`.

```jsonc
{
  "schemaVersion": 1, "app": "pwagames",
  "createdAt": "ISO", "updatedAt": "ISO", "activeProfileId": "p_xxxx",
  "settings": { "masterVolume": 0.8, "musicEnabled": true, "sfxEnabled": true,
                "voiceEnabled": true, "parentalGateEnabled": true, "sessionReminderMinutes": 0 },
  "profiles": [{
    "id": "p_xxxx", "name": "Astrid", "avatar": "rav",     // namn lagras som skrivet (åäö ok)
    "createdAt": "ISO", "lastPlayedAt": "ISO", "settings": {},
    "stats": { "totalPlaySeconds": 0, "starsTotal": 37, "stickers": ["klambubblor"] },
    "games": { "vandkort": { "unlocked": true, "highestLevel": 4, "stars": 9,
                             "lastPlayedAt": "ISO", "custom": {} } }   // keyad på GameModule.id
  }]
}
```

Skrivningar debounce:as 500 ms och flushas synkront vid `visibilitychange=hidden`/`pagehide`.
Läsning validerar, faller tillbaka på backupen och kör sekventiella migreringar
(`SaveService._migrate`). Export/import av JSON ligger i Inställningar bakom grinden.
**Ändrar du schemat: lägg till en migrering och bumpa `SCHEMA_VERSION`.**
Ingen PII lämnar enheten. Ett spel går alltid via `ctx.progress`, aldrig via `localStorage`.

## Leverans till telefon/platta

```
npm run build          # produktionsbygge (service worker + manifest)
npm run serve          # servera bygget på :4173 (scripts/start.ps1, titelsatt fönster)
npm run serve:stop     # dödar bara detta projekts träd (.server.pid + port 4173)
```

Tailscale mappar `https://andreas-psai1.tail4e6703.ts.net:8445 → 127.0.0.1:4173` (endast
tailnet). På telefonen: öppna → meny → ladda om för att plocka upp den nya buggen; bekräfta
med **versionspillret**.

⚠️ **Stale servrar är den vanligaste fällan** — en gammal `vite preview` serverar ett gammalt
bygge till telefonen. Kolla lyssnare på 5173/4173 innan test.
⚠️ Headless-harnessen kan **inte** driva preview-bygget: `window.__barnspel` är DEV-only.
Verifiera preview på riktig enhet eller kör mot dev (5173).
