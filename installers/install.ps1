[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [ValidatePattern('^[a-z0-9]+(?:-[a-z0-9]+)*$')]
  [string]$PetId
)

$ErrorActionPreference = 'Stop'
$rawBase = if ($env:CODEX_PET_MARKET_RAW_URL) { $env:CODEX_PET_MARKET_RAW_URL.TrimEnd('/') } else { 'https://raw.githubusercontent.com/zhengjiazhi929-commits/codex-pet-market/main' }
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-pet-market-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tempRoot | Out-Null

try {
  $catalog = Invoke-RestMethod -Uri "$rawBase/catalog.json"
  if (-not $PetId) {
    Write-Host 'Available Codex pets:'
    for ($index = 0; $index -lt $catalog.pets.Count; $index++) {
      $pet = $catalog.pets[$index]
      Write-Host ("  {0}. {1} ({2}) - {3}" -f ($index + 1), $pet.displayName, $pet.id, $pet.description)
    }
    $choice = Read-Host 'Choose a pet number'
    $number = 0
    if (-not [int]::TryParse($choice, [ref]$number) -or $number -lt 1 -or $number -gt $catalog.pets.Count) {
      throw 'Invalid pet number.'
    }
    $PetId = $catalog.pets[$number - 1].id
  }

  $selected = $catalog.pets | Where-Object { $_.id -eq $PetId } | Select-Object -First 1
  if (-not $selected) { throw "Unknown pet ID: $PetId" }
  $petFile = Join-Path $tempRoot 'pet.json'
  $atlasFile = Join-Path $tempRoot 'spritesheet.webp'
  Invoke-WebRequest -Uri "$rawBase/pets/$PetId/pet.json" -OutFile $petFile
  Invoke-WebRequest -Uri "$rawBase/pets/$PetId/spritesheet.webp" -OutFile $atlasFile

  $pet = Get-Content -Raw -Path $petFile | ConvertFrom-Json
  if ($pet.id -ne $PetId -or $pet.spriteVersionNumber -ne 2 -or $pet.spritesheetPath -ne 'spritesheet.webp') {
    throw 'Unsafe or incompatible pet.json.'
  }
  $actualHash = (Get-FileHash -Algorithm SHA256 -Path $atlasFile).Hash.ToLowerInvariant()
  $actualBytes = (Get-Item $atlasFile).Length
  if ($actualHash -ne $selected.sha256.spritesheet) { throw 'SHA-256 mismatch; installation stopped.' }
  if ($actualBytes -ne $selected.bytes.spritesheet) { throw 'File size mismatch; installation stopped.' }

  $codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
  $target = Join-Path (Join-Path $codexRoot 'pets') $PetId
  if (Test-Path $target) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backup = Join-Path (Join-Path $codexRoot 'pets-backups') "$PetId-$stamp"
    New-Item -ItemType Directory -Path (Split-Path $backup -Parent) -Force | Out-Null
    Copy-Item -Recurse -Path $target -Destination $backup
    Write-Host "Backed up the existing pet to $backup"
  }
  New-Item -ItemType Directory -Path $target -Force | Out-Null
  Copy-Item -Path $petFile -Destination (Join-Path $target 'pet.json') -Force
  Copy-Item -Path $atlasFile -Destination (Join-Path $target 'spritesheet.webp') -Force
  Write-Host "Installed $PetId to $target"
  Write-Host 'If Codex is open, reselect the pet or restart Codex to refresh it.'
}
finally {
  if (Test-Path $tempRoot) { Remove-Item -Recurse -Force $tempRoot }
}
