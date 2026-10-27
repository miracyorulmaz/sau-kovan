param([string]$PythonPath = '', [int]$Port = 8000, [int]$FrontendPort = 5173, [switch]$BackendOnly)
$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
Push-Location $PSScriptRoot
try {
    $kovanDevArguments = @('scripts/dev.mjs', '--backend-port', "$Port", '--frontend-port', "$FrontendPort")
    if ($PythonPath) { $kovanDevArguments += @('--python', $PythonPath) }
    if ($BackendOnly) { $kovanDevArguments += '--backend-only' }
    & node @kovanDevArguments
    if ($LASTEXITCODE -ne 0) { throw 'Kovan başlatılamadı; portları ve README kurulum adımlarını kontrol edin.' }
} finally {
    Pop-Location
}
