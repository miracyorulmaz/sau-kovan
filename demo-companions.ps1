param([string]$StudentId = 'student-01', [string]$PythonPath = '', [switch]$Now)
$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
$kovanPythonCandidates = @(
    $PythonPath,
    (Join-Path $PSScriptRoot '.venv\Scripts\python.exe'),
    (Join-Path $PSScriptRoot '..\..\work\kovan-venv\Scripts\python.exe')
)
$kovanDemoPython = $kovanPythonCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $kovanDemoPython) { throw 'Kurulumdaki Python yolunu -PythonPath ile verin.' }
$kovanDemoArguments = @('-X', 'utf8', (Join-Path $PSScriptRoot 'scripts\demo_companions.py'), '--student', $StudentId)
if ($Now) { $kovanDemoArguments += '--now' }
& $kovanDemoPython @kovanDemoArguments
if ($LASTEXITCODE -ne 0) { throw 'Demo arkadaşları hazırlanamadı; yukarıdaki açıklamayı kontrol edin.' }
