<#
  NATTKÖRNINGENS DRIVARE — kör faserna i .claude/state/natt/plan.json, var och en som en
  EGEN headless Claude-session, och publicerar själv i slutet.

  Varför en drivare i stället för ett cron-jobb i en öppen session:
  · varje fas börjar med en LITEN kontext (regler + fasens arbetsorder + checkpoint) i stället
    för att dra med sig hela nattens historik;
  · när kvoten tar slut SOVER drivaren till återställningen och startar en FÄRSK session som
    läser checkpointen (scripts/natt.mjs). Att återuppta en session efter >1 h skickar hela
    historiken okachad — den kalla uppvärmningen är det vi undviker;
  · publiceringen (`npm run deploy`, grinden sitter i deploy.mjs) körs av drivaren och inte av
    en modell, så den blir av även om kvoten är slut när morgonen kommer.

  Modeller: fasen körs på Opus (orkestrerare). Underagenter ärver CLAUDE_CODE_SUBAGENT_MODEL =
  Sonnet (byggare, kritiker). Fasens arbetsorder säger dessutom model: "sonnet" i varje anrop.

  pwsh -NoProfile -File scripts/nattkorning.ps1                  natten (läser plan.json)
  pwsh -NoProfile -File scripts/nattkorning.ps1 -Torrkorning     en provfas med haiku: inloggning,
                                                                 rättigheter, nekad push, loggar
  pwsh -NoProfile -File scripts/nattkorning.ps1 -Schemalagg "2026-09-30 22:30"
                                                                 registrerar Windows-uppgiften
                                                                 (start + två väktarstarter)
  pwsh -NoProfile -File scripts/nattkorning.ps1 -Avregistrera    tar bort uppgiften
