param([Parameter(Mandatory=$true)][string]$ArchivePath)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$outputRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot 'dist')).Path
$archiveFull = [System.IO.Path]::GetFullPath($ArchivePath)
if (Test-Path -LiteralPath $archiveFull) { throw 'Choose a new archive path; existing archives are preserved.' }
$stagingRoot = Join-Path $projectRoot ('.local/package-' + [guid]::NewGuid().ToString('N'))
$stagingDist = Join-Path $stagingRoot 'dist'
New-Item -ItemType Directory -Path (Join-Path $stagingDist '.openai') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $outputRoot 'index.html') -Destination (Join-Path $stagingDist 'index.html')
# Include the complete code-split graph, including lazy loaders and Web Workers.
foreach ($folder in @('assets','models','licenses')) {
    Copy-Item -LiteralPath (Join-Path $outputRoot $folder) -Destination (Join-Path $stagingDist $folder) -Recurse
}
Copy-Item -LiteralPath (Join-Path $projectRoot '.openai/hosting.json') -Destination (Join-Path $stagingDist '.openai/hosting.json')
& tar.exe -C $stagingRoot -czf $archiveFull dist
if ($LASTEXITCODE -ne 0) { throw 'tar packaging failed.' }
$entries = & tar.exe -tzf $archiveFull
if ($LASTEXITCODE -ne 0 -or -not ($entries -contains 'dist/.openai/hosting.json')) { throw 'Invalid deployment archive.' }
Write-Output $archiveFull
