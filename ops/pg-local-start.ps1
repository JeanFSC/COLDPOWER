[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$serviceName = "postgresql-18-coldpower"
$pgRoot = "C:\PostgreSQL\18"
$dataDir = Join-Path $pgRoot "data"
$binDir = Join-Path $pgRoot "bin"
$psql = Join-Path $binDir "psql.exe"
$createdb = Join-Path $binDir "createdb.exe"
$passwordFile = Join-Path $env:USERPROFILE "pg-local-coldpower-password.txt"
$envLocalDb = Join-Path $projectRoot ".env.localdb"
$databaseName = "coldpower"
$databaseUser = "coldpower"
$hostName = "127.0.0.1"
$port = 5433

foreach ($requiredPath in @($psql, $createdb)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Falta el binario de PostgreSQL 18: $requiredPath. Verifica la instalación en $pgRoot."
  }
}

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

$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $service) {
  throw "No existe el servicio '$serviceName'. Instala PostgreSQL 18 como servicio antes de iniciar la base local."
}

Write-Warning "Start-Service puede requerir una consola de PowerShell ejecutada como Administrador."
if ($service.Status -ne [System.ServiceProcess.ServiceControllerStatus]::Running) {
  try {
    Start-Service -Name $serviceName
    $service.WaitForStatus([System.ServiceProcess.ServiceControllerStatus]::Running, [TimeSpan]::FromSeconds(30))
  } catch {
    throw "No se pudo iniciar '$serviceName'. Ejecuta este script como Administrador y revisa el servicio: $($_.Exception.Message)"
  }
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

Write-Host "PostgreSQL local activo mediante el servicio ${serviceName}: $hostName`:$port/$databaseName (usuario $databaseUser)."
