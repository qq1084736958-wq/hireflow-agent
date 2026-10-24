$ErrorActionPreference = "Stop"

$projectPath = Split-Path -Parent $PSScriptRoot
$appUrl = "http://127.0.0.1:3001/"
$stdoutLog = Join-Path $projectPath "hireflow-launcher.log"
$stderrLog = Join-Path $projectPath "hireflow-launcher-error.log"

function Test-HireFlowReady {
  try {
    $response = Invoke-WebRequest -Uri $appUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200 -and $response.Content -match "HireFlow Agent"
  } catch {
    return $false
  }
}

function Open-HireFlow {
  Start-Process $appUrl
}

function Test-HireFlowPortAvailable {
  $listener = $null
  try {
    $listener = [System.Net.Sockets.TcpListener]::new(
      [System.Net.IPAddress]::Loopback,
      3001
    )
    $listener.Start()
    return $true
  } catch [System.Net.Sockets.SocketException] {
    return $false
  } finally {
    if ($null -ne $listener) {
      $listener.Stop()
    }
  }
}

Write-Host ""
Write-Host "HireFlow Agent" -ForegroundColor Green
Write-Host "Checking the local service..." -ForegroundColor DarkGray

if (Test-HireFlowReady) {
  Write-Host "HireFlow is already running. Opening the browser." -ForegroundColor Green
  Open-HireFlow
  exit 0
}

$portAvailable = Test-HireFlowPortAvailable
if (-not $portAvailable) {
  Write-Host "Port 3001 is being used by another program." -ForegroundColor Red
  Write-Host "Close that program, then click the shortcut again." -ForegroundColor Yellow
  Read-Host "Press Enter to close"
  exit 1
}

$npmCommand = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
if (-not $npmCommand) {
  Write-Host "npm was not found. Install Node.js first." -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

Write-Host "Starting HireFlow. Please wait..." -ForegroundColor Yellow
Start-Process `
  -FilePath $npmCommand.Source `
  -ArgumentList @("run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3001") `
  -WorkingDirectory $projectPath `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -WindowStyle Hidden

for ($attempt = 1; $attempt -le 45; $attempt++) {
  Start-Sleep -Seconds 1
  if (Test-HireFlowReady) {
    Write-Host "HireFlow is ready. Opening the browser." -ForegroundColor Green
    Open-HireFlow
    exit 0
  }
  Write-Progress -Activity "Starting HireFlow Agent" -Status "Waiting for the service" -PercentComplete (($attempt / 45) * 100)
}

Write-Progress -Activity "Starting HireFlow Agent" -Completed
Write-Host "HireFlow did not start within 45 seconds." -ForegroundColor Red
Write-Host "Error log: $stderrLog" -ForegroundColor Yellow
Read-Host "Press Enter to close"
exit 1