#>
param(
  [switch]$Torrkorning,
  [string]$Schemalagg,
  [switch]$Avregistrera,
  [switch]$IngenDeploy,
  [string]$Katalog = '.claude\state\natt',   # simulering: en egen katalog med egen plan
  [string]$Modell                             # simulering: t.ex. haiku i stället för Opus
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Dir = Join-Path $Root $Katalog
$Rel = ($Katalog -replace '\\', '/').TrimEnd('/')
$env:NATT_DIR = $Rel                          # scripts/natt.mjs läser samma katalog
$LogDir = Join-Path $Dir 'loggar'
$PlanFile = Join-Path $Dir 'plan.json'
$Lock = Join-Path $Dir 'driver.lock'
$Rapport = Join-Path $Dir 'MORGONRAPPORT.md'
$Settings = Join-Path $Root 'scripts\natt-settings.json'
$Claude = Join-Path $env:USERPROFILE '.local\bin\claude.exe'
$Pwsh = (Get-Command pwsh).Source
$TaskName = 'Bjorkvallen-Nattkorning'
$Orkestrerare = if ($Modell) { $Modell } else { 'claude-opus-5-5' }
$Byggmodell = 'claude-sonnet-5-5'
New-Item -ItemType Directory -Force $LogDir | Out-Null

function Logg([string]$rad) {
  $s = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $rad"
  Write-Host $s
  Add-Content -Path (Join-Path $Dir 'driver.log') -Value $s -Encoding utf8
}

# ── Windows-uppgiften ─────────────────────────────────────────────────────────────────────
if ($Avregistrera) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "✓ uppgiften $TaskName borttagen (om den fanns)"
  exit 0
}
if ($Schemalagg) {
  $start = [datetime]::Parse($Schemalagg)
  $extra = if ($Torrkorning) { ' -Torrkorning' } else { '' }
  $act = New-ScheduledTaskAction -Execute $Pwsh -WorkingDirectory $Root `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"$extra"
  # Startar vid $start. De två väktartriggrarna gör ingenting om drivaren redan kör
  # (MultipleInstances IgnoreNew + låsfilen) — de finns för att en krasch/omstart inte ska
  # kosta resten av natten. Drivaren tar själv bort uppgiften när den är klar.
  $trig = @((New-ScheduledTaskTrigger -Once -At $start)) +
    @(2, 4, 6, 8, 10 | ForEach-Object { New-ScheduledTaskTrigger -Once -At $start.AddHours($_) })
  if ($Torrkorning) { $trig = @($trig[0]) }
  $set = New-ScheduledTaskSettingsSet -WakeToRun -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 14)
  $prin = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
  Register-ScheduledTask -TaskName $TaskName -Action $act -Trigger $trig -Settings $set -Principal $prin -Force | Out-Null
  Write-Host "✓ $TaskName startar $($start.ToString('yyyy-MM-dd HH:mm'))$extra"
  exit 0
}

# ── lås: en drivare i taget ───────────────────────────────────────────────────────────────
if (Test-Path $Lock) {
  $gammal = [int]((Get-Content $Lock -Raw).Trim())
  if (Get-Process -Id $gammal -ErrorAction SilentlyContinue | Where-Object ProcessName -eq 'pwsh') {
    Logg "En drivare kör redan (pid $gammal) — den här avslutar."
    exit 0
  }
}
Set-Content -Path $Lock -Value $PID -Encoding ascii

# En drivare som dog (fönstret stängdes) lämnar sin claude-session levande — en väktarstart får
# då aldrig starta en andra session på samma fas och samma arbetsträd. Vänta ut den.
$sp = Join-Path $Dir 'session.pid'
if (Test-Path $sp) {
  $gammal = [int]((Get-Content $sp -Raw).Trim())
  $proc = Get-Process -Id $gammal -ErrorAction SilentlyContinue | Where-Object ProcessName -eq 'claude'
  if ($proc) {
    Write-Host "En föräldralös claude-session (pid $gammal) kör fortfarande — väntar tills den är klar."
    $proc.WaitForExit()
  }
  Remove-Item $sp -ErrorAction SilentlyContinue
}

# ── håll datorn vaken medan drivaren lever (ingen bestående energiinställning ändras) ─────
Add-Type -Namespace Natt -Name Kraft -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
[void][Natt.Kraft]::SetThreadExecutionState([uint32]'0x80000001')   # ES_CONTINUOUS | ES_SYSTEM_REQUIRED

# ── dev-servern (npm run test kräver den) ────────────────────────────────────────────────
$script:Dev = $null
function Dev-Uppe {
  try { return (Invoke-WebRequest 'http://localhost:5173' -TimeoutSec 4 -UseBasicParsing).StatusCode -eq 200 } catch { return $false }
}
function Sakra-Dev {
  if (Dev-Uppe) { return }
  Logg 'Dev-servern svarar inte — startar npm run dev'
  $script:Dev = Start-Process -FilePath 'cmd.exe' -WorkingDirectory $Root -WindowStyle Hidden -PassThru `
    -ArgumentList '/c', "npm run dev > `"$LogDir\dev.log`" 2>&1"
  for ($i = 0; $i -lt 30; $i++) { Start-Sleep -Seconds 2; if (Dev-Uppe) { Logg 'Dev-servern uppe'; return } }
  Logg '⚠ dev-servern kom inte upp på 60 s — fasen får försöka själv'
}

# ── en headless session ──────────────────────────────────────────────────────────────────
function Kor-Session([string]$namn, [string]$prompt, [string]$modell, [string]$effort, [int]$maxMin, [string[]]$extra = @()) {
  $bas = Join-Path $LogDir $namn
  $argv = @('-p', $prompt, '--model', $modell, '--effort', $effort,
    '--permission-mode', 'bypassPermissions', '--settings', $Settings,
    '--disallowedTools', 'PowerShell', 'CronCreate', 'CronDelete', 'ScheduleWakeup', 'RemoteTrigger', 'Workflow', 'Artifact',
    '--strict-mcp-config', '--no-chrome',
    '--output-format', 'stream-json', '--verbose', '--max-turns', '700', '-n', $namn) + $extra
  $psi = [System.Diagnostics.ProcessStartInfo]::new($Claude)
  foreach ($a in $argv) { $psi.ArgumentList.Add($a) }
  $psi.WorkingDirectory = $Root
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.Environment['CLAUDE_CODE_SUBAGENT_MODEL'] = $Byggmodell
  $psi.Environment['NATT_DIR'] = $Rel
  $ut = [IO.File]::Create("$bas.jsonl"); $fel = [IO.File]::Create("$bas.err.txt")
  $t0 = Get-Date
  $p = [System.Diagnostics.Process]::Start($psi)
  Set-Content (Join-Path $Dir 'session.pid') -Value $p.Id -Encoding ascii
  $k1 = $p.StandardOutput.BaseStream.CopyToAsync($ut)
  $k2 = $p.StandardError.BaseStream.CopyToAsync($fel)
  $hann = $p.WaitForExit($maxMin * 60 * 1000)
  if (-not $hann) {
    Logg "⚠ $namn överskred $maxMin min — avbryts (arbetet ligger kvar på disk, nästa session tar vid)"
    & taskkill.exe /T /F /PID $p.Id 2>&1 | Out-Null
    [void]$p.WaitForExit(30000)
  }
  [void]$k1.Wait(15000); [void]$k2.Wait(15000); $ut.Dispose(); $fel.Dispose()
  Remove-Item (Join-Path $Dir 'session.pid') -ErrorAction SilentlyContinue
  $min = [math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
  return [pscustomobject]@{ Kod = $(if ($hann) { $p.ExitCode } else { -1 }); Timeout = -not $hann; Bas = $bas; Minuter = $min }
}

# ── förbrukningen: resultatraden bär tokens per modell (underagenter inräknade) ──────────
# Det finns ingen dokumenterad kvotmätare för en headless session, så natten bokför det den
# faktiskt ser. Listpriset är inte vad ägaren betalar — det är en jämförbar skala mellan nätter.
$script:Forbrukning = [ordered]@{ usd = 0.0; modeller = [ordered]@{}; faser = @() }
function Bokfor($namn, $bas, $minuter) {
  $rad = Get-Content "$bas.jsonl" -ErrorAction SilentlyContinue |
    Where-Object { $_ -match '"type":"result"' -and $_ -match '"total_cost_usd"' } | Select-Object -Last 1
  if (-not $rad) { Logg "  förbrukning: ingen resultatrad (avbruten session)"; return }
  try { $j = $rad | ConvertFrom-Json } catch { return }
  $delar = @()
  foreach ($m in $j.modelUsage.PSObject.Properties) {
    $u = $m.Value
    $in = [double]$u.inputTokens + [double]$u.cacheCreationInputTokens
    $las = [double]$u.cacheReadInputTokens
    $ut = [double]$u.outputTokens
    if (-not $script:Forbrukning.modeller.Contains($m.Name)) {
      $script:Forbrukning.modeller[$m.Name] = [ordered]@{ nyaIn = 0.0; cacheLas = 0.0; ut = 0.0; usd = 0.0 }
    }
    $s = $script:Forbrukning.modeller[$m.Name]
    $s.nyaIn += $in; $s.cacheLas += $las; $s.ut += $ut; $s.usd += [double]$u.costUSD
    $kort = ($m.Name -replace '^claude-', '' -replace '-\d{8}$', '')
    $delar += ('{0}: {1:N1}M nya + {2:N1}M cache · {3:N2}M ut' -f $kort, ($in / 1e6), ($las / 1e6), ($ut / 1e6))
  }
  $script:Forbrukning.usd += [double]$j.total_cost_usd
  $script:Forbrukning.faser += [ordered]@{ namn = $namn; minuter = $minuter; usd = [double]$j.total_cost_usd; turer = $j.num_turns; agenter = $j.subagent_stats.spawned }
  $script:Forbrukning | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $Dir 'forbrukning.json') -Encoding utf8
  Logg ("  förbrukning {0}: {1} · {2} turer · {3} agenter · listpris ~{4:N0} USD (natten hittills ~{5:N0})" -f `
    $namn, ($delar -join ' | '), $j.num_turns, $j.subagent_stats.spawned, [double]$j.total_cost_usd, $script:Forbrukning.usd)
}

