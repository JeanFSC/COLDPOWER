[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$serviceName = "postgresql-18-coldpower"

$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $service) {
  Write-Host "PostgreSQL local no está instalado como servicio: $serviceName"
  exit 0
}

Write-Warning "Stop-Service puede requerir una consola de PowerShell ejecutada como Administrador."
if ($service.Status -eq [System.ServiceProcess.ServiceControllerStatus]::Stopped) {
  Write-Host "PostgreSQL local ya estaba detenido ($serviceName)."
  exit 0
}

try {
  Stop-Service -Name $serviceName
  $service.WaitForStatus([System.ServiceProcess.ServiceControllerStatus]::Stopped, [TimeSpan]::FromSeconds(30))
} catch {
  throw "No se pudo detener '$serviceName'. Ejecuta este script como Administrador y revisa el servicio: $($_.Exception.Message)"
}

Write-Host "PostgreSQL local detenido mediante el servicio $serviceName."
