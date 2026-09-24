[CmdletBinding()]
param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$Environment = "local",
  [string]$BackupRoot = "C:\Users\jean_\ColdPowerBackups",
  [string]$PgBinPath = "C:\PostgreSQL\18\bin",
  [int]$Port = 5433
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
if ($Port -lt 1 -or $Port -gt 65535) {
  throw "Port debe estar entre 1 y 65535."
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
# This script is intentionally manual: it never schedules itself or deletes old
# backups. Retention and off-machine copies are operational decisions by Jean.
& $pgDump "--dbname=$DatabaseUrl" "--host=$($databaseUri.Host)" "--port=$Port" "--format=custom" "--file=$targetPath" "--no-owner" "--no-privileges"
if ($LASTEXITCODE -ne 0) {
  Remove-Item -LiteralPath $targetPath -Force -ErrorAction SilentlyContinue
  throw "pg_dump terminó con código $LASTEXITCODE."
}

$result = [ordered]@{
  target = $targetPath
  environment = $Environment
  databaseHost = $databaseUri.Host
  databasePort = $Port
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  sizeBytes = (Get-Item -LiteralPath $targetPath).Length
  manual = $true
}
$result | ConvertTo-Json -Depth 4
