[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$serviceName = "postgresql-18-coldpower"
$pgRoot = "C:\PostgreSQL\18"
$dataDir = Join-Path $pgRoot "data"
$binDir = Join-Path $pgRoot "bin"
$hostName = "127.0.0.1"
$port = 5433

Write-Host "Servicio:  $serviceName"
Write-Host "Binarios: $binDir"
Write-Host "Datos:    $dataDir"
Write-Host "Endpoint: postgres://coldpower:<contraseña-local>@$hostName`:$port/coldpower"

$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $service) {
  Write-Host "Estado:   no instalado"
  exit 0
}

Write-Host "Estado:   $($service.Status)"
Write-Host "Inicio:   $($service.StartType)"
if (-not (Test-Path -LiteralPath $dataDir)) {
  Write-Warning "No existe el directorio de datos esperado: $dataDir"
}

$listener = Get-NetTCPConnection -LocalAddress $hostName -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  Write-Host "Puerto:   escuchando (PID $($listener.OwningProcess))"
} else {
  Write-Host "Puerto:   sin escucha en $hostName`:$port"
}
