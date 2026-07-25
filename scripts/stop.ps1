# stop.ps1 — Björkvallens Värld
# Dödar ENDAST detta projekts server (nuvarande + gamla/stale processer):
#   - serverfönster vi startat (titel innehåller "Björkvallens")
#   - allt som lyssnar på preview-porten 4173 (Tailscale-URL:en pekar hit)
# Rör ALDRIG andra projekts servrar/portar/Tailscale-proxys.
param([switch]$Quiet)
$ErrorActionPreference = 'SilentlyContinue'
$Root        = Split-Path -Parent $PSScriptRoot
$PreviewPort = 4173
$PidFile     = Join-Path $Root '.server.pid'
$killed = 0

function Say($msg, $color = 'Gray') { if (-not $Quiet) { Write-Host $msg -ForegroundColor $color } }

Say "== Stoppar Björkvallens Värld ==" 'Cyan'

# 1) Serverfönstret vi startat (via sparat PID) — döda HELA trädet (powershell->npm/vite->node)
if (Test-Path $PidFile) {
  $savedPid = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  if ($savedPid -match '^\d+$' -and (Get-Process -Id $savedPid -ErrorAction SilentlyContinue)) {
    taskkill /PID $savedPid /T /F 2>&1 | Out-Null
    $script:killed++
    Say "  Stängde serverfönstret (PID $savedPid)"
  }
  Remove-Item $PidFile -ErrorAction SilentlyContinue
}

# 2) Fallback: serverterminaler med projekt-titel (om titeln inte skrivits over)
Get-Process powershell, pwsh -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowTitle -like '*Björkvallens*' } |
  ForEach-Object {
    taskkill /PID $_.Id /T /F 2>&1 | Out-Null
    $script:killed++
    Say "  Stängde serverfönster (PID $($_.Id))"
  }

# 3) Kvarvarande processer på preview-porten (fångar stale servrar utan fönster/PID-fil)
Get-NetTCPConnection -LocalPort $PreviewPort -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object {
    $name = (Get-Process -Id $_ -ErrorAction SilentlyContinue).ProcessName
    taskkill /PID $_ /T /F 2>&1 | Out-Null
    $script:killed++
    Say "  Dödade $name (PID $_) på port $PreviewPort"
  }

if ($killed -eq 0) { Say "  Inget körde — redan rent." 'DarkGray' }
else { Say "Klart — stoppade $killed sak(er)." 'Green' }

# OBS: Tailscale serve-mappningen 8445->4173 lämnas kvar (permanent, delas inte med
# andra projekt). Den ger bara 502 när servern är nere. `start.ps1` återanvänder den.
