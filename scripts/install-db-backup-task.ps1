# Installs a Windows Scheduled Task: check hourly for nightly DB to GitHub backup.
# Prefer: right-click PowerShell -> Run as administrator, then run this script.

$ErrorActionPreference = 'Stop'

$ScriptPath = Join-Path $PSScriptRoot 'backup-db-to-github.ps1'
if (-not (Test-Path $ScriptPath)) {
  throw "Missing backup script: $ScriptPath"
}

$TaskName = 'FoodBazarCafe-DB-GitHub-Backup'
$PsExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction `
  -Execute $PsExe `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(5) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 9999)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RunOnlyIfNetworkAvailable

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description 'Food Bazar Cafe: push SQLite DB to GitHub after 11 PM PKT when on Wi-Fi' `
  -Force | Out-Null

Write-Host ''
Write-Host "Scheduled task installed: $TaskName"
Write-Host '  Runs every hour; pushes DB only after 11:00 PM (Pakistan) when Wi-Fi is on.'
Write-Host ''
Write-Host 'First-time GitHub login (required once):'
Write-Host '  1. Create empty PRIVATE repo: https://github.com/Zarar-Anwar/EssaKhan_database'
Write-Host '  2. Test push:'
Write-Host "     powershell -ExecutionPolicy Bypass -File `"$ScriptPath`" -Force"
Write-Host '  3. Sign in when Git Credential Manager asks.'
Write-Host ''
Write-Host 'Logs: data\backup-logs\backup.log'
Write-Host ''
