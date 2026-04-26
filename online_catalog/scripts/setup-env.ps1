# $ErrorActionPreference = 'Stop'

# $root = Split-Path -Parent $MyInvocation.MyCommand.Path

# $envPairs = @(
#   @{ Example = "$root\.env.example"; Target = "$root\.env" },
#   @{ Example = "$root\frontend\.env.example"; Target = "$root\frontend\.env" },
#   @{ Example = "$root\backend\customer-support\.env.example"; Target = "$root\backend\customer-support\.env" },
#   @{ Example = "$root\backend\order-processing\.env.example"; Target = "$root\backend\order-processing\.env" },
#   @{ Example = "$root\backend\products-service\.env.example"; Target = "$root\backend\products-service\.env" },
#   @{ Example = "$root\backend\customers-orders-service\.env.example"; Target = "$root\backend\customers-orders-service\.env" }
# )

# foreach ($pair in $envPairs) {
#   if (-not (Test-Path $pair.Example)) {
#     continue
#   }

#   if (-not (Test-Path $pair.Target)) {
#     Copy-Item $pair.Example $pair.Target
#     Write-Host "Created $($pair.Target) from example."
#   }
# }


$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$envPairs = @(
  @{ Example = "$root\.env.example"; Target = "$root\.env" },
  @{ Example = "$root\frontend\.env.example"; Target = "$root\frontend\.env" },
  @{ Example = "$root\backend\customer-support\.env.example"; Target = "$root\backend\customer-support\.env" },
  @{ Example = "$root\backend\order-processing\.env.example"; Target = "$root\backend\order-processing\.env" },
  @{ Example = "$root\backend\products-service\.env.example"; Target = "$root\backend\products-service\.env" },
  @{ Example = "$root\backend\customers-orders-service\.env.example"; Target = "$root\backend\customers-orders-service\.env" }
)

foreach ($pair in $envPairs) {
  if (-not (Test-Path $pair.Example)) {
    continue
  }

  if (-not (Test-Path $pair.Target)) {
    Copy-Item $pair.Example $pair.Target
    Write-Host "Created $($pair.Target) from example."
  }
}

# ------------------------------------------------------------
# Get EC2 public IP automatically
# ------------------------------------------------------------

try {
  $token = Invoke-RestMethod `
    -Method PUT `
    -Uri "http://169.254.169.254/latest/api/token" `
    -Headers @{ "X-aws-ec2-metadata-token-ttl-seconds" = "21600" }

  $ec2PublicIp = Invoke-RestMethod `
    -Uri "http://169.254.169.254/latest/meta-data/public-ipv4" `
    -Headers @{ "X-aws-ec2-metadata-token" = $token }

  Write-Host "Detected EC2 public IP: $ec2PublicIp"
}
catch {
  throw "Could not detect EC2 public IP from metadata service. Make sure this script is running on the EC2 instance."
}

# ------------------------------------------------------------
# Backend service-to-service URLs inside Kubernetes
# ------------------------------------------------------------

$backendReplacements = @{
  "http://localhost:8081" = "http://catalog-management:8081"
  "http://localhost:8082" = "http://customer-support:8082"
  "http://localhost:8083" = "http://order-processing:8083"
  "http://localhost:3000" = "http://frontend:3000"
}

# ------------------------------------------------------------
# Frontend browser-facing URLs through EC2 NodePorts
# ------------------------------------------------------------

$frontendReplacements = @{
  "http://localhost:8081" = "http://${ec2PublicIp}:30081"
  "http://localhost:8082" = "http://${ec2PublicIp}:30082"
  "http://localhost:8083" = "http://${ec2PublicIp}:30083"
  "http://localhost:3000" = "http://${ec2PublicIp}:30080"
}

foreach ($pair in $envPairs) {
  if (-not (Test-Path $pair.Target)) {
    continue
  }

  $content = Get-Content $pair.Target -Raw

  if ($pair.Target -like "*\frontend\.env") {
    foreach ($oldValue in $frontendReplacements.Keys) {
      $newValue = $frontendReplacements[$oldValue]
      $content = $content.Replace($oldValue, $newValue)
    }

    Write-Host "Updated frontend browser URLs in $($pair.Target)"
  }
  else {
    foreach ($oldValue in $backendReplacements.Keys) {
      $newValue = $backendReplacements[$oldValue]
      $content = $content.Replace($oldValue, $newValue)
    }

    Write-Host "Updated backend Kubernetes service URLs in $($pair.Target)"
  }

  Set-Content -Path $pair.Target -Value $content -NoNewline
}