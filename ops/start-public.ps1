$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$tokenPath = Join-Path $projectRoot ".cloudflared\coldpower-local.token"
$bundledCloudflared = Join-Path $projectRoot "tools\cloudflared\cloudflared.exe"
$buildLogPath = Join-Path $projectRoot "start-public-build.log"
$buildErrorLogPath = Join-Path $projectRoot "start-public-build-error.log"
$nextLogPath = Join-Path $projectRoot "start-public-next.log"
$nextErrorLogPath = Join-Path $projectRoot "start-public-next-error.log"
$tunnelLogPath = Join-Path $projectRoot "start-public-tunnel.log"
$tunnelErrorLogPath = Join-Path $projectRoot "start-public-tunnel-error.log"

if (Test-Path -LiteralPath $bundledCloudflared) {
  $cloudflaredPath = $bundledCloudflared
} else {
  $cloudflaredCommand = Get-Command cloudflared -ErrorAction SilentlyContinue
  if (-not $cloudflaredCommand) {
    throw "cloudflared no está instalado. Coloca cloudflared.exe en tools\cloudflared o instálalo en PATH."
  }
  $cloudflaredPath = $cloudflaredCommand.Source
}

if (-not (Test-Path -LiteralPath $tokenPath)) {
  throw "Falta el token local del túnel: $tokenPath"
}

$tokenValue = (Get-Content -LiteralPath $tokenPath -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($tokenValue)) {
  throw "El archivo del token está vacío: $tokenPath"
}

$listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  throw "El puerto 3000 ya está ocupado. Detén el proceso existente antes de iniciar la versión de producción."
}

$buildProcess = Start-Process `
  -FilePath $env:ComSpec `
  -ArgumentList "/c", "corepack pnpm build" `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $buildLogPath `
  -RedirectStandardError $buildErrorLogPath `
  -PassThru `
  -Wait

if ($buildProcess.ExitCode -ne 0) {
  throw "La compilación de producción terminó con código $($buildProcess.ExitCode). Revisa start-public-build-error.log."
}

$projectProcess = Start-Process `
  -FilePath $env:ComSpec `
  -ArgumentList "/c", "corepack pnpm start" `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $nextLogPath `
  -RedirectStandardError $nextErrorLogPath `
  -PassThru

$tunnelProcess = $null

try {
  for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
    Start-Sleep -Seconds 1
    $listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) { break }
    if ($projectProcess.HasExited) { throw "El proceso de Next.js terminó antes de abrir el puerto 3000. Revisa start-public-next-error.log." }
  }

  if (-not $listener) {
    throw "Next.js no está escuchando en el puerto 3000. Revisa start-public-next.log."
  }

  $tunnelProcess = Start-Process `
    -FilePath $cloudflaredPath `
    -ArgumentList "tunnel", "--no-autoupdate", "run", "--token-file", $tokenPath `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $tunnelLogPath `
    -RedirectStandardError $tunnelErrorLogPath `
    -PassThru

  Write-Host "ColdPower producción local: http://localhost:3000"
  Write-Host "ColdPower público: https://dev.coldpower.pe"
  Write-Host "Build + Next start + Cloudflare Tunnel activos. Presiona Ctrl+C para cerrar todo."

  while ($true) {
    if ($tunnelProcess.HasExited) {
      throw "cloudflared terminó con código $($tunnelProcess.ExitCode). Revisa start-public-tunnel.log."
    }

    if (-not (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) {
      throw "Next.js dejó de escuchar en el puerto 3000. Se cerrará cloudflared."
    }

    if ($projectProcess.HasExited) {
      throw "El proceso de Next.js terminó. Se cerrará cloudflared."
    }

    Start-Sleep -Seconds 1
  }
} finally {
  if ($tunnelProcess -and -not $tunnelProcess.HasExited) {
    Stop-Process -Id $tunnelProcess.Id -Force -ErrorAction SilentlyContinue
  }

  if ($projectProcess -and -not $projectProcess.HasExited) {
    & taskkill.exe /PID $projectProcess.Id /T /F 2>$null | Out-Null
  }
}
