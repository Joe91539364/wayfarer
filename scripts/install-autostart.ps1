# Register a per-user scheduled task so the Wayfarer service starts at logon.
# No admin rights needed: the task is created in the current user's context.
# Run:  powershell -ExecutionPolicy Bypass -File scripts\install-autostart.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$vbs = Join-Path $root 'start-hidden.vbs'

if (-not (Test-Path $vbs)) {
  Write-Host "[x] start-hidden.vbs not found at $vbs" -ForegroundColor Red
  exit 1
}

$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('"' + $vbs + '"')
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)
$settings.ExecutionTimeLimit = 'PT0S'

Register-ScheduledTask -TaskName 'WayfarerServer' `
  -Action $action -Trigger $trigger -Settings $settings `
  -Description 'Wayfarer travel planning agent - local resident service on 127.0.0.1:8787' `
  -Force | Out-Null

Write-Host '[ok] Scheduled task "WayfarerServer" registered (starts at logon).' -ForegroundColor Green
Write-Host '     Verify:  schtasks /query /tn WayfarerServer'
Write-Host '     Remove:  powershell -ExecutionPolicy Bypass -File scripts\uninstall-autostart.ps1'
