# Speglar projektet till backup-disken med robocopy (snabbt aven pa en 5400 rpm-disk:
# bara andrade filer kopieras). Kors av /avsluta och `npm run backup`.
#
#   npm run backup                       -> E:\backup\pwagames
#   powershell -File scripts/backup.ps1 -Dest D:\backup\pwagames
#
# node_modules/dist/dev-dist utesluts - de byggs om pa sekunder och ar 100-tals MB.
# .git tas MED (hela historiken ar poangen med backupen).
#
# OBS: hall den har filen ASCII-ren. Windows PowerShell laser .ps1 som ANSI, sa
# aao/checkmarkar i strangar ger parse-fel (filen saknar BOM).
param(
  [string]$Dest = 'E:\backup\pwagames'
)

$ErrorActionPreference = 'Stop'
$src = Split-Path -Parent $PSScriptRoot

$exclDirs = @('node_modules', 'dist', 'dev-dist', '.vite', '.test-shots', 'old')
$exclFiles = @('*.log', '.server.pid')

# Kolla att DISKEN finns (inte mappen - den skapas). En frankopplad backup-disk
# far aldrig blockera ett sessionsavslut.
$drive = Split-Path -Qualifier $Dest
if (-not (Test-Path "$drive\")) {
  Write-Host "[backup] Backup-disken $drive saknas - hoppar over backup." -ForegroundColor Yellow
  exit 0
}
if (-not (Test-Path $Dest)) { New-Item -ItemType Directory -Path $Dest -Force | Out-Null }

Write-Host "[backup] Speglar $src -> $Dest ..."
$t0 = Get-Date

# /MIR speglar (raderar det som tagits bort i kallan), /NFL /NDL tystar fil-/mapplistan,
# /R:1 /W:1 ger snabb retratt vid lasta filer, /MT:8 parallelliserar.
$rcArgs = @($src, $Dest, '/MIR', '/NFL', '/NDL', '/NJH', '/NP', '/R:1', '/W:1', '/MT:8',
            '/XD') + $exclDirs + @('/XF') + $exclFiles
& robocopy @rcArgs | Out-Null
$code = $LASTEXITCODE

$secs = [math]::Round(((Get-Date) - $t0).TotalSeconds, 1)
# robocopy: 0-7 = OK (0 inget nytt, 1 kopierat, 2 extra, 3 bada ...), >=8 = fel
if ($code -lt 8) {
  $size = [math]::Round((Get-ChildItem $Dest -Recurse -Force -ErrorAction SilentlyContinue |
           Measure-Object -Property Length -Sum).Sum / 1MB, 1)
  Write-Host "[backup] OK pa ${secs}s - $Dest ($size MB)" -ForegroundColor Green
  exit 0
} else {
  Write-Host "[backup] MISSLYCKADES (robocopy-kod $code)" -ForegroundColor Red
  exit 1
}