# ── kvotgränsen: "You've hit your session limit · resets 3:45am" ─────────────────────────
function Tolka-Aterstallning([string]$s) {
  if (-not $s) { return $null }
  $s = ($s -replace '\(.*?\)', '' -replace '[·"\\].*$', '').Trim()
  $nu = Get-Date
  $in = [regex]::Match($s, '(?i)^in\s+(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?')
  if ($in.Success -and ($in.Groups[1].Success -or $in.Groups[2].Success)) {
    $h = if ($in.Groups[1].Success) { [int]$in.Groups[1].Value } else { 0 }
    $m = if ($in.Groups[2].Success) { [int]$in.Groups[2].Value } else { 0 }
    return $nu.AddHours($h).AddMinutes($m)
  }
  $r = [regex]::Match($s, '(?i)^(?:(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?')
  if ($r.Success) {
    $h = [int]$r.Groups[2].Value
    $m = if ($r.Groups[3].Success) { [int]$r.Groups[3].Value } else { 0 }
    if ($r.Groups[4].Success) {
      $ap = $r.Groups[4].Value.ToLower()
      if ($ap -eq 'pm' -and $h -lt 12) { $h += 12 }
      if ($ap -eq 'am' -and $h -eq 12) { $h = 0 }
    }
    if ($h -gt 23 -or $m -gt 59) { return $null }
    $t = $nu.Date.AddHours($h).AddMinutes($m)
    if ($r.Groups[1].Success) {
      $dag = @{ sun = 0; mon = 1; tue = 2; wed = 3; thu = 4; fri = 5; sat = 6 }[$r.Groups[1].Value.Substring(0, 3).ToLower()]
      $t = $t.AddDays(($dag - [int]$nu.DayOfWeek + 7) % 7)
    }
    if ($t -le $nu) { $t = $t.AddDays(1) }
    return $t
  }
  $d = [datetime]::MinValue
  if ([datetime]::TryParse($s, [ref]$d) -and $d -gt $nu) { return $d }
  return $null
}
function Las-Grans($bas) {
  # stderr + slutet av strömmen, men INTE verktygsresultat ("type":"user") — en fas som läst
  # en fil där gränsmeddelandet står (t.ex. den här) får inte se ut att ha slagit i taket.
  $txt = ''
  if (Test-Path "$bas.err.txt") { $txt += (Get-Content "$bas.err.txt" -Raw -ErrorAction SilentlyContinue) + "`n" }
  if (Test-Path "$bas.jsonl") {
    $txt += ((Get-Content "$bas.jsonl" -Tail 60 -ErrorAction SilentlyContinue | Where-Object { $_ -notmatch '"type":"user"' }) -join "`n")
  }
  $m = [regex]::Match($txt, "(?i)hit your ([a-z0-9 -]*?)limit[^\n]*?resets\s+([^\n`"]+)")
  if ($m.Success) {
    return [pscustomobject]@{ Typ = $m.Groups[1].Value.Trim(); Text = $m.Groups[2].Value.Trim(); Nar = (Tolka-Aterstallning $m.Groups[2].Value) }
  }
  if ($txt -match '(?i)(usage limit|limit reached|hit your .*limit)') { return [pscustomobject]@{ Typ = 'okand'; Text = ''; Nar = $null } }
  return $null
}
function Vanta-Till([datetime]$t, [string]$varfor) {
  Logg "Sover till $($t.ToString('HH:mm')) — $varfor"
  while ((Get-Date) -lt $t) { Start-Sleep -Seconds 60 }
}

