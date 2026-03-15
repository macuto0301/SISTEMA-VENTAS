$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonPath = Join-Path $rootDir "backend\.venv\Scripts\python.exe"
$modeScript = Join-Path $rootDir "backend\manage_mode.py"
$appPath = Join-Path $rootDir "backend\app.py"

if (-not (Test-Path $pythonPath)) {
    throw "No se encontro el entorno virtual en backend\.venv"
}

& $pythonPath $modeScript real
& $pythonPath $appPath
