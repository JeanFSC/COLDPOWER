#Requires -RunAsAdministrator
# Installs PostgreSQL 18 (EDB binaries) as a Windows service for ColdPower local development.
# Temporary port 5433 so it can coexist with the portable v17 cluster during migration.
[CmdletBinding()]
param(
  [string]$SourceDir = "C:\Users\jean_\Downloads\postgresql-18.6-4-windows-x64-binaries\pgsql",
  [string]$InstallDir = "C:\PostgreSQL\18",
  [string]$DataDir = "C:\PostgreSQL\18\data",
  [string]$ServiceName = "postgresql-18-coldpower",
  [string]$Port = "5433",
  [string]$PasswordFile = "C:\Users\jean_\pg-local-coldpower-password.txt",
  [string]$LogFile = "C:\Users\jean_\pg18-install.log"
)

$ErrorActionPreference = "Stop"
Start-Transcript -Path $LogFile -Force | Out-Null
try {
  if (-not (Test-Path "$SourceDir\bin\postgres.exe")) { throw "No existe $SourceDir\bin\postgres.exe" }
  if (-not (Test-Path $PasswordFile)) { throw "No existe $PasswordFile" }

  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  robocopy $SourceDir $InstallDir /E /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy falló ($LASTEXITCODE)" }
  $bin = Join-Path $InstallDir "bin"

  if (-not (Test-Path (Join-Path $DataDir "PG_VERSION"))) {
    New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
    & "$bin\initdb.exe" -D $DataDir -U coldpower --pwfile=$PasswordFile -E UTF8 --locale=C --auth=scram-sha-256
    if ($LASTEXITCODE -ne 0) { throw "initdb falló" }
    Add-Content -Path (Join-Path $DataDir "postgresql.conf") -Value "`nlisten_addresses = '127.0.0.1'`nport = $Port`n"
  }

  icacls $DataDir /grant "NT AUTHORITY\NetworkService:(OI)(CI)M" /T /Q | Out-Null
  icacls $InstallDir /grant "NT AUTHORITY\NetworkService:(OI)(CI)RX" /Q | Out-Null

  if (-not (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue)) {
    & "$bin\pg_ctl.exe" register -N $ServiceName -U "NT AUTHORITY\NetworkService" -D $DataDir -S auto
    if ($LASTEXITCODE -ne 0) { throw "pg_ctl register falló" }
  }
  Start-Service -Name $ServiceName
  Get-Service -Name $ServiceName | Format-Table Name, Status, StartType -AutoSize
  Write-Output "OK: servicio $ServiceName en 127.0.0.1:$Port"
} catch {
  Write-Output "ERROR: $($_.Exception.Message)"
} finally {
  Stop-Transcript | Out-Null
}
