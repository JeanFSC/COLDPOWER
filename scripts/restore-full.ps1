[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$SourceDatabaseUrl = $env:DATABASE_URL,
  [string]$RestoreDatabaseName = "coldpower_restore_test",
  [string]$PgBinPath = "C:\Users\jean_\pg17\pgsql\bin",
  [switch]$Recreate
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-LocalDatabaseUri {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "DATABASE_URL no está configurado."
  }

  try {
    $uri = [Uri]$Value
  } catch {
    throw "DATABASE_URL no contiene una URL válida."
  }

  $hostname = $uri.Host.Trim("[", "]").ToLowerInvariant()
  if ($uri.Scheme -notin @("postgres", "postgresql") -or $hostname -notin @("localhost", "127.0.0.1", "::1")) {
    throw "Restauración local detenida: el destino debe ser localhost, 127.0.0.1 o ::1."
  }

  return $uri
}

function Invoke-Psql {
  param(
    [string]$PsqlPath,
    [string]$DatabaseUrl,
    [string]$Command
  )

  $output = & $PsqlPath "--dbname=$DatabaseUrl" "--tuples-only" "--no-align" "--quiet" "--command=$Command"
  if ($LASTEXITCODE -ne 0) {
    throw "psql terminó con código $LASTEXITCODE."
  }
  return @($output | ForEach-Object { $_.ToString().Trim() } | Where-Object { $_ -ne "" })
}

function Quote-PgIdentifier {
  param([string]$Value)
  return '"' + $Value.Replace('"', '""') + '"'
}

function Get-TableCounts {
  param(
    [string]$PsqlPath,
    [string]$DatabaseUrl
  )

  $tableNames = @(Invoke-Psql $PsqlPath $DatabaseUrl "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;")
  $counts = [ordered]@{}
  foreach ($tableName in $tableNames) {
    $identifier = Quote-PgIdentifier $tableName
    $count = @(Invoke-Psql $PsqlPath $DatabaseUrl "SELECT count(*)::bigint FROM public.$identifier;")
    $counts[$tableName] = [long]$count[0]
  }
  return $counts
}

$sourceUri = Get-LocalDatabaseUri $SourceDatabaseUrl
$resolvedBackupPath = (Resolve-Path -LiteralPath $BackupPath -ErrorAction Stop).Path
$pgRestore = Join-Path $PgBinPath "pg_restore.exe"
$createdb = Join-Path $PgBinPath "createdb.exe"
$dropdb = Join-Path $PgBinPath "dropdb.exe"
$psql = Join-Path $PgBinPath "psql.exe"
foreach ($binary in @($pgRestore, $createdb, $dropdb, $psql)) {
  if (-not (Test-Path -LiteralPath $binary -PathType Leaf)) {
    throw "No se encontró el binario PostgreSQL requerido: $binary"
  }
}

if ($RestoreDatabaseName -notmatch "^[A-Za-z_][A-Za-z0-9_]*$") {
  throw "RestoreDatabaseName no es un nombre de base PostgreSQL válido."
}

$targetBuilder = [UriBuilder]$sourceUri
$targetBuilder.Path = "/$RestoreDatabaseName"
$targetBuilder.Query = ""
$targetDatabaseUrl = $targetBuilder.Uri.AbsoluteUri

$sourceCounts = Get-TableCounts $psql $SourceDatabaseUrl
$escapedDatabaseName = $RestoreDatabaseName.Replace("'", "''")
$exists = @(Invoke-Psql $psql $SourceDatabaseUrl "SELECT 1 FROM pg_database WHERE datname = '$escapedDatabaseName';")
if ($exists.Count -gt 0 -and $exists[0] -eq "1") {
  if (-not $Recreate) {
    throw "La base $RestoreDatabaseName ya existe. Usa -Recreate solo para recrear esta base de prueba local."
  }
  & $dropdb "--if-exists" "--maintenance-db=$SourceDatabaseUrl" $RestoreDatabaseName
  if ($LASTEXITCODE -ne 0) {
    throw "dropdb terminó con código $LASTEXITCODE."
  }
}

& $createdb "--maintenance-db=$SourceDatabaseUrl" $RestoreDatabaseName
if ($LASTEXITCODE -ne 0) {
  throw "createdb terminó con código $LASTEXITCODE."
}

& $pgRestore "--dbname=$targetDatabaseUrl" "--format=custom" "--exit-on-error" "--single-transaction" "--no-owner" "--no-privileges" $resolvedBackupPath
if ($LASTEXITCODE -ne 0) {
  throw "pg_restore terminó con código $LASTEXITCODE. La base de prueba se conserva para inspección."
}

$restoredCounts = Get-TableCounts $psql $targetDatabaseUrl
$allTables = @($sourceCounts.Keys + $restoredCounts.Keys | Sort-Object -Unique)
$differences = [System.Collections.Generic.List[object]]::new()
foreach ($table in $allTables) {
  $sourceCount = if ($sourceCounts.Contains($table)) { [long]$sourceCounts[$table] } else { 0L }
  $restoredCount = if ($restoredCounts.Contains($table)) { [long]$restoredCounts[$table] } else { 0L }
  if ($sourceCount -ne $restoredCount) {
    $differences.Add([ordered]@{ table = $table; source = $sourceCount; restored = $restoredCount })
  }
}

$result = [ordered]@{
  backup = $resolvedBackupPath
  sourceHost = $sourceUri.Host
  restoredDatabase = $RestoreDatabaseName
  tableCount = $allTables.Count
  counts = [ordered]@{}
  differences = @($differences)
}
foreach ($table in $allTables) {
  $result.counts[$table] = [ordered]@{
    source = if ($sourceCounts.Contains($table)) { [long]$sourceCounts[$table] } else { 0L }
    restored = if ($restoredCounts.Contains($table)) { [long]$restoredCounts[$table] } else { 0L }
  }
}

if ($differences.Count -gt 0) {
  $result | ConvertTo-Json -Depth 6
  throw "La restauración no coincide en $($differences.Count) tablas."
}

$result | ConvertTo-Json -Depth 6
