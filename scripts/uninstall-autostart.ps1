# Remove the Wayfarer logon task.
# Run:  powershell -ExecutionPolicy Bypass -File scripts\uninstall-autostart.ps1

$ErrorActionPreference = 'Continue'
Unregister-ScheduledTask -TaskName 'WayfarerServer' -Confirm:$false
Write-Host '[ok] Scheduled task "WayfarerServer" removed.' -ForegroundColor Green
Write-Host '     The service itself keeps running until you run stop.cmd'
