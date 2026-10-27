param([string]$PythonPath = 'python', [int]$Port = 8000)
$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
Push-Location $PSScriptRoot
try {
    & $PythonPath -X utf8 -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port $Port --workers 1
    if ($LASTEXITCODE -ne 0) { throw 'Backend başlatılamadı; README kurulum adımlarını kontrol edin.' }
} finally {
    Pop-Location
}
