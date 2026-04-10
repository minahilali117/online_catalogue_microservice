$ErrorActionPreference = 'SilentlyContinue'

$ports = 3000,8081,8082,8083
$conns = Get-NetTCPConnection -LocalPort $ports -State Listen

foreach ($conn in $conns) {
  Stop-Process -Id $conn.OwningProcess -Force
}

Write-Host "Stopped listeners on ports 3000, 8081, 8082, 8083 (if any)."