# ── torrkörning: bevisa att natten KAN köra innan den gör det ────────────────────────────
if ($Torrkorning) {
  try {
    Logg '── TORRKÖRNING ──'
    foreach ($prov in @(
        @('3:45am', 'klockslag'), @('3am (Europe/Stockholm)', 'tidszon'), @('Mon 12:00am', 'veckodag'),
        @('in 2h 13m', 'relativ'), @('11:05pm', 'kväll'))) {
      $t = Tolka-Aterstallning $prov[0]
      Logg ("tolkning {0,-26} → {1}" -f "'$($prov[0])' ($($prov[1]))", $(if ($t) { $t.ToString('ddd yyyy-MM-dd HH:mm') } else { 'MISSLYCKADES' }))
    }
    Logg "dev-servern: $(if (Dev-Uppe) { 'uppe' } else { 'nere' })"
    $prompt = 'Torrkorning av nattkorningen. Gor exakt detta och inget annat: ' +
      '(1) kor `node scripts/natt.mjs logg "torrkorning ok"`. ' +
      '(2) kor `git status --short` och rakna raderna. ' +
      '(3) forsok kora `git push --dry-run origin master` och notera om verktyget NEKADES (det ska det). ' +
      '(4) svara pa en rad: TORR OK · status=<antal rader> · push=<nekad|KORDES>.'
    $r = Kor-Session 'F0-torr' $prompt 'claude-haiku-4-5-20251001' 'low' 10
    $resultat = (Get-Content "$($r.Bas).jsonl" -ErrorAction SilentlyContinue | Where-Object { $_ -match '"type":"result"' } | Select-Object -Last 1)
    Logg "session: kod $($r.Kod) på $($r.Minuter) min"
    if ($resultat) { Logg ("svar: " + (($resultat | ConvertFrom-Json).result -replace "`n", ' ')) } else { Logg '⚠ inget result-meddelande — läs loggar\F0-torr.err.txt' }
    $g = Las-Grans $r.Bas
    if ($g) { Logg "kvotgräns syns: $($g.Typ) · $($g.Text)" }
    $sista = Get-Content (Join-Path $Dir 'logg.md') -Tail 1 -ErrorAction SilentlyContinue
    Logg "logg.md sista raden: $sista"
  } finally {
    [void][Natt.Kraft]::SetThreadExecutionState([uint32]'0x80000000')
    Remove-Item $Lock -ErrorAction SilentlyContinue
  }
  exit 0
}

