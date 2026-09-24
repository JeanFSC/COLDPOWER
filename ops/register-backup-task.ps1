[CmdletBinding(SupportsShouldProcess, ConfirmImpact = "High")]
param(
  [string]$TaskName = "ColdPower Full Backup",
  [string]$BackupScript = (Join-Path $PSScriptRoot "..\scripts\backup-full.ps1"),
  [string]$PowerShellPath = (Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"),
  [datetime]$At = [datetime]::Today.AddHours(2)
)

Set-StrictMode -Version Latest
$resolvedScript = (Resolve-Path -LiteralPath $BackupScript -ErrorAction Stop).Path
if (-not (Test-Path -LiteralPath $PowerShellPath -PathType Leaf)) {
  throw "No se encontrÃ³ PowerShell en '$PowerShellPath'."
}

$action = New-ScheduledTaskAction -Execute $PowerShellPath -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$resolvedScript`" -Environment local"
$trigger = New-ScheduledTaskTrigger -Daily -At $At.TimeOfDay
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew

if ($PSCmdlet.ShouldProcess($TaskName, "Registrar tarea diaria de respaldo a las $($At.ToString('HH:mm'))")) {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Respaldo completo de ColdPower; DATABASE_URL debe estar configurada de forma segura en el equipo." -Force
}
