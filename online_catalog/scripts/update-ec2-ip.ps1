param(
  [Parameter(Mandatory = $false)]
  [string]$NewIp,

  [Parameter(Mandatory = $false)]
  [string]$OldIp,

  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-ValidIpv4 {
  param([string]$Ip)

  if ([string]::IsNullOrWhiteSpace($Ip)) { return $false }
  $parts = $Ip.Split('.')
  if ($parts.Count -ne 4) { return $false }

  foreach ($part in $parts) {
    $n = 0
    if (-not [int]::TryParse($part, [ref]$n)) { return $false }
    if ($n -lt 0 -or $n -gt 255) { return $false }
  }

  return $true
}

function Get-IpsFromText {
  param([string]$Text)

  $pattern = '(?<!\d)(?:\d{1,3}\.){3}\d{1,3}(?!\d)'
  $matches = [regex]::Matches($Text, $pattern)

  foreach ($m in $matches) {
    if (Test-ValidIpv4 -Ip $m.Value) {
      $m.Value
    }
  }
}

function Resolve-NewIp {
  param([string]$Root)

  if ($NewIp) {
    return $NewIp.Trim()
  }

  $tfDir = Join-Path $Root 'online_catalog/infra/terraform'
  if (Test-Path $tfDir) {
    try {
      $resolved = terraform -chdir="$tfDir" output -raw ec2_public_ip 2>$null
      if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($resolved)) {
        return $resolved.Trim()
      }
    }
    catch {
      # Ignore and fail with a clear message below.
    }
  }

  throw "Could not resolve NewIp automatically. Pass -NewIp <EC2_PUBLIC_IP> or run terraform apply first."
}

function Resolve-OldIp {
  param([string]$Root)

  if ($OldIp) {
    return $OldIp.Trim()
  }

  $inventoryPath = Join-Path $Root 'online_catalog/infra/ansible/inventory.ini'
  if (Test-Path $inventoryPath) {
    $activeLine = Get-Content $inventoryPath | Where-Object {
      $_ -match '^\s*\d{1,3}(?:\.\d{1,3}){3}\s+ansible_user='
    } | Select-Object -First 1

    if ($activeLine) {
      $candidate = ($activeLine -split '\s+')[0].Trim()
      if (Test-ValidIpv4 -Ip $candidate) {
        return $candidate
      }
    }
  }

  # Fallback: infer most frequent public-like IP in known target files.
  $knownFiles = @(
    'online_catalog/kubernetes/frontend.yaml',
    'online_catalog/frontend/.env',
    'online_catalog/infra/ansible/inventory.ini',
    'Notes.txt'
  )

  $excluded = @('0.0.0.0', '127.0.0.1', '169.254.169.254')
  $counts = @{}

  foreach ($relative in $knownFiles) {
    $path = Join-Path $Root $relative
    if (-not (Test-Path $path)) { continue }

    $text = Get-Content -Raw -Path $path
    foreach ($ip in (Get-IpsFromText -Text $text)) {
      if ($excluded -contains $ip) { continue }
      if (-not $counts.ContainsKey($ip)) { $counts[$ip] = 0 }
      $counts[$ip] += 1
    }
  }

  if ($counts.Count -eq 0) {
    throw "Could not infer OldIp. Pass -OldIp <PREVIOUS_EC2_IP>."
  }

  return ($counts.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 1).Key
}

$new = Resolve-NewIp -Root $RepoRoot
if (-not (Test-ValidIpv4 -Ip $new)) {
  throw "Invalid NewIp '$new'."
}

$old = Resolve-OldIp -Root $RepoRoot
if (-not (Test-ValidIpv4 -Ip $old)) {
  throw "Invalid OldIp '$old'."
}

if ($old -eq $new) {
  Write-Host "OldIp and NewIp are the same ($new). Nothing to update."
  exit 0
}

Write-Host "RepoRoot: $RepoRoot"
Write-Host "OldIp:    $old"
Write-Host "NewIp:    $new"

# Only scan text-like project files.
$includePatterns = @('*.yaml', '*.yml', '*.ini', '*.txt', '*.md', '*.env', '*.ps1', '*.json')
$excludeDirs = @('.git', 'node_modules', 'dist', 'build', '.next', '.terraform', '.venv')

$files = Get-ChildItem -Path $RepoRoot -Recurse -File | Where-Object {
  $extMatch = $false
  foreach ($pattern in $includePatterns) {
    if ($_.Name -like $pattern) { $extMatch = $true; break }
  }
  if (-not $extMatch) { return $false }

  $full = $_.FullName
  foreach ($dir in $excludeDirs) {
    if ($full -match [regex]::Escape([IO.Path]::DirectorySeparatorChar + $dir + [IO.Path]::DirectorySeparatorChar)) {
      return $false
    }
  }

  return $true
}

$updated = @()
$totalReplacements = 0

foreach ($file in $files) {
  $content = Get-Content -Raw -Path $file.FullName
  if ($content -notmatch [regex]::Escape($old)) { continue }

  $occurrences = ([regex]::Matches($content, [regex]::Escape($old))).Count
  if ($occurrences -le 0) { continue }

  $newContent = $content -replace [regex]::Escape($old), $new
  Set-Content -Path $file.FullName -Value $newContent -NoNewline

  $relative = $file.FullName.Substring($RepoRoot.Length).TrimStart('\', '/')
  $updated += [PSCustomObject]@{
    File = $relative
    Replacements = $occurrences
  }
  $totalReplacements += $occurrences
}

if ($updated.Count -eq 0) {
  Write-Host "No files contained $old."
  exit 0
}

Write-Host ""
Write-Host "Updated files:"
$updated | Sort-Object File | Format-Table -AutoSize
Write-Host ""
Write-Host "Total replacements: $totalReplacements"
Write-Host "Done. Review with: git diff"
