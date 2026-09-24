[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$dataDir = Join-Path $env:USERPROFILE "pgdata-coldpower"
$pgCtl = Join-Path $env:USERPROFILE "pg17\pgsql\bin\pg_ctl.exe"
$hostName = "127.0.0.1"
$port = 5432

Write-Host "Binarios: $(Join-Path $env:USERPROFILE 'pg17\pgsql\bin')"
Write-Host "Datos:    $dataDir"
Write-Host "Endpoint: $hostName`:$port/coldpower"

if (-not (Test-Path -LiteralPath $dataDir)) {
  Write-Host "Estado:   no inicializado"
  exit 0
}
if (-not (Test-Path -LiteralPath $pgCtl)) {
  Write-Host "Estado:   faltan binarios"
  exit 1
}

$statusOutput = & $pgCtl status -D $dataDir 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "Estado:   activo"
  $statusOutput | ForEach-Object { Write-Host $_ }
  exit 0
}

Write-Host "Estado:   detenido"
