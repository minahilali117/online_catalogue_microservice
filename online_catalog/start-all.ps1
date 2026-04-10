$ErrorActionPreference = 'SilentlyContinue'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Stop stale node processes to avoid EADDRINUSE issues on local ports.
Get-Process node | Stop-Process -Force

Start-Process -FilePath npm.cmd -ArgumentList 'start' -WorkingDirectory "$root\backend\catalog-management" | Out-Null
Start-Process -FilePath npm.cmd -ArgumentList 'run start:development' -WorkingDirectory "$root\backend\customer-support" | Out-Null
Start-Process -FilePath npm.cmd -ArgumentList 'run start:development' -WorkingDirectory "$root\backend\order-processing" | Out-Null
Start-Process -FilePath npm.cmd -ArgumentList 'start' -WorkingDirectory "$root\frontend" | Out-Null

Start-Sleep -Seconds 8

$ports = 3000,8081,8082,8083
Get-NetTCPConnection -LocalPort $ports -State Listen | Select-Object LocalPort, OwningProcess, State | Sort-Object LocalPort
Write-Host ""
Write-Host "Services started."
Write-Host "Frontend: http://localhost:3000"
Write-Host "Catalog:  http://localhost:8081"
Write-Host "Customer: http://localhost:8082"
Write-Host "Orders:   http://localhost:8083"
