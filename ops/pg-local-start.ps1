[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$pgRoot = Join-Path $env:USERPROFILE "pg17"
$dataDir = Join-Path $env:USERPROFILE "pgdata-coldpower"
$binDir = Join-Path $pgRoot "pgsql\bin"
$initDb = Join-Path $binDir "initdb.exe"
$pgCtl = Join-Path $binDir "pg_ctl.exe"
$psql = Join-Path $binDir "psql.exe"
$createdb = Join-Path $binDir "createdb.exe"
$serverLog = Join-Path $dataDir "server.log"
$passwordFile = Join-Path $env:USERPROFILE "pg-local-coldpower-password.txt"
$envLocalDb = Join-Path $projectRoot ".env.localdb"
$databaseName = "coldpower"
$databaseUser = "coldpower"
$hostName = "127.0.0.1"
$port = "5432"

foreach ($requiredPath in @($initDb, $pgCtl, $psql, $createdb)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "Falta el binario de PostgreSQL: $requiredPath. Descarga y extrae el ZIP oficial en $pgRoot."
  }
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

function Get-LocalPassword {
  if (Test-Path -LiteralPath $passwordFile) {
    $value = (Get-Content -LiteralPath $passwordFile -Raw).Trim()
    if ($value) { return $value }
  }

  if ($env:CP_PG_LOCAL_PASSWORD) { return $env:CP_PG_LOCAL_PASSWORD.Trim() }

  if (Test-Path -LiteralPath $envLocalDb) {
    $databaseLine = Get-Content -LiteralPath $envLocalDb | Where-Object { $_ -match "^\s*DATABASE_URL=" } | Select-Object -First 1
    if ($databaseLine -match "^\s*DATABASE_URL=postgres(?:ql)?://[^:]+:(?<password>[^@]+)@") {
      $value = $matches["password"].Trim()
      if ($value) { return $value }
    }
  }

  return "coldpower-local-2026"
}

if (-not (Test-Path -LiteralPath (Join-Path $dataDir "PG_VERSION"))) {
  $localPassword = Get-LocalPassword
  [System.IO.File]::WriteAllText($passwordFile, $localPassword)
  & $initDb -D $dataDir -U $databaseUser --pwfile=$passwordFile --encoding=UTF8 --locale=C --auth=md5
  if ($LASTEXITCODE -ne 0) { throw "initdb terminó con código $LASTEXITCODE." }
  Write-Host "Cluster PostgreSQL local inicializado en $dataDir."
}

$statusOutput = & $pgCtl status -D $dataDir 2>&1
if ($LASTEXITCODE -ne 0) {
  & $pgCtl start -D $dataDir -l $serverLog -o "-h $hostName -p $port" -w
  if ($LASTEXITCODE -ne 0) { throw "pg_ctl no pudo iniciar PostgreSQL. Revisa $serverLog." }
}

$localPassword = Get-LocalPassword
$env:PGPASSWORD = $localPassword
try {
  $databaseQueryOutput = & $psql -h $hostName -p $port -U $databaseUser -d postgres -tAc "select 1 from pg_database where datname = '$databaseName'" 2>&1
  $databaseExists = ($databaseQueryOutput | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) { throw "psql no pudo comprobar la base postgres: $databaseExists" }

  if ($databaseExists -ne "1") {
    & $createdb -h $hostName -p $port -U $databaseUser $databaseName
    if ($LASTEXITCODE -ne 0) { throw "createdb no pudo crear $databaseName." }
  }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "PostgreSQL local activo: $hostName`:$port/$databaseName (usuario $databaseUser)."
