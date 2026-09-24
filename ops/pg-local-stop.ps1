[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$dataDir = Join-Path $env:USERPROFILE "pgdata-coldpower"
$pgCtl = Join-Path $env:USERPROFILE "pg17\pgsql\bin\pg_ctl.exe"

if (-not (Test-Path -LiteralPath $dataDir)) {
  Write-Host "PostgreSQL local no está inicializado: $dataDir"
  exit 0
}
if (-not (Test-Path -LiteralPath $pgCtl)) {
  throw "Falta pg_ctl.exe: $pgCtl"
}

& $pgCtl status -D $dataDir *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "PostgreSQL local ya estaba detenido."
  exit 0
}

& $pgCtl stop -D $dataDir -m fast -w
if ($LASTEXITCODE -ne 0) { throw "pg_ctl no pudo detener PostgreSQL." }
Write-Host "PostgreSQL local detenido."
