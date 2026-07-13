# start.ps1 — Björkvallens Värld
# Startar servern (produktionsbygge -> vite preview) och exponerar den på Tailscale-nätet.
# Servern körs i ett EGET terminalfönster döpt efter projektet, med URL:en synlig.
#   - Rensar först gamla/stale serverprocesser (via stop.ps1)
#   - Säkerställer Tailscale serve 8445 -> 4173 (idempotent, ej fatalt)
#   - Bygger, startar preview i eget fönster, skriver ut Tailscale-URL:en
#
# Kör:  .\scripts\start.ps1            (bygg + starta)
#       .\scripts\start.ps1 -NoBuild   (hoppa över bygget, starta bara servern)
param([switch]$NoBuild)
$ErrorActionPreference = 'Stop'

$Proj        = 'Björkvallens Värld'
$Root        = Split-Path -Parent $PSScriptRoot
$PreviewPort = 4173
$TsPort      = 8445
$Tailscale   = 'C:\Program Files\Tailscale\tailscale.exe'
$PidFile     = Join-Path $Root '.server.pid'

# --- Rensa gamla processer först (ren omstart) ---
& "$PSScriptRoot\stop.ps1" -Quiet

Set-Location $Root

# --- Härled Tailscale MagicDNS-namnet dynamiskt (fallback hårdkodat) ---
$TsName = 'andreas-psai1.tail4e6703.ts.net'
if (Test-Path $Tailscale) {
  try {
    $self = (& $Tailscale status --json 2>$null | ConvertFrom-Json).Self.DNSName
    if ($self) { $TsName = $self.TrimEnd('.') }
  } catch {}
}
$Url = "https://${TsName}:${TsPort}"

# --- Bygg (om inte -NoBuild) ---
if (-not $NoBuild) {
  Write-Host "==> Bygger $Proj ..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { Write-Error "Bygget misslyckades — servern startades inte."; exit 1 }
}

# --- Säkerställ Tailscale-proxy 8445 -> 4173 (idempotent; ej fatalt) ---
if (Test-Path $Tailscale) {
  Write-Host "==> Tailscale serve https:$TsPort -> http://127.0.0.1:$PreviewPort" -ForegroundColor Cyan
  & $Tailscale serve --bg --https=$TsPort "http://127.0.0.1:$PreviewPort" 2>$null
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
Write-Host '   $Proj — SERVER' -ForegroundColor Green
Write-Host '  ------------------------------------------------------------' -ForegroundColor DarkCyan
Write-Host '   Tailscale : $Url' -ForegroundColor Yellow
Write-Host '   Lokalt    : http://localhost:$PreviewPort' -ForegroundColor Gray
Write-Host '  ============================================================' -ForegroundColor DarkCyan
Write-Host ''
Write-Host '   (Stäng detta fönster eller kör scripts\stop.ps1 for att stoppa)' -ForegroundColor DarkGray
Write-Host ''
node node_modules/vite/bin/vite.js preview --host --port $PreviewPort
"@
$proc = Start-Process powershell -PassThru -ArgumentList '-NoExit', '-Command', $inner
# Spara topp-PID:t så stop.ps1 kan döda hela trädet (powershell -> node)
try { Set-Content -Path $PidFile -Value $proc.Id -Encoding ascii } catch {}

# --- Bekräftelse i ursprungsfönstret ---
Write-Host ''
Write-Host "  $Proj körs nu i ett eget fönster (`"$title`")." -ForegroundColor Green
Write-Host "    Tailscale : $Url" -ForegroundColor Yellow
Write-Host "    Lokalt    : http://localhost:$PreviewPort"
Write-Host ''
Write-Host "  Stoppa med:  .\scripts\stop.ps1   (eller  npm run serve:stop)" -ForegroundColor DarkGray
