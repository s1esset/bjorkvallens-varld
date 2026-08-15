# start.ps1 — Björkvallens Värld
# Startar en LOKAL server med produktionsbygget (vite preview) i ett eget terminalfönster.
#   - Rensar först gamla/stale serverprocesser (via stop.ps1)
#   - Bygger och startar preview på :4173, bunden till alla nätverkskort
#
# Telefonen går INTE hit längre. Appen ligger på GitHub Pages och publiceras med
# `npm run deploy`:  https://s1esset.github.io/bjorkvallens-varld/
# Den här servern är till för att titta på produktionsbygget på den HÄR datorn innan
# det publiceras — och för en telefon på samma wifi, med förbehållet nedan.
#
# ⚠️ Utan HTTPS installeras ingen PWA och ingen service worker registreras. En telefon på
# samma nät (http://<datorns-ip>:4173) kan alltså SPELA spelen men aldrig prova install,
# offline-läge eller uppdateringsflödet. Ska det provas: publicera och öppna Pages-adressen.
#
# Kör:  .\scripts\start.ps1            (bygg + starta)
#       .\scripts\start.ps1 -NoBuild   (hoppa över bygget, starta bara servern)
param([switch]$NoBuild)
$ErrorActionPreference = 'Stop'

$Proj        = 'Björkvallens Värld'
$Root        = Split-Path -Parent $PSScriptRoot
$PreviewPort = 4173
$PidFile     = Join-Path $Root '.server.pid'

# --- Rensa gamla processer först (ren omstart) ---
& "$PSScriptRoot\stop.ps1" -Quiet

Set-Location $Root

# --- Adress på det lokala nätet (för en telefon på samma wifi) ---
# Ta kortet som har en DEFAULT GATEWAY. Att bara plocka "första IPv4 som inte är 127.*"
# ger lika gärna ett virtuellt kort (Hyper-V, WSL, VPN) som telefonen inte kan nå.
$Lan = (Get-NetIPConfiguration -ErrorAction SilentlyContinue |
        Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } |
        Select-Object -First 1).IPv4Address.IPAddress
$LanUrl = if ($Lan) { "http://${Lan}:${PreviewPort}" } else { '(hittade inget nätverkskort)' }

# --- Bygg (om inte -NoBuild) ---
if (-not $NoBuild) {
  Write-Host "==> Bygger $Proj ..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { Write-Error "Bygget misslyckades — servern startades inte."; exit 1 }
}

# --- Starta preview i ett eget fönster med tydlig projekt-banner ---
# Projektnamnet + URL:en skrivs stort i terminalen (banner). Fönstertiteln sätts också
# best-effort. Vite körs direkt via node så npm inte lägger sig emellan.
$title = "$Proj — server"
$inner = @"
try { [Console]::Title = '$title' } catch {}
Set-Location '$Root'
Write-Host ''
Write-Host '  ============================================================' -ForegroundColor DarkCyan
Write-Host '   $Proj — LOKAL SERVER' -ForegroundColor Green
Write-Host '  ------------------------------------------------------------' -ForegroundColor DarkCyan
Write-Host '   Lokalt    : http://localhost:$PreviewPort' -ForegroundColor Yellow
Write-Host '   Samma nät : $LanUrl' -ForegroundColor Gray
Write-Host '   Skarpt    : https://s1esset.github.io/bjorkvallens-varld/' -ForegroundColor Gray
Write-Host '  ============================================================' -ForegroundColor DarkCyan
Write-Host ''
Write-Host '   Utan HTTPS: ingen PWA-install, ingen service worker, inget offline-lage.' -ForegroundColor DarkGray
Write-Host '   (Stang detta fonster eller kor scripts\stop.ps1 for att stoppa)' -ForegroundColor DarkGray
Write-Host ''
node node_modules/vite/bin/vite.js preview --host --port $PreviewPort
"@
$proc = Start-Process powershell -PassThru -ArgumentList '-NoExit', '-Command', $inner
# Spara topp-PID:t så stop.ps1 kan döda hela trädet (powershell -> node)
try { Set-Content -Path $PidFile -Value $proc.Id -Encoding ascii } catch {}

# --- Bekräftelse i ursprungsfönstret ---
Write-Host ''
Write-Host "  $Proj körs nu i ett eget fönster (`"$title`")." -ForegroundColor Green
Write-Host "    Lokalt    : http://localhost:$PreviewPort" -ForegroundColor Yellow
Write-Host "    Samma nät : $LanUrl"
Write-Host ''
Write-Host "  Till telefonen: npm run deploy  ->  https://s1esset.github.io/bjorkvallens-varld/" -ForegroundColor Cyan
Write-Host "  Stoppa med:  .\scripts\stop.ps1   (eller  npm run serve:stop)" -ForegroundColor DarkGray
