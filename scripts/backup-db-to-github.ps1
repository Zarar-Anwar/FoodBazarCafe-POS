# Nightly POS database backup → GitHub (EssaKhan_database)
# Runs after 11:00 PM Pakistan time, only on Wi‑Fi, once per night.
# Safe to schedule hourly — exits quickly when not needed.
#
#   .\backup-db-to-github.ps1           # normal (night + Wi‑Fi rules)
#   .\backup-db-to-github.ps1 -Force    # push now (first-time login / test)

param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$PosRoot = Split-Path -Parent $PSScriptRoot
$DbSource = Join-Path $PosRoot 'data\foodbazarcafe.db'
$RepoDir = Join-Path $PosRoot 'backup-github'
$LogDir = Join-Path $PosRoot 'data\backup-logs'
$MarkerFile = Join-Path $LogDir 'last-db-push-key.txt'
$RemoteUrl = 'https://github.com/Zarar-Anwar/EssaKhan_database.git'

function Write-Log([string]$Message) {
  if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $Message"
  Add-Content -Path (Join-Path $LogDir 'backup.log') -Value $line
  Write-Host $line
}

function Get-PakistanNow {
  try {
    return [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId((Get-Date), 'Pakistan Standard Time')
  } catch {
    # Fallback if TZ id missing: UTC+5
    return (Get-Date).ToUniversalTime().AddHours(5)
  }
}

function Test-WifiConnected {
  $adapters = Get-NetAdapter -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Status -eq 'Up' -and (
        $_.InterfaceDescription -match 'Wireless|Wi-?Fi|WLAN|802\.11' -or
        $_.Name -match 'Wi-?Fi|WLAN|Wireless'
      )
    }
  return $null -ne $adapters
}

function Test-Internet {
  try {
    return Test-Connection -ComputerName 'github.com' -Count 1 -Quiet -ErrorAction SilentlyContinue
  } catch {
    return $false
  }
}

$pkt = Get-PakistanNow
$hour = $pkt.Hour

# Backup key: night of YYYY-MM-DD (the evening that started at 23:00)
if ($Force) {
  $backupKey = 'force-' + $pkt.ToString('yyyy-MM-dd-HHmm')
} elseif ($hour -ge 23) {
  $backupKey = $pkt.ToString('yyyy-MM-dd')
} else {
  $backupKey = $pkt.AddDays(-1).ToString('yyyy-MM-dd')
}

if (-not $Force) {
  # Night window (PKT): 23:00–05:59
  if ($hour -ge 6 -and $hour -lt 23) {
    Write-Log "Skip: daytime in Pakistan ($($pkt.ToString('HH:mm'))). Backup window is after 11:00 PM."
    exit 0
  }

  if (Test-Path $MarkerFile) {
    $last = (Get-Content $MarkerFile -Raw).Trim()
    if ($last -eq $backupKey) {
      Write-Log "Skip: already pushed for night $backupKey."
      exit 0
    }
  }

  if (-not (Test-WifiConnected)) {
    Write-Log 'Skip: Wi-Fi not connected. Will retry later.'
    exit 0
  }

  if (-not (Test-Internet)) {
    Write-Log 'Skip: no internet to GitHub. Will retry later.'
    exit 0
  }
}

if (-not (Test-Path $DbSource)) {
  Write-Log "ERROR: database not found at $DbSource"
  exit 1
}

# --- Prepare local mirror repo ---
if (-not (Test-Path $RepoDir)) {
  New-Item -ItemType Directory -Path $RepoDir -Force | Out-Null
}

Set-Location $RepoDir

if (-not (Test-Path (Join-Path $RepoDir '.git'))) {
  Write-Log 'Initializing local backup git repo...'
  git init | Out-Null
  git branch -M main
  @"
# EssaKhan_database

Automatic nightly backup of Food Bazar Cafe POS SQLite database.

- Source PC: Food Bazar Cafe POS
- File: ``foodbazarcafe.db``
- Schedule: after 11:00 PM Pakistan time, when Wi‑Fi is connected (once per night)

Keep this repository **private** — it contains business orders and staff data.
"@ | Set-Content -Path (Join-Path $RepoDir 'README.md') -Encoding UTF8

  cmd /c "git remote remove origin >nul 2>&1"
  git remote add origin $RemoteUrl
}

# Ensure remote URL is correct
$existing = ''
try { $existing = (git remote get-url origin 2>$null) } catch { $existing = '' }
if (-not $existing -or $existing -ne $RemoteUrl) {
  cmd /c "git remote remove origin >nul 2>&1"
  git remote add origin $RemoteUrl
}

# Copy DB (and WAL/SHM if present so backup is consistent)
Copy-Item -Path $DbSource -Destination (Join-Path $RepoDir 'foodbazarcafe.db') -Force
$wal = "$DbSource-wal"
$shm = "$DbSource-shm"
if (Test-Path $wal) { Copy-Item $wal (Join-Path $RepoDir 'foodbazarcafe.db-wal') -Force }
if (Test-Path $shm) { Copy-Item $shm (Join-Path $RepoDir 'foodbazarcafe.db-shm') -Force }

git add README.md foodbazarcafe.db 2>$null
if (Test-Path (Join-Path $RepoDir 'foodbazarcafe.db-wal')) { git add foodbazarcafe.db-wal }
if (Test-Path (Join-Path $RepoDir 'foodbazarcafe.db-shm')) { git add foodbazarcafe.db-shm }

$status = git status --porcelain
if (-not $status) {
  Write-Log "No DB changes since last commit (night $backupKey). Marking done."
  Set-Content -Path $MarkerFile -Value $backupKey -Encoding ASCII
  exit 0
}

$msg = "db backup $backupKey (PKT $($pkt.ToString('yyyy-MM-dd HH:mm')))"
git -c user.email="pos-backup@foodbazarcafe.local" -c user.name="FoodBazarCafe POS" commit -m $msg | Out-Null

Write-Log "Pushing database for night $backupKey..."
$env:GIT_TERMINAL_PROMPT = '0'
# cmd preserves git's real exit code (PowerShell pipes often do not)
$pushLog = Join-Path $LogDir 'git-push-last.txt'
cmd /c "git -c credential.helper=manager push -u origin main > `"$pushLog`" 2>&1"
$pushExit = $LASTEXITCODE
if (Test-Path $pushLog) {
  Get-Content $pushLog | ForEach-Object { Write-Log "git: $_" }
}
if ($pushExit -ne 0) {
  Write-Log 'ERROR: git push failed. Create the GitHub repo, then run once with -Force in a normal window and sign in to GitHub.'
  exit 1
}

Set-Content -Path $MarkerFile -Value $backupKey -Encoding ASCII
Write-Log "OK: database pushed for night $backupKey."
exit 0