# ── natten ────────────────────────────────────────────────────────────────────────────────
function Las-Plan { Get-Content $PlanFile -Raw -Encoding utf8 | ConvertFrom-Json }
$plan = Las-Plan
$SistaByggstart = [datetime]$plan.tider.sistaByggstart
$LeveransSenast = [datetime]$plan.tider.leveransSenast
$Morgon = [datetime]$plan.tider.morgon
Logg "── NATTKÖRNING $($plan.natt) — drivare pid $PID · sista byggstart $($SistaByggstart.ToString('HH:mm')) · leverans senast $($LeveransSenast.ToString('HH:mm')) · morgon $($Morgon.ToString('HH:mm'))"

$forsok = @{}
$overhoppad = @{}
$leveransKord = $false
try {
  while ($true) {
    $plan = Las-Plan
    $fas = $plan.faser | Where-Object { $_.status -ne 'klar' -and -not $overhoppad.ContainsKey($_.id) } | Select-Object -First 1
    if (-not $fas) { break }
    $arLeverans = $fas.typ -eq 'leverans'
    $nu = Get-Date

    if (-not $arLeverans -and $nu -gt $SistaByggstart) {
      Logg "⏭ $($fas.id) hoppas över — sista byggstart ($($SistaByggstart.ToString('HH:mm'))) passerad"
      $overhoppad[$fas.id] = $true
      & node (Join-Path $Root 'scripts\natt.mjs') fas $fas.id delvis --notis 'tiden tog slut innan fasen hann starta' | Out-Null
      continue
    }
    if ($arLeverans -and $nu -gt $LeveransSenast.AddMinutes(30)) {
      Logg "⏭ leveransfasen hinns inte före morgonen — drivaren levererar själv"
      $overhoppad[$fas.id] = $true
      continue
    }
    $forsok[$fas.id] = 1 + [int]$forsok[$fas.id]
    if ($forsok[$fas.id] -gt 3) {
      Logg "⛔ $($fas.id) har misslyckats tre gånger — hoppas över"
      $overhoppad[$fas.id] = $true
      & node (Join-Path $Root 'scripts\natt.mjs') fas $fas.id delvis --notis 'tre misslyckade försök' | Out-Null
      continue
    }

    Sakra-Dev
    $namn = "$($fas.id)-$($forsok[$fas.id])"
    # En byggfas får aldrig äta leveransens tid: hård stopptid = leveransSenast. Fasen får
    # veta den, och drivaren kapar sessionen 10 min efter (då är trädet fasens ansvar att ha städat).
    $maxMin = if ($fas.maxMinuter) { [int]$fas.maxMinuter } else { 150 }
    $stopp = if ($arLeverans) { (Get-Date).AddMinutes($maxMin) } else { $LeveransSenast }
    if (-not $arLeverans) { $maxMin = [int][math]::Min($maxMin, ($LeveransSenast - (Get-Date)).TotalMinutes + 10) }
    $prompt = "Nattkorning $($plan.natt), fas $($fas.id) (forsok $($forsok[$fas.id])). " +
      "Las $Rel/NATTPLAN.md och sedan $Rel/$($fas.id).md och gor fasen enligt dem. " +
      "Kor forst ``node scripts/natt.mjs visa $($fas.id)`` och ``git status --short`` - ar fasen redan paborjad, fortsatt dar den star, gor inte om det som ar klart. " +
      "HARD STOPPTID $($stopp.ToString('HH:mm')): kolla klockan (``date +%H:%M``) mellan varje spel. Nar den passerats: committa det som ar grant, rulla tillbaka resten per spel, satt fasen delvis och avsluta. " +
      "Agaren sover: fraga ingenting, stanna aldrig for att fraga."
    Logg "▶ $namn startar — $($fas.titel) ($Orkestrerare orkestrerar, $Byggmodell bygger, max $maxMin min, stopp $($stopp.ToString('HH:mm')))"
    $r = Kor-Session $namn $prompt $Orkestrerare 'high' $maxMin
    Bokfor $namn $r.Bas $r.Minuter
    $plan = Las-Plan
    $status = ($plan.faser | Where-Object id -eq $fas.id).status
    Logg "■ $namn slut: kod $($r.Kod) · $($r.Minuter) min · fasstatus '$status'"
    if ($arLeverans) { $leveransKord = $true }
    if ($status -eq 'klar') { continue }

    $g = Las-Grans $r.Bas
    if ($g) {
      $forsok[$fas.id] = [int]$forsok[$fas.id] - 1          # en kvotvägg är inget misslyckat försök
      $nar = if ($g.Nar) { $g.Nar.AddMinutes(3) } else { (Get-Date).AddMinutes(20) }
      Logg "⏸ kvotgräns ($($g.Typ)) · återställs '$($g.Text)' → nästa försök $($nar.ToString('HH:mm'))"
      if ($nar -gt $LeveransSenast.AddMinutes(30)) {
        Logg '⛔ återställningen kommer för sent för natten — slutar bygga, drivaren levererar det som är committat'
        break
      }
      Vanta-Till $nar 'kvoten återställs; nästa session startar FÄRSK från checkpointen'
      continue
    }
    if ($r.Timeout) { continue }                           # nästa försök tar vid där den stod
    if ($status -eq 'delvis') { Logg "fasen själv sa 'delvis' — går vidare"; $overhoppad[$fas.id] = $true; continue }
    Logg '⚠ fasen slutade utan att bli klar och utan kvotgräns — nytt försök om 5 min'
    Start-Sleep -Seconds 300
  }

  # ── leverans: drivaren publicerar själv ─────────────────────────────────────────────────
  Logg '── LEVERANS ──'
  Set-Location $Root
  $smuts = (& git status --porcelain) -join "`n"
  $stash = $null
  if ($smuts) {
    $stash = "natt-ofardigt-$(Get-Date -Format 'yyyy-MM-dd-HHmm')"
    Logg "⚠ ocommittat arbete finns kvar — läggs i git stash '$stash' (ingenting tas bort) så att det committade kan publiceras"
    & git stash push -u -m $stash 2>&1 | ForEach-Object { Logg "  $_" }
  }
  $deployKod = $null
  if ($IngenDeploy) { Logg 'deploy hoppad (-IngenDeploy)' }
  elseif ((& git log origin/master..HEAD --oneline 2>$null | Measure-Object).Count -eq 0) { Logg 'inget nytt att publicera' }
  else {
    Logg '▶ npm run deploy (check → push origin master → följer Pages-bygget)'
    & cmd.exe /c "npm run deploy > `"$LogDir\deploy.log`" 2>&1"
    $deployKod = $LASTEXITCODE
    Get-Content "$LogDir\deploy.log" -Tail 12 | ForEach-Object { Logg "  $_" }
    Logg "■ deploy slut: kod $deployKod"
  }

  $version = (Get-Content (Join-Path $Root 'package.json') -Raw | ConvertFrom-Json).version
  $lage = (& node (Join-Path $Root 'scripts\natt.mjs') visa) -join "`n"
  $del = @(
    '', '---', '', "## Drivarens kvitto ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))", '',
    "- Version i bygget: **v$version**",
    "- Publicering: $(if ($null -eq $deployKod) { 'ingen körd' } elseif ($deployKod -eq 0) { '✅ klar — ladda om appen på plattan' } else { "⛔ misslyckades (kod $deployKod) — se .claude/state/natt/loggar/deploy.log" })",
    "- Ocommittat arbete: $(if ($stash) { "låg kvar och ligger i ``git stash list`` som **$stash**" } else { 'inget' })",
    "- Leveransfasen (modellen): $(if ($leveransKord) { 'kördes' } else { 'hanns INTE — rapporten ovan kan saknas; läget står nedan' })",
    ("- Nattens förbrukning (listpris, en jämförbar skala — inte vad du betalar): ~{0:N0} USD över {1} sessioner" -f $script:Forbrukning.usd, $script:Forbrukning.faser.Count)
  )
  foreach ($m in $script:Forbrukning.modeller.GetEnumerator()) {
    $del += ('  - {0}: {1:N1}M nya in · {2:N1}M cacheläsning · {3:N2}M ut' -f $m.Key, ($m.Value.nyaIn / 1e6), ($m.Value.cacheLas / 1e6), ($m.Value.ut / 1e6))
  }
  $del += @('', '```', $lage, '```')
  Add-Content -Path $Rapport -Value ($del -join "`n") -Encoding utf8
  Logg "✓ morgonrapporten: $Rapport"
}
finally {
  if ($script:Dev) { & taskkill.exe /T /F /PID $script:Dev.Id 2>&1 | Out-Null; Logg 'dev-servern (som drivaren startade) stoppad' }
  [void][Natt.Kraft]::SetThreadExecutionState([uint32]'0x80000000')
  Remove-Item $Lock -ErrorAction SilentlyContinue
  Logg '── KLART. Inga sessioner kör. Fönstret kan stängas.'
  # Sist av allt: om borttagningen av uppgiften skulle stoppa den här instansen är ingenting kvar att göra.
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
}
if ([Environment]::UserInteractive -and -not ([Environment]::GetCommandLineArgs() -contains '-NonInteractive')) {
  Read-Host 'Tryck Enter för att stänga'
}
