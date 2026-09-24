[CmdletBinding()]
param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$Environment = "local",
  [string]$BackupRoot = "C:\Users\jean_\ColdPowerBackups",
  [string]$PgBinPath = "C:\Users\jean_\pg17\pgsql\bin",
  [int]$RetentionDays = 14
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-DatabaseUri {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "DATABASE_URL no está configurado."
  }

  try {
    $uri = [Uri]$Value
  } catch {
    throw "DATABASE_URL no contiene una URL válida."
  }

  if ($uri.Scheme -notin @("postgres", "postgresql") -or [string]::IsNullOrWhiteSpace($uri.Host)) {
    throw "DATABASE_URL debe apuntar a PostgreSQL."
  }

  return $uri
}

if ($Environment -notmatch "^[A-Za-z0-9_-]+$") {
  throw "Environment solo puede contener letras, números, guiones y guiones bajos."
}
if ($RetentionDays -lt 1) {
  throw "RetentionDays debe ser mayor que cero."
}

$databaseUri = Get-DatabaseUri $DatabaseUrl
$pgDump = Join-Path $PgBinPath "pg_dump.exe"
if (-not (Test-Path -LiteralPath $pgDump -PathType Leaf)) {
  throw "No se encontró pg_dump en $pgDump."
}

New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$targetPath = Join-Path $BackupRoot "coldpower-$Environment-$timestamp.dump"
if (Test-Path -LiteralPath $targetPath) {
  throw "El archivo de respaldo ya existe: $targetPath"
}

# Custom format preserves the complete PostgreSQL schema/data graph, including
# tables, sequences and enum types. Ownership/ACLs are intentionally omitted so
# a local restore can be performed by the configured local database role.
& $pgDump "--dbname=$DatabaseUrl" "--format=custom" "--file=$targetPath" "--no-owner" "--no-privileges"
if ($LASTEXITCODE -ne 0) {
  Remove-Item -LiteralPath $targetPath -Force -ErrorAction SilentlyContinue
  throw "pg_dump terminó con código $LASTEXITCODE."
}

$cutoff = (Get-Date).AddDays(-$RetentionDays)
$removed = [System.Collections.Generic.List[string]]::new()
Get-ChildItem -LiteralPath $BackupRoot -File -Filter "coldpower-$Environment-*.dump" |
  Where-Object { $_.LastWriteTime -lt $cutoff -and $_.FullName -ne $targetPath } |
  ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force
    $removed.Add($_.Name)
  }

$result = [ordered]@{
  target = $targetPath
  environment = $Environment
  databaseHost = $databaseUri.Host
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  sizeBytes = (Get-Item -LiteralPath $targetPath).Length
  retentionDays = $RetentionDays
  removedExpiredBackups = @($removed)
}
$result | ConvertTo-Json -Depth 4
